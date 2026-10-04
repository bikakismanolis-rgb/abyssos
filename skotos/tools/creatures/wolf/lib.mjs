// Wolf rig: FK, quadruped leg IK (2-bone + metapodial + paw), CPU skinning, clip writer.
import * as THREE from 'three';
export { THREE };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const Q = () => new THREE.Quaternion();
export const deg = Math.PI / 180;
export const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
export const smooth = (w) => { w = Math.min(1, Math.max(0, w)); return w * w * (3 - 2 * w); };
export const smoother = (w) => { w = Math.min(1, Math.max(0, w)); return w * w * w * (w * (w * 6 - 15) + 10); };
export const lerp = (a, b, w) => a + (b - a) * w;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const frac = (v) => v - Math.floor(v);
// angles in degrees in character space: pitch > 0 = nose up, yaw > 0 = turn left (+X), roll > 0 = right side down
export function euler(p = 0, y = 0, r = 0) {
  return Q().setFromAxisAngle(Y, y * deg).multiply(Q().setFromAxisAngle(X, -p * deg)).multiply(Q().setFromAxisAngle(Z, r * deg));
}
export const axisAngle = (axis, a) => Q().setFromAxisAngle(axis.clone().normalize(), a * deg);

export function makeRig(doc) {
  const root = doc.getRoot(), skin = root.listSkins()[0];
  const joints = skin.listJoints();
  const parentOf = new Map();
  for (const n of root.listNodes()) for (const c of n.listChildren()) parentOf.set(c, n);
  const jset = new Set(joints);
  const bones = new Map();
  const order = [];
  const visit = (n, pw) => {
    const lp = V3(...n.getTranslation()), lq = Q().fromArray(n.getRotation());
    const w = pw.clone().multiply(new THREE.Matrix4().compose(lp, lq, V3(1, 1, 1)));
    if (jset.has(n)) {
      const wp = V3(), wq = Q(); w.decompose(wp, wq, V3());
      const p = parentOf.get(n);
      bones.set(n.getName(), { name: n.getName(), node: n, parent: jset.has(p) ? p.getName() : null, lp, lq, wp, wq, W: w });
      order.push(n.getName());
    }
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of root.getDefaultScene().listChildren()) visit(n, new THREE.Matrix4());
  return { doc, skin, joints, bones, order, R: (n) => bones.get(n) };
}

