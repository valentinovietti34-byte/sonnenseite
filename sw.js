/* Sonnenseite service worker: keeps the app shell available offline and speeds up repeat visits.
   Weather, measurements, routing and map tiles always come from the network (the app keeps its own forecast cache). */
const VERSION = 'sonnenseite-v4';
const SHELL = ['./', 'index.html', 'css/app.css', 'vendor/leaflet.css', 'vendor/leaflet.js', 'data/places.js', 'data/webcams.js', 'data/stations.js',
  'js/util.js', 'js/native.js', 'js/i18n.js', 'fonts/fonts.css', 'fonts/archivo-latin.woff2', 'fonts/inter-latin.woff2', 'js/sun.js', 'js/engine.js', 'js/map.js', 'js/ui.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;       // third-party requests go straight to the network
  /* network first, so updates arrive at once; the cached shell is the offline fallback */
  e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return res; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
