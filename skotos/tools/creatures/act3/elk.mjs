// Silverhorn, the White Hart: "Realistic Animated Elk 3D Model" by WildMesh_3D (sketchfab.com/WildMesh_3D), CC-BY 4.0
// -> src/assets/creatures/elk.glb. The source has 53 clips (stand, walk, trot, gallop, jump, lie down...) whose travel
// rides on the rig's root bone: idle, walk, run (its gallop), leap (its standing jump) and die (its stand-to-lying) are
// copied from it in place. The attacks (gore, rear-and-stamp), the rear, the bellow, the pawing charge wind-up and the hit
// are made here as rotations of its 38-bone rig. The coat is lifted to birch-white and silver, amber tears run from the
// eyes, and the antlers (a separate rigid mesh in the source, re-bound here to the head bone) are turned to glowing amber.
// usage: node elk.mjs [source.glb] [out.glb] [--raw keeps the source clips] [--dbg=<path> also writes an uncompressed copy]
import { metalRough } from '@gltf-transform/functions';
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds,
  X, Y, Z, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/elk/model.glb', OUT = new URL('../../../src/assets/creatures/elk.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const HEIGHT = 2.6; // to the antler tips, standing
const doc = await load(SRC);
const R = doc.getRoot();
await doc.transform(metalRough()); // the source is specular-glossiness: recolour the converted base colour maps

