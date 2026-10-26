// Builds S/creatures/out/troll.glb: Troll Mauler (piacenti, CC-BY 3.0) rig + clips retargeted from Quaternius UAL (CC0)
// and KayKit Skeletons (CC0), re-timed and layered for weight (hunch, arm spread, breathing, sway), grips, extras.
// usage (cwd = this folder): node build.mjs [base.glb] [out.glb] [--raw] [--only idle,walk]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { prune, dedup, textureCompress, quantize, meshopt, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { THREE, writeClip } from './lib.mjs';
import { makeTarget, retarget, SPEC_KK } from './retarget.mjs';
import { addGrips, fingerPose } from './hands.mjs';
import { makeTools, ease, smooth, qAxis, _p, _q, cloneFrame, blendFrame, concat } from './tools.mjs';

const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const argv = process.argv.slice(2);
const RAW = argv.includes('--raw');
const oi = argv.indexOf('--only'); const ONLY = oi >= 0 ? argv[oi + 1].split(',') : null;
const glbs = argv.filter((a) => a.endsWith('.glb'));
const BASE = glbs[0] || 'base.glb', OUT = glbs[1] || S + '/creatures/out/troll.glb';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const FPS = 30;
const doc = await io.read(BASE);
const root = doc.getRoot();
const skin = root.listSkins()[0];
for (const m of root.listMaterials()) {
  if (m.getName() === 'loincloth') m.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true);
  else m.setDoubleSided(false);
}
// the loincloth texture goes in as encoded here: Blender's export re-saves it and replaces the colours under the
// cut-out with light grey, which bleeds a pale rim along the torn edges; WebP 'exact' keeps the bled colours
if (!RAW) doc.createExtension(EXTTextureWebP).setRequired(true);
for (const t of root.listTextures()) {
  const src = { cloth_troll: ['tex/cloth_troll.png', 512], cloth_nrm_512: ['tex/cloth_nrm_512.png', 256] }[t.getName()];
  if (!src) continue;
  const buf = readFileSync(src[0]), meta = await sharp(buf).metadata();
  const img = meta.width === src[1] ? sharp(buf) : sharp(buf).resize(src[1], src[1]);
  if (RAW) t.setImage(new Uint8Array(await img.png().toBuffer())).setMimeType('image/png');
  else t.setImage(new Uint8Array(await img.webp({ quality: 85, alphaQuality: 100, exact: true, effort: 6 }).toBuffer())).setMimeType('image/webp').setURI(t.getName() + '.webp');
}
const joints = new Map(skin.listJoints().map((j) => [j.getName(), j]));
const u1 = await io.read(S + '/chars/ual1.glb'), u2 = await io.read(S + '/chars/ual2.glb');
const kk = await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb');
const SRC = { u1: [u1, makeTarget(doc, u1)], u2: [u2, makeTarget(doc, u2)], kk: [kk, makeTarget(doc, kk, SPEC_KK, u1)] };
const T = SRC.u1[1];
const CURL = { R: 1, L: 0.85 }, CURLA = { f1: 0.75, f2: 0.65, t: 0.5 };
const fingers = fingerPose(doc, CURL, CURLA);
const grips = addGrips(doc, { back: 0.06, palm: 0.07 });
const X = makeTools(doc, T, FPS, grips);
const { fk, rotWorld, legIK, timewarp, resample, closeLoop, hips, ground } = X;
const want = (n) => !ONLY || ONLY.includes(n);

