// Re-tints the Kelgar goblin atlas: grimy, desaturated grey-green skin with darker grime, amber eyes,
// leather / cloth / bone / gold islands kept but muted. Writes tex/goblin-base.png (1024) and tex/goblin-norm512.png.
import sharp from 'sharp';
const SRC = 'tex/goblin-tex.png';
const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, out = Buffer.alloc(W * H * 3);
// non-skin islands (pixel rects in the 1024 atlas, from the UV bounds of each part)
const RECTS = {
  belt: [505, 448, 870, 496], cord: [575, 830, 808, 850], cloth: [770, 820, 1024, 1024], gold: [590, 955, 760, 1010],
  tooth: [462, 175, 505, 218], eye: [893, 510, 1024, 645]
};
const inR = (x, y, r) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const mix = (a, b, t) => a + (b - a) * t;
// skin ramp (sRGB 0..1): deep grime -> mid -> highlight, cold grey-green
const RAMP = [[0.0, [0.10, 0.10, 0.085]], [0.35, [0.22, 0.23, 0.195]], [0.65, [0.385, 0.405, 0.345]], [1.0, [0.55, 0.565, 0.49]]];
function ramp(t) {
  for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) { const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i]; const f = (t - t0) / (t1 - t0); return c0.map((v, k) => mix(v, c1[k], f)); }
  return RAMP[RAMP.length - 1][1];
}
const EYE = [958, 577];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 3, r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  let o;
  if (inR(x, y, RECTS.eye)) {
    const d = Math.hypot(x - EYE[0], y - EYE[1]);
    if (d < 7) o = [0.04, 0.02, 0.01];
    else if (d < 17) { const f = (d - 7) / 10; o = [mix(1.0, 0.75, f), mix(0.72, 0.38, f), mix(0.18, 0.05, f)]; }
    else { const f = Math.min(1, (d - 17) / 45); o = [mix(0.62, 0.30, f), mix(0.52, 0.22, f), mix(0.16, 0.06, f)]; }
  } else if (inR(x, y, RECTS.belt) || inR(x, y, RECTS.cord) || inR(x, y, RECTS.cloth)) {
    // leather and rag: darker, browner, desaturated
    const s = 0.55; o = [mix(L, r, s) * 0.62, mix(L, g, s) * 0.58, mix(L, b, s) * 0.52];
  } else if (inR(x, y, RECTS.tooth)) {
    o = [L * 0.82, L * 0.78, L * 0.66];
  } else if (inR(x, y, RECTS.gold)) {
    o = [r * 0.7, g * 0.62, b * 0.45];
  } else {
    // skin: luminance through a contrasty grey-green ramp, keep a little of the original chroma (veins, lips, brows)
    let t = Math.max(0, Math.min(1, (L - 0.18) / 0.62));
    t = t * t * (3 - 2 * t) * 0.85 + t * 0.15;
    const c = ramp(t), k = 0.18;
    o = [c[0] + (r - L) * k, c[1] + (g - L) * k, c[2] + (b - L) * k];
  }
  out[i] = clamp(o[0] * 255); out[i + 1] = clamp(o[1] * 255); out[i + 2] = clamp(o[2] * 255);
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile('tex/goblin-base.png');
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).resize(512).toFile('tex_base_prev.png');
await sharp('tex/goblin-norm.png').removeAlpha().resize(512, 512).png().toFile('tex/goblin-norm512.png');
console.log('ok', W, H);
