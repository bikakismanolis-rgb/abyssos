// The Tide (Act V): the coast's water level and the walk grid that follows it. z.tide = { h, step, t, phase, force, wet,
// lane, laneT, u, ... } lives on the zone; TIDE is the current zone's (null where there is no L.bed). A tidal cell has a
// bed below BED_DRY and no ice, thick ice, window or deck over it; deep (0.45 m or more) it is closed and low.
// - The clock (HAZ5[diff]: low, flood, high, ebb; 152 s, 180 s on Wanderer): the grid moves in 0.15 m steps, one each
//   stepT (4.5 s, 5 s), each step one map.change (one map.ver bump). The water the eye sees (SEA.uLevel) is never lower
//   than the grid: a step ahead while it floods (the foam comes first), a step behind while it ebbs, so water that looks
//   wadeable always is. SEA.uWetLevel: the highest of the last 20 s, then drying at 0.05 m/s.
// - TIDE.force = { h, rate } (the Walking Tower): the level goes to h at rate m/s in 0.15 m steps (at most one a frame);
//   null again: the clock resumes at low water. Skerry Bay's own water (L.boss + 4) answers to the force only; under the
//   clock it stays as at low water (gen5 inBay, walkAt).
// - Never under her feet: a step that would close her cell, or leave her on an island under 9 cells, defers her cells
//   and a BFS lane at the new level to the nearest cell that stays open (on 9 cells or more): z.tide.lane. She can walk
//   out for 6 s; then a wave washes her along the lane (pl.pull with a polyline path, never a jump), and the lane closes.
// - Pickups on a closing cell slide to the nearest dry one; monsters caught in one are put on the nearest floor.
// - The bell (HAZ5.bell s before the flood and the ebb): sfx and bus 'tideBell' (the coming phase); bus 'tideTurn' at
//   each phase. The flood waves' clock (floodWave: world.js updatePacks spawns the pack). The HUD's dial: tideDial().
import { G } from './state.js';
import { HAZ5 } from './data.js';
import { damage } from './combat.js';
import { sapAt } from './sap.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { SEA } from '../world/sea.js';
import { wetAt, BED_DRY, TIDE_STEP } from '../world/genlib.js';
import { tidal, inBay } from '../world/gen5.js';
import { clamp } from '../core/util.js';

const TOP = 8, MAXK = 12, PH = ['low', 'flood', 'high', 'ebb'], GRACE = 6, WAVE_T = 25, ISLE = 9;
const N4 = [1, -1, 0, 0], M4 = [0, 0, 1, -1];
export let TIDE = null;
// Skerry Bay's own level for the water's look (the clock never reaches it: 0, or the Walking Tower's while it owns the
// water); a uniform object beside SEA's for sea.js to read over the bay (L.boss + 4)
export const BAY = (SEA.uBayLevel ||= { value: 0 });
// what the scenarios read (counts and the last lanes and wash-outs)
export const TIDE_LOG = { steps: 0, lanes: 0, washes: [], bells: 0, turns: 0, waves: 0, evicted: 0, slid: 0 };
const haz = () => HAZ5[G.hero?.diff ?? 1] || HAZ5[1];
const lv = (k) => Math.round(k * TIDE_STEP * 100) / 100;

// ---------- the zone's tidal cells (once per zone: L.bed never changes) ----------
// idx: every tidal cell the water can open or close; thr: the step at which it is deep (k >= thr: closed); bay: in Skerry
// Bay. Cells deep at every level (the open sea, the Icemaw holes) and dry at every level are left out
function cellsOf(z) {
  if (z.tideC) return z.tideC;
  const L = z.L, N = L.w * L.h, idx = [], thr = [], bay = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!tidal(L, i)) continue;
    let k = 0; while (k <= MAXK && wetAt(L.bed[i], lv(k)) < 2) k++;
    if (k === 0 || k > MAXK) continue;
    idx.push(i); thr.push(k);
    if (inBay(L, i % L.w, (i - i % L.w) / L.w)) bay[i] = 1;
  }
  return (z.tideC = { idx: Int32Array.from(idx), thr: Uint8Array.from(thr), bay, mk: new Uint8Array(N), par: new Int32Array(N), q: new Int32Array(N), seen: new Uint8Array(N) });
}
// the level a cell sees: the bay keeps low water under the clock
const levelAt = (z, i) => (z.tideC?.bay[i] && !z.tide.force ? 0 : z.tide.h);
// is cell i deep (closed) at level index k by the current rule
function deepAt(z, j, k) { const C = z.tideC; return C.bay[C.idx[j]] && !z.tide.force ? false : k >= C.thr[j]; }

