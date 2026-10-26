import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { duration } from './lib.mjs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) { const d = await io.read(f); console.log(f.split('/').pop(), d.getRoot().listAnimations().map((a) => a.getName() + ':' + duration(a).toFixed(2)).join(' ')); }