function clip(key, name, opts = {}) {
  const [sd, Tg] = SRC[key];
  const a = sd.getRoot().listAnimations().find((x) => x.getName() === name);
  if (!a) throw new Error('no clip ' + key + ':' + name);
  const fr = retarget(Tg, a, FPS, opts);
  for (const f of fr) for (const [b, q] of fingers) f.get(b).q.copy(q);
  return fr;
}
// ---------- layering helpers (world space, children follow) ----------
const AX = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
const rot = (f, b, axis, ang) => { if (Math.abs(ang) > 1e-5) rotWorld(f, b, new THREE.Quaternion().setFromAxisAngle(AX[axis] || axis, ang)); };
// aim bone (towards its child joint) at a world direction, by weight w
function aim(f, bone, child, dir, w = 1) {
  if (w <= 1e-4) return;
  const W = fk(f), cur = _p(W.get(child)).sub(_p(W.get(bone))).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
  rotWorld(f, bone, new THREE.Quaternion().slerp(q, w));
}
const feetOf = (f) => { const W = fk(f); return { L: W.get('foot_L').clone(), R: W.get('foot_R').clone() }; };
// troll posture: torso pitched forward (head compensates), arms swung away from the belly when they hang down
function posture(f, { hunch = 0.12, head = 0.7, spread = 0.3, keepFeet = true } = {}) {
  const feet = keepFeet ? feetOf(f) : null;
  rot(f, 'spine', 'X', hunch * 0.5); rot(f, 'chest', 'X', hunch * 0.5); rot(f, 'head', 'X', -hunch * head);
  if (spread) {
    const W = fk(f);
    for (const sd of ['L', 'R']) {
      const d = _p(W.get('forearm_' + sd)).sub(_p(W.get('upperarm_' + sd))).normalize();
      const down = Math.max(0, -d.y);           // 1 = hanging straight down, 0 = horizontal or raised
      rot(f, 'upperarm_' + sd, 'Z', (sd === 'L' ? 1 : -1) * spread * smooth(down));
    }
  }
  if (feet) legIK(f, feet);
}

// ---------- key-pose authoring ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const ARM = (sd) => (sd === 'L' ? 1 : -1);      // mirror x for the left arm
// a key pose: modifications applied to a copy of the stance frame. spec fields:
//  hips: [dx,dy,dz]; torso: {pitch, yaw, roll} (spread over spine + chest, + = bend forward / turn left / lean left)
//  head: {pitch, yaw}; arms: {R: {up: dir, fore: dir, club: dir}, L: {...}}  (dirs in world space, troll faces +Z)
//  shoulders: {L: ang, R: ang} raise; feet: {L: [dx,dy,dz], R: ...} foot target offsets
function key(stance, spec) {
  const f = cloneFrame(stance);
  const feet0 = feetOf(stance);
  const h = spec.hips || [0, 0, 0];
  f.get('hips').p.add(new THREE.Vector3(...h));
  const t = spec.torso || {};
  if (t.yaw) { rot(f, 'spine', 'Y', t.yaw * 0.45); rot(f, 'chest', 'Y', t.yaw * 0.55); }
  if (t.pitch) { rot(f, 'spine', 'X', t.pitch * 0.45); rot(f, 'chest', 'X', t.pitch * 0.55); }
  if (t.roll) { rot(f, 'spine', 'Z', t.roll * 0.5); rot(f, 'chest', 'Z', t.roll * 0.5); }
  if (spec.hipsRot) { const r = spec.hipsRot; if (r.yaw) rot(f, 'hips', 'Y', r.yaw); if (r.pitch) rot(f, 'hips', 'X', r.pitch); if (r.roll) rot(f, 'hips', 'Z', r.roll); }
  const hd = spec.head || {};
  if (hd.yaw) rot(f, 'head', 'Y', hd.yaw);
  if (hd.pitch) rot(f, 'head', 'X', hd.pitch);
  if (hd.roll) rot(f, 'head', 'Z', hd.roll);
  for (const [sd, a] of Object.entries(spec.shoulders || {})) rot(f, 'shoulder_' + sd, 'Z', ARM(sd) * a);
  for (const [sd, a] of Object.entries(spec.arms || {})) {
    if (a.up) aim(f, 'upperarm_' + sd, 'forearm_' + sd, a.up, a.w ?? 1);
    if (a.fore) aim(f, 'forearm_' + sd, 'hand_' + sd, a.fore, a.w ?? 1);
    if (a.club) { const W = fk(f), G = X.gripWorld(W, sd), cur = new THREE.Vector3(0, 1, 0).transformDirection(G);
      rotWorld(f, 'hand_' + sd, new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(cur, a.club.clone().normalize()), a.cw ?? 1)); }
    if (a.twist) { const W = fk(f), ax = _p(W.get('hand_' + sd)).sub(_p(W.get('forearm_' + sd))).normalize(); rotWorld(f, 'forearm_' + sd, new THREE.Quaternion().setFromAxisAngle(ax, a.twist)); }
  }
  const tg = {};
  for (const sd of ['L', 'R']) { const o = (spec.feet || {})[sd]; const m = feet0[sd].clone(); if (o) { const e = new THREE.Matrix4().makeTranslation(o[0], o[1], o[2]); m.premultiply(e); if (o[3]) m.multiply(new THREE.Matrix4().makeRotationX(o[3])); } tg[sd] = m; }
  legIK(f, tg);
  f.feet = tg;
  return f;
}
const EASE = {
  lin: (x) => x, io: smooth, in: (x) => x * x, in3: (x) => x * x * x, out: (x) => 1 - (1 - x) * (1 - x), out3: (x) => 1 - (1 - x) ** 3,
  back: (x) => { const c = 1.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; }
};
// timeline: [[time, frame, easeIntoThisKey], ...] -> frames at FPS; feet re-planted on every frame
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
// small additive tremble (roar / effort) on the torso and arms between t0 and t1
function tremble(frames, t0, t1, amp = 0.02, hz = 11) {
  frames.forEach((f, i) => {
    const t = i / FPS, w = ease(t, t0, t0 + 0.15) * (1 - ease(t, t1 - 0.2, t1));
    if (w <= 0) return;
    const feet = feetOf(f);
    rot(f, 'chest', 'X', amp * w * Math.sin(t * hz * 6.283));
    rot(f, 'chest', 'Z', amp * 0.6 * w * Math.sin(t * hz * 1.37 * 6.283 + 1));
    rot(f, 'head', 'Y', amp * 0.8 * w * Math.sin(t * hz * 0.83 * 6.283 + 2));
    legIK(f, feet);
  });
}
const tipOf = (f, sd = 'R', len = 1.3) => new THREE.Vector3(0, len, 0).applyMatrix4(X.gripWorld(fk(f), sd));


