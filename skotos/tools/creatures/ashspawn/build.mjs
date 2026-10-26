// Builds S/creatures/out/ashspawn.glb: Executioner (thecubber, CC-BY 3.0) re-rigged (clean.py), retextured as a charred
// Ashspawn with ember cracks in an emissive map (textures.mjs), clips retargeted from Quaternius UAL (CC0) and hand-keyed.
// usage (cwd = this folder): node build.mjs [out.glb] [--raw] [--only idle,walk]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { prune, dedup, quantize, meshopt, unpartition, weld, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { THREE, writeClip, pose } from './lib.mjs';
import { makeTarget, retarget } from './retarget.mjs';
import { addGrips } from './hands.mjs';
import { makeTools, ease, smooth, _p, _q, cloneFrame, blendFrame } from './tools.mjs';

const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const argv = process.argv.slice(2);
const RAW = argv.includes('--raw');
const oi = argv.indexOf('--only'); const ONLY = oi >= 0 ? argv[oi + 1].split(',') : null;
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/ashspawn.glb';
const TRI_MAX = 8900;
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const FPS = 30;
const doc = await io.read('base_raw.glb');
const root = doc.getRoot();
const skin = root.listSkins()[0];

// ---------- material: charred base colour, original normal map, ember emissive ----------
if (!RAW) doc.createExtension(EXTTextureWebP).setRequired(true);
async function tex(name, file, size, q) {
  let img = sharp(readFileSync(file)).resize(size, size);
  const t = doc.createTexture(name);
  if (RAW) t.setImage(new Uint8Array(await img.png().toBuffer())).setMimeType('image/png');
  else t.setImage(new Uint8Array(await img.webp({ quality: q, effort: 6 }).toBuffer())).setMimeType('image/webp').setURI(name + '.webp');
  return t;
}
const mat = root.listMaterials()[0].setName('ashspawn');
for (const t of root.listTextures()) t.dispose();
mat.setBaseColorTexture(await tex('ashspawn_base', 'tex/ash_base.png', 1024, 86))
  .setNormalTexture(await tex('ashspawn_normal', 'tex/ash_nrm.png', 512, 88))
  .setEmissiveTexture(await tex('ashspawn_emissive', 'tex/ash_emit.png', 1024, 86))
  .setEmissiveFactor([1, 1, 1]).setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.9).setMetallicFactor(0).setDoubleSided(false);
mat.getNormalTextureInfo().setTexCoord(0);

const joints = new Map(skin.listJoints().map((j) => [j.getName(), j]));
const u1 = await io.read(S + '/chars/ual1.glb'), u2 = await io.read(S + '/chars/ual2.glb');
const SRC = { u1: [u1, makeTarget(doc, u1)], u2: [u2, makeTarget(doc, u2)] };
const T = SRC.u1[1];
const RT0 = pose(doc, null, 0);
const grips = addGrips(doc, RT0);
const X = makeTools(doc, T, FPS, grips);
const { fk, rotWorld, legIK, timewarp, resample, closeLoop, hips, ground } = X;
const want = (n) => !ONLY || ONLY.includes(n);

