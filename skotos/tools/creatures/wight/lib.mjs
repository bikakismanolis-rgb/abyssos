// Shared helpers for the wight / barrow lord builds: glTF pose sampling, world-space retargeting of
// UE-mannequin (Quaternius UAL, CC0) and KayKit (CC0) clips onto the MPFB game_engine rig (UE bone names),
// clip editing (blend, concat, timewarp, additive world rotations, leg IK), CPU skinning for grounding,
// grips and clip writing.
import * as THREE from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
export { THREE };
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
export const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
export const FPS = 30;
const V = (a) => new THREE.Vector3().fromArray(a), Q = (a) => new THREE.Quaternion().fromArray(a);

export function sample(ch, t) {
  const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), q = ch.getTargetPath() === 'rotation';
  let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++;
  const j = Math.min(i + 1, inp.length - 1), t0 = inp[i], t1 = inp[j], f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  if (s.getInterpolation() === 'STEP') return q ? new THREE.Quaternion().fromArray(out, i * 4) : new THREE.Vector3().fromArray(out, i * 3);
  if (q) return new THREE.Quaternion().fromArray(out, i * 4).slerp(new THREE.Quaternion().fromArray(out, j * 4), f);
  return new THREE.Vector3().fromArray(out, i * 3).lerp(new THREE.Vector3().fromArray(out, j * 3), f);
}
// world transforms of every node of the default scene at time t of anim (null = rest)
export function pose(doc, anim, t) {
  const loc = new Map();
  for (const n of doc.getRoot().listNodes()) loc.set(n, { p: V(n.getTranslation()), q: Q(n.getRotation()), s: V(n.getScale()) });
  if (anim) for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode(), path = ch.getTargetPath(); if (!n || !loc.has(n)) continue;
    if (path === 'rotation') loc.get(n).q.copy(sample(ch, t)); else if (path === 'translation') loc.get(n).p.copy(sample(ch, t));
  }
  const out = new Map();
  const visit = (n, pm) => {
    const l = loc.get(n), m = new THREE.Matrix4().compose(l.p, l.q, l.s), w = pm ? pm.clone().multiply(m) : m;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3(); w.decompose(wp, wq, ws);
    out.set(n.getName(), { node: n, local: l, world: w, wp, wq, parentWorld: pm || new THREE.Matrix4() });
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of doc.getRoot().getDefaultScene().listChildren()) visit(n, null);
  return out;
}
export const duration = (anim) => { let d = 0; for (const s of anim.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); return d; };