// ---------- procedural legs for the in-place loops: exact speed, planted feet, no skating ----------
// stance: ankle slides straight back at v on the ground (flat foot); swing: eased forward with a lift arc and a little
// toe-down / heel-first pitch. Upper body, arms and hip bob come from the retargeted clip; knees by two-bone IK.
const restW = fk(new Map([...T.RT].filter(([n]) => joints.has(n)).map(([n, r]) => [n, { q: r.local.q.clone(), p: r.local.p.clone() }])));
const LEG = { len: _p(restW.get('thigh_L')).distanceTo(_p(restW.get('shin_L'))) + _p(restW.get('shin_L')).distanceTo(_p(restW.get('foot_L'))) };
function procLegs(frames, { v, duty, lift, phase = { L: 0, R: 0.5 }, width = 0, zc = 0.0, pitch = 0.35, reach = 0.97 }) {
  const n = frames.length - 1, Tc = n / FPS, D = v * duty * Tc;
  const foot0 = { L: restW.get('foot_L').clone(), R: restW.get('foot_R').clone() };   // bind pose: soles flat on y=0
  const out = { maxDrop: 0 };
  frames.forEach((f, i) => {
    const tg = {};
    for (const sd of ['L', 'R']) {
      const p0 = _p(foot0[sd]), q0 = _q(foot0[sd]);
      const p = (((i / n) - phase[sd]) % 1 + 1) % 1;
      const x = p0.x + (sd === 'L' ? -width : width);
      let z, y = p0.y, pa = 0;
      if (p < duty) { const s = p / duty; z = zc + D / 2 - D * s; pa = 0; }
      else {
        const s = (p - duty) / (1 - duty);
        z = zc - D / 2 + D * smooth(s);
        y = p0.y + lift * Math.sin(Math.PI * Math.min(1, s * 1.1));
        pa = s < 0.5 ? pitch * Math.sin(Math.PI * s * 2) * (1 - s) : -0.4 * pitch * Math.sin(Math.PI * (s - 0.5) * 2);   // toes down early, heel first late
      }
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pa).multiply(q0);
      tg[sd] = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    }
    // lower the hips if a foot target is out of reach
    let drop = 0;
    const W = fk(f);
    for (const sd of ['L', 'R']) {
      const hp = _p(W.get('thigh_' + sd)), tp = _p(tg[sd]);
      const dxz = Math.hypot(tp.x - hp.x, tp.z - hp.z), maxL = LEG.len * reach;
      if (dxz < maxL) { const need = hp.y - tp.y - Math.sqrt(maxL * maxL - dxz * dxz); drop = Math.max(drop, need); }
    }
    f.drop = drop;
  });
  // smooth the hip drop over time (cyclic) so it never pops
  const dr = frames.map((f) => f.drop);
  const sm = dr.map((_, i) => { let m = 0; for (let k = -4; k <= 4; k++) m = Math.max(m, dr[((i + k) % n + n) % n]); return m; });
  const sm2 = sm.map((_, i) => { let s = 0; for (let k = -3; k <= 3; k++) s += sm[((i + k) % n + n) % n]; return s / 7; });
  frames.forEach((f, i) => {
    f.get('hips').p.y -= sm2[i]; out.maxDrop = Math.max(out.maxDrop, sm2[i]);
    const tg = {};
    for (const sd of ['L', 'R']) {
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
        y += 0.4 * Math.sin(Math.max(0, pa)) + 0.14 * Math.sin(Math.max(0, -pa));   // pitched toes / heel stay above ground
      }
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pa).multiply(q0);
      tg[sd] = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      f.get('toe_' + sd).q.copy(T.RT.get('toe_' + sd).local.q);
    }
    legIK(f, tg);
    delete f.drop;
  });
  return out;
}