function clip(key, name, opts = {}) {
  const [sd, Tg] = SRC[key];
  const a = sd.getRoot().listAnimations().find((x) => x.getName() === name);
  if (!a) throw new Error('no clip ' + key + ':' + name);
  return retarget(Tg, a, FPS, opts);
}
// ---------- layering helpers (world space, children follow) ----------
const AX = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
const rot = (f, b, axis, ang) => { if (Math.abs(ang) > 1e-5) rotWorld(f, b, new THREE.Quaternion().setFromAxisAngle(AX[axis] || axis, ang)); };
function aim(f, bone, child, dir, w = 1) {
  if (w <= 1e-4) return;
  const W = fk(f), cur = _p(W.get(child)).sub(_p(W.get(bone))).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
  rotWorld(f, bone, new THREE.Quaternion().slerp(q, w));
}
// carry the cleaver: turn the hand so the blade (grip +Y) leans towards a world direction by weight w
function carry(f, sd, dir, w) {
  const W = fk(f), G = X.gripWorld(W, sd), cur = new THREE.Vector3(0, 1, 0).transformDirection(G);
  rotWorld(f, 'hand_' + sd, new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()), w));
}
const feetOf = (f) => { const W = fk(f); return { L: W.get('foot_L').clone(), R: W.get('foot_R').clone() }; };
// torso rotation spread over the three spine bones
const SPINE = [['spine', 0.3], ['spine2', 0.35], ['chest', 0.35]];
const torso = (f, axis, a) => { for (const [b, w] of SPINE) rot(f, b, axis, a * w); };
// brute posture: torso pitched forward (head compensates), arms kept clear of the belly when they hang down
function posture(f, { hunch = 0.12, head = 0.7, spread = 0.2, keepFeet = true } = {}) {
  const feet = keepFeet ? feetOf(f) : null;
  torso(f, 'X', hunch); rot(f, 'head', 'X', -hunch * head * 0.6); rot(f, 'neck', 'X', -hunch * head * 0.4);
  if (spread) {
    const W = fk(f);
    for (const sd of ['L', 'R']) {
      const d = _p(W.get('forearm_' + sd)).sub(_p(W.get('upperarm_' + sd))).normalize();
      const down = Math.max(0, -d.y);
      rot(f, 'upperarm_' + sd, 'Z', (sd === 'L' ? 1 : -1) * spread * smooth(down));
    }
  }
  if (feet) legIK(f, feet);
}