const SIDES = ['l', 'r'];
const FING = ['index', 'middle', 'ring', 'pinky', 'thumb'];
// primary child of each target bone (its direction is aligned to the UAL rest direction)
export const CHILD = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'Head' };
for (const s of SIDES) {
  Object.assign(CHILD, { ['clavicle_' + s]: 'upperarm_' + s, ['upperarm_' + s]: 'lowerarm_' + s, ['lowerarm_' + s]: 'hand_' + s, ['thigh_' + s]: 'calf_' + s, ['calf_' + s]: 'foot_' + s, ['foot_' + s]: 'ball_' + s });
  for (const f of FING) { CHILD[`${f}_01_${s}`] = `${f}_02_${s}`; CHILD[`${f}_02_${s}`] = `${f}_03_${s}`; }
}
// source maps: target bone -> source bone | [srcA, srcB, w]
export const MAP_UAL = {};
for (const b of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head']) MAP_UAL[b] = b;
for (const s of SIDES) {
  for (const b of ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball']) MAP_UAL[`${b}_${s}`] = `${b}_${s}`;
  for (const f of FING) for (const k of ['01', '02', '03']) MAP_UAL[`${f}_${k}_${s}`] = `${f}_${k}_${s}`;
}
export const MAP_KK = {
  pelvis: 'hips', spine_01: 'spine', spine_02: ['spine', 'chest', 0.5], spine_03: 'chest', neck_01: ['chest', 'head', 0.5], Head: 'head',
  upperarm_l: 'upperarm.l', lowerarm_l: 'lowerarm.l', hand_l: 'hand.l', upperarm_r: 'upperarm.r', lowerarm_r: 'lowerarm.r', hand_r: 'hand.r',
  thigh_l: 'upperleg.l', calf_l: 'lowerleg.l', foot_l: 'foot.l', ball_l: 'toes.l', thigh_r: 'upperleg.r', calf_r: 'lowerleg.r', foot_r: 'foot.r', ball_r: 'toes.r'
};
export const PELVIS = { ual: 'pelvis', kk: 'hips' };

// target reference pose: the MPFB bind pose with every bone swung onto the UAL T-pose direction (hands fully framed)
export function makeRef(tdoc, udoc) {
  const RT = pose(tdoc, null, 0), RU = pose(udoc, null, 0);
  const joints = new Set(tdoc.getRoot().listSkins()[0].listJoints());
  const order = [], parentOf = new Map();
  const walk = (n) => { if (joints.has(n)) order.push(n); for (const c of n.listChildren()) { parentOf.set(c, n); walk(c); } };
  for (const n of tdoc.getRoot().getDefaultScene().listChildren()) walk(n);
  const wp = (P, n) => P.get(n).wp.clone();
  const handFrame = (P, s) => {
    const h = wp(P, 'hand_' + s), m = wp(P, 'middle_01_' + s), i = wp(P, 'index_01_' + s), p = wp(P, 'pinky_01_' + s);
    const dir = m.sub(h).normalize(); return { dir, across: i.sub(p).projectOnPlane(dir).normalize() };
  };
  const REF = new Map();
  for (const n of order) {
    const name = n.getName(), par = parentOf.get(n);
    const restQ = RT.get(name).wq.clone();
    let cand = joints.has(par) ? REF.get(par.getName()).clone().multiply(RT.get(par.getName()).wq.clone().invert()).multiply(restQ) : restQ.clone();
    const corr = cand.clone().multiply(restQ.clone().invert());
    if (/^hand_[lr]$/.test(name)) {
      const s = name.slice(-1), ft = handFrame(RT, s), fs = handFrame(RU, s);
      const d1 = ft.dir.clone().applyQuaternion(corr), a1 = ft.across.clone().applyQuaternion(corr);
      const q1 = new THREE.Quaternion().setFromUnitVectors(d1, fs.dir); a1.applyQuaternion(q1);
      const pa = a1.projectOnPlane(fs.dir).normalize(), pb = fs.across.clone().projectOnPlane(fs.dir).normalize();
      let ang = Math.acos(THREE.MathUtils.clamp(pa.dot(pb), -1, 1)); if (pa.clone().cross(pb).dot(fs.dir) < 0) ang = -ang;
      cand = new THREE.Quaternion().setFromAxisAngle(fs.dir, ang).multiply(q1).multiply(cand);
    } else if (CHILD[name] && RU.has(name) && RU.has(CHILD[name]) && RT.has(CHILD[name])) {
      const dT = wp(RT, CHILD[name]).sub(wp(RT, name)).normalize().applyQuaternion(corr);
      const dS = wp(RU, CHILD[name]).sub(wp(RU, name)).normalize();
      cand = new THREE.Quaternion().setFromUnitVectors(dT, dS).multiply(cand);
    }
    REF.set(name, cand);
  }
  return { tdoc, RT, REF, order, parentOf, joints, names: order.map((n) => n.getName()) };
}

// source = { doc, kind: 'ual'|'kk' }; returns frames: Map(bone -> {q local, p local})
export function retarget(T, src, clipName, opts = {}) {
  const { RT, REF, order, parentOf, joints } = T;
  const sdoc = src.doc, map = src.kind === 'kk' ? MAP_KK : MAP_UAL, pelv = PELVIS[src.kind];
  const anim = sdoc.getRoot().listAnimations().find((a) => a.getName() === clipName);
  if (!anim) throw new Error('no clip ' + clipName);
  if (!src.RS) src.RS = pose(sdoc, null, 0);
  const RS = src.RS;
  const k = (RT.get('pelvis').wp.y - RT.get('Root').wp.y) / RS.get(pelv).wp.y;
  const dur = duration(anim), t0 = opts.from ?? 0, t1 = Math.min(dur, opts.to ?? dur);
  const n = Math.max(2, Math.round((t1 - t0) * FPS) + 1);
  const skip = new Set(opts.skip || []);   // target bones that keep the rest relation to their parent
  const frames = [];
  for (let f = 0; f < n; f++) {
    const t = Math.min(t1, t0 + (f / (n - 1)) * (t1 - t0));
    const P = pose(sdoc, anim, t), W = new Map(), out = new Map();
    for (const node of order) {
      const name = node.getName(), par = parentOf.get(node);
      const Wp = joints.has(par) ? W.get(par.getName()) : RT.get(name).parentWorld.clone();
      const WpQ = new THREE.Quaternion(); Wp.decompose(new THREE.Vector3(), WpQ, new THREE.Vector3());
      const sm = skip.has(name) ? null : map[name];
      const delta = (b) => P.get(b).wq.clone().multiply(RS.get(b).wq.clone().invert());
      let Wq;
      if (sm && (Array.isArray(sm) ? P.has(sm[0]) : P.has(sm))) Wq = (Array.isArray(sm) ? delta(sm[0]).slerp(delta(sm[1]), sm[2]) : delta(sm)).multiply(REF.get(name));
      else if (joints.has(par)) Wq = WpQ.clone().multiply(REF.get(par.getName()).clone().invert()).multiply(REF.get(name));
      else Wq = RT.get(name).wq.clone();
      let Wpos;
      if (name === 'pelvis') { const d = P.get(pelv).wp.clone().sub(RS.get(pelv).wp).multiplyScalar(k); if (opts.hipScale) d.multiply(new THREE.Vector3(...opts.hipScale)); Wpos = RT.get(name).wp.clone().add(d); }
      else Wpos = RT.get(name).local.p.clone().applyMatrix4(Wp);
      const Wm = new THREE.Matrix4().compose(Wpos, Wq, new THREE.Vector3(1, 1, 1));
      W.set(name, Wm);
      const L = Wp.clone().invert().multiply(Wm), p = new THREE.Vector3(), q = new THREE.Quaternion(); L.decompose(p, q, new THREE.Vector3());
      out.set(name, { q, p: name === 'pelvis' ? p : RT.get(name).local.p.clone() });
    }
    frames.push(out);
  }
  return frames;
}

// ---------- frame utilities ----------
export const cloneFrame = (f) => new Map([...f].map(([k, v]) => [k, { q: v.q.clone(), p: v.p.clone() }]));
export function blendFrame(a, b, w) {
  const o = new Map();
  for (const [k, v] of a) { const u = b.get(k); o.set(k, { q: v.q.clone().slerp(u.q, w), p: v.p.clone().lerp(u.p, w) }); }
  return o;
}
export const smooth = (w) => w * w * (3 - 2 * w);
export const ease = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));
export function concat(a, b, n) {
  const out = a.slice(0, a.length - n).map(cloneFrame);
  for (let i = 0; i < n; i++) { const w = (i + 1) / (n + 1); out.push(blendFrame(a[a.length - n + i], b[i], smooth(w))); }
  for (let i = n; i < b.length; i++) out.push(cloneFrame(b[i]));
  return out;
}
// resample frames through a piecewise-linear time map [[srcTime, dstTime], ...]
export function timewarp(frames, map) {
  const dur = map[map.length - 1][1], n = Math.round(dur * FPS) + 1, out = [];
  for (let i = 0; i < n; i++) {
    const t = i / FPS; let k = 1; while (k < map.length - 1 && t > map[k][1]) k++;
    const [s0, d0] = map[k - 1], [s1, d1] = map[k];
    const st = s0 + (s1 - s0) * Math.min(1, Math.max(0, (t - d0) / (d1 - d0)));
    const x = Math.min(frames.length - 1.0001, st * FPS), j = Math.floor(x);
    out.push(blendFrame(frames[j], frames[Math.min(frames.length - 1, j + 1)], x - j));
  }
  return out;
}
export const qAxis = (x, y, z, ang) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z).normalize(), ang);
export const mpos = (m) => new THREE.Vector3().setFromMatrixPosition(m);
export const mrot = (m) => { const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };

