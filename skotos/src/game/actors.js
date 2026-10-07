// Actors (hero, monsters, NPCs, pets) and the models they wear.
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { R, addLight } from '../gfx/gfx.js';
import { makeCharMat, staticGeo } from '../gfx/rig.js';
import * as M from '../gfx/models.js';
import { Avatar } from '../gfx/anim.js';
import { hasPerson, personModel } from '../gfx/people.js';
import { hasCreature, creatureModel } from '../gfx/creatures.js';
import { tex } from '../gfx/textures.js';
import { MONSTERS, DIFFS, monsterHP, monsterDmg, AFFIXES, CLASSES, PACK_DORMANT, PACK_LINE } from './data.js';
import * as B from '../world/build.js';
import { G, uid } from './state.js';
import { rand, clamp } from '../core/util.js';
import { list, t } from '../i18n/i18n.js';
import { weaponLook } from './items.js';

// ---------- model cache ----------
const BUILD = {
  warden: () => M.buildWarden(), ranger: () => M.buildRanger(), mage: () => M.buildMage(),
  goblin: () => M.buildGoblin(), goblinArcher: () => M.buildGoblin('archer'), goblinShaman: () => M.buildGoblin('shaman'),
  warg: () => M.buildWarg(), spiritWolf: () => M.buildWarg(0.9), spider: () => M.buildSpider(1), spiderling: () => M.buildSpider(0.5),
  ash: () => M.buildAshspawn(), troll: () => M.buildTroll(), skeleton: () => M.buildSkeleton(), skeletonArcher: () => M.buildSkeleton('archer'),
  wraith: () => M.buildWraith(), weaver: () => M.buildSpider(2.6, true), barrowLord: () => M.buildWraith(1.5, true),
  wayfarer: () => M.buildWayfarer(), smith: () => M.buildSmith(), healer: () => M.buildHealer(),
  villager0: () => M.buildVillager(0), villager1: () => M.buildVillager(1), villager2: () => M.buildVillager(2),
  heartroot: () => M.buildHeartroot()
};
const CACHE = {};
function instance(model) {
  if (!CACHE[model]) CACHE[model] = BUILD[model]();
  const src = CACHE[model];
  const mesh = cloneSkinned(src.mesh);
  const u = src.mat.userData.u;
  const mat = makeCharMat({ rim: u.uRimColor.value.getHex(), rimI: u.uRim.value, burn: u.uBurn.value.getHex() });
  mesh.material = mat;
  const bones = {};
  mesh.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  return { mesh, bones, mat, rest: src.rest, kind: src.kind, dims: src.dims, float: src.float, Anim: src.Anim };
}
export function preloadModels(list) { for (const m of list) if (!CACHE[m] && BUILD[m]) CACHE[m] = BUILD[m](); }

const STYLE = { warden: 'sword', ranger: 'bow', mage: 'staff' };
// realistic people (Quaternius, see gfx/people.js) replace the code-built models wherever one exists
// stand-ins while a model is missing from the build (Act II's people and creatures)
const STAND_IN = {
  magmaHound: 'warg', caveBat: 'spiderling', deepworm: 'spider', stoneborn: 'villager1', stonebornArb: 'villager0', runepriest: 'wayfarer', brokka: 'smith', stonewarden: 'troll', moltenKing: 'ash',
  // Act III: the creatures (tools/creatures/act3) and the Evergreen (grove.glb, loaded with the woods)
  rootling: 'spiderling', amberBear: 'troll', silverhorn: 'warg', amberMoth: 'caveBat', rootwarden: 'troll',
  hollowed: 'skeleton', rootsworn: 'warden', rootswornArcher: 'ranger', mourner: 'healer', amaranthe: 'healer', elati: 'ranger', linden: 'healer',
  // Act IV: the creatures (tools/creatures/act4) and the ash people (ash.glb); a list is tried in order
  ashwing: ['caveBat', 'warg'], smokeEater: 'spider', emberTick: 'spiderling', hammerhorn: 'troll', karthax: ['moltenKing', 'troll'],
  lampless: 'wayfarer', ivar: 'wayfarer', arna: 'wayfarer', arnaOld: 'wayfarer', isarnBoy: 'wayfarer',
  ashSpear: 'warden', ashDwarf: 'stoneborn', ashBow: 'ranger', ashsmith: 'villager1'
};
// a stand-in drawn at another size than the model it stands for (model>stand-in)
const STAND_SCALE = { 'ashwing>caveBat': 2.6, 'smokeEater>spider': 0.75, 'isarnBoy>wayfarer': 0.62 };
const ready = (m) => hasPerson(m) || hasCreature(m) || !!BUILD[m];
export function standIn(model) {
  for (let i = 0; i < 4 && !ready(model) && STAND_IN[model]; i++) { const s = STAND_IN[model]; model = Array.isArray(s) ? s.find(ready) || s[s.length - 1] : s; }
  return model;
}
export function makeAvatar(model, o = {}) {
  const want = model;
  model = standIn(model);
  const m = hasPerson(model) ? personModel(model) : hasCreature(model) ? creatureModel(model) : instance(model);
  const sc = (o.scale || 1) * (STAND_SCALE[want + '>' + model] || 1);
  const av = new Avatar(m, { style: o.style || STYLE[model] || 'none', animSet: o.animSet, hunch: o.hunch, scale: sc, idle: o.idle });
  av.modelName = model; av.standIn = model !== want;
  if (o.weapon) av.hold('R', o.weapon, o.look || {});
  if (o.offhand) av.hold('L', o.offhand, o.offLook || {});
  return av;
}

