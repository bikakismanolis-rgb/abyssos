// lives of damage a run (lifeTaken), the integrator's measure: bosses mean of 2, zones sum of 2, whole act = both;
// Act V over Act IV per class, without Mastery (n) and with it (M); deaths, kill times, the biggest hit
import fs from 'node:fs';
const rows = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r.err);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN), f = (v, d = 2) => (isFinite(v) ? v.toFixed(d) : '-');
const cell = (cls, m, name) => rows.filter((r) => r.cls === cls && !!r.mast === m && (r.boss || r.zone) === name);
const ACT = { 4: { z: ['ashfield', 'forge'], b: ['ivar', 'karthax'] }, 5: { z: ['coast', 'farlight'], b: ['tower', 'skotos'] } };
const out = [];
out.push('| class | Mastery | Act IV zones / bosses / act | Act V zones / bosses / act | V over IV: zones / bosses / act | deaths IV / V | kill s IV / V | biggest hit IV / V |');
out.push('|---|---|---|---|---|---|---|---|');
for (const cls of ['warden', 'ranger', 'mage']) for (const m of [false, true]) {
  const A = {};
  for (const a of [4, 5]) {
    const z = ACT[a].z.map((n) => mean(cell(cls, m, n).map((r) => r.lifeTaken))), b = ACT[a].b.map((n) => mean(cell(cls, m, n).map((r) => r.lifeTaken)));
    const all = [...ACT[a].z, ...ACT[a].b].flatMap((n) => cell(cls, m, n));
    A[a] = { z: z[0] + z[1], b: (b[0] + b[1]) / 2, act: z[0] + z[1] + b[0] + b[1], d: all.reduce((s, r) => s + (r.deaths || 0), 0), k: mean(ACT[a].b.flatMap((n) => cell(cls, m, n)).map((r) => r.killS).filter((v) => v != null)), hit: mean(all.map((r) => r.maxHit)) * 100, n: all.length };
  }
  out.push(`| ${cls} | ${m ? 'yes' : 'no'} | ${f(A[4].z)} / ${f(A[4].b)} / ${f(A[4].act)} | ${f(A[5].z)} / ${f(A[5].b)} / ${f(A[5].act)} | x${f(A[5].z / A[4].z)} / x${f(A[5].b / A[4].b)} / **x${f(A[5].act / A[4].act)}** | ${A[4].d} / ${A[5].d} | ${f(A[4].k, 0)} / ${f(A[5].k, 0)} | ${f(A[4].hit, 1)}% / ${f(A[5].hit, 1)}% |`);
}
console.log(out.join('\n'));
console.log('\nruns:', rows.length, 'errors:', fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.err).length);
