// Act VI's layouts as plain data (docs/act6-contract.md, The level object L; docs/act6-design.md, Zones): the Drained Sea
// under the sea ice and the Bottom of the Gates under it, each in two readings, built again when the reading changes
// (world.js drainedMode, bottomMode). The readings share their seed's layout cell for cell: the try loop checks both.
//   genDrained(seed, { mode: 'mere' | 'dry' })   112 x 176, north at z 0 under the Farthest Light: the Rope (the camp), the
//       Old Shore (west), the Black Hollows (centre and east), the Keels (south-west), the Wreck Heap and the Black Mere
//       (the arena, south). 'dry' once the Ketos is down: the Mere drained, the Well's mouth at its centre (the exit down,
//       a blocked ring of r 2) and the Ketos's neck across the bed to the south shore (2 x 14 blocked cells)
//   genBottom(seed, { mode: 'dark' | 'lit' })    104 x 200, north at z 0: the Well's Foot (the camp), the Drowned Barrow
//       (genCrypt stamped flipped, west), the Drowned Wood (genForest stamped flipped, east), the Forgotten Village, the
//       Shadow Stair (its three shadow-walls closed at build until 'lit'), the First's Hearth (the arena, south)
//   stamp(L, sub, x0, z0, o)                      a sub-layout's cells, paint, walls and props laid into a window of L
//   drainedFaults(L), bottomFaults(L)            what check-act6 and the try loops hold a layout to (empty: it holds)
//   walk6(L, h, mh)                               the walk grid at black water h (the Mere at mh)
//   wideDry(L, a, b), roomDoors(L, r)             a way 3 cells wide on dry ground from a to b; a room's ways in
//   ropeSpot(L)                                   where the rope hole stands on a farlight layout's Light's Skerry
// Besides gen5's cells/paint/low/hgt/dist/bed/vbed they carry L.pocket (1 a breathing pocket, 2 the Mere), L.vault (the
// vault patch over a cell: its id, L.spots.vaults its rows), L.keel (the ice keels' footprints), Act V's thick, window,
// deck and sea zero-filled (so the Black Water's shipped readers work; never set), L.ice undefined (no ice mesh, ice.js
// idle), L.tideCfg (the black water's clock), L.refuges, L.road; drained L.gaps (the Heap's east and west plugs); bottom
// L.stamps (the windows laid) and L.walls (the Stair's shadow-walls: { k, cells }, closed at build in the 'dark' reading).
// Every walkable cell stands at y = 0; the pockets and the Mere are the only cells with a bed below BED_DRY, and a blocked
// footprint is always BED_DRY (so the tide never opens it; one standing in the water keeps the water round and under it:
// sea.js buildSea reads the corners' beds, taken before the footprints). Who builds what: build6.js act6Level draws L.props,
// the rime pack's wreck, keelboat, rowboat, brokenBoat (tilt), shack (side: lying on its side), kelp, driftwood,
// barnacleRock, anchor, sunkenAnchor, whale; the shipped stone, rock, crate, brazier (Tamarisk's braziers and Glaukos's
// fire-pots, pot: true), firepit, cart, stake, well, bld (the village's houses, tilt and sink); code kinds stiltFrame and
// keel (s its radius, hgt); the stamped crypt's and wood's own props, their lights left out (LIT_PROPS). The story's and
// the fights' things are no props here, only L.spots: act6Level builds each of them once (build6.js story6: the hearths,
// lost lights, wreck lanterns, bells, lure posts, Asger's brazier, the neck, the black lamps, shadow-walls, the ember's
// pane, Leif's fire, her fire, the hearthstones, niches and Gate ring, the rope's foot; and the Mere's lure-rock) and
// hands them to the zone in z.lvl.act6, where world.js act6Zone takes them and lays only their interacts and their flags'
// states. L.lights is the light of every fire that burns from the build, added to the pooled lights on entry: Tamarisk's
// braziers, the camp's fire-pit, her fire at the Hearth's centre, Glaukos's fire-pots.
import { RNG, clamp, fbm } from '../core/util.js';
import { base, distField, genCrypt, genForest } from './gen.js';
import { reach, nearReach, circleCells, snap, terrain, BED_DRY, wetAt } from './genlib.js';
import { firm, refugeNear, makeDraw, flood, rectCells, nearFloor } from './gen5.js';

// what a cell is while the layout is drawn (gen5's numbers: its draw kit reads LAND)
const ROCK = 0, LAND = 1, FLAT = 2;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], CORNER = [[-1, -1], [0, -1], [-1, 0], [0, 0]];
const Q = (b) => Math.round(b / 0.15) * 0.15;
// the black water's top (tideCfg.hMax), the Mere before the fight, in its phase 2; the frame (3 solid cells) and the 3 more
// no carved feature may enter; the reach of a light that burns from the build (the 15 m rule)
export const HIGH6 = 0.9, MERE_H = 1.6, MERE_FIGHT = 0.85, MARGIN = 6, LIGHT_R = 15;
// the props a stamped sub-layout brings that draw a light of their own (every light below is true or false: Mechanics)
export const LIT_PROPS = new Set(['torch', 'brazier', 'candlestick', 'candles', 'campfire', 'firepit', 'shroom', 'fx', 'lamp', 'lantern', 'lanternPost', 'chandelier', 'barrowDoor', 'torch_mounted', 'skull_candle', 'candle', 'candles_A', 'candles_B']);
// why tries were thrown away (check-act6 reports it): reason -> count
export const REJECT6 = {};
const fail = (r) => { REJECT6[r] = (REJECT6[r] || 0) + 1; return null; };
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const toward = (p, a, d) => ({ x: p.x + Math.sin(a) * d, z: p.z + Math.cos(a) * d });

// ---------- shared ----------
// the fields both zones carry
function underIce(L, type, seed, mode) {
  const { w, h } = L, N = w * h;
  return Object.assign(L, {
    type, seed, mode, tries: 1, low: new Uint8Array(N),
    bed: new Float32Array(N).fill(BED_DRY), vbed: new Float32Array((w + 1) * (h + 1)).fill(BED_DRY),
    pocket: new Uint8Array(N), vault: new Uint8Array(N), keel: new Uint8Array(N),
    thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N), sea: new Uint8Array(N),
    tideCfg: { phases: [40, 27, 26, 27], stepT: 4.5, hMax: HIGH6 }, refuges: [], road: []
  });
}
// cells walkable at black water h with the Mere at mh: the build's grid with every pocket cell deep at its level closed
export function walk6(L, h, mh = h, cells = L.cells) {
  const out = cells.slice(), P = L.pocket, B = L.bed;
  for (let i = 0; i < out.length; i++) if (out[i] && P[i] && wetAt(B[i], P[i] === 2 ? mh : h) === 2) out[i] = 0;
  return out;
}
// a cell the black water never reaches, open to walk on
export const dryAt = (L, x, z) => { const cx = Math.floor(x), cz = Math.floor(z); if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) return false; const i = cz * L.w + cx; return !!L.cells[i] && !L.pocket[i] && L.bed[i] >= BED_DRY; };
// points every step m along a polyline, wandering a little between its points (never at them)
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
// the decals of a path, about every gap m, each turned along it
function marks(path, gap) {
  const out = []; let run = gap;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1], b = path[k], d = Math.hypot(b.x - a.x, b.z - a.z);
    run += d;
    if (run >= gap) { run = 0; out.push({ x: b.x, z: b.z, rot: Math.atan2(b.x - a.x, b.z - a.z) }); }
  }
  return out;
}
// the cells into L's arrays, the corners' beds, the heights, then the footprints (they stand on the floor: heights first)
function finish6(L, K, bed, blk, mere, o = {}) {
  const { w, h } = L, N = w * h, W = w + 1;
  for (let i = 0; i < N; i++) {
    const k = K[i];
    L.cells[i] = k === ROCK ? 0 : 1;
    L.bed[i] = k === FLAT ? bed[i] : BED_DRY;
    L.pocket[i] = k === FLAT ? (mere?.[i] ? 2 : 1) : 0;
  }
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let s = 0;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; s += x < 0 || z < 0 || x >= w || z >= h ? BED_DRY : L.bed[z * w + x]; }
    L.vbed[vz * W + vx] = s / 4;
  }
  L.dist = distField(L, 14);
  L.hgt = heights6(L, o);
  for (let i = 0; i < N; i++) if (blk[i]) footprint(L, i);
  L.dist = distField(L, 14);
}
// a blocked cell: never walkable, never tidal
function footprint(L, i) { L.cells[i] = 0; L.bed[i] = BED_DRY; L.pocket[i] = 0; L.low[i] = 0; }
// a footprint laid after the finish (braziers, pots, posts), and the cells it took
function plug(L, x, z, r) { const got = []; for (const [cx, cz] of circleCells(L, x, z, r)) { const i = cz * L.w + cx; if (L.cells[i]) { footprint(L, i); got.push(i); } } return got; }
// the vault's sides: the walls rise 6 + 6 fbm off the floor toward the map's edge, kept under the play camera's line of
// sight on the floor's south side (gen5's rule: rock k cells due south of a floor stays under 1.3 k - 0.2 m, so she is
// never hidden); rock standing apart (a ridge) stays low. o.top(vx, vz) a zone's own crest, o.post(H) its own touches
function heights6(L, o) {
  const { w, h } = L, N = w * h, seed = L.seed || 1;
  const north = new Uint8Array(N);
  for (let x = 0; x < w; x++) { let k = 12; for (let z = 0; z < h; z++) { const i = z * w + x; k = L.cells[i] ? 0 : Math.min(12, k + 1); north[i] = k; } }
  const area = rockAreas(L);
  const H = terrain(L, L.cells, L.dist, (d, vx, vz) => {
    let kN = 12, ra = 1e9;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; if (x >= 0 && z >= 0 && x < w && z < h) { kN = Math.min(kN, north[z * w + x]); ra = Math.min(ra, area[z * w + x]); } }
    const t = 1 - Math.exp(-0.8 * d);
    let top = o.top ? o.top(vx, vz) : 6 + 6 * fbm(vx * 0.05, vz * 0.05, seed + 41);
    if (ra < 90) top = Math.min(top, 1.6 + 1.6 * fbm(vx * 0.2, vz * 0.2, seed + 45));
    const y = top * t + (fbm(vx * 0.4, vz * 0.4, seed + 47) - 0.5) * 1.6 * t;
    return Math.max(0.3, Math.min(y, 1.3 * kN - 0.2));
  });
  o.post?.(H);
  return H;
}
// each rock cell's region size (4-neighbour, cells; a big number for the cave's own walls)
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
// every pocket's dry refuge (3 x 3 dry cells) within 12 m, nearest its middle: L.refuges (tide.js's lane rule needs one)
function refuges(L) {
  const { w } = L, seen = new Uint8Array(L.cells.length), out = [];
  for (let i = 0; i < seen.length; i++) if (L.pocket[i] === 1 && !seen[i]) {
    const comp = flood(L, L.pocket.map((p) => (p === 1 ? 1 : 0)), i, seen);
    let cx = 0, cz = 0; for (const c of comp) { cx += c % w + 0.5; cz += Math.floor(c / w) + 0.5; }
    cx /= comp.length; cz /= comp.length;
    const r = block3(L, cx, cz, 12);
    if (r && !out.some((q) => q.x === r.x && q.z === r.z)) out.push(r);
  }
  return out;
}
// the nearest 3 x 3 of dry ground to (x, z) within r, as { x, z, r: 1.5 } (its middle cell's centre)
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
// the vault's patches: discs of floor (each cell in one patch), ids from 1, as L.vault and L.spots.vaults
function vaultPatch(L, x, z, r) {
  const { w } = L, S = L.spots, id = S.vaults.length + 1, cells = [];
  if (id > 255) return null;
  for (const [cx, cz] of circleCells(L, x, z, r)) { const i = cz * w + cx; if (L.cells[i] && !L.vault[i]) cells.push(i); }
  if (cells.length < 6) return null;
  for (const i of cells) L.vault[i] = id;
  const v = { id, x, z, r, n: cells.length };
  S.vaults.push(v);
  return v;
}
// the nearest open cell whose centre lies within r of (x, z) and satisfies ok(i), else null
function spotNear(L, x, z, r, ok) {
  let best = null, bd = 1e9;
  for (let dz = -Math.ceil(r); dz <= r; dz++) for (let dx = -Math.ceil(r); dx <= r; dx++) {
    const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz;
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) continue;
    const i = cz * L.w + cx, d = Math.hypot(cx + 0.5 - x, cz + 0.5 - z);
    if (d <= r && d < bd && L.cells[i] && ok(i)) { bd = d; best = { x: cx + 0.5, z: cz + 0.5 }; }
  }
  return best;
}
// a light that burns from the build (a brazier, a fire-pot, a camp fire), on a dry cell
const buildLights = (L) => L.lights.filter((l) => firm(L, l.x, l.z) && !L.pocket[Math.floor(l.z) * L.w + Math.floor(l.x)]);
// the 15 m rule's lights: each spot in want (the packs, the black lamps) not within LIGHT_R - 0.5 m of one gets one, on the
// nearest dry, free, reachable cell to the road within 13 m of it (put(x, z) lays it and returns the light)
function lightUp(L, want, R, roadAt, free, put) {
  for (const p of want) {
    if (buildLights(L).some((l) => hyp(l, p) <= LIGHT_R - 0.5)) continue;
    let best = null, bs = 1e9;
    for (const [cx, cz] of circleCells(L, p.x, p.z, 13)) {
      const i = cz * L.w + cx, x = cx + 0.5, z = cz + 0.5;
      if (!R[i] || !dryAt(L, x, z) || !free(x, z)) continue;
      const s = roadAt(x, z) + hyp({ x, z }, p) * 0.1;
      if (s < bs) { bs = s; best = { x, z }; }
    }
    if (best) put(best.x, best.z);
  }
}
// two interacts closer than 3 m
const crowded = (list) => list.some((a, i) => list.some((b, j) => j > i && hyp(a, b) < 3));
// the floor near the frame: any open cell within MARGIN of the map's edge
function nearFrame(L) {
  const { w, h } = L;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if ((x < MARGIN || z < MARGIN || x >= w - MARGIN || z >= h - MARGIN) && L.cells[z * w + x]) return true;
  return false;
}
// a way three cells wide or more on ground the black water never takes, from a to within r of b: over cells whose four
// neighbours are dry floor too (8-connected: a diagonal step between two such cells keeps the width)
export function wideDry(L, a, b, r = 3) {
  const { w, h } = L, N = w * h, ok = (i) => L.cells[i] && !L.pocket[i], D = new Uint8Array(N);
  for (let z = 1; z < h - 1; z++) for (let x = 1; x < w - 1; x++) { const i = z * w + x; if (ok(i) && ok(i - 1) && ok(i + 1) && ok(i - w) && ok(i + w)) D[i] = 1; }
  let s = -1, bd = 1e9;
  for (const [cx, cz] of circleCells(L, a.x, a.z, 3)) { const i = cz * w + cx, d = Math.hypot(cx + 0.5 - a.x, cz + 0.5 - a.z); if (D[i] && d < bd) { bd = d; s = i; } }
  if (s < 0) return false;
  const seen = new Uint8Array(N), q = [s]; seen[s] = 1;
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], x = i % w, z = (i - x) / w;
    if (Math.hypot(x + 0.5 - b.x, z + 0.5 - b.z) < r) return true;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = i + dz * w + dx; if ((dx || dz) && D[n] && !seen[n]) { seen[n] = 1; q.push(n); } }
  }
  return false;
}
// the ways into a room (a stamped crypt's rect, in cells): the runs of open cells on the ring just outside it
export function roomDoors(L, r) {
  const { w } = L, ring = [];
  for (let x = r.x; x < r.x + r.w; x++) ring.push([x, r.z - 1]);
  for (let z = r.z; z < r.z + r.h; z++) ring.push([r.x + r.w, z]);
  for (let x = r.x + r.w - 1; x >= r.x; x--) ring.push([x, r.z + r.h]);
  for (let z = r.z + r.h - 1; z >= r.z; z--) ring.push([r.x - 1, z]);
  const open = ring.map(([x, z]) => x >= 0 && z >= 0 && x < L.w && z < L.h && !!L.cells[z * w + x]);
  if (open.every(Boolean)) return 1;
  let n = 0; for (let k = 0; k < open.length; k++) if (open[k] && !open[(k + open.length - 1) % open.length]) n++;
  return n;
}
// the dry pockets at high water: every piece of dry floor the black water cuts off from the start is a refuge's (holds a
// 3 x 3 of dry ground) or lies within 12 m of one. Returns the faults; with add, each such refuge joins L.refuges
function dryPockets(L, R1, W1, mh = MERE_H, add = false) {
  const { w } = L, out = [], dry = new Uint8Array(L.cells.length);
  for (let i = 0; i < dry.length; i++) dry[i] = W1[i] && !(L.pocket[i] && wetAt(L.bed[i], L.pocket[i] === 2 ? mh : HIGH6) > 0) ? 1 : 0;
  const seen = new Uint8Array(dry.length);
  for (let i = 0; i < dry.length; i++) if (dry[i] && !seen[i] && !R1[i]) {
    const comp = flood(L, dry, i, seen);
    const own = comp.map((c) => block3(L, c % w + 0.5, Math.floor(c / w) + 0.5, 0.1)).find(Boolean);
    // (else a 3 x 3 of dry ground within 12 m, which the lane wades her to: it joins L.refuges too)
    const near = own || block3(L, comp[0] % w + 0.5, Math.floor(comp[0] / w) + 0.5, 12);
    if (!near) { out.push('pocket@' + (comp[0] % w) + ',' + Math.floor(comp[0] / w)); continue; }
    if (add && !L.refuges.some((r) => r.x === near.x && r.z === near.z)) L.refuges.push(near);
  }
  return out;
}

