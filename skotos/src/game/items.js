// Item generation, names, tooltips and comparison.
import { BASES, STATS, LEGENDARIES, RARITY_COLOR, CLASSES, SKILLS, SLOTS } from './data.js';
import { rand, clamp } from '../core/util.js';
import { t, list } from '../i18n/i18n.js';
import { G } from './state.js';

let iid = 1;
const WEAPONS = ['sword', 'axe', 'mace', 'crossbow', 'staff'];
const OFFHANDS = ['shield', 'quiver', 'orb'];
const ARMORS = ['helm', 'chest', 'gloves', 'boots'];
const JEWELRY = ['amulet', 'ring'];

export function slotOf(item) { const s = BASES[item.base].slot; return s; }
export function equipSlots(item) { const s = slotOf(item); return s === 'ring' ? ['ring1', 'ring2'] : [s]; }
export function itemClass(item) { return BASES[item.base].cls || null; }
export const usable = (item, cls) => !itemClass(item) || itemClass(item) === cls;

function rollRarity(o) {
  const mf = 1 + (o.mf || 0) / 100;
  const leg = 0.008 * (o.legMul || 1) * mf * (o.elite ? 4 : 1) * (o.boss ? 10 : 1);
  const rare = 0.09 * mf * (o.elite ? 2.5 : 1) * (o.boss ? 3 : 1);
  const magic = 0.33 * mf;
  const r = Math.random();
  if (r < leg) return 3;
  if (r < leg + rare) return 2;
  if (r < leg + rare + magic) return 1;
  return 0;
}
function pickBase(cls) {
  const r = Math.random();
  // 70% of weapons and off-hands are for the hero's own class
  if (r < 0.22) { const own = Object.keys(BASES).filter((b) => BASES[b].slot === 'weapon' && BASES[b].cls === cls); return Math.random() < 0.75 ? rand.pick(own) : rand.pick(WEAPONS); }
  if (r < 0.32) { const own = OFFHANDS.find((b) => BASES[b].cls === cls); return Math.random() < 0.75 ? own : rand.pick(OFFHANDS); }
  if (r < 0.8) return rand.pick(ARMORS);
  return rand.pick(JEWELRY);
}
function statValue(k, ilvl) {
  const s = STATS[k];
  let v = rand.range(s.r[0], s.r[1]) + s.g * (ilvl - 1) * rand.range(0.85, 1.05);
  if (s.cap) v = Math.min(s.cap, v);
  return s.pct ? Math.round(v * 10) / 10 : Math.round(v);
}
function rollStats(item, n, cls) {
  const slot = slotOf(item);
  const pool = Object.keys(STATS).filter((k) => { const sl = STATS[k].slots; return sl === '*' || sl.split(',').includes(slot); });
  const stats = {};
  // main stat and vitality show up a lot, like they should
  for (let i = 0; i < n && pool.length; i++) {
    let total = 0; for (const k of pool) total += STATS[k].w;
    let r = Math.random() * total, pick = pool[0];
    for (const k of pool) { r -= STATS[k].w; if (r <= 0) { pick = k; break; } }
    pool.splice(pool.indexOf(pick), 1);
    if (pick === 'skill') {
      const c = itemClass(item) || cls;
      // (the later skills only on items deep enough to be worn when they are learnt)
      const sk = rand.pick(SKILLS[c].filter((s) => !s.basic && (s.lvl < 20 || item.ilvl >= s.lvl - 4)));
      stats.skill = { id: sk.id, v: statValue('skill', item.ilvl) };
    } else stats[pick] = statValue(pick, item.ilvl);
  }
  return stats;
}