const clips = {}, hit = {}, info = {};
const WALK = { T: 1.6, v: 0.85 }, RUN = { T: 0.95, v: 2.2 };

// ---------- idle: UAL Idle_Loop slowed, heavy breathing on top ----------
{
  let fr = resample(clip('u1', 'Idle_Loop'), 3.2); hips(fr, { loop: true }); closeLoop(fr);
  const n = fr.length - 1;
  fr.forEach((f, i) => {
    const ph = (i / n) * Math.PI * 2 * 2;    // two breaths per loop
    const b = 0.5 - 0.5 * Math.cos(ph);       // 0 exhaled .. 1 inhaled
    const feet = feetOf(f);
    posture(f, { hunch: 0.16, spread: 0.32, keepFeet: false });
    rot(f, 'chest', 'X', -0.07 * b); rot(f, 'spine', 'X', -0.03 * b); rot(f, 'head', 'X', 0.05 * b - 0.02);
    rot(f, 'shoulder_L', 'Z', 0.06 * b); rot(f, 'shoulder_R', 'Z', -0.06 * b);
    f.get('hips').p.y += 0.012 * b;
    legIK(f, feet);
  });
  clips.idle = fr; info.idle = ground(fr, 'const');
}


const stance = cloneFrame(clips.idle[0]);
const P = (x, y, z) => V(x, y, z);
// ---------- walk: UAL Walk_Loop slowed to a lumber, hunched, side-to-side sway, procedural planted feet ----------
if (want('walk')) {
  let fr = resample(clip('u1', 'Walk_Loop'), WALK.T); hips(fr, { loop: true }); closeLoop(fr);
  const n = fr.length - 1;
  fr.forEach((f, i) => {
    const ph = (i / n) * Math.PI * 2; const s = Math.cos(ph);   // +1 = weight over the left foot (left foot strikes at phase 0)
    posture(f, { hunch: 0.2, spread: 0.3, keepFeet: false });
    f.get('hips').p.x += 0.06 * s; f.get('hips').p.y -= 0.03;
    rot(f, 'hips', 'Z', -0.04 * s); rot(f, 'chest', 'Z', 0.07 * s); rot(f, 'head', 'Z', -0.035 * s);
    rot(f, 'chest', 'Y', 0.05 * Math.sin(ph));
  });
  info.walkLegs = procLegs(fr, { v: WALK.v, duty: 0.62, lift: 0.16, phase: { L: 0.02, R: 0.52 }, width: 0.04, zc: 0.0, pitch: 0.3 });
  clips.walk = fr;
}
// ---------- run: UAL Jog_Fwd_Loop, heavier, hunched, procedural planted feet ----------
if (want('run')) {
  let fr = resample(clip('u1', 'Jog_Fwd_Loop'), RUN.T); hips(fr, { loop: true }); closeLoop(fr);
  fr.forEach((f) => { posture(f, { hunch: 0.12, spread: 0.25, keepFeet: false }); rot(f, 'head', 'X', -0.3); f.get('hips').p.y -= 0.05; });
  info.runLegs = procLegs(fr, { v: RUN.v, duty: 0.4, lift: 0.3, phase: { L: 0.0, R: 0.5 }, width: 0.08, zc: 0.05, pitch: 0.45, reach: 0.985 });
  clips.run = fr;
}
// ---------- attack: overhead club smash (right hand), heavy wind-up, fast drop, impact hold ----------
if (want('attack')) {
  const k1 = key(stance, { hips: [0.03, 0.04, -0.06], torso: { pitch: -0.22, yaw: -0.25 }, head: { pitch: -0.05, yaw: 0.15 },
    arms: { R: { up: P(-0.3, 0.92, -0.25), fore: P(0.15, 0.2, -1), club: P(0.1, -0.6, -0.8), cw: 0.6 }, L: { up: P(0.55, -0.35, 0.75), fore: P(0.25, 0.1, 1) } },
    shoulders: { R: 0.15 } });
  const k2 = key(stance, { hips: [0.0, 0.02, 0.0], torso: { pitch: -0.05, yaw: -0.1 }, head: { pitch: 0.0 },
    arms: { R: { up: P(-0.22, 0.88, 0.4), fore: P(-0.1, 0.55, 0.83), club: P(0, 0.55, 0.83), cw: 0.7 }, L: { up: P(0.6, -0.55, 0.45), fore: P(0.3, -0.3, 0.9) } } });
  const k3 = key(stance, { hips: [0.0, -0.24, 0.1], torso: { pitch: 0.52, yaw: 0.12 }, head: { pitch: -0.3 },
    arms: { R: { up: P(-0.18, -0.25, 0.95), fore: P(-0.05, -0.5, 0.86), club: P(0.05, -0.74, 0.67), cw: 0.85 }, L: { up: P(0.6, -0.75, -0.25), fore: P(0.35, -0.85, 0.2) } },
    feet: { R: [0, 0, 0.12] } });
  const k4 = key(stance, { hips: [0.0, -0.2, 0.08], torso: { pitch: 0.44, yaw: 0.1 }, head: { pitch: -0.25 },
    arms: { R: { up: P(-0.2, -0.3, 0.93), fore: P(-0.08, -0.55, 0.83), club: P(0.05, -0.68, 0.73), cw: 0.85 }, L: { up: P(0.6, -0.75, -0.2), fore: P(0.35, -0.85, 0.2) } },
    feet: { R: [0, 0, 0.12] } });
  const fr = timeline([[0, stance], [0.62, k1, 'io'], [0.8, k2, 'in'], [0.98, k3, 'out'], [1.35, k4, 'io'], [2.05, stance, 'io']]);
  clips.attack = fr; hit.attack = 0.98;
}
// ---------- attack2: side swipe, right to left, body uncoiling ----------
if (want('attack2')) {
  const k1 = key(stance, { hips: [-0.06, -0.05, -0.03], torso: { pitch: 0.1, yaw: -0.6 }, hipsRot: { yaw: -0.2 }, head: { yaw: 0.45 },
    arms: { R: { up: P(-0.85, 0.15, -0.5), fore: P(-0.45, 0.35, -0.8), club: P(0.2, 0.55, -0.8), cw: 0.6 }, L: { up: P(0.35, -0.4, 0.85), fore: P(-0.3, -0.1, 0.95) } } });
  const k2 = key(stance, { hips: [0.0, -0.1, 0.06], torso: { pitch: 0.25, yaw: -0.05 }, hipsRot: { yaw: 0 }, head: { yaw: 0.05 },
    arms: { R: { up: P(-0.55, -0.12, 0.83), fore: P(-0.1, -0.1, 1.0), club: P(0.75, -0.25, 0.6), cw: 0.8 }, L: { up: P(0.75, -0.55, -0.1), fore: P(0.5, -0.5, 0.4) } } });
  const k3 = key(stance, { hips: [0.07, -0.08, 0.05], torso: { pitch: 0.18, yaw: 0.55 }, hipsRot: { yaw: 0.2 }, head: { yaw: -0.35 },
    arms: { R: { up: P(0.4, -0.15, 0.9), fore: P(0.9, -0.05, 0.4), club: P(0.6, 0, -0.8), cw: 0.7 }, L: { up: P(0.7, -0.6, -0.4), fore: P(0.4, -0.6, -0.2) } } });
  const k4 = key(stance, { hips: [0.06, -0.06, 0.04], torso: { pitch: 0.15, yaw: 0.45 }, hipsRot: { yaw: 0.15 }, head: { yaw: -0.3 },
    arms: { R: { up: P(0.3, -0.3, 0.9), fore: P(0.8, -0.2, 0.5), club: P(0.6, -0.3, -0.7), cw: 0.6 }, L: { up: P(0.7, -0.6, -0.4), fore: P(0.4, -0.6, -0.2) } } });
  const fr = timeline([[0, stance], [0.6, k1, 'io'], [0.84, k2, 'in'], [1.02, k3, 'out'], [1.3, k4, 'io'], [1.95, stance, 'io']]);
  clips.attack2 = fr; hit.attack2 = 0.84;
}
// ---------- slam: both fists raised overhead and hammered into the ground ----------
if (want('slam')) {
  const k1 = key(stance, { hips: [0, 0.06, -0.05], torso: { pitch: -0.28 }, head: { pitch: -0.15 }, shoulders: { L: 0.2, R: 0.2 },
    arms: { R: { up: P(-0.3, 0.93, 0.1), fore: P(0.55, 0.75, -0.1), club: P(0.1, 0.2, -1), cw: 0.7 }, L: { up: P(0.3, 0.93, 0.1), fore: P(-0.55, 0.75, -0.1) } } });
  // impact: bow forward until the fists reach the ground in front
  const slamKey = (pitch, drop) => key(stance, { hips: [0, -drop, -0.04], torso: { pitch }, head: { pitch: -0.55 * pitch },
    arms: { R: { up: P(-0.28, -0.55, 0.8), fore: P(0.05, -0.92, 0.35), club: P(-0.15, -0.1, 1), cw: 0.85 }, L: { up: P(0.28, -0.55, 0.8), fore: P(-0.05, -0.92, 0.35) } } });
  const fistY = (f) => { const W = fk(f); return Math.min(...['L', 'R'].map((sd) => _p(X.gripWorld(W, sd)).y)); };
  let best = null;
  for (let pitch = 0.6; pitch <= 1.4; pitch += 0.05) { const k = slamKey(pitch, 0.32); const y = fistY(k); if (!best || Math.abs(y - 0.16) < Math.abs(best.y - 0.16)) best = { pitch, y, k }; }
  info.slamSolve = { pitch: +best.pitch.toFixed(2), fistY: +best.y.toFixed(3) };
  const k2 = best.k, k3 = slamKey(best.pitch - 0.06, 0.29);
  const fr = timeline([[0, stance], [0.75, k1, 'io'], [0.98, k2, 'in3'], [1.45, k3, 'out'], [2.3, stance, 'io']]);
  clips.slam = fr; hit.slam = 0.98;
}
// ---------- warcry: gather, then roar with the chest thrown out and arms flung wide ----------
if (want('warcry')) {
  const k1 = key(stance, { hips: [0, -0.1, 0], torso: { pitch: 0.3 }, head: { pitch: 0.25 },
    arms: { R: { up: P(-0.3, -0.65, 0.65), fore: P(0.45, 0.1, 0.9) }, L: { up: P(0.3, -0.65, 0.65), fore: P(-0.45, 0.1, 0.9) } } });
  const k2 = key(stance, { hips: [0, 0.03, -0.03], torso: { pitch: -0.28 }, head: { pitch: -0.5 }, shoulders: { L: 0.25, R: 0.25 },
    arms: { R: { up: P(-0.92, -0.05, -0.3), fore: P(-0.5, 0.8, 0.2) }, L: { up: P(0.92, -0.05, -0.3), fore: P(0.5, 0.8, 0.2) } } });
  const fr = timeline([[0, stance], [0.45, k1, 'io'], [0.8, k2, 'out3'], [1.9, k2, 'lin'], [2.6, stance, 'io']]);
  tremble(fr, 0.8, 1.95, 0.025, 9);
  clips.warcry = fr; hit.warcry = 0.8;
}
// ---------- hit: heavy flinch ----------
if (want('hit')) {
  const k1 = key(stance, { hips: [0, -0.02, -0.08], torso: { pitch: -0.22, yaw: 0.12, roll: 0.06 }, head: { pitch: -0.25, yaw: -0.15 },
    arms: { R: { up: P(-0.8, -0.35, 0.3), w: 0.6 }, L: { up: P(0.8, -0.35, 0.3), w: 0.6 } } });
  const fr = timeline([[0, stance], [0.12, k1, 'out'], [0.6, stance, 'io']]);
  clips.hit = fr;
}

