// The Icemaw (Παγολόχος): "Leopard Seal" by Grace Belt (sketchfab.com/neatGrace), CC-BY 4.0
// -> src/assets/creatures/icemaw.glb. A huge leopard seal that hunts from under the ice and lunges out of holes.
// The source is an unrigged sculpt: a 3.8k-triangle body with its mouth wide open, two eye rims, two eyes, a tongue and
// 24 teeth (16 of them at 8.6k triangles each: that is where its 180k faces are). Here the teeth are thinned to simple
// cones and everything is merged into one skinned primitive (about 5.4k triangles) on one material: the body's own
// 1024 px map (regraded from black-and-white to a leopard seal's slate back and silver spotted belly, with a dark mottle,
// pale scars, whisker pits and frost dusted along the spine) and, in its unused corner, small cells for the teeth (ivory,
// pink at the gum), the tongue and the eyes. The source's normal map is flat: a 512 px normal map is baked here from
// the rest-pose surface (skin grain, neck and throat folds, flipper digits, the scars and whisker pits).
// Code rig (the bind frames are the world axes at each joint, rig.mjs): root (carries the translation), body (between
// the fore flippers), forward chest, neck, head and jaw, backward spine1, spine2, pelvis and tail, two hind flippers on
// the tail and a fore flipper on each side of the chest. Weights by position along the body's centre line (smooth
// blends across each joint), the jaw by the open mouth's line (lower lip, chin, lower teeth, tongue), the flippers by
// their own UV islands (the fore flippers are blades joined to the body by four vertices).
// Clips (in place; rotations and the root's translation only): idle (lying with the head up, breathing, looking about,
// a yawn), walk and run (the galumph: a hump runs from tail to chest, the chest and then the pelvis take the weight,
// the body slides on between pushes; the stride is measured, so walkSpeed and runSpeed are honest), attack (a lunging
// bite), attack2 (the drag: bite, hold, haul back and shake), lunge (the long lunge out of a hole: stretched flat, jaws
// wide), surface (bursts up out of a hole in front of the camera's pitch and hauls out onto the ice), dive (head-first
// down into a hole; held), slide (slips back tail-first into the hole behind it; held), stranded (thrashing on the ice,
// loops), hit, die (convulses and rolls onto its side; held).
// usage: node icemaw.mjs [source.glb] [out.glb] [--dbg=<dir>: also an uncompressed copy, the maps as PNG and a weights
//        preview GLB]
import { MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { load, finish, worlds, locals, io, sharp } from '../act2/lib.mjs';
import { THREE, V, X, Y, Z, Qa, deg, clamp, smooth, ramp, bump, env, kf, TAU, makeRig, fk, skin, buildDoc, writeClip, smoothNormals, weldPositions } from './rig.mjs';
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [SRC = '/tmp/claude-0/sf/act5/icemaw/model.glb', OUT = new URL('../../../src/assets/creatures/icemaw.glb', import.meta.url).pathname] = ARGS;
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const NTEST = process.argv.includes('--ntest');   // normal map convention test: every texel's normal is world up
if (DBG) mkdirSync(DBG, { recursive: true });
await MeshoptSimplifier.ready;

const LENGTH = 3.1;             // tail flippers to snout, metres (x1; the game shows it at look.scale 1.6: about 5 m)
const TRIS = { rim: 180, eye: 72, toothBig: 36, toothSmall: 20 };

// ---------- 1. the parts, in character space (Y up, facing +Z, metres, belly on y = 0) ----------
const src = await load(SRC);
const SW = worlds(src, locals(src, null, 0));
const raw = [];   // { kind, pos: Vector3[], nor: Vector3[], uv: [u, v][], idx: number[] }
for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const M = SW.get(node), N3 = new THREE.Matrix3().getNormalMatrix(M);
  for (const p of mesh.listPrimitives()) {
    const mat = p.getMaterial().getName(), Pa = p.getAttribute('POSITION'), Na = p.getAttribute('NORMAL'), Ua = p.getAttribute('TEXCOORD_0'), e = [];
    const n = Pa.getCount();
    const kind = mat === 'Upper1' ? (n > 2000 ? 'body' : 'rim') : mat === 'Eyes1' ? 'eye' : mat === 'Tongue1' ? 'tongue' : 'tooth';
    const pos = [], nor = [], uv = [];
    for (let i = 0; i < n; i++) {
      pos.push(V(...Pa.getElement(i, e)).applyMatrix4(M));
      nor.push(V(...Na.getElement(i, e)).applyMatrix3(N3).normalize());
      uv.push(Ua.getElement(i, e).slice(0, 2));
    }
    raw.push({ kind, pos, nor, uv, idx: Array.from(p.getIndices().getArray()) });
  }
}
// the source faces -Z: turned half round about Y, scaled to LENGTH, belly on the ground, centred in x and z
{
  const body = raw.find((r) => r.kind === 'body'), b = new THREE.Box3().setFromPoints(body.pos);
  const s = LENGTH / (b.max.z - b.min.z), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  for (const r of raw) {
    r.pos = r.pos.map((p) => V(-(p.x - cx) * s, (p.y - b.min.y) * s, -(p.z - cz) * s));
    r.nor = r.nor.map((n) => V(-n.x, n.y, -n.z));
  }
}

// ---------- 2. thinning ----------
// welded copy of a part (positions only), thinned to about `tris` triangles
function thinWelded(r, tris) {
  const flat = r.pos.flatMap((p) => p.toArray()), W = weldPositions(flat, 1e-6);
  const idx0 = new Uint32Array(r.idx.map((i) => W.remap[i])), P = new Float32Array(W.pos);
  const [out] = MeshoptSimplifier.simplify(idx0, P, 3, Math.max(12, tris * 3), 0.3, []);
  const used = new Map(), pos = [], idx = [];
  for (const o of out) { let j = used.get(o); if (j === undefined) { j = used.size; used.set(o, j); pos.push(V(P[o * 3], P[o * 3 + 1], P[o * 3 + 2])); } idx.push(j); }
  return { pos, idx };
}
// thinned with its UVs kept (seams preserved): the eye rims, which sit on the body's map
function thinUV(r, tris) {
  const n = r.pos.length, P = new Float32Array(r.pos.flatMap((p) => p.toArray())), A = new Float32Array(n * 2);
  r.uv.forEach((t, i) => { A[i * 2] = t[0]; A[i * 2 + 1] = t[1]; });
  const [out] = MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(r.idx), P, 3, A, 2, [1, 1], null, tris * 3, 0.05, []);
  const used = new Map(), pos = [], nor = [], uv = [], idx = [];
  for (const o of out) { let j = used.get(o); if (j === undefined) { j = used.size; used.set(o, j); pos.push(r.pos[o]); nor.push(r.nor[o]); uv.push(r.uv[o]); } idx.push(j); }
  return { pos, nor, uv, idx };
}

// ---------- 3. the atlas cells (pixels of the 1024 map, in the body's unused corner) ----------
const AW = 1024;
const CELL = { teeth: [300, 740, 40, 250], tongue: [362, 740, 60, 60], eye: [444, 740, 36, 36], gum: [362, 822, 60, 60] };
const cellUV = (c, fu, fv) => [(CELL[c][0] + 6 + fu * (CELL[c][2] - 12)) / AW, (CELL[c][1] + 6 + fv * (CELL[c][3] - 12)) / AW];

