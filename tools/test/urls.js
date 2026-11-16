const { SS } = require('./harness');
const P = SS.engine.places, out = [];
for (const [tag, archive] of [['live', null], ['fog2025', '2025-12-13'], ['fog2026', '2026-11-02']]) {
  for (let i = 0, c = 0; i < P.length; i += 125, c++) out.push(`${tag}_${c}\t${SS.engine._forecastUrl(P.slice(i, i + 125), 'best_match', archive, 4)}`);
}
console.log(out.join('\n'));
