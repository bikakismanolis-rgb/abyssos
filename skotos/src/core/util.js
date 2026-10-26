// Small math helpers, a seeded RNG and value noise. No dependencies.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - (1 - t) * (1 - t);
export const easeIn = (t) => t * t;
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
export const angleDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
export const dampAngle = (a, b, k, dt) => a + angleDiff(a, b) * (1 - Math.exp(-k * dt));
export const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
export const dist2 = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az; return dx * dx + dz * dz; };
// facing angle convention: rot = atan2(dx, dz), so rot 0 faces +z
export const angleTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);

export function RNG(seed = 1) {
  let s = seed >>> 0 || 1;
  const next = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    weighted(list) { // [[item, weight], ...]
      let total = 0; for (const e of list) total += e[1];
      let r = next() * total;
      for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
      return list[list.length - 1][0];
    },
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  };
}

export const rand = RNG((Date.now() ^ 0x9e3779b9) >>> 0);

// 2D value noise, deterministic, cheap; good enough for terrain tint and texture work
function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export function fbm(x, y, seed = 0, oct = 4) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += noise2(x * f, y * f, seed + i * 17) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}

export function fmt(n) { return Math.round(n).toLocaleString('el-GR'); }
export function fmtK(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
  return String(n);
}
