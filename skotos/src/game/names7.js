// Act VII: the Names («Τα Ονόματα») and the Call («Το Φώναγμα»). docs/act7-contract.md, "The Names", "The Call", "Saves",
// "Co-op" (the blow cap); docs/act7-design/30-mechanics-progression.md. Rules only: no DOM, no three.js, no import, so
// tools/check-names7.mjs runs it in plain Node. Every export starts with N7 (NAMES is light.js's) but migrate7.
//
// The hero says up to three Names. Each is one rule with one number that pays only when she fights that way (Kept), and
// a second rule bought with points (Deep). The saved record is hero.names; everything timed (the weave, the post, the
// dodge's window, the Call) lives in a runtime object the player's actor carries (N7rt()), never in the save.
//
// Every function that changes a hero returns { ok, why }: why is one of N7WHY's keys (a text key where one exists).

// ---------- the table ----------
export const N7_SLOT_COST = [0, 6, 12];   // slot 1 free, slot 2 six points, slot 3 twelve (N1)
export const N7_DEEP_COST = 8;            // a Name made Deep (N1)
export const N7_SLOTS = 3;
export const N7_QUEST = 40;               // the three given Names, slot 1 and the free respec (N1, N4)
export const N7_FLASK = 18;               // the shipped flask's seconds (data.js POTION.cd), for Isarn's "12 s, not 18"
export const N7_CALL = { dur: 20, gap: 90, none: 1.3, arnaEvery: 3, flask: 6, dodgeK: 0.5, resFloor: 70 };

// unlock: { quest } given at that quest of her own game, or { flag } read from her own flags.
// kept / deep: the effect, machine-readable. when: the one condition (a ctx test, below); the rest are its numbers.
// call: what the Call makes true. cap: the co-op blow cap's ceiling (1: no single hit is raised).
// play: the balance bot's style (job.play, N9).
export const N7 = [
  { id: 'arna', nameKey: 'npc.arna', unlock: { quest: N7_QUEST }, play: 'open', cap: 1.4,
    kept: { when: 'foeFull', dmg: 1.4 },
    deep: { when: 'fellWithin', within: 4, refundSlowest: 0.15 },
    call: { foeFullEvery: 3 } },
  { id: 'isarn', nameKey: 'name7.isarn.n', unlock: { quest: N7_QUEST }, play: 'drink', cap: 1,
    kept: { when: 'always', flaskCd: 12 },
    deep: { when: 'afterDrink', within: 4, hurt: 0.7 },
    call: { flaskReady: true, flaskCd: 6 } },
  { id: 'pherousa', nameKey: 'npc.first.named', unlock: { quest: N7_QUEST }, play: 'hold', cap: 1.18,
    kept: { when: 'resHeld', res: 70, dmg: 1.18 },
    deep: { when: 'resHeld', res: 70, costK: 0.85 },
    call: { resFloor: 70 } },
  { id: 'einar', nameKey: 'npc.einar', unlock: { flag: 'remembered' }, play: 'far', cap: 1.2,
    kept: { when: 'far', over: 9, dmg: 1.2 },
    deep: { when: 'farCrit', over: 9, reveal: 2 },
    call: { far: true } },
  { id: 'keyx', nameKey: 'npc.keyx', unlock: { flag: 'landing6' }, play: 'dodge', cap: 1.6,
    kept: { when: 'afterDodge', within: 2, dmg: 1.6 },
    deep: { when: 'dodgedBlow', dodgeBack: true },
    call: { dodgeCdK: 0.5 } },
  { id: 'asger', nameKey: 'npc.asger', unlock: { flag: 'asgerRest' }, play: 'weave', cap: 1.3,
    kept: { when: 'weave', per: 0.1, max: 3, fall: 6 },
    deep: { when: 'weaveFull', at: 3, basicResK: 2 },
    call: { stacks: 3 } },
  { id: 'ivar', nameKey: 'npc.ivar', unlock: { flag: 'ivarEcho7' }, play: 'stand', cap: 1.24,
    kept: { when: 'stand', per: 0.06, hurtPer: 0.05, max: 4, hold: 1, end: 3 },
    deep: { when: 'standFull', at: 4, planted: true },
    call: { stacks: 4 } }
];
for (const n of N7) { n.d = 'name7.' + n.id + '.d'; n.d2 = 'name7.' + n.id + '.d2'; n.how = n.unlock.flag ? 'name7.' + n.id + '.how' : null; }
export const N7_BY = Object.fromEntries(N7.map((n) => [n.id, n]));
export const N7_IDS = N7.map((n) => n.id);
// the refusals, and the line each shows (null: the button is simply greyed)
export const N7WHY = { unknown: null, unlearnt: 'name7.locked', town: 'name7.town', points: 'name7.noPoints', slot: null, full: null, deep: null, unsaid: null, free: null, spent: 'call.spent', soon: 'call.soon' };

