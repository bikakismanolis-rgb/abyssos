// Builds S/creatures/out/skeleton.glb: "Skeleton with rig" (Gord Goodwin, CC0) re-rigged in Blender (build_base.py,
// bake.py) + clips retargeted from Quaternius UAL and KayKit Skeletons (both CC0) + grips + scene extras.
// usage (cwd = this folder): node build.mjs [out.glb] [--raw] [--extra]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, meshopt, unpartition, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'node:fs';
import { THREE, makeTarget, makeSource, retarget, writeClip, fk, duration, localFromWorld } from './lib.mjs';

const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const argv = process.argv.slice(2);
const RAW = argv.includes('--raw'), EXTRA = argv.includes('--extra');
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/skeleton.glb';
const FPS = 30;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read('skeleton_base.glb');
const root = doc.getRoot();
const T = makeTarget(doc);
const RT = T.RT;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Q = () => new THREE.Quaternion();
const deg = Math.PI / 180;

// ---------- sources ----------
const FINGER = /^(index|middle|ring|pinky|thumb)_/;
const BODY = T.names.filter((n) => !FINGER.test(n) && n !== 'jaw' && n !== 'root');
const UAL_MAP = Object.fromEntries(BODY.map((n) => [n, n]));
const KK_MAP = {
  pelvis: 'hips', spine_01: ['hips', 'spine', 0.5], spine_02: 'spine', spine_03: 'chest', neck_01: ['chest', 'head', 0.5], Head: 'head',
  upperarm_l: 'upperarm.l', lowerarm_l: 'lowerarm.l', hand_l: 'hand.l', upperarm_r: 'upperarm.r', lowerarm_r: 'lowerarm.r', hand_r: 'hand.r',
  thigh_l: 'upperleg.l', calf_l: 'lowerleg.l', foot_l: 'foot.l', ball_l: 'toes.l', thigh_r: 'upperleg.r', calf_r: 'lowerleg.r', foot_r: 'foot.r', ball_r: 'toes.r'
};
const docs = {
  u1: await io.read(S + '/chars/ual1.glb'), u2: await io.read(S + '/chars/ual2.glb'),
  kk: await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb')
};
const SRC = {
  u1: makeSource(docs.u1, { pelvis: 'pelvis', map: UAL_MAP }), u2: makeSource(docs.u2, { pelvis: 'pelvis', map: UAL_MAP }),
  kk: makeSource(docs.kk, { pelvis: 'hips', map: KK_MAP })
};
const anim = (key, name) => {
  const a = docs[key].getRoot().listAnimations().find((x) => x.getName() === name);
  if (!a) throw new Error('no clip ' + key + ':' + name);
  return a;
};
// KayKit chibi arms are held far from the body: swing the upper arms down about the chest's forward axis
function armAdduct(degs) {
  const mk = (sg) => (dq, W) => {
    const cq = Q(); W.get('spine_03').decompose(V3(), cq, V3());
    const fwd = V3(0, 0, 1).applyQuaternion(cq.multiply(RT.get('spine_03').wq.clone().invert()));
    dq.premultiply(Q().setFromAxisAngle(fwd, -sg * degs * deg));
  };
  return { upperarm_l: mk(1), upperarm_r: mk(-1) };
}
function clip(key, name, opts = {}) {
  const o = { fps: FPS, ...opts };
  if (key === 'kk') { o.adjust = armAdduct(opts.adduct ?? 35); o.hipScale = o.hipScale || V3(0.62, 1, 0.62); }
  return retarget(T, SRC[key], anim(key, name), o);
}

