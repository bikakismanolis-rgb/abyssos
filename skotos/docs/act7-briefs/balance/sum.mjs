// Act VII's reduced balance pass, against the contract's bands (docs/act7-contract.md, Zone danger; The bosses):
//   node sum.mjs runs.jsonl            (markdown tables to stdout; a run is a line of tools/balance-act.mjs's output)
import fs from 'node:fs';
const rows = fs.readFileSync(process.argv[2] || new URL('./runs.jsonl', import.meta.url), 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const med = (a) => { const s = a.filter((v) => v != null && !Number.isNaN(v)).slice().sort((p, q) => p - q); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const f2 = (v) => (v == null ? '-' : (+v).toFixed(2)), f1 = (v) => (v == null ? '-' : (+v).toFixed(1)), pc = (v) => (v == null ? '-' : Math.round(v * 100) + '%');
const ok = (b) => (b == null ? 'n/a' : b ? 'pass' : '**fail**');
const range = (a, f = f1) => (a.length ? (a.length > 1 ? `${f(Math.min(...a))}-${f(Math.max(...a))}` : f(a[0])) : '-');
const by = (set, k) => rows.filter((r) => r.set === set && (k.boss ? r.boss === k.boss : !r.boss && r.zone === k.zone) && (!k.cls || r.cls === k.cls));
const CLS = ['warden', 'ranger', 'mage'];
const out = [];
const P = (s = '') => out.push(s);

// ---------- run A: the zones ----------
const zoneCell = (rs) => {
  // (a pack's time: the entries where at least half the pack died in that fight; an entry whose pack fell in the fight before
  // lasts a second or two and would understate it. Timed-out packs are counted apart)
  const packs = rs.flatMap((r) => (r.packList || []).filter((p) => !p.timeout && p.kills >= Math.ceil((p.n || 1) / 2)).map((p) => p.t));
  const perPack = mean(rs.map((r) => r.combatS / Math.max(1, r.packsDone)));
  return { n: rs.length, lives: mean(rs.map((r) => r.lifeTaken)), livesR: rs.map((r) => r.lifeTaken), low: med(rs.map((r) => r.minLife)), lowR: rs.map((r) => r.minLife),
    u30: med(rs.map((r) => r.under30S)), u30R: rs.map((r) => r.under30S), deaths: rs.reduce((s, r) => s + r.deaths, 0), pack: med(packs), packs: packs.length, perPack,
    timeouts: rs.reduce((s, r) => s + (r.packList || []).filter((p) => p.timeout).length, 0), done: rs.map((r) => r.packsDone),
    tk: mean(rs.map((r) => r.terrainKills || 0)), tkR: rs.map((r) => r.terrainKills || 0), maxHit: Math.max(...rs.map((r) => r.maxHit || 0)),
    kills: rs.map((r) => r.kills), slideKills: rs.map((r) => r.slides?.kills || 0), her: rs.reduce((s, r) => s + (r.slides?.her || 0), 0), foes: rs.reduce((s, r) => s + (r.slides?.foes || 0), 0), taken: rs.reduce((s, r) => s + (r.slides?.taken || 0), 0),
    heavy: rs.reduce((s, r) => s + (r.heavyN || 0), 0), worst3: Math.max(...rs.map((r) => r.worst3 || 0)), combat: med(rs.map((r) => r.combatS)), potions: rs.reduce((s, r) => s + r.potions, 0),
    lessons: rs.reduce((o, r) => { for (const k in r.lessons || {}) if (typeof r.lessons[k] === 'number') o[k] = (o[k] || 0) + r.lessons[k]; return o; }, {}) };
};
P('## Run A: the zones (Warden difficulty, level 50; two runs a cell)');
P();
P('| zone, class | runs | lives (0.4-0.7) | lowest life, median (35-65%) | s under 30%, median (0-6) | deaths | pack time, median (8-14 s) | terrain kills (15-35%) | biggest blow (<= 20%) | worst 3 s |');
P('|---|---|---|---|---|---|---|---|---|---|');
const A = {};
for (const zone of ['thaw', 'tarn']) for (const cls of CLS) {
  const rs = by('A', { zone, cls }); if (!rs.length) continue;
  const c = A[zone + cls] = zoneCell(rs);
  P(`| ${zone}, ${cls} | ${c.n} | ${f2(c.lives)} (${range(c.livesR, f2)}) ${ok(c.lives >= 0.4 && c.lives <= 0.7)} | ${pc(c.low)} (${range(c.lowR.map((v) => v * 100), (v) => Math.round(v))}) ${ok(c.low >= 0.35 && c.low <= 0.65)} | ${f1(c.u30)} (${range(c.u30R)}) ${ok(c.u30 <= 6)} | ${c.deaths} | ${f1(c.pack)} s (${c.packs} packs; ${c.timeouts} timed out; ${f1(c.perPack)} s of combat a pack) ${ok(c.pack >= 8 && c.pack <= 14)} | ${pc(c.tk)} (${range(c.tkR.map((v) => v * 100), (v) => Math.round(v))}) ${ok(c.tk >= 0.15 && c.tk <= 0.35)} | ${pc(c.maxHit)} ${ok(c.maxHit <= 0.2005)} | ${pc(c.worst3)} |`);
}
P();
P('Across classes (lives within +-30% of the three classes\' mean):');
P();
for (const zone of ['thaw', 'tarn']) {
  const cs = CLS.map((cls) => A[zone + cls]).filter(Boolean); if (cs.length < 3) continue;
  const m = mean(cs.map((c) => c.lives));
  P(`- ${zone}: mean ${f2(m)}; ${CLS.map((cls, i) => `${cls} ${f2(cs[i].lives)} (${Math.round((cs[i].lives / m - 1) * 100)}%)`).join(', ')}: ${ok(cs.every((c) => Math.abs(c.lives / m - 1) <= 0.3))}`);
}
P();
P('What the zone runs did (sums over the cell\'s runs): slides kicked by her / by foes / reaching her, heavy blows landed, potions, the lessons used');
P();
P('| zone, class | slides her / foes / on her | slide kills / kills | heavy blows | potions | packs done | lessons |');
P('|---|---|---|---|---|---|---|');
for (const zone of ['thaw', 'tarn']) for (const cls of CLS) { const c = A[zone + cls]; if (!c) continue; P(`| ${zone}, ${cls} | ${c.her} / ${c.foes} / ${c.taken} | ${c.slideKills.join('+')} / ${c.kills.join('+')} | ${c.heavy} | ${c.potions} | ${c.done.join(', ')} | ${JSON.stringify(c.lessons)} |`); }
P();
// Wanderer
const W = {};
P('## Run A, Wanderer (difficulty 0, the warden class, level 47; two runs a zone)');
P();
P('| zone | runs | lives (at most half of Warden\'s) | lowest life, median (>= 70%) | deaths (none) | s under 30% |');
P('|---|---|---|---|---|---|');
for (const zone of ['thaw', 'tarn']) {
  const rs = by('A0', { zone, cls: 'warden' }); if (!rs.length) continue;
  const c = W[zone] = zoneCell(rs), wd = A[zone + 'warden'];
  P(`| ${zone} | ${c.n} | ${f2(c.lives)} vs ${f2(wd?.lives)}: x${wd ? (c.lives / wd.lives).toFixed(2) : '-'} ${ok(wd ? c.lives <= wd.lives * 0.5 : null)} | ${pc(c.low)} ${ok(c.low >= 0.7)} | ${c.deaths} ${ok(c.deaths === 0)} | ${f1(c.u30)} |`);
}
P();

// ---------- run B and C: the bosses ----------
const BAND = {
  kallisto: { t: [110, 170], tAll: [85, 240], hv: [4, 6], low: [0.30, 0.55], u30: [3, 12] },
  kelados: { t: [150, 230], tAll: [115, 270], hv: [5, 8], low: [0.25, 0.45], u30: [5, 18] }
};
P('## Run B: the bosses (Warden difficulty, level 50; two runs a cell)');
P();
P('| boss, class | runs | time to rest, median (band; every run) | heavy blows landed, median | each blow | lowest life, median | s under 30%, median | deaths | worst 3 s (<= 40%) | rested |');
P('|---|---|---|---|---|---|---|---|---|---|');
const Bc = {};
for (const boss of ['kallisto', 'kelados']) for (const cls of CLS) {
  const rs = by('B', { boss, cls }); if (!rs.length) continue;
  const b = BAND[boss], t = rs.map((r) => r.killS ?? r.combatS), hv = rs.map((r) => r.heavyN || 0), sh = rs.flatMap((r) => Object.values(r.heavyBy || {}).flatMap((e) => [e.min, e.max]));
  const c = Bc[boss + cls] = { t: med(t), tR: t, hv: med(hv), hvR: hv, low: med(rs.map((r) => r.minLife)), lowR: rs.map((r) => r.minLife), u30: med(rs.map((r) => r.under30S)), u30R: rs.map((r) => r.under30S), deaths: rs.reduce((s, r) => s + r.deaths, 0), w3: Math.max(...rs.map((r) => r.worst3 || 0)), rested: rs.filter((r) => r.killed).length, n: rs.length, shMin: sh.length ? Math.min(...sh) : null, shMax: sh.length ? Math.max(...sh) : null };
  P(`| ${boss}, ${cls} | ${c.n} | ${f1(c.t)} s (${range(c.tR, (v) => Math.round(v))}) ${ok(c.t >= b.t[0] && c.t <= b.t[1])}; every run in ${b.tAll.join('-')}: ${ok(c.tR.every((v) => v >= b.tAll[0] && v <= b.tAll[1]))} | ${f1(c.hv)} (${range(c.hvR, (v) => v)}) ${ok(c.hv >= b.hv[0] && c.hv <= b.hv[1])} | ${c.shMin == null ? '-' : pc(c.shMin) + '-' + pc(c.shMax)} ${ok(c.shMax == null ? null : c.shMin >= 0.12 - 0.005 && c.shMax <= 0.18 + 0.005)}, none over 20%: ${ok(c.shMax == null ? null : c.shMax <= 0.2005)} | ${pc(c.low)} (${range(c.lowR.map((v) => v * 100), (v) => Math.round(v))}) ${ok(c.low >= b.low[0] && c.low <= b.low[1])} | ${f1(c.u30)} (${range(c.u30R)}) ${ok(c.u30 >= b.u30[0] && c.u30 <= b.u30[1])} | ${c.deaths} | ${pc(c.w3)} ${ok(c.w3 <= 0.4)} | ${c.rested}/${c.n} |`);
}
P();
P('Blows landed across classes (within +-30% of the three classes\' mean):');
P();
for (const boss of ['kallisto', 'kelados']) {
  const cs = CLS.map((cls) => Bc[boss + cls]).filter(Boolean); if (cs.length < 3) continue;
  const m = mean(cs.map((c) => c.hv));
  P(`- ${boss}: mean ${f1(m)}; ${CLS.map((cls, i) => `${cls} ${f1(cs[i].hv)} (${m ? Math.round((cs[i].hv / m - 1) * 100) : 0}%)`).join(', ')}: ${ok(m ? cs.every((c) => Math.abs(c.hv / m - 1) <= 0.3) : null)}`);
}
P();
P('What the fights did (sums over the cell\'s runs): heavy blows by move, by where she stood from the boss, slides, the lessons, the AI\'s own tally');
P();
P('| boss, class | heavy by move | by band (reach / between / beyond 8 m) | slides her / boss / on her; sluices; washed | lessons | AI tally |');
P('|---|---|---|---|---|---|');
for (const boss of ['kallisto', 'kelados']) for (const cls of CLS) {
  const rs = by('B', { boss, cls }); if (!rs.length) continue;
  const hb = {}, bb = { reach: 0, mid: 0, far: 0 }, sl = { her: 0, boss: 0, taken: 0, sluices: 0, washed: 0 }, ls = {}, ai = {};
  for (const r of rs) {
    for (const [k, e] of Object.entries(r.heavyBy || {})) hb[k] = (hb[k] || 0) + e.n;
    for (const [k, e] of Object.entries(r.byBand || {})) bb[k] = (bb[k] || 0) + e.n;
    for (const k in sl) sl[k] += r.slides?.[k] || 0;
    for (const k in r.lessons || {}) if (typeof r.lessons[k] === 'number') ls[k] = +((ls[k] || 0) + r.lessons[k]).toFixed(1); else if (r.lessons[k]) ls[k] = true;
    for (const [k, v] of Object.entries(r.ai7 || {})) { const kk = k.split(':')[1]; if (/^(chargeStone|chargeOpen|chargeSlush|kneel|sluice\d|tremorCover|wheel|charge2|chutes\d|rocks\d|dazed)$/.test(kk)) ai[kk] = (ai[kk] || 0) + v; }
  }
  P(`| ${boss}, ${cls} | ${Object.entries(hb).map(([k, v]) => k + ' ' + v).join(', ')} | ${bb.reach} / ${bb.mid} / ${bb.far} | ${sl.her} / ${sl.boss} / ${sl.taken}; ${sl.sluices}; ${sl.washed} | ${JSON.stringify(ls)} | ${JSON.stringify(ai)} |`);
}
P();
P('## Run C: is anything held by a clock? (the warden class on Warden, what she deals doubled; the time must fall to 50-65%)');
P();
P('| boss | run B time, median | run C times | C / B | band 50-65% | heavy blows (B / C) |');
P('|---|---|---|---|---|---|');
for (const boss of ['kallisto', 'kelados']) {
  const rs = by('C', { boss, cls: 'warden' }); if (!rs.length) continue;
  const b = Bc[boss + 'warden'], t = rs.map((r) => r.killS ?? r.combatS), k = b ? med(t) / b.t : null;
  P(`| ${boss} | ${f1(b?.t)} s | ${t.map((v) => Math.round(v)).join(', ')} s | ${k == null ? '-' : Math.round(k * 100) + '%'} | ${ok(k == null ? null : k >= 0.5 && k <= 0.65)} | ${b ? f1(b.hv) : '-'} / ${f1(med(rs.map((r) => r.heavyN || 0)))} |`);
}
P();
const bad = rows.filter((r) => !r.ok || r.err);
P(`Runs: ${rows.length}; with an error or not rested: ${bad.length}${bad.length ? ' (' + bad.map((r) => r.id + ': ' + (r.err || 'not rested')).join('; ') + ')' : ''}.`);
console.log(out.join('\n'));
