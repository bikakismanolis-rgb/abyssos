// Realistic monsters: rigged GLBs with their own animation clips (see tools/creatures/README.md for the contract):
// clips idle/walk/run/attack/attack2/hit/die plus extras, scene extras { hit: {clip: seconds}, height, credit,
// walkSpeed, runSpeed }, and grip_R / grip_L nodes under the hands where weapons are parented (+Y along the blade).
import * as THREE from 'three';
import { gltfLoader } from './gltf.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { clamp, damp, smooth } from '../core/util.js';
import { bytes, patchPerson, personUniforms, cullSphere } from './people.js';
import { R } from './gfx.js';

// every creature GLB present at build time; missing ones fall back to the code-built models.
// Lazy: each URL is its own small module, so an inlined (artifact) build keeps every chunk small.
const FILES = import.meta.glob('../assets/creatures/*.glb', { query: '?url', import: 'default' });
const URLS = {};
for (const k in FILES) URLS[k.split('/').pop().replace('.glb', '')] = FILES[k];

// game model id -> [creature file, base scale]
const CAST = {
  goblin: ['goblin', 1], goblinArcher: ['goblin', 1], goblinShaman: ['goblin', 1.04],
  skeleton: ['skeleton', 1], skeletonArcher: ['skeleton', 1],
  warg: ['wolf', 1.15], spiritWolf: ['wolf', 1],
  spider: ['spider', 1], spiderling: ['spider', 0.5], weaver: ['spider', 2.6],
  ash: ['ashspawn', 1], troll: ['troll', 1],
  wraith: ['wight', 1], barrowLord: ['barrowlord', 1.15],
  magmaHound: ['magmahound', 1], caveBat: ['bat', 1], deepworm: ['worm', 1], stonewarden: ['golem', 1],
  // Act III (tools/creatures/act3)
  silverhorn: ['elk', 1], amberBear: ['bear', 1.12], amberMoth: ['moth', 1], rootling: ['mandrake', 1], rootwarden: ['treeman', 1],
  // Act IV (tools/creatures/act4)
  ashwing: ['ashwing', 1], smokeEater: ['smokeeater', 1], emberTick: ['embertick', 1],
  // Act V (tools/creatures/act5)
  tower: ['crab', 1], reefback: ['crab', 1],
  skotosHand: ['tentacle', 1], skotos: ['skotos', 1], icemaw: ['icemaw', 1], skua: ['skua', 1], hullLouse: ['louse', 1], rimeBear: ['bear', 1]
};

export const CREATURES = { tpl: {}, ready: false };
// each act's creatures load with its zones (Act I's at start-up); no argument loads every creature (the debug views)
const ACT_FILES = {
  act1: ['goblin', 'skeleton', 'wolf', 'spider', 'ashspawn', 'troll', 'wight', 'barrowlord'],
  act2: ['magmahound', 'bat', 'worm', 'golem'],
  act3: ['elk', 'bear', 'moth', 'mandrake', 'treeman'],
  act4: ['ashwing', 'smokeeater', 'embertick'],
  act5: ['crab', 'skotos', 'tentacle', 'icemaw', 'louse', 'skua', 'bear']
};
const loads = {};
function loadFile(n) {
  return (loads[n] ||= (async () => {
    try {
      const gltf = await gltfLoader().parseAsync(await bytes(await URLS[n]()), '');
      CREATURES.tpl[n] = prepare(gltf);
    } catch (e) { console.warn('creature ' + n + ' failed to load', e); delete loads[n]; } // the next zone tries again
  })());
}
export function loadCreatures(set, onFile) {
  const names = (set ? ACT_FILES[set] : [...new Set(Object.values(CAST).map((c) => c[0]))]).filter((n) => URLS[n]);
  return Promise.all(names.map((n) => loadFile(n).then(() => onFile?.()))).then(() => { CREATURES.ready = true; });
}
export const creatureCount = (set) => ACT_FILES[set].filter((n) => URLS[n]).length;
export const hasCreature = (model) => !!(CAST[model] && CREATURES.tpl[CAST[model][0]]);

