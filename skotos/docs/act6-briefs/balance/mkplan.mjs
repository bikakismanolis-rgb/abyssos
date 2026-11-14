// The Act VI balance campaign's plan (docs/act6-design.md, Bosses; the contract's G3): node mkplan.mjs > plan.json
//   main: Act V and Act VI on the same tree and bot, the three classes, Warden difficulty n 6 and Wanderer n 12, at the
//     profile levels (Act V as integrate.md measured it: 42 / 43 / 45 / 46; Act VI at the cap's foot: 47 / 48 / 49 / 50;
//     three lower on Wanderer), gear 4 levels behind, every spare point in Might and Vigor, seeds 1000 + r x 7919
//   lamp: Acts IV and V on Warden difficulty with the Lamplight track at rank 0 and at rank 40 (n 6)
//   lost: the Shade with the seven named lamps of the Lost (n 6), against main's Shade
const out = [];
const A4 = [['ashfield', null, 34], ['ashfield', 'ivar', 35], ['forge', null, 37], ['forge', 'karthax', 38]];
const A5 = [['coast', null, 42], ['coast', 'tower', 43], ['farlight', null, 45], ['farlight', 'skotos', 46]];
const A6 = [['drained', null, 47], ['drained', 'ketos', 48], ['bottom', null, 49], ['bottom', 'shade', 50]];
const job = (set, act, zone, boss, cls, lvl, diff, r, x = {}) => ({ id: `${set}-${boss || zone}-${cls}-L${lvl}-d${diff}-r${r}`, set, act, zone, boss, cls, lvl, diff, packs: 8, seed: 1000 + r * 7919, gearK: 4, mast: true, ...x });
for (let r = 0; r < 12; r++) for (const cls of ['warden', 'ranger', 'mage']) for (const [act, F] of [[5, A5], [6, A6]]) for (const [zone, boss, lvl] of F) {
  if (r < 6) out.push(job('main', act, zone, boss, cls, lvl, 1, r));
  out.push(job('main', act, zone, boss, cls, lvl - 3, 0, r));
}
for (let r = 0; r < 6; r++) for (const cls of ['warden', 'ranger', 'mage']) {
  for (const [zone, boss, lvl] of A4) { out.push(job('lamp0', 4, zone, boss, cls, lvl, 1, r)); out.push(job('lamp40', 4, zone, boss, cls, lvl, 1, r, { lamp: 40 })); }
  for (const [zone, boss, lvl] of A5) out.push(job('lamp40', 5, zone, boss, cls, lvl, 1, r, { lamp: 40 }));
  out.push(job('lost7', 6, 'bottom', 'shade', cls, 50, 1, r, { lost: 7 }));
}
console.log(JSON.stringify(out));
