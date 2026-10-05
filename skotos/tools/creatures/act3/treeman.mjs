// The Rootwarden: "Treeman" by DJMaesen (sketchfab.com/bumstrum), CC-BY 4.0 -> src/assets/creatures/treeman.glb
// A stationary tree-man turret. The source has a clean 45-bone biped rig (arms, hands and fingers separately weighted)
// and one short idle; every contract clip is made here as rotations of its deform bones about body axes:
// idle (a slow, creaking sway), walk/run (copies of the idle: it never walks), attack ('lash': both arms sweep round at
// ground level), attack2 ('spikes': arms raised, then driven down into the ground), cast ('weep': head bowed, arms
// spread, shoulders shaking), rise ('uproot': from a hunched, dormant crouch to upright), dormant (that crouch, held),
// hit and die (sags, then topples like a felled trunk).
// Feet stay planted in every clip but the fall (hips moved to cancel their drift, then a two-bone leg IK pass).
// The olive bark is re-graded to dark brown and its yellow crack streaks become amber that glows (an emissive mask, its
// strength varied over the body in 3D and brightest over the heart); the smooth face gets two amber eye slits with amber
// tears; the leaf cards of its crown turn autumn gold. Source: sketchfab.com/3d-models/treeman-e3a094316a8c4820a94d271afffe497c
// usage: node treeman.mjs [source.glb] [out.glb] [--raw keeps the source clip] [--dbg=<path> also writes an uncompressed copy]
import { KHRMaterialsSpecular } from '@gltf-transform/extensions';
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds,
  X, Y, Z, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/treeman/model.glb', OUT = new URL('../../../src/assets/creatures/treeman.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const DBG = process.argv.find((a) => a.startsWith('--dbg='))?.slice(6);   // also writes an uncompressed copy (for Blender)
const HEIGHT = 3.4;   // to the top of the leaf crown
const FPS = 30;
const doc = await load(SRC);
const R = doc.getRoot();
dropLoose(doc);

// ---------- bones: plain names (the game's hit flinch looks for 'chest') ----------
const RENAME = { hip_01: 'hips', L_leg_02: 'thighL', L_knee_00: 'shinL', L_foot_03: 'footL', R_leg_04: 'thighR', R_knee_05: 'shinR', R_foot_06: 'footR',
  spine_07: 'spine', chest_08: 'chest', neck_041: 'neck', head_042: 'head', tip_043: 'headTip',
  L_shoulder_09: 'clavL', L_arm_010: 'armL', L_elbow_011: 'foreL', L_wrist_012: 'handL', R_shoulder_025: 'clavR', R_arm_026: 'armR', R_elbow_027: 'foreR', R_wrist_028: 'handR' };
for (const n of R.listNodes()) {
  const nm = n.getName();
  if (RENAME[nm]) n.setName(RENAME[nm]);
  else { const m = nm.match(/^([LR])_(pink|point|thumb)(\d)_\d+$/); if (m) n.setName({ pink: 'pinky', point: 'index', thumb: 'thumb' }[m[2]] + m[3] + m[1]); }
}
const SRCA = R.listAnimations()[0];
normalise(doc, { height: HEIGHT });
const FING = (s) => ['pinky', 'index', 'thumb'].flatMap((f) => [1, 2, 3].map((i) => f + i + s));

