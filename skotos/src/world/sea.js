// Act V's sea and sky (the design's "The look"): the water over the tidal flats and the open sea, the black ice you can see
// into, the aurora (in the water and the ice in play, as a sky in the cines), the sea-lights' beams and the Skotos's skin.
// No render targets: everything is one forward pass. Every image has a quality-0 path (built first: depth colour, edge
// line, foam, shades, cracks) and the richer paths on top (two noise reads, the aurora reflection, light paths, parallax,
// the drowned lanterns). Draw order in Act V zones: ice -1, the leads' opaque water -0.5, the see-through sea -0.6 (before
// every other see-through thing), the ice windows 1, blob shadows 1.5, light pools, rings and decals 2, telegraphs 3.
import * as THREE from 'three';
import { R } from '../gfx/gfx.js';
import { FX } from '../gfx/fx.js';
import { BED_DRY, ICE_Y } from './genlib.js';
import { inBay } from './gen5.js';
import { ENV } from '../gfx/env.js';
import { clamp, fbm } from '../core/util.js';

const V4 = () => new THREE.Vector4(0, 0, 0, 0);
// The shared uniform block (each entry a three.js uniform: materials hold these very objects). uTime becomes WIND.uTime
// (build.js). uLevel/uWetLevel: tide.js; uAur/uAurDark: gfx.js setAtmosphere (ATMOS aur, aurDark) and the cines;
// uAurFront: how much of the sky is restored, south to north; tCrack/uMap: ice.js (the crack stage per cell, R8 w x h,
// and (w, h)); uShade (x, z, r, k): dark shapes under the ice, slots 0-2 the Icemaws, 3 the Skotos and the arrival shadow;
// uGlow (x, depth, z, k): drowned lanterns (sea.js, from L.spots.drowned); uLights (x, y, z, intensity): the two nearest
// lit lanterns, uBeam (ox, oy, oz, k), (dx, dy, dz, len): the nearest beam (light.js); uFreeze (x, z, r, t): slot k the
// Breathing-hole k (t 0-1 the wave racing out over its lead; t < 0 the white ring closing over the hole, freezeRing; r < 0
// every water cell, not only the lead's); uFreezeAll: the Freeze; uWake (x, z, angle, k): the Walking Tower's wake.
// uBayLevel: Skerry Bay's own level (tide.js: 0 under the clock, which never reaches it; the Walking Tower's while it
// owns the water); the water over the bay (aBay) stands at it instead of uLevel.
// SEA.sky (a plain boolean): the aurora dome may show in the cines (act5Enter, townFires after seaLit).
export const SEA = {
  uTime: { value: 0 },
  uLevel: { value: 0 }, uWetLevel: { value: 0 }, uBayLevel: { value: 0 },
  uAur: { value: 0 }, uAurDark: { value: 0 }, uAurFront: { value: 0 }, uAurCol: { value: new THREE.Color(0.1, 1.0, 0.46) },
  tNoise: { value: null }, tVor: { value: null }, tCrack: { value: null }, uMap: { value: new THREE.Vector2(1, 1) }, tBed: { value: null }, uBedS: { value: new THREE.Vector2(1, 1) },
  uShade: { value: [V4(), V4(), V4(), V4()] },
  uGlow: { value: Array.from({ length: 8 }, V4) },
  uLights: { value: [V4(), V4()] },
  uBeam: { value: [V4(), V4()] },
  uFreeze: { value: [V4(), V4(), V4()] }, uFreezeAll: { value: 0 }, uFrzT: { value: 0 }, uFrzOn: { value: 0 }, uGlowOn: { value: 0 },
  uWake: { value: V4() },
  sky: false
};
// the per-frame light the sea's own shading reads (the water is unlit: it mirrors and glows; set before each render)
const LIT = {
  uAmbK: { value: 1 }, uSkyC: { value: new THREE.Color() }, uMoonD: { value: new THREE.Vector3(0, 1, 0) }, uMoonC: { value: new THREE.Color() },
  uHeroP: { value: new THREE.Vector3(0, -99, 0) }, uHeroC: { value: new THREE.Color() }, uHeroR: { value: 15 }
};
const _v = new THREE.Vector3();
function lightTick() {
  const h = R.hemi, m = R.moon, hl = R.heroLight;
  if (!h) return;
  LIT.uAmbK.value = clamp(h.intensity, 0.05, 1.4);
  LIT.uSkyC.value.copy(h.color).multiplyScalar(h.intensity * 0.55);
  LIT.uMoonD.value.copy(_v.copy(m.position).sub(m.target.position).normalize());
  LIT.uMoonC.value.copy(m.color).multiplyScalar(m.intensity);
  LIT.uHeroP.value.copy(hl.position); LIT.uHeroC.value.copy(hl.color).multiplyScalar(hl.intensity); LIT.uHeroR.value = hl.distance || 15;
}

