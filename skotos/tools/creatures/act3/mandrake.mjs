// Rootlings: "Mandrake" by timsblends (sketchfab.com/timsblends), CC-BY 4.0 -> src/assets/creatures/mandrake.glb
// The source is a Rigify rig whose deform bones hang off its control and mechanism bones (the arms from ORG-shoulder,
// the legs from ORG-spine), so a rotation of the chest would not carry the arms. Its 31 weighted DEF bones are re-parented
// into one clean chain (hips > spine > chest > shoulders > arms, hips > thighs) and its five clips (Wake, Idle, Running,
// Scream, Taunt) are re-baked onto that chain; the other 259 bones (controls, mechanism, display) go. From them: idle, walk and run (its scuttle at two
// paces), rise (its waking-up, pushed up out of the ground), die (the waking played backwards: it curls back into a root),
// and the made ones: attack (a lunging bite), attack2 (the shriek: a crouch, then arched back with arms and maw wide) and
// hit. The stylised olive-and-tan skin is darkened toward wet, mossy root-brown, and a faint amber glow sits deep in the
// hollow eyes.
// usage: node mandrake.mjs [source.glb] [out.glb] [--raw keeps the re-baked source clips] [--dbg=<path> also writes an uncompressed copy]
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds, skinnedPoints,
  X, Y, Z, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/mandrake/model.glb', OUT = new URL('../../../src/assets/creatures/mandrake.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const HEIGHT = 0.6; // standing, to the tip of the head
