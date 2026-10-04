// Realistic humans: Quaternius characters (CC0) on a UE-style skeleton, animated from moves.bin
// (Quaternius Universal Animation Library plus retargeted KayKit clips, see tools/pack-ue-anims.mjs).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { clamp, damp, smooth } from '../core/util.js';
import { ANIMS } from './anims.data.js';
import peopleUrl from '../assets/people.glb?url';
import movesUrl from '../assets/moves.bin?url';

export const PEOPLE = { scenes: {}, moves: null, ready: false };

export async function bytes(url) {
  // inlined builds carry assets as data URIs: decode them instead of fetching
  if (url.startsWith('data:')) {
    const bin = atob(url.slice(url.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  return (await fetch(url)).arrayBuffer();
}

function parseMoves(buf) {
  const dv = new DataView(buf), hl = dv.getUint32(4, true);
  const h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const data = new Int16Array(buf, 8 + hl);
  h.byName = new Map(h.clips.map((c) => [c.name, c]));
  h.data = data;
  return h;
}

let loading = null;
export function loadPeople() {
  if (loading) return loading;
  loading = (async () => {
    const [glb, mv] = await Promise.all([bytes(peopleUrl), bytes(movesUrl)]);
    PEOPLE.moves = parseMoves(mv);
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(glb, '');
    for (const s of gltf.scenes) {
      // GLTFLoader makes node names unique across the file (pelvis, pelvis_1, ...): restore the originals
      s.traverse((o) => { if (o.userData?.name) o.name = o.userData.name; });
      prepareTemplate(s);
      PEOPLE.scenes[s.name] = s;
    }
    PEOPLE.ready = true;
  })();
  return loading;
}
export const hasPerson = (name) => !!PEOPLE.scenes[name];

// ---------- materials: hit flash, tint, rim light and the burning dissolve, shared per character ----------
const NOISE = `
float ph31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float pnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
 return mix(mix(mix(ph31(i),ph31(i+vec3(1,0,0)),f.x), mix(ph31(i+vec3(0,1,0)),ph31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(ph31(i+vec3(0,0,1)),ph31(i+vec3(1,0,1)),f.x), mix(ph31(i+vec3(0,1,1)),ph31(i+vec3(1,1,1)),f.x),f.y),f.z); }`;
export function patchPerson(sh) {
  Object.assign(sh.uniforms, this.userData.u);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
    .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vWPos;
uniform float uFlash; uniform float uDissolve; uniform vec3 uRimColor; uniform float uRim; uniform vec3 uTint; uniform float uTintAmt; uniform vec3 uBurn;
${NOISE}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uTint * 1.6, uTintAmt);
float dn = 1.0;
if (uDissolve > 0.0) { dn = pnoise(vWPos * 4.0) * 0.7 + pnoise(vWPos * 11.0) * 0.3; if (dn < uDissolve) discard; }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);
totalEmissiveRadiance += uRimColor * rimF * uRim * 0.5;
totalEmissiveRadiance += vec3(1.0, 0.82, 0.65) * uFlash;
if (uDissolve > 0.0) totalEmissiveRadiance += uBurn * 5.0 * (1.0 - smoothstep(0.0, 0.07, dn - uDissolve));`);
}
export function personUniforms(o = {}) {
  return {
    uFlash: { value: 0 }, uDissolve: { value: 0 },
    uRimColor: { value: new THREE.Color(o.rim ?? 0x6080b0) }, uRim: { value: o.rimI ?? 0.3 },
    uTint: { value: new THREE.Color(1, 1, 1) }, uTintAmt: { value: 0 },
    uBurn: { value: new THREE.Color(o.burn ?? 0xff6a1a) }
  };
}

// ---------- templates ----------
const FINGER = /^(index|middle|ring|pinky|thumb)_\d\d_[lr]$/;
const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
function prepareTemplate(scene) {
  scene.updateMatrixWorld(true);
  const bones = {};
  scene.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  // weapon grips: KayKit's hand slot orientation (world, rest) expressed in this rig's hand frames
  const grip = {};
  for (const [side, bn] of [['R', 'hand_r'], ['L', 'hand_l']]) {
    const hb = bones[bn]; if (!hb) continue;
    const hq = hb.getWorldQuaternion(new THREE.Quaternion()).invert();
    const slot = ANIMS['slot' + side].q;
    const q = hq.clone().multiply(new THREE.Quaternion(slot[0], slot[1], slot[2], slot[3]));
    // palm centre: along the hand towards the fingers and a little below, in world rest space
    const off = new THREE.Vector3(side === 'R' ? -0.085 : 0.085, -0.025, 0).applyQuaternion(hq);
    grip[side] = { q, p: off };
    // pistol grip (crossbows): length (+Z) along the fingers, top (+Y) towards the thumb; T-pose palms face down
    const sg = side === 'R' ? -1 : 1;
    const Y = new THREE.Vector3(0, 0, 1), Z = new THREE.Vector3(sg, 0, 0), X = Y.clone().cross(Z);
    const basis = new THREE.Matrix4().makeBasis(X, Y, Z);
    const wq = new THREE.Quaternion().setFromRotationMatrix(basis);
    grip[side + 'pistol'] = { q: hq.clone().multiply(wq), p: new THREE.Vector3(sg * 0.07, -0.03, 0).applyQuaternion(hq) };
  }
  const box = new THREE.Box3().setFromObject(scene);
  scene.userData.tpl = { grip, height: box.max.y - box.min.y, hip: bones.pelvis.getWorldPosition(_v).y };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const part = o.material.userData?.part || 'cloth';
    o.material.envMapIntensity = part === 'skin' ? 0.35 : part === 'eyes' ? 0.8 : 0.45;
    o.castShadow = part === 'cloth';
    o.receiveShadow = false;
    o.frustumCulled = false;
  });
}

// Skinned meshes cull against a generous sphere around the standing character (in each mesh's own space),
// so off-screen characters are not drawn; three.js would otherwise use the bind pose or skip culling.
const _inv = new THREE.Matrix4();
export function cullSphere(root, height, extent = height) {
  root.updateMatrixWorld(true);
  const ws = new THREE.Sphere(new THREE.Vector3(0, height * 0.5, 0), Math.max(height, extent) * 0.75 + 0.6);
  root.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    m.boundingSphere = ws.clone().applyMatrix4(_inv.copy(m.matrixWorld).invert());
    m.frustumCulled = true;
  });
}

// a fresh, independently animated copy of a character
export function personModel(name, o = {}) {
  const tpl = PEOPLE.scenes[name];
  if (!tpl) throw new Error('unknown person ' + name);
  const group = cloneSkinned(tpl);
  const u = personUniforms(o);
  const mats = [];
  group.traverse((m) => {
    if (!m.isMesh) return;
    const mat = m.material.clone();
    mat.userData.u = u;
    mat.onBeforeCompile = patchPerson;
    mat.customProgramCacheKey = () => 'person1';
    m.material = mat; mats.push(mat);
  });
  cullSphere(group, tpl.userData.tpl.height);
  const bones = {};
  group.traverse((b) => { if (b.isBone) bones[b.name] = b; });
  // the names the rest of the game uses
  Object.assign(bones, { handR: bones.hand_r, handL: bones.hand_l, head: bones.Head, chest: bones.spine_03, spine: bones.spine_01, hips: bones.pelvis, neck: bones.neck_01 });
  const t = tpl.userData.tpl;
  const mat = { userData: { u }, dispose() { for (const m of mats) m.dispose(); } };
  return {
    mesh: group, bones, mat, kind: 'person', grip: t.grip, hip: t.hip, height: t.height,
    rest: { hips: { y: t.hip } }, dims: { s: t.height / 1.8 },
    dispose() { mat.dispose(); }
  };
}

// ---------- clips ----------
const CLIPS = new Map();
export function personClip(name, hipH) {
  const M = PEOPLE.moves; if (!M) return null;
  const c = M.byName.get(name); if (!c) return null;
  const key = name + '|' + hipH.toFixed(3);
  if (CLIPS.has(key)) return CLIPS.get(key);
  const nb = M.bones.length, stride = nb * 3 + 3, n = c.n, base = c.off / 2;
  const times = new Float32Array(n);
  for (let f = 0; f < n; f++) times[f] = f / M.fps;
  const tracks = [];
  for (let b = 0; b < nb; b++) {
    const v = new Float32Array(n * 4);
    for (let f = 0; f < n; f++) {
      const i = base + f * stride + b * 3;
      const x = M.data[i] / 32767, y = M.data[i + 1] / 32767, z = M.data[i + 2] / 32767;
      v[f * 4] = x; v[f * 4 + 1] = y; v[f * 4 + 2] = z; v[f * 4 + 3] = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z));
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(M.bones[b] + '.quaternion', times, v));
  }
  const s = hipH / M.hip, p = new Float32Array(n * 3);
  for (let f = 0; f < n; f++) for (let k = 0; k < 3; k++) p[f * 3 + k] = (M.data[base + f * stride + nb * 3 + k] / 8192) * M.hip * s;
  tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times, p));
  const clip = new THREE.AnimationClip(name, (n - 1) / M.fps, tracks);
  clip.hit = c.hit;
  CLIPS.set(key, clip);
  return clip;
}

// locomotion per weapon style
const SETS = {
  sword: { idle: 'Sword_Idle', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' },
  bow: { idle: 'Pistol_Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' },
  staff: { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' },
  heavy: { idle: 'KK_Idle_Combat', walk: 'KK_Walking_C', run: 'KK_Running_A' },
  claw: { idle: 'Zombie_Idle_Loop', walk: 'Zombie_Walk_Fwd_Loop', run: 'KK_Running_C' },
  undead: { idle: 'Zombie_Idle_Loop', walk: 'Zombie_Walk_Fwd_Loop', run: 'KK_Running_C' },
  none: { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' },
  npc: { idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop' }
};
// logical action -> clip (same names the KayKit humanoids use)
export const PERSON_ACTIONS = {
  slash1: 'Sword_Regular_A', slash2: 'Sword_Regular_B', slash3: 'KK_1H_Melee_Attack_Chop', stab: 'KK_1H_Melee_Attack_Stab',
  spin: 'KK_2H_Melee_Attack_Spinning', spinOnce: 'KK_2H_Melee_Attack_Spin', leap: 'KK_1H_Melee_Attack_Jump_Chop', slam: 'KK_2H_Melee_Attack_Chop', chop: 'KK_2H_Melee_Attack_Chop',
  smash: 'KK_2H_Melee_Attack_Slice', heavyStab: 'KK_2H_Melee_Attack_Stab', dual: 'KK_Dualwield_Melee_Attack_Slice', claw: 'Zombie_Scratch', punch: 'Punch_Cross', kick: 'KK_Unarmed_Melee_Attack_Kick',
  warcry: 'KK_Taunt', taunt: 'KK_Taunt_Longer', block: 'Sword_Block', blockHit: 'KK_Block_Hit',
  shoot: 'KK_1H_Ranged_Shoot', shootFast: 'KK_1H_Ranged_Shoot', volley: 'KK_2H_Ranged_Shoot', reload: 'KK_1H_Ranged_Reload', aim: 'KK_1H_Ranged_Aiming',
  cast: 'Spell_Simple_Shoot', castUp: 'KK_Spellcast_Raise', channel: 'KK_Spellcasting', castLong: 'KK_Spellcast_Long', summon: 'KK_Spellcast_Summon',
  roll: 'Roll', dodgeBack: 'KK_Dodge_Backward', blink: 'Spell_Simple_Shoot', drink: 'Consume', interact: 'Interact', pickup: 'PickUp_Table', throw: 'OverhandThrow', cheer: 'KK_Cheer',
  hit: 'Hit_Chest', hit2: 'Hit_Head', die: 'Death01', dieFwd: 'KK_Death_B', dieBones: 'KK_Death_C_Skeletons', rise: 'KK_Skeletons_Awaken_Floor', riseStand: 'KK_Skeletons_Awaken_Standing', spawn: 'KK_Spawn_Ground',
  jump: 'Jump_Start', emote: 'Yes', hammer: 'TreeChopping_Loop', sit: 'Sitting_Idle_Loop', lie: 'KK_Lie_Idle', bonePile: 'KK_Skeletons_Inactive_Floor_Pose',
  talk: 'Idle_Talking_Loop', fold: 'Idle_FoldArms_Loop', lantern: 'Idle_Lantern_Loop', torch: 'Idle_Torch_Loop', kneel: 'Fixing_Kneeling', harvest: 'Farm_Harvest', no: 'Idle_No_Loop'
};
// a crossbow is held like a pistol: realistic one-handed aiming instead of KayKit's chibi poses
const STYLE_ACTIONS = {
  bow: { shoot: 'Pistol_Shoot', shootFast: 'Pistol_Shoot', aim: 'Pistol_Aim_Neutral', reload: 'Pistol_Reload', volley: 'Pistol_Shoot' }
};
const HOLD = new Set(['die', 'dieFwd', 'dieBones', 'lie', 'sit', 'bonePile']);
const LOOP = new Set(['spin', 'channel', 'sit', 'lie', 'aim', 'bonePile', 'talk', 'fold', 'lantern', 'torch', 'kneel', 'harvest', 'hammer']);

export class PersonAnim {
  constructor(av) {
    this.av = av; this.b = av.bones;
    this.hipH = av.model.hip;
    this.mixer = new THREE.AnimationMixer(av.group);
    this.set = Object.assign({}, SETS[av.animSet || av.style] || SETS.none);
    this.acts = Object.assign({}, PERSON_ACTIONS, STYLE_ACTIONS[av.style]);
    if (av.idleClip) this.set.idle = PERSON_ACTIONS[av.idleClip] || av.idleClip;
    this.loco = {};
    for (const k of ['idle', 'walk', 'run']) {
      const a = this.mixer.clipAction(personClip(this.set[k], this.hipH));
      a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      a.time = Math.random() * a.getClip().duration;
      this.loco[k] = a;
    }
    this.act = null; this.actName = null; this.t = 0; this.hit = 0; this.locoW = 1;
    // flinch axis: the character's sideways axis in the chest bone's frame
    const chest = this.b.spine_03;
    av.group.updateMatrixWorld(true);
    this.flinchAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(chest.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
    this.flinchQ = new THREE.Quaternion();
  }
  play(name, speed = 1, o = {}) {
    const clipName = this.acts[name] || name;
    const clip = personClip(clipName, this.hipH); if (!clip) return 0;
    if (this.act && this.act.getClip() !== clip) this.act.fadeOut(0.1);
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(LOOP.has(name) || o.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.timeScale = speed;
    a.setEffectiveWeight(1);
    a.fadeIn(o.fade ?? 0.08);
    a.play();
    this.act = a; this.actName = name; this.hold = HOLD.has(name) || o.hold; this.loop = LOOP.has(name) || o.loop;
    return clip.duration / speed;
  }
  // fraction of an action's clip where its strike lands
  hitAt(name) { const c = personClip(this.acts[name] || name, this.hipH); return c && c.duration > 0 ? c.hit / c.duration : null; }
  duration(name) { const c = personClip(this.acts[name] || name, this.hipH); return c ? c.duration : 0; }
  stop(fade = 0.15) { if (this.act) { this.act.fadeOut(fade); this.act = null; this.actName = null; } }
  get busy() { return !!this.act && (this.loop || this.act.isRunning()); }
  get progress() { return this.act ? Math.min(1, this.act.time / this.act.getClip().duration) : 1; }
  update(dt, st) {
    this.t += dt;
    const speed = st.speed || 0;
    if (this.act && !this.loop && !this.hold && !this.act.isRunning()) { this.act.fadeOut(0.18); this.act = null; this.actName = null; }
    const actOn = !!this.act;
    this.locoW = damp(this.locoW, actOn ? 0 : 1, actOn ? 30 : 9, dt);
    const walkS = st.walkSpeed || 2.2, runS = st.runSpeed || 5;
    let wi = 1, ww = 0, wr = 0;
    if (speed > 0.15) {
      if (speed < walkS) { const k = speed / walkS; wi = 1 - k; ww = k; }
      else { const k = clamp((speed - walkS) / (runS - walkS), 0, 1); wi = 0; ww = 1 - k; wr = k; }
    }
    const L = this.loco;
    L.idle.setEffectiveWeight(wi * this.locoW); L.walk.setEffectiveWeight(ww * this.locoW); L.run.setEffectiveWeight(wr * this.locoW);
    L.walk.timeScale = clamp(speed / 1.45, 0.5, 2);
    L.run.timeScale = clamp(speed / 3.9, 0.7, 1.8);
    this.mixer.update(dt);
    if (this.hit > 0) {
      this.hit = Math.max(0, this.hit - dt * 5);
      this.flinchQ.setFromAxisAngle(this.flinchAxis, -0.35 * smooth(this.hit));
      this.b.spine_03.quaternion.multiply(this.flinchQ);
    }
    if (st.float) this.b.pelvis.position.y += Math.sin(this.t * 2.2) * 0.08 + 0.15;
  }
}

// finger poses for a hand that grips something or hangs relaxed
export function setHand(bones, side, closed) {
  const M = PEOPLE.moves; if (!M) return;
  const pose = M.hands[closed ? 'fist' : 'open'];
  const sfx = side === 'R' ? '_r' : '_l';
  for (const k in pose) if (k.endsWith(sfx) && bones[k]) bones[k].quaternion.fromArray(pose[k]);
}
export { FINGER };