// ---------- blob shadows and elite rings ----------
let blobs = null, rings = null;
function shadowsInit() {
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
  blobs = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ map: tex('blob'), transparent: true, depthWrite: false, opacity: 0.8 }), 160);
  blobs.renderOrder = 1; blobs.frustumCulled = false; blobs.count = 0;
  const rg = new THREE.RingGeometry(0.82, 1, 40); rg.rotateX(-Math.PI / 2);
  rings = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }), 40);
  rings.frustumCulled = false; rings.count = 0; rings.renderOrder = 2;
  R.scene.add(blobs, rings);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export function updateShadows() {
  if (!blobs) shadowsInit();
  let n = 0, k = 0;
  const all = G.player ? [G.player, ...G.actors] : G.actors;
  for (const a of all) {
    if (!a.avatar || a.removed || !a.avatar.group.visible) continue;
    if (n < 160) { _p.set(a.x, 0.04, a.z); _s.setScalar(a.radius * 2.6 * (a.dead ? Math.max(0, 1 - a.deadT * 0.5) : 1)); _q.identity(); blobs.setMatrixAt(n++, _m.compose(_p, _q, _s)); }
    if ((a.elite || a.boss || a.pet) && !a.dead && !a.disguised && k < 40) {
      _p.set(a.x, 0.06, a.z); _s.setScalar(a.radius * 1.5); rings.setMatrixAt(k, _m.compose(_p, _q, _s));
      rings.setColorAt(k, _c.set(a.boss ? 0xff4020 : a.elite === 'rare' ? 0xffc030 : a.pet ? 0x60c0ff : 0x5080ff));
      k++;
    }
  }
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
  rings.count = k; rings.instanceMatrix.needsUpdate = true; if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
}

// ---------- actor ----------
// every status an actor can carry, all clear (the hero gets a new one on respawn too)
export const freshStatus = () => ({ stun: 0, freeze: 0, slow: 0, slowK: 0, fear: 0, burn: 0, burnDps: 0, poison: 0, poisonDps: 0, chill: 0, root: 0, rootImm: 0, stick: 0 });
export class Actor {
  constructor(o) {
    this.id = uid();
    this.x = o.x; this.z = o.z; this.y = 0; this.vx = 0; this.vz = 0; this.rot = o.rot ?? Math.random() * 6.28;
    this.team = o.team; this.kind = o.kind; this.def = o.def || {};
    this.radius = o.radius ?? 0.45; this.speed = o.speed ?? 4;
    this.hp = this.hpMax = o.hp ?? 10; this.dmg = o.dmg ?? 1; this.level = o.level ?? 1;
    this.dead = false; this.deadT = 0; this.removed = false;
    this.status = freshStatus();
    this.kx = 0; this.kz = 0; this.flash = 0; this.hpShow = 0;
    this.avatar = o.avatar || null;
    this.cd = 0; this.state = 'idle'; this.aggro = false; this.t = 0;
    this.elite = o.elite || null; this.affixes = o.affixes || []; this.boss = !!o.boss; this.pet = !!o.pet;
    this.name = o.name || null; this.shield = 0;
    if (this.avatar) { this.avatar.actor = this; R.scene.add(this.avatar.group); }
  }
  get alive() { return !this.dead; }
  remove() {
    if (this.removed) return;
    this.removed = true;
    if (this.avatar) { this.avatar.dispose(); this.avatar = null; }
    if (this.trail) { this.trail.dispose(); this.trail = null; }
    // what it kept on the ground: a rootling's mound, an Ash-Fallen's heap, a stoker's chain
    if (this.mesh) { this.mesh.parent?.remove(this.mesh); this.mesh = null; }
    if (this.light) { this.light = null; }
  }
}

