// Builds S/creatures/out/goblin.glb: Kelgar goblin (CC0) + retargeted UAL / KayKit clips (CC0) + grips + extras.
// usage (cwd = this folder): node build.mjs [out.glb] [--raw]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, quantize, meshopt, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { THREE, writeClip } from './lib.mjs';
import { makeTarget, retarget, SPEC_KK } from './retarget.mjs';
import { addGrips, fingerPose } from './hands.mjs';

const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const argv = process.argv.slice(2);
const RAW = argv.includes('--raw');
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/goblin.glb';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const FPS = 30;

const doc = await io.read('goblin_base.glb');
const root = doc.getRoot();
// loincloth bones: names without dots (three.js strips '.' from track names)
const RENAME = { 'Cloth1_L': 'cloth_front_L', 'Cloth1_R': 'cloth_front_R', 'Cloth1_L.001': 'cloth_back_L', 'Cloth1_R.001': 'cloth_back_R' };
for (const n of root.listNodes()) if (RENAME[n.getName()]) n.setName(RENAME[n.getName()]);
const skin = root.listSkins()[0];
const jointList = skin.listJoints();
const joints = new Map(jointList.map((j) => [j.getName(), j]));
const u1 = await io.read(S + '/chars/ual1.glb'), u2 = await io.read(S + '/chars/ual2.glb');
const kk = await io.read(S + '/kk-adv/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb');
const SRC = { u1: [u1, makeTarget(doc, u1)], u2: [u2, makeTarget(doc, u2)], kk: [kk, makeTarget(doc, kk, SPEC_KK, u1)], u1s: [u1, makeTarget(doc, u1, undefined, u1, { straightLegs: true })] };
const T = SRC.u1[1];
const fingers = fingerPose(doc, { R: 1, L: 0.45 });
const grips = addGrips(doc);
// the 2.7x file carries an unused vertex colour layer: drop it so three.js does not tint the skin with it
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if (p.getAttribute('COLOR_0')) p.setAttribute('COLOR_0', null);

function clip(key, name, opts = {}) {
  const [sd, Tg] = SRC[key];
  const a = sd.getRoot().listAnimations().find((x) => x.getName() === name);
  if (!a) throw new Error('no clip ' + key + ':' + name);
  const fr = retarget(Tg, a, FPS, opts);
  for (const f of fr) for (const [b, q] of fingers) f.get(b).q.copy(q);
  return fr;
}
const cloneFrame = (f) => new Map([...f].map(([k, v]) => [k, { q: v.q.clone(), p: v.p.clone() }]));
function blendFrame(a, b, w) {
  const o = new Map();
  for (const [k, v] of a) { const u = b.get(k); o.set(k, { q: v.q.clone().slerp(u.q, w), p: v.p.clone().lerp(u.p, w) }); }
  return o;
}
// a then b, crossfading over n frames (b starts n frames before a ends)
function concat(a, b, n) {
  const out = a.slice(0, a.length - n).map(cloneFrame);
  for (let i = 0; i < n; i++) { const w = (i + 1) / (n + 1); out.push(blendFrame(a[a.length - n + i], b[i], w * w * (3 - 2 * w))); }
  for (let i = n; i < b.length; i++) out.push(cloneFrame(b[i]));
  return out;
}
const smooth = (w) => w * w * (3 - 2 * w);

