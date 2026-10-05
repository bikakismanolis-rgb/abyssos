// Loads the packed KayKit kits (CC0) and exposes each model as one merged geometry in model space.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// lazy (see people.js)
const URLS = { dungeon: () => import('../assets/dungeon.glb?url'), grave: () => import('../assets/grave.glb?url'), town: () => import('../assets/town.glb?url') };
export const KIT = {};      // KIT[kit][model] = geometry
export const KITMAT = {};   // KITMAT[kit] = material
export const KIT_SCALE = { dungeon: 0.75, grave: 0.75, town: 3.4 };

function toFloat(attr) {
  const n = attr.count, k = attr.itemSize, out = new Float32Array(n * k);
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out[i * k + j] = attr.getComponent(i, j);
  return new THREE.BufferAttribute(out, k);
}

const loading = {};
export function loadKit(kit) {
  if (KIT[kit]) return Promise.resolve(KIT[kit]);
  if (loading[kit]) return loading[kit];
  loading[kit] = URLS[kit]().then((mod) => new Promise((resolve, reject) => {
    const onLoad = (gltf) => {
      const models = {};
      let map = null;
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      for (const holder of root.children) {
        const geos = [];
        const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
        holder.traverse((o) => {
          if (!o.isMesh) return;
          if (!map && o.material?.map) map = o.material.map;
          let g = new THREE.BufferGeometry();
          for (const name of ['position', 'normal', 'uv']) if (o.geometry.attributes[name]) g.setAttribute(name, toFloat(o.geometry.attributes[name]));
          if (o.geometry.index) g.setIndex(o.geometry.index.clone());
          g = g.toNonIndexed();
          if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
          if (!g.attributes.normal) g.computeVertexNormals();
          g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
          geos.push(g);
        });
        if (!geos.length) continue;
        const merged = mergeGeometries(geos, false);
        merged.computeBoundingBox(); merged.computeBoundingSphere();
        models[holder.name] = merged;
      }
      if (map) { map.colorSpace = THREE.SRGBColorSpace; map.flipY = false; map.anisotropy = 4; }
      KITMAT[kit] = new THREE.MeshLambertMaterial({ map, color: kit === 'town' ? 0xb8b0a8 : kit === 'dungeon' ? 0x8c8a90 : 0x8a8274 }); // grave bits: aged bone, not chalk
      KIT[kit] = models;
      resolve(models);
    };
    const url = mod.default;
    // inlined builds carry the model as a data URI: decode it here instead of fetching it
    if (url.startsWith('data:')) {
      const b64 = url.slice(url.indexOf(',') + 1), bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      new GLTFLoader().parse(u8.buffer, '', onLoad, reject);
    } else new GLTFLoader().load(url, onLoad, undefined, reject);
  }));
  return loading[kit];
}
export const loadKits = (list) => Promise.all(list.map(loadKit));

// a standalone mesh of one kit model (for props gameplay owns: chests, barrels, doors)
export function kitMesh(kit, name, scale) {
  const g = KIT[kit]?.[name];
  if (!g) return new THREE.Group();
  const m = new THREE.Mesh(g, KITMAT[kit]);
  m.scale.setScalar(scale ?? KIT_SCALE[kit]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
