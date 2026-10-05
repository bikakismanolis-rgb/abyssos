// Act III layouts as plain data: the Weeping Woods (an autumn held still, west of Whitecliff) and the Heartwood (the
// root caves under and inside the First Oak). Besides cells/paint they carry
//   L.low, L.amberDeep  the Amber Mere and the amber channels: holes in the floor that block feet, not eyes or arrows
//   L.sap               walkable sap (it slows, then amber-locks the hero: game/sap.js)
//   L.deck              decks over the amber (the Fallen King, root bridges): walkable, drawn by their props
// and the story spots of the Act III contract (tears, npcs, glade, stones, rootGate, deer, lanternglade, thorns, ...).
import { RNG, clamp, fbm, angleDiff } from '../core/util.js';
import { base, carveCircle, carveLine, smoothCells, distField, blockCircle } from './gen.js';

// height of the Heartwood's root walls over a solid cell d cells from the floor (build.js raises the ground by it)
export const heartWallH = (d) => 4.2 * (1 - Math.exp(-0.6 * d));

// ---------- helpers ----------
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// steer a trail walker from st toward (tx, tz), carving as it goes; it never heads back south for long
function walkTo(L, st, tx, tz, rng, trail, o) {
  const { rMin, rMax, paint = 1.7, wob = 0.2, seed } = o;
  for (let g = 0; g < 700; g++) {
    const d = Math.hypot(tx - st.x, tz - st.z);
    if (d < 2.5) break;
    const want = Math.atan2(tx - st.x, tz - st.z);
    st.ang += angleDiff(st.ang, want) * (d < 14 ? 0.3 : 0.11) + rng.range(-wob, wob);
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
// 4-neighbour steps from the masked cells, capped
function distFrom(L, mask, cap = 12) {
  const { w, h } = L, d = new Uint8Array(w * h).fill(255), q = [];
  for (let i = 0; i < w * h; i++) if (mask[i]) { d[i] = 0; q.push(i); }
  for (let head = 0; head < q.length; head++) {
    const i = q[head], x = i % w, z = (i - x) / w;
    if (d[i] >= cap) continue;
    for (const [dx, dz] of N4) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const n = nz * w + nx; if (d[n] > d[i] + 1) { d[n] = d[i] + 1; q.push(n); }
    }
  }
  return d;
}
// floor cells reachable on foot from (x, z)
function reach(L, x, z) {
  const { w, h, cells } = L, seen = new Uint8Array(w * h), s = Math.floor(z) * w + Math.floor(x);
  if (!cells[s]) return seen;
  const q = [s]; seen[s] = 1;
  for (let head = 0; head < q.length; head++) {
    const i = q[head], cx = i % w, cz = (i - cx) / w;
    for (const [dx, dz] of N4) {
      const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const n = nz * w + nx; if (cells[n] && !seen[n]) { seen[n] = 1; q.push(n); }
    }
  }
  return seen;
}
// floor cells of a band across a passage (along its axis |along| <= ha, across it |across| <= hc), grown from p so a
// wall or a channel only ever cuts the passage it stands in, never a neighbouring room
function bandCells(L, p, ang, ha, hc, wob) {
  const { w, h, cells } = L, fx = Math.sin(ang), fz = Math.cos(ang);
  const inBand = (x, z) => {
    const dx = x + 0.5 - p.x, dz = z + 0.5 - p.z, along = dx * fx + dz * fz, across = dx * fz - dz * fx;
    return Math.abs(along + (wob ? wob(x, z) : 0)) <= ha && Math.abs(across) <= hc;
  };
  const s = Math.floor(p.z) * w + Math.floor(p.x), seen = new Set([s]), q = [s], out = [];
  for (let head = 0; head < q.length; head++) {
    const i = q[head], x = i % w, z = (i - x) / w;
    if (!cells[i] || !inBand(x, z)) continue;
    out.push([x, z]);
    for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && !seen.has(n)) { seen.add(n); q.push(n); } }
  }
  return out;
}
// the cells a circle covers (closed to walking by the caller)
function circleCells(L, cx, cz, r) {
  const out = [];
  for (let z = Math.floor(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++)
    if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= r && x >= 0 && z >= 0 && x < L.w && z < L.h) out.push([x, z]);
  return out;
}
const mark = (m, L, cx, cz, r) => { for (const [x, z] of circleCells(L, cx, cz, r)) m[z * L.w + x] = 1; };
// which way the floor lies from a solid cell (root masses and faces turn toward it)
function toFloor(L, D, xx, zz) {
  let bx = 0, bz = 0;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const c = D[clamp(zz + dz, 0, L.h - 1) * L.w + clamp(xx + dx, 0, L.w - 1)]; if (c < D[zz * L.w + xx]) { bx += dx; bz += dz; } }
  return Math.atan2(bx, bz);
}

