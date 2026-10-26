import { io, pose, THREE } from '../lib.mjs';
const doc = await io.read(process.argv[2]);
for (const a of doc.getRoot().listAnimations()) {
  let d = 0; for (const s of a.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]);
  const ds = [];
  for (let t = 0; t <= d; t += d / 12) { const P = pose(doc, a, t); const r = P.get('grip_R'), l = P.get('grip_L'); const yb = new THREE.Vector3().setFromMatrixColumn(r.world, 1).normalize(); const tgt = r.wp.clone().addScaledVector(yb, -0.15); ds.push(l.wp.distanceTo(tgt).toFixed(2)); }
  console.log(a.getName().padEnd(8), ds.join(' '));
}
