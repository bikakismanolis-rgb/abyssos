// Packs the Act III environment set ('wood' pack), loaded when the hero first heads for the Weeping Woods:
//   src/assets/wood/<id>_d.webp, <id>_n.webp   tiling layers: golden leaf litter, moss, peat, root/bark walls, mossy stone
//   src/assets/wood.glb                         props: standing stones (geometry only, the game stones them in world space),
//                                               a giant root, the fallen trunk (the Fallen King), an old broken stump,
//                                               a mushroom cluster and a weeping willow
//   src/assets/wood/CREDITS.txt
// Layers and the stone/trunk props are Poly Haven (CC0); the root, stump, mushrooms and willow are Sketchfab (CC-BY 4.0),
// where Poly Haven has nothing that fits (its roots are flat ground scans, its stumps are earth mounds, no fungi, no willow).
// usage: node tools/pack-wood.mjs [polyhaven dir] [sketchfab models dir]
//   polyhaven dir holds tex/<id>/<id>_{diff,nor_gl,arm}_1k.jpg and models/<id>/<id>_1k.gltf (ph_dl.py)
//   sketchfab dir holds <folder>/model.glb + meta.json (dl.py)
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as THREE from 'three';
import sharp from 'sharp';
import { flatten, clearNodeTransform, compactPrimitive, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { io, packLayer, loadProp, writePack, simplifyPrim, triCount } from './envlib.mjs';

const PH = process.argv[2] || '/tmp/claude-0/ph';
const SF = process.argv[3] || '/tmp/claude-0/sf/models';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_TEX = path.join(ROOT, 'src/assets/wood');
const OUT_GLB = path.join(ROOT, 'src/assets/wood.glb');
const TMP = path.join(os.tmpdir(), 'skotos-wood');

// ---------- tiling layers (Poly Haven, CC0) ----------
// grade: { mul: [r, g, b], sat, gamma } colour grade applied with the AO bake (the act's palette; a little lift on the
// darkest scans so they sit near the Act I and II layers' brightness)
const LAYERS = [
  // forest floor thick with fallen leaves, warmed from grey-brown towards gold
  { id: 'goldleaf', src: 'leaves_forest_ground', by: 'Dario Barresi, Dimitrios Savva', d: 1024, n: 512, ao: 0.7, grade: { mul: [1.08, 1.0, 0.8], sat: 1.2 } },
  // deep green moss over soil: a short, dense turf scan pushed from olive to moss green
  { id: 'moss', src: 'sparse_grass', by: 'Amal Kumar', d: 1024, n: 512, ao: 0.55, grade: { mul: [0.68, 1.0, 0.85], sat: 1.25, gamma: 0.85 } },
  // dark wet forest mud for paths and the mere shores
  { id: 'peat', src: 'mud_forest', by: 'eye-candy.xyz', d: 1024, n: 512, ao: 0.8, grade: { gamma: 0.85 } },
  // deeply furrowed willow bark: the Heartwood's root walls
  { id: 'rootwall', src: 'bark_willow', by: 'Dario Barresi, Dimitrios Savva', d: 1024, n: 512, ao: 0.9, grade: { mul: [1.05, 1, 0.92], gamma: 0.85 } },
  // lichen and moss over grey stone: the standing stones
  { id: 'stonemoss', src: 'mossy_rock', by: 'Rob Tuytel', d: 1024, n: 512, ao: 0.8 }
];

// ---------- props ----------
// pre: steps run on the source before loadProp (its world transforms baked first):
//   keep (regexp on mesh node names), rot ([x, y, z] degrees), cut (strip the scanned ground patch, see cutGround),
//   tris (a first decimation pass to about this many triangles: loadProp stops at 2% of the source)
// credit: [title, author, page, licence]
const PROPS = [
  // a squared block stood on end: the Glade of Stones' menhirs (3 m; the game supplies 'stonemoss')
  { key: 'standingStone', ph: 'rock_07', by: 'Jenelle van Heerden', pre: { rot: [90, 0, 0] }, tris: 1200, err: 0.05, geo: true, solid: true, ground: true, centre: true, height: 3 },
  // a thin slab stood on end, for variety in the ring
  { key: 'standingStoneB', ph: 'rock_09', by: 'Jenelle van Heerden', pre: { rot: [90, 0, 0] }, tris: 1000, err: 0.05, geo: true, solid: true, ground: true, centre: true, height: 3 },
  // the Fallen King: a gnarled dead trunk, length along z (source scale, ~4 m; the game scales it). The scan's origin is
  // its ground: the trunk lies on it with the far end ~0.2 m up and one broken branch sunk 0.33 m below (kept below y = 0)
  { key: 'fallenTrunk', ph: 'dead_tree_trunk_02', by: 'Jenelle van Heerden, Rico Cilliers', pre: { rot: [0, 90, 0] }, tris: 3000, err: 0.03, d: 1024, n: 512, orm: 256, solid: true, centre: true, deck: true },
  // a stump with its great roots spread over the ground; the scanned ground patch is levelled and cut away
  { key: 'giantRoot', sf: 'w3_rootstump', pre: { cut: { eps: 0.06, flat: 0.14, ring: 0.35, minTris: 3000, minH: 0.45 }, tris: 9000 }, tris: 2600, err: 0.03, d: 1024, n: 512, orm: 256, solid: false,
    credit: ['Tree Stump with big Roots [Free]', 'RodoxDE', 'https://sketchfab.com/3d-models/tree-stump-with-big-roots-free-bd60213e01574f94a715d01936f4ee82', 'CC-BY-4.0'] },
  // a tall, broken old oak stump (without the moss, plants and ground skirt of the scan), 1.3 m
  { key: 'stumpOld', sf: 'w3_oakstump', pre: { keep: /^parez_obora/, cut: { eps: 0.05, flat: 0.08, ring: 0.15, minTris: 1500 }, tris: 9000 }, tris: 2800, err: 0.03, d: 1024, n: 512, orm: 256, solid: false, height: 1.3,
    credit: ['Old Oak Stump Obora', '3dhdscan', 'https://sketchfab.com/3d-models/old-oak-stump-obora-5f5bb2305d534283be08f534ece9c9db', 'CC-BY-4.0'] },
  // a cluster of tall brown-capped mushrooms (half a metre, readable from the game camera)
  { key: 'mushrooms', sf: 'w3_mushsan', tris: 1800, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true, height: 0.5,
    credit: ['Realistic Mushroom - 01', 'SanForge', 'https://sketchfab.com/3d-models/realistic-mushroom-01-aededce1ec0f48f8b0f50cc1762a3f86', 'CC-BY-4.0'] },
  // a weeping willow, same author as the game's other trees; strand cards kept, trunk decimated
  // its strands turned from summer green to the wood's autumn gold
  { key: 'willow', sf: 'w3_willow', tris: 6000, err: 0.04, d: 512, n: 256, orm: 128, solid: false, keepCards: true, ground: true, centre: true, height: 8,
    async prep(doc) { await autumn(doc, { hue: 49, keep: 0.2, sat: 0.82, gamma: 0.6, gain: 1.08 }); foliageNormals(doc); groundOpaque(doc, this); },
    credit: ['Willow', 'evolveduk', 'https://sketchfab.com/3d-models/willow-422de2372f3d46dfb314a0cd5da512fe', 'CC-BY-4.0'] }
];

// ---------- layers ----------
async function packWoodLayer(L, srcDir, outDir) {
  if (!L.grade) return packLayer(L, srcDir, outDir);
  const dir = path.join(srcDir, L.src);
  const diff = await sharp(path.join(dir, `${L.src}_diff_1k.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const arm = await sharp(path.join(dir, `${L.src}_arm_1k.jpg`)).resize(diff.info.width, diff.info.height).removeAlpha().raw().toBuffer();
  const px = diff.data, ch = diff.info.channels, { mul = [1, 1, 1], sat = 1, gamma = 1 } = L.grade;
  for (let i = 0, j = 0; i < px.length; i += ch, j += 3) {
    const k = 1 - L.ao * (1 - arm[j] / 255);
    const c = [0, 1, 2].map((q) => Math.pow(px[i + q] / 255, gamma) * mul[q] * k);
    const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    for (let q = 0; q < 3; q++) px[i + q] = Math.max(0, Math.min(255, (l + (c[q] - l) * sat) * 255));
  }
  const dOut = path.join(outDir, `${L.id}_d.webp`), nOut = path.join(outDir, `${L.id}_n.webp`);
  await sharp(px, { raw: diff.info }).resize(L.d, L.d, { kernel: 'lanczos3' }).webp({ quality: 74, effort: 6 }).toFile(dOut);
  await sharp(path.join(dir, `${L.src}_nor_gl_1k.jpg`)).resize(L.n, L.n, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(nOut);
  return statSync(dOut).size + statSync(nOut).size;
}

// ---------- source preparation ----------
// every mesh's world transform baked into its vertices, the nodes left flat under the scene with identity transforms
async function bake(doc) {
  await doc.transform(flatten());
  for (const n of doc.getRoot().listNodes()) if (n.getMesh() || n.listChildren().length) clearNodeTransform(n);
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) p.setAttribute('TANGENT', null);
}
const primsOf = (doc) => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
// fn(pos: Vector3, nrm: Vector3|null) edits each vertex in place (each accessor visited once)
function eachVertex(doc, fn) {
  const seen = new Set(), p = new THREE.Vector3(), n = new THREE.Vector3(), v = [];
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), b = prim.getAttribute('NORMAL');
    if (seen.has(a)) continue; seen.add(a); if (b) seen.add(b);
    for (let i = 0; i < a.getCount(); i++) {
      p.fromArray(a.getElement(i, v)); if (b) n.fromArray(b.getElement(i, v));
      fn(p, b ? n : null);
      a.setElement(i, p.toArray()); if (b) b.setElement(i, n.normalize().toArray());
    }
  }
}
function rotate(doc, deg) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...deg.map((d) => (d * Math.PI) / 180), 'XYZ'));
  eachVertex(doc, (p, n) => { p.applyQuaternion(q); n?.applyQuaternion(q); });
}

// Strips the ground patch a scan was captured on: fits a smooth surface (quadratic) to the patch's outer ring,
// shears every vertex down by it (the slope is levelled, so the stump stands on y = 0 with its roots' relief intact),
// drops every triangle lying within eps of that ground (and the flat, sky-facing skin up to flat above it, which would
// otherwise stay as ribbons along the roots), then any small loose fragments left behind.
function cutGround(doc, { eps = 0.05, flat = 0, ring = 0.3, minTris = 200, minH = 0, cell = 0.05 }) {
  const pts = []; eachVertex(doc, (p) => pts.push(p.x, p.y, p.z));
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pts.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pts[i + k]); hi[k] = Math.max(hi[k], pts[i + k]); }
  const W = Math.ceil((hi[0] - lo[0]) / cell) + 1, H = Math.ceil((hi[2] - lo[2]) / cell) + 1;
  const mn = new Float32Array(W * H).fill(1e9);
  const cellOf = (x, z) => Math.floor((x - lo[0]) / cell) + Math.floor((z - lo[2]) / cell) * W;
  for (let i = 0; i < pts.length; i += 3) { const c = cellOf(pts[i], pts[i + 2]); mn[c] = Math.min(mn[c], pts[i + 1]); }
  // the outer ring: occupied cells within `ring` of an empty cell or the edge
  const r = Math.max(1, Math.round(ring / cell)), samples = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (mn[x + z * W] > 1e8) continue;
    let edge = false;
    for (let dz = -r; dz <= r && !edge; dz++) for (let dx = -r; dx <= r && !edge; dx++) {
      const xx = x + dx, zz = z + dz;
      if (xx < 0 || zz < 0 || xx >= W || zz >= H || mn[xx + zz * W] > 1e8) edge = true;
    }
    if (edge) samples.push([lo[0] + (x + 0.5) * cell, lo[2] + (z + 0.5) * cell, mn[x + z * W]]);
  }
  // least squares y = a + bx + cz + dx^2 + exz + fz^2, twice, the second time without the ring's high outliers (roots)
  const basis = (x, z) => [1, x, z, x * x, x * z, z * z];
  let coef = null, use = samples;
  for (let pass = 0; pass < 3; pass++) {
    const A = new Array(36).fill(0), B = new Array(6).fill(0);
    for (const [x, z, y] of use) { const f = basis(x, z); for (let i = 0; i < 6; i++) { B[i] += f[i] * y; for (let j = 0; j < 6; j++) A[i * 6 + j] += f[i] * f[j]; } }
    coef = solve(A, B, 6);
    const res = use.map(([x, z, y]) => y - dot(coef, basis(x, z)));
    const sd = Math.sqrt(res.reduce((s, v) => s + v * v, 0) / res.length);
    use = use.filter((s, i) => res[i] < 1.5 * sd);
  }
  const g = (x, z) => dot(coef, basis(x, z));
  const gx = (x, z) => coef[1] + 2 * coef[3] * x + coef[4] * z, gz = (x, z) => coef[2] + coef[4] * x + 2 * coef[5] * z;
  // level: y' = y - g(x, z); normals by the inverse transpose of that shear
  eachVertex(doc, (p, n) => {
    if (n) { const a = gx(p.x, p.z), b = gz(p.x, p.z); n.set(n.x + a * n.y, n.y, n.z + b * n.y); }
    p.y -= g(p.x, p.z);
  });
  // cut the ground skin, then the loose fragments (components joined across primitives by shared positions)
  const key = (a, i, v) => { a.getElement(i, v); return `${Math.round(v[0] * 500)},${Math.round(v[1] * 500)},${Math.round(v[2] * 500)}`; };
  const parent = new Map(), find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent.set(a, b); };
  const kept = [], v = [], P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3();
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray(), out = [], keys = [], tops = [];
    for (let t = 0; t < idx.length; t += 3) {
      const ys = [0, 1, 2].map((k) => a.getElement(idx[t + k], v)[1]), top = Math.max(...ys);
      if (top < eps) continue;
      if (top < flat) {
        P0.fromArray(a.getElement(idx[t], v)); P1.fromArray(a.getElement(idx[t + 1], v)); P2.fromArray(a.getElement(idx[t + 2], v));
        const fn = P1.sub(P0).cross(P2.sub(P0)).normalize();
        if (Math.abs(fn.y) > 0.88) continue;
      }
      out.push(idx[t], idx[t + 1], idx[t + 2]);
      const ks = [0, 1, 2].map((k) => key(a, idx[t + k], v));
      for (const k of ks) if (!parent.has(k)) parent.set(k, k);
      union(ks[0], ks[1]); union(ks[1], ks[2]);
      keys.push(ks[0]); tops.push(top);
    }
    kept.push({ prim, a, out, keys, tops });
  }
  // a fragment survives when it is big enough and stands high enough (low detached pieces are ground and stray roots)
  const size = new Map(), high = new Map();
  for (const { keys, tops } of kept) keys.forEach((k, t) => { const r0 = find(k); size.set(r0, (size.get(r0) || 0) + 1); high.set(r0, Math.max(high.get(r0) || 0, tops[t])); });
  const keep = (k) => { const r0 = find(k); return size.get(r0) >= minTris && high.get(r0) >= minH; };
  let dropped = 0;
  for (const { prim, out, keys } of kept) {
    const fin = [];
    for (let t = 0; t < keys.length; t++) if (keep(keys[t])) fin.push(out[t * 3], out[t * 3 + 1], out[t * 3 + 2]); else dropped++;
    prim.getIndices().setArray(new Uint32Array(fin));
    if (!fin.length) { prim.dispose(); continue; }
    compactPrimitive(prim);
  }
  // centre what is left on x/z, its foot just below y = 0 so the open root bottoms sit in the ground
  const b0 = [1e9, 1e9], b1 = [-1e9, -1e9];
  eachVertex(doc, (p) => { b0[0] = Math.min(b0[0], p.x); b1[0] = Math.max(b1[0], p.x); b0[1] = Math.min(b0[1], p.z); b1[1] = Math.max(b1[1], p.z); });
  const cx = (b0[0] + b1[0]) / 2, cz = (b0[1] + b1[1]) / 2;
  eachVertex(doc, (p) => { p.x -= cx; p.z -= cz; p.y -= eps * 0.6; });
  return { slope: [coef[1], coef[2]], dropped };
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function solve(A, B, n) {
  const M = A.slice(), y = B.slice();
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r * n + i]) > Math.abs(M[p * n + i])) p = r;
    for (let c = 0; c < n; c++) [M[i * n + c], M[p * n + c]] = [M[p * n + c], M[i * n + c]];
    [y[i], y[p]] = [y[p], y[i]];
    for (let r = i + 1; r < n; r++) { const f = M[r * n + i] / M[i * n + i]; for (let c = i; c < n; c++) M[r * n + c] -= f * M[i * n + c]; y[r] -= f * y[i]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let c = i + 1; c < n; c++) s -= M[i * n + c] * x[c]; x[i] = s / M[i * n + i]; }
  return x;
}

async function prepare(P, file) {
  if (!P.pre) return file;
  const doc = await io.read(file);
  await bake(doc);
  if (P.pre.keep) for (const n of doc.getRoot().listNodes()) if (n.getMesh() && !P.pre.keep.test(n.getName())) n.setMesh(null);
  await doc.transform(prune());
  if (P.pre.rot) rotate(doc, P.pre.rot);
  if (P.pre.cut) {
    const r = cutGround(doc, P.pre.cut);
    P.note = `ground cut: slope ${r.slope.map((s) => s.toFixed(2)).join(',')}, ${r.dropped} loose tris dropped`;
    // already levelled and centred: loadProp only scales it (to P.height when given)
    let top = -1e9; eachVertex(doc, (p) => { top = Math.max(top, p.y); });
    P.xform = { s: P.height ? P.height / top : 1 };
  }
  if (P.pre.tris) { const ratio = P.pre.tris / triCount(doc); if (ratio < 1) for (const p of primsOf(doc)) simplifyPrim(p, ratio, 0.02, true); }
  await doc.transform(prune());
  mkdirSync(TMP, { recursive: true });
  const out = path.join(TMP, P.key + '.glb');
  await io.write(out, doc);
  return out;
}

// Recolours the alpha-tested foliage (MASK materials): hues around green are pulled to `hue` (degrees), keeping a
// `keep` fraction of their spread, saturation scaled and value lifted (v' = gain * v^gamma).
async function autumn(doc, { hue = 45, keep = 0.25, sat = 1, gamma = 1, gain = 1 }) {
  for (const mat of doc.getRoot().listMaterials()) {
    const tex = mat.getAlphaMode() === 'MASK' && mat.getBaseColorTexture();
    if (!tex) continue;
    const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d < 0.02) continue;
      let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360;
      const h2 = (((hue + (h - 95) * keep) % 360) + 360) % 360, s2 = Math.min(1, (d / mx) * sat), v2 = Math.min(1, Math.pow(mx, gamma) * gain);
      const c = v2 * s2, x = c * (1 - Math.abs(((h2 / 60) % 2) - 1)), m = v2 - c, k = Math.floor(h2 / 60);
      const [rr, gg, bb] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
      data[i] = (rr + m) * 255; data[i + 1] = (gg + m) * 255; data[i + 2] = (bb + m) * 255;
    }
    tex.setImage(new Uint8Array(await sharp(data, { raw: info }).png().toBuffer())).setMimeType('image/png');
  }
}

// Soft canopy shading for alpha-tested cards: every vertex normal points out from the canopy's centre (tilted up), and
// each card is wound to face outwards, so the double-sided strands seen from outside light as one volume instead of
// half of them turning black (three.js flips the normal of back faces).
function foliageNormals(doc, { up = 0.35, at = 0.62 } = {}) {
  const prims = primsOf(doc).filter((p) => p.getMaterial()?.getAlphaMode() === 'MASK');
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9), v = new THREE.Vector3(), e = [];
  for (const p of prims) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { v.fromArray(a.getElement(i, e)); lo.min(v); hi.max(v); } }
  const c = new THREE.Vector3((lo.x + hi.x) / 2, lo.y + (hi.y - lo.y) * at, (lo.z + hi.z) / 2);
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), fn = new THREE.Vector3(), mid = new THREE.Vector3();
  for (const p of prims) {
    const a = p.getAttribute('POSITION'), nrm = p.getAttribute('NORMAL'), ix = p.getIndices(), idx = ix.getArray().slice();
    for (let t = 0; t < idx.length; t += 3) {
      p0.fromArray(a.getElement(idx[t], e)); p1.fromArray(a.getElement(idx[t + 1], e)); p2.fromArray(a.getElement(idx[t + 2], e));
      mid.copy(p0).add(p1).add(p2).divideScalar(3).sub(c);
      fn.subVectors(p1, p0).cross(v.subVectors(p2, p0));
      if (fn.dot(mid) < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; }
    }
    ix.setArray(idx);
    if (nrm) for (let i = 0; i < a.getCount(); i++) {
      v.fromArray(a.getElement(i, e)).sub(c); v.y *= 0.6; v.normalize(); v.y += up;
      nrm.setElement(i, v.normalize().toArray());
    }
  }
}

// feet on the trunk, not on the strand tips that hang down past it (those sink into the ground); P.bounds re-measured
function groundOpaque(doc, P) {
  let base = 1e9; const v = [];
  for (const p of primsOf(doc)) if (p.getMaterial()?.getAlphaMode() !== 'MASK') { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) base = Math.min(base, a.getElement(i, v)[1]); }
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  eachVertex(doc, (p) => { p.y -= base; p.toArray().forEach((x, k) => { lo[k] = Math.min(lo[k], x); hi[k] = Math.max(hi[k], x); }); });
  P.bounds = { size: hi.map((x, k) => x - lo[k]) };
  P.note = `trunk base lowered ${base.toFixed(2)} m to y = 0`;
}

// the trunk's walkable top: the median, over 10 cm slices of the middle 60% of its length (z), of each slice's top
function deckOf(doc, len) {
  const tops = new Map(), v = [];
  for (const prim of primsOf(doc)) { const a = prim.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); if (Math.abs(v[2]) > len * 0.3) continue; const k = Math.round(v[2] * 10); tops.set(k, Math.max(tops.get(k) ?? -1e9, v[1])); } }
  const t = [...tops.values()].sort((a, b) => a - b);
  return t.length ? +t[Math.floor(t.length / 2)].toFixed(3) : null;
}

// ---------- run ----------
await MeshoptSimplifier.ready;
mkdirSync(OUT_TEX, { recursive: true });
for (const f of readdirSync(OUT_TEX)) if (f.endsWith('.webp')) rmSync(path.join(OUT_TEX, f));
let texBytes = 0;
for (const L of LAYERS) { const b = await packWoodLayer(L, path.join(PH, 'tex'), OUT_TEX); texBytes += b; console.log('layer', L.id.padEnd(10), L.src.padEnd(22), (b / 1024).toFixed(0) + ' KB'); }

const meta = (P) => { try { return JSON.parse(readFileSync(path.join(SF, P.sf, 'meta.json'), 'utf8')); } catch (e) { return {}; } };
const loaded = [], report = [];
for (const P of PROPS) {
  P.src = P.ph || P.sf;
  const file = P.ph ? path.join(PH, 'models', P.ph, `${P.ph}_1k.gltf`) : path.join(SF, P.sf, 'model.glb');
  if (P.sf && meta(P).url) P.credit[2] = meta(P).url;
  P.file = await prepare(P, file);
  const { doc, before, after, modes } = await loadProp(P);
  if (P.deck) P.extra = { axis: 'z', deck: deckOf(doc, P.bounds.size[2]) };
  loaded.push({ P, doc });
  report.push(`${P.key.padEnd(14)} ${P.src.padEnd(20)} ${String(before).padStart(7)} -> ${String(after).padStart(5)} tris (${modes}) size ${P.bounds.size.map((x) => x.toFixed(2)).join(' x ')}${P.extra ? ' ' + JSON.stringify(P.extra) : ''}${P.note ? ' [' + P.note + ']' : ''}`);
}
const sfAuthors = [...new Set(PROPS.filter((P) => P.sf).map((P) => P.credit[1]))].join(', ');
const res = await writePack(loaded, OUT_GLB, {
  credit: `Act III environment: Poly Haven (polyhaven.com, CC0) and Sketchfab models by ${sfAuthors} (CC-BY 4.0). Decimated, re-centred and re-encoded (WebP) for Skotos; see src/assets/wood/CREDITS.txt.`,
  license: 'CC0 / CC-BY-4.0'
});
console.log(report.join('\n'));
console.log(`wood.glb ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures; layers ${(texBytes / 1024).toFixed(0)} KB`);

const ph = (id, by) => `${id} by ${by} - https://polyhaven.com/a/${id} (CC0)`;
writeFileSync(path.join(OUT_TEX, 'CREDITS.txt'), [
  'Skotos Act III environment assets (the Weeping Woods and the Heartwood).',
  'Packed by tools/pack-wood.mjs: resized, WebP-encoded, ambient occlusion baked into the diffuse layers (all but stonemoss',
  'also colour-graded); props decimated, re-centred and re-scaled, scanned ground patches and plants removed, the willow\'s',
  'leaves recoloured to autumn gold.',
  '', 'Tiling layers (src/assets/wood/*.webp) - Poly Haven (https://polyhaven.com), CC0 (public domain):',
  ...LAYERS.map((L) => `  ${L.id}: ${ph(L.src, L.by)}`),
  '', 'Props (src/assets/wood.glb):',
  ...PROPS.map((P) => (P.ph ? `  ${P.key}: ${ph(P.ph, P.by)}` : `  ${P.key}: "${P.credit[0]}" by ${P.credit[1]} - ${P.credit[2]} (CC-BY 4.0, https://creativecommons.org/licenses/by/4.0/)`)),
  ''
].join('\n'));