export function makeItem(ilvl, o = {}) {
  const cls = o.cls || G.hero?.cls || 'warden';
  let rar = o.rar ?? rollRarity(o);
  let base = o.base || pickBase(cls);
  let leg = null;
  if (rar === 3) {
    // (a boss's own, drop: false, only when asked for by name: o.leg)
    let choices = LEGENDARIES.filter((l) => l.drop !== false && (!l.cls || l.cls === cls || Math.random() < 0.15));
    if (o.base) choices = choices.filter((l) => l.base === o.base);
    if (o.leg) choices = LEGENDARIES.filter((l) => l.id === o.leg);
    if (choices.length) { leg = rand.pick(choices); base = leg.base; } else rar = 2;
  }
  const B = BASES[base];
  const item = { id: iid++ + '_' + Date.now().toString(36), base, rar, ilvl, stats: {} };
  const q = [1, 1.08, 1.16, 1.26][rar];
  if (B.slot === 'weapon') {
    const avg = (3.2 + ilvl * 2.35) * q * rand.range(0.92, 1.08);
    item.dmg = [Math.max(1, Math.round(avg * B.dmg[0])), Math.max(2, Math.round(avg * B.dmg[1]))];
    item.spd = B.spd;
  }
  if (B.armor) item.armor = Math.round((4 + ilvl * 2.6) * B.armor * q * rand.range(0.9, 1.1));
  if (B.block) item.block = Math.round((B.block + rand.range(0, 0.06)) * 100);
  const n = [0, rand.int(1, 2), rand.int(3, 4), 4][rar];
  item.stats = rollStats(item, n, cls);
  if (leg) item.leg = leg.id;
  if (rar === 2) item.sfx = rand.int(0, list('suffix').length - 1);
  if (rar === 1) item.sfx = Object.keys(item.stats)[0];
  item.value = Math.round((6 + ilvl * 2.2) * [1, 2.5, 6, 18][rar]);
  return item;
}

// An item this page did not roll (a co-op host's, net/coop.js; one in a save, save.js): rebuilt from what an item is made
// of, each number held to what makeItem can roll at its level, so no item can break a hero or its panels. Stats only
// from STATS (a skill only one its class has), damage and speed only on a weapon, armour and block only where the base
// has them, a legendary only its own base's; the price worked out again. o.maxIlvl: the highest level it may claim;
// o.keep: other plain fields kept (a save's, which nothing reads); else every other field is dropped. o.rolled: one said
// to be just rolled (a co-op host's): only the stats its slot rolls, no more of them than its rarity rolls. null: no item
export const MAX_ILVL = 99;
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const fin = (v) => typeof v === 'number' && isFinite(v);
export function statMax(k, ilvl) {
  const s = STATS[k];
  let v = s.r[1] + s.g * (ilvl - 1) * 1.05;
  if (s.cap) v = Math.min(s.cap, v);
  return s.pct ? Math.round(v * 10) / 10 : Math.round(v);
}
export function cleanItem(it, o = {}) {
  if (!it || typeof it !== 'object' || !own(BASES, it.base)) return null;
  const B = BASES[it.base];
  let rar = fin(it.rar) ? clamp(Math.round(it.rar), 0, 3) : 0;
  const ilvl = fin(it.ilvl) ? clamp(Math.round(it.ilvl), 1, o.maxIlvl || MAX_ILVL) : 1;
  const leg = rar === 3 && LEGENDARIES.find((l) => l.id === it.leg && l.base === it.base);
  if (rar === 3 && !leg) rar = 2;
  const out = { id: (typeof it.id === 'string' || fin(it.id)) && String(it.id) ? String(it.id).slice(0, 40) : iid++ + '_' + Date.now().toString(36), base: it.base, rar, ilvl, stats: {} };
  const q = [1, 1.08, 1.16, 1.26][rar], num = (v, hi, d) => (fin(v) ? clamp(Math.round(v), 0, hi) : d);
  if (B.slot === 'weapon') {
    const top = (3.2 + ilvl * 2.35) * q * 1.08, mid = (3.2 + ilvl * 2.35) * q;
    const hi0 = Math.max(1, Math.round(top * B.dmg[0])), hi1 = Math.max(2, Math.round(top * B.dmg[1]));
    const d = Array.isArray(it.dmg) ? it.dmg : [];
    const d1 = num(d[1], hi1, Math.max(2, Math.round(mid * B.dmg[1])));
    out.dmg = [Math.min(d1, num(d[0], hi0, Math.max(1, Math.round(mid * B.dmg[0])))), d1];
    out.spd = B.spd;
  }
  if (B.armor) out.armor = num(it.armor, Math.round((4 + ilvl * 2.6) * B.armor * q * 1.1), Math.round((4 + ilvl * 2.6) * B.armor * q));
  if (B.block) out.block = num(it.block, Math.round((B.block + 0.06) * 100), Math.round(B.block * 100));
  const slot = B.slot, most = o.rolled ? [0, 2, 4, 4][rar] : Infinity;
  if (it.stats && typeof it.stats === 'object') for (const k of Object.keys(it.stats)) {
    const v = it.stats[k];
    if (o.rolled && (Object.keys(out.stats).length >= most || !own(STATS, k) || !(STATS[k].slots === '*' || STATS[k].slots.split(',').includes(slot)))) continue;
    if (k === 'skill') {
      // (a skill of the item's class, or of any class for an item of none; never a basic attack)
      const ok = v && typeof v === 'object' && typeof v.id === 'string' && (B.cls ? [B.cls] : Object.keys(SKILLS)).some((c) => SKILLS[c].some((s) => s.id === v.id && !s.basic));
      if (ok && fin(v.v)) out.stats.skill = { id: v.id, v: clamp(v.v, 0, statMax('skill', ilvl)) };
    } else if (own(STATS, k) && fin(v)) out.stats[k] = clamp(v, 0, statMax(k, ilvl));
  }
  if (leg) out.leg = leg.id;
  if (rar === 2) out.sfx = fin(it.sfx) ? clamp(Math.round(it.sfx), 0, 999) : 0;
  if (rar === 1) out.sfx = own(STATS, it.sfx) ? it.sfx : Object.keys(out.stats)[0];
  out.value = Math.round((6 + ilvl * 2.2) * [1, 2.5, 6, 18][rar]);
  if (it.isNew) out.isNew = true;
  if (o.keep) for (const k of Object.keys(it)) if (!(k in out) && !CLEAN_KEYS.has(k) && (fin(it[k]) || typeof it[k] === 'boolean' || (typeof it[k] === 'string' && it[k].length < 40))) out[k] = it[k];
  return out;
}
const CLEAN_KEYS = new Set(['id', 'base', 'rar', 'ilvl', 'stats', 'dmg', 'spd', 'armor', 'block', 'leg', 'sfx', 'value', 'isNew']);

