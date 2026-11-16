/* Sonnenseite - bridge to the native app shell (Capacitor, used for the iOS and Android store apps).
   In a normal browser every function here falls back to the matching web API, so the same code runs everywhere. */
(function () {
  'use strict';
  const SS = (window.SS = window.SS || {});
  const C = window.Capacitor;
  const is = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  const N = (SS.native = {
    is: is,
    platform: is && typeof C.getPlatform === 'function' ? C.getPlatform() : 'web',
    version: '1.0.0',
    /* the one place to change when the privacy page or the project moves */
    links: {
      privacy: 'https://valentinovietti34-byte.github.io/sonnenseite/privacy.html',
      support: 'https://github.com/valentinovietti34-byte/sonnenseite/issues',
      source: 'https://github.com/valentinovietti34-byte/sonnenseite',
    },
  });
  document.documentElement.classList.add(is ? 'native' : 'web', 'plat-' + N.platform);

  const plugin = (name) => {
    try { return (is && C.Plugins && C.Plugins[name]) || null; } catch (e) { return null; }
  };
  const quiet = (p) => { if (p && typeof p.catch === 'function') p.catch(() => {}); };

  /* Current position: resolves {lat, lon, accuracy}. Rejects with {code: 1} when the person refused permission. */
  N.getPosition = function () {
    const viaBrowser = () => new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject({ code: 0, message: 'No location service' }); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
        (e) => reject({ code: e.code, message: e.message }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
    const G = plugin('Geolocation');
    if (!G || typeof G.getCurrentPosition !== 'function') return viaBrowser();
    const granted = (s) => !!s && (s.location === 'granted' || s.coarseLocation === 'granted');
    return (async () => {
      try {
        let st = await G.checkPermissions();
        if (!granted(st)) st = await G.requestPermissions();
        if (!granted(st)) throw { code: 1, message: 'Location permission refused' };
        const p = await G.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
        return { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy };
      } catch (e) {
        const m = String((e && e.message) || e || '');
        if ((e && e.code === 1) || /denied|refused|permission/i.test(m)) throw { code: 1, message: m };
        return viaBrowser();
      }
    })();
  };

  /* Android back button: fn() returns true when it handled the press (closed a sheet), otherwise the app closes. */
  N.onBack = function (fn) {
    const A = plugin('App');
    if (!A || typeof A.addListener !== 'function') return;
    quiet(A.addListener('backButton', () => { if (!fn()) quiet(A.exitApp && A.exitApp()); }));
  };

  /* Status bar text colour follows the app theme (light text on a dark header, dark text on a light one). */
  N.setBars = function (dark) {
    const B = plugin('SystemBars') || plugin('StatusBar');
    if (B && typeof B.setStyle === 'function') quiet(B.setStyle({ style: dark ? 'DARK' : 'LIGHT' }));
  };
})();
