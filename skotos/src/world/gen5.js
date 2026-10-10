// Act V layouts as plain data: the Frozen Coast (genCoast: the Anvil's Neck, the Landing, the Shallows, the Ship Graveyard,
// the Frozen Fall and the Whalebone Strand, Skerry Bay) and the Farthest Light (genFarlight: the Icebound Ship, the Ice Road
// over the frozen sea, the three Breathing-holes, the Drowned Lights, the bergs, the Light's Skerry). North is z 0: the sea
// meets the fog on the north and east edges. Besides cells/paint/low/hgt/dist they carry
//   L.bed      (coast) each cell's bed in metres, in 0.15 m steps: BED_DRY dry land, -0.6 open sea; ice, thick and window
//              cells -0.6 (the water's colour: the tide never moves them); the jetty keeps the flat's bed under it (the
//              water under it comes and goes); L.vbed the corners' mean bed, (w + 1) x (h + 1), the water's and the
//              ground's aBed (taken before the footprints, so the water runs on under a hull)
//   L.sea      open water no tide drives: the farlight's leads, holes, ice edge and sea; the coast's Icemaw holes
//   L.ice, L.thick, L.window, L.deck   thin ice; thick ice; ice windows over their pits (each in a ring of thick ice);
//              the Landing's jetty
//   L.tideLocked, L.refuges, L.spines, L.rims, L.boss, L.mode, L.tries   (docs/act5-contract.md, The level object L)
// A blocked footprint (a hull, a hut, a tower, a boulder, a rib, a berg, a ridge block) is BED_DRY in L.bed and thick under
// the ice, so neither the tide nor the ice can ever open it. L.hgt is laid before the footprints (they stand on the floor).
// L.props, placed by build5.js act5Level (t, x, z, r, s; y where it is not 0):
//   wreck (the Dalarö), keelboat, rowboat, brokenBoat (tilt; ice: caught in the ice), shack, stiltHut, rack, jetty (len, wd:
//   the root's middle, r the way out), whale, frozenFall (hgt: the fall's top), icicle, anchor, sunkenAnchor, kelp, driftwood,
//   barnacleRock, rockFace (on a cliff's foot, r toward the floor), seaStack, shoreRock, boulder (the bay islets' cover),
//   ribs (the wrecked hull in the bay; cells in spots.ribs), ship (the Icebound Ship, tilt), berg (r its radius), iceBlock
//   (pressure ridges), pole (marker poles), skerryRock (the Light's Skerry's rim, about 3 m), sunkenLantern (under a
//   drowned window, y -2), brazier (the farlight camp's fire), fx (an emitter, as build.js reads it)
// The story's own props (sea-lights, the hearth, the bell, boats, Name-stones, ice windows, hole lamps, cairns, the Farthest
// Light, the door-stone, casks, the skerry's tower) are placed from L.spots by world.js and actors.js.
import { RNG, clamp, fbm, angleDiff, smooth } from '../core/util.js';
import { base, distField } from './gen.js';
import { reach, nearReach, circleCells, snap, BED_DRY, wetAt } from './genlib.js';

// what a cell is while the layout is drawn
const ROCK = 0, LAND = 1, FLAT = 2, SEA = 3, THIN = 4, THICK = 5, WIN = 6, DECK = 7, HOLE = 8;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const Q = (b) => Math.round(b / 0.15) * 0.15;
const HIGH = 1.2; // high water
// why tries were thrown away (check-act5 reports it): reason -> count
export const REJECT = {};
const fail = (r) => { REJECT[r] = (REJECT[r] || 0) + 1; return null; };

// ---------- the walk grid at a tide level (what tide.js keeps, and what the checks walk) ----------
// a tidal cell: a bed below BED_DRY, and no ice, thick ice, window or deck over it
export const tidal = (L, i) => !!L.bed && L.bed[i] < BED_DRY && !L.ice[i] && !L.thick[i] && !L.window[i] && !L.deck[i];
// Skerry Bay's own water (L.boss + 4): behind its bar the zone's clock never reaches it; the Walking Tower drives it
export const inBay = (L, x, z) => L.type === 'coast' && Math.hypot(x + 0.5 - L.boss.x, z + 0.5 - L.boss.z) < L.boss.r + 4;
// cells walkable at water level h (m): the build's grid with every tidal cell deep at h closed (the bay keeps low water)
export function walkAt(L, h, cells = L.cells) {
  const { w } = L, out = cells.slice();
  if (!L.bed) return out;
  for (let i = 0; i < out.length; i++) if (out[i] && tidal(L, i) && wetAt(L.bed[i], h) === 2 && !inBay(L, i % w, (i - i % w) / w)) out[i] = 0;
  return out;
}

