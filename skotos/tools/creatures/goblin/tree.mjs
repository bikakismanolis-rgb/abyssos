import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { pose } from './lib.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const P = pose(doc, null, 0);
const walk = (n, d) => { const p = P.get(n.getName()); console.log(' '.repeat(d) + n.getName(), p.wp.toArray().map(v => +v.toFixed(3)).join(','), 'q', n.getRotation().map(v => +v.toFixed(2)).join(','), 's', n.getScale().map(v=>+v.toFixed(3)).join(',')); for (const c of n.listChildren()) walk(c, d + 1); };
for (const n of doc.getRoot().getDefaultScene().listChildren()) walk(n, 0);