// ---------- the antlers: a rigid mesh under the head bone -> a primitive of the skinned head mesh, all weight on the head ----------
{
  const head = byName(doc, 'RigHead_00'), ant = byName(doc, 'Chifre_Chifre_0'), host = byName(doc, 'Object_8');
  const skin = host.getSkin(), hj = skin.listJoints().indexOf(head);
  const W = worlds(doc, locals(doc, null, 0));
  const ibm = new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getArray(), hj * 16);
  // bind-space position: jointWorld * IBM * v_bind must equal the antler's own world position at rest
  const M = W.get(head).clone().multiply(ibm).invert().multiply(W.get(ant)), N = new THREE.Matrix3().getNormalMatrix(M);
  const buf = R.listBuffers()[0];
  for (const p of ant.getMesh().listPrimitives()) {
    const P = p.getAttribute('POSITION'), Nn = p.getAttribute('NORMAL'), n = P.getCount();
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), J = new Uint16Array(n * 4), Wt = new Float32Array(n * 4), v = new THREE.Vector3(), e = [];
    for (let i = 0; i < n; i++) {
      v.fromArray(P.getElement(i, e)).applyMatrix4(M).toArray(pos, i * 3);
      v.fromArray(Nn.getElement(i, e)).applyMatrix3(N).normalize().toArray(nor, i * 3);
      J[i * 4] = hj; Wt[i * 4] = 1;
    }
    const q = doc.createPrimitive().setMaterial(p.getMaterial()).setIndices(p.getIndices())
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf))
      .setAttribute('TEXCOORD_0', p.getAttribute('TEXCOORD_0'))
      .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J).setBuffer(buf))
      .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(Wt).setBuffer(buf));
    host.getMesh().addPrimitive(q);
  }
  ant.setMesh(null);
  if (M.determinant() < 0) console.warn('antler transform mirrors: check the winding');
}
dropLoose(doc);
for (const m of R.listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TANGENT', 'TEXCOORD_1', 'TEXCOORD_2']) p.setAttribute(s, null);

const A = Object.fromEntries(R.listAnimations().map((a) => [a.getName(), a]));
normalise(doc, { height: HEIGHT, anim: A.Stand_Breathing_01, t: 0 });

// ---------- bones ----------
const B = {
  root: 'RigRoot_01', pelvis: 'RigPelvis_02', sp1: 'RigSpine1_011', sp2: 'RigSpine2_012', chest: 'RigChest_013',
  n1: 'RigNeck1_019', n2: 'RigNeck2_020', n3: 'RigNeck3_021', head: 'RigHead_00', jaw: 'RigJaw1_022', earL: 'RigLEar1_026', earR: 'RigREar1_028',
  tail1: 'RigTail1_035', tail2: 'RigTail2_036',
  scL: 'RigLFLegCollarbone_014', f1L: 'RigLFLeg1_015', f2L: 'RigLFLeg2_016', f3L: 'RigLFLeg3_017', f4L: 'RigLFLegAnkle_018',
  scR: 'RigRFLegCollarbone_030', f1R: 'RigRFLeg1_031', f2R: 'RigRFLeg2_032', f3R: 'RigRFLeg3_033', f4R: 'RigRFLegAnkle_034',
  h1L: 'RigLBLeg1_03', h2L: 'RigLBLeg2_04', h3L: 'RigLBLeg3_05', h4L: 'RigLBLegAnkle_06',
  h1R: 'RigRBLeg1_07', h2R: 'RigRBLeg2_08', h3R: 'RigRBLeg3_09', h4R: 'RigRBLegAnkle_010'
};
const pelvisNode = byName(doc, B.pelvis);
const pelvisAt = (anim, t) => new THREE.Vector3().setFromMatrixPosition(worlds(doc, locals(doc, anim, t)).get(pelvisNode));
const idleT = duration(A.Stand_Breathing_01), idleAt = (t) => t % idleT;

// copyClip with root motion: a (time window of a) source clip under the made keys and root offsets
const copy = (src, name, o = {}) => { const t0 = o.from ?? 0, t1 = o.to ?? duration(src), sp = o.speed ?? 1; return makeClip(doc, name, { ...o, dur: (t1 - t0) / sp, base: src, baseAt: (t) => t0 + t * sp }); };
// A source locomotion cycle in place. Its travel rides on the rig's root bone (a pure forward translation): it is measured
// (the clip's speed), then the root's track is dropped; what drift the pelvis has of its own is evened out over the cycle,
// its bob and sway stay.
function dropTravel(src) { for (const ch of src.listChannels()) if (ch.getTargetNode().getName() === B.root && ch.getTargetPath() === 'translation') { const s = ch.getSampler(); ch.dispose(); s.dispose(); } }
function inPlace(src, name, o = {}) {
  const d = duration(src), travel = pelvisAt(src, d).sub(pelvisAt(src, 0)).divideScalar(d);
  dropTravel(src);
  const v = pelvisAt(src, d).sub(pelvisAt(src, 0)).divideScalar(d), speed = o.speed ?? 1;
  copy(src, name, { ...o, loop: true, rootNode: B.pelvis, root: (t) => ({ p: [-v.x * t * speed, 0, -v.z * t * speed] }) });
  return Math.hypot(travel.x, travel.z) * speed;
}
// the leap keeps its height but not its travel: the pelvis is held over its starting spot
function heldOver(src, name, o = {}) {
  dropTravel(src);
  const p0 = pelvisAt(src, 0), speed = o.speed ?? 1;
  return copy(src, name, { ...o, rootNode: B.pelvis, root: (t) => { const p = pelvisAt(src, t * speed); return { p: [p0.x - p.x, 0, p0.z - p.z] }; } });
}
// makeClip with the feet kept on the ground: the lowest vertex of every frame is put back on y = 0 (a second pass)
function grounded(name, o) {
  const first = makeClip(doc, name + '_probe', { ...o, rootNode: B.pelvis }), n = Math.round(o.dur * 30) + 1, lift = [];
  for (let i = 0; i < n; i++) lift.push(-bounds(doc, first, Math.min(o.dur, i / 30), 4).min.y);
  dropClip(first);
  const user = o.root;
  return makeClip(doc, name, { ...o, rootNode: B.pelvis, root: (t, d) => {
    const r = user ? user(t, d) : {}, k = Math.min(n - 1, Math.round(t * 30));
    const p = r.p ? [...r.p] : [0, 0, 0]; p[1] += lift[k];
    return { p, r: r.r };
  } });
}

// ---------- locomotion and the source clips ----------
copyClip(doc, A.Stand_Breathing_01, 'idle', { loop: true });
const walkSpeed = inPlace(A.Walk, 'walk');
const runSpeed = inPlace(A.Run, 'run');
const leap = heldOver(A.JumpStand, 'leap');
// die: it kneels, folds its legs and lays its head down (the source's stand-to-lying, a touch quicker)
// (the head held a little off the ground, the folded legs lifted out of it)
copy(A.Trans_Stand_to_Lying, 'die', { speed: 1.15, rootNode: B.pelvis, keys: (t, d) => { const k = ramp(t, d * 0.6, d); return { [B.n1]: [[X, -10 * k]], [B.n2]: [[X, -6 * k]] }; },
  root: (t, d) => ({ p: [0, 0.09 * ramp(t, d * 0.45, d), 0] }) });

// ---------- made clips (axes in character space: X = its left, Y = up, Z = forward; +X tips a forward bone down) ----------
const base = { base: A.Stand_Breathing_01, baseAt: idleAt };
// gore: the head drops so the tines point forward, a lunge, then a hooking sweep up and across (strike at 0.55 s)
const GORE = 0.55;
grounded('attack', { ...base, dur: 1.25, keys: (t) => {
  const low = env(t, 0, 0.32, 0.62, 1.05), sweep = ramp(t, 0.36, 0.7), hook = bump(t, 0.42, 0.85);
  const yaw = 24 - 48 * sweep; // right to left across the front
  return {
    [B.chest]: [[X, 6 * low]], [B.n1]: [[X, 22 * low - 10 * hook]], [B.n2]: [[X, 10 * low]],
    [B.n3]: [[Y, yaw * 0.4 * low]], [B.head]: [[X, 38 * low - 22 * hook], [Y, yaw * 0.6 * low], [Z, -14 * hook]],
    [B.f1L]: [[X, -10 * low]], [B.f1R]: [[X, -10 * low]], [B.f3L]: [[X, 6 * low]], [B.f3R]: [[X, 6 * low]],
    [B.h1L]: [[X, 8 * low]], [B.h1R]: [[X, 8 * low]],
    [B.earL]: [[Y, -25 * low]], [B.earR]: [[Y, 25 * low]], [B.tail1]: [[X, -25 * low]]
  };
}, root: (t) => ({ p: [0, -0.06 * env(t, 0, 0.32, 0.6, 1.0), -0.12 * bump(t, 0, 0.42) + 0.4 * bump(t, 0.28, 0.85)] }) });

// rearing: the body pivots up about the hips, the hind legs crouch under it, the forelegs fold to the chest
const rearKeys = (k, kick, t) => ({
  [B.sp1]: [[X, -4 * k]], [B.chest]: [[X, -4 * k]], [B.n1]: [[X, 14 * k]], [B.n2]: [[X, 4 * k]], [B.head]: [[X, 8 * k]],
  [B.h1L]: [[X, 22 * k]], [B.h1R]: [[X, 24 * k]], [B.h2L]: [[X, 22 * k]], [B.h2R]: [[X, 20 * k]], [B.h3L]: [[X, -18 * k]], [B.h3R]: [[X, -16 * k]],
  [B.f1L]: [[X, -55 * k - 18 * kick * Math.sin(t * 15)]], [B.f1R]: [[X, -55 * k + 18 * kick * Math.sin(t * 15)]],
  [B.f2L]: [[X, -20 * k]], [B.f2R]: [[X, -20 * k]], [B.f3L]: [[X, 95 * k + 15 * kick * Math.sin(t * 15)]], [B.f3R]: [[X, 95 * k - 15 * kick * Math.sin(t * 15)]],
  [B.f4L]: [[X, 30 * k]], [B.f4R]: [[X, 30 * k]],
  [B.earL]: [[Y, -30 * k]], [B.earR]: [[Y, 30 * k]], [B.tail1]: [[X, -20 * k]]
});
const rearRoot = (k) => ({ p: [0, -0.1 * k, -0.15 * k], r: [[X, -36 * k]] });
// rear: the wind-up alone; it ends up on its hind legs, forelegs pawing the air
grounded('rear', { ...base, dur: 1.1, keys: (t) => rearKeys(ramp(t, 0, 0.55), ramp(t, 0.45, 0.7), t), root: (t) => rearRoot(ramp(t, 0, 0.55)) });
// rear and stamp: up, a beat at the top, then both forehooves driven into the ground (impact at STAMP)
const STAMP = 1.0;
const stamp = grounded('attack2', { ...base, dur: 1.75, keys: (t) => {
  const up = ramp(t, 0, 0.5) * (1 - ramp(t, 0.78, STAMP)), slam = bump(t, 0.85, 1.35);
  const ks = rearKeys(up, ramp(t, 0.4, 0.6) * (1 - ramp(t, 0.7, 0.8)), t);
  ks[B.n1].push([X, 18 * slam]); ks[B.head][0][1] += 16 * slam; ks[B.chest].push([X, 6 * slam]);
  ks[B.f2L].push([X, 8 * slam]); ks[B.f2R].push([X, 8 * slam]);
  return ks;
}, root: (t) => { const up = ramp(t, 0, 0.5) * (1 - ramp(t, 0.78, STAMP)), slam = bump(t, 0.95, 1.4); return { p: [0, -0.1 * up - 0.1 * slam, -0.15 * up + 0.25 * ramp(t, 0.78, STAMP) * (1 - ramp(t, 1.2, 1.75))], r: [[X, -36 * up + 5 * slam]] }; } });

// bellow: the neck stretched forward and up, the nose raised, the mouth open, a tremor through the call
grounded('howl', { ...base, dur: 2.3, keys: (t) => {
  const k = env(t, 0, 0.45, 1.8, 2.25), call = env(t, 0.4, 0.55, 1.65, 1.85), trem = call * Math.sin(t * 38) * 1.5;
  return {
    [B.chest]: [[X, -4 * k]], [B.n1]: [[X, 14 * k]], [B.n2]: [[X, -4 * k]], [B.n3]: [[X, -8 * k]], [B.head]: [[X, -32 * k + trem]],
    [B.jaw]: [[X, 14 * call + trem * 0.5]], [B.earL]: [[Y, -35 * k]], [B.earR]: [[Y, 35 * k]], [B.tail1]: [[X, -20 * k]],
    [B.f1L]: [[X, -4 * k]], [B.f1R]: [[X, -4 * k]]
  };
}, root: (t) => ({ p: [0, 0, -0.05 * env(t, 0, 0.45, 1.8, 2.25)] }) });

// paw: head low and antlers forward, the right forehoof lifts, strikes and scrapes back - a loop (the charge wind-up)
grounded('paw', { ...base, baseAt: () => 0, dur: 1.0, loop: true, keys: (t) => {
  const lift = bump(t, 0.05, 0.5), scrape = bump(t, 0.4, 0.85), nod = Math.sin(t * Math.PI * 2);
  return {
    [B.chest]: [[X, 5]], [B.n1]: [[X, 20 + 3 * nod]], [B.n2]: [[X, 8]], [B.head]: [[X, 30 + 4 * nod]], [B.earL]: [[Y, -25]], [B.earR]: [[Y, 25]],
    [B.f1R]: [[X, -50 * lift + 28 * scrape]], [B.f2R]: [[X, -25 * lift]], [B.f3R]: [[X, 100 * lift + 10 * scrape]], [B.f4R]: [[X, 25 * lift]],
    [B.f1L]: [[X, -6]], [B.h1L]: [[X, 6]], [B.h1R]: [[X, 6]], [B.tail1]: [[X, -15 + 10 * nod]]
  };
}, root: () => ({ p: [0, -0.04, 0] }) });

// hit: the head snaps back and aside, the body flinches away and settles (also looped while it is dazed)
grounded('hit', { ...base, baseAt: () => 0, dur: 0.7, loop: true, keys: (t, d) => {
  const k = bump(t, 0, d) * (1 - 0.3 * bump(t, 0.35 * d, d)), j = Math.sin((t / d) * Math.PI * 2);
  return {
    [B.sp2]: [[Z, 5 * k]], [B.chest]: [[X, -6 * k], [Z, 6 * k]], [B.n1]: [[X, -14 * k], [Y, 10 * k]], [B.n2]: [[Y, 8 * k]],
    [B.head]: [[X, -12 * k], [Y, 14 * k], [Z, 10 * j * k]], [B.jaw]: [[X, 10 * k]], [B.earL]: [[Y, -30 * k]], [B.earR]: [[Y, 30 * k]],
    [B.f1L]: [[X, 6 * k]], [B.f1R]: [[X, 6 * k]], [B.tail1]: [[X, -20 * k]]
  };
}, root: (t, d) => ({ p: [0.04 * bump(t, 0, d), 0, -0.1 * bump(t, 0, d)] }) });

if (!RAW) for (const a of Object.values(A)) dropClip(a);
// the source keys every bone's translation (at its rest length, give or take float noise): only the pelvis keeps a translation track
for (const a of R.listAnimations()) for (const ch of a.listChannels()) {
  const n = ch.getTargetNode(); if (ch.getTargetPath() !== 'translation' || n.getName() === B.pelvis) continue;
  const rest = new THREE.Vector3().fromArray(n.getTranslation()), out = ch.getSampler().getOutput().getArray(); let dev = 0;
  for (let i = 0; i < out.length; i += 3) dev = Math.max(dev, rest.distanceTo(new THREE.Vector3(out[i], out[i + 1], out[i + 2])));
  if (dev > 0.5) console.warn('dropping a moving translation track', a.getName(), n.getName(), dev.toFixed(2));
  const sm = ch.getSampler(); ch.dispose(); sm.dispose();
}

// ---------- look: a birch-white coat, amber antlers, amber tears ----------
const mats = Object.fromEntries(R.listMaterials().map((m) => [m.getName(), m]));
const lerp = (a, b, k) => a + (b - a) * k, clamp01 = (x) => Math.max(0, Math.min(1, x));
const ramp3 = (stops, x) => { for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const k = (x - a) / (b - a); return ca.map((v, j) => lerp(v, cb[j], k)); } return stops[stops.length - 1][1]; };
const rgb = async (tex, size) => { let img = sharp(Buffer.from(tex.getImage())).removeAlpha(); if (size) img = img.resize(size, size, { kernel: 'lanczos3' }); return img.raw().toBuffer({ resolveWithObject: true }); };
const png = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();

