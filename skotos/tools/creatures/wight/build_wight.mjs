// Builds S/creatures/out/wight.glb: MakeHuman/MPFB (CC0) gaunt corpse in a tattered monk robe (CC0), retextured,
// with clips retargeted from Quaternius UAL (CC0) and KayKit (CC0) and authored on top. usage: node build_wight.mjs [out] [--raw]
import { prune, dedup, textureCompress, quantize, meshopt, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { io, S, THREE, FPS, makeRef, retarget, makeRig, inPlace, closeLoop, writeClip, cloneFrame, blendFrame, concat, timewarp, shiftHip, ease, smooth, qAxis, mpos } from './lib.mjs';
import { keyed, layer, amplify, damp, bend, plant, soleList, ground, footSpeed, tipTrack, speeds, argmax, meanFrame, makeCurl } from './anim.mjs';
import { corpseSkin, darkCloth, recolor, uvRaster, load, save, solid } from './tex.mjs';
import { primsOf, meshesNamed, remapUV, freeBlock, mergeInto, skirtWeights, addGrips, handFrame } from './mesh.mjs';

const W = S + '/creatures/wight';
const MD = S + '/research/tooling/blender_user/extensions/.user/user_default/mpfb/data';
const GD = S + '/research/github/blender_user/extensions/.user/user_default/mpfb/data';
const argv = process.argv.slice(2), RAW = argv.includes('--raw');
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/wight.glb';
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);

const doc = await io.read(W + '/wight_base.glb');
const root = doc.getRoot();

// ---------------- materials / textures ----------------
const robeP = primsOf(doc, 'robe')[0], hoodP = primsOf(doc, 'hood')[0], clawP = primsOf(doc, 'claw')[0], eyeP = primsOf(doc, 'low-poly')[0], bodyP = primsOf(doc, 'base')[0];
const TS = 1024;
// free patches inside the robe layout for the claws and the eyes
const clawBox = freeBlock([robeP, hoodP], 0.12), eyeBox = freeBlock([robeP, hoodP], 0.05, [clawBox]);
console.log('patches', clawBox, eyeBox);
// hem grime: rest height of the cloth rasterised in UV space
const hmap = uvRaster(TS, [robeP, hoodP], (p) => p[1]);
const cloth = await darkCloth(MD + '/clothes/donitz_monk_robe/robe_brown__diffuse.png', TS, { height: hmap, tint: [0.63, 0.72, 0.70], gain: 1.35, sat: 0.12, hemDark: 0.42, hemTo: 0.6, mud: 0.5 });
// the rope belt (top-left strip of the robe layout) becomes a dark cord
for (let y = 0; y < Math.round(0.07 * TS); y++) for (let x = 0; x < Math.round(0.5 * TS); x++) for (let c = 0; c < 3; c++) cloth.d[(y * TS + x) * 3 + c] *= 0.4;
for (let y = Math.round(0.11 * TS); y < Math.round(0.18 * TS); y++) for (let x = Math.round(0.09 * TS); x < Math.round(0.2 * TS); x++) for (let c = 0; c < 3; c++) cloth.d[(y * TS + x) * 3 + c] *= 0.4;
// claws: old yellowed bone, recoloured from their own texture and pasted into the patch
const clawTex = await recolor(MD + '/clothes/culturalibre_hand_claws/claws.png', Math.round(clawBox[2] * TS), (r, g, b) => { const l = 0.3 * r + 0.59 * g + 0.11 * b; return [0.22 + l * 0.42, 0.21 + l * 0.38, 0.18 + l * 0.30]; });
const paste = (dst, src, box, inset = 0) => {
  const x0 = Math.round(box[0] * dst.w), y0 = Math.round(box[1] * dst.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) for (let c = 0; c < 3; c++) dst.d[((y0 + y) * dst.w + x0 + x) * 3 + c] = src.d[(y * src.w + x) * 3 + c];
};
paste(cloth, clawTex, clawBox);
const eyeCol = [150, 215, 235];
const fill = (img, box, rgb) => { const x0 = Math.round(box[0] * img.w), y0 = Math.round(box[1] * img.h), s = Math.round(box[2] * img.w); for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) for (let c = 0; c < 3; c++) img.d[(y * img.w + x) * 3 + c] = rgb[c]; };
fill(cloth, eyeBox, eyeCol);
// normal map: robe normals, flat in the patches
const nrm = await load(MD + '/clothes/donitz_monk_robe/robe__normal_gl.png', 512);
fill(nrm, clawBox, [128, 128, 255]); fill(nrm, eyeBox, [128, 128, 255]);
// emissive: only the eye patch
const em = { w: 256, h: 256, d: new Uint8Array(256 * 256 * 3) }; fill(em, eyeBox, [255, 255, 255]);
// UVs of claws and eyes into their patches (inset so bilinear filtering stays inside)
const inset = (b, k) => [b[0] + b[2] * k, b[1] + b[2] * k, b[2] * (1 - 2 * k)];
{ const b = inset(clawBox, 0.03); remapUV(clawP, b[0], b[1], b[2]); }
{ const b = inset(eyeBox, 0.25); remapUV(eyeP, b[0], b[1], b[2]); }
const tex = async (name, buf) => doc.createTexture(name).setImage(buf).setMimeType('image/png');
const clothMat = doc.createMaterial('wight_cloth')
  .setBaseColorTexture(await tex('wight_cloth', await save(cloth))).setNormalTexture(await tex('wight_cloth_n', await save(nrm))).setNormalScale(0.8)
  .setEmissiveTexture(await tex('wight_eyes_e', await save(em))).setEmissiveFactor([0.4, 0.85, 1.0])
  .setRoughnessFactor(0.95).setMetallicFactor(0).setDoubleSided(true).setAlphaMode('OPAQUE');
