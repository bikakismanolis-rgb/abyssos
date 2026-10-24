// The hero's build: skill ranks, variants, the loadout of four, and Mastery (the reward that never ends). One pool of
// points pays for all of it: one a level, then one a Mastery level after the last level (combat.js gainXP).
import { G } from './state.js';
import { SKILLS, SKILL_MAX_RANK, VARIANTS, VARIANT_RANK, LOADOUT, MAX_LEVEL } from './data.js';

// ---------- Mastery ----------
// a track's bonus after r ranks: max * (1 - e^(-r/k)); the first ranks are small, the tail endless but bounded.
// stat: the computeStats key it adds to; per: 'lvl' scales the bonus with the hero's level (life on hit)
export const MASTERY = [
  { id: 'might', stat: 'dmgPct', max: 100, k: 40, icon: 'sword', pct: true },
  { id: 'vigor', stat: 'lifePct', max: 100, k: 40, icon: 'heart', pct: true },
  { id: 'aim', stat: 'crit', max: 12, k: 30, icon: 'eye', pct: true, dec: 1 },
  { id: 'fury', stat: 'critDmg', max: 120, k: 40, icon: 'skull', pct: true },
  { id: 'haste', stat: 'atkSpd', max: 25, k: 40, icon: 'whirl', pct: true, dec: 1 },
  { id: 'stride', stat: 'move', max: 15, k: 25, icon: 'roll', pct: true, dec: 1 },
  { id: 'focus', stat: 'cdr', max: 15, k: 35, icon: 'hourglass', pct: true, dec: 1 },
  { id: 'well', stat: 'resRegen', max: 50, k: 30, icon: 'orb', pct: true },
  { id: 'iron', stat: 'armorPct', max: 80, k: 40, icon: 'shield', pct: true },
  { id: 'leech', stat: 'lifeOnHit', max: 2, k: 30, icon: 'potion', per: 'lvl' },
  { id: 'fortune', stat: 'gold', max: 150, k: 30, icon: 'coin', pct: true },
  { id: 'seeker', stat: 'mf', max: 150, k: 30, icon: 'star', pct: true }
];
export const MASTERY_BY = Object.fromEntries(MASTERY.map((m) => [m.id, m]));
export function masteryValue(m, r, L = G.hero?.level || 1) {
  const v = m.max * (1 - Math.exp(-r / m.k));
  // (not rounded: at a low level a rank of Leech is a fraction of a life per hit, but never nothing; combat.js heals fractions)
  return m.per === 'lvl' ? v * L : v;
}
// what the hero's Mastery adds to her stats (stats.js computeStats); a Warden's wellspring feeds her fury instead (combat.js)
export function masteryStats(hero, s) {
  const M = hero.mast; if (!M) return;
  for (const id in M) { const m = MASTERY_BY[id]; if (m && M[id] > 0) s[m.stat === 'resRegen' && hero.cls === 'warden' ? 'furyGain' : m.stat] += masteryValue(m, M[id], hero.level); }
}
export const fmtMastery = (m, v) => (m.pct ? '+' + v.toFixed(m.dec ?? (v < 10 ? 1 : 0)) + '%' : (!v ? '+0' : '+' + (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v))));

// ---------- points ----------
// every point the hero has ever earned (what a respec gives back)
export const pointsEarned = (h) => Math.max(0, h.level - 1) + (h.mlvl || 0);
export function pointsSpent(h) {
  let n = 0;
  for (const id in h.skills || {}) n += Math.max(0, Math.min(SKILL_MAX_RANK, h.skills[id] || 0) - 1);
  for (const id in h.vars || {}) n += bits(h.vars[id]);
  for (const id in h.mast || {}) n += h.mast[id] || 0;
  return n;
}
const bits = (x) => (x & 1) + ((x >> 1) & 1);
export const respecCost = (h) => Math.round(100 + 12 * h.level * h.level + 400 * (h.mlvl || 0));

