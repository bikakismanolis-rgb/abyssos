// Stand-in Act V layouts for the world viewer while there is no gen5.js: the fields sea.js reads (L.bed, L.vbed, L.sea,
// L.ice, L.thick, L.window, L.deck, L.hgt, L.spots.holes and .drowned), on rough versions of the coast and the Farthest
// Light. Nothing in the game uses them.
import { base, carveCircle, carveLine, distField } from '../world/gen.js';
import { BED_DRY } from '../world/genlib.js';
import { RNG, fbm, clamp } from '../core/util.js';

function finish(L) {
  const { w, h } = L, W = w + 1;
  L.dist = distField(L);
  // corner heights: floor 0, thin ice -2, windows -2.2, the sea falling away, the cliffs rising
  L.hgt = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let fl = 0, ice = 0, win = 0, sea = 0, n = 0, dd = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const x = vx + dx, z = vz + dz; n++;
      if (x < 0 || z < 0 || x >= w || z >= h) { sea += L.type === 'farlight' ? 0 : 1; dd += 10; continue; }
      const i = z * w + x;
      if (L.window[i]) win++; else if (L.ice[i]) ice++; else if (L.low[i]) sea++; else if (L.cells[i]) fl++;
      dd += Math.min(L.dist[i] === 255 ? 10 : L.dist[i], 10);
    }
    let y;
    if (win) y = -2.2;
    else if (fl) y = 0;
    else if (ice) y = -2;
    else if (sea) y = L.type === 'farlight' ? -2.5 : -1.5 - Math.min(3, dd * 0.4);
    else y = 6 + 10 * fbm(vx * 0.07, vz * 0.07, 5) * clamp(dd / 4, 0.3, 1);
    L.hgt[vz * W + vx] = y;
  }
  return L;
}

export function fakeCoast(seed = 3, o = {}) {
  const rng = RNG(seed), w = 120, h = 200, N = w * h;
  const L = base(w, h);
  Object.assign(L, { type: 'coast', seed, mode: o.frozen ? 'frozen' : 'tide', low: new Uint8Array(N), bed: new Float32Array(N).fill(BED_DRY),
    sea: new Uint8Array(N), ice: new Uint8Array(N), thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N) });
  // the land: the Landing's cove and the shore road, the Neck to the south
  carveCircle(L, 30, 136, 13, 0.3);
  carveLine(L, 52, 192, 30, 140, 5, 1);
  carveLine(L, 30, 136, 56, 120, 3.5, 1);
  carveLine(L, 56, 120, 40, 96, 3.5, 1);
  carveLine(L, 40, 96, 52, 60, 3, 1);
  carveCircle(L, 44, 100, 6);
  // the Shallows: tidal flats from the shore out to the sea, a creek, an islet
  for (let z = 70; z < 168; z++) for (let x = 54; x < w; x++) {
    const i = z * w + x, t = (x - 56) / 54, cr = Math.abs(z - (120 + Math.sin(x * 0.12) * 9 + (x - 60) * 0.2));
    let b = 1.25 - 1.6 * t + (fbm(x * 0.05, z * 0.05, seed) - 0.5) * 0.9 - (cr < 2.2 ? 0.55 : 0) - Math.max(0, (92 - z) * 0.05) - Math.max(0, (z - 150) * 0.05);
    if (x >= 112) b = -0.6;
    L.bed[i] = clamp(Math.round(b / 0.15) * 0.15, -0.3, 1.5);
    if (b < -0.32) L.bed[i] = -0.6;
  }
  // the north: open sea, and the Fall shelf's thin ice with its thick path, two Icemaw holes, the frozen pool
  for (let z = 0; z < 70; z++) for (let x = 0; x < w; x++) L.bed[z * w + x] = -0.6;
  for (let z = 30; z < 92; z++) for (let x = 6; x < 52; x++) {
    const i = z * w + x, edge = fbm(x * 0.08, z * 0.08, seed + 2);
    if (x > 44 + edge * 10 && z < 60) continue;
    L.ice[i] = 1; L.bed[i] = -0.6; L.cells[i] = 1;
    if (Math.abs(x - (20 + Math.sin(z * 0.15) * 3)) < 1.5) { L.thick[i] = 1; L.ice[i] = 0; }
  }
  for (const [hx, hz] of [[30, 62], [16, 48]]) for (let z = hz - 2; z <= hz + 2; z++) for (let x = hx - 2; x <= hx + 2; x++) if (Math.hypot(x + 0.5 - hx, z + 0.5 - hz) < 1.9) { const i = z * w + x; L.ice[i] = 0; L.sea[i] = 1; L.cells[i] = 0; }
  // the islet with the Grey Light, a ring of rock in the shallows
  for (let z = 112; z < 124; z++) for (let x = 96; x < 108; x++) if (Math.hypot(x + 0.5 - 102, z + 0.5 - 118) < 4) { L.bed[z * w + x] = BED_DRY; L.cells[z * w + x] = 1; }
  // an ice window at the foot of a light (thick, over its pit), the jetty
  for (const [x, z] of [[42, 98], [43, 98], [42, 99], [43, 99]]) { const i = z * w + x; L.window[i] = 1; L.thick[i] = 1; L.cells[i] = 1; L.bed[i] = -0.6; }
  for (let z = 112; z < 121; z++) for (let x = 40; x < 42; x++) { const i = z * w + x; L.deck[i] = 1; L.cells[i] = 1; L.bed[i] = -0.6; }
  for (let z = 104; z < 126; z++) for (let x = 36; x < 54; x++) { const i = z * w + x; if (!L.cells[i] && L.bed[i] === BED_DRY && !L.deck[i]) L.bed[i] = clamp(0.15 * Math.round((0.2 + (fbm(x * 0.1, z * 0.1, 9) - 0.5) * 1.6 - (126 - z) * 0.02) / 0.15), -0.6, 1.2); }
  // what is floor at low water (bed above the walk threshold), what is deep (closed, low)
  for (let i = 0; i < N; i++) {
    if (L.ice[i] || L.thick[i] || L.deck[i]) continue;
    if (L.sea[i]) { L.low[i] = 1; continue; }
    if (L.bed[i] < BED_DRY) { if (-L.bed[i] < 0.45) L.cells[i] = 1; else { L.cells[i] = 0; L.low[i] = 1; } }
  }
  const lv = +(o.tide ?? 0);
  for (let i = 0; i < N; i++) if (L.bed[i] < BED_DRY && !L.ice[i] && !L.thick[i] && !L.deck[i] && !L.sea[i]) { const deep = lv - L.bed[i] >= 0.45; L.cells[i] = deep ? 0 : 1; L.low[i] = deep ? 1 : 0; }
  L.start = { x: 30, z: 150 };
  L.spots = { camp: { x: 30, z: 136 }, shallows: { x: 84, z: 128 }, shelf: { x: 28, z: 64 }, window: { x: 43, z: 99 }, jetty: { x: 41, z: 116 }, sea: { x: 70, z: 50 }, islet: { x: 102, z: 118 } };
  L.lights = [{ x: 30, y: 1.2, z: 136, color: 0xffb060, intensity: 14, range: 9, flicker: 0.2 }];
  return finish(L);
}

