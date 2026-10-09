// Act V's sea and sky (the design's "The look"): the water over the tidal flats and the open sea, the black ice you can see
// into, the aurora (in the water and the ice in play, as a sky in the cines), the sea-lights' beams and the Skotos's skin.
// No render targets: everything is one forward pass. Every image has a quality-0 path (built first: depth colour, edge
// line, foam, shades, cracks) and the richer paths on top (two noise reads, the aurora reflection, light paths, parallax,
// the drowned lanterns). Draw order in Act V zones: ice -1, water 1, light pools, rings, blob shadows, decals 2, telegraphs 3.
import * as THREE from 'three';
import { R } from '../gfx/gfx.js';
import { FX } from '../gfx/fx.js';
import { BED_DRY, ICE_Y } from './genlib.js';
import { ENV } from '../gfx/env.js';
import { clamp } from '../core/util.js';

const V4 = () => new THREE.Vector4(0, 0, 0, 0);
// The shared uniform block (each entry a three.js uniform: materials hold these very objects). uTime becomes WIND.uTime
// (build.js). uLevel/uWetLevel: tide.js; uAur/uAurDark: gfx.js setAtmosphere (ATMOS aur, aurDark) and the cines;
// uAurFront: how much of the sky is restored, south to north; tCrack/uMap: ice.js (the crack stage per cell, R8 w x h,
// and (w, h)); uShade (x, z, r, k): dark shapes under the ice, slots 0-2 the Icemaws, 3 the Skotos and the arrival shadow;
// uGlow (x, depth, z, k): drowned lanterns (sea.js, from L.spots.drowned); uLights (x, y, z, intensity): the two nearest
// lit lanterns, uBeam (ox, oy, oz, k), (dx, dy, dz, len): the nearest beam (light.js); uFreeze (x, z, r, t): slot k the
// Breathing-hole k (t 0-1 the wave racing out over its lead; t < 0 the white ring closing over the hole, freezeRing; r < 0
// every water cell, not only the lead's); uFreezeAll: the Freeze; uWake (x, z, angle, k): the Walking Tower's wake.
// SEA.sky (a plain boolean): the aurora dome may show in the cines (act5Enter, townFires after seaLit).
export const SEA = {
  uTime: { value: 0 },
  uLevel: { value: 0 }, uWetLevel: { value: 0 },
  uAur: { value: 0 }, uAurDark: { value: 0 }, uAurFront: { value: 0 }, uAurCol: { value: new THREE.Color(0.1, 1.0, 0.46) },
  tNoise: { value: null }, tCrack: { value: null }, uMap: { value: new THREE.Vector2(1, 1) },
  uShade: { value: [V4(), V4(), V4(), V4()] },
  uGlow: { value: Array.from({ length: 8 }, V4) },
  uLights: { value: [V4(), V4()] },
  uBeam: { value: [V4(), V4()] },
  uFreeze: { value: [V4(), V4(), V4()] }, uFreezeAll: { value: 0 }, uFrzT: { value: 0 }, uFrzOn: { value: 0 },
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
  return (SEA.tNoise.value = t);
}
// until ice.js hands its crack texture over: every cell intact
function crackTex() {
  if (!SEA.tCrack.value) { const t = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat); t.needsUpdate = true; SEA.tCrack.value = t; }
  return SEA.tCrack.value;
}

