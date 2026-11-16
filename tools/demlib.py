"""Elevation model helpers on top of Terrarium tiles (AWS Open Data, Mapzen/Tilezen terrain).

Tiles are cached under $SONNENSEITE_DEM (default: ./.dem next to this file). Used at build time only:
  - elev(lat, lon)              elevation in metres (bilinear, zoom 12 ~ 26 m per pixel)
  - horizon(lat, lon, ...)      terrain horizon angle for every azimuth, with earth curvature and refraction
"""
import math
import os
import subprocess
import concurrent.futures as cf

import numpy as np
from PIL import Image

ROOT = os.environ.get("SONNENSEITE_DEM") or os.path.join(os.path.dirname(os.path.abspath(__file__)), ".dem")
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
R_EARTH = 6371000.0
REFRACTION_K = 0.13


def tile_xy(lat, lon, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
    return x, y


def tile_path(z, x, y):
    return os.path.join(ROOT, str(z), f"{x}_{y}.png")


def fetch(t):
    z, x, y = t
    p = tile_path(z, x, y)
    if os.path.exists(p) and os.path.getsize(p) > 200:
        return True
    os.makedirs(os.path.dirname(p), exist_ok=True)
    for _ in range(3):
        r = subprocess.run(["curl", "-sS", "-m", "60", "-o", p + ".tmp", "-w", "%{http_code}", URL.format(z=z, x=x, y=y)],
                           capture_output=True, text=True)
        if r.stdout.strip() == "200":
            os.replace(p + ".tmp", p)
            return True
    return False


def fetch_all(tiles, workers=8):
    tiles = sorted(set(tiles))
    with cf.ThreadPoolExecutor(workers) as ex:
        res = list(ex.map(fetch, tiles))
    return sum(res), len(res)


_cache = {}


def load_tile(z, x, y):
    key = (z, x, y)
    a = _cache.get(key)
    if a is None:
        if len(_cache) > 400:
            _cache.clear()
        if not fetch(key):
            raise RuntimeError(f"missing DEM tile {key}")
        im = np.asarray(Image.open(tile_path(z, x, y)).convert("RGB"), dtype=np.float32)
        a = im[:, :, 0] * 256.0 + im[:, :, 1] + im[:, :, 2] / 256.0 - 32768.0
        _cache[key] = a
    return a


class Mosaic:
    """A rectangular block of tiles at one zoom level, sampled bilinearly."""

    def __init__(self, z, x0, y0, x1, y1):
        self.z, self.x0, self.y0 = z, x0, y0
        w, h = x1 - x0 + 1, y1 - y0 + 1
        self.a = np.zeros((h * 256, w * 256), dtype=np.float32)
        for ty in range(y0, y1 + 1):
            for tx in range(x0, x1 + 1):
                self.a[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256] = load_tile(z, tx, ty)

    @classmethod
    def around(cls, lat, lon, z, radius_tiles=1):
        x, y = tile_xy(lat, lon, z)
        return cls(z, int(x) - radius_tiles, int(y) - radius_tiles, int(x) + radius_tiles, int(y) + radius_tiles)

    @classmethod
    def bbox(cls, lat0, lon0, lat1, lon1, z):
        xa, yb = tile_xy(lat0, lon0, z)
        xb, ya = tile_xy(lat1, lon1, z)
        return cls(z, int(xa), int(ya), int(xb), int(yb))

    def sample(self, lat, lon):
        lat = np.asarray(lat, dtype=np.float64)
        lon = np.asarray(lon, dtype=np.float64)
        n = 2 ** self.z
        px = ((lon + 180.0) / 360.0 * n - self.x0) * 256.0 - 0.5
        py = ((1.0 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2.0 * n - self.y0) * 256.0 - 0.5
        h, w = self.a.shape
        px = np.clip(px, 0, w - 1.001)
        py = np.clip(py, 0, h - 1.001)
        ix = np.floor(px).astype(np.int64)
        iy = np.floor(py).astype(np.int64)
        fx = px - ix
        fy = py - iy
        a = self.a
        return (a[iy, ix] * (1 - fx) * (1 - fy) + a[iy, ix + 1] * fx * (1 - fy)
                + a[iy + 1, ix] * (1 - fx) * fy + a[iy + 1, ix + 1] * fx * fy)

    def covers(self, lat, lon):
        x, y = tile_xy(lat, lon, self.z)
        h, w = self.a.shape
        return self.x0 <= x < self.x0 + w / 256 and self.y0 <= y < self.y0 + h / 256


def elev(lat, lon, z=12):
    return float(Mosaic.around(lat, lon, z, 0).sample(lat, lon)) if _edge_safe(lat, lon, z) else float(Mosaic.around(lat, lon, z, 1).sample(lat, lon))


def _edge_safe(lat, lon, z):
    x, y = tile_xy(lat, lon, z)
    fx, fy = (x % 1) * 256, (y % 1) * 256
    return 1 < fx < 254 and 1 < fy < 254


def destination(lat, lon, az_deg, dist_m):
    """Points reached from (lat, lon) along azimuth(s) az_deg for distance(s) dist_m (spherical earth)."""
    la = math.radians(lat)
    lo = math.radians(lon)
    az = np.radians(az_deg)
    dr = np.asarray(dist_m, dtype=np.float64) / R_EARTH
    lat2 = np.arcsin(np.sin(la) * np.cos(dr) + np.cos(la) * np.sin(dr) * np.cos(az))
    lon2 = lo + np.arctan2(np.sin(az) * np.sin(dr) * np.cos(la), np.cos(dr) - np.sin(la) * np.sin(lat2))
    return np.degrees(lat2), np.degrees(lon2)


FAR = None


def far_mosaic():
    """Zoom-10 mosaic of Switzerland plus a ~100 km margin (about 100 m per pixel)."""
    global FAR
    if FAR is None:
        FAR = Mosaic.bbox(44.85, 4.55, 48.75, 11.85, 10)
    return FAR


def horizon(lat, lon, az_step=2.0, eye=2.0, lift_to_local_max=True, near_start=150.0, hobs=None):
    """Terrain horizon elevation angle (degrees) for azimuths 0, az_step, ... clockwise from north.

    Near field (to 6 km) uses zoom 12 (~26 m), far field (to 120 km) zoom 10 (~104 m).
    Angles include earth curvature and standard atmospheric refraction.
    Returns (angles, observer_height).
    """
    near = Mosaic.around(lat, lon, 12, 1)
    far = far_mosaic()
    h0 = float(near.sample(lat, lon))
    if lift_to_local_max:
        # Stand on the highest ground within ~75 m: viewpoints and top stations sit on the local high point,
        # and the elevation model smooths sharp summits.
        azs = np.arange(0, 360, 30.0)
        for d in (25.0, 50.0, 75.0):
            la, lo = destination(lat, lon, azs, d)
            h0 = max(h0, float(near.sample(la, lo).max()))
    hobs = max(h0 + eye, hobs) if hobs is not None else h0 + eye
    az = np.arange(0.0, 360.0, az_step)
    d_near = np.arange(near_start, 6000.0, 25.0)
    d_mid = np.arange(6000.0, 30000.0, 100.0)
    d_far = np.arange(30000.0, 120000.0, 250.0)
    best = np.full(az.shape, -90.0)
    for dist, mos in ((d_near, near), (d_mid, far), (d_far, far)):
        A, D = np.meshgrid(az, dist, indexing="ij")
        la, lo = destination(lat, lon, A, D)
        h = mos.sample(la, lo)
        drop = D * D / (2.0 * R_EARTH) * (1.0 - REFRACTION_K)
        ang = np.degrees(np.arctan2(h - hobs - drop, D))
        best = np.maximum(best, ang.max(axis=1))
    return best, hobs