// ======================= COAST: the Frozen Coast =======================
// South to north: the Neck from the Field of Ash (the entry, its overlook), the Landing's cove in the west with its jetty
// over the Landing water, the Shallows' tidal flats to the east (creeks, rock islets, the Dalarö on its bar, the Grey Light
// out on its islet at the seaward edge, the ebb caves under the low sea-cliff), the Ship Graveyard's frozen bay north of
// them (its shingle shore, wrecks on the shore and in the ice, the thick spine to the Wreck Light on the point), the Frozen
// Fall's fjord in the west (an ice shelf in its inner half, the thick path along its west wall to the Fall Light, the
// Whalebone Strand on its east shore, the Rime Bear's den), and Skerry Bay at the top, its north rim on the open sea.
// The main road runs on dry land: the Neck, the Landing, north between the Fall and the Shallows, the Graveyard's south
// shore, the bay. o.frozen: the same layout after the Freeze (freezeBay: the bay's north rim becomes the road onto the ice).
export function genCoast(seed, o = {}) {
  let L = null, k = 0;
  while (!L && k < 24) { L = tryCoast(seed + k * 7919, k === 23); k++; }
  L.seed = seed; L.tries = k;
  if (o.frozen) freezeBay(L);
  return L;
}
function tryCoast(seed, last) {
  const rng = RNG(seed), w = 120, h = 200, N = w * h;
  const L = base(w, h);
  Object.assign(L, { type: 'coast', seed, mode: 'tide', low: new Uint8Array(N), bed: new Float32Array(N), sea: new Uint8Array(N), ice: new Uint8Array(N), thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N), tideLocked: [], refuges: [], spines: [], rims: [] });
  const sp = L.spots;
  Object.assign(sp, { huts: [], racks: [], boats: [], sealights: [], stones: [], chests: [], shrines: [], caves: [], wrecks: [], casks: [], roosts: [], mawHoles: [], bayIslets: [] });
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), frame = new Uint8Array(N), res = new Uint8Array(N);
  const D = makeDraw(L, K, blk, res, rng);
  const { disc, seg, cellK, blockC, blockR, free, reserve, paintAt } = D;
  // ---- the landmarks (the contract's ranges) ----
  const NK = { x: snap(52 + rng.range(-10, 10)), z: h - 5 };
  const LD = { x: snap(30 + rng.range(-6, 6)), z: snap(136 + rng.range(-6, 6)), r: 13 };
  const C = { x: Math.round(60 + rng.range(-8, 8)), z: Math.round(30 + rng.range(-3, 3)), r: 18 };
  const GL = { x: snap(106 + rng.range(-4, 4)), z: snap(116 + rng.range(-8, 8)), r: 4 };
  const WL = { x: snap(clamp(110 + rng.range(-4, 4), 106, 112)), z: snap(66 + rng.range(-6, 6)) };
  const FA = { x: 9 + rng.range(-3, 3), z: 90 + rng.range(-8, 8) };
  // ---- the sea: open water along the north and the east, and a channel down the west to the fjord's mouth ----
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const n = fbm(x * 0.05, z * 0.05, seed + 1);
    if (z < 8 + n * 7 || (x > 109 + (n - 0.5) * 8 && z < 150 + (n - 0.5) * 8) || (z < 62 && x > 6 + n * 4 && x < 32 + (n - 0.5) * 6)) K[z * w + x] = SEA;
  }
  // ---- the Fall's fjord: open water in its outer half, the ice shelf in the inner, its head under the Landing ----
  const FS = Math.min(Math.floor(FA.z) - 8, 84), FE = LD.z - 6;
  const fjW = (z) => { const b = 8 + fbm(z * 0.08, 2.3, seed + 3) * 3, k = smooth(clamp(1 - (Math.abs(z - FA.z) - 4) / 5, 0, 1)); return b + (FA.x + 1 - b) * k; };
  const fjE = (z) => 37 + (fbm(z * 0.06, 5.1, seed + 3) - 0.5) * 6 - Math.max(0, z - (FE - 10)) * 1.2;
  for (let z = 56; z < FE; z++) for (let x = Math.floor(fjW(z)); x < fjE(z); x++) K[z * w + x] = z < FS ? SEA : THIN;
  // ---- the Shallows' flats: from the shore road east to the sea, the Landing water reaching west to the cove ----
  const shS = (x) => 147 + (fbm(x * 0.07, 9.3, seed + 5) - 0.5) * 6;
  const shN = (x) => 95 + (fbm(x * 0.07, 1.7, seed + 5) - 0.5) * 3;
  const shW = (z) => (z < LD.z - 7 ? 57 + (fbm(z * 0.08, 4.1, seed + 5) - 0.5) * 4 : LD.x + 8 + (fbm(z * 0.08, 6.3, seed + 5) - 0.5) * 3);
  for (let z = 90; z < 156; z++) for (let x = 30; x < w; x++) { const i = z * w + x; if (K[i] !== SEA && z < shS(x) && z > shN(x) && x > shW(z)) K[i] = FLAT; }
  // ---- the Ship Graveyard: a bay frozen over, a shingle shore along its south, open to the sea past the point ----
  for (let z = 54; z < 92; z++) for (let x = 63; x < w; x++) {
    const i = z * w + x, n = fbm(x * 0.07, z * 0.07, seed + 9);
    if (K[i] === SEA || z < 57 + (n - 0.5) * 6) continue;
    K[i] = z < 85 + (n - 0.5) * 3 ? THIN : FLAT;
  }
  // ---- dry land: the Graveyard's shore and its point, the Neck and its overlook, the Landing, the strand, the den ----
  const gEnd = 97 + rng.range(0, 6);
  for (let z = 89; z < 96; z++) for (let x = 55; x < gEnd + (fbm(z * 0.3, 3.3, seed + 9) - 0.5) * 4; x++) K[z * w + x] = LAND;
  seg(WL.x + 1.5, WL.z - 9, WL.x, WL.z, 3.2, LAND); disc(WL.x, WL.z, 4.6, LAND);
  const M = { x: snap(clamp(NK.x + rng.range(-8, 6), 42, 62)), z: 153 };
  let neckE = 0;
  {
    const ph = rng.range(0, 6.28);
    for (let z = h - 2; z >= M.z; z -= 0.5) {
      const t = (h - 2 - z) / (h - 2 - M.z), x = NK.x + (M.x - NK.x) * smooth(t) + Math.sin(t * 5.2 + ph) * 3.5 * Math.sin(t * Math.PI);
      const r = 4.6 + fbm(x * 0.1, z * 0.1, seed + 11) * 1.4;
      disc(x, z, r, LAND); if (z < 162) neckE = Math.max(neckE, x + r);
      paintAt(x, z, 1.5, 0.8);
    }
    sp.overlook = { x: M.x, z: M.z - 1.5, r: 6 };
    disc(M.x, M.z - 1, 5.5, LAND);
  }
  disc(LD.x, LD.z, LD.r, LAND);
  for (let z = 60; z < FE - 3; z++) for (let x = Math.floor(fjE(z) - 1); x < Math.max(fjE(z) + 8, 47) + fbm(z * 0.2, 7.7, seed) * 3; x++) K[z * w + x] = LAND;
  const den = { x: 46, z: 57, r: 3 };
  for (let z = 54; z < 61; z++) for (let x = 43; x < 49; x++) K[z * w + x] = LAND;
  // the main road: the Neck's mouth, through the Landing, north between the Fall and the Shallows, the Graveyard's
  // shore, the bay (always on dry ground: it overrides the water it brushes)
  const W = [sp.overlook, { x: LD.x + 9, z: LD.z + 7 }, { x: LD.x + 8, z: LD.z - 3 }, { x: LD.x + 5, z: LD.z - 11 }, { x: 48 + rng.range(-2, 2), z: 112 }, { x: 52 + rng.range(-2, 2), z: 99 }, { x: 60 + rng.range(-1, 2), z: 91 }, { x: 58 + rng.range(-2, 2), z: 72 }, { x: C.x + rng.range(-3, 3), z: C.z + 17 }];
  const road = [];
  for (let k = 1; k < W.length; k++) {
    const a = W[k - 1], b = W[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)), px = -(b.z - a.z) / Math.max(1, n), pz = (b.x - a.x) / Math.max(1, n);
    for (let j = 0; j <= n; j++) {
      const t = j / Math.max(1, n), x0 = a.x + (b.x - a.x) * t, z0 = a.z + (b.z - a.z) * t, o = (fbm(x0 * 0.08, z0 * 0.08, seed + 13) - 0.5) * 5 * Math.sin(Math.PI * t);
      const x = x0 + px * o, z = z0 + pz * o;
      road.push({ x, z });
      disc(x, z, 2.7, LAND); paintAt(x, z, 1.7, 1);
    }
  }
  L.road = road;
  // (nothing is ever set down on the road's middle)
  for (const p of road) if (Math.hypot(p.x - LD.x, p.z - LD.z) > LD.r - 4) reserve(p.x, p.z, 1.3);
  // ---- Skerry Bay: the sand bowl in the south half behind its dry rim, thin ice in the north inside a thick rim ----
  for (let z = C.z - 22; z <= C.z + 22; z++) for (let x = C.x - 22; x <= C.x + 22; x++) {
    if (x < 0 || z < 0 || x >= w || z >= h) continue;
    const i = z * w + x, d = Math.hypot(x + 0.5 - C.x, z + 0.5 - C.z), north = z < C.z;
    if (d < 16) K[i] = north ? THIN : FLAT;
    else if (d < 18) K[i] = north ? THICK : LAND;
    else if (d < 21.5) K[i] = north ? SEA : LAND;
  }
  // the spine across its ice, west to east, two cells wide
  for (let x = C.x - 17; x < C.x + 17; x++) {
    const zs = C.z - 7 + Math.round((fbm(x * 0.12, 4.4, seed + 15) - 0.5) * 3);
    for (const z of [zs, zs + 1]) if (Math.hypot(x + 0.5 - C.x, z + 0.5 - C.z) < 17) K[z * w + x] = THICK;
  }
  // the three islets of the bowl, a boulder on each
  for (const a0 of [-1, 0, 1]) {
    const a = a0 * 1.05 + rng.range(-0.14, 0.14), x = C.x + Math.sin(a) * 9, z = C.z + Math.cos(a) * 9;
    disc(x, z, 3.5, LAND);
    const b = { x: x + Math.sin(a) * 0.6, z: z + Math.cos(a) * 0.6 };
    sp.bayIslets.push({ x, z, r: 3.5, boulder: b });
    L.refuges.push({ x, z, r: 3.5, skerry: true, bay: true });
    L.props.push({ t: 'boulder', x: b.x, z: b.z, r: rng.range(0, 6.28), s: rng.range(1.1, 1.35), bay: true });
    blockC(b.x, b.z, 1.1);
  }
  // the sleeping Skerry at the centre
  for (const [x, z] of circleCells(L, C.x, C.z, 4)) { K[z * w + x] = LAND; blk[z * w + x] = 1; }
  sp.skerry = { x: C.x, z: C.z, r: 4, cells: circleCells(L, C.x, C.z, 4) };
  // the wrecked hull's ribs along one flank of the bowl
  {
    const s = rng.sign(), cells = [];
    for (let k = 0; k < 7; k++) {
      const a = s * (0.84 + k * 0.105), x = C.x + Math.sin(a) * 12.6, z = C.z + Math.cos(a) * 12.6;
      for (const c of circleCells(L, x, z, 0.62)) if (!cells.some((q) => q[0] === c[0] && q[1] === c[1])) cells.push(c);
    }
    for (const [x, z] of cells) blk[z * w + x] = 1;
    const a = s * 1.16;
    sp.ribs = { x: C.x + Math.sin(a) * 12.6, z: C.z + Math.cos(a) * 12.6, r: a, cells };
    L.props.push({ t: 'ribs', x: sp.ribs.x, z: sp.ribs.z, r: a + Math.PI / 2, s: 1, arc: [s * 0.84, s * 1.47], R: 12.6, cx: C.x, cz: C.z });
  }
  L.boss = { x: C.x, z: C.z, r: C.r };
  L.rims.push({ id: 'bay', x: C.x, z: C.z, r0: 16, r1: 18 });
  // the way onto the frozen sea, from the rim's north point to the top edge: open water until the Freeze
  const XR = C.x + Math.round(rng.range(-3, 3));
  {
    const cells = [];
    for (let x = XR - 2; x < XR + 2; x++) for (let z = 2; z < C.z; z++) { if (Math.hypot(x + 0.5 - C.x, z + 0.5 - C.z) < 18) break; cells.push([x, z]); K[z * w + x] = SEA; }
    sp.iceRoad = { x: XR, z: C.z - 17, cells };
    sp.iceShut = { x: XR, z: C.z - 16.5 };
  }
  // ---- the Shallows: the Grey Light's islet and causeway, the Dalarö's bar, creeks, the ebb caves, four islets ----
  const bar = new Uint8Array(N), creek = new Float32Array(N).fill(-1), cave = new Uint8Array(N), cway = new Uint8Array(N);
  disc(GL.x, GL.z, GL.r, LAND);
  {
    // the causeway, two cells wide, to the nearest dry shore (the Graveyard's, north of it)
    let T = null, bd = 1e9;
    for (let z = 85; z < 100; z++) for (let x = 60; x < w; x++) if (K[z * w + x] === LAND && z < GL.z - 4) { const d = Math.hypot(x + 0.5 - GL.x, z + 0.5 - GL.z); if (d < bd) { bd = d; T = { x: x + 0.5, z: z + 0.5 }; } }
    if (!T && !last) return fail('causeway');
    T ||= { x: GL.x, z: 94 };
    const n = Math.ceil(Math.hypot(T.x - GL.x, T.z - GL.z)), ph = rng.range(0, 9);
    for (let j = 0; j <= n; j++) {
      const t = j / n, o = Math.sin(t * Math.PI) * (fbm(t * 3 + ph, 1.1, seed) - 0.5) * 6;
      const x = GL.x + (T.x - GL.x) * t + o * 0.8, z = GL.z + (T.z - GL.z) * t;
      for (const [cx, cz] of circleCells(L, x, z, 1.05)) { const i = cz * w + cx; if (K[i] === FLAT || K[i] === SEA) { K[i] = FLAT; cway[i] = 1; } }
    }
    sp.causeway = { x0: GL.x, z0: GL.z, x1: T.x, z1: T.z };
  }
  // creeks: two or three meanders 30 to 50 m in from the sea edge, which flood first and drain last
  for (let k = 0, nC = rng.int(2, 3); k < nC; k++) {
    const st = { x: 107, z: 102 + (k + rng.range(0.15, 0.85)) * 42 / nC, ang: -Math.PI / 2 + rng.range(-0.3, 0.3) }, len = rng.range(30, 50);
    for (let g = 0; g < len; g++) {
      st.ang += rng.range(-0.28, 0.28) + angleDiff(st.ang, -Math.PI / 2) * 0.12;
      st.x += Math.sin(st.ang); st.z = clamp(st.z + Math.cos(st.ang), 98, 144);
      for (const [cx, cz] of circleCells(L, st.x, st.z, 1.25 + (1 - g / len) * 0.6)) { const i = cz * w + cx; if (K[i] === FLAT && !cway[i]) creek[i] = Math.max(creek[i], 1 - g / len); }
    }
  }
  // the Dalarö on its bar: hull sides walled, the stern closed, the bow broken open onto a walkable belly
  {
    let DB = null;
    for (let t = 0; t < 60 && !DB; t++) {
      const x = rng.range(74, 98), z = rng.range(104, 140);
      if (Math.hypot(x - GL.x, z - GL.z) < 16 || segDist(x, z, sp.causeway) < 9) continue;
      if (circleCells(L, x, z, 9).every(([cx, cz]) => K[cz * w + cx] === FLAT)) DB = { x, z };
    }
    if (!DB) { if (!last) return fail('dalaro'); DB = { x: 86, z: 124 }; }
    const a = rng.range(0, 6.28), fx = Math.sin(a), fz = Math.cos(a);
    for (const [cx, cz] of circleCells(L, DB.x, DB.z, 10)) {
      const dx = cx + 0.5 - DB.x, dz = cz + 0.5 - DB.z, u = dx * fx + dz * fz, v = dx * fz - dz * fx;
      if ((u / 9.5) ** 2 + (v / 4.6) ** 2 < 1 && K[cz * w + cx] === FLAT) bar[cz * w + cx] = 1;
    }
    const wall = [];
    for (let u = -6.5; u <= 6.6; u += 0.5) for (const v of [-2.3, 2.3]) wall.push([DB.x + fx * u + fz * v, DB.z + fz * u - fx * v]);
    for (let v = -2.3; v <= 2.3; v += 0.5) wall.push([DB.x - fx * 6.5 + fz * v, DB.z - fz * 6.5 - fx * v]);
    for (const [x, z] of wall) blockC(x, z, 0.55);
    const belly = { x: DB.x + fx * 0.5, z: DB.z + fz * 0.5 };
    sp.wrecks.push({ x: DB.x, z: DB.z, r: a, kind: 'dalaro', tilt: rng.range(0.06, 0.16), lice: true, belly });
    L.props.push({ t: 'wreck', x: DB.x, z: DB.z, r: a, s: 1, tilt: sp.wrecks[0].tilt });
    reserve(DB.x, DB.z, 8);
    const hoard = { x: snap(DB.x - fx * 3), z: snap(DB.z - fz * 3), hoard: true, tideLocked: true };
    sp.chests.push(hoard); L.tideLocked.push(hoard);
    sp.casks.push({ x: DB.x + fx * 8.2, z: DB.z + fz * 8.2 });
    sp.dalaro = { x: DB.x, z: DB.z, r: a, bow: { x: DB.x + fx * 8, z: DB.z + fz * 8 } };
    sp.roosts.push({ x: DB.x - fx * 2, z: DB.z - fz * 2 });
  }
  // the ebb caves under the low sea-cliff along the south: one keeps a Name-stone, the other a hoard
  {
    const xs = [], lo = Math.max(62, neckE + 6, M.x + 10);
    for (let t = 0; t < 80 && xs.length < 2; t++) { const x = snap(rng.range(lo, 106)); if (xs.every((q) => Math.abs(q - x) > 11)) xs.push(x); }
    if (xs.length < 2 && !last) return fail('caves');
    xs.forEach((x, k) => {
      const z0 = shS(x), c = { x, z: snap(z0 + 3.2), r: 2.6 };
      seg(x, z0 - 2, c.x, c.z, 1.6, FLAT, (k0) => k0 === LAND || k0 === SEA);
      disc(c.x, c.z, 2.6, FLAT, (k0) => k0 === LAND || k0 === SEA);
      for (const [cx, cz] of circleCells(L, c.x, c.z, 3.4)) if (K[cz * w + cx] === FLAT && cz >= z0 - 2) cave[cz * w + cx] = 1;
      for (let z = Math.floor(z0 - 2); z < z0 + 1; z++) for (let dx = -1; dx <= 1; dx++) if (K[z * w + Math.floor(x) + dx] === FLAT) cave[z * w + Math.floor(x) + dx] = 1;
      sp.caves.push(c); reserve(c.x, c.z, 3);
      const p = { x: c.x, z: snap(c.z + 0.8), tideLocked: true };
      // (each Name-stone stands in its own cell: blocked, as the Landing's and the whale's)
      if (k === 0) { const st = { id: 'carriers', ...p, r: Math.PI }; sp.stones.push(st); L.tideLocked.push(st); blockC(st.x, st.z, 0.45); }
      else { const ch = { ...p, hoard: true }; sp.chests.push(ch); L.tideLocked.push(ch); }
    });
  }
  // four rock islets, the refuges: one by each cave and by the Dalarö (so every tide-locked place has one near), one free
  {
    const near = [...L.tideLocked.filter((p) => p !== sp.chests[0]).map((p) => ({ x: p.x, z: p.z, d: 5 })), { x: sp.chests[0].x, z: sp.chests[0].z, d: 7.5 }, null];
    for (const want of near) {
      let got = null;
      for (let t = 0; t < 160 && !got; t++) {
        const r = rng.range(2, 3.5), a = rng.range(0, 6.28), dd = want ? rng.range(want.d, 11.2) : 0;
        const x = want ? want.x + Math.sin(a) * dd : rng.range(62, 104), z = want ? want.z + Math.cos(a) * dd : rng.range(100, 142);
        if (!circleCells(L, x, z, r + 0.8).every(([cx, cz]) => K[cz * w + cx] === FLAT && !bar[cz * w + cx] && !cave[cz * w + cx] && !cway[cz * w + cx] && !blk[cz * w + cx])) continue;
        if (L.refuges.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r + 3) || Math.hypot(x - GL.x, z - GL.z) < 9) continue;
        got = { x: snap(x), z: snap(z), r };
      }
      if (!got) { if (!last) return fail('islets'); continue; }
      disc(got.x, got.z, got.r, LAND);
      L.refuges.push({ x: got.x, z: got.z, r: got.r, skerry: true });
      if (rng.chance(0.6)) L.props.push({ t: 'barnacleRock', x: got.x + rng.range(-0.8, 0.8), z: got.z + rng.range(-0.8, 0.8), r: rng.range(0, 6.28), s: rng.range(0.8, 1.2) });
    }
  }
  L.refuges.push({ x: GL.x, z: GL.z, r: GL.r, skerry: true, light: 'grey' });
  // ---- the Graveyard: the thick spine across its ice to the Wreck Light, wrecks on the shore and in the ice ----
  {
    const s0 = { x: snap(clamp(rng.range(84, 96), 70, gEnd - 4)), z: 91.5 }, n = Math.ceil(Math.hypot(WL.x - s0.x, WL.z - s0.z)), ph = rng.range(0, 9);
    for (let j = 0; j <= n; j++) {
      const t = j / n, o = Math.sin(t * Math.PI) * (fbm(t * 2.5 + ph, 7.3, seed) - 0.5) * 7;
      const x = s0.x + (WL.x - s0.x) * t + o * 0.7, z = s0.z + (WL.z - s0.z) * t;
      disc(x, z, 1.55, THICK, (k0) => k0 === LAND);
    }
    L.spines.push({ id: 'wreck', from: s0, to: { x: WL.x, z: WL.z } });
    sp.spineWreck = s0;
  }
  // ---- the Fall: the frozen pool at its foot, the Light's rock, the thick path along the west wall from the Landing ----
  {
    disc(FA.x + 2.8, FA.z, 2.4, THICK);
    const rock = { x: snap(FA.x + 7.5), z: snap(FA.z + 1.5) };
    disc(rock.x, rock.z, 3, LAND);
    const P0 = { x: LD.x - 8, z: LD.z - 7 }, P1 = { x: fjW(FE - 8) + 2.4, z: FE - 8 };
    seg(P0.x, P0.z, P1.x, P1.z, 1.15, THICK, (k0) => k0 === LAND);
    const px = (z) => fjW(z) + 2.4 + (fbm(z * 0.15, 3, seed + 17) - 0.5) * 1.2;
    for (let z = P1.z; z > rock.z + 2; z -= 1) seg(px(z), z, px(z - 1), z - 1, 1.15, THICK, (k0) => k0 === LAND);
    seg(px(Math.floor(rock.z + 2)), Math.floor(rock.z + 2), rock.x, rock.z, 1.15, THICK, (k0) => k0 === LAND);
    L.spines.push({ id: 'fall', from: P0, to: rock });
    sp.fall = { x: FA.x - 0.2, z: FA.z, r: Math.PI / 2 };
    sp.fallRock = rock;
    L.props.push({ t: 'frozenFall', x: FA.x - 0.2, z: FA.z, r: Math.PI / 2, hgt: 11 + rng.range(0, 4) });
    for (let k = 0; k < 9; k++) L.props.push({ t: 'icicle', x: FA.x - 0.6, z: FA.z + rng.range(-5, 5), r: Math.PI / 2 + rng.range(-0.3, 0.3), s: rng.range(0.6, 1.4), y: rng.range(2, 9) });
  }
  // the borders: nothing to stand on at the map's edge (the sea runs out to it)
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if ((x < 2 || z < 2 || x >= w - 2 || z >= h - 2) && K[z * w + x] !== SEA) K[z * w + x] = ROCK;
  for (let z = h - 6; z < h - 2; z++) for (let x = Math.floor(NK.x) - 2; x <= NK.x + 2; x++) K[z * w + x] = LAND;
  // ---- the beds: the flats rise from the sea edge to the shore; the Landing water shelves from its beach ----
  const dSea = bfs(L, (i) => K[i] === SEA, (i) => K[i] !== ROCK, 60);
  const dCove = bfs(L, (i) => K[i] === LAND && Math.hypot(i % w + 0.5 - LD.x, Math.floor(i / w) + 0.5 - LD.z) < LD.r + 1, (i) => K[i] === FLAT, 30);
  for (let i = 0; i < N; i++) {
    const x = i % w, z = (i - x) / w;
    if (K[i] === SEA || K[i] === THIN || K[i] === THICK || K[i] === HOLE) bed[i] = -0.6;
    if (K[i] !== FLAT) continue;
    const nz = fbm(x * 0.05, z * 0.05, seed + 7) - 0.5;
    let b;
    if (inBay(L, x, z)) b = 0.2 + 0.4 * clamp(Math.hypot(x + 0.5 - C.x, z + 0.5 - C.z) / 16, 0, 1) ** 1.3 + nz * 0.15;
    else if (z >= 84 && z < 92 && x > 62) b = 0.9 - (92 - z) * 0.09 + nz * 0.2;       // the Graveyard's shingle
    else if (z >= LD.z - 8 && x < 60 && dCove[i] < 30) b = 0.95 - dCove[i] * 0.06 + nz * 0.25; // the Landing water
    else b = 0.9 * nz + 0.12 + 0.8 * clamp((dSea[i] < 255 ? dSea[i] : 40) / 40, 0, 1);
    if (creek[i] >= 0) b = Math.min(b, -0.3 + 0.6 * (1 - creek[i]) + nz * 0.1);
    if (bar[i]) b = 0.6 + (fbm(x * 0.4, z * 0.4, seed + 19) > 0.5 ? 0.15 : 0);
    if (cave[i]) b = 0.3 + clamp(fbm(x * 0.5, z * 0.5, seed + 21), 0, 1) * 0.3;
    if (cway[i]) b = 0.45 + (fbm(x * 0.3, z * 0.3, seed + 23) > 0.55 ? 0.15 : 0);
    bed[i] = clamp(Q(clamp(b, -0.3, inBay(L, x, z) ? 0.6 : 1.05)), -0.3, 1.05);
  }
  // ---- the Landing: the hearth, its waypoint and the bell; the jetty, the boats, the huts and racks; Keyx's stone ----
  {
    const s = rng.sign(), hearth = { x: snap(LD.x + rng.range(-1.5, 1.5)), z: snap(LD.z + 1) };
    sp.hearth = hearth; sp.camp = { x: LD.x, z: LD.z, r: LD.r };
    sp.waypoint = { x: hearth.x + s * 3.5, z: hearth.z + 2 };
    blockC(hearth.x, hearth.z, 0.6); reserve(hearth.x, hearth.z, 2.6); reserve(sp.waypoint.x, sp.waypoint.z, 2.2);
    // the jetty, two planks wide and nine long, east from the beach over the Landing water
    const row = Math.floor(LD.z) - 1;
    let xr = Math.floor(LD.x) + 6;
    while (xr < w - 12 && (K[row * w + xr] === LAND || K[(row + 1) * w + xr] === LAND)) xr++;
    const deck = [];
    for (let x = xr; x < xr + 9; x++) for (const z of [row, row + 1]) { const i = z * w + x; if (K[i] === FLAT) { K[i] = DECK; deck.push([x, z]); } }
    if (deck.length < 14 && !last) return fail('jetty');
    sp.jetty = { x: xr, z: row + 1, r: Math.PI / 2, len: 9, cells: deck };
    L.props.push({ t: 'jetty', x: xr, z: row + 1, r: Math.PI / 2, len: 9, wd: 2 });
    sp.casks.push({ x: xr + 8.5, z: row + 1.5 });
    reserve(xr - 1, row + 1, 2);
    // the bell on its post at the beach, by the jetty's root
    sp.bell = { x: xr - 1.5, z: row + 3.5 };
    if (K[Math.floor(sp.bell.z) * w + Math.floor(sp.bell.x)] !== LAND) sp.bell = { x: xr - 2.5, z: row + 0.5 };
    blockC(sp.bell.x, sp.bell.z, 0.35); reserve(sp.bell.x, sp.bell.z, 1.6);
    // three keel-boats drawn up on the beach north of the jetty, bows to the water
    // (drawn up on the upper beach, bows to the water, clear of the jetty and the road)
    const beach = [];
    for (const [cx, cz] of circleCells(L, LD.x, LD.z, LD.r + 8)) {
      const i = cz * w + cx; if (K[i] !== FLAT || bed[i] < 0.45 || cz >= shS(cx) - 3) continue;
      let bx = 0, bz = 0;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const k = K[(cz + dz) * w + cx + dx]; if (k === LAND) { bx -= dx; bz -= dz; } }
      if (bx || bz) beach.push({ x: cx + 0.5, z: cz + 0.5, a: Math.atan2(bx, bz) });
    }
    for (const e of rng.shuffle(beach)) {
      if (sp.boats.length >= 3) break;
      if (deck.some(([dx, dz]) => Math.hypot(dx + 0.5 - e.x, dz + 0.5 - e.z) < 2.3) || sp.boats.some((q) => Math.hypot(q.x - e.x, q.z - e.z) < 3) || road.some((q) => Math.hypot(q.x - e.x, q.z - e.z) < 3)) continue;
      if (!rectCells(L, e.x, e.z, 1.1, 2.9, e.a).every(([cx, cz]) => { const i = cz * w + cx; return !blk[i] && !res[i] && (K[i] === FLAT || K[i] === LAND); })) continue;
      blockR(e.x, e.z, 0.9, 2.6, e.a); reserve(e.x, e.z, 1.4);
      sp.boats.push({ x: e.x, z: e.z, r: e.a });
    }
    // (the rest moored along the jetty, lying on the mud at low water)
    for (const [dx, dz] of [[3.5, -1.2], [3.5, 3.2], [6.5, -1.2], [6.5, 3.2]]) {
      if (sp.boats.length >= 3) break;
      const e = { x: xr + dx, z: row + dz, a: Math.PI / 2 };
      if (sp.boats.some((q) => Math.hypot(q.x - e.x, q.z - e.z) < 3)) continue;
      if (!rectCells(L, e.x, e.z, 0.9, 2.7, e.a).every(([cx, cz]) => { const i = cz * w + cx; return !blk[i] && !res[i] && K[i] === FLAT; })) continue;
      blockR(e.x, e.z, 0.8, 2.5, e.a);
      sp.boats.push({ x: e.x, z: e.z, r: e.a, moored: true });
    }
    if (sp.boats.length < 3 && !last) return fail('boats');
    // huts round the cove's landward side, doors to the hearth; racks between them
    const want = rng.int(5, 7), angs = [];
    for (let t = 0; t < 160 && sp.huts.length < want; t++) {
      const a = rng.range(-2.7, 1.4), r = rng.range(7.2, 10), x = LD.x + Math.sin(a) * r, z = LD.z + Math.cos(a) * r, kind = rng.chance(0.45) ? 'shack' : 'stilt';
      if (angs.some((q) => Math.abs(angleDiff(q, a)) < 0.42) || road.some((p) => Math.hypot(p.x - x, p.z - z) < 3.8) || !free(x, z, 2.4)) continue;
      const face = Math.atan2(LD.x - x, LD.z - z);
      if (!circleCells(L, x, z, 2.5).every(([cx, cz]) => K[cz * w + cx] === LAND)) continue;
      if (kind === 'shack') blockR(x, z, 1.7, 2.1, face); else blockR(x, z, 1.5, 1.5, face);
      reserve(x, z, 2.6); angs.push(a);
      sp.huts.push({ x, z, r: face, kind });
      L.props.push({ t: kind === 'shack' ? 'shack' : 'stiltHut', x, z, r: face, s: 1 });
    }
    if (sp.huts.length < 5 && !last) return fail('huts');
    for (let t = 0; t < 90 && sp.racks.length < 2; t++) {
      const a = rng.range(-2.8, 1.6), r = rng.range(4.6, 8.6), x = LD.x + Math.sin(a) * r, z = LD.z + Math.cos(a) * r, rr = a + Math.PI / 2;
      if (road.some((p) => Math.hypot(p.x - x, p.z - z) < 3) || !free(x, z, 1.6) || !rectCells(L, x, z, 0.8, 2, rr).every(([cx, cz]) => K[cz * w + cx] === LAND)) continue;
      blockR(x, z, 0.3, 1.5, rr); reserve(x, z, 2.4);
      sp.racks.push({ x, z, r: rr });
      L.props.push({ t: 'rack', x, z, r: rr, s: 1 });
    }
    // Keyx's Name-stone at the cove's edge; who stands where
    const sa = rng.range(-2, -1);
    const ks = landNear(L, K, blk, res, LD.x + Math.sin(sa) * 6.5, LD.z + Math.cos(sa) * 6.5);
    if (ks) { sp.stones.push({ id: 'keyx', x: ks.x, z: ks.z, r: Math.atan2(LD.x - ks.x, LD.z - ks.z) }); blockC(ks.x, ks.z, 0.45); reserve(ks.x, ks.z, 2); }
    const at = (x, z, r) => { const p = landNear(L, K, blk, res, x, z); if (p) reserve(p.x, p.z, 1.2); return p && { x: p.x, z: p.z, r }; };
    const hx = hearth.x, hz = hearth.z, rack = sp.racks[0] || { x: LD.x - 4, z: LD.z + 4, r: 0 };
    sp.npcs = {
      alkyone: at(hx - s * 2.2, hz - 1.6, Math.PI * 0.75),
      tamarisk: at(hx + s * 1.5, hz - 3.2, Math.PI),
      glaukos: at(hx - s * 3.6, hz + 2.4, -s * 1.2),
      shore: [at(rack.x + Math.cos(rack.r) * 1.2, rack.z - Math.sin(rack.r) * 1.2, rack.r), at(sp.bell.x - 0.8, sp.bell.z + 1.2, Math.PI / 2), at(xr - 1.2, row + 2.6, Math.PI / 2)].filter(Boolean)
    };
    reserve(LD.x, LD.z, 3);
  }
  // ---- Skerry Bay's shore rock (Alkyone in q27 and the Freeze), outside the rim on the bowl's side ----
  {
    const s = rng.sign();
    const p = landNear(L, K, blk, res, C.x + s * 11, C.z + 19.3, 3) || landNear(L, K, blk, res, C.x - s * 11, C.z + 19.3, 3);
    if (p) { sp.npcs.rock = { x: p.x, z: p.z, r: Math.atan2(C.x - p.x, C.z - p.z) }; reserve(p.x, p.z, 1.6); blockC(p.x + s * 1.4, p.z + 0.6, 0.7); L.props.push({ t: 'shoreRock', x: p.x + s * 1.4, z: p.z + 0.6, r: rng.range(0, 6.28), s: 1.4 }); }
  }
  // ---- the three sea-lights: the tower on its rock, the base to light it from, the 2 x 2 ice window at its foot ----
  const light = (id, x, z, toward, winSide) => {
    const face = Math.atan2(toward.x - x, toward.z - z), base = landNear(L, K, blk, res, x + Math.sin(face) * 2.8, z + Math.cos(face) * 2.8, 2);
    blockC(x, z, 1.75);
    // the window two cells by two, in a ring of thick ice, beside the tower (on the side that has room)
    let win = null;
    for (const [da, dd] of [[winSide, 4.2], [-winSide, 4.2], [winSide * 0.5, 4.2], [-winSide * 0.5, 4.2], [winSide * 1.5, 4.2], [-winSide * 1.5, 4.2], [Math.PI, 4.2], [winSide, 5], [-winSide, 5], [Math.PI, 5]]) {
      const a = face + da, wx = Math.round(x + Math.sin(a) * dd), wz = Math.round(z + Math.cos(a) * dd);
      let okW = true;
      for (let cz = wz - 2; cz < wz + 2 && okW; cz++) for (let cx = wx - 2; cx < wx + 2; cx++) { const i = cz * w + cx; if (blk[i] || K[i] === ROCK || K[i] === SEA || K[i] === HOLE || res[i]) okW = false; }
      if (okW) { win = { x: wx, z: wz }; break; }
    }
    if (!win) return false;
    for (let cz = win.z - 2; cz < win.z + 2; cz++) for (let cx = win.x - 2; cx < win.x + 2; cx++) { const i = cz * w + cx; frame[i] = 1; K[i] = cz >= win.z - 1 && cz < win.z + 1 && cx >= win.x - 1 && cx < win.x + 1 ? WIN : THICK; }
    reserve(win.x, win.z, 2.6); if (base) reserve(base.x, base.z, 1.6);
    sp.sealights.push({ id, x, z, r: face, base, window: win });
    return !!base;
  };
  if (!light('grey', GL.x, GL.z, { x: sp.causeway.x1, z: sp.causeway.z1 }, 1.5) && !last) return fail('light.grey');
  if (!light('wreck', WL.x, WL.z, sp.spineWreck, -1.5) && !last) return fail('light.wreck');
  if (!light('fall', sp.fallRock.x, sp.fallRock.z, { x: FA.x + 2.8, z: FA.z + 6 }, -1.6) && !last) return fail('light.fall');
  // ---- the Whalebone Strand: the right whale, a skua roost on its skull, Thaleia's stone under its jaw; the den ----
  {
    const zw = rng.range(72, FE - 16), x = fjE(zw) + 4.2, a = (rng.chance(0.5) ? 0 : Math.PI) + rng.range(-0.35, 0.35);
    const fx = Math.sin(a), fz = Math.cos(a);
    sp.whale = { x, z: zw, r: a };
    L.props.push({ t: 'whale', x, z: zw, r: a, s: 1 });
    blockC(x + fx * 6.2, zw + fz * 6.2, 1.1);
    for (let u = -5; u <= 4; u += 1.5) blockC(x + fx * u, zw + fz * u, 0.4);
    reserve(x, zw, 7.5);
    sp.roosts.push({ x: x + fx * 6.2, z: zw + fz * 6.2 });
    const st = landNear(L, K, blk, res, x + fx * 8.4 + fz * 1.2, zw + fz * 8.4 - fx * 1.2, 2);
    if (st) { sp.stones.push({ id: 'thaleia', x: st.x, z: st.z, r: a + Math.PI }); blockC(st.x, st.z, 0.45); reserve(st.x, st.z, 1.8); }
    sp.den = den; reserve(den.x, den.z, 3);
    sp.strand = { x, z: zw };
  }
  // ---- the Graveyard's wrecks: some drawn up on the shore (one holds the sailor's stone), the rest held in the ice ----
  {
    const want = rng.int(6, 9);
    let dry = false, nShore = 0;
    for (let t = 0; t < 320 && sp.wrecks.length - 1 < want; t++) {
      const onShore = !dry || (nShore < Math.ceil(want / 2) && rng.chance(0.5)), kind = !dry ? 'keelboat' : rng.pick(['keelboat', 'keelboat', 'rowboat', 'brokenBoat']);
      const len = kind === 'keelboat' ? 4.4 : kind === 'rowboat' ? 2.4 : 3.6, wd = kind === 'rowboat' ? 0.9 : 1.4;
      const x = rng.range(66, gEnd), z = onShore ? (!dry ? rng.range(91.5, 93.5) : rng.range(84, 90)) : rng.range(62, 82);
      const a = onShore ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) + rng.range(-0.25, 0.25) : rng.range(0, 6.28);
      const cl = rectCells(L, x, z, wd + 1, len + 1, a);
      if (!cl.every(([cx, cz]) => { const k = K[cz * w + cx], i = cz * w + cx; return !blk[i] && !res[i] && (k === THIN || (onShore && (k === LAND || k === FLAT))); })) continue;
      if (road.some((p) => Math.hypot(p.x - x, p.z - z) < len + 3) || segDist(x, z, { x0: sp.spineWreck.x, z0: sp.spineWreck.z, x1: WL.x, z1: WL.z }) < len + 2.5) continue;
      const fx = Math.sin(a), fz = Math.cos(a), hold = !dry;
      if (hold) {
        // its hold open to the shore: sides and stern walled, the belly floor
        const st = { id: 'sailor', x: snap(x - fx * (len - 1.4)), z: snap(z - fz * (len - 1.4)), r: a };
        if (K[Math.floor(st.z) * w + Math.floor(st.x)] !== LAND) continue;
        for (let u = -len; u <= len; u += 0.5) for (const v of [-wd, wd]) blockC(x + fx * u + fz * v, z + fz * u - fx * v, 0.5);
        for (let v = -wd; v <= wd; v += 0.5) blockC(x - fx * len + fz * v, z - fz * len - fx * v, 0.5);
        if (blk[Math.floor(st.z) * w + Math.floor(st.x)]) return fail('sailor');
        sp.stones.push(st); blockC(st.x, st.z, 0.45); dry = true;
        sp.wrecks.push({ x, z, r: a, kind, tilt: 0, lice: false, belly: { x, z }, hold: true });
      } else {
        blockR(x, z, wd, len, a);
        sp.wrecks.push({ x, z, r: a, kind, tilt: onShore ? rng.range(0.1, 0.35) : rng.range(0.05, 0.25), lice: kind !== 'rowboat' && rng.chance(0.7) });
      }
      if (onShore) nShore++;
      reserve(x, z, len + 1.5);
      L.props.push({ t: kind, x, z, r: a, s: 1, tilt: sp.wrecks[sp.wrecks.length - 1].tilt, ice: !onShore || undefined });
      if (!onShore && kind === 'keelboat') sp.roosts.push({ x, z });
      if (onShore && sp.casks.length < 5) { const c = landNear(L, K, blk, res, x + fz * (wd + 1.4), z - fx * (wd + 1.4), 2); if (c) sp.casks.push(c); }
    }
    if ((sp.wrecks.length < 7 || !dry) && !last) return fail(dry ? 'wrecks' : 'sailor');
  }
  // ---- the Icemaw holes in the Fall's shelf, away from the path, the pool and the rock ----
  {
    const want = rng.int(3, 5);
    for (let t = 0; t < 200 && sp.mawHoles.length < want; t++) {
      const x = rng.range(10, 40), z = rng.range(FS + 2, FE - 4);
      if (!circleCells(L, x, z, 3.2).every(([cx, cz]) => K[cz * w + cx] === THIN && !frame[cz * w + cx])) continue;
      if (sp.mawHoles.some((q) => Math.hypot(q.x - x, q.z - z) < 7)) continue;
      for (const [cx, cz] of circleCells(L, x, z, 1.15)) K[cz * w + cx] = HOLE;
      sp.mawHoles.push({ x: snap(x), z: snap(z) });
    }
    if (sp.mawHoles.length < 3 && !last) return fail('mawHoles');
  }
  // ---- a shrine on the strand by the road; chests at the den's back, on the point by the Wreck Light, on a free islet ----
  {
    const p = road.find((q) => q.z < sp.strand.z - 6 && q.z > 66);
    const s = p && landNear(L, K, blk, res, p.x - 4, p.z, 3);
    if (s) { sp.shrines.push(s); reserve(s.x, s.z, 2); }
    const dc = landNear(L, K, blk, res, den.x, den.z - 2, 2);
    if (dc) { sp.chests.push({ ...dc, rare: true }); reserve(dc.x, dc.z, 1.5); }
    const wl = sp.sealights.find((q) => q.id === 'wreck'), pc = wl && landNear(L, K, blk, res, wl.x - Math.sin(wl.r) * 3, wl.z - Math.cos(wl.r) * 3, 3);
    if (pc) { sp.chests.push({ ...pc }); reserve(pc.x, pc.z, 1.5); }
    const isl = L.refuges.find((q) => !q.bay && !q.light && !L.tideLocked.some((t) => Math.hypot(t.x - q.x, t.z - q.z) < 12));
    if (isl) { const c = landNear(L, K, blk, res, isl.x, isl.z, 1); if (c) { sp.chests.push({ ...c, islet: true }); reserve(c.x, c.z, 1); } }
  }
  // ---- the exits: back up the Neck to the Field, and from the bay's north rim onto the ice (shut until the Freeze) ----
  L.exits.push({ x: NK.x, z: h - 5, to: 'ashfield', label: 'exit.ashfield' }, { x: XR, z: 3, to: 'farlight', label: 'exit.farlight', locked: 'frozen' });
  L.start = { x: NK.x, z: h - 7.5 };
  // ---- finish the grid (everything below stands on it) ----
  finishCoast(L, K, bed, blk, frame);
  sealPockets(L, blk);
  const R0 = reach(L, L.start.x, L.start.z, walkAt(L, 0)), R1 = reach(L, L.start.x, L.start.z, walkAt(L, HIGH));
  // ---- the packs: the Sunken under the wrack line, a choir on the flats, lice in the hulls, Reefbacks on the bars, the
  // bear in its den, the Icemaw's hunters on the shelf, skuas over the bones and the masts ----
  {
    const wrack = [];
    for (let z = 96; z < 146; z += 2) for (let x = 60; x < 108; x += 2) { const i = z * w + x; if (K[i] === FLAT && Math.abs(L.bed[i] - 0.6) < 0.01 && !bar[i] && !cave[i] && !cway[i] && R0[i] && !res[i]) wrack.push({ x: x + 0.5, z: z + 0.5 }); }
    const tide = [];
    for (const p of rng.shuffle(wrack)) {
      if (tide.length >= 4) break;
      if (tide.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 16) || Math.hypot(p.x - GL.x, p.z - GL.z) < 9) continue;
      tide.push(p);
      L.packs.push({ x: p.x, z: p.z, n: rng.int(4, 6), tag: 'sunkenCrew', dormant: true, tide: true, elite: rng.chance(0.15) ? 'champion' : null });
      L.props.push({ t: 'kelp', x: p.x, z: p.z, r: rng.range(0, 6.28), s: rng.range(1, 1.4) });
    }
    for (let k = 0; k < 2; k++) {
      const p = flatSpot(L, rng, R0, (i) => L.bed[i] >= 0.3 && L.bed[i] <= 0.75 && !res[i] && !cave[i], L.packs, 14);
      if (p) L.packs.push({ ...p, n: rng.int(4, 5), tag: 'tideChoir', dormant: true, tide: true, elite: rng.chance(0.2) ? 'rare' : null });
    }
    const gs = flatSpot(L, rng, R0, (i) => { const z = Math.floor(i / w); return z > 84 && z < 92 && Math.abs(L.bed[i] - 0.6) < 0.2; }, L.packs, 10);
    if (gs) L.packs.push({ ...gs, n: rng.int(4, 5), tag: 'sunkenCrew', dormant: true, tide: true, elite: null });
    // lice in the Dalarö and in the Graveyard's hulls (beside each, where they come out)
    for (const wr of sp.wrecks) if (wr.lice) {
      const fx = Math.sin(wr.r), fz = Math.cos(wr.r), p = wr.kind === 'dalaro' ? { x: wr.belly.x, z: wr.belly.z } : (nearFloor(L, wr.x + fz * 2.6, wr.z - fx * 2.6, 3) || nearFloor(L, wr.x - fz * 2.6, wr.z + fx * 2.6, 3));
      if (p) L.packs.push({ x: p.x, z: p.z, n: rng.int(5, 7), tag: 'hullSwarm', burst: 'hull', wreck: sp.wrecks.indexOf(wr), tide: K[Math.floor(p.z) * w + Math.floor(p.x)] === FLAT || undefined, elite: null });
    }
    const dl = sp.dalaro, bp = nearFloor(L, dl.x - Math.sin(dl.r) * 7.8, dl.z - Math.cos(dl.r) * 7.8, 2);
    if (bp && bar[Math.floor(bp.z) * w + Math.floor(bp.x)]) L.packs.push({ ...bp, n: 3, tag: 'reefRocks', dormant: true, tide: true, elite: rng.chance(0.3) ? 'champion' : null });
    const rb = flatSpot(L, rng, R0, (i) => L.bed[i] >= 0.6 && L.bed[i] <= 0.75 && !bar[i] && !res[i], L.packs, 14);
    if (rb) L.packs.push({ ...rb, n: 3, tag: 'reefRocks', dormant: true, tide: true, elite: null });
    L.packs.push({ x: den.x, z: den.z, n: 2, tag: 'strandBear', elite: rng.chance(0.3) ? 'rare' : null });
    const fh = sp.mawHoles[0];
    if (fh) { const p = nearFloor(L, fh.x + 2.5, fh.z + 2, 4); if (p) L.packs.push({ ...p, n: 2, tag: 'fallHunters', elite: null }); }
    const wh = sp.whale; L.packs.push({ ...(nearFloor(L, wh.x - Math.sin(wh.r) * 3, wh.z - Math.cos(wh.r) * 3, 4) || wh), n: rng.int(6, 8), tag: 'skuaFlock', elite: null });
    const mast = sp.roosts.find((r) => r !== sp.roosts[0]);
    if (mast) { const p = nearFloor(L, mast.x, mast.z + 4, 6); if (p) L.packs.push({ ...p, n: rng.int(6, 8), tag: 'skuaFlock', elite: null }); }
    // the dry ground keeps a few: on the road between the Shallows and the Fall, and at the bay's mouth
    for (const z of [104, 80]) { const p = road.find((q) => Math.abs(q.z - z) < 1); if (p) L.packs.push({ x: p.x, z: p.z, n: rng.int(3, 4), tag: 'sunkenCrew', elite: rng.chance(0.15) ? 'champion' : null }); }
  }
  // ---- dressing: rock faces at the cliffs' feet, sea stacks off the shore, the wrack line's kelp, driftwood and barnacles,
  // anchors on the Graveyard's shingle, stones on the dry ground ----
  dressCoast(L, K, blk, res, rng);
  // ---- does it hold? ----
  if (!last) { const f = coastFaults(L, R0, R1); if (f.length) return fail(f[0].replace(/[@.].*/, '')); }
  return L;
}
// the cells into L's arrays, the corners' heights and beds, then the footprints
function finishCoast(L, K, bed, blk, frame) {
  const { w, h } = L, N = w * h, W = w + 1;
  for (let i = 0; i < N; i++) {
    const k = K[i];
    L.cells[i] = k === LAND || k === FLAT || k === THIN || k === THICK || k === WIN || k === DECK ? 1 : 0;
    L.low[i] = k === SEA || k === HOLE ? 1 : 0;
    L.sea[i] = k === HOLE ? 1 : 0;
    L.ice[i] = k === THIN ? 1 : 0;
    L.thick[i] = k === THICK ? 1 : 0;
    L.window[i] = k === WIN ? 1 : 0;
    L.deck[i] = k === DECK ? 1 : 0;
    L.bed[i] = k === FLAT || k === DECK ? bed[i] : k === LAND || k === ROCK ? BED_DRY : -0.6;
  }
  L.vbed = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let s = 0;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; s += x < 0 || z < 0 || x >= w || z >= h ? -0.6 : L.bed[z * w + x]; }
    L.vbed[vz * W + vx] = s / 4;
  }
  L.dist = distField(L, 14);
  L.hgt = heights(L, K, frame, 'coast');
  footprints(L, K, blk);
}
const CORNER = [[-1, -1], [0, -1], [-1, 0], [0, 0]];
// the ground's corners: floor at 0; under thin ice -2 and in a window's pit -2.2; the sea falling away from its shore
// (-1.5 to -4.5 on the coast, -2.5 on the frozen sea); bergs 6-14; the cliffs rising 8 + 10 fbm off the floor
function heights(L, K, frame, type, bergH) {
  const { w, h } = L, W = w + 1, H = new Float32Array(W * (h + 1)), seed = L.seed || 1;
  const dRock = bfs(L, (i) => K[i] !== ROCK, (i) => K[i] === ROCK, 14);
  const dSea = bfs(L, (i) => K[i] !== SEA && K[i] !== ROCK, (i) => K[i] === SEA, 14);
  // (the play camera looks from the south, 8.7 m back and 13 m up: rock south of anywhere she can stand stays under its
  // line of sight, so she is never hidden and the camera never inside the cliff. north: cells to that ground due north)
  // (on the coast, the sea north of the bay's mouth counts as ground too: the Freeze makes it ice, freezeBay)
  const C = type === 'coast' && L.boss, frz = (x, z) => C && z < C.z - 16 && Math.abs(x + 0.5 - C.x) < 24.5;
  const north = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) { let k = 12; for (let z = 0; z < h; z++) { const q = K[z * w + x]; k = (q !== ROCK && q !== SEA && q !== HOLE) || (q === SEA && frz(x, z)) ? 0 : Math.min(12, k + 1); north[z * w + x] = k; } }
  // (the columns either side count too, a little further off, so the cap runs smooth across them instead of in steps)
  const cap = (vx, vz) => {
    let k = 12;
    for (let dz = -1; dz <= 0; dz++) for (let dx = -4; dx <= 3; dx++) { const x = clamp(vx + dx, 0, w - 1); k = Math.min(k, north[clamp(vz + dz, 0, h - 1) * w + x] + Math.max(0, Math.abs(x + 0.5 - vx) - 0.5) * 0.8); }
    return k >= 10 ? 99 : 1.3 * k - 0.2;
  };
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let fl = 0, wat = 0, rock = 0, pit = 0, rd = 0, sd = 0, n = 0, berg = 0;
    for (const [dx, dz] of CORNER) {
      const x = clamp(vx + dx, 0, w - 1), z = clamp(vz + dz, 0, h - 1), i = z * w + x, k = K[i];
      n++;
      if (frame[i]) pit++;
      if (k === LAND || k === FLAT || k === THICK || k === DECK) fl++;
      else if (k === SEA || k === THIN || k === HOLE || k === WIN) { wat++; sd = Math.max(sd, dSea[i] === 255 ? 14 : dSea[i]); }
      else { rock++; rd += Math.min(dRock[i] === 255 ? 14 : dRock[i], 14); if (bergH?.[i]) berg = Math.max(berg, bergH[i]); }
    }
    let y;
    if (pit === 4) y = -2.2;
    else if (fl) y = 0;
    else if (wat) {
      const sea = [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dx, dz]) => K[clamp(vz + dz, 0, h - 1) * w + clamp(vx + dx, 0, w - 1)] === SEA);
      y = sea ? (type === 'coast' ? -1.5 - 3 * clamp((sd - 1) / 8, 0, 1) : -2.5) : -2;
    } else if (berg) y = berg;
    else {
      const d = rd / Math.max(1, rock);
      y = Math.min((8 + 10 * fbm(vx * 0.05, vz * 0.05, seed + 41)) * smooth(clamp((d - 0.2) / 3.2, 0, 1)) + 0.3, Math.max(0.3, cap(vx, vz)));
    }
    H[vz * W + vx] = y;
  }
  return H;
}
// floor shut in by footprints (a cell between two huts, inside a hull's stern): small pockets the hero can never reach at
// low water are closed with them
function sealPockets(L, blk) {
  const { w } = L, W0 = walkAt(L, 0), R = reach(L, L.start.x, L.start.z, W0), seen = new Uint8Array(W0.length);
  for (let i = 0; i < W0.length; i++) if (W0[i] && !R[i] && !seen[i]) {
    const comp = flood(L, W0, i, seen);
    if (comp.length <= 12 && !comp.some((c) => L.ice[c] || L.thick[c] || L.window[c])) for (const c of comp) { blk[c] = 1; L.cells[c] = 0; if (L.bed) L.bed[c] = BED_DRY; }
  }
  void w;
}
// the footprints close their cells: never tidal, never thin
function footprints(L, K, blk) {
  for (let i = 0; i < blk.length; i++) if (blk[i]) {
    L.cells[i] = 0; L.low[i] = 0; L.sea[i] = 0;
    if (L.bed) L.bed[i] = BED_DRY;
    if (K[i] === THIN || K[i] === HOLE || K[i] === THICK || K[i] === WIN) { L.ice[i] = 0; L.window[i] = 0; L.thick[i] = 1; }
    L.deck[i] = 0;
  }
}
// The Freeze: the same seed's coast with the bay's north rim become the way onto the ice. The road's cells (open sea until
// now) are thick ice four wide to the top edge, and the sea before the bay freezes thin out to the fog; the rest keeps its
// tide. (The dead Tower on its skerry and the black aurora are the world's: world.js act5Zone, atmos.js coastFrozen.)
export function freezeBay(L) {
  const { w } = L, C = L.boss;
  L.mode = 'frozen';
  const fr = [];
  for (let z = 0; z < C.z - 16; z++) for (let x = Math.max(0, C.x - 24); x < Math.min(w, C.x + 24); x++) {
    const i = z * w + x;
    if (!L.low[i] || L.sea[i] || Math.hypot(x + 0.5 - C.x, z + 0.5 - C.z) < 18 || L.bed[i] > -0.5 || z < 2 || x < 2 || x >= w - 2) continue;
    L.cells[i] = 1; L.low[i] = 0; L.ice[i] = 1; fr.push(i);
  }
  for (const [x, z] of L.spots.iceRoad.cells) { const i = z * w + x; L.cells[i] = 1; L.low[i] = 0; L.ice[i] = 0; L.thick[i] = 1; }
  // (the sea freezes as one sheet off the road: a sliver the rectangle cuts off behind a rock, against the open sea past
  // its side, stays water, or it would be a pocket of ice no one can reach)
  const seen = new Uint8Array(L.cells.length), q = L.spots.iceRoad.cells.map(([x, z]) => z * w + x);
  for (const i of q) seen[i] = 1;
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], x = i % w, z = (i - x) / w;
    for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < L.h && !seen[n] && L.ice[n]) { seen[n] = 1; q.push(n); } }
  }
  for (const i of fr) if (!seen[i]) { L.cells[i] = 0; L.low[i] = 1; L.ice[i] = 0; }
  const R = L.spots.iceRoad;
  L.spines.push({ id: 'bayRoad', from: { x: R.x, z: R.z }, to: { x: R.x, z: 3 } });
  // the thin ice's bed under it, like the bay's (the water's colour); its ground sinks like any thin ice
  const W = w + 1;
  for (let vz = 1; vz < C.z - 16; vz++) for (let vx = Math.max(1, C.x - 24); vx < Math.min(w, C.x + 24); vx++) {
    let ice = 0, any = 0;
    for (const [dx, dz] of CORNER) { const i = (vz + dz) * w + vx + dx; if (L.ice[i]) ice++; if (L.cells[i] && !L.ice[i]) any++; }
    if (ice === 4) L.hgt[vz * W + vx] = -2; else if (any) L.hgt[vz * W + vx] = Math.max(L.hgt[vz * W + vx], 0);
  }
  return L;
}
// does the coast hold: every place the story needs reachable at both tides (the tide-locked ones at low water), the dry
// pockets at high water either the camp's or a marked refuge, a refuge by every tide-locked place, the spines and rims whole
function coastHolds(L, R0, R1) {
  return !coastFaults(L, R0, R1).length;
}
export function coastFaults(L, R0, R1) {
  const { w } = L, out = [], sp = L.spots, far = (R, p, r = 2.2) => !p || nearReach(L, R, p.x, p.z) > r;
  const both = [sp.hearth, sp.camp, sp.waypoint, sp.bell, sp.overlook, sp.npcs.alkyone, sp.npcs.tamarisk, sp.npcs.glaukos, ...sp.npcs.shore, sp.npcs.rock, sp.iceShut, ...L.exits.filter((e) => e.to !== 'farlight')];
  both.forEach((p, k) => { if (far(R0, p) || far(R1, p)) out.push('reach.both.' + k); });
  if (sp.npcs.shore.length < 3) out.push('shorefolk<3');
  if (!sp.npcs.rock) out.push('noShoreRock');
  for (const s of sp.sealights) if (!s.base || far(R0, s.base, 1.6)) out.push('reach.sealight.' + s.id);
  if (sp.sealights.length !== 3) out.push('sealights!=3');
  for (const s of sp.stones) if (far(R0, s, 1.8)) out.push('reach.stone.' + s.id);
  if (sp.stones.length !== 4) out.push('stones!=4');
  for (const c of sp.chests) if (far(R0, c, 1.6)) out.push('reach.chest');
  for (const wr of sp.wrecks) if (wr.belly && far(R0, wr.belly, 1.6)) out.push('reach.belly');
  for (const p of L.packs) if (far(p.tide ? R0 : R1, p, 3.5)) out.push('reach.pack.' + p.tag);
  for (const s of sp.sealights) if (s.window && far(R0, s.window, 2)) out.push('reach.window.' + s.id);
  if (far(R0, sp.den, 2.5) || far(R0, sp.whale, 4) || far(R0, sp.fallRock, 2.5)) out.push('reach.strand');
  if (far(R0, { x: L.boss.x, z: L.boss.z + 6 }, 2.5) || far(R0, { x: L.boss.x, z: L.boss.z - 7 }, 2.5) || far(R1, { x: L.boss.x, z: L.boss.z + 17 }, 1.5)) out.push('reach.bay');
  // dry pockets at high water: the camp's, or a refuge's
  const dry = new Uint8Array(L.w * L.h), W1 = walkAt(L, HIGH);
  for (let i = 0; i < dry.length; i++) dry[i] = W1[i] && !(tidal(L, i) && wetAt(L.bed[i], HIGH) > 0) ? 1 : 0;
  const seen = new Uint8Array(dry.length);
  for (let i = 0; i < dry.length; i++) if (dry[i] && !seen[i] && !R1[i]) {
    const comp = flood(L, dry, i, seen);
    if (comp.some((c) => inBay(L, c % w, Math.floor(c / w)))) continue;
    if (!L.refuges.some((r) => comp.some((c) => Math.hypot(c % w + 0.5 - r.x, Math.floor(c / w) + 0.5 - r.z) < r.r + 0.8))) out.push('pocket@' + (comp[0] % w) + ',' + Math.floor(comp[0] / w));
  }
  for (let i = 0; i < dry.length; i++) if (dry[i] && !seen[i]) flood(L, dry, i, seen);
  // a refuge (a 3 x 3 of dry ground) within 12 m of every tide-locked place
  for (const p of L.tideLocked) if (!refugeNear(L, p.x, p.z, 12)) out.push('noRefuge');
  for (const s of L.spines) if (!spineWhole(L, s)) out.push('spine.' + s.id);
  for (const r of L.rims) if (!rimWhole(L, r)) out.push('rim.' + r.id);
  // nothing the story stands on is thin or tidal (but the tide-locked)
  const stand = [sp.hearth, sp.waypoint, sp.bell, sp.camp, ...sp.sealights.map((s) => s.base), ...sp.stones.filter((s) => !s.tideLocked), ...sp.chests.filter((c) => !c.tideLocked), ...L.exits.filter((e) => e.to !== 'farlight')];
  for (const p of stand) if (p && !firm(L, p.x, p.z)) out.push('onWet');
  return out;
}
// a cell to stand on whatever the tide: dry land, thick ice, a window, a deck
// (a spot's own footprint, the hearth's stones or a Name-stone, is firm too: footprints are dry land or thick ice)
export const firm = (L, x, z) => { const i = Math.floor(z) * L.w + Math.floor(x); return !L.ice[i] && !L.low[i] && (!!L.thick[i] || !!L.window[i] || !!L.deck?.[i] || !L.bed || L.bed[i] >= BED_DRY); };
export function refugeNear(L, x, z, r) {
  const { w } = L, okC = (cx, cz) => { const i = cz * w + cx; return L.cells[i] && L.bed[i] >= BED_DRY; };
  for (let cz = Math.floor(z - r); cz <= z + r; cz++) for (let cx = Math.floor(x - r); cx <= x + r; cx++) {
    if (cx < 1 || cz < 1 || cx >= L.w - 1 || cz >= L.h - 1 || Math.hypot(cx + 0.5 - x, cz + 0.5 - z) > r) continue;
    let all = true;
    for (let dz = -1; dz <= 1 && all; dz++) for (let dx = -1; dx <= 1; dx++) if (!okC(cx + dx, cz + dz)) { all = false; break; }
    if (all) return true;
  }
  return false;
}
// a spine: from its start to its end on thick ice or dry ground only (the farlight's leads sealed: thick)
export function spineWhole(L, s, extra) {
  const { w, h } = L, okC = (i) => L.cells[i] && !L.ice[i] && (L.thick[i] || L.window[i] || !L.bed || L.bed[i] >= BED_DRY) || extra?.[i];
  const near = (p) => { for (let r = 0; r <= 2; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz; if (x >= 0 && z >= 0 && x < w && z < h && okC(z * w + x)) return z * w + x; } return -1; };
  const a = near(s.from), b = near(s.to);
  if (a < 0 || b < 0) return false;
  const seen = new Uint8Array(w * h), q = [a]; seen[a] = 1;
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd]; if (i === b) return true;
    const x = i % w, z = (i - x) / w;
    for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < h && !seen[n] && okC(n)) { seen[n] = 1; q.push(n); } }
  }
  return false;
}
// a rim: every cell of its ring firm
export function rimWhole(L, r) {
  for (const [x, z] of circleCells(L, r.x, r.z, r.r1)) { const d = Math.hypot(x + 0.5 - r.x, z + 0.5 - r.z); if (d >= r.r0 && d < r.r1 && !firm(L, x + 0.5, z + 0.5)) return false; }
  return true;
}
function flood(L, mask, s, seen) {
  const { w, h } = L, q = [s]; seen[s] = 1;
  for (let hd = 0; hd < q.length; hd++) { const i = q[hd], x = i % w, z = (i - x) / w; for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < h && mask[n] && !seen[n]) { seen[n] = 1; q.push(n); } } }
  return q;
}
// 4-neighbour steps from the cells src(i) through the cells via(i), capped
function bfs(L, src, via, cap) {
  const { w, h } = L, N = w * h, d = new Uint8Array(N).fill(255), q = [];
  for (let i = 0; i < N; i++) if (src(i)) { d[i] = 0; q.push(i); }
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd]; if (d[i] >= cap) continue;
    const x = i % w, z = (i - x) / w;
    for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < h && d[n] > d[i] + 1 && via(n)) { d[n] = d[i] + 1; q.push(n); } }
  }
  return d;
}
// the cells of a turned rectangle (half sizes hw across, hd along, as blockR lays it)
function rectCells(L, cx, cz, hw, hd, r) {
  const c = Math.cos(r), s = Math.sin(r), R = Math.hypot(hw, hd), out = [];
  for (let z = Math.floor(cz - R); z <= Math.floor(cz + R); z++) for (let x = Math.floor(cx - R); x <= Math.floor(cx + R); x++) {
    const dx = x + 0.5 - cx, dz = z + 0.5 - cz, u = dx * c - dz * s, v = dx * s + dz * c;
    if (Math.abs(u) <= hw && Math.abs(v) <= hd) { if (x < 0 || z < 0 || x >= L.w || z >= L.h) return [[-1, -1]]; out.push([x, z]); }
  }
  return out;
}
const segDist = (x, z, s) => { const dx = s.x1 - s.x0, dz = s.z1 - s.z0, l2 = dx * dx + dz * dz || 1, t = clamp(((x - s.x0) * dx + (z - s.z0) * dz) / l2, 0, 1); return Math.hypot(s.x0 + dx * t - x, s.z0 + dz * t - z); };
// the nearest free dry cell to (x, z) within r (its centre), or null
function landNear(L, K, blk, res, x, z, r = 3) {
  let best = null, bd = 1e9;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz;
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) continue;
    const i = cz * L.w + cx, d = Math.hypot(cx + 0.5 - x, cz + 0.5 - z);
    if (d < bd && (K[i] === LAND || K[i] === THICK) && !blk[i] && !res[i]) { bd = d; best = { x: cx + 0.5, z: cz + 0.5 }; }
  }
  return best;
}
// the nearest open floor cell (after the footprints) to (x, z) within r
function nearFloor(L, x, z, r) {
  let best = null, bd = 1e9;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz;
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h || !L.cells[cz * L.w + cx]) continue;
    const d = Math.hypot(cx + 0.5 - x, cz + 0.5 - z); if (d < bd) { bd = d; best = { x: cx + 0.5, z: cz + 0.5 }; }
  }
  return best;
}
// a flat cell matching want(i), reachable at low water, at least gap from the spots in list
function flatSpot(L, rng, R0, want, list, gap) {
  const { w, h } = L;
  for (let t = 0; t < 300; t++) {
    const x = rng.int(4, w - 5), z = rng.int(4, h - 5), i = z * w + x;
    if (!L.cells[i] || !R0[i] || !L.bed || !(L.bed[i] < BED_DRY) || L.ice[i] || L.thick[i] || L.deck[i] || !want(i)) continue;
    if (list.some((p) => Math.hypot(p.x - x - 0.5, p.z - z - 0.5) < gap)) continue;
    return { x: x + 0.5, z: z + 0.5 };
  }
  return null;
}
// a layout's drawing kit: classes painted in discs and strokes, footprints, the cells kept clear of dressing
function makeDraw(L, K, blk, res, rng) {
  const { w } = L;
  const disc = (cx, cz, r, k, keep) => { for (const [x, z] of circleCells(L, cx, cz, r)) { const i = z * w + x; if (!keep || !keep(K[i])) K[i] = k; } };
  const seg = (x0, z0, x1, z1, r, k, keep) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2)); for (let j = 0; j <= n; j++) disc(x0 + ((x1 - x0) * j) / n, z0 + ((z1 - z0) * j) / n, r, k, keep); };
  const cellK = (x, z) => K[Math.floor(z) * w + Math.floor(x)];
  const blockC = (cx, cz, r) => { for (const [x, z] of circleCells(L, cx, cz, r)) blk[z * w + x] = 1; };
  const blockR = (cx, cz, hw, hd, r = 0) => {
    const c = Math.cos(r), s = Math.sin(r), R = Math.hypot(hw, hd);
    // (local x is world (cos r, -sin r) and local z (sin r, cos r), as the props turn)
    for (let z = Math.floor(cz - R); z <= Math.floor(cz + R); z++) for (let x = Math.floor(cx - R); x <= Math.floor(cx + R); x++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz, u = dx * c - dz * s, v = dx * s + dz * c;
      if (Math.abs(u) <= hw && Math.abs(v) <= hd && x >= 0 && z >= 0 && x < L.w && z < L.h) blk[z * w + x] = 1;
    }
  };
  const free = (x, z, r) => circleCells(L, x, z, r).every(([cx, cz]) => !blk[cz * w + cx] && !res[cz * w + cx]);
  const reserve = (x, z, r) => { for (const [cx, cz] of circleCells(L, x, z, r)) res[cz * w + cx] = 1; };
  const paintAt = (cx, cz, r, v) => { for (const [x, z] of circleCells(L, cx, cz, r)) { const i = z * w + x; L.paint[i] = Math.max(L.paint[i], v * clamp((r - Math.hypot(x + 0.5 - cx, z + 0.5 - cz)) / Math.max(0.8, r * 0.6), 0, 1)); } };
  void rng;
  return { disc, seg, cellK, blockC, blockR, free, reserve, paintAt };
}
// the coast's dressing, from its own draws, after everything else
function dressCoast(L, K, blk, res, rng) {
  const { w, h } = L;
  const WRACK = new Set(['kelp', 'driftwood', 'barnacleRock', 'anchor', 'sunkenAnchor']);
  const wrackNear = (x, z) => L.props.some((q) => WRACK.has(q.t) && Math.hypot(q.x - x, q.z - z) < 2.2);
  const dRock = bfs(L, (i) => K[i] !== ROCK, (i) => K[i] === ROCK, 6);
  for (let z = 2; z < h - 2; z++) for (let x = 2; x < w - 2; x++) {
    const i = z * w + x, k = K[i];
    if (res[i] || blk[i]) continue;
    const px = x + rng.range(0.2, 0.8), pz = z + rng.range(0.2, 0.8);
    if (k === ROCK) {
      const d = dRock[i];
      if (d === 1 && rng.chance(0.06)) {
        // which way the open ground lies
        let bx = 0, bz = 0; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const j = clamp(z + dz, 0, h - 1) * w + clamp(x + dx, 0, w - 1); if (K[j] !== ROCK) { bx += dx; bz += dz; } }
        L.props.push({ t: 'rockFace', x: px, z: pz, r: Math.atan2(bx, bz) + rng.range(-0.4, 0.4), s: rng.range(0.7, 1.3), y: -0.3 });
      }
      continue;
    }
    if (k === SEA) {
      let shore = false; for (const [dx, dz] of N4) { const j = (z + dz) * w + x + dx; if (K[j] !== SEA && K[j] !== ROCK) shore = true; }
      if (!shore && x > 3 && z > 3 && rng.chance(0.004)) L.props.push({ t: 'seaStack', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.8, 1.8), y: -1.5 });
      continue;
    }
    if (k === FLAT && L.bed[i] < BED_DRY && L.cells[i]) {
      // (the wrack's pieces never lie on one another, nor on the kelp heaps of the Sunken's packs: 2.2 m apart)
      const wrack = Math.abs(L.bed[i] - 0.6) < 0.08;
      let p = null;
      if (wrack && rng.chance(0.05)) p = { t: rng.pick(['kelp', 'kelp', 'driftwood', 'barnacleRock']), x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.6, 1.2) };
      else if (rng.chance(0.004)) p = { t: 'barnacleRock', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.5, 1) };
      if (p && !wrackNear(p.x, p.z)) L.props.push(p);
      if (z > 84 && z < 92 && x > 64 && rng.chance(0.006)) { const q = { t: rng.chance(0.5) ? 'anchor' : 'sunkenAnchor', x: px, z: pz, r: rng.range(0, 6.28), s: 1, tilt: rng.range(0.2, 0.9) }; if (!wrackNear(q.x, q.z)) L.props.push(q); }
      continue;
    }
    if (k === LAND && L.cells[i] && L.paint[i] < 0.3) {
      let edge = false; for (const [dx, dz] of N4) if (K[(z + dz) * w + x + dx] === ROCK) edge = true;
      if (rng.chance(edge ? 0.05 : 0.008)) L.props.push({ t: 'shoreRock', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.3, 0.7) });
    }
  }
}