// ---------- 4. one mesh ----------
// per vertex: part (0 body, 1 rim, 2 eye, 3 upper tooth, 4 lower tooth, 5 tongue), island (body only)
const M = { pos: [], nor: [], uv: [], idx: [], part: [], island: [] };
function add(part, pos, nor, uv, idx, island = null) {
  const o = M.pos.length / 3;
  pos.forEach((p, i) => { M.pos.push(p.x, p.y, p.z); M.nor.push(...nor[i].toArray()); M.uv.push(...uv[i]); M.part.push(part); M.island.push(island ? island[i] : -1); });
  for (const i of idx) M.idx.push(i + o);
}
const PARTS = {};
// the body: kept whole; its UV islands name the flippers (two fore-flipper blades, two hind halves, two body halves)
{
  const r = raw.find((q) => q.kind === 'body'), n = r.pos.length;
  const par = Int32Array.from({ length: n }, (_, i) => i), f = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let t = 0; t < r.idx.length; t += 3) { const a = f(r.idx[t]); par[f(r.idx[t + 1])] = a; par[f(r.idx[t + 2])] = a; }
  const groups = new Map(); for (let i = 0; i < n; i++) { const g = f(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  const isl = new Int8Array(n);   // 0 body, 1 fore flipper (left, +x), 2 fore flipper (right), 3 hind
  for (const vs of groups.values()) {
    const b = new THREE.Box3().setFromPoints(vs.map((i) => r.pos[i]));
    const k = vs.length < 200 ? (b.min.x > 0 ? 1 : 2) : b.max.z < -0.9 ? 3 : 0;
    for (const i of vs) isl[i] = k;
  }
  // the fore flippers' roots: where their blades share positions with the body
  const key = (p) => p.toArray().map((v) => Math.round(v * 1e4)).join(',');
  const bodyKeys = new Set(); for (let i = 0; i < n; i++) if (isl[i] === 0) bodyKeys.add(key(r.pos[i]));
  PARTS.flipRoot = {};
  for (const side of [1, 2]) {
    const pts = []; for (let i = 0; i < n; i++) if (isl[i] === side && bodyKeys.has(key(r.pos[i]))) pts.push(r.pos[i]);
    PARTS.flipRoot[side] = pts.reduce((a, p) => a.add(p), V()).multiplyScalar(1 / pts.length);
  }
  add(0, r.pos, r.nor, r.uv, r.idx, isl);
  PARTS.bodyTris = r.idx.length / 3;
}
let teethTris = 0;
for (const r of raw) {
  if (r.kind === 'rim') { const t = thinUV(r, TRIS.rim); add(1, t.pos, t.nor, t.uv, t.idx); }
  if (r.kind === 'eye') {
    const t = thinWelded(r, TRIS.eye), c = t.pos.reduce((a, p) => a.add(p), V()).multiplyScalar(1 / t.pos.length);
    add(2, t.pos, t.pos.map((p) => p.clone().sub(c).normalize()), t.pos.map(() => cellUV('eye', 0.5, 0.5)), t.idx);
  }
  if (r.kind === 'tooth') {
    const big = r.idx.length / 3 > 2000, t = thinWelded(r, big ? TRIS.toothBig : TRIS.toothSmall);
    const b = new THREE.Box3().setFromPoints(t.pos), upper = (b.min.y + b.max.y) / 2 > 0.515;
    // along the tooth: 0 at the gum, 1 at the tip
    const along = (p) => clamp(upper ? (b.max.y - p.y) / (b.max.y - b.min.y) : (p.y - b.min.y) / (b.max.y - b.min.y));
    const nor = smoothNormals(t.pos.flatMap((p) => p.toArray()), t.idx);
    add(upper ? 3 : 4, t.pos, t.pos.map((_, i) => V(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2])), t.pos.map((p) => cellUV('teeth', 0.5 + 0.3 * Math.sin(p.x * 400 + p.z * 300), along(p))), t.idx);
    teethTris += t.idx.length / 3;
  }
  if (r.kind === 'tongue') {
    const b = new THREE.Box3().setFromPoints(r.pos);
    add(5, r.pos, r.nor, r.pos.map((p) => cellUV('tongue', (p.x - b.min.x) / (b.max.x - b.min.x), (p.z - b.min.z) / (b.max.z - b.min.z))), r.idx);
  }
}
const NV = M.pos.length / 3, NT = M.idx.length / 3;
const P = (i) => V(M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]);
{ const per = [0, 0, 0, 0, 0, 0]; for (let t = 0; t < NT; t++) per[M.part[M.idx[t * 3]]]++;
  console.log(`mesh: ${NT} triangles (body ${per[0]}, eye rims ${per[1]}, eyes ${per[2]}, teeth ${per[3] + per[4]}, tongue ${per[5]}), ${NV} vertices; fore flipper roots`, Object.values(PARTS.flipRoot).map((p) => p.toArray().map((v) => +v.toFixed(3)))); }

// ---------- 5. the rig ----------
const FR = PARTS.flipRoot;
const rig = makeRig([
  { name: 'root', parent: null, p: V(0, 0, 0) },
  { name: 'body', parent: 'root', p: V(0, 0.26, 0.12) },
  { name: 'chest', parent: 'body', p: V(0, 0.28, 0.5) },
  { name: 'neck', parent: 'chest', p: V(0, 0.33, 0.86) },
  { name: 'head', parent: 'neck', p: V(0, 0.53, 1.1) },
  { name: 'jaw', parent: 'head', p: V(0, 0.525, 1.21) },
  { name: 'spine1', parent: 'body', p: V(0, 0.22, -0.25) },
  { name: 'spine2', parent: 'spine1', p: V(0, 0.18, -0.6) },
  { name: 'pelvis', parent: 'spine2', p: V(0, 0.13, -0.95) },
  { name: 'tail', parent: 'pelvis', p: V(0, 0.08, -1.17) },
  { name: 'flipH_L', parent: 'tail', p: V(0.05, 0.06, -1.27) },
  { name: 'flipH_R', parent: 'tail', p: V(-0.05, 0.06, -1.27) },
  { name: 'flipF_L', parent: 'chest', p: FR[1].clone() },
  { name: 'flipF_R', parent: 'chest', p: FR[2].clone() }
]);
const J = (n) => rig.idx.get(n);

