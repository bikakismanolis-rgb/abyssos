// Builds src/assets/folk.glb: Act II's people, made from the Quaternius characters already in people.glb (CC0).
// Dwarves are the same characters re-proportioned: every bone keeps its rest rotation (so the shared clips in moves.bin
// still fit), the skeleton is re-measured (short legs, broad shoulders, a long back) and the skin follows by blending
// each vertex's per-bone transforms (scale the flesh about the bone, move it with the bone's new joint).
// usage: node folk.mjs [people.glb] [out.glb]                  Act II's dwarves -> src/assets/folk.glb
//        node folk.mjs --set=grove [people.glb] [out.glb]    Act III's Evergreen (elves) -> src/assets/grove.glb
//        node folk.mjs --set=ash [people.glb] [out.glb]      Act IV's dead, smiths, Wayfarers and bosses -> src/assets/ash.glb
//        node folk.mjs --set=frost [people.glb] [out.glb]    Act V's Sunken, Ice Singers and Saltborn -> src/assets/frost.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, textureCompress, weld, unpartition, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { statSync } from 'node:fs';
import { load, normalise, dropLoose, locals, worlds, smooth } from './lib.mjs';
import { simplifyPrim } from '../../envlib.mjs';

const SET = process.argv.find((a) => a.startsWith('--set='))?.slice(6) || 'folk';
const [PEOPLE = new URL('../../../src/assets/people.glb', import.meta.url).pathname, OUT = new URL(`../../../src/assets/${SET}.glb`, import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// ---------- proportions ----------
// len: factor on the offset of a joint from its parent; girth: flesh scale across the bone; size: uniform flesh scale
const DWARF = {
  len: { calf: 0.7, foot: 0.72, thigh: 1.18, spine_01: 1.0, spine_02: 1.02, spine_03: 1.02, neck_01: 0.75, Head: 0.9, upperarm: 1.25, lowerarm: 0.86, hand: 0.86, clavicle: 1.1 },
  girth: { pelvis: 1.22, spine_01: 1.26, spine_02: 1.3, spine_03: 1.28, neck_01: 1.3, thigh: 1.3, calf: 1.28, upperarm: 1.24, lowerarm: 1.24, clavicle: 1.2 },
  size: { Head: 1.12, hand: 1.18, foot: 1.18, ball: 1.15 }
};
const side = (n) => n.replace(/_(l|r)$/, '');

// ---------- recolouring ----------
// selective hue move (pack-chars.mjs): pixels with hue in [f0, f1] go to `to`, saturation x sat, value x bri
async function recolor(img, [f0, f1, to, sat, bri]) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mid = (f0 + f1) / 2;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.04 || mx < 0.03) continue;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    if (h < f0 || h > f1 || d / mx < 0.12) continue;
    const nh = (to + (h - mid) * 0.4 + 360) % 360, ns = Math.min(1, (d / mx) * sat), nv = Math.min(1, mx * bri);
    const c = nv * ns, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = nv - c;
    const [rr, gg, bb] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x];
    data[i] = Math.round((rr + m) * 255); data[i + 1] = Math.round((gg + m) * 255); data[i + 2] = Math.round((bb + m) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
// ash: grey the whole map toward a cold stone tone, keep the light and dark
async function ashen(img, k = 0.8, tint = [0.62, 0.6, 0.6]) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const l = 0.3 * data[i] + 0.55 * data[i + 1] + 0.15 * data[i + 2];
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - k) + l * tint[c] * k * 1.25);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
const hexRGB = (h) => { const v = parseInt(h.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255].map((c) => Math.pow(c, 2.2)); };

// ---------- one character from people.glb, alone in its document ----------
async function isolate(sceneName) {
  const doc = await io.read(PEOPLE);
  const root = doc.getRoot();
  for (const s of root.listScenes()) if (s.getName() !== sceneName) { for (const n of s.listChildren()) n.dispose(); s.dispose(); }
  const sc = root.listScenes()[0];
  root.setDefaultScene(sc);
  const live = new Set(); sc.traverse((n) => live.add(n));
  for (const n of root.listNodes()) if (!live.has(n)) n.dispose();
  for (const sk of root.listSkins()) if (!sk.listJoints().some((j) => live.has(j))) sk.dispose();
  await doc.transform(prune({ keepLeaves: true }));
  return doc;
}

// ---------- re-proportioning ----------
function worldOf(sc) {
  const W = new Map(), P = new Map();
  const visit = (n, pm, par) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale())); const w = pm ? pm.clone().multiply(m) : m; W.set(n, w); P.set(n, par); for (const c of n.listChildren()) visit(c, w, n); };
  for (const n of sc.listChildren()) visit(n, null, null);
  return { W, P };
}
function morph(doc, M) {
  const root = doc.getRoot(), sc = root.getDefaultScene();
  const { W, P } = worldOf(sc);
  const joints = new Set(); for (const sk of root.listSkins()) for (const j of sk.listJoints()) joints.add(j);
  const order = []; sc.traverse((n) => { if (joints.has(n)) order.push(n); });
  // new rest: same world rotations, joint offsets scaled
  const Wn = new Map();
  for (const j of order) {
    const par = P.get(j), w = W.get(j), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    w.decompose(p, q, s);
    if (!par || !joints.has(par)) { Wn.set(j, w.clone()); continue; }
    const pw = W.get(par), pp = new THREE.Vector3().setFromMatrixPosition(pw);
    const off = p.clone().sub(pp).multiplyScalar(M.len[side(j.getName())] ?? 1);
    const npp = new THREE.Vector3().setFromMatrixPosition(Wn.get(par));
    Wn.set(j, new THREE.Matrix4().compose(npp.add(off), q, s));
  }
  // stand the new skeleton on the old ground
  const low = (map) => Math.min(...order.filter((j) => /^ball_|^foot_/.test(j.getName())).map((j) => new THREE.Vector3().setFromMatrixPosition(map.get(j)).y));
  const dy = low(W) - low(Wn);
  for (const j of order) { const m = Wn.get(j); m.elements[13] += dy; }
  // per-joint flesh transform: T'_j * S_j * T_j^-1 (S in the joint's frame: girth across the bone, length along it)
  const X = new Map();
  for (const j of order) {
    const nm = side(j.getName()), Tj = W.get(j), Tn = Wn.get(j);
    const child = j.listChildren().find((c) => joints.has(c));
    let S = new THREE.Matrix4();
    const g = M.girth[nm] ?? 1, u = M.size[nm] ?? 1;
    if (u !== 1) S.makeScale(u, u, u);
    else if (g !== 1 || child) {
      const along = child ? new THREE.Vector3(...child.getTranslation()).normalize() : new THREE.Vector3(1, 0, 0);
      const L = child ? (M.len[side(child.getName())] ?? 1) : 1;
      // G*I + (L - G) * a a^T
      const a = along, e = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e.push((r === c ? g : 0) + (L - g) * a.getComponent(r) * a.getComponent(c));
      S.set(e[0], e[1], e[2], 0, e[3], e[4], e[5], 0, e[6], e[7], e[8], 0, 0, 0, 0, 1);
    }
    // `axes`: flesh scaled about the joint along the world's axes [across, up, forward] (a narrower, longer face)
    if (M.axes?.[nm]) { const R = new THREE.Matrix4().extractRotation(Tj); S.premultiply(R.clone().premultiply(new THREE.Matrix4().makeScale(...M.axes[nm])).premultiply(R.clone().invert())); }
    X.set(j, Tn.clone().multiply(S).multiply(Tj.clone().invert()));
  }
  // skin every vertex into its bind-world position, move it by the blended flesh transforms, rebind to the new joints
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(), skin = node.getSkin(); if (!mesh || !skin) continue;
    const js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
    const B = js.map((j, i) => W.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16)));
    for (const prim of mesh.listPrimitives()) {
      const Pa = prim.getAttribute('POSITION'), Na = prim.getAttribute('NORMAL'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
      const pos = new Float32Array(Pa.getCount() * 3), nor = Na ? new Float32Array(Na.getCount() * 3) : null;
      const e = [], ne = [], je = [], we = [], v = new THREE.Vector3(), n = new THREE.Vector3(), acc = new THREE.Vector3(), nacc = new THREE.Vector3();
      // normals move with the inverse transpose of each blended transform
      const XB = js.map((jt, k) => X.get(jt).clone().multiply(B[k])), NB = XB.map((m) => new THREE.Matrix3().setFromMatrix4(m).invert().transpose());
      for (let i = 0; i < Pa.getCount(); i++) {
        Pa.getElement(i, e); J.getElement(i, je); Wt.getElement(i, we);
        if (Na) Na.getElement(i, ne);
        acc.set(0, 0, 0); nacc.set(0, 0, 0);
        for (let k = 0; k < 4; k++) {
          if (!we[k]) continue;
          acc.addScaledVector(v.fromArray(e).applyMatrix4(XB[je[k]]), we[k]);
          if (Na) nacc.addScaledVector(n.fromArray(ne).applyMatrix3(NB[je[k]]), we[k]);
        }
        acc.toArray(pos, i * 3);
        if (nor) nacc.normalize().toArray(nor, i * 3);
      }
      prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(root.listBuffers()[0]));
      if (nor) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(root.listBuffers()[0]));
    }
    const arr = new Float32Array(js.length * 16);
    js.forEach((j, i) => Wn.get(j).clone().invert().toArray(arr, i * 16));
    skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(arr).setBuffer(root.listBuffers()[0]));
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
  // node locals from the new world transforms
  for (const j of order) {
    const par = P.get(j), pw = par ? (joints.has(par) ? Wn.get(par) : W.get(par)) : new THREE.Matrix4();
    const l = pw.clone().invert().multiply(Wn.get(j)), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    l.decompose(p, q, s);
    j.setTranslation(p.toArray()).setRotation(q.toArray()).setScale(s.toArray());
  }
}