const ok = (o) => Object.assign({ ok: true, why: null }, o);
const no = (why, o) => Object.assign({ ok: false, why }, o);
const r2 = (v) => Math.round(v * 100) / 100;
const clampI = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(+v) ? Math.floor(+v) : a));
// a co-op guest's G.hero is a view with the host's flags and quest; her own record is __real (N5)
const own = (h) => h?.__real || h;

// ---------- the saved fields ----------
export const N7blank = () => ({ learnt: [], said: [null, null, null], deep: [], slots: 1, free: 0 });
// names.free: 0 the free respec not yet given, 1 given and waiting, 2 used (once a hero, N4)

// an old or a damaged hero made safe: no field → the defaults; unknown ids dropped; said cut to slots, to what is learnt,
// and to one slot a Name; then what her own flags give is learnt. Never a reason to refuse a save.
export function migrate7(hero) {
  if (!hero || typeof hero !== 'object') return hero;
  const o = hero.names && typeof hero.names === 'object' && !Array.isArray(hero.names) ? hero.names : {};
  const ids = (a) => { const out = []; for (const id of Array.isArray(a) ? a : []) if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(N7_BY, id) && !out.includes(id)) out.push(id); return out; };
  const n = { learnt: ids(o.learnt), said: [null, null, null], deep: ids(o.deep), slots: clampI(o.slots, 1, N7_SLOTS), free: clampI(o.free, 0, 2) };
  hero.names = n;
  // (what the flags give before the said list is checked: a Name is never dropped for a learnt list that came late)
  for (const id of N7learned(hero)) if (!n.learnt.includes(id)) n.learnt.push(id);
  n.learnt = N7_IDS.filter((id) => n.learnt.includes(id));
  n.deep = N7_IDS.filter((id) => n.deep.includes(id) && n.learnt.includes(id));
  const src = Array.isArray(o.said) ? o.said : [];
  for (let i = 0; i < n.slots; i++) { const id = src[i]; if (typeof id === 'string' && n.learnt.includes(id) && !n.said.includes(id)) n.said[i] = id; }
  N7learn(hero);
  return hero;
}

// ---------- learning ----------
const given = (h) => { const o = own(h); return (o?.quest | 0) >= N7_QUEST || !!o?.flags?.haldaOut; };
// what she has the right to know now, from her own quest and flags (pure)
export function N7learned(hero) {
  const o = own(hero), F = o?.flags || {}, g = given(hero);
  return N7.filter((n) => (n.unlock.quest ? g : !!F[n.unlock.flag])).map((n) => n.id);
}
// writes what is newly learnt into names.learnt (learnt stays learnt). At quest 40, once: slot 1 with Arna said in it
// and the free respec. → { ok, fresh: [ids learnt now], given: true the first time the three are given }
export function N7learn(hero) {
  if (!hero) return no('unknown', { fresh: [], given: false });
  const o = hero.names;
  if (!o || typeof o !== 'object' || !Array.isArray(o.learnt) || !Array.isArray(o.said) || !Array.isArray(o.deep)) hero.names = Object.assign(N7blank(), { slots: clampI(o?.slots, 1, N7_SLOTS), free: clampI(o?.free, 0, 2) });
  const n = hero.names, fresh = [];
  for (const id of N7learned(hero)) if (!n.learnt.includes(id)) { n.learnt.push(id); fresh.push(id); }
  if (fresh.length) n.learnt = N7_IDS.filter((id) => n.learnt.includes(id));
  let first = false;
  if (given(hero) && !n.free) {
    n.free = 1; first = true;
    if (!n.said.some(Boolean)) n.said[0] = 'arna';
  }
  return ok({ fresh, given: first });
}
// the Names' tab is shown (N6: hidden before q40)
export const N7open = (hero) => given(hero);