const FPS = 30;
const doc = await load(SRC);
const R = doc.getRoot();
dropLoose(doc);
for (const m of R.listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TANGENT', 'TEXCOORD_1']) p.setAttribute(s, null);
const SRCA = Object.fromEntries(R.listAnimations().map((a) => [a.getName().replace(/^rig\|/, ''), a]));
normalise(doc, { height: HEIGHT, anim: SRCA.Idle, t: 0 });

// ---------- one clean deform chain ----------
// the weighted bones, renamed; [new name, source name, new parent (new name, or the source node it already hangs from)]
const RIG = [
  ['hips', 'DEF-spine_05', null], ['spine_01', 'DEF-spine.001_06', 'hips'], ['spine_02', 'DEF-spine.002_07', 'spine_01'], ['chest', 'DEF-spine.003_08', 'spine_02'],
  ['neck', 'DEF-spine.004_09', 'chest'], ['neck_02', 'DEF-spine.005_010', 'neck'], ['head', 'DEF-spine.006_011', 'neck_02'],
  ...['L', 'R'].flatMap((s) => {
    const n = (b) => R.listNodes().find((x) => x.getName().startsWith(`DEF-${b}.${s}`) && x.getName().slice(`DEF-${b}.${s}`.length).match(/^_\d+$/))?.getName();
    const n1 = (b) => R.listNodes().find((x) => x.getName().startsWith(`DEF-${b}.${s}.001_`))?.getName();
    return [
      [`pelvis_${s}`, n('pelvis'), 'hips'], [`thigh_${s}`, n('thigh'), 'hips'], [`thigh_twist_${s}`, n1('thigh'), `thigh_${s}`], [`shin_${s}`, n('shin'), `thigh_twist_${s}`],
      [`shin_twist_${s}`, n1('shin'), `shin_${s}`], [`foot_${s}`, n('foot'), `shin_twist_${s}`],
      [`shoulder_${s}`, n('shoulder'), 'chest'], [`upperarm_${s}`, n('upper_arm'), `shoulder_${s}`], [`upperarm_twist_${s}`, n1('upper_arm'), `upperarm_${s}`],
      [`forearm_${s}`, n('forearm'), `upperarm_twist_${s}`], [`forearm_twist_${s}`, n1('forearm'), `forearm_${s}`], [`hand_${s}`, n('hand'), `forearm_twist_${s}`]
    ];
  })
];
const BONE = {};
for (const [nn, src] of RIG) { const b = byName(doc, src); if (!b) throw new Error('no bone ' + src + ' for ' + nn); BONE[nn] = b; }
const parentOf = (n) => R.listNodes().find((p) => p.listChildren().includes(n));
const NEWPAR = new Map(RIG.map(([nn, , par]) => [BONE[nn], par ? BONE[par] : parentOf(BONE[nn])]));
const DEFS = RIG.map(([nn]) => BONE[nn]);
const HIPS = BONE.hips;
// a pose in the new chain: every deform bone's local transform under its new parent, read off the source rig's world matrices
const M4 = new THREE.Matrix4();
function chainPose(W) {
  const out = new Map();
  for (const b of DEFS) {
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    M4.copy(W.get(NEWPAR.get(b))).invert().multiply(W.get(b)).decompose(p, q, s);
    out.set(b, { p, q, s });
  }
  return out;
}
const W0 = worlds(doc, locals(doc, null, 0)), REST = chainPose(W0);
const UNIT = new THREE.Vector3().setFromMatrixScale(W0.get(NEWPAR.get(HIPS))).x; // metres per bone-space unit
// every source clip, sampled on the source rig
const SAMPLED = {};
// (how far the dropped parts stray: the non-hip bones' offsets from their parents, and the rig's stretch scaling)
let drift = 0, stretch = 0;
for (const [k, a] of Object.entries(SRCA)) {
  const d = duration(a), n = Math.round(d * FPS) + 1, rows = [];
  for (let i = 0; i < n; i++) {
    const P = chainPose(worlds(doc, locals(doc, a, Math.min(d, i / FPS))));
    for (const b of DEFS) {
      if (b !== HIPS) drift = Math.max(drift, P.get(b).p.distanceTo(REST.get(b).p) * UNIT);
      stretch = Math.max(stretch, P.get(b).s.clone().sub(REST.get(b).s).length());
    }
    rows.push(P);
  }
  SAMPLED[k] = { d, rows };
}
// re-parent onto the chain (the rest pose keeps its world placement, so the skin's bind matrices stay valid)
for (const b of DEFS) {
  const np = NEWPAR.get(b), op = parentOf(b);
  if (op !== np) { op.removeChild(b); np.addChild(b); }
  const r = REST.get(b); b.setTranslation(r.p.toArray()).setRotation(r.q.toArray()).setScale(r.s.toArray());
}
for (const a of Object.values(SRCA)) dropClip(a);
for (const [nn, src] of RIG) BONE[nn].setName(nn);
// writes rows (Map bone -> {p, q}) as a clip: rotations of every deform bone, translation of the hips only
function bake(name, rows, dur) {
  const n = rows.length, buf = R.listBuffers()[0];
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = Math.min(dur, i / FPS);
  const input = doc.createAccessor(name + '_bt').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  for (const b of DEFS) for (const path of b === HIPS ? ['rotation', 'translation'] : ['rotation']) {
    const k = path === 'rotation' ? 4 : 3, arr = new Float32Array(n * k); let prev = null;
    for (let i = 0; i < n; i++) {
      const v = rows[i].get(b);
      if (k === 4) { const q = v.q.clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; }
      else v.p.toArray(arr, i * 3);
    }
    const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(k === 4 ? 'VEC4' : 'VEC3').setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(b).setTargetPath(path).setSampler(s));
  }
  return anim;
}
const A = {};
for (const [k, { d, rows }] of Object.entries(SAMPLED)) A[k] = bake('src_' + k, rows, d);
const nUsed = slimRig(doc);
// the drift is about a millimetre; the stretch (up to ~20 %, the legs in its scuttle) is not kept: clips are rotations only
console.log('chain: joints', nUsed, 'nodes', R.listNodes().length, 'bone drift dropped (m)', drift.toFixed(4), 'stretch dropped', stretch.toFixed(2));

