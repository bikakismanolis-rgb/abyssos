// The Skotos (Το Σκότος): "Cloaked Figure" by MysteryPancake (sketchfab.com/mysterypancake), CC-BY 4.0, for the hood and
// the robe, and "Tentacle (rigged)" by CG Daniel Glebinski (sketchfab.com/CGDanielGlebinski), CC-BY 4.0, for its arms
// -> src/assets/creatures/skotos.glb. A faceless hooded figure of black water whose robe is its own arms.
// The look gate (G1b) failed the design's Ocean Creature and the Lurker (both read as squids) and picked the cloak: a
// T-posed student model of 1.8k triangles with no rig. Here its sleeves are let down to hang from dropped shoulders, the
// face inside the hood is pushed back into a void (vertex colour black: no skin, no rim), and it is subdivided twice (Loop,
// the hood's rim and the cuffs kept as creases) and thinned back to about 7k triangles. Over it fall the arms: the
// tentacle's own mesh (rig.mjs straightTentacle), flattened into broad folds that hang from the shoulders down over the
// robe into the water (their suckers turned in against it), and two long arms that come out of the sleeves.
// About 15k triangles in all, one material: near-black, wet (roughness 0.22) with a tileable 512 px normal map of
// running water (rivulets and ripples, made here), vertex colour for the void and the pale suckers. The game patches the
// material (sea.js skotosSkin: aurora fresnel, the beam's streak, pale flecks), so the scene extras carry keepMat.
// Standing height 3.75 m at x1 with its origin at its base (the game sinks it 3 m at look.scale 3.2: about 12 m tall).
// It never walks. Code rig: root (rise and sink move it), hips, spine, chest, neck, head (the hood); clavicle, shoulder,
// elbow and cuff per side with an arm chain of 8; a chain of 4 down each fold.
// Clips (in place): idle (breathing, swaying, the folds stirring), rise (up out of the sea), sink (down under; held),
// surface (bursts up from beneath), sweep (an arm swung across the front), slam (both arms over and down), drink (it
// gathers the dark into its chest), roar (thrown back, arms and folds flung wide), wrap (arms up and round), recoil (the
// beam: it shrinks back, shielding), hit, lash (an arm whipped out), smother (arms reach and press down), die (the naming:
// it sinks slowly while its arms rise and close over it; held).
// usage: node skotos.mjs [cloak.glb] [tentacle.glb] [out.glb] [--dbg=<dir>]
import { MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { load, finish, worlds, locals, io, sharp } from '../act2/lib.mjs';
import { THREE, V, X, Y, Z, Qa, Qb, deg, clamp, smooth, ramp, bump, env, kf, TAU, makeRig, fk, skin, buildDoc, writeClip, smoothNormals, weldPositions, straightTentacle } from './rig.mjs';
import { loopSubdivide } from './subdiv.mjs';
import { waterNormalMap } from './water.mjs';
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [SRC = '/tmp/claude-0/sf/act5/cloak/model.glb', TENT = '/tmp/claude-0/sf/act5/tentacle/model.glb', OUT = new URL('../../../src/assets/creatures/skotos.glb', import.meta.url).pathname] = ARGS;
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const STAGE = (process.argv.find((a) => a.startsWith('--stage=')) || '').slice(8);
if (DBG) mkdirSync(DBG, { recursive: true });

const HEIGHT = 3.75;            // the hood's crown, metres (x1)
const CLOAK_TRIS = 7000;
await MeshoptSimplifier.ready;

// ---------- 1. the cloak: one mesh, welded, in metres, centred on the body ----------
const src = await load(SRC);
const fig = src.getRoot().listNodes().find((n) => n.getName() === 'Figure_lambert6_0');
const fprim = fig.getMesh().listPrimitives()[0];
const FM = worlds(src, locals(src, null, 0)).get(fig);
let cpos, cidx;
{
  const Pa = fprim.getAttribute('POSITION'), e = [], raw = [];
  for (let i = 0; i < Pa.getCount(); i++) raw.push(...V(...Pa.getElement(i, e)).applyMatrix4(FM).toArray());
  const W = weldPositions(raw, 1e-4);
  cpos = W.pos; cidx = Array.from(fprim.getIndices().getArray(), (i) => W.remap[i]);
}
const SRC_TOP = Math.max(...cpos.filter((_, i) => i % 3 === 1));
const K = HEIGHT / SRC_TOP, OZ = -0.11;  // source units to metres; the body's centre line in the source
// source-space landmarks (measured): the sleeve joins the body in a ring about x 0.31, and its cuff ends near x 0.82
const SH = { x: 0.31, y: 1.33, z: OZ }, CUFF = { x: 0.82, y: 0.93, z: OZ };

// ---------- 2. the sleeves let down, the face pushed back into the void ----------
const nC = cpos.length / 3;
const voidA = new Float32Array(nC), sleeveW = new Float32Array(nC), sleeveT = new Float32Array(nC);
const DROP = 52, FWD = 14;      // degrees: the sleeves swing down about the shoulder, then forward
for (let i = 0; i < nC; i++) {
  let x = cpos[i * 3], y = cpos[i * 3 + 1], z = cpos[i * 3 + 2];
  const side = Math.sign(x) || 1, ax = Math.abs(x);
  // the sleeve: everything out past the join ring, above the robe's skirt
  const w = smooth((ax - 0.335) / 0.07) * smooth((y - 0.74) / 0.06);
  if (w > 0) {
    const p = V(ax - SH.x, y - SH.y, z - SH.z);
    p.applyAxisAngle(Z, -DROP * w * deg).applyAxisAngle(X, -FWD * w * deg);
    x = side * (p.x + SH.x); y = p.y + SH.y; z = p.z + SH.z;
  }
  sleeveW[i] = w;
  sleeveT[i] = clamp((ax - SH.x) / (CUFF.x - SH.x));
  // the face: inside the hood's opening, behind its rim
  const ex = x / 0.118, ey = (y - 1.662) / 0.118, inOpen = ex * ex + ey * ey;
  if (y > 1.5 && inOpen < 1 && z < 0.175 && z > 0.0) { voidA[i] = 1 - smooth((inOpen - 0.75) / 0.25); z -= 0.045 * voidA[i]; }
  cpos[i * 3] = x * K; cpos[i * 3 + 1] = y * K; cpos[i * 3 + 2] = (z - OZ) * K;
}
const SHm = V(SH.x * K, SH.y * K, 0);                       // the shoulder pivot in metres (left side +x)
const CUFFm = V(CUFF.x - SH.x, CUFF.y - SH.y, 0).applyAxisAngle(Z, -DROP * deg).applyAxisAngle(X, -FWD * deg).add(V(SH.x, SH.y, 0)).multiplyScalar(K);

// ---------- 3. subdivided twice (the hood's rim, the cuffs and the hem kept), thinned back ----------
let sub = { pos: cpos, idx: cidx, attrs: { v: { size: 1, data: Array.from(voidA) }, w: { size: 1, data: Array.from(sleeveW) }, t: { size: 1, data: Array.from(sleeveT) } } };
for (let k = 0; k < 2; k++) sub = loopSubdivide(sub.pos, sub.idx, sub.attrs, { crease: 62 });
// the robe hangs in folds: a ripple round the body, deepening from the shoulders to the hem (not the sleeves or the hood)
for (let i = 0; i < sub.pos.length / 3; i++) {
  const x = sub.pos[i * 3], y = sub.pos[i * 3 + 1], z = sub.pos[i * 3 + 2], r = Math.hypot(x, z), w = sub.attrs.w.data[i];
  if (r < 0.05 || w > 0.95) continue;
  const phi = Math.atan2(x, z), A = 0.055 * smooth((2.7 - y) / 1.5) * (1 - w);
  const d = A * (0.6 * Math.sin(7 * phi + 0.8 * Math.sin(3 * phi + y * 0.7)) + 0.4 * Math.sin(12 * phi + 1.3 + y * 0.5));
  sub.pos[i * 3] += (x / r) * d; sub.pos[i * 3 + 2] += (z / r) * d;
}
{
  const n = sub.pos.length / 3, at = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { at[i * 2] = sub.attrs.v.data[i]; at[i * 2 + 1] = sub.attrs.w.data[i]; }
  const [simp, err] = MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(sub.idx), new Float32Array(sub.pos), 3, at, 2, [0.3, 0.05], null, CLOAK_TRIS * 3, 0.01, []);
  const used = new Map(), P = [], A = { v: [], w: [], t: [] }, I = [];
  for (const o of simp) {
    let j = used.get(o);
    if (j === undefined) { j = used.size; used.set(o, j); P.push(sub.pos[o * 3], sub.pos[o * 3 + 1], sub.pos[o * 3 + 2]); for (const nm of ['v', 'w', 't']) A[nm].push(sub.attrs[nm].data[o]); }
    I.push(j);
  }
  console.log('cloak:', cidx.length / 3, 'tris -> subdivided', sub.idx.length / 3, '-> thinned', I.length / 3, 'error', err.toFixed(4));
  sub = { pos: P, idx: I, attrs: A };
}
const CLOAK = sub;

