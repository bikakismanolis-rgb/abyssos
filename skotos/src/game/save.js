// Local saves: every hero and the settings, in one localStorage entry.
import { G } from './state.js';

// (?slot=name: a save of its own, for tests that run several heroes in one browser: tools/coop.mjs)
const SLOT = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('slot') : null;
const KEY = 'skotos.save.v1' + (SLOT && /^[a-z0-9]{1,12}$/.test(SLOT) ? '.' + SLOT : '');
export function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.heroes)) s = { heroes: [], settings: {}, last: null };
  G.save = s;
  Object.assign(G.settings, s.settings || {});
  return s;
}
export function writeSave() {
  if (!G.save) return;
  G.save.settings = G.settings;
  // (a co-op guest's G.hero is a view with the host's story over it: its own record is what is kept, net/coop.js)
  const hero = G.hero?.__real || G.hero;
  if (hero) {
    hero.played = Date.now();
    const i = G.save.heroes.findIndex((h) => h.id === hero.id);
    if (i >= 0) G.save.heroes[i] = hero; else G.save.heroes.unshift(hero);
    G.save.last = hero.id;
  }
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* private mode or full storage: keep playing */ }
}
export function deleteHero(id) {
  G.save.heroes = G.save.heroes.filter((h) => h.id !== id);
  if (G.save.last === id) G.save.last = null;
  writeSave();
}