// ---------- the noise texture: 256², four octaves of tileable noise, one per channel (R the broadest) ----------
// (gradient noise: value noise plateaus at its lattice points, and every threshold drawn on it shows square cells)
function hashP(x, y, p, s) {
  x = ((x % p) + p) % p; y = ((y % p) + p) % p;
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noiseTex() {
  if (SEA.tNoise.value) return SEA.tNoise.value;
  const N = 256, d = new Uint8Array(N * N * 4), P = [4, 8, 16, 32];
  for (let c = 0; c < 4; c++) {
    const p = P[c], k = p / N, gx = new Float32Array(p * p), gy = new Float32Array(p * p);
    for (let i = 0; i < p * p; i++) { const a = hashP(i % p, Math.floor(i / p), p, c + 7) * 6.2832; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    const dot = (ix, iy, fx, fy) => { const i = (((iy % p) + p) % p) * p + (((ix % p) + p) % p); return gx[i] * fx + gy[i] * fy; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x * k, v = y * k, xi = Math.floor(u), yi = Math.floor(v), fx = u - xi, fy = v - yi;
      const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10), sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
      const a = dot(xi, yi, fx, fy), b = dot(xi + 1, yi, fx - 1, fy), e = dot(xi, yi + 1, fx, fy - 1), f = dot(xi + 1, yi + 1, fx - 1, fy - 1);
      const n = (a + (b - a) * sx) * (1 - sy) + (e + (f - e) * sx) * sy;
      d[(y * N + x) * 4 + c] = Math.round(255 * clamp(0.5 + n * 0.95, 0, 1));
    }
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  vorTex();
  return (SEA.tNoise.value = t);
}
// a Voronoi of 16 x 16 jittered cells on a 256 texel tile, worked out once (vorT in the shaders reads it): r the distance
// between the nearest two points (0 on a cell's wall, 0.7 cells full scale), g a hash per cell. Read per pixel, the 3 x 3
// search cost every pixel of ice and of the leads a dozen hashes on the phones
function vorTex() {
  if (SEA.tVor.value) return SEA.tVor.value;
  const N = 256, C = 16, S = N / C, d = new Uint8Array(N * N * 4), pt = new Float32Array(C * C * 2);
  for (let i = 0; i < C * C; i++) { pt[i * 2] = 0.075 + hashP(i % C, Math.floor(i / C), C, 31) * 0.85; pt[i * 2 + 1] = 0.075 + hashP(i % C, Math.floor(i / C), C, 37) * 0.85; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / S, v = (y + 0.5) / S, cx = Math.floor(u), cy = Math.floor(v);
    let d1 = 9, d2 = 9, id = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx, gy = cy + dy, k = (((gy % C) + C) % C) * C + (((gx % C) + C) % C);
      const qx = gx + pt[k * 2] - u, qy = gy + pt[k * 2 + 1] - v, dd = qx * qx + qy * qy;
      if (dd < d1) { d2 = d1; d1 = dd; id = k; } else if (dd < d2) d2 = dd;
    }
    const o = (y * N + x) * 4;
    d[o] = Math.round(clamp((Math.sqrt(d2) - Math.sqrt(d1)) / 0.7, 0, 1) * 255);
    d[o + 1] = Math.round(hashP(id % C, Math.floor(id / C), C, 41) * 255); d[o + 2] = Math.round(clamp(Math.sqrt(d1) / 0.8, 0, 1) * 255); d[o + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.needsUpdate = true;
  return (SEA.tVor.value = t);
}
// until ice.js hands its crack texture over: every cell intact
function crackTex() {
  if (!SEA.tCrack.value) { const t = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat); t.needsUpdate = true; SEA.tCrack.value = t; }
  return SEA.tCrack.value;
}

// ---------- shared GLSL ----------
const COMMON = `
uniform sampler2D tNoise; uniform sampler2D tVor; uniform float uTime;
uniform float uAur; uniform float uAurDark; uniform float uAurFront; uniform vec3 uAurCol; uniform vec2 uMap;
float sH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 sH2(vec2 p) { float n = sH(p); return vec2(n, sH(p + n * 17.3)); }
// the Voronoi read off its texture (p in cells): x the wall distance (0 on a wall), y the cell's hash
vec2 vorT(vec2 p) { vec4 v = texture2D(tVor, p * 0.0625); return vec2(v.r * 0.7, v.g); }
// the aurora's curtains on a sheet of sky (p: metres on it, in world x/z): long east-west arcs some 70 m apart, folded
// every few tens of metres along their length (so a mirror a few metres wide sees a curtain's folds, not a band) and
// combed into rays a few metres wide; green at the core, violet at the fringes. soft (0-1): a mirrored aurora is seen
// through a ripple, its fine curtains smeared toward their glow. The black aurora darkens it and eats it with crawling
// bands, except where the returning front (uAurFront, south to north) has given it back
// blur: how many metres of sheet one pixel spans (fwidth): far off the arcs merge into their haze instead of aliasing
vec3 aurora(vec2 p, float soft, float blur) {
  float t = uTime;
  vec2 q = vec2(p.x * 0.0016, p.y * 0.0034);
  vec4 n = texture2D(tNoise, q + vec2(t * 0.0011, t * 0.0003));
  // (and kinked every score of metres: what the play camera's mirror sees of the sheet, some 25 m, held one straight band)
  float w = (n.r - 0.5) * 3.2 + (n.g - 0.5) * 1.3 + sin(p.x * 0.11 + n.b * 4.0 + t * 0.07) * 0.75 + sin(p.x * 0.009 + t * 0.05) * 0.35
    + sin(p.x * 0.31 + n.g * 5.0 + t * 0.13) * 0.24;
  float arc = 1.0 - abs(sin(p.y * 0.045 + w)), arc2 = 1.0 - abs(sin(p.y * 0.071 - w * 0.7 + 1.3));
  // (the rays: a fine noise drawn out across the arcs, drifting along them)
  float ray = texture2D(tNoise, vec2(p.x * 0.012 + w * 0.03, p.y * 0.0009) + vec2(t * 0.0009, 0.0)).a;
  ray = mix(0.35 + 1.3 * smoothstep(0.3, 0.75, ray), 1.0, soft * 0.6 + smoothstep(3.0, 10.0, blur) * 0.4);
  float cur = (pow(arc, 3.0) * mix(0.28, 0.6, soft) + pow(arc, mix(22.0, 5.0, soft)) * mix(1.0, 0.15, soft)) * smoothstep(0.25, 0.65, n.b) * (0.6 + 0.8 * mix(n.a, 0.5, soft)) * ray;
  cur += pow(arc2, mix(14.0, 5.0, soft)) * smoothstep(0.45, 0.75, n.g) * 0.45 * ray;
  cur = mix(cur, 0.09 * smoothstep(0.25, 0.65, n.b), smoothstep(4.0, 22.0, blur));
  // (the hem of a curtain white-green, its fringe violet)
  vec3 col = mix(vec3(0.36, 0.08, 0.58), uAurCol, smoothstep(0.55, 0.95, arc));
  col = mix(col, vec3(0.75, 1.0, 0.85), smoothstep(0.93, 1.0, arc) * (1.0 - soft) * 0.5);
  float zf = mix(uMap.y + 70.0, -90.0, uAurFront);
  float dk = uAurDark * (1.0 - smoothstep(zf - 30.0, zf + 30.0, p.y));
  float bands = smoothstep(0.35, 0.65, n.b + sin(p.x * 0.017 + p.y * 0.006 + t * 0.07) * 0.25);
  col = mix(col, vec3(0.14, 0.08, 0.22), dk * 0.9);
  cur *= 1.0 - dk * bands * 0.92;
  return col * cur * uAur;
}
// the black aurora's curtains (0-1): where the dark has eaten the sky, moving across it; it blots the sky's sheen in the
// water and the ice, and lies on the snow as slow dark bands (p: metres on the sheet; none where the front has passed)
float auroraDark(vec2 p) {
  float t = uTime, zf = mix(uMap.y + 70.0, -90.0, uAurFront);
  float dk = uAurDark * (1.0 - smoothstep(zf - 30.0, zf + 30.0, p.y));
  if (dk < 0.01) return 0.0;
  vec4 n = texture2D(tNoise, vec2(p.x * 0.0026, p.y * 0.0042) + vec2(-t * 0.0016, t * 0.0007));
  float w = (n.r - 0.5) * 3.0 + sin(p.x * 0.07 + n.g * 3.0 - t * 0.09) * 0.8;
  float arc = 1.0 - abs(sin(p.y * 0.05 + w));
  return dk * smoothstep(0.35, 0.9, arc) * smoothstep(0.3, 0.6, n.b + 0.15);
}
// a still noise (metres, about +-0.11) the waterline and the wading step are moved by, so neither traces the cells; the
// ground's wet sand reads the same (build.js)
float shoreN(vec2 P) { vec4 n = texture2D(tNoise, P * 0.11 + vec2(0.37, 0.61)); return (n.r - 0.5) * 0.17 + (n.g - 0.5) * 0.07; }
// an ice window's round hole (d from its centre c, the corner its 2 x 2 cells share): under 1 inside; its outline wanders
// with the angle, each window its own (the ground cuts it, build.js G_WIN; the pane fills it)
float winR(vec2 d, vec2 c) { float a = atan(d.y, d.x); return length(d * vec2(1.0, 1.12)) / (0.8 + 0.08 * sin(a * 3.0 + c.x * 1.7) + 0.05 * sin(a * 5.0 + c.y) + 0.03 * sin(a * 9.0 + c.x + c.y)); }`;
// (for groundMat's G_GLINT, G_WET and G_AUR: the same uniforms and functions)
export const SEA_GLSL = () => COMMON;
export const SEA_LIT = LIT;
export const SEA_U = (extra = {}) => Object.assign({
  tNoise: SEA.tNoise, tVor: SEA.tVor, uTime: SEA.uTime, uAur: SEA.uAur, uAurDark: SEA.uAurDark, uAurFront: SEA.uAurFront, uAurCol: SEA.uAurCol, uMap: SEA.uMap
}, extra);
// the swell, the same in JS (floes, ice.js) as in the water's vertex shader
export function swellY(x, z, t = SEA.uTime.value) { return (Math.sin(x * 0.21 + z * 0.13 + t * 1.1) + Math.sin(-x * 0.09 + z * 0.27 + t * 0.83)) * 0.5; }
const SWELL = 'float swell(vec2 p, float t) { return (sin(p.x * 0.21 + p.y * 0.13 + t * 1.1) + sin(-p.x * 0.09 + p.y * 0.27 + t * 0.83)) * 0.5; }';
// the freeze state of a water point, from the Freeze and the three freeze slots
const FREEZE = `
uniform vec4 uFreeze[3]; uniform float uFreezeAll; uniform float uFrzOn;
// x: the Freeze's ice (it keeps the crests it caught), y: a freeze wave's (flat, walkable), z: the bright front
vec3 freezeAt(vec2 p, float lead, float shore) {
  // the Freeze: the ice grows in from every shore
  float fa = uFreezeAll * 46.0, fz = 1.0 - smoothstep(fa - 2.0, fa, shore), fl = 0.0;
  float fr = (1.0 - smoothstep(0.0, 2.5, abs(shore - fa + 1.0))) * step(0.001, uFreezeAll) * step(uFreezeAll, 0.995);
  for (int k = 0; k < 3; k++) {
    vec4 f = uFreeze[k];
    if (f.w == 0.0 || f.z == 0.0) continue;
    if (f.z > 0.0 && abs(lead - float(k + 1)) > 0.5) continue;
    float R = abs(f.z), d = length(p - f.xy), e;
    if (f.w > 0.0) { e = R * f.w; fl = max(fl, 1.0 - smoothstep(e - 1.2, e, d)); fr = max(fr, (1.0 - smoothstep(0.0, 1.6, abs(d - e + 0.6))) * step(f.w, 0.999)); }
    else { e = R * (1.0 + f.w); fl = max(fl, smoothstep(e - 0.15, e + 0.25, d) * (1.0 - smoothstep(R + 0.6, R + 1.6, d))); fr = max(fr, (1.0 - smoothstep(0.0, 0.7, abs(d - e))) * step(-0.999, f.w)); }
  }
  return vec3(fz * step(0.001, uFreezeAll), fl, fr);
}
vec3 freezeIf(vec2 p, float lead, float shore) { return uFrzOn > 0.5 ? freezeAt(p, lead, shore) : vec3(0.0); }`;

// ---------- the water ----------
// o.low: held just under the ice's surface (the Farthest Light: no tide, the leads lie a hand below the ice's edge);
// o.far: the far-sea quads (no freeze slots, no lead)
const SEA_MATS = new Map();
function seaMat(o = {}) {
  const hi = R.quality >= 1, key = (o.low ? 'l' : 't') + (o.far ? 'f' : '') + (hi ? 'h' : '') + (R.quality >= 2 ? '2' : '');
  if (SEA_MATS.has(key)) return SEA_MATS.get(key);
  noiseTex();
  // (the Farthest Light's leads have no tide and are never see-through: opaque, drawn first with the ice, so the sea bed
  // under them is turned away by the depth test instead of shaded)
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: !o.low, depthWrite: !!o.low });
  const u = Object.assign(SEA_U({ uLevel: SEA.uLevel, uBayLevel: SEA.uBayLevel, uFreeze: SEA.uFreeze, uFreezeAll: SEA.uFreezeAll, uFrzT: SEA.uFrzT, uFrzOn: SEA.uFrzOn, uWake: SEA.uWake, uLights: SEA.uLights, tBed: SEA.tBed, uBedS: SEA.uBedS }), LIT);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.defines = Object.assign(sh.defines || {}, hi ? { SEA_HI: '' } : {}, R.quality >= 2 ? { SEA_Q2: '' } : {}, o.low ? { SEA_LOW: '' } : {}, o.far ? { SEA_FAR: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aBed; attribute float aHold; attribute float aLead; attribute float aShore; attribute float aFrz; attribute float aBay; attribute float aLand; attribute float aGd; attribute float aDrop; attribute vec2 aG;
uniform float uLevel; uniform float uBayLevel; uniform float uFrzT;
varying vec3 vWP; varying float vDep; varying float vLead; varying float vShore; varying float vSw; varying float vHold; varying float vFrz; varying float vLand; varying float vCr; varying float vGd; varying float vDrop; varying vec2 vG; varying float vBay;
${COMMON}
#if defined(SEA_HI) && !defined(SEA_FAR)
varying vec3 vAur; varying float vAurK;
#endif
${SWELL}
${FREEZE}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
#ifdef SEA_LOW
  float dep = 0.6;
#else
  float dep = mix(uLevel, uBayLevel, aBay) - aBed;
#endif
#ifdef SEA_FAR
  vec3 frz = vec3(0.0);
#else
  vec3 frz = freezeIf(wp0.xz, aLead, aShore);
  frz.y = max(frz.y, aFrz);
#endif
  // the Freeze holds the swell where it stopped: the crests it caught stay as ice
  float st = mix(uTime, uFrzT, step(0.001, uFreezeAll));
  float sw = swell(wp0.xz, st);
#ifdef SEA_LOW
  float y = -0.08 + sw * 0.025;
#else
  // the surface stands clamp(depth) over the flat floor: a dry corner sits under the ground, so the ground cuts a true
  // shoreline that moves with the tide; under and beside the ice (and the jetty) it is held a hand under the ice
  // (no swell where it is a film over the flats: there the swell lifted the surface through the ground and back, and a
  // flat whose bed stood at the level drew moving contour rings of water over the dry sand)
  float lift = clamp(dep, -0.05, 0.3);
  float y = lift + sw * mix(0.06, 0.18, smoothstep(0.2, 1.6, dep)) * smoothstep(0.03, 0.15, lift);
#ifndef SEA_FAR
  // (a hair over the floor at a dry corner: the waterline is drawn from the smooth bed (tBed), not where the surface between
  // the corners dips under the ground, which cut it into the triangles' sawtooth on the flats' stepped beds)
  y = max(y, 0.012 * (1.0 - aHold));
  // (and at the lip of a drop, dry land's edge over the closed water, the surface meets the land at its own height: held a
  // hand over it, the edge hovered and showed slivers of the drop face in every notch of the jittered shore)
  y = mix(y, min(y, 0.015), step(0.5, aDrop) * (1.0 - step(0.2, aGd)));
#endif
  y = mix(y, -0.08 + sw * 0.02, aHold);
#endif
#ifndef SEA_FAR
  // the Freeze: short steep crests stand up over the water in its first moment and are caught as the ice reaches them
  float cr = 0.0;
  if (uFreezeAll > 0.0005) {
    float ct = mix(uTime, uFrzT, frz.x);
    float c1 = pow(0.5 + 0.5 * sin(dot(wp0.xz, vec2(0.28, -1.33)) - ct * 2.1), 3.0), c2 = pow(0.5 + 0.5 * sin(dot(wp0.xz, vec2(-1.1, -1.45)) - ct * 2.6 + 1.7), 4.0);
    cr = (c1 * 0.4 + c2 * 0.22) * smoothstep(0.0, 0.08, uFreezeAll) * smoothstep(0.25, 0.8, dep) * (1.0 - aHold) * (1.0 - frz.y);
    y += cr;
  }
  vCr = cr;
#else
  vCr = 0.0;
#endif
  y = mix(y, ${(ICE_Y - 0.005).toFixed(3)}, frz.y);
  transformed.y = y;
  vWP = vec3(wp0.x, y, wp0.z); vDep = dep; vLead = aLead; vShore = aShore; vSw = sw; vHold = aHold; vFrz = aFrz; vLand = aLand; vGd = aGd; vDrop = aDrop; vG = aG; vBay = aBay;
#if defined(SEA_HI) && !defined(SEA_FAR)
  // the aurora in the water, worked out at the vertices (a metre apart: its folds and rays are metres wide); the ripple
  // breaks it into streaks in the fragment. Under the black aurora: its dark curtains (vAurK), blotting the sky's sheen
  vAur = vec3(0.0); vAurK = 0.0;
  {
    vec3 Vv = cameraPosition - vWP; float dv = length(Vv); Vv /= dv;
    float ry = max(Vv.y, 0.04);
    vec2 sp = vWP.xz - Vv.xz * ((70.0 - y) / ry);
    if (uAur * max(1.0 - uAurDark, uAurFront) > 0.02) vAur = aurora(sp, 0.55, 2.5 + dv * 0.05 / max(ry, 0.15)) * smoothstep(0.04, 0.3, Vv.y);
    if (uAurDark > 0.02) vAurK = auroraDark(sp);
  }
#endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${COMMON}
uniform float uFrzT; uniform vec4 uWake; uniform vec4 uLights[2];
uniform sampler2D tBed; uniform vec2 uBedS; uniform float uLevel; uniform float uBayLevel;
uniform float uAmbK; uniform vec3 uSkyC; uniform vec3 uMoonD; uniform vec3 uMoonC; uniform vec3 uHeroP; uniform vec3 uHeroC; uniform float uHeroR;
varying vec3 vWP; varying float vDep; varying float vLead; varying float vShore; varying float vSw; varying float vHold; varying float vFrz; varying float vLand; varying float vCr; varying float vGd; varying float vDrop; varying vec2 vG; varying float vBay;
#if defined(SEA_HI) && !defined(SEA_FAR)
varying vec3 vAur; varying float vAurK;
#endif
${FREEZE}`)
      .replace('#include <map_fragment>', `
  float t = uTime, dep = vDep;
  vec3 V = normalize(cameraPosition - vWP);
  vec2 P = vWP.xz;
  // walkable (wading) or closed: one clear step. (Beds come in 0.15 m steps, so at slack water whole flats sit at exactly
  // 0.45: they are closed, and the step lies a little under it; the corners' mean beds put it near the cells' edge.) A still
  // noise moves the waterline, and the step a little, inside the cells, so neither traces the grid
  float sn = shoreN(P), dw = dep + sn;
#if !defined(SEA_LOW) && !defined(SEA_FAR)
  // the waterline from the smooth bed: the corners' beds blurred over a couple of metres and read between them (vG: the
  // grid's own point, the corners' jitter taken off), so it curves across the flats' stepped beds instead of following
  // the triangles; the closed step (deep) keeps the corners' own depth, which the walk grid shares
  float depS = mix(uLevel, uBayLevel, vBay) - texture2D(tBed, (vG + 0.5) / uBedS).r;
  dw = depS + sn;
  if (depS + sn < -0.04) discard;
#endif
  float deep = smoothstep(0.37, 0.43, dep + sn * 0.4);
#ifndef SEA_LOW
  // (over a drop, the ground metres down, the water is the open sea's whatever its bed says)
  deep = max(deep, smoothstep(0.25, 0.9, vGd));
#endif
  vec4 n1 = texture2D(tNoise, P * 0.085 + vec2(t * 0.011, t * 0.007));
#ifdef SEA_HI
  vec4 n2 = texture2D(tNoise, P * 0.21 - vec2(t * 0.009, -t * 0.016));
  vec2 g = (n1.rg - 0.5) * 1.2 + (n2.rg - 0.5) * 0.8 + (n2.ab - 0.5) * 0.25;
#else
  vec4 n2 = n1.gbar;
  vec2 g = (n1.rg - 0.5) * 1.6 + (n1.ab - 0.5) * 0.3;
#endif
  // the waterline drawn in from the cells' bands by the slow ripple read, metres at a time and creeping as it drifts
  // (where the flats shelve gently, as the Landing's do in straight bands, it ran ruled along a band's edge): what it
  // uncovers is the wet sand under a hand of water, still walkable; the closed step is left where it is
  // (by the broad reads, metres across: the fine one cut the shallows into worms and lava-lamp blobs)
#ifndef SEA_LOW
  dw -= smoothstep(0.35, 0.7, n1.r * 0.6 + n1.g * 0.4) * 0.13 * (1.0 - deep);
#endif
  // two normals: the ripple's for the glints, a calmer one for what the water mirrors (the sky is far: a fine ripple
  // would scatter it into noise)
  // (and the swell's own slope in both, so open water heaves as a sheet: thin ice beside it lies still)
  vec2 swg = (cos(P.x * 0.21 + P.y * 0.13 + t * 1.1) * vec2(0.21, 0.13) + cos(-P.x * 0.09 + P.y * 0.27 + t * 0.83) * vec2(-0.09, 0.27)) * 0.5 * 0.18 * 2.5 * deep;
  vec3 N = normalize(vec3(g.x * mix(0.12, 0.3, deep) - swg.x, 1.0, g.y * mix(0.12, 0.3, deep) - swg.y));
  vec3 Nc = normalize(vec3((n1.r - 0.5) * 0.08 - swg.x, 1.0, (n1.g - 0.5) * 0.08 - swg.y));
  float NdV = clamp(dot(Nc, V), 0.0, 1.0), F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 Rf = reflect(-V, N), Rc = reflect(-V, Nc);
  // see-through grey-green where she can wade; a night teal where it is closed (never black: closed water must read as
  // water at a glance, and open water by its motion); the leads' open sea darker still
  // (the closed water a northern grey-green teal, not a tropical cyan: its sky sheen half greyed below)
  vec3 shal = vec3(0.05, 0.068, 0.07), dcol = vec3(0.011, 0.024, 0.032);
#ifdef SEA_LOW
  dcol = vec3(0.005, 0.014, 0.024);
#endif
  float amb = 0.45 + 0.55 * uAmbK;
  // (the sky the glints catch: never less than a cold glow, so the water moves even under a dark sky)
  vec3 skyG = max(uSkyC, vec3(0.012, 0.02, 0.03));
  vec3 col = mix(shal, dcol, deep) * amb;
  // the sky in it: a dull sheen even looking down (a night sea is a mirror), brighter at a grazing look; under the black
  // aurora its dark curtains blot the sheen out in moving bands
  float sheen = (0.16 + 0.6 * F) * mix(0.4, 1.0, deep);
#if defined(SEA_HI) && !defined(SEA_FAR)
  sheen *= 1.0 - 0.85 * vAurK;
  col += vec3(0.05, 0.02, 0.09) * vAurK * smoothstep(0.2, 0.5, vAurK) * (1.0 - smoothstep(0.5, 0.9, vAurK)) * 0.25 * deep;
#endif
  col += mix(uSkyC, vec3(dot(uSkyC, vec3(0.3, 0.45, 0.25))), 0.35) * sheen;
  // (under the black aurora the far water still gives back the pale haze low over the horizon: the sea reads to its edge)
  col += vec3(0.007, 0.009, 0.014) * uAurDark * F * 1.4;
#ifdef SEA_LOW
  // a lead: black water with a cold sheen; brash plates crowding its edges (a cell pattern of floating ice, dark water in
  // the gaps, bobbing), grease ice as a grey band right at the ice's edge
  col += uSkyC * (0.25 + 0.5 * smoothstep(0.4, 0.8, n1.r)) * 0.3;
  {
    vec2 bp = P * 2.3 + (n1.ba - 0.5) * 0.7 + vec2(sin(t * 0.4 + P.y * 0.3), cos(t * 0.33 + P.x * 0.3)) * 0.06;
    vec2 bv = vorT(bp);
    float edge = bv.x, cellK = bv.y;
    float near = smoothstep(0.75, 1.0, vHold + (n1.a - 0.5) * 0.4 + (cellK - 0.5) * 0.25);
    float plate = near * smoothstep(0.08, 0.16, edge - 0.2 * (1.0 - near)) * step(0.62, cellK);
    vec3 pc = vec3(0.07, 0.085, 0.1) * (0.7 + 0.6 * cellK) * amb + skyG * (0.12 + 0.12 * cellK);
    col = mix(col, pc, plate * 0.85);
    float grease = smoothstep(0.55, 1.0, vHold) * (1.0 - plate) * smoothstep(0.35, 0.7, n1.b);
    col = mix(col, vec3(0.06, 0.07, 0.08) * amb + uSkyC * 0.45, grease * 0.6);
  }
#endif
  // the long swell: its crests catch the sky; small ripples glint (the water reads by its motion)
  col += skyG * smoothstep(-0.2, 1.0, vSw) * 0.3 * deep;
  // (the glints gathered in patches a few metres across, where the ripple's broad read is high: strewn evenly they lay
  // over the water as confetti)
  // (white and the moon's colour, not the sky's cyan, soft, and gathered toward the moon's path: cyan and hard-edged they lay
  // over all the open water as paper flakes)
  {
    float gk = smoothstep(0.86, 1.0, n2.b * 0.6 + n1.a * 0.4 + (g.x + g.y) * 0.08) * smoothstep(0.42, 0.72, n1.r);
    vec3 gcol = vec3(dot(skyG, vec3(0.3, 0.45, 0.25))) * 1.6 + uMoonC * 0.05;
    col += gcol * gk * deep * (0.25 + 0.75 * pow(max(dot(Rc, uMoonD), 0.0), 3.0));
  }
  // the moon's glint, broken by the ripple, and its broad path
  col += uMoonC * (pow(max(dot(Rf, uMoonD), 0.0), 300.0) * 0.35 + pow(max(dot(Rc, uMoonD), 0.0), 14.0) * 0.03) * deep;
  // the hero's lantern: it lights the shallows and glints on the water
  vec3 hd = uHeroP - vWP; float hl = length(hd); hd /= max(hl, 0.001);
  float ha = pow(clamp(1.0 - pow(hl / uHeroR, 4.0), 0.0, 1.0), 2.0) / max(pow(hl, 1.4), 0.5);
  col += uHeroC * ha * (0.008 * (1.0 - deep) * max(hd.y, 0.0) + 0.0025 * deep + pow(max(dot(Rf, hd), 0.0), 140.0) * 0.016);
#ifdef SEA_HI
  // the aurora in the water: the reflected ray meets a sheet of sky 70 m up (not under the black aurora, where it would
  // be all but black: it comes back with the returning front)
#ifdef SEA_FAR
  vec2 sp = P + Rc.xz * ((70.0 - vWP.y) / max(Rc.y, 0.04)), spw = fwidth(sp);
  if (uAur * max(1.0 - uAurDark, uAurFront) > 0.02) col += aurora(sp, 1.0, length(spw) + 6.0) * (0.1 + 0.65 * F) * mix(0.25, 1.0, deep) * smoothstep(0.04, 0.3, Rc.y);
#else
  // (broken by the ripple into streaks drawn out toward the eye, as a reflection on moving water is)
  // (the phones too: with the ripple's own reads in its place the aurora lay on the water in mould-like blots, and a line
  // pattern read as corrugated sheet)
  vec2 vd = normalize(V.xz + vec2(0.0001, 0.0)), vp = vec2(-vd.y, vd.x);
  // (long and soft: drawn out toward the eye over metres; short, the strokes stood in rows over the water like a comb)
  float stk = texture2D(tNoise, vec2(dot(P, vp) * 0.2, dot(P, vd) * 0.012) + vec2(t * 0.004, t * 0.008) + g * 0.02).b;
  col += vAur * (0.55 + 0.9 * smoothstep(0.3, 0.8, stk)) * (0.8 + 0.4 * n1.r) * (0.1 + 0.65 * F) * mix(0.3, 1.0, deep);
#endif
  // light paths: the long broken streaks a lit sea-light lays across the water toward the eye
  // (glints off the small ripple, so the path breaks into sparks, over a faint glow off the swell; the sparks fine and
  // gathered where the ripple's broad read is high: under a tower's fire they lay round her as a field of white confetti)
  vec3 Ng = normalize(vec3((n2.a - 0.5) * 0.22 + g.x * 0.05, 1.0, (n2.b - 0.5) * 0.22 + g.y * 0.05)), Rg = reflect(-V, Ng);
  for (int i = 0; i < 2; i++) {
    vec4 Lp = uLights[i];
    if (Lp.w <= 0.0) continue;
    vec3 ld = Lp.xyz - vWP; float dl = length(ld); ld /= dl;
    // (and its fire on the water round the tower's foot, so lighting it changes the play frame: a broad warm path, its sparks,
    // and a glow on the water within a dozen metres)
    // (the sparks thinned within a dozen metres of the fire, where its pool already lights the water: there they lay round
    // her as a field of white flecks)
    float s = pow(max(dot(Rg, ld), 0.0), 220.0) * 2.0 * smoothstep(0.34, 0.64, n1.r) * (0.25 + 0.75 * smoothstep(6.0, 16.0, length(ld.xz) * dl)) + pow(max(dot(Rc, ld), 0.0), 16.0) * 0.2;
    vec2 lq = P - Lp.xz; float pool = exp(-dot(lq, lq) * 0.012) * (0.6 + 0.4 * n1.g);
    col += vec3(1.0, 0.72, 0.42) * (s * deep / (1.0 + dl * 0.04) + pool * 0.05 * mix(0.6, 1.0, deep)) * Lp.w;
  }
#endif
  float plateK = 0.0;
#ifndef SEA_LOW
  // shore ice: brash plates crowding the water's edge wherever it meets the land, at any tide (their outer edge ragged,
  // plate by plate, so a shore that runs straight along the cells reads as a frayed band of floating ice, not a rule);
  // the distance to the waterline taken from the depth's slope, near it
  {
    // (only off a steep shore, rock, an islet, a drop: on the flats' gentle shelving the plates strewed the whole wading
    // water like confetti)
    float sl0 = fwidth(dep) / max(length(fwidth(P)), 1e-4), sd0 = dw / max(sl0, 0.12);
    if (sd0 < 1.6 && dw > 0.0 && sl0 > 0.4) {
      vec2 bp = P * 2.6 + (n1.ba - 0.5) * 0.6 + vec2(sin(t * 0.35 + P.y * 0.3), cos(t * 0.29 + P.x * 0.3)) * 0.04 + 5.3;
      vec2 bv = vorT(bp);
      float cellK = bv.y, bedge = bv.x;
      float near = (1.0 - smoothstep(0.25, 1.0, sd0 + (cellK - 0.5) * 0.9 + (n1.a - 0.5) * 0.5)) * smoothstep(0.4, 0.8, sl0);
      plateK = near * smoothstep(0.05, 0.12, bedge) * step(0.6, cellK) * (0.35 + 0.45 * cellK) * (1.0 - smoothstep(0.3, 1.2, vGd));
      // (grey slush plates, half sunk, near the water's own tone: white, they read as broken tiles; over a drop, as grey
      // blobs in a black strip)
      vec3 pc = mix(col, vec3(0.08, 0.095, 0.105) * amb + uSkyC * 0.3, 0.6 + 0.2 * cellK);
      col = mix(col, pc, plateK * 0.8);
    }
  }
#endif
  // foam: where it meets the shore, lapping in moving lines; churned in the Walking Tower's wake
  // (a soft band a hand to a few hands deep, the half metre or so in from the waterline on the flats, broken into lengths that
  // come and go as the water laps: the lines of a lapping sine and a foam isoline drew the tide as a map's contours)
  float lapK = 0.75 + 0.25 * sin(t * 0.9 + n1.r * 6.0 + P.x * 0.13);
  float foam = smoothstep(0.0, 0.025, dw) * (1.0 - smoothstep(0.025 * lapK, 0.075 * lapK, dw)) * smoothstep(0.5, 0.78, n1.r * 0.5 + n1.g * 0.3 + n2.b * 0.2 + sin(t * 0.5 + P.x * 0.23 - P.y * 0.17) * 0.12) * 0.5;
  // (and a few sparkles on the shallows, here and gone)
  // (each a round point of two or three pixels at a hashed spot in its cell: the cell's own square, 14 cm, read as pale
  // squares strewn over the flats)
  {
    vec2 sc = P * 7.0, ci = floor(sc);
    float tt = floor(t * 2.0 + n1.g * 3.0);
    if (sH(ci + tt) > 0.993) {
      float px = max(length(fwidth(P)), 0.002), d = length(sc - ci - 0.2 - sH2(ci + tt + 3.1) * 0.6) / 7.0;
      col += vec3(0.75, 0.82, 0.9) * dot(skyG, vec3(0.33)) * 9.0 * (1.0 - smoothstep(px * 0.6, px * 1.6, d)) * (1.0 - deep) * smoothstep(0.02, 0.1, dw);
    }
  }
#ifndef SEA_LOW
  // and wherever it meets a steep shore at any depth (a rock, an islet, the bay's rim, the cliff's foot): a broken line of
  // foam riding the swell (vLand: the share of land at the corners, 0.5 along the shore's edge)
  // (a thin lacy line hugging the edge, its froth a fine web, riding the swell: a band of noise blotches a cell wide read as
  // a cow-print frill along every shore and the ice's lip)
  {
    float lace = smoothstep(0.27, 0.37, vLand + (n2.b - 0.5) * 0.07 + sn * 0.25 + vSw * 0.03) * smoothstep(0.38, 0.62, n1.g * 0.5 + n2.a * 0.5);
    float web = 1.0 - smoothstep(0.0, 0.1, vorT(P * 4.3 + (n1.ba - 0.5) * 0.8 + vec2(t * 0.03, -t * 0.02)).x);
    foam = max(foam, lace * (0.45 + 0.55 * web) * 0.55);
  }
  if (uWake.w > 0.0) {
    vec2 d = P - uWake.xy; float ca = cos(uWake.z), sa = sin(uWake.z);
    float back = -(d.x * sa + d.y * ca), side = d.x * ca - d.y * sa;
    float arm = abs(abs(side) - max(back, 0.0) * 0.36);
    float kel = (1.0 - smoothstep(0.0, 1.1, arm)) * (1.0 - smoothstep(6.0, 28.0, back)) * smoothstep(-1.5, 1.5, back);
    float trail = (1.0 - smoothstep(0.6, 3.0, abs(side))) * (1.0 - smoothstep(2.0, 20.0, back)) * step(0.0, back);
    float bow = 1.0 - smoothstep(2.8, 5.0, length(d));
    foam = max(foam, max(max(kel, trail * 0.85), bow * 0.8) * uWake.w * smoothstep(0.3, 0.6, n1.a + n1.r * 0.4));
  }
#endif
  col = mix(col, vec3(0.5, 0.56, 0.58) * uAmbK + uSkyC * 0.3, clamp(foam, 0.0, 1.0) * 0.8);
  // the faint pale line along the edge of closed water (on the flats: where the bed drops away steeply, off a jetty or a
  // rock, the shore itself shows where the water closes, and a line there would only trace the cells' steps)
  float fw = fwidth(dep) * 1.5 + 0.004, slope = fwidth(dep) / max(length(fwidth(P)), 1e-4);
  // (broken into lengths: whole, it ruled the Landing's long straight step)
  // (and not where the step lies at the shore itself, the high flats against the low: there the shore shows it, and the
  // line along it read as a dashed map border; in long lengths, not dashes)
  float edge = (1.0 - smoothstep(fw * 0.5, fw * 1.6, abs(dep + sn * 0.4 - 0.4))) * (0.75 + 0.25 * sin(t * 1.7 + P.x * 0.7 + P.y * 0.5)) * (1.0 - smoothstep(0.35, 0.8, slope)) * smoothstep(0.35, 0.6, n1.g + (n1.r - 0.5) * 0.4);
  col = mix(col, vec3(0.5, 0.62, 0.68) * uAmbK, edge * 0.45);
  float a = mix(mix(0.32, 0.62, smoothstep(0.0, 0.42, dw)), 0.95, deep);
  // (where the bed drops away steeply, off a rock, an islet or the bay's rim, the water is closed right up to the shore:
  // no see-through strip over the drop's dark face to trace the cells' steps; and wherever the ground under it lies a
  // fifth of a metre down or more)
  a = max(a, max(max(smoothstep(1.0, 2.2, slope), smoothstep(0.12, 0.5, vGd)), smoothstep(0.5, 0.9, vDrop)) * 0.95);
  // (its edge soft over a hand of depth, and none where it is a film: at a level that stood at a flat's bed exactly the
  // water drew contour rings)
  float depW = dep;
#if !defined(SEA_LOW) && !defined(SEA_FAR)
  depW = depS;
#endif
  float film = smoothstep(0.0, 0.025, depW + 0.03 * smoothstep(0.1, 0.5, vGd));
  a = max(a, edge * 0.5) * smoothstep(0.0, 0.06, dw) * film;
  // (the foam and the plates too only where there is water: on a flat at the level they ringed the dry sand)
  a = max(a, max(foam * 0.7, plateK * 0.95) * film);
#ifndef SEA_FAR
  // frozen: white rime in a frost-crystal pattern; the front glitters as it races out
  vec3 frz = freezeIf(P, vLead, vShore);
  frz.y = max(frz.y, vFrz);
  float fk = max(frz.x, frz.y);
  if (fk > 0.001 || frz.z > 0.001) {
    // (new ice, dark and glassy, clearer than the old snowed ice: here and there a white bloom of frost feathers on it, soft
    // edged, sparkling; the sky's sheen on it)
    vec4 nf = texture2D(tNoise, P * 0.083 + 0.5);
    vec4 nc = texture2D(tNoise, P * 0.37 + 0.21);
    // (sparse and soft-edged: at a lower threshold they spotted the whole sealed hole like a hide)
    float bloom = smoothstep(0.68, 0.92, nf.b + (nf.r - 0.5) * 0.35) * (0.4 + 0.45 * nc.g);
    // (the feathers a soft fleck, not the noise's isoline: that drew white worms all over the new ice)
    float cry = bloom * (0.6 + 0.4 * step(0.93, sH(floor(P * 9.0)))) + smoothstep(0.68, 0.9, nc.a) * bloom * 0.4;
    vec3 rime = vec3(0.04, 0.062, 0.082) * (0.85 + 0.3 * nf.g);
    rime = (rime + vec3(0.24, 0.27, 0.3) * cry) * amb + uSkyC * (0.3 + 0.5 * F);
    // (the crests the Freeze caught stand white with rime, lit on the faces turned to the moon; their troughs dark glass)
    vec3 fn = normalize(cross(dFdx(vWP), dFdy(vWP))); fn *= sign(fn.y + 1e-4);
    rime = mix(rime, vec3(0.5, 0.55, 0.6) * amb + uSkyC * 0.4, smoothstep(0.12, 0.42, vCr) * frz.x);
    rime *= mix(1.0, 0.7 + 0.6 * max(dot(fn, normalize(vec3(-0.35, 0.8, 0.5))), 0.0), smoothstep(0.02, 0.15, vCr + vSw * 0.02) * frz.x);
    col = mix(col, rime, fk); a = mix(a, 1.0, fk);
    // the front, racing out: a band of glittering white as the water turns
    float gl = step(0.9, sH(floor(P * 5.0) + floor(t * 6.0)));
    col += vec3(0.5, 0.7, 0.85) * frz.z * (0.45 + cry + gl * 1.5); a = max(a, frz.z * 0.85);
  }
  // ahead of the Freeze the crests break white
  col = mix(col, vec3(0.55, 0.6, 0.62) * amb + uSkyC * 0.3, smoothstep(0.22, 0.45, vCr) * (1.0 - fk) * 0.75);
#endif
  diffuseColor = vec4(col, a);`);
  };
  m.customProgramCacheKey = () => 'sea|' + key;
  SEA_MATS.set(key, m);
  return m;
}

// per-vertex fields for the water (and the ground's G_WET): w+1 x h+1 corners, each from its four cells
const CORNER = [[-1, -1], [0, -1], [-1, 0], [0, 0]];
// the bed at every corner: L.vbed (gen5), or the mean of its cells' beds (open sea beyond the map's edge)
export function cornerBeds(L) {
  if (L.vbed) return L.vbed;
  const { w, h } = L, W = w + 1, out = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let s = 0;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; s += x < 0 || z < 0 || x >= w || z >= h ? -0.6 : L.bed ? L.bed[z * w + x] : -0.6; }
    out[vz * W + vx] = s / 4;
  }
  return out;
}
// a tidal flat the hero walks on (no ice, deck or window, never the always-open water): the bay's sand, the wading flats
export const flatCell = (L, i) => !!(L.bed && L.cells[i] && !L.low?.[i] && !L.sea?.[i] && L.bed[i] > -0.45 && L.bed[i] < BED_DRY && !L.thick?.[i] && !L.window?.[i] && !L.deck?.[i] && !L.ice?.[i]);
// the bed at a corner where thin ice meets tidal flats and nothing else: the flats' (null elsewhere). With the ice's deep
// bed averaged in, the water stood a hand over the sand along the ice's edge and the ice frayed back off it: a dark plank
// ruled along the cells' line (Skerry Bay's ice against its sand, the Graveyard's ice against its shore)
export function iceFlatBed(L, vx, vz) {
  if (!L.bed || !L.ice) return null;
  let s = 0, nf = 0, ni = 0;
  for (const [dx, dz] of CORNER) {
    const x = vx + dx, z = vz + dz; if (x < 0 || z < 0 || x >= L.w || z >= L.h) return null;
    const i = z * L.w + x;
    if (L.ice[i]) ni++; else if (flatCell(L, i)) { s += L.bed[i]; nf++; } else return null;
  }
  return ni && nf ? s / nf : null;
}
// Skerry Bay's share of each corner's cells (0-1, (w+1)(h+1); null off the coast): the water and the ground over the bay
// read uBayLevel instead of uLevel (cached on L)
export function bayCorners(L) {
  if (L.type !== 'coast' || !L.boss) return null;
  if (L.bay5) return L.bay5;
  const { w, h } = L, W = w + 1, out = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let n = 0;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; if (x >= 0 && z >= 0 && x < w && z < h && inBay(L, x, z)) n++; }
    out[vz * W + vx] = n / 4;
  }
  return (L.bay5 = out);
}
// The edges between what the ground draws differently (the floor, the water's pit, a tidal flat, the rock, the low flats
// against the high) moved off the cells' grid: a corner where one cell of four is the odd one goes toward it, and one
// where three are goes toward the fourth (a convex step is cut, a notch filled: a staircase of cells becomes a slope); a
// corner on a straight run is pushed along the edge's normal by a slow noise, so the run wanders (no more than a narrow
// strip, the Fall's path, can take). The ground, the water and the ice take the same offset and stay matched. Not a corner
// of an ice window or the jetty (their props keep the grid), nor the map's rim. Offsets (x, z) per corner, (w+1)(h+1)
const CC = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
export function shoreJit(L) {
  if (!L.hgt || !L.ice) return null;
  if (L.jit5) return L.jit5;
  const { w, h } = L, W = w + 1, out = new Float32Array(W * (h + 1) * 2), H = L.hgt, seed = L.seed || 1;
  // a cell's class: 0 floor (dry land, thick ice, a footprint), 1 a high tidal flat, 5 a low one, 2 the pit (open water,
  // a hole), 6 thin ice (a pit too, against the land; against open water its own edge), 3 rock; 4 a window or the jetty
  // (its corners stay)
  const cls = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const x = i % w, z = (i - x) / w, k = z * W + x;
    const lo = Math.min(H[k], H[k + 1], H[k + W], H[k + W + 1]), hi = Math.max(H[k], H[k + 1], H[k + W], H[k + W + 1]);
    cls[i] = L.window[i] || L.deck?.[i] ? 4 : L.ice[i] ? 6 : L.low[i] || L.sea?.[i] || (!L.cells[i] && lo < -0.5) ? 2 : !L.cells[i] && hi > 0.25 ? 3
      : L.bed && L.bed[i] < BED_DRY && L.cells[i] && !L.thick[i] ? (L.bed[i] < 0.42 ? 5 : 1) : 0;
  }
  const C = (x, z) => cls[clamp(z, 0, h - 1) * w + clamp(x, 0, w - 1)];
  // (thin ice against open water moves too: as one pit they kept the cells' ruled lines and right angles, frilled only)
  const preds = [(c) => c === 2 || c === 6, (c) => c === 3, (c) => c === 1 || c === 5, (c) => c === 5, (c) => c === 6];
  const edgeC = new Uint8Array(W * (h + 1)), runs = [];
  for (let vz = 2; vz < h - 1; vz++) for (let vx = 2; vx < w - 1; vx++) {
    const c = CORNER.map(([dx, dz]) => C(vx + dx, vz + dz));
    const k0 = vz * W + vx;
    if (c.some((q) => q !== c[0])) edgeC[k0] = 1;
    if (c.includes(4)) continue;
    const f = preds.find((g) => { const n = c.filter(g).length; return n && n < 4; });
    if (!f) continue;
    // (a slow noise and a quicker one: the slow alone leaves a long run ruled straight, only tilted)
    const t = c.map(f), n = t.filter(Boolean).length;
    const nx = fbm(vx * 0.19, vz * 0.19, seed + 71, 2) - 0.5 + (fbm(vx * 0.53 + 5, vz * 0.53, seed + 75, 2) - 0.5) * 0.9;
    const nz = fbm(vx * 0.19 + 17, vz * 0.19 - 9, seed + 73, 2) - 0.5 + (fbm(vx * 0.53 - 11, vz * 0.53 + 3, seed + 77, 2) - 0.5) * 0.9;
    let ox = 0, oz = 0;
    if (n === 1 || n === 3) { const j = t.indexOf(n === 1); ox = CC[j][0] * 0.7 + nx * 0.2; oz = CC[j][1] * 0.7 + nz * 0.2; }
    else if (t[0] === t[1]) oz = nz * 0.75;          // (a run along x: the edge's normal is z)
    else if (t[0] === t[2]) ox = nx * 0.75;          // (a run along z)
    out[k0 * 2] = clamp(ox, -0.4, 0.4); out[k0 * 2 + 1] = clamp(oz, -0.4, 0.4);
    // (a straight run of the tide's own shore, flats against the land or low flats against high, both walkable: listed to
    // wander further, below)
    // (and thin ice against a tidal flat, both walkable: the bay's ice ran ruled across the Walking Tower's arena)
    // (and thin ice against any ground she can stand on, thick ice or dry land: the Ice Road's edge ran ruled down the road)
    const thinRun = f === preds[0] && CORNER.every(([dx, dz], j) => { const i = clamp(vz + dz, 0, h - 1) * w + clamp(vx + dx, 0, w - 1); return t[j] ? !!L.ice[i] : flatCell(L, i) || (!!L.cells[i] && cls[i] === 0); });
    // (a pit's own straight edge, an islet's or a shelf's over the water, and the rock's foot wander too, but no further
    // than a lone corner may: there the cells' line is where she can stand. Each corner on its own, such a run stayed
    // ruled, only roughened: a rock rib's snowed face ran across the Landing as one straight slab)
    if (n === 2 && (t[0] === t[1] || t[0] === t[2])) {
      const ax = t[0] === t[1] ? 1 : 0, sl = fbm(vx * 0.09 + 3, vz * 0.09 - 5, seed + 79, 2) - 0.5, qk = ax ? nz : nx;
      // (those held to 0.4 m wander on the quicker read: the slow one, held, only shifted a short islet's edge, still ruled)
      const held = (f === preds[0] && !thinRun) || f === preds[1];
      // (the quick read leads: led by the slow one, a run of ten metres sat at its cap all along, shifted but as ruled)
      runs.push([k0, ax, held ? sl * 1.2 + qk * 1.3 : sl * 1.3 + qk * 2.0, f === preds[3] || f === preds[4] ? 0.55 : held ? 0.4 : 0.8]);
    }
  }
  // the tide's long straight shores (the Landing's bands, the flats against the strand) wander up to 0.8 m off the cells'
  // line (0.55 where the low flats meet the high: the step to closed water at high tide), the corners a cell either side
  // moving half as far with them so nothing folds: within the 0.4 m a lone corner can take, a 20 m run still read as
  // ruled. (Not where the strip is narrow, nor at the pits' and the rock's edges: there the cells' line is where she can
  // stand)
  for (const [k0, ax, a, cap] of runs) {
    const st = ax ? W : 1;
    if (edgeC[k0 - st] || edgeC[k0 + st]) continue;
    const A = cap * Math.tanh(a / cap);
    out[k0 * 2 + ax] = A; out[(k0 - st) * 2 + ax] += A * 0.5; out[(k0 + st) * 2 + ax] += A * 0.5;
  }
  return (L.jit5 = out);
}
const CH = 32;
// (the see-through sea draws before every other see-through thing: three sorts those by renderOrder before depth, so at
// any order above theirs it would be laid over every halo, glow, flame, splash ring and loot beam that stands in front of
// water, its depth test passing where it lies behind them. The opaque leads and ice sort apart, so -1 and -0.5 still
// hold; the ice windows (1), blob shadows (1.5), pools, rings and decals (2) and telegraphs (3) draw after it)
const SEA_RO = -0.6;
// The sea as chunked per-cell quads (32 x 32 cells, culled): every coast cell with bed < BED_DRY that is no thick ice or
// window, and every thin-ice and L.sea cell (the water a broken cell shows); attributes per corner, so the swell and the
// lift never crack the surface. Returns a Group (userData.mat, userData.L).
export function buildSea(L, group, quality = R.quality) {
  const { w, h } = L, W = w + 1, N = w * h;
  const low = !L.bed;
  const vb = cornerBeds(L);
  // (a blocked footprint standing in the water, a hull or a boulder, keeps the water round and under it: gen5 takes the
  // corners' beds before the footprints)
  const under = (i) => { if (!L.bed || L.cells[i] || L.low?.[i]) return false; const x = i % w, z = (i - x) / w; return vb[z * W + x] < BED_DRY - 1 && vb[z * W + x + 1] < BED_DRY - 1 && vb[(z + 1) * W + x] < BED_DRY - 1 && vb[(z + 1) * W + x + 1] < BED_DRY - 1; };
  // (a lead sealed before this build, thick ice over the sea's bed, keeps its water, held frozen: aFrz)
  // (not the rim of an ice window, whose pit drops the corners on its edge as well)
  const winC = (vx, vz) => [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dx, dz]) => { const x = vx + dx, z = vz + dz; return x >= 0 && z >= 0 && x < w && z < h && !!L.window?.[z * w + x]; });
  const sealed = (i) => { if (!L.thick?.[i] || !L.cells[i] || !L.hgt) return false; const x = i % w, z = (i - x) / w; for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (L.hgt[(z + dz) * W + x + dx] < -0.5 && !winC(x + dx, z + dz)) return true; return false; };
  const wet = (i) => !!(L.sea?.[i] || L.ice?.[i] || (L.bed && L.bed[i] < BED_DRY && !L.thick?.[i] && !L.window?.[i]) || under(i) || sealed(i));
  // (the Farthest Light: the water runs on under a band of the floor round the open water, which the ground frays away:
  // build.js G_EDGE)
  const level = (x, z) => { for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (Math.abs(L.hgt?.[(z + dz) * W + x + dx] ?? 0) > 0.05) return false; return true; };
  const band = (i) => {
    if (!low || L.sea?.[i] || L.ice?.[i] || L.window?.[i] || sealed(i)) return false;
    const x = i % w, z = (i - x) / w;
    if (!level(x, z)) return false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (nx >= 0 && nz >= 0 && nx < w && nz < h && (L.sea?.[nz * w + nx] || sealed(nz * w + nx))) return true; }
    return false;
  };
  const iceLike = (i) => !!(L.ice?.[i] || L.thick?.[i] || L.window?.[i] || L.deck?.[i]);
  const flat = (i) => L.bed && L.bed[i] > -0.5 && L.bed[i] < BED_DRY && !iceLike(i);
  // which lead each cell belongs to (the Breathing-holes: a freeze slot only freezes its own lead)
  const lead = new Uint8Array(N);
  for (const ho of L.spots?.holes || []) {
    const k = (ho.id ?? 0) + 1;
    for (const c of ho.lead || []) lead[c[1] * w + c[0]] = k;
    const r = (ho.r || 4.5) + 1;
    for (let z = Math.floor(ho.z - r); z <= ho.z + r; z++) for (let x = Math.floor(ho.x - r); x <= ho.x + r; x++) if (x >= 0 && z >= 0 && x < w && z < h && Math.hypot(x + 0.5 - ho.x, z + 0.5 - ho.z) <= r) lead[z * w + x] = k;
  }
  // how far each water cell lies from land (cells): the Freeze grows out from the shore
  const D = new Float32Array(N).fill(99), q = [];
  for (let i = 0; i < N; i++) if (!wet(i) || (L.thick?.[i] && !sealed(i))) { D[i] = 0; q.push(i); }
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], cx = i % w, cz = (i - cx) / w;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && D[n] > D[i] + 1) { D[n] = D[i] + 1; q.push(n); } }
  }
  const mat = seaMat({ low }), J = shoreJit(L), BY = bayCorners(L);
  // (the water's bed at a corner of level land: a hand over its wettest cell's, not the land's own averaged in. With the
  // land's (BED_DRY) in the mean the surface sank under the ground most of a cell out from the shore, so the water's edge
  // ran along the next row of corners, the cells' line a metre off the land, a pale strip of nothing between)
  // (a rock cell whose corner the sea's bed has pulled under the water, gen5 heights: the water lies over it too, flat at
  // the sea's level, the rock standing out of it; without it the sunk rock showed as black pits with lit rims all along
  // the coast's rock, the bay's north rim most of all)
  const rockSea = (i) => { if (!L.bed || !L.hgt || L.cells[i] || L.low?.[i] || L.sea?.[i] || iceLike(i) || L.bed[i] < BED_DRY) return false; const x = i % w, z = (i - x) / w; return [0, 1, W, W + 1].some((d) => L.hgt[z * W + x + d] < -0.2); };
  const shoreBed = (vx, vz, key) => {
    // (a corner the ground drops under the water at: the sea's own bed there, not the rock's or the land's averaged in)
    if (L.bed && (L.hgt?.[key] ?? 0) < -0.2) {
      let m = 99, dry = false;
      for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; if (x < 0 || z < 0 || x >= w || z >= h) continue; const i = z * w + x; if (L.bed[i] < BED_DRY && !iceLike(i)) m = Math.min(m, L.bed[i]); else if (!iceLike(i)) dry = true; }
      if (dry) return m < 99 ? Math.min(m, -0.6) : -0.6;
    }
    if (!L.bed || vb[key] < 2 || Math.abs(L.hgt?.[key] ?? 0) > 0.3) return vb[key];
    // (and level land against closed water, a drop: the water meets it there too, a little under its edge; with the land's
    // bed in, it stopped a hand off the drop and the drop's face showed as a black strip along the Strand)
    let m = -99;
    for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; if (x >= 0 && z >= 0 && x < w && z < h && L.bed[z * w + x] < BED_DRY && !iceLike(z * w + x)) m = Math.max(m, L.bed[z * w + x] + (L.cells[z * w + x] ? 0.3 : 0.45)); }
    return m > -99 ? m : vb[key];
  };
  // the beds smoothed for the waterline (tBed): every corner's bed as the water takes it, held to -0.6..1.6 (land and the
  // open sea alike past what any tide reaches), blurred twice over its neighbours and read between them per pixel
  let bedS = null;
  if (!low) {
    const H1 = h + 1, raw = new Float32Array(W * H1);
    for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) { const key = vz * W + vx; raw[key] = clamp(iceFlatBed(L, vx, vz) ?? shoreBed(vx, vz, key), -0.6, 1.6); }
    bedS = raw;
    for (let pass = 0; pass < 2; pass++) {
      const a = new Float32Array(W * H1), b = new Float32Array(W * H1);
      for (let vz = 0; vz < H1; vz++) for (let vx = 0; vx < W; vx++) { const k = vz * W + vx; a[k] = (bedS[vz * W + Math.max(0, vx - 1)] + 2 * bedS[k] + bedS[vz * W + Math.min(w, vx + 1)]) / 4; }
      for (let vz = 0; vz < H1; vz++) for (let vx = 0; vx < W; vx++) { const k = vz * W + vx; b[k] = (a[Math.max(0, vz - 1) * W + vx] + 2 * a[k] + a[Math.min(h, vz + 1) * W + vx]) / 4; }
      bedS = b;
    }
    // (the smoothed bed never above the corner's own where that is wet: the water a corner holds stays drawn)
    for (let k = 0; k < bedS.length; k++) if (raw[k] < bedS[k] && raw[k] < 1.2) bedS[k] = Math.min(bedS[k], raw[k] + 0.08);
    const hd = new Uint16Array(W * H1);
    for (let k = 0; k < hd.length; k++) hd[k] = THREE.DataUtils.toHalfFloat(bedS[k]);
    const t = new THREE.DataTexture(hd, W, H1, THREE.RedFormat, THREE.HalfFloatType);
    t.magFilter = t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.needsUpdate = true;
    L.bedTex5 = t;
  }
  const out = new THREE.Group(); out.name = 'sea';
  // (the open water's cells, for the Freeze's spray: sprayTick)
  const open = [];
  if (!low) for (let i = 0; i < N; i += 3) if (wet(i) && !iceLike(i) && !L.ice[i] && L.bed[i] < 0.2) open.push(i % w + 0.5, Math.floor(i / w) + 0.5);
  L.open5 = Float32Array.from(open);
  const hook = () => { SEA.uMap.value.set(w, h); SEA.seaL = L; if (L.bedTex5) { SEA.tBed.value = L.bedTex5; SEA.uBedS.value.set(W, h + 1); } };
  for (let cz0 = 0; cz0 < h; cz0 += CH) for (let cx0 = 0; cx0 < w; cx0 += CH) {
    const vid = new Map(), pos = [], bed = [], hold = [], ld = [], sh = [], fr = [], by = [], lnd = [], gd = [], dp = [], gg = [], idx = [];
    const vert = (vx, vz) => {
      const key = vz * W + vx;
      let k = vid.get(key);
      if (k != null) return k;
      k = pos.length / 3; vid.set(key, k);
      let ice = 0, fl = 0, le = 0, sd = 99, sl = 0, wt = 0, dk = 0, la = 0;
      for (const [dx, dz] of CORNER) {
        const x = vx + dx, z = vz + dz; if (x < 0 || z < 0 || x >= w || z >= h) continue;
        const i = z * w + x; if (iceLike(i)) ice++; if (L.deck?.[i]) dk++; if (flat(i)) fl++; if (lead[i]) le = lead[i]; if (wet(i)) { sd = Math.min(sd, D[i]); wt++; if (sealed(i)) sl++; }
        // (land a steep shore drops from: dry ground or rock, not ice, a deck or a tidal flat)
        else if (!iceLike(i) && !(L.bed && L.bed[i] < BED_DRY)) la += 0.25;
        // (and the ice's lip: the open water breaks against it in foam, so the two read apart at a glance)
        if (L.ice?.[i] || L.thick?.[i]) la += 0.12;
      }
      // (held: under and beside the ice with no tidal flat, and always under the jetty, whose deck lies flush with the floor:
      // the flood would cover its planks)
      const ib = iceFlatBed(L, vx, vz);
      pos.push(vx + (J ? J[key * 2] : 0), 0, vz + (J ? J[key * 2 + 1] : 0)); bed.push(ib ?? shoreBed(vx, vz, key)); hold.push((ice && !fl) || dk ? 1 : 0); ld.push(le); sh.push(sd === 99 ? 0 : sd); fr.push(sl ? 1 : 0); by.push(BY ? BY[key] : 0); lnd.push(la);
      // (how far the ground lies under the surface here: over a drop the water is closed right up to the land)
      gd.push(L.bed && L.hgt ? clamp(-L.hgt[key], 0, 3) : 0);
      // (and a corner over a drop or at its lip, dry land's or the rock's (not a wading flat's): the water is closed there
      // all the way to the land. Read between the corners, the drop's own depth left the first third of each cell see-
      // through, and the drop face showed under it as black shards cut by the jittered corners: an islet's seaward side)
      let drop = 0;
      if (L.bed && L.hgt) {
        if (L.hgt[key] < -0.2) drop = 1;
        else if (!fl && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dz]) => { const x = vx + dx, z = vz + dz; return x >= 0 && z >= 0 && x <= w && z <= h && L.hgt[z * W + x] < -0.2; })) drop = 1;
      }
      dp.push(drop); gg.push(vx, vz);
      return k;
    };
    const quads = [];
    for (let z = cz0; z < Math.min(h, cz0 + CH); z++) for (let x = cx0; x < Math.min(w, cx0 + CH); x++) {
      const rs = !wet(z * w + x) && rockSea(z * w + x);
      if (!wet(z * w + x) && !band(z * w + x) && !rs) continue;
      // (split as the ground's grid is: (x, z + 1) to (x + 1, z))
      const a = vert(x, z), b = vert(x + 1, z), c = vert(x, z + 1), d = vert(x + 1, z + 1);
      // (each quad keyed by the lowest bed among its corners, the level that first wets it; held, frozen or the bay's
      // corners always drawn)
      let kq = rs ? -Infinity : Infinity;
      for (const k of [a, b, c, d]) { if (hold[k] || fr[k] || by[k] > 0) { kq = -Infinity; break; } kq = Math.min(kq, bed[k], bedS ? bedS[gg[k * 2 + 1] * W + gg[k * 2]] : 99); }
      quads.push(kq, a, c, b, c, d, b);
    }
    if (!quads.length) continue;
    // (the quads in the order the tide wets them: at low water the draw stops short of those whose every corner lies dry
    // under the ground, never seen and all the same shaded, the sea's whole cost on the Shallows' flats: perf5's coastLow)
    const ord = [];
    for (let q = 0; q < quads.length; q += 7) ord.push(q);
    if (!low) ord.sort((p, q) => (quads[p] === quads[q] ? 0 : quads[p] < quads[q] ? -1 : 1));
    const keys = new Float32Array(ord.length);
    ord.forEach((q, n) => { keys[n] = quads[q]; for (let j = 1; j < 7; j++) idx.push(quads[q + j]); });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
    geo.setAttribute('aHold', new THREE.Float32BufferAttribute(hold, 1));
    geo.setAttribute('aLead', new THREE.Float32BufferAttribute(ld, 1));
    geo.setAttribute('aShore', new THREE.Float32BufferAttribute(sh, 1));
    geo.setAttribute('aFrz', new THREE.Float32BufferAttribute(fr, 1));
    geo.setAttribute('aBay', new THREE.Float32BufferAttribute(by, 1));
    geo.setAttribute('aLand', new THREE.Float32BufferAttribute(lnd, 1));
    geo.setAttribute('aGd', new THREE.Float32BufferAttribute(gd, 1));
    geo.setAttribute('aDrop', new THREE.Float32BufferAttribute(dp, 1));
    geo.setAttribute('aG', new THREE.Float32BufferAttribute(gg, 2));
    geo.setIndex(idx);
    geo.computeBoundingBox(); geo.boundingBox.min.y = -0.2; geo.boundingBox.max.y = 0.6; geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = low ? -0.5 : SEA_RO; m.receiveShadow = false; m.castShadow = false;
    // (dry under the ground: the water's surface stands at -0.05 from 0.05 below its bed, so a quad whose every corner's
    // bed lies 0.08 over the level is never seen. Not while a freeze slot may raise water to the ice's height)
    m.onBeforeRender = low ? hook : () => {
      hook();
      if (SEA.uFrzOn.value > 0.5) { geo.setDrawRange(0, Infinity); return; }
      const lv = SEA.uLevel.value + 0.08;
      let lo = 0, hi = keys.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (keys[mid] < lv) lo = mid + 1; else hi = mid; }
      geo.setDrawRange(0, lo * 6);
    };
    out.add(m);
  }
  out.userData = { mat, L, kind: 'sea' };
  group.add(out);
  return out;
}
// The sea past the map's north and east edges, out into the fog (the townBeyond pattern), always deep (aBed -4); o.ice:
// true (the coast after the Freeze) the ice material all round; 'pack' (the Farthest Light) ice to the east and west and
// the open sea to the north, beyond the ice edge
export function seaBeyond(L, group, o = {}) {
  const { w, h } = L, F = 160, g = new THREE.Group(); g.name = 'seaBeyond';
  const quad = (list, x0, z0, x1, z1) => list.push([x0, z0, x1, z1]);
  const water = [], ice = [];
  const farl = o.ice === 'pack';
  quad(farl || !o.ice ? water : ice, -F, -F, w + F, 0);
  quad(o.ice ? ice : water, w, 0, w + F, h + F * 0.5);
  if (farl) quad(ice, -F, 0, 0, h + F * 0.5);
  const make = (list, y) => {
    const pos = [], bed = [], z0s = [];
    const tri = (a, b, c) => { if ((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) < 0) [b, c] = [c, b]; pos.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]); for (let k = 0; k < 3; k++) { bed.push(-4); z0s.push(0); } };
    // (the side that meets the map's own water takes a vertex every metre, as that water has, fanned to the far corners:
    // with a 20 m edge there the swell opened a crack all along the seam, dark dashes across the sea)
    const ints = (a, b) => { const p = [a]; for (let v = Math.floor(a) + 1; v < b; v++) p.push(v); p.push(b); return p; };
    const fan = (near, A, B) => { const m = near.length - 1, mid = m >> 1; for (let k = 0; k < m; k++) tri(near[k], near[k + 1], k < mid ? A : B); tri(near[mid], B, A); };
    // (subdivided every 20 m: the swell and the fog want vertices, and a huge triangle loses precision on phones)
    for (const [x0, z0, x1, z1] of list) {
      const nx = Math.ceil((x1 - x0) / 20), nz = Math.ceil((z1 - z0) / 20);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const ax = x0 + ((x1 - x0) * i) / nx, bx = x0 + ((x1 - x0) * (i + 1)) / nx, az = z0 + ((z1 - z0) * j) / nz, bz = z0 + ((z1 - z0) * (j + 1)) / nz;
        if (bz === 0 && bx > 0 && ax < w) fan(ints(ax, bx).map((x) => [x, 0]), [ax, az], [bx, az]);
        else if (ax === w && bz > 0 && az < h) fan(ints(az, bz).map((z) => [w, z]), [bx, az], [bx, bz]);
        else if (bx === 0 && bz > 0 && az < h) fan(ints(az, bz).map((z) => [0, z]), [ax, az], [ax, bz]);
        else { tri([ax, az], [ax, bz], [bx, az]); tri([ax, bz], [bx, bz], [bx, az]); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
    for (const a of ['aHold', 'aLead', 'aShore', 'aFrz', 'aBay', 'aLand', 'aGd', 'aDrop']) geo.setAttribute(a, new THREE.Float32BufferAttribute(z0s, 1));
    geo.setAttribute('aG', new THREE.Float32BufferAttribute(new Float32Array(z0s.length * 2), 2));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    return geo;
  };
  if (water.length) { const m = new THREE.Mesh(make(water, 0), seaMat({ low: !L.bed, far: true })); m.renderOrder = L.bed ? SEA_RO : -0.5; g.add(m); }
  if (ice.length) { const m = new THREE.Mesh(make(ice, ICE_Y - 0.01), iceMat({ far: true })); m.renderOrder = -1; m.receiveShadow = R.quality >= 2; g.add(m); }
  group.add(g);
  return g;
}
// the light the water reads (once a frame, from R.skyHook)
let hookT = -1;
function frameHook() { if (R.time !== hookT) { hookT = R.time; lightTick(); } }

// ---------- the ice ----------
// Black ice you can see into: an opaque mesh over the thin-ice cells at ICE_Y, drawn first (renderOrder -1) so the ground
// under it fails the early depth test. Bubbles 0.3 m down and dark mottling 1.6 m down, read through the surface with
// parallax; the shapes passing under it (uShade, kept at quality 0: the Icemaw's tell), the drowned lanterns (uGlow);
// the crack stage per cell from tCrack (1 a hairline, 2 a web, 3 crazed white, 4 broken: discarded, the water shows,
// 5 slush). o.far: the far pack ice (no cracks); o.window: an ice window's clear pane (ICE_WINDOW); o.floe: a floe shard
const ICE_MATS = new Map();
export function iceMat(o = {}) {
  const hi = R.quality >= 1, key = (o.far ? 'f' : '') + (o.window ? 'w' : '') + (o.floe ? 'o' : '') + (hi ? 'h' : '') + (R.quality >= 2 ? '2' : '');
  if (ICE_MATS.has(key)) return ICE_MATS.get(key);
  noiseTex(); crackTex();
  const lay = ENV.layers['rime/ice'] || null;
  // (Lambert, and the glints worked out here: the hero's lantern, small and hard, and the lit lanterns, uLights. A Phong
  // highlight of the lantern a step from her laid a white blot on the black ice wherever she went; the windows' panes
  // keep it on high quality)
  const m = R.quality >= 2 && o.window ? new THREE.MeshPhongMaterial({ color: 0xffffff, specular: new THREE.Color(o.window ? 0x343c46 : 0x2a3440), shininess: o.window ? 300 : 420 })
    : new THREE.MeshLambertMaterial({ color: 0xffffff });
  if (o.window) { m.transparent = true; m.depthWrite = false; }
  const u = SEA_U({ tCrack: SEA.tCrack, uShade: SEA.uShade, uGlow: SEA.uGlow, uGlowOn: SEA.uGlowOn, uLights: SEA.uLights, uFreezeAll: SEA.uFreezeAll, tIceL: { value: lay?.d || null }, uSkyC: LIT.uSkyC, uHeroP: LIT.uHeroP, uHeroC: LIT.uHeroC, uHeroR: LIT.uHeroR, uMoonD: LIT.uMoonD, uMoonC: LIT.uMoonC });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.defines = Object.assign(sh.defines || {}, hi ? { ICE_HI: '' } : {}, hi && !o.window ? { ICE_GLINT: '' } : {}, hi && R.quality < 2 ? { ICE_Q1: '' } : {}, o.far ? { ICE_FAR: '' } : {}, o.window ? { ICE_WINDOW: '' } : {}, o.floe ? { ICE_FLOE: '' } : {}, lay ? { ICE_LAY: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aC; attribute vec2 aE; attribute float aB;
varying vec3 vIP; varying vec2 vIC; varying vec2 vIE; varying float vIB;
#if defined(ICE_HI) && !defined(ICE_FAR)
${COMMON}
varying vec3 vIAur;
#endif
varying float vIAurK;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vIE = aE; vIB = aB;
  vec4 ipp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  ipp = instanceMatrix * ipp;
#endif
  vIP = (modelMatrix * ipp).xyz; vIC = aC;
#if defined(ICE_HI) && !defined(ICE_FAR)
  // the aurora mirrored in the ice, at the vertices (as the water's); under the black aurora its dark curtains
  vIAur = vec3(0.0); vIAurK = 0.0;
  {
    vec3 Vv = cameraPosition - vIP; float dv = length(Vv); Vv /= dv;
    float ry = max(Vv.y, 0.04);
    vec2 sp = vIP.xz - Vv.xz * ((70.0 - vIP.y) / ry);
    if (uAur * max(1.0 - uAurDark, uAurFront) > 0.02) vIAur = aurora(sp, 0.65, 2.5 + dv * 0.06 / max(ry, 0.15)) * smoothstep(0.04, 0.3, Vv.y);
    if (uAurDark > 0.02) vIAurK = auroraDark(sp);
  }
#else
  vIAurK = 0.0;
#endif`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${COMMON}
uniform sampler2D tCrack; uniform vec4 uShade[4]; uniform vec4 uGlow[8]; uniform float uGlowOn; uniform vec4 uLights[2]; uniform sampler2D tIceL; uniform vec3 uSkyC; uniform vec3 uHeroP; uniform vec3 uHeroC; uniform float uHeroR; uniform vec3 uMoonD; uniform vec3 uMoonC;
varying vec3 vIP; varying vec2 vIC; varying vec2 vIE; varying float vIB;
#if defined(ICE_HI) && !defined(ICE_FAR)
varying vec3 vIAur;
#endif
varying float vIAurK;
uniform float uFreezeAll;
// the edge distance of a world-space Voronoi at p (about 0 on the cell walls): the crack lines (off the baked texture)
float vEdge(vec2 p) { return vorT(p).x; }
vec3 iceEm = vec3(0.0);`)
      .replace('#include <map_fragment>', `
  vec2 P = vIP.xz; float t = uTime, st = 0.0;
#if !defined(ICE_FAR) && !defined(ICE_WINDOW) && !defined(ICE_FLOE)
  vec2 cc = vIC.x >= 0.0 ? vIC : floor(P) + 0.5;
  st = floor(texture2D(tCrack, cc / uMap).r * 255.0 + 0.5);
  if (abs(st - 4.0) < 0.5) discard;
#endif
  vec3 V = normalize(cameraPosition - vIP);
  vec2 par = -V.xz / max(V.y, 0.25);
  // (each read turned off the grid: value noise cut by a threshold along its own axes would show its lattice)
  vec2 Pr = mat2(0.8, -0.6, 0.6, 0.8) * P;
  // (the surface read is drawn out along the wind, its streak lines bent in long slow meanders: the snow lies in streaks
  // that turn as the drifts do, never in one ruled direction. A bend, not a turn of the whole frame: an angle that varies
  // over the field, turning world coordinates hundreds of metres out, would squeeze the read into hairlines)
  vec2 Pw = mat2(0.94, -0.34, 0.34, 0.94) * P;
  Pw.y += sin(Pw.x * 0.045 + 0.6) * 2.2 + sin(Pw.x * 0.017 + 1.3) * 4.0;
  vec4 nS = texture2D(tNoise, vec2(Pw.x * 0.03, Pw.y * 0.072) + 0.71);
#if defined(ICE_HI) && !defined(ICE_WINDOW)
  // read through the surface: what lies deeper slides further as the eye moves (the deep mottle on high quality only)
  vec4 nB = texture2D(tNoise, mat2(0.6, 0.8, -0.8, 0.6) * (P + par * 0.3) * 0.9 + 0.13);
// (the deep patches broad and slow, metres across)
// (q1 takes them from the surface read: nB's red, a 4-cell octave read at 0.9 a metre, tiled every 1.1 m and its peaks,
// thresholded, printed one comma-shaped mark over every field as a wallpaper)
#ifdef ICE_Q1
  vec4 nD = vec4(nS.r, nS.g, nS.b * 0.55 + nS.r * 0.45, nS.b);
#else
  vec4 nD = texture2D(tNoise, (Pr + par * 1.6) * 0.04 + 0.37);
#endif
#else
  vec4 nB = nS.abgr, nD = nS.gbar;
#endif
#if !defined(ICE_FAR) && !defined(ICE_WINDOW) && !defined(ICE_FLOE)
  // the snow's edge: the land's share of the corners, frayed by the streaked surface read and a finer one (enough that
  // the cut never follows the triangles' diagonals); in the band round the thin ice the ice is cut away where the snow
  // lies (always at the band's far side, never at the thin ice's own edge)
  float de = vIE.x * 1.5 + (nS.a - 0.5) * 0.5 + (nS.b - 0.5) * 0.2;
  if (vIB > 0.25 && de + (vIB - 0.5) * 1.2 + (nB.g - 0.5) * 0.45 + (nS.r - 0.5) * 0.3 > 1.12) discard;
  // and toward open water the ice frays away over the water held just under it (always at the water's own edge)
  // (always eating a little into the ice: where the noise held off, the cells' own square edge showed)
  float ce = vIE.y * 1.5 + (nS.g - 0.5) * 0.35 + (nS.r - 0.5) * 0.15 + (nB.g - 0.5) * 0.25;
  if (vIB < 0.25 && vIE.y > 0.001 && ce > 0.3) discard;
#endif
  // clear ice over black water: a steel blue-grey you can read as walkable at a glance (lighter than the open water,
  // darker than the snow), its depth mottled; pale veils of trapped air lower down; small bubbles in clusters near the
  // surface; old pressure cracks; frost and drifted snow on top
  // (black glass over black water: one flat, glassy sheet you can read as walkable at a glance (lighter than the open water
  // beside it, which heaves; darker than the snow), its depth in broad slow patches of low contrast; bubbles trapped in
  // columns at depth; a few long straight pressure cracks; a faint frost dust only toward the land. Mottled, streaked and
  // dusted all over, it read as choppy water or camouflage)
  vec3 col = mix(vec3(0.03, 0.046, 0.064), vec3(0.05, 0.07, 0.092), smoothstep(0.25, 0.8, nD.r * 0.8 + nD.g * 0.2));
  col += vec3(0.01, 0.014, 0.016) * smoothstep(0.6, 0.9, nD.b);
  float bub = 0.0;
#if defined(ICE_HI) && !defined(ICE_FAR) && !defined(ICE_FLOE) && !defined(ICE_WINDOW)
  // (bubble columns: the same few spots of a 0.45 m grid read at three depths, each slid by its own parallax, so a column
  // of beads leans away from the eye as you walk; in loose clusters)
  // (the grid warped by the slow read so its rows never line up, each spot jittered in its cell and sized its own, most
  // cells empty, gathered where the broad read is high, and gone where a pixel spans a bead: a regular grid of one mark
  // read as printed wallpaper)
  {
    float clu = smoothstep(0.6, 0.84, nS.g * 0.55 + nD.r * 0.45) * (1.0 - smoothstep(0.03, 0.065, length(fwidth(P))));
    vec2 bw = (nS.ba - 0.5) * 1.6;
    if (clu > 0.01) for (int j = 0; j < 3; j++) {
      float dj = 0.18 + float(j) * 0.26;
      vec2 bq = (P + par * dj) * 2.2 + bw, bc = floor(bq), bh = sH2(bc + 0.37);
      if (bh.x < 0.93) continue;
      vec2 bo = sH2(bc + 5.13);
      float br = length((bq - bc - 0.15 - bo * 0.7) * vec2(1.0, 0.7 + 0.6 * bh.y)) * 0.45;
      bub = max(bub, (1.0 - smoothstep(0.008, 0.02 + 0.022 * bh.y + float(j) * 0.006, br)) * (1.0 - float(j) * 0.25) * clu);
    }
  }
  col += vec3(0.15, 0.18, 0.2) * bub;
  // (old pressure cracks: long, few, straight, white with a faint glow in the ice round them, where a Voronoi of 5 m cells
  // has its walls along a length here and there; and a fainter set lower down, slid by the parallax)
  { float ce = vEdge(Pr * 0.19 + nD.gb * 0.02), cm = smoothstep(0.52, 0.68, nS.r * 0.7 + nS.a * 0.3);
    col = mix(col, vec3(0.46, 0.52, 0.56), (1.0 - smoothstep(0.0, 0.018, ce)) * cm * 0.8);
    col += vec3(0.03, 0.04, 0.045) * (1.0 - smoothstep(0.0, 0.09, ce)) * cm;
    float cd = vEdge((Pr + par * 0.5) * 0.31 + 2.7);
    col = mix(col, vec3(0.16, 0.2, 0.23), (1.0 - smoothstep(0.0, 0.025, cd)) * smoothstep(0.55, 0.75, nS.b) * 0.45); }
#else
  bub = smoothstep(0.86, 0.96, nB.a) * smoothstep(0.55, 0.8, nB.r);
  col += vec3(0.07, 0.085, 0.095) * bub;
#endif
  // (the drifted snow: a faint dust in streaks, a soft low mask with a fine sparkle in it, fading with distance so it never
  // turns to static; the snow proper lies at the land's edge, below)
  float dfar = 1.0 - smoothstep(16.0, 42.0, length(cameraPosition - vIP));
  float frost = smoothstep(0.62, 0.9, nS.r * 0.75 + nS.b * 0.25 + (nB.a - 0.5) * 0.1) * (0.14 + 0.08 * smoothstep(0.55, 0.8, nS.g)) * (0.55 + 0.45 * dfar);
#ifdef ICE_LAY
  // (a low-contrast tone only: its bright crack lines, thresholded into frost, scattered white hooks over every field)
  vec3 lay = texture2D(tIceL, P * 0.13).rgb;
  col *= 0.95 + lay * 0.1;
#endif
  col = mix(col, vec3(0.3, 0.34, 0.38) * (0.8 + 0.4 * nB.g), frost * 0.6);
#ifdef ICE_FAR
  col = mix(vec3(0.42, 0.47, 0.53), vec3(0.62, 0.67, 0.72), smoothstep(0.3, 0.8, nS.r)) * (0.8 + 0.2 * nS.b);
#endif
#ifdef ICE_FLOE
  col = mix(vec3(0.3, 0.36, 0.42), vec3(0.56, 0.62, 0.68), smoothstep(0.3, 0.7, nS.g));
#endif
  // dark shapes passing under the ice (kept on every quality: the Icemaw's tell)
  for (int i = 0; i < 4; i++) {
    vec4 s = uShade[i];
    if (s.w <= 0.0) continue;
    float dpt = i == 3 ? 3.2 : 1.3;
    vec2 qq = P + par * dpt - s.xy;
    float d = length(qq) / max(s.z, 0.1) + (nD.g - 0.5) * 0.35;
    col *= 1.0 - s.w * 0.92 * (1.0 - smoothstep(0.45, 1.0, d));
  }
#if defined(ICE_HI) && !defined(ICE_WINDOW)
  // drowned lanterns glowing a few metres down, and their light caught in the ice (only while one is near the camera)
  if (uGlowOn > 0.5) for (int i = 0; i < 8; i++) {
    vec4 gl = uGlow[i];
    if (gl.w <= 0.0) continue;
    // (seen at less than its depth: the ice bends the view, and the lantern stays under its window)
    vec2 qq = P + par * gl.y * 0.45 - gl.xz; float d2 = dot(qq, qq);
    if (d2 > 900.0) continue;
    vec2 q2 = P + par * gl.y * 0.2 - gl.xz; float e2 = dot(q2, q2);
    // (its wide light kept close round the window: a wash metres off read as a stain attached to nothing)
    iceEm += vec3(1.0, 0.56, 0.2) * gl.w * (exp(-d2 * 1.6) * 0.5 + exp(-e2 * 0.4) * 0.12) * (0.85 + 0.15 * sin(t * 2.3 + gl.x));
  }
#endif
#if defined(ICE_HI) && defined(ICE_WINDOW)
  // under a window the drowned lantern itself: a warm core held in the pane's middle whatever the eye's angle (its parallax
  // kept to a hand: slid by its full depth, the ice round the hole hid it from the play camera, and the window read as a
  // blank pale puddle), a soft halo a metre across at its depth, a slow warm caustic ripple over the pane, the cross of glints
  if (uGlowOn > 0.5) for (int i = 0; i < 8; i++) {
    vec4 gl = uGlow[i];
    if (gl.w <= 0.0) continue;
    vec2 off = par * gl.y * 0.4; off *= min(1.0, 0.28 / max(length(off), 1e-3));
    vec2 qq = P + off - gl.xz; float d2 = dot(qq, qq);
    if (d2 > 9.0) continue;
    vec2 qh = P + par * gl.y * 0.22 - gl.xz; float h2 = dot(qh, qh);
    float cau = 0.5 + 0.5 * sin(qh.x * 7.0 + sin(qh.y * 5.0 + t * 0.9) * 1.6 + t * 0.7) * sin(qh.y * 6.0 - sin(qh.x * 4.0 - t * 0.8) * 1.4 - t * 0.6);
    float fl = 0.88 + 0.12 * sin(t * 2.3 + gl.x);
    iceEm += vec3(1.0, 0.6, 0.26) * gl.w * fl * (exp(-d2 * 70.0) * 3.2 + exp(-d2 * 9.0) * 0.55 + exp(-h2 * 2.2) * (0.16 + 0.24 * cau) + (exp(-abs(qq.x) * 30.0) + exp(-abs(qq.y) * 30.0)) * exp(-d2 * 3.0) * 0.25);
  }
#endif
  // cracks, stage by stage: a hairline through the cell, a star of three, then crazed white; slush: grey brash with
  // black water between the bits
  if (st > 0.5) {
    // (bent by the slow read only: the fine one kinked each hairline into a worm)
    vec2 Pw = P + (nS.gr - 0.5) * 0.1;
    if (st > 4.5) {
      float e = vEdge(Pw * 2.6 + 3.1);
      if (e < 0.1 + 0.1 * nS.g) discard;
      col = mix(vec3(0.05, 0.065, 0.08), vec3(0.16, 0.19, 0.22), smoothstep(0.3, 0.7, nB.r)) * (0.6 + 0.6 * smoothstep(0.1, 0.4, e));
    } else {
      // (rays from a point in the cell, longer with each stage, kinked by the fine noise)
      vec2 ic = floor(P), hc = sH2(ic), cv = Pw - (ic + 0.5 + (hc - 0.5) * 0.4);
      float c = 0.0, reach = st > 1.5 ? 0.75 : 0.42;
      for (int j = 0; j < 3; j++) {
        if (j > 0 && st < 1.5) break;
        float an = hc.x * 6.283 + float(j) * 2.09 + (sH(ic + float(j) * 3.7) - 0.5) * 0.9;
        vec2 dir = vec2(cos(an), sin(an));
        // (straight, bent once where it starts: a sine along it read as a worm)
        float along = dot(cv, dir), dd = abs(dot(cv, vec2(-dir.y, dir.x)) + abs(along) * (hc.y - 0.5) * 0.3);
        c = max(c, (1.0 - smoothstep(0.004, 0.02, dd)) * (1.0 - smoothstep(reach * 0.5, reach, abs(along))));
      }
      if (st > 2.5) { c = max(c, (1.0 - smoothstep(0.0, 0.035, vEdge(Pw * 3.2))) * 0.7); col = mix(col, vec3(0.32, 0.37, 0.42), 0.25 + 0.3 * nB.g); }
      col = mix(col, vec3(0.62, 0.7, 0.75), c * 0.9);
      iceEm += vec3(0.1, 0.13, 0.15) * c * 0.15;
    }
  }
#if !defined(ICE_FAR) && !defined(ICE_WINDOW) && !defined(ICE_FLOE)
  // its edges (vIE: x the corner touches land or thick ice, y open water): snow drifted in over the black ice from the
  // land, ragged, so the cells' squares never show; a pale broken rim where the open water begins (where it is must read
  // at a glance), and the skirt below it (vIC set) pale too
  {
    // (the snow's own edge is the band's cut: here, toward it, the black ice is dusted ever more thickly and streaked along
    // the wind, so the white of the snow ends on grey, as a drift's edge does)
    float dr = smoothstep(0.7, 1.12, de + (nB.g - 0.5) * 0.12) * 0.55, dv = smoothstep(0.2, 0.8, de) * 0.4;
    // (the rim just inside the cut, following it)
    // (a thin grey lip right at the cut, broken: a pale band a third of a cell wide read as a cow-print frill)
    float rm = vIC.x >= 0.0 ? 0.8 : smoothstep(0.235, 0.285, ce + (nB.a - 0.5) * 0.04) * step(0.001, vIE.y) * 0.6 * smoothstep(0.3, 0.6, nB.g + nS.b * 0.3);
    col = mix(col, vec3(0.16, 0.19, 0.22) * (0.7 + 0.6 * nS.a), dv * (1.0 - dr));
    col = mix(col, vec3(0.34, 0.37, 0.41) * (0.78 + 0.2 * nS.b + 0.2 * nB.g) * (0.88 + 0.12 * smoothstep(0.64, 0.9, de)), dr);
    col = mix(col, vec3(0.2, 0.23, 0.26) * (0.8 + 0.4 * nB.r), rm * (1.0 - dr));
    frost = max(frost, max(max(dr, dv), rm));
  }
#endif
#ifdef ICE_WINDOW
  // the clear pane: a round hole of clear ice, its outline wandering (vIC the 2 x 2 window's centre), the thick ice round it
  // frosted and opaque to the cells' edge, so neither the square nor the shaft's walls show; black glass in the middle,
  // darkening toward the deep. (Square to the cells, it read as a glass skylight)
  // (the ground covers the rest of its cells, cutting the same hole: build.js G_WIN)
  float wr = winR(P - vIC, vIC);
  if (wr > 1.02) discard;
  float rim = smoothstep(0.84, 1.0, wr + (nS.a - 0.5) * 0.1 + (nB.g - 0.5) * 0.06);
  // (deep water under it, near black: the pit's walls behind a see-through pale pane read as a puddle)
  col = mix(vec3(0.004, 0.011, 0.019) * (0.55 + 0.45 * smoothstep(0.2, 0.9, wr)), vec3(0.44, 0.5, 0.56) * (0.85 + 0.25 * nB.g), rim);
  col = mix(col, vec3(0.3, 0.36, 0.42), smoothstep(0.66, 0.84, wr) * (1.0 - rim) * 0.5 * (0.6 + 0.8 * nS.b));
#endif
#if !defined(ICE_FAR) && !defined(ICE_FLOE)
  // fresh rime as the Freeze passes over
  col = mix(col, vec3(0.55, 0.62, 0.68), uFreezeAll * 0.5);
#endif
  // glassy: the sky in it, a dull sheen looking down, brighter at a low angle (blotted by the black aurora's curtains)
  vec3 Nr = normalize(vec3((nS.g - 0.5) * 0.012, 1.0, (nS.b - 0.5) * 0.012));
  float F = 0.03 + 0.97 * pow(1.0 - clamp(dot(Nr, V), 0.0, 1.0), 5.0);
  iceEm += uSkyC * (0.12 + 0.6 * F) * (1.0 - frost) * (1.0 - 0.8 * vIAurK);
#if !defined(ICE_FAR) && !defined(ICE_FLOE)
  // (one broad sheen of the moon across the glass, and its small hard glint: the sheet reads as still and polished)
  { vec3 Rm = reflect(-V, Nr); float mm = max(dot(Rm, uMoonD), 0.0);
    iceEm += uMoonC * (pow(mm, 9.0) * 0.045 + pow(mm, 160.0) * 0.2) * (1.0 - frost) * (1.0 - 0.8 * vIAurK); }
#endif
#ifdef ICE_HI
  // the aurora mirrored in the ice; the lit sea-lights' lanterns
  vec3 Rf = reflect(-V, Nr);
#ifdef ICE_FAR
  vec2 sp = P + Rf.xz * ((70.0 - vIP.y) / max(Rf.y, 0.04)), spw = fwidth(sp);
  if (uAur * max(1.0 - uAurDark, uAurFront) > 0.02) iceEm += aurora(sp, 1.0, length(spw)) * (0.1 + 0.3 * F) * (1.0 - frost * 0.6) * smoothstep(0.04, 0.3, Rf.y);
#else
  // (in long smooth streaks drawn toward the eye, as still glass shows a far light: per vertex alone it lay in blots)
  vec2 ivd = normalize(V.xz + vec2(0.0001, 0.0)), ivp = vec2(-ivd.y, ivd.x);
  float istk = texture2D(tNoise, vec2(dot(P, ivp) * 0.12, dot(P, ivd) * 0.01) + 0.21).g;
  iceEm += vIAur * (0.5 + 0.9 * smoothstep(0.3, 0.8, istk)) * (0.14 + 0.4 * F) * (1.0 - frost * 0.6);
#endif
  for (int i = 0; i < 2; i++) {
    vec4 Lp = uLights[i];
    if (Lp.w <= 0.0) continue;
    vec3 ld = Lp.xyz - vIP; float dl = length(ld); ld /= dl;
    iceEm += vec3(1.0, 0.82, 0.55) * (pow(max(dot(Rf, ld), 0.0), 60.0) + pow(max(dot(Rf, ld), 0.0), 8.0) * 0.05) * Lp.w * 0.9 / (1.0 + dl * 0.04);
  }
#endif
#ifdef ICE_GLINT
  {
    vec3 hd = uHeroP - vIP; float hl = length(hd);
    float ha = pow(clamp(1.0 - pow(hl / uHeroR, 4.0), 0.0, 1.0), 2.0) / max(pow(hl, 1.4), 0.5);
    iceEm += uHeroC * ha * pow(max(dot(Rf, hd / hl), 0.0), 600.0) * 0.08 * (1.0 - frost * 0.85);
  }
#endif
  diffuseColor.rgb = col;
#ifdef ICE_WINDOW
  diffuseColor.a = mix(0.72 + 0.2 * pow(1.0 - clamp(dot(V, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 2.0) + 0.2 * smoothstep(0.5, 0.8, wr), 1.0, rim);
#endif`)
      .replace('#include <specularmap_fragment>', '#include <specularmap_fragment>\n  specularStrength *= 1.0 - frost * 0.85;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += iceEm;');
  };
  m.customProgramCacheKey = () => 'ice|' + key + (lay ? '|l' : '') + '|' + m.type;
  ICE_MATS.set(key, m);
  return m;
}
// The ice of a level: the thin-ice cells as an opaque mesh at ICE_Y (chunked), a short skirt where it meets open water (its
// thickness shows), the windows as their own clear mesh, and a pool of 32 floe shards (count 0: ice.js places them).
// Returns { mesh, windows, floes }; userData.L on the mesh. The drowned lanterns (L.spots.drowned) feed uGlow while this
// level draws.
export function buildIce(L, group, quality = R.quality) {
  const { w, h } = L, W = w + 1;
  // (a footprint standing in the thin ice, a block of ice or a hull, keeps the pit under it: the ice runs on under the prop)
  const pit = (i) => !!(L.thick?.[i] && !L.cells[i] && !L.window?.[i] && L.hgt) && [0, 1, W, W + 1].some((d) => L.hgt[i + Math.floor(i / w) + d] < -0.5);
  const thin = (x, z) => x >= 0 && z >= 0 && x < w && z < h && (!!L.ice[z * w + x] || pit(z * w + x));
  const open = (x, z) => x < 0 || z < 0 || x >= w || z >= h ? true : !!(L.sea?.[z * w + x] || (L.bed && L.bed[z * w + x] < -0.45 && !L.thick?.[z * w + x] && !L.ice[z * w + x]));
  // (for the edges: water a corner touches, tidal or open; anything else that is no thin ice is land)
  const wat = (i) => !!(L.sea?.[i] || L.low?.[i] || (L.bed && L.bed[i] < BED_DRY && !L.thick?.[i] && !L.window?.[i] && !L.deck?.[i]));
  // the band: the floor round the thin ice (its eight neighbours, level with the floor, no tidal flat, window or jetty)
  // takes the ice as well, and the shader cuts it away raggedly (aB 1), so the snow ends on the black ice along a frayed
  // line inside the band, never along the cells' squares
  // (a corner on an ice window's edge counts as level: the ground keeps the floor level there, build.js)
  const winC = (vx, vz) => [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dx, dz]) => { const x = vx + dx, z = vz + dz; return x >= 0 && z >= 0 && x < w && z < h && !!L.window?.[z * w + x]; });
  const flatAt = (x, z) => { if (!L.hgt) return true; for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (Math.abs(L.hgt[(z + dz) * W + x + dx]) > 0.05 && !winC(x + dx, z + dz)) return false; return true; };
  const band = (x, z) => {
    if (x < 0 || z < 0 || x >= w || z >= h) return false;
    const i = z * w + x;
    if (L.ice[i] || L.window?.[i] || L.deck?.[i] || wat(i) || pit(i) || !flatAt(x, z)) return false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (thin(x + dx, z + dz)) return true;
    return false;
  };
  const mat = iceMat(), J = shoreJit(L);
  const mesh = new THREE.Group(); mesh.name = 'ice';
  const Y = ICE_Y;
  for (let cz0 = 0; cz0 < h; cz0 += CH) for (let cx0 = 0; cx0 < w; cx0 += CH) {
    const vid = new Map(), pos = [], cc = [], ed = [], bd = [], idx = [];
    // (each corner where the ground's takes it, off the grid: shoreJit)
    const vert = (vx, vz, b = 0) => {
      const k0 = vz * W + vx + b * 1e7; let k = vid.get(k0); if (k != null) return k;
      const j = (vz * W + vx) * 2;
      k = pos.length / 3; vid.set(k0, k); pos.push(vx + (J ? J[j] : 0), Y, vz + (J ? J[j + 1] : 0)); cc.push(-1, -1); bd.push(b);
      // (the share of the corner's four cells that is land, and water: 0.5 along a straight edge, 0.25 at an outer
      // corner, 0.75 in an inner one, so the drift and the rim hug the edge instead of filling the edge's cells)
      let la = 0, wa = 0;
      // (a footprint standing in the thin ice is ice too: no drift is painted over the square of its cell)
      // (a tidal flat counts as land here: the sand meets the ice at its own level, and frayed back off it the ice bared
      // a ruled strip of the pit along the cells' line)
      for (const [dx, dz] of CORNER) { const x = vx + dx, z = vz + dz; if (x < 0 || z < 0 || x >= w || z >= h) continue; const i = z * w + x; if (L.ice[i] || pit(i)) continue; if (wat(i) && !flatCell(L, i)) wa += 0.25; else la += 0.25; }
      ed.push(la, wa);
      return k;
    };
    // (each chunk runs one cell on into the next, the same quads drawn twice over the seam: no hairline of the bed shows
    // between two chunks' edges)
    for (let z = cz0; z < Math.min(h, cz0 + CH + 1); z++) for (let x = cx0; x < Math.min(w, cx0 + CH + 1); x++) {
      // (a band corner: 0.5 where it touches the thin ice, 1 out at the band's far side, where the cut is certain)
      if (band(x, z)) { const bv = (vx, vz) => vert(vx, vz, thin(vx - 1, vz - 1) || thin(vx, vz - 1) || thin(vx - 1, vz) || thin(vx, vz) ? 0.5 : 1); const a = bv(x, z), b = bv(x + 1, z), c = bv(x, z + 1), d = bv(x + 1, z + 1); idx.push(a, c, b, c, d, b); continue; }
      if (!thin(x, z)) continue;
      const a = vert(x, z), b = vert(x + 1, z), c = vert(x, z + 1), d = vert(x + 1, z + 1);
      idx.push(a, c, b, c, d, b);
      // (no skirts: toward open water the ice frays away in the shader, aE.y; against the land and the rock the ground
      // meets it at its own surface, gen5 heights, and the drift's colour frays toward it)
    }
    if (!idx.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aC', new THREE.Float32BufferAttribute(cc, 2));
    geo.setAttribute('aE', new THREE.Float32BufferAttribute(ed, 2));
    geo.setAttribute('aB', new THREE.Float32BufferAttribute(bd, 1));
    geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    // (black ice shows a shadow hardly at all: the shadow map's taps are kept for high quality)
    m.renderOrder = -1; m.receiveShadow = quality >= 2;
    mesh.add(m);
  }
  // the windows: a clear pane over each pit (the figure lies 2.2 m down)
  let windows = null;
  if (L.window) {
    const pos = [];
    // (each cell carries its window's centre, the corner its 2 x 2 cells share: the frost follows the window's outline)
    const ctr = [], win = (x, z) => x >= 0 && z >= 0 && x < w && z < h && !!L.window[z * w + x];
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if (L.window[z * w + x]) {
      pos.push(x, Y, z, x, Y, z + 1, x + 1, Y, z, x, Y, z + 1, x + 1, Y, z + 1, x + 1, Y, z);
      const cx = win(x + 1, z) ? x + 1 : x, cz = win(x, z + 1) ? z + 1 : z;
      for (let k = 0; k < 6; k++) ctr.push(cx, cz);
    }
    if (pos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aC', new THREE.Float32BufferAttribute(ctr, 2));
      geo.computeVertexNormals(); geo.computeBoundingSphere();
      windows = new THREE.Mesh(geo, iceMat({ window: true }));
      windows.renderOrder = 1;
      group.add(windows);
    }
  }
  // the floe pool: flat shards of the ice, bobbing on the swell (ice.js sets count and matrices)
  const fg = new THREE.CylinderGeometry(0.42, 0.5, 0.12, 6, 1); fg.scale(1, 1, 0.75);
  const pp = fg.attributes.position; for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)); const k = 0.8 + 0.35 * Math.abs(Math.sin(a * 2.7 + 1.3)); pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); }
  fg.setAttribute('aC', new THREE.Float32BufferAttribute(new Float32Array(pp.count * 2).fill(-1), 2)); fg.computeVertexNormals();
  const floes = new THREE.InstancedMesh(fg, iceMat({ floe: true }), 32);
  floes.count = 0; floes.frustumCulled = false; floes.castShadow = false; floes.receiveShadow = quality >= 2;
  group.add(floes);
  // this level's drowned lanterns, written to uGlow while it draws (zones are cached: each keeps its own); once a frame
  // those over 40 m from the camera's target are left out, and with none left the shader skips the loop (uGlowOn)
  const glow = Array.from({ length: 8 }, V4), near = Array.from({ length: 8 }, V4);
  (L.spots?.drowned || []).slice(0, 8).forEach((d, i) => glow[i].set(d.glow?.x ?? d.x, Math.max(0.5, -(d.glow?.y ?? -2.4)), d.glow?.z ?? d.z, 1));
  let gT = -1;
  const hook = () => {
    SEA.uMap.value.set(w, h); SEA.uGlow.value = near;
    if (gT === R.time) return;
    gT = R.time; let on = 0;
    for (let i = 0; i < 8; i++) { const g = glow[i]; near[i].copy(g); if (g.w > 0 && Math.hypot(g.x - R.cam.x, g.z - R.cam.z) > 40) near[i].w = 0; if (near[i].w > 0) on = 1; }
    SEA.uGlowOn.value = on;
  };
  for (const m of mesh.children) m.onBeforeRender = (...a) => { hook(...a); SEA.iceL = L; };
  group.add(mesh);
  mesh.userData = { L, glow, kind: 'ice' };
  return { mesh, windows, floes };
}