if (STAGE === 'cloak') {
  const n = CLOAK.pos.length / 3;
  const rig = makeRig([{ name: 'root', parent: null, p: V() }]);
  const col = []; for (let i = 0; i < n; i++) { const v = CLOAK.attrs.v[i], w = CLOAK.attrs.w[i]; col.push(0.8 - 0.75 * v, 0.8 - 0.5 * w - 0.75 * v, 0.8 - 0.75 * v); }
  const mesh = { pos: CLOAK.pos, nor: smoothNormals(CLOAK.pos, CLOAK.idx), col, idx: CLOAK.idx, J: new Uint16Array(n * 4), W: new Float32Array(n * 4).map((_, i) => (i % 4 ? 0 : 1)) };
  const D = buildDoc(rig, mesh, { name: 'dbg', base: [1, 1, 1, 1], rough: 0.6 });
  await io.write(OUT, D.doc);
  console.log('stage cloak ->', OUT);
  process.exit(0);
}

// ---------- 4. the arms: the tentacle's mesh laid along paths, as the folds of its robe ----------
// the straight tentacle at unit length (cross-section in the same relative units), thinned once: each fold is narrow where
// it comes out from under the hood, broadest a quarter of the way down, and tapers to the source's tip in the water
const FOLD_TRIS = 850;
const tipIn = (s) => 1 - 0.62 * smooth((s - 0.86) / 0.14);   // the source's spade-shaped tip drawn to a point
const FOLD_SRC = await straightTentacle(TENT, { base: 0, top: 1, thick: (s) => (0.45 + 0.75 * smooth(s / 0.3)) * (1 + 0.3 * Math.pow(1 - s, 2)) * tipIn(s), tris: FOLD_TRIS, log: false });
// a smooth path through points (centripetal-ish Catmull-Rom), resampled by arc length: at(s) -> { p, t } for s in 0..1
function path(points, n = 64) {
  const pts = points.map((p) => p.clone()), seg = [];
  const cr = (p0, p1, p2, p3, u) => {
    const u2 = u * u, u3 = u2 * u;
    return p1.clone().multiplyScalar(2).add(p2.clone().sub(p0).multiplyScalar(u)).add(p0.clone().multiplyScalar(2).sub(p1.clone().multiplyScalar(5)).add(p2.clone().multiplyScalar(4)).sub(p3).multiplyScalar(u2))
      .add(p1.clone().multiplyScalar(3).sub(p0).sub(p2.clone().multiplyScalar(3)).add(p3).multiplyScalar(u3)).multiplyScalar(0.5);
  };
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 16; k++) dense.push(cr(p0, p1, p2, p3, k / 16));
  }
  dense.push(pts[pts.length - 1].clone());
  const L = [0]; for (let i = 1; i < dense.length; i++) L.push(L[i - 1] + dense[i].distanceTo(dense[i - 1]));
  const total = L[L.length - 1];
  const at = (s) => {
    const d = clamp(s) * total; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const f = (d - L[i - 1]) / Math.max(1e-9, L[i] - L[i - 1]);
    const p = dense[i - 1].clone().lerp(dense[i], f), t = dense[i].clone().sub(dense[i - 1]).normalize();
    // past either end the path runs straight on
    if (s < 0) p.addScaledVector(t, s * total); else if (s > 1) p.addScaledVector(t, (s - 1) * total);
    return { p, t };
  };
  return { at, length: total };
}
// lays a straight piece (axis +Y over 0..1, suckers +Z) along a path: +Z turns toward `inward(p)`, the cross-section is
// scaled to width (half-width along the surface) and depth (half-depth toward the body), metres at the root before thick()
const R0 = 0.0335;   // the straight source's root radius at unit length
function layAlong(piece, P, o) {
  const n = piece.pos.length / 3, pos = [], ang = [];
  for (let i = 0; i < n; i++) {
    const x = piece.pos[i * 3], y = piece.pos[i * 3 + 1], z = piece.pos[i * 3 + 2];
    const s = y, { p, t } = P.at(s);
    const nIn = o.inward(p, s).projectOnPlane(t).normalize(), b = t.clone().cross(nIn);
    const q = p.clone().addScaledVector(b, (x * o.width) / R0).addScaledVector(nIn, (z * o.depth) / R0);
    pos.push(q.x, q.y, q.z); ang.push(Math.atan2(x, -z) / TAU + 0.5);   // round the tube, the seam on the sucker side
  }
  return { pos, ang, idx: Array.from(piece.idx), s: piece.s.slice(), suck: piece.suck.slice() };
}
// the robe's outer surface: the farthest hit of a ray from the body's axis (sleeves left out)
const bodyTris = [];
for (let k = 0; k < CLOAK.idx.length; k += 3) {
  const [a, b, c] = [CLOAK.idx[k], CLOAK.idx[k + 1], CLOAK.idx[k + 2]];
  if (CLOAK.attrs.w[a] + CLOAK.attrs.w[b] + CLOAK.attrs.w[c] > 0.6) continue;
  bodyTris.push([a, b, c].map((v) => V(CLOAK.pos[v * 3], CLOAK.pos[v * 3 + 1], CLOAK.pos[v * 3 + 2])));
}
function robeR(phi, y) {
  const o = V(0, y, 0), d = V(Math.sin(phi), 0, Math.cos(phi)), ray = new THREE.Ray(o, d), hit = V();
  let best = 0;
  for (const [a, b, c] of bodyTris) if (ray.intersectTriangle(a, b, c, false, hit)) best = Math.max(best, hit.distanceTo(o));
  return best;
}
// folds: [angle round the body (deg, 0 = front), top height, width]; the two at +-44 deg are its arms (longer chains)
const FOLDS = [[16, 2.86, 1], [-16, 2.86, 1], [44, 2.82, 1.05], [-44, 2.82, 1.05], [100, 2.76, 0.95], [-100, 2.76, 0.95], [145, 2.88, 1.05], [-145, 2.88, 1.05], [180, 2.92, 1.1]];
const ARMS = [2, 3];
const PIECES = [];
FOLDS.forEach(([a, top, wk], fi) => {
  const phi = a * deg, pts = [];
  const rTop = robeR(phi, top);
  pts.push(V(Math.sin(phi) * (rTop - 0.1), top + 0.1, Math.cos(phi) * (rTop - 0.1)));  // tucked in under the hood
  for (const y of [top - 0.25, 2.2, 1.6, 1.0, 0.45, 0.0, -0.45]) {
    const r = robeR(phi, Math.max(0.05, Math.min(top - 0.05, y))) || 0.6;
    const out = y < 0.3 ? 0.07 + (0.3 - y) * 0.25 : 0.07;     // sits on the robe; flares a little past the hem
    pts.push(V(Math.sin(phi) * (r + out), y, Math.cos(phi) * (r + out)));
  }
  const P = path(pts);
  const g = layAlong(FOLD_SRC, P, { width: 0.2 * wk, depth: 0.075, inward: (p) => V(-p.x, 0, -p.z) });
  PIECES.push({ kind: ARMS.includes(fi) ? 'arm' : 'fold', i: fi, phi, P, ...g });
});
console.log('pieces:', PIECES.map((p) => `${p.kind}${p.i} ${(p.idx.length / 3)} tris ${p.P.length.toFixed(2)} m`).join(', '));

