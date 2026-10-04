// Texture work for the wight / barrow lord: corpse skin from the MakeHuman old-male skin (CC0) with zombie mottling
// (sohh_female_zombie_skin, CC0), dark rotten cloth from the monk robe (CC0), UV-space height maps for hem grime.
import sharp from 'sharp';
import { THREE } from './lib.mjs';

export async function load(path, size) {
  const { data, info } = await sharp(path).resize(size, size, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: data };
}
export async function save(img, ch = 3) {
  return sharp(Buffer.from(img.d), { raw: { width: img.w, height: img.h, channels: ch } }).png().toBuffer();
}
const lum = (d, i) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// gradient map: luminance -> palette stops [[l, [r,g,b]], ...] (0..1 colours)
function gradient(stops, l) {
  if (l <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (l <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const t = (l - a) / (b - a); return ca.map((c, k) => mix(c, cb[k], t)); }
  return stops[stops.length - 1][1];
}

// dead skin: old-male luminance mapped to a cold grey-blue ramp, zombie bruising darkens and greens it
export async function corpseSkin(oldPath, zombiePath, size, o = {}) {
  const A = await load(oldPath, size), Z = await load(zombiePath, size);
  const stops = o.stops || [[0.05, [0.05, 0.06, 0.08]], [0.35, [0.20, 0.23, 0.27]], [0.6, [0.42, 0.47, 0.50]], [0.8, [0.62, 0.67, 0.68]], [1.0, [0.74, 0.78, 0.78]]];
  // mean zombie luminance for normalisation
  let mz = 0, n = 0; for (let i = 0; i < Z.d.length; i += 3) { const l = lum(Z.d, i); if (l > 0.08) { mz += l; n++; } } mz /= n;
  const out = new Uint8Array(A.d.length);
  for (let i = 0; i < A.d.length; i += 3) {
    let l = lum(A.d, i);
    l = Math.pow(l, o.gamma ?? 1.25);
    let c = gradient(stops, l * (o.lift ?? 1));
    const lz = lum(Z.d, i), r = Z.d[i] / 255, g = Z.d[i + 1] / 255, b = Z.d[i + 2] / 255;
    if (lz > 0.06) {
      const m = Math.min(1.25, lz / mz);              // mottling
      const bruise = Math.max(0, r - g) * 1.6;         // red/purple patches -> dark sickly blotches
      const k = mix(1, m, o.mottle ?? 0.45) * (1 - Math.min(0.45, bruise * (o.bruise ?? 0.6)));
      c = [c[0] * k * (1 - bruise * 0.15), c[1] * k * (1 + bruise * 0.05), c[2] * k];
    }
    for (let j = 0; j < 3; j++) out[i + j] = Math.max(0, Math.min(255, Math.round(c[j] * 255)));
  }
  return { w: A.w, h: A.h, d: out };
}

// rasterise mesh triangles in UV space, writing an interpolated per-vertex scalar (e.g. rest height); -1 = empty
export function uvRaster(size, prims, valueOf) {
  const map = new Float32Array(size * size).fill(-1);
  for (const prim of prims) {
    const uv = prim.getAttribute('TEXCOORD_0'), pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
    const n = idx ? idx.getCount() : pos.getCount();
    const val = []; for (let i = 0; i < pos.getCount(); i++) val.push(valueOf(pos.getElement(i, []), i));
    const U = (i) => uv.getElement(i, []);
    for (let t = 0; t < n; t += 3) {
      const ids = [0, 1, 2].map((k) => (idx ? idx.getScalar(t + k) : t + k));
      const P = ids.map((i) => { const u = U(i); return [u[0] * size, u[1] * size]; });
      const vv = ids.map((i) => val[i]);
      const minx = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), maxx = Math.min(size - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
      const miny = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), maxy = Math.min(size - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
      const den = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]);
      if (Math.abs(den) < 1e-12) continue;
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5;
        let a = ((P[1][1] - P[2][1]) * (px - P[2][0]) + (P[2][0] - P[1][0]) * (py - P[2][1])) / den;
        let b = ((P[2][1] - P[0][1]) * (px - P[2][0]) + (P[0][0] - P[2][0]) * (py - P[2][1])) / den;
        let c = 1 - a - b;
        const e = -0.02; if (a < e || b < e || c < e) continue;
        map[y * size + x] = a * vv[0] + b * vv[1] + c * vv[2];
      }
    }
  }
  // dilate a few pixels so seams and mip levels pick up the values
  for (let it = 0; it < 6; it++) {
    const src = map.slice();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x; if (src[i] >= 0) continue;
      let s = 0, c = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= size || Y >= size) continue; const v = src[Y * size + X]; if (v >= 0) { s += v; c++; } }
      if (c) map[i] = s / c;
    }
  }
  return map;
}

// rotten dark cloth: desaturate, tint, darken; height map (metres, -1 = unknown) adds hem grime
export async function darkCloth(path, size, o = {}) {
  const A = await load(path, size);
  const out = new Uint8Array(A.d.length);
  const tint = o.tint || [0.62, 0.68, 0.66], gain = o.gain ?? 0.55, hm = o.height;
  for (let p = 0, i = 0; i < A.d.length; i += 3, p++) {
    const r = A.d[i] / 255, g = A.d[i + 1] / 255, b = A.d[i + 2] / 255;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = o.sat ?? 0.15;
    let c = [mix(l, r, sat), mix(l, g, sat), mix(l, b, sat)].map((x, k) => Math.pow(x, o.gamma ?? 1.1) * tint[k] * gain);
    if (hm && hm[p] >= 0) {
      const h = hm[p];
      const k = mix(o.hemDark ?? 0.45, 1, sstep(o.hemFrom ?? 0.02, o.hemTo ?? 0.55, h));
      const mud = (1 - sstep(0.0, o.hemTo ?? 0.55, h)) * (o.mud ?? 0.35);
      c = [c[0] * k + mud * 0.06, c[1] * k + mud * 0.05, c[2] * k + mud * 0.03];
    }
    for (let j = 0; j < 3; j++) out[i + j] = Math.max(0, Math.min(255, Math.round(c[j] * 255)));
  }
  return { w: A.w, h: A.h, d: out };
}

// generic recolour: per pixel fn(r,g,b) -> [r,g,b] in 0..1
export async function recolor(path, size, fn) {
  const A = await load(path, size);
  const out = new Uint8Array(A.d.length);
  for (let p = 0, i = 0; i < A.d.length; i += 3, p++) {
    const c = fn(A.d[i] / 255, A.d[i + 1] / 255, A.d[i + 2] / 255, p % A.w, Math.floor(p / A.w));
    for (let j = 0; j < 3; j++) out[i + j] = Math.max(0, Math.min(255, Math.round(c[j] * 255)));
  }
  return { w: A.w, h: A.h, d: out };
}
export async function resized(path, size) { return sharp(path).resize(size, size, { fit: 'fill' }).png().toBuffer(); }
export async function solid(rgb, size = 4) {
  return sharp({ create: { width: size, height: size, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).png().toBuffer();
}
export { sstep, mix };
