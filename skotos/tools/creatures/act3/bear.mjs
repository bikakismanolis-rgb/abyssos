// Amberback Bear: "Realistic Animated Bear 3D Model" by WildMesh_3D (sketchfab.com/WildMesh_3D), CC-BY 4.0
// -> src/assets/creatures/bear.glb. The source has 81 clips on a 37-bone rig; the contract clips are cut from them
// (time windows, re-timed and chained with crossfades, root motion removed), the roars are layered on top procedurally.
// The tan fur is re-coloured dark brown and the upper back is painted with a crust of cracked, softly glowing amber
// (a mask computed from the rest-pose surface and baked into the mirrored UV layout), so the name reads from above.
// The skin weights around the elbows and knees are reworked so a swinging leg no longer pulls a sheet of skin off the body.
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

// ---------- skin weights: no skin sheets between the legs and the body ----------
// The source weights the chest underside behind the elbows about 0.5 to the forearms (and the flank folds at the knees to
// the shins), so a swinging leg drags a pale sheet of skin off the chest: an edge there grows 0.12 -> 0.6 m in the swipe.
//  1. on the torso side of each elbow / knee the lower-leg weight moves onto the upper leg, then 45% of the upper leg's onto
//     the body bones the vertex already follows; skin well away from a leg's bones gives all of that leg's weight to the body;
//  2. wherever a clip still stretches an edge by more than 12 cm, the weights there relax towards their neighbours' (the
//     relaxing region grows while edges stay stretched, so the blend from leg to body widens instead of piling up);
//  3. a short fit (gradient descent on the clips' edge growth over 11 cm, kept close to step 2) takes what is left.
// Edge growth is measured against the idle's first frame. Only the body mesh changes, and only above the paws and forearms /
// shins (y > 0.4); co-located vertices (UV seams) share their weights and the neck seam with the head mesh stays as it was.
{
  const SKIN_CLIPS = ['idle', 'walk', 'run', 'charge', 'attack', 'attack2', 'rear', 'howl', 'hit', 'daze', 'die'].map((n) => doc.getRoot().listAnimations().find((a) => a.getName() === n));
  const BODY_MESH = 'Object_8', LOW = 0.4, RELAX_AT = 0.12, FIT_AT = 0.11;
  const BODY = /Pelvis|Spine|Chest/;
  // the meshes, welded by position: a "vertex" below is a group of co-located vertices
  const items = [];
  for (const node of meshes) for (const prim of node.getMesh().listPrimitives()) {
    const skin = node.getSkin(), js = skin.listJoints(), PA = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), nv = PA.getCount();
    const key = new Map(), g = new Int32Array(nv), first = [];
    for (let v = 0; v < nv; v++) { const k = PA.getElement(v, []).map((x) => Math.round(x * 1e5)).join(); if (!key.has(k)) { key.set(k, first.length); first.push(v); } g[v] = key.get(k); }
    const n = first.length, rv = restVerts(node, prim), raw = new Float32Array(n * 3), pos = new Float32Array(n * 3);
    first.forEach((v, i) => { raw.set(PA.getElement(v, []), i * 3); pos.set(rv.subarray(v * 3, v * 3 + 3), i * 3); });
    const w = first.map((v) => { const je = J.getElement(v, []), we = Wt.getElement(v, []), m = new Map(); for (let k = 0; k < 4; k++) if (we[k] > 0) m.set(je[k], (m.get(je[k]) || 0) + we[k]); return m; });
    const nb = Array.from({ length: n }, () => new Set()), idx = prim.getIndices().getArray();
    for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = g[idx[t + k]], c = g[idx[t + (k + 1) % 3]]; if (a !== c) { nb[a].add(c); nb[c].add(a); } }
    const edges = []; for (let a = 0; a < n; a++) for (const c of nb[a]) if (a < c) edges.push(a, c);
    items.push({ node, prim, J, Wt, nv, g, n, js, names: js.map((j) => j.getName()), ibm: skin.getInverseBindMatrices().getArray(), raw, pos, w, nb, edges, free: new Uint8Array(n), changed: new Uint8Array(n) });
  }
  const body = items.find((it) => it.node.getName() === BODY_MESH);
  const P3 = (it, i) => new THREE.Vector3().fromArray(it.pos, i * 3);
  const seam = items.filter((it) => it !== body).flatMap((it) => Array.from({ length: it.n }, (_, i) => P3(it, i)));
  for (let i = 0; i < body.n; i++) { const p = P3(body, i); body.free[i] = p.y > LOW && !seam.some((q) => q.distanceToSquared(p) < 1e-6) ? 1 : 0; }
  const top4 = (m) => { const a = [...m].filter(([, x]) => x > 1e-4).sort((x, y) => y[1] - x[1]).slice(0, 4), s = a.reduce((x, [, y]) => x + y, 0); return new Map(a.map(([j, x]) => [j, x / s])); };

  // the clips, sampled at 30 fps: skinning matrices (joint world x inverse bind) per frame; frame 0 is the reference (idle at 0)
  const poses = [locals(doc, SKIN_CLIPS[0], 0)];
  for (const c of SKIN_CLIPS) { const d = duration(c), n = Math.ceil(d * 30); for (let f = 0; f <= n; f++) poses.push(locals(doc, c, (d * f) / n)); }
  const F = poses.length, M = poses.map((L) => { const W = worlds(doc, L); return body.js.map((j, k) => new THREE.Matrix4().multiplyMatrices(W.get(j), new THREE.Matrix4().fromArray(body.ibm, k * 16))); });
  const posed = (f) => { const out = new Float32Array(body.n * 3), r = new THREE.Vector3(), v = new THREE.Vector3(), a = new THREE.Vector3();
    for (let i = 0; i < body.n; i++) { r.fromArray(body.raw, i * 3); a.set(0, 0, 0); for (const [j, x] of body.w[i]) a.addScaledVector(v.copy(r).applyMatrix4(M[f][j]), x); a.toArray(out, i * 3); } return out; };
  const len = (P, a, c) => Math.hypot(P[a * 3] - P[c * 3], P[a * 3 + 1] - P[c * 3 + 1], P[a * 3 + 2] - P[c * 3 + 2]);
  // each edge's largest growth over all frames
  const growth = () => { const R = posed(0), g = new Float32Array(body.edges.length / 2).fill(-9);
    for (let f = 1; f < F; f++) { const P = posed(f); for (let e = 0; e < g.length; e++) { const a = body.edges[e * 2], c = body.edges[e * 2 + 1], x = len(P, a, c) - len(R, a, c); if (x > g[e]) g[e] = x; } } return g; };
  const report = (g) => `worst +${Math.max(...g).toFixed(3)} m, ${g.filter((x) => x > 0.1).length} edges over 10 cm`;
  const g0 = growth();

  // 1. the torso side of the elbows and knees
  const wpos = (n) => new THREE.Vector3().setFromMatrixPosition(W0.get(byName(doc, n)));
  // [side (+x left), torso direction from the elbow / knee along z, upper leg, lower leg bones, body bone of last resort,
  //  distance from the leg's bones over which the leg lets go of the skin]
  const LEGS = [[1, -1, B.fl1L, [B.fl2L, 'RigLFLegAnkle_017', 'RigLFLegDigit11_018'], B.chest, [0.22, 0.36]], [-1, -1, B.fl1R, [B.fl2R, 'RigRFLegAnkle_032', B.pawR], B.chest, [0.22, 0.36]],
    [1, 1, B.bl1L, ['RigLBLeg2_04', 'RigLBLegAnkle_05', 'RigLBLegDigit11_06'], B.pelvis, [0.24, 0.38]], [-1, 1, B.bl1R, ['RigRBLeg2_08', 'RigRBLegAnkle_09', 'RigRBLegDigit11_010'], B.pelvis, [0.24, 0.38]]]
    .map(([side, dir, upper, lower, own, far]) => ({ side, dir, upper, lower, own, far, J: wpos(lower[0]), chain: [upper, ...lower].map(wpos) }));
  const segDist = (p, a, c) => { const ac = c.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ac) / ac.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ac, t)); };
  for (let i = 0; i < body.n; i++) {
    if (!body.free[i]) continue;
    const p = P3(body, i), w = body.w[i], ix = (n) => body.names.indexOf(n);
    for (const L of LEGS) {
      const up = ix(L.upper), lows = L.lower.map(ix).filter((j) => w.has(j));
      if (!w.has(up) && !lows.length) continue;
      // medial of the elbow / knee, or behind the elbow / in front of the knee without being on its outer side; not below it
      const m = L.side * (L.J.x - p.x), d = L.dir * (p.z - L.J.z), h = p.y - L.J.y;
      const t = Math.max(sstep(0.03, 0.07, m), sstep(0.08, 0.11, d) * sstep(-0.03, 0.01, m)) * sstep(-0.1, -0.03, h) * (1 - sstep(0.3, 0.4, h));
      let dl = 9; for (let k = 0; k + 1 < L.chain.length; k++) dl = Math.min(dl, segDist(p, L.chain[k], L.chain[k + 1]));
      const away = sstep(L.far[0], L.far[1], dl);
      if (t <= 0.001 && away <= 0.001) continue;
      let low = 0; for (const j of lows) { low += w.get(j) * t; w.set(j, w.get(j) * (1 - t)); }
      w.set(up, (w.get(up) || 0) + low);
      const k = Math.max(0.45 * t, away); let give = 0;
      for (const j of [up, ...lows]) { const x = w.get(j) || 0; give += x * k; w.set(j, x * (1 - k)); }
      const bw = [...w].filter(([j]) => BODY.test(body.names[j])), bs = bw.reduce((s, [, x]) => s + x, 0);
      if (bs > 0.05) for (const [j, x] of bw) w.set(j, x + (give * x) / bs); else w.set(ix(L.own), (w.get(ix(L.own)) || 0) + give);
      body.changed[i] = 1;
    }
    if (body.changed[i]) body.w[i] = top4(w);
  }
  const g1 = growth();

  // 2. relax where it still stretches
  const region = new Uint8Array(body.n);
  for (let it = 0; it < 40; it++) {
    const g = growth(), hot = new Uint8Array(body.n);
    for (let e = 0; e < g.length; e++) if (g[e] > RELAX_AT) { hot[body.edges[e * 2]] = 1; hot[body.edges[e * 2 + 1]] = 1; }
    if (!hot.some((h, i) => h && body.free[i])) break;
    for (let r = 0, rings = Math.min(8, 1 + Math.floor(it / 3)); r < rings; r++) { const add = []; for (let i = 0; i < body.n; i++) if (hot[i]) for (const q of body.nb[i]) add.push(q); for (const q of add) hot[q] = 1; }
    for (let i = 0; i < body.n; i++) if (hot[i] && body.free[i]) region[i] = 1;
    for (let s = 0; s < 3; s++) body.w = body.w.map((m, i) => {
      if (!region[i]) return m;
      const out = new Map(); for (const [j, x] of m) out.set(j, x * 0.5);
      for (const q of body.nb[i]) for (const [j, x] of body.w[q]) out.set(j, (out.get(j) || 0) + (0.5 * x) / body.nb[i].size);
      body.changed[i] = 1; return top4(out);
    });
  }
  const g2 = growth();

  // 3. the fit: weights over the bones a vertex or its neighbours use, steps of about LR (Adam), at most 4 bones each
  {
    const LR = 0.004, LAM = 0.05, free = [...body.free.keys()].filter((i) => body.free[i]), slot = new Int32Array(body.n).fill(-1);
    free.forEach((i, s) => { slot[i] = s; });
    const cand = free.map((i) => { const c = new Set(body.w[i].keys()); for (const q of body.nb[i]) for (const j of body.w[q].keys()) c.add(j); return [...c]; });
    const Q = free.map((i, s) => { const r = new THREE.Vector3().fromArray(body.raw, i * 3), v = new THREE.Vector3(), q = new Float32Array(cand[s].length * F * 3);
      cand[s].forEach((j, c) => { for (let f = 0; f < F; f++) v.copy(r).applyMatrix4(M[f][j]).toArray(q, (c * F + f) * 3); }); return q; });
    const W = free.map((i, s) => Float64Array.from(cand[s], (j) => body.w[i].get(j) || 0)), Ws = W.map((x) => x.slice());
    const m1 = W.map((x) => new Float64Array(x.length)), m2 = W.map((x) => new Float64Array(x.length)), G = W.map((x) => new Float64Array(x.length));
    const P = new Float32Array(body.n * F * 3); for (let f = 0; f < F; f++) { const p = posed(f); for (let i = 0; i < body.n; i++) P.set(p.subarray(i * 3, i * 3 + 3), (i * F + f) * 3); }
    const edges = []; for (let e = 0; e < body.edges.length; e += 2) if (slot[body.edges[e]] >= 0 || slot[body.edges[e + 1]] >= 0) edges.push(body.edges[e], body.edges[e + 1]);
    for (let it = 0; it < 300; it++) {
      free.forEach((i, s) => { const q = Q[s], w = W[s]; for (let f = 0; f < F; f++) { let x = 0, y = 0, z = 0; for (let c = 0; c < w.length; c++) { const o = (c * F + f) * 3; x += w[c] * q[o]; y += w[c] * q[o + 1]; z += w[c] * q[o + 2]; } P[(i * F + f) * 3] = x; P[(i * F + f) * 3 + 1] = y; P[(i * F + f) * 3 + 2] = z; } });
      for (const x of G) x.fill(0);
      let loss = 0;
      for (let e = 0; e < edges.length; e += 2) {
        const a = edges[e], c = edges[e + 1], oa = a * F * 3, oc = c * F * 3, d0 = [P[oa] - P[oc], P[oa + 1] - P[oc + 1], P[oa + 2] - P[oc + 2]], l0 = Math.hypot(...d0) || 1e-9;
        for (let f = 1; f < F; f++) {
          const dx = P[oa + f * 3] - P[oc + f * 3], dy = P[oa + f * 3 + 1] - P[oc + f * 3 + 1], dz = P[oa + f * 3 + 2] - P[oc + f * 3 + 2], l = Math.hypot(dx, dy, dz) || 1e-9, h = l - l0 - FIT_AT;
          if (h <= 0) continue;
          loss += h * h;
          // d(growth)/d(weight k of vertex v) = +-(u_f . q_vk(f) - u_0 . q_vk(0)), u the edge's unit vector, q_vk where bone k carries v
          for (const [v, sg] of [[a, 1], [c, -1]]) {
            const s = slot[v]; if (s < 0) continue;
            const q = Q[s], gv = G[s];
            for (let k = 0; k < gv.length; k++) { const of = (k * F + f) * 3, o0 = k * F * 3; gv[k] += 2 * h * sg * ((dx * q[of] + dy * q[of + 1] + dz * q[of + 2]) / l - (d0[0] * q[o0] + d0[1] * q[o0 + 1] + d0[2] * q[o0 + 2]) / l0); }
          }
        }
      }
      if (!loss) break;
      const b1 = 0.9, b2 = 0.999, c1 = 1 - b1 ** (it + 1), c2 = 1 - b2 ** (it + 1);
      W.forEach((w, s) => {
        const gv = G[s]; for (let k = 0; k < w.length; k++) gv[k] += 2 * LAM * (w[k] - Ws[s][k]);
        const mean = gv.reduce((x, y) => x + y, 0) / w.length;   // weights sum to one: only the part along the simplex counts
        for (let k = 0; k < w.length; k++) { const gk = gv[k] - mean; m1[s][k] = b1 * m1[s][k] + (1 - b1) * gk; m2[s][k] = b2 * m2[s][k] + (1 - b2) * gk * gk; w[k] = Math.max(0, w[k] - (LR * m1[s][k]) / c1 / (Math.sqrt(m2[s][k] / c2) + 1e-8)); }
        if (w.length > 4) [...w.keys()].sort((x, y) => w[y] - w[x]).slice(4).forEach((k) => { w[k] = 0; });
        const sum = w.reduce((x, y) => x + y, 0) || 1; for (let k = 0; k < w.length; k++) w[k] /= sum;
      });
    }
    free.forEach((i, s) => { body.w[i] = top4(new Map(cand[s].map((j, k) => [j, W[s][k]]))); body.changed[i] = 1; });
  }
  const g3 = growth();
  console.log('skin: edge growth over the clips: source', report(g0), '| legs reweighted', report(g1), '| relaxed', report(g2), '| fitted', report(g3));

  // write back: every member of a changed group takes the group's weights; the rest keep theirs exactly
  const jo = new Uint16Array(body.nv * 4), wo = new Float32Array(body.nv * 4), buf = doc.getRoot().listBuffers()[0];
  for (let v = 0; v < body.nv; v++) {
    const i = body.g[v];
    if (!body.changed[i]) { jo.set(body.J.getElement(v, []), v * 4); wo.set(body.Wt.getElement(v, []), v * 4); continue; }
    [...body.w[i]].forEach(([j, x], k) => { jo[v * 4 + k] = j; wo[v * 4 + k] = x; });
  }
  body.prim.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(jo).setBuffer(buf));
  body.prim.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(wo).setBuffer(buf));
}

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