// ---------- poses ----------
const B = BONE;
const pose = (anim, t) => locals(doc, anim, Math.max(0, Math.min(t, duration(anim))));
function mix(La, Lb, k) {
  if (k <= 0) return La; if (k >= 1) return Lb;
  const out = new Map();
  for (const [n, a] of La) { const b = Lb.get(n); out.set(n, { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k), s: a.s }); }
  return out;
}
// a clip from poseAt(t) (a Map of local transforms), sampled at FPS
const bakeFn = (name, dur, poseAt) => { const n = Math.round(dur * FPS) + 1, rows = []; for (let i = 0; i < n; i++) rows.push(poseAt(Math.min(dur, i / FPS))); return bake(name, rows, dur); };
const side = (b) => [B[b + '_L'], B[b + '_R']];
const ARMS = new Set(['shoulder', 'upperarm', 'upperarm_twist', 'forearm', 'forearm_twist', 'hand'].flatMap(side));
const UPPER = new Set([...ARMS, B.spine_02, B.chest, B.neck, B.neck_02, B.head]);
// the lowest skinned point of a pose (character space, metres)
const lowY = (L) => { let m = 9; for (const p of skinnedPoints(doc, worlds(doc, L), 3)) m = Math.min(m, p.y); return m; };
// character space -> the hips' parent frame: moves the hips by a character-space offset (metres); PAR_X turns the whole body
const PINV3 = new THREE.Matrix3().setFromMatrix4(W0.get(parentOf(HIPS)).clone().invert());
const PAR_X = X.clone().applyMatrix3(PINV3).normalize();
const shift = (L, dy, dz = 0) => { const h = L.get(HIPS); L.set(HIPS, { p: h.p.clone().add(new THREE.Vector3(0, dy, dz).applyMatrix3(PINV3)), q: h.q, s: h.s }); return L; };

const iT = duration(A.Idle), rT = duration(A.Running), wT = duration(A.Wake), sT = duration(A.Scream);
// ---------- locomotion ----------
copyClip(doc, A.Idle, 'idle', { loop: true });
// walk: its scuttle slowed, the flung-out arms and the head calmed toward the idle stance; run: the scuttle quickened
const WALK = 0.7, RUN = 1.7;
bakeFn('walk', rT / WALK, (t) => {
  const L = pose(A.Running, (t * WALK) % rT), I = pose(A.Idle, (t * WALK * iT / rT) % iT), out = new Map(L);
  for (const b of UPPER) { const a = L.get(b), c = I.get(b); out.set(b, { p: a.p, q: a.q.clone().slerp(c.q, 0.35), s: a.s }); }
  return out;
});
copyClip(doc, A.Running, 'run', { loop: true, speed: RUN });
// ground speed of the scuttle: how fast a foot sweeps back while it is down (the clip holds two strides)
const sweepSpeed = (() => {
  const n = 60, out = [];
  for (const f of side('foot')) {
    const P = []; for (let i = 0; i <= n; i++) P.push(new THREE.Vector3().setFromMatrixPosition(worlds(doc, pose(A.Running, (rT * i) / n)).get(f)));
    const lo = Math.min(...P.map((p) => p.y)), hi = Math.max(...P.map((p) => p.y));
    for (let i = 1; i <= n; i++) if (P[i].y < lo + 0.3 * (hi - lo) && P[i].z < P[i - 1].z) out.push((P[i - 1].z - P[i].z) / (rT / n));
  }
  return out.reduce((s, v) => s + v, 0) / out.length;
})();
const walkSpeed = +(sweepSpeed * WALK).toFixed(2), runSpeed = +(sweepSpeed * RUN).toFixed(2);

