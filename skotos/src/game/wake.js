// Continue where the last save left her: the zone she was in, the spot she stood on, and what that visit had done there
// (packs cleared, an Acts I-II boss killed, chests opened, shrines and small Tears used, echoes fought, the voices heard,
// the ground seen on the map). Every save writes it (save.js saveHooks.visit), startHero takes it up (boot.js), the title
// names the place (ui/screens.js). hero.visit is absent for a hero in Whitecliff, in a Shadow Gate, a co-op guest, or from
// before this; an older version keeps it as it is and starts in Whitecliff (the stamp then tells it stale)
import { G } from './state.js';
import { NET } from '../net/state.js';
import { seedKey, retryAt, chestOpened, shrineSpent } from './world.js';
import { dropShard } from './pickups.js';

// the zones she wakes in; any other (Whitecliff, a Shadow Gate, a zone this build does not know) is Whitecliff at its
// waypoint, as before. (Act VI's two retry at their checkpoints, z.checkpoint from flags.cp6)
export const WAKE = new Set(['forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'forge', 'coast', 'farlight', 'drained', 'bottom']);
// a boss that rises as she comes near is not woken beside: within its reach she wakes at the zone's retry spot. Silverhorn
// sleeps until quest 13, or until the three verses are known (the zone's entry wakes it just after: story.js), the Tower
// until it is woken, the Skotos until the Farthest Light is touched. Karthax stirs at 13.5 m and the Tower rises at 24 m,
// their reach a little more; the rest rise at 15 m or less and are kept 32 m off (not spawned yet there), RISE0 for a
// retry spot. A retry spot within reach (the Tower's shore rock, 21 m off the skerry: the retry beside its fight) serves a
// death or a fight only: any other save wakes at the waypoint then
const ASLEEP = {
  silverhorn: (h) => h.quest < 13 && !['planting', 'sorrow', 'breaking'].every((k) => h.flags['tear_' + k]),
  tower: (h) => !h.flags.towerWake, skotos: () => true
};
const REACH = { karthax: 16, tower: 26 }, REACH0 = 32, RISE0 = 16;
// the bosses no flag keeps down (Acts I-II): one killed this visit is kept down by the visit
const DOWN = new Set(['weaver', 'barrowLord', 'stonewarden', 'moltenKing']);
// what only play moves, never `played`, the clock or where she stands: a build that played her since without writing this
// (an older one keeps it as it was) has moved one of them, and the visit is not taken
const stampOf = (h) => [h.level | 0, Math.floor(+h.xp || 0), Math.floor(+h.gold || 0), h.stats?.kills | 0, h.stats?.deaths | 0, h.quest | 0, Object.keys(h.flags || {}).length];
const MAX = 2048, half = (v) => Math.round(v * 2) / 2;

// this page's part (boot.js): woke, when she woke here; off, no visit kept for the rest of the page (a lost context that
// is stuck, or a fault soon after a wake: Whitecliff next time); held, a visit whose zone would not load, kept while she
// waits in Whitecliff and laid on that zone if she walks in; bound, the zone a travel is taking her to, until she is there
export const PAGE = { woke: 0, off: false, held: null, bound: null };
export const wokeLately = (ms) => PAGE.woke > 0 && performance.now() - PAGE.woke < ms;

// the visit she can wake into, or null (Whitecliff)
export function wakeOf(h) {
  const v = h?.visit;
  if (!v || typeof v !== 'object' || Array.isArray(v) || !WAKE.has(v.id)) return null;
  if (v.diff !== h.diff || !Number.isFinite(v.x) || !Number.isFinite(v.z)) return null;
  if (!v.seed || v.seed !== h.seeds?.[seedKey(v.id, h.diff)]) return null;
  const s = stampOf(h);
  return Array.isArray(v.stamp) && v.stamp.length === s.length && s.every((x, i) => v.stamp[i] === x) ? v : null;
}

// with every save: the visit as it stands, or none (saveHooks.visit)
export function noteVisit(h) {
  if (PAGE.off) { delete h.visit; return; }
  const z = G.zone, pl = G.player, to = PAGE.bound;
  if (!z || !pl) return;
  // (only her own world: never a co-op host's zone, also in the moment after leaving it; joining one lets a held visit go)
  if (!z.ownSeed || NET.mode === 'guest') { PAGE.held = null; delete h.visit; return; }
  // (her zone would not load at Continue: the visit kept, with the record as it is now, while she waits in Whitecliff)
  if (PAGE.held && z.id === 'town' && (!to || to === 'town' || WAKE.has(to))) { h.visit = { ...PAGE.held, stamp: stampOf(h) }; return; }
  // (never Whitecliff or a Shadow Gate, nor on the way to one: Return to town means town)
  if (!WAKE.has(z.id) || (to && !WAKE.has(to))) { delete h.visit; return; }
  const L = z.L, S = L.spots, b = G.bossActor, v = { id: z.id, seed: z.seed, diff: h.diff, x: half(pl.x), z: half(pl.z) };
  // (dead; a boss up and near her (one she broke off from is left to its spot, wakeSpot); on her way back into this zone, a
  // respawn whose fade has her up already)
  if (pl.dead || to === z.id || (b && !b.dead && !b.echo && Math.hypot(b.x - pl.x, b.z - pl.z) < REACH0)) v.retry = 1;
  v.stamp = stampOf(h);
  v.layout = layoutOf(z);
  if (z.bossDown || (DOWN.has(z.bossSpot?.kind) && z.boss?.kind === z.bossSpot.kind && z.boss.dead && !z.boss.echo)) v.boss = 1;
  const live = new Set(); for (const a of z.actors) if (!a.dead && a.packId != null) live.add(a.packId);
  const out = { packs: [], chests: [], shrines: [], tears: [], echoes: [], voices: [] };
  for (const p of z.packs) { const i = p.id.startsWith(z.id) ? p.id.slice(z.id.length) : ''; if (/^\d+$/.test(i) && p.spawned && !live.has(p.id)) out.packs.push(+i); }
  // (what is done, not what was touched: a chest whose drops have landed, a Tear's memory seen to its end, an echo fought)
  for (const it of z.interact) {
    if (it.kind === 'chest' && it.used && !it.due && Number.isInteger(it.ci)) out.chests.push(it.ci);
    else if (it.kind === 'shrine' && it.used && Number.isInteger(it.si)) out.shrines.push(it.si);
    else if (it.kind === 'tear' && it.spent && !it.story && it.id !== 'nursery') out.tears.push(it.id);
    else if (it.kind === 'echo' && it.fought) out.echoes.push(it.boss);
  }
  (z.voices || []).forEach((q, i) => { if (q.done) out.voices.push(i); });
  for (const k in out) if (out[k].length) v[k] = out[k].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (z.greeted) v.greeted = 1;
  v.seen = seenOf(z.map);
  if (JSON.stringify(v).length > MAX) delete v.seen;
  if (JSON.stringify(v).length > MAX) delete h.visit; else h.visit = v;
}

// what a visit's progress is laid on: the zone's size and its counts of packs, chests and shrines, and in Act VI its mode
// (the Mere drained or not, the Bottom lit or dark: another ground)
function layoutOf(z) {
  const L = z.L, S = L.spots, n = [L.w, L.h, L.packs.length, (S.chests || []).length, (S.shrines || []).length];
  if (z.act6) n.push(String(z.mode));
  return n;
}
// enterZone's at for a wake: the visit laid on the zone just built, then the spot (game/boot.js startHero)
export function wakeAt(z, v) {
  restoreVisit(z, v);
  return wakeSpot(z, v);
}
// (also boot.js travel, for a held visit's zone walked into)
export function restoreVisit(z, v) {
  const L = z.L, n = v.layout, h = G.hero, F = h.flags;
  // (another layout than the one it was written on (a later build moved a generator): the place only, nothing of the visit)
  if (!Array.isArray(n) || n.join() !== layoutOf(z).join()) return;
  const has = (a, k) => Array.isArray(a) && a.includes(k), ids = new Set((Array.isArray(v.packs) ? v.packs : []).map((i) => z.id + i));
  for (const p of z.packs) if (ids.has(p.id)) p.spawned = true;
  // (an Acts I-II boss killed this visit stays down; a shard it dropped that she did not take lies by its spot again)
  if (v.boss === 1 && DOWN.has(z.bossSpot?.kind)) {
    z.bossSpawned = true; z.bossDown = 1; delete z.bossSpot;
    if ((z.id === 'crypt' && F.lord && h.quest < 4) || (z.id === 'halls' && F.king && h.quest < 9)) { const p = z.map.nearestFloor(L.boss.x, L.boss.z + 1); dropShard(p.x, p.z); }
  }
  for (const it of z.interact) {
    if (it.kind === 'chest' && has(v.chests, it.ci)) chestOpened(it);
    else if (it.kind === 'shrine' && has(v.shrines, it.si)) shrineSpent(z, it);
    else if (it.kind === 'tear' && !it.story && it.id !== 'nursery' && has(v.tears, it.id)) { it.used = it.spent = true; it.mesh?.userData.dim?.(); }
    else if (it.kind === 'echo' && has(v.echoes, it.boss)) it.used = it.fought = true;
  }
  // (before zoneEnter: the greeting is not said again, and the voices still to come keep their order. Indices only: a
  // record's text is no key to be set on, '__proto__' least)
  if (Array.isArray(v.voices)) for (const i of v.voices) if (Number.isInteger(i) && i >= 0 && z.voices?.[i]) z.voices[i].done = true;
  if (v.greeted === 1) z.greeted = true;
  if (typeof v.seen === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(v.seen)) seeAgain(z.map, v.seen);
}
// where she wakes: the saved spot, if it is floor she can walk from to the start, the waypoint or an open exit, and no boss
// rises within reach of it; else the zone's retry spot, as from a death (and that too when she was dead or a boss was near),
// but out of a fight never one where the boss rises at once (the waypoint then)
function wakeSpot(z, v) {
  const L = z.L, m = z.map, h = G.hero, b = !!z.bossSpot && !ASLEEP[z.bossSpot.kind]?.(h) ? z.bossSpot : null;
  const within = (q, r) => !!b && Math.hypot(b.x - q.x, b.z - q.z) < r;
  const p = v.x >= 0 && v.z >= 0 && v.x < L.w && v.z < L.h ? m.nearestFloor(v.x, v.z) : null;
  if (p && !v.retry && !within(p, REACH[b?.kind] || REACH0) && !m.solid(Math.floor(p.x), Math.floor(p.z)) && m.reaches(p.x, p.z, goals(z))) return p;
  const r = retryAt(z, v.x, v.z);
  return !v.retry && typeof r === 'object' && within(r, REACH[b?.kind] || RISE0) ? (L.spots.waypoint ? 'waypoint' : 'start') : r;
}
function goals(z) {
  const L = z.L, S = L.spots, F = G.hero.flags, out = [L.start];
  if (S.waypoint) out.push({ x: S.waypoint.x, z: S.waypoint.z + 2 });
  if (S.camp2) out.push({ x: S.camp2.x, z: S.camp2.z + 2 });
  for (const e of L.exits) if (!e.locked || F[e.locked]) out.push(z.map.nearestFloor(e.x, e.z, 3));
  return out;
}
// the explored map, a bit for each 2x2 cells (row-major), base64 (no character a save's checks refuse)
function seenOf(m) {
  const bw = (m.w + 1) >> 1, bh = (m.h + 1) >> 1, b = new Uint8Array((bw * bh + 7) >> 3), E = m.explored;
  for (let i = 0; i < E.length; i++) if (E[i]) { const x = i % m.w, zz = (i - x) / m.w, k = (zz >> 1) * bw + (x >> 1); b[k >> 3] |= 1 << (k & 7); }
  let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
function seeAgain(m, s) {
  const bw = (m.w + 1) >> 1, bh = (m.h + 1) >> 1;
  let raw; try { raw = atob(s); } catch (e) { return; }
  if (raw.length !== (bw * bh + 7) >> 3) return;
  for (let zz = 0; zz < m.h; zz++) for (let x = 0; x < m.w; x++) { const k = (zz >> 1) * bw + (x >> 1); if ((raw.charCodeAt(k >> 3) >> (k & 7)) & 1) m.explored[zz * m.w + x] = 1; }
}
