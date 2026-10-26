// Builds src/assets/moves.bin: the animation set for UE-style skeletons (Quaternius characters).
//  - clips from Quaternius Universal Animation Library 1 + 2 (CC0), rotations for every bone plus pelvis motion
//  - KayKit Adventurers + Skeletons clips (CC0) retargeted in world space for what UAL lacks (crossbow, big
//    spells, two-handed spins, dodges, skeletons rising), prefixed "KK_"
// Only body bones are stored (fingers get a fist or open-hand pose at runtime, from what the hand holds), and only
// rotations plus pelvis motion, so each character keeps its own proportions.
// Format: 'MOV1', u32 header length, JSON header, then per clip and frame, for each bone an Int16 x,y,z of the
// local quaternion (w >= 0 is implied), then the pelvis position as Int16 in units of hip height / 8192.
// usage: node tools/pack-ue-anims.mjs <UAL1.glb> <UAL2.glb> <KayKit Knight.glb> <KayKit Skeleton_Warrior.glb> [out.bin]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments } from '@gltf-transform/functions';
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';

const [UAL1, UAL2, KNIGHT, SKEL, OUT = new URL('../src/assets/moves.bin', import.meta.url).pathname] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const FPS = 30;

const KEEP_UAL = new Set([
  'Idle_Loop', 'Idle_Talking_Loop', 'Idle_Torch_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop',
  'Death01', 'Hit_Chest', 'Hit_Head', 'Interact', 'PickUp_Table', 'Punch_Cross', 'Punch_Jab', 'Roll', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop',
  'Spell_Simple_Enter', 'Spell_Simple_Exit', 'Spell_Simple_Idle_Loop', 'Spell_Simple_Shoot', 'Sword_Attack', 'Sword_Idle', 'Jump_Start', 'Jump_Loop', 'Jump_Land',
  'Chest_Open', 'Consume', 'Hit_Knockback', 'Idle_FoldArms_Loop', 'Idle_Lantern_Loop', 'Idle_No_Loop', 'Idle_Shield_Break', 'Idle_Shield_Loop', 'LayToIdle',
  'Melee_Hook', 'Melee_Hook_Rec', 'OverhandThrow', 'Shield_Dash', 'Shield_OneShot', 'Sword_Block', 'Sword_Dash', 'Sword_Heavy_Combo', 'Sword_Regular_A', 'Sword_Regular_A_Rec',
  'Sword_Regular_B', 'Sword_Regular_B_Rec', 'Sword_Regular_C', 'Sword_Regular_Combo', 'TreeChopping_Loop', 'Fixing_Kneeling', 'Walk_Carry_Loop', 'Yes', 'Farm_Harvest',
  'Zombie_Idle_Loop', 'Zombie_Scratch', 'Zombie_Walk_Fwd_Loop', 'Pistol_Aim_Neutral', 'Pistol_Aim_Up', 'Pistol_Aim_Down', 'Pistol_Idle_Loop', 'Pistol_Reload', 'Pistol_Shoot',
  'Idle_Rail_Call', 'NinjaJump_Start', 'NinjaJump_Land'
]);
const KEEP_KK = {
  knight: ['1H_Ranged_Aiming', '1H_Ranged_Shoot', '1H_Ranged_Reload', '2H_Ranged_Shoot', '2H_Melee_Attack_Spinning', '2H_Melee_Attack_Spin', '2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice',
    '2H_Melee_Attack_Stab', '1H_Melee_Attack_Stab', '1H_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Slice', 'Block', 'Block_Hit', 'Blocking', 'Cheer',
    'Dodge_Forward', 'Dodge_Backward', 'Spellcast_Raise', 'Spellcast_Shoot', 'Spellcast_Long', 'Spellcasting', 'Throw', 'Unarmed_Melee_Attack_Kick', 'Use_Item', 'Death_A', 'Death_B',
    'Hit_A', 'Hit_B', 'Sit_Floor_Idle', 'Lie_Idle', 'Running_A', 'Walking_C'],
  skel: ['1H_Melee_Attack_Jump_Chop', 'Death_C_Skeletons', 'Idle_Combat', 'Running_C', 'Skeletons_Awaken_Floor', 'Skeletons_Awaken_Standing', 'Skeletons_Inactive_Floor_Pose',
    'Spawn_Ground', 'Spellcast_Summon', 'Taunt', 'Taunt_Longer', 'Walking_D_Skeletons']
};
// KayKit bone -> UE bone
const MAP = {
  hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', head: 'Head',
  'upperarm.l': 'upperarm_l', 'lowerarm.l': 'lowerarm_l', 'hand.l': 'hand_l', 'upperarm.r': 'upperarm_r', 'lowerarm.r': 'lowerarm_r', 'hand.r': 'hand_r',
  'upperleg.l': 'thigh_l', 'lowerleg.l': 'calf_l', 'foot.l': 'foot_l', 'upperleg.r': 'thigh_r', 'lowerleg.r': 'calf_r', 'foot.r': 'foot_r'
};
const GRIP = /^(1H|2H|Dualwield|Block)/;