// ---------- another rig's body on this skeleton ----------
// Mixamo bone -> UE bone. The model's arms are first swung into the UE T-pose (shortest arc per bone, so a hanging
// A-pose arm comes up level), its skin is set in that pose, and the UE bones are placed on its joints keeping their
// own rest rotations, so the shared clips drive it like any other person.
const MIXAMO = { Hips: 'pelvis', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03', Neck: 'neck_01', Head: 'Head' };
for (const [m, u] of [['Left', 'l'], ['Right', 'r']]) {
  Object.assign(MIXAMO, { [m + 'Shoulder']: 'clavicle_' + u, [m + 'Arm']: 'upperarm_' + u, [m + 'ForeArm']: 'lowerarm_' + u, [m + 'Hand']: 'hand_' + u,
    [m + 'UpLeg']: 'thigh_' + u, [m + 'Leg']: 'calf_' + u, [m + 'Foot']: 'foot_' + u, [m + 'ToeBase']: 'ball_' + u, [m + 'Toe_End']: 'ball_leaf_' + u });
  for (const [f, uf] of [['Thumb', 'thumb'], ['Index', 'index'], ['Middle', 'middle'], ['Ring', 'ring'], ['Pinky', 'pinky']])
    for (let i = 1; i <= 4; i++) MIXAMO[m + 'Hand' + f + i] = uf + (i < 4 ? '_0' + i + '_' : '_04_leaf_') + u;
}
const ALIGN = [['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'], ['LeftHand', 'LeftHandMiddle1'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'], ['RightHand', 'RightHandMiddle1']];
// rigs that are not Mixamo's: their joint names (without the exporter's numeric suffixes) -> Mixamo names, so the
// rest of rebind() reads them like any Mixamo rig; '*' entries are written once per side (* = L / R -> Left / Right)
const BONEMAPS = {
  // "Overlord" by bumstrum: two spine joints (the lower is about where the UE spine_02 sits), five three-joint fingers
  overlord: { hips: 'Hips', spine: 'Spine1', chest: 'Spine2', neck: 'Neck', head: 'Head', tip: 'HeadTop_End',
    '*_shoulder': '*Shoulder', '*_arm': '*Arm', '*_elbow': '*ForeArm', '*_wrist': '*Hand', '*_leg': '*UpLeg', '*_knee': '*Leg', '*_ankle': '*Foot', '*_foot': '*ToeBase', '*_toes': '*Toe_End',
    ...Object.fromEntries([['thumb', 'Thumb'], ['point', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pink', 'Pinky']].flatMap(([a, b]) => [1, 2, 3].map((i) => ['*_' + a + i, '*Hand' + b + i]))) }
};
function renameJoints(md, map) {
  const full = {};
  for (const [k, v] of Object.entries(map)) if (k.includes('*')) for (const [s, S] of [['L', 'Left'], ['R', 'Right']]) full[k.replace('*', s)] = v.replace('*', S); else full[k] = v;
  for (const j of md.getRoot().listSkins()[0].listJoints()) { const m = full[j.getName().replace(/(_\d+)+$/, '')]; if (m) j.setName('mixamorig:' + m); }
}
// some exports keep an animated frame as the node rest pose (legs astride, arms down): put every joint back where the
// skin was bound (its inverse bind matrix), joints without one keep their offset from the parent
function toBindPose(md) {
  const root = md.getRoot(), skin = root.listSkins()[0], js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
  const W = worlds(md, locals(md, null, 0)), MW = W.get(root.listNodes().find((n) => n.getSkin() === skin));
  const BW = new Map();
  const I = new THREE.Matrix4().elements;
  js.forEach((j, i) => { const m = new THREE.Matrix4().fromArray(ibm, i * 16); if (m.elements.some((e, k) => Math.abs(e - I[k]) > 1e-6)) BW.set(j, MW.clone().multiply(m.invert())); });
  const parentOf = new Map(); for (const n of root.listNodes()) for (const c of n.listChildren()) parentOf.set(c, n);
  const NW = new Map();
  const visit = (n) => {
    const par = parentOf.get(n), pw = par ? NW.get(par) || W.get(par) : new THREE.Matrix4();
    const w = BW.get(n) || pw.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale())));
    NW.set(n, w);
    if (BW.has(n)) { const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); pw.clone().invert().multiply(w).decompose(p, q, s); n.setTranslation(p.toArray()).setRotation(q.toArray()).setScale(s.toArray()); }
    for (const c of n.listChildren()) visit(c);
  };
  for (const j of js) if (!js.includes(parentOf.get(j))) visit(j);
}
async function rebind(doc, R) {
  const root = doc.getRoot(), sc = root.getDefaultScene();
  const { W, P } = worldOf(sc);
  const ue = new Map(); sc.traverse((n) => { if (!n.getMesh()) ue.set(n.getName(), n); });
  const ueJoints = root.listSkins()[0].listJoints();
  // the body to carry
  const md = await load(R.body);
  dropLoose(md);
  if (R.bonemap) renameJoints(md, R.bonemap);
  if (R.bindPose) toBindPose(md);
  if (R.prep) await R.prep(md);
  normalise(md, { height: R.height });
  const mroot = md.getRoot(), mskin = mroot.listSkins()[0], mj = mskin.listJoints();
  const base = (n) => n.getName().replace(/^mixamorig:/, '').replace(/_\d+$/, '');
  const byBase = new Map(mj.map((j) => [base(j), j]));
  const Wm = worlds(md, locals(md, null, 0));
  const pos = (m) => new THREE.Vector3().setFromMatrixPosition(m);
  // swing the arms level
  const under = (j) => { const out = []; const v = (n) => { out.push(n); for (const c of n.listChildren()) v(c); }; v(j); return out; };
  for (const [a, b] of ALIGN) {
    const ja = byBase.get(a), jb = byBase.get(b); if (!ja || !jb) continue;
    const pa = pos(Wm.get(ja)), dm = pos(Wm.get(jb)).sub(pa).normalize();
    const ua = ue.get(MIXAMO[a]), ub = ue.get(MIXAMO[b]);
    const du = pos(W.get(ub)).sub(pos(W.get(ua))).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(dm, du);
    const M = new THREE.Matrix4().makeTranslation(pa.x, pa.y, pa.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pa.x, -pa.y, -pa.z));
    for (const n of under(ja)) Wm.set(n, M.clone().multiply(Wm.get(n)));
  }
  // where each UE bone goes: on its Mixamo joint, else carried along from its parent at the body's scale
  const toUE = new Map(); for (const j of mj) if (MIXAMO[base(j)] && ue.has(MIXAMO[base(j)])) toUE.set(MIXAMO[base(j)], j);
  const k = R.height / 1.85, Wn = new Map();
  const place = (n) => {
    const w = W.get(n), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(); w.decompose(p, q, s);
    const par = P.get(n), m = toUE.get(n.getName());
    if (m) p.copy(pos(Wm.get(m)));
    else if (par && Wn.has(par)) p.copy(pos(Wn.get(par)).add(pos(w).sub(pos(W.get(par))).multiplyScalar(k)));
    Wn.set(n, new THREE.Matrix4().compose(p, q, s));
    for (const c of n.listChildren()) if (!c.getMesh()) place(c);
  };
  for (const n of sc.listChildren()) place(n);
  // weights: each Mixamo joint goes to its UE bone, or its nearest mapped ancestor
  const parentOf = new Map(); for (const j of mj) for (const c of j.listChildren()) parentOf.set(c, j);
  const target = mj.map((j) => { let n = j; while (n && !(MIXAMO[base(n)] && ue.has(MIXAMO[base(n)]))) n = parentOf.get(n); return n ? ueJoints.indexOf(ue.get(MIXAMO[base(n)])) : ueJoints.indexOf(ue.get('pelvis')); });
  const B = mj.map((j, i) => Wm.get(j).clone().multiply(new THREE.Matrix4().fromArray(mskin.getInverseBindMatrices().getArray(), i * 16)));
  const NB = B.map((m) => new THREE.Matrix3().setFromMatrix4(m).invert().transpose());
  // the people's own meshes go, the body comes in
  const arm = [...ue.values()].find((n) => n.listChildren().some((c) => c.getMesh())) || sc.listChildren()[0];
  for (const n of root.listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.dispose(); }
  const buf = root.listBuffers()[0];
  const texOf = (t) => t && doc.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType());
  const mats = new Map();
  const matOf = (m) => {
    if (mats.has(m)) return mats.get(m);
    const n = doc.createMaterial(R.matNames ? m.getName() : R.name + '_body').setBaseColorFactor(m.getBaseColorFactor()).setEmissiveFactor(m.getEmissiveFactor())
      .setMetallicFactor(m.getMetallicFactor()).setRoughnessFactor(m.getRoughnessFactor()).setExtras({ part: 'cloth' });
    if (m.getBaseColorTexture()) n.setBaseColorTexture(texOf(m.getBaseColorTexture()));
    if (m.getEmissiveTexture()) n.setEmissiveTexture(texOf(m.getEmissiveTexture()));
    if (m.getNormalTexture()) n.setNormalTexture(texOf(m.getNormalTexture()));
    if (m.getMetallicRoughnessTexture()) n.setMetallicRoughnessTexture(texOf(m.getMetallicRoughnessTexture()));
    mats.set(m, n); return n;
  };
  const skin = doc.createSkin(R.name);
  for (const j of ueJoints) skin.addJoint(j);
  const ibm = new Float32Array(ueJoints.length * 16);
  ueJoints.forEach((j, i) => Wn.get(j).clone().invert().toArray(ibm, i * 16));
  skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf));
  const mesh = doc.createMesh(R.name);
  for (const node of mroot.listNodes()) {
    const m = node.getMesh(); if (!m || node.getSkin() !== mskin) continue;
    for (const pr of m.listPrimitives()) {
      const Pa = pr.getAttribute('POSITION'), Na = pr.getAttribute('NORMAL'), Ua = pr.getAttribute('TEXCOORD_0'), J = pr.getAttribute('JOINTS_0'), Wt = pr.getAttribute('WEIGHTS_0');
      const n = Pa.getCount(), P2 = new Float32Array(n * 3), N2 = new Float32Array(n * 3), J2 = new Uint16Array(n * 4), W2 = new Float32Array(n * 4);
      const e = [], ne = [], je = [], we = [], v = new THREE.Vector3(), nv = new THREE.Vector3(), acc = new THREE.Vector3(), nacc = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        Pa.getElement(i, e); J.getElement(i, je); Wt.getElement(i, we); if (Na) Na.getElement(i, ne);
        acc.set(0, 0, 0); nacc.set(0, 0, 0);
        const sum = new Map();
        for (let c = 0; c < 4; c++) {
          if (!we[c]) continue;
          acc.addScaledVector(v.fromArray(e).applyMatrix4(B[je[c]]), we[c]);
          if (Na) nacc.addScaledVector(nv.fromArray(ne).applyMatrix3(NB[je[c]]), we[c]);
          const t = target[je[c]]; sum.set(t, (sum.get(t) || 0) + we[c]);
        }
        acc.toArray(P2, i * 3); nacc.normalize().toArray(N2, i * 3);
        const top = [...sum].sort((a, b) => b[1] - a[1]).slice(0, 4), tot = top.reduce((a, b) => a + b[1], 0) || 1;
        top.forEach(([t, w], c) => { J2[i * 4 + c] = t; W2[i * 4 + c] = w / tot; });
      }
      // a recipe may re-weight a piece the source rig left on one bone (a tabard on the hips)
      if (R.reweight) R.reweight({ material: pr.getMaterial()?.getName(), P: P2, J: J2, W: W2, joint: (nm) => ueJoints.indexOf(ue.get(nm)), at: (nm) => pos(Wn.get(ue.get(nm))) });
      const p = doc.createPrimitive().setMaterial(matOf(pr.getMaterial()))
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P2).setBuffer(buf))
        .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J2).setBuffer(buf))
        .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(W2).setBuffer(buf));
      if (Na) p.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N2).setBuffer(buf));
      if (Ua) p.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(Ua.getArray().slice()).setNormalized(Ua.getNormalized()).setBuffer(buf));
      const idx = pr.getIndices(); if (idx) p.setIndices(doc.createAccessor().setType('SCALAR').setArray(idx.getArray().slice()).setBuffer(buf));
      mesh.addPrimitive(p);
    }
  }
  arm.addChild(doc.createNode(R.name).setMesh(mesh).setSkin(skin).setExtras({ name: R.name }));
  // UE bone locals from their new world transforms
  for (const n of Wn.keys()) {
    const par = P.get(n), pw = par ? Wn.get(par) : new THREE.Matrix4();
    const l = pw.clone().invert().multiply(Wn.get(n)), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    l.decompose(p, q, s);
    n.setTranslation(p.toArray()).setRotation(q.toArray()).setScale(s.toArray());
  }
}

// ---------- recipes ----------
// face and body skin gone the grey of cold ash
const ASH = { MI_Superhero_Male: { ash: 0.9 }, MI_Regular_Male: { ash: 0.9 } };
const RECIPES = {
  // the Ashbound: ash-grey skin, armour gone the colour of old embers
  stoneborn: { src: 'warden', dwarf: true, mats: { MI_Ranger_warden: { hsv: [180, 260, 14, 0.55, 0.62] }, ...ASH }, color: { MI_Hair_1_warden: '#2e2a28' } },
  stonebornArb: { src: 'wayfarer', dwarf: true, mats: { MI_Ranger_wayfarer: { ash: 0.55 }, ...ASH }, color: { MI_Hair_1_wayfarer: '#3a3430' } },
  runepriest: { src: 'mage', dwarf: true, mats: { MI_Ranger_mage: { hsv: [200, 300, 8, 1.1, 0.75] }, ...ASH }, color: { MI_Hair_1_mage: '#8a8682' } },
  // Brokka, smith of the third gallery
  brokka: { src: 'smith', dwarf: true, mats: { MI_Peasant_smith: { hsv: [0, 60, 28, 0.9, 0.8] } }, color: { MI_Hair_2_smith: '#9a3a12', MI_Hair_1_smith: '#9a3a12' } },
  // Durgan, the Molten King: "lava monster" by Satwik.Bandi (sketchfab.com/Satwik.Bandi), CC-BY 4.0
  moltenKing: { src: 'warden', body: '/tmp/claude-0/sf/models/lava_monster/model.glb', height: 2.1, extras: { weaponScale: 1.7 } }
};

