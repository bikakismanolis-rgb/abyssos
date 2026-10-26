// Amber Moths: "Animated Peacock Moth" by OsianOHM (Osian CG), sketchfab.com/OsianOHM, CC-BY 4.0 -> src/assets/creatures/moth.glb
// A giant peacock moth (Saturnia pyri) with one rigged flight loop. The source mirrors its left wings with a negatively
// scaled second armature: here that armature is un-mirrored (bone frames conjugated by the X reflection, the inverse bind
// matrices fixed to match) and its wing bones are re-parented under the thorax, so the moth is one skin with one root
// and every world matrix is a proper rotation (three.js lights a mirrored skin inside out). 61k triangles are thinned to
// about 3k, the grey-brown scales are re-tinted to dusty amber and gold with the eye-spots kept, and a faint warm
// emissive with sparse glints makes the wings glitter in the dark wood (the game breathes the emissive intensity).
// Clips follow the Act II bat (tools/creatures/act2/bat.mjs): idle, walk and run are the flap at rising speed, attack/bite
// a nose-down dive with a hard downstroke and the legs reaching, hit a stalled beat, die the wings folding as it tumbles.
// The body hangs at the origin (thorax over x = z = 0, lowest point at rest on y = 0); the game's 'bat' AI flies it at
// head height and lowers it to the ground when it dies.
// usage: node moth.mjs [source.glb] [out.glb] [--raw keeps the source clip] [--dbg=<path> also writes an uncompressed copy]
//        [--lift=<m> raises it off the ground, for viewer screenshots only]
import { MeshoptSimplifier } from 'meshoptimizer';
import { simplifyPrim } from '../../envlib.mjs';
import { load, normalise, copyClip, makeClip, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds, sample,
  X, Y, Z, bump, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/moth/model.glb', OUT = new URL('../../../src/assets/creatures/moth.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const LIFT = +((process.argv.find((a) => a.startsWith('--lift=')) || '').slice(7) || 0); // screenshots only: hover it at the AI's height
const SPAN = 1.1;               // across the spread wings, metres
const TRIS = { body: 1250, wing: 900 };
const doc = await load(SRC);
const R = doc.getRoot(), buf = R.listBuffers()[0];
const parentOf = (n) => R.listNodes().find((p) => p.listChildren().includes(n));
const below = (n) => { const out = []; const walk = (q) => { for (const c of q.listChildren()) { out.push(c); walk(c); } }; walk(n); return out; };
const src = R.listAnimations()[0];

// ---------- 1. un-mirror the left-wing armature ----------
// W' = W * F (F = diag(-1, 1, 1)) for every node under the armature: its scale loses the sign, each local below it
// becomes F * L * F (translation x negated, rotation (x, -y, -z, w)), and each inverse bind matrix becomes F * IBM.
const arm = byName(doc, 'WingsMirrored_armature_105'), wingL = byName(doc, 'Object_102');
{
  const s = arm.getScale(); if (s[0] > 0) throw new Error('expected the mirrored armature');
  arm.setScale([-s[0], s[1], s[2]]);
  const sub = new Set(below(arm));
  for (const n of sub) {
    const t = n.getTranslation(), q = n.getRotation();
    n.setTranslation([-t[0], t[1], t[2]]).setRotation([q[0], -q[1], -q[2], q[3]]);
  }
  for (const ch of src.listChannels()) {
    if (!sub.has(ch.getTargetNode())) continue;
    const path = ch.getTargetPath(); if (path === 'scale') continue;
    const smp = ch.getSampler(), a = smp.getOutput().getArray().slice();
    if (path === 'translation') for (let i = 0; i < a.length; i += 3) a[i] = -a[i];
    else for (let i = 0; i < a.length; i += 4) { a[i + 1] = -a[i + 1]; a[i + 2] = -a[i + 2]; }
    // a fresh accessor: the right wing's channels may share the source's
    smp.setOutput(doc.createAccessor().setType(path === 'translation' ? 'VEC3' : 'VEC4').setArray(a).setBuffer(buf));
  }
  const skin = wingL.getSkin(), ib = skin.getInverseBindMatrices().getArray().slice();
  for (let j = 0; j < ib.length; j += 16) for (const c of [0, 4, 8, 12]) ib[j + c] = -ib[j + c];
  skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ib).setBuffer(buf));
}

