// Ashwings: "Prowler Dragon Variant Rig" by SuperKapoo913 (DM-913), sketchfab.com/SuperKapoo913, CC-BY 4.0
// -> src/assets/creatures/ashwing.glb
// Karthax's war-drakes, burnt to the bone and kept aloft by a coal in the ribs. The source is a wyvern (the wings are its
// arms) with a walk and a landing; its Blender IK, pole and display bones go, the 94 weighted bones stay. The rest pose
// is set to the skin's bind pose (wings spread flat), which is the base of the made flight clips.
// Look: the olive hide is graded to soot-stained ash-white bone, the wing membranes to tattered charcoal with burnt holes
// eaten into them (alpha), exposed ribs are painted along the flanks with an ember-orange coal glowing between them
// (emissive mask), the maw smoulders and the green eyes turn to embers. 19.4k triangles are thinned to under 9k.
// Clips (in place; the game flies it like the bat, so the body hangs at the origin: wing roots over x = z = 0, the lowest
// point of the hovering drake on y = 0):
//   idle   a glide with one lazy wing beat        walk / run  flapping flight, slow and hard
//   glide  wings spread, soaring sway             dive        wings swept back, head forward, jaws open (holds)
//   land   the source landing: flare, touch down, wings fold to the crouch (feet on y = 0 at the end)
//   takeoff  the landing backwards after a crouch: wings beat down and lift it off
//   attack   a bite on the ground (hit time in extras)   hit  a flinch on the ground
//   die    rears, wings collapse, tumbles and lies sprawled on y = 0
//   extras: perch (the grounded crouch, breathing), daze (blinded by a lamp: head shaking, a wing raised to shield)
// usage: node ashwing.mjs [source.glb] [out.glb] [--dbg=<path> writes there instead, plus an uncompressed copy]
//        [--texdbg with --dbg: the graded atlas, glow and part maps as PNGs] [--check skin-stretch and ground report per clip]
//        [--where with --check: which bones] [--raw keeps the source clips]
import { MeshoptSimplifier } from 'meshoptimizer';
import { simplifyPrim } from '../../envlib.mjs';
import { load, normalise, dropLoose, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds, skinnedPoints, sample,
  X, Y, Z, deg, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/prowler/model.glb', OUT = new URL('../../../src/assets/creatures/ashwing.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const SPAN = 3.0;      // wing tip to wing tip, spread, metres
const TRIS = 8900;     // whole model
const FPS = 30;
const doc = await load(SRC);
const R = doc.getRoot(), buf = R.listBuffers()[0];
dropLoose(doc);
const SRCA = Object.fromEntries(R.listAnimations().map((a) => [a.getName(), a]));
dropClip(SRCA.PoseLib);
const body = byName(doc, 'Object_37'), eyes = byName(doc, 'Object_38');
const parentOf = (n) => R.listNodes().find((p) => p.listChildren().includes(n));

// the full-resolution surface, kept to paint the textures from (mesh space; dominant source bone per vertex)
const RAWM = [body, eyes].map((n, k) => {
  const p = n.getMesh().listPrimitives()[0], js = n.getSkin().listJoints().map((j) => j.getName().replace(/[_.]\d+$/, '').replace(/\.(L|R)$/, ''));
  const J = p.getAttribute('JOINTS_0'), W = p.getAttribute('WEIGHTS_0'), je = [], we = [];
  const dom = []; for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); W.getElement(i, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; dom.push(js[je[b]]); }
  return { eye: k === 1, pos: p.getAttribute('POSITION').getArray().slice(), nrm: p.getAttribute('NORMAL').getArray().slice(), uv: p.getAttribute('TEXCOORD_0').getArray().slice(), idx: p.getIndices().getArray().slice(), dom };
});
// ---------- 1. thin the body out, then one primitive with the eyes (they read the same atlas: the green eye spot) ----------
await MeshoptSimplifier.ready;
for (const n of [body, eyes]) for (const p of n.getMesh().listPrimitives()) for (const s of ['TANGENT', 'TEXCOORD_1', 'COLOR_0']) p.setAttribute(s, null);
{
  const p = body.getMesh().listPrimitives()[0], eyeTris = eyes.getMesh().listPrimitives()[0].getIndices().getCount() / 3;
  const before = p.getIndices().getCount() / 3, mode = simplifyPrim(p, (TRIS - eyeTris) / before, 0.03);
  console.log('simplify body', before, '->', p.getIndices().getCount() / 3, mode, '+ eyes', eyeTris);
}
{
  const prims = [body, eyes].flatMap((n) => n.getMesh().listPrimitives());
  const sem = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];
  const types = { POSITION: ['VEC3', Float32Array], NORMAL: ['VEC3', Float32Array], TEXCOORD_0: ['VEC2', Float32Array], JOINTS_0: ['VEC4', Uint16Array], WEIGHTS_0: ['VEC4', Float32Array] };
  const cat = Object.fromEntries(sem.map((s) => [s, []])), idx = []; let off = 0;
  for (const p of prims) {
    for (const s of sem) { const a = p.getAttribute(s), e = []; for (let i = 0; i < a.getCount(); i++) cat[s].push(...a.getElement(i, e)); }
    for (const i of p.getIndices().getArray()) idx.push(i + off);
    off += p.getAttribute('POSITION').getCount();
  }
  const q = doc.createPrimitive().setMaterial(prims[0].getMaterial()).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
  for (const s of sem) q.setAttribute(s, doc.createAccessor().setType(types[s][0]).setArray(new types[s][1](cat[s])).setBuffer(buf));
  for (const p of body.getMesh().listPrimitives()) body.getMesh().removePrimitive(p);
  body.getMesh().addPrimitive(q).setName('ashwing');
  const eyeMat = eyes.getMesh().listPrimitives()[0].getMaterial();
  eyes.setMesh(null).setSkin(null);
  eyeMat.dispose();
  body.setName('ashwing_mesh');
  console.log('merged', idx.length / 3, 'triangles,', off, 'vertices');
}

// ---------- 2. rig: the weighted bones only, clean names ----------
const used = slimRig(doc);
const NAME_FIX = { 'Tuhmb Base': 'ThumbBase', MIddleFinger1: 'MiddleFinger1', MIddleToe1: 'MiddleToe1', elbow2: 'Elbow2', 'Root Bone': 'RootBone', 'Dragon Mesh': 'DragonMesh' };
for (const n of R.listNodes()) {
  let nm = n.getName();
  if (/^(Object_|GLTF_|Sketchfab|root$|ashwing_mesh)/.test(nm)) continue;
  nm = nm.replace(/_\d+$/, '');
  const [base, side] = nm.split('.');
  n.setName((NAME_FIX[base] || base).replace(/\s+/g, '') + (side ? '_' + side : ''));
}
console.log('joints', used, R.listSkins()[0].listJoints().map((j) => j.getName()).join(' '));
const B = (n) => { const x = byName(doc, n); if (!x) throw new Error('no bone ' + n); return x; };
const ROOTBONE = B('RootBone'), PELVIS = B('Pelvis');

