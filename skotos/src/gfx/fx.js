// Particles, weapon trails, ground telegraphs, decals, rings and lightning.
import * as THREE from 'three';
import { R, addLight, shake } from './gfx.js';
import { tex } from './textures.js';
import { rand, clamp, lerp, TAU } from '../core/util.js';

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

class Pool {
  constructor(cap, additive) {
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
      uniforms: { uTex: { value: tex('dot') }, uScale: { value: 300 } },
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
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

export const FX = { add: null, alpha: null, group: null, trails: [], teles: [], rings: [], decals: [], bolts: [], emitters: [], ambient: null, time: 0, q: 1 };

export function initFX(quality) {
  FX.q = quality;
  FX.group = new THREE.Group();
  FX.add = new Pool([1200, 2400, 3500][quality], true);
  FX.alpha = new Pool([500, 1000, 1600][quality], false);
  FX.group.add(FX.add.points, FX.alpha.points);
  R.scene.add(FX.group);
  const setScale = () => { const s = R.h * R.renderer.getPixelRatio() * 0.5 / Math.tan((R.camera.fov * Math.PI) / 360); FX.add.mat.uniforms.uScale.value = s; FX.alpha.mat.uniforms.uScale.value = s; };
  setScale(); window.addEventListener('resize', () => setTimeout(setScale, 50));
  FX.setScale = setScale;
}
export const P = (o) => (o.add === false ? FX.alpha : FX.add).spawn(o);
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
  if (FX.decals.length > 40) { const d = FX.decals.shift(); FX.group.remove(d.m); d.m.material.dispose(); }
  const color = kind === 'blood' ? 0x4a0505 : kind === 'scorch' ? 0x0a0806 : kind === 'goo' ? 0x2a4a08 : kind === 'ecto' ? 0x2a6a8a : 0x202020;
  const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: decalTexture(), color, transparent: true, opacity: kind === 'ecto' ? 0.5 : 0.75, depthWrite: false, blending: kind === 'ecto' ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.position.set(x, 0.03 + FX.decals.length * 0.0005, z); m.rotation.y = Math.random() * TAU; m.scale.setScalar(s);
  m.renderOrder = 2;
  FX.group.add(m);
  FX.decals.push({ m, life, t: 0 });
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
    case 'mist': while (e.acc > 0.3) { e.acc -= 0.3; P({ add: false, x: e.x + rr(-1.2, 1.2), y: 0.3, z: e.z + rr(0, 1), vx: rr(-0.2, 0.2), vy: 0.05, vz: rr(0.2, 0.6), life: rr(3, 5), size: 1.5, size1: 3.5, color: 0x8aa0b8, alpha: 0.22, alpha1: 0, drag: 0.2 }); } break;
  }
}
function ambient(dt, cx, cz) {
  const k = FX.ambient; if (!k) return;
  FX.ambAcc = (FX.ambAcc || 0) + dt;
  const rate = k === 'forest' ? 0.06 : k === 'town' ? 0.05 : k === 'snow' ? 0.012 : k === 'halls' ? 0.07 : 0.09;
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
    } else if (k === 'gate') {
      P({ x, y: rr(0.2, 3), z, vx: rr(-0.2, 0.2), vy: rr(0.2, 0.6), vz: rr(-0.2, 0.2), life: rr(2, 4), size: 0.1, size1: 0.02, color: 0xc080ff, color1: 0x4010a0, alpha: 0.9, alpha1: 0 });
    }
  }
}

export function updateFX(dt, cx, cz) {
  FX.time += dt;
  for (const e of FX.emitters) emit(e, dt, cx, cz);
  ambient(dt, cx, cz);
  FX.add.update(dt); FX.alpha.update(dt);
  for (let i = FX.rings.length - 1; i >= 0; i--) {
    const r = FX.rings[i]; r.t += dt; const k = r.t / r.life;
    if (k >= 1) { FX.group.remove(r.m); r.m.material.dispose(); FX.rings.splice(i, 1); continue; }
    r.m.scale.setScalar(0.2 + r.r * Math.sqrt(k)); r.m.material.opacity = 1 - k;
  }
  for (let i = FX.decals.length - 1; i >= 0; i--) {
    const d = FX.decals[i]; d.t += dt;
    if (d.t > d.life) { d.m.material.opacity -= dt * 0.5; if (d.m.material.opacity <= 0) { FX.group.remove(d.m); d.m.material.dispose(); FX.decals.splice(i, 1); } }
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
  FX.add.clear(); FX.alpha.clear();
  for (const r of FX.rings) { FX.group.remove(r.m); r.m.material.dispose(); } FX.rings = [];
  for (const d of FX.decals) { FX.group.remove(d.m); d.m.material.dispose(); } FX.decals = [];
  for (const t of FX.teles) { FX.group.remove(t.m); t.m.material.dispose(); } FX.teles = [];
}
