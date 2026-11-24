// Act VIII's balance campaign at full counts, every difficulty (the rules are Act VII's: docs/act7-contract.md, "The
// balance campaign"):   node mkplan.mjs > plan.json
//   A   both zones x three classes x difficulties 0-5: eight packs a zone
//   B   both bosses x three classes x difficulties 0-5
// The hero: level 52 on Warden and above, 49 on Wanderer with no Mastery; gear four levels behind; spare points in Might
// and Vigor in turn, Mastery 4 / 6 / 8 / 10 at the four cells in the order she meets them (the Tindergrass, Aithon, the
// Vigil House, Ragna). No Names. 6 runs a cell, 12 on Wanderer; seeds 1000 + r x 7919, so a cell's run r is the same
// layout on every difficulty. The cells the contract asks for come first (0, 1, 2, and 4 at the bosses), then the rest:
// Nightmare (3) and Skotos (5) at 3 runs a cell (a run there takes the bot half a minute and more; 432 runs in all).
const out = [];
const job = (set, zone, boss, cls, diff, r, mlvl) => { const lvl = diff ? 52 : 49; return { id: `${set}-${boss || zone}-${cls}-L${lvl}-d${diff}-r${r}`, set, act: 8, zone, boss, cls, lvl, diff, packs: 8, seed: 1000 + r * 7919, gearK: 4, mast: true, ...(diff ? { mlvl } : {}) }; };
const CLS = ['warden', 'ranger', 'mage'];
const CELLS = [['A', 'tinder', null, 4], ['B', 'tinder', 'aithon', 6], ['A', 'vigil', null, 8], ['B', 'vigil', 'ragna', 10]];
const add = (diffs) => { for (const diff of diffs) for (let r = 0; r < (diff === 0 ? 12 : diff === 3 || diff === 5 ? 3 : 6); r++) for (const cls of CLS) for (const [set, zone, boss, mlvl] of CELLS) { const j = job(set, zone, boss, cls, diff, r, mlvl); if (!out.some((o) => o.id === j.id)) out.push(j); } };
add([1, 0, 2]); add([4]); add([3, 5]);
console.log(JSON.stringify(out));
