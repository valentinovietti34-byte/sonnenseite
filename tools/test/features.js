// Checks the new engine features: confidence, live-measurement blend, lift status, train times.
const { SS, sandbox } = require('./harness');
const fx = require('./fixtures');
const realFetch = globalThis.fetch;
sandbox.fetch = async (url) => { const u = String(url); const b = /open-meteo/.test(u) ? fx.lookup(u) : null; if (b) return { ok: true, status: 200, json: async () => JSON.parse(b) }; if (/open-meteo/.test(u)) return { ok: false, status: 599, json: async () => ({ reason: 'no fixture' }) }; return realFetch(u); };
const E = SS.engine, T = SS.tz, U = SS.util;
const byName = (n) => E.places.find((p) => p.n === n);
(async () => {
  SS.state = { units: 'metric' };
  /* 1. confidence on the archived fog day */
  await E.loadForecast({ model: 'best_match', archive: '2026-11-02', force: true });
  const d0 = T.dayStart(Date.parse('2026-11-02T12:00:00Z')), count = {};
  E.places.forEach((p) => { const c = E.day(p.i, d0, null).conf; count[c] = (count[c] || 0) + 1; });
  console.log('1. confidence on 2 Nov 2026:', JSON.stringify(count));
  for (const n of ['Zürich', 'Uetliberg', 'Rigi Kulm', 'Pilatus Kulm', 'Säntis', 'Titlis']) { const p = byName(n), d = E.day(p.i, d0, null); console.log('   ', n.padEnd(13), (d.sunAll / 60).toFixed(1) + ' h', d.conf.padEnd(9), 'uncertainty', d.uDay.toFixed(2)); }

  /* 2. live measurements: pretend it is 11:00 on the live-forecast day; stations above 1000 m sunny, below in fog */
  const realNow = Date.now;
  await E.loadForecast({ model: 'best_match', force: true });
  const day = E.days()[0], t11 = day + 11 * 3600000;
  Date.now = () => t11 + 5 * 60000;
  const list = Object.keys(E.stationsMeta).map((id) => { const m = E.stationsMeta[id]; return { id, n: m.n, la: m.la, lo: m.lo, e: m.e, sun: m.e >= 1000 ? 10 : 0, canSee: true, ts: t11 }; });
  const h = E.hourIndex(t11), ue = byName('Uetliberg'), zh = byName('Zürich'), hk = byName('Hörnli');
  const before = [ue, zh, hk].map((p) => E.fc.sun[p.i * E.fc.n + h]);
  E.obs = { list, ts: t11, fetched: t11 };
  const applied = E.applyObs();
  const after = [ue, zh, hk].map((p) => E.fc.sun[p.i * E.fc.n + h]);
  console.log('2. blend applied:', applied, '| Uetliberg 870 m', before[0].toFixed(2), '->', after[0].toFixed(2), '| Zürich 408 m', before[1].toFixed(2), '->', after[1].toFixed(2), '| Hörnli 1133 m', before[2].toFixed(2), '->', after[2].toFixed(2), '| measured share at Hörnli', E.fc.meas[hk.i * E.fc.n + h].toFixed(2), '| 4 h later blended?', E.fc.meas[hk.i * E.fc.n + h + 4] === E.fc.meas[hk.i * E.fc.n + h + 4]);
  E.obs = { list, ts: t11 - 3 * 3600000, fetched: t11 };
  console.log('   stale readings ignored:', E.applyObs() === false && E.fc.sun[hk.i * E.fc.n + h] === E.fc.sunBase[hk.i * E.fc.n + h]);
  Date.now = realNow; E.obs = null; E.applyObs();

  /* 3. lift status from the real timetable, today */
  const today = T.dayStart(Date.now()), lifts = ['Säntis', 'Rigi Kulm', 'Titlis', 'Ebenalp', 'Pilatus Kulm', 'Stoos', 'Hoher Kasten'].map(byName);
  await E.checkLifts(lifts, today);
  console.log('3. lifts today:', lifts.map((p) => { const l = E.liftFor(p, today); return p.n + '(' + p.st + ')=' + (l ? (l.err ? 'error ' + l.err : l.n + (l.n ? ' last ' + T.hm(l.last) : '')) : 'none'); }).join(' | '));

  /* 4. train times from Zürich for tomorrow 08:00 */
  E.driveHome = { lat: 47.3769, lon: 8.5417 }; E.crow = E.places.map((p) => U.haversine(47.3769, 8.5417, p.la, p.lo)); E.mode = 'train';
  const tmr = T.dayStart(Date.now() + 86400000), pts = ['Uetliberg', 'Rigi Kulm', 'Säntis', 'Bachtel'].map(byName);
  await E.loadPt({ lat: 47.3769, lon: 8.5417 }, pts, tmr, tmr + 8 * 3600000);
  console.log('4. by train tomorrow:', pts.map((p) => { const t = E.travel(p, tmr); return p.n + ': ' + (t.none ? 'no stop/connection' : (t.exact ? '' : '~') + Math.round(t.total) + ' min' + (t.dep ? ' (dep ' + T.hm(t.dep) + ', ' + t.transfers + ' changes)' : '')); }).join(' | '));
  E.mode = 'car';
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