// Rest pose = bind pose in this rig, so one matrix takes any skinned vertex to character space (metres, +Z forward).
const restW = worlds(doc, locals(doc, null, 0)), headBone = byName(doc, B.head), host = byName(doc, 'Object_8'), skin = host.getSkin();
const G = restW.get(headBone).clone().multiply(new THREE.Matrix4().fromArray(skin.getInverseBindMatrices().getArray(), skin.listJoints().indexOf(headBone) * 16));
// fn(character-space point) evaluated over every texel a primitive covers in UV space (the largest value wins where islands
// share texels, as the two mirrored antlers do), then bled a few texels into the gutters
function bake(prim, w, h, fn, M = G) {
  const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0'), I = prim.getIndices().getArray();
  const val = new Float32Array(w * h), has = new Uint8Array(w * h), pos = [], uv = [], e = [];
  for (let i = 0; i < P.getCount(); i++) { pos.push(new THREE.Vector3().fromArray(P.getElement(i, e)).applyMatrix4(M)); const t = UV.getElement(i, e); uv.push([t[0] * w, t[1] * h]); }
  const q = new THREE.Vector3();
  for (let f = 0; f < I.length; f += 3) {
    const a = I[f], b = I[f + 1], c = I[f + 2], [ax, ay] = uv[a], [bx, by] = uv[b], [cx, cy] = uv[c];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, l3 = 1 - l1 - l2;
      if (l1 < -0.03 || l2 < -0.03 || l3 < -0.03) continue;
      q.copy(pos[a]).multiplyScalar(l1).addScaledVector(pos[b], l2).addScaledVector(pos[c], l3);
      const v = fn(q), k = y * w + x; if (!has[k] || v > val[k]) val[k] = v; has[k] = 1;
    }
  }
  for (let pass = 0; pass < 6; pass++) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (has[k]) continue; let s = 0, n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const kk = yy * w + xx; if (has[kk]) { s += val[kk]; n++; } } if (n) add.push([k, s / n]); }
    for (const [k, v] of add) { val[k] = v; has[k] = 1; }
  }
  return val;
}