// ======================= WEEP: the Weeping Woods =======================
// South to north: the Edge of Tears (the frozen deer), Tear 1 in the sentinels' clearing, the Amber Mere with the Fallen
// King and the island of Tear 2, the Lanternglade (waypoint, Elati, Old Linden), Tear 3 in the hollow of dead trees,
// and the Glade of Stones with the Root Gate on its north edge.
export function genWeep(seed, o = {}) {
  const rng = RNG(seed);
  const w = o.w || 112, h = o.h || 176, N = w * h;
  const L = base(w, h);
  L.type = 'weep'; L.seed = seed;
  L.low = new Uint8Array(N); L.amberDeep = new Uint8Array(N); L.sap = new Uint8Array(N); L.deck = new Uint8Array(N);
  L.spots.tears = []; L.spots.shrines = []; L.spots.chests = []; L.weepers = []; L.lanterns = []; L.stones = [];
  const res = new Uint8Array(N); // cells kept clear of dressing (features stand there)
  const TR = { rMin: 3.4, rMax: 6.5, seed };
  // landmarks
  const S = { x: w / 2 + rng.range(-8, 8), z: h - 9 };
  const M = { x: w / 2 + rng.range(-9, 9), z: 115 + rng.range(-1.5, 1.5), rx: rng.range(12.5, 13.6), rz: rng.range(7.6, 8.4) };
  const LG = { x: clamp(w / 2 + rng.range(-15, 15), 24, w - 24), z: 86 + rng.range(-1.5, 1.5), r: 11 };
  const GS = { x: clamp(w / 2 + rng.range(-12, 12), 26, w - 26), z: 29, r: 14 };
  const entryA = rng.sign() * 0.349; // the trail comes into the Glade of Stones 20 degrees off due south
  // ---- the trail ----
  const trail = [], st = { x: S.x, z: S.z, ang: Math.PI };
  carveCircle(L, S.x, S.z + 1, 6.5);
  const go = (x, z) => walkTo(L, st, x, z, rng, trail, TR);
  go(clamp(S.x + rng.range(-14, 14), 18, w - 18), 147);
  const sS = { x: M.x, z: M.z + M.rz + 3.5 }, sN = { x: M.x, z: M.z - M.rz - 3.5 };
  go(sS.x, sS.z);
  // straight over the Fallen King (these cells become its deck)
  for (let z = sS.z - 1; z > sN.z; z--) trail.push({ x: M.x, z, mere: true });
  st.x = sN.x; st.z = sN.z; st.ang = Math.PI;
  carveCircle(L, sS.x, sS.z, 4.2); carveCircle(L, sN.x, sN.z, 4.2);
  // the long way round the mere, both sides
  for (const sx of [-1, 1]) for (let a = 0; a <= Math.PI + 0.01; a += 0.035) {
    const x = M.x + sx * Math.sin(a) * (M.rx + 4.6), z = M.z + Math.cos(a) * (M.rz + 4.2);
    carveCircle(L, x, z, 3.0 + fbm(x * 0.08, z * 0.08, seed + 3) * 1.6);
    carveCircle(L, x, z, 1.4, 0.8);
  }
  go(LG.x + rng.range(-3, 3), LG.z + LG.r - 1.5);
  go(LG.x + rng.range(-3, 3), LG.z - LG.r + 1.5);
  go(clamp(w / 2 + rng.range(-22, 22), 18, w - 18), 62);
  const GE = { x: GS.x + Math.sin(entryA) * (GS.r + 1.5), z: GS.z + Math.cos(entryA) * (GS.r + 1.5) };
  go(GE.x, GE.z);
  L.trail = trail;
  carveCircle(L, LG.x, LG.z, LG.r);
  carveCircle(L, GS.x, GS.z, GS.r);
  L.start = { x: S.x, z: h - 8 };
  const idxAtZ = (z) => { let b = 0, bd = 1e9; trail.forEach((t, i) => { if (!t.mere && Math.abs(t.z - z) < bd) { bd = Math.abs(t.z - z); b = i; } }); return b; };
  // ---- clearings off the trail ----
  const clearings = [];
  const inMere = (x, z, pad) => ((x - M.x) / (M.rx + pad)) ** 2 + ((z - M.z) / (M.rz + pad)) ** 2 < 1;
  const okSpot = (cx, cz, r) => cx > r + 6 && cx < w - r - 6 && cz > GS.z + GS.r + r + 3 && cz < h - 22 - r
    && Math.hypot(cx - LG.x, cz - LG.z) > LG.r + r + 5 && !inMere(cx, cz, 6 + r)
    && clearings.every((c) => Math.hypot(c.x - cx, c.z - cz) > c.r + r + 4);
  const branch = (t, dir, kind, dd, rr) => {
    for (let k = 0; k < 16; k++) {
      const a = dir + (k % 2 ? Math.PI : 0) + rng.range(-0.5, 0.5);
      const d = rng.range(dd[0], dd[1]), r = rng.range(rr[0], rr[1]), cx = t.x + Math.sin(a) * d, cz = t.z + Math.cos(a) * d;
      if (!okSpot(cx, cz, r)) continue;
      carveLine(L, t.x, t.z, cx, cz, r < 4.5 ? 2.2 : 2.6, 0.6);
      carveCircle(L, cx, cz, r);
      const c = { x: cx, z: cz, r, kind, from: { x: t.x, z: t.z } };
      clearings.push(c); return c;
    }
    return null;
  };
  const sideOf = (i) => { const t = trail[i], t2 = trail[Math.min(i + 2, trail.length - 1)]; return Math.atan2(t2.x - t.x, t2.z - t.z) + rng.sign() * Math.PI / 2; };
  const fromTrail = (z, kind, dd = [10, 15], rr = [5.5, 8]) => { const i0 = idxAtZ(z); for (const off of [0, 3, -3, 6, -6, 9, -9]) { const i = clamp(i0 + off, 2, trail.length - 3); if (trail[i].mere) continue; const c = branch(trail[i], sideOf(i), kind, dd, rr); if (c) { c.trailIdx = i; return c; } } return null; };
  const T1 = fromTrail(137, 'planting', [10, 14], [6.5, 8]);
  const T3 = fromTrail(66, 'breaking', [10, 14], [6.5, 8]);
  // the grove of weepers, the mourners' ring and the bear's den come first; the rest as the seed falls
  const kinds = rng.shuffle(['weepers', 'mourners', 'den']).concat(rng.shuffle(['hollow', 'moths', 'rootlings', 'sentinels']));
  let kn = 0;
  // two off the mere's shore paths, the rest off the trail
  for (const sx of rng.shuffle([-1, 1])) { const c = branch({ x: M.x + sx * (M.rx + 4.6), z: M.z }, sx * Math.PI / 2, kinds[kn], [9, 13], [5.5, 7.5]); if (c) kn++; }
  for (let i = 10; i < trail.length - 8 && kn < 7; i += rng.int(8, 13)) {
    const t = trail[i];
    if (t.mere || Math.hypot(t.x - LG.x, t.z - LG.z) < LG.r + 5 || t.z > h - 24) continue;
    if (clearings.some((c) => c.trailIdx !== undefined && Math.abs(c.trailIdx - i) < 6)) continue;
    const c = branch(t, sideOf(i), kinds[kn], [10, 15], [5.5, 8]);
    if (c) { c.trailIdx = i; kn++; }
  }
  // minor Tears in small nooks (2-3 a seed)
  const nooks = [];
  const nNook = rng.int(2, 3);
  for (const z of rng.shuffle([156, 150, 140, 102, 78, 70, 58, 50])) { if (nooks.length >= nNook) break; const c = fromTrail(z, 'nook', [7, 9.5], [3.4, 4.0]); if (c) nooks.push(c); }
  smoothCells(L, 2);
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) if (xx < 3 || zz < 3 || xx >= w - 3 || zz >= h - 3) L.cells[zz * w + xx] = 0;
  // ---- the Root Gate: a doorway in the glade's north edge, and a little of the dark beyond ----
  const RG = { x: GS.x, z: GS.z - GS.r - 0.6 };
  carveLine(L, RG.x, GS.z - GS.r + 2, RG.x, RG.z - 4, 2.7);
  const gateCells = [];
  for (let z = Math.floor(RG.z - 1.2); z <= Math.floor(RG.z + 0.8); z++) for (let x = Math.floor(RG.x - 4); x <= RG.x + 4; x++) if (L.cells[z * w + x]) { L.cells[z * w + x] = 0; gateCells.push([x, z]); }
  L.spots.rootGate = { x: RG.x, z: RG.z, r: 0, cells: gateCells };
  mark(res, L, RG.x, RG.z, 5.5);
  L.props.push({ t: 'rootArch', x: RG.x, z: RG.z });
  L.exits.push({ x: RG.x, z: RG.z + 2.1, to: 'heart', label: 'exit.heart', locked: 'hart' });
  L.lights.push({ x: RG.x, y: 3.2, z: RG.z + 1.2, color: 0xffb050, intensity: 10, range: 10, flicker: 0.06 });
  // ---- the Amber Mere: low amber cells, the Fallen King's deck straight across, Tear 2's island beside it ----
  const isl = { x: M.x + rng.sign() * 4.8, z: M.z + rng.range(-1.2, 1.2), r: 3.3 };
  for (let z = Math.floor(M.z - M.rz - 2); z <= M.z + M.rz + 2; z++) for (let x = Math.floor(M.x - M.rx - 2); x <= M.x + M.rx + 2; x++) {
    const cx = x + 0.5, cz = z + 0.5, e = Math.hypot((cx - M.x) / M.rx, (cz - M.z) / M.rz) + (fbm(cx * 0.12, cz * 0.12, seed + 11) - 0.5) * 0.22;
    if (e > 1) continue;
    const i = z * w + x;
    L.paint[i] = 0;
    if (Math.abs(cx - M.x) < 1.6) { L.cells[i] = 1; L.deck[i] = 1; continue; }
    if (Math.hypot(cx - isl.x, cz - isl.z) < isl.r + (fbm(cx * 0.3, cz * 0.3, seed + 5) - 0.5) * 1.2) { L.cells[i] = 1; continue; }
    L.cells[i] = 0; L.low[i] = 1; L.amberDeep[i] = 1;
  }
  // the island always touches the deck: the Fallen King's flank rests on it
  for (let z = Math.floor(isl.z - 1); z <= Math.floor(isl.z + 1); z++) for (let x = Math.floor(Math.min(M.x, isl.x)); x <= Math.max(M.x, isl.x); x++) { const i = z * w + x; if (L.low[i]) { L.cells[i] = 1; L.low[i] = 0; L.amberDeep[i] = 0; } }
  L.spots.mere = { x: M.x, z: M.z, rx: M.rx, rz: M.rz };
  L.spots.fallenKing = { x: M.x, z: M.z, len: 2 * M.rz + 10, w: 4.6 };
  L.spots.island = { x: isl.x, z: isl.z, r: isl.r };
  mark(res, L, M.x, sS.z - 1, 3); mark(res, L, M.x, sN.z + 1, 3);
  const D = distField(L, 12);
  L.dist = D;
  const DM = distFrom(L, L.low, 5);
  // sap: the mere's shores, and patches where it has bled out of the ground
  for (let z = 3; z < h - 3; z++) for (let x = 3; x < w - 3; x++) {
    const i = z * w + x; if (!L.cells[i] || L.deck[i]) continue;
    const cx = x + 0.5, cz = z + 0.5;
    if (Math.hypot(cx - sS.x, cz - sS.z) < 2.6 || Math.hypot(cx - sN.x, cz - sN.z) < 2.6) continue;
    if (DM[i] <= 3 && fbm(cx * 0.15, cz * 0.15, seed + 21) > 0.36 + DM[i] * 0.05) { L.sap[i] = 1; continue; }
    const far = Math.hypot(cx - LG.x, cz - LG.z) > LG.r + 2 && Math.hypot(cx - GS.x, cz - GS.z) > GS.r + 2 && cz < h - 22;
    if (far && L.paint[i] < 0.12 && fbm(cx * 0.07, cz * 0.07, seed + 31) > 0.67) L.sap[i] = 1;
  }
  // ---- the Glade of Stones: nine standing stones on a ring, gaps at the trail and at the Root Gate ----
  L.spots.glade = { x: GS.x, z: GS.z, r: GS.r };
  L.boss = { x: GS.x, z: GS.z };
  for (let k = 0; k < 9; k++) {
    const a = k * (Math.PI * 2 / 9), x = Math.round(GS.x + Math.sin(a) * 10), z = Math.round(GS.z + Math.cos(a) * 10);
    const cells = circleCells(L, x, z, 0.9);
    for (const [cx, cz] of cells) L.cells[cz * w + cx] = 0;
    L.stones.push({ x, z, cells, r: a + rng.range(-0.4, 0.4), s: rng.range(0.95, 1.15), kind: k % 3 === 1 ? 'B' : 'A' });
    mark(res, L, x, z, 1.8);
  }
  L.props.push({ t: 'fx', fx: 'lowmist', x: GS.x, y: 0.2, z: GS.z, s: 2.2 }, { t: 'fx', fx: 'lowmist', x: GS.x - 7, y: 0.2, z: GS.z + 4, s: 1.4 }, { t: 'fx', fx: 'lowmist', x: GS.x + 7, y: 0.2, z: GS.z - 3, s: 1.4 });
  mark(res, L, GS.x, GS.z, 6);
  // ---- the Lanternglade: twelve rooted Evergreen in a ring, their lanterns hung on their arms ----
  L.spots.lanternglade = { x: LG.x, z: LG.z, r: LG.r };
  let iIn = -1, iOut = -1;
  trail.forEach((t, i) => { if (Math.hypot(t.x - LG.x, t.z - LG.z) < LG.r) { if (iIn < 0) iIn = i; iOut = i; } });
  const aIn = Math.atan2(trail[Math.max(iIn - 2, 0)].x - LG.x, trail[Math.max(iIn - 2, 0)].z - LG.z);
  const aOut = Math.atan2(trail[Math.min(iOut + 2, trail.length - 1)].x - LG.x, trail[Math.min(iOut + 2, trail.length - 1)].z - LG.z);
  // spread evenly over the two arcs the trail leaves free
  const gap = 0.44, span = ((aOut - aIn) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const u1 = Math.max(0, span - 2 * gap), u2 = Math.max(0, Math.PI * 2 - span - 2 * gap), step = (u1 + u2) / 12;
  const ring = [];
  for (let k = 0; k < 12; k++) { const s0 = (k + 0.5) * step; ring.push(s0 < u1 ? aIn + gap + s0 : aOut + gap + (s0 - u1)); }
  const ringTrees = ring.map((a) => {
    const x = LG.x + Math.sin(a) * 9.4, z = LG.z + Math.cos(a) * 9.4;
    L.props.push({ t: 'wtree', x, z, r: a + Math.PI, s: rng.range(0.95, 1.1) });
    blockCircle(L, x, z, 0.85); mark(res, L, x, z, 2);
    // the lantern hangs on the glade side of the tree, at about head height
    const lx = x - Math.sin(a) * 1.9 + Math.cos(a) * rng.range(-0.6, 0.6), lz = z - Math.cos(a) * 1.9 - Math.sin(a) * rng.range(-0.6, 0.6);
    L.lanterns.push({ x: lx, y: rng.range(2.5, 3.0), z: lz });
    return { x, z, a };
  });
  L.lanterns.forEach((l, k) => { if (k % 2 === 0) L.lights.push({ x: l.x, y: l.y - 0.2, z: l.z, color: 0xd8f080, intensity: 11, range: 10, flicker: 'seed' }); });
  L.props.push({ t: 'fx', fx: 'motes', x: LG.x, y: 1.6, z: LG.z, s: 6, color: 0xe0f090, autumn: true });
  const linden = ringTrees.reduce((b, t) => (Math.abs(angleDiff(t.a, aOut + 1.1)) < Math.abs(angleDiff(b.a, aOut + 1.1)) ? t : b));
  L.spots.lindenTree = { x: linden.x, z: linden.z };
  // the waypoint on one side of the path through the glade, Elati on the other
  const pth = trail.slice(iIn, iOut + 1).reduce((b, t) => (Math.abs(t.z - LG.z - 2) < Math.abs(b.z - LG.z - 2) ? t : b), trail[iIn]);
  const ws = pth.x > LG.x ? -1 : 1;
  L.spots.waypoint = { x: pth.x + ws * 4.4, z: LG.z + 2.4 };
  const wpt = L.spots.waypoint;
  L.lights.push({ x: wpt.x, y: 1.2, z: wpt.z, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
  L.spots.npcs = {
    elati: { x: pth.x - ws * 3.6, z: LG.z + 0.8, r: ws * 0.6 },
    linden: { x: linden.x - Math.sin(linden.a) * 1.7, z: linden.z - Math.cos(linden.a) * 1.7, r: linden.a + Math.PI }
  };
  mark(res, L, LG.x, LG.z, 6);
  // ---- the Edge of Tears: a leaping deer held in amber over the trail ----
  {
    const i = idxAtZ(154), t = trail[i], t2 = trail[i + 2];
    const a = Math.atan2(t2.x - t.x, t2.z - t.z) + Math.PI / 2;
    L.spots.deer = { x: t.x, z: t.z, r: a };
    L.props.push({ t: 'fx', fx: 'drip', x: t.x, y: 2.2, z: t.z });
    L.lights.push({ x: t.x, y: 3, z: t.z, color: 0xffb850, intensity: 12, range: 10, flicker: 0.04 });
    mark(res, L, t.x, t.z, 2.5);
  }
  // ---- the Tears ----
  const tear = (x, z, away, id, story) => {
    const gain = { k: 1 }, light = { x, y: 1.7, z, color: 0xffb040, intensity: story ? 10 : 7, range: 8, flicker: 0.05, gain };
    L.spots.tears.push({ x, z, id, story, gain, r: away });
    L.lights.push(light);
    blockCircle(L, x, z, 0.65);
    const ox = x + Math.sin(away) * 1.5, oz = z + Math.cos(away) * 1.5;
    L.props.push({ t: 'tearTree', x: ox, z: oz, r: away + Math.PI, s: rng.range(1, 1.15) });
    blockCircle(L, ox, oz, 0.6); mark(res, L, x, z, 2.4);
  };
  const back = (c) => Math.atan2(c.x - c.from.x, c.z - c.from.z);
  if (T1) tear(T1.x + Math.sin(back(T1)) * (T1.r - 2.6), T1.z + Math.cos(back(T1)) * (T1.r - 2.6), back(T1), 'planting', true);
  { const a = Math.atan2(isl.x - M.x, 0); tear(isl.x + Math.sin(a) * 0.9, isl.z, a, 'sorrow', true); }
  if (T3) tear(T3.x + Math.sin(back(T3)) * (T3.r - 2.6), T3.z + Math.cos(back(T3)) * (T3.r - 2.6), back(T3), 'breaking', true);
  nooks.forEach((c, k) => tear(c.x + Math.sin(back(c)) * 1.2, c.z + Math.cos(back(c)) * 1.2, back(c), 'm' + (k + 1), false));
  // no room for a nook: hang the rest at the trail's edge
  for (let i = 14, k = nooks.length; k < 2 && i < trail.length - 12; i += 5) {
    const t = trail[i]; if (t.mere || Math.hypot(t.x - LG.x, t.z - LG.z) < LG.r + 6 || inMere(t.x, t.z, 6) || L.spots.tears.some((q) => Math.hypot(q.x - t.x, q.z - t.z) < 16) || Math.hypot(t.x - GS.x, t.z - GS.z) < GS.r + 4) continue;
    const a = sideOf(i); let x = t.x, z = t.z;
    for (let s2 = 0; s2 < 9 && L.cells[Math.floor(z + Math.cos(a)) * w + Math.floor(x + Math.sin(a))]; s2++) { x += Math.sin(a); z += Math.cos(a); }
    if (Math.hypot(x - t.x, z - t.z) < 2.5) continue;
    x -= Math.sin(a) * 0.9; z -= Math.cos(a) * 0.9;
    tear(x, z, a, 'm' + (++k), false);
  }
  // ---- clearings ----
  const deadRing = (c, n, gapA) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rng.range(-0.15, 0.15);
      if (Math.abs(angleDiff(a, gapA)) < 0.55) continue;
      const rr = c.r - rng.range(0.9, 1.6), x = c.x + Math.sin(a) * rr, z = c.z + Math.cos(a) * rr;
      L.props.push({ t: 'dead', x, z, r: rng.range(0, 6.28), s: rng.range(0.9, 1.2), d: 1, pale: true });
      blockCircle(L, x, z, 0.5); mark(res, L, x, z, 1.2);
    }
  };
  const elite = (p) => (rng.chance(p) ? rng.weighted([['champion', 2], ['rare', 1]]) : null);
  for (const c of clearings) {
    const toTrail = Math.atan2(c.from.x - c.x, c.from.z - c.z);
    if (c.kind === 'planting' || c.kind === 'sentinels') {
      // a rootsworn watch: lantern posts, a breastwork of woven roots, the Evergreen's carved lanterns
      for (let k = 0; k < 3; k++) {
        const a = toTrail + Math.PI + (k - 1) * 0.95, x = c.x + Math.sin(a) * (c.r - 1.6), z = c.z + Math.cos(a) * (c.r - 1.6);
        if (c.kind === 'planting' && k === 1) continue;
        L.props.push({ t: 'groot', x, z, r: a + Math.PI, s: rng.range(0.8, 1.0) }); blockCircle(L, x, z, 1.1); mark(res, L, x, z, 2.2);
      }
      for (const da of [-0.5, 0.5]) {
        const a = toTrail + da, x = c.x + Math.sin(a) * (c.r - 1.2), z = c.z + Math.cos(a) * (c.r - 1.2);
        L.props.push({ t: 'lanternPost', x, z, r: a + Math.PI }); blockCircle(L, x, z, 0.3); mark(res, L, x, z, 1);
        L.lights.push({ x, y: 2.2, z, color: 0xd8f080, intensity: 7, range: 8, flicker: 'seed' });
      }
      for (let k = 0; k < 2; k++) L.props.push({ t: 'bedroll', x: c.x + rng.range(-2.5, 2.5), z: c.z + rng.range(-2.5, 2.5), r: rng.range(0, 6.28) });
      if (c.kind === 'sentinels' && rng.chance(0.6)) L.spots.shrines.push({ x: c.x + Math.sin(toTrail) * 2, z: c.z + Math.cos(toTrail) * 2 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(4, 6), tag: 'weepSentinels', elite: elite(c.kind === 'planting' ? 0.5 : 0.35) });
    } else if (c.kind === 'breaking' || c.kind === 'hollow') {
      // a hollow ringed by dead trees; some of the dead trees are not trees
      deadRing(c, 9, toTrail);
      for (let k = 0; k < 6; k++) L.props.push({ t: 'bones', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.range(0, 6.28), s: 1 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'weepHollow', elite: elite(c.kind === 'breaking' ? 0.6 : 0.3), dormant: true });
    } else if (c.kind === 'den') {
      // an amberback's den: bones, and stones it has learned to run into
      for (let k = 0; k < 3; k++) {
        const a = toTrail + Math.PI + (k - 1) * 1.2 + rng.range(-0.2, 0.2), x = Math.round(c.x + Math.sin(a) * (c.r - 2)), z = Math.round(c.z + Math.cos(a) * (c.r - 2));
        L.props.push({ t: 'menhir', x, z, r: rng.range(0, 6.28), s: rng.range(0.75, 0.9) }); blockCircle(L, x, z, 0.9); mark(res, L, x, z, 1.6);
      }
      for (let k = 0; k < 8; k++) L.props.push({ t: 'bones', x: c.x + rng.range(-3.5, 3.5), z: c.z + rng.range(-3.5, 3.5), r: rng.range(0, 6.28), s: 1.3 });
      L.spots.chests.push({ x: c.x + Math.sin(toTrail + Math.PI) * 2.5, z: c.z + Math.cos(toTrail + Math.PI) * 2.5, rare: rng.chance(0.5) });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(3, 4), tag: 'weepDen', elite: rng.chance(0.4) ? 'rare' : null });
    } else if (c.kind === 'moths') {
      // giant toadstools and gold dust: the moths' feeding ground
      for (let k = 0; k < 7; k++) { const a = rng.range(0, 6.28), d = rng.range(c.r * 0.45, c.r - 1), x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d; L.props.push({ t: 'mush', x, z, r: rng.range(0, 6.28), s: rng.range(2.4, 4.2) }); blockCircle(L, x, z, 0.35); }
      L.props.push({ t: 'fx', fx: 'motes', x: c.x, y: 1.4, z: c.z, s: 4, color: 0xffd890 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'weepMoths', elite: elite(0.35) });
    } else if (c.kind === 'rootlings') {
      for (let k = 0; k < rng.int(5, 7); k++) L.props.push({ t: 'mound', x: c.x + rng.range(-c.r + 1.5, c.r - 1.5), z: c.z + rng.range(-c.r + 1.5, c.r - 1.5), r: rng.range(0, 6.28), s: rng.range(0.8, 1.2) });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 8), tag: 'weepMixed', elite: elite(0.3) });
    } else if (c.kind === 'weepers') {
      // a grove of weeping trees: sap under them, and the drips that keep it fresh
      for (let k = 0; k < 6; k++) {
        const a = toTrail + 0.6 + (k / 6) * (Math.PI * 2 - 1.2), rr = c.r - 1.4, x = c.x + Math.sin(a) * rr, z = c.z + Math.cos(a) * rr;
        L.props.push({ t: 'willow', x, z, r: rng.range(0, 6.28), s: rng.range(0.8, 0.95), d: 1 }); blockCircle(L, x, z, 0.6); mark(res, L, x, z, 1.5);
        const px = x - Math.sin(a) * 2.2, pz = z - Math.cos(a) * 2.2;
        L.weepers.push({ x: px, z: pz, tx: x, tz: z });
        L.props.push({ t: 'fx', fx: 'drip', x: px, y: 3.6, z: pz });
        for (const [sx, sz] of circleCells(L, px, pz, 2.4)) if (L.cells[sz * w + sx] && fbm(sx * 0.4, sz * 0.4, seed + 9) > 0.35) L.sap[sz * w + sx] = 1;
      }
      L.spots.chests.push({ x: c.x, z: c.z, rare: rng.chance(0.4) });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(3, 4), tag: 'weepWeepers', elite: rng.chance(0.3) ? 'rare' : null });
    } else if (c.kind === 'mourners') {
      // a ring of Evergreen who knelt where they grieved and took root there
      const n = 7;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.3; if (Math.abs(angleDiff(a, toTrail)) < 0.5) continue;
        const x = c.x + Math.sin(a) * (c.r - 2), z = c.z + Math.cos(a) * (c.r - 2);
        L.props.push({ t: 'kneeler', x, z, r: a + Math.PI, s: rng.range(0.85, 1) }); blockCircle(L, x, z, 0.7); mark(res, L, x, z, 1.4);
      }
      L.spots.shrines.push({ x: c.x, z: c.z });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(4, 6), tag: 'weepMourners', elite: elite(0.3) });
    }
  }
  // ---- packs along the trail, the moths on the Fallen King, none near the Lanternglade ----
  L.packs.push({ x: M.x, z: M.z + rng.range(-2, 2), n: rng.int(5, 6), tag: 'weepMoths', elite: null, ambush: true });
  for (const sx of [-1, 1]) if (rng.chance(0.6)) L.packs.push({ x: M.x + sx * (M.rx + 4.6), z: M.z, n: rng.int(3, 5), tag: rng.pick(['weepHollow', 'weepMixed']), elite: null });
  for (let i = 18; i < trail.length - 10; i += rng.int(11, 15)) {
    const t = trail[i], up = 1 - (t.z - GS.z) / (h - GS.z);
    if (t.mere || Math.hypot(t.x - LG.x, t.z - LG.z) < LG.r + 14 || Math.hypot(t.x - GS.x, t.z - GS.z) < GS.r + 8 || inMere(t.x, t.z, 4)) continue;
    L.packs.push({ x: t.x + rng.range(-2, 2), z: t.z + rng.range(-2, 2), n: rng.int(3, 6), tag: rng.weighted([['weepMixed', 4], ['weepHollow', 2], ['weepMoths', 1.2], ['weepSentinels', 0.6 + up * 1.5], ['weepMourners', up * 0.8]]), elite: rng.chance(0.14) ? 'champion' : null });
  }
  // ---- the mere's glow and its weeping shore trees ----
  for (let z = 0; z < h; z += 4) for (let x = 0; x < w; x += 4) if (L.amberDeep[z * w + x]) L.props.push({ t: 'fx', fx: 'amberglow', x: x + 0.5, y: 0, z: z + 0.5 });
  for (const [dx, dz] of [[-0.6, -0.3], [0.6, 0.3], [-0.32, 0.6], [0.35, -0.6]]) L.lights.push({ x: M.x + dx * M.rx, y: 0.6, z: M.z + dz * M.rz, color: 0xffa838, intensity: 9, range: 11, flicker: 0.04 });
  for (let k = 0; k < 7; k++) {
    const sx = k % 2 ? 1 : -1, a = rng.range(0.55, Math.PI - 0.55);
    const x = M.x + Math.sin(a) * sx * (M.rx + 1.5), z = M.z + Math.cos(a) * (M.rz + 1.3);
    const i = Math.floor(z) * w + Math.floor(x);
    if (!L.cells[i] || L.deck[i] || res[i] || DM[i] > 2) continue;
    L.props.push({ t: 'willow', x, z, r: rng.range(0, 6.28), s: rng.range(0.75, 0.9), d: 1 }); blockCircle(L, x, z, 0.6); mark(res, L, x, z, 1.4);
    // the drips fall on the shore, on the side away from the amber
    const ox = Math.sin(a) * sx, oz = Math.cos(a) * (M.rx / M.rz), ol = Math.hypot(ox, oz), px = x + (ox / ol) * 1.8, pz = z + (oz / ol) * 1.8;
    L.weepers.push({ x: px, z: pz, tx: x, tz: z });
    L.props.push({ t: 'fx', fx: 'drip', x: px, y: 3.6, z: pz });
  }
  // ---- dressing: the gold wood (green still at its southern edge), roots, ferns, dry grass, toadstools ----
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x, d = D[i];
    if (L.low[i] || L.deck[i] || res[i]) continue;
    if (d === 0) {
      if (!L.cells[i]) continue;
      const edge = D[i - 1] === 1 || D[i + 1] === 1 || D[i - w] === 1 || D[i + w] === 1;
      if (edge && rng.chance(0.2)) L.props.push({ t: 'bush', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.6, 1.0) });
      if (L.paint[i] < 0.3 && !L.sap[i] && rng.chance(0.26)) L.props.push({ t: 'tuft', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.7, 1.2) });
      if (rng.chance(0.01)) L.props.push({ t: 'stone', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.25, 0.5) });
      if (L.paint[i] < 0.2 && rng.chance(edge ? 0.018 : 0.004)) L.props.push({ t: 'branches', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.2) });
      if (L.paint[i] < 0.25 && rng.chance(edge ? 0.012 : 0.003)) L.props.push({ t: 'mush', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.9, 1.6) });
      continue;
    }
    if (d === 255) continue;
    const green = clamp((z - (h - 34)) / 12, 0, 1);
    const p = d === 1 ? 0.56 : d <= 3 ? 0.34 : d <= 6 ? 0.16 : 0.05;
    if (rng.chance(p)) {
      const t = rng.next() < green ? rng.weighted([['oak', 4], ['pine', 2]]) : rng.weighted([['goak', 6], ['willow', d <= 3 ? 1.3 : 0.4], ['dead', d === 1 ? 0.7 : 0.25]]);
      L.props.push({ t, x: x + rng.range(0.2, 0.8), z: z + rng.range(0.2, 0.8), r: rng.range(0, 6.28), s: rng.range(0.85, 1.3) * (d > 3 ? 1.15 : 1), d });
    } else if (d <= 2 && rng.chance(0.07)) L.props.push({ t: rng.chance(0.6) ? 'groot' : 'ostump', x: x + 0.5, z: z + 0.5, r: toFloor(L, D, x, z) + rng.range(-0.4, 0.4), s: rng.range(0.7, 1.05), y: -0.05 });
    else if (d <= 2 && rng.chance(0.3)) L.props.push({ t: 'bush', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.3) });
    else if (d === 1 && rng.chance(0.04)) L.props.push({ t: 'rock', x: x + 0.5, z: z + 0.5, r: rng.range(0, 6.28), s: rng.range(0.8, 1.5) });
  }
  // fallen logs and toadstool rings by the trail
  for (let n = 0; n < 14; n++) {
    const t = rng.pick(trail); if (t.mere) continue;
    const a = rng.range(0, 6.28), dd = rng.range(3.5, 6), lx = t.x + Math.sin(a) * dd, lz = t.z + Math.cos(a) * dd, i = Math.floor(lz) * w + Math.floor(lx);
    if (L.cells[i] && D[i] === 0 && !res[i] && !L.sap[i] && L.paint[i] < 0.2) L.props.push({ t: 'log', x: lx, z: lz, r: rng.range(0, 3.14), s: rng.range(0.8, 1.2) });
  }
  for (let n = 0; n < 12; n++) {
    const t = rng.pick(trail); if (t.mere) continue;
    const a = rng.range(0, 6.28), dd = rng.range(3.5, 7), mx = t.x + Math.sin(a) * dd, mz = t.z + Math.cos(a) * dd, i = Math.floor(mz) * w + Math.floor(mx);
    if (!L.cells[i] || res[i]) continue;
    for (let m = 0; m < rng.int(4, 7); m++) { const b = (m / 6) * 6.28, rr = rng.range(0.8, 1.3); L.props.push({ t: 'mush', x: mx + Math.sin(b) * rr, z: mz + Math.cos(b) * rr, r: rng.range(0, 6.28), s: rng.range(0.7, 1.2) }); }
  }
  L.clearings = clearings;
  L.exits.push({ x: L.start.x, z: h - 4.5, to: 'town', label: 'exit.town' });
  return L;
}

