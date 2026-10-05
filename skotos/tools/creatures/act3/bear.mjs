// Amberback Bear: "Realistic Animated Bear 3D Model" by WildMesh_3D (sketchfab.com/WildMesh_3D), CC-BY 4.0
// -> src/assets/creatures/bear.glb. The source has 81 clips on a 37-bone rig; the contract clips are cut from them
// (time windows, re-timed and chained with crossfades, root motion removed), the roars are layered on top procedurally.
// The tan fur is re-coloured dark brown and the upper back is painted with a crust of cracked, softly glowing amber
// (a mask computed from the rest-pose surface and baked into the mirrored UV layout), so the name reads from above.
// usage: node bear.mjs [source.glb] [out.glb] [--raw]
import { metalRough } from '@gltf-transform/functions';
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, duration, fastest, slimRig, byName, locals, worlds, joints, X, Y, Z, bump, smooth, env, dropClip, THREE, sharp } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/bear/model.glb', OUT = new URL('../../../src/assets/creatures/bear.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const doc = await load(SRC);
// the source is specular-glossiness: make the colour a plain baseColor texture before painting it
await doc.transform(metalRough());
// the conversion leaves a zero specular (no highlights at all); it is replaced below: glassy on the resin, faint on the fur
for (const e of doc.getRoot().listExtensionsUsed()) if (/materials_(specular|ior)/.test(e.extensionName)) e.dispose();
const SPEC = doc.createExtension(KHRMaterialsSpecular), FUR_SPEC = 0.18;
dropLoose(doc);
const A = Object.fromEntries(doc.getRoot().listAnimations().map((a) => [a.getName(), a]));
// a big brown bear: 1.5 m at the shoulder hump / ears on all fours, about 2.3 m long, 2.5 m reared up
const H = 1.5;
normalise(doc, { height: H, anim: A.Stand_Idle_01, t: 0 });

const B = { root: 'RigRoot_01', pelvis: 'RigPelvis_02', sp1: 'RigSpine1_011', sp2: 'RigSpine2_012', chest: 'RigChest_013', neck1: 'RigNeck1_019', neck2: 'RigNeck2_020', head: 'RigHead_021', jaw: 'RigJaw_022',
  clavL: 'RigLFLegCollarbone_014', fl1L: 'RigLFLeg1_015', fl2L: 'RigLFLeg2_016', clavR: 'RigRFLegCollarbone_029', fl1R: 'RigRFLeg1_030', fl2R: 'RigRFLeg2_031',
  bl1L: 'RigLBLeg1_03', bl1R: 'RigRBLeg1_07', earL: 'RigRigLEar1_027', earR: 'RigRigREar1_028', pawR: 'RigRFLegDigit11_033', pawL: 'RigLFLegDigit11_018' };
const ROOT = byName(doc, B.root), ROOT0 = new THREE.Vector3().fromArray(ROOT.getTranslation()), PELVIS = byName(doc, B.pelvis);
// the hips' parent frame (rest) to character space and back, for editing the hips' travel
const PAR3 = new THREE.Matrix3().setFromMatrix4(worlds(doc, locals(doc, null, 0)).get(ROOT)), PAR3I = PAR3.clone().invert();

