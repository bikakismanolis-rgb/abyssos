// Ashspawn retexture: bakes a charred base colour + ember emissive map for the Executioner UV layout.
// Cracks are generated in 3D (bind-pose positions rasterised into UV space), so they run continuously across UV seams.
// usage (cwd = this folder): node textures.mjs [N=1024]  -> tex/ash_base.png, tex/ash_emit.png, tex/ash_nrm.png (512)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const N = +(process.argv[2] || 1024);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('base_raw.glb');
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const POS = prim.getAttribute('POSITION').getArray(), NRM = prim.getAttribute('NORMAL').getArray(), UV = prim.getAttribute('TEXCOORD_0').getArray(), IDX = prim.getIndices().getArray();

// ---------- source maps at N ----------
const load = async (f, ch = 3) => (await sharp(f).resize(N, N).removeAlpha().raw().toBuffer());
const DIF = await load('tex/src_diffus2.jpg'), AO = await load('tex/src_ao.jpg');
// luminance + its blur (local contrast keeps folds, muscles and stitching)
const LUM = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) LUM[i] = (0.2126 * DIF[i * 3] + 0.7152 * DIF[i * 3 + 1] + 0.0722 * DIF[i * 3 + 2]) / 255;

// ---------- rasterise bind-pose position / normal into UV space ----------
const PX = new Float32Array(N * N * 3), NX = new Float32Array(N * N * 3), COV = new Uint8Array(N * N);
for (let t = 0; t < IDX.length; t += 3) {
  const id = [IDX[t], IDX[t + 1], IDX[t + 2]];
  const uv = id.map((i) => [UV[i * 2] * N - 0.5, UV[i * 2 + 1] * N - 0.5]);
  const [a, b, c] = uv;
  const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(den) < 1e-12) continue;
  const x0 = Math.floor(Math.min(a[0], b[0], c[0])) - 1, x1 = Math.ceil(Math.max(a[0], b[0], c[0])) + 1;
  const y0 = Math.floor(Math.min(a[1], b[1], c[1])) - 1, y1 = Math.ceil(Math.max(a[1], b[1], c[1])) + 1;
  for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) {
    let l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / den, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / den, l3 = 1 - l1 - l2;
    const e = -0.02; if (l1 < e || l2 < e || l3 < e) continue;
    const k = y * N + x; if (COV[k] === 2) continue;
    const inside = l1 >= 0 && l2 >= 0 && l3 >= 0;
    for (let j = 0; j < 3; j++) { PX[k * 3 + j] = l1 * POS[id[0] * 3 + j] + l2 * POS[id[1] * 3 + j] + l3 * POS[id[2] * 3 + j]; NX[k * 3 + j] = l1 * NRM[id[0] * 3 + j] + l2 * NRM[id[1] * 3 + j] + l3 * NRM[id[2] * 3 + j]; }
    COV[k] = inside ? 2 : 1;
  }
}

// ---------- noise ----------
const hash = (x, y, z, s = 0) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function vnoise(x, y, z, s = 0) {   // value noise, 0..1
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const L = (a, b, t) => a + (b - a) * t;
  const h = (i, j, k) => hash(xi + i, yi + j, zi + k, s);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), xf), L(h(0, 1, 0), h(1, 1, 0), xf), yf), L(L(h(0, 0, 1), h(1, 0, 1), xf), L(h(0, 1, 1), h(1, 1, 1), xf), yf), zf);
}
function fbm(x, y, z, oct = 4, s = 0) { let a = 0.5, f = 1, sum = 0, n = 0; for (let o = 0; o < oct; o++) { sum += a * vnoise(x * f, y * f, z * f, s + o * 17); n += a; a *= 0.5; f *= 2.03; } return sum / n; }
// distance to the nearest Voronoi cell border (cells of size 1), plus the nearest feature's id
function voro(x, y, z, s = 0, jit = 0.8) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let best = 1e9, bx = 0, by = 0, bz = 0, bid = 0, bc = null;
  const pt = (i, j, k) => [i + 0.5 + jit * (hash(i, j, k, s) - 0.5), j + 0.5 + jit * (hash(i, j, k, s + 1) - 0.5), k + 0.5 + jit * (hash(i, j, k, s + 2) - 0.5)];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const p = pt(xi + i, yi + j, zi + k), d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2;
    if (d < best) { best = d; [bx, by, bz] = p; bc = [xi + i, yi + j, zi + k]; }
  }
  let edge = 1e9;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
    const c = [bc[0] + i, bc[1] + j, bc[2] + k]; if (!i && !j && !k) continue;
    const p = pt(c[0], c[1], c[2]);
    const dx = p[0] - bx, dy = p[1] - by, dz = p[2] - bz, l = Math.hypot(dx, dy, dz);
    const m = ((x - (bx + p[0]) / 2) * dx + (y - (by + p[1]) / 2) * dy + (z - (bz + p[2]) / 2) * dz) / l;
    if (-m < edge) edge = -m;
  }
  return { edge, f1: Math.sqrt(best), id: hash(bc[0], bc[1], bc[2], s + 9) };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const hsv = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; } return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx]; };

