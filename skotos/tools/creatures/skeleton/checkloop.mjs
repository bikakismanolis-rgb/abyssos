// loop seam + ground + root drift check on the final GLB (decoded with meshopt)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { pose, duration } from './lib.mjs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const a of doc.getRoot().listAnimations()) {
  const d = duration(a), P0 = pose(doc, a, 0), P1 = pose(doc, a, d), Pm = pose(doc, a, d / 2);
  let maxAng = 0, worst = '';
  for (const [k, v] of P0) { const w = P1.get(k); if (!v.node.getSkin && false) continue; const ang = 2 * Math.acos(Math.min(1, Math.abs(v.wq.dot(w.wq)))) * 180 / Math.PI; if (ang > maxAng) { maxAng = ang; worst = k; } }
  const hip = (P) => P.get('pelvis').wp.toArray().map((x) => x.toFixed(2)).join(',');
  let scaleTracks = 0, transTracks = []; for (const c of a.listChannels()) { if (c.getTargetPath() === 'scale') scaleTracks++; if (c.getTargetPath() === 'translation') transTracks.push(c.getTargetNode().getName()); }
  console.log(a.getName().padEnd(10), 'dur', d.toFixed(2), 'seam(max deg)', maxAng.toFixed(1), worst, '| hip start', hip(P0), 'mid', hip(Pm), 'end', hip(P1), '| T:', transTracks.join(','), 'S:', scaleTracks);
}