// ======================= FARLIGHT: the Farthest Light =======================
// South to north: the coast's headlands as cliff along the south edge, the way down onto the ice, the Icebound Ship
// frozen in at a list with the camp in its lee; the Ice Road (a thick spine 4-6 wide winding north, marker poles every 8 m,
// pressure ridges along both sides with gaps) over thin-ice fields with Icemaw holes, chest islets, the Drowned Lights and
// the bergs; three leads of open water across the whole width, each widening into a Breathing-hole beside the road, its
// three marker-lamps at 120 degrees (one on a thick tongue into the lead); and the Light's Skerry at the ice edge: the
// core with the Farthest Light at its south edge, the thin ring with its thick cross, Selna's pad, the four fire-cairns,
// the thick rim, open water to the north. No tide: L.sea is its water, and there is no L.bed.
export function genFarlight(seed) {
  let L = null, k = 0;
  while (!L && k < 24) { L = tryFarlight(seed + k * 7919, k === 23); k++; }
  L.seed = seed; L.tries = k;
  return L;
}
function tryFarlight(seed, last) {
  const rng = RNG(seed), w = 112, h = 208, N = w * h;
  const L = base(w, h);
  Object.assign(L, { type: 'farlight', seed, low: new Uint8Array(N), sea: new Uint8Array(N), ice: new Uint8Array(N), thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N), tideLocked: [], refuges: [], spines: [], rims: [] });
  const sp = L.spots;
  Object.assign(sp, { holes: [], drowned: [], bergs: [], chests: [], shrines: [], mawHoles: [], poles: [], fires: [], hands: [], casks: [] });
  const K = new Uint8Array(N).fill(THIN), blk = new Uint8Array(N), frame = new Uint8Array(N), res = new Uint8Array(N), bergH = new Float32Array(N);
  const { disc, seg, blockC, blockR, reserve } = makeDraw(L, K, blk, res, rng);
  const AR = { x: Math.round(56 + rng.range(-6, 6)), z: Math.round(28 + rng.range(-2, 2)), r: 16 };
  const EX = { x: snap(56 + rng.range(-14, 14)), z: h - 5 };
  // ---- the frame: open water at the ice edge, the headlands' cliff along the south, rubble ridges down the sides ----
  const zS = (x) => h - 15 + fbm(x * 0.06, 3.1, seed + 2) * 5;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x, n = fbm(x * 0.08, z * 0.08, seed + 1);
    if (z < 9 + n * 4) K[i] = SEA;
    else if (z > zS(x)) K[i] = ROCK;
    else if (x < 3 + n * 3 || x >= w - 3 - n * 3) { K[i] = ROCK; bergH[i] = 1.6 + n * 2.4; }
  }
  // the way down from the headlands onto the ice
  {
    const ph = rng.range(0, 6);
    for (let z = h - 2; z > zS(EX.x) - 5; z -= 0.5) { const x = EX.x + Math.sin(z * 0.15 + ph) * 1.6; disc(x, z, 3.4, LAND); }
  }
  // ---- the Icebound Ship and the camp in its lee ----
  const side = rng.sign(), cz0 = Math.round(zS(EX.x) - 14 + rng.range(-2, 2));
  const camp = { x: snap(EX.x - side * 2), z: snap(cz0) };
  const S = { x: camp.x + side * rng.range(11, 13), z: camp.z - rng.range(1, 4), r: rng.range(-0.25, 0.25) + (rng.chance(0.5) ? Math.PI : 0) };
  disc(camp.x, camp.z, 7, THICK);
  disc(S.x, S.z, 7.5, THICK, (k) => k === LAND || k === ROCK);
  seg(EX.x, zS(EX.x) - 4, camp.x, camp.z, 2.4, THICK, (k) => k === LAND);
  // ---- the Ice Road: a thick spine from the camp to the arena's south rim, winding by fbm (14 m) ----
  const ph = rng.range(0, 50), zEnd = AR.z + 15;
  const roadX = (z) => {
    const t = clamp((camp.z - z) / (camp.z - zEnd), 0, 1), wob = 14 * clamp((fbm(z * 0.017 + ph, 1.3, seed + 4) - 0.5) * 3.6, -1, 1) * smooth(clamp(t * 5, 0, 1)) * smooth(clamp((1 - t) * 5, 0, 1));
    return clamp(camp.x + (AR.x - camp.x) * smooth(t) + wob, 14, w - 14);
  };
  const roadHW = (z) => 2 + fbm(z * 0.05, 7.7, seed + 6) * 1.1;
  for (let z = camp.z; z >= zEnd; z -= 0.5) disc(roadX(z), z, roadHW(z), THICK, (k) => k === ROCK);
  // ---- the three leads, south to north, each with its Breathing-hole beside the road ----
  const leads = [];
  for (let k = 0; k < 3; k++) {
    const Z = clamp([150, 104, 58][k] + rng.range(-6, 6), k === 2 ? AR.z + 26 : 0, k === 0 ? camp.z - 24 : h);
    const zc = (x) => Z + (fbm(x * 0.05, k * 3.3, seed + 8) - 0.5) * 8, hw = (x) => 1.5 + fbm(x * 0.09, k * 5.1, seed + 9);
    const rx = roadX(Z), s = rng.sign(), t = s;
    const ho = { id: k, x: snap(rx + s * rng.range(7.5, 9)), z: 0, r: 4.5 };
    ho.z = snap(zc(ho.x) + 1.5);
    leads.push({ Z, zc, hw, ho, t });
  }
  for (const l of leads) {
    l.mask = new Uint8Array(N);
    for (let x = 0; x < w; x++) { const c = l.zc(x), r = l.hw(x); for (let z = Math.floor(c - r); z <= c + r; z++) if (z >= 0 && z < h && Math.abs(z + 0.5 - c) <= r) { K[z * w + x] = SEA; l.mask[z * w + x] = 1; } }
  }
  const tongueCells = new Uint8Array(N);
  for (const { ho, t, mask } of leads) {
    const was = K.slice();
    const { x: hx, z: hz } = ho, A = { x: hx - t * 5.2, z: hz + 3 }, B = { x: hx + t * 5.2, z: hz + 3 }, Cp = { x: hx, z: hz - 6.5 };
    const P = [B, { x: hx + t * 6.6, z: hz - 1 }, { x: hx + t * 4.2, z: hz - 5.6 }, Cp];
    // the hole, then the water round the tongue (so it never bridges to the north field), then the tongue and the pads
    disc(hx, hz, 4.5, SEA);
    for (let j = 1; j < P.length; j++) seg(P[j - 1].x, P[j - 1].z, P[j].x, P[j].z, 2.6, SEA, () => false);
    disc(Cp.x, Cp.z, 3, SEA);
    for (let z = Math.floor(hz + 1); z < hz + 8; z++) for (let x = Math.floor(hx - 9); x <= hx + 9; x++) if (K[z * w + x] === SEA && Math.hypot(x + 0.5 - hx, z + 0.5 - hz) > 4.6 && !leadBand(leads, x, z)) K[z * w + x] = THIN;
    for (let j = 1; j < P.length; j++) { seg(P[j - 1].x, P[j - 1].z, P[j].x, P[j].z, 1.0, THICK); for (const [cx, cz] of circleCells(L, P[j].x, P[j].z, 1.6)) tongueCells[cz * w + cx] = 1; }
    for (const p of [A, B, Cp]) disc(p.x, p.z, 1.5, THICK);
    for (let i = 0; i < N; i++) if (K[i] !== was[i] || mask[i]) mask[i] = K[i] === SEA ? 1 : 0;
    // holes 1 and 3 (ids 0 and 2) sit in a thick apron on their south rim; the middle one's rim is thin
    if (ho.id !== 1) for (const [cx, cz] of circleCells(L, hx, hz, 7.6)) { const i = cz * w + cx, d = Math.hypot(cx + 0.5 - hx, cz + 0.5 - hz); if (d > 4.5 && cz + 0.5 >= hz && K[i] === THIN) K[i] = THICK; }
    const alk = { x: hx, z: hz + 6.5 };
    disc(alk.x, alk.z, 1.2, THICK);
    Object.assign(ho, { lamps: [A, B, Cp], tongue: Cp, alk, lead: [] });
    sp.holes.push(ho);
    for (const p of [A, B, Cp, alk]) reserve(p.x, p.z, 2);
  }
  // ---- the Light's Skerry: the core, the thin ring and its thick cross, Selna's pad, the cairns' pads, the rim ----
  {
    const { x: cx, z: cz } = AR;
    for (const [x, z] of circleCells(L, cx, cz, 16)) {
      const i = z * w + x, d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      K[i] = d <= 6.5 ? LAND : d < 14.5 ? (Math.abs(x + 0.5 - cx) < 1 || Math.abs(z + 0.5 - cz) < 1 ? THICK : THIN) : THICK;
    }
    sp.core = { x: cx, z: cz, r: 6.5 };
    sp.selnaPad = { x: cx, z: cz - 10.5, r: 1.5 }; disc(cx, cz - 10.5, 1.5, THICK);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const f = { x: cx + sx * 7.78, z: cz + sz * 7.78, r: 2.5 }; sp.fires.push(f); disc(f.x, f.z, 2.5, THICK); }
    for (const a of [Math.PI - 0.21, Math.PI + 0.21, Math.PI / 2 - 0.21, Math.PI / 2 + 0.21, -Math.PI / 2 - 0.21, -Math.PI / 2 + 0.21]) sp.hands.push({ x: cx + Math.sin(a) * 11, z: cz + Math.cos(a) * 11 });
    for (const a of [0.52, 2.62, 3.67, 5.76]) sp.casks.push({ x: cx + Math.sin(a) * 15.2, z: cz + Math.cos(a) * 15.2 });
    const cells = [];
    for (let z = cz + 3; z < cz + 6; z++) for (let x = cx - 2; x < cx + 1; x++) { cells.push([x, z]); blk[z * w + x] = 1; }
    sp.farLight = { x: cx - 0.5, z: cz + 4.5, cells, door: { x: cx - 0.5, z: cz + 2.2 } };
    // (the door-stone stands in the cell before the door: blocked too; the door is used from the cell north of it)
    blockC(cx - 0.5, cz + 2.2, 0.45);
    sp.skotos = { x: cx, z: 6 };
    sp.npcs = { keepers: [-4.5, -3, -1.5, 1.5, 3, 4.5].map((dx) => ({ x: cx - 0.5 + dx, z: cz + 0.9 - Math.abs(dx) * 0.12 })), tern: { x: cx + 2.1, z: cz + 2.6, r: Math.PI } };
    // the skerry's rock rim between the cross and the diagonals (rocks of about 3 m, the keepers' lines kept clear)
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4 + rng.range(-0.08, 0.08), x = cx + Math.sin(a) * 6.9, z = cz + Math.cos(a) * 6.9; if (Math.abs(Math.cos(a)) > 0.9 && Math.cos(a) > 0) continue; blockC(x, z, 0.75); L.props.push({ t: 'skerryRock', x, z, r: rng.range(0, 6.28), s: rng.range(0.9, 1.25) }); }
    L.boss = { x: cx, z: cz, r: 16 };
    L.rims.push({ id: 'arena', x: cx, z: cz, r0: 14.5, r1: 16 });
    reserve(cx, cz, 17);
  }
  // ---- the camp: the brazier, the waypoint, Alkyone and Tamarisk; the anchor by the ship; the ship's hull ----
  {
    sp.camp = { x: camp.x, z: camp.z, r: 7 };
    sp.brazier = { x: camp.x, z: camp.z };
    blockC(camp.x, camp.z, 0.55);
    sp.waypoint = { x: camp.x - side * 3, z: camp.z + 2 };
    sp.npcs.alkyone = { x: camp.x + side * 2.2, z: camp.z - 1.4, r: Math.PI };
    sp.npcs.tamarisk = { x: camp.x - side * 1.6, z: camp.z - 2.6, r: Math.PI * 0.9 };
    L.props.push({ t: 'brazier', x: camp.x, z: camp.z, s: 1 }, { t: 'fx', fx: 'fire', x: camp.x, y: 1.0, z: camp.z, s: 0.8 });
    L.lights.push({ x: camp.x, y: 1.6, z: camp.z, color: 0xff9a50, intensity: 24, range: 13, flicker: 0.35 });
    reserve(camp.x, camp.z, 5.5);
    sp.ship = { x: S.x, z: S.z, r: S.r, cells: rectCells(L, S.x, S.z, 2, 9, S.r) };
    blockR(S.x, S.z, 2, 9, S.r);
    L.props.push({ t: 'ship', x: S.x, z: S.z, r: S.r, s: 1, tilt: side * rng.range(0.12, 0.2) });
    const fx = Math.sin(S.r), fz = Math.cos(S.r), an = { x: S.x + fx * 10.5 + fz * side * 2.4, z: S.z + fz * 10.5 - fx * side * 2.4, r: rng.range(0, 6.28) };
    sp.anchor = an; blockC(an.x, an.z, 0.5);
    L.props.push({ t: 'sunkenAnchor', x: an.x, z: an.z, r: an.r, s: 1, tilt: 0.5 });
    reserve(S.x, S.z, 10);
    L.start = { x: EX.x, z: h - 7.5 };
    L.exits.push({ x: EX.x, z: h - 5, to: 'coast', label: 'exit.shore' });
  }
  // ---- marker poles every 8 m along the road; pressure ridges along both sides, gaps every 8 to 14 m ----
  {
    let arc = 0, nextPole = 4, ridge = [rng.range(0, 8), rng.range(0, 8)], on = [rng.chance(0.6), rng.chance(0.6)], px = roadX(camp.z - 6), pz = camp.z - 6;
    for (let z = camp.z - 6; z > zEnd + 3; z -= 0.5) {
      const x = roadX(z), d = Math.hypot(x - px, z - pz), tx = (x - px) / (d || 1), tz = (z - pz) / (d || 1), hw = roadHW(z);
      arc += d; px = x; pz = z;
      const water = (q) => K[Math.floor(q.z) * w + Math.floor(q.x)] === SEA || leads.some((l) => Math.abs(q.z - l.zc(q.x)) < l.hw(q.x) + 3.5);
      if (arc >= nextPole) {
        nextPole += 8;
        const p = { x: x - tz * (hw - 0.4) * (sp.poles.length % 2 ? -1 : 1), z: z + tx * (hw - 0.4) * (sp.poles.length % 2 ? -1 : 1) };
        if (!water(p)) { sp.poles.push(p); L.props.push({ t: 'pole', x: p.x, z: p.z, r: rng.range(-0.2, 0.2), s: 1 }); }
      }
      for (const k of [0, 1]) {
        ridge[k] -= d;
        if (ridge[k] <= 0) { on[k] = !on[k]; ridge[k] = on[k] ? rng.range(6, 11) : rng.range(3, 5); }
        if (!on[k] || (Math.floor(arc / 1.3) % 2)) continue;
        const sg = k ? 1 : -1, off = hw + 1.6 + rng.range(0, 0.8), q = { x: x - tz * off * sg, z: z + tx * off * sg };
        if (water(q) || res[Math.floor(q.z) * w + Math.floor(q.x)] || K[Math.floor(q.z) * w + Math.floor(q.x)] !== THIN) continue;
        const r = rng.range(0.6, 1.0);
        blockC(q.x, q.z, r); L.props.push({ t: 'iceBlock', x: q.x, z: q.z, r: rng.range(0, 6.28), s: r * rng.range(1.1, 1.5) });
      }
    }
  }
  // ---- what stands out on the fields: the Drowned Lights, the bergs, the chest islets, the Icemaw's holes ----
  const fieldOK = (x, z, r, gapRoad) => {
    if (x < 8 || x > w - 8 || z < AR.z + 22 || z > camp.z - 12) return false;
    if (Math.abs(x - roadX(z)) < roadHW(z) + gapRoad + r) return false;
    if (leads.some((l) => Math.abs(z - l.zc(x)) < l.hw(x) + r + 4 || Math.hypot(x - l.ho.x, z - l.ho.z) < r + 12)) return false;
    return circleCells(L, x, z, r + 1).every(([cx, cz]) => K[cz * w + cx] === THIN && !blk[cz * w + cx] && !res[cz * w + cx]);
  };
  const want = rng.int(3, 4);
  for (let t = 0; t < 300 && sp.drowned.length < want; t++) {
    const x = rng.range(10, w - 10), z = rng.range(AR.z + 24, camp.z - 14);
    if (!fieldOK(x, z, 5, 8) || sp.drowned.some((d) => Math.hypot(d.x - x, d.z - z) < 20)) continue;
    const a = rng.range(0, 6.28), win = { x: Math.round(x + Math.sin(a) * 2.2), z: Math.round(z + Math.cos(a) * 2.2) };
    for (let cz = win.z - 2; cz < win.z + 2; cz++) for (let cx = win.x - 2; cx < win.x + 2; cx++) { const i = cz * w + cx; frame[i] = 1; K[i] = cz >= win.z - 1 && cz < win.z + 1 && cx >= win.x - 1 && cx < win.x + 1 ? WIN : THICK; }
    const glow = { x: x - Math.sin(a) * 2.6, y: -2.3 - rng.range(0, 0.6), z: z - Math.cos(a) * 2.6 };
    const ca = a + rng.sign() * rng.range(1.2, 1.9), chest = { x: snap(x + Math.sin(ca) * 4.6), z: snap(z + Math.cos(ca) * 4.6), islet: true };
    disc(chest.x, chest.z, 1.6, THICK);
    sp.drowned.push({ x, z, glow, window: win, chest });
    sp.chests.push(chest);
    L.props.push({ t: 'sunkenLantern', x: win.x, z: win.z, r: rng.range(0, 6.28), s: 1, y: -2 });
    reserve(x, z, 6.5);
  }
  if (sp.drowned.length < 3 && !last) return fail('drowned');
  for (let t = 0, nb = rng.int(3, 5); t < 300 && sp.bergs.length < nb; t++) {
    const r = rng.range(4, 7), x = rng.range(10, w - 10), z = rng.range(AR.z + 24, camp.z - 14);
    if (!fieldOK(x, z, r, 5) || sp.bergs.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + r + 8)) continue;
    const top = rng.range(6, 14), rot = rng.range(0, 6.28);
    for (const [cx, cz] of circleCells(L, x, z, r)) {
      const i = cz * w + cx, dx = cx + 0.5 - x, dz = cz + 0.5 - z, u = (dx * Math.cos(rot) - dz * Math.sin(rot)) / r, v = (dx * Math.sin(rot) + dz * Math.cos(rot)) / (r * 0.8);
      const q = u * u + v * v; if (q > 1) continue;
      K[i] = ROCK; bergH[i] = Math.max(1, top * Math.sqrt(1 - q) * (0.75 + 0.25 * fbm(cx * 0.3, cz * 0.3, seed + 12)));
    }
    sp.bergs.push({ x, z, r, rot, hgt: top });
    L.props.push({ t: 'berg', x, z, r: rot, s: r, hgt: top });
    reserve(x, z, r + 3);
  }
  if (sp.bergs.length < 3 && !last) return fail('bergs');
  for (let t = 0, nc = rng.int(2, 3), got = 0; t < 200 && got < nc; t++) {
    const z = rng.range(AR.z + 24, camp.z - 14), sg = rng.sign(), x = roadX(z) + sg * (roadHW(z) + rng.range(4.5, 7));
    if (!fieldOK(x, z, 1.6, 3)) continue;
    const c = { x: snap(x), z: snap(z), islet: true };
    disc(c.x, c.z, 1.6, THICK); sp.chests.push(c); reserve(c.x, c.z, 4); got++;
  }
  for (let t = 0, nm = rng.int(4, 6); t < 300 && sp.mawHoles.length < nm; t++) {
    const x = rng.range(10, w - 10), z = rng.range(AR.z + 24, camp.z - 14);
    if (!fieldOK(x, z, 1.2, 3.5) || sp.mawHoles.some((q) => Math.hypot(q.x - x, q.z - z) < 12)) continue;
    disc(x, z, 1.15, HOLE); sp.mawHoles.push({ x: snap(x), z: snap(z) }); reserve(x, z, 3);
  }
  // ---- the cells into L, the heights, the footprints; the leads' own cells ----
  for (let i = 0; i < N; i++) {
    const k = K[i];
    L.cells[i] = k === LAND || k === THIN || k === THICK || k === WIN ? 1 : 0;
    L.low[i] = k === SEA || k === HOLE ? 1 : 0;
    L.sea[i] = k === SEA || k === HOLE ? 1 : 0;
    L.ice[i] = k === THIN ? 1 : 0; L.thick[i] = k === THICK ? 1 : 0; L.window[i] = k === WIN ? 1 : 0;
  }
  L.dist = distField(L, 14);
  L.hgt = heights(L, K, frame, 'farlight', bergH);
  footprints(L, K, blk);
  for (const { ho, mask } of leads) for (let i = 0; i < N; i++) if (mask[i] && L.sea[i]) ho.lead.push([i % w, (i - i % w) / w]);
  // ---- the packs: the frozen crew at the ship's rails, mixed packs on the fields, hunters by the holes, the bear in a
  // berg's lee, skuas over the road ----
  {
    const fx = Math.sin(S.r), fz = Math.cos(S.r);
    for (const sg of [-1, 1]) { const p = nearFloor(L, S.x + fz * 3.4 * sg, S.z - fx * 3.4 * sg, 3); if (p && !L.packs.length) L.packs.push({ ...p, n: rng.int(4, 5), tag: 'frozenCrew', dormant: true, elite: rng.chance(0.2) ? 'champion' : null }); }
    const fields = [[camp.z - 14, leads[0].Z + 8], [leads[0].Z - 8, leads[1].Z + 8], [leads[1].Z - 8, leads[2].Z + 8], [leads[2].Z - 7, AR.z + 22]];
    fields.forEach(([z0, z1], k) => {
      for (let t = 0; t < 40; t++) {
        const z = rng.range(z1, z0), x = roadX(z) + rng.sign() * (roadHW(z) + rng.range(3, 7)), p = nearFloor(L, x, z, 2);
        if (!p || !L.ice[Math.floor(p.z) * w + Math.floor(p.x)] || L.packs.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 14)) continue;
        L.packs.push({ ...p, n: rng.int(4, 6), tag: k === 0 ? 'iceMixed' : rng.pick(['iceMixed', 'iceMixed', 'fallHunters']), elite: rng.chance(0.18) ? 'champion' : null }); break;
      }
    });
    const mh = sp.mawHoles[0]; if (mh) { const p = nearFloor(L, mh.x + 3, mh.z + 2, 3); if (p) L.packs.push({ ...p, n: 2, tag: 'fallHunters', elite: null }); }
    const bg = sp.bergs[0]; if (bg) { const p = nearFloor(L, bg.x, bg.z + bg.r + 2.5, 3); if (p) { L.packs.push({ ...p, n: 2, tag: 'strandBear', elite: rng.chance(0.3) ? 'rare' : null }); sp.bearLee = p; } }
    for (const z of [leads[0].Z - 20, leads[1].Z + 18]) { const p = nearFloor(L, roadX(z), z, 3); if (p) L.packs.push({ ...p, n: rng.int(6, 8), tag: 'skuaFlock', elite: null }); }
  }
  L.spines.push({ id: 'road', from: { x: camp.x, z: camp.z }, to: { x: AR.x, z: AR.z + 15.25 } });
  if (!last) { const f = farlightFaults(L); if (f.length) return fail('far.' + f[0].replace(/[@.].*/, '')); }
  return L;
}
// a cell within a lead's band (the hole's own water is drawn round it)
const leadBand = (leads, x, z) => leads.some((l) => Math.abs(z + 0.5 - l.zc(x + 0.5)) <= l.hw(x + 0.5));
// the cells with the holes up to k sealed (their leads thick: what freezeCells does)
export function sealedCells(L, k) {
  const c = L.cells.slice();
  for (const ho of L.spots.holes) if (ho.id < k) for (const [x, z] of ho.lead) c[z * L.w + x] = 1;
  return c;
}
// does the Farthest Light hold: the camp from the entry over thick ice; each hole's lamps reachable with the holes before
// it sealed (and not before: the leads are the gates); with all three sealed the arena, its core through the cross, Selna's
// pad, the cairns, the door, the windows and chests; the road whole; no lamp, cairn, window or camp on thin ice; every
// chest islet within 8 cells of the road's thick ice
export function farlightFaults(L) {
  const out = [], sp = L.spots, { w } = L, far = (R, p, r = 2) => !p || nearReach(L, R, p.x, p.z) > r;
  const R = [0, 1, 2, 3].map((k) => reach(L, L.start.x, L.start.z, sealedCells(L, k)));
  for (const p of [sp.camp, sp.waypoint, sp.npcs.alkyone, sp.npcs.tamarisk]) if (far(R[0], p)) out.push('reach.camp');
  if (!spineWhole(L, { from: L.start, to: sp.camp })) out.push('entryNotThick');
  for (const ho of sp.holes) {
    for (const lp of ho.lamps) { if (far(R[ho.id], lp, 1.6)) out.push('reach.lamp' + ho.id); if (ho.id < 2 && !far(R[ho.id], sp.holes[ho.id + 1].lamps[0], 1.6)) out.push('gateOpen' + ho.id); }
    if (far(R[ho.id], ho.alk, 1.6)) out.push('reach.alk' + ho.id);
    if (!ho.lead.length) out.push('noLead' + ho.id);
  }
  const R3 = R[3];
  for (const p of [{ x: L.boss.x, z: L.boss.z + 15.25 }, sp.selnaPad, ...sp.fires, sp.farLight.door, ...sp.npcs.keepers, sp.npcs.tern, ...sp.casks]) if (far(R3, p, 1.6)) out.push('reach.arena');
  // the core only through the cross: with the ring's thin cells shut, the door is still reached
  const c3 = sealedCells(L, 3); for (let i = 0; i < c3.length; i++) if (L.ice[i]) c3[i] = 0;
  if (far(reach(L, L.start.x, L.start.z, c3), sp.farLight.door, 1.6)) out.push('core.notByThick');
  for (const d of sp.drowned) { if (far(R3, d.window, 2)) out.push('reach.window'); }
  for (const c of sp.chests) if (far(R3, c, 1.6)) out.push('reach.chest');
  for (const p of L.packs) if (far(R3, p, 3.5)) out.push('reach.pack.' + p.tag);
  const thick3 = new Uint8Array(L.w * L.h); for (const ho of sp.holes) for (const [x, z] of ho.lead) thick3[z * w + x] = 1;
  for (const s of L.spines) if (!spineWhole(L, s, thick3)) out.push('spine.' + s.id);
  for (const r of L.rims) if (!rimWhole(L, r)) out.push('rim.' + r.id);
  const onThin = (p) => p && L.ice[Math.floor(p.z) * w + Math.floor(p.x)];
  for (const ho of sp.holes) for (const p of ho.lamps) if (onThin(p)) out.push('lampOnThin');
  for (const p of [...sp.fires, sp.selnaPad, sp.camp, sp.waypoint, sp.farLight.door, ...sp.chests, ...sp.drowned.map((d) => d.window)]) if (onThin(p)) out.push('onThin');
  for (const c of sp.chests.filter((q) => q.islet)) if (!thickNear(L, c, 8)) out.push('isletFar');
  return out;
}
// a thick cell (not the islet's own) within r cells of an islet chest
function thickNear(L, c, r) {
  const { w } = L;
  for (let dz = -r - 2; dz <= r + 2; dz++) for (let dx = -r - 2; dx <= r + 2; dx++) {
    const x = Math.floor(c.x) + dx, z = Math.floor(c.z) + dz, d = Math.hypot(dx, dz);
    if (x < 0 || z < 0 || x >= L.w || z >= L.h || d <= 2 || d > r + 2) continue;
    const i = z * w + x;
    if (L.thick[i] && L.cells[i] && !(Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z) < 2.2)) return true;
  }
  return false;
}
