"""Solar position (NOAA algorithm). Same maths as js/sun.js; used for build-time checks and calibration."""
import math


def sun_position(ts_utc, lat, lon):
    """ts_utc: unix seconds. Returns (apparent altitude deg, azimuth deg clockwise from north)."""
    jd = ts_utc / 86400.0 + 2440587.5
    T = (jd - 2451545.0) / 36525.0
    L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360.0
    M = math.radians(357.52911 + T * (35999.05029 - 0.0001537 * T))
    e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    C = (math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + math.sin(2 * M) * (0.019993 - 0.000101 * T)
         + math.sin(3 * M) * 0.000289)
    omega = math.radians(125.04 - 1934.136 * T)
    lam = math.radians(L0 + C - 0.00569 - 0.00478 * math.sin(omega))
    eps0 = 23.0 + (26.0 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60.0) / 60.0
    eps = math.radians(eps0 + 0.00256 * math.cos(omega))
    decl = math.asin(math.sin(eps) * math.sin(lam))
    y = math.tan(eps / 2.0) ** 2
    L0r = math.radians(L0)
    eot = 4.0 * math.degrees(y * math.sin(2 * L0r) - 2 * e * math.sin(M) + 4 * e * y * math.sin(M) * math.cos(2 * L0r)
                             - 0.5 * y * y * math.sin(4 * L0r) - 1.25 * e * e * math.sin(2 * M))
    minutes = (ts_utc % 86400.0) / 60.0
    tst = (minutes + eot + 4.0 * lon) % 1440.0
    ha = math.radians(tst / 4.0 - 180.0)
    la = math.radians(lat)
    cz = max(-1.0, min(1.0, math.sin(la) * math.sin(decl) + math.cos(la) * math.cos(decl) * math.cos(ha)))
    zen = math.acos(cz)
    alt = 90.0 - math.degrees(zen)
    az = (math.degrees(math.atan2(math.sin(ha), math.cos(ha) * math.sin(la) - math.tan(decl) * math.cos(la))) + 180.0) % 360.0
    # atmospheric refraction (apparent altitude)
    if alt > 85.0:
        r = 0.0
    elif alt > 5.0:
        t = math.tan(math.radians(alt))
        r = 58.1 / t - 0.07 / t ** 3 + 0.000086 / t ** 5
    elif alt > -0.575:
        r = 1735.0 + alt * (-518.2 + alt * (103.4 + alt * (-12.79 + alt * 0.711)))
    else:
        r = -20.772 / math.tan(math.radians(alt))
    return alt + r / 3600.0, az
