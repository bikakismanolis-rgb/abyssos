// Native Kelgar goblin clips (baked from the IK rig in Blender, bake.json) as glTF animations on goblin_base.glb.
// usage: node native.mjs <base.glb> <bake.json> <out.glb> <scale>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { THREE, pose, writeClip } from './lib.mjs';

export function nativeFrames(doc, bake, S, actionName, opts = {}) {
  const rest = pose(doc, null, 0);
  const C = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1).multiply(new THREE.Matrix4().makeScale(S, S, S));
  const K = new Map();
  for (const b of bake.def) {
    const R = new THREE.Matrix4().fromArray(bake.rest[b]);
    K.set(b, C.clone().multiply(R).invert().multiply(rest.get(b).world));
  }
  const frames = [];
  for (const fr of bake.actions[actionName]) {
    const G = new Map(), out = new Map();
    for (const b of bake.def) G.set(b, C.clone().multiply(new THREE.Matrix4().fromArray(fr[b])).multiply(K.get(b)));
    for (const b of bake.def) {
      const parentW = bake.parents[b] && G.has(bake.parents[b]) ? G.get(bake.parents[b]) : (b.startsWith('foot_') ? G.get('lowerleg_' + b.slice(-1)) : rest.get(b).parentWorld);
      const L = parentW.clone().invert().multiply(G.get(b));
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); L.decompose(p, q, s);
      out.set(b, { q, p, w: G.get(b) });
    }
    frames.push(out);
  }
  return frames;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [BASE, BAKE, OUT, SC] = process.argv.slice(2);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(BASE);
  const bake = JSON.parse(readFileSync(BAKE, 'utf8'));
  const joints = new Map(doc.getRoot().listSkins()[0].listJoints().map((j) => [j.getName(), j]));
  for (const a of ['Idle.000', 'Idle.001', 'Idle.002', 'Walk', 'Run', 'Attack.000', 'Attack.001', 'Attack.002', 'Die', 'TPose', 'Stand']) {
    const fr = nativeFrames(doc, bake, +SC, a);
    const p0 = fr[0].get('spine1').p, p1 = fr[fr.length - 1].get('spine1').p;
    console.log(a, fr.length, 'hip0', p0.toArray().map((v) => +v.toFixed(3)), 'hip1', p1.toArray().map((v) => +v.toFixed(3)));
    writeClip(doc, a, fr, bake.fps, joints, ['spine1']);
  }
  await io.write(OUT, doc);
}
