// Persistent save: one localStorage key, versioned schema, migration from older shapes.
// Shape (version 1):
//   { version:1, best:{depth,tier,time}, settings:{...DEFAULT_SETTINGS}, meta:{} }
// `meta` is reserved for phase 2 (light currency, permanent upgrades, unlocks, achievements, stats).
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
  data.meta = data.meta || {};
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

// Records a finished dive. Returns true when it set a new depth record.
export function recordRun(depth, tier, time) {
  if (depth > save.best.depth) {
    save.best = { depth: depth, tier: tier, time: time };
    saveNow();
    return true;
  }
  return false;
}
