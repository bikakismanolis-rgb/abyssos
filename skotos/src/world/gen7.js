// Act VII's layouts as plain data (docs/act7-design.md; part 2, Zones): the Meltwaters and the Hanging Lake, each in two
// readings that share their seed's layout cell for cell (the try loop checks both).
//   genThaw(seed, { mode: 'spate' | 'green' })   112 x 184, south at the bottom, the climb north: the Goat Track (the camp),
//       the Water-meadow (brooks on the clock, the causeway, two knolls), the Race (the river, three fords, weir 1 on its
//       south bank), the Gullies (weir 2 under an armed chute, weir 3 and its ice block), the Chutes (a switchback under
//       5-7 snow lanes), the Narrows (an arm of the Race, one ford), the Sun-terraces, the Den (Kallisto's bowl, the
//       Water-stair). 'green' (after the act): the Race at 0.3, the gully's chute and all but four of the flank's gone
//   genTarn(seed, { mode: 'full' | 'let' })      104 x 176: the Stair's Head (the camp), the Snowfield (4-5 lanes off both
//       ridges, two crevasses with a snow bridge each, rock islands), the Old Works (the wheel-house and winch 1 in a
//       lane, seven piers and winch 2), the Lake Shore (the tarn on its shelves, the shingle, the jetty and winch 3 behind
//       a causeway on the clock, the skerry), the Dam (Kelados's arena: the ice wall, three levers and their sluice
//       channels, two chutes). 'full' keeps the Dam's mouth plugged (world.js opens it at keladosWake); 'let' has it open
//       and the lake at 0.3
//   thawFaults(L), tarnFaults(L)                 what check-act7 and the try loops hold a layout to (empty: it holds)
//   walk7(L, h, mh)                              the walk grid with the brooks at h and the own-level water at mh
//   inLane(f, x, z, pad), laneSeen(L, f, x, z)   a flue's lane as forge.js inFlue reads it (the second with map.los's rule)
//   cloudAt(c, t)                                where a cloud of L.clouds is at clock t (s)
// What a layout carries besides gen6's fields (cells, paint, low, hgt, dist, bed, vbed, pocket 1 the clock's water and 2
// the own-level channel, vault, keel zero, thick/window/deck/sea zero, ice undefined, tideCfg, refuges, road, packs, spots):
//   L.own = { levels: [1.2, 0.9, 0.6, 0.3], level }   the Race's or the lake's level in this reading before any flag
//   L.flues    chutes (kind 'snow') and sluice channels (kind 'water'): forge.js's record with id, area, armed, horn,
//              cover [{ x, z, r }], green (drawn in the after reading), pack (a pack stands in the lane), lever
//   L.trail    Uint8, the trodden way's cells (the critical path, 3 cells wide); L.road its polylines joined
//   L.shade    Uint8, cells in fixed shade; L.snow Uint8 (0 never, 1-3 bared with that many weirs, 4 until the after
//              reading, 5 always); L.noCloud Uint8, cells no cloud may cover
//   L.clouds   the cloud lines' seeds: { id, x, z, dx, dz, r, speed, len, t0, scripted, extra }
// Every walkable cell stands at y = 0. The story's and the fights' things are L.spots only (build7.js draws them); L.props
// holds scenery: boulder, pine, fallenPine, hut, fold, pier, wall (w, d half sizes), rock, stone, slab, bush.
import { RNG, clamp, fbm } from '../core/util.js';
import { base, distField } from './gen.js';
import { reach, nearReach, circleCells, snap, terrain, BED_DRY, wetAt } from './genlib.js';
import { firm, refugeNear, makeDraw, flood, nearFloor } from './gen5.js';

const ROCK = 0, LAND = 1, FLAT = 2, HOLE = 3;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], CORNER = [[-1, -1], [0, -1], [-1, 0], [0, 0]];
// the own-level water's four stands; the brooks' top; the frame (3 solid cells and 3 more no carved feature may enter)
export const LEVELS7 = [1.2, 0.9, 0.6, 0.3], BROOK_TOP = 0.6, MARGIN7 = 6, DEEP = -0.45;
export const REJECT7 = {};
const fail = (r, all) => { REJECT7[r] = (REJECT7[r] || 0) + 1; if (all && globalThis.G7DEBUG) console.log('reject: ' + all.join(' ')); return null; };
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const RAD = Math.PI / 180;
// a point at a compass bearing (degrees clockwise from north, north at z 0) and distance from c
const bear = (c, deg, d) => ({ x: c.x + Math.sin(deg * RAD) * d, z: c.z - Math.cos(deg * RAD) * d });
const bearing = (c, p) => ((Math.atan2(p.x - c.x, -(p.z - c.z)) / RAD) + 360) % 360;
const cs = (p) => ({ x: snap(p.x), z: snap(p.z) });

// ---------- shared ----------
function daylight(L, type, seed) {
  const { w, h } = L, N = w * h;
  return Object.assign(L, {
    type, seed, mode: '', tries: 1, low: new Uint8Array(N),
    bed: new Float32Array(N).fill(BED_DRY), vbed: new Float32Array((w + 1) * (h + 1)).fill(BED_DRY),
    pocket: new Uint8Array(N), vault: new Uint8Array(N), keel: new Uint8Array(N),
    thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N), sea: new Uint8Array(N),
    tideCfg: { phases: [50, 18, 34, 18], stepT: 4.5, hMax: BROOK_TOP }, own: { levels: LEVELS7.slice(), level: 1.2 },
    refuges: [], road: [], flues: [], clouds: [],
    trail: new Uint8Array(N), shade: new Uint8Array(N), snow: new Uint8Array(N), noCloud: new Uint8Array(N)
  });
}
// cells walkable with the brooks at h and the own-level water at mh (gen6's walk6)
export function walk7(L, h, mh = h, cells = L.cells) {
  const out = cells.slice(), P = L.pocket, B = L.bed;
  for (let i = 0; i < out.length; i++) if (out[i] && P[i] && wetAt(B[i], P[i] === 2 ? mh : h) === 2) out[i] = 0;
  return out;
}
export const dryAt7 = (L, x, z) => { const cx = Math.floor(x), cz = Math.floor(z); if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) return false; const i = cz * L.w + cx; return !!L.cells[i] && !L.pocket[i] && L.bed[i] >= BED_DRY; };
// points every step m along a polyline, wandering between its points (never at them)
function wander(pts, amp, sd, step = 1) {
  const out = [];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step)), px = -(b.z - a.z) / (n * step), pz = (b.x - a.x) / (n * step);
    for (let j = k === 1 ? 0 : 1; j <= n; j++) {
      const t = j / n, x0 = a.x + (b.x - a.x) * t, z0 = a.z + (b.z - a.z) * t, o = (fbm(x0 * 0.08, z0 * 0.08, sd) - 0.5) * 2 * amp * Math.sin(Math.PI * t);
      out.push({ x: x0 + px * o, z: z0 + pz * o });
    }
  }
  return out;
}
function footprint(L, i) { L.cells[i] = 0; L.bed[i] = BED_DRY; L.pocket[i] = 0; L.low[i] = 0; }
function plug(L, x, z, r) { const got = []; for (const [cx, cz] of circleCells(L, x, z, r)) { const i = cz * L.w + cx; if (L.cells[i]) { footprint(L, i); got.push(i); } } return got; }
// the cells into L's arrays, the corners' beds, the heights, then the footprints
function finish7(L, K, bed, blk, own, top) {
  const { w, h } = L, N = w * h, W = w + 1;
  for (let i = 0; i < N; i++) {
    const k = K[i];
    L.cells[i] = k === LAND || k === FLAT ? 1 : 0;
    L.low[i] = k === HOLE ? 1 : 0;
    L.bed[i] = k === FLAT ? bed[i] : BED_DRY;
    L.pocket[i] = k === FLAT ? (own[i] ? 2 : 1) : 0;
  }
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let s = 0;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; s += x < 0 || z < 0 || x >= w || z >= h ? BED_DRY : L.bed[z * w + x]; }
    L.vbed[vz * W + vx] = s / 4;
  }
  L.dist = distField(L, 14);
  L.hgt = heights7(L, top);
  for (let i = 0; i < N; i++) if (blk[i] && K[i] !== ROCK && K[i] !== HOLE) footprint(L, i);
  L.dist = distField(L, 14);
}
// the valley's sides (gen6's rule: rock k cells due south of a floor stays under 1.3 k - 0.2 m, so she is never hidden;
// rock standing apart stays low). top(vx, vz): the zone's crest
function heights7(L, top) {
  const { w, h } = L, N = w * h, seed = L.seed || 1;
  const north = new Uint8Array(N);
  for (let x = 0; x < w; x++) { let k = 12; for (let z = 0; z < h; z++) { const i = z * w + x; k = L.cells[i] || L.low[i] ? 0 : Math.min(12, k + 1); north[i] = k; } }
  const area = rockAreas(L);
  return terrain(L, L.cells, L.dist, (d, vx, vz) => {
    let kN = 12, ra = 1e9;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; if (x >= 0 && z >= 0 && x < w && z < h) { kN = Math.min(kN, north[z * w + x]); ra = Math.min(ra, area[z * w + x]); } }
    const t = 1 - Math.exp(-0.8 * d);
    let tp = top(vx, vz);
    if (ra < 90) tp = Math.min(tp, 1.6 + 1.6 * fbm(vx * 0.2, vz * 0.2, seed + 45));
    const y = tp * t + (fbm(vx * 0.4, vz * 0.4, seed + 47) - 0.5) * 1.6 * t;
    return Math.max(0.3, Math.min(y, 1.3 * kN - 0.2));
  });
}
function rockAreas(L) {
  const { w, h } = L, N = w * h, out = new Int32Array(N), seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) if (!L.cells[s] && !seen[s]) {
    const q = [s]; seen[s] = 1;
    for (let hd = 0; hd < q.length; hd++) { const i = q[hd], x = i % w, z = (i - x) / w; for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < h && !seen[n] && !L.cells[n]) { seen[n] = 1; q.push(n); } } }
    const edge = q.some((i) => { const x = i % w, z = (i - x) / w; return x === 0 || z === 0 || x === w - 1 || z === h - 1; });
    for (const i of q) out[i] = edge ? 1e6 : q.length;
  }
  return out;
}
// the nearest 3 x 3 of dry ground to (x, z) within r, as { x, z, r: 1.5 }
function block3(L, x, z, r) {
  const { w } = L, ok = (cx, cz) => { const i = cz * w + cx; return L.cells[i] && !L.pocket[i] && L.bed[i] >= BED_DRY; };
  let best = null, bd = 1e9;
  for (let cz = Math.floor(z - r); cz <= z + r; cz++) for (let cx = Math.floor(x - r); cx <= x + r; cx++) {
    if (cx < 1 || cz < 1 || cx >= L.w - 1 || cz >= L.h - 1) continue;
    const d = Math.hypot(cx + 0.5 - x, cz + 0.5 - z); if (d > r || d >= bd) continue;
    let all = true;
    for (let dz = -1; dz <= 1 && all; dz++) for (let dx = -1; dx <= 1; dx++) if (!ok(cx + dx, cz + dz)) { all = false; break; }
    if (all) { bd = d; best = { x: cx + 0.5, z: cz + 0.5, r: 1.5 }; }
  }
  return best;
}
// every piece of the clock's water gets its dry refuge (3 x 3) within 12 m of its middle: L.refuges
function refuges(L) {
  const { w } = L, seen = new Uint8Array(L.cells.length), out = [], mask = L.pocket.map((p) => (p === 1 ? 1 : 0));
  for (let i = 0; i < seen.length; i++) if (mask[i] && !seen[i]) {
    const comp = flood(L, mask, i, seen);
    // (a long brook: a refuge for every 12th of its cells, so each stretch has one near)
    for (let k = 0; k < comp.length; k += 12) {
      const c = comp[k], r = block3(L, c % w + 0.5, Math.floor(c / w) + 0.5, 12);
      if (r && !out.some((q) => q.x === r.x && q.z === r.z)) out.push(r);
    }
  }
  return out;
}
// the loose rock and ice under a cliff: discs of floor (each cell in one patch), ids from 1, as L.vault and S.vaults
function vaultPatch(L, x, z, r) {
  const { w } = L, S = L.spots, id = S.vaults.length + 1, cells = [];
  if (id > 255) return null;
  for (const [cx, cz] of circleCells(L, x, z, r)) { const i = cz * w + cx; if (L.cells[i] && !L.vault[i] && !L.pocket[i]) cells.push(i); }
  if (cells.length < 6) return null;
  for (const i of cells) L.vault[i] = id;
  const v = { id, x, z, r, n: cells.length };
  S.vaults.push(v);
  return v;
}
function nearFrame(L) {
  const { w, h } = L;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if ((x < MARGIN7 || z < MARGIN7 || x >= w - MARGIN7 || z >= h - MARGIN7) && (L.cells[z * w + x] || L.low[z * w + x])) return true;
  return false;
}
// after the dressing: the way's mask and the vault's patches keep only open cells (a footprint is neither)
function settle(L) {
  const keepT = new Set((L.spots.plug?.cells || []).map(([x, z]) => z * L.w + x));
  for (let i = 0; i < L.cells.length; i++) { if (!L.cells[i] && !keepT.has(i)) L.trail[i] = 0; if (L.vault[i] && !L.cells[i]) L.vault[i] = 0; }
  for (const v of L.spots.vaults) { let n = 0; for (let i = 0; i < L.vault.length; i++) if (L.vault[i] === v.id) n++; v.n = n; }
}
const crowded = (list, gap = 3) => list.some((a, i) => list.some((b, j) => j > i && hyp(a, b) < gap));

