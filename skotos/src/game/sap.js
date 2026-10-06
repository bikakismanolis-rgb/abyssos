// Amber sap (Act III): the one thing in the Weeping Woods that pins you.
// Gen-time sap is a cell mask (L.sap); fresh pools come from weeping trees, Rootwardens, dying Hollowed and the
// Hart's and the Lady's amber. Pools are discs or rings (the Flood) that set, glisten and fade; at most 24 live at once.
// What sap does is decided elsewhere: the hero's slow and amber-lock in player.js, the monsters' slow and the
// chargers' daze in ai.js. Drips: startDrips(L.weepers) / stopDrips(), ticked from updateAreas.
import * as THREE from 'three';
import { G, later } from './state.js';
import { R } from '../gfx/gfx.js';
import { P, teleCircle } from '../gfx/fx.js';
import { rand } from '../core/util.js';

export const SAP_CAP = 24;
const pools = [];
const drips = { list: null, zone: null, t: 0 };

// ---------- the look: a glossy amber stain with soft, lobed edges (a ring for the Flood) ----------
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FS = `
varying vec2 vUv; uniform float uA; uniform float uIn; uniform float uSeed; uniform float uT;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 p = vUv * 2.0 - 1.0; float d = length(p);
  float edge = 0.86 + (n(p * 3.0 + uSeed) - 0.5) * 0.22;
  float a = smoothstep(edge, edge - 0.12, d);
  if (uIn > 0.0) a *= smoothstep(uIn - 0.02, uIn + 0.1 + (n(p * 4.0) - 0.5) * 0.08, d);
  if (a <= 0.01) discard;
  // deep amber in the middle, bright gold at the meniscus, a slow glint across the surface
  float rim = smoothstep(edge - 0.3, edge - 0.05, d);
  vec3 c = mix(vec3(0.55, 0.26, 0.03), vec3(1.0, 0.68, 0.18), rim * 0.8 + n(p * 9.0) * 0.15);
  c += vec3(1.0, 0.85, 0.5) * pow(max(0.0, sin(p.x * 3.0 + p.y * 2.0 + uT * 0.8 + uSeed)), 40.0) * 0.3 * (0.6 + n(p * 5.0 + uT * 0.2));
  gl_FragColor = vec4(c, a * uA * 0.82);
}`;
const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
function poolMesh(r, inner) {
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uIn: { value: inner }, uSeed: { value: Math.random() * 50 }, uT: { value: 0 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false }));
  m.scale.set(r, 1, r); m.renderOrder = 2;
  return m;
}

// ---------- queries ----------
// is there sap at (x, z)? ignore: a charge whose own trail does not count (see ai.js dashStep)
export function sapAt(x, z, ignore) {
  const L = G.zone?.L;
  if (L?.sap) { const ix = Math.floor(x), iz = Math.floor(z); if (ix >= 0 && iz >= 0 && ix < L.w && iz < L.h && L.sap[iz * L.w + ix]) return true; }
  for (let i = 0; i < pools.length; i++) {
    const p = pools[i];
    if (p.t > p.dur || (ignore && p.owner === ignore)) continue;
    const dx = x - p.x, dz = z - p.z, d2 = dx * dx + dz * dz;
    if (d2 < p.r * p.r * 0.8 && d2 >= p.r0 * p.r0) return true;
  }
  return false;
}
export const sapPools = () => pools;

// ---------- pools ----------
// a fresh pool of sap: r metres for dur seconds (owner tags a charge's own trail)
export function addSapPool(x, z, r = 1.8, dur = 6, owner = null) { return add(x, z, 0, r, dur, owner); }
// a ring of sap between r0 and r1 (the Flood leaves the outer chamber set in amber)
export function addSapRing(x, z, r0, r1, dur = 6) { return add(x, z, r0, r1, dur, null); }
function add(x, z, r0, r, dur, owner) {
  while (pools.length >= SAP_CAP) drop(0);
  const p = { x, z, r0, r, dur, t: 0, owner, mesh: poolMesh(r, r0 / r) };
  p.mesh.position.set(x, 0.035 + pools.length * 0.0004, z);
  R.scene.add(p.mesh);
  pools.push(p);
  // a wet splash as it lands
  for (let i = 0; i < Math.min(18, 6 + r * 4); i++) { const a = Math.random() * 6.28, s = rand.range(1, 3); P({ add: false, x: x + Math.sin(a) * rand.range(r0, r) * 0.6, y: 0.2, z: z + Math.cos(a) * rand.range(r0, r) * 0.6, vx: Math.sin(a) * s, vy: rand.range(1.5, 3.5), vz: Math.cos(a) * s, life: 0.6, size: 0.12, size1: 0.06, color: 0xe0a030, alpha: 1, grav: 14 }); }
  return p;
}
function drop(i) { const p = pools[i]; R.scene.remove(p.mesh); p.mesh.material.dispose(); pools.splice(i, 1); }

export function updateSap(dt) {
  for (let i = pools.length - 1; i >= 0; i--) {
    const p = pools[i]; p.t += dt;
    const u = p.mesh.material.uniforms;
    u.uA.value = Math.min(1, p.t / 0.3) * Math.min(1, (p.dur - p.t) / 1.0);
    u.uT.value += dt;
    if (p.t >= p.dur) { drop(i); continue; }
    // a lazy glint now and then
    if (Math.random() < dt * p.r * 0.6) P({ x: p.x + rand.range(-p.r, p.r) * 0.6, y: 0.06, z: p.z + rand.range(-p.r, p.r) * 0.6, life: 0.5, size: 0.14, size1: 0.02, color: 0xffe0a0 });
  }
  tickDrips(dt);
}
export function clearSap() { while (pools.length) drop(pools.length - 1); }

// ---------- drips: the weeping trees let fall a slow drop of amber near the hero every 10-16 s ----------
export function startDrips(list) { drips.list = list && list.length ? list : null; drips.zone = G.zone; drips.t = rand.range(4, 8); }
export function stopDrips() { drips.list = null; drips.zone = null; }
function tickDrips(dt) {
  if (!drips.list) return;
  const pl = G.player, z = G.zone;
  if (!pl || z !== drips.zone) { if (z !== drips.zone) stopDrips(); return; }
  drips.t -= dt;
  if (drips.t > 0) return;
  drips.t = rand.range(10, 16);
  let best = null, bd = 100;
  for (const w of drips.list) { const d2 = (w.x - pl.x) ** 2 + (w.z - pl.z) ** 2; if (d2 < bd) { bd = d2; best = w; } }
  if (!best) return;
  // under the boughs, on the side toward the hero
  const d = Math.sqrt(bd), k = Math.min(2.4, d) / (d || 1);
  const f = z.map.nearestFloor(best.x + (pl.x - best.x) * k, best.z + (pl.z - best.z) * k, 3);
  teleCircle(f.x, f.z, 1.4, 1.2, 0xffb030);
  dripFall(f.x, f.z, 1.2, () => addSapPool(f.x, f.z, 1.4, 6));
}
// a long gold drop out of the canopy, landing after dur seconds (not if the hero has left the zone meanwhile)
function dripFall(x, z, dur, land) {
  const n = 10, z0 = G.zone;
  for (let k = 0; k < n; k++) {
    const at = dur * (0.55 + 0.45 * (k / n));
    later(at, () => P({ x, y: 7 * (1 - k / n), z, vy: -9, life: 0.12, size: 0.22, size1: 0.12, color: 0xffd070, color1: 0xff9010 }));
  }
  later(dur, () => { if (G.zone === z0) land(); });
}
