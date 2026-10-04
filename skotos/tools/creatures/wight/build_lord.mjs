// Builds S/creatures/out/barrowlord.glb: the Lord of the Barrow. MakeHuman/MPFB (CC0) body with CC0 clothing
// (viking chainmail tunic + pants, Helios plate armour, gloves, monk robe cut into a cape, monk hood), a crown modelled
// here, one 1024 texture atlas, clips retargeted from Quaternius UAL (CC0) / KayKit (CC0) and authored on top.
// usage: node build_lord.mjs [out.glb] [--raw] [--cand]
import { prune, dedup, textureCompress, quantize, meshopt, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { io, S, THREE, FPS, makeRef, retarget, makeRig, inPlace, closeLoop, writeClip, cloneFrame, blendFrame, concat, timewarp, shiftHip, ease, smooth, qAxis, mpos, mrot } from './lib.mjs';
import { keyed, layer, amplify, damp, bend, plant, soleList, ground, footSpeed, tipTrack, speeds, argmax, meanFrame, makeCurl, gripWorld } from './anim.mjs';
import { corpseSkin, darkCloth, recolor, uvRaster, load, save } from './tex.mjs';
import { primsOf, remapUV, mergeInto, skirtWeights, addGrips, handFrame } from './mesh.mjs';

const W = S + '/creatures/wight';
const MD = S + '/research/tooling/blender_user/extensions/.user/user_default/mpfb/data';
const GD = S + '/research/github/blender_user/extensions/.user/user_default/mpfb/data';
const C = MD + '/clothes';
const argv = process.argv.slice(2), RAW = argv.includes('--raw'), CAND = argv.includes('--cand');
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/barrowlord.glb';

const doc = await io.read(W + '/lord_base.glb');
const root = doc.getRoot(), buf = root.listBuffers()[0];
const P = { helios: primsOf(doc, 'helios')[0], robe: primsOf(doc, 'robe')[0], hood: primsOf(doc, 'hood')[0], tunic: primsOf(doc, 'tunic')[0], pants: primsOf(doc, 'pants')[0], gloves: primsOf(doc, 'gloves')[0], eyes: primsOf(doc, 'low-poly')[0], body: primsOf(doc, 'base')[0] };
const RT0 = (await import('./lib.mjs')).pose(doc, null, 0);

// ---------------- crown (modelled here): tarnished iron-gold circlet with uneven spikes, set over the hood ----------------
function makeCrown() {
  const hp = P.hood.getAttribute('POSITION'), ep = P.eyes.getAttribute('POSITION');
  let eyeY = 0, eyeZ = -9; for (let i = 0; i < ep.getCount(); i++) { const v = ep.getElement(i, []); eyeY += v[1] / ep.getCount(); eyeZ = Math.max(eyeZ, v[2]); }
  const y0 = eyeY + 0.045, band = 0.042;
  // hood cross-section around the band height
  let mnx = 9, mxx = -9, mnz = 9, mxz = -9;
  const hc = RT0.get('Head').wp;
  for (let i = 0; i < hp.getCount(); i++) { const v = hp.getElement(i, []); if (Math.abs(v[1] - (y0 + band * 0.5)) > 0.025) continue; if (Math.hypot(v[0] - hc.x, v[2] - (hc.z + 0.02)) > 0.15) continue; mnx = Math.min(mnx, v[0]); mxx = Math.max(mxx, v[0]); mnz = Math.min(mnz, v[2]); mxz = Math.max(mxz, v[2]); }
  // the hood opening is at the front: the crown front rests on the brow just above the eyes
  mxz = Math.max(mxz, eyeZ + 0.01);
  const cx = (mnx + mxx) / 2, cz = (mnz + mxz) / 2, rx = (mxx - mnx) / 2 * 1.06 + 0.006, rz = (mxz - mnz) / 2 * 1.06 + 0.006;
  const N = 24, pos = [], nrm = [], uv = [], idx = [];
  const add = (p, n, u, v) => { pos.push(...p); nrm.push(...n); uv.push(u, v); return pos.length / 3 - 1; };
  const ring = (a, y, flare) => { const c = Math.cos(a), s = Math.sin(a); return [cx + (rx + flare) * s, y, cz + (rz + flare) * c]; };
  const outN = (a) => { const v = new THREE.Vector3(Math.sin(a) / rx, 0.15, Math.cos(a) / rz).normalize(); return [v.x, v.y, v.z]; };
  // band: outer surface + a top rim
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const b0 = add(ring(a0, y0, 0), outN(a0), i / N, 0.95), b1 = add(ring(a1, y0, 0), outN(a1), (i + 1) / N, 0.95);
    const t0 = add(ring(a0, y0 + band, 0.008), outN(a0), i / N, 0.55), t1 = add(ring(a1, y0 + band, 0.008), outN(a1), (i + 1) / N, 0.55);
    idx.push(b0, b1, t1, b0, t1, t0);
    // spikes on every other segment, tallest at the front
    if (i % 2 === 0) {
      const am = (a0 + a1) / 2, front = Math.cos(am) * 0.5 + 0.5;
      const h = 0.05 + 0.045 * front + 0.015 * ((i * 7) % 3) / 2;
      const tip = add(ring(am, y0 + band + h, 0.022), outN(am), (i + 0.5) / N, 0.05);
      const l = add(ring(a0, y0 + band, 0.008), outN(a0), i / N, 0.55), r = add(ring(a1, y0 + band, 0.008), outN(a1), (i + 1) / N, 0.55);
      idx.push(l, r, tip);
    }
  }
  return { pos, nrm, uv, idx, info: { y0, cx, cz, rx, rz } };
}
const crown = makeCrown();
console.log('crown', JSON.stringify(crown.info));
{
  // as a primitive skinned 100 % to the head
  const skin = root.listSkins()[0], hj = skin.listJoints().findIndex((j) => j.getName() === 'Head');
  const n = crown.pos.length / 3;
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(crown.pos)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(crown.nrm)).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(crown.uv)).setBuffer(buf))
    .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(new Uint16Array(Array.from({ length: n * 4 }, (_, i) => (i % 4 === 0 ? hj : 0)))).setBuffer(buf))
    .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(new Float32Array(Array.from({ length: n * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)))).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(crown.idx)).setBuffer(buf));
  const mesh = doc.createMesh('crown').addPrimitive(prim);
  const host = root.listNodes().find((nd) => nd.getMesh() && nd.getMesh().listPrimitives().includes(P.hood));
  const node = doc.createNode('crown').setMesh(mesh).setSkin(host.getSkin());
  root.getDefaultScene().listChildren()[0].addChild(node);
  P.crown = prim;
}