// ---------- lanes (forge.js's flue: the mouth, dir with sin to +x and cos to +z, len, w) ----------
export function inLane(f, x, z, pad = 0) {
  const ux = Math.sin(f.dir), uz = Math.cos(f.dir), dx = x - f.x, dz = z - f.z, u = dx * ux + dz * uz, v = -dx * uz + dz * ux;
  return u >= -0.3 && u <= f.len && Math.abs(v) <= f.w / 2 + pad;
}
// map.js los on a layout: a solid cell that is not low blocks
export function losL(L, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2), { w, h } = L;
  for (let i = 1; i < n; i++) {
    const t = i / n, ix = Math.floor(x0 + dx * t), iz = Math.floor(z0 + dz * t);
    if (ix < 0 || iz < 0 || ix >= w || iz >= h) return false;
    const c = iz * w + ix;
    if (!L.cells[c] && !L.low[c]) return false;
  }
  return true;
}
// in the lane with nothing solid between the mouth and (x, z): what a slide strikes
export const laneSeen = (L, f, x, z) => inLane(f, x, z) && losL(L, f.x + Math.sin(f.dir) * 0.5, f.z + Math.cos(f.dir) * 0.5, x, z);
// the cells whose centres lie in the lane (pad m wider)
export function laneCells(L, f, pad = 0) {
  const out = [], R = f.len + f.w + 2;
  for (let z = Math.max(0, Math.floor(f.z - R)); z <= Math.min(L.h - 1, f.z + R); z++) for (let x = Math.max(0, Math.floor(f.x - R)); x <= Math.min(L.w - 1, f.x + R); x++) if (inLane(f, x + 0.5, z + 0.5, pad)) out.push(z * L.w + x);
  return out;
}
// a lane's cover: the open cells in it the mouth cannot see. Returns them as cell indices
function shadowCells(L, f) { return laneCells(L, f).filter((i) => L.cells[i] && !losL(L, f.x + Math.sin(f.dir) * 0.5, f.z + Math.cos(f.dir) * 0.5, i % L.w + 0.5, Math.floor(i / L.w) + 0.5)); }
// the trail cells a lane strikes that have no cover within 4 m (empty: it holds)
export function uncovered(L, f) {
  const { w } = L, sh = shadowCells(L, f), out = [];
  for (const i of laneCells(L, f)) {
    if (!L.trail[i] || !L.cells[i]) continue;
    const x = i % w + 0.5, z = Math.floor(i / w) + 0.5;
    if (!laneSeen(L, f, x, z)) continue;
    if (!sh.some((j) => Math.hypot(j % w + 0.5 - x, Math.floor(j / w) + 0.5 - z) <= 4)) out.push(i);
  }
  return out;
}
// the blue circles: up to n cover spots, each the nearest shadowed cell to a trail cell of the lane (else down its length)
function coverSpots(L, f, n = 3) {
  const { w } = L, sh = shadowCells(L, f), out = [];
  if (!sh.length) return out;
  const P = (i) => ({ x: i % w + 0.5, z: Math.floor(i / w) + 0.5 });
  const tr = laneCells(L, f).filter((i) => L.trail[i]).map(P);
  const want = tr.length ? tr : [0.3, 0.6, 0.85].map((t) => ({ x: f.x + Math.sin(f.dir) * f.len * t, z: f.z + Math.cos(f.dir) * f.len * t }));
  for (const t of want) {
    let b = null, bd = 1e9;
    for (const j of sh) { const p = P(j), d = hyp(p, t); if (d < bd) { bd = d; b = p; } }
    if (b && !out.some((q) => hyp(q, b) < 2.5)) out.push({ x: b.x, z: b.z, r: 1.2 });
    if (out.length >= n) break;
  }
  return out;
}
// a 6 x 6 of open floor that neither lane of a pair touches, inside the arena's disc
function wedge66(L, A, fa, fb) {
  const { w } = L, bad = new Uint8Array(L.cells.length);
  for (const f of [fa, fb]) for (const i of laneCells(L, f, 0.5)) bad[i] = 1;
  for (let z = Math.floor(A.z - A.r); z <= A.z + A.r - 6; z++) for (let x = Math.floor(A.x - A.r); x <= A.x + A.r - 6; x++) {
    let ok = true;
    for (let dz = 0; dz < 6 && ok; dz++) for (let dx = 0; dx < 6; dx++) { const i = (z + dz) * w + x + dx; if (!L.cells[i] || L.pocket[i] === 2 || bad[i] || Math.hypot(x + dx + 0.5 - A.x, z + dz + 0.5 - A.z) > A.r) { ok = false; break; } }
    if (ok) return true;
  }
  return false;
}
// where a cloud is at clock t: it runs its line (len m) at its speed and starts over
export function cloudAt(c, t) { const s = (((t + c.t0) * c.speed) % c.len + c.len) % c.len; return { x: c.x + c.dx * s, z: c.z + c.dz * s }; }
// the shortest sunny gap (s) at (x, z) between two covers by the unscripted clouds over 600 s (600: never covered twice)
export function cloudGap(L, x, z) {
  const cl = L.clouds.filter((c) => !c.scripted); let last = -1, gap = 600, on = false, first = -1;
  for (let t = 0; t <= 600; t += 0.5) {
    const cov = cl.some((c) => { const p = cloudAt(c, t); return Math.hypot(p.x - x, p.z - z) <= c.r; });
    if (cov && !on) { if (last >= 0) gap = Math.min(gap, t - last); if (first < 0) first = t; }
    if (!cov && on) last = t;
    on = cov;
  }
  if (first >= 0 && last >= 0 && !on) gap = Math.min(gap, 600 - last + first);
  return gap;
}

// ======================= THAW: the Meltwaters =======================
export function genThaw(seed, o = {}) {
  const mode = o.mode === 'green' ? 'green' : 'spate';
  let L = null, k = 0;
  while (!L && k < 24) { L = tryThaw(seed + k * 7919, k === 23); k++; }
  L.seed = seed; L.tries = k;
  return readThaw(L, mode);
}
// the reading: 'green' has the Race at its floor and keeps only the chutes that are drawn after the act
function readThaw(L, mode) {
  L.mode = mode;
  L.own.level = mode === 'green' ? 0.3 : 1.2;
  if (mode === 'green') L.flues = L.flues.filter((f) => f.green);
  return L;
}
const copy7 = (L) => ({ ...L, cells: L.cells.slice(), bed: L.bed.slice(), pocket: L.pocket.slice(), low: L.low.slice(), exits: L.exits.slice(), flues: L.flues.slice(), own: { ...L.own } });

