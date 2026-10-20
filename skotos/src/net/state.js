// Co-op state the game's modules read (no imports beyond the game state: they all import it, coop.js imports them).
// NET.mode: null (single-player: everything as before), 'host' (this page simulates the world for the party) or 'guest'
// (this page plays its own hero in the host's world: monsters are puppets of the host's, the story is the host's).
// NET.h holds coop.js's hooks; a module calls one only while NET.mode is set.
import { G } from '../game/state.js';

export const NET = {
  mode: null,
  // players in this zone, this page counted (the scaling table's index: data.js COOP)
  n: 1,
  // the other heroes in this zone as actors (the host's monsters may target them; a guest draws them)
  remotes: [],
  h: {}
};
export const inCoop = () => NET.mode !== null;
export const isHost = () => NET.mode === 'host';
export const isGuest = () => NET.mode === 'guest';
// every hero a monster can strike here: this page's and, on the host, the guests' (their blows are sent to them)
export function heroes() {
  const LIST = [];
  const p = G.player; if (p) LIST.push(p);
  if (NET.mode === 'host') for (const r of NET.remotes) if (!r.dead && !r.removed) LIST.push(r);
  return LIST;
}
// the nearest living hero to (x, z) (the host's monsters pick their target with it), or this page's
export function nearestHero(x, z) {
  let best = G.player, bd = best && !best.dead ? Math.hypot(best.x - x, best.z - z) : Infinity;
  if (NET.mode === 'host') for (const r of NET.remotes) { if (r.dead || r.removed) continue; const d = Math.hypot(r.x - x, r.z - z); if (d < bd) { bd = d; best = r; } }
  return best;
}

// The fx mirror: while rec is set, the game's look-only calls (fx.js, positional sounds, projectiles, areas) are told to
// it, the outermost only (d counts the depth); the host sends them to its guests, a guest its hero's to the others.
// skip: the call comes from the net itself (a replay), not from this page's game
export const MIRROR = { rec: null, d: 0, skip: false };
export function mir(name, fn, args) {
  const rec = !MIRROR.d && !MIRROR.skip ? MIRROR.rec : null;
  MIRROR.d++;
  let r;
  try { r = fn(...args); } finally { MIRROR.d--; }
  if (rec) rec(name, args, r);
  return r;
}