// ---------- Act III: the Evergreen (--set=grove) ----------
// elves: the dwarves turned inside out, long in the thigh, shin and neck, slim through the body and limbs, the head a
// little smaller; about 1.9 m against the warden's 1.8
const ELF = {
  len: { thigh: 0.95, calf: 1.1, foot: 1.09, spine_01: 1.02, spine_02: 1.04, spine_03: 1.04, neck_01: 1.06, Head: 1.15, clavicle: 0.96, upperarm: 0.96, lowerarm: 1.06, hand: 1.06 },
  girth: { pelvis: 0.92, spine_01: 0.9, spine_02: 0.9, spine_03: 0.92, neck_01: 0.88, thigh: 0.9, calf: 0.9, upperarm: 0.9, lowerarm: 0.9, clavicle: 0.94 },
  size: { Head: 0.94, hand: 0.94, foot: 0.96, ball: 0.96 }
};
// a table with some joint offsets lengthened further (factors multiply the table's own)
const stretch = (T, more) => ({ ...T, len: { ...T.len, ...Object.fromEntries(Object.entries(more).map(([k, f]) => [k, (T.len[k] ?? 1) * f])) } });

// soft hue/saturation/value regrade: each rule claims the pixels inside its bands (feathered edges) that no earlier rule
// claimed and moves them: hue to `to` (keeping `spread` of their spread about the band's middle), saturation x sat (+ add),
// value x bri. Unlike recolor() it can split one hue by brightness, and colour greys (s: [0, 0.15], add > 0).
const band = (x, [a, b], f) => { const st = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }; return st(a - f, a + f, x) * (1 - st(b - f, b + f, x)); };
// a band on a 0..1 quantity, open at 0 and at 1
const unit = (x, [a, b], f) => band(x, [a <= 0 ? -1 : a, b >= 1 ? 2 : b], f);
async function grade(img, rules) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const hsv2rgb = (h, s, v) => { const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [r + m, g + m, b + m]; };
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = d < 1e-4 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    const s = mx > 0 ? d / mx : 0;
    let left = 1; const acc = [0, 0, 0];
    for (const R of rules) {
      const hb = R.h ? Math.max(band(h, R.h, 8), band(h + 360, R.h, 8), band(h - 360, R.h, 8)) : 1;
      const w = left * hb * unit(s, R.s || [0.12, 1], 0.04) * (R.v ? unit(mx, R.v, 0.04) : 1);
      if (w < 1e-3) continue;
      const mid = R.h ? (R.h[0] + R.h[1]) / 2 : h;
      const nh = R.to === undefined ? h : (R.to + (h - mid) * (R.spread ?? 0.4) + 720) % 360;
      const c = hsv2rgb(nh, Math.min(1, Math.max(0, s * (R.sat ?? 1) + (R.add ?? 0))), Math.min(1, mx * (R.bri ?? 1)));
      for (let k = 0; k < 3; k++) acc[k] += c[k] * w;
      left -= w;
    }
    data[i] = Math.round((acc[0] + r * left) * 255); data[i + 1] = Math.round((acc[1] + g * left) * 255); data[i + 2] = Math.round((acc[2] + b * left) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
// bark grain: the high-passed luminance of Poly Haven's "Bark Brown 02" (Rob Tuytel, CC0) tiled twice across a map;
// multiplied in, it cracks skin and cloth like old bark; `cracks` also returns an emissive map lit in the deepest grooves
const BARK = '/tmp/claude-0/ph/tex/bark_brown_02/bark_brown_02_diff_1k.jpg';
const grains = new Map();
async function grainOf(w, h) {
  const key = w + 'x' + h; if (grains.has(key)) return grains.get(key);
  const tw = Math.round(w / 2), th = Math.round(h / 2);
  const g = await sharp(BARK).resize(tw, th).greyscale().blur(0.6).raw().toBuffer(), lo = await sharp(BARK).resize(tw, th).greyscale().blur(tw / 24).raw().toBuffer();
  let sd = 0; for (let i = 0; i < g.length; i++) sd += (g[i] - lo[i]) ** 2; sd = Math.sqrt(sd / g.length);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = (y % th) * tw + (x % tw); out[y * w + x] = (g[j] - lo[j]) / sd; }
  grains.set(key, out); return out;
}
async function barkify(img, amt, cracks = 0, lo = 1.3) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const G = await grainOf(info.width, info.height), em = cracks ? Buffer.alloc(data.length) : null;
  for (let p = 0; p < G.length; p++) {
    const f = Math.max(0.15, 1 + amt * 0.32 * G[p]);
    for (let c = 0; c < 3; c++) data[p * 3 + c] = Math.min(255, Math.round(data[p * 3 + c] * f));
    if (em) { const k = Math.min(1, Math.max(0, (-G[p] - lo) / 1.2)) * cracks; em[p * 3] = Math.round(255 * k); em[p * 3 + 1] = Math.round(150 * k); em[p * 3 + 2] = Math.round(40 * k); }
  }
  const png = (b) => sharp(b, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
  // the glow is soft and low in detail: half size is plenty
  return { img: await png(data), emit: em && await sharp(await png(em)).resize(info.width >> 1, info.height >> 1).blur(0.8).png().toBuffer() };
}
// ash flecks: the bark grain's highest ridges (read across the map at another scale, so they do not follow the cracks)
// lightened toward pale ash, a mottle of grey on soot
async function flecks(img, k) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, G = await grainOf(Math.round(W * 1.37), Math.round(H * 1.37)), GW = Math.round(W * 1.37);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, f = Math.min(1, Math.max(0, (G[(y + 7) * GW + x + 11] - 1.5) / 0.9)) * k;
    for (let c = 0; c < 3; c++) data[p * 3 + c] = Math.round(data[p * 3 + c] * (1 - f) + [150, 146, 140][c] * f);
  }
  return sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}
// eyes: the brown iris (a disc in the middle of the map) goes amber; with `glow` an emissive mask lights the iris and,
// at `white`, the sclera, so the eyes burn amber in the dark
// (`col` swaps the amber for another light: the cold eyes of the dead Wayfarers)
async function amberEyes(img, { tint = 1, glow = 0, white = 0, fill = 0, col = [1, 0.62, 0.16] } = {}) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, cx = W * 0.496, cy = H * 0.497, rad = W * 0.11, em = Buffer.alloc(data.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), s = mx > 0 ? (mx - Math.min(r, g, b)) / mx : 0;
    const iris = band(Math.hypot(x - cx, y - cy) / rad, [-1, 1], 0.12), sclera = (1 - iris) * unit(s, [0, 0.2], 0.05) * unit(mx, [0.66, 1], 0.06);
    // amber of the same darkness, brighter towards the rim of the iris (darker when it glows: the light is its own);
    // `fill` floods the white of the eye with amber too
    const v = glow ? Math.min(1, mx * 1.3 + 0.06) : Math.min(1, mx * 2.2 + 0.12), am = [v * col[0], v * col[1], v * col[2]], k = Math.max(iris * tint, sclera * fill * 0.8);
    data[i] = Math.round((r * (1 - k) + am[0] * k) * 255); data[i + 1] = Math.round((g * (1 - k) + am[1] * k) * 255); data[i + 2] = Math.round((b * (1 - k) + am[2] * k) * 255);
    const e = Math.min(1, iris * glow + sclera * white) * 255; em[i] = em[i + 1] = em[i + 2] = Math.round(e);
  }
  const png = (b) => sharp(b, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  return { img: await png(data), emit: glow ? await png(em) : null };
}
// a limb gone to bark: the triangles skinned to the forearm and hand of one side leave their material for a bark one,
// with new UVs wrapped round the forearm so the grain runs along it (Elati's left arm, "bark to the elbow")
function barkLimb(doc, sideTag, tex) {
  const root = doc.getRoot(), sc = root.getDefaultScene(), buf = root.listBuffers()[0];
  const { W } = worldOf(sc);
  const re = new RegExp(`^(lowerarm|hand|(index|middle|ring|pinky|thumb)_\\d\\d)_${sideTag}$`);
  const pos = (n) => new THREE.Vector3().setFromMatrixPosition(W.get(n));
  const bone = (nm) => root.listNodes().find((n) => n.getName() === nm);
  const a0 = pos(bone('lowerarm_' + sideTag)), axis = pos(bone('hand_' + sideTag)).sub(a0).normalize();
  const e1 = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(axis, e1);
  const mat = doc.createMaterial('bark_arm').setBaseColorTexture(tex).setRoughnessFactor(0.92).setMetallicFactor(0).setExtras({ part: 'cloth' });
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(), skin = node.getSkin(); if (!mesh || !skin) continue;
    const inSet = skin.listJoints().map((j) => re.test(j.getName()));
    for (const prim of [...mesh.listPrimitives()]) {
      const J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices(); if (!J || !idx) continue;
      const je = [], we = [], on = new Uint8Array(J.getCount());
      for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); Wt.getElement(i, we); let w = 0; for (let k = 0; k < 4; k++) if (inSet[je[k]]) w += we[k]; on[i] = w >= 0.5; }
      const ia = idx.getArray(), keep = [], take = [];
      for (let t = 0; t < ia.length; t += 3) (on[ia[t]] && on[ia[t + 1]] && on[ia[t + 2]] ? take : keep).push(ia[t], ia[t + 1], ia[t + 2]);
      if (!take.length) continue;
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep)).setBuffer(buf));
      // the bark copy: unindexed, so the wrapped UVs can close round the arm without a seam smear
      const np = doc.createPrimitive().setMaterial(mat), n = take.length, uv = new Float32Array(n * 2), P = prim.getAttribute('POSITION'), e = [], v = new THREE.Vector3();
      for (const sem of prim.listSemantics()) {
        if (sem === 'TEXCOORD_0' || sem === 'TANGENT' || /^TEXCOORD_[1-9]/.test(sem)) continue;
        const src = prim.getAttribute(sem), k = src.getElementSize(), sa = src.getArray(), da = new sa.constructor(n * k);
        take.forEach((vi, c) => { for (let q = 0; q < k; q++) da[c * k + q] = sa[vi * k + q]; });
        np.setAttribute(sem, doc.createAccessor().setType(src.getType()).setArray(da).setNormalized(src.getNormalized()).setBuffer(buf));
      }
      for (let c = 0; c < n; c += 3) {
        const us = [];
        for (let q = 0; q < 3; q++) { P.getElement(take[c + q], e); v.fromArray(e).sub(a0); us.push([Math.atan2(v.dot(e2), v.dot(e1)) / (2 * Math.PI) + 0.5, v.dot(axis) / 0.3]); }
        const umax = Math.max(...us.map((u) => u[0]));
        us.forEach(([u, w], q) => { uv[(c + q) * 2] = umax - u > 0.5 ? u + 1 : u; uv[(c + q) * 2 + 1] = w; });
      }
      np.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(uv).setBuffer(buf));
      mesh.addPrimitive(np);
    }
  }
}