// ---------- rise: bursts up out of the ground curled like a root bulb, hops clear, then unfolds and stands (its waking-up) ----------
const RISE = 1.5, UP = 0.34, LAND = 0.56;
bakeFn('rise', RISE, (t) => {
  // its own waking holds the curled bulb while it is thrown up, then plays out
  const u = t < LAND ? 0.1 * (t / LAND) : 0.1 + (wT - 0.1) * smooth((t - LAND) / (RISE - LAND - 0.04));
  // from 0.7 m under the ground to 0.12 m above it (it pops clear of the soil), then down onto it
  const y = t < UP ? -0.7 + 0.82 * (1 - Math.pow(1 - t / UP, 2.4)) : 0.12 * (1 - Math.pow(Math.min(1, (t - UP) / (LAND - UP)), 2));
  // a tumble on the way up, righted as it lands
  const L = pose(A.Wake, u), h = L.get(HIPS), tilt = -28 * (1 - smooth(t / LAND));
  L.set(HIPS, { p: h.p, q: new THREE.Quaternion().setFromAxisAngle(PAR_X, tilt * Math.PI / 180).multiply(h.q), s: h.s });
  return shift(L, y);
});

// ---------- die: a jolt, then its waking backwards: it folds up and curls into a root on the ground ----------
const DIE = 1.45, JOLT = 0.16;
const dieAt = (t) => {
  const I = pose(A.Wake, wT);
  if (t < JOLT) return I;
  const u = (t - JOLT) / (DIE - JOLT - 0.1);
  // quick at first (it drops), slower as it curls up
  return pose(A.Wake, wT * (1 - Math.min(1, 1 - Math.pow(1 - Math.min(1, u), 1.7))));
};
// keep the curled body on the ground rather than in it
const dieLift = []; for (let i = 0; i <= Math.round(DIE * FPS); i++) dieLift.push(Math.max(0, -0.01 - lowY(dieAt(i / FPS))));
const dieBase = bakeFn('_dieBase', DIE, (t) => shift(dieAt(t), dieLift[Math.round(t * FPS)]));
makeClip(doc, 'die', { dur: DIE, base: dieBase, keys: (t) => {
  const k = bump(t, 0, JOLT * 2.2);
  return { chest: [[X, -16 * k]], head: [[X, -24 * k]], upperarm_L: [[Z, 25 * k]], upperarm_R: [[Z, -25 * k]] };
} });
dropClip(dieBase);

// ---------- attack: rears back with the maw open, lunges and snaps it shut, claws raking down ----------
const ATK = 0.8, ATK_HIT = 0.4;
makeClip(doc, 'attack', { dur: ATK, base: A.Idle, baseAt: (t) => t % iT, rootNode: 'hips', keys: (t) => {
  const back = env(t, 0.02, 0.26, 0.3, 0.42), go = env(t, 0.28, 0.4, 0.5, 0.78), open = bump(t, 0.05, 0.36);
  return {
    spine_01: [[X, -8 * back + 14 * go]], chest: [[X, -10 * back + 16 * go]], neck: [[X, -6 * back + 8 * go]], head: [[X, -26 * open + 14 * go]],
    upperarm_L: [[Z, 40 * back - 10 * go], [Y, 20 * back - 45 * go]], upperarm_R: [[Z, -40 * back + 10 * go], [Y, -20 * back + 45 * go]],
    forearm_L: [[Y, -25 * go]], forearm_R: [[Y, 25 * go]],
    thigh_L: [[X, -14 * go]], thigh_R: [[X, 10 * go]], shin_L: [[X, 18 * go]], shin_R: [[X, 8 * go]]
  };
}, root: (t) => ({ p: [0, -0.02 * env(t, 0.02, 0.26, 0.3, 0.42) - 0.03 * env(t, 0.28, 0.4, 0.5, 0.78), -0.04 * env(t, 0.02, 0.26, 0.3, 0.42) + 0.12 * env(t, 0.28, 0.4, 0.5, 0.78)] }) });

