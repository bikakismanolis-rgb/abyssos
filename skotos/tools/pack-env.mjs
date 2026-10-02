// Packs the photoreal environment set (Poly Haven, CC0) for the game:
//   src/assets/env/<id>_d.webp, <id>_n.webp   tiling ground / wall / stone layers (diffuse with AO baked in, OpenGL normal)
//   src/assets/env.glb                         props, one top-level node per prop, meshopt + quantized + WebP
// usage: node tools/pack-env.mjs [research/environment dir]
// Sources: https://polyhaven.com (all assets CC0). Downloaded by the asset research pass, see dl_log.json there.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, mergeDocuments, textureCompress, meshopt, unpartition, clearNodeTransform, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, statSync, readdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad/research/environment';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_TEX = path.join(ROOT, 'src/assets/env');
const OUT_GLB = path.join(ROOT, 'src/assets/env.glb');

// ---------- tiling layers ----------
// d: diffuse size, n: normal size, ao: how much of the ARM ambient occlusion is baked into the diffuse
const LAYERS = [
  { id: 'leaves', src: 'forest_leaves_02', d: 1024, n: 512, ao: 0.8 },       // forest floor (and the village green)
  { id: 'mud', src: 'brown_mud_leaves_01', d: 1024, n: 512, ao: 0.8 },       // damp earth under the trees, muddy yards
  { id: 'trail', src: 'rocky_trail', d: 1024, n: 512, ao: 0.7 },             // the forest trail
  { id: 'cobble', src: 'cobblestone_floor_04', d: 1024, n: 512, ao: 0.9 },   // town streets and plaza
  { id: 'flags', src: 'monastery_stone_floor', d: 1024, n: 512, ao: 0.8 },   // crypt rooms
  { id: 'mcobble', src: 'mossy_cobblestone', d: 1024, n: 512, ao: 0.8 },     // crypt passages
  { id: 'wall', src: 'mossy_stone_wall', d: 1024, n: 512, ao: 0.9 },         // crypt walls, barrow stones
  { id: 'blocks', src: 'medieval_blocks_03', d: 1024, n: 512, ao: 0.8 },     // pillars, plinths, well, beacon tower
  { id: 'bark', src: 'bark_brown_02', d: 512, n: 256, ao: 0.8 }              // tree trunks (detail only)
];