// ---------- the aurora as a sky (the cines) ----------
// A dome of r 110 that follows the camera (fog off), drawn first: a night gradient, stars, and three curtains hanging over
// the north (drawn in the sky's own angles: from the ground a curtain is a hem along the horizon and rays rising from it,
// which a plane of sky would squash into streaks this low). Shown while SEA.sky is set and the camera is low enough to see
// any sky (R.skyHook below).
let dome = null;
const HOR_S = { r: 0, g: 0, b: 0 };
export function auroraSky() {
  if (dome) return dome;
  noiseTex();
  const geo = new THREE.SphereGeometry(110, 40, 14, 0, Math.PI * 2, 0, Math.PI * 0.56);
  geo.userData.shared = true;
  const u = SEA_U({ uHorS: { value: new THREE.Color() }, uTop: { value: new THREE.Color(0x02040a) }, uSkyC: LIT.uSkyC, uFogD: { value: 0.02 } });
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthWrite: false, fog: false, side: THREE.BackSide,
    vertexShader: 'varying vec3 vD; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vD = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `${COMMON}
uniform vec3 uHorS; uniform vec3 uTop; uniform vec3 uSkyC; uniform float uFogD; varying vec3 vD;
void main() {
  vec3 D = normalize(vD);
  float e = clamp(D.y, 0.0, 1.0), hz = smoothstep(0.0, 0.32, e), t = uTime;
  // (the horizon's colour, the fog's, horK of it, is laid on after the tone mapping, as three lays its fog on what it
  // draws: tone-mapped, the fog's dark colour fell to near black, and the dome stood a shade darker than the fogged sea
  // and land in front of it, a black band along every low cine's horizon)
  // (under the black aurora the night sky itself a little lifted, a faint violet-blue glow low down, so the black curtains
  // can read against it: on the old near-black they were lost and the sky read as a plain dark)
  vec3 col = mix(uTop, vec3(0.0045, 0.0075, 0.018), uAurDark) * hz + vec3(0.003, 0.004, 0.009) * uAurDark * exp(-e * 5.0);
  float horK = 1.0 - hz;
  // under the horizontal, past the far plane (160 m) where the sea's own quads stop: the far sea as they would draw it,
  // the sky's sheen at a grazing look, in the fog as far off as the ray would meet it (in the fog's colour alone, a black
  // band lay between the sea's far edge and the sky in every low cine)
  float yF = -max(cameraPosition.y, 1.0) / 150.0;
  if (D.y < 0.0) { float dd = max(cameraPosition.y, 1.0) / max(-D.y, 0.0005) * uFogD; horK = 1.0 - exp(-dd * dd); col = (uSkyC * 0.62 + vec3(0.003, 0.009, 0.014)) * (1.0 - horK); }
  // far headlands and islands low over the horizon, in the fog's own colour (as far land drawn in the fog is), the
  // curtains' glow standing behind them: long gentle rises with ragged crests. (Darker than the fog, steep-sided and
  // smooth-topped, they stood on the horizon as a row of dark blocks)
  float azh = atan(D.x, -D.z);
  float isl = smoothstep(0.42, 0.8, texture2D(tNoise, vec2(azh * 0.3 + 0.13, 0.71)).r) * (0.012 + 0.014 * texture2D(tNoise, vec2(azh * 1.3 + 0.4, 0.29)).g)
    + (texture2D(tNoise, vec2(azh * 6.0 + 0.2, 0.47)).b - 0.5) * 0.004 + (texture2D(tNoise, vec2(azh * 19.0, 0.13)).a - 0.5) * 0.0015;
  // (D.y itself, not e, which stops at 0; and only over the horizontal: under it lies the far sea)
  float islM = smoothstep(-0.0016, 0.0016, isl - D.y) * smoothstep(-0.003, 0.0, D.y);
  col *= 1.0 - islM; horK = mix(horK, 1.0, islM);
  // stars: one in a few hundred cells of a grid on the sky
  vec2 sp = D.xz / (D.y + 0.2) * 70.0, c = floor(sp);
  float hs = sH(c), star = step(0.982, hs) * (1.0 - smoothstep(0.05, 0.22, length(fract(sp) - 0.5 - (sH2(c + 3.1) - 0.5) * 0.6))) * smoothstep(0.02, 0.2, e);
  star *= 0.6 + 0.4 * sin(t * (1.5 + hs * 3.0) + hs * 40.0);
  // the curtains as seen from the ground: three hang over the north, each a hem low over the horizon that wanders with
  // the azimuth (folds dipping to the sea, others arching up), a sharp white-green line at its foot, combed into rays that
  // fade upward to violet, bright knots and gaps along it; a faint corona overhead. The dark (uAurDark) turns them into
  // black curtains with violet edges that blot the stars; its returning front gives them back. A little dark (the arrival's
  // 0.15) is no dimming but a thread: a narrow black ribbon crossing the hems from the north
  float az = atan(D.x, -D.z), el = asin(clamp(D.y, 0.0, 1.0));
  vec3 acc = vec3(0.0); float blk = 0.0;
  // (three sheets at three depths: the near one tallest, its hem swinging ten degrees up and down; the far ones lower on the
  // sky, shorter, fainter and bluer behind it. Side by side at one depth they read as a theatre's band)
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec4 n = texture2D(tNoise, vec2(az * (0.16 + fk * 0.05) + fk * 0.31 + t * 0.0018, fk * 0.37 + t * 0.0009));
    float fold = sin(az * (1.5 + fk * 1.1) + t * 0.045 + fk * 1.7 + n.g * 3.0);
    // (a soft max: max() put a corner in the hem where a fold began, and the folds read as the pleats of a tent)
    float hem = 0.05 - fk * 0.016 + (fold + sqrt(fold * fold + 0.09)) * 0.5 * (0.16 - fk * 0.05) + (n.r - 0.5) * 0.06 + sin(az * (7.0 + fk * 4.0) - t * 0.11 + n.b * 4.0) * 0.01;
    float up = el - hem;
    float sheet = smoothstep(-0.006, 0.002, up) * exp(-max(up, 0.0) * (3.2 + fk * 2.6));
    // (the rays: a fine comb over a coarse one, their spacing bent along the curtain and gathered in bright clusters with
    // dark gaps between, how combed a length is wandering along it. One even comb read as a barcode)
    float azw = az + sin(az * 2.3 + n.b * 3.0 + t * 0.01) * 0.07 + (n.a - 0.5) * 0.05;
    float r1 = texture2D(tNoise, vec2(azw * 3.1 + fk * 1.7 + t * 0.004, up * 0.45 + fk)).a;
    float r2 = texture2D(tNoise, vec2(azw * 0.83 + fk * 0.61 - t * 0.0025, up * 0.25 + fk * 0.5)).b;
    vec4 nc = texture2D(tNoise, vec2(az * 0.55 + fk * 2.1 + t * 0.0016, 0.13 + fk * 0.2));
    float comb = smoothstep(0.3, 0.75, nc.g) * (1.0 - 0.5 * smoothstep(0.04, 0.3, up));
    float rays = mix(0.6 + 0.7 * smoothstep(0.2, 0.8, r2), 0.2 + 1.3 * smoothstep(0.3, 0.85, r1 * 0.65 + r2 * 0.35), comb);
    rays *= 0.25 + 1.05 * smoothstep(0.3, 0.75, nc.r * 0.65 + n.a * 0.35);
    float lit = smoothstep(0.25, 0.68, n.g + 0.3 * sin(az * 1.9 + t * 0.03 + fk * 2.3)) * (1.0 - fk * 0.3) * (0.45 + 0.55 * smoothstep(-0.5, 0.4, cos(az)));
    vec3 cc = mix(uAurCol, vec3(0.42, 0.12, 0.62), smoothstep(0.0, 0.24, up));
    cc = mix(cc, vec3(0.8, 1.0, 0.9), exp(-max(up, 0.0) * 110.0) * 0.55);
    cc = mix(cc, vec3(0.3, 0.5, 0.8) * dot(cc, vec3(0.3, 0.5, 0.2)), fk * 0.3);
    acc += cc * sheet * rays * lit * (1.0 + 1.5 * exp(-max(up, 0.0) * 40.0));
    // (under the hem the curtain's light scatters down toward the horizon: a faint glow the far headlands stand against,
    // where the sky under the curtains was a black band; half as green, and gone into the haze over the last five degrees:
    // whole, it ran along the horizon as a green felt wall)
    acc += mix(uAurCol, vec3(dot(uAurCol, vec3(0.33))), 0.5) * lit * exp(min(up, 0.0) * 16.0) * (1.0 - step(0.0, up) * (1.0 - exp(-up * 30.0))) * (0.09 - fk * 0.02) * smoothstep(0.0, 0.09, el);
    // (the black curtains combed into rays as the green ones are: plain, their blots stood in the haze like doorways)
    blk = max(blk, sheet * lit * smoothstep(0.3, 1.25, rays));
  }
  // (the corona: rays converging overhead, looking up toward the north)
  float cor = smoothstep(0.75, 1.3, el) * smoothstep(0.3, 0.85, texture2D(tNoise, vec2(az * 2.0 + t * 0.003, el * 0.3)).a);
  acc += mix(uAurCol, vec3(0.42, 0.12, 0.62), 0.5) * cor * 0.35;
  vec2 wp = cameraPosition.xz + D.xz / max(D.y, 0.08) * 12.0;
  float zf = mix(uMap.y + 70.0, -90.0, uAurFront), dk0 = uAurDark * (1.0 - smoothstep(zf - 30.0, zf + 30.0, wp.y));
  float dk = dk0 * smoothstep(0.12, 0.45, dk0);
  float bands = smoothstep(0.35, 0.65, texture2D(tNoise, vec2(az * 0.5 - t * 0.003, el * 0.8)).b);
  // the thread: at a little dark, a narrow ribbon from the north edge, eating the curtains where it passes
  float thr = smoothstep(0.02, 0.1, dk0) * (1.0 - smoothstep(0.25, 0.5, dk0));
  float rib = (1.0 - smoothstep(0.012, 0.03, abs(az - 0.3 - 0.5 * sin(el * 3.4 + t * 0.25) * el))) * smoothstep(0.55, 0.0, el);
  acc *= 1.0 - thr * rib * 0.97;
  // the black aurora: the curtains turn black and blot what is behind them, their edges violet
  // (at full dark almost none of the green left: at 8% the frozen coast's sky still read as a dim green aurora)
  vec3 edgeV = vec3(0.16, 0.06, 0.28) * blk * (1.0 - blk) * 2.6;
  acc = mix(acc, edgeV * (0.6 + 0.4 * bands), dk * 0.975) * (1.0 - dk * bands * 0.5);
  // (the glow down to the horizon itself, where the land in the fog cuts it; under the horizontal the far sea mirrors it
  // and the haze over it holds it, fading to nothing where the sea's own quads begin, at the far plane, so the two meet
  // in the fog's colour: a black band lay there between the lit sea's far edge and the sky)
  acc *= uAur * 0.5 * (D.y >= 0.0 ? mix(0.3, 1.0, smoothstep(0.0, 0.012, D.y)) : 0.55 * smoothstep(yF, 0.0, D.y)) * (1.0 - islM);
  float blot = clamp(dk * blk * 1.3 * smoothstep(0.004, 0.04, e) + thr * rib, 0.0, 0.92);
  // (a pale band of haze low over the horizon under the black aurora, the far ice catching what light there is: the Skotos
  // rises against it, and the frame is no black void)
  col += vec3(0.006, 0.007, 0.011) * uAurDark * exp(-max(D.y, 0.0) * 45.0) * smoothstep(-0.004, 0.002, D.y) * (1.0 - islM);
  col = col * (1.0 - blot * 0.85) + acc + vec3(0.75, 0.8, 0.9) * star * (1.0 - clamp(dot(acc, vec3(1.5)), 0.0, 1.0)) * (1.0 - blot) * (1.0 - islM);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += uHorS * horK * (1.0 - blot * 0.7);
}`
  });
  dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false; dome.renderOrder = -10; dome.visible = false; dome.name = 'auroraSky';
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); R.scene.background.getRGB(HOR_S, THREE.SRGBColorSpace); u.uHorS.value.setRGB(HOR_S.r, HOR_S.g, HOR_S.b); u.uFogD.value = R.scene.fog?.density ?? 0.02; };
  R.scene.add(dome);
  return dome;
}
// per-frame tickers of the props in the scene (build5.js: a beam's motes and its cut-off): { obj, tick(dt) }, each run
// while obj stands in the scene (a cached zone's props wait)
export const TICKS = new Set();
const inScene = (o) => { while (o) { if (o === R.scene) return true; o = o.parent; } return false; };
let tickT = -1;
// gfx.js render(): the dome shows while the sky may (SEA.sky) and the camera looks low enough to see any of it
R.skyHook = () => {
  frameHook();
  const on = SEA.sky && R.cam.pitch <= 0.4;
  if (on && !dome) auroraSky();
  if (dome) { dome.visible = on; if (on && dome.parent !== R.scene) R.scene.add(dome); }
  tickTweens();
  presence();
  sprayTick();
  // (the water level for fx.js: the wrecks' drips, the sea smoke and the stains read it; the stains the ice's stages too)
  FX.tideLv = SEA.uLevel.value; FX.wetLv = SEA.uWetLevel.value; FX.bayLv = SEA.uBayLevel.value; FX.iceSt = SEA.tCrack.value?.image?.data || null;
  const dt = tickT < 0 ? 0 : clamp(R.time - tickT, 0, 0.1); tickT = R.time;
  if (dt > 0) for (const t of TICKS) if (inScene(t.obj)) t.tick(dt);
};
// The Freeze: as it passes, spray caught in the air over the crests, glittering and still (FX's additive pool), near the
// camera and over open water only
let sprayT = -1;
function sprayTick() {
  const k = SEA.uFreezeAll.value, L = SEA.seaL;
  if (k < 0.02 || k > 0.97 || !L?.open5?.length || !FX.add) { sprayT = R.time; return; }
  const dt = clamp(R.time - sprayT, 0, 0.1); sprayT = R.time;
  const n = Math.min(12, Math.floor(dt * 70 + Math.random())), C = L.open5;
  for (let j = 0; j < n; j++) {
    const i = Math.floor(Math.random() * (C.length / 2)) * 2, x = C[i] + Math.random() - 0.5, z = C[i + 1] + Math.random() - 0.5;
    if (Math.abs(x - R.cam.x) > 28 || Math.abs(z - R.cam.z) > 28) continue;
    FX.add.spawn({ x, y: 0.25 + Math.random() * 0.9, z, vx: 0, vy: 0, vz: 0, life: 4 + Math.random() * 4, size: 0.05 + Math.random() * 0.05, size1: 0.04, color: 0xe8f6ff, alpha: 0.9, alpha1: 0 });
  }
}
// On the Farthest Light under the black aurora, while nothing else draws its shade (slot 3: the Skotos, the story), a
// darkness passes slowly under the ice round the Light's Skerry, far out and back: it is near
const PRES = { v: null };
function presence() {
  const sh = SEA.uShade.value[3], L = SEA.iceL, on = L?.type === 'farlight' && SEA.uAurDark.value > 0.5 && SEA.uAurFront.value < 0.5 && L.boss;
  if (sh.w > 0 && PRES.v !== sh.w) return;
  if (!on) { if (PRES.v != null) { sh.set(0, 0, 0, 0); PRES.v = null; } return; }
  const t = SEA.uTime.value * 0.035, B = L.boss, r = B.r + 6 + Math.sin(t * 1.7) * 5;
  sh.set(B.x + Math.sin(t) * r, B.z - 4 + Math.cos(t) * r * 0.75, 5 + Math.sin(t * 2.3) * 1.5, 0.55);
  PRES.v = sh.w;
}
// (the scenarios read the shared uniforms here: a fresh import of this module after a hot update is another instance)
if (typeof window !== 'undefined') (window.__act5 ||= {}).sea = SEA;
// gfx.js setAtmosphere(): the aurora's brightness and darkness from the ATMOS entry (missing keys read 0)
// (and its colour: ATMOS aurCol, the coast's green when the entry has none)
const AUR_COL = [0.1, 1.0, 0.46];
R.atmosHook = (a) => { SEA.uAur.value = a.aur || 0; SEA.uAurDark.value = a.aurDark || 0; SEA.uAurCol.value.setRGB(...(a.aurCol || AUR_COL)); };

// ---------- the beams ----------
// A sea-light's beam: an additive open cone from the lantern along local +z (turned by rotation.y = theta), 24 segments,
// 26 m, r 0.3 to 5, dipping toward the ground. Soft: its alpha falls off with (1 - |N.V|)^1.5 toward the
// silhouette and with length, under a manual exp2 fog, and fades out under the ground so nothing is drawn on it.
// o: { len, r0, r1, y (the lantern's height: sets the dip), color, k }. userData: setLen(d) (the Eclipse), setK(k),
// setDir(theta), point(d, out) (a world point on the axis, for the pooled light), tick(dt) (light.js: hides the cone
// beyond 45 m of the camera, glitters snow motes in it). Quality 0: no cone, the light alone (an empty group).
const BEAM_GEO = new Map();
export function beamMesh(o = {}) {
  const len = o.len ?? 26, r0 = o.r0 ?? 0.3, r1 = o.r1 ?? 5, y = o.y ?? 8;
  const g = new THREE.Group(); g.name = 'beam';
  const pivot = new THREE.Group(); g.add(pivot);
  // (dipping so its axis comes down to about 1.5 m three quarters out: from the play camera's height a level beam would
  // pass over the top of the screen, and it is its far half that sweeps the ground the hero stands on)
  const dip = Math.atan2(Math.max(0, y - 1.5), len * 0.75);
  pivot.rotation.x = dip;
  const col = new THREE.Color(o.color ?? 0xfff0d6);
  const u = { uK: { value: o.k ?? 1 }, uLen: { value: len }, uCol: { value: col }, uFogD: { value: 0.02 }, uTime: SEA.uTime, tNoise: SEA.tNoise,
    uO: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(0, 0, 1) }, uR: { value: new THREE.Vector2(r0, r1) } };
  let cone = null;
  if (R.quality >= 1) {
    noiseTex();
    const gk = len + '|' + r0 + '|' + r1;
    let geo = BEAM_GEO.get(gk);
    if (!geo) {
      geo = new THREE.CylinderGeometry(r1, r0, len, 24, 6, true);
      geo.rotateX(Math.PI / 2); geo.translate(0, 0, len / 2);
      geo.userData.shared = true; BEAM_GEO.set(gk, geo);
    }
    // (the shell's far side only, each pixel lit by the light along its own ray through the cone: where the ray passes
    // the beam's axis, how near (a soft round profile, no hard edge), how long it runs inside; faded where it passes close
    // by the eye, under the ground and in the fog; dust drifting in it. Looked down on from the play camera it glows
    // rather than paints)
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
      vertexShader: `varying vec3 vW;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform float uK; uniform float uLen; uniform vec3 uCol; uniform float uFogD; uniform float uTime; uniform sampler2D tNoise;
