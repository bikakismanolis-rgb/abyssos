// Particles, weapon trails, ground telegraphs, decals, rings and lightning.
import * as THREE from 'three';
import { R, addLight, shake, LIGHTS } from './gfx.js';
import { tex } from './textures.js';
import { rand, clamp, lerp, TAU } from '../core/util.js';
import { BED_DRY } from '../world/genlib.js';
import { inBay } from '../world/gen5.js';

// ---------- particles ----------
const VS = `
attribute float aSize; attribute vec4 aColor;
varying vec4 vColor; uniform float uScale;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
uniform sampler2D uTex; varying vec4 vColor;
void main() {
  vec4 t = texture2D(uTex, gl_PointCoord);
  gl_FragColor = vec4(vColor.rgb, vColor.a * t.a);
  if (gl_FragColor.a < 0.004) discard;
}`;

// falling leaves: the sprite turns and flips as it falls (its angle follows its own position, so no extra attributes)
const VS_LEAF = `
attribute float aSize; attribute vec4 aColor;
varying vec4 vColor; varying vec2 vRot; varying float vFlip; uniform float uScale;
void main() {
  vColor = aColor;
  float a = position.y * 1.7 + position.x * 0.9 + position.z * 1.3;
  vRot = vec2(cos(a), sin(a)); vFlip = 0.25 + 0.75 * abs(sin(position.y * 2.3 + position.z));
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FS_LEAF = `
uniform sampler2D uTex; varying vec4 vColor; varying vec2 vRot; varying float vFlip;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  q = vec2(q.x * vRot.x - q.y * vRot.y, q.x * vRot.y + q.y * vRot.x);
  q.x /= vFlip;
  if (abs(q.x) > 0.5 || abs(q.y) > 0.5) discard;
  vec4 t = texture2D(uTex, q + 0.5);
  gl_FragColor = vec4(vColor.rgb * (0.75 + 0.25 * vFlip) * t.rgb, vColor.a * t.a);
  if (gl_FragColor.a < 0.05) discard;
}`;
let leafTex = null;
function leafTexture() {
  if (leafTex) return leafTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.translate(32, 32); g.rotate(0.5);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -27); g.bezierCurveTo(17, -14, 16, 12, 0, 27); g.bezierCurveTo(-16, 12, -17, -14, 0, -27); g.fill();
  g.strokeStyle = 'rgba(120,90,60,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 30); g.stroke();
  g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * 8); g.lineTo(10, i * 8 - 7); g.moveTo(0, i * 8); g.lineTo(-10, i * 8 - 7); g.stroke(); }
  leafTex = new THREE.CanvasTexture(c);
  return leafTex;
}

class Pool {
  constructor(cap, additive, leaf) {
    this.cap = cap; this.n = 0;
    const f = (k) => new Float32Array(cap * k);
    this.p = f(3); this.v = f(3); this.life = f(1); this.max = f(1); this.s0 = f(1); this.s1 = f(1);
    this.c = f(3); this.c1 = f(3); this.a0 = f(1); this.a1 = f(1); this.g = f(1); this.drag = f(1);
    this.geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.BufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.aPos); this.geo.setAttribute('aSize', this.aSize); this.geo.setAttribute('aColor', this.aColor);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: leaf ? leafTexture() : tex('dot') }, uScale: { value: 300 } },
      vertexShader: leaf ? VS_LEAF : VS, fragmentShader: leaf ? FS_LEAF : FS, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 9;
  }
  spawn(o) {
    if (this.n >= this.cap) return;
    const i = this.n++, i3 = i * 3;
    this.p[i3] = o.x; this.p[i3 + 1] = o.y; this.p[i3 + 2] = o.z;
    this.v[i3] = o.vx || 0; this.v[i3 + 1] = o.vy || 0; this.v[i3 + 2] = o.vz || 0;
    this.life[i] = 0; this.max[i] = o.life || 1;
    this.s0[i] = o.size ?? 0.3; this.s1[i] = o.size1 ?? this.s0[i];
    const c = o.color, c1 = o.color1 ?? c;
    this.c[i3] = ((c >> 16) & 255) / 255; this.c[i3 + 1] = ((c >> 8) & 255) / 255; this.c[i3 + 2] = (c & 255) / 255;
    this.c1[i3] = ((c1 >> 16) & 255) / 255; this.c1[i3 + 1] = ((c1 >> 8) & 255) / 255; this.c1[i3 + 2] = (c1 & 255) / 255;
    this.a0[i] = o.alpha ?? 1; this.a1[i] = o.alpha1 ?? 0;
    this.g[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) { n--; this.copy(n, i); i--; continue; }
      const i3 = i * 3, d = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i3] *= d; this.v[i3 + 1] = this.v[i3 + 1] * d - this.g[i] * dt; this.v[i3 + 2] *= d;
      this.p[i3] += this.v[i3] * dt; this.p[i3 + 1] += this.v[i3 + 1] * dt; this.p[i3 + 2] += this.v[i3 + 2] * dt;
      if (this.p[i3 + 1] < 0.02 && this.g[i] > 0) { this.p[i3 + 1] = 0.02; this.v[i3 + 1] *= -0.3; this.v[i3] *= 0.6; this.v[i3 + 2] *= 0.6; }
    }
    this.n = n;
    const P = this.aPos.array, S = this.aSize.array, C = this.aColor.array;
    for (let i = 0; i < n; i++) {
      const t = this.life[i] / this.max[i], i3 = i * 3, i4 = i * 4;
      P[i3] = this.p[i3]; P[i3 + 1] = this.p[i3 + 1]; P[i3 + 2] = this.p[i3 + 2];
      S[i] = lerp(this.s0[i], this.s1[i], t);
      C[i4] = lerp(this.c[i3], this.c1[i3], t); C[i4 + 1] = lerp(this.c[i3 + 1], this.c1[i3 + 1], t); C[i4 + 2] = lerp(this.c[i3 + 2], this.c1[i3 + 2], t);
      const fadeIn = Math.min(1, t * 8);
      C[i4 + 3] = lerp(this.a0[i], this.a1[i], t) * fadeIn;
    }
    this.geo.setDrawRange(0, n);
    this.aPos.needsUpdate = this.aSize.needsUpdate = this.aColor.needsUpdate = true;
  }
  copy(from, to) {
    const f3 = from * 3, t3 = to * 3;
    for (let k = 0; k < 3; k++) { this.p[t3 + k] = this.p[f3 + k]; this.v[t3 + k] = this.v[f3 + k]; this.c[t3 + k] = this.c[f3 + k]; this.c1[t3 + k] = this.c1[f3 + k]; }
    this.life[to] = this.life[from]; this.max[to] = this.max[from]; this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from];
    this.a0[to] = this.a0[from]; this.a1[to] = this.a1[from]; this.g[to] = this.g[from]; this.drag[to] = this.drag[from];
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}

export const FX = { add: null, alpha: null, leaf: null, group: null, trails: [], teles: [], rings: [], decals: [], bolts: [], emitters: [], ambient: null, time: 0, q: 1, autumn: 0 };
// FX.beat (0-1): the Heartwood's heartbeat in the lights; 0 leaves them a steady ember glow (shared with gfx.js LIGHTS)
Object.defineProperty(FX, 'beat', { get: () => LIGHTS.beat, set: (v) => { LIGHTS.beat = v; }, enumerable: true });

export function initFX(quality) {
  FX.q = quality;
  FX.group = new THREE.Group();
  FX.add = new Pool([1200, 2400, 3500][quality], true);
  FX.alpha = new Pool([500, 1000, 1600][quality], false);
  FX.leaf = new Pool([160, 320, 500][quality], false, true);
  FX.group.add(FX.add.points, FX.alpha.points, FX.leaf.points);
  R.scene.add(FX.group);
  const setScale = () => { const s = R.h * R.renderer.getPixelRatio() * 0.5 / Math.tan((R.camera.fov * Math.PI) / 360); FX.add.mat.uniforms.uScale.value = s; FX.alpha.mat.uniforms.uScale.value = s; FX.leaf.mat.uniforms.uScale.value = s; };
  setScale(); window.addEventListener('resize', () => setTimeout(setScale, 50));
  FX.setScale = setScale;
}
export const P = (o) => (o.leaf ? FX.leaf : o.add === false ? FX.alpha : FX.add).spawn(o);
const rr = (a, b) => a + Math.random() * (b - a);

// ---------- one-shot effects ----------
export function sparks(x, y, z, n = 10, color = 0xffc070, speed = 6, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, e = rr(-0.2, 1.2), s = speed * rr(0.3, 1);
    P({ x, y, z, vx: Math.cos(a) * Math.cos(e) * s + (opts.dx || 0) * s * 0.6, vy: Math.sin(e) * s, vz: Math.sin(a) * Math.cos(e) * s + (opts.dz || 0) * s * 0.6, life: rr(0.2, 0.5), size: rr(0.08, 0.16), size1: 0.02, color, color1: opts.color1 ?? 0xff5010, grav: 14, drag: 2 });
  }
}
export function blood(x, y, z, n = 10, dx = 0, dz = 0, color = 0x8a0a0a) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rr(1, 4);
    P({ add: false, x, y, z, vx: Math.cos(a) * s * 0.6 + dx * s, vy: rr(1, 4), vz: Math.sin(a) * s * 0.6 + dz * s, life: rr(0.35, 0.7), size: rr(0.1, 0.22), size1: 0.06, color, color1: 0x3a0404, alpha: 0.95, alpha1: 0.6, grav: 16, drag: 1 });
  }
}
export function puff(x, y, z, n = 8, color = 0x6a6a6a, size = 0.9, spread = 0.8, life = 1.2) {
  for (let i = 0; i < n; i++) P({ add: false, x: x + rr(-spread, spread) * 0.5, y: y + rr(0, 0.4), z: z + rr(-spread, spread) * 0.5, vx: rr(-spread, spread), vy: rr(0.3, 1.2), vz: rr(-spread, spread), life: rr(life * 0.6, life), size: size * rr(0.6, 1), size1: size * 2.2, color, alpha: 0.45, alpha1: 0, drag: 1.5 });
}
export function glowBurst(x, y, z, color, n = 20, speed = 4, size = 0.35, life = 0.6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, e = rr(-1, 1), s = speed * rr(0.4, 1);
    P({ x, y, z, vx: Math.cos(a) * s, vy: e * s * 0.6 + 0.5, vz: Math.sin(a) * s, life: rr(life * 0.5, life), size, size1: 0.02, color, drag: 3 });
  }
}
export function flash(x, y, z, color = 0xffffff, size = 3, life = 0.15) { P({ x, y, z, life, size, size1: size * 1.5, color, alpha: 0.9 }); }
export function hitFx(x, y, z, kind, dx, dz, crit) {
  const k = crit ? 1.6 : 1;
  if (kind === 'flesh') { blood(x, y, z, Math.round(9 * k), dx, dz); sparks(x, y, z, 4, 0xffe0b0, 4, { dx, dz }); }
  else if (kind === 'bone') { sparks(x, y, z, Math.round(8 * k), 0xf0e8d0, 5, { dx, dz, color1: 0x8a8070 }); puff(x, y, z, 2, 0xd8d0c0, 0.4, 0.4, 0.5); }
  else if (kind === 'spirit') { glowBurst(x, y, z, 0x7ae0ff, Math.round(12 * k), 3.5, 0.25, 0.5); }
  else if (kind === 'chitin') { blood(x, y, z, Math.round(8 * k), dx, dz, 0x3a5a10); sparks(x, y, z, 3, 0xb0ff60, 3, { dx, dz }); }
  else if (kind === 'ash') { sparks(x, y, z, Math.round(10 * k), 0xffa040, 5, { dx, dz }); blood(x, y, z, 4, dx, dz, 0x2a2420); }
  else if (kind === 'stone') { sparks(x, y, z, Math.round(8 * k), 0xfff0d0, 6, { dx, dz, color1: 0x8a8070 }); puff(x, y, z, 3, 0x8a8680, 0.6, 0.7, 0.7); blood(x, y, z, 5, dx, dz, 0x5a5650); }
  else if (kind === 'bark') { // the Evergreen and their roots: splinters and a spray of amber sap
    for (let i = 0; i < Math.round(7 * k); i++) { const a = Math.random() * TAU, sp = rr(1.5, 4.5); P({ add: false, x, y, z, vx: Math.cos(a) * sp * 0.6 + dx * sp, vy: rr(1.5, 4), vz: Math.sin(a) * sp * 0.6 + dz * sp, life: rr(0.4, 0.8), size: rr(0.07, 0.13), size1: 0.06, color: 0x6a4a2c, color1: 0x3a2818, alpha: 1, alpha1: 0.7, grav: 16, drag: 1 }); }
    sparks(x, y, z, Math.round(5 * k), 0xffc860, 4, { dx, dz, color1: 0xb05a10 });
  }
  else if (kind === 'magma') { sparks(x, y, z, Math.round(12 * k), 0xffc050, 6, { dx, dz, color1: 0xff3000 }); blood(x, y, z, 4, dx, dz, 0x1a1210); P({ x, y, z, life: 0.25, size: 1.2 * k, size1: 0.2, color: 0xffa040, color1: 0xff3000 }); }
  else sparks(x, y, z, Math.round(8 * k), 0xffd080, 5, { dx, dz });
  if (crit) flash(x, y, z, 0xfff0d0, 2.2, 0.12);
}
export function explosion(x, z, r = 3, color = 0xff7a20, opts = {}) {
  flash(x, 1, z, 0xfff0c0, r * 2.4, 0.2);
  glowBurst(x, 0.8, z, color, Math.round(30 + r * 10), r * 3, 0.5, 0.7);
  for (let i = 0; i < 14 + r * 4; i++) { const a = Math.random() * TAU, s = rr(1, r * 2.2); P({ x, y: 0.4, z, vx: Math.cos(a) * s, vy: rr(1, 4), vz: Math.sin(a) * s, life: rr(0.5, 1.0), size: rr(0.5, 1.0), size1: 1.8, color: opts.smoke ?? 0x3a3430, alpha: 0.6, add: false, drag: 2 }); }
  ring(x, z, r, color, 0.4);
  addLight({ x, y: 1.5, z, color, intensity: 40, range: r * 4, life: 0.4, fade: 0.4 });
  decal(x, z, 'scorch', r * 0.9);
  shake(opts.shake ?? 0.35);
}

// amber bursting from a broken root or a dying tree-thing; leaves a sap stain
export function sapBurst(x, z, s = 1) {
  glowBurst(x, 0.9 * s, z, 0xffb040, Math.round(18 * s), 3 * s, 0.22, 0.7);
  for (let i = 0; i < 10 * s; i++) { const a = Math.random() * TAU, sp = rr(1, 3.5) * s; P({ add: false, x, y: 0.8 * s, z, vx: Math.cos(a) * sp, vy: rr(2, 5), vz: Math.sin(a) * sp, life: rr(0.5, 0.9), size: rr(0.08, 0.16), size1: 0.08, color: 0xffa830, color1: 0xa05a10, alpha: 0.95, alpha1: 0.8, grav: 16, drag: 0.8 }); }
  decal(x, z, 'amber', 1.4 * s);
}

// Act IV: fire drawn out of a flame into the Ember Cradle (call it every tenth of a second or so while the Cradle drinks).
// from/to: { x, y, z } (y defaults to 0.6 and 0.9); n sparks arc over and land in the Cradle
export function fireStream(from, to, n = 4) {
  const y0 = from.y ?? 0.6, y1 = to.y ?? 0.9, g = 6;
  for (let i = 0; i < n; i++) {
    const t = rr(0.35, 0.55), x0 = from.x + rr(-0.25, 0.25), z0 = from.z + rr(-0.25, 0.25), yy = y0 + rr(0, 0.3);
    P({ x: x0, y: yy, z: z0, vx: (to.x - x0) / t, vy: (y1 - yy + (g * t * t) / 2) / t, vz: (to.z - z0) / t, grav: g, life: t, size: rr(0.1, 0.16), size1: 0.05, color: 0xffd880, color1: 0xff5a10, alpha: 0.95, alpha1: 0.4 });
  }
  if (Math.random() < 0.3) P({ x: from.x, y: y0 + 0.2, z: from.z, vy: 0.6, life: 0.4, size: 0.6, size1: 0.2, color: 0xffa040, color1: 0xff4010, alpha: 0.5, alpha1: 0 });
}

// ---------- ground rings (shockwaves) ----------
const ringGeo = new THREE.RingGeometry(0.85, 1, 48);
ringGeo.rotateX(-Math.PI / 2);
export function ring(x, z, r, color = 0xffffff, life = 0.5, y = 0.12) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, y, z); m.scale.setScalar(0.2);
  FX.group.add(m);
  FX.rings.push({ m, r, life, t: 0 });
}

// ---------- decals ----------
let decalTex = null;
function decalTexture() {
  if (decalTex) return decalTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(64 + rr(-20, 20), 64 + rr(-20, 20), rr(14, 36), rr(10, 30), rr(0, 3), 0, 6.3); g.fill(); }
  decalTex = new THREE.CanvasTexture(c);
  return decalTex;
}
const decalGeo = new THREE.PlaneGeometry(1, 1); decalGeo.rotateX(-Math.PI / 2);
export function decal(x, z, kind, s = 1, life = 14) {
  // (Act V: a stain on the tide's flats lies on the bed, under the water; none on open water)
  const bed = decalBed(x, z); if (bed === -9) return;
  if (FX.decals.length > 40) { const d = FX.decals.shift(); FX.group.remove(d.m); d.m.material.dispose(); }
  const color = kind === 'blood' ? 0x4a0505 : kind === 'scorch' ? 0x0a0806 : kind === 'goo' ? 0x2a4a08 : kind === 'ecto' ? 0x2a6a8a : kind === 'amber' || kind === 'sap' ? 0xb07018 : 0x202020;
  const a = kind === 'ecto' ? 0.5 : 0.75;
  const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: decalTexture(), color, transparent: true, opacity: a, depthWrite: false, blending: kind === 'ecto' ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.position.set(x, 0.03 + FX.decals.length * 0.0005, z); m.rotation.y = Math.random() * TAU; m.scale.setScalar(s);
  m.renderOrder = 2;
  FX.group.add(m);
  const L = FX.L5, i = L ? Math.floor(z) * L.w + Math.floor(x) : -1;
  FX.decals.push({ m, life, t: 0, a, bed, bay: bed != null && inBay(L, Math.floor(x), Math.floor(z)), ice: i >= 0 && !!L.ice?.[i] ? i : -1 });
}
// the bed under a stain on Act V's tidal water (from the corners' beds, as the sea works out its depth), or null where no
// water ever covers it (dry land, ice, a window, the jetty, any other zone); -9 on open water (the sea, a hole)
function decalBed(x, z) {
  const L = FX.L5; if (!L) return null;
  const ix = Math.floor(x), iz = Math.floor(z); if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) return null;
  const i = iz * L.w + ix;
  if (L.ice?.[i] || L.thick?.[i] || L.window?.[i] || L.deck?.[i]) return null;
  if (L.sea?.[i]) return -9;
  if (!L.bed || !L.vbed || L.bed[i] >= BED_DRY) return null;
  const W = L.w + 1, v = L.vbed, u = x - ix, w = z - iz;
  return lerp(lerp(v[iz * W + ix], v[iz * W + ix + 1], u), lerp(v[(iz + 1) * W + ix], v[(iz + 1) * W + ix + 1], u), w);
}
// how much of a stain on the bed shows through dep m of water: what the sea's alpha leaves (sea.js), none once it is closed
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function underWater(dep) {
  if (dep <= 0.006) return 1;
  if (dep >= 0.43) return 0;
  return 1 - lerp(lerp(0.32, 0.62, sstep(0, 0.42, dep)), 0.95, sstep(0.37, 0.43, dep)) * sstep(0.006, 0.045, dep);
}

// ---------- telegraphs: what an attack will hit, filling up until it lands ----------
const TELE_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const TELE_FS = `
varying vec2 vUv; uniform float uP; uniform vec3 uColor; uniform float uShape; uniform float uArc; uniform float uA;
void main(){
  vec2 p = vUv * 2.0 - 1.0; float a = 0.0;
  if (uShape < 0.5) { // circle
    float d = length(p); if (d > 1.0) discard;
    a = smoothstep(0.9, 1.0, d) * 0.9 + (d < uP ? 0.32 : 0.1) + smoothstep(uP - 0.05, uP, d) * step(d, uP) * 0.5;
  } else if (uShape < 1.5) { // cone pointing +y in uv
    float d = length(p); if (d > 1.0) discard; float ang = abs(atan(p.x, p.y)); if (ang > uArc) discard;
    float edge = max(smoothstep(0.9, 1.0, d), smoothstep(uArc - 0.08, uArc, ang));
    a = edge * 0.9 + (d < uP ? 0.32 : 0.1);
  } else { // line, length along y
    float y = vUv.y; float ex = abs(p.x);
    a = smoothstep(0.8, 1.0, ex) * 0.9 + (y < uP ? 0.32 : 0.1);
  }
  gl_FragColor = vec4(uColor, a * uA);
}`;
const teleGeo = new THREE.PlaneGeometry(2, 2); teleGeo.rotateX(-Math.PI / 2);
function teleMat(color, shape, arc = 0.5) {
  return new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uColor: { value: new THREE.Color(color) }, uShape: { value: shape }, uArc: { value: arc }, uA: { value: 1 } }, vertexShader: TELE_VS, fragmentShader: TELE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}
// circle at x,z radius r, fills over dur seconds
export function teleCircle(x, z, r, dur, color = 0xff3020) {
  const m = new THREE.Mesh(teleGeo, teleMat(color, 0)); m.position.set(x, 0.06, z); m.scale.set(r, 1, r);
  return addTele(m, dur);
}
export function teleCone(x, z, rot, range, arc, dur, color = 0xff3020) {
  const m = new THREE.Mesh(teleGeo, teleMat(color, 1, arc)); m.position.set(x, 0.06, z); m.scale.set(range, 1, range); m.rotation.y = rot + Math.PI;
  return addTele(m, dur);
}
export function teleLine(x, z, rot, len, width, dur, color = 0xff3020) {
  const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); g.translate(0, 0, -1);
  const m = new THREE.Mesh(g, teleMat(color, 2)); m.position.set(x, 0.06, z); m.scale.set(width / 2, 1, len / 2); m.rotation.y = rot + Math.PI;
  m.userData.ownGeo = true;
  return addTele(m, dur);
}
function addTele(m, dur) {
  m.renderOrder = 3;
  FX.group.add(m);
  const t = { m, dur, t: 0, alive: true };
  FX.teles.push(t);
  return t;
}
export function killTele(t) { if (t) t.alive = false; }

// ---------- weapon trails ----------
const TRAIL_VS = `attribute float aA; varying float vA; varying vec2 vUv; void main(){ vA = aA; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const TRAIL_FS = `uniform vec3 uColor; varying float vA; varying vec2 vUv; void main(){ float e = smoothstep(0.0, 0.35, vUv.y); gl_FragColor = vec4(uColor * (0.6 + vUv.y), vA * e); }`;
export class Trail {
  constructor(color = 0xffe0a0, n = 14) {
    this.n = n; this.pts = []; this.active = false;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.al = new Float32Array(n * 2); const uv = new Float32Array(n * 2 * 2), idx = [];
    for (let i = 0; i < n; i++) { uv[i * 4] = i / (n - 1); uv[i * 4 + 1] = 0; uv[i * 4 + 2] = i / (n - 1); uv[i * 4 + 3] = 1; if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aA', new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) } }, vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 11;
    FX.group.add(this.mesh);
  }
  setColor(c) { this.mat.uniforms.uColor.value.set(c); }
  push(base, tip, on) {
    if (on) this.pts.unshift({ b: base.clone(), t: tip.clone(), a: 1 });
    for (const p of this.pts) p.a -= on ? 0.07 : 0.2;
    while (this.pts.length > this.n || (this.pts.length && this.pts[this.pts.length - 1].a <= 0)) this.pts.pop();
    const m = this.pts.length;
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[Math.min(i, m - 1)];
      if (!p) { this.al[i * 2] = this.al[i * 2 + 1] = 0; continue; }
      const k = i * 6;
      this.pos[k] = p.b.x; this.pos[k + 1] = p.b.y; this.pos[k + 2] = p.b.z;
      this.pos[k + 3] = p.t.x; this.pos[k + 4] = p.t.y; this.pos[k + 5] = p.t.z;
      const a = i < m ? Math.max(0, p.a) * (1 - i / this.n) : 0;
      this.al[i * 2] = a * 0.5; this.al[i * 2 + 1] = a;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aA.needsUpdate = true;
  }
  dispose() { FX.group.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
}

// ---------- lightning ----------
export function bolt(x0, y0, z0, x1, y1, z1, color = 0x9ad8ff, width = 1) {
  const n = Math.max(6, Math.ceil(Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 3));
  let px = x0, py = y0, pz = z0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, j = i < n ? 0.35 * width : 0;
    const x = lerp(x0, x1, t) + rr(-j, j), y = lerp(y0, y1, t) + rr(-j, j), z = lerp(z0, z1, t) + rr(-j, j);
    for (let k = 0; k < 3; k++) { const u = k / 3; P({ x: lerp(px, x, u), y: lerp(py, y, u), z: lerp(pz, z, u), life: 0.16, size: 0.22 * width, size1: 0.05, color: 0xffffff, color1: color }); }
    px = x; py = y; pz = z;
  }
  addLight({ x: x1, y: 1.5, z: z1, color, intensity: 30, range: 10, life: 0.15, fade: 0.15 });
}

// ---------- persistent emitters (fires, smoke) and ambient life ----------
export function setEmitters(list) { FX.emitters = list || []; }
export function setAmbient(kind) { FX.ambient = kind; }
function emit(e, dt, cx, cz) {
  const dx = e.x - cx, dz = e.z - cz;
  if (dx * dx + dz * dz > 30 * 30) return;
  e.acc = (e.acc || 0) + dt;
  const s = e.s || 1;
  switch (e.type) {
    case 'fire': case 'torch': case 'bluefire': case 'beacon': case 'forge': {
      const blue = e.type === 'bluefire', big = e.type === 'beacon', rate = big ? 0.006 : e.type === 'torch' ? 0.05 : 0.025;
      while (e.acc > rate) {
        e.acc -= rate;
        const sz = (big ? 1.6 : e.type === 'torch' ? 0.35 : 0.6) * s;
        P({ x: e.x + rr(-0.25, 0.25) * sz, y: e.y, z: e.z + rr(-0.25, 0.25) * sz, vx: rr(-0.3, 0.3), vy: rr(1.2, 2.4) * (big ? 1.8 : 1), vz: rr(-0.3, 0.3), life: rr(0.35, 0.7) * (big ? 1.4 : 1), size: sz * rr(0.8, 1.3), size1: sz * 0.2, color: blue ? 0x9ad0ff : 0xffd080, color1: blue ? 0x1040ff : 0xff3a08, alpha: 0.9, alpha1: 0 });
        if (Math.random() < (big ? 0.35 : 0.08)) P({ x: e.x, y: e.y + 0.3, z: e.z, vx: rr(-0.8, 0.8), vy: rr(2, 4) * (big ? 1.5 : 1), vz: rr(-0.8, 0.8), life: rr(1, 2.4), size: 0.07, size1: 0.02, color: blue ? 0xa0d8ff : 0xffb040, color1: blue ? 0x2050ff : 0xff4000, drag: 0.5 });
        if (big && Math.random() < 0.15) P({ add: false, x: e.x + rr(-1, 1), y: e.y + 2, z: e.z + rr(-1, 1), vx: rr(-0.3, 0.3), vy: rr(1.5, 2.5), vz: rr(-0.3, 0.3), life: rr(2, 3.5), size: 2, size1: 5, color: 0x2a2420, alpha: 0.35, alpha1: 0, drag: 0.4 });
      }
      break;
    }
    case 'smoke': while (e.acc > 0.25) { e.acc -= 0.25; P({ add: false, x: e.x + rr(-0.1, 0.1), y: e.y, z: e.z, vx: rr(0.1, 0.4), vy: rr(0.6, 1.0), vz: rr(-0.2, 0.2), life: rr(3, 5), size: 0.6, size1: 2.6, color: 0x3a3a40, alpha: 0.3, alpha1: 0, drag: 0.2 }); } break;
    case 'embers': while (e.acc > 0.12) { e.acc -= 0.12; P({ x: e.x + rr(-0.4, 0.4), y: e.y, z: e.z + rr(-0.3, 0.3), vx: rr(-0.4, 0.4), vy: rr(1, 2.5), vz: rr(-0.4, 0.4), life: rr(0.6, 1.4), size: 0.06, size1: 0.02, color: 0xffb040, color1: 0xff3000, drag: 0.6 }); } break;
    case 'abyss': while (e.acc > 0.35) { e.acc -= 0.35; P({ add: false, x: e.x + rr(-3, 3), y: e.y, z: e.z + rr(-1.5, 1.5), vx: rr(-0.2, 0.2), vy: rr(0.5, 1.1), vz: rr(-0.2, 0.2), life: rr(3, 5), size: 2.5, size1: 6, color: 0x9aa8c0, alpha: 0.2, alpha1: 0, drag: 0.15 }); } break;
    case 'lava': {
      while (e.acc > 0.4) {
        e.acc -= 0.4;
        P({ x: e.x + rr(-1.4, 1.4), y: -0.2, z: e.z + rr(-1.4, 1.4), vx: rr(-0.3, 0.3), vy: rr(0.8, 2.2), vz: rr(-0.3, 0.3), life: rr(0.8, 1.8), size: 0.07, size1: 0.02, color: 0xffc050, color1: 0xff3000, drag: 0.4 });
        if (Math.random() < 0.18) { const bx = e.x + rr(-1.2, 1.2), bz = e.z + rr(-1.2, 1.2); P({ x: bx, y: -0.25, z: bz, life: 0.5, size: 0.6, size1: 1.1, color: 0xffa040, color1: 0xff3a00, alpha: 0.8, alpha1: 0 }); P({ add: false, x: bx, y: 0.2, z: bz, vy: 0.8, life: 2.2, size: 0.6, size1: 2.2, color: 0x2a2220, alpha: 0.25, alpha1: 0 }); }
      }
      break;
    }
    // Act III: mist lying in the Glade of Stones, motes round the seed-lanterns and Tears, the mere's slow glow, weeping trees
    case 'lowmist': while (e.acc > 0.3) { e.acc -= 0.3; P({ add: false, x: e.x + rr(-4, 4) * s, y: rr(0.7, 1.3), z: e.z + rr(-4, 4) * s, vx: rr(-0.15, 0.15), vy: 0.02, vz: rr(-0.15, 0.15), life: rr(5, 8), size: 2.2, size1: 3.4, color: 0xd8ccb0, alpha: 0.12, alpha1: 0, drag: 0.1 }); } break;
    case 'motes': {
      const r = e.autumn ? 1 - FX.autumn : 1; if (r <= 0) break;
      while (e.acc > 0.35 / r) { e.acc -= 0.35 / r; P({ x: e.x + rr(-0.6, 0.6) * s, y: e.y + rr(-0.5, 0.5), z: e.z + rr(-0.6, 0.6) * s, vx: rr(-0.1, 0.1), vy: rr(0.02, 0.15), vz: rr(-0.1, 0.1), life: rr(2, 4), size: 0.07, size1: 0.03, color: e.color || 0xe0f080, color1: 0x80a020, alpha: 0.9, alpha1: 0 }); }
      break;
    }
    case 'amberglow': {
      const r = 1 - FX.autumn * 0.6;
      while (e.acc > 0.5 / r) {
        e.acc -= 0.5 / r;
        P({ x: e.x + rr(-2, 2) * s, y: -0.1, z: e.z + rr(-2, 2) * s, vx: rr(-0.08, 0.08), vy: rr(0.2, 0.5), vz: rr(-0.08, 0.08), life: rr(2.5, 4.5), size: 0.06, size1: 0.02, color: 0xffd070, color1: 0xc06010, alpha: 0.85, alpha1: 0 });
        if (Math.random() < 0.08) P({ x: e.x + rr(-2, 2) * s, y: -0.15, z: e.z + rr(-2, 2) * s, life: 1.2, size: 0.5, size1: 1.0, color: 0xffb040, color1: 0x804010, alpha: 0.35, alpha1: 0 });
      }
      break;
    }
    case 'drip': {
      if (FX.autumn >= 1) break;
      if (e.acc > (e.next ||= rr(2.5, 6))) { e.acc = 0; e.next = rr(2.5, 6); const x = e.x + rr(-1.2, 1.2), z = e.z + rr(-1.2, 1.2), y = e.y || 3.5; P({ x, y, z, vy: -0.5, life: Math.sqrt((2 * y) / 9.8), size: 0.09, size1: 0.07, color: 0xffc050, color1: 0xff9a20, alpha: 0.95, alpha1: 0.9, grav: 9.8 }); }
      break;
    }
    // Act IV: an ember sink on the Field: a few embers, a thread of ash-smoke
    case 'embersink': {
      while (e.acc > 0.7) {
        e.acc -= 0.7;
        P({ x: e.x + rr(-1.2, 1.2), y: -0.2, z: e.z + rr(-1.2, 1.2), vx: rr(-0.2, 0.2), vy: rr(0.6, 1.6), vz: rr(-0.2, 0.2), life: rr(1, 2.2), size: 0.06, size1: 0.02, color: 0xffb050, color1: 0xff3000, drag: 0.4 });
        if (Math.random() < 0.3) P({ add: false, x: e.x + rr(-1, 1), y: 0.1, z: e.z + rr(-1, 1), vx: rr(0.05, 0.25), vy: rr(0.4, 0.8), vz: rr(-0.1, 0.1), life: rr(3, 5), size: 0.8, size1: 2.6, color: 0x2a2420, alpha: 0.22, alpha1: 0, drag: 0.2 });
      }
      break;
    }
    case 'mist': while (e.acc > 0.3) { e.acc -= 0.3; P({ add: false, x: e.x + rr(-1.2, 1.2), y: 0.3, z: e.z + rr(0, 1), vx: rr(-0.2, 0.2), vy: 0.05, vz: rr(0.2, 0.6), life: rr(3, 5), size: 1.5, size1: 3.5, color: 0x8aa0b8, alpha: 0.22, alpha1: 0, drag: 0.2 }); } break;
    // Act V: sea smoke rising off open water that is warmer than the air (e.cells: the water cells' centres near the
    // emitter, build5.js; e.s how much of its square is water). Not under the black aurora's frozen coast (diamond dust)
    case 'seasmoke': {
      if (FX.ambient === 'coastFrozen') { e.acc = 0; break; }
      // (thinner on the phones' quality and below: big soft sprites are fill)
      const iv = (0.28 / Math.max(0.25, s)) * (FX.q >= 2 ? 1 : FX.q === 1 ? 1.6 : 3);
      while (e.acc > iv) {
        e.acc -= iv;
        // (low wisps crawling off the water on the wind, now and then a taller curl)
        const k = Math.floor(Math.random() * (e.cells.length / 2)) * 2, x = e.cells[k] + rr(-0.5, 0.5), z = e.cells[k + 1] + rr(-0.5, 0.5), tall = Math.random() < 0.25;
        P({ add: false, x, y: rr(0.05, 0.25), z, vx: rr(-0.5, -0.15), vy: tall ? rr(0.3, 0.5) : rr(0.06, 0.16), vz: rr(0.05, 0.3), life: rr(4.5, 7.5), size: rr(0.9, 1.6), size1: tall ? rr(3, 4.5) : rr(2.6, 3.6), color: 0xb4c2ce, alpha: tall ? 0.2 : 0.28, alpha1: 0, drag: 0.08 });
      }
      break;
    }
    // a wreck dripping as the tide leaves it: while the water has lately stood higher than it stands now, round its bed
    // (e.bed; FX.tideLv/FX.wetLv from sea.js), drops fall from its timbers (e.y the hull's height, e.s its half length)
    case 'seaDrip': {
      const ebb = clamp(((FX.wetLv || 0) - (FX.tideLv || 0)) / 0.3, 0, 1) * (FX.wetLv > (e.bed ?? 0.6) - 0.15 ? 1 : 0);
      if (ebb <= 0) { e.acc = 0; break; }
      const iv = 0.09 / ebb;
      while (e.acc > iv) {
        e.acc -= iv;
        const y = rr(0.5, 1) * (e.y || 2), x = e.x + rr(-s, s) * 2.5, z = e.z + rr(-s, s) * 2.5;
        P({ add: false, x, y, z, vy: -0.4, life: Math.sqrt((2 * y) / 9.8), size: 0.06, size1: 0.05, color: 0xb8c8d4, alpha: 0.85, alpha1: 0.7, grav: 9.8 });
      }
      break;
    }
  }
}
function ambient(dt, cx, cz) {
  const k = FX.ambient; if (!k) return;
  FX.ambAcc = (FX.ambAcc || 0) + dt;
  const rate = k === 'forest' ? 0.06 : k === 'town' ? 0.05 : k === 'snow' ? 0.012 : k === 'halls' ? 0.07 : k === 'weep' ? 0.07 : k === 'weepAutumn' ? 0.045 : k === 'heart' || k === 'heartAutumn' ? 0.08
    : k === 'ashfall' ? 0.022 : k === 'ashfieldStars' ? 0.16 : k === 'ashfieldDawn' ? 0.07 : k === 'forge' ? 0.045 : k === 'forgeCold' ? 0.08
      : k === 'coast' ? 0.028 : k === 'coastFrozen' ? 0.03 : k === 'farlight' ? 0.034 : k === 'blizzard' ? 0.0045 : 0.09;
  while (FX.ambAcc > rate) {
    FX.ambAcc -= rate;
    const x = cx + rr(-16, 16), z = cz + rr(-14, 12);
    if (k === 'forest') {
      if (Math.random() < 0.55) P({ x, y: rr(0.3, 2.2), z, vx: rr(-0.4, 0.4), vy: rr(-0.1, 0.2), vz: rr(-0.4, 0.4), life: rr(2, 4), size: 0.12, size1: 0.12, color: 0xd8ff70, color1: 0x60a020, alpha: 1, alpha1: 0 });
      else P({ add: false, x, y: 0.25, z, vx: rr(-0.3, 0.3), vy: 0, vz: rr(-0.2, 0.2), life: rr(4, 7), size: 3, size1: 5, color: 0x8aa8a0, alpha: 0.12, alpha1: 0 });
    } else if (k === 'town') {
      if (Math.random() < 0.7) P({ add: false, x, y: rr(3, 6), z, vx: rr(0.2, 0.8), vy: rr(-0.6, -0.3), vz: rr(-0.2, 0.2), life: rr(4, 7), size: 0.08, size1: 0.06, color: 0xb8b4b0, alpha: 0.7, alpha1: 0 });
      else P({ add: false, x, y: 0.25, z, vx: rr(-0.3, 0.3), vy: 0, vz: rr(-0.2, 0.2), life: rr(4, 7), size: 3, size1: 5, color: 0x8a94a8, alpha: 0.1, alpha1: 0 });
    } else if (k === 'crypt') {
      if (Math.random() < 0.6) P({ x, y: rr(0.2, 2.5), z, vx: rr(-0.1, 0.1), vy: rr(-0.05, 0.08), vz: rr(-0.1, 0.1), life: rr(3, 5), size: 0.05, size1: 0.05, color: 0xd0c8b0, alpha: 0.5, alpha1: 0 });
      else P({ add: false, x, y: 0.2, z, vx: rr(-0.2, 0.2), vy: 0, vz: rr(-0.2, 0.2), life: rr(4, 7), size: 2.5, size1: 4, color: 0x506070, alpha: 0.12, alpha1: 0 });
    } else if (k === 'snow') {
      // flakes drift down and sideways with the wind off the peaks; now and then a gust of spindrift along the ground
      FX.gust = (FX.gust || 0) + rate;
      const g = 0.6 + Math.sin(FX.time * 0.35) * 0.4;
      if (Math.random() < 0.94) P({ add: false, x: x - 4, y: rr(4, 9), z, vx: rr(0.6, 1.4) * (1 + g), vy: rr(-1.3, -0.8), vz: rr(-0.2, 0.3), life: rr(5, 8), size: rr(0.05, 0.11), size1: 0.06, color: 0xf2f6ff, alpha: 0.9, alpha1: 0 });
      else P({ add: false, x: x - 6, y: 0.3, z, vx: rr(2.5, 4) * g, vy: 0.1, vz: rr(-0.3, 0.3), life: rr(2, 3), size: 1.6, size1: 3.5, color: 0xdfe6f2, alpha: 0.16 * g, alpha1: 0 });
    } else if (k === 'halls') {
      if (Math.random() < 0.55) P({ x, y: rr(0.2, 4), z, vx: rr(-0.15, 0.15), vy: rr(0.15, 0.5), vz: rr(-0.15, 0.15), life: rr(2.5, 5), size: 0.05, size1: 0.02, color: 0xffb060, color1: 0xff4010, alpha: 0.9, alpha1: 0 });
      else P({ add: false, x, y: rr(0.3, 3), z, vx: rr(-0.15, 0.15), vy: rr(-0.05, 0.08), vz: rr(-0.15, 0.15), life: rr(4, 7), size: 0.06, size1: 0.06, color: 0x8a8278, alpha: 0.6, alpha1: 0 });
    } else if (k === 'weep') {
      // the Still Wood: pollen and dust hang in the gold light and barely move; a warm haze lies in the hollows
      const q = Math.random();
      if (q < 0.7) P({ x, y: rr(0.3, 3.8), z, vx: rr(-0.04, 0.04), vy: rr(-0.015, 0.03), vz: rr(-0.04, 0.04), life: rr(4, 7), size: rr(0.04, 0.09), size1: 0.05, color: 0xffe6a8, color1: 0xffb850, alpha: 0.8, alpha1: 0 });
      else if (q < 0.9) P({ add: false, x, y: rr(0.9, 1.6), z, vx: rr(-0.05, 0.05), vy: 0, vz: rr(-0.05, 0.05), life: rr(5, 8), size: 2.2, size1: 3.2, color: 0xd0a860, alpha: 0.08, alpha1: 0 });
      else P({ add: false, x, y: rr(1, 4), z, vx: 0, vy: rr(-0.01, 0.01), vz: 0, life: rr(5, 8), size: 0.05, size1: 0.05, color: 0xe8d8b0, alpha: 0.7, alpha1: 0 });
    } else if (k === 'weepAutumn') {
      // the First Autumn: leaves fall at last, gold and brown, on a wind out of the west
      const g = 0.6 + Math.sin(FX.time * 0.4) * 0.4, y = rr(3, 8), vy = rr(-1.1, -0.65);
      if (Math.random() < 0.75) P({ leaf: true, x: x - 3, y, z, vx: rr(0.3, 0.9) * (0.6 + g), vy, vz: rr(-0.25, 0.25), life: (y / -vy) * 0.97, size: rr(0.26, 0.4), size1: 0.3, color: Math.random() < 0.55 ? 0xe0a030 : Math.random() < 0.5 ? 0xb85a1c : 0x8a5a2a, alpha: 1, alpha1: 0.85 });
      else P({ add: false, x, y: rr(0.9, 1.6), z, vx: rr(0.1, 0.4), vy: 0, vz: rr(-0.1, 0.1), life: rr(4, 7), size: 2.2, size1: 3.2, color: 0xa88a60, alpha: 0.07, alpha1: 0 });
    } else if (k === 'heart' || k === 'heartAutumn') {
      // inside the First Oak: spores rise from the root floor, sap drips from above; after the First Autumn leaves drift down
      const autumn = k === 'heartAutumn', q = Math.random();
      if (q < 0.55) P({ x, y: rr(0, 1.2), z, vx: rr(-0.06, 0.06), vy: rr(0.12, 0.35), vz: rr(-0.06, 0.06), life: rr(4, 7), size: rr(0.04, 0.07), size1: 0.03, color: autumn ? 0xe8d0a0 : 0xe8e090, color1: 0xa07830, alpha: 0.85, alpha1: 0 });
      else if (q < 0.7 && !autumn) { const y = rr(4.5, 7); P({ x, y, z, vy: -0.4, life: Math.sqrt((2 * y) / 9.8), size: 0.08, size1: 0.06, color: 0xffc050, color1: 0xff9020, alpha: 0.9, alpha1: 0.85, grav: 9.8 }); }
      else if (q < 0.82 && autumn) { const y = rr(4, 7), vy = rr(-0.9, -0.55); P({ leaf: true, x, y, z, vx: rr(-0.2, 0.2), vy, vz: rr(-0.2, 0.2), life: (y / -vy) * 0.97, size: rr(0.24, 0.36), size1: 0.28, color: Math.random() < 0.6 ? 0xd09030 : 0x8a5a2a, alpha: 1, alpha1: 0.8 }); }
      else P({ add: false, x, y: rr(0.8, 1.4), z, vx: rr(-0.08, 0.08), vy: 0, vz: rr(-0.08, 0.08), life: rr(5, 8), size: 2, size1: 3, color: 0x4a3018, alpha: 0.12, alpha1: 0 });
    } else if (k === 'ashfall') {
      // the Field of Ash: grey and black flakes coming down slow on a wind from the mountain; now and then an ember going up
      const q = Math.random();
      if (q < 0.84) P({ add: false, x: x - 2, y: rr(3, 8.5), z, vx: rr(0.15, 0.5), vy: rr(-0.6, -0.32), vz: rr(-0.12, 0.18), life: rr(8, 12), size: rr(0.07, 0.13), size1: 0.08, color: Math.random() < 0.45 ? 0x4a4542 : 0x9a948c, alpha: 0.9, alpha1: 0 });
      else if (q < 0.9) P({ x, y: rr(0.2, 1.4), z, vx: rr(-0.12, 0.12), vy: rr(0.3, 0.8), vz: rr(-0.12, 0.12), life: rr(2, 4), size: 0.05, size1: 0.02, color: 0xffa040, color1: 0xff3a00, alpha: 0.9, alpha1: 0 });
      else P({ add: false, x, y: rr(0.4, 1.3), z, vx: rr(0.1, 0.35), vy: 0, vz: rr(-0.05, 0.05), life: rr(6, 9), size: 2.6, size1: 4.2, color: 0x2e2a28, alpha: 0.12, alpha1: 0 });
    } else if (k === 'ashfieldStars') {
      // the Night Without Fires: still, cold air; a little frost-dust, a low mist
      if (Math.random() < 0.6) P({ x, y: rr(0.3, 3), z, vx: rr(-0.04, 0.04), vy: rr(-0.02, 0.02), vz: rr(-0.04, 0.04), life: rr(4, 7), size: 0.04, size1: 0.03, color: 0xa8c0f0, color1: 0x6080c0, alpha: 0.7, alpha1: 0 });
      else P({ add: false, x, y: rr(0.4, 1.1), z, vx: rr(-0.05, 0.05), vy: 0, vz: rr(-0.05, 0.05), life: rr(6, 9), size: 2.4, size1: 3.6, color: 0x5a6a88, alpha: 0.08, alpha1: 0 });
    } else if (k === 'ashfieldDawn') {
      // the first dawn after: dust motes hanging gold in the light
      if (Math.random() < 0.8) P({ x, y: rr(0.4, 4), z, vx: rr(-0.05, 0.05), vy: rr(-0.01, 0.04), vz: rr(-0.05, 0.05), life: rr(4, 7), size: rr(0.04, 0.08), size1: 0.04, color: 0xffe0b0, color1: 0xffb070, alpha: 0.8, alpha1: 0 });
      else P({ add: false, x, y: rr(0.6, 1.5), z, vx: rr(0.05, 0.15), vy: 0, vz: rr(-0.05, 0.05), life: rr(6, 9), size: 2.4, size1: 3.6, color: 0xc8a888, alpha: 0.07, alpha1: 0 });
    } else if (k === 'forge') {
      // inside the Black Anvil: embers rising on the heat, soot drifting, a warm haze low down
      const q = Math.random();
      if (q < 0.6) P({ x, y: rr(0, 2.5), z, vx: rr(-0.25, 0.25), vy: rr(0.5, 1.4), vz: rr(-0.25, 0.25), life: rr(2, 4.5), size: rr(0.04, 0.07), size1: 0.02, color: 0xffb050, color1: 0xff3000, alpha: 0.95, alpha1: 0, drag: 0.3 });
      else if (q < 0.88) P({ add: false, x, y: rr(1, 5), z, vx: rr(-0.15, 0.15), vy: rr(-0.15, 0.05), vz: rr(-0.15, 0.15), life: rr(5, 8), size: rr(0.05, 0.09), size1: 0.06, color: 0x1e1a18, alpha: 0.8, alpha1: 0 });
      else P({ add: false, x, y: rr(0.3, 1.2), z, vx: rr(-0.1, 0.1), vy: 0.03, vz: rr(-0.1, 0.1), life: rr(5, 8), size: 2.4, size1: 3.8, color: 0x4a2414, alpha: 0.1, alpha1: 0 });
    } else if (k === 'forgeCold') {
      // the cold forge: grey ash settling, nothing rising
      if (Math.random() < 0.75) P({ add: false, x, y: rr(1, 6), z, vx: rr(-0.08, 0.08), vy: rr(-0.25, -0.1), vz: rr(-0.08, 0.08), life: rr(6, 10), size: rr(0.05, 0.08), size1: 0.05, color: 0x8a8884, alpha: 0.75, alpha1: 0 });
      else P({ add: false, x, y: rr(0.3, 1.0), z, vx: rr(-0.05, 0.05), vy: 0, vz: rr(-0.05, 0.05), life: rr(6, 9), size: 2.4, size1: 3.6, color: 0x3a3a40, alpha: 0.1, alpha1: 0 });
    } else if (k === 'coast' || k === 'coastFrozen') {
      // the Frozen Coast: light snow on the wind off the sea (out of the north-east), spindrift ribbons running along the
      // ground; after the Freeze, diamond dust glinting in the still air instead of the sea's smoke
      const q = Math.random(), g = 0.6 + Math.sin(FX.time * 0.3) * 0.4, frz = k === 'coastFrozen';
      if (q < (frz ? 0.5 : 0.8)) P({ add: false, x: x + 4, y: rr(4, 9), z: z - 3, vx: rr(-1.1, -0.5) * (0.7 + g * 0.5), vy: rr(-1.2, -0.75), vz: rr(0.2, 0.6), life: rr(5, 8), size: rr(0.05, 0.1), size1: 0.06, color: 0xeef3fa, alpha: 0.85, alpha1: 0 });
      else if (q < (frz ? 0.85 : 0.93) && frz) P({ x, y: rr(0.4, 4), z, vx: rr(-0.06, 0.06), vy: rr(-0.04, 0.02), vz: rr(-0.06, 0.06), life: rr(1.2, 2.6), size: rr(0.035, 0.06), size1: 0.02, color: 0xe8f4ff, color1: 0x9ac8ff, alpha: 0.95, alpha1: 0 });
      else P({ add: false, x: x + 5, y: rr(0.08, 0.4), z: z - 2, vx: rr(-3.6, -2.2) * g, vy: 0.02, vz: rr(0.8, 1.6) * g, life: rr(1.5, 2.6), size: rr(0.9, 1.4), size1: rr(2.4, 3.4), color: 0xdce6f0, alpha: 0.11 * g, alpha1: 0 });
    } else if (k === 'farlight') {
      // the frozen sea: diamond dust hanging glittering in the cold air, spindrift creeping over the ice
      const q = Math.random(), g = 0.5 + Math.sin(FX.time * 0.25) * 0.5;
      if (q < 0.62) P({ x, y: rr(0.3, 4.5), z, vx: rr(-0.08, 0.08), vy: rr(-0.05, 0.03), vz: rr(-0.08, 0.08), life: rr(1.2, 3), size: rr(0.03, 0.065), size1: 0.02, color: 0xf0f8ff, color1: 0x8ab8ff, alpha: 0.95, alpha1: 0 });
      else if (q < 0.82) P({ add: false, x: x + 3, y: rr(4, 8), z, vx: rr(-0.8, -0.3), vy: rr(-0.9, -0.6), vz: rr(0.1, 0.3), life: rr(6, 9), size: rr(0.05, 0.08), size1: 0.05, color: 0xe8eef8, alpha: 0.8, alpha1: 0 });
      else P({ add: false, x: x + 5, y: rr(0.06, 0.3), z, vx: rr(-2.6, -1.4) * (0.5 + g), vy: 0.01, vz: rr(-0.3, 0.3), life: rr(1.8, 3), size: rr(0.8, 1.2), size1: rr(2.2, 3.2), color: 0xd4dee8, alpha: 0.09 + 0.05 * g, alpha1: 0 });
    } else if (k === 'blizzard') {
      // a gust off the open ice, and the Skotos's Night: snow driven sideways, thick streaming veils along the ground
      const q = Math.random();
      if (q < 0.72) P({ add: false, x: x + 12, y: rr(0.3, 7), z: z + rr(-2, 2), vx: rr(-11, -7), vy: rr(-1.4, -0.4), vz: rr(-0.8, 0.8), life: rr(1.6, 2.6), size: rr(0.06, 0.13), size1: 0.07, color: 0xf2f6fc, alpha: 0.9, alpha1: 0.3 });
      else if (q < 0.94) P({ add: false, x: x + 10, y: rr(0.1, 1.2), z: z + rr(-2, 2), vx: rr(-8, -5), vy: rr(-0.05, 0.15), vz: rr(-0.6, 0.6), life: rr(1.5, 2.5), size: rr(1.4, 2.2), size1: rr(3.5, 5), color: 0xdfe8f2, alpha: 0.16, alpha1: 0 });
      else P({ add: false, x, y: rr(1, 3), z, vx: rr(-3, -1.5), vy: 0, vz: 0, life: rr(2, 3.5), size: 5, size1: 8, color: 0xc8d2de, alpha: 0.07, alpha1: 0 });
    } else if (k === 'gate') {
      P({ x, y: rr(0.2, 3), z, vx: rr(-0.2, 0.2), vy: rr(0.2, 0.6), vz: rr(-0.2, 0.2), life: rr(2, 4), size: 0.1, size1: 0.02, color: 0xc080ff, color1: 0x4010a0, alpha: 0.9, alpha1: 0 });
    }
  }
}

export function updateFX(dt, cx, cz) {
  FX.time += dt;
  for (const e of FX.emitters) emit(e, dt, cx, cz);
  ambient(dt, cx, cz);
  if (AMB5.has(FX.ambient)) walk5(dt, cx, cz); else FX.walk = null;
  if (PRINTS.mesh) tickPrints(dt);
  FX.add.update(dt); FX.alpha.update(dt); FX.leaf.update(dt);
  for (let i = FX.rings.length - 1; i >= 0; i--) {
    const r = FX.rings[i]; r.t += dt; const k = r.t / r.life;
    if (k >= 1) { FX.group.remove(r.m); r.m.material.dispose(); FX.rings.splice(i, 1); continue; }
    r.m.scale.setScalar(0.2 + r.r * Math.sqrt(k)); r.m.material.opacity = 1 - k;
  }
  for (let i = FX.decals.length - 1; i >= 0; i--) {
    const d = FX.decals[i]; d.t += dt;
    // (on thin ice: gone with the ice when it breaks, FX.iceSt the crack stages, sea.js)
    if (d.ice >= 0 && FX.iceSt?.[d.ice] === 4) d.a = 0;
    if (d.t > d.life || d.a <= 0) { d.a -= dt * 0.5; if (d.a <= 0) { FX.group.remove(d.m); d.m.material.dispose(); FX.decals.splice(i, 1); continue; } }
    // (on the tide's flats: the water over it as it floods and ebbs; Skerry Bay keeps its own level)
    const k = d.bed == null ? 1 : underWater((d.bay ? FX.bayLv || 0 : FX.tideLv || 0) - d.bed);
    d.m.material.opacity = d.a * k; d.m.visible = k > 0.01;
  }
  for (let i = FX.teles.length - 1; i >= 0; i--) {
    const t = FX.teles[i]; t.t += dt;
    const u = t.m.material.uniforms;
    u.uP.value = Math.min(1, t.t / t.dur);
    if (!t.alive || t.t > t.dur + 0.12) {
      u.uA.value -= dt * 8;
      if (u.uA.value <= 0) { FX.group.remove(t.m); t.m.material.dispose(); if (t.m.userData.ownGeo) t.m.geometry.dispose(); FX.teles.splice(i, 1); }
    }
  }
}
export function clearFX() {
  FX.add.clear(); FX.alpha.clear(); FX.leaf.clear();
  clearPrints(); FX.walk = null;
  for (const r of FX.rings) { FX.group.remove(r.m); r.m.material.dispose(); } FX.rings = [];
  for (const d of FX.decals) { FX.group.remove(d.m); d.m.material.dispose(); } FX.decals = [];
  for (const t of FX.teles) { FX.group.remove(t.m); t.m.material.dispose(); } FX.teles = [];
}

// ---------- Act V: water, ice, breath, footprints ----------
const AMB5 = new Set(['coast', 'coastFrozen', 'farlight', 'blizzard']);
// a splash where something goes into the water (s its size): spray thrown up, a foam burst, a ring on the surface
export function splash(x, z, s = 1) {
  for (let i = 0; i < 14 * s; i++) { const a = rr(0, TAU), v = rr(1, 3) * s; P({ add: false, x, y: 0.25, z, vx: Math.cos(a) * v * 0.5, vy: rr(2.5, 5) * Math.sqrt(s), vz: Math.sin(a) * v * 0.5, grav: 9.8, life: rr(0.5, 0.9), size: rr(0.08, 0.16), size1: 0.05, color: 0xd8e6ee, alpha: 0.9, alpha1: 0.2 }); }
  P({ add: false, x, y: 0.3, z, vy: 0.4, life: 0.8, size: 0.8 * s, size1: 2.2 * s, color: 0xe8f0f4, alpha: 0.4, alpha1: 0 });
  ring(x, z, 1.6 * s, 0xa8c4d4, 0.7, 0.3);
}
// ice breaking: shards flung out and skittering, a puff of powder
export function iceShards(x, z, n = 12) {
  for (let i = 0; i < n; i++) { const a = rr(0, TAU), v = rr(1.2, 3.5); P({ x, y: 0.1, z, vx: Math.cos(a) * v, vy: rr(1.5, 3.5), vz: Math.sin(a) * v, grav: 9.8, drag: 0.6, life: rr(0.6, 1.2), size: rr(0.08, 0.15), size1: 0.06, color: 0xe0f2ff, color1: 0x7ab4e0, alpha: 0.95, alpha1: 0.3 }); }
  P({ add: false, x, y: 0.2, z, vy: 0.3, life: 1.1, size: 0.9, size1: 2.4, color: 0xe4ecf2, alpha: 0.35, alpha1: 0 });
}
// a freeze front's crystals: glints round a circle of radius r rising a little and going out
export function freezeCrystals(x, z, r = 2, n = 16) {
  for (let i = 0; i < n; i++) { const a = rr(0, TAU), d = r * rr(0.85, 1.05); P({ x: x + Math.cos(a) * d, y: rr(0.05, 0.4), z: z + Math.sin(a) * d, vx: Math.cos(a) * 0.3, vy: rr(0.2, 0.7), vz: Math.sin(a) * 0.3, life: rr(0.7, 1.5), size: rr(0.06, 0.12), size1: 0.02, color: 0xf4fbff, color1: 0x8ad0ff, alpha: 1, alpha1: 0, drag: 0.8 }); }
}
// a breath in the cold, from (x, y, z) toward (dx, dz): a small cloud drifting out and up; k (0-1, Chilled and worse) thicker
export function breath(x, y, z, k = 0, dx = 0, dz = 1) {
  for (let i = 0; i < 2 + Math.round(k * 3); i++) P({ add: false, x: x + dx * 0.1, y: y + rr(-0.04, 0.04), z: z + dz * 0.1, vx: dx * rr(0.3, 0.6) + rr(-0.1, 0.1), vy: rr(0.08, 0.25), vz: dz * rr(0.3, 0.6) + rr(-0.1, 0.1), life: rr(1.1, 1.8), size: rr(0.1, 0.16), size1: rr(0.55, 0.8) * (1 + k * 0.4), color: 0xeef2f6, alpha: 0.22 + k * 0.12, alpha1: 0, drag: 0.9 });
}
// in an Act V zone, round the hero (the camera's target): a breath every 2.5 s (FX.chill 0-1, cold.js, quickens it and
// thickens it), and her footprints in the snow every 0.7 m (not at quality 0)
function walk5(dt, cx, cz) {
  const w = FX.walk ||= { x: cx, z: cz, d: 0, side: 1, dx: 0, dz: 1, bt: 1 };
  const mx = cx - w.x, mz = cz - w.z, m = Math.hypot(mx, mz);
  w.x = cx; w.z = cz;
  if (m > 3) { w.d = 0; return; }
  if (m > 0.001) { w.dx = mx / m; w.dz = mz / m; }
  const chill = clamp(FX.chill || 0, 0, 1);
  if ((w.bt -= dt) <= 0) { w.bt = lerp(2.5, 1.4, chill) * rr(0.9, 1.1); breath(cx + w.dx * 0.22, 1.6, cz + w.dz * 0.22, chill, w.dx, w.dz); }
  if (FX.q < 1 || !FX.L5) return;
  w.d += m;
  if (w.d < 0.7) return;
  w.d = 0; w.side = -w.side;
  const px = cx - w.dz * 0.13 * w.side, pz = cz + w.dx * 0.13 * w.side;
  if (snowAt(FX.L5, px, pz)) footprint(px, pz, Math.atan2(w.dx, w.dz));
}
// a cell of snow (land, or thick ice under its snow; not thin ice, water, a window or the jetty)
function snowAt(L, x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) return false;
  const i = iz * L.w + ix;
  return !!L.cells[i] && !L.ice?.[i] && !L.low?.[i] && !L.window?.[i] && !L.deck?.[i] && (!L.bed || L.bed[i] >= BED_DRY || !!L.thick?.[i]);
}
// footprints: 48 instanced prints pressed into the snow, each fading out over its last 3 of 12 s
const PRINTS = { mesh: null, fade: null, t: new Float32Array(48), n: 0 };
let printTex = null;
function printTexture() {
  if (printTex) return printTex;
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 22, 2, 16, 22, 14); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(16, 22, 10, 15, 0, 0, TAU); g.fill();
  const gh = g.createRadialGradient(16, 50, 1, 16, 50, 9); gh.addColorStop(0, 'rgba(255,255,255,0.9)'); gh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gh; g.beginPath(); g.ellipse(16, 50, 8, 9, 0, 0, TAU); g.fill();
  return (printTex = new THREE.CanvasTexture(c));
}
function printMesh() {
  const geo = new THREE.PlaneGeometry(0.16, 0.3); geo.rotateX(-Math.PI / 2);
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(48), 1); fade.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aFade', fade);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: printTexture() } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float aFade; varying vec2 vUv; varying float vF; void main(){ vUv = uv; vF = aFade; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D uTex; varying vec2 vUv; varying float vF; void main(){ float a = texture2D(uTex, vUv).a * vF; if (a < 0.01) discard; gl_FragColor = vec4(0.13, 0.16, 0.23, a * 0.5); }'
  });
  const m = new THREE.InstancedMesh(geo, mat, 48);
  m.count = 0; m.frustumCulled = false; m.renderOrder = 2;
  FX.group.add(m);
  PRINTS.mesh = m; PRINTS.fade = fade;
  return m;
}
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pp = new THREE.Vector3(), _ps = new THREE.Vector3(1, 1, 1), _py = new THREE.Vector3(0, 1, 0);
export function footprint(x, z, rot) {
  const m = PRINTS.mesh || printMesh(), i = PRINTS.n++ % 48;
  m.setMatrixAt(i, _pm.compose(_pp.set(x, 0.026, z), _pq.setFromAxisAngle(_py, rot), _ps));
  m.instanceMatrix.needsUpdate = true;
  PRINTS.t[i] = 12;
  m.count = Math.min(48, PRINTS.n);
}
function tickPrints(dt) {
  const f = PRINTS.fade.array;
  for (let i = 0; i < PRINTS.mesh.count; i++) { PRINTS.t[i] = Math.max(0, PRINTS.t[i] - dt); f[i] = Math.min(1, PRINTS.t[i] / 3); }
  PRINTS.fade.needsUpdate = true;
}
function clearPrints() { if (PRINTS.mesh) { PRINTS.mesh.count = 0; PRINTS.n = 0; PRINTS.t.fill(0); } }

