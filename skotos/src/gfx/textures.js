// Procedural canvas textures. Everything tiles seamlessly; nothing is downloaded.
import * as THREE from 'three';
import { RNG, smooth, lerp } from '../core/util.js';

const cache = {};

// older WebViews lack roundRect; a plain rect is close enough for texture work
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}

function hashP(x, y, p, seed) {
  x = ((x % p) + p) % p; y = ((y % p) + p) % p;
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pnoise(x, y, p, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
  return lerp(lerp(hashP(xi, yi, p, seed), hashP(xi + 1, yi, p, seed), u), lerp(hashP(xi, yi + 1, p, seed), hashP(xi + 1, yi + 1, p, seed), u), v);
}
// periodic fbm: (u,v) in [0,1), base period cells
export function tfbm(u, v, period, seed, oct = 4) {
  let s = 0, a = 0.5, n = 0, p = period;
  for (let i = 0; i < oct; i++) { s += pnoise(u * p, v * p, p, seed + i * 13) * a; n += a; a *= 0.5; p *= 2; }
  return s / n;
}

function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
function finish(c, { srgb = true, repeat = true, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.generateMipmaps = mips;
  t.needsUpdate = true;
  return t;
}
// fill a canvas pixel by pixel from f(u,v) -> [r,g,b]
function pixels(c, f) {
  const g = c.getContext('2d'), n = c.width, img = g.createImageData(n, n), d = img.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const col = f(x / n, y / n, x, y), i = (y * n + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = col[3] ?? 255;
  }
  g.putImageData(img, 0, 0);
  return g;
}
// draw something so it wraps across tile edges
function wrapDraw(n, x, y, r, fn) {
  for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
    if (x + ox < -r || x + ox > n + r || y + oy < -r || y + oy > n + r) continue;
    fn(x + ox, y + oy);
  }
}
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function tex(name) {
  if (cache[name]) return cache[name];
  const t = MAKERS[name]();
  cache[name] = t;
  return t;
}
// Act V: rows of runes cut in a stone (the Name-stones, the door-stone), white strokes with a soft glow round them on
// transparent, rows of n names; each seed its own lines (cached). The stone's lamp lights them from inside the strokes
export function runeLines(seed = 1, rows = 4) {
  const key = 'runes' + seed + '|' + rows;
  if (cache[key]) return cache[key];
  const c = canvas(256), g = c.getContext('2d'), r = RNG(seed * 97 + 13);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 7;
  // (the strokes of the old futhark: a stave and its twigs, a few with a branch or a hook)
  const glyph = (x, y, h) => {
    const k = r.int(0, 7), w = h * 0.42;
    g.beginPath(); g.moveTo(x, y - h / 2); g.lineTo(x, y + h / 2);
    if (k === 0) { g.moveTo(x, y - h / 2); g.lineTo(x + w, y - h / 6); }
    else if (k === 1) { g.moveTo(x, y - h / 2); g.lineTo(x + w, y - h / 4); g.lineTo(x, y); }
    else if (k === 2) { g.moveTo(x - w, y - h / 4); g.lineTo(x + w, y + h / 4); }
    else if (k === 3) { g.moveTo(x, y - h / 2); g.lineTo(x + w, y - h / 4); g.moveTo(x, y - h / 6); g.lineTo(x + w, y + h / 12); }
    else if (k === 4) { g.moveTo(x, y); g.lineTo(x + w, y - h / 3); g.lineTo(x + w, y + h / 2); }
    else if (k === 5) { g.moveTo(x - w * 0.8, y - h / 2); g.lineTo(x + w * 0.8, y + h / 2); g.moveTo(x + w * 0.8, y - h / 2); g.lineTo(x - w * 0.8, y + h / 2); }
    else if (k === 6) { g.moveTo(x, y - h / 8); g.lineTo(x - w * 0.7, y - h / 2); g.moveTo(x, y - h / 8); g.lineTo(x + w * 0.7, y - h / 2); }
    else { g.moveTo(x, y - h / 2); g.lineTo(x + w, y); g.lineTo(x, y + h / 2); }
    g.stroke();
  };
  const rh = 256 / (rows + 0.6);
  for (let j = 0; j < rows; j++) {
    const y = rh * (j + 0.8), h = rh * 0.62;
    let x = 22 + r.range(0, 10);
    while (x < 230) { glyph(x, y + r.range(-2, 2), h * r.range(0.9, 1.05)); x += h * r.range(0.5, 0.62); if (r.chance(0.12)) x += h * 0.45; }
  }
  return (cache[key] = finish(c, { srgb: false, repeat: false }));
}

const MAKERS = {
  dot() {
    const c = canvas(64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    gr.addColorStop(0.6, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return finish(c, { srgb: false, repeat: false });
  },
  blob() {
    const c = canvas(64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return finish(c, { srgb: false, repeat: false });
  },
  grass() {
    const n = 256, c = canvas(n), r = RNG(11);
    const g = pixels(c, (u, v) => {
      const a = tfbm(u, v, 4, 1), b = tfbm(u, v, 16, 5, 3);
      const base = mix3([30, 40, 22], [52, 62, 30], a);
      const col = mix3(base, [58, 48, 32], smooth(Math.max(0, b - 0.45) * 2.2));
      const k = 0.85 + tfbm(u, v, 64, 9, 2) * 0.3;
      return [col[0] * k, col[1] * k, col[2] * k];
    });
    g.lineCap = 'round';
    for (let i = 0; i < 1400; i++) {
      const x = r.range(0, n), y = r.range(0, n), l = r.range(3, 9), a = r.range(-0.5, 0.5);
      const shade = r.next();
      g.strokeStyle = shade < 0.5 ? `rgba(${70 + shade * 60},${90 + shade * 50},${40},0.55)` : `rgba(20,28,14,0.5)`;
      g.lineWidth = r.range(0.8, 1.6);
      wrapDraw(n, x, y, 10, (px, py) => { g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(a) * l, py - Math.cos(a) * l); g.stroke(); });
    }
    // fallen leaves
    for (let i = 0; i < 90; i++) {
      const x = r.range(0, n), y = r.range(0, n), s = r.range(1.5, 3.2);
      g.fillStyle = r.pick(['#5a3e1e', '#6b4a22', '#3e2c18', '#7a5a2a']);
      wrapDraw(n, x, y, 4, (px, py) => { g.beginPath(); g.ellipse(px, py, s, s * 0.55, r.range(0, 3), 0, 6.3); g.fill(); });
    }
    return finish(c);
  },
  dirt() {
    const n = 256, c = canvas(n), r = RNG(21);
    const g = pixels(c, (u, v) => {
      const a = tfbm(u, v, 6, 2), b = tfbm(u, v, 32, 7, 2);
      const col = mix3([58, 44, 30], [92, 72, 50], a);
      const k = 0.82 + b * 0.36;
      return [col[0] * k, col[1] * k, col[2] * k];
    });
    for (let i = 0; i < 260; i++) {
      const x = r.range(0, n), y = r.range(0, n), s = r.range(0.8, 2.8), l = r.range(70, 130);
      wrapDraw(n, x, y, 4, (px, py) => {
        g.fillStyle = `rgba(${l},${l * 0.85},${l * 0.7},0.8)`; g.beginPath(); g.ellipse(px, py, s, s * 0.7, 0, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(px + 0.6, py + 0.8, s, s * 0.6, 0, 0, 6.3); g.fill();
      });
    }
    return finish(c);
  },
  flagstone() {
    const n = 256, c = canvas(n), r = RNG(31), g = c.getContext('2d');
    g.fillStyle = '#16181c'; g.fillRect(0, 0, n, n);
    const rows = 4, rh = n / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -rh * 0.5 : 0;
      while (x < n) {
        const w = rh * r.range(0.8, 1.4), sh = r.range(0.75, 1.15);
        const y0 = row * rh;
        const base = [78 * sh, 80 * sh, 86 * sh];
        wrapDraw(n, x + w / 2, y0 + rh / 2, w, (cx, cy) => {
          const gx = cx - w / 2 + 2, gy = cy - rh / 2 + 2, ww = w - 4, hh = rh - 4;
          const gr = g.createLinearGradient(gx, gy, gx + ww, gy + hh);
          gr.addColorStop(0, `rgb(${base[0] + 10},${base[1] + 10},${base[2] + 12})`); gr.addColorStop(1, `rgb(${base[0] - 12},${base[1] - 12},${base[2] - 10})`);
          g.fillStyle = gr;
          g.beginPath(); g.roundRect(gx, gy, ww, hh, 5); g.fill();
        });
        x += w;
      }
    }
    // grain, cracks and moss in the seams
    const img = g.getImageData(0, 0, n, n), d = img.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4, k = 0.8 + tfbm(x / n, y / n, 16, 3, 3) * 0.4;
      const moss = d[i] < 30 ? smooth(Math.max(0, tfbm(x / n, y / n, 8, 4, 2) - 0.5) * 3) : 0;
      d[i] = d[i] * k * (1 - moss) + 34 * moss; d[i + 1] = d[i + 1] * k * (1 - moss) + 48 * moss; d[i + 2] = d[i + 2] * k * (1 - moss) + 30 * moss;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(10,10,12,0.55)'; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      let x = r.range(0, n), y = r.range(0, n); g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += r.range(-9, 9); y += r.range(-9, 9); g.lineTo(x, y); }
      g.stroke();
    }
    return finish(c);
  },
  cobble() {
    const n = 256, c = canvas(n), r = RNG(41), g = c.getContext('2d');
    g.fillStyle = '#1d1a17'; g.fillRect(0, 0, n, n);
    const pts = [];
    for (let i = 0; i < 150; i++) pts.push([r.range(0, n), r.range(0, n), r.range(9, 15)]);
    for (const [x, y, s] of pts) {
      const l = r.range(70, 110), tint = r.range(-8, 8);
      wrapDraw(n, x, y, s, (px, py) => {
        const gr = g.createRadialGradient(px - s * 0.3, py - s * 0.3, 1, px, py, s);
        gr.addColorStop(0, `rgb(${l + 22 + tint},${l + 18},${l + 12 - tint})`); gr.addColorStop(1, `rgb(${l - 30},${l - 32},${l - 34})`);
        g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, s * 0.92, s * 0.78, r.range(0, 3), 0, 6.3); g.fill();
      });
    }
    return finish(c);
  },
  brick() {
    const n = 256, c = canvas(n), r = RNG(51), g = c.getContext('2d');
    g.fillStyle = '#121214'; g.fillRect(0, 0, n, n);
    const rows = 8, rh = n / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -rh : 0;
      while (x < n) {
        const w = rh * r.range(1.4, 2.4), l = r.range(58, 92);
        wrapDraw(n, x + w / 2, row * rh + rh / 2, w, (cx, cy) => {
          g.fillStyle = `rgb(${l},${l * 0.98},${l * 1.05})`;
          g.beginPath(); g.roundRect(cx - w / 2 + 1.5, cy - rh / 2 + 1.5, w - 3, rh - 3, 3); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(cx - w / 2 + 1.5, cy + rh / 2 - 6, w - 3, 4.5);
        });
        x += w;
      }
    }
    const img = g.getImageData(0, 0, n, n), d = img.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4, k = 0.75 + tfbm(x / n, y / n, 8, 8, 4) * 0.5;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
    g.putImageData(img, 0, 0);
    return finish(c);
  },
  bark() {
    const n = 128, c = canvas(n);
    pixels(c, (u, v) => {
      const s = tfbm(u * 1, v * 0.25, 8, 61, 3), k = 0.6 + s * 0.7 + Math.sin(u * 6.28 * 9 + s * 6) * 0.08;
      return [62 * k, 48 * k, 36 * k];
    });
    return finish(c);
  },
  wood() {
    const n = 128, c = canvas(n);
    pixels(c, (u, v) => {
      const plank = Math.floor(v * 4), seam = (v * 4) % 1 < 0.05 ? 0.45 : 1;
      const s = tfbm(u * 0.5, v * 4 + plank * 0.37, 8, 71 + plank, 3), k = (0.7 + s * 0.5) * seam;
      return [96 * k, 70 * k, 46 * k];
    });
    return finish(c);
  },
  roof() {
    const n = 128, c = canvas(n), r = RNG(81), g = c.getContext('2d');
    g.fillStyle = '#141416'; g.fillRect(0, 0, n, n);
    const rows = 8, rh = n / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -8 : 0;
      while (x < n) {
        const w = r.range(12, 18), l = r.range(42, 66);
        wrapDraw(n, x + w / 2, row * rh + rh / 2, w, (cx, cy) => {
          const gr = g.createLinearGradient(0, cy - rh / 2, 0, cy + rh / 2);
          gr.addColorStop(0, `rgb(${l * 0.8},${l * 0.82},${l * 0.95})`); gr.addColorStop(1, `rgb(${l * 1.2},${l * 1.15},${l * 1.25})`);
          g.fillStyle = gr; g.fillRect(cx - w / 2 + 1, cy - rh / 2, w - 2, rh - 1.5);
        });
        x += w;
      }
    }
    return finish(c);
  },
  plaster() {
    const n = 128, c = canvas(n);
    pixels(c, (u, v) => { const k = 0.8 + tfbm(u, v, 6, 91, 4) * 0.35; return [150 * k, 138 * k, 116 * k]; });
    return finish(c);
  },
  web() {
    const n = 256, c = canvas(n), g = c.getContext('2d'), r = RNG(101);
    g.strokeStyle = 'rgba(230,235,240,0.7)'; g.lineWidth = 1.2;
    const cx = n / 2, cy = n / 2, spokes = 14;
    const ang = []; for (let i = 0; i < spokes; i++) ang.push((i / spokes) * 6.283 + r.range(-0.1, 0.1));
    for (const a of ang) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * n * 0.5, cy + Math.sin(a) * n * 0.5); g.stroke(); }
    g.lineWidth = 0.9;
    for (let k = 1; k < 13; k++) {
      const rad = k * 9.5 + r.range(-2, 2);
      g.beginPath();
      ang.forEach((a, i) => { const rr = rad * r.range(0.92, 1.06); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.closePath(); g.stroke();
    }
    return finish(c, { srgb: false, repeat: false });
  },
  rune() {
    const n = 256, c = canvas(n), g = c.getContext('2d'), r = RNG(111);
    g.translate(n / 2, n / 2);
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 118, 0, 6.3); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 100, 0, 6.3); g.stroke();
    g.beginPath(); g.arc(0, 0, 54, 0, 6.3); g.stroke();
    // angular glyphs between the rings
    for (let i = 0; i < 18; i++) {
      g.save(); g.rotate((i / 18) * 6.283); g.translate(0, -109);
      g.beginPath();
      const k = r.int(0, 3);
      if (k === 0) { g.moveTo(-4, -6); g.lineTo(0, 6); g.lineTo(4, -6); }
      else if (k === 1) { g.moveTo(-4, 6); g.lineTo(-4, -6); g.lineTo(4, 0); g.lineTo(-4, 0); }
      else if (k === 2) { g.moveTo(0, -7); g.lineTo(0, 7); g.moveTo(-4, -3); g.lineTo(4, 3); }
      else { g.moveTo(-4, -6); g.lineTo(4, -6); g.lineTo(-4, 6); g.lineTo(4, 6); }
      g.stroke(); g.restore();
    }
    for (let i = 0; i < 6; i++) { g.save(); g.rotate((i / 6) * 6.283); g.beginPath(); g.moveTo(0, -54); g.lineTo(0, -100); g.stroke(); g.restore(); }
    // six-pointed star
    g.beginPath();
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * 6.283 * 2 - 1.57; const x = Math.cos(a) * 54, y = Math.sin(a) * 54; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    return finish(c, { srgb: false, repeat: false });
  },
  cloth() {
    const n = 64, c = canvas(n);
    pixels(c, (u, v, x, y) => { const k = 0.85 + ((x + y) % 2) * 0.08 + tfbm(u, v, 4, 121, 2) * 0.2; return [200 * k, 200 * k, 200 * k]; });
    return finish(c, { srgb: false });
  }
};