// ---------------- pose solver ----------------
// spec: {
//   pos: Vector3 pelvis offset (world), body: Quaternion pelvis world delta,
//   rot: { bone: Quaternion }  extra rotation (character-space, inherits parent delta): D = D_parent * rot
//   legs: { fl|fr|hl|hr: { ball: Vector3 world target of the paw joint, tilt: deg metapodial tilt (+ = lower end back),
//           plant: 0..1 (1 = paw keeps its rest world orientation), curl: deg paw flexion when not planted,
//           scap: deg scapula swing (front, + = shoulder joint forward), fk: optional Quaternion map for limp legs } }
// }
export const LEGS = {
  fl: { root: 'scapula_l', a: 'upperarm_l', b: 'forearm_l', c: 'carpus_l', p: 'fpaw_l', body: 'spine_03', front: true },
  fr: { root: 'scapula_r', a: 'upperarm_r', b: 'forearm_r', c: 'carpus_r', p: 'fpaw_r', body: 'spine_03', front: true },
  hl: { root: null, a: 'thigh_l', b: 'shin_l', c: 'hock_l', p: 'hpaw_l', body: 'pelvis', front: false },
  hr: { root: null, a: 'thigh_r', b: 'shin_r', c: 'hock_r', p: 'hpaw_r', body: 'pelvis', front: false }
};
export function solve(rig, spec) {
  const B = rig.bones;
  const D = new Map(), W = new Map(), WQ = new Map(), WP = new Map();
  const legBones = new Set(); for (const L of Object.values(LEGS)) for (const k of ['a', 'b', 'c', 'p']) legBones.add(L[k]);
  const setWorld = (name, wq, wp) => {
    const b = B.get(name);
    if (!wp) { const pw = W.get(b.parent); wp = b.lp.clone().applyMatrix4(pw); }
    WQ.set(name, wq.clone().normalize()); WP.set(name, wp);
    W.set(name, new THREE.Matrix4().compose(wp, wq, V3(1, 1, 1)));
    D.set(name, wq.clone().multiply(b.wq.clone().invert()));
  };
  const info = { reach: {} };
  for (const name of rig.order) {
    const b = B.get(name);
    if (legBones.has(name)) continue;
    if (!b.parent) { setWorld(name, (spec.body || Q()).clone().multiply(b.wq), b.wp.clone().add(spec.pos || V3())); continue; }
    const dq = D.get(b.parent).clone();
    const e = spec.rot && spec.rot[name]; if (e) dq.multiply(e);
    setWorld(name, dq.multiply(b.wq));
  }
  // legs
  for (const [key, L] of Object.entries(LEGS)) {
    const ls = spec.legs && spec.legs[key];
    const Db = D.get(L.body);
    if (L.root && ls && ls.scap) { // scapula swing about the chest's lateral axis
      const dq = D.get(B.get(L.root).parent).clone().multiply(axisAngle(X, -ls.scap)).multiply((spec.rot && spec.rot[L.root]) || Q());
      setWorld(L.root, dq.multiply(B.get(L.root).wq));
    }
    const ba = B.get(L.a), bb = B.get(L.b), bc = B.get(L.c), bp = B.get(L.p);
    const A = ba.lp.clone().applyMatrix4(W.get(ba.parent));
    if (!ls || ls.fk) { // FK: inherit (with optional extra rotations)
      for (const n of [L.a, L.b, L.c, L.p]) {
        const dq = D.get(B.get(n).parent).clone(); const e = (ls && ls.fk && ls.fk[n]) || (spec.rot && spec.rot[n]); if (e) dq.multiply(e);
        setWorld(n, dq.multiply(B.get(n).wq));
      }
      continue;
    }
    const l1 = bb.wp.distanceTo(ba.wp), l2 = bc.wp.distanceTo(bb.wp), l3 = bp.wp.distanceTo(bc.wp);
    const lat = X.clone().applyQuaternion(Db);
    // metapodial direction
    const d0 = bp.wp.clone().sub(bc.wp).normalize();
    const d = d0.clone().applyQuaternion(Db).applyQuaternion(Q().setFromAxisAngle(lat, (ls.tilt || 0) * deg));
    const T = ls.ball.clone();
    if (ls.rel) { // body-relative target (rest paw position carried by the body bone, plus an offset in body space)
      const M = W.get(L.body).clone().multiply(B.get(L.body).W.clone().invert());
      T.lerp(bp.wp.clone().add(ls.relOff || V3()).applyMatrix4(M), ls.rel);
    }
    if (ls.floor !== undefined) T.y = Math.max(T.y, ls.floor);
    if (ls.dyFix) T.y += ls.dyFix;
    let C = T.clone().addScaledVector(d, -l3);
    // two-bone IK A -> C
    let AC = C.clone().sub(A); let dist = AC.length();
    const maxR = (l1 + l2) * 0.999, minR = Math.abs(l1 - l2) + 0.02;
    info.reach[key] = +(dist - maxR).toFixed(3);
    if (dist > maxR) { C = A.clone().addScaledVector(AC, maxR / dist); dist = maxR; }
    if (dist < minR) { C = A.clone().addScaledVector(AC, minR / dist); dist = minR; }
    const u = C.clone().sub(A).normalize();
    // pole: rest offset of the middle joint from the rest A->C line, carried by the body
    const u0 = bc.wp.clone().sub(ba.wp).normalize();
    const v0 = bb.wp.clone().sub(ba.wp).projectOnPlane(u0).normalize();
    let v = v0.clone().applyQuaternion(Db);
    if (ls.pole) v.applyQuaternion(Q().setFromAxisAngle(u, ls.pole * deg));
    v.projectOnPlane(u).normalize();
    const ca = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
    const Bp = A.clone().addScaledVector(u, l1 * ca).addScaledVector(v, l1 * sa);
    const n0 = u0.clone().cross(v0).normalize(), n1 = u.clone().cross(v).normalize();
    const frameQ = (dir0, nn0, dir1, nn1) => {
      const a0 = dir0.clone().normalize(), b0 = nn0.clone().projectOnPlane(a0).normalize(), c0 = a0.clone().cross(b0);
      const a1 = dir1.clone().normalize(), b1 = nn1.clone().projectOnPlane(a1).normalize(), c1 = a1.clone().cross(b1);
      const m0 = new THREE.Matrix4().makeBasis(a0, b0, c0), m1 = new THREE.Matrix4().makeBasis(a1, b1, c1);
      return Q().setFromRotationMatrix(m1.multiply(m0.transpose()));
    };
    const q1 = frameQ(bb.wp.clone().sub(ba.wp), n0, Bp.clone().sub(A), n1);
    setWorld(L.a, q1.multiply(ba.wq), A);
    const q2 = frameQ(bc.wp.clone().sub(bb.wp), n0, C.clone().sub(Bp), n1);
    setWorld(L.b, q2.multiply(bb.wq));
    const q3 = frameQ(d0, n0, T.clone().sub(C), n1);
    setWorld(L.c, q3.clone().multiply(bc.wq));
    // paw
    // follows the metapodial, flexed (+ = toes down) about the body's lateral axis; or keeps its rest world orientation
    const curlQ = Q().setFromAxisAngle(lat, (ls.curl || 0) * deg);
    const fq = curlQ.multiply(q3).multiply(bp.wq);
    const flat = (ls.flat || Q()).clone().multiply(bp.wq);
    const w = ls.plant ?? 1;
    setWorld(L.p, fq.slerp(flat, w));
  }
  // locals
  const frame = new Map();
  for (const name of rig.order) {
    const b = B.get(name);
    const pw = b.parent ? W.get(b.parent) : null;
    const L = pw ? pw.clone().invert().multiply(W.get(name)) : W.get(name).clone();
    const p = V3(), q = Q(); L.decompose(p, q, V3());
    frame.set(name, { q: q.normalize(), p: b.parent ? b.lp.clone() : p });
  }
  return { frame, W, WP, WQ, D, info };
}

