// Local saves: every hero and the settings, in one localStorage entry.
import { G } from './state.js';

const KEY = 'skotos.save.v1';
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
  if (G.hero) {
    G.hero.played = Date.now();
    const i = G.save.heroes.findIndex((h) => h.id === G.hero.id);
    if (i >= 0) G.save.heroes[i] = G.hero; else G.save.heroes.unshift(G.hero);
    G.save.last = G.hero.id;
  }
  try { localStorage.setItem(KEY, JSON.stringify(G.save)); } catch (e) { /* private mode or full storage: keep playing */ }
}
export function deleteHero(id) {
  G.save.heroes = G.save.heroes.filter((h) => h.id !== id);
  if (G.save.last === id) G.save.last = null;
  writeSave();
}