// the coat: luminance through a curve - nose, hooves and eyes stay dark, the brown coat goes birch-white, the legs a light
// silver; the mouth's pinks are kept. The neck's mane (mane = 0..1, see maneZone) is the source's darkest, streakiest
// brown: through the coat curve its strands came out as a grey-brown smudge, so there it takes a flatter curve and no
// trace of the brown - silver-white a shade below the coat, the strands left as a faint cool-grey grain.
const CURVE = [[0, [0.1]], [0.03, [0.3]], [0.08, [0.72]], [0.18, [0.85]], [0.4, [0.92]], [1, [0.98]]];
const MANE = [[0, [0.7]], [0.04, [0.74]], [0.1, [0.79]], [0.2, [0.84]], [0.4, [0.89]], [1, [0.96]]];
const coat = (r, g, b, mane = 0) => {
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const pink = clamp01(((b - g) * 4 + (r - g) * 1.5 - 0.25) * 2) * (r > 0.35 ? 1 : 0);
  const L = lerp(ramp3(CURVE, l)[0], ramp3(MANE, l)[0], mane), warm = smooth((L - 0.45) / 0.45) * (1 - mane);
  const tint = [lerp(0.93, 1.0, warm), lerp(0.95, 0.985, warm), lerp(0.98, 0.93, warm)].map((v, i) => lerp(v, [0.955, 0.96, 0.975][i], mane));
  return [r, g, b].map((o, i) => Math.min(1, lerp(L * tint[i] + 0.04 * (1 - mane) * (o - l), o * 0.9 + l * 0.1, pink)));
};
// the mane's zone, in character space: around the neck's axis (low in the chest front up to the base of the skull),
// 0.32 m out with a soft edge, faded out over the brisket and before the face, eyes and ears
const NECK_A = new THREE.Vector3(0, 1.0, 0.1).multiplyScalar(HEIGHT / 2.6), NECK_B = new THREE.Vector3(0, 1.55, 0.78).multiplyScalar(HEIGHT / 2.6);
const maneZone = (q) => {
  const ab = NECK_B.clone().sub(NECK_A), d = q.clone().sub(NECK_A), s = d.dot(ab) / ab.lengthSq(), r = d.addScaledVector(ab, -s).length() / (HEIGHT / 2.6);
  return smooth((s + 0.15) / 0.2) * (1 - smooth((s - 0.95) / 0.15)) * (1 - smooth((r - 0.3) / 0.1));
};
// a skinned mesh's bind space -> character space (rest pose = bind pose, so any joint gives the same matrix)
const bindToChar = (node) => { const sk = node.getSkin(); return restW.get(headBone).clone().multiply(new THREE.Matrix4().fromArray(sk.getInverseBindMatrices().getArray(), sk.listJoints().indexOf(headBone) * 16)); };
// amber tears: a streak from the front corner of each eye down the face (the eyes sit at x = +-0.1 m in this rig), with a bead at its end
const eyeBox = new THREE.Box3();
{ const p = byName(doc, 'Object_9').getMesh().listPrimitives()[0], P = p.getAttribute('POSITION'), e = []; for (let i = 0; i < P.getCount(); i++) eyeBox.expandByPoint(new THREE.Vector3().fromArray(P.getElement(i, e)).applyMatrix4(G)); }
const eyeC = eyeBox.getCenter(new THREE.Vector3()), eyeX = (eyeBox.max.x - eyeBox.min.x) / 2 - 0.03; // each eye's centre is +-eyeX
const S = HEIGHT / 2.6, tearA = new THREE.Vector2(eyeC.y - 0.022 * S, eyeC.z + 0.028 * S), tearDir = new THREE.Vector2(-1, 0.5).normalize(), tearLen = 0.15 * S;
const tear = (q) => {
  if (Math.abs(q.x) < 0.035 * S || Math.abs(Math.abs(q.x) - eyeX) > 0.06 * S) return 0;
  const d = new THREE.Vector2(q.y, q.z).sub(tearA), s = clamp01(d.dot(tearDir) / tearLen), perp = d.clone().sub(tearDir.clone().multiplyScalar(s * tearLen)).length();
  const width = lerp(0.008, 0.004, s) * S, streak = clamp01(1.5 - perp / width) * (d.dot(tearDir) > -0.005 * S ? 1 : 0) * lerp(0.75, 1, s);
  const bead = clamp01(1.6 - new THREE.Vector2(q.y, q.z).distanceTo(tearA.clone().addScaledVector(tearDir, tearLen * 1.04)) / (0.009 * S));
  return Math.max(streak, bead);
};
const maneStat = [0, 0], coatStat = [0, 0];
for (const [n, node] of [['Body', byName(doc, 'Object_10')], ['Head', host]]) {
  const m = mats[n], { data, info } = await rgb(m.getBaseColorTexture()), w = info.width, h = info.height;
  const prim = node.getMesh().listPrimitives().find((p) => p.getMaterial() === m);
  const tears = n === 'Head' ? bake(prim, w, h, tear) : null, mane = bake(prim, w, h, maneZone, bindToChar(node));
  const em = tears ? Buffer.alloc(w * h * 3) : null;
  for (let i = 0, k = 0; i < data.length; i += 3, k++) {
    let c = coat(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, mane[k]);
    if (mane[k] > 0.9 || (mane[k] === 0 && data[i] > 60)) { const st = mane[k] > 0.9 ? maneStat : coatStat; st[0] += 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; st[1]++; }
    if (tears && tears[k] > 0) { const t = smooth(tears[k]); c = c.map((v, j) => lerp(v, [0.78, 0.36, 0.05][j], t * 0.92)); em[i] = 255 * t; em[i + 1] = 120 * t; em[i + 2] = 20 * t; }
    data[i] = c[0] * 255; data[i + 1] = c[1] * 255; data[i + 2] = c[2] * 255;
  }
  m.getBaseColorTexture().setImage(await png(data, w, h)).setMimeType('image/png');
  if (em) m.setEmissiveTexture(doc.createTexture('tears_glow').setImage(await png(em, w, h)).setMimeType('image/png')).setEmissiveFactor([0.7, 0.7, 0.7]);
}