// ---------- 2. one skin: the left wing bones re-parented under the thorax ----------
const thorax = byName(doc, 'Thorax_80'), body = byName(doc, 'Object_8'), wingR = byName(doc, 'Object_9');
{
  const W = worlds(doc, locals(doc, null, 0));
  const skinA = body.getSkin(), skinB = wingL.getSkin();
  const isRoot = (n) => /rootJoint/.test(n?.getName() || '');
  const tops = skinB.listJoints().filter((j) => !isRoot(j) && (isRoot(parentOf(j)) || !skinB.listJoints().includes(parentOf(j))));
  console.log('re-parenting', tops.map((j) => j.getName()));
  for (const j of tops) {
    // static parents (neither the thorax nor the armature moves in the source): new local = C * old local
    const C = W.get(thorax).clone().invert().multiply(W.get(parentOf(j)));
    const reTRS = (t, q, s) => { const m = C.clone().multiply(new THREE.Matrix4().compose(t, q, s)); const T = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); m.decompose(T, Q, S); return { T, Q, S }; };
    const r = reTRS(new THREE.Vector3(...j.getTranslation()), new THREE.Quaternion(...j.getRotation()), new THREE.Vector3(...j.getScale()));
    const chs = Object.fromEntries(src.listChannels().filter((c) => c.getTargetNode() === j).map((c) => [c.getTargetPath(), c]));
    const times = chs.rotation?.getSampler().getInput().getArray() || [];
    const tr = [], ro = [], sc = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const k = reTRS(chs.translation ? sample(chs.translation, t) : new THREE.Vector3(...j.getTranslation()), sample(chs.rotation, t), chs.scale ? sample(chs.scale, t) : new THREE.Vector3(...j.getScale()));
      tr.push(...k.T.toArray()); ro.push(...k.Q.toArray()); sc.push(...k.S.toArray());
    }
    parentOf(j).removeChild(j); thorax.addChild(j);
    j.setTranslation(r.T.toArray()).setRotation(r.Q.toArray()).setScale(r.S.toArray());
    const input = chs.rotation.getSampler().getInput();
    for (const [path, arr, type] of [['translation', tr, 'VEC3'], ['rotation', ro, 'VEC4'], ['scale', sc, 'VEC3']]) {
      const s = doc.createAnimationSampler().setInput(input).setInterpolation('LINEAR').setOutput(doc.createAccessor().setType(type).setArray(new Float32Array(arr)).setBuffer(buf));
      src.addSampler(s);
      if (chs[path]) chs[path].setSampler(s); else src.addChannel(doc.createAnimationChannel().setTargetNode(j).setTargetPath(path).setSampler(s));
    }
  }
  // skin B's joints join skin A (their IBMs appended); the left wing's JOINTS_0 shift by skin A's count
  const nA = skinA.listJoints().length, ibA = skinA.getInverseBindMatrices().getArray(), ibB = skinB.getInverseBindMatrices().getArray();
  const ib = new Float32Array(ibA.length + ibB.length); ib.set(ibA); ib.set(ibB, ibA.length);
  for (const j of skinB.listJoints()) skinA.addJoint(j);
  skinA.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ib).setBuffer(buf));
  for (const p of wingL.getMesh().listPrimitives()) {
    const J = p.getAttribute('JOINTS_0'), a = new Uint16Array(J.getCount() * 4), e = [];
    for (let i = 0; i < J.getCount(); i++) { J.getElement(i, e); for (let k = 0; k < 4; k++) a[i * 4 + k] = e[k] + nA; }
    p.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(a).setBuffer(buf));
  }
  wingL.setSkin(skinA);
}

