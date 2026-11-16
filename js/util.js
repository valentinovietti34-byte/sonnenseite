/* Sonnenseite - shared helpers: DOM, formatting, Swiss time, geometry, storage. */
(function () {
  'use strict';
  const SS = (window.SS = window.SS || {});
  const U = (SS.util = {});

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments, self = this; t = setTimeout(() => fn.apply(self, a), ms); }; };

  /* ---------- storage (always guarded: private windows and full quotas throw) ---------- */
  U.load = (key, fallback) => { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } };
  U.save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } };
  U.drop = (key) => { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } };

  /* ---------- geometry ---------- */
  const RAD = Math.PI / 180;
  U.haversine = (lat1, lon1, lat2, lon2) => {
    const p1 = lat1 * RAD, p2 = lat2 * RAD;
    const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  };
  U.bearing = (lat1, lon1, lat2, lon2) => {
    const y = Math.sin((lon2 - lon1) * RAD) * Math.cos(lat2 * RAD);
    const x = Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) - Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lon2 - lon1) * RAD);
    return (Math.atan2(y, x) / RAD + 360) % 360;
  };
  U.compass = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
  /* Swiss grid LV95 <-> WGS84 (swisstopo approximate formulas, about 1 m accurate) */
  U.lv95ToWgs = (E, N) => {
    const y = (E - 2600000) / 1e6, x = (N - 1200000) / 1e6;
    const lam = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
    const phi = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x * x * x;
    return [(phi * 100) / 36, (lam * 100) / 36];
  };
  U.wgsToLv95 = (lat, lon) => {
    const p = (lat * 3600 - 169028.66) / 10000, l = (lon * 3600 - 26782.5) / 10000;
    const E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l;
    const N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p;
    return [Math.round(E), Math.round(N)];
  };

  /* ---------- Swiss local time (Europe/Zurich), independent of the device time zone ---------- */
  const TZ = 'Europe/Zurich';
  const partsFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  const T = (SS.tz = {});
  T.parts = (ms) => {
    const o = {};
    for (const p of partsFmt.formatToParts(ms)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, min: +o.minute, wd: o.weekday };
  };
  T.offsetMin = (ms) => { const p = T.parts(ms); return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(ms / 60000) * 60000) / 60000); };
  T.dayStart = (ms) => {
    const p = T.parts(ms);
    let t = Date.UTC(p.y, p.m - 1, p.d) - T.offsetMin(ms) * 60000;
    const q = T.parts(t);                       // correct across daylight-saving changes
    if (q.h !== 0) t += (q.h > 12 ? 24 - q.h : -q.h) * 3600000;
    return t;
  };
  T.hour = (ms) => T.parts(ms).h;
  T.hm = (ms) => { const p = T.parts(ms); return String(p.h).padStart(2, '0') + ':' + String(p.min).padStart(2, '0'); };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  T.dayLabel = (ms, nowMs) => {
    const d0 = T.dayStart(nowMs == null ? Date.now() : nowMs), d = T.dayStart(ms), diff = Math.round((d - d0) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const p = T.parts(ms + 12 * 3600000 - (ms - d));
    return p.wd + ' ' + p.d;
  };
  T.date = (ms) => { const p = T.parts(ms); return p.wd + ' ' + p.d + ' ' + MONTHS[p.m - 1]; };
  T.dateLong = (ms) => { const p = T.parts(ms); return p.wd + ' ' + p.d + ' ' + MONTHS[p.m - 1] + ' ' + p.y; };
  T.iso = (ms) => { const p = T.parts(ms); return p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0'); };
  T.month = (ms) => T.parts(ms).m;

  /* ---------- units ---------- */
  U.units = () => (SS.state && SS.state.units) || 'metric';
  U.fmtAlt = (m) => (U.units() === 'imperial' ? Math.round(m * 3.28084).toLocaleString('en-US') + ' ft' : Math.round(m).toLocaleString('de-CH').replace(/’|'/g, ',') + ' m');
  U.fmtAltRound = (m, step) => U.fmtAlt(Math.round(m / (step || 50)) * (step || 50));
  U.fmtTemp = (c) => (c == null || isNaN(c) ? '–' : U.units() === 'imperial' ? Math.round(c * 1.8 + 32) + '°F' : Math.round(c) + '°');
  U.fmtDist = (km) => (U.units() === 'imperial' ? (km * 0.621371 < 10 ? (km * 0.621371).toFixed(1) : Math.round(km * 0.621371)) + ' mi' : (km < 10 ? km.toFixed(1) : Math.round(km)) + ' km');
  U.fmtWind = (kmh) => (kmh == null || isNaN(kmh) ? '–' : U.units() === 'imperial' ? Math.round(kmh * 0.621371) + ' mph' : Math.round(kmh) + ' km/h');
  U.fmtDur = (min) => { min = Math.round(min); if (min < 60) return min + ' min'; const h = Math.floor(min / 60), m = min % 60; return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };
  U.fmtSunHours = (min) => { const h = min / 60; return (h >= 9.95 ? Math.round(h) : h.toFixed(1)) + ' h'; };

  /* ---------- colour scale for sunshine (0 = grey fog, 1 = full sun) ---------- */
  const STOPS = [[0, [137, 151, 163]], [0.2, [171, 180, 186]], [0.4, [214, 204, 160]], [0.6, [244, 204, 92]], [0.8, [247, 178, 32]], [1, [245, 158, 0]]];
  U.sunColor = (f) => {
    f = U.clamp(f / 0.9, 0, 1);               // 0.9 is the practical maximum of the calibrated estimate
    for (let i = 1; i < STOPS.length; i++) {
      if (f <= STOPS[i][0]) {
        const a = STOPS[i - 1], b = STOPS[i], t = (f - a[0]) / (b[0] - a[0]);
        return 'rgb(' + [0, 1, 2].map((k) => Math.round(U.lerp(a[1][k], b[1][k], t))).join(',') + ')';
      }
    }
    return 'rgb(245,158,0)';
  };
  U.sunWord = (f) => (f >= 0.6 ? 'Sunny' : f >= 0.4 ? 'Mostly sunny' : f >= 0.2 ? 'Some sun' : 'No sun');

  /* ---------- fetch with timeout and readable errors ---------- */
  U.getJSON = async (url, opts) => {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), (opts && opts.timeout) || 25000);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: (opts && opts.headers) || undefined });
      if (!r.ok) {
        let reason = '';
        try { const j = await r.json(); reason = j.reason || j.message || ''; } catch (e) { /* not json */ }
        const err = new Error(reason || 'HTTP ' + r.status); err.status = r.status; throw err;
      }
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') { const err = new Error('The request timed out.'); err.status = 0; throw err; }
      throw e;
    } finally { clearTimeout(timer); }
  };
})();
