// Turns a layout into meshes: textured ground, instanced foliage and walls, merged static props.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { RNG, fbm, clamp } from '../core/util.js';
import { KIT, KITMAT, KIT_SCALE } from '../gfx/kits.js';
import { ENV } from '../gfx/env.js';

export const WIND = { uTime: { value: 0 }, uHero: { value: new THREE.Vector3(0, 0, -999) }, uSnow: { value: 0 } };

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
  if (MAT.lam) return envMats();
  MAT.lam = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const treeTex = ENV.ready && ENV.layers.bark && ENV.layers.leaves;
  MAT.wind = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: !treeTex });
  const windPatch = (sh) => {
    sh.uniforms.uTime = WIND.uTime;
    if (treeTex) {
      // trunks (brown vertex colour) take scanned bark, foliage the leaf-litter scan's light and shade: detail, not hue
      sh.uniforms.tBark = { value: ENV.layers.bark.d }; sh.uniforms.tLeaf = { value: ENV.layers.leaves.d };
      sh.defines = Object.assign(sh.defines || {}, { TREE_TEX: '' });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTP;\nvarying vec3 vTN;')
        .replace('#include <project_vertex>', `#include <project_vertex>
  vec4 tpw = vec4(transformed, 1.0); vec3 tnw = objectNormal;
#ifdef USE_INSTANCING
  tpw = instanceMatrix * tpw; tnw = mat3(instanceMatrix) * tnw;
#endif
  vTP = (modelMatrix * tpw).xyz; vTN = normalize(mat3(modelMatrix) * tnw);`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tBark;\nuniform sampler2D tLeaf;\nvarying vec3 vTP;\nvarying vec3 vTN;')
        .replace('#include <map_fragment>', `
  vec3 tN = normalize(vTN);
  vec2 tS = abs(tN.x) > abs(tN.z) ? vTP.zy : vTP.xy;
  if (vColor.r > vColor.g * 1.06) diffuseColor.rgb *= texture2D(tBark, vec2(tS.x * 1.1, tS.y * 0.55)).rgb * 5.0;
  else {
    float up = smoothstep(0.2, 0.7, tN.y);
    vec3 lc = mix(texture2D(tLeaf, tS * 0.55).rgb, texture2D(tLeaf, vTP.xz * 0.55 + 0.37).rgb, up);
    diffuseColor.rgb *= 0.45 + dot(lc, vec3(0.3, 0.55, 0.15)) * 4.5;
  }`);
    }
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
  MAT.wind.customProgramCacheKey = () => 'wind1' + (treeTex ? 't' : '');
  occlude(MAT.wind, windPatch);
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.stone = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('brick') });
  MAT.web = new THREE.MeshBasicMaterial({ map: tex('web'), transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, color: 0xb8c4d4 });
  MAT.rune = new THREE.MeshBasicMaterial({ map: tex('rune'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x5aa8ff });
  MAT.wood = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('wood') }));
  MAT.roof = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('roof') }));
  MAT.plaster = occlude(new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('plaster') }));
  return envMats();
}
function envMats() {
  for (const k in KITMAT) if (!KITMAT[k].userData.occ) { occlude(KITMAT[k]); KITMAT[k].userData.occ = true; }
  if (!ENV.ready) return MAT;
  if (!MAT.envDone) {
    MAT.envDone = true;
    // photoreal stone, projected in world space so it never stretches (crypt walls shrink as the hero passes)
    MAT.wallW = worldMat('wall', { scale: 2.2, kit: KITMAT.dungeon, tint: 0xf4f0e8, rough: 0.82 });
    MAT.postW = worldMat('blocks', { scale: 2.0, kit: KITMAT.dungeon, tri: true, tint: 0xd8d4cc, rough: 0.8 });
    MAT.blocks = worldMat('blocks', { scale: 2.0, vc: 0.144, tri: true, rough: 0.82 });
    MAT.rough = worldMat('wall', { scale: 2.6, vc: 0.144, tri: true, rough: 0.85 });
  }
  if (!MAT.deepDone && ENV.packs.deep) {
    MAT.deepDone = true;
    MAT.cliffW = worldMat('cliff', { scale: 3.2, tri: true, rough: 0.9, snow: true, tint: 0xc8c8cc });
    MAT.rockW = worldMat('cliff', { scale: 2.0, tri: true, rough: 0.9, tint: 0xa8a49c });
    MAT.dwallW = worldMat('dwall', { scale: 2.4, kit: KITMAT.dungeon, tint: 0xe6dccc, rough: 0.82 });
    MAT.dpostW = worldMat('dwall', { scale: 2.0, kit: KITMAT.dungeon, tri: true, tint: 0xd8cebe, rough: 0.8 });
    MAT.caveW = worldMat('cavewall', { scale: 2.6, kit: KITMAT.dungeon, tri: true, tint: 0xb8b0a6, rough: 0.9 });
    MAT.dblocks = worldMat('dwall', { scale: 2.0, vc: 0.144, tri: true, rough: 0.82 });
    MAT.snowRock = worldMat('cliff', { scale: 2.6, vc: 0.144, tri: true, rough: 0.9, snow: true });
  }
  for (const k in ENV.props) for (const part of ENV.props[k]) if (!part.mat.userData.occ && !part.mat.transparent) { occlude(part.mat); part.mat.userData.occ = true; }
  return MAT;
}