// ---------- reading ----------
export const N7knows = (hero, id) => !!hero?.names?.learnt?.includes(id);
export const N7isDeep = (hero, id) => !!hero?.names?.deep?.includes(id);
export const N7slots = (hero) => clampI(hero?.names?.slots, 1, N7_SLOTS);
// the Names she says, in slot order: [{ id, deep, slot }]
export function N7said(hero) {
  const n = hero?.names, out = [];
  if (!n || !Array.isArray(n.said)) return out;
  for (let i = 0; i < N7slots(hero); i++) { const id = n.said[i]; if (id && N7_BY[id] && n.learnt?.includes(id) && !out.some((s) => s.id === id)) out.push({ id, deep: !!n.deep?.includes(id), slot: i }); }
  return out;
}
export const N7says = (hero, id) => N7said(hero).some((s) => s.id === id);
// the points the Names hold (progression.js pointsSpent adds this, N2): 6 and 12 for slots 2 and 3, 8 a Deep
export function N7spent(hero) {
  const n = hero?.names; if (!n) return 0;
  let p = 0;
  for (let i = 1; i < N7slots(hero); i++) p += N7_SLOT_COST[i];
  return p + N7_DEEP_COST * (Array.isArray(n.deep) ? n.deep.filter((id) => N7_BY[id]).length : 0);
}
// the next slot's price, or null when all three are open
export const N7slotCost = (hero) => (N7slots(hero) < N7_SLOTS ? N7_SLOT_COST[N7slots(hero)] : null);

// ---------- changing (each returns { ok, why }) ----------
// open the next slot: anywhere (N3), for points
export function N7openSlot(hero) {
  const n = hero?.names; if (!n || !given(hero)) return no('unknown');
  const cost = N7slotCost(hero);
  if (cost == null) return no('full');
  if (!((hero.points | 0) >= cost)) return no('points', { cost });
  hero.points -= cost; n.slots = N7slots(hero) + 1;
  return ok({ cost, slots: n.slots });
}
// make a learnt Name Deep: anywhere (N3), for points, permanent until a respec
export function N7deepen(hero, id) {
  const n = hero?.names; if (!n || !N7_BY[id]) return no('unknown');
  if (!N7knows(hero, id)) return no('unlearnt');
  if (n.deep.includes(id)) return no('deep');
  if (!((hero.points | 0) >= N7_DEEP_COST)) return no('points', { cost: N7_DEEP_COST });
  hero.points -= N7_DEEP_COST; n.deep.push(id); n.deep = N7_IDS.filter((x) => n.deep.includes(x));
  return ok({ cost: N7_DEEP_COST });
}
// say a Name: free, in the village only (N3; o.town is the caller's inTown()). slot (0-2) names the slot to fill or
// replace; without it the first free one. A Name already said moves (the two swap). A full list with no slot named
// is refused 'full': the panel then asks which to replace.
export function N7say(hero, id, slot = null, o = {}) {
  const n = hero?.names; if (!n || !N7_BY[id]) return no('unknown');
  if (!N7knows(hero, id)) return no('unlearnt');
  if (!o.town) return no('town');
  const S = N7slots(hero), at = n.said.indexOf(id);
  if (slot == null) {
    if (at >= 0 && at < S) return ok({ slot: at });
    slot = -1;
    for (let i = 0; i < S; i++) if (!n.said[i]) { slot = i; break; }
    if (slot < 0) return no('full');
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= N7_SLOTS) return no('unknown');
  if (slot >= S) return no('slot');
  if (at >= 0 && at !== slot) n.said[at] = n.said[slot];
  n.said[slot] = id;
  return ok({ slot });
}
// leave a Name unsaid (by id or by slot): free, in the village only
export function N7unsay(hero, idOrSlot, o = {}) {
  const n = hero?.names; if (!n) return no('unknown');
  const i = typeof idOrSlot === 'number' ? idOrSlot : n.said.indexOf(idOrSlot);
  if (!(i >= 0 && i < N7slots(hero)) || !n.said[i]) return no('unsaid');
  if (!o.town) return no('town');
  n.said[i] = null;
  return ok({ slot: i });
}
// the free respec at q40, once a hero (N4): can it be used, and using it
export const N7freeReady = (hero) => hero?.names?.free === 1;
export function N7useFree(hero) {
  if (!N7freeReady(hero)) return no('free');
  hero.names.free = 2;
  return ok();
}
// a respec's part here (progression.js respec calls it, free or for gold): the slots' and depths' points come back,
// what is learnt stays, the said list shrinks to slot 1. → { ok, back: the points given back (added to hero.points) }
export function N7respec(hero) {
  const n = hero?.names; if (!n) return ok({ back: 0 });
  const back = N7spent(hero), first = N7said(hero)[0]?.id || (n.learnt.includes('arna') && given(hero) ? 'arna' : null);
  n.slots = 1; n.deep = []; n.said = [first, null, null];
  hero.points = (hero.points | 0) + back;
  return ok({ back });
}

