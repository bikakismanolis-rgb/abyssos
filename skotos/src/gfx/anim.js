// Procedural animation: locomotion cycles plus keyframed action clips, blended per joint.
// Bone rotations use Euler order YXZ: z raises sideways, x pitches forward(-)/back(+), y swings around the vertical.
import * as THREE from 'three';
import { clamp, lerp, smooth, damp, TAU } from '../core/util.js';
import { weaponGeo, shieldGeo, heldMesh } from './models.js';
import { ANIMS } from './anims.data.js';
import { PersonAnim, setHand } from './people.js';
import { CreatureAnim } from './creatures.js';
import { makeCharMat } from './rig.js';


// ---------- humanoids: retargeted KayKit clips on an AnimationMixer ----------
function b64i16(str) {
  const bin = atob(str), n = bin.length, u8 = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
  return new Int16Array(u8.buffer);
}
const RAW = new Map();
function raw(name) {
  if (RAW.has(name)) return RAW.get(name);
  const c = ANIMS.clips[name]; if (!c) return null;
  const r = { d: c.d, n: c.n, q: b64i16(c.q), h: b64i16(c.h) };
  RAW.set(name, r);
  return r;
}
const CLIPS = new Map();
// a clip for a rig with the given hip height; rotations are shared, hip motion is scaled
export function getClip(name, hipH) {
  const key = name + '|' + hipH.toFixed(2);
  if (CLIPS.has(key)) return CLIPS.get(key);
  const r = raw(name); if (!r) return null;
  const nb = ANIMS.bones.length, times = new Float32Array(r.n);
  for (let f = 0; f < r.n; f++) times[f] = Math.min(r.d, f / ANIMS.fps);
  const tracks = [];
  ANIMS.bones.forEach((b, bi) => {
    if (b === 'root') return;
    const v = new Float32Array(r.n * 4);
    let moving = false;
    for (let f = 0; f < r.n; f++) for (let k = 0; k < 4; k++) {
      v[f * 4 + k] = r.q[(f * nb + bi) * 4 + k] / 32767;
      if (k < 3 && Math.abs(v[f * 4 + k]) > 1e-3) moving = true;
    }
    if (moving || b !== 'neck') tracks.push(new THREE.QuaternionKeyframeTrack(b + '.quaternion', times, v));
  });
  const hp = new Float32Array(r.n * 3);
  for (let f = 0; f < r.n; f++) { hp[f * 3] = (r.h[f * 3] / 8192) * hipH; hp[f * 3 + 1] = (r.h[f * 3 + 1] / 8192) * hipH; hp[f * 3 + 2] = (r.h[f * 3 + 2] / 8192) * hipH; }
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hp));
  const clip = new THREE.AnimationClip(name, r.d, tracks);
  CLIPS.set(key, clip);
  return clip;
}
export const HAS_CLIP = (n) => !!ANIMS.clips[n];