// square the shoulders to the front (UAL idle stands slightly turned) and bring trailing elbows forward
function square(f, { w = 0.85, elbowZ = 0.02 } = {}) {
  const feet = feetOf(f);
  let W = fk(f);
  const d = _p(W.get('upperarm_L')).sub(_p(W.get('upperarm_R')));
  const yaw = Math.atan2(d.z, d.x);             // >0: left shoulder ahead (turned right) -> turn back left
  torso(f, 'Y', yaw * w);
  for (const sd of ['L', 'R']) {
    W = fk(f);
    const sh = _p(W.get('upperarm_' + sd)), el = _p(W.get('forearm_' + sd));
    const v = el.clone().sub(sh), want = elbowZ - v.z;
    if (want > 0) { const ang = Math.atan2(v.z + want, -v.y) - Math.atan2(v.z, -v.y); rot(f, 'upperarm_' + sd, 'X', -ang); }
  }
  legIK(f, feet);
}
// ---------- key-pose authoring (same conventions as the troll build) ----------
//  hips: [dx,dy,dz]; torso: {pitch, yaw, roll} (+ = bend forward / turn left / lean left); head: {pitch, yaw, roll}
//  arms: {R: {up: dir, fore: dir, club: dir (grip +Y), twist}, L: {...}} in world space (faces +Z); shoulders; feet offsets
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const P = V;
const ARM = (sd) => (sd === 'L' ? 1 : -1);
function key(stance, spec) {
  const f = cloneFrame(stance);
  const feet0 = feetOf(stance);
  const h = spec.hips || [0, 0, 0];
  f.get('hips').p.add(new THREE.Vector3(...h));
  if (spec.hipsRot) { const r = spec.hipsRot; if (r.yaw) rot(f, 'hips', 'Y', r.yaw); if (r.pitch) rot(f, 'hips', 'X', r.pitch); if (r.roll) rot(f, 'hips', 'Z', r.roll); }
  const t = spec.torso || {};
  if (t.yaw) torso(f, 'Y', t.yaw);
  if (t.pitch) torso(f, 'X', t.pitch);
  if (t.roll) torso(f, 'Z', t.roll);
  const hd = spec.head || {};
  if (hd.yaw) { rot(f, 'neck', 'Y', hd.yaw * 0.4); rot(f, 'head', 'Y', hd.yaw * 0.6); }
  if (hd.pitch) { rot(f, 'neck', 'X', hd.pitch * 0.4); rot(f, 'head', 'X', hd.pitch * 0.6); }
  if (hd.roll) rot(f, 'head', 'Z', hd.roll);
  for (const [sd, a] of Object.entries(spec.shoulders || {})) rot(f, 'shoulder_' + sd, 'Z', ARM(sd) * a);
  for (const [sd, a] of Object.entries(spec.arms || {})) {
    if (a.up) aim(f, 'upperarm_' + sd, 'forearm_' + sd, a.up, a.w ?? 1);
    if (a.fore) aim(f, 'forearm_' + sd, 'hand_' + sd, a.fore, a.w ?? 1);
    if (a.club) { const W = fk(f), G = X.gripWorld(W, sd), cur = new THREE.Vector3(0, 1, 0).transformDirection(G);
      rotWorld(f, 'hand_' + sd, new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(cur, a.club.clone().normalize()), a.cw ?? 1)); }
    if (a.twist) { const W = fk(f), ax = _p(W.get('hand_' + sd)).sub(_p(W.get('forearm_' + sd))).normalize(); rotWorld(f, 'forearm_' + sd, new THREE.Quaternion().setFromAxisAngle(ax, a.twist)); }
    if (a.roll) { const W = fk(f), G = X.gripWorld(W, sd), ax = new THREE.Vector3(0, 1, 0).transformDirection(G); rotWorld(f, 'hand_' + sd, new THREE.Quaternion().setFromAxisAngle(ax, a.roll)); }
  }
  const tg = {};
  for (const sd of ['L', 'R']) { const o = (spec.feet || {})[sd]; const m = feet0[sd].clone(); if (o) { const e = new THREE.Matrix4().makeTranslation(o[0], o[1], o[2]); m.premultiply(e); if (o[3]) m.multiply(new THREE.Matrix4().makeRotationX(o[3])); } tg[sd] = m; }
  legIK(f, tg);
  f.feet = tg;
  return f;
}
const EASE = {
  lin: (x) => x, io: smooth, in: (x) => x * x, in3: (x) => x * x * x, out: (x) => 1 - (1 - x) * (1 - x), out3: (x) => 1 - (1 - x) ** 3,
};
function timeline(keys, { plant = true } = {}) {
  const dur = keys[keys.length - 1][0], n = Math.round(dur * FPS) + 1, out = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(dur, i / FPS); let k = 1; while (k < keys.length - 1 && t > keys[k][0]) k++;
    const [t0, a] = keys[k - 1], [t1, b, e = 'io'] = keys[k];
    const w = EASE[e](Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))));
    const f = blendFrame(a, b, w);
    if (plant && a.feet && b.feet) {
      const tg = {};
      for (const sd of ['L', 'R']) {
        const pa = new THREE.Vector3(), qa = new THREE.Quaternion(), pb = new THREE.Vector3(), qb = new THREE.Quaternion(), s = new THREE.Vector3();
        a.feet[sd].decompose(pa, qa, s); b.feet[sd].decompose(pb, qb, s);
        tg[sd] = new THREE.Matrix4().compose(pa.lerp(pb, w), qa.slerp(qb, w), new THREE.Vector3(1, 1, 1));
      }
      legIK(f, tg);
    }
    out.push(f);
  }
  return out;
}
const TIP = 0.85;   // probe: cleaver tip distance along grip +Y
const tipOf = (f, sd = 'R', len = TIP) => new THREE.Vector3(0, len, 0).applyMatrix4(X.gripWorld(fk(f), sd));