// ---------- 6. weights ----------
// the centre line through the spine joints, tail tip to snout; each bone owns a stretch of it, blended across joints
const LINE = [V(0, 0.04, -1.56), ...['tail', 'pelvis', 'spine2', 'spine1', 'body', 'chest', 'neck', 'head'].map((n) => rig.bind[J(n)]), V(0, 0.55, 1.56)];
const OWN = ['tail', 'pelvis', 'spine2', 'spine1', 'body', 'body', 'chest', 'neck', 'head'];   // bone per stretch of the line
const SEG = []; { let s = 0; for (let k = 0; k < LINE.length - 1; k++) { const l = Math.hypot(LINE[k + 1].y - LINE[k].y, LINE[k + 1].z - LINE[k].z); SEG.push([s, s + l]); s += l; } }
const lineS = (p) => {   // arc length of the nearest point on the centre line (in the side view)
  let best = 1e9, bs = 0;
  for (let k = 0; k < LINE.length - 1; k++) {
    const a = LINE[k], b = LINE[k + 1], dy = b.y - a.y, dz = b.z - a.z, L2 = dy * dy + dz * dz;
    const f = clamp(((p.y - a.y) * dy + (p.z - a.z) * dz) / L2), y = a.y + f * dy, z = a.z + f * dz, d = Math.hypot(p.y - y, p.z - z);
    if (d < best) { best = d; bs = SEG[k][0] + f * (SEG[k][1] - SEG[k][0]); }
  }
  return bs;
};
// joints along the line where ownership changes, with blend half-widths
const CUTS = [];   // [s, boneBefore, boneAfter, half]
for (let k = 1; k < OWN.length; k++) if (OWN[k] !== OWN[k - 1]) CUTS.push([SEG[k][0], OWN[k - 1], OWN[k], Math.min(0.12, 0.45 * (SEG[k][1] - SEG[k][0]), 0.45 * (SEG[k - 1][1] - SEG[k - 1][0]))]);
const HALF = { neck: 0.1, head: 0.07 };   // the head's blend is kept tighter (it is a rigid skull)
function spineW(p) {
  const s = lineS(p), w = {};
  let cur = OWN[0], acc = 1;
  for (const [c, b0, b1, h0] of CUTS) {
    const h = HALF[b1] ?? h0, f = smooth((s - (c - h)) / (2 * h));
    // the share past this cut goes on to the next bones
    w[b0] = (w[b0] || 0) + acc * (1 - f); acc *= f; cur = b1;
  }
  w[cur] = (w[cur] || 0) + acc;
  return w;
}
// the open mouth's line: halfway between the upper and the lower teeth, from the corner of the gape (measured)
const GAPE = { z: 1.23, y: 0.536, slope: -0.104 };
const mouthD = (p) => GAPE.y + GAPE.slope * (p.z - GAPE.z) - p.y;   // > 0 below the line
const Jw = new Uint16Array(NV * 4), Ww = new Float32Array(NV * 4);
for (let i = 0; i < NV; i++) {
  const p = P(i), part = M.part[i], isl = M.island[i];
  let w;
  if (part === 3 || part === 2 || part === 1) w = { head: 1 };
  else if (part === 4 || part === 5) w = { jaw: 1 };
  else {
    w = spineW(p);
    // the jaw: below the gape's line in front of its corner; behind it the chin and throat, fading out down the neck
    if (p.z > 1.0) {
      const d = mouthD(p);
      const jw = p.z >= GAPE.z ? smooth((d + 0.004) / 0.016) : smooth((d - 0.005) / 0.05) * smooth((p.z - 1.0) / (GAPE.z - 1.0));
      if (jw > 0) { for (const k in w) w[k] *= 1 - jw; w.jaw = (w.jaw || 0) + jw; }
    }
    // hind flippers: the two blades behind the tail joint
    if (isl === 3 && p.z < -1.2 && Math.abs(p.x) > 0.015) {
      const f = smooth((-1.2 - p.z) / 0.1) * smooth((Math.abs(p.x) - 0.015) / 0.04);
      for (const k in w) w[k] *= 1 - f; const b = p.x > 0 ? 'flipH_L' : 'flipH_R'; w[b] = (w[b] || 0) + f;
    }
    // fore flippers: their own blades, eased in near the root
    if (isl === 1 || isl === 2) {
      const root = FR[isl], f = smooth(p.distanceTo(root) / 0.08);
      for (const k in w) w[k] *= 1 - f; const b = isl === 1 ? 'flipF_L' : 'flipF_R'; w[b] = (w[b] || 0) + f;
      // what is left of the root follows the chest
      const rest = 1 - f; for (const k in w) if (k !== b) delete w[k]; w.chest = rest;
    }
  }
  const e = Object.entries(w).filter(([, x]) => x > 1e-3).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = e.reduce((a, [, x]) => a + x, 0);
  e.forEach(([b, x], k) => { Jw[i * 4 + k] = J(b); Ww[i * 4 + k] = x / sum; });
}
const mesh = { pos: M.pos, nor: M.nor, uv: M.uv, idx: M.idx, J: Jw, W: Ww };

