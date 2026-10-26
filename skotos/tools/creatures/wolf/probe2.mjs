import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('../../research/github/rocketbox_Dog_GermanShepard_01.glb');
const root = doc.getRoot();
const skin = root.listSkins()[0]; const names = skin.listJoints().map(j => j.getName());
const p = root.listMeshes()[0].listPrimitives()[0];
const J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0'), P = p.getAttribute('POSITION'), UV = p.getAttribute('TEXCOORD_0');
const sum = {}, cnt = {}, box = {};
for (let i = 0; i < J.getCount(); i++) { const j = J.getElement(i, []), w = Wt.getElement(i, []), pos = P.getElement(i, []);
  for (let k = 0; k < 4; k++) if (w[k] > 0) { const n = names[j[k]]; sum[n] = (sum[n]||0) + w[k]; if (w[k] > 0.5) { cnt[n] = (cnt[n]||0)+1; } } }
for (const n of names) console.log(n.padEnd(20), (sum[n]||0).toFixed(1), cnt[n]||0);
console.log('uv count', UV.getCount(), 'P count', P.getCount(), 'pos minmax', P.getMin([]), P.getMax([]));
