// The Names and the Call, the rules alone: node tools/check-names7.mjs
// Plain Node, no browser: src/game/names7.js imports nothing. Asserts the contract's rules N1-N5, N8 (shape), C2-C4 and
// the blow cap's table (docs/act7-contract.md, "The Names", "The Call", "Co-op", "Saves"), and part 3's six example
// builds (docs/act7-design/30-mechanics-progression.md, "Two example builds per class"). Exit 1 on any failure.
import { readFileSync } from 'node:fs';
import * as M from '../src/game/names7.js';
const { N7, N7_BY, N7_IDS, N7_SLOT_COST, N7_DEEP_COST, N7_CALL, N7_FLASK, N7blank, migrate7, N7learned, N7learn, N7open, N7said, N7says, N7spent, N7slotCost, N7openSlot, N7deepen, N7say, N7unsay, N7freeReady, N7useFree, N7respec, N7rt, N7onSkill, N7weave, N7stand, N7onDodge, N7dodged, N7onDrink, N7onHit, N7ctx, N7mods, N7call, N7callStart, N7callActive, N7callLeft, N7callReady, N7callFlare, N7callVisit, N7nm, N7fromNm, N7blowCap } = M;

let n = 0; const fails = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b) => Math.abs(a - b) < 1e-9;
function is(name, got, want) { n++; const good = typeof want === 'number' && typeof got === 'number' ? near(got, want) : eq(got, want); if (!good) fails.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
const yes = (name, v) => is(name, !!v, true);
const refused = (name, r, why) => is(name, [r.ok, r.why], [false, why]);
const done = (name, r) => is(name, [r.ok, r.why], [true, null]);

// a level-50 hero of her own game at quest q with these flags and Mastery levels (points: all free)
const hero = (q = 40, flags = {}, mlvl = 0) => { const h = { cls: 'warden', level: 50, mlvl, quest: q, flags, points: 49 + mlvl }; migrate7(h); return h; };
const ALL = { remembered: true, landing6: true, asgerRest: true, ivarEcho7: true };
const earned = (h) => Math.max(0, h.level - 1) + (h.mlvl || 0);
// a hero saying these Names (deep: all of them Deep), paid for from her points
function build(ids, deep = true, mlvl = 10) {
  const h = hero(40, ALL, mlvl);
  for (let i = 1; i < ids.length; i++) done('build slot ' + i, N7openSlot(h));
  ids.forEach((id, i) => done('build say ' + id, N7say(h, id, i, { town: true })));
  if (deep) for (const id of ids) done('build deep ' + id, N7deepen(h, id));
  return h;
}

// ---------- the table ----------
is('seven Names', N7_IDS, ['arna', 'isarn', 'pherousa', 'einar', 'keyx', 'asger', 'ivar']);
const UNLOCK = { arna: { quest: 40 }, isarn: { quest: 40 }, pherousa: { quest: 40 }, einar: { flag: 'remembered' }, keyx: { flag: 'landing6' }, asger: { flag: 'asgerRest' }, ivar: { flag: 'ivarEcho7' } };
const PLAY = { arna: 'open', isarn: 'drink', pherousa: 'hold', einar: 'far', keyx: 'dodge', asger: 'weave', ivar: 'stand' };
for (const N of N7) {
  yes(N.id + ' has a Kept rule', N.kept && typeof N.kept.when === 'string');
  yes(N.id + ' has a Deep rule', N.deep && typeof N.deep.when === 'string');
  yes(N.id + ' has a Call rule', N.call && Object.keys(N.call).length > 0);
  is(N.id + ' text keys', [N.d, N.d2], ['name7.' + N.id + '.d', 'name7.' + N.id + '.d2']);
  is(N.id + ' deed key', N.how, UNLOCK[N.id].flag ? 'name7.' + N.id + '.how' : null);
  yes(N.id + ' name key', typeof N.nameKey === 'string' && N.nameKey.includes('.'));
  is(N.id + ' unlock', N.unlock, UNLOCK[N.id]);
  is(N.id + ' play style', N.play, PLAY[N.id]);
  // N8: one condition, one number: no rule is "always" but Isarn's flask, which the contract writes so
  if (N.id !== 'isarn') yes(N.id + ' Kept is conditional', N.kept.when !== 'always');
  yes(N.id + ' Deep is conditional', N.deep.when !== 'always');
}
is('Arna Kept', [N7_BY.arna.kept.dmg, N7_BY.arna.deep.within, N7_BY.arna.deep.refundSlowest, N7_BY.arna.call.foeFullEvery], [1.4, 4, 0.15, 3]);
is('Isarn', [N7_BY.isarn.kept.flaskCd, N7_FLASK, N7_BY.isarn.deep.within, N7_BY.isarn.deep.hurt, N7_BY.isarn.call.flaskCd], [12, 18, 4, 0.7, 6]);
is('Pherousa', [N7_BY.pherousa.kept.res, N7_BY.pherousa.kept.dmg, N7_BY.pherousa.deep.costK, N7_BY.pherousa.call.resFloor], [70, 1.18, 0.85, 70]);
is('Einar', [N7_BY.einar.kept.over, N7_BY.einar.kept.dmg, N7_BY.einar.deep.reveal], [9, 1.2, 2]);
is('Keyx', [N7_BY.keyx.kept.within, N7_BY.keyx.kept.dmg, N7_BY.keyx.call.dodgeCdK], [2, 1.6, 0.5]);
is('Asger', [N7_BY.asger.kept.per, N7_BY.asger.kept.max, N7_BY.asger.kept.fall, N7_BY.asger.deep.basicResK], [0.1, 3, 6, 2]);
is('Ivar', [N7_BY.ivar.kept.per, N7_BY.ivar.kept.hurtPer, N7_BY.ivar.kept.max, N7_BY.ivar.kept.hold, N7_BY.ivar.kept.end], [0.06, 0.05, 4, 1, 3]);
// the shipped flask is still 18 s (a warning only: data.js is another builder's)
try { if (!/POTION\s*=\s*\{\s*cd:\s*18\b/.test(readFileSync(new URL('../src/game/data.js', import.meta.url), 'utf8'))) console.log('note: data.js POTION.cd is no longer 18; N7_FLASK says 18'); } catch (e) { /* not there */ }

// ---------- costs (N1, N2) ----------
is('slot costs', N7_SLOT_COST, [0, 6, 12]);
is('Deep cost', N7_DEEP_COST, 8);
is('three Deep Names said', N7spent(build(['arna', 'isarn', 'pherousa'])), 42);
{ const h = hero(40, ALL, 30); N7openSlot(h); N7openSlot(h); for (const id of N7_IDS) N7deepen(h, id); is('every Name Deep', N7spent(h), 74); is('points left', h.points, 79 - 74); }
is('nothing bought', N7spent(hero()), 0);
is('no names field', N7spent({}), 0);

// ---------- saves: the fields and the migration ----------
is('blank', N7blank(), { learnt: [], said: [null, null, null], deep: [], slots: 1, free: 0 });
{ const h = {}; migrate7(h); is('an empty hero', h.names, N7blank()); is('says nothing', N7said(h), []); is('mods neutral', N7mods(h, { foeFull: true, res: 100, dist: 20 }).dmg, 1); is('cap 1', N7blowCap(h), 1); yes('tab hidden', !N7open(h)); }
{ const h = { quest: 39, flags: { remembered: true }, names: null }; migrate7(h); is('quest 39 learns only the deed', h.names.learnt, ['einar']); is('nothing said before q40', h.names.said, [null, null, null]); is('no free respec before q40', h.names.free, 0); }
{ const h = { quest: 40, flags: {} }; migrate7(h); is('q40: the three given', h.names.learnt, ['arna', 'isarn', 'pherousa']); is('q40: Arna in slot 1', h.names.said, ['arna', null, null]); is('q40: free respec given', h.names.free, 1); yes('tab shown', N7open(h)); }
{ const h = { quest: 44, flags: ALL, names: { learnt: ['arna', 'bogus', 7, 'arna'], said: ['keyx', 'keyx', 'ivar', 'einar'], deep: ['nope', 'keyx', 'keyx'], slots: 2, free: 9 } }; migrate7(h);
  is('unknown ids dropped, said cut to slots, one slot a Name', h.names, { learnt: N7_IDS, said: ['keyx', null, null], deep: ['keyx'], slots: 2, free: 2 }); }
{ const h = { quest: 44, flags: {}, names: { learnt: [], said: 'x', deep: 5, slots: 99, free: -3 } }; migrate7(h); is('garbage made safe', [h.names.slots, h.names.deep, h.names.said], [3, [], ['arna', null, null]]); }
{ const h = { quest: 44, flags: {}, names: { learnt: ['ivar'], said: ['ivar', null, null], deep: ['ivar'], slots: 1, free: 2 } }; migrate7(h); yes('what was learnt stays learnt', h.names.learnt.includes('ivar')); is('and stays said', h.names.said[0], 'ivar'); }
{ const h = hero(40, ALL, 10); const a = JSON.stringify(h.names); migrate7(h); migrate7(h); is('migration is stable', JSON.stringify(h.names), a); }

// ---------- learning (N5) ----------
is('learned from flags', N7learned({ quest: 12, flags: { landing6: true, asgerRest: true } }), ['keyx', 'asger']);
is('haldaOut gives the three', N7learned({ quest: 39, flags: { haldaOut: true } }), ['arna', 'isarn', 'pherousa']);
{ const h = hero(39); const r1 = N7learn(h); is('before q40: nothing', [r1.fresh, r1.given], [[], false]);
  h.quest = 40; const r2 = N7learn(h); is('at q40', [r2.fresh, r2.given], [['arna', 'isarn', 'pherousa'], true]);
  const r3 = N7learn(h); is('given once', [r3.fresh, r3.given], [[], false]);
  h.flags.ivarEcho7 = true; const r4 = N7learn(h); is('Ivar learnt by his echo', [r4.fresh, r4.given, h.names.learnt], [['ivar'], false, ['arna', 'isarn', 'pherousa', 'ivar']]); }
// a guest: the view carries the host's flags and quest; her own record decides
{ const real = { quest: 12, flags: {} }; migrate7(real); const view = { quest: 45, flags: ALL, names: real.names, __real: real };
  is('a guest learns nothing from the host', [N7learn(view).fresh, real.names.learnt, N7learned(view)], [[], [], []]); yes('her tab stays hidden', !N7open(view)); }

// ---------- say, deepen, open a slot: transitions and refusals (N1, N3) ----------
{ const h = hero(40, { remembered: true });
  refused('an unlearnt Name is not said', N7say(h, 'keyx', null, { town: true }), 'unlearnt');
  refused('an unknown Name', N7say(h, 'zeus', null, { town: true }), 'unknown');
  refused('an unlearnt Name is not made Deep', N7deepen(h, 'ivar'), 'unlearnt');
  refused('out of the village', N7say(h, 'isarn', 0), 'town');
  refused('a shut slot', N7say(h, 'isarn', 1, { town: true }), 'slot');
  refused('no fourth slot', N7say(h, 'isarn', 3, { town: true }), 'unknown');
  refused('slot 1 full, none named', N7say(h, 'isarn', null, { town: true }), 'full');
  done('replace slot 1', N7say(h, 'isarn', 0, { town: true })); is('replaced', h.names.said, ['isarn', null, null]);
  is('next slot costs', N7slotCost(h), 6);
  h.points = 5; refused('slot 2 without six points', N7openSlot(h), 'points'); is('nothing taken', [h.points, h.names.slots], [5, 1]);
  h.points = 49; done('slot 2 opens anywhere', N7openSlot(h)); is('six taken', [h.points, h.names.slots], [43, 2]);
  done('first free slot', N7say(h, 'einar', null, { town: true })); is('in slot 2', h.names.said, ['isarn', 'einar', null]);
  done('already said: nothing moves', N7say(h, 'einar', null, { town: true })); is('still', h.names.said, ['isarn', 'einar', null]);
  done('said elsewhere: the two swap', N7say(h, 'einar', 0, { town: true })); is('swapped', h.names.said, ['einar', 'isarn', null]);
  is('next slot costs', N7slotCost(h), 12);
  h.points = 11; refused('slot 3 without twelve', N7openSlot(h), 'points');
  h.points = 43; done('slot 3', N7openSlot(h)); is('twelve taken', [h.points, h.names.slots], [31, 3]);
  refused('no fourth slot to open', N7openSlot(h), 'full'); is('no price', N7slotCost(h), null);
  h.points = 7; refused('Deep without eight', N7deepen(h, 'einar'), 'points');
  h.points = 31; done('Deep anywhere', N7deepen(h, 'einar')); is('eight taken', h.points, 23);
  refused('Deep twice', N7deepen(h, 'einar'), 'deep'); is('not charged twice', h.points, 23);
  done('a Name not said can be made Deep', N7deepen(h, 'pherousa'));
  is('said', N7said(h), [{ id: 'einar', deep: true, slot: 0 }, { id: 'isarn', deep: false, slot: 1 }]);
  refused('unsay out of the village', N7unsay(h, 'isarn'), 'town');
  done('unsay', N7unsay(h, 'isarn', { town: true })); is('unsaid', h.names.said, ['einar', null, null]);
  refused('unsay what is not said', N7unsay(h, 'isarn', { town: true }), 'unsaid');
  yes('says', N7says(h, 'einar') && !N7says(h, 'isarn'));
  is('books', earned(h) - h.points, N7spent(h)); }
{ const h = hero(39); refused('no slot before q40', N7openSlot(h), 'unknown'); }

// ---------- the respec (N4) ----------
{ const h = build(['keyx', 'arna', 'asger'], true, 10);
  is('three Deep: 42 spent', [N7spent(h), h.points], [42, earned(h) - 42]);
  yes('free respec waiting', N7freeReady(h)); done('use it', N7useFree(h)); refused('once a hero', N7useFree(h), 'free'); yes('gone', !N7freeReady(h));
  const r = N7respec(h); is('42 back', [r.ok, r.back], [true, 42]);
  is('exactly pointsEarned', h.points, earned(h));
  is('learnt kept, said shrunk to slot 1', h.names, { learnt: N7_IDS, said: ['keyx', null, null], deep: [], slots: 1, free: 2 });
  is('nothing held', N7spent(h), 0);
  migrate7(h); is('the free respec is not given again', h.names.free, 2); }
{ const h = hero(40); N7unsay(h, 0, { town: true }); N7respec(h); is('a respec with nothing said: Arna', h.names.said, ['arna', null, null]); }

// ---------- the modifiers: each Name alone, under its condition and not under its negation ----------
const solo = (id, deep = false) => { const h = hero(40, ALL, 10); done('solo ' + id, N7say(h, id, 0, { town: true })); if (deep) done('solo deep ' + id, N7deepen(h, id)); return h; };
const NEUTRAL = { dmg: 1, parts: {}, hurt: 1, flaskCd: null, flaskReady: false, costK: 1, resFloor: 0, refund: 0, reveal: 0, dodgeBack: false, dodgeCdK: 1, basicResK: 1, planted: false, arnaCall: false, stacks: { weave: 0, stand: 0 } };
const AGAINST = { foeFull: false, res: 69, dist: 9, afterDodgeS: 2.01, weave: 0, standingS: 0.99, afterDrinkS: 4.01, sinceOpenS: 4.01, crit: true, inSun: true, inShade: true, wading: true, lifeFrac: 0.1, nearHearth: true };
for (const id of N7_IDS) for (const deep of [false, true]) {
  const m = N7mods(solo(id, deep), AGAINST), want = Object.assign({}, NEUTRAL, id === 'isarn' ? { flaskCd: 12 } : {}, id === 'keyx' && deep ? { dodgeBack: true } : {});
  is(id + (deep ? ' Deep' : ' Kept') + ' played the wrong way: nothing', m, want);
  is(id + ' with no ctx', N7mods(solo(id, deep)), want);
}
// Arna
is('Arna: full life', N7mods(solo('arna'), { foeFull: true }).dmg, 1.4);
is('Arna: hurt foe', N7mods(solo('arna'), { foeFull: false }).dmg, 1);
is('Arna Kept: no refund', N7mods(solo('arna'), { sinceOpenS: 1 }).refund, 0);
is('Arna Deep: falls within 4 s', N7mods(solo('arna', true), { sinceOpenS: 4 }).refund, 0.15);
is('Arna Deep: falls later', N7mods(solo('arna', true), { sinceOpenS: 4.5 }).refund, 0);
// Isarn
is('Isarn: the flask', N7mods(solo('isarn'), {}).flaskCd, 12);
is('others: the shipped flask', N7mods(solo('arna'), {}).flaskCd, null);
is('Isarn Kept: no shield', N7mods(solo('isarn'), { afterDrinkS: 1 }).hurt, 1);
is('Isarn Deep: 4 s after a drink', N7mods(solo('isarn', true), { afterDrinkS: 4 }).hurt, 0.7);
is('Isarn Deep: later', N7mods(solo('isarn', true), { afterDrinkS: 4.1 }).hurt, 1);
is('Isarn: no damage ever', N7mods(solo('isarn', true), { afterDrinkS: 1, foeFull: true, res: 100, dist: 30, afterDodgeS: 0, weave: 3, standingS: 4 }).dmg, 1);
// Pherousa
is('Pherousa: 70 held', N7mods(solo('pherousa'), { res: 70 }).dmg, 1.18);
is('Pherousa: 69', N7mods(solo('pherousa'), { res: 69 }).dmg, 1);
is('Pherousa Kept: full cost', N7mods(solo('pherousa'), { res: 100 }).costK, 1);
is('Pherousa Deep: cheaper while held', N7mods(solo('pherousa', true), { res: 100 }).costK, 0.85);
is('Pherousa Deep: not below 70', N7mods(solo('pherousa', true), { res: 50 }).costK, 1);
// Einar
is('Einar: over 9 m', N7mods(solo('einar'), { dist: 9.01 }).dmg, 1.2);
is('Einar: at 9 m', N7mods(solo('einar'), { dist: 9 }).dmg, 1);
is('Einar Kept: no Revealed', N7mods(solo('einar'), { dist: 12, crit: true }).reveal, 0);
is('Einar Deep: a far critical', N7mods(solo('einar', true), { dist: 12, crit: true }).reveal, 2);
is('Einar Deep: far, no critical', N7mods(solo('einar', true), { dist: 12, crit: false }).reveal, 0);
is('Einar Deep: a near critical', N7mods(solo('einar', true), { dist: 5, crit: true }).reveal, 0);
// Keyx
is('Keyx: 2 s after a dodge', N7mods(solo('keyx'), { afterDodgeS: 2 }).dmg, 1.6);
is('Keyx: later', N7mods(solo('keyx'), { afterDodgeS: 2.1 }).dmg, 1);
is('Keyx: the hit already taken', N7mods(solo('keyx'), { afterDodgeS: null }).dmg, 1);
is('Keyx Kept: no refund', N7mods(solo('keyx'), { afterDodgeS: 0 }).dodgeBack, false);
is('Keyx Deep: the dodge comes back', N7mods(solo('keyx', true), {}).dodgeBack, true);
is('Keyx: cooldown whole outside the Call', N7mods(solo('keyx', true), { afterDodgeS: 0 }).dodgeCdK, 1);
// Asger
is('Asger: stacks', [0, 1, 2, 3, 7].map((w) => N7mods(solo('asger'), { weave: w }).dmg), [1, 1.1, 1.2, 1.3, 1.3]);
is('Asger Kept: plain resource', N7mods(solo('asger'), { weave: 3 }).basicResK, 1);
is('Asger Deep at three', N7mods(solo('asger', true), { weave: 3 }).basicResK, 2);
is('Asger Deep at two', N7mods(solo('asger', true), { weave: 2 }).basicResK, 1);
// Ivar
is('Ivar: damage by the second', [0.5, 1, 2.9, 3, 4, 60].map((s) => N7mods(solo('ivar'), { standingS: s }).dmg), [1, 1.06, 1.12, 1.18, 1.24, 1.24]);
is('Ivar: hurt by the second', [0, 1, 2, 3, 4, 60].map((s) => N7mods(solo('ivar'), { standingS: s }).hurt), [1, 0.95, 0.9, 0.85, 0.8, 0.8]);
is('Ivar Kept: can be moved', N7mods(solo('ivar'), { standingS: 4 }).planted, false);
is('Ivar Deep at four', N7mods(solo('ivar', true), { standingS: 4 }).planted, true);
is('Ivar Deep at three', N7mods(solo('ivar', true), { standingS: 3.9 }).planted, false);
// a Name learnt and not said does nothing
{ const h = solo('arna'); is('unsaid Names are silent', N7mods(h, { res: 100, dist: 30, afterDodgeS: 0, weave: 3, standingS: 4 }), NEUTRAL); }
// a Name in a slot she has not opened does nothing
{ const h = solo('arna'); h.names.said = ['arna', 'keyx', 'ivar']; is('a shut slot is silent', [N7said(h).length, N7mods(h, { afterDodgeS: 0, standingS: 4 }).dmg], [1, 1]); }

// ---------- the six example builds (part 3): three Deep Names, 42 points, played their way ----------
const WAY = { foeFull: true, res: 80, dist: 12, afterDodgeS: 0.5, weave: 3, standingS: 4, afterDrinkS: 1, sinceOpenS: 2, crit: true };
const BUILDS = {
  'Warden, the Post': { says: ['ivar', 'isarn', 'pherousa'], dmg: 1.24 * 1.18, hurt: 0.8 * 0.7, cap: 1.24 * 1.18, more: { flaskCd: 12, costK: 0.85, planted: true } },
  'Warden, the Roll': { says: ['keyx', 'arna', 'asger'], dmg: 1.6 * 1.4 * 1.3, hurt: 1, cap: 1.6 * 1.4 * 1.3, more: { dodgeBack: true, refund: 0.15, basicResK: 2 } },
  'Ranger, the Far Shot': { says: ['einar', 'arna', 'pherousa'], dmg: 1.2 * 1.4 * 1.18, hurt: 1, cap: 1.2 * 1.4 * 1.18, more: { reveal: 2, refund: 0.15, costK: 0.85 } },
  'Ranger, the Weave': { says: ['asger', 'keyx', 'isarn'], dmg: 1.3 * 1.6, hurt: 0.7, cap: 1.3 * 1.6, more: { flaskCd: 12, dodgeBack: true, basicResK: 2 } },
  'Mage, the Lighthouse': { says: ['ivar', 'pherousa', 'einar'], dmg: 1.24 * 1.18 * 1.2, hurt: 0.8, cap: 1.24 * 1.18 * 1.2, more: { costK: 0.85, reveal: 2, planted: true } },
  'Mage, the Storm-step': { says: ['asger', 'keyx', 'arna'], dmg: 1.3 * 1.6 * 1.4, hurt: 1, cap: 1.3 * 1.6 * 1.4, more: { dodgeBack: true, refund: 0.15, basicResK: 2 } }
};
for (const name in BUILDS) {
  const B = BUILDS[name], h = build(B.says, true, 10), m = N7mods(h, WAY);
  is(name + ': 42 points', [N7spent(h), earned(h) - h.points], [42, 42]);
  is(name + ': damage its way', m.dmg, B.dmg);
  is(name + ': hurt its way', m.hurt, B.hurt);
  is(name + ': blow cap', N7blowCap(h), B.cap);
  for (const k in B.more) is(name + ': ' + k, m[k], B.more[k]);
  is(name + ': the wrong way', N7mods(h, AGAINST).dmg, 1);
  is(name + ': the wrong way, hurt', N7mods(h, AGAINST).hurt, 1);
  // Kept only: the same damage, none of the Deep rules
  const k = build(B.says, false, 10), mk = N7mods(k, WAY);
  is(name + ' Kept: 18 points', N7spent(k), 18);
  is(name + ' Kept: damage', mk.dmg, B.dmg);
  is(name + ' Kept: no Deep rule', [mk.costK, mk.refund, mk.reveal, mk.dodgeBack, mk.basicResK, mk.planted], [1, 0, 0, false, 1, false]);
  // the Call makes every condition true and raises no number
  is(name + ': the Call alone', N7mods(h, { called: true }).dmg, B.dmg);
  is(name + ': the Call adds nothing to the way', N7mods(h, Object.assign({ called: true }, WAY)).dmg, B.dmg);
}
is('the Far Shot, as part 3 writes it', +N7mods(build(['einar', 'arna', 'pherousa']), WAY).dmg.toFixed(4), 1.9824);

// ---------- the Call (C2-C4) ----------
is('the Call: 20 s, 90 s apart, +30% with no Name', [N7_CALL.dur, N7_CALL.gap, N7_CALL.none], [20, 90, 1.3]);
{ const h = build(['keyx', 'isarn', 'pherousa'], true), rt = N7rt(), st = rt.call;
  yes('not called at first', !N7callActive(st, 0)); done('ready', N7callReady(st, 100, 'h1'));
  const r = N7call(st, 100, 'h1', h); is('the Call begins', [r.ok, r.dur, r.until, r.none, r.flaskReady], [true, 20, 120, false, true]);
  yes('alias', N7callStart === N7call);
  yes('active at once', N7callActive(st, 100)); yes('active at 19.9 s', N7callActive(st, 119.9)); yes('over at 20 s', !N7callActive(st, 120));
  is('seconds left', [N7callLeft(st, 100), N7callLeft(st, 112.5), N7callLeft(st, 300)], [20, 7.5, 0]);
  refused('the same hearth again', N7call(st, 500, 'h1', h), 'spent');
  { const x = N7call(st, 150, 'h2', h); is('another hearth within 90 s', [x.ok, x.why, x.wait], [false, 'soon', 40]); }
  refused('at 89.9 s', N7call(st, 189.9, 'h2', h), 'soon'); refused('ready says so too', N7callReady(st, 189.9, 'h2'), 'soon');
  done('at 90 s', N7call(st, 190, 'h2', h));
  // the arena hearth flares again once: unspent, the 90 s as written unless waived
  N7callFlare(st, 'h2'); refused('a flare inside 90 s', N7call(st, 240, 'h2', h), 'soon'); done('a flare after 90 s', N7call(st, 280, 'h2', h));
  N7callFlare(st, 'h2', { waive: true }); done('a waived flare', N7call(st, 285, 'h2', h));
  N7callVisit(st); refused('a new visit: the 90 s stand', N7call(st, 300, 'h1', h), 'soon'); done('a new visit: the hearth is fresh', N7call(st, 400, 'h1', h));
  // what the Call makes true
  const m = N7mods(h, { called: true, res: 0 });
  is('Call: Keyx, Pherousa', [m.dmg, m.dodgeCdK, m.resFloor, m.costK, m.flaskCd, m.flaskReady], [1.6 * 1.18, 0.5, 70, 0.85, 6, true]);
  is('Call: Isarn Deep still needs the drink', [m.hurt, N7mods(h, { called: true, afterDrinkS: 1 }).hurt], [1, 0.7]); }
{ const k = build(['asger', 'ivar', 'einar'], false), d = build(['asger', 'ivar', 'einar'], true), mk = N7mods(k, { called: true, crit: true }), md = N7mods(d, { called: true, crit: true });
  is('Call: at three, at four, far', [mk.dmg, mk.hurt, mk.stacks], [1.3 * 1.24 * 1.2, 0.8, { weave: 3, stand: 4 }]);
  is('Call: Kept gets no Deep rule', [mk.basicResK, mk.planted, mk.reveal], [1, false, 0]);
  is('Call: Deep gets it', [md.basicResK, md.planted, md.reveal], [2, true, 2]); }
{ const h = solo('arna'), rt = N7rt();
  is('Call: any foe counts as full', N7mods(h, N7ctx(rt, 10, { called: true, foeFull: false })).dmg, 1.4);
  const m = N7mods(h, N7ctx(rt, 10, { called: true, foeFull: false })); yes('marked as the Call\'s', m.arnaCall); N7onHit(rt, 10, m);
  is('Call: once each 3 s', [N7mods(h, N7ctx(rt, 12.9, { called: true })).dmg, N7mods(h, N7ctx(rt, 13, { called: true })).dmg], [1, 1.4]);
  is('Call: a foe truly full still pays', N7mods(h, N7ctx(rt, 11, { called: true, foeFull: true })).dmg, 1.4);
  yes('and is not the Call\'s', !N7mods(h, N7ctx(rt, 11, { called: true, foeFull: true })).arnaCall); }
{ const h = hero(12), st = N7rt().call, r = N7call(st, 0, 'a', h);
  is('no Name said: the Call still answers', [r.ok, r.none, r.flaskReady], [true, true, false]);
  is('no Name: +30% in the Call', [N7mods(h, { called: true }).dmg, N7mods(h, { called: false }).dmg, N7mods(h, { called: true }).hurt], [1.3, 1, 1]);
  is('a Name said: no +30%', N7mods(solo('isarn'), { called: true }).dmg, 1); }

// ---------- the runtime: the weave, the post, the dodge ----------
{ const rt = N7rt();
  is('weave', [N7onSkill(rt, 'a', 0), N7onSkill(rt, 'a', 1), N7onSkill(rt, 'b', 2), N7onSkill(rt, 'a', 3), N7onSkill(rt, 'c', 4)], [1, 1, 2, 3, 3]);
  is('weave holds 6 s', [N7weave(rt, 10), N7weave(rt, 10.1)], [3, 0]);
  is('weave begins again', N7onSkill(rt, 'c', 11), 1); }
{ const rt = N7rt(); N7stand(rt, 0, 0, 0.1);
  for (let i = 0; i < 25; i++) N7stand(rt, 0.5, 0, 0.1); is('stood 2.5 s within 1 m', +rt.standS.toFixed(3), 2.5);
  N7stand(rt, 2, 0, 0.5); is('between 1 and 3 m: neither', +rt.standS.toFixed(3), 2.5);
  N7stand(rt, 3.5, 0, 0.5); is('3 m ends it', rt.standS, 0);
  for (let i = 0; i < 100; i++) N7stand(rt, 3.5, 0, 0.1); is('capped at four', rt.standS, 4);
  N7stand(rt, 20, 0, 0.1, true); is('in the Call moving does not end it', rt.standS, 4);
  N7stand(rt, 40, 0, 0.1); is('after it, it does', rt.standS, 0); }
{ const h = solo('keyx', true), rt = N7rt();
  is('no dodge yet', N7mods(h, N7ctx(rt, 5)).dmg, 1);
  N7onDodge(rt, 10); const m = N7mods(h, N7ctx(rt, 11)); is('after a dodge', m.dmg, 1.6);
  N7onHit(rt, 11, m); is('the next hit only', N7mods(h, N7ctx(rt, 11.2)).dmg, 1);
  is('one refund a dodge', [N7dodged(rt), N7dodged(rt)], [true, false]);
  N7onDodge(rt, 20); is('window shut at 2 s', [N7mods(h, N7ctx(rt, 22)).dmg, N7mods(h, N7ctx(rt, 22.1)).dmg], [1.6, 1]); yes('a new dodge, a new refund', N7dodged(rt));
  const i = solo('isarn', true); N7onDrink(rt, 30); is('drink window', [N7mods(i, N7ctx(rt, 34)).hurt, N7mods(i, N7ctx(rt, 34.1)).hurt], [0.7, 1]); }

// ---------- co-op: the blow cap's table and the look's three bytes ----------
is('ceilings', Object.fromEntries(N7.map((x) => [x.id, x.cap])), { arna: 1.4, isarn: 1, pherousa: 1.18, einar: 1.2, keyx: 1.6, asger: 1.3, ivar: 1.24 });
for (const N of N7) is('cap alone: ' + N.id, N7blowCap(solo(N.id, true)), N.cap);
{ let top = 0, who = null; for (const a of N7_IDS) for (const b of N7_IDS) for (const c of N7_IDS) if (a < b && b < c) { const k = N7_BY[a].cap * N7_BY[b].cap * N7_BY[c].cap; if (k > top) { top = k; who = [a, b, c]; } }
  is('the highest three', who.sort(), ['arna', 'asger', 'keyx']); is('at most 2.912', top, 2.912); yes('under the contract\'s 2.92', top <= 2.92); }
{ const h = build(['keyx', 'arna', 'asger'], true), nm = N7nm(h);
  is('nm bytes', nm, [5 + 8, 1 + 8, 6 + 8]); is('nm read back', N7fromNm(nm), [{ id: 'keyx', deep: true }, { id: 'arna', deep: true }, { id: 'asger', deep: true }]);
  is('cap from nm', N7blowCap(nm), 2.912); is('cap from the hero', N7blowCap(h), 2.912);
  is('the Call adds nothing', N7blowCap(h), N7blowCap(nm));
  is('a guest cannot send more', [N7blowCap([5, 5, 5]), N7blowCap([255, 99, -1]), N7blowCap([5, 1, 6, 7, 4]), N7blowCap('x'), N7blowCap([0, 0, 0])], [1.6, N7blowCap([7, 3, 0]), 2.912, 1, 1]);
  is('Kept and Deep: the same ceiling', N7blowCap([5, 1, 6]), N7blowCap([13, 9, 14])); }
is('nm of a hero with no Names', N7nm({}), [0, 0, 0]);

// ---------- the text table: every key the module names is in docs/act7-design/60-text-names.md ----------
try {
  const doc = readFileSync(new URL('../docs/act7-design/60-text-names.md', import.meta.url), 'utf8'), keys = new Set(), bad = [];
  let on = false;
  for (const line of doc.split('\n')) {
    if (line.startsWith('## ')) on = line.startsWith('## Names text keys');
    if (!on || !line.startsWith('|')) continue;
    const c = line.split(/(?<!\\)\|/).slice(1, -1).map((x) => x.trim());
    if (!/^`[A-Za-z0-9_@-]+\.[A-Za-z0-9_.@-]+`$/.test(c[0] || '')) continue;
    if (c.length !== 3 || !c[1] || !c[2]) bad.push(c[0]);
    keys.add(c[0].slice(1, -1));
  }
  is('text rows with three columns', bad, []);
  const need = ['prog.tab.names', 'name7.h', 'name7.sub', 'name7.say', 'name7.unsay', 'name7.deepen', 'name7.slot', 'name7.kept', 'name7.deep', 'name7.town', 'name7.locked', 'name7.given', 'name7.learnt', 'name7.free', 'call.prompt', 'call.on', 'call.none', 'call.spent', 'call.again', 'hud.call'];
  for (const N of N7) { need.push(N.d, N.d2); if (N.how) need.push(N.how); if (N.nameKey.startsWith('name7.')) need.push(N.nameKey); }
  for (const k of Object.values(M.N7WHY)) if (k) need.push(k);
  is('text keys missing from the table', need.filter((k) => !keys.has(k)), []);
  yes('no forbidden word', !/κατολίσθηση|Κατολίσθηση|Κάλεσμα|κάλεσμα/.test(doc));
} catch (e) { fails.push('docs/act7-design/60-text-names.md: ' + e.message); }

console.log(`check-names7: ${n} checks, ${fails.length} failed`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