// ---------- helpers ----------
const W0 = worlds(doc, locals(doc, null, 0));
const wpos = (W, name) => new THREE.Vector3().setFromMatrixPosition(W.get(byName(doc, name)));
// a clip whose feet stay where the base pose puts them: the hips are moved to cancel the feet's drift (both feet, averaged),
// weighted by plant(t) (1 = fully planted). ground: also lifts the body wherever it would sink below y = 0.
// slide(t, dur) -> Vector3: a character-space move of the whole body (feet too) added after the planting.
function planted(name, o) {
  const n = Math.max(2, Math.round(o.dur * FPS) + 1);
  const tmp = makeClip(doc, '_tmp_' + name, { ...o, rootNode: 'hips' });
  const fix = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(o.dur, i / FPS);
    const W = worlds(doc, locals(doc, tmp, t));
    const Wb = worlds(doc, o.base ? locals(doc, o.base, o.baseAt ? o.baseAt(t) : Math.min(t, duration(o.base))) : locals(doc, null, 0));
    const d = new THREE.Vector3();
    for (const f of ['footL', 'footR']) d.add(wpos(Wb, f).sub(wpos(W, f)).multiplyScalar(0.5));
    d.multiplyScalar(o.plant ? o.plant(t, o.dur) : 1);
    fix.push(d);
  }
  dropClip(tmp);
  const at = (arr, t) => { const f = Math.min(n - 1, t * FPS), i = Math.floor(f), j = Math.min(n - 1, i + 1); return arr[i].clone().lerp(arr[j], f - i); };
  const rootFn = (extra) => (t, d) => { const r = o.root ? o.root(t, d) : {}; const p = at(fix, t).add(new THREE.Vector3(...(r.p || [0, 0, 0]))); if (extra) p.add(at(extra, t)); if (o.slide) p.add(o.slide(t, d)); return { p: p.toArray(), r: r.r }; };
  if (!o.ground) return makeClip(doc, name, { ...o, rootNode: 'hips', root: rootFn(null) });
  const tmp2 = makeClip(doc, '_tmp2_' + name, { ...o, rootNode: 'hips', root: rootFn(null) });
  const lift = [];
  for (let i = 0; i < n; i++) lift.push(Math.max(0, -bounds(doc, tmp2, Math.min(o.dur, i / FPS), 4).min.y - (o.sink ?? 0)));
  dropClip(tmp2);
  // a running max over a few frames, so the lift never pops
  const sm = lift.map((_, i) => { let m = 0; for (let j = -3; j <= 3; j++) m = Math.max(m, lift[Math.max(0, Math.min(n - 1, i + j))]); return new THREE.Vector3(0, m, 0); });
  return makeClip(doc, name, { ...o, rootNode: 'hips', root: rootFn(sm) });
}
// two-bone leg IK as a pass over a finished clip: every key, each foot is put back exactly where the reference pose has it
// (ref(t) -> locals), keeping the knee in its bending plane and the foot's own orientation. planted() only fixes the feet's
// average, so twists and a wide stance would otherwise make them skate. until: stop fixing (and fade out) after this time.
function legIK(anim, ref, until = Infinity) {
  const ch = new Map(anim.listChannels().filter((c) => c.getTargetPath() === 'rotation').map((c) => [c.getTargetNode().getName(), c]));
  const times = ch.get('thighL').getSampler().getInput().getArray();
  const wq = (W, n) => { const q = new THREE.Quaternion(); W.get(byName(doc, n)).decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
  const parentOf = new Map(); for (const n of R.listNodes()) for (const c of n.listChildren()) parentOf.set(c, n);
  for (let i = 0; i < times.length; i++) {
    const t = times[i], k = t <= until ? 1 : 1 - ramp(t, until, until + 0.25); if (k <= 0) continue;
    for (const s of ['L', 'R']) {
      const L = locals(doc, anim, t), W = worlds(doc, L), target = wpos(worlds(doc, ref(t)), 'foot' + s);
      const A = wpos(W, 'thigh' + s), B = wpos(W, 'shin' + s), C = wpos(W, 'foot' + s);
      const T = C.clone().lerp(target, k);
      const a = B.distanceTo(A), b = C.distanceTo(B), d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, T.distanceTo(A)));
      // knee: change the angle between thigh and shin so the ankle is d from the hip joint
      let n = B.clone().sub(A).cross(C.clone().sub(B)); if (n.lengthSq() < 1e-10) n = new THREE.Vector3(1, 0, 0); n.normalize();
      const cur = Math.acos(Math.min(1, Math.max(-1, A.clone().sub(B).normalize().dot(C.clone().sub(B).normalize()))));
      const want = Math.acos(Math.min(1, Math.max(-1, (a * a + b * b - d * d) / (2 * a * b))));
      const Rk = new THREE.Quaternion().setFromAxisAngle(n, cur - want);
      // thigh: swing the whole leg so hip -> ankle points at the target
      const C2 = C.clone().sub(B).applyQuaternion(Rk).add(B);
      const Rt = new THREE.Quaternion().setFromUnitVectors(C2.clone().sub(A).normalize(), T.clone().sub(A).normalize());
      const footW = wq(W, 'foot' + s);
      const setLocal = (name, Rw) => {   // a world-space rotation applied to a bone, written as its new local rotation
        const nd = byName(doc, name), pq = wq(W, parentOf.get(nd).getName());
        const q = pq.clone().invert().multiply(Rw).multiply(pq).multiply(L.get(nd).q).normalize();
        L.get(nd).q.copy(q); return q;
      };
      const thighQ = setLocal('thigh' + s, Rt);
      // the shin's world turn is Rt * Rk, but it sits under the (already turned) thigh: in its parent's new frame that is Rk
      const thighW = wq(W, 'thigh' + s).premultiply(Rt);
      const shinQ = thighW.clone().invert().multiply(Rt).multiply(Rk).multiply(wq(W, 'shin' + s)).normalize();
      const footQ = thighW.clone().multiply(shinQ).invert().multiply(footW).normalize();
      for (const [nm, q] of [['thigh' + s, thighQ], ['shin' + s, shinQ], ['foot' + s, footQ]]) {
        const out = ch.get(nm).getSampler().getOutput(), arr = out.getArray().slice();
        const prev = i > 0 ? new THREE.Quaternion().fromArray(arr, (i - 1) * 4) : null; if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
        q.toArray(arr, i * 4); out.setArray(arr);
      }
    }
  }
  return anim;
}
// a creak: a slow motion that sticks and slips, like a loaded trunk (0..1 in, 0..1 out, monotonic)
const creak = (x, steps = 4) => { x = Math.min(1, Math.max(0, x)); const f = x * steps, i = Math.floor(f), u = f - i; return (i + smooth(Math.min(1, u * 1.6))) / steps; };