// ---------- frame helpers ----------
const cloneF = (f) => new Map([...f].map(([k, v]) => [k, { q: v.q.clone(), p: v.p.clone() }]));
const smooth = (w) => w * w * (3 - 2 * w);
function blendF(a, b, w) {
  const o = new Map();
  for (const [k, v] of a) { const u = b.get(k); o.set(k, { q: v.q.clone().slerp(u.q, w), p: v.p.clone().lerp(u.p, w) }); }
  return o;
}
// a then b, crossfading over n frames
function concat(a, b, n) {
  const out = a.slice(0, a.length - n).map(cloneF);
  for (let i = 0; i < n; i++) out.push(blendF(a[a.length - n + i], b[i], smooth((i + 1) / (n + 1))));
  for (let i = n; i < b.length; i++) out.push(cloneF(b[i]));
  return out;
}
// n frames easing from pose a to pose b
const transition = (a, b, n) => Array.from({ length: n }, (_, i) => blendF(a, b, smooth((i + 1) / (n + 1))));
const hold = (a, n) => Array.from({ length: n }, () => cloneF(a));
// ease a one-shot in from pose a over nIn frames and back out to pose a over nOut frames (body bones only)
function easeFrom(fr, a, nIn, nOut) {
  const L = fr.length;
  return fr.map((f, i) => {
    let w = 1;
    if (i < nIn) w = smooth(i / nIn);
    if (i >= L - nOut) w = Math.min(w, smooth((L - 1 - i) / nOut));
    if (w >= 1) return f;
    const o = new Map(f);
    for (const k of BODY) o.set(k, { q: a.get(k).q.clone().slerp(f.get(k).q, w), p: a.get(k).p.clone().lerp(f.get(k).p, w) });
    return o;
  });
}
// make the last frame equal the first, spreading the correction over the last n frames
function closeLoop(fr, n) {
  const first = fr[0], L = fr.length;
  for (let i = 0; i < n; i++) { const k = L - n + i, w = smooth((i + 1) / n); fr[k] = blendF(fr[k], first, w); }
  return fr;
}
// pull local rotations towards the bind pose (factor 0 = unchanged, 1 = bind)
function damp(fr, map) {
  for (const f of fr) for (const [b, w] of Object.entries(map)) f.get(b).q.slerp(RT.get(b).local.q, w);
  return fr;
}
// extra rotation of a bone about a character-space axis (as seen in the bind pose), angle(u) for u = 0..1 of the clip
function addRot(fr, bone, axis, angle) {
  const R = RT.get(bone).wq;
  fr.forEach((f, i) => {
    const a = typeof angle === 'function' ? angle(i / Math.max(1, fr.length - 1), i) : angle;
    if (!a) return;
    const extra = R.clone().invert().multiply(Q().setFromAxisAngle(axis, a)).multiply(R);
    f.get(bone).q.multiply(extra);
  });
  return fr;
}
const X = V3(1, 0, 0), Y = V3(0, 1, 0), Z = V3(0, 0, 1);
// reduce the swing of some bones: local rotation pulled towards the clip's mean rotation by w
function shrink(fr, bones, w) {
  for (const b of bones) {
    const qs = fr.map((f) => f.get(b).q), m = qs[0].clone();
    for (let it = 0; it < 3; it++) { const acc = new THREE.Vector4(); for (const q of qs) { const s = q.dot(m) < 0 ? -1 : 1; acc.x += q.x * s; acc.y += q.y * s; acc.z += q.z * s; acc.w += q.w * s; } m.set(acc.x, acc.y, acc.z, acc.w).normalize(); }
    for (const q of qs) q.slerp(m, w);
  }
  return fr;
}

