// Light and Shroud (Act IV). On the Field of Ash and in the Ashen Forge light decides what the dead can be hurt by:
// the Shrouded take 30% outside it (combat.js). What is lit: the hero's Ember Cradle (a 6 m ring; 9 m for 8 s after it
// drinks a fire; a boss may override it, setHeroLight), lit interactables (it.lit && it.lightR: waylamps, braziers, the
// bellows' fire-pits), burning ground (G.areas 'fire') and pools (addLightPool: an Ashwing's rib-coal, Isarn's lantern,
// the ghosts' pools). Nothing here runs outside ashfield/forge (LIGHT.force turns it on anywhere, for tests).
import * as THREE from 'three';
import { G } from './state.js';
import { R, addLight, removeLight } from '../gfx/gfx.js';
import * as FXM from '../gfx/fx.js';
import * as B from '../world/build.js';
import { tex } from '../gfx/textures.js';
import { attachUpright } from './actors.js';
import Audio from '../audio/audio.js';
import { emit } from '../ui/bus.js';
import { clamp, damp, rand } from '../core/util.js';

const ZONES = new Set(['ashfield', 'forge']);
export const LIGHT = { force: false, base: 6, swell: 9, swellT: 8 };
const S = { zone: null, pools: [], over: null, owner: null, dark: null, swellT: 0, halfT: 0, sipT: 0, streamT: 0, ring: null, ringR: 6, cradle: null, cradleAv: null, flame: null, range0: 15 };
const V = new THREE.Vector3();

export const lightOn = () => LIGHT.force || ZONES.has(G.zone?.id);

// ---------- queries ----------
// is (x, z) in light? Everywhere is, outside the Act IV zones
export function lightAt(x, z) {
  if (!lightOn()) return true;
  for (const p of S.pools) if (p.r > 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < p.r * p.r) return true;
  // Karthax has drunk every fire: only the pools are left (Isarn's lantern, the ghosts)
  if (S.dark) return false;
  const pl = G.player, hr = heroLightR();
  if (pl && !pl.dead && hr > 0 && (pl.x - x) ** 2 + (pl.z - z) ** 2 < hr * hr) return true;
  if (lampAt(x, z)) return true;
  for (const a of G.areas) if (a.kind === 'fire' && a.t <= a.dur && (a.x - x) ** 2 + (a.z - z) ** 2 < (a.r + 1.5) ** 2) return true;
  return false;
}
// lit by a lamp, a brazier or a fire-pit (what blinds a landing Ashwing)
export function lampAt(x, z) {
  for (const it of G.zone?.interact || []) if (it.lit && it.lightR && (it.x - x) ** 2 + (it.z - z) ** 2 < it.lightR * it.lightR) return it;
  return null;
}
// the Cradle's ring: 6 m, 9 m while swollen, halved for a while when a Smoke-eater gets a claw in it; a boss may set it
export function heroLightR() {
  if (S.over != null) return S.over;
  return (S.swellT > 0 ? LIGHT.swell : LIGHT.base) * (S.halfT > 0 ? 0.5 : 1);
}
// a boss's darkness: r metres (2.5 in Ivar's dark, 0 in Karthax's last fire) until null, or until the owner dies
export function setHeroLight(r, owner = null) { S.over = r; S.owner = r == null ? null : owner; }
// only the pools give light (Karthax's Last Fire), until off or the owner dies
export function setLightDark(on, owner = null) { S.dark = on ? owner || true : null; }
export function halveCradle(t = 4) { S.halfT = Math.max(S.halfT, t); }
export const cradleSwollen = () => S.swellT > 0;