// on every entry (act5Enter): the clock at the start of low water, and every tidal cell as its bed has it at h = 0, in
// one batch (a hero who left at high water comes back to the map at low water, cached or fresh)
export function resetTide(z) {
  const L = z?.L;
  if (!L?.bed) { TIDE = null; return; }
  z.tide = Object.assign(z.tide || {}, { h: 0, step: 0, t: 0, phase: 'low', force: null, wet: 0, lane: null, laneT: 0, u: 0, since: 99, dir: 0, wetHold: 0, bell: '', waveT: WAVE_T, wash: null, forced: false, moodT: 0, waves: z.tide?.waves || 0 });
  TIDE = z.tide;
  cellsOf(z);
  const { w } = L, open = [], close = [];
  for (let i = 0; i < L.cells.length; i++) {
    if (!tidal(L, i)) continue;
    const want = wetAt(L.bed[i], 0) < 2;
    if (want && !L.cells[i]) open.push([i % w, (i - i % w) / w]);
    else if (!want && L.cells[i]) close.push([i % w, (i - i % w) / w]);
  }
  if (z.map.change(open, close)) emit('mapChanged');
  SEA.uLevel.value = 0; SEA.uWetLevel.value = 0; BAY.value = 0;
}

// ---------- per frame (projectiles.js updateAreas, before tickIce) ----------
export function tickTide(dt) {
  const z = G.zone;
  if (z?.act5) tickWash(z, dt);
  TIDE = z?.L?.bed && z.tide ? z.tide : null;
  const T = TIDE; if (!T) return;
  const H = haz(), pl = G.player;
  T.since += dt;
  let k, si, pi = -1, upAt = 0;
  if (T.force) {
    // a boss owns the water: one 0.15 m step each 0.15 / rate s toward its level
    T.forced = true;
    k = clamp(Math.round((T.force.h || 0) / TIDE_STEP), 0, MAXK);
    si = TIDE_STEP / Math.max(T.force.rate || TIDE_STEP, 1e-3);
    T.phase = T.step < k ? 'flood' : T.step > k ? 'ebb' : k ? 'high' : 'low';
  } else {
    const ph = H.phases, cyc = ph[0] + ph[1] + ph[2] + ph[3], b1 = ph[0], b2 = b1 + ph[1], b3 = b2 + ph[2];
    si = H.stepT;
    // (released by a boss: low water from its start, the grid ebbing back a step at a time)
    if (T.forced) { T.forced = false; T.t = 0; T.phase = 'low'; }
    T.t += dt; if (T.t >= cyc) T.t -= cyc;
    const t = T.t; pi = t < b1 ? 0 : t < b2 ? 1 : t < b3 ? 2 : 3;
    if (PH[pi] !== T.phase) { T.phase = PH[pi]; TIDE_LOG.turns++; emit('tideTurn', T.phase, z); }
    // the bell, HAZ5.bell s before the flood and before the ebb
    const bell = t >= b1 - H.bell && t < b1 ? 'flood' : t >= b3 - H.bell && t < b3 ? 'ebb' : '';
    if (bell && T.bell !== bell) { TIDE_LOG.bells++; emit('tideBell', bell, z); Audio.sfx('tideBell'); z.act5?.bell?.userData.ring?.(1); }
    T.bell = bell;
    k = pi === 0 ? 0 : pi === 1 ? Math.min(TOP, Math.floor((t - b1) / si) + 1) : pi === 2 ? TOP : Math.max(0, TOP - Math.floor((t - b3) / si) - 1);
    upAt = b1 - t; // (the flood's steps up: the first at its start, then one each stepT)
  }
  // one step at a time, never faster than its spacing (a frame late at worst)
  if (T.step !== k && T.since >= si - 1e-6) stepTo(z, T.step + Math.sign(k - T.step));
  const ttn = T.force ? (T.step < k ? si - T.since : Infinity) : T.step < TOP && (pi === 1 || (pi === 0 && T.step === 0)) ? upAt + T.step * si : Infinity;
  // the water the eye sees: ahead of the grid while it rises, behind it while it falls
  T.u = T.h + TIDE_STEP * (ttn < Infinity ? clamp(1 - ttn / si, 0, 1) : T.dir < 0 ? clamp(1 - T.since / si, 0, 1) : 0);
  if (T.u >= T.wet) { T.wet = T.u; T.wetHold = 20; } else if ((T.wetHold -= dt) <= 0) T.wet = Math.max(T.u, T.wet - 0.05 * dt);
  SEA.uLevel.value = T.u; SEA.uWetLevel.value = T.wet; BAY.value = T.force ? T.u : 0;
  if ((T.moodT -= dt) <= 0) { T.moodT = 0.5; Audio.mood({ tide: clamp(T.u / lv(TOP), 0, 1) }); }
  if (T.h >= 0.75 - 1e-6 && !T.force) T.waveT -= dt;
  if (T.lane && pl) tickLane(z, T, pl, dt);
}

