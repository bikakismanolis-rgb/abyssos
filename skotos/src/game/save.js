// Local saves: every hero and the settings, in one localStorage entry.
import { G } from './state.js';
import { cleanItem } from './items.js';
import { BOON, MAX_LEVEL, INV_SIZE, STASH_SIZE, xpToNext } from './data.js';

// (?slot=name: a save of its own, for tests that run several heroes in one browser: tools/coop.mjs)
const SLOT = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('slot') : null;
const KEY = 'skotos.save.v1' + (SLOT && /^[a-z0-9]{1,12}$/.test(SLOT) ? '.' + SLOT : '');
export function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.heroes)) s = { heroes: [], settings: {}, last: null };
  s.heroes = s.heroes.filter((h) => h && typeof h === 'object');
  for (const h of s.heroes) repairHero(h);
  G.save = s;
  Object.assign(G.settings, s.settings || {});
  return s;
}
// (the heroes this page deleted: another page's copy of the list never brings them back)
const gone = new Set();
export function writeSave() {
  if (!G.save) return;
  G.save.settings = G.settings;
  // (a co-op guest's G.hero is a view with the host's story over it: its own record is what is kept, net/coop.js)
  const hero = G.hero?.__real || G.hero;
  // every other hero as it is stored now, not as this page read it at boot: two pages of one browser (a co-op host and
  // its guest in two tabs, say) each keep only their own hero's record and never write the other's back stale
  let disk = null;
  try { disk = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { disk = null; }
  if (disk && Array.isArray(disk.heroes)) {
    const mine = new Map(G.save.heroes.map((h) => [h.id, h]));
    G.save.heroes = disk.heroes.filter((h) => h && typeof h === 'object' && !gone.has(h.id)).map((h) => {
      if (hero && h.id === hero.id) return hero;
      const m = mine.get(h.id);
      // (unchanged since this page read it: the same record; else the other page's, made whole as at boot)
      if (m && JSON.stringify(m) === JSON.stringify(h)) return m;
      repairHero(h); return h;
    });
    // (a page at the title keeps the hero another page played last as the one Continue offers)
    if (!hero && typeof disk.last === 'string' && G.save.heroes.some((h) => h.id === disk.last)) G.save.last = disk.last;
  }
  if (hero) {
    hero.played = Date.now();
    const i = G.save.heroes.findIndex((h) => h.id === hero.id);
    if (i >= 0) G.save.heroes[i] = hero; else G.save.heroes.unshift(hero);
    G.save.last = hero.id;
  }
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* private mode or full storage: keep playing */ }
}
// a hero taken up from the title as it is stored now (another page of this browser may have played it since this page
// read the save): the stored record, made whole, in the list in its place; the hero itself when it is not stored
export function freshHero(h) {
  let disk = null;
  try { disk = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { disk = null; }
  const d = disk && Array.isArray(disk.heroes) ? disk.heroes.find((x) => x && typeof x === 'object' && x.id === h.id) : null;
  if (!d || gone.has(h.id) || JSON.stringify(d) === JSON.stringify(h)) return h;
  repairHero(d);
  const i = G.save.heroes.findIndex((x) => x.id === h.id);
  if (i >= 0) G.save.heroes[i] = d; else G.save.heroes.unshift(d);
  return d;
}
export function deleteHero(id) {
  gone.add(id);
  G.save.heroes = G.save.heroes.filter((h) => h.id !== id);
  if (G.save.last === id) G.save.last = null;
  writeSave();
}
// a hero as a bad page may have left it (a co-op host's item with a stat no item has, gold or XP no number can be): made
// whole again, its items rebuilt as items are (items.js cleanItem), so Continue, the bag, the shops and the stash work
export function repairHero(h) {
  const fin = (v) => typeof v === 'number' && isFinite(v);
  const items = (a, n) => { const out = Array.isArray(a) ? a.map((it) => (it ? cleanItem(it, { keep: true }) : null)) : []; while (out.length < n) out.push(null); return out; };
  h.inv = items(h.inv, INV_SIZE);
  h.stash = items(h.stash, STASH_SIZE);
  const eq = h.equip && typeof h.equip === 'object' ? h.equip : {};
  h.equip = {};
  for (const sl of Object.keys(eq)) { const it = eq[sl] && cleanItem(eq[sl], { keep: true }); if (it) h.equip[sl] = it; }
  h.level = fin(h.level) ? Math.min(MAX_LEVEL, Math.max(1, Math.round(h.level))) : 1;
  // (XP past the level's next is what no kill leaves: gainXP spends it as it comes)
  h.xp = fin(h.xp) && h.xp > 0 ? Math.min(h.xp, xpToNext(h.level) - 1) : 0;
  h.gold = fin(h.gold) && h.gold > 0 ? Math.floor(h.gold) : 0;
  h.points = fin(h.points) && h.points > 0 ? Math.round(h.points) : 0;
  if (!Array.isArray(h.boons)) h.boons = [];
  h.boons = h.boons.slice(0, 5).map((id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(BOON, id) ? id : null));
  const st = h.stats && typeof h.stats === 'object' ? h.stats : (h.stats = {});
  for (const k of ['kills', 'deaths', 'time', 'legs', 'elites']) if (!fin(st[k]) || st[k] < 0) st[k] = 0;
  return h;
}