// ---------- monsters ----------
const RARE_A = () => list('rare.a'), RARE_B = () => list('rare.b');
export function monsterLevel(base) {
  const L = G.hero ? G.hero.level : 1;
  return Math.max(base, L + (G.hero?.diff >= 3 ? 2 : 0));
}
export function spawnMonster(id, x, z, o = {}) {
  const def = MONSTERS[id];
  const D = DIFFS[G.hero.diff];
  const lvl = o.level ?? monsterLevel(G.zone?.level ?? 1);
  let hp = monsterHP(lvl) * def.hp * D.hp, dmg = monsterDmg(lvl) * def.dmg * D.dmg;
  let scale = def.look?.scale || 1;
  const look = {};
  if (o.elite === 'champion') { hp *= 3; dmg *= 1.25; scale = 1.1; }
  if (o.elite === 'rare') { hp *= 4.2; dmg *= 1.4; scale = 1.22; }
  if (o.minion) { hp *= 1.3; dmg *= 1.1; }
  if (o.gateMul) { hp *= o.gateMul; dmg *= Math.sqrt(o.gateMul); }
  if (def.boss) scale = def.look?.scale || 1;
  const style = def.style || 'none';
  const weapon = def.weapon && (id === 'skeleton' ? 'sword' : def.weapon);
  const wlook = def.wlook || (id === 'skeleton' ? { blade: 0x6a6052, len: 0.8 } : id === 'barrowLord' ? { blade: 0x9ad0ff, glow: 0.7 } : id === 'goblinArcher' ? { wood: 0x3a2a1a }
    : id === 'moltenKing' ? { head: 0x2a2220, glow: 0.9, rune: 0xff6a10 } : id === 'deadDwarf' ? { blade: 0x5a5248 } : id === 'runepriest' ? { gem: 0xff8a30, wood: 0x3a3028 } : {});
  // a keeper's statue wears the keeper (o.model, o.scale: Karthax's cages)
  if (o.scale) scale = o.scale;
  const av = makeAvatar(o.model || def.model, { style, animSet: def.animSet || (def.ai === 'melee' && (id === 'skeleton') ? 'undead' : undefined), hunch: def.hunch, weapon, look: wlook, scale });
  if (id === 'skeleton' && Math.random() < 0.5) av.hold('L', 'shield', { face: 0x4a3a2a, rim: 0x5a5248, emblem: 0x3a3028, r: 0.26 });
  if (id === 'stoneborn') av.hold('L', 'shield', { face: 0x3a2a24, rim: 0x8a6a3a, emblem: 0xb07a30, r: 0.3 });
  if (def.shield) av.hold('L', 'shield', def.shield);
  const a = new Actor({ x, z, team: 'foe', kind: id, def, radius: def.radius * scale, speed: def.speed * (o.elite ? 1.05 : 1), hp, dmg, level: lvl, avatar: av, elite: o.elite, affixes: o.affixes, boss: def.boss });
  a.scale = scale;
  // the tint an actor returns to after a freeze or a disguise
  const tint = (c, k) => { av.setTint(c, k); a.baseTint = c; a.baseTintAmt = k; };
  if (o.elite === 'champion') { tint(0x5070ff, 0.35); av.setRim(0x6090ff, 0.9); }
  if (o.elite === 'rare') { tint(0xffb040, 0.25); av.setRim(0xffc040, 0.9); a.name = rand.pick(RARE_A()) + ' ' + rand.pick(RARE_B()); }
  if (o.minion) { av.setRim(0xffc040, 0.5); }
  if (def.pet) { tint(0x70c8ff, 0.8); av.setRim(0x80d8ff, 1.6); }
  if (def.look?.tint && !o.elite) tint(def.look.tint, def.look.tintAmt ?? 0.3);
  if (def.look?.rim && !o.elite) av.setRim(def.look.rim, def.look.rimI ?? 0.6);
  if (def.armor) a.armored = true;
  if (def.ai === 'stonewarden') a.statue = true;
  if (a.affixes.includes('fast')) { a.speed *= 1.35; }
  if (a.affixes.includes('armored')) { a.armored = true; }
  a.packId = o.packId;
  a.home = { x, z };
  a.cd = rand.range(0.2, 1.2);
  if (o.rising) { a.rising = 1.6; av.play('rise', 1); }
  actSpawn(id, def, a, av, o);
  return a;
}

