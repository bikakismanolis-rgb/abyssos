// Builds src/assets/folk.glb: Act II's people, made from the Quaternius characters already in people.glb (CC0).
// Dwarves are the same characters re-proportioned: every bone keeps its rest rotation (so the shared clips in moves.bin
// still fit), the skeleton is re-measured (short legs, broad shoulders, a long back) and the skin follows by blending
// each vertex's per-bone transforms (scale the flesh about the bone, move it with the bone's new joint).
// usage: node folk.mjs [people.glb] [out.glb]                  Act II's dwarves -> src/assets/folk.glb
//        node folk.mjs --set=grove [people.glb] [out.glb]    Act III's Evergreen (elves) -> src/assets/grove.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, textureCompress, weld, unpartition, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { statSync } from 'node:fs';
import { load, normalise, dropLoose, locals, worlds } from './lib.mjs';
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
async function rebind(doc, R) {
  const root = doc.getRoot(), sc = root.getDefaultScene();
  const { W, P } = worldOf(sc);
  const ue = new Map(); sc.traverse((n) => { if (!n.getMesh()) ue.set(n.getName(), n); });
  const ueJoints = root.listSkins()[0].listJoints();
  // the body to carry
  const md = await load(R.body);
  dropLoose(md);
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
    const n = doc.createMaterial(R.name + '_body').setBaseColorFactor(m.getBaseColorFactor()).setEmissiveFactor(m.getEmissiveFactor())
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
async function barkify(img, amt, cracks = 0) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const G = await grainOf(info.width, info.height), em = cracks ? Buffer.alloc(data.length) : null;
  for (let p = 0; p < G.length; p++) {
    const f = Math.max(0.15, 1 + amt * 0.32 * G[p]);
    for (let c = 0; c < 3; c++) data[p * 3 + c] = Math.min(255, Math.round(data[p * 3 + c] * f));
    if (em) { const k = Math.min(1, Math.max(0, (-G[p] - 1.3) / 1.2)) * cracks; em[p * 3] = Math.round(255 * k); em[p * 3 + 1] = Math.round(150 * k); em[p * 3 + 2] = Math.round(40 * k); }
  }
  const png = (b) => sharp(b, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
  // the glow is soft and low in detail: half size is plenty
  return { img: await png(data), emit: em && await sharp(await png(em)).resize(info.width >> 1, info.height >> 1).blur(0.8).png().toBuffer() };
}
// eyes: the brown iris (a disc in the middle of the map) goes amber; with `glow` an emissive mask lights the iris and,
// at `white`, the sclera, so the eyes burn amber in the dark
async function amberEyes(img, { tint = 1, glow = 0, white = 0, fill = 0 } = {}) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, cx = W * 0.496, cy = H * 0.497, rad = W * 0.11, em = Buffer.alloc(data.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), s = mx > 0 ? (mx - Math.min(r, g, b)) / mx : 0;
    const iris = band(Math.hypot(x - cx, y - cy) / rad, [-1, 1], 0.12), sclera = (1 - iris) * unit(s, [0, 0.2], 0.05) * unit(mx, [0.66, 1], 0.06);
    // amber of the same darkness, brighter towards the rim of the iris (darker when it glows: the light is its own);
    // `fill` floods the white of the eye with amber too
    const v = glow ? Math.min(1, mx * 1.3 + 0.06) : Math.min(1, mx * 2.2 + 0.12), am = [v, v * 0.62, v * 0.16], k = Math.max(iris * tint, sclera * fill * 0.8);
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

// lowest and highest point of the rest pose (after morph() the skins hold world-space rest positions)
function span(doc) {
  let lo = Infinity, hi = -Infinity; const e = [];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { a.getElement(i, e); lo = Math.min(lo, e[1]); hi = Math.max(hi, e[1]); } }
  return [lo, hi];
}
// the heaviest pieces (boots, bracers, gloves: thousands of vertices of straps and buckles) thinned for a crowd of them
function lighten(doc, most = 3200) {
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const n = p.getAttribute('POSITION').getCount();
    if (n > most) simplifyPrim(p, Math.max(0.4, most / n), 0.01);
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
const ROOTSWORN_SKIN = each([...SKIN_M, ...SKIN_F], { ash: 0.35, tint: BARK_TINT });
const GROVE = {
  // Elati, the scout who would not kneel: grey-green and moss leathers, silver hair, amber-flecked eyes, a bark forearm
  elati: { src: 'ranger', elf: true, barkArm: 'l', mats: { MI_Ranger: { grade: [{ h: [60, 180], to: 125, sat: 0.32, bri: 1.1 }, { h: [-20, 60], to: 88, sat: 0.7, bri: 0.7 }] }, ...each(SKIN_F, { ash: 0.12, tint: [0.62, 0.62, 0.6] }), MI_Eyes: { eyes: { tint: 0.5 } } }, color: { MI_Hair_2_ranger: '#d8dcd0' } },
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
const SETS = { folk: RECIPES, grove: GROVE };
if (!SETS[SET]) throw new Error(`unknown set ${SET} (folk, grove)`);

let out = null;
for (const [name, R] of Object.entries(SETS[SET])) {
  const doc = await isolate(R.src);
  if (R.dwarf) morph(doc, DWARF);
  if (R.elf) { morph(doc, R.elf === true ? ELF : stretch(ELF, R.elf)); lighten(doc); console.log(name, 'stands', span(doc).map((v) => v.toFixed(3)).join(' to '), 'm'); }
  if (R.body) await rebind(doc, { ...R, name });
  if (R.barkArm) barkLimb(doc, R.barkArm, doc.createTexture(`${name}_bark`).setImage(new Uint8Array(await sharp(BARK).resize(256, 256).modulate({ saturation: 0.75, brightness: 1.15 }).png().toBuffer())).setMimeType('image/png'));
  const root = doc.getRoot();
  for (const mat of root.listMaterials()) {
    const mn = mat.getName(), op = R.mats?.[mn], tex = mat.getBaseColorTexture();
    if (op && tex) {
      let img = Buffer.from(tex.getImage()), emit = null;
      if (op.hsv) img = await recolor(img, op.hsv);
      if (op.grade) img = await grade(img, op.grade);
      if (op.ash) img = await ashen(img, op.ash, op.tint);
      if (op.bark) ({ img, emit } = await barkify(img, op.bark, op.cracks));
      if (op.eyes) ({ img, emit } = await amberEyes(img, op.eyes));
      mat.setBaseColorTexture(doc.createTexture(`${name}_${mn}`).setImage(new Uint8Array(img)).setMimeType('image/png'));
      if (emit) mat.setEmissiveTexture(doc.createTexture(`${name}_${mn}_glow`).setImage(new Uint8Array(emit)).setMimeType('image/png')).setEmissiveFactor(op.eyes ? [0.9, 0.38, 0.05] : [1, 1, 1]);
    }
    if (R.color?.[mn]) mat.setBaseColorFactor([...hexRGB(R.color[mn]), 1]);
    mat.setName(`${mn}_${name}`);
  }
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
  prune({ keepAttributes: false, keepLeaves: false }),
  meshopt({ encoder: MeshoptEncoder, level: SET === 'folk' ? 'medium' : 'high' }),
  prune({ keepAttributes: false, keepLeaves: false }),
  unpartition()
);
await io.write(OUT, out);
console.log(SET, root.listScenes().map((s) => s.getName()).join(' '), (statSync(OUT).size / 1024).toFixed(0) + ' KB', 'textures', root.listTextures().length);