uniform vec3 uO; uniform vec3 uD; uniform vec2 uR;
varying vec3 vW;
void main() {
  vec3 v = normalize(vW - cameraPosition), w0 = cameraPosition - uO;
  float b = dot(v, uD), d = dot(v, w0), e = dot(uD, w0), den = max(1.0 - b * b, 1e-4);
  float t = (b * e - d) / den, s = (e - b * d) / den;
  t = max(t, 0.0); s = clamp(s, 0.0, uLen);
  vec3 pc = uO + uD * s;
  float dist = length(cameraPosition + v * t - pc), r = mix(uR.x, uR.y, s / uLen);
  float q = clamp(1.0 - dist / r, 0.0, 1.0);
  if (q <= 0.0) discard;
  float chord = 2.0 * r * sqrt(q * (2.0 - q)) / sqrt(den);
  float a = q * q * min(chord / (2.0 * r), 2.5);
  a *= smoothstep(0.0, 0.06 * uLen, s) * pow(1.0 - s / uLen, 1.6);
  a *= smoothstep(0.1, 1.6, pc.y) * smoothstep(3.0, 12.0, t);
  a *= 0.55 + 0.45 * smoothstep(0.3, 0.75, texture2D(tNoise, vec2(s * 0.09 - uTime * 0.035, dist * 0.35 + s * 0.01)).b);
  a *= mix(0.5, 1.0, smoothstep(-0.78, -0.35, v.y));
  float f = uFogD * t; a *= exp(-f * f);
  gl_FragColor = vec4(uCol * a * uK * 0.2, 1.0);
  #include <colorspace_fragment>
}`
    });
    mat.userData.own = true;
    cone = new THREE.Mesh(geo, mat);
    cone.frustumCulled = false; cone.renderOrder = 3;
    cone.onBeforeRender = () => {
      u.uFogD.value = R.scene.fog?.density ?? 0.02;
      const e = cone.matrixWorld.elements;
      u.uO.value.set(e[12], e[13], e[14]); u.uD.value.set(e[8], e[9], e[10]).normalize();
      u.uR.value.set(r0 * cone.scale.x, r1 * cone.scale.x); u.uLen.value = len * cone.scale.z;
    };
    pivot.add(cone);
  }
  let lenNow = len, motes = 0;
  const _p = new THREE.Vector3();
  g.userData = {
    kind: 'beam', cone, len,
    setLen(d) { lenNow = clamp(d, 0.5, len); if (cone) cone.scale.set(lenNow / len * 0.6 + 0.4, lenNow / len * 0.6 + 0.4, lenNow / len); },
    setK(k) { u.uK.value = k; if (cone) cone.visible = k > 0.01; },
    setDir(theta) { g.rotation.y = theta; },
    point(d, out = new THREE.Vector3()) { g.updateMatrixWorld(true); return pivot.localToWorld(out.set(0, 0, Math.min(d, lenNow))); },
    tick(dt) {
      if (!cone) return;
      g.getWorldPosition(_p);
      const near = Math.hypot(_p.x - R.cam.x, _p.z - R.cam.z) < 45 + lenNow;
      cone.visible = near && u.uK.value > 0.01;
      if (!cone.visible || !FX.add) return;
      // snow glittering in the beam: motes along its axis (20 a second, 1.2 s each)
      motes += dt * 20;
      for (; motes >= 1; motes--) {
        const s = Math.random() * lenNow, rr = (r0 + (r1 - r0) * (s / len)) * Math.sqrt(Math.random()) * 0.8, an = Math.random() * 6.283;
        pivot.localToWorld(_p.set(Math.cos(an) * rr, Math.sin(an) * rr, s));
        if (_p.y < 0.2) continue;
        FX.add.spawn({ x: _p.x, y: _p.y, z: _p.z, vx: (Math.random() - 0.5) * 0.3, vy: -0.25, vz: (Math.random() - 0.5) * 0.3, life: 1.2, size: 0.07, size1: 0.04, color: 0xfff6e8, alpha: 0.9, alpha1: 0 });
      }
    }
  };
  return g;
}

// ---------- the Skotos's skin ----------
// scene.environment is a dim studio PMREM, so a glossy skin alone would mirror nothing: instead a fresnel lit by the aurora
// (uAurCol x (1 - uAurDark)), a hot streak where the nearest beam (uBeam) falls on it, and slow pale flecks inside it
// (forgotten shapes passing). For the Skotos and its Hands (their GLBs carry extras.keepMat, so creatures.js keeps the
// material); quality 0: the fresnel only.
export function skotosSkin(mat) {
  if (!mat || mat.userData.skotos) return mat;
  noiseTex();
  mat.userData.skotos = true;
  const prev = mat.onBeforeCompile, hi = R.quality >= 1;
  const u = { tNoise: SEA.tNoise, uTime: SEA.uTime, uAurCol: SEA.uAurCol, uAurDark: SEA.uAurDark, uAur: SEA.uAur, uBeam: SEA.uBeam };
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, u);
    if (hi) sh.defines = Object.assign(sh.defines || {}, { SKOTOS_HI: '' });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSkW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vSkW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tNoise; uniform float uTime; uniform vec3 uAurCol; uniform float uAurDark; uniform float uAur; uniform vec4 uBeam[2];\nvarying vec3 vSkW;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 nV = normalize(normal), vV = normalize(vViewPosition);
    float fres = pow(max(1.0 - abs(dot(nV, vV)), 0.0), 2.6);
    totalEmissiveRadiance += uAurCol * (1.0 - uAurDark) * (0.25 + 0.75 * uAur) * fres * 0.55 + vec3(0.22, 0.16, 0.36) * fres * 0.18;
#ifdef SKOTOS_HI
    vec3 nW = inverseTransformDirection(nV, viewMatrix);
    vec4 bo = uBeam[0], bd = uBeam[1];
    if (bo.w > 0.0) {
      vec3 rel = vSkW - bo.xyz; float s = dot(rel, bd.xyz), q = length(rel - bd.xyz * s), rr = mix(0.3, 5.0, clamp(s / max(bd.w, 1.0), 0.0, 1.0));
      float inB = step(0.0, s) * step(s, bd.w) * (1.0 - smoothstep(rr * 0.6, rr, q));
      totalEmissiveRadiance += vec3(1.0, 0.86, 0.6) * inB * pow(max(dot(nW, -bd.xyz), 0.0), 3.0) * bo.w * 1.6;
    }
    vec4 nf = texture2D(tNoise, vSkW.xz * 0.21 + vec2(0.0, vSkW.y * 0.17) + vec2(uTime * 0.013, -uTime * 0.009));
    totalEmissiveRadiance += vec3(0.62, 0.66, 0.78) * smoothstep(0.82, 0.92, nf.a) * smoothstep(0.45, 0.7, nf.r) * 0.35;
#endif
  }`);
  };
  const key = mat.customProgramCacheKey?.() || mat.type;
  mat.customProgramCacheKey = () => key + '|skotos' + (hi ? 'h' : '');
  mat.needsUpdate = true;
  return mat;
}