// ======================= DRAINED: the Drained Sea =======================
// North to south: the Rope's camp under the rope hole (a skylight of r 6, Tamarisk's brazier, Glaukos and Tamarisk); the
// main road, always dry, south along the Old Shore's east edge, round the Hollows' west side, through the Keels to the
// Heap's north gap, Tamarisk's braziers along it for the 15 m rule; the Old Shore in the west (stilt frames and shacks
// fallen, boats beached, the Sailor on a deck, two shallow basins, the first hearth on its highest rock); the Black
// Hollows in the centre and east (three to five basins between low ridges, the second hearth on an island in the largest
// with a dry spine to the road and a low-water causeway, two lost lights across basin rims, two lure posts); the Keels in
// the south-west (14-22 keels of ice to the floor, the third hearth in a clearing, Asger's keel, a lost light, the vault
// low over it all); the Wreck Heap (a ring of hulls r 18-20 with three gaps, its outer slope with the fourth lost light),
// the Mere inside it (r 10, its core r 5), the shore r 10-18 with the three wreck lanterns, two bells and four casks.
export function genDrained(seed, o = {}) {
  const mode = o.mode === 'dry' ? 'dry' : 'mere';
  let L = null, k = 0;
  while (!L && k < 24) { L = tryDrained(seed + k * 7919, k === 23); k++; }
  L.seed = seed; L.tries = k;
  return readDrained(L, mode);
}
// the reading: 'dry' blocks the Well's mouth and the neck and opens the exit down (the layout is the same cell for cell)
function readDrained(L, mode) {
  L.mode = mode;
  if (mode !== 'dry') return L;
  const S = L.spots, { w } = L;
  for (const [x, z] of [...S.well.cells, ...S.arch.cells]) footprint(L, z * w + x);
  L.exits.push({ x: S.well.x, z: S.well.z, to: 'bottom', label: 'exit.well', locked: 'ketosDown' });
  return L;
}
// the dry reading of a layout without touching it (the try loop's check)
function dryCopy(L) {
  const D = { ...L, cells: L.cells.slice(), bed: L.bed.slice(), pocket: L.pocket.slice(), low: L.low.slice(), exits: L.exits.slice(), refuges: L.refuges.slice() };
  return readDrained(D, 'dry');
}

