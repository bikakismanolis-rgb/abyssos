// The Act VI balance campaign's tables: node sum.mjs runs.jsonl
// Lives of damage a run (lifeTaken, integrate.md's measure): zones the sum of the two zones' means, bosses the mean of the
// two bosses' means, the act the four means summed. Act VI over Act V per class and difficulty; deaths, kill times, the
// biggest blow (the mean of the runs' biggest, and the worst single one); the Lamplight track at rank 40 against rank 0
// in Acts IV and V; the Shade with the Lost's seven lamps against none. Lowest life: the least of her life seen in the
// cell's runs (a blow is counted in the lives whether or not she heals it back).
import fs from 'node:fs';
const all = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = all.filter((r) => !r.err);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN), f = (v, d = 2) => (isFinite(v) ? v.toFixed(d) : '-');
const sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)) : NaN; };
const ACT = { 4: { z: ['ashfield', 'forge'], b: ['ivar', 'karthax'] }, 5: { z: ['coast', 'farlight'], b: ['tower', 'skotos'] }, 6: { z: ['drained', 'bottom'], b: ['ketos', 'shade'] } };
const DIFF = ['Wanderer', 'Warden'];
const cell = (set, cls, diff, name) => rows.filter((r) => r.set === set && r.cls === cls && r.diff === diff && (r.boss || r.zone) === name);
function act(set, a, cls, diff) {
  const z = ACT[a].z.map((n) => mean(cell(set, cls, diff, n).map((r) => r.lifeTaken))), b = ACT[a].b.map((n) => mean(cell(set, cls, diff, n).map((r) => r.lifeTaken)));
  const runs = [...ACT[a].z, ...ACT[a].b].flatMap((n) => cell(set, cls, diff, n));
  return { z: z[0] + z[1], b: (b[0] + b[1]) / 2, act: z[0] + z[1] + b[0] + b[1], zs: z, bs: b, deaths: runs.reduce((s, r) => s + (r.deaths || 0), 0), hit: mean(runs.map((r) => r.maxHit)) * 100, worst: Math.max(0, ...runs.map((r) => r.maxHit)) * 100, n: runs.length,
    kill: ACT[a].b.map((n) => cell(set, cls, diff, n).map((r) => r.killS).filter((v) => v != null)), failed: runs.filter((r) => r.boss && !r.killed).length, timeouts: runs.reduce((s, r) => s + (r.packList || []).filter((p) => p.timeout).length, 0) };
}
const rng = (a) => (a.length ? `${f(Math.min(...a), 0)}-${f(Math.max(...a), 0)}` : '-');
const out = [];
out.push('## Act VI over Act V (the same tree and bot)\n');
out.push('| class, difficulty | Act V zones / bosses / act | Act VI zones / bosses / act | VI over V: zones / bosses / **act** | deaths V / VI | biggest blow, mean of runs V / VI | worst single blow V / VI | runs V / VI |');
out.push('|---|---|---|---|---|---|---|---|');
for (const diff of [1, 0]) for (const cls of ['warden', 'ranger', 'mage']) {
  const V = act('main', 5, cls, diff), W = act('main', 6, cls, diff);
  out.push(`| ${cls}, ${DIFF[diff]} | ${f(V.z)} / ${f(V.b)} / ${f(V.act)} | ${f(W.z)} / ${f(W.b)} / ${f(W.act)} | x${f(W.z / V.z)} / x${f(W.b / V.b)} / **x${f(W.act / V.act)}** | ${V.deaths} / ${W.deaths} | ${f(V.hit, 1)}% / ${f(W.hit, 1)}% | ${f(V.worst, 1)}% / ${f(W.worst, 1)}% | ${V.n} / ${W.n} |`);
}
out.push('\n## Each fight (lives of damage a run: mean, and the runs\' spread; seconds)\n');
out.push('| fight | class | Warden: lives (sd) | deaths | lowest life | kill s or zone s | Wanderer: lives (sd) | deaths | lowest life | kill s or zone s |');
out.push('|---|---|---|---|---|---|---|---|---|---|');
for (const a of [5, 6]) for (const n of [ACT[a].z[0], ACT[a].b[0], ACT[a].z[1], ACT[a].b[1]]) for (const cls of ['warden', 'ranger', 'mage']) {
  const c = [1, 0].map((d) => { const r = cell('main', cls, d, n), L = r.map((x) => x.lifeTaken), t = r.map((x) => x.killS ?? x.combatS); return `${f(mean(L))} (${f(sd(L))}) | ${r.reduce((s, x) => s + x.deaths, 0)} | ${f(Math.min(...r.map((x) => x.minLife)) * 100, 0)}% | ${rng(t)}${r.some((x) => x.boss && !x.killed) ? ' NOT KILLED: ' + r.filter((x) => x.boss && !x.killed).length : ''}`; });
  out.push(`| ${n} | ${cls} | ${c[0]} | ${c[1]} |`);
}
out.push('\n## The bosses\' kill times (the bot\'s reference build at the profile level; s)\n');
out.push('| boss | Warden difficulty: warden / ranger / mage | Wanderer: warden / ranger / mage |');
out.push('|---|---|---|');
for (const b of ['tower', 'skotos', 'ketos', 'shade']) out.push(`| ${b} | ${[1, 0].map((d) => ['warden', 'ranger', 'mage'].map((cls) => rng(cell('main', cls, d, b).map((r) => r.killS).filter((v) => v != null))).join(' / ')).join(' | ')} |`);
out.push('\n## The Lamplight track at rank 40 against rank 0 (Warden difficulty, n 6 a cell)\n');
out.push('| class | Act IV act: rank 0 / rank 40 | Act V act: rank 0 / rank 40 | Act IV bosses\' kill s: 0 / 40 | Act V bosses\' kill s: 0 / 40 | deaths IV 0 / 40, V 0 / 40 |');
out.push('|---|---|---|---|---|---|');
for (const cls of ['warden', 'ranger', 'mage']) {
  const a0 = act('lamp0', 4, cls, 1), a4 = act('lamp40', 4, cls, 1), b0 = act('main', 5, cls, 1), b4 = act('lamp40', 5, cls, 1);
  out.push(`| ${cls} | ${f(a0.act)} / ${f(a4.act)} (x${f(a4.act / a0.act)}) | ${f(b0.act)} / ${f(b4.act)} (x${f(b4.act / b0.act)}) | ${f(mean(a0.kill.flat()), 0)} / ${f(mean(a4.kill.flat()), 0)} | ${f(mean(b0.kill.flat()), 0)} / ${f(mean(b4.kill.flat()), 0)} | ${a0.deaths} / ${a4.deaths}, ${b0.deaths} / ${b4.deaths} |`);
}
out.push('\n## The Shade with the Lost\'s seven lamps (Warden difficulty, n 6 a cell)\n');
out.push('| class | kill s: none / seven | lives: none / seven | deaths: none / seven |');
out.push('|---|---|---|---|');
for (const cls of ['warden', 'ranger', 'mage']) {
  const a = cell('main', cls, 1, 'shade'), b = cell('lost7', cls, 1, 'shade'), k = (r) => mean(r.map((x) => x.killS).filter((v) => v != null));
  out.push(`| ${cls} | ${f(k(a), 0)} / ${f(k(b), 0)} (x${f(k(b) / k(a))}) | ${f(mean(a.map((x) => x.lifeTaken)))} / ${f(mean(b.map((x) => x.lifeTaken)))} | ${a.reduce((s, x) => s + x.deaths, 0)} / ${b.reduce((s, x) => s + x.deaths, 0)} |`);
}
console.log(out.join('\n'));
const errs = all.filter((r) => r.err);
console.log(`\nruns: ${rows.length}, errors: ${errs.length}${errs.length ? ' (' + errs.map((r) => r.id + ': ' + String(r.err).slice(0, 60)).join('; ') + ')' : ''}, bosses not killed: ${rows.filter((r) => r.boss && !r.killed).map((r) => r.id).join(', ') || 'none'}, pack timeouts: ${rows.reduce((s, r) => s + (r.packList || []).filter((p) => p.timeout).length, 0)}`);