// the thighs hang from a Blender IK chain bone (Chain2 Thigh) that weighs nothing: each thigh is moved up to its
// ThighBase, the chain bone's motion folded into the thigh's own keys, and the chain bone dropped
for (const s of ['L', 'R']) {
  const c2 = B('Chain2Thigh_' + s), th = B('Thigh_' + s), tb = B('ThighBase_' + s);
  const M = (t, q) => new THREE.Matrix4().compose(t, q, new THREE.Vector3(1, 1, 1));
  const trs = (n) => [new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation())];
  for (const a of [SRCA.Walk, SRCA.Landing]) {
    const chs = (n) => Object.fromEntries(a.listChannels().filter((c) => c.getTargetNode() === n).map((c) => [c.getTargetPath(), c]));
    const C = chs(c2), T = chs(th), times = T.rotation.getSampler().getInput();
    const tr = [], ro = [];
    for (const t of times.getArray()) {
      const m = M(C.translation ? sample(C.translation, t) : trs(c2)[0], C.rotation ? sample(C.rotation, t) : trs(c2)[1])
        .multiply(M(T.translation ? sample(T.translation, t) : trs(th)[0], sample(T.rotation, t)));
      const p = new THREE.Vector3(), q = new THREE.Quaternion(); m.decompose(p, q, new THREE.Vector3());
      tr.push(...p.toArray()); ro.push(...q.toArray());
    }
    for (const [path, arr, type] of [['translation', tr, 'VEC3'], ['rotation', ro, 'VEC4']]) {
      const smp = doc.createAnimationSampler().setInput(times).setInterpolation('LINEAR').setOutput(doc.createAccessor().setType(type).setArray(new Float32Array(arr)).setBuffer(buf));
      a.addSampler(smp);
      if (T[path]) T[path].setSampler(smp); else a.addChannel(doc.createAnimationChannel().setTargetNode(th).setTargetPath(path).setSampler(smp));
    }
    for (const c of Object.values(C)) { const smp = c.getSampler(); c.dispose(); smp.dispose(); }
  }
  const m = M(...trs(c2)).multiply(M(...trs(th))), p = new THREE.Vector3(), q = new THREE.Quaternion(); m.decompose(p, q, new THREE.Vector3());
  c2.removeChild(th); tb.addChild(th); th.setTranslation(p.toArray()).setRotation(q.toArray());
  tb.removeChild(c2); c2.dispose();
}

// ---------- 3. rest = the bind pose (wings spread flat, legs hanging) ----------
{
  const skin = R.listSkins()[0], js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
  const W = worlds(doc, locals(doc, null, 0)), M = W.get(body);
  const Wb = new Map(js.map((j, i) => [j, M.clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16).invert())]));
  // parents first; a plain node between two joints (a Blender IK chain bone) keeps its local and follows its parent
  const Wn = new Map(), visit = (n, pw) => {
    let w;
    if (Wb.has(n)) {
      w = Wb.get(n);
      const L = pw.clone().invert().multiply(w), T = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
      L.decompose(T, Q, S);
      n.setTranslation(T.toArray()).setRotation(Q.normalize().toArray()).setScale([1, 1, 1]);
    } else w = pw.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale())));
    Wn.set(n, w);
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of R.getDefaultScene().listChildren()) visit(n, new THREE.Matrix4());
  let worst = 0;
  for (const [i, j] of js.entries()) { const m = Wn.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16)); for (let k = 0; k < 16; k++) worst = Math.max(worst, Math.abs(m.elements[k] - M.elements[k])); }
  console.log('bind pose set; worst |W * IBM - mesh|', worst.toExponential(2));
}

// ---------- 4. scale and place: 3 m across the spread wings, the wing roots over the origin, the lowest point on y = 0 ----------
{
  const b0 = bounds(doc, null, 0, 1);
  const root = normalise(doc, { scale: SPAN / (b0.max.x - b0.min.x), keepXZ: true });
  const W = worlds(doc, locals(doc, null, 0));
  const c = new THREE.Vector3().setFromMatrixPosition(W.get(B('Shoulder_L'))).add(new THREE.Vector3().setFromMatrixPosition(W.get(B('Shoulder_R')))).multiplyScalar(0.5);
  const t = root.getTranslation(); root.setTranslation([t[0] - c.x, t[1], t[2] - c.z]);
  const b = bounds(doc, null, 0, 1);
  console.log('rest bounds', b.min.toArray().map((v) => +v.toFixed(3)), b.max.toArray().map((v) => +v.toFixed(3)));
}

