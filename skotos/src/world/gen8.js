// Act VIII's layouts as plain data (docs/act8-design.md). Daylight, on gen7's frame (the same fields a gen7 layout
// carries, so build.js's ground, the Slide's lanes and Sun and Shade read it as they read the Meltwaters).
//   genTinder(seed)   112 x 184, NORTH at the top: the hero comes down from Whitecliff and walks south. The North Camp
//       (Halda, the waypoint), the South Road wandering down the middle, five pairs of stubble fields between dry-stone
//       walls (each with one gate on the road and one to the next field), three banked hearths in fields off the road,
//       the Threshing Floor at the south end (Aithon's arena).
// The fire's rule is in the layout: every field is closed by walls, the road and the frame's rock; no field touches the
// camp, and nothing that burns stands outside a field (docs/act8-design.md, The fire: the rules, 1).
//   L.fields   [{ id, x0, z0, x1, z1 (inner cells, inclusive), side: -1 west | 1 east, row, gate: { x, z }, hearth }]
//   L.walls    [{ x0, z0, x1, z1 }] runs of wall cells (one cell thick), for build8.js
//   L.flues    the Burn's lanes, kind 'burn' (forge.js): strips of standing stubble 5 wide down each field, the wind's way
//              (from the south wall north), 6 cells of reaped ground between two; each lies wholly inside its field
//   L.spots    camp, waypoint, npcs.halda, hearths [{ k: 1-3, x, z, field }], arena { x, z, r }, chests, sheaves [{ x, z }]
//   genVigil(seed)    96 x 176, NORTH at the top: the Vigil House, cut into the hill and built without windows. The Yard
//       (daylight, the waypoint, the way back to the plain), then three feeder halls one after the other, each with its
//       fire in the middle and a shut door in its south wall, then the Great Hall (Ragna's arena, the Flame at its centre).
//       A hall's fire banked opens that hall's south door (world.js closes the doors' cells on the map while they are shut).
//   L.halls    [{ k: 1-3, x0, z0, x1, z1 (inner cells, inclusive), fire: { x, z } }]
//   L.spots    camp, waypoint, fires [{ k, x, z }], doors [{ k, x, z, cells: [[x, z]] }], pillars [{ x, z }], arena, flame,
//              shutters [{ k: 1-8, x, z }] (where the Great Hall's daylight falls as each shutter comes down), chests
import { RNG, fbm } from '../core/util.js';
import { base } from './gen.js';
import { circleCells, snap, BED_DRY } from './genlib.js';
import { makeDraw } from './gen5.js';
import { daylight7, finish7, settle7 } from './gen7.js';