console.log('mane: mean brightness', (maneStat[0] / maneStat[1]).toFixed(3), 'against the coat', (coatStat[0] / coatStat[1]).toFixed(3));

// the antlers: amber, deep resin at the skull warming to honey-gold towards the tips, which glow most
{
  const m = mats.Chifre, AW = 512, { data } = await rgb(m.getBaseColorTexture(), AW);
  const prim = host.getMesh().listPrimitives().find((p) => p.getMaterial() === m);
  const H = new THREE.Vector3().setFromMatrixPosition(restW.get(headBone));
  let dmin = Infinity, dmax = 0; { const P = prim.getAttribute('POSITION'), e = []; for (let i = 0; i < P.getCount(); i++) { const d = new THREE.Vector3().fromArray(P.getElement(i, e)).applyMatrix4(G).distanceTo(H); dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); } }
  const tip = bake(prim, AW, AW, (q) => clamp01((q.distanceTo(H) - dmin - 0.04 * S) / ((dmax - dmin) * 0.8)));
  const ls = []; for (let i = 0; i < data.length; i += 3) ls.push((0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255);
  const sorted = [...ls].sort((a, b) => a - b), lo = sorted[Math.floor(ls.length * 0.03)], hi = sorted[Math.floor(ls.length * 0.97)];
  const AMB = [[0, [0.4, 0.16, 0.03]], [0.35, [0.7, 0.33, 0.05]], [0.7, [0.95, 0.56, 0.12]], [1, [1.0, 0.72, 0.3]]];
  const col = Buffer.alloc(AW * AW * 3), em = Buffer.alloc(AW * AW * 3);
  ls.forEach((l, i) => {
    const detail = clamp01((l - lo) / (hi - lo)), t = Math.pow(tip[i], 0.8), c = ramp3(AMB, clamp01(0.18 + 0.55 * t + 0.35 * (detail - 0.5)));
    const g = (0.18 + 0.82 * t) * (0.7 + 0.3 * detail);
    col[i * 3] = c[0] * 255; col[i * 3 + 1] = c[1] * 255; col[i * 3 + 2] = c[2] * 255;
    em[i * 3] = 255 * g; em[i * 3 + 1] = 145 * g; em[i * 3 + 2] = 40 * g;
  });
  m.getBaseColorTexture().setImage(await png(col, AW, AW)).setMimeType('image/png');
  m.setEmissiveTexture(doc.createTexture('amber_glow').setImage(await png(em, AW, AW)).setMimeType('image/png')).setEmissiveFactor([0.6, 0.6, 0.6]);
  // glossy resin: a roughness map keeps the game from flattening it to its 0.6 default
  // (a little grain in it, or the finishing prune folds a flat map back into a factor)
  const grain = Buffer.alloc(32 * 32 * 3); for (let i = 0; i < 32 * 32; i++) grain[i * 3 + 1] = 70 + ((i * 7919) % 23);
  m.setMetallicRoughnessTexture(doc.createTexture('amber_mr').setImage(await png(grain, 32, 32)).setMimeType('image/png')).setRoughnessFactor(1).setMetallicFactor(1);
}
for (const m of R.listMaterials()) if (m !== mats.Chifre) m.setRoughnessFactor(0.75).setMetallicFactor(0);

