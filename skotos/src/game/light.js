// Light: Act IV's Light and Shroud, and Act V's sea-lights. Each zone says what its light is (world.js ZONES[id].light):
// 'ember' on the Field of Ash and in the Ashen Forge, where light decides what the dead can be hurt by (the Shrouded take
// 30% outside it, combat.js) and the Cradle drinks the fires round it; 'sea' on the Frozen Coast and the Farthest Light,
// where light warms the hero (cold.js), holds the ice (ice.js) and reveals the Skotos's creatures, and the sea-lights'
// beams turn. What is lit: the hero's Ember Cradle (a ring of ZONES[id].ring metres: 6 in Act IV, 4 in Act V; 9 m for 8 s
// after it drinks, in 'ember' zones only; a boss may override it, setHeroLight), lit interactables (it.lit && it.lightR:
// waylamps, braziers, the bellows' fire-pits, sea-lights, cairns, Name-stones, hole lamps), burning ground (G.areas
// 'fire'), pools (addLightPool) and beams (addBeam). Lamp light (lampLightAt) is the steadier kind: lamps and lamp pools,
// never fire, never a beam, never a Breathing-hole's rim lamp. Nothing here runs where a zone has no light (LIGHT.force
// turns it on anywhere, for tests: true or 'ember' for Act IV's rules, 'sea' for Act V's).
import * as THREE from 'three';
import { G } from './state.js';
import { R, addLight, removeLight } from '../gfx/gfx.js';
import * as FXM from '../gfx/fx.js';
import * as B from '../world/build.js';
import { SEA, beamMesh } from '../world/sea.js';
import { tex } from '../gfx/textures.js';
import { attachUpright } from './actors.js';
import { ZONES } from './world.js';
import { warmHero } from './cold.js';
import { stageAt } from './ice.js';
import Audio from '../audio/audio.js';
import { emit } from '../ui/bus.js';
import { clamp, damp, rand, angleDiff } from '../core/util.js';

export const LIGHT = { force: false, base: 6, swell: 9, swellT: 8 };
const S = { zone: null, pools: [], beams: [], over: null, owner: null, dark: null, swellT: 0, halfT: 0, sipT: 0, streamT: 0, ring: null, ringR: 6, cradle: null, cradleAv: null, flame: null, range0: 15, litT: 0, ice: 0 };
const V = new THREE.Vector3();
// in a boss's darkness her own fire (a Mage's Meteor) lights only as it bursts: the braziers are the way through Ivar's dark
const FLARE = 0.5;

// the zone's kind of light: 'ember', 'sea' or null (ZONES is read at run time only: world.js imports this file)
export function lightKind() {
  if (LIGHT.force) return typeof LIGHT.force === 'string' ? LIGHT.force : 'ember';
  return ZONES[G.zone?.id]?.light || null;
}
export const lightOn = () => !!lightKind();
// the Shroud and the Cradle's drinking belong to the ember zones only
export const shroudOn = () => lightKind() === 'ember';
const ember = () => lightKind() === 'ember';

