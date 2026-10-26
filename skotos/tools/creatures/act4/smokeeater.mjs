// The Smoke-eater (Καπνοφάγος): "Lesser Cyclops Variant Rig" by SuperKapoo913 (DM-913), sketchfab.com/SuperKapoo913,
// CC-BY 4.0 -> src/assets/creatures/smokeeater.glb. A gaunt, long-limbed night-lurker with one empty eye socket.
// The source rig is an IK rig under a mirrored armature (hands and feet hang off the root, the chest and the head off
// IK controls), so it is rebuilt here as a clean FK skeleton of its 60-odd deform bones: every bind frame is the
// identity at the bone's T-pose position (character space: Y up, facing +Z, metres), so the skinning matrices are pure
// rotations about each joint and nothing is mirrored. Its one showcase clip (Lurk) only lends the rest pose: the spine,
// neck and head curl of its crouch, made symmetric. Every clip is made here, procedurally on its own bones: the trunk
// by FK (rotations about character-space axes), the arms and legs by two-bone IK onto planted hand and foot targets,
// so hands and feet stay on the ground through the crawl.
// 18k triangles are thinned to 9k. The tan skin is graded to charcoal and soot (metal-free, rough). A second material,
// 'throat', covers the head, neck and rib cage and carries the ember mask: the eye socket and the mouth burn, the front of
// the throat glows through the skin and the folds of the neck and the grooves between the ribs show the fire inside.
// Its emissiveIntensity 1 (the creatures.js breathing loop) is a dull smoulder; about 8 is the full Gorged ember.
// An empty 'maw' under the head bone marks the mouth (where the smoke stream goes in).
// Clips: idle, walk, run, consume (2.5 s loop), attack (lunge and rake), attack2 (0.7 s crouch, grab-leap), hit, die.
// usage: node smokeeater.mjs [source.glb] [out.glb] [--dbg=<path> also writes an uncompressed copy and the maps as PNG]
// It prints per clip: the IK reach used (over 1 would leave a hand or foot short of its mark), the lowest skin point
// (below 0 is through the ground), the highest, and the worst edge stretch against the T-pose.
import { MeshoptSimplifier } from 'meshoptimizer';
import { statSync } from 'node:fs';
import { simplifyPrim } from '../../envlib.mjs';
import { load, locals, worlds, finish, dropClip, X, Y, Z, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/smokeeater/model.glb', OUT = new URL('../../../src/assets/creatures/smokeeater.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7); // --only=rest: no clips (posing the rest stance)
const deg = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Qa = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a * deg);

const doc = await load(SRC);
const R = doc.getRoot(), buf = R.listBuffers()[0];
const skinNode = R.listNodes().find((n) => n.getSkin() && n.getMesh());
const skin = skinNode.getSkin(), sJoints = skin.listJoints(), sIbm = skin.getInverseBindMatrices().getArray();
const sIdx = new Map(sJoints.map((j, i) => [j.getName().replace(/_\d+$/, ''), i]));
const lurk = R.listAnimations()[0];

// ---------- 1. the new skeleton: [name, source bone, parent] ----------
const TABLE = [['hips', 'Pelvis', null]];
for (const s of ['L', 'R']) {
  TABLE.push([`pelvis_${s}`, `Pelvis.${s}`, 'hips'], [`thigh_${s}`, `Thigh.${s}`, `pelvis_${s}`], [`knee_${s}`, `Knee.${s}`, `thigh_${s}`], [`shin_${s}`, `Shin.${s}`, `knee_${s}`],
    [`foot_${s}`, `Foot.${s}`, `shin_${s}`], [`toes_${s}`, `Toes.${s}`, `foot_${s}`]);
}
TABLE.push(['spine1', 'Spine1', 'hips'], ['spine2', 'Spine2', 'spine1'], ['spine3', 'Spine3', 'spine2'], ['spine4', 'Spine4', 'spine3'], ['chest', 'Chest', 'spine4'],
  ['neck1', 'Neck1', 'chest'], ['neck2', 'Neck2', 'neck1'], ['neck3', 'Neck3', 'neck2'], ['neck4', 'Neck4', 'neck3'], ['head', 'Head', 'neck4'], ['jaw', 'jaw', 'head']);
const FINGERS = [['index', 'IndexFinger', 'IndexFingerBase'], ['middle', 'MFinger', 'MFingerBase'], ['ring', 'RingFinger', 'RingFingerBase'], ['pinky', 'Pinky', 'PinkyBase']];
for (const s of ['L', 'R']) {
  TABLE.push([`shoulder_${s}`, `Shoulder.${s}`, 'chest'], [`upperarm_${s}`, `UpperArm.${s}`, `shoulder_${s}`], [`elbow_${s}`, `Elbow.${s}`, `upperarm_${s}`],
    [`forearm_${s}`, `ForeArm.${s}`, `elbow_${s}`], [`hand_${s}`, `Hand.${s}`, `forearm_${s}`]);
  for (const [f, src, base] of FINGERS) TABLE.push([`${f}0_${s}`, `${base}.${s}`, `hand_${s}`], [`${f}1_${s}`, `${src}1.${s}`, `${f}0_${s}`], [`${f}2_${s}`, `${src}2.${s}`, `${f}1_${s}`], [`${f}3_${s}`, `${src}3.${s}`, `${f}2_${s}`]);
  TABLE.push([`thumb1_${s}`, `Thumb1.${s}`, `hand_${s}`], [`thumb2_${s}`, `Thumb2.${s}`, `thumb1_${s}`], [`thumb3_${s}`, `Thumb3.${s}`, `thumb2_${s}`]);
}
const NJ = TABLE.length, JI = new Map(TABLE.map((r, i) => [r[0], i]));
const parentIdx = TABLE.map((r) => (r[2] ? JI.get(r[2]) : -1));
for (const [n, s] of TABLE) if (!sIdx.has(s)) throw new Error('no source bone ' + s + ' for ' + n);

// source space -> character space: turned to face +Z (the source faces -Z), metres
const K = 0.0315;
const TRIS = 9000;
const HEIGHT = 1.18;            // hunched (the rest crouch), metres: the whole rig is scaled to it at the end
const EMBER = 0.12;             // throat emissive factor: intensity 1 is a dull smoulder, about 8 is the full Gorged ember
const CQ = Qa(Y, 180);
const toChar = (v) => v.clone().applyQuaternion(CQ).multiplyScalar(K);
const bindSrc = TABLE.map(([, s]) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(sIbm, sIdx.get(s) * 16).invert()));
const bindPos = bindSrc.map(toChar);                                           // T-pose joint positions, character space
const offs = bindPos.map((p, i) => (parentIdx[i] < 0 ? p.clone() : p.clone().sub(bindPos[parentIdx[i]]))); // rigid bone offsets

// ---------- 2. the skinned mesh in character space, on the new joints ----------
const prim = skinNode.getMesh().listPrimitives()[0];
{
  const remap = new Uint16Array(sJoints.length);
  TABLE.forEach(([, s], i) => { remap[sIdx.get(s)] = i; });
  const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
  const n = P.getCount(), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), jo = new Uint16Array(n * 4), wo = new Float32Array(n * 4), e = [], we = [];
  for (let i = 0; i < n; i++) {
    toChar(V(...P.getElement(i, e))).toArray(pos, i * 3);
    V(...N.getElement(i, e)).applyQuaternion(CQ).normalize().toArray(nor, i * 3);
    J.getElement(i, e); W.getElement(i, we);
    let s = 0; for (let k = 0; k < 4; k++) { jo[i * 4 + k] = we[k] > 0 ? remap[e[k]] : 0; wo[i * 4 + k] = we[k]; s += we[k]; }
    for (let k = 0; k < 4; k++) wo[i * 4 + k] /= s;
  }
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf));
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf));
  prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(jo).setBuffer(buf));
  prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(wo).setBuffer(buf));
  for (const s of ['TANGENT', 'TEXCOORD_1', 'TEXCOORD_2', 'TEXCOORD_3']) prim.setAttribute(s, null);
  // the source's triangles turn the wrong way round their (outward) normals: its mirrored armature flipped them back
  // in the viewer. Without the mirror they are re-wound.
  const I = prim.getIndices().getArray().slice();
  for (let t = 0; t < I.length; t += 3) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; }
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(I)).setBuffer(buf));
}

