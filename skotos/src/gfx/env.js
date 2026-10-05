// Photoreal environment set (Poly Haven, CC0; packed by tools/pack-env.mjs):
// tiling layers for ground and stone (src/assets/env/*.webp) and props (src/assets/env.glb).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import envUrl from '../assets/env.glb?url';
import leavesD from '../assets/env/leaves_d.webp?url';
import leavesN from '../assets/env/leaves_n.webp?url';
import mudD from '../assets/env/mud_d.webp?url';
import mudN from '../assets/env/mud_n.webp?url';
import trailD from '../assets/env/trail_d.webp?url';
import trailN from '../assets/env/trail_n.webp?url';
import cobbleD from '../assets/env/cobble_d.webp?url';
import cobbleN from '../assets/env/cobble_n.webp?url';
import flagsD from '../assets/env/flags_d.webp?url';
import flagsN from '../assets/env/flags_n.webp?url';
import mcobbleD from '../assets/env/mcobble_d.webp?url';
import mcobbleN from '../assets/env/mcobble_n.webp?url';
import wallD from '../assets/env/wall_d.webp?url';
import wallN from '../assets/env/wall_n.webp?url';
import blocksD from '../assets/env/blocks_d.webp?url';
import blocksN from '../assets/env/blocks_n.webp?url';
import barkD from '../assets/env/bark_d.webp?url';
import barkN from '../assets/env/bark_n.webp?url';

const LAYER_URLS = {
  leaves: [leavesD, leavesN], mud: [mudD, mudN], trail: [trailD, trailN], cobble: [cobbleD, cobbleN],
  flags: [flagsD, flagsN], mcobble: [mcobbleD, mcobbleN], wall: [wallD, wallN], blocks: [blocksD, blocksN], bark: [barkD, barkN]
};
// ENV.layers[id] = { d: diffuse texture (sRGB), n: OpenGL normal map }; ENV.props[name] = [{ geo, mat }] (one part per material)
export const ENV = { layers: {}, props: {}, pivots: {}, sizes: {}, packs: {}, ready: false, quality: 1 };

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
    normalMap: quality >= 1 ? mat.normalMap : null, aoMap: mat.aoMap, aoMapIntensity: 0.8
  });
  if (m.normalMap) m.normalScale.copy(mat.normalScale);
  LAMB.set(mat, m);
  return m;
}
function readProps(gltf, quality) {
  const root = gltf.scene;
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
    ENV.props[holder.name] = parts;
    if (holder.userData.pivot) ENV.pivots[holder.name] = new THREE.Vector3().fromArray(holder.userData.pivot);
    if (holder.userData.size) ENV.sizes[holder.name] = holder.userData.size;
  }
}

// extra packs, fetched the first time a zone needs them (Act II: tools/pack-deep.mjs)
const PACK_GLB = import.meta.glob('../assets/*.glb', { query: '?url', import: 'default', eager: true });
const PACK_TEX = import.meta.glob('../assets/*/*.webp', { query: '?url', import: 'default', eager: true });
const packs = {};
export function loadPack(name) {
  if (packs[name]) return packs[name];
  const q = ENV.quality;
  packs[name] = (async () => {
    const glbUrl = PACK_GLB['../assets/' + name + '.glb'];
    const layers = {};
    for (const k in PACK_TEX) {
      const m = k.match(new RegExp('^\\.\\./assets/' + name + '/(\\w+)_(d|n)\\.webp$'));
      if (m) (layers[m[1]] ||= {})[m[2]] = PACK_TEX[k];
    }
    const tex = Object.entries(layers).map(async ([id, u]) => {
      const [td, tn] = await Promise.all([texture(u.d, true, q), q >= 1 && u.n ? texture(u.n, false, q) : null]);
      ENV.layers[id] = { d: td, n: tn };
    });
    const glb = glbUrl ? bytes(glbUrl).then((b) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b, '')).then((g) => readProps(g, q)) : null;
    await Promise.all([...tex, glb]);
    ENV.packs[name] = true;
  })();
  return packs[name];
}
export const packReady = (name) => !!ENV.packs[name];

let loading = null;
export function loadEnv(quality = 1) {
  if (loading) return loading;
  ENV.quality = quality;
  loading = (async () => {
    const tex = Object.entries(LAYER_URLS).map(async ([id, [d, n]]) => {
      const [td, tn] = await Promise.all([texture(d, true, quality), quality >= 1 ? texture(n, false, quality) : null]);
      ENV.layers[id] = { d: td, n: tn };
    });
    const glb = bytes(envUrl).then((b) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b, '')).then((g) => readProps(g, quality));
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
