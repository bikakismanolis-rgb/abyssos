// Magma hound: "Infernal Magma Hound - Free Lava Creature Asset" by Yury Misiyuk (Tim0, sketchfab.com/Tim0), CC-BY 4.0
// -> src/assets/creatures/magmahound.glb. The source has Idle and Walk; run, bite, lunge, pounce, howl, hit and die are
// layered on them here (rotations of the deform bones about body axes, plus root motion).
import { MeshoptSimplifier } from 'meshoptimizer';
import { weld } from '@gltf-transform/functions';
import { simplifyPrim } from '../../envlib.mjs';
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, duration, slimRig, X, Y, Z, bump, ramp, smooth , dropClip } from './lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/magma_hound/model.glb', OUT = new URL('../../../src/assets/creatures/magmahound.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const doc = await load(SRC);
dropLoose(doc);
const A = Object.fromEntries(doc.getRoot().listAnimations().map((a) => [a.getName(), a]));
normalise(doc, { height: 1.5, anim: A.Idle });
const S = (n) => `DEF-spine.0${String(n).padStart(2, '0')}`;
const names = doc.getRoot().listNodes().map((n) => n.getName());
const nm = (prefix) => names.find((n) => n.startsWith(prefix + '_')) || names.find((n) => n.startsWith(prefix));
const B = {
  hips: nm(S(4)), back: nm(S(6)), mid: nm(S(7)), chest: nm(S(8)), neck: nm(S(9)), neck2: nm(S(10)), head: nm(S(11)),
  fthL: nm('DEF-front_thigh.L'), fthR: nm('DEF-front_thigh.R'), fshL: nm('DEF-front_shin.L'), fshR: nm('DEF-front_shin.R'),
  thL: nm('DEF-thigh.L'), thR: nm('DEF-thigh.R'), shL: nm('DEF-shin.L'), shR: nm('DEF-shin.R'), root: nm('root')
};
const iT = duration(A.Idle), wT = duration(A.Walk);
const idleAt = (t) => t % iT;
copyClip(doc, A.Idle, 'idle', { loop: true });
copyClip(doc, A.Walk, 'walk', { loop: true });
// run: the walk cycle quickened, the body stretched low and the head pushed forward
copyClip(doc, A.Walk, 'run', { loop: true, speed: 1.6, keys: () => ({ [B.chest]: [[X, 6]], [B.neck]: [[X, 8]], [B.head]: [[X, -6]] }) });
// bite: draw back, snap the head forward and down, recover
const biteKeys = (side) => (t, d) => {
  const back = bump(t, 0, 0.45 * d), snap = bump(t, 0.35 * d, 0.75 * d);
  return { [B.chest]: [[X, -8 * back + 10 * snap]], [B.neck]: [[X, -14 * back + 28 * snap], [Y, side * 18 * snap]], [B.neck2]: [[X, 10 * snap]], [B.head]: [[X, -20 * back + 12 * snap], [Y, side * 10 * snap]] };
};
const biteRoot = (t, d) => ({ p: [0, 0, -0.15 * bump(t, 0, 0.45 * d) + 0.35 * bump(t, 0.35 * d, 0.85 * d)] });
makeClip(doc, 'bite', { dur: 0.7, base: A.Idle, baseAt: idleAt, keys: biteKeys(0), root: biteRoot, rootNode: B.root });
makeClip(doc, 'attack', { dur: 0.7, base: A.Idle, baseAt: idleAt, keys: biteKeys(0), root: biteRoot, rootNode: B.root });
makeClip(doc, 'attack2', { dur: 0.8, base: A.Idle, baseAt: idleAt, keys: biteKeys(1), root: biteRoot, rootNode: B.root });
// pounce: crouch, spring (front legs reaching), land
makeClip(doc, 'pounce', { dur: 0.9, base: A.Idle, baseAt: idleAt, rootNode: B.root, keys: (t, d) => {
  const crouch = bump(t, 0, 0.35 * d), fly = bump(t, 0.25 * d, 0.85 * d);
  return { [B.fthL]: [[X, -45 * fly + 20 * crouch]], [B.fthR]: [[X, -40 * fly + 20 * crouch]], [B.thL]: [[X, 35 * fly - 25 * crouch]], [B.thR]: [[X, 30 * fly - 25 * crouch]],
    [B.neck]: [[X, -15 * fly + 10 * crouch]], [B.head]: [[X, 10 * fly]] };
}, root: (t, d) => ({ p: [0, -0.18 * bump(t, 0, 0.35 * d) + 0.55 * bump(t, 0.25 * d, 0.85 * d), 0.5 * bump(t, 0.25 * d, 0.95 * d)], r: [[X, -12 * bump(t, 0.2 * d, 0.5 * d) + 10 * bump(t, 0.55 * d, 0.95 * d)]] }) });
// howl: haunches down, head thrown up
makeClip(doc, 'howl', { dur: 2.0, base: A.Idle, baseAt: idleAt, rootNode: B.root, keys: (t, d) => {
  const k = smooth(t / 0.4) * (1 - smooth((t - 1.6) / 0.4));
  return { [B.chest]: [[X, -12 * k]], [B.neck]: [[X, -35 * k]], [B.neck2]: [[X, -20 * k]], [B.head]: [[X, -15 * k]], [B.thL]: [[X, -20 * k]], [B.thR]: [[X, -20 * k]] };
}, root: (t) => { const k = smooth(t / 0.4) * (1 - smooth((t - 1.6) / 0.4)); return { p: [0, -0.12 * k, -0.05 * k], r: [[X, -8 * k]] }; } });
makeClip(doc, 'hit', { dur: 0.4, base: A.Idle, baseAt: idleAt, keys: (t, d) => { const k = bump(t, 0, d); return { [B.chest]: [[X, -10 * k], [Z, 8 * k]], [B.neck]: [[X, -15 * k]], [B.head]: [[Y, 15 * k]] }; } });
// die: the legs buckle and it rolls onto its side
makeClip(doc, 'die', { dur: 1.3, base: A.Idle, baseAt: () => 0, rootNode: B.root, keys: (t) => {
  const k = smooth(t / 0.9);
  return { [B.fthL]: [[X, -30 * k], [Z, 20 * k]], [B.fthR]: [[X, -20 * k]], [B.thL]: [[X, 20 * k]], [B.thR]: [[X, 30 * k], [Z, -15 * k]], [B.neck]: [[X, 25 * k], [Y, 20 * k]], [B.head]: [[X, 15 * k]] };
}, root: (t) => { const k = smooth((t - 0.15) / 0.8); return { p: [0.35 * k, -0.62 * k, 0], r: [[Z, -78 * k]] }; } });
if (!RAW) for (const a of Object.values(A)) dropClip(a);
// only the deform skeleton matters to the game: the rig's control and mechanism bones go
const nUsed = slimRig(doc);
// a pack animal seen from above: half the triangles is plenty
await MeshoptSimplifier.ready; await doc.transform(weld());
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) simplifyPrim(p, 0.5, 0.02);
const b = bounds(doc, null, 0);
const bytes = await finish(doc, OUT, {
  hit: { bite: 0.4, attack: 0.4, attack2: 0.45, pounce: 0.75 }, height: 1.5, length: +(b.max.z - b.min.z).toFixed(2), walkSpeed: 1.6, runSpeed: 4.6,
  credit: '"Infernal Magma Hound - Free Lava Creature Asset" by Yury Misiyuk (Tim0, sketchfab.com/Tim0), CC-BY 4.0 - extra animations made for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('hound', (bytes / 1024).toFixed(0) + ' KB', 'joints', nUsed);
