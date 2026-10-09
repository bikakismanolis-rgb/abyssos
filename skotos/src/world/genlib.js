// What the layout generators share (gen4.js, gen5.js): reach on foot, the cell helpers, the ground's heights.
// L.hgt is the ground's height at every cell corner, (w + 1) x (h + 1); every walkable cell stays at y = 0.
import { clamp } from '../core/util.js';

// dry land in L.bed (a finite sentinel no tide reaches, safe in a mediump vertex attribute), and the ice's surface
export const BED_DRY = 9.0, ICE_Y = 0.02;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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
export function circleCells(L, cx, cz, r) {
  const out = [];
  for (let z = Math.floor(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++)
    if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= r && x >= 0 && z >= 0 && x < L.w && z < L.h) out.push([x, z]);
  return out;
}
export const mark = (m, L, cx, cz, r) => { for (const [x, z] of circleCells(L, cx, cz, r)) m[z * L.w + x] = 1; };
export const snap = (v) => Math.floor(v) + 0.5;
// the corners' heights: floor at 0, holes sunk, solid ground rising with its distance from the floor (rise(d, x, z, i))
export function terrain(L, cells, D, rise) {
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
// (x0 + 1, z0), as the ground plane's grid is. On ice (thin, thick or a window) it is the ice's surface, so pools, rings
// and drapable cones lie on the ice and not on the bed under it
export function groundY(L, x, z) {
  const H = L.hgt; if (!H) return 0;
  const W = L.w + 1, x0 = clamp(Math.floor(x), 0, L.w - 1), z0 = clamp(Math.floor(z), 0, L.h - 1), fx = clamp(x - x0, 0, 1), fz = clamp(z - z0, 0, 1);
  if (L.ice || L.thick || L.window) { const i = z0 * L.w + x0; if (L.ice?.[i] || L.thick?.[i] || L.window?.[i]) return ICE_Y; }
  const a = H[z0 * W + x0], b = H[z0 * W + x0 + 1], c = H[(z0 + 1) * W + x0], d = H[(z0 + 1) * W + x0 + 1];
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
// a tidal cell's water at level h (m): 0 dry (depth <= 0), 1 shallow (wading), 2 deep (0.45 m or more: closed). Counted in
// whole 0.15 m steps, so the walk grid, the checks and the water never disagree on a float
export const TIDE_STEP = 0.15;
export function wetAt(bed, h) { const d = Math.round((h - bed) / TIDE_STEP); return d <= 0 ? 0 : d < 3 ? 1 : 2; }