// ---------- forward kinematics on gltf-transform documents ----------
function sample(ch, t) {
  const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), q = ch.getTargetPath() === 'rotation';
  let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++;
  const j = Math.min(i + 1, inp.length - 1), t0 = inp[i], t1 = inp[j], f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  if (q) return new THREE.Quaternion().fromArray(out, i * 4).slerp(new THREE.Quaternion().fromArray(out, j * 4), f);
  return new THREE.Vector3().fromArray(out, i * 3).lerp(new THREE.Vector3().fromArray(out, j * 3), f);
}
function pose(doc, anim, t) {
  const loc = new Map();
  for (const n of doc.getRoot().listNodes()) loc.set(n, { p: new THREE.Vector3().fromArray(n.getTranslation()), q: new THREE.Quaternion().fromArray(n.getRotation()), s: new THREE.Vector3().fromArray(n.getScale()) });
  if (anim) for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode(), path = ch.getTargetPath(); if (!n || !loc.has(n)) continue;
    if (path === 'rotation') loc.get(n).q.copy(sample(ch, t)); else if (path === 'translation') loc.get(n).p.copy(sample(ch, t));
  }
  const out = new Map();
  const visit = (n, pm) => {
    const l = loc.get(n), m = new THREE.Matrix4().compose(l.p, l.q, l.s), w = pm ? pm.clone().multiply(m) : m;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3(); w.decompose(wp, wq, ws);
    out.set(n.getName(), { node: n, local: l, world: w, wp, wq });
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of doc.getRoot().getDefaultScene().listChildren()) visit(n, null);
  return out;
}
const duration = (anim) => { let d = 0; for (const s of anim.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); return d; };

// ---------- 1. UAL clips on UAL1's skeleton ----------
const doc = await io.read(UAL1);
const root = doc.getRoot();
const JOINTS = new Set(root.listSkins()[0].listJoints().map((j) => j.getName()));
for (const n of root.listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); n.setSkin(null); }
const joints = new Map(); for (const n of root.listNodes()) joints.set(n.getName(), n);
{
  const d2 = await io.read(UAL2);
  for (const n of d2.getRoot().listNodes()) if (n.getMesh()) n.getMesh().dispose();
  for (const a of d2.getRoot().listAnimations()) if (!KEEP_UAL.has(a.getName())) a.dispose();
  const before = new Set(root.listNodes());
  mergeDocuments(doc, d2);
  for (const anim of root.listAnimations()) for (const ch of anim.listChannels()) {
    const t = ch.getTargetNode(); if (!t || before.has(t)) continue;
    const m = joints.get(t.getName()); if (!m) { ch.getSampler().dispose(); ch.dispose(); continue; }
    ch.setTargetNode(m);
  }
  for (const n of root.listNodes()) if (!before.has(n)) n.dispose();
  for (const s of root.listScenes()) if (s !== root.getDefaultScene()) s.dispose();
}
for (const a of root.listAnimations()) {
  if (!KEEP_UAL.has(a.getName())) { a.dispose(); continue; }
  for (const ch of a.listChannels()) {
    const n = ch.getTargetNode()?.getName(), p = ch.getTargetPath();
    if (p === 'scale' || (p === 'translation' && n !== 'pelvis')) { ch.getSampler().dispose(); ch.dispose(); }
  }
}

// ---------- 2. sample everything onto the body bones ----------
const restT = pose(doc, null, 0);
const order = []; const walk = (n) => { order.push(n); for (const c of n.listChildren()) walk(c); };
for (const n of root.getDefaultScene().listChildren()) walk(n);
const parentOf = new Map(); for (const n of order) for (const c of n.listChildren()) parentOf.set(c, n);
const findAnim = (name) => root.listAnimations().find((a) => a.getName() === name);
const FINGER = /^(index|middle|ring|pinky|thumb)_/;
const BODY = order.map((n) => n.getName()).filter((n) => JOINTS.has(n) && n !== 'root' && !FINGER.test(n) && !/leaf/.test(n));
const HIP = restT.get('pelvis').wp.y;
// hand poses for the runtime: a fist around a grip and a relaxed hand
const handPose = (clip, t) => { const P = pose(doc, findAnim(clip), t), m = {}; for (const [k, v] of P) if (FINGER.test(k) && !/leaf/.test(k)) m[k] = v.local.q.toArray().map((x) => +x.toFixed(4)); return m; };
const HANDS = { fist: handPose('Sword_Idle', 0.05), open: handPose('Idle_Loop', 0.05) };