// thinned from 18k to about 9k triangles (UV seams kept)
await MeshoptSimplifier.ready;
{
  const before = prim.getIndices().getCount() / 3;
  const mode = simplifyPrim(prim, TRIS / before, 0.02);
  console.log('simplify', before, '->', prim.getIndices().getCount() / 3, mode, 'vertices', prim.getAttribute('POSITION').getCount());
}

// ---------- 3. the rest pose: the Lurk crouch's trunk, made symmetric ----------
// a joint's world rotation in the source pose, as a rotation of its (identity) bind frame in character space
const LURK_T = 0;
const srcRot = (() => {
  const W = worlds(doc, locals(doc, lurk, LURK_T));
  return TABLE.map(([, s]) => {
    const m = W.get(sJoints[sIdx.get(s)]).clone().multiply(new THREE.Matrix4().fromArray(sIbm, sIdx.get(s) * 16));
    const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3());
    return CQ.clone().multiply(q).multiply(CQ.clone().invert());
  });
})();
const srcPos = (() => {
  const W = worlds(doc, locals(doc, lurk, LURK_T));
  return TABLE.map(([, s]) => toChar(new THREE.Vector3().setFromMatrixPosition(W.get(sJoints[sIdx.get(s)]))));
})();
const mirrorQ = (q) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);          // reflection through the x = 0 plane
const other = (name) => name.replace(/_L$/, '_#').replace(/_R$/, '_L').replace(/_#$/, '_R');

// world rotations of the source crouch: the trunk made symmetric (each joint halfway to its mirror image), the limbs
// from the hand that is on the ground (the right one; the left is its mirror image)
const lurkW = srcRot.map((q) => q.clone());
for (let i = 0; i < NJ; i++) {
  const n = TABLE[i][0];
  if (!/_[LR]$/.test(n)) lurkW[i] = srcRot[i].clone().slerp(mirrorQ(srcRot[i]), 0.5);
  else if (/_L$/.test(n)) lurkW[i] = mirrorQ(srcRot[JI.get(other(n))]);
}

// ---------- FK ----------
// local rotations from world rotations; positions follow the rigid bone offsets
const toLocal = (Wq) => Wq.map((q, i) => (parentIdx[i] < 0 ? q.clone() : Wq[parentIdx[i]].clone().invert().multiply(q)));
function fk(Lq, hipsPos) {
  const Wq = new Array(NJ), Wp = new Array(NJ);
  for (let i = 0; i < NJ; i++) {
    const p = parentIdx[i];
    if (p < 0) { Wq[i] = Lq[i].clone(); Wp[i] = hipsPos.clone(); }
    else { Wq[i] = Wq[p].clone().multiply(Lq[i]); Wp[i] = Wp[p].clone().add(offs[i].clone().applyQuaternion(Wq[p])); }
  }
  return { Wq, Wp };
}
// skinned vertex positions (every step-th) for a posed skeleton: bind frames are identity, so each joint's skinning
// transform is v -> Wq (v - bind) + Wp
function skinned(Wq, Wp, step = 1) {
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
  const out = [], e = [], je = [], we = [], v = new THREE.Vector3();
  for (let i = 0; i < P.getCount(); i += step) {
    P.getElement(i, e); J.getElement(i, je); W.getElement(i, we);
    const acc = new THREE.Vector3();
    for (let k = 0; k < 4; k++) { if (!we[k]) continue; v.fromArray(e).sub(bindPos[je[k]]).applyQuaternion(Wq[je[k]]).add(Wp[je[k]]); acc.addScaledVector(v, we[k]); }
    out.push(acc);
  }
  return out;
}
const boxOf = (pts) => new THREE.Box3().setFromPoints(pts);

// ---------- two-bone IK (three bones: the short elbow and knee bones take half of the bend) ----------
// bind frames of the limb segments: the straight limb's direction and the hinge axis about which it flexes (a negative
// turn about the hinge is the natural bend: the forearm comes forward, the shin goes back)
const LIMBS = {};
for (const s of ['L', 'R']) {
  const sg = s === 'L' ? 1 : -1;
  LIMBS['arm' + s] = { chain: [`upperarm_${s}`, `elbow_${s}`, `forearm_${s}`], end: `hand_${s}`, hinge: V(0, sg, 0), tip: `middle1_${s}` };
  LIMBS['leg' + s] = { chain: [`thigh_${s}`, `knee_${s}`, `shin_${s}`], end: `foot_${s}`, hinge: V(-1, 0, 0), tip: `toes_${s}` };
}
for (const L of Object.values(LIMBS)) {
  L.idx = L.chain.map((n) => JI.get(n)); L.e = JI.get(L.end); L.t = JI.get(L.tip);
  L.len = [L.idx[1], L.idx[2], L.e].map((i) => offs[i].length());
  L.dirB = bindPos[L.e].clone().sub(bindPos[L.idx[0]]).normalize();
  L.hingeB = L.hinge.clone().sub(L.dirB.clone().multiplyScalar(L.hinge.dot(L.dirB))).normalize();
  L.reach = L.len.reduce((a, b) => a + b, 0);
  // from the end joint (wrist, ankle) to the planted point (knuckles, ball of the foot), in the end bone's bind frame
  L.tipOff = bindPos[L.t].clone().sub(bindPos[L.e]);
}
const frameQ = (d, h) => { const m = new THREE.Matrix4().makeBasis(d, h, d.clone().cross(h)); return new THREE.Quaternion().setFromRotationMatrix(m); };
// the planar chain bent by beta (split evenly over the two hinges): where its end lands, first segment along +u
function chainEnd(len, beta) {
  let x = 0, y = 0, phi = 0;
  for (let k = 0; k < 3; k++) { x += len[k] * Math.cos(phi); y += len[k] * Math.sin(phi); phi -= beta / 2; }
  return [x, y];
}
// world rotations of the three segments that put the end joint on target, the bend bulging towards pole
function solveIK(L, root, target, pole) {
  const d = target.clone().sub(root), D = Math.min(d.length(), L.reach * 0.9995);
  const u = d.clone().normalize();
  const w = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  let lo = 0, hi = Math.PI * 0.985;
  for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2, [x, y] = chainEnd(L.len, m); if (Math.hypot(x, y) > D) lo = m; else hi = m; }
  const beta = (lo + hi) / 2, [ex, ey] = chainEnd(L.len, beta), alpha = -Math.atan2(ey, ex);
  const h = u.clone().cross(w).normalize();
  const B = frameQ(L.dirB, L.hingeB).invert();
  return [0, 1, 2].map((k) => {
    const phi = alpha - (beta / 2) * k;
    const dir = u.clone().multiplyScalar(Math.cos(phi)).add(w.clone().multiplyScalar(Math.sin(phi)));
    return frameQ(dir, h).multiply(B);
  });
}

