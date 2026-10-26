// Loincloth: worked at the final 512 px (resampling RGBA later brings pale colours back under the faint edge alpha);
// colours bled into the cut-out, the light frayed rim along the torn edges darkened, the whole cloth a little darker
// and desaturated. Its normal map (generated from the diffuse in the source) flattened towards the torn edges and
// halved elsewhere. Eye: amber iris texture with a darker, yellowed sclera.
import sharp from 'sharp';
const R = 512;
const { data, info } = await sharp('tex/cloth_uv.png').resize(R, R).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, n = W * H;
const blur1 = (buf, s) => sharp(buf, { raw: { width: W, height: H, channels: 1 } }).blur(s).raw().toBuffer();
const alpha = Buffer.from(Array.from({ length: n }, (_, i) => data[i * 4 + 3]));
{
  // bleed: blur(premultiplied colour) / blur(alpha), as separate 3- and 1-channel images (no double premultiply)
  const pm = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) { const a = data[i * 4 + 3] / 255; for (let c = 0; c < 3; c++) pm[i * 3 + c] = Math.round(data[i * 4 + c] * a); }
  const blc = await sharp(pm, { raw: { width: W, height: H, channels: 3 } }).blur(5).raw().toBuffer();
  const bla = await blur1(alpha, 5);
  const ab = await blur1(alpha, 2.5);               // < 1 near the torn edges
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3], ba = Math.max(0.02, bla[i] / 255);
    const bled = [0, 1, 2].map((c) => Math.min(255, blc[i * 3 + c] / ba));
    let rgb = [0, 1, 2].map((c) => (a >= 250 ? data[i * 4 + c] : bled[c]));
    const edge = Math.min(1, Math.max(0, (0.995 - ab[i] / 255) / 0.3));
    if (edge > 0) rgb = rgb.map((v, c) => v * (1 - edge) + bled[c] * 0.45 * edge);
    const l = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round((rgb[c] * 0.72 + l * 0.28) * 0.82);
    out[i * 4 + 3] = a < 24 ? 0 : a > 232 ? 255 : a;
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile('tex/cloth_troll.png');
}
{
  const ab = await blur1(alpha, 3);
  const { data: nm } = await sharp('tex/cloth_uv_NRM.png').resize(W, H).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(n * 3), flat = [128, 128, 255];
  for (let i = 0; i < n; i++) {
    const keep = 0.55 * Math.min(1, Math.max(0, (ab[i] / 255 - 0.75) / 0.2));
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(flat[k] + (nm[i * 3 + k] - flat[k]) * keep);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile('tex/cloth_nrm_512.png');
}
{
  const { data: e, info: ei } = await sharp('tex/Material_Diffuse_Color.png').resize(256, 256).raw().toBuffer({ resolveWithObject: true });
  const m = ei.width * ei.height, ch = ei.channels, out = Buffer.alloc(m * 3);
  for (let i = 0; i < m; i++) {
    const r = e[i * ch], g = e[i * ch + 1], b = e[i * ch + 2];
    const scl = Math.abs(r - 0x66) < 18 && Math.abs(g - 0x2a) < 18 && b < 30;   // flat brown sclera
    out[i * 3] = scl ? 74 : r; out[i * 3 + 1] = scl ? 62 : g; out[i * 3 + 2] = scl ? 30 : b;
  }
  await sharp(out, { raw: { width: ei.width, height: ei.height, channels: 3 } }).png().toFile('tex/eye_troll.png');
}
console.log('textures ok');
