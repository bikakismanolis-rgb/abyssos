// Skuas: "Seagull" by Dayvable, sketchfab.com/Dayvable, CC-BY 4.0 -> src/assets/creatures/skua.glb
// The great skua (Ληστόγλαρος), the robber gull of the frozen coast. The source is a herring gull made for a flock
// simulation: one skin, a bones-only rig (back, neck, head, tail, four bones a wing; no legs) and one 9.5 s clip of
// flapping with a held glide. Here:
//   - its rest pose becomes the source's held glide (wings level with a slight dihedral), placed by the bat
//     conventions (tools/creatures/act2/bat.mjs): wing roots over x = z = 0, the lowest point of the glide on y = 0,
//     1.4 m from wing tip to wing tip, head to +Z, the left wing to +X; the game flies it at head height;
//   - 4.4k triangles are thinned to 2.4k; black legs are built in code (feathered tibia stubs, flattened tarsi, webbed
//     three-toed feet: 112 triangles) on new thigh, shank and foot bones, tucked into the belly in flight;
//   - a feather bone under each wing bone carries the trailing part of its skin (blended in across the chord): folding
//     turns them about 90 degrees so the wing closes like a fan along the body instead of sticking out (its inner wing
//     is 0.2 m deep, the body 0.13 m wide); two tail-half bones close the tail fan on the perch. In flight they rest;
//   - the white gull is repainted texel by texel as a great skua (every texel of the 1024 atlas is given the position,
//     normal, bone and UV island of the surface it lies on): dark brown with rufous and buff feather tips on the mantle
//     and coverts, a blackish cap, gold-streaked neck, warm brown underparts, blackish flight feathers and tail, the
//     white flash at the base of the primaries above and below, a black hooked bill; shipped at 512 px, colour only.
// Clips (in place; the root is the pelvis):
//   idle     hanging in the wind: wings held with the hands angled, small corrections, the tail steering, the feet half
//            lowered, a short flutter once a loop
//   walk     the source's flap, retimed (0.62 s a beat)        run   the flap faster and harder, pitched forward
//   glide    wings spread, a slow banking sway (loops)          dive  the stoop: wings swept back, nose down (loops)
//   attack   the dive-peck: a stoop with the feet thrown forward and the bill stabbing, then a hard pull-up (strike in
//            extras; the bat AI's 'bite' falls back to it)
//   perch    standing on the feet (on y = 0), wings folded, breathing and glancing about (loops)
//   takeoff  from the perch: a crouch, the wings open and beat, the feet leave at `liftAt`; it ends at the top of the
//            beat in the flight frame (the AI raises the bird from the roost)
//   land     from flight: the wings flare, the feet reach down and touch at `touchAt`, the wings fold into the perch
//   hit      a stalled beat, knocked up and back            die  tumbles onto its back, wings crumpled (held)
// usage: node skua.mjs [source.glb] [out.glb] [--dbg=<path> writes there instead, plus an uncompressed copy]
//        [--texdbg with --dbg: the painted atlas and the part map as PNGs] [--partpaint paints the parts in flat colours]
//        [--check skin stretch and ground per clip, --where the worst edge] [--foldcheck the fold's bone directions]
//        [--debugclips adds 'foldtest' (the fold from 0 to 1)]
import { MeshoptSimplifier } from 'meshoptimizer';
import { statSync } from 'node:fs';
import { simplifyPrim } from '../../envlib.mjs';
import { load, dropLoose, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds, skinnedPoints,
  X, Y, Z, deg, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/act5/skua/model.glb', OUT = new URL('../../../src/assets/creatures/skua.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const TEXDBG = process.argv.includes('--texdbg') && DBG;
const PARTPAINT = process.argv.includes('--partpaint');   // debug: wing top green/teal, wing underside magenta/orange, body grey
const SPAN = 1.4;      // wing tip to wing tip in the glide, metres (the lead's pick)
const TRIS = 2400;     // the bird; the code-built legs come on top
const FPS = 30;
const GLIDE_T = 4.6;   // the source clip's held glide
const doc = await load(SRC);
const R = doc.getRoot(), buf = R.listBuffers()[0];
dropLoose(doc);
const SRCA = R.listAnimations()[0];
const body = byName(doc, 'Object_7');

// ---------- 1. rest = the bind pose, so the skin's matrices and the nodes agree ----------
{
  const skin = R.listSkins()[0], js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
  const W = worlds(doc, locals(doc, null, 0)), M = W.get(body);
  const Wb = new Map(js.map((j, i) => [j, M.clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16).invert())]));
  const visit = (n, pw) => {
    let w;
    if (Wb.has(n)) {
      w = Wb.get(n);
      const L = pw.clone().invert().multiply(w), T = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
      L.decompose(T, Q, S);
      n.setTranslation(T.toArray()).setRotation(Q.normalize().toArray()).setScale([1, 1, 1]);
    } else w = pw.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale())));
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of R.getDefaultScene().listChildren()) visit(n, new THREE.Matrix4());
}
// ---------- 2. rig: the weighted bones, named ----------
slimRig(doc);
const NAMES = { 'Back-1': 'pelvis', 'Back-2': 'spine', 'Back-3': 'chest', Neck: 'neck', Head: 'head', Tail: 'tail',
  'L-Wing-1': 'arm_L', 'L-Wing-2': 'forearm_L', 'L-Wing-3': 'hand_L', 'L-Wing-4': 'tip_L', 'R-Wing-1': 'arm_R', 'R-Wing-2': 'forearm_R', 'R-Wing-3': 'hand_R', 'R-Wing-4': 'tip_R' };
for (const n of R.listNodes()) { const m = /^Bn-(.+)_\d+$/.exec(n.getName()); if (m && NAMES[m[1]]) n.setName(NAMES[m[1]]); }
const B = (n) => { const x = byName(doc, n); if (!x) throw new Error('no bone ' + n); return x; };
const PELVIS = B('pelvis');
const SIDES = [['L', 1], ['R', -1]];
const pos = (W, n) => new THREE.Vector3().setFromMatrixPosition(W.get(typeof n === 'string' ? B(n) : n));
const restAlongW = (W, j) => { const c = j.listChildren().find((x) => /^(forearm|hand|tip)_/.test(x.getName())); return c ? pos(W, c).sub(pos(W, j)).normalize() : pos(W, j).sub(pos(W, R.listNodes().find((q) => q.listChildren().includes(j)))).normalize(); };
const wq = (W, n) => { const q = new THREE.Quaternion(); W.get(typeof n === 'string' ? B(n) : n).decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };

// ---------- 3. scale and place; the rest pose becomes the source's glide ----------
{
  const root = doc.createNode('creature'), sc = R.getDefaultScene();
  for (const k of sc.listChildren()) { sc.removeChild(k); root.addChild(k); }
  sc.addChild(root);
  root.setRotation(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2).toArray());
  // the glide frame's local transforms become the rest
  const G = locals(doc, SRCA, GLIDE_T);
  for (const ch of SRCA.listChannels()) { const n = ch.getTargetNode(), l = G.get(n); n.setTranslation(l.p.toArray()).setRotation(l.q.normalize().toArray()).setScale([1, 1, 1]); }
  let b = bounds(doc, null, 0, 1);
  const s = SPAN / (b.max.x - b.min.x); root.setScale([s, s, s]);
  const W = worlds(doc, locals(doc, null, 0));
  const c = pos(W, 'arm_L').add(pos(W, 'arm_R')).multiplyScalar(0.5);
  b = bounds(doc, null, 0, 1);
  root.setTranslation([-c.x, -b.min.y, -c.z]);
  b = bounds(doc, null, 0, 1);
  console.log('rest (glide) bounds', b.min.toArray().map((v) => +v.toFixed(3)), b.max.toArray().map((v) => +v.toFixed(3)));
}
const W0 = worlds(doc, locals(doc, null, 0));

// ---------- 4. the full-resolution surface, kept to paint from (rest pose, metres; dominant bone per vertex) ----------
const RAWM = (() => {
  const p = body.getMesh().listPrimitives()[0], js = R.listSkins()[0].listJoints().map((j) => j.getName());
  const J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0'), je = [], we = [];
  const dom = []; for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); Wt.getElement(i, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; dom.push(js[je[b]]); }
  const P = skinnedPoints(doc, W0, 1), idx = p.getIndices().getArray().slice();
  // the source's own normals, skinned (face winding is not consistent across its parts)
  const N0 = p.getAttribute('NORMAL'), skin = R.listSkins()[0], sj = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
  const Ms = sj.map((j, k) => new THREE.Matrix3().setFromMatrix4(W0.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, k * 16))));
  const nrm = P.map((_, i) => { const n = new THREE.Vector3().fromArray(N0.getElement(i, [])), acc = new THREE.Vector3(); J.getElement(i, je); Wt.getElement(i, we); for (let k = 0; k < 4; k++) if (we[k] > 0) acc.addScaledVector(n.clone().applyMatrix3(Ms[je[k]]), we[k]); return acc.normalize(); });
  return { P, nrm, uv: p.getAttribute('TEXCOORD_0').getArray().slice(), idx, dom };
})();

// the wing's leading and trailing edges per span (rest pose; |x| in 0.05 m bins)
const EDGE = Array.from({ length: 16 }, () => ({ lead: -9, trail: 9 }));
RAWM.P.forEach((q, i) => { if (!/arm|forearm|hand|tip/.test(RAWM.dom[i])) return; const k = Math.min(15, Math.round(Math.abs(q.x) / 0.05)); EDGE[k].lead = Math.max(EDGE[k].lead, q.z); EDGE[k].trail = Math.min(EDGE[k].trail, q.z); });
for (let k = 0; k < 16; k++) if (EDGE[k].lead < -1) EDGE[k] = { ...EDGE[k - 1] };
const edgeAt = (u) => { const f = Math.min(14.999, Math.max(0, u / 0.05)), i = Math.floor(f), t = f - i; return { lead: EDGE[i].lead + (EDGE[i + 1].lead - EDGE[i].lead) * t, trail: EDGE[i].trail + (EDGE[i + 1].trail - EDGE[i].trail) * t }; };
const chordAt = (q) => { const e = edgeAt(Math.abs(q.x)); return Math.min(1, Math.max(0, (e.lead - q.z) / Math.max(0.02, e.lead - e.trail))); };

