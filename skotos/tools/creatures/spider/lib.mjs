// Spider rig: source extraction, symmetric re-assembly, bones, rigid skinning, leg IK/FK solver.
// All rig data is in metres (source units * K), Y up, facing +Z. Bones have identity bind rotations.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
export { THREE };
export const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
export const SRC = S + '/research/opengameart/glb/giant-spider.glb';
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const Q = () => new THREE.Quaternion();
export const deg = Math.PI / 180;
export const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, w) => a + (b - a) * w;
export const smooth = (w) => { w = clamp(w, 0, 1); return w * w * (3 - 2 * w); };
export const smoother = (w) => { w = clamp(w, 0, 1); return w * w * w * (w * (w * 6 - 15) + 10); };
export const frac = (v) => v - Math.floor(v);
export const aa = (axis, a) => Q().setFromAxisAngle(axis.clone().normalize(), a * deg);
// body orientation in degrees: pitch > 0 = nose up, yaw > 0 = turn to its left (+X), roll > 0 = its right side (-X) down
export function euler(p = 0, y = 0, r = 0) { return aa(Y, y).multiply(aa(X, -p)).multiply(aa(Z, -r)); }
// windowed bump 0..1..0 between a and d with ramps a-b, c-d
export function env(t, a, b, c, d) { if (t <= a || t >= d) return 0; if (t < b) return smooth((t - a) / (b - a)); if (t <= c) return 1; return 1 - smooth((t - c) / (d - c)); }
const wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };

// ---------------- configuration ----------------
export const K = 0.26; // source units -> metres
const BODY_SHIFT_X = -0.033; // source body is ~3 cm off-centre
// leg layout (source units, after the body node transform): root position, yaw (deg from +Z toward +X), scale
export const LEG_LAYOUT = [
  { k: 1, root: [0.25, 0.86, 0.02], yaw: 32, s: 1.1 },
  { k: 2, root: [0.33, 0.85, -0.17], yaw: 66, s: 1.0 },
  { k: 3, root: [0.34, 0.85, -0.39], yaw: 110, s: 0.9 },
  { k: 4, root: [0.27, 0.86, -0.58], yaw: 146, s: 1.06 }
];
export const LEG_NAMES = [];
for (const L of LEG_LAYOUT) for (const side of ['L', 'R']) LEG_NAMES.push(side + L.k);
const SEG = ['coxa', 'femur', 'tibia', 'tarsus'];

// ---------------- source extraction ----------------
function components(P, I) {
  const n = P.length / 3, key = new Map(), id = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]].map((x) => Math.round(x * 1e4)).join(','); if (!key.has(k)) key.set(k, key.size); id[i] = key.get(k); }
  const par = Array.from({ length: key.size }, (_, i) => i), f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < I.length; t += 3) { const a = f(id[I[t]]); par[f(id[I[t + 1]])] = a; par[f(id[I[t + 2]])] = a; }
  const gid = new Map(), comp = new Int32Array(n);
  for (let i = 0; i < n; i++) { const g = f(id[i]); if (!gid.has(g)) gid.set(g, gid.size); comp[i] = gid.get(g); }
  const info = [];
  for (let c = 0; c < gid.size; c++) info.push({ c, n: 0, cen: V3(), min: V3(1e9, 1e9, 1e9), max: V3(-1e9, -1e9, -1e9) });
  for (let i = 0; i < n; i++) { const o = info[comp[i]], v = V3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); o.n++; o.cen.add(v); o.min.min(v); o.max.max(v); }
  for (const o of info) { o.cen.divideScalar(o.n); o.mid = o.min.clone().add(o.max).multiplyScalar(0.5); }
  return { comp, info };
}
function readPrim(prim, M) {
  const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), U = prim.getAttribute('TEXCOORD_0');
  const n = P.getCount(), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const nm = M ? new THREE.Matrix3().getNormalMatrix(M) : null, v = V3();
  for (let i = 0; i < n; i++) {
    v.fromArray(P.getElement(i, [])); if (M) v.applyMatrix4(M); v.toArray(pos, i * 3);
    v.fromArray(N.getElement(i, [])); if (nm) v.applyMatrix3(nm).normalize(); v.toArray(nrm, i * 3);
    if (U) { const u = U.getElement(i, []); uv[i * 2] = u[0]; uv[i * 2 + 1] = u[1]; }
  }
  return { pos, nrm, uv, idx: Uint32Array.from(prim.getIndices().getArray()) };
}

