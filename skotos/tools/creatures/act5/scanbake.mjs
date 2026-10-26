// Scan baking (Node only), for a thinned photogrammetry scan whose own UVs cannot survive the thinning (thousands of
// atlas islands): a triangle BVH over the full-res scan (ray casts, nearest points), mesh graphs (CSR adjacency, a
// typed binary heap for Dijkstra), a chart unwrap of the low-poly mesh (region growing in a normal cone, each chart
// projected on its plane, skyline-packed), and the bake itself: per texel of the low-poly, the scan's colour and its
// smooth normal (as a tangent-space normal map, in the convention icemaw.mjs verified) found along the low-poly normal.
// Used by louse.mjs. Arrays are flat typed arrays: P (x, y, z per vertex), I (three vertex indices per triangle).
import * as THREE from 'three';

// ---------- the BVH ----------
export function buildBVH(P, I, leaf = 8) {
  const nt = I.length / 3, cen = new Float32Array(nt * 3), lo = new Float32Array(nt * 3), hi = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const a = P[I[t * 3] * 3 + k], b = P[I[t * 3 + 1] * 3 + k], c = P[I[t * 3 + 2] * 3 + k];
    lo[t * 3 + k] = Math.min(a, b, c); hi[t * 3 + k] = Math.max(a, b, c); cen[t * 3 + k] = (a + b + c) / 3;
  }
  const order = new Uint32Array(nt); for (let t = 0; t < nt; t++) order[t] = t;
  const cap = 4 * Math.ceil(nt / leaf) + 16;
  const B = new Float32Array(cap * 6), L = new Int32Array(cap), R = new Int32Array(cap), S = new Int32Array(cap), N = new Int32Array(cap);
  let nn = 0;
  const mk = (s, e) => {
    const id = nn++; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = s; i < e; i++) { const t = order[i] * 3; x0 = Math.min(x0, lo[t]); y0 = Math.min(y0, lo[t + 1]); z0 = Math.min(z0, lo[t + 2]); x1 = Math.max(x1, hi[t]); y1 = Math.max(y1, hi[t + 1]); z1 = Math.max(z1, hi[t + 2]); }
    B[id * 6] = x0; B[id * 6 + 1] = y0; B[id * 6 + 2] = z0; B[id * 6 + 3] = x1; B[id * 6 + 4] = y1; B[id * 6 + 5] = z1; S[id] = s; N[id] = e - s; L[id] = R[id] = -1;
    return id;
  };
  const work = [mk(0, nt)];
  while (work.length) {
    const id = work.pop(), s = S[id], n = N[id]; if (n <= leaf) continue;
    const ex = B[id * 6 + 3] - B[id * 6], ey = B[id * 6 + 4] - B[id * 6 + 1], ez = B[id * 6 + 5] - B[id * 6 + 2];
    const ax = ex > ey ? (ex > ez ? 0 : 2) : ey > ez ? 1 : 2;
    const seg = Array.from(order.subarray(s, s + n)).sort((a, b) => cen[a * 3 + ax] - cen[b * 3 + ax]);
    order.set(seg, s);
    const m = s + (n >> 1), l = mk(s, m), r = mk(m, s + n); L[id] = l; R[id] = r; N[id] = 0;
    work.push(l, r);
  }
  return { P, I, B, L, R, S, N, order };
}
// the nearest hit of the ray o + t d for t in (tmin, tmax), either side of a triangle: { t, tri, u, v } (u, v: the
// barycentrics of the triangle's 2nd and 3rd vertices) or null
export function raycast(bvh, ox, oy, oz, dx, dy, dz, tmin = 0, tmax = 1e9) {
  const { P, I, B, L, R, S, N, order } = bvh, ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
  let best = tmax, bt = -1, bu = 0, bv = 0;
  const st = [0];
  while (st.length) {
    const id = st.pop(), o = id * 6;
    let t0 = (B[o] - ox) * ix, t1 = (B[o + 3] - ox) * ix; if (t0 > t1) { const q = t0; t0 = t1; t1 = q; }
    let u0 = (B[o + 1] - oy) * iy, u1 = (B[o + 4] - oy) * iy; if (u0 > u1) { const q = u0; u0 = u1; u1 = q; }
    if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1;
    let w0 = (B[o + 2] - oz) * iz, w1 = (B[o + 5] - oz) * iz; if (w0 > w1) { const q = w0; w0 = w1; w1 = q; }
    if (w0 > t0) t0 = w0; if (w1 < t1) t1 = w1;
    if (t0 > t1 || t1 < tmin || t0 > best) continue;
    if (N[id] === 0) { st.push(L[id], R[id]); continue; }
    for (let i = S[id], e = S[id] + N[id]; i < e; i++) {
      const t = order[i], a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
      const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-16) continue;
      const inv = 1 / det, sx = ox - P[a], sy = oy - P[a + 1], sz = oz - P[a + 2], u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; if (tt > tmin && tt < best) { best = tt; bt = t; bu = u; bv = v; }
    }
  }
  return bt < 0 ? null : { t: best, tri: bt, u: bu, v: bv };
}
// the closest point of triangle (a, b, c) to p, as barycentrics [u, v] of b and c (Ericson, Real-Time Collision Detection)
function closestTri(px, py, pz, P, a, b, c) {
  const ax = P[a], ay = P[a + 1], az = P[a + 2];
  const abx = P[b] - ax, aby = P[b + 1] - ay, abz = P[b + 2] - az, acx = P[c] - ax, acy = P[c + 1] - ay, acz = P[c + 2] - az;
  const apx = px - ax, apy = py - ay, apz = pz - az, d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return [0, 0];
  const bpx = px - P[b], bpy = py - P[b + 1], bpz = pz - P[b + 2], d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return [1, 0];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return [d1 / (d1 - d3), 0];
  const cpx = px - P[c], cpy = py - P[c + 1], cpz = pz - P[c + 2], d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return [0, 1];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return [0, d2 / (d2 - d6)];
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return [1 - w, w]; }
  const den = 1 / (va + vb + vc); return [vb * den, vc * den];
}
// the nearest scan point within maxd: { d, tri, u, v } or null
export function nearest(bvh, px, py, pz, maxd = 1e9) {
  const { P, I, B, L, R, S, N, order } = bvh;
  const boxD = (id) => { const o = id * 6, dx = Math.max(B[o] - px, 0, px - B[o + 3]), dy = Math.max(B[o + 1] - py, 0, py - B[o + 4]), dz = Math.max(B[o + 2] - pz, 0, pz - B[o + 5]); return dx * dx + dy * dy + dz * dz; };
  let best = maxd * maxd, bt = -1, bu = 0, bv = 0;
  const st = [0];
  while (st.length) {
    const id = st.pop(); if (boxD(id) > best) continue;
    if (N[id] === 0) { const l = L[id], r = R[id]; if (boxD(l) < boxD(r)) st.push(r, l); else st.push(l, r); continue; }
    for (let i = S[id], e = S[id] + N[id]; i < e; i++) {
      const t = order[i], a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
      const [u, v] = closestTri(px, py, pz, P, a, b, c), w = 1 - u - v;
      const qx = P[a] * w + P[b] * u + P[c] * v - px, qy = P[a + 1] * w + P[b + 1] * u + P[c + 1] * v - py, qz = P[a + 2] * w + P[b + 2] * u + P[c + 2] * v - pz;
      const d = qx * qx + qy * qy + qz * qz; if (d < best) { best = d; bt = t; bu = u; bv = v; }
    }
  }
  return bt < 0 ? null : { d: Math.sqrt(best), tri: bt, u: bu, v: bv };
}