// ---------- 5. thin ----------
await MeshoptSimplifier.ready;
for (const p of body.getMesh().listPrimitives()) for (const s of ['TANGENT', 'TEXCOORD_1', 'COLOR_0']) p.setAttribute(s, null);
{
  const p = body.getMesh().listPrimitives()[0], before = p.getIndices().getCount() / 3;
  const mode = simplifyPrim(p, TRIS / before, 0.02);
  console.log('simplify', before, '->', p.getIndices().getCount() / 3, mode);
}

// ---------- 6. legs: built in code on new bones (rest pose = standing under the level body) ----------
// Each leg: a feathered tibia stub from the hip (inside the body) to the heel, the black tarsus to the foot, three
// webbed toes. Geometry is placed in the rest pose's world space and bound with the pelvis's skinning matrix, so it
// sits in the same space as the body's vertices.
const LEGUV = { leg: [0.02, 0.02, 0.06, 0.06], tibia: [0.08, 0.02, 0.12, 0.06] };   // free corner of the atlas (u0, v0, u1, v1)
const LEG = { hip: [0.03, 0.04, -0.05], heel: [0.034, -0.012, -0.068], ankle: [0.038, -0.082, -0.03], toes: [[-26, 0.047], [0, 0.054], [26, 0.042]] };
{
  const skin = R.listSkins()[0], p = body.getMesh().listPrimitives()[0];
  const js = skin.listJoints(), ibmArr = skin.getInverseBindMatrices().getArray();
  const pi = js.indexOf(PELVIS);
  const Kp = W0.get(PELVIS).clone().multiply(new THREE.Matrix4().fromArray(ibmArr, pi * 16)), KpInv = Kp.clone().invert();
  const KpN = new THREE.Matrix3().getNormalMatrix(KpInv);
  const newJ = [], newIBM = [];
  const addJoint = (name, parent, at) => {
    const pw = worlds(doc, locals(doc, null, 0)).get(parent);
    const n = doc.createNode(name).setTranslation(at.clone().applyMatrix4(pw.clone().invert()).toArray());
    parent.addChild(n);
    const w = worlds(doc, locals(doc, null, 0)).get(n);
    newJ.push(n); newIBM.push(w.clone().invert().multiply(Kp));
    return js.length + newJ.length - 1;
  };
  const V = { pos: [], nrm: [], uv: [], j: [], w: [] }, I = [];
  const vert = (pp, nn, uv, jw) => { V.pos.push(pp.clone().applyMatrix4(KpInv)); V.nrm.push(nn.clone().applyMatrix3(KpN).normalize()); V.uv.push(uv); const j = [0, 0, 0, 0], w = [0, 0, 0, 0]; jw.forEach(([a, b], k) => { j[k] = a; w[k] = b; }); V.j.push(j); V.w.push(w); return V.pos.length - 1; };
  const cell = (name, u, v) => { const c = LEGUV[name]; return [c[0] + (c[2] - c[0]) * u, c[1] + (c[3] - c[1]) * v]; };
  // a tube along rings [{c, rx, rz (radii across and along the body), jw, v}], `sides` around, no caps
  const tube = (rings, sides, uvName) => {
    const base = V.pos.length;
    rings.forEach((r, i) => {
      const a = (rings[Math.min(i + 1, rings.length - 1)].c.clone().sub(rings[Math.max(0, i - 1)].c)).normalize();
      const s = new THREE.Vector3(1, 0, 0).projectOnPlane(a).normalize(), f = a.clone().cross(s).normalize();
      for (let k = 0; k < sides; k++) {
        const th = (2 * Math.PI * k) / sides, d = s.clone().multiplyScalar(Math.cos(th) * r.rx).add(f.clone().multiplyScalar(Math.sin(th) * r.rz));
        vert(r.c.clone().add(d), d.clone().normalize(), cell(uvName, k / sides, r.v), r.jw);
      }
    });
    // wound so each face's front is outside (three.js turns a double-sided face's normal by its winding)
    const face = (a, b, c) => { const n = V.pos[b].clone().sub(V.pos[a]).cross(V.pos[c].clone().sub(V.pos[a])); if (n.dot(V.nrm[a].clone().add(V.nrm[b]).add(V.nrm[c])) >= 0) I.push(a, b, c); else I.push(a, c, b); };
    for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k, b = base + i * sides + ((k + 1) % sides), c = a + sides, d = b + sides;
      face(a, c, b); face(b, c, d);
    }
  };
  for (const [s, sg] of SIDES) {
    const v3 = (a) => new THREE.Vector3(a[0] * sg, a[1], a[2]);
    const H = v3(LEG.hip), K = v3(LEG.heel), A = v3(LEG.ankle);
    const jT = addJoint('thigh_' + s, PELVIS, H), jS = addJoint('shank_' + s, newJ.at(-1), K), jF = addJoint('foot_' + s, newJ.at(-1), A);
    // tibia: feathered, brown (the body's colour), from inside the belly to just below it
    tube([{ c: H, rx: 0.014, rz: 0.016, jw: [[jT, 1]], v: 0 }, { c: K.clone().add(new THREE.Vector3(0, 0.006, 0)), rx: 0.0105, rz: 0.012, jw: [[jT, 0.6], [jS, 0.4]], v: 1 }], 5, 'tibia');
    // tarsus: black, flattened sideways, a little thicker at the heel
    const M = K.clone().lerp(A, 0.5);
    tube([{ c: K, rx: 0.0062, rz: 0.0088, jw: [[jT, 0.35], [jS, 0.65]], v: 0 }, { c: M, rx: 0.0052, rz: 0.0074, jw: [[jS, 1]], v: 0.5 }, { c: A.clone().add(new THREE.Vector3(0, 0.003, 0)), rx: 0.0055, rz: 0.0068, jw: [[jS, 0.6], [jF, 0.4]], v: 1 }], 6, 'leg');
    // the foot: three toes (thin three-sided tubes) and the web between them, flat on the ground
    const tips = LEG.toes.map(([a, l]) => A.clone().add(new THREE.Vector3(Math.sin(a * deg * sg) * l, -0.004, Math.cos(a * deg) * l)));
    for (const tp of tips) tube([{ c: A.clone().add(new THREE.Vector3(0, 0.001, 0)), rx: 0.0042, rz: 0.004, jw: [[jF, 1]], v: 0 }, { c: tp, rx: 0.0022, rz: 0.002, jw: [[jF, 1]], v: 1 }], 3, 'leg');
    const up = new THREE.Vector3(0, 1, 0), a0 = vert(A.clone().add(new THREE.Vector3(0, -0.002, 0.004)), up, cell('leg', 0.5, 0.1), [[jF, 1]]);
    const t = tips.map((tp) => vert(tp.clone().add(new THREE.Vector3(0, 0.0005, 0)), up, cell('leg', 0.5, 0.9), [[jF, 1]]));
    const web = (i, k) => { const m = tips[i].clone().lerp(tips[k], 0.5).lerp(A, 0.32); return vert(m.setY(A.y - 0.003), up, cell('leg', 0.5, 0.6), [[jF, 1]]); };
    const w01 = web(0, 1), w12 = web(1, 2);
    const tri = (a, b, c) => { const n = V.pos[b].clone().sub(V.pos[a]).cross(V.pos[c].clone().sub(V.pos[a])); if (n.dot(V.nrm[a]) >= 0) I.push(a, b, c); else I.push(a, c, b); };
    // (wound so the top faces up in the rest pose's world; the material is double-sided anyway)
    tri(a0, t[0], w01); tri(a0, w01, t[1]); tri(a0, t[1], w12); tri(a0, w12, t[2]);
  }
  // append to the body's primitive
  const n0 = p.getAttribute('POSITION').getCount();
  const cat = (sem, type, Arr, extra) => { const a = p.getAttribute(sem), e = [], out = []; for (let i = 0; i < a.getCount(); i++) out.push(...a.getElement(i, e)); out.push(...extra); p.setAttribute(sem, doc.createAccessor().setType(type).setArray(new Arr(out)).setBuffer(buf)); };
  cat('POSITION', 'VEC3', Float32Array, V.pos.flatMap((v) => v.toArray()));
  cat('NORMAL', 'VEC3', Float32Array, V.nrm.flatMap((v) => v.toArray()));
  cat('TEXCOORD_0', 'VEC2', Float32Array, V.uv.flat());
  cat('JOINTS_0', 'VEC4', Uint16Array, V.j.flat());
  cat('WEIGHTS_0', 'VEC4', Float32Array, V.w.flat());
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array([...p.getIndices().getArray(), ...I.map((i) => i + n0)])).setBuffer(buf));
  for (const n of newJ) skin.addJoint(n);
  const ib = new Float32Array((js.length + newJ.length) * 16); ib.set(ibmArr); newIBM.forEach((m, i) => m.toArray(ib, (js.length + i) * 16));
  skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ib).setBuffer(buf));
  console.log('legs', V.pos.length, 'vertices', I.length / 3, 'triangles; total', p.getIndices().getCount() / 3);
}

