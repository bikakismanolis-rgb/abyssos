import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { statSync } from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const f = process.argv[2]; const doc = await io.read(f); const r = doc.getRoot();
let tris = 0; const meshes = r.listMeshes();
for (const m of meshes) for (const p of m.listPrimitives()) { tris += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; console.log('prim', m.getName(), p.getMaterial()?.getName(), 'verts', p.getAttribute('POSITION').getCount(), 'attrs', p.listSemantics().join(',')); }
for (const t of r.listTextures()) console.log('tex', t.getName(), t.getMimeType(), t.getSize(), (t.getImage().byteLength / 1024).toFixed(0) + 'KB');
for (const m of r.listMaterials()) console.log('mat', m.getName(), 'base', m.getBaseColorTexture()?.getName(), 'normal', m.getNormalTexture()?.getName(), 'emissive', m.getEmissiveTexture()?.getName(), m.getEmissiveFactor(), 'rough', m.getRoughnessFactor(), 'metal', m.getMetallicFactor());
console.log('size KB', (statSync(f).size / 1024).toFixed(0), 'tris', tris, 'meshes', meshes.length, 'skins', r.listSkins().length, 'joints', r.listSkins()[0].listJoints().length, 'anims', r.listAnimations().map(a => a.getName()).join(','), 'ext', r.listExtensionsUsed().map(e => e.extensionName).join(','));