// ---------- 3. winding: every triangle's turn must agree with its vertex normals (the mirrored copy is reversed) ----------
function windingAgreement(node) {
  const W = worlds(doc, locals(doc, null, 0)), skin = node.getSkin(), js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
  const M = js.map((j, i) => W.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16)));
  let agree = 0, tot = 0;
  for (const p of node.getMesh().listPrimitives()) {
    const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'), J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0'), I = p.getIndices().getArray();
    const pos = [], nor = [], e = [], je = [], we = [];
    const skinned = (i) => {
      J.getElement(i, je); Wt.getElement(i, we); const m = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 4; k++) if (we[k]) for (let c = 0; c < 16; c++) m.elements[c] += M[je[k]].elements[c] * we[k];
      return m;
    };
    for (let i = 0; i < P.getCount(); i++) { const m = skinned(i); pos.push(new THREE.Vector3().fromArray(P.getElement(i, e)).applyMatrix4(m)); nor.push(new THREE.Vector3().fromArray(N.getElement(i, e)).applyMatrix3(new THREE.Matrix3().setFromMatrix4(m)).normalize()); }
    for (let t = 0; t < I.length; t += 3) {
      const a = pos[I[t]], b = pos[I[t + 1]], c = pos[I[t + 2]];
      const fn = b.clone().sub(a).cross(c.clone().sub(a));
      const vn = nor[I[t]].clone().add(nor[I[t + 1]]).add(nor[I[t + 2]]);
      if (fn.lengthSq() < 1e-14) continue;
      tot++; if (fn.dot(vn) > 0) agree++;
    }
  }
  return agree / tot;
}
for (const n of [body, wingR, wingL]) {
  const a = windingAgreement(n);
  if (a < 0.5) for (const p of n.getMesh().listPrimitives()) {
    const I = p.getIndices().getArray().slice(); for (let t = 0; t < I.length; t += 3) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; }
    p.setIndices(doc.createAccessor().setType('SCALAR').setArray(I).setBuffer(buf));
  }
  console.log('winding', n.getName(), a.toFixed(3), a < 0.5 ? '-> flipped' : '');
}

// ---------- 4. thin it out: about 3k triangles ----------
await MeshoptSimplifier.ready;
for (const [n, k] of [[body, 'body'], [wingR, 'wing'], [wingL, 'wing']]) for (const p of n.getMesh().listPrimitives()) {
  for (const s of ['TANGENT', 'TEXCOORD_1', 'COLOR_0']) p.setAttribute(s, null);
  const before = p.getIndices().getCount() / 3;
  const mode = simplifyPrim(p, TRIS[k] / before, 0.04);
  console.log('simplify', n.getName(), before, '->', p.getIndices().getCount() / 3, mode);
}
// one primitive, one material (the body's triangles first)
let bodyTris = 0;
{
  const prims = [body, wingR, wingL].flatMap((n) => n.getMesh().listPrimitives());
  const sem = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];
  const cat = {}, idx = []; let off = 0;
  for (const s of sem) cat[s] = [];
  bodyTris = body.getMesh().listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
  for (const p of prims) {
    for (const s of sem) { const a = p.getAttribute(s), e = []; for (let i = 0; i < a.getCount(); i++) cat[s].push(...a.getElement(i, e)); }
    for (const i of p.getIndices().getArray()) idx.push(i + off);
    off += p.getAttribute('POSITION').getCount();
  }
  const mat = prims[0].getMaterial();
  const q = doc.createPrimitive().setMaterial(mat).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
  const types = { POSITION: ['VEC3', Float32Array], NORMAL: ['VEC3', Float32Array], TEXCOORD_0: ['VEC2', Float32Array], JOINTS_0: ['VEC4', Uint16Array], WEIGHTS_0: ['VEC4', Float32Array] };
  for (const s of sem) q.setAttribute(s, doc.createAccessor().setType(types[s][0]).setArray(new types[s][1](cat[s])).setBuffer(buf));
  for (const p of body.getMesh().listPrimitives()) body.getMesh().removePrimitive(p);
  body.getMesh().addPrimitive(q).setName('moth');
  wingR.setMesh(null).setSkin(null); wingL.setMesh(null).setSkin(null);
  body.setName('moth_mesh');
  console.log('merged', idx.length / 3, 'triangles,', off, 'vertices');
}

