// Shared steps for the environment packers (pack-deep.mjs, pack-trees.mjs): tiling layers with baked AO,
// decimated props with WebP textures, and the final meshopt/quantize write.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, mergeDocuments, textureCompress, meshopt, unpartition, clearNodeTransform, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';
import path from 'node:path';

export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
export const triCount = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3; return Math.round(t); };

// L: { id, src, d, n, ao, dir } -> <out>/<id>_d.webp (AO baked into the colour) and <id>_n.webp (OpenGL normal)
export async function packLayer(L, srcDir, outDir) {
  const dir = path.join(srcDir, L.src);
  const diff = await sharp(path.join(dir, `${L.src}_diff_1k.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const arm = await sharp(path.join(dir, `${L.src}_arm_1k.jpg`)).resize(diff.info.width, diff.info.height).removeAlpha().raw().toBuffer();
  const px = diff.data, ch = diff.info.channels;
  for (let i = 0, j = 0; i < px.length; i += ch, j += 3) {
    const k = 1 - L.ao * (1 - arm[j] / 255);
    px[i] = px[i] * k; px[i + 1] = px[i + 1] * k; px[i + 2] = px[i + 2] * k;
  }
  const dOut = path.join(outDir, `${L.id}_d.webp`), nOut = path.join(outDir, `${L.id}_n.webp`);
  await sharp(px, { raw: diff.info }).resize(L.d, L.d, { kernel: 'lanczos3' }).webp({ quality: 74, effort: 6 }).toFile(dOut);
  await sharp(path.join(dir, `${L.src}_nor_gl_1k.jpg`)).resize(L.n, L.n, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(nOut);
  return statSync(dOut).size + statSync(nOut).size;
}

// meshoptimizer simplification that keeps UV seams (strict first, relaxed if it stalls far above the budget)
export function simplifyPrim(p, ratio, err = 0.03, keepUV = true) {
  const idx = p.getIndices(), pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), uv = p.getAttribute('TEXCOORD_0');
  const indices = new Uint32Array(idx.getArray()), positions = new Float32Array(pos.getArray());
  const n = pos.getCount(), attrs = new Float32Array(n * 5), v = [];
  for (let i = 0; i < n; i++) {
    if (nor) { nor.getElement(i, v); attrs[i * 5] = v[0]; attrs[i * 5 + 1] = v[1]; attrs[i * 5 + 2] = v[2]; }
    if (uv && keepUV) { uv.getElement(i, v); attrs[i * 5 + 3] = v[0]; attrs[i * 5 + 4] = v[1]; }
  }
  const want = Math.min(indices.length, Math.max(36, Math.floor((indices.length * ratio) / 3) * 3));
  const w = keepUV ? [0.4, 0.4, 0.4, 1.5, 1.5] : [0.6, 0.6, 0.6, 0, 0];
  let [out] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attrs, 5, w, null, want, 0.02, []);
  let mode = 'strict';
  if (out.length > want * 1.35) {
    [out] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attrs, 5, keepUV ? [0.4, 0.4, 0.4, 4, 4] : w, null, want, err, ['Permissive']);
    mode = 'relaxed';
  }
  if (out.length > want * 1.5) { [out] = MeshoptSimplifier.simplify(indices, positions, 3, want, err * 3, ['Permissive', 'LockBorder']); mode = 'coarse'; }
  idx.setArray(new Uint32Array(out));
  compactPrimitive(p);
  return mode;
}

// P: { key, src, file?, nodes?, tris, err?, d, n, orm, solid, alpha, geo (geometry only: textures and UVs dropped),
//      pivot?, keepXZ?, ground? (feet on y = 0), height? (uniform scale to this height), centre? }
export async function loadProp(P, srcDir) {
  const doc = await io.read(P.file || path.join(srcDir, P.src, `${P.src}_1k.gltf`));
  const root = doc.getRoot(), scene = root.getDefaultScene() || root.listScenes()[0];
  for (const node of scene.listChildren()) {
    if (P.nodes && !P.nodes.includes(node.getName())) { node.dispose(); continue; }
    const t = node.getTranslation();
    if (P.nodes && !P.keepXZ) node.setTranslation([0, t[1], 0]);
    if (P.pivot) node.setTranslation([t[0] - P.pivot[0], t[1] - P.pivot[1], t[2] - P.pivot[2]]);
  }
  // bake every transform into the vertices so bounds can be measured and fixed in model space
  const bake = (n) => { clearNodeTransform(n); for (const c of n.listChildren()) bake(c); };
  for (const node of scene.listChildren()) bake(node);
  await doc.transform(prune(), dedup(), weld());
  if (P.geo) for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    for (const s of p.listSemantics()) if (s !== 'POSITION' && s !== 'NORMAL') p.setAttribute(s, null);
    p.setMaterial(null);
  }
  // P.keepCards: leave alpha-tested foliage cards alone and spend the budget on the solid parts
  const prims = []; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if (!(P.keepCards && p.getMaterial()?.getAlphaMode() === 'MASK')) prims.push(p);
  const triOf = (p) => (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
  const before = triCount(doc), solid = prims.reduce((a, p) => a + triOf(p), 0), cards = before - solid;
  const ratio = Math.min(1, Math.max(0.02, (P.tris - cards) / Math.max(1, solid)));
  const modes = new Set();
  if (ratio < 1) for (const p of prims) modes.add(simplifyPrim(p, ratio, P.err, !P.geo));
  if (P.ground || P.height || P.centre) fitBounds(doc, P);
  if (P.geo) {
    const mat = doc.createMaterial(P.geo === true ? 'rock' : P.geo).setDoubleSided(false);
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) p.setMaterial(mat);
  }
  for (const mat of root.listMaterials()) {
    mat.setDoubleSided(!P.solid || !!P.alpha);
    const mr = mat.getMetallicRoughnessTexture();
    if (mr && !mat.getOcclusionTexture() && /arm/i.test(mr.getURI() || '')) mat.setOcclusionTexture(mr);
    if (P.alpha) mat.setAlphaMode('MASK').setAlphaCutoff(0.45);
  }
  await doc.transform(
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColor/, resize: [P.d || 512, P.d || 512], quality: 80 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normal/, resize: [P.n || 256, P.n || 256], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(metallicRoughness|occlusion)/, resize: [P.orm || 256, P.orm || 256], quality: 82 })
  );
  return { doc, before, after: triCount(doc), modes: [...modes].join('+') || 'as-is' };
}

// translate (and optionally scale) all vertices: feet on y = 0, centred on x/z, height P.height
function fitBounds(doc, P) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], v = [];
  const prims = []; for (const m of doc.getRoot().listMeshes()) prims.push(...m.listPrimitives());
  const seen = new Set();
  for (const p of prims) { const a = p.getAttribute('POSITION'); if (seen.has(a)) continue; seen.add(a); for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); } } }
  const s = P.height ? P.height / (hi[1] - lo[1]) : 1;
  const off = [P.centre ? -(lo[0] + hi[0]) / 2 : 0, P.ground ? -lo[1] : 0, P.centre ? -(lo[2] + hi[2]) / 2 : 0];
  for (const a of seen) for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); a.setElement(i, [(v[0] + off[0]) * s, (v[1] + off[1]) * s, (v[2] + off[2]) * s]); }
  P.bounds = { size: [(hi[0] - lo[0]) * s, (hi[1] - lo[1]) * s, (hi[2] - lo[2]) * s] };
}

// merges the props into one GLB (one top-level node per prop) and writes it
export async function writePack(props, outGlb, extras) {
  await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
  const out = new Document();
  out.createBuffer();
  const scene = out.createScene('env');
  for (const { P, doc } of props) {
    const map = mergeDocuments(out, doc);
    const srcScene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
    const holder = out.createNode(P.key);
    const ex = {};
    if (P.pivot) ex.pivot = P.pivot;
    if (P.bounds) ex.size = P.bounds.size.map((x) => +x.toFixed(3));
    if (Object.keys(ex).length) holder.setExtras(ex);
    for (const n of srcScene.listChildren()) holder.addChild(map.get(n));
    scene.addChild(holder);
    for (const s of out.getRoot().listScenes()) if (s !== scene) s.dispose();
  }
  for (const b of out.getRoot().listBuffers().slice(1)) b.dispose();
  for (const acc of out.getRoot().listAccessors()) acc.setBuffer(out.getRoot().listBuffers()[0]);
  out.getRoot().setDefaultScene(scene);
  scene.setExtras(extras || {});
  await out.transform(dedup(), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }), unpartition(), prune());
  await io.write(outGlb, out);
  return { bytes: statSync(outGlb).size, tris: triCount(out), textures: out.getRoot().listTextures().length };
}