// ---------- the runtime (never saved): one object on the player's actor, pl.n7 = N7rt() ----------
// Times are the game's clock in seconds (G.time). -Infinity: never.
export const N7rt = () => ({
  weave: 0, lastSkill: null, skillT: -Infinity,          // Asger: stacks, the skill before, when it was used
  standX: null, standZ: null, standS: 0,                 // Ivar: where the count began, the seconds counted
  dodgeT: -Infinity, dodgeHit: true, dodgeBack: true,    // Keyx: the dodge's time; its hit taken; its refund taken
  drinkT: -Infinity,                                     // Isarn: the last flask
  arnaT: -Infinity,                                      // Arna in the Call: the last "counts as full"
  call: { until: -Infinity, last: -Infinity, spent: {} } // the Call
});
// Asger: a skill used (bus 'skillUsed'; the basic attack is not a skill: it neither adds nor ends). A skill that is
// the one before it adds nothing and ends nothing.
export function N7onSkill(rt, skillId, now) {
  if (now - rt.skillT > N7_BY.asger.kept.fall) { rt.weave = 0; rt.lastSkill = null; }
  if (skillId !== rt.lastSkill) rt.weave = Math.min(N7_BY.asger.kept.max, rt.weave + 1);
  rt.lastSkill = skillId; rt.skillT = now;
  return rt.weave;
}
export const N7weave = (rt, now) => (now - rt.skillT > N7_BY.asger.kept.fall ? 0 : rt.weave);
// Ivar: the hero's tick. A second within 1 m of where the count began adds one; 3 m from it ends it and begins again
// there; between the two it neither adds nor ends. called: moving does not end it. → the seconds counted
export function N7stand(rt, x, z, dt, called = false) {
  const K = N7_BY.ivar.kept;
  if (rt.standX == null) { rt.standX = x; rt.standZ = z; rt.standS = 0; return 0; }
  const d = Math.hypot(x - rt.standX, z - rt.standZ);
  if (d > K.end) { if (!called) rt.standS = 0; rt.standX = x; rt.standZ = z; }
  else if (d <= K.hold) rt.standS = Math.min(K.max, rt.standS + dt);
  return rt.standS;
}
// a blow that moved her or a zone change begins the count again
export function N7standReset(rt) { rt.standX = rt.standZ = null; rt.standS = 0; }
// Keyx: a dodge begun (skills.js dodge), its one hit (N7onHit), its one refund (N7dodged: true once a dodge)
export function N7onDodge(rt, now) { rt.dodgeT = now; rt.dodgeHit = false; rt.dodgeBack = false; }
export function N7dodged(rt) { if (rt.dodgeBack) return false; rt.dodgeBack = true; return true; }
export function N7onDrink(rt, now) { rt.drinkT = now; }
// the hero's own blow landed, with the mods it was given: the dodge's window and the Call's "full life" are used up
export function N7onHit(rt, now, mods) {
  if (mods?.parts?.keyx) rt.dodgeHit = true;
  if (mods?.arnaCall) rt.arnaT = now;
}
// the ctx N7mods reads, from the runtime and what the caller knows of this blow (the caller adds foeFull, dist, res,
// crit, sinceOpenS where it has them)
export function N7ctx(rt, now, more) {
  return Object.assign({
    called: N7callActive(rt.call, now),
    afterDodgeS: rt.dodgeHit ? null : now - rt.dodgeT,
    weave: N7weave(rt, now),
    standingS: rt.standS,
    afterDrinkS: now - rt.drinkT,
    sinceArnaS: now - rt.arnaT
  }, more);
}