// ---------- clip building: poses sampled from source clips, re-timed, chained with crossfades ----------
const FPS = 30;
// pose of a source clip at time t; root: 'zero' drops the root bone's travel (clips play in place), 'keep' keeps it, a number scales it
function pose(anim, t, root = 'zero', lunge = 1) {
  const L = locals(doc, anim, Math.max(0, Math.min(t, duration(anim))));
  const r = L.get(ROOT);
  if (root === 'zero') r.p.copy(ROOT0); else if (typeof root === 'number') r.p.sub(ROOT0).multiplyScalar(root).add(ROOT0);
  // lunge < 1 shortens the hips' forward/sideways travel (in character space) relative to the clip's first frame
  if (lunge !== 1) {
    const pv = L.get(PELVIS), p0 = locals(doc, anim, 0).get(PELVIS).p;
    const d = pv.p.clone().sub(p0).applyMatrix3(PAR3), keep = new THREE.Vector3(d.x * lunge, d.y, d.z * lunge);
    pv.p.copy(p0).add(keep.applyMatrix3(PAR3I));
  }
  return L;
}
function mix(La, Lb, k) {
  if (k <= 0) return La; if (k >= 1) return Lb;
  const out = new Map();
  for (const [n, a] of La) { const b = Lb.get(n); out.set(n, { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k), s: a.s.clone().lerp(b.s, k) }); }
  return out;
}
// segs: [{ a: anim, from, to, dur, root }] played one after another; each crossfades into the next over `fade` seconds.
// end: { pose: () => locals, fade } eases the last frames into a given pose (so a clip ends where the idle starts).
function seqPose(segs, fade = 0.12, end = null) {
  const starts = []; let acc = 0; for (const s of segs) { starts.push(acc); acc += s.dur; }
  const total = acc;
  const at = (s, u) => pose(s.a, s.from + (s.to - s.from) * Math.max(0, Math.min(1, u)), s.root ?? 'zero', s.lunge ?? 1);
  const fn = (t) => {
    let i = segs.length - 1; while (i > 0 && t < starts[i]) i--;
    const s = segs[i], u = (t - starts[i]) / s.dur;
    let L = at(s, u);
    // crossfade from the end of the previous segment
    if (i > 0 && t - starts[i] < fade) { const p = segs[i - 1]; L = mix(at(p, 1), L, smooth((t - starts[i]) / fade)); }
    if (end && t > total - end.fade) L = mix(L, end.pose(), smooth((t - (total - end.fade)) / end.fade));
    return L;
  };
  fn.total = total;
  return fn;
}
// bakes poseAt(t) into a temporary clip that makeClip can layer procedural keys on
function bake(name, dur, poseAt) {
  const n = Math.max(2, Math.round(dur * FPS) + 1), buf = doc.getRoot().listBuffers()[0];
  const rows = []; for (let i = 0; i < n; i++) rows.push(poseAt(Math.min(dur, i / FPS)));
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = Math.min(dur, i / FPS);
  const input = doc.createAccessor(name + '_bt').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  for (const nd of joints(doc)) {
    for (const path of ['rotation', 'translation']) {
      const k = path === 'rotation' ? 4 : 3, arr = new Float32Array(n * k); let prev = null;
      for (let i = 0; i < n; i++) {
        const v = rows[i].get(nd);
        if (k === 4) { const q = v.q.clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; } else v.p.toArray(arr, i * 3);
      }
      const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(k === 4 ? 'VEC4' : 'VEC3').setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
      anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nd).setTargetPath(path).setSampler(s));
    }
  }
  return anim;
}
// a chained clip with optional procedural keys on top; ground: lifts the hips wherever the body would sink below y = 0
function chain(name, poseAt, o = {}) {
  let tmp = bake('_tmp_' + name, poseAt.total, poseAt);
  if (o.ground) {
    const n = Math.round(poseAt.total * FPS), lift = [];
    for (let i = 0; i <= n; i++) lift.push(Math.max(0, -bounds(doc, tmp, Math.min(poseAt.total, i / FPS), 5).min.y));
    // a running max over a few frames, then smoothed, so the lift never pops
    const sm = lift.map((_, i) => { let m = 0; for (let j = -3; j <= 3; j++) m = Math.max(m, lift[Math.max(0, Math.min(n, i + j))] || 0); return m; });
    const lifted = (t) => { const L = poseAt(t), i = Math.min(n, Math.round(t * FPS)); L.get(PELVIS).p.add(new THREE.Vector3(0, sm[i], 0).applyMatrix3(PAR3I)); return L; };
    lifted.total = poseAt.total;
    dropClip(tmp); tmp = bake('_tmp_' + name, poseAt.total, lifted);
  }
  const clip = makeClip(doc, name, { dur: poseAt.total, base: tmp, keys: o.keys, loop: o.loop });
  dropClip(tmp);
  return clip;
}
const IDLE = A.StandAngry_Breathing_01;
// ground speed of a source loop at this scale: the root bone's travel per second
const groundSpeed = (anim) => { const d = duration(anim), at = (t) => new THREE.Vector3().setFromMatrixPosition(worlds(doc, locals(doc, anim, t)).get(ROOT)); return at(d).sub(at(0)).length() / d; };
const idle0 = () => pose(IDLE, 0);