// skeleton helper bound to one target document: FK, CPU skinning, grounding, IK, world-space edits
export function makeRig(T) {
  const doc = T.tdoc, root = doc.getRoot(), skin = root.listSkins()[0], jointList = skin.listJoints();
  const order = T.names, parentName = new Map(T.order.map((n) => [n.getName(), T.joints.has(T.parentOf.get(n)) ? T.parentOf.get(n).getName() : null]));
  const rootParent = new Map(T.order.map((n) => [n.getName(), T.RT.get(n.getName()).parentWorld.clone()]));
  function fk(f) {
    const W = new Map();
    for (const b of order) {
      const { q, p } = f.get(b);
      const L = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
      const pn = parentName.get(b);
      W.set(b, (pn ? W.get(pn) : rootParent.get(b)).clone().multiply(L));
    }
    return W;
  }
  const restFrame = () => new Map(order.map((b) => [b, { q: T.RT.get(b).local.q.clone(), p: T.RT.get(b).local.p.clone() }]));
  const ibm = skin.getInverseBindMatrices().getArray();
  const IBM = jointList.map((_, i) => new THREE.Matrix4().fromArray(ibm, i * 16));
  const VERTS = [];
  for (const m of root.listMeshes()) for (const prim of m.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
    if (!J) continue;
    const step = m.getName().toLowerCase().includes('claw') ? 3 : 1;
    for (let i = 0; i < P.getCount(); i += step) VERTS.push({ p: new THREE.Vector3().fromArray(P.getElement(i, [])), j: J.getElement(i, []), w: Wt.getElement(i, []), mesh: m.getName() });
  }
  const skinMats = (f) => { const W = fk(f); return jointList.map((j, i) => W.get(j.getName()).clone().multiply(IBM[i])); };
  function skinned(f, list = VERTS) {
    const M = skinMats(f);
    return list.map((v) => { const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (v.w[k]) o.addScaledVector(v.p.clone().applyMatrix4(M[v.j[k]]), v.w[k]); return o; });
  }
  function minY(f, list = VERTS) {
    const M = skinMats(f).map((m) => m.elements); let mn = 1e9;
    for (const v of list) { let y = 0; for (let k = 0; k < 4; k++) { const w = v.w[k]; if (!w) continue; const e = M[v.j[k]]; y += w * (e[1] * v.p.x + e[5] * v.p.y + e[9] * v.p.z + e[13]); } if (y < mn) mn = y; }
    return mn;
  }
  function maxY(f, list = VERTS) {
    const M = skinMats(f).map((m) => m.elements); let mx = -1e9;
    for (const v of list) { let y = 0; for (let k = 0; k < 4; k++) { const w = v.w[k]; if (!w) continue; const e = M[v.j[k]]; y += w * (e[1] * v.p.x + e[5] * v.p.y + e[9] * v.p.z + e[13]); } if (y > mx) mx = y; }
    return mx;
  }
  // set a bone's world rotation (keeps its world position chain): R_world applied on top of the current world rotation
  function rotateWorld(f, bone, Rw, W = fk(f)) {
    const wq = mrot(W.get(bone)), pq = parentName.get(bone) ? mrot(W.get(parentName.get(bone))) : mrot(rootParent.get(bone));
    f.get(bone).q.copy(pq.invert().multiply(Rw.clone().multiply(wq)));
  }
  function setWorldRot(f, bone, wqNew, W = fk(f)) {
    const pq = parentName.get(bone) ? mrot(W.get(parentName.get(bone))) : mrot(rootParent.get(bone));
    f.get(bone).q.copy(pq.invert().multiply(wqNew));
  }
  // two-bone leg IK (thigh, calf, foot): ankle to the target world matrix's position, foot takes its rotation
  function legIK(f, targets) {
    for (const s of ['l', 'r']) {
      const tg = targets[s]; if (!tg) continue;
      twoBone(f, 'thigh_' + s, 'calf_' + s, 'foot_' + s, mpos(tg), mrot(tg));
    }
  }
  function twoBone(f, A_, B_, C_, Tp, footQ) {
    const W = fk(f);
    const A = mpos(W.get(A_)), B = mpos(W.get(B_)), C = mpos(W.get(C_));
    const l1 = B.distanceTo(A), l2 = C.distanceTo(B);
    const dv = Tp.clone().sub(A), dl = dv.length(), dir = dv.clone().normalize();
    const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, dl));
    let pole = B.clone().sub(A).projectOnPlane(dir); if (pole.lengthSq() < 1e-10) pole = new THREE.Vector3(0, 0, 1).projectOnPlane(dir); pole.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const B2 = A.clone().addScaledVector(dir, a).addScaledVector(pole, h);
    const q1 = new THREE.Quaternion().setFromUnitVectors(B.clone().sub(A).normalize(), B2.clone().sub(A).normalize());
    const aW = q1.clone().multiply(mrot(W.get(A_)));
    setWorldRot(f, A_, aW, W);
    const cdir = C.clone().sub(B).applyQuaternion(q1).normalize();
    const q2 = new THREE.Quaternion().setFromUnitVectors(cdir, Tp.clone().sub(B2).normalize());
    const bW = q2.clone().multiply(q1).multiply(mrot(W.get(B_)));
    f.get(B_).q.copy(aW.clone().invert().multiply(bW));
    if (footQ) f.get(C_).q.copy(bW.clone().invert().multiply(footQ));
  }
  return { fk, skinned, minY, maxY, VERTS, jointList, IBM, rotateWorld, setWorldRot, legIK, twoBone, parentName, restFrame, order };
}