function prepare(gltf) {
  const scene = gltf.scene;
  const ex = scene.userData || {};
  const clips = {};
  for (const c of gltf.animations) clips[c.name] = c;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    // packs are many: real shadows only on high quality, blob shadows always
    o.castShadow = R.quality >= 2; o.receiveShadow = false;
    // (extras.keepMat: the file's own sheen is meant, the Skotos's wet black and its Hands'; the frost enemies' wet roughness
    // is baked in their materials too, and creatures.js never sets roughness on those)
    if (ex.keepMat) return;
    const m = o.material;
    m.envMapIntensity = 0.4;
    if (m.roughness < 0.45 && !m.metalnessMap) m.roughness = 0.6;
  });
  const box = new THREE.Box3().setFromObject(scene);
  // spiders and wolves are wider or longer than they are tall
  const size = box.getSize(new THREE.Vector3()), extent = Math.max(size.x, size.z, ex.legSpan || 0, ex.length || 0);
  // (?? : the anchored Skotos and its Hands say 0, and mean it). ex: the file's other extras (rollSpeed, liftAt, touchAt,
  // the crab's socket and spireTop, overturned's times), for the AIs and actors.js
  return { scene, clips, hit: ex.hit || {}, height: ex.height || size.y, extent, walkSpeed: ex.walkSpeed ?? 1.4, runSpeed: ex.runSpeed ?? 4, credit: ex.credit, ex };
}

export function creatureModel(model, o = {}) {
  const [file, base] = CAST[model];
  const T = CREATURES.tpl[file];
  const root = cloneSkinned(T.scene);
  const inner = new THREE.Group(); inner.add(root); inner.scale.setScalar(base);
  const u = personUniforms(o);
  // the Skotos's hood opens on a void that must stay black: no rim, flash or tint reach it (it still dissolves with the rest)
  const uVoid = Object.assign({}, personUniforms({ rim: 0, rimI: 0 }), { uDissolve: u.uDissolve, uBurn: u.uBurn });
  const mats = [];
  root.traverse((m) => {
    if (!m.isMesh) return;
    const mat = m.material.clone();
    mat.userData.u = /void/i.test(m.material.name) ? uVoid : u;
    mat.onBeforeCompile = patchPerson;
    mat.customProgramCacheKey = () => 'person1';
    m.material = mat; mats.push(mat);
  });
  cullSphere(inner, T.height * base, T.extent * base);
  const bones = {}, grips = {};
  root.traverse((n) => { if (n.isBone) bones[n.name] = n; if (n.name === 'grip_R') grips.R = n; if (n.name === 'grip_L') grips.L = n; });
  // names the rest of the game asks for
  bones.handR = grips.R?.parent || bones.handR; bones.handL = grips.L?.parent || bones.handL;
  const mat = { userData: { u }, dispose() { for (const m of mats) m.dispose(); } };
  return {
    mesh: inner, bones, mat, mats, kind: 'creature', tpl: T, grips, base,
    // weapons are made for a human hand: a goblin's crossbow is smaller, a troll's club bigger
    weaponScale: clamp(T.height / 1.8, 0.62, 1.35),
    rest: { hips: { y: 1 } }, dims: { s: (T.height * base) / 1.8 },
    dispose() { mat.dispose(); root.traverse((o) => o.skeleton?.dispose()); } // (and the skeletons' bone-matrix textures)
  };
}