// ---------- posing ----------
// spec: { hips: [dx, dy, dz] (from the rest hips), fk: { bone: [[axis, deg], ...] } (turns about character-space axes,
// as in lib.mjs makeClip: applied in the bone's rest frame so the children follow), limbs: { armL: { at: plant point,
// rot: end bone world rotation, pole } } } -> local rotations and the hips position
let baseL = null, baseW = null, baseHips = null, stretch = 0, stretchBy = '';
function pose(spec = {}) {
  const Lq = baseL.map((q) => q.clone());
  for (const [bn, rots] of Object.entries(spec.fk || {})) {
    const i = JI.get(bn); if (i === undefined) throw new Error('no bone ' + bn);
    const inv = baseW[i].clone().invert();
    for (const [axis, a] of rots) if (a) Lq[i].multiply(Qa(axis.clone().applyQuaternion(inv).normalize(), a));
  }
  const hips = baseHips.clone().add(V(...(spec.hips || [0, 0, 0])));
  let { Wq, Wp } = fk(Lq, hips);
  for (const [ln, ls] of Object.entries(spec.limbs || {})) {
    const L = LIMBS[ln];
    const endTarget = ls.at.clone().sub(L.tipOff.clone().applyQuaternion(ls.rot));
    const sr = endTarget.distanceTo(Wp[L.idx[0]]) / L.reach;
    if (sr > stretch) { stretch = sr; stretchBy = ln; }
    const seg = solveIK(L, Wp[L.idx[0]], endTarget, ls.pole);
    const par = parentIdx[L.idx[0]];
    Lq[L.idx[0]] = Wq[par].clone().invert().multiply(seg[0]);
    Lq[L.idx[1]] = seg[0].clone().invert().multiply(seg[1]);
    Lq[L.idx[2]] = seg[1].clone().invert().multiply(seg[2]);
    Lq[L.e] = seg[2].clone().invert().multiply(ls.rot);
    ({ Wq, Wp } = fk(Lq, hips));
  }
  return { Lq, hips, Wq, Wp };
}
baseW = lurkW; baseL = toLocal(lurkW); baseHips = srcPos[0].clone();

// ---------- the rest stance: the crouch on all fours ----------
// plant rotations: the Lurk's grounded hand (fingers splayed a little wider) and its feet up on their toes
const HAND_ROT = { L: Qa(Y, 12).multiply(lurkW[JI.get('hand_L')]), R: Qa(Y, -12).multiply(lurkW[JI.get('hand_R')]) };
const FOOT_ROT = { L: lurkW[JI.get('foot_L')].clone(), R: lurkW[JI.get('foot_R')].clone() };
const ST = {
  hipsUp: 0.07, pitch: 13,                  // hips raised from the Lurk squat, the trunk tipped forward (degrees)
  hand: { x: 0.34, z: 0.6 }, foot: { x: 0.13, z: -0.02 },
  armPole: (sg) => V(0.75 * sg, 0.25, -1), legPole: (sg) => V(0.55 * sg, 0.45, 1)
};
let GY = 0; // the ground: everything planted sits this high above the plant points (found below)
const plantH = (s, dz = 0, dx = 0, lift = 0) => V((s === 'L' ? 1 : -1) * (ST.hand.x + dx), GY + lift, ST.hand.z + dz);
const plantF = (s, dz = 0, dx = 0, lift = 0) => V((s === 'L' ? 1 : -1) * (ST.foot.x + dx), GY + lift, ST.foot.z + dz);
// merges pose specs: hips offsets add, FK turns append, limbs override
function merge(...specs) {
  const o = { hips: [0, 0, 0], fk: {}, limbs: {} };
  for (const s of specs) {
    if (!s) continue;
    if (s.hips) for (let k = 0; k < 3; k++) o.hips[k] += s.hips[k];
    for (const [b, r] of Object.entries(s.fk || {})) (o.fk[b] ||= []).push(...r);
    Object.assign(o.limbs, s.limbs || {});
  }
  return o;
}
const restSpec = () => ({
  hips: [0, ST.hipsUp, 0],
  fk: { hips: [[X, ST.pitch]], neck1: [[X, -6]], neck3: [[X, -6]], head: [[X, -8]] },
  limbs: {
    armL: { at: plantH('L'), rot: HAND_ROT.L, pole: ST.armPole(1) }, armR: { at: plantH('R'), rot: HAND_ROT.R, pole: ST.armPole(-1) },
    legL: { at: plantF('L'), rot: FOOT_ROT.L, pole: ST.legPole(1) }, legR: { at: plantF('R'), rot: FOOT_ROT.R, pole: ST.legPole(-1) }
  }
});
// the ground: the lowest skin point of the rest stance goes to y = 0 (the hips and every plant point rise together)
{
  const r = pose(restSpec()), b = boxOf(skinned(r.Wq, r.Wp, 2));
  GY = -b.min.y; baseHips = baseHips.clone().add(V(0, GY, 0));
}
stretch = 0;
const REST = pose(restSpec());
let restL = REST.Lq, restHips = REST.hips;
const REST_BOX = boxOf(skinned(REST.Wq, REST.Wp, 1));
const SCALE = HEIGHT / REST_BOX.max.y;
console.log('rest: ground', GY.toFixed(3), 'IK reach', stretch.toFixed(2), 'height', REST_BOX.max.y.toFixed(3), '-> scale', SCALE.toFixed(3));
// ---------- the new nodes, skin and rest TRS ----------
const rootNode = doc.createNode('creature');
const jNodes = TABLE.map(([n]) => doc.createNode(n));
TABLE.forEach((r, i) => { if (parentIdx[i] < 0) rootNode.addChild(jNodes[i]); else jNodes[parentIdx[i]].addChild(jNodes[i]); });
const newSkin = doc.createSkin('smokeeater').setSkeleton(jNodes[0]);
{
  const ib = new Float32Array(NJ * 16);
  bindPos.forEach((p, i) => { new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z).toArray(ib, i * 16); newSkin.addJoint(jNodes[i]); });
  newSkin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ib).setBuffer(buf));
}
const meshNode = doc.createNode('smokeeater_mesh').setMesh(skinNode.getMesh()).setSkin(newSkin);
rootNode.addChild(meshNode);
function setRest() {
  for (let i = 0; i < NJ; i++) jNodes[i].setRotation(restL[i].toArray()).setTranslation((parentIdx[i] < 0 ? restHips : offs[i]).toArray());
}
// the old tree, skin and clip go
{
  const sc = R.getDefaultScene();
  for (const k of sc.listChildren()) sc.removeChild(k);
  sc.addChild(rootNode);
  skinNode.setMesh(null).setSkin(null);
  dropClip(lurk);
  for (const n of R.listNodes()) if (n !== rootNode && !jNodes.includes(n) && n !== meshNode) n.dispose();
  skin.dispose();
}
setRest();

// ---------- clips ----------
const TAU = Math.PI * 2;
const clipInfo = {};
// samples fn(t, dur) -> pose spec at fps and writes every joint that moves (local rotations) and the hips position
function writeClip(name, dur, fn, o = {}) {
  const fps = o.fps ?? 30, n = Math.max(2, Math.round(dur * fps) + 1);
  stretch = 0;
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(pose(fn(Math.min(dur, i / fps), dur)));
  if (o.loop) frames[n - 1] = frames[0];
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = Math.min(dur, i / fps);
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  const add = (node, path, arr, type) => {
    const smp = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp));
  };
  for (let j = 0; j < NJ; j++) {
    if (!frames.some((f) => 1 - Math.abs(f.Lq[j].dot(restL[j])) > 1e-7)) continue;
    const arr = new Float32Array(n * 4); let prev = null;
    for (let i = 0; i < n; i++) { const q = frames[i].Lq[j].clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; }
    add(jNodes[j], 'rotation', arr, 'VEC4');
  }
  const tr = new Float32Array(n * 3); frames.forEach((f, i) => f.hips.toArray(tr, i * 3));
  add(jNodes[0], 'translation', tr, 'VEC3');
  // the lowest and highest skin points over the clip (feet through the floor, a body left hovering)
  let lo = 1e9, hi = -1e9, loAt = '', hiAt = '';
  const Jt = prim.getAttribute('JOINTS_0'), je = [];
  for (let i = 0; i < n; i += Math.max(1, Math.round(n / 30))) {
    const pts = skinned(frames[i].Wq, frames[i].Wp, 3);
    pts.forEach((p, k) => { if (p.y < lo) { lo = p.y; Jt.getElement(k * 3, je); loAt = TABLE[je[0]][0] + '@' + (i / fps).toFixed(2); } if (p.y > hi) { hi = p.y; Jt.getElement(k * 3, je); hiAt = TABLE[je[0]][0] + '@' + (i / fps).toFixed(2); } });
  }
  // skin distortion: the worst edge stretch against the T-pose (torn joints, candy-wrapper wrists; folds squash, which shows less)
  let worst = 1, worstAt = '';
  {
    const I = prim.getIndices().getArray(), P = prim.getAttribute('POSITION'), e = [], f = [];
    const bind = []; for (let v = 0; v < P.getCount(); v++) bind.push(V(...P.getElement(v, e)));
    for (let i = 0; i < n; i += Math.max(1, Math.round(n / 12))) {
      const pts = skinned(frames[i].Wq, frames[i].Wp, 1);
      for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
        const l0 = bind[a].distanceTo(bind[b]); if (l0 < 0.004) continue;
        const r = pts[a].distanceTo(pts[b]) / l0;
        if (r > worst) { worst = r; Jt.getElement(a, je); worstAt = TABLE[je[0]][0] + '@' + (i / fps).toFixed(2); }
      }
    }
  }
  clipInfo[name] = { dur: +dur.toFixed(3), stretch: +stretch.toFixed(3) + ' ' + stretchBy, lo: +lo.toFixed(3) + ' ' + loAt, hi: +hi.toFixed(3) + ' ' + hiAt, edge: +worst.toFixed(2) + ' ' + worstAt };
  return { anim, frames };
}