// what each logical action plays, per weapon style
const SETS = {
  sword: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A' },
  bow: { idle: '1H_Ranged_Aiming', walk: 'Walking_A', run: 'Running_B' },
  staff: { idle: 'Idle', walk: 'Walking_B', run: 'Running_A' },
  claw: { idle: 'Idle_Combat', walk: 'Walking_D_Skeletons', run: 'Running_C' },
  heavy: { idle: '2H_Melee_Idle', walk: 'Walking_C', run: 'Running_A' },
  undead: { idle: 'Idle_Combat', walk: 'Walking_D_Skeletons', run: 'Running_C' },
  none: { idle: 'Unarmed_Idle', walk: 'Walking_B', run: 'Running_B' },
  npc: { idle: 'Idle_B', walk: 'Walking_B', run: 'Running_B' }
};
export const ACTIONS = {
  slash1: '1H_Melee_Attack_Slice_Diagonal', slash2: '1H_Melee_Attack_Slice_Horizontal', slash3: '1H_Melee_Attack_Chop', stab: '1H_Melee_Attack_Stab',
  spin: '2H_Melee_Attack_Spinning', spinOnce: '2H_Melee_Attack_Spin', leap: '1H_Melee_Attack_Jump_Chop', slam: '2H_Melee_Attack_Chop', chop: '2H_Melee_Attack_Chop', smash: '2H_Melee_Attack_Slice', heavyStab: '2H_Melee_Attack_Stab',
  dual: 'Dualwield_Melee_Attack_Slice', claw: 'Dualwield_Melee_Attack_Chop', punch: 'Unarmed_Melee_Attack_Punch_A', kick: 'Unarmed_Melee_Attack_Kick',
  warcry: 'Taunt', taunt: 'Taunt_Longer', block: 'Block', blockHit: 'Block_Hit',
  shoot: '1H_Ranged_Shoot', shootFast: '1H_Ranged_Shoot', volley: '2H_Ranged_Shoot', reload: '1H_Ranged_Reload', aim: '1H_Ranged_Aiming',
  cast: 'Spellcast_Shoot', castUp: 'Spellcast_Raise', channel: 'Spellcasting', castLong: 'Spellcast_Long', summon: 'Spellcast_Summon',
  roll: 'Dodge_Forward', dodgeBack: 'Dodge_Backward', blink: 'Spellcast_Shoot', drink: 'Use_Item', interact: 'Interact', pickup: 'PickUp', throw: 'Throw', cheer: 'Cheer',
  hit: 'Hit_A', hit2: 'Hit_B', die: 'Death_A', dieFwd: 'Death_B', dieBones: 'Death_C_Skeletons', rise: 'Skeletons_Awaken_Floor', riseStand: 'Skeletons_Awaken_Standing', spawn: 'Spawn_Ground',
  jump: 'Jump_Full_Short', emote: 'Cheer', hammer: '1H_Melee_Attack_Chop', sit: 'Sit_Floor_Idle', lie: 'Lie_Idle', bonePile: 'Skeletons_Inactive_Floor_Pose'
};
const HOLD = new Set(['die', 'dieFwd', 'dieBones', 'lie', 'sit', 'bonePile']);
const LOOP = new Set(['spin', 'channel', 'sit', 'lie', 'aim', 'bonePile']);