// ---------- 6b. feather and tail-fan bones ----------
// A gull folds its wing like a fan: the flight feathers swing round to lie along the body. A rigid four-bone wing cannot
// (the inner wing is 0.2 m deep, the body 0.13 m wide), so each wing bone gets a feather child at the middle of its
// length that carries the trailing part of its skin, blended in across the chord; folding turns them about 90 degrees
// so every feather points back. The tail fan gets two halves that close it on the perch. In flight they stay at rest.
const TAIL_PIVOT = V3c(0, 0, -0.27);
function V3c(x, y, z) { return new THREE.Vector3(x, y, z); }
{
  const skin = R.listSkins()[0], p = body.getMesh().listPrimitives()[0];
  const js = skin.listJoints(), ibmArr = skin.getInverseBindMatrices().getArray();
  const Wr = worlds(doc, locals(doc, null, 0));
  const K = (j) => Wr.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibmArr, js.indexOf(j) * 16));
  const newJ = [], newIBM = [], child = new Map();
  const add = (name, parent, at) => {
    const pw = Wr.get(parent), n = doc.createNode(name).setTranslation(at.clone().applyMatrix4(pw.clone().invert()).toArray());
    parent.addChild(n);
    const w = pw.clone().multiply(new THREE.Matrix4().makeTranslation(...n.getTranslation()));
    newJ.push(n); newIBM.push(w.clone().invert().multiply(K(parent))); child.set(parent, js.length + newJ.length - 1);
  };
  for (const [s] of SIDES) for (const bn of ['arm', 'forearm', 'hand', 'tip']) {
    const j = B(`${bn}_${s}`), a = pos(Wr, j);
    const b = bn === 'tip' ? a.clone().add(restAlongW(Wr, j).multiplyScalar(0.06)) : pos(Wr, `${{ arm: 'forearm', forearm: 'hand', hand: 'tip' }[bn]}_${s}`);
    add(`fea${bn[0].toUpperCase() + bn.slice(1)}_${s}`, j, a.clone().lerp(b, 0.5));
  }
  const tailN = B('tail');
  const ty = (() => { let y = 0, n = 0; RAWM.P.forEach((q, i) => { if (RAWM.dom[i] === 'tail' && Math.abs(q.z - TAIL_PIVOT.z) < 0.03) { y += q.y; n++; } }); return y / Math.max(1, n); })();
  TAIL_PIVOT.y = ty;
  for (const [s, sg] of SIDES) { add(`tailHalf_${s}`, tailN, TAIL_PIVOT); child.set('tail' + s, js.length + newJ.length - 1); }
  child.delete(tailN);
  // reweight
  const J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0'), n = J.getCount();
  const Pr = skinnedPoints(doc, Wr, 1), je = [], we = [];
  const jOut = new Uint16Array(n * 4), wOut = new Float32Array(n * 4);
  const all = [...js, ...newJ];
  let moved = 0;
  for (let i = 0; i < n; i++) {
    J.getElement(i, je); Wt.getElement(i, we);
    const q = Pr[i], inf = [];
    // (faded in away from the body, so the wing's root stays with the arm)
    const fW = Math.abs(q.x) > 0.07 ? smooth((chordAt(q) - 0.18) / 0.42) * smooth((Math.abs(q.x) - 0.09) / 0.09) : 0;
    const fT = smooth((Math.abs(q.x) - 0.004) / 0.03) * smooth((TAIL_PIVOT.z - q.z) / 0.04);
    for (let k = 0; k < 4; k++) {
      if (!(we[k] > 0)) continue;
      const jn = all[je[k]], nm = jn.getName();
      if (/^(arm|forearm|hand|tip)_/.test(nm) && fW > 0) { inf.push([je[k], we[k] * (1 - fW)], [child.get(jn), we[k] * fW]); moved++; }
      else if (nm === 'tail' && fT > 0) inf.push([je[k], we[k] * (1 - fT)], [child.get('tail' + (q.x > 0 ? 'L' : 'R')), we[k] * fT]);
      else inf.push([je[k], we[k]]);
    }
    const m = new Map(); for (const [j, w] of inf) m.set(j, (m.get(j) || 0) + w);
    const top = [...m].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((a, [, w]) => a + w, 0);
    top.forEach(([j, w], k) => { jOut[i * 4 + k] = j; wOut[i * 4 + k] = w / sum; });
  }
  p.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(jOut).setBuffer(buf));
  p.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(wOut).setBuffer(buf));
  for (const nj of newJ) skin.addJoint(nj);
  const ib = new Float32Array((js.length + newJ.length) * 16); ib.set(ibmArr); newIBM.forEach((m, i) => m.toArray(ib, (js.length + i) * 16));
  skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ib).setBuffer(buf));
  // the rest pose must not move: check
  const P2 = skinnedPoints(doc, worlds(doc, locals(doc, null, 0)), 1); let worst = 0; P2.forEach((q, i) => { worst = Math.max(worst, q.distanceTo(Pr[i])); });
  console.log('feather bones', newJ.map((j) => j.getName()).join(' '), '; wing vertices reweighted', moved, '; rest moved by', worst.toExponential(2));
}