// ---------- CPU skinning (lowest point of the body) ----------
const skin = root.listSkins()[0];
const JL = skin.listJoints().map((j) => j.getName());
const ibmA = skin.getInverseBindMatrices().getArray();
const IBM = JL.map((_, i) => new THREE.Matrix4().fromArray(ibmA, i * 16));
const VERTS = [];
for (const prim of root.listMeshes()[0].listPrimitives()) {
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
  for (let i = 0; i < P.getCount(); i += 2) VERTS.push({ p: V3(...P.getElement(i, [])), j: J.getElement(i, []), w: W.getElement(i, []) });
}
function skinned(f) {
  const W = fk(T, f), M = JL.map((n, i) => W.get(n).clone().multiply(IBM[i]));
  return VERTS.map((v) => { const o = V3(), t = V3(); for (let k = 0; k < 4; k++) if (v.w[k] > 0) o.addScaledVector(t.copy(v.p).applyMatrix4(M[v.j[k]]), v.w[k]); return o; });
}
function minY(f) { let m = 1e9; for (const p of skinned(f)) m = Math.min(m, p.y); return m; }
function bounds(f) { const b = new THREE.Box3(); for (const p of skinned(f)) b.expandByPoint(p); return b; }
// ground modes: 'pin' = every frame touches y=0; 'avg' = one offset for the whole clip (keeps hops and bounces)
function ground(fr, mode = 'pin') {
  const m = fr.map(minY);
  if (mode === 'pin') fr.forEach((f, i) => { f.get('pelvis').p.y -= m[i]; });
  else { const s = [...m].sort((a, b) => a - b), off = s[Math.floor(s.length * 0.2)]; fr.forEach((f) => { f.get('pelvis').p.y -= off; }); }
  return fr;
}
// horizontal hip handling: 'loop' removes linear drift and centres; 'ends' makes start and end sit on the rest spot
function hips(fr, mode) {
  const P = fr.map((f) => f.get('pelvis').p), R = RT.get('pelvis').local.p, n = fr.length;
  if (mode === 'zero') P.forEach((p) => { p.x = R.x; p.z = R.z; });
  if (mode === 'loop') {
    const a = P[0].clone(), b = P[n - 1].clone();
    P.forEach((p, i) => { const u = i / (n - 1); p.x -= a.x + (b.x - a.x) * u; p.z -= a.z + (b.z - a.z) * u; });
    const mx = P.reduce((s, p) => s + p.x, 0) / n, mz = P.reduce((s, p) => s + p.z, 0) / n;
    P.forEach((p) => { p.x += R.x - mx * 0.0; p.z += R.z - mz * 0.0; });
  }
  if (mode === 'ends') {
    const a = P[0].clone(), b = P[n - 1].clone();
    P.forEach((p, i) => { const u = smooth(i / (n - 1)); p.x += R.x - (a.x + (b.x - a.x) * u); p.z += R.z - (a.z + (b.z - a.z) * u); });
  }
  return fr;
}
// contact anchoring: move the hips horizontally so the body parts touching the ground do not slide
function anchor(fr, thresh = 0.035) {
  const R = RT.get('pelvis').local.p;
  fr.forEach((f) => { f.get('pelvis').p.x = R.x; f.get('pelvis').p.z = R.z; });
  let prev = skinned(fr[0]); const O = V3();
  for (let i = 1; i < fr.length; i++) {
    const p = fr[i].get('pelvis').p; p.x += O.x; p.z += O.z;
    const cur = skinned(fr[i]);
    const d = V3(); let n = 0;
    for (let k = 0; k < cur.length; k++) if (cur[k].y < thresh && prev[k].y < thresh) { d.x += cur[k].x - prev[k].x; d.z += cur[k].z - prev[k].z; n++; }
    if (n > 3) { d.multiplyScalar(1 / n); p.x -= d.x; p.z -= d.z; O.x -= d.x; O.z -= d.z; for (const v of cur) { v.x -= d.x; v.z -= d.z; } }
    prev = cur;
  }
  return fr;
}
// shift the horizontal hip track so frame k sits at (x, z) world
function placeAt(fr, k, x, z) {
  const p = fr[k].get('pelvis').p, dx = x - p.x, dz = z - p.z;
  fr.forEach((f) => { f.get('pelvis').p.x += dx; f.get('pelvis').p.z += dz; });
  return fr;
}

