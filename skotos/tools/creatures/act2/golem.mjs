// The Stonewarden: "Grock - Endboss" by Baue Franco (sketchfab.com/BaueFranco), CC-BY 4.0 -> src/assets/creatures/golem.glb
// Its own clips cover idle, three attacks and three guard moves; walk, run, hit and die are made here (procedural FK on
// its 22-bone rig). The bark-and-stone skin is re-coloured to dwarf-cut granite with ember-lit runes.
import { MeshoptSimplifier } from 'meshoptimizer';
import { weld } from '@gltf-transform/functions';
import { simplifyPrim } from '../../envlib.mjs';
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, fastest, duration, X, Y, Z, bump, ramp, smooth, sharp , dropClip } from './lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/grock/model.glb', OUT = new URL('../../../src/assets/creatures/golem.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const doc = await load(SRC);
dropLoose(doc);
const A = Object.fromEntries(doc.getRoot().listAnimations().map((a) => [a.getName(), a]));
normalise(doc, { height: 3.3, anim: A.Idle1 });
const B = { root: 'root_18', sp1: 'Spine1_11', sp2: 'Spine2_10', neck: 'neck_3', head: 'Head_2', armL: 'UpperArm.L_5', foreL: 'LowerArm.L_4', armR: 'UpperArm.R_8', foreR: 'LowerArm.R_7',
  thighL: 'UpperLeg.L_14', shinL: 'LowerLeg.L_13', footL: 'Foot.L_12', thighR: 'UpperLeg.R_17', shinR: 'LowerLeg.R_16', footR: 'Foot.R_15' };
const TAU = Math.PI * 2;
const idleT = duration(A.Idle1);
// a heavy stomping gait: T seconds per stride pair
const gait = (T, amp, bob) => ({
  dur: T, loop: true, base: A.Idle1, baseAt: (t) => t % idleT, rootNode: B.root,
  keys: (t) => {
    const p = (t / T) * TAU, sL = Math.sin(p), cL = Math.cos(p);
    const kneeL = 38 * Math.pow(Math.max(0, cL), 1.4) * amp, kneeR = 38 * Math.pow(Math.max(0, -cL), 1.4) * amp;
    return {
      [B.thighL]: [[X, -24 * sL * amp - kneeL * 0.4]], [B.shinL]: [[X, kneeL]], [B.footL]: [[X, -kneeL * 0.5 + 10 * sL * amp]],
      [B.thighR]: [[X, 24 * sL * amp - kneeR * 0.4]], [B.shinR]: [[X, kneeR]], [B.footR]: [[X, -kneeR * 0.5 - 10 * sL * amp]],
      [B.sp1]: [[Y, 6 * sL * amp], [Z, 3 * sL]], [B.sp2]: [[Y, 4 * sL * amp], [X, 6 * amp]],
      [B.armL]: [[X, 14 * sL * amp]], [B.armR]: [[X, -14 * sL * amp]], [B.head]: [[Y, -5 * sL * amp]]
    };
  },
  root: (t) => { const p = (t / T) * TAU; return { p: [0, -bob * Math.abs(Math.cos(p)), 0], r: [[Z, -4 * Math.sin(p)]] }; }
});
makeClip(doc, 'walk', gait(1.5, 1, 0.07));
makeClip(doc, 'run', gait(1.0, 1.35, 0.12));
copyClip(doc, A.Idle1, 'idle', { loop: true });
const atk1 = copyClip(doc, A.Attack1, 'attack');
const atk2 = copyClip(doc, A.Attack2, 'attack2');
const atk3 = copyClip(doc, A.Attack3, 'slam');
copyClip(doc, A.Defend3, 'warcry', { speed: 1.6 });
// hit: rocks back on its heels
makeClip(doc, 'hit', { dur: 0.45, base: A.Idle1, keys: (t, d) => { const k = bump(t, 0, d); return { [B.sp1]: [[X, -10 * k]], [B.sp2]: [[X, -8 * k]], [B.head]: [[X, -12 * k]], [B.armL]: [[Z, 12 * k]], [B.armR]: [[Z, -12 * k]] }; } });
// die: knees give, it topples back and lies still (the game crumbles it to dust)
makeClip(doc, 'die', { dur: 1.7, base: A.Idle1, rootNode: B.root, keys: (t) => {
  const k = smooth(t / 1.1), r = smooth((t - 0.2) / 1.2);
  return { [B.thighL]: [[X, -50 * k]], [B.thighR]: [[X, -45 * k]], [B.shinL]: [[X, 70 * k]], [B.shinR]: [[X, 65 * k]], [B.sp1]: [[X, -12 * r]], [B.head]: [[X, -25 * r]], [B.armL]: [[Z, 40 * r], [X, -30 * r]], [B.armR]: [[Z, -35 * r], [X, -25 * r]] };
}, root: (t) => { const r = smooth((t - 0.15) / 1.25); return { p: [0, -1.05 * r, -0.9 * r], r: [[X, -78 * r]] }; } });
if (!RAW) for (const a of Object.values(A)) dropClip(a);
// granite and embers: the brown bark goes grey-green stone, the cracks glow
for (const tex of doc.getRoot().listTextures()) {
  const mat = doc.getRoot().listMaterials().find((m) => m.getBaseColorTexture() === tex);
  if (!mat) continue;
  const img = sharp(Buffer.from(tex.getImage()));
  const { data, info } = await img.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // the neighbourhood's brightness: seams are what is much darker than the stone around them
  const blur = await sharp(Buffer.from(tex.getImage())).removeAlpha().greyscale().blur(6).raw().toBuffer();
  const em = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0, j = 0, k = 0; i < data.length; i += info.channels, j += 3, k++) {
    const r = data[i], g = data[i + 1], b = data[i + 2], l = 0.3 * r + 0.55 * g + 0.15 * b, warm = Math.max(0, r - b) / 255;
    const v = Math.min(255, l * 0.8 + 12);
    data[i] = v * (0.98 + warm * 0.08); data[i + 1] = v * 0.97; data[i + 2] = v * (0.94 - warm * 0.1);
    const crack = Math.max(0, Math.min(1, (blur[k] * 0.62 - l) / 22));
    em[j] = 255 * crack; em[j + 1] = 110 * crack; em[j + 2] = 25 * crack;
  }
  tex.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
  const et = doc.createTexture('golem_ember').setImage(await sharp(em, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([1, 0.55, 0.2]);
}
// 48k triangles is a lot for a monster: thin the rocks out (seams may move a little; stone forgives that)
await MeshoptSimplifier.ready;
await doc.transform(weld());
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) simplifyPrim(p, 0.33, 0.02);
const b = bounds(doc, null, 0);
const hit = { attack: fastest(doc, atk1, B.foreR), attack2: fastest(doc, atk2, B.foreL), slam: fastest(doc, atk3, B.foreR) };
const bytes = await finish(doc, OUT, {
  hit, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 1.3, runSpeed: 2.6,
  credit: '"Grock - Endboss" by Baue Franco (sketchfab.com/BaueFranco), CC-BY 4.0 - recoloured, walk, hit and death animations made for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('golem', (bytes / 1024).toFixed(0) + ' KB', JSON.stringify(hit));
