// Act VIII's code props (docs/act8-design.md). Build7's conventions: made in code, lit plain materials that read under
// the sun, geometries baked once per zone and disposed with it, no light of their own.
//   act8Level(L, lvl)   the dry-stone walls of a gen8 layout (one mesh), its sheaves (one mesh), its three banked
//                       hearths (build7's lookout hearth, cold: a banked fire shows no flame); adds them to lvl.group and
//                       returns the handles, kept as lvl.act8: { walls, sheaves, hearths [{ k, x, z, mesh }], all }
// Nothing here burns: the Burn's own flames and the black it leaves are the mechanic's (stage B), drawn only inside a
// field's walls.
import * as THREE from 'three';
import { G } from '../gfx/rig.js';
import { RNG } from '../core/util.js';
import { groundY } from './genlib.js';
import { bake, jitter, occlude, hash2 } from './build.js';
import { act7Prop } from './build7.js';

const STONE = [0x8a857c, 0x7a766e, 0x96918a, 0x6e6a64, 0xa09a90], STRAW = [0xd8b860, 0xc8a850, 0xe4c878, 0xb89844], TWINE = 0x7a6448;
let MAT8 = null;
const mat8 = () => (MAT8 ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
const mesh8 = (parts) => { const m = new THREE.Mesh(bake(parts), mat8()); m.castShadow = true; m.receiveShadow = true; return m; };

export function act8Level(L, lvl) {
  const group = lvl?.isObject3D ? lvl : lvl?.group || new THREE.Group(), S = L?.spots || {};
  const A = { walls: null, sheaves: null, hearths: [], all: [] };
  const gy = (x, z) => { try { return L?.hgt ? groundY(L, x, z) : 0; } catch (e) { return 0; } };
  const add = (m) => { group.add(m); A.all.push(m); return m; };
  // ---- the walls: two courses of field stones a cell, a cope stone on every other; a run's ends a little lower ----
  const rr = RNG(((L?.seed || 1) ^ 0x8a11) >>> 0), wp = [];
  for (const run of L?.walls || []) {
    const alongX = run.z0 === run.z1, n = alongX ? run.x1 - run.x0 + 1 : run.z1 - run.z0 + 1;
    for (let k = 0; k < n; k++) {
      const cx = (alongX ? run.x0 + k : run.x0) + 0.5, cz = (alongX ? run.z0 : run.z0 + k) + 0.5, y = gy(cx, cz), end = k === 0 || k === n - 1;
      for (let j = 0; j < 2; j++) {
        const o = (j - 0.5) * 0.5 + rr.range(-0.06, 0.06), hh = rr.range(0.42, 0.56), ww = rr.range(0.5, 0.62);
        wp.push({ geo: jitter(G.box(alongX ? ww : 0.62, hh, alongX ? 0.62 : ww), 0.05, 100 + ((k * 7 + j) % 23)), color: rr.pick(STONE), o: { x: cx + (alongX ? o : rr.range(-0.05, 0.05)), y: y + hh / 2, z: cz + (alongX ? rr.range(-0.05, 0.05) : o), ry: rr.range(-0.12, 0.12) } });
        if (!end || j === 0) wp.push({ geo: jitter(G.box(alongX ? ww * 0.92 : 0.5, 0.36, alongX ? 0.5 : ww * 0.92), 0.05, 140 + ((k * 5 + j) % 19)), color: rr.pick(STONE), o: { x: cx + (alongX ? o * 0.9 : 0), y: y + hh + 0.16, z: cz + (alongX ? 0 : o * 0.9), ry: rr.range(-0.2, 0.2) } });
      }
      if (!end && k % 2 === 0) wp.push({ geo: jitter(G.box(alongX ? 0.7 : 0.42, 0.2, alongX ? 0.42 : 0.7), 0.04, 170 + (k % 11)), color: STONE[4], o: { x: cx, y: y + 1.02, z: cz, ry: rr.range(-0.25, 0.25) } });
    }
  }
  if (wp.length) A.walls = add(mesh8(wp));
  // ---- the sheaves: a stook of reaped straw on its blocked cell (cover a hero can stand behind) ----
  const sp = [];
  for (const p of S.sheaves || []) {
    const y = gy(p.x, p.z), a0 = hash2(p.x, p.z) * 6.28;
    for (let k = 0; k < 5; k++) { const a = a0 + (k / 5) * 6.28, d = k === 4 ? 0 : 0.26; sp.push({ geo: G.cone(0.3, 1.5, 6), color: STRAW[k % 4], o: { x: p.x + Math.sin(a) * d, y: y + 0.74, z: p.z + Math.cos(a) * d, rx: Math.cos(a) * d * 0.7, rz: -Math.sin(a) * d * 0.7 } }); }
    sp.push({ geo: G.cyl(0.33, 0.36, 0.1, 7), color: TWINE, o: { x: p.x, y: y + 0.62, z: p.z } });
  }
  if (sp.length) A.sheaves = add(mesh8(sp));
  // ---- the banked hearths: build7's lookout hearth, cold (rank 0, unlit), a flat cover stone laid over the wood ----
  for (const p of S.hearths || []) {
    const m = act7Prop('lookHearth', {}); m.position.set(p.x, gy(p.x, p.z), p.z); m.rotation.y = hash2(p.x, p.z) * 6.28;
    m.userData.setLit?.(false);
    const lid = mesh8([{ geo: jitter(G.cyl(0.62, 0.7, 0.14, 8), 0.04, 811), color: STONE[3], o: { y: 0.72 } }]); m.add(lid); m.userData.lid = lid;
    add(m); A.hearths.push({ k: p.k, x: p.x, z: p.z, mesh: m });
  }
  if (lvl && !lvl.isObject3D) lvl.act8 = A;
  return A;
}