// ---------- hands: fist pose, grips ----------
function handFrame(sd) {
  const h = RT.get('hand_' + sd).wp.clone(), m = RT.get('middle_01_' + sd).wp.clone();
  const i = RT.get('index_01_' + sd).wp.clone(), p = RT.get('pinky_01_' + sd).wp.clone();
  const dir = m.clone().sub(h); const len = dir.length(); dir.normalize();
  const across = i.sub(p).projectOnPlane(dir).normalize();             // towards the thumb
  const palm = dir.clone().cross(across).multiplyScalar(sd === 'l' ? 1 : -1).normalize();
  return { h, dir, across, palm, len };
}
const FIST = new Map();
for (const sd of ['l', 'r']) {
  const f = handFrame(sd), axis = f.dir.clone().cross(f.palm).normalize();
  const ang = { index: [62, 88, 55], middle: [70, 92, 55], ring: [76, 92, 55], pinky: [82, 90, 50] };
  for (const fin of Object.keys(ang)) for (let j = 1; j <= 3; j++) {
    const b = `${fin}_0${j}_${sd}`, R = RT.get(b).wq;
    FIST.set(b, RT.get(b).local.q.clone().multiply(R.clone().invert().multiply(Q().setFromAxisAngle(axis, ang[fin][j - 1] * deg)).multiply(R)));
  }
  const tang = [18, 30, 35];
  for (let j = 1; j <= 3; j++) {
    const b = `thumb_0${j}_${sd}`, R = RT.get(b).wq;
    const td = RT.get(j < 3 ? `thumb_0${j + 1}_${sd}` : b).wp.clone().sub(RT.get(j < 3 ? b : `thumb_02_${sd}`).wp).normalize();
    const ax = td.clone().cross(f.palm).normalize();
    FIST.set(b, RT.get(b).local.q.clone().multiply(R.clone().invert().multiply(Q().setFromAxisAngle(ax, tang[j - 1] * deg)).multiply(R)));
  }
}
const grips = {};
for (const sd of ['r', 'l']) {
  const f = handFrame(sd);
  const P = f.h.clone().addScaledVector(f.dir, f.len * 0.72).addScaledVector(f.palm, 0.026);
  const Yg = f.across.clone(), Zg = f.dir.clone(), Xg = Yg.clone().cross(Zg).normalize();
  const G = new THREE.Matrix4().makeBasis(Xg, Yg, Zg).setPosition(P);
  const L = RT.get('hand_' + sd).world.clone().invert().multiply(G);
  const p = V3(), q = Q(); L.decompose(p, q, V3());
  const node = doc.createNode('grip_' + sd.toUpperCase()).setTranslation(p.toArray()).setRotation(q.toArray());
  RT.get('hand_' + sd).node.addChild(node);
  grips[sd] = { p, q };
}

// jaw: opening about the skull's sideways axis (positive = open)
const JAW_R = RT.get('jaw').wq;
const jawQ = (a) => RT.get('jaw').local.q.clone().multiply(JAW_R.clone().invert().multiply(Q().setFromAxisAngle(X, a * deg)).multiply(JAW_R));
function finish(fr, jaw = () => 3) {
  fr.forEach((f, i) => {
    for (const [b, q] of FIST) f.set(b, { q: q.clone(), p: RT.get(b).local.p.clone() });
    f.set('jaw', { q: jawQ(jaw(i / Math.max(1, fr.length - 1), i / FPS)), p: RT.get('jaw').local.p.clone() });
    f.set('root', { q: RT.get('root').local.q.clone(), p: RT.get('root').local.p.clone() });
  });
  return fr;
}

// ---------- measurements ----------
function handSpeedPeak(fr, sd = 'r', from = 0, to = 1) {
  let best = 0, bt = 0;
  const pos = fr.map((f) => { const W = fk(T, f); return V3().setFromMatrixPosition(W.get('hand_' + sd)).sub(V3().setFromMatrixPosition(W.get('pelvis'))); });
  for (let i = Math.max(1, Math.floor(from * fr.length)); i < Math.min(fr.length, Math.ceil(to * fr.length)); i++) {
    const v = pos[i].distanceTo(pos[i - 1]); if (v > best) { best = v; bt = i / FPS; }
  }
  return +bt.toFixed(3);
}
// ground speed of an in-place gait: mean backwards speed of the lowest foot while it is planted
function gaitSpeed(fr) {
  const feet = fr.map((f) => { const W = fk(T, f); return ['l', 'r'].map((sd) => V3().setFromMatrixPosition(W.get('ball_' + sd))); });
  let sum = 0, n = 0;
  for (let i = 1; i < fr.length; i++) for (let k = 0; k < 2; k++) {
    const a = feet[i - 1][k], b = feet[i][k], other = feet[i][1 - k];
    if (b.y <= other.y && b.y < 0.06) { sum += (a.z - b.z) * FPS; n++; }
  }
  return n ? +(sum / n).toFixed(2) : 0;
}