if (STAGE === 'pieces') {
  const rig = makeRig([{ name: 'root', parent: null, p: V() }]);
  const pos = [], idx = [], col = [];
  const addG = (P, I, c) => { const b = pos.length / 3; pos.push(...P); for (const i of I) idx.push(i + b); for (let i = 0; i < P.length / 3; i++) col.push(...c(i)); };
  addG(CLOAK.pos, CLOAK.idx, (i) => [0.8 - 0.75 * CLOAK.attrs.v[i], 0.8 - 0.75 * CLOAK.attrs.v[i], 0.8 - 0.75 * CLOAK.attrs.v[i]]);
  for (const p of PIECES) addG(p.pos, p.idx, (i) => (p.kind === 'arm' ? [0.5, 0.7, 0.9] : [0.9, 0.6, 0.5]).map((v) => v * (1 - 0.5 * p.suck[i])));
  const n = pos.length / 3;
  const nor = []; { const N = smoothNormals(pos, idx); nor.push(...N); }
  const mesh = { pos, nor, col, idx, J: new Uint16Array(n * 4), W: new Float32Array(n * 4).map((_, i) => (i % 4 ? 0 : 1)) };
  const D = buildDoc(rig, mesh, { name: 'dbg', base: [1, 1, 1, 1], rough: 0.6 });
  await io.write(OUT, D.doc);
  console.log('stage pieces ->', OUT, n, 'verts', idx.length / 3, 'tris');
  process.exit(0);
}