// ---------- idle: a slow, creaking sway ----------
const IDLE_T = 6;
const swayKeys = (t, d) => {
  const p = (t / d) * Math.PI * 2;
  const s = Math.sin(p), c = Math.cos(p), s2 = Math.sin(2 * p);
  // a little stick-slip in the trunk: a faint shudder when the sway turns
  const jit = 0.8 * Math.sin(p * 9) * Math.pow(Math.abs(c), 6);
  return {
    hips: [[Z, 1.5 * s]], spine: [[Z, 2.2 * s + jit], [X, 1.2 * s2]], chest: [[Z, 1.8 * Math.sin(p - 0.5)], [Y, 3 * Math.sin(p - 0.3)], [X, 1.5 + 1.2 * c]],
    neck: [[X, 2 * Math.sin(p + 1)]], head: [[Z, -2 * Math.sin(p - 0.8)], [Y, 4 * Math.sin(p + 0.4)], [X, 2 * s2]],
    clavL: [[Z, 1.5 * c]], clavR: [[Z, -1.5 * c]],
    armL: [[X, -3 * Math.sin(p - 1)], [Z, 2 * Math.sin(p - 1.2)]], armR: [[X, 3 * Math.sin(p - 1.4)], [Z, 2 * Math.sin(p - 1.2)]],
    foreL: [[X, -3 + 2 * Math.sin(p - 1.6)]], foreR: [[X, -3 + 2 * Math.sin(p - 2)]],
    handL: [[X, 3 * Math.sin(p - 2)]], handR: [[X, 3 * Math.sin(p - 2.4)]]
  };
};
const idle = planted('idle', { dur: IDLE_T, loop: true, keys: swayKeys });
const idleAt = (t) => t % IDLE_T;
const onIdle = (o) => ({ base: idle, baseAt: o.baseAt ?? (() => 0), ...o });
const IDLE0 = locals(doc, idle, 0), idle0 = () => IDLE0;
copyClip(doc, idle, 'walk', { loop: true });
copyClip(doc, idle, 'run', { loop: true });

// ---------- hit ----------
const hit = planted('hit', onIdle({ dur: 0.6, keys: (t, d) => {
  const k = bump(t, 0, d) * (1 - 0.3 * t / d), w = Math.sin(t * 30) * (1 - t / d);
  return { spine: [[X, -5 * k]], chest: [[X, -7 * k], [Z, 3 * w]], neck: [[X, -6 * k]], head: [[X, -10 * k], [Y, 4 * w]],
    armL: [[Z, 10 * k], [X, 6 * k]], armR: [[Z, -10 * k], [X, 6 * k]], foreL: [[X, -12 * k]], foreR: [[X, -12 * k]] };
} }));

// keys from several layers, concatenated per bone
const merge = (...ks) => { const o = {}; for (const k of ks) for (const [b, r] of Object.entries(k)) (o[b] ||= []).push(...r); return o; };
// knees bend (the hips are lowered by planted(), which keeps the feet where they were)
const crouch = (k) => ({ thighL: [[X, -38 * k]], thighR: [[X, -38 * k]], shinL: [[X, 70 * k]], shinR: [[X, 70 * k]], footL: [[X, -32 * k]], footR: [[X, -32 * k]] });
// knees pushed outwards (a wide, low stance), the feet staying where they are
const spread = (k) => ({ thighL: [[Z, 18 * k]], thighR: [[Z, -18 * k]], shinL: [[Z, -SPR * k]], shinR: [[Z, SPR * k]], footL: [[Z, (SPR - 18) * k]], footR: [[Z, (18 - SPR) * k]] });
const SPR = 13;   // tuned so the feet do not slide in or out
// fingers curl (k > 0) or splay straight (k < 0)
const curl = (s, k) => Object.fromEntries(FING(s).map((f) => [f, [[X, (f.startsWith('thumb') ? 10 : 22) * k]]]));
// twist of the upper body about the vertical, spread over hips (legs counter-turned), spine and chest
const twist = (deg) => ({ hips: [[Y, 0.2 * deg]], thighL: [[Y, -0.2 * deg]], thighR: [[Y, -0.2 * deg]], spine: [[Y, 0.4 * deg]], chest: [[Y, 0.4 * deg]] });

