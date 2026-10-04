// Retextures the spider: darker warm-grey grade, dull blood-red dorsal markings painted from 3D positions,
// UV gutters dilated (no black seams), normal maps cleaned, eye glow map. Writes tex/{body,leg}_{base,nrm}.png, tex/body_glow.png
import sharp from 'sharp';
import { loadSource, V3 } from './lib.mjs';

const W = 1024;
const src = await loadSource();
const load = async (f) => { const { data, info } = await sharp('tex/' + f).removeAlpha().resize(W, W).raw().toBuffer({ resolveWithObject: true }); return { d: Float32Array.from(data, (x) => x / 255), c: info.channels }; };
const save = (img, f) => sharp(Buffer.from(img.d.map((x) => Math.round(Math.min(1, Math.max(0, x)) * 255))), { raw: { width: W, height: W, channels: 3 } }).png().toFile('tex/' + f);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// rasterise triangles in UV space; cb(px, py, bary[3], triIndex)
function raster(prim, cb) {
  const { uv, idx } = prim;
  for (let t = 0; t < idx.length; t += 3) {
    const P = [0, 1, 2].map((k) => [uv[idx[t + k] * 2] * W - 0.5, uv[idx[t + k] * 2 + 1] * W - 0.5]);
    const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(W - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    const det = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]);
    if (Math.abs(det) < 1e-9) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const a = ((P[1][1] - P[2][1]) * (x - P[2][0]) + (P[2][0] - P[1][0]) * (y - P[2][1])) / det;
      const b = ((P[2][1] - P[0][1]) * (x - P[2][0]) + (P[0][0] - P[2][0]) * (y - P[2][1])) / det;
      const c = 1 - a - b;
      const e = -0.02; // slightly conservative
      if (a >= e && b >= e && c >= e) cb(x, y, [a, b, c], t / 3);
    }
  }
}
function dilate(img, mask, passes = 24) {
  const d = img.d; let m = mask.slice();
  for (let p = 0; p < passes; p++) {
    const nm = m.slice();
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (m[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= W) continue;
        const j = yy * W + xx; if (!m[j]) continue;
        r += d[j * 3]; g += d[j * 3 + 1]; b += d[j * 3 + 2]; n++;
      }
      if (n) { d[i * 3] = r / n; d[i * 3 + 1] = g / n; d[i * 3 + 2] = b / n; nm[i] = 1; }
    }
    m = nm;
  }
  // anything still uncovered: flat average
  return m;
}
// colour grade: lift and warm the near-black hair, leave bright parts (fangs, eyes) mostly alone
function grade(img, mask, k = 1) {
  const d = img.d;
  for (let i = 0; i < W * W; i++) {
    if (!mask[i]) continue;
    const r = d[i * 3], g = d[i * 3 + 1], b = d[i * 3 + 2];
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    const w = 1 - sm(0.25, 0.55, lum);
    const gr = (c, tint) => Math.pow(c, 0.88) * 1.2 * k * tint;
    // desaturate the blue cast first
    const m = lum, ds = 0.55;
    const R = m + (r - m) * ds, G = m + (g - m) * ds, B = m + (b - m) * ds;
    d[i * 3] = r + (gr(R, 1.12) - r) * w; d[i * 3 + 1] = g + (gr(G, 1.0) - g) * w; d[i * 3 + 2] = b + (gr(B, 0.84) - b) * w;
  }
}