function tryThaw(seed, last) {
  const rng = RNG(seed), w = 112, h = 184, N = w * h;
  const L = daylight(base(w, h), 'thaw', seed), S = L.spots;
  Object.assign(S, { weirs: [], fords: [], lookouts: [], hornStones: [], dens: [], slabs: [], iceblocks: [], huts: [], bridges: [], boulders: [], pines: [], knolls: [], ledges: [], chests: [], vaults: [], npcs: {} });
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), res = new Uint8Array(N), own = new Uint8Array(N), keep = new Uint8Array(N), T = L.trail;
  const { blockC, free, reserve, paintAt } = makeDraw(L, K, blk, res, rng);
  const I = (x, z) => Math.floor(z) * w + Math.floor(x);
  const put = (cx, cz, r, k, skip) => { for (const [x, z] of circleCells(L, cx, cz, r)) { const i = z * w + x; if (!skip || !skip(i)) K[i] = k; } };
  const rect = (x0, z0, x1, z1, k) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) K[z * w + x] = k; };
  const markD = (m, cx, cz, r, v = 1) => { for (const [x, z] of circleCells(L, cx, cz, r)) m[z * w + x] = v; };
  const water = (i, b, o2) => { K[i] = FLAT; bed[i] = b; own[i] = o2 ? 1 : 0; };
  const blockCell = (x, z) => { blk[I(x, z)] = 1; };
  const XL = (z) => Math.floor(9.5 + 4 * fbm(z * 0.07, 0.5, seed + 3)), XR = (z) => Math.floor(102.5 - 4 * fbm(z * 0.07, 9.5, seed + 4));
  // ---- the landmarks ----
  const CP = { x: snap(56 + rng.range(-6, 6)), z: snap(168 + rng.range(-1.5, 1.5)), r: 8 };
  const DP = { x: snap(56 + rng.range(-4, 4)), z: snap(24.5 + rng.range(-1, 1)), r: 17 };
  const XE = 93 + rng.int(0, 1);
  // the flank's lanes: 5-7 columns, one gap of 13 for the ford's approach and one of 11 or more for lookout 2
  const x0L = 26 + rng.int(0, 1);
  let nL = rng.int(5, 7); if (XE - 7 - x0L - 9 * (nL - 1) < 6) nL--;
  const gaps = Array.from({ length: nL - 1 }, () => 9);
  let slack = XE - 7 - x0L - 9 * (nL - 1);
  const mids = gaps.map((_, k) => x0L + 9 * k + 4.5);
  const gOk = gaps.map((_, k) => k).filter((k) => mids[k] >= 38 && mids[k] <= 70);
  const gF = rng.pick(gOk); gaps[gF] += 4; slack -= 4;
  const gQ = rng.pick(gaps.map((_, k) => k).filter((k) => k !== gF)); gaps[gQ] += 2; slack -= 2;
  if (slack < 0) return fail('lanesFit');
  for (let s = 0; s < slack; s++) if (rng.chance(0.7)) gaps[rng.int(0, nL - 2)]++;
  const LX = [x0L]; for (const g of gaps) LX.push(LX[LX.length - 1] + g);
  if (LX[LX.length - 1] > XE - 7) return fail('lanesFit');
  const NF = LX[gF] + Math.floor(gaps[gF] / 2), MX = LX[gQ] + Math.floor(gaps[gQ] / 2);
  const WF = 22 + rng.int(0, 4), MF = 50 + rng.int(0, 12), EF = 91 + rng.int(0, 4);
  const PX = 17 + rng.int(0, 6);                              // the west gully's trail and its passage up
  const MG = { x0: 48 + rng.int(-1, 2) }; MG.x1 = MG.x0 + 15; MG.lx = MG.x0 + 6;
  const GB0 = 70 + rng.int(0, 3), GB1 = 86;
  // ---- the floor ----
  for (let z = 44; z <= 159; z++) for (let x = XL(z); x <= XR(z); x++) K[z * w + x] = LAND;
  put(CP.x, CP.z, CP.r, LAND); rect(Math.floor(CP.x) - 4, 156, Math.floor(CP.x) + 4, Math.floor(CP.z), LAND);
  // the belt and the gullies (rows 82-101), the north bank and its gravel bar (102-107)
  rect(6, 82, w - 7, 101, ROCK);
  rect(14, 86, 27, 101, LAND); rect(PX - 2, 82, PX + 2, 85, LAND);
  rect(MG.x0, 86, MG.x1, 101, LAND); rect(MG.lx - 2, 83, MG.lx + 1, 85, LAND);
  for (let z = 86; z <= 101; z++) for (let x = 88; x <= Math.min(101, XR(z)); x++) K[z * w + x] = LAND;
  for (let z = 102; z <= 107; z++) for (let x = GB0; x <= GB1; x++) water(z * w + x, 0.3, true);
  // the Race (rows 108-119) and the Narrows (54-57): the own-level channel, deep at every stand but on the fords
  for (const [z0, z1] of [[108, 119], [54, 57]]) for (let z = z0; z <= z1; z++) for (let x = 6; x < w - 6; x++) if (K[z * w + x] === LAND) water(z * w + x, DEEP, true);
  const ford = (x, z0, z1, b, id) => { for (let z = z0; z <= z1; z++) for (let dx = -1; dx <= 1; dx++) water(z * w + x + dx, b, true); S.fords.push({ id, x: x + 0.5, z: (z0 + z1 + 1) / 2, z0, z1: z1 + 1, bed: b, opens: b + 0.3 }); };
  ford(WF, 108, 119, 0.6, 'west'); ford(MF, 108, 119, 0.3, 'middle'); ford(EF, 108, 119, 0.0, 'east'); ford(NF, 54, 57, 0.0, 'narrows');
  S.narrows = S.fords[3]; S.fords.length = 3;
  S.bar = { x0: GB0, x1: GB1 + 1, z: 105, bed: 0.3 };
  // the flank's ribs: the north one under the cornices (rows 58-59, open at the ford), the middle one (69-72) broken at
  // every lane and open at the east turn; lookout 2's shoulder cut into it
  for (let x = 6; x < w - 6; x++) for (const z of [58, 59]) if (Math.abs(x - NF) > 2) K[z * w + x] = ROCK;
  for (let z = 69; z <= 72; z++) for (let x = 6; x <= XE - 4; x++) if (!LX.some((X) => x >= X - 3 && x <= X + 2)) K[z * w + x] = ROCK;
  rect(MX - 3, 70, MX + 3, 72, LAND);
  // the Den: the bowl, its mouth, Halda's ledge
  for (let z = 40; z <= 43; z++) for (let x = 6; x < w - 6; x++) K[z * w + x] = ROCK;
  put(DP.x, DP.z, DP.r, LAND);
  rect(Math.floor(DP.x) - 3, Math.floor(DP.z) + 15, Math.floor(DP.x) + 2, 44, LAND);
  const HL = cs(bear(DP, 135, 19)); put(HL.x, HL.z, 2, LAND);
  // ---- the trodden way (always passable at its level; the brooks cross it on planks) ----
  const roads = [];
  const road = (pts, amp, sd) => { const p = wander(pts, amp, seed + sd); roads.push(p); return p; };
  const jx = CP.x + rng.range(-3, 3);
  const R1 = road([{ x: CP.x, z: CP.z - 2 }, { x: jx, z: 151 }, { x: MF + 0.5 + rng.range(-3, 3), z: 137 }, { x: MF + 0.5, z: 124 }, { x: MF + 0.5, z: 121.5 }], 2, 11);
  const W1 = { x: XL(121) + 3.5, z: 121.5 };
  road([{ x: MF + 0.5, z: 121.5 }, { x: WF + 0.5, z: 121.5 }, { x: W1.x + 2, z: 121.5 }], 0, 12);
  road([{ x: MF + 0.5, z: 121.5 }, { x: EF + 0.5, z: 121.5 }], 0, 13);
  for (const f of S.fords) road([{ x: f.x, z: 121.5 }, { x: f.x, z: 104.5 }], 0, 14);
  road([{ x: PX + 0.5, z: 104.5 }, { x: GB0 - 1.5, z: 104.5 }], 0, 15);
  road([{ x: GB0 - 1.5, z: 104.5 }, { x: 90.5, z: 104.5 }, { x: EF + 0.5, z: 104.5 }], 0, 16);
  road([{ x: PX + 0.5, z: 104.5 }, { x: PX + 0.5, z: 80.5 }, { x: PX + 2.5, z: 76.5 }], 0, 17);
  road([{ x: PX + 2.5, z: 76.5 }, { x: (PX + XE) / 2, z: 76.5 }, { x: XE + 0.5, z: 76.5 }], 1, 18);
  road([{ x: XE + 0.5, z: 76.5 }, { x: XE + 0.5, z: 66.5 }], 0, 19);
  road([{ x: XE + 0.5, z: 66.5 }, { x: (NF + XE) / 2, z: 66.5 }, { x: NF + 0.5, z: 66.5 }], 1, 20);
  road([{ x: NF + 0.5, z: 66.5 }, { x: NF + 0.5, z: 52.5 }], 0, 21);
  road([{ x: NF + 0.5, z: 52.5 }, { x: (NF + DP.x) / 2, z: 48.5 }, { x: DP.x, z: 45.5 }, { x: DP.x, z: DP.z + 17 }], 1.2, 22);
  const gtx = MG.x1 - 2.5;
  road([{ x: gtx, z: 104.5 }, { x: gtx, z: 95.5 }, { x: MG.x0 + 3, z: 95.5 }], 0, 23);
  const W3 = { x: snap(93 + rng.int(0, 2)), z: 88.5 };
  road([{ x: 90.5, z: 104.5 }, { x: 91.5, z: 99.5 }, { x: W3.x, z: 91.5 }], 0.8, 24);
  for (const p of roads.flat()) for (const [x, z] of circleCells(L, p.x, p.z, 1.5)) { const i = z * w + x; T[i] = 1; if (K[i] === ROCK) K[i] = LAND; }
  for (const p of roads.flat()) paintAt(p.x, p.z, 1.9, 1);
  L.road = roads.flat();
  // ---- the camp: Halda's fire and field anvil, the waypoint, the way home ----
  S.camp = CP; S.waypoint = { x: CP.x + 4, z: CP.z + 1 };
  S.npcs.halda = { x: CP.x - 2.5, z: CP.z + 0.5, rot: 1.2 }; S.npcs.fire = { x: CP.x - 4, z: CP.z - 1 }; S.npcs.anvil = { x: CP.x - 3.5, z: CP.z + 2 };
  blockC(S.npcs.fire.x, S.npcs.fire.z, 0.45); blockC(S.npcs.anvil.x, S.npcs.anvil.z, 0.45);
  markD(keep, CP.x, CP.z, CP.r + 1); reserve(CP.x, CP.z, CP.r - 1);
  L.start = { x: CP.x, z: CP.z + 2 };
  L.exits.push({ x: CP.x, z: CP.z + 6, to: 'pass', label: 'exit.pass' });
  // ---- the three weirs: a wheel on a sill, the mason's mark, room for three memory figures ----
  const weir = (k, p, st, mk, fg, x0) => { blockC(p.x, p.z, 0.45); markD(keep, p.x, p.z, 5); S.weirs.push({ k, x: p.x, z: p.z, stand: st, mark: mk, figures: fg, ...x0 }); for (const q of [st, mk, ...fg]) reserve(q.x, q.z, 0.8); reserve(p.x, p.z, 2); };
  weir(1, W1, { x: W1.x + 1, z: W1.z }, { x: W1.x - 1, z: W1.z + 1 }, [{ x: W1.x + 1, z: W1.z + 3 }, { x: W1.x + 2.5, z: W1.z + 3 }, { x: W1.x - 0.5, z: W1.z + 3 }], { bank: 'south', rule: 'wake' });
  markD(keep, W1.x + 4, W1.z + 4.5, 2.5);
  const W2 = { x: MG.x0 + 1.5, z: 94.5 };
  weir(2, W2, { x: W2.x + 1, z: W2.z + 1 }, { x: W2.x, z: W2.z - 2 }, [{ x: W2.x, z: W2.z + 3 }, { x: W2.x + 1.5, z: W2.z + 4 }, { x: W2.x, z: W2.z + 5 }], { bank: 'north', rule: 'slide' });
  weir(3, W3, { x: W3.x, z: W3.z + 1 }, { x: W3.x - 2, z: W3.z - 1 }, [{ x: W3.x - 3, z: W3.z + 1 }, { x: W3.x - 4, z: W3.z + 2 }, { x: W3.x - 3, z: W3.z + 3 }], { bank: 'north', rule: 'sun' });
  // ---- the Water-meadow: two knolls, the huts and the fold on dry ground, then the brooks round them ----
  const K1 = { x: snap(26 + rng.range(-3, 3)), z: snap(143 + rng.range(-3, 2)), r: 4, id: 'west' }, K2 = { x: snap(90 + rng.range(-4, 3)), z: snap(146 + rng.range(-4, 4)), r: 4.5, id: 'east' };
  S.knolls.push(K1, K2);
  for (const [x, z] of circleCells(L, K1.x, K1.z, 6.4)) { const i = z * w + x, d = Math.hypot(x + 0.5 - K1.x, z + 0.5 - K1.z); if (K[i] === LAND && d > 4 && !T[i]) water(i, 0.3, false); }
  markD(keep, K1.x, K1.z, 6.6); markD(keep, K2.x, K2.z, K2.r + 0.5);
  for (const f of S.fords) markD(keep, f.x, 122, 3.5);
  // (the huts: two by the causeway for the looters, the others and the fold where there is room; every one on a dry disc)
  const hutAt = (x, z, kind, tag) => {
    const cx = Math.floor(x), cz = Math.floor(z);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const i = (cz + dz) * w + cx + dx; if (K[i] !== LAND || T[i] || keep[i] || blk[i]) return false; }
    const r = rng.range(0, 6.28), hw = kind === 'fold' ? 2 : 1;
    for (let dz = -hw; dz < hw; dz++) for (let dx = -hw; dx < hw; dx++) blk[(cz + dz) * w + cx + dx] = 1;
    markD(keep, cx, cz, 4.2); reserve(cx, cz, hw + 1.5);
    const door = { x: cx + 0.5, z: cz + hw + 0.5 };
    S.huts.push({ x: cx, z: cz, r, kind, door, tag });
    L.props.push({ t: kind, x: cx, z: cz, r: 0, s: 1 });
    return true;
  };
  for (const t of [0.3, 0.62]) {
    let ok = false;
    for (let a = 0; a < 30 && !ok; a++) { const p = R1[Math.floor(R1.length * clamp(t + rng.range(-0.08, 0.08), 0.1, 0.8))], sg = rng.sign(); ok = hutAt(p.x + sg * rng.range(5.5, 7), p.z + rng.range(-1, 1), 'hut', 'causeway'); }
    if (!ok && !last) return fail('causewayHuts');
  }
  for (let a = 0, n = rng.int(1, 3); a < 200 && S.huts.length < 2 + n; a++) hutAt(rng.range(16, 96), rng.range(126, 156), 'hut');
  for (let a = 0; a < 200 && !S.huts.some((q) => q.kind === 'fold'); a++) hutAt(rng.range(18, 94), rng.range(127, 155), 'fold');
  if ((S.huts.length < 4 || !S.huts.some((q) => q.kind === 'fold')) && !last) return fail('huts');
  // the brooks: A west to east across the causeway and north to the Race, B east to west across it lower down, C down the
  // west side, D down the east; one or two short braids more. Core bed 0.15 (closed at the top), shoulders 0.3-0.45; on
  // the trodden way a plank bridge (bed 0.45: wading at the top, dry below it)
  const wetRow = (z) => z >= 120 && z <= 159;
  const brook = (pts, sd, id) => {
    const path = wander(pts, 2.2, seed + sd, 0.5), cells = new Map();
    for (const p of path) for (const [x, z] of circleCells(L, p.x, p.z, 2.1)) {
      const i = z * w + x, d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z);
      if (!wetRow(z) || keep[i] || blk[i] || (K[i] !== LAND && !(K[i] === FLAT && !own[i]))) continue;
      const b = T[i] ? 0.45 : d < 0.8 ? 0.15 : d < 1.55 ? 0.3 : fbm(x * 0.4, z * 0.4, seed + sd) > 0.5 ? 0.45 : 9;
      if (b < (cells.get(i) ?? 9)) cells.set(i, b);
    }
    for (const [i, b] of cells) if (b < 9) water(i, Math.min(b, K[i] === FLAT && !T[i] ? bed[i] : 9), false);
    return path;
  };
  const cz1 = 147 + rng.range(-1.5, 1.5), cz2 = 132 + rng.range(-1.5, 1.5);
  const cwx = (z) => { let b = R1[0]; for (const p of R1) if (Math.abs(p.z - z) < Math.abs(b.z - z)) b = p; return b.x; };
  const eA = MF + 14 + rng.range(0, 6), eC = WF + 8 + rng.range(0, 3), eB = Math.min(eC + 5 + rng.range(0, 4), MF - 9), eD = Math.min(EF - 7 - rng.range(0, 3), 86);
  const bA = brook([{ x: XL(150) + 1, z: 150 + rng.range(-2, 2) }, { x: cwx(cz1) - 10, z: cz1 + 1 }, { x: cwx(cz1) + 10, z: cz1 - 1 }, { x: eA + 3, z: 134 }, { x: eA, z: 120.5 }], 31, 'A');
  const bB = brook([{ x: XR(137) - 1, z: 137 + rng.range(-2, 2) }, { x: cwx(cz2) + 10, z: cz2 + 1 }, { x: cwx(cz2) - 10, z: cz2 - 1 }, { x: eB + 2, z: 127 }, { x: eB, z: 120.5 }], 33, 'B');
  brook([{ x: XL(138) + 1, z: 137 + rng.range(-2, 2) }, { x: eC - 3, z: 130 }, { x: eC, z: 120.5 }], 35, 'C');
  brook([{ x: XR(151) - 1, z: 151 + rng.range(-3, 3) }, { x: eD + 3, z: 140 }, { x: eD + 2, z: 128 }, { x: eD, z: 120.5 }], 37, 'D');
  let nBrooks = 4;
  if (rng.chance(0.6)) { brook([{ x: Math.max(cwx(152) + 12, 74) + rng.range(0, 6), z: 154 }, { x: Math.max(cwx(142) + 10, 70), z: 142 }], 39, 'E'); nBrooks++; }
  if (rng.chance(0.6)) { brook([{ x: Math.min(cwx(150) - 12, 40) - rng.range(0, 4), z: 150 }, { x: Math.min(cwx(138) - 9, 42), z: 138 }], 41, 'F'); nBrooks++; }
  S.brooks = nBrooks;
  // (the bridges: each run of planks on the trodden way, the causeway's own first)
  {
    const seen = new Uint8Array(N), mask = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (K[i] === FLAT && !own[i] && T[i]) mask[i] = 1;
    for (let i = 0; i < N; i++) if (mask[i] && !seen[i]) {
      const comp = flood(L, mask, i, seen); let x = 0, z = 0; for (const c of comp) { x += c % w + 0.5; z += Math.floor(c / w) + 0.5; }
      x /= comp.length; z /= comp.length;
      S.bridges.push({ x, z, n: comp.length, main: R1.some((p) => Math.hypot(p.x - x, p.z - z) < 2.5 && p.z > 124.5) });
    }
    S.bridges.sort((a, b) => (b.main - a.main) || (b.z - a.z));
  }
  // ---- lookout 1 on the west knoll, 2 on the flank's shoulder, 3 at the terraces' lip ----
  const lookout = (k, hearth, rock, hut, wood, approach, pack, x0) => {
    blockC(hearth.x, hearth.z, 0.45); blockC(rock.x, rock.z, 0.45);
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) blk[I(hut.x + dx, hut.z + dz)] = 1;
    reserve(hearth.x, hearth.z, 3.2);
    S.lookouts.push({ k, x: hearth.x, z: hearth.z, hearth, keeper: rock, hut: { x: hut.x + 1, z: hut.z + 1 }, woodpile: wood, approach, pack, ...x0 });
  };
  lookout(1, { x: K1.x, z: K1.z }, { x: K1.x + 2, z: K1.z - 1 }, { x: Math.floor(K1.x) - 3, z: Math.floor(K1.z) - 3 }, { x: K1.x - 1, z: K1.z + 2 }, [{ x: K1.x + 7.5, z: K1.z + 1 }, { x: K1.x + 3, z: K1.z + 1 }], { tag: 'looters', elite: 'champion' }, { place: 'knoll', cutBy: 'brooks', peak: 1 });
  lookout(2, { x: MX + 0.5, z: 71.5 }, { x: MX + 2.5, z: 70.5 }, { x: MX - 3, z: 70 }, { x: MX - 0.5, z: 70.5 }, [{ x: MX + 0.5, z: 76.5 }, { x: MX + 0.5, z: 73.5 }], { tag: 'hillWolves', elite: 'champion' }, { place: 'shoulder', cutBy: 'snow', peak: 2, lanes: [gQ, gQ + 1] });
  const l3c = []; for (let x = XL(50) + 13; x <= XR(50) - 14; x++) if (Math.abs(x - NF) >= 12 && Math.abs(x + 0.5 - DP.x) >= 13) l3c.push(x);
  if (!l3c.length) return fail('lookout3');
  const L3x = rng.pick(l3c);
  lookout(3, { x: L3x + 0.5, z: 50.5 }, { x: L3x + 2.5, z: 51.5 }, { x: L3x - 3, z: 49 }, { x: L3x - 0.5, z: 49.5 }, [{ x: NF + 0.5, z: 51.5 }, { x: L3x + 0.5 + Math.sign(NF - L3x) * 3, z: 51.5 }], { tag: 'slabs', elite: 'rare' }, { place: 'lip', cutBy: null, peak: 3 });
  // ---- the chutes: the flank's (each with its boulder above its first crossing of the way), the gully's ----
  const flue = (o2) => { const f = { w: 4, kind: 'snow', armed: true, cover: [], green: false, pack: false, ...o2, id: L.flues.length }; L.flues.push(f); return f; };
  const horn = (f, p) => { const q = cs(p); f.horn = q; blockC(q.x, q.z, 0.45); reserve(q.x, q.z, 1.2); S.hornStones.push({ x: q.x, z: q.z, flue: f.id }); };
  const boulder = (cells, o2) => { let x = 0, z = 0; for (const [cx, cz] of cells) { blk[cz * w + cx] = 1; x += cx + 0.5; z += cz + 0.5; } x /= cells.length; z /= cells.length; reserve(x, z, 1.6); const b = { x, z, cells, ...o2 }; S.boulders.push(b); L.props.push({ t: 'boulder', x, z, r: rng.range(0, 6.28), s: 1 }); return b; };
  const flank = [];
  LX.forEach((X, k) => {
    const f = flue({ x: X, z: 60.25, dir: 0, len: 21.7, area: 'flank' });
    let top = 99; for (let z = 61; z <= 81; z++) for (let x = X - 2; x <= X + 1; x++) if (T[z * w + x]) top = Math.min(top, z);
    const side = rng.chance(0.5) ? -2 : 0;                    // the west or the east half of the lane
    boulder([[X + side, top - 2], [X + side + 1, top - 2], [X + side, top - 1], [X + side + 1, top - 1]], { flue: f.id });
    f.half = side ? 'west' : 'east';
    horn(f, { x: X + (k % 2 ? 3.5 : -3.5), z: 80.5 });
    flank.push(f);
  });
  for (const f of rng.shuffle(flank.slice()).slice(0, 4)) f.green = true;
  const fG = flue({ x: MG.lx, z: 83.25, dir: 0, len: 22.5, area: 'gully', weir: 2 });
  boulder([[MG.lx, 91], [MG.lx + 1, 91], [MG.lx, 92], [MG.lx + 1, 92]], { flue: fG.id });
  fG.half = 'east'; horn(fG, { x: MG.lx + 3.5, z: 101.5 });
  // ---- the Den: the head-stream (the clock's water, bed 0.3: it only ever wades) with two gravel bars, three lanes in
  // a fan off the north cliff with a horn-stone and a boulder each, three boulders more, two fallen pines, the hearth,
  // the den's mouth and the cub, the cut stair ----
  {
    const bars = [DP.x - 7 + rng.range(-1.5, 1.5), DP.x + 7 + rng.range(-1.5, 1.5)], zs = DP.z + 4 + rng.range(-1, 1);
    for (const p of wander([{ x: DP.x - 16.6, z: zs }, { x: DP.x - 6, z: zs + rng.range(-1.5, 1.5) }, { x: DP.x + 6, z: zs + rng.range(-1.5, 1.5) }, { x: DP.x + 16.6, z: zs }], 1.2, seed + 51, 0.5))
      for (const [x, z] of circleCells(L, p.x, p.z, 1.5)) { const i = z * w + x; if (K[i] === LAND && Math.hypot(x + 0.5 - DP.x, z + 0.5 - DP.z) < DP.r && !bars.some((b) => Math.abs(x + 0.5 - b) < 1.6)) water(i, 0.3, false); }
    S.stream = { z: zs, bed: 0.3, bars: bars.map((x) => ({ x: snap(x), z: snap(zs) })) };
    S.shallows = { x: snap(bars[1] + 3.5), z: snap(zs) };
    const den = [];
    for (const k of [-1, 0, 1]) {
      const m = bear(DP, 15 * k, 15.3), dir = k * 30 * RAD, ux = Math.sin(dir), uz = Math.cos(dir);
      let len = 0; while (len < 28.5 && Math.hypot(m.x + ux * (len + 0.5) - DP.x, m.z + uz * (len + 0.5) - DP.z) < 15.8) len += 0.5;
      const f = flue({ x: m.x, z: m.z, dir, len, area: 'den', green: true });
      den.push(f);
    }
    const sight = (c) => { const dx = DP.x - HL.x, dz = DP.z - HL.z, t = clamp(((c.x - HL.x) * dx + (c.z - HL.z) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(HL.x + dx * t - c.x, HL.z + dz * t - c.z); };
    const bOk = (c, list) => { const d = hyp(c, DP); return d >= 9.2 && d <= 12.8 && sight(c) > 2.4 && list.every((q) => hyp(q, c) >= 5.2) && bars.every((b) => Math.abs(c.x - b) > 2.6 || Math.abs(c.z - zs) > 3); };
    const six = [];
    for (const f of den) {
      const ux = Math.sin(f.dir), uz = Math.cos(f.dir); let got = null;
      for (let a = 0; a < 60 && !got; a++) {
        const u = rng.range(4, f.len - 5), sg = rng.sign(), c = { x: Math.round(f.x + ux * u - uz * sg), z: Math.round(f.z + uz * u + ux * sg) };
        if (bOk(c, six)) got = c;
      }
      if (!got) { if (!last) return fail('denCover'); continue; }
      six.push(got); f.boulder = got;
    }
    const spotsA = [bear(DP, 205, 14.5), bear(DP, 52, 15), bear(DP, 310, 15.4), bear(DP, 64, 12.5)];
    for (let a = 0; a < 1200 && six.length < 6; a++) { const c = bear(DP, rng.range(0, 360), rng.range(9.4, 12.6)); c.x = Math.round(c.x); c.z = Math.round(c.z); if (bOk(c, six) && !den.some((f) => inLane(f, c.x, c.z, 2.2)) && spotsA.every((q) => hyp(q, c) > 3.5)) six.push(c); }
    if (six.length < 6 && !last) return fail('denBoulders');
    six.forEach((c, k) => boulder([[c.x - 1, c.z - 1], [c.x, c.z - 1], [c.x - 1, c.z], [c.x, c.z]], { den: true, flue: k < 3 ? den[k]?.id : undefined }));
    den.forEach((f, k) => { const sg = k === 1 ? rng.sign() : 1 - k; let u = f.len - 1.5, p; do { p = { x: f.x + Math.sin(f.dir) * u + Math.cos(f.dir) * 3.4 * sg, z: f.z + Math.cos(f.dir) * u - Math.sin(f.dir) * 3.4 * sg }; u -= 1; } while (hyp(p, DP) > 15 && u > 8); horn(f, p); });
    for (const b of [155 + rng.range(-4, 4), 232 + rng.range(-5, 5)]) {
      const p = bear(DP, b, 15.6), r = -b * RAD + Math.PI / 2;
      for (let t = -2; t <= 2; t += 0.5) blockCell(p.x + Math.cos(b * RAD) * t, p.z + Math.sin(b * RAD) * t);
      S.pines.push({ x: p.x, z: p.z, rot: r, fallen: true }); L.props.push({ t: 'fallenPine', x: p.x, z: p.z, r, s: 1 });
    }
    const hearth = cs(bear(DP, 205, 14.5)); blockC(hearth.x, hearth.z, 0.45);
    S.callHearth = hearth; S.hearth = hearth;
    const dm = bear(DP, 52, 17.6), cub = cs(bear(DP, 52, 15)), st = cs(bear(DP, 310, 15.4));
    S.den = { x: cub.x, z: cub.z, mouth: dm, cub, rot: Math.atan2(DP.x - dm.x, DP.z - dm.z) };
    S.echo = cs(bear(DP, 64, 12.5));
    S.stair = st;
    S.haldaDen = { x: HL.x, z: HL.z, r: 2, rot: Math.atan2(DP.x - HL.x, DP.z - HL.z) }; S.haldaRim = S.haldaDen;
    S.arena = { x: DP.x, z: DP.z, r: DP.r, mouth: { x: DP.x, z: DP.z + 17.5 } };
    L.exits.push({ x: st.x, z: st.z, to: 'tarn', label: 'exit.tarn', locked: 'kallistoRest' });
    L.boss = { x: DP.x, z: DP.z, r: DP.r };
    reserve(DP.x, DP.z, DP.r + 0.5); reserve(HL.x, HL.z, 2.2);
  }
  // ---- the terraces: flat stones, two dens in the east wall, a ledge for the marksman; the west gully's den ----
  for (let a = 0, n = rng.int(6, 8); a < 300 && S.slabs.length < n; a++) {
    const p = { x: snap(rng.range(XL(48) + 3, XR(48) - 3)), z: snap(rng.range(45.5, 52.5)) }, i = I(p.x, p.z);
    if (K[i] !== LAND || T[i] || res[i] || blk[i] || S.slabs.some((q) => hyp(q, p) < 5) || S.lookouts.some((q) => hyp(q, p) < 6)) continue;
    S.slabs.push(p); reserve(p.x, p.z, 1.2); L.props.push({ t: 'slab', x: p.x, z: p.z, r: rng.range(0, 6.28), s: rng.range(0.9, 1.3) });
  }
  if (S.slabs.length < 4 && !last) return fail('slabs');
  for (const z of [46, 51]) { const x = XR(z); S.dens.push({ id: 'east' + z, x: x + 1.5, z: z + 0.5, front: { x: x - 0.5, z: z + 0.5 }, area: 'E' }); reserve(x - 0.5, z + 0.5, 1.5); }
  { const z = 92 + rng.int(0, 4), side = PX < 20 ? 27 : 14, fx = side === 27 ? 26.5 : 14.5; S.dens.push({ id: 'westGully', x: side === 27 ? 28.5 : 13.5, z: z + 0.5, front: { x: fx, z: z + 0.5 }, area: 'C2' }); reserve(fx, z + 0.5, 1.5); }
  S.dens.push({ id: 'weir1', x: W1.x + 4, z: W1.z + 5.5, front: { x: W1.x + 4, z: W1.z + 4.5 }, area: 'C', sleeper: true });
  { const x = snap(clamp(DP.x + rng.sign() * rng.range(8, 14), XL(44) + 3, XR(44) - 3)); S.ledges.push({ x, z: 44.5 }); reserve(x, 44.5, 1.2); }
  // ---- the frame ----
  for (let i = 0; i < N; i++) { const x = i % w, z = (i - x) / w; if ((x < MARGIN7 || z < MARGIN7 || x >= w - MARGIN7 || z >= h - MARGIN7) && K[i] !== ROCK) { if (!last) return fail('frame'); K[i] = ROCK; } }
  for (let i = 0; i < N; i++) if (T[i] && K[i] === ROCK) T[i] = 0;
  finish7(L, K, bed, blk, own, (vx, vz) => 5 + 6 * fbm(vx * 0.05, vz * 0.05, seed + 41));
  // ---- weir 3's ice block: on the gully's sunny floor at the edge of the cliff's shade; the flank's under the cliff ----
  const edgeE = (z) => { let x = w - 7; while (x > 60 && !L.cells[z * w + x]) x--; return x; };
  { const z = 94 + rng.int(0, 2), x = edgeE(z) - 4; S.iceblocks.push({ x: x + 0.5, z: z + 0.5, weir: 3, r: 1.2 }); res[z * w + x] = 1; }
  { const z = 70 + rng.int(0, 3), x = edgeE(z) - 1; S.iceblocks.push({ x: x + 0.5, z: z + 0.5, r: 1.2 }); res[z * w + x] = 1; }
  // ---- shade (the sun is in the east: three cells under every cliff to the east; never a cornice), no cloud on the Den ----
  for (let z = MARGIN7; z < h - MARGIN7; z++) for (let x = MARGIN7; x < w - MARGIN7; x++) {
    const i = z * w + x; if (!L.cells[i]) continue;
    for (let d = 1; d <= 3; d++) if (K[i + d] === ROCK) { L.shade[i] = 1; break; }
    if (Math.hypot(x + 0.5 - DP.x, z + 0.5 - DP.z) <= DP.r + 4) L.noCloud[i] = 1;
  }
  for (const f of L.flues) for (const [x, z] of circleCells(L, f.x, f.z, 3)) L.shade[z * w + x] = 0;
  { const b = S.iceblocks[0]; for (const [x, z] of circleCells(L, b.x, b.z, 1.6)) L.shade[z * w + x] = 0; }
  // ---- the packs ----
  const packAt = (p, o2) => { const q = { x: p.x, z: p.z, n: o2.n, tag: o2.tag, elite: o2.elite !== undefined ? o2.elite : rng.chance(0.15) ? 'champion' : null, area: o2.area, trail: !!o2.trail, ...o2.x0 }; L.packs.push(q); res[I(p.x, p.z)] = 1; return q; };
  const openAt = (x, z) => { const i = I(x, z); return L.cells[i] && !L.pocket[i]; };
  const near = (p, r = 3, ok = () => true) => { let b = null, bd = 1e9; for (const [x, z] of circleCells(L, p.x, p.z, r)) { const i = z * w + x, d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z); if (L.cells[i] && !L.pocket[i] && d < bd && ok(i)) { bd = d; b = { x: x + 0.5, z: z + 0.5 }; } } return b; };
  const inAny = (x, z, pad = 0.5) => L.flues.some((f) => inLane(f, x, z, pad));
  {
    const ch = S.huts.filter((q) => q.tag === 'causeway');
    for (const q of ch) packAt(near(q.door, 3) || q.door, { n: rng.int(5, 7), tag: 'looters', area: 'B', trail: true });
    // (the looters the brook turns out: on its bed beside the causeway's first bridge)
    { const b0 = S.bridges[0] || { x: CP.x, z: 147 }; let c = null, bd = 1e9; for (const [x, z] of circleCells(L, b0.x, b0.z, 14)) { const i = z * w + x, d = Math.hypot(x + 0.5 - b0.x, z + 0.5 - b0.z); if (L.pocket[i] === 1 && L.bed[i] <= 0.15 + 1e-6 && !T[i] && d > 3 && d < bd) { bd = d; c = { x: x + 0.5, z: z + 0.5 }; } } if (c) packAt(c, { n: rng.int(5, 6), tag: 'looters', area: 'B', x0: { tide: true } }); else if (!last) return fail('tidePack'); }
    packAt(near({ x: K2.x, z: K2.z }, 3), { n: rng.int(4, 5), tag: 'hillWolves', area: 'B', trail: true });
    for (let a = 0; a < 300; a++) { const p = { x: snap(rng.range(20, 92)), z: snap(rng.range(128, 154)) }; if (dryAt7(L, p.x, p.z) && !T[I(p.x, p.z)] && !res[I(p.x, p.z)] && L.packs.every((q) => hyp(q, p) > 12)) { packAt(p, { n: rng.int(5, 6), tag: 'choughs', area: 'B' }); break; } }
    const d1 = S.dens.find((q) => q.sleeper);
    packAt(d1.front, { n: 3, tag: 'den', area: 'C', trail: true, x0: { dormant: true, den: d1.id, wake: 12 } });
    packAt({ x: MG.lx - 0.5, z: 99.5 }, { n: rng.int(6, 7), tag: 'looters', area: 'C2', trail: true, x0: { lane: fG.id } }); fG.pack = true;
    packAt(S.iceblocks[0], { n: 3, tag: 'icebound', area: 'C2', trail: true, x0: { dormant: true, ice: true, weir: 3 } });
    packAt(S.dens.find((q) => q.id === 'westGully').front, { n: 3, tag: 'den', area: 'C2', x0: { dormant: true, den: 'westGully', wake: 12 } });
    // two worm packs on the way where it crosses a lane's open half, on two different lanes
    for (const f of rng.shuffle(flank.slice())) {
      if (L.packs.filter((q) => q.tag === 'snowHunt').length >= 2) break;
      const c = laneCells(L, f).filter((i) => T[i] && L.cells[i] && !res[i] && laneSeen(L, f, i % w + 0.5, Math.floor(i / w) + 0.5));
      if (!c.length) continue;
      const i = rng.pick(c); packAt({ x: i % w + 0.5, z: Math.floor(i / w) + 0.5 }, { n: rng.int(3, 4), tag: 'snowHunt', area: 'D', trail: true, x0: { lane: f.id } }); f.pack = true;
    }
    packAt(S.iceblocks[1], { n: 3, tag: 'icebound', area: 'D', trail: true, x0: { dormant: true, ice: true } });
    // the choughs on a dead pine above lookout 2 (the upper flank, off the way and out of every lane)
    for (let a = 0; a < 300; a++) { const p = { x: snap(MX + rng.range(-8, 8)), z: snap(rng.range(61.5, 64.5)) }; if (openAt(p.x, p.z) && !T[I(p.x, p.z)] && !res[I(p.x, p.z)] && !inAny(p.x, p.z, 1.5)) { packAt(p, { n: rng.int(5, 6), tag: 'choughs', area: 'D' }); S.pines.push({ x: p.x + 1, z: p.z, dead: true }); plug(L, p.x + 1, p.z, 0.45); L.props.push({ t: 'pine', x: p.x + 1, z: p.z, r: 0, s: 1.2, dead: true }); break; } }
    const sl = S.slabs.slice().sort((a, b) => hyp(a, { x: NF, z: 49 }) - hyp(b, { x: NF, z: 49 }));
    packAt(sl[0], { n: rng.int(3, 4), tag: 'slabs', area: 'E', trail: true, x0: { dormant: true } });
    packAt(sl[sl.length - 1], { n: rng.int(3, 4), tag: 'slabs', area: 'E', x0: { dormant: true } });
    packAt(near({ x: S.ledges[0].x, z: 46.5 }, 3), { n: rng.int(5, 6), tag: 'terrace', area: 'E', trail: true, x0: { ledge: 0 } });
    packAt(S.dens.find((q) => q.id === 'east46').front, { n: 3, tag: 'den', area: 'E', x0: { dormant: true, den: 'east46', wake: 12 } });
    for (const lk of S.lookouts) packAt(lk.approach[1], { n: lk.k === 3 ? 4 : 5, tag: lk.pack.tag, elite: lk.pack.elite, area: 'lookout', x0: { lookout: lk.k } });
  }
  if (L.packs.some((p) => !p) && !last) return fail('packs');
  // ---- chests, the loose rock under the cliffs, the clouds' lines ----
  {
    const g = S.dens.find((q) => q.id === 'westGully').front;
    const c1 = near({ x: g.x, z: g.z + 3 }, 3, (i) => !res[i] && !T[i]), c2 = near({ x: XL(63) + 3, z: 63.5 }, 4, (i) => !res[i] && !T[i] && !inAny(i % w + 0.5, Math.floor(i / w) + 0.5, 1)), c3 = near({ x: L3x < NF ? XR(47) - 4 : XL(47) + 4, z: 47.5 }, 4, (i) => !res[i] && !T[i]);
    [c1, c2, c3].forEach((c, k) => { if (c) { S.chests.push({ x: c.x, z: c.z, rare: k === 1 }); res[I(c.x, c.z)] = 1; } });
    if (S.chests.length < 3 && !last) return fail('chests');
    for (const [x, z, r] of [[edgeE(71) - 1, 73, 3], [20, 88, 2.6], [edgeE(90) - 1, 91, 2.6], [XL(45) + 3, 45.5, 2.6], [XR(64) - 2, 62.5, 2.8]]) vaultPatch(L, x + 0.5, z + 0.5, r);
    const line = (id, z, r, t0, x0 = {}) => L.clouds.push({ id, x: w + r, z, dx: -1, dz: 0, r, speed: 1.2, len: 144, t0, ...x0 });
    const tB = rng.range(0, 120), rB = rng.range(12, 14);
    line('meadow', 138 + rng.range(-3, 3), rB, tB); line('flank', 76, rng.range(9.5, 10.5), rng.range(0, 120)); line('terraces', 56.5, 9, rng.range(0, 120));
    L.clouds.push({ ...L.clouds[0], id: 'meadow2', t0: tB + 60, extra: true });
    const b = S.iceblocks[0];
    L.clouds.push({ id: 'weir3', scripted: true, x: b.x + 13, z: b.z, dx: -1, dz: 0, r: 14, speed: 1.2, len: 60, t0: 0, over: { x: b.x, z: b.z } });
  }
  // ---- snow ----
  {
    const lane = new Uint8Array(N); for (const f of L.flues) for (const i of laneCells(L, f)) lane[i] = 1;
    for (let z = MARGIN7; z < h - MARGIN7; z++) for (let x = MARGIN7; x < w - MARGIN7; x++) {
      const i = z * w + x; if (!L.cells[i] && !blk[i]) continue;
      const n = fbm(x * 0.11, z * 0.11, seed + 61);
      let s = 0;
      if (lane[i]) s = 5;
      else if (z < 44) s = n > 0.52 && Math.hypot(x + 0.5 - DP.x, z + 0.5 - DP.z) > 5 ? 4 : 0;
      else if (z < 54) s = 0;
      else if (z < 82) s = K[i - w] === ROCK || K[i - 2 * w] === ROCK ? 5 : n > 0.3 ? 4 : 0;
      else if (z < 108) s = K[i - w] === ROCK ? 5 : x > 66 ? (n > 0.3 ? 3 : 0) : n > 0.3 ? 2 : 0;
      else if (z < 160) s = n > 0.58 ? 1 : 0;
      if (T[i] && s < 5) s = 0;
      if (L.pocket[i]) s = 0;
      L.snow[i] = s;
    }
    for (const lk of S.lookouts) for (const [x, z] of circleCells(L, lk.x, lk.z, 3)) if (L.snow[z * w + x] < 5) L.snow[z * w + x] = 0;
    for (const q of [...S.huts, ...S.weirs, S.callHearth]) for (const [x, z] of circleCells(L, q.x, q.z, 2.5)) if (L.snow[z * w + x] < 5) L.snow[z * w + x] = 0;
  }
  dress7(L, rng, res, (x, z) => (z >= 120 && z < 160 ? 'meadow' : z >= 60 && z < 82 ? 'flank' : z >= 44 && z < 54 ? 'terrace' : z < 44 ? 'den' : 'bank'));
  settle(L);
  // ---- the lanes' cover, as built ----
  for (const f of L.flues) f.cover = coverSpots(L, f);
  L.refuges = refuges(L);
  L.dist = distField(L, 14);
  if (!last) {
    const f = thawFaults(L);
    if (f.length) return fail(f[0].replace(/[@.].*/, ''), f);
    const fg = thawFaults(readThaw(copy7(L), 'green'));
    if (fg.length) return fail('green.' + fg[0].replace(/[@.].*/, ''), fg);
  }
  return L;
}
// what lies about, from the zone's own draws: rocks along the cliffs' feet, stones, bushes in the meadow, pines in groups
// well off the trodden way (their shade is fixed shade), nothing in a lane, on a spot or on the way
function dress7(L, rng0, res, areaOf) {
  const { w, h } = L, rng = RNG((L.seed ^ 0x7a11d) >>> 0), P = (o) => L.props.push(o), S = L.spots, T = L.trail;
  const lane = new Uint8Array(w * h); for (const f of L.flues) for (const i of laneCells(L, f, 1.5)) lane[i] = 1;
  const keep = [L.start, ...L.exits, S.waypoint, ...(S.weirs || []), ...(S.winches || []), ...(S.levers || []), ...S.lookouts, S.callHearth, ...L.packs, ...S.chests, ...(S.iceblocks || [])].filter((p) => p && p.x != null);
  const clear = (x, z, r) => keep.every((p) => Math.hypot(p.x - x, p.z - z) > r);
  const nearT = (x, z, r) => { for (const [cx, cz] of circleCells(L, x, z, r)) if (T[cz * w + cx]) return true; return false; };
  for (let z = MARGIN7; z < h - MARGIN7; z++) for (let x = MARGIN7; x < w - MARGIN7; x++) {
    const i = z * w + x, q = rng.next(), px = x + rng.range(0.15, 0.85), pz = z + rng.range(0.15, 0.85), r = rng.range(0, 6.28), s = rng.next();
    if (!L.cells[i] || res[i] || T[i] || lane[i] || L.pocket[i] || !clear(px, pz, 1.8)) continue;
    let edge = false; for (const [dx, dz] of N4) { const j = (z + dz) * w + x + dx; if (!L.cells[j] && !L.pocket[j] && !L.low[j]) edge = true; }
    const a = areaOf(x, z);
    if (edge && q < 0.1) P({ t: 'rock', x: px, z: pz, r, s: 0.6 + s * 0.8 });
    else if (q < 0.03) P({ t: 'stone', x: px, z: pz, r, s: 0.3 + s * 0.5 });
    else if (a === 'meadow' && q > 0.975) P({ t: 'bush', x: px, z: pz, r, s: 0.7 + s * 0.6 });
  }
  // pines in groups of two to four, 4 m or more off the way, never in the arena; each a footprint and a patch of shade
  if (L.type === 'thaw') for (let g = 0, n = 0; g < 400 && n < 14; g++) {
    const gx = rng.range(10, w - 10), gz = rng.range(46, 158), a = areaOf(Math.floor(gx), Math.floor(gz));
    if (a !== 'meadow' && a !== 'flank') continue;
    if (nearT(gx, gz, 5.5) || !clear(gx, gz, 8) || S.pines.some((p) => Math.hypot(p.x - gx, p.z - gz) < 12)) continue;
    let k = 0;
    for (let t = 0, m = rng.int(2, 4); t < 12 && k < m; t++) {
      const x = snap(gx + rng.range(-2.5, 2.5)), z = snap(gz + rng.range(-2.5, 2.5)), i = Math.floor(z) * w + Math.floor(x);
      if (!L.cells[i] || L.pocket[i] || res[i] || lane[i] || nearT(x, z, 4) || S.pines.some((p) => Math.hypot(p.x - x, p.z - z) < 2.2)) continue;
      let wet = false; for (const [cx, cz] of circleCells(L, x, z, 1.6)) if (L.pocket[cz * w + cx] || lane[cz * w + cx]) wet = true;
      if (wet) continue;
      plug(L, x, z, 0.45); S.pines.push({ x, z }); P({ t: 'pine', x, z, r: rng.range(0, 6.28), s: rng.range(0.9, 1.3) });
      for (const [cx, cz] of circleCells(L, x, z, 1.6)) if (L.cells[cz * w + cx]) L.shade[cz * w + cx] = 1;
      k++;
    }
    if (k) n++;
  }
  void rng0;
}