// ---------- the modifiers the combat code reads ----------
// N7mods(hero, ctx) → one object. ctx (every field optional; a missing one reads as "not so"):
//   called       the Call runs (pl.buffs.call > 0): every said Name's condition is met
//   foeFull      the foe is at full life before this blow lands                               (Arna)
//   sinceArnaS   seconds since the Call last counted a foe as at full life                    (Arna in the Call)
//   sinceOpenS   seconds since her opening hit on the foe that has just fallen (in kill)      (Arna, Deep)
//   res          her Fury, Energy or Mana now                                                 (Pherousa)
//   dist         metres from her to the foe as the blow lands                                 (Einar)
//   crit         this blow is a critical hit                                                  (Einar, Deep)
//   afterDodgeS  seconds since her last dodge, null once that dodge's hit is taken            (Keyx)
//   weave        Asger's stacks now, 0-3 (N7weave)                                            (Asger)
//   standingS    seconds she has not moved, 0-4 (N7stand)                                     (Ivar)
//   afterDrinkS  seconds since she drank                                                      (Isarn, Deep)
//   inSun, inShade, wading, lifeFrac, nearHearth: taken and not read; no Name of the seven turns on them.
// The result (a key at its neutral value changes nothing):
//   dmg        × her blow. The product of: Arna 1.4 (foeFull); Pherousa 1.18 (res ≥ 70); Einar 1.2 (dist > 9);
//              Keyx 1.6 (afterDodgeS ≤ 2); Asger 1 + 0.1 × weave; Ivar 1 + 0.06 × whole seconds stood (≤ 4);
//              or 1.3 when she says no Name and the Call runs
//   parts      { id: its factor } for each Name that raised dmg (tests, the balance bot, N7onHit)
//   hurt       × what she takes. Ivar 1 − 0.05 × whole seconds stood; Isarn Deep 0.7 (afterDrinkS ≤ 4)
//   flaskCd    the flask's refill in seconds, or null (the shipped 18). Isarn 12; in the Call 6
//   flaskReady the Call with Isarn said: the flask is ready at once (N7call's result carries it too)
//   costK      × a skill's cost. Pherousa Deep 0.85 (res ≥ 70)
//   resFloor   her resource cannot fall below this. Pherousa in the Call 70; else 0
//   refund     the share of her slowest skill's cooldown given back. Arna Deep 0.15 (sinceOpenS ≤ 4); else 0
//   reveal     seconds the foe is left Revealed. Einar Deep 2 (dist > 9 and crit); else 0
//   dodgeBack  Keyx Deep: a dodge that passes through a blow comes back at once (the caller asks N7dodged once a dodge)
//   dodgeCdK   × the dodge's cooldown. Keyx in the Call 0.5
//   basicResK  × the resource a basic attack gives. Asger Deep at three 2
//   planted    Ivar Deep at four: nothing moves her and no blow breaks what she is doing (the wash-out's lane still does)
//   arnaCall   this blow's Arna came from the Call's "once each 3 s" (N7onHit stamps it)
//   stacks     { weave, stand } as counted here
export function N7mods(hero, ctx = {}) {
  const c = ctx || {}, called = !!c.called, said = N7said(hero);
  const m = { dmg: 1, parts: {}, hurt: 1, flaskCd: null, flaskReady: false, costK: 1, resFloor: 0, refund: 0, reveal: 0, dodgeBack: false, dodgeCdK: 1, basicResK: 1, planted: false, arnaCall: false, stacks: { weave: 0, stand: 0 } };
  if (!said.length) { if (called) { m.dmg = N7_CALL.none; m.parts.none = N7_CALL.none; } return m; }
  const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null);
  const within = (v, s) => num(v) != null && v >= 0 && v <= s;
  const up = (id, k) => { if (k !== 1) { m.dmg *= k; m.parts[id] = k; } };
  for (const s of said) {
    const N = N7_BY[s.id], K = N.kept, D = N.deep;
    switch (s.id) {
      case 'arna': {
        const byCall = !c.foeFull && called && !(num(c.sinceArnaS) != null && c.sinceArnaS < N.call.foeFullEvery);
        if (c.foeFull || byCall) { up('arna', K.dmg); m.arnaCall = byCall; }
        if (s.deep && within(c.sinceOpenS, D.within)) m.refund = D.refundSlowest;
        break;
      }
      case 'isarn':
        m.flaskCd = called ? N.call.flaskCd : K.flaskCd;
        if (called) m.flaskReady = true;
        if (s.deep && within(c.afterDrinkS, D.within)) m.hurt *= D.hurt;
        break;
      case 'pherousa': {
        const held = called || (num(c.res) != null && c.res >= K.res);
        if (held) { up('pherousa', K.dmg); if (s.deep) m.costK = D.costK; }
        if (called) m.resFloor = N.call.resFloor;
        break;
      }
      case 'einar': {
        const far = called || (num(c.dist) != null && c.dist > K.over);
        if (far) { up('einar', K.dmg); if (s.deep && c.crit) m.reveal = D.reveal; }
        break;
      }
      case 'keyx':
        if (called || within(c.afterDodgeS, K.within)) up('keyx', K.dmg);
        if (s.deep) m.dodgeBack = true;
        if (called) m.dodgeCdK = N.call.dodgeCdK;
        break;
      case 'asger': {
        const w = called ? N.call.stacks : Math.max(0, Math.min(K.max, Math.floor(num(c.weave) ?? 0)));
        m.stacks.weave = w;
        up('asger', r2(1 + K.per * w));
        if (s.deep && w >= D.at) m.basicResK = D.basicResK;
        break;
      }
      case 'ivar': {
        const w = called ? N.call.stacks : Math.max(0, Math.min(K.max, Math.floor(num(c.standingS) ?? 0)));
        m.stacks.stand = w;
        up('ivar', r2(1 + K.per * w));
        m.hurt *= r2(1 - K.hurtPer * w);
        if (s.deep && w >= D.at) m.planted = true;
        break;
      }
    }
  }
  return m;
}

