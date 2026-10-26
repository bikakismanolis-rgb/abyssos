import { io } from '../lib.mjs';
const doc = await io.read(process.argv[2]);
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('TEXCOORD_0').getArray(); let mn = [9, 9], mx = [-9, -9]; for (let i = 0; i < a.length; i += 2) { mn[0] = Math.min(mn[0], a[i]); mn[1] = Math.min(mn[1], a[i + 1]); mx[0] = Math.max(mx[0], a[i]); mx[1] = Math.max(mx[1], a[i + 1]); } console.log(m.getName(), mn.map((x) => x.toFixed(3)), mx.map((x) => x.toFixed(3))); }
