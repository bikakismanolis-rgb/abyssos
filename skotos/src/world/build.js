// Turns a layout into meshes: textured ground, instanced foliage and walls, merged static props.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { RNG, fbm, clamp } from '../core/util.js';
import { KIT, KITMAT, KIT_SCALE } from '../gfx/kits.js';

export const WIND = { uTime: { value: 0 }, uHero: { value: new THREE.Vector3(0, 0, -999) } };

// Screen-door fade for anything standing between the camera and the hero (camera sits to the south, +z).
const OCC_V = `
  vec4 occW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  occW = instanceMatrix * occW;
#endif
  occW = modelMatrix * occW;
  float occDz = occW.z - uHero.z, occDx = abs(occW.x - uHero.x);
  vOcc = step(-0.8, occDz) * (1.0 - smoothstep(8.0, 11.0, occDz)) * (1.0 - smoothstep(2.2 + occDz * 0.42, 3.4 + occDz * 0.5, occDx)) * smoothstep(0.7, 1.6, occW.y);`;
const OCC_F = `
  if (vOcc > 0.01) {
    vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
    float b = mod(q.x * 2.0 + q.y * 3.0 + floor(q.x / 2.0) * 1.0 + q.x * q.y, 4.0) / 4.0 + mod(q.x + q.y * 2.0, 4.0) / 16.0;
    if (b < vOcc * 0.82) discard;
  }`;
export function occlude(mat, extra) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (extra) extra(sh, r);
    sh.uniforms.uHero = WIND.uHero;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uHero;\nvarying float vOcc;')
      .replace('#include <project_vertex>', OCC_V + '\n#include <project_vertex>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOcc;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>' + OCC_F);
  };
  const key = mat.customProgramCacheKey?.() || mat.type;
  mat.customProgramCacheKey = () => key + '|occ';
  void prev;
  return mat;
}
const CHUNK = 16;