function tryDrained(seed, last) {
  const rng = RNG(seed), w = 112, h = 176, N = w * h;
  const L = underIce(base(w, h), 'drained', seed, 'mere'), S = L.spots;
  Object.assign(S, { huts: [], boats: [], kelp: [], sky: [], trail: [], hearths: [], lost: [], lures: [], braziers: [], wreckLamps: [], bells: [], casks: [], keels: [], voices: [], vaults: [] });
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), res = new Uint8Array(N);
  const mere = new Uint8Array(N), keep = new Uint8Array(N), roadM = new Uint8Array(N), area = new Uint8Array(N), ring = new Uint8Array(N);
  const { blockC, blockR, free, reserve, paintAt } = makeDraw(L, K, blk, res, rng);
  const put = (cx, cz, r, k, skip) => { for (const [x, z] of circleCells(L, cx, cz, r)) { const i = z * w + x; if (!skip || !skip(i)) K[i] = k; } };
  const line = (a, b, r, k, skip) => { const n = Math.max(1, Math.ceil(hyp(a, b) * 2)); for (let j = 0; j <= n; j++) put(a.x + (b.x - a.x) * j / n, a.z + (b.z - a.z) * j / n, r, k, skip); };
  const mark = (m, cx, cz, r, v = 1) => { for (const [x, z] of circleCells(L, cx, cz, r)) m[z * w + x] = v; };
  const cellK = (x, z) => K[Math.floor(z) * w + Math.floor(x)];
  const allK = (x, z, r, ok) => circleCells(L, x, z, r).every(([cx, cz]) => ok(cz * w + cx));
  // ---- the landmarks (the design's ranges) ----
  const CP = { x: snap(56 + rng.range(-6, 6)), z: snap(18 + rng.range(-3, 3)), r: 9 };
  const HP = { x: snap(58 + rng.range(-6, 6)), z: snap(146 + rng.range(-2, 2)), r: 20 };
  const H1 = { k: 1, x: snap(17 + rng.range(-5, 5)), z: snap(42 + rng.range(-5, 6)) };
  const H3 = { k: 3, x: snap(16 + rng.range(-3, 3)), z: snap(110 + rng.range(-4, 4)) };
  // ---- the floor: the camp, the three places as wandering ovals, the Heap's arena, ring and outer slope ----
  const blob = (cx, cz, rx, rz, sd, id) => {
    for (let z = Math.floor(cz - rz * 1.1); z <= cz + rz * 1.1; z++) for (let x = Math.floor(cx - rx * 1.1); x <= cx + rx * 1.1; x++) {
      if (x < 0 || z < 0 || x >= w || z >= h) continue;
      const u = (x + 0.5 - cx) / rx, v = (z + 0.5 - cz) / rz;
      if (u * u + v * v < 0.82 + 0.38 * fbm(x * 0.07, z * 0.07, seed + sd)) { K[z * w + x] = LAND; area[z * w + x] = id; }
    }
  };
  blob(30, 57, 19, 26, 3, 1);           // the Old Shore
  blob(78, 72, 23, 30, 5, 2);           // the Black Hollows
  blob(30, 110, 21, 12, 7, 3);          // the Keels
  put(CP.x, CP.z, CP.r, LAND);
  const hx = Math.floor(HP.x), hz = Math.floor(HP.z);
  const gapCell = (x, z) => (Math.abs(x - hx) <= 1 && z < hz) || (Math.abs(z - hz) <= 1 && x !== hx);
  for (const [x, z] of circleCells(L, HP.x, HP.z, 28)) {
    const i = z * w + x, d = Math.hypot(x + 0.5 - HP.x, z + 0.5 - HP.z);
    if (d < 18) K[i] = LAND;
    else if (d < 20) { K[i] = LAND; if (!(gapCell(x, z) && d >= 17.5)) ring[i] = 1; }
    else if (d < 24 + 3 * fbm(x * 0.12, z * 0.12, seed + 9) && z < HP.z + 4) { K[i] = LAND; area[i] = 4; }
  }
  // the way from the Hollows' south end down to the Heap's east side
  const link = wander([{ x: 86 + rng.range(-4, 4), z: 99 }, { x: HP.x + 23, z: HP.z - 9 }], 2, seed + 11);
  for (const p of link) put(p.x, p.z, 2.1, LAND);
  // ---- the main road (always dry: nothing is drawn over it, and nothing set down on its middle) ----
  const RW = [{ x: CP.x, z: CP.z + 4 }, { x: 49 + rng.range(-2, 2), z: 34 }, { x: 48 + rng.range(-2, 2), z: 58 }, { x: 50 + rng.range(-2, 1), z: 84 },
    { x: 42 + rng.range(-3, 3), z: 99 }, { x: 34 + rng.range(-3, 3), z: 110 }, { x: 44 + rng.range(-3, 3), z: 120 }, { x: HP.x + rng.range(-2, 2), z: HP.z - HP.r - 6 }, { x: HP.x, z: HP.z - HP.r - 2 }];
  const road = wander(RW, 2.5, seed + 13);
  L.road = road;
  for (const p of road) mark(roadM, p.x, p.z, 2.7);
  const roadAt = (x, z) => { let b = 1e9; for (const p of road) b = Math.min(b, Math.hypot(p.x - x, p.z - z)); return b; };
  const nearRoad = (p, zmin = -1e9, zmax = 1e9) => { let b = null, bd = 1e9; for (const q of road) if (q.z >= zmin && q.z <= zmax) { const d = hyp(q, p); if (d < bd) { bd = d; b = q; } } return b; };
  // ---- the basins: two shallow ones on the Old Shore, three to five in the Hollows (bed in 0.15 m steps, lowest in the
  // middle: they flood from their centres outward) ----
  const basins = [];
  const okBasin = (x, z, r, id) => allK(x, z, r + 1.5, (i) => K[i] === LAND && area[i] === id && !roadM[i]) && !basins.some((b) => hyp(b, { x, z }) < b.r + r + 3);
  for (let t = 0; t < 120 && basins.length < 2; t++) {
    const r = rng.range(4, 6), x = rng.range(14, 44), z = rng.range(48, 80);
    if (!okBasin(x, z, r, 1) || hyp(H1, { x, z }) < r + 7) continue;
    basins.push({ x, z, r, shore: true });
  }
  if (basins.length < 2 && !last) return fail('shoreBasins');
  const nH = rng.int(3, 5);
  for (let t = 0; t < 300 && basins.length < 2 + nH; t++) {
    const big = basins.length === 2 && t < 160, r = big ? rng.range(8.5, 10.5) : rng.range(6, 9), x = rng.range(56, 102), z = rng.range(42, 102);
    if (!okBasin(x, z, r, 2)) continue;
    basins.push({ x, z, r });
  }
  if (basins.length < 5 && !last) return fail('hollowBasins');
  basins.forEach((b, k) => {
    b.cells = [];
    for (const [x, z] of circleCells(L, b.x, b.z, b.r * 1.15)) {
      const i = z * w + x, d = Math.hypot(x + 0.5 - b.x, z + 0.5 - b.z), re = b.r * (0.82 + 0.3 * fbm(x * 0.15, z * 0.15, seed + 20 + k));
      if (d >= re || K[i] !== LAND || roadM[i]) continue;
      const dn = d / re, n = fbm(x * 0.06, z * 0.06, seed + 7);
      K[i] = FLAT; b.cells.push(i);
      bed[i] = b.shore ? Q(clamp(0.45 + 0.3 * dn + (fbm(x * 0.3, z * 0.3, seed + 8) - 0.5) * 0.15, 0.45, 0.75)) : Q(clamp(0.9 * n - 0.25 + 0.5 * dn, 0.15, 0.9));
    }
  });
  // the second hearth on an island in the largest of the Hollows' basins, a dry spine three cells wide to the road, and a
  // causeway (bed 0.45-0.6: wading at high water) the other way to the rim
  const HB = basins.slice(2).sort((a, b) => b.r - a.r)[0];
  const H2 = { k: 2, x: snap(HB.x + rng.range(-1, 1)), z: snap(HB.z + rng.range(-1, 1)) };
  const P2 = nearRoad(H2);
  put(H2.x, H2.z, 3, LAND);
  const spine = wander([H2, P2], 1.2, seed + 15, 0.5);
  for (const p of spine) { put(p.x, p.z, 1.5, LAND); mark(keep, p.x, p.z, 1.5); }
  mark(keep, H2.x, H2.z, 3);
  {
    const a = Math.atan2(H2.x - P2.x, H2.z - P2.z) + rng.range(-0.5, 0.5), end = toward(H2, a, HB.r + 1.5);
    const n = Math.ceil(hyp(H2, end) * 2);
    for (let j = 0; j <= n; j++) for (const [x, z] of circleCells(L, H2.x + (end.x - H2.x) * j / n, H2.z + (end.z - H2.z) * j / n, 1.05)) {
      const i = z * w + x; if (K[i] !== FLAT || keep[i]) continue;
      bed[i] = Q(0.45 + (fbm(x * 0.3, z * 0.3, seed + 23) > 0.55 ? 0.15 : 0));
    }
    S.causeway = { x0: H2.x, z0: H2.z, x1: end.x, z1: end.z };
  }
  S.spine = { from: { x: H2.x, z: H2.z }, to: { x: P2.x, z: P2.z } };
  // a rock islet in every other big basin (a refuge in its water)
  for (const b of basins) if (b !== HB && b.r > 7.5) { const a = rng.range(0, 6.28), p = toward(b, a, rng.range(0, b.r * 0.35)); put(p.x, p.z, 1.9, LAND, (i) => K[i] !== FLAT); }
  // low rock ridges between the Hollows' basins
  for (let t = 0, n = 0, want = rng.int(3, 6); t < 160 && n < want; t++) {
    const x = rng.range(58, 100), z = rng.range(44, 100), a = rng.range(0, 6.28), len = rng.range(2, 4.5);
    const A = toward({ x, z }, a, len), B = toward({ x, z }, a + Math.PI, len);
    if (![A, B, { x, z }].every((p) => allK(p.x, p.z, 2.6, (i) => K[i] === LAND && area[i] === 2 && !roadM[i] && !keep[i]))) continue;
    line(A, B, 1.0, ROCK); n++;
  }
  // ---- the side paths to the first and third hearths (dry, the First's trail runs on them), the camp, the road ----
  const P1 = nearRoad(H1, 30, 80), P3 = nearRoad(H3, 100, 120);
  const path1 = wander([P1, H1], 1.5, seed + 17, 0.5), path3 = wander([P3, H3], 1.5, seed + 19, 0.5);
  for (const p of [...path1, ...path3]) { put(p.x, p.z, 1.2, LAND); mark(keep, p.x, p.z, 1.4); paintAt(p.x, p.z, 1.1, 0.7); }
  for (const p of [...path1, ...path3, ...spine]) reserve(p.x, p.z, 0.9);
  put(H1.x, H1.z, 2.6, LAND); mark(keep, H1.x, H1.z, 3); put(H3.x, H3.z, 3.6, LAND); mark(keep, H3.x, H3.z, 4);
  put(CP.x, CP.z, CP.r, LAND); mark(keep, CP.x, CP.z, CP.r);
  for (const p of road) { put(p.x, p.z, 2.7, LAND); paintAt(p.x, p.z, 1.7, 1); }
  for (const p of road) reserve(p.x, p.z, 1.3);
  // ---- the camp: the rope's foot, the waypoint, Tamarisk's brazier, a crate pile, who stands where ----
  const rope = { x: CP.x, z: CP.z - 4 }, br0 = { x: CP.x - 3.5, z: CP.z - 1.5 };
  S.camp = CP; S.rope = rope; S.waypoint = { x: CP.x + 4, z: CP.z + 1 };
  blockC(br0.x, br0.z, 0.45);
  for (const [dx, dz] of [[5, -3], [5.9, -2.4], [5.3, -3.9]]) { L.props.push({ t: 'crate', x: CP.x + dx, z: CP.z + dz, r: rng.range(0, 6.28), s: rng.range(0.9, 1.15) }); blockC(CP.x + dx, CP.z + dz, 0.5); }
  reserve(CP.x, CP.z, CP.r - 1);
  S.sky.push({ x: rope.x, z: rope.z + 1, r: 6 });
  S.npcs = { glaukos: { x: CP.x + 2, z: CP.z + 3.5, rot: Math.PI }, tamarisk: { x: br0.x - 1.3, z: br0.z + 1.4, rot: 0.6 }, brazier: br0 };
  // ---- the Old Shore: boats beached at odd angles (the Sailor on the deck of the first), stilt frames and shacks fallen,
  // the first hearth on its rock ----
  const shoreOk = (i) => K[i] === LAND && area[i] === 1 && !roadM[i] && !keep[i] && !blk[i] && !res[i];
  {
    const kinds = ['keelboat', ...rng.shuffle(['keelboat', 'rowboat'])];
    for (let t = 0; t < 200 && S.boats.length < 3; t++) {
      const kind = kinds[S.boats.length], len = kind === 'keelboat' ? 4.4 : 2.4, wd = kind === 'keelboat' ? 1.4 : 0.9;
      const x = rng.range(12, 44), z = rng.range(36, 82), a = rng.range(0, 6.28);
      const cl = rectCells(L, x, z, wd + 1, len + 1, a);
      if (!cl.every(([cx, cz]) => cx >= 0 && shoreOk(cz * w + cx)) || S.boats.some((q) => hyp(q, { x, z }) < 7) || hyp(H1, { x, z }) < 6) continue;
      const tilt = rng.range(0.12, 0.35);
      blockR(x, z, wd, len, a); reserve(x, z, len + 0.6);
      S.boats.push({ x, z, r: a, kind, tilt });
      L.props.push({ t: kind, x, z, r: a, s: 1, tilt });
    }
    if (S.boats.length < 3 && !last) return fail('boats');
    const b0 = S.boats[0];
    if (b0) S.sailor = { x: b0.x, z: b0.z, rot: b0.r + Math.PI / 2 };
    const want = rng.int(4, 6);
    for (let t = 0; t < 240 && S.huts.length < want + 2; t++) {
      const kind = S.huts.length < want ? 'stilt' : 'shack', x = rng.range(11, 45), z = rng.range(34, 82), a = rng.range(0, 6.28);
      const hw = kind === 'shack' ? 1.7 : 1.3, hd = kind === 'shack' ? 2.1 : 1.3;
      if (!rectCells(L, x, z, hw + 0.8, hd + 0.8, a).every(([cx, cz]) => cx >= 0 && shoreOk(cz * w + cx)) || hyp(H1, { x, z }) < 5) continue;
      blockR(x, z, hw, hd, a); reserve(x, z, Math.max(hw, hd) + 1);
      S.huts.push({ x, z, r: a, kind });
      L.props.push(kind === 'shack' ? { t: 'shack', x, z, r: a, s: 1, side: true } : { t: 'stiltFrame', x, z, r: a, s: rng.range(0.9, 1.1), tilt: rng.range(0.05, 0.25) });
    }
    if (S.huts.length < want + 2 && !last) return fail('huts');
  }
  // ---- the lost lights: a toppled tower, its lantern end (and the interact past it) on dry ground ----
  const topple = (id, c, a) => {
    const lamp = toward(c, a, 5.3), body = rectCells(L, c.x, c.z, 0.8, 3.6, a);
    if (!body.every(([x, z]) => x >= 0 && (K[z * w + x] === LAND || K[z * w + x] === FLAT) && !roadM[z * w + x] && !keep[z * w + x] && !blk[z * w + x] && !res[z * w + x])) return false;
    if (cellK(lamp.x, lamp.z) !== LAND || !allK(lamp.x, lamp.z, 1.2, (i) => K[i] === LAND && !blk[i])) return false;
    blockR(c.x, c.z, 0.8, 3.6, a); reserve(lamp.x, lamp.z, 1.4);
    S.lost.push({ id, x: c.x, z: c.z, rot: a, lamp, kind: rng.pick(['towerA', 'towerB', 'towerC']) });
    return true;
  };
  {
    const rims = rng.shuffle(basins.slice(2).filter((b) => b !== HB)).concat([HB]);
    for (const id of ['galini', 'twins']) {
      let ok = false;
      for (const b of rims) { if (ok) break; for (let t = 0; t < 14 && !ok; t++) { const a = rng.range(0, 6.28); ok = topple(id, toward(b, a, b.r * 0.92), a); } if (ok) rims.splice(rims.indexOf(b), 1); }
      if (!ok && !last) return fail('lost.' + id);
    }
    let ok = false;
    for (let t = 0; t < 120 && !ok; t++) { const x = rng.range(14, 48), z = rng.range(101, 120); if (area[Math.floor(z) * w + Math.floor(x)] === 3) ok = topple('kranea', { x, z }, rng.range(0, 6.28)); }
    if (!ok && !last) return fail('lost.kranea');
    ok = false;
    for (let t = 0; t < 60 && !ok; t++) {
      const a = Math.PI + rng.sign() * rng.range(0.45, 1.25), c = toward(HP, a, 22.4);
      ok = topple('psamathe', c, a + Math.PI / 2 * rng.sign());
    }
    if (!ok && !last) return fail('lost.psamathe');
  }
  // ---- the lure posts: two on the Hollows' basin rims, one in the Keels, the bait within 4 m ----
  {
    const lure = (p, bait) => { blockC(p.x, p.z, 0.35); reserve(p.x, p.z, 2.2); S.lures.push({ x: p.x, z: p.z, bait }); };
    const rims = rng.shuffle(basins.slice(2));
    for (const b of rims) {
      if (S.lures.length >= 2) break;
      for (let t = 0; t < 16; t++) {
        const a = rng.range(0, 6.28), p = toward(b, a, b.r * 1.15 + 1.2);
        if (!allK(p.x, p.z, 1.5, (i) => K[i] === LAND && !blk[i] && !res[i] && !roadM[i] && !keep[i])) continue;
        lure(p, toward(b, a, b.r * 1.15 - 1.3)); break;
      }
    }
    for (let t = 0; t < 120 && S.lures.length < 3; t++) {
      const x = rng.range(14, 48), z = rng.range(101, 120), p = { x, z };
      if (area[Math.floor(z) * w + Math.floor(x)] !== 3 || !allK(x, z, 1.8, (i) => K[i] === LAND && !blk[i] && !res[i] && !roadM[i] && !keep[i])) continue;
      lure(p, toward(p, rng.range(0, 6.28), 2.6));
    }
    if (S.lures.length < 3 && !last) return fail('lures');
  }
  // ---- the Keels: Asger's keel first (r 2, its window toward the road, his cold brazier at its foot), then 13-21 more
  // with room to walk between them; never on the road, a path or the third hearth's clearing ----
  const keelOk = (x, z, r) => area[Math.floor(z) * w + Math.floor(x)] === 3 && allK(x, z, r, (i) => K[i] === LAND) && allK(x, z, r + 0.8, (i) => !roadM[i] && !blk[i] && !res[i] && !keep[i]);
  {
    const cand = road.filter((p) => p.z > 103 && p.z < 118);
    for (let t = 0; t < 80 && !S.asger && cand.length; t++) {
      const p = rng.pick(cand), a = rng.range(0, 6.28), d = rng.range(5.4, 6.6), c = toward(p, a, d);
      if (!keelOk(c.x, c.z, 2.6)) continue;
      const rot = Math.atan2(p.x - c.x, p.z - c.z), br = toward(c, rot, 3.1);
      blockC(c.x, c.z, 2); blockC(br.x, br.z, 0.45); reserve(c.x, c.z, 3.2); reserve(br.x, br.z, 1.4);
      S.asger = { x: c.x, z: c.z, rot, keel: { x: c.x, z: c.z, r: 2 }, brazier: br };
      S.keels.push({ x: c.x, z: c.z, r: 2, asger: true });
    }
    if (!S.asger && !last) return fail('asger');
    const want = rng.int(14, 22);
    for (let t = 0; t < 600 && S.keels.length < want; t++) {
      const r = 1 + 1.5 * rng.next() ** 1.6, x = rng.range(9, 52), z = rng.range(98, 122);
      if (!keelOk(x, z, r) || S.keels.some((q) => hyp(q, { x, z }) < q.r + r + 1.3)) continue;
      blockC(x, z, r); S.keels.push({ x, z, r });
    }
    if (S.keels.length < 14 && !last) return fail('keels');
    for (const k of S.keels) L.props.push({ t: 'keel', x: k.x, z: k.z, r: rng.range(0, 6.28), s: k.r, hgt: rng.range(7, 10), asger: k.asger || undefined });
  }
  S.hearths.push(H1, H2, H3);
  for (const hh of S.hearths) { blockC(hh.x, hh.z, 0.6); reserve(hh.x, hh.z, 2.6); }
  // ---- the Heap: the ring of hulls with its gaps, the Mere, the shore's lanterns, bells and casks, the Well, the neck ----
  {
    for (let i = 0; i < N; i++) if (ring[i]) blk[i] = 1;
    // (the hulls drawn along the ring, never across a gap)
    const gaps = [Math.PI, Math.PI / 2, -Math.PI / 2], nH = rng.int(13, 16);
    for (let k = 0; k < nH; k++) {
      const a = (k / nH) * Math.PI * 2 + rng.range(-0.08, 0.08);
      if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.2)) continue;
      const p = toward(HP, a, 19 + rng.range(-0.3, 0.4)), kind = rng.weighted([['keelboat', 4], ['rowboat', 2], ['brokenBoat', 3], ['wreck', 1]]);
      L.props.push({ t: kind, x: p.x, z: p.z, r: a + Math.PI / 2 + rng.range(-0.35, 0.35), s: kind === 'wreck' ? 0.6 : rng.range(0.9, 1.2), tilt: rng.range(0.2, 0.7), heap: true });
    }
    // the Mere: bed 0.45-0.6 across r 5-10, 0-0.15 in its core
    for (const [x, z] of circleCells(L, HP.x, HP.z, 10)) {
      const i = z * w + x, d = Math.hypot(x + 0.5 - HP.x, z + 0.5 - HP.z), n = fbm(x * 0.3, z * 0.3, seed + 25);
      K[i] = FLAT; mere[i] = 1;
      bed[i] = d < 5 ? (n > 0.55 ? 0.15 : 0) : Q(0.45 + (n > 0.5 ? 0.15 : 0));
    }
    S.mere = { x: HP.x, z: HP.z, r: 10, core: 5, lure: { x: HP.x, z: HP.z - 6 } };
    // (the lure-rock, a stone 1.8 m across on its one cell (build6.js), blocked as the lure posts are: a footprint in both
    // readings, so she goes round it once the Mere falls to wading in its phase 2 and once it is dry; the water stands
    // round and under it all the same)
    blockC(S.mere.lure.x, S.mere.lure.z, 0.9);
    S.well = { x: HP.x, z: HP.z, r: 2, cells: circleCells(L, HP.x, HP.z, 2) };
    const arch = [];
    for (let z = hz + 3; z < hz + 17; z++) for (const x of [hx - 1, hx]) arch.push([x, z]);
    S.arch = { x: hx, z: hz + 10, rot: 0, cells: arch };
    const nearArch = (p) => Math.abs(p.x - hx) < 3 && p.z > hz + 1;
    // three wreck lanterns at r 14 and 120 degrees (Keyx's the nearest the north gap), bells 3.2 m along the shore from two
    const a0 = Math.PI + rng.sign() * rng.range(0.35, 0.8);
    for (let k = 0; k < 3; k++) { const a = a0 + (k * Math.PI * 2) / 3, p = toward(HP, a, 14); S.wreckLamps.push({ i: k, x: p.x, z: p.z, a, keyx: k === 0 }); blockC(p.x, p.z, 0.4); }
    for (const k of rng.shuffle([0, 1, 2]).slice(0, 2).sort()) {
      const l = S.wreckLamps[k], da = 3.2 / 14 / Math.cos(3.2 / 28), sides = [l.a + da, l.a - da].map((a) => ({ a, p: toward(HP, a, 14) }));
      const s = sides.find((q) => !nearArch(q.p) && Math.abs(Math.atan2(Math.sin(q.a - Math.PI), Math.cos(q.a - Math.PI))) > 0.2) || sides[0];
      S.bells.push({ i: S.bells.length, x: s.p.x, z: s.p.z, lamp: k }); blockC(s.p.x, s.p.z, 0.35);
    }
    // four whale-oil casks on the shore, 3 m from every other interact, clear of the north gap and the neck
    const ints = [...S.wreckLamps, ...S.bells];
    for (let t = 0; t < 300 && S.casks.length < 4; t++) {
      const a = rng.range(0, 6.28), p = toward(HP, a, rng.range(11.5, 16.5));
      if (ints.some((q) => hyp(q, p) < 3.2) || S.casks.some((q) => hyp(q, p) < 3.2) || nearArch(p) || Math.abs(p.x - HP.x) < 2.5 && p.z < HP.z - 9) continue;
      S.casks.push({ x: p.x, z: p.z });
    }
    if (S.casks.length < 4 && !last) return fail('casks');
    S.heap = { x: HP.x, z: HP.z, r: 20, gap: { x: HP.x, z: HP.z - 19 } };
    L.gaps = ['east', 'west'].map((id) => { const x = Math.floor(HP.x + (id === 'east' ? 19 : -19)); return { id, cells: [[x, hz - 1], [x, hz], [x, hz + 1]] }; });
    // Glaukos on the north rim by its brazier; his place by the Mere after the fight
    S.npcs.heapRim = { x: HP.x + 3, z: HP.z - 22.6 };
    S.npcs.mere = { x: HP.x + 2.5, z: HP.z - 11.6 };
    reserve(HP.x, HP.z - 21, 2.5);
  }
  L.boss = { x: HP.x, z: HP.z, r: 20 };
  L.start = { x: CP.x, z: CP.z + 2 };
  L.exits.push({ x: rope.x, z: rope.z, to: 'farlight', label: 'exit.ropeUp' });
  // ---- the frame: nothing carved within MARGIN of the map's edge ----
  for (let i = 0; i < N; i++) { const x = i % w, z = (i - x) / w; if ((x < MARGIN || z < MARGIN || x >= w - MARGIN || z >= h - MARGIN) && K[i] !== ROCK) { if (!last) return fail('frame'); K[i] = ROCK; } }
  // ---- the grid (the Heap's ring of hulls a mound 1-3 m under them) ----
  finish6(L, K, bed, blk, mere, {
    post: (H) => { const W = w + 1; for (let vz = 1; vz < h; vz++) for (let vx = 1; vx < w; vx++) if (CORNER.every(([dx, dz]) => ring[(vz + dz) * w + vx + dx])) H[vz * W + vx] = 1 + 2 * fbm(vx * 0.3, vz * 0.3, seed + 27); }
  });
  for (let i = 0; i < N; i++) if (blk[i] && S.keels.some((k) => Math.hypot(i % w + 0.5 - k.x, Math.floor(i / w) + 0.5 - k.z) <= k.r + 0.01)) L.keel[i] = 1;
  // ---- the build's lights: Tamarisk's at the camp and on the Heap's north rim ----
  const fire = (x, z, o = {}) => {
    plug(L, x, z, 0.45); reserve(x, z, 1.6);
    L.props.push({ t: 'brazier', x, z, ...o });
    const l = { x, y: 1.6, z, color: 0xffa050, intensity: 18, range: 10, flicker: 0.35 };
    L.lights.push(l);
    return l;
  };
  fire(br0.x, br0.z, { camp: true });
  S.braziers.push({ x: HP.x - 3, z: HP.z - 23 }); fire(HP.x - 3, HP.z - 23);
  S.braziers.unshift(br0);
  // ---- the packs (the design's tags; combat's PACKS hold their kinds) ----
  let R0 = reach(L, L.start.x, L.start.z, walk6(L, 0, MERE_H)), R1 = reach(L, L.start.x, L.start.z, walk6(L, HIGH6, MERE_H));
  const packAt = (p, o) => { L.packs.push({ x: p.x, z: p.z, n: o.n, tag: o.tag, elite: o.elite !== undefined ? o.elite : rng.chance(0.15) ? 'champion' : null, ...o.x0 }); };
  const apart = (p, gap) => !L.packs.some((q) => hyp(q, p) < gap);
  const inArea = (i, id) => area[i] === id;
  {
    // the black crews under the kelp, at the water's edge of each Old Shore basin and of two of the Hollows'
    for (const b of [...basins.slice(0, 2), ...rng.shuffle(basins.slice(2).filter((q) => q !== HB)).slice(0, 2)]) {
      const c = rng.shuffle(b.cells.filter((i) => R0[i] && L.bed[i] >= 0.45 && L.bed[i] <= 0.75 && !res[i]))[0];
      if (c === undefined) continue;
      const p = { x: c % w + 0.5, z: Math.floor(c / w) + 0.5 };
      packAt(p, { n: rng.int(4, 6), tag: 'blackCrew', x0: { dormant: true, tide: true } });
      L.props.push({ t: 'kelp', x: p.x, z: p.z, r: rng.range(0, 6.28), s: rng.range(1, 1.4) }); S.kelp.push({ x: p.x, z: p.z });
    }
    // the Faded on the Old Shore's dry sand
    for (let t = 0, n = 0; t < 300 && n < 2; t++) {
      const x = rng.int(10, 48), z = rng.int(34, 84), i = z * w + x, p = { x: x + 0.5, z: z + 0.5 };
      if (!inArea(i, 1) || !R1[i] || !dryAt(L, p.x, p.z) || res[i] || !apart(p, 12) || roadAt(p.x, p.z) < 4) continue;
      packAt(p, { n: rng.int(4, 5), tag: 'shoreFaded' }); n++;
    }
    // a pool hunter in the deepest of the Hollows' water (the Icemaw lies up at low water)
    {
      const c = rng.shuffle(basins.slice(2).flatMap((b) => b.cells).filter((i) => R0[i] && L.bed[i] <= 0.45 && !res[i]))[0];
      if (c !== undefined) packAt({ x: c % w + 0.5, z: Math.floor(c / w) + 0.5 }, { n: 3, tag: 'poolHunter', elite: null, x0: { tide: true } });
    }
    // the lice at the lure posts' bait, in the Keels, on the Heap's outer slope
    for (const lp of S.lures) { const p = nearFloor(L, lp.bait.x, lp.bait.z, 2) || lp; packAt(p, { n: rng.int(2, 3), tag: 'lures', elite: null }); }
    for (let t = 0, n = 0; t < 300 && n < 2; t++) {
      const x = rng.int(10, 50), z = rng.int(99, 122), i = z * w + x, p = { x: x + 0.5, z: z + 0.5 };
      if (!inArea(i, 3) || !R1[i] || !dryAt(L, p.x, p.z) || res[i] || !apart(p, 10)) continue;
      packAt(p, { n: rng.int(5, 7), tag: 'keelLice', elite: null, x0: { burst: 'vault' } }); n++;
    }
    for (let t = 0, n = 0; t < 300 && n < 2; t++) {
      const a = Math.PI + rng.sign() * rng.range(0.5, 1.5), q = toward(HP, a, rng.range(21, 23.5)), cx = Math.floor(q.x), cz = Math.floor(q.z), i = cz * w + cx, p = { x: cx + 0.5, z: cz + 0.5 };
      if (cx < 0 || cz < 0 || cx >= w || cz >= h || !R1[i] || !dryAt(L, p.x, p.z) || res[i] || !apart(p, 9)) continue;
      packAt(p, { n: rng.int(5, 7), tag: 'heapLice', elite: null, x0: { burst: 'hull' } }); n++;
    }
  }
  // ---- Tamarisk's braziers along the way, so that every pack lies within 15 m of a light that burns from the build ----
  // (never on the spine, the side paths or a hearth's disc: a brazier's footprint would narrow them)
  const offKeep = (x, z) => !circleCells(L, x, z, 1.6).some(([cx, cz]) => keep[cz * w + cx]);
  lightUp(L, L.packs, R1, roadAt, (x, z) => free(x, z, 0.9) && offKeep(x, z) && hyp(HP, { x, z }) > HP.r + 1 && !S.hearths.some((q) => hyp(q, { x, z }) < 3) && !L.packs.some((q) => hyp(q, { x, z }) < 2.5), (x, z) => { S.braziers.push({ x, z }); fire(x, z); });
  // ---- the First's trail on the road and the side paths to her three hearths; skylights; the vault's patches ----
  {
    const toGap = road.filter((p) => p.z <= HP.z - HP.r + 1);
    const all = [toGap, path1, wander([P2, ...spine.slice().reverse().slice(1)], 0, seed, 0.5), path3];
    const len = all.reduce((s, p) => s + p.slice(1).reduce((a, q, k) => a + hyp(q, p[k]), 0), 0);
    const gap = Math.max(2.4, len / 110);
    for (const p of all) for (const m of marks(p, gap)) if (dryAt(L, m.x, m.z) && !S.hearths.some((q) => hyp(q, m) < 1.2)) S.trail.push(m);
  }
  const skyOk = (x, z, r) => dryAt(L, x, z) && !S.sky.some((q) => hyp(q, { x, z }) < q.r + r + 4) && hyp(HP, { x, z }) > HP.r + r;
  for (const [id, n, x0, x1, z0, z1] of [[3, 3, 12, 50, 100, 121], [1, 2, 12, 46, 34, 82], [2, 2, 58, 100, 44, 102]]) {
    for (let t = 0, k = 0; t < 200 && k < n; t++) {
      const r = rng.range(3, 5), x = snap(rng.range(x0, x1)), z = snap(rng.range(z0, z1));
      if (!inArea(Math.floor(z) * w + Math.floor(x), id) || !skyOk(x, z, r)) continue;
      S.sky.push({ x, z, r }); k++;
    }
  }
  {
    const vOk = (x, z, r) => L.cells[Math.floor(z) * w + Math.floor(x)] && hyp(CP, { x, z }) > CP.r + r + 4 && hyp(HP, { x, z }) > 18 + r && !S.vaults.some((q) => hyp(q, { x, z }) < q.r + r);
    for (const [id, n, x0, x1, z0, z1] of [[3, rng.int(4, 6), 10, 51, 99, 122], [1, 1, 12, 46, 34, 82], [2, rng.int(1, 2), 58, 100, 44, 102], [4, 1, HP.x - 24, HP.x + 24, HP.z - 25, HP.z - 19]]) {
      for (let t = 0, k = 0; t < 200 && k < n; t++) {
        const r = id === 3 ? rng.range(3, 5) : rng.range(2.5, 4), x = snap(rng.range(x0, x1)), z = snap(rng.range(z0, z1));
        if (x < 0 || z < 0 || x >= w || z >= h || (area[Math.floor(z) * w + Math.floor(x)] !== id && id !== 4) || !vOk(x, z, r)) continue;
        if (vaultPatch(L, x, z, r)) k++;
      }
    }
  }
  // ---- the place voices, one in each place ----
  {
    const shoreC = nearFloor(L, 28, 58, 8) || { x: 28, z: 58 }, holC = nearFloor(L, 78, 72, 8) || { x: 78, z: 72 }, keelC = nearRoad({ x: 34, z: 110 }), heapC = { x: HP.x, z: HP.z - 27 };
    [[shoreC, 'w1'], [holC, 'w2'], [keelC, 'w3'], [heapC, 'w4']].forEach(([p, k]) => S.voices.push({ x: p.x, z: p.z, r: 7, key: 'd.skotos6.' + k }));
  }
  dress6(L, rng, res, area);
  L.refuges = refuges(L);
  dryPockets(L, reach(L, L.start.x, L.start.z, walk6(L, HIGH6, MERE_H)), walk6(L, HIGH6, MERE_H), MERE_H, true);
  L.dist = distField(L, 14);
  // ---- does it hold, in both readings? ----
  if (!last) {
    const f = drainedFaults(L);
    if (f.length) return fail(f[0].replace(/[@.].*/, ''));
    const fd = drainedFaults(dryCopy(L));
    if (fd.length) return fail('dry.' + fd[0].replace(/[@.].*/, ''));
  }
  return L;
}
// what lies about from the drained sea's own draws (seed ^ a constant): stones and rocks on the sand, kelp, driftwood and
// barnacled stones along the pockets' edges, anchors on the Old Shore, one whale's bones; nothing on the road's middle
function dress6(L, rng0, res, area) {
  const { w, h } = L, rng = RNG((L.seed ^ 0x6d1a5) >>> 0), P = (o) => L.props.push(o), S = L.spots;
  const keep = [L.start, ...L.exits, S.waypoint, ...S.hearths, ...S.lost.map((l) => l.lamp), ...S.lures, ...S.braziers, ...Object.values(S.npcs)].filter((p) => p && p.x != null);
  const clear = (x, z, r) => keep.every((p) => Math.hypot(p.x - x, p.z - z) > r) && Math.hypot(x - S.heap.x, z - S.heap.z) > 18.5;
  for (let z = MARGIN; z < h - MARGIN; z++) for (let x = MARGIN; x < w - MARGIN; x++) {
    const i = z * w + x, q = rng.next(), px = x + rng.range(0.15, 0.85), pz = z + rng.range(0.15, 0.85), r = rng.range(0, 6.28), s = rng.next();
    if (!L.cells[i] || res[i] || L.paint[i] > 0.45 || !clear(px, pz, 1.6)) continue;
    let edge = false, wet = false;
    for (const [dx, dz] of N4) { const j = (z + dz) * w + x + dx; if (!L.cells[j] && !L.pocket[j]) edge = true; if (L.pocket[j]) wet = true; }
    if (L.pocket[i]) { if (q < 0.03) P({ t: 'stone', x: px, z: pz, r, s: 0.22 + s * 0.3, wet: true }); continue; }
    if (wet && q < 0.06) P({ t: rng.pick(['kelp', 'driftwood', 'barnacleRock']), x: px, z: pz, r, s: 0.6 + s * 0.5 });
    else if (edge && q < 0.12) P({ t: 'rock', x: px, z: pz, r, s: 0.6 + s * 0.8 });
    else if (q < 0.035) P({ t: 'stone', x: px, z: pz, r, s: 0.3 + s * 0.5 });
    else if (area[i] === 1 && q > 0.995) P({ t: rng.pick(['anchor', 'sunkenAnchor']), x: px, z: pz, r, s: 1, tilt: rng.range(0.2, 0.9) });
  }
  // one whale's bones on the Old Shore, clear of everything (blocked at the skull and along the spine, as gen5's)
  for (let t = 0; t < 80; t++) {
    const x = rng.range(14, 44), z = rng.range(38, 80), a = rng.range(0, 6.28), fx = Math.sin(a), fz = Math.cos(a);
    const pts = [-5, -3.5, -2, -0.5, 1, 2.5, 4, 6.2].map((u) => ({ x: x + fx * u, z: z + fz * u }));
    if (!pts.every((p) => dryAt(L, p.x, p.z) && !res[Math.floor(p.z) * w + Math.floor(p.x)] && area[Math.floor(p.z) * w + Math.floor(p.x)] === 1 && clear(p.x, p.z, 2.5))) continue;
    P({ t: 'whale', x, z, r: a, s: 1 });
    plug(L, x + fx * 6.2, z + fz * 6.2, 1.1); for (const p of pts.slice(0, -1)) plug(L, p.x, p.z, 0.4);
    S.whale = { x, z, r: a };
    break;
  }
  void rng0;
}
// does the Drained Sea hold (the design's reach checks; the reading the layout carries)
export function drainedFaults(L) {
  const out = [], S = L.spots, dry = L.mode === 'dry', far = (R, p, r = 2.2) => !p || nearReach(L, R, p.x, p.z) > r;
  if (L.ice) out.push('iceDefined');
  for (let i = 0; i < L.pocket.length; i++) if (L.pocket[i] && !(L.bed[i] < BED_DRY)) { out.push('pocketDry'); break; }
  if (nearFrame(L)) out.push('frame');
  const W0 = walk6(L, 0, dry ? 0 : MERE_H), W1 = walk6(L, HIGH6, dry ? 0 : MERE_H);
  const R0 = reach(L, L.start.x, L.start.z, W0), R1 = reach(L, L.start.x, L.start.z, W1);
  const N = S.npcs || {};
  const need = [S.camp, S.rope, S.waypoint, ...S.hearths, ...S.lost.map((l) => l.lamp), S.asger?.brazier, ...S.lures, S.heap?.gap, ...S.wreckLamps, ...S.bells, N.glaukos, N.tamarisk, N.heapRim, N.mere, ...S.braziers, ...L.exits.filter((e) => e.to !== 'bottom')];
  need.forEach((p, k) => { if (far(R0, p) || far(R1, p)) out.push('reach.' + k); });
  if (far(R0, S.sailor, 2.6) || far(R1, S.sailor, 2.6)) out.push('reach.sailor');
  if (S.hearths.length !== 3 || S.lost.length !== 4 || S.wreckLamps.length !== 3 || S.bells.length !== 2 || S.casks.length !== 4 || !S.asger || !S.sailor) out.push('spots');
  if (!S.wreckLamps.some((l) => l.keyx)) out.push('noKeyx');
  for (const p of L.packs) if (far(p.tide ? R0 : R1, p, 3.5)) out.push('reach.pack.' + p.tag);
  // the shore ring round the Mere at its phase-2 level: every lantern, bell and cask reaches the others
  if (!dry) for (const h of [0, HIGH6]) {
    const l0 = S.wreckLamps[0], Rm = l0 && reach(L, nearFloor(L, l0.x, l0.z, 2)?.x ?? l0.x, nearFloor(L, l0.x, l0.z, 2)?.z ?? l0.z, walk6(L, h, MERE_FIGHT));
    if (!Rm || [...S.wreckLamps, ...S.bells, ...S.casks].some((p) => far(Rm, p, 1.6))) out.push('reach.shore');
  }
  // the dry reading: the Well's mouth from the north gap
  if (dry) for (const W of [W0, W1]) { const g = S.heap.gap, Rg = reach(L, g.x, g.z, W); if (far(Rg, S.well, 2.8)) out.push('reach.well'); }
  // the First's trail and what the story stands on, on dry ground (a footprint is dry ground: the stone, the post)
  if (S.trail.length < 60 || S.trail.length > 120) out.push('trail.count');
  for (const m of S.trail) if (!dryAt(L, m.x, m.z)) { out.push('trail.wet'); break; }
  for (const p of [...S.hearths, ...S.wreckLamps, ...S.bells, ...S.braziers, S.camp, ...L.exits.filter((e) => e.to !== 'bottom')]) if (p && (!firm(L, p.x, p.z) || L.pocket[Math.floor(p.z) * L.w + Math.floor(p.x)])) { out.push('onWet'); break; }
  // the second hearth's spine: three cells wide or more, dry at full flood, from the road to her island
  const H2 = S.hearths.find((q) => q.k === 2);
  if (!S.spine || !H2 || !wideDry(L, S.spine.to, H2)) out.push('spine');
  // the main road whole at high water, never closed by a keel
  for (const p of L.road) { const i = Math.floor(p.z) * L.w + Math.floor(p.x); if (!R1[i] || !dryAt(L, p.x, p.z) || L.keel[i]) { out.push('road'); break; } }
  // the shore ring six cells wide at least, all the way round (the Mere at its fight level)
  // (a lantern's or a bell's own cell is shore)
  const on = [...S.wreckLamps, ...S.bells];
  if (!dry && S.heap) for (let k = 0; k < 96; k++) {
    const a = (k / 96) * Math.PI * 2;
    let m = 0;
    for (let d = 10.1; d < 18; d += 0.2) { const p = toward(S.heap, a, d), i = Math.floor(p.z) * L.w + Math.floor(p.x); if (!L.pocket[i] && (L.cells[i] || on.some((q) => hyp(q, p) < 1))) m += 0.2; }
    if (m < 6) { out.push('shoreRing'); break; }
  }
  // the 15 m rule and the arena's spacing
  const lights = buildLights(L);
  for (const p of L.packs) if (!lights.some((l) => hyp(l, p) <= LIGHT_R)) { out.push('light.' + p.tag); break; }
  if (crowded([...S.wreckLamps, ...S.bells, ...S.casks])) out.push('arenaCrowded');
  // every pocket's water within 12 m of a dry 3 x 3; the dry ground the high water cuts off a refuge's
  for (let i = 0; i < L.pocket.length; i += 3) if (L.pocket[i] === 1 && !refugeNear(L, i % L.w + 0.5, Math.floor(i / L.w) + 0.5, 12)) { out.push('noRefuge'); break; }
  out.push(...dryPockets(L, R1, W1, dry ? 0 : MERE_H));
  return out;
}