// ---------- die: KayKit Death_B (drops to the knees, topples forward onto the face), slowed for weight ----------
if (want('die')) {
  let fr = clip('kk', 'Death_B'); hips(fr, { keepXZ: 0.6 });
  fr = timewarp(fr, [[0, 0], [0.9, 1.25], [1.6, 2.05], [2.63, 3.0]]);
  // blend in from the troll stance during the first 0.3 s
  fr = fr.map((f, i) => blendFrame(stance, f, ease(i / FPS, 0, 0.3)));
  const y0 = X.minY(fr[0]); fr.forEach((f) => (f.get('hips').p.y -= y0));
  // nothing below the ground once the body goes down
  const lift = fr.map((f) => Math.max(0, -X.minY(f)));
  const sm = lift.map((_, i) => { let m = 0; for (let k = -3; k <= 3; k++) m = Math.max(m, lift[Math.min(lift.length - 1, Math.max(0, i + k))]); return m; });
  fr.forEach((f, i) => (f.get('hips').p.y += sm[i]));
  info.die = { lift: +Math.max(...lift).toFixed(3), endMinY: +X.minY(fr[fr.length - 1]).toFixed(3) };
  clips.die = fr;
}

// ---------- strike probes: club tip (1.3 m along grip +Y) ----------
for (const name of ['attack', 'attack2', 'slam']) {
  if (!clips[name]) continue;
  const tips = clips[name].map((f) => tipOf(f));
  const sp = tips.map((t, i) => (i ? t.distanceTo(tips[i - 1]) * FPS : 0));
  const pk = sp.indexOf(Math.max(...sp));
  info[name + 'Tip'] = { peakT: +(pk / FPS).toFixed(2), peakV: +sp[pk].toFixed(1), atHit: tips[Math.round(hit[name] * FPS)].toArray().map((v) => +v.toFixed(2)),
    path: tips.filter((_, i) => i % 3 === 0).map((t) => t.toArray().map((v) => +v.toFixed(1)).join('/')).join(' ') };
}