const ROCK = 0, LAND = 1;
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function genTinder(seed) {
  const rng = RNG(seed), w = 112, h = 184, N = w * h;
  const L = daylight7(base(w, h), 'tinder', seed), S = L.spots;
  Object.assign(S, { hearths: [], lookouts: [], chests: [], sheaves: [], huts: [], slabs: [], vaults: [], npcs: {} });
  L.fields = []; L.walls = []; L.own.level = 0;
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), res = new Uint8Array(N), own = new Uint8Array(N), T = L.trail;
  const { blockC, reserve, paintAt } = makeDraw(L, K, blk, res, rng);
  const I = (x, z) => Math.floor(z) * w + Math.floor(x);
  const XL = (z) => Math.floor(8.5 + 3 * fbm(z * 0.06, 0.5, seed + 3)), XR = (z) => Math.floor(103.5 - 3 * fbm(z * 0.06, 9.5, seed + 4));
  // ---- the floor: one long plain inside the frame ----
  for (let z = 8; z <= 176; z++) for (let x = XL(z); x <= XR(z); x++) K[z * w + x] = LAND;
  // ---- the landmarks ----
  const CP = { x: snap(56 + rng.range(-5, 5)), z: 17.5, r: 8 };
  const AR = { x: snap(56 + rng.range(-4, 4)), z: 158.5, r: 15 };
  // the road's bends, one per row of fields
  const ROWS = 5, Z0 = 32, RH = 21;                       // rows z 32..136, each 21 deep with its wall
  const bends = [{ x: CP.x, z: CP.z + 4 }];
  for (let r = 0; r <= ROWS; r++) bends.push({ x: snap(56 + rng.range(-7, 7)), z: Z0 + r * RH - 1.5 });
  bends.push({ x: AR.x, z: AR.z - AR.r + 2 });
  const road = [];
  for (let k = 1; k < bends.length; k++) { const a = bends[k - 1], b = bends[k], n = Math.ceil(hyp(a, b)); for (let j = k === 1 ? 0 : 1; j <= n; j++) road.push({ x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n }); }
  const roadX = (z) => { let best = road[0]; for (const p of road) if (Math.abs(p.z - z) < Math.abs(best.z - z)) best = p; return best.x; };
  for (const p of road) { for (const [x, z] of circleCells(L, p.x, p.z, 1.6)) T[z * w + x] = 1; paintAt(p.x, p.z, 2.1, 1); }
  L.road = road;
  // ---- the fields and their walls ----
  const wallRun = (x0, z0, x1, z1, gaps = []) => {
    // a run of wall cells along x or z, left open at its gaps ({ x, z } cells, each 3 wide along the run)
    const alongX = z0 === z1, cellsOf = [];
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (K[z * w + x] !== LAND || T[z * w + x]) continue;
      if (gaps.some((g) => (alongX ? Math.abs(x - g.x) <= 1 : Math.abs(z - g.z) <= 1))) continue;
      cellsOf.push([x, z]);
    }
    // split into unbroken runs for the builder
    let run = null;
    for (const [x, z] of cellsOf) {
      if (run && (alongX ? x === run.x1 + 1 : z === run.z1 + 1)) { run.x1 = x; run.z1 = z; } else { run = { x0: x, z0: z, x1: x, z1: z }; L.walls.push(run); }
      blk[z * w + x] = 1; res[z * w + x] = 1;
    }
  };
  // every row's two fields' wall columns first (a row's north wall closes the row above it too)
  const EXT = [];
  for (let r = 0; r < ROWS; r++) {
    const zt = Z0 + r * RH, zb = zt + RH - 1, row = {};
    let rx0 = 1e9, rx1 = -1e9; for (let z = zt; z <= zb + 1; z++) { rx0 = Math.min(rx0, roadX(z)); rx1 = Math.max(rx1, roadX(z)); }
    let xl = 0, xr = 1e9; for (let z = zt; z <= zb + 1; z++) { xl = Math.max(xl, XL(z)); xr = Math.min(xr, XR(z)); }
    row[-1] = { xi: xl + 1, xo: Math.floor(rx0) - 5 }; row[1] = { xi: Math.ceil(rx1) + 5, xo: xr - 1 };
    EXT.push(row);
    // (a field's far side is the hill itself: rock from its last furrow to the frame, wandering a cell or two)
    for (let z = zt; z <= zb + (r === ROWS - 1 ? 1 : 0); z++) { const j = Math.round(1.6 * fbm(z * 0.3, 2.5, seed + 9)); for (let x = 0; x < w; x++) if (x < row[-1].xi + j || x > row[1].xo - j) K[z * w + x] = ROCK; }
  }
  for (let r = 0; r < ROWS; r++) {
    const zt = Z0 + r * RH, zb = zt + RH - 1;                // the row's wall rows: zt (north); zb + 1 is the next row's north
    for (const side of [-1, 1]) {
      const { xi, xo } = EXT[r][side], up = r > 0 ? EXT[r - 1][side] : null, dn = r < ROWS - 1 ? EXT[r + 1][side] : null;
      const prev = L.fields.find((f) => f.row === r - 1 && f.side === side);
      const road = side < 0 ? xo : xi;
      const gate = { x: road, z: zt + 6 + rng.int(0, RH - 13) };                           // onto the road
      const px0 = Math.max(xi, dn ? dn.xi : xi) + 4, px1 = Math.min(xo, dn ? dn.xo : xo) - 4;
      const pass = dn && px1 > px0 ? { x: rng.int(px0, px1), z: zb + 1 } : null;           // to the next row's field
      wallRun(Math.min(xi, up ? up.xi : xi), zt, Math.max(xo, up ? up.xo : xo), zt, prev?.pass ? [prev.pass] : []);
      wallRun(road, zt + 1, road, zb, [gate]);
      if (r === ROWS - 1) wallRun(xi, zb + 1, xo, zb + 1, []);
      L.fields.push({ id: (side < 0 ? 'w' : 'e') + (r + 1), x0: xi + 1, z0: zt + 1, x1: xo - 1, z1: zb, side, row: r, gate, pass, hearth: 0 });
      paintAt(gate.x + 0.5, gate.z + 0.5, 2.2, 0.7);
    }
  }
  // ---- the camp, the arena ----
  for (const [x, z] of circleCells(L, CP.x, CP.z, CP.r)) K[z * w + x] = LAND;
  S.camp = CP; S.waypoint = { x: CP.x + 4, z: CP.z - 1 };
  S.npcs.halda = { x: CP.x - 2.5, z: CP.z - 0.5, rot: 1.9 }; S.npcs.fire = { x: CP.x - 4, z: CP.z + 1 };
  blockC(S.npcs.fire.x, S.npcs.fire.z, 0.45); reserve(CP.x, CP.z, CP.r);
  paintAt(CP.x, CP.z, 6, 0.8);
  L.start = { x: CP.x, z: CP.z - 2 };
  L.exits.push({ x: CP.x, z: CP.z - 6, to: 'town', label: 'exit.town' });
  for (const [x, z] of circleCells(L, AR.x, AR.z, AR.r)) { K[z * w + x] = LAND; res[z * w + x] = 1; }
  paintAt(AR.x, AR.z, 4.5, 1);
  S.arena = AR; L.boss = { x: AR.x, z: AR.z };
  S.hearth = { x: AR.x, z: AR.z - AR.r + 2.5 };
  // ---- the three banked hearths: in fields off the road, rows 1, 3 and 5, sides alternating ----
  const first = rng.chance(0.5) ? -1 : 1;
  [0, 2, 4].forEach((r, k) => {
    const f = L.fields.find((q) => q.row === r && q.side === (k % 2 ? -first : first)) || L.fields.find((q) => q.row === r);
    if (!f) return;
    const p = { k: k + 1, x: snap(f.side < 0 ? f.x0 + 4 + rng.range(0, 3) : f.x1 - 4 - rng.range(0, 3)), z: snap((f.z0 + f.z1) / 2 + rng.range(-3, 3)), field: f.id };
    f.hearth = p.k; S.hearths.push(p); reserve(p.x, p.z, 3); blockC(p.x, p.z, 0.6); paintAt(p.x, p.z, 3, 0.9);
  });
  // ---- sheaves (cover, and what the fields were reaped into), chests ----
  for (const f of L.fields) {
    const n = rng.int(3, 5);
    for (let a = 0, got = 0; a < 60 && got < n; a++) {
      const p = { x: snap(rng.range(f.x0 + 2, f.x1 - 2)), z: snap(rng.range(f.z0 + 2, f.z1 - 2)) }, i = I(p.x, p.z);
      if (res[i] || blk[i] || S.sheaves.some((q) => hyp(q, p) < 5) || Math.hypot(p.x - f.gate.x, p.z - f.gate.z) < 4) continue;
      S.sheaves.push({ ...p, field: f.id }); blk[i] = 1; reserve(p.x, p.z, 1.2); got++;
    }
  }
  for (const f of [L.fields[1], L.fields[4], L.fields[L.fields.length - 2]]) if (f) {
    const p = { x: snap(f.side < 0 ? f.x0 + 2 : f.x1 - 2), z: snap(f.z1 - 2) };
    if (!res[I(p.x, p.z)] && !blk[I(p.x, p.z)]) { S.chests.push(p); reserve(p.x, p.z, 1.5); }
  }
  // ---- the Burn's lanes: strips of standing stubble, south wall to north wall, never through a hearth's ring or a gate ----
  for (const f of L.fields) {
    const span = f.x1 - f.x0 + 1, n = Math.max(1, Math.floor((span - 4) / 11)), x0 = f.x0 + 2 + Math.floor((span - 4 - (n * 11 - 6)) / 2);
    for (let k = 0; k < n; k++) {
      const cx = x0 + k * 11 + 2.5, hz = S.hearths.find((q) => q.field === f.id);
      if (hz && Math.abs(hz.x - cx) < 6.5) continue;
      if (Math.abs(f.gate.x - cx) < 5) continue;
      if ([f.pass, L.fields.find((q) => q.row === f.row - 1 && q.side === f.side)?.pass].some((g) => g && Math.abs(g.x + 0.5 - cx) < 4.5)) continue;
      // (the sheaves in a lane move out of it: nothing blocks the fire's sight down its own lane)
      for (const sh of S.sheaves) if (sh.field === f.id && Math.abs(sh.x - cx) < 3.2) { blk[I(sh.x, sh.z)] = 0; sh.x = snap(cx + (sh.x < cx ? -4.5 : 4.5)); if (!blk[I(sh.x, sh.z)] && sh.x > f.x0 && sh.x < f.x1) blk[I(sh.x, sh.z)] = 1; else sh.gone = true; }
      L.flues.push({ id: f.id + '.' + (k + 1), kind: 'burn', field: f.id, x: cx, z: f.z1 + 0.5, dir: Math.PI, len: f.z1 - f.z0, w: 5, cover: [] });
    }
  }
  S.sheaves = S.sheaves.filter((q) => !q.gone);
  // the Floor's own strips (`boss`: Aithon's Furrow takes them, never a gust): three down it and three across, so that
  // what has burnt crosses what has not, and the black is somewhere to stand
  for (const o of [-9, 0, 9]) {
    const half = Math.floor(Math.sqrt(AR.r * AR.r - o * o)) - 1;
    L.flues.push({ id: 'floor.n' + o, kind: 'burn', boss: true, field: 'floor', x: AR.x + o, z: AR.z + half, dir: Math.PI, len: half * 2, w: 5, cover: [] });
    L.flues.push({ id: 'floor.e' + o, kind: 'burn', boss: true, field: 'floor', x: AR.x - half, z: AR.z + o, dir: Math.PI / 2, len: half * 2, w: 5, cover: [] });
  }
  finish7(L, K, bed, blk, own, (vx, vz) => 2.2 + 2.6 * fbm(vx * 0.05, vz * 0.05, seed + 41));
  // ---- the packs: one or two a field, never in the hearth's ring, and two on the road ----
  const openAt = (x, z) => !!L.cells[I(x, z)];
  for (const f of L.fields) {
    for (let k = 0, n = f.hearth ? 1 : 2; k < n; k++) for (let a = 0; a < 80; a++) {
      const p = { x: snap(rng.range(f.x0 + 3, f.x1 - 3)), z: snap(rng.range(f.z0 + 3, f.z1 - 3)) };
      if (!openAt(p.x, p.z) || res[I(p.x, p.z)] || L.packs.some((q) => hyp(q, p) < 11) || S.hearths.some((q) => hyp(q, p) < 8)) continue;
      // (the first row is the plain's own wolves; from the second the Order's students hold the fields)
      L.packs.push({ x: p.x, z: p.z, n: rng.int(4, 6), tag: f.row === 0 ? 'plainWolves' : 'order', elite: rng.chance(0.15) ? 'champion' : null, area: f.id });
      break;
    }
  }
  // (and the Procession's rearguard on the road itself, by the last two rows and before the Floor)
  for (const zr of [Z0 + 3 * RH + 8, Z0 + 4 * RH + 10, AR.z - AR.r - 7]) { const p = { x: snap(roadX(zr)), z: snap(zr) }; if (openAt(p.x, p.z) && L.packs.every((q) => hyp(q, p) > 9)) L.packs.push({ x: p.x, z: p.z, n: rng.int(4, 5), tag: 'orderRoad', elite: null, area: 'road', trail: true }); }
  settle7(L);
  L.refuges = [];
  return L;
}