// outfit pieces taken off (by node name), and another character's hair put on in their place: all the women of
// people.glb share one skeleton and one head (Superhero_Female), so a hair mesh moves across with its own inverse bind
// matrices on this rig's joints of the same names, and takes the eyebrows' hair material (the same T_Hair_2 map)
async function restyle(doc, { drop = [], hair }) {
  const root = doc.getRoot(), buf = root.listBuffers()[0];
  for (const n of root.listNodes()) if (drop.includes(n.getName())) { n.getMesh()?.dispose(); n.dispose(); }
  if (!hair) return;
  const [srcScene, nodeName, matName] = hair;
  const src = await isolate(srcScene), from = src.getRoot().listNodes().find((n) => n.getName() === nodeName);
  const joints = new Map(); for (const sk of root.listSkins()) for (const j of sk.listJoints()) joints.set(j.getName(), j);
  const copy = (a) => doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()).setBuffer(buf);
  // a hair from the other skeleton's family of maps (a woman given villager2's short T_Hair_1 cut) brings its material along
  const texOf = (t) => t && doc.createTexture(t.getName()).setImage(t.getImage().slice()).setMimeType(t.getMimeType());
  const own = (m) => doc.createMaterial(matName).setBaseColorFactor(m.getBaseColorFactor()).setRoughnessFactor(m.getRoughnessFactor()).setMetallicFactor(m.getMetallicFactor())
    .setDoubleSided(m.getDoubleSided()).setExtras(m.getExtras()).setBaseColorTexture(texOf(m.getBaseColorTexture())).setNormalTexture(texOf(m.getNormalTexture()));
  const mat = root.listMaterials().find((m) => m.getName() === matName) || own(from.getMesh().listPrimitives()[0].getMaterial());
  const sk0 = from.getSkin(), skin = doc.createSkin(nodeName).setInverseBindMatrices(copy(sk0.getInverseBindMatrices()));
  for (const j of sk0.listJoints()) skin.addJoint(joints.get(j.getName()));
  const mesh = doc.createMesh(nodeName);
  for (const p0 of from.getMesh().listPrimitives()) {
    const p = doc.createPrimitive().setMaterial(mat).setIndices(copy(p0.getIndices()));
    for (const sem of p0.listSemantics()) p.setAttribute(sem, copy(p0.getAttribute(sem)));
    mesh.addPrimitive(p);
  }
  const node = doc.createNode(nodeName).setMesh(mesh).setSkin(skin).setTranslation(from.getTranslation()).setRotation(from.getRotation()).setScale(from.getScale());
  const sib = root.listNodes().find((n) => n.getMesh()?.listPrimitives().some((q) => q.getMaterial() === mat)) || root.listNodes().find((n) => n.getName() === 'Eyebrows');
  (sib?.getParentNode() || root.getDefaultScene()).addChild(node);
}
// some pieces of an outfit given a material of their own (a copy of `from`), so a recipe can colour them apart
function split(doc, parts) {
  const root = doc.getRoot();
  for (const [name, { from, nodes }] of Object.entries(parts)) {
    const m0 = root.listMaterials().find((m) => m.getName() === from), m = m0.clone().setName(name);
    for (const n of root.listNodes()) if (nodes.includes(n.getName())) for (const p of n.getMesh()?.listPrimitives() || []) if (p.getMaterial() === m0) p.setMaterial(m);
  }
}

// lowest and highest point of the rest pose (after morph() the skins hold world-space rest positions)
function span(doc) {
  let lo = Infinity, hi = -Infinity; const e = [];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); lo = Math.min(lo, e[1]); hi = Math.max(hi, e[1]); } }
  return [lo, hi];
}
// the heaviest pieces (boots, bracers, gloves: thousands of vertices of straps and buckles) thinned for a crowd of them
function lighten(doc, most = 3200, floor = 0.4) {
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const n = p.getAttribute('POSITION').getCount();
    if (n > most) simplifyPrim(p, Math.max(floor, most / n), 0.01);
  }
}

// palettes: bark brown, moss and gold (the Rootsworn); hue bands of the outfit maps (people.glb): Ranger leather 0-60,
// Ranger cloth 60-180, warden cloth 180-260, Peasant (healer) dress 100-200 split dark/light at v 0.52
const SKIN_F = ['MI_Superhero_Female', 'MI_Regular_Female'], SKIN_M = ['MI_Superhero_Male', 'MI_Regular_Male'];
const each = (names, op) => Object.fromEntries(names.map((n) => [n, op]));
const BARK_TINT = [0.55, 0.45, 0.35], DARK_BARK = [0.3, 0.24, 0.18];
const AMBER_EYES = { eyes: { tint: 1, glow: 1, white: 0.45, fill: 0.6 } };
const GOLD = [{ s: [0, 0.14], v: [0.3, 1], to: 40, add: 0.42, bri: 0.95 }];
const ROOT_RANGER = [...GOLD, { h: [60, 180], to: 100, sat: 0.6, bri: 1.0 }, { h: [-20, 60], to: 26, sat: 0.62, bri: 0.6 }];
const ROOT_WARDEN = [...GOLD, { h: [170, 270], to: 100, sat: 0.85, bri: 1.55 }, { h: [-20, 60], to: 26, sat: 0.62, bri: 0.6 }];
// Elati: the ranger's greens go silver (light panels) and slate (sleeves, leggings), its browns a grey leather, all a
// little cool so they stay silver under the Evergreen's amber light; the sash takes the green
const ELATI_GREY = [{ h: [60, 180], v: [0.4, 1], to: 205, sat: 0.16, bri: 1.3 }, { h: [60, 180], v: [0, 0.4], to: 210, sat: 0.16, bri: 1.15 }, { h: [-20, 60], to: 215, sat: 0.12, bri: 0.7 }];
const ELATI_SASH = [{ h: [-20, 180], to: 112, spread: 0.15, sat: 0.75, bri: 0.85 }];
const ROOTSWORN_SKIN = each([...SKIN_M, ...SKIN_F], { ash: 0.35, tint: BARK_TINT });
const GROVE = {
  // Elati, the scout who would not kneel: bare-headed (the ranger's hood off, the healer's hair on, gone silver), grey-silver
  // cloth and leathers with a moss-green sash for the only green, amber-flecked eyes, a bark forearm
  elati: { src: 'ranger', elf: true, barkArm: 'l', drop: ['Female_Ranger_Head_Hood'], hair: ['healer', 'Hair_Long', 'MI_Hair_2_ranger'],
    split: { MI_Ranger_sash: { from: 'MI_Ranger', nodes: ['Female_Ranger_Body_Belt_1', 'Female_Ranger_Body_Belt_2'] } },
    mats: { MI_Ranger: { grade: ELATI_GREY }, MI_Ranger_sash: { grade: ELATI_SASH }, ...each(SKIN_F, { ash: 0.12, tint: [0.62, 0.62, 0.6] }), MI_Eyes: { eyes: { tint: 0.5 } } }, color: { MI_Hair_2_ranger: '#d8dcd0' } },
  // Old Linden, half rooted into her tree: bark skin, a moss and bark-brown dress, lichen hair
  linden: { src: 'healer', elf: true, mats: { MI_Peasant_healer: { grade: [{ h: [100, 200], v: [0, 0.52], to: 95, sat: 0.55, bri: 0.78 }, { h: [100, 200], v: [0.52, 1], to: 28, sat: 1.3, bri: 0.55 }], bark: 0.35 }, MI_Superhero_Female: { ash: 0.85, tint: BARK_TINT, bark: 1 } }, color: { MI_Hair_2_healer: '#a2ae94' } },
  // the Rootsworn, guards of the Lady's song: bark and moss with gold trim, light bark skin, amber burning in the eyes
  rootsworn: { src: 'warden', elf: true, mats: { MI_Ranger_warden: { grade: ROOT_WARDEN }, ...ROOTSWORN_SKIN, MI_Eyes: AMBER_EYES }, color: { MI_Hair_1_warden: '#cdb88a' } },
  rootswornArcher: { src: 'ranger', elf: true, mats: { MI_Ranger: { grade: ROOT_RANGER }, ...ROOTSWORN_SKIN, MI_Eyes: AMBER_EYES }, color: { MI_Hair_2_ranger: '#cdb88a' } },
  // the Hollowed: Evergreen rooted alone, gone wholly to dark bark, a husk walking on amber eyes
  hollowed: { src: 'wayfarer', elf: true, mats: { MI_Ranger_wayfarer: { ash: 0.9, tint: DARK_BARK, bark: 0.8 }, MI_Superhero_Male: { ash: 0.95, tint: DARK_BARK, bark: 1.1, cracks: 0.55 }, MI_Regular_Male: { ash: 0.95, tint: DARK_BARK }, MI_Eyes: { eyes: { tint: 1, glow: 1, white: 0.7, fill: 1 } } }, color: { MI_Hair_1_wayfarer: '#16130f' } },
  // the Keening Mourners: mourning black with a silver hem, grey-silver skin, loose grey hair
  mourner: { src: 'healer', elf: true, mats: { MI_Peasant_healer: { grade: [{ h: [100, 200], v: [0, 0.52], sat: 0.12, bri: 0.34 }, { h: [100, 200], v: [0.52, 1], to: 215, sat: 0.12, bri: 0.55 }] }, MI_Superhero_Female: { ash: 0.72, tint: [0.6, 0.61, 0.64] } }, color: { MI_Hair_2_healer: '#8a8c90' } },
  // Amaranthe the Unfading, Lady of the Evergreen: amber-gold dress, silver-bark skin with amber in its cracks, pale gold
  // hair; taller still (legs and neck x1.06), and the game scales her up and arms her with a spear
  amaranthe: { src: 'healer', elf: { calf: 1.06, foot: 1.06, neck_01: 1.06, Head: 1.06 }, mats: { MI_Peasant_healer: { grade: [{ h: [100, 200], v: [0, 0.24], to: 30, sat: 1.5, bri: 1.25 }, { h: [100, 200], v: [0.24, 0.52], to: 38, sat: 1.7, bri: 1.6 }, { h: [100, 200], v: [0.52, 1], to: 44, sat: 2.2, bri: 1.12 }] }, MI_Superhero_Female: { ash: 0.7, tint: [0.85, 0.82, 0.72], bark: 0.55, cracks: 0.6 }, MI_Eyes: { eyes: { tint: 1, glow: 0.8, white: 0.25, fill: 0.4 } } }, color: { MI_Hair_2_healer: '#e8d8a8' }, extras: { weaponScale: 1.5 } }
};
const GROVE_CREDIT = { credit: 'Quaternius characters (people.glb); bark grain: "Bark Brown 02" by Rob Tuytel, polyhaven.com/a/bark_brown_02', license: 'CC0' };
for (const R of Object.values(GROVE)) R.extras = { ...GROVE_CREDIT, ...R.extras };