// ---------- forward kinematics + CPU skinning for measurements ----------
const order = T.bones.map((n) => n.getName());
const parentName = new Map(T.bones.map((n) => [n.getName(), T.joints.has(T.parentOf.get(n)) ? T.parentOf.get(n).getName() : null]));
function fk(f) {
  const W = new Map();
  for (const b of order) {
    const { q, p } = f.get(b);
    const L = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
    const pn = parentName.get(b);
    W.set(b, pn ? W.get(pn).clone().multiply(L) : L);
  }
  return W;
}
const gripWorld = (W, sd) => W.get('hand_' + sd).clone().multiply(new THREE.Matrix4().compose(grips[sd].p, grips[sd].q, new THREE.Vector3(1, 1, 1)));
const ibm = skin.getInverseBindMatrices().getArray();
const IBM = jointList.map((_, i) => new THREE.Matrix4().fromArray(ibm, i * 16));
const VERTS = [];
for (const prim of root.listMeshes()[0].listPrimitives()) {
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
  for (let i = 0; i < P.getCount(); i++) VERTS.push({ p: new THREE.Vector3().fromArray(P.getElement(i, [])), j: J.getElement(i, []), w: Wt.getElement(i, []) });
}
function minY(f) {
  const W = fk(f), M = jointList.map((j, i) => W.get(j.getName()).clone().multiply(IBM[i]).elements);
  let mn = 1e9;
  for (const v of VERTS) {
    let y = 0;
    for (let k = 0; k < 4; k++) { const w = v.w[k]; if (!w) continue; const e = M[v.j[k]]; y += w * (e[1] * v.p.x + e[5] * v.p.y + e[9] * v.p.z + e[13]); }
    if (y < mn) mn = y;
  }
  return mn;
}
// hip offsets: horizontal travel scaled (0 = in place), vertical shift
function hips(frames, { keepXZ = 0, loop = false } = {}) {
  const p0 = frames[0].get('spine1').p.clone(), pN = frames[frames.length - 1].get('spine1').p.clone(), n = frames.length;
  const rest = T.RT.get('spine1').local.p;
  frames.forEach((f, i) => {
    const p = f.get('spine1').p;
    if (loop) { const t = i / (n - 1); p.x -= (pN.x - p0.x) * t; p.z -= (pN.z - p0.z) * t; }
    p.x = rest.x + (p.x - rest.x) * (loop ? 1 : keepXZ); p.z = rest.z + (p.z - rest.z) * (loop ? 1 : keepXZ);
  });
}
function ground(frames, mode) {
  const ys = frames.map(minY);
  if (mode === 'const') { const m = Math.min(...ys); frames.forEach((f) => (f.get('spine1').p.y -= m)); return { min: m, range: Math.max(...ys) - m }; }
  if (mode === 'stance') {
    // per-frame: keep the lowest point on the ground, lightly smoothed
    const P = ys.length - 1; // loop period in frames (last frame repeats the first)
    const sm = ys.map((_, i) => { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const j = (((i + k) % P) + P) % P; s += ys[j]; c++; } return s / c; });
    frames.forEach((f, i) => (f.get('spine1').p.y -= sm[i]));
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }
  if (mode === 'lift') {
    // never below the ground (bodies lying down), lift eased in so the fall still reads
    let lift = 0; const L = ys.map((y) => (lift = Math.max(lift * 0.0, -y, 0)));
    const sm = L.map((_, i) => { let m = 0; for (let k = -4; k <= 4; k++) { const j = Math.min(L.length - 1, Math.max(0, i + k)); m = Math.max(m, L[j]); } return m; });
    frames.forEach((f, i) => (f.get('spine1').p.y += sm[i] + 0.005));
    return { minBefore: Math.min(...ys) };
  }
}
// the strike: frame where the blade tip (grip + 0.45 m along +Y) moves fastest
function tipSpeed(frames, sd = 'R', along = 0.45) {
  const tips = frames.map((f) => new THREE.Vector3(0, along, 0).applyMatrix4(gripWorld(fk(f), sd)));
  return tips.map((t, i) => (i ? t.distanceTo(tips[i - 1]) * FPS : 0));
}
const argmax = (a, from = 0, to = a.length) => { let b = from; for (let i = from; i < to; i++) if (a[i] > a[b]) b = i; return b; };
function gripZ(frames, sd = 'R') { return frames.map((f) => new THREE.Vector3().setFromMatrixPosition(gripWorld(fk(f), sd)).z); }
// ground speed the cycle is authored for: how fast the sole of a planted foot slides backwards under the in-place body
const SOLE = { L: [], R: [] };
VERTS.forEach((v, i) => {
  if (v.p.y > 0.035) return;
  const names = [0, 1, 2, 3].filter((k) => v.w[k] > 0.5).map((k) => jointList[v.j[k]].getName());
  for (const sd of ['L', 'R']) if (names.some((n) => n === 'foot_' + sd || n === 'toe_' + sd)) SOLE[sd].push(v);
});
function skinned(f, list) {
  const W = fk(f), M = jointList.map((j, i) => W.get(j.getName()).clone().multiply(IBM[i]));
  return list.map((v) => { const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (v.w[k]) o.addScaledVector(v.p.clone().applyMatrix4(M[v.j[k]]), v.w[k]); return o; });
}
function footSpeed(frames) {
  const v = [];
  for (const sd of ['L', 'R']) {
    const S = frames.map((f) => skinned(f, SOLE[sd]));
    const lo = S.map((ps) => Math.min(...ps.map((p) => p.y)));
    const cz = S.map((ps) => ps.reduce((a, p) => a + p.z, 0) / ps.length);
    for (let i = 1; i < frames.length; i++) if (lo[i] < 0.015 && lo[i - 1] < 0.015) v.push((cz[i - 1] - cz[i]) * FPS);
  }
  v.sort((a, b) => a - b);
  return { median: v.length ? v[Math.floor(v.length / 2)] : 0, n: v.length, all: v.map((x) => +x.toFixed(2)) };
}