// ---------- 7. the look: a great skua ----------
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm = (x, y, z, o = 4) => { let a = 0, s = 0.5, f = 1; for (let i = 0; i < o; i++) { a += s * vnoise(x * f, y * f, z * f); s *= 0.5; f *= 2.03; } return a / (1 - Math.pow(0.5, o)); };
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));
const shade = (c, k) => c.map((v) => v * k);
const sstep = (a, b, x) => smooth((x - a) / (b - a));
// feathers as a jittered cell pattern (u, v in metres, v running back along the feather): the nearest cell's id, the
// texel's offset from its centre (cell units) and its distance to the next cell's border (the overlap shadow)
function feather(u, v, cu, cv, seed) {
  u += 0.25 * cu * (fbm(u * 60, v * 60, seed) - 0.5); v += 0.25 * cv * (fbm(u * 60 + 9, v * 60, seed) - 0.5);
  const gu = u / cu, gv = v / cv, iu = Math.floor(gu), iv = Math.floor(gv);
  let d1 = 9, d2 = 9, bi = 0, bj = 0, bx = 0, by = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const ci = iu + a, cj = iv + b, px = ci + 0.5 + 0.36 * (hash(ci, cj, seed) - 0.5) * 2, py = cj + 0.5 + 0.3 * (hash(ci, cj, seed + 1) - 0.5) * 2;
    const dx = gu - px, dy = gv - py, d = Math.hypot(dx, dy);
    if (d < d1) { d2 = d1; d1 = d; bi = ci; bj = cj; bx = dx; by = dy; } else if (d < d2) d2 = d;
  }
  return { id: hash(bi, bj, seed + 2), id2: hash(bi, bj, seed + 3), dx: bx, dy: by, edge: d2 - d1 };
}
// a feather's look: dark, a pale buff or rufous tip on some (strength k), a thin shadow where the next one overlaps
function plume(f, base, k, o = {}) {
  let c = shade(base, 0.88 + 0.22 * f.id2);
  // feathers lie like shingles: the shadow falls on the front of each, under the tip of the one before it
  const border = 1 - sstep(0.0, 0.09, f.edge);
  c = shade(c, 1 - 0.28 * border * sstep(0.05, -0.25, f.dy));
  // some are tipped pale: a narrow fringe round the back of the vane, a spot at the shaft on others
  const fringe = border * sstep(0.0, 0.3, f.dy), spot = Math.exp(-((f.dx / 0.14) ** 2) - (((f.dy - 0.18) / 0.22) ** 2));
  const pale = (f.id > (o.rare ?? 0.45) ? 1 : 0.15) * k;
  c = mixc(c, mixc(C.rufous, C.buff, f.id2), pale * Math.max(fringe * 0.8, (f.id2 > 0.55 ? spot : 0) * 0.55));
  if (o.shaft) c = mixc(c, C.buff, o.shaft * (1 - sstep(0.025, 0.07, Math.abs(f.dx))) * sstep(-0.35, 0.1, f.dy) * 0.45);
  return c;
}
const C = {
  dark: [52, 42, 35], mid: [78, 62, 50], rufous: [124, 93, 66], buff: [160, 134, 100], gold: [170, 142, 96],
  cap: [30, 24, 20], under: [62, 50, 42], cinnamon: [80, 62, 48], quill: [33, 28, 25], qedge: [58, 50, 44],
  underFlight: [74, 68, 62], white: [236, 233, 225], bill: [27, 26, 27], eye: [12, 10, 9], iris: [52, 34, 22], leg: [20, 19, 19]
};
const mat = body.getMesh().listPrimitives()[0].getMaterial();
let PAINT = null;   // the painted 1024 atlas (PNG), encoded for shipping after finish()
{
  const tex = mat.getBaseColorTexture();
  const { data: srcPx, info } = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.width, out = Buffer.alloc(N * N * 3);
  // ----- rasterise the surface into the atlas -----
  const P = new Float32Array(N * N * 3), NR = new Float32Array(N * N * 3), bone = new Array(N * N).fill(null), src = new Uint8Array(N * N * 3);
  const { P: vp, nrm: vn, uv, idx, dom } = RAWM;
  // UV islands (triangles joined by shared UV corners); an island faces up or down as its normals do on the whole, and
  // every texel takes its island's side (the per-texel normal turns sideways along the wing's rim)
  const isl = (() => {
    const par = new Map(), key = (i) => Math.round(uv[i * 2] * 8192) + ':' + Math.round(uv[i * 2 + 1] * 8192);
    const find = (a) => { while (par.get(a) !== a) { par.set(a, par.get(par.get(a))); a = par.get(a); } return a; };
    const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par.set(a, b); };
    for (let i = 0; i < uv.length / 2; i++) { const k = key(i); if (!par.has(k)) par.set(k, k); }
    for (let t = 0; t < idx.length; t += 3) { uni(key(idx[t]), key(idx[t + 1])); uni(key(idx[t]), key(idx[t + 2])); }
    const vote = new Map(); for (let t = 0; t < idx.length; t += 3) { const r = find(key(idx[t])); let ny = 0; for (let k = 0; k < 3; k++) ny += vn[idx[t + k]].y; vote.set(r, (vote.get(r) || 0) + ny); }
    return { tri: (t) => find(key(idx[t])), up: (r) => vote.get(r) > 0, n: vote.size };
  })();
  const UP = new Int8Array(N * N);
  for (let t = 0; t < idx.length; t += 3) {
    const I = [idx[t], idx[t + 1], idx[t + 2]], v = I.map((i) => [uv[i * 2] * N, uv[i * 2 + 1] * N]);
    const ar = (v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[2][0] - v[0][0]) * (v[1][1] - v[0][1]); if (Math.abs(ar) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(v[0][0], v[1][0], v[2][0]))), x1 = Math.min(N - 1, Math.ceil(Math.max(v[0][0], v[1][0], v[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(v[0][1], v[1][1], v[2][1]))), y1 = Math.min(N - 1, Math.ceil(Math.max(v[0][1], v[1][1], v[2][1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((v[1][0] - px) * (v[2][1] - py) - (v[2][0] - px) * (v[1][1] - py)) / ar, w1 = ((v[2][0] - px) * (v[0][1] - py) - (v[0][0] - px) * (v[2][1] - py)) / ar, w2 = 1 - w0 - w1;
      if (w0 < -0.03 || w1 < -0.03 || w2 < -0.03) continue;
      const k = y * N + x;
      if (bone[k] && (w0 < 0 || w1 < 0 || w2 < 0)) continue;
      const ws = [w0, w1, w2];
      for (let c = 0; c < 3; c++) { P[k * 3 + c] = ws[0] * vp[I[0]].getComponent(c) + ws[1] * vp[I[1]].getComponent(c) + ws[2] * vp[I[2]].getComponent(c); NR[k * 3 + c] = ws[0] * vn[I[0]].getComponent(c) + ws[1] * vn[I[1]].getComponent(c) + ws[2] * vn[I[2]].getComponent(c); }
      bone[k] = dom[I[ws.indexOf(Math.max(...ws))]]; UP[k] = isl.up(isl.tri(t)) ? 1 : -1;
    }
  }
  // ----- landmarks from the source paint: the yellow bill, the black eyes; the wing's edges per span -----
  const billPts = [], eyePts = [];
  for (let k = 0; k < N * N; k++) {
    if (!bone[k]) continue;
    const r = srcPx[k * 3], g = srcPx[k * 3 + 1], b = srcPx[k * 3 + 2], z = P[k * 3 + 2];
    if (r > 150 && g > 90 && b < 110 && r > b + 70 && z > 0.12) billPts.push(k);
    if (r + g + b < 150 && z > 0.1 && Math.abs(P[k * 3]) < 0.04) eyePts.push(new THREE.Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]));
  }
  const eyes = SIDES.map(([, sg]) => { const q = eyePts.filter((e) => e.x * sg > 0), c = new THREE.Vector3(); q.forEach((e) => c.add(e)); return c.multiplyScalar(1 / Math.max(1, q.length)); });
  const billSet = new Set(billPts); let billZ0 = 1;
  for (const k of billPts) billZ0 = Math.min(billZ0, P[k * 3 + 2]);
  console.log('eyes', eyes.map((e) => e.toArray().map((v) => +v.toFixed(3))), 'bill texels', billPts.length, 'from z', billZ0.toFixed(3));
  const WRIST = pos(W0, 'hand_L').x, WTIP = SPAN / 2;
  const PIV = new THREE.Vector2(WRIST - 0.02, edgeAt(WRIST).lead - 0.035);   // the primaries fan from about here
  // ----- the paint -----
  const dbgPart = TEXDBG ? Buffer.alloc(N * N * 3) : null;
  for (let k = 0; k < N * N; k++) {
    if (!bone[k]) continue;
    const p = new THREE.Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]), n = new THREE.Vector3(NR[k * 3], NR[k * 3 + 1], NR[k * 3 + 2]).normalize();
    // (the source's tail fan is inside out: its upper layer faces down, so there the test is reversed)
    const b = bone[k], ax = Math.abs(p.x), top = (UP[k] > 0) !== (b === 'tail' && p.z < -0.28);
    const g1 = fbm(p.x * 30 + 5, p.y * 30, p.z * 30), g2 = fbm(p.x * 110, p.y * 110 + 3, p.z * 110), grain = 0.93 + 0.14 * g2;
    let c, part;
    const wingBone = /arm|forearm|hand|tip/.test(b);
    if (wingBone && ax > 0.075) {
      // ----- wing -----
      const e = edgeAt(ax), v = Math.min(1, Math.max(0, (e.lead - p.z) / Math.max(0.02, e.lead - e.trail)));   // 0 leading, 1 trailing edge
      const hand = sstep(WRIST - 0.03, WRIST + 0.02, ax);
      const cov = (top ? 0.52 : 0.46) - 0.2 * hand;                                                   // where the coverts end
      const d = new THREE.Vector2(ax, p.z).sub(PIV), r = d.length(), phi = Math.atan2(-d.y, d.x);   // primaries' fan
      if (v < cov) {
        part = 1;
        if (top) {
          // coverts: small dark feathers in loose rows, some tipped rufous or buff
          const f = feather(ax, e.lead - p.z, 0.02, 0.022 + 0.014 * v, 7);
          c = plume(f, mixc(C.dark, C.mid, 0.2 + 0.4 * g1), 0.8 - 0.5 * hand);
          if (v < 0.06) c = mixc(c, C.dark, 0.6);                                                      // the leading edge
        } else {
          // underwing coverts: dark, softly mottled
          c = shade(mixc(C.dark, C.under, 0.35 + 0.4 * g1), 0.92 + 0.1 * g2);
        }
      } else if (hand < 0.5) {
        // secondaries: long dark feathers along the chord, darker where one overlaps the next
        part = 2;
        const fw = 0.03, fi = Math.floor(ax / fw), cu = (ax / fw) % 1, id = hash(fi, 3, 11);
        c = top ? mixc(C.quill, C.qedge, 0.15 + 0.25 * id + 0.1 * g1) : mixc(C.underFlight, C.quill, 0.3 + 0.2 * id);
        c = shade(c, 1 - 0.22 * (1 - sstep(0, 0.07, cu)) - 0.08 * sstep(0.85, 1, cu));
        c = mixc(c, mixc(C.mid, C.rufous, 0.5), top ? 0.12 * sstep(0.9, 1, v) : 0);             // faint warm tips
      } else {
        // primaries: a fan of long blackish feathers from the hand, white at the base (the flash), pale shafts there
        part = 3;
        const fi = Math.floor(phi / 0.13), cu = (phi / 0.13) % 1, id = hash(fi + 40, 5, 13);
        c = top ? mixc(C.quill, C.qedge, 0.15 + 0.25 * cu * id) : mixc(C.underFlight, C.quill, 0.35);
        c = shade(c, 1 - 0.22 * (1 - sstep(0, 0.08, cu)));
        // the flash: bases of the primaries, a narrow crescent above, a broad one below
        const r0 = top ? 0.065 : 0.045, r1 = top ? 0.115 : 0.155, wob = 0.012 * (fbm(phi * 6, 1, 2) - 0.5);
        let fl = sstep(r0 - 0.012, r0 + 0.006, r + wob) * (1 - sstep(r1 - 0.02, r1 + 0.012, r + wob));
        if (top) fl *= 0.55 + 0.45 * Math.max(sstep(0.3, 0.5, cu) * (1 - sstep(0.62, 0.8, cu)), sstep(0.2, 0.32, id));
        const shaft = (1 - sstep(0.03, 0.06, Math.abs(cu - 0.42))) * (1 - sstep(r1 - 0.01, r1 + 0.03, r)) * sstep(r0 - 0.02, r0, r);
        c = mixc(c, C.white, Math.max(fl * (0.85 + 0.15 * g2), shaft * 0.45));
        c = mixc(c, C.dark, (1 - sstep(cov, cov + 0.05, v)) * 0.5);
      }
      // the wing's root sits in the body's shadow
      c = shade(c, 1 - 0.16 * (1 - sstep(0.08, 0.16, ax)));
    } else if (p.z < -0.29 && b === 'tail') {
      // ----- tail: blackish-brown, its feathers fanning from the base -----
      part = 4;
      const a = Math.atan2(p.x, -(p.z + 0.27)), fi = Math.floor(a / 0.16 + 10), cu = (a / 0.16 + 10) % 1;
      c = top ? mixc(C.quill, C.dark, 0.3 + 0.3 * hash(fi, 1, 17)) : mixc(C.dark, C.under, 0.25);
      c = shade(c, 1 - 0.22 * (1 - sstep(0, 0.12, cu)));
      if (!top) c = mixc(c, C.under, 1 - sstep(-0.36, -0.31, -p.z - 0.0));                         // undertail coverts
    } else if (p.z > 0.075) {
      // ----- head and neck -----
      part = 5;
      const eye = eyes[p.x > 0 ? 0 : 1], de = p.distanceTo(eye);
      const capK = sstep(eye.y - 0.012, eye.y + 0.006, p.y) * sstep(0.095, 0.125, p.z) + (1 - sstep(0.02, 0.045, p.y - eye.y + 0.03)) * 0;
      const streak = fbm(p.x * 90, p.y * 200, p.z * 40);
      c = mixc(C.mid, C.dark, 0.35 + 0.3 * g1);
      // the neck's gold streaks, on its sides and nape
      const neckK = (1 - sstep(0.1, 0.13, p.z)) * sstep(0.2, 0.6, Math.abs(n.x) + Math.max(0, n.y) * 0.6) * (top ? 1 : 0.5);
      c = mixc(c, C.gold, neckK * sstep(0.52, 0.7, streak) * 0.9);
      c = mixc(c, C.cap, capK * 0.9);
      // the face: a little paler and warmer below the eye, dark lores
      if (!top || p.y < eye.y - 0.006) c = mixc(c, C.mid, 0.25);
      if (de < 0.0078) { const t = de / 0.0078; c = t < 0.55 ? C.eye : t < 0.85 ? mixc(C.iris, C.eye, 0.4) : mixc(C.cap, C.eye, 0.5); }
      if (billSet.has(k) || (p.z > billZ0 + 0.004 && Math.abs(p.x) < 0.02 && p.y < eye.y + 0.002 && p.z > eye.z + 0.024)) {
        // the bill: black, a slate gleam along the culmen, the hook darkest
        part = 6;
        c = mixc(C.bill, [62, 62, 66], 0.35 * Math.max(0, n.y) * (1 - sstep(0.19, 0.205, p.z)));
      }
    } else {
      // ----- body -----
      part = 7;
      if (top && n.y > -0.2) {
        // mantle and scapulars: dark, streaked and spotted with buff and rufous (feather tips and shafts)
        const f = feather(p.x + 1, -p.z, 0.017, 0.024, 23);
        c = plume(f, mixc(C.dark, C.mid, 0.15 + 0.4 * g1), 0.9, { shaft: 0.6 * f.id2, rare: 0.4 });
      } else {
        // underparts: warm brown, paler and more cinnamon on the belly, faintly barred
        const bar = fbm(p.x * 40, p.y * 40, p.z * 140);
        c = mixc(C.under, C.cinnamon, 0.35 * sstep(-0.2, 0.0, p.z) * (1 - sstep(0.0, 0.06, p.z)) + 0.25 * g1);
        c = shade(c, 0.9 + 0.15 * bar);
        c = mixc(c, C.dark, 0.35 * (1 - sstep(-0.3, -0.2, p.z)));                                // vent and undertail darker
      }
      c = shade(c, 1 - 0.1 * (1 - sstep(-0.6, 0.2, n.y)));                                      // underside occlusion
    }
    c = shade(c, grain);
    if (PARTPAINT) { const ax2 = Math.abs(p.x); c = wingBone && ax2 > 0.075 ? (top ? [40, 200 * (ax2 < WRIST ? 1 : 0.4), 60 + 160 * (ax2 >= WRIST ? 1 : 0)] : [230, 40 + 150 * (ax2 >= WRIST ? 1 : 0), 200 * (ax2 < WRIST ? 1 : 0.3)]) : top ? [200, 30, 30] : [220, 220, 30]; }
    for (let q = 0; q < 3; q++) out[k * 3 + q] = Math.max(0, Math.min(255, c[q]));
    if (dbgPart) dbgPart.set([[0, 0, 0], [200, 120, 60], [60, 200, 60], [60, 60, 220], [200, 200, 60], [220, 60, 200], [255, 255, 255], [120, 120, 120]][part], k * 3);
  }
  // the legs' cells: black scaled tarsi and toes, brown feathered tibiae
  for (const [name, col] of [['leg', C.leg], ['tibia', C.dark]]) {
    const [u0, v0, u1, v1] = LEGUV[name];
    for (let y = Math.floor(v0 * N) - 3; y < Math.ceil(v1 * N) + 3; y++) for (let x = Math.floor(u0 * N) - 3; x < Math.ceil(u1 * N) + 3; x++) {
      const k = y * N + x, sc = name === 'leg' ? 0.85 + 0.3 * (((y >> 1) & 1) * 0.5 + 0.5 * hash(x >> 1, y >> 1, 3)) : 0.85 + 0.3 * fbm(x * 0.3, y * 0.3, 1);
      const cc = shade(col, sc); for (let q = 0; q < 3; q++) out[k * 3 + q] = cc[q]; bone[k] = 'leg';
    }
  }
  // outside the islands: their colours spread 4 texels (mip and filtering bleed), flat beyond
  {
    const cov = new Uint8Array(N * N); for (let k = 0; k < N * N; k++) cov[k] = bone[k] ? 1 : 0;
    for (let it = 0; it < 4; it++) {
      const add = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const k = y * N + x; if (cov[k]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const kk = yy * N + xx; if (cov[kk]) { add.push([k, kk]); break; } }
      }
      for (const [k, kk] of add) { for (let q = 0; q < 3; q++) out[k * 3 + q] = out[kk * 3 + q]; cov[k] = 2; }
    }
    for (let k = 0; k < N * N; k++) if (!cov[k]) out.set([48, 38, 30], k * 3);
  }
  tex.setImage(await sharp(out, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  PAINT = await sharp(out, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer();
  mat.setName('skua_feathers').setMetallicFactor(0).setRoughnessFactor(0.82).setDoubleSided(true);
  if (TEXDBG) {
    await sharp(out, { raw: { width: N, height: N, channels: 3 } }).png().toFile(DBG.replace(/\.glb$/, '_base.png'));
    await sharp(dbgPart, { raw: { width: N, height: N, channels: 3 } }).png().toFile(DBG.replace(/\.glb$/, '_parts.png'));
  }
}

// ---------- 8. clip machinery ----------
// A pose is a map node -> local {p, q, s} (lib's locals). keys(t) rotate bones about character-space axes (+Z forward,
// +X the left wing, Y up) in the bone's rest frame; aim() turns a bone so its length and a reference axis point along
// given directions; root(t) turns the whole body about a pivot and shifts it (written on the pelvis).
const restLoc = locals(doc, null, 0), restW = worlds(doc, restLoc);
const JOINTS = R.listSkins()[0].listJoints();
const named = new Map(R.listNodes().map((n) => [n.getName(), n]));
const restWQ = new Map([...restW].map(([n, m]) => { const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return [n, q]; }));
const clone = (L) => new Map([...L].map(([n, v]) => [n, { p: v.p.clone(), q: v.q.clone(), s: v.s.clone() }]));
const rest = () => clone(restLoc);
const ORIGIN = pos(restW, 'chest');
const src = (t) => { const L = locals(doc, SRCA, t); for (const n of JOINTS) if (!SRCA.listChannels().some((c) => c.getTargetNode() === n)) L.set(n, { ...restLoc.get(n), p: restLoc.get(n).p.clone(), q: restLoc.get(n).q.clone(), s: restLoc.get(n).s.clone() }); return L; };
function mix(A, Bp, w) {
  const out = new Map();
  for (const [n, a] of A) { const b = Bp.get(n), k = typeof w === 'function' ? w(n) : w; out.set(n, { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k), s: a.s.clone() }); }
  return out;
}
function applyKeys(L, k) {
  for (const [bn, rots] of Object.entries(k)) {
    const nd = named.get(bn); if (!nd) throw new Error('no bone ' + bn);
    const inv = restWQ.get(nd).clone().invert();
    for (const [axis, a] of rots) { if (!a) continue; L.get(nd).q.multiply(new THREE.Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(inv).normalize(), a * deg)); }
  }
  return L;
}
function applyRoot(L, r = {}) {
  const par = R.listNodes().find((n) => n.listChildren().includes(PELVIS));
  const parW = worlds(doc, L).get(par), pl = L.get(PELVIS);
  let w = parW.clone().multiply(new THREE.Matrix4().compose(pl.p, pl.q, pl.s));
  if (r.r) {
    const q = new THREE.Quaternion(); for (const [axis, a] of r.r) if (a) q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, a * deg));
    const pv = r.pivot || ORIGIN;
    w = new THREE.Matrix4().makeTranslation(pv.x, pv.y, pv.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pv.x, -pv.y, -pv.z)).multiply(w);
  }
  if (r.p) w = new THREE.Matrix4().makeTranslation(...r.p).multiply(w);
  const loc = parW.clone().invert().multiply(w); loc.decompose(pl.p, pl.q, pl.s); pl.s.set(1, 1, 1);
  return L;
}
const merge = (...ks) => { const o = {}; for (const k of ks) for (const [b, r] of Object.entries(k || {})) (o[b] ||= []).push(...r); return o; };
const scaleKeys = (k, f) => Object.fromEntries(Object.entries(k).map(([b, r]) => [b, r.map(([a, v]) => [a, v * f])]));
// a bone's length direction at rest (towards its child joint, or the given vector)
const CHILD = { thigh_L: 'shank_L', shank_L: 'foot_L', thigh_R: 'shank_R', shank_R: 'foot_R', arm_L: 'forearm_L', forearm_L: 'hand_L', hand_L: 'tip_L', arm_R: 'forearm_R', forearm_R: 'hand_R', hand_R: 'tip_R' };
const restAlong = (bn) => CHILD[bn] ? pos(restW, CHILD[bn]).sub(pos(restW, bn)).normalize() : bn.startsWith('foot') ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(Math.sign(pos(restW, bn).x) || 1, 0, 0);
const frame = (a, r) => { const x = a.clone().normalize(), y = r.clone().projectOnPlane(x).normalize(), z = x.clone().cross(y); return new THREE.Matrix4().makeBasis(x, y, z); };
// aim(L, [[bone, along, ref, refRest?]]): turns each bone (parents first) so its rest length direction goes along `along` and
// its rest reference axis (default +Y for wings, +X for legs) as near `ref` as it can
function aim(L, specs) {
  for (const [bn, along, ref, refRest] of specs) {
    const nd = named.get(bn), par = R.listNodes().find((n) => n.listChildren().includes(nd));
    const pq = wq(worlds(doc, L), par);
    const rr = refRest || (bn.startsWith('thigh') || bn.startsWith('shank') ? X : bn.startsWith('foot') ? Y : Y);
    const D = frame(along, ref).multiply(frame(restAlong(bn), rr).transpose());
    const q = new THREE.Quaternion().setFromRotationMatrix(D).multiply(restWQ.get(nd));
    L.get(nd).q.copy(pq.invert().multiply(q)).normalize();
  }
  return L;
}
const pts = (L, step = 3) => skinnedPoints(doc, worlds(doc, L), step);
const lowY = (L, step = 3) => pts(L, step).reduce((m, p) => Math.min(m, p.y), 1e9);
const FOOT = ['foot_L', 'foot_R'];
const feetY = (L) => { const W = worlds(doc, L); return Math.min(...FOOT.map((n) => pos(W, n).y)); };
const bodyQ = (L) => wq(worlds(doc, L), 'pelvis').multiply(restWQ.get(PELVIS).clone().invert());   // the body's turn from rest

