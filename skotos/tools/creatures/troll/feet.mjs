// prints per-frame sole height / z of each foot for a clip in a built GLB (via three.js-free FK from gltf-transform)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { THREE, pose } from './lib.mjs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const anim = doc.getRoot().listAnimations().find((a) => a.getName() === process.argv[3]);
const skin = doc.getRoot().listSkins()[0], joints = skin.listJoints();
const ibm = skin.getInverseBindMatrices(); const IBM = joints.map((_, i) => new THREE.Matrix4().fromArray(ibm.getElement(i, [])));
const prim = doc.getRoot().listMeshes()[0].listPrimitives().find((p) => p.getMaterial().getName() === 'troll_skin');
const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
const sole = { L: [], R: [] };
for (let i = 0; i < P.getCount(); i++) { const p = P.getElement(i, []); if (p[1] > 0.05) continue; const j = J.getElement(i, []), w = Wt.getElement(i, []);
  for (let k = 0; k < 4; k++) if (w[k] > 0.5) { const n = joints[j[k]].getName(); for (const sd of ['L', 'R']) if (n === 'foot_' + sd || n === 'toe_' + sd) sole[sd].push({ p: new THREE.Vector3(...p), j, w }); } }
let dur = 0; for (const s of anim.listSamplers()) dur = Math.max(dur, s.getInput().getMax([])[0]);
const n = Math.round(dur * 30);
for (let i = 0; i <= n; i++) {
  const R = pose(doc, anim, i / 30); const M = joints.map((jn, k) => R.get(jn.getName()).world.clone().multiply(IBM[k]));
  const row = [];
  for (const sd of ['L', 'R']) { const ps = sole[sd].map((v) => { const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (v.w[k]) o.addScaledVector(v.p.clone().applyMatrix4(M[v.j[k]]), v.w[k]); return o; });
    row.push(sd + ' y ' + Math.min(...ps.map((p) => p.y)).toFixed(3) + ' z ' + (ps.reduce((a, p) => a + p.z, 0) / ps.length).toFixed(3)); }
  console.log((i / 30).toFixed(2), row.join('   '));
}
