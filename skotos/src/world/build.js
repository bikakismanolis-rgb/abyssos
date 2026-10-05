// Turns a layout into meshes: textured ground, instanced foliage and walls, merged static props.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, LIGHTS, beatPulse } from '../gfx/gfx.js';
import { FX, puff, sapBurst } from '../gfx/fx.js';
import { CREATURES, creatureModel, hasCreature } from '../gfx/creatures.js';
import { heartWallH } from './gen3.js';
import { tex } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { RNG, fbm, clamp, smooth } from '../core/util.js';
import { KIT, KITMAT, KIT_SCALE } from '../gfx/kits.js';
import { ENV } from '../gfx/env.js';

// uWind: amplitude of all tree and grass sway (Act III's Still Wood sets 0 until the First Autumn). uEdge (z0, z1): south of
// z1 the wind blows whatever uWind says, fading out by z0 (the Edge of Tears); (0, 0) is off. uAutumn: see setAutumn().
export const WIND = { uTime: { value: 0 }, uHero: { value: new THREE.Vector3(0, 0, -999) }, uSnow: { value: 0 }, uWind: { value: 1 }, uEdge: { value: new THREE.Vector2(0, 0) }, uAutumn: { value: 0 } };
const WIND_GLSL = `uniform float uWind; uniform vec2 uEdge;
float windK(float z) { return uEdge.y > uEdge.x ? mix(uWind, 1.0, smoothstep(uEdge.x, uEdge.y, z)) : uWind; }`;

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
    sh.uniforms.uWind = WIND.uWind; sh.uniforms.uEdge = WIND.uEdge;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\n' + WIND_GLSL)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 ip = vec3(0.0);
#endif
  float hgt = max(position.y, 0.0);
  float sway = (sin(uTime * 1.3 + ip.x * 0.37 + ip.z * 0.29) * 0.045 + sin(uTime * 2.9 + ip.x * 1.3) * 0.015) * windK(ip.z);
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
  if (!MAT.woodDone && ENV.packs.wood) {
    MAT.woodDone = true;
    MAT.mossW = worldMat('stonemoss', { scale: 3.9, tri: true, rough: 0.88, tint: 0xd0ccc0 });
    MAT.rootW = worldMat('rootwall', { scale: 2.2, tri: true, rough: 0.9, tint: 0xc0b098 });
  }
  if (!MAT.barkW && ENV.layers.bark) MAT.barkW = worldMat('bark', { scale: 1.8, tri: true, rough: 0.9, tint: 0xb0a088 });
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
  torchBracket: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.box(0.1, 0.25, 0.1), color: 0x2a2a2a, o: { y: 1.6 } }, { geo: G.cyl(0.04, 0.03, 0.5, 5), color: 0x4a3020, o: { y: 1.8, z: 0.15, rx: 0.5 } }] }),
  // ---------- Act III ----------
  goak: () => ({ mat: 'wind', shadow: true, parts: [
    { geo: G.cyl(0.16, 0.3, 2.4, 6), color: 0x4a3a2c, o: { y: 1.2 } },
    { geo: G.segTo(0.8, 1.0, 0.2, 0.1, 0.05, 4), color: 0x4a3a2c, o: { y: 1.9 } },
    { geo: G.segTo(-0.7, 1.1, -0.3, 0.1, 0.05, 4), color: 0x4a3a2c, o: { y: 2.0 } },
    { geo: jitter(G.ico(1.3, 0), 0.15, 4), color: 0x9a6c1c, o: { y: 3.3, sy: 0.8 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.95, 0), 0.12, 5), color: 0xa87a22, o: { y: 2.9, x: 0.9, z: 0.3, sy: 0.85 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.9, 0), 0.12, 6), color: 0x86581a, o: { y: 3.0, x: -0.8, z: -0.4, sy: 0.85 }, jit: 0.3, soft: 0.7 },
    { geo: jitter(G.ico(0.8, 0), 0.1, 7), color: 0xb88a2c, o: { y: 3.9, x: 0.2, z: -0.5 }, jit: 0.3, soft: 0.7 }
  ] }),
  strands: () => ({ material: strandMat(), shadow: false, geo: strandGeo() }),
  cocoonShell: () => ({ material: MAT.cocoon ||= amberMat({ alpha: 0.5, glow: 0.8 }), shadow: false, geo: cocoonGeo() }),
  cocoonCore: () => ({ mat: 'lam', shadow: false, parts: figureParts(0x2a1608, 1.55, 0.35) }),
  // three roots twisted round each other, rising out of the wall into the dark
  rootPillar: () => ({ mat: 'rootW', shadow: true, parts: [0, 1, 2].map((i) => {
    const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8, a = i * 2.09 + t * 4.2, r = 0.42 + 0.2 * Math.sin(t * 7 + i); pts.push([Math.sin(a) * r, -0.6 + t * 10, Math.cos(a) * r]); }
    return { geo: rootGeo(pts, 0.5 - i * 0.08, 0.22, 26, 7, 3), color: 0x6a5a48, o: {} };
  }) }),
  saplingG: () => ({ mat: 'wind', shadow: false, parts: saplingParts(0x5a4a34, [0x8a8a34, 0xa89a3c, 0x7a7a2c]) })
};

// ---------- scanned trees (trees.glb): their own materials plus wind, the cutaway fade and snow on the pass ----------
// variants: '' as scanned; 'gold' the Weeping Woods' held autumn (leaves turned gold); 'pale' bone-grey dead wood;
// 'white' the white tree the Hart becomes (bark bone-white, leaves pale gold)
const TREE_MAT = new Map();
const TREE_VAR = {
  gold: { leaf: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, tl * vec3(2.25, 1.38, 0.4), 0.88);', bark: 'diffuseColor.rgb *= vec3(1.06, 0.98, 0.88);' },
  pale: { leaf: '', bark: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, tl * vec3(2.1, 2.0, 1.85), 0.85);' },
  white: { leaf: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = clamp(tl * 3.0, 0.5, 1.2) * vec3(0.95, 0.88, 0.62);', bark: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = clamp(tl * 5.0, 0.55, 1.15) * vec3(0.86, 0.84, 0.78);' }
};
function treeMat(src, variant = '') {
  const cache = TREE_MAT.get(src) || {}; TREE_MAT.set(src, cache);
  if (cache[variant]) return cache[variant];
  const m = src.clone();
  const leaf = m.alphaTest > 0, V = TREE_VAR[variant];
  // the scans were shot in daylight: trunks read too pale in a night forest
  m.color.multiplyScalar(leaf ? 0.82 : 0.55);
  occlude(m, (sh) => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uSnow = WIND.uSnow; sh.uniforms.uWind = WIND.uWind; sh.uniforms.uEdge = WIND.uEdge;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vTH;\nvarying vec3 vTWN;\n' + WIND_GLSL)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 tip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 tip = vec3(0.0);
#endif
  float th = max(position.y, 0.0);
  vTH = th;
  float twk = windK(tip.z);
  float tsw = (sin(uTime * 1.1 + tip.x * 0.37 + tip.z * 0.29) * 0.018 + sin(uTime * 2.6 + tip.x * 1.3) * 0.006) * th * th * 0.18 * twk;
  transformed.x += tsw; transformed.z += tsw * 0.6;
  ${leaf ? 'transformed.xz += vec2(sin(uTime * 4.0 + position.y * 3.0 + tip.x), cos(uTime * 3.3 + position.x * 2.0 + tip.z)) * 0.025 * min(th, 3.0) * twk;' : ''}`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvTWN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSnow;\nvarying float vTH;\nvarying vec3 vTWN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
  if (uSnow > 0.0) {
    float up = ${leaf ? 'abs(normalize(vTWN).y)' : 'normalize(vTWN).y'};
    float sn = uSnow * clamp(smoothstep(0.25, 0.75, up) * 0.85 + smoothstep(2.0, 7.0, vTH) * 0.25, 0.0, 0.9);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.95), sn);
  }
  ${V ? (leaf ? V.leaf : V.bark) : ''}`);
  });
  m.customProgramCacheKey = () => 'tree|' + (leaf ? 'leaf' : 'bark') + '|' + m.type + '|' + variant;
  cache[variant] = m;
  return m;
}
const NO_TREES = typeof location !== 'undefined' && location.search.includes('notrees');
const TREE_POOL = { pine: ['treePine', 'treePine', 'treeSpruce'], pineS: ['treePine', 'treeSpruce', 'treeFir'], oak: ['treeOak', 'treeBeech', 'treeOak'], dead: ['treeDead'], goak: ['treeOak', 'treeBeech', 'treeOak'] };