// ---------- procedural legs for the in-place loops: exact speed, planted feet, no skating ----------
const restW = fk(new Map([...T.RT].filter(([n]) => joints.has(n)).map(([n, r]) => [n, { q: r.local.q.clone(), p: r.local.p.clone() }])));
const LEG = { len: _p(restW.get('thigh_L')).distanceTo(_p(restW.get('shin_L'))) + _p(restW.get('shin_L')).distanceTo(_p(restW.get('foot_L'))) };
function procLegs(frames, { v, duty, lift, phase = { L: 0, R: 0.5 }, width = 0, zc = 0.0, pitch = 0.35, reach = 0.97 }) {
  const n = frames.length - 1, Tc = n / FPS, D = v * duty * Tc;
  const foot0 = { L: restW.get('foot_L').clone(), R: restW.get('foot_R').clone() };
  const target = (i, sd) => {
    const p0 = _p(foot0[sd]), q0 = _q(foot0[sd]);
    const p = (((i / n) - phase[sd]) % 1 + 1) % 1;
    const x = p0.x + (sd === 'L' ? -width : width);
    let z, y = p0.y, pa = 0;
    if (p < duty) { const s = p / duty; z = zc + D / 2 - D * s; }
    else {
      const s = (p - duty) / (1 - duty);
      z = zc - D / 2 + D * smooth(s);
      y = p0.y + lift * Math.sin(Math.PI * Math.min(1, s * 1.1));
      pa = s < 0.5 ? pitch * Math.sin(Math.PI * s * 2) * (1 - s) : -0.4 * pitch * Math.sin(Math.PI * (s - 0.5) * 2);
      y += 0.35 * Math.sin(Math.max(0, pa)) * 0.3 + 0.12 * Math.sin(Math.max(0, -pa));
    }
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pa).multiply(q0);
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
  };
  const out = { maxDrop: 0 };
  frames.forEach((f, i) => {
    let drop = 0; const W = fk(f);
    for (const sd of ['L', 'R']) {
      const hp = _p(W.get('thigh_' + sd)), tp = _p(target(i, sd));
      const dxz = Math.hypot(tp.x - hp.x, tp.z - hp.z), maxL = LEG.len * reach;
      if (dxz < maxL) { const need = hp.y - tp.y - Math.sqrt(maxL * maxL - dxz * dxz); drop = Math.max(drop, need); }
    }
    f.drop = drop;
  });
  const dr = frames.map((f) => f.drop);
  const sm = dr.map((_, i) => { let m = 0; for (let k = -4; k <= 4; k++) m = Math.max(m, dr[((i + k) % n + n) % n]); return m; });
  const sm2 = sm.map((_, i) => { let s = 0; for (let k = -3; k <= 3; k++) s += sm[((i + k) % n + n) % n]; return s / 7; });
  frames.forEach((f, i) => {
    f.get('hips').p.y -= sm2[i]; out.maxDrop = Math.max(out.maxDrop, sm2[i]);
    legIK(f, { L: target(i, 'L'), R: target(i, 'R') });
    for (const sd of ['L', 'R']) f.get('toe_' + sd).q.copy(T.RT.get('toe_' + sd).local.q);
    delete f.drop;
  });
  return out;
}

const clips = {}, hit = {}, info = {};
const WALK = { T: 1.25, v: 0.88 }, RUN = { T: 0.66, v: 2.4 };

// ---------- idle: UAL Idle_Loop slowed, hunched, heavy breathing ----------
{
  let fr = resample(clip('u1', 'Idle_Loop'), 3.0); hips(fr, { loop: true }); closeLoop(fr);
  const n = fr.length - 1;
  fr.forEach((f, i) => {
    const ph = (i / n) * Math.PI * 2 * 2;
    const b = 0.5 - 0.5 * Math.cos(ph);
    const feet = feetOf(f);
    posture(f, { hunch: 0.14, spread: 0.18, keepFeet: false });
    square(f, { w: 0.85, elbowZ: -0.02 });
    rot(f, 'chest', 'X', -0.06 * b); rot(f, 'spine2', 'X', -0.025 * b); rot(f, 'head', 'X', 0.05 * b - 0.03);
    rot(f, 'shoulder_L', 'Z', 0.05 * b); rot(f, 'shoulder_R', 'Z', -0.05 * b);
    f.get('hips').p.y += 0.01 * b;
    carry(f, 'R', new THREE.Vector3(-0.15, -0.75, 0.65), 0.75);
    legIK(f, feet);
  });
  clips.idle = fr; info.idle = ground(fr, 'const');
}
const stance = cloneFrame(clips.idle[0]);
stance.feet = feetOf(stance);   // planted feet when blending to / from the stance

