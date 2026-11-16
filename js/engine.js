/* Sonnenseite - data engine.
   Loads the forecast (Open-Meteo), live measurements (MeteoSwiss open data), drive times (OSRM) and timetable
   connections (transport.opendata.ch), and turns them into an hourly sunshine estimate for every place.

   How sunshine is estimated (calibrated against 26,000 station-hours of MeteoSwiss sunshine measurements):
     sun = terrain x 0.9 x (1 - 0.9 L) x (1 - 0.6 M^0.75) x (1 - 0.2 H^3)
   with L, M, H the low, mid and high cloud fractions and "terrain" the share of the hour the sun clears the
   mountains. The weather model's own "sunshine duration" is not used: it overstated measured sun about twofold.

   Fog top: weather-model cells are about 2 km wide, so a hill that pokes out of the fog often sits in a cell that
   is still inside it. For every hour the engine fits the regional profile "low cloud versus altitude" from all
   places within 40 km (an isotonic fit over the model's cell heights) and lifts a hill out of the fog only when a
   cell at or below its real altitude is already clear. */
(function () {
  'use strict';
  const SS = window.SS, U = SS.util, T = SS.tz, Sun = SS.sun;
  const E = (SS.engine = {});

  const API_VARS = ['cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'temperature_2m', 'wind_gusts_10m', 'precipitation', 'visibility', 'relative_humidity_2m', 'snow_depth'];
  const KEYS = ['low', 'mid', 'high', 'temp', 'gust', 'precip', 'vis', 'rh', 'snow'];
  /* cache quantisation: value -> 0..250 (255 = missing) */
  const Q = {
    low: [1, 0], mid: [1, 0], high: [1, 0], rh: [1, 0], temp: [2, 60], gust: [1, 0], precip: [10, 0], vis: [1 / 300, 0], snow: [50, 0],
  };
  const FC_KEY = 'ss.forecast.v2';
  const FC_MAX_AGE = 60 * 60000;

  E.MODELS = [
    { id: 'best_match', name: 'Best match', note: 'ICON-D2 (2 km) for two days, then ICON-EU. Recommended.' },
    { id: 'meteoswiss_icon_ch2', name: 'MeteoSwiss ICON-CH2', note: '2 km Swiss model, 5 days.' },
    { id: 'meteoswiss_icon_ch1', name: 'MeteoSwiss ICON-CH1', note: '1 km Swiss model, 33 hours only.' },
    { id: 'icon_d2', name: 'DWD ICON-D2', note: '2 km, 48 hours.' },
    { id: 'meteofrance_arome_france_hd', name: 'Météo-France AROME HD', note: '1.5 km, 2 days.' },
    { id: 'ecmwf_ifs025', name: 'ECMWF IFS', note: 'Global 25 km model; smooths out fog. For comparison.' },
  ];

  /* ------------------------------------------------------------------ places */
  E.init = function () {
    const P = (E.places = window.SS_PLACES.map((p, i) => Object.assign({}, p, { i: i, hzArr: Sun.decodeHorizon(p.hz) })));
    E.byId = {};
    P.forEach((p) => { E.byId[p.id] = p; });
    /* ladder neighbours within 40 km, sorted by model-cell height */
    P.forEach((p) => {
      const nb = [];
      P.forEach((q) => {
        if (q === p) return;
        const d = U.haversine(p.la, p.lo, q.la, q.lo);
        if (d < 40) nb.push({ j: q.i, z: q.zc, w: Math.exp(-d / 20) });
      });
      nb.sort((a, b) => a.z - b.z);
      p.nb = nb;
    });
    E.stationsMeta = window.SS_STATIONS || {};
    Object.keys(E.stationsMeta).forEach((id) => { E.stationsMeta[id].hzArr = Sun.decodeHorizon(E.stationsMeta[id].hz); });
    E.webcams = window.SS_WEBCAMS || [];
    E.drive = null;
  };

  /* ------------------------------------------------------------------ forecast */
  function encode(arr, key) {
    const [mul, off] = Q[key];
    let s = '';
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      s += String.fromCharCode(0x100 + (v !== v ? 255 : U.clamp(Math.round((v + off) * mul), 0, 250)));
    }
    return s;
  }
  function decode(str, key) {
    const [mul, off] = Q[key], a = new Float32Array(str.length);
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i) - 0x100; a[i] = c === 255 ? NaN : c / mul - off; }
    return a;
  }
  const placeSignature = () => E.places.length + ':' + E.places[0].id + ':' + E.places[E.places.length - 1].id;

  function forecastUrl(chunk, model, archive, days) {
    const base = archive ? 'https://historical-forecast-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast';
    const q = [
      'latitude=' + chunk.map((p) => p.la.toFixed(4)).join(','),
      'longitude=' + chunk.map((p) => p.lo.toFixed(4)).join(','),
      'elevation=' + chunk.map((p) => p.e).join(','),
      'hourly=' + API_VARS.join(','),
      'timeformat=unixtime', 'timezone=GMT', 'wind_speed_unit=kmh',
    ];
    if (archive) {
      const d0 = Date.parse(archive + 'T00:00:00Z');
      q.push('start_date=' + archive, 'end_date=' + new Date(d0 + 2 * 86400000).toISOString().slice(0, 10));
    } else {
      q.push('forecast_days=' + (days || 4));
    }
    if (model && model !== 'best_match') q.push('models=' + model);
    return base + '?' + q.join('&');
  }

  E._forecastUrl = forecastUrl;

  function fromCache(c) {
    const fc = { t0: c.t0, n: c.n, fetched: c.fetched, model: c.model, archive: c.archive || null, cached: true };
    KEYS.forEach((k) => { fc[k] = decode(c.vars[k], k); });
    return fc;
  }

  /* Returns the forecast object and computes derived fields. opts: {model, archive, force} */
  E.loadForecast = async function (opts) {
    opts = opts || {};
    const model = opts.model || 'best_match', archive = opts.archive || null;
    const cached = U.load(FC_KEY, null);
    const usable = cached && cached.sig === placeSignature() && cached.model === model && (cached.archive || null) === archive;
    if (usable && !opts.force && (archive || Date.now() - cached.fetched < FC_MAX_AGE)) {
      E.fc = fromCache(cached); compute(); return E.fc;
    }
    try {
      const P = E.places, chunks = [];
      for (let i = 0; i < P.length; i += 125) chunks.push(P.slice(i, i + 125));
      const parts = await Promise.all(chunks.map((ch) => U.getJSON(forecastUrl(ch, model, archive, opts.days), { timeout: 40000 })));
      const all = [];
      parts.forEach((r) => { (Array.isArray(r) ? r : [r]).forEach((x) => all.push(x)); });
      if (all.length !== P.length) throw new Error('The weather service returned an incomplete answer.');
      const time = all[0].hourly.time, n = time.length;
      const fc = { t0: time[0] * 1000, n: n, fetched: Date.now(), model: model, archive: archive, cached: false };
      KEYS.forEach((k, vi) => {
        const a = (fc[k] = new Float32Array(P.length * n)), name = API_VARS[vi];
        for (let i = 0; i < P.length; i++) {
          const src = all[i].hourly[name];
          for (let h = 0; h < n; h++) { const v = src ? src[h] : null; a[i * n + h] = v == null ? NaN : v; }
        }
      });
      const vars = {};
      KEYS.forEach((k) => { vars[k] = encode(fc[k], k); });
      U.save(FC_KEY, { sig: placeSignature(), model: model, archive: archive, fetched: fc.fetched, t0: fc.t0, n: n, vars: vars });
      E.fc = fc; compute(); return fc;
    } catch (err) {
      if (usable) { E.fc = fromCache(cached); E.fc.stale = true; E.fc.error = err; compute(); return E.fc; }
      throw err;
    }
  };

  /* calibrated share of an hour with sunshine, given cloud layers as fractions */
  E.cloudFactor = (L, M, H) => 0.9 * (1 - 0.9 * L) * (1 - 0.6 * Math.pow(M, 0.75)) * (1 - 0.2 * H * H * H);

  /* weighted isotonic regression: values non-increasing with altitude. zs must be ascending. */
  function isoDown(ys, ws) {
    const m = [], w = [], c = [];
    for (let i = 0; i < ys.length; i++) {
      m.push(ys[i]); w.push(ws[i]); c.push(1);
      while (m.length > 1 && m[m.length - 2] < m[m.length - 1]) {
        const k = m.length - 1, ww = w[k - 1] + w[k];
        m[k - 1] = (m[k - 1] * w[k - 1] + m[k] * w[k]) / ww; w[k - 1] = ww; c[k - 1] += c[k];
        m.pop(); w.pop(); c.pop();
      }
    }
    const fit = new Array(ys.length);
    let p = 0;
    for (let b = 0; b < m.length; b++) for (let k = 0; k < c[b]; k++) fit[p++] = m[b];
    return fit;
  }
  /* cloudiness at altitude z: value of the nearest ladder point at or below z (conservative step) */
  function stepAt(zs, fit, z) {
    let k = 0;
    for (let i = 0; i < zs.length; i++) { if (zs[i] <= z) k = i; else break; }
    return fit[k];
  }

  function compute() {
    const fc = E.fc, P = E.places, n = fc.n, N = P.length;
    const terr = (fc.terr = new Float32Array(N * n)), up = (fc.up = new Float32Array(N * n));
    const lowH = (fc.lowH = new Float32Array(N * n)), midH = new Float32Array(N * n), highH = new Float32Array(N * n);
    const leff = (fc.leff = new Float32Array(N * n)), sun = (fc.sun = new Float32Array(N * n));
    const below = (fc.fogBelow = new Uint8Array(N * n)), lifted = (fc.lifted = new Uint8Array(N * n));
    fc.midH = midH; fc.highH = highH;
    const avg = (a, i, h) => { const v = a[i * n + h], w = h + 1 < n ? a[i * n + h + 1] : v; return v !== v ? NaN : w !== w ? v : (v + w) / 2; };
    for (let i = 0; i < N; i++) {
      const p = P[i];
      for (let h = 0; h < n; h++) {
        const f = Sun.hourFraction(p.hzArr, fc.t0 + h * 3600000, p.la, p.lo);
        terr[i * n + h] = f.terr; up[i * n + h] = f.up;
        lowH[i * n + h] = avg(fc.low, i, h) / 100; midH[i * n + h] = avg(fc.mid, i, h) / 100; highH[i * n + h] = avg(fc.high, i, h) / 100;
      }
    }
    const zs = [], ys = [], ws = [];
    for (let i = 0; i < N; i++) {
      const p = P[i], nb = p.nb, hill = p.e > p.zc + 60;
      for (let h = 0; h < n; h++) {
        const idx = i * n + h, L = lowH[idx];
        let Le = L;
        if (L === L && nb.length >= 5) {
          zs.length = ys.length = ws.length = 0;
          for (let k = 0; k < nb.length; k++) {
            const v = lowH[nb[k].j * n + h];
            if (v === v) { zs.push(nb[k].z); ys.push(v); ws.push(nb[k].w); }
          }
          if (zs.length >= 5) {
            const fit = isoDown(ys, ws);
            if (hill) {
              Le = U.clamp(L + stepAt(zs, fit, p.e) - stepAt(zs, fit, p.zc), 0, 1);
              if (L >= 0.5 && Le < 0.3) lifted[idx] = 1;
            }
            /* a sea of fog below: the lowest surrounding cells are overcast and at least 150 m lower */
            if (zs[0] <= p.e - 150 && fit[0] >= 0.6 && Le <= 0.3) below[idx] = 1;
          }
        }
        leff[idx] = Le;
        const M = midH[idx], H = highH[idx];
        sun[idx] = Le === Le && M === M && H === H ? terr[idx] * E.cloudFactor(Le, M, H) : NaN;
      }
    }
    fc.computed = Date.now();
  }

  E.now = () => (E.fc && E.fc.archive ? T.dayStart(Date.parse(E.fc.archive + 'T12:00:00Z')) + 9 * 3600000 : Date.now());
  E.hourIndex = (ms) => (E.fc ? Math.floor((ms - E.fc.t0) / 3600000) : -1);
  E.days = function () {
    if (!E.fc) return [];
    const out = [], end = E.fc.t0 + E.fc.n * 3600000;
    for (let d = T.dayStart(E.fc.t0 + 3600000 * 2); d + 9 * 3600000 < end; d = T.dayStart(d + 26 * 3600000)) out.push(d);
    return out;
  };

  /* one hour at one place */
  E.hour = function (i, h) {
    const fc = E.fc, n = fc.n;
    if (!fc || h < 0 || h >= n) return null;
    const x = i * n + h, o = {
      ms: fc.t0 + h * 3600000, sun: fc.sun[x], terr: fc.terr[x], up: fc.up[x], low: fc.lowH[x], leff: fc.leff[x], mid: fc.midH[x], high: fc.highH[x],
      temp: fc.temp[x], gust: fc.gust[x], precip: fc.precip[x], vis: fc.vis[x], rh: fc.rh[x], snow: fc.snow[x], fogBelow: !!fc.fogBelow[x], lifted: !!fc.lifted[x],
    };
    o.state = o.sun !== o.sun ? 'nodata' : o.up === 0 ? 'night' : o.terr === 0 ? 'shade' : o.sun >= 0.6 ? 'sun' : o.sun >= 0.4 ? 'mostly' : o.sun >= 0.2 ? 'some' : 'none';
    o.why = o.state === 'night' ? 'Night' : o.state === 'shade' ? 'Sun behind the mountains' : o.state === 'nodata' ? 'No forecast for this hour'
      : o.sun >= 0.6 ? (o.fogBelow ? 'Sunny above the fog' : 'Sunny')
        : o.leff >= 0.6 ? (o.vis === o.vis && o.vis < 1500 ? 'In fog' : 'Low cloud or high fog') : o.mid >= 0.6 ? 'Mid-level cloud' : o.terr < 0.6 ? 'Partly behind the mountains' : o.leff >= 0.3 ? 'Broken low cloud' : 'Veiled sun';
    return o;
  };

  const winCache = {};
  /* a local day at one place. fromMs: only count sun after this moment (arrival time). */
  E.day = function (i, dayStart, fromMs) {
    const fc = E.fc, h0 = E.hourIndex(dayStart), p = E.places[i], hours = [];
    let sunMin = 0, sunAll = 0, first = null, last = null, tMin = Infinity, tMax = -Infinity, gust = 0, precip = 0, known = 0, light = 0;
    for (let k = 0; k < 24; k++) {
      const h = h0 + k, o = E.hour(i, h) || { ms: dayStart + k * 3600000, state: 'nodata', sun: NaN, up: 0, terr: 0 };
      hours.push(o);
      if (o.state === 'nodata') continue;
      known++;
      const m = o.sun * 60;
      sunAll += m;
      if (fromMs == null || o.ms >= fromMs) sunMin += m;
      else if (o.ms + 3600000 > fromMs) sunMin += m * (1 - (fromMs - o.ms) / 3600000);
      if (o.sun >= 0.45) { if (first == null) first = o.ms; last = o.ms + 3600000; }
      if (o.up > 0) { light++; if (o.temp === o.temp) { tMin = Math.min(tMin, o.temp); tMax = Math.max(tMax, o.temp); } if (o.gust === o.gust) gust = Math.max(gust, o.gust); }
      if (o.precip === o.precip) precip += o.precip;
    }
    const wk = dayStart + ':' + i;
    const win = winCache[wk] || (winCache[wk] = Sun.dayWindow(p.hzArr, dayStart, p.la, p.lo));
    return { hours: hours, sunMin: sunMin, sunAll: sunAll, first: first, last: last, tMin: isFinite(tMin) ? tMin : NaN, tMax: isFinite(tMax) ? tMax : NaN, gust: gust, precip: precip, known: known, window: win, fogBelowHours: hours.filter((o) => o.fogBelow && o.sun >= 0.45).length };
  };

  /* ------------------------------------------------------------------ regional fog profile */
  let profCache = { key: '', list: [] };
  function ladderAround(lat, lon) {
    const key = lat.toFixed(3) + ',' + lon.toFixed(3);
    if (profCache.key !== key) {
      const list = [];
      E.places.forEach((q) => { const d = U.haversine(lat, lon, q.la, q.lo); if (d < 45) list.push({ p: q, d: d, w: Math.exp(-d / 22) }); });
      list.sort((a, b) => a.p.zc - b.p.zc);
      profCache = { key: key, list: list };
    }
    return profCache.list;
  }
  /* state: fog (overcast below, clear above), deck (low cloud at every height we can see), clear, patchy, unknown */
  E.profile = function (lat, lon, h) {
    const fc = E.fc, list = ladderAround(lat, lon), zs = [], ys = [], ws = [], pts = [];
    if (!fc || h < 0 || h >= fc.n) return { state: 'unknown', pts: [] };
    list.forEach((it) => {
      const v = fc.lowH[it.p.i * fc.n + h];
      if (v === v) { zs.push(it.p.zc); ys.push(v); ws.push(it.w); pts.push({ p: it.p, z: it.p.zc, L: v, d: it.d }); }
    });
    if (zs.length < 5) return { state: 'unknown', pts: pts };
    const fit = isoDown(ys, ws);
    pts.forEach((q, k) => { q.fit = fit[k]; });
    const res = { pts: pts, bottom: fit[0], zMin: zs[0], zMax: zs[zs.length - 1], at: (z) => stepAt(zs, fit, z) };
    if (fit[0] < 0.3) { res.state = 'clear'; return res; }
    if (fit[0] < 0.6) { res.state = 'patchy'; return res; }
    let k = fit.findIndex((v) => v < 0.5);
    if (k < 0) { res.state = 'deck'; res.lo = zs[zs.length - 1]; return res; }
    res.state = 'fog'; res.lo = zs[k - 1]; res.hi = zs[k]; res.top = (res.lo + res.hi) / 2;
    return res;
  };

  /* estimate for an arbitrary point (your own location): regional low cloud at that altitude, other layers from the nearest place */
  E.atPoint = function (lat, lon, ele, h) {
    const fc = E.fc;
    if (!fc || h < 0 || h >= fc.n) return null;
    let best = null, bd = 1e9;
    E.places.forEach((q) => { const d = U.haversine(lat, lon, q.la, q.lo) + Math.abs(q.e - ele) / 60; if (d < bd) { bd = d; best = q; } });
    const x = best.i * fc.n + h, prof = E.profile(lat, lon, h);
    const near = U.haversine(lat, lon, best.la, best.lo) < 8 && Math.abs(best.e - ele) < 120;
    const L = near ? fc.leff[x] : prof.at ? prof.at(ele) : fc.lowH[x];
    const p = Sun.position(fc.t0 + h * 3600000 + 1800000, lat, lon);
    const sun = p.alt > 1 ? E.cloudFactor(L, fc.midH[x], fc.highH[x]) : 0;
    return { sun: sun, low: L, up: p.alt > 0, temp: fc.temp[x], vis: fc.vis[x], ref: best, prof: prof };
  };

  /* ------------------------------------------------------------------ live measurements (MeteoSwiss) */
  const OBS = 'https://data.geo.admin.ch/ch.meteoschweiz.messwerte-';
  E.loadObs = async function () {
    const get = (layer) => U.getJSON(OBS + layer + '/ch.meteoschweiz.messwerte-' + layer + '_en.json', { timeout: 20000 });
    const [sun, temp, rh] = await Promise.all([get('sonnenscheindauer-10min'), get('lufttemperatur-10min').catch(() => null), get('luftfeuchtigkeit-10min').catch(() => null)]);
    const st = {};
    const add = (fc, key) => {
      if (!fc || !fc.features) return;
      fc.features.forEach((f) => {
        const id = f.id, pr = f.properties || {}, c = f.geometry && f.geometry.coordinates;
        if (!c || pr.value == null) return;
        if (!st[id]) {
          const ll = U.lv95ToWgs(c[0], c[1]), meta = E.stationsMeta[id];
          st[id] = { id: id, n: pr.station_name, la: ll[0], lo: ll[1], e: Math.round(parseFloat(pr.altitude)) || (meta && meta.e) || 0, hzArr: meta ? meta.hzArr : null };
        }
        st[id][key] = +pr.value;
        if (key === 'sun') { st[id].ts = Date.parse(pr.reference_ts); if (pr.altitude) st[id].e = Math.round(parseFloat(pr.altitude)); }
      });
    };
    add(sun, 'sun'); add(temp, 't'); add(rh, 'rh');
    const list = Object.keys(st).map((k) => st[k]);
    let ts = 0;
    list.forEach((s) => { if (s.ts > ts) ts = s.ts; });
    list.forEach((s) => {
      /* can the sensor see the sun right now? (terrain horizon plus a small margin) */
      if (s.sun == null || !s.ts) { s.canSee = false; return; }
      const p = Sun.position(s.ts - 300000, s.la, s.lo);
      s.sunAlt = p.alt;
      s.canSee = p.alt > 4 && p.alt > (s.hzArr ? Sun.horizonAt(s.hzArr, p.az) : 0) + 1.5;
    });
    E.obs = { list: list, ts: ts, fetched: Date.now() };
    return E.obs;
  };
  /* measured fog top around a point: stations that can see the sun, sorted by altitude */
  E.obsProfile = function (lat, lon) {
    if (!E.obs) return { state: 'unknown', pts: [] };
    const pts = [];
    E.obs.list.forEach((s) => { if (s.canSee) { const d = U.haversine(lat, lon, s.la, s.lo); if (d < 50) pts.push({ s: s, z: s.e, L: 1 - s.sun / 10, w: Math.exp(-d / 25), d: d }); } });
    pts.sort((a, b) => a.z - b.z);
    if (pts.length < 4) return { state: 'unknown', pts: pts };
    const fit = isoDown(pts.map((q) => q.L), pts.map((q) => q.w));
    pts.forEach((q, k) => { q.fit = fit[k]; });
    const res = { pts: pts, ts: E.obs.ts };
    if (fit[0] < 0.3) res.state = 'clear';
    else if (fit[0] < 0.6) res.state = 'patchy';
    else {
      const k = fit.findIndex((v) => v < 0.5);
      if (k < 0) { res.state = 'deck'; res.lo = pts[pts.length - 1].z; res.loName = pts[pts.length - 1].s.n; }
      else { res.state = 'fog'; res.lo = pts[k - 1].z; res.hi = pts[k].z; res.loName = pts[k - 1].s.n; res.hiName = pts[k].s.n; res.top = (res.lo + res.hi) / 2; }
    }
    return res;
  };
  E.nearestStation = function (lat, lon, ele, maxKm, maxDz) {
    if (!E.obs) return null;
    let best = null, bd = 1e9;
    E.obs.list.forEach((s) => {
      const d = U.haversine(lat, lon, s.la, s.lo);
      if (d <= (maxKm || 12) && Math.abs(s.e - ele) <= (maxDz || 250) && d + Math.abs(s.e - ele) / 50 < bd) { bd = d + Math.abs(s.e - ele) / 50; best = Object.assign({ dist: d }, s); }
    });
    return best;
  };

  /* ------------------------------------------------------------------ travel */
  const navPoint = (p) => (p.nav ? [p.nav[0], p.nav[1]] : [p.la, p.lo]);
  const crowMinutes = (km) => 4 + (km * 1.38) / 62 * 60;
  E.loadDrive = async function (home) {
    const P = E.places, key = 'ss.drive.v1', sig = home.lat.toFixed(3) + ',' + home.lon.toFixed(3) + ':' + placeSignature();
    E.driveHome = { lat: home.lat, lon: home.lon };
    E.crow = P.map((p) => { const n = navPoint(p); return U.haversine(home.lat, home.lon, n[0], n[1]); });
    const c = U.load(key, null);
    if (c && c.sig === sig && Date.now() - c.t < 14 * 86400000) { E.drive = c.min; E.driveKm = c.km; E.driveSource = 'osrm'; return; }
    E.drive = null; E.driveSource = 'estimate';
    const min = new Array(P.length).fill(null), km = new Array(P.length).fill(null);
    try {
      for (let i = 0; i < P.length; i += 120) {
        const chunk = P.slice(i, i + 120);
        const coords = [home.lon.toFixed(5) + ',' + home.lat.toFixed(5)].concat(chunk.map((p) => { const n = navPoint(p); return n[1].toFixed(5) + ',' + n[0].toFixed(5); }));
        const r = await U.getJSON('https://router.project-osrm.org/table/v1/driving/' + coords.join(';') + '?sources=0&annotations=duration,distance', { timeout: 30000 });
        if (r.code !== 'Ok') throw new Error(r.message || 'routing failed');
        chunk.forEach((p, k) => { const d = r.durations[0][k + 1], m = r.distances[0][k + 1]; if (d != null) { min[p.i] = Math.round(d / 60 * 1.08); km[p.i] = Math.round(m / 100) / 10; } });
        if (i + 120 < P.length) await new Promise((res) => setTimeout(res, 350));
      }
      E.drive = min; E.driveKm = km; E.driveSource = 'osrm';
      U.save(key, { sig: sig, t: Date.now(), min: min, km: km });
    } catch (e) { E.drive = null; E.driveSource = 'estimate'; }
  };
  /* minutes from home to standing at the place: drive to the valley station or village, plus lift, train or walk */
  E.travel = function (p) {
    if (!E.crow) return { total: NaN, drive: NaN, extra: 0, exact: false };
    const d = E.drive && E.drive[p.i] != null ? E.drive[p.i] : crowMinutes(E.crow[p.i]);
    const extra = p.a.length === 3 ? p.a[2] : 0;
    return { total: d + extra, drive: d, extra: extra, exact: !!(E.drive && E.drive[p.i] != null), km: E.driveKm && E.driveKm[p.i] != null ? E.driveKm[p.i] : E.crow[p.i] * 1.38 };
  };
  E.route = async function (home, p) {
    const n = navPoint(p);
    const r = await U.getJSON('https://router.project-osrm.org/route/v1/driving/' + home.lon.toFixed(5) + ',' + home.lat.toFixed(5) + ';' + n[1].toFixed(5) + ',' + n[0].toFixed(5) + '?overview=simplified&geometries=geojson', { timeout: 25000 });
    if (r.code !== 'Ok' || !r.routes.length) throw new Error('No route found.');
    return { line: r.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]), min: Math.round(r.routes[0].duration / 60 * 1.08), km: r.routes[0].distance / 1000 };
  };
  /* Next public-transport connections. If the stop at the place itself has none (a lift that is not running shows up
     like this), the valley station is tried instead and the result says so. Returns {list, to, fallback}. */
  E.connections = async function (home, p, whenMs) {
    const ask = async (to) => {
      const q = ['from=' + encodeURIComponent(home.lat.toFixed(5) + ',' + home.lon.toFixed(5)), 'to=' + encodeURIComponent(to), 'limit=4'];
      if (whenMs) { q.push('date=' + T.iso(whenMs), 'time=' + T.hm(whenMs)); }
      ['from/departure', 'from/station/name', 'to/arrival', 'to/station/name', 'duration', 'transfers', 'products'].forEach((f) => q.push('fields[]=connections/' + f));
      const r = await U.getJSON('https://transport.opendata.ch/v1/connections?' + q.join('&'), { timeout: 25000 });
      return (r.connections || []).map((c) => {
        const m = /(\d+)d(\d+):(\d+)/.exec(c.duration || '');
        return { dep: Date.parse(c.from.departure), arr: Date.parse(c.to.arrival), from: c.from.station && c.from.station.name, to: c.to.station && c.to.station.name, min: m ? +m[1] * 1440 + +m[2] * 60 + +m[3] : null, transfers: c.transfers, products: c.products || [] };
      });
    };
    const first = p.st || p.n;
    let list = await ask(first);
    if (!list.length && p.nav && p.nav[2] && p.nav[2] !== first) {
      list = await ask(p.nav[2]);
      return { list: list, to: p.nav[2], fallback: true, wanted: first };
    }
    return { list: list, to: first, fallback: false };
  };
  E.search = async function (text) {
    const r = await U.getJSON('https://api3.geo.admin.ch/rest/services/api/SearchServer?type=locations&origins=gg25,zipcode,gazetteer&sr=4326&limit=8&searchText=' + encodeURIComponent(text), { timeout: 15000 });
    return (r.results || []).map((x) => ({ label: String(x.attrs.label || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), lat: x.attrs.lat, lon: x.attrs.lon }));
  };

  /* elevation of any point from one Terrarium tile (used for your own location) */
  E.elevationAt = function (lat, lon) {
    return new Promise((resolve) => {
      const z = 12, n = 2 ** z, x = ((lon + 180) / 360) * n, y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = 256;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const d = g.getImageData(Math.min(255, Math.floor((x % 1) * 256)), Math.min(255, Math.floor((y % 1) * 256)), 1, 1).data;
          resolve(Math.round(d[0] * 256 + d[1] + d[2] / 256 - 32768));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/' + z + '/' + Math.floor(x) + '/' + Math.floor(y) + '.png';
    });
  };

  /* ------------------------------------------------------------------ ranking */
  E.isClosedSeason = (p, ms) => p.se === 'summer' && [11, 12, 1, 2, 3, 4].indexOf(T.month(ms)) >= 0;
  /* opts: dayStart, nowMs, maxTravel, altMin, altMax, kinds{}, sort, hideClosed, favOnly, favs{}, reluctance, minSun */
  E.rank = function (opts) {
    const fc = E.fc, out = [];
    if (!fc) return out;
    const today = T.dayStart(opts.nowMs) === opts.dayStart;
    E.places.forEach((p) => {
      if (opts.kinds && !opts.kinds[p.k]) return;
      if (p.e < opts.altMin || p.e > opts.altMax) return;
      if (opts.favOnly && !(opts.favs && opts.favs[p.id])) return;
      const closed = E.isClosedSeason(p, opts.dayStart);
      if (closed && opts.hideClosed) return;
      const tr = E.travel(p);
      if (tr.total === tr.total && tr.total > opts.maxTravel) return;
      const arrive = today ? opts.nowMs + (tr.total === tr.total ? tr.total : 0) * 60000 : null;
      const d = E.day(p.i, opts.dayStart, arrive);
      if (!d.known) return;
      const hNow = E.hour(p.i, E.hourIndex(opts.atMs != null ? opts.atMs : today ? opts.nowMs : opts.dayStart + 12 * 3600000));
      const hours = d.sunMin / 60, tripH = (tr.total === tr.total ? tr.total : 60) / 60;
      const score = hours - (opts.reluctance == null ? 1 : opts.reluctance) * tripH + (d.fogBelowHours ? 0.25 : 0) - (closed ? 3 : 0);
      out.push({ p: p, travel: tr, day: d, sunMin: d.sunMin, now: hNow, score: score, closed: closed });
    });
    const s = opts.sort || 'best';
    out.sort(s === 'sun' ? (a, b) => b.sunMin - a.sunMin || a.travel.total - b.travel.total
      : s === 'near' ? (a, b) => a.travel.total - b.travel.total
        : s === 'high' ? (a, b) => b.p.e - a.p.e
          : s === 'name' ? (a, b) => a.p.n.localeCompare(b.p.n)
            : (a, b) => b.score - a.score);
    return out;
  };

  E.webcamsNear = function (p, maxKm) {
    const out = [];
    E.webcams.forEach((w) => { const d = U.haversine(p.la, p.lo, w.la, w.lo); if (d <= (maxKm || 5)) out.push(Object.assign({ dist: d }, w)); });
    out.sort((a, b) => (b.i ? 1 : 0) - (a.i ? 1 : 0) || a.dist - b.dist);
    return out;
  };
  E.clearCaches = function () { U.drop(FC_KEY); U.drop('ss.drive.v1'); };
})();