// ---------- 7. the maps: the body's colour regraded, a normal map baked from the rest-pose surface ----------
// value noise and cells in 3D (rest-pose positions, metres), so every pattern runs on across UV seams
const hash3 = (i, j, k, s) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, z, S, seed = 3) {
  x /= S; y /= S; z /= S;
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  let o = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) o += hash3(i + a, j + b, k + c, seed) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return o;
}
const fbm = (x, y, z, S, n = 3, seed = 3) => { let o = 0, a = 0.5, t = 0; for (let k = 0; k < n; k++) { o += a * vnoise(x, y, z, S, seed + k); t += a; a *= 0.5; S *= 0.5; } return o / t; };
function cells(x, y, z, S, seed = 7) {   // -> { c: distance to the nearest seed, id }
  const gx = Math.floor(x / S), gy = Math.floor(y / S), gz = Math.floor(z / S); let d1 = 1e9, id = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const a = gx + i, b = gy + j, c = gz + k;
    const sx = (a + 0.15 + 0.7 * hash3(a, b, c, seed)) * S, sy = (b + 0.15 + 0.7 * hash3(a, b, c, seed + 1)) * S, sz = (c + 0.15 + 0.7 * hash3(a, b, c, seed + 2)) * S;
    const d = Math.hypot(sx - x, sy - y, sz - z); if (d < d1) { d1 = d; id = hash3(a, b, c, seed + 3); }
  }
  return { c: d1, id };
}
// scars: groups of two or three parallel grooves on the back and flanks (a leopard seal's are pale and many)
const SCARS = [];
{
  let sd = 11; const rnd = () => (sd = (Math.imul(sd, 1103515245) + 12345) >>> 0) / 4294967296;
  const cand = []; for (let i = 0; i < NV; i++) if (M.part[i] === 0 && M.island[i] === 0) { const n = V(M.nor[i * 3], M.nor[i * 3 + 1], M.nor[i * 3 + 2]); if (n.y > -0.1 && P(i).z > -0.9 && P(i).z < 1.0) cand.push(i); }
  for (let g = 0; g < 9; g++) {
    const i = cand[Math.floor(rnd() * cand.length)], c = P(i), n = V(M.nor[i * 3], M.nor[i * 3 + 1], M.nor[i * 3 + 2]).normalize();
    const t0 = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).projectOnPlane(n).normalize(), side = n.clone().cross(t0);
    const L = 0.1 + 0.2 * rnd(), k = 2 + Math.floor(rnd() * 2), gap = 0.022 + 0.015 * rnd();
    for (let q = 0; q < k; q++) {
      const o = c.clone().addScaledVector(side, (q - (k - 1) / 2) * gap);
      SCARS.push({ c: o, n, t: t0, L: L * (0.75 + 0.4 * rnd()), w: 0.0022 + 0.0015 * rnd(), bend: (rnd() - 0.5) * 0.04 });
    }
  }
}
function scarAt(p, nrm) {
  let s = 0;
  for (const S of SCARS) {
    const d = p.clone().sub(S.c); if (d.lengthSq() > (S.L * 0.6 + 0.05) ** 2 || nrm.dot(S.n) < 0.4) continue;
    const along = d.dot(S.t), f = along / (S.L / 2); if (Math.abs(f) > 1.15) continue;
    const across = d.clone().projectOnPlane(S.n).addScaledVector(S.t, -along).length() - S.bend * (1 - f * f);
    const taper = 1 - smooth((Math.abs(f) - 0.6) / 0.55);
    s = Math.max(s, taper * Math.exp(-((across / S.w) ** 2)));
  }
  return s;
}
// the muzzle's whisker pits: rows on each side above the upper lip (measured on the rest pose)
function pitAt(p, nrm) {
  if (p.z < 1.36 || p.z > 1.52 || p.y < 0.57 || p.y > 0.64 || Math.abs(nrm.x) < 0.35) return 0;
  const zz = (p.z - 1.36) / 0.024, yy = (p.y - 0.578) / 0.017 + (Math.round(zz) % 2) * 0.5, iz = Math.round(zz), iy = Math.round(yy);
  if (hash3(iz, iy, p.x > 0 ? 1 : 0, 5) < 0.3) return 0;   // a few rows missing a pit
  const dz = (zz - iz) * 0.024 + 0.004 * (hash3(iz, iy, 0, 6) - 0.5), dy = (yy - iy) * 0.017 + 0.004 * (hash3(iz, iy, 0, 7) - 0.5);
  return Math.exp(-((dz * dz + dy * dy) / (0.003 * 0.003))) * (1 - smooth((p.z - 1.47) / 0.05));
}
// the rest pose's centre line height (to tell the back from the belly) and the surface detail, in metres of height
const S_NECK = [0.7, 0.8, 1.04, 1.14];
function detail(p, nrm, isl) {
  // skin grain, a coarser pebbling, and the slow rolls of blubber under the hide
  let h = 0.0007 * (fbm(p.x, p.y, p.z, 0.008, 2, 21) - 0.5) + 0.0012 * (fbm(p.x, p.y, p.z, 0.03, 2, 31) - 0.5) + 0.004 * (fbm(p.x, p.y, p.z, 0.14, 2, 91) - 0.5);
  // neck folds: rings round the neck, deepest behind the raised head and under the throat
  if (isl === 0 && p.z > S_NECK[0] && p.z < S_NECK[3]) {
    const m = ramp(p.z, S_NECK[0], S_NECK[1]) * (1 - ramp(p.z, S_NECK[2], S_NECK[3]));
    const ph = (p.z + 0.02 * fbm(p.x, p.y, p.z, 0.07, 2, 41) + 0.012 * Math.abs(p.x) / 0.2) / 0.042;
    const fold = Math.pow(1 - Math.abs(Math.sin(Math.PI * ph)), 2.2);
    h -= 0.0032 * m * fold * (0.5 + 0.5 * Math.max(nrm.y, -nrm.y * 0.8));
  }
  // fore flippers: five digits run down the blade; hind flippers: five rays fan out to the trailing edge
  if (isl === 1 || isl === 2) h += 0.0007 * Math.pow(Math.sin(Math.PI * (p.y - 0.115) / 0.026), 2);
  if (isl === 3 && p.z < -1.22) {
    const th = Math.atan2(Math.abs(p.x) - 0.02, -(p.z + 1.2));
    h += 0.0009 * Math.pow(Math.cos(th * 5.6), 2) * smooth((-1.22 - p.z) / 0.06);
  }
  return h;
}
const FROSTC = [222, 232, 240], SLATE = [40, 45, 52], MIDG = [92, 98, 106], SILVER = [182, 187, 192], SPOT = [22, 24, 28];
const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
// rasterise the body and rims into UV space: per texel a triangle and barycentrics (then dilated over the borders)
const TRI = new Int32Array(AW * AW).fill(-1), BA = new Float32Array(AW * AW * 2), COV = new Uint8Array(AW * AW);
for (let t = 0; t < NT; t++) {
  const a = M.idx[t * 3], b = M.idx[t * 3 + 1], c = M.idx[t * 3 + 2];
  if (M.part[a] > 1) continue;
  const v = [a, b, c].map((i) => [M.uv[i * 2] * AW, M.uv[i * 2 + 1] * AW]);
  const ar = (v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[2][0] - v[0][0]) * (v[1][1] - v[0][1]); if (!ar) continue;
  const x0 = Math.max(0, Math.floor(Math.min(v[0][0], v[1][0], v[2][0]))), x1 = Math.min(AW - 1, Math.ceil(Math.max(v[0][0], v[1][0], v[2][0])));
  const y0 = Math.max(0, Math.floor(Math.min(v[0][1], v[1][1], v[2][1]))), y1 = Math.min(AW - 1, Math.ceil(Math.max(v[0][1], v[1][1], v[2][1])));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((v[1][0] - px) * (v[2][1] - py) - (v[2][0] - px) * (v[1][1] - py)) / ar, w1 = ((v[2][0] - px) * (v[0][1] - py) - (v[0][0] - px) * (v[2][1] - py)) / ar;
    if (w0 >= -1e-4 && w1 >= -1e-4 && 1 - w0 - w1 >= -1e-4) { const k = y * AW + x; TRI[k] = t; BA[k * 2] = w0; BA[k * 2 + 1] = w1; COV[k] = 1; }
  }
}
for (let pass = 0; pass < 8; pass++) {
  const add = [];
  for (let y = 0; y < AW; y++) for (let x = 0; x < AW; x++) {
    const k = y * AW + x; if (TRI[k] >= 0) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= AW || yy >= AW) continue; const kk = yy * AW + xx; if (TRI[kk] >= 0) { add.push([k, kk]); break; } }
  }
  for (const [k, kk] of add) { TRI[k] = TRI[kk]; BA[k * 2] = BA[kk * 2]; BA[k * 2 + 1] = BA[kk * 2 + 1]; }
}
const srcMat = src.getRoot().listMaterials().find((m) => m.getName() === 'Upper1');
const SRCD = await sharp(Buffer.from(srcMat.getBaseColorTexture().getImage())).removeAlpha().resize(AW, AW).raw().toBuffer();
const LUM = Buffer.alloc(AW * AW); for (let k = 0; k < AW * AW; k++) LUM[k] = Math.round(0.3 * SRCD[k * 3] + 0.59 * SRCD[k * 3 + 1] + 0.11 * SRCD[k * 3 + 2]);
// the paint's broad value (back, flank, belly), blurred over the painted texels only so the islands' borders agree
const blur1 = (buf) => sharp(buf, { raw: { width: AW, height: AW, channels: 1 } }).blur(9).extractChannel(0).raw().toBuffer();
const LC = Buffer.alloc(AW * AW), CM = Buffer.alloc(AW * AW);
for (let k = 0; k < AW * AW; k++) if (COV[k]) { LC[k] = LUM[k]; CM[k] = 255; }
const [BLC, BCM] = [await blur1(LC), await blur1(CM)];
const REGION = new Uint8Array(AW * AW); for (let k = 0; k < AW * AW; k++) REGION[k] = BCM[k] ? Math.round(clamp((BLC[k] / BCM[k]) * 255, 0, 255)) : LUM[k];
const BASE = Buffer.from(SRCD), NRM = Buffer.alloc(AW * AW * 3);
for (let k = 0; k < AW * AW; k++) { NRM[k * 3] = 128; NRM[k * 3 + 1] = 128; NRM[k * 3 + 2] = 255; }
{
  const p = V(), n = V(), T = V(), B = V(), tu = V(), tv = V(), e1 = V(), e2 = V(), q = V();
  const triT = new Map();
  for (let k = 0; k < AW * AW; k++) {
    const t = TRI[k]; if (t < 0) continue;
    const ia = M.idx[t * 3], ib = M.idx[t * 3 + 1], ic = M.idx[t * 3 + 2], w0 = BA[k * 2], w1 = BA[k * 2 + 1], w2 = 1 - w0 - w1;
    p.set(0, 0, 0).addScaledVector(P(ia), w0).addScaledVector(P(ib), w1).addScaledVector(P(ic), w2);
    n.set(0, 0, 0);
    for (const [i, w] of [[ia, w0], [ib, w1], [ic, w2]]) n.x += M.nor[i * 3] * w, n.y += M.nor[i * 3 + 1] * w, n.z += M.nor[i * 3 + 2] * w;
    n.normalize();
    // the triangle's dp/du and dp/dv (glTF v runs down the image)
    if (!triT.has(t)) {
      const pa = P(ia), pb = P(ib), pc = P(ic);
      const du1 = M.uv[ib * 2] - M.uv[ia * 2], dv1 = M.uv[ib * 2 + 1] - M.uv[ia * 2 + 1], du2 = M.uv[ic * 2] - M.uv[ia * 2], dv2 = M.uv[ic * 2 + 1] - M.uv[ia * 2 + 1];
      e1.subVectors(pb, pa); e2.subVectors(pc, pa);
      const r = 1 / (du1 * dv2 - du2 * dv1 || 1e-9);
      triT.set(t, [e1.clone().multiplyScalar(dv2).addScaledVector(e2, -dv1).multiplyScalar(r), e2.clone().multiplyScalar(du1).addScaledVector(e1, -du2).multiplyScalar(r)]);
    }
    const [TU, TV] = triT.get(t);
    T.copy(TU).projectOnPlane(n).normalize();
    B.copy(n).cross(T); if (B.dot(TV) > 0) B.negate();   // the map's +y is up the image: toward -v
    const isl = M.part[ia] === 1 ? 4 : M.island[ia];
    // normal: the detail height's slope across the surface
    let out;
    if (NTEST) out = V(0, 1, 0);
    else {
      const eps = 0.0015, hT = (detail(q.copy(p).addScaledVector(T, eps), n, isl) - detail(q.copy(p).addScaledVector(T, -eps), n, isl)) / (2 * eps);
      const hB = (detail(q.copy(p).addScaledVector(B, eps), n, isl) - detail(q.copy(p).addScaledVector(B, -eps), n, isl)) / (2 * eps);
      let gx = hT, gy = hB;
      // scars and whisker pits: grooves and dimples
      const sc = (d) => -0.0007 * scarAt(d, n) - 0.0006 * pitAt(d, n);
      gx += (sc(q.copy(p).addScaledVector(T, eps)) - sc(q.copy(p).addScaledVector(T, -eps))) / (2 * eps);
      gy += (sc(q.copy(p).addScaledVector(B, eps)) - sc(q.copy(p).addScaledVector(B, -eps))) / (2 * eps);
      out = n.clone().addScaledVector(T, -gx).addScaledVector(B, -gy).normalize();
    }
    NRM[k * 3] = Math.round(127.5 + 127.5 * clamp(out.dot(T), -1, 1)); NRM[k * 3 + 1] = Math.round(127.5 + 127.5 * clamp(out.dot(B), -1, 1)); NRM[k * 3 + 2] = Math.round(127.5 + 127.5 * clamp(out.dot(n), -1, 1));
    // colour: the source's black back and white belly regraded to slate and silver; its spots kept dark
    const r0 = SRCD[k * 3], g0 = SRCD[k * 3 + 1], b0 = SRCD[k * 3 + 2], l = LUM[k] / 255, reg = REGION[k] / 255;
    const pink = smooth((r0 - (g0 + b0) / 2 - 25) / 40);
    let c = mix(mix(SLATE, MIDG, smooth((reg - 0.1) / 0.35)), SILVER, smooth((reg - 0.42) / 0.38));
    c = mix(c, SPOT, smooth((reg - l - 0.06) / 0.26) * 0.85);
    // a darker mottle over the back and flanks, as the real animal has
    const cl = cells(p.x, p.y, p.z, 0.075, 51);
    if (cl.id > 0.4) c = mix(c, SPOT, (0.18 + 0.2 * cl.id) * (1 - smooth((cl.c - 0.006 - 0.016 * (cl.id - 0.4)) / 0.007)) * (1 - smooth((reg - 0.35) / 0.3)));
    // a little of the paint's own value back, and a cold sheen of variation
    c = c.map((x) => x * (0.92 + 0.16 * fbm(p.x, p.y, p.z, 0.05, 2, 61)));
    // creases darker
    const hd = detail(p, n, isl); c = c.map((x) => x * clamp(1 + hd * 55, 0.82, 1.04));
    // pale scars, dark whisker pits
    const sc = scarAt(p, n); c = mix(c, [150, 154, 160], 0.55 * sc * (1 - smooth((reg - 0.5) / 0.2)));
    c = mix(c, [40, 40, 44], 0.4 * pitAt(p, n));
    // frost dusted along the spine and the top of the head: patchy, crystalline
    const up = smooth((n.y - 0.5) / 0.4) * smooth((0.2 - Math.abs(p.x)) / 0.14) * smooth((p.y - 0.12) / 0.15);
    const patch = 0.3 + 0.7 * smooth((fbm(p.x, p.y, p.z, 0.09, 3, 71) - 0.45) / 0.2), grain = fbm(p.x, p.y, p.z, 0.012, 2, 81);
    const fr = up * patch * (0.25 + 0.75 * smooth((grain - 0.4) / 0.25)) * (isl === 0 || isl === 3 ? 0.34 : 0);
    c = mix(c, FROSTC, fr);
    // the mouth's pink and the eye rims keep the paint's colour (a little darker)
    c = mix(c, [r0 * 0.86, g0 * 0.8, b0 * 0.84], pink);
    for (let j = 0; j < 3; j++) BASE[k * 3 + j] = Math.round(clamp(c[j], 0, 255));
  }
}
// the small parts' cells: teeth (pink gum to ivory tip), tongue, gums and eyes
const fillCell = (name, fn) => { const [cx, cy, cw, ch] = CELL[name]; for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const c = fn(x / (cw - 1), y / (ch - 1)), k = (cy + y) * AW + cx + x; for (let j = 0; j < 3; j++) BASE[k * 3 + j] = Math.round(clamp(c[j], 0, 255)); } };
fillCell('teeth', (u, v) => { const f = clamp((v * (CELL.teeth[3] - 1) - 6) / (CELL.teeth[3] - 12)); return f < 0.1 ? mix([168, 92, 104], [206, 188, 160], smooth(f / 0.1)) : mix([206, 188, 160], [240, 236, 226], smooth((f - 0.1) / 0.8)).map((x) => x * (0.97 + 0.03 * Math.sin(u * 9))); });
fillCell('tongue', (u, v) => [178 - 14 * v, 92 - 8 * v, 110 - 6 * v].map((x) => x * (0.95 + 0.05 * Math.sin(u * 13 + v * 7))));
fillCell('gum', () => [150, 70, 86]);
fillCell('eye', () => [10, 10, 12]);
const BASEPNG = await sharp(BASE, { raw: { width: AW, height: AW, channels: 3 } }).png().toBuffer();
const NRMPNG = await sharp(NRM, { raw: { width: AW, height: AW, channels: 3 } }).resize(512, 512, { kernel: 'lanczos3' }).png().toBuffer();
if (DBG) { writeFileSync(`${DBG}/icemaw_d.png`, BASEPNG); writeFileSync(`${DBG}/icemaw_n.png`, NRMPNG); }
console.log('maps baked');

