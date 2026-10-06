// Photoreal environment set (Poly Haven, CC0; packed by tools/pack-env.mjs):
// tiling layers for ground and stone (src/assets/env/*.webp) and props (src/assets/env.glb).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// ENV.layers[id] = { d: diffuse texture (sRGB), n: OpenGL normal map }; ENV.props[name] = [{ geo, mat }] (one part per material)
export const ENV = { layers: {}, props: {}, pivots: {}, sizes: {}, extras: {}, packs: {}, ready: false, quality: 1 };

// Packs may reuse a name (Act IV's 'cinder' has its own rockA, statue, lantern and scree). Every prop and layer is kept as
// '<pack>/<name>' too; the bare name belongs to the earliest pack in PACK_ORDER that has it: a later pack never takes a
// bare name from an earlier one, and an earlier one loaded later takes it back. So no older zone ever changes its look,
// whatever order the packs arrive in, and two packs can be active at once (the Forge uses 'cinder' and 'deep').
const PACK_ORDER = ['env', 'village', 'trees', 'deep', 'wood', 'cinder'];
const owners = { props: {}, layers: {} };
const rank = (p) => { const i = PACK_ORDER.indexOf(p); return i < 0 ? PACK_ORDER.length : i; };
function claim(kind, name, pack) {
  const o = owners[kind][name];
  if (o != null && o !== pack && rank(o) <= rank(pack)) return false;
  owners[kind][name] = pack;
  return true;
}
function putLayer(pack, id, layer) {
  ENV.layers[pack + '/' + id] = layer;
  if (claim('layers', id, pack)) ENV.layers[id] = layer;
}
// a pack's own prop or layer, whoever holds the bare name ('cinder', 'rockA' -> the cinder rock, if that pack has one)
export const packProp = (pack, name) => ENV.props[pack + '/' + name] || null;
export const packLayer = (pack, id) => ENV.layers[pack + '/' + id] || null;

async function bytes(url) {
  // inlined builds carry assets as data URIs: decode them instead of fetching
  if (url.startsWith('data:')) {
    const bin = atob(url.slice(url.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  return (await fetch(url)).arrayBuffer();
}
// Decoded straight from bytes (no image URL is ever loaded). Rows stay in file order (flipY off): row 0 is v = 0.
async function texture(url, srgb, quality) {
  const blob = new Blob([await bytes(url)], { type: 'image/webp' });
  let img;
  try { img = await createImageBitmap(blob); } catch (e) {
    img = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = URL.createObjectURL(blob); });
  }
  const t = new THREE.Texture(img);
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = [1, 2, 4][quality] ?? 2;
  t.needsUpdate = true;
  return t;
}

function toFloat(attr) {
  const n = attr.count, k = attr.itemSize, out = new Float32Array(n * k);
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out[i * k + j] = attr.getComponent(i, j);
  return new THREE.BufferAttribute(out, k);
}

// lanterns and candles are lit at night: their glass glows
const GLOW = new THREE.MeshBasicMaterial({ color: 0xffb35a, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });

// phones (quality 0-1) light the props with the cheaper Lambert model; the scanned maps carry the look
const LAMB = new Map();
function lambert(mat, quality) {
  if (LAMB.has(mat)) return LAMB.get(mat);
  const m = new THREE.MeshLambertMaterial({
    name: mat.name, map: mat.map, color: mat.color, side: mat.side, alphaTest: mat.alphaTest, transparent: mat.transparent,
    normalMap: quality >= 1 ? mat.normalMap : null, aoMap: mat.aoMap, aoMapIntensity: 0.8,
    emissiveMap: mat.emissiveMap, emissive: mat.emissive
  });
  if (m.normalMap) m.normalScale.copy(mat.normalScale);
  LAMB.set(mat, m);
  return m;
}
function readProps(gltf, quality, pack = 'env') {
  const root = gltf.scene;
  // node extras straight from the file: the loader's userData copy loses some keys (pivot)
  const extras = {};
  for (const n of gltf.parser?.json?.nodes || []) if (n.extras && n.name) extras[n.name] = n.extras;
  root.updateMatrixWorld(true);
  for (const holder of root.children) {
    const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
    const byMat = new Map();
    holder.traverse((o) => {
      if (!o.isMesh) return;
      let g = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) if (o.geometry.attributes[name]) g.setAttribute(name, toFloat(o.geometry.attributes[name]));
      if (o.geometry.index) g.setIndex(o.geometry.index.clone());
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    });
    const parts = [];
    for (const [mat, geos] of byMat) {
      const geo = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
      if (mat.name === 'rock') geo.computeVertexNormals(); // decimated scans: smooth shading over the big faces
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      let m = mat;
      if (/glass/i.test(mat.name)) m = GLOW;
      else if (!mat.map && !mat.normalMap && mat.name === 'rock') m = mat;   // geometry-only props: the game supplies the stone
      else if (quality < 2) m = lambert(mat, quality);
      else m.envMapIntensity = 0.5;
      parts.push({ geo, mat: m });
    }
    const ex = extras[holder.name] || holder.userData, pv = ex.pivot ? new THREE.Vector3().fromArray(ex.pivot) : null;
    for (const name of [pack + '/' + holder.name].concat(claim('props', holder.name, pack) ? [holder.name] : [])) {
      ENV.props[name] = parts;
      if (pv) ENV.pivots[name] = pv;
      if (ex.size) ENV.sizes[name] = ex.size;
      ENV.extras[name] = ex;
    }
  }
}