// ---------- a step: the band of cells crossing the deep line, closed and opened in one batch ----------
function stepTo(z, k) {
  const T = z.tide, C = cellsOf(z), cells = z.map.cells, L = z.L, w = L.w;
  T.dir = Math.sign(k - T.step); T.step = k; T.h = lv(k); T.since = 0; TIDE_LOG.steps++;
  const close = [], open = [], mk = C.mk, def = T.lane?.def, held = T.wash?.cells;
  for (let j = 0; j < C.idx.length; j++) {
    const i = C.idx[j];
    if (def?.has(i) || held?.has(i)) continue;
    const deep = deepAt(z, j, k);
    if (deep && cells[i]) { close.push(i); mk[i] = 1; } else if (!deep && !cells[i]) open.push(i);
  }
  // her cell, and her way out, close last
  const pl = G.player;
  if (pl && !pl.dead) shelter(z, T, pl, close);
  for (const i of close) mk[i] = 0;
  const xz = (i) => [i % w, (i - i % w) / w];
  if (z.map.change(open.map(xz), close.map(xz))) { emit('mapChanged'); evict(z, close); }
  // a lane the ebb has left shallow has nothing to close any more
  if (T.lane && !laneDeep(z, T.lane)) T.lane = null;
}
// a lane cell still wants to close at this level
function wantsDeep(z, i) { const L = z.L; return tidal(L, i) && wetAt(L.bed[i], levelAt(z, i)) === 2; }
function laneDeep(z, ln) { for (const i of ln.def) if (wantsDeep(z, i)) return true; return false; }

