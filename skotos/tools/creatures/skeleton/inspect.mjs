import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log('scenes', root.listScenes().map(s=>s.getName()), 'extras', JSON.stringify(root.listScenes()[0]?.getExtras()));
for (const n of root.listNodes()) {
  const p = n.getParentNode();
  console.log('node', n.getName(), 'parent', p && p.getName(), 'T', n.getTranslation().map(v=>+v.toFixed(3)), 'R', n.getRotation().map(v=>+v.toFixed(3)), 'S', n.getScale().map(v=>+v.toFixed(3)), n.getMesh()? 'mesh:'+n.getMesh().getName():'', n.getSkin()?'skin':'');
}
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  console.log('mesh', m.getName(), 'attrs', p.listSemantics().join(','), 'verts', p.getAttribute('POSITION').getCount(), 'tris', p.getIndices()? p.getIndices().getCount()/3 : 0, 'mat', p.getMaterial()?.getName());
}
for (const s of root.listSkins()) console.log('skin joints', s.listJoints().length, 'skeleton', s.getSkeleton()?.getName());
for (const a of root.listAnimations()) { let d=0; for (const s of a.listSamplers()) { const t=s.getInput().getArray(); d=Math.max(d,t[t.length-1]); } console.log('anim', a.getName(), 'channels', a.listChannels().length, 'dur', d.toFixed(2)); }
for (const t of root.listTextures()) console.log('tex', t.getName(), t.getMimeType(), t.getSize());
for (const m of root.listMaterials()) console.log('mat', m.getName(), m.getBaseColorFactor(), m.getRoughnessFactor(), m.getMetallicFactor());
