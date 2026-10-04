// retarget candidate clips onto a base and write a test GLB (in place, grounded constant)
import { io, S, makeRef, retarget, makeRig, inPlace, writeClip } from './lib.mjs';
const [base, out, ...clips] = process.argv.slice(2);
const doc = await io.read(base);
for (const m of doc.getRoot().listMaterials()) m.setAlphaMode('OPAQUE').setDoubleSided(true);
const SRC = { u1: { doc: await io.read(S + '/chars/ual1.glb'), kind: 'ual' }, u2: { doc: await io.read(S + '/chars/ual2.glb'), kind: 'ual' },
  kk: { doc: await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb'), kind: 'kk' },
  ka: { doc: await io.read(S + '/kk-adv/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb'), kind: 'kk' } };
const T = makeRef(doc, SRC.u1.doc), rig = makeRig(T);
const joints = new Map(doc.getRoot().listSkins()[0].listJoints().map((j) => [j.getName(), j]));
for (const c of clips) {
  const [s, clip] = c.split(':');
  const fr = retarget(T, SRC[s], clip);
  inPlace(T, fr, { keepXZ: 0 });
  const m = Math.min(...fr.map((f) => rig.minY(f)));
  for (const f of fr) { const p = f.get('pelvis').p; } 
  writeClip(doc, s + '_' + clip, fr, joints);
  console.log(c, fr.length, 'minY', m.toFixed(3));
}
await io.write(out, doc);
