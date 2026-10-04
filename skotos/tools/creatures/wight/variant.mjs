import { io } from './lib.mjs';
const [src, out, keep] = process.argv.slice(2);
const doc = await io.read(src);
const k = keep.split(',');
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  const nm = n.getName().toLowerCase();
  if (!(nm === 'human_export' || nm.includes('low-poly') || k.some((x) => nm.includes(x)))) { n.dispose(); }
}
for (const m of doc.getRoot().listMaterials()) m.setAlphaMode('OPAQUE').setDoubleSided(true);
await io.write(out, doc);