// ---------- 5. names ----------
{
  for (const n of R.listNodes()) {
    let nm = n.getName();
    if (/^(Object_|GLTF_|Sketchfab|root$|moth_mesh)/.test(nm)) continue;
    const mirrored = /_R_(9\d|10\d)$/.test(nm) && /^Wing/.test(nm);
    nm = nm.replace(/_\d+$/, '').replace(/__/g, '_');
    if (mirrored) nm = nm.replace(/_R$/, '_L');
    n.setName(nm);
  }
  thorax.setName('chest'); byName(doc, 'Head').setName('head');
  byName(doc, 'MothBodyEmpty').setName('moth_body');
}

// ---------- 6. scale, centre: the thorax over the origin, the lowest point at rest on the ground ----------
{
  const b0 = bounds(doc, null, 0, 1);
  const root = normalise(doc, { scale: SPAN / (b0.max.x - b0.min.x), keepXZ: true });
  const W = worlds(doc, locals(doc, null, 0)), c = new THREE.Vector3().setFromMatrixPosition(W.get(thorax));
  const t = root.getTranslation(); root.setTranslation([t[0] - c.x, t[1], t[2] - c.z]);
}
const rb = bounds(doc, null, 0, 1);
console.log('rest bounds', rb.min.toArray().map((v) => +v.toFixed(3)), rb.max.toArray().map((v) => +v.toFixed(3)));