const header = { fps: FPS, hip: +HIP.toFixed(4), bones: BODY, hands: HANDS, clips: [] };
const chunks = [];
let offset = 0;
// the moment a strike lands: fastest motion of the right hand relative to the pelvis
function strikeTime(frames) {
  let best = 0, bt = 0;
  for (let f = 1; f < frames.length; f++) {
    const a = frames[f - 1].hand, b = frames[f].hand; if (!a || !b) continue;
    const v = a.distanceTo(b);
    if (v > best) { best = v; bt = f / FPS; }
  }
  return +bt.toFixed(3);
}
function emit(name, frames) {
  // frames: array of { q: Map(bone -> Quaternion local), p: Vector3 pelvis local position }
  const n = frames.length, a = new Int16Array(n * (BODY.length * 3 + 3));
  let k = 0;
  for (const f of frames) {
    for (const b of BODY) { const q = f.q.get(b); const s = q.w < 0 ? -1 : 1; a[k++] = Math.round(q.x * s * 32767); a[k++] = Math.round(q.y * s * 32767); a[k++] = Math.round(q.z * s * 32767); }
    for (const c of ['x', 'y', 'z']) a[k++] = Math.max(-32767, Math.min(32767, Math.round((f.p[c] / HIP) * 8192)));
  }
  header.clips.push({ name, n, off: offset, hit: strikeTime(frames) });
  chunks.push(Buffer.from(a.buffer)); offset += a.byteLength;
}

// UAL clips: local rotations straight from the tracks
for (const anim of root.listAnimations()) {
  const dur = duration(anim), n = Math.max(2, Math.round(dur * FPS) + 1), frames = [];
  for (let f = 0; f < n; f++) {
    const P = pose(doc, anim, Math.min(dur, f / FPS)), q = new Map();
    for (const b of BODY) q.set(b, P.get(b).local.q.clone().normalize());
    frames.push({ q, p: P.get('pelvis').local.p.clone(), hand: P.get('hand_r').wp.clone().sub(P.get('pelvis').wp) });
  }
  emit(anim.getName(), frames);
}

// KayKit clips retargeted in world space: D = W_src * W_src_rest^-1, W_tgt = D * W_tgt_rest
let kkCount = 0;
for (const [tag, file] of [['knight', KNIGHT], ['skel', SKEL]]) {
  const src = await io.read(file);
  const restS = pose(src, null, 0);
  const scale = HIP / restS.get('hips').wp.y;
  for (const anim of src.getRoot().listAnimations()) {
    const name = anim.getName();
    if (!KEEP_KK[tag].includes(name)) continue;
    const dur = duration(anim), n = Math.max(2, Math.round(dur * FPS) + 1), frames = [];
    for (let f = 0; f < n; f++) {
      const S = pose(src, anim, Math.min(dur, f / FPS)), W = new Map(), q = new Map();
      for (const node of order) {
        const nm = node.getName(), par = parentOf.get(node), Wp = par ? W.get(par) : new THREE.Quaternion();
        const srcName = Object.keys(MAP).find((k) => MAP[k] === nm);
        let local;
        if (srcName) {
          const Wt = S.get(srcName).wq.clone().multiply(restS.get(srcName).wq.clone().invert()).multiply(restT.get(nm).wq);
          local = Wp.clone().invert().multiply(Wt);
        } else local = restT.get(nm).local.q.clone();
        local.normalize();
        W.set(node, Wp.clone().multiply(local));
        q.set(nm, local);
      }
      // pelvis: rest position plus the source hip offset scaled to UAL proportions, in the pelvis parent's frame
      const d = S.get('hips').wp.clone().sub(restS.get('hips').wp).multiplyScalar(scale);
      const pel = restT.get('pelvis'), parW = restT.get(parentOf.get(pel.node).getName()).world;
      frames.push({ q, p: pel.wp.clone().add(d).applyMatrix4(parW.clone().invert()), hand: S.get('hand.r').wp.clone().sub(S.get('hips').wp).multiplyScalar(scale) });
    }
    emit('KK_' + name, frames);
    kkCount++;
  }
}
const hj = Buffer.from(JSON.stringify(header));
const pad = (4 - ((8 + hj.length) % 4)) % 4;
const head = Buffer.alloc(8); head.write('MOV1', 0); head.writeUInt32LE(hj.length + pad, 4);
const out = Buffer.concat([head, hj, Buffer.alloc(pad, 32), ...chunks]);
writeFileSync(OUT, out);
console.log('moves:', header.clips.length - kkCount, 'UAL +', kkCount, 'KayKit clips,', BODY.length, 'bones |', (out.length / 1e6).toFixed(2) + 'MB');
