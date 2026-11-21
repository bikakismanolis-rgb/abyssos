// Act VIII's code props (docs/act8-design.md). Build7's conventions: made in code, lit plain materials that read under
// the sun, geometries baked once per zone and disposed with it, no light of their own.
//   act8Level(L, lvl)   the dry-stone walls of a gen8 layout (one mesh), its sheaves (one mesh), its three banked
//                       hearths (build7's lookout hearth, cold: a banked fire shows no flame); adds them to lvl.group and
//                       returns the handles, kept as lvl.act8: { walls, sheaves, hearths [{ k, x, z, mesh }], all }
// Nothing here burns: the Burn's own flames and the black it leaves are the mechanic's (stage B), drawn only inside a
// field's walls.
import * as THREE from 'three';
import { G } from '../gfx/rig.js';
import { R } from '../gfx/gfx.js';
import { RNG } from '../core/util.js';
import { groundY } from './genlib.js';
import { bake, jitter, occlude, hash2 } from './build.js';
import { act7Prop } from './build7.js';

const STONE = [0x8a857c, 0x7a766e, 0x96918a, 0x6e6a64, 0xa09a90], STRAW = [0xd8b860, 0xc8a850, 0xe4c878, 0xb89844], TWINE = 0x7a6448;
let MAT8 = null, BLACK8 = null;
const mat8 = () => (MAT8 ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
const mesh8 = (parts) => { const m = new THREE.Mesh(bake(parts), mat8()); m.castShadow = true; m.receiveShadow = true; return m; };

export function act8Level(L, lvl) {
  const group = lvl?.isObject3D ? lvl : lvl?.group || new THREE.Group(), S = L?.spots || {};
  const A = { walls: null, sheaves: null, hearths: [], lanes: [], all: [] };
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
  // ---- the Burn's lanes (L.flues, kind 'burn'), by index: the standing stubble, and the black it leaves (hidden) ----
  (L?.flues || []).forEach((f, k) => {
    if (f.kind !== 'burn') return;
    const ux = Math.sin(f.dir), uz = Math.cos(f.dir), tp = [], lr = RNG((L.seed || 1) * 131 + k * 17 + 5), n = Math.round(f.len * f.w * (R.quality >= 1 ? 1.5 : 0.8));
    for (let j = 0; j < n; j++) {
      const u = lr.range(0.3, f.len - 0.3), v = lr.range(-f.w / 2 + 0.2, f.w / 2 - 0.2), x = f.x + ux * u - uz * v, z = f.z + uz * u + ux * v, hh = lr.range(0.45, 0.8);
      tp.push({ geo: G.cone(lr.range(0.1, 0.16), hh, 4), color: STRAW[j % 4], o: { x, y: gy(x, z) + hh / 2, z, rx: lr.range(-0.2, 0.2), rz: lr.range(-0.2, 0.2), ry: lr.range(0, 3) } });
    }
    const tufts = new THREE.Mesh(bake(tp), mat8()); tufts.receiveShadow = true; add(tufts);
    const geo = new THREE.PlaneGeometry(f.w + 0.6, f.len + 0.4, 6, Math.max(4, Math.round(f.len / 2))); geo.rotateX(-Math.PI / 2);
    // (a ragged edge: the rim's vertices pulled in and out a little, their colour thinner)
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const ex = Math.abs(pos.getX(i)) > f.w / 2, ez = Math.abs(pos.getZ(i)) > f.len / 2 - 0.1, e = ex || ez; if (ex) pos.setX(i, pos.getX(i) + lr.range(-0.45, 0.25) * Math.sign(pos.getX(i))); const c = e ? 0.16 : lr.range(0.045, 0.085); col[i * 3] = c * 1.05; col[i * 3 + 1] = c; col[i * 3 + 2] = c * 0.95; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const black = new THREE.Mesh(geo, (BLACK8 ||= new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    black.position.set(f.x + ux * f.len / 2, 0.035, f.z + uz * f.len / 2); black.rotation.y = f.dir; black.receiveShadow = true; black.visible = false; black.renderOrder = 1; add(black);
    const lane = { k, id: f.id, tufts, black, burnt: false };
    lane.setBurnt = (b) => { lane.burnt = !!b; tufts.visible = !b; black.visible = !!b; };
    A.lanes[k] = lane;
  });
  // ---- the Vigil House (gen8 genVigil): pillars, the halls' fires, the doors, the dark under each roof, the Great
  // Hall's Flame and the daylight its eight shutters let in ----
  if (L?.type === 'vigil') {
    const pp = [], pr = RNG(((L.seed || 1) ^ 0x51a7) >>> 0);
    for (const p of S.pillars || []) {
      const y = gy(p.x, p.z);
      pp.push({ geo: jitter(G.box(2.1, 0.5, 2.1), 0.04, 301), color: STONE[1], o: { x: p.x, y: y + 0.25, z: p.z } });
      for (let j = 0; j < 4; j++) pp.push({ geo: jitter(G.cyl(0.78 - j * 0.02, 0.82 - j * 0.02, 0.8, 9), 0.03, 310 + j), color: STONE[(j + (p.x | 0)) % 5], o: { x: p.x, y: y + 0.9 + j * 0.8, z: p.z, ry: pr.range(0, 3) } });
      pp.push({ geo: jitter(G.box(1.9, 0.35, 1.9), 0.04, 320), color: STONE[4], o: { x: p.x, y: y + 3.85, z: p.z } });
    }
    if (pp.length) A.pillars = add(mesh8(pp));
    A.fires = [];
    for (const p of S.fires || []) {
      const m = act7Prop('lookHearth', {}); m.position.set(p.x, gy(p.x, p.z), p.z); m.rotation.y = hash2(p.x, p.z) * 6.28; m.scale.setScalar(1.15);
      const lid = mesh8([{ geo: jitter(G.cyl(0.62, 0.7, 0.14, 8), 0.04, 811), color: STONE[3], o: { y: 0.72 } }]); m.add(lid); m.userData.lid = lid;
      add(m); A.fires.push({ k: p.k, x: p.x, z: p.z, mesh: m });
    }
    A.doors = [];
    for (const d of S.doors || []) {
      const y = gy(d.x, d.z), dp = [];
      for (let j = 0; j < 3; j++) dp.push({ geo: jitter(G.box(1.02, 2.6, 0.5), 0.03, 400 + j), color: [0x4a4440, 0x54504a, 0x46423e][j], o: { x: (j - 1) * 1.02, y: 1.3, z: 0 } });
      dp.push({ geo: G.box(3.3, 0.22, 0.62), color: 0x2e2a28, o: { y: 0.9 } }, { geo: G.box(3.3, 0.22, 0.62), color: 0x2e2a28, o: { y: 2.0 } });
      dp.push({ geo: G.cyl(0.3, 0.3, 0.08, 10), color: 0xe8e0d0, o: { y: 1.45, z: 0.3, rx: Math.PI / 2 } });
      const m = mesh8(dp); m.position.set(d.x, y, d.z - 0.5); add(m);
      const door = { k: d.k, mesh: m, open: false }; door.setOpen = (b) => { door.open = !!b; m.visible = !b; };
      A.doors.push(door);
    }
    // (the dark under a roof: a black veil just over the floor, thinner as the light comes in)
    const veil = (geo, x, z) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x05060a, transparent: true, opacity: 0.62, depthWrite: false })); m.material.userData.own = true; m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); m.renderOrder = 2; add(m); const v = { mesh: m, k: 1 }; v.setDark = (k) => { v.k = k; m.material.opacity = 0.62 * k; m.visible = k > 0.01; }; return v; };
    A.darks = (L.halls || []).map((H) => Object.assign(veil(new THREE.PlaneGeometry(H.x1 - H.x0 + 1.6, H.z1 - H.z0 + 1.6), (H.x0 + H.x1 + 1) / 2, (H.z0 + H.z1 + 1) / 2), { hall: H.k }));
    const AR = S.arena;
    if (AR) {
      A.arenaDark = veil(new THREE.CircleGeometry(AR.r + 0.8, 40), AR.x, AR.z);
      const fm = act7Prop('lookHearth', {}); fm.position.set(S.flame.x, gy(S.flame.x, S.flame.z), S.flame.z); fm.scale.setScalar(1.5);
      const lid = mesh8([{ geo: jitter(G.cyl(0.62, 0.7, 0.14, 8), 0.04, 811), color: STONE[3], o: { y: 0.72 } }]); fm.add(lid); fm.userData.lid = lid;
      add(fm); A.flame = { x: S.flame.x, z: S.flame.z, mesh: fm };
      A.shutters = (S.shutters || []).map((p) => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(3.3, 24), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.material.userData.own = true; m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.08, p.z); m.renderOrder = 3; m.visible = false; add(m);
        const sh = { k: p.k, x: p.x, z: p.z, r: 3.3, mesh: m, open: false }; sh.setOpen = (b, show = true) => { sh.open = !!b; m.visible = !!b && show; }; return sh;
      });
    }
  }
  if (lvl && !lvl.isObject3D) lvl.act8 = A;
  return A;
}