// ---------- 7. clips ----------
const B = { chest: 'chest', head: 'head', ab1: 'Abdomen_1', ab3: 'Abdomen_3', fR: 'Wing_F_1_R', fL: 'Wing_F_1_L', hR: 'Wing_HF_1_R', hL: 'Wing_HF_1_L' };
const legs = ['F', 'M', 'H'].flatMap((l) => ['R', 'L'].map((s) => [l, s]));
const femur = (l, s) => R.listNodes().map((n) => n.getName()).find((n) => new RegExp(`^${l}_Femur_${s}$`).test(n));
const tibia = (l, s) => R.listNodes().map((n) => n.getName()).find((n) => new RegExp(`^${l}_Tibia_${s}$`).test(n));
const antR = 'Antenna_1_R', antL = 'Antenna_1_L';
const D = duration(src);
// the flap's phase: when the right forewing tip is highest and lowest
let tUp = 0, tDown = 0;
{
  const tip = byName(doc, 'Wing_F_3_R'); let hi = -1e9, lo = 1e9;
  for (let i = 0; i <= 60; i++) { const t = (i / 60) * D, y = new THREE.Vector3().setFromMatrixPosition(worlds(doc, locals(doc, src, t)).get(tip)).y; if (y > hi) { hi = y; tUp = t; } if (y < lo) { lo = y; tDown = t; } }
  console.log('flap: up at', tUp.toFixed(3), 'down at', tDown.toFixed(3), 'tip travel', (hi - lo).toFixed(3));
}
// wing-up about Z: the right wing (on -X) rises for -Z, the left for +Z
const wings = (up, sweep = 0, hind = 0.9) => ({
  [B.fR]: [[Z, -up], [Y, sweep]], [B.hR]: [[Z, -up * hind], [Y, sweep * 0.8]],
  [B.fL]: [[Z, up], [Y, -sweep]], [B.hL]: [[Z, up * hind], [Y, -sweep * 0.8]]
});
const merge = (...ks) => { const o = {}; for (const k of ks) for (const [b, r] of Object.entries(k)) (o[b] ||= []).push(...r); return o; };
// the source beats shallowly (about 38 degrees of arc): a giant moth reads better with a deeper stroke, so the wing
// roots' swing about their mean pose is scaled up (forewing and hindwing alike, so they stay in step)
function deepen(anim, names, gain) {
  for (const ch of anim.listChannels()) {
    if (ch.getTargetPath() !== 'rotation' || !names.includes(ch.getTargetNode()?.getName())) continue;
    const smp = ch.getSampler(), a = smp.getOutput().getArray().slice(), n = a.length / 4;
    const qs = []; for (let i = 0; i < n; i++) qs.push(new THREE.Quaternion().fromArray(a, i * 4));
    const m = new THREE.Vector4();
    for (const q of qs) { const s = q.dot(qs[0]) < 0 ? -1 : 1; m.x += q.x * s; m.y += q.y * s; m.z += q.z * s; m.w += q.w * s; }
    const mean = new THREE.Quaternion(m.x, m.y, m.z, m.w).normalize(), inv = mean.clone().invert();
    qs.forEach((q, i) => {
      const d = inv.clone().multiply(q); if (d.w < 0) d.set(-d.x, -d.y, -d.z, -d.w);
      const ang = 2 * Math.acos(Math.min(1, d.w)), sn = Math.sin(ang / 2);
      const out = sn < 1e-6 ? q.clone() : mean.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(d.x / sn, d.y / sn, d.z / sn), ang * gain));
      out.toArray(a, i * 4);
    });
    smp.setOutput(doc.createAccessor().setType('VEC4').setArray(a).setBuffer(buf));
  }
  return anim;
}
const ROOTS = [B.fR, B.fL, B.hR, B.hL];
const flap = deepen(copyClip(doc, src, 'flap', { loop: true }), ROOTS, 1.5);
// how far the forewing tip stands above the chest at the top of the beat, in degrees (to fold the wings shut on death)
const elev = (anim, t, tipName) => { const W = worlds(doc, locals(doc, anim, t)), c = new THREE.Vector3().setFromMatrixPosition(W.get(byName(doc, B.chest))), p = new THREE.Vector3().setFromMatrixPosition(W.get(byName(doc, tipName))).sub(c); return Math.atan2(p.y, Math.abs(p.x)) / (Math.PI / 180); };
const upF = elev(flap, tUp, 'Wing_F_3_R'), upH = elev(flap, tUp, 'Wing_HF_2_R');
console.log('deepened beat: forewing up', upF.toFixed(0), 'down', elev(flap, tDown, 'Wing_F_3_R').toFixed(0), 'hindwing up', upH.toFixed(0));