function bake(name, o) {
  const n = Math.max(2, Math.round(o.dur * FPS) + 1), rows = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(o.dur, i / FPS);
    const L = o.pose ? o.pose(t, o.dur) : rest();
    for (const j of JOINTS) { if (j !== PELVIS) L.get(j).p.copy(restLoc.get(j).p); L.get(j).s.set(1, 1, 1); }
    rows.push(L);
  }
  if (o.loop) rows[n - 1] = rows[0];
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = Math.min(o.dur, i / FPS);
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  const write = (nd, path) => {
    const k = path === 'rotation' ? 4 : 3, arr = new Float32Array(n * k); let prev = null;
    for (let i = 0; i < n; i++) {
      if (k === 4) { const q = rows[i].get(nd).q.clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; }
      else rows[i].get(nd).p.toArray(arr, i * 3);
    }
    const smp = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(k === 4 ? 'VEC4' : 'VEC3').setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(nd).setTargetPath(path).setSampler(smp));
  };
  for (const nd of JOINTS) write(nd, 'rotation');
  write(PELVIS, 'translation');
  anim.rows = rows;
  return anim;
}

// ---------- 9. poses ----------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const bodyF = (L) => { const q = bodyQ(L); return (x, y, z) => V3(x, y, z).normalize().applyQuaternion(q); };
// legs: named poses as [along, ref] per bone, `d` in the body's frame, plain vectors in the world; blended by weights
const LEGS = {
  tuck: (d, sg) => ({ thigh: [d(0, -0.32, -1), d(1, 0, 0)], shank: [d(0, 0.1, -1), d(1, 0, 0)], foot: [d(0, 0.45, -1), d(0, 1, 0)] }),
  stand: (d, sg) => ({ thigh: [d(0.06 * sg, -1, -0.3), d(1, 0, 0)], shank: [V3(0.05 * sg, -1, 0.36), V3(1, 0, 0)], foot: [V3(0, 0, 1), V3(0, 1, 0)] }),
  crouch: (d, sg) => ({ thigh: [d(0.06 * sg, -0.75, -0.75), d(1, 0, 0)], shank: [V3(0.05 * sg, -1, 0.72), V3(1, 0, 0)], foot: [V3(0, 0, 1), V3(0, 1, 0)] }),
  reach: (d, sg) => ({ thigh: [d(0.08 * sg, -1, 0.15), d(1, 0, 0)], shank: [V3(0.07 * sg, -1, 0.3), V3(1, 0, 0)], foot: [V3(0.05 * sg, -0.35, 1), V3(0, 1, 0.3)] }),
  strike: (d, sg) => ({ thigh: [d(0.1 * sg, -0.75, 0.75), d(1, 0, 0)], shank: [d(0.06 * sg, -0.45, 1), d(1, 0, 0)], foot: [d(0.03 * sg, -0.15, 1), d(0, 1, 0.2)] }),
  dangle: (d, sg) => ({ thigh: [d(0.05 * sg, -0.8, -0.6), d(1, 0, 0)], shank: [d(0.03 * sg, -0.55, -1), d(1, 0, 0)], foot: [d(0, -0.2, -1), d(0, 1, 0)] }),
  limp: (d, sg) => ({ thigh: [d(0.3 * sg, -1, 0.25), d(1, 0, 0)], shank: [d(0.25 * sg, -1, -0.35), d(1, 0, 0)], foot: [d(0.1 * sg, -1, -0.7), d(0, 0, 1)] })
};
function legs(L, w) {
  const d = bodyF(L), specs = [];
  for (const [s, sg] of SIDES) {
    const acc = { thigh: [V3(0, 0, 0), V3(0, 0, 0)], shank: [V3(0, 0, 0), V3(0, 0, 0)], foot: [V3(0, 0, 0), V3(0, 0, 0)] };
    for (const [k, f] of Object.entries(w)) { if (!f) continue; const P = LEGS[k](d, sg); for (const b of ['thigh', 'shank', 'foot']) { acc[b][0].addScaledVector(P[b][0].clone().normalize(), f); acc[b][1].addScaledVector(P[b][1].clone().normalize(), f); } }
    // (the thigh's and shank's reference is their sideways axis, +X at rest; the foot's is its up, +Y)
    for (const b of ['thigh', 'shank', 'foot']) specs.push([`${b}_${s}`, acc[b][0], acc[b][1], b === 'foot' ? Y : X]);
  }
  return aim(L, specs);
}
const tuck = (L) => legs(L, { tuck: 1 });
// wings: the fold, per bone [along, normal] in the body's frame for the left wing (x mirrored for the right)
const FOLD = {
  arm: [V3(0.06, -0.12, -1), V3(0.4, 1, 0)], forearm: [V3(0.08, -0.16, 1), V3(0.45, 1, 0)],
  hand: [V3(-0.04, 0.22, -1), V3(0.3, 1, 0)], tip: [V3(-0.12, 0.26, -1), V3(0.2, 1, 0)]
};
const WB = ['arm', 'forearm', 'hand', 'tip'];
const FEA = { arm: -88, forearm: 92, hand: -86, tip: -50 };   // the feathers' turn in the fold (left wing; + turns the trailing edge out)
// blends the wings of pose L towards the fold by f (0..1)
function fold(L, f, T = FOLD) {
  if (f <= 0) return L;
  const W = worlds(doc, L), d = bodyF(L), specs = [];
  for (const [s, sg] of SIDES) for (const bn of WB) {
    const nm = `${bn}_${s}`, nd = B(nm), rq = wq(W, nd).multiply(restWQ.get(nd).clone().invert());
    const a0 = restAlong(nm).applyQuaternion(rq), r0 = Y.clone().applyQuaternion(rq);
    const [fa, fr] = T[bn], a1 = d(fa.x * sg, fa.y, fa.z), r1 = d(fr.x * sg, fr.y, fr.z);
    specs.push([nm, a0.multiplyScalar(1 - f).addScaledVector(a1, f), r0.multiplyScalar(1 - f).addScaledVector(r1, f), Y]);
  }
  aim(L, specs);
  // the feathers swing round to point back along the body
  const k = {}; for (const [s, sg] of SIDES) for (const bn of WB) k[`fea${bn[0].toUpperCase() + bn.slice(1)}_${s}`] = [[Y, sg * FEA[bn] * f]];
  return applyKeys(L, k);
}
const closeTail = (f) => Object.fromEntries(SIDES.map(([s, sg]) => [`tailHalf_${s}`, [[Y, sg * 24 * f]]]));

