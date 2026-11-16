"""Verify and enrich the curated places, then write data/places.js.

For every place: check the elevation model at the coordinates, look the name up in swisstopo's place-name
register when the fit is poor, find the nearest public-transport stop, geocode the valley station used for
car navigation, estimate the weather model's grid-cell height, and compute the 360 degree terrain horizon.
API answers are cached in tools/.cache so reruns are quick and polite.
"""
import hashlib, json, math, os, re, subprocess, sys, time, unicodedata, urllib.parse
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import demlib
from places_src import PLACES

CACHE = os.path.join(HERE, ".cache"); os.makedirs(CACHE, exist_ok=True)


def get_json(url):
    p = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest() + ".json")
    if os.path.exists(p):
        return json.load(open(p))
    for attempt in range(3):
        r = subprocess.run(["curl", "-sS", "-m", "40", "-o", p + ".tmp", "-w", "%{http_code}", url], capture_output=True, text=True)
        if r.stdout.strip() == "200":
            os.replace(p + ".tmp", p); time.sleep(0.25)
            return json.load(open(p))
        time.sleep(2 + 3 * attempt)
    return None


def hav(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    x = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(x))


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def local_max(lat, lon, radius=120.0):
    m = demlib.Mosaic.around(lat, lon, 12, 1)
    best = float(m.sample(lat, lon))
    for d in (40.0, 80.0, radius):
        la, lo = demlib.destination(lat, lon, np.arange(0, 360, 30.0), d)
        best = max(best, float(m.sample(la, lo).max()))
    return best


def dem_fit(p, lat, lon):
    return (local_max(lat, lon) if p["kind"] in ("peak", "hill") else demlib.elev(lat, lon)) - p["ele"]


def cell_height(lat, lon, target, box=2200.0):
    """Approximate terrain height of the ~2 km weather-model cell the API would pick for this point."""
    m = demlib.Mosaic.around(lat, lon, 12, 1)
    kx = 111320.0 * math.cos(math.radians(lat)); ky = 110540.0
    g = np.linspace(-box / 2, box / 2, 23); best = None
    for ox in (-box / 2, box / 2):
        for oy in (-box / 2, box / 2):
            X, Y = np.meshgrid(g + ox, g + oy)
            h = float(m.sample(lat + Y / ky, lon + X / kx).mean())
            if best is None or abs(h - target) < abs(best - target):
                best = h
    return best


def encode_horizon(h):
    return "".join(chr(33 + int(min(93, max(0, round((float(v) + 3.0) * 2.0))))) for v in h)


tiles = []
for p in PLACES:
    x, y = demlib.tile_xy(p["lat"], p["lon"], 12)
    tiles += [(12, int(x) + i, int(y) + j) for i in (-1, 0, 1) for j in (-1, 0, 1)]
print("elevation tiles:", demlib.fetch_all(tiles))

out, review = [], []
for p in PLACES:
    lat, lon = p["lat"], p["lon"]
    fit = dem_fit(p, lat, lon)
    note = ""
    tol = 90 if p["kind"] in ("peak", "hill") else 110
    if p["kind"] in ("peak", "hill", "pass") or abs(fit) > tol:
        q = urllib.parse.quote(p.get("q") or p["name"])
        d = get_json(f"https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText={q}&type=locations&origins=gazetteer,gg25&sr=4326&limit=12")
        cands = []
        for r in (d or {}).get("results", []):
            a = r["attrs"]; dist = hav(lat, lon, a["lat"], a["lon"])
            if dist <= 5.0:
                cands.append((abs(dem_fit(p, a["lat"], a["lon"])), dist, a["lat"], a["lon"], re.sub("<[^>]+>", "", a.get("label", ""))))
        cands.sort()
        if cands and (cands[0][0] + 15 < abs(fit) or abs(fit) > tol) and cands[0][0] <= max(tol, abs(fit) - 20):
            f2, dist, la2, lo2, label = cands[0]
            note = f"moved {dist * 1000:.0f} m to '{label}' (fit {fit:+.0f} -> {dem_fit(p, la2, lo2):+.0f})"
            lat, lon = round(la2, 5), round(lo2, 5); fit = dem_fit(p, lat, lon)
        elif abs(fit) > tol:
            note = f"UNRESOLVED fit {fit:+.0f} m; candidates: {[(round(c[0]), round(c[1], 1), c[4]) for c in cands[:3]]}"
    # nearest public-transport stop
    d = get_json(f"https://transport.opendata.ch/v1/locations?x={lat}&y={lon}")
    stop = next((s for s in (d or {}).get("stations", []) if s.get("id")), None)
    st_name = stop["name"] if stop else None; st_dist = stop.get("distance") if stop else None
    # car destination: valley station for lifts and walks, otherwise the place itself
    acc = list(p["access"]); nav = None
    if len(acc) == 3:
        if p.get("nav"):
            nav = [p["nav"][0], p["nav"][1], acc[1]]
        else:
            d = get_json("https://transport.opendata.ch/v1/locations?type=station&query=" + urllib.parse.quote(acc[1]))
            c = next((s for s in (d or {}).get("stations", []) if s.get("coordinate", {}).get("x")), None)
            if c:
                nd = hav(lat, lon, c["coordinate"]["x"], c["coordinate"]["y"])
                nav = [round(c["coordinate"]["x"], 5), round(c["coordinate"]["y"], 5), c["name"]]
                if nd > 30 or nd < 0.15:
                    note += f" | NAV? '{acc[1]}' -> '{c['name']}' {nd:.1f} km"
                else:
                    note += f" | nav '{c['name']}' {nd:.1f} km"
            else:
                note += f" | NAV NOT FOUND '{acc[1]}'"
    hz, hobs = demlib.horizon(lat, lon, lift_to_local_max=p["kind"] in ("peak", "hill"), eye=2.0 if p["kind"] in ("peak", "hill") else 6.0)
    e = dict(id=slug(p["name"]), n=p["name"], k=p["kind"], c=p["canton"], r=p["region"], e=p["ele"], la=round(lat, 5), lo=round(lon, 5),
             a=acc, zc=int(round(cell_height(lat, lon, p["ele"]))), hz=encode_horizon(hz))
    if nav: e["nav"] = nav
    if st_name and st_dist is not None and st_dist <= 1500: e["st"] = st_name; e["sd"] = int(st_dist)
    if p.get("season"): e["se"] = p["season"]
    if p.get("tip"): e["t"] = p["tip"]
    out.append(e)
    review.append((p["name"], p["kind"], p["ele"], round(fit), e["zc"], f"{st_name} ({st_dist} m)" if st_name else "-", float(np.max(hz[45:136])), note))

ids = [e["id"] for e in out]
assert len(ids) == len(set(ids)), [i for i in ids if ids.count(i) > 1]
os.makedirs(os.path.join(HERE, "..", "data"), exist_ok=True)
with open(os.path.join(HERE, "..", "data", "places.js"), "w") as fh:
    fh.write("/* Generated by tools/build_places.py - do not edit by hand. */\nwindow.SS_PLACES = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(f"\n{len(out)} places written")
print(f"{'name':28s} {'kind':8s} {'ele':>5s} {'fit':>5s} {'cell':>5s}  {'southMaxHz':>6s}  stop / notes")
for n, k, e, f, zc, st, hm, note in review:
    flag = "!!" if ("UNRESOLVED" in note or "NAV?" in note or "NOT FOUND" in note) else "  "
    print(f"{flag}{n[:26]:26s} {k:8s} {e:5d} {f:+5d} {zc:5d}  {hm:6.1f}  {st[:40]:40s} {note}")