export function fakeFarlight(seed = 3) {
  const rng = RNG(seed), w = 112, h = 208, N = w * h;
  const L = base(w, h);
  Object.assign(L, { type: 'farlight', seed, low: new Uint8Array(N), sea: new Uint8Array(N), ice: new Uint8Array(N), thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N) });
  // the frozen sea: thin ice everywhere, the coast's headlands to the south, the open sea past the ice edge to the north
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) { const i = z * w + x; if (z < 200) { L.ice[i] = 1; L.cells[i] = 1; } }
  for (let z = 0; z < 12; z++) for (let x = 0; x < w; x++) { const i = z * w + x; L.ice[i] = 0; L.sea[i] = 1; L.cells[i] = 0; L.low[i] = 1; }
  // the Ice Road: thick, winding north; the skerry's core
  for (let z = 14; z < 200; z++) { const cx = 56 + Math.sin(z * 0.045) * 14 * fbm(z * 0.02, 1, seed); for (let x = Math.floor(cx - 2.5); x <= cx + 2.5; x++) { const i = z * w + x; L.thick[i] = 1; L.ice[i] = 0; L.paint[i] = 1; } }
  for (let z = 16; z < 42; z++) for (let x = 42; x < 72; x++) if (Math.hypot(x + 0.5 - 56, z + 0.5 - 28) < 6.5) { const i = z * w + x; L.thick[i] = 1; L.ice[i] = 0; }
  // the three leads with their holes (their cells listed for the freeze slots)
  L.spots.holes = [];
  [150, 104, 58].forEach((lz, k) => {
    const lead = [];
    for (let x = 0; x < w; x++) { const c = lz + Math.round(Math.sin(x * 0.08 + k) * 3); for (let z = c - 2; z <= c + 1; z++) { const i = z * w + x; L.ice[i] = 0; L.thick[i] = 0; L.sea[i] = 1; L.cells[i] = 0; L.low[i] = 1; lead.push([x, z]); } }
    const hx = 56 + (k % 2 ? -7 : 7), hz = lz;
    for (let z = hz - 5; z <= hz + 5; z++) for (let x = hx - 5; x <= hx + 5; x++) if (Math.hypot(x + 0.5 - hx, z + 0.5 - hz) < 4.5) { const i = z * w + x; L.ice[i] = 0; L.thick[i] = 0; L.sea[i] = 1; L.cells[i] = 0; L.low[i] = 1; lead.push([x, z]); }
    L.spots.holes.push({ id: k, x: hx, z: hz, r: 4.5, lead });
  });
  // bergs, the windows and the drowned lights
  for (const [bx, bz, r] of [[24, 120, 5], [86, 80, 6], [30, 40, 4]]) for (let z = bz - r; z <= bz + r; z++) for (let x = bx - r; x <= bx + r; x++) if (Math.hypot(x + 0.5 - bx, z + 0.5 - bz) < r) { const i = z * w + x; L.ice[i] = 0; L.cells[i] = 0; }
  L.spots.drowned = [{ x: 82, z: 130, glow: { x: 82, y: -2.6, z: 130 }, window: { x: 84, z: 132 } }, { x: 26, z: 84, glow: { x: 26, y: -3.2, z: 84 } }, { x: 76, z: 172, glow: { x: 76, y: -2.2, z: 172 } }];
  for (const [x, z] of [[84, 132], [85, 132], [84, 133], [85, 133]]) { const i = z * w + x; L.window[i] = 1; L.thick[i] = 1; L.ice[i] = 0; }
  L.start = { x: 56, z: 190 };
  L.spots.camp = { x: 56, z: 188 }; L.spots.road = { x: 60, z: 128 }; L.spots.lead = { x: 56, z: 108 }; L.spots.drownedAt = { x: 82, z: 134 }; L.spots.core = { x: 56, z: 30 }; L.spots.edge = { x: 56, z: 18 };
  void rng;
  return finish(L);
}