// ---------- write ----------
let walkSpeed = 0, runSpeed = 0;
if (clips.walk) walkSpeed = WALK.v;
if (clips.run) runSpeed = RUN.v;
for (const [name, fr] of Object.entries(clips)) if (want(name)) writeClip(doc, name, fr, FPS, joints, ['hips']);
let height = 0;
if (clips.idle) height = X.maxY(clips.idle[0]);
root.getDefaultScene().setName('troll').setExtras({
  hit, height: +height.toFixed(3), walkSpeed, runSpeed,
  credit: 'Troll Mauler by piacenti (opengameart.org/content/troll-mauler), CC-BY 3.0, modified: retextured (grey-green hill-troll skin), rig cleaned with finger bones added, animated with clips retargeted from Quaternius Universal Animation Library (CC0) and KayKit Character Pack: Skeletons by Kay Lousberg (CC0) plus hand-keyed attacks.',
  license: 'CC-BY 3.0',
  source: { model: 'https://opengameart.org/content/troll-mauler', anims: ['Quaternius Universal Animation Library (CC0)', 'KayKit Character Pack: Skeletons by Kay Lousberg (CC0)'] },
  clips: { idle: 'UAL Idle_Loop + breathing layer', walk: 'UAL Walk_Loop slowed + sway', run: 'UAL Jog_Fwd_Loop', attack: 'hand-keyed overhead club smash', attack2: 'hand-keyed side swipe', slam: 'hand-keyed two-fist ground slam', warcry: 'hand-keyed roar', hit: 'hand-keyed flinch', die: 'KayKit Death_B slowed' },
  grips: ['grip_R', 'grip_L']
});
console.log(JSON.stringify({ hit, height, walkSpeed, runSpeed, info }));
if (!RAW) {
  await doc.transform(
    dedup(), weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColor/, pattern: /^(skin|eye)/, resize: [1024, 1024], quality: 82 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(normal|occlusion|metallicRoughness)/, pattern: /^troll/, resize: [512, 512], quality: 85 }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    unpartition(),
    prune({ keepLeaves: true, keepAttributes: false })
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT);