// ---------- attack: 'lash' - it winds round to its right, folds down and sweeps both arms round low across the ground ----------
const LASH = { dur: 2.2 };
const lash = planted('attack', onIdle({ dur: LASH.dur, keys: (t) => {
  const wind = ramp(t, 0.05, 0.66), sweep = ramp(t, 0.68, 1.3), back = ramp(t, 1.45, 2.15);
  const yaw = (-62 * wind + 140 * sweep) * (1 - back);
  const low = env(t, 0.5, 0.86, 1.32, 1.95);                     // folded down for the sweep
  const cr = 0.35 * env(t, 0.05, 0.6, 1.5, 2.1) + 0.75 * low;   // knees
  const lift = env(t, 0.05, 0.6, 0.7, 0.95);                     // arms cocked out to the right before the sweep
  const drag = bump(t, 0.7, 1.35);                               // the arms trail the turn
  return merge(crouch(cr), spread(0.8 * low), twist(yaw), {
    hips: [[X, 22 * low]], thighL: [[X, -22 * low]], thighR: [[X, -22 * low]],   // folds at the hip joints too
    spine: [[X, 6 * lift + 30 * low]], chest: [[X, -4 * lift + 30 * low]], neck: [[X, -10 * low]], head: [[X, -12 * low], [Y, -0.15 * yaw]],
    clavL: [[Z, 8 * lift]], clavR: [[Z, -12 * lift]],
    // both arms swung up and back to the right on the wind-up (the left one across the chest), then hanging down and
    // outwards, reaching for the ground, for the sweep
    armL: [[Z, -25 * lift + 42 * low], [X, -70 * lift - 92 * low], [Y, 20 * drag]],
    armR: [[Z, -75 * lift - 42 * low], [X, 10 * lift - 92 * low], [Y, 20 * drag]],
    foreL: [[X, 20 * low - 25 * lift]], foreR: [[X, 20 * low - 10 * lift]],
    handL: [[X, 10 * low]], handR: [[X, 10 * low]]
  }, curl('L', -0.5 * low), curl('R', -0.5 * low));
} }));

// ---------- attack2: 'spikes' - arms raised high, then driven down into the ground in front ----------
const SPK = { dur: 2.5, strike: 1.18 };
const spikes = planted('attack2', onIdle({ dur: SPK.dur, keys: (t) => {
  const up = creak(ramp(t, 0.05, 0.9), 3) * (1 - ramp(t, 0.95, 1.18));   // the slow, heavy raise
  const down = ramp(t, 0.95, 1.18) * (1 - ramp(t, 1.75, 2.45));          // the plunge, held, then pulled out
  const quiver = Math.sin(t * 45) * env(t, 0.7, 0.85, 0.95, 1.0) + Math.sin(t * 60) * env(t, 1.18, 1.22, 1.5, 1.75) * 0.6;
  const pull = bump(t, 1.6, 2.1);                                        // a heave as it tears the hands out
  return merge(crouch(0.15 * up + 1.4 * down), spread(down), {
    hips: [[X, 25 * down]], thighL: [[X, -25 * down]], thighR: [[X, -25 * down]],
    spine: [[X, -6 * up + 32 * down - 6 * pull]], chest: [[X, -10 * up + 36 * down + quiver]], neck: [[X, -8 * up + 2 * down]], head: [[X, -14 * up - 18 * down]],
    clavL: [[Z, 18 * up + 4 * down]], clavR: [[Z, -18 * up - 4 * down]],
    armL: [[X, -150 * up - 114 * down], [Z, 28 * up + 6 * down]], armR: [[X, -150 * up - 114 * down], [Z, -28 * up - 6 * down]],
    foreL: [[X, -20 * up + 22 * down]], foreR: [[X, -20 * up + 22 * down]],
    handL: [[X, -15 * up + 30 * down]], handR: [[X, -15 * up + 30 * down]]
  }, curl('L', -0.6 * up - 0.4 * down), curl('R', -0.6 * up - 0.4 * down));
} }));

// ---------- cast: 'weep' - head bowed, arms spread, shoulders shaking with sobs ----------
const WEEP = { dur: 2.9, drip: 1.3 };
const weep = planted('cast', onIdle({ dur: WEEP.dur, keys: (t) => {
  const k = env(t, 0.0, 0.6, 2.25, 2.9);
  // sobs: sharp catches of the shoulders, three to a breath, and a tremor through the chest
  const sob = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 2.6)), 4) * env(t, 0.45, 0.65, 2.1, 2.3);
  const shake = Math.sin(t * 2 * Math.PI * 9) * env(t, 0.45, 0.65, 2.1, 2.3);
  return merge(crouch(0.18 * k), {
    spine: [[X, 8 * k]], chest: [[X, 12 * k - 4 * sob + 0.8 * shake], [Z, 0.6 * shake]], neck: [[X, 24 * k + 3 * sob]], head: [[X, 34 * k + 4 * sob], [Z, 1.2 * shake]],
    clavL: [[Z, -6 * k + 9 * sob + 1.5 * shake]], clavR: [[Z, 6 * k - 9 * sob - 1.5 * shake]],
    armL: [[Z, 48 * k + 3 * sob], [X, -30 * k]], armR: [[Z, -48 * k - 3 * sob], [X, -30 * k]],
    foreL: [[X, -22 * k], [Z, 12 * k]], foreR: [[X, -22 * k], [Z, -12 * k]], handL: [[Z, 15 * k], [X, -10 * k]], handR: [[Z, -15 * k], [X, -10 * k]]
  }, curl('L', -0.5 * k), curl('R', -0.5 * k));
} }));