// ---------- the lamps a Smoke-eater eats: interactables that say they can be put out (it.snuff), or of a lamp kind ----------
const LAMPS = new Set(['waylamp', 'brazier', 'bellows', 'firepit']);
export const isLamp = (it) => !!(it.snuff || LAMPS.has(it.kind));
// the nearest lamp within r that is lit (lit = true) or dark (lit = false)
export function lampNear(x, z, r, lit = true, skip = null) {
  let best = null, bd = r * r;
  for (const it of G.zone?.interact || []) {
    if (!isLamp(it) || !!it.lit !== lit || it === skip) continue;
    const d2 = (it.x - x) ** 2 + (it.z - z) ** 2; if (d2 < bd) { bd = d2; best = it; }
  }
  return best;
}
// put a lamp out (the story's it.snuff decides what that means for a waylamp, a brazier, a bellows fire-pit)
export function snuffLamp(it, by = null) {
  if (!it?.lit) return;
  if (it.snuff) it.snuff(by); else it.lit = false;
  FXM.puff?.(it.x, 1.4, it.z, 8, 0x2a2624, 1, 0.8, 1.4);
  emit('lampSnuffed', it, by);
}
// a Gorged Smoke-eater's death gives its fire back to the nearest dark lamp within r
export function relightNear(x, z, r) {
  const it = lampNear(x, z, r, false); if (!it) return null;
  if (it.relight) it.relight(); else it.lit = true;
  FXM.glowBurst?.(it.x, 1.5, it.z, 0xffb050, 24, 3, 0.3, 0.6);
  emit('lampRelit', it);
  return it;
}

// ---------- pools ----------
// a disc of light r metres for dur seconds (Infinity: until removed). o: { owner (gone with it), fx: false (no glow of its
// own), color, intensity }. The pool is a plain object: move it (x, z) or resize it (r) freely; shrink(p, r, t) for a while.
export function addLightPool(x, z, r, dur = Infinity, tag = null, o = {}) {
  const p = { x, z, r, r0: r, t: 0, dur, tag, owner: o.owner || null, shrinkT: 0, color: o.color ?? 0xffc070 };
  if (o.fx !== false) {
    p.light = addLight({ x, y: 1.8, z, color: p.color, intensity: o.intensity ?? 12 + r * 2, range: r * 2, flicker: o.flicker ?? 0.12 });
    p.mesh = discMesh(p.color, 0.3); p.mesh.position.set(x, 0, z); p.mesh.scale.setScalar(r); B.drape(p.mesh, G.zone?.L); R.scene.add(p.mesh);
  }
  S.pools.push(p);
  return p;
}
export function removeLightPool(q) {
  for (let i = S.pools.length - 1; i >= 0; i--) { const p = S.pools[i]; if (p === q || (typeof q === 'string' && p.tag === q)) dropPool(i); }
}
export const getLightPool = (tag) => S.pools.find((p) => p.tag === tag) || null;
export const lightPools = () => S.pools;
export function shrinkPool(p, r, t) { if (!p) return; p.r = Math.min(p.r, r); p.shrinkT = Math.max(p.shrinkT, t); }
function dropPool(i) {
  const p = S.pools[i];
  if (p.light) removeLight(p.light);
  if (p.mesh) { R.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  S.pools.splice(i, 1);
}

// ---------- looks: a soft additive disc (pools, and the Cradle's ring when the world has none) ----------
const DISC_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const DISC_FS = `varying vec2 vUv; uniform vec3 uColor; uniform float uA; uniform float uRim;
void main(){ float d = length(vUv * 2.0 - 1.0); if (d > 1.0) discard;
  float a = (1.0 - smoothstep(0.55, 1.0, d)) * 0.45 + uRim * smoothstep(0.86, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d)) * 2.2;
  gl_FragColor = vec4(uColor * a * uA, 1.0); }`;
// (each its own geometry: on the Act IV slopes it is laid over the ground where it lies, build.js drape)
function discMesh(color, a, rim = 0.6) {
  const m = new THREE.Mesh(B.drapable(new THREE.PlaneGeometry(2, 2, 16, 16).rotateX(-Math.PI / 2), 0.07), new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: a }, uRim: { value: rim } }, vertexShader: DISC_VS, fragmentShader: DISC_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.renderOrder = 2; m.frustumCulled = false;
  return m;
}
// the hero's ring: the world's (act4Prop 'lightRing', radius 1) or a warm disc of our own
function heroRing() {
  if (S.ring) return S.ring;
  let o = null;
  try { o = B.act4Prop?.('lightRing'); } catch (e) { o = null; }
  S.ring = o?.children.length ? o : discMesh(0xffa850, 0.32, 0.9);
  S.ring.renderOrder = 2;
  return S.ring;
}
// the Ember Cradle: the world's small iron brazier (act4Prop 'cradle') or ours: an iron cup with a flame in it
function cradleMesh() {
  let o = null;
  try { o = B.act4Prop?.('cradle'); } catch (e) { o = null; }
  // the world's is a brazier you could set down; on the hip it is carried small
  if (o?.children.length) { const g = new THREE.Group(); o.scale.setScalar(0.62); g.add(o); g.userData = o.userData; return g; }
  const g = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.7, roughness: 0.5 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.1, 8, 1, true), iron); cup.position.y = 0.05; g.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 4, 12), iron); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; g.add(rim);
  for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4), iron); leg.position.set(Math.sin(i * 2.1) * 0.06, -0.03, Math.cos(i * 2.1) * 0.06); g.add(leg); }
  const coal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 5), new THREE.MeshBasicMaterial({ color: 0xff7020 })); coal.position.y = 0.08; coal.scale.y = 0.5; g.add(coal);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  fl.position.y = 0.17; fl.scale.set(0.22, 0.3, 1); g.add(fl);
  g.userData.flame = fl;
  return g;
}
function attachCradle(av) {
  if (S.cradle) S.cradle.parent?.remove(S.cradle);
  S.cradle = cradleMesh();
  // on the left hip, clear of the sword arm
  if (!attachUpright(av, 'hips', S.cradle, 0.19, -0.04, -0.02)) { S.cradle.position.set(0.22, 0.95, 0); av.group.add(S.cradle); }
  S.cradleAv = av;
}
// where the fire goes when the Cradle drinks
export function cradlePoint(out = V) {
  const pl = G.player;
  if (S.cradle?.parent) return S.cradle.getWorldPosition(out);
  return out.set(pl.x, 1, pl.z);
}