export async function loadSource() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(SRC);
  const r = doc.getRoot();
  const bodyNode = r.listNodes().find((n) => n.getMesh() && n.getMesh().getName() === 'Spider-body1000');
  const Mb = new THREE.Matrix4().compose(V3(...bodyNode.getTranslation()).add(V3(BODY_SHIFT_X, 0, 0)), Q().fromArray(bodyNode.getRotation()).normalize(), V3(1, 1, 1));
  const body = readPrim(bodyNode.getMesh().listPrimitives()[0], Mb);
  const legPrim = r.listMeshes().find((m) => m.getName() === 'Spider-leg250.003').listPrimitives()[0];
  const leg = readPrim(legPrim, null);
  // body parts
  const bc = components(body.pos, body.idx);
  const big = [...bc.info].sort((a, b) => b.n - a.n);
  const abdomenC = big.find((o) => o.cen.z < -0.6 && o.n > 150).c; // abdomen lies behind
  const cephC = big.find((o) => o.c !== abdomenC).c;
  // chelicerae + fangs: the four lowest small parts at the front
  const small = bc.info.filter((o) => o.c !== abdomenC && o.c !== cephC);
  const jaws = [...small].sort((a, b) => a.min.y - b.min.y).slice(0, 4);
  const bodyPart = new Array(bc.info.length).fill('body');
  bodyPart[abdomenC] = 'abdomen';
  for (const o of jaws) bodyPart[o.c] = o.cen.x > 0 ? 'fang_L' : 'fang_R';
  body.part = Array.from(bc.comp, (c) => bodyPart[c]);
  // the two lowest are the fangs proper, the other two the chelicera bases
  const jawKind = new Array(bc.info.length).fill(null);
  jaws.forEach((o, k) => { jawKind[o.c] = k < 2 ? 'fang' : 'chelicera'; });
  body.kind = Array.from(bc.comp, (c) => jawKind[c]);
  body.jaws = jaws;
  // leg segments by reference centres (source leg-local coords)
  const lc = components(leg.pos, leg.idx);
  const REF = { coxa: [0.51, 0.99, 0.48], ball1: [0.71, 1.12, 0.745], femur: [1.03, 1.79, 1.27], ball2: [1.38, 2.47, 1.78], tibia: [1.63, 1.85, 2.18], ball3: [1.865, 1.295, 2.515], tarsus: [1.9, 0.72, 2.62] };
  const byName = {};
  for (const [nm, ref] of Object.entries(REF)) { let best = null, bd = 1e9; for (const o of lc.info) { const d = o.mid.distanceTo(V3(...ref)); if (d < bd) { bd = d; best = o; } } byName[nm] = best; }
  const segOfComp = new Array(lc.info.length);
  const owner = { coxa: 'coxa', ball1: 'coxa', femur: 'femur', ball2: 'femur', tibia: 'tibia', ball3: 'tibia', tarsus: 'tarsus' };
  for (const [nm, o] of Object.entries(byName)) segOfComp[o.c] = owner[nm];
  leg.seg = Array.from(lc.comp, (c) => segOfComp[c]);
  const J1 = byName.ball1.mid.clone(), J2 = byName.ball2.mid.clone(), J3 = byName.ball3.mid.clone();
  // coxa inner end
  const cc = byName.coxa, ax = cc.cen.clone().sub(J1).normalize();
  let pmax = 0; for (let i = 0; i < lc.comp.length; i++) if (lc.comp[i] === cc.c) pmax = Math.max(pmax, V3().fromArray(leg.pos, i * 3).sub(J1).dot(ax));
  const J0 = V3(); let nJ0 = 0;
  for (let i = 0; i < lc.comp.length; i++) if (lc.comp[i] === cc.c) { const v = V3().fromArray(leg.pos, i * 3); if (v.clone().sub(J1).dot(ax) > 0.85 * pmax) { J0.add(v); nJ0++; } }
  J0.divideScalar(nJ0);
  let tip = null; for (let i = 0; i < lc.comp.length; i++) if (lc.comp[i] === byName.tarsus.c) { const v = V3().fromArray(leg.pos, i * 3); if (!tip || v.y < tip.y) tip = v; }
  leg.J = [J0, J1, J2, J3, tip];
  return { body, leg, src: doc };
}