// ---------- skills, variants, loadout ----------
export const skillDef = (id, cls = G.hero.cls) => SKILLS[cls].find((s) => s.id === id);
export const skillIndex = (id, cls = G.hero.cls) => SKILLS[cls].findIndex((s) => s.id === id);
export const rankOf = (h, id) => Math.max(h.skills?.[id] || 0, skillDef(id, h.cls) && h.level >= skillDef(id, h.cls).lvl ? 1 : 0);
// the skill on button 1-4 (null when the slot is empty or its skill is not learnt yet)
export function slotSkill(i, h = G.hero) {
  const id = h.loadout?.[i - 1] ?? LOADOUT[h.cls][i - 1];
  return id ? skillDef(id, h.cls) || null : null;
}
// the variant a skill is played as: null (as it is) or its id ('vortex')
export function variantOf(id, h = G.hero) { const v = h.variant?.[id] || 0; return v && VARIANTS[id] ? VARIANTS[id][v - 1] : null; }
export const hasVariant = (h, id, v) => !!((h.vars?.[id] || 0) & (1 << (v - 1)));

export function canRank(h, id) { const sk = skillDef(id, h.cls); return !!sk && !sk.basic && h.level >= sk.lvl && h.points > 0 && rankOf(h, id) < SKILL_MAX_RANK; }
export function rankUp(h, id) {
  if (!canRank(h, id)) return false;
  h.skills[id] = rankOf(h, id) + 1; h.points--;
  return true;
}
export function canUnlock(h, id, v) { return !!VARIANTS[id] && !hasVariant(h, id, v) && rankOf(h, id) >= VARIANT_RANK && h.points > 0; }
export function unlockVariant(h, id, v) {
  if (!canUnlock(h, id, v)) return false;
  h.vars[id] = (h.vars[id] || 0) | (1 << (v - 1)); h.points--;
  // only the first one learnt is taken up at once (it can be changed back in town); a second is chosen in town
  if (!h.variant[id] && bits(h.vars[id]) === 1) h.variant[id] = v;
  return true;
}
// choosing which way a skill is played: in town (or anywhere when free is set: a fresh unlock)
export function setVariant(h, id, v) {
  if (v && !hasVariant(h, id, v)) return false;
  h.variant[id] = v || 0;
  return true;
}
// put a skill on button i (1-4); a skill already on another button swaps places with what was here
export function setSlot(h, i, id) {
  const sk = skillDef(id, h.cls); if (!sk || sk.basic) return false;
  const L = h.loadout, j = L.indexOf(id);
  if (j >= 0) L[j] = L[i - 1];
  L[i - 1] = id;
  return true;
}
export function canMaster(h, id) { return !!MASTERY_BY[id] && h.points > 0; }
export function masterUp(h, id, n = 1) {
  let k = 0;
  while (k < n && canMaster(h, id)) { h.mast[id] = (h.mast[id] || 0) + 1; h.points--; k++; }
  return k;
}
// every point back, for gold: ranks to 1, variants unlearnt, Mastery cleared (the loadout stays)
export function respec(h) {
  const cost = respecCost(h);
  if (h.gold < cost) return false;
  h.gold -= cost;
  h.skills = {}; h.vars = {}; h.variant = {}; h.mast = {};
  h.points = pointsEarned(h);
  return true;
}

// ---------- old saves ----------
// a hero from before the progression: the loadout is today's four, nothing learnt yet, points kept (and any point the
// old cap left unspendable is now spendable in Mastery); the points are set right if the books disagree
export function migrateHero(h) {
  const def = LOADOUT[h.cls];
  if (!Array.isArray(h.loadout) || h.loadout.length !== 4) h.loadout = def.slice();
  for (let i = 0; i < 4; i++) if (h.loadout[i] && !skillDef(h.loadout[i], h.cls)) h.loadout[i] = def[i];
  // (a skill on two buttons keeps the first; the other takes the first of today's four not on a button)
  for (let i = 1; i < 4; i++) if (h.loadout.indexOf(h.loadout[i]) < i) h.loadout[i] = SKILLS[h.cls].find((s) => !s.basic && !h.loadout.includes(s.id))?.id || null;
  h.skills ||= {}; h.vars ||= {}; h.variant ||= {}; h.mast ||= {};
  // (a way of playing a skill that was never learnt is the skill as it is)
  for (const id in h.variant) if (h.variant[id] && !hasVariant(h, id, h.variant[id])) h.variant[id] = 0;
  h.mlvl ||= 0; h.mxp ||= 0;
  if (h.level >= MAX_LEVEL) h.xp = 0;
  const free = pointsEarned(h) - pointsSpent(h);
  if (!(h.points >= 0) || h.points !== free) h.points = Math.max(0, free);
  return h;
}