// ---------- walk: UAL Walk_Loop slowed to a heavy tread, hunched, side-to-side sway, procedural planted feet ----------
if (want('walk')) {
  let fr = resample(clip('u1', 'Walk_Loop'), WALK.T); hips(fr, { loop: true }); closeLoop(fr);
  const n = fr.length - 1;
  fr.forEach((f, i) => {
    const ph = (i / n) * Math.PI * 2; const s = Math.cos(ph);
    posture(f, { hunch: 0.16, spread: 0.16, keepFeet: false });
    f.get('hips').p.x += 0.05 * s; f.get('hips').p.y -= 0.03;
    rot(f, 'hips', 'Z', -0.035 * s); rot(f, 'chest', 'Z', 0.06 * s); rot(f, 'head', 'Z', -0.03 * s);
    rot(f, 'chest', 'Y', 0.05 * Math.sin(ph));
    carry(f, 'R', new THREE.Vector3(-0.15, -0.7, 0.7), 0.8);
  });
  info.walkHipsPre = [Math.min(...fr.map((f) => f.get('hips').p.y)), Math.max(...fr.map((f) => f.get('hips').p.y))].map((v) => +v.toFixed(3));
  info.walkLegs = procLegs(fr, { v: WALK.v, duty: 0.6, lift: 0.13, phase: { L: 0.02, R: 0.52 }, width: 0.03, zc: 0.0, pitch: 0.3 });
  clips.walk = fr;
}
// ---------- run: UAL Jog_Fwd_Loop, heavy, hunched, procedural planted feet ----------
if (want('run')) {
  let fr = resample(clip('u1', 'Jog_Fwd_Loop'), RUN.T); hips(fr, { loop: true }); closeLoop(fr);
  fr.forEach((f) => { posture(f, { hunch: 0.06, spread: 0.12, keepFeet: false }); rot(f, 'head', 'X', -0.12); carry(f, 'R', new THREE.Vector3(-0.2, -0.45, 0.85), 0.7); });
  { const ys = fr.map((f) => f.get('hips').p.y), m = ys.reduce((a, b) => a + b, 0) / ys.length; fr.forEach((f) => (f.get('hips').p.y = 0.905 + (f.get('hips').p.y - m) * 0.45)); }
  info.runHipsPre = [Math.min(...fr.map((f) => f.get('hips').p.y)), Math.max(...fr.map((f) => f.get('hips').p.y))].map((v) => +v.toFixed(3));
  info.runLegs = procLegs(fr, { v: RUN.v, duty: 0.36, lift: 0.2, phase: { L: 0.0, R: 0.5 }, width: 0.06, zc: 0.05, pitch: 0.45, reach: 0.985 });
  clips.run = fr;
}
// ---------- attack: heavy overhead cleaver chop (right hand) ----------
if (want('attack')) {
  const k1 = key(stance, { hips: [0.02, 0.03, -0.06], torso: { pitch: -0.2, yaw: -0.3 }, head: { pitch: -0.05, yaw: 0.2 },
    arms: { R: { up: P(-0.3, 0.9, -0.3), fore: P(0.1, 0.25, -1), club: P(0.1, -0.5, -0.85), cw: 0.7 }, L: { up: P(0.55, -0.45, 0.7), fore: P(-0.1, 0.45, 0.9) } },
    shoulders: { R: 0.15 } });
  const k2 = key(stance, { hips: [0.0, 0.01, 0.0], torso: { pitch: -0.02, yaw: -0.12 }, head: { pitch: 0.0 },
    arms: { R: { up: P(-0.2, 0.9, 0.38), fore: P(-0.08, 0.6, 0.8), club: P(0, 0.6, 0.8), cw: 0.75 }, L: { up: P(0.55, -0.55, 0.5), fore: P(0.3, -0.3, 0.9) } } });
  const k3 = key(stance, { hips: [0.0, -0.2, 0.1], torso: { pitch: 0.5, yaw: 0.1 }, head: { pitch: -0.32 },
    arms: { R: { up: P(-0.15, -0.2, 0.97), fore: P(-0.03, -0.45, 0.9), club: P(0.04, -0.7, 0.71), cw: 0.85 }, L: { up: P(0.55, -0.75, -0.25), fore: P(0.35, -0.85, 0.2) } },
    feet: { R: [0, 0, 0.14] } });
  const k4 = key(stance, { hips: [0.0, -0.17, 0.08], torso: { pitch: 0.42, yaw: 0.08 }, head: { pitch: -0.26 },
    arms: { R: { up: P(-0.17, -0.25, 0.95), fore: P(-0.06, -0.5, 0.86), club: P(0.04, -0.65, 0.76), cw: 0.85 }, L: { up: P(0.55, -0.75, -0.2), fore: P(0.35, -0.85, 0.2) } },
    feet: { R: [0, 0, 0.14] } });
  const fr = timeline([[0, stance], [0.58, k1, 'io'], [0.76, k2, 'in'], [0.92, k3, 'out'], [1.3, k4, 'io'], [1.95, stance, 'io']]);
  clips.attack = fr; hit.attack = 0.92;
}
// ---------- attack2: backhand swing, left to right, back of the hand leading ----------
if (want('attack2')) {
  // windup: torso turned left, right forearm folded across the chest, cleaver cocked back over the left shoulder
  const k1 = key(stance, { hips: [0.05, -0.05, -0.02], torso: { pitch: 0.1, yaw: 0.55 }, hipsRot: { yaw: 0.2 }, head: { yaw: -0.35 },
    arms: { R: { up: P(0.75, -0.25, 0.6), fore: P(0.75, 0.35, -0.55), club: P(0.45, 0.45, -0.77), cw: 0.8 }, L: { up: P(0.45, -0.75, -0.45), fore: P(0.25, -0.75, -0.2) } } });
  // strike: torso unwinding, arm whipping out in front, cleaver flat and level, edge leading to the right
  const k2 = key(stance, { hips: [0.0, -0.09, 0.05], torso: { pitch: 0.2, yaw: -0.05 }, hipsRot: { yaw: 0 }, head: { yaw: 0.0 },
    arms: { R: { up: P(-0.35, -0.2, 0.92), fore: P(-0.6, -0.1, 0.8), club: P(-0.25, 0.05, 0.97), cw: 0.8 }, L: { up: P(0.7, -0.6, 0.1), fore: P(0.45, -0.55, 0.5) } },
    feet: { R: [-0.05, 0, 0.12] } });
  // follow-through: torso turned right, arm extended out to the right, cleaver trailing back
  const k3 = key(stance, { hips: [-0.06, -0.08, 0.04], torso: { pitch: 0.15, yaw: -0.6 }, hipsRot: { yaw: -0.2 }, head: { yaw: 0.35 },
    arms: { R: { up: P(-0.95, -0.2, 0.15), fore: P(-0.9, -0.1, -0.35), club: P(-0.5, -0.05, -0.85), cw: 0.7 }, L: { up: P(0.6, -0.7, 0.35), fore: P(0.2, -0.5, 0.85) } },
    feet: { R: [-0.05, 0, 0.12] } });
  const k4 = key(stance, { hips: [-0.05, -0.07, 0.03], torso: { pitch: 0.13, yaw: -0.5 }, hipsRot: { yaw: -0.16 }, head: { yaw: 0.28 },
    arms: { R: { up: P(-0.9, -0.38, 0.2), fore: P(-0.8, -0.3, -0.3), club: P(-0.45, -0.3, -0.85), cw: 0.6 }, L: { up: P(0.6, -0.7, 0.35), fore: P(0.2, -0.5, 0.85) } },
    feet: { R: [-0.05, 0, 0.12] } });
  const fr = timeline([[0, stance], [0.55, k1, 'io'], [0.8, k2, 'in'], [0.98, k3, 'out'], [1.3, k4, 'io'], [1.9, stance, 'io']]);
  clips.attack2 = fr; hit.attack2 = 0.8;
}
// ---------- slam: cleaver and fist raised overhead, hammered into the ground ----------
if (want('slam')) {
  const k1 = key(stance, { hips: [0, 0.05, -0.05], torso: { pitch: -0.28 }, head: { pitch: -0.15 }, shoulders: { L: 0.2, R: 0.2 },
    arms: { R: { up: P(-0.3, 0.93, 0.1), fore: P(0.5, 0.8, -0.15), club: P(0.2, 0.1, -1), cw: 0.7 }, L: { up: P(0.3, 0.93, 0.1), fore: P(-0.5, 0.8, -0.15) } } });
  const slamKey = (pitch, drop) => key(stance, { hips: [0, -drop, 0.02], torso: { pitch }, head: { pitch: -0.55 * pitch },
    arms: { R: { up: P(-0.25, -0.5, 0.83), fore: P(0.05, -0.9, 0.42), club: P(-0.1, -0.45, 0.9), cw: 0.9 }, L: { up: P(0.25, -0.5, 0.83), fore: P(-0.05, -0.9, 0.42) } },
    feet: { L: [0.13, 0, 0.0], R: [-0.13, 0, 0.0] } });
  const fistY = (f) => { const W = fk(f); return Math.min(...['L', 'R'].map((sd) => _p(X.gripWorld(W, sd)).y)); };
  let best = null;
  for (let pitch = 0.5; pitch <= 1.4; pitch += 0.05) { const k = slamKey(pitch, 0.43); const y = fistY(k); if (!best || Math.abs(y - 0.14) < Math.abs(best.y - 0.14)) best = { pitch, y, k }; }
  info.slamSolve = { pitch: +best.pitch.toFixed(2), fistY: +best.y.toFixed(3) };
  const k2 = best.k, k3 = slamKey(best.pitch - 0.06, 0.4);
  // swing path: both arms come down in front of the body (not around the sides)
  const k1b = key(stance, { hips: [0, -0.12, 0.0], torso: { pitch: 0.25 }, head: { pitch: -0.2 },
    arms: { R: { up: P(-0.2, 0.55, 0.81), fore: P(-0.05, 0.3, 0.95), club: P(-0.05, -0.1, 1), cw: 0.8 }, L: { up: P(0.2, 0.55, 0.81), fore: P(0.05, 0.3, 0.95) } },
    feet: { L: [0.07, 0, 0.0], R: [-0.07, 0, 0.0] } });
  const fr = timeline([[0, stance], [0.72, k1, 'io'], [0.86, k1b, 'in'], [0.94, k2, 'lin'], [1.4, k3, 'out'], [2.2, stance, 'io']]);
  clips.slam = fr; hit.slam = 0.94;
}
// ---------- hit: heavy flinch ----------
if (want('hit')) {
  const k1 = key(stance, { hips: [0, -0.02, -0.08], torso: { pitch: -0.22, yaw: 0.12, roll: 0.06 }, head: { pitch: -0.28, yaw: -0.15 },
    arms: { R: { up: P(-0.8, -0.35, 0.3), w: 0.5 }, L: { up: P(0.8, -0.35, 0.3), w: 0.5 } } });
  clips.hit = timeline([[0, stance], [0.12, k1, 'out'], [0.6, stance, 'io']]);
}
// ---------- die: UAL Death01 (collapses backwards), slowed a little for weight ----------
if (want('die')) {
  let fr = clip('u1', 'Death01'); hips(fr, { keepXZ: 0.5 });
  fr = timewarp(fr, [[0, 0], [0.8, 0.95], [1.6, 1.95], [2.4, 2.8]]);
  fr = fr.map((f, i) => blendFrame(stance, f, ease(i / FPS, 0, 0.3)));
  const y0 = X.minY(fr[0]); fr.forEach((f) => (f.get('hips').p.y -= y0));
  const lift = fr.map((f) => Math.max(0, -X.minY(f)));
  const sm = lift.map((_, i) => { let m = 0; for (let k = -3; k <= 3; k++) m = Math.max(m, lift[Math.min(lift.length - 1, Math.max(0, i + k))]); return m; });
  fr.forEach((f, i) => (f.get('hips').p.y += sm[i]));
  info.die = { lift: +Math.max(...lift).toFixed(3), endMinY: +X.minY(fr[fr.length - 1]).toFixed(3), dur: +((fr.length - 1) / FPS).toFixed(2) };
  clips.die = fr;
}