// idle: the angry stance (head low, hump up, weight shifting from paw to paw)
copyClip(doc, IDLE, 'idle', { loop: true });
// walk: the source walk, in place
chain('walk', seqPose([{ a: A.Walk, from: 0, to: duration(A.Walk), dur: duration(A.Walk) }], 0), { loop: true });
// run: the bounding lope, a little slower than the source so a 5-6 m/s chase reads as a run
const RUNK = 0.8;
const WALK_SPEED = +groundSpeed(A.Walk).toFixed(2), RUN_SPEED = +(groundSpeed(A.Run) * RUNK).toFixed(2), CHARGE_SPEED = +groundSpeed(A.Sprint).toFixed(2);
chain('run', seqPose([{ a: A.Run, from: 0, to: duration(A.Run), dur: duration(A.Run) / RUNK }], 0), { loop: true });
// charge: the full gallop (an extra for the charger's dash)
chain('charge', seqPose([{ a: A.Sprint, from: 0, to: duration(A.Sprint), dur: duration(A.Sprint) }], 0), { loop: true });
// attack: crouch, rise with the right paw cocked high, a sweeping cross-body swipe, recover into the idle stance
chain('attack', seqPose([{ a: A.Attack_StandAngry_01_Low, from: 0.08, to: 1.45, dur: 1.37 / 1.2, lunge: 0.7 }], 0, { pose: idle0, fade: 0.32 }));
// attack2 (the maul): rear onto the hind legs, both paws high, slam down, a short roar over the kill
chain('attack2', seqPose([{ a: A.Attack_StandAngry_01_High, from: 0, to: 1.95, dur: 1.95 / 1.25, lunge: 0.55 }], 0, { pose: idle0, fade: 0.38 }));
// rear (the charge wind-up): gather, rise onto the hind legs, roar with the forelegs spread, drop back onto all fours.
// The root's step back and forward is kept (it nets to zero), so the front paws stay planted while it rocks back.
const rearSegs = [
  { a: A.Trans_Stand_to_StandHind, from: 0.6, to: 1.45, dur: 0.36, root: 'keep' },
  { a: A.Trans_Stand_to_StandHind, from: 1.45, to: 2.4, dur: 0.38, root: 'keep' },
  { a: A.Trans_Stand_to_StandHind, from: 2.4, to: 3.0, dur: 0.36, root: 'keep' },
  { a: A.Trans_StandHind_to_Stand, from: 0, to: 0.72, dur: 0.32, root: 'keep' },
  { a: A.Trans_StandHind_to_Stand, from: 0.72, to: 2.3, dur: 0.36, root: 'keep' }
];
const rearPose = seqPose(rearSegs, 0.06, { pose: idle0, fade: 0.22 });
const REAR_UP = 0.36 + 0.38, REAR_LAND = REAR_UP + 0.36 + 0.3;
chain('rear', rearPose, { keys: (t) => {
  const k = env(t, REAR_UP - 0.15, REAR_UP + 0.05, REAR_UP + 0.3, REAR_UP + 0.42), sh = Math.sin(t * 38) * k;
  return { [B.neck1]: [[X, -10 * k]], [B.neck2]: [[X, -8 * k]], [B.head]: [[X, -14 * k], [Y, 3 * sh]], [B.jaw]: [[X, 34 * k]],
    [B.clavL]: [[Z, -14 * k]], [B.clavR]: [[Z, 14 * k]], [B.fl1L]: [[X, -20 * k]], [B.fl1R]: [[X, -20 * k]], [B.chest]: [[X, -6 * k]], [B.earL]: [[X, 25 * k]], [B.earR]: [[X, 25 * k]] };
} });
// howl: a roar on all fours, head thrown forward and up, jaw wide, the whole body shaking with it
const howlPose = seqPose([{ a: IDLE, from: 0, to: 0.6, dur: 2.1 }], 0, { pose: idle0, fade: 0.3 });
chain('howl', howlPose, { keys: (t) => {
  const inh = bump(t, 0, 0.5), k = env(t, 0.35, 0.65, 1.55, 1.95), sh = Math.sin(t * 40) * k;
  return { [B.chest]: [[X, -5 * k]], [B.fl1L]: [[X, 5 * k]], [B.fl1R]: [[X, 5 * k]], [B.neck1]: [[X, -16 * k + 12 * inh]], [B.neck2]: [[X, -10 * k + 5 * inh]],
    [B.head]: [[X, -16 * k + 6 * inh], [Y, 2.5 * sh], [Z, 2 * sh]], [B.jaw]: [[X, 32 * k + 3 * sh]], [B.earL]: [[X, 30 * k]], [B.earR]: [[X, 30 * k]], [B.sp1]: [[X, -2 * k]] };
} });
// hit: the head snaps back with a bark, the hindquarters dip; settles back to the stance it started from
chain('hit', seqPose([{ a: A.Hit_Stand_F01, from: 0, to: 0.6, dur: 0.42 }, { a: A.Hit_Stand_F01, from: 0, to: 0, dur: 0.33 }], 0.3));
// daze (an extra for the stunned charger): swaying, head shaking, unsteady; loops
makeClip(doc, 'daze', { dur: 2.0, loop: true, base: IDLE, baseAt: () => 0, keys: (t, d) => {
  const p = (t / d) * Math.PI * 2;
  return { [B.sp1]: [[Z, 2 * Math.sin(p)]], [B.chest]: [[Z, 2.5 * Math.sin(p + 0.6)], [X, -2 * Math.abs(Math.sin(p))]], [B.neck1]: [[X, 10 + 4 * Math.sin(2 * p)], [Y, 8 * Math.sin(p + 1.2)]],
    [B.head]: [[Y, 14 * Math.sin(2 * p) * Math.sin(p)], [Z, 10 * Math.sin(p + 2)]], [B.jaw]: [[X, 10 + 6 * Math.sin(3 * p)]], [B.earL]: [[X, 20]], [B.earR]: [[X, 20]] };
} });
// die: legs give, it rolls onto its side; only part of the source's sideways travel is kept so it falls near where it stood
chain('die', seqPose([{ a: A.Death_Stand_R01, from: 0, to: duration(A.Death_Stand_R01), dur: duration(A.Death_Stand_R01) * 1.1, root: 0.35 }], 0), { ground: true });
if (!RAW) for (const a of Object.values(A)) dropClip(a);

