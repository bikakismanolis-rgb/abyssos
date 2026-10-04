// Global runtime state. The hero record is what gets saved; everything else is rebuilt.
export const G = {
  mode: 'boot',        // boot | title | play | cine
  panel: null,         // open UI panel name, game pauses while set (except dialog)
  time: 0, slow: 1, slowT: 0, hitstop: 0,
  hero: null,          // saved hero record
  player: null,        // the hero's Actor
  stats: null,         // computed stats
  zone: null, zones: {},
  actors: [], projs: [], areas: [], pickups: [], timers: [],
  combo: { n: 0, t: 0 },
  settings: { music: 0.55, sfx: 0.8, quality: -1, lang: 'el', vibrate: true, numbers: true },
  save: null,          // { heroes: [], settings, last }
  nextId: 1,
  flags: {},           // per-session flags (not saved)
  bossActor: null,
  gate: null           // shadow gate run state
};
export const uid = () => G.nextId++;
export function later(sec, fn) { G.timers.push({ t: sec, fn }); }
export function vibrate(ms) { if (G.settings.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignored */ } }

export function newHero(cls, diff) {
  return {
    id: 'h' + Date.now().toString(36), cls, level: 1, xp: 0, gold: 40, diff,
    skills: {}, points: 0,
    inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null),
    quest: 0, flags: {}, wps: ['town'], act1: -1, gateBest: 0,
    stats: { kills: 0, deaths: 0, time: 0, legs: 0, elites: 0 },
    created: Date.now(), played: Date.now()
  };
}