// ---------- region masks ----------
const SKIN = new Float32Array(N * N), METAL = new Float32Array(N * N), EYE = new Uint8Array(N * N);
for (let k = 0; k < N * N; k++) {
  if (!COV[k]) continue;
  const r = DIF[k * 3] / 255, g = DIF[k * 3 + 1] / 255, b = DIF[k * 3 + 2] / 255; const [h, s, v] = hsv(r, g, b);
  const hueOk = h < 42 || h > 335 ? 1 : 0;
  SKIN[k] = hueOk * sm(0.28, 0.4, s) * sm(0.3, 0.45, v);
  METAL[k] = (1 - sm(0.12, 0.24, s)) * sm(0.22, 0.35, v);
  const y = PX[k * 3 + 1], z = PX[k * 3 + 2];
  if (y > 1.8 && z > 0.02 && s < 0.4 && v > 0.45) EYE[k] = 1;
}
// local skin fraction (blurred mask) so the eye whites inside the skin island count as skin
// eye centres from the whitish texels on the front of the head
const eyes = { L: [0, 0, 0, 0], R: [0, 0, 0, 0] };
for (let k = 0; k < N * N; k++) if (EYE[k]) { const e = PX[k * 3] > 0 ? eyes.L : eyes.R; e[0] += PX[k * 3]; e[1] += PX[k * 3 + 1]; e[2] += PX[k * 3 + 2]; e[3]++; }
for (const e of Object.values(eyes)) for (let j = 0; j < 3; j++) e[j] /= Math.max(1, e[3]);
console.log('eyes', JSON.stringify(eyes));
// blurred luminance for local contrast
const lumImg = Buffer.alloc(N * N); for (let k = 0; k < N * N; k++) lumImg[k] = Math.round(LUM[k] * 255);
const LB = await sharp(lumImg, { raw: { width: N, height: N, channels: 1 } }).blur(N / 96).extractChannel(0).raw().toBuffer();