// ---------- Act IV: the Field of Ash and the Ashen Forge (--set=ash) ----------
// proportion tables (morph(): `len` scales a joint's offset from its parent, so `calf` is the thigh bone's length,
// `foot` the shin's, `Head` the neck's and `thigh` the width of the hips; `girth` scales flesh across a bone)
const every = (names, f) => Object.fromEntries(names.map((n) => [n, f]));
const TRUNK = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'thigh', 'calf', 'upperarm', 'lowerarm', 'clavicle'];
// the Lampless: Isarn's body wasted to the bone, long in the thigh, shin, forearm and neck
const GAUNT = { len: { thigh: 0.96, calf: 1.08, foot: 1.08, lowerarm: 1.06, hand: 1.06, Head: 1.06 }, girth: { ...every(TRUNK, 0.82), pelvis: 0.86, clavicle: 0.9 }, size: { Head: 0.95, hand: 0.98 } };
// old men (Ivar, old Arna): a longer, thinner neck, big hands, the flesh gone a little
const ELDER = { len: { Head: 1.08, hand: 1.04, upperarm: 0.97 }, girth: { ...every(TRUNK, 0.9), neck_01: 0.84, clavicle: 0.94 }, size: { hand: 1.08 } };
// young Arna: a little short in the leg, slim, the head a touch large
const YOUTH = { len: { calf: 0.97, foot: 0.97 }, girth: every(TRUNK, 0.92), size: { Head: 1.04 } };
// a boy of ten, before shrink() takes the whole body to 0.74 (1.34 m): a big head on a short neck, short legs, thin
const CHILD = { len: { calf: 0.92, foot: 0.92, spine_01: 0.96, spine_02: 0.96, Head: 0.88, lowerarm: 0.96, hand: 0.96 }, girth: { ...every(TRUNK, 0.86), neck_01: 0.84 }, size: { Head: 1.22, hand: 1.04 } };
// Karthax's smiths: heavy shoulders and forearms, a barrel chest (the hunch is the game's: an additive spine turn)
const SMITH = { len: { upperarm: 1.06 }, girth: { clavicle: 1.2, upperarm: 1.25, lowerarm: 1.25, spine_02: 1.08, spine_03: 1.15, neck_01: 1.15 }, size: { hand: 1.15 } };
// no change of shape (morph() still bakes the rest pose into the skin, so every recipe is measured and lightened alike)
const SAME = { len: {}, girth: {}, size: {} };
// the Ice Singers: drowned women gone to a crone's frame, wasted thin and a little short, the neck drawn long, the
// forearms, palms and fingers long (a hand that reaches)
const FINGERS = (f) => Object.fromEntries(['index', 'middle', 'ring', 'pinky', 'thumb'].flatMap((n) => ['_01', '_02', '_03'].map((k) => [n + k, f])));
const CRONE = { len: { calf: 0.95, foot: 0.95, spine_01: 0.95, spine_02: 0.95, spine_03: 0.95, upperarm: 0.97, neck_01: 1.08, Head: 1.06, hand: 1.06, ...FINGERS(1.1) }, girth: { ...every(TRUNK, 0.75), pelvis: 0.8, clavicle: 0.86 }, size: { hand: 1.1, Head: 0.96 } };
// a Saltborn keeper of forty-five (Alkyone): sturdier through the body and arms from the oars and the nets, the neck a
// touch short, the face longer and leaner (`axes`: across, up, forward) than the healer's she shares with Elianthe
const WEATHER = { len: { neck_01: 0.98 }, girth: every(TRUNK, 1.04), size: { hand: 1.04 }, axes: { Head: [0.94, 1.03, 0.97] } };

// the whole body to f of its size, about the ground under it (after morph(): the skins hold world-space rest positions)
function shrink(doc, f) {
  const root = doc.getRoot(), sc = root.getDefaultScene(), buf = root.listBuffers()[0];
  const joints = new Set(); for (const sk of root.listSkins()) for (const j of sk.listJoints()) joints.add(j);
  for (const j of joints) j.setTranslation(j.getTranslation().map((v) => v * f));
  const { W } = worldOf(sc);
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(), skin = node.getSkin(); if (!mesh || !skin) continue;
    for (const prim of mesh.listPrimitives()) { const a = prim.getAttribute('POSITION'); prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(a.getArray().map((v) => v * f)).setBuffer(buf)); }
    const js = skin.listJoints(), arr = new Float32Array(js.length * 16);
    js.forEach((j, i) => W.get(j).clone().invert().toArray(arr, i * 16));
    skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(arr).setBuffer(buf));
  }
}

// ash dust over a regraded map: everything drawn toward a pale ash of the tint, the darks most (a dead man's dark
// coat reads grey, not black)
async function dust(img, k, tint = [0.62, 0.6, 0.6]) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - k) + 255 * 0.8 * tint[c] * k);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
// a metal/rough map made duller: hide, cloth and fur at least `hide` rough, metal at least `metal`
async function roughen(img, [hide, metal]) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) { const m = data[i + 2] / 255; data[i + 1] = Math.round(Math.max(data[i + 1], 255 * (hide * (1 - m) + metal * m))); }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
// a mark burned into a material's map where the body's surface passes through it: every texel of the material's
// triangles is put back on the body (rest pose, metres) and `fn(p, n)` answers [glow, scorch] in 0..1; the base colour
// darkens by the scorch, the glow comes back as an ember map (added to `emit`, if the map already glows)
const EMBER = [255, 112, 26];
async function burn(doc, mat, img, emit, fn, S = 512, on = null) {
  const E = new Float32Array(S * S), D = new Float32Array(S * S), cov = new Uint8Array(S * S);
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3(), na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const e = [];
  for (const node of doc.getRoot().listNodes()) for (const prim of node.getMesh()?.listPrimitives() || []) {
    if (prim.getMaterial() !== mat) continue;
    const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), U = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray();
    // `on`: only where the skin hangs mostly on these joints (the chest, not a beard or a strap that crosses it)
    const share = new Float32Array(P.getCount()).fill(1);
    if (on) { const js = node.getSkin().listJoints().map((j) => on.test(j.getName())), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), je = [], we = []; for (let i = 0; i < share.length; i++) { J.getElement(i, je); Wt.getElement(i, we); share[i] = we.reduce((a, w, k) => a + (js[je[k]] ? w : 0), 0); } }
    for (let t = 0; t < idx.length; t += 3) {
      const ia = idx[t], ib = idx[t + 1], ic = idx[t + 2];
      if (share[ia] + share[ib] + share[ic] < 1.5) continue;
      const ua = U.getElement(ia, []), ub = U.getElement(ib, []), uc = U.getElement(ic, []);
      const ax = ua[0] * S - 0.5, ay = ua[1] * S - 0.5, bx = ub[0] * S - 0.5, by = ub[1] * S - 0.5, cx = uc[0] * S - 0.5, cy = uc[1] * S - 0.5;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-9) continue;
      pa.fromArray(P.getElement(ia, e)); pb.fromArray(P.getElement(ib, e)); pc.fromArray(P.getElement(ic, e));
      na.fromArray(N.getElement(ia, e)); nb.fromArray(N.getElement(ib, e)); nc.fromArray(N.getElement(ic, e));
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, w2 = 1 - w0 - w1;
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
        p.copy(pa).multiplyScalar(w0).addScaledVector(pb, w1).addScaledVector(pc, w2);
        n.copy(na).multiplyScalar(w0).addScaledVector(nb, w1).addScaledVector(nc, w2).normalize();
        const [g, s] = fn(p, n), k = y * S + x;
        E[k] = Math.max(E[k], g); D[k] = Math.max(D[k], s); cov[k] = 1;
      }
    }
  }
  // grow the marks two texels past the islands' edges, so filtering does not bleed the unmarked gutter in
  for (let pass = 0; pass < 2; pass++) {
    const c2 = cov.slice();
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = y * S + x; if (cov[k]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= S || yy >= S || !cov[yy * S + xx]) continue; const q = yy * S + xx; E[k] = Math.max(E[k], E[q]); D[k] = Math.max(D[k], D[q]); c2[k] = 1; }
    }
    cov.set(c2);
  }
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const d = D[Math.min(S - 1, Math.floor((y * S) / info.height)) * S + Math.min(S - 1, Math.floor((x * S) / info.width))], i = (y * info.width + x) * 3;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - d));
  }
  const em = Buffer.alloc(S * S * 3);
  const prev = emit ? await sharp(emit).removeAlpha().resize(S, S).raw().toBuffer() : null;
  for (let k = 0; k < S * S; k++) for (let c = 0; c < 3; c++) em[k * 3 + c] = Math.max(prev ? prev[k * 3 + c] : 0, Math.round(EMBER[c] * Math.min(1, E[k])));
  const png = (b, w, h) => sharp(b, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  return { img: await png(data, info.width, info.height), emit: await png(em, S, S) };
}
// the forge-brand: Karthax's crowned ring, burned into the left breast as a beast is branded (r: ring radius, metres)
const sdSeg = (x, y, ax, ay, bx, by) => { const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay, h = Math.min(1, Math.max(0, (px * dx + py * dy) / (dx * dx + dy * dy))); return Math.hypot(px - dx * h, py - dy * h); };
function brandMark(doc, r = 0.075) {
  const { W } = worldOf(doc.getRoot().getDefaultScene()), at = (nm) => new THREE.Vector3().setFromMatrixPosition(W.get(doc.getRoot().listNodes().find((n) => n.getName() === nm)));
  const c = at('spine_03').lerp(at('neck_01'), 0.3); c.x += 0.15;
  return (p, n) => {
    if (n.z < 0.3 || p.z < c.z - 0.02) return [0, 0];
    const x = (p.x - c.x) / r, y = (p.y - c.y) / r;
    const d = Math.min(Math.abs(Math.hypot(x, y) - 1), sdSeg(x, y, -0.48, 0.88, -0.62, 1.55), sdSeg(x, y, 0, 1, 0, 1.78), sdSeg(x, y, 0.48, 0.88, 0.62, 1.55), sdSeg(x, y, 0, -0.55, 0, 0.45));
    const g = 1 - smooth((d - 0.1) / 0.12), halo = 1 - smooth((Math.hypot(x, y * 0.85) - 1.3) / 0.9);
    return [g, Math.max(g * 0.85, halo * 0.45)];
  };
}

