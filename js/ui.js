/* Sonnenseite - interface rendering: fog brief, ranked list, place details, settings. */
(function () {
  'use strict';
  const SS = window.SS, U = SS.util, T = SS.tz, E = SS.engine, Sun = SS.sun;
  const UI = (SS.ui = {});
  const $ = U.$, esc = U.esc;
  const ic = (n) => '<svg class="ic"><use href="#i-' + n + '"/></svg>';
  const KIND = { peak: 'Summit', hill: 'Viewpoint', village: 'Mountain village', pass: 'Pass', town: 'Town' };
  const ACCESS = { cable: 'cable car', funi: 'funicular', cog: 'mountain railway', walk: 'walk' };
  const CONF = { likely: 'Sun likely', maybe: '50/50', unlikely: 'Sun unlikely' };
  const CONF_LONG = { likely: 'Sun likely: the forecast is clear-cut here.', maybe: '50/50: this spot is close to the top of the fog, or the cloud forecast is borderline. Check the webcam before you go.', unlikely: 'Sun unlikely here on this day.' };
  const CAMWORD = { blue: 'blue sky', fog: 'fog or cloud' };
  const flatHz = new Float32Array(180);
  let toastTimer = null;

  UI.toast = function (msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 3200);
  };
  UI.banner = function (msg, label, fn) {
    const b = $('#banner');
    if (!msg) { b.hidden = true; return; }
    b.innerHTML = ic('warn') + '<span>' + esc(msg) + '</span>' + (label ? '<button type="button">' + esc(label) + '</button>' : '');
    b.hidden = false;
    if (label) b.querySelector('button').onclick = fn;
  };

  const stateIcon = (o) => (!o || o.state === 'nodata' ? 'cloud' : o.state === 'night' ? 'moon' : o.state === 'shade' ? 'shade' : o.sun >= 0.4 ? 'sun' : o.leff >= 0.6 ? 'fog' : 'cloud');
  const stateBg = (o) => (!o || o.state === 'nodata' ? '#c9d1d8' : o.state === 'night' ? 'var(--night)' : o.state === 'shade' ? 'var(--shade)' : U.sunColor(o.sun));
  const cell = (o, cur) => {
    const cls = (o.state === 'night' ? 'ni' : o.state === 'shade' ? 'sh' : o.state === 'nodata' ? 'na' : '') + (cur ? ' cur' : '');
    return '<i' + (cls ? ' class="' + cls.trim() + '"' : '') + (cls.indexOf('n') === 0 || cls.indexOf('sh') === 0 ? '' : ' style="background:' + U.sunColor(o.sun) + '"') + '></i>';
  };
  function accessText(p, tr) {
    const drive = (tr.exact ? '' : '~') + U.fmtDur(tr.drive);
    if (p.a.length === 3) return drive + ' + ' + p.a[2] + ' min ' + ACCESS[p.a[0]];
    return drive + (p.a[0] === 'train' ? ' by car' : ' by car');
  }
  /* daylight hours (local) for the strip, from the flat-horizon sunrise and sunset at the starting point */
  function lightRange(dayStart) {
    const h = SS.app.home, w = Sun.dayWindow(flatHz, dayStart, h.lat, h.lon);
    if (w.rise == null) return [7, 18];
    return [Math.max(0, T.hour(w.rise)), Math.min(23, T.hour(w.set - 60000))];
  }

  /* ------------------------------------------------------------------ day chips and hour slider */
  UI.renderWhen = function () {
    const A = SS.app, days = E.days(), now = E.now();
    $('#days').innerHTML = days.map((d) => {
      const est = E.atPoint(A.home.lat, A.home.lon, A.home.ele, E.hourIndex(d + 12 * 3600000));
      const sel = d === A.sel.dayStart;
      return '<button type="button" class="day" role="tab" aria-selected="' + sel + '" data-day="' + d + '"><b>' + esc(T.dayLabel(d + 43200000, now)) + '</b><small>' + esc(T.date(d + 43200000).replace(/^\w+ /, '')) + (est && est.sun === est.sun ? ' · ' + (est.sun >= 0.45 ? 'sun' : est.low >= 0.6 ? 'fog' : 'cloud') : '') + '</small></button>';
    }).join('');
    const hr = $('#hour');
    hr.value = String(T.hour(A.sel.atMs));
    $('#hour-label').textContent = T.hm(A.sel.atMs);
    $('#home-name').textContent = A.home.name;
  };

  /* ------------------------------------------------------------------ fog brief */
  function ladderSvg(rows, prof, dayStart) {
    const A = SS.app, W = 400, H = 196, x0 = 44, x1 = 392, y0 = 14, y1 = 164;
    const maxT = Math.min(A.state.maxTravel, 240);
    const pts = rows.filter((r) => r.travel.total === r.travel.total && r.travel.total <= maxT);
    let zMax = 1500;
    pts.forEach((r) => { if (r.p.e > zMax) zMax = r.p.e; });
    zMax = Math.min(3400, Math.ceil((zMax + 100) / 500) * 500);
    const zMin = Math.floor(Math.min(A.home.ele, 400) / 100) * 100 - 100;
    const X = (m) => x0 + (m / maxT) * (x1 - x0), Y = (z) => y1 - ((U.clamp(z, zMin, zMax) - zMin) / (zMax - zMin)) * (y1 - y0);
    let fogLabel = '';
    let s = '<svg class="ladder" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Places by travel time and altitude, with the fog layer">';
    s += '<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fog)" stop-opacity=".75"/><stop offset="1" stop-color="var(--fog)" stop-opacity=".32"/></linearGradient></defs>';
    s += '<rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="var(--surface-2)" rx="4"/>';
    if (prof.state === 'fog') {
      s += '<rect x="' + x0 + '" y="' + Y(prof.top) + '" width="' + (x1 - x0) + '" height="' + (y1 - Y(prof.top)) + '" fill="url(#fg)"/>';
      s += '<rect x="' + x0 + '" y="' + Y(prof.hi) + '" width="' + (x1 - x0) + '" height="' + Math.max(1, Y(prof.lo) - Y(prof.hi)) + '" fill="var(--fog)" opacity=".28"/>';
      fogLabel = '<text x="' + (x0 + 6) + '" y="' + (Y(prof.hi) - 5) + '" class="lbl">fog top ' + esc(U.fmtAltRound(prof.lo)) + ' to ' + esc(U.fmtAltRound(prof.hi)) + '</text>';
    } else if (prof.state === 'deck') {
      s += '<rect x="' + x0 + '" y="' + Y(Math.min(zMax, prof.lo + 150)) + '" width="' + (x1 - x0) + '" height="' + (y1 - Y(Math.min(zMax, prof.lo + 150))) + '" fill="url(#fg)"/>';
    }
    for (let z = Math.ceil((zMin + 1) / 500) * 500; z <= zMax; z += 500) s += '<line class="axis" x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(z) + '" y2="' + Y(z) + '" stroke-dasharray="2 4"/><text x="' + (x0 - 5) + '" y="' + (Y(z) + 3.5) + '" text-anchor="end">' + esc(U.units() === 'imperial' ? Math.round(z * 3.28084 / 100) * 100 : z) + '</text>';
    const stepT = maxT > 150 ? 60 : 30;
    for (let m = stepT; m <= maxT; m += stepT) s += '<text x="' + X(m) + '" y="' + (y1 + 13) + '" text-anchor="' + (m + stepT > maxT && X(m) > x1 - 22 ? 'end' : 'middle') + '">' + (m % 60 === 0 ? m / 60 + ' h' : m + ' min') + '</text>';
    s += '<text x="' + x0 + '" y="' + (H - 4) + '">Travel time from ' + esc(A.home.name) + ' →</text><text x="' + x0 + '" y="' + (y0 - 4) + '">' + (U.units() === 'imperial' ? 'ft' : 'm') + '</text>';
    /* points: low sun first so sunny dots end up on top */
    const order = pts.slice().sort((a, b) => (a.now ? a.now.sun || 0 : 0) - (b.now ? b.now.sun || 0 : 0));
    order.forEach((r) => {
      s += '<circle class="pt" data-id="' + r.p.id + '" cx="' + X(r.travel.total).toFixed(1) + '" cy="' + Y(r.p.e).toFixed(1) + '" r="' + (r.p.k === 'town' ? 3.4 : 4.6) + '" fill="' + stateBg(r.now) + '" stroke="var(--surface)" stroke-width="1.2"><title>' + esc(r.p.n + ' · ' + U.fmtAlt(r.p.e)) + '</title></circle>';
    });
    /* label the best few without overlaps */
    const placed = [];
    rows.slice(0, 40).forEach((r) => {
      if (placed.length >= 6 || !(r.travel.total <= maxT) || !r.now || !(r.sunMin >= 45)) return;
      const cx = X(r.travel.total), cy = Y(r.p.e), w = r.p.n.length * 5.6 + 8, right = cx + 8 + w < x1;
      const bx = right ? cx + 7 : cx - 7 - w, by = cy - 6;
      if (placed.some((b) => bx < b[0] + b[2] && bx + w > b[0] && by < b[1] + 13 && by + 13 > b[1])) return;
      placed.push([bx, by, w]);
      s += '<text class="lbl pt" data-id="' + r.p.id + '" x="' + (right ? cx + 8 : cx - 8) + '" y="' + (cy + 3.5) + '"' + (right ? '' : ' text-anchor="end"') + '>' + esc(r.p.n) + '</text>';
    });
    s += fogLabel + '<path d="M' + (x0 - 1) + ' ' + Y(A.home.ele) + 'l-9 -5v10z" fill="var(--sky)"><title>Your starting point</title></path>';
    return s + '</svg>';
  }

  UI.renderBrief = function () {
    const A = SS.app, box = $('#brief');
    if (!E.fc) { box.innerHTML = '<div class="brief-head"><div class="eyebrow">Loading forecast</div><h2>Looking for the sun…</h2><p>Fetching the forecast for ' + E.places.length + ' places and the latest MeteoSwiss measurements.</p></div>'; return; }
    const h = E.hourIndex(A.sel.atMs), prof = E.profile(A.home.lat, A.home.lon, h), est = E.atPoint(A.home.lat, A.home.lon, A.home.ele, h);
    const now = E.now(), today = T.dayStart(now) === A.sel.dayStart, live = today && !E.fc.archive && Math.abs(A.sel.atMs - now) < 5400000;
    const when = (today ? '' : T.dayLabel(A.sel.dayStart + 43200000, now) + ' ') + T.hm(A.sel.atMs);
    let head, sub;
    const under = prof.state === 'fog' && A.home.ele < prof.top;
    if (prof.state === 'fog') {
      head = 'Fog up to about ' + U.fmtAltRound(prof.top);
      sub = 'Around <b>' + esc(A.home.name) + '</b> at ' + when + ' the low cloud ends between ' + U.fmtAltRound(prof.lo) + ' and ' + U.fmtAltRound(prof.hi) + '. ' + (under ? 'You are under it; above that line the sky is open.' : 'You are above it.');
    } else if (prof.state === 'deck') {
      head = 'Low cloud at every height';
      sub = 'Around <b>' + esc(A.home.name) + '</b> at ' + when + ' there is no clear layer up to ' + U.fmtAltRound(prof.lo) + '. Going up will not help nearby; look further away.';
    } else if (prof.state === 'patchy') {
      head = 'Patchy low cloud';
      sub = 'Around <b>' + esc(A.home.name) + '</b> at ' + when + ' the low cloud is broken. Sun and grey take turns.';
    } else if (prof.state === 'clear') {
      head = est && est.up ? (est.sun >= 0.5 ? 'No fog. The sun is out' : 'No fog, but cloud higher up') : 'No fog tonight';
      sub = 'Around <b>' + esc(A.home.name) + '</b> at ' + when + (est && est.up ? ' the lowlands are free of low cloud.' : ' the air is clear below the cloud line.');
    } else { head = 'No forecast for this hour'; sub = 'Pick another hour or day.'; }
    let measured = '';
    if (live && E.obs) {
      const op = E.obsProfile(A.home.lat, A.home.lon), t = T.hm(op.ts || E.obs.ts);
      if (op.state === 'fog') measured = 'Measured ' + t + ': sunshine from ' + U.fmtAlt(op.hi) + ' (' + esc(op.hiName) + '), grey up to ' + U.fmtAlt(op.lo) + ' (' + esc(op.loName) + ').';
      else if (op.state === 'deck') measured = 'Measured ' + t + ': no sunshine at any station nearby, up to ' + U.fmtAlt(op.lo) + ' (' + esc(op.loName) + ').';
      else if (op.state === 'clear') measured = 'Measured ' + t + ': the stations around you report sunshine.';
      else if (op.state === 'patchy') measured = 'Measured ' + t + ': sun and cloud mixed at the low stations.';
    }
    const rows = A.ranked || [];
    const best = rows.find((r) => !r.closed && !r.liftClosed && r.day.conf !== 'unlikely' && r.sunMin >= (today ? 45 : 90));
    let bb = '';
    if (best) {
      const tr = best.travel;
      bb = '<button type="button" class="bestbet" data-id="' + best.p.id + '">' + ic('sun') + '<span><b>' + esc(best.p.n) + ' · ' + U.fmtAlt(best.p.e) + '</b><small>' + (tr.total === tr.total ? U.fmtDur(tr.total) + ' away · ' : '') + U.fmtSunHours(best.sunMin) + ' of sun' + (today ? ' after you arrive' : '') + (best.day.fogBelowHours ? ' · above the fog' : '') + '</small></span><span class="go">Details</span></button>';
    } else if (rows.length) {
      bb = '<div class="bestbet">' + ic('cloud') + '<span><b>No real sunshine within reach ' + (today ? 'for the rest of today' : 'that day') + '</b><small>Try another day, or raise the travel limit in Filters.</small></span></div>';
    }
    const T1 = A.tomorrow;
    const tm = T1 && today ? '<button type="button" class="tomorrow" data-day="' + T1.dayStart + '">' + ic('sun') + '<span><b>Tomorrow: ' + esc(T1.p.n) + '</b><small>' + CONF[T1.conf] + ' · about ' + U.fmtSunHours(T1.sunMin) + ' of sun' + (T1.total === T1.total ? ' · ' + U.fmtDur(T1.total) + ' away' : '') + '</small></span><span class="go">Show</span></button>' : '';
    box.innerHTML = '<div class="brief-head"><div class="eyebrow">' + (E.fc.archive ? 'Replay of ' + esc(T.dateLong(A.sel.atMs)) : live ? 'Right now' : 'Forecast') + ' · ' + esc(A.home.name) + ' ' + U.fmtAlt(A.home.ele) + '</div><h2>' + esc(head) + '</h2><p>' + sub + '</p>'
      + (measured ? '<p class="measured"><span class="dot"></span><span>' + measured + '</span></p>' : '') + '</div>' + ladderSvg(rows, prof, A.sel.dayStart) + bb + tm;
  };

  /* ------------------------------------------------------------------ list */
  UI.renderList = function () {
    const A = SS.app, ol = $('#results');
    if (!E.fc) { ol.innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>'; return; }
    const rows = A.ranked || [], now = E.now(), today = T.dayStart(now) === A.sel.dayStart;
    const [ha, hb] = lightRange(A.sel.dayStart), curH = T.hour(A.sel.atMs);
    $('#list-title').textContent = today ? 'Where the sun is today' : 'Where the sun is ' + (T.dayLabel(A.sel.dayStart + 43200000, now) === 'Tomorrow' ? 'tomorrow' : 'on ' + T.date(A.sel.dayStart + 43200000));
    if (!rows.length) { ol.innerHTML = '<li class="empty">No places match your filters. Open Filters and widen the travel time or altitude range.</li>'; return; }
    const shown = rows.slice(0, A.listLimit || 40);
    ol.innerHTML = shown.map((r) => {
      const p = r.p, o = r.now, tags = [];
      tags.push('<span class="tag t-conf t-' + r.day.conf + '">' + CONF[r.day.conf] + '</span>');
      if (r.day.fogBelowHours) tags.push('<span class="tag t-above">' + ic('sun') + 'Above the fog</span>');
      if (p.a.length === 3) tags.push('<span class="tag">' + ic(p.a[0] === 'walk' ? 'walk' : p.a[0] === 'cable' ? 'cable' : 'train') + p.a[2] + ' min ' + ACCESS[p.a[0]] + '</span>');
      if (r.closed) tags.push('<span class="tag t-warn">' + ic('warn') + 'Usually closed in winter</span>');
      if (r.liftClosed) tags.push('<span class="tag t-warn">' + ic('warn') + 'No lift departures in the timetable</span>');
      else if (r.lift && r.lift.n > 0 && r.lift.last) tags.push('<span class="tag t-meas">' + ic('cable') + 'Lift running, last ' + T.hm(r.lift.last) + '</span>');
      const cr = today ? E.camResult(E.bestCam(p)) : null;
      if (cr && cr.ts && Date.now() - cr.ts < 50 * 60000 && CAMWORD[cr.state]) tags.push('<span class="tag t-cam-' + cr.state + '">' + ic('cam') + 'Webcam ' + T.hm(cr.ts) + ': ' + CAMWORD[cr.state] + '</span>');
      if (today && E.obs && !E.fc.archive) { const s = E.nearestStation(p.la, p.lo, p.e, 6, 150); if (s && s.canSee && s.sun >= 7) tags.push('<span class="tag t-meas">Measured sunny nearby</span>'); }
      if (A.state.favs[p.id]) tags.push('<span class="tag">' + ic('star') + 'Saved</span>');
      let strip = '';
      for (let k = ha; k <= hb; k++) strip += cell(r.day.hours[k], k === curH);
      return '<li><button type="button" class="row' + (r.closed || r.liftClosed ? ' closed' : '') + '" data-id="' + p.id + '">'
        + '<span class="badge-sun" style="background:' + stateBg(o) + '">' + ic(stateIcon(o)) + '</span>'
        + '<span class="row-main"><b>' + esc(p.n) + '</b><small>' + U.fmtAlt(p.e) + ' · ' + esc(p.c) + (r.travel.total === r.travel.total ? ' · ' + (r.travel.exact ? '' : '~') + U.fmtDur(r.travel.total) + (r.travel.mode === 'train' ? ' by train' : '') : '') + '</small></span>'
        + '<span class="row-sun"><b class="num">' + U.fmtSunHours(r.sunMin) + '</b><small>' + (today ? 'sun left' : 'of sun') + '</small></span>'
        + '<span class="strip" title="Hour by hour, ' + ha + ':00 to ' + (hb + 1) + ':00">' + strip + '</span>'
        + (tags.length ? '<span class="tags">' + tags.join('') + '</span>' : '') + '</button></li>';
    }).join('') + (rows.length > shown.length ? '<li><button type="button" class="btn block" id="more">Show ' + Math.min(40, rows.length - shown.length) + ' more places</button></li>' : '');
  };

  UI.renderLegend = function () {
    $('#legend').innerHTML = '<b>Sunshine at ' + esc(T.hm(SS.app.sel.atMs)) + '</b><div class="bar" style="background:linear-gradient(90deg,' + [0, 0.18, 0.36, 0.54, 0.72, 0.9].map(U.sunColor).join(',') + ')"></div><div class="ends"><span>none</span><span>full sun</span></div>';
  };
  UI.renderCredits = function () {
    const fc = E.fc;
    $('#credits').innerHTML = (fc ? 'Forecast: ' + esc((E.MODELS.find((m) => m.id === fc.model) || {}).name || fc.model) + ' via Open-Meteo, loaded ' + T.hm(fc.fetched) + (fc.stale ? ' (could not refresh)' : '') + '. ' : '')
      + (E.obs ? 'Measurements: MeteoSwiss, ' + T.hm(E.obs.ts) + '. ' : '') + 'Travel times: ' + (E.driveSource === 'osrm' ? 'OSRM road routing' : 'estimated from distance') + '. Sunshine is an estimate, not a promise: check the webcam before you leave.';
  };

  /* ------------------------------------------------------------------ place sheet */
  function sunPathSvg(p, dayStart) {
    const W = 400, H = 210, x0 = 8, x1 = 392, y0 = 10, y1 = 178, A0 = 45, A1 = 315, EMAX = 68;
    const X = (az) => x0 + ((az - A0) / (A1 - A0)) * (x1 - x0), Y = (alt) => y1 - (U.clamp(alt, -2, EMAX) / EMAX) * (y1 - y0);
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sun path over the terrain horizon"><rect x="' + x0 + '" y="' + y0 + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" fill="var(--surface-2)" rx="4"/>';
    for (let a = 15; a <= 60; a += 15) s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(a) + '" y2="' + Y(a) + '" stroke="var(--line)" stroke-dasharray="2 4"/><text x="' + (x0 + 3) + '" y="' + (Y(a) - 2) + '">' + a + '°</text>';
    const seasonal = (m, d, col) => {
      const y = T.parts(dayStart).y, ds = T.dayStart(Date.UTC(y, m - 1, d, 12));
      const tr = Sun.track(ds, p.la, p.lo, 15).filter((q) => q.az >= A0 && q.az <= A1);
      return tr.length ? '<polyline fill="none" stroke="' + col + '" stroke-width="1" stroke-dasharray="3 3" points="' + tr.map((q) => X(q.az).toFixed(1) + ',' + Y(q.alt).toFixed(1)).join(' ') + '"/>' : '';
    };
    s += seasonal(6, 21, 'var(--muted)') + seasonal(12, 21, 'var(--muted)');
    const tr = Sun.track(dayStart, p.la, p.lo, 5).filter((q) => q.az >= A0 && q.az <= A1);
    let seg = [], vis = null;
    const flush = () => { if (seg.length > 1) s += '<polyline fill="none" stroke="' + (vis ? 'var(--sun)' : 'var(--shade)') + '" stroke-width="' + (vis ? 3.2 : 1.8) + '" stroke-linecap="round" points="' + seg.join(' ') + '"/>'; };
    tr.forEach((q) => {
      const v = q.alt > Math.max(Sun.horizonAt(p.hzArr, q.az), 0), pt = X(q.az).toFixed(1) + ',' + Y(q.alt).toFixed(1);
      if (vis !== null && v !== vis) { seg.push(pt); flush(); seg = []; }
      vis = v; seg.push(pt);
    });
    flush();
    let poly = 'M' + x0 + ' ' + y1;
    for (let az = A0; az <= A1; az += 2) poly += 'L' + X(az).toFixed(1) + ' ' + Y(Math.max(0, Sun.horizonAt(p.hzArr, az))).toFixed(1);
    s += '<path d="' + poly + 'L' + x1 + ' ' + y1 + 'Z" fill="var(--ink)" opacity=".78"/>';
    tr.forEach((q) => {
      const pp = T.parts(q.ms);
      if (pp.min === 0 && pp.h % 2 === 0 && q.alt > 1) s += '<circle cx="' + X(q.az).toFixed(1) + '" cy="' + Y(q.alt).toFixed(1) + '" r="2.6" fill="var(--surface)" stroke="var(--sun-ink)" stroke-width="1.2"/><text x="' + X(q.az).toFixed(1) + '" y="' + (Y(q.alt) - 6).toFixed(1) + '" text-anchor="middle">' + pp.h + '</text>';
    });
    const now = E.now();
    if (T.dayStart(now) === dayStart) { const q = Sun.position(now, p.la, p.lo); if (q.alt > 0 && q.az >= A0 && q.az <= A1) s += '<circle cx="' + X(q.az).toFixed(1) + '" cy="' + Y(q.alt).toFixed(1) + '" r="6" fill="var(--sun)" stroke="var(--surface)" stroke-width="2"/>'; }
    [['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270]].forEach((c) => { s += '<text x="' + X(c[1]) + '" y="' + (y1 + 14) + '" text-anchor="middle">' + c[0] + '</text>'; });
    s += '<text x="' + x1 + '" y="' + (H - 3) + '" text-anchor="end">dashed: 21 June and 21 December</text>';
    return s + '</svg>';
  }

  UI.openPlace = function (id) {
    const A = SS.app, p = E.byId[id], sh = $('#sheet');
    if (!p) return;
    A.selPlace = id;
    const dayStart = A.sel.dayStart, now = E.now(), today = T.dayStart(now) === dayStart;
    const tr = E.travel(p, dayStart), d = E.day(p.i, dayStart, null), o = E.hour(p.i, E.hourIndex(A.sel.atMs)) || { state: 'nodata' };
    const closed = E.isClosedSeason(p, dayStart), curH = T.hour(A.sel.atMs), fav = !!A.state.favs[p.id];
    const win = d.window, nav = p.nav || [p.la, p.lo, p.n];
    let h = '<div class="sheet-bar"><button type="button" class="iconbtn" data-act="close" aria-label="Back to the list">' + ic('back') + '</button><h2>' + esc(p.n) + '</h2>'
      + '<button type="button" class="iconbtn" data-act="fav" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove from saved places' : 'Save this place') + '">' + ic(fav ? 'star' : 'star-o') + '</button></div><div class="sheet-body">';
    /* hero */
    h += '<div class="card"><div class="hero"><span class="badge-sun" style="background:' + stateBg(o) + '">' + ic(stateIcon(o)) + '</span><div><h2>' + esc(p.n) + '</h2><div class="sub">' + U.fmtAlt(p.e) + ' · ' + KIND[p.k] + ' · ' + esc(p.c) + ' · ' + esc(p.r) + '</div></div>'
      + '<div class="now"><b>' + esc(o.why || '') + '</b> <span class="muted">at ' + (today ? '' : T.dayLabel(dayStart + 43200000, now) + ' ') + T.hm(A.sel.atMs) + (o.sun === o.sun && o.state !== 'night' ? ' · about ' + Math.round(o.sun * 60) + ' min of sun in this hour' : '') + '</span></div><div class="confline c-' + d.conf + '">' + CONF_LONG[d.conf] + (o.meas === o.meas ? ' Includes sunshine measured nearby in the last 10 minutes.' : '') + '</div></div>';
    h += '<div class="facts"><div class="fact"><small>Sun ' + (today ? 'today' : 'that day') + '</small><b>' + U.fmtSunHours(d.sunAll) + '</b></div>'
      + '<div class="fact"><small>Sunny from</small><b>' + (d.first != null ? T.hm(d.first) + '–' + T.hm(d.last) : 'not expected') + '</b></div>'
      + '<div class="fact"><small>Terrain lets sun in</small><b>' + (win.first != null ? T.hm(win.first) + '–' + T.hm(win.last) : 'not at all') + '</b></div>'
      + '<div class="fact"><small>Temperature</small><b>' + (d.tMin === d.tMin ? U.fmtTemp(d.tMin) + ' to ' + U.fmtTemp(d.tMax) : '–') + '</b></div>'
      + '<div class="fact"><small>Strongest gusts</small><b>' + U.fmtWind(d.gust) + '</b></div>'
      + (o.snow === o.snow && o.snow > 0.02 ? '<div class="fact"><small>Snow depth</small><b>' + (U.units() === 'imperial' ? Math.round(o.snow * 39.37) + ' in' : Math.round(o.snow * 100) + ' cm') + '</b></div>' : '') + '</div></div>';
    if (closed) h += '<div class="note warn">' + ic('warn') + '<span>The lift or road to ' + esc(p.n) + ' is usually closed in winter. Check the operator before you go.</span></div>';
    if (E.needsLift(p) && !E.fc.archive) {
      const lf = E.liftFor(p, dayStart), dd = esc(T.date(dayStart + 43200000));
      if (lf && lf.n === 0) h += '<div class="note warn">' + ic('warn') + '<span>The timetable shows no departures from ' + esc(p.st) + ' on ' + dd + '. The lift is probably not running, for example during its annual maintenance. Check with the operator.</span></div>';
      else if (lf && lf.n > 0) h += '<div class="note">' + ic('cable') + '<span>Lift running: ' + lf.n + ' departures from ' + esc(p.st) + ' in the timetable on ' + dd + ', the last at <b>' + T.hm(lf.last) + '</b>.</span></div>';
      else if (!lf) h += '<div class="note">' + ic('cable') + '<span>Checking the lift timetable…</span></div>';
    }
    if (d.hours.some((x) => x.lifted && x.up > 0)) h += '<div class="note">' + ic('fog') + '<span>This spot is close to the top of the fog. The weather model places it inside the fog, but ground at this height nearby is forecast clear, so it is shown as sunny. A look at the webcam settles it.</span></div>';
    if (p.t) h += '<div class="note">' + ic('pin') + '<span>' + esc(p.t) + '</span></div>';
    /* hours */
    h += '<div class="card"><h3>Hour by hour <small>' + esc(T.date(dayStart + 43200000)) + '</small></h3><div class="hours">' + d.hours.map((x, k) => cell(x, k === curH)).join('') + '</div>'
      + '<div class="hourscale">' + [0, 3, 6, 9, 12, 15, 18, 21].map((x) => '<span>' + x + '</span>').join('') + '</div>'
      + '<div class="temps">' + [0, 3, 6, 9, 12, 15, 18, 21].map((x) => '<span>' + U.fmtTemp(d.hours[x].temp) + '</span>').join('') + '</div>'
      + '<div class="key"><span><i style="background:' + U.sunColor(0.9) + '"></i>sun</span><span><i style="background:' + U.sunColor(0.35) + '"></i>some sun</span><span><i style="background:' + U.sunColor(0) + '"></i>cloud or fog</span><span><i class="sh"></i>sun behind mountains</span><span><i class="ni"></i>night</span></div></div>';
    /* next days */
    const [ha, hb] = lightRange(dayStart);
    h += '<div class="card"><h3>Coming days</h3><div class="daysmini">' + E.days().map((ds) => {
      const dd = E.day(p.i, ds, null); let st = '';
      for (let k = ha; k <= hb; k++) st += cell(dd.hours[k], false);
      return '<button type="button" class="daymini" data-day="' + ds + '"><span>' + esc(T.dayLabel(ds + 43200000, now)) + '</span><span class="strip">' + st + '</span><b>' + (dd.known ? U.fmtSunHours(dd.sunAll) : '–') + '</b></button>';
    }).join('') + '</div></div>';
    /* webcams */
    const cams = E.webcamsNear(p, 6).slice(0, 6);
    h += '<div class="card"><h3>' + ic('cam') + 'Webcams <small>' + (cams.length ? 'within 6 km' : '') + '</small></h3>';
    if (cams.length) {
      h += '<div class="cams">' + cams.map((w, k) => {
        const res = E.camResult(w), badge = res && res.ts && CAMWORD[res.state] ? '<span class="cambadge c-' + res.state + '">' + (res.state === 'blue' ? 'Blue sky' : 'Fog or cloud') + ' · ' + T.hm(res.ts) + '</span>' : '';
        const inner = '<span class="camimg">' + (w.i ? '<img src="' + esc(w.i) + '" alt="Latest image: ' + esc(w.n) + '" loading="lazy" referrerpolicy="no-referrer">' : '<span class="ph">' + ic('cam') + '</span>') + badge + '</span><b>' + esc(w.n) + '</b><small>' + U.fmtAlt(w.e) + ' · ' + U.fmtDist(w.dist) + ' away</small>';
        return w.f ? '<button type="button" class="cam" data-cam="' + k + '">' + inner + '</button>' : '<a class="cam" href="' + esc(w.u) + '" target="_blank" rel="noopener">' + inner + '</a>';
      }).join('') + '</div>' + (cams.some((w) => w.p === 'roundshot' && w.i) ? '<p class="muted small" style="margin:8px 0 0">Labels on the pictures come from an automatic check of the latest image: <b>Blue sky</b> or <b>Fog or cloud</b>. When the check cannot tell, there is no label.</p>' : '') + '<div id="camview"></div>';
    } else h += '<p class="muted small">No webcam in the built-in directory near this place.</p>';
    h += '<div class="btns" style="margin-top:10px"><a class="btn" href="https://www.google.com/search?q=' + encodeURIComponent('webcam ' + p.n) + '" target="_blank" rel="noopener">' + ic('ext') + 'Search more webcams</a></div></div>';
    /* getting there */
    const origin = A.home.gps ? '' : '&origin=' + A.home.lat.toFixed(5) + ',' + A.home.lon.toFixed(5);
    const lv = U.wgsToLv95(p.la, p.lo);
    h += '<div class="card"><h3>' + ic('go') + 'Getting there <small>from ' + esc(A.home.name) + '</small></h3>'
      + '<p style="margin:0 0 9px"><b>' + (tr.total === tr.total ? U.fmtDur(tr.total) : '–') + '</b> ' + (tr.exact ? '' : '(estimate) ')
      + (p.a.length === 3 ? 'in total: ' + accessText(p, tr).replace(' + ', ' by car to ' + esc(nav[2]) + ', then ') : 'by car') + (tr.km ? ' · ' + U.fmtDist(tr.km) : '') + '.</p>'
      + '<div class="btns"><a class="btn primary" href="https://www.google.com/maps/dir/?api=1' + origin + '&destination=' + nav[0] + ',' + nav[1] + '&travelmode=driving" target="_blank" rel="noopener">' + ic('car') + 'Navigate</a>'
      + '<a class="btn" href="https://maps.apple.com/?daddr=' + nav[0] + ',' + nav[1] + '&dirflg=d" target="_blank" rel="noopener">Apple Maps</a>'
      + '<button type="button" class="btn" data-act="route">' + ic('map') + 'Route on map</button></div>'
      + '<p class="muted small" style="margin:12px 0 7px">' + (p.st ? 'Public transport stop: <b style="color:var(--ink)">' + esc(p.st) + '</b>' + (p.sd > 150 ? ' (' + p.sd + ' m away)' : '') : 'No public transport stop next to this place.') + '</p>'
      + '<div class="btns">' + (p.st ? '<button type="button" class="btn" data-act="conn">' + ic('train') + 'Next connections</button><a class="btn" href="https://www.sbb.ch/en?nach=' + encodeURIComponent(p.st) + '" target="_blank" rel="noopener">SBB timetable</a>' : '')
      + '<a class="btn" href="https://www.google.com/maps/dir/?api=1' + origin + '&destination=' + p.la + ',' + p.lo + '&travelmode=transit" target="_blank" rel="noopener">Transit in Google Maps</a>'
      + '<a class="btn" href="https://map.geo.admin.ch/?lang=en&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&E=' + lv[0] + '&N=' + lv[1] + '&zoom=7&crosshair=marker" target="_blank" rel="noopener">Hiking map</a></div><div id="conns"></div></div>';
    /* sun path */
    h += '<div class="card"><h3>' + ic('shade') + 'Sun and mountains <small>' + esc(T.date(dayStart + 43200000)) + '</small></h3>' + sunPathSvg(p, dayStart)
      + '<p class="muted small" style="margin:8px 0 0">The dark shape is the skyline seen from ' + esc(p.n) + '. The sun shines here only while its path runs above it' + (win.first != null ? ': on this day from ' + T.hm(win.first) + ' to ' + T.hm(win.last) + ', ' + U.fmtDur(win.minutes) + ' at most.' : '. On this day it never clears the skyline.') + '</p></div>';
    /* measured nearby */
    if (E.obs && !E.fc.archive) {
      const s = E.nearestStation(p.la, p.lo, p.e, 15, 400);
      if (s) h += '<div class="card"><h3>Measured nearby <small>' + T.hm(s.ts || E.obs.ts) + '</small></h3><p style="margin:0">' + esc(s.n) + ' (' + U.fmtAlt(s.e) + ', ' + U.fmtDist(s.dist) + ' away): '
        + (s.sun == null ? '' : s.canSee ? '<b>' + Math.round(s.sun) + ' of the last 10 minutes sunny</b>' : 'the sun is not visible from the station right now') + (s.t != null ? ', ' + U.fmtTemp(s.t) : '') + (s.rh != null ? ', ' + Math.round(s.rh) + '% humidity' : '') + '.</p></div>';
    }
    sh.innerHTML = h + '</div>';
    sh.hidden = false; sh.scrollTop = 0;
    sh._cams = cams;
  };
  UI.closeSheet = function () { $('#sheet').hidden = true; SS.app.selPlace = null; };

  UI.showCam = function (w) {
    const v = $('#camview');
    if (!v) return;
    v.innerHTML = '<div class="camview"><iframe src="' + esc(w.u) + '" title="Live webcam ' + esc(w.n) + '" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe><div class="bar"><b>' + esc(w.n) + '</b><a href="' + esc(w.u) + '" target="_blank" rel="noopener">Open in a new tab</a></div></div>';
    v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  UI.showConnections = function (res, err) {
    const c = $('#conns');
    if (!c) return;
    const msg = (t) => '<p class="muted small" style="margin:10px 0 0">' + t + '</p>';
    if (err) { c.innerHTML = msg('Could not load connections: ' + esc(err)); return; }
    if (!res) { c.innerHTML = msg('Loading the next connections…'); return; }
    const list = res.list || [];
    if (!list.length) { c.innerHTML = msg('The timetable shows no connection to ' + esc(res.to) + ' right now.' + (res.fallback ? ' The lift may not be running.' : '')); return; }
    c.innerHTML = (res.fallback ? '<div class="note warn" style="margin-top:10px">' + ic('warn') + '<span>No timetable connection to ' + esc(res.wanted) + ' itself right now, so the lift may not be running. These go to the valley station, ' + esc(res.to) + '.</span></div>' : '')
      + '<div style="margin-top:10px">' + list.map((x) => '<div class="conn"><b>' + T.hm(x.dep) + '</b><span>→ ' + T.hm(x.arr) + '</span><span>' + (x.min != null ? U.fmtDur(x.min) : '') + '</span><small>' + esc(x.from || '') + ' → ' + esc(x.to || '') + ' · ' + (x.transfers ? x.transfers + (x.transfers === 1 ? ' change' : ' changes') : 'direct') + (x.products.length ? ' · ' + esc(x.products.slice(0, 4).join(', ')) : '') + '</small></div>').join('') + '</div>';
  };

  /* ------------------------------------------------------------------ settings sheet */
  UI.openSettings = function () {
    const A = SS.app, s = A.state, sh = $('#settings'), fc = E.fc;
    const kinds = [['peak', 'Summits'], ['hill', 'Viewpoints'], ['village', 'Mountain villages'], ['pass', 'Passes'], ['town', 'Towns']];
    const quick = ['Zürich', 'Rapperswil', 'Wädenswil', 'Winterthur', 'Zug', 'Luzern', 'Bern', 'Basel', 'St. Gallen'];
    sh.innerHTML = '<div class="sheet-bar"><button type="button" class="iconbtn" data-act="close" aria-label="Close settings">' + ic('back') + '</button><h2>Settings and filters</h2></div><div class="sheet-body">'
      + '<div class="card"><h3>' + ic('pin') + 'Starting point</h3><p class="muted small" style="margin:0 0 10px">Now: <b style="color:var(--ink)">' + esc(A.home.name) + '</b>, ' + U.fmtAlt(A.home.ele) + '. Travel times and the fog brief are worked out from here.</p>'
      + '<div class="field"><button type="button" class="btn primary block" data-act="gps">' + ic('locate') + 'Use my position (GPS)</button></div>'
      + '<div class="field"><label for="q">Search a place in Switzerland</label><input id="q" type="text" placeholder="Town, village or postcode" autocomplete="off"><div id="qres"></div></div>'
      + '<div class="field"><span class="lbl">Quick picks</span><div class="btns">' + quick.map((n) => '<button type="button" class="chip" data-home="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div></div></div>'
      + '<div class="card"><h3>' + ic('car') + 'Trip</h3>'
      + '<div class="field"><label for="s-mode">How you travel</label><select id="s-mode"><option value="car"' + (s.mode !== 'train' ? ' selected' : '') + '>By car</option><option value="train"' + (s.mode === 'train' ? ' selected' : '') + '>By public transport</option></select><small>By public transport, the best-placed spots get real times from the Swiss timetable; the rest are estimates until checked.</small></div>'
      + '<div class="field"><div class="rangehead"><label for="s-travel">Longest trip, one way</label><output id="o-travel">' + U.fmtDur(s.maxTravel) + '</output></div><input id="s-travel" type="range" min="30" max="300" step="15" value="' + s.maxTravel + '"></div>'
      + '<div class="field"><div class="rangehead"><label for="s-rel">Prefer closer places</label><output id="o-rel">' + (s.reluctance <= 0.3 ? 'sun matters most' : s.reluctance >= 1.5 ? 'strongly' : 'balanced') + '</output></div><input id="s-rel" type="range" min="0" max="2" step="0.1" value="' + s.reluctance + '"><small>Used by the "Best trip" order: each extra hour on the road has to earn this many extra hours of sun.</small></div></div>'
      + '<div class="card"><h3>' + ic('peak') + 'Places</h3>'
      + '<div class="field"><div class="rangehead"><label for="s-amin">Lowest altitude</label><output id="o-amin">' + U.fmtAlt(s.altMin) + '</output></div><input id="s-amin" type="range" min="0" max="3000" step="50" value="' + s.altMin + '"></div>'
      + '<div class="field"><div class="rangehead"><label for="s-amax">Highest altitude</label><output id="o-amax">' + U.fmtAlt(s.altMax) + '</output></div><input id="s-amax" type="range" min="500" max="4000" step="50" value="' + s.altMax + '"><small>Useful if you do not want to go high: thin air, cold, or a lift you would rather skip.</small></div>'
      + '<div class="field"><span class="lbl">Kinds of place</span><div class="kinds">' + kinds.map((k) => '<label><input type="checkbox" data-kind="' + k[0] + '"' + (s.kinds[k[0]] ? ' checked' : '') + '>' + k[1] + '</label>').join('') + '</div></div>'
      + '<label class="check"><input type="checkbox" id="s-closed"' + (s.hideClosed ? ' checked' : '') + '> Hide places whose lift or road is usually closed in winter</label>'
      + '<label class="check" style="margin-top:8px"><input type="checkbox" id="s-fav"' + (s.favOnly ? ' checked' : '') + '> Only my saved places</label></div>'
      + '<div class="card"><h3>' + ic('cloud') + 'Forecast</h3>'
      + '<div class="field"><label for="s-model">Weather model</label><select id="s-model">' + E.MODELS.map((m) => '<option value="' + m.id + '"' + (m.id === s.model ? ' selected' : '') + '>' + esc(m.name) + '</option>').join('') + '</select><small id="model-note">' + esc((E.MODELS.find((m) => m.id === s.model) || {}).note || '') + '</small></div>'
      + '<div class="field"><label for="s-archive">Replay a past day</label><input id="s-archive" type="date" min="2022-01-01" max="' + T.iso(Date.now() - 86400000) + '" value="' + esc(s.archive || '') + '"><small>Loads the archived forecast for that date, for example a classic fog day such as 13 December 2025. Live measurements are hidden while replaying.</small>'
      + (s.archive ? '<button type="button" class="btn" data-act="live" style="margin-top:6px">Back to the live forecast</button>' : '') + '</div>'
      + '<p class="muted small" style="margin:0">' + (fc ? 'Loaded ' + T.hm(fc.fetched) + '. The forecast refreshes by itself after an hour; measurements every 10 minutes.' : '') + '</p></div>'
      + '<div class="card"><h3>Display</h3><div class="two"><div class="field"><label for="s-units">Units</label><select id="s-units"><option value="metric"' + (s.units === 'metric' ? ' selected' : '') + '>Metres, °C, km</option><option value="imperial"' + (s.units === 'imperial' ? ' selected' : '') + '>Feet, °F, miles</option></select></div>'
      + '<div class="field"><label for="s-theme">Theme</label><select id="s-theme"><option value="auto"' + (s.theme === 'auto' ? ' selected' : '') + '>Match device</option><option value="light"' + (s.theme === 'light' ? ' selected' : '') + '>Light</option><option value="dark"' + (s.theme === 'dark' ? ' selected' : '') + '>Dark</option></select></div></div></div>'
      + '<div class="card"><h3>How it works</h3><p class="small muted" style="margin:0 0 8px">For each of ' + E.places.length + ' places the app combines three things: the low, mid and high cloud forecast; the real skyline, so it knows when mountains block the low winter sun; and the height of the fog top, read from how the low cloud changes with altitude across neighbouring places. The conversion from cloud to sunshine was calibrated on MeteoSwiss sunshine measurements.</p>'
      + '<p class="small muted" style="margin:0 0 8px">Near the top of the fog a difference of 100 m decides between grey and blue sky, and no forecast is that precise. That is why the measured sunshine and the webcams are one tap away.</p>'
      + '<p class="small muted" style="margin:0">Data: Open-Meteo (forecast, CC BY 4.0), MeteoSwiss (measurements), swisstopo (maps, place names), OpenStreetMap contributors (webcam locations, map outside Switzerland via CARTO), OSRM (road routing), transport.opendata.ch (timetable), Mapzen terrain tiles on AWS. Webcam images belong to their operators.</p></div>'
      + '<div class="card"><div class="btns"><button type="button" class="btn" data-act="reset">Reset all settings</button><button type="button" class="btn" data-act="clear">Clear cached data</button></div></div></div>';
    sh.hidden = false; sh.scrollTop = 0;
  };
  UI.closeSettings = function () { $('#settings').hidden = true; };
  UI.searchResults = function (list, err) {
    const box = $('#qres');
    if (!box) return;
    if (err) { box.innerHTML = '<small>Search failed: ' + esc(err) + '</small>'; return; }
    if (!list.length) { box.innerHTML = '<small>Nothing found.</small>'; return; }
    box.innerHTML = '<div class="searchres">' + list.map((r, k) => '<button type="button" data-res="' + k + '">' + esc(r.label) + '</button>').join('') + '</div>';
    box._list = list;
  };
})();
