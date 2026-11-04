// What the vendors sell (Elianthe in the village, Brokka, Elati): magic and rare things at the hero's level, for her own
// class's weapon and off-hand, armour and jewellery. Each vendor lays out new wares on every return to the village and at
// every new level; the wares live in memory only (G.shops), so a reload lays out new ones too.
import { G } from './state.js';
import { CLASSES, BASES } from './data.js';
import { makeItem, MAX_ILVL } from './items.js';
import { addToBag } from './inventory.js';
import { emit, on } from '../ui/bus.js';
import Audio from '../audio/audio.js';

export const SHOP_SIZE = 12;
let visit = 0;
on('zoneEnter', (id) => { if (id === 'town') visit++; });
// three times what she pays for it (sellValue is 0.35 of its worth)
export const buyPrice = (it) => Math.max(1, Math.round(it.value * 3));
const ARMOUR = ['helm', 'chest', 'gloves', 'boots'];
export function stock(npc = 'healer') {
  const h = G.hero; if (!h) return [];
  const key = visit + ':' + h.level + ':' + h.cls;
  G.shops ||= {};
  const s = G.shops[npc];
  if (s && s.key === key && s.hero === h) return s.items;
  const C = CLASSES[h.cls], lvl = Math.min(MAX_ILVL, Math.max(1, h.level));
  const own = Object.keys(BASES).filter((b) => BASES[b].slot === 'weapon' && BASES[b].cls === h.cls), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const bases = [own.length ? pick(own) : C.weapon, own.length ? pick(own) : C.weapon, C.off, ...ARMOUR, 'amulet', 'ring', 'ring'];
  while (bases.length < SHOP_SIZE) bases.push(pick(ARMOUR));
  const items = bases.map((base) => makeItem(lvl, { base, rar: Math.random() < 0.35 ? 2 : 1, cls: h.cls }));
  G.shops[npc] = { key, hero: h, items };
  return items;
}
// 'gold' / 'full' when it cannot be bought, else the item, now in her bag
export function buy(npc, i) {
  const h = G.hero, s = G.shops?.[npc], it = s?.items[i];
  if (!it || s.hero !== h) return null;
  const p = buyPrice(it);
  if (h.gold < p) { Audio.sfx('denied'); return 'gold'; }
  if (h.inv.indexOf(null) < 0) { Audio.sfx('denied'); return 'full'; }
  h.gold -= p; s.items[i] = null;
  addToBag(it);
  Audio.sfx('gold'); emit('gold');
  return it;
}