// ---------- photoreal layers (Poly Haven, see gfx/env.js) ----------
const Std = () => (R.quality >= 2 ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial);
// World-space projected stone. o.tri: blend three projections (curved shapes); otherwise each face takes its dominant axis
// (cheap, exact on the axis-aligned crypt walls). o.vc: multiply by vertex colours relative to this reference grey.
// o.kit: keep that KayKit material's texture as a shading mask (its baked light and dark trims).
function worldMat(layer, o = {}) {
  const L = ENV.layers[layer];
  const m = new (Std())({ vertexColors: !!o.vc, map: o.kit?.map || null, color: o.tint ?? 0xffffff });
  if (m.isMeshStandardMaterial) { m.roughness = o.rough ?? 0.85; m.metalness = 0; m.envMapIntensity = 0.25; }
  const nrm = !!L.n;
  const SN = o.snow && ENV.layers.snow;
  const uni = { tW: { value: L.d }, tWn: { value: L.n }, uWS: { value: 1 / (o.scale || 2) }, uVC: { value: 1 / (o.vc || 1) }, tSnow: { value: SN ? SN.d : null } };
  const proj = (k) => `
  {
    vec2 q = ${k};
    vec3 c = texture2D(tW, q * uWS).rgb;
#ifdef W_NRM
    vec3 tn = texture2D(tWn, q * uWS).xyz * 2.0 - 1.0;
#else
    vec3 tn = vec3(0.0, 0.0, 1.0);
#endif
`;
  const frag = `
  vec3 wN = normalize(vWN), aN = abs(wN), wc = vec3(0.0), wPN = vec3(0.0);
#ifdef W_TRI
  vec3 bw = aN * aN; bw *= bw; bw /= dot(bw, vec3(1.0));
  ${proj('vec2(vWP.x, vWP.z)')}  wc += c * bw.y; wPN += (vec3(1.0, 0.0, 0.0) * tn.x + vec3(0.0, 0.0, -1.0) * tn.y) * bw.y; }
  ${proj('vec2(-sign(wN.x) * vWP.z, -vWP.y)')} wc += c * bw.x; wPN += (vec3(0.0, 0.0, -sign(wN.x)) * tn.x + vec3(0.0, 1.0, 0.0) * tn.y) * bw.x; }
  ${proj('vec2(sign(wN.z) * vWP.x, -vWP.y)')} wc += c * bw.z; wPN += (vec3(sign(wN.z), 0.0, 0.0) * tn.x + vec3(0.0, 1.0, 0.0) * tn.y) * bw.z; }
#else
  if (aN.y > aN.x && aN.y > aN.z) { ${proj('vec2(vWP.x, vWP.z)')} wc = c; wPN = vec3(1.0, 0.0, 0.0) * tn.x + vec3(0.0, 0.0, -1.0) * tn.y; } }
  else if (aN.x > aN.z) { ${proj('vec2(-sign(wN.x) * vWP.z, -vWP.y)')} wc = c; wPN = vec3(0.0, 0.0, -sign(wN.x)) * tn.x + vec3(0.0, 1.0, 0.0) * tn.y; } }
  else { ${proj('vec2(sign(wN.z) * vWP.x, -vWP.y)')} wc = c; wPN = vec3(sign(wN.z), 0.0, 0.0) * tn.x + vec3(0.0, 1.0, 0.0) * tn.y; } }
#endif
  wPN = normalize(wN + wPN);`;
  const patch = (sh) => {
    Object.assign(sh.uniforms, uni);
    if (nrm) sh.defines = Object.assign(sh.defines || {}, { W_NRM: '' });
    if (o.tri) sh.defines = Object.assign(sh.defines || {}, { W_TRI: '' });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 wpp = vec4(transformed, 1.0);
  vec3 wnn = objectNormal;
#ifdef USE_INSTANCING
  wpp = instanceMatrix * wpp; wnn = mat3(instanceMatrix) * wnn;
#endif
  wpp = modelMatrix * wpp; vWP = wpp.xyz; vWN = normalize(mat3(modelMatrix) * wnn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tW;\nuniform sampler2D tWn;\nuniform sampler2D tSnow;\nuniform float uWS;\nuniform float uVC;\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <map_fragment>', (o.kit ? `#ifdef USE_MAP
  vec3 kitC = texture2D(map, vMapUv).rgb;
  diffuseColor.rgb *= clamp(dot(kitC, vec3(0.3, 0.55, 0.15)) * 1.6, 0.25, 1.15);
#endif` : '') + frag + (SN ? `
  // snow settles on whatever faces the sky, thicker higher up the slope
  vec3 snc = texture2D(tSnow, vWP.xz * 0.33).rgb;
  float snw = smoothstep(0.45, 0.8, wN.y + (snc.r - 0.5) * 0.5 + clamp(vWP.y, 0.0, 6.0) * 0.03);
  wc = mix(wc, snc * 1.15, snw);` : '') + '\n  diffuseColor.rgb *= wc;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n#ifdef USE_COLOR\n  diffuseColor.rgb *= uVC;\n#endif')
      .replace('#include <normal_fragment_maps>', '#ifdef W_NRM\n  normal = normalize((viewMatrix * vec4(wPN, 0.0)).xyz);\n#endif');
  };
  m.customProgramCacheKey = () => 'world|' + layer + (o.tri ? '|tri' : '') + (o.kit ? '|kit' : '') + (o.vc ? '|vc' : '') + (SN ? '|snow' : '');
  return occlude(m, patch);
}


// ---------- geometry helpers ----------
const lerpC = (a, b, t) => a + (b - a) * t;
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
    if (p.soft) {
      // foliage masses: bend the facet normals out from the clump's centre so the lighting rolls softly over it
      g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); c.y -= (g.boundingBox.max.y - g.boundingBox.min.y) * 0.15;
      const v = new THREE.Vector3(), f = new THREE.Vector3();
      for (let i = 0; i < n; i++) { v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(c).normalize(); f.set(nor.getX(i), nor.getY(i), nor.getZ(i)); v.lerp(f, 1 - p.soft).normalize(); nor.setXYZ(i, v.x, v.y, v.z); }
    }
    const col = new Float32Array(n * 3);
    _c.set(p.color);
    for (let i = 0; i < n; i++) {
      let k = 1;
      if (p.top != null && nor.getY(i) > 0.7) k *= p.top;
      if (p.snow && nor.getY(i) > 0.25) { const f = Math.min(1, (nor.getY(i) - 0.25) * p.snow); col[i * 3] = lerpC(_c.r, 0.86, f) * k; col[i * 3 + 1] = lerpC(_c.g, 0.89, f) * k; col[i * 3 + 2] = lerpC(_c.b, 0.94, f) * k; continue; }
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
function grassGeo(b = 0x16240f, tp = 0x5a7a30) {
  const pos = [], col = [], rng = RNG(5);
  const base = new THREE.Color(b), tip = new THREE.Color(tp);
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
    { geo: jitter(G.cone(1.45, 1.9, 7), 0.12, 1), color: 0x1a2c20, o: { y: 1.9 }, jit: 0.25, soft: 0.7 },
    { geo: jitter(G.cone(1.15, 1.7, 7), 0.1, 2), color: 0x1e3324, o: { y: 2.8, ry: 0.4 }, jit: 0.25, soft: 0.7 },
    { geo: jitter(G.cone(0.85, 1.5, 7), 0.08, 3), color: 0x223a28, o: { y: 3.6 }, jit: 0.25, soft: 0.7 },
    { geo: G.cone(0.5, 1.2, 6), color: 0x284230, o: { y: 4.3, ry: 0.3 }, soft: 0.7 }
  ] }),
  oak: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.16, 0.3, 2.4, 6), color: 0x3a2c22, o: { y: 1.2 } },
    { geo: G.segTo(0.8, 1.0, 0.2, 0.1, 0.05, 4), color: 0x3a2c22, o: { y: 1.9 } },
    { geo: G.segTo(-0.7, 1.1, -0.3, 0.1, 0.05, 4), color: 0x3a2c22, o: { y: 2.0 } },
    { geo: jitter(G.ico(1.3, 0), 0.15, 4), color: 0x24341c, o: { y: 3.3, sy: 0.8 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.95, 0), 0.12, 5), color: 0x2a3a1e, o: { y: 2.9, x: 0.9, z: 0.3, sy: 0.85 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.9, 0), 0.12, 6), color: 0x202e18, o: { y: 3.0, x: -0.8, z: -0.4, sy: 0.85 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.8, 0), 0.1, 7), color: 0x2e3e22, o: { y: 3.9, x: 0.2, z: -0.5 }, jit: 0.3, soft: 0.7 }
  ] }),
  dead: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.08, 0.22, 3.4, 5), color: 0x3e3630, o: { y: 1.7 } },
    { geo: G.segTo(0.9, 0.9, 0.1, 0.07, 0.02, 4), color: 0x3e3630, o: { y: 2.1 } },
    { geo: G.segTo(-0.7, 1.2, 0.4, 0.06, 0.02, 4), color: 0x3e3630, o: { y: 2.5 } },
    { geo: G.segTo(0.3, 0.8, -0.8, 0.05, 0.02, 4), color: 0x3e3630, o: { y: 2.9 } },
    { geo: G.segTo(-0.5, 0.6, -0.5, 0.05, 0.02, 4), color: 0x3e3630, o: { y: 1.4 } }
  ] }),
  bush: () => ({ mat: 'wind', shadow: false, parts: [
    { geo: jitter(G.ico(0.55, 0), 0.1, 8), color: 0x1c2c16, o: { y: 0.35, sy: 0.75 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.4, 0), 0.08, 9), color: 0x22341a, o: { y: 0.3, x: 0.4, z: 0.15, sy: 0.8 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.38, 0), 0.08, 10), color: 0x18261a, o: { y: 0.28, x: -0.35, z: -0.2, sy: 0.8 }, jit: 0.3, soft: 0.7 }
  ] }),
  grass: () => ({ mat: 'wind', shadow: false, geo: grassGeo() }),
  tuft: () => ({ mat: 'wind', shadow: false, geo: grassGeo(0x3a3428, 0x9a8a62) }),
  pineS: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.11, 0.2, 1.8, 6), color: 0x3a2a1e, o: { y: 0.9 } },
    { geo: jitter(G.cone(1.45, 1.9, 7), 0.12, 1), color: 0x16261c, o: { y: 1.9 }, jit: 0.25, soft: 0.6, snow: 2.2 },
    { geo: jitter(G.cone(1.15, 1.7, 7), 0.1, 2), color: 0x1a2c20, o: { y: 2.8, ry: 0.4 }, jit: 0.25, soft: 0.6, snow: 2.2 },
    { geo: jitter(G.cone(0.85, 1.5, 7), 0.08, 3), color: 0x1e3224, o: { y: 3.6 }, jit: 0.25, soft: 0.6, snow: 2.2 },
    { geo: G.cone(0.5, 1.2, 6), color: 0x223a28, o: { y: 4.3, ry: 0.3 }, soft: 0.6, snow: 2.2 }
  ] }),
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

// ---------- scanned trees (trees.glb): their own materials plus wind, the cutaway fade and snow on the pass ----------
const TREE_MAT = new Map();
function treeMat(src) {
  if (TREE_MAT.has(src)) return TREE_MAT.get(src);
  const m = src.clone();
  const leaf = m.alphaTest > 0;
  // the scans were shot in daylight: trunks read too pale in a night forest
  m.color.multiplyScalar(leaf ? 0.82 : 0.55);
  occlude(m, (sh) => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uSnow = WIND.uSnow;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vTH;\nvarying vec3 vTWN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 tip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 tip = vec3(0.0);
#endif
  float th = max(position.y, 0.0);
  vTH = th;
  float tsw = (sin(uTime * 1.1 + tip.x * 0.37 + tip.z * 0.29) * 0.018 + sin(uTime * 2.6 + tip.x * 1.3) * 0.006) * th * th * 0.18;
  transformed.x += tsw; transformed.z += tsw * 0.6;
  ${leaf ? 'transformed.xz += vec2(sin(uTime * 4.0 + position.y * 3.0 + tip.x), cos(uTime * 3.3 + position.x * 2.0 + tip.z)) * 0.025 * min(th, 3.0);' : ''}`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvTWN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSnow;\nvarying float vTH;\nvarying vec3 vTWN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
  if (uSnow > 0.0) {
    float up = ${leaf ? 'abs(normalize(vTWN).y)' : 'normalize(vTWN).y'};
    float sn = uSnow * clamp(smoothstep(0.25, 0.75, up) * 0.85 + smoothstep(2.0, 7.0, vTH) * 0.25, 0.0, 0.9);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.95), sn);
  }`);
  });
  m.customProgramCacheKey = () => 'tree|' + (leaf ? 'leaf' : 'bark') + '|' + m.type;
  TREE_MAT.set(src, m);
  return m;
}
const NO_TREES = typeof location !== 'undefined' && location.search.includes('notrees');
const TREE_POOL = { pine: ['treePine', 'treePine', 'treeSpruce'], pineS: ['treePine', 'treeSpruce', 'treeFir'], oak: ['treeOak', 'treeBeech', 'treeOak'], dead: ['treeDead'] };

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
      if (type.startsWith('tree:')) {
        const parts = ENV.props[type.slice(5)];
        if (!parts) { console.warn('missing tree', type); continue; }
        def = { parts: parts.map((p) => ({ geo: p.geo, material: treeMat(p.mat) })), shadow: quality >= 2 };
      } else if (type.startsWith('rock:') || type.startsWith('rockb:')) {
        const name = type.slice(type.indexOf(':') + 1), parts = ENV.props[name];
        if (!parts) { console.warn('missing rock', name); continue; }
        def = { parts: parts.map((p) => ({ geo: p.geo, material: (type.startsWith('rock:') ? M.cliffW : M.rockW) || M.lam })), shadow: true };
      } else if (type.startsWith('kit:')) {
        const [kit, m] = type.slice(4).split('#')[0].split('~')[0].split('/');
        const g = KIT[kit]?.[m];
        if (!g) { console.warn('missing kit model', kit, m); continue; }
        def = { parts: [{ geo: g, material: kitMaterial(M, kit, m, type) }], shadow: !type.includes('#floor') };
      } else if (type.startsWith('env:')) {
        const name = type.slice(4), parts = ENV.props[name];
        if (!parts) { console.warn('missing env prop', name); continue; }
        def = { parts: parts.map((p) => ({ geo: p.geo, material: p.mat, glow: p.mat.transparent })), shadow: ENV_SHADOW[name] ?? true };
      } else {
        def = CAT[type]();
        def = { parts: [{ geo: def.geo || bake(def.parts, def.uv), material: def.material || M[def.mat] }], shadow: def.shadow };
      }
      const list = this.sets[type];
      const chunks = new Map();
      for (const it of list) { const k = Math.floor(it[0] / CHUNK) + ',' + Math.floor(it[2] / CHUNK); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push(it); }
      out[type] = [];
      for (const [, items] of chunks) {
        for (const part of def.parts) {
          const im = new THREE.InstancedMesh(part.geo, part.material, items.length);
          items.forEach((it, i) => {
            _e.set(0, it[3], 0); _q.setFromEuler(_e);
            _p.set(it[0], it[1], it[2]); _s.set(it[4], it[5], it[4]);
            im.setMatrixAt(i, _m.compose(_p, _q, _s));
          });
          im.instanceMatrix.needsUpdate = true;
          im.computeBoundingSphere();
          im.castShadow = def.shadow && !part.glow && quality >= 1;
          im.receiveShadow = !part.glow;
          im.userData.items = items;
          this.group.add(im);
          out[type].push(im);
        }
      }
    }
    return out;
  }
}
// KayKit dungeon walls and posts take the photoreal stone; everything else keeps the kit's own look
const STONE_KIT = new Set(['wall', 'wall_arched', 'wall_cracked', 'wall_pillar', 'wall_shelves', 'wall_broken', 'wall_corner', 'wall_endcap', 'stairs', 'stairs_wide']);
function kitMaterial(M, kit, m, type) {
  if (kit === 'dungeon' && type.includes('~cave') && M.caveW) return STONE_KIT.has(m) || m === 'pillar' || m === 'column' ? M.caveW : KITMAT[kit];
  if (kit === 'dungeon' && type.includes('~dwall') && M.dwallW) {
    if (m === 'pillar' || m === 'column') return M.dpostW;
    if (STONE_KIT.has(m)) return M.dwallW;
  }
  if (kit === 'dungeon' && M.wallW) {
    if (m === 'pillar' || m === 'column') return M.postW;
    if (STONE_KIT.has(m)) return M.wallW;
  }
  return KITMAT[kit];
}
// small things on the floor do not need to cast moon shadows
const ENV_SHADOW = { fernA: false, fernB: false, branches: false, stoneA: false, candlestick: false };

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
      const mesh = new THREE.Mesh(geo, M[b.mat] || M.lam);
      mesh.castShadow = quality >= 1 && b.mat !== 'glow';
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }
}

// ---------- unique props ----------
const STONE = 0x6a6862, DSTONE = 0x4a4844, WOOD = 0x5a4030, DWOOD = 0x3a2a1e, IRON = 0x2e2e32;
// photoreal stand-ins for the procedural props: type -> [variants, scale]
const ENV_SWAP = {
  rock: [['rockA', 'rockB', 'rockC', 'boulder', 'stoneB', 'stoneC'], 0.62],
  stone: [['stoneA', 'stoneB', 'stoneC'], 0.5],
  log: [['log'], 1],
  bush: [['fernA', 'fernA', 'fernB'], 1.45],
  fern: [['fernA', 'fernB'], 1],
  branches: [['branches'], 1],
  stump: [['stump'], 1],
  bucket: [['bucket'], 1],
  barrelS: [['barrel'], 1],
  crateS: [['crate'], 1.15]
};
const hash2 = (x, z) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
function addProp(B, I, p, L, rng, out) {
  const { x, z } = p, r = p.r || 0, s = p.s || 1;
  const sw = ENV.ready && ENV_SWAP[p.t];
  if (sw) {
    const name = sw[0][Math.floor(hash2(x, z) * sw[0].length)];
    // the boulder scan is smaller than the moss rocks: lift it to the same size class
    const k = sw[1] * (name === 'boulder' ? 1.3 : 1);
    I.add('env:' + name, x, z, r, s * k, 0);
    return;
  }
  // scanned trees on medium and high quality: fewer of them (each is bigger and bushier), the rest stay procedural
  if (TREE_POOL[p.t] && R.quality >= 1 && ENV.props.treePine && !NO_TREES) {
    const h = hash2(x * 1.7, z * 0.9), d = p.d ?? 2, keep = d <= 1 ? 0.75 : d <= 3 ? 0.6 : 0.4;
    if (h > keep) return;
    const pool = TREE_POOL[p.t], name = pool[Math.floor(hash2(z, x) * pool.length)];
    const k = s * (p.t === 'dead' ? 0.85 : 0.72) * (0.9 + hash2(x + 3, z) * 0.3);
    I.add('tree:' + name, x, z, r, k, (p.y || 0) - 0.05, k * (0.92 + hash2(x, z + 5) * 0.2));
    return;
  }
  switch (p.t) {
    case 'pineS': I.add('pine', x, z, r, s, p.y || 0, s * (0.9 + rng.next() * 0.35)); break;
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
    case 'campfire': case 'firepit': {
      if (ENV.ready) {
        I.add('env:firepit', x, z, r, 1, 0.12);
        B.add('lam', [0.5, -0.7, 1.9].map((a) => ({ geo: G.cyl(0.06, 0.07, 0.9, 5), color: DWOOD, o: { y: 0.16, rz: 1.4, ry: a }, jit: 0.2 })), x, z);
        B.add('glow', [{ geo: G.cyl(0.36, 0.4, 0.04, 9), color: 0xa02a06, o: { y: 0.05 } }, { geo: G.cyl(0.16, 0.2, 0.03, 7), color: 0xff6a18, o: { y: 0.07 } }], x, z);
        out.emitters.push({ x, y: 0.3, z, type: 'fire', s: 1 });
        break;
      }
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
      else if (!ENV.ready) parts.push({ geo: jitter(G.dodeca(0.4), 0.1, 3), color: STONE, o: { y: 0.3, x: 0.9, z: 0.4 } });
      else I.add('env:stoneA', x + Math.cos(r) * 0.9 + Math.sin(r) * 0.4, z - Math.sin(r) * 0.9 + Math.cos(r) * 0.4, r, 0.55);
      B.add(p.dwarf && MAT.snowRock ? 'snowRock' : 'blocks', parts, x, z, r, s);
      break;
    }
    case 'statue':
      if (ENV.ready) {
        if (s !== 1) { B.add(MAT.snowRock ? 'snowRock' : 'blocks', [{ geo: G.box(1.9, 0.5, 1.9), color: DSTONE, o: { y: 0.25 }, ao: 0.5 }], x, z, r, s); I.add('env:statue', x, z, r, 1.05 * s, 0.5 * s); break; }
        B.add('blocks', [{ geo: G.box(1.9, 0.5, 1.9), color: DSTONE, o: { y: 0.25 }, ao: 0.5 }, { geo: G.box(1.7, 0.12, 1.7), color: STONE, o: { y: 0.56 } }], x, z, r);
        I.add('env:statue', x, z, r, 1.05, 0.6);
        break;
      }
      B.add('lam', [
      { geo: G.box(1.3, 0.6, 1.3), color: DSTONE, o: { y: 0.3 } },
      { geo: G.cyl(0.35, 0.6, 1.9, 8), color: STONE, o: { y: 1.55 } },
      { geo: G.ball(0.28, 8, 6), color: STONE, o: { y: 2.75 } },
      { geo: G.cone(0.35, 0.6, 8), color: STONE, o: { y: 2.95, z: -0.05 } },
      { geo: G.box(0.1, 1.6, 0.1), color: 0x5a5a5e, o: { y: 1.6, z: 0.45 } },
      { geo: G.box(0.45, 0.08, 0.1), color: 0x5a5a5e, o: { y: 2.0, z: 0.45 } },
      { geo: G.box(0.75, 0.15, 0.25), color: STONE, o: { y: 2.05, z: 0.3 } }
    ], x, z, r, 1.1); break;
    case 'barrowDoor': {
      B.add('lam', [{ geo: G.dome(7, 0.5, 12), color: 0x2a3220, o: { y: -1.5, z: -3.5, sy: 0.75 }, jit: 0.2 }, { geo: G.box(2.8, 3.2, 0.2), color: 0x020203, o: { y: 1.6, z: -0.2 } }], x, z);
      B.add(MAT.rough ? 'rough' : 'lam', [
        { geo: G.box(1.0, 3.6, 1.0), color: STONE, o: { y: 1.8, x: -1.9 }, jit: 0.1 },
        { geo: G.box(1.0, 3.6, 1.0), color: STONE, o: { y: 1.8, x: 1.9 }, jit: 0.1 },
        { geo: G.box(5.2, 0.9, 1.3), color: DSTONE, o: { y: 3.9 } }
      ], x, z);
      out.emitters.push({ x, y: 1.5, z: z + 0.3, type: 'mist', s: 1 });
      break;
    }
    case 'sarcophagus': B.add(MAT.blocks ? 'blocks' : 'lam', [
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
      B.add(MAT.blocks ? 'blocks' : 'lam', [
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
      B.add(MAT.blocks ? 'blocks' : 'lam', parts, x, z); break;
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
    case 'well': if (MAT.blocks) B.add('blocks', [{ geo: G.cyl(1.1, 1.2, 0.9, 16), color: STONE, o: { y: 0.45 }, ao: 0.9 }, { geo: G.cyl(1.16, 1.16, 0.12, 16), color: DSTONE, o: { y: 0.92 } }], x, z);
      B.add('lam', [
      ...(MAT.blocks ? [] : [{ geo: G.cyl(1.1, 1.2, 0.9, 10), color: STONE, o: { y: 0.45 }, jit: 0.1 }]),
      { geo: G.cyl(0.9, 0.9, 0.05, 10), color: 0x050608, o: { y: MAT.blocks ? 0.99 : 0.88 } },
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
      if (ENV.ready) {
        B.add('lam', [{ geo: G.cyl(0.07, 0.09, 2.6, 6), color: DWOOD, o: { y: 1.3 } }, { geo: G.box(0.62, 0.07, 0.07), color: DWOOD, o: { y: 2.55, x: 0.26 } }, { geo: G.cyl(0.012, 0.012, 0.2, 4), color: IRON, o: { y: 2.43, x: 0.45 } }], x, z);
        I.add('env:lantern', x + 0.45, z, 0, 1, 1.82);
        break;
      }
      B.add('lam', [{ geo: G.cyl(0.07, 0.09, 2.4, 5), color: DWOOD, o: { y: 1.2 } }, { geo: G.box(0.5, 0.06, 0.06), color: DWOOD, o: { y: 2.35, x: 0.2 } }, { geo: G.cone(0.2, 0.15, 4), color: IRON, o: { y: 2.38, x: 0.4 } }], x, z);
      B.add('glow', [{ geo: G.box(0.18, 0.25, 0.18), color: 0xffc070, o: { y: 2.15, x: 0.4 } }], x, z);
      break;
    }
    case 'lantern': I.add('env:lantern', x, z, r, s, p.y || 0); break;
    case 'candlestick': {
      // scanned candlesticks, set in small groups; their flames are tiny glowing cones
      const n = p.n || 1, flames = [];
      for (let i = 0; i < n; i++) {
        const a = i * 2.4 + r, rr = i ? 0.16 : 0, k = (p.s || 2.2) * (1 - i * 0.12), px = x + Math.sin(a) * rr, pz = z + Math.cos(a) * rr;
        if (ENV.ready) I.add('env:candlestick', px, pz, a, k);
        flames.push({ geo: G.cone(0.018 * k, 0.05 * k, 5), color: 0xffc060, o: { x: px - x, z: pz - z, y: 0.222 * k + 0.012 * k } });
      }
      B.add('glow', flames, x, z);
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
      B.add(MAT.rough ? 'rough' : 'lam', [{ geo: G.cyl(5.5, 8.5, 1.6, 12), color: 0x3a3a2e, o: { y: 0.0 }, jit: 0.15 }], x, z);
      B.add(MAT.blocks ? 'blocks' : 'lam', [
        { geo: G.cyl(2.5, 2.9, 7.0, 16), color: 0x7a7468, o: { y: 4.3 }, ao: 6 },
        { geo: G.cyl(3.0, 2.6, 0.6, 16), color: 0x5a564e, o: { y: 7.9 } }
      ], x, z);
      const cren = [];
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; cren.push({ geo: G.box(0.7, 0.7, 0.5), color: 0x6a665c, o: { x: Math.sin(a) * 2.75, z: Math.cos(a) * 2.75, y: 8.5, ry: a } }); }
      cren.push({ geo: G.cyl(1.2, 0.8, 0.8, 8), color: IRON, o: { y: 8.6 } });
      B.add(MAT.blocks ? 'blocks' : 'lam', cren, x, z);
      B.add('glow', [{ geo: G.cyl(1.1, 1.1, 0.1, 8), color: 0xff7020, o: { y: 9.0 } }, { geo: G.box(0.5, 0.9, 0.05), color: 0xffa040, o: { y: 3.0, z: 2.75 } }], x, z);
      out.emitters.push({ x, y: 9.0, z, type: 'beacon', s: 1 });
      break;
    }
    case 'crate': case 'barrel': case 'urn': out.breakables.push(p); break;
    case 'kit': {
      const ks = KIT_SCALE[p.kit] * (p.s || 1);
      const key = 'kit:' + p.kit + '/' + p.m + (p.wall ? '#wall' : p.floor ? '#floor' : '') + (p.skin ? '~' + p.skin : '');
      I.add(key, x, z, r, ks * (p.sx ?? 1), p.y ? p.y : 0, ks * (p.sy ?? 1));
      break;
    }
    // ---------- Act II ----------
    case 'boulder': case 'face': case 'cliff': case 'mount': case 'rubble': {
      const pool = { boulder: ['boulderD', 'rockD', 'rockE', 'rockF'], rubble: ['rockD', 'rockE', 'rockF'], face: ['faceA', 'faceB'], cliff: ['cliffA', 'cliffB', 'mount', 'faceA'], mount: ['mount', 'cliffA'] }[p.t];
      const want = { boulder: 1.5, rubble: 0.7, face: 4.6, cliff: 8.5, mount: 15 }[p.t];
      const name = pool[Math.floor(hash2(x, z) * pool.length)], sz = ENV.sizes[name];
      if (!sz) { I.add(p.t === 'rubble' ? 'stone' : 'rock', x, z, r, s * (p.t === 'boulder' || p.t === 'rubble' ? 1 : 3), p.y || 0); break; }
      const k = want / Math.max(sz[0], sz[2]) * s;
      I.add((p.t === 'rubble' ? 'rockb:' : 'rock:') + name, x, z, r, k, p.y || 0);
      break;
    }
    case 'tuft': I.add(p.t, x, z, r, s, p.y || 0, s); break;
    case 'bridge': {
      // a dwarf-built bridge along z: a deck over the gap, parapets, a dark arch beneath
      const len = p.len || 12, bw = p.w || 3.4, parts = [];
      parts.push({ geo: G.box(bw + 0.6, 1.0, len), color: STONE, o: { y: -0.5 }, ao: 1 });
      for (const sx of [-1, 1]) for (let i = 0; i < Math.floor(len / 1.6); i++) if (i % 3 !== 2) parts.push({ geo: G.box(0.35, 0.65, 1.45), color: DSTONE, o: { x: sx * (bw / 2 + 0.1), y: 0.32, z: -len / 2 + 0.8 + i * 1.6 }, jit: 0.1 });
      for (const sz of [-1, 1]) parts.push({ geo: G.box(bw + 1.4, 1.6, 1.1), color: DSTONE, o: { y: -0.3, z: sz * (len / 2 - 0.2) } });
      parts.push({ geo: G.box(bw + 0.4, 4, len - 2.4), color: 0x2a2826, o: { y: -3 } });
      B.add(MAT.dblocks ? 'dblocks' : MAT.blocks ? 'blocks' : 'lam', parts, x, z, 0);
      break;
    }
    case 'deepgate': {
      // the Great Gate of Deepstone, hewn out of the mountain: stepped jambs, a lintel and pediment carved with runes
      const M2 = MAT.snowRock ? 'snowRock' : 'lam', parts = [];
      for (const sx of [-1, 1]) {
        parts.push({ geo: G.box(3.4, 10.5, 3.6), color: STONE, o: { x: sx * 4.7, y: 5.25 }, ao: 4 });
        parts.push({ geo: G.box(1.2, 9.6, 3.9), color: DSTONE, o: { x: sx * 3.25, y: 4.8 } });
        parts.push({ geo: G.box(4.4, 1.2, 4.6), color: DSTONE, o: { x: sx * 4.7, y: 0.6 } });
        parts.push({ geo: G.box(4.0, 0.8, 4.2), color: STONE, o: { x: sx * 4.7, y: 10.9 } });
      }
      parts.push({ geo: G.box(14, 2.4, 4.2), color: DSTONE, o: { y: 12.3 } }, { geo: prism(15, 3.4, 4.4), color: STONE, o: { y: 13.5 } });
      parts.push({ geo: G.box(6.2, 0.5, 2.6), color: DSTONE, o: { y: 0.25, z: 1.4 } }, { geo: G.box(7.4, 0.3, 3.4), color: STONE, o: { y: 0.15, z: 2.4 } });
      parts.push({ geo: jitter(G.box(34, 18, 7, 6, 4, 2), 0.6, 51), color: 0x3a3a3c, o: { y: 7.5, z: -4.6 } });
      B.add(M2, parts, x, z, 0);
      const runes = [{ geo: G.box(11, 0.12, 0.05), color: 0xffb050, o: { y: 11.4, z: 2.13 } }, { geo: G.box(11, 0.12, 0.05), color: 0xffb050, o: { y: 13.1, z: 2.13 } }];
      for (let i = -4; i <= 4; i++) runes.push({ geo: G.box(0.12, 0.95, 0.05), color: 0xffa040, o: { x: i * 1.2, y: 12.25, z: 2.13, rz: ((i * 7) % 5) * 0.12 - 0.24 } });
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) runes.push({ geo: G.box(0.5, 0.1, 0.05), color: 0xff9030, o: { x: sx * 4.7, y: 2.2 + i * 1.8, z: 1.83, rz: sx * 0.5 } });
      B.add('glow', runes, x, z, 0);
      I.add('rock:mount', x - 16, z - 5, 0.4, 1.5, -1.5);
      I.add('rock:mount', x + 16, z - 5, 2.6, 1.6, -1.5);
      I.add('rock:cliffA', x - 9, z - 7, 0, 1.1, 4);
      I.add('rock:cliffA', x + 9, z - 7, 3.1, 1.1, 4);
      break;
    }
    case 'kingStatue': {
      // a king of the Stoneborn on a stepped plinth, twice the height of a man
      const k = p.s || 1;
      B.add(MAT.dblocks ? 'dblocks' : 'blocks', [{ geo: G.box(3.2, 0.9, 3.2), color: DSTONE, o: { y: 0.45 }, ao: 0.8 }, { geo: G.box(2.6, 0.5, 2.6), color: STONE, o: { y: 1.15 } }], x, z, r, k * 1.1);
      if (ENV.ready && ENV.props.statue) I.add('env:statue', x, z, r, 1.9 * k, 1.4 * k);
      else B.add('lam', [{ geo: G.cyl(0.6, 1.0, 3.2, 8), color: STONE, o: { y: 3 } }, { geo: G.ball(0.5, 8, 6), color: STONE, o: { y: 4.9 } }], x, z, r, k);
      break;
    }
    case 'cairn': {
      const st = ['stoneA', 'stoneB', 'stoneC'];
      if (ENV.ready) for (let i = 0; i < 4; i++) I.add('env:' + st[i % 3], x + Math.sin(i * 2.3) * 0.15, z + Math.cos(i * 2.3) * 0.15, r + i, s * (1.4 - i * 0.25) * 0.55, i * 0.34 * s);
      else B.add('lam', [0, 1, 2].map((i) => ({ geo: jitter(G.dodeca(0.45 - i * 0.1), 0.06, 20 + i), color: 0x6a6862, o: { y: 0.3 + i * 0.5 } })), x, z, r, s);
      break;
    }
    case 'ice': {
      const m = new THREE.Mesh(new THREE.CircleGeometry(s, 36), new (Std())({ color: 0x4a6278, transparent: true, opacity: 0.72, depthWrite: true }));
      if (m.material.isMeshStandardMaterial) { m.material.roughness = 0.22; m.material.metalness = 0.15; m.material.envMapIntensity = 0.9; }
      m.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  float rr = length(vUvI - 0.5) * 2.0; diffuseColor.a *= smoothstep(1.0, 0.82, rr); diffuseColor.rgb *= 0.8 + 0.35 * smoothstep(0.5, 1.0, rr);').replace('#include <common>', '#include <common>\nvarying vec2 vUvI;'); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUvI;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUvI = uv;'); };
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z); m.receiveShadow = true;
      B.group.add(m);
      break;
    }
    case 'bedroll': B.add('lam', [{ geo: G.box(0.9, 0.12, 2.0), color: 0x5a3a2a, o: { y: 0.06 } }, { geo: G.cyl(0.18, 0.18, 0.9, 7), color: 0x6a5040, o: { y: 0.18, z: -0.85, rz: Math.PI / 2 } }], x, z, r); break;
    case 'chandelier': {
      if (ENV.ready && ENV.props.chandelier) I.add('env:chandelier', x, z, r, 2.2, p.y || 5);
      B.add('lam', [{ geo: G.cyl(0.025, 0.025, 6, 4), color: IRON, o: { y: (p.y || 5) + 4.2 } }], x, z);
      break;
    }
    case 'anvilGreat': {
      B.add(MAT.dblocks ? 'dblocks' : 'blocks', [{ geo: G.box(3.4, 0.8, 2.4), color: DSTONE, o: { y: 0.4 } }, { geo: G.box(2.4, 0.4, 1.8), color: STONE, o: { y: 1.0 } }], x, z);
      B.add('lam', [{ geo: G.box(1.2, 0.9, 0.9), color: IRON, o: { y: 1.65 } }, { geo: G.box(2.6, 0.6, 1.0), color: 0x34322e, o: { y: 2.35 } }, { geo: G.cone(0.48, 1.1, 4), color: 0x34322e, o: { y: 2.35, x: 1.75, rz: -1.57 } }], x, z);
      B.add('glow', [{ geo: G.box(2.2, 0.05, 0.8), color: 0xff6a20, o: { y: 2.67 } }], x, z);
      out.emitters.push({ x, y: 2.8, z, type: 'embers', s: 1 });
      break;
    }
    case 'rails': {
      const len = p.len || 8, parts = [];
      for (const sx of [-0.45, 0.45]) parts.push({ geo: G.box(0.07, 0.08, len), color: 0x3a3634, o: { x: sx, y: 0.1 } });
      for (let i = 0; i < Math.floor(len / 0.9); i++) parts.push({ geo: G.box(1.3, 0.08, 0.22), color: DWOOD, o: { y: 0.04, z: -len / 2 + 0.45 + i * 0.9 }, jit: 0.2 });
      B.add('lam', parts, x, z, r);
      break;
    }
    case 'cart': B.add('lam', [
      { geo: G.box(1.0, 0.65, 1.5), color: 0x4a3626, o: { y: 0.62 }, jit: 0.1 }, { geo: G.box(1.06, 0.08, 1.56), color: IRON, o: { y: 0.92 } }, { geo: G.box(1.06, 0.08, 1.56), color: IRON, o: { y: 0.4 } },
      ...[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([wx, wz]) => ({ geo: G.cyl(0.18, 0.18, 0.08, 9), color: 0x2a2826, o: { x: wx, y: 0.22, z: wz, rz: Math.PI / 2 } })),
      { geo: jitter(G.dodeca(0.32), 0.08, 31), color: 0x4a4a50, o: { y: 0.95, x: 0.15 } }, { geo: jitter(G.dodeca(0.26), 0.08, 32), color: 0x55545a, o: { y: 0.98, x: -0.2, z: 0.3 } }
    ], x, z, r); break;
    case 'ore': {
      B.add('lam', [{ geo: jitter(G.dodeca(0.45), 0.1, 40), color: 0x3a3836, o: { y: 0.15, sy: 0.6 } }], x, z, r, s);
      B.add('glow', [0, 1, 2, 3].map((i) => ({ geo: G.cone(0.09 + (i % 2) * 0.04, 0.5 + i * 0.12, 4), color: [0x40d0ff, 0x60e8ff, 0x30b0f0, 0x80f0ff][i], o: { x: Math.sin(i * 1.7) * 0.18, z: Math.cos(i * 1.7) * 0.18, y: 0.4 + i * 0.05, rx: Math.sin(i * 2.1) * 0.5, rz: Math.cos(i * 2.9) * 0.5 } })), x, z, r, s);
      break;
    }
    case 'timber': B.add('lam', [{ geo: G.box(0.24, 3, 0.24), color: DWOOD, o: { x: -1.1, y: 1.5 } }, { geo: G.box(0.24, 3, 0.24), color: DWOOD, o: { x: 1.1, y: 1.5 } }, { geo: G.box(2.7, 0.26, 0.3), color: WOOD, o: { y: 3.05 } }], x, z, r); break;
    case 'ladder': if (ENV.ready && ENV.props.ladder) I.add('env:ladder', x, z, r, 1.6, 0); break;
    case 'fx': out.emitters.push({ x, y: p.y, z, type: p.fx, s: 1 }); break;
  }
}

// ---------- ground ----------
// Photoreal layers per zone: A everywhere, B in patches (noise, edges), P where the layout paints paths.
// s: tile size in metres (the scans' real size, a little enlarged), r: roughness, ns: normal strength.
const GROUND = {
// dual: read the layer twice (two scales/angles) to hide its repeat - only for organic scans; paving would ghost
  forest: { A: 'leaves', B: 'mud', P: 'trail', s: [3.4, 2.1, 2.6], r: [0.95, 0.82, 0.9], ns: 1.0, tint: 0x9a9a8e, dual: [1, 1] },
  town: { A: 'leaves', B: 'mud', P: 'cobble', s: [3.4, 2.1, 1.9], r: [0.95, 0.82, 0.68], ns: 1.0, tint: 0xaaa8a0, dual: [1, 0] },
  crypt: { A: 'flags', B: 'mud', P: 'mcobble', s: [2.4, 2.1, 2.4], r: [0.72, 0.85, 0.8], ns: 1.1, tint: 0xe6e2da, dual: [0, 0] },
  pass: { A: 'snow', B: 'scree', P: 'dslab', s: [3.2, 3.6, 3.2], r: [0.55, 0.9, 0.8], ns: 1.0, tint: 0xe2e6ee, dual: [1, 0] },
  halls: { A: 'dslab', B: 'cave', P: 'herring', s: [3.6, 2.6, 2.2], r: [0.68, 0.9, 0.72], ns: 1.1, tint: 0xd6cec4, dual: [0, 0] }
};
function buildGround(L, group) {
  const { w, h, cells, paint } = L;
  const geo = new THREE.PlaneGeometry(w, h, w, h);
  geo.rotateX(-Math.PI / 2);
  geo.translate(w / 2, 0, h / 2);
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), blend = new Float32Array(n), lay = new Float32Array(n * 4);
  const D = L.dist, crypt = L.type === 'crypt', halls = L.type === 'halls', pass = L.type === 'pass';
  const cellAt = (x, z) => (x < 0 || z < 0 || x >= w || z >= h ? -1 : z * w + x);
  const roomAt = crypt ? new Uint8Array(w * h) : null;
  if (crypt) for (const r of L.rooms) for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) roomAt[z * w + x] = 1;
  const cap = pass ? 12 : 9;
  for (let i = 0; i < n; i++) {
    const vx = Math.round(pos.getX(i)), vz = Math.round(pos.getZ(i));
    let pv = 0, fl = 0, dd = 0, cnt = 0, rm = 0, hole = 0, cave = 0, ave = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const c = cellAt(vx + dx, vz + dz); if (c < 0) { dd += cap; cnt++; continue; }
      pv += paint[c]; fl += cells[c]; dd += Math.min(D[c] === 255 ? cap : D[c], cap); cnt++;
      if (crypt) rm += roomAt[c];
      if (L.low && L.low[c]) hole++;
      if (halls && cells[c]) { cave += L.fk[c] === 2 ? 1 : 0; ave += L.fk[c] === 1 ? 1 : 0; }
    }
    pv /= 4; fl /= 4; dd /= cnt; rm /= 4;
    const nz = fbm(vx * 0.15, vz * 0.15, L.seed || 1);
    const big = fbm(vx * 0.045 + 31, vz * 0.045 - 17, (L.seed || 1) + 5), mac = fbm(vx * 0.09 - 7, vz * 0.09 + 11, (L.seed || 1) + 9);
    let k, wb, wp;
    if (halls) {
      // dressed slabs in the halls, herringbone paving on the king's road, raw rock in the mines; lava sits in cut channels
      let walls = 0;
      for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const c = cellAt(vx + dx, vz + dz); if (c < 0 || (!cells[c] && !(L.low && L.low[c]))) walls++; }
      k = fl > 0 || hole ? 1 - Math.min(walls, 8) * 0.06 : 0;
      if (hole) { k *= 0.35; pos.setY(i, -0.75); }
      const fn = Math.max(1, fl * 4);
      wb = clamp(cave / fn + (nz - 0.55) * 1.2 + walls * 0.04, 0, 1);
      wp = clamp(ave / fn * 1.2, 0, 1);
    } else if (pass) {
      // snow on the road's shoulders, scree up the slopes, the gravel road; the chasm drops away into the dark
      k = fl > 0 ? 0.95 + nz * 0.2 : Math.max(0.35, 0.85 - dd * 0.035);
      wp = clamp(pv * 1.25, 0, 1);
      wb = clamp((fl > 0 ? -0.25 : 0.3 + dd * 0.05) + (nz - 0.5) * 1.6 + (big - 0.5) * 1.4, 0, 0.85);
      if (!fl && !hole) pos.setY(i, Math.min(dd, 10) * 0.55);
      if (hole) { const deep = hole / 4; pos.setY(i, -16 * deep); k *= 1 - 0.9 * deep; wb = 1; }
    } else if (crypt) {
      // rooms are flagged, passages cobbled; dirt drifts in the corners; walls throw a contact shadow
      let walls = 0;
      for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const c = cellAt(vx + dx, vz + dz); if (c < 0 || !cells[c]) walls++; }
      k = fl > 0 ? 1 - Math.min(walls, 8) * 0.06 : 0;
      wp = 1 - rm;
      wb = clamp((nz - 0.5) * 1.6 + walls * 0.05, 0, 0.75);
    } else {
      k = (fl > 0 ? 0.92 + nz * 0.25 : Math.max(0.2, 0.7 - dd * 0.07)) * (L.type === 'town' ? 1.05 : 1);
      wp = clamp(pv * 1.25, 0, 1);
      // damp earth under the trees and in hollows, leaves on the open floor
      wb = clamp((fl > 0 ? 0 : 0.25 + dd * 0.12) + (nz - 0.46) * 2.2 + (big - 0.5) * 2.0, 0, 1);
      if (L.type === 'town') wb = clamp(wb + pv * 0.5 + (fl > 0 ? 0.1 : 0), 0, 1);
    }
    col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k;
    blend[i] = crypt || halls ? clamp((nz - 0.55) * 1.4, 0, 0.5) : clamp(pv * 1.2, 0, 1);
    lay[i * 4] = wb; lay[i * 4 + 1] = wp; lay[i * 4 + 2] = big; lay[i * 4 + 3] = mac;
    if (L.type === 'forest' && !fl) pos.setY(i, Math.min(dd, 5) * 0.06);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const cfg = GROUND[L.type] || GROUND.forest;
  if (ENV.ready && ENV.layers[cfg.A]) {
    geo.setAttribute('aLay', new THREE.BufferAttribute(lay, 4));
    const mesh = new THREE.Mesh(geo, groundMat(cfg, L.type));
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  // procedural fallback (no photoreal set loaded)
  geo.setAttribute('aBlend', new THREE.BufferAttribute(blend, 1));
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

// Three scanned layers blended by height (stones stand out of the mud, mud fills the cobble seams). The base and path
// layers are read twice at different scales and angles and mixed by a large-scale noise so no tile repeats visibly.
function groundMat(cfg, type) {
  const A = ENV.layers[cfg.A], B = ENV.layers[cfg.B], P = ENV.layers[cfg.P];
  const nrm = !!(A.n && B.n && P.n);
  const m = new (Std())({ vertexColors: true, color: cfg.tint });
  if (m.isMeshStandardMaterial) { m.roughness = 0.9; m.metalness = 0; m.envMapIntensity = 0.2; }
  const uni = {
    tA: { value: A.d }, tB: { value: B.d }, tP: { value: P.d }, tAn: { value: A.n }, tBn: { value: B.n }, tPn: { value: P.n },
    uS: { value: new THREE.Vector3(1 / cfg.s[0], 1 / cfg.s[1], 1 / cfg.s[2]) }, uR: { value: new THREE.Vector3(...cfg.r) }, uNS: { value: cfg.ns }
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    // the anti-repeat second reading is a desktop luxury (quality 2); phones get one reading per layer
    const dual = R.quality >= 2;
    sh.defines = Object.assign(sh.defines || {}, nrm ? { G_NRM: '' } : {}, dual && cfg.dual[0] ? { G_DA: '' } : {}, dual && cfg.dual[1] ? { G_DP: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aLay;\nvarying vec4 vLay;\nvarying vec2 vGP;\nvarying vec3 vGN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLay = aLay; vGP = (modelMatrix * vec4(transformed, 1.0)).xz; vGN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tP; uniform sampler2D tAn; uniform sampler2D tBn; uniform sampler2D tPn;
uniform vec3 uS; uniform vec3 uR; uniform float uNS;
varying vec4 vLay; varying vec2 vGP; varying vec3 vGN;
float gH(vec3 c) { return sqrt(dot(c, vec3(0.3, 0.55, 0.15))); }`)
      .replace('#include <map_fragment>', `
  // a slow warp from the large-scale noise slides the organic layers around so their tiles never line up in rows
  vec2 gw = (vLay.zw - 0.5) * vec2(1.0, 0.6);
  vec2 uA = vGP * uS.x + gw, uA2 = mat2(0.8, -0.6, 0.6, 0.8) * vGP * (uS.x * 0.73) + vec2(0.31, 0.57);
  vec2 uB = vGP * uS.y - gw.yx;
  vec2 uP = vGP * uS.z, uP2 = mat2(0.8, 0.6, -0.6, 0.8) * vGP * (uS.z * 0.77) + vec2(0.63, 0.12);
  float gm = smoothstep(0.38, 0.62, vLay.z);
#ifdef G_DA
  vec3 cA = mix(texture2D(tA, uA).rgb, texture2D(tA, uA2).rgb, gm);
#else
  vec3 cA = texture2D(tA, uA).rgb;
#endif
  vec3 cB = texture2D(tB, uB).rgb;
#ifdef G_DP
  vec3 cP = mix(texture2D(tP, uP).rgb, texture2D(tP, uP2).rgb, gm);
#else
  vec3 cP = texture2D(tP, uP).rgb;
#endif
  float hA = gH(cA), hB = gH(cB), hP = gH(cP);
  float wB = smoothstep(-0.15, 0.15, vLay.x * 2.0 - 1.1 + (hB - hA) * 1.3);
  vec3 gc = mix(cA, cB, wB); float gh = mix(hA, hB, wB);
  float wP = smoothstep(-0.15, 0.15, vLay.y * 2.0 - 1.3 + (hP - gh) * 1.2);
  gc = mix(gc, cP, wP); gh = mix(gh, hP, wP);
  diffuseColor.rgb *= gc * (0.82 + 0.36 * vLay.w);`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(mix(mix(uR.x, uR.y, wB), uR.z, wP) * (1.12 - 0.25 * gh), 0.3, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#ifdef G_NRM
  // the second readings are rotated: turn their tangent-space xy back into the first frame
  vec3 nA = texture2D(tAn, uA).xyz * 2.0 - 1.0, nP = texture2D(tPn, uP).xyz * 2.0 - 1.0;
#ifdef G_DA
  vec3 nA2 = texture2D(tAn, uA2).xyz * 2.0 - 1.0; nA2.xy = nA2.xy * mat2(0.8, -0.6, 0.6, 0.8); nA = mix(nA, nA2, gm);
#endif
#ifdef G_DP
  vec3 nP2 = texture2D(tPn, uP2).xyz * 2.0 - 1.0; nP2.xy = nP2.xy * mat2(0.8, 0.6, -0.6, 0.8); nP = mix(nP, nP2, gm);
#endif
  vec3 nB = texture2D(tBn, uB).xyz * 2.0 - 1.0;
  vec3 tn = mix(mix(nA, nB, wB), nP, wP); tn.xy *= uNS;
  vec3 gN = normalize(vGN), gT = normalize(vec3(1.0, 0.0, 0.0) - gN * gN.x), gB = cross(gN, gT);
  normal = normalize((viewMatrix * vec4(normalize(gT * tn.x + gB * tn.y + gN * tn.z), 0.0)).xyz);
#endif`);
  };
  m.customProgramCacheKey = () => 'groundPBR|' + type + (nrm ? '|n' : '') + '|q' + R.quality;
  return m;
}