export function itemName(item) {
  const b = t('base.' + item.base);
  if (item.rar === 3) return t('leg.' + item.leg);
  if (item.rar === 2) return b + ' ' + list('suffix')[item.sfx % list('suffix').length];
  if (item.rar === 1) { const k = 'msuffix.' + item.sfx; return b + ' ' + (t(k) !== k ? t(k) : t('msuffix.other')); }
  return b;
}
export const itemColor = (item) => RARITY_COLOR[item.rar];

// weapon look for the avatar
export function weaponLook(item) {
  if (!item) return {};
  const leg = item.leg && LEGENDARIES.find((l) => l.id === item.leg);
  if (leg?.look) return leg.look;
  const tint = [0x9aa1ab, 0xa8b4c8, 0xc8b878, 0xffb070][item.rar];
  return item.rar >= 2 ? { blade: tint, glow: item.rar === 3 ? 0.5 : 0.15, rune: 0x80b0ff } : { blade: tint };
}

export function statLines(item, cls) {
  const lines = [];
  const C = CLASSES[cls];
  for (const k in item.stats) {
    const v = item.stats[k];
    if (k === 'main') lines.push(t('st.main', v, t('main.' + (itemClass(item) ? CLASSES[itemClass(item)].main : C.main))));
    else if (k === 'skill') lines.push(t('st.skill', v.v, t('sk.' + v.id)));
    else if (k === 'resRegen') lines.push(t('st.resRegen', v, t('res.' + C.res)));
    else lines.push(t('st.' + k, v));
  }
  return lines;
}
export function sellValue(item) { return Math.max(1, Math.round(item.value * 0.35)); }

// stats from all equipped items + one candidate swapped in, for comparison
export function withItem(equip, item, slot) {
  const e = Object.assign({}, equip);
  e[slot] = item;
  return e;
}
export function bestSlotFor(hero, item) {
  const slots = equipSlots(item);
  if (slots.length === 1) return slots[0];
  if (!hero.equip.ring1) return 'ring1';
  if (!hero.equip.ring2) return 'ring2';
  return (hero.equip.ring1.value <= hero.equip.ring2.value) ? 'ring1' : 'ring2';
}
export { SLOTS };
export const clampPct = (v) => clamp(v, -999, 999);