// does the Meltwaters hold (part 2's reach checks; the reading the layout carries)
export function thawFaults(L) {
  const out = [], S = L.spots, { w } = L, far = (R, p, r = 2.2) => !p || nearReach(L, R, p.x, p.z) > r;
  if (L.ice) out.push('iceDefined');
  if (nearFrame(L)) out.push('frame');
  if (S.weirs.length !== 3 || S.fords.length !== 3 || S.lookouts.length !== 3 || !S.narrows || !S.callHearth || !S.stair || !S.den || !S.haldaDen) { out.push('spots'); return out; }
  const snowF = L.flues.filter((f) => f.kind === 'snow');
  const arenaP = [S.callHearth, S.stair, S.haldaDen, S.den];
  const north = { x: S.narrows.x, z: S.narrows.z0 - 1.5 };
  for (const mh of LEVELS7) for (const hb of [0, BROOK_TOP]) {
    const R = reach(L, L.start.x, L.start.z, walk7(L, hb, mh)), t = mh + '/' + hb;
    for (const p of [S.camp, S.waypoint, L.exits[0], S.weirs[0].stand, S.lookouts[0].hearth, ...S.huts.map((q) => q.door), ...S.bridges]) if (far(R, p)) out.push('reach.south@' + t);
    const want = [[S.weirs[1].stand, 0.9], [S.lookouts[1].hearth, 0.9], [S.dens.find((q) => q.id === 'westGully').front, 0.9], [S.weirs[2].stand, 0.6], [S.lookouts[2].hearth, 0.3], [north, 0.3], ...arenaP.map((p) => [p, 0.3])];
    for (const [p, lv] of want) { const got = !far(R, p, 2.6); if (got !== (mh <= lv + 1e-6)) out.push((got ? 'early' : 'reach') + '.' + lv + '@' + t); }
    // (the way itself: every cell of it open at the level its stretch opens)
    for (const p of L.packs) { const lv = p.area === 'B' || p.area === 'C' ? 1.2 : p.area === 'E' ? 0.3 : p.weir === 3 ? 0.6 : p.lookout ? [1.2, 0.9, 0.3][p.lookout - 1] : 0.9; if (mh <= lv + 1e-6 && far(R, p, 3.5) && !(p.tide && hb > 0)) out.push('reach.pack.' + p.tag + '@' + t); }
  }
  // the fords open in order: deep a step above their level, wading at it
  for (const f of [...S.fords, S.narrows]) { const i = Math.floor(f.z) * w + Math.floor(f.x); if (L.pocket[i] !== 2 || wetAt(L.bed[i], f.opens) !== 1 || wetAt(L.bed[i], f.opens + 0.3) !== 2) out.push('ford.' + f.id); }
  // what stands dry: the wheels, the hearths, the horn-stones, the hut doors, the camp, the exits (a footprint is dry ground)
  for (const p of [...S.weirs, ...S.weirs.map((q) => q.stand), ...S.lookouts, S.callHearth, ...S.hornStones, ...S.huts.map((q) => q.door), S.camp, S.waypoint, ...L.exits, S.haldaDen]) if (!firm(L, p.x, p.z) || L.pocket[Math.floor(p.z) * w + Math.floor(p.x)]) { out.push('onWet'); break; }
  // no hut or fold in or beside water
  for (const q of S.huts) for (const [x, z] of circleCells(L, q.x, q.z, 3)) if (L.pocket[z * w + x]) { out.push('hutInWater'); break; }
  // every brook within 12 m of a dry 3 x 3; the Den's stream never deep
  for (let i = 0; i < L.pocket.length; i += 3) if (L.pocket[i] === 1 && !refugeNear(L, i % w + 0.5, Math.floor(i / w) + 0.5, 12)) { out.push('noRefuge'); break; }
  for (const [x, z] of circleCells(L, L.boss.x, L.boss.z, L.boss.r + 2)) { const i = z * w + x; if (L.pocket[i] === 2 || (L.pocket[i] && wetAt(L.bed[i], BROOK_TOP) === 2)) { out.push('denDeep'); break; } }
  // the Den: six boulders at r 9-13 no two closer than 5 m, a clear 6 x 6 for every pair of lanes, the hearth, the stair
  // and Halda's ledge out of every lane, interacts 3 m apart, her ledge outside the radius and in sight of the bowl
  const six = S.boulders.filter((b) => b.den), dl = snowF.filter((f) => f.area === 'den');
  if (six.length !== 6 || six.some((b) => hyp(b, L.boss) < 9 || hyp(b, L.boss) > 13) || crowded(six, 5)) out.push('denBoulders');
  if (dl.length !== 3) out.push('denLanes');
  for (let a = 0; a < dl.length; a++) for (let b = a + 1; b < dl.length; b++) if (!wedge66(L, L.boss, dl[a], dl[b])) out.push('denWedge');
  if (crowded(arenaP)) out.push('arenaCrowded');
  if (hyp(S.haldaDen, L.boss) <= L.boss.r || !losL(L, S.haldaDen.x, S.haldaDen.z, L.boss.x, L.boss.z)) out.push('haldaDen');
  out.push(...laneFaults(L, [...S.weirs, ...S.lookouts, S.callHearth, S.stair, S.haldaDen, S.den, S.waypoint, ...L.exits], [S.camp]));
  // flank: two lanes or more with a pack in them and two without (the spate reading); the first chute on the way over a pack
  if (L.mode !== 'green') {
    const fl = snowF.filter((f) => f.area === 'flank');
    if (fl.length < 5 || fl.length > 7 || fl.filter((f) => f.pack).length < 2 || fl.filter((f) => !f.pack).length < 2) out.push('flankLanes');
    const g = snowF.find((f) => f.area === 'gully');
    if (!g || !L.packs.some((p) => p.lane === g.id && laneSeen(L, g, p.x, p.z))) out.push('gullyCamp');
  }
  // sun and shade: lookout 3 in open sun for 8 m, no cloud's line over the Den, ice in shade (weir 3's beside it)
  const l3 = S.lookouts[2];
  for (const [x, z] of circleCells(L, l3.x, l3.z, 8)) if (L.shade[z * w + x]) { out.push('lookout3Shade'); break; }
  out.push(...cloudFaults(L));
  S.iceblocks.forEach((b, k) => { const sh = L.shade[Math.floor(b.z) * w + Math.floor(b.x)]; if (b.weir ? sh || !circleCells(L, b.x, b.z, 4.5).some(([x, z]) => L.shade[z * w + x]) : !sh) out.push('iceShade.' + k); });
  return out;
}
// the lanes' rules, both zones: every chute with its horn-stone, out of the own-level water, a sunny cornice, cover within
// 4 m of every trail cell it strikes; every hearth and interact in ints out of every lane (but those in except) and the
// hearths 3 m from any other interact; no lane over a camp
function laneFaults(L, ints, camps, except = []) {
  const out = [], S = L.spots, { w } = L;
  for (const f of L.flues) {
    const mi = Math.floor(f.z + Math.cos(f.dir) * 0.5) * w + Math.floor(f.x + Math.sin(f.dir) * 0.5);
    if (!L.cells[mi]) out.push('lane.mouth.' + f.id);
    if (f.kind !== 'snow') continue;
    if (!f.horn || inLane(f, f.horn.x, f.horn.z, 0.4) || !firm(L, f.horn.x, f.horn.z)) out.push('lane.horn.' + f.id);
    if (laneCells(L, f, 0.5).some((i) => L.pocket[i] === 2)) out.push('lane.own.' + f.id);
    if (L.shade[Math.floor(f.z) * w + Math.floor(f.x)]) out.push('lane.shadeHead.' + f.id);
    if (uncovered(L, f).length) out.push('lane.cover.' + f.id);
    if (f.len < 21.5 || f.len > 30.01) out.push('lane.len.' + f.id);
    for (const c of camps) if (laneCells(L, f).some((i) => Math.hypot(i % w + 0.5 - c.x, Math.floor(i / w) + 0.5 - c.z) < c.r)) out.push('lane.camp.' + f.id);
  }
  for (const p of ints) if (p && !except.includes(p) && L.flues.some((f) => inLane(f, p.x, p.z, 0.5))) { out.push('lane.interact@' + Math.floor(p.x) + ',' + Math.floor(p.z)); }
  const hearths = [...S.lookouts.map((q) => q.hearth), S.callHearth];
  for (const hh of hearths) if (ints.some((p) => p && hyp(p, hh) > 0.01 && hyp(p, hh) < 3)) out.push('hearthCrowded');
  return out;
}
// no unscripted cloud ever over a noCloud cell; 20 s or more of sun between two clouds at every pack spot
function cloudFaults(L) {
  const out = [], { w, h } = L, any = L.noCloud.some((v) => v);
  for (const c of L.clouds) {
    if (c.scripted || !any) continue;
    for (let s = 0; s < c.len && !out.length; s += 1) {
      const x = c.x + c.dx * s, z = c.z + c.dz * s;
      for (let cz = Math.max(0, Math.floor(z - c.r)); cz <= Math.min(h - 1, z + c.r); cz++) for (let cx = Math.max(0, Math.floor(x - c.r)); cx <= Math.min(w - 1, x + c.r); cx++) if (L.noCloud[cz * w + cx] && Math.hypot(cx + 0.5 - x, cz + 0.5 - z) <= c.r) { out.push('cloudOverDen'); cz = cx = 1e9; }
    }
  }
  for (const p of L.packs) if (cloudGap(L, p.x, p.z) < 20) { out.push('cloudGap'); break; }
  return out;
}