// ---------- 5. the rig and the skin ----------
// body: root (base), hips, spine, chest, neck, head (the hood); per side clavicle, shoulder (the sleeve's join), elbow,
// cuff (the sleeves); per fold a chain hanging from under the hood (5 joints; the two arms 7). Names: L is +X (its left).
const FOLD_NAME = (fi) => (ARMS.includes(fi) ? (FOLDS[fi][0] > 0 ? 'armL' : 'armR') : 'fold' + fi);
const FOLD_S = (fi) => (ARMS.includes(fi) ? [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9] : [0.06, 0.26, 0.46, 0.66, 0.86]);
const ELB = SHm.clone().lerp(CUFFm, 0.5);
const J0 = [
  { name: 'root', parent: null, p: V(0, 0, 0) }, { name: 'hips', parent: 'root', p: V(0, 1.2, 0) }, { name: 'spine', parent: 'hips', p: V(0, 1.85, 0) },
  { name: 'chest', parent: 'spine', p: V(0, 2.45, 0) }, { name: 'neck', parent: 'chest', p: V(0, 2.9, 0.02) }, { name: 'head', parent: 'neck', p: V(0, 3.2, 0.06) }
];
for (const [sd, sg] of [['L', 1], ['R', -1]]) {
  const m = (v) => v.clone().multiply(V(sg, 1, 1));
  J0.push({ name: 'clav_' + sd, parent: 'chest', p: V(sg * 0.22, 2.72, 0) }, { name: 'shoulder_' + sd, parent: 'clav_' + sd, p: m(SHm) },
    { name: 'elbow_' + sd, parent: 'shoulder_' + sd, p: m(ELB) }, { name: 'cuff_' + sd, parent: 'elbow_' + sd, p: m(CUFFm) });
}
PIECES.forEach((pc) => {
  const nm = FOLD_NAME(pc.i);
  FOLD_S(pc.i).forEach((s, k) => J0.push({ name: `${nm}_${k + 1}`, parent: k ? `${nm}_${k}` : 'chest', p: pc.P.at(s).p }));
  pc.name = nm; pc.js = FOLD_S(pc.i);
});
const rig = makeRig(J0);
const JI = (n) => { const i = rig.idx.get(n); if (i === undefined) throw new Error('no joint ' + n); return i; };
// one merged mesh: positions, per-vertex weights, colour (void, suckers), and which piece each vertex belongs to
// colour (COLOR_0 times the base factor): the skin SKIN_C, the void 0, the suckers' rims up to 1
const SKIN_C = 0.3, BASE = [0.036, 0.032, 0.05];
const POS = [], IDX = [], WTS = [], COL = [], PART = [], UV = [];
const UV_ROUND = 5, UV_V = 0.8;   // the water map: 5 tiles round the robe, 1 round each fold; 0.8 a metre down
{
  const BODY = [['hips', 1.2], ['spine', 1.85], ['chest', 2.45], ['neck', 2.9], ['head', 3.2]];
  const bodyW = (y) => {
    if (y <= BODY[0][1]) return { [JI('hips')]: 1 };
    for (let k = 0; k < BODY.length - 1; k++) if (y <= BODY[k + 1][1]) { const f = smooth((y - BODY[k][1]) / (BODY[k + 1][1] - BODY[k][1])); return { [JI(BODY[k][0])]: 1 - f, [JI(BODY[k + 1][0])]: f }; }
    return { [JI('head')]: 1 };
  };
  const n = CLOAK.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const x = CLOAK.pos[i * 3], y = CLOAK.pos[i * 3 + 1];
    const w = CLOAK.attrs.w[i], t = CLOAK.attrs.t[i], sd = x >= 0 ? 'L' : 'R';
    const W = {};
    for (const [j, v] of Object.entries(bodyW(y))) W[j] = (W[j] || 0) + v * (1 - w);
    if (w > 0) {
      const sl = t < 0.5 ? [[`shoulder_${sd}`, 1 - smooth(t / 0.5)], [`elbow_${sd}`, smooth(t / 0.5)]] : [[`elbow_${sd}`, 1 - smooth((t - 0.5) / 0.5)], [`cuff_${sd}`, smooth((t - 0.5) / 0.5)]];
      for (const [nm, v] of sl) W[JI(nm)] = (W[JI(nm)] || 0) + v * w;
    }
    WTS.push(W); POS.push(CLOAK.pos[i * 3], y, CLOAK.pos[i * 3 + 2]);
    UV.push((Math.atan2(CLOAK.pos[i * 3], CLOAK.pos[i * 3 + 2]) / TAU + 0.5) * UV_ROUND, y * UV_V);
    const v = CLOAK.attrs.v[i], c = SKIN_C * (1 - v);
    COL.push(c, c, c); PART.push(-1);
  }
  for (const i of CLOAK.idx) IDX.push(i);
  for (const pc of PIECES) {
    const base = POS.length / 3, nv = pc.pos.length / 3, js = pc.js.map((s, k) => [JI(`${pc.name}_${k + 1}`), s]);
    for (let i = 0; i < nv; i++) {
      const s = pc.s[i], W = {};
      if (s <= js[0][1]) { const f = smooth(s / js[0][1]); W[js[0][0]] = f; W[JI('chest')] = 1 - f; }
      else {
        let k = 0; while (k < js.length - 1 && s > js[k + 1][1]) k++;
        if (k === js.length - 1) W[js[k][0]] = 1;
        else { const f = smooth((s - js[k][1]) / (js[k + 1][1] - js[k][1])); W[js[k][0]] = 1 - f; W[js[k + 1][0]] = f; }
      }
      WTS.push(W); POS.push(pc.pos[i * 3], pc.pos[i * 3 + 1], pc.pos[i * 3 + 2]);
      UV.push(pc.ang[i], s * pc.P.length * UV_V);
      const k2 = pc.suck[i], c = SKIN_C + (1 - SKIN_C) * k2 * (1 - 0.4 * smooth((s - 0.75) / 0.25));
      COL.push(c, c, c); PART.push(pc.i);
    }
    for (const i of pc.idx) IDX.push(i + base);
  }
}
// the UV seams (the back of the robe, the sucker side of each fold): a triangle that wraps round takes copies of its
// low-u vertices shifted one period on (the map tiles, so nothing shows)
{
  const dup = new Map();
  for (let t = 0; t < IDX.length; t += 3) {
    const vs = [IDX[t], IDX[t + 1], IDX[t + 2]], per = PART[vs[0]] < 0 ? UV_ROUND : 1, us = vs.map((v) => UV[v * 2]);
    const hi = Math.max(...us); if (hi - Math.min(...us) < per / 2) continue;
    for (let k = 0; k < 3; k++) {
      if (us[k] > hi - per / 2) continue;
      const v = vs[k];
      let c = dup.get(v);
      if (c === undefined) {
        c = POS.length / 3; dup.set(v, c);
        POS.push(POS[v * 3], POS[v * 3 + 1], POS[v * 3 + 2]); COL.push(COL[v * 3], COL[v * 3 + 1], COL[v * 3 + 2]);
        UV.push(UV[v * 2] + per, UV[v * 2 + 1]); WTS.push(WTS[v]); PART.push(PART[v]);
      }
      IDX[t + k] = c;
    }
  }
  console.log('uv seams:', dup.size, 'vertices copied');
}
const NVT = POS.length / 3;
const SJ = new Uint16Array(NVT * 4), SW = new Float32Array(NVT * 4);
WTS.forEach((W, i) => {
  const e = Object.entries(W).filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = e.reduce((a, [, w]) => a + w, 0);
  e.forEach(([j, w], k) => { SJ[i * 4 + k] = +j; SW[i * 4 + k] = w / s; });
});
// normals per shell (the cloak and each fold are separate surfaces)
const NOR = new Float32Array(NVT * 3);
{
  const shells = new Map();
  for (let t = 0; t < IDX.length; t += 3) { const p = PART[IDX[t]]; if (!shells.has(p)) shells.set(p, []); shells.get(p).push(IDX[t], IDX[t + 1], IDX[t + 2]); }
  for (const tri of shells.values()) {
    const N = smoothNormals(POS, tri);
    for (const v of new Set(tri)) for (let k = 0; k < 3; k++) NOR[v * 3 + k] = N[v * 3 + k];
  }
}
console.log('rig:', rig.n, 'joints;', NVT, 'verts', IDX.length / 3, 'tris');