// a limb's plant point over a step cycle: stance ph in [0, duty) slides it back (the body moves on over it), the swing
// carries it forward again in an arc. Returns the offset along Z, the lift and the swing weight (0 on the ground).
function step(ph, duty, sweep, lift, late = 0.8) {
  ph = ((ph % 1) + 1) % 1;
  if (ph < duty) return { dz: sweep * (0.5 - ph / duty), dy: 0, sw: 0, s: -1 };
  const s = (ph - duty) / (1 - duty), e = s * s * (3 - 2 * s);
  return { dz: sweep * (e - 0.5), dy: lift * (late ? Math.sin(Math.PI * Math.pow(s, late)) : Math.sqrt(Math.sin(Math.PI * s))), sw: Math.sin(Math.PI * s), s };
}
// the plant rotations, curled while the limb is in the air (the hand rolls up off the heel of the palm, the toes point down)
const handRot = (s, curl, twist = 0) => Qa(X, curl).multiply(Qa(Y, (s === 'L' ? 1 : -1) * twist)).multiply(HAND_ROT[s]);
const footRot = (s, curl) => Qa(X, curl).multiply(FOOT_ROT[s]);
const fingers = (s, a, spread = 0) => {
  const o = {};
  for (const [f] of FINGERS) { o[`${f}1_${s}`] = [[X, a * 0.6]]; o[`${f}2_${s}`] = [[X, a]]; o[`${f}3_${s}`] = [[X, a * 0.8]]; }
  if (spread) { const sg = s === 'L' ? 1 : -1; o[`index1_${s}`].push([Y, -sg * spread]); o[`pinky1_${s}`].push([Y, sg * spread]); o[`ring1_${s}`].push([Y, sg * spread * 0.4]); }
  o[`thumb2_${s}`] = [[X, a * 0.4]];
  return { fk: o };
};

// walk and run: four limbs on a step cycle each (phase per limb), the trunk rolling and undulating with them
function gait(g) {
  return (t) => {
    const p = t / g.T;
    const L = {}, extra = [];
    for (const [ln, s, ph0, fore] of [['armL', 'L', g.ph.LF, 1], ['armR', 'R', g.ph.RF, 1], ['legL', 'L', g.ph.LH, 0], ['legR', 'R', g.ph.RH, 0]]) {
      const st = step(p + ph0, g.duty, fore ? g.sweepF : g.sweepH, fore ? g.liftF : g.liftH, fore ? 0 : 0.8);
      if (fore) {
        // the hand peels up off the ground curled, then opens and reaches flat for the next plant
        const curl = st.s < 0 ? 0 : bump(st.s, 0, 0.7), open = st.s < 0 ? 0 : bump(st.s, 0.5, 1);
        L[ln] = { at: plantH(s, g.foreZ + st.dz, g.foreX, st.dy), rot: handRot(s, g.curlF * curl - 12 * open), pole: ST.armPole(s === 'L' ? 1 : -1) };
        extra.push(fingers(s, g.fingerCurl * curl - 18 * open));
        // the shoulder blade reaches with the arm
        const reach = st.dz / (g.sweepF / 2), sg = s === 'L' ? 1 : -1;
        extra.push({ fk: { [`shoulder_${s}`]: [[Y, -sg * g.shoulder * reach], [Z, sg * 4 * st.sw]] } });
      } else L[ln] = { at: plantF(s, g.hindZ + st.dz, g.hindX, st.dy), rot: footRot(s, g.curlH * st.sw), pole: ST.legPole(s === 'L' ? 1 : -1) };
    }
    const ph = TAU * p;
    const bob = g.bob * Math.cos(2 * ph + g.bobPh);
    return merge(restSpec(), g.base, {
      hips: [Math.sin(ph) * g.sway, bob, 0],
      fk: {
        hips: [[Z, g.rollH * Math.sin(ph + g.ph.LH * TAU)], [Y, g.yaw * Math.sin(ph)]],
        spine2: [[Y, -g.yaw * 0.6 * Math.sin(ph)], [X, g.flex * Math.cos(ph + g.flexPh)]],
        spine4: [[Y, -g.yaw * 0.6 * Math.sin(ph)], [X, g.flex * Math.cos(ph + g.flexPh)]],
        chest: [[Z, g.rollF * Math.sin(ph + g.ph.LF * TAU)]],
        neck1: [[X, -2 * g.flex * Math.cos(ph + g.flexPh)]],
        neck2: [[Y, g.yaw * 0.5 * Math.sin(ph)], [X, -bob / g.bob * g.nod]],
        head: [[Z, -g.rollF * 0.7 * Math.sin(ph + g.ph.LF * TAU)], [X, -g.flex * 1.6 * Math.cos(ph + g.flexPh)]]
      }
    }, ...extra, { limbs: L });
  };
}

// piecewise ease (smoothstep) through [time, value] keys; values are numbers or arrays
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], f = smooth((t - t0) / (t1 - t0));
    return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * f) : a + (b - a) * f;
  }
  return keys[keys.length - 1][1];
}
const P3 = (a) => V(...a);
const HIT = {};