// ---------- Act V: the frost at the screen's edges (hud.js lays it over the screen under a CSS mask that follows Cold) ----------
// frostImage(): a data URL (the CSP allows data: images) of frost feathers growing in from the edges, clear in the middle;
// frostVignette(v): for Cold v (0-100) how far in it reaches (inner/outer, % of the half-diagonal) and how strong it is
let frostURL = null;
export function frostImage() {
  if (frostURL) return frostURL;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const R0 = N * 0.5;
  // a soft white rim, then frost feathers: branches grown inward from the edge, each splitting into fine needles
  const rim = g.createRadialGradient(R0, R0, R0 * 0.55, R0, R0, R0 * 1.42);
  rim.addColorStop(0, 'rgba(230,242,255,0)'); rim.addColorStop(0.55, 'rgba(220,236,250,0.18)'); rim.addColorStop(1, 'rgba(240,248,255,0.75)');
  g.fillStyle = rim; g.fillRect(0, 0, N, N);
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const branch = (x, y, a, len, w, depth) => {
    if (depth > 4 || len < 3) return;
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    g.strokeStyle = `rgba(245,250,255,${0.55 - depth * 0.08})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.stroke();
    const n = 3 - Math.min(depth, 2);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1), bx = x + (x1 - x) * t, by = y + (y1 - y) * t;
      branch(bx, by, a + 0.75 + (rnd() - 0.5) * 0.3, len * 0.42, w * 0.6, depth + 1);
      branch(bx, by, a - 0.75 + (rnd() - 0.5) * 0.3, len * 0.42, w * 0.6, depth + 1);
    }
    branch(x1, y1, a + (rnd() - 0.5) * 0.4, len * 0.6, w * 0.75, depth + 1);
  };
  for (let k = 0; k < 64; k++) {
    const t = k / 64, side = k % 4, u = rnd() * N;
    const [x, y, a] = side === 0 ? [u, 0, Math.PI / 2] : side === 1 ? [N, u, Math.PI] : side === 2 ? [u, N, -Math.PI / 2] : [0, u, 0];
    branch(x, y, a + (rnd() - 0.5) * 0.9, 40 + rnd() * 70, 2.2, 0);
    void t;
  }
  return (frostURL = c.toDataURL('image/png'));
}
export function frostVignette(v) {
  const k = clamp((v - 25) / 75, 0, 1);
  return { inner: Math.round(lerp(78, 30, k)), outer: Math.round(lerp(118, 82, k)), opacity: +(k > 0 ? 0.25 + 0.75 * k : 0).toFixed(3) };
}