export function genVigil(seed) {
  const rng = RNG(seed), w = 96, h = 176, N = w * h;
  const L = daylight7(base(w, h), 'vigil', seed), S = L.spots;
  Object.assign(S, { hearths: [], lookouts: [], chests: [], sheaves: [], huts: [], slabs: [], vaults: [], npcs: {}, fires: [], doors: [], pillars: [], shutters: [] });
  L.fields = []; L.walls = []; L.halls = []; L.clouds = []; L.own.level = 0;
  const K = new Uint8Array(N), bed = new Float32Array(N).fill(BED_DRY), blk = new Uint8Array(N), res = new Uint8Array(N), own = new Uint8Array(N), T = L.trail;
  const { blockC, reserve, paintAt } = makeDraw(L, K, blk, res, rng);
  const I = (x, z) => Math.floor(z) * w + Math.floor(x);
  const rect = (x0, z0, x1, z1) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) K[z * w + x] = LAND; };
  // ---- the Yard ----
  const CP = { x: 48.5, z: 17.5, r: 9 };
  for (const [x, z] of circleCells(L, CP.x, CP.z, CP.r)) K[z * w + x] = LAND;
  S.camp = CP; S.waypoint = { x: CP.x + 4.5, z: CP.z - 1 }; reserve(CP.x, CP.z, CP.r); paintAt(CP.x, CP.z, 6, 0.8);
  L.start = { x: CP.x, z: CP.z - 3 };
  L.exits.push({ x: CP.x, z: CP.z - 7, to: 'tinder', label: 'exit.tinderBack' });
  // ---- the three halls and the passages between them ----
  const HZ = [36, 68, 100], HD = 25;                         // each hall's first row and its depth
  let px = Math.floor(CP.x);                                  // the passage that comes into the hall, by its column
  rect(px - 1, Math.floor(CP.z + CP.r) - 1, px + 1, HZ[0] - 1);
  for (let z = Math.floor(CP.z + CP.r) - 1; z < HZ[0]; z++) for (let x = px - 1; x <= px + 1; x++) { T[z * w + x] = 1; res[z * w + x] = 1; }
  for (let k = 0; k < 3; k++) {
    const cx = 48 + rng.int(-5, 5), x0 = cx - 15, x1 = cx + 15, z0 = HZ[k], z1 = HZ[k] + HD;
    rect(x0, z0, x1, z1);
    const fire = { k: k + 1, x: cx + 0.5 + rng.int(-3, 3), z: z0 + 12.5 + rng.int(-2, 2) };
    L.halls.push({ k: k + 1, x0, z0, x1, z1, fire }); S.fires.push(fire);
    reserve(fire.x, fire.z, 3.5); blockC(fire.x, fire.z, 0.6); paintAt(fire.x, fire.z, 3.5, 0.9);
    // the way in stays clear
    for (let z = z0; z <= z0 + 3; z++) for (let x = px - 2; x <= px + 2; x++) res[z * w + x] = 1;
    // the door out: in the south wall, a passage 3 wide and 6 deep to the next hall (or to the Great Hall's ring)
    const dx = k === 2 ? 48 : clampI(48 + rng.int(-8, 8), x0 + 4, x1 - 4), zt = z1 + 1, zb = k === 2 ? zt + 9 : HZ[k + 1] - 1;
    rect(dx - 1, zt, dx + 1, zb);
    const cells = []; for (let x = dx - 1; x <= dx + 1; x++) for (let z = zt + 1; z <= zt + 2; z++) cells.push([x, z]);
    for (let z = zt; z <= zb; z++) for (let x = dx - 1; x <= dx + 1; x++) { T[z * w + x] = 1; res[z * w + x] = 1; }
    for (let z = z1 - 3; z <= z1; z++) for (let x = dx - 2; x <= dx + 2; x++) res[z * w + x] = 1;
    S.doors.push({ k: k + 1, x: dx + 0.5, z: zt + 2, cells });
    // pillars: cover in two rows, never by the fire or the doors
    for (const pz of [z0 + 6, z0 + 19]) for (const ox of [-10, -4, 4, 10]) {
      const p = { x: cx + ox + rng.int(-1, 1), z: pz + rng.int(-1, 1) };
      if (res[I(p.x, p.z)] || res[I(p.x + 1, p.z + 1)] || hyp(p, fire) < 6) continue;
      for (const [ax, az] of [[0, 0], [1, 0], [0, 1], [1, 1]]) blk[(p.z + az) * w + p.x + ax] = 1;
      S.pillars.push({ x: p.x + 1, z: p.z + 1, hall: k + 1 });
    }
    // the hall's people: two packs, one each side of the fire; the last hall's second is led by a champion
    for (const side of [-1, 1]) {
      let p = null;
      for (let t = 0; t < 40 && !p; t++) { const q = { x: snap(cx + side * rng.int(6, 11)), z: snap(z0 + (side < 0 ? rng.int(7, 12) : rng.int(13, 19))) }; if (!blk[I(q.x, q.z)] && hyp(q, fire) > 5) p = q; }
      if (!p) p = { x: snap(cx + side * 8), z: snap(z0 + 12) };
      L.packs.push({ x: p.x, z: p.z, n: rng.int(4, 5) + (k > 0 ? 1 : 0), tag: 'vigil', elite: k === 2 && side > 0 ? 'champion' : null, area: 'hall' + (k + 1) });
    }
    if (k > 0) { const c = { x: snap(rng.chance(0.5) ? x0 + 2 : x1 - 2), z: snap(z1 - 2) }; if (!res[I(c.x, c.z)] && !blk[I(c.x, c.z)]) { S.chests.push(c); reserve(c.x, c.z, 1.5); } }
    px = dx;
  }
  // ---- the Great Hall: a ring, the Flame at its centre, eight shutters round it ----
  const AR = { x: 48.5, z: HZ[2] + HD + 9 + 14.5, r: 15 };
  for (const [x, z] of circleCells(L, AR.x, AR.z, AR.r)) { K[z * w + x] = LAND; res[z * w + x] = 1; }
  S.arena = AR; L.boss = { x: AR.x, z: AR.z, r: AR.r };
  S.flame = { x: AR.x, z: AR.z }; blockC(AR.x, AR.z, 0.6); paintAt(AR.x, AR.z, 5, 1);
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; S.shutters.push({ k: k + 1, x: AR.x + Math.sin(a) * 9, z: AR.z + Math.cos(a) * 9 }); }
  finish7(L, K, bed, blk, own, (vx, vz) => 3.2 + 2.2 * fbm(vx * 0.05, vz * 0.05, seed + 41));
  settle7(L);
  L.refuges = [];
  return L;
}
function clampI(v, a, b) { return Math.max(a, Math.min(b, v)); }