// logical action -> clips to try in order
const MAP = {
  slash1: ['attack'], slash2: ['attack2', 'attack'], slash3: ['attack', 'attack2'], stab: ['attack2', 'attack'], chop: ['attack', 'slam'], smash: ['slam', 'attack'],
  slam: ['slam', 'attack'], heavyStab: ['attack2', 'attack'], spin: ['attack2', 'attack'], spinOnce: ['attack2', 'attack'], leap: ['leap', 'pounce', 'attack'],
  dual: ['attack2', 'attack'], claw: ['attack', 'attack2'], punch: ['attack'], kick: ['attack2', 'attack'],
  bite: ['bite', 'attack'], pounce: ['pounce', 'leap', 'attack'], howl: ['howl', 'warcry'], rear: ['rear', 'warcry'], spit: ['spit', 'attack'],
  warcry: ['warcry', 'howl', 'rear'], taunt: ['warcry', 'howl', 'rear', 'cast'],
  shoot: ['shoot', 'attack'], shootFast: ['shoot', 'attack'], volley: ['shoot', 'attack'], aim: ['shoot', 'attack'], reload: ['shoot'],
  cast: ['cast', 'attack'], castUp: ['cast'], channel: ['cast'], castLong: ['cast'], summon: ['cast', 'warcry'], blink: ['blink', 'cast'],
  hit: ['hit'], hit2: ['hit'], die: ['die'], dieFwd: ['die'], dieBones: ['die'],
  rise: ['rise', 'riseStand', 'spawn'], riseStand: ['riseStand', 'rise'], spawn: ['spawn', 'rise', 'riseStand'], bonePile: ['bonePile'], block: ['hit'], blockHit: ['hit'],
  // Act IV: the Ashwing's flight, the Smoke-eater's meal and grab, the Ember Tick's hold
  glide: ['glide', 'walk'], dive: ['dive', 'glide', 'attack'], land: ['land', 'hit'], takeoff: ['takeoff', 'glide'], consume: ['consume', 'cast', 'attack'],
  cling: ['cling', 'idle'], perch: ['perch'], Shield_Dash: ['charge', 'attack2', 'attack'], Hit_Knockback: ['hit'], Idle_Shield_Break: ['hit'],
  Idle_Rail_Call: ['howl', 'warcry', 'cast'], Melee_Hook: ['attack2', 'attack'], KK_Spellcast_Shoot: ['cast', 'attack'],
  // Act V: the crabs (the Walking Tower, the Reefback), the Hull-louse, the Icemaw, the Skua, the Skotos and its Hands
  rock: ['rock', 'idle'], wake: ['wake', 'rise'], settle: ['settle', 'rock'], overturned: ['overturned', 'daze'], shake: ['shake', 'hit'], side: ['side', 'walk'], crawl: ['crawl', 'walk'],
  flounder: ['flounder', 'daze', 'hit'], breach: ['breach', 'rise'], daze: ['daze', 'hit'],
  curl: ['curl'], uncurl: ['uncurl', 'spawn'], roll: ['roll', 'curl'],
  lunge: ['lunge', 'attack'], drag: ['attack2', 'attack'], surface: ['surface', 'rise'], slide: ['slide', 'dive'], stranded: ['stranded', 'hit'],
  sweep: ['sweep', 'attack'], lash: ['lash', 'sweep'], wrap: ['wrap', 'cast'], smother: ['smother', 'slam'], recoil: ['recoil', 'hit'], sink: ['sink', 'die'], drink: ['drink', 'roar'], roar: ['roar', 'howl']
};
// held at their last frame: deaths, the dormant poses (a crab's rock, a louse's ball), what ends under the water or the ice
// (an Icemaw's dive and slide, the crab's dive, the Skotos's sink), the Tower's settle into its island and its overturn
const HOLD = new Set(['die', 'dieFwd', 'dieBones', 'bonePile', 'aim', 'rock', 'curl', 'overturned', 'settle', 'sink', 'dive', 'slide']);
const LOOP = new Set(['channel', 'bonePile', 'spin', 'glide', 'consume', 'cling', 'perch', 'stranded', 'side', 'crawl', 'flounder', 'roll']);