// Karthax: "Overlord" is a spec/gloss model whose bronze lives in the specular map (the diffuse is black under the
// plate): the plate becomes black iron read from the specular's light and dark, its engraved grooves glow as ember
// seams, the dark red undersuit and tabard go to soot, and the material becomes metal/rough
async function blackIron(md) {
  const SG = 'KHR_materials_pbrSpecularGlossiness';
  for (const m of md.getRoot().listMaterials()) {
    const sg = m.getExtension(SG); if (!sg) continue;
    const { data: d, info } = await sharp(Buffer.from(sg.getDiffuseTexture().getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, N = w * h;
    const { data: s } = await sharp(Buffer.from(sg.getSpecularGlossinessTexture().getImage())).resize(w, h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const L = Buffer.alloc(N); for (let i = 0; i < N; i++) L[i] = Math.round(0.3 * s[i * 4] + 0.55 * s[i * 4 + 1] + 0.15 * s[i * 4 + 2]);
    const blur = (sig) => sharp(L, { raw: { width: w, height: h, channels: 1 } }).blur(sig).extractChannel(0).raw().toBuffer();
    const [L2, L6] = [await blur(1.6 * w / 1024), await blur(6 * w / 1024)];
    const base = Buffer.alloc(N * 3), mr = Buffer.alloc(N * 3), em = Buffer.alloc(N * 3);
    for (let i = 0; i < N; i++) {
      const ls = L[i] / 255, plate = smooth((L6[i] / 255 - 0.16) / 0.16), groove = smooth(((L2[i] - L[i]) / 255 - 0.055) / 0.09) * plate * 0.8;
      const iron = 0.07 + 0.3 * ls, dl = (0.3 * d[i * 3] + 0.55 * d[i * 3 + 1] + 0.15 * d[i * 3 + 2]) / 255, soot = dl * 0.7 + 0.02;
      const rgb = [iron * plate + soot * 1.12 * (1 - plate), iron * 0.97 * plate + soot * 0.86 * (1 - plate), iron * 0.93 * plate + soot * 0.78 * (1 - plate)];
      for (let c = 0; c < 3; c++) { base[i * 3 + c] = Math.round(255 * Math.min(1, rgb[c])); em[i * 3 + c] = Math.round(EMBER[c] * groove); }
      const gloss = s[i * 4 + 3] / 255;
      mr[i * 3] = 255; mr[i * 3 + 1] = Math.round(255 * (plate * (0.85 - 0.45 * gloss) + (1 - plate) * 0.9)); mr[i * 3 + 2] = Math.round(255 * plate * 0.8);
    }
    const tex = async (b, nm) => md.createTexture(m.getName() + nm).setImage(new Uint8Array(await sharp(b, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer())).setMimeType('image/png');
    m.setBaseColorTexture(await tex(base, '_iron')).setMetallicRoughnessTexture(await tex(mr, '_mr')).setEmissiveTexture(await tex(em, '_seams'))
      .setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(1).setRoughnessFactor(1).setEmissiveFactor([1, 1, 1]);
    m.setExtension(SG, null);
  }
}
// the Overlord's tabard is skinned to the hips alone: its lower half follows the thighs (each side its own, the middle
// both), so a stride swings it instead of passing through it
function tabard({ material, P, J, W, joint, at }) {
  if (material !== 'cloth') return;
  const pel = joint('pelvis'), tl = joint('thigh_l'), tr = joint('thigh_r'), top = at('thigh_l').y, knee = at('calf_l').y, half = at('thigh_l').x;
  for (let i = 0; i < P.length / 3; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], h = 0.85 * smooth((top - 0.04 - y) / (top - knee)), s = smooth(0.5 + x / (2.4 * half));
    J.set([pel, tl, tr, 0], i * 4); W.set([1 - h, h * s, h * (1 - s), 0], i * 4);
  }
}

const COLD = [0.62, 0.66, 0.72], SILVER = [0.7, 0.7, 0.74], IRON = [0.6, 0.6, 0.62], BRONZE = [0.74, 0.6, 0.42], MOSS = [0.56, 0.6, 0.48], SCORCH = [0.5, 0.4, 0.32];
const DEAD_FACE = [0.34, 0.36, 0.4], ASH_SKIN = [0.56, 0.55, 0.54], SOOT_SKIN = [0.24, 0.23, 0.22];
const COLD_EYES = (glow) => ({ eyes: { tint: 1, glow, white: 0.35 * glow, fill: 0.7, col: [0.78, 0.88, 1], emit: [0.5, 0.66, 0.95] } });
// the dead of the war: ash skin and outfit, embers in the cracks and in the eyes
const fallen = (outfit, tint, skins) => ({ [outfit]: { ash: 0.85, tint, dust: 0.22, bark: 0.3, cracks: 0.45 }, ...each(skins, { ash: 0.9, tint: ASH_SKIN, bark: 0.5, cracks: 0.9 }), MI_Eyes: AMBER_EYES });
// hood down: the warden's parted hair on a Wayfarer, in the Wayfarer's hair material (both men share one skeleton)
const BARE = { drop: ['Male_Ranger_Head_Hood', 'Hair_Beard'], hair: ['warden', 'Hair_SimpleParted', 'MI_Hair_1_wayfarer'] };
// soot: the bull's hide, fur, horns and straps all go to soot-black, the hide keeping a warm undertone
const SOOT = [{ h: [-30, 60], to: 18, sat: 0.4, bri: 0.36 }, { s: [0, 0.12], v: [0.45, 1], bri: 0.5 }, { s: [0, 1], bri: 0.4 }];
const ASHSET = {
  // the Lampless: dead Wayfarers on the watch, hooded, cold blue-grey and pale, the face gone dark under the hood
  lampless: { src: 'wayfarer', table: GAUNT, mats: { MI_Ranger_wayfarer: { ash: 0.9, tint: COLD }, ...each(SKIN_M, { ash: 0.95, tint: DEAD_FACE }), MI_Eyes: COLD_EYES(0.45) }, color: { MI_Hair_1_wayfarer: '#3a3e46' } },
  // the Ash-Fallen: Men (iron-grey), the Stoneborn (bronze), the Evergreen bowmen (bark-green)
  ashSpear: { src: 'warden', table: SAME, mats: fallen('MI_Ranger_warden', IRON, SKIN_M), color: { MI_Hair_1_warden: '#3a3836' } },
  ashDwarf: { src: 'warden', table: DWARF, mats: fallen('MI_Ranger_warden', BRONZE, SKIN_M), color: { MI_Hair_1_warden: '#3e3630' } },
  ashBow: { src: 'ranger', table: ELF, mats: fallen('MI_Ranger', MOSS, SKIN_F), color: { MI_Hair_2_ranger: '#3a3a34' } },
  // an Ashsmith: the peasant villager, heavy-armed and burnt: soot grey-black skin flecked with ash, embers in the cracks
  // of the face, the neck and the bare forearms, the beard gone ash-grey (the game hides the face under a one-eyed iron mask)
  ashsmith: { src: 'villager1', table: SMITH, mats: { MI_Peasant_smith: { ash: 0.7, tint: SCORCH, bark: 0.25 }, ...each(SKIN_M, { ash: 0.9, tint: SOOT_SKIN, bark: 0.55, flecks: 0.55, cracks: 1, crackLo: 0.45 }) }, color: { MI_Hair_1_villager1: '#605c58' } },
  // Ivar, captain of the Lampless: Isarn's body grown old, silver-ash, white beard, cold light in the eyes
  ivar: { src: 'wayfarer', table: ELDER, mats: { MI_Ranger_wayfarer: { ash: 0.75, tint: SILVER }, ...each(SKIN_M, { ash: 0.75, tint: SILVER }), MI_Eyes: COLD_EYES(1) }, color: { MI_Hair_1_wayfarer: '#c8cacc' } },
  // Arna, the first Wayfarer, in the lamp memories: young and bare-headed with auburn hair; old, grey and bearded
  arna: { src: 'wayfarer', table: YOUTH, ...BARE, color: { MI_Hair_1_wayfarer: '#7a3416' } },
  arnaOld: { src: 'wayfarer', table: ELDER, drop: ['Male_Ranger_Head_Hood'], hair: BARE.hair, color: { MI_Hair_1_wayfarer: '#a6a6a2' } },
  // Isarn at ten, the night he took the lantern
  isarnBoy: { src: 'wayfarer', table: CHILD, shrink: 0.74, ...BARE, color: { MI_Hair_1_wayfarer: '#4a2c1a' } },
  // the Hammerhorns: "Minotaur Berserker" by Tim0 (Yury Misiyuk), CC-BY 4.0, a Mixamo rig, soot-black with the forge-brand
  hammerhorn: { src: 'warden', body: '/tmp/claude-0/sf/models/minotaur/model.glb', height: 2.3, bindPose: true, matNames: true, mats: { WarriorMaterial: { grade: SOOT, brand: true, rough: [0.82, 0.5] } },
    extras: { weaponScale: 1.25, credit: '"Minotaur Berserker - Free Game-Ready Character" by Yury Misiyuk (sketchfab.com/Tim0), CC-BY 4.0 - rebound onto the people skeleton, soot-black regrade, forge-brand added for Skotos', license: 'CC-BY-4.0' } },
  // Karthax, the Ash King: "Overlord" by DJMaesen (sketchfab.com/bumstrum), CC-BY 4.0, its rig renamed to Mixamo's
  karthax: { src: 'warden', body: '/tmp/claude-0/sf/models/overlord/model.glb', height: 2.0, bonemap: BONEMAPS.overlord, bindPose: true, matNames: true, prep: blackIron, reweight: tabard,
    extras: { weaponScale: 1.6, credit: '"Overlord" by DJMaesen (sketchfab.com/bumstrum), CC-BY 4.0 - rebound onto the people skeleton, black iron with ember seams for Skotos', license: 'CC-BY-4.0' } }
};
const ASH_CREDIT = { credit: 'Quaternius characters (people.glb); ember-crack grain: "Bark Brown 02" by Rob Tuytel, polyhaven.com/a/bark_brown_02', license: 'CC0' };
for (const R of Object.values(ASHSET)) R.extras = { ...(R.body ? {} : ASH_CREDIT), ...R.extras };

// ---------- Act V: the Frozen Coast (--set=frost) ----------
// Seven scenes, gated at 25 textures in the file. A grade makes a texture of its own, so the set is built to share: each
// recipe owns one outfit map (the enemies' at 256 px); the sources' normal, ORM and hair maps are shared; every skin wears
// one tintable map per body (`tone`) and takes its colour from the material's factor; the skins' roughness maps and the
// eyes' normal map give way to factors (`flat`); both enemies share one cold eye map that lights itself (`self`)
const lin = (v) => Math.pow(v, 2.2), srgb = (v) => Math.pow(Math.max(0, v), 1 / 2.2);
// a skin map made tintable: its colour drawn most of the way to its own grey (TONE.keep of it stays, so the lips and
// cheeks keep a little red) and its light lifted until the skin's mean reads TONE.grey; the dark texels (underwear) only
// lose their colour. `toned()` then turns the skin a recipe wants into the factor that gives it on this map.
const TONE = { keep: 0.3, grey: 0.8, mean: '#a97752' };
async function toneless(img) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const L = (i) => 0.3 * lin(data[i] / 255) + 0.55 * lin(data[i + 1] / 255) + 0.15 * lin(data[i + 2] / 255), m = hexRGB(TONE.mean), k = lin(TONE.grey) / (0.3 * m[0] + 0.55 * m[1] + 0.15 * m[2]);
  for (let i = 0; i < data.length; i += 3) { const l = L(i); for (let c = 0; c < 3; c++) data[i + c] = Math.round(255 * Math.min(1, srgb((l + TONE.keep * (lin(data[i + c] / 255) - l)) * k))); }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
// value noise on the body (rest pose, metres) for stains and crusts that do not follow the map's islands
const hash3 = (x, y, z) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1103515245); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  const l = (a, b, t) => a + (b - a) * t, h = (i, j, k) => hash3(ix + i, iy + j, iz + k);
  return l(l(l(h(0, 0, 0), h(1, 0, 0), fx), l(h(0, 1, 0), h(1, 1, 0), fx), fy), l(l(h(0, 0, 1), h(1, 0, 1), fx), l(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
}
const fbm = (p, f) => vnoise(p.x * f, p.y * f, p.z * f) * 0.5 + vnoise(p.x * f * 2.1 + 7, p.y * f * 2.1, p.z * f * 2.1) * 0.3 + vnoise(p.x * f * 4.3, p.y * f * 4.3 + 3, p.z * f * 4.3) * 0.2;
// where each texel of a material's map lies on the body: its rest-pose position and the node it belongs to (-1 in the
// gutter); the islands are grown four texels so the filtering never reaches an unpainted gutter
function texels(doc, mat, S) {
  const node = new Int16Array(S * S).fill(-1), P = new Float32Array(S * S * 3), names = [];
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3(), p = new THREE.Vector3(), e = [];
  for (const nd of doc.getRoot().listNodes()) for (const prim of nd.getMesh()?.listPrimitives() || []) {
    if (prim.getMaterial() !== mat) continue;
    const id = names.push(nd.getName()) - 1, A = prim.getAttribute('POSITION'), U = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray();
    for (let t = 0; t < idx.length; t += 3) {
      const ua = U.getElement(idx[t], []), ub = U.getElement(idx[t + 1], []), uc = U.getElement(idx[t + 2], []);
      const ax = ua[0] * S - 0.5, ay = ua[1] * S - 0.5, bx = ub[0] * S - 0.5, by = ub[1] * S - 0.5, cx = uc[0] * S - 0.5, cy = uc[1] * S - 0.5;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-9) continue;
      pa.fromArray(A.getElement(idx[t], e)); pb.fromArray(A.getElement(idx[t + 1], e)); pc.fromArray(A.getElement(idx[t + 2], e));
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, w2 = 1 - w0 - w1;
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
        const k = y * S + x; node[k] = id;
        p.copy(pa).multiplyScalar(w0).addScaledVector(pb, w1).addScaledVector(pc, w2).toArray(P, k * 3);
      }
    }
  }
  for (let pass = 0; pass < 4; pass++) {
    const n2 = node.slice();
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = y * S + x; if (node[k] >= 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= S || yy >= S || node[yy * S + xx] < 0) continue; const q = yy * S + xx; n2[k] = node[q]; P.copyWithin(k * 3, q * 3, q * 3 + 3); break; }
    }
    node.set(n2);
  }
  return { node, P, names };
}
// an outfit regraded garment by garment: `parts` grade the texels of the nodes they match ([regex, rules], the first match
// wins), `base` the rest; then `fx(rgb, p, node)` works on each texel where it lies on the body (wet hems, tide marks, salt)
// A rule with `val` sets its light by the texels it claims: their mean value (brightest channel) becomes `val`, whatever
// the source's own colours were (the healer's dark trousers and the smith's darker ones dye alike).
async function paint(doc, mat, img, { base = [], parts = [], fx }) {
  const S = (await sharp(img).metadata()).width, T = texels(doc, mat, S), raw = async (rules) => sharp(await grade(img, rules)).raw().toBuffer();
  const src = await sharp(img).removeAlpha().raw().toBuffer(), mine = (re) => (k) => T.node[k] >= 0 && re.test(T.names[T.node[k]]);
  const inBand = (x, b) => !b || (x >= b[0] && x <= b[1]);
  const lit = (rules, on) => {
    const done = new Uint8Array(S * S);
    return rules.map((R) => {
      let sum = 0, n = 0;
      for (let k = 0; k < S * S; k++) {
        if (done[k] || !on(k)) continue;
        const r = src[k * 3] / 255, g = src[k * 3 + 1] / 255, b = src[k * 3 + 2] / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
        let h = d < 1e-4 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
        if (!inBand(mx ? d / mx : 0, R.s) || !inBand(mx, R.v) || !(inBand(h, R.h) || inBand(h + 360, R.h) || inBand(h - 360, R.h))) continue;
        done[k] = 1; sum += mx; n++;
      }
      return R.val === undefined ? R : { ...R, bri: n ? R.val / (sum / n) : 1 };
    });
  };
  const claimed = (k) => parts.some(([re]) => mine(re)(k));
  const out = await raw(lit(base, (k) => T.node[k] >= 0 && !claimed(k))), taken = new Uint8Array(S * S);
  for (const [re, rules] of parts) {
    const g = await raw(lit(rules, mine(re)));
    for (let k = 0; k < S * S; k++) if (!taken[k] && T.node[k] >= 0 && re.test(T.names[T.node[k]])) { taken[k] = 1; out[k * 3] = g[k * 3]; out[k * 3 + 1] = g[k * 3 + 1]; out[k * 3 + 2] = g[k * 3 + 2]; }
  }
  if (fx) {
    const c = [0, 0, 0], p = new THREE.Vector3();
    for (let k = 0; k < S * S; k++) {
      if (T.node[k] < 0) continue;
      for (let i = 0; i < 3; i++) c[i] = out[k * 3 + i] / 255;
      fx(c, p.fromArray(T.P, k * 3), T.names[T.node[k]]);
      for (let i = 0; i < 3; i++) out[k * 3 + i] = Math.round(255 * Math.min(1, Math.max(0, c[i])));
    }
  }
  if (process.env.FROST_DEBUG) {
    const dbg = Buffer.from(out), pal = [[255, 0, 0], [0, 255, 0], [0, 80, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255], [255, 255, 255], [255, 128, 0]];
    for (let k = 0; k < S * S; k++) { const id = T.node[k]; for (let i = 0; i < 3; i++) dbg[k * 3 + i] = id < 0 ? 0 : dbg[k * 3 + i] * 0.5 + pal[id % 8][i] * 0.5; }
    await sharp(dbg, { raw: { width: S, height: S, channels: 3 } }).png().toFile(`${process.env.FROST_DEBUG}/${mat.getName()}_nodes.png`);
    const src = await sharp(img).removeAlpha().raw().toBuffer(), acc = T.names.map(() => [0, 0, 0, 0]);
    for (let k = 0; k < S * S; k++) { const id = T.node[k]; if (id < 0) continue; const mx = Math.max(src[k * 3], src[k * 3 + 1], src[k * 3 + 2]) / 255; acc[id][0] += mx; acc[id][1]++; if (mx > 0.55) { acc[id][2] += mx; acc[id][3]++; } }
    console.log(mat.getName(), 'nodes', T.names.map((n, i) => `${i}:${n} v${(acc[i][0] / acc[i][1]).toFixed(2)} light ${(acc[i][3] / acc[i][1]).toFixed(2)}@${(acc[i][2] / (acc[i][3] || 1)).toFixed(2)}`).join(' '));
    if (process.env.FROST_HIST) for (let id = 0; id < T.names.length; id++) {
      const bins = Array.from({ length: 10 }, () => [0, 0, 0]);
      for (let k = 0; k < S * S; k++) { if (T.node[k] !== id) continue; const r = src[k * 3] / 255, g = src[k * 3 + 1] / 255, b = src[k * 3 + 2] / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let h = d < 1e-4 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; const B = bins[Math.min(9, Math.floor(mx * 10))]; B[0]++; B[1] += h; B[2] += mx ? d / mx : 0; }
      const tot = bins.reduce((a, b) => a + b[0], 0);
      console.log('  ', T.names[id], bins.map((B, i) => B[0] / tot > 0.01 ? `${i / 10}:${(100 * B[0] / tot).toFixed(0)}%h${(B[1] / B[0]).toFixed(0)}s${(B[2] / B[0]).toFixed(2)}` : '').filter(Boolean).join(' '));
    }
  }
  return sharp(out, { raw: { width: S, height: S, channels: 3 } }).png().toBuffer();
}
// a texel darkened and drawn toward a colour (wet cloth soaks dark; algae and salt stain it)
const mixC = (c, to, k) => { for (let i = 0; i < 3; i++) c[i] += (to[i] - c[i]) * k; };
const lum = (c) => 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2];

