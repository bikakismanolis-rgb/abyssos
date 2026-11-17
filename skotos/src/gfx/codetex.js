// Ground layers made in code (Act VII: no download). Each is a tileable albedo (sRGB) and, on quality 1 and up, a normal
// map (OpenGL, as the packs'), made once from a fixed seed, so every page and every visit draws the same ground.
// env.js codeLayer(id) registers them as ENV.layers['melt/<id>'], the names build.js's ground chain asks for:
//   meadow  spring grass in sun: light yellow-green, low contrast, fine blades, a few pale flower specks
//   gravel  wet light gravel and small scree: brook beds, the Race's banks, fords
//   crag    pale weathered limestone: the steep faces and the rock that frames a daylight zone
// Nothing in a tile is broader than a sixth of it: the play camera sees six or seven repeats of a 3 m tile, and any
// broad light or dark patch in the tile shows as a grid. The broad variation is the layout's (build.js: aLay, the colours)
import * as THREE from 'three';

// a seeded generator (mulberry32) and a lattice hash that wraps at `per`
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = (t) => t * t * (3 - 2 * t);
// value noise, periodic: u, v in tiles (0-1 one tile), per lattice cells to the tile
function vnoise(u, v, per, s) {
  const x = u * per, y = v * per, x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0);
  const w = (i) => ((i % per) + per) % per;
  const a = hash(w(x0), w(y0), s), b = hash(w(x0 + 1), w(y0), s), c = hash(w(x0), w(y0 + 1), s), d = hash(w(x0 + 1), w(y0 + 1), s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(u, v, per, oct, s) { let f = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { f += a * vnoise(u, v, per << o, s + o * 17); n += a; a *= 0.5; } return f / n; }
// Worley noise, periodic: [distance to the nearest point, to the second, the nearest cell's own random]
function worley(u, v, per, s) {
  const x = u * per, y = v * per, cx = Math.floor(x), cy = Math.floor(y), w = (i) => ((i % per) + per) % per;
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j, px = gx + 0.15 + 0.7 * hash(w(gx), w(gy), s), py = gy + 0.15 + 0.7 * hash(w(gx), w(gy), s + 7);
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; id = hash(w(gx), w(gy), s + 13); } else if (d < d2) d2 = d;
  }
  return [d1, d2, id];
}
const lerp = (a, b, t) => a + (b - a) * t, clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// spring grass: a field of short blades (strokes laid into a height and a tone buffer, wrapped at the edges), lit
// yellow-green, a little straw among it, pale flower specks
function meadow(N) {
  const H = new Float32Array(N * N), T = new Float32Array(N * N), S = new Float32Array(N * N), r = rng(7101), k = N / 1024;
  const strokes = Math.round(52000 * k * k);
  for (let n = 0; n < strokes; n++) {
    let x = r() * N, y = r() * N;
    const an = (r() - 0.5) * 2.4 + (r() < 0.5 ? 0 : Math.PI), len = (5 + r() * 11) * k, dx = Math.sin(an), dy = Math.cos(an);
    const tone = (r() - 0.5) * 0.5, straw = r() < 0.09 ? 0.5 + r() * 0.5 : 0, hgt = 0.35 + r() * 0.65;
    for (let s = 0; s <= len; s++) {
      const t = s / Math.max(len, 1), i = ((Math.floor(y) % N + N) % N) * N + ((Math.floor(x) % N + N) % N), a = 0.55 * (1 - t * 0.6);
      H[i] = Math.max(H[i], hgt * (0.4 + 0.6 * t)); T[i] += (tone - T[i]) * a; S[i] += (straw - S[i]) * a;
      x += dx; y += dy;
    }
  }
  const out = new Uint8Array(N * N * 4), lo = [0.47, 0.55, 0.27], hi = [0.62, 0.67, 0.37], straw = [0.74, 0.7, 0.46];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, v = y / N;
    // (clumps a hand across, and a fine grain: nothing broader)
    const cl = fbm(u, v, 24, 2, 31), fine = vnoise(u, v, 256, 57);
    let c = mix3(lo, hi, clamp01(0.5 + (cl - 0.5) * 0.7 + T[i] * 0.55 + (H[i] - 0.5) * 0.22 + (fine - 0.5) * 0.12));
    c = mix3(c, straw, clamp01(S[i]) * 0.6);
    out[i * 4] = Math.round(clamp01(c[0]) * 255); out[i * 4 + 1] = Math.round(clamp01(c[1]) * 255); out[i * 4 + 2] = Math.round(clamp01(c[2]) * 255); out[i * 4 + 3] = 255;
    H[i] = H[i] * 0.7 + cl * 0.3;
  }
  // flowers: small pale specks, white and butter-yellow, a few to the square metre
  const fl = Math.round(120 * (N / 1024) ** 2);
  for (let n = 0; n < fl; n++) {
    const fx = Math.floor(r() * N), fy = Math.floor(r() * N), col = r() < 0.6 ? [236, 236, 214] : [238, 220, 120], rad = r() < 0.3 ? 2 : 1;
    for (let j = -rad; j <= rad; j++) for (let i2 = -rad; i2 <= rad; i2++) {
      if (i2 * i2 + j * j > rad * rad) continue;
      const i = (((fy + j) % N + N) % N) * N + ((fx + i2) % N + N) % N;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(lerp(out[i * 4 + c], col[c], 0.7));
    }
  }
  return { rgba: out, hgt: H, ns: 1.4 };
}
// wet gravel: pebbles of a thumb to a fist, pale grey and buff, a few dark and a few rust, sand in the gaps
function gravel(N) {
  const H = new Float32Array(N * N), out = new Uint8Array(N * N * 4);
  const tones = [[0.66, 0.65, 0.62], [0.74, 0.71, 0.64], [0.58, 0.6, 0.62], [0.7, 0.62, 0.52], [0.5, 0.5, 0.5]], sand = [0.52, 0.48, 0.4];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, v = y / N;
    const a = worley(u, v, 26, 11), b = worley(u, v, 61, 23);
    // (two sizes: the larger stones lie over a bed of the small)
    const big = clamp01((a[1] - a[0]) * 3.2) * (a[2] > 0.45 ? 1 : 0), small = clamp01((b[1] - b[0]) * 3.0);
    const useBig = big > 0.12, w = useBig ? a : b, edge = useBig ? big : small;
    const dome = Math.sqrt(clamp01(edge)) * (useBig ? 1 : 0.55);
    const fine = vnoise(u, v, 256, 91);
    let c = tones[Math.floor(w[2] * 4.999)];
    c = [c[0] * (0.86 + 0.2 * hash(Math.floor(w[2] * 977), 3, 5)), c[1] * (0.86 + 0.2 * hash(Math.floor(w[2] * 977), 3, 5)), c[2] * (0.86 + 0.2 * hash(Math.floor(w[2] * 977), 3, 5))];
    c = mix3(sand, c, clamp01(edge * 4.0));
    const sh = 0.8 + 0.22 * dome + (fine - 0.5) * 0.08;
    out[i * 4] = Math.round(clamp01(c[0] * sh) * 255); out[i * 4 + 1] = Math.round(clamp01(c[1] * sh) * 255); out[i * 4 + 2] = Math.round(clamp01(c[2] * sh) * 255); out[i * 4 + 3] = 255;
    H[i] = dome;
  }
  return { rgba: out, hgt: H, ns: 1.8 };
}
// pale limestone: beds a hand thick, broken by joints, pitted; lichen-grey and buff
function crag(N) {
  const H = new Float32Array(N * N), out = new Uint8Array(N * N * 4), a0 = [0.62, 0.61, 0.58], a1 = [0.74, 0.72, 0.66];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, v = y / N;
    const warp = fbm(u, v, 8, 3, 3) - 0.5;
    // (beds: bands along u, their edges wandering; joints: a coarse cell pattern's edges)
    const bed = v * 14 + warp * 2.2, bf = bed - Math.floor(bed), bedEdge = clamp01(1 - Math.min(bf, 1 - bf) * 9);
    const j = worley(u + warp * 0.03, v, 9, 41), joint = clamp01(1 - (j[1] - j[0]) * 14);
    const pit = fbm(u, v, 48, 3, 71), fine = vnoise(u, v, 256, 83);
    const crack = Math.max(bedEdge * 0.7, joint);
    const h = clamp01(0.62 + (pit - 0.5) * 0.5 + hash(Math.floor(bed), Math.floor(j[2] * 99), 9) * 0.18 - crack * 0.55);
    const c = mix3(a0, a1, clamp01(0.5 + (pit - 0.5) * 1.1 + (j[2] - 0.5) * 0.35)), sh = (0.84 + 0.2 * h + (fine - 0.5) * 0.07) * (1 - crack * 0.3);
    out[i * 4] = Math.round(clamp01(c[0] * sh) * 255); out[i * 4 + 1] = Math.round(clamp01(c[1] * sh) * 255); out[i * 4 + 2] = Math.round(clamp01(c[2] * sh) * 255); out[i * 4 + 3] = 255;
    H[i] = h;
  }
  return { rgba: out, hgt: H, ns: 2.2 };
}
// the height's slope as a normal map (OpenGL: green up), wrapped at the edges
function normals(H, N, ns) {
  const out = new Uint8Array(N * N * 4), s = ns * (N / 512);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const xl = (x + N - 1) % N, xr = (x + 1) % N, yu = (y + N - 1) % N, yd = (y + 1) % N;
    const dx = (H[y * N + xr] - H[y * N + xl]) * s, dy = (H[yd * N + x] - H[yu * N + x]) * s, l = 1 / Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    out[i] = Math.round((-dx * l * 0.5 + 0.5) * 255); out[i + 1] = Math.round((-dy * l * 0.5 + 0.5) * 255); out[i + 2] = Math.round((l * 0.5 + 0.5) * 255); out[i + 3] = 255;
  }
  return out;
}
const MAKE = { meadow, gravel, crag };
export const CODE_LAYERS = Object.keys(MAKE);
function dataTex(px, N, srgb, aniso) {
  const t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = aniso; t.flipY = false; t.needsUpdate = true;
  return t;
}
// { d, n } for layer id at N x N (n null without nrm), or null for a name that is no code layer
export function makeCodeLayer(id, N = 1024, nrm = true, aniso = 2) {
  const mk = MAKE[id]; if (!mk) return null;
  const g = mk(N);
  return { d: dataTex(g.rgba, N, true, aniso), n: nrm ? dataTex(normals(g.hgt, N, g.ns), N, false, aniso) : null, code: true, size: N };
}