// ---------------- texture atlas (1024) ----------------
const TS = 1024;
const TILE = { helios: [0, 0, 0.5], robe: [0.5, 0, 0.5], tunic: [0, 0.5, 0.5], skin: [0.5, 0.5, 0.25], pants: [0.75, 0.5, 0.25], gloves: [0.5, 0.75, 0.25], crown: [0.75, 0.75, 0.125], eyes: [0.875, 0.75, 0.0625] };
const atlas = { w: TS, h: TS, d: new Uint8Array(TS * TS * 3) };
const blit = (img, t) => {
  const x0 = Math.round(t[0] * TS), y0 = Math.round(t[1] * TS), s = Math.round(t[2] * TS);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const sx = Math.min(img.w - 1, Math.floor((x / s) * img.w)), sy = Math.min(img.h - 1, Math.floor((y / s) * img.h)); for (let c = 0; c < 3; c++) atlas.d[((y0 + y) * TS + x0 + x) * 3 + c] = img.d[(sy * img.w + sx) * 3 + c]; }
};
const px = (t) => Math.round(t[2] * TS);
const lumOf = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
// blackened plate, trims picked out in tarnished gold
const helios = await recolor(C + '/matcreator_mc-scifi-armor_helios/SciFi-Armor_Helios_MAT_color.jpg', px(TILE.helios), (r, g, b) => {
  const l = lumOf(r, g, b), trim = Math.min(1, Math.max(0, (l - 0.62) / 0.2));
  const steel = [0.07 + l * 0.30, 0.075 + l * 0.31, 0.085 + l * 0.33];
  const gold = [0.36 + l * 0.22, 0.27 + l * 0.17, 0.12 + l * 0.08];
  return steel.map((v, k) => v + (gold[k] - v) * trim * 0.85);
});
blit(helios, TILE.helios);
// cape + hood: faded black-wine wool, grime towards the hem
const hm = uvRaster(px(TILE.robe), [P.robe, P.hood], (p) => p[1]);
const robe = await darkCloth(C + '/donitz_monk_robe/robe_brown__diffuse.png', px(TILE.robe), { height: hm, tint: [0.82, 0.6, 0.62], gain: 1.15, sat: 0.1, hemDark: 0.5, hemTo: 0.7, mud: 0.4 });
// rope belt strip -> dark
for (let y = 0; y < Math.round(0.07 * robe.h); y++) for (let x = 0; x < Math.round(0.5 * robe.w); x++) for (let c = 0; c < 3; c++) robe.d[(y * robe.w + x) * 3 + c] *= 0.45;
blit(robe, TILE.robe);
// chainmail tunic: mail darkened to old iron, leather near black
const tunic = await recolor(C + '/rehmanpolanski_viking_tunic/TUNIC_Viking.png', px(TILE.tunic), (r, g, b) => {
  const l = lumOf(r, g, b), sat = Math.max(r, g, b) - Math.min(r, g, b);
  const iron = [l * 0.62, l * 0.64, l * 0.68], leather = [l * 0.55, l * 0.45, l * 0.4];
  const k = Math.min(1, sat * 6);
  return iron.map((v, i) => v + (leather[i] - v) * k);
});
blit(tunic, TILE.tunic);
const skin = await corpseSkin(MD + '/skins/old_caucasian_male/old_lightskinned_male_diffuse.png', GD + '/skins/sohh_female_zombie_skin/sohh_Zombie_Female_diffuse.png', 512, { stops: [[0.05, [0.04, 0.05, 0.07]], [0.35, [0.16, 0.18, 0.22]], [0.6, [0.34, 0.38, 0.42]], [0.8, [0.52, 0.57, 0.6]], [1.0, [0.64, 0.68, 0.7]]] });
blit(skin, TILE.skin);
blit(await recolor(C + '/rehmanpolanski_viking_pants/PantsViking.png', px(TILE.pants), (r, g, b) => { const l = lumOf(r, g, b); return [l * 0.42, l * 0.36, l * 0.34]; }), TILE.pants);
blit(await recolor(C + '/culturalibre_hero-heroine_gloves_3/green.png', px(TILE.gloves), (r, g, b, x, y) => { const n = (Math.sin(x * 0.9) * Math.sin(y * 1.3) + Math.sin(x * 0.23 + y * 0.31)) * 0.012; return [0.085 + n, 0.07 + n, 0.062 + n]; }), TILE.gloves);
// crown: vertical gradient, dark at the band foot, brighter worn gold at the spike tips
{
  const s = px(TILE.crown), img = { w: s, h: s, d: new Uint8Array(s * s * 3) };
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = y / s, n = Math.sin(x * 1.7) * Math.sin(y * 2.3) * 0.03;
    const c = [0.5 - v * 0.3 + n, 0.39 - v * 0.24 + n, 0.18 - v * 0.1 + n];
    for (let k = 0; k < 3; k++) img.d[(y * s + x) * 3 + k] = Math.round(Math.max(0, Math.min(1, c[k])) * 255);
  }
  blit(img, TILE.crown);
}
blit({ w: 1, h: 1, d: new Uint8Array([130, 200, 240]) }, TILE.eyes);
// UVs into tiles (small inset so mips do not bleed)
const inset = (t, k = 0.012) => [t[0] + t[2] * k, t[1] + t[2] * k, t[2] * (1 - 2 * k)];
for (const [k, prim] of Object.entries({ helios: P.helios, robe: P.robe, hood: P.hood, tunic: P.tunic, skin: P.body, pants: P.pants, gloves: P.gloves, crown: P.crown, eyes: P.eyes })) {
  const t = inset(TILE[k === 'hood' ? 'robe' : k], k === 'eyes' ? 0.25 : 0.012); remapUV(prim, t[0], t[1], t[2]);
}
// normal atlas (512): robe folds in the cape tile, flat elsewhere
const NS = 512, natlas = { w: NS, h: NS, d: new Uint8Array(NS * NS * 3) };
for (let i = 0; i < NS * NS; i++) { natlas.d[i * 3] = 128; natlas.d[i * 3 + 1] = 128; natlas.d[i * 3 + 2] = 255; }
{ const rn = await load(C + '/donitz_monk_robe/robe__normal_gl.png', NS / 2); const t = TILE.robe; for (let y = 0; y < rn.h; y++) for (let x = 0; x < rn.w; x++) for (let c = 0; c < 3; c++) natlas.d[((Math.round(t[1] * NS) + y) * NS + Math.round(t[0] * NS) + x) * 3 + c] = rn.d[(y * rn.w + x) * 3 + c]; }
// metallic-roughness atlas (256): G = roughness, B = metalness
const MS = 256, mr = { w: MS, h: MS, d: new Uint8Array(MS * MS * 3) };
const mrTile = (t, rough, metal) => { const x0 = Math.round(t[0] * MS), y0 = Math.round(t[1] * MS), s = Math.round(t[2] * MS); for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) { mr.d[(y * MS + x) * 3 + 1] = Math.round(rough * 255); mr.d[(y * MS + x) * 3 + 2] = Math.round(metal * 255); } };
mrTile(TILE.helios, 0.48, 0.7); mrTile(TILE.robe, 0.95, 0); mrTile(TILE.tunic, 0.6, 0.45); mrTile(TILE.skin, 0.7, 0); mrTile(TILE.pants, 0.85, 0); mrTile(TILE.gloves, 0.75, 0); mrTile(TILE.crown, 0.4, 0.85); mrTile(TILE.eyes, 0.5, 0);
const em = { w: 256, h: 256, d: new Uint8Array(256 * 256 * 3) };
{ const t = TILE.eyes, x0 = Math.round(t[0] * 256), y0 = Math.round(t[1] * 256), s = Math.round(t[2] * 256); for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) for (let c = 0; c < 3; c++) em.d[(y * 256 + x) * 3 + c] = 255; }
const tex = (name, b) => doc.createTexture(name).setImage(b).setMimeType('image/png');
const mat = doc.createMaterial('barrowlord')
  .setBaseColorTexture(tex('barrowlord_c', await save(atlas)))
  .setNormalTexture(tex('barrowlord_n', await save(natlas))).setNormalScale(0.8)
  .setMetallicRoughnessTexture(tex('barrowlord_mr', await save(mr))).setMetallicFactor(1).setRoughnessFactor(1)
  .setEmissiveTexture(tex('barrowlord_e', await save(em))).setEmissiveFactor([0.35, 0.75, 1.0])
  .setDoubleSided(true).setAlphaMode('OPAQUE');
