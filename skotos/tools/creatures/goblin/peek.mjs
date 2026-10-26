import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const r = doc.getRoot();
for (const n of r.listNodes()) {
  const m = n.getMesh();
  if (m) for (const p of m.listPrimitives()) { const pos = p.getAttribute('POSITION'); console.log('mesh', n.getName(), m.getName(), pos.getCount(), pos.getMin([]).map(v=>+v.toFixed(2)), pos.getMax([]).map(v=>+v.toFixed(2)), 'T', n.getTranslation().map(v=>+v.toFixed(2)), 'S', n.getScale(), 'skin', !!n.getSkin(), 'parent', n.listParents().map(p=>p.getName?.()).join('|')); }
}
console.log('anims', r.listAnimations().map(a=>a.getName()).join(','));
console.log('scenes', r.listScenes().map(s=>s.getName()+':'+s.listChildren().map(c=>c.getName()).join('/')));
