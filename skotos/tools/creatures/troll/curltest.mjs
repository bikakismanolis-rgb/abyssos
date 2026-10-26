import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { THREE, writeClip, pose } from './lib.mjs';
import { fingerPose, addGrips, handFrame } from './hands.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const RT = pose(doc, null, 0);
for (const sd of ['R', 'L']) { const f = handFrame(RT, sd); console.log(sd, 'dir', f.dir.toArray().map(v => +v.toFixed(2)), 'palm', f.palm.toArray().map(v => +v.toFixed(2)), 'across', f.across.toArray().map(v => +v.toFixed(2))); }
const skin = doc.getRoot().listSkins()[0], joints = new Map(skin.listJoints().map((j) => [j.getName(), j]));
const fp = fingerPose(doc, { R: 1, L: 1 }, { f1: 0.75, f2: 0.65, t: 0.5 });
addGrips(doc, JSON.parse(process.argv[4] || '{}'));
const frames = [0, 1].map((k) => { const m = new Map(); for (const [n] of joints) { const r = RT.get(n); m.set(n, { q: r.local.q.clone(), p: r.local.p.clone() }); } if (k) for (const [b, q] of fp) m.get(b).q.copy(q); return m; });
writeClip(doc, 'curl', frames, 1, joints, []);
await io.write(process.argv[3], doc);