// ---------- the clips ----------
const C = {}, HIT = {};
const gripWorld = (f, sd) => fk(T, f).get('hand_' + sd).clone().multiply(new THREE.Matrix4().compose(grips[sd].p, grips[sd].q, V3(1, 1, 1)));
// yaw the whole body (pelvis) by angle(u)
function yaw(fr, angle) {
  fr.forEach((f, i) => { const a = angle(i / Math.max(1, fr.length - 1), i); if (a) f.get('pelvis').q.premultiply(Q().setFromAxisAngle(Y, a)); });
  return fr;
}
// idle: KayKit skeleton combat stance (crouched, sword forward), leaning in with the head lowered, slow jaw chatter
{
  let fr = clip('kk', 'Idle_Combat', { adduct: 30 });
  damp(fr, { thigh_l: 0.18, thigh_r: 0.18 });
  addRot(fr, 'spine_03', X, 5 * deg); addRot(fr, 'Head', X, 7 * deg);
  fr = closeLoop(fr, 8);
  hips(fr, 'loop'); ground(fr, 'pin');
  C.idle = finish(fr, (u) => 4 + 3 * Math.sin(u * Math.PI * 6) * Math.sin(u * Math.PI * 2));
}
// walk: stiff shamble (UAL zombie walk with the hunch taken half out)
{
  let fr = clip('u2', 'Zombie_Walk_Fwd_Loop');
  damp(fr, { spine_01: 0.45, spine_02: 0.5, spine_03: 0.55, neck_01: 0.6, Head: 0.5 });
  addRot(fr, 'Head', X, -6 * deg);
  fr = closeLoop(fr, 4);
  hips(fr, 'loop'); ground(fr, 'pin');
  C.walk = finish(fr, (u) => 6 + 3 * Math.sin(u * Math.PI * 4));
}
// run: UAL jog with shorter strides (the source covers ~6 m/s), leaning in
{
  let fr = clip('u1', 'Jog_Fwd_Loop');
  fr = closeLoop(fr, 3);
  shrink(fr, ['thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'], +(process.env.RUNK || 0.3));
  const bounce = fr.map((f) => f.get('pelvis').p.y), mb = bounce.reduce((a, b) => a + b, 0) / bounce.length;
  fr.forEach((f, i) => { f.get('pelvis').p.y = mb + (bounce[i] - mb) * 0.6; });
  addRot(fr, 'spine_03', X, 6 * deg);
  hips(fr, 'loop'); ground(fr, 'avg');
  C.run = finish(fr, (u) => 10 + 4 * Math.sin(u * Math.PI * 4));
}
// attack: diagonal slash; attack2: overhead chop (KayKit one-handed sword moves, same stance as the idle)
for (const [name, src, from, to] of [['attack', '1H_Melee_Attack_Slice_Diagonal', 0.1, 0.7], ['attack2', '1H_Melee_Attack_Chop', 0.3, 0.8]]) {
  let fr = clip('kk', src, { adduct: 30 });
  damp(fr, { thigh_l: 0.12, thigh_r: 0.12 });
  hips(fr, 'ends');
  fr = easeFrom(fr, C.idle[0], 6, 9);
  ground(fr, 'pin');
  HIT[name] = handSpeedPeak(fr, 'r', from, to);
  const h = HIT[name];
  C[name] = finish(fr, (u, t) => 4 + 24 * Math.exp(-(((t - h) / 0.2) ** 2)));
}
// shoot: raise a one-handed crossbow from the idle stance (UAL pistol shot), aim straight ahead, fire with recoil, lower
{
  const shot = clip('u1', 'Pistol_Shoot');
  const idle0 = C.idle[0];
  const nIn = 10, nHold = 5;
  let fr = [cloneF(idle0), ...transition(idle0, shot[0], nIn), ...hold(shot[0], nHold), ...shot.map(cloneF)];
  const aimStart = 1 + nIn, fire = aimStart + nHold + 2;
  fr = [...fr, ...transition(fr[fr.length - 1], idle0, 10), cloneF(idle0)];
  // turn the body so the crossbow points along +Z while aiming
  const z = V3(0, 0, 1).transformDirection(gripWorld(fr[fire], 'r')); const ang = -Math.atan2(z.x, z.z);
  const n = fr.length, outStart = n - 12;
  yaw(fr, (u, i) => ang * (i <= aimStart ? smooth(i / aimStart) : i >= outStart ? 1 - smooth((i - outStart) / (n - 1 - outStart)) : 1));
  // level the crossbow: pitch the wrist so the bolt flies flat while aiming
  {
    const z1 = V3(0, 0, 1).transformDirection(gripWorld(fr[fire], 'r'));
    const flat = V3(z1.x, 0, z1.z).normalize(), corr = Q().setFromUnitVectors(z1, flat);
    fr.forEach((f, i) => {
      const w = i <= aimStart ? smooth(i / aimStart) : i >= outStart ? 1 - smooth((i - outStart) / (n - 1 - outStart)) : 1;
      if (!w) return;
      const W = fk(T, f), hq = Q(); W.get('hand_r').decompose(V3(), hq, V3());
      const want = Q().slerp(corr, w).multiply(hq);
      f.get('hand_r').q.copy(localFromWorld(T, W, 'hand_r', want));
    });
  }
  hips(fr, 'ends'); ground(fr, 'pin');
  HIT.shoot = +(fire / FPS).toFixed(3);
  const z2 = V3(0, 0, 1).transformDirection(gripWorld(fr[fire], 'r'));
  console.log('aim dir after yaw', z2.toArray().map((v) => v.toFixed(2)), 'yaw deg', (ang / deg).toFixed(1));
  C.shoot = finish(fr, (u, t) => 4 + 10 * Math.exp(-(((t - HIT.shoot) / 0.1) ** 2)));
}
// hit: KayKit stagger
{
  let fr = clip('kk', 'Hit_B', { adduct: 30 });
  damp(fr, { thigh_l: 0.12, thigh_r: 0.12 });
  hips(fr, 'ends');
  fr = easeFrom(fr, C.idle[0], 2, 8);
  ground(fr, 'pin');
  C.hit = finish(fr, (u) => 4 + 20 * Math.sin(Math.min(1, u * 2.2) * Math.PI));
}
// die / rise / riseStand / bonePile: KayKit skeleton clips. Their limbs fly apart in the source; here the bones stay
// jointed, so the body is placed by contact anchoring (whatever touches the ground does not slide).
const R0 = RT.get('pelvis').local.p;
{
  let fr = clip('kk', 'Skeletons_Awaken_Floor', { adduct: 20 });
  // the source's limbs fly apart and back while it lies there: instead hold the floor pose with jerky twitches,
  // then blend into the source as it sits up
  const k0 = fr[0], n0 = Math.round(fr.length * 0.28), n1 = Math.round(fr.length * 0.4);
  const pulse = (t, at, w) => Math.exp(-(((t - at) / w) ** 2));
  for (let i = 1; i < n1; i++) {
    const t = i / FPS, tw = cloneF(k0);
    addRot([tw], 'Head', Y, (pulse(t, 0.12, 0.05) * 18 - pulse(t, 0.38, 0.06) * 24) * deg);
    addRot([tw], 'Head', X, -pulse(t, 0.55, 0.08) * 20 * deg);
    addRot([tw], 'upperarm_r', Z, pulse(t, 0.22, 0.05) * 22 * deg);
    addRot([tw], 'lowerarm_r', Z, pulse(t, 0.24, 0.05) * 30 * deg);
    addRot([tw], 'upperarm_l', Z, -pulse(t, 0.45, 0.05) * 20 * deg);
    addRot([tw], 'thigh_l', X, -pulse(t, 0.33, 0.06) * 18 * deg);
    addRot([tw], 'spine_03', X, -pulse(t, 0.58, 0.1) * 15 * deg);
    const w = i < n0 ? 0 : smooth((i - n0) / (n1 - n0));
    fr[i] = blendF(tw, fr[i], w);
  }
  ground(fr, 'pin'); anchor(fr);
  placeAt(fr, fr.length - 1, R0.x, R0.z);
  C.rise = finish(fr, (u) => 22 * (1 - smooth(Math.min(1, u * 1.4))) + 4);
  C.bonePile = finish([cloneF(fr[0]), cloneF(fr[0])], () => 22);
  C.bonePile[1] = cloneF(C.bonePile[0]);
  let st = clip('kk', 'Skeletons_Awaken_Standing', { adduct: 25 });
  ground(st, 'pin'); anchor(st); placeAt(st, st.length - 1, R0.x, R0.z);
  C.riseStand = finish(st, (u) => 18 * (1 - smooth(u)) + 4);
  // die: the knees give (KayKit Death_B start), it drops onto its rump (KayKit Sit_Floor_Down), then folds over and
  // topples sideways into a heap of bones, skull hanging, jaw open
  const buck = clip('kk', 'Death_B', { adduct: 25 }), sit = clip('kk', 'Sit_Floor_Down', { adduct: 25 });
  const b1 = Math.round(buck.length * +(process.env.DB1 || 0.32)), s1 = Math.round(sit.length * +(process.env.DS1 || 0.35));
  let d = easeFrom(buck.slice(0, b1), C.idle[0], 5, 0);
  d = concat(d, sit.slice(s1), 6);
  const last = d[d.length - 1], heap = cloneF(last);
  const HX = (process.env.HEAP || '35,30,25,25,30,60,35,-78,-35,45').split(',').map(Number);
  addRot([heap], 'spine_01', X, HX[0] * deg); addRot([heap], 'spine_02', X, HX[1] * deg); addRot([heap], 'spine_03', X, HX[2] * deg);
  addRot([heap], 'neck_01', X, HX[3] * deg); addRot([heap], 'Head', X, HX[4] * deg);
  addRot([heap], 'upperarm_l', Z, -HX[5] * deg); addRot([heap], 'upperarm_r', Z, HX[5] * deg);
  addRot([heap], 'Head', Y, HX[6] * deg);
  heap.get('pelvis').q.premultiply(Q().setFromAxisAngle(Z, HX[7] * deg));
  addRot([heap], 'thigh_l', X, HX[8] * deg); addRot([heap], 'thigh_r', X, HX[8] * 0.6 * deg);
  addRot([heap], 'calf_l', X, HX[9] * deg); addRot([heap], 'calf_r', X, HX[9] * 0.7 * deg);
  d = [...d, ...transition(last, heap, 16), cloneF(heap), ...hold(heap, 4)];
  ground(d, 'pin'); anchor(d);
  d.forEach((f) => { const p = f.get('pelvis').p; p.x = R0.x + (p.x - R0.x) * 0.7; p.z = R0.z + (p.z - R0.z) * 0.7; });
  C.die = finish(d, (u) => 4 + 26 * smooth(Math.min(1, u * 1.3)));
}
if (EXTRA) {
  for (const [k, n] of [['kk', 'Death_A'], ['kk', 'Death_B'], ['u1', 'Death01'], ['kk', 'Lie_Down'], ['kk', 'Sit_Floor_Down']]) {
    let f2 = clip(k, n, { adduct: 25 }); ground(f2, 'pin'); anchor(f2); C['d_' + n] = finish(f2);
  }
  let rr = clip('kk', 'Skeletons_Awaken_Floor', { adduct: 20 }); ground(rr, 'pin'); anchor(rr); C.riseA = finish(rr);
  let dd = clip('kk', 'Death_C_Skeletons', { adduct: 20 }); ground(dd, 'pin'); anchor(dd); C.dieA = finish(dd);
  for (const [k, n] of [['kk', '1H_Melee_Attack_Slice_Diagonal'], ['kk', '1H_Melee_Attack_Slice_Horizontal'], ['kk', '1H_Melee_Attack_Stab'], ['kk', '1H_Melee_Attack_Chop'], ['u1', 'Sword_Attack'], ['u2', 'Sword_Regular_B'], ['u2', 'Sword_Regular_C'], ['kk', 'Idle_Combat'], ['u2', 'Zombie_Scratch'], ['kk', 'Hit_A'], ['kk', 'Hit_B'], ['kk', '1H_Ranged_Shoot'], ['kk', '1H_Ranged_Aiming']]) {
    let f2 = clip(k, n, { adduct: 30 }); hips(f2, 'ends'); ground(f2, 'pin'); C['x_' + n] = finish(f2);
  }
  let lt = clip('u2', 'LayToIdle'); ground(lt, 'pin'); anchor(lt); C.layToIdle = finish(lt);
  let d1 = clip('u1', 'Death01'); ground(d1, 'pin'); anchor(d1); C.death01A = finish(d1);
  let fr = clip('kk', 'Walking_D_Skeletons', { adduct: 45 }); hips(fr, 'loop'); ground(fr, 'pin'); C.walkKK = finish(fr);
  fr = clip('u1', 'Sword_Attack'); hips(fr, 'ends'); ground(fr, 'pin'); C.attackSA = finish(fr);
  fr = clip('u1', 'Death01'); ground(fr, 'pin'); C.dieUAL = finish(fr);
  fr = clip('kk', 'Running_C', { adduct: 40 }); hips(fr, 'loop'); ground(fr, 'avg'); C.runKK = finish(fr);
  fr = clip('u1', 'Walk_Loop'); hips(fr, 'loop'); ground(fr, 'pin'); C.walkUAL = finish(fr);
  fr = clip('u2', 'Zombie_Walk_Fwd_Loop'); hips(fr, 'loop'); ground(fr, 'pin'); C.walkZ = finish(fr);
  console.log('gait', Object.fromEntries(['walk', 'run', 'walkKK', 'runKK', 'walkUAL', 'walkZ'].map((k) => [k, gaitSpeed(C[k])])));
}