// ---------- rise: 'uproot' - from the hunched, dormant crouch to upright, in creaking jerks; dormant holds the crouch ----------
const dormantKeys = (k, br = 0) => merge(crouch(0.95 * k), {
  hips: [[X, 10 * k]], spine: [[X, 24 * k + br]], chest: [[X, 22 * k + br]], neck: [[X, 14 * k]], head: [[X, 28 * k - br]],
  clavL: [[Z, -10 * k]], clavR: [[Z, 10 * k]],
  armL: [[X, -32 * k], [Z, -14 * k]], armR: [[X, -30 * k], [Z, 14 * k]], foreL: [[X, -30 * k]], foreR: [[X, -34 * k]], handL: [[X, 20 * k]], handR: [[X, 20 * k]]
}, curl('L', 0.8 * k), curl('R', 0.8 * k));
legIK(planted('dormant', onIdle({ dur: 4, loop: true, keys: (t, d) => dormantKeys(1, 0.8 * Math.sin((t / d) * Math.PI * 2)) })), idle0);
const RISE = { dur: 2.7 };
const rise = planted('rise', onIdle({ dur: RISE.dur, keys: (t) => {
  const k = 1 - creak(ramp(t, 0.3, 1.85), 4);
  const shud = Math.sin(t * 50) * env(t, 0.0, 0.08, 0.3, 0.45);          // shakes the soil off
  const stretch = env(t, 1.45, 1.85, 2.05, 2.6);                         // a heave up and out, then it settles
  return merge(dormantKeys(k), {
    spine: [[X, -6 * stretch + shud]], chest: [[X, -9 * stretch], [Z, shud]], neck: [[X, -6 * stretch]], head: [[X, -12 * stretch]],
    clavL: [[Z, 10 * stretch]], clavR: [[Z, -10 * stretch]],
    armL: [[Z, 38 * stretch], [X, -15 * stretch]], armR: [[Z, -38 * stretch], [X, -15 * stretch]], foreL: [[X, -15 * stretch]], foreR: [[X, -15 * stretch]]
  }, curl('L', -0.5 * stretch), curl('R', -0.5 * stretch));
} }));

// ---------- die: it sags at the knees, then topples forward like a felled trunk and settles ----------
// Pivoting at its planted feet it would lie ~3 m out along +Z, far from the actor (its collider, the dissolve, any
// corpse effect). So the whole body is slid back as it falls, growing with the drop of the trunk (1 - cos of the topple
// angle): the feet hold while it starts to lean, then kick back as it crashes down, and the fallen body ends centred
// on the actor's spot.
const DIE = { dur: 2.7, sag: 0.7, fall: 1.35 };
// a felled tree: slow to start, accelerating, a small bounce when it hits
const topple = (t) => { const u = Math.max(0, Math.min(1, (t - DIE.sag + 0.1) / DIE.fall)); return 86 * Math.pow(u, 2.2) - 5 * bump(t, DIE.sag - 0.1 + DIE.fall, DIE.sag + DIE.fall + 0.35); };
const dieO = (slide) => onIdle({ dur: DIE.dur, ground: true, sink: 0.04, keys: (t) => {
  const sag = ramp(t, 0.0, DIE.sag), f = ramp(t, DIE.sag - 0.1, DIE.sag + DIE.fall), limp = ramp(t, 0.5, 1.6);
  return merge(crouch(0.55 * sag * (1 - f)), {
    thighL: [[X, -14 * f]], thighR: [[X, -10 * f]],
    spine: [[X, 14 * sag - 12 * f]], chest: [[X, 16 * sag - 12 * f]], neck: [[X, 22 * sag - 26 * f]], head: [[X, 20 * sag - 30 * f], [Y, 18 * f]],
    clavL: [[Z, -8 * sag + 16 * f]], clavR: [[Z, 8 * sag - 16 * f]],
    // the arms go limp, are flung out to the sides as it lands and lie splayed
    armL: [[X, -20 * sag - 25 * f], [Z, 10 * limp + 70 * f]], armR: [[X, -15 * sag - 40 * f], [Z, -10 * limp - 62 * f]],
    foreL: [[X, -25 * sag + 10 * f]], foreR: [[X, -20 * sag - 15 * f]]
  }, curl('L', 0.5 * limp), curl('R', 0.5 * limp));
}, root: (t) => { const th = topple(t); return { r: [[X, th], [Z, -0.12 * th], [Y, 0.1 * th]] }; },
slide: (t) => new THREE.Vector3(-slide.x, 0, -slide.z).multiplyScalar((1 - Math.cos((topple(t) * Math.PI) / 180)) / (1 - Math.cos((86 * Math.PI) / 180))) });
// where it would lie with its feet kept put: the middle of its bounds at the end
const dieTrial = planted('_dieTrial', dieO(new THREE.Vector3()));
const lying = bounds(doc, dieTrial, DIE.dur, 2).getCenter(new THREE.Vector3());
dropClip(dieTrial);
legIK(planted('die', dieO(lying)), idle0, DIE.sag - 0.15);
console.log('die: fallen body centred by moving it', lying.x.toFixed(2), lying.z.toFixed(2), '(x, z m)');
// the feet stay exactly where they stood in every clip but the fall
for (const c of [hit, lash, spikes, weep, rise]) legIK(c, idle0);