// ---------- 8. the document ----------
const D = buildDoc(rig, mesh, { name: 'icemaw', base: [1, 1, 1, 1], rough: 0.45, metal: 0, textures: { base: { image: BASEPNG, mime: 'image/png' }, normal: { image: NRMPNG, mime: 'image/png' } } },
  { rootName: 'icemaw', meshName: 'icemaw_mesh', skinName: 'icemaw' });
if (DBG) {   // the weights as vertex colours (each bone a colour), on a plain material
  const PAL = [[1, 1, 1], [0.9, 0.2, 0.2], [0.2, 0.8, 0.2], [0.2, 0.4, 1], [1, 0.8, 0.1], [1, 0.3, 0.9], [0.1, 0.9, 0.9], [0.6, 0.3, 0.1], [0.5, 0.5, 1], [1, 0.5, 0.2], [0.3, 0.6, 0.3], [0.9, 0.9, 0.5], [0.7, 0.2, 0.6], [0.2, 0.2, 0.6]];
  const col = []; for (let i = 0; i < NV; i++) { const c = [0, 0, 0]; for (let k = 0; k < 4; k++) { const w = Ww[i * 4 + k]; if (w) PAL[Jw[i * 4 + k] % PAL.length].forEach((x, j) => (c[j] += x * w)); } col.push(...c); }
  const Dw = buildDoc(rig, { ...mesh, col, uv: null }, { name: 'w', base: [1, 1, 1, 1], rough: 0.8 });
  await io.write(`${DBG}/weights.glb`, Dw.doc);
  console.log('palette', rig.names.map((n, i) => n + ':' + PAL[i % PAL.length].join('/')).join(' '));
}

