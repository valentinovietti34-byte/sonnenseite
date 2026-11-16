"""Build data/webcams.js: a directory of public Swiss webcams with coordinates.

Source: OpenStreetMap features tagged contact:webcam / website:webcam / webcam (ODbL, (c) OpenStreetMap contributors),
queried once from the Swiss Overpass server (see QUERY), plus the hand-checked additions in EXTRA.
For Roundshot pages the public link-preview thumbnail (the page's twitter:image tag) is recorded so the app can show
a small live preview that links to the operator's own page. Nothing else is fetched from webcam hosts.
"""
import hashlib, json, math, os, re, subprocess, sys, time
from urllib.parse import urlparse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import demlib
CACHE = os.path.join(HERE, ".cache"); os.makedirs(CACHE, exist_ok=True)
QUERY = '[out:json][timeout:120];(nwr["contact:webcam"](45.75,5.85,47.90,10.60);nwr["webcam"](45.75,5.85,47.90,10.60);nwr["website:webcam"](45.75,5.85,47.90,10.60););out center tags;'
OVERPASS = "https://overpass.osm.ch/api/interpreter"

# Hand-checked additions: (name, lat, lon, page url). Filled from official sites found by web search.
EXTRA = []
try:
    from webcams_extra import EXTRA  # noqa
except ImportError:
    pass

SKIP_HOSTS = ("asfinag", "tirol.gv.at", "allgaeuer.at", "pioupiou", "balisemeteo", "yellow.camera", "bau-cam", "flughafen-zuerich",
              "flickr", "youtube", "gga-pratteln", "webcam-hd.com", "skaping", "snowpages", "seemorzine", "chatel.com", "pleney",
              "meteotrivigno", "monterosa2000", "scenaridigitali", "caisovico", "rifugioschiazzera", "ras.bz.it", "myortler",
              "meersburg", "lichtwerbung", "gasthofwaldhaus", "hirsch-woelfl", "smcue", "inselhalle", "dir-est.fr", "85.4.30.236",
              "derago", "gevi.ch", "campus-biel", "gymneufeld", "sg-dittingen", "pmcjoder", "aerojura", "swissvapeur", "cffimmobilier",
              "scopedevelopment", "msap.", "computechnic", "backend.roundshot", "webcam.io", "officeco", "jdbonjour", "hostetbach",
              "holfuy", "lakeview", "45degrees", "kamerasau", "meteomap", "briod.com", "rnvl.ch", "golfclub", "hermitage", "grossabuent",
              "feratel.com/webcams", "valsurses", "bergfex.cz", "maerchenhotel", "hoteledelweiss", "castello-seeschloss", "epfl.")


NAME_FIX = {  # url substring -> better name, or None to drop
    "schneeselital": None, "selital.ch": "Selital (Gantrisch)", "4insiders.webcam/webcam/leissigen": "Leissigen (Meielisalp)",
    "aletscharena.ch/hier-jetzt": "Aletsch Arena: all cameras", "feratel.com/webtv/?cam=4300": "Alp Trida (Samnaun)",
    "amden-weesen": "Amden", "appenzeller-seilbahnen": "Hoher Kasten: Rhine valley view", "bergfex.ch/jeizinen": "Jeizinen",
    "bergfex.ch/sommer/glarus": "Glarus", "webcam/berguen": "Bergün", "piz-darlux": "Piz Darlux (Bergün)", "swisswebcams.ch": None,
    "hoherkasten.ch": None, "interlaken-harderkulm": "Harder Kulm", "sustenpass": "Sustenpass (Steingletscher)", "lzgwebcam": "Gantrisch cross-country centre",
    "top-of-europe-jungfraujoch": "Jungfraujoch", "Pl%c3%a9iades": "Les Pléiades", "naye-est": "Rochers-de-Naye (east)", "naye-ouest": "Rochers-de-Naye (west)",
    "naye-sud": "Rochers-de-Naye (south)", "savognin.ch/extras": None, "savognin.graubuenden": "Savognin", "schilthorn.ch/en": "Schilthorn",
    "dent-de-vaulion": "Dent de Vaulion", "live/cam11": "Bettmeralp", "17263-": None, "17158-": None, "17011-": "Adliswil",
    "feratel.com/webtv/?cam=4225": "Cardada", "grischuni": "Fläsch", "elsigen-metsch": "Elsigen-Metsch", "rocheray": "Lac de Joux (Le Rocheray)",
}


SOURCES = os.path.join(HERE, "sources")
RING = json.load(open(os.path.join(SOURCES, "ch_border.json")))["ring"]     # simplified Swiss border, [lon, lat]


def in_ch(lat, lon, pad=0.0):
    inside = False; n = len(RING)
    for i in range(n):
        x1, y1 = RING[i]; x2, y2 = RING[(i + 1) % n]
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def get_text(url):
    p = os.path.join(CACHE, "wc_" + hashlib.sha1(url.encode()).hexdigest() + ".html")
    if os.path.exists(p):
        return open(p, errors="replace").read()
    r = subprocess.run(["curl", "-sS", "-m", "30", "-L", "-o", p + ".tmp", "-w", "%{http_code}", url], capture_output=True, text=True)
    time.sleep(1.0)
    if r.stdout.strip() == "200":
        os.replace(p + ".tmp", p); return open(p, errors="replace").read()
    return ""