// a dye: every texel the rule claims takes one hue and saturation and keeps its own light (scaled so the claimed texels'
// mean value is `val`), so the weave, the seams and the shading stay; `o` narrows it (v: a band of value, s: of
// saturation, h: of hue)
const dye = (to, sat, val, o = {}) => ({ s: [0, 1], to, spread: 0, sat: 0, add: sat, val, ...o });
// a skin's colour factor for the tintable map: the hex is what the skin's mean should read
const toned = (hex) => { const m = hexRGB(TONE.mean), mL = 0.3 * m[0] + 0.55 * m[1] + 0.15 * m[2]; return '#' + hexRGB(hex).map((c, i) => Math.round(255 * srgb(Math.min(1, c / (lin(TONE.grey) * (1 - TONE.keep + TONE.keep * m[i] / mL))))).toString(16).padStart(2, '0')).join(''); };
// the sea in the cloth: soaked dark up to a ragged line, weed stains in blotches, pale tide-lines of salt
const sodden = ({ wet = 0.45, line = 0.95, weed = [0.2, 0.24, 0.13], weedK = 0.55, salt = [0.5, 0.52, 0.48], saltK = 0.3, lines = [0.32, 0.6, 0.98] } = {}) => (c, p) => {
  const n = fbm(p, 5), m = fbm(p, 21);
  const soak = 1 - smooth((p.y - line + (n - 0.5) * 0.4) / 0.3);
  for (let i = 0; i < 3; i++) c[i] *= 1 - wet * (0.4 + 0.6 * soak);
  const w = smooth((fbm(p, 3.2) - 0.5) / 0.14) * weedK * (0.6 + 0.4 * soak), L = lum(c) * 1.6 + 0.04;
  mixC(c, weed.map((v) => v * L / lum(weed) * (0.7 + 0.6 * m)), w);
  const tide = Math.max(...lines.map((h) => 1 - smooth(Math.abs(p.y - h + (n - 0.5) * 0.16) / 0.025)));
  mixC(c, salt.map((v) => v * (0.75 + 0.25 * m)), tide * saltK * smooth((m - 0.42) / 0.2));
};
// a keeper's weathering: salt dried on the boots and the trouser hems (a broken pale rim and specks), wear on the knees
const salted = ({ top = 0.42, k = 0.45, salt = [0.78, 0.77, 0.72] } = {}) => (c, p) => {
  const n = fbm(p, 6), m = fbm(p, 31);
  const rim = 1 - smooth(Math.abs(p.y - top * (0.55 + 0.45 * n)) / 0.04), low = 1 - smooth((p.y - top * 0.7) / 0.12);
  mixC(c, salt, k * Math.max(rim * smooth((m - 0.35) / 0.2), low * smooth((m - 0.62) / 0.1) * 0.7));
};
const SKIN = { tone: true, flat: ['mr'] }, EYES = { flat: ['normal'] };
// the Sunken's and the Ice Singers' eyes: a cold pale iris and a clouded white, the map its own faint glow
const DROWNED_EYES = { eyes: { ...COLD_EYES(0.6).eyes, self: true, emit: [0.22, 0.3, 0.42] }, flat: ['normal'] };
const FROST = {
  // the Sunken: a drowned sailor (villager0) gone long and thin, grey-green and wet, the linen and leather soaked dark,
  // weed-stained and ringed with salt; the eyes clouded and faintly cold (the hook, the kelp veil and the barnacles are code)
  sunken: { src: 'villager0', table: GAUNT, mats: { ...each(SKIN_M, SKIN), MI_Eyes: DROWNED_EYES,
    MI_Peasant: { px: 256, paint: { base: [dye(100, 0.15, 0.16)], parts: [
      [/Body/, [dye(112, 0.18, 0.28, { v: [0.4, 1] }), dye(70, 0.3, 0.1)]],
      [/Legs/, [dye(110, 0.25, 0.07)]], [/Feet/, [dye(60, 0.3, 0.07)]], [/Arms/, [dye(70, 0.3, 0.08)]]], fx: sodden({ wet: 0.4, weedK: 0.7 }) } } },
    color: { MI_Hair_1_villager0: '#29312b', ...each(SKIN_M, toned('#6a7768')) }, rough: { MI_Peasant: 0.85, ...each(SKIN_M, 0.5), MI_Hair_1_villager0: 0.5 } },
  // the Ice Singers: drowned women (the healer) gone to a crone's frame, skin pale blue, the dress soaked to blue-black
  // and sea-green, the long hair white-green and wet
  icesinger: { src: 'healer', table: CRONE, mats: { MI_Superhero_Female: SKIN, MI_Eyes: DROWNED_EYES,
    MI_Peasant_healer: { px: 256, paint: { base: [dye(205, 0.2, 0.14)], parts: [
      [/Arms/, [dye(205, 0.14, 0.48, { v: [0.4, 1] }), dye(200, 0.25, 0.16)]],
      [/Body/, [dye(182, 0.38, 0.28, { v: [0.25, 1] }), dye(210, 0.3, 0.14)]],
      [/Legs/, [dye(212, 0.4, 0.2)]], [/Feet/, [dye(205, 0.25, 0.16)]]], fx: sodden({ wet: 0.3, line: 0.7, weed: [0.12, 0.2, 0.17], weedK: 0.4, salt: [0.7, 0.76, 0.8], lines: [0.25, 0.5] }) } } },
    color: { MI_Hair_2_healer: '#a8bab2', MI_Superhero_Female: toned('#8296a6') }, rough: { MI_Peasant_healer: 0.85, MI_Superhero_Female: 0.45, MI_Hair_2_healer: 0.45 } },
  // Alkyone, keeper of the sea-lights, forty-five: Elianthe's body made sturdier with a longer, leaner, wind-burnt face;
  // a waxed ochre oilskin bodice over a navy gansey, olive oilskin trousers, sealskin boots and gloves, salt on the hems;
  // the salt-white hair under darker brows (the braid, the short hood and the lantern are code)
  alkyone: { src: 'healer', table: WEATHER, mats: { MI_Superhero_Female: SKIN, MI_Eyes: EYES,
    MI_Peasant_healer: { paint: { base: [dye(30, 0.3, 0.2)], parts: [
      [/Arms/, [dye(218, 0.4, 0.26, { v: [0.4, 1] }), dye(24, 0.45, 0.14)]],
      [/Body/, [dye(36, 0.6, 0.34, { v: [0.25, 1] }), dye(22, 0.5, 0.14)]],
      [/Legs/, [dye(62, 0.45, 0.22)]], [/Feet/, [dye(25, 0.3, 0.13)]]], fx: salted() } } },
    color: { MI_Hair_2_healer: '#d4d0c4', MI_Superhero_Female: toned('#a06c55') }, brows: '#6e655c', rough: { MI_Peasant_healer: 0.8 } },
  // Selna, the eldest keeper, seventy-five: the smith's body with the old woman's table (the stoop is the game's), white
  // hair in its buns, oatmeal wool sleeves and grey mitts, a slate-black oilskin bodice, charcoal trousers, grey sealskin
  selna: { src: 'smith', table: ELDER, mats: { MI_Superhero_Female: SKIN, MI_Eyes: EYES,
    MI_Peasant_smith: { paint: { base: [dye(30, 0.15, 0.18)], parts: [
      [/Arms/, [dye(40, 0.12, 0.6, { v: [0.4, 1] }), dye(30, 0.08, 0.2)]],
      [/Body/, [dye(25, 0.3, 0.1, { v: [0, 0.16] }), dye(214, 0.22, 0.2)]],
      [/Legs/, [dye(215, 0.05, 0.17)]], [/Feet/, [dye(32, 0.1, 0.2)]]], fx: salted({ k: 0.35 }) } } },
    color: { MI_Hair_2_smith: '#e2e0da', MI_Superhero_Female: toned('#b48b78') }, brows: '#a8a39b', rough: { MI_Peasant_smith: 0.8 } },
  // Tern, ten: villager0 with the boy's table, sandy hair, a blue-grey knitted gansey, ochre oilskin trousers, sealskin
  // boots (the wool cap and the small lantern are code; the same scene is the boy Einar and the Whitecliff child)
  tern: { src: 'villager0', table: CHILD, shrink: 0.74, mats: { ...each(SKIN_M, SKIN), MI_Eyes: EYES,
    MI_Peasant: { paint: { base: [dye(26, 0.45, 0.16)], parts: [
      [/Body/, [dye(214, 0.28, 0.4, { v: [0.4, 1] }), dye(26, 0.45, 0.16)]],
      [/Legs/, [dye(40, 0.55, 0.32)]], [/Feet/, [dye(26, 0.3, 0.16)]]], fx: salted({ top: 0.3, k: 0.35 }) } } },
    color: { MI_Hair_1_villager0: '#8c6c48', ...each(SKIN_M, toned('#b4836a')) } },
  // Tamarisk, a nursery child of the Evergreen grown up among the Saltborn: the ranger's body with Elati's table, hood and
  // pauldrons off, villager2's short cut gone salt-white, the cloth a deep sea-grey, the leathers the Saltborn's
  // ochre-brown (the fur collar is code)
  tamarisk: { src: 'ranger', table: ELF, drop: ['Female_Ranger_Head_Hood', 'Female_Ranger_Acc_Pauldrons'], hair: ['villager2', 'Hair_BuzzedFemale', 'MI_Hair_1_villager2'],
    mats: { ...each(SKIN_F, SKIN), MI_Eyes: EYES,
      MI_Ranger: { paint: { base: [dye(205, 0.18, 0.3, { h: [45, 180] }), dye(32, 0.5, 0.3)], parts: [
        [/Legs/, [dye(210, 0.12, 0.16)]], [/Feet/, [dye(28, 0.4, 0.2)]]], fx: salted({ top: 0.5, k: 0.3 }) } } },
    color: { MI_Hair_1_villager2: '#d8d4c8', MI_Hair_2_ranger: '#9a9388', ...each(SKIN_F, toned('#b89684')) } },
  // Old Glaukos, the Landing's blind elder: the Wayfarer bare-headed with the old man's table (old Arna's look, so he is
  // old Arna in the last memory), white hair and beard, an oatmeal wool shirt under a sealskin jerkin, dark wool trousers,
  // no shoulder plate (the eye band is code)
  glaukos: { src: 'wayfarer', table: ELDER, drop: ['Male_Ranger_Head_Hood', 'Male_Ranger_Acc_Pauldron'], hair: BARE.hair,
    mats: { ...each(SKIN_M, SKIN), MI_Eyes: EYES,
      MI_Ranger_wayfarer: { paint: { base: [dye(26, 0.35, 0.18)], parts: [
        [/Arms$/, [dye(38, 0.12, 0.45, { s: [0, 0.45] }), dye(26, 0.35, 0.16)]], [/Body$/, [dye(28, 0.25, 0.16)]],
        [/Legs/, [dye(30, 0.06, 0.12)]], [/Feet/, [dye(25, 0.3, 0.12)]]], fx: salted({ top: 0.5, k: 0.3 }) } } },
    color: { MI_Hair_1_wayfarer: '#d2d0ca', ...each(SKIN_M, toned('#a2725c')) } }
};
const FROST_CREDIT = { credit: 'Quaternius characters (people.glb)', license: 'CC0' };
for (const R of Object.values(FROST)) R.extras = { ...FROST_CREDIT, ...R.extras };
const SETS = { folk: RECIPES, grove: GROVE, ash: ASHSET, frost: FROST };
if (!SETS[SET]) throw new Error(`unknown set ${SET} (folk, grove, ash, frost)`);