// ---------- the Cradle drinks: fire inside its ring streams into it, burns out twice as fast, and the ring swells ----------
function drink(dt, pl) {
  if (S.over != null || S.dark) return;
  const r = heroLightR();
  let n = 0;
  S.streamT -= dt;
  const at = S.streamT <= 0 ? cradlePoint(V) : null;
  if (at) S.streamT = 0.12;
  for (const a of G.areas) {
    if (a.kind !== 'fire' || a.t > a.dur || Math.hypot(a.x - pl.x, a.z - pl.z) > r + a.r * 0.5) continue;
    n++; a.t += dt;
    if (!at) continue;
    if (FXM.fireStream) FXM.fireStream({ x: a.x, y: 0.4, z: a.z }, { x: at.x, y: at.y, z: at.z });
    else for (let k = 0; k < 3; k++) {
      const sx = a.x + rand.range(-a.r, a.r) * 0.6, sz = a.z + rand.range(-a.r, a.r) * 0.6, sy = rand.range(0.2, 0.8), life = rand.range(0.35, 0.55);
      FXM.P({ x: sx, y: sy, z: sz, vx: (at.x - sx) / life, vy: (at.y - sy) / life, vz: (at.z - sz) / life, life, size: 0.3, size1: 0.08, color: 0xffc060, color1: 0xff5010 });
    }
  }
  if (!n) return;
  S.swellT = LIGHT.swellT;
  S.sipT -= dt;
  if (S.sipT <= 0) { S.sipT = 1.4; Audio.sfx('lanternDrink', { x: pl.x, z: pl.z, vol: 0.7 }); }
}