// ---------------- assembly ----------------
// returns { parts: [{ name, mat, pos, nrm, uv, idx, bone (per vertex bone index) }], bones: [{ name, parent, p }], legs: {...}, B: name->index }
export function assemble(src) {
  const bones = [], B = {};
  const addBone = (name, parent, p) => { B[name] = bones.length; bones.push({ name, parent, p: p.clone() }); };
  const { body, leg } = src;
  const [J0, J1, J2, J3, TIP] = leg.J;
  const dirT = TIP.clone().sub(J0).setY(0).normalize();
  const yawT = Math.atan2(dirT.x, dirT.z);
  // canonical leg: J0 at origin, leg direction +Z
  const C = new THREE.Matrix4().makeRotationY(-yawT).multiply(new THREE.Matrix4().makeTranslation(-J0.x, -J0.y, -J0.z));
  // first pass in source units; find the ground (lowest tip) and shift so it is y=0, then scale by K
  const legs = {};
  const parts = [];
  const legMats = [];
  for (const L of LEG_LAYOUT) for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    const name = side + L.k;
    const yaw = L.yaw * sg;
    const mirror = sg < 0;
    const M = new THREE.Matrix4().makeTranslation(L.root[0] * sg, L.root[1], L.root[2])
      .multiply(new THREE.Matrix4().makeRotationY(yaw * deg))
      .multiply(new THREE.Matrix4().makeScale(L.s * (mirror ? -1 : 1), L.s, L.s))
      .multiply(C);
    legMats.push({ name, M, mirror, yaw, L, sg });
  }
  let ground = 1e9;
  for (const lm of legMats) ground = Math.min(ground, TIP.clone().applyMatrix4(lm.M).y);
  const G = new THREE.Matrix4().makeScale(K, K, K).multiply(new THREE.Matrix4().makeTranslation(0, -ground, 0));
  const tf = (v) => v.clone().applyMatrix4(G);
  // bones: body pivot at the centre of the leg roots, slightly up
  let rc = V3(); for (const lm of legMats) rc.add(V3(0, 0, 0).applyMatrix4(lm.M.clone().multiply(new THREE.Matrix4().makeTranslation(J0.x, J0.y, J0.z)))); rc.divideScalar(legMats.length);
  addBone('root', -1, V3());
  addBone('body', 0, tf(V3(0, rc.y + 0.25, rc.z)));
  addBone('abdomen', B.body, tf(V3(0, 1.22, -0.95)));
  const jawL = body.jaws.filter((o) => o.cen.x > 0), jawR = body.jaws.filter((o) => o.cen.x < 0);
  const jawPivot = (js) => { const top = Math.max(...js.map((o) => o.max.y)); const back = Math.min(...js.map((o) => o.min.z)); const x = js.reduce((a, o) => a + o.cen.x, 0) / js.length; return V3(x, top - 0.06, back + 0.08); };
  addBone('fang_L', B.body, tf(jawPivot(jawL)));
  addBone('fang_R', B.body, tf(jawPivot(jawR)));
  // body mesh
  {
    const n = body.pos.length / 3, pos = new Float32Array(n * 3), bone = new Uint16Array(n);
    for (let i = 0; i < n; i++) { tf(V3().fromArray(body.pos, i * 3)).toArray(pos, i * 3); bone[i] = B[body.part[i]]; }
    parts.push({ name: 'body', mat: 'body', pos, nrm: body.nrm.slice(), uv: body.uv.slice(), idx: body.idx.slice(), bone });
  }
  // legs
  const n = leg.pos.length / 3;
  const legPos = [], legNrm = [], legUv = [], legIdx = [], legBone = [];
  let vbase = 0;
  for (const lm of legMats) {
    const M = G.clone().multiply(lm.M);
    const nm = new THREE.Matrix3().setFromMatrix4(lm.M); // rotation * (+-)scale; normalise after
    const J = leg.J.map((v) => v.clone().applyMatrix4(M));
    const names = SEG.map((s) => 'leg_' + lm.name + '_' + s);
    addBone(names[0], B.body, J[0]);
    addBone(names[1], B[names[0]], J[1]);
    addBone(names[2], B[names[1]], J[2]);
    addBone(names[3], B[names[2]], J[3]);
    for (let i = 0; i < n; i++) {
      const v = V3().fromArray(leg.pos, i * 3).applyMatrix4(M); legPos.push(v.x, v.y, v.z);
      const nn = V3().fromArray(leg.nrm, i * 3).applyMatrix3(nm).normalize(); legNrm.push(nn.x, nn.y, nn.z);
      legUv.push(leg.uv[i * 2], leg.uv[i * 2 + 1]);
      legBone.push(B['leg_' + lm.name + '_' + leg.seg[i]]);
    }
    for (let t = 0; t < leg.idx.length; t += 3) {
      const a = leg.idx[t] + vbase, b = leg.idx[t + 1] + vbase, c = leg.idx[t + 2] + vbase;
      if (lm.mirror) legIdx.push(a, c, b); else legIdx.push(a, b, c);
    }
    vbase += n;
    // leg plane data (body space == world bind space)
    const u = V3(Math.sin(lm.yaw * deg), 0, Math.cos(lm.yaw * deg));
    const nrmAxis = u.clone().cross(Y).normalize();
    const plane = (v) => [v.dot(u), v.y];
    const ang = (a, b) => { const d = plane(b.clone().sub(a)); return Math.atan2(d[1], d[0]) / deg; };
    legs[lm.name] = {
      name: lm.name, side: lm.sg, k: lm.L.k, yaw: lm.yaw, u, n: nrmAxis, J, bones: names,
      len: [J[1].distanceTo(J[0]), J[2].distanceTo(J[1]), J[3].distanceTo(J[2]), J[4].distanceTo(J[3])],
      rest: [ang(J[0], J[1]), ang(J[1], J[2]), ang(J[2], J[3]), ang(J[3], J[4])],
      // in-plane rest vectors (u,v) of each segment, used for exact planar FK
      seg2d: [0, 1, 2, 3].map((s) => plane(J[s + 1].clone().sub(J[s]))),
      lat: [0, 1, 2, 3].map((s) => J[s + 1].clone().sub(J[s]).dot(nrmAxis))
    };
    const LL = legs[lm.name];
    LL.l2d = LL.seg2d.map((d) => Math.hypot(d[0], d[1]));
    LL.latSum = LL.lat.reduce((a, b) => a + b, 0);
  }
  parts.push({ name: 'legs', mat: 'leg', pos: Float32Array.from(legPos), nrm: Float32Array.from(legNrm), uv: Float32Array.from(legUv), idx: Uint32Array.from(legIdx), bone: Uint16Array.from(legBone) });
  return { parts, bones, B, legs };
}