// ---------- 6. clips ----------
// a pose is built by stacking turns on joints: body(P, { hips, spine, chest, neck, head: [bow (about X, forward),
// lean (about Z, toward -X... its right), turn (about Y)] }); fold(P, i, fn(u, k) -> { out, side, tw }) turns each joint
// of fold i: out swings it away from the body (positive) or in against it, side swings it round the body
// (counter-clockwise seen from above), tw twists it; u runs 0 (under the hood) to 1 (the last joint).
const mesh = { pos: POS, nor: NOR, col: COL, uv: UV, idx: IDX, J: SJ, W: SW };
const newPose = () => ({ q: {}, p: {} });
const turn = (P, name, q) => { JI(name); P.q[name] = P.q[name] ? P.q[name].multiply(q) : q.clone(); };
const qBYZ = ([b = 0, l = 0, y = 0] = []) => Qa(Y, y).multiply(Qa(X, b)).multiply(Qa(Z, l));
function body(P, o) { for (const k of ['hips', 'spine', 'chest', 'neck', 'head']) if (o[k]) turn(P, k, qBYZ(o[k])); if (o.y) P.p.root = V(0, o.y, 0); if (o.root) turn(P, 'root', qBYZ(o.root)); }
const OUT_AX = PIECES.map((pc) => V(Math.sin(pc.phi), 0, Math.cos(pc.phi)).cross(Y).normalize());
const SIDE_AX = PIECES.map((pc) => V(Math.sin(pc.phi), 0, Math.cos(pc.phi)));
function fold(P, i, fn) {
  const pc = PIECES[i], n = pc.js.length;
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), b = fn(u, k) || {};
    turn(P, `${pc.name}_${k + 1}`, Qa(OUT_AX[i], b.out || 0).multiply(Qa(SIDE_AX[i], b.side || 0)).multiply(Qa(Y, b.tw || 0)));
  }
}
const allFolds = (P, fn) => PIECES.forEach((pc, i) => fold(P, i, (u, k) => fn(u, k, i, pc)));
const sleeve = (P, sd, lift = 0, fwd = 0) => { const sg = sd === 'L' ? 1 : -1; turn(P, 'shoulder_' + sd, Qa(Z, sg * lift).multiply(Qa(X, -fwd))); };
const IL = ARMS.find((i) => FOLDS[i][0] > 0), IR = ARMS.find((i) => FOLDS[i][0] < 0);   // its left and right arm
const isArm = (i) => ARMS.includes(i);
const lerpP = (A, B, f) => {
  const P = newPose();
  for (const n of new Set([...Object.keys(A.q), ...Object.keys(B.q)])) P.q[n] = (A.q[n] || new THREE.Quaternion()).clone().slerp(B.q[n] || new THREE.Quaternion(), f);
  for (const n of new Set([...Object.keys(A.p), ...Object.keys(B.p)])) P.p[n] = (A.p[n] || V()).clone().lerp(B.p[n] || V(), f);
  return P;
};

const WATER = await waterNormalMap(512, 1.6);
if (DBG) writeFileSync(DBG + '/water_n.png', WATER);
const D = buildDoc(rig, mesh, { name: 'skotos', base: [...BASE, 1], rough: 0.22, metal: 0, textures: { normal: { image: WATER, mime: 'image/png' } }, normalScale: 0.85 }, { rootName: 'skotos', meshName: 'skotos_mesh', skinName: 'skotos' });
const info = {}, HIT = {};
const clip = (name, dur, fn, o = {}) => { const r = writeClip(D, rig, mesh, name, dur, fn, { minEdge: 0.03, fps: 24, ...o }); info[name] = r.info; return r; };