// ---------- 4b. the look: burnt to the bone ----------
// Every texel of the atlas is given the bind-pose position, normal and bone of the full-resolution surface it lies on
// (the triangles rasterised in UV space), so the grade can follow the body: ribs on the flanks, soot from below.
const TEXDBG = process.argv.includes('--texdbg') && DBG;
const EMBER = [255, 112, 26];
// 3D value noise and its fractal sum
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm = (x, y, z, o = 4) => { let a = 0, s = 0.5, f = 1; for (let i = 0; i < o; i++) { a += s * vnoise(x * f, y * f, z * f); s *= 0.5; f *= 2.03; } return a / (1 - Math.pow(0.5, o)); };
const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const grad = (stops, x) => { x = Math.min(1, Math.max(0, x)); let i = 0; while (i < stops.length - 2 && x > stops[i + 1][0]) i++; const [a, ca] = stops[i], [b, cb] = stops[i + 1]; return mixc(ca, cb, (x - a) / (b - a)); };
const mat = body.getMesh().listPrimitives()[0].getMaterial();
{
  const tex = mat.getBaseColorTexture();
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = info.width, ch = info.channels;
  // ----- rasterise -----
  const M = worlds(doc, locals(doc, null, 0)).get(body), M3 = new THREE.Matrix3().getNormalMatrix(M);
  const P = new Float32Array(N * N * 3), NR = new Float32Array(N * N * 3), part = new Uint8Array(N * N), eyeT = new Uint8Array(N * N);
  const PARTS = { body: 1, wing: 2, head: 3, neck: 4, leg: 5, tail: 6 };
  const partOf = (b) => /^(Wing|Hand|MiddleFinger|SubPinky|Pinky|Thumb|ThumbBase|Tuhmb|SubIndex|IndexFinger|Elbow|elbow)/.test(b) ? 2 : /^(Head|Jaw|Tongue|Eye|Brow)/.test(b) ? 3 : /^Neck/.test(b) ? 4 : /^(Thigh|Shin|Foot|Toe|MIddleToe|MiddleToe|OuterToe|InnerToe|InnerToeBase|OuterToeBase)/.test(b) ? 5 : /^Tail/.test(b) ? 6 : 1;
  for (const m of RAWM) {
    const vp = [], vn = [];
    for (let i = 0; i < m.pos.length / 3; i++) { vp.push(new THREE.Vector3(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]).applyMatrix4(M)); vn.push(new THREE.Vector3(m.nrm[i * 3], m.nrm[i * 3 + 1], m.nrm[i * 3 + 2]).applyMatrix3(M3).normalize()); }
    const vpart = m.dom.map(partOf);
    for (let t = 0; t < m.idx.length; t += 3) {
      const I = [m.idx[t], m.idx[t + 1], m.idx[t + 2]], v = I.map((i) => [m.uv[i * 2] * N, m.uv[i * 2 + 1] * N]);
      const ar = (v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[2][0] - v[0][0]) * (v[1][1] - v[0][1]); if (Math.abs(ar) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(v[0][0], v[1][0], v[2][0]))), x1 = Math.min(N - 1, Math.ceil(Math.max(v[0][0], v[1][0], v[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(v[0][1], v[1][1], v[2][1]))), y1 = Math.min(N - 1, Math.ceil(Math.max(v[0][1], v[1][1], v[2][1])));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((v[1][0] - px) * (v[2][1] - py) - (v[2][0] - px) * (v[1][1] - py)) / ar, w1 = ((v[2][0] - px) * (v[0][1] - py) - (v[0][0] - px) * (v[2][1] - py)) / ar, w2 = 1 - w0 - w1;
        if (w0 < -0.03 || w1 < -0.03 || w2 < -0.03) continue;
        const k = y * N + x;
        if (part[k] && (w0 < 0 || w1 < 0 || w2 < 0)) continue; // a texel inside some triangle wins over a border one
        const ws = [w0, w1, w2];
        for (let c = 0; c < 3; c++) { P[k * 3 + c] = ws[0] * vp[I[0]].getComponent(c) + ws[1] * vp[I[1]].getComponent(c) + ws[2] * vp[I[2]].getComponent(c); NR[k * 3 + c] = ws[0] * vn[I[0]].getComponent(c) + ws[1] * vn[I[1]].getComponent(c) + ws[2] * vn[I[2]].getComponent(c); }
        part[k] = vpart[I[ws.indexOf(Math.max(...ws))]];
        if (m.eye) eyeT[k] = 1;
      }
    }
  }
  // ----- landmarks (bind pose, metres): the ribcage, the coal inside it, the eyes -----
  const W0 = worlds(doc, locals(doc, null, 0)), J = (n) => new THREE.Vector3().setFromMatrixPosition(W0.get(B(n)));
  const zNeck = J('Neck').z, zPel = J('Pelvis').z, axisY = (J('Torso').y + J('Spine').y) / 2;
  const RIB0 = zNeck + 0.02, RIB1 = zPel + 0.07;                   // front and back of the ribcage
  const COAL = new THREE.Vector3(0, axisY - 0.04, J('Torso').z + 0.01);
  const EYES = [J('Eye_L'), J('Eye_R')];
  console.log('ribcage z', RIB0.toFixed(3), '..', RIB1.toFixed(3), 'axis y', axisY.toFixed(3), 'coal', COAL.toArray().map((v) => +v.toFixed(3)));
  // ----- the grade -----
  const em = Buffer.alloc(N * N * 3);
  const dbgPart = TEXDBG ? Buffer.alloc(N * N * 3) : null;
  const HIDE = [[0, [14, 12, 11]], [0.22, [44, 40, 37]], [0.45, [104, 98, 91]], [0.68, [160, 154, 143]], [0.86, [196, 190, 177]], [1, [214, 208, 195]]];
  const BONE = [214, 207, 192];
  let holes = 0, memb = 0, ribT = 0;
  for (let k = 0, i = 0; k < N * N; k++, i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3], l = (0.3 * r + 0.55 * g + 0.15 * b) / 255;
    const pk = part[k], has = pk > 0;
    const p = has ? new THREE.Vector3(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]) : null, nn = has ? new THREE.Vector3(NR[k * 3], NR[k * 3 + 1], NR[k * 3 + 2]).normalize() : null;
    const redness = (r - g) / (r + 6), purple = (b - g) / (b + 6);
    const isMemb = redness > 0.2 && l < 0.4 && pk !== 3, isMouth = purple > 0.08 && r > g * 1.08 && l > 0.16;
    let c, e = [0, 0, 0], alpha = a;
    // soot: blotches, heavier from below and toward the tail tip and the feet
    const n1 = has ? fbm(p.x * 9 + 3.1, p.y * 9, p.z * 9) : 0.5, n2 = has ? fbm(p.x * 26, p.y * 26 + 7.7, p.z * 26) : 0.5;
    const under = has ? smooth((-nn.y + 0.1) / 0.8) : 0;
    const soot = Math.min(1, smooth((n1 - 0.47) / 0.3) * 0.7 + under * 0.3 + (pk === 5 ? 0.25 : 0) + (pk === 6 && p.z < -1.2 ? 0.2 : 0));
    if (eyeT[k]) {
      // the eyes: the green iris becomes a burning ember, the rest of the eyeball a dark coal
      const iris = smooth(((g - Math.max(r, b)) / 255 - 0.02) / 0.12);
      c = mixc([38, 12, 4], [255, 150, 50], iris);
      e = mixc([0.55, 0.16, 0.03], [1, 0.62, 0.22], iris);
    } else if (isMemb) {
      memb++;
      // the membrane: charcoal with a hint of dried brown, holes burnt into it with a scorched, smouldering rim
      const x = Math.min(1, l / 0.25);
      c = mixc(mixc([30, 27, 25], [86, 68, 56], x), [16, 14, 13], soot * 0.4);
      if (has && a > 128) {
        const hn = fbm(p.x * 6.5 + 11, p.y * 6.5, p.z * 6.5 - 4) * 0.75 + n2 * 0.25;
        if (hn > 0.62) { alpha = 0; holes++; }
        else if (hn > 0.555) { const rim = smooth((hn - 0.555) / 0.065); c = mixc(c, [8, 6, 5], rim); e = EMBER.map((v) => (v / 255) * 0.45 * rim * rim * (0.5 + n2)); }
      }
    } else if (isMouth) {
      // the maw and tongue: charred, with the furnace showing through
      c = mixc([62, 18, 8], [120, 38, 12], Math.min(1, l / 0.6));
      e = EMBER.map((v) => (v / 255) * (0.18 + 0.3 * smooth((l - 0.3) / 0.4)));
    } else {
      // hide and bone: soot-black to ash-white on the source's light and shade, blackened by the soot
      // (the source hide is dark: its light scales sit at 0.2 luminance, its patterning at 0.03-0.05)
      const x = Math.min(1, Math.max(0, 0.2 + (l - 0.03) * 3.4));
      c = grad(HIDE, x);
      c = mixc(c, [18, 16, 15], Math.min(0.85, soot * 0.55 * (0.6 + 0.4 * n2) + 0.22 * smooth((n2 - 0.55) / 0.25)));
      if (has) {
        // the exposed ribcage along the flanks and belly: ash-white bars, the coal's glow between them
        const dy = p.y - axisY, th = Math.atan2(Math.abs(p.x), -dy), rad = Math.hypot(p.x, dy);
        const zone = ramp(p.z, RIB1 - 0.03, RIB1 + 0.02) * (1 - ramp(p.z, RIB0 - 0.03, RIB0 + 0.02)) * ramp(th, 0.18, 0.4) * (1 - ramp(th, 1.95, 2.25)) * (1 - ramp(rad, 0.17, 0.22)) * (pk === 2 ? 0 : 1);
        if (zone > 0.01) {
          const u = p.z + 0.055 * (2.2 - th) / 2.2 + 0.006 * (n2 - 0.5), ph = ((u - RIB1) / 0.052) % 1, v = Math.abs(((ph + 1) % 1) - 0.5);
          const bar = 1 - smooth((v - 0.3) / 0.06), core = smooth((v - 0.36) / 0.1);   // bar: 1 on a rib, 0 in a gap
          const ribC = mixc(mixc(BONE, [150, 142, 128], 0.5 * (1 - x)), [40, 34, 30], 0.45 * smooth((v - 0.2) / 0.1)).map((q) => q * (0.85 + 0.15 * n2));
          const gapC = [24, 8, 3];
          const cc = mixc(gapC, ribC, bar);
          c = mixc(c, cc, zone);
          const glow = (0.3 + 0.7 * Math.exp(-p.distanceToSquared(COAL) / (2 * 0.11 * 0.11))) * (1 - bar) * (0.45 + 0.55 * core) * zone;
          e = mixc(e, EMBER.map((q) => q / 255), Math.min(1, glow * 1.15));
          if (zone > 0.5) ribT++;
        }
        // hollow, scorched eye sockets
        const de = Math.min(...EYES.map((q) => q.distanceTo(p)));
        if (pk === 3 && de < 0.05) c = mixc(c, [10, 8, 7], 0.85 * (1 - smooth((de - 0.025) / 0.025)));
      }
    }
    for (let q = 0; q < 3; q++) { data[i + q] = Math.max(0, Math.min(255, c[q])); em[k * 3 + q] = Math.max(0, Math.min(255, 255 * e[q])); }
    data[i + 3] = alpha >= 77 ? 255 : 0;
    if (dbgPart) { const col = [[0, 0, 0], [200, 200, 200], [200, 60, 60], [60, 200, 60], [60, 60, 200], [200, 200, 60], [60, 200, 200]][pk]; dbgPart.set(col, k * 3); }
  }
  // outside the UV islands: the island colours spread 4 texels (mip and filtering bleed), flat beyond; the normal map
  // flat there too. Only the islands cost bytes.
  {
    const cov = new Uint8Array(N * N); for (let k = 0; k < N * N; k++) cov[k] = part[k] || eyeT[k] ? 1 : 0;
    const nt = mat.getNormalTexture(), nraw = nt ? await sharp(Buffer.from(nt.getImage())).resize(N, N).removeAlpha().raw().toBuffer() : null;
    for (let it = 0; it < 4; it++) {
      const add = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const k = y * N + x; if (cov[k]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const kk = yy * N + xx; if (cov[kk]) { add.push([k, kk]); break; } }
      }
      for (const [k, kk] of add) { for (let q = 0; q < 4; q++) data[k * ch + q] = data[kk * ch + q]; for (let q = 0; q < 3; q++) em[k * 3 + q] = em[kk * 3 + q]; if (nraw) for (let q = 0; q < 3; q++) nraw[k * 3 + q] = nraw[kk * 3 + q]; cov[k] = 2; }
    }
    for (let k = 0; k < N * N; k++) if (!cov[k]) { data.set([34, 31, 29, 255], k * ch); em.set([0, 0, 0], k * 3); if (nraw) nraw.set([128, 128, 255], k * 3); }
    if (nraw) nt.setImage(await sharp(nraw, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  }
  console.log('membrane texels', memb, 'burnt holes', holes, (100 * holes / Math.max(1, memb)).toFixed(1) + '%', 'rib texels', ribT);
  tex.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
  const et = doc.createTexture('ashwing_coal').setImage(await sharp(em, { raw: { width: N, height: N, channels: 3 } }).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([1, 1, 1]);
  const mr = mat.getMetallicRoughnessTexture(); mat.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.86);
  if (mr && !mr.listParents().some((q) => q.propertyType === 'Material')) mr.dispose();
  mat.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true).setName('ashwing_bone');
  if (TEXDBG) {
    await sharp(data, { raw: info }).png().toFile(DBG.replace(/\.glb$/, '_base.png'));
    await sharp(em, { raw: { width: N, height: N, channels: 3 } }).png().toFile(DBG.replace(/\.glb$/, '_glow.png'));
    await sharp(dbgPart, { raw: { width: N, height: N, channels: 3 } }).png().toFile(DBG.replace(/\.glb$/, '_parts.png'));
  }
}