// ---------- shared GLSL ----------
const COMMON = `
uniform sampler2D tNoise; uniform float uTime;
uniform float uAur; uniform float uAurDark; uniform float uAurFront; uniform vec3 uAurCol; uniform vec2 uMap;
float sH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 sH2(vec2 p) { float n = sH(p); return vec2(n, sH(p + n * 17.3)); }
// the aurora's curtains on a sheet of sky (p: metres on it, in world x/z): long east-west arcs some 70 m apart, folded
// and wandering by the noise, rayed along their length; green at the core, violet at the fringes. soft (0-1): a mirrored
// aurora is seen through a ripple, its fine curtains smeared into glows. The black aurora darkens it and eats it with
// crawling bands, except where the returning front (uAurFront, south to north) has given it back
// blur: how many metres of sheet one pixel spans (fwidth): far off the arcs merge into their haze instead of aliasing
vec3 aurora(vec2 p, float soft, float blur) {
  float t = uTime;
  vec2 q = vec2(p.x * 0.0011, p.y * 0.0034);
  vec4 n = texture2D(tNoise, q + vec2(t * 0.0011, t * 0.0003));
  float w = (n.r - 0.5) * 3.2 + (n.g - 0.5) * 1.1 + sin(p.x * 0.009 + t * 0.05) * 0.35;
  float arc = 1.0 - abs(sin(p.y * 0.045 + w)), arc2 = 1.0 - abs(sin(p.y * 0.071 - w * 0.7 + 1.3));
  float cur = (pow(arc, 3.0) * mix(0.28, 0.6, soft) + pow(arc, mix(22.0, 5.0, soft)) * mix(1.0, 0.15, soft)) * smoothstep(0.25, 0.65, n.b) * (0.6 + 0.8 * mix(n.a, 0.5, soft));
  cur += pow(arc2, mix(14.0, 5.0, soft)) * smoothstep(0.45, 0.75, n.g) * 0.45;
  cur = mix(cur, 0.09 * smoothstep(0.25, 0.65, n.b), smoothstep(4.0, 22.0, blur));
  vec3 col = mix(vec3(0.36, 0.08, 0.58), uAurCol, smoothstep(0.55, 0.95, arc));
  float zf = mix(uMap.y + 70.0, -90.0, uAurFront);
  float dk = uAurDark * (1.0 - smoothstep(zf - 30.0, zf + 30.0, p.y));
  float bands = smoothstep(0.35, 0.65, n.b + sin(p.x * 0.017 + p.y * 0.006 + t * 0.07) * 0.25);
  col = mix(col, vec3(0.14, 0.08, 0.22), dk * 0.9);
  cur *= 1.0 - dk * bands * 0.92;
  return col * cur * uAur;
}`;
// (for groundMat's G_GLINT, G_WET and G_AUR: the same uniforms and functions)
export const SEA_GLSL = () => COMMON;
export const SEA_LIT = LIT;
export const SEA_U = (extra = {}) => Object.assign({
  tNoise: SEA.tNoise, uTime: SEA.uTime, uAur: SEA.uAur, uAurDark: SEA.uAurDark, uAurFront: SEA.uAurFront, uAurCol: SEA.uAurCol, uMap: SEA.uMap
}, extra);
// the swell, the same in JS (floes, ice.js) as in the water's vertex shader
export function swellY(x, z, t = SEA.uTime.value) { return (Math.sin(x * 0.21 + z * 0.13 + t * 1.1) + Math.sin(-x * 0.09 + z * 0.27 + t * 0.83)) * 0.5; }
const SWELL = 'float swell(vec2 p, float t) { return (sin(p.x * 0.21 + p.y * 0.13 + t * 1.1) + sin(-p.x * 0.09 + p.y * 0.27 + t * 0.83)) * 0.5; }';
// the freeze state of a water point (0 open, 1 frozen; .y the bright front), from the Freeze and the three freeze slots
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
  const hi = R.quality >= 1, key = (o.low ? 'l' : 't') + (o.far ? 'f' : '') + (hi ? 'h' : '');
  if (SEA_MATS.has(key)) return SEA_MATS.get(key);
  noiseTex();
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  const u = SEA_U({ uLevel: SEA.uLevel, uFreeze: SEA.uFreeze, uFreezeAll: SEA.uFreezeAll, uFrzT: SEA.uFrzT, uFrzOn: SEA.uFrzOn, uWake: SEA.uWake, uLights: SEA.uLights }, LIT);
  Object.assign(u, LIT);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.defines = Object.assign(sh.defines || {}, hi ? { SEA_HI: '' } : {}, o.low ? { SEA_LOW: '' } : {}, o.far ? { SEA_FAR: '' } : {}, typeof location !== 'undefined' && location.search.includes('seadbg') ? { SEA_DBG: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aBed; attribute float aHold; attribute float aLead; attribute float aShore;
uniform float uLevel; uniform float uTime; uniform float uFrzT;
varying vec3 vWP; varying float vDep; varying float vLead; varying float vShore; varying float vSw; varying float vHold;
${SWELL}
${FREEZE}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
#ifdef SEA_LOW
  float dep = 0.6;
#else
  float dep = uLevel - aBed;
#endif
#ifdef SEA_FAR
  vec3 frz = vec3(0.0);
#else
  vec3 frz = freezeIf(wp0.xz, aLead, aShore);
#endif
  // the Freeze holds the swell where it stopped: the crests it caught stay as ice
  float st = mix(uTime, uFrzT, step(0.001, uFreezeAll));
  float sw = swell(wp0.xz, st);
#ifdef SEA_LOW
  float y = -0.08 + sw * 0.025;
#else
  // the surface stands clamp(depth) over the flat floor: a dry corner sits under the ground, so the ground cuts a true
  // shoreline that moves with the tide; under and beside the ice (and the jetty) it is held a hand under the ice
  float lift = clamp(dep, -0.05, 0.3);
  float y = lift + sw * mix(0.06, 0.18, smoothstep(0.2, 1.6, dep)) * smoothstep(-0.05, 0.12, lift);
  y = mix(y, -0.08 + sw * 0.02, aHold);
#endif
  y = mix(y, ${(ICE_Y - 0.005).toFixed(3)}, frz.y);
  transformed.y = y;
  vWP = vec3(wp0.x, y, wp0.z); vDep = dep; vLead = aLead; vShore = aShore; vSw = sw; vHold = aHold;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${COMMON}
uniform float uFrzT; uniform vec4 uWake; uniform vec4 uLights[2];
uniform float uAmbK; uniform vec3 uSkyC; uniform vec3 uMoonD; uniform vec3 uMoonC; uniform vec3 uHeroP; uniform vec3 uHeroC; uniform float uHeroR;
varying vec3 vWP; varying float vDep; varying float vLead; varying float vShore; varying float vSw; varying float vHold;
${FREEZE}`)
      .replace('#include <map_fragment>', `
  float t = uTime, dep = vDep;
  vec3 V = normalize(cameraPosition - vWP);
  vec2 P = vWP.xz;
  // walkable (wading) or closed: one clear step. (Beds come in 0.15 m steps, so at slack water whole flats sit at exactly
  // 0.45: they are closed, and the step lies a little under it; the corners' mean beds put it near the cells' edge)
  float deep = smoothstep(0.37, 0.43, dep);
  vec4 n1 = texture2D(tNoise, P * 0.085 + vec2(t * 0.011, t * 0.007));
#ifdef SEA_HI
  vec4 n2 = texture2D(tNoise, P * 0.21 - vec2(t * 0.009, -t * 0.016));
  vec2 g = (n1.rg - 0.5) * 1.2 + (n2.rg - 0.5) * 0.8 + (n2.ab - 0.5) * 0.25;
#else
  vec2 g = (n1.rg - 0.5) * 1.6 + (n1.ab - 0.5) * 0.3;
#endif
  // two normals: the ripple's for the glints, a calmer one for what the water mirrors (the sky is far: a fine ripple
  // would scatter it into noise)
  vec3 N = normalize(vec3(g.x * mix(0.12, 0.3, deep), 1.0, g.y * mix(0.12, 0.3, deep)));
  vec3 Nc = normalize(vec3((n1.r - 0.5) * 0.08, 1.0, (n1.g - 0.5) * 0.08));
  float NdV = clamp(dot(Nc, V), 0.0, 1.0), F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 Rf = reflect(-V, N), Rc = reflect(-V, Nc);
  // see-through grey-green where she can wade; blue-black where it is closed
  vec3 shal = vec3(0.04, 0.06, 0.062), dcol = vec3(0.004, 0.011, 0.02);
#ifdef SEA_LOW
  dcol = vec3(0.002, 0.006, 0.012);
#endif
  vec3 col = mix(shal, dcol, deep) * uAmbK;
  col += uSkyC * (0.03 + 0.5 * F) * mix(0.4, 1.0, deep);
#ifdef SEA_LOW
  // a lead: black water with a cold sheen, brash and grease ice crowding its edges
  col += uSkyC * (0.25 + 0.5 * smoothstep(0.4, 0.8, n1.r)) * 0.35;
  float brash = smoothstep(0.35, 1.0, vHold) * smoothstep(0.4, 0.75, n1.a + (n1.b - 0.5) * 0.4);
  col = mix(col, vec3(0.05, 0.06, 0.07) * uAmbK + uSkyC * 0.4, brash * 0.8);
#endif
  // the long swell: its crests catch the sky
  col += uSkyC * smoothstep(-0.2, 1.0, vSw) * 0.07 * deep;
  // the moon's glint, broken by the ripple
  col += uMoonC * pow(max(dot(Rf, uMoonD), 0.0), 300.0) * 0.35 * deep;
  // the hero's lantern: it lights the shallows and glints on the water
  vec3 hd = uHeroP - vWP; float hl = length(hd); hd /= max(hl, 0.001);
  float ha = pow(clamp(1.0 - pow(hl / uHeroR, 4.0), 0.0, 1.0), 2.0) / max(pow(hl, 1.4), 0.5);
  col += uHeroC * ha * (0.008 * (1.0 - deep) * max(hd.y, 0.0) + pow(max(dot(Rf, hd), 0.0), 60.0) * 0.03);
#ifdef SEA_HI
  // the aurora in the water: the reflected ray meets a sheet of sky 70 m up
  vec2 sp = P + Rc.xz * ((70.0 - vWP.y) / max(Rc.y, 0.04)), spw = fwidth(sp);
  if (uAur > 0.001) col += aurora(sp, 1.0, length(spw)) * (0.12 + 0.8 * F) * mix(0.25, 1.0, deep) * smoothstep(0.04, 0.3, Rc.y);
  // light paths: the long broken streaks a lit sea-light lays across the water toward the eye
  // (glints off the small ripple, so the path breaks into sparks, over a faint glow off the swell)
  vec3 Ng = normalize(vec3((n2.a - 0.5) * 0.22 + g.x * 0.05, 1.0, (n2.b - 0.5) * 0.22 + g.y * 0.05)), Rg = reflect(-V, Ng);
  for (int i = 0; i < 2; i++) {
    vec4 Lp = uLights[i];
    if (Lp.w <= 0.0) continue;
    vec3 ld = Lp.xyz - vWP; float dl = length(ld); ld /= dl;
    float s = pow(max(dot(Rg, ld), 0.0), 160.0) * 2.2 + pow(max(dot(Rc, ld), 0.0), 24.0) * 0.06;
    col += vec3(1.0, 0.82, 0.55) * s * Lp.w * deep / (1.0 + dl * 0.04);
  }
#endif
  // foam: where it meets the shore, lapping in moving lines; churned in the Walking Tower's wake
  float shore = 1.0 - smoothstep(0.01, 0.05, dep);
  float lap = smoothstep(0.7, 0.92, sin(dep * 90.0 - t * 2.2 + n1.r * 5.0) * 0.5 + 0.5) * (1.0 - smoothstep(0.03, 0.14, dep)) * smoothstep(0.35, 0.6, n1.a + n1.r * 0.3);
  float foam = max(shore * smoothstep(0.45, 0.8, n1.a + n1.g * 0.35) * 0.8, lap * 0.45) * smoothstep(0.004, 0.014, dep);
#ifndef SEA_LOW
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
  // the faint pale line along the edge of closed water
  float fw = fwidth(dep) * 1.5 + 0.004;
  float edge = (1.0 - smoothstep(fw * 0.5, fw * 1.6, abs(dep - 0.4))) * (0.75 + 0.25 * sin(t * 1.7 + P.x * 0.7 + P.y * 0.5));
  col = mix(col, vec3(0.5, 0.62, 0.68) * uAmbK, edge * 0.45);
  float a = mix(mix(0.32, 0.62, smoothstep(0.0, 0.42, dep)), 0.95, deep);
  a = max(a, edge * 0.5) * smoothstep(0.006, 0.045, dep);
  a = max(a, foam * 0.7);
#ifndef SEA_FAR
  // frozen: white rime in a frost-crystal pattern; the front glitters as it races out
  vec3 frz = freezeIf(P, vLead, vShore);
  float fk = max(frz.x, frz.y);
  if (fk > 0.001 || frz.z > 0.001) {
    vec4 nc = texture2D(tNoise, P * 0.6);
    float cry = pow(1.0 - abs(nc.a * 2.0 - 1.0), 6.0) * 0.6 + pow(1.0 - abs(nc.b * 2.0 - 1.0), 10.0) * 0.4;
    vec4 nf = texture2D(tNoise, P * 0.19 + 0.5);
    cry = max(cry, pow(1.0 - abs(nf.g * 2.0 - 1.0), 14.0) * 0.8);
    vec3 rime = mix(vec3(0.16, 0.19, 0.22), vec3(0.32, 0.36, 0.4), cry) * (0.45 + 0.55 * uAmbK) + uSkyC * 0.3;
    // (the crests the Freeze caught stand pale, their troughs in shadow)
    rime *= 1.0 + (vSw - 0.2) * 0.22 * frz.x;
    col = mix(col, rime, fk); a = mix(a, 1.0, fk);
    col += vec3(0.5, 0.7, 0.85) * frz.z * (0.35 + cry); a = max(a, frz.z * 0.8);
  }
#endif
  diffuseColor = vec4(col, a);
#ifdef SEA_DBG
  diffuseColor = vec4(clamp(dep, 0.0, 1.0), foam, deep, 1.0);
#endif`);
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
const CH = 32;
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
  const wet = (i) => !!(L.sea?.[i] || L.ice?.[i] || (L.bed && L.bed[i] < BED_DRY && !L.thick?.[i] && !L.window?.[i]) || under(i));
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
  for (let i = 0; i < N; i++) if (!wet(i) || L.thick?.[i]) { D[i] = 0; q.push(i); }
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], cx = i % w, cz = (i - cx) / w;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && D[n] > D[i] + 1) { D[n] = D[i] + 1; q.push(n); } }
  }
  const mat = seaMat({ low });
  const out = new THREE.Group(); out.name = 'sea';
  const hook = () => { SEA.uMap.value.set(w, h); };
  for (let cz0 = 0; cz0 < h; cz0 += CH) for (let cx0 = 0; cx0 < w; cx0 += CH) {
    const vid = new Map(), pos = [], bed = [], hold = [], ld = [], sh = [], idx = [];
    const vert = (vx, vz) => {
      const key = vz * W + vx;
      let k = vid.get(key);
      if (k != null) return k;
      k = pos.length / 3; vid.set(key, k);
      let ice = 0, fl = 0, le = 0, sd = 99;
      for (const [dx, dz] of CORNER) {
        const x = vx + dx, z = vz + dz; if (x < 0 || z < 0 || x >= w || z >= h) continue;
        const i = z * w + x; if (iceLike(i)) ice++; if (flat(i)) fl++; if (lead[i]) le = lead[i]; if (wet(i)) sd = Math.min(sd, D[i]);
      }
      pos.push(vx, 0, vz); bed.push(vb[key]); hold.push(ice && !fl ? 1 : 0); ld.push(le); sh.push(sd === 99 ? 0 : sd);
      return k;
    };
    for (let z = cz0; z < Math.min(h, cz0 + CH); z++) for (let x = cx0; x < Math.min(w, cx0 + CH); x++) {
      if (!wet(z * w + x)) continue;
      // (split as the ground's grid is: (x, z + 1) to (x + 1, z))
      const a = vert(x, z), b = vert(x + 1, z), c = vert(x, z + 1), d = vert(x + 1, z + 1);
      idx.push(a, c, b, c, d, b);
    }
    if (!idx.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
    geo.setAttribute('aHold', new THREE.Float32BufferAttribute(hold, 1));
    geo.setAttribute('aLead', new THREE.Float32BufferAttribute(ld, 1));
    geo.setAttribute('aShore', new THREE.Float32BufferAttribute(sh, 1));
    geo.setIndex(idx);
    geo.computeBoundingBox(); geo.boundingBox.min.y = -0.2; geo.boundingBox.max.y = 0.6; geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 1; m.receiveShadow = false; m.castShadow = false;
    m.onBeforeRender = hook;
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
    // (subdivided every 20 m: the swell and the fog want vertices, and a huge triangle loses precision on phones)
    for (const [x0, z0, x1, z1] of list) {
      const nx = Math.ceil((x1 - x0) / 20), nz = Math.ceil((z1 - z0) / 20);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const ax = x0 + ((x1 - x0) * i) / nx, bx = x0 + ((x1 - x0) * (i + 1)) / nx, az = z0 + ((z1 - z0) * j) / nz, bz = z0 + ((z1 - z0) * (j + 1)) / nz;
        pos.push(ax, y, az, ax, y, bz, bx, y, az, ax, y, bz, bx, y, bz, bx, y, az);
        for (let k = 0; k < 6; k++) { bed.push(-4); z0s.push(0); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1));
    for (const a of ['aHold', 'aLead', 'aShore']) geo.setAttribute(a, new THREE.Float32BufferAttribute(z0s, 1));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    return geo;
  };
  if (water.length) { const m = new THREE.Mesh(make(water, 0), seaMat({ low: !L.bed, far: true })); m.renderOrder = 1; g.add(m); }
  if (ice.length) { const m = new THREE.Mesh(make(ice, ICE_Y - 0.01), iceMat({ far: true })); m.renderOrder = -1; m.receiveShadow = true; g.add(m); }
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
  const m = hi ? new THREE.MeshPhongMaterial({ color: 0xffffff, specular: new THREE.Color(o.window ? 0x5a6876 : 0x3a4652), shininess: o.window ? 300 : 260 })
    : new THREE.MeshLambertMaterial({ color: 0xffffff });
  if (o.window) { m.transparent = true; m.depthWrite = false; }
  const u = SEA_U({ tCrack: SEA.tCrack, uShade: SEA.uShade, uGlow: SEA.uGlow, uLights: SEA.uLights, uFreezeAll: SEA.uFreezeAll, tIceL: { value: lay?.d || null }, uSkyC: LIT.uSkyC });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.defines = Object.assign(sh.defines || {}, hi ? { ICE_HI: '' } : {}, o.far ? { ICE_FAR: '' } : {}, o.window ? { ICE_WINDOW: '' } : {}, o.floe ? { ICE_FLOE: '' } : {}, lay ? { ICE_LAY: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aC;\nvarying vec3 vIP;\nvarying vec2 vIC;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 ipp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  ipp = instanceMatrix * ipp;
#endif
  vIP = (modelMatrix * ipp).xyz; vIC = aC;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${COMMON}
uniform sampler2D tCrack; uniform vec4 uShade[4]; uniform vec4 uGlow[8]; uniform vec4 uLights[2]; uniform sampler2D tIceL; uniform vec3 uSkyC;
varying vec3 vIP; varying vec2 vIC;
uniform float uFreezeAll;
// the edge distance of a world-space Voronoi at p (about 0 on the cell walls): the crack lines
float vEdge(vec2 p) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 gg = vec2(float(x), float(y)), r = gg + sH2(i + gg) * 0.85 + 0.075 - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}
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
  vec4 nS = texture2D(tNoise, Pr * 0.045);
#if defined(ICE_HI) && !defined(ICE_WINDOW)
  // read through the surface: what lies deeper slides further as the eye moves
  vec4 nB = texture2D(tNoise, mat2(0.6, 0.8, -0.8, 0.6) * (P + par * 0.3) * 0.9 + 0.13);
  vec4 nD = texture2D(tNoise, (Pr + par * 1.6) * 0.09 + 0.37);
#else
  vec4 nB = nS.abgr, nD = nS.gbar;
#endif
  // black water seen through clear ice, its depth mottled; pale veils of trapped air lower down; small bubbles in
  // clusters near the surface; frost and drifted snow on top
  vec3 col = mix(vec3(0.0015, 0.0045, 0.009), vec3(0.004, 0.011, 0.018), smoothstep(0.3, 0.75, nD.r * 0.7 + nD.g * 0.3));
  col += vec3(0.006, 0.011, 0.015) * smoothstep(0.62, 0.85, nD.b);
  float bub = smoothstep(0.78, 0.9, nB.a) * smoothstep(0.55, 0.75, nB.r);
  col += vec3(0.07, 0.09, 0.1) * bub;
  // (snow drifts lie in streaks along the wind, grained)
  vec4 nW = texture2D(tNoise, vec2(P.x * 0.022 + P.y * 0.006, P.y * 0.075) + 0.71);
  float frost = smoothstep(0.58, 0.72, nW.r * 0.75 + nW.b * 0.25 + (nB.a - 0.5) * 0.12) * 0.55 + smoothstep(0.72, 0.9, nS.b) * 0.1;
#ifdef ICE_LAY
  vec3 lay = texture2D(tIceL, P * 0.32).rgb;
  col *= 0.55 + lay * 1.1;
  frost = max(frost, smoothstep(0.6, 0.9, dot(lay, vec3(0.33))) * 0.35);
#endif
  col = mix(col, vec3(0.26, 0.3, 0.34) * (0.75 + 0.5 * nB.g), frost * 0.55);
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
  // drowned lanterns glowing a few metres down, and their light caught in the ice
  for (int i = 0; i < 8; i++) {
    vec4 gl = uGlow[i];
    if (gl.w <= 0.0) continue;
    vec2 qq = P + par * gl.y - gl.xz; float d2 = dot(qq, qq);
    vec2 q2 = P + par * gl.y * 0.35 - gl.xz; float e2 = dot(q2, q2);
    iceEm += vec3(1.0, 0.62, 0.26) * gl.w * (exp(-d2 * 1.6) * 1.4 + exp(-e2 * 0.09) * 0.16) * (0.85 + 0.15 * sin(t * 2.3 + gl.x));
  }
#endif
  // cracks, stage by stage: a hairline through the cell, a star of three, then crazed white; slush: grey brash with
  // black water between the bits
  if (st > 0.5) {
    vec2 Pw = P + (nB.gr - 0.5) * 0.1;
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
        float along = dot(cv, dir), dd = abs(dot(cv, vec2(-dir.y, dir.x)) + sin(along * 17.0 + hc.y * 9.0) * 0.02);
        c = max(c, (1.0 - smoothstep(0.004, 0.02, dd)) * (1.0 - smoothstep(reach * 0.5, reach, abs(along))));
      }
      if (st > 2.5) { c = max(c, (1.0 - smoothstep(0.0, 0.035, vEdge(Pw * 3.2))) * 0.7); col = mix(col, vec3(0.32, 0.37, 0.42), 0.25 + 0.3 * nB.g); }
      col = mix(col, vec3(0.62, 0.7, 0.75), c * 0.9);
      iceEm += vec3(0.1, 0.13, 0.15) * c * 0.15;
    }
  }