// the cells she could stand on after this step: open now, not closing, not a deep lane cell
function staysOpen(z, i) { const C = z.tideC, T = z.tide; return z.map.cells[i] === 1 && !C.mk[i] && !(T.lane?.def.has(i) && wantsDeep(z, i)); }
// the open component of cell s at least ISLE cells (a refuge is 3 x 3)? A bounded flood; marks what it saw small
function bigFrom(z, s, small) {
  const L = z.L, w = L.w, h = L.h, q = [s], seen = new Set([s]);
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd];
    if (q.length >= ISLE) return true;
    const x = i % w, y = (i - x) / w;
    for (let d = 0; d < 4; d++) {
      const nx = x + N4[d], ny = y + M4[d], n = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(n) || !staysOpen(z, n)) continue;
      seen.add(n); q.push(n);
    }
  }
  for (const i of q) small.add(i);
  return false;
}
// from her cell through the cells open now (wading, or closing but not yet) to the nearest cell that stays open on 9
// cells or more: { goal, path: [cells from hers to the goal], island: Set (her own small component, if any) } or null
function laneFrom(z, s) {
  const C = z.tideC, L = z.L, w = L.w, h = L.h, cells = z.map.cells, par = C.par, seen = C.seen, q = C.q;
  const small = new Set(), touched = [];
  let head = 0, tail = 0, goal = -1;
  q[tail++] = s; seen[s] = 1; par[s] = -1; touched.push(s);
  while (head < tail) {
    const i = q[head++];
    if (staysOpen(z, i) && !small.has(i)) { if (bigFrom(z, i, small)) { goal = i; break; } }
    const x = i % w, y = (i - x) / w;
    for (let d = 0; d < 4; d++) {
      const nx = x + N4[d], ny = y + M4[d], n = ny * w + nx;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[n] || !cells[n]) continue;
      seen[n] = 1; par[n] = i; q[tail++] = n; touched.push(n);
    }
  }
  for (const i of touched) seen[i] = 0;
  if (goal < 0) return { goal: -1, path: null, island: small };
  const path = []; for (let i = goal; i >= 0; i = par[i]) path.push(i);
  path.reverse();
  return { goal, path, island: small };
}
// a step that would close her cell, or leave her on a scrap of ground: defer her cells and her lane out
function shelter(z, T, pl, close) {
  const C = z.tideC, L = z.L, w = L.w, s = Math.floor(pl.z) * w + Math.floor(pl.x);
  if (s < 0 || s >= C.mk.length) return;
  const inLane = !!T.lane?.mem.has(s);
  if (!C.mk[s] && !inLane) { const small = new Set(); if (!staysOpen(z, s) || bigFrom(z, s, small)) return; }
  const r = laneFrom(z, s), ln = T.lane || { def: new Set(), mem: new Set(), path: null, goal: -1 };
  if (!T.lane) { T.laneT = GRACE; TIDE_LOG.lanes++; }
  const keep = (i) => { if (C.mk[i]) { C.mk[i] = 0; ln.def.add(i); } ln.mem.add(i); };
  keep(s);
  for (const i of r.island) ln.mem.add(i);
  if (r.path) { for (const i of r.path) if (i !== r.goal) keep(i); ln.path = r.path; ln.goal = r.goal; }
  for (let j = close.length - 1; j >= 0; j--) if (ln.def.has(close[j])) close.splice(j, 1);
  T.lane = ln;
}
// each frame while a lane is held: out of it (or the ebb has come): it closes; still in it after 6 s: the wash-out
function tickLane(z, T, pl, dt) {
  const ln = T.lane, s = Math.floor(pl.z) * z.L.w + Math.floor(pl.x);
  if (T.wash) { if (pl.pull !== T.wash) { T.wash = null; closeLane(z, T); } return; }
  if (pl.dead || !ln.mem.has(s) || !laneDeep(z, ln)) { closeLane(z, T); return; }
  if ((T.laneT -= dt) > 0) return;
  washOut(z, T, pl, s);
}
function closeLane(z, T) {
  const ln = T.lane, held = T.wash?.cells; T.lane = null; T.laneT = 0; T.wash = null;
  if (!ln) return;
  const L = z.L, w = L.w, C = z.tideC, pl = G.player, out = [];
  for (const i of new Set([...ln.def, ...(held || ln.held || [])])) if (wantsDeep(z, i) && z.map.cells[i]) out.push(i);
  // (a step came while the wave carried her and her cell must close now: a fresh lane from where she is)
  if (pl && !pl.dead) { for (const i of out) C.mk[i] = 1; shelter(z, T, pl, out); for (const i of out) C.mk[i] = 0; }
  if (z.map.change(null, out.map((i) => [i % w, (i - i % w) / w]))) { emit('mapChanged'); evict(z, out); }
}
// the wave: along the lane's own cells (open while she crosses them) to its open end, never in a straight line over the
// water (castT would stop it at once) and never faster than 9 m/s; 6% of her life on Warden (none on Wanderer), Cold +20
function washOut(z, T, pl, s) {
  const ln = T.lane, w = z.L.w;
  const r = laneFrom(z, s);
  if (!r.path) { T.laneT = 2; return; }
  for (const i of r.path) if (i !== r.goal) ln.mem.add(i);
  const P = [{ x: pl.x, z: pl.z, d: 0 }];
  for (let k = 1; k < r.path.length; k++) { const i = r.path[k], x = i % w + 0.5, y = (i - i % w) / w + 0.5, p = P[P.length - 1]; P.push({ x, z: y, d: p.d + Math.hypot(x - p.x, y - p.z) }); }
  if (P.length < 2) { const i = r.goal; P.push({ x: i % w + 0.5, z: (i - i % w) / w + 0.5, d: Math.hypot(i % w + 0.5 - pl.x, (i - i % w) / w + 0.5 - pl.z) }); }
  const end = P[P.length - 1], len = end.d, dur = Math.max(0.8, len / 9);
  pl.pull = T.wash = { t: dur, t0: dur, sx: pl.x, sz: pl.z, x: end.x, z: end.z, path: P, len, wash: true, cells: new Set(r.path) };
  ln.held = T.wash.cells;
  pl.kx = pl.kz = 0;
  const pct = haz().wash;
  if (pct > 0) damage(null, pl, pl.hpMax * pct / 100, { pure: true, wash: true, cold: 20 });
  Audio.sfx('washOut', { x: pl.x, z: pl.z });
  TIDE_LOG.washes.push({ from: { x: pl.x, z: pl.z }, to: { x: end.x, z: end.z }, len: +len.toFixed(2), cells: r.path.length });
  emit('washOut', T.wash);
}

