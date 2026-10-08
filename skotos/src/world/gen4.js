// Act IV layouts as plain data: the Field of Ash (the Wayfarers' Road north of Whitecliff, from the Dark Beacon to the
// Anvil Gate) and the Ashen Forge (Karthax's forge, hollowed out of the mountain called the Black Anvil).
// Besides cells/paint they carry
//   L.low, L.lava   holes in the floor (they stop feet, not eyes or arrows): the Field's ember sinks (L.lowEmber is the
//                   same mask), the Forge's slag rivers and brood pools (lava), its casting pits and the Forge Mouth (holes)
//   L.hgt           the ground's height at every cell corner, (w + 1) x (h + 1): build.js lays the ground on it, and the
//                   props on the slopes stand on it (groundY)
// and the story spots of the Act IV contract (lamps, altars, banners, graves, gate, braziers, flues, bellows, plug, ...).
// Each generator retries until every place the story needs can be walked to (the Forge's Great Stair only through its plug).
import { RNG, clamp, fbm, angleDiff, smooth } from '../core/util.js';
import { base, carveCircle, carveLine, smoothCells, distField, blockCircle } from './gen.js';

// ---------- helpers ----------
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const cellAt = (L, x, z) => Math.floor(z) * L.w + Math.floor(x);
const isFloor = (L, x, z) => x >= 0 && z >= 0 && x < L.w && z < L.h && L.cells[cellAt(L, x, z)] === 1;
// floor cells reachable on foot from (x, z), 4-neighbour (the flow field never cuts corners: same connectivity)
export function reach(L, x, z, cells = L.cells) {
  const { w, h } = L, seen = new Uint8Array(w * h), s = Math.floor(z) * w + Math.floor(x);
  if (!cells[s]) return seen;
  const q = [s]; seen[s] = 1;
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], cx = i % w, cz = (i - cx) / w;
    for (const [dx, dz] of N4) { const nx = cx + dx, nz = cz + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && cells[n] && !seen[n]) { seen[n] = 1; q.push(n); } }
  }
  return seen;
}
// how far (x, z) is from the centre of the nearest reached cell (99: none within r)
export function nearReach(L, R, x, z, r = 4) {
  let b = 99;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz;
    if (cx >= 0 && cz >= 0 && cx < L.w && cz < L.h && R[cz * L.w + cx]) b = Math.min(b, Math.hypot(cx + 0.5 - x, cz + 0.5 - z));
  }
  return b;
}
function circleCells(L, cx, cz, r) {
  const out = [];
  for (let z = Math.floor(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++)
    if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= r && x >= 0 && z >= 0 && x < L.w && z < L.h) out.push([x, z]);
  return out;
}
const mark = (m, L, cx, cz, r) => { for (const [x, z] of circleCells(L, cx, cz, r)) m[z * L.w + x] = 1; };
// a cell with a hole among its 8 neighbours: some corner of it sinks with the hole (terrain), so it is no level floor
const nearLow = (L, i) => { const w = L.w; return [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1].some((o) => L.low[i + o]); };
// a chest's spot: the nearest free floor cell to (x0, z0) where the ground (L.hgt) is level under it and round it (0.8 m;
// else 0.5, else 0.3): not on the slope down to a hole or up to a wall; clear of `off` ({ x, z, r }); off the cells reserved in
// res, and reserved there (res may be null: a room that is all reserved). Or null
const level = (L, x, z, r) => [[0, 0], ...Array.from({ length: 8 }, (_, k) => [Math.sin(k * 0.785) * r, Math.cos(k * 0.785) * r])].every(([u, v]) => Math.abs(groundY(L, x + u, z + v)) < 0.06);
function chestSpot(L, res, x0, z0, off) {
  let best = null, bd = 1e9;
  for (const r of [0.8, 0.5, 0.3]) if (!best) for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
    const cx = x0 + dx, cz = z0 + dz, d = Math.hypot(dx, dz);
    if (d < bd && isFloor(L, cx, cz) && !res?.[cellAt(L, cx, cz)] && (!off || Math.hypot(cx - off.x, cz - off.z) > off.r) && level(L, cx, cz, r)) { bd = d; best = { x: cx, z: cz }; }
  }
  if (best && res) mark(res, L, best.x, best.z, 2);
  return best;
}
const snap = (v) => Math.floor(v) + 0.5;
// a trail walker steered toward (tx, tz), carving as it goes (never heading back south for long)
function walkTo(L, st, tx, tz, rng, trail, o) {
  const { rMin, rMax, paint = 1.7, wob = 0.2, seed } = o;
  for (let g = 0; g < 700; g++) {
    const d = Math.hypot(tx - st.x, tz - st.z);
    if (d < 2.5) break;
    const want = Math.atan2(tx - st.x, tz - st.z);
    st.ang += angleDiff(st.ang, want) * (d < 14 ? 0.3 : 0.1) + rng.range(-wob, wob);
    if (tz < st.z - 3 && Math.cos(st.ang) > 0.35) st.ang += angleDiff(st.ang, Math.PI) * 0.25;
    st.x = clamp(st.x + Math.sin(st.ang), 9, L.w - 9); st.z = clamp(st.z + Math.cos(st.ang), 9, L.h - 9);
    trail.push({ x: st.x, z: st.z });
    carveCircle(L, st.x, st.z, rMin + fbm(st.x * 0.06, st.z * 0.06, seed) * (rMax - rMin));
    if (paint) carveCircle(L, st.x, st.z, paint, 1);
  }
  const n = Math.ceil(Math.hypot(tx - st.x, tz - st.z));
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = st.x + (tx - st.x) * t, z = st.z + (tz - st.z) * t;
    trail.push({ x, z }); carveCircle(L, x, z, rMin); if (paint) carveCircle(L, x, z, paint, 1);
  }
  st.x = tx; st.z = tz;
}
// floor cells of a band across a passage (|along| <= ha, |across| <= hc), grown from p so it only cuts the passage it is in
function bandCells(L, p, ang, ha, hc) {
  const { w, h, cells } = L, fx = Math.sin(ang), fz = Math.cos(ang);
  const inBand = (x, z) => { const dx = x + 0.5 - p.x, dz = z + 0.5 - p.z; return Math.abs(dx * fx + dz * fz) <= ha && Math.abs(dx * fz - dz * fx) <= hc; };
  const s = cellAt(L, p.x, p.z), seen = new Set([s]), q = [s], out = [];
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], x = i % w, z = (i - x) / w;
    if (!cells[i] || !inBand(x, z)) continue;
    out.push([x, z]);
    for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && !seen.has(n)) { seen.add(n); q.push(n); } }
  }
  return out;
}
// which way the floor lies from a solid cell (rock faces turn toward it)
function toFloor(L, D, xx, zz) {
  let bx = 0, bz = 0;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const c = D[clamp(zz + dz, 0, L.h - 1) * L.w + clamp(xx + dx, 0, L.w - 1)]; if (c < D[zz * L.w + xx]) { bx += dx; bz += dz; } }
  return Math.atan2(bx, bz);
}
// the corners' heights: floor at 0, holes sunk, solid ground rising with its distance from the floor (rise(d, x, z, i))
function terrain(L, cells, D, rise) {
  const { w, h, low } = L, W = w + 1, H = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let fl = 0, hole = 0, dd = 0, n = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const x = vx + dx, z = vz + dz;
      if (x < 0 || z < 0 || x >= w || z >= h) { dd += 14; n++; continue; }
      const i = z * w + x;
      fl += cells[i]; hole += low[i]; dd += Math.min(D[i] === 255 ? 14 : D[i], 14); n++;
    }
    // (a corner sinks by how many of its cells are holes: the lava's edge then runs on the diagonals, not in steps)
    H[vz * W + vx] = hole ? -0.72 * (hole === 4 ? 1 : fl ? hole / 4 : 0.75 + hole * 0.06) : fl ? 0 : rise(dd / n, vx, vz);
  }
  return H;
}
// the ground's height under (x, z), the way build.js lays it: each cell is two triangles split from (x0, z0 + 1) to
// (x0 + 1, z0), as the ground plane's grid is
export function groundY(L, x, z) {
  const H = L.hgt; if (!H) return 0;
  const W = L.w + 1, x0 = clamp(Math.floor(x), 0, L.w - 1), z0 = clamp(Math.floor(z), 0, L.h - 1), fx = clamp(x - x0, 0, 1), fz = clamp(z - z0, 0, 1);
  const a = H[z0 * W + x0], b = H[z0 * W + x0 + 1], c = H[(z0 + 1) * W + x0], d = H[(z0 + 1) * W + x0 + 1];
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
// a straight walk from a to b stays on floor cells (patrol legs)
function clearLine(L, ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 3);
  for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); if (!isFloor(L, ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}

// ======================= ASHFIELD: the Field of Ash =======================
// South to north: the Dark Beacon (the camp, waypoint 1), the Wayfarers' Road with lamps 1-3 and the three side hollows
// of the Altars of the Wish, the Field of Three Banners to the west (the drake's bones), the Ember Flats to the east,
// the Lantern Graves in their gorge (Elati's camp and waypoint 2 at its mouth, lamps 4 and 5, Ivar's empty hook) and the
// Anvil Gate's round plaza against the cliff of the Black Anvil.
export function genAshfield(seed, o = {}) {
  for (let k = 0; k < 24; k++) { const L = tryAshfield(seed + k * 7919, o, k === 23); if (L) { L.seed = seed; return L; } }
  return null;
}
function tryAshfield(seed, o, last) {
  const rng = RNG(seed);
  const w = o.w || 112, h = o.h || 192, N = w * h;
  const L = base(w, h);
  L.type = 'ashfield'; L.seed = seed;
  L.low = new Uint8Array(N); L.lava = new Uint8Array(N); L.lowEmber = L.lava;
  const sp = L.spots;
  Object.assign(sp, { lamps: [], waylamps: [], altars: [], braziers: [], patrols: [], chests: [], shrines: [] });
  L.graveLanterns = []; L.gravePoles = []; L.banners = [];
  const res = new Uint8Array(N); // kept clear of dressing
  // ---- landmarks ----
  const S = { x: snap(w / 2 + rng.range(-8, 8)), z: h - 9 };
  const C = { x: S.x + rng.range(-3, 3), z: h - 23, r: 8.5 };
  const GP = { x: snap(clamp(w / 2 + rng.range(-10, 10), 30, w - 30)), z: 24.5, r: 14 };
  const GV = { x: snap(clamp(GP.x + rng.range(-8, 8), 26, w - 26)), z0: 80, z1: 41 };
  // the Field lies north-west of the Flats, so each leaves the road a stretch free on its own side for a hollow
  const FB = { x: rng.range(27, 30), z: rng.range(106, 110), hw: 19, hd: 16 };
  const EF = { x: rng.range(85, 88), z: rng.range(128, 133), r: 14 };
  const cs = rng.sign(); // the camp's beacon stands on this side of the fire, the waypoint on the other
  // ---- the Wayfarers' Road ----
  carveCircle(L, S.x, S.z, 5);
  carveLine(L, S.x, S.z, C.x, C.z, 3.2, 0.9);
  carveCircle(L, C.x, C.z, C.r);
  const road = [], st = { x: C.x, z: C.z - 4, ang: Math.PI };
  const RD = { rMin: 2.7, rMax: 4.3, paint: 1.7, wob: 0.16, seed };
  const go = (x, z) => walkTo(L, st, x, z, rng, road, RD);
  go(clamp(C.x + rng.range(-10, 10), 54, 68), 150);
  go(rng.range(57, 63), 128);
  go(rng.range(56, 64), 106);
  go(GV.x + rng.range(-5, 5), 92);
  go(GV.x, GV.z0 + 4);
  L.road = road;
  const arc = [0];
  for (let i = 1; i < road.length; i++) arc.push(arc[i - 1] + Math.hypot(road[i].x - road[i - 1].x, road[i].z - road[i - 1].z));
  if (!last && arc[arc.length - 1] < 78) return null;
  const idxAtZ = (z) => { let b = 0, bd = 1e9; road.forEach((t, i) => { if (Math.abs(t.z - z) < bd) { bd = Math.abs(t.z - z); b = i; } }); return b; };
  const tangent = (i) => { const a = road[Math.max(i - 2, 0)], b = road[Math.min(i + 2, road.length - 1)]; return Math.atan2(b.x - a.x, b.z - a.z); };
  // ---- the Field of Three Banners (west) and the Ember Flats (east), each joined to the road ----
  for (let z = Math.floor(FB.z - FB.hd - 3); z <= FB.z + FB.hd + 3; z++) for (let x = Math.max(3, Math.floor(FB.x - FB.hw - 3)); x <= Math.min(w - 4, FB.x + FB.hw + 3); x++) {
    const u = Math.abs(x + 0.5 - FB.x) / FB.hw, v = Math.abs(z + 0.5 - FB.z) / FB.hd;
    if (u ** 4 + v ** 4 < 1 + (fbm(x * 0.1, z * 0.1, seed + 3) - 0.5) * 0.6) L.cells[z * w + x] = 1;
  }
  for (const dz of [-FB.hd * 0.45, FB.hd * 0.5]) { const t = road[idxAtZ(FB.z + dz)]; carveLine(L, t.x, t.z, FB.x + FB.hw - 4, t.z + rng.range(-2, 2), 3.4, 0.45); }
  for (let z = Math.floor(EF.z - EF.r - 4); z <= EF.z + EF.r + 4; z++) for (let x = Math.floor(EF.x - EF.r - 4); x <= Math.min(w - 4, EF.x + EF.r + 4); x++) {
    const d = Math.hypot(x + 0.5 - EF.x, (z + 0.5 - EF.z) * 0.92) + (fbm(x * 0.09, z * 0.09, seed + 5) - 0.5) * 6;
    if (d < EF.r) L.cells[z * w + x] = 1;
  }
  { const t = road[idxAtZ(EF.z + 3)]; carveLine(L, t.x, t.z, EF.x - EF.r + 4, EF.z + 3, 3.3, 0.45); }
  // ---- the Lantern Graves: a straight gorge, the road down its middle; Elati's camp at its mouth ----
  for (let z = GV.z1 - 3; z <= GV.z0 + 2; z++) {
    const hw = 7.3 + fbm(z * 0.16, 5.5, seed + 13) * 1.8;
    for (let x = Math.floor(GV.x - hw); x <= GV.x + hw; x++) L.cells[z * w + x] = 1;
  }
  const es = rng.sign();
  const E2 = { x: GV.x + es * 3, z: GV.z0 + 6, r: 8 };
  carveCircle(L, E2.x, E2.z, E2.r);
  carveLine(L, GV.x, GV.z1, GP.x, GP.z + GP.r - 3, 4.6, 0.6);
  for (let z = GV.z1 - 2; z <= GV.z0 + 4; z++) for (let dx = -1.6; dx <= 1.6; dx += 0.5) carveCircle(L, GV.x + dx, z + 0.5, 0.5, 0.85);
  // ---- the Anvil Gate: a round plaza against the cliff, the gate's doorway cut north into the rock ----
  carveCircle(L, GP.x, GP.z, GP.r);
  carveLine(L, GP.x, GP.z - GP.r + 2, GP.x, 5, 3.3);
  // ---- three side hollows off the road for the Altars of the Wish ----
  const hollows = [];
  const inFB = (x, z, pad) => Math.abs(x - FB.x) < FB.hw + pad && Math.abs(z - FB.z) < FB.hd + pad;
  const okH = (cx, cz, r) => cx > r + 6 && cx < w - r - 6 && cz > GV.z0 + 4 + r && cz < C.z - C.r - 3
    && !inFB(cx, cz, r + 3) && Math.hypot(cx - EF.x, cz - EF.z) > EF.r + r + 4 && Math.hypot(cx - E2.x, cz - E2.z) > E2.r + r + 3
    && (cz > GV.z0 + 14 || Math.abs(cx - GV.x) > 11 + r)
    && road.every((t) => Math.hypot(t.x - cx, t.z - cz) > r + 4.5) && hollows.every((c) => Math.hypot(c.x - cx, c.z - cz) > c.r + r + 6);
  for (const z of [151, 143, 100, 108, 136, 94]) {
    if (hollows.length >= 3) break;
    const i0 = idxAtZ(z);
    if (hollows.some((c) => Math.abs(c.idx - i0) < 9)) continue;
    let done = false;
    for (const side of rng.shuffle([-1, 1])) {
      for (let k = 0; k < 14 && !done; k++) {
        const i = clamp(i0 + rng.int(-3, 3), 2, road.length - 3), t = road[i];
        const a = tangent(i) + side * Math.PI / 2 + rng.range(-0.45, 0.45), r = rng.range(4.6, 5.3), d = rng.range(10, 13.5);
        const cx = t.x + Math.sin(a) * d, cz = t.z + Math.cos(a) * d;
        if (!okH(cx, cz, r)) continue;
        carveLine(L, t.x, t.z, cx, cz, 2.0, 0.35);
        carveCircle(L, cx, cz, r);
        hollows.push({ x: cx, z: cz, r, idx: i, from: { x: t.x, z: t.z } }); done = true;
      }
      if (done) break;
    }
  }
  if (!last && hollows.length < 3) return null;
  // ---- lamps 1-3 on the road, about 25 m apart; the watchtower by lamp 3 ----
  // (lamp 3 near z 100, so lamp 4 in the Graves is a like walk on; 1 and 2 share out the road before it)
  const i3 = Math.max(road.findIndex((t, i) => arc[i] >= 60 && t.z <= 100), 0), s3 = arc[i3], s1 = 18 + Math.max(0, (s3 - 68) * 0.3);
  const lampAt = [s1, (s1 + s3) / 2, s3].map((s) => arc.findIndex((a) => a >= s));
  if (lampAt.some((i) => i < 0)) { if (!last) return null; }
  const lampSide = [-1, 1, 1];
  const tower = (() => {
    const i = lampAt[2] >= 0 ? lampAt[2] : road.length - 8, t = road[i];
    for (const sd of [-lampSide[2], lampSide[2]]) {
      const a = tangent(i) + sd * Math.PI / 2, x = t.x + Math.sin(a) * 7.2, z = t.z + Math.cos(a) * 7.2;
      if (hollows.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 6)) continue;
      carveCircle(L, x, z, 4.2); carveLine(L, t.x, t.z, x, z, 2.4);
      return { x, z, a };
    }
    return null;
  })();
  if (!tower) return null;
  smoothCells(L, 2);
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) if (xx < 3 || zz < 3 || xx >= w - 3 || zz >= h - 3) L.cells[zz * w + xx] = 0;
  // (the plaza and its doorway are round again after the smoothing)
  carveCircle(L, GP.x, GP.z, GP.r); carveLine(L, GP.x, GP.z - GP.r + 2, GP.x, 5, 3.3);
  for (let zz = 0; zz < 3; zz++) for (let xx = 0; xx < w; xx++) L.cells[zz * w + xx] = 0;
  // ---- the gate: two rows of the doorway closed until Ivar has fallen ----
  const gate = { x: GP.x, z: GP.z - GP.r - 1.2, cells: [] };
  for (let z = 8; z <= 9; z++) for (let x = Math.floor(GP.x - 4); x <= GP.x + 4; x++) { const i = z * w + x; if (L.cells[i] && Math.abs(x + 0.5 - GP.x) < 3.6) { L.cells[i] = 0; gate.cells.push([x, z]); } }
  L.gate = gate;
  mark(res, L, GP.x, gate.z + 2, 4);
  // ---- ember sinks: the Flats are full of them; a few lie by the road and at the Field's edge ----
  const sink = (i) => { L.cells[i] = 0; L.low[i] = 1; L.lava[i] = 1; };
  for (let z = Math.floor(EF.z - EF.r); z <= EF.z + EF.r; z++) for (let x = Math.floor(EF.x - EF.r); x <= EF.x + EF.r; x++) {
    const i = z * w + x, cx = x + 0.5, cz = z + 0.5;
    if (!L.cells[i] || Math.hypot(cx - EF.x, cz - EF.z) > EF.r - 1.5 || Math.abs(cz - EF.z - 3 - (fbm(cx * 0.12, 7.1, seed + 22) - 0.5) * 5) < 1.8) continue;
    if (fbm(cx * 0.14, cz * 0.14, seed + 21) > 0.56) sink(i);
  }
  const smallSinks = [], nearRoad = new Uint8Array(N);
  for (const t of road) mark(nearRoad, L, t.x, t.z, 5.2);
  for (let k = 0; k < 40 && smallSinks.length < 5; k++) {
    const t = rng.pick(road), a = rng.range(0, 6.28), d = rng.range(6, 10), cx = t.x + Math.sin(a) * d, cz = t.z + Math.cos(a) * d, r = rng.range(1.4, 2.4);
    if (cz > C.z - C.r - 3 || cz < GV.z0 + 6 || Math.hypot(cx - E2.x, cz - E2.z) < E2.r + r + 3 || hollows.some((c) => Math.hypot(c.x - cx, c.z - cz) < c.r + r + 3) || Math.hypot(tower.x - cx, tower.z - cz) < 7) continue;
    const cells = circleCells(L, cx, cz, r + 0.4).filter(([x, z]) => L.cells[z * w + x] && !nearRoad[z * w + x] && Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r + (fbm(x * 0.4, z * 0.4, seed + 23) - 0.5) * 1.2);
    if (cells.length < 4) continue;
    for (const [x, z] of cells) sink(z * w + x);
    smallSinks.push({ x: cx, z: cz, r });
  }
  // ---- the ground: the slopes steepen into the gorge's walls, and into the cliff of the Black Anvil behind the gate ----
  const D = distField(L, 14);
  L.dist = D;
  const cells0 = L.cells.slice();
  for (const [x, z] of gate.cells) cells0[z * w + x] = 1; // the gate stands on the floor of its doorway
  const D0 = distField({ ...L, cells: cells0 }, 14);
  const rise = (d, x, z) => {
    const gk = smooth(clamp(1 - (Math.abs(x - GV.x) - 10) / 7, 0, 1)) * smooth(clamp((z - GV.z1 + 8) / 8, 0, 1)) * smooth(clamp((GV.z0 + 6 - z) / 8, 0, 1));
    const ck = smooth(clamp((GP.z - 4 - z) / 13, 0, 1));
    const k = 0.42 + gk * 0.7 + ck * 1.9;
    return Math.min(d, 14) * k * (0.82 + 0.36 * fbm(x * 0.08, z * 0.08, seed + 31)) - (d < 1.4 ? 0.1 : 0);
  };
  L.hgt = terrain(L, cells0, D0, rise);
  const Y = (x, z) => groundY(L, x, z);
  // ---- the Dark Beacon camp: the cold beacon on its knoll, the fire, Isarn and Brokka, waypoint 1 ----
  L.start = { x: S.x, z: h - 8 };
  const dark = { x: C.x - cs * 5.4, z: C.z + 0.6 };
  sp.darkBeacon = dark;
  blockCircle(L, dark.x, dark.z, 2.3); mark(res, L, dark.x, dark.z, 3.4);
  L.props.push({ t: 'darkBeacon', x: dark.x, z: dark.z, r: rng.range(0, 6.28) });
  const fire = { x: C.x + cs * 0.4, z: C.z + 1.6 };
  L.props.push({ t: 'campBrazier', x: fire.x, z: fire.z }); blockCircle(L, fire.x, fire.z, 0.5);
  L.lights.push({ x: fire.x, y: 1.6, z: fire.z, color: 0xff8a3a, intensity: 26, range: 13, flicker: 0.35 });
  sp.camp = { x: C.x, z: C.z, r: C.r, fire };
  sp.waypoint = { x: C.x + cs * 4.6, z: C.z + 2.8 };
  L.lights.push({ x: sp.waypoint.x, y: 1.2, z: sp.waypoint.z, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
  mark(res, L, sp.waypoint.x, sp.waypoint.z, 2.4); mark(res, L, fire.x, fire.z, 2.6);
  sp.npcs = { wayfarer: { x: C.x - cs * 1.6, z: C.z - 2.0, r: Math.PI + cs * 0.4 }, brokka: { x: C.x + cs * 3.4, z: C.z - 1.6, r: -cs * 2.2 } };
  for (const [dx, dz, a] of [[-cs * 2.4, 4.4, 0.3], [cs * 2.6, 4.8, -0.4]]) L.props.push({ t: 'bedroll', x: C.x + dx, z: C.z + dz, r: a });
  L.props.push({ t: 'crateS', x: C.x + cs * 5.6, z: C.z - 2.4, r: 0.4 }, { t: 'barrelS', x: C.x + cs * 6.1, z: C.z - 1.4, r: 1.2 });
  blockCircle(L, C.x + cs * 5.8, C.z - 1.9, 0.8);
  mark(res, L, C.x, C.z, C.r - 1);
  // ---- the lamps ----
  const lamp = (x, z, id, memory, face) => {
    // on the nearest free floor cell
    let best = null, bd = 1e9;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      const cx = snap(x + dx), cz = snap(z + dz), d = Math.hypot(cx - x, cz - z), i = cellAt(L, cx, cz);
      if (d < bd && L.cells[i] && !res[i] && circleCells(L, cx, cz, 1.6).every(([a, b]) => L.cells[b * w + a] || !L.low[b * w + a])) { bd = d; best = { cx, cz }; }
    }
    if (best) { x = best.cx; z = best.cz; } else if (!memory) return null; else { x = snap(x); z = snap(z); }
    const p = { x, z, id, memory, r: face, lightR: 8 };
    (memory ? sp.lamps : sp.waylamps).push(p);
    blockCircle(L, x, z, 0.45); mark(res, L, x, z, 2.2);
    return p;
  };
  lampAt.forEach((i, k) => {
    if (i < 0) return;
    const t = road[i], a = tangent(i) + lampSide[k] * Math.PI / 2;
    const c = [2.6, -2.6, 1.8, -1.8].map((d) => ({ x: snap(t.x + Math.sin(a) * d), z: snap(t.z + Math.cos(a) * d) })).find((p) => isFloor(L, p.x, p.z) && !res[cellAt(L, p.x, p.z)]) || { x: t.x, z: t.z };
    lamp(c.x, c.z, 'l' + (k + 1), true, Math.atan2(t.x - c.x, t.z - c.z));
  });
  // the watchtower of the dead Wayfarers, its door to the road
  blockCircle(L, tower.x, tower.z, 2.5); mark(res, L, tower.x, tower.z, 3.6);
  L.props.push({ t: 'ruinedTower', x: tower.x, z: tower.z, r: tower.a + Math.PI });
  sp.tower = { x: tower.x, z: tower.z };
  // ---- the Altars of the Wish: a headless statue on its plinth over a cracked basin, at the back of each hollow ----
  const ids = rng.shuffle(['throne', 'forge', 'unfading']);
  hollows.sort((a, b) => b.z - a.z).forEach((c, k) => {
    const back = Math.atan2(c.x - c.from.x, c.z - c.from.z), x = c.x + Math.sin(back) * (c.r - 2.2), z = c.z + Math.cos(back) * (c.r - 2.2);
    sp.altars.push({ x, z, id: ids[k], r: back + Math.PI });
    blockCircle(L, x, z, 1.25); mark(res, L, c.x, c.z, c.r);
    for (let j = 0; j < 5; j++) { const a = back + Math.PI + (j - 2) * 0.55, rr = c.r - 0.8; if (Math.abs(angleDiff(a, back + Math.PI)) < 0.3) continue; L.props.push({ t: 'ashRock', x: c.x + Math.sin(a) * rr, z: c.z + Math.cos(a) * rr, r: rng.range(0, 6.28), s: rng.range(0.5, 0.8), y: 0 }); }
  });
  L.hollows = hollows;
  // ---- the Field of Three Banners: three peoples' dead still fighting where they fell, round three fallen standards ----
  {
    const cx = FB.x + rng.range(-2, 2), cz = FB.z + 2 + rng.range(-1.5, 1.5), a0 = rng.range(0, 6.28), R0 = 10.5;
    const V = [0, 1, 2].map((k) => ({ x: cx + Math.sin(a0 + k * 2.094) * R0, z: cz + Math.cos(a0 + k * 2.094) * R0 }));
    sp.banners = { x: cx, z: cz, r: 17 };
    for (let k = 0; k < 3; k++) {
      const A = V[k], B = V[(k + 1) % 3], mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2, along = Math.atan2(B.x - A.x, B.z - A.z);
      L.banners.push({ x: mx, z: mz, r: along, faction: k, len: 13 });
      L.props.push({ t: 'fallenBanner', x: mx, z: mz, r: along, faction: k, len: 13 });
      // the faction lies along its banner, facing into the triangle where the others are
      const inward = Math.atan2(cx - mx, cz - mz), px = mx + Math.sin(inward) * 3, pz = mz + Math.cos(inward) * 3;
      L.packs.push({ x: px, z: pz, n: rng.int(5, 7), tag: k === 2 ? 'ashBowmen' : 'ashLine', faction: ['men', 'stone', 'green'][k], r: inward, dormant: true, elite: rng.chance(0.4) ? 'champion' : null });
      mark(res, L, mx, mz, 2.5);
    }
    // the war-drake's bones toward the Field's north edge, the Ashwings' roost
    const dx = FB.x + rng.range(-5, 5), dz = FB.z - FB.hd + 7 + rng.range(-1, 1), dr = rng.sign() * Math.PI / 2 + rng.range(-0.35, 0.35);
    sp.drake = { x: dx, z: dz, r: dr };
    L.props.push({ t: 'drakeBones', x: dx, z: dz, r: dr });
    blockCircle(L, dx + Math.sin(dr) * 5.2, dz + Math.cos(dr) * 5.2, 1.3); // the skull
    for (let k = -2; k <= 2; k++) for (const sd of [-1, 1]) { const u = k * 1.15, x = dx + Math.sin(dr) * u + Math.cos(dr) * sd * 1.7, z = dz + Math.cos(dr) * u - Math.sin(dr) * sd * 1.7; blockCircle(L, x, z, 0.4); }
    mark(res, L, dx, dz, 6.5);
    L.packs.push({ x: dx - Math.cos(dr) * 4.5, z: dz + Math.sin(dr) * 4.5, n: rng.int(1, 2), tag: 'ashwing', elite: rng.chance(0.35) ? 'rare' : null });
    const dc = chestSpot(L, res, dx + Math.sin(dr) * 7.8, dz + Math.cos(dr) * 7.8);
    if (dc) sp.chests.push({ ...dc, rare: true });
    // the shrine and waylamp 1 before the debris, which keeps off them (and off every reserved spot)
    const shrine = { x: FB.x - FB.hw * 0.55, z: FB.z + FB.hd * 0.5 };
    sp.shrines.push(shrine); mark(res, L, shrine.x, shrine.z, 2);
    lamp(cx - Math.sin(a0) * 2.2, cz - Math.cos(a0) * 2.2, 'w1', false, a0);
    // battle debris half buried everywhere in the Field
    for (let k = 0; k < 90; k++) {
      const x = FB.x + rng.range(-FB.hw + 2, FB.hw - 2), z = FB.z + rng.range(-FB.hd + 2, FB.hd - 2);
      if (!isFloor(L, x, z) || Math.hypot(x - dx, z - dz) < 4.5) continue;
      const p = { t: 'debris', m: rng.pick(['shield', 'sword', 'warhammer', 'mace', 'sword', 'shield', 'spear', 'helm']), x, z, r: rng.range(0, 6.28), s: rng.range(0.85, 1.15), tilt: rng.range(0.15, 1.2) };
      if (!res[cellAt(L, x, z)] && !nearLow(L, cellAt(L, x, z))) L.props.push(p);
    }
  }
  // ---- the Ember Flats: tick nests between the sinks ----
  {
    const spots = [];
    for (let k = 0; k < 200 && spots.length < 3; k++) {
      const a = rng.range(0, 6.28), d = rng.range(2, EF.r - 3), x = snap(EF.x + Math.sin(a) * d), z = snap(EF.z + Math.cos(a) * d);
      if (!isFloor(L, x, z) || spots.some((q) => Math.hypot(q.x - x, q.z - z) < 8)) continue;
      let open = 0; for (const [cx2, cz2] of circleCells(L, x, z, 2.2)) open += L.cells[cz2 * w + cx2];
      if (open < 10) continue;
      spots.push({ x, z });
      L.packs.push({ x, z, n: rng.int(4, 6), tag: 'ticks', elite: rng.chance(0.3) ? 'champion' : null });
      L.props.push({ t: 'tickNest', x, z, r: rng.range(0, 6.28), y: Math.min(0, groundY(L, x, z)) });
    }
    sp.flats = { x: EF.x, z: EF.z, r: EF.r };
    // the chest by the first nest, clear of it
    if (spots[0]) { const rare = rng.chance(0.5), c = chestSpot(L, res, spots[0].x + 1.6, spots[0].z - 1.2, { ...spots[0], r: 2.2 }); if (c) sp.chests.push({ ...c, rare }); }
    if (spots[1]) lamp(spots[1].x + 1.6, spots[1].z + 1.6, 'w2', false, rng.range(0, 6.28));
  }
  // ---- the Lantern Graves: rows of iron poles, a dead lantern on every arm; Lampless walk the aisles ----
  {
    const zs = [];
    for (let z = GV.z0 - 2; z > GV.z1 + 1; z -= 3) zs.push(snap(z));
    const ls = rng.sign(), l3 = sp.lamps[2] || { z: 100 };
    const z4 = zs.map((z) => z - 1.5).reduce((b, z) => (Math.abs(z - clamp(l3.z - 27, 69, 76)) < Math.abs(b - clamp(l3.z - 27, 69, 76)) ? z : b));
    const l4 = lamp(GV.x + ls * 2, z4, 'l4', true, ls > 0 ? -Math.PI / 2 : Math.PI / 2);
    const l5 = lamp(GV.x - ls * 2, l4.z - 25, 'l5', true, ls > 0 ? Math.PI / 2 : -Math.PI / 2);
    // Ivar's hook: the one bare arm on the row by lamp 5
    const hz = zs.reduce((b, z) => (Math.abs(z - l5.z - 1.5) < Math.abs(b - l5.z - 1.5) ? z : b), zs[0]);
    const hook = { x: GV.x - ls * 3, z: hz, r: ls > 0 ? Math.PI / 2 : -Math.PI / 2 };
    sp.hook = hook; blockCircle(L, hook.x, hook.z, 0.3); mark(res, L, hook.x, hook.z, 1.5);
    const pole = (x, z, k, onFloor) => {
      const y = onFloor ? 0 : Y(x, z), hgt = rng.range(2.5, 3.3), face = k < 0 ? Math.PI / 2 : -Math.PI / 2;
      const arms = rng.chance(0.7) ? [face, face + Math.PI] : [face + (rng.chance(0.25) ? Math.PI : 0)];
      L.gravePoles.push({ x, z, y, h: hgt, arms });
      for (const a of arms) if (rng.chance(0.93)) L.graveLanterns.push({ x: x + Math.sin(a) * 0.62, y: y + hgt - 0.62 + rng.range(-0.06, 0.06), z: z + Math.cos(a) * 0.62, r: rng.range(0, 6.28) });
      if (onFloor) blockCircle(L, x, z, 0.3);
    };
    for (const z of zs) {
      for (const k of [-6, -3, 3, 6]) {
        const x = GV.x + k;
        if (x === hook.x && z === hook.z) continue;
        if (!L.cells[cellAt(L, x, z)] || [l4, l5].some((p) => Math.hypot(p.x - x, p.z - z) < 1.2)) continue;
        pole(x, z, k, true);
      }
      // more climb the gorge's walls, row on row
      for (const k of [-9.5, -12.5, -15.5, -18.5, 9.5, 12.5, 15.5, 18.5]) { const x = GV.x + k + rng.range(-0.4, 0.4), zz = z + rng.range(-0.5, 0.5); if (!L.cells[cellAt(L, x, zz)] && Y(x, zz) < 10) pole(x, zz, k, false); }
    }
    // the fallen ones, on the ground between the rows
    for (let k = 0; k < 46; k++) {
      const x = GV.x + rng.range(-7, 7), z = rng.range(GV.z1, GV.z0);
      if (!isFloor(L, x, z) || Math.abs(x - GV.x) < 1.6) continue;
      L.graveLanterns.push({ x, y: 0.12, z, r: rng.range(0, 6.28), fallen: rng.range(1.2, 1.7) });
    }
    sp.graves = { x: GV.x, z: (GV.z0 + GV.z1) / 2, r: (GV.z0 - GV.z1) / 2 + 4, hw: 7 };
    // two patrol loops round the inner rows (the lanes between the rows, crossing where the poles leave a gap)
    const loops = [[1, 5], [6, 10]];
    for (const [a, b] of loops) {
      if (!zs[a] || !zs[b]) continue;
      const za = zs[a] - 1.5, zb = zs[b] - 1.5, pts = [{ x: GV.x - 4.5, z: za }, { x: GV.x - 4.5, z: zb }, { x: GV.x + 4.5, z: zb }, { x: GV.x + 4.5, z: za }];
      if (!pts.every((p, i) => { const q = pts[(i + 1) % 4]; return clearLine(L, p.x, p.z, q.x, q.z); })) continue;
      sp.patrols.push(pts);
      L.packs.push({ x: pts[0].x, z: pts[0].z, n: rng.int(2, 3), tag: 'lamplessPatrol', patrol: sp.patrols.length - 1, elite: rng.chance(0.25) ? 'champion' : null });
    }
    // Elati's camp at the gorge's mouth: waypoint 2, a small fire
    const ef = { x: E2.x - es * 0.6, z: E2.z + 1.2 };
    L.props.push({ t: 'campfire', x: ef.x, z: ef.z }); blockCircle(L, ef.x, ef.z, 0.6);
    L.lights.push({ x: ef.x, y: 1.2, z: ef.z, color: 0xff8a3a, intensity: 22, range: 12, flicker: 0.35, fx: 'fire' });
    sp.camp2 = { x: E2.x + es * 3.6, z: E2.z + 2.2 };
    L.lights.push({ x: sp.camp2.x, y: 1.2, z: sp.camp2.z, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
    sp.npcs.elati = { x: E2.x - es * 3.4, z: E2.z - 0.6, r: es * 1.2 };
    L.props.push({ t: 'bedroll', x: E2.x - es * 2.2, z: E2.z + 3.4, r: 0.4 });
    mark(res, L, E2.x, E2.z, E2.r - 1);
    // snuffers come for the lamps: by lamps 2, 3 and 4
    for (const p of [sp.lamps[1], sp.lamps[2], l4]) if (p) L.packs.push({ x: p.x + rng.range(-3, 3), z: p.z - rng.range(5, 8), n: rng.int(2, 3), tag: 'snuffers', elite: null });
  }
  // ---- the plaza: the Last Lamp at its heart, three braziers on the rim, broken pillars, the cliff behind ----
  {
    L.boss = { x: GP.x, z: GP.z, r: GP.r };
    sp.lastLamp = { x: GP.x, z: GP.z };
    L.cells[cellAt(L, GP.x, GP.z)] = 0;
    const bs = rng.sign();
    for (const a of [Math.PI / 2, Math.PI * 7 / 6, Math.PI * 11 / 6]) {
      const x = snap(GP.x + bs * Math.sin(a) * 11.2), z = snap(GP.z + Math.cos(a) * 11.2);
      sp.braziers.push({ x, z });
      blockCircle(L, x, z, 0.45);
    }
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + 0.11;
      if (Math.abs(angleDiff(a, 0)) < 0.45 || Math.abs(angleDiff(a, Math.PI)) < 0.42 || sp.braziers.some((b) => Math.hypot(b.x - (GP.x + Math.sin(a) * 13.3), b.z - (GP.z + Math.cos(a) * 13.3)) < 3)) continue;
      const x = GP.x + Math.sin(a) * 13.4, z = GP.z + Math.cos(a) * 13.4;
      L.props.push({ t: k % 3 ? 'rimStone' : 'rimPillar', x, z, r: a, s: rng.range(0.85, 1.15) });
      blockCircle(L, x, z, 0.6);
    }
    L.props.push({ t: 'plaza', x: GP.x, z: GP.z, s: GP.r });
    L.props.push({ t: 'anvilGateFrame', x: GP.x, z: gate.z });
    // the mountain's fire in its seams (anvil: they die with it, build.js setNight)
    L.lights.push({ x: GP.x, y: 7, z: gate.z - 1.5, color: 0xff4a18, intensity: 16, range: 16, flicker: 0.08, anvil: true });
    for (const sx of [-1, 1]) L.lights.push({ x: GP.x + sx * 9, y: 4, z: gate.z - 3, color: 0xff3a10, intensity: 12, range: 12, flicker: 0.12, anvil: true });
    sp.isarnRun = { x: GP.x, z: GP.z + GP.r + 5 };
    L.exits.push({ x: GP.x, z: gate.z + 2.2, to: 'forge', label: 'exit.forge', locked: 'ivar' });
    mark(res, L, GP.x, GP.z, GP.r + 1);
  }
  L.exits.push({ x: S.x, z: h - 4.5, to: 'town', label: 'exit.town' });
  L.anvilGlow = { x: GP.x, y: 34, z: -70 };
  // ---- packs along the road (the dead lie where they fell; ticks and snuffers between them) ----
  for (let i = 14; i < road.length - 8; i += rng.int(11, 15)) {
    const t = road[i];
    if ([...sp.lamps, ...hollows].some((p) => Math.hypot(p.x - t.x, p.z - t.z) < 7) || t.z > C.z - C.r - 4) continue;
    const tag = rng.weighted([['ashLine', 3], ['ticks', 2], ['ashBowmen', 1.2], ['snuffers', 0.7]]);
    L.packs.push({ x: t.x + rng.range(-2, 2), z: t.z + rng.range(-2, 2), n: rng.int(3, 5), tag, r: tangent(i) + Math.PI, dormant: tag === 'ashLine' || tag === 'ashBowmen' ? true : undefined, elite: rng.chance(0.14) ? 'champion' : null });
  }
  // ---- dressing: charred trees and black rock on the slopes, ash-grass and battle wreck on the floor ----
  for (const s2 of smallSinks) L.lights.push({ x: s2.x, y: 0.5, z: s2.z, color: 0xff4a10, intensity: 7, range: 7, flicker: 0.3 });
  for (let z = 0; z < h; z += 3) for (let x = 0; x < w; x += 3) if (L.lava[z * w + x]) L.props.push({ t: 'fx', fx: 'embersink', x: x + 0.5, y: 0, z: z + 0.5 });
  for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.28 + 0.4; L.lights.push({ x: EF.x + Math.sin(a) * EF.r * 0.45, y: 0.6, z: EF.z + Math.cos(a) * EF.r * 0.45, color: 0xff4a10, intensity: 10, range: 10, flicker: 0.3 }); }
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x, d = D[i];
    if (res[i] || L.low[i]) continue;
    if (d === 0) {
      if (!L.cells[i]) continue;
      const edge = D[i - 1] === 1 || D[i + 1] === 1 || D[i - w] === 1 || D[i + w] === 1;
      // (none beside a sink: a corner touching a hole sinks, and these stand at 0; the draws are made all the same)
      const put = nearLow(L, i) ? () => {} : (p) => L.props.push(p);
      if (L.paint[i] < 0.3 && rng.chance(edge ? 0.16 : 0.07)) put({ t: 'ashTuft', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.7, 1.2) });
      if (rng.chance(0.012)) put({ t: 'ashStone', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.3, 0.6) });
      if (L.paint[i] < 0.2 && rng.chance(0.0035)) put({ t: 'debris', m: rng.pick(['shield', 'sword', 'mace', 'spear', 'helm']), x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.85, 1.1), tilt: rng.range(0.2, 1) });
      if (L.paint[i] < 0.2 && rng.chance(edge ? 0.012 : 0.002)) put({ t: 'bones', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: 1 });
      continue;
    }
    if (d === 255) continue;
    const px = x + rng.range(0.2, 0.8), pz = z + rng.range(0.2, 0.8), y = Y(px, pz);
    if (y > 16) continue;
    const graves = sp.graves && Math.abs(x - GV.x) < 18 && z > GV.z1 - 4 && z < GV.z0 + 4, cliff = z < GP.z - 8;
    if (d === 1 && rng.chance(0.1)) L.props.push({ t: 'ashRock', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.7, 1.4), y: y - 0.15 });
    else if (d <= 2 && !graves && rng.chance(cliff ? 0.01 : 0.05)) L.props.push({ t: 'ashTree', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.85, 1.25), y: y - 0.1, d });
    else if (d <= 6 && !graves && rng.chance(0.045)) L.props.push({ t: 'ashTree', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(1, 1.4), y: y - 0.1, d });
    else if (d <= 8 && rng.chance(cliff ? 0.1 : 0.035)) L.props.push({ t: 'ashCrag', x: px, z: pz, r: toFloor(L, D, x, z) + rng.range(-0.6, 0.6), s: rng.range(0.7, 1.3) * (cliff ? 1.6 : 1), y: y - 0.6 });
    else if (d <= 4 && rng.chance(0.09)) L.props.push({ t: 'ashTuft', x: px, z: pz, r: rng.range(0, 6.28), s: rng.range(0.8, 1.3), y });
  }
  // ---- does it hold? every lamp, altar, camp, brazier, the gate and the arena in reach of the start ----
  const R = reach(L, L.start.x, L.start.z), far = (p, r = 1.8) => nearReach(L, R, p.x, p.z) > r;
  const need = [...sp.lamps, ...sp.waylamps, ...sp.braziers, sp.camp, sp.waypoint, sp.camp2, sp.npcs.wayfarer, sp.npcs.brokka, sp.npcs.elati, sp.hook, sp.lastLamp, { x: GP.x, z: gate.z + 2.2 }, sp.banners, sp.drake, sp.isarnRun, ...sp.chests, ...sp.shrines];
  if (!last && (need.some((p) => far(p, 2.2)) || sp.altars.some((p) => far(p, 2.4)) || L.exits.some((e) => far(e, 1.5)))) return null;
  if (!last && L.packs.some((p) => far(p, 3.5)) || (!last && sp.patrols.length < 2)) return null;
  if (!last && sp.lamps.length < 5) return null;
  return L;
}

