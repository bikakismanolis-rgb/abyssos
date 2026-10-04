import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const r = doc.getRoot();
console.log('scenes', r.listScenes().map((s) => s.getName() + ':' + s.listChildren().map((c) => c.getName()).join(',')), JSON.stringify(r.getDefaultScene().getExtras()));
for (const m of r.listMaterials()) console.log('MAT', m.getName(), m.getAlphaMode(), m.getDoubleSided(), m.getBaseColorFactor().map((x) => +x.toFixed(2)), 'tex', m.getBaseColorTexture()?.getName(), m.getBaseColorTexture()?.getMimeType(), m.getBaseColorTexture()?.getSize(), 'nrm', m.getNormalTexture()?.getSize(), 'mr', m.getMetallicRoughnessTexture()?.getSize(), 'em', m.getEmissiveTexture()?.getSize(), m.getEmissiveFactor(), m.getMetallicFactor(), m.getRoughnessFactor());
let tris = 0;
for (const m of r.listMeshes()) for (const p of m.listPrimitives()) { const n = (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; tris += n; console.log('PRIM', m.getName(), p.getMaterial()?.getName(), 'verts', p.getAttribute('POSITION').getCount(), 'tris', n, p.listSemantics().join(',')); }
console.log('tris', tris, 'textures', r.listTextures().map((t) => t.getName() + ':' + t.getMimeType() + ':' + t.getSize() + ':' + Math.round(t.getImage().byteLength / 1024) + 'KB').join(' '));
for (const a of r.listAnimations()) { let d = 0; const paths = {}; for (const c of a.listChannels()) paths[c.getTargetPath()] = (paths[c.getTargetPath()] || 0) + 1; for (const s of a.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); console.log('ANIM', a.getName(), d.toFixed(2), JSON.stringify(paths)); }
