/* Sonnenseite - application state and wiring. */
(function () {
  'use strict';
  const SS = window.SS, U = SS.util, T = SS.tz, E = SS.engine, M = SS.map, UI = SS.ui, Sun = SS.sun, $ = U.$;
  const A = (SS.app = {});
  const KEY = 'ss.settings.v1';
  const DEFAULTS = {
    home: { lat: 47.3769, lon: 8.5417, name: 'Zürich', ele: 408, gps: false },
    units: 'metric', theme: 'auto', model: 'best_match', sort: 'best', maxTravel: 150, altMin: 0, altMax: 4000,
    kinds: { peak: true, hill: true, village: true, pass: true, town: true }, hideClosed: true, favOnly: false, favs: {}, reluctance: 1, mode: 'car',
    base: 'grey', layers: { fog: true, stations: true, webcams: false }, fogManual: null, archive: null,
  };
  const saved = U.load(KEY, {}) || {};
  A.state = Object.assign({}, DEFAULTS, saved);
  A.state.kinds = Object.assign({}, DEFAULTS.kinds, saved.kinds || {});
  A.state.layers = Object.assign({}, DEFAULTS.layers, saved.layers || {});
  A.state.favs = Object.assign({}, saved.favs || {});
  A.state.home = Object.assign({}, DEFAULTS.home, saved.home || {});
  SS.state = A.state;
  A.home = A.state.home;
  A.sel = { dayStart: T.dayStart(Date.now()), atMs: Math.floor(Date.now() / 3600000) * 3600000 };
  A.listLimit = 40;
  A.save = () => U.save(KEY, A.state);
  A.isDark = () => A.state.theme === 'dark' || (A.state.theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  function applyTheme() {
    const r = document.documentElement;
    if (A.state.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', A.state.theme);
    if (M.refreshTheme && M.leaflet) M.refreshTheme();
    if (SS.native) SS.native.setBars(A.isDark());
  }

  /* ---------------------------------------------------------------- derive and render */
  function rank() {
    const s = A.state;
    E.mode = s.mode === 'train' ? 'train' : 'car';
    const opts = { dayStart: A.sel.dayStart, nowMs: E.now(), atMs: A.sel.atMs, maxTravel: s.maxTravel, altMin: s.altMin, altMax: s.altMax, kinds: s.kinds, sort: s.sort, hideClosed: s.hideClosed, favOnly: s.favOnly, favs: s.favs, reluctance: s.reluctance };
    A.ranked = E.rank(opts);
    /* tomorrow at a glance: from midday on, point out a clear-cut sunny trip for the next day */
    A.tomorrow = null;
    const now = E.now();
    if (!E.fc.archive && T.dayStart(now) === A.sel.dayStart && T.hour(now) >= 12) {
      const d1 = E.days().find((d) => d > A.sel.dayStart);
      if (d1) {
        const best = E.rank(Object.assign({}, opts, { dayStart: d1, atMs: d1 + 12 * 3600000, sort: 'best' })).find((r) => !r.closed && !r.liftClosed && r.day.conf === 'likely' && r.sunMin >= 120);
        if (best) A.tomorrow = { dayStart: d1, p: best.p, conf: best.day.conf, sunMin: best.sunMin, total: best.travel.total };
      }
    }
  }
  /* after each render: check lifts, train times and webcams for the places on screen, then render again once */
  let followTimer = 0;
  const rerenderSoon = () => { clearTimeout(followTimer); followTimer = setTimeout(A.render, 400); };
  function followUp() {
    if (!E.fc || E.fc.archive) return;
    const rows = A.ranked || [], ds = A.sel.dayStart, sel = A.selPlace ? E.byId[A.selPlace] : null;
    const top = rows.slice(0, 25).map((r) => r.p);
    E.checkLifts((sel ? [sel] : []).concat(top), ds).then((ch) => { if (ch) rerenderSoon(); });
    if (A.tomorrow) E.checkLifts([A.tomorrow.p], A.tomorrow.dayStart).then((ch) => { if (ch) rerenderSoon(); });
    if (A.state.mode === 'train' && E.driveHome) {
      const today = T.dayStart(E.now()) === ds;
      E.loadPt(A.home, top.slice(0, 24).concat(sel ? [sel] : []), ds, today ? null : ds + 8 * 3600000).then((ch) => { if (ch) rerenderSoon(); });
    }
    if (T.dayStart(E.now()) === ds) {
      const cams = rows.slice(0, 12).map((r) => E.bestCam(r.p));
      if (sel) E.webcamsNear(sel, 6).forEach((w) => { if (w.p === 'roundshot' && w.i) cams.push(w); });
      E.checkCams(cams).then((ch) => { if (ch) rerenderSoon(); });
    }
  }
  /* forecast for any point tapped on the map */
  async function pointForecast(ll) {
    if (!E.fc || !ll) return;
    const lat = ll.lat, lon = ll.lng;
    if (lat < 45.75 || lat > 47.9 || lon < 5.9 || lon > 10.55) return;
    M.popup(ll, '<b>This spot</b><br><span class="muted">Looking up the height…</span>');
    const z0 = await E.elevationAt(lat, lon), z = z0 == null ? null : Math.max(0, z0);
    const h = E.hourIndex(A.sel.atMs), est = z == null ? null : E.atPoint(lat, lon, z, h), day = z == null ? null : E.pointDay(lat, lon, z, A.sel.dayStart);
    const today = T.dayStart(E.now()) === A.sel.dayStart;
    const word = !est ? 'No estimate here' : !est.up ? 'Sun below the horizon' : est.sun >= 0.6 ? 'Sunny' : est.sun >= 0.4 ? 'Mostly sunny' : est.sun >= 0.2 ? 'Some sun' : est.low >= 0.6 ? 'Fog or low cloud' : 'Cloudy';
    let near = null, nd = 1e9;
    E.places.forEach((q) => { const d = U.haversine(lat, lon, q.la, q.lo); if (d < nd) { nd = d; near = q; } });
    const html = '<b>' + U.esc(word) + '</b> <span class="muted">at ' + T.hm(A.sel.atMs) + '</span><br>'
      + (z == null ? 'Height unknown' : U.fmtAlt(z)) + (day && day.known ? ' · about ' + U.fmtSunHours(day.sunMin) + ' of sun ' + (today ? 'today' : 'that day') : '')
      + '<br><span class="muted" style="font-size:12px">Estimated from the regional forecast. Mountains around this point are not taken into account, so in a valley it can look too sunny.</span>'
      + '<div class="pop-btns"><button type="button" class="pop-btn" data-pt="home">Start from here</button><a class="pop-btn" href="https://www.google.com/maps/dir/?api=1&destination=' + lat.toFixed(5) + ',' + lon.toFixed(5) + '" target="_blank" rel="noopener">Navigate</a></div>';
    M.popup(ll, html, (e) => {
      if (!e.target.closest('[data-pt="home"]')) return;
      M.closePopup();
      A.setHome({ lat: lat, lon: lon, name: near && nd < 5 ? 'Near ' + near.n : 'Map point' });
      UI.toast('Starting point set to this spot.');
    });
  }

  function fogField() {
    if (!A.state.layers.fog || !E.fc) { M.setFog(null); return; }
    if (A.state.fogManual != null) { const t = A.state.fogManual; M.setFog(() => t); return; }
    const h = E.hourIndex(A.sel.atMs), anchors = [];
    E.places.forEach((p) => {
      if (p.k !== 'town') return;
      const pr = E.profile(p.la, p.lo, h);
      anchors.push([p.la, p.lo, pr.state === 'fog' ? pr.top : pr.state === 'deck' ? Math.min(2200, pr.lo + 150) : 0]);
    });
    if (!anchors.some((a) => a[2] > 0)) { M.setFog(null); return; }
    M.setFog((lat, lon) => {
      let sw = 0, st = 0;
      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i], dy = (lat - a[0]) * 111, dx = (lon - a[1]) * 76, d2 = dx * dx + dy * dy;
        if (d2 > 4900) continue;
        const w = 1 / (d2 + 30); sw += w; st += w * a[2];
      }
      return sw ? st / sw : 0;
    });
  }
  function paintMap() {
    if (!E.fc) return;
    const h = E.hourIndex(A.sel.atMs), inList = {};
    (A.ranked || []).forEach((r) => { inList[r.p.id] = 1; });
    M.paintPlaces((p) => { const o = E.hour(p.i, h) || { state: 'nodata', sun: 0 }; return { sun: o.sun, state: o.state, dim: !inList[p.id], fav: !!A.state.favs[p.id], sel: A.selPlace === p.id }; });
    fogField();
    UI.renderLegend();
  }
  A.render = function () {
    if (E.fc) rank();
    UI.renderWhen(); UI.renderBrief(); UI.renderList(); UI.renderCredits(); paintMap();
    if (A.selPlace && !$('#sheet').hidden) { const y = $('#sheet').scrollTop; UI.openPlace(A.selPlace); $('#sheet').scrollTop = y; }
    followUp();
  };

  /* ---------------------------------------------------------------- loading */
  function pickDefaultTime() {
    const now = E.now(), days = E.days();
    A.sel.dayStart = T.dayStart(now); A.sel.atMs = Math.floor(now / 3600000) * 3600000;
    const sun = Sun.position(now, A.home.lat, A.home.lon);
    if (!E.fc.archive && sun.alt < 0 && T.hour(now) >= 15 && days.length > 1) { A.sel.dayStart = days.find((d) => d > A.sel.dayStart) || A.sel.dayStart; A.sel.atMs = A.sel.dayStart + 12 * 3600000; }
    if (days.length && days.indexOf(A.sel.dayStart) < 0) { A.sel.dayStart = days[0]; A.sel.atMs = days[0] + 12 * 3600000; }
  }
  function friendly(err) {
    const m = String((err && err.message) || err || '');
    if (/limit/i.test(m)) return 'The weather service has hit its request limit for your network. Try again in a while.';
    if (/Failed to fetch|NetworkError|timed out|Load failed/i.test(m)) return 'No connection to the weather service. Check your internet connection.';
    return m || 'Unknown error.';
  }
  A.loadAll = async function (force, keepTime) {
    const btn = $('#btn-refresh'); btn.classList.add('spin');
    UI.banner(null);
    try {
      await E.loadForecast({ model: A.state.model, archive: A.state.archive, force: !!force });
      if (!keepTime) pickDefaultTime();
      if (E.fc.stale) UI.banner('Showing the forecast from ' + T.hm(E.fc.fetched) + '. ' + friendly(E.fc.error), 'Retry', () => A.loadAll(true, true));
    } catch (err) {
      UI.banner('Could not load the forecast. ' + friendly(err), 'Retry', () => A.loadAll(true));
    }
    btn.classList.remove('spin');
    A.render();
    if (E.fc && !E.fc.archive) loadObs(); else { E.obs = null; M.paintStations(); }
  };
  async function loadObs() {
    try { await E.loadObs(); M.paintStations(); A.render(); } catch (e) { /* measurements are optional */ }
  }
  async function loadDrive() {
    await E.loadDrive(A.home);
    if (E.fc) A.render();
  }
  A.setHome = async function (h) {
    let ele = null, name = h.name, best = null, bd = 1e9;
    E.places.forEach((p) => { const d = U.haversine(h.lat, h.lon, p.la, p.lo); if (d < bd) { bd = d; best = p; } });
    if (best && bd < 1.5) ele = best.e;
    if (ele == null) ele = await E.elevationAt(h.lat, h.lon);
    if (ele == null) ele = best ? best.e : 450;
    if (h.gps) name = best && bd < 5 ? 'Near ' + best.n : 'My position';
    A.state.home = A.home = { lat: h.lat, lon: h.lon, name: name, ele: Math.round(ele), gps: !!h.gps };
    A.save(); M.setHome(A.home);
    A.render();
    await loadDrive();
  };
  A.useGps = function () {
    UI.toast('Finding your position…', 8000);
    SS.native.getPosition().then((pos) => {
      const lat = pos.lat, lon = pos.lon;
      M.setMe(lat, lon, pos.accuracy);
      if (lat < 45.7 || lat > 47.95 || lon < 5.8 || lon > 10.6) { UI.toast('You seem to be outside Switzerland, so ' + A.home.name + ' stays the starting point.', 5000); return; }
      UI.toast('Starting point set to your position.');
      A.setHome({ lat: lat, lon: lon, name: 'My position', gps: true });
    }, (err) => {
      UI.toast(err && err.code === 1 ? (SS.native.is ? 'Location access is off. Turn it on for Sonnenseite in your phone settings, or choose a starting point in Settings.' : 'Location access was refused. Allow it for this page, or choose a starting point in Settings.') : 'Could not get your position. Choose a starting point in Settings.', 6000);
    });
  };

  /* ---------------------------------------------------------------- events */
  function setView(v) {
    $('#app').dataset.view = v;
    $('#view-label').textContent = v === 'map' ? 'List' : 'Map';
    $('#view-ic').setAttribute('href', v === 'map' ? '#i-list' : '#i-map');
    setTimeout(() => { M.invalidate(); paintMap(); }, 30);
  }
  function syncLayerUi() {
    const s = A.state;
    U.$$('#base-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.base === s.base)));
    $('#lay-fog').checked = s.layers.fog; $('#lay-stations').checked = s.layers.stations; $('#lay-webcams').checked = s.layers.webcams;
    $('#fog-manual').checked = s.fogManual != null; $('#fog-top').disabled = s.fogManual == null;
    if (s.fogManual != null) $('#fog-top').value = s.fogManual;
    $('#fog-top-label').textContent = s.fogManual != null ? U.fmtAlt(s.fogManual) : 'automatic';
  }
  function wire() {
    $('#days').addEventListener('click', (e) => {
      const b = e.target.closest('[data-day]'); if (!b) return;
      const d = +b.dataset.day, hod = T.hour(A.sel.atMs);
      A.sel.dayStart = d; A.sel.atMs = d + hod * 3600000; A.listLimit = 40; A.render();
    });
    let raf = 0;
    $('#hour').addEventListener('input', (e) => {
      A.sel.atMs = A.sel.dayStart + +e.target.value * 3600000;
      $('#hour-label').textContent = T.hm(A.sel.atMs);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(A.render);
    });
    $('#btn-now').addEventListener('click', () => { if (E.fc) { pickDefaultTime(); A.render(); } });
    $('#btn-home').addEventListener('click', UI.openSettings);
    $('#btn-settings').addEventListener('click', UI.openSettings);
    $('#btn-filter').addEventListener('click', UI.openSettings);
    $('#btn-refresh').addEventListener('click', () => A.loadAll(true, true));
    $('#sort').value = A.state.sort;
    $('#sort').addEventListener('change', (e) => { A.state.sort = e.target.value; A.save(); A.listLimit = 40; A.render(); });
    $('#results').addEventListener('click', (e) => {
      if (e.target.closest('#more')) { A.listLimit += 40; UI.renderList(); return; }
      const r = e.target.closest('[data-id]'); if (r) openPlace(r.dataset.id);
    });
    $('#brief').addEventListener('click', (e) => {
      const dd = e.target.closest('[data-day]');
      if (dd) { const d = +dd.dataset.day; A.sel.dayStart = d; A.sel.atMs = d + 12 * 3600000; A.listLimit = 40; A.render(); return; }
      const r = e.target.closest('[data-id]'); if (r) openPlace(r.getAttribute('data-id'));
    });
    $('#btn-view').addEventListener('click', () => setView($('#app').dataset.view === 'map' ? 'list' : 'map'));
    $('#btn-layers').addEventListener('click', () => { const p = $('#layers'); p.hidden = !p.hidden; $('#btn-layers').classList.toggle('on', !p.hidden); });
    $('#btn-locate').addEventListener('click', A.useGps);
    $('#base-seg').addEventListener('click', (e) => { const b = e.target.closest('[data-base]'); if (!b) return; A.state.base = b.dataset.base; A.save(); M.setBase(A.state.base); syncLayerUi(); });
    [['lay-fog', 'fog'], ['lay-stations', 'stations'], ['lay-webcams', 'webcams']].forEach((x) => {
      $('#' + x[0]).addEventListener('change', (e) => { A.state.layers[x[1]] = e.target.checked; A.save(); M.setLayer(x[1], e.target.checked); if (x[1] === 'fog') fogField(); if (x[1] === 'stations') M.paintStations(); });
    });
    $('#fog-manual').addEventListener('change', (e) => {
      if (e.target.checked) { const pr = E.fc ? E.profile(A.home.lat, A.home.lon, E.hourIndex(A.sel.atMs)) : {}; A.state.fogManual = pr.top ? Math.round(pr.top / 25) * 25 : 1000; if (!A.state.layers.fog) { A.state.layers.fog = true; M.setLayer('fog', true); } }
      else A.state.fogManual = null;
      A.save(); syncLayerUi(); fogField();
    });
    $('#fog-top').addEventListener('input', (e) => { A.state.fogManual = +e.target.value; $('#fog-top-label').textContent = U.fmtAlt(A.state.fogManual); fogField(); });
    $('#fog-top').addEventListener('change', A.save);

    /* place sheet */
    $('#sheet').addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]'), sh = $('#sheet'), p = E.byId[A.selPlace];
      const cam = e.target.closest('[data-cam]'), day = e.target.closest('[data-day]');
      if (cam && sh._cams) { UI.showCam(sh._cams[+cam.dataset.cam]); return; }
      if (day) { const d = +day.dataset.day, hod = T.hour(A.sel.atMs); A.sel.dayStart = d; A.sel.atMs = d + hod * 3600000; A.render(); $('#sheet').scrollTop = 0; return; }
      if (!act || !p) return;
      const a = act.dataset.act;
      if (a === 'close') { UI.closeSheet(); paintMap(); }
      else if (a === 'fav') { if (A.state.favs[p.id]) delete A.state.favs[p.id]; else A.state.favs[p.id] = 1; A.save(); A.render(); UI.toast(A.state.favs[p.id] ? 'Saved' : 'Removed from saved places'); }
      else if (a === 'route') {
        UI.toast('Finding the route…', 8000);
        try { const r = await E.route(A.home, p); UI.closeSheet(); setView('map'); setTimeout(() => M.showRoute(r.line), 80); UI.toast(U.fmtDur(r.min) + ' by car, ' + U.fmtDist(r.km) + (p.nav ? ' to ' + p.nav[2] : ''), 6000); }
        catch (err) { UI.toast('No route found. The routing service may be busy.'); }
      } else if (a === 'conn') {
        UI.showConnections(null);
        const future = !E.fc.archive && A.sel.dayStart > T.dayStart(Date.now());      /* timetable lookups only make sense for today or later */
        try { UI.showConnections(await E.connections(A.home, p, future ? A.sel.dayStart + 8 * 3600000 : null)); }
        catch (err) { UI.showConnections(null, friendly(err)); }
      }
    });

    /* settings sheet */
    const st = $('#settings');
    const changed = () => { A.save(); A.listLimit = 40; A.render(); };
    st.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]'), home = e.target.closest('[data-home]'), res = e.target.closest('[data-res]');
      if (home) { const p = E.places.find((x) => x.n === home.dataset.home); if (p) { UI.closeSettings(); await A.setHome({ lat: p.la, lon: p.lo, name: p.n }); UI.toast('Starting point: ' + p.n); } return; }
      if (res) { const r = $('#qres')._list[+res.dataset.res]; UI.closeSettings(); await A.setHome({ lat: r.lat, lon: r.lon, name: r.label.replace(/\s*\([A-Z]{2}\).*$/, '').trim() || r.label }); UI.toast('Starting point changed.'); return; }
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'close') UI.closeSettings();
      else if (a === 'gps') { UI.closeSettings(); A.useGps(); }
      else if (a === 'live') { A.state.archive = null; A.save(); UI.closeSettings(); A.loadAll(true); }
      else if (a === 'clear') { E.clearCaches(); UI.toast('Cached data cleared.'); A.loadAll(true, true); loadDrive(); }
      else if (a === 'reset') { U.drop(KEY); E.clearCaches(); location.reload(); }
    });
    st.addEventListener('input', (e) => {
      const t = e.target, s = A.state;
      if (t.id === 's-travel') { s.maxTravel = +t.value; $('#o-travel').textContent = U.fmtDur(s.maxTravel); }
      else if (t.id === 's-rel') { s.reluctance = +t.value; $('#o-rel').textContent = s.reluctance <= 0.3 ? 'sun matters most' : s.reluctance >= 1.5 ? 'strongly' : 'balanced'; }
      else if (t.id === 's-amin') { s.altMin = Math.min(+t.value, s.altMax - 100); $('#o-amin').textContent = U.fmtAlt(s.altMin); }
      else if (t.id === 's-amax') { s.altMax = Math.max(+t.value, s.altMin + 100); $('#o-amax').textContent = U.fmtAlt(s.altMax); }
    });
    const search = U.debounce(async (q) => { if (q.trim().length < 2) { $('#qres').innerHTML = ''; return; } try { UI.searchResults(await E.search(q)); } catch (err) { UI.searchResults([], friendly(err)); } }, 350);
    st.addEventListener('keyup', (e) => { if (e.target.id === 'q') search(e.target.value); });
    st.addEventListener('change', (e) => {
      const t = e.target, s = A.state;
      if (t.dataset.kind) { s.kinds[t.dataset.kind] = t.checked; changed(); }
      else if (t.id === 's-closed') { s.hideClosed = t.checked; changed(); }
      else if (t.id === 's-fav') { s.favOnly = t.checked; changed(); }
      else if (t.id === 's-mode') { s.mode = t.value; changed(); }
      else if (t.id === 's-units') { s.units = t.value; changed(); syncLayerUi(); }
      else if (t.id === 's-theme') { s.theme = t.value; applyTheme(); changed(); }
      else if (t.id === 's-model') { s.model = t.value; A.save(); $('#model-note').textContent = (E.MODELS.find((m) => m.id === s.model) || {}).note || ''; A.loadAll(true, true); }
      else if (t.id === 's-archive') { s.archive = t.value || null; A.save(); UI.closeSettings(); A.loadAll(true); }
      else if (['s-travel', 's-rel', 's-amin', 's-amax'].indexOf(t.id) >= 0) changed();
    });
    A.back = function () {
      if (!$('#settings').hidden) { UI.closeSettings(); return true; }
      if (!$('#sheet').hidden) { UI.closeSheet(); paintMap(); return true; }
      if (!$('#layers').hidden) { $('#layers').hidden = true; $('#btn-layers').classList.remove('on'); return true; }
      if ($('#app').dataset.view === 'map' && window.innerWidth < 900) { setView('list'); return true; }
      return false;
    };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') A.back(); });
    if (SS.native) SS.native.onBack(A.back);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    if (window.matchMedia) { const mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', () => { if (A.state.theme === 'auto') { M.refreshTheme(); paintMap(); } }); }
    window.addEventListener('resize', U.debounce(() => M.invalidate(), 150));
  }
  function openPlace(id) {
    UI.openPlace(id); paintMap(); followUp();
    const p = E.byId[id];
    if (p && window.innerWidth >= 900) M.focus(p, 10);
  }
  /* periodic refresh: measurements every 10 minutes, forecast after an hour */
  function tick() {
    if (!E.fc || E.fc.archive || document.hidden) return;
    if (Date.now() - E.fc.fetched > 61 * 60000) A.loadAll(false, true);
    else if (!E.obs || Date.now() - E.obs.fetched > 9.5 * 60000) loadObs();
  }

  A.boot = function () {
    applyTheme();
    E.init();
    UI.renderBrief(); UI.renderList();
    M.init({ onPlace: openPlace, onMapClick: pointForecast });
    M.setBase(A.state.base); M.setHome(A.home);
    ['fog', 'stations', 'webcams'].forEach((k) => M.setLayer(k, !!A.state.layers[k]));
    M.fitAround(A.home, 75);
    wire(); syncLayerUi(); UI.renderWhen();
    A.loadAll(false);
    loadDrive();
    setInterval(tick, 5 * 60000);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !(SS.native && SS.native.is)) navigator.serviceWorker.register('sw.js').catch(() => {});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', A.boot); else A.boot();
})();