// skirt weights for the cape below the hip, then everything into one primitive
console.log('cape skirt verts', skirtWeights(doc, P.robe, { legMax: 0.7, side: 0.14, hemY: 0.05 }));
mergeInto(doc, [P.body, P.helios, P.tunic, P.pants, P.gloves, P.robe, P.hood, P.eyes, P.crown], mat);
for (const m of root.listMaterials()) if (m !== mat) m.dispose();
for (const t of root.listTextures()) if (!t.getName().startsWith('barrowlord')) t.dispose();

// ---------------- rig ----------------
const SRC = { u1: { doc: await io.read(S + '/chars/ual1.glb'), kind: 'ual' }, u2: { doc: await io.read(S + '/chars/ual2.glb'), kind: 'ual' },
  kk: { doc: await io.read(S + '/kk-skel/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb'), kind: 'kk' },
  ka: { doc: await io.read(S + '/kk-adv/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb'), kind: 'kk' } };
const T = makeRef(doc, SRC.u1.doc), rig = makeRig(T);
const SOLE = soleList(rig).length ? soleList(rig) : rig.VERTS.filter((v) => [0, 1, 2, 3].some((k) => v.w[k] > 0.5 && /^(foot|ball)_[lr]$/.test(rig.jointList[v.j[k]].getName())));
console.log('sole verts', SOLE.length);
const joints = new Map(root.listSkins()[0].listJoints().map((j) => [j.getName(), j]));
const grips = addGrips(doc, { along: 0.55, palm: 0.03 });
const R = (s, c, o) => retarget(T, SRC[s], c, o);
const B = T.names;
const SPINE = ['spine_01', 'spine_02', 'spine_03'], NECK = ['neck_01', 'Head'];
const ARM = (s) => ['clavicle_' + s, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, ...B.filter((b) => new RegExp('^(index|middle|ring|pinky|thumb)_0\\d_' + s + '$').test(b))];
const FING = (s) => B.filter((b) => new RegExp('^(index|middle|ring|pinky|thumb)_0\\d_' + s + '$').test(b));
const LEGS = B.filter((b) => /^(thigh|calf|foot|ball)_[lr]$/.test(b));
const UPPER = [...SPINE, ...NECK, ...ARM('l'), ...ARM('r')];
const X = [1, 0, 0], Yax = [0, 1, 0], Zax = [0, 0, 1];
const deg = (d) => (d * Math.PI) / 180;
const curl = makeCurl(T, handFrame);
const clips = {}, hit = {}, info = {};