// ---------- Act III: what the Evergreen and the woods' creatures wear and how they wait ----------
function actSpawn(id, def, a, av, o) {
  // Rootlings wait underground under a leaf-tuft mound and burst out together (ai.js rootling)
  if (def.burst && !o.rising && !o.surface) {
    a.under = true; a.y = -1; av.group.visible = false;
    a.mesh = M.moundMesh(); a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = Math.random() * 6.28; R.scene.add(a.mesh);
  }
  // the dead that wait: the Hollowed pass for dead wood (a dark tint), the Ash-Fallen lie under the ash (a pose and a mound)
  const tag = o.packId != null && G.zone?.packs?.find((p) => p.id === o.packId)?.tag;
  if (def.wake && (o.dormant ?? (tag && PACK_DORMANT[tag]))) {
    a.dormant = true; a.disguised = true;
    if (def.wake.pose) {
      a.pose = def.wake.pose; av.play(a.pose, 1);
      a.mesh = new THREE.Mesh(staticGeo(M.ashMoundParts()), moundMat()); a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = Math.random() * 6.28; R.scene.add(a.mesh);
    } else av.setTint(0x2a2016, 0.85);
  }
  if (tag && PACK_LINE[tag]) battleLine(a, o.packId);
  if (id === 'amaranthe') { amberCrown(av); shardGlow(a, av); a.hpFloor = a.hpMax * 0.649; a.dazeClip = 'kneel'; }
  if (id === 'mourner') veil(av);
  act4Spawn(id, def, a, av, o);
}
// ---------- Act IV: what the ash people and the Forge's creatures wear ----------
// (a tint above 1 drains the colour first: people.js)
const TINT_IN = { lampless: [0x8a96a8, 1.6], ivar: [0x9aa0aa, 1.55], ashSpear: [0x8a8680, 1.7], ashDwarf: [0x9a8a70, 1.6], ashBow: [0x8a9078, 1.6], ashsmith: [0x6a5444, 1.4], smokeEater: [0x4a4440, 1.6], emberTick: [0xff6a20, 0.3], hammerhorn: [0x4a4440, 1.6], karthax: [0x4a4a52, 2.0], ashwing: [0xd8d0c0, 1.5] };
function act4Spawn(id, def, a, av, o) {
  const tint = (c, k) => { av.setTint(c, k); a.baseTint = c; a.baseTintAmt = k; };
  // stand-ins wear the act's colours (ash-grey dead, a soot-black thrall, Karthax in black iron)
  if (av.standIn && TINT_IN[id] && !o.elite) {
    tint(...TINT_IN[id]);
    // a Molten King standing in for Karthax: black iron with the fire banked low in its seams
    if (id === 'karthax') for (const m of av.model.mats || []) if (m.emissive) m.emissive.multiplyScalar(0.12);
  }
  if (id === 'lampless') a.cone = lanternCone(av, 8, 0.7);
  if (id === 'ashsmith') wear(av, 'head', M.maskParts(), 0.42, 0.0);
  if (id === 'hammerhorn') shackle(a, av, o);
  // a boss phase no single burst may skip (Ivar's dark, Karthax's cages)
  if (id === 'ivar') a.hpFloor = a.hpMax * 0.599;
  if (id === 'karthax') { a.crown = ashCrown(av); a.dazeClip = 'kneel'; a.hpFloor = a.hpMax * 0.649; }
  if (id === 'smokeEater') a.throat = (av.model.mats || []).filter((m) => m.emissive && (/throat|ember|glow/i.test(m.name) || m.emissiveMap));
  if (id === 'keeperStatue') keeper(a, av, o);
}
// something worn on a bone, upright in the rest pose: at k of the way from the bone to the top of the head (heads), or at y
function wear(av, bone, parts, k, z = 0, y = 0) {
  if (!av.bones[bone] || !av.heldMat) return null;
  const mesh = new THREE.Mesh(staticGeo(parts), av.heldMat);
  const at = attachUpright(av, bone, mesh, 0, 0, 0);
  if (!at) return null;
  attachUpright(av, bone, mesh, 0, bone === 'head' ? headTop(av, at.y) * k : y, z);
  av.held[bone + 'Worn'] = { mesh };
  return mesh;
}
let moundM = null;
const moundMat = () => (moundM ||= makeCharMat({ rim: 0x6a6460, rimI: 0.15 }));
// a Lampless's lantern throws a pale cone of detection: the world's (act4Prop 'cone') or a fan of light on the ground
const CONE_VS = 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const CONE_FS = `varying vec2 vUv; varying vec3 vP; uniform float uF; uniform float uA; uniform float uArc;
void main(){ float d = length(vUv * 2.0 - 1.0); if (d > 1.0) discard;
  float side = 1.0 - smoothstep(0.0, 0.05, uArc - abs(atan(vP.x, vP.z)));
  float a = (0.006 + 0.03 * pow(1.0 - d, 1.5) + 0.06 * side * (1.0 - d * 0.7) + 0.035 * smoothstep(0.93, 1.0, d)) * (1.0 - smoothstep(0.97, 1.0, d)) * uA;
  vec3 c = mix(vec3(0.6, 0.72, 1.0), vec3(1.0), uF);
  gl_FragColor = vec4(c * a * (1.0 + uF * 4.0), 1.0); }`;