let out = null;
for (const [name, R] of Object.entries(SETS[SET])) {
  const doc = await isolate(R.src);
  if (R.drop || R.hair) await restyle(doc, R);
  if (R.dwarf) morph(doc, DWARF);
  if (R.elf) { morph(doc, R.elf === true ? ELF : stretch(ELF, R.elf)); lighten(doc); console.log(name, 'stands', span(doc).map((v) => v.toFixed(3)).join(' to '), 'm'); }
  // the ash set is a crowd seen from the game's camera: boots and bracers go down to a quarter, before the body is
  // re-proportioned, so every recipe of one source keeps the same triangles, UVs and weights (shared in the file)
  if (R.table) { lighten(doc, 2200, 0.24); morph(doc, R.table); }
  if (R.shrink) shrink(doc, R.shrink);
  if (R.body) await rebind(doc, { ...R, name });
  if (R.barkArm) barkLimb(doc, R.barkArm, doc.createTexture(`${name}_bark`).setImage(new Uint8Array(await sharp(BARK).resize(256, 256).modulate({ saturation: 0.75, brightness: 1.15 }).png().toBuffer())).setMimeType('image/png'));
  if (R.split) split(doc, R.split);
  const root = doc.getRoot();
  for (const mat of root.listMaterials()) {
    const mn = mat.getName(), op = R.mats?.[mn], tex = mat.getBaseColorTexture();
    if (op && tex) {
      let img = Buffer.from(tex.getImage()), emit = null;
      const orig = img;
      if (op.hsv) img = await recolor(img, op.hsv);
      if (op.grade) img = await grade(img, op.grade);
      if (op.tone) img = await toneless(img);
      if (op.paint) img = await paint(doc, mat, img, op.paint);
      if (op.ash) img = await ashen(img, op.ash, op.tint);
      if (op.dust) img = await dust(img, op.dust, op.tint);
      if (op.flecks) img = await flecks(img, op.flecks);
      if (op.bark || op.cracks) ({ img, emit } = await barkify(img, op.bark || 0, op.cracks, op.crackLo));
      if (op.eyes) ({ img, emit } = await amberEyes(img, op.eyes));
      if (op.brand) ({ img, emit } = await burn(doc, mat, img, emit, brandMark(doc), 512, /^(spine_0[123]|clavicle_l)$/));
      if (op.rough && mat.getMetallicRoughnessTexture()) mat.setMetallicRoughnessTexture(doc.createTexture(`${name}_${mn}_mr`).setImage(new Uint8Array(await roughen(Buffer.from(mat.getMetallicRoughnessTexture().getImage()), op.rough))).setMimeType('image/png'));
      if (op.px) img = await sharp(img).resize(op.px, op.px).png().toBuffer();
      // (a map no op touched keeps its texture: `flat` alone changes none)
      if (img !== orig) mat.setBaseColorTexture(doc.createTexture(`${name}_${mn}`).setImage(new Uint8Array(img)).setMimeType('image/png'));
      // eyes that light themselves: the colour map is its own glow (one map where amberEyes() makes two)
      if (op.eyes?.self) { emit = null; mat.setEmissiveTexture(mat.getBaseColorTexture()).setEmissiveFactor(op.eyes.emit); }
      if (emit) mat.setEmissiveTexture(doc.createTexture(`${name}_${mn}_glow`).setImage(new Uint8Array(emit)).setMimeType('image/png')).setEmissiveFactor(op.eyes ? op.eyes.emit || [0.9, 0.38, 0.05] : [1, 1, 1]);
    }
    // `flat`: a map given way to a factor (a roughness map to its mean roughness, a normal map to none)
    for (const slot of op?.flat || []) {
      const mr = mat.getMetallicRoughnessTexture();
      if (slot === 'mr' && mr) { const { data } = await sharp(Buffer.from(mr.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true }); let s = 0, n = 0; for (let i = 1; i < data.length; i += 3) if (data[i] < 250) { s += data[i]; n++; } mat.setMetallicRoughnessTexture(null).setRoughnessFactor(mat.getRoughnessFactor() * (n ? s / n / 255 : 1)); }
      if (slot === 'normal') mat.setNormalTexture(null);
    }
    if (R.color?.[mn]) mat.setBaseColorFactor([...hexRGB(R.color[mn]), 1]);
    if (R.rough?.[mn]) mat.setRoughnessFactor(R.rough[mn]);
    mat.setName(`${mn}_${name}`);
  }
  // eyebrows apart from the hair they share a map with (a salt-white braid under darker brows)
  if (R.brows) for (const n of root.listNodes()) if (n.getName() === 'Eyebrows') for (const p of n.getMesh().listPrimitives()) p.getMaterial().setBaseColorFactor([...hexRGB(R.brows), 1]);
  // the ash and frost sets record how tall each one stands (the game sizes bosses and stand-ins against it)
  if (SET === 'ash' || SET === 'frost') { const [lo, hi] = span(doc); R.extras = { ...R.extras, height: +(hi - lo).toFixed(2) }; console.log(name.padEnd(11), 'stands', (hi - lo).toFixed(2), 'm, lowest point', lo.toFixed(3)); }
  root.getDefaultScene().setName(name).setExtras({ folk: true, ...R.extras });
  if (!out) { out = doc; continue; }
  mergeDocuments(out, doc);
}
const root = out.getRoot();
root.setDefaultScene(root.listScenes()[0]);
for (const b of root.listBuffers().slice(1)) b.dispose();
for (const a of root.listAccessors()) a.setBuffer(root.listBuffers()[0]);
await out.transform(
  dedup(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: SET === 'folk' ? 80 : 75 }),
  quantize(SET === 'folk' ? { quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 } : { quantizePosition: 12, quantizeNormal: 8, quantizeTexcoord: 12, quantizeWeight: 8 }),
  ...(SET === 'ash' || SET === 'frost' ? [dedup()] : []),
  prune({ keepAttributes: false, keepLeaves: false }),
  meshopt({ encoder: MeshoptEncoder, level: SET === 'folk' ? 'medium' : 'high' }),
  prune({ keepAttributes: false, keepLeaves: false }),
  unpartition()
);
await io.write(OUT, out);
console.log(SET, root.listScenes().map((s) => s.getName()).join(' '), (statSync(OUT).size / 1024).toFixed(0) + ' KB', 'textures', root.listTextures().length);
