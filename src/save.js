// Persistent save: one localStorage key, versioned schema, migration from older shapes.
// Shape (version 1):
//   { version:1, best:{depth,tier,time}, settings:{...DEFAULT_SETTINGS},
//     meta:{ light, upgrades:{...DEFAULT_UPGRADES}, stats:{...DEFAULT_STATS},
//            achievements:{ id: unixSeconds }, unlocks:{ startWeapons:{key:true}, vessels:{key:true} },
//            startWeapon: null | weaponKey, vessel: vesselKey } }
const KEY = 'abyssos-save';
const LEGACY_BEST_KEY = 'abyssos-best';   // version 0: a bare best-depth number
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS = {
  sfx: 70,            // 0..100
  music: 70,          // 0..100, used from phase 4
  vibrate: true,
  joystick: 'free',   // 'free' | 'fixed'
  joySide: 'left',    // 'left' | 'right', only matters when fixed
  dmgNumbers: false,
  lang: null          // null = follow the device language
};
export const DEFAULT_UPGRADES = { hull: 0, dmg: 0, speed: 0, magnet: 0, lamp: 0, card4: 0, reroll: 0, slot: 0 };
export const DEFAULT_STATS = { dives: 0, kills: 0, maxDepth: 0, time: 0, lightEarned: 0 };

export let save = null;

function migrate(data) {
  if (!data || typeof data !== 'object') data = { version: 0 };
  if (data.version === 0 || data.version === undefined) {
    let legacy = 0;
    try { legacy = parseInt(localStorage.getItem(LEGACY_BEST_KEY), 10) || 0; } catch (e) {}
    data = { version: 1, best: { depth: legacy, tier: 0, time: 0 }, settings: {}, meta: {} };
  }
  // future: if (data.version === 1) { ...; data.version = 2; }
  data.best = Object.assign({ depth: 0, tier: 0, time: 0 }, data.best || {});
  data.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
  const meta = data.meta || {}, unlocks = meta.unlocks || {};
  data.meta = {
    light: meta.light || 0,
    upgrades: Object.assign({}, DEFAULT_UPGRADES, meta.upgrades || {}),
    stats: Object.assign({}, DEFAULT_STATS, meta.stats || {}),
    achievements: meta.achievements || {},
    unlocks: { startWeapons: unlocks.startWeapons || {}, vessels: unlocks.vessels || {} },
    startWeapon: meta.startWeapon || null,
    vessel: meta.vessel || 'bathy'
  };
  data.version = SAVE_VERSION;
  return data;
}

export function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  save = migrate(raw);
  return save;
}

export function saveNow() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {}
}

// Records a finished dive: lifetime stats and the depth record. Returns true on a new record.
export function recordRun(depth, tier, time, kills) {
  const s = save.meta.stats;
  s.dives++; s.kills += kills; s.time += time; if (depth > s.maxDepth) s.maxDepth = depth;
  let record = false;
  if (depth > save.best.depth) { save.best = { depth: depth, tier: tier, time: time }; record = true; }
  saveNow();
  return record;
}