export function lanternCone(av, len, arc) {
  let m = null;
  try { m = B.act4Prop?.('cone', { arc }); } catch (e) { m = null; }
  if (!m?.children.length) {
    const g = new THREE.CircleGeometry(1, 20, -Math.PI / 2 - arc, arc * 2); g.rotateX(-Math.PI / 2);
    m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uF: { value: 0 }, uA: { value: 1 }, uArc: { value: arc } }, vertexShader: CONE_VS, fragmentShader: CONE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.renderOrder = 2; m.frustumCulled = false;
    m.userData.flash = (k) => { m.material.uniforms.uF.value = k; };
    m.userData.fade = (k) => { m.material.uniforms.uA.value = k; };
    m.userData.dispose = () => { g.dispose(); m.material.dispose(); };
  }
  // flat on the ground: stretched only along it
  if (!m.children.length) m.position.y = 0.06;
  m.scale.set(len / (av.scale || 1), 1 / (av.scale || 1), len / (av.scale || 1));
  av.group.add(m);
  return m;
}
// the Hammerhorn's shackles; a stoker by a bellows station is chained to its post (9 m), drawn as links (ai.js chainTick)
function shackle(a, av, o) {
  wear(av, 'handR', M.cuffParts(), 0, 0);
  wear(av, 'handL', M.cuffParts(), 0, 0);
  wear(av, 'neck', M.collarParts(), 0, 0.02, 0.02);
  const S = G.zone?.L?.spots?.stations || [];
  let post = o.post || null;
  if (!post && !o.free) for (const s of S) if (Math.hypot(s.x - a.x, s.z - a.z) < 6 && !G.actors.some((b) => b.post === s && !b.dead)) { post = s; break; }
  if (!post) return;
  a.post = post; a.chainLen = a.def.chain || 9;
  // it works the station from the bay's open side (the station faces it; or the side it was found on)
  const r = post.r ?? Math.atan2(a.x - post.x, a.z - post.z);
  a.home = { x: post.x + Math.sin(r) * 1.4, z: post.z + Math.cos(r) * 1.4 };
  const n = 26, links = new THREE.InstancedMesh(linkG ||= M.linkGeo(), linkM ||= makeCharMat({ rim: 0x5a5048, rimI: 0.2 }), n);
  links.frustumCulled = false; links.castShadow = false;
  a.mesh = links; a.chainN = n; R.scene.add(links);
}
let linkG = null, linkM = null;
// the Ash Crown on Karthax's brow: the world's (act4Prop 'crown', fitted to the head) or iron prongs with four ember sockets
function ashCrown(av) {
  let m = null;
  try { m = B.act4Prop?.('crown'); } catch (e) { m = null; }
  if (m?.children.length && av.bones.head) {
    const box = new THREE.Box3().setFromObject(m), w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
    const g = new THREE.Group(); m.scale.multiplyScalar(0.27 / w); m.position.y -= box.min.y * (0.27 / w); g.add(m);
    const at = attachUpright(av, 'head', g, 0, 0, 0);
    if (at) { attachUpright(av, 'head', g, 0, headTop(av, at.y) - 0.06, 0); m.userData.setSockets?.(4); return m; }
  }
  return wear(av, 'head', M.ashCrownParts(), 0.8, 0, 0);
}
// a keeper's statue (o.model): frozen in a pose and grey with ash; the Hammerfall breaks it (ai.js)
function keeper(a, av, o) {
  const src = MONSTERS[o.model] || {};
  if (src.weapon) av.hold('R', src.weapon, src.wlook || (o.model === 'moltenKing' ? { head: 0x2a2220, glow: 0 } : {}));
  a.statue = true; a.statueTint = 0xa8a49c; a.baseTint = 0xa8a49c; a.baseTintAmt = 2.75;
  av.setTint(a.baseTint, a.baseTintAmt); av.setRim(0xb0a898, 0.25);
  // ash has no fire in it: the Molten King's veins go dark
  for (const m of av.model.mats || []) if (m.emissive) { m.emissive.setRGB(0, 0, 0); m.emissiveMap = null; m.needsUpdate = true; }
  av.play(o.pose || 'castUp', 1); av.update(o.poseT ?? 0.7, { speed: 0 });
  a.keeper = o.keeper || null;
}
// the Ash-Fallen still hold their line: pack-mates in 1.5 m slots either side of the first, facing as it faces
function battleLine(a, packId) {
  const lead = G.actors.find((b) => b.packId === packId && b !== a && !b.dead);
  const pl = G.player;
  if (!lead) { if (pl) a.rot = Math.atan2(pl.x - a.x, pl.z - a.z); return; }
  const i = G.actors.filter((b) => b.packId === packId && b !== a).length, side = i % 2 ? 1 : -1, k = Math.ceil(i / 2) * 1.5;
  const px = Math.cos(lead.rot), pz = -Math.sin(lead.rot), x = lead.x + px * k * side, z = lead.z + pz * k * side;
  a.rot = lead.rot;
  if (G.zone?.map?.walkable(x, z)) { a.x = x; a.z = z; a.home = { x, z }; if (a.mesh) a.mesh.position.set(x, 0, z); }
}
// attach obj to a bone so that it stands upright in the rest pose, offset (in metres, character space) from the bone
const _ma = new THREE.Matrix4(), _pa = new THREE.Vector3(), _qa = new THREE.Quaternion(), _sa = new THREE.Vector3();
export function attachUpright(av, boneName, obj, ox, oy, oz) {
  const bone = av.bones[boneName]; if (!bone) return null;
  const root = av.model.mesh;
  root.updateMatrixWorld(true);
  _ma.copy(root.matrixWorld).invert().multiply(bone.matrixWorld).decompose(_pa, _qa, _sa);
  _qa.invert();
  obj.quaternion.copy(_qa);
  obj.position.set(ox, oy, oz).applyQuaternion(_qa).divideScalar(_sa.x);
  obj.scale.setScalar(1 / _sa.x);
  bone.add(obj);
  return _pa;
}
const headTop = (av, headY) => (av.model.height || 1.8) - headY;
// the Lady's crown of amber antler tines, sharing her hit flash and death dissolve
function amberCrown(av) {
  const bone = av.bones.head; if (!bone || !av.heldMat) return;
  const mesh = new THREE.Mesh(staticGeo(M.crownParts()), av.heldMat);
  const at = attachUpright(av, 'head', mesh, 0, 0, 0);
  if (!at) return;
  // sit the band on the crown of the head
  const k = headTop(av, at.y) - 0.07;
  attachUpright(av, 'head', mesh, 0, k, -0.01);
  av.held.crown = { mesh };
}
// the third shard burning through her breast: a glow and a pooled light that follows it
function shardGlow(a, av) {
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xffb040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  if (!attachUpright(av, 'chest', spr, 0, 0.04, 0.13)) return;
  spr.scale.multiplyScalar(0.55);
  av.model.mats?.push(spr.material);
  a.shardGlow = spr; a.shardBase = spr.scale.x;
  a.shardLight = addLight({ x: a.x, y: 2.4, z: a.z, color: 0xffa030, intensity: 22, range: 9, flicker: 0.15 });
}
// a Mourner's veil: a translucent black cone hung from the head
function veil(av) {
  if (!av.bones.head || av.model.kind !== 'person') return;
  const mat = makeCharMat({ rim: 0xe8d8a8, rimI: 0.8 });
  mat.userData.u = av.mat.userData.u;
  mat.transparent = true; mat.opacity = 0.86; mat.depthWrite = false; mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(staticGeo(M.veilParts()), mat);
  const at = attachUpright(av, 'head', mesh, 0, 0, 0);
  attachUpright(av, 'head', mesh, 0, headTop(av, at.y) + 0.04, 0.0);
  av.model.mats?.push(mat);
  av.held.veil = { mesh };
}
export function restoreRim(a) {
  const av = a.avatar; if (!av) return;
  if (a.def.pet) av.setRim(0x80d8ff, 1.6);
  else if (a.elite === 'champion') av.setRim(0x6090ff, 0.9);
  else if (a.elite === 'rare') av.setRim(0xffc040, 0.9);
  else if (a.minion) av.setRim(0xffc040, 0.5);
  else av.setRim(a.def.look?.rim ?? 0x6080b0, a.def.look?.rimI ?? 0.3);
}
export function rollAffixes(n) { const pool = AFFIXES.slice(); rand.shuffle(pool); return pool.slice(0, n); }