// ---------- mesh graphs ----------
// area-weighted vertex normals
export function vertexNormals(P, I) {
  const nor = new Float32Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) { nor[v] += nx; nor[v + 1] += ny; nor[v + 2] += nz; }
  }
  for (let v = 0; v < nor.length; v += 3) { const l = Math.hypot(nor[v], nor[v + 1], nor[v + 2]) || 1; nor[v] /= l; nor[v + 1] /= l; nor[v + 2] /= l; }
  return nor;
}
// vertex adjacency as CSR: neighbours of v are adj[off[v] .. off[v + 1])
export function adjacency(nv, I) {
  const deg = new Uint32Array(nv + 1);
  for (let k = 0; k < I.length; k++) deg[I[k]] += 2;
  const off = new Uint32Array(nv + 1); for (let v = 0; v < nv; v++) off[v + 1] = off[v] + deg[v];
  const adj = new Uint32Array(off[nv]), fill = off.slice(0, nv);
  for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = I[t + k], b = I[t + (k + 1) % 3], c = I[t + (k + 2) % 3];
    adj[fill[a]++] = b; adj[fill[a]++] = c;
  }
  return { off, adj };
}
// a binary min-heap of (key, value) on typed arrays
export class Heap {
  constructor(cap = 1 << 16) { this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; this.top = 0; }
  push(key, val) {
    if (this.n === this.k.length) { const k = new Float64Array(this.n * 2), v = new Int32Array(this.n * 2); k.set(this.k); v.set(this.v); this.k = k; this.v = v; }
    let i = this.n++; const K = this.k, V = this.v;
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= key) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = key; V[i] = val;
  }
  pop() {
    const K = this.k, V = this.v, rk = K[0], rv = V[0], n = --this.n; this.top = rk;
    if (n > 0) { const key = K[n], val = V[n]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= key) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = key; V[i] = val; }
    return rv;
  }
}
// geodesic (edge-path) distances from the sources, only through vertices where pass(v) is true, up to maxD.
// Returns { dist (Float64, Infinity unreached), from (the source each vertex was reached from) }
export function dijkstra(P, G, sources, pass = () => true, maxD = Infinity) {
  const nv = P.length / 3, dist = new Float64Array(nv).fill(Infinity), from = new Int32Array(nv).fill(-1), h = new Heap();
  for (const s of sources) { dist[s] = 0; from[s] = s; h.push(0, s); }
  while (h.n) {
    const i = h.pop(), d = h.top; if (d > dist[i]) continue;
    for (let k = G.off[i]; k < G.off[i + 1]; k++) {
      const j = G.adj[k]; if (!pass(j)) continue;
      const nd = d + Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]);
      if (nd < dist[j] && nd <= maxD) { dist[j] = nd; from[j] = from[i]; h.push(nd, j); }
    }
  }
  return { dist, from };
}
// connected components of the vertices where keep(v) is true -> Int32 component id per vertex (-1 elsewhere), count
export function components(nv, G, keep) {
  const comp = new Int32Array(nv).fill(-1); let n = 0; const st = [];
  for (let s = 0; s < nv; s++) {
    if (comp[s] >= 0 || !keep(s)) continue;
    comp[s] = n; st.push(s);
    while (st.length) { const i = st.pop(); for (let k = G.off[i]; k < G.off[i + 1]; k++) { const j = G.adj[k]; if (comp[j] < 0 && keep(j)) { comp[j] = n; st.push(j); } } }
    n++;
  }
  return { comp, n };
}