// ---------------- body ----------------
{
  const B = src.body;
  const base = await load('src_Spider-body-tex.png');
  const nrm = await load('src_Spider-body-nm.png');
  const glow = await load('src_Spider-body-glo.png');
  const mask = new Uint8Array(W * W);
  const mark = new Float32Array(W * W);
  // abdomen frame (source units)
  const av = []; for (let i = 0; i < B.part.length; i++) if (B.part[i] === 'abdomen') av.push(V3().fromArray(B.pos, i * 3));
  const mn = av.reduce((a, v) => a.min(v), V3(1e9, 1e9, 1e9)), mx = av.reduce((a, v) => a.max(v), V3(-1e9, -1e9, -1e9));
  const c = mn.clone().add(mx).multiplyScalar(0.5), r = mx.clone().sub(mn).multiplyScalar(0.5);
  c.x = 0; // body was re-centred on x = 0
  console.log('abdomen centre', c.toArray().map((x) => x.toFixed(2)), 'radii', r.toArray().map((x) => x.toFixed(2)));
  const segDist = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(px - ax - vx * t, py - ay - vy * t); };
  const pattern = (p) => {
    const u = (p.x - c.x) / r.x, a = (p.z - c.z) / r.z, h = (p.y - c.y) / r.y;
    const dorsal = sm(0.05, 0.45, h);
    if (dorsal <= 0) return 0;
    const au = Math.abs(u);
    let m = 0;
    // chevrons pointing forward, shrinking toward the spinnerets
    for (let k = 0; k < 4; k++) {
      const a0 = 0.36 - k * 0.27, w = 0.4 - k * 0.075, hh = 0.2 - k * 0.02, th = 0.06 - k * 0.008;
      const dd = segDist(au, a, 0, a0, w, a0 - hh);
      m = Math.max(m, 1 - sm(th * 0.55, th, dd));
    }
    // paired spots near the waist and a broken midline
    m = Math.max(m, 1 - sm(0.06, 0.11, Math.hypot(au - 0.2, a - 0.66)));
    m = Math.max(m, (1 - sm(0.018, 0.032, au)) * sm(-0.95, -0.75, a) * (1 - sm(0.45, 0.6, a)) * 0.7);
    return m * dorsal;
  };
  let lumSum = 0, lumN = 0;
  const cheli = new Float32Array(W * W), fang = new Uint8Array(W * W);
  raster(B, (x, y, w, t) => {
    const i = y * W + x; mask[i] = 1;
    const vi = [B.idx[t * 3], B.idx[t * 3 + 1], B.idx[t * 3 + 2]];
    if (B.kind[vi[0]] === 'chelicera') { const p = V3(); for (let k = 0; k < 3; k++) p.addScaledVector(V3().fromArray(B.pos, vi[k] * 3), w[k]); cheli[i] = 1; }
    if (B.kind[vi[0]] === 'fang') fang[i] = 1;
    if (B.part[vi[0]] !== 'abdomen') return;
    const p = V3(); for (let k = 0; k < 3; k++) p.addScaledVector(V3().fromArray(B.pos, vi[k] * 3), w[k]);
    mark[i] = Math.max(mark[i], pattern(p));
  });
  for (let i = 0; i < W * W; i++) if (mask[i]) { lumSum += 0.3 * base.d[i * 3] + 0.59 * base.d[i * 3 + 1] + 0.11 * base.d[i * 3 + 2]; lumN++; }
  const meanL = lumSum / lumN;
  grade(base, mask, 0.92);
  // markings: dull blood red, modulated by the hair strokes so they stay furry
  const RED = [0.3, 0.075, 0.05];
  let nMark = 0;
  for (let i = 0; i < W * W; i++) {
    if (mark[i] <= 0) continue; nMark++;
    const r0 = base.d[i * 3], g0 = base.d[i * 3 + 1], b0 = base.d[i * 3 + 2];
    const l = (0.3 * r0 + 0.59 * g0 + 0.11 * b0) / (meanL * 1.45);
    const mod = Math.min(1.6, Math.max(0.3, l));
    const m = sm(0.25, 0.75, mark[i] + (mod - 1) * 0.45);
    const k = m * 0.78;
    base.d[i * 3] = r0 + (RED[0] * mod - r0) * k; base.d[i * 3 + 1] = g0 + (RED[1] * mod - g0) * k; base.d[i * 3 + 2] = b0 + (RED[2] * mod - b0) * k;
  }
  // chelicera bases: dark glossy brown-black instead of pale tan; fangs: old bone
  for (let i = 0; i < W * W; i++) {
    if (cheli[i]) { const r0 = base.d[i * 3], g0 = base.d[i * 3 + 1], b0 = base.d[i * 3 + 2]; const l = 0.3 * r0 + 0.59 * g0 + 0.11 * b0; base.d[i * 3] = 0.06 + l * 0.22; base.d[i * 3 + 1] = 0.045 + l * 0.16; base.d[i * 3 + 2] = 0.04 + l * 0.12; }
    else if (fang[i]) { const r0 = base.d[i * 3], g0 = base.d[i * 3 + 1], b0 = base.d[i * 3 + 2]; const l = 0.3 * r0 + 0.59 * g0 + 0.11 * b0; base.d[i * 3] = l * 0.82; base.d[i * 3 + 1] = l * 0.74; base.d[i * 3 + 2] = l * 0.58; }
  }
  console.log('body: covered', (mask.reduce((a, b) => a + b, 0) / (W * W)).toFixed(3), 'marked texels', nMark, 'mean lum', meanL.toFixed(3));
  dilate(base, mask); await save(base, 'body_base.png');
  // normal map: renormalise, neutral where empty, then dilate
  for (let i = 0; i < W * W; i++) {
    if (!mask[i]) continue;
    let x = nrm.d[i * 3] * 2 - 1, y = nrm.d[i * 3 + 1] * 2 - 1, z = nrm.d[i * 3 + 2] * 2 - 1; const L = Math.hypot(x, y, z);
    if (L < 0.3 || z < 0) { x = 0; y = 0; z = 1; } else { x /= L; y /= L; z /= L; }
    nrm.d[i * 3] = x * 0.5 + 0.5; nrm.d[i * 3 + 1] = y * 0.5 + 0.5; nrm.d[i * 3 + 2] = z * 0.5 + 0.5;
  }
  const m2 = dilate(nrm, mask);
  for (let i = 0; i < W * W; i++) if (!m2[i]) { nrm.d[i * 3] = 0.5; nrm.d[i * 3 + 1] = 0.5; nrm.d[i * 3 + 2] = 1; }
  await save(nrm, 'body_nrm.png');
  // glow: eyes only, deep red
  for (let i = 0; i < W * W; i++) { const r = glow.d[i * 3]; glow.d[i * 3] = r * 0.9; glow.d[i * 3 + 1] = r * 0.12; glow.d[i * 3 + 2] = r * 0.06; }
  dilate(glow, glow.d.reduce((m, v, k) => { if (k % 3 === 0) m[k / 3] = v > 0.05 ? 1 : 0; return m; }, new Uint8Array(W * W)), 2);
  await save(glow, 'body_glow.png');
}
// ---------------- legs ----------------
{
  const L = src.leg;
  const base = await load('src_Spider-leg-tex.png');
  const nrm = await load('src_Spider-leg-nm.png');
  const mask = new Uint8Array(W * W);
  raster(L, (x, y) => { mask[y * W + x] = 1; });
  grade(base, mask, 0.9);
  console.log('legs: covered', (mask.reduce((a, b) => a + b, 0) / (W * W)).toFixed(3));
  dilate(base, mask); await save(base, 'leg_base.png');
  for (let i = 0; i < W * W; i++) {
    if (!mask[i]) continue;
    let x = nrm.d[i * 3] * 2 - 1, y = nrm.d[i * 3 + 1] * 2 - 1, z = nrm.d[i * 3 + 2] * 2 - 1; const Ln = Math.hypot(x, y, z);
    if (Ln < 0.3 || z < 0) { x = 0; y = 0; z = 1; } else { x /= Ln; y /= Ln; z /= Ln; }
    nrm.d[i * 3] = x * 0.5 + 0.5; nrm.d[i * 3 + 1] = y * 0.5 + 0.5; nrm.d[i * 3 + 2] = z * 0.5 + 0.5;
  }
  const m2 = dilate(nrm, mask);
  for (let i = 0; i < W * W; i++) if (!m2[i]) { nrm.d[i * 3] = 0.5; nrm.d[i * 3 + 1] = 0.5; nrm.d[i * 3 + 2] = 1; }
  await save(nrm, 'leg_nrm.png');
}
console.log('textures written');
