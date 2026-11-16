const { SS, sandbox } = require('./harness');
const fx = require('./fixtures');
sandbox.fetch = async (url) => { const b = fx.lookup(String(url)); if (!b) return { ok: false, status: 599, json: async () => ({ reason: 'no fixture' }) }; return { ok: true, status: 200, json: async () => JSON.parse(b) }; };
const E = SS.engine, T = SS.tz, U = SS.util;
(async () => {
  const archive = process.argv[2] || '2026-11-02';
  SS.state = { units: 'metric' };
  await E.loadForecast({ model: 'best_match', archive, force: true });
  const fc = E.fc; console.log('forecast', new Date(fc.t0).toISOString(), 'hours', fc.n, 'days', E.days().map((d) => T.date(d + 43200000)));
  const home = { lat: 47.3769, lon: 8.5417, ele: 408 };
  await E.loadDrive(home).catch(() => {});
  console.log('drive source', E.driveSource);
  const day = T.dayStart(Date.parse(archive + 'T12:00:00Z'));
  for (const hh of [8, 10, 12, 14, 16]) {
    const pr = E.profile(home.lat, home.lon, E.hourIndex(day + hh * 3600000));
    console.log(`${hh}:00 profile`, pr.state, pr.lo, pr.hi, 'bottom', pr.bottom && pr.bottom.toFixed(2), '| ladder:', pr.pts.map((q) => `${q.p.n.slice(0, 10)}@${q.z}:${q.L.toFixed(1)}`).slice(0, 26).join(' '));
  }
  const rows = E.rank({ dayStart: day, nowMs: day + 9 * 3600000, atMs: day + 12 * 3600000, maxTravel: 150, altMin: 0, altMax: 4000, kinds: { peak: 1, hill: 1, village: 1, pass: 1, town: 1 }, sort: 'best', hideClosed: true, reluctance: 0.5 });
  console.log('ranked', rows.length);
  rows.slice(0, 14).forEach((r) => console.log(' ', r.p.n.padEnd(22), String(r.p.e).padStart(5), 'm  travel', String(Math.round(r.travel.total)).padStart(4), 'min  sun', (r.sunMin / 60).toFixed(1), 'h  score', r.score.toFixed(2), r.day.fogBelowHours ? ' above-fog ' + r.day.fogBelowHours + 'h' : '', r.now ? r.now.why : ''));
  for (const n of ['Zürich', 'Uetliberg', 'Bachtel', 'Hörnli', 'Einsiedeln', 'Rigi Kulm', 'Säntis', 'Lauterbrunnen', 'Elm']) {
    const p = E.places.find((x) => x.n === n), d = E.day(p.i, day, null);
    console.log(n.padEnd(14), 'zc', p.zc, 'sun', (d.sunAll / 60).toFixed(1) + 'h', 'terrain', d.window.first ? T.hm(d.window.first) + '-' + T.hm(d.window.last) : 'none', '|', d.hours.slice(7, 18).map((o) => o.state === 'shade' ? 'sh' : o.state === 'night' ? '..' : (o.sun * 10).toFixed(0).padStart(2) + (o.lifted ? '^' : '')).join(' '));
  }
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
