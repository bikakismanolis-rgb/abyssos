import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const r = doc.getRoot();
for (const n of r.listNodes()) {
  const m = n.getMesh();
  console.log('node', n.getName(), 'T', n.getTranslation().map(v=>+v.toFixed(3)), 'R', n.getRotation().map(v=>+v.toFixed(3)), 'S', n.getScale().map(v=>+v.toFixed(3)), 'children', n.listChildren().map(c=>c.getName()), m ? 'mesh '+m.getName() : '');
  if (m) for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION');
    const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9]; const v=[0,0,0];
    for (let i=0;i<pos.getCount();i++){pos.getElement(i,v);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],v[k]);mx[k]=Math.max(mx[k],v[k]);}}
    console.log('   prim', p.listSemantics(), 'verts', pos.getCount(), 'idx', p.getIndices()?.getCount(), 'mat', p.getMaterial()?.getName(), 'min', mn.map(v=>+v.toFixed(3)), 'max', mx.map(v=>+v.toFixed(3)));
  }
}
for (const m of r.listMaterials()) console.log('mat', m.getName(), m.getBaseColorFactor(), m.getBaseColorTexture()?.getName(), m.getBaseColorTexture()?.getSize(), m.getMetallicFactor(), m.getRoughnessFactor(), !!m.getNormalTexture());
for (const t of r.listTextures()) console.log('tex', t.getName(), t.getURI(), t.getMimeType(), t.getSize());