// ======================= BOTTOM: the Bottom of the Gates =======================
// North to south: the Well's Foot (the camp: the Well's foot, the Saltborn's fire-pit, Glaukos), the road west and east
// to two windows of the Gates' own generators at their own sizes, stamped flipped so each one's door faces the Well and
// its far end the south: the Drowned Barrow (genCrypt, 42 x 78: its ante-room and one free room under black water, the
// ember's pane in its smallest leaf room, the first black lamp in its throne hall before the south door we cut), the
// Drowned Wood (genForest, 42 x 78: black water over its floor but the trail, Leif's clearing and the garland glade cut
// off the trail at a third and two thirds of it, lure posts on two bends, the second black lamp in the Weaver's hollow);
// below both south doors the Forgotten Village (six to eight houses tilted and sunk round a square, its sunken well, the
// pocket Keyx walks into, the third black lamp in his hand), the Shadow Stair (14 cells wide at its head, three
// shadow-walls of 3 x 14 cells, two pools on its terraces), the First's Hearth (r 14: her stone and fire, four
// hearthstones, seven named niches, two black pools, the Gate ring on the south rim). Glaukos's fire-pots for the 15 m rule.
export function genBottom(seed, o = {}) {
  const mode = o.mode === 'lit' ? 'lit' : 'dark';
  let L = null, k = 0;
  while (!L && k < 24) { L = tryBottom(seed + k * 7919, k === 23); k++; }
  L.seed = seed; L.tries = k;
  return readBottom(L, mode);
}
// the reading: 'dark' (before her fire) keeps the Stair's three shadow-walls closed (world.js opens each with its lamp)
function readBottom(L, mode) {
  L.mode = mode;
  if (mode !== 'lit') for (const wl of L.walls) for (const [x, z] of wl.cells) footprint(L, z * L.w + x);
  return L;
}
// a sub-layout's cells, paint and props laid into the window [x0, x0 + sub.w) x [z0, z0 + sub.h) of L (its own size: a
// window is never sized the other way round), o.flipZ mirroring it north-south. Its exits, packs, boss, waypoint, shrines,
// chests and lights are dropped, and every prop that draws a light of its own (LIT_PROPS); its rooms, trail, walls and
// clearings are kept, remapped, in the record it returns (pushed to L.stamps; o.seed, the seed it was drawn from, so
// check-act6 can draw it again). null: the window does not fit
export function stamp(L, sub, x0, z0, o = {}) {
  if (x0 < 0 || z0 < 0 || x0 + sub.w > L.w || z0 + sub.h > L.h) return null;
  const { w } = L, flip = !!o.flipZ;
  const Z = (z) => (flip ? z0 + sub.h - z : z0 + z), ZC = (iz) => (flip ? z0 + sub.h - 1 - iz : z0 + iz), RT = (r) => (flip ? Math.PI - r : r);
  const P = (p) => p && { ...p, x: x0 + p.x, z: Z(p.z) };
  for (let z = 0; z < sub.h; z++) for (let x = 0; x < sub.w; x++) { const i = ZC(z) * w + x0 + x, j = z * sub.w + x; L.cells[i] = sub.cells[j]; L.paint[i] = sub.paint[j]; }
  for (const p of sub.props) {
    if (LIT_PROPS.has(p.t) || (p.t === 'kit' && LIT_PROPS.has(p.m))) continue;
    const q = { ...p, x: x0 + p.x, z: Z(p.z), stamp: o.kind };
    if (p.r != null) q.r = RT(p.r);
    L.props.push(q);
  }
  const rec = {
    kind: o.kind, seed: o.seed, x0, z0, w: sub.w, h: sub.h, flipZ: flip,
    rooms: (sub.rooms || []).map((r) => ({ ...r, x: x0 + r.x, z: flip ? z0 + sub.h - (r.z + r.h) : z0 + r.z })),
    trail: (sub.trail || []).map(P), clearings: (sub.clearings || []).map(P),
    walls: (sub.walls || []).map((wl) => ({ x: x0 + wl.x, z: Z(wl.z), r: RT(wl.r), m: wl.m })),
    start: P(sub.start), boss: P(sub.boss)
  };
  L.stamps.push(rec);
  return rec;
}
// a crypt for the barrow: its own reach from its stairs to every room, and a leaf room (a free room with one way in), else
// redrawn with seed + 1
function barrowSub(seed, n = 10) {
  for (let k = 0; k < n; k++) {
    const sd = ((seed ^ 0xB0770) >>> 0) + k, sub = genCrypt(sd, { mw: 14, mh: 26, rooms: 6 });
    if (sub.w !== 42 || sub.h !== 78) continue;
    const R = reach(sub, sub.start.x, sub.start.z);
    if (!sub.rooms.every((r) => nearReach(sub, R, r.x + r.w / 2, r.z + r.h / 2, 5) < 4)) continue;
    const leaf = leafRoom(sub);
    if (leaf) return { sub, leaf, k, sd };
  }
  return null;
}
// the crypt's smallest free room joined to the rest by one corridor (one floor macro cell against its outside), with the
// side that corridor comes in by
function leafRoom(sub) {
  const S = sub.macro || 3, MW = sub.w / S, MH = sub.h / S;
  const mf = (mx, mz) => { if (mx < 0 || mz < 0 || mx >= MW || mz >= MH) return false; for (let dz = 0; dz < S; dz++) for (let dx = 0; dx < S; dx++) if (sub.cells[(mz * S + dz) * sub.w + mx * S + dx]) return true; return false; };
  let best = null;
  for (const r of sub.rooms) {
    if (r.kind !== 'room') continue;
    const rx = r.x / S, rz = r.z / S, rw = r.w / S, rh = r.h / S, doors = [];
    for (let mx = rx; mx < rx + rw; mx++) { if (mf(mx, rz - 1)) doors.push({ side: 'n', mx, mz: rz - 1 }); if (mf(mx, rz + rh)) doors.push({ side: 's', mx, mz: rz + rh }); }
    for (let mz = rz; mz < rz + rh; mz++) { if (mf(rx - 1, mz)) doors.push({ side: 'w', mx: rx - 1, mz }); if (mf(rx + rw, mz)) doors.push({ side: 'e', mx: rx + rw, mz }); }
    if (doors.length === 1 && (!best || r.w * r.h < best.room.w * best.room.h)) best = { room: r, door: doors[0] };
  }
  return best;
}
// a wood for the drowned wood: its own reach from its road end to the hollow, and room for Leif's clearing (r 4) and the
// glade (r 5) 8-15 m off its trail at about a third and two thirds of it, inside its frame (the clearings in its own
// coordinates, carved by tryBottom), else redrawn with seed + 1
function woodSub(seed, n = 10) {
  for (let k = 0; k < n; k++) {
    const sd = ((seed ^ 0xF0E57) >>> 0) + k, sub = genForest(sd, { w: 42, h: 78 });
    if (sub.w !== 42 || sub.h !== 78 || sub.trail?.length < 12) continue;
    const R = reach(sub, sub.start.x, sub.start.z);
    if (nearReach(sub, R, sub.boss.x, sub.boss.z, 4) >= 3) continue;
    const rng = RNG((sd ^ 0x1eaf) >>> 0), leif = offTrail(sub, 1 / 3, 4, rng, []), glade = leif && offTrail(sub, 2 / 3, 5, rng, [leif]);
    if (glade) return { sub, k, sd, leif, glade };
  }
  return null;
}
// a clearing of r 8-15 m off the trail near t of its length, on either side, inside the wood's frame, clear of the trail,
// the road end, the hollow and the clearings taken; with the trail point it hangs from
function offTrail(sub, t, r, rng, taken) {
  const tr = sub.trail, i0 = Math.round((tr.length - 1) * t);
  for (let k = 0; k < 160; k++) {
    const i = clamp(i0 + rng.int(-6, 6), 1, tr.length - 2), p = tr[i], q = tr[i + 1], a = Math.atan2(q.x - p.x, q.z - p.z) + rng.sign() * Math.PI / 2 + rng.range(-0.6, 0.6);
    const c = toward(p, a, rng.range(8, 15));
    if (c.x - r < 3.5 || c.x + r > sub.w - 3.5 || c.z - r < 4 || c.z + r > sub.h - 4) continue;
    if (hyp(c, sub.boss) < 13.5 + r + 1.5 || hyp(c, sub.start) < 6.5 + r + 1.5 || taken.some((g) => hyp(g, c) < g.r + r + 3)) continue;
    if (tr.some((u) => hyp(u, c) < r + 1.5)) continue;
    return { x: c.x, z: c.z, r, from: { x: p.x, z: p.z } };
  }
  return null;
}
// the village's houses (pack-village's, the KayKit ones standing in), their footprint half sizes
const HOUSE6 = [['hHall', 'building_tavern_blue', 4.6, 2.9], ['hLong', 'building_home_B_yellow', 4.3, 1.8], ['hInn', 'building_tavern_blue', 5.6, 2.8], ['hTall', 'building_home_A_red', 1.1, 1.7],
  ['hMarket', 'building_market_red', 3.0, 2.6], ['hManor', 'building_home_A_green', 3.4, 3.4], ['hStilt', 'building_home_B_yellow', 1.6, 3.8], ['hTall', 'building_tower_A_red', 1.1, 1.7]];