// ---------------- FK from a frame ----------------
export function fk(rig, frame) {
  const W = new Map();
  for (const name of rig.order) {
    const b = rig.bones.get(name), f = frame.get(name);
    const L = new THREE.Matrix4().compose(f.p, f.q, V3(1, 1, 1));
    W.set(name, b.parent ? W.get(b.parent).clone().multiply(L) : L);
  }
  return W;
}

// ---------------- CPU skinning ----------------
export function makeSkinner(rig, stride = 1) {
  const root = rig.doc.getRoot();
  const JL = rig.joints.map((j) => j.getName());
  const ibmA = rig.skin.getInverseBindMatrices().getArray();
  const IBM = JL.map((_, i) => new THREE.Matrix4().fromArray(ibmA, i * 16));
  const VERTS = [];
  for (const prim of root.listMeshes()[0].listPrimitives()) {
    const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
    for (let i = 0; i < P.getCount(); i += stride) VERTS.push({ p: V3(...P.getElement(i, [])), j: J.getElement(i, []), w: Wt.getElement(i, []) });
  }
  const skinned = (frame) => {
    const W = fk(rig, frame), M = JL.map((n, i) => W.get(n).clone().multiply(IBM[i]));
    const t = V3();
    return VERTS.map((v) => { const o = V3(); for (let k = 0; k < 4; k++) if (v.w[k] > 0) o.addScaledVector(t.copy(v.p).applyMatrix4(M[v.j[k]]), v.w[k]); return o; });
  };
  // dominant joint per vertex, for filtered queries
  for (const v of VERTS) { let bi = 0; for (let q = 1; q < 4; q++) if (v.w[q] > v.w[bi]) bi = q; v.dom = JL[v.j[bi]]; }
  const minY = (f, skip) => { let m = 1e9; skinned(f).forEach((p, k) => { if (!skip || !skip.test(VERTS[k].dom)) m = Math.min(m, p.y); }); return m; };
  const LEGV = { fl: /^(fpaw|carpus)_l$/, fr: /^(fpaw|carpus)_r$/, hl: /^(hpaw|hock)_l$/, hr: /^(hpaw|hock)_r$/ };
  const legMinY = (f) => { const o = { fl: 1e9, fr: 1e9, hl: 1e9, hr: 1e9 }; skinned(f).forEach((p, k) => { const d = VERTS[k].dom; for (const lg in LEGV) if (LEGV[lg].test(d)) o[lg] = Math.min(o[lg], p.y); }); return o; };
  return { skinned, minY, legMinY, VERTS, JL };
}

// ---------------- clip writer ----------------
export function writeClip(doc, rig, name, frames, fps, transBones = ['pelvis']) {
  const root = doc.getRoot(), buf = root.listBuffers()[0];
  const n = frames.length, times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = i / fps;
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  for (const bn of rig.order) {
    const node = rig.bones.get(bn).node;
    const qa = new Float32Array(n * 4); let prev = null;
    for (let i = 0; i < n; i++) {
      const q = frames[i].get(bn).q.clone().normalize();
      if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      q.toArray(qa, i * 4); prev = q;
    }
    const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType('VEC4').setArray(qa).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(s));
    if (transBones.includes(bn)) {
      const pa = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) frames[i].get(bn).p.toArray(pa, i * 3);
      const s2 = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType('VEC3').setArray(pa).setBuffer(buf)).setInterpolation('LINEAR');
      anim.addSampler(s2).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(s2));
    }
  }
  return anim;
}
