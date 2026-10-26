// Signed distance shapes and a surface-nets mesher (Node only), for the Skotos's hood and mantle: a sculpted surface
// with soft blends and rolled rims that a low-poly source cannot give. Distances in metres, negative inside.
// surfaceNets(f, min, max, h) samples f on a grid of cell size h, puts one vertex in every cell the surface crosses
// (the mean of its edge crossings, then pulled onto the surface along the gradient), joins the cells round every
// crossing edge into quads, and returns { pos, idx } with outward-facing triangles.
import * as THREE from 'three';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
export const smax = (a, b, k) => -smin(-a, -b, k);
// an ellipsoid (centre c, radii r, a rotation q given as the inverse quaternion so p is taken into its frame)
export function ellipsoid(c, r, qi = null) {
  const v = new THREE.Vector3();
  return (x, y, z) => {
    v.set(x - c.x, y - c.y, z - c.z); if (qi) v.applyQuaternion(qi);
    const k0 = Math.hypot(v.x / r.x, v.y / r.y, v.z / r.z), k1 = Math.hypot(v.x / (r.x * r.x), v.y / (r.y * r.y), v.z / (r.z * r.z));
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(r.x, r.y, r.z);
  };
}
// a round cone from a (radius ra) to b (radius rb)
export function roundCone(a, b, ra, rb) {
  const ba = new THREE.Vector3().subVectors(b, a), l2 = ba.lengthSq(), rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pa = new THREE.Vector3(), t = new THREE.Vector3();
  return (x, y, z) => {
    pa.set(x - a.x, y - a.y, z - a.z);
    const yy = pa.dot(ba), z2 = yy - l2;
    t.copy(pa).multiplyScalar(l2).addScaledVector(ba, -yy);
    const x2 = t.lengthSq(), y2 = yy * yy * l2, zz = z2 * z2 * l2, k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z2) * a2 * zz > k) return Math.sqrt(x2 + zz) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
}
export function capsule(a, b, r) { return roundCone(a, b, r, r); }

export function surfaceNets(f, min, max, h, o = {}) {
  const nx = Math.ceil((max.x - min.x) / h), ny = Math.ceil((max.y - min.y) / h), nz = Math.ceil((max.z - min.z) / h);
  const sx = nx + 1, sy = ny + 1, sxy = sx * sy;
  const G = new Float32Array(sx * sy * (nz + 1));
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) G[i + j * sx + k * sxy] = f(min.x + i * h, min.y + j * h, min.z + k * h);
  const cell = new Int32Array(nx * ny * nz).fill(-1), pos = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  const grad = (x, y, z) => { const e = h * 0.25; return [f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)].map((g) => g / (2 * e)); };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { val[c] = G[i + C[c][0] + (j + C[c][1]) * sx + (k + C[c][2]) * sxy]; if (val[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let ax = 0, ay = 0, az = 0, n = 0;
    for (const [a, b] of E) {
      if (val[a] < 0 === val[b] < 0) continue;
      const t = val[a] / (val[a] - val[b]);
      ax += C[a][0] + (C[b][0] - C[a][0]) * t; ay += C[a][1] + (C[b][1] - C[a][1]) * t; az += C[a][2] + (C[b][2] - C[a][2]) * t; n++;
    }
    let x = min.x + (i + ax / n) * h, y = min.y + (j + ay / n) * h, z = min.z + (k + az / n) * h;
    // pulled onto the surface (two Newton steps along the gradient, kept inside the cell's neighbourhood)
    for (let it = 0; it < (o.project ?? 2); it++) {
      const d = f(x, y, z), g = grad(x, y, z), g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2]; if (g2 < 1e-12) break;
      const s = clamp(d / g2, -h / Math.sqrt(g2), h / Math.sqrt(g2));
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    cell[i + j * nx + k * nx * ny] = pos.length / 3; pos.push(x, y, z);
  }
  const idx = [], ci = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : cell[i + j * nx + k * nx * ny]);
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) [b, d] = [d, b];
    const P = (v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], dd = (u, v) => { const p = P(u), q = P(v); return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; };
    if (dd(a, c) <= dd(b, d)) idx.push(a, b, c, a, c, d); else idx.push(a, b, d, b, c, d);
  };
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const v0 = G[i + j * sx + k * sxy], in0 = v0 < 0;
    if (i < nx && j > 0 && k > 0 && in0 !== G[i + 1 + j * sx + k * sxy] < 0) quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k), !in0);
    if (j < ny && i > 0 && k > 0 && in0 !== G[i + (j + 1) * sx + k * sxy] < 0) quad(ci(i - 1, j, k - 1), ci(i - 1, j, k), ci(i, j, k), ci(i, j, k - 1), !in0);
    if (k < nz && i > 0 && j > 0 && in0 !== G[i + j * sx + (k + 1) * sxy] < 0) quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k), !in0);
  }
  // orientation check: triangle normals against the field's gradient
  let agree = 0, tot = 0;
  for (let t = 0; t < idx.length && tot < 400; t += 3 * 7, tot++) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((v) => new THREE.Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]));
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)), m = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const g = grad(m.x, m.y, m.z); if (nrm.x * g[0] + nrm.y * g[1] + nrm.z * g[2] > 0) agree++;
  }
  if (agree < tot / 2) for (let t = 0; t < idx.length; t += 3) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  return { pos, idx, grid: [nx, ny, nz], agree: agree / Math.max(1, tot) };
}
// the field's unit gradient at each vertex (the surface's normal)
export function fieldNormals(f, pos, e = 0.002) {
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    const g = [f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e)], l = Math.hypot(...g) || 1;
    out[i] = g[0] / l; out[i + 1] = g[1] / l; out[i + 2] = g[2] / l;
  }
  return out;
}