// ---------- 5. clip machinery ----------
// A pose is a map node -> local {p, q, s} (lib's locals). Source poses keep RootBone at rest (its keys carry the
// landing's travel); keys(t) rotate bones about character-space axes (+Z forward, +X the left wing, Y up) in the bone's
// bind frame, as lib's makeClip does; root(t) turns the whole body about a pivot (default: the wing roots) and shifts it.
const restLoc = locals(doc, null, 0), restW = worlds(doc, restLoc);
const JOINTS = R.listSkins()[0].listJoints();
const named = new Map(R.listNodes().map((n) => [n.getName(), n]));
const restWQ = new Map([...restW].map(([n, m]) => { const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return [n, q]; }));
const pos = (W, n) => new THREE.Vector3().setFromMatrixPosition(W.get(typeof n === 'string' ? B(n) : n));
const ORIGIN = new THREE.Vector3(0, pos(restW, 'Shoulder_L').y, 0);
const clone = (L) => new Map([...L].map(([n, v]) => [n, { p: v.p.clone(), q: v.q.clone(), s: v.s.clone() }]));
const rest = () => clone(restLoc);
function src(anim, t) {
  const L = locals(doc, anim, Math.max(0, Math.min(duration(anim), t)));
  L.set(ROOTBONE, { ...restLoc.get(ROOTBONE) });
  return L;
}
// per-bone blend of two poses; w: number or node -> weight
function mix(A, Bp, w) {
  const out = new Map();
  for (const [n, a] of A) {
    const b = Bp.get(n), k = typeof w === 'function' ? w(n) : w;
    out.set(n, { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k), s: a.s.clone() });
  }
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
// the whole body: turned by r ([[axis, deg]], character space) about pivot, then shifted by p (metres)
function applyRoot(L, r = {}) {
  const parW = restW.get(ROOTBONE), pl = L.get(PELVIS);
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
const pts = (L, step = 5) => skinnedPoints(doc, worlds(doc, L), step);
const lowY = (L, step = 5) => pts(L, step).reduce((m, p) => Math.min(m, p.y), 1e9);
const TOES = ['L', 'R'].flatMap((s) => ['MiddleToe2', 'OuterToe2', 'InnerToe2', 'Foot'].map((b) => b + '_' + s));
const footY = (L) => { const W = worlds(doc, L); return Math.min(...TOES.map((n) => pos(W, n).y)); };
const shoulders = (L) => { const W = worlds(doc, L); return pos(W, 'Shoulder_L').add(pos(W, 'Shoulder_R')).multiplyScalar(0.5); };

// bake: pose(t, d) -> L (default rest); keys(t, d) -> bone rotations; root(t, d) -> { r, p, pivot }; writes every joint's
// rotation and the pelvis translation
function bake(name, o) {
  const n = Math.max(2, Math.round(o.dur * FPS) + 1), rows = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(o.dur, i / FPS);
    const L = o.pose ? o.pose(t, o.dur) : rest();
    if (o.keys) applyKeys(L, o.keys(t, o.dur));
    if (o.root) applyRoot(L, o.root(t, o.dur));
    // only rotations and the pelvis translation are written: the rows hold exactly what plays
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

// ---------- 6. flight (made on the spread bind pose) ----------
const SIDES = [['L', 1], ['R', -1]];
const TAIL = ['TailBase', 'Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'];
// the legs drawn back under the tail, the toes curled
const tuck = (k = 1) => merge(...SIDES.map(([s]) => ({ [`Thigh_${s}`]: [[X, 44 * k]], [`Shin_${s}`]: [[X, -28 * k]], [`Foot_${s}`]: [[X, 45 * k]], [`ToeBase_${s}`]: [[X, 25 * k]] })));
// one wing beat at phase ph (0 = top of the stroke): amp degrees about the mean elevation mid; the hand lags the arm and
// folds back on the upstroke; the body rises on the downstroke
function beat(ph, amp, mid = 0, foldK = 1) {
  const e = mid + amp * Math.cos(ph), up = Math.max(0, -Math.sin(ph)), down = Math.max(0, Math.sin(ph));
  const k = {};
  for (const [s, sg] of SIDES) Object.assign(k, {
    [`Shoulder_${s}`]: [[Z, sg * 0.3 * e]],
    [`Wing1_${s}`]: [[Z, sg * 0.7 * e], [Y, -sg * 8 * Math.sin(ph)]],
    [`Wing2_${s}`]: [[Z, sg * 0.25 * amp * Math.cos(ph - 0.7)], [Y, -sg * 10 * up * foldK]],
    [`Elbow1_${s}`]: [[Z, sg * 0.12 * amp * Math.cos(ph - 0.7)]],
    [`Hand_${s}`]: [[Z, sg * 0.3 * amp * Math.cos(ph - 1.3)], [Y, sg * 34 * up * foldK]],
    [`MiddleFinger2_${s}`]: [[Z, sg * 7 * Math.cos(ph - 1.8)]], [`MiddleFinger3_${s}`]: [[Z, sg * 6 * Math.cos(ph - 2.2)]],
    [`SubPinky2_${s}`]: [[Z, sg * 6 * Math.cos(ph - 1.9)]], [`Pinky2_${s}`]: [[Z, sg * 5 * Math.cos(ph - 2.0)]],
  });
  return merge(k, Object.fromEntries(TAIL.map((b, i) => [b, [[X, 3 * Math.cos(ph - 1.2 - 0.45 * i)]]])),
    { Neck: [[X, -3 * Math.cos(ph)]], Head: [[X, 3 * Math.cos(ph - 0.3)]] });
}
const lift = (ph, a) => -a * Math.cos(ph - 0.4);
// flapping flight: T seconds a beat, amp degrees
const flap = (name, T, amp, o = {}) => bake(name, {
  dur: T * (o.beats || 1), loop: true,
  keys: (t) => { const ph = (2 * Math.PI * t) / T; return merge(beat(ph, amp, o.mid ?? 4), tuck(), o.keys?.(t)); },
  root: (t) => { const ph = (2 * Math.PI * t) / T; return { p: [0, lift(ph, o.bob ?? 0.06), 0], r: [[X, (o.pitch || 0) - 2.5 * Math.sin(ph)]] }; }
});
const walk = flap('walk', 1.1, 38, { mid: 9 });
const run = flap('run', 0.78, 44, { pitch: 8, bob: 0.08, mid: 7 });
// glide: wings spread with a little dihedral, a slow banking sway, the head looking about
const GL = 4.4;
const soar = (t, k = 1) => {
  const w = (2 * Math.PI * t) / GL;
  const g = {};
  for (const [s, sg] of SIDES) Object.assign(g, {
    [`Shoulder_${s}`]: [[Z, sg * 3]], [`Wing1_${s}`]: [[Z, sg * (5 + 2 * Math.sin(w + sg))]], [`Hand_${s}`]: [[Z, -sg * (4 + 2 * Math.sin(2 * w))]],
    [`MiddleFinger3_${s}`]: [[Z, sg * 2 * Math.sin(3 * w)]]
  });
  return merge(g, tuck(), Object.fromEntries(TAIL.map((b, i) => [b, [[Y, 2.5 * Math.sin(w - 0.5 * i)], [X, 1.5]]])),
    { Neck: [[Y, 8 * Math.sin(w + 1)], [X, -4]], Head: [[Y, 10 * Math.sin(w + 0.6) * k], [X, 4]] });
};
const glide = bake('glide', { dur: GL, loop: true, keys: (t) => soar(t), root: (t) => { const w = (2 * Math.PI * t) / GL; return { r: [[Z, 5 * Math.sin(w)], [X, 1.5 * Math.sin(2 * w)]], p: [0, 0.04 * Math.sin(2 * w), 0] }; } });
// idle: the glide, with one slow beat in each loop
const IDL = 3.3;
const idle = bake('idle', {
  dur: IDL, loop: true,
  keys: (t) => {
    const f = env(t, 0.1, 0.5, 1.7, 2.2), ph = (2 * Math.PI * Math.max(0, t - 0.25)) / 1.6;
    const b = beat(t > 0.25 && t < 1.85 ? ph : 0, 36 * f, 4 * f);
    const g = soar(t * (GL / IDL) * 0.5);
    return merge(...Object.keys({ ...b, ...g }).map((k) => ({ [k]: [...(b[k] || []).map(([a, v]) => [a, v]), ...(g[k] || []).map(([a, v]) => [a, v * (1 - f * 0.7)])] })));
  },
  root: (t) => { const f = env(t, 0.1, 0.5, 1.7, 2.2), ph = (2 * Math.PI * Math.max(0, t - 0.25)) / 1.6; return { p: [0, f * lift(ph, 0.05) + 0.03 * Math.sin((2 * Math.PI * t) / IDL), 0], r: [[Z, 3 * Math.sin((2 * Math.PI * t) / IDL)]] }; }
});
// dive: the wings swept back and raised into a V, the body nose-down, neck and head stretched along the line, jaws
// open; it holds (loops) with a shiver in the membranes
const DV = 0.8;
const diveKeys = (t, k = 1) => {
  const sh = Math.sin((2 * Math.PI * t * 5) / DV), o = {};
  for (const [s, sg] of SIDES) Object.assign(o, {
    [`Shoulder_${s}`]: [[Y, sg * 12 * k], [Z, sg * 8 * k]], [`Wing1_${s}`]: [[Y, sg * 34 * k], [Z, sg * 10 * k]],
    [`Wing2_${s}`]: [[Y, sg * 14 * k]], [`Elbow1_${s}`]: [[Y, sg * 7 * k]], [`Hand_${s}`]: [[Y, sg * 22 * k], [Z, -sg * 6 * k]],
    [`MiddleFinger2_${s}`]: [[Z, sg * 1.5 * sh * k]], [`Pinky2_${s}`]: [[Z, -sg * 2 * sh * k]], [`SubPinky2_${s}`]: [[Z, sg * 2 * sh * k]]
  });
  return merge(o, tuck(1.15 * k), Object.fromEntries(TAIL.map((b) => [b, [[X, -1 * k]]])),
    { Neck: [[X, -10 * k]], Head: [[X, -8 * k]], Jaw1: [[X, (14 + 2 * sh) * k]] });
};
const DIVE_PITCH = 22;
const dive = bake('dive', { dur: DV, loop: true, keys: (t) => diveKeys(t), root: () => ({ r: [[X, DIVE_PITCH]] }) });
{ // nothing below the ground: lift the dive so its lowest point sits where the rest pose's does
  const d = Math.min(...dive.rows.map((L) => lowY(L)));
  console.log('dive low', d.toFixed(3));
}

// ---------- 7. the ground: the source's landing, set in place ----------
// From the last hover beat (wings at the top of the stroke) to the settled crouch. The source drops 2 m and walks on a
// step; here the feet start 0.3 m up and fall to the ground, then stay planted while the body settles over them.
const LAND0 = 2.9, LAND1 = 4.36, H0 = 0.32;
const srcTravel = (t) => locals(doc, SRCA.Landing, t);
const TD = (() => { const fEnd = footY(srcTravel(LAND1)); for (let t = LAND0; t <= LAND1; t += 1 / 60) if (footY(srcTravel(t)) < fEnd + 0.03) return t; return LAND1; })();
const feetXZ = (L) => { const W = worlds(doc, L); return pos(W, 'Foot_L').add(pos(W, 'Foot_R')).multiplyScalar(0.5).setY(0); };
// the head raised off the ground and the neck arched (the source lays its chin on the ground)
const ALERT = { Neck: [[X, -16]], Head: [[X, -10]], Torso: [[X, -4]] };
const scaleKeys = (k, f) => Object.fromEntries(Object.entries(k).map(([b, r]) => [b, r.map(([a, v]) => [a, v * f])]));
const landOff = new Map();
{
  const n = Math.round((LAND1 - LAND0) * 60);
  let atTD = null, feetTD = null;
  for (let i = 0; i <= n; i++) {
    const t = LAND0 + i / 60, L = src(SRCA.Landing, t), sh = shoulders(L), fy = footY(L);
    let o;
    if (t < TD) { const u = (t - LAND0) / (TD - LAND0); o = new THREE.Vector3(-sh.x, H0 * (1 - u * u) - fy, -sh.z); }
    else {
      if (!atTD) { atTD = new THREE.Vector3(-sh.x, -fy, -sh.z); feetTD = feetXZ(L); }
      const d = feetXZ(L).sub(feetTD); o = new THREE.Vector3(atTD.x - d.x, -fy, atTD.z - d.z);
    }
    landOff.set(i, o);
  }
}
const landAt = (t) => { const i = Math.max(0, Math.min(Math.round((LAND1 - LAND0) * 60), Math.round((t - LAND0) * 60))); return landOff.get(i); };
// a source landing frame, set in place (alert: how far the head is raised, 0..1)
function landPose(t, alert = 0) {
  const L = src(SRCA.Landing, t);
  if (alert) applyKeys(L, scaleKeys(ALERT, alert));
  return applyRoot(L, { p: landAt(t).toArray() });
}
{
  const end = landPose(LAND1, 1), sh = shoulders(end);
  console.log('touchdown at', TD.toFixed(3), 'perch: shoulders at', sh.toArray().map((v) => +v.toFixed(3)), 'lowest', lowY(end, 2).toFixed(3), 'feet', footY(end).toFixed(3));
}
const LD = LAND1 - LAND0;
// the folding left wing scrapes its tip through the ground just after touchdown: the long finger is lifted then (the
// axis is the one, of six tried, that raises the tip most at the worst moment)
const TIPFIX = (() => {
  const t = 3.92, low = (L) => { const W = worlds(doc, L); return Math.min(...['MiddleFinger3_L', 'MiddleFinger2_L'].map((n) => pos(W, n).y)); };
  let best = null;
  for (const ax of [X, Y, Z]) for (const sg of [1, -1]) { const L = landPose(t, 0); applyKeys(L, { MiddleFinger1_L: [[ax, sg * 18]] }); const y = low(L); if (!best || y > best.y) best = { ax, sg, y }; }
  console.log('wing tip lift axis', best.ax.toArray(), best.sg, 'tip', low(landPose(t, 0)).toFixed(3), '->', best.y.toFixed(3));
  return (tt, k = 1) => { const e = k * env(tt, 3.62, 3.82, 4.02, 4.25); return { MiddleFinger1_L: [[best.ax, best.sg * 18 * e]], SubPinky1_L: [[best.ax, best.sg * 12 * e]], Pinky1_L: [[best.ax, best.sg * 8 * e]] }; };
})();
const land = bake('land', { dur: LD, pose: (t) => landPose(LAND0 + t, ramp(t, LD - 0.55, LD)), keys: (t) => TIPFIX(LAND0 + t) });
if (process.argv.includes('--where')) {
  const pr = body.getMesh().listPrimitives()[0], J = pr.getAttribute('JOINTS_0'), Wt = pr.getAttribute('WEIGHTS_0'), js = JOINTS, je = [], we = [];
  const dom = (v) => { J.getElement(v, je); Wt.getElement(v, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; return js[je[b]].getName(); };
  const lows = (a) => a.rows.map((L, f) => { const P = skinnedPoints(doc, worlds(doc, L), 1); let m = 0; P.forEach((q, i) => { if (q.y < P[m].y) m = i; }); return f % 3 ? null : `${(f / FPS).toFixed(1)}:${P[m].y.toFixed(2)}${P[m].y < -0.03 ? '(' + dom(m) + ')' : ''}`; }).filter(Boolean).join(' ');
  console.log('land lows', lows(land));
  console.log('src wing tip height (feet = 0)', [2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 3.1].map((t) => { const L = src(SRCA.Landing, t), W = worlds(doc, L); return t + ':' + (pos(W, 'MiddleFinger3_L').y - footY(L)).toFixed(2); }).join(' '));
}

// takeoff: a crouch, then the landing backwards from the crouch to the hover (the wings open, rise, and beat down as the
// feet leave the ground)
const TK0 = 2.8, TKS = 1.3, TKC = 0.22, TK = TKC + (LAND1 - TK0) / TKS;
const takeoff = bake('takeoff', {
  dur: TK,
  pose: (t) => landPose(LAND1 - Math.max(0, t - TKC) * TKS, 1 - ramp(t, TKC, TKC + 0.5)),
  keys: (t) => { const c = bump(t, 0, TKC + 0.25); return merge(TIPFIX(LAND1 - Math.max(0, t - TKC) * TKS), { Torso: [[X, 6 * c]], Neck: [[X, 10 * c]], Spine: [[X, 4 * c]] }, ...SIDES.map(([s, sg]) => ({ [`Shoulder_${s}`]: [[Z, sg * 10 * c]] }))); },
  root: (t) => ({ p: [0, -0.07 * bump(t, 0, TKC + 0.25), 0] })
});
// perch (extra): the grounded crouch, breathing, looking about
const PERCH = () => landPose(LAND1, 1);
const PC = 3.2;
const breathe = (t, k = 1) => {
  const w = (2 * Math.PI * t) / PC;
  return merge({ Torso: [[X, 1.6 * Math.sin(w) * k]], Spine: [[X, -1 * Math.sin(w) * k]], Neck: [[Y, 7 * Math.sin(w) * k], [X, 2 * Math.sin(2 * w) * k]],
    Head: [[Y, 9 * Math.sin(w + 0.6) * k], [X, -3 * Math.sin(2 * w + 1) * k]], Jaw1: [[X, (1.5 + 1.5 * Math.sin(2 * w)) * k]] },
  Object.fromEntries(TAIL.map((b, i) => [b, [[Y, 4 * Math.sin(w - 0.45 * i) * k]]])),
  ...SIDES.map(([s, sg]) => ({ [`Shoulder_${s}`]: [[Z, sg * 1.5 * Math.sin(w + 0.4) * k]] })));
};
const perch = bake('perch', { dur: PC, loop: true, pose: PERCH, keys: (t) => breathe(t) });
// attack: a bite on the ground. It rears back with the jaws opening, lunges with the neck and chest, the jaws snap
// shut at the strike and it recovers into the crouch.
const ATK = 1.0, STRIKE = 0.46;
const attack = bake('attack', {
  dur: ATK, pose: PERCH,
  keys: (t) => {
    const back = bump(t, 0, 0.38), lunge = env(t, 0.26, STRIKE, STRIKE + 0.05, 0.85), gape = env(t, 0.05, 0.3, STRIKE - 0.06, STRIKE + 0.005);
    return merge(
      { Torso: [[X, -10 * back + 10 * lunge]], Spine: [[X, -4 * back + 4 * lunge]], Neck: [[X, -26 * back + 24 * lunge]], Head: [[X, -10 * back + 4 * lunge]],
        Jaw1: [[X, 34 * gape]], Tongue1: [[X, 10 * gape]] },
      ...SIDES.map(([s, sg]) => ({ [`Shoulder_${s}`]: [[Z, sg * 14 * lunge]], [`Wing1_${s}`]: [[Z, sg * 8 * lunge]] })),
      Object.fromEntries(TAIL.map((b, i) => [b, [[X, 3 * lunge]]])));
  },
  root: (t) => { const back = bump(t, 0, 0.38), lunge = env(t, 0.26, STRIKE, STRIKE + 0.05, 0.85); return { p: [0, 0.04 * back + 0.02 * lunge, -0.08 * back + 0.2 * lunge] }; }
});
{
  let zmax = -1e9, tz = 0; attack.rows.forEach((L, f) => { const z = pos(worlds(doc, L), 'Jaw2').z; if (z > zmax) { zmax = z; tz = f / FPS; } });
  const jaw = attack.rows.map((L) => 2 * Math.acos(Math.min(1, Math.abs(L.get(B('Jaw1')).q.dot(restLoc.get(B('Jaw1')).q)))) / deg);
  console.log('attack: jaw furthest forward at', tz.toFixed(2), 's; jaw open', jaw.map((v, i) => (i % 3 ? null : (i / FPS).toFixed(1) + ':' + v.toFixed(0))).filter(Boolean).join(' '));
}
// hit: a flinch, head knocked up and aside, wings flared
const hit = bake('hit', {
  dur: 0.5, pose: PERCH,
  keys: (t, d) => { const k = bump(t, 0, d) , j = Math.exp(-t * 7) * Math.sin(t * 30); return merge({ Torso: [[X, -10 * k]], Neck: [[X, -18 * k], [Z, 6 * j]], Head: [[X, -14 * k], [Z, 12 * k]], Jaw1: [[X, 18 * k]] },
    ...SIDES.map(([s, sg]) => ({ [`Shoulder_${s}`]: [[Z, sg * 18 * k]], [`Wing1_${s}`]: [[Z, sg * 10 * k]] }))); },
  root: (t, d) => ({ p: [0, 0.04 * bump(t, 0, d), -0.1 * bump(t, 0, d)] })
});
// daze (extra): blinded by a lamp, it staggers with its head shaking and its wings half raised before its eyes
const DZ = 2.0;
const daze = bake('daze', {
  dur: DZ, loop: true, pose: PERCH,
  keys: (t) => { const w = (2 * Math.PI * t) / DZ, sh = Math.sin(w * 3); return merge(
    { Neck: [[X, 12], [Y, 14 * Math.sin(w)]], Head: [[Y, 24 * sh], [X, 10 + 6 * Math.sin(w * 2)], [Z, 10 * Math.sin(w)]], Jaw1: [[X, 10 + 6 * Math.sin(w * 4)]], Torso: [[Z, 4 * Math.sin(w)]] },
    ...SIDES.map(([s, sg]) => ({ [`Shoulder_${s}`]: [[Z, sg * (13 + 3 * Math.sin(w + sg))], [Y, -sg * 8]], [`Wing1_${s}`]: [[Z, sg * 22], [Y, -sg * 26]], [`Wing2_${s}`]: [[Y, -sg * 12]] })),
    Object.fromEntries(TAIL.map((b, i) => [b, [[Y, 7 * Math.sin(w - 0.5 * i)]]]))); },
  root: (t) => { const w = (2 * Math.PI * t) / DZ; return { r: [[Z, 5 * Math.sin(w)]], p: [0.05 * Math.sin(w), 0, 0] }; }
});
// die: it rears with the jaws wide and the wings thrown up, the wings go limp as it pitches forward and crashes onto its
// right wing, rolls back and sprawls belly-down, wings draped flat on the ground, neck stretched out, head on its side.
// Its lowest point is kept on y = 0 throughout (the game lowers a dying flier to the ground first).
const DIE = 2.0;
const WINGB = new Set(); for (const [s] of SIDES) { const walk = (n) => { WINGB.add(n); n.listChildren().forEach(walk); }; walk(B('Shoulder_' + s)); }
const TAILB = new Set(TAIL.map(B));
const dieKeys = (t) => {
  const a = bump(t, 0, 0.8), l = ramp(t, 0.85, 1.45), tw = Math.exp(-Math.max(0, t - 1.5) * 5) * Math.sin(Math.max(0, t - 1.5) * 30) * ramp(t, 1.45, 1.55);
  return merge(
    { Neck: [[X, -34 * a + 6 * l], [Y, -10 * l]], Head: [[X, -24 * a], [Z, -26 * l], [Y, -10 * l]], Jaw1: [[X, 36 * a + 14 * l]], Torso: [[X, -8 * a]],
      TailBase: [[X, 22 * bump(t, 0, 0.85)]], Tail1: [[X, 8 * bump(t, 0, 0.85)]] },
    ...SIDES.map(([s, sg]) => ({
      [`Shoulder_${s}`]: [[Z, sg * (42 * a - 12 * ramp(t, 0.5, 1.1))]], [`Wing1_${s}`]: [[Z, sg * (18 * a - 3 * l)]], [`Hand_${s}`]: [[Z, -sg * 4 * l]],
      [`MiddleFinger3_${s}`]: [[Z, sg * 3 * tw]], [`Thigh_${s}`]: [[X, 16 * l], [Z, sg * 14 * l]], [`Shin_${s}`]: [[X, -16 * l]]
    })),
    Object.fromEntries(TAIL.map((b, i) => [b, [[Y, (-7 * l + 3 * tw) * (i > 1 ? 1 : 0.4)], [X, -1.5 * l]]])));
};
// which side each vertex belongs to (its strongest bone under a shoulder), to settle the body and lift a wing apart
const SIDE_OF = (() => {
  const pr = body.getMesh().listPrimitives()[0], J = pr.getAttribute('JOINTS_0'), Wt = pr.getAttribute('WEIGHTS_0'), je = [], we = [], out = [];
  const sideOf = new Map(); for (const [s] of SIDES) { const walk = (n) => { sideOf.set(n, s); n.listChildren().forEach(walk); }; walk(B('Shoulder_' + s)); }
  for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); Wt.getElement(i, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; out.push(sideOf.get(JOINTS[je[b]]) || 'B'); }
  return out;
})();
const lowParts = (L) => { const P = skinnedPoints(doc, worlds(doc, L), 1), lo = { B: 1e9, L: 1e9, R: 1e9 }; for (let i = 0; i < P.length; i += 3) { const k = SIDE_OF[i]; if (P[i].y < lo[k]) lo[k] = P[i].y; } return lo; };
const dieClip = bake('die', {
  dur: DIE,
  pose: (t) => {
    // the wings: from the fold, thrown up half-spread, then fully spread and limp; the tail half straightens
    const wW = Math.min(1, 0.7 * ramp(t, 0.02, 0.35) + 0.3 * ramp(t, 0.5, 1.0)), wT = 0.5 * ramp(t, 0.6, 1.4);
    const make = (lift) => {
      const L = mix(landPose(LAND1, 1 - ramp(t, 0.7, 1.4)), rest(), (n) => (WINGB.has(n) ? wW : TAILB.has(n) ? wT : 0));
      applyKeys(L, merge(dieKeys(t), ...SIDES.map(([s, sg]) => ({ [`Shoulder_${s}`]: [[Z, sg * lift[s]]] }))));
      // rear about the hips, then pitch forward and roll onto the right wing, and back flat
      const rear = bump(t, 0, 0.85), roll = -26 * bump(t, 0.5, 1.3);
      return applyRoot(L, { r: [[X, -24 * rear + 5 * bump(t, 0.7, 1.4)], [Z, roll]], pivot: new THREE.Vector3(0, 0.22, -0.35) });
    };
    // body, legs and tail rest on the ground; a wing that would pierce it swings up at the shoulder instead of
    // levering the body into the air (a few passes: the lift needed is about asin(depth / wing length))
    const lift = { L: 0, R: 0 };
    let L = make(lift), lo = lowParts(L);
    for (let it = 0; it < 4; it++) {
      let again = false;
      for (const s of ['L', 'R']) { const d = lo.B - lo[s]; if (d > 0.015) { lift[s] += (Math.asin(Math.min(1, d / 1.3)) / deg) * 1.05; again = true; } }
      if (!again) break;
      L = make(lift); lo = lowParts(L);
    }
    applyRoot(L, { p: [0, -Math.min(lo.B, lo.L, lo.R), 0] });
    return applyRoot(L, { p: [0, 0.03 * bump(t, 0.95, 1.2), 0] });
  }
});
if (process.argv.includes('--where')) console.log('die pelvis height', dieClip.rows.map((L, f) => (f % 3 ? null : (f / FPS).toFixed(1) + ':' + pos(worlds(doc, L), PELVIS).y.toFixed(2))).filter(Boolean).join(' '));
console.log('die end: lowest', lowY(dieClip.rows.at(-1), 1).toFixed(3), 'top', Math.max(...pts(dieClip.rows.at(-1), 3).map((p) => p.y)).toFixed(2));

// ---------- 8. checks: no clip stretches the skin (edge lengths against the bind pose) ----------
if (process.argv.includes('--check')) {
  const p = body.getMesh().listPrimitives()[0], I = p.getIndices().getArray(), edges = [];
  for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) if (a < b) edges.push(a, b);
  const P0 = skinnedPoints(doc, restW, 1), len0 = [];
  for (let e = 0; e < edges.length; e += 2) len0.push(P0[edges[e]].distanceTo(P0[edges[e + 1]]));
  for (const a of R.listAnimations()) {
    if (!a.rows) continue;
    let worst = 0, wt = 0, over = 0;
    for (let f = 0; f < a.rows.length; f += 3) {
      const Pf = skinnedPoints(doc, worlds(doc, a.rows[f]), 1);
      for (let e = 0, j = 0; e < edges.length; e += 2, j++) { if (len0[j] < 0.004) continue; const r = Pf[edges[e]].distanceTo(Pf[edges[e + 1]]) / len0[j]; if (r > worst) { worst = r; wt = f / FPS; } if (r > 1.6) over++; }
    }
    let lo = 1e9, lt = 0, hi = -1e9; for (let f = 0; f < a.rows.length; f += 2) { const P = skinnedPoints(doc, worlds(doc, a.rows[f]), 3); for (const q of P) { if (q.y < lo) { lo = q.y; lt = f / FPS; } hi = Math.max(hi, q.y); } }
    console.log('stretch', a.getName().padEnd(8), 'worst', worst.toFixed(2), 'at', wt.toFixed(2), 's; edge-frames over 1.6x:', over, '| lowest', lo.toFixed(2), 'at', lt.toFixed(2), 'highest', hi.toFixed(2));
    if (process.argv.includes('--where')) {
      const J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0'), js = R.listSkins()[0].listJoints(), je = [], we = [];
      const dom = (v) => { J.getElement(v, je); Wt.getElement(v, we); let b = 0; for (let c = 1; c < 4; c++) if (we[c] > we[b]) b = c; return js[je[b]].getName(); };
      const Pf = skinnedPoints(doc, worlds(doc, a.rows[Math.round(wt * FPS)]), 1), cnt = {};
      for (let e = 0, j = 0; e < edges.length; e += 2, j++) { if (len0[j] < 0.004) continue; const r = Pf[edges[e]].distanceTo(Pf[edges[e + 1]]) / len0[j]; if (r > 1.6) { const k = [dom(edges[e]), dom(edges[e + 1])].sort().join('+'); cnt[k] = (cnt[k] || 0) + 1; } }
      console.log('   ', Object.entries(cnt).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => k + ':' + v).join('  '));
    }
  }
}
// ---------- 9. finish ----------
for (const a of Object.values(SRCA)) if (!RAW && !a.isDisposed?.()) dropClip(a);
// the names the game looks for (the hit flinch bends 'chest')
B('Torso').setName('chest'); B('Head').setName('head');
const b = bounds(doc, null, 0, 1);
const extras = {
  hit: { attack: STRIKE }, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 4.5, runSpeed: 9, span: SPAN,
  credit: '"Prowler Dragon Variant Rig" by SuperKapoo913 (DM-913), sketchfab.com/SuperKapoo913, CC-BY 4.0 - re-rigged to its bind pose, decimated, regraded to burnt bone with an ember coal, animations made for Skotos', license: 'CC-BY-4.0'
};
if (DBG) await io.write(DBG.replace(/\.glb$/, '_raw.glb'), doc);
const bytes = await finish(doc, DBG || OUT, extras, { base: 1024, aux: 512 });
console.log('ashwing', (bytes / 1024).toFixed(0) + ' KB', 'clips', R.listAnimations().map((a) => a.getName() + ':' + duration(a).toFixed(2)).join(' '));
