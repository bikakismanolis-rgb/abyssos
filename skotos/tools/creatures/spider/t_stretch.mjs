// every triangle must be skinned to a single bone (rigid pieces) -> no stretching possible
import { makeRig } from './lib.mjs';
const rig = await makeRig();
let mixed = 0, tris = 0; const per = {};
for (const p of rig.parts) for (let t = 0; t < p.idx.length; t += 3) { tris++; const a = p.bone[p.idx[t]], b = p.bone[p.idx[t + 1]], c = p.bone[p.idx[t + 2]]; if (a !== b || b !== c) mixed++; const n = rig.bones[a].name.replace(/_[LR]\d_/, '_*_').replace(/_[LR]$/, '_*'); per[n] = (per[n] || 0) + 1; }
console.log('triangles', tris, 'spanning >1 bone:', mixed); console.log(per);
