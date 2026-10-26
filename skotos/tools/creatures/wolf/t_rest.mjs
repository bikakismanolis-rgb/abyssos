import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { makeRig, solve, LEGS, V3, Q, makeSkinner } from './lib.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('wolf_base.glb');
const rig = makeRig(doc);
const legs = {}; for (const [k, L] of Object.entries(LEGS)) legs[k] = { ball: rig.R(L.p).wp.clone(), tilt: 0, plant: 1 };
const { frame, info } = solve(rig, { legs });
let maxA = 0, maxP = 0;
for (const n of rig.order) { const b = rig.R(n), f = frame.get(n); const a = 2 * Math.acos(Math.min(1, Math.abs(f.q.dot(b.lq)))) * 57.3; maxA = Math.max(maxA, a); maxP = Math.max(maxP, f.p.distanceTo(b.lp)); if (a > 0.1) console.log('diff', n, a.toFixed(2)); }
console.log('max ang', maxA.toFixed(4), 'max pos', maxP.toFixed(5), info);
const sk = makeSkinner(rig); console.log('minY', sk.minY(frame).toFixed(4));
for (const [k, L] of Object.entries(LEGS)) console.log(k, ['a','b','c','p'].map(x => rig.R(L[x]).wp.toArray().map(v=>v.toFixed(3)).join(',')).join(' | '));