// the living stir under every clip: breathing (two breaths a loop), a slow sway, the folds' wave running down them
const IDLE = 6;
function alive(t, k = 1) {
  const P = newPose(), w = (TAU * t) / IDLE, br = Math.sin(2 * w), sw = Math.sin(w);
  body(P, { hips: [0.6 * k * Math.sin(w + 0.5), 1.2 * k * sw, 0], spine: [0.8 * k * br, 0.6 * k * sw, 0], chest: [1.2 * k * br, 0.5 * k * sw, 1.2 * k * Math.sin(w + 1)],
    neck: [-0.8 * k * br, 0, 0], head: [1.5 * k * Math.sin(w + 2.2), -1.4 * k * sw, 2.5 * k * Math.sin(w - 0.6)], y: 0.025 * k * Math.sin(w - 0.8) });
  allFolds(P, (u, kk, i, pc) => {
    const ph = pc.phi * 1.7 + i * 0.9, a = isArm(i) ? 1.4 : 1;
    return { out: k * a * (1.6 + 1.2 * u) * Math.sin(w - u * 2.2 + ph) + k * 0.8 * br * (1 - u), side: k * a * 1.4 * u * Math.sin(w * 2 - u * 2.6 + ph * 0.7), tw: k * 2 * u * Math.sin(w + ph) };
  });
  sleeve(P, 'L', 1.2 * k * Math.sin(w + 0.4), 0.8 * k * br); sleeve(P, 'R', 1.2 * k * Math.sin(w + 2.4), 0.8 * k * br);
  return P;
}
const stack = (...Ps) => { const P = newPose(); for (const Q of Ps) { for (const [n, q] of Object.entries(Q.q)) turn(P, n, q); for (const [n, v] of Object.entries(Q.p)) P.p[n] = (P.p[n] || V()).add(v); } return P; };

clip('idle', IDLE, (t) => alive(t), { loop: true });

// rise: up out of the sea, the hood bowed, the folds dragging below it; it straightens and the folds settle
clip('rise', 5.0, (t) => {
  const P = newPose(), up = kf(t, [[0, -3.95], [3.4, 0.08], [4.2, -0.02], [5, 0]]), drag = 1 - ramp(t, 2.6, 4.6), bow = 1 - ramp(t, 2.2, 4.4);
  body(P, { y: up, spine: [6 * bow, 0, 0], chest: [8 * bow, 0, 0], neck: [10 * bow, 0, 0], head: [14 * bow - 4 * bump(t, 3.6, 4.8), 0, 0] });
  allFolds(P, (u, k, i) => ({ out: -6 * drag * (1 - u) + 4 * drag * Math.sin(t * 2.2 - u * 3 + i), side: 3 * drag * Math.sin(t * 1.7 + i - u * 2) }));
  sleeve(P, 'L', -4 * drag); sleeve(P, 'R', -4 * drag);
  return stack(alive(t * IDLE / 5 * 0, ramp(t, 3.5, 5)), P);
});

// sink: bows and goes down; the folds float up and out as it goes under; held
clip('sink', 3.0, (t) => {
  const P = newPose(), d = kf(t, [[0, 0], [0.4, 0.06], [3.0, -4.1]]), f = ramp(t, 0.3, 2.4);
  body(P, { y: d, spine: [5 * f, 0, 0], chest: [7 * f, 0, 0], head: [12 * f, 0, 0] });
  allFolds(P, (u, k, i) => ({ out: 10 * f * (0.4 + u) + 3 * f * Math.sin(t * 3 + i - u * 3), side: 4 * f * u * Math.sin(i * 1.3) }));
  sleeve(P, 'L', 14 * f, 5 * f); sleeve(P, 'R', 14 * f, 5 * f);
  return stack(alive(0, 1 - f), P);
});

// surface: bursts up from beneath (strike: as it breaks the surface), folds flung out, thrown back, then settles
HIT.surface = 0.75;
clip('surface', 2.2, (t) => {
  const P = newPose(), up = kf(t, [[0, -4.1], [0.75, 0.0], [1.0, 0.3], [1.5, -0.05], [2.2, 0]]);
  const fling = env(t, 0.55, 0.95, 1.2, 2.1), back = env(t, 0.6, 0.95, 1.1, 1.9);
  body(P, { y: up, spine: [-5 * back, 0, 0], chest: [-8 * back, 0, 0], head: [-10 * back + 6 * (1 - ramp(t, 0, 0.7)), 0, 0] });
  allFolds(P, (u, k, i) => ({ out: 32 * fling * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.2))) - 10 * (1 - ramp(t, 0, 0.7)) * (1 - u), side: 6 * fling * Math.sin(i * 2.1) * u }));
  sleeve(P, 'L', 22 * fling); sleeve(P, 'R', 22 * fling);
  return stack(alive(0, ramp(t, 1.4, 2.2)), P);
});

// sweep: its left arm rises out over the front and is swung across it from its left to its right (strike: the middle)
HIT.sweep = 1.3;
clip('sweep', 2.6, (t) => {
  const P = newPose(), raise = env(t, 0.1, 0.9, 1.7, 2.5), sw = kf(t, [[0, 0], [0.9, 32], [1.05, 36], [1.55, -48], [1.8, -50], [2.6, 0]]);
  const lag = bump(t, 1.0, 1.75);
  body(P, { chest: [6 * raise, 0, sw * 0.45], spine: [3 * raise, 0, sw * 0.25], head: [4 * raise, 0, sw * 0.3] });
  fold(P, IL, (u, k) => ({ out: raise * (k === 0 ? 38 : k < 3 ? 22 : 6 - 4 * u) + 5 * raise * Math.sin(t * 5 - u * 4), side: (k === 0 ? -sw * 0.9 : 0) + lag * 14 * u * u, tw: 0 }));
  allFolds(P, (u, k, i) => (i === IL ? null : { out: 5 * raise * u + 3 * lag * Math.sin(i + u * 3) }));
  sleeve(P, 'L', 26 * raise, 10 * raise);
  return stack(alive(t, 1 - 0.6 * raise), P);
});

