// sanity: rig info, FK of rest angles reproduces bind, IK on bind tips returns rest angles; writes bind.glb (plain textures)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { makeRig, solve, tipOf, minYByBone, LEG_NAMES, V3, Q, S } from './lib.mjs';
import { makeDoc } from './gltfout.mjs';
const rig = await makeRig();
console.log('bones', rig.bones.length, rig.bones.map((b) => b.name).join(' '));
for (const p of rig.parts) console.log('part', p.name, 'verts', p.pos.length / 3, 'tris', p.idx.length / 3);
for (const n of LEG_NAMES) { const L = rig.legs[n]; console.log(n, 'len', L.l2d.map((x) => x.toFixed(3)).join(','), 'rest', L.rest.map((x) => x.toFixed(1)).join(','), 'lat', L.lat.map((x) => x.toFixed(3)).join(','), 'tip', L.J[4].toArray().map((x) => x.toFixed(3)).join(','), 'root', L.J[0].toArray().map((x) => x.toFixed(3)).join(',')); }
console.log('body', rig.bones[rig.B.body].p.toArray().map((x) => x.toFixed(3)), 'abd', rig.bones[rig.B.abdomen].p.toArray().map((x) => x.toFixed(3)), 'fangL', rig.bones[rig.B.fang_L].p.toArray().map((x) => x.toFixed(3)));
const p0 = solve(rig, {});
let err = 0; for (const n of LEG_NAMES) err = Math.max(err, tipOf(rig, p0, n).distanceTo(rig.legs[n].J[4]));
console.log('FK rest tip err', err.toFixed(5));
const legs = {}; for (const n of LEG_NAMES) legs[n] = { foot: rig.legs[n].J[4].clone() };
const p1 = solve(rig, { legs });
let e2 = 0; for (const n of LEG_NAMES) e2 = Math.max(e2, tipOf(rig, p1, n).distanceTo(rig.legs[n].J[4]));
console.log('IK bind tip err', e2.toFixed(5), 'angles L2', JSON.stringify(p1.angles.L2), 'R2', JSON.stringify(p1.angles.R2));
// extent
let mn = V3(1e9, 1e9, 1e9), mx = V3(-1e9, -1e9, -1e9);
for (const part of rig.parts) for (let i = 0; i < part.pos.length; i += 3) { const v = V3(part.pos[i], part.pos[i + 1], part.pos[i + 2]); mn.min(v); mx.max(v); }
console.log('bind bbox', mn.toArray().map((x) => x.toFixed(3)), mx.toArray().map((x) => x.toFixed(3)));
const D = S + '/research/opengameart/dl/giant-spider/';
const mats = { body: { base: { buf: readFileSync(D + 'Spider-body-brown-tex.png'), mime: 'image/png' } }, leg: { base: { buf: readFileSync(D + 'Spider-leg-brown-tex.png'), mime: 'image/png' } } };
const doc = makeDoc(rig, mats, {}, {});
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write('bind.glb', doc);
