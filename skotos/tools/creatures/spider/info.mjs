import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const r = doc.getRoot();
console.log('extensions', r.listExtensionsUsed().map((e) => e.extensionName).join(','));
console.log('skins', r.listSkins().length, r.listSkins().map((s) => s.getName() + ':' + s.listJoints().length));
for (const n of r.listNodes()) if (n.getMesh()) console.log('mesh node', n.getName(), 'skin', n.getSkin()?.getName(), 'T', n.getTranslation(), 'S', n.getScale(), 'prims', n.getMesh().listPrimitives().map((p) => p.getIndices().getCount() / 3 + ' tris ' + p.getAttribute('POSITION').getCount() + 'v ' + p.listSemantics().join('/') + ' ' + p.getAttribute('POSITION').getComponentType()));
for (const t of r.listTextures()) console.log('tex', t.getName(), t.getMimeType(), t.getSize(), (t.getImage().byteLength / 1024).toFixed(0) + 'KB');
for (const m of r.listMaterials()) console.log('mat', m.getName(), 'rough', m.getRoughnessFactor(), 'normalScale', m.getNormalScale(), 'emissive', m.getEmissiveFactor(), !!m.getEmissiveTexture());
let ch = { rotation: 0, translation: 0, scale: 0 };
for (const a of r.listAnimations()) { const tr = []; let maxT = 0, nk = 0; for (const c of a.listChannels()) { ch[c.getTargetPath()]++; if (c.getTargetPath() === 'translation') tr.push(c.getTargetNode().getName()); const inp = c.getSampler().getInput(); maxT = Math.max(maxT, inp.getMax([])[0]); nk += inp.getCount(); } console.log('anim', a.getName().padEnd(8), 'dur', maxT.toFixed(3), 'channels', a.listChannels().length, 'keys', nk, 'T:', tr.join(',')); }
console.log('channel paths', ch);
console.log('extras', JSON.stringify(r.getDefaultScene().getExtras()));