const nUsed = slimRig(doc);
// --dbg=<path>: an uncompressed copy for Blender contact sheets
const dbg = process.argv.find((a) => a.startsWith('--dbg='));
if (dbg) await io.write(dbg.slice(6), doc);
const b = bounds(doc, null, 0);
// the stamp lands when the forehooves are back down at their standing height
const foreY = (t) => Math.min(...[B.f4L, B.f4R].map((n) => new THREE.Vector3().setFromMatrixPosition(worlds(doc, locals(doc, stamp, t)).get(byName(doc, n))).y));
let stampAt = STAMP; for (let t = 0.7; t <= STAMP; t += 1 / 60) if (foreY(t) < foreY(0) + 0.06) { stampAt = +t.toFixed(2); break; }
const hit = { attack: GORE, attack2: stampAt };
// the top of the bound, for the frozen mid-leap prop
let leapApex = 0, top = -1; for (let t = 0; t <= duration(leap); t += 1 / 30) { const y = pelvisAt(leap, t).y; if (y > top) { top = y; leapApex = +t.toFixed(2); } }
const bytes = await finish(doc, OUT, {
  hit, height: +(b.max.y - b.min.y).toFixed(2), length: +(b.max.z - b.min.z).toFixed(2),
  walkSpeed: +walkSpeed.toFixed(2), runSpeed: +runSpeed.toFixed(2), leapApex,
  credit: '"Realistic Animated Elk 3D Model" by WildMesh_3D (sketchfab.com/WildMesh_3D), CC-BY 4.0 - recoloured, antlers re-bound and turned to amber, attack, rear, bellow, paw and hit animations made for Skotos',
  license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('elk', (bytes / 1024).toFixed(0) + ' KB', 'joints', nUsed, 'size', b.getSize(new THREE.Vector3()).toArray().map((x) => x.toFixed(2)).join('x'), JSON.stringify({ hit, walkSpeed, runSpeed, leapApex }));