if (ONLY !== 'rest') {
  // idle: the hunched crouch breathing (two slow breaths a loop: back rising, ribs opening, the mouth parting), the
  // head swaying, and once a loop a twitch of the head and fingers
  const IDLE = 4.0;
  writeClip('idle', IDLE, (t) => {
    const b = Math.sin((TAU * 2 * t) / IDLE), bb = Math.max(0, b), sway = Math.sin((TAU * t) / IDLE);
    const tw = bump(t, 2.55, 2.85), tw2 = bump(t, 2.62, 2.78);
    return merge(restSpec(), {
      hips: [0.006 * sway, 0.007 * b, 0],
      fk: {
        spine3: [[X, -1.6 * b]], spine4: [[X, -1.4 * b]], chest: [[X, -1.0 * b], [Z, 1.5 * sway]],
        shoulder_L: [[Z, 1.5 * b]], shoulder_R: [[Z, -1.5 * b]],
        neck2: [[X, 2 * b], [Y, 4 * sway]], neck4: [[Z, 3 * sway]], head: [[Z, 5 * sway + 14 * tw], [Y, -9 * tw2], [X, -4 * tw]],
        jaw: [[X, 6 * bb + 4 * tw]]
      }
    }, fingers('L', -10 * tw2), fingers('R', -14 * tw));
  }, { loop: true });

  // walk: a lateral-sequence crawl (left hind, left fore, right hind, right fore), the head carried low and forward
  const WALK = { T: 0.8, speed: 1.2 };
  writeClip('walk', WALK.T, gait({
    T: WALK.T, duty: 0.66, ph: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 },
    sweepF: WALK.speed * WALK.T * 0.66, sweepH: WALK.speed * WALK.T * 0.66, liftF: 0.14, liftH: 0.09, foreZ: -0.04, hindZ: -0.04, foreX: 0, hindX: 0.01,
    curlF: 30, curlH: 25, fingerCurl: 22, shoulder: 9, bob: 0.012, bobPh: 0.6, sway: 0.02, rollH: 5, rollF: 5, yaw: 5, flex: 0.6, flexPh: 0, nod: 1.5,
    base: { hips: [0, 0.015, 0], fk: { hips: [[X, 4]], neck1: [[X, -5]], neck3: [[X, -5]], head: [[X, -8]] } }
  }), { loop: true });

  // run: a bounding gallop, both hind feet then both hands, the spine gathering and stretching, low and long
  const RUN = { T: 0.42, speed: 5.8 };
  writeClip('run', RUN.T, gait({
    T: RUN.T, duty: 0.3, ph: { LH: 0, RH: 0.07, LF: 0.5, RF: 0.57 },
    sweepF: RUN.speed * RUN.T * 0.3, sweepH: RUN.speed * RUN.T * 0.3, liftF: 0.22, liftH: 0.16, foreZ: 0.02, hindZ: -0.06, foreX: -0.02, hindX: 0.03,
    curlF: 45, curlH: 35, fingerCurl: 28, shoulder: 14, bob: 0.025, bobPh: -0.5, sway: 0.0, rollH: 3, rollF: 3, yaw: 2, flex: 3, flexPh: 0.4, nod: 2,
    base: { hips: [0, -0.045, 0.02], fk: { hips: [[X, 17]], spine3: [[X, -2]], neck1: [[X, -11]], neck3: [[X, -8]], head: [[X, -10]] } }
  }), { loop: true });

  // consume: the 2.5 s channel at a flame. It sits back on its haunches, the trunk and head raised to the fire, the mouth
  // wide; the hands come up and cup towards the flame; the body sways and the throat gulps twice a loop (a wave down the
  // neck with each swallow). It loops seamlessly: the game crossfades into it from idle.
  const CONS = 2.5;
  writeClip('consume', CONS, (t) => {
    const sw = Math.sin((TAU * t) / CONS), sw2 = Math.cos((TAU * t) / CONS), g = (k) => Math.sin((TAU * 2 * t) / CONS - k * 0.9);
    const fing = (s, ph) => fingers(s, 18 + 10 * Math.sin((TAU * 2 * t) / CONS + ph), 14);
    return merge(restSpec(), {
      hips: [0.015 * sw, -0.05, -0.06],
      fk: {
        hips: [[X, -4], [Z, 3 * sw]], spine2: [[X, -2], [Z, 2 * sw]], spine3: [[X, -2 - 1.5 * g(0)]], spine4: [[X, -2 - 1.5 * g(0)], [Y, 4 * sw2]],
        chest: [[X, -2 * g(0)]], shoulder_L: [[Z, 6], [Y, -8]], shoulder_R: [[Z, -6], [Y, 8]],
        neck1: [[X, -16 + 3 * g(1)]], neck2: [[X, -15 + 3 * g(2)], [Y, -3 * sw2]], neck3: [[X, -14 + 3 * g(3)]], neck4: [[X, -12 + 3 * g(4)]],
        head: [[X, -24 - 3 * g(5)], [Z, -5 * sw]], jaw: [[X, 30 + 6 * g(4)]]
      },
      limbs: {
        armL: { at: V(0.19 + 0.02 * sw, 0.5 + 0.03 * g(0), 0.72), rot: handRot('L', -70, -20), pole: V(1, -0.6, -0.4) },
        armR: { at: V(-0.19 + 0.02 * sw, 0.5 + 0.03 * g(0), 0.72), rot: handRot('R', -70, -20), pole: V(-1, -0.6, -0.4) }
      }
    }, fing('L', 0), fing('R', 1.3));
  }, { loop: true });

  // attack: a lunge and a raking claw. The right arm draws up and back by the head (claws out, the mouth opening) while
  // the weight rocks back, then the body lunges and the claw rakes down and across to the ground in front.
  const ATK = 1.1;
  HIT.attack = 0.47;
  writeClip('attack', ATK, (t) => {
    const lunge = kf(t, [[0, 0], [0.3, -1], [0.5, 1], [0.62, 1], [1.1, 0]]);
    const hR = kf(t, [[0, [-ST.hand.x, GY, ST.hand.z]], [0.3, [-0.42, 0.98, 0.36]], [0.5, [-0.06, GY + 0.12, 0.98]], [0.62, [-0.02, GY + 0.1, 0.96]], [0.86, [-0.2, GY + 0.08, 0.76]], [1.1, [-ST.hand.x, GY, ST.hand.z]]]);
    const curl = kf(t, [[0, 0], [0.3, -75], [0.45, -10], [0.52, 10], [0.62, 12], [1.1, 0]]);
    const claw = kf(t, [[0, 0], [0.28, -20], [0.42, -25], [0.52, 30], [0.7, 22], [1.1, 0]]);
    const lb = Math.max(0, lunge), lf = Math.max(0, -lunge);
    return merge(restSpec(), {
      hips: [0, -0.025 * lf - 0.02 * lb, -0.07 * lf + 0.2 * lb],
      fk: {
        hips: [[X, -7 * lf + 10 * lb], [Y, 6 * lf - 4 * lb]], spine3: [[Y, 8 * lf - 10 * lb]], chest: [[Z, -5 * lf + 6 * lb]],
        shoulder_R: [[Z, -12 * lf], [Y, 16 * lb]], neck2: [[X, -6 * lf + 4 * lb]], head: [[X, -10 * lf + 6 * lb], [Y, -10 * lb]],
        jaw: [[X, kf(t, [[0, 0], [0.3, 22], [0.5, 30], [0.75, 8], [1.1, 0]])]]
      },
      limbs: { armR: { at: P3(hR), rot: handRot('R', curl, 25 * lf), pole: V(-1, 0.25 + 0.5 * lf, -0.6) } }
    }, fingers('R', claw, 18 * lf));
  });

  // attack2: the grab at the Cradle. A long crouch (0.7 s: haunches down, back bunched, a shiver building, the head
  // fixed on the target), then the leap: legs drive, both arms reach, the hands snap shut on the grab, it lands on its
  // hands and gathers back into the crouch. The game moves it along the 4 m line; the clip stays in place.
  const ATK2 = 1.75, WIND = 0.7;
  // the strike is the launch (0.7 s): ai.js snuffer plays attack2 with hitIn 0.7 and starts the 4 m dash then, so the clip
  // runs at speed 1 and the leap leaves the ground with the dash (at 1.0, the grab, it would run 1.43x and land mid-dash)
  HIT.attack2 = WIND;
  writeClip('attack2', ATK2, (t) => {
    const crouch = kf(t, [[0, 0], [0.45, 1], [WIND, 1], [0.8, 0], [1.3, 0.55], [1.75, 0]]);
    const shiv = ramp(t, 0.15, WIND) * (1 - ramp(t, WIND, WIND + 0.05)) * Math.sin(t * 70);
    const fly = kf(t, [[0, 0], [WIND, 0], [0.84, 1], [1.08, 1], [1.2, 0], [1.75, 0]]);
    const air = env(t, 0.76, 0.84, 1.1, 1.18);
    const hipsZ = kf(t, [[0, 0], [WIND, -0.08], [0.84, 0.22], [1.08, 0.3], [1.24, 0.12], [1.75, 0]]);
    const hipsY = kf(t, [[0, 0], [WIND, -0.1], [0.84, 0.13], [1.0, 0.16], [1.18, 0.02], [1.3, -0.05], [1.75, 0]]);
    const reach = kf(t, [[0, 0], [WIND, 0], [0.86, 1], [0.97, 1], [1.03, 0], [1.2, 0], [1.75, 0]]);
    const grab = kf(t, [[0, 0], [0.88, 0], [1.0, 1], [1.08, 1], [1.18, 0]]);
    const L = {};
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      // planted -> reaching out high -> snapping together -> down onto the ground again
      const hx = kf(t, [[0, ST.hand.x], [WIND, ST.hand.x + 0.04], [0.86, 0.34], [0.97, 0.3], [1.03, 0.1], [1.12, 0.2], [1.2, ST.hand.x], [1.75, ST.hand.x]]);
      const hy = kf(t, [[0, GY], [WIND, GY], [0.86, 0.62], [0.97, 0.6], [1.03, 0.45], [1.12, 0.22], [1.2, GY], [1.75, GY]]);
      const hz = kf(t, [[0, ST.hand.z], [WIND, ST.hand.z + 0.05], [0.86, 1.25], [0.97, 1.3], [1.03, 1.2], [1.2, ST.hand.z + 0.3], [1.75, ST.hand.z]]);
      L['arm' + s] = { at: V(sg * hx, hy, hz), rot: handRot(s, kf(t, [[0, 0], [WIND, 0], [0.86, -60], [0.97, -55], [1.03, 10], [1.15, 0], [1.75, 0]]), 15 * reach), pole: V(sg * 0.8, 0.2 - 0.6 * fly, -1) };
      // the feet push off, trail behind in the air and land back under the body
      const fz = kf(t, [[0, 0], [0.8, -0.02], [0.95, -0.4], [1.1, -0.25], [1.24, 0.08], [1.75, 0]]);
      const fy = kf(t, [[0, 0], [0.8, 0], [0.95, 0.2], [1.1, 0.16], [1.24, 0], [1.75, 0]]);
      L['leg' + s] = { at: plantF(s, fz, 0.02 * air, fy), rot: footRot(s, 40 * air), pole: ST.legPole(sg) };
    }
    return merge(restSpec(), {
      hips: [0, hipsY, hipsZ],
      fk: {
        hips: [[X, 6 * crouch + 8 * fly + 1.2 * shiv]], spine2: [[X, 7 * crouch - 2 * fly]], spine3: [[X, 6 * crouch - 2 * fly + 1.0 * shiv]], spine4: [[X, -3 * fly]],
        shoulder_L: [[Z, 8 * crouch], [Y, -14 * reach]], shoulder_R: [[Z, -8 * crouch], [Y, 14 * reach]],
        neck1: [[X, -12 * crouch - 10 * fly]], neck3: [[X, -8 * crouch - 6 * fly]], head: [[X, -10 * crouch - 8 * fly + 1.5 * shiv]], jaw: [[X, 8 * crouch + 26 * fly]]
      },
      limbs: L
    }, fingers('L', -25 * reach + 70 * grab * (1 - reach), 20 * reach), fingers('R', -25 * reach + 70 * grab * (1 - reach), 20 * reach));
  });

  // hit: the head snaps back and away, the trunk recoils and twists, hands and feet stay put
  writeClip('hit', 0.45, (t) => {
    const k = env(t, 0, 0.07, 0.14, 0.45), j = Math.exp(-t * 9) * Math.sin(t * 40);
    return merge(restSpec(), {
      hips: [0.01 * k, 0.015 * k, -0.05 * k],
      fk: { hips: [[X, -5 * k], [Y, -5 * k]], spine3: [[Y, -8 * k], [Z, 4 * k]], chest: [[X, -3 * k]], neck1: [[X, 6 * k]], neck2: [[X, -8 * k], [Z, 3 * j]], head: [[X, -12 * k], [Z, 12 * k], [Y, 8 * k]], jaw: [[X, 14 * k]] },
      limbs: {
        armL: { at: plantH('L', -0.1 * k, 0.03 * k, 0.12 * k), rot: handRot('L', -25 * k), pole: ST.armPole(1) },
        armR: { at: plantH('R', -0.14 * k, -0.02 * k, 0.16 * k), rot: handRot('R', -30 * k), pole: ST.armPole(-1) }
      }
    }, fingers('L', -15 * k, 10 * k), fingers('R', -15 * k, 10 * k));
  });

  // die: a recoil, the arms buckle and it pitches onto its chest, the hips sag and roll a little to its left, the legs
  // splay frog-like, the head lolls to the side with the mouth slack; the fingers curl last
  const DIE = 1.8, DIE_PITCH = 50, DIE_DROP = 0.15;
  let dieLift = 0;
  // the dead hands lie along their arms, the left palm down, the right turned palm up (its fingers curl into a claw)
  const DEAD_HAND = {};
  for (const [s, yaw] of [['L', 42], ['R', -110]]) {
    const d = bindPos[JI.get(`middle1_${s}`)].clone().sub(bindPos[JI.get(`hand_${s}`)]).applyQuaternion(HAND_ROT[s]);
    let q = Qa(Y, yaw - Math.atan2(d.x, d.z) / deg).multiply(HAND_ROT[s]);
    if (s === 'R') q = Qa(V(Math.sin(yaw * deg), 0, Math.cos(yaw * deg)), 180).multiply(q);
    DEAD_HAND[s] = q;
  }
  const dieFn = (t) => {
    const rec = env(t, 0, 0.12, 0.18, 0.4), fall = ramp(t, 0.18, 0.8), sag = ramp(t, 0.4, 1.15), loll = ramp(t, 0.7, 1.5), curl = ramp(t, 1.0, 1.75);
    const L = {};
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1;
      const hx = kf(t, [[0, ST.hand.x], [0.15, ST.hand.x + 0.03], [0.8, s === 'L' ? 0.62 : 0.85], [1.8, s === 'L' ? 0.66 : 0.9]]);
      const hz = kf(t, [[0, ST.hand.z], [0.15, ST.hand.z - 0.06], [0.8, s === 'L' ? 1.3 : 0.6], [1.8, s === 'L' ? 1.36 : 0.55]]);
      const hy = kf(t, [[0, GY], [0.12, GY + 0.1], [0.4, GY + 0.05], [0.8, GY], [1.8, GY]]);
      L['arm' + s] = { at: V(sg * hx, hy, hz), rot: handRot(s, -15 * rec).slerp(DEAD_HAND[s], fall), pole: V(sg * 1, 0.3 * fall, -1 + 0.5 * fall) };
      const fx = kf(t, [[0, 0], [0.4, 0], [1.15, s === 'L' ? 0.32 : 0.36]]), fz = kf(t, [[0, 0], [0.4, 0], [1.15, s === 'L' ? -0.4 : -0.42]]);
      L['leg' + s] = { at: plantF(s, fz, fx, 0), rot: Qa(X, -60 * sag).multiply(Qa(Z, -sg * 40 * sag)).multiply(footRot(s, 0)), pole: V(sg * (0.55 + 1.5 * sag), 0.45 - 0.35 * sag, 1 - 0.8 * sag) };
    }
    return merge(restSpec(), {
      hips: [0.03 * sag, -0.06 * rec - 0.12 * fall - DIE_DROP * sag + dieLift * fall, 0.1 * fall],
      fk: {
        hips: [[X, -8 * rec + DIE_PITCH * fall], [Z, 12 * sag]], spine2: [[X, -4 * fall]], spine3: [[X, -4 * fall], [Y, 6 * sag]], chest: [[X, -4 * fall]],
        neck1: [[X, -14 * rec - 26 * fall]], neck2: [[X, -20 * fall], [Y, 20 * loll]], neck3: [[X, -14 * fall]], head: [[X, -12 * rec - 6 * fall], [Z, 35 * loll], [Y, 10 * loll]],
        jaw: [[X, 18 * rec + 22 * loll]]
      },
      limbs: L
    }, fingers('L', -20 * rec - 6 * curl, 12 * rec), fingers('R', -20 * rec + 50 * curl, 12 * rec + 8 * curl));
  };
  {
    // settle: lift the body until nothing at the end lies below the ground
    const a = writeClip('die', DIE, dieFn).anim; dropClip(a);
    const end = pose(dieFn(DIE)), b = boxOf(skinned(end.Wq, end.Wp, 1));
    dieLift = Math.max(0, -b.min.y);
    delete clipInfo.die; writeClip('die', DIE, dieFn);
    console.log('die: lift', dieLift.toFixed(3), 'top at the end', (b.max.y + dieLift).toFixed(3));
  }
}
console.log(JSON.stringify(clipInfo));