// ---------- what a closing batch leaves behind ----------
// monsters caught on a closing cell go to the nearest floor, however far (a long lane closing behind her: collide() looks
// 12 cells out only, and the far ones are not updated); swimmers and floaters keep the water
export function evict(z, list) {
  if (!list.length) return;
  const w = z.L.w, hit = new Set(list);
  for (const a of z.actors) {
    if (a.dead || a.removed || a.under || a.airborne || a.cling || a.def?.swim || a.def?.float || a.def?.ai === 'bat') continue;
    if (!hit.has(Math.floor(a.z) * w + Math.floor(a.x))) continue;
    const f = z.map.nearestFloor(a.x, a.z, 48); a.x = f.x; a.z = f.z; a.kx = a.kz = 0; TIDE_LOG.evicted++;
    if (a.avatar) a.avatar.group.position.set(a.x, a.y || 0, a.z);
  }
  slideAll(z);
}
// gold and items on a closed cell slide to the nearest dry one (a short glide, ice.js's drowned loot too)
function slideAll(z) {
  for (const p of z.pickups) {
    if (p.wash || p.y > 0 || p.vy > 0 || z.map.walkable(p.x, p.z)) continue;
    const f = dryNear(z, p.x, p.z); if (!f) continue;
    const d = Math.hypot(f.x - p.x, f.z - p.z);
    p.wash = { sx: p.x, sz: p.z, x: f.x, z: f.z, t: 0, dur: clamp(d / 3, 0.4, 1.6) }; TIDE_LOG.slid++;
  }
}
let washT = 0;
function tickWash(z, dt) {
  if ((washT -= dt) <= 0) { washT = 0.5; slideAll(z); }
  for (const p of z.pickups) {
    const W = p.wash; if (!W) continue;
    W.t += dt; const u = clamp(W.t / W.dur, 0, 1), e = u * u * (3 - 2 * u);
    p.x = W.sx + (W.x - W.sx) * e; p.z = W.sz + (W.z - W.sz) * e;
    if (u >= 1) p.wash = null;
  }
}
// the nearest dry floor cell (land, thick ice, a dry flat; thin ice at a pinch) within 10 m
function dryNear(z, x, zz) {
  const L = z.L, m = z.map, ix = Math.floor(x), iz = Math.floor(zz);
  let pinch = null;
  for (let r = 0; r <= 10; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const cx = ix + dx, cz = iz + dz; if (m.solid(cx, cz)) continue;
    const i = cz * L.w + cx;
    if (L.ice?.[i] || (z.ice && z.ice.stage[i] >= 4)) { pinch ||= { x: cx + 0.5, z: cz + 0.5 }; continue; }
    if (L.bed && z.tide && tidal(L, i) && wetAt(L.bed[i], levelAt(z, i)) > 0) { pinch ||= { x: cx + 0.5, z: cz + 0.5 }; continue; }
    return { x: cx + 0.5, z: cz + 0.5 };
  }
  return pinch;
}