// ======================= TARN: the Hanging Lake =======================
export function genTarn(seed, o = {}) {
  const mode = o.mode === 'let' ? 'let' : 'full';
  let L = null, k = 0;
  while (!L && k < 24) { L = tryTarn(seed + k * 7919, k === 23); k++; }
  L.seed = seed; L.tries = k;
  return readTarn(L, mode);
}
// the reading: 'full' keeps the Dam's mouth plugged with ice (world.js opens it at keladosWake); 'let' has the lake at 0.3
function readTarn(L, mode) {
  L.mode = mode;
  L.own.level = mode === 'let' ? 0.3 : 1.2;
  if (mode !== 'let') for (const [x, z] of L.spots.plug.cells) footprint(L, z * L.w + x);
  return L;
}

function tryTarn(seed, last) {
  const rng = RNG(seed), w = 104, h = 176, N = w * h;
  const L = daylight(base(w, h), 'tarn', seed), S = L.spots;
  Object.assign(S, { winches: [], lookouts: [], hornStones: [], bridges: [], crevasses: [], islands: [], piers: [], walls: [], levers: [], boulders: [], iceblocks: [], slabs: [], chests: [], vaults: [], npcs: {} });
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), res = new Uint8Array(N), own = new Uint8Array(N), T = L.trail, isle = new Uint8Array(N), jet = new Uint8Array(N);
  const { blockC, reserve, paintAt } = makeDraw(L, K, blk, res, rng);
  const I = (x, z) => Math.floor(z) * w + Math.floor(x);
  const put = (cx, cz, r, k) => { for (const [x, z] of circleCells(L, cx, cz, r)) K[z * w + x] = k; };
  const rect = (x0, z0, x1, z1, k) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) K[z * w + x] = k; };
  const water = (i, b, o2) => { K[i] = FLAT; bed[i] = b; own[i] = o2 ? 1 : 0; };
  const XLs = (z) => Math.floor(18.5 + 4 * fbm(z * 0.07, 0.5, seed + 3)), XRs = (z) => Math.floor(85.5 - 4 * fbm(z * 0.07, 9.5, seed + 4));
  const XLw = (z) => Math.floor(10.5 + 3 * fbm(z * 0.07, 3.5, seed + 5)), XRw = (z) => Math.floor(93.5 - 3 * fbm(z * 0.07, 6.5, seed + 6));
  const LE = (z) => XRw(z) - 11 - Math.floor(3 * fbm(z * 0.09, 2.5, seed + 7));
  // ---- the landmarks ----
  const CP = { x: snap(52 + rng.range(-4, 4)), z: snap(160 + rng.range(-1.5, 1.5)), r: 8 };
  const DM = { x: snap(52 + rng.range(-3, 3)), z: snap(23.5 + rng.range(-1, 1)), r: 16 };
  const dmx = Math.floor(DM.x), dmz = Math.floor(DM.z);
  // ---- the floor: the Snowfield (110-151), the Old Works (70-109), the lake and its shingle (44-69), the shingle on north ----
  for (let z = 110; z <= 151; z++) for (let x = XLs(z); x <= XRs(z); x++) K[z * w + x] = LAND;
  for (let z = 70; z <= 109; z++) for (let x = XLw(z); x <= XRw(z); x++) K[z * w + x] = LAND;
  put(CP.x, CP.z, CP.r, LAND); rect(Math.floor(CP.x) - 4, 148, Math.floor(CP.x) + 4, Math.floor(CP.z), LAND);
  for (let z = 44; z <= 69; z++) for (let x = XLw(z); x <= XRw(z); x++) { if (x < LE(z)) water(z * w + x, DEEP, true); else K[z * w + x] = LAND; }
  for (let z = dmz + 2; z <= 43; z++) for (let x = LE(z); x <= XRw(z); x++) K[z * w + x] = LAND;
  // the lake's arm up the Dam's west side, the arena (the wall of ice north, the lake's lip west on its two shelves)
  rect(dmx - 25, 30, dmx - 13, 46, FLAT); for (let z = 30; z <= 46; z++) for (let x = dmx - 25; x <= dmx - 13; x++) water(z * w + x, DEEP, true);
  for (const [x, z] of circleCells(L, DM.x, DM.z, DM.r)) {
    const i = z * w + x, d = Math.hypot(x + 0.5 - DM.x, z + 0.5 - DM.z), b = bearing(DM, { x: x + 0.5, z: z + 0.5 });
    if (z <= dmz - 14) { K[i] = ROCK; own[i] = 0; bed[i] = BED_DRY; }
    else if (d >= 12 && b >= 232 && b <= 308) water(i, d < 14 ? 0.6 : 0.3, true);
    else { K[i] = LAND; own[i] = 0; bed[i] = BED_DRY; }
  }
  const HD = cs(bear(DM, 160, 17.2)); put(HD.x, HD.z, 1.6, LAND);
  // the Dam's mouth: a way three cells wide east to the shingle, its plug of ice
  const CZ = dmz + 6, plugX = dmx + 17;
  for (let x = dmx + 13; x <= LE(CZ) + 1; x++) for (let dz = -1; dz <= 1; dz++) K[(CZ + dz) * w + x] = LAND;
  S.plug = { x: plugX + 0.5, z: CZ + 0.5, cells: [[plugX, CZ - 1], [plugX, CZ], [plugX, CZ + 1]] };
  // ---- the lake's shelves (rows 44 on): beds 0.9, 0.6, 0.3 by the distance from the shore and the skerry, then deep ----
  const SK = { x: snap(40 + rng.range(-6, 8)), z: snap(53.5 + rng.range(-1, 1)), r: 4 };
  for (const [x, z] of circleCells(L, SK.x, SK.z, SK.r)) { K[z * w + x] = LAND; own[z * w + x] = 0; bed[z * w + x] = BED_DRY; isle[z * w + x] = 1; }
  const JZ = 52 + rng.int(0, 8), JT = { x: LE(JZ) - 10 + 0.5, z: JZ + 0.5, r: 3 };
  {
    const D = new Uint8Array(N).fill(255), q = [];
    for (let i = 0; i < N; i++) if (K[i] === LAND && Math.floor(i / w) >= 44) { D[i] = 0; q.push(i); }
    for (let hd = 0; hd < q.length; hd++) { const i = q[hd], x = i % w, z = (i - x) / w; if (D[i] >= 10) continue; for (const [dx, dz] of N4) { const n = (z + dz) * w + x + dx; if (K[n] === FLAT && own[n] && D[n] > D[i] + 1) { D[n] = D[i] + 1; q.push(n); } } }
    for (let i = 0; i < N; i++) if (K[i] === FLAT && own[i] && Math.floor(i / w) >= 44) bed[i] = D[i] <= 2 ? 0.9 : D[i] <= 5 ? 0.6 : D[i] <= 9 ? 0.3 : DEEP;
  }
  // the jetty (dry, never a shelf's shore) and its causeway on the clock (bed 0.15: bare at the low, covered at the top)
  for (const [x, z] of circleCells(L, JT.x, JT.z, JT.r)) { const i = z * w + x; K[i] = LAND; own[i] = 0; bed[i] = BED_DRY; jet[i] = 1; }
  for (let x = Math.floor(JT.x) + 3; x < LE(JZ - 1) || x < LE(JZ) || x < LE(JZ + 1); x++) for (let dz = -1; dz <= 1; dz++) { const i = (JZ + dz) * w + x; if (K[i] === FLAT && own[i]) water(i, 0.15, false); }
  S.causeway = { x0: JT.x + 3, z0: JT.z, x1: LE(JZ), z1: JT.z, bed: 0.15 };
  // ---- the Snowfield's way and its lanes ----
  const TN = 52 + rng.range(-6, 6), tmid = { x: 52 + rng.range(-8, 8), z: 131 };
  const roads = [], road = (pts, amp, sd) => { const p = wander(pts, amp, seed + sd); roads.push(p); return p; };
  const RF = road([{ x: CP.x, z: CP.z - 2 }, { x: CP.x, z: 151 }, tmid, { x: TN, z: 110.5 }], 2, 11);
  const tx = (z) => { let b = RF[0]; for (const p of RF) if (Math.abs(p.z - z) < Math.abs(b.z - z)) b = p; return b.x; };
  const nL = rng.int(4, 5), gaps = Array.from({ length: nL - 1 }, () => 7), z0L = 115 + rng.int(0, 1);
  const gQ = rng.int(0, nL - 2); gaps[gQ] = 10;
  let slack = 147 - z0L - gaps.reduce((a, b) => a + b, 0);
  if (slack < 0) return fail('lanesFit');
  for (let s = 0; s < slack; s++) { const k = rng.int(0, nL - 2); if (gaps[k] < 11 && rng.chance(0.8)) gaps[k]++; }
  const LZ = [z0L]; for (const g of gaps) LZ.push(LZ[LZ.length - 1] + g);
  let sd0 = rng.sign();
  const lanes = LZ.map((zc, k) => {
    const side = k % 2 ? -sd0 : sd0, t = tx(zc), want = rng.range(22, 27);
    const lim = side > 0 ? XRs(zc) - 0.25 : XLs(zc) + 0.25;
    let mx = t + side * (want - 4.5); mx = side > 0 ? Math.min(mx, lim) : Math.max(mx, lim);
    mx = Math.floor(mx) + (side > 0 ? 0.75 : 0.25);
    const len = Math.max(22, Math.abs(mx - t) + 4.5);
    // (the ridge's spur behind the cornice)
    for (let z = zc - 4; z <= zc + 3; z++) for (let x = Math.floor(mx) + side; x >= 6 && x < w - 6; x += side) if (K[z * w + x] === LAND) K[z * w + x] = ROCK;
    for (let z = zc - 2; z <= zc + 1; z++) for (let u = 0; u < len; u++) { const x = Math.floor(mx - side * u); if (x > 6 && x < w - 7 && K[z * w + x] === ROCK) K[z * w + x] = LAND; }
    return { zc, side, mx, len };
  });
  // lookout 4's rock island between two lanes, three islands more; two crevasses with a snow bridge each
  const mid4 = LZ[gQ] + 5, s4 = rng.sign(), I4 = { x: snap(tx(mid4) + s4 * 8), z: mid4, r: 3 };
  const island = (p) => { for (const [x, z] of circleCells(L, p.x, p.z, p.r)) if (K[z * w + x] === LAND) isle[z * w + x] = 1; S.islands.push(p); };
  island({ ...I4, lookout: 4 });
  for (let a = 0; a < 1500 && S.islands.length < 4; a++) {
    const p = { x: snap(rng.range(24, 80)), z: snap(S.islands.length === 1 ? Math.min(148, mid4 + rng.range(7, 16)) : rng.range(113, 148)), r: rng.range(3, 4.2) };
    if (Math.abs(p.x - tx(p.z)) < p.r + 5 || S.islands.some((q) => hyp(q, p) < q.r + p.r + 4) || !circleCells(L, p.x, p.z, p.r + 2).every(([x, z]) => K[z * w + x] === LAND)) continue;
    island(p);
  }
  if (S.islands.length < 4 && !last) return fail('islands');
  {
    const bands = []; for (let k = 0; k < nL - 1; k++) if (k !== gQ) bands.push(LZ[k] + 2 + Math.floor((gaps[k] - 6) / 2));
    bands.push(LZ[nL - 1] + 3, 111);
    for (const zb of rng.shuffle(bands)) {
      if (S.crevasses.length >= 2) break;
      const side = S.crevasses.length ? -S.crevasses[0].side : rng.sign(), t = Math.round(tx(zb));
      const xs = []; for (let x = side > 0 ? t + 5 : t - 5; x > 6 && x < w - 7; x += side) { if (K[zb * w + x] !== LAND || K[(zb + 1) * w + x] !== LAND || isle[zb * w + x] || isle[(zb + 1) * w + x]) break; xs.push(x); }
      if (xs.length < 12) continue;
      const bi = rng.int(4, xs.length - 6), br = xs.slice(bi, bi + 3);
      for (const x of xs) if (!br.includes(x)) { K[zb * w + x] = HOLE; K[(zb + 1) * w + x] = HOLE; }
      const c = { z: zb + 1, x0: Math.min(...xs), x1: Math.max(...xs) + 1, side, bridge: { x: (br[0] + br[2] + 1) / 2, z: zb + 1, w: 3 } };
      S.crevasses.push(c); S.bridges.push(c.bridge); reserve(c.bridge.x, c.bridge.z, 2);
    }
    if (S.crevasses.length < 2 && !last) return fail('crevasses');
  }
  // ---- the Old Works: the wheel-house (winch 1 in its lane, lookout 5 on its corner), seven piers (winch 2), walls ----
  const HX = 17 + rng.int(0, 2), HZ = 84 + rng.int(0, 5), zc1 = HZ + 5;
  rect(12, HZ + 2, HX, HZ + 7, LAND);
  for (let z = HZ; z <= HZ + 9; z++) for (let x = HX; x <= HX + 13; x++) {
    const edge = z === HZ || z === HZ + 9 || x === HX || x === HX + 13; if (!edge) continue;
    const gap = ((x === HX || x === HX + 13) && z >= HZ + 3 && z <= HZ + 6) || (z === HZ + 9 && x >= HX + 8 && x <= HX + 10);
    if (!gap) blk[z * w + x] = 1;
  }
  S.wheelHouse = { x: HX, z: HZ, w: 14, h: 10, door: { x: HX + 9.5, z: HZ + 9.5 } };
  L.props.push({ t: 'wheelHouse', x: HX + 7, z: HZ + 5, r: 0, s: 1, w: 7, d: 5 });
  const PZ = 80 + rng.int(0, 3), PXs = Array.from({ length: 7 }, (_, k) => 44 + 7 * k);
  for (const x of PXs) { for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) blk[(PZ + dz) * w + x + dx] = 1; S.piers.push({ x: x + 1, z: PZ + 1 }); L.props.push({ t: 'pier', x: x + 1, z: PZ + 1, r: 0, s: 1 }); }
  const E7 = PXs[6];
  // ---- the way through the Works, up the shingle and into the Dam ----
  const SHX = (z) => LE(z) + 5.5;
  road([{ x: TN, z: 110.5 }, { x: TN, z: 104.5 }, { x: HX + 9.5, z: HZ + 12.5 }, { x: HX + 9.5, z: zc1 + 2 }], 0, 12);
  road([{ x: HX + 9.5, z: HZ + 12.5 }, { x: 39.5, z: HZ + 12.5 }, { x: 40.5, z: PZ + 5.5 }, { x: 64.5, z: PZ + 5.5 }, { x: E7 + 0.5, z: PZ + 4.5 }], 0.5, 13);
  road([{ x: E7 + 0.5, z: PZ + 4.5 }, { x: SHX(72), z: 72.5 }, { x: SHX(JZ), z: JZ + 0.5 }, { x: SHX(CZ + 3), z: CZ + 3.5 }, { x: LE(CZ) + 2.5, z: CZ + 0.5 }, { x: dmx + 13.5, z: CZ + 0.5 }], 0, 14);
  road([{ x: SHX(JZ), z: JZ + 0.5 }, { x: JT.x + 0.5, z: JZ + 0.5 }], 0, 15);
  for (const p of roads.flat()) for (const [x, z] of circleCells(L, p.x, p.z, 1.5)) { const i = z * w + x; if (K[i] === LAND || K[i] === FLAT) T[i] = 1; }
  for (const p of roads.flat()) paintAt(p.x, p.z, 1.9, 1);
  L.road = roads.flat();
  // ---- the camp ----
  S.camp = CP; S.waypoint = { x: CP.x + 4, z: CP.z + 1 };
  S.npcs.halda = { x: CP.x - 2.5, z: CP.z + 0.5, rot: 1.2 }; S.npcs.fire = { x: CP.x - 4, z: CP.z - 1 }; S.npcs.windWall = { x: CP.x, z: CP.z - 5.5 };
  blockC(S.npcs.fire.x, S.npcs.fire.z, 0.45); reserve(CP.x, CP.z, CP.r - 1);
  L.start = { x: CP.x, z: CP.z + 2 };
  L.exits.push({ x: CP.x, z: CP.z + 6, to: 'thaw', label: 'exit.thaw' });
  // ---- lanes: the Snowfield's, winch 1's, the Dam's two; the three sluice channels ----
  const flue = (o2) => { const f = { w: 4, kind: 'snow', armed: true, cover: [], green: true, pack: false, ...o2, id: L.flues.length }; L.flues.push(f); return f; };
  const horn = (f, p) => { const q = cs(p); f.horn = q; blockC(q.x, q.z, 0.45); reserve(q.x, q.z, 1.2); S.hornStones.push({ x: q.x, z: q.z, flue: f.id }); };
  const boulder = (cells, o2) => { let x = 0, z = 0; for (const [cx, cz] of cells) { blk[cz * w + cx] = 1; x += cx + 0.5; z += cz + 0.5; } x /= cells.length; z /= cells.length; reserve(x, z, 1.6); const b = { x, z, cells, ...o2 }; S.boulders.push(b); L.props.push({ t: 'boulder', x, z, r: rng.range(0, 6.28), s: 1 }); return b; };
  const field = lanes.map((ln) => {
    const f = flue({ x: ln.mx, z: ln.zc, dir: -ln.side * Math.PI / 2, len: ln.len, area: 'field', side: ln.side > 0 ? 'east' : 'west' });
    let ext = ln.side > 0 ? -1 : 1e9;
    for (let z = ln.zc - 2; z <= ln.zc + 1; z++) for (let x = 7; x < w - 7; x++) if (T[z * w + x]) ext = ln.side > 0 ? Math.max(ext, x) : Math.min(ext, x);
    const bx = ext + ln.side * 2, rows = rng.chance(0.5) ? [ln.zc - 2, ln.zc - 1] : [ln.zc, ln.zc + 1];
    boulder([[bx, rows[0]], [bx + ln.side, rows[0]], [bx, rows[1]], [bx + ln.side, rows[1]]], { flue: f.id });
    f.half = rows[0] < ln.zc ? 'north' : 'south';
    horn(f, { x: ln.mx - ln.side * (ln.len + 1.5), z: ln.zc + 0.5 });
    return f;
  });
  const fW = flue({ x: 12.25, z: zc1, dir: Math.PI / 2, len: 22.5, area: 'works', winch: 1 });
  boulder([[HX + 2, zc1 - 2], [HX + 3, zc1 - 2]], { flue: fW.id }); fW.half = 'north';
  horn(fW, { x: 36.5, z: zc1 + 0.5 });
  const mA = bear(DM, 323, 15.7), mB = bear(DM, 37, 15.7), eA = { x: DM.x + 3.8, z: DM.z + 10.5 }, eB = { x: DM.x - 3.8, z: DM.z + 10.5 };
  const xA = flue({ x: mA.x, z: mA.z, dir: Math.atan2(eA.x - mA.x, eA.z - mA.z), len: hyp(mA, eA), area: 'dam' });
  const xB = flue({ x: mB.x, z: mB.z, dir: Math.atan2(eB.x - mB.x, eB.z - mB.z), len: hyp(mB, eB), area: 'dam' });
  horn(xA, { x: eA.x + 3.2, z: eA.z - 3.4 }); horn(xB, { x: eB.x - 3.2, z: eB.z - 3.4 });
  const lr0 = { x: DM.x - 9, z: DM.z - 8 }, lr1 = { x: DM.x + 7.4, z: DM.z + 6.7 };
  const races = [
    flue({ kind: 'water', x: DM.x + 8.5, z: DM.z - 11.5, dir: -Math.PI / 2, len: 20, area: 'dam', lever: 1, name: 'footRace' }),
    flue({ kind: 'water', x: DM.x - 11.5, z: DM.z, dir: Math.PI / 2, len: 24, area: 'dam', lever: 2, name: 'crossRace' }),
    flue({ kind: 'water', x: lr0.x, z: lr0.z, dir: Math.atan2(lr1.x - lr0.x, lr1.z - lr0.z), len: hyp(lr0, lr1), area: 'dam', lever: 3, name: 'longRace' })
  ];
  // ---- the Dam's things: his seat, the levers, the hearth, Halda's stump, the great wheel, the spillway ----
  S.seat = { x: DM.x, z: DM.z - 12, rot: 0 };
  S.iceWall = { z: dmz - 13, x0: dmx - 9, x1: dmx + 10, hgt: 9 };
  [50, 140, 215].forEach((b, k) => { const p = cs(bear(DM, b, 14)), st = cs(bear(DM, b, 12.6)); blockC(p.x, p.z, 0.45); S.levers.push({ k: k + 1, x: p.x, z: p.z, bearing: b, stand: st, channel: races[k].id, ice: k > 0, at: [null, 0.66, 0.33][k] }); });
  const hearth = cs(bear(DM, 180, 14.5)); blockC(hearth.x, hearth.z, 0.45); S.callHearth = hearth; S.hearth = hearth;
  S.haldaDam = { x: HD.x, z: HD.z, r: 1.6, rot: Math.atan2(DM.x - HD.x, DM.z - HD.z) }; S.haldaRim = S.haldaDam;
  { const p = { x: DM.x - 15, z: DM.z }; blockC(p.x, p.z, 0.45); S.wheel = { x: p.x, z: p.z, stand: { x: p.x + 1, z: p.z }, opens: 0.6 }; }
  S.spillway = { x: dmx - 26.5, z: dmz + 8.5, rot: -Math.PI / 2 };
  S.arena = { x: DM.x, z: DM.z, r: DM.r, floor: 12, mouth: { x: dmx + 15.5, z: CZ + 0.5 } };
  S.lake = { level: 1.2, lip: { x: DM.x - 12, z: DM.z }, shelves: [0.9, 0.6, 0.3] };
  L.boss = { x: DM.x, z: DM.z, r: DM.r };
  reserve(DM.x, DM.z, DM.r + 0.5); reserve(HD.x, HD.z, 2);
  // ---- the winches: 1 in the wheel-house's lane, 2 on the east pier's sunny side, 3 on the jetty ----
  const winch = (k, p, st, mk, fg, x0) => { blockC(p.x, p.z, 0.45); S.winches.push({ k, x: p.x, z: p.z, stand: st, mark: mk, figures: fg, ...x0 }); for (const q of [st, mk, ...fg]) reserve(q.x, q.z, 0.8); reserve(p.x, p.z, 2); };
  winch(1, { x: HX + 7.5, z: zc1 + 1.5 }, { x: HX + 7.5, z: zc1 + 0.5 }, { x: HX + 5.5, z: HZ + 8.5 }, [{ x: HX + 2.5, z: HZ + 7.5 }, { x: HX + 3.5, z: HZ + 8.5 }, { x: HX + 1.5, z: HZ + 8.5 }], { rule: 'slide', lane: fW.id });
  winch(2, { x: E7 + 0.5, z: PZ + 2.5 }, { x: E7 + 0.5, z: PZ + 3.5 }, { x: E7 + 1.5, z: PZ + 2.5 }, [{ x: E7 - 2.5, z: PZ + 3.5 }, { x: E7 - 3.5, z: PZ + 4.5 }, { x: E7 - 4.5, z: PZ + 3.5 }], { rule: 'sun', pier: 6 });
  winch(3, { x: JT.x - 1.5, z: JT.z }, { x: JT.x - 0.5, z: JT.z }, { x: JT.x - 1.5, z: JT.z - 1 }, [{ x: JT.x + 0.5, z: JT.z + 1.5 }, { x: JT.x + 1.5, z: JT.z + 1.5 }, { x: JT.x + 1, z: JT.z - 1.5 }], { rule: 'race', jetty: { x: JT.x, z: JT.z, r: JT.r } });
  // ---- lookouts 4 (the rock island), 5 (the wheel-house's corner), 6 (the skerry) ----
  const lookout = (k, hearth2, rock, hut, wood, approach, pack, x0) => {
    blockC(hearth2.x, hearth2.z, 0.45); blockC(rock.x, rock.z, 0.45);
    if (hut) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) blk[I(hut.x + dx, hut.z + dz)] = 1;
    reserve(hearth2.x, hearth2.z, 3.2);
    S.lookouts.push({ k, x: hearth2.x, z: hearth2.z, hearth: hearth2, keeper: rock, hut: hut ? { x: hut.x + 1, z: hut.z + 1 } : { x: hearth2.x, z: hearth2.z - 1, ruin: true }, woodpile: wood, approach, pack, ...x0 });
  };
  lookout(4, { x: I4.x, z: I4.z + 0.5 }, { x: I4.x + s4 * 2, z: I4.z - 0.5 }, { x: Math.floor(I4.x) + (s4 > 0 ? 1 : -2), z: I4.z + 1 }, { x: I4.x - s4, z: I4.z - 1.5 }, [{ x: tx(mid4), z: mid4 + 0.5 }, { x: I4.x - s4 * 3, z: I4.z + 0.5 }], { tag: 'snowfield', elite: 'champion' }, { place: 'island', cutBy: 'snow', peak: 4, lanes: [field[gQ].id, field[gQ + 1].id] });
  lookout(5, { x: HX + 11.5, z: HZ + 1.5 }, { x: HX + 12.5, z: HZ + 2.5 }, null, { x: HX + 9.5, z: HZ + 1.5 }, [{ x: HX + 9.5, z: HZ + 9.5 }, { x: HX + 10.5, z: HZ + 7.5 }], { tag: 'icebound', elite: 'rare' }, { place: 'corner', cutBy: 'masonry', peak: 5 });
  lookout(6, { x: SK.x, z: SK.z }, { x: SK.x + 2, z: SK.z - 1 }, { x: Math.floor(SK.x) - 3, z: Math.floor(SK.z) - 2 }, { x: SK.x - 1, z: SK.z + 2 }, [{ x: SK.x, z: 70.5 }, { x: SK.x, z: SK.z + 3 }], { tag: 'shoreDen', elite: 'rare' }, { place: 'skerry', cutBy: 'lake', peak: 6, opens: 0.6, causeway: { x0: SK.x, z0: SK.z + 4, x1: SK.x, z1: 70, bed: 0.3 } });
  // ---- the channel walls ----
  for (let a = 0, n = rng.int(3, 4); a < 300 && S.walls.length < n; a++) {
    const ew = rng.chance(0.6), len = rng.int(8, 12), x0 = rng.int(36, 82 - (ew ? len : 0)), z0 = rng.int(74, 106 - (ew ? 0 : len)), cells = [];
    for (let k = 0; k < len; k++) cells.push(ew ? [x0 + k, z0] : [x0, z0 + k]);
    if (!cells.every(([x, z]) => { for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const i = (z + dz) * w + x + dx; if (K[i] !== LAND || T[i] || blk[i] || res[i]) return false; } return true; })) continue;
    for (const [x, z] of cells) blk[z * w + x] = 1;
    const c = { x: ew ? x0 + len / 2 : x0 + 0.5, z: ew ? z0 + 0.5 : z0 + len / 2, len, ew };
    S.walls.push(c); L.props.push({ t: 'wall', x: c.x, z: c.z, r: ew ? Math.PI / 2 : 0, s: 1, w: 0.5, d: len / 2 });
  }
  if (S.walls.length < 3 && !last) return fail('walls');
  // ---- the frame ----
  for (let i = 0; i < N; i++) { const x = i % w, z = (i - x) / w; if ((x < MARGIN7 || z < MARGIN7 || x >= w - MARGIN7 || z >= h - MARGIN7) && K[i] !== ROCK) { if (!last) return fail('frame'); K[i] = ROCK; } }
  for (let i = 0; i < N; i++) if (T[i] && K[i] !== LAND && K[i] !== FLAT) T[i] = 0;
  finish7(L, K, bed, blk, own, (vx, vz) => 6 + 6 * fbm(vx * 0.05, vz * 0.05, seed + 41));
  // ---- shade: two cells under both ridges' inner faces (the Snowfield and the Works), two behind every pier ----
  for (let z = 70; z <= 151; z++) for (let x = MARGIN7; x < w - MARGIN7; x++) { const i = z * w + x; if (L.cells[i] && [-2, -1, 1, 2].some((d) => K[i + d] === ROCK)) L.shade[i] = 1; }
  for (const x of PXs) for (const dz of [-1, -2]) for (const dx of [0, 1]) if (L.cells[(PZ + dz) * w + x + dx]) L.shade[(PZ + dz) * w + x + dx] = 1;
  for (const f of L.flues) for (const [x, z] of circleCells(L, f.x, f.z, 3)) L.shade[z * w + x] = 0;
  // ---- the packs ----
  const packAt = (p, o2) => { const q = { x: p.x, z: p.z, n: o2.n, tag: o2.tag, elite: o2.elite !== undefined ? o2.elite : rng.chance(0.15) ? 'champion' : null, area: o2.area, trail: !!o2.trail, ...o2.x0 }; L.packs.push(q); res[I(p.x, p.z)] = 1; return q; };
  const near = (p, r = 3, ok = () => true) => { let b = null, bd = 1e9; for (const [x, z] of circleCells(L, p.x, p.z, r)) { const i = z * w + x, d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z); if (L.cells[i] && !L.pocket[i] && d < bd && ok(i)) { bd = d; b = { x: x + 0.5, z: z + 0.5 }; } } return b; };
  const inAny = (x, z, pad = 0.5) => L.flues.some((f) => inLane(f, x, z, pad));
  const offLane = (i) => !inAny(i % w + 0.5, Math.floor(i / w) + 0.5, 1) && !res[i];
  const shadeNear = (p, r) => near(p, r, (i) => L.shade[i] && offLane(i) && !T[i]);
  {
    // B: two on the way between lanes, the worms west of the first crevasse, the Icebound in the east ridge's shade at
    // the second lane, the choughs on the island south of lookout 4
    for (const z of [LZ[0] - 3.5, LZ[nL - 1] + 4.5]) packAt(near({ x: tx(z), z }, 3, offLane) || { x: snap(tx(z)), z: snap(z) }, { n: rng.int(5, 6), tag: 'snowfield', area: 'B', trail: true });
    { const c = S.crevasses[0] || { x0: 30, z: 130 }; packAt(near({ x: Math.max(c.x0 + 3, XLs(c.z) + 4), z: c.z + 3.5 }, 4, (i) => offLane(i) && !T[i]) || near({ x: tx(c.z) - 9, z: c.z + 3.5 }, 12, (i) => offLane(i) && !T[i]), { n: rng.int(3, 4), tag: 'snowHunt', area: 'B' }); }
    { let p = null; for (let r = 6; r <= 40 && !p; r += 4) p = shadeNear({ x: XRs(LZ[1]) - 1, z: LZ[1] + 4 }, r); if (!p) { if (!last) return fail('iceShade'); p = { x: 70.5, z: LZ[1] + 4.5 }; } S.iceblocks.push({ x: p.x, z: p.z, r: 1.2 }); packAt(p, { n: 3, tag: 'icebound', area: 'B', trail: true, x0: { dormant: true, ice: true } }); }
    packAt(near(S.islands[1], 2) || S.islands[1], { n: rng.int(6, 7), tag: 'choughs', area: 'B' });
    // C: two on the way, the Icebound behind the middle pier, the nest under the wheel-house's floor
    const rw = roads[2];
    for (const t of [0.3, 0.7]) packAt(near(rw[Math.floor(rw.length * t)], 3, offLane) || rw[Math.floor(rw.length * t)], { n: rng.int(5, 6), tag: 'worksMixed', area: 'C', trail: true });
    { const p = { x: PXs[3] + 0.5, z: PZ - 0.5 }; S.iceblocks.push({ x: p.x, z: p.z, r: 1.2 }); packAt(p, { n: 3, tag: 'icebound', area: 'C', trail: true, x0: { dormant: true, ice: true } }); }
    { const p = { x: HX + 2.5, z: HZ + 1.5 }; S.slabs.push(p); packAt(p, { n: 4, tag: 'slabs', area: 'C', x0: { dormant: true } }); }
    // D: the bear fishing, the shingle's nest, the looters at the causeway's head, the choughs on the jetty's posts
    const zs = [47, 63].filter((z) => Math.abs(z - JZ) >= 6), zA = zs.length === 2 ? 63 : zs[0] ?? 66, zB = zs.length === 2 ? 47 : JZ >= 57 ? 46 : 67;
    packAt(near({ x: LE(zA) + 1.5, z: zA + 0.5 }, 3) , { n: 3, tag: 'shoreDen', area: 'D', trail: true });
    { const p = near({ x: LE(zB) + 8.5, z: zB + 0.5 }, 3, (i) => !T[i]); S.slabs.push(p); packAt(p, { n: rng.int(3, 4), tag: 'slabs', area: 'D', trail: true, x0: { dormant: true } }); }
    packAt({ x: LE(JZ) - 2.5, z: JZ + 0.5 }, { n: rng.int(5, 6), tag: 'looters', area: 'D', trail: true, x0: { tide: true } });
    packAt({ x: JT.x + 1.5, z: JT.z - 1.5 }, { n: rng.int(5, 6), tag: 'choughs', area: 'D', x0: { jetty: true } });
    for (const lk of S.lookouts) packAt(lk.approach[1], { n: lk.k === 5 ? 1 : lk.k === 6 ? 3 : 5, tag: lk.pack.tag, elite: lk.pack.elite, area: 'lookout', x0: { lookout: lk.k } });
  }
  if (L.packs.some((p) => !p || p.x == null)) return fail('packs');
  // ---- chests, the loose ice under the ridges, the clouds' lines ----
  {
    const c1 = S.islands.slice(1).map((q) => near(q, 2.5, (i) => offLane(i) && !T[i])).find(Boolean) || near({ x: tx(112) + 9, z: 112.5 }, 8, (i) => offLane(i) && !T[i]), c2 = near({ x: XRw(100) - 4, z: 100.5 }, 4, (i) => !res[i] && !T[i]), c3 = near({ x: XRw(34) - 2, z: 34.5 }, 3, (i) => !res[i] && !T[i]);
    [c1, c2, c3].forEach((c, k) => { if (c) { S.chests.push({ x: c.x, z: c.z, rare: k === 2 }); res[I(c.x, c.z)] = 1; } });
    if (S.chests.length < 3 && !last) return fail('chests');
    for (const [x, z, r] of [[XLs(126) + 2, 126, 3], [XRs(138) - 2, 138, 3], [XLw(76) + 2, 76, 2.6], [XRw(96) - 2, 96, 2.6], [XRw(50) - 1, 50, 2.6]]) vaultPatch(L, x + 0.5, z + 0.5, r);
    const line = (id, z, r, t0, x0 = {}) => L.clouds.push({ id, x: w + r, z, dx: -1, dz: 0, r, speed: 1.2, len: 144, t0, ...x0 });
    const tS = rng.range(0, 120), tW = rng.range(0, 120);
    line('snowfield', 131 + rng.range(-2, 2), rng.range(12, 13), tS); line('works', PZ + 6 + rng.range(-1, 1), rng.range(11, 12), tW);
    L.clouds.push({ ...L.clouds[0], id: 'snowfield2', t0: tS + 60 }); L.clouds.push({ ...L.clouds[1], id: 'works2', t0: tW + 60, extra: true });
    // two lines across the Dam, each every 100 s and 50 s apart: a cloud on the arena's middle 15 s in every 50
    [[-1, 1], [1, 51]].forEach(([sg, off], k) => { const a = sg * 12 * RAD, dx = -Math.cos(a), dz = Math.sin(a); L.clouds.push({ id: 'dam' + (k + 1), x: DM.x - dx * 60, z: DM.z - dz * 60, dx, dz, r: 9, speed: 1.2, len: 120, t0: off, dam: true }); });
  }
  // ---- snow: the Snowfield but its rock islands, every chute; the rest bare rock, scree and shingle ----
  {
    const lane = new Uint8Array(N); for (const f of L.flues) if (f.kind === 'snow') for (const i of laneCells(L, f)) lane[i] = 1;
    for (let i = 0; i < N; i++) { if (!L.cells[i] || L.pocket[i]) continue; const z = Math.floor(i / w); L.snow[i] = lane[i] ? 5 : z >= 110 && z <= 151 && !isle[i] ? 5 : 0; }
  }
  dress7(L, rng, res, () => 'tarn');
  settle(L);
  for (const f of L.flues) f.cover = f.kind === 'snow' ? coverSpots(L, f) : [];
  L.refuges = refuges(L);
  L.dist = distField(L, 14);
  if (!last) {
    const f = tarnFaults(readTarn(copy7(L), 'full'));
    if (f.length) return fail(f[0].replace(/[@.].*/, ''), f);
    const fl = tarnFaults(readTarn(copy7(L), 'let'));
    if (fl.length) return fail('let.' + fl[0].replace(/[@.].*/, ''), fl);
  }
  return L;
}

