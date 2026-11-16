/* Sonnenseite - solar position and terrain shading.
   Solar position follows the NOAA algorithm (same maths as tools/sunpos.py).
   Each place carries a 360 degree terrain horizon (2 degree steps) computed from an elevation model at build time;
   the sun counts as visible when its apparent altitude is above that horizon. */
(function () {
  'use strict';
  const SS = (window.SS = window.SS || {});
  const RAD = Math.PI / 180;
  const S = (SS.sun = {});

  S.position = function (ms, lat, lon) {
    const jd = ms / 86400000 + 2440587.5, T = (jd - 2451545.0) / 36525.0;
    const L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
    const M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD;
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = Math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M) * (0.019993 - 0.000101 * T) + Math.sin(3 * M) * 0.000289;
    const omega = (125.04 - 1934.136 * T) * RAD;
    const lam = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
    const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    const eps = (eps0 + 0.00256 * Math.cos(omega)) * RAD;
    const decl = Math.asin(Math.sin(eps) * Math.sin(lam));
    const y = Math.tan(eps / 2) ** 2, L0r = L0 * RAD;
    const eot = (4 * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * M))) / RAD;
    const minutes = ((ms % 86400000) + 86400000) % 86400000 / 60000;
    const tst = (((minutes + eot + 4 * lon) % 1440) + 1440) % 1440;
    const ha = (tst / 4 - 180) * RAD, la = lat * RAD;
    const cz = Math.max(-1, Math.min(1, Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)));
    let alt = 90 - Math.acos(cz) / RAD;
    const az = ((Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(decl) * Math.cos(la)) / RAD + 180) % 360 + 360) % 360;
    let r;                                           // atmospheric refraction, arc seconds
    if (alt > 85) r = 0;
    else if (alt > 5) { const t = Math.tan(alt * RAD); r = 58.1 / t - 0.07 / (t * t * t) + 0.000086 / (t * t * t * t * t); }
    else if (alt > -0.575) r = 1735 + alt * (-518.2 + alt * (103.4 + alt * (-12.79 + alt * 0.711)));
    else r = -20.772 / Math.tan(alt * RAD);
    alt += r / 3600;
    return { alt: alt, az: az };
  };

  /* horizon strings: one character per 2 degrees of azimuth, angle = (code - 33) / 2 - 3 degrees */
  S.decodeHorizon = function (str) {
    const a = new Float32Array(180);
    for (let i = 0; i < 180; i++) a[i] = (str.charCodeAt(i) - 33) / 2 - 3;
    return a;
  };
  S.horizonAt = function (hz, az) {
    const x = (((az % 360) + 360) % 360) / 2, i = Math.floor(x) % 180, f = x - Math.floor(x);
    return hz[i] * (1 - f) + hz[(i + 1) % 180] * f;
  };
  S.visible = function (hz, ms, lat, lon) {
    const p = S.position(ms, lat, lon);
    return p.alt > Math.max(hz ? S.horizonAt(hz, p.az) : 0, 0);
  };

  /* Fraction of the hour starting at ms during which the sun clears the terrain (10 samples). Also reports night. */
  S.hourFraction = function (hz, ms, lat, lon) {
    let vis = 0, up = 0;
    for (let k = 0; k < 10; k++) {
      const p = S.position(ms + 180000 + k * 360000, lat, lon);
      if (p.alt > 0) { up++; if (p.alt > Math.max(S.horizonAt(hz, p.az), 0)) vis++; }
    }
    return { terr: vis / 10, up: up / 10 };
  };

  /* First and last moment of direct sun on a given local day, with and without terrain (4 minute resolution). */
  S.dayWindow = function (hz, dayStartMs, lat, lon) {
    let first = null, last = null, rise = null, set = null, minutes = 0, astro = 0;
    for (let t = dayStartMs; t < dayStartMs + 86400000; t += 240000) {
      const p = S.position(t + 120000, lat, lon);
      if (p.alt > 0) {
        astro += 4; if (rise == null) rise = t; set = t + 240000;
        if (p.alt > Math.max(S.horizonAt(hz, p.az), 0)) { minutes += 4; if (first == null) first = t; last = t + 240000; }
      }
    }
    return { first: first, last: last, rise: rise, set: set, minutes: minutes, astro: astro };
  };

  /* Sun track for a day: points every stepMin minutes while the sun is above -1 degree. */
  S.track = function (dayStartMs, lat, lon, stepMin) {
    const out = [];
    for (let t = dayStartMs; t <= dayStartMs + 86400000; t += (stepMin || 10) * 60000) {
      const p = S.position(t, lat, lon);
      if (p.alt > -1) out.push({ ms: t, alt: p.alt, az: p.az });
    }
    return out;
  };
})();