// slam: both arms rear up over the hood and come down together on the ice before it (strike), the body bowing into it
HIT.slam = 1.35;
clip('slam', 2.6, (t) => {
  const P = newPose(), up = env(t, 0.05, 1.0, 1.05, 1.2), down = env(t, 1.15, 1.35, 1.7, 2.5), sh = bump(t, 1.35, 1.8) * Math.sin((t - 1.35) * 40);
  body(P, { spine: [-4 * up + 8 * down, 0, 0], chest: [-8 * up + 12 * down + sh, 0, 0], head: [-10 * up + 10 * down, 0, 0], y: 0.12 * up - 0.06 * down });
  for (const i of ARMS) fold(P, i, (u, k) => ({
    out: up * (k === 0 ? 70 : k < 3 ? 32 : 10 * (1 - u)) + down * (k === 0 ? 50 : k < 3 ? 14 : -4 + 12 * u) + sh * 2 * u,
    side: (FOLDS[i][0] > 0 ? 1 : -1) * (up * (k === 0 ? 12 : 0) - down * (k === 0 ? 22 : 0))
  }));
  allFolds(P, (u, k, i) => (isArm(i) ? null : { out: (6 * up + 10 * down) * (0.3 + u) + 2 * sh * u }));
  sleeve(P, 'L', 30 * up + 12 * down, 12 * up + 18 * down); sleeve(P, 'R', 30 * up + 12 * down, 12 * up + 18 * down);
  return stack(alive(t, 1 - 0.7 * Math.max(up, down)), P);
});

// drink: it gathers the dark into its chest: the folds open, the arms come round and in to the chest, curling, the
// hood bowed over them, a long breath in (strike: the end of the channel)
HIT.drink = 2.2;
clip('drink', 3.2, (t) => {
  const P = newPose(), open = env(t, 0.1, 0.8, 0.9, 2.0), gather = env(t, 0.7, 1.8, 2.4, 3.1), breathe = env(t, 0.4, 2.2, 2.3, 3.0);
  body(P, { spine: [5 * gather, 0, 0], chest: [9 * gather - 4 * breathe, 0, 0], neck: [6 * gather, 0, 0], head: [12 * gather, 0, 0] });
  for (const i of ARMS) fold(P, i, (u, k) => ({ out: open * (k === 0 ? 30 : 6) + gather * (k === 0 ? 48 : k < 4 ? 26 - 12 * u : -10), side: (FOLDS[i][0] > 0 ? -1 : 1) * gather * (k === 0 ? 36 : k < 3 ? 18 : 6), tw: 0 }));
  allFolds(P, (u, k, i) => (isArm(i) ? null : { out: 12 * open * (0.4 + u) + 5 * gather * u * Math.sin(t * 4 + i - u * 4) - 4 * gather * (1 - u), side: 4 * gather * u * Math.sin(i * 1.7 + t * 3) }));
  sleeve(P, 'L', 10 * open, 20 * gather); sleeve(P, 'R', 10 * open, 20 * gather);
  return stack(alive(t, 1 - 0.6 * Math.max(open, gather)), P);
});

// roar: thrown back, the hood up to the sky, every fold flung wide and the arms up and out; it shudders and comes back
HIT.roar = 0.95;
clip('roar', 2.8, (t) => {
  const P = newPose(), f = env(t, 0.25, 0.9, 1.8, 2.7), shud = env(t, 0.9, 1.0, 1.7, 1.9) * Math.sin(t * 46), pre = bump(t, 0, 0.45);
  body(P, { spine: [-6 * f + 3 * pre, 0, 0], chest: [-12 * f + 6 * pre + shud * 1.2, 0, 0], neck: [-8 * f, 0, 0], head: [-14 * f + 8 * pre + shud * 2, 0, 0], y: 0.1 * f });
  allFolds(P, (u, k, i) => isArm(i)
    ? { out: f * (k === 0 ? 62 : k < 3 ? 18 : 5) + shud * 3 * u, side: (FOLDS[i][0] > 0 ? 1 : -1) * f * (k === 0 ? 34 : 4) }
    : { out: f * (k === 0 ? 26 : 12 - 6 * u) + shud * 2.5 * u - 6 * pre * (1 - u), side: f * 4 * Math.sin(i * 2.3) * u });
  sleeve(P, 'L', 38 * f, 10 * f); sleeve(P, 'R', 38 * f, 10 * f);
  return stack(alive(t, 1 - 0.8 * f), P);
});

// wrap: rises to its full height and its arms go up and round, coiling about what stands before it; held at the end
HIT.wrap = 1.6;
clip('wrap', 2.8, (t) => {
  const P = newPose(), up = ramp(t, 0.1, 1.2), c = ramp(t, 0.8, 2.2), sq = bump(t, 2.1, 2.6);
  body(P, { y: 0.28 * up, spine: [-3 * up + 4 * c, 0, 0], chest: [-6 * up + 8 * c, 0, 0], head: [-6 * up + 10 * c, 0, 0] });
  for (const i of ARMS) {
    const sg = FOLDS[i][0] > 0 ? 1 : -1;
    fold(P, i, (u, k) => ({ out: up * (k === 0 ? 85 : 4) - c * (k === 0 ? 10 : 0) + c * (k > 0 ? 9 + 6 * u : 0) + sq * 3 * u, side: -sg * c * (k === 0 ? 30 : 16 + 10 * u), tw: -sg * c * 10 * u }));
  }
  allFolds(P, (u, k, i) => (isArm(i) ? null : { out: (8 * up - 4 * c) * (0.3 + u), side: 2 * c * Math.sin(i * 1.9) * u }));
  sleeve(P, 'L', 24 * up, 16 * up); sleeve(P, 'R', 24 * up, 16 * up);
  return stack(alive(t, 1 - 0.7 * up), P);
});