// ---------- the amber back ----------
// rest-pose surface positions in character space, per primitive
const W0 = worlds(doc, locals(doc, null, 0));
function restVerts(node, prim) {
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), skin = node.getSkin();
  const ibm = skin.getInverseBindMatrices().getArray(), js = skin.listJoints(), out = new Float32Array(P.getCount() * 3);
  const e = [], je = [], we = [], v = new THREE.Vector3(), acc = new THREE.Vector3(), m = new THREE.Matrix4(), ib = new THREE.Matrix4();
  for (let i = 0; i < P.getCount(); i++) {
    P.getElement(i, e); J.getElement(i, je); Wt.getElement(i, we); acc.set(0, 0, 0);
    for (let k = 0; k < 4; k++) { if (!we[k]) continue; ib.fromArray(ibm, je[k] * 16); m.multiplyMatrices(W0.get(js[je[k]]), ib); acc.add(v.fromArray(e).applyMatrix4(m).multiplyScalar(we[k])); }
    acc.toArray(out, i * 3);
  }
  return out;
}
// noise (deterministic)
const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), L(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    L(L(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), L(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm = (x, y, z, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); a *= 0.5; f *= 2.03; } return s / (1 - Math.pow(0.5, o)); };
// cellular: distance to the nearest and second-nearest feature point, and the nearest cell's id
function cells(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const cx = xi + i, cy = yi + j, cz = zi + k;
    const px = cx + hash3(cx, cy, cz), py = cy + hash3(cy + 17, cz, cx), pz = cz + hash3(cz + 31, cx, cy);
    const d = Math.hypot(px - x, py - y, pz - z);
    if (d < f1) { f2 = f1; f1 = d; id = hash3(cx + 7, cy + 3, cz + 11); } else if (d < f2) f2 = d;
  }
  return [f1, f2, id];
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// the dorsal line: the highest surface point along the body, from the rest pose
const meshes = doc.getRoot().listNodes().filter((n) => n.getMesh() && n.getSkin());
const allV = []; for (const n of meshes) for (const p of n.getMesh().listPrimitives()) allV.push(restVerts(n, p));
let zmin = 9, zmax = -9, cx = 0, cn = 0;
for (const v of allV) for (let i = 0; i < v.length; i += 3) { zmin = Math.min(zmin, v[i + 2]); zmax = Math.max(zmax, v[i + 2]); cx += v[i]; cn++; }
cx /= cn;
const NZ = 120, top = new Float32Array(NZ).fill(-9);
const zi = (z) => Math.max(0, Math.min(NZ - 1, Math.floor(((z - zmin) / (zmax - zmin)) * NZ)));
for (const v of allV) for (let i = 0; i < v.length; i += 3) { const k = zi(v[i + 2]); top[k] = Math.max(top[k], v[i + 1]); }
for (let k = 0; k < NZ; k++) if (top[k] < -8) top[k] = top[Math.max(0, k - 1)];
// smooth the profile
const topS = top.map((_, k) => { let s = 0, c = 0; for (let j = -3; j <= 3; j++) { const q = k + j; if (q >= 0 && q < NZ) { s += top[q]; c++; } } return s / c; });
const wp = (name) => new THREE.Vector3().setFromMatrixPosition(W0.get(byName(doc, name)));
const zTail = wp(B.pelvis).z - 0.22, zNeck = wp(B.neck1).z + 0.16, zHump = wp(B.clavL).z;
console.log('dorsal span', zTail.toFixed(2), '->', zNeck.toFixed(2), 'hump', zHump.toFixed(2), 'centre x', cx.toFixed(3));

// mask at a surface point: crust (0..1), soak (the amber-stained fur around it), crack, cell id, glow variation
function amberAt(x, y, z) {
  const ax = Math.abs(x - cx);   // mirrored UVs: the mask must be symmetric
  const d = topS[zi(z)] - y;     // depth below the dorsal line
  const along = sstep(zTail - 0.05, zTail + 0.25, z + (fbm(ax * 4, y * 4, z * 3) - 0.5) * 0.3) * (1 - sstep(zNeck - 0.22, zNeck + 0.04, z + (fbm(ax * 5 + 3, y * 5, z * 4) - 0.5) * 0.2));
  // a saddle of resin: thickest over the shoulder hump, thinning over the rump
  const depth = 0.085 + 0.085 * Math.exp(-Math.pow((z - zHump) / 0.3, 2)) + (fbm(ax * 7 + 11, y * 6, z * 7) - 0.5) * 0.13;
  let crust = along * (1 - sstep(depth - 0.02, depth + 0.02, d));
  // holes where fur shows through, more of them towards the edge
  const core = 1 - sstep(0, depth * 0.7, d);
  crust *= core + (1 - core) * sstep(0.36, 0.5, fbm(ax * 7 + 2, y * 7, z * 7));
  // resin runs down the flanks from the crust's edge
  const run = 0.04 + 0.2 * Math.pow(vnoise(ax * 2 + 5, 0.5, z * 9), 3) * 2.2;
  const streak = sstep(0.62, 0.72, vnoise(ax * 9, y * 1.2, z * 30));
  crust = Math.max(crust, along * streak * (1 - sstep(depth, depth + run, d)) * sstep(depth - 0.05, depth, d) * 0.9);
  const soak = along * (1 - sstep(depth + 0.02, depth + 0.16, d));
  if (crust <= 0.001) return { crust: 0, soak, crack: 0, id: 0, glow: 0, f1: 0 };
  const [f1, f2, id] = cells(ax * 10, y * 10, z * 10);
  // an incomplete crack network: some plate borders are fused, the open ones wander
  const crack = (1 - sstep(0.006, 0.04, f2 - f1 + (vnoise(ax * 60, y * 60, z * 60) - 0.5) * 0.02)) * (0.25 + 0.75 * sstep(0.35, 0.6, vnoise(ax * 13 + 4, y * 13, z * 13)));
  const glow = 0.25 + 0.75 * Math.pow(fbm(ax * 8 + 1, y * 8, z * 8, 3), 1.5) * (0.6 + 0.4 * id);
  return { crust, soak, crack, id, glow, f1 };
}

// rasterises every triangle of a primitive into its texture space, calling paint(px, py, pos) per covered texel
function rasterise(prim, pos, Wd, Hd, paint) {
  const uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray();
  const a = [], b = [], c = [];
  for (let t = 0; t < idx.length; t += 3) {
    const I = [idx[t], idx[t + 1], idx[t + 2]];
    uv.getElement(I[0], a); uv.getElement(I[1], b); uv.getElement(I[2], c);
    const P = [a, b, c].map((q) => [q[0] * Wd, q[1] * Hd]);
    const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0])) - 1), x1 = Math.min(Wd - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1])) - 1), y1 = Math.min(Hd - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])) + 1);
    const den = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]); if (Math.abs(den) < 1e-12) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((P[1][1] - P[2][1]) * (px - P[2][0]) + (P[2][0] - P[1][0]) * (py - P[2][1])) / den, l2 = ((P[2][1] - P[0][1]) * (px - P[2][0]) + (P[0][0] - P[2][0]) * (py - P[2][1])) / den, l3 = 1 - l1 - l2;
      // a little slack so texels on triangle edges are covered too
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      const q = [0, 1, 2].map((k) => l1 * pos[I[0] * 3 + k] + l2 * pos[I[1] * 3 + k] + l3 * pos[I[2] * 3 + k]);
      paint(x, y, q);
    }
  }
}
// grows painted texels into unpainted ones so seams do not show the unpainted background
function dilate(buf, done, Wd, Hd, ch, n = 4) {
  for (let it = 0; it < n; it++) {
    const add = [];
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const i = y * Wd + x; if (done[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= Wd || Y2 >= Hd) continue; const j = Y2 * Wd + X2; if (done[j]) { add.push([i, j]); break; } }
    }
    for (const [i, j] of add) { for (let k = 0; k < ch; k++) buf[i * ch + k] = buf[j * ch + k]; done[i] = 1; }
  }
}
// fur: the tan source re-graded to a dark, slightly red brown (a gradient map on luminance)
const FUR = [[0, [10, 6, 4]], [0.25, [34, 21, 13]], [0.5, [66, 42, 26]], [0.75, [104, 70, 44]], [1, [150, 108, 72]]];
// the source's pale chest and belly would read as a cream bib: the top of the range is compressed
const soft = (l) => (l < 0.42 ? l : 0.42 + (l - 0.42) * 0.42);
const grade = (l0) => { const l = soft(l0); for (let i = 1; i < FUR.length; i++) if (l <= FUR[i][0]) { const [a, ca] = FUR[i - 1], [b, cb] = FUR[i], t = (l - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * t); } return FUR[FUR.length - 1][1]; };
const AMBER_DEEP = [118, 44, 5], AMBER_GOLD = [245, 150, 36], CRACK = [34, 15, 5];

