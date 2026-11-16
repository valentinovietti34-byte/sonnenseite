/* Sonnenseite - map: swisstopo base maps, place markers coloured by sunshine, the "sea of fog" layer
   (terrain below the fog top, painted from elevation tiles), measured sunshine at stations, webcams,
   your position and the route preview. */
(function () {
  'use strict';
  const SS = window.SS, U = SS.util, E = SS.engine;
  const M = (SS.map = {});
  const WMTS = 'https://wmts.geo.admin.ch/1.0.0/';
  const BASES = {
    grey: { id: 'ch.swisstopo.pixelkarte-grau', cls: 'base-grey' },
    color: { id: 'ch.swisstopo.pixelkarte-farbe', cls: 'base-color' },
    winter: { id: 'ch.swisstopo.pixelkarte-farbe-winter', cls: 'base-color' },
    aerial: { id: 'ch.swisstopo.swissimage' },
  };
  const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  /* elevation tiles, decoded once and shared by the fog layer and the green land layer */
  const elevCache = new Map();
  function loadElev(z, x, y) {
    const key = z + '/' + x + '/' + y;
    if (elevCache.has(key)) return elevCache.get(key);
    const pr = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = 256;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, 256, 256).data, el = new Float32Array(65536);
          for (let i = 0, o = 0; i < 65536; i++, o += 4) el[i] = d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768;
          resolve(el);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = TERRARIUM.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    });
    elevCache.set(key, pr);
    if (elevCache.size > 160) elevCache.delete(elevCache.keys().next().value);
    return pr;
  }
  const ATTR = '&copy; <a href="https://www.swisstopo.admin.ch/" target="_blank" rel="noopener">swisstopo</a>';
  let map, base, under, fog, green, forest, gPlaces, gStations, gWebcams, homeMk, meMk, meCircle, routeLine, handlers = {};
  const markers = {};

  const tileLat = (yn) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * yn))) * 180) / Math.PI;

  const FogLayer = L.GridLayer.extend({
    options: { minZoom: 7, maxNativeZoom: 11, tileSize: 256, pane: 'fog', updateWhenZooming: false, keepBuffer: 1, bounds: [[44.9, 4.6], [48.7, 11.8]], attribution: 'Terrain: Mapzen' },
    createTile: function (coords, done) {
      const c = L.DomUtil.create('canvas', 'leaflet-tile'), self = this;
      c.width = c.height = 256; c._coords = coords;
      loadElev(coords.z, coords.x, coords.y).then((el) => { c._elev = el; if (el) self.paint(c); done(null, c); });
      return c;
    },
    paint: function (c) {
      const el = c._elev;
      if (!el) return;
      const g = c.getContext('2d'), f = M.fogFn;
      g.clearRect(0, 0, 256, 256);
      if (!f) return;
      const co = c._coords, n = Math.pow(2, co.z);
      const at = (x, y) => f(tileLat(y / n), (x / n) * 360 - 180);
      const t00 = at(co.x, co.y), t10 = at(co.x + 1, co.y), t01 = at(co.x, co.y + 1), t11 = at(co.x + 1, co.y + 1);
      if (t00 <= 0 && t10 <= 0 && t01 <= 0 && t11 <= 0) return;
      const img = g.createImageData(256, 256), d = img.data;
      const dark = SS.app && SS.app.isDark && SS.app.isDark();
      const R = dark ? 206 : 252, G = dark ? 215 : 253, B = dark ? 225 : 255;
      const aRim = dark ? 190 : 225, aMin = dark ? 70 : 105, aMax = dark ? 115 : 155;
      for (let py = 0, i = 0, o = 0; py < 256; py++) {
        const v = (py + 0.5) / 256, tl = t00 + (t01 - t00) * v, tr = t10 + (t11 - t10) * v;
        for (let px = 0; px < 256; px++, i++, o += 4) {
          const dz = tl + (tr - tl) * ((px + 0.5) / 256) - el[i];
          if (dz > 0) {
            d[o] = R; d[o + 1] = G; d[o + 2] = B;
            d[o + 3] = dz < 12 ? aRim : dz < 60 ? aMin + (aMax - aMin) * (dz / 60) : aMax;      /* a stronger rim marks the fog shoreline */
          }
        }
      }
      g.putImageData(img, 0, 0);
    },
    repaint: function () { for (const k in this._tiles) this.paint(this._tiles[k].el); },
  });

  /* Green land: a light green wash, multiplied over the topographic map, on land below the treeline. It fades out
     between 1600 and 2300 m so rock, scree and glaciers keep their colours, and skips lakes (perfectly flat in the
     elevation model). Forests come on top from the official swissTLM3D forest layer, in darker green. */
  const GreenLayer = L.GridLayer.extend({
    options: { minZoom: 5, maxNativeZoom: 12, tileSize: 256, pane: 'green', updateWhenZooming: false, keepBuffer: 1, bounds: [[44.9, 4.6], [48.7, 11.8]] },
    createTile: function (coords, done) {
      const c = L.DomUtil.create('canvas', 'leaflet-tile'), self = this;
      c.width = c.height = 256;
      loadElev(coords.z, coords.x, coords.y).then((el) => { c._elev = el; if (el) self.paint(c); done(null, c); });
      return c;
    },
    paint: function (c) {
      const el = c._elev, g = c.getContext('2d');
      if (!el) return;
      const dark = SS.app && SS.app.isDark && SS.app.isDark();
      const R = dark ? 176 : 196, G = dark ? 214 : 226, B = dark ? 150 : 158, A = dark ? 205 : 235;
      const img = g.createImageData(256, 256), d = img.data;
      for (let y = 0, i = 0; y < 256; y++) {
        const y0 = y > 0 ? -256 : 0, y1 = y < 255 ? 256 : 0;
        for (let x = 0; x < 256; x++, i++) {
          const h = el[i];
          if (h > 2300) continue;
          const x0 = x > 0 ? -1 : 0, x1 = x < 255 ? 1 : 0;
          let mn = h, mx = h;
          for (const dy of [y0, 0, y1]) for (const dx of [x0, 0, x1]) { const v = el[i + dy + dx]; if (v < mn) mn = v; else if (v > mx) mx = v; }
          if (mx - mn < 0.25) continue;                       /* water */
          const o = i * 4, f = h <= 1600 ? 1 : (2300 - h) / 700;
          d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = Math.round(A * f);
        }
      }
      g.putImageData(img, 0, 0);
    },
    repaint: function () { for (const k in this._tiles) this.paint(this._tiles[k].el); },
  });

  const underStyle = () => (SS.app && SS.app.isDark && SS.app.isDark() ? 'dark_all' : 'light_all');
  M.refreshTheme = function () { if (fog && map.hasLayer(fog)) fog.repaint(); if (green && map.hasLayer(green)) green.repaint(); };

  M.init = function (h) {
    handlers = h || {};
    /* Switzerland only: you cannot pan away from it or zoom out past the whole country; outside the border fades out */
    const CH = L.latLngBounds([[45.817, 5.956], [47.808, 10.492]]);
    map = L.map('map', { center: [46.82, 8.25], zoom: 8, minZoom: 6, maxZoom: 16, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 100, zoomControl: false, attributionControl: true, maxBounds: CH.pad(0.06), maxBoundsViscosity: 1 });
    const fitMin = () => { const z = map.getBoundsZoom(CH, false); if (z === z) map.setMinZoom(Math.max(5.5, z)); };
    fitMin(); map.on('resize', fitMin);
    M.leaflet = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix(false);
    map.createPane('fog').style.zIndex = 350;
    ['green', 'forest'].forEach((n, k) => { const p = map.createPane(n); p.style.zIndex = 240 + k * 10; p.style.pointerEvents = 'none'; });
    green = new GreenLayer();
    forest = L.tileLayer(WMTS + 'ch.swisstopo.swisstlm3d-wald/default/current/3857/{z}/{x}/{y}.png', { pane: 'forest', opacity: 0.5, maxNativeZoom: 17, maxZoom: 18, bounds: [[45.6, 5.7], [47.95, 10.7]] });
    /* the national map has its own detailed colours close up, so the wash fades as you zoom in */
    const lushFade = () => { const z = map.getZoom(); green.setOpacity(z <= 11 ? 1 : z <= 12 ? 0.7 : z <= 13 ? 0.45 : 0.3); forest.setOpacity(z <= 12 ? 0.5 : 0.35); };
    map.on('zoomend', lushFade); lushFade();
    map.createPane('mask').style.zIndex = 420;
    map.getPane('mask').style.pointerEvents = 'none';
    if (window.SS_BORDER) {
      L.polygon([[[30, -20], [30, 40], [62, 40], [62, -20]], window.SS_BORDER], { pane: 'mask', className: 'ch-mask', stroke: false, interactive: false }).addTo(map);
      L.polygon(window.SS_BORDER, { pane: 'mask', className: 'ch-border', fill: false, weight: 1.6, interactive: false }).addTo(map);
    }
    map.getPane('fog').style.pointerEvents = 'none';
    gPlaces = L.layerGroup().addTo(map); gStations = L.layerGroup(); gWebcams = L.layerGroup();
    fog = new FogLayer(); M._fog = fog;
    E.places.forEach((p) => {
      const mk = L.marker([p.la, p.lo], {
        icon: L.divIcon({ className: '', html: '<div class="mk k-' + p.k + '" data-id="' + p.id + '"><span>' + U.esc(p.n) + '</span></div>', iconSize: [0, 0] }),
        title: p.n + ' · ' + U.fmtAlt(p.e), keyboard: false, zIndexOffset: p.k === 'town' ? 0 : p.e,
      });
      mk.on('click', () => handlers.onPlace && handlers.onPlace(p.id));
      mk.addTo(gPlaces); markers[p.id] = mk;
    });
    const zc = () => { const z = map.getZoom(), c = map.getContainer().classList; c.toggle('z-mid', z >= 10 && z < 12); c.toggle('z-high', z >= 12); };
    map.on('zoomend', zc); zc();
    map.on('click', (e) => handlers.onMapClick && handlers.onMapClick(e.latlng));
  };

  M.setBase = function (name) {
    const b = BASES[name] || BASES.grey;
    if (base) map.removeLayer(base);
    base = L.tileLayer(WMTS + b.id + '/default/current/3857/{z}/{x}/{y}.jpeg', { attribution: ATTR, maxNativeZoom: 18, maxZoom: 18, className: b.cls || '', bounds: [[44.9, 4.6], [48.7, 11.8]], zIndex: 2 }).addTo(map);
    const lush = name === 'color';
    [green, forest].forEach((l) => { if (!l) return; if (lush && !map.hasLayer(l)) l.addTo(map); if (!lush && map.hasLayer(l)) map.removeLayer(l); });
  };
  M.setLayer = function (name, on) {
    const g = name === 'fog' ? fog : name === 'stations' ? gStations : gWebcams;
    if (on && !map.hasLayer(g)) g.addTo(map);
    if (!on && map.hasLayer(g)) map.removeLayer(g);
    if (name === 'webcams' && on && !gWebcams._built) buildWebcams();
  };
  M.setFog = function (fn) { M.fogFn = fn; if (map.hasLayer(fog)) fog.repaint(); };

  /* colour every place marker for the selected hour. info(p) -> {sun, state, dim, fav, sel} */
  M.paintPlaces = function (info) {
    E.places.forEach((p) => {
      const el = markers[p.id].getElement();
      if (!el) return;
      const d = el.firstChild, s = info(p);
      d.style.background = s.state === 'night' ? 'var(--night)' : s.state === 'shade' ? 'var(--shade)' : s.state === 'nodata' ? '#c9d1d8' : U.sunColor(s.sun);
      d.classList.toggle('dim', !!s.dim); d.classList.toggle('fav', !!s.fav); d.classList.toggle('sel', !!s.sel);
    });
  };

  M.paintStations = function () {
    gStations.clearLayers();
    if (!E.obs) return;
    E.obs.list.forEach((s) => {
      if (s.sun == null || !s.canSee) return;            /* no reading is possible while the sun is below the station's skyline */
      const mk = L.marker([s.la, s.lo], { icon: L.divIcon({ className: '', html: '<div class="st' + (s.canSee ? '' : ' blind') + '" style="background:' + (s.canSee ? U.sunColor((s.sun / 10) * 0.9) : '#c9d1d8') + '"></div>', iconSize: [0, 0] }), title: s.n, zIndexOffset: -500 });
      mk.bindPopup(() => '<b>' + U.esc(s.n) + '</b><br><span class="muted">MeteoSwiss station · ' + U.fmtAlt(s.e) + '</span><br>'
        + (s.canSee ? 'Sunshine: <b>' + Math.round(s.sun) + ' of 10 min</b>' : 'Sun not visible from here right now')
        + (s.t != null ? '<br>Temperature: ' + U.fmtTemp(s.t) : '') + (s.rh != null ? ' · Humidity: ' + Math.round(s.rh) + '%' : '')
        + '<br><span class="muted">Measured ' + SS.tz.hm(s.ts) + '</span>');
      mk.addTo(gStations);
    });
  };

  function buildWebcams() {
    gWebcams._built = true;
    E.webcams.forEach((w) => {
      const mk = L.marker([w.la, w.lo], { icon: L.divIcon({ className: '', html: '<div class="wc"><svg class="ic"><use href="#i-cam"/></svg></div>', iconSize: [0, 0] }), title: w.n, zIndexOffset: -200 });
      mk.bindPopup(() => '<b>' + U.esc(w.n) + '</b><br><span class="muted">Webcam · ' + U.fmtAlt(w.e) + '</span>'
        + (w.i ? '<img src="' + U.esc(w.i) + '" alt="Latest image from ' + U.esc(w.n) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '<br>')
        + '<a class="pop-btn" href="' + U.esc(w.u) + '" target="_blank" rel="noopener">Open live webcam</a>', { minWidth: 220 });
      mk.addTo(gWebcams);
    });
  }

  M.setHome = function (home) {
    if (homeMk) map.removeLayer(homeMk);
    homeMk = L.marker([home.lat, home.lon], { icon: L.divIcon({ className: '', html: '<div class="homepin"><svg viewBox="0 0 24 24"><use href="#i-pin"/></svg></div>', iconSize: [0, 0] }), title: 'Start: ' + home.name, zIndexOffset: 5000, interactive: false }).addTo(map);
  };
  M.setMe = function (lat, lon, acc) {
    if (!meMk) { meMk = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [0, 0] }), zIndexOffset: 6000, interactive: false }).addTo(map); meCircle = L.circle([lat, lon], { radius: acc || 30, weight: 1, color: '#2B7BD1', fillOpacity: 0.12, interactive: false }).addTo(map); }
    else { meMk.setLatLng([lat, lon]); meCircle.setLatLng([lat, lon]); meCircle.setRadius(acc || 30); }
  };
  M.showRoute = function (line) {
    M.clearRoute();
    routeLine = L.polyline(line, { color: '#2B7BD1', weight: 5, opacity: 0.85, lineCap: 'round' }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
  };
  M.clearRoute = function () { if (routeLine) { map.removeLayer(routeLine); routeLine = null; } };
  M.focus = function (p, zoom) { map.setView([p.la, p.lo], Math.max(map.getZoom(), zoom || 11), { animate: true }); };
  M.fitAround = function (home, km) {
    const dLat = km / 111, dLon = km / (111 * Math.cos((home.lat * Math.PI) / 180));
    map.fitBounds([[home.lat - dLat, home.lon - dLon], [home.lat + dLat, home.lon + dLon]]);
  };
  M.popup = function (ll, html, onClick) {
    const div = document.createElement('div');
    div.innerHTML = html;
    if (onClick) div.addEventListener('click', onClick);
    if (!M._pop) M._pop = L.popup({ maxWidth: 270, autoPanPadding: [40, 40] });
    M._pop.setLatLng(ll).setContent(div).openOn(map);
  };
  M.closePopup = function () { if (map) map.closePopup(); };
  M.invalidate = function () { if (map) map.invalidateSize(); };
})();