// recoil: the beam strikes it: it shrinks back, the hood turned away, the arms thrown up across the hood, folds drawn in
HIT.recoil = 0.2;
clip('recoil', 1.8, (t) => {
  const P = newPose(), f = env(t, 0, 0.2, 0.7, 1.7), sh = env(t, 0.15, 0.3, 0.8, 1.4) * Math.sin(t * 38);
  body(P, { spine: [-6 * f, 0, 0], chest: [-12 * f + sh, 3 * f, -10 * f], neck: [-6 * f, 0, 0], head: [-10 * f, 6 * f, -16 * f], y: -0.12 * f });
  for (const i of ARMS) { const sg = FOLDS[i][0] > 0 ? 1 : -1; fold(P, i, (u, k) => ({ out: f * (k === 0 ? 72 : k < 3 ? 20 : 8) + sh * 2 * u, side: -sg * f * (k === 0 ? 34 : 10) })); }
  allFolds(P, (u, k, i) => (isArm(i) ? null : { out: -5 * f * (1 - u) + 6 * f * u + sh * 2 * u }));
  sleeve(P, 'L', 20 * f, 24 * f); sleeve(P, 'R', 20 * f, 24 * f);
  return stack(alive(t, 1 - 0.7 * f), P);
});

// hit: a flinch, the folds jolting
HIT.hit = 0.12;
clip('hit', 0.7, (t) => {
  const P = newPose(), f = bump(t, 0, 0.7), j = Math.sin(t * 30) * bump(t, 0, 0.6);
  body(P, { spine: [-3 * f, 0, 0], chest: [-6 * f, 1.5 * j, 0], head: [-6 * f, 3 * j, 4 * j] });
  allFolds(P, (u, k, i) => ({ out: 5 * f * u + 3 * j * u * Math.sin(i), side: 2 * j * u }));
  return stack(alive(0, 1), P);
});

// lash: its right arm drawn back, then whipped out flat along the line before it (strike), the crack running to the
// tip; it curls round what it caught and hauls it in
HIT.lash = 0.9;
clip('lash', 2.0, (t) => {
  const P = newPose(), back = env(t, 0.05, 0.6, 0.65, 0.85), out = env(t, 0.75, 0.9, 1.25, 1.9), hook = env(t, 1.0, 1.3, 1.6, 2.0);
  const wave = (u) => bump(t - 0.18 * u, 0.75, 1.15);
  body(P, { chest: [-4 * back + 8 * out, 0, 10 * back - 14 * out], spine: [4 * out, 0, -6 * out], head: [6 * out, 0, -8 * out] });
  fold(P, IR, (u, k) => ({ out: -back * (k === 0 ? 14 : 4 * u) + out * (k === 0 ? 62 : k < 3 ? 14 : 3) - 8 * wave(u) * u + hook * (k > 3 ? 22 * u : 0), side: back * (k === 0 ? -10 : 0) + out * (k === 0 ? 18 : 0) }));
  allFolds(P, (u, k, i) => (i === IR ? null : { out: 4 * out * u + 2 * back * Math.sin(i + u * 3) }));
  sleeve(P, 'R', 18 * Math.max(back, out), 14 * out - 6 * back);
  return stack(alive(t, 1 - 0.6 * Math.max(back, out)), P);
});

// smother: the arms and the front folds reach out and press down over what lies before it, three times, the body
// leaning into it (strike: the first press)
HIT.smother = 1.3;
clip('smother', 3.0, (t) => {
  const P = newPose(), reach = env(t, 0.1, 1.0, 2.4, 3.0), press = [1.3, 1.8, 2.3].reduce((a, s) => a + bump(t, s - 0.2, s + 0.25), 0);
  body(P, { spine: [7 * reach + 2 * press, 0, 0], chest: [12 * reach + 3 * press, 0, 0], head: [10 * reach, 0, 0], y: -0.05 * press });
  allFolds(P, (u, k, i, pc) => {
    const front = Math.cos(pc.phi), a = isArm(i) ? 1 : clamp(front * 1.3);
    return { out: a * (reach * (k === 0 ? 48 : 12 - 6 * u) + press * (k === 0 ? -6 : 4 + 6 * u)), side: isArm(i) ? -(FOLDS[i][0] > 0 ? 1 : -1) * reach * (k === 0 ? 16 : 0) : 0 };
  });
  sleeve(P, 'L', 16 * reach, 24 * reach); sleeve(P, 'R', 16 * reach, 24 * reach);
  return stack(alive(t, 1 - 0.7 * reach), P);
});

// die: the naming. It sinks slowly, the hood bowing, while its arms and folds rise and close over it like water; held
clip('die', 5.5, (t) => {
  const P = newPose(), d = kf(t, [[0, 0], [0.8, 0.1], [5.5, -4.2]]), r = ramp(t, 0.4, 3.6), bow = ramp(t, 0.2, 2.5), tr = env(t, 0, 0.3, 1.0, 1.8) * Math.sin(t * 22);
  body(P, { y: d, spine: [6 * bow, 0, 0], chest: [9 * bow + tr, 0, 0], neck: [8 * bow, 0, 0], head: [16 * bow + 2 * tr, 0, 0] });
  allFolds(P, (u, k, i) => ({ out: r * (k === 0 ? (isArm(i) ? 70 : 40) : 10 + 8 * u) + 3 * Math.sin(t * 2 + i - u * 3) * r, side: 3 * r * Math.sin(i * 2.4) }));
  sleeve(P, 'L', 30 * r, 10 * r); sleeve(P, 'R', 30 * r, 10 * r);
  return stack(alive(0, 1 - r), P);
});

for (const [k, v] of Object.entries(info)) console.log(k.padEnd(8), JSON.stringify(v));

// ---------- 7. write ----------
const size = await finish(D.doc, OUT, {
  hit: HIT, height: HEIGHT, keepMat: true, walkSpeed: 0, runSpeed: 0, legSpan: 1.9,
  credit: '"Cloaked Figure" by MysteryPancake (sketchfab.com/mysterypancake), CC-BY 4.0 - re-posed, subdivided, re-rigged; arms from "Tentacle (rigged)" by CG Daniel Glebinski (sketchfab.com/CGDanielGlebinski), CC-BY 4.0; code material; every animation made for Skotos',
  license: 'CC-BY-4.0'
});
console.log('wrote', OUT, size, 'bytes');