copyClip(doc, flap, 'idle', { loop: true, speed: 0.75 });
copyClip(doc, flap, 'walk', { loop: true });
// run: the quickest beat, the body tipped into the flight
copyClip(doc, flap, 'run', { loop: true, speed: 1.45, keys: () => ({ [B.chest]: [[X, 10]] }) });
// attack / bite: a quick stroke up while it tips nose-down into the dive, one hard downstroke as the legs reach and the
// abdomen curls under, then it pulls up. The beat is re-timed so its own downstroke lands on the strike.
const ATK = 0.8, STRIKE = 0.3;
const atkBase = (t) => {
  // up-stroke 0..0.18 (tDown -> tUp), down-stroke 0.18..STRIKE+0.04 (tUp -> tDown), then an ordinary beat
  const span = (D + tUp - tDown) % D, half = (D + tDown - tUp) % D;
  if (t < 0.18) return (tDown + span * (t / 0.18)) % D;
  if (t < STRIKE + 0.04) return (tUp + half * ((t - 0.18) / (STRIKE + 0.04 - 0.18))) % D;
  return (tDown + (t - STRIKE - 0.04) * 1.3) % D;
};
const attackKeys = (t) => {
  const dive = env(t, 0.02, 0.22, 0.42, 0.75), wind = bump(t, 0.0, STRIKE + 0.02), hit = bump(t, STRIKE - 0.12, STRIKE + 0.16);
  const k = merge(
    { [B.chest]: [[X, 30 * dive]], [B.head]: [[X, 20 * hit]], [B.ab1]: [[X, -20 * hit]], [B.ab3]: [[X, -14 * hit]] },
    wings(20 * wind - 30 * hit, -10 * wind),
    { [antR]: [[X, -15 * hit]], [antL]: [[X, -15 * hit]] }
  );
  // the legs reach forward and open to grab
  for (const [l, s] of legs) { const f = femur(l, s), tb = tibia(l, s); if (!f) continue; const w = l === 'F' ? 1 : l === 'M' ? 0.7 : 0.4;
    (k[f] ||= []).push([X, -45 * w * hit]); if (tb) (k[tb] ||= []).push([X, -25 * w * hit]); }
  return k;
};
const atkRoot = (t) => ({ p: [0, -0.06 * bump(t, 0.1, 0.55), 0.12 * bump(t, 0.12, 0.5)] });
for (const name of ['attack', 'bite']) makeClip(doc, name, { dur: ATK, base: flap, baseAt: atkBase, keys: attackKeys, rootNode: B.chest, root: atkRoot });
// hit: the beat stalls with the wings thrown up, the body knocked back nose-up and rocking
makeClip(doc, 'hit', { dur: 0.5, base: flap, baseAt: (t) => (tDown + 0.12 * Math.sqrt(t / 0.5)) % D, rootNode: B.chest,
  keys: (t, d) => { const k = bump(t, 0, d), j = Math.exp(-t * 6); return merge({ [B.chest]: [[X, -24 * k], [Z, 12 * Math.sin(t * 24) * j]], [B.head]: [[X, -12 * k]], [B.ab1]: [[X, 10 * k]] }, wings(28 * k, 8 * k)); },
  root: (t, d) => ({ p: [0, 0.04 * bump(t, 0, d), -0.08 * bump(t, 0, d)] }) });
// die: the wings close up over the back (the beat runs up to its top and the roots fold on until the wings meet), the
// body pitches into a tumble and rolls onto its side, so the shut wings lie flat on the ground; the legs curl
const DIE = 1.4;
const dieKeys = (t) => {
  const f = smooth(t / 0.55), r = smooth((t - 0.15) / 0.95), c = smooth((t - 0.3) / 0.8);
  const k = merge(wings((88 - upF) * f, -6 * f, (88 - upH) / (88 - upF)),
    { [B.chest]: [[Z, -90 * r], [X, 45 * Math.sin(Math.PI * r)]], [B.head]: [[X, 22 * c]], [B.ab1]: [[X, -16 * c]], [B.ab3]: [[X, -10 * c]], [antR]: [[X, 35 * c]], [antL]: [[X, 35 * c]] });
  for (const [l, s] of legs) { const fm = femur(l, s), tb = tibia(l, s); if (fm) (k[fm] ||= []).push([X, 20 * c]); if (tb) (k[tb] ||= []).push([X, 40 * c]); }
  return k;
};
let dieDrop = 0;
const dieClip = () => makeClip(doc, 'die', { dur: DIE, base: flap, baseAt: (t) => (tDown + ((D + tUp - tDown) % D) * smooth(t / 0.5)) % D, keys: dieKeys, rootNode: B.chest,
  root: (t) => ({ p: [0, -dieDrop * smooth((t - 0.15) / 1.0), 0] }) });
{
  // settle: whatever is lowest at the end lies on the ground
  const a = dieClip(), b = bounds(doc, a, DIE, 1); dropClip(a);
  dieDrop = b.min.y; dieClip();
  console.log('die drop', dieDrop.toFixed(3), 'top at rest on the ground', (b.max.y - b.min.y).toFixed(3));
}
if (!RAW) dropClip(flap);
if (!RAW) dropClip(src);