// two-bone leg IK: puts the ankle at the target position (knee keeps its bend plane), foot keeps the target rotation
const _p = (m) => new THREE.Vector3().setFromMatrixPosition(m), _q = (m) => { const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
function legIK(f, targets) {
  for (const sd of ['L', 'R']) {
    const tg = targets[sd]; if (!tg) continue;
    const W = fk(f);
    const A = _p(W.get('upperleg_' + sd)), B = _p(W.get('lowerleg_' + sd)), C = _p(W.get('foot_' + sd)), Tp = _p(tg);
    const l1 = B.distanceTo(A), l2 = C.distanceTo(B);
    const dv = Tp.clone().sub(A), dl = dv.length(), dir = dv.clone().normalize();
    const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, dl));
    const pole = B.clone().sub(A).projectOnPlane(dir).normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const B2 = A.clone().addScaledVector(dir, a).addScaledVector(pole, h);
    const q1 = new THREE.Quaternion().setFromUnitVectors(B.clone().sub(A).normalize(), B2.clone().sub(A).normalize());
    const thighW = q1.clone().multiply(_q(W.get('upperleg_' + sd)));
    f.get('upperleg_' + sd).q.copy(_q(W.get('hip_' + sd)).invert().multiply(thighW));
    const cdir = C.clone().sub(B).applyQuaternion(q1).normalize();
    const q2 = new THREE.Quaternion().setFromUnitVectors(cdir, Tp.clone().sub(B2).normalize());
    const calfW = q2.clone().multiply(q1).multiply(_q(W.get('lowerleg_' + sd)));
    f.get('lowerleg_' + sd).q.copy(thighW.clone().invert().multiply(calfW));
    f.get('foot_' + sd).q.copy(calfW.clone().invert().multiply(_q(tg)));
  }
}
// resample frames through a piecewise-linear time map [[srcTime, dstTime], ...]
function timewarp(frames, map) {
  const dur = map[map.length - 1][1], n = Math.round(dur * FPS) + 1, out = [];
  for (let i = 0; i < n; i++) {
    const t = i / FPS; let k = 1; while (k < map.length - 1 && t > map[k][1]) k++;
    const [s0, d0] = map[k - 1], [s1, d1] = map[k];
    const st = s0 + (s1 - s0) * Math.min(1, Math.max(0, (t - d0) / (d1 - d0)));
    const x = st * FPS, j = Math.min(frames.length - 2, Math.floor(x));
    out.push(blendFrame(frames[j], frames[j + 1], Math.min(1, x - j)));
  }
  return out;
}
const ease = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));
const qAxis = (x, y, z, ang) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z).normalize(), ang);

// loops: spread any first/last mismatch over the whole cycle so the last frame equals the first exactly
function closeLoop(frames) {
  const n = frames.length, f0 = frames[0], fl = frames[n - 1];
  for (const b of f0.keys()) {
    const D = fl.get(b).q.clone().invert().multiply(f0.get(b).q), dp = f0.get(b).p.clone().sub(fl.get(b).p);
    frames.forEach((f, i) => { const t = i / (n - 1); f.get(b).q.multiply(new THREE.Quaternion().slerp(D, t)); if (b === 'spine1') f.get(b).p.addScaledVector(dp, t); });
  }
}

// ---------- clips ----------
const clips = {}, hit = {}, info = {};
clips.idle = clip('u1', 'Idle_Loop'); hips(clips.idle, { loop: true }); closeLoop(clips.idle); info.idle = ground(clips.idle, 'const');
clips.walk = clip('u1', 'Walk_Loop'); hips(clips.walk, { loop: true }); closeLoop(clips.walk); info.walk = ground(clips.walk, 'stance');
clips.run = clip('u1', 'Jog_Fwd_Loop'); hips(clips.run, { loop: true }); closeLoop(clips.run); info.run = ground(clips.run, 'const');
clips.attack = clip('kk', '1H_Melee_Attack_Slice_Diagonal'); hips(clips.attack, { keepXZ: 1 }); info.attack = ground(clips.attack, 'const');
{
  // KayKit stab, tail sped up, plus a lunge: hips forward/down and the chest leaning in while the feet stay planted
  let fr = clip('kk', '1H_Melee_Attack_Stab'); hips(fr, { keepXZ: 1 });
  fr = timewarp(fr, [[0, 0], [0.8, 0.8], [1.6, 1.25]]);
  fr.forEach((f, i) => {
    const t = i / FPS, w = ease(t, 0.3, 0.45) * (1 - ease(t, 0.8, 1.15));
    const W = fk(f), feet = { L: W.get('foot_L').clone(), R: W.get('foot_R').clone() };
    const p = f.get('spine1').p; p.z += 0.11 * w; p.y -= 0.035 * w;
    const lean = qAxis(1, 0, 0, 0.16 * w);   // pitch forward (world X axis), applied on spine2 in world space
    const Wq = _q(W.get('spine2')), Pq = _q(W.get('spine1'));
    f.get('spine2').q.copy(Pq.clone().invert().multiply(lean.clone().multiply(Wq)));
    legIK(f, feet);
  });
  clips.attack2 = fr; info.attack2 = ground(clips.attack2, 'const');
}
clips.shoot = clip('kk', '1H_Ranged_Shoot'); hips(clips.shoot, { keepXZ: 1 }); info.shoot = ground(clips.shoot, 'const');
{
  const raise = clip('kk', 'Spellcast_Raise', { to: 0.75 }), thrust = clip('kk', 'Spellcast_Shoot', { from: 0.2 });
  clips.cast = concat(raise, thrust, 6); hips(clips.cast, { keepXZ: 1 }); info.cast = ground(clips.cast, 'const');
}
clips.hit = clip('u1', 'Hit_Chest'); hips(clips.hit, { keepXZ: 1 }); info.hit = ground(clips.hit, 'const');
{
  const bent = clip('u1', 'Death01'), straight = clip('u1s', 'Death01');
  clips.die = bent.map((f, i) => blendFrame(f, straight[i], ease(i / FPS, 0.35, 1.1)));
  hips(clips.die, { keepXZ: 0.5 }); info.die = ground(clips.die, 'lift');
}