// ---------- attack2, the shriek: hunches over its maw (its scream), then arches back with arms flung wide and the head
// thrown back, so the maw between head and chest gapes; it shudders while it holds the cry ----------
const SHR = 1.45, SHR_HIT = 0.5;
const crouch = pose(A.Scream, 0.5 * sT);
// the cry's stance: the scream's planted crouch below, its scuttle's flung-out arms above
const wide = new Map(crouch); { const run0 = pose(A.Running, 0); for (const b of ARMS) wide.set(b, run0.get(b)); }
const shrBase = bakeFn('_shrBase', SHR, (t) => mix(mix(pose(A.Idle, t % iT), crouch, env(t, 0, 0.3, 0.36, 0.5)), wide, env(t, 0.36, 0.5, 1.05, 1.42)));
makeClip(doc, 'attack2', { dur: SHR, base: shrBase, rootNode: 'hips', keys: (t) => {
  const arch = env(t, 0.38, 0.52, 1.0, 1.4), sh = Math.sin(t * 2 * Math.PI * 13) * env(t, 0.5, 0.6, 0.95, 1.1);
  return {
    spine_01: [[X, -16 * arch]], spine_02: [[X, -16 * arch]], chest: [[X, -16 * arch], [Z, 2.5 * sh]], neck: [[X, -18 * arch]], head: [[X, -30 * arch + 3 * sh], [Y, 3 * sh]],
    upperarm_L: [[Z, 28 * arch], [Y, 18 * arch]], upperarm_R: [[Z, -28 * arch], [Y, -18 * arch]], forearm_L: [[Z, 10 * arch + 4 * sh]], forearm_R: [[Z, -10 * arch - 4 * sh]],
    hand_L: [[Z, 15 * arch]], hand_R: [[Z, -15 * arch]]
  };
}, root: (t) => ({ p: [0, 0.015 * env(t, 0.38, 0.52, 1.0, 1.4), -0.02 * env(t, 0.38, 0.52, 1.0, 1.4)] }) });
dropClip(shrBase);

// ---------- hit: knocked back, the head snaps up ----------
makeClip(doc, 'hit', { dur: 0.42, base: A.Idle, baseAt: (t) => t % iT, rootNode: 'hips', keys: (t, d) => {
  const k = bump(t, 0, d), j = Math.pow(bump(t, 0, d * 0.7), 0.6);
  return { spine_01: [[X, -8 * j]], chest: [[X, -12 * j], [Z, 6 * k]], head: [[X, -22 * j], [Y, 10 * k]], upperarm_L: [[Z, 22 * j]], upperarm_R: [[Z, -18 * j]], forearm_L: [[Z, 12 * k]], forearm_R: [[Z, -12 * k]] };
}, root: (t, d) => ({ p: [0, 0, -0.05 * bump(t, 0, d)] }) });

if (!RAW) for (const a of Object.values(A)) dropClip(a);