// ---------- lava: a sheet in the cut channels, its crust cracked and glowing, drifting slowly ----------
function buildLava(L, group) {
  const { w, h } = L, pos = [];
  // each lava cell's quad reaches half a cell past it: the sloped channel edges then cut the outline, not the grid
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    if (!L.lava[z * w + x]) continue;
    const y = -0.32, x0 = x - 0.5, z0 = z - 0.5, x1 = x + 1.5, z1 = z + 1.5;
    pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const crust = ENV.layers.lava?.d;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  mat.toneMapped = false; // keep the glow saturated: ACES would wash it out to straw
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.tCrust = { value: crust || null };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform sampler2D tCrust; varying vec2 vLP;
float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ln(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(lh(i), lh(i + vec2(1, 0)), f.x), mix(lh(i + vec2(0, 1)), lh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `
  vec2 q = vLP * 0.22;
  float t = uTime;
  float heat = ln(q * 3.0 + vec2(t * 0.11, -t * 0.07)) * 0.6 + ln(q * 7.0 - vec2(t * 0.05, t * 0.13)) * 0.4;
  ${crust ? `vec3 c1 = texture2D(tCrust, q * 0.9 + vec2(t * 0.012, t * 0.006)).rgb, c2 = texture2D(tCrust, q * 0.6 - vec2(t * 0.008, -t * 0.01) + 0.37).rgb;
  float crack = max(clamp((c1.r - c1.b) * 2.6 - 0.15, 0.0, 1.0), clamp((c2.r - c2.b) * 2.6 - 0.15, 0.0, 1.0) * 0.7);
  float crustK = smoothstep(0.3, 0.62, 1.0 - heat) * (1.0 - crack);` : 'float crack = heat; float crustK = 1.0 - smoothstep(0.35, 0.7, heat);'}
  vec3 hot = mix(vec3(0.95, 0.2, 0.02), vec3(1.0, 0.62, 0.16), smoothstep(0.6, 1.0, heat + crack * 0.35));
  ${crust ? 'vec3 crustC = c1 * vec3(0.32, 0.26, 0.24);' : 'vec3 crustC = vec3(0.06, 0.04, 0.03);'}
  vec3 col = mix(hot * (0.95 + 0.15 * sin(t * 1.7 + vLP.x * 0.4)), crustC + hot * 0.05, crustK * 0.95);
  diffuseColor.rgb = col;`);
  };
  mat.customProgramCacheKey = () => 'lava' + (crust ? 'c' : '');
  const mesh = new THREE.Mesh(geo, mat);
  geo.computeBoundingSphere();
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
  mats();
  out.ground = buildGround(L, group);
  if (L.lava) out.lava = buildLava(L, group);
  for (const p of L.props) addProp(B, I, p, L, rng, out);
  const inst = I.build(quality);
  B.build(quality);
  const cut = [];
  for (const k in inst) if (k.includes('#wall')) cut.push(...inst[k]);
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