#ifdef ICE_WINDOW
  // the clear pane: frost round its edge, black glass in the middle
  vec2 ef = abs(fract(P) - 0.5);
  float rim = smoothstep(0.38, 0.5, max(ef.x, ef.y));
  col = mix(vec3(0.02, 0.05, 0.08), vec3(0.6, 0.68, 0.74), rim * 0.4);
#endif
#if !defined(ICE_FAR) && !defined(ICE_FLOE)
  // fresh rime as the Freeze passes over
  col = mix(col, vec3(0.55, 0.62, 0.68), uFreezeAll * 0.5);
#endif
  // glassy: the sky in it at a low angle
  vec3 Nr = normalize(vec3((nS.g - 0.5) * 0.06, 1.0, (nS.b - 0.5) * 0.06));
  float F = 0.03 + 0.97 * pow(1.0 - clamp(dot(Nr, V), 0.0, 1.0), 5.0);
  iceEm += uSkyC * F * 0.5 * (1.0 - frost);
#ifdef ICE_HI
  // the aurora mirrored in the ice; the lit sea-lights' lanterns
  vec3 Rf = reflect(-V, Nr);
  vec2 sp = P + Rf.xz * ((70.0 - vIP.y) / max(Rf.y, 0.04)), spw = fwidth(sp);
  if (uAur > 0.001) iceEm += aurora(sp, 1.0, length(spw)) * (0.1 + 0.7 * F) * (1.0 - frost * 0.6) * smoothstep(0.04, 0.3, Rf.y);
  for (int i = 0; i < 2; i++) {
    vec4 Lp = uLights[i];
    if (Lp.w <= 0.0) continue;
    vec3 ld = Lp.xyz - vIP; float dl = length(ld); ld /= dl;
    iceEm += vec3(1.0, 0.82, 0.55) * (pow(max(dot(Rf, ld), 0.0), 60.0) + pow(max(dot(Rf, ld), 0.0), 8.0) * 0.05) * Lp.w * 0.9 / (1.0 + dl * 0.04);
  }