// ---------- the setters (ai.js, world.js, story) ----------
export function setShade(i, x, z, r, k) { SEA.uShade.value[i]?.set(x, z, r, k); }
export function setWake(x, z, angle, k) { SEA.uWake.value.set(x, z, angle, k); }
// the Freeze (0 -> 1 over the cine): the swell stops where it was, the water whitens out from every shore
export function setFreezeAll(k) {
  if (k > 0 && SEA.uFreezeAll.value <= 0) SEA.uFrzT.value = SEA.uTime.value;
  SEA.uFreezeAll.value = clamp(k, 0, 1);
}
// a freeze wave racing out over Breathing-hole i's lead from (x, z) to r in dur s (dur 0: frozen at once, as on a later
// entry once the hole is sealed); all: every water cell in reach, not only the lead's (the naming's wave, slot 0)
const TW = [];
export function freezeWave(i, x, z, r, dur = 3, all = false) {
  const f = SEA.uFreeze.value[i]; if (!f) return;
  for (let k = TW.length - 1; k >= 0; k--) if (TW[k].i === i) TW.splice(k, 1);
  f.set(x, z, all ? -Math.abs(r) : Math.abs(r), dur > 0 ? 0.001 : 1);
  if (dur > 0) TW.push({ i, t: 0, dur, last: R.time });
}
// the white ring closing over hole i (p 0-1, the seal's progress; 0 clears it)
export function freezeRing(i, x, z, r, p) {
  const f = SEA.uFreeze.value[i]; if (!f) return;
  for (let k = TW.length - 1; k >= 0; k--) if (TW[k].i === i) TW.splice(k, 1);
  if (p <= 0) f.set(0, 0, 0, 0); else f.set(x, z, Math.abs(r), -clamp(p, 0.001, 1));
}
export function clearFreeze() { TW.length = 0; for (const f of SEA.uFreeze.value) f.set(0, 0, 0, 0); SEA.uFreezeAll.value = 0; }
function tickTweens() {
  let on = SEA.uFreezeAll.value > 0;
  for (const f of SEA.uFreeze.value) if (f.w !== 0 && f.z !== 0) on = true;
  SEA.uFrzOn.value = on ? 1 : 0;
  for (let k = TW.length - 1; k >= 0; k--) {
    const tw = TW[k], dt = Math.max(0, R.time - tw.last); tw.last = R.time; tw.t += dt;
    const f = SEA.uFreeze.value[tw.i], e = clamp(tw.t / tw.dur, 0.001, 1);
    f.w = 1 - (1 - e) * (1 - e);
    if (e >= 1) TW.splice(k, 1);
  }
}