// ======================= FORGE: the Ashen Forge =======================
// South to north: the Hall of the Headless (the nave of beheaded statues; Brokka's camp in a cold side forge), the Slag
// Rivers under their iron bridges (the Hall of Moulds off to one side), the hub where the three Breath Galleries meet,
// running west, east and north to the three Great Bellows, and from the north chamber the Great Stair, sealed by a slag
// plug, curling up round the Anvil of the Crown under the open crater.
export function genForge(seed, o = {}) {
  for (let k = 0; k < 24; k++) { const L = tryForge(seed + k * 7919, o, k === 23); if (L) { L.seed = seed; return L; } }
  return null;
}
function tryForge(seed, o, last) {
  const rng = RNG(seed);
  const w = o.w || 120, h = o.h || 180, N = w * h;
  const L = base(w, h);
  L.type = 'forge'; L.seed = seed;
  L.low = new Uint8Array(N); L.lava = new Uint8Array(N);
  L.fk = new Uint8Array(N); // floor kind: 0 tiles, 2 iron plate (galleries, bellows chambers, stations)
  const sp = L.spots;
  Object.assign(sp, { stations: [], bellows: [], cages: [], ghosts: [], moulds: [], chests: [], shrines: [], drips: [], pools: [] });
  L.flues = []; L.statues = []; L.bridges = []; L.chains = []; L.grates = [];
  const res = new Uint8Array(N);
  const s = rng.sign(), ss = rng.sign(); // the Hall of Moulds' side (Brokka's on the other); the side the stair climbs
  const X = Math.floor(w / 2) + 0.5;
  const S = { x: X, z: h - 9.5 };
  const NV = { z0: h - 5, z1: 136, hw: 6 };
  const SR = { z0: 106, z1: 134, hw: 26 };
  const HB = { x: X, z: 96.5 + rng.int(0, 3), r: 6 };
  const AN = { x: X + 0.5, z: 20, r: 16 };
  const CH = [{ x: 13.5, z: HB.z }, { x: w - 13.5, z: HB.z }, { x: X, z: 50.5 + rng.int(0, 1) }].map((c, i) => ({ ...c, r: 9, id: i }));
  const WS = { x: X - s * 33, z: rng.range(118, 124), r: 5.8 }; // the smelters' workshop, across the rivers from the Hall of Moulds
  const HM = { x: X + s * 40, z: rng.range(128, 131), hw: 10.5, hd: 10.5 };
  const BR = { x: X - s * 18, z: rng.range(148, 152), r: 6.5 };
  const rect = (x0, x1, z0, z1, fk) => { for (let z = Math.floor(z0); z < z1; z++) for (let x = Math.floor(x0); x < x1; x++) if (x >= 3 && z >= 3 && x < w - 3 && z < h - 3) { L.cells[z * w + x] = 1; if (fk != null) L.fk[z * w + x] = fk; } };
  const paint = (x0, x1, z0, z1, k) => { for (let z = Math.floor(z0); z < z1; z++) for (let x = Math.floor(x0); x < x1; x++) if (L.cells[z * w + x]) L.paint[z * w + x] = Math.max(L.paint[z * w + x], k); };
  // ---- the Hall of the Headless, the Slag Rivers' hall, the hub ----
  rect(X - NV.hw, X + NV.hw, NV.z1, NV.z0);
  for (let z = SR.z0; z < SR.z1; z++) {
    const e = 1.2 * (fbm(z * 0.13, 1.7, seed + 2) - 0.5) * 4;
    rect(X - SR.hw + Math.abs(e), X + SR.hw - Math.abs(e * 0.7), z, z + 1);
  }
  carveLine(L, X, SR.z1 - 2, X, NV.z1 + 2, NV.hw);
  paint(X - 3.5, X + 3.5, NV.z1 - 2, NV.z0, 1);
  carveCircle(L, HB.x, HB.z, HB.r);
  carveLine(L, X, HB.z, X, SR.z0 + 2, 4.2);
  // ---- the Breath Galleries: straight, five cells wide, alcoves every seven metres, a stoker's bay or two ----
  // gallery g runs from the hub (u = 0) to its chamber; the flue's mouth is at the chamber end, breathing back down it
  const G3 = [
    { a: { x: HB.x - HB.r, z: HB.z }, d: [-1, 0] },
    { a: { x: HB.x + HB.r, z: HB.z }, d: [1, 0] },
    { a: { x: HB.x, z: HB.z - HB.r }, d: [0, -1] }
  ];
  G3.forEach((g, i) => {
    const c = CH[i], end = { x: c.x - g.d[0] * c.r, z: c.z - g.d[1] * c.r };
    g.len = Math.abs(end.x - g.a.x) + Math.abs(end.z - g.a.z);
    g.px = -g.d[1]; g.pz = g.d[0]; // across the gallery
  });
  const gcell = (g, u, v) => ({ x: g.a.x + g.d[0] * u + g.px * v, z: g.a.z + g.d[1] * u + g.pz * v });
  const gbox = (g, u0, u1, v0, v1, fk) => {
    const A = gcell(g, u0, v0), B = gcell(g, u1, v1);
    rect(Math.min(A.x, B.x), Math.max(A.x, B.x), Math.min(A.z, B.z), Math.max(A.z, B.z), fk);
  };
  const pillars = [];
  G3.forEach((g, i) => {
    gbox(g, -1, g.len + 1, -2.5, 2.5, 2);
    const slots = [4.5, 11.5, 18.5, 25.5];
    const nSt = i === 2 ? 2 : rng.int(1, 2), stSlots = rng.shuffle([1, 2]).slice(0, nSt), stSide = rng.sign();
    g.stations = [];
    slots.forEach((u0, k) => {
      for (const sv of [-1, 1]) {
        const j = stSlots.indexOf(k), st = j >= 0 && sv === (j ? -stSide : stSide);
        if (st) {
          // a stoker's bay: the chain post at the back, the station's small bellows against the wall
          gbox(g, u0 - 1.5, u0 + 3.5, sv * 2.5, sv * 6.5, 2);
          const post = gcell(g, u0 + 1, sv * 5), bel = gcell(g, u0 + 1, sv * 5.9);
          g.stations.push({ x: snap(post.x), z: snap(post.z), flue: i, r: Math.atan2(-g.px * sv, -g.pz * sv), bel });
        } else gbox(g, u0 - 0.5, u0 + 1.5, sv * 2.5, sv * 4.5, 2);
      }
    });
    // one or two pillars to hide behind
    for (const [u, v] of [[8.5, rng.sign()], [21.5, rng.sign()]].slice(0, rng.int(1, 2))) pillars.push(gcell(g, u, v));
  });
  // ---- the Great Bellows: round chambers, the bellows against the back wall, two doors for what comes ----
  CH.forEach((c, i) => {
    carveCircle(L, c.x, c.z, c.r);
    for (const [x, z] of circleCells(L, c.x, c.z, c.r)) L.fk[z * w + x] = 2;
    const ent = Math.atan2(G3[i].a.x - c.x, G3[i].a.z - c.z), back = ent + Math.PI;
    const dA = i === 2 ? [ent + Math.PI / 2 - 0.25, ent - Math.PI / 2 + 0.25] : [ent + Math.PI / 2, ent - Math.PI / 2];
    c.ent = ent; c.back = back;
    c.doors = dA.map((a) => {
      const rim = { x: c.x + Math.sin(a) * (c.r - 0.5), z: c.z + Math.cos(a) * (c.r - 0.5) }, deep = { x: c.x + Math.sin(a) * (c.r + 3.6), z: c.z + Math.cos(a) * (c.r + 3.6) };
      carveLine(L, rim.x, rim.z, deep.x, deep.z, 1.7);
      return { x: deep.x, z: deep.z, rim, a };
    });
  });
  // ---- the Great Stair: out of the north chamber's back, curling round the Anvil of the Crown up to its rim ----
  const N2 = CH[2], sa = N2.back - ss * 0.85;
  const stair = [{ x: N2.x + Math.sin(sa) * (N2.r - 1), z: N2.z + Math.cos(sa) * (N2.r - 1) }];
  stair.push({ x: N2.x + ss * 15, z: 42 }, { x: AN.x + ss * 21.5, z: 33 }, { x: AN.x + ss * 21.5, z: 23 }, { x: AN.x + ss * (AN.r - 1), z: AN.z });
  for (let k = 1; k < stair.length; k++) carveLine(L, stair[k - 1].x, stair[k - 1].z, stair[k].x, stair[k].z, 2.2);
  L.stair = stair;
  // ---- the Anvil of the Crown: a platform under the crater, a moat of fire round it, the Forge Mouth on its south rim ----
  carveCircle(L, AN.x, AN.z, AN.r + 2.6);
  // ---- the Hall of Moulds (side s) and Brokka's cold forge (the other side) ----
  for (let z = Math.floor(HM.z - HM.hd); z < HM.z + HM.hd; z++) for (let x = Math.floor(HM.x - HM.hw); x < HM.x + HM.hw; x++) {
    const u = Math.abs(x + 0.5 - HM.x) / HM.hw, v = Math.abs(z + 0.5 - HM.z) / HM.hd;
    if (u ** 5 + v ** 5 < 1 + (fbm(x * 0.2, z * 0.2, seed + 7) - 0.5) * 0.3 && x >= 3 && x < w - 3) L.cells[z * w + x] = 1;
  }
  carveLine(L, X + s * (SR.hw - 3), HM.z + 1, HM.x - s * (HM.hw - 2), HM.z + 1, 2.4);
  carveCircle(L, BR.x, BR.z, BR.r);
  carveCircle(L, WS.x, WS.z, WS.r);
  carveLine(L, X - s * (SR.hw - 3), WS.z, WS.x, WS.z, 2.2);
  carveLine(L, X - s * (NV.hw - 1), BR.z, BR.x, BR.z, 2.2);
  smoothCells(L, 1);
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) if (xx < 3 || zz < 3 || xx >= w - 3 || zz >= h - 3) L.cells[zz * w + xx] = 0;
  // (the galleries stay square after the smoothing)
  G3.forEach((g) => gbox(g, -1, g.len + 1, -2.5, 2.5, 2));
  carveCircle(L, AN.x, AN.z, AN.r);
  // ---- lava: the two slag rivers under their bridges, the moat, the brood pools ----
  const lava = (i) => { if (!L.cells[i]) return; L.cells[i] = 0; L.low[i] = 1; L.lava[i] = 1; };
  const rivers = [SR.z1 - 7.5 + rng.range(-1, 1), SR.z0 + 7.5 + rng.range(-1, 1)];
  const side = rng.sign();
  rivers.forEach((rz, ri) => {
    const bxs = [X + rng.range(-2, 2), X + (ri ? side : -side) * rng.range(15, 19)], bws = [4.2, 3.2];
    for (let x = Math.floor(X - SR.hw - 2); x <= X + SR.hw + 2; x++) {
      const c = rz + (fbm(x * 0.07, ri * 5.3, seed + 11) - 0.5) * 4, half = 1.25 + fbm(x * 0.15, ri * 3.1 + 9, seed + 12) * 1.3;
      for (let z = Math.floor(c - half); z <= c + half; z++) {
        if (bxs.some((bx, k) => Math.abs(x + 0.5 - bx) < bws[k] / 2)) continue;
        lava(z * w + x);
      }
    }
    bxs.forEach((bx, k) => {
      const c = rz + (fbm(bx * 0.07, ri * 5.3, seed + 11) - 0.5) * 4;
      L.bridges.push({ x: bx, z: c, r: 0, len: 7.5, w: bws[k] });
      for (const dz of [-3.2, 3.2]) sp.drips.push({ x: bx + rng.range(-1, 1), z: c + dz });
    });
  });
  // the moat: a ring of fire between the platform and the crater's wall, crossed by the stair's last bridge
  const se = stair[stair.length - 1];
  for (const [x, z] of circleCells(L, AN.x, AN.z, AN.r + 2.6)) {
    const d = Math.hypot(x + 0.5 - AN.x, z + 0.5 - AN.z);
    if (d <= AN.r - 0.2) continue;
    if (Math.abs(z + 0.5 - AN.z) < 1.9 && (x + 0.5 - AN.x) * ss > 0) continue; // the bridge
    lava(z * w + x);
  }
  L.bridges.push({ x: AN.x + ss * (AN.r + 1.2), z: AN.z, r: Math.PI / 2, len: 5.5, w: 3.6, stair: true });
  // the Forge Mouth: a hole on the platform's south rim, where the white fire will burn
  const MO = { x: AN.x, z: AN.z + AN.r - 4.2, r: 4 };
  for (const [x, z] of circleCells(L, MO.x, MO.z, MO.r)) { const i = z * w + x; if (L.cells[i]) { L.cells[i] = 0; L.low[i] = 1; L.lava[i] = 1; } }
  sp.mouth = MO;
  // brood pools in the Hall of Moulds
  for (let k = 0; k < 2; k++) {
    const a = rng.range(0, 6.28), d = rng.range(3, 6.5), px = HM.x + Math.sin(a) * d * (k ? -1 : 1), pz = HM.z + Math.cos(a) * d * (k ? -1 : 1), r = rng.range(1.6, 2.2);
    for (const [x, z] of circleCells(L, px, pz, r)) lava(z * w + x);
    sp.pools.push({ x: px, z: pz, r });
  }
  // ---- the plug of slag on the Great Stair, a little way up from its foot ----
  const p0 = stair[0], p1 = stair[1], pa = Math.atan2(p1.x - p0.x, p1.z - p0.z), pd = 4.2;
  const pc = { x: p0.x + Math.sin(pa) * pd, z: p0.z + Math.cos(pa) * pd };
  const plugCells = bandCells(L, pc, pa, 1.1, 4.5);
  for (const [x, z] of plugCells) L.cells[z * w + x] = 0;
  L.plug = { x: pc.x, z: pc.z, r: pa, cells: plugCells };
  // ---- the ground: high walls of black rock (low on their south faces, so the camera sees over them), the crater ----
  const D = distField(L, 12);
  L.dist = D;
  const cells0 = L.cells.slice();
  for (const [x, z] of plugCells) cells0[z * w + x] = 1; // the plug is a thing on the floor, not a wall
  const north = new Uint8Array(N).fill(6); // cells to the nearest floor due north
  for (let x = 0; x < w; x++) { let k = 6; for (let z = 0; z < h; z++) { const i = z * w + x; k = cells0[i] || L.low[i] ? 0 : Math.min(6, k + 1); north[i] = k; } }
  const D0 = distField({ ...L, cells: cells0.map((c, i) => c || L.low[i]) }, 12);
  const rise = (d, x, z) => {
    let kN = 6;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const xx = x + dx, zz = z + dz; if (xx >= 0 && zz >= 0 && xx < w && zz < h) kN = Math.min(kN, north[zz * w + xx]); }
    const cut = [0.2, 0.2, 0.32, 0.52, 0.76, 0.92, 1][kN];
    const crater = Math.hypot(x - AN.x, z - AN.z) < AN.r + 8 ? 1.5 : 1;
    return 5.6 * crater * (1 - Math.exp(-0.95 * d)) * cut * (0.88 + 0.24 * fbm(x * 0.15, z * 0.15, seed + 31));
  };
  L.hgt = terrain(L, cells0, D0, rise);
  // ---- the nave's statues: the old kings of the Ash, beheaded by the alliance, in pairs down both sides ----
  for (let z = NV.z0 - 6.5; z > NV.z1 + 2; z -= 6.5) for (const sx of [-1, 1]) {
    if (Math.abs(z - BR.z) < 2.8 && sx === -s) continue;
    const x = X + sx * 4.6;
    L.statues.push({ x, z, r: sx > 0 ? -Math.PI / 2 : Math.PI / 2, s: 1 });
    blockCircle(L, x, z, 1.25); mark(res, L, x, z, 1.8);
  }
  for (const sx of [-1, 1]) {
    L.props.push({ t: 'brazier', x: X + sx * 3.4, z: NV.z0 - 3.2 }); blockCircle(L, X + sx * 3.4, NV.z0 - 3.2, 0.45);
    L.lights.push({ x: X + sx * 3.4, y: 1.6, z: NV.z0 - 3.2, color: 0xff7a30, intensity: 16, range: 11, flicker: 0.35 });
  }
  for (let z = NV.z0 - 9; z > NV.z1; z -= 9) L.chains.push({ x: X + rng.range(-2, 2), z, y0: 1.2 + rng.range(0, 1.5), y1: 14 });
  for (let z = NV.z1 + 4; z < NV.z0 - 6; z += 13) for (const sx of [-1, 1]) L.props.push({ t: 'bullHead', x: X + sx * (NV.hw + 0.3), z, r: sx > 0 ? -Math.PI / 2 : Math.PI / 2, y: 3.4 });
  // ---- Brokka's camp in a cold side forge: the dead hearth, her anvil, the waypoint ----
  {
    const toNave = Math.atan2(X - BR.x, 0) , back = toNave + Math.PI;
    const hx = BR.x + Math.sin(back) * 4.6, hz = BR.z;
    L.props.push({ t: 'coldForge', x: hx, z: hz, r: toNave }); blockCircle(L, hx, hz, 1.6);
    sp.camp = { x: BR.x, z: BR.z, r: BR.r };
    sp.waypoint = { x: BR.x + Math.sin(toNave) * 1.2, z: BR.z + 3.4 };
    L.lights.push({ x: sp.waypoint.x, y: 1.2, z: sp.waypoint.z, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
    sp.npcs = { brokka: { x: BR.x + Math.sin(back) * 1.6, z: BR.z - 2.6, r: toNave }, elati: { x: BR.x - Math.sin(back) * 0.6, z: BR.z - 3.6, r: toNave - 0.6 } };
    const bz = { x: BR.x + Math.sin(back) * 1.4, z: BR.z + 1.0 };
    L.props.push({ t: 'brazier', x: bz.x, z: bz.z }); blockCircle(L, bz.x, bz.z, 0.45);
    L.lights.push({ x: bz.x, y: 1.6, z: bz.z, color: 0xff8a40, intensity: 18, range: 10, flicker: 0.35 });
    L.props.push({ t: 'forgeClutter', m: 'anvil', x: BR.x + Math.sin(back) * 2.6, z: BR.z + 2.8, r: toNave, s: 1 });
    blockCircle(L, BR.x + Math.sin(back) * 2.6, BR.z + 2.8, 0.6);
    L.props.push({ t: 'bedroll', x: BR.x - Math.sin(back) * 1.4, z: BR.z - 1.0, r: 1.2 });
    L.props.push({ t: 'forgeClutter', m: 'toolRack', x: BR.x, z: BR.z - BR.r + 0.8, r: 0, s: 1 });
    mark(res, L, BR.x, BR.z, BR.r);
  }
  // ---- the Slag Rivers: bridges, slag dripping out of the dark, crane hoists, chains ----
  for (const b of L.bridges) if (!b.stair) mark(res, L, b.x, b.z, 3);
  // a crane is a girder ~12.5 m long at scale 1 (its hook side +z): it lies along a bank, all of it on floor, off the slag and the bridges
  // (claim = true: keep the dressing, and the other crane, off it)
  const craneFits = (x, z, r, s, claim) => {
    const cx = Math.cos(r), cz = -Math.sin(r), ux = Math.sin(r), uz = Math.cos(r);
    for (let t = -6.2 * s; t <= 6.2 * s; t += 0.5) for (let u = -1 * s; u <= 1.5 * s; u += 0.5) {
      const px = x + cx * t + ux * u, pz = z + cz * t + uz * u, i = cellAt(L, px, pz);
      if (claim) { res[i] = 1; continue; }
      if (!L.cells[i] || L.lava[i] || res[i]) return false;
      // nor across the walk up to a bridge
      if (L.bridges.some((b) => !b.stair && Math.abs(px - b.x) < b.w / 2 + 1.5 && Math.abs(pz - b.z) < 10)) return false;
    }
    return true;
  };
  // one each side of the hall, on any of the three banks; the biggest that fits. Their own dice: the two draws the cranes
  // always took from rng are all they take, so a saved seed lays out the rest of the Forge as it did before
  const crng = RNG(((rng.next() * 4294967296) ^ (rng.next() * 65536)) >>> 0);
  for (const side of [-1, 1]) {
    const tries = [];
    for (const s of [1.6, 1.4, 1.2, 1.0]) for (let k = 0; k < 60; k++) tries.push({ s, x: X + side * crng.range(3, SR.hw - 3), z: crng.range(SR.z0 + 1, SR.z1 - 1), r: (crng.chance(0.5) ? 0 : Math.PI) + crng.range(-0.15, 0.15) });
    const c = tries.find((c) => craneFits(c.x, c.z, c.r, c.s));
    if (c) { L.props.push({ t: 'crane', ...c }); craneFits(c.x, c.z, c.r, c.s, true); }
  }
  for (let k = 0; k < 7; k++) L.chains.push({ x: X + rng.range(-SR.hw + 3, SR.hw - 3), z: rng.range(SR.z0 + 2, SR.z1 - 2), y0: rng.range(2.5, 6), y1: 16 });
  // ---- the hub: an iron disc, a sigil over the north gallery ----
  for (const [x, z] of circleCells(L, HB.x, HB.z, HB.r)) L.fk[z * w + x] = 2;
  L.grates.push({ x: HB.x, z: HB.z, r: 0, w: 3.2, l: 3.2, g: -1 });
  // ---- galleries: flues, grates, pillars, stations ----
  G3.forEach((g, i) => {
    const mouth = gcell(g, g.len - 0.5, 0), dir = Math.atan2(-g.d[0], -g.d[1]);
    L.flues.push({ x: mouth.x, z: mouth.z, dir, len: g.len - 0.5, w: 5, period: 10, phase: rng.range(0, 10), gallery: i });
    L.props.push({ t: 'flueMouth', x: mouth.x, z: mouth.z, r: dir, g: i });
    L.grates.push({ x: mouth.x + Math.sin(dir) * 1.2, z: mouth.z + Math.cos(dir) * 1.2, r: dir, w: 4.2, l: 2.4, g: i });
    for (const u of [8, 15, 22]) { const p = gcell(g, u, 0); L.grates.push({ x: p.x, z: p.z, r: dir, w: 2.4, l: 1.4, g: i }); }
    mark(res, L, mouth.x, mouth.z, 2.5);
    for (const st of g.stations) {
      sp.stations.push({ x: st.x, z: st.z, flue: i, r: st.r });
      blockCircle(L, st.x, st.z, 0.4);
      L.props.push({ t: 'station', x: st.x, z: st.z, r: st.r, bx: st.bel.x, bz: st.bel.z });
      L.lights.push({ x: st.bel.x, y: 1.0, z: st.bel.z, color: 0xff6a20, intensity: 8, range: 7, flicker: 0.4, heat: true });
      L.packs.push({ x: st.x + Math.sin(st.r) * 1.6, z: st.z + Math.cos(st.r) * 1.6, n: 1, tag: 'stokers', station: sp.stations.length - 1, flue: i, elite: null });
      mark(res, L, st.x, st.z, 2.2);
    }
    // a slow light down the gallery from the grates, warming with the heat
    for (const u of [6, 18, 28]) { const p = gcell(g, u, 0); L.lights.push({ x: p.x, y: 1.8, z: p.z, color: 0xff5a18, intensity: 5, range: 8, flicker: 0.2, heat: true }); }
  });
  for (const p of pillars) { const x = snap(p.x), z = snap(p.z); L.cells[cellAt(L, x, z)] = 0; L.props.push({ t: 'forgePillar', x, z }); }
  // ---- the chambers: the Great Bellows, its fire-pit, Brokka's place at the handles, vents in the floor ----
  CH.forEach((c, i) => {
    const bx = c.x + Math.sin(c.back) * (c.r - 2.6), bz = c.z + Math.cos(c.back) * (c.r - 2.6);
    const px = c.x + Math.sin(c.back) * (c.r - 6.2), pz = c.z + Math.cos(c.back) * (c.r - 6.2);
    const side2 = c.back + (i === 2 ? ss : 1) * Math.PI / 2, pump = { x: bx + Math.sin(side2) * 3.3, z: bz + Math.cos(side2) * 3.3 };
    blockCircle(L, bx, bz, 2.0); blockCircle(L, px, pz, 0.9);
    const vents = [c.ent + 1.05, c.ent - 1.05, c.back + 1.0, c.back - 1.0].map((a) => ({ x: c.x + Math.sin(a) * (c.r - 1.4), z: c.z + Math.cos(a) * (c.r - 1.4), dir: a + Math.PI, len: c.r * 1.6 }));
    for (const v of vents) L.grates.push({ x: v.x, z: v.z, r: v.dir, w: 1.6, l: 1.6, g: -1 });
    sp.bellows.push({ x: c.x, z: c.z, r: c.r, id: i, doors: c.doors.map((d) => ({ x: d.x, z: d.z })), prop: { x: bx, z: bz, r: c.ent }, pit: { x: px, z: pz }, pump, vents });
    for (const d of c.doors) L.props.push({ t: 'doorway', x: d.rim.x, z: d.rim.z, r: d.a });
    L.lights.push({ x: px, y: 1.2, z: pz, color: 0xff6a20, intensity: 10, range: 9, flicker: 0.35, heat: true });
    mark(res, L, c.x, c.z, c.r);
    for (const d of c.doors) mark(res, L, d.x, d.z, 2);
  });
  // ---- the stair: steps up the curl, chains, the plug ----
  for (let k = 1; k < stair.length; k++) {
    const a = stair[k - 1], b = stair[k], n = Math.floor(Math.hypot(b.x - a.x, b.z - a.z) / 2.2), r = Math.atan2(b.x - a.x, b.z - a.z);
    for (let j = 0; j < n; j++) { const t = (j + 0.5) / n; L.props.push({ t: 'stairStep', x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, r }); }
  }
  mark(res, L, pc.x, pc.z, 3);
  for (const p of stair) mark(res, L, p.x, p.z, 2.5);
  // ---- the Anvil of the Crown ----
  {
    L.boss = { x: AN.x, z: AN.z, r: AN.r };
    sp.anvil = { x: AN.x, z: AN.z };
    for (const [x, z] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) L.cells[(AN.z + z) * w + AN.x + x] = 0;
    sp.cages = [{ x: AN.x - 10, z: AN.z, id: 'lord' }, { x: AN.x + 10, z: AN.z, id: 'king' }, { x: AN.x, z: AN.z - 10, id: 'lady' }];
    sp.ghosts = [1, 3, 5, 7].map((k) => ({ x: AN.x + Math.sin(k * Math.PI / 4) * 13, z: AN.z + Math.cos(k * Math.PI / 4) * 13 }));
    sp.isarn = { x: AN.x, z: AN.z + 3.4 };
    for (let z = Math.floor(AN.z - AN.r); z <= AN.z + AN.r; z++) for (let x = Math.floor(AN.x - AN.r); x <= AN.x + AN.r; x++) if (L.cells[z * w + x] && Math.hypot(x + 0.5 - AN.x, z + 0.5 - AN.z) < AN.r) L.paint[z * w + x] = 1;
    L.lights.push({ x: AN.x, y: 15, z: AN.z, color: 0xff6a30, intensity: 30, range: 32, flicker: 0.05, heat: true });
    L.lights.push({ x: MO.x, y: 0.6, z: MO.z, color: 0xff7a20, intensity: 14, range: 10, flicker: 0.3, heat: true });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; L.lights.push({ x: AN.x + Math.sin(a) * (AN.r + 1.3), y: 0.6, z: AN.z + Math.cos(a) * (AN.r + 1.3), color: 0xff4a10, intensity: 12, range: 9, flicker: 0.3, heat: true }); }
    mark(res, L, AN.x, AN.z, AN.r + 3);
  }
  // ---- the Hall of Moulds: crown-shaped casting pits, brood pools, the smiths' clutter ----
  {
    for (let k = 0; k < 3; k++) {
      for (let t = 0; t < 30; t++) {
        const x = HM.x + rng.range(-HM.hw + 3.5, HM.hw - 3.5), z = HM.z + rng.range(-HM.hd + 3.5, HM.hd - 3.5);
        if (sp.moulds.some((m) => Math.hypot(m.x - x, m.z - z) < 5.5) || sp.pools.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 3.5)) continue;
        if (circleCells(L, x, z, 2.4).some(([cx, cz]) => !L.cells[cz * w + cx])) continue;
        for (const [cx, cz] of circleCells(L, x, z, 1.5)) { const i = cz * w + cx; L.cells[i] = 0; L.low[i] = 1; }
        sp.moulds.push({ x, z, r: 1.5, rot: rng.range(0, 6.28) });
        L.props.push({ t: 'mould', x, z, r: rng.range(0, 6.28) });
        break;
      }
    }
    for (const p of sp.pools) { L.packs.push({ x: p.x + p.r + 1.6, z: p.z, n: rng.int(4, 6), tag: 'ticks', elite: null }); L.lights.push({ x: p.x, y: 0.5, z: p.z, color: 0xff4a10, intensity: 10, range: 8, flicker: 0.3, heat: true }); }
    L.packs.push({ x: HM.x, z: HM.z, n: rng.int(4, 6), tag: 'mouldHall', elite: rng.chance(0.6) ? 'rare' : 'champion' });
    const clut = ['anvil', 'tongs', 'quench', 'toolRack', 'stump', 'barrel', 'crossPein', 'barrel'];
    for (let k = 0; k < 16; k++) {
      const a = rng.range(0, 6.28), x = HM.x + Math.sin(a) * rng.range(HM.hw - 2.2, HM.hw - 1.2), z = HM.z + Math.cos(a) * rng.range(HM.hd - 2.2, HM.hd - 1.2);
      if (!isFloor(L, x, z) || res[cellAt(L, x, z)]) continue;
      const m = rng.pick(clut), sc = rng.range(0.9, 1.1);
      // (one piece to a place: two anvils dropped into each other read as a glitch; none on the ground sunk by a pit)
      if (L.props.some((q) => q.t === 'forgeClutter' && Math.hypot(q.x - x, q.z - z) < 1.6) || nearLow(L, cellAt(L, x, z))) continue;
      L.props.push({ t: 'forgeClutter', m, x, z, r: Math.atan2(HM.x - x, HM.z - z), s: sc });
      if (m !== 'tongs' && m !== 'crossPein') blockCircle(L, x, z, 0.5);
    }
    { const rare = rng.chance(0.6), c = chestSpot(L, null, HM.x + s * (HM.hw - 2), HM.z - HM.hd + 2.4); if (c) sp.chests.push({ ...c, rare }); } // (off the casting pits)
    sp.hall = { x: HM.x, z: HM.z, r: HM.hw };
    L.lights.push({ x: HM.x, y: 3, z: HM.z, color: 0xff7a30, intensity: 14, range: 14, flicker: 0.2, heat: true });
    for (let k = 0; k < 4; k++) L.chains.push({ x: HM.x + rng.range(-6, 6), z: HM.z + rng.range(-6, 6), y0: rng.range(2.5, 5), y1: 14 });
  }
  // ---- the smelters' workshop: crucibles gone cold, the smiths' benches, what they left ----
  {
    const toR = Math.atan2(X - WS.x, 0);
    for (let k = 0; k < 2; k++) {
      const a = toR + Math.PI + (k ? 0.75 : -0.75), mx = WS.x + Math.sin(a) * (WS.r - 2.3), mz = WS.z + Math.cos(a) * (WS.r - 2.3);
      if (circleCells(L, mx, mz, 2).some(([cx, cz]) => !L.cells[cz * w + cx])) continue;
      for (const [cx, cz] of circleCells(L, mx, mz, 1.2)) { const i = cz * w + cx; L.cells[i] = 0; L.low[i] = 1; }
      sp.moulds.push({ x: mx, z: mz, r: 1.2, rot: a });
      L.props.push({ t: 'mould', x: mx, z: mz, r: a, s: 0.8 });
    }
    for (const [m, a] of [['anvil', 0.4], ['quench', -0.5], ['toolRack', 1.5], ['barrel', -1.4], ['crossPein', 0.9]]) {
      const x = WS.x + Math.sin(toR + Math.PI + a * 1.6) * (WS.r - 1.3), z = WS.z + Math.cos(toR + Math.PI + a * 1.6) * (WS.r - 1.3);
      if (!isFloor(L, x, z) || nearLow(L, cellAt(L, x, z))) continue;
      L.props.push({ t: 'forgeClutter', m, x, z, r: Math.atan2(WS.x - x, WS.z - z), s: 1 });
      if (m !== 'crossPein') blockCircle(L, x, z, 0.5);
    }
    sp.chests.push({ x: WS.x + Math.sin(toR) * 1.5, z: WS.z + 1.6, rare: rng.chance(0.4) }); // (the nave side: the moulds are at the back)
    L.packs.push({ x: WS.x + Math.sin(toR) * 1.5, z: WS.z, n: rng.int(3, 5), tag: 'smiths', elite: rng.chance(0.4) ? 'champion' : null });
    L.lights.push({ x: WS.x, y: 2.4, z: WS.z, color: 0xff6a20, intensity: 10, range: 10, flicker: 0.25, heat: true });
    sp.workshop = { x: WS.x, z: WS.z, r: WS.r };
  }
  // ---- packs: smiths in the nave and over the rivers, a few dead dragged in to be reforged ----
  L.packs.push({ x: X, z: NV.z1 + 10, n: rng.int(3, 5), tag: 'smiths', elite: rng.chance(0.3) ? 'champion' : null });
  for (const dz of [5, SR.z1 - SR.z0 - 4]) L.packs.push({ x: X + rng.range(-12, 12), z: SR.z0 + dz, n: rng.int(4, 6), tag: 'smiths', elite: rng.chance(0.3) ? 'champion' : null });
  L.packs.push({ x: X - side * 14, z: (rivers[0] + rivers[1]) / 2, n: rng.int(3, 5), tag: 'ticks', elite: null });
  sp.chests.push({ x: X + side * (SR.hw - 4), z: (rivers[0] + rivers[1]) / 2, rare: false });
  // lava light and embers over every channel
  for (let z = 0; z < h; z += 3) for (let x = 0; x < w; x += 3) if (L.lava[z * w + x]) L.props.push({ t: 'fx', fx: 'lava', x: x + 0.5, y: 0, z: z + 0.5 });
  rivers.forEach((rz) => { for (let x = X - SR.hw + 4; x < X + SR.hw - 2; x += 7) L.lights.push({ x, y: 0.6, z: rz, color: 0xff5010, intensity: 11, range: 9, flicker: 0.3, heat: true }); });
  L.lights.push({ x: HB.x, y: 3, z: HB.z, color: 0xff7030, intensity: 10, range: 12, flicker: 0.15, heat: true });
  // Isarn's golden footprints, from the hall to the plug
  sp.trail = [{ x: X, z: NV.z0 - 4 }, { x: X, z: NV.z1 + 2 }, { x: L.bridges[0].x, z: rivers[0] }, { x: L.bridges[2].x, z: rivers[1] }, { x: HB.x, z: HB.z }, { x: X, z: CH[2].z + CH[2].r }, { x: CH[2].x, z: CH[2].z }, stair[0], { x: pc.x - Math.sin(pa) * 1.6, z: pc.z - Math.cos(pa) * 1.6 }];
  L.start = { x: S.x, z: S.z };
  L.exits.push({ x: S.x, z: h - 6, to: 'ashfield', label: 'exit.ashfield' });
  // ---- dressing: rubble and slag at the foot of the walls ----
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x, d = D[i];
    if (res[i] || L.low[i] || d === 255) continue;
    if (d === 0) {
      if (!L.cells[i]) continue;
      const edge = D[i - 1] === 1 || D[i + 1] === 1 || D[i - w] === 1 || D[i + w] === 1;
      const put = nearLow(L, i) ? () => {} : (p) => L.props.push(p); // (as in the Field: none where the floor sinks)
      if (edge && L.fk[i] !== 2 && rng.chance(0.05)) put({ t: 'slag', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.4, 0.8) });
      // fallen rock at the foot of the walls (never up on them, near the camera)
      else if (edge && L.fk[i] !== 2 && rng.chance(0.022)) L.props.push({ t: 'forgeRock', x: x + 0.5, z: z + 0.5, r: toFloor(L, D, x, z), s: rng.range(0.4, 0.75), y: -0.1 });
      continue;
    }
  }
  // ---- does it hold? the chambers, stations, flues, camp and plug in reach with the plug shut; the Anvil only past it ----
  const R0 = reach(L, L.start.x, L.start.z), far0 = (p, r = 2) => nearReach(L, R0, p.x, p.z, 5) > r;
  if (!last) {
    const need = [sp.camp, sp.waypoint, sp.npcs.brokka, sp.npcs.elati, ...sp.stations, ...L.flues, ...sp.chests, ...sp.moulds.map((m) => ({ x: m.x, z: m.z + 2.6 }))];
    for (const b of sp.bellows) need.push(b, b.pit, b.pump, ...b.doors, { x: b.prop.x + Math.sin(b.prop.r) * 3, z: b.prop.z + Math.cos(b.prop.r) * 3 });
    if (need.some((p) => far0(p, 2.4)) || far0(L.plug, 2.6) || L.packs.some((p) => far0(p, 3.5)) || L.exits.some((e) => far0(e, 1.5))) return null;
    if (nearReach(L, R0, AN.x, AN.z, 4) < 4 || nearReach(L, R0, se.x, se.z, 3) < 3) return null;
    const c1 = L.cells.slice(); for (const [x, z] of plugCells) c1[z * w + x] = 1;
    const R1 = reach(L, L.start.x, L.start.z, c1), far1 = (p, r) => nearReach(L, R1, p.x, p.z, 4) > r;
    if (far1({ x: AN.x, z: AN.z + 2 }, 1.5) || sp.cages.some((c) => far1(c, 1.5)) || sp.ghosts.some((g) => far1(g, 1.5)) || far1(sp.isarn, 1.2) || far1({ x: MO.x, z: MO.z - MO.r - 1 }, 1.5)) return null;
  }
  return L;
}
