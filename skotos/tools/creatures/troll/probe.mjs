import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { THREE } from './lib.mjs';
import { makeTarget, retarget, SPEC_KK } from './retarget.mjs';
import { addGrips, fingerPose } from './hands.mjs';
import { makeTools } from './tools.mjs';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('base.glb');
const u1 = await io.read(S + '/chars/ual1.glb'), u2 = await io.read(S + '/chars/ual2.glb');
const kk = await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb');
const SRC = { u1: [u1, makeTarget(doc, u1)], u2: [u2, makeTarget(doc, u2)], kk: [kk, makeTarget(doc, kk, SPEC_KK, u1)] };
const grips = addGrips(doc, { back: 0.06, palm: 0.07 });
const X = makeTools(doc, SRC.u1[1], 30, grips);
for (const spec of process.argv.slice(2)) {
  const [key, name] = spec.split(':');
  const a = SRC[key][0].getRoot().listAnimations().find((x) => x.getName() === name);
  const fr = retarget(SRC[key][1], a, 30);
  console.log('==', spec, fr.length);
  fr.forEach((f, i) => { if (i % 2) return; const W = X.fk(f), G = X.gripWorld(W, 'R'); const g = new THREE.Vector3().setFromMatrixPosition(G), tip = new THREE.Vector3(0, 1.2, 0).applyMatrix4(G); const h = new THREE.Vector3().setFromMatrixPosition(W.get('hips'));
    console.log((i / 30).toFixed(2), 'grip', g.toArray().map((v) => v.toFixed(2)).join(','), 'tip', tip.toArray().map((v) => v.toFixed(2)).join(','), 'hips', h.toArray().map((v) => v.toFixed(2)).join(',')); });
}