const painted = new Set();
for (const node of meshes) for (const prim of node.getMesh().listPrimitives()) {
  const mat = prim.getMaterial(), tex = mat?.getBaseColorTexture();
  if (!tex || painted.has(mat) || /Material_002/.test(mat.getName())) continue;   // teeth, tongue and eyes stay as they are
  painted.add(mat);
  const pos = restVerts(node, prim);
  const { data, info } = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const Wd = info.width, Hd = info.height, ch = info.channels;
  // fur luminance: it drives the brown grade and what shows through the resin
  const lum = new Float32Array(Wd * Hd);
  for (let i = 0; i < Wd * Hd; i++) lum[i] = (0.3 * data[i * ch] + 0.55 * data[i * ch + 1] + 0.15 * data[i * ch + 2]) / 255;
  const col = Buffer.alloc(Wd * Hd * 3), done = new Uint8Array(Wd * Hd);
  const ES = 512, em = Buffer.alloc(ES * ES * 3), emDone = new Uint8Array(ES * ES), mr = Buffer.alloc(ES * ES * 3), mask = new Float32Array(ES * ES), sp = Buffer.alloc(ES * ES * 4, 255);
  for (let i = 0; i < Wd * Hd; i++) { const g = grade(Math.min(1, lum[i] * 1.05)); col[i * 3] = g[0]; col[i * 3 + 1] = g[1]; col[i * 3 + 2] = g[2]; }
  for (let i = 0; i < ES * ES; i++) { mr[i * 3] = 255; mr[i * 3 + 1] = 235; mr[i * 3 + 2] = 0; }
  rasterise(prim, pos, Wd, Hd, (x, y, q) => {
    const i = y * Wd + x; if (done[i]) return; done[i] = 1;
    const m = amberAt(q[0], q[1], q[2]), l = lum[i];
    let c = grade(Math.min(1, l * 1.05));
    // fur soaked with resin: warmer, a little golden
    if (m.soak > 0) { const s = m.soak * 0.55; c = [c[0] * (1 + 0.9 * s) + 22 * s, c[1] * (1 + 0.45 * s) + 9 * s, c[2] * (1 - 0.3 * s)]; }
    if (m.crust > 0) {
      // translucent amber: the plate's own tone, the fur showing through it, darker towards the cracks
      const tone = 0.25 + 0.4 * m.id + 0.35 * m.glow, thru = 0.5 + 0.8 * l, edge = 1 - 0.3 * Math.min(1, m.f1 * 1.4);
      let a = AMBER_DEEP.map((v, k) => (v + (AMBER_GOLD[k] - v) * tone) * thru * edge);
      a = a.map((v, k) => v + (CRACK[k] - v) * m.crack);
      c = c.map((v, k) => v + (a[k] - v) * m.crust);
    }
    col[i * 3] = Math.min(255, c[0]); col[i * 3 + 1] = Math.min(255, c[1]); col[i * 3 + 2] = Math.min(255, c[2]);
  });
  // the glow and gloss maps at 512
  rasterise(prim, pos, ES, ES, (x, y, q) => {
    const i = y * ES + x; if (emDone[i]) return; emDone[i] = 1;
    const m = amberAt(q[0], q[1], q[2]);
    const g = m.crust * (1 - m.crack) * m.glow * (1.15 - 0.5 * Math.min(1, (m.f1 ?? 0) * 1.4));
    em[i * 3] = Math.min(255, 255 * g); em[i * 3 + 1] = Math.min(255, 150 * g); em[i * 3 + 2] = Math.min(255, 38 * g);
    // roughness (G): fur matte, resin glassy, cracks in between
    const rough = 0.92 - m.crust * (0.66 - 0.35 * m.crack) - m.soak * 0.12;
    mr[i * 3 + 1] = Math.round(255 * Math.max(0.18, rough));
    mask[i] = m.crust;
    sp[i * 4 + 3] = Math.round(255 * (FUR_SPEC + (1 - FUR_SPEC) * Math.max(m.crust * (1 - 0.5 * m.crack), m.soak * 0.25)));
  });
  dilate(col, done, Wd, Hd, 3, 6);
  tex.setImage(await sharp(col, { raw: { width: Wd, height: Hd, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  // no resin on this part (the head): matte fur, faint specular, no extra maps
  if (!mask.some((v) => v > 0)) { mat.setRoughnessFactor(0.92).setMetallicFactor(0).setExtension('KHR_materials_specular', SPEC.createSpecular().setSpecularFactor(FUR_SPEC)); continue; }
  dilate(mr, new Uint8Array(emDone), ES, ES, 3, 4); dilate(sp, new Uint8Array(emDone), ES, ES, 4, 4); dilate(em, emDone, ES, ES, 3, 4);
  const et = doc.createTexture(mat.getName() + '_amber').setImage(await sharp(em, { raw: { width: ES, height: ES, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  const rt = doc.createTexture(mat.getName() + '_gloss').setImage(await sharp(mr, { raw: { width: ES, height: ES, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([0.4, 0.4, 0.4]).setMetallicRoughnessTexture(rt).setMetallicFactor(0).setRoughnessFactor(1);
  // specular strength (alpha): full on the resin, faint on the fur (a plain PBR fur would wear a grey sheen)
  const st = doc.createTexture(mat.getName() + '_spec').setImage(await sharp(sp, { raw: { width: ES, height: ES, channels: 4 } }).png().toBuffer()).setMimeType('image/png');
  mat.setExtension('KHR_materials_specular', SPEC.createSpecular().setSpecularFactor(1).setSpecularColorFactor([1, 1, 1]).setSpecularTexture(st));
  // the resin is smooth: flatten the fur's normal map under it
  const nt = mat.getNormalTexture();
  if (nt) {
    const nimg = sharp(Buffer.from(nt.getImage())).removeAlpha().resize(ES, ES);
    const nd = await nimg.raw().toBuffer();
    for (let i = 0; i < ES * ES; i++) { const k = mask[i] * 0.85; nd[i * 3] += (128 - nd[i * 3]) * k; nd[i * 3 + 1] += (128 - nd[i * 3 + 1]) * k; nd[i * 3 + 2] += (255 - nd[i * 3 + 2]) * k; }
    nt.setImage(await sharp(nd, { raw: { width: ES, height: ES, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  }
  if (process.env.DUMP) {   // DUMP=<dir>: write the painted colour and glow maps for a look
    await sharp(col, { raw: { width: Wd, height: Hd, channels: 3 } }).png().toFile(process.env.DUMP + '/' + mat.getName() + '_col.png');
    await sharp(em, { raw: { width: ES, height: ES, channels: 3 } }).png().toFile(process.env.DUMP + '/' + mat.getName() + '_em.png');
  }
}
// the materials stay double-sided like the source's: rendered single-sided, parts of the belly show the wrong side

// ---------- finish ----------
const nUsed = slimRig(doc);
const b = bounds(doc, null, 0);
const clips = Object.fromEntries(doc.getRoot().listAnimations().map((a) => [a.getName(), a]));
// strikes: the swiping paw's fastest moment; the rear "lands" when the front paws come down (the charge starts there)
const hitT = { attack: fastest(doc, clips.attack, B.pawR), attack2: fastest(doc, clips.attack2, B.pawR), rear: +REAR_LAND.toFixed(2), howl: 0.65 };
const bytes = await finish(doc, OUT, {
  hit: hitT, height: H, length: +(b.max.z - b.min.z).toFixed(2), walkSpeed: WALK_SPEED, runSpeed: RUN_SPEED, chargeSpeed: CHARGE_SPEED,
  credit: '"Realistic Animated Bear 3D Model" by WildMesh_3D (sketchfab.com/WildMesh_3D), CC-BY 4.0 - re-coloured with an amber crust, clips cut and re-timed, roars added for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('bear', (bytes / 1024).toFixed(0) + ' KB', 'joints', nUsed, JSON.stringify(hitT), 'size', b.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join('x'));
