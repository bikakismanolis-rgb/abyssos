// Stage 1: Rocketbox Dog_GermanShepard_01 (MIT) -> clean wolf rig in metres.
//  - renames the 3ds Max biped bones, drops Bip01 / Footsteps, reparents scapulae to the chest and thighs/tail to the pelvis
//  - bakes the 0.01 scale, scales to warg size, reshapes (per-bone scale about the joint, children offsets follow)
//  - feet on y = 0, body centred between fore and hind paws, faces +Z
//  - writes wolf_base.glb (uncompressed, original texture unless tex/wolf_*.png exist)
// usage (cwd = this folder): node base.mjs [scale]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';

const SRC = '../../research/github/rocketbox_Dog_GermanShepard_01.glb';
const SCALE = +(process.argv[2] || process.env.SCALE || 1.5);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC);
const root = doc.getRoot();
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const RENAME = {
  'dog Pelvis': 'pelvis', 'dog Spine': 'spine_01', 'dog Spine1': 'spine_02', 'dog Spine2': 'spine_03',
  'dog Neck': 'neck_01', 'dog Neck1': 'neck_02', 'dog Neck2': 'neck_03', 'dog Head': 'head',
  'dog Ear L': 'ear_l', 'dog Ear R': 'ear_r', 'dog Xtra Mouth': 'jaw', 'dog Xtra Eye L': 'eyelid_l', 'dog Xtra Eye R': 'eyelid_r',
  'dog Tail': 'tail_01', 'dog Tail1': 'tail_02', 'dog Tail2': 'tail_03', 'dog Tail3': 'tail_04'
};
for (const s of ['L', 'R']) {
  const l = s.toLowerCase();
  Object.assign(RENAME, {
    [`dog ${s} Clavicle`]: 'scapula_' + l, [`dog ${s} UpperArm`]: 'upperarm_' + l, [`dog ${s} Forearm`]: 'forearm_' + l,
    [`dog ${s} Hand`]: 'carpus_' + l, [`dog ${s} Finger0`]: 'fpaw_' + l,
    [`dog ${s} Thigh`]: 'thigh_' + l, [`dog ${s} Calf`]: 'shin_' + l, [`dog ${s} Foot`]: 'hock_' + l, [`dog ${s} Toe0`]: 'hpaw_' + l
  });
}
// new parent for reparented bones
const REPARENT = { scapula_l: 'spine_03', scapula_r: 'spine_03', thigh_l: 'pelvis', thigh_r: 'pelvis', tail_01: 'pelvis' };

// ---------- old world rest ----------
const Wold = new Map();
const visit = (n, pm) => {
  const m = new THREE.Matrix4().compose(V3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), V3(...n.getScale()));
  const w = pm.clone().multiply(m); Wold.set(n, w); n.listChildren().forEach((c) => visit(c, w));
};
root.getDefaultScene().listChildren().forEach((n) => visit(n, new THREE.Matrix4()));
const skin = root.listSkins()[0];
const joints = skin.listJoints();
const ibm = skin.getInverseBindMatrices().getArray();
const bindShape = Wold.get(joints[0]).clone().multiply(new THREE.Matrix4().fromArray(ibm, 0)); // joint world * IBM (same for all: bind = rest)

// bones by new name: rest world position (scaled) and rotation
const B = new Map();
for (const j of joints) {
  const name = RENAME[j.getName()]; if (!name) throw new Error('unmapped ' + j.getName());
  const p = V3(), q = new THREE.Quaternion(), s = V3(); Wold.get(j).decompose(p, q, s);
  B.set(name, { node: j, name, p: p.multiplyScalar(SCALE), q: q.normalize() });
}
// parents
const parentOf = new Map();
for (const j of joints) for (const c of j.listChildren()) if (RENAME[c.getName()]) parentOf.set(RENAME[c.getName()], RENAME[j.getName()]);
for (const [c, p] of Object.entries(REPARENT)) parentOf.set(c, p);