export class HumanoidAnim {
  constructor(av) {
    this.av = av; this.b = av.bones;
    this.hipH = av.rest.hips.y;
    this.mixer = new THREE.AnimationMixer(av.group);
    this.set = SETS[av.animSet || av.style] || SETS.none;
    this.loco = {};
    for (const k of ['idle', 'walk', 'run']) {
      const a = this.mixer.clipAction(getClip(this.set[k], this.hipH));
      a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      a.time = Math.random() * a.getClip().duration;
      this.loco[k] = a;
    }
    this.act = null; this.actName = null; this.actW = 0; this.t = 0;
    this.hit = 0; this.capeA = 0; this.locoW = 1;
    for (const k in this.b) this.b[k].rotation.order = 'YXZ';
  }
  play(name, speed = 1, o = {}) {
    const clipName = ACTIONS[name] || name;
    const clip = getClip(clipName, this.hipH); if (!clip) return 0;
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
  stop(fade = 0.15) { if (this.act) { this.act.fadeOut(fade); this.act = null; this.actName = null; } }
  get busy() { return !!this.act && (this.loop || this.act.isRunning()); }
  // normalised progress of the current action 0..1
  get progress() { return this.act ? Math.min(1, this.act.time / this.act.getClip().duration) : 1; }
  update(dt, st) {
    this.t += dt;
    const speed = st.speed || 0;
    // the one-shot is over: hand back to locomotion
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
    L.walk.timeScale = clamp(speed / (st.walkNat || 1.9), 0.5, 2);
    L.run.timeScale = clamp(speed / (st.runNat || 5.0), 0.6, 1.8);
    this.mixer.update(dt);
    const b = this.b;
    // hit flinch on top of the clip
    if (this.hit > 0) {
      this.hit = Math.max(0, this.hit - dt * 5);
      const h = smooth(this.hit);
      b.chest.rotation.x -= 0.3 * h; b.head.rotation.x -= 0.25 * h;
    }
    if (st.float) b.hips.position.y += Math.sin(this.t * 2.2) * 0.08 + 0.15;
    // capes trail behind movement
    if (b.cape) {
      this.capeA = damp(this.capeA, -0.1 - clamp(speed / 6, 0, 1) * 0.8, 5, dt);
      b.cape.rotation.set(-this.capeA * 0.55 + Math.sin(this.t * 2.3) * 0.04, 0, 0);
      b.cape2.rotation.set(-this.capeA * 0.45 + Math.sin(this.t * 3.1 + 1) * 0.06, 0, 0);
    }
  }
}

// ---------- quadruped (wolves) ----------
export class QuadAnim {
  constructor(av) {
    this.av = av; this.b = av.bones; this.ph = Math.random() * 6; this.t = Math.random() * 5;
    this.act = null; this.at = 0; this.adur = 0.5; this.hit = 0; this.dead = 0;
    for (const k in this.b) this.b[k].rotation.order = 'YXZ';
  }
  play(name, speed = 1) { this.act = name; this.at = 0; this.adur = (name === 'bite' ? 0.45 : name === 'pounce' ? 0.7 : name === 'howl' ? 1.6 : 0.5) / speed; }
  stop() { this.act = null; }
  get busy() { return !!this.act && this.at < 1; }
  update(dt, st) {
    const b = this.b, speed = st.speed || 0, w = clamp(speed / 6, 0, 1.2);
    this.t += dt; this.ph += dt * (2 + speed * 1.6);
    const ph = this.ph;
    const legs = { fl: ph, fr: ph + 0.5, bl: ph + Math.PI, br: ph + Math.PI + 0.5 };
    for (const n in legs) {
      const p = legs[n], front = n[0] === 'f';
      b[n + '1'].rotation.set(Math.sin(p) * 0.65 * w, 0, 0);
      b[n + '2'].rotation.set((front ? 1 : -1) * Math.max(0, Math.cos(p)) * 0.9 * w + (front ? 0 : 0.1), 0, 0);
      b[n + '3'].rotation.set(-Math.sin(p) * 0.3 * w, 0, 0);
    }
    const rest = this.av.rest.body;
    let bodyX = Math.sin(ph * 2) * 0.05 * w, bodyY = rest.y + Math.abs(Math.sin(ph)) * 0.05 * w, bodyZ = 0;
    let neckX = -0.15 + Math.sin(this.t * 1.3) * 0.05 * (1 - w) - w * 0.15, headX = 0.2 + w * 0.1, jaw = Math.max(0, Math.sin(this.t * 1.7)) * 0.1 * (1 - w) + w * 0.18;
    let tailX = -0.3 - w * 0.3, tailY = Math.sin(this.t * 4) * 0.35 * (1 - w * 0.6);
    if (this.act) {
      this.at += dt / this.adur;
      const t = Math.min(1, this.at);
      if (this.act === 'bite' || this.act === 'pounce') {
        const k = t < 0.45 ? smooth(t / 0.45) : 1 - smooth((t - 0.45) / 0.55);
        const strike = t > 0.4 && t < 0.7 ? 1 : 0;
        bodyX -= 0.25 * k; neckX += 0.55 * k; jaw = 0.1 + 0.7 * k * (1 - strike * 0.9);
        b.fl1.rotation.x -= 0.8 * k; b.fr1.rotation.x -= 0.8 * k; b.bl1.rotation.x += 0.4 * k; b.br1.rotation.x += 0.4 * k;
        bodyY -= 0.1 * k;
      } else if (this.act === 'howl') {
        const k = Math.sin(t * Math.PI);
        neckX -= 1.1 * k; headX -= 0.6 * k; jaw = 0.5 * k; bodyX += 0.15 * k;
      } else if (this.act === 'die') {
        const k = smooth(Math.min(1, t * 1.4));
        bodyZ = 1.45 * k; bodyY = lerp(rest.y, 0.28 * this.av.dims.s, k); neckX = -0.3 * k; jaw = 0.4 * k;
        for (const n of ['fl', 'fr', 'bl', 'br']) { b[n + '1'].rotation.x = 0.4 * k * (n[0] === 'f' ? -1 : 1); b[n + '2'].rotation.x = 0.3 * k; }
        tailY = 0; tailX = 0;
      }
      if (this.at >= 1 && this.act !== 'die') this.act = null;
    }
    if (this.hit > 0) { this.hit = Math.max(0, this.hit - dt * 5); bodyX += 0.2 * this.hit; neckX -= 0.3 * this.hit; }
    b.body.rotation.set(bodyX, 0, bodyZ); b.body.position.y = bodyY;
    b.neck.rotation.set(neckX, Math.sin(this.t * 0.5) * 0.2 * (1 - w), 0);
    b.head.rotation.set(headX, 0, 0); b.jaw.rotation.set(jaw, 0, 0);
    b.tail.rotation.set(tailX, tailY, 0); b.tail2.rotation.set(-0.2, tailY * 0.6, 0);
  }
}

// ---------- spiders ----------
export class SpiderAnim {
  constructor(av) {
    this.av = av; this.b = av.bones; this.ph = Math.random() * 6; this.t = Math.random() * 5;
    this.act = null; this.at = 0; this.adur = 0.5; this.hit = 0;
    for (const k in this.b) this.b[k].rotation.order = 'YXZ';
  }
  play(name, speed = 1) { this.act = name; this.at = 0; this.adur = ({ bite: 0.5, rear: 0.9, spit: 0.6, die: 0.8, leap: 0.8 }[name] || 0.5) / speed; }
  stop() { this.act = null; }
  get busy() { return !!this.act && this.at < 1; }
  update(dt, st) {
    const b = this.b, speed = st.speed || 0, w = clamp(speed / 4, 0, 1.3);
    this.t += dt; this.ph += dt * (speed * 3.2 / (this.av.dims.s || 1));
    let bodyX = 0, bodyY = this.av.rest.body.y + Math.sin(this.ph * 2) * 0.02 * w, fang = Math.sin(this.t * 6) * 0.1, frontLift = 0, curl = 0, absX = Math.sin(this.t * 2) * 0.04;
    if (this.act) {
      this.at += dt / this.adur;
      const t = Math.min(1, this.at);
      if (this.act === 'bite' || this.act === 'leap') {
        const k = t < 0.5 ? smooth(t / 0.5) : 1 - smooth((t - 0.5) / 0.5);
        bodyX = -0.4 * k + (t > 0.5 && t < 0.75 ? 0.5 : 0); frontLift = k; fang = 0.6 * k;
      } else if (this.act === 'rear' || this.act === 'spit') {
        const k = Math.sin(t * Math.PI);
        bodyX = -0.7 * k; frontLift = 1.4 * k; fang = 0.8 * k; absX = 0.4 * k;
      } else if (this.act === 'die') {
        curl = smooth(Math.min(1, t * 1.3)); bodyY = lerp(bodyY, 0.12 * this.av.dims.s, curl);
      }
      if (this.at >= 1 && this.act !== 'die') this.act = null;
    }
    if (this.hit > 0) { this.hit = Math.max(0, this.hit - dt * 5); bodyX += 0.15 * this.hit; }
    b.body.rotation.set(bodyX, 0, 0); b.body.position.y = bodyY; b.abdomen.rotation.set(absX - bodyX * 0.5, Math.sin(this.t * 1.1) * 0.06, 0);
    b.fangL.rotation.set(0, -fang, 0); b.fangR.rotation.set(0, fang, 0);
    for (let i = 0; i < 4; i++) for (const side of ['L', 'R']) {
      const n = side + i, sg = side === 'L' ? 1 : -1;
      const set = (i + (side === 'L' ? 0 : 1)) % 2, p = this.ph + set * Math.PI + i * 0.3;
      const swing = Math.sin(p) * 0.38 * w, lift = Math.max(0, Math.cos(p)) * 0.35 * w;
      let fz = lift + (i < 2 ? frontLift * (i === 0 ? 1 : 0.5) : 0) - curl * 1.2, ty = 0;
      b['c' + n].rotation.set(0, swing * sg + Math.sin(this.t * 3 + i) * 0.03, fz * sg);
      b['t' + n].rotation.set(0, ty, (-curl * 1.4 + Math.sin(this.t * 2.6 + i * 1.7) * 0.03) * sg);
    }
  }
}

const STAFF_TILT = ['Z', 1.35];
// creature grips (+Y along a blade, +Z along the knuckles): staves lean head-up across the body
const GRIP_STAFF_TILT = ['X', -Math.PI / 2];
// ---------- avatar: what an actor looks like ----------
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
export class Avatar {
  constructor(model, o = {}) {
    this.model = model; this.mesh = model.mesh; this.bones = model.bones; this.rest = model.rest; this.dims = model.dims;
    this.kind = model.kind; this.style = o.style || 'none'; this.animSet = o.animSet; this.hunch = o.hunch || 0; this.idleClip = o.idle;
    this.group = new THREE.Group();
    this.group.add(model.mesh);
    this.mat = model.mat;
    this.held = {};
    // realistic people wear textured materials: what they hold gets a character material sharing their uniforms
    if (model.kind === 'person' || model.kind === 'creature') { this.heldMat = makeCharMat(); this.heldMat.userData.u = model.mat.userData.u; }
    const A = model.kind === 'person' ? PersonAnim : model.kind === 'creature' ? CreatureAnim : model.kind === 'warg' ? QuadAnim : model.kind === 'spider' ? SpiderAnim : HumanoidAnim;
    this.anim = new A(this);
    this.flashV = 0; this.scale = o.scale || 1;
    this.group.scale.setScalar(this.scale);
  }
  hold(hand, type, look) {
    if (hand === 'S') hand = 'L';
    const grip = this.model.grips?.[hand];
    const bone = grip || this.bones[hand === 'R' ? 'handR' : 'handL'];
    if (!bone) return null;
    if (this.held[hand]) { bone.remove(this.held[hand].mesh); this.held[hand].mesh.geometry.dispose(); }
    const person = this.kind === 'person';
    if (person) setHand(this.bones, hand, !!type);
    if (!type) { this.held[hand] = null; return; }
    let info, mesh;
    const mat = this.heldMat || this.mat;
    if (type === 'shield') {
      mesh = heldMesh(shieldGeo(look), mat);
      info = { mesh };
    } else {
      const w = weaponGeo(type, look);
      mesh = heldMesh(w.parts, mat);
      info = { mesh, tip: w.tip, base: w.base, gem: w.gem, type, axis: w.axis || 'y' };
    }
    if (grip) {
      // creature grips: +Y along the blade, +Z along the knuckles (a crossbow's length)
      mesh.quaternion.identity(); mesh.position.set(0, 0, 0);
      mesh.scale.setScalar((this.model.weaponScale || 1) * (type === 'crossbow' ? 0.85 : 1));
    } else if (person) {
      const g = (type === 'crossbow' && this.model.grip[hand + 'pistol']) || this.model.grip[hand];
      // giants carry giant weapons
      const ws = this.model.weaponScale || 1;
      mesh.quaternion.copy(g.q); mesh.position.copy(g.p).multiplyScalar(ws);
      mesh.scale.setScalar(ws * (type === 'crossbow' ? 0.8 : 1));
      const T = typeof window !== 'undefined' && window.__grip;
      if (T) { mesh['rotate' + T[0]](T[1]); if (T[2]) mesh['rotate' + T[2]](T[3]); }
    } else {
      const slot = ANIMS[hand === 'R' ? 'slotR' : 'slotL'];
      mesh.quaternion.set(slot.q[0], slot.q[1], slot.q[2], slot.q[3]);
      const s = this.dims?.s ?? 1;
      mesh.position.set((hand === 'R' ? -1 : 1) * 0.05 * s, -0.035 * s, 0);
    }
    // long staves read better held upright than pointed forward like a sword
    if (type && (type.startsWith('staff') || type === 'lanternStaff')) { const T = (typeof window !== 'undefined' && window.__tilt) || (grip ? GRIP_STAFF_TILT : STAFF_TILT); mesh['rotate' + T[0]](T[1]); }
    bone.add(mesh);
    this.held[hand] = info;
    return info;
  }
  // world position of a point along the held weapon (0 = grip, tip = info.tip)
  weaponPoint(hand, along, out) {
    const h = this.held[hand]; if (!h) return null;
    h.mesh.updateWorldMatrix(true, false);
    return (h.axis === 'z' ? out.set(0, 0.05, along) : out.set(0, along, 0)).applyMatrix4(h.mesh.matrixWorld);
  }
  bonePoint(name, out, ox = 0, oy = 0, oz = 0) {
    const bn = this.bones[name]; if (!bn) return null;
    bn.updateWorldMatrix(true, false);
    return out.set(ox, oy, oz).applyMatrix4(bn.matrixWorld);
  }
  setFlash(v) { this.mat.userData.u.uFlash.value = v; }
  setDissolve(v) { this.mat.userData.u.uDissolve.value = v; }
  setTint(color, amt) { this.mat.userData.u.uTint.value.set(color); this.mat.userData.u.uTintAmt.value = amt; }
  setRim(color, amt) { if (color != null) this.mat.userData.u.uRimColor.value.set(color); if (amt != null) this.mat.userData.u.uRim.value = amt; }
  play(name, speed, o) { return this.anim.play(name, speed, o); }
  update(dt, st) { this.anim.update(dt, st); }
  dispose() {
    this.group.parent?.remove(this.group);
    if (this.model.dispose) { this.model.dispose(); this.heldMat?.dispose(); }
    else { this.mesh.geometry.dispose(); this.mat.dispose(); }
    for (const k in this.held) this.held[k]?.mesh.geometry.dispose();
  }
}