// ---------- 9. clips ----------
// poses: { q: { bone: local rotation }, p: { root: translation } }; the bind frames are the world axes, so a bone's
// pitch is about X (+ lowers what lies ahead of it toward +Z, raises what trails behind toward -Z), yaw about Y (+ turns
// toward +X, the seal's left) and roll about Z (+ lifts its left side)
const FPS = 30;
const R3 = (pitch = 0, yaw = 0, roll = 0) => Qa(Y, yaw).multiply(Qa(X, pitch)).multiply(Qa(Z, roll));
const newPose = () => ({ q: {}, p: {} });
function rot(P, b, pitch = 0, yaw = 0, roll = 0) { if (!pitch && !yaw && !roll) return P; const q = R3(pitch, yaw, roll); P.q[b] = P.q[b] ? P.q[b].multiply(q) : q; return P; }
function move(P, x = 0, y = 0, z = 0) { P.p.root = (P.p.root || V()).add(V(x, y, z)); return P; }
const JAWC = -28;   // the jaw closed (the sculpt's mouth is open about 31 degrees)
// skinned positions of a list of vertices under an fk() result
function skinList(F, list) {
  const out = [], v = V(), acc = V();
  for (const i of list) {
    acc.set(0, 0, 0);
    for (let k = 0; k < 4; k++) {
      const w = Ww[i * 4 + k]; if (!w) continue; const j = Jw[i * 4 + k];
      v.set(M.pos[i * 3] - rig.bind[j].x, M.pos[i * 3 + 1] - rig.bind[j].y, M.pos[i * 3 + 2] - rig.bind[j].z).applyQuaternion(F.Wq[j]).add(F.Wp[j]);
      acc.addScaledVector(v, w);
    }
    out.push(acc.clone());
  }
  return out;
}
const EVERY = []; for (let i = 0; i < NV; i += 2) EVERY.push(i);
const lowest = (P) => Math.min(...skinList(fk(rig, P), EVERY).map((p) => p.y));
// a clip set down on the ground: every frame lifted or lowered so its lowest point rests on y = 0 (lightly smoothed:
// never more than 3 mm into the ground or 8 mm above it); `keep(t)` 0..1 lets a stretch of the clip keep its own height (dives)
function grounded(dur, fn, keep = () => 0, loop = false) {
  const n = Math.round(dur * FPS), off = [];
  for (let i = 0; i <= n; i++) off.push(-lowest(fn(Math.min(dur, i / FPS))));
  const at = (i) => off[loop ? (i + n) % n : clamp(i, 0, n)];
  const sm = off.map((o, i) => clamp((at(i - 2) + 2 * at(i - 1) + 3 * o + 2 * at(i + 1) + at(i + 2)) / 9, o - 0.003, o + 0.008));
  return (t) => { const P = fn(t), i = Math.round(t * FPS), k = keep(t); return move(P, 0, sm[Math.min(n, i)] * (1 - k), 0); };
}
const info = {};
const clip = (name, dur, fn, o = {}) => { const r = writeClip(D, rig, mesh, name, dur, fn, { minEdge: 0.02, fps: FPS, ...o }); info[name] = r.info; return r; };
// the resting attitude: jaw shut, fore flippers against the flanks, hind flippers together and just off the ice
function rest(P = newPose()) {
  rot(P, 'jaw', JAWC);
  rot(P, 'flipF_L', -4, 6, -8); rot(P, 'flipF_R', -4, -6, 8);
  rot(P, 'flipH_L', 6, -4); rot(P, 'flipH_R', 6, 4);
  return P;
}
// a lateral S-wave down the spine (degrees at the body), phase in cycles
function sway(P, a, ph, k = 0.12) {
  const ch = ['chest', 'neck', 'head'], bk = ['spine1', 'spine2', 'pelvis', 'tail'];
  rot(P, 'body', 0, a * 0.4 * Math.sin(TAU * ph));
  ch.forEach((b, i) => rot(P, b, 0, -a * (0.5 - 0.15 * i) * Math.sin(TAU * (ph + k * (i + 1)))));
  bk.forEach((b, i) => rot(P, b, 0, a * (0.6 + 0.2 * i) * Math.sin(TAU * (ph - k * (i + 1)))));
  return P;
}

// idle: lying with the head up, breathing; it looks about, and once a slow yawn shows the teeth (4 s, loops)
const IDLE = 4;
clip('idle', IDLE, grounded(IDLE, (t) => {
  const P = rest(), br = Math.sin(TAU * 2 * t / IDLE), look = kf(t, [[0, 0], [0.6, 0], [1.3, 22], [2.0, 18], [2.6, -12], [3.3, -8], [4, 0]]);
  const yawn = env(t, 2.1, 2.5, 2.8, 3.3);
  rot(P, 'body', -0.6 * br); rot(P, 'chest', -1.2 * br); rot(P, 'neck', 0.8 * br - 4 * yawn, look * 0.35);
  rot(P, 'head', 1.5 * br + 4 * Math.sin(TAU * t / IDLE) - 10 * yawn, look * 0.6, -look * 0.15);
  rot(P, 'jaw', 34 * yawn + 1.5 * Math.max(0, br));
  rot(P, 'pelvis', 1.5 * Math.sin(TAU * t / IDLE + 1)); rot(P, 'tail', 3 * Math.sin(TAU * t / IDLE + 2));
  rot(P, 'flipH_L', 6 * Math.sin(TAU * 2 * t / IDLE + 1), -3 * Math.sin(TAU * t / IDLE)); rot(P, 'flipH_R', 6 * Math.sin(TAU * 2 * t / IDLE + 1.3), 3 * Math.sin(TAU * t / IDLE));
  rot(P, 'flipF_L', 3 * br, 0, 2 * br); rot(P, 'flipF_R', 3 * br, 0, -2 * br);
  return P;
}, undefined, true), { loop: true });

// ---------- the galumph (walk, run) ----------
// A hump forms behind the body while the chest bears the weight (gather), then the back straightens and throws the
// chest forward and up while the pelvis bears it (push), and the body slides on over the ice (glide). The root's z is
// solved so the bearing part grips: it moves backward at the actor's speed (scaled by `grip`, ice is slippery), and the
// glide takes up the rest, so the clip loops in place with the hump's real reach.
const BELLY = (z0, z1) => { const l = []; for (let i = 0; i < NV; i++) if (M.part[i] === 0 && M.pos[i * 3 + 1] < 0.07 && M.pos[i * 3 + 2] > z0 && M.pos[i * 3 + 2] < z1 && Math.abs(M.pos[i * 3]) < 0.25) l.push(i); return l; };
const FRONT = BELLY(0.2, 0.62), REAR = BELLY(-1.05, -0.7);
function galumphShape(ph, A) {
  const P = rest();
  const gather = ph < 0.45 ? smooth(ph / 0.45) : ph < 0.76 ? 1 - smooth((ph - 0.45) / 0.31) : 0;   // the hump
  const push = bump(ph, 0.4, 0.92), land = bump(ph, 0.78, 1.0) + bump(ph, -0.22, 0.0);            // chest up, then down
  // hump: from the chest the back rises to its top over spine1 and comes down to the pelvis; front and tail stay level
  const af = A.hump * gather, ar = af * 1.07;
  rot(P, 'body', af - A.lift * 0.35 * push); rot(P, 'spine1', -(af + ar) * 0.55); rot(P, 'spine2', -(af + ar) * 0.45); rot(P, 'pelvis', ar);
  rot(P, 'tail', 10 * push, 0); rot(P, 'flipH_L', 12 * push - 6 * gather, -6 * push); rot(P, 'flipH_R', 12 * push - 6 * gather, 6 * push);
  // the front: the chest bears the weight while the hump gathers, then it and the head are thrown up and forward
  rot(P, 'chest', -af - A.lift * 0.65 * push + 3 * land);
  rot(P, 'neck', 6 * gather - A.lift * 0.4 * push + 4 * land); rot(P, 'head', 4 * gather + A.lift * 0.35 * push - 6 * land);
  rot(P, 'jaw', A.jaw * bump(ph, 0.5, 0.9));
  // fore flippers: pressed down and back while the chest bears weight, then lifted and swung forward
  rot(P, 'flipF_L', -16 * gather + 22 * push, 10 * gather - 12 * push, -10 * gather + 8 * push);
  rot(P, 'flipF_R', -16 * gather + 22 * push, -10 * gather + 12 * push, 10 * gather - 8 * push);
  sway(P, A.lat, ph);
  return P;
}
function galumph(name, T, v, A) {
  const n = Math.round(T * FPS), dt = T / n, zF = [], zR = [];
  for (let i = 0; i <= n; i++) {
    const F = fk(rig, galumphShape(i / n, A));
    zF.push(skinList(F, FRONT).reduce((a, p) => a + p.z, 0) / FRONT.length);
    zR.push(skinList(F, REAR).reduce((a, p) => a + p.z, 0) / REAR.length);
  }
  const wF = (ph) => A.grip * (1 - ramp(ph, 0.36, 0.48)) * ramp(ph, 0.02, 0.1);   // the chest bears weight in the gather
  const wR = (ph) => A.grip * ramp(ph, 0.42, 0.5) * (1 - ramp(ph, 0.72, 0.82));   // the pelvis in the push
  // root z velocity per step; c, the glide's, makes the loop close
  const fixed = [], free = [];
  for (let i = 0; i < n; i++) {
    const ph = (i + 0.5) / n, f = wF(ph), r = wR(ph);
    fixed.push(f * (-v - (zF[i + 1] - zF[i]) / dt) + r * (-v - (zR[i + 1] - zR[i]) / dt)); free.push(1 - f - r);
  }
  const c = -fixed.reduce((a, x) => a + x, 0) / free.reduce((a, x) => a + x, 0);
  const rz = [0]; for (let i = 0; i < n; i++) rz.push(rz[i] + (fixed[i] + free[i] * c) * dt);
  const mean = rz.slice(0, n).reduce((a, x) => a + x, 0) / n;
  const shape = (t) => { const ph = (t / T) % 1, i = Math.min(n, Math.round(ph * n)); return move(galumphShape(ph, A), 0, 0, rz[i] - mean); };
  const r = clip(name, T, grounded(T, shape, undefined, true), { loop: true });
  const amp = Math.max(...rz) - Math.min(...rz);
  console.log(`${name}: ${T} s, stride ${(v * T).toFixed(2)} m, glide speed ${(v + c).toFixed(2)} m/s, root surge ${amp.toFixed(2)} m`);
  return r;
}
const WALK_V = 1.25, RUN_V = 2.3;
galumph('walk', 1.0, WALK_V, { hump: 16, lift: 14, lat: 9, jaw: 0, grip: 0.55 });
galumph('run', 0.7, RUN_V, { hump: 22, lift: 22, lat: 12, jaw: 10, grip: 0.6 });

