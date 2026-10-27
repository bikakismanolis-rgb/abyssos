// Local saves: every hero and the settings, in one localStorage entry.
import { G } from './state.js';
import { cleanItem, MAX_ILVL } from './items.js';
import { BOON, MAX_LEVEL, INV_SIZE, STASH_SIZE, xpToNext, CLASSES, DIFFS, BASES, LEGENDARIES } from './data.js';

// (?slot=name: a save of its own, for tests that run several heroes in one browser: tools/coop.mjs)
const SLOT = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('slot') : null;
const SUF = SLOT && /^[a-z0-9]{1,12}$/.test(SLOT) ? '.' + SLOT : '';
const KEY = 'skotos.save.v1' + SUF;
// (the cloud's own record and the backups of what it replaced: game/cloud.js, docs/cloudsave/README.md)
// (game/cloud.js: told of every write, and of a change it should sync at once, a deletion or a backup taken back)
export const saveHooks = { written: null, changed: null };
const CLOUD_KEY = 'skotos.cloud.v1' + SUF, BAK_KEY = 'skotos.cloud.bak.v1' + SUF, BAK_GONE_KEY = 'skotos.cloud.bakgone.v1' + SUF;
// (this page's copy of each stored hero is made whole for it (repairHero); the record it came from, as stored, is what
// is written back: a hero this page does not play stays byte for byte as stored, so one a newer version of the game
// wrote keeps what this version cannot read)
const RAW = new WeakMap();
// (and the record this page last wrote for the hero it plays: one found stored in its place that is neither that nor
// the one the page took it up from was written by another page meanwhile (a cloud copy another tab took, or took while
// this page was still loading the hero). This page's own goes over it, so that copy is kept first (a backup), and what
// this browser had agreed with the cloud on that hero is no more: the next sync weighs the two as a conflict, and never
// puts this page's copy over a further one as a mere change. The base is marked lost, not just dropped: a sync running in
// another page meanwhile puts on the record only what it changed, and leaves a base changed since it began as it is)
const MINE = new WeakMap();
function foreign(d) {
  backupHero(d, 'conflict');
  const m = cloudMeta();
  m.base = m.base && typeof m.base === 'object' && !Array.isArray(m.base) ? m.base : {};
  m.base[d.id] = { lost: true }; setCloudMeta(m);
}
const ownCopy = (h, text = JSON.stringify(h)) => { const c = repairHero(JSON.parse(text)); RAW.set(c, text); return c; };
export function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.heroes)) s = { heroes: [], settings: {}, last: null };
  s.heroes = s.heroes.filter((h) => h && typeof h === 'object').map((h) => ownCopy(h));
  G.save = s;
  Object.assign(G.settings, s.settings || {});
  return s;
}
// (the heroes this page deleted, and when: another page's copy of the list never brings them back. Only while the
// deletion stands (its tombstone kept) and only a record played no later than it: a backup taken back, in any page,
// or a copy another page played since, outlives it, as it outlives the tombstone)
const gone = new Map();
function isGone(h) {
  const t = gone.get(h?.id);
  if (t === undefined) return false;
  if (!tombed(h.id)) { gone.delete(h.id); return false; }
  return !(typeof h.played === 'number' && h.played > t);
}
function tombed(id) {
  const m = cloudMeta();
  if (m.tomb && typeof m.tomb === 'object' && m.tomb[id]) return true;
  return Object.values(m.away && typeof m.away === 'object' ? m.away : {}).some((a) => a?.tomb && a.tomb[id]);
}
export function writeSave() {
  if (!G.save) return;
  G.save.settings = G.settings;
  // (a co-op guest's G.hero is a view with the host's story over it: its own record is what is kept, net/coop.js)
  const hero = G.hero?.__real || G.hero;
  // every other hero as it is stored now, not as this page read it at boot: two pages of one browser (a co-op host and
  // its guest in two tabs, say) each keep only their own hero's record and never write the other's back stale
  const disk = readDisk();
  let out = null;
  if (disk) {
    const mine = new Map(G.save.heroes.map((h) => [h.id, h]));
    const kept = disk.heroes.filter((h) => h && typeof h === 'object' && !isGone(h));
    G.save.heroes = kept.map((h) => {
      if (hero && h.id === hero.id) return hero;
      const m = mine.get(h.id), text = JSON.stringify(h);
      // (unchanged since this page read it: the same copy; else the other page's, made whole as at boot)
      return m && RAW.get(m) === text ? m : ownCopy(h, text);
    });
    // (what is written: the stored records as they are, the hero this page plays its own)
    out = kept.map((h) => (hero && h.id === hero.id ? hero : h));
    // (a page at the title keeps the hero another page played last as the one Continue offers)
    if (!hero && typeof disk.last === 'string' && G.save.heroes.some((h) => h.id === disk.last)) G.save.last = disk.last;
  }
  if (hero) {
    const d = disk?.heroes.find((h) => h && typeof h === 'object' && h.id === hero.id), was = MINE.get(hero) ?? RAW.get(hero);
    if (d && was !== undefined && JSON.stringify(d) !== was) foreign(d);
    hero.played = Date.now();
    const i = G.save.heroes.findIndex((h) => h.id === hero.id);
    if (i >= 0) G.save.heroes[i] = hero; else G.save.heroes.unshift(hero);
    if (out && !out.includes(hero)) out.unshift(hero);
    G.save.last = hero.id;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(out ? { ...G.save, heroes: out } : G.save));
    if (hero) MINE.set(hero, JSON.stringify(hero));
  } catch (e) { /* private mode or full storage: keep playing */ }
  saveHooks.written?.();
}
// can this page take a hero up? null, or why not: 'newer' for one whose stored record a newer version of the game wrote
// (heroFits): this page would play its copy made whole (repairHero strips what it cannot read) and write that back over
// the record as its own, and the sync would carry it stripped to every device. The title shows it, "reload the page"
export function heroBlocked(h) {
  if (!h) return null;
  let d = null;
  try { const text = RAW.get(h); d = text !== undefined ? JSON.parse(text) : readDisk()?.heroes.find((x) => x && typeof x === 'object' && x.id === h.id) || null; } catch (e) { d = null; }
  return d ? heroFits(d) : null;
}
// a hero taken up from the title as it is stored now (another page of this browser may have played it since this page
// read the save): the stored record, made whole, in the list in its place; the hero itself when it is not stored; null
// for one this page cannot take up (heroBlocked: a newer version's record, or a record broken or tampered with, which
// no version reads). force: the player chose to take it up anyway, made whole: its record as stored is kept first (a
// backup, 'repaired', kept like a lost conflict's), and what this browser agreed with the cloud on it is marked lost, so
// the next sync weighs the two as a conflict and never carries the repaired copy over the cloud's as a mere change
export function freshHero(h, force = false) {
  const d = readDisk()?.heroes.find((x) => x && typeof x === 'object' && x.id === h.id);
  if (force && (d ? heroFits(d) : heroBlocked(h))) {
    let raw = d;
    try { raw = raw || JSON.parse(RAW.get(h)); } catch (e) { raw = null; }
    if (raw) backupHero(raw, 'repaired');
    const m = cloudMeta();
    m.base = m.base && typeof m.base === 'object' && !Array.isArray(m.base) ? m.base : {};
    m.base[h.id] = { lost: true }; setCloudMeta(m);
  } else {
    if (d && heroFits(d)) return null;
    if (!d && heroBlocked(h)) return null;
  }
  if (!d || isGone(d)) return h;
  const text = JSON.stringify(d);
  if (RAW.get(h) === text) return h;
  if (JSON.stringify(h) === text) { RAW.set(h, text); return h; }
  const c = ownCopy(d, text);
  const i = G.save.heroes.findIndex((x) => x.id === h.id);
  if (i >= 0) G.save.heroes[i] = c; else G.save.heroes.unshift(c);
  return c;
}
// (the time a deletion stands from: now, or just after the record's own played if that is later (a copy from a device
// whose clock is ahead): only a copy played after it outlives it)
const goneAt = (d) => Math.max(Date.now(), (typeof d?.played === 'number' && isFinite(d.played) ? d.played : 0) + 1);
export function deleteHero(id) {
  // (a tombstone: the cloud's copy goes too, and no copy from it brings the hero back. The record goes to the backups)
  const d = readDisk()?.heroes?.find((h) => h && h.id === id) || G.save.heroes.find((h) => h.id === id);
  const at = goneAt(d);
  gone.set(id, at);
  if (d) backupHero(d, 'deleted');
  const m = cloudMeta(); m.tomb = m.tomb && typeof m.tomb === 'object' ? m.tomb : {}; m.tomb[id] = at; setCloudMeta(m);
  G.save.heroes = G.save.heroes.filter((h) => h.id !== id);
  if (G.save.last === id) G.save.last = null;
  writeSave();
  saveHooks.changed?.();
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

// ---------- for the cloud (game/cloud.js) ----------
function readDisk() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && Array.isArray(d.heroes) ? d : null; } catch (e) { return null; } }
// the heroes as stored now, as they are (not made whole: what goes up is what is kept)
export function storedHeroes() { return (readDisk()?.heroes || []).filter((h) => h && typeof h === 'object'); }
// the hero this page plays (a co-op guest's own record), whose stored record only this page writes
export const playingId = () => (G.hero?.__real || G.hero)?.id ?? null;
// can this version keep a hero (a cloud copy, a backup) as it is? null, or why not: 'newer' for one a newer version of
// the game wrote (a class, difficulty, item base, legendary or blessing this version does not know, a level or item level
// past its caps), which repairHero would strip, and which a sync would then carry stripped to every device
export function heroFits(h) {
  if (!h || typeof h !== 'object' || Array.isArray(h) || typeof h.id !== 'string') return 'bad_data';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if (!own(CLASSES, h.cls) || !DIFFS[h.diff]) return 'newer';
  if (typeof h.level === 'number' && h.level > MAX_LEVEL) return 'newer';
  if (Array.isArray(h.boons) && h.boons.some((id, i) => id != null && (i >= 5 || (typeof id === 'string' && !own(BOON, id))))) return 'newer';
  const items = [...(Array.isArray(h.inv) ? h.inv : []), ...(Array.isArray(h.stash) ? h.stash : []), ...Object.values(h.equip && typeof h.equip === 'object' ? h.equip : {})];
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    if (!own(BASES, it.base) || (it.leg != null && !LEGENDARIES.some((l) => l.id === it.leg)) || (typeof it.ilvl === 'number' && it.ilvl > MAX_ILVL)) return 'newer';
  }
  return null;
}
// a hero from the cloud put in the stored list in its place (or first), and in this page's list made whole; never the
// hero this page plays (false), nor one this version cannot keep as it is (heroFits: false)
export function putStored(h) {
  if (!h || h.id === playingId()) return false;
  if (heroFits(h)) return false;
  const disk = readDisk() || { heroes: [], settings: G.save?.settings || {}, last: G.save?.last ?? null };
  const i = disk.heroes.findIndex((x) => x && x.id === h.id);
  if (i >= 0) disk.heroes[i] = h; else disk.heroes.push(h);
  gone.delete(h.id);
  try { localStorage.setItem(KEY, JSON.stringify(disk)); } catch (e) { return false; }
  if (G.save) {
    const c = ownCopy(h);
    const j = G.save.heroes.findIndex((x) => x.id === h.id);
    if (j >= 0) G.save.heroes[j] = c; else G.save.heroes.push(c);
  }
  return true;
}
// a hero the cloud says was deleted on another device, out of the stored list and this page's (never the one it plays)
export function dropStored(id) {
  if (id === playingId()) return false;
  const disk = readDisk();
  gone.set(id, goneAt(disk?.heroes.find((h) => h && h.id === id)));
  if (disk) { disk.heroes = disk.heroes.filter((h) => !h || h.id !== id); if (disk.last === id) disk.last = null; try { localStorage.setItem(KEY, JSON.stringify(disk)); } catch (e) { return false; } }
  if (G.save) { G.save.heroes = G.save.heroes.filter((h) => h.id !== id); if (G.save.last === id) G.save.last = null; }
  return true;
}
export function cloudMeta() { try { const m = JSON.parse(localStorage.getItem(CLOUD_KEY) || 'null'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; } }
export function setCloudMeta(m) { try { localStorage.setItem(CLOUD_KEY, JSON.stringify(m)); } catch (e) { /* full: the next sync agrees again */ } }
// The copies a sync, a deletion or a restore replaced, newest first ({ at, why, hero }); a copy the same as one kept is
// not kept twice. What a sync replaces with the newer copy it took ('cloud') is routine: of those the newest of each
// hero, at most BAK_MAX in all. The only copy left of a hero a conflict lost, a deletion took or a restore replaced
// ('conflict', 'deleted', 'restored': the copy the player had, which a restore promised to keep) is not: the newest of
// each hero is never pushed out by routine ones, at most BAK_KEEP of them; an older one of the same hero and reason takes
// a routine place, and goes only for room, told. Storage too full for them drops routine ones first. Whatever goes for
// room is told (backupsGone: the panel says so)
export const BAK_MAX = 6, BAK_KEEP = 12;
const KEEP_WHY = new Set(['conflict', 'deleted', 'restored', 'repaired']);
export function backups() { try { const b = JSON.parse(localStorage.getItem(BAK_KEY) || '[]'); return Array.isArray(b) ? b.filter((x) => x && x.hero && typeof x.hero === 'object') : []; } catch (e) { return []; } }
// the backups no longer kept, newest first (at most 8): { at (when dropped), why, id, cls, level, diff }
export function backupsGone() { try { const b = JSON.parse(localStorage.getItem(BAK_GONE_KEY) || '[]'); return Array.isArray(b) ? b.filter((x) => x && typeof x === 'object') : []; } catch (e) { return []; } }
function bakGone(xs) {
  if (!xs.length) return;
  const now = Date.now(), add = xs.map((x) => ({ at: now, why: x.why, was: x.at, id: x.hero.id, cls: x.hero.cls, level: x.hero.level, diff: x.hero.diff }));
  try { localStorage.setItem(BAK_GONE_KEY, JSON.stringify([...add, ...backupsGone()].slice(0, 8))); } catch (e) { /* full */ }
}
// (which entries a list keeps: the protected and the routine ones it has room for; the rest go, those of a hero with a
// newer entry of the same reason kept quietly, any other for room, told)
function trimBackups(list) {
  const seen = new Set(), keep = new Set(), told = [];
  let nk = 0, nr = 0;
  for (const x of list) {
    const k = x.hero.id + '|' + x.why, first = !seen.has(k);
    seen.add(k);
    if (KEEP_WHY.has(x.why) && first) { if (nk < BAK_KEEP) { nk++; keep.add(x); } else told.push(x); continue; }
    if (!first && !KEEP_WHY.has(x.why)) continue;
    if (nr < BAK_MAX) { nr++; keep.add(x); } else told.push(x);
  }
  return { list: list.filter((x) => keep.has(x)), told };
}
export function backupHero(h, why) {
  let list = backups();
  const text = JSON.stringify(h);
  const same = list.find((x) => x.hero.id === h.id && JSON.stringify(x.hero) === text);
  if (same) {
    // (the same copy kept as routine, now the last of a lost conflict or a deletion: kept as that)
    if (!KEEP_WHY.has(why) || KEEP_WHY.has(same.why)) return;
    list = list.filter((x) => x !== same);
  }
  let at = Date.now();
  while (list.some((x) => x.at === at)) at++;
  list.unshift({ at, why, hero: JSON.parse(text) });
  const t = trimBackups(list);
  list = t.list;
  // (storage too full: routine ones go first, oldest first, then the others)
  for (;;) {
    try { localStorage.setItem(BAK_KEY, JSON.stringify(list)); break; } catch (e) {
      if (!list.length) break;
      let i = -1;
      for (let j = list.length - 1; j >= 0; j--) if (!KEEP_WHY.has(list[j].why)) { i = j; break; }
      if (i < 0) i = list.length - 1;
      t.told.push(list[i]); list = list.filter((_, j) => j !== i);
    }
  }
  bakGone(t.told);
}
// a backup taken back, the one with that hero id and time (the list may have changed since it was shown): the hero as
// it was, in the list in its place (what is there now goes to the backups first). Played now, or just after the hero's
// deletion where that stands later (a tombstone dated after a record from a device whose clock is ahead, or made on a
// device whose clock is ahead of this one): only a copy played after a deletion outlives it
export function restoreBackup(id, at) {
  const b = backups().find((x) => x.hero.id === id && x.at === +at);
  if (!b || b.hero.id === playingId() || heroFits(b.hero)) return false;
  const cur = storedHeroes().find((h) => h.id === b.hero.id);
  if (cur) backupHero(cur, 'restored');
  const m = cloudMeta(), fin = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  let t = fin(m.tomb?.[id]);
  for (const a of Object.values(m.away && typeof m.away === 'object' ? m.away : {})) t = Math.max(t, fin(a?.tomb?.[id]));
  if (m.base?.[id]?.del) t = Math.max(t, fin(m.base[id].at));
  const h = JSON.parse(JSON.stringify(b.hero)); h.played = Math.max(Date.now(), t + 1);
  if (m.tomb) delete m.tomb[h.id]; setCloudMeta(m);
  const ok = putStored(h);
  if (ok) saveHooks.changed?.();
  return ok;
}