// ---------- NPCs ----------
export function spawnNpc(kind, x, z, rot) {
  const model = kind === 'villager' ? 'villager' + (Math.floor(x + z) % 3) : kind === 'ivarGhost' ? 'ivar' : kind === 'wayfarerGhost' ? 'lampless' : kind;
  const vi = Math.floor(x + z) % 3;
  const o = kind === 'wayfarer' ? { style: 'staff', weapon: 'lanternStaff', animSet: 'npc' } : kind === 'smith' ? { style: 'none', weapon: 'hammer', animSet: 'npc', idle: 'hammer' }
    : kind === 'brokka' ? { style: 'none', weapon: 'hammer', animSet: 'npc', idle: 'fold' }
    // Act III: Elati, the last Evergreen scout, bow in hand; Old Linden, half rooted, kneeling in her own roots
    : kind === 'elati' ? { style: 'none', weapon: 'bow', look: { blade: 0x4a3a24 }, animSet: 'npc', idle: 'fold' }
    : kind === 'linden' ? { style: 'none', animSet: 'npc', idle: 'kneel' }
    : kind === 'healer' ? { style: 'none', animSet: 'npc', idle: 'talk' }
    // Act IV: Arna with the first lantern (young, then old), Isarn as a boy, and the dead who walk with the fire
    : kind === 'arna' ? { style: 'staff', weapon: 'lanternStaff', animSet: 'npc' } : kind === 'arnaOld' ? { style: 'staff', weapon: 'lanternStaff', animSet: 'npc', idle: 'lantern' }
    : kind === 'isarnBoy' ? { style: 'none', animSet: 'npc', idle: 'Idle_Loop' }
    : kind === 'ivarGhost' || kind === 'wayfarerGhost' ? { style: 'staff', weapon: 'lanternStaff', look: { glow: kind === 'ivarGhost' ? 2.2 : 0.4, lamp: kind === 'ivarGhost' ? 0xffc070 : 0xc8d8f0 }, animSet: 'npc', idle: 'lantern' }
    : { style: 'none', animSet: 'npc', idle: ['fold', 'talk', 'Idle_Loop'][vi] };
  const av = makeAvatar(model, o);
  const a = new Actor({ x, z, team: 'npc', kind, radius: 0.5, speed: 0, hp: 1e9, avatar: av, rot });
  a.npc = kind;
  // a rooted elder does not turn to watch you, and barely stirs
  if (kind === 'linden') { a.still = true; a.animRate = 0.25; }
  if (kind === 'ivarGhost' || kind === 'wayfarerGhost') ghostly(av);
  else if (av.standIn && kind === 'isarnBoy') av.setTint(0xd8c8b0, 0.2);
  return a;
}
// the dead of the Wayfarers, seen for a moment: pale, see-through, a cold rim
export function ghostly(av, opacity = 0.45) {
  for (const m of av.model.mats || [av.mat]) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
  // drawn after the light on the ground (pools, rings): writing no depth, they would be washed out by what lies behind
  av.group.traverse((o) => { if (o.isMesh) o.renderOrder = 4; });
  av.setTint(0xd8e4ff, 0.55); av.setRim(0xe0ecff, 1.8);
}

