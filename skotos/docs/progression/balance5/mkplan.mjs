// Act IV and Act V on Warden difficulty, without and with Mastery (every spare point in Might and Vigor), paired seeds
const RUNS = +(process.argv[2] || 3), out = [];
const FIGHTS = [['ashfield', null, 34, 4], ['ashfield', 'ivar', 35, 4], ['forge', null, 37, 4], ['forge', 'karthax', 38, 4],
  ['coast', null, 42, 5], ['coast', 'tower', 43, 5], ['farlight', null, 45, 5], ['farlight', 'skotos', 46, 5]];
for (const cls of ['warden', 'ranger', 'mage']) for (const [zone, boss, lvl, act] of FIGHTS) for (const mast of [false, true]) for (let r = 0; r < RUNS; r++)
  out.push({ id: `${boss || zone}-${cls}-L${lvl}-d1-${mast ? 'M' : 'n'}-r${r}`, zone, boss, cls, lvl, diff: 1, packs: 8, seed: 1000 + r * 7919, gearK: 4, act, ...(mast ? { mast: true } : {}) });
console.log(JSON.stringify(out));