// ---------- look: wet, mossy root-flesh; a faint ember deep in the hollow eyes ----------
const mat = R.listMaterials()[0];
{
  const baseTex = mat.getBaseColorTexture(), ormTex = mat.getMetallicRoughnessTexture();
  const { data, info } = await sharp(Buffer.from(baseTex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const Wd = info.width, Ht = info.height, C = info.channels;
  // grooves: what is darker than the bark around it
  const blur = await sharp(Buffer.from(baseTex.getImage())).removeAlpha().greyscale().blur(5).raw().toBuffer();
  const orm = await sharp(Buffer.from(ormTex.getImage())).removeAlpha().resize(Wd, Ht).raw().toBuffer();
  const ormOut = Buffer.alloc(Wd * Ht * 3);
  // the hollow eyes: where the deepest points of the two sockets sit in the texture (found from the rest pose)
  const eyes = eyeUVs().map(([u, v]) => [u * Wd, v * Ht]);
  const em = Buffer.alloc(Wd * Ht * 3);
  for (let y = 0, k = 0; y < Ht; y++) for (let x = 0; x < Wd; x++, k++) {
    const i = k * C;
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    const groove = Math.max(0, Math.min(1, (blur[k] - l) / 26));
    const moss = Math.max(0, Math.min(1, (g - 0.9 * r) / 12));          // the greener patches
    const fleck = Math.max(0, Math.min(1, (r - b - 70) / 50));           // the bright tan-orange flecks
    // desaturate and darken (the flecks most, the grooves to near black), then tint: bark toward wet brown, moss toward green
    const sat = 0.5 + 0.3 * moss, dark = 0.6 - 0.14 * fleck - 0.26 * groove;
    r = (l + (r - l) * sat) * dark; g = (l + (g - l) * sat) * dark; b = (l + (b - l) * sat) * dark;
    const tint = [1.06 - 0.3 * moss, 0.9 + 0.16 * moss, 0.68 - 0.14 * moss];
    data[i] = Math.min(255, r * tint[0] + 3); data[i + 1] = Math.min(255, g * tint[1] + 3); data[i + 2] = Math.min(255, b * tint[2] + 2);
    // wetter: glossy in the grooves, damp on the ridges
    const rough0 = orm[k * 3 + 1] / 255;
    let rough = Math.min(rough0, 1) * 0.55 + 0.2 - 0.18 * groove;
    let glow = 0;
    for (const [ex, ey] of eyes) { const d = Math.hypot(x - ex, y - ey); glow = Math.max(glow, 1 - smooth((d - 6) / 20)); }
    if (glow > 0) { rough = rough * (1 - glow) + 0.22 * glow; data[i] *= 1 - 0.6 * glow; data[i + 1] *= 1 - 0.65 * glow; data[i + 2] *= 1 - 0.7 * glow; }
    ormOut[k * 3] = 255; ormOut[k * 3 + 1] = Math.round(Math.max(0.12, Math.min(1, rough)) * 255); ormOut[k * 3 + 2] = 0;
    const e = glow * glow;
    em[k * 3] = 255 * e; em[k * 3 + 1] = 150 * e; em[k * 3 + 2] = 45 * e;
  }
  baseTex.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
  ormTex.setImage(await sharp(ormOut, { raw: { width: Wd, height: Ht, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  const et = doc.createTexture('rootling_eyes').setImage(await sharp(em, { raw: { width: Wd, height: Ht, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([0.6, 0.6, 0.6]).setMetallicFactor(0).setRoughnessFactor(1);
}
// the two eye sockets: their deepest vertices (furthest back along the face's forward axis) at rest
function eyeUVs() {
  const prim = R.listMeshes()[0].listPrimitives()[0], UV = prim.getAttribute('TEXCOORD_0'), e = [];
  const pts = skinnedPoints(doc, worlds(doc, locals(doc, null, 0)), 1);
  // seeds: the two socket centres in the source's texture layout (each head half is its own island)
  return [[80 / 1024, 80 / 1024], [285 / 1024, 320 / 1024]].map(([su, sv]) => {
    const near = [];
    for (let i = 0; i < UV.getCount(); i++) { UV.getElement(i, e); const d = Math.hypot(e[0] - su, e[1] - sv) * 1024; if (d < 30) near.push([i, e[0], e[1]]); }
    // the socket's floor: the vertices set deepest into the face
    near.sort((a, b) => pts[a[0]].z - pts[b[0]].z);
    const deep = near.slice(0, 4);
    return [deep.reduce((s, n) => s + n[1], 0) / deep.length, deep.reduce((s, n) => s + n[2], 0) / deep.length];
  });
}

// --dbg=<path>: an uncompressed copy for Blender contact sheets
const dbg = process.argv.find((a) => a.startsWith('--dbg='));
if (dbg) await io.write(dbg.slice(6), doc);
const b = bounds(doc, null, 0);
const bytes = await finish(doc, OUT, {
  hit: { attack: ATK_HIT, attack2: SHR_HIT }, height: HEIGHT, walkSpeed, runSpeed,
  credit: '"Mandrake" by timsblends (sketchfab.com/timsblends), CC-BY 4.0 - re-rigged, re-textured, rise, shriek, bite, hit and death animations made for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('mandrake', (bytes / 1024).toFixed(0) + ' KB', 'walk', walkSpeed, 'run', runSpeed, 'size', b.getSize(new THREE.Vector3()).toArray().map((x) => x.toFixed(2)).join('x'));