def pretty(slug):
    s = re.sub(r"[-_]+", " ", slug).strip()
    fixes = {"zuerich": "Zürich", "saentis": "Säntis", "maennlichen": "Männlichen", "spluegenpass": "Splügenpass", "flueela": "Flüela",
             "ladole": "La Dôle", "pizcorvatsch": "Piz Corvatsch", "pizscalottas": "Piz Scalottas", "rochedor": "Roche d'Or",
             "grimselhospiz": "Grimsel Hospiz", "chax": "Château-d'Oex", "laf": "Felsenegg", "zbag": "Zermatt", "tlml": "Leysin La Berneuse",
             "pds ch": "Portes du Soleil", "baezberg": "Bäzberg", "gurtenpark": "Gurten", "valleedejoux": "Vallée de Joux",
             "valleedutrient": "Vallée du Trient", "latourdepeilz": "La Tour-de-Peilz", "montpelerin": "Mont Pèlerin", "glacier3000": "Glacier 3000"}
    low = s.lower()
    for k, v in fixes.items():
        low = re.sub(rf"\b{k}\b", v, low)
    return " ".join(w if any(c.isupper() for c in w) else w.capitalize() for w in low.split())


def roundshot_name(u, osm_name):
    pu = urlparse(u); sub = pu.netloc.split(".")[0]; path = [x for x in pu.path.split("/") if x]
    if sub == "meteoschweiz":
        return "MeteoSwiss camera " + (re.sub(r"^(Wetterkamera|Webcam)\s+", "", osm_name) if osm_name else pretty(path[0] if path else ""))
    base = pretty(sub.replace("tourismus", "").replace("kachelmannwetter", "").replace("juratourisme", "").replace("berntourismus", "Bern")
                  .replace("zuerichtourismus", "Zürich").replace("morgesregion", "Morges").replace("nyon-tourisme", "Nyon")
                  .replace("wasserfallenbahn", "Wasserfallen").replace("roggenberg", "Roggen"))
    tail = pretty(path[0]) if path else ""
    nm = (base + " " + tail).strip() if tail and tail.lower() not in base.lower() else (base or tail)
    return nm or osm_name or "Webcam"


els = json.load(open(os.path.join(SOURCES, "osm_webcams.json")))["elements"]    # saved answer to QUERY from OVERPASS
rows = []
for e in els:
    t = e.get("tags", {}); lat = e.get("lat", e.get("center", {}).get("lat")); lon = e.get("lon", e.get("center", {}).get("lon"))
    u = (t.get("contact:webcam") or t.get("website:webcam") or t.get("webcam") or "").split(";")[0].strip()
    if not u or lat is None or any(h in u for h in SKIP_HOSTS) or not in_ch(lat, lon):
        continue
    if u.startswith("http://"):
        u = "https://" + u[7:] if any(h in u for h in ("goldenpass", "hoherkasten", "savognin", "lzgwebcam", "rocheray")) else None
    if u:
        rows.append((t.get("name") or "", lat, lon, u, "osm"))
for name, lat, lon, u in EXTRA:
    rows.append((name, lat, lon, u, "curated"))

out, seen = [], set()
for name, lat, lon, u, src in rows:
    u = re.sub(r"#/?$", "", u)
    key = re.sub(r"/+$", "", u.lower())
    if key in seen:
        continue
    seen.add(key)
    host = urlparse(u).netloc; w = dict(la=round(lat, 5), lo=round(lon, 5), u=u, s=src)
    if host.endswith("roundshot.com"):
        w["p"] = "roundshot"; w["n"] = name if src == "curated" and name else roundshot_name(u, name)
        m = re.search(r'name="twitter:image"\s+content="([^"]+)"', get_text(u))
        if m and re.match(r"^/cams/\d+/thumbnail$", m.group(1)):
            w["i"] = f"https://{host}{m.group(1)}"
        w["f"] = 1   # operator offers the page for embedding
    elif "foto-webcam.eu" in host:
        slug = re.search(r"/webcam/([^/]+)", u)
        if not slug: continue
        w["p"] = "foto-webcam"; w["u"] = f"https://www.foto-webcam.eu/webcam/{slug.group(1)}/"
        w["i"] = f"https://www.foto-webcam.eu/webcam/{slug.group(1)}/current/720.jpg"
        w["n"] = re.split(r"\s+[-/]\s+Blick|\s+-\s+|\s+/\s+", name)[0].strip() if name else pretty(slug.group(1))
    else:
        w["p"] = "page"; w["n"] = name or pretty(host.replace("www.", "").split(".")[0])
        hit = [v for k, v in NAME_FIX.items() if k in u]
        if hit:
            if hit[0] is None: continue
            w["n"] = hit[0]
        if re.search(r"\.(jpe?g|png)$", u, re.I):
            w["i"] = u
    out.append(w)

tiles = []
for w in out:
    x, y = demlib.tile_xy(w["la"], w["lo"], 12); tiles.append((12, int(x), int(y)))
demlib.fetch_all(tiles)
for w in out:
    w["e"] = int(round(demlib.Mosaic.around(w["la"], w["lo"], 12, 0).sample(w["la"], w["lo"])))
out.sort(key=lambda w: (w["n"].lower(), w["la"]))
with open(os.path.join(HERE, "..", "data", "webcams.js"), "w") as fh:
    fh.write("/* Generated by tools/build_webcams.py. Webcam locations (c) OpenStreetMap contributors (ODbL) plus hand-checked additions. */\n"
             "window.SS_WEBCAMS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
import collections
print(len(out), "webcams;", collections.Counter(w["p"] for w in out), "; with preview image:", sum(1 for w in out if "i" in w))
for w in out: print(f"  {w['n'][:38]:38s} {w['e']:5d} m  {w['p']:11s} {'img' if 'i' in w else '   '} {w['u'][:70]}")