#endif
  diffuseColor.rgb = col;
#ifdef ICE_WINDOW
  diffuseColor.a = 0.35 + 0.5 * pow(1.0 - clamp(dot(V, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 2.0) + rim * 0.3;
#endif`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += iceEm;');
  };
  m.customProgramCacheKey = () => 'ice|' + key + (lay ? '|l' : '');
  ICE_MATS.set(key, m);
  return m;
}
// The ice of a level: the thin-ice cells as an opaque mesh at ICE_Y (chunked), a short skirt where it meets open water (its
// thickness shows), the windows as their own clear mesh, and a pool of 32 floe shards (count 0: ice.js places them).
// Returns { mesh, windows, floes }; userData.L on the mesh. The drowned lanterns (L.spots.drowned) feed uGlow while this
// level draws.
export function buildIce(L, group, quality = R.quality) {
  const { w, h } = L, W = w + 1;
  const thin = (x, z) => x >= 0 && z >= 0 && x < w && z < h && !!L.ice[z * w + x];
  const open = (x, z) => x < 0 || z < 0 || x >= w || z >= h ? true : !!(L.sea?.[z * w + x] || (L.bed && L.bed[z * w + x] < -0.45 && !L.thick?.[z * w + x] && !L.ice[z * w + x]));
  const mat = iceMat();
  const mesh = new THREE.Group(); mesh.name = 'ice';
  const Y = ICE_Y, SK = -0.3;
  for (let cz0 = 0; cz0 < h; cz0 += CH) for (let cx0 = 0; cx0 < w; cx0 += CH) {
    const vid = new Map(), pos = [], cc = [], idx = [];
    const vert = (vx, vz) => { const k0 = vz * W + vx; let k = vid.get(k0); if (k != null) return k; k = pos.length / 3; vid.set(k0, k); pos.push(vx, Y, vz); cc.push(-1, -1); return k; };
    const skirt = (ax, az, bx, bz, cx, cz) => { const k = pos.length / 3; pos.push(ax, Y, az, bx, Y, bz, ax, SK, az, bx, SK, bz); for (let j = 0; j < 4; j++) cc.push(cx, cz); idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); };
    for (let z = cz0; z < Math.min(h, cz0 + CH); z++) for (let x = cx0; x < Math.min(w, cx0 + CH); x++) {
      if (!thin(x, z)) continue;
      const a = vert(x, z), b = vert(x + 1, z), c = vert(x, z + 1), d = vert(x + 1, z + 1);
      idx.push(a, c, b, c, d, b);
      // (wound to face out of the cell, toward the water)
      if (open(x, z + 1)) skirt(x, z + 1, x + 1, z + 1, x + 0.5, z + 0.5);
      if (open(x, z - 1)) skirt(x + 1, z, x, z, x + 0.5, z + 0.5);
      if (open(x - 1, z)) skirt(x, z, x, z + 1, x + 0.5, z + 0.5);
      if (open(x + 1, z)) skirt(x + 1, z + 1, x + 1, z, x + 0.5, z + 0.5);
    }
    if (!idx.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aC', new THREE.Float32BufferAttribute(cc, 2));
    geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = -1; m.receiveShadow = quality >= 1;
    mesh.add(m);
  }
  // the windows: a clear pane over each pit (the figure lies 2.2 m down)
  let windows = null;
  if (L.window) {
    const pos = [];
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if (L.window[z * w + x]) pos.push(x, Y, z, x, Y, z + 1, x + 1, Y, z, x, Y, z + 1, x + 1, Y, z + 1, x + 1, Y, z);
    if (pos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aC', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2).fill(-1), 2));
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
  floes.count = 0; floes.frustumCulled = false; floes.castShadow = false; floes.receiveShadow = quality >= 1;
  group.add(floes);
  // this level's drowned lanterns, written to uGlow while it draws (zones are cached: each keeps its own)
  const glow = Array.from({ length: 8 }, V4);
  (L.spots?.drowned || []).slice(0, 8).forEach((d, i) => glow[i].set(d.glow?.x ?? d.x, Math.max(0.5, -(d.glow?.y ?? -2.4)), d.glow?.z ?? d.z, 1));
  const hook = () => { SEA.uGlow.value = glow; SEA.uMap.value.set(w, h); };
  for (const m of mesh.children) m.onBeforeRender = hook;
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
export function auroraSky() {
  if (dome) return dome;
  noiseTex();
  const geo = new THREE.SphereGeometry(110, 40, 14, 0, Math.PI * 2, 0, Math.PI * 0.56);
  geo.userData.shared = true;
  const u = SEA_U({ uHor: { value: new THREE.Color() }, uTop: { value: new THREE.Color(0x02040a) } });
  const mat = new THREE.ShaderMaterial({
    uniforms: u, depthWrite: false, fog: false, side: THREE.BackSide,
    vertexShader: 'varying vec3 vD; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vD = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `${COMMON}
uniform vec3 uHor; uniform vec3 uTop; varying vec3 vD;
void main() {
  vec3 D = normalize(vD);
  float e = clamp(D.y, 0.0, 1.0), hz = smoothstep(0.0, 0.32, e), t = uTime;
  vec3 col = mix(uHor, uTop, hz);
  // stars: one in a few hundred cells of a grid on the sky
  vec2 sp = D.xz / (D.y + 0.2) * 70.0, c = floor(sp);
  float hs = sH(c), star = step(0.982, hs) * (1.0 - smoothstep(0.05, 0.22, length(fract(sp) - 0.5 - (sH2(c + 3.1) - 0.5) * 0.6))) * smoothstep(0.02, 0.2, e);
  star *= 0.6 + 0.4 * sin(t * (1.5 + hs * 3.0) + hs * 40.0);
  // the curtains as seen from the ground: three hang over the north, each a hem that wanders along the horizon
  // (azimuth), green at the hem and fading violet as it rises, combed into rays; the dark and its returning front
  // read where the curtain stands over the land (about 90 m out)
  float az = atan(D.x, -D.z), el = asin(clamp(D.y, 0.0, 1.0));
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    vec4 n = texture2D(tNoise, vec2(az * (0.16 + fk * 0.05) + fk * 0.31 + t * 0.0018, fk * 0.37 + t * 0.0009));
    float hem = 0.07 + fk * 0.09 + (n.r - 0.5) * 0.22 + sin(az * (2.0 + fk) + t * 0.05 + fk) * 0.04 + sin(az * (9.0 + fk * 4.0) - t * 0.11 + n.b * 4.0) * 0.012;
    float up = el - hem;
    float sheet = smoothstep(-0.012, 0.004, up) * exp(-max(up, 0.0) * (5.0 + fk * 2.0));
    float rays = 0.45 + 0.9 * texture2D(tNoise, vec2(az * 2.6 + fk * 1.7 + t * 0.004, up * 0.6 + fk)).a;
    float lit = smoothstep(0.3, 0.7, n.g) * (1.0 - fk * 0.22);
    vec3 cc = mix(uAurCol, vec3(0.42, 0.12, 0.62), smoothstep(0.0, 0.3, up)) * (1.0 + 1.2 * exp(-max(up, 0.0) * 60.0));
    acc += cc * sheet * rays * lit;
  }
  vec2 wp = cameraPosition.xz + D.xz / max(D.y, 0.08) * 12.0;
  float zf = mix(uMap.y + 70.0, -90.0, uAurFront), dk = uAurDark * (1.0 - smoothstep(zf - 30.0, zf + 30.0, wp.y));
  float bands = smoothstep(0.35, 0.65, texture2D(tNoise, vec2(az * 0.5 - t * 0.003, el * 0.8)).b);
  acc = mix(acc, vec3(dot(acc, vec3(0.3))) * vec3(0.5, 0.3, 0.8), dk * 0.85) * (1.0 - dk * bands * 0.9);
  acc *= uAur * 0.5 * smoothstep(0.0, 0.03, e);
  col += acc + vec3(0.75, 0.8, 0.9) * star * (1.0 - clamp(dot(acc, vec3(1.5)), 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
  });
  dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false; dome.renderOrder = -10; dome.visible = false; dome.name = 'auroraSky';
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); u.uHor.value.copy(R.scene.background); };
  R.scene.add(dome);
  return dome;
}
// gfx.js render(): the dome shows while the sky may (SEA.sky) and the camera looks low enough to see any of it
R.skyHook = () => {
  frameHook();
  const on = SEA.sky && R.cam.pitch <= 0.34;
  if (on && !dome) auroraSky();
  if (dome) { dome.visible = on; if (on && dome.parent !== R.scene) R.scene.add(dome); }
  tickTweens();
};
// gfx.js setAtmosphere(): the aurora's brightness and darkness from the ATMOS entry (missing keys read 0)
R.atmosHook = (a) => { SEA.uAur.value = a.aur || 0; SEA.uAurDark.value = a.aurDark || 0; };

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
  const u = { uK: { value: o.k ?? 1 }, uLen: { value: len }, uCol: { value: col }, uFogD: { value: 0.02 }, uFogC: { value: new THREE.Color() }, uTime: SEA.uTime };
  let cone = null;
  if (R.quality >= 1) {
    const gk = len + '|' + r0 + '|' + r1;
    let geo = BEAM_GEO.get(gk);
    if (!geo) {
      geo = new THREE.CylinderGeometry(r1, r0, len, 24, 6, true);
      geo.rotateX(Math.PI / 2); geo.translate(0, 0, len / 2);
      geo.userData.shared = true; BEAM_GEO.set(gk, geo);
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: `varying vec3 vW; varying vec3 vN; varying float vS;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vS = position.z; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform float uK; uniform float uLen; uniform vec3 uCol; uniform float uFogD; uniform vec3 uFogC; uniform float uTime;
varying vec3 vW; varying vec3 vN; varying float vS;
void main() {
  vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
  float s = clamp(vS / uLen, 0.0, 1.0);
  float a = 1.0 - pow(1.0 - abs(dot(normalize(vN), V)), 1.5);
  a *= a;
  a *= smoothstep(0.0, 0.06, s) * pow(1.0 - s, 1.6) * (0.75 + 0.25 * sin(s * 9.0 - uTime * 1.3));
  a *= smoothstep(0.1, 1.6, vW.y);
  float f = uFogD * dist; a *= exp(-f * f);
  gl_FragColor = vec4(uCol * a * uK * 0.22, 1.0);
  #include <colorspace_fragment>
}`
    });
    cone = new THREE.Mesh(geo, mat);
    cone.frustumCulled = false; cone.renderOrder = 3;
    cone.onBeforeRender = () => { u.uFogD.value = R.scene.fog?.density ?? 0.02; };
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
    float fres = pow(1.0 - abs(dot(nV, vV)), 2.6);
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