// ---------- bake ----------
const BASE = Buffer.alloc(N * N * 3), EMIT = Buffer.alloc(N * N * 3);
const CHAR = [33, 31, 30], ASH = [124, 118, 112], CRK = [215, 92, 26], RIM = [22, 12, 9];
let glowSum = 0, skinN = 0;
for (let k = 0; k < N * N; k++) {
  if (!COV[k]) continue;
  let x = PX[k * 3], y = PX[k * 3 + 1], z = PX[k * 3 + 2];
  const ny = NX[k * 3 + 1];
  const r0 = DIF[k * 3] / 255, g0 = DIF[k * 3 + 1] / 255, b0 = DIF[k * 3 + 2] / 255;
  const L = LUM[k], lb = Math.max(0.02, LB[k] / 255);
  const detail = Math.min(1.45, Math.max(0.6, (L + 0.02) / (lb + 0.02)));
  const ao = Math.pow(AO[k * 3] / 255, 0.75);
  const skin = SKIN[k], metal = METAL[k] * (1 - skin);
  // domain warp
  const wx = x + 0.035 * (fbm(x * 7, y * 7, z * 7, 3, 1) - 0.5), wy = y + 0.035 * (fbm(x * 7, y * 7, z * 7, 3, 2) - 0.5), wz = z + 0.035 * (fbm(x * 7, y * 7, z * 7, 3, 3) - 0.5);
  // ash dusting: more on upward faces, patchy
  const ashN = 0.55 * fbm(x * 9, y * 9, z * 9, 3, 5) + 0.45 * fbm(x * 38, y * 38, z * 38, 3, 6);
  let ashAmt = Math.min(1, Math.max(0, (ashN - 0.42) * 2.4 + 0.3 * Math.max(0, ny)));
  let col;
  if (skin > 0) {
    // charred skin: charcoal with ash flakes, folds from the original shading
    const c = CHAR.map((v, j) => mix(v, ASH[j], ashAmt * 0.66));
    col = c.map((v) => v * Math.pow(detail, 1.6) * ao);
  }
  // garments: desaturate, darken, keep a hint of the original hue (leather stays warmer than cloth)
  const lumG = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
  const keep = 0.22, gain = 0.16 / 0.16;
  let gcol = [r0, g0, b0].map((v) => mix(lumG, v, keep) * 255 * gain * 0.85 + 6);
  gcol = gcol.map((v, j) => mix(v, ASH[j] * 0.78, ashAmt * 0.5) * Math.pow(detail, 1.25) * ao);
  if (metal > 0) { const m = gcol.map((v) => v * 0.7 + 4); gcol = gcol.map((v, j) => mix(v, m[j], metal)); }
  col = col ? col.map((v, j) => mix(gcol[j], v, skin)) : gcol;

  // ---- ember cracks (skin) ----
  let glow = 0, halo = 0;
  if (skin > 0.05) {
    const face = y > 1.72 && z > 0.02 ? 0.12 : 0;
    const cov = sm(0.4 - face, 0.56 - face, fbm(x * 2.4 + 3.1, y * 2.4, z * 2.4, 3, 11)) * skin;
    if (cov > 0) {
      const S1 = 0.095, v1 = voro(wx / S1, wy / S1, wz / S1, 21);
      const d1 = v1.edge * S1;
      const w1 = 0.0046 * (0.45 + 1.1 * vnoise(x * 8, y * 8, z * 8, 31) ** 1.5);
      const brk = sm(0.38, 0.55, vnoise(wx * 13, wy * 13, wz * 13, 41));
      const c1 = (1 - sm(w1 * 0.35, w1, d1)) * cov * brk;
      // thin secondary cracks branching off near the primary ones
      const S2 = 0.03, v2 = voro(wx / S2 + 7.7, wy / S2, wz / S2, 51);
      const d2 = v2.edge * S2, w2 = 0.0019;
      const near = Math.exp(-d1 / 0.014) * brk;
      const c2 = (1 - sm(w2 * 0.3, w2, d2)) * cov * near * sm(0.45, 0.62, vnoise(wx * 30, wy * 30, wz * 30, 61)) * 0.6;
      glow = Math.max(c1, c2);
      halo = Math.exp(-d1 / 0.011) * cov * brk;
    }
  }
  // ---- sparse embers in the cloth (smouldering), more towards the hems ----
  if (skin < 0.5 && metal < 0.5) {
    const cg = sm(0.6, 0.7, fbm(x * 3.1 + 9.4, y * 3.1, z * 3.1, 3, 81));
    if (cg > 0) {
      const S4 = 0.08, v4 = voro(wx / S4 + 3.3, wy / S4, wz / S4, 91);
      const w4 = 0.0028 * (0.5 + vnoise(x * 10, y * 10, z * 10, 93));
      const c4 = (1 - sm(w4 * 0.3, w4, v4.edge * S4)) * cg * sm(0.45, 0.6, vnoise(wx * 14, wy * 14, wz * 14, 95)) * 0.6 * (1 - skin);
      glow = Math.max(glow, c4); halo = Math.max(halo, Math.exp(-(v4.edge * S4) / 0.008) * cg * 0.35 * (1 - skin));
    }
    const S3 = 0.045, v3 = voro(x / S3, y / S3, z / S3, 71, 0.9);
    if (v3.id > 0.9) {
      const rr = 0.0035 * (0.6 + v3.id * 0.6);
      const e = (1 - sm(rr * 0.4, rr, v3.f1 * S3)) * (0.35 + 0.65 * sm(0.6, 0.15, y)) * 0.75;
      glow = Math.max(glow, e * (1 - skin));
      halo = Math.max(halo, Math.exp(-(v3.f1 * S3) / 0.006) * 0.5 * (1 - skin));
    }
  }
  // ---- eyes ----
  for (const e of [eyes.L, eyes.R]) {
    if (!e[3]) continue;
    const d = Math.hypot(x - e[0], y - e[1], z - e[2]);
    glow = Math.max(glow, 1 - sm(0.011, 0.02, d));
    halo = Math.max(halo, Math.exp(-d / 0.012));
  }
  glowSum += glow; skinN += skin > 0.5 ? 1 : 0;
  // base colour: dark rim around cracks, hot orange in the crack
  col = col.map((v, j) => mix(v, RIM[j], Math.min(1, halo * 0.75) * (1 - glow)));
  col = col.map((v, j) => mix(v, CRK[j], Math.min(1, glow)));
  // emissive: deep red at the edges, orange, yellow-white core
  const t = Math.min(1, glow);
  const em = t < 0.6 ? [mix(70, 255, t / 0.6), mix(8, 105, t / 0.6), mix(0, 18, t / 0.6)] : [255, mix(105, 190, (t - 0.6) / 0.4), mix(18, 85, (t - 0.6) / 0.4)];
  const hl = Math.min(1, halo) * 0.28;
  for (let j = 0; j < 3; j++) {
    BASE[k * 3 + j] = Math.max(0, Math.min(255, Math.round(col[j])));
    EMIT[k * 3 + j] = Math.max(0, Math.min(255, Math.round(em[j] * Math.min(1, t * 1.3) + [120, 22, 2][j] * hl)));
  }
}
console.log('mean glow over covered', (glowSum / COV.reduce((a, v) => a + (v ? 1 : 0), 0)).toFixed(4), 'skin texels', skinN);
// ---------- dilate into the gutters (8 px) ----------
function dilate(buf, cov, it) {
  let c = Uint8Array.from(cov, (v) => (v ? 1 : 0));
  for (let n = 0; n < it; n++) {
    const nc = c.slice();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const k = y * N + x; if (c[k]) continue;
      let s = [0, 0, 0], m = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const kk = yy * N + xx; if (!c[kk]) continue; for (let j = 0; j < 3; j++) s[j] += buf[kk * 3 + j]; m++; }
      if (m) { for (let j = 0; j < 3; j++) buf[k * 3 + j] = Math.round(s[j] / m); nc[k] = 1; }
    }
    c = nc;
  }
}
dilate(BASE, COV, 10); dilate(EMIT, COV, 10);
await sharp(BASE, { raw: { width: N, height: N, channels: 3 } }).png().toFile('tex/ash_base.png');
await sharp(EMIT, { raw: { width: N, height: N, channels: 3 } }).png().toFile('tex/ash_emit.png');
await sharp('tex/src_normal.jpg').resize(512, 512).png().toFile('tex/ash_nrm.png');
// preview sheet
const a = await sharp(BASE, { raw: { width: N, height: N, channels: 3 } }).resize(700).png().toBuffer();
const b = await sharp(EMIT, { raw: { width: N, height: N, channels: 3 } }).resize(700).png().toBuffer();
await sharp({ create: { width: 1400, height: 700, channels: 3, background: '#000' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: 700, top: 0 }]).png().toFile('r/tex_sheet.png');
console.log('wrote tex/ash_base.png tex/ash_emit.png tex/ash_nrm.png');
