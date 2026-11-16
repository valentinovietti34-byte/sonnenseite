const { SS } = require('./harness');
(async () => {
  const E = SS.engine, p = E.places.find((x) => x.n === 'Säntis');
  const r = await E.connections({ lat: 47.2267, lon: 8.8184 }, p, null); const c = r.list; console.log("fallback:", r.fallback, "to:", r.to);
  console.log('connections to', p.st, ':', c.length, c.slice(0, 2).map((x) => `${SS.tz.hm(x.dep)}->${SS.tz.hm(x.arr)} ${x.min} min, ${x.transfers} changes, ${x.from} -> ${x.to}`));
  const s = await E.search('Wädenswil'); console.log('search:', s.slice(0, 2));
  const o = await E.loadObs(); const op = E.obsProfile(47.3769, 8.5417);
  console.log('obs stations', o.list.length, 'time', SS.tz.hm(o.ts), 'can see sun:', o.list.filter((x) => x.canSee).length, 'profile', op.state, op.lo, op.hi);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