// ---------- reshape: per-bone scale in a character-aligned frame about the joint ----------
// s = [lateral x, vertical y, along z] multipliers, applied in the bone's own frame (bone axis = towards its first child)
// children's offsets are scaled by the parent's reshape matrix, so the chain stays connected.
const RESHAPE = JSON.parse(process.env.RESHAPE || 'null') || {
  head: [1.1, 1.06, 1.04], ear_l: [0.78, 0.78, 0.78], ear_r: [0.78, 0.78, 0.78],
  neck_02: [1.24, 1.12, 1.0], neck_03: [1.24, 1.15, 1.0], neck_01: [1.16, 1.06, 1.0], spine_03: [1.15, 1.05, 1.0],
  spine_02: [1.16, 1.04, 1.0], spine_01: [1.14, 1.03, 1.0], pelvis: [1.12, 1.02, 1.0], thigh_l: [1.1, 1.08, 1.0], thigh_r: [1.1, 1.08, 1.0],
  fpaw_l: [1.22, 1.22, 1.22], fpaw_r: [1.22, 1.22, 1.22], hpaw_l: [1.2, 1.2, 1.2], hpaw_r: [1.2, 1.2, 1.2],
  carpus_l: [1.1, 1.1, 1.0], carpus_r: [1.1, 1.1, 1.0], shin_l: [1.06, 1.06, 1.0], shin_r: [1.06, 1.06, 1.0],
  tail_01: [1.3, 1.25, 1.0], tail_02: [1.5, 1.45, 1.0], tail_03: [1.6, 1.55, 1.0], tail_04: [1.5, 1.45, 1.0],
  forearm_l: [1.08, 1.08, 1.0], forearm_r: [1.08, 1.08, 1.0], upperarm_l: [1.1, 1.1, 1.0], upperarm_r: [1.1, 1.1, 1.0]
};
const names = [...B.keys()];
const children = (n) => names.filter((c) => parentOf.get(c) === n);
// a bone frame: z along the bone (to first child or the old local +X), x lateral (character X projected), y = z cross x
function boneFrame(n) {
  const b = B.get(n), ch = children(n).filter((c) => !/^(ear|eyelid|jaw)/.test(c) && !/^(scapula|thigh|tail_01)/.test(c));
  let dir = ch.length ? B.get(ch[0]).p.clone().sub(b.p) : V3(1, 0, 0).applyQuaternion(b.q);
  if (n === 'head') dir = V3(0, -0.25, 1); // head: along the snout
  dir.normalize();
  let lat = V3(1, 0, 0).projectOnPlane(dir); if (lat.lengthSq() < 1e-4) lat = V3(0, 1, 0).projectOnPlane(dir);
  lat.normalize();
  const up = dir.clone().cross(lat).normalize();
  return new THREE.Matrix4().makeBasis(lat, up, dir);
}
const RM = new Map();   // reshape matrix about the joint (in world, before translation)
for (const n of names) {
  const s = RESHAPE[n]; if (!s) { RM.set(n, new THREE.Matrix4()); continue; }
  const F = boneFrame(n);
  RM.set(n, F.clone().multiply(new THREE.Matrix4().makeScale(...s)).multiply(F.clone().invert()));
}
// new joint positions: walk from the roots
const order = []; const walk = (n) => { order.push(n); for (const c of children(n)) walk(c); };
for (const n of names) if (!parentOf.get(n)) walk(n);
const P2 = new Map();
for (const n of order) {
  const pn = parentOf.get(n);
  if (!pn) { P2.set(n, B.get(n).p.clone()); continue; }
  const off = B.get(n).p.clone().sub(B.get(pn).p).applyMatrix4(RM.get(pn));
  P2.set(n, P2.get(pn).clone().add(off));
}
// per-bone vertex transform: x -> P2 + RM (x - P)
const VM = new Map(names.map((n) => [n, new THREE.Matrix4().makeTranslation(P2.get(n)).multiply(RM.get(n)).multiply(new THREE.Matrix4().makeTranslation(B.get(n).p.clone().negate()))]));