// ----- the flap: one beat of the source's flight, from the top of the stroke -----
const TIP = B('tip_L');
const tipY = (t) => pos(worlds(doc, locals(doc, SRCA, t)), TIP).y;
const tops = []; { let prev = tipY(0), cur = tipY(1 / 60); for (let t = 2 / 60; t < duration(SRCA); t += 1 / 60) { const nx = tipY(t); if (cur > prev && cur >= nx && cur > 0.2) tops.push(+(t - 1 / 60).toFixed(3)); prev = cur; cur = nx; } }
// the cleanest loop: two tops a beat apart whose poses differ least
let BEAT = null;
for (let i = 0; i + 1 < tops.length; i++) {
  const a = tops[i], b = tops[i + 1]; if (b - a > 1.6) continue;
  const La = locals(doc, SRCA, a), Lb = locals(doc, SRCA, b);
  let e = 0; for (const j of JOINTS) if (La.has(j)) e += 1 - Math.abs(La.get(j).q.dot(Lb.get(j).q));
  if (!BEAT || e < BEAT.e) BEAT = { a, b, e };
}
console.log('flap tops', tops.join(' '), '-> beat', BEAT.a, '..', BEAT.b, 'mismatch', BEAT.e.toExponential(2));
// the source beat at phase ph (0..1, 0 = top), its two ends cross-faded over the last fifth so it loops
function flapAt(ph) {
  ph = ((ph % 1) + 1) % 1;
  const T = BEAT.b - BEAT.a, L = src(BEAT.a + ph * T);
  if (ph > 0.8) return mix(L, src(Math.max(0, BEAT.a + (ph - 1) * T)), smooth((ph - 0.8) / 0.2));
  return L;
}
// the source's rest-frame pelvis travel in the beat is kept (the body bobs); amp < 1 calms the wings towards the glide
function flight(ph, o = {}) {
  let L = flapAt(ph);
  if (o.amp != null && o.amp !== 1) L = mix(rest(), L, (n) => (/arm|forearm|hand|tip/.test(n.getName()) ? o.amp : 1));
  return L;
}

// ---------- 10. clips ----------
const pitch = (a) => [[X, a]];   // + is nose down
// walk and run: the flap; run is faster, harder and pitched forward
const WALK = 0.62, RUN = 0.44;
bake('walk', { dur: WALK, loop: true, pose: (t) => tuck(applyRoot(flight(t / WALK, { amp: 0.88 }), { r: pitch(3) })) });
bake('run', { dur: RUN, loop: true, pose: (t) => tuck(applyRoot(applyKeys(flight(t / RUN), { neck: [[X, 6]], head: [[X, -6]] }), { r: pitch(9) })) });
// glide: wings spread, a slow banking sway, the head looking about
const GL = 4.2;
const soar = (t) => { const w = (2 * Math.PI * t) / GL; const k = {};
  for (const [s, sg] of SIDES) Object.assign(k, { [`arm_${s}`]: [[Z, sg * (2 + 2.5 * Math.sin(w + sg * 0.8))]], [`hand_${s}`]: [[Z, -sg * (3 + 2 * Math.sin(2 * w))]], [`tip_${s}`]: [[Z, sg * 2 * Math.sin(3 * w + sg)]] });
  return merge(k, { tail: [[Y, 6 * Math.sin(w - 0.6)], [Z, 5 * Math.sin(w)]], neck: [[Y, 9 * Math.sin(w + 1)]], head: [[Y, 12 * Math.sin(w + 0.5)], [X, 6]] }); };