// extra packs, fetched the first time a zone needs them (Act II: tools/pack-deep.mjs, Act III: tools/pack-wood.mjs).
// Lazy globs: each file is its own chunk, so an inlined build never puts every pack into one script.
const PACK_GLB = import.meta.glob('../assets/*.glb', { query: '?url', import: 'default' });
const PACK_TEX = import.meta.glob('../assets/*/*.webp', { query: '?url', import: 'default' });
const packs = {};
// a pack's tiling layers: { id: { d: () => url, n: () => url } } from src/assets/<name>/<id>_d|n.webp
function packLayers(name) {
  const layers = {};
  for (const k in PACK_TEX) {
    const m = k.match(new RegExp('^\\.\\./assets/' + name + '/(\\w+)_(d|n)\\.webp$'));
    if (m) (layers[m[1]] ||= {})[m[2]] = PACK_TEX[k];
  }
  return layers;
}
export function loadPack(name) {
  if (packs[name]) return packs[name];
  const q = ENV.quality;
  packs[name] = (async () => {
    const glbKey = '../assets/' + name + '.glb';
    const tex = Object.entries(packLayers(name)).map(async ([id, u]) => {
      const [ud, un] = await Promise.all([u.d(), q >= 1 && u.n ? u.n() : null]);
      const [td, tn] = await Promise.all([texture(ud, true, q), un ? texture(un, false, q) : null]);
      putLayer(name, id, { d: td, n: tn });
    });
    const glb = PACK_GLB[glbKey] ? PACK_GLB[glbKey]().then(bytes).then((b) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b, '')).then((g) => readProps(g, q, name)) : null;
    await Promise.all([...tex, glb]);
    ENV.packs[name] = true;
  })().catch((e) => { delete packs[name]; throw e; }); // a failed fetch can be tried again
  return packs[name];
}
export const packReady = (name) => !!ENV.packs[name];

let loading = null;
export function loadEnv(quality = 1) {
  if (loading) return loading;
  ENV.quality = quality;
  loading = (async () => {
    // the base set is packed like the others (src/assets/env.glb + src/assets/env/*.webp) and fetched lazily
    const tex = Object.entries(packLayers('env')).map(async ([id, u]) => {
      const [ud, un] = await Promise.all([u.d(), quality >= 1 && u.n ? u.n() : null]);
      const [td, tn] = await Promise.all([texture(ud, true, quality), un ? texture(un, false, quality) : null]);
      putLayer('env', id, { d: td, n: tn });
    });
    const glb = PACK_GLB['../assets/env.glb']().then(bytes).then((b) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b, '')).then((g) => readProps(g, quality, 'env'));
    await Promise.all([...tex, glb]);
    ENV.ready = true;
  })();
  return loading;
}

export const hasEnv = (name) => !!ENV.props[name];

// a standalone prop (breakables, chests and other things gameplay owns)
export function envMesh(name, scale = 1) {
  const g = new THREE.Group();
  for (const p of ENV.props[name] || []) {
    const m = new THREE.Mesh(p.geo, p.mat);
    m.castShadow = p.mat !== GLOW; m.receiveShadow = true;
    g.add(m);
  }
  g.scale.setScalar(scale);
  return g;
}
// a chest whose lid swings on its hinge: group.userData.lid.rotation.x opens it (negative = open)
export function envChest(scale = 1) {
  const g = envMesh('chest', scale), lid = envMesh('chestLid');
  const piv = ENV.pivots.chestLid || new THREE.Vector3();
  const hinge = new THREE.Group(); hinge.position.copy(piv); hinge.add(lid);
  g.add(hinge); g.userData.lid = hinge;
  return g;
}