if (!RAW) dropClip(SRCA);
// ---------- materials ----------
// the source is specular-glossiness: plain metal/rough here (rough bark, glassy amber in the cracks)
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi); const L = (a, b, t) => a + (b - a) * t; return L(L(hash(xi, yi), hash(xi + 1, yi), u), L(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
const toPNG = (buf, w, h, ch) => sharp(buf, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
const BARK = [[0, [11, 8, 5]], [0.2, [29, 21, 14]], [0.45, [52, 39, 28]], [0.7, [78, 61, 45]], [1, [108, 88, 68]]];
const grad = (G, l) => { for (let i = 1; i < G.length; i++) if (l <= G[i][0]) { const [a, ca] = G[i - 1], [b, cb] = G[i], t = (l - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * t); } return G[G.length - 1][1]; };
const LEAF = [[0, [226, 172, 52]], [0.35, [234, 150, 38]], [0.6, [206, 106, 28]], [1, [140, 52, 18]]];
const AMBER_DULL = [62, 28, 7], AMBER_GOLD = [196, 100, 22], EMISSIVE = 0.95;
// rest-pose surface positions (character space, metres) of a skinned primitive's vertices
const W0r = worlds(doc, locals(doc, null, 0));
function restVerts(node, prim) {
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), skin = node.getSkin();
  const ibm = skin.getInverseBindMatrices().getArray(), js = skin.listJoints(), out = new Float32Array(P.getCount() * 3);
  const e = [], je = [], we = [], v = new THREE.Vector3(), acc = new THREE.Vector3(), m = new THREE.Matrix4(), ib = new THREE.Matrix4();
  for (let i = 0; i < P.getCount(); i++) {
    P.getElement(i, e); J.getElement(i, je); Wt.getElement(i, we); acc.set(0, 0, 0);
    for (let k = 0; k < 4; k++) { if (!we[k]) continue; ib.fromArray(ibm, je[k] * 16); m.multiplyMatrices(W0r.get(js[je[k]]), ib); acc.add(v.fromArray(e).applyMatrix4(m).multiplyScalar(we[k])); }
    acc.toArray(out, i * 3);
  }
  return out;
}
// every texel a primitive's triangles cover, with the surface point it shows
function rasterise(prim, pos, Wd, Hd, paint) {
  const uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray(), a = [], b = [], c = [];
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
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      paint(x, y, [0, 1, 2].map((k) => l1 * pos[I[0] * 3 + k] + l2 * pos[I[1] * 3 + k] + l3 * pos[I[2] * 3 + k]));
    }
  }
}
// grows covered texels into uncovered ones (n rings)
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
const hash3 = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function vnoise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), L(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    L(L(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), L(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm3 = (x, y, z) => (vnoise3(x, y, z) * 0.6 + vnoise3(x * 2.1 + 5, y * 2.1, z * 2.1) * 0.3 + vnoise3(x * 4.3, y * 4.3 + 7, z * 4.3) * 0.1);
// how strongly the cracks glow at a surface point: patches and seams, the heart brightest, the feet (in the soil) dim
const HEART = wpos(W0, 'chest').add(new THREE.Vector3(0, 0.05, 0.22));
// the face is smooth bark with no features: two narrow, drooping slits of amber light for eyes, and amber tears run
// from them down the cheeks (the Weeping Woods)
const HEAD = wpos(W0, 'head'), EYE_Y = 2.648, EYE_X = 0.048;
function tearAt(x, y, z) {
  if (z < HEAD.z + 0.06 || y < 2.38 || y > 2.8 || Math.abs(x) > 0.16) return 0;
  const s = Math.sign(x) || 1, u = Math.abs(x) - EYE_X, dy = y - EYE_Y;
  // eye: a slit whose outer corner droops
  const d = dy + 0.28 * u, eye = 1 - ss(0.75, 1.15, Math.hypot(u / 0.029, d / 0.0105));
  // tear: from under the eye's inner half, wavering down the cheek, thinning and breaking up
  const down = -dy - 0.008;
  if (down < 0 || down > 0.23) return Math.max(0, eye);
  const cx = -0.006 + 0.004 * Math.sin(down * 48 + s * 1.7), wdt = 0.0065 * (1 - 0.55 * down / 0.23);
  const brk = ss(0.28, 0.42, vnoise3(s * 7.3, down * 22, 1.1));
  const tr = (1 - ss(wdt * 0.6, wdt * 1.25, Math.abs(u - cx))) * brk * (1 - ss(0.17, 0.23, down));
  return Math.max(eye, 0.85 * tr);
}
function glowAt(x, y, z) {
  const n = fbm3(x * 2.4 + 3.1, y * 1.6, z * 2.4);
  let w = 0.15 + 0.95 * ss(0.36, 0.62, n) + 0.25 * ss(1.8, 2.3, y);   // more on the shoulders and back, seen from above
  const h = Math.hypot(x - HEART.x, (y - HEART.y) * 0.8, (z - HEART.z) * 0.7);
  w += 0.9 * Math.exp(-(h * h) / (0.32 * 0.32));
  w *= 0.35 + 0.65 * ss(0.1, 0.7, y);
  return Math.min(1, w);
}
// dry bark has almost no sheen: a plain PBR dielectric would wear a grey film at grazing angles (most of a lanky body
// seen from the game's high camera)
const SPEC = doc.createExtension(KHRMaterialsSpecular), BARK_SPEC = 0.25;
for (const mat of R.listMaterials()) {
  const sg = mat.getExtension('KHR_materials_pbrSpecularGlossiness');
  mat.setExtension('KHR_materials_specular', SPEC.createSpecular().setSpecularFactor(BARK_SPEC));
  const tex = sg.getDiffuseTexture(), nrm = mat.getNormalTexture();
  mat.setExtension('KHR_materials_pbrSpecularGlossiness', null);
  sg.getSpecularGlossinessTexture()?.dispose();
  mat.setBaseColorTexture(tex).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0);
  const img = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: Wd, height: Hd } = img.info, src = img.data;
  if (mat.getName() === 'branch1') {
    // the crown: leaf cards turn autumn gold, amber and rust (a patchy noise across the atlas), twigs grey-brown bark
    const out = Buffer.alloc(Wd * Hd * 4), em = Buffer.alloc(Wd * Hd * 3);
    for (let i = 0, y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++, i++) {
      const r = src[i * 4] / 255, g = src[i * 4 + 1] / 255, b = src[i * 4 + 2] / 255, a = src[i * 4 + 3];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / Math.max(1e-3, mx), l = 0.3 * r + 0.55 * g + 0.15 * b;
      const leaf = ss(0.3, 0.5, sat) * ss(0.06, 0.14, mx);
      const bark = grad(BARK, Math.min(1, l * 2.2));
      const n = vnoise(x / 70, y / 70) * 0.7 + vnoise(x / 23 + 9, y / 23) * 0.3;
      const tone = grad(LEAF, n);
      const shade = 0.35 + 1.5 * l;
      const lc = tone.map((c) => c * shade);
      const c = bark.map((v, k) => Math.min(255, v + (lc[k] - v) * leaf));
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = a;
      em[i * 3] = c[0] * leaf; em[i * 3 + 1] = c[1] * leaf; em[i * 3 + 2] = c[2] * leaf;
    }
    tex.setImage(await sharp(out, { raw: { width: Wd, height: Hd, channels: 4 } }).resize(512, 512).png().toBuffer()).setMimeType('image/png');
    const et = doc.createTexture('crown_glow').setImage(await sharp(em, { raw: { width: Wd, height: Hd, channels: 3 } }).resize(256, 256).png().toBuffer()).setMimeType('image/png');
    mat.setEmissiveTexture(et).setEmissiveFactor([0.12, 0.12, 0.12]);
    mat.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true).setRoughnessFactor(0.75);
    if (nrm) nrm.setImage(await sharp(Buffer.from(nrm.getImage())).resize(256, 256).png().toBuffer()).setMimeType('image/png');
    continue;
  }
  // the body: bark re-graded from luminance; the yellow crack streaks become amber. How brightly a crack glows is set by
  // where it is on the body (a 3D noise over the rest-pose surface, strongest over the heart), so the light gathers in
  // seams and patches instead of an even net
  const node = R.listNodes().find((n) => n.getMesh()?.listPrimitives().some((p) => p.getMaterial() === mat));
  const prim = node.getMesh().listPrimitives().find((p) => p.getMaterial() === mat);
  const N = Wd * Hd, val = new Uint8Array(N), crack = new Float32Array(N);
  for (let i = 0; i < N; i++) val[i] = Math.max(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]);
  const blur = await sharp(Buffer.from(val), { raw: { width: Wd, height: Hd, channels: 1 } }).blur(5).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < N; i++) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2], mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, sat = (mx - mn) / Math.max(1e-3, mx);
    crack[i] = ss(0.55, 0.8, sat) * ss(0.2, 0.38, mx) * ss(0.02, 0.09, mx - blur[i] / 255);
  }
  // the glow weight per texel, from the surface point it shows
  const glow = new Float32Array(N).fill(-1), tear = new Float32Array(N), pos = restVerts(node, prim);
  rasterise(prim, pos, Wd, Hd, (x, y, q) => { const i = y * Wd + x; if (glow[i] < 0) { glow[i] = glowAt(q[0], q[1], q[2]); tear[i] = tearAt(q[0], q[1], q[2]); } });
  const done = Uint8Array.from(glow, (v) => (v >= 0 ? 1 : 0)), gb = Buffer.alloc(N);
  for (let i = 0; i < N; i++) gb[i] = done[i] ? Math.round(Math.min(1, glow[i]) * 255) : 0;
  dilate(gb, done, Wd, Hd, 1, 6);
  const col = Buffer.alloc(N * 3);
  for (let i = 0, y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++, i++) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2], l = (0.3 * r + 0.55 * g + 0.15 * b) / 255, w = gb[i] / 255;
    const n = vnoise(x / 40, y / 40);
    let c = grad(BARK, Math.min(1, l * 2.1)).map((v, k) => v * (0.9 + 0.2 * n) * [1.04, 1, 0.94][k]);
    // resin: dull and dark where it does not glow, gold where it does
    const m = crack[i], am = AMBER_DULL.map((v, k) => v + (AMBER_GOLD[k] - v) * Math.min(1, w * (0.5 + l * 1.6)));
    c = c.map((v, k) => Math.min(255, v + (am[k] - v) * m));
    c = c.map((v, k) => v + (AMBER_GOLD[k] - v) * tear[i]);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  tex.setImage(await toPNG(col, Wd, Hd, 3)).setMimeType('image/png');
  // the glow: the crack mask grown a little and softened, so the thin streaks survive the 512 px map and bleed light
  const mk = Buffer.from(crack.map((v) => Math.round(v * 255)));
  const grown = await sharp(mk, { raw: { width: Wd, height: Hd, channels: 1 } }).dilate(1).extractChannel(0).raw().toBuffer();
  const halo = await sharp(grown, { raw: { width: Wd, height: Hd, channels: 1 } }).blur(3).extractChannel(0).raw().toBuffer();
  // a wider, fainter glow round the seams: from the game's camera the thin cracks blur away, the warmth around them reads
  const wide = await sharp(grown, { raw: { width: Wd, height: Hd, channels: 1 } }).blur(9).extractChannel(0).raw().toBuffer();
  const em = Buffer.alloc(N * 3), mr = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) {
    const w = gb[i] / 255, e = Math.min(1, Math.max(crack[i], 0.6 * grown[i] / 255, 0.55 * halo[i] / 255, Math.min(0.4, 1.3 * wide[i] / 255)) * w, tear[i]);
    // hotter (yellower) where it glows most
    em[i * 3] = 255 * e; em[i * 3 + 1] = (88 + 40 * e) * e; em[i * 3 + 2] = (8 + 12 * e) * e;
    mr[i * 3] = 255; mr[i * 3 + 1] = Math.round(255 * (0.9 - 0.5 * crack[i])); mr[i * 3 + 2] = 0;
  }
  const et = doc.createTexture('amber_glow').setImage(await sharp(em, { raw: { width: Wd, height: Hd, channels: 3 } }).resize(512, 512).png().toBuffer()).setMimeType('image/png');
  const rt = doc.createTexture('bark_rough').setImage(await sharp(mr, { raw: { width: Wd, height: Hd, channels: 3 } }).resize(512, 512).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([EMISSIVE, EMISSIVE, EMISSIVE]).setMetallicRoughnessTexture(rt).setRoughnessFactor(1);
  if (process.env.DUMP) { await sharp(col, { raw: { width: Wd, height: Hd, channels: 3 } }).png().toFile(process.env.DUMP + '/tm_col.png'); await sharp(em, { raw: { width: Wd, height: Hd, channels: 3 } }).png().toFile(process.env.DUMP + '/tm_em.png'); }
}
for (const e of R.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_pbrSpecularGlossiness') e.dispose();
for (const m of R.listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TANGENT', 'TEXCOORD_1', 'TEXCOORD_2']) p.setAttribute(s, null);

// ---------- finish ----------
const nUsed = slimRig(doc);
const b = bounds(doc, null, 0);
// strikes: the lash when the sweep passes the front; the spikes when the hands reach their lowest (in the ground)
const tipY = (clip, t) => { const W = worlds(doc, locals(doc, clip, t)); return Math.min(...['index3L', 'pinky3L', 'index3R', 'pinky3R'].map((n) => wpos(W, n).y)); };
let lowT = SPK.strike, lowY = 9;
for (let t = 0.9; t <= 1.6; t += 1 / 60) { const y = tipY(spikes, t); if (y < lowY - 0.01) { lowY = y; lowT = t; } }
let front = 0; for (let t = 0.7; t < 1.4; t += 1 / 120) if ((-62 * ramp(t, 0.05, 0.66) + 140 * ramp(t, 0.68, 1.3)) < 0) front = t;
const hitT = { attack: +front.toFixed(3), attack2: +lowT.toFixed(3), cast: WEEP.drip };
console.log('lash: hand tips at strike', tipY(lash, hitT.attack).toFixed(2), 'm; spikes: tips reach', lowY.toFixed(2), 'm at', lowT.toFixed(2), 's');
if (DBG) await io.write(DBG, doc);
const bytes = await finish(doc, OUT, {
  hit: hitT, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 1, runSpeed: 2,
  credit: '"Treeman" by DJMaesen (sketchfab.com/bumstrum), CC-BY 4.0 - bark re-graded with glowing amber cracks, autumn crown, all animations made for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('treeman', (bytes / 1024).toFixed(0) + ' KB', 'joints', nUsed, JSON.stringify(hitT), 'size', b.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join('x'));