bake('glide', { dur: GL, loop: true, pose: (t) => { const w = (2 * Math.PI * t) / GL; return tuck(applyRoot(applyKeys(rest(), soar(t)), { r: [[Z, 7 * Math.sin(w)], [X, 1.5 * Math.sin(2 * w)]], p: [0, 0.025 * Math.sin(2 * w), 0] })); } });
// idle: hanging in the wind. Nose up, the hands angled down and back, small quick corrections, the tail steering,
// the head steady and looking down; the feet half lowered; a short flutter of two shallow beats once a loop
const ID = 2.8;
bake('idle', { dur: ID, loop: true, pose: (t) => {
  const w = (2 * Math.PI * t) / ID, j1 = Math.sin(w * 7 + 1) * 0.6 + Math.sin(w * 11) * 0.4, j2 = Math.sin(w * 9 + 2);
  const fl = env(t, 1.55, 1.7, 2.25, 2.45), ph = (t - 1.6) / 0.32;
  let L = fl > 0 ? mix(rest(), flapAt(ph), (n) => (/arm|forearm|hand|tip/.test(n.getName()) ? 0.45 * fl : 0)) : rest();
  const k = {};
  for (const [s, sg] of SIDES) Object.assign(k, { [`arm_${s}`]: [[Z, sg * (6 + 1.6 * j1)], [Y, -sg * 4]], [`forearm_${s}`]: [[Y, -sg * 6]], [`hand_${s}`]: [[Z, -sg * (14 + 2 * j2)], [Y, sg * 14]], [`tip_${s}`]: [[Z, -sg * 4], [X, sg * 2 * j2]] });
  applyKeys(L, merge(k, { tail: [[X, 12], [Z, 9 * Math.sin(w)], [Y, 4 * Math.sin(2 * w + 1)]], neck: [[X, -10], [Y, 10 * Math.sin(w + 0.4)]], head: [[X, 26], [Y, 14 * Math.sin(w + 0.9)]] }));
  applyRoot(L, { r: [[X, -12 + 1.5 * Math.sin(2 * w)], [Z, 4 * Math.sin(w + 0.3)]], p: [0, 0.012 * Math.sin(2 * w + 0.5), 0] });
  return legs(L, { tuck: 0.6, dangle: 0.4 });
} });
// dive: the stoop. Wings swept back and half closed, the body nose-down, neck stretched, a shiver in the hands
const DV = 0.8;
const diveKeys = (t, k = 1) => { const sh = Math.sin((2 * Math.PI * t * 6) / DV), o = {};
  for (const [s, sg] of SIDES) Object.assign(o, { [`arm_${s}`]: [[Y, sg * 38 * k], [Z, -sg * 6 * k]], [`forearm_${s}`]: [[Y, -sg * 10 * k]], [`hand_${s}`]: [[Y, sg * 34 * k], [Z, sg * 4 * k]], [`tip_${s}`]: [[Y, sg * 8 * k], [Z, sg * 1.5 * sh * k]] });
  return merge(o, { neck: [[X, -8 * k]], head: [[X, -6 * k]], tail: [[X, -4 * k]] }); };
bake('dive', { dur: DV, loop: true, pose: (t) => tuck(applyRoot(applyKeys(rest(), diveKeys(t)), { r: pitch(30) })) });
// attack: the dive-peck. From the top of a beat it tips into a short stoop, throws its feet forward and stabs with the
// bill (the strike), then beats hard and pulls up, back to the top of the stroke
const ATK = 0.8, STRIKE = 0.28;
bake('attack', { dur: ATK, pose: (t) => {
  const ph = t < 0.3 ? 0 : (t - 0.3) / 0.5, dv = env(t, 0.04, 0.18, 0.27, 0.36), st = env(t, 0.1, STRIKE - 0.02, STRIKE + 0.04, 0.48);
  const L = flight(ph);
  applyKeys(L, merge(diveKeys(t, 0.9 * dv), { neck: [[X, 22 * st]], head: [[X, 18 * st]], tail: [[X, -12 * st]] }));
  applyRoot(L, { r: pitch(26 * env(t, 0.02, 0.2, 0.26, 0.42) - 14 * env(t, 0.3, 0.42, 0.5, 0.75)), p: [0, -0.1 * bump(t, 0.05, 0.5), 0.14 * bump(t, 0.04, 0.55)] });
  return legs(L, { tuck: 1 - st, strike: st });
} });
// hit: a stalled beat; knocked up and back, wings thrown up, head flinching
const HT = 0.45;
bake('hit', { dur: HT, pose: (t, d) => {
  const k = bump(t, 0, d * 0.9), L = flight(0.12 * k);
  const o = {}; for (const [s, sg] of SIDES) Object.assign(o, { [`arm_${s}`]: [[Z, sg * 26 * k]], [`hand_${s}`]: [[Z, -sg * 18 * k]] });
  applyKeys(L, merge(o, { neck: [[X, -16 * k]], head: [[X, -14 * k], [Z, 10 * k]], tail: [[X, -14 * k]] }));
  applyRoot(L, { r: [[X, -20 * k], [Z, 12 * k]], p: [0, 0.05 * k, -0.06 * k] });
  return legs(L, { tuck: 1 - 0.5 * k, dangle: 0.5 * k });
} });

// ----- the ground: perch, land, takeoff -----
const PERCH_TILT = -16;
// the standing bird: body tilted up, neck raised in an S, head level, tail down a little, wings folded
function standing(o = {}) {
  const L = rest();
  applyKeys(L, merge({ neck: [[X, -28]], head: [[X, 22]], tail: [[X, 10]] }, closeTail(o.tail ?? 1), o.keys || {}));
  applyRoot(L, { r: [[X, PERCH_TILT + (o.tilt || 0)]] });
  fold(L, o.fold ?? 1);
  legs(L, o.legs || { stand: 1 });
  return applyRoot(L, { p: [0, -feetY(L) + 0.0045 + (o.lift || 0), 0] });
}
// perch: breathing, the head turning in quick glances and holding, a tail flick and a shrug of the wings
const PC = 4.0;
const glance = (t) => { const keys = [[0, 0], [0.7, 32], [1.4, 32], [1.55, -10], [2.3, -10], [2.45, -38], [3.2, -38], [3.35, 0]]; let a = 0; for (let i = 0; i < keys.length; i++) { const [t0, v0] = keys[i], [t1, v1] = keys[(i + 1) % keys.length]; const tt1 = i + 1 < keys.length ? t1 : PC; if (t >= t0 && t < tt1) { const u = tt1 - t0 > 0.3 ? 0 : smooth((t - t0) / (tt1 - t0)); a = v0 + (v1 - v0) * u; } } return a; };
const perchPose = (t) => {
  const w = (2 * Math.PI * t) / PC, br = Math.sin(2 * w), g = glance(t), fl = bump(t, 2.6, 2.85), sh = bump(t, 1.0, 1.5);
  return standing({ keys: { chest: [[X, 1.2 * br]], neck: [[Y, 0.45 * g], [X, -1.5 * br]], head: [[Y, 0.55 * g], [Z, 0.08 * g]], tail: [[X, -14 * fl], [Y, 6 * fl]] }, fold: 1 - 0.12 * sh });
};
bake('perch', { dur: PC, loop: true, pose: perchPose });
const P0 = perchPose(0), F0 = tuck(flight(0));
const pelvisY = (L) => pos(worlds(doc, L), PELVIS).y;
console.log('perch: pelvis', pelvisY(P0).toFixed(3), 'feet', feetY(P0).toFixed(3), 'lowest', lowY(P0, 1).toFixed(3), '| flight top: pelvis', pelvisY(F0).toFixed(3), 'lowest', lowY(F0, 1).toFixed(3));
// per-bone blend weights: wings, legs, the rest
const isWing = (n) => /^(arm|forearm|hand|tip|fea)/.test(n.getName()), isLeg = (n) => /^(thigh|shank|foot)/.test(n.getName());

