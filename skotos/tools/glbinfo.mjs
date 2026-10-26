import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f); const r = doc.getRoot();
  let anim = 0, geo = 0, tris = 0;
  for (const a of r.listAccessors()) { if (a.listParents().some((p) => p.propertyType === 'AnimationSampler')) anim += a.getByteLength(); else geo += a.getByteLength(); }
  for (const m of r.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  let tex = 0; for (const t of r.listTextures()) tex += t.getImage().byteLength;
  console.log(f.split('/').pop(), 'tris', tris, 'anim', (anim / 1024).toFixed(0) + 'K(raw)', 'geo', (geo / 1024).toFixed(0) + 'K(raw)', 'tex', (tex / 1024).toFixed(0) + 'K', r.listTextures().map((t) => t.getMimeType().slice(6) + t.getSize()).join(' '), '| clips', r.listAnimations().map((a) => a.getName()).join(','));
}