// ---------- per frame (from player.js, after the hero has moved) ----------
export function tickLight(dt) {
  const z = G.zone, pl = G.player;
  // a new zone (leaveZone has already cleared the last one's pools and darkness): the atmosphere's reach for the hero's light
  if (z !== S.zone) { S.zone = z; S.range0 = R.heroLight.distance; }
  const on = lightOn() && pl;
  if (S.owner && (S.owner.dead || S.owner.removed)) { S.over = null; S.owner = null; }
  if (S.dark && S.dark !== true && (S.dark.dead || S.dark.removed)) S.dark = null;
  for (let i = S.pools.length - 1; i >= 0; i--) {
    const p = S.pools[i];
    p.t += dt;
    if (p.t > p.dur || (p.owner && (p.owner.dead || p.owner.removed))) { dropPool(i); continue; }
    if (p.shrinkT > 0 && (p.shrinkT -= dt) <= 0) p.r = p.r0;
    const fade = Math.min(1, (p.dur - p.t) / 1.5);
    if (p.light) { p.light.x = p.x; p.light.z = p.z; p.light.range = p.r * 2; }
    if (p.mesh) {
      const m = p.mesh, r = Math.max(0.01, p.r);
      if (m.position.x !== p.x || m.position.z !== p.z || m.scale.x !== r) { m.position.set(p.x, 0, p.z); m.scale.setScalar(r); B.drape(m, z?.L); }
      m.material.uniforms.uA.value = 0.3 * fade * (1 + Math.sin(p.t * 3 + p.x) * 0.08);
    }
  }
  if (!on) { if (S.ring) S.ring.visible = false; if (S.cradle) S.cradle.visible = false; return; }
  if (S.swellT > 0) S.swellT -= dt;
  if (S.halfT > 0) S.halfT -= dt;
  if (!pl.dead) drink(dt, pl);
  // the ring: eases to its radius, follows the hero, gone in the dark
  const r = heroLightR(), ring = heroRing();
  S.ringR = damp(S.ringR, r, 5, dt);
  if (!ring.parent) R.scene.add(ring);
  ring.visible = S.ringR > 0.15 && !pl.dead;
  ring.position.set(pl.x, 0, pl.z); ring.scale.set(Math.max(0.01, S.ringR), 1, Math.max(0.01, S.ringR));
  if (ring.visible) B.drape(ring, z.L);
  // the Cradle rides on the hero's hip (a new avatar after a change of gear gets it again)
  if (pl.avatar && S.cradleAv !== pl.avatar) attachCradle(pl.avatar);
  if (S.cradle) {
    S.cradle.visible = true;
    const U = S.cradle.userData, k = clamp(r / LIGHT.base, 0.1, 1.5);
    if (U.setFire) U.setFire(k);
    else if (U.flame) { const s = (0.8 + Math.sin(R.time * 13) * 0.08 + Math.sin(R.time * 31) * 0.05) * k; U.flame.scale.set(0.22 * s, 0.3 * s, 1); }
    if (Math.random() < 0.25 * k) { const c = cradlePoint(V); FXM.P({ x: c.x + rand.range(-0.04, 0.04), y: c.y + 0.1, z: c.z + rand.range(-0.04, 0.04), vy: rand.range(0.5, 1.1), life: 0.4, size: 0.07, size1: 0.01, color: 0xffd080, color1: 0xff4010 }); }
  }
  // the warm light it throws follows the ring (the atmosphere's reach at 6 m)
  const kk = clamp(S.ringR / LIGHT.base, 0, 1.5);
  R.heroLight.distance = Math.max(2, S.range0 * Math.max(0.3, kk));
  R.heroLight.intensity *= Math.max(0.12, Math.min(1.25, kk));
}
// on leaving a zone (projectiles.js clearProjs) and on entering one: no pools, no darkness, the Cradle at rest
export function clearLight() {
  while (S.pools.length) dropPool(S.pools.length - 1);
  S.over = null; S.owner = null; S.dark = null; S.swellT = 0; S.halfT = 0;
  if (S.ring) S.ring.visible = false;
  if (S.cradle) S.cradle.visible = false;
}