// ---------- instanced chunks ----------
class Instancer {
  constructor(group) { this.group = group; this.sets = {}; }
  add(type, x, z, ry = 0, s = 1, y = 0, sy, sz) {
    (this.sets[type] ||= []).push([x, y, z, ry, s, sy ?? s, sz ?? s]);
  }
  build(quality) {
    const M = mats(), out = {};
    for (const type in this.sets) {
      let def;
      if (type.startsWith('tree:')) {
        const [name, variant] = type.slice(5).split('@'), parts = ENV.props[name];
        if (!parts) { console.warn('missing tree', type); continue; }
        def = { parts: parts.map((p) => ({ geo: p.geo, material: treeMat(p.mat, variant) })), shadow: quality >= 2 };
      } else if (type.startsWith('stone:') || type.startsWith('bark:') || type.startsWith('roots:')) {
        // Act III: scans given the game's own surface (moss stone, bark, root wall), projected in world space
        const k = type.slice(0, type.indexOf(':')), name = type.slice(k.length + 1), parts = ENV.props[name];
        if (!parts) { console.warn('missing prop', name); continue; }
        const mat = (k === 'stone' ? M.mossW : k === 'bark' ? M.barkW : M.rootW) || M.rockW || M.lam;
        def = { parts: parts.map((p) => ({ geo: p.geo, material: mat })), shadow: true };
      } else if (type.startsWith('seed:')) {
        // the Evergreen's seed-lanterns: the lantern scan with a green-gold glow that goes out with the First Autumn
        const parts = ENV.props[type.slice(5)];
        if (!parts) continue;
        def = { parts: parts.map((p) => ({ geo: p.geo, material: p.mat.transparent ? seedGlow() : p.mat, glow: p.mat.transparent })), shadow: false };
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
        def = { parts: [{ geo: def.geo || bake(def.parts, def.uv), material: def.material || M[def.mat] || M.lam }], shadow: def.shadow };
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
            _p.set(it[0], it[1], it[2]); _s.set(it[4], it[5], it[6] ?? it[4]);
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
const ENV_SHADOW = { fernA: false, fernB: false, fern: false, branches: false, stoneA: false, candlestick: false, mushrooms: false };

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
  // the Weeping Woods' undergrowth (wood pack): autumn bracken and rosemary willow shrubs (the shrubs give way to bracken
  // on low quality); without the pack they are the summer ferns
  if (p.t === 'bracken' || p.t === 'shrub') {
    const name = p.t === 'shrub' && R.quality >= 1 && ENV.props.shrub ? 'shrub' : ENV.props.fern ? 'fern' : null;
    if (name) I.add('env:' + name, x, z, r, s * (name === 'fern' ? 1.35 : 0.85), 0);
    else addProp(B, I, { ...p, t: 'bush' }, L, rng, out);
    return;
  }
  const sw = ENV.ready && ENV_SWAP[p.t];
  if (sw) {
    const name = sw[0][Math.floor(hash2(x, z) * sw[0].length)];
    // the boulder scan is smaller than the moss rocks: lift it to the same size class
    const k = sw[1] * (name === 'boulder' ? 1.3 : 1);
    I.add('env:' + name, x, z, r, s * k, 0);
    return;
  }
  // the Weeping Woods' willows (wood pack): those that stand in a clearing always, the forest's thinned like the oaks
  if (p.t === 'willow' && ENV.props.willow && !NO_TREES) {
    const d = p.d ?? 2;
    if (d > 1 && hash2(x * 1.7, z * 0.9) > (d <= 3 ? 0.5 : 0.25)) return;
    const k = s * (0.85 + hash2(x + 3, z) * 0.25);
    I.add('tree:willow', x, z, r, k, -0.1, k * (0.92 + hash2(x, z + 5) * 0.2));
    return;
  }
  // scanned trees on medium and high quality: fewer of them (each is bigger and bushier), the rest stay procedural
  if (TREE_POOL[p.t] && R.quality >= 1 && ENV.props.treePine && !NO_TREES) {
    const h = hash2(x * 1.7, z * 0.9), d = p.d ?? 2, keep = d <= 1 ? 0.75 : d <= 3 ? 0.6 : 0.4;
    if (h > keep) return;
    const pool = TREE_POOL[p.t], name = pool[Math.floor(hash2(z, x) * pool.length)];
    const k = s * (p.t === 'dead' ? 0.85 : 0.72) * (0.9 + hash2(x + 3, z) * 0.3);
    const v = p.t === 'goak' ? '@gold' : p.t === 'dead' && (p.pale || L.type === 'weep') ? '@pale' : '';
    I.add('tree:' + name + v, x, z, r, k, (p.y || 0) - 0.05, k * (0.92 + hash2(x, z + 5) * 0.2));
    // some of the gold oaks weep too: strands of gold leaves hang from their crowns
    if (p.t === 'goak' && d <= 3 && hash2(x * 3.1, z * 2.3) < 0.3) I.add('strands', x, z, r, k / 0.79, 0);
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
      // Halda's forge (tools/pack-village.mjs): the hearth glows, the chimney smokes
      if (ENV.props.sForge) {
        I.add('env:sForge', x, z, r, 1, 0);
        const cs = Math.cos(r), sn = Math.sin(r), hx = 0.1, hz = 0.5;
        out.emitters.push({ x: x + hx * cs + hz * sn, y: 1.4, z: z - hx * sn + hz * cs, type: 'embers', s: 1 });
        out.emitters.push({ x: x - 0.4 * sn, y: 4.6, z: z - 0.4 * cs, type: 'smoke', s: 1 });
        break;
      }
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
    case 'anvil': if (ENV.props.sAnvil) { I.add('env:sAnvil', x, z, r || 0.4, 1, 0); break; } B.add('lam', [{ geo: G.box(0.35, 0.5, 0.35), color: DWOOD, o: { y: 0.25 } }, { geo: G.box(0.75, 0.22, 0.32), color: IRON, o: { y: 0.6 } }, { geo: G.cone(0.14, 0.35, 4), color: IRON, o: { y: 0.62, x: 0.5, rz: -1.57 } }], x, z, 0.4); break;
    case 'healtent': {
      // Elianthe's corner: her tent, an awning over the table of draughts
      if (ENV.props.sTent && ENV.props.sAwning) {
        const cs = Math.cos(r), sn = Math.sin(r), at = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
        I.add('env:sTent', ...at(-1.2, -0.6), r + 0.3, 1, 0);
        I.add('env:sAwning', ...at(0.4, 1.9), r, 1, 0);
        B.add('lam', [
          { geo: G.box(1.8, 0.1, 0.8), color: WOOD, o: { y: 0.85, z: 2.2 } },
          { geo: G.box(0.1, 0.85, 0.1), color: DWOOD, o: { y: 0.42, z: 2.2, x: 0.8 } },
          { geo: G.box(0.1, 0.85, 0.1), color: DWOOD, o: { y: 0.42, z: 2.2, x: -0.8 } }
        ], x, z, r);
      } else B.add('lam', [
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
    case 'well': if (ENV.props.sWell) { I.add('env:sWell', x, z, r || 0.3, 1, 0); B.add('lam', [{ geo: G.cyl(0.62, 0.62, 0.04, 14), color: 0x050608, o: { y: 0.9 } }], x, z); break; }
      if (MAT.blocks) B.add('blocks', [{ geo: G.cyl(1.1, 1.2, 0.9, 16), color: STONE, o: { y: 0.45 }, ao: 0.9 }, { geo: G.cyl(1.16, 1.16, 0.12, 16), color: DSTONE, o: { y: 0.92 } }], x, z);
      B.add('lam', [
      ...(MAT.blocks ? [] : [{ geo: G.cyl(1.1, 1.2, 0.9, 10), color: STONE, o: { y: 0.45 }, jit: 0.1 }]),
      { geo: G.cyl(0.9, 0.9, 0.05, 10), color: 0x050608, o: { y: MAT.blocks ? 0.99 : 0.88 } },
      { geo: G.box(0.15, 2.2, 0.15), color: DWOOD, o: { x: 1.0, y: 1.1 } },
      { geo: G.box(0.15, 2.2, 0.15), color: DWOOD, o: { x: -1.0, y: 1.1 } },
      { geo: G.cyl(0.07, 0.07, 2.1, 5), color: WOOD, o: { y: 1.9, rz: 1.57 } },
      { geo: prism(2.6, 0.8, 1.6), color: 0x3a3028, o: { y: 2.2 } }
    ], x, z); break;
    case 'stash': if (ENV.props.chest && ENV.props.chestLid) {
      // the stash is the iron-bound chest of the dungeons, a size up
      const k = 1.3, pv = ENV.pivots.chestLid || new THREE.Vector3(), cs = Math.cos(r), sn = Math.sin(r);
      I.add('env:chest', x, z, r, k, 0);
      I.add('env:chestLid', x + (pv.x * cs + pv.z * sn) * k, z + (-pv.x * sn + pv.z * cs) * k, r, k, pv.y * k);
      break;
    } B.add('lam', [
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
    case 'stall': if (ENV.props.sStall) { I.add('env:sStall', x, z, r, 1, 0); break; } B.add('lam', [
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
    case 'envp': if (ENV.props[p.m]) I.add('env:' + p.m, x, z, r, s, p.y || 0); break;
    case 'bld': {
      // a village house (tools/pack-village.mjs), its own meshes so it can fade when the hero walks behind it
      if (!ENV.props[p.m]) { I.add('kit:town/' + p.kit, x, z, r, KIT_SCALE.town * (p.s || 1)); break; }
      const g = new THREE.Group(), u = { value: 1 };
      for (const part of ENV.props[p.m]) g.add(fadeMesh(part, u));
      g.position.set(x, 0, z); g.rotation.y = r;
      out.group.add(g);
      const size = ENV.sizes[p.m] || [p.hw * 2, 8, p.hd * 2], ch = ENV.extras[p.m]?.chimney;
      if (ch) { const cs = Math.cos(r), sn = Math.sin(r); out.emitters.push({ x: x + ch[0] * cs + ch[2] * sn, y: ch[1], z: z - ch[0] * sn + ch[2] * cs, type: 'smoke', s: 1 }); }
      (out.houses ||= []).push({ x, z, r, hw: p.hw, hd: p.hd, h: size[1], u });
      if (p.m === 'hMill' && ENV.props.hSails) {
        const sails = new THREE.Group();
        for (const part of ENV.props.hSails) sails.add(fadeMesh(part, u));
        if (ENV.pivots.hSails) sails.position.copy(ENV.pivots.hSails);
        g.add(sails);
        (out.spin ||= []).push({ o: sails, v: 0.45 });
      }
      break;
    }
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
    case 'fx': out.emitters.push({ x, y: p.y, z, type: p.fx, s: p.s || 1, color: p.color, autumn: p.autumn }); break;
    // ---------- Act III ----------
    case 'goak': case 'willow': I.add('goak', x, z, r, s, 0, s * (0.9 + rng.next() * 0.35)); break;
    case 'wtree': {
      // a rooted Evergreen: a gold oak, and at its foot a man or woman half grown into the bark
      if (ENV.props.treeOak && R.quality >= 1 && !NO_TREES) { const k = s * 0.78; I.add('tree:' + (hash2(x, z) < 0.5 ? 'treeOak' : 'treeBeech') + '@gold', x, z, r + 1.3, k, -0.05, k * 1.05); }
      else I.add('goak', x, z, r, s);
      if (ENV.props.statue) I.add('bark:statue', x + Math.sin(r) * 0.5, z + Math.cos(r) * 0.5, r, 0.95 * s, -0.3);
      break;
    }
    case 'tearTree':
      if (ENV.props.treeDead && R.quality >= 1 && !NO_TREES) I.add('tree:treeDead@pale', x, z, r, s * 0.85, -0.05, s * 0.95);
      else I.add('dead', x, z, r, s * 1.2);
      break;
    case 'kneeler':
      // one of the Evergreen who knelt where they grieved and took root: sunk to the waist, roots at the knees
      if (ENV.props.statue) I.add('bark:statue', x, z, r, s, -0.75 * s);
      if (ENV.props.giantRoot) I.add(MAT.rootW ? 'roots:giantRoot' : 'env:giantRoot', x, z, r + Math.PI, 0.32 * s, -0.08);
      break;
    case 'groot': if (ENV.props.giantRoot) I.add(MAT.rootW ? 'roots:giantRoot' : 'env:giantRoot', x, z, r, s, p.y || 0); else I.add('rock', x, z, r, s); break;
    case 'rcluster': if (ENV.props.rootCluster) { I.add(MAT.rootW ? 'roots:rootCluster' : 'env:rootCluster', x, z, r, s, p.y || 0); break; } // falls through to a stump
    case 'ostump': if (ENV.props.stumpOld) I.add(MAT.rootW ? 'roots:stumpOld' : 'env:stumpOld', x, z, r, s, p.y || 0); else I.add('rock', x, z, r, s * 0.8); break;
    case 'wallRoot': {
      // a root pouring down out of the wall onto the floor (local +z is toward the floor)
      const rr = RNG(Math.round(x * 31 + z * 17)), parts = [];
      for (let i = 0; i < rr.int(2, 4); i++) {
        const ox = rr.range(-1, 1), top = rr.range(2.2, 3.8);
        parts.push({ geo: rootGeo(bend(rr, [ox, top, -2.0], [ox + rr.range(-1, 1), 0.05, rr.range(0.2, 1.2)], 4, 0.45), rr.range(0.2, 0.42), 0.05, 12, 7, rr.int(0, 2)), color: 0x6a5a48, o: {} });
      }
      B.add(MAT.rootW ? 'rootW' : 'lam', parts, x, z, r, s);
      break;
    }
    case 'mush': if (ENV.props.mushrooms) I.add('env:mushrooms', x, z, r, s, 0); else { I.add('shroom', x, z, r, s * 1.5); I.add('shroomCap', x, z, r, s * 1.5); } break;
    case 'menhir': if (ENV.props.standingStoneB) I.add('stone:standingStoneB', x, z, r, s, -0.12); else I.add('rock', x, z, r, s * 1.6); break;
    case 'mound': B.add('lam', [
      { geo: jitter(G.dome(0.9, 0.5, 9), 0.12, 70), color: 0x3a2a1c, o: { sy: 0.55 }, jit: 0.2 },
      ...[0, 1, 2].map((i) => ({ geo: G.segTo(Math.sin(i * 2.3) * 0.9, 0.12, Math.cos(i * 2.3) * 0.9, 0.08, 0.02, 4), color: 0x5a4632, o: { y: 0.3 } })),
      { geo: jitter(G.dodeca(0.16), 0.05, 71), color: 0x4a4038, o: { x: 0.6, y: 0.08, z: 0.3 } }
    ], x, z, r, s); break;
    case 'lanternPost': {
      B.add(MAT.barkW ? 'barkW' : 'lam', [{ geo: jitter(G.cyl(0.07, 0.11, 2.7, 6), 0.02, 72), color: DWOOD, o: { y: 1.35 } }, { geo: G.segTo(0.62, 0.22, 0, 0.05, 0.035, 5), color: DWOOD, o: { y: 2.45 } }], x, z, r);
      const cs = Math.cos(r), sn = Math.sin(r);
      if (ENV.props.lantern) I.add('seed:lantern', x + 0.58 * cs, z - 0.58 * sn, r, 1.1, 1.8);
      out.emitters.push({ x: x + 0.58 * cs, y: 2.1, z: z - 0.58 * sn, type: 'motes', s: 0.6, autumn: true });
      break;
    }
    case 'rootArch': rootArch(out, x, z); break;
    case 'cocoon': I.add('cocoonCore', x, z, r, s); I.add('cocoonShell', x, z, r, s); break;
    case 'songStone': {
      // a song-stone: its runes still hum
      if (ENV.props.standingStoneB) I.add('stone:standingStoneB', x, z, r, s, -0.1); else I.add('rock', x, z, r, s * 1.6);
      B.add('glow', [0, 1, 2, 3, 4].map((i) => ({ geo: G.box(0.05, 0.22 + (i % 2) * 0.12, 0.03), color: 0xffc060, o: { x: (i % 3 - 1) * 0.22, y: 0.7 + i * 0.36, z: 0.36, rz: ((i * 7) % 5) * 0.2 - 0.4 } })), x, z, r, s);
      break;
    }
    case 'heartDais': {
      // the root dais under the amber heart: a boss of woven root, ribs running out across the floor
      const ribs = [], rr = RNG(29);
      for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + rr.range(-0.15, 0.15), l = rr.range(3.2, 5.2), b = a + rr.range(-0.4, 0.4); ribs.push({ geo: rootGeo(bend(rr, [Math.sin(a) * 2.1, 0.75, Math.cos(a) * 2.1], [Math.sin(b) * (2.1 + l), -0.1, Math.cos(b) * (2.1 + l)], 4, 0.35), rr.range(0.3, 0.45), 0.06, 14, 7, 1), color: 0x5a4a38, o: {} }); }
      B.add(MAT.rootW ? 'rootW' : 'lam', [{ geo: jitter(G.cyl(2.7, 3.2, 0.9, 16), 0.12, 73), color: 0x6a5844, o: { y: 0.45 } }, { geo: jitter(G.cyl(2.2, 2.6, 0.3, 14), 0.08, 74), color: 0x5a4a38, o: { y: 0.95 } }, ...ribs], x, z);
      break;
    }
    case 'rootPillar': I.add('rootPillar', x, z, r, s, p.y || 0); break;
    case 'rootStair': {
      // the way up out of the Heartwood: steps of root, daylight falling down them
      const parts = [];
      for (let i = 0; i < 5; i++) parts.push({ geo: jitter(G.cyl(0.32, 0.36, 6.4, 7), 0.05, 75 + i), color: 0x5a4a38, o: { y: 0.15 + i * 0.32, z: i * 0.75, rz: Math.PI / 2 } });
      B.add(MAT.barkW ? 'barkW' : 'lam', parts, x, z);
      out.emitters.push({ x, y: 2.5, z: z + 1, type: 'motes', s: 2, color: 0xfff0c0 });
      break;
    }
    case 'sapling': I.add('saplingG', x, z, r, s); break;
    case 'nameStone':
      B.add('lam', [{ geo: jitter(G.box(0.36, 0.26, 0.1), 0.02, 76), color: 0x6a665c, o: { y: 0.1, rx: -0.35 } }], x, z, r);
      B.add('glow', [{ geo: G.box(0.2, 0.025, 0.02), color: 0xd0c070, o: { y: 0.13, z: 0.06, rx: -0.35 } }, { geo: G.box(0.025, 0.1, 0.02), color: 0xd0c070, o: { y: 0.13, z: 0.06, x: -0.05, rx: -0.35 } }], x, z, r);
      break;
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
  halls: { A: 'dslab', B: 'cave', P: 'herring', s: [3.6, 2.6, 2.2], r: [0.68, 0.9, 0.72], ns: 1.1, tint: 0xd6cec4, dual: [0, 0] },
  // Act III (tools/pack-wood.mjs): gold leaf litter, moss, dark peat paths; amber sap painted from L.sap, dry leaves with
  // the First Autumn; in the Heartwood the root walls take the bark scan, projected on the steep faces
  weep: { A: 'goldleaf', B: 'moss', P: 'peat', s: [3.0, 2.4, 2.6], r: [0.92, 0.95, 0.9], ns: 1.0, tint: 0xa49884, dual: [1, 1], sap: true, dry: true, sat: 0.72, hueA: [1.0, 1.12, 0.7] },
  heart: { A: 'peat', B: 'rootwall', P: 'goldleaf', W: 'rootwall', s: [2.6, 2.2, 2.8], r: [0.85, 0.8, 0.92], ns: 1.1, tint: 0xa89888, dual: [1, 0], sap: true, dry: true, ws: 2.4, sat: 0.8 }
};
function buildGround(L, group) {
  const { w, h, cells, paint } = L;
  const geo = new THREE.PlaneGeometry(w, h, w, h);
  geo.rotateX(-Math.PI / 2);
  geo.translate(w / 2, 0, h / 2);
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), blend = new Float32Array(n), lay = new Float32Array(n * 4);
  const D = L.dist, crypt = L.type === 'crypt', halls = L.type === 'halls', pass = L.type === 'pass';
  const heart = L.type === 'heart', act3 = heart || L.type === 'weep', LG = L.spots?.lanternglade;
  const sapW = act3 ? new Float32Array(n) : null;
  const cellAt = (x, z) => (x < 0 || z < 0 || x >= w || z >= h ? -1 : z * w + x);
  const roomAt = crypt ? new Uint8Array(w * h) : null;
  if (crypt) for (const r of L.rooms) for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) roomAt[z * w + x] = 1;
  const cap = pass ? 12 : 9;
  for (let i = 0; i < n; i++) {
    const vx = Math.round(pos.getX(i)), vz = Math.round(pos.getZ(i));
    let pv = 0, fl = 0, dd = 0, cnt = 0, rm = 0, hole = 0, cave = 0, ave = 0, dk = 0, sp = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const c = cellAt(vx + dx, vz + dz); if (c < 0) { dd += cap; cnt++; continue; }
      pv += paint[c]; fl += cells[c]; dd += Math.min(D[c] === 255 ? cap : D[c], cap); cnt++;
      if (crypt) rm += roomAt[c];
      if (L.low && L.low[c]) hole++;
      if (act3) { if (L.deck[c]) dk++; sp += L.sap[c]; }
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
    } else if (act3) {
      // floor-level vertices stay at 0; the Heartwood's root walls rise steeply off the floor; the amber lies in a sunken
      // bed (a lip at the shore, then a drop), and so do the decks, whose props make the walking surface
      let walls = 0;
      if (heart) for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const c = cellAt(vx + dx, vz + dz); if (c < 0 || (!cells[c] && !L.low[c])) walls++; }
      const fl2 = fl - dk;
      k = fl2 > 0 ? (0.93 + nz * 0.18) * (heart ? 1 - Math.min(walls, 8) * 0.04 : 1) : heart ? 0.68 + nz * 0.22 : Math.max(0.3, 0.72 - dd * 0.06);
      wp = clamp(pv * 1.25, 0, 1);
      if (heart) wb = clamp((fl2 > 0 ? walls * 0.07 - 0.15 : 1) + (nz - 0.5) * 1.6 + (big - 0.5) * 1.2, 0, 1);
      else wb = clamp((fl2 > 0 ? -0.1 : 0.3 + dd * 0.12) + (nz - 0.48) * 2.0 + (big - 0.5) * 1.8 + clamp((vz - (h - 36)) / 14, 0, 1) * 0.35, 0, 1);
      // the bed under the amber: how much of the 4x4 cells round the vertex are amber (or deck) shapes a smooth bank
      let lw = 0;
      if (hole || dk) for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const c = cellAt(vx + dx, vz + dz); if (c >= 0 && (L.low[c] || L.deck[c])) lw++; }
      // (the Heartwood's channels and wells are narrow: there the vertex's own four cells count as well)
      const bank = heart ? smooth(clamp((lw / 16 - 0.16) / 0.42, 0, 1)) : smooth(clamp((lw / 16 - 0.45) / 0.45, 0, 1));
      if (bank > 0) { pos.setY(i, -(heart ? 1.2 : 1.7) * bank); k *= 1 - 0.45 * bank; }
      else if (!fl && !hole && !dk) pos.setY(i, heart ? heartWallH(dd) + (mac - 0.5) * 0.6 * clamp(dd - 1, 0, 1) : Math.min(dd, 5) * 0.07);
      if (!heart && LG) { const d = Math.hypot(vx - LG.x, vz - LG.z); wb = Math.max(wb, (1 - clamp((d - LG.r + 4) / 5, 0, 1)) * (0.55 + (nz - 0.5) * 0.8)); }
      sapW[i] = sp / 4;
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
    if (sapW) geo.setAttribute('aSap', new THREE.BufferAttribute(sapW, 1));
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
  // Act III layers fall back on the base layer if the pack lacks one (dryleaf comes with the polish pass, if at all)
  const lay = (k) => ENV.layers[k] || ENV.layers[cfg.A];
  const A = ENV.layers[cfg.A], B = lay(cfg.B), P = lay(cfg.P);
  const nrm = !!(A.n && B.n && P.n);
  const m = new (Std())({ vertexColors: true, color: cfg.tint });
  if (m.isMeshStandardMaterial) { m.roughness = 0.9; m.metalness = 0; m.envMapIntensity = 0.2; }
  const uni = {
    tA: { value: A.d }, tB: { value: B.d }, tP: { value: P.d }, tAn: { value: A.n }, tBn: { value: B.n }, tPn: { value: P.n },
    uS: { value: new THREE.Vector3(1 / cfg.s[0], 1 / cfg.s[1], 1 / cfg.s[2]) }, uR: { value: new THREE.Vector3(...cfg.r) }, uNS: { value: cfg.ns }
  };
  const X = { sap: !!cfg.sap, dry: !!cfg.dry, wall: !!cfg.W, sat: cfg.sat != null };
  if (X.sat) uni.uSat = { value: cfg.sat };
  if (cfg.hueA) uni.uHueA = { value: new THREE.Vector3(...cfg.hueA) };
  if (X.dry) { const Dr = ENV.layers.dryleaf; Object.assign(uni, { tD: { value: (Dr || A).d }, uDryTint: { value: new THREE.Color(Dr ? 0xffffff : 0xc89a70) }, uAut: WIND.uAutumn }); }
  if (X.wall) { const W = lay(cfg.W); Object.assign(uni, { tW: { value: W.d }, tWn: { value: W.n }, uWS: { value: 1 / (cfg.ws || 2.4) } }); }
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    // the anti-repeat second reading is a desktop luxury (quality 2); phones get one reading per layer
    const dual = R.quality >= 2;
    sh.defines = Object.assign(sh.defines || {}, nrm ? { G_NRM: '' } : {}, dual && cfg.dual[0] ? { G_DA: '' } : {}, dual && cfg.dual[1] ? { G_DP: '' } : {},
      X.sap ? { G_SAP: '' } : {}, X.dry ? { G_DRY: '' } : {}, X.wall ? { G_WALL: '' } : {}, X.wall && nrm && uni.tWn.value ? { G_WNRM: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aLay;\nvarying vec4 vLay;\nvarying vec2 vGP;\nvarying vec3 vGN;' + (X.sap ? '\nattribute float aSap;\nvarying float vSap;' : '') + (X.wall ? '\nvarying float vGY;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLay = aLay; vGP = (modelMatrix * vec4(transformed, 1.0)).xz; vGN = normal;' + (X.sap ? ' vSap = aSap;' : '') + (X.wall ? ' vGY = (modelMatrix * vec4(transformed, 1.0)).y;' : ''));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tP; uniform sampler2D tAn; uniform sampler2D tBn; uniform sampler2D tPn;
uniform vec3 uS; uniform vec3 uR; uniform float uNS;
varying vec4 vLay; varying vec2 vGP; varying vec3 vGN;
float gH(vec3 c) { return sqrt(dot(c, vec3(0.3, 0.55, 0.15))); }` + (X.sap ? '\nvarying float vSap;' : '') + (X.sat ? '\nuniform float uSat;' : '') + (cfg.hueA ? '\nuniform vec3 uHueA;' : '') + (X.dry ? '\nuniform sampler2D tD; uniform vec3 uDryTint; uniform float uAut;' : '') + (X.wall ? '\nuniform sampler2D tW; uniform sampler2D tWn; uniform float uWS; varying float vGY;' : ''))
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
  vec3 cB = texture2D(tB, uB).rgb;` + (cfg.hueA ? '\n  cA *= uHueA;' : '') + `
#ifdef G_DP
  vec3 cP = mix(texture2D(tP, uP).rgb, texture2D(tP, uP2).rgb, gm);
#else
  vec3 cP = texture2D(tP, uP).rgb;
#endif
  float hA = gH(cA), hB = gH(cB), hP = gH(cP);
  float wB = smoothstep(-0.15, 0.15, vLay.x * 2.0 - 1.1 + (hB - hA) * 1.3);
  vec3 gc = mix(cA, cB, wB); float gh = mix(hA, hB, wB);
  float wP = smoothstep(-0.15, 0.15, vLay.y * 2.0 - 1.3 + (hP - gh) * 1.2);
  gc = mix(gc, cP, wP); gh = mix(gh, hP, wP);` + (X.sat ? `
  gc = mix(vec3(dot(gc, vec3(0.3, 0.59, 0.11))), gc, uSat);` : '') + (X.dry ? `
  // the First Autumn: dry leaves drift over everything but the trodden paths
  vec3 cD = texture2D(tD, vGP * uS.x * 0.93 + vec2(0.37, 0.11)).rgb * uDryTint;
  float wD = uAut * smoothstep(0.32, 0.6, vLay.z * 0.8 + gH(cD) * 0.7 - wP * 0.4 - 0.01);
  gc = mix(gc, cD, wD); gh = mix(gh, gH(cD), wD);` : '') + (X.sap ? `
  // amber sap: the floor shows through the resin, darkened and gold; glossy, faintly lit from within
  float wS = smoothstep(0.4, 0.62, vSap + (gh - 0.45) * 0.45);
  vec3 amb = mix(vec3(0.2, 0.065, 0.007), vec3(0.52, 0.21, 0.025), smoothstep(0.25, 0.8, gh));
  gc = mix(gc, amb, wS * 0.95);
  totalEmissiveRadiance += vec3(1.0, 0.45, 0.06) * 0.08 * wS;` : '') + (X.wall ? `
  // root walls: the steep faces take the bark, projected sideways
  vec3 gNw = normalize(vGN);
  float steep = 1.0 - smoothstep(0.45, 0.82, gNw.y);
  vec2 wbw = abs(gNw.xz) + 0.001; wbw /= wbw.x + wbw.y;
  vec2 uWx = vec2(vGP.y, -vGY) * uWS, uWz = vec2(vGP.x, -vGY) * uWS;
  vec3 cW = texture2D(tW, uWx).rgb * wbw.x + texture2D(tW, uWz).rgb * wbw.y;
  gc = mix(gc, cW, steep); gh = mix(gh, gH(cW), steep);` : '') + `
  diffuseColor.rgb *= gc * (0.82 + 0.36 * vLay.w);`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(mix(mix(uR.x, uR.y, wB), uR.z, wP) * (1.12 - 0.25 * gh), 0.3, 1.0);` + (X.sap ? '\n  roughnessFactor = mix(roughnessFactor, 0.14, wS);' : ''))
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
  vec3 tn = mix(mix(nA, nB, wB), nP, wP); tn.xy *= uNS;` + (X.sap ? '\n  tn.xy *= 1.0 - wS * 0.85;' : '') + (X.wall ? `
#ifdef G_WNRM
  vec3 nW = texture2D(tWn, wbw.x > wbw.y ? uWx : uWz).xyz * 2.0 - 1.0; tn = mix(tn, nW, steep);
#endif
  vec3 gN = normalize(vGN), gT = normalize(abs(gN.x) < 0.9 ? vec3(1.0, 0.0, 0.0) - gN * gN.x : vec3(0.0, 0.0, 1.0) - gN * gN.z), gB = cross(gN, gT);` : `
  vec3 gN = normalize(vGN), gT = normalize(vec3(1.0, 0.0, 0.0) - gN * gN.x), gB = cross(gN, gT);`) + `
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

// ---------- houses that step aside ----------
// A house between the camera (south and above) and the hero dissolves into a dither, so the hero stays in sight.
const FADE_GLSL = `uniform float uFade;
float bayer4(vec2 p) { ivec2 i = ivec2(mod(p, 4.0)); int k = i.x + i.y * 4;
  float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.); return (m[k] + 0.5) / 16.0; }`;
function fadeMesh(part, u) {
  const mat = part.mat.clone();
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = u;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FADE_GLSL)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (uFade < 0.999 && bayer4(gl_FragCoord.xy) > uFade) discard;');
  };
  mat.customProgramCacheKey = () => 'fade|' + mat.type;
  const m = new THREE.Mesh(part.geo, mat);
  m.castShadow = !mat.transparent; m.receiveShadow = true;
  return m;
}
export class Village {
  constructor(houses, spin) { this.houses = houses || []; this.spin = spin || []; }
  update(dt, px, pz) {
    for (const s of this.spin) s.o.rotation.x += s.v * dt;
    for (const H of this.houses) {
      const c = Math.cos(H.r), sn = Math.sin(H.r);
      // walk from the hero towards the camera until the line of sight clears the roof
      let hidden = false;
      for (let k = 1; k < 16 && !hidden; k++) {
        const zz = pz + k * 0.7, yy = 1.2 + k * 0.7 * 1.25;
        if (yy > H.h) break;
        for (const ox of [-0.35, 0.35]) {
          const dx = px + ox - H.x, dz = zz - H.z, uu = dx * c - dz * sn, vv = dx * sn + dz * c;
          if (Math.abs(uu) < H.hw && Math.abs(vv) < H.hd) { hidden = true; break; }
        }
      }
      const target = hidden ? 0.28 : 1;
      if (Math.abs(H.u.value - target) > 0.005) H.u.value += (target - H.u.value) * Math.min(1, dt * 7);
    }
  }
}

// ======================= Act III: the Weeping Woods and the Heartwood =======================
const SEED_ON = new THREE.Color(0xd8f070), SEED_OFF = new THREE.Color(0x2a2414);
function seedHalo() {
  return MAT.seedHalo ||= new THREE.SpriteMaterial({ map: tex('dot'), color: SEED_ON, transparent: true, opacity: 0.55 * (1 - WIND.uAutumn.value), blending: THREE.AdditiveBlending, depthWrite: false });
}
function seedGlow() {
  return MAT.seedGlow ||= new THREE.MeshBasicMaterial({ color: SEED_ON.clone().lerp(SEED_OFF, WIND.uAutumn.value), transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
}
// The First Autumn, k from 0 (the Still Wood) to 1: dry leaves spread over the ground, the seed-lanterns and their lights go
// out, the amber dims to embers, the drips stop and the FX ambients follow. Safe to call every frame of a fade.
export function setAutumn(k) {
  k = clamp(k, 0, 1);
  WIND.uAutumn.value = k; LIGHTS.autumn = k; FX.autumn = k;
  if (MAT.seedGlow) MAT.seedGlow.color.copy(SEED_ON).lerp(SEED_OFF, k);
  if (MAT.seedHalo) MAT.seedHalo.opacity = 0.55 * (1 - k);
}

// Amber: resin lit from within, its rim catching the light (fresnel). o.alpha: see-through in the middle (a Tear, a cocoon,
// the deer's shell) down to that opacity; o.glow: brightness (userData.u.uGlow, dimmed when a Tear has been touched).
function amberMat(o = {}) {
  const see = o.alpha != null;
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: see, depthWrite: !see });
  m.toneMapped = false; // ACES would wash the amber out to straw
  const u = { uGlow: { value: o.glow ?? 1 }, uA0: { value: o.alpha ?? 1 }, uTime: WIND.uTime };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAN;\nvarying vec3 vAV;\nvarying vec3 vAP;')
      .replace('#include <project_vertex>', `#include <project_vertex>
  vec3 an = normal;
#ifdef USE_INSTANCING
  an = mat3(instanceMatrix) * an;
#endif
  vAN = normalize(normalMatrix * an); vAV = -mvPosition.xyz; vAP = position;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow; uniform float uA0; uniform float uTime;\nvarying vec3 vAN;\nvarying vec3 vAV;\nvarying vec3 vAP;')
      .replace('#include <color_fragment>', `
  vec3 aN = normalize(vAN), aV = normalize(vAV);
  float fr = pow(1.0 - clamp(abs(dot(aN, aV)), 0.0, 1.0), 2.0);
  float sw = 0.5 + 0.5 * sin(vAP.y * 3.1 + vAP.x * 1.7 + uTime * 0.35) * sin(vAP.z * 2.3 - uTime * 0.21);
  vec3 col = mix(vec3(0.32, 0.09, 0.008), vec3(0.85, 0.42, 0.06), 0.3 + 0.45 * sw);
  col = mix(col, vec3(1.0, 0.72, 0.3), fr * 0.5);
  float sp = pow(max(dot(reflect(-aV, aN), normalize(vec3(-0.4, 0.8, 0.45))), 0.0), 24.0);
  col += vec3(1.0, 0.9, 0.65) * sp * 0.6;
  diffuseColor.rgb = col * uGlow;
  diffuseColor.a = mix(uA0, 1.0, fr);`);
  };
  m.customProgramCacheKey = () => 'amber' + (see ? 'a' : '');
  return m;
}

// hanging strands of gold leaves for the weeping oaks: crossed alpha cards round the crown, swaying only when the wind does
let strandTex = null;
function strandTexture() {
  if (strandTex) return strandTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d'), rng = RNG(9);
  for (let k = 0; k < 9; k++) {
    let x = 8 + k * 14 + rng.range(-4, 4);
    const len = rng.range(150, 250), pts = [];
    for (let y = 0; y <= len; y += 6) { x += rng.range(-1.2, 1.2); pts.push([x, y]); }
    g.strokeStyle = 'rgba(110,72,28,0.95)'; g.lineWidth = 1.3; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
    for (let i = 1; i < pts.length; i++) for (const sd of [-1, 1]) {
      if (rng.chance(0.25)) continue;
      const [px, py] = pts[i];
      g.fillStyle = `hsl(${rng.range(30, 46)}, ${rng.range(60, 85)}%, ${rng.range(30, 55)}%)`;
      g.beginPath(); g.ellipse(px + sd * rng.range(2, 4), py + rng.range(-2, 2), rng.range(1.8, 3), rng.range(4, 6.5), sd * rng.range(0.2, 0.7), 0, 6.3); g.fill();
    }
  }
  strandTex = new THREE.CanvasTexture(c); strandTex.colorSpace = THREE.SRGBColorSpace;
  return strandTex;
}
function strandGeo() {
  const geos = [];
  for (let i = 0; i < 12; i++) {
    const inner = i >= 9, a = (inner ? (i - 9) / 3 : i / 9) * Math.PI * 2 + (inner ? 0.5 : 0), rr = inner ? 1.25 : 2.2 + (i % 3) * 0.2, hh = inner ? 2.6 : 3.3 - (i % 2) * 0.4;
    const p = new THREE.PlaneGeometry(1.5, hh); p.translate(0, 5.0 - hh / 2, 0);
    p.rotateY(a); p.translate(Math.sin(a) * rr, 0, Math.cos(a) * rr);
    const nr = p.attributes.normal; for (let j = 0; j < nr.count; j++) nr.setXYZ(j, Math.sin(a) * 0.45, 0.8, Math.cos(a) * 0.45);
    geos.push(p.toNonIndexed());
  }
  const g = mergeGeometries(geos, false); g.computeBoundingSphere();
  return g;
}
function strandMat() {
  if (MAT.strands) return MAT.strands;
  const m = new THREE.MeshLambertMaterial({ map: strandTexture(), alphaTest: 0.45, side: THREE.DoubleSide, color: 0xe8d8c0 });
  m.customProgramCacheKey = () => 'strands';
  occlude(m, (sh) => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uWind = WIND.uWind; sh.uniforms.uEdge = WIND.uEdge;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\n' + WIND_GLSL)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 sip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 sip = vec3(0.0);
#endif
  float hang = clamp(5.0 - position.y, 0.0, 4.0);
  transformed.xz += vec2(sin(uTime * 1.2 + sip.x * 0.5 + position.x), cos(uTime * 0.9 + sip.z * 0.4 + position.z)) * 0.07 * hang * windK(sip.z);`);
  });
  return (MAT.strands = m);
}
function cocoonGeo() { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(0.6, 1.15, 0.55); g.translate(0, 1.12, 0); return g; }
// a dim figure for the inside of a Tear or a cocoon: standing, head bowed
function figureParts(color, hgt = 1.6, wdt = 0.36) {
  const k = hgt / 1.6;
  return [
    { geo: G.cyl(wdt * 0.55, wdt * 0.42, 0.9 * k, 7), color, o: { y: 0.5 * k } },
    { geo: G.cyl(wdt * 0.48, wdt * 0.62, 0.55 * k, 7), color, o: { y: 1.17 * k } },
    { geo: G.ball(0.13 * k, 8, 6), color, o: { y: 1.52 * k, z: 0.05 * k } }
  ];
}
function saplingParts(tc, lc) {
  return [
    { geo: G.cyl(0.025, 0.05, 1.2, 5), color: tc, o: { y: 0.6 } },
    { geo: G.segTo(0.25, 0.35, 0.05, 0.02, 0.01, 4), color: tc, o: { y: 0.8 } },
    { geo: G.segTo(-0.2, 0.3, -0.1, 0.02, 0.01, 4), color: tc, o: { y: 0.95 } },
    { geo: jitter(G.ico(0.26, 0), 0.05, 80), color: lc[0], o: { y: 1.25 }, soft: 0.6 },
    { geo: jitter(G.ico(0.18, 0), 0.04, 81), color: lc[1], o: { y: 1.12, x: 0.26, z: 0.05 }, soft: 0.6 },
    { geo: jitter(G.ico(0.17, 0), 0.04, 82), color: lc[2], o: { y: 1.2, x: -0.2, z: -0.1 }, soft: 0.6 }
  ];
}
// a scanned prop as its own meshes (shared geometry), placed with a full rotation
function placeEnv(parent, name, mat, pos, rot, scl) {
  const parts = ENV.props[name]; if (!parts) return null;
  const g = new THREE.Group(); g.position.copy(pos); if (rot?.isQuaternion) g.quaternion.copy(rot); else if (rot) g.rotation.copy(rot); if (scl) g.scale.copy(scl);
  for (const p of parts) { const m = new THREE.Mesh(p.geo, mat || p.mat); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  parent.add(g);
  return g;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), EU = (x, y, z) => new THREE.Euler(x, y, z);
// a root (or a strand of resin): a tapered tube along a smooth curve through pts, radius r0 at the start to r1 at the end
function rootGeo(pts, r0, r1, seg = 14, rad = 6, knots = 0) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(...p))));
  const fr = curve.computeFrenetFrames(seg, false), pos = [], nor = [], idx = [], P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; curve.getPointAt(t, P);
    const r = (r0 + (r1 - r0) * t) * (1 + (knots ? Math.max(0, Math.sin(t * knots * 6.283)) * 0.25 : 0));
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      N.copy(fr.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a)).normalize();
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r); nor.push(N.x, N.y, N.z);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
// a few control points from a to b, bent at random (for roots)
function bend(rng, a, b, n = 4, amt = 0.5) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI) * amt; out.push(V3(a[0] + (b[0] - a[0]) * t + rng.range(-w, w), a[1] + (b[1] - a[1]) * t + rng.range(-w, w), a[2] + (b[2] - a[2]) * t + rng.range(-w, w) * 0.6)); }
  return out;
}

// the Root Gate's frame: two root trunks and a lintel set in a hill of roots, a dark way down behind (act3Prop('rootGate')
// is the tangle that fills the doorway)
function rootArch(out, x, z) {
  const M = mats(), wood = M.rootW || M.barkW || null, g = new THREE.Group();
  g.position.set(x, 0, z);
  const hill = new THREE.Mesh(bake([{ geo: jitter(new THREE.SphereGeometry(1, 22, 9, 0, Math.PI * 2, 0, Math.PI / 2), 0.035, 91), color: 0x5a4a38, o: {} }]), wood || M.lam);
  hill.scale.set(9, 5.6, 5.4); hill.position.set(0, -0.5, -7.3); hill.receiveShadow = true;
  for (const [hx, hz, hr] of [[-5.2, -3.6, 0.6], [4.8, -4.2, 2.6], [-1.5, -6.5, 1.8], [2.6, -7.2, 4]]) placeEnv(g, 'giantRoot', wood, V3(hx, 0.6, hz), EU(0, hr, 0), V3(1.6, 1.6, 1.6));
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.8), new THREE.MeshBasicMaterial({ color: 0x030201 }));
  dark.position.set(0, 2.9, -1.0);
  g.add(hill, dark);
  for (const sx of [-1, 1]) {
    // stood on end with its bark to the glade (the scan's flat underside faces away)
    placeEnv(g, 'fallenTrunk', wood, V3(sx * 3.35, 2.85, -0.75), EU(Math.PI / 2, sx * 0.4, -sx * 0.09), V3(1.55, 2.2, 1.45));
    placeEnv(g, 'giantRoot', wood, V3(sx * 3.7, -0.12, 0.3), EU(0, sx * 1.25, 0), V3(1.25, 1.25, 1.25));
  }
  placeEnv(g, 'fallenTrunk', wood, V3(0, 5.55, -0.45), EU(0.05, Math.PI / 2, 0.04), V3(1.35, 1.25, 2.15));
  placeEnv(g, 'giantRoot', wood, V3(0.2, 6.1, -0.35), EU(0, 0.3, Math.PI), V3(1.5, 1.1, 1.1));
  if (!ENV.props.fallenTrunk) for (const sx of [-1, 1]) g.add(new THREE.Mesh(bake([{ geo: jitter(G.cyl(0.7, 0.9, 6, 8), 0.1, 92), color: 0x4a3a2a, o: { x: sx * 3.35, y: 3 } }]), M.lam));
  out.group.add(g);
  out.emitters.push({ x, y: 2.5, z: z + 0.4, type: 'motes', s: 2.2, color: 0xffd080 });
}

// the Fallen King: a colossal trunk across the Amber Mere, its top the deck the hero walks; broken limbs over the amber
function fallenKing(L, out) {
  const fk = L.spots.fallenKing, M = mats(), wood = M.barkW || null;
  const sz = ENV.sizes.fallenTrunk || [1.04, 1.05, 4.03], deck = ENV.extras.fallenTrunk?.deck ?? 0.593;
  const SX = fk.w / sz[0], SY = 3.6, SZ = fk.len / sz[2];
  if (!placeEnv(out.group, 'fallenTrunk', wood, V3(fk.x, 0.06 - deck * SY, fk.z), null, V3(SX, SY, SZ)))
    out.group.add(new THREE.Mesh(bake([{ geo: G.cyl(fk.w / 2, fk.w / 2, fk.len, 12), color: 0x4a3a2a, o: { x: fk.x, y: 0.06 - fk.w / 2, z: fk.z, rx: Math.PI / 2 } }]), M.lam));
  // broken limbs reaching out over the amber, some up into the air
  const rng = RNG(Math.round(fk.x * 13 + fk.z * 7)), Z = V3(0, 0, 1);
  for (let i = 0; i < 6; i++) {
    const sd = i % 2 ? 1 : -1, zz = fk.z + (i / 5 - 0.5) * fk.len * 0.56 + rng.range(-1, 1), l = rng.range(3, 4.6), e = rng.range(0.15, 0.7);
    const d = V3(sd * Math.cos(e), Math.sin(e), rng.range(-0.35, 0.35)).normalize();
    const base = V3(fk.x + sd * (fk.w / 2 - 0.9), -0.45, zz), c = base.clone().addScaledVector(d, l / 2);
    const k = rng.range(0.55, 0.8);
    if (!placeEnv(out.group, 'fallenTrunk', wood, c, new THREE.Quaternion().setFromUnitVectors(Z, d), V3(k, k, l / sz[2])))
      out.group.add(new THREE.Mesh(bake([{ geo: G.segTo(d.x * l, d.y * l, d.z * l, 0.4, 0.12, 6), color: 0x5a4a3a, o: { x: base.x, y: base.y, z: base.z } }]), M.lam));
  }
}

// the nine standing stones of the Glade: separate meshes, so a charge can crack one (crack()) and a second break it
// (shatter()). The stone object is on L.stones[i].mesh and out.stones[i].
function standingStone(st, out) {
  const M = mats(), g = new THREE.Group(), body = new THREE.Group();
  g.position.set(st.x, -0.12, st.z); g.rotation.y = st.r; g.add(body);
  const name = st.kind === 'B' && ENV.props.standingStoneB ? 'standingStoneB' : 'standingStone';
  const parts = ENV.props[name];
  const geo = parts ? null : bake([{ geo: jitter(G.box(1.3, 3, 1.1, 2, 4, 2), 0.12, 90), color: 0x6a6862, o: { y: 1.5 } }]);
  const meshOf = () => { const grp = new THREE.Group(); if (parts) for (const p of parts) grp.add(new THREE.Mesh(p.geo, M.mossW || p.mat)); else grp.add(new THREE.Mesh(geo, M.lam)); grp.traverse((m) => { m.castShadow = m.receiveShadow = true; }); return grp; };
  body.add(meshOf()); body.scale.setScalar(st.s || 1);
  const rubble = new THREE.Group(); rubble.visible = false; g.add(rubble);
  const rng = RNG(Math.round(st.x * 31 + st.z * 17));
  for (let i = 0; i < 5; i++) {
    const c = meshOf(), a = rng.range(0, 6.28), d = rng.range(0.2, 1.3);
    c.position.set(Math.sin(a) * d, rng.range(0.15, 0.3), Math.cos(a) * d); c.rotation.set(Math.PI / 2 + rng.range(-0.4, 0.4), rng.range(0, 6.28), rng.range(-0.5, 0.5)); c.scale.setScalar(rng.range(0.22, 0.34) * (st.s || 1));
    rubble.add(c);
  }
  g.userData.cracked = false; g.userData.broken = false;
  g.userData.crack = () => {
    if (g.userData.cracked) return; g.userData.cracked = true;
    body.rotation.z = (rng.next() < 0.5 ? -1 : 1) * 0.07; body.rotation.x = 0.04; body.position.y = -0.12;
    rubble.visible = true; rubble.children.forEach((c, i) => { c.visible = i < 2; });
    puff(st.x, 1.2, st.z, 12, 0x8a8478, 1.6, 1.4, 1.2);
  };
  g.userData.shatter = () => {
    if (g.userData.broken) return; g.userData.broken = g.userData.cracked = true;
    body.visible = false; rubble.visible = true; rubble.children.forEach((c) => { c.visible = true; });
    puff(st.x, 1, st.z, 22, 0x8a8478, 2.2, 2, 1.6);
  };
  // the stone follows what the fight does to L.stones[i] (cracks, broken: game/ai.js), so nothing else has to call it
  const watch = body.children[0]?.children[0];
  if (watch) watch.onBeforeRender = () => { if (st.broken) g.userData.shatter(); else if (st.cracks && !g.userData.cracked) g.userData.crack(); };
  out.group.add(g);
  st.mesh = g;
  return g;
}

// the Amber Mere and the Heartwood's channels: a sheet in the sunken bed, the lava shader's idea in amber (no fire)
function buildAmber(L, group) {
  const { w, h } = L, pos = [], dep = [], y = L.type === 'weep' ? -0.85 : -0.45;
  const wet = (i) => L.amberDeep[i] || L.deck[i];
  // how far each amber cell lies from the shore: thin and honey-gold at the edge, nearly black where it is deep
  const D = new Float32Array(w * h).fill(0), q = [];
  for (let i = 0; i < w * h; i++) if (wet(i)) { D[i] = 99; } else q.push(i);
  for (let head = 0; head < q.length; head++) {
    const i = q[head], cx = i % w, cz = (i - cx) / w;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, nz = cz + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && D[n] > D[i] + 1) { D[n] = D[i] + 1; q.push(n); } }
  }
  const dAt = (x, z) => { let s0 = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const xx = x + dx, zz = z + dz; s0 += xx >= 0 && zz >= 0 && xx < w && zz < h ? Math.min(D[zz * w + xx], 6) : 0; } return s0 / 4; };
  // one quad per cell, over the amber and one cell past it (that rim lies under the bank), no overlaps
  const near = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, zz = z + dz; if (xx >= 0 && zz >= 0 && xx < w && zz < h && wet(zz * w + xx)) return true; } return false; };
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    if (!near(x, z)) continue;
    pos.push(x, y, z, x, y, z + 1, x + 1, y, z + 1, x, y, z, x + 1, y, z + 1, x + 1, y, z);
    const a = dAt(x, z), b = dAt(x, z + 1), c = dAt(x + 1, z + 1), d = dAt(x + 1, z);
    dep.push(a, b, c, a, c, d);
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aDep', new THREE.Float32BufferAttribute(dep, 1));
  // what the polished amber mirrors: the gold sky and the crowns over the mere, the dark root vault in the Heartwood
  const weep = L.type === 'weep';
  const u = { uTime: WIND.uTime, uBright: { value: 1 }, uLY: { value: y }, uShal: { value: weep ? 1 : 0.3 }, uSky: { value: new THREE.Color(weep ? 0xffcc75 : 0x2a1608) }, uTint: { value: new THREE.Color(weep ? 0xffffff : 0xf0a070) } };
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
  mat.toneMapped = false;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aDep;\nvarying vec2 vLP;\nvarying float vDep;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = (modelMatrix * vec4(transformed, 1.0)).xz; vDep = aDep;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform float uBright; uniform float uLY; uniform float uShal; uniform vec3 uSky; uniform vec3 uTint; varying vec2 vLP; varying float vDep;
float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ln(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(lh(i), lh(i + vec2(1, 0)), f.x), mix(lh(i + vec2(0, 1)), lh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `
  vec2 q = vLP * 0.2;
  float t = uTime;
  vec2 wq = q + vec2(ln(q * 1.3 + t * 0.012), ln(q * 1.3 - t * 0.01 + 7.0)) * 1.4;
  float sw = ln(wq * 2.0) * 0.6 + ln(wq * 4.5 + 3.0) * 0.4;
  float fl = ln(q * 34.0 + 5.0);
  // resin lit from within: honey where it lies thin at the shore, red-brown and then near black where it is deep, veins
  // of gold light drifting in it, the dark motes of whatever it caught
  float dp = vDep + (sw - 0.5) * 1.2, sh = 1.0 - smoothstep(0.3, 2.6, dp);
  float heat = ln(wq * 1.5) * 0.55 + ln(wq * 3.7 - 2.0) * 0.3 + ln(q * 9.0) * 0.15;
  float glow = smoothstep(0.57, 0.74, heat);
  vec3 col = mix(vec3(0.05, 0.011, 0.001), vec3(0.34, 0.1, 0.012), smoothstep(0.3, 0.58, heat));
  col = mix(col, vec3(0.9, 0.36, 0.045), glow * 0.9);
  col = mix(col, vec3(0.82, 0.4, 0.07), sh * 0.55 * uShal);
  col *= 1.0 - smoothstep(0.9, 0.93, fl) * 0.25;
  // a polished surface: the gold sky and the dark crowns overhead mirrored in it, shifting as the eye moves, and the
  // sun's glint broken up by the faintest ripple
  vec3 Nr = normalize(vec3((ln(q * 22.0) - 0.5) * 0.12, 1.0, (ln(q * 22.0 + 3.0) - 0.5) * 0.12));
  vec3 V = normalize(cameraPosition - vec3(vLP.x, uLY, vLP.y)), Rf = reflect(-V, Nr);
  col += vec3(1.0, 0.85, 0.55) * pow(max(dot(Rf, normalize(vec3(-0.35, 0.9, 0.26))), 0.0), 48.0) * 0.9 * uShal;
  vec2 rp = vLP + Rf.xz / max(Rf.y, 0.25) * 7.0;
  float crown = smoothstep(0.38, 0.62, ln(rp * 0.13) * 0.7 + ln(rp * 0.37 + 2.0) * 0.3);
  vec3 sky = mix(uSky, vec3(0.06, 0.035, 0.015), crown);
  col = mix(col, sky, 0.08 + 0.4 * pow(1.0 - V.y, 3.0));
  float gl = smoothstep(0.8, 0.97, ln(q * 3.0 + vec2(t * 0.03, t * 0.02)));
  col += vec3(1.0, 0.85, 0.55) * gl * 0.12;
  diffuseColor.rgb = col * uTint * uBright;
  // it thins to nothing where it meets the bank, so the shore line stays soft
  diffuseColor.a = smoothstep(0.4, 1.1, vDep);`);
  };
  mat.customProgramCacheKey = () => 'amberSheet';
  const mesh = new THREE.Mesh(geo, mat);
  geo.computeBoundingSphere();
  const beat = L.type === 'heart';
  mesh.onBeforeRender = () => { u.uBright.value = (1 - 0.45 * WIND.uAutumn.value) * (beat ? 0.82 + 0.32 * LIGHTS.beat * beatPulse() : 1); };
  group.add(mesh);
  return mesh;
}

// level-wide Act III pieces drawn from the layout's own lists
function act3Level(L, I, B, out) {
  for (const l of L.lanterns || []) {
    if (ENV.props.lantern) I.add('seed:lantern', l.x, l.z, hash2(l.x, l.z) * 6, 1.25, l.y - 0.4);
    B.add('lam', [{ geo: G.cyl(0.015, 0.015, 2.2, 4), color: 0x2a2018, o: { y: l.y + 1.45 } }], l.x, l.z);
    const halo = new THREE.Sprite(seedHalo()); halo.position.set(l.x, l.y, l.z); halo.scale.setScalar(1.5); out.group.add(halo);
    out.emitters.push({ x: l.x, y: l.y, z: l.z, type: 'motes', s: 0.5, autumn: true });
  }
  const tsz = ENV.sizes.fallenTrunk || [1.04, 1.05, 4.03], deck = ENV.extras.fallenTrunk?.deck ?? 0.593;
  for (const b of L.bridges || []) {
    const sx = b.w / tsz[0], sy = sx * 0.8;
    if (ENV.props.fallenTrunk) I.add('bark:fallenTrunk', b.x, b.z, b.r, sx, 0.05 - deck * sy, sy, b.len / tsz[2]);
    else B.add('lam', [{ geo: G.cyl(b.w / 2, b.w / 2, b.len, 9), color: 0x4a3a2a, o: { y: 0.05 - b.w / 2, rx: Math.PI / 2 } }], b.x, b.z, b.r);
  }
  if (L.spots.fallenKing) fallenKing(L, out);
  if (L.stones) out.stones = L.stones.map((st) => standingStone(st, out));
}

// ---------- act3Prop: the props gameplay and story own (placed, faded, opened and withered by them) ----------
// tear (o: the tear spot; userData.dim()), rootGate (userData.setOpen(b), open(dt) -> done, progress), thorns (o.cells,
// o.x/o.z; returned in place; userData.wither()), whiteTree, sapling, heart (userData.setBeat(k)), cocoon
// (userData.burst()), deer (o.r leap direction; the elk at its leap apex in amber, or a stand-in).
export function act3Prop(kind, o = {}) {
  mats();
  const g = kind === 'tear' ? tearProp(o) : kind === 'rootGate' ? rootGateProp(o) : kind === 'thorns' ? thornsProp(o)
    : kind === 'whiteTree' ? whiteTreeProp(o) : kind === 'sapling' ? saplingProp(o) : kind === 'heart' ? heartProp(o)
      : kind === 'cocoon' ? cocoonProp(o) : kind === 'deer' ? deerProp(o) : new THREE.Group();
  g.userData.kind = kind;
  return g;
}
const solid = (parts, mat) => { const m = new THREE.Mesh(bake(parts), mat || mats().lam); m.castShadow = true; m.receiveShadow = true; return m; };
function tearProp(o) {
  const g = new THREE.Group();
  const mat = amberMat({ alpha: 0.6, glow: o.story ? 1.15 : 1 });
  const prof = [[0, 0], [0.18, 0.04], [0.42, 0.22], [0.58, 0.55], [0.62, 0.86], [0.52, 1.18], [0.33, 1.48], [0.15, 1.74], [0.06, 1.9], [0, 1.96]];
  const drop = new THREE.Mesh(G.lathe(prof, 20), mat); drop.position.y = 0.5; drop.renderOrder = 3;
  const strand = new THREE.Mesh(G.cyl(0.035, 0.07, 3.6, 6), amberMat({ glow: 0.9 })); strand.position.y = 0.5 + 1.9 + 1.75;
  const fig = new THREE.Mesh(bake(figureParts(0x241206, 1.2, 0.32)), new THREE.MeshBasicMaterial({ vertexColors: true }));
  fig.position.y = 0.72; fig.rotation.y = o.r || 0;
  g.add(fig, drop, strand);
  g.userData.dim = () => { mat.userData.u.uGlow.value = 0.42; mat.userData.u.uA0.value = 0.8; if (o.gain) o.gain.k = 0.25; };
  if (o.used || o.dim) g.userData.dim();
  return g;
}
function rootGateProp() {
  const M = mats(), wood = M.rootW || M.barkW || M.lam, g = new THREE.Group(), roots = [];
  const rng = RNG(41);
  // thick roots grown across the doorway from both jambs, woven over each other
  for (let i = 0; i < 11; i++) {
    const sd = i % 2 ? 1 : -1, y0 = 0.3 + (i / 10) * 4.9 + rng.range(-0.3, 0.3), y1 = clamp(y0 + rng.range(-2.6, 2.6), 0.2, 5.3);
    const m = new THREE.Mesh(rootGeo(bend(rng, [0, 0, 0], [-sd * rng.range(4.8, 6.2), y1 - y0, rng.range(-0.4, 0.5)], 4, 0.7), rng.range(0.24, 0.4), 0.06, 16, 7, rng.int(1, 3)), wood);
    m.position.set(sd * 2.95, y0, -0.4 + rng.range(-0.3, 0.3)); m.castShadow = m.receiveShadow = true;
    g.add(m); roots.push(m);
  }
  const knot = placeEnv(g, 'giantRoot', wood, V3(0, -0.05, -0.2), EU(0, 1.1, 0), V3(1.1, 1.4, 1.1));
  g.userData.progress = 0;
  g.userData.setProgress = (p) => {
    p = clamp(p, 0, 1); g.userData.progress = p;
    const e = p * p * (3 - 2 * p);
    for (const r of roots) { r.scale.setScalar(Math.max(0.001, 1 - e)); r.visible = e < 0.999; }
    if (knot) { knot.position.y = -0.05 - e * 1.8; knot.visible = e < 0.999; }
  };
  // the roots draw back into the jambs; returns true once open
  g.userData.open = (dt) => { g.userData.setProgress(g.userData.progress + dt / 2.6); return g.userData.progress >= 1; };
  g.userData.setOpen = (b) => g.userData.setProgress(b ? 1 : 0);
  return g;
}
function thornsProp(o) {
  const cells = o.cells || [], g = new THREE.Group();
  let ax = o.x, az = o.z;
  if (ax == null) { ax = 0; az = 0; for (const [cx, cz] of cells) { ax += cx + 0.5; az += cz + 0.5; } ax /= cells.length || 1; az /= cells.length || 1; }
  const rng = RNG(cells.length * 31 + 7), parts = [];
  for (const [cx, cz] of cells) {
    const x = cx + 0.5 - ax, z = cz + 0.5 - az;
    for (let i = 0; i < 3; i++) { const a = rng.range(0, 6.28), ox = x + rng.range(-0.3, 0.3), oz = z + rng.range(-0.3, 0.3); parts.push({ geo: rootGeo(bend(rng, [ox - Math.sin(a) * 0.8, 0.05, oz - Math.cos(a) * 0.8], [ox + Math.sin(a) * 0.8, 0.1, oz + Math.cos(a) * 0.8], 3, 0.6), 0.1, 0.05, 8, 5), color: 0x24100a, o: { y: 0.25 } }); }
    // arching canes, thorns set along them
    for (let i = 0; i < 6; i++) {
      const a = rng.range(0, 6.28), l = rng.range(1.1, 2.6), ox = x + rng.range(-0.35, 0.35), oz = z + rng.range(-0.35, 0.35);
      const pts = bend(rng, [ox, 0, oz], [ox + Math.sin(a) * 1.2, l, oz + Math.cos(a) * 1.2], 3, 0.4);
      parts.push({ geo: rootGeo(pts, 0.085, 0.02, 8, 4), color: 0x3a1a12, o: {} });
      const cv = new THREE.CatmullRomCurve3(pts), P = new THREE.Vector3(), T = new THREE.Vector3();
      for (let k = 1; k <= 4; k++) {
        const t = k / 5; cv.getPointAt(t, P); cv.getTangentAt(t, T);
        const sx = rng.sign(), dir = V3(T.z * sx, rng.range(-0.3, 0.6), -T.x * sx).normalize(), len = rng.range(0.14, 0.3);
        const g = new THREE.ConeGeometry(0.03, len, 4); g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir));
        parts.push({ geo: g, color: 0x9a7a52, o: { x: P.x, y: P.y, z: P.z } });
      }
    }
  }
  const mesh = solid(parts.length ? parts : [{ geo: G.box(0.1, 0.1, 0.1), color: 0, o: {} }]);
  g.add(mesh); g.position.set(ax, 0, az);
  let t0 = 0;
  g.userData.wither = () => { if (!t0) t0 = performance.now(); };
  mesh.onBeforeRender = () => {
    if (!t0) return;
    const k = clamp((performance.now() - t0) / 1200, 0, 1);
    mesh.position.y = -2.7 * k * k; mesh.scale.set(1 + k * 0.15, 1 - k * 0.45, 1 + k * 0.15);
    if (k >= 1) g.visible = false;
  };
  return g;
}
function whiteTreeProp() {
  const g = new THREE.Group();
  if (ENV.props.treeOak && !NO_TREES) {
    for (const p of ENV.props.treeOak) { const m = new THREE.Mesh(p.geo, treeMat(p.mat, 'white')); m.castShadow = m.receiveShadow = true; g.add(m); }
    g.scale.setScalar(0.62);
  } else g.add(solid([
    { geo: G.cyl(0.14, 0.3, 2.8, 6), color: 0xd8d2c4, o: { y: 1.4 } },
    { geo: G.segTo(0.9, 1.1, 0.2, 0.1, 0.04, 4), color: 0xd8d2c4, o: { y: 2.2 } }, { geo: G.segTo(-0.8, 1.2, -0.3, 0.1, 0.04, 4), color: 0xd8d2c4, o: { y: 2.4 } },
    { geo: jitter(G.ico(1.2, 0), 0.15, 111), color: 0xe8dca8, o: { y: 3.6, sy: 0.8 }, soft: 0.7 }, { geo: jitter(G.ico(0.8, 0), 0.1, 112), color: 0xf0e4b0, o: { y: 3.3, x: 0.9 }, soft: 0.7 }
  ], mats().wind));
  return g;
}
function saplingProp() {
  const m = solid(saplingParts(0xd8d0c0, [0xe8d890, 0xf0e0a0, 0xd8c070]), mats().wind);
  m.scale.setScalar(1.3);
  const g = new THREE.Group(); g.add(m);
  return g;
}
function heartProp(o) {
  const g = new THREE.Group(), M = mats();
  const prof = [[0, 0], [0.45, 0.08], [1.05, 0.55], [1.55, 1.3], [1.78, 2.1], [1.7, 2.8], [1.35, 3.4], [0.8, 3.85], [0.3, 4.05], [0, 4.1]];
  const shellMat = amberMat({ alpha: 0.7, glow: 1.1 });
  const shell = new THREE.Mesh(G.lathe(prof, 26), shellMat); shell.position.y = 0.95; shell.renderOrder = 3;
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(G.ball(0.95, 16, 12), coreMat); core.position.y = 0.95 + 2.0; core.renderOrder = 2;
  const seed = new THREE.Mesh(bake([{ geo: jitter(G.ico(0.55, 1), 0.08, 113), color: 0x3a1808, o: { sy: 1.4 } }]), new THREE.MeshBasicMaterial({ vertexColors: true }));
  seed.position.y = 0.95 + 2.0;
  // roots climb out of the dais and wrap the heart, the way ivy holds a stone
  const rg = [], rr = RNG(17), at = (a, y) => { const k = y < 0.95 ? 1.0 : clamp(1 - Math.abs(y - 3.0) / 3.4, 0.25, 1); const rad = (y < 0.95 ? 2.6 - y : 1.78 * k + 0.08); return [Math.sin(a) * rad, y, Math.cos(a) * rad]; };
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * Math.PI * 2 + rr.range(-0.2, 0.2), tw = rr.range(0.6, 1.4) * (i % 2 ? 1 : -1), top = rr.range(2.6, 4.4), pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, y = 0.6 + (top + 0.4) * t; pts.push(at(a0 + tw * t, y)); }
    rg.push(rootGeo(pts, rr.range(0.13, 0.2), 0.03, 22, 6, 2));
  }
  const roots = new THREE.Mesh(mergeGeometries(rg, false), M.rootW || M.barkW || M.lam); roots.castShadow = roots.receiveShadow = true;
  g.add(seed, core, shell, roots);
  let k = o.beat ?? 1;
  g.userData.setBeat = (v) => { k = clamp(v, 0, 1); };
  shell.onBeforeRender = () => {
    const p = beatPulse() * k;
    shell.scale.setScalar(1 + 0.035 * p);
    core.scale.setScalar(0.85 + 0.2 * p);
    coreMat.opacity = 0.25 + 0.35 * k + 0.4 * p;
    shellMat.userData.u.uGlow.value = 0.8 + 0.25 * k + 0.3 * p;
  };
  return g;
}
function cocoonProp() {
  const g = new THREE.Group();
  const fig = solid(figureParts(0x2a1608, 1.55, 0.35)); fig.castShadow = false;
  const shell = new THREE.Mesh(cocoonGeo(), MAT.cocoon ||= amberMat({ alpha: 0.5, glow: 0.8 })); shell.renderOrder = 3;
  g.add(fig, shell);
  // cracks open: the shell is gone, a stain of sap where it stood
  g.userData.burst = () => { if (!shell.visible) return; shell.visible = false; fig.visible = false; const p = new THREE.Vector3(); g.getWorldPosition(p); sapBurst(p.x, p.z, 1.2); };
  return g;
}
function deerProp(o) {
  const g = new THREE.Group(), body = new THREE.Group();
  body.position.y = 1.55; body.rotation.y = o.r || 0; g.add(body);
  if (hasCreature('silverhorn')) {
    // the elk held at the top of its leap, a little warmed by the amber round it
    const m = creatureModel('silverhorn', { rim: 0xffc060, rimI: 0.2 });
    const T = m.tpl, clip = T.clips.leap || T.clips.run || T.clips.idle;
    if (clip) { const mixer = new THREE.AnimationMixer(m.mesh); mixer.clipAction(clip).play(); mixer.setTime(T.scene.userData?.leapApex ?? clip.duration * 0.45); }
    const u = m.mat.userData.u; u.uTint.value.set(0xffc880); u.uTintAmt.value = 0.18;
    m.mesh.traverse((n) => { if (n.isMesh) { n.frustumCulled = false; n.castShadow = R.quality >= 2; } });
    body.add(m.mesh);
  } else {
    // a stand-in hart: bone-white, legs folded and flung back mid-leap
    const W = 0xd8d0c0;
    body.add(solid([
      { geo: G.ball(0.5, 10, 8), color: W, o: { y: 1.2, sz: 2.1, sy: 0.85 } },
      { geo: G.segTo(0, 0.7, 0.45, 0.2, 0.14, 6), color: W, o: { y: 1.4, z: 0.75 } },
      { geo: G.ball(0.17, 8, 6), color: W, o: { y: 2.1, z: 1.3, sz: 1.6 } },
      ...[-1, 1].map((sx) => ({ geo: G.segTo(sx * 0.1, -0.5, 0.75, 0.07, 0.04, 5), color: W, o: { x: sx * 0.2, y: 1.0, z: 0.75 } })),
      ...[-1, 1].map((sx) => ({ geo: G.segTo(sx * 0.1, -0.45, -0.85, 0.08, 0.04, 5), color: W, o: { x: sx * 0.2, y: 1.0, z: -0.75 } })),
      ...[-1, 1].map((sx) => ({ geo: G.segTo(sx * 0.55, 0.8, -0.2, 0.05, 0.02, 4), color: 0xffb040, o: { x: sx * 0.08, y: 2.2, z: 1.25 } }))
    ]));
  }
  // the amber round it, the strands of resin that hold it up into the boughs, a drop gathering underneath
  // a blob of resin, not a bubble: lumpy, thicker at the bottom where it has run down
  const sgeo = new THREE.SphereGeometry(1, 24, 18), sp = sgeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), k = 1 + (fbm(x * 1.7 + 3, z * 1.7 + y * 1.3, 5) - 0.5) * 0.35 + Math.max(0, -y) * 0.12; sp.setXYZ(i, x * k, y * k - Math.max(0, -y) * 0.15, z * k); }
  sgeo.computeVertexNormals();
  const shell = new THREE.Mesh(sgeo, amberMat({ alpha: 0.62, glow: 0.85 }));
  shell.scale.set(1.0, 1.5, 1.7); shell.position.y = 1.75; shell.renderOrder = 3; body.add(shell);
  const rr = RNG(23), sg = [];
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + rr.range(-0.3, 0.3), x0 = Math.sin(a) * 0.55, z0 = Math.cos(a) * 0.9; sg.push(rootGeo(bend(rr, [x0, 2.9 + rr.range(0, 0.3), z0], [x0 * 3.5 + rr.range(-1, 1), 8.5, z0 * 2.2 + rr.range(-1, 1)], 4, 0.5), rr.range(0.04, 0.07), 0.015, 14, 5)); }
  const drop = G.lathe([[0, 0], [0.11, 0.07], [0.15, 0.24], [0.09, 0.44], [0, 0.56]], 9); drop.translate(0, -0.35, 0); drop.deleteAttribute('uv');
  sg.push(rootGeo([V3(0, 0.25, 0), V3(0.02, 0.0, 0.01), V3(0, -0.2, 0)], 0.05, 0.03, 4, 5));
  body.add(new THREE.Mesh(mergeGeometries(sg.map((x) => x.toNonIndexed()).concat([drop.toNonIndexed()]), false), amberMat({ glow: 0.62 })));
  return g;
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
  if (L.amberDeep) out.amber = buildAmber(L, group);
  for (const p of L.props) addProp(B, I, p, L, rng, out);
  if (L.type === 'weep' || L.type === 'heart') act3Level(L, I, B, out);
  if (L.type === 'town') townBeyond(L, I, group);
  // per-level shader globals, set whenever this level's ground is drawn (only the zone the hero is in): the Edge of Tears,
  // where the last of the wind still reaches the Weeping Woods, and the Heartwood's heart that the lights beat with
  const edge = L.type === 'weep' ? [L.h - 40, L.h - 26] : [0, 0], heartAt = L.type === 'heart' ? L.spots.heart : null;
  if (out.ground) out.ground.onBeforeRender = () => { WIND.uEdge.value.set(edge[0], edge[1]); LIGHTS.heart = heartAt; };
  const inst = I.build(quality);
  B.build(quality);
  const cut = [];
  for (const k in inst) if (k.includes('#wall')) cut.push(...inst[k]);
  if (cut.length) out.walls = new WallCut(cut);
  if (out.houses || out.spin) out.village = new Village(out.houses, out.spin);
  return out;
}

// The country round Whitecliff: the map ends a few metres past the beacon, and the Act III beacon scene lowers the camera
// toward the western horizon. Dark ground runs on past the edge into the fog, and pine woods stand on it to the north
// and west, so the far fires rise over a treeline rather than out of the void. (Off the map: nothing walks there.)
function townBeyond(L, I, group) {
  const { w, h } = L, F = 150, rng = RNG(919);
  const geo = new THREE.BufferGeometry(), pos = [];
  const quad = (x0, z0, x1, z1) => pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0);
  quad(-F, -F, w + F, 0); quad(-F, h, w + F, h + F); quad(-F, 0, 0, h); quad(w, 0, w + F, h);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.translate(0, -0.03, 0); geo.computeVertexNormals();
  const apron = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x16120c }));
  apron.receiveShadow = true;
  group.add(apron);
  // the woods: thick along the edge, thinning out with distance, with the odd clearing
  const clear = L.farFires || [];
  const wood = (x, z, d) => {
    if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < 9)) return;
    if (fbm(x * 0.05 + 3.1, z * 0.05 + 7.7, 2) < 0.36) return;
    if (rng.next() > 0.62 - d * 0.008) return;
    // low enough (under 8 m) that none hides a far fire from the beacon hill
    const s = rng.range(1.0, 1.4);
    I.add('pine', x + rng.range(-1.5, 1.5), z + rng.range(-1.5, 1.5), rng.range(0, 6.28), s, -0.05, s * rng.range(0.9, 1.15));
  };
  // (from a few metres out: the village's own ring of trees stands along the edge)
  for (let z = -50; z < -6; z += 3.4) for (let x = -50; x < w + 20; x += 3.4) wood(x, z, -z);
  for (let z = -6; z < h; z += 3.4) for (let x = -50; x < -6; x += 3.4) wood(x, z, -x);
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