// takeoff: from the perch a crouch, the wings open and rise, a spring and a hard downstroke; the feet leave at LIFT and
// trail, then tuck; it ends at the top of the next beat in the flight frame (the AI raises the bird from the roost)
const TKO = 0.9, LIFT = 0.3;
bake('takeoff', { dur: TKO, pose: (t) => {
  const crouch = env(t, 0.0, 0.14, 0.2, 0.32), open = ramp(t, 0.06, 0.3), fly = ramp(t, 0.18, 0.55);
  const ph = Math.max(0, (t - LIFT) / (TKO - LIFT));
  const G = standing({ legs: { stand: 1 - crouch, crouch }, keys: { neck: [[X, 14 * crouch]], head: [[X, -8 * crouch]] }, tilt: 10 * crouch, lift: -0.03 * crouch });
  const A = applyRoot(flight(ph, { amp: 0.8 + 0.2 * ramp(t, 0.6, TKO) }), { r: pitch(-14 * (1 - ramp(t, 0.35, 0.8))), p: [0, 0.24 * bump(t, LIFT - 0.06, TKO), 0] });
  // the body goes from the perch to flight; the wings open from the fold to the top of the stroke, then beat
  const L = mix(G, A, (n) => (isWing(n) ? (t < LIFT ? 0 : 1) : fly));
  if (t < LIFT) { const F = flight(0); for (const n of L.keys()) if (isWing(n)) L.set(n, { p: F.get(n).p.clone(), q: F.get(n).q.clone(), s: F.get(n).s.clone() }); fold(L, 1 - open); }
  return legs(L, { stand: (1 - crouch) * (1 - ramp(t, LIFT, LIFT + 0.12)), crouch: crouch, dangle: bump(t, LIFT, 0.62), tuck: ramp(t, 0.45, 0.75) });
} });
// land: from flight the wings flare, the body rears up, the feet reach down and touch at TOUCH; the wings close into
// the perch
const LND = 1.05, TOUCH = 0.46;
bake('land', { dur: LND, pose: (t) => {
  const flare = env(t, 0.0, 0.22, 0.55, 0.8), reach = ramp(t, 0.06, 0.32), close = ramp(t, 0.52, 0.95), sink = bump(t, TOUCH - 0.02, TOUCH + 0.3);
  const ph = 0.2 * bump(t, 0.12, 0.5) + 0.12 * bump(t, 0.38, 0.62);   // short braking strokes from the top
  const o = {}; for (const [s, sg] of SIDES) Object.assign(o, { [`arm_${s}`]: [[Y, -sg * 26 * flare], [Z, sg * 8 * flare]], [`forearm_${s}`]: [[Y, sg * 8 * flare]], [`hand_${s}`]: [[Z, -sg * 14 * flare], [Y, sg * 16 * flare]] });
  let A = applyKeys(flight(ph), merge(o, { tail: [[X, 18 * flare]], neck: [[X, -10 * flare]], head: [[X, 12 * flare]] }));
  applyRoot(A, { r: pitch(-34 * flare) });
  legs(A, { tuck: 1 - reach, reach: reach * (1 - sink), crouch: reach * sink });
  // the feet come down to the ground at TOUCH (a little climb first, as birds do when they brake)
  const clear = t < TOUCH ? 0.16 * (1 - smooth(t / TOUCH)) : 0, want = -feetY(A) + clear;
  applyRoot(A, { p: [0, want * ramp(t, 0, 0.22) - 0.02 * sink, 0] });
  if (close <= 0) return A;
  // the body settles into the perch; the wings fold from the flare (by direction, so they close the way birds do)
  const L = mix(A, P0, (n) => (isWing(n) ? 0 : close));
  return fold(L, close);
} });
// die: shot out of the air. A jolt with the wings flung up, then it rolls over and falls onto its back, the wings
// crumpled (one half folded, one spread limp), the feet up, the head lolled; the lowest point stays on y = 0
const DIE = 1.5;
bake('die', { dur: DIE, pose: (t) => {
  const jolt = bump(t, 0, 0.38), roll = smooth((t - 0.12) / 0.62), limp = ramp(t, 0.3, 0.9), tw = Math.exp(-Math.max(0, t - 1.0) * 6) * Math.sin(Math.max(0, t - 1.0) * 28) * ramp(t, 0.95, 1.05);
  // the wings: from the top of the stroke, flung up, then limp and level (on its back they lie on the ground)
  let L = mix(flight(0.06), rest(), ramp(t, 0.12, 0.6));
  const o = {}; for (const [s, sg] of SIDES) Object.assign(o, { [`arm_${s}`]: [[Z, sg * (30 * jolt + 9 * limp)]], [`forearm_${s}`]: [[Z, -sg * 6 * limp]], [`hand_${s}`]: [[Z, sg * (-16 * jolt - 12 * limp)]], [`tip_${s}`]: [[Z, sg * 3 * tw - sg * 8 * limp]] });
  applyKeys(L, merge(o, { neck: [[X, -30 * jolt + 10 * limp], [Y, 40 * limp]], head: [[X, -20 * jolt], [Z, 35 * limp], [Y, 20 * limp]], tail: [[X, 14 * jolt - 10 * limp], [Z, 12 * limp]] }));
  // the wings crumple as it rolls (so neither stands up on its tip) and open again limp, the left one half folded
  const crumple = 0.7 * bump(t, 0.1, 0.95);
  L = mix(L, fold(clone(L), 0.85), (n) => (isWing(n) ? Math.min(1, crumple + (/_L$/.test(n.getName()) ? 0.6 * limp : 0)) : 0));
  applyRoot(L, { r: [[Z, 172 * roll], [X, 18 * bump(t, 0.1, 0.9) - 6 * limp]], pivot: ORIGIN });
  legs(L, { tuck: 1 - limp, limp });
  applyRoot(L, { p: [0, -lowY(L, 2) + 0.025 * bump(t, 0.82, 1.0), 0] });
  return L;
} });
// ---------- checks: skin stretch (edge lengths against the rest pose) and the ground, per clip ----------
if (process.argv.includes('--check')) {
  const pr = body.getMesh().listPrimitives()[0], I = pr.getIndices().getArray(), edges = [];
  for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) if (a < b) edges.push(a, b);
  const P0 = skinnedPoints(doc, restW, 1), len0 = []; for (let e = 0; e < edges.length; e += 2) len0.push(P0[edges[e]].distanceTo(P0[edges[e + 1]]));
  const Jn = pr.getAttribute('JOINTS_0'), Wn = pr.getAttribute('WEIGHTS_0'), je = [], we = [];
  const dom = (v) => { Jn.getElement(v, je); Wn.getElement(v, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; return JOINTS[je[b]].getName(); };
  for (const a of R.listAnimations()) {
    if (!a.rows) continue;
    let worst = 0, wt = 0, over = 0, lo = 1e9, lt = 0, hi = -1e9; const cnt = {};
    for (let f = 0; f < a.rows.length; f += 2) {
      const Pf = skinnedPoints(doc, worlds(doc, a.rows[f]), 1);
      for (let e = 0, j = 0; e < edges.length; e += 2, j++) { if (len0[j] < 0.003) continue; const r = Pf[edges[e]].distanceTo(Pf[edges[e + 1]]) / len0[j]; if (r > worst) { worst = r; wt = f / FPS; a.worstEdge = [edges[e], edges[e + 1], P0[edges[e]], P0[edges[e + 1]], Pf[edges[e]], Pf[edges[e + 1]]]; } if (r > 1.6) { over++; const k = [dom(edges[e]), dom(edges[e + 1])].sort().join('+'); cnt[k] = (cnt[k] || 0) + 1; } }
      for (const q of Pf) { if (q.y < lo) { lo = q.y; lt = f / FPS; } hi = Math.max(hi, q.y); }
    }
    if (process.argv.includes('--where') && a.worstEdge) { const [i0, i1, r0, r1, f0, f1] = a.worstEdge; const fx = (v) => v.toArray().map((x) => +x.toFixed(3)).join(','); console.log('   worst edge', dom(i0), dom(i1), 'rest', fx(r0), fx(r1), 'posed', fx(f0), fx(f1)); }
    console.log('check', a.getName().padEnd(8), 'stretch worst', worst.toFixed(2), 'at', wt.toFixed(2), 's; edge-frames over 1.6x', over, '| lowest', lo.toFixed(3), 'at', lt.toFixed(2), 'highest', hi.toFixed(2), over ? '| ' + Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => k + ':' + v).join(' ') : '');
  }
}
if (process.argv.includes('--foldcheck')) {
  { // which parts of the folded wing stand up (faces whose normal is more sideways than up), by dominant bone
    const pr = body.getMesh().listPrimitives()[0], I = pr.getIndices().getArray(), Pf = skinnedPoints(doc, worlds(doc, P0), 1);
    const Jn = pr.getAttribute('JOINTS_0'), Wn = pr.getAttribute('WEIGHTS_0'), je = [], we = [], st = {};
    const dom = (v) => { Jn.getElement(v, je); Wn.getElement(v, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; return JOINTS[je[b]].getName(); };
    for (let t = 0; t < I.length; t += 3) { const a = Pf[I[t]], b = Pf[I[t + 1]], c = Pf[I[t + 2]], n = b.clone().sub(a).cross(c.clone().sub(a)); const area = n.length() / 2; n.normalize(); const k = dom(I[t]); if (!/_L$/.test(k)) continue; const o = (st[k] ||= { area: 0, side: 0, low: 0 }); o.area += area; if (Math.abs(n.x) > Math.abs(n.y)) o.side += area; const ymin = Math.min(a.y, b.y, c.y); if (ymin < 0.07) o.low += area; }
    for (const [k, o] of Object.entries(st)) console.log('fold part', k.padEnd(13), 'area', (o.area * 1e4).toFixed(0), 'cm2; standing', (100 * o.side / o.area).toFixed(0) + '%; below 7 cm', (100 * o.low / o.area).toFixed(0) + '%');
  }
  const L = standing({}), W = worlds(doc, L), d = bodyF(L);
  for (const bn of WB) {
    const nm = bn + '_L', nd = B(nm), rq = wq(W, nd).multiply(restWQ.get(nd).clone().invert());
    const a = restAlong(nm).applyQuaternion(rq), n = Y.clone().applyQuaternion(rq), [fa, fr] = FOLD[bn];
    console.log(nm, 'along', a.toArray().map((v) => +v.toFixed(2)), 'want', d(fa.x, fa.y, fa.z).toArray().map((v) => +v.toFixed(2)), 'normal', n.toArray().map((v) => +v.toFixed(2)), 'want', d(fr.x, fr.y, fr.z).toArray().map((v) => +v.toFixed(2)), 'joint', pos(W, nd).toArray().map((v) => +v.toFixed(3)));
  }
}
if (process.argv.includes('--debugclips')) {
  bake('foldtest', { dur: 1, pose: (t) => standing({ fold: t, tail: t }) });
}
// ---------- 11. finish ----------
dropClip(SRCA);
// height: the perched bird's; span: wing tip to wing tip in the glide; liftAt / touchAt: when the feet leave the perch in
// 'takeoff' and meet it in 'land' (the AI moves the bird between the roost and flight height around them)
const extras = {
  hit: { attack: STRIKE }, height: +Math.max(...pts(P0, 1).map((q) => q.y)).toFixed(2), walkSpeed: 3, runSpeed: 7.5, span: SPAN, liftAt: LIFT, touchAt: TOUCH,
  credit: '"Seagull" by Dayvable (sketchfab.com/Dayvable), CC-BY 4.0 - decimated, repainted as a great skua, legs and animations made for Skotos', license: 'CC-BY-4.0'
};
if (DBG) await io.write(DBG.replace(/\.glb$/, '_raw.glb'), doc);
await finish(doc, DBG || OUT, extras, { base: 512, aux: 256 });
// finish() encodes colour at WebP quality 82, which flattens this dark, low-contrast plumage into smears (5.7 KB):
// the 512 atlas is re-encoded from the painted 1024 one, lanczos-reduced, at quality 92
{
  const t2 = R.listTextures()[0];
  t2.setImage(await sharp(PAINT).resize(512, 512, { kernel: 'lanczos3' }).webp({ quality: 92, smartSubsample: true, effort: 6 }).toBuffer()).setMimeType('image/webp');
  await io.write(DBG || OUT, doc);
  console.log('atlas', t2.getImage().byteLength, 'bytes');
}
const bytes = statSync(DBG || OUT).size;
console.log('skua', (bytes / 1024).toFixed(0) + ' KB', 'clips', R.listAnimations().map((a) => a.getName() + ':' + duration(a).toFixed(2)).join(' '));