// hip: remove horizontal travel (loops: linear drift removed and centred; one-shots: scaled by keepXZ)
export function inPlace(T, frames, { keepXZ = 0, loop = false } = {}) {
  const rest = T.RT.get('pelvis').local.p, n = frames.length;
  const p0 = frames[0].get('pelvis').p.clone(), pN = frames[n - 1].get('pelvis').p.clone();
  // pelvis local frame is the Root's frame (Z up in Blender terms): horizontal = local x and local y? use world mapping
  const Rq = T.RT.get('pelvis').parentWorld; // Root world matrix
  const toW = (p) => p.clone().applyMatrix4(Rq), toL = (w) => w.clone().applyMatrix4(Rq.clone().invert());
  const w0 = toW(p0), wN = toW(pN), wr = toW(rest);
  let cx = 0, cz = 0;
  const ws = frames.map((f, i) => { const w = toW(f.get('pelvis').p); if (loop) { const t = i / (n - 1); w.x -= (wN.x - w0.x) * t; w.z -= (wN.z - w0.z) * t; } cx += w.x; cz += w.z; return w; });
  cx /= n; cz /= n;
  frames.forEach((f, i) => {
    const w = ws[i];
    if (loop) { w.x = wr.x + (w.x - cx); w.z = wr.z + (w.z - cz); }
    else { w.x = wr.x + (w.x - w0.x) * keepXZ; w.z = wr.z + (w.z - w0.z) * keepXZ; }
    f.get('pelvis').p.copy(toL(w));
  });
}
// shift the pelvis in world space
export function shiftHip(T, f, d) {
  const Rq = T.RT.get('pelvis').parentWorld, inv = Rq.clone().invert();
  const w = f.get('pelvis').p.clone().applyMatrix4(Rq).add(d); f.get('pelvis').p.copy(w.applyMatrix4(inv));
}
// loops: spread the first/last mismatch over the whole cycle so the last frame equals the first
export function closeLoop(frames) {
  const n = frames.length, f0 = frames[0], fl = frames[n - 1];
  for (const b of f0.keys()) {
    const D = fl.get(b).q.clone().invert().multiply(f0.get(b).q), dp = f0.get(b).p.clone().sub(fl.get(b).p);
    frames.forEach((f, i) => { const t = i / (n - 1); f.get(b).q.multiply(new THREE.Quaternion().slerp(D, t)); if (b === 'pelvis') f.get(b).p.addScaledVector(dp, t); });
  }
}

export function writeClip(doc, name, frames, joints, transBones = ['pelvis']) {
  const root = doc.getRoot(), buf = root.listBuffers()[0];
  const n = frames.length, times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = i / FPS;
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  for (const [bn, node] of joints) {
    if (!frames[0].has(bn)) continue;
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