// ---------- the hero ----------
export function heroAvatar(hero) {
  const C = CLASSES[hero.cls];
  const w = hero.equip.weapon, off = hero.equip.offhand;
  const look = weaponLook(w);
  const wtype = w ? (w.base === 'staff' ? 'staff' : w.base) : (hero.cls === 'warden' ? 'sword' : hero.cls === 'ranger' ? 'crossbow' : 'staff');
  const av = makeAvatar(hero.cls, { style: C.style, weapon: wtype, look });
  if (hero.cls === 'warden') av.hold('L', 'shield', off?.leg === 'lastBastion' ? { face: 0x8a1a1a, rim: 0xd8b860, glow: 0.8 } : off ? { face: [0x24365a, 0x2a4a7a, 0x6a5a20, 0x7a2a10][off.rar], rim: off.rar >= 2 ? 0xc8a860 : 0x9aa1ab } : { face: 0x3a3028, rim: 0x6a6460, emblem: 0x4a4038 });
  return av;
}
export function createPlayer(hero, x, z) {
  const av = heroAvatar(hero);
  const p = new Actor({ x, z, team: 'hero', kind: 'hero', radius: 0.45, speed: G.stats.speed, hp: G.stats.lifeMax, avatar: av, rot: Math.PI });
  p.hero = true;
  p.res = hero.cls === 'warden' ? 20 : 100;
  p.cds = [0, 0, 0, 0, 0]; p.dodgeCd = 0; p.potionCd = 0; p.buffs = {};
  p.act = null; p.comboStep = 0; p.comboT = 0;
  return p;
}
export function refreshHeroLook() {
  const p = G.player; if (!p) return;
  const old = p.avatar;
  const av = heroAvatar(G.hero);
  av.group.position.copy(old.group.position); av.group.rotation.copy(old.group.rotation);
  old.dispose(); p.avatar = av; av.actor = p; R.scene.add(av.group);
  if (p.trail) p.trail.setColor(G.hero.equip.weapon?.rar === 3 ? 0xffa040 : 0xd8e8ff);
}