// ======================= HEART: the Heartwood =======================
// A descending rootway from the entrance (waypoint, Elati) to the Heart Chamber. Side chambers hang off it; three thorn
// walls seal it, each withered by killing the Heartroot in a chamber before it; amber channels cross it under narrow
// root bridges. The generator retries until the walls really do seal the way and every node can be reached in turn.
export function genHeart(seed, o = {}) {
  for (let k = 0; k < 40; k++) { const L = tryHeart(seed + k * 7919, o, k === 39); if (L) { L.seed = seed; return L; } }
  return null;
}
function tryHeart(seed, o, last) {
  const rng = RNG(seed);
  const w = o.w || 104, h = o.h || 148, N = w * h;
  const L = base(w, h);
  L.type = 'heart'; L.seed = seed;
  L.low = new Uint8Array(N); L.amberDeep = new Uint8Array(N); L.sap = new Uint8Array(N); L.deck = new Uint8Array(N);
  L.spots.tears = []; L.spots.shrines = []; L.spots.chests = []; L.spots.cocoons = []; L.weepers = []; L.lanterns = []; L.thorns = []; L.bridges = [];
  const res = new Uint8Array(N);
  const S = { x: w / 2 + rng.range(-10, 10), z: h - 11 };
  const H = { x: clamp(w / 2 + rng.range(-12, 12), 28, w - 28), z: 28, r: 16 };
  const ea = rng.sign() * 0.62; // the rootway comes into the Heart Chamber 35 degrees off due south
  carveCircle(L, S.x, S.z, 6.2);
  carveLine(L, S.x, S.z, S.x, h - 4, 3);
  // ---- the spine ----
  const spine = [], st = { x: S.x, z: S.z - 3, ang: Math.PI };
  const SP = { rMin: 2.6, rMax: 4.0, paint: 1.3, wob: 0.24, seed };
  const E = { x: H.x + Math.sin(ea) * (H.r + 4), z: H.z + Math.cos(ea) * (H.r + 4) };
  for (let k = 1; k <= 3; k++) walkTo(L, st, clamp(w / 2 + rng.range(-30, 30), 14, w - 14), S.z - 3 + (E.z - (S.z - 3)) * (k / 4), rng, spine, SP);
  walkTo(L, st, E.x, E.z, rng, spine, SP);
  carveLine(L, E.x, E.z, H.x + Math.sin(ea) * (H.r - 3), H.z + Math.cos(ea) * (H.r - 3), 3.2, 1);
  carveCircle(L, H.x, H.z, H.r);
  // four alcoves for the Heartroots, N/E/S/W just outside the chamber's rim
  const alcoves = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dz]) => ({ x: H.x + dx * (H.r + 2.4), z: H.z + dz * (H.r + 2.4) }));
  for (const a of alcoves) carveCircle(L, a.x, a.z, 2.9);
  const n = spine.length, wIdx = [0.27, 0.52, 0.76].map((f) => Math.round(f * n));
  // ---- side chambers ----
  const chambers = [];
  const placeCh = (i0, i1, kind, seg, rr) => {
    for (let k = 0; k < 40; k++) {
      const i = rng.int(i0, i1), t = spine[i], ta = spine[Math.max(i - 2, 0)], tb = spine[Math.min(i + 2, n - 1)];
      const a = Math.atan2(tb.x - ta.x, tb.z - ta.z) + rng.sign() * Math.PI / 2 + rng.range(-0.4, 0.4);
      const r = rng.range(rr[0], rr[1]), d = r + rng.range(4.5, 7.5), cx = t.x + Math.sin(a) * d, cz = t.z + Math.cos(a) * d;
      if (cx < r + 4 || cx > w - r - 4 || cz < r + 4 || cz > h - r - 6) continue;
      if (spine.some((p) => Math.hypot(p.x - cx, p.z - cz) < r + 3)) continue;
      if (spine.some((p, j) => (j < i0 - 3 || j > i1 + 3) && Math.hypot(p.x - cx, p.z - cz) < r + 7)) continue;
      if (wIdx.some((j) => Math.hypot(spine[j].x - cx, spine[j].z - cz) < r + 8)) continue;
      if (Math.hypot(cx - H.x, cz - H.z) < H.r + r + 6 || Math.hypot(cx - S.x, cz - S.z) < r + 11) continue;
      if (chambers.some((c) => Math.hypot(c.x - cx, c.z - cz) < c.r + r + 4)) continue;
      carveLine(L, t.x, t.z, cx, cz, rng.range(1.9, 2.4), 0.5);
      carveCircle(L, cx, cz, r);
      const c = { x: cx, z: cz, r, kind, seg, idx: i, from: { x: t.x, z: t.z } };
      chambers.push(c); return c;
    }
    return null;
  };
  const segs = [[6, wIdx[0] - 5], [wIdx[0] + 5, wIdx[1] - 5], [wIdx[1] + 5, wIdx[2] - 5], [wIdx[2] + 5, n - 8]];
  const nodeKinds = rng.shuffle(['well', 'choir', 'sleepers']);
  const other = rng.shuffle(['grove', 'rootbridge', 'sleepers', 'grove', 'choir', 'rootbridge']);
  const nodes = [];
  for (let s = 0; s < 3; s++) {
    const c = placeCh(segs[s][0], segs[s][1], nodeKinds[s], s, nodeKinds[s] === 'well' ? [6, 8] : [5.5, 8]);
    if (!c) return null;
    c.node = true; nodes.push(c);
  }
  const nursery = placeCh(segs[rng.int(1, 2)][0], segs[2][1], 'nursery', -1, [5.5, 7]);
  if (!nursery) return null;
  let on = 0;
  for (let s = 0; s < 4; s++) for (let k = 0; k < (s === 3 ? 1 : s === 2 ? 1 : 2); k++) placeCh(segs[s][0], segs[s][1], other[on++ % other.length], s, [5, 8.5]);
  smoothCells(L, 1);
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) if (xx < 3 || zz < 3 || xx >= w - 3 || zz >= h - 3) L.cells[zz * w + xx] = 0;
  const spineAng = (i) => { const a = spine[Math.max(i - 3, 0)], b = spine[Math.min(i + 3, n - 1)]; return Math.atan2(b.x - a.x, b.z - a.z); };
  // ---- amber channels across the rootway, each under a narrow root bridge ----
  for (const f of [0.14, 0.4, 0.64, 0.88]) {
    const i = Math.round(f * n); if (wIdx.some((j) => Math.abs(j - i) < 6)) continue;
    if (Math.hypot(spine[i].x - H.x, spine[i].z - H.z) < H.r + 9 || Math.hypot(spine[i].x - S.x, spine[i].z - S.z) < 12) continue;
    const p = spine[i], ang = spineAng(i), half = rng.range(1.1, 1.7), off = rng.range(-0.7, 0.7);
    const cells = bandCells(L, p, ang, half, 9, (x, z) => (fbm(x * 0.25, z * 0.25, seed + 41) - 0.5) * 1.4);
    const fx = Math.sin(ang), fz = Math.cos(ang);
    for (const [x, z] of cells) {
      const across = (x + 0.5 - p.x) * fz - (z + 0.5 - p.z) * fx, k = z * w + x;
      if (Math.abs(across - off) < 1.45) { L.deck[k] = 1; continue; }
      L.cells[k] = 0; L.low[k] = 1; L.amberDeep[k] = 1;
    }
    L.bridges.push({ x: p.x + fz * off, z: p.z - fx * off, r: ang, len: 2 * half + 4.2, w: 2.6 });
    L.lights.push({ x: p.x, y: 0.5, z: p.z, color: 0xffa030, intensity: 12, range: 10, flicker: 'beat' });
  }
  // ---- the thorn walls ----
  for (let k = 0; k < 3; k++) {
    const i = wIdx[k], p = spine[i], ang = spineAng(i);
    const cells = bandCells(L, p, ang, 1.05, 9);
    if (cells.length < 4) return null;
    for (const [x, z] of cells) L.cells[z * w + x] = 0;
    const c = nodes[k], away = Math.atan2(c.x - c.from.x, c.z - c.from.z);
    L.thorns.push({ x: p.x, z: p.z, r: ang, cells, node: { x: c.x + Math.sin(away) * (c.r - 2.2), z: c.z + Math.cos(away) * (c.r - 2.2) } });
    mark(res, L, p.x, p.z, 3.5);
  }
  // ---- the Heart Chamber: the amber heart on its root dais, the sap ring round the rim ----
  L.spots.heart = { x: H.x, z: H.z };
  L.spots.alcoves = alcoves;
  L.boss = { x: H.x, z: H.z + 5.5 };
  blockCircle(L, H.x, H.z, 2.9);
  L.props.push({ t: 'heartDais', x: H.x, z: H.z });
  mark(res, L, H.x, H.z, 6);
  for (const a of alcoves) { mark(res, L, a.x, a.z, 2.6); L.lights.push({ x: a.x, y: 1.2, z: a.z, color: 0xff9a30, intensity: 8, range: 7, flicker: 'beat' }); }
  for (let z = Math.floor(H.z - H.r - 1); z <= H.z + H.r + 1; z++) for (let x = Math.floor(H.x - H.r - 1); x <= H.x + H.r + 1; x++) {
    const d = Math.hypot(x + 0.5 - H.x, z + 0.5 - H.z), i = z * w + x;
    if (L.cells[i] && d >= 13 && d <= 16.4 + (fbm(x * 0.3, z * 0.3, seed + 7) - 0.5) * 0.8) L.sap[i] = 1;
  }
  L.lights.push({ x: H.x, y: 4, z: H.z, color: 0xffa040, intensity: 34, range: 24, flicker: 'beat' });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.5; L.lights.push({ x: H.x + Math.sin(a) * 14.5, y: 0.6, z: H.z + Math.cos(a) * 14.5, color: 0xffa030, intensity: 8, range: 9, flicker: 'beat' }); }
  // ---- does it hold? each wall must seal the way on, each node be reachable while its wall stands ----
  const at = (x, z) => Math.floor(z) * w + Math.floor(x);
  const walls = L.thorns.map((t) => t.cells);
  const setWalls = (k) => walls.forEach((cs, j) => { for (const [x, z] of cs) L.cells[z * w + x] = j < k ? 1 : 0; });
  for (let k = 0; k <= 3; k++) {
    setWalls(k);
    const R = reach(L, S.x, S.z);
    if (k < 3) {
      const nd = L.thorns[k].node;
      if (!R[at(nd.x, nd.z)] || R[at(H.x, H.z + 8)]) { if (!last) return null; }
      const beyond = spine[Math.min(wIdx[k] + 5, n - 1)];
      if (R[at(beyond.x, beyond.z)] && !last) return null;
    } else {
      if (!R[at(H.x, H.z + 8)] && !last) return null;
      for (const c of chambers) if (!R[at(c.x, c.z)] && !last) return null;
      for (const a of alcoves) if (!R[at(a.x, a.z)] && !last) return null;
    }
  }
  setWalls(0);
  L.spine = spine; L.chambers = chambers;
  // ---- the entrance: the waypoint, Elati, carved lanterns, the way back up to the wood ----
  L.start = { x: S.x, z: S.z + 2.5 };
  L.spots.waypoint = { x: S.x + 3.4, z: S.z - 0.5 };
  L.lights.push({ x: S.x + 3.4, y: 1.2, z: S.z - 0.5, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
  L.spots.npcs = { elati: { x: S.x - 3.2, z: S.z - 1.4, r: 0.5 } };
  mark(res, L, S.x, S.z, 5);
  for (const sx of [-1, 1]) {
    const x = S.x + sx * 4.8, z = S.z + 2.6;
    L.props.push({ t: 'lanternPost', x, z, r: sx * 1.2 }); blockCircle(L, x, z, 0.3);
    L.lights.push({ x, y: 2.2, z, color: 0xd8f080, intensity: 9, range: 9, flicker: 'seed' });
  }
  L.lights.push({ x: S.x, y: 5, z: h - 5, color: 0xffd8a0, intensity: 14, range: 12, flicker: 0.05 }); // daylight down the root stair
  L.props.push({ t: 'rootStair', x: S.x, z: h - 5 });
  L.exits.push({ x: S.x, z: h - 6, to: 'weep', label: 'exit.weep' });
  // ---- chambers ----
  for (const c of chambers) {
    const away = Math.atan2(c.x - c.from.x, c.z - c.from.z), fx = Math.sin(away), fz = Math.cos(away);
    if (c.node) mark(res, L, c.x + fx * (c.r - 2.2), c.z + fz * (c.r - 2.2), 2);
    if (c.kind === 'sleepers') {
      // Evergreen asleep in amber along the walls; some of them are not asleep
      const k0 = rng.int(7, 10);
      for (let k = 0; k < k0; k++) {
        const a = away + Math.PI + 0.75 + (k / (k0 - 1)) * (Math.PI * 2 - 1.5), x = c.x + Math.sin(a) * (c.r - 1.1), z = c.z + Math.cos(a) * (c.r - 1.1);
        L.props.push({ t: 'cocoon', x, z, r: a + Math.PI, s: rng.range(0.9, 1.1) }); blockCircle(L, x, z, 0.55); mark(res, L, x, z, 1.2);
        L.spots.cocoons.push({ x, z, r: a + Math.PI });
        if (k % 3 === 0) L.lights.push({ x: x - Math.sin(a) * 0.8, y: 1.2, z: z - Math.cos(a) * 0.8, color: 0xffa040, intensity: 6, range: 6, flicker: 'beat' });
      }
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'heartSleepers', elite: rng.chance(0.3) ? 'champion' : null, dormant: true });
    } else if (c.kind === 'grove') {
      // cold blue toadstools and rootling mounds
      for (let k = 0; k < 18; k++) { const a = rng.range(0, 6.28), d = rng.range(1, c.r - 1); L.props.push({ t: 'shroom', x: c.x + Math.sin(a) * d, z: c.z + Math.cos(a) * d, r: rng.next() * 6, s: rng.range(0.9, 2.0) }); }
      for (let k = 0; k < rng.int(3, 5); k++) L.props.push({ t: 'mound', x: c.x + rng.range(-c.r + 2, c.r - 2), z: c.z + rng.range(-c.r + 2, c.r - 2), r: rng.range(0, 6.28), s: rng.range(0.8, 1.1) });
      L.lights.push({ x: c.x, y: 1, z: c.z, color: 0x50c8ff, intensity: 12, range: 10, flicker: 0.1 });
      if (rng.chance(0.5)) L.spots.chests.push({ x: c.x, z: c.z, rare: rng.chance(0.4) });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'heartDeep', elite: rng.chance(0.3) ? 'champion' : null });
    } else if (c.kind === 'well' || c.kind === 'rootbridge') {
      // an amber well in the middle of the room; the rootbridge room's pool is wide, with a root laid across it
      const wr = c.kind === 'well' ? 1.6 : c.r - 3;
      for (const [x, z] of circleCells(L, c.x, c.z, wr + 0.3)) { const i = z * w + x; if (!L.cells[i]) continue; const d = Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z); if (d < wr) { L.cells[i] = 0; L.low[i] = 1; L.amberDeep[i] = 1; } }
      if (c.kind === 'rootbridge') {
        const ang = away;
        for (const [x, z] of circleCells(L, c.x, c.z, wr + 0.5)) {
          const i = z * w + x, across = (x + 0.5 - c.x) * Math.cos(ang) - (z + 0.5 - c.z) * Math.sin(ang);
          if (L.low[i] && Math.abs(across) < 1.45) { L.low[i] = 0; L.amberDeep[i] = 0; L.cells[i] = 1; L.deck[i] = 1; }
        }
        L.bridges.push({ x: c.x, z: c.z, r: ang, len: 2 * wr + 3, w: 2.6 });
        L.spots.chests.push({ x: c.x + fx * (c.r - 1.6), z: c.z + fz * (c.r - 1.6), rare: rng.chance(0.5) });
      }
      for (const [x, z] of circleCells(L, c.x, c.z, wr + 2.6)) { const i = z * w + x; if (L.cells[i] && !L.deck[i] && fbm(x * 0.35, z * 0.35, seed + 13) > 0.32) L.sap[i] = 1; }
      L.lights.push({ x: c.x, y: 0.6, z: c.z, color: 0xffa030, intensity: 14, range: 11, flicker: 'beat' });
      mark(res, L, c.x, c.z, wr + 1);
      L.packs.push({ x: c.x - fx * 2, z: c.z - fz * 2, n: rng.int(4, 6), tag: c.kind === 'well' ? 'heartWarden' : 'heartDeep', elite: rng.chance(0.3) ? 'champion' : null });
    } else if (c.kind === 'choir') {
      // song-stones in a ring; the mourners sing to them
      const k0 = rng.int(5, 7);
      for (let k = 0; k < k0; k++) {
        const a = away + (k / k0) * Math.PI * 2 + 0.4; if (Math.abs(angleDiff(a, away + Math.PI)) < 0.5) continue;
        const x = c.x + Math.sin(a) * (c.r - 2), z = c.z + Math.cos(a) * (c.r - 2);
        L.props.push({ t: 'songStone', x, z, r: a + Math.PI, s: rng.range(0.55, 0.75) }); blockCircle(L, x, z, 0.6); mark(res, L, x, z, 1.3);
      }
      L.lights.push({ x: c.x, y: 1.4, z: c.z, color: 0xffc070, intensity: 10, range: 10, flicker: 0.08 });
      if (rng.chance(0.5)) L.spots.shrines.push({ x: c.x, z: c.z });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'heartChoir', elite: rng.chance(0.35) ? 'rare' : null });
    } else if (c.kind === 'nursery') {
      // a silent room of saplings, a child's name cut in the stone by each; one Tear, no enemies
      for (let k = 0; k < 14; k++) {
        const a = rng.range(0, 6.28), d = rng.range(1.6, c.r - 1.2), x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d, i = Math.floor(z) * w + Math.floor(x);
        if (!L.cells[i] || res[i]) continue;
        L.props.push({ t: 'sapling', x, z, r: rng.range(0, 6.28), s: rng.range(0.7, 1.1) }, { t: 'nameStone', x: x + 0.5, z: z + 0.35, r: rng.range(-0.4, 0.4) });
        blockCircle(L, x, z, 0.3); mark(res, L, x, z, 0.9);
      }
      const tx = c.x + fx * (c.r - 2.4), tz = c.z + fz * (c.r - 2.4), gain = { k: 1 };
      L.spots.tears.push({ x: tx, z: tz, id: 'nursery', story: false, gain, r: away });
      L.lights.push({ x: tx, y: 1.7, z: tz, color: 0xffb040, intensity: 8, range: 8, flicker: 0.05, gain });
      blockCircle(L, tx, tz, 0.65); mark(res, L, tx, tz, 2);
      L.lights.push({ x: c.x, y: 3, z: c.z, color: 0xd8f0a0, intensity: 9, range: 11, flicker: 0.04 });
      L.props.push({ t: 'fx', fx: 'motes', x: c.x, y: 1.2, z: c.z, s: 3, color: 0xe8f0b0 });
    }
  }
  // stragglers along the rootway, never in the entrance or the Heart Chamber
  for (let i = 12; i < n - 10; i += rng.int(10, 14)) {
    const p = spine[i];
    if (wIdx.some((j) => Math.abs(j - i) < 5) || Math.hypot(p.x - H.x, p.z - H.z) < H.r + 6) continue;
    L.packs.push({ x: p.x, z: p.z, n: rng.int(3, 5), tag: rng.weighted([['heartDeep', 3], ['heartSleepers', 1.5], ['heartChoir', 1]]), elite: rng.chance(0.15) ? 'champion' : null });
  }
  // glows along the rootway: amber in the root walls beating with the heart
  for (let i = 8; i < n - 4; i += 9) { const p = spine[i]; L.lights.push({ x: p.x, y: 1.4, z: p.z, color: 0xff9a40, intensity: 7, range: 8, flicker: 'beat' }); }
  for (let z = 0; z < h; z += 3) for (let x = 0; x < w; x += 3) if (L.amberDeep[z * w + x]) L.props.push({ t: 'fx', fx: 'amberglow', x: x + 0.5, y: 0, z: z + 0.5, s: 0.6 });
  // ---- dressing: root masses grow out of the walls, toadstools in the damp ----
  const D = distField(L, 12);
  L.dist = D;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x, d = D[i];
    if (L.low[i] || L.deck[i] || res[i]) continue;
    if (d === 0) {
      if (!L.cells[i]) continue;
      const edge = D[i - 1] === 1 || D[i + 1] === 1 || D[i - w] === 1 || D[i + w] === 1;
      if (edge && rng.chance(0.05)) L.props.push({ t: 'mush', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.5) });
      if (edge && rng.chance(0.025)) L.props.push({ t: 'shroom', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.6) });
      if (L.paint[i] < 0.2 && rng.chance(0.004)) L.props.push({ t: 'branches', x: x + rng.next(), z: z + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.2) });
      continue;
    }
    if (d === 255) continue;
    if (d === 1 && rng.chance(0.16)) L.props.push({ t: 'wallRoot', x: x + 0.5, z: z + 0.5, r: toFloor(L, D, x, z), s: rng.range(0.9, 1.25) });
    else if (d === 1 && rng.chance(0.06)) L.props.push({ t: 'groot', x: x + 0.5, z: z + 0.5, r: toFloor(L, D, x, z) + rng.range(-0.5, 0.5), s: rng.range(1.1, 1.6), y: heartWallH(0.5) - 0.9 });
    else if (d === 2 && rng.chance(0.035)) L.props.push({ t: 'rootPillar', x: x + 0.5, z: z + 0.5, r: rng.range(0, 6.28), s: rng.range(0.8, 1.3), y: heartWallH(1.5) - 0.4 });
    else if (d <= 3 && rng.chance(0.03)) L.props.push({ t: 'ostump', x: x + 0.5, z: z + 0.5, r: rng.range(0, 6.28), s: rng.range(1.0, 1.5), y: heartWallH(d - 0.5) - 0.5 });
  }
  // a few shroom patches along the rootway
  for (let k = 0; k < 10; k++) {
    const p = rng.pick(spine), a = rng.range(0, 6.28), dd = rng.range(2, 3.5), mx = p.x + Math.sin(a) * dd, mz = p.z + Math.cos(a) * dd, i = Math.floor(mz) * w + Math.floor(mx);
    if (!L.cells[i] || res[i] || L.deck[i]) continue;
    for (let m = 0; m < rng.int(3, 6); m++) L.props.push({ t: 'shroom', x: mx + rng.range(-0.8, 0.8), z: mz + rng.range(-0.8, 0.8), r: rng.range(0, 6.28), s: rng.range(0.7, 1.4) });
    if (k % 2 === 0) L.lights.push({ x: mx, y: 0.6, z: mz, color: 0x40c0ff, intensity: 5, range: 6, flicker: 0.1 });
  }
  return L;
}
