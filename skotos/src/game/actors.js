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
import { MONSTERS, DIFFS, monsterHP, monsterDmg, AFFIXES, CLASSES, PACK_DORMANT } from './data.js';
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
  hollowed: 'skeleton', rootsworn: 'warden', rootswornArcher: 'ranger', mourner: 'healer', amaranthe: 'healer', elati: 'ranger', linden: 'healer'
};
export function makeAvatar(model, o = {}) {
  for (let i = 0; i < 3 && !hasPerson(model) && !hasCreature(model) && !BUILD[model] && STAND_IN[model]; i++) model = STAND_IN[model];
  const m = hasPerson(model) ? personModel(model) : hasCreature(model) ? creatureModel(model) : instance(model);
  const av = new Avatar(m, { style: o.style || STYLE[model] || 'none', animSet: o.animSet, hunch: o.hunch, scale: o.scale, idle: o.idle });
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
    if ((a.elite || a.boss || a.pet) && !a.dead && k < 40) {
      _p.set(a.x, 0.06, a.z); _s.setScalar(a.radius * 1.5); rings.setMatrixAt(k, _m.compose(_p, _q, _s));
      rings.setColorAt(k, _c.set(a.boss ? 0xff4020 : a.elite === 'rare' ? 0xffc030 : a.pet ? 0x60c0ff : 0x5080ff));
      k++;
    }
  }
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
  rings.count = k; rings.instanceMatrix.needsUpdate = true; if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
}

// ---------- actor ----------
export class Actor {
  constructor(o) {
    this.id = uid();
    this.x = o.x; this.z = o.z; this.y = 0; this.vx = 0; this.vz = 0; this.rot = o.rot ?? Math.random() * 6.28;
    this.team = o.team; this.kind = o.kind; this.def = o.def || {};
    this.radius = o.radius ?? 0.45; this.speed = o.speed ?? 4;
    this.hp = this.hpMax = o.hp ?? 10; this.dmg = o.dmg ?? 1; this.level = o.level ?? 1;
    this.dead = false; this.deadT = 0; this.removed = false;
    this.status = { stun: 0, freeze: 0, slow: 0, slowK: 0, fear: 0, burn: 0, burnDps: 0, poison: 0, poisonDps: 0, chill: 0, root: 0, rootImm: 0, stick: 0 };
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
  const av = makeAvatar(def.model, { style, animSet: def.ai === 'melee' && (id === 'skeleton') ? 'undead' : undefined, hunch: def.hunch, weapon, look: wlook, scale });
  if (id === 'skeleton' && Math.random() < 0.5) av.hold('L', 'shield', { face: 0x4a3a2a, rim: 0x5a5248, emblem: 0x3a3028, r: 0.26 });
  if (id === 'stoneborn') av.hold('L', 'shield', { face: 0x3a2a24, rim: 0x8a6a3a, emblem: 0xb07a30, r: 0.3 });
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
  // the Hollowed of the hollows and the sleepers' cocoons pass for dead wood until the hero is close
  const tag = o.packId != null && G.zone?.packs?.find((p) => p.id === o.packId)?.tag;
  if (def.ai === 'hollow' && (o.dormant ?? (tag && PACK_DORMANT[tag]))) {
    a.dormant = true; a.disguised = true;
    av.setTint(0x2a2016, 0.85);
  }
  if (id === 'amaranthe') { amberCrown(av); shardGlow(a, av); a.hpFloor = a.hpMax * 0.649; a.dazeClip = 'kneel'; }
  if (id === 'mourner') veil(av);
}
// attach obj to a bone so that it stands upright in the rest pose, offset (in metres, character space) from the bone
const _ma = new THREE.Matrix4(), _pa = new THREE.Vector3(), _qa = new THREE.Quaternion(), _sa = new THREE.Vector3();
function attachUpright(av, boneName, obj, ox, oy, oz) {
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
  const model = kind === 'villager' ? 'villager' + (Math.floor(x + z) % 3) : kind;
  const vi = Math.floor(x + z) % 3;
  const o = kind === 'wayfarer' ? { style: 'staff', weapon: 'lanternStaff', animSet: 'npc' } : kind === 'smith' ? { style: 'none', weapon: 'hammer', animSet: 'npc', idle: 'hammer' }
    : kind === 'brokka' ? { style: 'none', weapon: 'hammer', animSet: 'npc', idle: 'fold' }
    // Act III: Elati, the last Evergreen scout, bow in hand; Old Linden, half rooted, kneeling in her own roots
    : kind === 'elati' ? { style: 'none', weapon: 'bow', look: { blade: 0x4a3a24 }, animSet: 'npc', idle: 'fold' }
    : kind === 'linden' ? { style: 'none', animSet: 'npc', idle: 'kneel' }
    : kind === 'healer' ? { style: 'none', animSet: 'npc', idle: 'talk' } : { style: 'none', animSet: 'npc', idle: ['fold', 'talk', 'Idle_Loop'][vi] };
  const av = makeAvatar(model, o);
  const a = new Actor({ x, z, team: 'npc', kind, radius: 0.5, speed: 0, hp: 1e9, avatar: av, rot });
  a.npc = kind;
  // a rooted elder does not turn to watch you, and barely stirs
  if (kind === 'linden') { a.still = true; a.animRate = 0.25; }
  return a;
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
export function rebuildHash() {
  hash.clear();
  for (const a of G.actors) {
    if (a.dead || a.team === 'npc') continue;
    const k = ((Math.floor(a.x / CELL) & 1023) << 10) | (Math.floor(a.z / CELL) & 1023);
    let b = hash.get(k); if (!b) hash.set(k, (b = [])); b.push(a);
  }
}
export function near(x, z, r, out = []) {
  out.length = 0;
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
    const b = hash.get(((i & 1023) << 10) | (j & 1023)); if (!b) continue;
    for (const a of b) { const dx = a.x - x, dz = a.z - z, rr = r + a.radius; if (dx * dx + dz * dz <= rr * rr) out.push(a); }
  }
  return out;
}
// what can be hit: not dead, not underground, not hidden (an archer in the trees, the Hart gone into mist)
export const foes = (x, z, r, out) => near(x, z, r, out).filter((a) => !a.dead && a.team === 'foe' && !a.under && !a.hidden);
export const allies = (x, z, r) => near(x, z, r).filter((a) => !a.dead && a.team === 'hero');
export { clamp, t };
