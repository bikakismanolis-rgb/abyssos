import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { makeRig, solve, makeSkinner, V3 } from './lib.mjs';
import { makeClips } from './clips.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const rig = makeRig(await io.read('wolf_base.glb'));
const C = makeClips(rig, JSON.parse(process.argv[3] || '{}'))[process.argv[2] || 'die'];
const fi = +(process.argv[4] ?? C.frames.length - 1);
const sk = makeSkinner(rig, 1);
const { frame, WP } = solve(rig, C.frames[fi]);
const pts = sk.skinned(frame);
const low = pts.map((p, k) => [p, k]).sort((a, b) => a[0].y - b[0].y).slice(0, 8);
for (const [p, k] of low) { const v = sk.VERTS[k]; console.log(p.toArray().map(x => x.toFixed(3)).join(','), v.j.map((j, q) => sk.JL[j] + ':' + v.w[q].toFixed(2)).filter(s => !s.endsWith(':0.00')).join(' '), 'rest', v.p.toArray().map(x => x.toFixed(2)).join(',')); }
for (const n of ['pelvis', 'thigh_r', 'shin_r', 'hock_r', 'hpaw_r', 'spine_03', 'head', 'upperarm_r', 'fpaw_r']) console.log(n, WP.get(n).toArray().map(x => x.toFixed(3)).join(','));
