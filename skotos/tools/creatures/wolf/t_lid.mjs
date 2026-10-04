import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { makeRig, solve, writeClip, euler, LEGS, Q, X, Y, Z, deg } from './lib.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('wolf_base.glb');
const rig = makeRig(doc);
const legs = {}; for (const [k, L] of Object.entries(LEGS)) legs[k] = { ball: rig.R(L.p).wp.clone() };
const tests = [['lidX+', Q().setFromAxisAngle(X, 30 * deg)], ['lidX-', Q().setFromAxisAngle(X, -30 * deg)], ['lidY+', Q().setFromAxisAngle(Y, 30 * deg)], ['lidZ+', Q().setFromAxisAngle(Z, 30 * deg)], ['lidZ-', Q().setFromAxisAngle(Z, -30 * deg)]];
for (const a of doc.getRoot().listAnimations()) a.dispose();
for (const [name, q] of tests) {
  const f = solve(rig, { legs, rot: { eyelid_l: q, eyelid_r: q } }).frame;
  writeClip(doc, rig, name, [f, f], 30);
}
await io.write('t_lid.glb', doc);