// ---------- charts ----------
// Region-grown charts on a welded low-poly mesh: a triangle joins a neighbouring chart of its own group while its
// normal stays within `cone` degrees of the chart's mean normal (and of its seed's). Each chart is laid flat on the
// plane of its mean normal (turned to its principal axis) and the charts are skyline-packed into a square of `size`
// texels with `pad` texels between them, scaled to fill it; o.density(t) weights a triangle's texel density (a chart
// takes its mean). Returns { uv (Float32, per output vertex), pos, idx, src (the input vertex of each output vertex),
// chart (per triangle), charts, scale (texels per metre) }: vertices on chart borders are split.
export function unwrap(P, I, o = {}) {
  const size = o.size ?? 512, pad = o.pad ?? 4, cone = Math.cos(((o.cone ?? 50) * Math.PI) / 180), group = o.group || (() => 0);
  const nt = I.length / 3, fn = new Float64Array(nt * 3), area = new Float64Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1e-12;
    fn[t * 3] = nx / l; fn[t * 3 + 1] = ny / l; fn[t * 3 + 2] = nz / l; area[t] = l / 2;
  }
  // triangle neighbours across edges
  const edges = new Map(), tn = Array.from({ length: nt }, () => []);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
    const a = I[t * 3 + k], b = I[t * 3 + (k + 1) % 3], key = a < b ? a * 1e7 + b : b * 1e7 + a;
    const e = edges.get(key); if (e) { for (const u of e) { tn[t].push(u); tn[u].push(t); } e.push(t); } else edges.set(key, [t]);
  }
  const chart = new Int32Array(nt).fill(-1), charts = [];
  const seeds = Array.from({ length: nt }, (_, t) => t).sort((a, b) => area[b] - area[a]);
  for (const s of seeds) {
    if (chart[s] >= 0) continue;
    const id = charts.length, g = group(s), tris = [s], m = [fn[s * 3] * area[s], fn[s * 3 + 1] * area[s], fn[s * 3 + 2] * area[s]];
    chart[s] = id;
    const front = [s];
    while (front.length) {
      const t = front.shift();
      for (const u of tn[t]) {
        if (chart[u] >= 0 || group(u) !== g) continue;
        const ml = Math.hypot(m[0], m[1], m[2]);
        const dm = (fn[u * 3] * m[0] + fn[u * 3 + 1] * m[1] + fn[u * 3 + 2] * m[2]) / ml, ds = fn[u * 3] * fn[s * 3] + fn[u * 3 + 1] * fn[s * 3 + 1] + fn[u * 3 + 2] * fn[s * 3 + 2];
        if (dm < cone || ds < cone * 0.7) continue;
        chart[u] = id; tris.push(u); front.push(u);
        m[0] += fn[u * 3] * area[u]; m[1] += fn[u * 3 + 1] * area[u]; m[2] += fn[u * 3 + 2] * area[u];
      }
    }
    charts.push({ id, g, tris, n: new THREE.Vector3(...m).normalize() });
  }
  // lay each chart flat: a vertex of the chart is split off from the other charts sharing it
  const outPos = [], outSrc = [], outUV = [], idx = new Uint32Array(nt * 3);
  for (const c of charts) {
    const n = c.n, u0 = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(n).normalize() : new THREE.Vector3(1, 0, 0).cross(n).normalize(), v0 = n.clone().cross(u0);
    const local = new Map(), pts = [];
    for (const t of c.tris) for (let k = 0; k < 3; k++) {
      const vi = I[t * 3 + k]; if (local.has(vi)) continue;
      const p = new THREE.Vector3(P[vi * 3], P[vi * 3 + 1], P[vi * 3 + 2]);
      local.set(vi, pts.length); pts.push([p.dot(u0), p.dot(v0), vi]);
    }
    // the principal axis along x
    let mx = 0, my = 0; for (const q of pts) { mx += q[0]; my += q[1]; } mx /= pts.length; my /= pts.length;
    let sxx = 0, sxy = 0, syy = 0; for (const q of pts) { const dx = q[0] - mx, dy = q[1] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ca = Math.cos(-ang), sa = Math.sin(-ang);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of pts) { const x = (q[0] - mx) * ca - (q[1] - my) * sa, y = (q[0] - mx) * sa + (q[1] - my) * ca; q[0] = x; q[1] = y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    let dens = 0, ar = 0; for (const t of c.tris) { dens += (o.density ? o.density(t) : 1) * area[t]; ar += area[t]; }
    c.k = Math.sqrt(dens / ar); c.w = x1 - x0; c.h = y1 - y0; c.base = outPos.length / 3; c.pts = pts; c.x0 = x0; c.y0 = y0;
    for (const q of pts) { outPos.push(P[q[2] * 3], P[q[2] * 3 + 1], P[q[2] * 3 + 2]); outSrc.push(q[2]); outUV.push(q[0] - x0, q[1] - y0); }
    for (const t of c.tris) for (let k = 0; k < 3; k++) idx[t * 3 + k] = c.base + local.get(I[t * 3 + k]);
  }
  // skyline packing (each chart, tallest first, where it rests lowest) at a scale s (texels per metre): returns the
  // placements or null if they overflow the square
  const order = charts.map((c, i) => i).sort((a, b) => charts[b].h * charts[b].k - charts[a].h * charts[a].k);
  const place = (s) => {
    const sky = new Int32Array(size).fill(pad), at = new Array(charts.length);
    for (const i of order) {
      const c = charts[i], w = Math.ceil(c.w * s * c.k) + 1 + pad, h = Math.ceil(c.h * s * c.k) + 1 + pad;
      if (w + pad > size) return null;
      let bx = -1, by = 1e9;
      for (let x = pad; x + w <= size; x += 2) {
        let y = 0; for (let k = x; k < x + w; k++) if (sky[k] > y) { y = sky[k]; if (y >= by) break; }
        if (y < by) { by = y; bx = x; }
      }
      if (bx < 0 || by + h > size) return null;
      for (let k = bx; k < bx + w; k++) sky[k] = by + h;
      at[i] = [bx, by];
    }
    return at;
  };
  let lo = 1, hi = 1e5;
  for (let it = 0; it < 22; it++) { const mid = Math.sqrt(lo * hi); if (place(mid)) lo = mid; else hi = mid; }
  const at = place(lo), uv = new Float32Array(outUV.length);
  charts.forEach((c, i) => {
    for (let k = 0; k < c.pts.length; k++) {
      const j = c.base + k;
      uv[j * 2] = (at[i][0] + 0.5 + outUV[j * 2] * lo * c.k) / size; uv[j * 2 + 1] = (at[i][1] + 0.5 + outUV[j * 2 + 1] * lo * c.k) / size;
    }
  });
  return { uv, pos: new Float32Array(outPos), idx, src: Uint32Array.from(outSrc), chart, charts: charts.length, scale: lo };
}