// ---------- 7. charcoal skin; the throat material and its ember mask ----------
const skinMat = prim.getMaterial().setName('skin');
let EMBER_PNG = null;
const throatMat = doc.createMaterial('throat');
{
  const tex = skinMat.getBaseColorTexture();
  const src = Buffer.from(tex.getImage());
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.width, ch = info.channels;
  const blur = await sharp(src).removeAlpha().greyscale().blur(5).raw().toBuffer();
  const orig = Buffer.from(data);
  const lumAt = (k) => (0.3 * orig[k * ch] + 0.55 * orig[k * ch + 1] + 0.15 * orig[k * ch + 2]) / 255;
  // the mouth's purple lining and the black of the eye socket (the socket's walls map to the background off the island)
  const isMouth = (k) => { const r = orig[k * ch], g = orig[k * ch + 1], b = orig[k * ch + 2]; return b > g + 18 && r > g + 8; };
  // which triangles are head, neck and rib cage (more than half their skin on those bones): the throat material
  const TH = new Set(['head', 'jaw', 'neck1', 'neck2', 'neck3', 'neck4', 'chest'].map((n) => JI.get(n)));
  const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0'), Jt = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
  const I = prim.getIndices().getArray(), e = [], we = [];
  const thW = new Float32Array(P.getCount());
  for (let v = 0; v < P.getCount(); v++) { Jt.getElement(v, e); Wt.getElement(v, we); for (let k = 0; k < 4; k++) if (TH.has(e[k])) thW[v] += we[k]; }
  const tri = [[], []];
  for (let t = 0; t < I.length; t += 3) tri[(thW[I[t]] + thW[I[t + 1]] + thW[I[t + 2]]) / 3 > 0.5 ? 1 : 0].push(I[t], I[t + 1], I[t + 2]);

  // the eye socket's walls and floor: their UVs fall off the island, onto the texture's black. They are given copies of
  // their vertices mapped along a strip of the empty corner of the map instead, deeper into the socket further along
  // it, so the ember map can burn them hotter with depth whatever its resolution
  const SOCK = { u0: 0.02, u1: 0.1, v0: 0.02, v1: 0.05 };
  let nSock = 0;
  {
    const hdY = bindPos[JI.get('head')].y;
    const offIsland = (v) => { UV.getElement(v, e); const x = Math.min(N - 1, Math.floor(e[0] * N)), y = Math.min(N - 1, Math.floor(e[1] * N)); return lumAt(y * N + x) < 0.06; };
    const sock = [];
    for (let t = 0; t < tri[1].length; t += 3) {
      const vs = [tri[1][t], tri[1][t + 1], tri[1][t + 2]];
      if (vs.every(offIsland) && vs.every((v) => P.getElement(v, e)[1] > hdY)) sock.push(t);
    }
    // depth: back from the face (the rim is the socket triangles' frontmost point)
    const verts = [...new Set(sock.flatMap((t) => [tri[1][t], tri[1][t + 1], tri[1][t + 2]]))];
    const zs = verts.map((v) => P.getElement(v, e)[2]), zMax = Math.max(...zs), zMin = Math.min(...zs);
    const attrs = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'].map((n) => [n, prim.getAttribute(n)]);
    const n0 = P.getCount(), arrs = {};
    for (const [n, a] of attrs) { const k = a.getElementSize(), src = a.getArray(); arrs[n] = new src.constructor((n0 + verts.length) * k); arrs[n].set(src); }
    const map = new Map();
    verts.forEach((v, i) => {
      const nv = n0 + i; map.set(v, nv);
      for (const [n, a] of attrs) { const k = a.getElementSize(); for (let q = 0; q < k; q++) arrs[n][nv * k + q] = a.getArray()[v * k + q]; }
      const d = (zMax - P.getElement(v, e)[2]) / Math.max(1e-6, zMax - zMin);
      arrs.TEXCOORD_0[nv * 2] = SOCK.u0 + (SOCK.u1 - SOCK.u0) * (0.15 + 0.7 * d); arrs.TEXCOORD_0[nv * 2 + 1] = (SOCK.v0 + SOCK.v1) / 2;
    });
    for (const [n, a] of attrs) prim.setAttribute(n, doc.createAccessor().setType(a.getType()).setArray(arrs[n]).setBuffer(buf));
    for (const t of sock) for (let q = 0; q < 3; q++) tri[1][t + q] = map.get(tri[1][t + q]);
    nSock = sock.length;
    console.log('eye socket', sock.length, 'triangles, depth', (zMax - zMin).toFixed(3), 'm');
  }
  const P2 = prim.getAttribute('POSITION'), UV2 = prim.getAttribute('TEXCOORD_0');
  const inSock = (k) => { const x = (k % N) / N, y = Math.floor(k / N) / N; return x >= SOCK.u0 && x <= SOCK.u1 && y >= SOCK.v0 && y <= SOCK.v1; };

  // the ember mask, painted in UV space over the throat triangles from their T-pose positions: the eye socket and the
  // mouth burn (cores), the front of the throat glows through the skin, strongest in the folds
  const jp = (n) => bindPos[JI.get(n)];
  const n1 = jp('neck1'), hd = jp('head'), ch0 = jp('chest');
  const em = new Float32Array(N * N), core = new Uint8Array(N * N);
  const ux = [], uy = [], px = [];
  // rasterises the throat triangles in UV space: fn(texel, T-pose position)
  const raster = (fn) => { for (let t = 0; t < tri[1].length; t += 3) {
    for (let k = 0; k < 3; k++) { UV2.getElement(tri[1][t + k], e); ux[k] = e[0] * N; uy[k] = e[1] * N; px[k] = V(...P2.getElement(tri[1][t + k], e)); }
    const ar = (ux[1] - ux[0]) * (uy[2] - uy[0]) - (ux[2] - ux[0]) * (uy[1] - uy[0]); if (!ar) continue;
    const x0 = Math.max(0, Math.floor(Math.min(...ux)) - 1), x1 = Math.min(N - 1, Math.ceil(Math.max(...ux)) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...uy)) - 1), y1 = Math.min(N - 1, Math.ceil(Math.max(...uy)) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5, qy = y + 0.5;
      const w0 = ((ux[1] - qx) * (uy[2] - qy) - (ux[2] - qx) * (uy[1] - qy)) / ar, w1 = ((ux[2] - qx) * (uy[0] - qy) - (ux[0] - qx) * (uy[2] - qy)) / ar, w2 = 1 - w0 - w1;
      if (w0 < -0.03 || w1 < -0.03 || w2 < -0.03) continue;
      fn(y * N + x, px[0].clone().multiplyScalar(w0).add(px[1].clone().multiplyScalar(w1)).add(px[2].clone().multiplyScalar(w2)));
    }
  } };
  // where the mouth is: the middle of its strongly purple lining (the head skin has purplish blotches too)
  const mouth = new THREE.Vector3(); let nm = 0;
  raster((k, p) => { const r = orig[k * ch], g = orig[k * ch + 1], b = orig[k * ch + 2]; if (b > g + 35 && r > g + 25) { mouth.add(p); nm++; } });
  mouth.multiplyScalar(1 / Math.max(1, nm));
  console.log('mouth at', mouth.toArray().map((v) => v.toFixed(3)).join(', '), nm, 'texels');
  // an empty at the mouth, under the head bone: where the game aims the smoke it draws in
  jNodes[JI.get('head')].addChild(doc.createNode('maw').setTranslation(mouth.clone().sub(bindPos[JI.get('head')]).toArray()));
  raster((k, p) => {
      const l = lumAt(k);
      // the socket (black, on the head) and the mouth (purple lining)
      if (isMouth(k) && p.distanceTo(mouth) < 0.05) core[k] = 255;
      // the throat: the front of the neck, from the collar to under the chin
      const f = Math.min(1, Math.max(0, (p.y - n1.y) / (hd.y - n1.y)));
      const ax = n1.clone().lerp(hd, f), d = p.clone().sub(ax);
      const front = smooth((Math.atan2(d.z, Math.abs(d.x)) / deg + 15) / 75);
      const along = ramp(p.y, n1.y - 0.03, n1.y + 0.1) * (1 - ramp(p.y, mouth.y - 0.06, mouth.y + 0.01));
      const fold = Math.min(1, Math.max(0, (blur[k] - l * 255) / 26));
      // the front of the throat glows through the skin; round the sides and the back of the neck only its folds do
      em[k] = Math.max(em[k], 0.5 * along * (front * (0.45 + 0.9 * fold) + (1 - front) * 0.55 * fold * fold));
      // and the fire it has swallowed shows between the ribs: the deep grooves of the chest, front and back
      const ribs = ramp(p.y, ch0.y - 0.06, ch0.y + 0.06) * (1 - ramp(p.y, n1.y - 0.02, n1.y + 0.06));
      em[k] = Math.max(em[k], 0.42 * ribs * (0.55 + 0.45 * front) * Math.pow(fold, 1.6));
  });
  // soot black -> charcoal -> ash grey on the source's luminance; creases darker (soot), old burns a dull rust
  const stops = [[0, [14, 13, 13]], [0.3, [46, 44, 42]], [0.6, [80, 77, 74]], [0.82, [110, 106, 102]], [1, [146, 141, 135]]];
  const grad = (x) => { x = Math.min(1, Math.max(0, x)); let i = 0; while (i < stops.length - 2 && x > stops[i + 1][0]) i++; const [a, ca] = stops[i], [b, cb] = stops[i + 1], f = (x - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * f); };
  const rough = Buffer.alloc(N * N * 3);
  for (let k = 0; k < N * N; k++) {
    const i = k * ch, r = orig[i], g = orig[i + 1], l = lumAt(k);
    const cav = Math.min(1, Math.max(0, (blur[k] - l * 255) / 34));
    const x = Math.pow(Math.min(1, Math.max(0, (l - 0.2) / 0.55)), 1.15);
    let c = grad(x).map((v) => v * (1 - 0.35 * cav));
    const burn = smooth(((r - g) / (r + 8) - 0.12) / 0.12) * (l > 0.08 ? 1 : 0);
    c = c.map((v, q) => v + ([58, 26, 18][q] - v) * burn * 0.55);
    if (core[k] && isMouth(k)) c = [34, 12, 9];
    if (inSock(k)) c = [22, 8, 6];
    for (let q = 0; q < 3; q++) data[i + q] = Math.min(255, Math.round(c[q]));
    // roughness: ashy ridges dry and rough, the creases a little oily
    rough[k * 3] = 255; rough[k * 3 + 1] = Math.round(255 * (0.6 + 0.28 * x - 0.12 * cav)); rough[k * 3 + 2] = 0;
  }
  tex.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
  const mr = skinMat.getMetallicRoughnessTexture();
  mr.setImage(await sharp(rough, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  skinMat.setMetallicFactor(0).setRoughnessFactor(1).setBaseColorFactor([1, 1, 1, 1]);

  // the cores, and a halo round them on the face
  const halo = await sharp(Buffer.from(core), { raw: { width: N, height: N, channels: 1 } }).blur(N / 120).raw().toBuffer();
  const emi = Buffer.alloc(N * N * 3);
  for (let k = 0; k < N * N; k++) {
    const c = core[k] ? 1 : Math.min(1, (halo[k] / 255) * 2.2) * 0.6;
    let v = Math.min(1, Math.max(em[k], c)), hot = core[k] ? 1 : 0.35 * c;
    // the socket strip: deeper is hotter
    if (inSock(k)) { const d = ((k % N) / N - SOCK.u0) / (SOCK.u1 - SOCK.u0); v = 0.75 + 0.25 * d; hot = 0.5 + 0.6 * d; }
    const col = [255, Math.min(255, 52 + 78 * hot), Math.min(255, 8 + 30 * hot)];
    for (let q = 0; q < 3; q++) emi[k * 3 + q] = Math.round(col[q] * v);
  }
  EMBER_PNG = await sharp(emi, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer();
  const et = doc.createTexture('throat_ember').setImage(EMBER_PNG).setMimeType('image/png');
  throatMat.setBaseColorTexture(tex).setNormalTexture(skinMat.getNormalTexture()).setNormalScale(skinMat.getNormalScale()).setMetallicRoughnessTexture(mr)
    .setMetallicFactor(0).setRoughnessFactor(1).setEmissiveTexture(et).setEmissiveFactor([EMBER, EMBER, EMBER]);
  if (DBG) {
    await sharp(data, { raw: info }).resize(512).png().toFile(DBG.replace(/\.glb$/, '_base.png'));
    await sharp(emi, { raw: { width: N, height: N, channels: 3 } }).resize(512).png().toFile(DBG.replace(/\.glb$/, '_ember.png'));
    await sharp(Buffer.from(core), { raw: { width: N, height: N, channels: 1 } }).png().toFile(DBG.replace(/\.glb$/, '_core.png'));
  }
  // two primitives on the one skin: the body, and the head and neck
  const mesh = prim.listParents().find((x) => x.propertyType === 'Mesh');
  const second = prim.clone().setMaterial(throatMat);
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(tri[0])).setBuffer(buf));
  second.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(tri[1])).setBuffer(buf));
  mesh.addPrimitive(second);
  console.log('skin', tri[0].length / 3, 'triangles, throat', tri[1].length / 3);
}