// ---------- the Call (C1-C7): pure transitions on rt.call given a clock ----------
// st = { until, last, spent: { hearthId: true } }. now: the game's clock in seconds. hearth: the hearth's id in this
// visit (its index or its spot's name). Once a hearth a visit, and never within 90 s of her last Call.
// → { ok, why: 'spent' | 'soon', wait, dur: 20, until, none: she says no Name (toast call.none, else call.on),
//     flaskReady: Isarn said (the caller sets pl.potionCd = 0) }. The caller sets pl.buffs.call = dur.
export function N7call(st, now, hearth, hero) {
  if (st.spent[hearth]) return no('spent');
  const wait = st.last + N7_CALL.gap - now;
  if (wait > 0) return no('soon', { wait });
  st.spent[hearth] = true; st.last = now; st.until = now + N7_CALL.dur;
  return ok({ dur: N7_CALL.dur, until: st.until, none: !N7said(hero).length, flaskReady: N7says(hero, 'isarn') });
}
export const N7callStart = N7call;
export const N7callActive = (st, now) => now < st.until;
export const N7callLeft = (st, now) => Math.max(0, st.until - now);
// may she call here now (the prompt's state): { ok, why, wait }
export function N7callReady(st, now, hearth) {
  if (st.spent[hearth]) return no('spent');
  const wait = st.last + N7_CALL.gap - now;
  return wait > 0 ? no('soon', { wait }) : ok();
}
// a boss arena's hearth flares again, once, on the fight's beat (the contract's boss law): that hearth is unspent.
// The 90 s still stand (C4 as written) unless o.waive: then the flare may be answered at once. Which it is to be is
// the lead's to say (the stage report, open questions); at most two Calls a fight either way.
export function N7callFlare(st, hearth, o = {}) { delete st.spent[hearth]; if (o.waive) st.last = -Infinity; }
// a new visit to a zone: every hearth can be called at again (the 90 s still stand)
export function N7callVisit(st) { st.spent = {}; }

// ---------- co-op: the presence look's three bytes and the blow cap's ceiling ----------
// a byte: 0 empty; else the Name's place in N7 (1-7), plus 8 when it is Deep
export function N7nm(hero) {
  const out = [0, 0, 0];
  for (const s of N7said(hero)) out[s.slot] = N7_IDS.indexOf(s.id) + 1 + (s.deep ? 8 : 0);
  return out;
}
export function N7fromNm(nm) {
  const out = [];
  for (const b of Array.isArray(nm) ? nm.slice(0, N7_SLOTS) : []) { const n = N7[((b | 0) & 7) - 1]; if (n && !out.some((s) => s.id === n.id)) out.push({ id: n.id, deep: !!((b | 0) & 8) }); }
  return out;
}
// the factor the host multiplies blowCap by: the product of the ceilings of the Names said, from this table and never
// from a number a guest sends; at most 1.6 × 1.4 × 1.3 = 2.912 (the contract's "at most × 2.92"). The Call and the
// depths add nothing. Takes a hero record or a guest's nm bytes.
export function N7blowCap(heroOrNm) {
  const said = Array.isArray(heroOrNm) ? N7fromNm(heroOrNm) : N7said(heroOrNm);
  let k = 1;
  for (const s of said) k *= N7_BY[s.id].cap;
  return Math.min(N7_CAP_MAX, k);
}
export const N7_CAP_MAX = 1.6 * 1.4 * 1.3;