// stranded: caught out on the ice, thrashing: big S-waves, rolling, snapping, flippers flailing (1.2 s, loops)
const STR = 1.2;
clip('stranded', STR, grounded(STR, (t) => {
  const ph = t / STR, P = rest();
  sway(P, 16, ph * 2, 0.16);
  rot(P, 'body', 0, 0, 7 * Math.sin(TAU * ph * 2 + 0.6)); rot(P, 'chest', -6 - 6 * Math.sin(TAU * ph * 2), 0, 4 * Math.sin(TAU * ph * 2 + 1));
  rot(P, 'spine2', -8 * Math.max(0, Math.sin(TAU * ph * 2 + 1.5))); rot(P, 'pelvis', 6 * Math.max(0, Math.sin(TAU * ph * 2 + 1.5)));
  rot(P, 'neck', -6, 10 * Math.sin(TAU * ph * 2 + 2)); rot(P, 'head', -8 + 6 * Math.sin(TAU * ph * 4), 12 * Math.sin(TAU * ph * 2 + 2.5));
  rot(P, 'jaw', 30 * Math.pow(Math.max(0, Math.sin(TAU * ph * 3)), 0.7));
  rot(P, 'flipF_L', 25 * Math.sin(TAU * ph * 4), -14 * Math.sin(TAU * ph * 4 + 1), -18 * Math.sin(TAU * ph * 4)); rot(P, 'flipF_R', 25 * Math.sin(TAU * ph * 4 + 1.6), 14 * Math.sin(TAU * ph * 4 + 2.6), 18 * Math.sin(TAU * ph * 4 + 1.6));
  rot(P, 'tail', 14 * Math.sin(TAU * ph * 4)); rot(P, 'flipH_L', 16 * Math.sin(TAU * ph * 4 + 0.5), -10 * Math.sin(TAU * ph * 2)); rot(P, 'flipH_R', 16 * Math.sin(TAU * ph * 4 + 0.5), 10 * Math.sin(TAU * ph * 2));
  return P;
}, undefined, true), { loop: true });

// attack: the lunging bite. Rears back with the jaws opening, throws the front forward and down, snaps shut (0.48 s)
const ATK = 1.0, ATK_HIT = 0.48;
clip('attack', ATK, grounded(ATK, (t) => {
  const P = rest(), back = env(t, 0.0, 0.3, 0.34, 0.44), strike = env(t, 0.32, 0.46, 0.6, 0.95), open = env(t, 0.05, 0.3, 0.44, 0.5);
  move(P, 0, 0, -0.12 * back + 0.42 * strike);
  rot(P, 'spine1', 10 * back - 4 * strike); rot(P, 'spine2', -14 * back + 6 * strike); rot(P, 'pelvis', 6 * back);
  rot(P, 'body', -6 * back + 3 * strike); rot(P, 'chest', -10 * back + 5 * strike); rot(P, 'neck', -12 * back + 7 * strike, 0, 0);
  rot(P, 'head', -10 * back + 2 * strike + 5 * bump(t, 0.48, 0.62));
  rot(P, 'jaw', 50 * open + 6 * bump(t, 0.5, 0.58));
  rot(P, 'flipF_L', 20 * back - 10 * strike, -20 * strike); rot(P, 'flipF_R', 20 * back - 10 * strike, 20 * strike);
  rot(P, 'flipH_L', 14 * strike); rot(P, 'flipH_R', 14 * strike);
  return P;
}));

// attack2: the drag. A quick bite (0.3 s), then it hauls back with the jaws locked, shaking its head side to side,
// rocking back on the hump, and lets go
const DRAG = 1.5, DRAG_HIT = 0.3;
clip('attack2', DRAG, grounded(DRAG, (t) => {
  const P = rest(), bite = env(t, 0.0, 0.2, 0.3, 0.5), open = env(t, 0.0, 0.16, 0.26, 0.3), haul = env(t, 0.32, 0.7, 1.1, 1.45);
  const shake = Math.sin(TAU * 2.6 * (t - 0.45)) * env(t, 0.45, 0.6, 1.0, 1.15);
  // hauling: the head kept low and the neck braced, the body rocking back onto a hump behind it
  move(P, 0, 0, 0.3 * bite - 0.5 * haul);
  rot(P, 'body', 6 * haul, -4 * shake, 3 * shake); rot(P, 'spine1', -20 * haul); rot(P, 'pelvis', 14 * haul);
  rot(P, 'chest', 8 * bite + 4 * haul, 4 * shake); rot(P, 'neck', 12 * bite + 10 * haul, 16 * shake + 6 * haul); rot(P, 'head', 6 * bite + 8 * haul, 14 * shake, -10 * shake);
  rot(P, 'jaw', 44 * open - 3 * haul + 30 * env(t, 1.12, 1.25, 1.3, 1.5));
  rot(P, 'flipF_L', -18 * haul, 10 * haul, -10 * haul); rot(P, 'flipF_R', -18 * haul, -10 * haul, 10 * haul);
  rot(P, 'tail', 8 * haul); rot(P, 'flipH_L', -8 * haul); rot(P, 'flipH_R', -8 * haul);
  return P;
}));

// lunge: out of a hole across the ice (the game carries it 7 m): bunches, then shoots out stretched and flat with the
// jaws wide and the flippers swept back, snaps at the end of the run (0.6 s) and lands on its chest
const LUNGE = 1.0, LUNGE_HIT = 0.6;
clip('lunge', LUNGE, grounded(LUNGE, (t) => {
  const P = rest(), coil = env(t, 0, 0.12, 0.14, 0.22), fly = env(t, 0.14, 0.24, 0.58, 0.72), snap = bump(t, 0.57, 0.7), land = bump(t, 0.66, 0.9);
  move(P, 0, 0.16 * fly, -0.1 * coil + 0.25 * fly - 0.1 * land);
  rot(P, 'root', -4 * fly + 3 * land);
  rot(P, 'spine1', 12 * coil - 4 * fly); rot(P, 'spine2', -20 * coil + 3 * fly); rot(P, 'pelvis', 8 * coil + 6 * fly); rot(P, 'tail', 10 * fly);
  rot(P, 'chest', -8 * coil + 6 * fly + 4 * land); rot(P, 'neck', -10 * coil + 14 * fly - 6 * land); rot(P, 'head', -6 * coil + 4 * fly + 6 * snap);
  rot(P, 'jaw', 52 * env(t, 0.1, 0.3, 0.56, 0.62) + 3 * land);
  rot(P, 'flipF_L', 10 * fly - 14 * land, 5 * fly, 4 * fly); rot(P, 'flipF_R', 10 * fly - 14 * land, -5 * fly, -4 * fly);
  rot(P, 'flipH_L', 10 * fly, 6 * fly); rot(P, 'flipH_R', 10 * fly, -6 * fly);
  return P;
}, (t) => env(t, 0.16, 0.26, 0.6, 0.7)));

