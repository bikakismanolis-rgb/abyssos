// A tileable normal map of running water for the Skotos: long streaks running down (stretched noise), a few runnels
// with drops gathering on them, and a fine stipple of beads. Every term is periodic on the unit square, so the map tiles
// both ways. Returns a PNG (sharp) of size x size; strength scales the slopes.
import sharp from 'sharp';
const fract = (x) => x - Math.floor(x);
const hash = (i, j, s) => fract(Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453);
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
// value noise on a lattice of px x py cells over the unit square, wrapping
function vnoise(u, v, px, py, seed) {
  const x = u * px, y = v * py, i = Math.floor(x), j = Math.floor(y), fx = fade(x - i), fy = fade(y - j);
  const h = (a, b) => hash(((a % px) + px) % px, ((b % py) + py) % py, seed);
  const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function heightAt(u, v) {
  let h = 0;
  // streaks: noise stretched six times down the surface, four octaves
  for (let o = 0, a = 0.5; o < 4; o++, a *= 0.5) h += a * (vnoise(u, v, 12 << o, 2 << o, 1 + o) - 0.5);
  // the streaks wander a little across: a slow sideways drift
  const du = 0.03 * (vnoise(u, v, 4, 3, 9) - 0.5);
  // runnels: eight thin channels down the tile, each with drops slipping down it
  for (let k = 0; k < 8; k++) {
    const c = (k + 0.5) / 8 + 0.04 * (hash(k, 3, 5) - 0.5), w = 0.006 + 0.006 * hash(k, 1, 7);
    let d = Math.abs(fract(u + du - c + 0.5) - 0.5);
    const along = 0.6 + 0.4 * vnoise(u, v, 8, 3, 20 + k);
    h += 0.35 * along * Math.exp(-(d * d) / (w * w));
    // drops: two bulges on each runnel
    for (let m = 0; m < 2; m++) {
      const dv = Math.abs(fract(v - hash(k, m, 11) + 0.5) - 0.5), wd = w * 2.2;
      h += 0.45 * Math.exp(-(d * d) / (wd * wd) - (dv * dv) / (0.0009 + 0.0006 * hash(k, m, 13)));
    }
  }
  // beads: a fine stipple
  h += 0.05 * (vnoise(u, v, 96, 64, 31) - 0.5) + 0.03 * (vnoise(u, v, 160, 120, 37) - 0.5);
  return h;
}
export async function waterNormalMap(size = 512, strength = 1.6) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = heightAt(x / size, y / size);
  const px = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = (H[y * size + ((x + 1) % size)] - H[y * size + ((x - 1 + size) % size)]) * 0.5 * size / 64;
    const hy = (H[((y + 1) % size) * size + x] - H[((y - 1 + size) % size) * size + x]) * 0.5 * size / 64;
    // image rows run down the texture (v up in glTF is row 0 at the top): +y in the map is toward smaller rows
    let nx = -hx * strength, ny = hy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 3;
    px[i] = Math.round((nx * 0.5 + 0.5) * 255); px[i + 1] = Math.round((ny * 0.5 + 0.5) * 255); px[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
  }
  return sharp(px, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}