// ---------- materials ----------
const MAT = {};
function mats() {
  if (MAT.lam) return MAT;
  MAT.lam = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  MAT.wind = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const windPatch = (sh) => {
    sh.uniforms.uTime = WIND.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 ip = vec3(0.0);
#endif
  float hgt = max(position.y, 0.0);
  float sway = sin(uTime * 1.3 + ip.x * 0.37 + ip.z * 0.29) * 0.045 + sin(uTime * 2.9 + ip.x * 1.3) * 0.015;
  transformed.x += sway * hgt; transformed.z += sway * 0.6 * hgt;`);
  };
  MAT.wind.customProgramCacheKey = () => 'wind1';
  occlude(MAT.wind, windPatch);
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.stone = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('brick') });
  MAT.web = new THREE.MeshBasicMaterial({ map: tex('web'), transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, color: 0xb8c4d4 });
  MAT.rune = new THREE.MeshBasicMaterial({ map: tex('rune'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x5aa8ff });
  MAT.wood = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('wood') }));
  MAT.roof = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('roof') }));
  MAT.plaster = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('plaster') }));
  for (const k in KITMAT) if (!KITMAT[k].userData.occ) { occlude(KITMAT[k]); KITMAT[k].userData.occ = true; }
  return MAT;
}

// ---------- geometry helpers ----------
const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// parts: [{geo, color, o:{x,y,z,rx,ry,rz,sx,sy,sz}, shade?:fn(y)->k, top?:k}] -> one geometry with vertex colors (and uv if keepUV)
function bake(parts, keepUV = false) {
  const geos = [];
  for (const p of parts) {
    let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(keepUV && k === 'uv')) g.deleteAttribute(k);
    if (keepUV && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const o = p.o || {};
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e);
    _p.set(o.x || 0, o.y || 0, o.z || 0); _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
    const col = new Float32Array(n * 3);
    _c.set(p.color);
    for (let i = 0; i < n; i++) {
      let k = 1;
      if (p.top != null && nor.getY(i) > 0.7) k *= p.top;
      if (p.ao) k *= 0.55 + 0.45 * clamp(pos.getY(i) / p.ao, 0, 1);
      if (p.jit) k *= 1 - p.jit / 2 + Math.random() * p.jit;
      col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }
  const out = mergeGeometries(geos, false);
  out.computeBoundingSphere();
  return out;
}
function jitter(g, amt, seed = 1) {
  g = g.index ? g.toNonIndexed() : g;
  const p = g.attributes.position, rng = RNG(seed), map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    if (!map.has(key)) map.set(key, [rng.range(-amt, amt), rng.range(-amt, amt), rng.range(-amt, amt)]);
    const j = map.get(key);
    p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + j[1], p.getZ(i) + j[2]);
  }
  g.computeVertexNormals();
  return g;
}
function grassGeo() {
  const pos = [], col = [], rng = RNG(5);
  const base = new THREE.Color(0x16240f), tip = new THREE.Color(0x5a7a30);
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, 6.28), r = rng.range(0, 0.18), x = Math.sin(a) * r, z = Math.cos(a) * r;
    const lean = rng.range(-0.25, 0.25), lz = rng.range(-0.25, 0.25), h = rng.range(0.3, 0.6), wdt = 0.05;
    const px = Math.cos(a) * wdt, pz = -Math.sin(a) * wdt;
    pos.push(x - px, 0, z - pz, x + px, 0, z + pz, x + lean, h, z + lz);
    const t = tip.clone().multiplyScalar(rng.range(0.7, 1.15));
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, t.r, t.g, t.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // grass faces up for lighting
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}
function prism(w, h, d) { // roof: ridge along x
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
  return g;
}

// ---------- prop catalogue: type -> {parts, mat, shadow, wind} ----------
const CAT = {
  pine: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.11, 0.2, 1.8, 6), color: 0x3a2a1e, o: { y: 0.9 } },
    { geo: jitter(G.cone(1.45, 1.9, 7), 0.12, 1), color: 0x1a2c20, o: { y: 1.9 }, jit: 0.25 },
    { geo: jitter(G.cone(1.15, 1.7, 7), 0.1, 2), color: 0x1e3324, o: { y: 2.8, ry: 0.4 }, jit: 0.25 },
    { geo: jitter(G.cone(0.85, 1.5, 7), 0.08, 3), color: 0x223a28, o: { y: 3.6 }, jit: 0.25 },
    { geo: G.cone(0.5, 1.2, 6), color: 0x284230, o: { y: 4.3, ry: 0.3 } }
  ] }),
  oak: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.16, 0.3, 2.4, 6), color: 0x3a2c22, o: { y: 1.2 } },
    { geo: G.segTo(0.8, 1.0, 0.2, 0.1, 0.05, 4), color: 0x3a2c22, o: { y: 1.9 } },
    { geo: G.segTo(-0.7, 1.1, -0.3, 0.1, 0.05, 4), color: 0x3a2c22, o: { y: 2.0 } },
    { geo: jitter(G.ico(1.3, 0), 0.15, 4), color: 0x24341c, o: { y: 3.3, sy: 0.8 }, jit: 0.3 },
    { geo: jitter(G.ico(0.95, 0), 0.12, 5), color: 0x2a3a1e, o: { y: 2.9, x: 0.9, z: 0.3, sy: 0.85 }, jit: 0.3 },
    { geo: jitter(G.ico(0.9, 0), 0.12, 6), color: 0x202e18, o: { y: 3.0, x: -0.8, z: -0.4, sy: 0.85 }, jit: 0.3 },
    { geo: jitter(G.ico(0.8, 0), 0.1, 7), color: 0x2e3e22, o: { y: 3.9, x: 0.2, z: -0.5 }, jit: 0.3 }
  ] }),
  dead: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.08, 0.22, 3.4, 5), color: 0x3e3630, o: { y: 1.7 } },
    { geo: G.segTo(0.9, 0.9, 0.1, 0.07, 0.02, 4), color: 0x3e3630, o: { y: 2.1 } },
    { geo: G.segTo(-0.7, 1.2, 0.4, 0.06, 0.02, 4), color: 0x3e3630, o: { y: 2.5 } },
    { geo: G.segTo(0.3, 0.8, -0.8, 0.05, 0.02, 4), color: 0x3e3630, o: { y: 2.9 } },
    { geo: G.segTo(-0.5, 0.6, -0.5, 0.05, 0.02, 4), color: 0x3e3630, o: { y: 1.4 } }
  ] }),
  bush: () => ({ mat: 'wind', shadow: false, parts: [
    { geo: jitter(G.ico(0.55, 0), 0.1, 8), color: 0x1c2c16, o: { y: 0.35, sy: 0.75 }, jit: 0.3 },
    { geo: jitter(G.ico(0.4, 0), 0.08, 9), color: 0x22341a, o: { y: 0.3, x: 0.4, z: 0.15, sy: 0.8 }, jit: 0.3 },
    { geo: jitter(G.ico(0.38, 0), 0.08, 10), color: 0x18261a, o: { y: 0.28, x: -0.35, z: -0.2, sy: 0.8 }, jit: 0.3 }
  ] }),
  grass: () => ({ mat: 'wind', shadow: false, geo: grassGeo() }),
  rock: () => ({ mat: 'lam', shadow: true, parts: [{ geo: jitter(G.dodeca(0.7), 0.18, 11), color: 0x55544e, o: { y: 0.3, sy: 0.75 }, top: 1.25, jit: 0.2 }, { geo: jitter(G.dodeca(0.4), 0.1, 12), color: 0x4a4a46, o: { y: 0.15, x: 0.6, z: 0.3, sy: 0.7 }, jit: 0.2 }] }),
  stone: () => ({ mat: 'lam', shadow: false, parts: [{ geo: jitter(G.dodeca(0.4), 0.1, 13), color: 0x5a5852, o: { y: 0.1, sy: 0.6 }, jit: 0.2 }] }),
  shroom: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.cyl(0.03, 0.045, 0.22, 5), color: 0xc8c4b0, o: { y: 0.11 } }] }),
  shroomCap: () => ({ mat: 'glow', shadow: false, parts: [{ geo: G.dome(0.11, 0.5, 7), color: 0x3ab8e8, o: { y: 0.2, sy: 0.6 } }, { geo: G.ball(0.02, 4, 3), color: 0xb0f0ff, o: { y: 0.25, x: 0.04 } }] }),
  log: () => ({ mat: 'lam', shadow: true, parts: [{ geo: G.cyl(0.28, 0.32, 3.2, 7), color: 0x3a2e24, o: { y: 0.25, rz: Math.PI / 2 }, jit: 0.15 }, { geo: G.cyl(0.29, 0.29, 0.02, 7), color: 0x6a5440, o: { y: 0.25, x: 1.6, rz: Math.PI / 2 } }, { geo: G.box(1.2, 0.1, 0.4), color: 0x2a3a1a, o: { y: 0.52, x: -0.4 } }] }),
  eggs: () => ({ mat: 'lam', shadow: false, parts: [0, 1, 2, 3].map((i) => ({ geo: G.ball(0.22, 7, 5), color: 0xcfc8b0, o: { x: Math.sin(i * 2.1) * 0.25, z: Math.cos(i * 2.1) * 0.25, y: 0.2, sy: 1.3 } })) }),
  bones: () => ({ mat: 'lam', shadow: false, parts: [
    { geo: G.cyl(0.03, 0.03, 0.5, 4), color: 0xc8c0a8, o: { y: 0.03, rz: 1.57, ry: 0.4 } },
    { geo: G.cyl(0.025, 0.025, 0.4, 4), color: 0xc0b8a0, o: { y: 0.03, x: 0.2, z: 0.2, rz: 1.57, ry: -0.8 } },
    { geo: G.ball(0.1, 6, 5), color: 0xd0c8b0, o: { y: 0.08, x: -0.25, z: 0.1 } }
  ] }),
  stake: () => ({ mat: 'lam', shadow: true, parts: [{ geo: G.cyl(0.17, 0.2, 2.4, 6), color: 0x4a3828, o: { y: 1.2 }, jit: 0.2 }, { geo: G.cone(0.17, 0.4, 6), color: 0x5a4430, o: { y: 2.6 } }] }),
  wall: () => {
    const g = new THREE.BoxGeometry(1, 2.8, 1);
    // stretch the brick texture over the height
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 1.4);
    return { mat: 'stone', shadow: false, uv: true, parts: [{ geo: g, color: 0x8a8a90, o: { y: 1.4 }, top: 0.22, ao: 1.0 }] };
  },
  torchBracket: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.box(0.1, 0.25, 0.1), color: 0x2a2a2a, o: { y: 1.6 } }, { geo: G.cyl(0.04, 0.03, 0.5, 5), color: 0x4a3020, o: { y: 1.8, z: 0.15, rx: 0.5 } }] })
};

// ---------- instanced chunks ----------
class Instancer {
  constructor(group) { this.group = group; this.sets = {}; }
  add(type, x, z, ry = 0, s = 1, y = 0, sy) {
    (this.sets[type] ||= []).push([x, y, z, ry, s, sy ?? s]);
  }
  build(quality) {
    const M = mats(), out = {};
    for (const type in this.sets) {
      let def;
      if (type.startsWith('kit:')) {
        const [kit, m] = type.slice(4).split('#')[0].split('/');
        const g = KIT[kit]?.[m];
        if (!g) { console.warn('missing kit model', kit, m); continue; }
        def = { geo: g, material: KITMAT[kit], shadow: !type.includes('#floor') };
      } else def = CAT[type]();
      const list = this.sets[type];
      const geo = def.geo || bake(def.parts, def.uv);
      const chunks = new Map();
      for (const it of list) { const k = Math.floor(it[0] / CHUNK) + ',' + Math.floor(it[2] / CHUNK); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push(it); }
      out[type] = [];
      for (const [, items] of chunks) {
        const im = new THREE.InstancedMesh(geo, def.material || M[def.mat], items.length);
        items.forEach((it, i) => {
          _e.set(0, it[3], 0); _q.setFromEuler(_e);
          _p.set(it[0], it[1], it[2]); _s.set(it[4], it[5], it[4]);
          im.setMatrixAt(i, _m.compose(_p, _q, _s));
        });
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = def.shadow && quality >= 1;
        im.receiveShadow = true;
        im.userData.items = items;
        this.group.add(im);
        out[type].push(im);
      }
    }
    return out;
  }
}

// ---------- static merged batches (chunked for culling) ----------
class Batch {
  constructor(group) { this.group = group; this.buckets = new Map(); }
  add(mat, parts, x, z, ry = 0, s = 1, y = 0, keepUV = false) {
    const k = mat + '|' + Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
    if (!this.buckets.has(k)) this.buckets.set(k, { mat, geos: [] });
    const g = bake(parts, keepUV);
    _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(s, s, s);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    this.buckets.get(k).geos.push(g);
  }
  build(quality) {
    const M = mats();
    for (const [, b] of this.buckets) {
      const geo = mergeGeometries(b.geos, false);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, M[b.mat]);
      mesh.castShadow = quality >= 1 && b.mat !== 'glow';
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
}

// ---------- unique props ----------
const STONE = 0x6a6862, DSTONE = 0x4a4844, WOOD = 0x5a4030, DWOOD = 0x3a2a1e, IRON = 0x2e2e32;
function addProp(B, I, p, L, rng, out) {
  const { x, z } = p, r = p.r || 0, s = p.s || 1;
  switch (p.t) {
    case 'pine': case 'oak': case 'dead': case 'bush': case 'grass': case 'rock': case 'stone': case 'log': case 'eggs': case 'bones': case 'stake':
      I.add(p.t, x, z, r, s, 0, p.t === 'pine' || p.t === 'oak' ? s * (0.9 + rng.next() * 0.35) : s); break;
    case 'shroom': I.add('shroom', x, z, r, s); I.add('shroomCap', x, z, r, s); break;
    case 'web': {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mats().web);
      m.position.set(x, 0.6 + rng.next() * 1.4, z); m.rotation.set(-rng.range(0.5, 1.3), r, 0); m.scale.setScalar(s);
      B.group.add(m); break;
    }
    case 'cobweb': {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), mats().web);
      m.position.set(x, 2.1, z); m.rotation.set(-0.7, r, 0);
      B.group.add(m); break;
    }
    case 'tent': B.add('lam', [
      { geo: G.cone(1.5, 2.0, 4), color: 0x5a4a38, o: { y: 1.0, ry: 0.78 }, jit: 0.15 },
      { geo: G.box(0.7, 1.0, 0.05), color: 0x1a140e, o: { y: 0.5, z: 0.75 } },
      { geo: G.cyl(0.04, 0.04, 2.4, 4), color: DWOOD, o: { y: 1.2 } }
    ], x, z, r, s); break;
    case 'campfire': {
      const parts = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; parts.push({ geo: G.dodeca(0.16), color: 0x4a4844, o: { x: Math.sin(a) * 0.65, z: Math.cos(a) * 0.65, y: 0.08 } }); }
      parts.push({ geo: G.cyl(0.07, 0.07, 1, 5), color: DWOOD, o: { y: 0.15, rz: 1.4, ry: 0.5 } }, { geo: G.cyl(0.07, 0.07, 1, 5), color: DWOOD, o: { y: 0.15, rz: 1.4, ry: -0.7 } }, { geo: G.cyl(0.07, 0.07, 1, 5), color: DWOOD, o: { y: 0.2, rz: 1.4, ry: 1.9 } });
      B.add('lam', parts, x, z);
      B.add('glow', [{ geo: G.cyl(0.4, 0.45, 0.05, 7), color: 0xff5010, o: { y: 0.05 } }], x, z);
      out.emitters.push({ x, y: 0.3, z, type: 'fire', s: 1 });
      break;
    }
    case 'pillar': case 'pillarBroken': {
      const hh = 3.2 * (p.h || 1) * (p.t === 'pillarBroken' ? 0.5 : 1);
      const parts = [
        { geo: G.box(0.95, 0.35, 0.95), color: DSTONE, o: { y: 0.17 } },
        { geo: G.cyl(0.36, 0.4, hh, 8), color: STONE, o: { y: 0.35 + hh / 2 }, ao: 2, jit: 0.1 }
      ];
      if (p.t === 'pillar') parts.push({ geo: G.box(0.9, 0.3, 0.9), color: DSTONE, o: { y: 0.35 + hh + 0.15 } });
      else parts.push({ geo: jitter(G.dodeca(0.4), 0.1, 3), color: STONE, o: { y: 0.3, x: 0.9, z: 0.4 } });
      B.add('lam', parts, x, z, r, s);
      break;
    }
    case 'statue': B.add('lam', [
      { geo: G.box(1.3, 0.6, 1.3), color: DSTONE, o: { y: 0.3 } },
      { geo: G.cyl(0.35, 0.6, 1.9, 8), color: STONE, o: { y: 1.55 } },
      { geo: G.ball(0.28, 8, 6), color: STONE, o: { y: 2.75 } },
      { geo: G.cone(0.35, 0.6, 8), color: STONE, o: { y: 2.95, z: -0.05 } },
      { geo: G.box(0.1, 1.6, 0.1), color: 0x5a5a5e, o: { y: 1.6, z: 0.45 } },
      { geo: G.box(0.45, 0.08, 0.1), color: 0x5a5a5e, o: { y: 2.0, z: 0.45 } },
      { geo: G.box(0.75, 0.15, 0.25), color: STONE, o: { y: 2.05, z: 0.3 } }
    ], x, z, r, 1.1); break;
    case 'barrowDoor': {
      B.add('lam', [
        { geo: G.dome(7, 0.5, 12), color: 0x2a3220, o: { y: -1.5, z: -3.5, sy: 0.75 }, jit: 0.2 },
        { geo: G.box(1.0, 3.6, 1.0), color: STONE, o: { y: 1.8, x: -1.9 }, jit: 0.1 },
        { geo: G.box(1.0, 3.6, 1.0), color: STONE, o: { y: 1.8, x: 1.9 }, jit: 0.1 },
        { geo: G.box(5.2, 0.9, 1.3), color: DSTONE, o: { y: 3.9 } },
        { geo: G.box(2.8, 3.2, 0.2), color: 0x020203, o: { y: 1.6, z: -0.2 } }
      ], x, z);
      out.emitters.push({ x, y: 1.5, z: z + 0.3, type: 'mist', s: 1 });
      break;
    }
    case 'sarcophagus': B.add('lam', [
      { geo: G.box(0.95, 0.7, 2.0), color: 0x5e5a54, o: { y: 0.35 }, ao: 0.7 },
      { geo: G.box(1.05, 0.16, 2.1), color: 0x6e6a62, o: { y: 0.78, x: p.open ? 0.35 : 0, ry: p.open ? 0.25 : 0 } },
      { geo: G.box(0.35, 0.14, 1.3), color: 0x7a766e, o: { y: 0.93, x: p.open ? 0.35 : 0, ry: p.open ? 0.25 : 0 } },
      { geo: G.ball(0.15, 6, 5), color: 0x7a766e, o: { y: 0.95, z: -0.75, x: p.open ? 0.15 : 0 } }
    ], x, z, r); break;
    case 'candles': {
      const parts = [], flames = [];
      for (let i = 0; i < 5; i++) { const a = i * 1.3, rr = 0.12 + (i % 2) * 0.12, hh = 0.15 + (i * 37 % 10) / 30; parts.push({ geo: G.cyl(0.035, 0.04, hh, 5), color: 0xe0d8c0, o: { x: Math.sin(a) * rr, z: Math.cos(a) * rr, y: hh / 2 } }); flames.push({ geo: G.cone(0.025, 0.07, 4), color: 0xffc060, o: { x: Math.sin(a) * rr, z: Math.cos(a) * rr, y: hh + 0.04 } }); }
      B.add('lam', parts, x, z, r); B.add('glow', flames, x, z, r);
      break;
    }
    case 'brazier': {
      B.add('lam', [
        { geo: G.cyl(0.42, 0.25, 0.3, 8), color: IRON, o: { y: 1.05 } },
        { geo: G.segTo(0.3, -1.0, 0, 0.04, 0.03, 4), color: IRON, o: { y: 1.0 } },
        { geo: G.segTo(-0.15, -1.0, 0.26, 0.04, 0.03, 4), color: IRON, o: { y: 1.0 } },
        { geo: G.segTo(-0.15, -1.0, -0.26, 0.04, 0.03, 4), color: IRON, o: { y: 1.0 } }
      ], x, z);
      B.add('glow', [{ geo: G.cyl(0.36, 0.36, 0.05, 8), color: p.blue ? 0x3a90ff : 0xff6a20, o: { y: 1.19 } }], x, z);
      out.emitters.push({ x, y: 1.25, z, type: p.blue ? 'bluefire' : 'fire', s: 0.8 });
      break;
    }
    case 'torch': {
      B.add('lam', CAT.torchBracket().parts, x, z, r);
      out.emitters.push({ x, y: 2.05, z: z + 0.3, type: 'torch', s: 0.5 });
      break;
    }
    case 'banner': B.add('lam', [
      { geo: G.box(1.4, 0.06, 0.06), color: IRON, o: { y: 2.6, z: 0.1 } },
      { geo: G.box(1.2, 1.9, 0.04), color: 0x4a1418, o: { y: 1.6, z: 0.12 }, jit: 0.15 },
      { geo: G.oct(0.22), color: 0x8a7440, o: { y: 1.9, z: 0.16, sz: 0.2 } }
    ], x, z, r); break;
    case 'throne': {
      B.add('lam', [
        { geo: G.box(3.6, 0.4, 2.6), color: DSTONE, o: { y: 0.2 } },
        { geo: G.box(3.0, 0.4, 2.0), color: STONE, o: { y: 0.6 } },
        { geo: G.box(1.6, 0.6, 1.1), color: STONE, o: { y: 1.1 } },
        { geo: G.box(1.8, 3.4, 0.4), color: DSTONE, o: { y: 2.3, z: -0.55 } },
        { geo: G.box(0.3, 0.9, 1.0), color: STONE, o: { y: 1.4, x: -0.85 } },
        { geo: G.box(0.3, 0.9, 1.0), color: STONE, o: { y: 1.4, x: 0.85 } },
        { geo: G.cone(0.25, 0.8, 4), color: DSTONE, o: { y: 4.3, z: -0.55, x: -0.6 } },
        { geo: G.cone(0.25, 0.8, 4), color: DSTONE, o: { y: 4.3, z: -0.55, x: 0.6 } },
        { geo: G.cone(0.3, 1.1, 4), color: DSTONE, o: { y: 4.5, z: -0.55 } }
      ], x, z);
      B.add('glow', [{ geo: G.box(0.1, 2.4, 0.05), color: 0x4aa8ff, o: { y: 2.4, z: -0.33 } }, { geo: G.box(1.2, 0.08, 0.05), color: 0x4aa8ff, o: { y: 3.0, z: -0.33 } }], x, z);
      break;
    }
    case 'stairs': {
      const parts = [];
      for (let i = 0; i < 5; i++) parts.push({ geo: G.box(3.2, 0.3, 0.5), color: i % 2 ? STONE : DSTONE, o: { y: -0.15 - i * 0.25, z: i * 0.5 } });
      parts.push({ geo: G.box(0.6, 1.6, 3), color: DSTONE, o: { x: -1.9, y: 0.4, z: 1 } }, { geo: G.box(0.6, 1.6, 3), color: DSTONE, o: { x: 1.9, y: 0.4, z: 1 } });
      B.add('lam', parts, x, z); break;
    }
    case 'house': {
      const w = p.w, d = p.d, hh = 2.6;
      const parts = [
        { geo: G.box(w, 0.4, d), color: DSTONE, o: { y: 0.2 } },
        { geo: G.box(w - 0.1, hh, d - 0.1), color: 0xb8a888, o: { y: 0.4 + hh / 2 }, ao: 2 }
      ];
      // timber frame
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ geo: G.box(0.22, hh, 0.22), color: DWOOD, o: { x: sx * (w / 2 - 0.05), z: sz * (d / 2 - 0.05), y: 0.4 + hh / 2 } });
      parts.push({ geo: G.box(w, 0.2, 0.24), color: DWOOD, o: { y: 0.4 + hh, z: d / 2 - 0.05 } }, { geo: G.box(w, 0.2, 0.24), color: DWOOD, o: { y: 0.4 + hh, z: -d / 2 + 0.05 } });
      parts.push({ geo: G.box(w, 0.16, 0.2), color: DWOOD, o: { y: 1.7, z: d / 2 - 0.02 } });
      for (let i = -1; i <= 1; i += 2) parts.push({ geo: G.box(0.14, hh, 0.2), color: DWOOD, o: { x: i * w / 4, y: 0.4 + hh / 2, z: d / 2 - 0.02 } });
      parts.push({ geo: G.box(0.9, 1.6, 0.12), color: 0x2a1c12, o: { y: 1.2, z: d / 2 + 0.02 } });
      B.add('lam', parts, x, z, r);
      B.add('roof', [
        { geo: prism(w + 0.8, 2.1, d + 0.9), color: p.roof || 0xa8aab8, o: { y: 0.4 + hh } },
        { geo: G.box(0.6, 1.6, 0.6), color: 0xc8c4bc, o: { y: 0.4 + hh + 1.5, x: w / 2 - 1.1, z: -0.6 } }
      ], x, z, r, 1, 0, true);
      B.add('glow', [
        { geo: G.box(0.55, 0.55, 0.05), color: 0xffb060, o: { x: -w / 4 - 0.7, y: 1.6, z: d / 2 + 0.04 } },
        { geo: G.box(0.55, 0.55, 0.05), color: 0xffa050, o: { x: w / 4 + 0.7, y: 1.6, z: d / 2 + 0.04 } }
      ], x, z, r);
      const cs = Math.cos(r), sn = Math.sin(r), cx = w / 2 - 1.1, cz = -0.6;
      out.emitters.push({ x: x + cx * cs + cz * sn, y: 0.4 + hh + 2.4, z: z - cx * sn + cz * cs, type: 'smoke', s: 1 });
      break;
    }
    case 'forge': {
      B.add('lam', [
        { geo: G.box(2.4, 1.2, 1.8), color: DSTONE, o: { y: 0.6 }, jit: 0.1 },
        { geo: G.box(1.8, 0.2, 1.4), color: STONE, o: { y: 1.3 } },
        { geo: G.cyl(0.5, 0.7, 2.6, 6), color: DSTONE, o: { y: 2.6, z: -0.4 } },
        { geo: G.box(2.8, 0.15, 2.4), color: DWOOD, o: { y: 3.0 } },
        { geo: G.box(0.15, 3, 0.15), color: DWOOD, o: { y: 1.5, x: 1.3, z: 1.1 } },
        { geo: G.box(0.15, 3, 0.15), color: DWOOD, o: { y: 1.5, x: -1.3, z: 1.1 } }
      ], x, z, r);
      B.add('glow', [{ geo: G.box(1.2, 0.08, 0.9), color: 0xff5010, o: { y: 1.42 } }, { geo: G.box(0.8, 0.5, 0.05), color: 0xff7020, o: { y: 0.6, z: 0.91 } }], x, z, r);
      out.emitters.push({ x, y: 1.5, z, type: 'embers', s: 1 });
      out.emitters.push({ x, y: 4.2, z: z - 0.4, type: 'smoke', s: 1 });
      break;
    }
    case 'anvil': B.add('lam', [{ geo: G.box(0.35, 0.5, 0.35), color: DWOOD, o: { y: 0.25 } }, { geo: G.box(0.75, 0.22, 0.32), color: IRON, o: { y: 0.6 } }, { geo: G.cone(0.14, 0.35, 4), color: IRON, o: { y: 0.62, x: 0.5, rz: -1.57 } }], x, z, 0.4); break;
    case 'healtent': {
      B.add('lam', [
        { geo: G.cone(2.6, 2.8, 6), color: 0xc8ccc0, o: { y: 1.4 }, jit: 0.1 },
        { geo: G.cyl(0.05, 0.05, 3.2, 4), color: DWOOD, o: { y: 1.6 } },
        { geo: G.box(1.8, 0.1, 0.8), color: WOOD, o: { y: 0.85, z: 2.2 } },
        { geo: G.box(0.1, 0.85, 0.1), color: DWOOD, o: { y: 0.42, z: 2.2, x: 0.8 } },
        { geo: G.box(0.1, 0.85, 0.1), color: DWOOD, o: { y: 0.42, z: 2.2, x: -0.8 } }
      ], x, z, r);
      const bottles = [];
      for (let i = 0; i < 6; i++) bottles.push({ geo: G.cyl(0.05, 0.07, 0.22, 5), color: [0xff4040, 0x40a0ff, 0x60ff90][i % 3], o: { y: 1.02, z: 2.2 + (i % 2) * 0.2 - 0.1, x: -0.7 + i * 0.28 } });
      B.add('glow', bottles, x, z, r);
      break;
    }
    case 'well': B.add('lam', [
      { geo: G.cyl(1.1, 1.2, 0.9, 10), color: STONE, o: { y: 0.45 }, jit: 0.1 },
      { geo: G.cyl(0.9, 0.9, 0.05, 10), color: 0x050608, o: { y: 0.88 } },
      { geo: G.box(0.15, 2.2, 0.15), color: DWOOD, o: { x: 1.0, y: 1.1 } },
      { geo: G.box(0.15, 2.2, 0.15), color: DWOOD, o: { x: -1.0, y: 1.1 } },
      { geo: G.cyl(0.07, 0.07, 2.1, 5), color: WOOD, o: { y: 1.9, rz: 1.57 } },
      { geo: prism(2.6, 0.8, 1.6), color: 0x3a3028, o: { y: 2.2 } }
    ], x, z); break;
    case 'stash': B.add('lam', [
      { geo: G.box(1.2, 0.6, 0.75), color: 0x5a3a20, o: { y: 0.3 } },
      { geo: G.cyl(0.38, 0.38, 1.2, 8, 1), color: 0x6a4428, o: { y: 0.6, rz: 1.57, sz: 1.0 } },
      { geo: G.box(1.25, 0.08, 0.8), color: 0xa08040, o: { y: 0.45 } },
      { geo: G.box(0.15, 0.2, 0.06), color: 0xc9a24a, o: { y: 0.6, z: 0.4 } }
    ], x, z, r); break;
    case 'lamp': {
      B.add('lam', [{ geo: G.cyl(0.07, 0.09, 2.4, 5), color: DWOOD, o: { y: 1.2 } }, { geo: G.box(0.5, 0.06, 0.06), color: DWOOD, o: { y: 2.35, x: 0.2 } }, { geo: G.cone(0.2, 0.15, 4), color: IRON, o: { y: 2.38, x: 0.4 } }], x, z);
      B.add('glow', [{ geo: G.box(0.18, 0.25, 0.18), color: 0xffc070, o: { y: 2.15, x: 0.4 } }], x, z);
      break;
    }
    case 'stall': B.add('lam', [
      { geo: G.box(2.4, 0.9, 1.0), color: WOOD, o: { y: 0.45 } },
      { geo: G.box(0.1, 2.4, 0.1), color: DWOOD, o: { y: 1.2, x: 1.15, z: 0.45 } }, { geo: G.box(0.1, 2.4, 0.1), color: DWOOD, o: { y: 1.2, x: -1.15, z: 0.45 } },
      { geo: G.box(0.1, 2.0, 0.1), color: DWOOD, o: { y: 1.0, x: 1.15, z: -0.45 } }, { geo: G.box(0.1, 2.0, 0.1), color: DWOOD, o: { y: 1.0, x: -1.15, z: -0.45 } },
      { geo: G.box(2.7, 0.06, 1.5), color: 0x7a2a22, o: { y: 2.25, rx: -0.25 } },
      { geo: G.ball(0.15, 5, 4), color: 0xa04020, o: { y: 1.0, x: -0.6 } }, { geo: G.ball(0.15, 5, 4), color: 0x80a020, o: { y: 1.0, x: -0.3 } }, { geo: G.box(0.4, 0.25, 0.3), color: 0xc8b088, o: { y: 1.02, x: 0.5 } }
    ], x, z, r); break;
    case 'gate': B.add('lam', [
      { geo: G.box(0.6, 4.5, 0.6), color: DWOOD, o: { y: 2.25, x: -3 } }, { geo: G.box(0.6, 4.5, 0.6), color: DWOOD, o: { y: 2.25, x: 3 } },
      { geo: G.box(7, 0.5, 0.6), color: DWOOD, o: { y: 4.3 } },
      { geo: G.box(2.4, 3.4, 0.2), color: WOOD, o: { y: 1.7, x: -3.6, z: 1.2, ry: 1.2 } }, { geo: G.box(2.4, 3.4, 0.2), color: WOOD, o: { y: 1.7, x: 3.6, z: 1.2, ry: -1.2 } }
    ], x, z); break;
    case 'beacon': {
      B.add('lam', [
        { geo: G.cyl(5.5, 8.5, 1.6, 12), color: 0x3a3a2e, o: { y: 0.0 }, jit: 0.15 },
        { geo: G.cyl(2.5, 2.9, 7.0, 10), color: 0x7a7468, o: { y: 4.3 }, ao: 6, jit: 0.08 },
        { geo: G.cyl(3.0, 2.6, 0.6, 10), color: 0x5a564e, o: { y: 7.9 } }
      ], x, z);
      const cren = [];
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; cren.push({ geo: G.box(0.7, 0.7, 0.5), color: 0x6a665c, o: { x: Math.sin(a) * 2.75, z: Math.cos(a) * 2.75, y: 8.5, ry: a } }); }
      cren.push({ geo: G.cyl(1.2, 0.8, 0.8, 8), color: IRON, o: { y: 8.6 } });
      B.add('lam', cren, x, z);
      B.add('glow', [{ geo: G.cyl(1.1, 1.1, 0.1, 8), color: 0xff7020, o: { y: 9.0 } }, { geo: G.box(0.5, 0.9, 0.05), color: 0xffa040, o: { y: 3.0, z: 2.75 } }], x, z);
      out.emitters.push({ x, y: 9.0, z, type: 'beacon', s: 1 });
      break;
    }
    case 'crate': case 'barrel': case 'urn': out.breakables.push(p); break;
    case 'kit': {
      const ks = KIT_SCALE[p.kit] * (p.s || 1);
      const key = 'kit:' + p.kit + '/' + p.m + (p.wall ? '#wall' : p.floor ? '#floor' : '');
      I.add(key, x, z, r, ks * (p.sx ?? 1), p.y ? p.y : 0, ks * (p.sy ?? 1));
      break;
    }
    case 'fx': out.emitters.push({ x, y: p.y, z, type: p.fx, s: 1 }); break;
  }
}

// ---------- ground ----------
function buildGround(L, group) {
  const { w, h, cells, paint } = L;
  const geo = new THREE.PlaneGeometry(w, h, w, h);
  geo.rotateX(-Math.PI / 2);
  geo.translate(w / 2, 0, h / 2);
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), blend = new Float32Array(n);
  const D = L.dist;
  const cellAt = (x, z) => (x < 0 || z < 0 || x >= w || z >= h ? -1 : z * w + x);
  for (let i = 0; i < n; i++) {
    const vx = Math.round(pos.getX(i)), vz = Math.round(pos.getZ(i));
    let pv = 0, fl = 0, dd = 0, cnt = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const c = cellAt(vx + dx, vz + dz); if (c < 0) { dd += 9; cnt++; continue; }
      pv += paint[c]; fl += cells[c]; dd += Math.min(D[c] === 255 ? 9 : D[c], 9); cnt++;
    }
    pv /= 4; fl /= 4; dd /= cnt;
    const nz = fbm(vx * 0.15, vz * 0.15, L.seed || 1);
    let k;
    if (L.type === 'crypt') k = fl > 0 ? 0.5 : 0;
    else k = (fl > 0 ? 0.8 + nz * 0.45 : Math.max(0.12, 0.6 - dd * 0.07)) * (L.type === 'town' ? 1.05 : 1);
    col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k;
    blend[i] = L.type === 'crypt' ? clamp((nz - 0.55) * 1.4, 0, 0.5) : clamp(pv * 1.2, 0, 1);
    if (L.type === 'forest' && !fl) pos.setY(i, Math.min(dd, 5) * 0.06);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aBlend', new THREE.BufferAttribute(blend, 1));
  geo.computeVertexNormals();
  const A = L.type === 'crypt' ? tex('flagstone') : tex('grass');
  const B = L.type === 'town' ? tex('cobble') : tex('dirt');
  const rep = L.type === 'crypt' ? 2.2 : 3;
  if (L.type === 'town') B.repeat?.set(1, 1);
  const mat = new THREE.MeshLambertMaterial({ map: A, vertexColors: true });
  A.repeat.set(w / rep, h / rep);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.map2 = { value: B };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aBlend;\nvarying float vBlend;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBlend = aBlend;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D map2;\nvarying float vBlend;')
      .replace('#include <map_fragment>', `
  vec4 cA = texture2D(map, vMapUv);
  vec4 cB = texture2D(map2, vMapUv * ${L.type === 'town' ? '1.9' : '0.83'}) * ${L.type === 'town' ? '0.75' : '1.0'};
  float bl = smoothstep(0.25, 0.75, vBlend + (cB.g - 0.4) * 0.5);
  diffuseColor *= mix(cA, cB, bl);`);
  };
  mat.customProgramCacheKey = () => 'ground' + L.type;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// ---------- crypt walls with a cutaway in front of the hero ----------
function buildWalls(L, I) {
  const { w, h, cells } = L;
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x;
    if (cells[i]) continue;
    let near = false;
    for (let dz = -1; dz <= 1 && !near; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz; if (nx >= 0 && nz >= 0 && nx < w && nz < h && cells[nz * w + nx]) { near = true; break; } }
    if (near) I.add('wall', x + 0.5, z + 0.5, 0, 1, 0, 1);
  }
}
export class WallCut {
  constructor(meshes) {
    this.meshes = meshes || [];
    this.state = new Map(); // key mesh index/instance -> current scale
  }
  update(dt, px, pz) {
    for (const im of this.meshes) {
      const items = im.userData.items;
      let dirty = false;
      if (!im.userData.k) im.userData.k = new Float32Array(items.length).fill(1);
      const K = im.userData.k;
      for (let i = 0; i < items.length; i++) {
        const it = items[i], dx = it[0] - px, dz = it[2] - pz;
        // walls between the camera and the hero (south of them) drop to a stub
        const inFront = dz > -0.6 && dz < 9 && Math.abs(dx) < 6.5 + dz * 0.4;
        const target = inFront ? 0.14 : 1;
        if (Math.abs(K[i] - target) < 0.01) continue;
        K[i] += (target - K[i]) * Math.min(1, dt * 10);
        _p.set(it[0], it[1], it[2]); _e.set(0, it[3], 0); _q.setFromEuler(_e); _s.set(it[4], it[5] * K[i], it[4]);
        im.setMatrixAt(i, _m.compose(_p, _q, _s));
        dirty = true;
      }
      if (dirty) im.instanceMatrix.needsUpdate = true;
    }
  }
}

// ---------- entry ----------
export function buildLevel(L, quality) {
  const group = new THREE.Group();
  const rng = RNG((L.seed || 1) * 7 + 3);
  const I = new Instancer(group), B = new Batch(group);
  const out = { group, emitters: [], breakables: [], walls: null, ground: null };
  out.ground = buildGround(L, group);
  for (const p of L.props) addProp(B, I, p, L, rng, out);
  const inst = I.build(quality);
  B.build(quality);
  const cut = [];
  for (const k in inst) if (k.endsWith('#wall')) cut.push(...inst[k]);
  if (cut.length) out.walls = new WallCut(cut);
  return out;
}

// held, breakable and interactive props are separate meshes owned by gameplay
export function propMesh(type, o = {}) {
  let parts;
  switch (type) {
    case 'urn': parts = [{ geo: G.lathe([[0, 0], [0.18, 0.02], [0.26, 0.2], [0.24, 0.45], [0.12, 0.6], [0.14, 0.7], [0, 0.7]], 8), color: 0x7a5038, o: {}, jit: 0.1 }]; break;
    case 'crate': parts = [{ geo: G.box(0.8, 0.8, 0.8), color: 0x6a4a2e, o: { y: 0.4 } }, { geo: G.box(0.84, 0.1, 0.84), color: 0x4a3420, o: { y: 0.75 } }, { geo: G.box(0.84, 0.1, 0.84), color: 0x4a3420, o: { y: 0.05 } }]; break;
    case 'barrel': parts = [{ geo: G.cyl(0.36, 0.36, 0.95, 9), color: 0x6a4a2e, o: { y: 0.48, sx: 1, sz: 1 } }, { geo: G.cyl(0.39, 0.39, 0.06, 9), color: 0x3a3a3a, o: { y: 0.2 } }, { geo: G.cyl(0.39, 0.39, 0.06, 9), color: 0x3a3a3a, o: { y: 0.76 } }]; break;
    case 'chest': parts = [
      { geo: G.box(1.0, 0.55, 0.65), color: o.rare ? 0x3a2a4a : 0x5a3a20, o: { y: 0.28 } },
      { geo: G.box(1.04, 0.1, 0.69), color: o.rare ? 0xc9a24a : 0x8a7040, o: { y: 0.4 } },
      { geo: G.box(0.14, 0.18, 0.05), color: 0xc9a24a, o: { y: 0.42, z: 0.34 } }
    ]; break;
    case 'chestLid': parts = [{ geo: G.cyl(0.32, 0.32, 1.0, 8, 1), color: o.rare ? 0x4a3a5a : 0x6a4428, o: { rz: 1.57, sz: 1.0, z: 0.0 } }, { geo: G.box(1.04, 0.08, 0.1), color: 0xc9a24a, o: { y: 0.26 } }]; break;
    case 'shrine': parts = [
      { geo: G.cyl(0.9, 1.1, 0.4, 8), color: DSTONE, o: { y: 0.2 } },
      { geo: G.cyl(0.25, 0.35, 1.6, 6), color: STONE, o: { y: 1.1 } },
      { geo: G.cyl(0.55, 0.35, 0.3, 8), color: DSTONE, o: { y: 2.0 } }
    ]; break;
    case 'waypoint': parts = [0, 1, 2].map((i) => ({ geo: G.box(0.5, 2.2 - i * 0.3, 0.4), color: STONE, o: { x: Math.sin(i * 2.09) * 1.6, z: Math.cos(i * 2.09) * 1.6, y: 1.1 - i * 0.15, ry: i * 2.09, rz: 0.08 }, jit: 0.1 })).concat([{ geo: G.cyl(1.3, 1.4, 0.15, 12), color: DSTONE, o: { y: 0.07 } }]); break;
    case 'portal': parts = [{ geo: G.torus(0.9, 0.08, 4, 16), color: 0x5aa8ff, o: { y: 1.25 } }]; break;
  }
  const geo = bake(parts);
  const mesh = new THREE.Mesh(geo, mats()[type === 'portal' ? 'glow' : 'lam']);
  mesh.castShadow = true;
  return mesh;
}
export function runeDisc(r = 1.2, color = 0x5aa8ff) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mats().rune.clone());
  m.material.color.set(color);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.17;
  return m;
}