// ---------- strike probes: cleaver tip ----------
// strike-lands time: the blade reaches waist height in front (chop, slam) / sweeps across the front line (backhand)
const LAND = { attack: (p) => p.z > 0.7 && p.y < 1.05, attack2: (p) => p.z > 0.7 && p.x < -0.05, slam: (p) => p.z > 0.7 && p.y < 0.5 };
for (const name of ['attack', 'attack2', 'slam']) {
  if (!clips[name]) continue;
  const tips = clips[name].map((f) => tipOf(f));
  const i0 = Math.round(0.5 * FPS), il = tips.findIndex((p, i) => i >= i0 && LAND[name](p));
  if (il > 0) { info[name + 'Keyed'] = hit[name]; hit[name] = +(il / FPS).toFixed(2); }
  const sp = tips.map((t, i) => (i ? t.distanceTo(tips[i - 1]) * FPS : 0));
  const pk = sp.indexOf(Math.max(...sp));
  info[name + 'Tip'] = { peakT: +(pk / FPS).toFixed(2), peakV: +sp[pk].toFixed(1), atHit: tips[Math.round(hit[name] * FPS)].toArray().map((v) => +v.toFixed(2)),
    path: tips.filter((_, i) => i % 3 === 0).map((t) => t.toArray().map((v) => +v.toFixed(1)).join('/')).join(' ') };
}

