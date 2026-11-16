// Loads the browser scripts into Node with a minimal fake window, for logic tests and tooling.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const store = {};
const sandbox = {
  console, setTimeout, clearTimeout, Intl, Date, Math, JSON, Promise, Float32Array, Uint8Array, Array, Object, String, Number, isFinite, isNaN, parseFloat, encodeURIComponent, AbortController,
  fetch: (...a) => fetch(...a),
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  document: { querySelector: () => null, querySelectorAll: () => [], createElement: () => ({}) },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['data/places.js', 'data/webcams.js', 'data/stations.js', 'js/util.js', 'js/sun.js', 'js/engine.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
sandbox.SS.engine.init();
module.exports = { SS: sandbox.SS, sandbox, store };