// strike times
{
  const firstAbove = (a, frac, from = 0) => { const m = Math.max(...a.slice(from)); for (let i = from; i < a.length; i++) if (a[i] >= m - (m - Math.min(...a.slice(from))) * (1 - frac)) return i; return from; };
  const sp = tipSpeed(clips.attack); const i = argmax(sp); hit.attack = +(i / FPS).toFixed(3); info.attackPeak = sp[i].toFixed(2);
  const z = gripZ(clips.attack2); hit.attack2 = +(firstAbove(z, 0.95) / FPS).toFixed(3);
  // crossbow: the release is where the extended arm starts to kick back
  const zs = gripZ(clips.shoot); const top = argmax(zs, 0, Math.floor(zs.length / 2)); let r = top; while (r < zs.length - 1 && zs[r] - zs[r + 1] < 0.008) r++; hit.shoot = +(r / FPS).toFixed(3);
  const zc = gripZ(clips.cast); const from = Math.floor(zc.length * 0.4); hit.cast = +(firstAbove(zc, 0.95, from) / FPS).toFixed(3);
}
const fsw = footSpeed(clips.walk), fsr = footSpeed(clips.run); console.log('walk feet', JSON.stringify(fsw), 'run feet', JSON.stringify(fsr));
const walkSpeed = +fsw.median.toFixed(2), runSpeed = +fsr.median.toFixed(2);
for (const [name, fr] of Object.entries(clips)) writeClip(doc, name, fr, FPS, joints, ['spine1']);

// height in the idle pose (top of the ears / head)
let height = 0;
{
  const f = clips.idle[0], W = fk(f), M = jointList.map((j, i) => W.get(j.getName()).clone().multiply(IBM[i]).elements);
  for (const v of VERTS) { let y = 0; for (let k = 0; k < 4; k++) { const w = v.w[k]; if (!w) continue; const e = M[v.j[k]]; y += w * (e[1] * v.p.x + e[5] * v.p.y + e[9] * v.p.z + e[13]); } height = Math.max(height, y); }
}
root.getDefaultScene().setName('goblin').setExtras({
  hit, height: +height.toFixed(3), walkSpeed, runSpeed,
  credit: '"Goblin" by CDmir (Cestmir Dammer) with TinyWorlds, made for Kelgar, CC0 (opengameart.org/content/goblin-1); rig cleaned, rescaled, retextured and reanimated with clips retargeted from Quaternius Universal Animation Library (CC0) and Kay Lousberg KayKit Character Pack: Adventurers (CC0).',
  license: 'CC0',
  source: { model: 'https://opengameart.org/content/goblin-1', anims: ['Quaternius Universal Animation Library (CC0)', 'KayKit Character Pack: Adventurers by Kay Lousberg (CC0)'] },
  clips: { idle: 'UAL Idle_Loop', walk: 'UAL Walk_Loop', run: 'UAL Jog_Fwd_Loop', attack: 'KayKit 1H_Melee_Attack_Slice_Diagonal', attack2: 'KayKit 1H_Melee_Attack_Stab', shoot: 'KayKit 1H_Ranged_Shoot', cast: 'KayKit Spellcast_Raise + Spellcast_Shoot', hit: 'UAL Hit_Chest', die: 'UAL Death01' },
  grips: ['grip_R', 'grip_L']
});
console.log(JSON.stringify({ hit, height, walkSpeed, runSpeed, info }, null, 0));

if (!RAW) {
  await doc.transform(
    dedup(), weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor|emissive)/, resize: [1024, 1024], quality: 82 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normal/, resize: [512, 512], quality: 85 }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    unpartition(),
    prune({ keepLeaves: true, keepAttributes: false })
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT);