// ---------- queries ----------
// is (x, z) in light? Everywhere is, in a zone with no light. o.ring === false: the hero's own ring does not count (the
// Skuas mob a hero who lingers in the dark with only the Cradle's light round her)
export function lightAt(x, z, o = {}) {
  if (!lightOn()) return true;
  for (const p of S.pools) if (p.r > 0 && !p.beam && (p.x - x) ** 2 + (p.z - z) ** 2 < p.r * p.r) return true;
  if (S.beams.length && inBeam(x, z)) return true;
  // Karthax has drunk every fire: only the pools are left (Isarn's lantern, the ghosts)
  if (S.dark) return false;
  const pl = G.player, hr = heroLightR();
  if (o.ring !== false && pl && !pl.dead && hr > 0 && (pl.x - x) ** 2 + (pl.z - z) ** 2 < hr * hr) return true;
  if (lampAt(x, z)) return true;
  return !!fireAt(x, z, 1.5);
}
// lit by a lamp, a brazier or a fire-pit (what blinds a landing Ashwing)
export function lampAt(x, z) {
  for (const it of G.zone?.interact || []) if (it.lit && it.lightR && (it.x - x) ** 2 + (it.z - z) ** 2 < it.lightR * it.lightR) return it;
  return null;
}
// burning ground at (x, z), pad metres past its edge (in a boss's dark the hero's own fire lights only as it bursts)
export function fireAt(x, z, pad = 0) {
  for (const a of G.areas) if (a.kind === 'fire' && a.t <= a.dur && !(S.over != null && a.team === 'hero' && a.t > FLARE) && (a.x - x) ** 2 + (a.z - z) ** 2 < (a.r + pad) ** 2) return a;
  return null;
}
// lamp light (Act V): what holds the ice, keeps the Sunken from waking with the tide, and keeps the Icemaw, the Hands and
// the Ice Singer's song out: lit lamps (a sea-light's base, the hearth, a cairn, a Name-stone, a brazier) and the pools
// added with { lamp: true } (the keepers' lamps, the marker-lights). Never fire (it melts), never a beam, never a
// Breathing-hole's rim lamp (the seals could not work)
export function lampLightAt(x, z) {
  for (const it of G.zone?.interact || []) if (it.lit && it.lightR && it.kind !== 'holeLamp' && (it.x - x) ** 2 + (it.z - z) ** 2 < it.lightR * it.lightR) return it;
  for (const p of S.pools) if (p.lamp && p.r > 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < p.r * p.r) return p;
  return null;
}
// a warm pool (cold.js: -12/s): lamp light, a lit hole lamp, the camp's brazier on the ice
export function warmAt(x, z) {
  const l = lampLightAt(x, z); if (l) return l;
  for (const it of G.zone?.interact || []) if (it.lit && it.kind === 'holeLamp' && (it.x - x) ** 2 + (it.z - z) ** 2 < it.lightR * it.lightR) return it;
  const br = G.zone?.L?.spots?.brazier;
  if (br && (br.x - x) ** 2 + (br.z - z) ** 2 < 16) return br;
  return null;
}
// the Cradle's ring: ZONES[id].ring metres (6 in Act IV, 4 in Act V), 9 m while swollen (Act IV), halved for a while when a
// Smoke-eater gets a claw in it; a boss may set it
export function heroLightR() {
  if (S.over != null) return S.over;
  return (S.swellT > 0 && ember() ? LIGHT.swell : LIGHT.base) * (S.halfT > 0 ? 0.5 : 1);
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
// own), decal: false (it lights, but draws nothing on the ground: a beam's moving light), lamp: true (lamp light, see
// lampLightAt), color, intensity }. The pool is a plain object: move it (x, z) or resize it (r) freely; shrink(p, r, t) for
// a while. (On the snow of the sea zones a pool is a soft warm glow with no rim, and its light a third as strong: the ember
// zones' pool burns white snow into a bright disc and drowns the fire that throws it)
export function addLightPool(x, z, r, dur = Infinity, tag = null, o = {}) {
  const snow = lightKind() === 'sea';
  const p = { x, z, r, r0: r, t: 0, dur, tag, owner: o.owner || null, shrinkT: 0, color: o.color ?? 0xffc070, lamp: !!o.lamp, a0: snow ? 0.13 : 0.3 };
  if (o.fx !== false) {
    const I = o.intensity ?? 12 + r * 2;
    p.light = addLight({ x, y: 1.8, z, color: p.color, intensity: snow ? I * 0.36 : I, range: r * 2, flicker: o.flicker ?? 0.12 });
    if (o.decal !== false) { p.mesh = discMesh(snow ? warmer(p.color) : p.color, p.a0, snow ? 0 : 0.6); p.mesh.position.set(x, 0, z); p.mesh.scale.setScalar(r); B.drape(p.mesh, G.zone?.L); R.scene.add(p.mesh); }
  }
  S.pools.push(p);
  return p;
}
// a pool's colour on snow: deeper and warmer, so the white under it reads as firelit, not bleached
const _w = new THREE.Color();
const warmer = (c) => _w.set(c).multiply(_w.clone().setRGB(1, 0.78, 0.55)).getHex();
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

// ---------- beams (Act V): a lit sea-light's turning beam ----------
// addBeam(x, z, o) -> b = { x, z, y, len, half, period, theta, sweep, pool, light, mesh, tag, owner, prop }. o: { len (26 m),
// half (0.18 rad), period (12 s a turn, on every difficulty), theta (where it starts), y (its lantern's height), color, tag,
// owner (gone with it), prop (an act5Prop with setBeam: the prop draws its own cone), cone (false: none drawn; without a
// prop one of sea.js's), dir (1 or -1), warm (false: it does not warm the hero) }. Each frame it turns, its light moves
// along the ground it sweeps, and the hero it passes over is warmed once a pass (cold.js warmHero). What it does to thin
// ice is ice.js's (beamIce), to the unlit and the light-shy ai.js's (beamTick). b.sweep counts its turns ("once per sweep")
let beamId = 0;
export function addBeam(x, z, o = {}) {
  const prop = o.prop || null, y = o.y ?? prop?.userData.fireY ?? 8;
  const b = { id: ++beamId, x, z, y, len: o.len ?? 26, half: o.half ?? 0.18, period: o.period ?? 12, theta: o.theta ?? rand.range(0, Math.PI * 2), dir: o.dir ?? 1, sweep: 0, tag: o.tag ?? null, owner: o.owner || null, prop, mesh: null, warm: o.warm !== false, color: o.color ?? 0xfff0d6, k: 1, heroIn: false };
  if (!prop && o.cone !== false) { b.mesh = beamMesh({ y, len: b.len, color: b.color }); b.mesh.position.set(x, y, z); R.scene.add(b.mesh); b.own = true; }
  // the light it lays on the ground as it turns (lightAt counts the beam itself, not this pool)
  b.pool = addLightPool(x, z, 3, Infinity, null, { decal: false, color: b.color, intensity: o.intensity ?? 26, flicker: 0.05 });
  b.pool.beam = b; b.light = b.pool.light;
  if (b.light) { b.light.range = 11; b.light.y = 2.2; }
  S.beams.push(b);
  aim(b);
  return b;
}
export function removeBeam(q) {
  for (let i = S.beams.length - 1; i >= 0; i--) { const b = S.beams[i]; if (b === q || (typeof q === 'string' && b.tag === q)) dropBeam(i); }
}
export const beams = () => S.beams;
export const getBeam = (tag) => S.beams.find((b) => b.tag === tag) || null;
// a beam shortened (the Skotos's Eclipse) or given back its length
export function setBeamLen(b, d) { if (!b) return; b.len = d; b.mesh?.userData.setLen?.(d); }
function dropBeam(i) {
  const b = S.beams[i];
  removeLightPool(b.pool);
  if (b.prop) b.prop.userData.setBeam?.(null);
  else if (b.mesh) { R.scene.remove(b.mesh); b.mesh.traverse((o) => { if (o.material?.userData?.own) o.material.dispose(); }); }
  S.beams.splice(i, 1);
}
// is (x, z) in a beam: between 3 m and its length from it, within its half-angle (wider near the tower: + 0.6 / d)
export function beamHas(b, x, z) {
  const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz);
  return d >= 3 && d <= b.len && b.k > 0 && Math.abs(angleDiff(b.theta, Math.atan2(dx, dz))) < b.half + 0.6 / d;
}
export function inBeam(x, z) {
  for (const b of S.beams) if (beamHas(b, x, z)) return b;
  return null;
}
// the cone and its light pointed at theta: the prop's (setBeam), or ours; the light where the beam meets the ground
function aim(b) {
  if (b.prop) b.mesh = b.prop.userData.setBeam?.(b.theta) || b.mesh;
  else if (b.mesh) b.mesh.userData.setDir(b.theta);
  const d = b.len * 0.6, s = Math.sin(b.theta), c = Math.cos(b.theta);
  b.pool.x = b.x + s * d; b.pool.z = b.z + c * d;
}
const TAU = Math.PI * 2;
function tickBeams(dt) {
  const pl = G.player;
  for (let i = S.beams.length - 1; i >= 0; i--) {
    const b = S.beams[i];
    if (b.owner && (b.owner.dead || b.owner.removed)) { dropBeam(i); continue; }
    b.theta += b.dir * TAU * dt / b.period;
    if (b.theta >= TAU || b.theta < 0) {
      b.theta -= Math.sign(b.theta) * TAU; b.sweep++;
      // each turn the beam's bell (a lantern room's or the Tower's cracked one), for the ear: audio carries the beat
      b.prop?.userData.ring?.(0.6); emit('beamTurn', b);
    }
    aim(b);
    if (b.own) b.mesh.userData.tick(dt);
    // the hero it passes over: warmed (Cold -15, then 4 s of no build-up), once a pass; a low hum as it goes by
    const inside = !!pl && !pl.dead && beamHas(b, pl.x, pl.z);
    if (inside && !b.heroIn) { if (b.warm) warmHero(4); Audio.sfx('beamHum', { x: pl.x, z: pl.z, vol: 0.5 }); emit('beamPass', b); }
    b.heroIn = inside;
  }
  // the sea shaders' nearest beam (uBeam: origin and k, direction and length) and two nearest lanterns (uLights)
  const ub = SEA.uBeam.value;
  let best = null, bd = 1e9;
  if (pl) for (const b of S.beams) { const d = (b.x - pl.x) ** 2 + (b.z - pl.z) ** 2; if (d < bd) { bd = d; best = b; } }
  if (best) {
    const dip = Math.atan2(Math.max(0, best.y - 1.5), best.len * 0.75), cd = Math.cos(dip);
    ub[0].set(best.x, best.y, best.z, best.k); ub[1].set(Math.sin(best.theta) * cd, -Math.sin(dip), Math.cos(best.theta) * cd, best.len);
  } else ub[0].w = 0;
}
// the two lit lanterns nearest the hero, for the light paths on the water and the glints on the ice: the beams' fires, then
// the act's lit lamps (each at its fire's height)
const LT2 = [];
function lanterns() {
  const pl = G.player, ul = SEA.uLights.value;
  LT2.length = 0;
  if (pl && lightKind() === 'sea') {
    for (const b of S.beams) LT2.push({ x: b.x, y: b.y, z: b.z, w: 1.2 * b.k, d: (b.x - pl.x) ** 2 + (b.z - pl.z) ** 2 });
    for (const it of G.zone?.interact || []) if (it.lit && it.lightR && it.kind !== 'sealight') LT2.push({ x: it.x, y: (it.mesh?.userData.fireY ?? 1.2) + (it.mesh?.position?.y || 0), z: it.z, w: 0.6, d: (it.x - pl.x) ** 2 + (it.z - pl.z) ** 2 });
    LT2.sort((a, b) => a.d - b.d);
  }
  for (let i = 0; i < 2; i++) { const q = LT2[i]; if (q) ul[i].set(q.x, q.y, q.z, q.w); else ul[i].set(0, -99, 0, 0); }
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
  // one Cradle for the whole game, moved to each new avatar (a new one per avatar leaked its geometries and materials)
  if (S.cradle) S.cradle.parent?.remove(S.cradle); else S.cradle = cradleMesh();
  // on the left hip, clear of the sword arm
  if (!attachUpright(av, 'hips', S.cradle, 0.19, -0.04, -0.02)) { S.cradle.quaternion.identity(); S.cradle.scale.setScalar(1); S.cradle.position.set(0.22, 0.95, 0); av.group.add(S.cradle); }
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

// the hero's ring warns of the ice under her: white from stage 2 (webbed), pulsing faster as it crazes
const RING_C = new THREE.Color(0xffb060), RING_W = new THREE.Color(0xf0f8ff), _rc = new THREE.Color();
function footIce(ring, pl) {
  const st = stageAt(pl.x, pl.z), bad = st >= 2 && st <= 3;
  if (bad && !S.footBad) Audio.sfx('iceCreak', { x: pl.x, z: pl.z, vol: 0.8 });
  S.footBad = bad;
  const k = bad ? 0.75 + 0.25 * Math.sin(R.time * (st === 3 ? 14 : 7)) : 0;
  if (k === S.footK) return;
  S.footK = k; _rc.copy(RING_C).lerp(RING_W, k);
  if (ring.userData.setColor) ring.userData.setColor(_rc); else ring.material?.uniforms?.uColor.value.copy(_rc);
}

// ---------- per frame (from player.js, after the hero has moved) ----------
export function tickLight(dt) {
  const z = G.zone, pl = G.player;
  // a new zone (leaveZone has already cleared the last one's pools and darkness): the atmosphere's reach for the hero's light
  // (and the Cradle's ring for its kind of light: 6 m in Act IV, 4 m in Act V)
  if (z !== S.zone) { S.zone = z; S.range0 = R.heroLight.distance; LIGHT.base = ZONES[z?.id]?.ring ?? 6; S.ringR = LIGHT.base; if (S.ring && S.footK) { S.footK = 0; S.footBad = false; S.ring.userData.setColor?.(RING_C) ?? S.ring.material?.uniforms?.uColor.value.copy(RING_C); } }
  const on = lightOn() && pl;
  if (S.owner && (S.owner.dead || S.owner.removed)) { S.over = null; S.owner = null; }
  if (S.dark && S.dark !== true && (S.dark.dead || S.dark.removed)) S.dark = null;
  for (let i = S.pools.length - 1; i >= 0; i--) {
    const p = S.pools[i];
    p.t += dt;
    if (p.t > p.dur || (p.owner && (p.owner.dead || p.owner.removed))) { dropPool(i); continue; }
    if (p.shrinkT > 0 && (p.shrinkT -= dt) <= 0) p.r = p.r0;
    const fade = Math.min(1, (p.dur - p.t) / 1.5);
    if (p.light) { p.light.x = p.x; p.light.z = p.z; if (!p.beam) p.light.range = p.r * 2; }
    if (p.mesh) {
      const m = p.mesh, r = Math.max(0.01, p.r);
      if (m.position.x !== p.x || m.position.z !== p.z || m.scale.x !== r) { m.position.set(p.x, 0, p.z); m.scale.setScalar(r); B.drape(m, z?.L); }
      m.material.uniforms.uA.value = p.a0 * fade * (1 + Math.sin(p.t * 3 + p.x) * 0.08);
    }
  }
  if (S.beams.length) tickBeams(dt); else SEA.uBeam.value[0].w = 0;
  if ((S.litT -= dt) <= 0) { S.litT = 0.25; lanterns(); }
  if (!on) { if (S.ring) S.ring.visible = false; if (S.cradle) S.cradle.visible = false; return; }
  if (S.swellT > 0) S.swellT -= dt;
  if (S.halfT > 0) S.halfT -= dt;
  // (the Cradle drinks only in the ember zones: whale oil and her own fire keep their time by the sea)
  if (!pl.dead && ember()) drink(dt, pl);
  // the ring: eases to its radius, follows the hero, gone in the dark
  const r = heroLightR(), ring = heroRing();
  S.ringR = damp(S.ringR, r, 5, dt);
  if (!ring.parent) R.scene.add(ring);
  ring.visible = S.ringR > 0.15 && !pl.dead;
  ring.position.set(pl.x, 0, pl.z); ring.scale.set(Math.max(0.01, S.ringR), 1, Math.max(0.01, S.ringR));
  if (ring.visible) B.drape(ring, z.L);
  // on thin ice webbed or worse (stage 2+) the ring at her feet turns white and pulses, with a creak as she steps onto it
  if (lightKind() === 'sea') footIce(ring, pl);
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
// on leaving a zone (projectiles.js clearProjs) and on entering one: no beams, no pools, no darkness, the Cradle at rest
export function clearLight() {
  while (S.beams.length) dropBeam(S.beams.length - 1);
  while (S.pools.length) dropPool(S.pools.length - 1);
  lanterns();
  S.over = null; S.owner = null; S.dark = null; S.swellT = 0; S.halfT = 0;
  if (S.ring) S.ring.visible = false;
  if (S.cradle) S.cradle.visible = false;
}
