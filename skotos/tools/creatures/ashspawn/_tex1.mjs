import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const m = doc.getRoot().listMaterials()[0];
const T = (n, f) => doc.createTexture(n).setImage(new Uint8Array(readFileSync(f))).setMimeType('image/png');
m.setBaseColorTexture(T('base', 'tex/ash_base.png')).setNormalTexture(T('nrm', 'tex/ash_nrm.png')).setEmissiveTexture(T('emit', 'tex/ash_emit.png')).setEmissiveFactor([1, 1, 1]).setRoughnessFactor(0.88).setMetallicFactor(0);
await io.write(process.argv[3], doc);