// ---------- rasterising in UV space ----------
// calls fn(texel index, triangle, w0, w1, w2) for every texel centre inside a triangle of the low-poly (uv in 0..1,
// glTF's v down the image), then returns the triangle per texel (-1 where none) for dilation
export function rasterUV(uv, idx, W, H, fn) {
  const tri = new Int32Array(W * H).fill(-1);
  for (let t = 0; t < idx.length / 3; t++) {
    const a = idx[t * 3], b = idx[t * 3 + 1], c = idx[t * 3 + 2];
    const ax = uv[a * 2] * W, ay = uv[a * 2 + 1] * H, bx = uv[b * 2] * W, by = uv[b * 2 + 1] * H, cx = uv[c * 2] * W, cy = uv[c * 2 + 1] * H;
    const ar = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (Math.abs(ar) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / ar, w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / ar, w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
      tri[y * W + x] = t; fn(y * W + x, t, w0, w1, w2);
    }
  }
  return tri;
}
// grows the filled texels (tri >= 0) of an image (channels per texel) into the empty ones, `passes` texels deep
export function dilate(img, ch, tri, W, H, passes = 8) {
  const filled = Uint8Array.from(tri, (t) => (t >= 0 ? 1 : 0));
  for (let p = 0; p < passes; p++) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x; if (filled[k]) continue;
      let n = 0; const acc = new Float64Array(ch);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const kk = yy * W + xx; if (!filled[kk]) continue;
        for (let c = 0; c < ch; c++) acc[c] += img[kk * ch + c]; n++;
      }
      if (n) add.push([k, Array.from(acc, (v) => v / n)]);
    }
    for (const [k, v] of add) { for (let c = 0; c < ch; c++) img[k * ch + c] = v[c]; filled[k] = 1; }
  }
}