// surface: up out of a hole under it (1.6 s). Nose first, steeply, a bark at the top, then the chest comes down on the
// ice and the rest hauls out after it; it ends in the idle's attitude
const SURF = 1.6;
clip('surface', SURF, grounded(SURF, (t) => {
  const P = rest(), up = smooth(t / 0.95), lay = smooth((t - 0.45) / 0.65), bark = env(t, 0.42, 0.55, 0.7, 0.85);
  move(P, 0, -2.3 * (1 - up), -0.9 * (1 - smooth(t / 1.2)));
  rot(P, 'root', -58 * (1 - lay));
  rot(P, 'spine1', -6 * (1 - lay)); rot(P, 'spine2', -10 * (1 - lay) + 8 * bump(t, 0.9, 1.4)); rot(P, 'pelvis', 6 * bump(t, 0.9, 1.4));
  rot(P, 'neck', 10 * (1 - lay) - 8 * bark); rot(P, 'head', 18 * (1 - lay) - 14 * bark + 5 * bump(t, 1.0, 1.3));
  rot(P, 'jaw', 46 * bark);
  rot(P, 'flipF_L', -30 * (1 - lay), 20 * (1 - lay)); rot(P, 'flipF_R', -30 * (1 - lay), -20 * (1 - lay));
  rot(P, 'tail', 14 * Math.sin(TAU * t * 1.5) * (1 - smooth((t - 1.1) / 0.4))); rot(P, 'flipH_L', 16 * Math.sin(TAU * t * 1.5 + 0.6) * (1 - smooth((t - 1.1) / 0.4))); rot(P, 'flipH_R', 16 * Math.sin(TAU * t * 1.5 + 0.6) * (1 - smooth((t - 1.1) / 0.4)));
  return P;
}, (t) => 1 - smooth((t - 0.75) / 0.35)));

// dive: head first down into a hole in front of it (1.3 s, held under)
const DIVE = 1.3;
clip('dive', DIVE, grounded(DIVE, (t) => {
  const P = rest(), rear = env(t, 0, 0.18, 0.22, 0.4), go = smooth((t - 0.22) / 1.0), down = Math.pow(clamp((t - 0.25) / 1.05), 1.6);
  move(P, 0, -2.6 * down, 1.1 * go);
  rot(P, 'root', 66 * smooth((t - 0.2) / 0.75));
  const tuck = smooth((t - 0.16) / 0.34);   // the head goes in first, tucked down
  rot(P, 'neck', -10 * rear + 26 * tuck); rot(P, 'head', -12 * rear + 20 * tuck); rot(P, 'jaw', 10 * rear);
  rot(P, 'spine1', 6 * go); rot(P, 'spine2', 8 * go - 14 * bump(t, 0.6, 1.2)); rot(P, 'pelvis', 10 * bump(t, 0.6, 1.2)); rot(P, 'tail', 20 * bump(t, 0.7, 1.3));
  rot(P, 'flipF_L', 20 * go, -25 * go); rot(P, 'flipF_R', 20 * go, 25 * go);
  rot(P, 'flipH_L', 25 * bump(t, 0.75, 1.3), 6 * go); rot(P, 'flipH_R', 25 * bump(t, 0.75, 1.3), -6 * go);
  return P;
}, (t) => smooth((t - 0.2) / 0.2)));

// slide: back into the water behind it, tail first, the head last (1.2 s, held under)
const SLIDE = 1.2;
clip('slide', SLIDE, grounded(SLIDE, (t) => {
  const P = rest(), go = smooth(t / 0.9), down = Math.pow(clamp((t - 0.1) / 1.1), 1.5);
  move(P, 0, -2.4 * down, -1.0 * go);
  rot(P, 'root', -50 * smooth((t - 0.05) / 0.8));
  rot(P, 'spine2', -8 * go); rot(P, 'neck', 14 * go); rot(P, 'head', 16 * go - 10 * bump(t, 0.2, 0.6)); rot(P, 'jaw', 22 * bump(t, 0.15, 0.6));
  rot(P, 'flipF_L', -20 * go, 18 * go); rot(P, 'flipF_R', -20 * go, -18 * go);
  return P;
}, (t) => smooth((t - 0.08) / 0.2)));

// hit: jolted back, the head flung up and aside, a gasp
const HIT = 0.5;
clip('hit', HIT, grounded(HIT, (t) => {
  const P = rest(), j = Math.pow(bump(t, 0, 0.42), 0.6), k = bump(t, 0, HIT);
  move(P, 0, 0, -0.08 * k);
  rot(P, 'body', -3 * j, 0, 4 * j); rot(P, 'chest', -6 * j, -4 * j); rot(P, 'neck', -10 * j, -10 * j); rot(P, 'head', -10 * j, -8 * j, 8 * j);
  rot(P, 'jaw', 26 * j); rot(P, 'spine2', -6 * j); rot(P, 'tail', 12 * j);
  rot(P, 'flipF_L', 18 * j, -16 * j); rot(P, 'flipF_R', 18 * j, 16 * j);
  return P;
}));

// die: convulses with the head thrown back and the jaws wide, then rolls over onto its right side; the head drops,
// the jaw hangs, the flippers go slack (1.9 s, held)
const DIE = 1.9;
clip('die', DIE, grounded(DIE, (t) => {
  const P = rest(), sp = env(t, 0, 0.18, 0.4, 0.62), roll = smooth((t - 0.45) / 0.8), drop = smooth((t - 0.8) / 0.7), tw = Math.sin(t * 38) * sp;
  rot(P, 'body', 0, 0, -86 * roll);
  rot(P, 'spine1', -6 * sp + 4 * roll, 0, -4 * roll); rot(P, 'spine2', 10 * sp + 3 * tw); rot(P, 'pelvis', -6 * sp); rot(P, 'tail', 14 * sp + 6 * tw);
  rot(P, 'chest', -12 * sp + 4 * drop, 0, -6 * roll); rot(P, 'neck', -20 * sp + 22 * drop, 0, -8 * drop); rot(P, 'head', -18 * sp + 18 * drop + 3 * tw, -10 * drop, -10 * drop);
  rot(P, 'jaw', 48 * sp + 18 * drop);
  rot(P, 'flipF_L', 30 * sp + 10 * tw, -20 * sp + 12 * drop, 10 * drop); rot(P, 'flipF_R', 30 * sp - 10 * tw - 8 * drop, 20 * sp - 14 * drop, 14 * drop);
  rot(P, 'flipH_L', 20 * sp + 10 * tw, -14 * drop); rot(P, 'flipH_R', 20 * sp - 10 * tw, 10 * drop);
  return P;
}));

// ---------- 10. finish ----------
if (DBG) await io.write(`${DBG}/icemaw_raw.glb`, D.doc);
let rb = { lo: V(1e9, 1e9, 1e9), hi: V(-1e9, -1e9, -1e9) };
for (let i = 0; i < NV; i++) { rb.lo.min(P(i)); rb.hi.max(P(i)); }
const bytes = await finish(D.doc, OUT, {
  hit: { attack: ATK_HIT, attack2: DRAG_HIT, lunge: LUNGE_HIT },
  height: +(rb.hi.y - rb.lo.y).toFixed(2), length: +(rb.hi.z - rb.lo.z).toFixed(2), legSpan: +(rb.hi.x - rb.lo.x).toFixed(2),
  walkSpeed: WALK_V, runSpeed: RUN_V,
  credit: '"Leopard Seal" by Grace Belt (sketchfab.com/neatGrace), CC-BY 4.0 - thinned, re-textured, rigged and animated for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('icemaw', (bytes / 1024).toFixed(0) + ' KB', `${NT} triangles`);
for (const [k, v] of Object.entries(info)) console.log('  ' + k.padEnd(9), JSON.stringify(v));