const LOST7 = ['galini', 'twins', 'kranea', 'psamathe', 'sailor', 'asger', 'leif'];

function tryBottom(seed, last) {
  const rng = RNG(seed), w = 104, h = 200, N = w * h;
  const L = underIce(base(w, h), 'bottom', seed, 'dark'), S = L.spots;
  Object.assign(L, { stamps: [], walls: [] });
  Object.assign(S, { pots: [], lamps: [], houses: [], chores: [], lures: [], casks: [], voices: [], vaults: [] });
  // ---- the windows first (their cells straight into L.cells; the parent's own carving is drawn over them in K) ----
  const B0 = barrowSub(seed, last ? 80 : 10), W0 = woodSub(seed, last ? 80 : 10);
  if (!B0 || !W0) return fail(B0 ? 'wood' : 'crypt');
  const CR = stamp(L, B0.sub, 6, 28, { flipZ: true, kind: 'crypt', seed: B0.sd }), WD = stamp(L, W0.sub, 56, 28, { flipZ: true, kind: 'forest', seed: W0.sd });
  const subCells = L.cells.slice();
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), res = new Uint8Array(N), keep = new Uint8Array(N), win = new Uint8Array(N), wayM = new Uint8Array(N);
  for (let i = 0; i < N; i++) K[i] = L.cells[i] ? LAND : ROCK;
  for (const [rc, id] of [[CR, 1], [WD, 2]]) for (let z = rc.z0; z < rc.z0 + rc.h; z++) for (let x = rc.x0; x < rc.x0 + rc.w; x++) win[z * w + x] = id;
  const { blockC, blockR, free, reserve, paintAt } = makeDraw(L, K, blk, res, rng);
  const put = (cx, cz, r, k) => { for (const [x, z] of circleCells(L, cx, cz, r)) K[z * w + x] = k; };
  const mark = (m, cx, cz, r, v = 1) => { for (const [x, z] of circleCells(L, cx, cz, r)) m[z * w + x] = v; };
  const allK = (x, z, r, ok) => circleCells(L, x, z, r).every(([cx, cz]) => ok(cz * w + cx));
  const ways = [];
  const way = (pts, r, paint = 0.9, amp = 1.5, sd = 0) => { const pp = wander(pts, amp, seed + 31 + sd, 0.5); for (const p of pp) { put(p.x, p.z, r, LAND); mark(keep, p.x, p.z, r); mark(wayM, p.x, p.z, r); if (paint) paintAt(p.x, p.z, r * 0.7, paint); } ways.push(...pp); return pp; };
  // ---- the landmarks ----
  const CP = { x: snap(52 + rng.range(-4, 4)), z: snap(16 + rng.range(-2, 2)), r: 8 };
  const VC = { x: snap(52 + rng.range(-4, 4)), z: snap(126 + rng.range(-3, 3)) };
  const HX = Math.round(52 + rng.range(-4, 4)), HZ = Math.round(176 + rng.range(-1, 1)), HC = { x: HX, z: HZ, r: 14 };
  const SX = HX;
  // ---- the windows' doors: the barrow's stairs room and the wood's road end, both facing the Well; their south doors ----
  const cDoor = { x: CR.x0 + 21, z: CR.z0 + 6 }, wDoor = { x: WD.start.x, z: Math.max(WD.z0 + 3, WD.start.z - 2) };
  CR.door = { ...cDoor }; WD.door = { ...wDoor };
  const throne = CR.rooms.find((r) => r.kind === 'boss'), hollow = WD.boss;
  const side = rng.sign(), cSouth = { x: throne.x + throne.w / 2 + side * 6, z: throne.z + throne.h - 1.5 };
  CR.end = { x: throne.x + throne.w / 2, z: throne.z + throne.h / 2 }; WD.end = { x: hollow.x, z: hollow.z };
  // ---- the parent's floor: the camp, the road to both doors, the village, the Stair, the Hearth ----
  put(CP.x, CP.z, CP.r, LAND); mark(keep, CP.x, CP.z, CP.r);
  const fork = { x: CP.x, z: CP.z + 7 };
  way([fork, { x: (fork.x + cDoor.x) / 2, z: 24 }, { x: cDoor.x, z: 24.5 }, { x: cDoor.x, z: cDoor.z + 1.5 }], 1.7, 1, 1.5, 1);
  way([fork, { x: (fork.x + wDoor.x) / 2, z: 24 }, { x: wDoor.x, z: 24.5 }, { x: wDoor.x, z: wDoor.z + 1.5 }], 1.7, 1, 1.5, 2);
  // the village: an oval of floor round its square
  for (let z = Math.floor(VC.z - 17); z <= VC.z + 17; z++) for (let x = Math.floor(VC.x - 26); x <= VC.x + 26; x++) {
    const u = (x + 0.5 - VC.x) / 22, v = (z + 0.5 - VC.z) / 13.5;
    if (u * u + v * v < 0.84 + 0.34 * fbm(x * 0.08, z * 0.08, seed + 33)) K[z * w + x] = LAND;
  }
  // the windows' south doors, cut down to the village (the barrow's beside the old throne, the wood's from the hollow)
  const cS = way([cSouth, { x: cSouth.x, z: CR.z0 + CR.h + 1 }, { x: VC.x - 15 + rng.range(-2, 2), z: VC.z - 6 }], 1.6, 0.7, 1.2, 3);
  const bdz = WD.z0 + WD.h - 4;
  const wS = way([{ x: hollow.x, z: hollow.z + 8 }, { x: hollow.x, z: bdz + 2 }, { x: VC.x + 15 + rng.range(-2, 2), z: VC.z - 6 }], 1.6, 0.7, 1.2, 4);
  CR.south = { ...cSouth }; WD.south = { x: hollow.x, z: bdz };
  // the Stair: 14 cells wide at its head (its three walls), its terraces widening onto the Hearth's north rim
  const st0 = 144, st1 = 161;
  way([{ x: VC.x, z: VC.z + 8 }, { x: SX, z: st0 + 1 }], 2.6, 0.6, 1, 5);
  for (let z = st0 - 2; z < HZ - 11; z++) { const hw = z < 153 ? 7 : Math.min(7 + (z - 153) * 0.55, 11); for (let x = Math.floor(SX - hw); x < SX + hw; x++) K[z * w + x] = LAND; }
  for (let k = 0; k < 3; k++) { const cells = []; for (let z = st0 + k * 3; z < st0 + k * 3 + 3; z++) for (let x = SX - 7; x < SX + 7; x++) cells.push([x, z]); L.walls.push({ k, cells }); }
  for (const wl of L.walls) for (const [x, z] of wl.cells) keep[z * w + x] = wayM[z * w + x] = 1;
  // the Hearth: a dry bowl
  put(HC.x, HC.z, HC.r, LAND);
  // ---- inside the windows: the barrow's black water (its ante-room and one free room not the ember's), the wood's over
  // all its floor but the trail, the clearings and the hollow's heart ----
  const roomCells = (r) => { const out = []; for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) out.push(z * w + x); return out; };
  const leafR = CR.rooms[B0.sub.rooms.indexOf(B0.leaf.room)];
  const wetRooms = [CR.rooms.find((r) => r.kind === 'ante'), rng.shuffle(CR.rooms.filter((r) => r.kind === 'room' && r !== leafR))[0]].filter(Boolean);
  for (const r of wetRooms) for (const i of roomCells(r)) if (K[i] === LAND && !keep[i]) { K[i] = FLAT; bed[i] = Q(clamp(0.3 + 0.3 * fbm((i % w) * 0.3, Math.floor(i / w) * 0.3, seed + 35), 0.3, 0.6)); }
  // Leif's clearing and the glade, 8-15 m off the trail at about a third and two thirds of it, inside the window's frame
  const tr = WD.trail;
  const carve = (g, k) => {
    const c = { x: WD.x0 + g.x, z: WD.z0 + WD.h - g.z, r: g.r }, p = { x: WD.x0 + g.from.x, z: WD.z0 + WD.h - g.from.z };
    put(c.x, c.z, c.r, LAND); mark(keep, c.x, c.z, c.r + 0.3); mark(wayM, c.x, c.z, c.r);
    way([p, c], 1.2, 0.6, 0.8, 6 + k);
    return c;
  };
  S.leif = carve(W0.leif, 0); S.glade = carve(W0.glade, 1);
  S.leif.fire = { x: S.leif.x, z: S.leif.z };
  for (const t of tr) mark(keep, t.x, t.z, 2.1);
  mark(keep, WD.start.x, WD.start.z, 6.5); mark(keep, hollow.x, hollow.z, 8);
  for (const c of WD.clearings) mark(keep, c.x, c.z, c.r);
  // (most of it: a few rises stay dry, where the drowned trees stand highest)
  for (let i = 0; i < N; i++) if (win[i] === 2 && K[i] === LAND && !keep[i] && fbm((i % w) * 0.11, Math.floor(i / w) * 0.11, seed + 45) < 0.66) { K[i] = FLAT; bed[i] = Q(clamp(0.3 + 0.45 * fbm((i % w) * 0.09, Math.floor(i / w) * 0.09, seed + 37), 0.3, 0.75)); }
  // ---- the village: the square's sunken well, Keyx's pocket by it, six to eight houses tilted and sunk round it ----
  const wellV = { x: VC.x, z: VC.z };
  blockC(wellV.x, wellV.z, 1.3); reserve(wellV.x, wellV.z, 3.4);
  L.props.push({ t: 'well', x: wellV.x, z: wellV.z, r: rng.range(0, 6.28), sunk: true });
  {
    const a = rng.range(0, 6.28), pc = toward(wellV, a, 6);
    for (const [x, z] of circleCells(L, pc.x, pc.z, 4)) { const i = z * w + x; if (K[i] === LAND && !keep[i]) { K[i] = FLAT; bed[i] = 0.3; } }
    const kx = toward(wellV, a + Math.PI * 0.6, 2.4);
    S.keyx = { x: kx.x, z: kx.z, well: { x: wellV.x, z: wellV.z }, pool: { x: pc.x, z: pc.z, r: 4 } };
    reserve(kx.x, kx.z, 1.6); mark(keep, pc.x, pc.z, 4.5);
  }
  {
    const want = rng.int(6, 8);
    for (let t = 0; t < 400 && S.houses.length < want; t++) {
      const [m, kit, hw, hd] = HOUSE6[rng.int(0, HOUSE6.length - 1)], a = rng.range(0, 6.28), d = rng.range(10, 19), c = toward(wellV, a, d);
      const rot = Math.atan2(wellV.x - c.x, wellV.z - c.z);
      if (!rectCells(L, c.x, c.z, hw + 0.8, hd + 0.8, rot).every(([x, z]) => x >= 0 && K[z * w + x] === LAND && !keep[z * w + x] && !blk[z * w + x] && !res[z * w + x])) continue;
      const tilt = rng.range(0.07, 0.21), sink = rng.range(0.3, 0.8);
      blockR(c.x, c.z, hw, hd, rot); reserve(c.x, c.z, Math.max(hw, hd) + 0.6);
      S.houses.push({ x: c.x, z: c.z, rot, tilt, sink, m });
      L.props.push({ t: 'bld', m, kit, x: c.x, z: c.z, r: rot, hw, hd, tilt, sink, house: S.houses.length - 1 });
    }
    if (S.houses.length < 6 && !last) return fail('houses');
    for (let t = 0, n = 0; t < 120 && n < 5; t++) {
      const c = toward(wellV, rng.range(0, 6.28), rng.range(5, 18)), kind = rng.pick(['cart', 'stake', 'stake']);
      if (!allK(c.x, c.z, 1.3, (i) => K[i] === LAND && !keep[i] && !blk[i] && !res[i])) continue;
      if (kind === 'cart') { L.props.push({ t: 'cart', x: c.x, z: c.z, r: rng.range(0, 6.28), tilt: rng.range(0.1, 0.3) }); blockC(c.x, c.z, 0.8); }
      else { const a = rng.range(0, 6.28); for (let k = -2; k <= 2; k++) L.props.push({ t: 'stake', x: c.x + Math.sin(a) * k * 0.9, z: c.z + Math.cos(a) * k * 0.9, r: rng.range(0, 6.28), s: rng.range(0.8, 1), tilt: rng.range(0, 0.4) }); }
      reserve(c.x, c.z, 1.8); n++;
    }
  }
  // ---- the Stair's pools on its terraces; the Hearth: her stone and fire (2 x 2), the stones, the niches, the pools, the
  // casks, the Gate ring ----
  S.stair = { z0: st0, z1: st1 - 1, pools: [], foot: { x: SX, z: st1 - 1 } };
  for (const sx of rng.shuffle([-1, 1])) {
    const p = { x: snap(SX + sx * rng.range(3.5, 5.5)), z: snap(rng.range(155, 158)), r: 2.5 };
    for (const [x, z] of circleCells(L, p.x, p.z, 2.5)) { const i = z * w + x; if (K[i] === LAND) { K[i] = FLAT; bed[i] = 0.6; } }
    S.stair.pools.push(p);
  }
  const H = { x: HX, z: HZ, r: 14, fire: { x: HX, z: HZ }, first: { x: HX + 1.9, z: HZ + 0.7, rot: -Math.PI / 2 }, stones: [], niches: [], pools: [], casks: [], ring: { x: HX, z: HZ + 11, rot: Math.PI } };
  for (const [x, z] of [[HX - 1, HZ - 1], [HX, HZ - 1], [HX - 1, HZ], [HX, HZ]]) blk[z * w + x] = 1;
  reserve(HX, HZ, 2.6);
  for (let i = 0; i < 4; i++) { const p = toward(HC, Math.PI / 4 + i * Math.PI / 2, 9); H.stones.push({ i, x: p.x, z: p.z }); blockC(p.x, p.z, 0.5); reserve(p.x, p.z, 1.6); }
  for (const sx of [-1, 1]) {
    const p = toward(HC, Math.PI - sx * 0.45, 12.5);
    H.pools.push({ x: p.x, z: p.z, r: 4 });
    for (const [x, z] of circleCells(L, p.x, p.z, 4)) { const i = z * w + x, d = Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z); if (K[i] === LAND && hyp(HC, { x: x + 0.5, z: z + 0.5 }) < HC.r && !res[i]) { K[i] = FLAT; bed[i] = Q(0.3 + 0.45 * d / 4); } }
  }
  {
    // (seven niches round the rim at r 13, clear of the Stair's mouth, the pools and the ring)
    const angs = [];
    for (let k = 0; k < 7; k++) { const sd = k % 2 ? -1 : 1, j = k >> 1; angs.push(sd * (0.42 + (j + (sd < 0 ? 0.5 : 0)) * (1.7 / 3.5))); }
    angs.sort((a, b) => a - b).forEach((a, k) => { const p = toward(HC, a, 13); H.niches.push({ id: LOST7[k], x: p.x, z: p.z }); });
  }
  for (let i = 0; i < 4; i++) { const p = toward(HC, i * Math.PI / 2, 6); H.casks.push({ x: p.x, z: p.z }); }
  S.hearth = H; S.casks = H.casks;
  // ---- the camp: the Well's foot, the waypoint, the fire-pit, Glaukos ----
  S.camp = CP; S.well = { x: CP.x, z: CP.z - 4 }; S.waypoint = { x: CP.x + 3.5, z: CP.z + 1.5 }; S.pit = { x: CP.x - 3, z: CP.z + 1.5 };
  S.npcs = { glaukos: { x: S.pit.x - 1.6, z: S.pit.z + 0.8, rot: 1.2 } };
  blockC(S.pit.x, S.pit.z, 0.9); reserve(CP.x, CP.z, CP.r - 1);
  L.start = { x: CP.x, z: CP.z + 2 };
  L.boss = { x: HX, z: HZ, r: 14 };
  L.exits.push({ x: S.well.x, z: S.well.z, to: 'drained', label: 'exit.well' }, { x: H.ring.x, z: H.ring.z, to: 'town', at: 'staff', label: 'exit.gateUp', locked: 'herFire' });
  // ---- the black lamps: before the barrow's south door, in the hollow, in Keyx's hand ----
  S.lamps.push({ k: 0, x: cSouth.x, z: cSouth.z - 2.2, place: 'barrow', wall: 0 }, { k: 1, x: hollow.x, z: hollow.z + 4, place: 'wood', wall: 1 }, { k: 2, x: S.keyx.x, z: S.keyx.z, place: 'village', wall: 2 });
  for (const l of S.lamps.slice(0, 2)) reserve(l.x, l.z, 1.6);
  // ---- the ember: a pane of clear ice on the far wall of the barrow's smallest leaf room ----
  {
    const r = leafR, d = B0.leaf.door.side, flipS = { n: 's', s: 'n', e: 'e', w: 'w' }[d], far = { n: 's', s: 'n', e: 'w', w: 'e' }[flipS];
    const cx = r.x + r.w / 2, cz = r.z + r.h / 2, pane = far === 'n' ? { x: cx, z: r.z + 0.7, rot: 0 } : far === 's' ? { x: cx, z: r.z + r.h - 0.7, rot: Math.PI } : far === 'w' ? { x: r.x + 0.7, z: cz, rot: Math.PI / 2 } : { x: r.x + r.w - 0.7, z: cz, rot: -Math.PI / 2 };
    S.ember = { x: cx, z: cz, pane };
    reserve(pane.x, pane.z, 1.2);
  }
  // ---- the frame ----
  for (let i = 0; i < N; i++) { const x = i % w, z = (i - x) / w; if ((x < MARGIN || z < MARGIN || x >= w - MARGIN || z >= h - MARGIN) && K[i] !== ROCK) { if (!last) return fail('frame'); K[i] = ROCK; } }
  // ---- the grid: the barrow's rock no higher than its walls, the wood's ground low under its trees ----
  finish6(L, K, bed, blk, null, {
    top: (vx, vz) => { const i = clamp(vz, 0, h - 1) * w + clamp(vx, 0, w - 1); return win[i] === 1 ? 2.3 + 0.6 * fbm(vx * 0.2, vz * 0.2, seed + 39) : 8 + 8 * fbm(vx * 0.05, vz * 0.05, seed + 41); },
    post: (Hh) => { const W = w + 1; for (let vz = WD.z0 + 1; vz < WD.z0 + WD.h; vz++) for (let vx = WD.x0 + 1; vx < WD.x0 + WD.w; vx++) if (Hh[vz * W + vx] > 0) Hh[vz * W + vx] = 0.15 + 0.25 * fbm(vx * 0.2, vz * 0.2, seed + 43); }
  });
  // the stamped props on a way or clearing the parent cut (a wall across the barrow's doors, a tree on a new path) are gone
  L.props = L.props.filter((p) => { if (!p.stamp) return true; const i = Math.floor(p.z) * w + Math.floor(p.x); return !(wayM[i] || (K[i] !== ROCK && !subCells[i])); });
  // ---- the build's lights: the fire-pit at the camp, her fire at the Hearth's centre, then Glaukos's fire-pots for the
  // 15 m rule ----
  const fire = (x, z, o = {}) => {
    plug(L, x, z, o.pot ? 0.4 : 0.9); reserve(x, z, 1.6);
    L.props.push({ t: o.pot ? 'brazier' : 'firepit', x, z, ...o });
    L.lights.push({ x, y: o.pot ? 1.1 : 1.2, z, color: 0xff9a50, intensity: o.pot ? 12 : 22, range: o.pot ? 7 : 12, flicker: 0.35 });
  };
  fire(S.pit.x, S.pit.z, { camp: true });
  // (her fire on the blocked 2 x 2 at the centre burns from the build: build6.js story6 draws it, so no prop here, only its
  // light, the design's true light of r 5 in the pooled lights with the camp's and the pots', its tremble the true light's
  // (gfx.js, steady with 'reduce flicker'). The 15 m rule counts it, as an arena counts its own lights)
  L.lights.push({ x: H.fire.x, y: 1.4, z: H.fire.z, color: 0xff9a50, intensity: 22, range: 10, flicker: 'tremble', centre: true });
  // ---- the packs ----
  const wallsOpen = L.cells.slice();
  for (const wl of L.walls) for (const [x, z] of wl.cells) L.cells[z * w + x] = 0;
  const R0 = reach(L, L.start.x, L.start.z, walk6(L, 0)), R1 = reach(L, L.start.x, L.start.z, walk6(L, HIGH6));
  L.cells.set(wallsOpen);
  const RO = reach(L, L.start.x, L.start.z, walk6(L, HIGH6));
  const packAt = (p, o) => L.packs.push({ x: p.x, z: p.z, n: o.n, tag: o.tag, elite: o.elite !== undefined ? o.elite : rng.chance(0.15) ? 'champion' : null, ...o.x0 });
  const apart = (p, gap) => !L.packs.some((q) => hyp(q, p) < gap);
  const dryR = (p, R) => { const i = Math.floor(p.z) * w + Math.floor(p.x); return R[i] && dryAt(L, p.x, p.z); };
  {
    // the Gate-Fallen in the barrow's dry rooms and halls, their Captain by the first lamp
    const rooms = rng.shuffle(CR.rooms.filter((r) => r.kind === 'room' && r !== leafR && !wetRooms.includes(r)));
    for (const r of rooms.slice(0, 2)) { const p = spotNear(L, r.x + r.w / 2, r.z + r.h / 2, 3, (i) => R1[i] && dryAt(L, i % w + 0.5, Math.floor(i / w) + 0.5)); if (p) packAt(p, { n: rng.int(4, 6), tag: 'gateFallen', x0: { dormant: true } }); }
    for (let t = 0, n = 0; t < 200 && n < 2; t++) {
      const x = rng.int(CR.x0 + 3, CR.x0 + CR.w - 4), z = rng.int(CR.z0 + 10, CR.z0 + CR.h - 26), p = { x: x + 0.5, z: z + 0.5 };
      if (!dryR(p, R1) || CR.rooms.some((r) => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.h) || !apart(p, 9)) continue;
      packAt(p, { n: rng.int(2, 4), tag: 'gateFallen', elite: null, x0: { dormant: true } }); n++;
    }
    const cap = spotNear(L, S.lamps[0].x, S.lamps[0].z - 3.5, 3, (i) => R1[i] && dryAt(L, i % w + 0.5, Math.floor(i / w) + 0.5));
    if (cap) packAt(cap, { n: rng.int(4, 6), tag: 'gateFallen', elite: 'rare', x0: { dormant: true, guard: 0 } });
    // the wood: the drowned Faded on the trail, lure posts on two of its bends, a pool hunter in its water, the matriarch
    for (const t of [0.25, 0.55, 0.8]) { const q = tr[Math.round((tr.length - 1) * t)], p = q && spotNear(L, q.x, q.z, 2.5, (i) => R1[i]); if (p && apart(p, 8)) packAt(p, { n: rng.int(4, 5), tag: 'drownedWood' }); }
    const bends = [];
    for (let i = 4; i < tr.length - 4; i++) { const a0 = Math.atan2(tr[i].x - tr[i - 4].x, tr[i].z - tr[i - 4].z), a1 = Math.atan2(tr[i + 4].x - tr[i].x, tr[i + 4].z - tr[i].z); bends.push({ i, k: Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0))) }); }
    bends.sort((a, b) => b.k - a.k);
    for (const b of bends) {
      if (S.lures.length >= 2) break;
      const p = tr[b.i];
      if (S.lures.some((l) => hyp(l, p) < 12) || hyp(p, hollow) < 16 || [S.leif, S.glade].some((g) => g && hyp(g, p) < g.r + 3)) continue;
      const q = tr[b.i + 1], a = Math.atan2(q.x - p.x, q.z - p.z) + rng.sign() * Math.PI / 2, post = toward(p, a, 2.6);
      const c = Math.floor(post.z) * w + Math.floor(post.x);
      if (!L.cells[c] || res[c]) continue;
      plug(L, post.x, post.z, 0.35); reserve(post.x, post.z, 1.8);
      const bait = toward(p, a + Math.PI, 0.8);
      S.lures.push({ x: post.x, z: post.z, bait });
      packAt(spotNear(L, bait.x, bait.z, 2, (i) => R0[i]) || bait, { n: rng.int(2, 3), tag: 'lures', elite: null });
    }
    {
      const c = rng.shuffle(Array.from({ length: N }, (_, i) => i).filter((i) => win[i] === 2 && L.pocket[i] && L.bed[i] <= 0.45 && R0[i]))[0];
      if (c !== undefined) packAt({ x: c % w + 0.5, z: Math.floor(c / w) + 0.5 }, { n: 3, tag: 'poolHunter', elite: null, x0: { tide: true } });
    }
    const mat = spotNear(L, hollow.x, hollow.z, 4, (i) => R1[i] && dryAt(L, i % w + 0.5, Math.floor(i / w) + 0.5));
    if (mat) packAt(mat, { n: 3, tag: 'lures', elite: 'rare', x0: { guard: 1, matriarch: true } });
    // the village: the Faded at their chores, the Elder (with a Lampbearer) by the well
    for (let t = 0, n = 0; t < 200 && n < 2; t++) {
      const p = toward(wellV, rng.range(0, 6.28), rng.range(7, 16)), c = { x: snap(p.x), z: snap(p.z) };
      if (!dryR(c, R1) || res[Math.floor(c.z) * w + Math.floor(c.x)] || !apart(c, 9)) continue;
      packAt(c, { n: rng.int(4, 5), tag: 'forgotten', x0: { dormant: true, chores: true } }); n++;
    }
    const eld = spotNear(L, wellV.x, wellV.z + 3.5, 3, (i) => R1[i] && dryAt(L, i % w + 0.5, Math.floor(i / w) + 0.5) && !res[i]);
    if (eld) packAt(eld, { n: 3, tag: 'forgotten', elite: 'rare', x0: { dormant: true, chores: true, guard: 2 } });
    for (const p of L.packs.filter((q) => q.tag === 'forgotten')) for (let k = 0; k < 2; k++) {
      const c = spotNear(L, p.x + rng.range(-2.5, 2.5), p.z + rng.range(-2.5, 2.5), 2, (i) => dryAt(L, i % w + 0.5, Math.floor(i / w) + 0.5));
      if (c) S.chores.push({ x: c.x, z: c.z, rot: rng.range(0, 6.28), clip: rng.pick(['hammer', 'kneel', 'fold', 'talk']) });
    }
    // the Stair's crew on its terraces
    const sc = spotNear(L, SX, 156, 4, (i) => RO[i] && dryAt(L, i % w + 0.5, Math.floor(i / w) + 0.5));
    if (sc) packAt(sc, { n: rng.int(4, 5), tag: 'stairCrew' });
  }
  // ---- Glaukos's fire-pots: every pack and black lamp within 15 m of a light that burns from the build ----
  {
    const wayAt = (x, z) => { let b = 1e9; for (const p of ways) b = Math.min(b, Math.abs(p.x - x) + Math.abs(p.z - z)); for (const p of tr) b = Math.min(b, Math.abs(p.x - x) + Math.abs(p.z - z)); return b; };
    const okPot = (x, z) => free(x, z, 0.8) && hyp(HC, { x, z }) > HC.r + 1 && !S.lamps.some((q) => hyp(q, { x, z }) < 2.5) && !L.packs.some((q) => hyp(q, { x, z }) < 2.5) && hyp(S.ember, { x, z }) > 2 && !wayM[Math.floor(z) * w + Math.floor(x)] && !tr.some((t) => hyp(t, { x, z }) < 1.5);
    lightUp(L, [...S.lamps, ...L.packs], RO, wayAt, okPot, (x, z) => { S.pots.push({ x, z }); fire(x, z, { pot: true }); });
  }
  // ---- the vault over the village square and the Hearth's east and west thirds; the place voices ----
  vaultPatch(L, wellV.x, wellV.z, 5.5);
  for (const sx of [-1, 1]) vaultPatch(L, HX + sx * 9.5, HZ + 1, 4);
  S.voices.push({ x: fork.x, z: fork.z + 2, r: 6, key: 'd.skotos6.w5' }, { x: VC.x, z: VC.z - 6, r: 8, key: 'd.skotos6.w6' }, { x: SX, z: st1 - 2, r: 6, key: 'd.skotos6.w7' });
  // ---- the wading lanes: through each wet room of the barrow the shortest way stays wading at high water ----
  wadeLanes(L, [S.lamps[0], S.ember.pane, ...L.packs.filter((p) => !p.tide)]);
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let s = 0;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; s += x < 0 || z < 0 || x >= w || z >= h ? BED_DRY : L.bed[z * w + x]; }
    L.vbed[vz * (w + 1) + vx] = s / 4;
  }
  {
    const open = L.cells.slice();
    for (const wl of L.walls) for (const [x, z] of wl.cells) L.cells[z * w + x] = 0;
    L.refuges = refuges(L);
    const Wh = walk6(L, HIGH6);
    dryPockets(L, reach(L, L.start.x, L.start.z, Wh), Wh, HIGH6, true);
    L.cells.set(open);
  }
  L.dist = distField(L, 14);
  if (!last) { const f = bottomFaults(readBottom({ ...L, cells: L.cells.slice(), bed: L.bed.slice(), pocket: L.pocket.slice(), low: L.low.slice(), refuges: L.refuges.slice() }, 'dark')); if (f.length) return fail(f[0].replace(/[@.].*/, '')); }
  return L;
}
// for each target, the shortest way from the start at low water: every cell on it deep at high water is raised to wading
// (bed 0.6), so a wet room never shuts a place off (the corridors stay dry; the rooms' water stays black)
function wadeLanes(L, targets) {
  const { w, h } = L, N = w * h, W0 = walk6(L, 0), par = new Int32Array(N).fill(-1), s = Math.floor(L.start.z) * w + Math.floor(L.start.x);
  if (!W0[s]) return;
  const q = [s]; par[s] = s;
  for (let hd = 0; hd < q.length; hd++) { const i = q[hd], x = i % w, z = (i - x) / w; for (const [dx, dz] of N4) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < h && W0[n] && par[n] < 0) { par[n] = i; q.push(n); } } }
  for (const t of targets) {
    if (!t) continue;
    let best = -1, bd = 1e9;
    for (const [cx, cz] of circleCells(L, t.x, t.z, 2.5)) { const i = cz * w + cx; if (par[i] >= 0) { const d = Math.hypot(cx + 0.5 - t.x, cz + 0.5 - t.z); if (d < bd) { bd = d; best = i; } } }
    for (let i = best; i >= 0 && i !== s; i = par[i]) if (L.pocket[i] === 1 && wetAt(L.bed[i], HIGH6) === 2) L.bed[i] = 0.6;
  }
}
// does the Bottom hold (the design's reach checks, the shadow-walls as its reading has them; with them all opened in turn
// for the Stair and the Hearth)
export function bottomFaults(L) {
  const out = [], S = L.spots, { w } = L, far = (R, p, r = 2.2) => !p || nearReach(L, R, p.x, p.z) > r;
  if (L.ice) out.push('iceDefined');
  for (let i = 0; i < L.pocket.length; i++) if (L.pocket[i] && !(L.bed[i] < BED_DRY)) { out.push('pocketDry'); break; }
  if (nearFrame(L)) out.push('frame');
  const shut = L.cells.slice();
  for (const wl of L.walls) for (const [x, z] of wl.cells) shut[z * w + x] = 0;
  const W0 = walk6(L, 0, 0, shut), W1 = walk6(L, HIGH6, HIGH6, shut);
  const R0 = reach(L, L.start.x, L.start.z, W0), R1 = reach(L, L.start.x, L.start.z, W1);
  const H = S.hearth || {};
  const need = [S.camp, S.waypoint, ...S.lamps, S.ember?.pane, S.ember, S.leif?.fire, S.glade, S.keyx, ...S.pots, ...S.lures, ...L.exits.filter((e) => e.to !== 'town')];
  need.forEach((p, k) => { if (far(R0, p) || far(R1, p)) out.push('reach.' + k); });
  if (S.lamps.length !== 3 || !S.ember || !S.keyx || H.stones?.length !== 4 || H.niches?.length !== 7 || H.casks?.length !== 4 || H.pools?.length !== 2 || S.houses.length < 6) out.push('spots');
  for (const p of L.packs) if (p.tag !== 'stairCrew' && far(p.tide ? R0 : R1, p, 3.5)) out.push('reach.pack.' + p.tag);
  // the walls opened one by one: the Stair and the Hearth only once all three are
  const open = shut.slice();
  for (const wl of L.walls) {
    for (const [x, z] of wl.cells) open[z * w + x] = 1;
    const Ro = reach(L, L.start.x, L.start.z, walk6(L, HIGH6, HIGH6, open));
    if (wl !== L.walls[L.walls.length - 1] && !far(Ro, S.stair?.foot, 1.6)) out.push('wallLeaks');
  }
  for (const h of [0, HIGH6]) {
    const Ro = reach(L, L.start.x, L.start.z, walk6(L, h, h, open));
    if ([S.stair?.foot, ...(H.stones || []), ...(H.niches || []), H.ring, ...L.packs.filter((p) => p.tag === 'stairCrew')].some((p) => far(Ro, p))) out.push('reach.hearth');
    // her fire's ring of cells, and the Gate ring from it
    const c = nearFloor(L, H.fire.x + 1.5, H.fire.z, 2), Rc = c && reach(L, c.x, c.z, walk6(L, h, h, open));
    if (!Rc || far(Rc, H.ring) || [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5]].some(([dx, dz]) => far(Rc, { x: H.fire.x + dx, z: H.fire.z + dz }, 1))) out.push('reach.centre');
  }
  // what the story stands on, on dry ground (a footprint is: a stone, the pit)
  for (const p of [...S.lamps, ...(H.stones || []), ...(H.niches || []), S.camp, S.leif?.fire, ...S.pots, S.keyx, ...L.exits]) if (p && (!firm(L, p.x, p.z) || L.pocket[Math.floor(p.z) * w + Math.floor(p.x)])) { out.push('onWet'); break; }
  // the windows: each the size of its sub-layout, its door on the road from the camp; two dry clearings in the wood
  for (const r of L.stamps) { if (r.w !== 42 || r.h !== 78) out.push('window.size'); if (far(R1, r.door, 2) || far(R1, r.south, 2.5)) out.push('window.door'); }
  const clear = [S.leif, S.glade].filter((g) => g && circleCells(L, g.x, g.z, g.r - 0.6).every(([x, z]) => L.cells[z * w + x] && !L.pocket[z * w + x] || !L.cells[z * w + x] && L.bed[z * w + x] >= BED_DRY));
  if (clear.length < 2) out.push('clearings');
  const er = S.ember && L.stamps[0]?.rooms.find((r) => S.ember.x >= r.x && S.ember.x < r.x + r.w && S.ember.z >= r.z && S.ember.z < r.z + r.h);
  if (!er || er.kind !== 'room' || roomDoors(L, er) !== 1 || !dryAt(L, S.ember.x, S.ember.z)) out.push('noLeaf');
  // the wood's trail stays dry (its own props stand on it as they do in the Gates)
  for (const t of L.stamps[1]?.trail || []) { const i = Math.floor(t.z) * w + Math.floor(t.x); if (L.pocket[i]) { out.push('woodTrail'); break; } }
  // the 15 m rule (the Hearth counts its own centre fire), the arena's spacing, the refuges, the dry pockets
  const lights = buildLights(L);
  for (const p of [...L.packs, ...S.lamps]) if (!lights.some((l) => hyp(l, p) <= LIGHT_R)) { out.push('light'); break; }
  if (crowded([...(H.stones || []), ...(H.casks || [])])) out.push('arenaCrowded');
  for (let i = 0; i < L.pocket.length; i += 3) if (L.pocket[i] === 1 && !refugeNear(L, i % w + 0.5, Math.floor(i / w) + 0.5, 12)) { out.push('noRefuge'); break; }
  const Wo = walk6(L, HIGH6, HIGH6, open);
  out.push(...dryPockets(L, reach(L, L.start.x, L.start.z, Wo), Wo, HIGH6));
  return out;
}