async function packLayer(L) {
  const dir = path.join(SRC, 'tex', L.src);
  const diff = await sharp(path.join(dir, `${L.src}_diff_1k.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const arm = await sharp(path.join(dir, `${L.src}_arm_1k.jpg`)).resize(diff.info.width, diff.info.height).removeAlpha().raw().toBuffer();
  const px = diff.data, ch = diff.info.channels;
  for (let i = 0, j = 0; i < px.length; i += ch, j += 3) {
    const k = 1 - L.ao * (1 - arm[j] / 255); // ARM: R = ambient occlusion
    px[i] = px[i] * k; px[i + 1] = px[i + 1] * k; px[i + 2] = px[i + 2] * k;
  }
  const dOut = path.join(OUT_TEX, `${L.id}_d.webp`), nOut = path.join(OUT_TEX, `${L.id}_n.webp`);
  await sharp(px, { raw: diff.info }).resize(L.d, L.d, { kernel: 'lanczos3' }).webp({ quality: 74, effort: 6 }).toFile(dOut);
  await sharp(path.join(dir, `${L.src}_nor_gl_1k.jpg`)).resize(L.n, L.n, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(nOut);
  return statSync(dOut).size + statSync(nOut).size;
}

// ---------- props ----------
// nodes: source node names to keep (default all); tris: triangle budget for the whole prop;
// d/n/orm: texture sizes; solid: closed mesh, draw single-sided; keepY: keep the source node's height offset.
const PROPS = [
  // forest
  { key: 'boulder', src: 'boulder_01', tris: 1600, err: 0.08, d: 512, n: 256, orm: 256, solid: true },
  { key: 'rockA', src: 'rock_moss_set_01', nodes: ['rock_moss_set_01_rock02'], tris: 1100, d: 1024, n: 512, orm: 256, solid: true },
  { key: 'rockB', src: 'rock_moss_set_01', nodes: ['rock_moss_set_01_rock04'], tris: 1100, d: 1024, n: 512, orm: 256, solid: true },
  { key: 'rockC', src: 'rock_moss_set_01', nodes: ['rock_moss_set_01_rock03'], tris: 900, d: 1024, n: 512, orm: 256, solid: true },
  { key: 'stoneA', src: 'rock_moss_set_02', nodes: ['rock_moss_set_02_rock08'], tris: 500, d: 512, n: 256, orm: 256, solid: true },
  { key: 'stoneB', src: 'rock_moss_set_02', nodes: ['rock_moss_set_02_rock12'], tris: 700, d: 512, n: 256, orm: 256, solid: true },
  { key: 'stoneC', src: 'rock_moss_set_02', nodes: ['rock_moss_set_02_rock10'], tris: 700, d: 512, n: 256, orm: 256, solid: true },
  { key: 'log', src: 'dead_tree_trunk', tris: 1000, d: 512, n: 256, orm: 256, solid: true },
  { key: 'stump', src: 'tree_stump_01', tris: 1200, d: 512, n: 256, orm: 256, solid: true },
  { key: 'fernA', src: 'fern_02', nodes: ['fern_02_b'], tris: 1000, d: 512, n: 256, orm: 256, alpha: true },
  { key: 'fernB', src: 'fern_02', nodes: ['fern_02_a'], tris: 700, d: 512, n: 256, orm: 256, alpha: true },
  { key: 'branches', src: 'dry_branches_medium_01', tris: 1200, d: 512, n: 256, orm: 256, solid: false, keepXZ: true },
  // town
  { key: 'barrel', src: 'wine_barrel_01', tris: 1400, err: 0.06, d: 512, n: 256, orm: 256, solid: true },
  { key: 'crate', src: 'wooden_crate_01', tris: 1000, err: 0.05, d: 512, n: 256, orm: 256, solid: true },
  { key: 'lantern', src: 'wooden_lantern_01', tris: 900, err: 0.06, d: 512, n: 256, orm: 256, solid: false },
  { key: 'bucket', src: 'wooden_bucket_01', tris: 800, err: 0.06, d: 512, n: 256, orm: 256, solid: false },
  { key: 'firepit', src: 'stone_fire_pit', tris: 2000, d: 512, n: 256, orm: 256, solid: true },
  // crypt
  { key: 'chest', src: 'treasure_chest', nodes: ['treasure_chest_bottom', 'treasure_chest_handle_left', 'treasure_chest_handle_right'], tris: 2200, err: 0.05, d: 512, n: 256, orm: 256, solid: true },
  // the lid is kept apart (pivot on the hinge) so the game can swing it open
  { key: 'chestLid', src: 'treasure_chest', nodes: ['treasure_chest_lid', 'treasure_chest_lock'], tris: 1400, err: 0.05, d: 512, n: 256, orm: 256, solid: true, pivot: [0, 0.437, -0.257] },
  { key: 'candlestick', src: 'wooden_candlestick', tris: 600, d: 512, n: 256, orm: 256, solid: true },
  { key: 'statue', src: 'gothic_statue', tris: 4000, d: 512, n: 256, orm: 256, solid: true }
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const triCount = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; return Math.round(t); };

// meshoptimizer simplification that keeps UV seams intact (no 'Permissive'): seams stay sharp, textures do not swim.
// Photogrammetry meshes are seam-heavy, so if the strict pass stalls far above budget a second pass may relax seams
// with high UV weights.
function simplifyPrim(p, ratio, err = 0.03) {
  const idx = p.getIndices(), pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), uv = p.getAttribute('TEXCOORD_0');
  const indices = new Uint32Array(idx.getArray()), positions = new Float32Array(pos.getArray());
  const n = pos.getCount(), attrs = new Float32Array(n * 5), v = [];
  for (let i = 0; i < n; i++) {
    if (nor) { nor.getElement(i, v); attrs[i * 5] = v[0]; attrs[i * 5 + 1] = v[1]; attrs[i * 5 + 2] = v[2]; }
    if (uv) { uv.getElement(i, v); attrs[i * 5 + 3] = v[0]; attrs[i * 5 + 4] = v[1]; }
  }
  const want = Math.max(36, Math.floor((indices.length * ratio) / 3) * 3);
  let [out] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attrs, 5, [0.4, 0.4, 0.4, 1.5, 1.5], null, want, 0.02, []);
  let mode = 'strict';
  if (out.length > want * 1.35) {
    [out] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attrs, 5, [0.4, 0.4, 0.4, 4, 4], null, want, err, ['Permissive']);
    mode = 'relaxed';
  }
  idx.setArray(new Uint32Array(out));
  compactPrimitive(p);
  return mode;
}

async function loadProp(P) {
  const doc = await io.read(path.join(SRC, 'models', P.src, `${P.src}_1k.gltf`));
  const root = doc.getRoot(), scene = root.getDefaultScene() || root.listScenes()[0];
  // keep only the wanted nodes, re-centred on x/z (sets lay their rocks out in a row)
  for (const node of scene.listChildren()) {
    if (P.nodes && !P.nodes.includes(node.getName())) { node.dispose(); continue; }
    const t = node.getTranslation();
    if (P.nodes && !P.keepXZ) node.setTranslation([0, t[1], 0]);
    if (P.pivot) node.setTranslation([t[0] - P.pivot[0], t[1] - P.pivot[1], t[2] - P.pivot[2]]);
    clearNodeTransform(node);
  }
  await doc.transform(prune(), dedup(), weld());
  const before = triCount(doc), ratio = Math.min(1, P.tris / before);
  const modes = new Set();
  if (ratio < 1) for (const m of root.listMeshes()) for (const p of m.listPrimitives()) modes.add(simplifyPrim(p, ratio, P.err));
  for (const mat of root.listMaterials()) {
    mat.setDoubleSided(!P.solid || !!P.alpha);
    // the ARM map also carries ambient occlusion in its red channel
    const mr = mat.getMetallicRoughnessTexture();
    if (mr && !mat.getOcclusionTexture() && /arm/i.test(mr.getURI())) mat.setOcclusionTexture(mr);
  }
  await doc.transform(
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColor/, resize: [P.d, P.d], quality: 80 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normal/, resize: [P.n, P.n], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion)/, resize: [P.orm, P.orm], quality: 82 })
  );
  return { doc, before, after: triCount(doc), modes: [...modes].join('+') || 'as-is' };
}

mkdirSync(OUT_TEX, { recursive: true });
for (const f of readdirSync(OUT_TEX)) if (f.endsWith('.webp')) rmSync(path.join(OUT_TEX, f));
let texBytes = 0;
for (const L of LAYERS) { const b = await packLayer(L); texBytes += b; console.log('layer', L.id.padEnd(8), L.src.padEnd(24), (b / 1024).toFixed(0) + ' KB'); }

await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const out = new Document();
out.createBuffer();
const scene = out.createScene('env');
const report = [];
for (const P of PROPS) {
  const { doc, before, after, modes } = await loadProp(P);
  const map = mergeDocuments(out, doc);
  const srcScene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  const holder = out.createNode(P.key);
  if (P.pivot) holder.setExtras({ pivot: P.pivot });
  for (const n of srcScene.listChildren()) holder.addChild(map.get(n));
  scene.addChild(holder);
  for (const s of out.getRoot().listScenes()) if (s !== scene) s.dispose();
  report.push(`${P.key.padEnd(11)} ${P.src.padEnd(24)} ${String(before).padStart(7)} -> ${String(after).padStart(5)} tris (${modes})`);
}
for (const b of out.getRoot().listBuffers().slice(1)) b.dispose();
for (const acc of out.getRoot().listAccessors()) acc.setBuffer(out.getRoot().listBuffers()[0]);
out.getRoot().setDefaultScene(scene);
scene.setExtras({
  credit: 'Environment props and textures: Poly Haven (polyhaven.com), CC0. Props by Rico Cilliers, Kless Gyzen, Rob Tuytel, ' +
    'James Ray Cock, Sebastian Platen, Josh Dean, Benny Weimer; textures by Rob Tuytel, Amal Kumar, Sơn Nguyễn. ' +
    'Decimated, re-centred and re-encoded (WebP) for Skotos.',
  license: 'CC0'
});
// dedup merges the textures shared by props cut from one set; prune runs after quantize, which orphans the float accessors
await out.transform(dedup(), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }), unpartition(), prune());
await io.write(OUT_GLB, out);
console.log(report.join('\n'));
const glbBytes = statSync(OUT_GLB).size;
console.log('textures', out.getRoot().listTextures().length, 'materials', out.getRoot().listMaterials().length, 'tris', triCount(out));
console.log(`env.glb ${(glbBytes / 1024).toFixed(0)} KB, layers ${(texBytes / 1024).toFixed(0)} KB, total ${((glbBytes + texBytes) / 1048576).toFixed(2)} MB`);
const log = existsSync(path.join(SRC, 'dl_log.json')) ? JSON.parse(readFileSync(path.join(SRC, 'dl_log.json'), 'utf8')) : {};
const by = (id) => (log[id]?.authors?.length ? ' by ' + log[id].authors.join(', ') : '');
writeFileSync(path.join(OUT_TEX, 'CREDITS.txt'), [
  'Skotos environment assets - all CC0 (public domain), from Poly Haven (https://polyhaven.com).',
  'Packed by tools/pack-env.mjs: resized, WebP-encoded, ambient occlusion baked into the diffuse layers; props decimated and re-centred.',
  '', 'Tiling layers (src/assets/env/*.webp):', ...LAYERS.map((L) => `  ${L.id}: ${L.src}${by(L.src)} - https://polyhaven.com/a/${L.src}`),
  '', 'Props (src/assets/env.glb):', ...PROPS.map((P) => `  ${P.key}: ${P.src}${by(P.src)} - https://polyhaven.com/a/${P.src}`), ''
].join('\n'));
