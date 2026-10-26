// German shepherd fur -> dark northern wolf: luminance-driven grey ramp (charcoal saddle, grey flanks, pale belly),
// pale muzzle and cheeks, amber eyes. Writes tex/wolf_base.png (2048) + previews.
import sharp from 'sharp';
const SZ = 2048;
const { data: src, info } = await sharp('tex/src_base.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== SZ) throw new Error('size');
const N = SZ * SZ;
const L = new Float32Array(N), Cr = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const r = src[i * 3] / 255, g = src[i * 3 + 1] / 255, b = src[i * 3 + 2] / 255;
  const y = 0.299 * r + 0.587 * g + 0.114 * b; L[i] = y; Cr[i * 3] = r - y; Cr[i * 3 + 1] = g - y; Cr[i * 3 + 2] = b - y;
}
// box blur (separable, repeated) of the luminance for local means
function blur(a, rad, passes = 3) {
  let x = Float32Array.from(a), t = new Float32Array(N);
  for (let p = 0; p < passes; p++) {
    for (let yy = 0; yy < SZ; yy++) { let s = 0; const row = yy * SZ; for (let k = -rad; k <= rad; k++) s += x[row + Math.min(SZ - 1, Math.max(0, k))]; for (let xx = 0; xx < SZ; xx++) { t[row + xx] = s / (2 * rad + 1); s += x[row + Math.min(SZ - 1, xx + rad + 1)] - x[row + Math.max(0, xx - rad)]; } }
    for (let xx = 0; xx < SZ; xx++) { let s = 0; for (let k = -rad; k <= rad; k++) s += t[Math.min(SZ - 1, Math.max(0, k)) * SZ + xx]; for (let yy = 0; yy < SZ; yy++) { x[yy * SZ + xx] = s / (2 * rad + 1); s += t[Math.min(SZ - 1, yy + rad + 1) * SZ + xx] - t[Math.max(0, yy - rad) * SZ + xx]; } }
  }
  return x;
}
const Lb = blur(L, 18);
const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
// soft ellipse mask (cx, cy, rx, ry, feather in px)
const ell = (x, y, cx, cy, rx, ry, f) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return 1 - smooth(1 - f / Math.min(rx, ry), 1 + f / Math.min(rx, ry), d); };
const P = JSON.parse(process.env.P || '{}');
const lo = P.lo ?? 0.08, span = P.span ?? 0.68, gam = P.gam ?? 1.15, chroma = P.chroma ?? 0.12;
// head halves: [nose, eye, muzzle-centre] in px; the lower half mirrors the upper one
const HEADS = [{ nose: [45, 590], eye: [217, 778], muzzle: [175, 610], mouth: -1 }, { nose: [45, 1442], eye: [215, 1258], muzzle: [175, 1425], mouth: 1 }];
const out = Buffer.alloc(N * 3);
const AMB = [0.92, 0.7, 0.16], AMB_D = [0.5, 0.3, 0.05];
for (let yy = 0; yy < SZ; yy++) for (let xx = 0; xx < SZ; xx++) {
  const i = yy * SZ + xx;
  let l = L[i], det = l - Lb[i];
  // pale muzzle / cheeks: shift the local mean up, keep the fur detail; nose stays black
  let m = 0, nose = 0;
  for (const h of HEADS) {
    m = Math.max(m, ell(xx, yy, h.muzzle[0], h.muzzle[1], P.mrx ?? 150, P.mry ?? 95, 45));
    m = Math.max(m, 0.8 * ell(xx, yy, h.eye[0] + 60, h.eye[1] + h.mouth * 110, 85, 60, 40) * (P.cheek ?? 1)); // cheek below the eye
    nose = Math.max(nose, ell(xx, yy, h.nose[0], h.nose[1], 55, 62, 25));
  }
  // lip line (dark): segment from the nose towards the mouth corner
  let lip = 0;
  for (const h of HEADS) {
    const ax = h.nose[0] + 70, ay = h.nose[1] + h.mouth * 85, bx = h.nose[0] + 265, by = h.nose[1] + h.mouth * 5;
    const ux = bx - ax, uy = by - ay, tt = Math.min(1, Math.max(0, ((xx - ax) * ux + (yy - ay) * uy) / (ux * ux + uy * uy)));
    const dd = Math.hypot(xx - ax - ux * tt, yy - ay - uy * tt);
    lip = Math.max(lip, 1 - smooth(P.lipw ?? 12, (P.lipw ?? 12) + 14, dd));
  }
  m *= (1 - nose) * (1 - (P.lipk ?? 0.85) * lip) * (P.muzzle ?? 1);
  if (m > 0) { const target = P.mt ?? 0.5; l = l + m * (Math.max(Lb[i], target) - Lb[i]) + m * det * (P.mdet ?? 0.6); }
  // grey ramp
  let g = lo + span * Math.pow(Math.min(1, Math.max(0, l)), gam);
  let r = g + chroma * Cr[i * 3] + 0.004, gg = g + chroma * Cr[i * 3 + 1] + 0.002, b = g + chroma * Cr[i * 3 + 2] + 0.012 * (1 - g);
  // mouth interior (gums, tongue, teeth) at the corners: keep, slightly darker and desaturated
  const corner = (yy < 190 || yy > 1858) && xx < 760;
  if (corner) { const s = src; r = s[i * 3] / 255 * 0.8; gg = s[i * 3 + 1] / 255 * 0.78; b = s[i * 3 + 2] / 255 * 0.78; const y2 = (r + gg + b) / 3; r = y2 + (r - y2) * 0.7; gg = y2 + (gg - y2) * 0.7; b = y2 + (b - y2) * 0.7; }
  // eyes: amber iris, black pupil, keep the specular highlight
  for (const h of HEADS) {
    const dx = (xx - h.eye[0]) / 20, dy = (yy - h.eye[1]) / 17, d = Math.hypot(dx, dy);
    if (d < 1.15) {
      const s0 = src[i * 3] / 255, s1 = src[i * 3 + 1] / 255, s2 = src[i * 3 + 2] / 255;
      const hl = smooth(0.35, 0.6, Math.min(s0, s1, s2)) * smooth(-0.05, 0.08, s2 - s0); // bluish-white reflection
      const w = 1 - smooth(0.9, 1.12, d);
      const t = smooth(0.25, 0.95, d);
      let c = [AMB[0] + (AMB_D[0] - AMB[0]) * t, AMB[1] + (AMB_D[1] - AMB[1]) * t, AMB[2] + (AMB_D[2] - AMB[2]) * t];
      const pupil = 1 - smooth(0.32, 0.45, Math.hypot(dx * 0.9, dy * 1.1));
      c = c.map((v) => v * (1 - pupil) + 0.02 * pupil);
      const fib = 0.85 + 0.3 * (L[i] - Lb[i]) * 4;    // iris texture from the source detail
      c = c.map((v, k) => (v * fib) * (1 - hl) + [s0, s1, s2][k] * hl);
      r = r * (1 - w) + c[0] * w; gg = gg * (1 - w) + c[1] * w; b = b * (1 - w) + c[2] * w;
    }
  }
  out[i * 3] = Math.round(Math.min(1, Math.max(0, r)) * 255); out[i * 3 + 1] = Math.round(Math.min(1, Math.max(0, gg)) * 255); out[i * 3 + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
}
// pad: fill the background with blurred island colours (no dark seams in the mips)
{
  const isl = new Float32Array(N); for (let i = 0; i < N; i++) isl[i] = (src[i * 3] + src[i * 3 + 1] + src[i * 3 + 2]) > 6 ? 1 : 0;
  const ch = [0, 1, 2].map((k) => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = out[i * 3 + k] * isl[i]; return a; });
  const done = Float32Array.from(isl);
  for (const rad of [4, 16, 64]) {
    const mb = blur(isl, rad, 2), cb = ch.map((a) => blur(a, rad, 2));
    for (let i = 0; i < N; i++) if (!done[i] && mb[i] > 0.02) { for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(cb[k][i] / mb[i]); done[i] = 1; }
  }
}
const img = sharp(out, { raw: { width: SZ, height: SZ, channels: 3 } });
await img.clone().png().toFile('tex/wolf_base.png');
await img.clone().resize(768).png().toFile('tex/wolf_base_s.png');
await img.clone().extract({ left: 0, top: 450, width: 420, height: 1150 }).png().toFile('tex/wolf_head_crop.png');
await img.clone().extract({ left: 120, top: 700, width: 200, height: 150 }).resize(400).png().toFile('tex/wolf_eye_crop.png');
console.log('ok');
