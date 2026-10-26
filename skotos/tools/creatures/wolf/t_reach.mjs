import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { makeRig, solve } from './lib.mjs';
import { makeClips } from './clips.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const rig = makeRig(await io.read('wolf_base.glb'));
const P = JSON.parse(process.argv[3] || '{}');
const C = makeClips(rig, P)[process.argv[2] || 'walk'];
C.frames.forEach((s, i) => { const { info } = solve(rig, s); const L = s.legs; console.log(String(i).padStart(2), Object.entries(info.reach).map(([k, v]) => `${k}:${v > 0 ? '+' : ' '}${v.toFixed(3)} z${L[k].ball.z.toFixed(2)} y${L[k].ball.y.toFixed(2)} p${(L[k].plant).toFixed(1)}`).join(' | ')); });