// ---------- vertices ----------
const prim = root.listMeshes()[0].listPrimitives()[0];
const POS = prim.getAttribute('POSITION'), NRM = prim.getAttribute('NORMAL'), JN = prim.getAttribute('JOINTS_0'), WT = prim.getAttribute('WEIGHTS_0');
const jName = joints.map((j) => RENAME[j.getName()]);
const nv = POS.getCount(), pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3);
const S1 = new THREE.Matrix4().makeScale(SCALE, SCALE, SCALE).multiply(bindShape);
const N3 = new THREE.Matrix3();
for (let i = 0; i < nv; i++) {
  const v = V3(...POS.getElement(i, [])).applyMatrix4(S1), nn = V3(...NRM.getElement(i, [])).transformDirection(bindShape);
  const j = JN.getElement(i, []), w = WT.getElement(i, []);
  const o = V3(), on = V3(); let ws = 0;
  for (let k = 0; k < 4; k++) if (w[k] > 0) {
    const M = VM.get(jName[j[k]]); o.addScaledVector(v.clone().applyMatrix4(M), w[k]);
    N3.getNormalMatrix(M); on.addScaledVector(nn.clone().applyMatrix3(N3).normalize(), w[k]); ws += w[k];
  }
  o.multiplyScalar(1 / ws); on.normalize();
  o.toArray(pos, i * 3); on.toArray(nrm, i * 3);
}
// ground + centring: lowest vertex at y = 0; z centre between fore and hind paws
let minY = 1e9; for (let i = 0; i < nv; i++) minY = Math.min(minY, pos[i * 3 + 1]);
const zc = (P2.get('fpaw_l').z + P2.get('hpaw_l').z) / 2;
const OFF = V3(0, -minY, -zc);
for (let i = 0; i < nv; i++) { pos[i * 3 + 1] += OFF.y; pos[i * 3 + 2] += OFF.z; }
for (const n of names) P2.get(n).add(OFF);

// ---------- rebuild the node graph ----------
const scene = root.getDefaultScene();
const meshNode = root.listNodes().find((n) => n.getMesh());
for (const n of [...scene.listChildren()]) scene.removeChild(n);
for (const n of root.listNodes()) for (const c of [...n.listChildren()]) n.removeChild(c);
for (const n of root.listNodes()) if (!joints.includes(n) && n !== meshNode) n.dispose();
const wolf = doc.createNode('Wolf');
scene.addChild(wolf);
meshNode.setName('wolf_body').setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
meshNode.getMesh().setName('wolf_body');
wolf.addChild(meshNode);
const Wn = new Map();
for (const n of order) {
  const b = B.get(n), node = b.node, pn = parentOf.get(n);
  node.setName(n);
  const Wm = new THREE.Matrix4().compose(P2.get(n), b.q, V3(1, 1, 1));
  Wn.set(n, Wm);
  const L = pn ? Wn.get(pn).clone().invert().multiply(Wm) : Wm.clone();
  const p = V3(), q = new THREE.Quaternion(); L.decompose(p, q, V3());
  node.setTranslation(p.toArray()).setRotation(q.normalize().toArray()).setScale([1, 1, 1]);
  if (pn) B.get(pn).node.addChild(node); else wolf.addChild(node);
}
const ibmNew = new Float32Array(joints.length * 16);
joints.forEach((j, i) => Wn.get(j.getName()).clone().invert().toArray(ibmNew, i * 16));
skin.getInverseBindMatrices().setArray(ibmNew);
skin.setSkeleton(B.get('pelvis').node);
POS.setArray(pos); NRM.setArray(nrm);

// ---------- material / textures ----------
const mat = prim.getMaterial();
mat.setName('wolf_fur');
for (const e of mat.listExtensions()) e.dispose?.();
for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_specular') ext.dispose();
mat.setMetallicFactor(0).setRoughnessFactor(0.92);
const swap = (tex, file) => { if (tex && existsSync(file)) tex.setImage(readFileSync(file)).setMimeType('image/png'); };
swap(mat.getBaseColorTexture(), 'tex/wolf_base.png');
swap(mat.getNormalTexture(), 'tex/wolf_normal.png');
for (const t of root.listTextures()) if (t !== mat.getBaseColorTexture() && t !== mat.getNormalTexture()) t.dispose();
await io.write('wolf_base.glb', doc);

const top = (z0, z1) => { let m = 0; for (let i = 0; i < nv; i++) if (pos[i * 3 + 2] > z0 && pos[i * 3 + 2] < z1) m = Math.max(m, pos[i * 3 + 1]); return m; };
const bb = new THREE.Box3(); for (let i = 0; i < nv; i++) bb.expandByPoint(V3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
console.log(JSON.stringify({ scale: SCALE, withers: +top(P2.get('spine_03').z - 0.05, P2.get('spine_03').z + 0.12).toFixed(3), box: [bb.min.toArray(), bb.max.toArray()].map((v) => v.map((x) => +x.toFixed(3))),
  joints: Object.fromEntries(order.map((n) => [n, P2.get(n).toArray().map((x) => +x.toFixed(3))])) }));
