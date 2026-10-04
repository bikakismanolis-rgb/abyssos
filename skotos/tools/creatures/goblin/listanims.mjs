import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const r = doc.getRoot();
  console.log(f.split('/').pop(), r.listAnimations().map(a => { let d = 0; for (const s of a.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); return a.getName() + ':' + d.toFixed(2); }).join(' '));
}