// ---------------- pose solver ----------------
// spec: { body: { q, p } (world), abdomen: q (local), fang_L / fang_R: q (local),
//         legs: { name: { foot: Vector3 world target, tilt: deg extra tarsus tilt (+ = tip outward), coxa: deg coxa raise }
//                     | { ang: { yaw, a: [4 absolute plane angles deg] } } } }
// Leg angles: yaw = delta yaw about the body up axis; a[i] = absolute in-plane angle of segment i (deg, 0 = horizontal outward, + = up).
export function legIK(rig, name, bodyQ, bodyP, ls) {
  const L = rig.legs[name];
  const bb = rig.bones[rig.B.body].p;
  const J0w = L.J[0].clone().sub(bb).applyQuaternion(bodyQ).add(bodyP);
  const tb = ls.foot.clone().sub(J0w).applyQuaternion(bodyQ.clone().invert());
  const r = Math.max(Math.hypot(tb.x, tb.z), Math.abs(L.latSum) + 0.01);
  // the chain sits latSum off its plane: pick the yaw that puts the tip on the target, then work in-plane
  const yawT = (Math.atan2(tb.x, tb.z) + Math.asin(clamp(L.latSum / r, -1, 1))) / deg;
  let dyaw = wrap(yawT - L.yaw);
  dyaw = clamp(dyaw, -75, 75);
  const ut = Math.sqrt(Math.max(1e-6, r * r - L.latSum * L.latSum)), vt = tb.y;
  const a0 = L.rest[0] + (ls.coxa || 0);
  const J1 = [L.l2d[0] * Math.cos(a0 * deg), L.l2d[0] * Math.sin(a0 * deg)];
  const [l1, l2, l3] = [L.l2d[1], L.l2d[2], L.l2d[3]];
  // tarsus direction: rest angle, tilted outward when the foot is far, inward when near
  const rRest = L.J[4].clone().sub(L.J[1]).setY(0).length();
  const dist1 = Math.hypot(ut - J1[0], vt - J1[1]);
  let a3 = L.rest[3] + 55 * (Math.hypot(ut - J1[0], 0) - rRest) / rRest + (ls.tilt || 0);
  a3 = clamp(a3, -150, -20);
  let A = [ut - l3 * Math.cos(a3 * deg), vt - l3 * Math.sin(a3 * deg)];
  let dx = A[0] - J1[0], dy = A[1] - J1[1], d = Math.hypot(dx, dy);
  const maxR = (l1 + l2) * 0.995, minR = Math.abs(l1 - l2) + 0.02;
  let reach = d - maxR;
  if (d > maxR) {
    // straighten: put the ankle on the reach circle toward the target and aim the tarsus at the foot
    const tdx = ut - J1[0], tdy = vt - J1[1], td = Math.hypot(tdx, tdy);
    // solve so tip lands as close as possible: ankle on circle maxR, tarsus toward foot
    let best = null;
    for (let s = -90; s <= 90; s += 1) {
      const phi = Math.atan2(tdy, tdx) + s * deg;
      const Ax = J1[0] + maxR * Math.cos(phi), Ay = J1[1] + maxR * Math.sin(phi);
      const e = Math.hypot(ut - Ax, vt - Ay);
      const err = Math.abs(e - l3) + 0.002 * Math.abs(s);
      if (!best || err < best.err) best = { err, Ax, Ay };
    }
    A = [best.Ax, best.Ay]; dx = A[0] - J1[0]; dy = A[1] - J1[1]; d = Math.hypot(dx, dy);
    a3 = Math.atan2(vt - A[1], ut - A[0]) / deg;
  }
  if (d < minR) { const s = minR / d; dx *= s; dy *= s; d = minR; A = [J1[0] + dx, J1[1] + dy]; }
  const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const phi = Math.atan2(dy, dx);
  const a1 = (phi + Math.acos(ca)) / deg; // knee up
  const K1 = [J1[0] + l1 * Math.cos(a1 * deg), J1[1] + l1 * Math.sin(a1 * deg)];
  const a2 = Math.atan2(A[1] - K1[1], A[0] - K1[0]) / deg;
  return { yaw: dyaw, a: [a0, a1, a2, a3], reach, dist1 };
}
export function legPoseFromAngles(rig, name, bodyQ, ang) {
  const L = rig.legs[name];
  const qyaw = aa(Y, ang.yaw);
  return ang.a.map((a, i) => bodyQ.clone().multiply(qyaw).multiply(aa(L.n, a - L.rest[i])));
}
export function solve(rig, spec) {
  const { bones, B } = rig;
  const WQ = new Array(bones.length), WP = new Array(bones.length);
  WQ[0] = Q(); WP[0] = V3();
  const bq = (spec.body && spec.body.q) || Q(), bp = (spec.body && spec.body.p) || bones[B.body].p.clone();
  WQ[B.body] = bq.clone(); WP[B.body] = bp.clone();
  const child = (i, lq) => { const b = bones[i], pq = WQ[b.parent]; WQ[i] = pq.clone().multiply(lq); WP[i] = b.p.clone().sub(bones[b.parent].p).applyQuaternion(pq).add(WP[b.parent]); };
  child(B.abdomen, spec.abdomen || Q());
  child(B.fang_L, spec.fang_L || Q());
  child(B.fang_R, spec.fang_R || Q());
  const angles = {}, info = {};
  for (const name of LEG_NAMES) {
    const L = rig.legs[name], ls = (spec.legs && spec.legs[name]) || null;
    const resolve = (s) => {
      if (!s) return { yaw: 0, a: L.rest.slice() };
      if (s.ang) return s.ang;
      if (s.mix) { const a = resolve(s.mix[0]), b = resolve(s.mix[1]), w = s.mix[2]; return { yaw: lerp(a.yaw, b.yaw, w), a: a.a.map((x, k) => lerp(x, b.a[k], w)) }; }
      const r = legIK(rig, name, bq, bp, s); info[name] = r.reach; return r;
    };
    let ang = resolve(ls);
    if (ls && ls.raise) ang = { yaw: ang.yaw, a: ang.a.map((x) => x + ls.raise) };
    angles[name] = ang;
    const qs = legPoseFromAngles(rig, name, bq, ang);
    L.bones.forEach((bn, s) => {
      const i = B[bn], b = bones[i];
      WQ[i] = qs[s];
      WP[i] = b.p.clone().sub(bones[b.parent].p).applyQuaternion(WQ[b.parent]).add(WP[b.parent]);
    });
  }
  // locals
  const local = bones.map((b, i) => {
    if (b.parent < 0) return { q: Q(), p: b.p.clone() };
    const q = WQ[b.parent].clone().invert().multiply(WQ[i]).normalize();
    const p = i === B.body ? WP[i].clone() : b.p.clone().sub(bones[b.parent].p);
    return { q, p };
  });
  return { WQ, WP, local, angles, info };
}
// tip world position of a solved leg
export function tipOf(rig, pose, name) {
  const L = rig.legs[name], i = rig.B[L.bones[3]];
  return L.J[4].clone().sub(L.J[3]).applyQuaternion(pose.WQ[i]).add(pose.WP[i]);
}
// rigid skinning of all vertices (or a filtered subset) for checks
export function skin(rig, pose, filter) {
  const out = [];
  for (const part of rig.parts) {
    const n = part.pos.length / 3;
    for (let v = 0; v < n; v++) {
      const bi = part.bone[v]; if (filter && !filter(rig.bones[bi].name, part)) continue;
      out.push(V3().fromArray(part.pos, v * 3).sub(rig.bones[bi].p).applyQuaternion(pose.WQ[bi]).add(pose.WP[bi]));
    }
  }
  return out;
}
// per-bone min y of skinned vertices
export function minYByBone(rig, pose) {
  const m = new Map();
  for (const part of rig.parts) {
    const n = part.pos.length / 3;
    for (let v = 0; v < n; v += 1) {
      const bi = part.bone[v];
      const y = V3().fromArray(part.pos, v * 3).sub(rig.bones[bi].p).applyQuaternion(pose.WQ[bi]).add(pose.WP[bi]).y;
      const nm = rig.bones[bi].name; if (!m.has(nm) || y < m.get(nm)) m.set(nm, y);
    }
  }
  return m;
}
export async function makeRig() {
  const src = await loadSource();
  const rig = assemble(src);
  rig.src = src;
  return rig;
}