// ---------- write ----------
for (const a of root.listAnimations()) a.dispose();
for (const [name, fr] of Object.entries(C)) writeClip(doc, name, fr, FPS, ['pelvis']);
const walkSpeed = gaitSpeed(C.walk), runSpeed = gaitSpeed(C.run);
const box = bounds(C.idle[0]);
const extras = {
  hit: HIT, height: 1.8, walkSpeed, runSpeed,
  credit: '"Skeleton with rig" by Gord Goodwin (CC0; BlendSwap, OpenGameArt upload by rudy85) - re-rigged, decimated, bone colour baked and animated for Skotos; ' +
    'animations retargeted from "Universal Animation Library" by Quaternius (CC0) and "KayKit Character Pack: Skeletons" by Kay Lousberg (CC0)',
  license: 'CC0'
};
root.getDefaultScene().setExtras(extras);
console.log(JSON.stringify({ extras, idleBox: [box.min.toArray(), box.max.toArray()].map((v) => v.map((x) => +x.toFixed(3))), clips: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, +((v.length - 1) / FPS).toFixed(2)])) }));

if (!RAW) {
  await doc.transform(
    resample({ tolerance: 2e-4 }),
    dedup(),
    prune({ keepLeaves: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeColor: 8, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    prune({ keepLeaves: true }),
    unpartition()
  );
}
await io.write(OUT, doc);
const tris = root.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + p.getIndices().getCount() / 3, 0), 0);
console.log('wrote', OUT, (statSync(OUT).size / 1024).toFixed(0) + ' KB', 'tris', tris, 'joints', JL.length, 'clips', root.listAnimations().length);