// ---------- 8. dusty amber and gold, the eye-spots kept, a faint warm glow with sparse glints ----------
const mat = R.listMaterials()[0];
for (const m of R.listMaterials()) if (m !== mat) m.dispose();
{
  const tex = mat.getBaseColorTexture();
  const { data, info } = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.width, ch = info.channels;
  // which texels are wing (UV islands of the wing triangles): glints only there
  const wingMask = new Uint8Array(N * N);
  {
    const p = body.getMesh().listPrimitives()[0], uv = p.getAttribute('TEXCOORD_0'), I = p.getIndices().getArray(), e = [];
    for (let t = bodyTris * 3; t < I.length; t += 3) {
      const v = [0, 1, 2].map((k) => { uv.getElement(I[t + k], e); return [e[0] * N, e[1] * N]; });
      const x0 = Math.max(0, Math.floor(Math.min(v[0][0], v[1][0], v[2][0]))), x1 = Math.min(N - 1, Math.ceil(Math.max(v[0][0], v[1][0], v[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(v[0][1], v[1][1], v[2][1]))), y1 = Math.min(N - 1, Math.ceil(Math.max(v[0][1], v[1][1], v[2][1])));
      const ar = (v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[2][0] - v[0][0]) * (v[1][1] - v[0][1]); if (!ar) continue;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((v[1][0] - px) * (v[2][1] - py) - (v[2][0] - px) * (v[1][1] - py)) / ar, w1 = ((v[2][0] - px) * (v[0][1] - py) - (v[0][0] - px) * (v[2][1] - py)) / ar;
        if (w0 >= -0.02 && w1 >= -0.02 && 1 - w0 - w1 >= -0.02) wingMask[y * N + x] = 1;
      }
    }
  }
  // the eye-spots: their rust-red rings are much redder than the tan scales or the umber fur; spread a little, the mask
  // takes in the dark ring and the white crescent too. The forewing underside's greyer eye is placed by hand.
  const rust = Buffer.alloc(N * N);
  for (let i = 0, k = 0; i < data.length; i += ch, k++) {
    const r = data[i], g = data[i + 1], b = data[i + 2], l = (0.3 * r + 0.55 * g + 0.15 * b) / 255;
    if (wingMask[k] && l < 0.45 && (r - g) / (r + 8) > 0.36) rust[k] = 255;
  }
  for (const [u, v, rad] of [[0.621, 0.635, 0.016]]) for (let y = Math.floor((v - rad) * N); y <= (v + rad) * N; y++) for (let x = Math.floor((u - rad) * N); x <= (u + rad) * N; x++) if (Math.hypot(x / N - u, y / N - v) < rad) rust[y * N + x] = 255;
  const eb = await sharp(rust, { raw: { width: N, height: N, channels: 1 } }).blur(N / 220).raw().toBuffer({ resolveWithObject: true });
  const eye = (k) => Math.min(1, (eb.data[k * eb.info.channels] / 255) * 4);
  // and a soft halo around each (from the eye cores, so a small eye glows as much as a big one), so the 'eyes' still
  // glow at the distance the game is seen from
  const core = Buffer.alloc(N * N); for (let k = 0; k < N * N; k++) core[k] = eye(k) > 0.5 ? 255 : 0;
  const hb = await sharp(core, { raw: { width: N, height: N, channels: 1 } }).blur(N / 80).raw().toBuffer({ resolveWithObject: true });
  const halo = (k) => Math.min(1, (hb.data[k * hb.info.channels] / 255) * 6);
  // gradient map on the luminance: umber -> burnt amber -> amber -> gold -> pale gold
  const stops = [[0, [28, 12, 4]], [0.22, [88, 38, 8]], [0.45, [166, 84, 18]], [0.65, [210, 134, 40]], [0.82, [232, 176, 80]], [1, [248, 212, 138]]];
  const grad = (x) => { x = Math.min(1, Math.max(0, x)); let i = 0; while (i < stops.length - 2 && x > stops[i + 1][0]) i++; const [a, ca] = stops[i], [b, cb] = stops[i + 1], f = (x - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * f); };
  const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
  const em = Buffer.alloc(N * N * 3);
  for (let i = 0, k = 0; i < data.length; i += ch, k++) {
    const r = data[i], g = data[i + 1], b = data[i + 2], l = (0.3 * r + 0.55 * g + 0.15 * b) / 255;
    const x = Math.pow(Math.min(1, Math.max(0, (l - 0.03) / 0.72)), 0.95);
    // dusty: a veil of grey ochre over the amber
    let c = mix(grad(x), [140, 118, 90], 0.08);
    // a faint glow follows the bright scales
    const hv = wingMask[k] ? smooth(halo(k)) * 0.4 : 0;
    let e = [0.17 * x * x + hv, 0.1 * x * x + hv * 0.52, 0.035 * x * x + hv * 0.14];
    const ev = eye(k);
    if (ev > 0) {
      // the iris burns red-amber, the crescent pale gold, the ring around them goes darker for contrast
      const irid = smooth(((r - g) / (r + 8) - 0.22) / 0.14), cres = smooth((l - 0.38) / 0.15) * (1 - irid) * ev;
      c = mix(c, [178, 52, 10], irid * ev); c = mix(c, [255, 226, 150], cres * ev); c = c.map((v) => v * (1 - 0.45 * ev * (1 - Math.max(irid, cres))));
      e = mix(e, [1, 0.42, 0.1], irid * ev * 0.9); e = mix(e, [1, 0.85, 0.5], cres * ev * 0.8);
    }
    for (let q = 0; q < 3; q++) { data[i + q] = Math.min(255, c[q]); em[k * 3 + q] = Math.min(255, 255 * e[q]); }
  }
  // sparse glints of scale dust on the wings, 2x2 texels so they survive the cut to 512
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let glints = 0;
  for (let y = 0; y < N - 1; y += 2) for (let x = 0; x < N - 1; x += 2) {
    const k = y * N + x; if (!wingMask[k] || rnd() > 0.004) continue;
    const s = 0.7 + 0.3 * rnd(); glints++;
    for (const kk of [k, k + 1, k + N, k + N + 1]) { em[kk * 3] = 255 * s; em[kk * 3 + 1] = 205 * s; em[kk * 3 + 2] = 120 * s; }
  }
  console.log('glints', glints);
  tex.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
  const et = doc.createTexture('moth_glow').setImage(await sharp(em, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([1, 1, 1]);
  if (DBG) { await sharp(data, { raw: info }).resize(512).png().toFile(DBG.replace(/\.glb$/, '_base.png')); await sharp(em, { raw: { width: N, height: N, channels: 3 } }).resize(512).png().toFile(DBG.replace(/\.glb$/, '_glow.png')); }
  // matte dusty scales: no roughness map
  const mr = mat.getMetallicRoughnessTexture(); mat.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.82);
  if (mr && !mr.listParents().some((p) => p.propertyType === 'Material')) mr.dispose();
  mat.setName('amber_moth').setDoubleSided(true);
}

// ---------- 9. finish ----------
const used = slimRig(doc);
const b = bounds(doc, null, 0, 1);
if (LIFT) { const r = byName(doc, 'creature'), t = r.getTranslation(); r.setTranslation([t[0], t[1] + LIFT, t[2]]); }
const extras = {
  hit: { attack: STRIKE, bite: STRIKE }, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 3, runSpeed: 6.8,
  credit: '"Animated Peacock Moth" by OsianOHM (Osian CG), sketchfab.com/OsianOHM, CC-BY 4.0 - decimated, re-tinted amber, extra animations made for Skotos', license: 'CC-BY-4.0'
};
if (DBG) { await io.write(DBG, doc); }
const bytes = await finish(doc, OUT, extras, { base: 512, aux: 512 });
console.log('moth', (bytes / 1024).toFixed(0) + ' KB', used, 'joints', JSON.stringify(extras.hit), 'height', extras.height, 'span', (b.max.x - b.min.x).toFixed(2));