// skin: corpse recolour of the old-male skin with zombie mottling
const skinImg = await corpseSkin(MD + '/skins/old_caucasian_male/old_lightskinned_male_diffuse.png', GD + '/skins/sohh_female_zombie_skin/sohh_Zombie_Female_diffuse.png', TS, {});
const skinMat = doc.createMaterial('wight_skin').setBaseColorTexture(await tex('wight_skin', await save(skinImg)))
  .setRoughnessFactor(0.7).setMetallicFactor(0).setDoubleSided(false).setAlphaMode('OPAQUE');
bodyP.setMaterial(skinMat);
mergeInto(doc, [robeP, hoodP, clawP, eyeP], clothMat);
for (const m of root.listMaterials()) if (m !== clothMat && m !== skinMat) m.dispose();
for (const t of root.listTextures()) if (!['wight_cloth', 'wight_cloth_n', 'wight_eyes_e', 'wight_skin'].includes(t.getName())) t.dispose();
// skirt weights on the robe part of the merged cloth primitive
console.log('skirt verts', skirtWeights(doc, robeP, { legMax: 0.75, side: 0.12, hemY: 0.05 }));

// ---------------- rig / retarget ----------------
const SRC = { u1: { doc: await io.read(S + '/chars/ual1.glb'), kind: 'ual' }, u2: { doc: await io.read(S + '/chars/ual2.glb'), kind: 'ual' },
  kk: { doc: await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb'), kind: 'kk' } };
const T = makeRef(doc, SRC.u1.doc), rig = makeRig(T);
const SOLE = soleList(rig);
const joints = new Map(root.listSkins()[0].listJoints().map((j) => [j.getName(), j]));
const grips = addGrips(doc, { along: 0.55, palm: 0.025 });
const R = (s, c, o) => retarget(T, SRC[s], c, o);
const B = T.names;
const SPINE = ['spine_01', 'spine_02', 'spine_03'], NECK = ['neck_01', 'Head'];
const ARM = (s) => ['clavicle_' + s, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, ...B.filter((b) => new RegExp('^(index|middle|ring|pinky|thumb)_0\\d_' + s + '$').test(b))];
const LEGS = B.filter((b) => /^(thigh|calf|foot|ball)_[lr]$/.test(b));
const UPPER = [...SPINE, ...NECK, ...ARM('l'), ...ARM('r')];
const X = [1, 0, 0], Yax = [0, 1, 0], Zax = [0, 0, 1];
const deg = (d) => (d * Math.PI) / 180;

const clips = {}, hit = {}, info = {};
const want = (n) => !ONLY.length || ONLY.includes(n);

// idle: zombie hunch blended with the standing idle, head lifted towards the prey
const zI = R('u2', 'Zombie_Idle_Loop'), sI = R('u1', 'Idle_Loop');
const zI2 = [...zI, ...zI.slice(1)], sI2 = timewarp(sI, [[0, 0], [2.5, (zI2.length - 1) / FPS]]);
clips.idle = zI2.map((f, i) => blendFrame(sI2[i], f, 0.6));
bend(rig, clips.idle, [['neck_01', 0.5], ['Head', 0.5]], X, () => deg(-16));
inPlace(T, clips.idle, { loop: true }); closeLoop(clips.idle); info.idle = ground(T, rig, clips.idle, 'const', SOLE);
const IDLE0 = clips.idle[0];

// walk: slow, short-stepping glide; upper body keeps the stalking idle posture with a little sway
if (want('walk') || want('run') || true) {
  let w = R('u1', 'Walk_Loop');
  inPlace(T, w, { loop: true });
  w = damp(w, LEGS, 0.62);
  // pelvis bob reduced
  const m = w.reduce((a, f) => a + f.get('pelvis').p.clone().applyMatrix4(T.RT.get('pelvis').parentWorld).y, 0) / w.length;
  for (const f of w) { const wy = f.get('pelvis').p.clone().applyMatrix4(T.RT.get('pelvis').parentWorld).y; shiftHip(T, f, new THREE.Vector3(0, (m - wy) * 0.65, 0)); }
  const up = meanFrame(clips.idle);
  w = layer(w, () => up, UPPER, (i, b) => (/^(clavicle|upperarm|lowerarm|hand|index|middle|ring|pinky|thumb)/.test(b) ? 0.75 : 0.7));
  w = timewarp(w, [[0, 0], [(w.length - 1) / FPS, 1.7]]);
  closeLoop(w); info.walk = ground(T, rig, w, 'stance', SOLE);
  clips.walk = w;
}


const curl = makeCurl(T, handFrame);
const withFrames = (fr, fn) => { fr.forEach((f, i) => fn(f, i, i / FPS)); return fr; };
const lunge = (fr, fn) => {   // body edits with the feet kept where they were
  const ref = fr.map(cloneFrame);
  fr.forEach((f, i) => fn(f, i, i / FPS));
  plant(rig, fr, ref);
  return fr;
};

// run: hunted rush, torso pitched forward, arms half trailing
if (want('run')) {
  let r = R('u1', 'Jog_Fwd_Loop');
  inPlace(T, r, { loop: true });
  r = damp(r, ARM('l').concat(ARM('r')), 0.55);
  bend(rig, r, [['spine_01', 0.4], ['spine_02', 0.35], ['spine_03', 0.25]], X, () => deg(9));
  bend(rig, r, [['neck_01', 0.5], ['Head', 0.5]], X, () => deg(-10));
  closeLoop(r); info.run = ground(T, rig, r, 'stance', SOLE);
  clips.run = r;
}

// attack: wild one-arm claw swipe (UAL hook + recovery), from and back to the stalking idle
if (want('attack')) {
  let a = concat(R('u2', 'Melee_Hook'), R('u2', 'Melee_Hook_Rec'), 3);
  inPlace(T, a, { keepXZ: 0.4 });
  // milder crouch: lower body and hip height pulled towards the standing idle
  {
    const RootW = T.RT.get('pelvis').parentWorld, y0 = IDLE0.get('pelvis').p.clone().applyMatrix4(RootW).y;
    a = layer(a, () => IDLE0, LEGS, 0.55);
    for (const f of a) { const wy = f.get('pelvis').p.clone().applyMatrix4(RootW).y; shiftHip(T, f, new THREE.Vector3(0, (y0 - wy) * 0.55, 0)); }
  }
  const n = a.length;
  a = [...keyed([[0, IDLE0], [0.12, a[0]]]).slice(0, -1), ...a, ...keyed([[0, a[n - 1]], [0.3, IDLE0]]).slice(1)];
  info.attack = ground(T, rig, a, 'perframe', SOLE);
  const sp = { r: speeds(tipTrack(rig, a, grips.r, 0.18)), l: speeds(tipTrack(rig, a, grips.l, 0.18)) };
  const side = Math.max(...sp.r) > Math.max(...sp.l) ? 'r' : 'l', i = argmax(sp[side]);
  hit.attack = +(i / FPS).toFixed(3); info.attackSide = side;
  clips.attack = a;
}

let PUSHF = null;
// attack2: two-hand grab: rear back, lunge with both arms thrust out, claws clench, pull back
if (want('attack2')) {
  const push = R('u1', 'Push_Loop');
  // frame where both hands are furthest forward
  const fz = push.map((f) => { const Wm = rig.fk(f); return mpos(Wm.get('hand_l')).z + mpos(Wm.get('hand_r')).z; });
  const P = cloneFrame(push[argmax(fz)]);
  for (const b of [...LEGS, 'pelvis']) { P.get(b).q.copy(IDLE0.get(b).q); P.get(b).p.copy(IDLE0.get(b).p); }
  // arms levelled to point straight ahead at the victim's chest
  { const Wm = rig.fk(P); for (const s of ['l', 'r']) rig.rotateWorld(P, 'upperarm_' + s, qAxis(1, 0, 0, deg(38)), Wm); }
  for (const s of ['l', 'r']) rig.rotateWorld(P, 'lowerarm_' + s, qAxis(1, 0, 0, deg(10)));
  const wind = layer([IDLE0], [P], UPPER, 0.45)[0];
  PUSHF = cloneFrame(P);
  const clutch = cloneFrame(P); curl(clutch, 'l', 0.9); curl(clutch, 'r', 0.9);
  const open = cloneFrame(P); curl(open, 'l', -0.25); curl(open, 'r', -0.25);
  let a = keyed([[0, IDLE0], [0.32, wind], [0.55, open, 'snap'], [0.72, clutch], [0.9, clutch], [1.35, IDLE0]]);
  lunge(a, (f, i, t) => {
    const w = ease(t, 0.3, 0.55) * (1 - ease(t, 0.85, 1.3)), back = ease(t, 0.05, 0.32) * (1 - ease(t, 0.32, 0.5));
    shiftHip(T, f, new THREE.Vector3(0, -0.1 * w, 0.3 * w - 0.08 * back));
    bend(rig, [f], [['spine_01', 0.35], ['spine_02', 0.35], ['spine_03', 0.3]], X, () => deg(40 * w - 14 * back));
    bend(rig, [f], [['neck_01', 0.5], ['Head', 0.5]], X, () => deg(-30 * w));
    for (const s of ['l', 'r']) rig.rotateWorld(f, 'upperarm_' + s, qAxis(1, 0, 0, deg(-30 * w)));
  });
  info.attack2 = ground(T, rig, a, 'first', SOLE);
  hit.attack2 = 0.6;
  clips.attack2 = a;
}

// cast: arms raised high, a held tremble, then thrust forward to release
if (want('cast')) {
  const sm = R('kk', 'Spellcast_Summon'), sh = R('kk', 'Spellcast_Shoot');
  const up = cloneFrame(sm[Math.round(3.05 * FPS)]), up2 = cloneFrame(sm[Math.round(3.35 * FPS)]);
  const thr = cloneFrame(sh[Math.round(0.35 * FPS)]);
  for (const fr of [up, up2, thr]) for (const b of [...LEGS, 'pelvis']) { fr.get(b).q.copy(IDLE0.get(b).q); fr.get(b).p.copy(IDLE0.get(b).p); }
  const upL = layer([IDLE0], [up], UPPER, 1)[0], up2L = layer([IDLE0], [up2], UPPER, 1)[0];
  curl(upL, 'l', -0.3); curl(upL, 'r', -0.3);
  const thrL = cloneFrame(clips.attack2 ? PUSHF : IDLE0); curl(thrL, 'l', -0.35); curl(thrL, 'r', -0.35);
  let c = keyed([[0, IDLE0], [0.5, upL], [0.95, up2L], [1.12, thrL, 'snap'], [1.35, thrL], [1.85, IDLE0]]);
  lunge(c, (f, i, t) => {
    const r = ease(t, 0.1, 0.5) * (1 - ease(t, 0.95, 1.12)), fw = ease(t, 0.95, 1.12) * (1 - ease(t, 1.35, 1.8));
    bend(rig, [f], [['spine_01', 0.3], ['spine_02', 0.35], ['spine_03', 0.35]], X, () => deg(-12 * r + 18 * fw));
    bend(rig, [f], [['neck_01', 0.5], ['Head', 0.5]], X, () => deg(-22 * r));
    // tremble while the power gathers
    const tr = ease(t, 0.45, 0.6) * (1 - ease(t, 0.95, 1.05));
    bend(rig, [f], [['spine_03', 1]], Zax, () => deg(1.6 * tr * Math.sin(t * 55)));
    shiftHip(T, f, new THREE.Vector3(0, 0.03 * r - 0.05 * fw, 0.08 * fw));
  });
  info.cast = ground(T, rig, c, 'first', SOLE);
  hit.cast = 1.12;
  clips.cast = c;
}

// blink: sink into a coiled crouch wrapped in the robe, then spring up as it vanishes
if (want('blink')) {
  const cr = R('u1', 'Crouch_Idle_Loop'), js = R('u1', 'Jump_Start');
  const C = cloneFrame(cr[0]);
  curl(C, 'l', 0.5); curl(C, 'r', 0.5);
  // the take-off pose of the jump with the feet still on the ground
  const minYs = js.map((f) => rig.minY(f, SOLE));
  let k = 0; for (let i = 0; i < minYs.length; i++) if (minYs[i] < minYs[0] + 0.02) k = i; else if (k) break;
  const J = cloneFrame(js[Math.max(0, k - 1)]);
  let b = keyed([[0, IDLE0], [0.32, C], [0.5, C], [0.66, J, 'snap'], [0.8, J]]);
  bend(rig, b, [['spine_02', 0.5], ['spine_03', 0.5]], X, (i) => deg(14 * ease(i / FPS, 0.1, 0.32) * (1 - ease(i / FPS, 0.5, 0.66))));
  info.blink = ground(T, rig, b, 'perframe', SOLE);
  hit.blink = 0.62;
  clips.blink = b;
}

// hit: sharp recoil (UAL hit, exaggerated)
if (want('hit')) {
  let h = R('u1', 'Hit_Chest');
  inPlace(T, h, { keepXZ: 0.5 });
  h = amplify(h, h[0], 2.2, UPPER);
  h = timewarp(h, [[0, 0], [0.1, 0.08], [(h.length - 1) / FPS, 0.42]]);
  h = [...keyed([[0, IDLE0], [0.06, h[0]]]).slice(0, -1), ...h, ...keyed([[0, h[h.length - 1]], [0.18, IDLE0]]).slice(1)];
  info.hit = ground(T, rig, h, 'first', SOLE);
  clips.hit = h;
}

// die: UAL fall, never sinking below the ground
if (want('die')) {
  let d = R('u1', 'Death01');
  inPlace(T, d, { keepXZ: 0.6 });
  d = [...keyed([[0, IDLE0], [0.15, d[0]]]).slice(0, -1), ...d];
  info.die = ground(T, rig, d, 'perframe', rig.VERTS.filter((v, i) => i % 2 === 0));
  clips.die = d;
}

// ---------------- write ----------------
for (const [name, fr] of Object.entries(clips)) writeClip(doc, name, fr, joints, ['pelvis']);
const fsw = clips.walk ? footSpeed(rig, clips.walk, SOLE) : { median: 0 };
const fsr = clips.run ? footSpeed(rig, clips.run, SOLE) : { median: 0 };
console.log('walk feet', JSON.stringify(fsw), 'run feet', JSON.stringify(fsr));
let height = 0; for (const p of rig.skinned(IDLE0)) height = Math.max(height, p.y);
root.getDefaultScene().setName('wight').setExtras({
  hit, height: +height.toFixed(3), walkSpeed: +fsw.median.toFixed(2), runSpeed: +fsr.median.toFixed(2),
  credit: 'Barrow-wight for Skotos, built from CC0 assets: MakeHuman base mesh and game_engine rig via MPFB2 (makehumancommunity.org, CC0); skin "old caucasian male" (MakeHuman system assets, CC0) recoloured with mottling from "Female zombie skin" by sohh (makehumancommunity.org/node/2529, CC0); "Monks Robe" and "Monk\'s Hood" by Donitz (makehumancommunity.org/node/3238 and /node/3235, CC0); "Hand claws" by culturalibre (makehumancommunity.org/node/2840, CC0). Modified: retextured, tattered, decimated, re-weighted and animated with clips retargeted and edited from the Quaternius Universal Animation Library (CC0) and KayKit Character Pack: Skeletons by Kay Lousberg (CC0).',
  license: 'CC0',
  clips: { idle: 'UAL Zombie_Idle_Loop + Idle_Loop blend', walk: 'UAL Walk_Loop (damped legs, stalking upper body)', run: 'UAL Jog_Fwd_Loop + lean', attack: 'UAL Melee_Hook + Melee_Hook_Rec (claw swipe)', attack2: 'authored two-hand grab (UAL Push_Loop arms)', cast: 'authored (KayKit Spellcast_Summon raise + forward thrust)', blink: 'authored crouch-spring (UAL Crouch_Idle_Loop, Jump_Start)', hit: 'UAL Hit_Chest exaggerated', die: 'UAL Death01' },
  grips: ['grip_R', 'grip_L']
});
console.log(JSON.stringify({ hit, height, info }));
if (!RAW) {
  await doc.transform(
    dedup(), weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor)/, resize: [1024, 1024], quality: 90 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(normal|emissive)/, resize: [512, 512], quality: 90 }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    unpartition(),
    prune({ keepLeaves: true, keepAttributes: false })
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT);