// ---------- queries ----------
// the water at (x, z): 'dry', 'shallow' (wading) or 'deep' (closed water, the open sea, a hole, broken ice)
export function waterAt(x, z) {
  const zn = G.zone, L = zn?.L; if (!L) return 'dry';
  const ix = Math.floor(x), iz = Math.floor(z); if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) return 'dry';
  const i = iz * L.w + ix;
  if (L.sea?.[i] || (zn.ice && L.ice?.[i] && zn.ice.stage[i] === 4)) return 'deep';
  if (L.bed && zn.tide && tidal(L, i)) { const d = wetAt(L.bed[i], levelAt(zn, i)); return d === 2 ? 'deep' : d ? 'shallow' : 'dry'; }
  return 'dry';
}
// what an actor wades in (player.js and ai.js set a.inWater from it; moveMul slows the wading, cold.js chills them):
// 'tide' on a wet tidal cell, 'slush' on refrozen ice, 'brine' or 'slush' in a pool (sap.js), else null
export function wadeAt(x, z) {
  const zn = G.zone, L = zn?.L; if (!L || !(L.bed || L.ice)) return null;
  const ix = Math.floor(x), iz = Math.floor(z); if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) return null;
  const i = iz * L.w + ix;
  if (zn.ice && L.ice?.[i] && zn.ice.stage[i] === 5) return 'slush';
  if (L.bed && zn.tide && tidal(L, i) && wetAt(L.bed[i], levelAt(zn, i)) > 0) return 'tide';
  const s = sapAt(x, z); return s === 'brine' || s === 'slush' ? s : null;
}
// the HUD's tide dial (story's hud.js draws it): the level now (k 0-1 of high water), rising or falling, the phase and the
// seconds to the next, the bell ringing, a lane held round her (the dial pulses; laneT: its seconds left)
export function tideDial() {
  const T = TIDE; if (!T) return null;
  const H = haz(), ph = H.phases, ends = [ph[0], ph[0] + ph[1], ph[0] + ph[1] + ph[2], ph[0] + ph[1] + ph[2] + ph[3]];
  const pi = PH.indexOf(T.phase), next = T.force ? 0 : Math.max(0, ends[pi] - T.t);
  return { h: T.h, u: T.u, k: clamp(T.u / lv(TOP), 0, 1), dir: T.force ? Math.sign(Math.round((T.force.h || 0) / TIDE_STEP) - T.step) : T.phase === 'flood' ? 1 : T.phase === 'ebb' ? -1 : 0, phase: T.phase, next, bell: T.bell, lane: !!T.lane, laneT: T.lane ? Math.max(0, T.laneT) : 0, forced: !!T.force };
}
// the flood waves' clock: one each 25 s while the water stands at 0.75 m or more (world.js updatePacks asks while fewer
// than two are alive and spawns the 'floodWave' pack): a wading cell at the water's edge 14-26 m from her, or null
export function floodWave(z) {
  const T = z?.tide, pl = G.player; if (!T || T.force || T.h < 0.75 - 1e-6 || T.waveT > 0 || !pl) return null;
  const C = cellsOf(z), L = z.L, w = L.w, cells = z.map.cells;
  for (let tries = 0; tries < 80; tries++) {
    const i = C.idx[(Math.random() * C.idx.length) | 0], x = i % w, y = (i - x) / w;
    if (!cells[i] || C.bay[i] || wetAt(L.bed[i], T.h) !== 1) continue;
    const d = Math.hypot(x + 0.5 - pl.x, y + 0.5 - pl.z); if (d < 14 || d > 26) continue;
    if (!(x > 0 && !cells[i - 1]) && !(x < w - 1 && !cells[i + 1]) && !(y > 0 && !cells[i - w]) && !(y < L.h - 1 && !cells[i + w])) continue;
    T.waveT = WAVE_T; TIDE_LOG.waves++;
    return { x: x + 0.5, z: y + 0.5 };
  }
  T.waveT = 5;
  return null;
}
// the minimap's water and ice (hud.js paintMap): closed water dark blue, wading water light blue, thick ice white, thin
// ice pale blue (paler as it cracks), slush grey-blue; 0 for anything else. Packed 0xRRGGBB
export function mapTone(z, i) {
  const L = z.L;
  if (L.thick?.[i] || L.window?.[i]) return 0xe2eaf0;
  if (L.ice?.[i]) { const s = z.ice?.stage[i] || 0; return s === 4 ? 0x1c3a6a : s === 5 ? 0x7896ae : s >= 2 ? 0xc4dcec : 0x98c4e2; }
  if (L.sea?.[i]) return 0x1c3a6a;
  if (L.bed && L.bed[i] < BED_DRY && !L.deck?.[i]) { if (!z.map.cells[i]) return 0x1c3a6a; return z.tide && tidal(L, i) && wetAt(L.bed[i], levelAt(z, i)) > 0 ? 0x5e96c4 : 0; }
  return 0;
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__act5 ||= {};
  window.__act5.tide = { get TIDE() { return TIDE; }, LOG: TIDE_LOG, tideDial, waterAt, wadeAt, resetTide, floodWave, mapTone };
}
