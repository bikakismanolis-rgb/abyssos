// Writes prev.glb: the skeleton with many candidate clips retargeted raw (for choosing clips).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { THREE, makeTarget, makeSource, retarget, writeClip } from './lib.mjs';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('skeleton_base.glb');
const T = makeTarget(doc);
const BODY = T.names.filter((n) => !/^(index|middle|ring|pinky|thumb)_|^jaw$|^root$/.test(n));
const UAL_MAP = Object.fromEntries(BODY.map((n) => [n, n]));
const KK_MAP = {
  pelvis: 'hips', spine_01: ['hips', 'spine', 0.5], spine_02: 'spine', spine_03: 'chest', neck_01: ['chest', 'head', 0.5], Head: 'head',
  upperarm_l: 'upperarm.l', lowerarm_l: 'lowerarm.l', hand_l: 'hand.l', upperarm_r: 'upperarm.r', lowerarm_r: 'lowerarm.r', hand_r: 'hand.r',
  thigh_l: 'upperleg.l', calf_l: 'lowerleg.l', foot_l: 'foot.l', ball_l: 'toes.l', thigh_r: 'upperleg.r', calf_r: 'lowerleg.r', foot_r: 'foot.r', ball_r: 'toes.r'
};
const docs = { u1: await io.read(S + '/chars/ual1.glb'), u2: await io.read(S + '/chars/ual2.glb'), kk: await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb') };
const SRC = { u1: makeSource(docs.u1, { pelvis: 'pelvis', map: UAL_MAP }), u2: makeSource(docs.u2, { pelvis: 'pelvis', map: UAL_MAP }), kk: makeSource(docs.kk, { pelvis: 'hips', map: KK_MAP }) };
// chibi arms are held far out: swing the upper arms down about the chest's forward axis
function armAdduct(deg) {
  const mk = (sg) => (dq, W) => {
    const cq = new THREE.Quaternion(); W.get('spine_03').decompose(new THREE.Vector3(), cq, new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(cq.multiply(T.RT.get('spine_03').wq.clone().invert()));
    dq.premultiply(new THREE.Quaternion().setFromAxisAngle(fwd, -sg * deg * Math.PI / 180));
  };
  return { upperarm_l: mk(1), upperarm_r: mk(-1) };
}
const list = (process.argv[2] || '').split(',').filter(Boolean);
for (const item of list) {
  const [key, name] = item.split(':');
  const a = docs[key].getRoot().listAnimations().find((x) => x.getName() === name);
  if (!a) { console.log('missing', item); continue; }
  const fr = retarget(T, SRC[key], a, { fps: 30, adjust: key === 'kk' ? armAdduct(+(process.env.ADD || 40)) : undefined });
  writeClip(doc, key + '_' + name, fr, 30);
}
await io.write(process.argv[3] || 'prev.glb', doc);
console.log('wrote', list.length);