// the rope hole on the Light's Skerry (a farlight layout, gen5 genFarlight): a firm walkable cell of its core, its 3 x 3
// round it walkable too, 2.5 m or more from the door-stone's interact (world.js act5Zone: the door's x + 1.2, z - 0.6) and 3
// m from Selna's pad, clear of the keepers' line and Tern's spot, nearest the core's north-west quarter. Only props and an
// exit interact stand there: no cell opens or closes, so no saved seed's layout changes. null: none (check-act6 fails it)
export function ropeSpot(L) {
  const S = L.spots, c = S?.core, d = S?.farLight?.door; if (!c || !d) return null;
  const door = { x: d.x + 1.2, z: d.z - 0.6 }, pad = S.selnaPad, keep = [...(S.npcs?.keepers || []), S.npcs?.tern, { x: d.x, z: d.z - 0.4 }].filter(Boolean);
  const want = { x: c.x - 2.5, z: c.z - 3 }, ok = (x, z) => x >= 0 && z >= 0 && x < L.w && z < L.h && !!L.cells[z * L.w + x] && firm(L, x + 0.5, z + 0.5);
  let best = null, bd = 1e9;
  for (const [x, z] of circleCells(L, c.x, c.z, c.r - 1.5)) {
    const px = x + 0.5, pz = z + 0.5;
    if (Math.hypot(px - door.x, pz - door.z) < 2.5 || (pad && Math.hypot(px - pad.x, pz - pad.z) < 3)) continue;
    if (keep.some((k) => Math.hypot(px - k.x, pz - k.z) < 1.8)) continue;
    let all = true;
    for (let dz = -1; dz <= 1 && all; dz++) for (let dx = -1; dx <= 1; dx++) if (!ok(x + dx, z + dz)) { all = false; break; }
    if (!all) continue;
    const dd = Math.hypot(px - want.x, pz - want.z);
    if (dd < bd) { bd = dd; best = { x: px, z: pz }; }
  }
  return best;
}