// ---------- neighbours ----------
const CELL = 4;
const hash = new Map();
// the widest body in the hash: a query looks that much further for centres (a boss's centre can lie a few cells away
// while its body is within reach)
let maxR = 0;
export function rebuildHash() {
  hash.clear(); maxR = 0;
  for (const a of G.actors) {
    if (a.dead || a.team === 'npc') continue;
    const k = ((Math.floor(a.x / CELL) & 1023) << 10) | (Math.floor(a.z / CELL) & 1023);
    let b = hash.get(k); if (!b) hash.set(k, (b = [])); b.push(a);
    if (a.radius > maxR) maxR = a.radius;
  }
}
export function near(x, z, r, out = []) {
  out.length = 0;
  const R = r + maxR, x0 = Math.floor((x - R) / CELL), x1 = Math.floor((x + R) / CELL), z0 = Math.floor((z - R) / CELL), z1 = Math.floor((z + R) / CELL);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
    const b = hash.get(((i & 1023) << 10) | (j & 1023)); if (!b) continue;
    for (const a of b) { const dx = a.x - x, dz = a.z - z, rr = r + a.radius; if (dx * dx + dz * dz <= rr * rr) out.push(a); }
  }
  return out;
}
// what can be hit: not dead, not underground, not hidden (an archer in the trees, the Hart gone into mist)
export const foes = (x, z, r, out) => near(x, z, r, out).filter((a) => !a.dead && a.team === 'foe' && !a.under && !a.hidden && !a.airborne && !a.cling);
export const allies = (x, z, r) => near(x, z, r).filter((a) => !a.dead && a.team === 'hero');
export { clamp, t };