export class CreatureAnim {
  constructor(av) {
    this.av = av; this.T = av.model.tpl; this.b = av.bones;
    this.mixer = new THREE.AnimationMixer(av.model.mesh);
    this.loco = {};
    // (a creature without a walk or a run, the anchored Skotos and its Hands, keeps its idle: those weights go to the idle)
    for (const k of ['idle', 'walk', 'run']) {
      const clip = this.T.clips[k] || (k === 'idle' ? this.T.clips.walk : null); if (!clip) continue;
      const a = this.mixer.clipAction(clip, undefined, undefined);
      a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      a.time = Math.random() * clip.duration;
      this.loco[k] = a;
    }
    this.act = null; this.actName = null; this.t = Math.random() * 10; this.hit = 0; this.locoW = 1;
    this.glow = av.model.mats.filter((m) => m.emissiveMap);
    // hit flinch about the creature's sideways axis, on the upper spine if there is one
    const fb = ['spine_03', 'chest', 'spine4', 'spine3', 'spine_02', 'spine2', 'spine', 'spine_01', 'body'].find((n) => this.b[n]);
    this.flinchBone = fb ? this.b[fb] : null;
    if (this.flinchBone) {
      av.model.mesh.updateMatrixWorld(true);
      this.flinchAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(this.flinchBone.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
    }
    this.flinchQ = new THREE.Quaternion();
  }
  clipFor(name) {
    for (const c of MAP[name] || [name]) if (this.T.clips[c]) return this.T.clips[c];
    return null;
  }
  // o.hitIn: seconds until the game applies the hit; the clip is time-scaled so its strike lands then
  play(name, speed = 1, o = {}) {
    const clip = this.clipFor(name); if (!clip) return 0;
    if (this.act && this.act.getClip() !== clip) this.act.fadeOut(0.1);
    const a = this.mixer.clipAction(clip);
    a.reset();
    const loop = LOOP.has(name) || o.loop;
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    const strike = this.T.hit[clip.name];
    if (o.hitIn && strike) speed = clamp(strike / o.hitIn, 0.5, 2.5);
    a.timeScale = speed;
    // aiming holds the shot pose: the moment the bolt would leave
    if (name === 'aim') { a.time = strike || clip.duration * 0.3; a.timeScale = 0; }
    a.setEffectiveWeight(1);
    a.fadeIn(o.fade ?? 0.1);
    a.play();
    this.act = a; this.actName = name; this.hold = HOLD.has(name) || o.hold; this.loop = loop;
    return clip.duration / Math.max(0.01, speed);
  }
  hitAt(name) { const c = this.clipFor(name), s = c && this.T.hit[c.name]; return s ? s / c.duration : null; }
  duration(name) { const c = this.clipFor(name); return c ? c.duration : 0; }
  stop(fade = 0.15) { if (this.act) { this.act.fadeOut(fade); this.act = null; this.actName = null; } }
  get busy() { return !!this.act && (this.loop || this.act.isRunning()); }
  get progress() { return this.act ? Math.min(1, this.act.time / this.act.getClip().duration) : 1; }
  update(dt, st) {
    this.t += dt;
    const speed = (st.speed || 0) / (this.av.model.base * (this.av.scale || 1));
    if (this.act && !this.loop && !this.hold && !this.act.isRunning()) { this.act.fadeOut(0.18); this.act = null; this.actName = null; }
    const actOn = !!this.act;
    this.locoW = damp(this.locoW, actOn ? 0 : 1, actOn ? 30 : 9, dt);
    const T = this.T, walkS = T.walkSpeed, runS = Math.max(T.runSpeed, walkS * 1.6);
    // (the dive and the slide end under the ice: under is true once they are done, for the AI to take it under)
    this.under = !!this.act && (this.actName === 'dive' || this.actName === 'slide') && !this.act.isRunning();
    let wi = 1, ww = 0, wr = 0;
    if (speed > 0.12) {
      if (speed < walkS * 1.2) { const k = clamp(speed / walkS, 0, 1); wi = 1 - k; ww = k; }
      else { const k = clamp((speed - walkS * 1.2) / (runS - walkS * 1.2), 0, 1); wi = 0; ww = 1 - k; wr = k; }
    }
    const L = this.loco;
    if (!L.run) { ww += wr; wr = 0; }
    if (!L.walk) { wi += ww; ww = 0; }
    L.idle?.setEffectiveWeight(wi * this.locoW); L.walk?.setEffectiveWeight(ww * this.locoW); L.run?.setEffectiveWeight(wr * this.locoW);
    if (L.walk && walkS > 0) L.walk.timeScale = clamp(speed / walkS, 0.5, 2.2);
    if (L.run && runS > 0) L.run.timeScale = clamp(speed / runS, 0.7, 1.8);
    // a Hull-louse's ball rolls at the speed it travels (extras.rollSpeed: metres a second at 1x); a Skua lifts off its roost
    // only after the first beat of its takeoff (extras.liftAt): liftK 0-1 for the AI's height
    const ex = T.ex || {};
    if (this.actName === 'roll' && ex.rollSpeed && this.act) this.act.timeScale = clamp(speed / ex.rollSpeed, 0.2, 4);
    if (this.actName === 'takeoff' && this.act) { const d = this.act.getClip().duration, l = ex.liftAt ?? 0; this.liftK = clamp((this.act.time - l) / Math.max(0.05, d - l), 0, 1); }
    else this.liftK = this.actName === 'land' && this.act ? 1 - clamp(this.act.time / Math.max(0.05, ex.touchAt ?? this.act.getClip().duration), 0, 1) : 0;
    this.mixer.update(dt);
    if (this.hit > 0 && this.flinchBone) {
      this.hit = Math.max(0, this.hit - dt * 5);
      this.flinchQ.setFromAxisAngle(this.flinchAxis, -0.3 * smooth(this.hit));
      this.flinchBone.quaternion.multiply(this.flinchQ);
    } else this.hit = Math.max(0, this.hit - dt * 5);
    // embers and ghost-light breathe
    for (const m of this.glow) m.emissiveIntensity = 1 + Math.sin(this.t * 3.1) * 0.35 + Math.sin(this.t * 7.7) * 0.15;
  }
}

export function creatureCredits() {
  return Object.entries(CREATURES.tpl).map(([k, t]) => t.credit).filter(Boolean);
}