if (CAND) {
  for (const c of argv.filter((a) => a.includes(':'))) {
    const [s, n] = c.split(':');
    const fr = R(s, n); inPlace(T, fr, { keepXZ: 0 });
    ground(T, rig, fr, 'first', SOLE);
    clips[s + '_' + n] = fr;
  }
}

const { buildClips } = CAND ? { buildClips: null } : await import('./lord_clips.mjs');
let IDLE0 = null;
if (buildClips) IDLE0 = await buildClips({ clips, hit, info, T, rig, R, SOLE, grips, curl, UPPER, LEGS, ARM, FING, SPINE, NECK, X, Yax, Zax, deg, B });

for (const [name, fr] of Object.entries(clips)) writeClip(doc, name, fr, joints, ['pelvis']);
const fsw = clips.walk ? footSpeed(rig, clips.walk, SOLE) : { median: 0 }, fsr = clips.run ? footSpeed(rig, clips.run, SOLE) : { median: 0 };
let height = 0; for (const p of rig.skinned(IDLE0 || rig.restFrame())) height = Math.max(height, p.y);
root.getDefaultScene().setName('barrowlord').setExtras({
  hit, height: +height.toFixed(3), walkSpeed: +fsw.median.toFixed(2), runSpeed: +fsr.median.toFixed(2),
  credit: 'Lord of the Barrow for Skotos, built from CC0 assets: MakeHuman base mesh and game_engine rig via MPFB2 (makehumancommunity.org, CC0); skin "old caucasian male" (MakeHuman system assets, CC0) recoloured with mottling from "Female zombie skin" by sohh (makehumancommunity.org/node/2529, CC0); "Viking tunic" and "Viking pants" by Rehman Polanski (makehumancommunity.org/node/2617 and /node/2618, CC0); "MC SciFi Armor Helios" by MatCreator (makehumancommunity.org/node/2881, CC0); "Hero-heroine gloves 3" by culturalibre (makehumancommunity.org/node/2193, CC0); "Monks Robe" (cut into a cape) and "Monk\'s Hood" by Donitz (makehumancommunity.org/node/3238 and /node/3235, CC0); crown modelled for Skotos (CC0). Modified: retextured into one atlas, cut, decimated, re-weighted and animated with clips retargeted and edited from the Quaternius Universal Animation Library (CC0) and KayKit Character Packs Adventurers and Skeletons by Kay Lousberg (CC0).',
  license: 'CC0',
  clips: { idle: 'KayKit 2H_Melee_Idle (slowed)', walk: 'UAL Walk_Loop + guard upper body', run: 'UAL Jog_Fwd_Loop + guard upper body', attack: 'KayKit 2H_Melee_Attack_Chop (amplified, body lunge)', attack2: 'KayKit 2H_Melee_Attack_Slice (sweep)', slam: 'KayKit 1H_Melee_Attack_Jump_Chop (low hop, blade driven to the ground)', cast: 'KayKit Spellcast_Raise', warcry: 'KayKit Cheer + head back', hit: 'UAL Hit_Chest exaggerated', die: 'KayKit Death_B' },
  grips: ['grip_R', 'grip_L']
});
console.log(JSON.stringify({ hit, height, walk: fsw, run: fsr, info }));
if (!RAW) {
  await doc.transform(
    dedup(), weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(baseColor)/, resize: [1024, 1024], quality: 90 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(normal|emissive|metallicRoughness)/, resize: [512, 512], quality: 85 }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
    unpartition(),
    prune({ keepLeaves: true, keepAttributes: false })
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT);
