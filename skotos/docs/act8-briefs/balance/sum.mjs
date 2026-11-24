// Act VIII's balance campaign, summed against Act VII's bands (docs/act7-contract.md: a boss 110-230 s, a pack 8-14 s,
// lowest life 35-65% in a zone):   node sum.mjs [runs.jsonl]   (markdown to stdout)
import fs from 'node:fs';
const rows = fs.readFileSync(process.argv[2] || new URL('./runs.jsonl', import.meta.url), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((r) => r.combatS != null);
const med = (a) => { const s = a.filter((v) => v != null && !Number.isNaN(v)).sort((p, q) => p - q); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pc = (v) => (v == null ? '-' : Math.round(v * 100) + '%'), f0 = (v) => (v == null ? '-' : Math.round(v)), f1 = (v) => (v == null ? '-' : (+v).toFixed(1));
const D = ['Wanderer', 'Warden', 'Hero', 'Nightmare', 'Ash', 'Skotos'], CLS = ['warden', 'ranger', 'mage'];
const P = (s = '') => console.log(s);
P('## The zones (eight packs; level 52, 49 on Wanderer)');
P();
P('| zone | difficulty | class | runs | a pack, median s (8-14) | lowest life, median (worst) | s under 30% life, median | deaths (runs with one) | packs timed out |');
P('|---|---|---|---|---|---|---|---|---|');
for (const zone of ['tinder', 'vigil']) for (let d = 0; d < 6; d++) for (const cls of CLS) {
  const rs = rows.filter((r) => !r.boss && r.zone === zone && r.diff === d && r.cls === cls); if (!rs.length) continue;
  const packs = rs.flatMap((r) => (r.packList || r.packs_ || []).filter?.((p) => !p.timeout && p.kills >= Math.ceil((p.n || 1) / 2)).map((p) => p.t) || []);
  const per = med(rs.map((r) => r.combatS / Math.max(1, r.packsDone || 8)));
  const to = rs.reduce((s, r) => s + (r.packList || []).filter((p) => p.timeout).length, 0);
  P(`| ${zone} | ${D[d]} | ${cls} | ${rs.length} | ${f1(packs.length ? med(packs) : per)} | ${pc(med(rs.map((r) => r.minLife)))} (${pc(Math.min(...rs.map((r) => r.minLife)))}) | ${f1(med(rs.map((r) => r.under30S)))} | ${rs.reduce((s, r) => s + r.deaths, 0)} (${rs.filter((r) => r.deaths).length}) | ${to} |`);
}
P();
P('## The bosses (to their rest; level 52, 49 on Wanderer)');
P();
P('| boss | difficulty | class | runs | time, median s (110-230; every run) | lowest life, median (worst) | s under 30% life, median | deaths (runs with one) | not laid to rest |');
P('|---|---|---|---|---|---|---|---|---|');
for (const boss of ['aithon', 'ragna']) for (let d = 0; d < 6; d++) for (const cls of CLS) {
  const rs = rows.filter((r) => r.boss === boss && r.diff === d && r.cls === cls); if (!rs.length) continue;
  const ts = rs.map((r) => r.killS ?? r.combatS);
  P(`| ${boss} | ${D[d]} | ${cls} | ${rs.length} | ${f0(med(ts))} (${ts.map(f0).join(', ')}) | ${pc(med(rs.map((r) => r.minLife)))} (${pc(Math.min(...rs.map((r) => r.minLife)))}) | ${f1(med(rs.map((r) => r.under30S)))} | ${rs.reduce((s, r) => s + r.deaths, 0)} (${rs.filter((r) => r.deaths).length}) | ${rs.filter((r) => !r.killed).length} |`);
}
