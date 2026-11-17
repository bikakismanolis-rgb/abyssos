// Act VII's first, reduced balance pass (docs/act7-contract.md, The balance campaign; Zone danger; The bosses):
//   node mkplan.mjs > plan.json
//   A   both zones x three classes x Warden (diff 1), 2 runs a cell: level 50, Mastery 4 (thaw) / 8 (tarn) spent on Might
//       and Vigor in turn with every other spare point (job.mast), gear four levels behind (gearK 4), eight packs a zone
//   A0  Wanderer (diff 0), the warden class, 2 runs a zone: level 47, no Mastery levels (part 2's profile table)
//   B   both bosses x three classes x Warden, 2 runs a cell: level 50, Mastery 6 (Kallisto) / 10 (Kelados)
//   C   run C, the warden class on Warden at both bosses with what the bot deals doubled (job.dmgK 2), 2 runs a boss
// Seeds 1000 + r x 7919 (the contract's), so a cell's run r is the same layout in every set.
const out = [];
const job = (set, zone, boss, cls, lvl, diff, r, x = {}) => ({ id: `${set}-${boss || zone}-${cls}-L${lvl}-d${diff}${x.dmgK ? '-k' + x.dmgK : ''}-r${r}`, set, act: 7, zone, boss, cls, lvl, diff, packs: 8, seed: 1000 + r * 7919, gearK: 4, mast: true, ...x });
const CLS = ['warden', 'ranger', 'mage'];
const set = process.argv[2] || 'all';
if (set === 'all' || set === 'A') for (let r = 0; r < 2; r++) for (const cls of CLS) for (const [zone, mlvl] of [['thaw', 4], ['tarn', 8]]) out.push(job('A', zone, null, cls, 50, 1, r, { mlvl }));
if (set === 'all' || set === 'A') for (let r = 0; r < 2; r++) for (const zone of ['thaw', 'tarn']) out.push(job('A0', zone, null, 'warden', 47, 0, r));
if (set === 'all' || set === 'B') for (let r = 0; r < 2; r++) for (const cls of CLS) for (const [zone, boss, mlvl] of [['thaw', 'kallisto', 6], ['tarn', 'kelados', 10]]) out.push(job('B', zone, boss, cls, 50, 1, r, { mlvl }));
if (set === 'all' || set === 'C') for (let r = 0; r < 2; r++) for (const [zone, boss, mlvl] of [['thaw', 'kallisto', 6], ['tarn', 'kelados', 10]]) out.push(job('C', zone, boss, 'warden', 50, 1, r, { mlvl, dmgK: 2 }));
console.log(JSON.stringify(out));
