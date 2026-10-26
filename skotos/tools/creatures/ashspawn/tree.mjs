import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { pose } from './lib.mjs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const R = pose(doc, null, 0);
const joints = new Set(doc.getRoot().listSkins().flatMap(s => s.listJoints()));
const pr = (n, d) => { const r = R.get(n.getName()); console.log('  '.repeat(d) + n.getName(), joints.has(n) ? 'J' : '', n.getMesh() ? 'MESH:' + n.getMesh().getName() : '', n.getSkin() ? 'SKIN' : '', 'wp', r.wp.toArray().map(v => +v.toFixed(3)).join(','), 's', n.getScale().map(v=>+v.toFixed(3)).join(',')); for (const c of n.listChildren()) pr(c, d + 1); };
for (const s of doc.getRoot().listScenes()) { console.log('SCENE', s.getName()); for (const n of s.listChildren()) pr(n, 0); }
for (const a of doc.getRoot().listAnimations()) console.log('anim', a.getName(), a.listChannels().length);
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) console.log('mesh', m.getName(), p.getAttribute('POSITION').getCount(), p.getIndices()?.getCount()/3, p.listSemantics().join(','), p.getMaterial()?.getName());