// ---------- 8. finish ----------
rootNode.setScale([SCALE, SCALE, SCALE]);
const extras = {
  hit: HIT, height: HEIGHT, length: +((REST_BOX.max.z - REST_BOX.min.z) * SCALE).toFixed(2), walkSpeed: +(1.2 * SCALE).toFixed(2), runSpeed: +(5.8 * SCALE).toFixed(2),
  credit: '"Lesser Cyclops Variant Rig" by SuperKapoo913 (DM-913), sketchfab.com/SuperKapoo913, CC-BY 4.0 - rebuilt rig, decimated, re-coloured, animations made for Skotos',
  license: 'CC-BY-4.0'
};
if (DBG) await io.write(DBG, doc);
let bytes = await finish(doc, OUT, extras, { base: 1024, aux: 512 });
// the ember map again, lossless: lossy WebP halves the chroma, and the small orange cores of the mouth wash out to cream
{
  const out = await load(OUT);
  const t = out.getRoot().listTextures().find((x) => x.getName() === 'throat_ember');
  t.setImage(await sharp(EMBER_PNG).resize(512, 512, { kernel: 'lanczos3' }).webp({ lossless: true }).toBuffer()).setMimeType('image/webp');
  await io.write(OUT, out);
  bytes = statSync(OUT).size;
}
console.log('smokeeater', (bytes / 1024).toFixed(0) + ' KB', NJ, 'joints', JSON.stringify(extras));
