// contract checks: extras, grips, per-clip pelvis drift and loop seams, scale tracks
import { io, pose, THREE } from '../lib.mjs';
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log(JSON.stringify(root.getDefaultScene().getExtras(), null, 0).slice(0, 400));
for (const n of root.listNodes()) if (/^grip_/.test(n.getName())) { const p = root.listNodes().find((x) => x.listChildren().includes(n)); console.log(n.getName(), 'parent', p.getName(), 't', n.getTranslation().map((x) => +x.toFixed(3)), 'mesh', !!n.getMesh()); }
const pel = root.listNodes().find((n) => n.getName() === 'pelvis');
for (const a of root.listAnimations()) {
  const paths = new Set(a.listChannels().map((c) => c.getTargetPath()));
  let d = 0; for (const s of a.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]);
  const P0 = pose(doc, a, 0), P1 = pose(doc, a, d);
  const w0 = P0.get('pelvis').wp, w1 = P1.get('pelvis').wp;
  let maxRot = 0; for (const c of a.listChannels()) { if (c.getTargetPath() !== 'rotation') continue; const o = c.getSampler().getOutput().getArray(), n = o.length / 4; const q0 = new THREE.Quaternion().fromArray(o, 0), q1 = new THREE.Quaternion().fromArray(o, (n - 1) * 4); maxRot = Math.max(maxRot, q0.angleTo(q1)); }
  console.log(a.getName().padEnd(8), 'paths', [...paths].join('/'), 'pelvis start', [w0.x, w0.y, w0.z].map((x) => x.toFixed(3)).join(','), 'end-start xz', (w1.x - w0.x).toFixed(3), (w1.z - w0.z).toFixed(3), 'max first/last rot diff', maxRot.toFixed(3));
}
