// loop seam + root drift check on the final GLB
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const a of doc.getRoot().listAnimations()) {
  let seam = 0, worst = '', drift = '';
  for (const c of a.listChannels()) {
    const s = c.getSampler(), o = s.getOutput(), n = o.getCount();
    const f = o.getElement(0, []), l = o.getElement(n - 1, []);
    if (c.getTargetPath() === 'rotation') { const nf = Math.hypot(...f), nl = Math.hypot(...l); const d = Math.abs(f[0] * l[0] + f[1] * l[1] + f[2] * l[2] + f[3] * l[3]) / (nf * nl); const ang = 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; if (ang > seam) { seam = ang; worst = c.getTargetNode().getName(); } }
    else { drift = `body start ${f.map((x) => x.toFixed(3))} end ${l.map((x) => x.toFixed(3))}`; }
  }
  console.log(a.getName().padEnd(8), 'first-vs-last max deg', seam.toFixed(2).padStart(7), worst.padEnd(18), drift);
}