// does the Hanging Lake hold (part 2's reach checks). The plug is opened for the reach beyond it
export function tarnFaults(L) {
  const out = [], S = L.spots, { w } = L, far = (R, p, r = 2.2) => !p || nearReach(L, R, p.x, p.z) > r;
  if (L.ice) out.push('iceDefined');
  if (nearFrame(L)) out.push('frame');
  if (S.winches.length !== 3 || S.lookouts.length !== 3 || S.levers.length !== 3 || !S.seat || !S.plug || !S.callHearth || !S.haldaDam || !S.wheel || S.bridges.length !== 2 || S.piers.length !== 7) { out.push('spots'); return out; }
  const open = L.cells.slice(); for (const [x, z] of S.plug.cells) open[z * w + x] = 1;
  const A = L.boss, rim = [...S.levers.map((q) => q.stand), S.callHearth, S.haldaDam];
  // the plug shuts the Dam in the 'full' reading
  if (L.mode !== 'let') { const R = reach(L, L.start.x, L.start.z, walk7(L, 0, 0.3)); if (!far(R, S.callHearth, 2.6)) out.push('plugLeaks'); }
  for (const mh of LEVELS7) for (const hb of [0, BROOK_TOP]) {
    const W = walk7(L, hb, mh, open), R = reach(L, L.start.x, L.start.z, W), t = mh + '/' + hb;
    for (const p of [S.camp, S.waypoint, L.exits[0], S.winches[0].stand, S.winches[1].stand, S.lookouts[0].hearth, S.lookouts[1].hearth, ...S.bridges, S.arena.mouth, ...rim]) if (far(R, p, 2.6)) out.push('reach@' + t);
    // winch 3: at the clock's low always; never at its top while the lake stands at 0.9 or more
    const j = !far(R, S.winches[2].stand);
    if (hb === 0 ? !j : j && mh >= 0.9 - 1e-6) out.push((j ? 'early' : 'reach') + '.winch3@' + t);
    // lookout 6 and the great wheel: from 0.6 down, never above
    for (const [p, id] of [[S.lookouts[2].hearth, 'lookout6'], [S.wheel.stand, 'wheel']]) { const got = !far(R, p, id === 'wheel' ? 0.8 : 2.6); if (got !== (mh <= 0.6 + 1e-6)) out.push((got ? 'early' : 'reach') + '.' + id + '@' + t); }
    for (const p of L.packs) { if (p.lookout === 6 ? mh > 0.6 : p.jetty || p.tide ? hb > 0 : false) continue; if (far(R, p, 3.5)) out.push('reach.pack.' + p.tag + '@' + t); }
    // the rim: the levers, the hearth and Halda's stump reach each other outside r 12 (no thrown block can shut the ring)
    const ring = W.slice(); for (const [x, z] of circleCells(L, A.x, A.z, 12)) ring[z * w + x] = 0;
    const s0 = nearFloor({ ...L, cells: ring }, S.callHearth.x, S.callHearth.z, 2);
    const Rr = s0 ? reach(L, s0.x, s0.z, ring) : new Uint8Array(W.length);
    if (rim.some((p) => far(Rr, p, 2.2))) out.push('rim@' + t);
  }
  // r 12 of floor at 1.2 (but the wall of ice north); the seat within 3.5 m of floor on its south side, in the Foot-race
  { const W = walk7(L, 0, 1.2, open); let shut = 0; for (const [x, z] of circleCells(L, A.x, A.z, 11.9)) { const i = z * w + x; if (W[i] || z <= S.iceWall.z) continue; if (L.pocket[i]) { out.push('floor12'); break; } shut++; } if (shut > 6) out.push('floor12.blocked'); }
  { const p = nearFloor(L, S.seat.x, S.seat.z + 2, 2); if (!p || hyp(p, S.seat) > 3.5 || !L.cells[Math.floor(S.seat.z) * w + Math.floor(S.seat.x)]) out.push('seat'); }
  const races = L.flues.filter((f) => f.kind === 'water'), dam = L.flues.filter((f) => f.kind === 'snow' && f.area === 'dam');
  if (races.length !== 3 || !inLane(races[0], S.seat.x, S.seat.z) || S.levers.some((q, k) => q.channel !== races[k].id)) out.push('races');
  if (dam.length !== 2 || !wedge66(L, A, dam[0], dam[1])) out.push('damWedge');
  if (crowded([...S.levers, S.callHearth, S.haldaDam, S.wheel])) out.push('arenaCrowded');
  if (hyp(S.haldaDam, A) <= A.r || !losL(L, S.haldaDam.x, S.haldaDam.z, A.x, A.z)) out.push('haldaDam');
  // what stands dry
  for (const p of [...S.winches, ...S.winches.map((q) => q.stand), ...S.lookouts, ...S.levers, S.callHearth, ...S.hornStones, S.camp, S.waypoint, ...L.exits, S.haldaDam, S.wheel]) if (!firm(L, p.x, p.z) || L.pocket[Math.floor(p.z) * w + Math.floor(p.x)]) { out.push('onWet'); break; }
  for (let i = 0; i < L.pocket.length; i += 3) if (L.pocket[i] === 1 && !refugeNear(L, i % w + 0.5, Math.floor(i / w) + 0.5, 12)) { out.push('noRefuge'); break; }
  // the lanes (winch 1 stands in its lane by design); the snow bridges out of every lane; winch 2 in the sun
  const w1 = S.winches[0];
  out.push(...laneFaults(L, [...S.winches, ...S.lookouts, ...S.levers, S.callHearth, S.haldaDam, S.wheel, S.waypoint, ...L.exits], [S.camp], [w1]));
  const f1 = L.flues.find((f) => f.winch === 1);
  if (!f1 || !inLane(f1, w1.x, w1.z) || !laneSeen(L, f1, w1.stand.x, w1.stand.z)) out.push('winch1Lane');
  for (const b of S.bridges) for (const dx of [-1, 0, 1]) for (const dz of [-0.5, 0.5]) if (L.flues.some((f) => inLane(f, b.x + dx, b.z + dz, 0.4))) { out.push('bridgeInLane'); break; }
  for (const c of S.crevasses) { let n = 0; for (let x = c.x0; x < c.x1; x++) if (L.low[(c.z - 1) * w + x] && L.low[c.z * w + x]) n++; if (n < 8 || !dryAt7(L, c.bridge.x, c.bridge.z - 0.5)) out.push('crevasse'); }
  if (L.shade[Math.floor(S.winches[1].z) * w + Math.floor(S.winches[1].x)] || L.shade[Math.floor(S.winches[1].stand.z) * w + Math.floor(S.winches[1].stand.x)]) out.push('winch2Shade');
  const fl = L.flues.filter((f) => f.area === 'field');
  if (fl.length < 4 || fl.length > 6) out.push('fieldLanes');
  out.push(...cloudFaults(L));
  S.iceblocks.forEach((b, k) => { if (!L.shade[Math.floor(b.z) * w + Math.floor(b.x)]) out.push('iceShade.' + k); });
  // against a third blue act: 40% or more of the dry floor bare
  { let n = 0, bare = 0; for (let i = 0; i < L.cells.length; i++) if (L.cells[i] && !L.pocket[i]) { n++; if (!L.snow[i]) bare++; } if (bare < 0.4 * n) out.push('bare40'); }
  return out;
}
