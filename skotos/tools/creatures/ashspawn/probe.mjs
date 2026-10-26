// raw retargets of candidate source clips onto the Ashspawn rig, for choosing clips. usage: node probe.mjs out.glb key:Clip,key:Clip...
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { MeshoptDecoder } from 'meshoptimizer';
import { THREE, writeClip, pose } from './lib.mjs';
import { makeTarget, retarget, SPEC_KK } from './retarget.mjs';
import { addGrips } from './hands.mjs';
import { makeTools } from './tools.mjs';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('_base_ash.glb');
const skin = doc.getRoot().listSkins()[0];
const joints = new Map(skin.listJoints().map((j) => [j.getName(), j]));
const u1 = await io.read(S + '/chars/ual1.glb'), u2 = await io.read(S + '/chars/ual2.glb');
const kk = await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb');
const SRC = { u1: [u1, makeTarget(doc, u1)], u2: [u2, makeTarget(doc, u2)], kk: [kk, makeTarget(doc, kk, SPEC_KK, u1)] };
const RT = pose(doc, null, 0);
const grips = addGrips(doc, RT);
const X = makeTools(doc, SRC.u1[1], 30, grips);
for (const spec of process.argv[3].split(',')) {
  const [key, name] = spec.split(':');
  const [sd, Tg] = SRC[key];
  const a = sd.getRoot().listAnimations().find((x) => x.getName() === name);
  const fr = retarget(Tg, a, 30);
  X.hips(fr, {});
  writeClip(doc, name, fr, 30, joints, ['hips']);
}
await io.write(process.argv[2], doc);
console.log('ok');
