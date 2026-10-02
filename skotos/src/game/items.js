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
      const sk = rand.pick(SKILLS[c].filter((s) => !s.basic));
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
    let choices = LEGENDARIES.filter((l) => (!l.cls || l.cls === cls || Math.random() < 0.15));
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
