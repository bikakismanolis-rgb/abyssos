// Bag, equipment, stash and shop operations on the hero record.
import { G } from './state.js';
import { refreshStats } from './stats.js';
import { equipSlots, usable, bestSlotFor, sellValue, makeItem } from './items.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';

export function addToBag(item) {
  const inv = G.hero.inv;
  const i = inv.indexOf(null);
  if (i < 0) return false;
  inv[i] = item;
  item.isNew = true;
  if (item.rar === 3) G.hero.stats.legs++;
  return true;
}
export function equip(invIndex, slot) {
  const h = G.hero, item = h.inv[invIndex];
  if (!item || !usable(item, h.cls)) { Audio.sfx('denied'); return false; }
  slot = slot || bestSlotFor(h, item);
  if (!equipSlots(item).includes(slot)) return false;
  const old = h.equip[slot] || null;
  h.equip[slot] = item; h.inv[invIndex] = old;
  item.isNew = false;
  Audio.sfx('equip');
  refreshStats(); emit('equipChanged', slot);
  return true;
}
export function unequip(slot) {
  const h = G.hero, it = h.equip[slot]; if (!it) return false;
  if (!addToBag(it)) { Audio.sfx('denied'); return false; }
  it.isNew = false;
  delete h.equip[slot];
  Audio.sfx('equip'); refreshStats(); emit('equipChanged', slot);
  return true;
}
export function sell(invIndex) {
  const h = G.hero, it = h.inv[invIndex]; if (!it) return 0;
  const v = sellValue(it); h.gold += v; h.inv[invIndex] = null;
  Audio.sfx('gold'); emit('gold');
  return v;
}
export function sellJunk() {
  let total = 0;
  G.hero.inv.forEach((it, i) => { if (it && it.rar <= 1) total += sell(i); });
  return total;
}
export function toStash(invIndex) {
  const h = G.hero, it = h.inv[invIndex]; if (!it) return false;
  const j = h.stash.indexOf(null); if (j < 0) { Audio.sfx('denied'); return false; }
  h.stash[j] = it; h.inv[invIndex] = null; it.isNew = false; Audio.sfx('pickup'); return true;
}
export function fromStash(j) {
  const h = G.hero, it = h.stash[j]; if (!it) return false;
  const i = h.inv.indexOf(null); if (i < 0) { Audio.sfx('denied'); return false; }
  h.inv[i] = it; h.stash[j] = null; Audio.sfx('pickup'); return true;
}
export function gambleCost(level) { return Math.round(60 + level * 22); }
export function gamble(base) {
  const h = G.hero, cost = gambleCost(h.level);
  if (h.gold < cost) { Audio.sfx('denied'); return null; }
  if (h.inv.indexOf(null) < 0) { Audio.sfx('denied'); emit('toast', 'full'); return null; }
  h.gold -= cost;
  const r = Math.random();
  const rar = r < 0.06 ? 3 : r < 0.36 ? 2 : 1;
  const it = makeItem(h.level, { base, rar, cls: h.cls });
  addToBag(it);
  Audio.sfx(rar === 3 ? 'itemDropLegendary' : 'itemDropRare');
  if (rar === 3) Audio.sting('legendary');
  return it;
}
export function reforgeCost(item) { return Math.round(item.value * 1.2 + 40); }
export function reforge(where, idx) {
  const h = G.hero;
  const it = where === 'inv' ? h.inv[idx] : h.equip[idx];
  if (!it || it.rar === 0) { Audio.sfx('denied'); return null; }
  const cost = reforgeCost(it);
  if (h.gold < cost) { Audio.sfx('denied'); return null; }
  h.gold -= cost;
  const n = makeItem(it.ilvl, { base: it.base, rar: it.rar, cls: h.cls, leg: it.leg });
  n.id = it.id;
  if (where === 'inv') h.inv[idx] = n; else { h.equip[idx] = n; refreshStats(); }
  Audio.sfx('equip');
  return n;
}
