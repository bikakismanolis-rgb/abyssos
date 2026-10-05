// Packs the Act III environment set ('wood' pack), loaded when the hero first heads for the Weeping Woods:
//   src/assets/wood/<id>_d.webp, <id>_n.webp   tiling layers: golden leaf litter, deep moss, peat, root/bark walls,
//                                               mossy stone, dry fallen leaves (the First Autumn)
//   src/assets/wood.glb                         props: standing stones (geometry only, the game stones them in world space),
//                                               a giant root, the fallen trunk (the Fallen King), an old broken stump,
//                                               a gnarled root cluster, a shrub, an autumn bracken fern,
//                                               a mushroom cluster and a weeping willow
//   src/assets/wood/CREDITS.txt
// Layers and the stone/trunk props are Poly Haven (CC0); the root, stump, root cluster, shrub, fern, mushrooms and willow
// are Sketchfab (CC-BY 4.0), where Poly Haven has nothing that fits (its roots are flat ground scans, its stumps are earth
// mounds, its shrubs sparse saplings, no fungi, no willow).
// usage: node tools/pack-wood.mjs [polyhaven dir] [sketchfab models dir]   (ONLY=layers|props rebuilds one half)
//   polyhaven dir holds tex/<id>/<id>_{diff,nor_gl,arm}_<1k|2k>.jpg and models/<id>/<id>_1k.gltf (ph_dl.py; stonemoss
//   reads mossy_rock at 2k)
//   sketchfab dir holds <folder>/model.glb + meta.json (dl.py): w3_rootstump, w3_oakstump, w3_crazyroots, w3_rosewillow,
//   w3_bracken, w3_mushsan, w3_willow
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
// grade: { mul: [r, g, b], sat, gamma, contrast, mean: [r, g, b] } colour grade applied after the AO bake (the act's
// palette; a little lift on the darkest scans so they sit near the Act I and II layers' brightness). mean (sRGB 0-255)
// rescales each channel last so the layer's average colour lands on it; contrast stretches luminance about its mean.
// res: source resolution ('1k' unless given); nboost: normal map strength (xy scaled, z rebuilt);
// quilt: the tile rebuilt from soft-edged patches of the source (see quilt()) so no feature repeats tile after tile
const LAYERS = [
  // forest floor thick with fallen leaves, warmed from grey-brown towards gold
  { id: 'goldleaf', src: 'leaves_forest_ground', by: 'Dario Barresi, Dimitrios Savva', d: 1024, n: 512, ao: 0.7, grade: { mul: [1.08, 1.0, 0.8], sat: 1.2 } },
  // deep moss over dark soil: a mossy forest floor scan (moss cushions among old leaves and twigs, 3 m) graded to
  // green-black; the moss keeps its green, the leaf litter goes to dark brown, its cushions keep their relief
  { id: 'moss', src: 'forest_leaves_02', by: 'Rob Tuytel', d: 1024, n: 512, ao: 0.9, grade: { mul: [0.82, 1.0, 0.9], sat: 1.3, contrast: 1.35, mean: [44, 50, 26] }, nboost: 1.3 },
  // dark wet forest mud for paths and the mere shores
  { id: 'peat', src: 'mud_forest', by: 'eye-candy.xyz', d: 1024, n: 512, ao: 0.8, grade: { gamma: 0.85 } },
  // deeply furrowed willow bark: the Heartwood's root walls
  { id: 'rootwall', src: 'bark_willow', by: 'Dario Barresi, Dimitrios Savva', d: 1024, n: 512, ao: 0.9, grade: { mul: [1.05, 1, 0.92], gamma: 0.85 } },
  // lichen and moss over grey stone: the standing stones. The 3 m scan's dark cracks repeated tile after tile, so the
  // tile is rebuilt (2k source) from 36 soft-edged patches taken at random from it: one tile now holds 1.5 x 1.5 of the
  // scan's area (features at 2/3 of their old size in the game's 2.6 m projection) with no long crack running across it
  { id: 'stonemoss', src: 'mossy_rock', by: 'Rob Tuytel', res: '2k', d: 1024, n: 512, ao: 0.8, quilt: { k: 1.5, cells: 6, seed: 11, flat: 0.55 } },
  // the First Autumn: dry, dead leaves drifting over the floor (the ground shader lays them on with the season),
  // graded from red-brown to a dry, greyed brown
  { id: 'dryleaf', src: 'dry_decay_leaves', by: 'Amal Kumar', d: 1024, n: 512, ao: 0.75, grade: { sat: 0.72, contrast: 1.2, mean: [104, 84, 64] } }
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
  // the Fallen King: a gnarled dead trunk, length along z (source scale, ~4 m; the game scales it). The scan lay tilted
  // over a hump (one half ~0.24 m up, the other end sunk) with a broken branch 0.33 m into the ground: its underside is
  // levelled onto y = 0 along its whole length (level, see levelUnder) and whatever still reaches below y = -0.05 (the
  // branch) is flattened up to it (floor)
  { key: 'fallenTrunk', ph: 'dead_tree_trunk_02', by: 'Jenelle van Heerden, Rico Cilliers', pre: { rot: [0, 90, 0], level: { slice: 0.1, sigma: 0.25, drop: 0.08 } }, tris: 3000, err: 0.03, d: 1024, n: 512, orm: 256, solid: true, centre: true, deck: true, floor: -0.05 },
  // a stump with its great roots spread over the ground; the scanned ground patch is levelled and cut away, then every
  // loose piece under 3% of the triangles (the detached root/ground fragment on its side, decimation crumbs) dropped
  { key: 'giantRoot', sf: 'w3_rootstump', pre: { cut: { eps: 0.06, flat: 0.14, ring: 0.35, minTris: 3000, minH: 0.45 }, tris: 9000 }, tris: 2600, err: 0.03, d: 1024, n: 512, orm: 256, solid: false, loose: 0.03,
    credit: ['Tree Stump with big Roots [Free]', 'RodoxDE', 'https://sketchfab.com/3d-models/tree-stump-with-big-roots-free-bd60213e01574f94a715d01936f4ee82', 'CC-BY-4.0'] },
  // a tall, broken old oak stump (without the moss, plants and ground skirt of the scan), 1.3 m
  { key: 'stumpOld', sf: 'w3_oakstump', pre: { keep: /^parez_obora/, cut: { eps: 0.05, flat: 0.08, ring: 0.15, minTris: 1500 }, tris: 9000 }, tris: 2800, err: 0.03, d: 1024, n: 512, orm: 256, solid: false, height: 1.3, loose: 0.03,
    credit: ['Old Oak Stump Obora', '3dhdscan', 'https://sketchfab.com/3d-models/old-oak-stump-obora-5f5bb2305d534283be08f534ece9c9db', 'CC-BY-4.0'] },
  // a gnarled root cluster: an uprooted root plate lying on its side, its bare, bone-pale roots reaching up like fingers
  // (1.6 m tall, ~2 m across; its lowest few centimetres sunk so it sits in the litter)
  { key: 'rootCluster', sf: 'w3_crazyroots', tris: 3000, err: 0.03, d: 1024, n: 512, orm: 256, solid: false, ground: true, centre: true, height: 1.6, loose: 0.03, sink: 0.05,
    credit: ['Crazy Tree Roots Scan', 'evan4129 (EFX)', 'https://sketchfab.com/3d-models/crazy-tree-roots-scan-be10284b4c6e426a914bf10ba6641a08', 'CC-BY-4.0'] },
  // a willow-leaved shrub (Salix elaeagnos, a rosemary willow), 1.4 m: leaf cards kept (alpha-tested), bark and twigs
  // decimated, the grey-green leaves turned autumn yellow to sit with the willows
  { key: 'shrub', sf: 'w3_rosewillow', pre: { mask: true }, tris: 3600, err: 0.03, d: 512, n: 256, orm: 128, solid: false, keepCards: true, ground: true, centre: true, height: 1.4,
    async prep(doc) { await autumn(doc, { hue: 54, keep: 0.25, sat: 0.85, gamma: 0.72, gain: 1.1 }); foliageNormals(doc, { up: 0.5, at: 0.45, face: 0.8 }); },
    credit: ['Realistic HD Rosemary willow (63/99)', 'PlantCatalog', 'https://sketchfab.com/3d-models/realistic-hd-rosemary-willow-6399-6d25c2941dae4065b9476f0705b4f0d3', 'CC-BY-4.0'] },
  // bracken turned for the First Autumn (the env pack's ferns stay summer green): fronds out of their pot, recoloured to
  // rust and copper, 0.9 m; the drooping frond tips go a few centimetres into the ground
  { key: 'fern', sf: 'w3_bracken', pre: { keep: /^plant/, mask: true }, tris: 1100, err: 0.03, d: 512, n: 256, orm: 128, solid: false, keepCards: true, ground: true, centre: true, height: 0.9, sink: 0.055,
    async prep(doc) { await autumn(doc, { hue: 30, keep: 0.2, sat: 1.0, gamma: 0.95, gain: 1.0 }); foliageNormals(doc, { up: 0.8, at: 0.2, face: 1.5 }); twoFaced(doc); for (const m of doc.getRoot().listMaterials()) m.setMetallicFactor(0); },
    credit: ['Bracken Fern Low Poly', 'Marcin.Kwiatkowski', 'https://sketchfab.com/3d-models/bracken-fern-low-poly-b64381d3ea9547b88581f98178800627', 'CC-BY-4.0'] },
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
  if (!L.grade && !L.quilt && !L.nboost && !L.res) return packLayer(L, srcDir, outDir);
  const dir = path.join(srcDir, L.src), res = L.res || '1k';
  const diff = await sharp(path.join(dir, `${L.src}_diff_${res}.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let W = diff.info.width;
  const arm = await sharp(path.join(dir, `${L.src}_arm_${res}.jpg`)).resize(W, W).removeAlpha().raw().toBuffer();
  const nrm = await sharp(path.join(dir, `${L.src}_nor_gl_${res}.jpg`)).resize(W, W).removeAlpha().raw().toBuffer();
  // float RGB (0..1), the AO factor per pixel and the normal map as unit vectors; the AO goes in with the grade (after
  // its gamma, as before), or straight away when there is no grade or the tile is quilted from the source
  let col = new Float64Array(W * W * 3), nor = new Float32Array(W * W * 3), ao = new Float64Array(W * W);
  for (let p = 0, i = 0; p < W * W; p++, i += diff.info.channels) {
    ao[p] = 1 - L.ao * (1 - arm[p * 3] / 255);
    for (let q = 0; q < 3; q++) { col[p * 3 + q] = diff.data[i + q] / 255; nor[p * 3 + q] = (nrm[p * 3 + q] / 255) * 2 - 1; }
  }
  if (!L.grade || L.quilt) { for (let p = 0; p < W * W; p++) for (let q = 0; q < 3; q++) col[p * 3 + q] *= ao[p]; ao = null; }
  if (L.quilt) {
    // the source resampled so that the quilted tile holds k x k of its area, then rebuilt patch by patch
    const out = W, S = Math.round(W / L.quilt.k);
    col = await resampleF(col, W, S); nor = await resampleF(nor, W, S, true);
    ({ col, nor } = quilt(col, nor, S, out, L.quilt));
    W = out;
  }
  if (L.grade) grade(col, L.grade, ao);
  if (L.nboost) for (let p = 0; p < nor.length; p += 3) {
    const x = nor[p] * L.nboost, y = nor[p + 1] * L.nboost, l = Math.min(0.999, Math.hypot(x, y)), s = l / Math.max(1e-6, Math.hypot(x, y));
    nor[p] = x * s; nor[p + 1] = y * s; nor[p + 2] = Math.sqrt(1 - l * l);
  }
  // colours truncate to bytes (as this packer always has: unchanged layers rebuild byte for byte), normals round
  const toU8 = (f, n) => { const u = Buffer.alloc(f.length); for (let i = 0; i < f.length; i++) u[i] = Math.max(0, Math.min(255, n ? Math.round((f[i] * 0.5 + 0.5) * 255) : Math.floor(f[i] * 255))); return u; };
  const raw = { raw: { width: W, height: W, channels: 3 } };
  const dOut = path.join(outDir, `${L.id}_d.webp`), nOut = path.join(outDir, `${L.id}_n.webp`);
  await sharp(toU8(col), raw).resize(L.d, L.d, { kernel: 'lanczos3' }).webp({ quality: 74, effort: 6 }).toFile(dOut);
  await sharp(toU8(nor, true), raw).resize(L.n, L.n, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(nOut);
  return statSync(dOut).size + statSync(nOut).size;
}
// a float RGB image (W x W) resized to S x S (normals renormalised)
async function resampleF(f, W, S, isNormal = false) {
  const u = Buffer.alloc(f.length);
  for (let i = 0; i < f.length; i++) u[i] = Math.max(0, Math.min(255, Math.round(isNormal ? (f[i] * 0.5 + 0.5) * 255 : f[i] * 255)));
  const r = await sharp(u, { raw: { width: W, height: W, channels: 3 } }).resize(S, S, { kernel: 'lanczos3' }).raw().toBuffer();
  const o = new Float32Array(S * S * 3);
  for (let i = 0; i < o.length; i++) o[i] = isNormal ? (r[i] / 255) * 2 - 1 : r[i] / 255;
  if (isNormal) for (let p = 0; p < o.length; p += 3) { const l = Math.hypot(o[p], o[p + 1], o[p + 2]) || 1; o[p] /= l; o[p + 1] /= l; o[p + 2] /= l; }
  return o;
}
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
// colour grade in place (see LAYERS)
function grade(col, { mul = [1, 1, 1], sat = 1, gamma = 1, contrast = 1, mean = null }, ao = null) {
  const n = col.length / 3;
  let lm = 0;
  for (let p = 0; p < col.length; p += 3) {
    for (let q = 0; q < 3; q++) col[p + q] = Math.pow(col[p + q], gamma) * mul[q] * (ao ? ao[p / 3] : 1);
    lm += luma(col[p], col[p + 1], col[p + 2]);
  }
  lm /= n;
  const avg = [0, 0, 0];
  for (let p = 0; p < col.length; p += 3) {
    const l = luma(col[p], col[p + 1], col[p + 2]), l2 = contrast === 1 ? l : Math.max(0, lm + (l - lm) * contrast), k = contrast === 1 ? 1 : l > 1e-5 ? l2 / l : 0;
    for (let q = 0; q < 3; q++) col[p + q] = Math.max(0, l2 + (col[p + q] * k - l2) * sat);
    for (let q = 0; q < 3; q++) avg[q] += col[p + q] / n;
  }
  if (mean) for (let p = 0; p < col.length; p += 3) for (let q = 0; q < 3; q++) col[p + q] = Math.min(1, col[p + q] * (mean[q] / 255 / avg[q]));
}
// Rebuilds a seamless tile (out x out) from a seamless source (S x S): a jittered grid of cells x cells patches, each
// copied 1:1 from a random spot of the source (and turned half the time by 180 degrees, which keeps the stone's grain
// direction), blended with narrow soft seams. The blend preserves contrast: mean + sum(w (x - mean)) / sqrt(sum(w^2)).
// flat: the tile's large-scale brightness blotches divided out by this much, so no light or dark patch marks the period.
function quilt(src, srcN, S, out, { cells = 6, seed = 1, sharp: pw = 6, jitter = 0.32, flat = 0 }) {
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const c = out / cells, P = [];
  // each patch reads a different region of the source than its neighbours (a 4 x 4 grid of regions, no repeats in a 3 x 3 block)
  const R = 4, region = [];
  for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++) {
    let r, tries = 0;
    do { r = Math.floor(rnd() * R * R); tries++; } while (tries < 50 && [[-1, -1], [0, -1], [1, -1], [-1, 0]].some(([dx, dy]) => region[((gy + dy + cells) % cells) * cells + ((gx + dx + cells) % cells)] === r));
    region[gy * cells + gx] = r;
    P.push({
      x: Math.round((gx + 0.5 + (rnd() - 0.5) * 2 * jitter) * c), y: Math.round((gy + 0.5 + (rnd() - 0.5) * 2 * jitter) * c),
      ox: Math.round(((r % R) + 0.2 + rnd() * 0.6) * (S / R)), oy: Math.round((Math.floor(r / R) + 0.2 + rnd() * 0.6) * (S / R)), turn: rnd() < 0.5
    });
  }
  const mean = [0, 0, 0];
  for (let p = 0; p < src.length; p += 3) for (let q = 0; q < 3; q++) mean[q] += src[p + q] / (S * S);
  const col = new Float32Array(out * out * 3), nor = new Float32Array(out * out * 3);
  const sig2 = 2 * (0.5 * c) ** 2, wrap = (d) => (d > out / 2 ? d - out : d < -out / 2 ? d + out : d), mod = (a, m) => ((a % m) + m) % m;
  const w = new Float64Array(9), si = new Int32Array(9), tn = new Int8Array(9);
  for (let y = 0; y < out; y++) for (let x = 0; x < out; x++) {
    const gx = Math.floor(x / c), gy = Math.floor(y / c);
    let n = 0, sw = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const p = P[mod(gy + dy, cells) * cells + mod(gx + dx, cells)];
      const u = wrap(x - p.x), v = wrap(y - p.y);
      w[n] = Math.exp((-pw * (u * u + v * v)) / sig2); sw += w[n];
      const sx = mod(p.ox + (p.turn ? -u : u), S), sy = mod(p.oy + (p.turn ? -v : v), S);
      si[n] = (sy * S + sx) * 3; tn[n] = p.turn ? -1 : 1; n++;
    }
    let s2 = 0; for (let k = 0; k < n; k++) { w[k] /= sw; s2 += w[k] * w[k]; }
    const norm = 1 / Math.sqrt(s2), o = (y * out + x) * 3;
    let cr = 0, cg = 0, cb = 0, nx = 0, ny = 0;
    for (let k = 0; k < n; k++) {
      const i = si[k], a = w[k];
      cr += a * (src[i] - mean[0]); cg += a * (src[i + 1] - mean[1]); cb += a * (src[i + 2] - mean[2]);
      nx += a * srcN[i] * tn[k]; ny += a * srcN[i + 1] * tn[k];
    }
    col[o] = mean[0] + cr * norm; col[o + 1] = mean[1] + cg * norm; col[o + 2] = mean[2] + cb * norm;
    nx *= norm; ny *= norm; const l = Math.hypot(nx, ny); if (l > 0.95) { nx *= 0.95 / l; ny *= 0.95 / l; }
    nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = Math.sqrt(1 - nx * nx - ny * ny);
  }
  if (flat) {
    // large-scale luminance (wrapped box blur x3 ~ gaussian, radius out / 14) divided out
    let L = new Float32Array(out * out); for (let p = 0; p < L.length; p++) L[p] = luma(col[p * 3], col[p * 3 + 1], col[p * 3 + 2]);
    const lm = L.reduce((a, b) => a + b, 0) / L.length, r = Math.round(out / 14);
    for (let pass = 0; pass < 3; pass++) L = boxBlur(boxBlur(L, out, r, 1), out, r, out);
    for (let p = 0; p < L.length; p++) { const k = Math.pow(lm / Math.max(1e-4, L[p]), flat); for (let q = 0; q < 3; q++) col[p * 3 + q] = Math.min(1, col[p * 3 + q] * k); }
    // and the normals' large-scale tilt (patches leaning one way would light as soft blotches)
    for (const q of [0, 1]) {
      let t = new Float32Array(out * out); for (let p = 0; p < t.length; p++) t[p] = nor[p * 3 + q];
      for (let pass = 0; pass < 3; pass++) t = boxBlur(boxBlur(t, out, r, 1), out, r, out);
      for (let p = 0; p < t.length; p++) nor[p * 3 + q] -= t[p];
    }
    for (let p = 0; p < nor.length; p += 3) { let x = nor[p], y = nor[p + 1]; const l = Math.hypot(x, y); if (l > 0.95) { x *= 0.95 / l; y *= 0.95 / l; } nor[p] = x; nor[p + 1] = y; nor[p + 2] = Math.sqrt(1 - x * x - y * y); }
  }
  return { col, nor };
}
// one pass of a wrapped box blur along rows (step 1) or columns (step = width)
function boxBlur(a, W, r, step) {
  const o = new Float32Array(a.length), n = 2 * r + 1;
  for (let line = 0; line < W; line++) {
    const base = step === 1 ? line * W : line, at = (i) => a[base + (((i % W) + W) % W) * step];
    let s = 0; for (let i = -r; i <= r; i++) s += at(i);
    for (let i = 0; i < W; i++) { o[base + i * step] = s / n; s += at(i + r + 1) - at(i - r); }
  }
  return o;
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

// Lays a log flat: its underside (the low end of each slice along z, the branch-like dips more than `drop` below their
// neighbours ignored) is smoothed (gaussian, sigma in metres) and every vertex sheared down by it (y' = y - f(z)), so the
// trunk lies along y = 0 instead of resting tilted over a hump; normals follow the shear.
function levelUnder(doc, { slice = 0.1, sigma = 0.25, drop = 0.08 }) {
  let z0 = 1e9, z1 = -1e9; eachVertex(doc, (p) => { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
  const n = Math.ceil((z1 - z0) / slice) + 1, lo = new Array(n).fill(1e9);
  eachVertex(doc, (p) => { const k = Math.round((p.z - z0) / slice); lo[k] = Math.min(lo[k], p.y); });
  const ok = lo.map((y, k) => {
    if (y > 1e8) return false;
    const nb = []; for (let d = -3; d <= 3; d++) if (d && lo[k + d] !== undefined && lo[k + d] < 1e8) nb.push(lo[k + d]);
    nb.sort((a, b) => a - b);
    return !nb.length || y > nb[Math.floor(nb.length / 2)] - drop;
  });
  const s = sigma / slice, f = lo.map((_, k) => {
    let a = 0, w = 0;
    for (let j = 0; j < n; j++) if (ok[j]) { const g = Math.exp(-((j - k) ** 2) / (2 * s * s)); a += g * lo[j]; w += g; }
    return a / w;
  });
  const at = (z) => { const t = Math.max(0, Math.min(n - 1, (z - z0) / slice)), k = Math.min(n - 2, Math.floor(t)); return f[k] + (f[k + 1] - f[k]) * (t - k); };
  const slope = (z) => (at(z + slice / 2) - at(z - slice / 2)) / slice;
  eachVertex(doc, (p, nm) => { if (nm) nm.z += slope(p.z) * nm.y; p.y -= at(p.z); });
  return `underside levelled: shifted ${Math.min(...f).toFixed(2)}..${Math.max(...f).toFixed(2)} m along z, ${ok.filter((x) => !x).length} branch slices ignored`;
}

// Drops every connected piece (triangles joined through shared positions, across primitives) smaller than `frac` of
// the prop's triangles. Returns how many triangles went.
function dropLoose(doc, frac) {
  const parent = new Map(), find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  const v = [], key = (a, i) => { a.getElement(i, v); return `${Math.round(v[0] * 2000)},${Math.round(v[1] * 2000)},${Math.round(v[2] * 2000)}`; };
  const per = [];
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray(), ks = [];
    for (let i = 0; i < a.getCount(); i++) { const k = key(a, i); ks.push(k); if (!parent.has(k)) parent.set(k, k); }
    for (let t = 0; t < idx.length; t += 3) { const r = find(ks[idx[t]]); parent.set(find(ks[idx[t + 1]]), r); parent.set(find(ks[idx[t + 2]]), find(r)); }
    per.push({ prim, idx, ks });
  }
  const size = new Map(); let total = 0;
  for (const { idx, ks } of per) for (let t = 0; t < idx.length; t += 3) { const r = find(ks[idx[t]]); size.set(r, (size.get(r) || 0) + 1); total++; }
  let dropped = 0;
  for (const { prim, idx, ks } of per) {
    const out = [];
    for (let t = 0; t < idx.length; t += 3) if (size.get(find(ks[idx[t]])) >= frac * total) out.push(idx[t], idx[t + 1], idx[t + 2]); else dropped++;
    if (out.length === idx.length) continue;
    if (!out.length) { prim.dispose(); continue; }
    prim.getIndices().setArray(new Uint32Array(out));
    compactPrimitive(prim);
  }
  return { dropped, pieces: [...size.values()].filter((x) => x < frac * total).length };
}

// After loadProp has decimated and fitted a prop (runs as the last step of its prep): loose pieces dropped (P.loose),
// everything below P.floor flattened up to it, the prop sunk by P.sink metres; when any of these ran, the prop is
// re-centred on x/z (if it was centred) and its bounds measured again.
function finish(doc, P) {
  const notes = [];
  if (!P.loose && P.floor === undefined && !P.sink) return;
  if (P.loose) { const r = dropLoose(doc, P.loose); notes.push(`${r.pieces} loose pieces (${r.dropped} tris) under ${P.loose * 100}% dropped`); }
  if (P.floor !== undefined) { let k = 0; eachVertex(doc, (p) => { if (p.y < P.floor) { p.y = P.floor; k++; } }); notes.push(`${k} vertices below y = ${P.floor} flattened up to it`); }
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  eachVertex(doc, (p) => p.toArray().forEach((x, k) => { lo[k] = Math.min(lo[k], x); hi[k] = Math.max(hi[k], x); }));
  const cx = P.centre || P.pre?.cut ? (lo[0] + hi[0]) / 2 : 0, cz = P.centre || P.pre?.cut ? (lo[2] + hi[2]) / 2 : 0, dy = P.sink || 0;
  if (cx || cz || dy) eachVertex(doc, (p) => { p.x -= cx; p.z -= cz; p.y -= dy; });
  if (dy) notes.push(`sunk ${dy} m`);
  P.bounds = { size: hi.map((x, k) => x - lo[k]) };
  P.note = [P.note, ...notes].filter(Boolean).join('; ');
}

async function prepare(P, file) {
  if (!P.pre) return file;
  const doc = await io.read(file);
  await bake(doc);
  if (P.pre.keep) for (const n of doc.getRoot().listNodes()) if (n.getMesh() && !P.pre.keep.test(n.getName())) n.setMesh(null);
  await doc.transform(prune());
  if (P.pre.rot) rotate(doc, P.pre.rot);
  // alpha-blended leaf cards become alpha-tested (MASK) here, so loadProp's keepCards spares them from decimation
  if (P.pre.mask) for (const m of doc.getRoot().listMaterials()) if (m.getAlphaMode() === 'BLEND') m.setAlphaMode('MASK').setAlphaCutoff(0.45);
  if (P.pre.level) P.note = levelUnder(doc, P.pre.level);
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
// face: cards wound towards (outwards + face * up) instead of straight outwards; low plants seen from the game's high
// camera use it so the leaves it looks down on are front faces (a back face would light with its normal flipped).
function foliageNormals(doc, { up = 0.35, at = 0.62, face = 0 } = {}) {
  const prims = primsOf(doc).filter((p) => p.getMaterial()?.getAlphaMode() === 'MASK');
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9), v = new THREE.Vector3(), e = [];
  for (const p of prims) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { v.fromArray(a.getElement(i, e)); lo.min(v); hi.max(v); } }
  const c = new THREE.Vector3((lo.x + hi.x) / 2, lo.y + (hi.y - lo.y) * at, (lo.z + hi.z) / 2);
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), fn = new THREE.Vector3(), mid = new THREE.Vector3();
  for (const p of prims) {
    const a = p.getAttribute('POSITION'), nrm = p.getAttribute('NORMAL'), ix = p.getIndices(), idx = ix.getArray().slice();
    for (let t = 0; t < idx.length; t += 3) {
      p0.fromArray(a.getElement(idx[t], e)); p1.fromArray(a.getElement(idx[t + 1], e)); p2.fromArray(a.getElement(idx[t + 2], e));
      mid.copy(p0).add(p1).add(p2).divideScalar(3).sub(c).normalize(); mid.y += face;
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

// Upright fronds stand edge-on to the plant's centre, so no winding makes them all face the camera, and a double-sided
// back face lights with its normal flipped (black fronds). Each card gets a second, reversed face sharing its vertices
// (the same soft canopy normal on both sides) and the material turns single-sided.
function twoFaced(doc) {
  for (const p of primsOf(doc).filter((q) => q.getMaterial()?.getAlphaMode() === 'MASK')) {
    const ix = p.getIndices(), a = ix.getArray(), b = new Uint32Array(a.length * 2);
    b.set(a); for (let t = 0; t < a.length; t += 3) { b[a.length + t] = a[t]; b[a.length + t + 1] = a[t + 2]; b[a.length + t + 2] = a[t + 1]; }
    ix.setArray(b); p.getMaterial().setDoubleSided(false);
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
// ONLY=layers or ONLY=props rebuilds just that half (quicker iteration); CREDITS.txt is always rewritten
const ONLY = process.env.ONLY || '';
await MeshoptSimplifier.ready;
mkdirSync(OUT_TEX, { recursive: true });
let texBytes = 0;
if (ONLY !== 'props') {
  for (const f of readdirSync(OUT_TEX)) if (f.endsWith('.webp')) rmSync(path.join(OUT_TEX, f));
  for (const L of LAYERS) { const b = await packWoodLayer(L, path.join(PH, 'tex'), OUT_TEX); texBytes += b; console.log('layer', L.id.padEnd(10), L.src.padEnd(22), (b / 1024).toFixed(0) + ' KB'); }
}

const meta = (P) => { try { return JSON.parse(readFileSync(path.join(SF, P.sf, 'meta.json'), 'utf8')); } catch (e) { return {}; } };
const loaded = [], report = [];
for (const P of ONLY === 'layers' ? [] : PROPS) {
  P.src = P.ph || P.sf;
  const file = P.ph ? path.join(PH, 'models', P.ph, `${P.ph}_1k.gltf`) : path.join(SF, P.sf, 'model.glb');
  if (P.sf && meta(P).url) P.credit[2] = meta(P).url;
  P.file = await prepare(P, file);
  const own = P.prep; P.prep = async (doc) => { if (own) await own.call(P, doc); finish(doc, P); };
  const { doc, before, after, modes } = await loadProp(P);
  if (P.deck) P.extra = { axis: 'z', deck: deckOf(doc, P.bounds.size[2]) };
  loaded.push({ P, doc });
  report.push(`${P.key.padEnd(14)} ${P.src.padEnd(20)} ${String(before).padStart(7)} -> ${String(after).padStart(5)} tris (${modes}) size ${P.bounds.size.map((x) => x.toFixed(2)).join(' x ')}${P.extra ? ' ' + JSON.stringify(P.extra) : ''}${P.note ? ' [' + P.note + ']' : ''}`);
}
const sfAuthors = [...new Set(PROPS.filter((P) => P.sf).map((P) => P.credit[1]))].join(', ');
const res = ONLY === 'layers' ? { bytes: statSync(OUT_GLB).size, tris: '-', textures: '-' } : await writePack(loaded, OUT_GLB, {
  credit: `Act III environment: Poly Haven (polyhaven.com, CC0) and Sketchfab models by ${sfAuthors} (CC-BY 4.0). Decimated, re-centred and re-encoded (WebP) for Skotos; see src/assets/wood/CREDITS.txt.`,
  license: 'CC0 / CC-BY-4.0'
});
console.log(report.join('\n'));
console.log(`wood.glb ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures; layers ${(texBytes / 1024).toFixed(0)} KB`);

const ph = (id, by) => `${id} by ${by} - https://polyhaven.com/a/${id} (CC0)`;
writeFileSync(path.join(OUT_TEX, 'CREDITS.txt'), [
  'Skotos Act III environment assets (the Weeping Woods and the Heartwood).',
  'Packed by tools/pack-wood.mjs: resized, WebP-encoded, ambient occlusion baked into the diffuse layers (all but stonemoss',
  'also colour-graded; stonemoss re-tiled from random patches of its source so its features do not repeat); props',
  'decimated, re-centred and re-scaled, scanned ground patches, loose fragments and plants removed, the fallen trunk',
  'levelled, the willow\'s, shrub\'s and fern\'s leaves recoloured to autumn (the fern taken out of its pot).',
  '', 'Tiling layers (src/assets/wood/*.webp) - Poly Haven (https://polyhaven.com), CC0 (public domain):',
  ...LAYERS.map((L) => `  ${L.id}: ${ph(L.src, L.by)}`),
  '', 'Props (src/assets/wood.glb):',
  ...PROPS.map((P) => (P.ph ? `  ${P.key}: ${ph(P.ph, P.by)}` : `  ${P.key}: "${P.credit[0]}" by ${P.credit[1]} - ${P.credit[2]} (CC-BY 4.0, https://creativecommons.org/licenses/by/4.0/)`)),
  ''
].join('\n'));