// ---------- ground check: lowest skinned vertex per clip ----------
info.minY = {};
for (const [name, fr] of Object.entries(clips)) { const ys = fr.map((f) => X.minY(f)); const i = ys.indexOf(Math.min(...ys)); info.minY[name] = [+ys[i].toFixed(3), +(i / FPS).toFixed(2)]; }
// ---------- write ----------
for (const [name, fr] of Object.entries(clips)) if (want(name)) writeClip(doc, name, fr, FPS, joints, ['hips']);
const height = X.maxY(clips.idle[0]);
root.getDefaultScene().setName('ashspawn').setExtras({
  hit, height: +height.toFixed(3), walkSpeed: clips.walk ? WALK.v : 0, runSpeed: clips.run ? RUN.v : 0,
  credit: 'Executioner by thecubber (opengameart.org/content/rigged-textured-executioner), CC-BY 3.0, modified: retextured as a charred Ashspawn with ember-crack emissive map, rescaled, rig cleaned with fists baked in, animated with clips retargeted from Quaternius Universal Animation Library (CC0) plus hand-keyed attacks.',
  license: 'CC-BY 3.0',
  source: { model: 'https://opengameart.org/content/rigged-textured-executioner', anims: ['Quaternius Universal Animation Library (CC0)'] },
  clips: { idle: 'UAL Idle_Loop + breathing', walk: 'UAL Walk_Loop slowed + sway, procedural feet', run: 'UAL Jog_Fwd_Loop, procedural feet', attack: 'hand-keyed overhead cleaver chop', attack2: 'hand-keyed backhand swing', slam: 'hand-keyed two-handed ground slam', hit: 'hand-keyed flinch', die: 'UAL Death01 slowed' },
  emissive: 'ember cracks + eyes in the emissive map (emissiveFactor 1); scale emissiveIntensity to pulse',
  grips: ['grip_R', 'grip_L']
});
console.log(JSON.stringify({ hit, height, walk: WALK, run: RUN, info }));
if (!RAW) {
  await doc.transform(
    dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: TRI_MAX / 9536, error: 0.002, lockBorder: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    unpartition(),
    prune({ keepLeaves: true, keepAttributes: false })
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT);
