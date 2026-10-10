// Turns a layout into meshes: textured ground, instanced foliage and walls, merged static props.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, LIGHTS, beatPulse, setAtmosphere } from '../gfx/gfx.js';
import { FX, puff, sapBurst, setAmbient, glowBurst } from '../gfx/fx.js';
import { CREATURES, creatureModel, hasCreature } from '../gfx/creatures.js';
import { heartWallH } from './gen3.js';
import { groundY } from './gen4.js';
import { heatAtmos } from './atmos.js';
import { tex } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { RNG, fbm, clamp, smooth, angleDiff } from '../core/util.js';
import { KIT, KITMAT, KIT_SCALE } from '../gfx/kits.js';
import { ENV } from '../gfx/env.js';
import { BED_DRY } from './genlib.js';
import { SEA, SEA_U, SEA_LIT, SEA_GLSL, buildSea, buildIce, seaBeyond, noiseTex, shoreJit, bayCorners } from './sea.js';
import { act5Level, instDef5 } from './build5.js';

// uWind: amplitude of all tree and grass sway (Act III's Still Wood sets 0 until the First Autumn). uEdge (z0, z1): south of
// z1 the wind blows whatever uWind says, fading out by z0 (the Edge of Tears); (0, 0) is off. uAutumn: see setAutumn().
export const WIND = { uTime: { value: 0 }, uHero: { value: new THREE.Vector3(0, 0, -999) }, uSnow: { value: 0 }, uWind: { value: 1 }, uEdge: { value: new THREE.Vector2(0, 0) }, uAutumn: { value: 0 } };
SEA.uTime = WIND.uTime; // (Act V's sea runs on the same clock)
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
  white: { leaf: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = clamp(tl * 3.0, 0.5, 1.2) * vec3(0.95, 0.88, 0.62);', bark: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = clamp(tl * 5.0, 0.55, 1.15) * vec3(0.86, 0.84, 0.78);' },
  // Act IV: the Field of Ash's dead trees, burnt black
  char: { leaf: 'diffuseColor.rgb *= 0.07;', bark: 'float tl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = clamp(tl * 0.3, 0.0, 0.035) * vec3(1.0, 0.9, 0.82);' }
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
  // tilt: a lean about the prop's own z axis before it turns to ry (half-buried weapons, fallen lanterns)
  add(type, x, z, ry = 0, s = 1, y = 0, sy, sz, tilt = 0) {
    (this.sets[type] ||= []).push([x, y, z, ry, s, sy ?? s, sz ?? s, tilt]);
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
      } else if (type.startsWith('cin:')) {
        // Act IV (the cinder pack): 'cin:<name>@<look>'; geometry-only scans take the game's ash rock or iron
        const [name, v] = type.slice(4).split('@'), parts = ENV.props['cinder/' + name] || ENV.props[name];
        if (!parts) { console.warn('missing cinder prop', name); continue; }
        def = { parts: parts.map((p) => ({ geo: p.geo, material: cinMat(p.mat, v), glow: p.mat.transparent || /glow/i.test(p.mat.name) })), shadow: !/^(lantern|cagedLight)$/.test(name) };
      } else if (/^(icy|cliff5|rime|c5):/.test(type)) {
        // Act V (build5.js): scans and code models in the shared ice or sea-cliff material, the rime pack's own, code dressing
        def = instDef5(type, M, quality);
        if (!def) continue;
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
            _e.set(0, it[3], it[7] || 0); _q.setFromEuler(_e);
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
  // a baked geometry (bake(), or one carrying the same position/normal/color attributes) under a full transform (a tilt)
  put(mat, geo, m) {
    const k = mat + '|' + Math.floor(m.elements[12] / CHUNK) + ',' + Math.floor(m.elements[14] / CHUNK);
    if (!this.buckets.has(k)) this.buckets.set(k, { mat, geos: [] });
    this.buckets.get(k).geos.push(geo.clone().applyMatrix4(m));
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
  if (ACT4.has(L.type) && addProp4(B, I, p, L, rng, out)) return;
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
  // the Weeping Woods' willows (wood pack): those that stand in a clearing always, the forest's thinned like the oaks;
  // on low quality only the weepers (the grove's and the mere's, which drip sap) stay scans, the forest's are code-built
  if (p.t === 'willow' && ENV.props.willow && !NO_TREES && (R.quality >= 1 || p.weeper)) {
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
      B.add(p.ash && MAT.ashBlocks ? 'ashBlocks' : p.dwarf && MAT.snowRock ? 'snowRock' : 'blocks', parts, x, z, r, s);
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
    case 'bedroll': B.add('lam', [{ geo: G.box(0.9, 0.12, 2.0), color: ACT4.has(L.type) ? 0x3a2c24 : 0x5a3a2a, o: { y: 0.06 } }, { geo: G.cyl(0.18, 0.18, 0.9, 7), color: ACT4.has(L.type) ? 0x4a3c30 : 0x6a5040, o: { y: 0.18, z: -0.85, rz: Math.PI / 2 } }], x, z, r); break;
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
  town: { A: 'leaves', B: 'mud', P: 'cobble', s: [3.4, 2.1, 1.9], r: [0.95, 0.82, 0.68], ns: 1.0, tint: 0xaaa8a0, dual: [1, 0], aur: true },
  crypt: { A: 'flags', B: 'mud', P: 'mcobble', s: [2.4, 2.1, 2.4], r: [0.72, 0.85, 0.8], ns: 1.1, tint: 0xe6e2da, dual: [0, 0] },
  pass: { A: 'snow', B: 'scree', P: 'dslab', s: [3.2, 3.6, 3.2], r: [0.55, 0.9, 0.8], ns: 1.0, tint: 0xe2e6ee, dual: [1, 0] },
  halls: { A: 'dslab', B: 'cave', P: 'herring', s: [3.6, 2.6, 2.2], r: [0.68, 0.9, 0.72], ns: 1.1, tint: 0xd6cec4, dual: [0, 0] },
  // Act III (tools/pack-wood.mjs): gold leaf litter, moss, dark peat paths; amber sap painted from L.sap, dry leaves with
  // the First Autumn; in the Heartwood the root walls take the bark scan, projected on the steep faces
  weep: { A: 'goldleaf', B: 'moss', P: 'peat', s: [3.0, 2.4, 2.6], r: [0.92, 0.95, 0.9], ns: 1.0, tint: 0xa49884, dual: [1, 1], sap: true, dry: true, sat: 0.72, hueA: [1.0, 1.12, 0.7] },
  // (the Heartwood's peat and bark are very dark scans: a light tint keeps its floor readable; dryK holds the Autumn's
  // leaves, which are light already, near their own brightness)
  heart: { A: 'peat', B: 'rootwall', P: 'goldleaf', W: 'rootwall', s: [2.6, 2.2, 2.8], r: [0.85, 0.8, 0.92], ns: 1.1, tint: 0xd8ccc0, dual: [1, 0], sap: true, dry: true, dryK: 0.6, ws: 2.4, sat: 0.8 }
};
// Act IV: the cinder pack's layers, or (until it is there) the nearest the loaded packs have
const lay4 = (...ids) => ids.find((k) => ENV.layers[k]) || null;
function ground4(type) {
  if (type === 'ashfield') {
    const A = lay4('cinder/ashGround', 'scree', 'mud'), own = A === 'cinder/ashGround';
    return { A, B: lay4('cinder/scree', 'cinder/ashTrod', 'scree', 'leaves'), P: lay4('cinder/road', 'gravel', 'trail'), W: lay4('cinder/cliffRock', 'cliff') || undefined,
      s: [3.2, 2.6, 2.4], r: [0.95, 0.9, 0.85], ns: 1.0, tint: own ? 0xb0aaa4 : 0x8c8884, dual: [1, 0], ws: 3.4, sat: own ? 0.8 : 0.16 };
  }
  const A = lay4('cinder/forgeTiles', 'dslab', 'flags'), own = A === 'cinder/forgeTiles';
  return { A, B: lay4('cinder/ironPlate', 'cinder/rust', 'cave', 'mud'), P: lay4('cinder/forgeHerring', 'herring', 'mcobble'), W: lay4('cinder/cliffRock', 'cavewall', 'dwall', 'wall'),
    s: [2.6, 2.2, 2.2], r: [0.75, 0.55, 0.7], ns: 1.1, tint: own ? 0xc4bab0 : 0x9e968e, dual: [0, 0], ws: 2.6, sat: own ? 0.85 : 0.55 };
}
// Act V: the rime pack's layers, each a chain down to a layer that is always there (the deep's snow and stone, the base
// set's). A fallback A that is no snow is whitened over (fake) and the farlight's blue ice tinted (hueB). G_GLINT on the
// snow, G_WET on the coast's shore (wet sand behind the ebb, from aBed and uWetLevel), G_AUR on both (and the town's)
function ground5(type) {
  const A = lay4('rime/snow', 'snow', 'flags'), own = A === 'rime/snow', snowy = own || A === 'snow';
  const B = type === 'coast' ? lay4('rime/shore', 'gravel', 'mud') : lay4('rime/ice', 'snow', 'flags');
  return { A, B, P: lay4('rime/snowTrod', 'snow', 'trail'), W: lay4('rime/seaCliff', 'cliff', 'wall') || undefined,
    s: [3.2, 2.4, 2.6], r: [0.6, 0.8, 0.85], ns: 1.0, tint: own ? 0xd4dae4 : 0xbcc4d0, dual: [1, 0], ws: 3.2, sat: own ? 0.9 : snowy ? 0.75 : 0.35,
    // (a stand-in shore is drawn cold and grey: the base set's mud would read as a meadow)
    hueB: type === 'farlight' ? (B !== 'rime/ice' ? [0.62, 0.82, 1.08] : null) : B === 'rime/shore' ? null : B === 'gravel' ? [0.86, 0.9, 0.96] : [0.62, 0.66, 0.74],
    fake: !snowy, glint: true, wet: type === 'coast', aur: true, edge: type === 'farlight' };
}
// the ground's beds at its corners (the wet sand, and the bed the deep water hides): the corner's cells' mean, as the
// water's (cornerBeds), but thick ice, a window or the jetty count as dry land (the layout gives them the open sea's bed
// for the water's colour under them)
function groundBeds(L) {
  const { w, h } = L, W = w + 1, out = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let s = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const x = vx + dx, z = vz + dz, i = z * w + x; s += x < 0 || z < 0 || x >= w || z >= h ? -0.6 : L.thick[i] || L.window[i] || L.deck[i] ? BED_DRY : L.bed[i]; }
    out[vz * W + vx] = s / 4;
  }
  return out;
}
function buildGround(L, group) {
  const { w, h, cells, paint } = L;
  const geo = new THREE.PlaneGeometry(w, h, w, h);
  geo.rotateX(-Math.PI / 2);
  geo.translate(w / 2, 0, h / 2);
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), blend = new Float32Array(n), lay = new Float32Array(n * 4);
  const D = L.dist, crypt = L.type === 'crypt', halls = L.type === 'halls', pass = L.type === 'pass';
  const heart = L.type === 'heart', act3 = heart || L.type === 'weep', LG = L.spots?.lanternglade;
  const act4 = !!L.hgt, forge = L.type === 'forge'; // Act IV: the layout carries its own heights (gen4.js terrain)
  const act5 = ACT5.has(L.type), vbed = act5 && L.bed ? groundBeds(L) : null, vbay = act5 ? bayCorners(L) : null, far = L.type === 'farlight', jit = act5 ? shoreJit(L) : null;
  const sapW = act3 ? new Float32Array(n) : null, watW = far ? new Float32Array(n) : null;
  // (the Farthest Light: a lead sealed before this build, thick ice over the sea's bed, which the frozen water covers)
  const sealedF = (c) => far && L.thick[c] && cells[c] && [0, 1, w + 1, w + 2].some((d) => L.hgt[c + Math.floor(c / w) + d] < -2.3);
  const cellAt = (x, z) => (x < 0 || z < 0 || x >= w || z >= h ? -1 : z * w + x);
  const roomAt = crypt ? new Uint8Array(w * h) : null;
  if (crypt) for (const r of L.rooms) for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) roomAt[z * w + x] = 1;
  const cap = pass ? 12 : 9;
  for (let i = 0; i < n; i++) {
    const vx = Math.round(pos.getX(i)), vz = Math.round(pos.getZ(i));
    let pv = 0, fl = 0, dd = 0, cnt = 0, rm = 0, hole = 0, cave = 0, ave = 0, dk = 0, sp = 0, iron = 0;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      const c = cellAt(vx + dx, vz + dz); if (c < 0) { dd += cap; cnt++; continue; }
      pv += paint[c]; fl += cells[c]; dd += Math.min(D[c] === 255 ? cap : D[c], cap); cnt++;
      if (crypt) rm += roomAt[c];
      if (L.low && L.low[c]) hole++;
      if (act3) { if (L.deck[c]) dk++; sp += L.sap[c]; }
      if (halls && cells[c]) { cave += L.fk[c] === 2 ? 1 : 0; ave += L.fk[c] === 1 ? 1 : 0; }
      if (forge && L.fk[c] === 2) iron++;
    }
    pv /= 4; fl /= 4; dd /= cnt; rm /= 4;
    const nz = fbm(vx * 0.15, vz * 0.15, L.seed || 1);
    const big = fbm(vx * 0.045 + 31, vz * 0.045 - 17, (L.seed || 1) + 5), mac = fbm(vx * 0.09 - 7, vz * 0.09 + 11, (L.seed || 1) + 9);
    let k, wb, wp;
    if (act5) {
      // the coast: snow on the land, the shore's stone and sand wherever the tide reaches (and a little above it), the sea
      // cliffs on the steep faces; the sea's bed dark under the water. The Farthest Light: snow on the thick ice, blue
      // ice showing through it in patches along the road; the bed under the thin ice and the leads, black
      let y = L.hgt[vz * (w + 1) + vx];
      // (an ice window's pit has its own walls, the iceWindow prop's, along the window's edge: the floor round it stays
      // level to that edge instead of sloping down into the pit)
      if (y < -0.5) { let win = 0, fl2 = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const c = cellAt(vx + dx, vz + dz); if (c < 0) continue; if (L.window[c]) win++; else if (cells[c] && !L.ice[c] && !L.sea?.[c] && !L.low[c]) fl2++; } if (win && fl2) y = 0; }
      pos.setY(i, y);
      // (the coast's shore wanders off the grid: sea.js shoreJit, the water takes the same nudge)
      if (jit) { const j = (vz * (w + 1) + vx) * 2; pos.setX(i, vx + jit[j]); pos.setZ(i, vz + jit[j + 1]); }
      // (tidal: a bed the tide reaches and nothing over it; the thin ice's cells carry the sea's bed but are no shore)
      let walls = 0, tide = 0, thick = 0, tw = 0;
      const tidal = (c) => L.bed && L.bed[c] < BED_DRY && !L.thick[c] && !L.ice[c] && !L.window[c] && !L.deck[c];
      for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const c = cellAt(vx + dx, vz + dz); if (c < 0 || (!cells[c] && !L.low[c])) walls++; if (c >= 0 && tidal(c)) tw++; }
      for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const c = cellAt(vx + dx, vz + dz); if (c < 0) continue; if (tidal(c)) tide++; if (L.thick[c]) thick++; if (watW && (L.sea[c] || sealedF(c))) watW[i] += 0.25; }
      wp = clamp(pv * 1.25, 0, 1);
      // (the shore's stone runs a little up the dry land, ragged, so the tide line is no polygon)
      if (far) wb = thick ? clamp((nz - 0.5) * 2.2 + (big - 0.5) * 1.6 + 0.25, 0, 0.9) : 0;
      // (thick ice by the shore, the ice windows' rims: its snow frays into the stone instead of ending on a square)
      else if (thick && !tide) { wb = clamp(tw / 16 * 1.9 - 0.5 + (nz - 0.5) * 1.3 + (big - 0.5) * 0.6, 0, 0.9); wp *= 1 - wb; }
      else wb = clamp(tw / 16 * 1.7 - 0.15 + (nz - 0.5) * 0.9 + (big - 0.5) * 0.6, 0, 1);
      k = fl > 0 || tide || thick ? 0.92 + nz * 0.16 : Math.max(0.5, 0.96 - Math.min(Math.max(y, 0), 14) * 0.025) + (nz - 0.5) * 0.12;
      if (y < -0.3) k *= 0.45;
    } else if (act4) {
      // the Field: ash on the floor, black scree up the slopes, the rock face where they steepen; the Forge: volcanic tiles,
      // iron plate in the galleries and bellows chambers, Karthax's herringbone on the Anvil, walls of black rock
      const y = L.hgt[vz * (w + 1) + vx];
      pos.setY(i, y);
      let walls = 0;
      for (let dz = -2; dz <= 1; dz++) for (let dx = -2; dx <= 1; dx++) { const c = cellAt(vx + dx, vz + dz); if (c < 0 || (!cells[c] && !L.low[c])) walls++; }
      wp = clamp(pv * 1.25, 0, 1);
      if (forge) {
        k = fl > 0 || hole ? (0.96 + nz * 0.12) * (1 - Math.min(walls, 8) * 0.04) : 0.7 + nz * 0.24 - clamp(y / 16, 0, 0.22);
        wb = clamp(iron / 4 * 1.3 + (nz - 0.5) * 0.5 - (fl > 0 ? 0 : 0.2), 0, 1);
      } else {
        k = fl > 0 || hole ? 0.9 + nz * 0.22 : Math.max(0.36, 0.86 - Math.min(y, 12) * 0.05) + (nz - 0.5) * 0.15;
        wb = clamp((fl > 0 ? -0.18 + walls * 0.03 : 0.3 + dd * 0.08) + (nz - 0.5) * 1.8 + (big - 0.5) * 1.5, 0, 1);
      }
      if (hole) k *= 0.42;
    } else if (halls) {
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
      k = fl2 > 0 ? (0.93 + nz * 0.18) * (heart ? 1 - Math.min(walls, 8) * 0.02 : 1) : heart ? 0.8 + nz * 0.22 : Math.max(0.3, 0.72 - dd * 0.06);
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
  // Act V: the floor is level wherever it is walked (the pits of the sea bed and of the ground under the thin ice beside it
  // would tilt its corners' normals, and the ice road would take the cliff layer)
  if (act5) { const nr = geo.attributes.normal; for (let i = 0; i < n; i++) if (Math.abs(pos.getY(i)) < 0.01) nr.setXYZ(i, 0, 1, 0); }
  // (the Farthest Light: the bed under the thin ice and the leads is never seen, the opaque ice and the opaque black water
  // lie over every such cell: its quads are left out, which spares the phone their vertices and the depth test their pixels.
  // Both zones: an ice window's cells, whose pit is the iceWindow prop's, walls and floor, seen through the pane)
  if (act5) {
    const ix = geo.index.array, keep = [];
    // (and the pit under a footprint in the thin ice, which the ice covers: sea.js)
    const pit = (c) => L.thick[c] && !cells[c] && [0, 1, w + 1, w + 2].some((d) => L.hgt[c + Math.floor(c / w) + d] < -0.5);
    for (let c = 0; c < w * h; c++) if (!L.window[c] && !(far && (L.ice[c] || L.sea?.[c] || pit(c) || sealedF(c)))) for (let k = 0; k < 6; k++) keep.push(ix[c * 6 + k]);
    geo.setIndex(keep);
  }
  const cfg = GROUND[L.type] || (act5 ? ground5(L.type) : act4 ? ground4(L.type) : GROUND.forest);
  if (ENV.ready && ENV.layers[cfg.A]) {
    geo.setAttribute('aLay', new THREE.BufferAttribute(lay, 4));
    if (sapW) geo.setAttribute('aSap', new THREE.BufferAttribute(sapW, 1));
    if (watW) geo.setAttribute('aWat', new THREE.BufferAttribute(watW, 1));
    if (cfg.wet) geo.setAttribute('aBed', new THREE.BufferAttribute(vbed || new Float32Array(n).fill(BED_DRY), 1));
    if (cfg.wet) geo.setAttribute('aBay', new THREE.BufferAttribute(vbay || new Float32Array(n), 1));
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
  if (X.dry) { const Dr = ENV.layers.dryleaf; Object.assign(uni, { tD: { value: (Dr || A).d }, uDryTint: { value: new THREE.Color(Dr ? 0xffffff : 0xc89a70).multiplyScalar(cfg.dryK ?? 1) }, uAut: WIND.uAutumn }); }
  if (X.wall) { const W = lay(cfg.W); Object.assign(uni, { tW: { value: W.d }, tWn: { value: W.n }, uWS: { value: 1 / (cfg.ws || 2.4) } }); }
  // Act V (sea.js): the snow's glints (not on low quality), the wet sand behind the ebb, the aurora's light on the ground
  const X5 = { glint: !!cfg.glint && R.quality >= 1, wet: !!cfg.wet, aur: !!cfg.aur, fake: !!cfg.fake, hueB: !!cfg.hueB, edge: !!cfg.edge };
  X5.any = X5.glint || X5.wet || X5.aur || X5.edge;
  if (X5.any) { noiseTex(); Object.assign(uni, SEA_U({ uWetLevel: SEA.uWetLevel, uLevel: SEA.uLevel, uBayLevel: SEA.uBayLevel }), SEA_LIT); }
  if (X5.hueB) uni.uHueB = { value: new THREE.Vector3(...cfg.hueB) };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    // the anti-repeat second reading is a desktop luxury (quality 2); phones get one reading per layer
    const dual = R.quality >= 2;
    sh.defines = Object.assign(sh.defines || {}, nrm ? { G_NRM: '' } : {}, dual && cfg.dual[0] ? { G_DA: '' } : {}, dual && cfg.dual[1] ? { G_DP: '' } : {},
      X.sap ? { G_SAP: '' } : {}, X.dry ? { G_DRY: '' } : {}, X.wall ? { G_WALL: '' } : {}, X.wall && nrm && uni.tWn.value ? { G_WNRM: '' } : {},
      X5.glint ? { G_GLINT: '' } : {}, X5.wet ? { G_WET: '' } : {}, X5.aur ? { G_AUR: '' } : {}, X5.edge ? { G_EDGE: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aLay;\nvarying vec4 vLay;\nvarying vec2 vGP;\nvarying vec3 vGN;' + (X.sap ? '\nattribute float aSap;\nvarying float vSap;' : '') + (X.wall ? '\nvarying float vGY;' : '') + (X5.wet ? '\nattribute float aBed;\nvarying float vBed;\nattribute float aBay;\nvarying float vBay;' : '') + (X5.edge ? '\nattribute float aWat;\nvarying float vWat;' : '') + (X5.any ? '\nvarying vec3 vGW;' : '') + (X5.aur ? '\n' + SEA_GLSL() + '\nvarying vec3 vGAur;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLay = aLay; vGP = (modelMatrix * vec4(transformed, 1.0)).xz; vGN = normal;' + (X.sap ? ' vSap = aSap;' : '') + (X.wall ? ' vGY = (modelMatrix * vec4(transformed, 1.0)).y;' : '') + (X5.wet ? ' vBed = aBed; vBay = aBay;' : '') + (X5.edge ? ' vWat = aWat;' : '') + (X5.any ? ' vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;' : '')
      // (the aurora's light on the ground: slow soft ribbons, worked out at the vertices, a metre apart)
      + (X5.aur ? '\n  vGAur = uAur * max(1.0 - uAurDark, uAurFront) > 0.02 ? aurora(vGW.xz * 0.9 + vec2(13.0, -40.0), 1.0, 0.0) * 0.06 : vec3(0.0);' : ''));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D tP; uniform sampler2D tAn; uniform sampler2D tBn; uniform sampler2D tPn;
uniform vec3 uS; uniform vec3 uR; uniform float uNS;
varying vec4 vLay; varying vec2 vGP; varying vec3 vGN;
float gH(vec3 c) { return sqrt(dot(c, vec3(0.3, 0.55, 0.15))); }` + (X.sap ? '\nvarying float vSap;' : '') + (X.sat ? '\nuniform float uSat;' : '') + (cfg.hueA ? '\nuniform vec3 uHueA;' : '') + (X.dry ? '\nuniform sampler2D tD; uniform vec3 uDryTint; uniform float uAut;' : '') + (X.wall ? '\nuniform sampler2D tW; uniform sampler2D tWn; uniform float uWS; varying float vGY;' : '')
      + (X5.hueB ? '\nuniform vec3 uHueB;' : '') + (X5.wet ? '\nvarying float vBed; varying float vBay; uniform float uWetLevel; uniform float uLevel; uniform float uBayLevel;' : '') + (X5.edge ? '\nvarying float vWat;' : '')
      + (X5.any ? SEA_GLSL() + '\nvarying vec3 vGW; uniform vec3 uMoonD; uniform vec3 uMoonC; uniform vec3 uHeroP; uniform vec3 uHeroC;\nvec3 gEm = vec3(0.0);' : '') + (X5.aur ? '\nvarying vec3 vGAur;' : ''))
      .replace('#include <map_fragment>', (X5.wet ? `
  // (under closed water the sea, 95% opaque from 0.43 m, hides the bed: past 0.5 m it is not drawn at all, its layers and
  // its lights spared, the open sea's floor at low water too. Skerry Bay keeps its own level: sea.js)
  if (mix(uLevel, uBayLevel, vBay) - vBed > 0.5) discard;` : '') + (X5.edge ? `
  // the Farthest Light's open water: the snow and the thick ice end on it along a frayed line a little in from the cells'
  // edge (the water runs on under that band: sea.js), never along their squares
  if (vWat > 0.001) { vec4 gE = texture2D(tNoise, vec2(vGW.x * 0.021 + vGW.z * 0.006, vGW.z * 0.07) + 0.29); if (vWat * 1.5 + (gE.a - 0.5) * 0.5 + (gE.b - 0.5) * 0.2 > 0.38) discard; }` : '') + `
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
  vec3 cB = texture2D(tB, uB).rgb;` + (cfg.hueA ? '\n  cA *= uHueA;' : '') + (X5.hueB ? '\n  cB *= uHueB;' : '') + `
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
  // the First Autumn: dry leaves drift over everything but the trodden paths (none before it: a uniform branch)
  if (uAut > 0.001) {
    vec3 cD = texture2D(tD, vGP * uS.x * 0.93 + vec2(0.37, 0.11)).rgb * uDryTint;
    float wD = uAut * smoothstep(0.32, 0.6, vLay.z * 0.8 + gH(cD) * 0.7 - wP * 0.4 - 0.01);
    gc = mix(gc, cD, wD); gh = mix(gh, gH(cD), wD);
  }` : '') + (X.sap ? `
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
  // (the flat floor skips the bark: steep changes smoothly, so where the branch splits a pixel quad its weight is ~0)
  if (steep > 0.001) {
    vec3 cW = texture2D(tW, uWx).rgb * wbw.x + texture2D(tW, uWz).rgb * wbw.y;
    gc = mix(gc, cW, steep); gh = mix(gh, gH(cW), steep);
  }` : '') + (X5.fake ? `
  // (no snow layer loaded: whiten whatever stands in for it, keeping its relief)
  gc = mix(gc, vec3(0.7, 0.74, 0.8) * (0.8 + 0.34 * gh), 0.8 * (1.0 - wB) * (1.0 - wP * 0.4));` : '') + (X5.wet ? `
  // wet sand: dark and glossy where the tide has been within the last 20 s (and under the water now)
  float gWet = smoothstep(-0.03, 0.06, mix(uWetLevel, uBayLevel, vBay) - vBed) * (1.0 - wP * 0.6);
  gc *= mix(vec3(1.0), vec3(0.46, 0.5, 0.54), gWet);` : '') + (X5.any ? `
  vec3 gV = normalize(cameraPosition - vGW);` : '') + (X5.wet ? `
  gEm += uMoonC * pow(max(dot(reflect(-gV, vec3(0.0, 1.0, 0.0)), uMoonD), 0.0), 18.0) * gWet * 0.05;` : '') + (X5.glint ? `
  // the wind's work on the snow: long low drifts and scoured hollows, a cold blue in the hollows (not on the shore's stone)
  {
    vec4 gS = texture2D(tNoise, vec2(vGW.x * 0.012 + vGW.z * 0.004, vGW.z * 0.045) + 0.53);
    float sst = gS.b * 0.65 + gS.a * 0.35, sk = (1.0 - wB) * (1.0 - wP * 0.5);
    gc *= mix(vec3(1.0), mix(vec3(0.8, 0.86, 0.95), vec3(1.06), smoothstep(0.3, 0.72, sst)), sk);
  }
  // the snow glitters: a few 4 cm cells, each with its own tilt, catch the moon or the lantern toward the eye
  {
    vec3 g3 = floor(vGW * 25.0);
    vec2 gq = g3.xz + g3.y * vec2(0.131, 0.217);
    float gs = sH(gq) * smoothstep(0.55, 0.85, normalize(vGN).y);
    if (gs > 0.965) {
      vec3 mn = normalize(vec3(sH(gq + 1.7) - 0.5, 0.75, sH(gq + 5.3) - 0.5)), rr = reflect(-gV, mn);
      vec3 hd = uHeroP - vGW; float hl = length(hd);
      float sp = pow(max(dot(rr, uMoonD), 0.0), 90.0) * min(dot(uMoonC, vec3(0.4)), 1.2) + pow(max(dot(rr, hd / hl), 0.0), 90.0) * min(dot(uHeroC, vec3(0.012)), 1.0) / (1.0 + hl * hl * 0.02);
      gEm += vec3(0.85, 0.92, 1.0) * sp * 2.2 * (1.0 - wB) * (1.0 - wP * 0.8);
    }
  }` : '') + (X5.aur ? `
  // the aurora's light drifting over the ground in slow green ribbons (from the vertices; none under the black aurora)
  gEm += vGAur;` : '') + `
  diffuseColor.rgb *= gc * (0.82 + 0.36 * vLay.w);`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(mix(mix(uR.x, uR.y, wB), uR.z, wP) * (1.12 - 0.25 * gh), 0.3, 1.0);` + (X.sap ? '\n  roughnessFactor = mix(roughnessFactor, 0.14, wS);' : '') + (X5.wet ? '\n  roughnessFactor = mix(roughnessFactor, 0.2, gWet);' : ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + (X5.any ? '\n  totalEmissiveRadiance += gEm;' : ''))
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
  if (steep > 0.001) { vec3 nW = texture2D(tWn, wbw.x > wbw.y ? uWx : uWz).xyz * 2.0 - 1.0; tn = mix(tn, nW, steep); }
#endif
  vec3 gN = normalize(vGN), gT = normalize(abs(gN.x) < 0.9 ? vec3(1.0, 0.0, 0.0) - gN * gN.x : vec3(0.0, 0.0, 1.0) - gN * gN.z), gB = cross(gN, gT);` : `
  vec3 gN = normalize(vGN), gT = normalize(vec3(1.0, 0.0, 0.0) - gN * gN.x), gB = cross(gN, gT);`) + `
  normal = normalize((viewMatrix * vec4(normalize(gT * tn.x + gB * tn.y + gN * tn.z), 0.0)).xyz);
#endif`);
  };
  m.customProgramCacheKey = () => 'groundPBR|' + type + (nrm ? '|n' : '') + '|q' + R.quality + (cfg.fake ? '|f' : '') + (cfg.hueB ? '|b' : '') + (cfg.edge ? '|e' : '');
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
  // Act IV: the Forge's lava follows its heat (setHeat), the Field's ember sinks are mostly crust
  const heat = L.type === 'forge' ? HEAT.uLava : L.type === 'ashfield' ? { value: 0.55 } : null;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  mat.toneMapped = false; // keep the glow saturated: ACES would wash it out to straw
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.tCrust = { value: crust || null };
    if (heat) sh.uniforms.uHeat = heat;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vLP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime; uniform sampler2D tCrust; varying vec2 vLP;${heat ? '\nuniform float uHeat;' : ''}
float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ln(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(lh(i), lh(i + vec2(1, 0)), f.x), mix(lh(i + vec2(0, 1)), lh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `
  vec2 q = vLP * 0.22;
  float t = uTime;
  float heat = ln(q * 3.0 + vec2(t * 0.11, -t * 0.07)) * 0.6 + ln(q * 7.0 - vec2(t * 0.05, t * 0.13)) * 0.4;
  ${crust ? `vec3 c1 = texture2D(tCrust, q * 0.9 + vec2(t * 0.012, t * 0.006)).rgb, c2 = texture2D(tCrust, q * 0.6 - vec2(t * 0.008, -t * 0.01) + 0.37).rgb;
  float crack = max(clamp((c1.r - c1.b) * 2.6 - 0.15, 0.0, 1.0), clamp((c2.r - c2.b) * 2.6 - 0.15, 0.0, 1.0) * 0.7);
  float crustK = smoothstep(0.3, 0.62, 1.0 - heat) * (1.0 - crack);` : `// no crust scan: veins where the noise crosses its middle
  float crack = min(1.0, (1.0 - smoothstep(0.0, 0.07, abs(ln(q * 5.0 + vec2(t * 0.01, 0.0)) - 0.5))) * 0.9 + (1.0 - smoothstep(0.0, 0.045, abs(ln(q * 11.0 + 3.7) - 0.5))) * 0.5);
  float crustK = smoothstep(0.3, 0.62, 1.0 - heat) * (1.0 - crack);`}
  vec3 hot = mix(vec3(0.95, 0.2, 0.02), vec3(1.0, 0.62, 0.16), smoothstep(0.6, 1.0, heat + crack * 0.35));${heat ? `
  // cooler: more of it crusts over and the seams dim; hotter: the crust breaks up and the melt brightens toward gold
  crustK = clamp(crustK + (1.0 - min(uHeat, 1.0)) * 0.75 - max(uHeat - 1.0, 0.0) * 0.35, 0.0, 1.0);
  hot = mix(hot * min(uHeat, 1.0), vec3(1.0, 0.42, 0.07), clamp(uHeat - 1.0, 0.0, 0.3) * 1.4);` : ''}
  ${crust ? 'vec3 crustC = c1 * vec3(0.32, 0.26, 0.24);' : 'vec3 crustC = vec3(0.045, 0.035, 0.03);'}
  vec3 col = mix(hot * (0.95 + 0.15 * sin(t * 1.7 + vLP.x * 0.4)), crustC + hot * 0.05, crustK * 0.95);${heat ? `
  col *= mix(1.0, 0.5, clamp(crustK * (1.0 - min(uHeat, 1.0)) * 2.0, 0.0, 1.0)); // a cooler crust is a darker one` : ''}
  diffuseColor.rgb = col;`);
  };
  mat.customProgramCacheKey = () => 'lava' + (crust ? 'c' : '') + (heat ? 'h' : '');
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
    // (culled by the sphere creatureModel gave it: it is on screen only at the Edge of Tears)
    m.mesh.traverse((n) => { if (n.isMesh) n.castShadow = R.quality >= 2; });
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

// ======================= Act IV: the Field of Ash and the Ashen Forge =======================
// The cinder pack's scans where it has them ('cin:' instancing, cinderProp), code-built stand-ins where it does not.
// setHeat (the Forge), setNight (the Field) and setFlueGlow drive the shared uniforms below.
export const HEAT = { k: 0, uLava: { value: 0.8 }, uGrate: { value: 0.2 }, gain: { k: 0.75 }, flue: [0, 1, 2, 3].map(() => ({ value: 0 })) };
const NIGHT = { mode: 'ash', gain: { k: 1 }, stars: null, glow: null };
const ACT4 = new Set(['ashfield', 'forge']);
const ACT5 = new Set(['coast', 'farlight']);
const cinder = (name) => ENV.props['cinder/' + name] || null;
const DEAD = new THREE.Color(0x15130f), LIT = new THREE.Color(0xffc070);
// the extent of a scanned prop (its parts' bounding boxes): { x, y, z, y0 }
const SIZE4 = new Map();
function size4(parts) {
  if (!parts) return null;
  if (SIZE4.has(parts)) return SIZE4.get(parts);
  const b = new THREE.Box3();
  for (const p of parts) { if (!p.geo.boundingBox) p.geo.computeBoundingBox(); b.union(p.geo.boundingBox); }
  const s = { x: b.max.x - b.min.x, y: b.max.y - b.min.y, z: b.max.z - b.min.z, y0: b.min.y };
  SIZE4.set(parts, s);
  return s;
}
// where the cinder brazier's fire sits, placed h tall: { y, r } from its extras (the coal bed in the bowl), or null
function brazierFire(h) {
  const parts = cinder('brazier'), sz = size4(parts), ex = ENV.extras['cinder/brazier'];
  if (!parts || !ex?.fire) return null;
  const k = h / Math.max(0.01, sz.y);
  return { y: (ex.fire[1] - sz.y0) * k, r: (ex.fireR || 0.3) * k };
}
// a cinder scan placed at a wanted size: 'h' its height, 'l' its longest side; laid along local z when it is long in x
function cin4(I, name, x, z, r, want, by = 'h', y = 0, look = '', tilt = 0, base = false) {
  const parts = cinder(name) || (base && ENV.props[name]), sz = size4(parts);
  if (!sz) return false;
  // (by height, but never wider than 1.6 times what was asked: a flat scan must not balloon)
  const k = by === 'h' ? Math.min(want / Math.max(0.01, sz.y), (want * 1.6) / Math.max(0.01, sz.x, sz.z)) : want / Math.max(0.01, sz.x, sz.y, sz.z);
  I.add('cin:' + name + (look ? '@' + look : ''), x, z, r + (by === 'l' && sz.x > sz.z ? Math.PI / 2 : 0), k, y - sz.y0 * k, k, k, tilt);
  return true;
}
// materials for the cinder scans: geometry-only rock takes the ash rock (or iron), the glass of a dead lantern is dark,
// 'char' blackens a scan (dead trees on the Field)
const CIN_MAT = new Map();
function cinMat(mat, v) {
  const M = mats();
  if (!mat.map && !mat.normalMap && !mat.transparent && !/glow/i.test(mat.name)) return v === 'iron' || v === 'dead' ? M.iron : M.ashRockW || M.lam;
  if ((mat.transparent || /glow|glass/i.test(mat.name)) && v === 'dead') return graveGlass();
  if (!v || v === 'iron' || mat.transparent) return mat;
  const key = mat.uuid + v;
  if (!CIN_MAT.has(key)) {
    // charred (or ash-dusted): darker, and most of the colour gone out of it
    // ('dead': a lantern's brass gone to black iron)
    const m = mat.clone(), sat = v === 'ash' ? 0.55 : 0.25;
    m.color = m.color.clone().multiplyScalar(v === 'char' ? 0.42 : v === 'dead' ? 0.5 : 0.72);
    occlude(m, (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, ${sat.toFixed(2)});`); });
    m.customProgramCacheKey = () => 'cin|' + v + '|' + m.type + '|occ';
    CIN_MAT.set(key, m);
  }
  return CIN_MAT.get(key);
}
// the Graves' lantern glass: dead dark, lit warm at dawn (setNight)
function graveGlass() {
  return MAT.graveGlass ||= new THREE.MeshBasicMaterial({ color: (NIGHT.mode === 'dawn' ? LIT : DEAD).clone(), transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}
function act4Mats() {
  const M = mats(), key = (ENV.packs.cinder ? 'c' : '') + (ENV.packs.deep ? 'd' : '') + (ENV.ready ? 'e' : '');
  if (MAT.act4Key === key) return M;
  MAT.act4Key = key;
  if (!MAT.iron) {
    MAT.iron = occlude(new (Std())({ vertexColors: true, flatShading: true }));
    if (MAT.iron.isMeshStandardMaterial) { MAT.iron.metalness = 0.35; MAT.iron.roughness = 0.68; MAT.iron.envMapIntensity = 0.12; }
    MAT.obsidian = occlude(new (Std())({ vertexColors: true, flatShading: true }));
    if (MAT.obsidian.isMeshStandardMaterial) { MAT.obsidian.metalness = 0.1; MAT.obsidian.roughness = 0.3; MAT.obsidian.envMapIntensity = 0.35; }
  }
  if (ENV.ready) {
    // (no rock layer at all: a plain dark stone, never the base set's masonry)
    const rock = lay4('cinder/cliffRock', 'cavewall', 'cliff'), own = rock === 'cinder/cliffRock';
    MAT.ashRockW = rock ? worldMat(rock, { scale: 2.6, tri: true, rough: 0.9, tint: own ? 0xb4aea8 : 0x56524e }) : occlude(new THREE.MeshLambertMaterial({ color: 0x3a3836 }));
    MAT.ashBlocks = worldMat(lay4('cinder/cliffRock', 'dwall', 'blocks'), { scale: 2.0, vc: 0.144, tri: true, rough: 0.85, tint: own ? 0xc0bab4 : 0x6a6662 });
    MAT.flagsW = worldMat(lay4('cinder/forgeTiles', 'flags', 'blocks'), { scale: 2.6, rough: 0.8, tint: own ? 0x9a948e : 0x6e6a66 });
  }
  return M;
}
// grates in the Forge's floor: their slots glow with the heat (HEAT.uGrate) and with their flue's breath (HEAT.flue[g])
let grateTex = null;
function grateTexture() {
  if (grateTex) return grateTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#4a4440'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#080605'; for (let i = 0; i < 6; i++) g.fillRect(5 + i * 9.6, 6, 5, 52);
  g.strokeStyle = '#2a2624'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);
  grateTex = new THREE.CanvasTexture(c); grateTex.colorSpace = THREE.SRGBColorSpace;
  return grateTex;
}
function grateMat(gi) {
  const k = 'grate' + gi;
  if (MAT[k]) return MAT[k];
  const L4 = ENV.layers['cinder/grate'], map = L4?.d || grateTexture(), mask = L4 ? ENV.layers['cinder/grateGlow']?.d : null;
  const m = new THREE.MeshLambertMaterial({ map, color: 0x8a847e });
  const u = { uHeat: HEAT.uGrate, uFlue: gi >= 0 ? HEAT.flue[gi] : HEAT.flue[3], uSlots: { value: mask } };
  // the slots are the openings: fire shows through them (the pack's glow mask, or the dark of the code texture)
  const slot = mask ? 'texture2D(uSlots, vMapUv).r' : '1.0 - smoothstep(0.006, 0.045, dot(texture2D(map, vMapUv).rgb, vec3(0.3, 0.55, 0.15)))';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uHeat; uniform float uFlue; uniform sampler2D uSlots;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float slot = ${slot};
  totalEmissiveRadiance += vec3(0.8, 0.17, 0.02) * slot * (uHeat * 0.16 + uFlue * 1.6);`);
  };
  m.customProgramCacheKey = () => 'grate' + (mask ? 'g' : L4 ? 'p' : 'c');
  return (MAT[k] = m);
}

// ---------- code-built stand-ins (used when the cinder pack lacks a scan) ----------
const BONE = 0x9e978c, ASHIRON = 0x2a2826, CHAR = 0x1e1a17;
Object.assign(CAT, {
  ashTuft: () => ({ mat: 'wind', shadow: false, geo: grassGeo(0x24201c, 0x625c52) }),
  ashRockC: () => ({ mat: 'lam', shadow: true, parts: [{ geo: jitter(G.dodeca(0.7), 0.18, 211), color: 0x2c2a28, o: { y: 0.28, sy: 0.72 }, top: 1.15, jit: 0.2 }, { geo: jitter(G.dodeca(0.4), 0.1, 212), color: 0x262422, o: { y: 0.14, x: 0.6, z: 0.3, sy: 0.7 }, jit: 0.2 }] }),
  ashStoneC: () => ({ mat: 'lam', shadow: false, parts: [{ geo: jitter(G.dodeca(0.4), 0.1, 213), color: 0x302e2c, o: { y: 0.08, sy: 0.6 }, jit: 0.2 }] }),
  deadAsh: () => ({ mat: 'wind', shadow: true, parts: CAT.dead().parts.map((p) => ({ ...p, color: CHAR })) }),
  slag: () => ({ mat: 'lam', shadow: false, parts: [0, 1, 2].map((i) => ({ geo: jitter(G.dodeca(0.22 - i * 0.04), 0.06, 220 + i), color: 0x1c1816, o: { x: Math.sin(i * 2.1) * 0.25, z: Math.cos(i * 2.1) * 0.25, y: 0.06, sy: 0.55 }, jit: 0.25 })) }),
  slagGlow: () => ({ mat: 'glow', shadow: false, parts: [{ geo: G.box(0.16, 0.02, 0.03), color: 0xa02a06, o: { y: 0.11, rz: 0.2 } }, { geo: G.box(0.03, 0.02, 0.14), color: 0x8a2204, o: { x: 0.24, y: 0.1, z: 0.2 } }] }),
  dbSword: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.blade(0.85, 0.07), color: 0x5e5e60, o: {} }, { geo: G.box(0.26, 0.04, 0.05), color: 0x3a3430, o: {} }, { geo: G.cyl(0.018, 0.02, 0.16, 5), color: 0x2a2018, o: { y: -0.09 } }, { geo: G.ball(0.03, 5, 4), color: 0x3a3430, o: { y: -0.18 } }] }),
  dbShield: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.shape([[0, 0.55], [0.3, 0.42], [0.28, 0], [0, -0.5], [-0.28, 0], [-0.3, 0.42]], 0.05), color: 0x3c3834, o: {} }, { geo: G.oct(0.07), color: 0x5a5048, o: { z: 0.03, sz: 0.4 } }] }),
  dbHammer: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.cyl(0.022, 0.026, 0.9, 5), color: 0x2a2018, o: { y: 0.45 } }, { geo: G.box(0.3, 0.13, 0.13), color: 0x3e3c3a, o: { y: 0.9 } }] }),
  dbMace: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.cyl(0.02, 0.024, 0.7, 5), color: 0x2a2018, o: { y: 0.35 } }, { geo: jitter(G.ico(0.09, 0), 0.02, 214), color: 0x46423e, o: { y: 0.72 } }] }),
  dbSpear: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.cyl(0.02, 0.024, 2.1, 5), color: 0x2e2418, o: { y: 1.05 } }, { geo: G.cone(0.04, 0.3, 4), color: 0x5a5a5c, o: { y: 2.25 } }] }),
  dbHelm: () => ({ mat: 'lam', shadow: false, parts: [{ geo: G.dome(0.17, 0.55, 8), color: 0x4a4644, o: { sy: 1.15 } }, { geo: G.box(0.05, 0.16, 0.05), color: 0x3a3634, o: { z: 0.16, y: 0.02 } }] }),
  lanternF: () => ({ mat: 'iron', shadow: false, parts: [{ geo: G.box(0.2, 0.03, 0.2), color: ASHIRON, o: { y: 0.02 } }, { geo: G.cone(0.15, 0.12, 4), color: ASHIRON, o: { y: 0.36, ry: 0.785 } }, ...[0, 1, 2, 3].map((i) => ({ geo: G.box(0.02, 0.3, 0.02), color: ASHIRON, o: { x: (i % 2 ? 1 : -1) * 0.085, z: (i > 1 ? 1 : -1) * 0.085, y: 0.17 } })), { geo: G.torus(0.04, 0.008, 3, 8), color: ASHIRON, o: { y: 0.46 } }] }),
  lanternG: () => ({ material: graveGlass(), shadow: false, parts: [{ geo: G.box(0.15, 0.26, 0.15), color: 0xffffff, o: { y: 0.17 } }] }),
  chainLink: () => ({ mat: 'iron', shadow: false, parts: [{ geo: G.torus(0.07, 0.018, 4, 8), color: ASHIRON, o: { sy: 1.5 } }] })
});

// a hanging (or fallen) dead lantern: the cinder scans in turn, the base set's lantern, or the code one. Below high quality
// always the code one: the Graves hang some 250 of them, and a 2,000-triangle scan each is most of a phone's frame
function lantern4(I, x, y, z, r, k = 1, tilt = 0) {
  const name = cinder('cagedLight') && hash2(x * 3.1, z) < 0.35 ? 'cagedLight' : 'lantern';
  if (R.quality >= 2 && cin4(I, name, x, z, r, 0.55 * k, 'h', y, 'dead', tilt, true)) return;
  I.add('lanternF', x, z, r, k, y, k, k, tilt); I.add('lanternG', x, z, r, k, y, k, k, tilt);
}
// iron pole for the Graves: post, foot, one or two arms, the hooks
function gravePole(B, p) {
  const parts = [{ geo: G.cyl(0.045, 0.06, p.h, 5), color: ASHIRON, o: { y: p.h / 2 } }, { geo: G.cyl(0.16, 0.2, 0.12, 6), color: 0x24221f, o: { y: 0.06 } }];
  for (const a of p.arms) {
    parts.push({ geo: G.box(0.04, 0.04, 0.7), color: ASHIRON, o: { y: p.h - 0.05, x: Math.sin(a) * 0.33, z: Math.cos(a) * 0.33, ry: a } });
    parts.push({ geo: G.cyl(0.01, 0.01, 0.12, 3), color: ASHIRON, o: { y: p.h - 0.11, x: Math.sin(a) * 0.62, z: Math.cos(a) * 0.62 } });
  }
  B.add('iron', parts, p.x, p.z, 0, 1, p.y || 0);
}
// a debris piece of the old battle, half buried
const DEBRIS = { shield: ['shield', 'dbShield', 0.95, 1.35], sword: ['sword', 'dbSword', 1.0, 0.6], warhammer: ['warhammer', 'dbHammer', 1.0, 0.7], mace: ['mace', 'dbMace', 0.8, 0.8], spear: [null, 'dbSpear', 2.3, 0.45], helm: [null, 'dbHelm', 0.4, 1.4] };
// (below high quality the code pieces: a Field holds about 90, and the scans cost 1,300-2,400 triangles each and a shadow)
function debris4(I, p) {
  const [scan, code, len, lie] = DEBRIS[p.m] || DEBRIS.sword, s = p.s || 1, tilt = (p.tilt ?? 0.6) * (p.m === 'shield' ? 1.15 : 1);
  if (scan && cinder(scan) && R.quality >= 2) {
    const sz = size4(cinder(scan)), up = sz.y >= Math.max(sz.x, sz.z);
    if (cin4(I, scan, p.x, p.z, p.r || 0, len * s, 'l', -len * s * (up ? 0.22 : 0.05), 'ash', up ? Math.min(tilt, 1.1) : 0)) return;
  }
  I.add(code, p.x, p.z, p.r || 0, s, p.m === 'helm' ? 0.02 : -0.18 * s, s, s, p.m === 'helm' ? 1.4 : Math.min(tilt, lie > 1 ? 1.45 : 1.25));
}
// the bones of one of Karthax's war-drakes: spine, ribs arching over it, the skull at the front (local +z)
function drakeBones(I, B, x, z, r) {
  const at = (u, v = 0) => ({ x: x + Math.sin(r) * u + Math.cos(r) * v, z: z + Math.cos(r) * u - Math.sin(r) * v });
  const sk = at(5.2), rb = at(0.3), sp = at(-3.6);
  if (cinder('drakeRibs') && cinder('drakeSkull')) {
    cin4(I, 'drakeRibs', rb.x, rb.z, r, 6, 'l', -0.25, 'ash');
    if (!cin4(I, 'drakeSpine', sp.x, sp.z, r, 9, 'l', -0.15, 'ash')) B.add('lam', [{ geo: G.cyl(0.14, 0.05, 8, 5), color: BONE, o: { y: 0.1, rx: Math.PI / 2 } }], sp.x, sp.z, r);
    cin4(I, 'drakeSkull', sk.x, sk.z, r + 0.25, 3.2, 'l', -0.2, 'ash');
    return;
  }
  const rr = RNG(Math.round(x * 7 + z * 13)), parts = [];
  // the spine: a sagging line of vertebrae, the tail curling off into the ash
  const spine = []; for (let k = 0; k <= 16; k++) { const u = -9 + k * 0.85; spine.push(V3(Math.sin(k * 0.35) * 0.6 * (k < 6 ? 1 : 0.3), 0.35 + Math.sin(clamp((u + 4) / 9, 0, 1) * Math.PI) * 1.2, u)); }
  parts.push({ geo: rootGeo(spine, 0.12, 0.18, 32, 6), color: BONE, o: {} });
  for (let k = 2; k < 16; k += 1) { const p = spine[k]; parts.push({ geo: G.box(0.32, 0.28, 0.22), color: BONE, o: { x: p.x, y: p.y + 0.1, z: p.z, ry: 0.1 * k }, jit: 0.15 }, { geo: G.cone(0.06, 0.4, 4), color: BONE, o: { x: p.x, y: p.y + 0.4, z: p.z } }); }
  // ribs: pairs arching up and over, some broken short
  for (let k = 0; k < 7; k++) for (const sd of [-1, 1]) {
    const u = -2.6 + k * 0.85, top = 1.5 + Math.sin(k / 6 * Math.PI) * 0.6, len = rr.chance(0.25) ? 0.55 : 1;
    const pts = [[0, top, u], [sd * 1.4, top + 0.4, u - 0.15], [sd * 2.1, 1.0, u - 0.3], [sd * 1.9 * (len < 1 ? 1.1 : 1), 0.05, u - 0.4]].slice(0, len < 1 ? 3 : 4);
    parts.push({ geo: rootGeo(pts, 0.11, 0.05, 12, 5), color: BONE, o: {} });
  }
  // the skull: long jaws, the brow ridge, two horns swept back
  parts.push({ geo: jitter(G.box(1.1, 0.7, 2.4), 0.08, 215), color: BONE, o: { y: 0.4, z: 5.4, rx: -0.12 } }, { geo: G.box(0.8, 0.25, 1.8), color: 0x8a8378, o: { y: 0.05, z: 5.6, rx: 0.08 } });
  for (const sd of [-1, 1]) { parts.push({ geo: G.segTo(sd * 0.6, 0.5, -1.6, 0.14, 0.03, 5), color: 0x7a7468, o: { x: sd * 0.4, y: 0.7, z: 4.6 } }, { geo: G.ball(0.16, 6, 5), color: 0x15120f, o: { x: sd * 0.36, y: 0.62, z: 5.0 } }); }
  B.add('lam', parts, x, z, r);
}
// a fallen standard: the pole broken over the ground, the cloth spread out from its crossbar, the people's sign at the top
const FACTION = [{ cloth: 0x262a30, sign: 0x6a6e74 }, { cloth: 0x3e1e16, sign: 0x7a5a30 }, { cloth: 0x232a1c, sign: 0x7a7040 }];
function fallenBanner(B, p) {
  const f = FACTION[p.faction] || FACTION[0], len = p.len || 13, rr = RNG(p.faction * 31 + 7);
  const parts = [{ geo: G.cyl(0.13, 0.16, len * 0.62, 7), color: 0x2a2018, o: { y: 0.14, z: len * 0.19, rx: Math.PI / 2, rz: 0.03 } }, { geo: G.cyl(0.12, 0.14, len * 0.34, 7), color: 0x2a2018, o: { y: 0.13, x: 0.25, z: -len * 0.33, rx: Math.PI / 2, ry: 0.12 } }];
  parts.push({ geo: G.box(3.4, 0.14, 0.14), color: 0x2a2018, o: { y: 0.16, z: len * 0.42 } });
  // the sign: the Men's iron star, the Stoneborn's anvil, the Evergreen's leaf
  const sg = p.faction === 1 ? G.box(0.7, 0.35, 0.45) : p.faction === 2 ? G.cone(0.32, 0.9, 4) : G.oct(0.45);
  parts.push({ geo: sg, color: f.sign, o: { y: 0.3, z: len * 0.5 + 0.4, rx: Math.PI / 2, sz: p.faction === 2 ? 0.4 : 0.7 } });
  B.add('lam', parts, p.x, p.z, p.r || 0);
  // the cloth: draped in folds, its far edge torn
  const W = 4.2, H = 7.2, g = new THREE.PlaneGeometry(W, H, 12, 22); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / W + 0.5, v = pos.getZ(i) / H + 0.5;
    const fold = Math.abs(Math.sin(u * 7.5 + v * 2.2 + p.faction)) * 0.14 + Math.sin(v * 9 + u * 3) * 0.04;
    const torn = v < 0.12 ? rr.range(-0.4, 0.15) : 0;
    pos.setXYZ(i, pos.getX(i) * (1 - (1 - v) * 0.12), 0.05 + fold * (0.4 + v * 0.6), pos.getZ(i) + torn);
  }
  g.computeVertexNormals(); g.translate(0, 0, len * 0.42 - H / 2 - 0.1);
  B.add('lam', [{ geo: g, color: f.cloth, o: {}, jit: 0.12 }], p.x, p.z, p.r || 0);
}
// the cold beacon of the Dark Beacon camp: a squat tower on its knoll, the basket on top full of dead ash
function darkBeacon(B, p) {
  const M = act4Mats(), mat = M.ashBlocks ? 'ashBlocks' : 'lam';
  B.add(mat, [{ geo: jitter(G.cyl(3.0, 3.9, 0.9, 12), 0.15, 230), color: 0x3a3632, o: { y: 0.1 }, jit: 0.1 }], p.x, p.z);
  B.add(mat, [{ geo: G.cyl(1.55, 1.85, 5.2, 12), color: STONE, o: { y: 3.0 }, ao: 4 }, { geo: G.cyl(1.95, 1.7, 0.45, 12), color: DSTONE, o: { y: 5.75 } },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ geo: G.box(0.5, 0.5, 0.36), color: 0x5a5650, o: { x: Math.sin(i * 0.785) * 1.8, z: Math.cos(i * 0.785) * 1.8, y: 6.2, ry: i * 0.785 }, jit: 0.1 }))], p.x, p.z, p.r || 0);
  B.add('iron', [{ geo: G.cyl(0.9, 0.55, 0.6, 8), color: ASHIRON, o: { y: 6.3 } }, { geo: jitter(G.dome(0.8, 0.4, 8), 0.06, 231), color: 0x4a4642, o: { y: 6.5 } }], p.x, p.z);
}
// the watchtower of the dead Wayfarers: the cinder scan, or a broken round tower with a door to the road (local +z)
function ruinedTower(I, B, p) {
  if (cin4(I, 'ruinedTower', p.x, p.z, p.r || 0, 8.5, 'h', -0.1)) return;
  const mat = act4Mats().ashBlocks ? 'ashBlocks' : 'lam', parts = [], rr = RNG(Math.round(p.x * 13 + p.z));
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2; if (Math.abs(angleDiff(a, 0)) < 0.3) continue;
    const hgt = 3.5 + Math.abs(Math.sin(k * 1.7)) * 4.5 * (k > 3 && k < 11 ? 1 : 0.55);
    parts.push({ geo: G.box(1.05, hgt, 0.7), color: k % 2 ? STONE : DSTONE, o: { x: Math.sin(a) * 2.1, z: Math.cos(a) * 2.1, y: hgt / 2, ry: a }, jit: 0.12 });
  }
  for (let k = 0; k < 7; k++) parts.push({ geo: jitter(G.dodeca(rr.range(0.3, 0.6)), 0.1, 240 + k), color: DSTONE, o: { x: rr.range(-3, 3), z: rr.range(1.5, 3.5), y: 0.15 } });
  B.add(mat, parts, p.x, p.z, p.r || 0);
}
// the rock behind the Anvil Gate: the cliff of the Black Anvil, lava seams in it, the gate's obsidian jambs and lintel
// (Act V: a block that would stand over the Anvil's Neck is left out, the corridor's own walls stand there)
function anvilGateFrame(B, p, out, L) {
  const M = act4Mats(), rock = M.ashRockW ? 'ashRockW' : 'lam', rr = RNG(Math.round(p.x * 17));
  const cliff = [], neck = L?.neck?.cells || [];
  for (let k = 0; k < 16; k++) {
    const sx = k % 2 ? 1 : -1, d = 6 + Math.floor(k / 2) * 3.4 + rr.range(-0.6, 0.6), hgt = rr.range(11, 19) - Math.floor(k / 2) * 0.3, z = -2.6 - rr.range(0, 2.5);
    if (neck.some(([ix, iz]) => Math.abs(ix + 0.5 - p.x - sx * d) < 3.1 && Math.abs(iz + 0.5 - p.z - z) < 3.5)) continue;
    cliff.push({ geo: jitter(G.box(4.6, hgt, 5.5, 2, 4, 2), 0.5, 250 + k), color: 0x34302c, o: { x: sx * d, y: hgt / 2 - 0.5, z }, jit: 0.15 });
  }
  cliff.push({ geo: jitter(G.box(14, 10, 6, 4, 3, 2), 0.5, 270), color: 0x302c28, o: { y: 15, z: -4.2 } }, { geo: jitter(G.box(60, 24, 10, 8, 4, 2), 0.9, 271), color: 0x2a2622, o: { y: 10, z: -12 } });
  B.add(rock, cliff, p.x, p.z);
  B.add('obsidian', [
    ...[-1, 1].map((sx) => ({ geo: G.box(1.9, 9.2, 2.6), color: 0x16141a, o: { x: sx * 4.35, y: 4.6 } })),
    ...[-1, 1].map((sx) => ({ geo: G.box(2.6, 1.0, 3.2), color: 0x1c1a20, o: { x: sx * 4.35, y: 0.5 } })),
    { geo: G.box(11.4, 1.7, 3.0), color: 0x1a181e, o: { y: 9.9 } }, { geo: prism(12.4, 1.6, 3.2), color: 0x16141a, o: { y: 10.75 } }
  ], p.x, p.z);
  // the seams: lava running in the cracks of the mountain (they die with the forge: NIGHT.gain dims their light)
  const seams = [];
  for (let k = 0; k < 9; k++) {
    let sx = (k % 2 ? 1 : -1) * rr.range(6, 22), sy = rr.range(1, 10);
    for (let j = 0; j < 4; j++) { const dx = rr.range(-0.8, 0.8), dy = rr.range(0.9, 1.8); seams.push({ geo: G.segTo(dx, dy, 0, 0.06, 0.04, 3), color: 0xc0300a, o: { x: sx, y: sy, z: -0.1 - rr.range(0, 0.6) } }); sx += dx; sy += dy; }
  }
  seams.push({ geo: G.box(9, 0.08, 0.06), color: 0xd04010, o: { y: 9.0, z: 1.55 } }, ...[-1, 1].map((sx) => ({ geo: G.box(0.08, 7.6, 0.06), color: 0xb03008, o: { x: sx * 3.35, y: 4.6, z: 1.32 } })));
  const sm = new THREE.Mesh(bake(seams), MAT.seam ||= new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff }));
  sm.position.set(p.x, 0, p.z); out.group.add(sm);
  NIGHT.seam = MAT.seam;
}
// a flagstone disc for the Anvil Gate's plaza, its rim set with kerbs
function plaza(p, out) {
  const M = act4Mats(), r = p.s || 14, g = new THREE.CircleGeometry(r + 0.4, 64);
  const pos = g.attributes.position;
  for (let i = 1; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), k = 1 + (fbm(x * 0.4, y * 0.4, 3) - 0.5) * 0.06; pos.setXY(i, x * k, y * k); }
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, M.flagsW || new THREE.MeshLambertMaterial({ map: tex('flagstone'), color: 0x6e6a66 }));
  m.position.set(p.x, 0.022, p.z); m.receiveShadow = true; out.group.add(m);
  // a kerb of dark stone round its edge, flush with the flags
  const kerb = new THREE.RingGeometry(r + 0.05, r + 0.75, 72, 1); kerb.rotateX(-Math.PI / 2);
  const km = new THREE.Mesh(kerb, M.ashRockW || M.lam); km.position.set(p.x, 0.03, p.z); km.receiveShadow = true; out.group.add(km);
}
// ---------- the Forge ----------
function forgeStatue(I, B, st) {
  // an old king of the Ash on his plinth, his head struck off by the alliance
  const M = act4Mats();
  B.add(M.ashBlocks ? 'ashBlocks' : 'lam', [{ geo: G.box(2.3, 1.1, 2.3), color: DSTONE, o: { y: 0.55 }, ao: 1 }, { geo: G.box(2.0, 0.25, 2.0), color: STONE, o: { y: 1.22 } }], st.x, st.z, st.r);
  if (cin4(I, 'statue', st.x, st.z, st.r, 5.6, 'h', 1.32, cinder('statue') ? 'ash' : 'char', 0, true)) return;
  B.add(M.ashBlocks ? 'ashBlocks' : 'lam', [{ geo: G.cyl(0.55, 0.95, 4.2, 8), color: STONE, o: { y: 3.4 } }, { geo: G.box(1.8, 0.6, 0.8), color: STONE, o: { y: 5.2 } }], st.x, st.z, st.r);
}
function ironBridge(B, b) {
  const len = b.len || 7, bw = b.w || 3.4, parts = [{ geo: G.box(bw, 0.22, len), color: 0x2e2a28, o: { y: -0.08 } }];
  for (const sx of [-1, 1]) {
    parts.push({ geo: G.box(0.24, 0.7, len + 0.6), color: ASHIRON, o: { x: sx * (bw / 2 + 0.05), y: -0.3 } });
    for (let i = 0; i <= Math.floor(len / 1.6); i++) parts.push({ geo: G.box(0.1, 1.0, 0.1), color: ASHIRON, o: { x: sx * (bw / 2 + 0.05), y: 0.5, z: -len / 2 + 0.3 + i * 1.6 } });
    parts.push({ geo: G.box(0.07, 0.07, len), color: ASHIRON, o: { x: sx * (bw / 2 + 0.05), y: 0.98 } });
  }
  for (let i = 0; i < Math.floor(len / 0.9); i++) parts.push({ geo: G.box(bw - 0.1, 0.04, 0.08), color: 0x3a3634, o: { y: 0.045, z: -len / 2 + 0.45 + i * 0.9 } });
  B.add('iron', parts, b.x, b.z, b.r || 0);
}
function chains(I, list) {
  for (const c of list) {
    const n = Math.floor((c.y1 - c.y0) / 0.2);
    for (let i = 0; i < n; i++) I.add('chainLink', c.x, c.z, (i % 2) * Math.PI / 2 + c.x, 1, c.y0 + i * 0.2);
  }
}
function act4Level(L, I, B, out) {
  act4Mats();
  if (L.type === 'ashfield') {
    for (const p of L.gravePoles || []) gravePole(B, p);
    for (const l of L.graveLanterns || []) lantern4(I, l.x, l.y, l.z, l.r, 1, l.fallen || 0);
    // the Black Anvil's red glow over the north horizon (seen when the camera lowers), and the stars after the Unmaking
    if (L.anvilGlow) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xff3a10, blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true, opacity: 0.55 }));
      s.position.set(L.anvilGlow.x, L.anvilGlow.y, L.anvilGlow.z); s.scale.set(120, 60, 1);
      out.group.add(s); NIGHT.glow = s;
    }
    NIGHT.stars = starField(out.group);
    applyNight();
    for (const l of L.lights) if (l.anvil) l.gain = NIGHT.gain;
  } else {
    for (const st of L.statues || []) forgeStatue(I, B, st);
    for (const b of L.bridges || []) ironBridge(B, b);
    chains(I, L.chains || []);
    for (const gr of L.grates || []) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(gr.w, gr.l), grateMat(gr.g));
      m.rotation.set(-Math.PI / 2, 0, gr.r || 0); m.position.set(gr.x, 0.03, gr.z); m.receiveShadow = true;
      out.group.add(m);
    }
    for (const l of L.lights) if (l.heat) l.gain = HEAT.gain;
  }
}
// stars over the Field after the Unmaking: a dome that follows the camera (seen when it lowers toward the horizon)
function starField(group) {
  const n = 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), rr = RNG(77);
  for (let i = 0; i < n; i++) {
    const a = rr.range(0, Math.PI * 2), e = Math.asin(rr.range(0.04, 1)), r = 110;
    pos.set([Math.cos(e) * Math.sin(a) * r, Math.sin(e) * r, Math.cos(e) * Math.cos(a) * r], i * 3);
    const k = rr.range(0.45, 1); col.set([k * 0.85, k * 0.9, k], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
  pts.frustumCulled = false; pts.renderOrder = -1;
  pts.onBeforeRender = (r, s, cam) => { pts.position.copy(cam.position); pts.updateMatrixWorld(); };
  group.add(pts);
  return pts;
}
// The Field by night: 'ash' (ash falling, the Black Anvil glowing red, the dead lanterns dark), 'stars' (after the Unmaking:
// no ash, stars, the mountain's fire out), 'dawn' (every lantern in the Graves lit). Sets the FX ambient too.
export function setNight(mode = 'ash') {
  NIGHT.mode = mode;
  applyNight();
  setAmbient(mode === 'stars' ? 'ashfieldStars' : mode === 'dawn' ? 'ashfieldDawn' : 'ashfall');
}
function applyNight() {
  const mode = NIGHT.mode;
  if (NIGHT.stars) { NIGHT.stars.visible = mode !== 'ash'; NIGHT.stars.material.opacity = mode === 'dawn' ? 0.2 : 0.9; }
  if (NIGHT.glow) NIGHT.glow.visible = mode === 'ash';
  NIGHT.gain.k = mode === 'ash' ? 1 : 0.05;
  if (NIGHT.seam) NIGHT.seam.color.setScalar(mode === 'ash' ? 1 : 0.12);
  if (MAT.graveGlass) MAT.graveGlass.color.copy(mode === 'dawn' ? LIT : DEAD);
}
// The Forge's heat, 0 (banked) to 3 (full breath), or -1 the cold forge after the Unmaking: the lava's glow, the grates,
// the lights that follow the heat, and the Forge's atmosphere (call it after entering the Forge; fractions fade)
export function setHeat(k = 0) {
  HEAT.k = k;
  const cold = k < 0, h = clamp(k, 0, 3);
  HEAT.uLava.value = cold ? 0.05 : 0.8 + 0.16 * h;
  HEAT.uGrate.value = cold ? 0 : 0.2 + 0.3 * h;
  HEAT.gain.k = cold ? 0.06 : 0.75 + 0.2 * h;
  setAtmosphere(heatAtmos(k));
}
// a flue's breath in its grates (forge.js: the inhale's glow, 0..1+); g 0-2 the galleries, 3 every other grate
export function setFlueGlow(g, k) { if (HEAT.flue[g]) HEAT.flue[g].value = clamp(k, 0, 1.5); }

// ---------- addProp for Act IV ----------
function addProp4(B, I, p, L, rng, out) {
  const { x, z } = p, r = p.r || 0, s = p.s || 1, y = p.y || 0, M = act4Mats();
  switch (p.t) {
    case 'ashTree': {
      const d = p.d ?? 2;
      if (d > 2 && hash2(x * 1.3, z * 0.7) > 0.6) return true; // thinner away from the open
      if (cinder('deadTree') && cin4(I, hash2(x, z) < 0.5 || !cinder('deadTreeB') ? 'deadTree' : 'deadTreeB', x, z, r, s * 5.2, 'h', y)) return true;
      if (ENV.props.treeDead && R.quality >= 1 && !NO_TREES) { const k = s * 0.8; I.add('tree:treeDead@char', x, z, r, k, y - 0.05, k * 0.95); return true; }
      I.add('deadAsh', x, z, r, s, y);
      return true;
    }
    case 'ashRock': case 'forgeRock': case 'ashCrag': {
      const want = p.t === 'ashCrag' ? 3.4 : p.t === 'forgeRock' ? 1.6 : 1.1;
      const pool = p.t === 'ashCrag' ? ['boulder', 'rockD', 'rockC'] : ['rockA', 'rockB', 'rockC', 'rockD'], name = pool[Math.floor(hash2(x, z) * pool.length)];
      if (cin4(I, name, x, z, r, want * s, 'l', y)) return true;
      const alt = ['rockA', 'rockB', 'rockC', 'boulder'][Math.floor(hash2(z, x) * 4)];
      if (cin4(I, alt, x, z, r, want * s, 'l', y - 0.1, 'char', 0, true)) return true;
      I.add('ashRockC', x, z, r, want * s * 0.85, y);
      return true;
    }
    case 'ashStone': if (!cin4(I, ['rockA', 'rockB'][Math.floor(hash2(x, z) * 2)], x, z, r, 0.45 * s, 'l', -0.05) && !cin4(I, ['stoneA', 'stoneB', 'stoneC'][Math.floor(hash2(x, z) * 3)], x, z, r, 0.4 * s, 'l', -0.04, 'char', 0, true)) I.add('ashStoneC', x, z, r, s); return true;
    case 'ashTuft': I.add('ashTuft', x, z, r, s, y, s); return true;
    case 'debris': debris4(I, p); return true;
    case 'slag': I.add('slag', x, z, r, s); if (hash2(x, z) < 0.4) I.add('slagGlow', x, z, r, s); return true;
    case 'darkBeacon': darkBeacon(B, p); return true;
    case 'campBrazier': {
      if (!cin4(I, 'brazier', x, z, r, 1.25, 'h')) addProp(B, I, { t: 'brazier', x, z }, L, rng, out);
      else { const f = brazierFire(1.25) || { y: 1.05, r: 0.34 }; B.add('glow', [{ geo: G.cyl(f.r * 0.88, f.r * 0.88, 0.04, 8), color: 0xff6a20, o: { y: f.y } }], x, z); out.emitters.push({ x, y: f.y + 0.07, z, type: 'fire', s: 0.8 }); }
      return true;
    }
    case 'ruinedTower': ruinedTower(I, B, p); return true;
    case 'fallenBanner': fallenBanner(B, p); return true;
    case 'drakeBones': drakeBones(I, B, x, z, r); return true;
    case 'tickNest': {
      B.add('lam', [{ geo: jitter(G.dome(1.3, 0.45, 10), 0.14, 280), color: 0x2a2420, o: { sy: 0.5 }, jit: 0.25 }, ...[0, 1, 2, 3].map((i) => ({ geo: G.cyl(0.18, 0.12, 0.3, 6), color: 0x0a0806, o: { x: Math.sin(i * 1.6 + r) * 0.7, z: Math.cos(i * 1.6 + r) * 0.7, y: 0.45 - i * 0.05 } }))], x, z, r, 1, y);
      B.add('glow', [0, 1, 2].map((i) => ({ geo: G.ball(0.05, 4, 3), color: 0xff5a10, o: { x: Math.sin(i * 2.3) * 0.5, z: Math.cos(i * 2.3) * 0.5, y: 0.5 } })), x, z, r, 1, y);
      out.emitters.push({ x, y: 0.4 + y, z, type: 'embers', s: 0.6 });
      return true;
    }
    case 'rimStone': case 'rimPillar': addProp(B, I, { t: p.t === 'rimPillar' ? 'pillarBroken' : 'pillarBroken', x, z, r, s, h: p.t === 'rimPillar' ? 1.2 : 0.55, ash: true }, L, rng, out); return true;
    case 'plaza': plaza(p, out); return true;
    case 'anvilGateFrame': anvilGateFrame(B, p, out, L); return true;
    // ---------- the Forge ----------
    case 'forgePillar': B.add(M.ashBlocks ? 'ashBlocks' : 'lam', [{ geo: G.box(1.2, 0.5, 1.2), color: DSTONE, o: { y: 0.25 } }, { geo: G.box(0.95, 2.6, 0.95), color: STONE, o: { y: 1.8 }, ao: 2 }, { geo: jitter(G.box(1.0, 0.6, 1.0), 0.12, 350), color: DSTONE, o: { y: 3.3, ry: 0.3 } }], x, z, r); return true;
    case 'bullHead': {
      if (cin4(I, 'bullHead', x, z, r, 1.6, 'l', y, 'iron')) return true;
      B.add('iron', [{ geo: G.box(0.9, 1.1, 0.35), color: ASHIRON, o: { y: y } }, { geo: G.box(0.55, 0.5, 0.5), color: ASHIRON, o: { y: y - 0.55, z: 0.2 } }, ...[-1, 1].map((sx) => ({ geo: G.segTo(sx * 0.7, 0.6, 0.15, 0.12, 0.03, 5), color: 0x3a3632, o: { x: sx * 0.4, y: y + 0.35, z: 0.1 } }))], x, z, r);
      B.add('glow', [-1, 1].map((sx) => ({ geo: G.ball(0.06, 5, 4), color: 0xff5010, o: { x: sx * 0.2, y: y + 0.05, z: 0.19 } })), x, z, r);
      return true;
    }
    case 'coldForge': {
      // Brokka's cold side forge: a dead hearth, a hood, a chimney of black stone, ash in the fire-bed
      B.add(M.ashBlocks ? 'ashBlocks' : 'lam', [{ geo: G.box(2.6, 1.2, 1.9), color: DSTONE, o: { y: 0.6 }, jit: 0.1 }, { geo: G.box(2.0, 0.2, 1.5), color: STONE, o: { y: 1.3 } }, { geo: G.cyl(0.6, 0.85, 3.2, 6), color: DSTONE, o: { y: 3.0, z: -0.4 } }, { geo: G.box(2.8, 0.6, 2.2), color: STONE, o: { y: 2.0, z: -0.1 } }], x, z, r);
      B.add('lam', [{ geo: jitter(G.box(1.4, 0.12, 1.0), 0.04, 290), color: 0x4a4642, o: { y: 1.43 } }], x, z, r);
      return true;
    }
    case 'forgeClutter': {
      const want = { anvil: 0.75, tongs: 0.9, quench: 1.6, toolRack: 1.8, stump: 0.8, barrel: 1.0, crossPein: 0.8 }[p.m] || 1;
      if (cin4(I, p.m, x, z, r, want * s, p.m === 'tongs' || p.m === 'crossPein' || p.m === 'quench' ? 'l' : 'h', p.m === 'tongs' || p.m === 'crossPein' ? 0.02 : 0)) return true;
      if (p.m === 'anvil') addProp(B, I, { t: 'anvil', x, z, r }, L, rng, out);
      else if (p.m === 'barrel' && ENV.props.barrel) I.add('env:barrel', x, z, r, s, 0);
      else if (p.m === 'stump') I.add(ENV.props.stump ? 'env:stump' : 'ashStoneC', x, z, r, s * 0.8, 0);
      else if (p.m === 'quench') B.add('iron', [{ geo: G.box(1.5, 0.6, 0.7), color: 0x2e2a26, o: { y: 0.3 } }, { geo: G.box(1.35, 0.05, 0.55), color: 0x101418, o: { y: 0.58 } }], x, z, r);
      else if (p.m === 'toolRack') B.add('lam', [{ geo: G.box(1.6, 0.08, 0.12), color: DWOOD, o: { y: 1.5 } }, ...[-0.7, 0.7].map((dx) => ({ geo: G.box(0.1, 1.6, 0.1), color: DWOOD, o: { x: dx, y: 0.8 } })), ...[-0.45, -0.15, 0.15, 0.45].map((dx, i) => ({ geo: G.box(0.05, 0.6 + i * 0.05, 0.03), color: ASHIRON, o: { x: dx, y: 1.15, z: 0.06 } }))], x, z, r);
      else I.add('dbHammer', x, z, r, s, 0.03, s, s, 1.45);
      return true;
    }
    case 'crane': {
      if (ENV.props.crane) { I.add('env:crane', x, z, r, p.s ?? 2.2, 0); return true; }
      B.add('iron', [...[-1, 1].map((sx) => ({ geo: G.box(0.3, 7.5, 0.3), color: ASHIRON, o: { x: sx * 1.6, y: 3.75 } })), { geo: G.box(3.8, 0.35, 0.35), color: ASHIRON, o: { y: 7.4 } }, { geo: G.box(0.3, 0.3, 4.2), color: ASHIRON, o: { y: 7.6, z: 1.6 } }, { geo: G.cyl(0.02, 0.02, 4.5, 3), color: ASHIRON, o: { y: 5.2, z: 3.4 } }, { geo: G.torus(0.2, 0.04, 4, 8, Math.PI * 1.4), color: 0x3a3632, o: { y: 2.8, z: 3.4 } }], x, z, r);
      return true;
    }
    case 'flueMouth': {
      // the flue's maw at the gallery's end: iron jambs and lintel round the opening, a hood breathing over the grate
      B.add('iron', [...[-1, 1].map((sx) => ({ geo: G.box(0.7, 6, 0.9), color: ASHIRON, o: { x: sx * 2.85, y: 3 } })), { geo: G.box(6.6, 1.1, 1.1), color: ASHIRON, o: { y: 5.6 } }, { geo: G.box(5.2, 0.5, 0.25), color: 0x1a1816, o: { y: 4.9, z: 0.25 } }], x, z, r + Math.PI);
      B.add('glow', [{ geo: G.box(4.4, 0.08, 0.06), color: 0x9a2a08, o: { y: 4.62, z: 0.4 } }], x, z, r + Math.PI);
      return true;
    }
    case 'station': {
      // a stoker's station: the chain post and its ring, the small bellows against the wall, banked coals
      B.add('iron', [{ geo: G.cyl(0.14, 0.2, 2.2, 6), color: ASHIRON, o: { y: 1.1 } }, { geo: G.torus(0.2, 0.05, 4, 8), color: 0x3a3632, o: { y: 1.5, rx: Math.PI / 2 } }, { geo: G.cyl(0.35, 0.4, 0.2, 7), color: 0x24221f, o: { y: 0.1 } }], x, z, r);
      const bx = p.bx ?? x, bz = p.bz ?? z;
      if (!cin4(I, 'bellows', bx, bz, r, 1.7, 'l', 0)) B.add('lam', [{ geo: G.box(1.0, 0.12, 1.5), color: DWOOD, o: { y: 0.5 } }, { geo: G.box(1.0, 0.12, 1.5), color: DWOOD, o: { y: 0.9, rx: -0.15 } }, { geo: G.box(0.9, 0.38, 1.3), color: 0x3a2418, o: { y: 0.7 } }, { geo: G.cone(0.12, 0.6, 5), color: ASHIRON, o: { y: 0.65, z: 1.0, rx: Math.PI / 2 } }], bx, bz, r);
      B.add('glow', [{ geo: G.cyl(0.4, 0.45, 0.05, 8), color: 0x8a2006, o: { y: 0.05 } }], bx, bz);
      return true;
    }
    // (r is the tunnel's direction: local x, the jambs' axis, then runs across it)
    case 'doorway': B.add('iron', [...[-1, 1].map((sx) => ({ geo: G.box(0.5, 4.2, 0.6), color: ASHIRON, o: { x: sx * 1.95, y: 2.1 } })), { geo: G.box(4.5, 0.6, 0.7), color: ASHIRON, o: { y: 4.3 } }], x, z, r); return true;
    case 'stairStep': B.add(M.ashBlocks ? 'ashBlocks' : 'lam', [{ geo: G.box(4.6, 0.12, 0.7), color: DSTONE, o: { y: 0.05 }, jit: 0.1 }], x, z, r); return true;
    case 'mould': {
      // a casting pit in the shape of a crown: a stone rim with points, the metal still molten in it
      const parts = [{ geo: G.cyl(1.75, 1.85, 0.3, 14), color: 0x2e2a26, o: { y: 0.05 } }];
      for (let k = 0; k < 5; k++) { const a = k * 1.2566 + r; parts.push({ geo: G.cone(0.22, 0.75, 4), color: 0x3a3632, o: { x: Math.sin(a) * 1.7, z: Math.cos(a) * 1.7, y: 0.5 } }); }
      B.add('iron', parts, x, z, 0, s);
      // the metal in the mould: a dark skin cooling at the rim, still bright where it was poured
      B.add('glow', [{ geo: G.cyl(1.45, 1.45, 0.04, 14), color: 0x3a1206, o: { y: 0.21 } }, { geo: jitter(G.cyl(1.05, 1.05, 0.05, 11), 0.08, 360), color: 0x9a2a06, o: { y: 0.22 } }, { geo: jitter(G.cyl(0.55, 0.55, 0.05, 9), 0.06, 361), color: 0xe0601a, o: { y: 0.23 } }], x, z, r, s);
      out.emitters.push({ x, y: 0.3, z, type: 'embers', s: 0.8 });
      return true;
    }
  }
  return false;
}

// ---------- act4Prop: what gameplay and story place, light, open and melt ----------
// waylamp, brazier, lastLamp (userData.setLit(b)); altar (setState('idle'|'taken'|'refused')); anvilGate (setOpen(b),
// open(dt) -> done); bellows (breathe(k) 0..1); slagPlug (o: L.plug, returned in place; melt()); anvil, shardAnvil;
// forgeMouth (setWhite(k)); cradle (setLit(b)); crown (setSockets(n)); hook; staff (setLantern('gold'|'white'|'dark'));
// lightRing (radius 1, warm, additive; setColor(c), setOpacity(a)); cone (length 1 along +z, o.arc the half-angle; flash(k)).
// lightRing and cone are ground decals: drape() lays them over the Act IV terrain wherever they are moved.
export function act4Prop(kind, o = {}) {
  act4Mats();
  const f = PROP4[kind], g = f ? f(o) : new THREE.Group();
  g.userData.kind = kind;
  return g;
}
// (own: a material made for one prop alone, which world.js disposeZone disposes with it)
const own = (m) => { m.userData.own = true; return m; };
const glowMat = (c, o = {}) => own(new THREE.MeshBasicMaterial({ color: c, transparent: !!o.add || o.opacity != null, opacity: o.opacity ?? 1, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.add, toneMapped: false }));
const iron = (parts) => solid(parts, MAT.iron);
// a lantern: the cinder or base-set scan with its own glass (lit or dark), or the code one; userData.glass
function lanternMesh(h = 0.55) {
  const g = new THREE.Group(), glass = glowMat(DEAD.clone(), { opacity: 0.92 });
  const parts = cinder('lantern') || ENV.props.lantern, sz = size4(parts);
  if (parts) {
    const k = h / Math.max(0.01, sz.y);
    for (const p of parts) { const tr = p.mat.transparent || /glow|glass/i.test(p.mat.name); const m = new THREE.Mesh(p.geo, tr ? glass : cinMat(p.mat, 'dead')); m.castShadow = !tr; g.add(m); }
    g.scale.setScalar(k); g.position.y = -sz.y0 * k;
  } else {
    g.add(iron(CAT.lanternF().parts));
    g.add(new THREE.Mesh(bake([{ geo: G.box(0.15, 0.26, 0.15), color: 0xffffff, o: { y: 0.17 } }]), glass));
    g.scale.setScalar(h / 0.48);
  }
  const w = new THREE.Group(); w.add(g); w.userData.glass = glass;
  return w;
}
// a small flame of glow cones, and a soft halo sprite
function flameMesh(s = 1, color = 0xffa040) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(bake([{ geo: G.cone(0.09, 0.32, 6), color: 0xffd080, o: { y: 0.16 } }, { geo: G.cone(0.06, 0.22, 5), color: 0xffffff, o: { y: 0.12 } }]), glowMat(0xffffff));
  const halo = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: tex('dot'), color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
  halo.scale.setScalar(1.4); halo.position.y = 0.18;
  g.add(f, halo); g.scale.setScalar(s);
  let t = Math.random() * 10;
  f.onBeforeRender = () => { t += 0.05; f.scale.set(1 + Math.sin(t * 3.1) * 0.08, 1 + Math.sin(t * 4.7) * 0.15, 1 + Math.cos(t * 3.7) * 0.08); };
  g.userData.halo = halo;
  return g;
}
const PROP4 = {
  // a waylamp: a cairn of black stones, an iron post and arm, a dead lantern that the Cradle lights
  waylamp(o) {
    const g = new THREE.Group(), M = MAT;
    g.add(solid([0, 1, 2, 3, 4].map((i) => ({ geo: jitter(G.dodeca(0.34 - i * 0.04), 0.06, 300 + i), color: i % 2 ? 0x3a3632 : 0x2e2a28, o: { x: Math.sin(i * 2.4) * (i < 3 ? 0.32 : 0.12), z: Math.cos(i * 2.4) * (i < 3 ? 0.32 : 0.12), y: 0.18 + (i < 3 ? 0 : (i - 2) * 0.3) }, jit: 0.15 })), M.ashRockW || M.lam));
    g.add(iron([{ geo: G.cyl(0.05, 0.065, 2.5, 6), color: ASHIRON, o: { y: 1.25 } }, { geo: G.box(0.7, 0.05, 0.05), color: ASHIRON, o: { y: 2.42, x: 0.32 } }, { geo: G.box(0.04, 0.2, 0.04), color: ASHIRON, o: { y: 2.33, x: 0.08, rz: 0.8 } }, { geo: G.cyl(0.008, 0.008, 0.12, 3), color: ASHIRON, o: { y: 2.36, x: 0.62 } }]));
    const lan = lanternMesh(0.5); lan.position.set(0.62, 1.8, 0); g.add(lan);
    const fl = flameMesh(0.55); fl.position.set(0.62, 1.88, 0); g.add(fl);
    g.userData.setLit = (b) => { lan.userData.glass.color.copy(b ? LIT : DEAD); fl.visible = !!b; g.userData.lit = !!b; };
    g.userData.setLit(!!o.lit);
    g.userData.flameAt = { x: 0.62, y: 2.05, z: 0 };
    return g;
  },
  // a brazier (Ivar's arena, the camps): the Sky_Hunter scan or the iron bowl on three legs; coals and flame when lit
  brazier() {
    const g = new THREE.Group(), parts = cinder('brazier'), sz = size4(parts);
    let top = 1.15, bedR = 0.34, glows = [];
    if (parts) {
      const k = 1.25 / Math.max(0.01, sz.y), f = brazierFire(1.25);
      for (const p of parts) { const gl = p.mat.transparent || /glow/i.test(p.mat.name); const mm = gl ? glowMat(0xff6a20) : cinMat(p.mat); const m = new THREE.Mesh(p.geo, mm); m.scale.setScalar(k); m.position.y = -sz.y0 * k; m.castShadow = !gl; g.add(m); if (gl) glows.push(mm); }
      // the coals and flame in the scan's own bowl
      if (f) { top = f.y; bedR = f.r * 0.88; } else top = 1.18;
    } else g.add(iron([{ geo: G.cyl(0.42, 0.25, 0.3, 8), color: ASHIRON, o: { y: 1.05 } }, ...[0, 1, 2].map((i) => ({ geo: G.segTo(Math.sin(i * 2.09) * 0.3, -1.0, Math.cos(i * 2.09) * 0.3, 0.04, 0.03, 4), color: ASHIRON, o: { y: 1.0 } }))]));
    const coal = glowMat(0xff6a20), bed = new THREE.Mesh(G.cyl(bedR, bedR, 0.05, 9), coal); bed.position.y = top; g.add(bed); glows.push(coal);
    const fl = flameMesh(1.1); fl.position.y = top; g.add(fl);
    g.userData.setLit = (b) => { for (const m of glows) m.color.set(b ? 0xff6a20 : 0x1a1410); fl.visible = !!b; g.userData.lit = !!b; };
    g.userData.setLit(true);
    g.userData.fireY = top + 0.05;
    return g;
  },
  // an Altar of the Wish: a stepped plinth, a headless statue on it, a cracked basin before it where the shard stirs
  altar() {
    const g = new THREE.Group(), M = MAT;
    g.add(solid([{ geo: G.box(2.2, 0.5, 1.6), color: DSTONE, o: { y: 0.25, z: -0.3 }, jit: 0.1 }, { geo: G.box(1.6, 0.6, 1.2), color: STONE, o: { y: 0.8, z: -0.35 } }], M.ashBlocks || M.lam));
    const parts = cinder('statue'), sz = size4(parts);
    if (parts) { const k = 2.3 / Math.max(0.01, sz.y); for (const p of parts) { const m = new THREE.Mesh(p.geo, cinMat(p.mat, 'ash')); m.scale.setScalar(k); m.position.set(0, 1.1 - sz.y0 * k, -0.35); m.castShadow = true; g.add(m); } }
    else g.add(solid([{ geo: G.cyl(0.32, 0.55, 1.7, 8), color: 0x5a5650, o: { y: 1.95, z: -0.35 } }, { geo: G.box(0.95, 0.35, 0.45), color: 0x5a5650, o: { y: 2.85, z: -0.35 } }, { geo: G.cyl(0.12, 0.14, 0.18, 6), color: 0x3a3632, o: { y: 3.08, z: -0.35 } }], M.ashBlocks || M.lam));
    const basin = solid([{ geo: G.lathe([[0, 0], [0.55, 0.05], [0.7, 0.35], [0.62, 0.42], [0.5, 0.2], [0, 0.18]], 12), color: 0x4a4642, o: { y: 0.0, z: 0.75 }, jit: 0.12 }], M.ashBlocks || M.lam);
    const ember = glowMat(0xff8a30, { add: true, opacity: 0.8 }), pool = new THREE.Mesh(G.cyl(0.46, 0.46, 0.02, 12), ember); pool.position.set(0, 0.22, 0.75);
    const crack = glowMat(0xff5a10), cr = new THREE.Mesh(bake([{ geo: G.box(0.04, 0.5, 0.02), color: 0xffffff, o: { y: 0.8, z: 0.26, rz: 0.4 } }, { geo: G.box(0.03, 0.35, 0.02), color: 0xffffff, o: { x: 0.15, y: 0.45, z: 0.81, rz: -0.6 } }]), crack);
    g.add(basin, pool, cr);
    g.userData.setState = (st) => {
      g.userData.state = st;
      ember.color.set(st === 'taken' ? 0xff3a10 : st === 'refused' ? 0x000000 : 0xff9a40); ember.opacity = st === 'taken' ? 1 : st === 'refused' ? 0 : 0.75;
      crack.color.set(st === 'taken' ? 0xff4a10 : 0x221a16); cr.visible = st !== 'idle';
    };
    g.userData.setState('idle');
    return g;
  },
  // the Last Lamp at the Anvil Gate: a tall dead lamp-post; Ivar's lantern lights it at last
  lastLamp() {
    const g = new THREE.Group();
    g.add(iron([{ geo: G.cyl(0.32, 0.42, 0.3, 8), color: 0x24221f, o: { y: 0.15 } }, { geo: G.cyl(0.08, 0.11, 4.6, 7), color: ASHIRON, o: { y: 2.45 } }, { geo: G.box(1.1, 0.07, 0.07), color: ASHIRON, o: { y: 4.62, x: 0.48 } }, { geo: G.cone(0.12, 0.3, 6), color: ASHIRON, o: { y: 4.85 } }, { geo: G.torus(0.09, 0.015, 3, 8), color: ASHIRON, o: { y: 4.5, x: 0.96 } }]));
    const lan = lanternMesh(0.75); lan.position.set(0.96, 3.66, 0); g.add(lan);
    const fl = flameMesh(0.8, 0xffc070); fl.position.set(0.96, 3.8, 0); g.add(fl);
    g.userData.setLit = (b) => { lan.userData.glass.color.copy(b ? LIT : DEAD); fl.visible = !!b; g.userData.lit = !!b; };
    g.userData.setLit(false);
    g.userData.flameAt = { x: 0.96, y: 4.05, z: 0 };
    return g;
  },
  // the doors of the Anvil Gate: two leaves of black iron, ember runes; they swing in, away from the plaza (local -z)
  anvilGate() {
    const g = new THREE.Group(), leaves = [], rune = glowMat(0xc8400c);
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(sx * 3.35, 0, 0);
      const leaf = iron([{ geo: G.box(3.3, 8.2, 0.45), color: 0x1e1c1c, o: { x: -sx * 1.65, y: 4.1 } }, ...[1.5, 4.1, 6.7].map((yy) => ({ geo: G.box(3.35, 0.22, 0.55), color: 0x2a2826, o: { x: -sx * 1.65, y: yy } })), { geo: G.torus(0.28, 0.06, 4, 10), color: 0x3a3632, o: { x: -sx * 0.5, y: 3.6, z: 0.32 } }]);
      const rn = new THREE.Mesh(bake([{ geo: G.box(0.1, 5.2, 0.04), color: 0xffffff, o: { x: -sx * 1.65, y: 4.1, z: 0.25 } }, { geo: G.box(1.6, 0.1, 0.04), color: 0xffffff, o: { x: -sx * 1.65, y: 5.4, z: 0.25 } }]), rune);
      hinge.add(leaf, rn); g.add(hinge); leaves.push({ hinge, sx });
    }
    g.userData.progress = 0;
    g.userData.setProgress = (p) => { p = clamp(p, 0, 1); g.userData.progress = p; const e = 1 - (1 - p) ** 2; for (const l of leaves) l.hinge.rotation.y = l.sx * 1.5 * e; };
    g.userData.open = (dt) => { g.userData.setProgress(g.userData.progress + dt / 2.4); return g.userData.progress >= 1; };
    g.userData.setOpen = (b) => g.userData.setProgress(b ? 1 : 0);
    g.userData.setRunes = (k) => rune.color.setRGB(0.78 * k, 0.25 * k, 0.05 * k);
    return g;
  },
  // a Great Bellows: the Sketchfab bellows at five times life, or boards and leather; breathe(k) squashes it (k 1 = shut)
  bellows() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const parts = cinder('bellows'), sz = size4(parts);
    if (parts) { const k = 6 / Math.max(0.01, Math.max(sz.x, sz.z)); for (const p of parts) { const m = new THREE.Mesh(p.geo, cinMat(p.mat)); m.castShadow = true; m.receiveShadow = true; body.add(m); } body.scale.setScalar(k); body.position.y = -sz.y0 * k; if (sz.x > sz.z) body.rotation.y = Math.PI / 2; }
    else {
      // two great boards, the pleated leather between them, the iron nozzle toward the fire
      const pleats = [0, 1, 2, 3].map((i) => ({ geo: G.box(3.4 - (i % 2) * 0.35, 0.42, 5.0 - i * 0.35), color: i % 2 ? 0x1e1610 : 0x2a1e16, o: { y: 1.0 + i * 0.5, z: -0.6 + i * 0.12 } }));
      body.add(solid([{ geo: G.box(3.4, 0.3, 5.6), color: 0x241a12, o: { y: 0.6, z: -0.4 } }, { geo: G.box(3.6, 0.35, 5.8), color: 0x201810, o: { y: 3.0, z: -0.4, rx: -0.05 } }, ...pleats, { geo: G.cone(0.55, 2.4, 7), color: ASHIRON, o: { y: 1.4, z: 3.0, rx: Math.PI / 2 } }]));
      body.add(iron([...[-1, 1].map((sx) => ({ geo: G.box(0.4, 5.2, 0.4), color: ASHIRON, o: { x: sx * 2.2, y: 2.6, z: -2.6 } })), { geo: G.box(4.8, 0.4, 0.4), color: ASHIRON, o: { y: 5.0, z: -2.6 } }, { geo: G.cyl(0.08, 0.08, 4.2, 5), color: 0x3a2a1e, o: { y: 4.4, z: -1.0, rx: 0.6 } }]));
    }
    g.userData.breathe = (k) => { k = clamp(k, 0, 1); body.scale.y = (body.userData.sy ||= body.scale.y) * (1 - 0.32 * k); };
    return g;
  },
  // the plug of slag on the Great Stair (o = L.plug: placed at o.x/o.z turned by o.r); melt() runs it down over 1.5 s
  slagPlug(o) {
    const g = new THREE.Group(), rr = RNG(Math.round((o.x || 1) * 31 + (o.z || 1) * 7)), parts = [], seams = [];
    // (the blobs run across the stair, local x, as the cells it blocks do: about 2.2 m either side, 1.1 m along it)
    for (let k = 0; k < 9; k++) { const v = -2.2 + k * 0.55, hgt = rr.range(1.6, 3.2); parts.push({ geo: jitter(G.ico(1.0, 1), 0.18, 320 + k), color: k % 2 ? 0x221c18 : 0x1a1512, o: { x: v, y: hgt * 0.4, z: rr.range(-0.25, 0.25), sx: 0.75, sy: hgt * 0.55, sz: 1.05 }, jit: 0.2 }); }
    for (let k = 0; k < 14; k++) seams.push({ geo: G.box(rr.range(0.3, 0.9), 0.05, 0.05), color: 0xffffff, o: { x: rr.range(-2.8, 2.8), y: rr.range(0.3, 2.2), z: rr.range(-0.95, 0.95), rz: rr.range(-0.8, 0.8), ry: rr.range(0, 3) } });
    const body = solid(parts, MAT.lam), sm = glowMat(0xb03008), seam = new THREE.Mesh(bake(seams), sm);
    g.add(body, seam);
    if (o.x != null) { g.position.set(o.x, 0, o.z); g.rotation.y = o.r || 0; }
    let t0 = 0;
    g.userData.melt = () => { if (!t0) t0 = performance.now(); };
    body.onBeforeRender = () => {
      if (!t0) return;
      const k = clamp((performance.now() - t0) / 1500, 0, 1);
      sm.color.setRGB(1, 0.35 + 0.5 * k, 0.1 + 0.3 * k);
      g.scale.set(1 + k * 0.25, Math.max(0.02, 1 - k * k), 1 + k * 0.25);
      if (k >= 1) g.visible = false;
    };
    g.userData.melted = () => !g.visible;
    return g;
  },
  // the Anvil of the Crown on its stepped block (2 x 2 cells), and the smaller anvils of the shards
  anvil() { return anvilMesh(3.2, 1.0); },
  shardAnvil() { return anvilMesh(1.6, 0.55); },
  // the Forge Mouth: a rim of black stone round the fire below; setWhite(k) turns it from forge-red to white-gold
  forgeMouth(o) {
    const g = new THREE.Group(), r = o.r || 4;
    // (none on the south, where the mouth opens into the moat; the rest reach down into the ground sunk round the hole)
    g.add(solid(Array.from({ length: 24 }, (_, k) => { const a = (k / 24) * Math.PI * 2; return Math.cos(a) > 0.55 ? null : { geo: jitter(G.box(1.15, 0.8, 0.7), 0.06, 340 + k), color: 0x24201c, o: { x: Math.sin(a) * (r + 0.3), z: Math.cos(a) * (r + 0.3), y: -0.16, ry: a + Math.PI / 2 }, jit: 0.15 }; }).filter(Boolean), MAT.ashBlocks || MAT.lam));
    const core = glowMat(0xfff4d8, { add: true, opacity: 0 }), m2 = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 28), core);
    m2.rotation.x = -Math.PI / 2; m2.position.y = -0.28; m2.renderOrder = 2;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xff6a20, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(r * 2.6); halo.position.y = 0.6;
    g.add(m2, halo);
    const A = new THREE.Color(0xff5a10), B2 = new THREE.Color(0xfff4d8);
    let t = 0, wk = 0;
    halo.onBeforeRender = () => { t += 0.016; core.opacity = wk * (0.8 + Math.sin(t * 2.3) * 0.1); };
    // (the core follows here too: the halo is hidden once the forge goes cold, and its onBeforeRender with it)
    g.userData.setWhite = (k) => { wk = clamp(k, 0, 1); core.opacity = wk * 0.8; halo.material.color.copy(A).lerp(B2, wk); halo.material.opacity = 0.35 + 0.45 * wk; halo.scale.setScalar(r * (2.6 + 1.4 * wk)); };
    g.userData.setWhite(o.white || 0);
    return g;
  },
  // the Ember Cradle: a small iron brazier on three feet, its coal and flame (combat hangs it at the hero's hip)
  cradle() {
    const g = new THREE.Group();
    g.add(iron([{ geo: G.lathe([[0, 0], [0.09, 0.0], [0.14, 0.08], [0.15, 0.16], [0.13, 0.17], [0.11, 0.1], [0, 0.09]], 9), color: 0x2e2a26, o: { y: 0.04 } }, ...[0, 1, 2].map((i) => ({ geo: G.cyl(0.012, 0.01, 0.07, 3), color: ASHIRON, o: { x: Math.sin(i * 2.09) * 0.08, z: Math.cos(i * 2.09) * 0.08, y: 0.03 } })), { geo: G.torus(0.15, 0.012, 3, 12), color: 0x4a3a2a, o: { y: 0.18, rx: Math.PI / 2 } }]));
    const coal = glowMat(0xff7a20), bed = new THREE.Mesh(G.cyl(0.11, 0.11, 0.02, 9), coal); bed.position.y = 0.17; g.add(bed);
    const fl = flameMesh(0.4); fl.position.y = 0.17; g.add(fl);
    g.userData.setLit = (b) => { coal.color.set(b ? 0xff7a20 : 0x2a1a10); fl.visible = !!b; };
    // the fire's strength (light.js: 1 its own ring, more when it has drunk, a little when the ring is held down)
    g.userData.setFire = (k) => { k = clamp(k, 0, 1.5); fl.visible = k > 0.02; fl.scale.setScalar(0.4 * Math.max(0.15, k)); coal.color.setRGB(1, 0.3 + 0.25 * Math.min(k, 1), 0.08 * k); };
    g.userData.flame = fl;
    // everything here is its own but the iron and the halo's dot (light.js, when the hero's look is rebuilt)
    g.userData.dispose = () => g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== MAT.iron) o.material.dispose(); } else if (o.isSprite) o.material.dispose(); });
    return g;
  },
  // the Ash Crown: a ring of black iron with tines, four sockets that light as the shards come home
  crown() {
    const g = new THREE.Group();
    g.add(iron([{ geo: G.torus(0.3, 0.05, 5, 18), color: 0x1e1c1c, o: { rx: Math.PI / 2 } }, ...Array.from({ length: 8 }, (_, k) => ({ geo: G.cone(0.045, 0.28 + (k % 2) * 0.12, 4), color: 0x24221f, o: { x: Math.sin(k * 0.785) * 0.3, z: Math.cos(k * 0.785) * 0.3, y: 0.16 + (k % 2) * 0.06 } }))]));
    const sockets = [0, 1, 2, 3].map((k) => { const m = new THREE.Mesh(G.oct(0.06), glowMat(0x2a1a14)); m.position.set(Math.sin(k * 1.571 + 0.39) * 0.33, 0.04, Math.cos(k * 1.571 + 0.39) * 0.33); g.add(m); return m; });
    g.userData.setSockets = (n) => sockets.forEach((m, k) => m.material.color.set(k < n ? (k === 3 ? 0xfff0c0 : 0xff6a20) : 0x2a1a14));
    g.userData.setSockets(0);
    return g;
  },
  // Ivar's hook in the Graves: an iron pole like the thousand round it, its one arm bare
  hook() { return iron([{ geo: G.cyl(0.045, 0.06, 3.0, 5), color: ASHIRON, o: { y: 1.5 } }, { geo: G.cyl(0.16, 0.2, 0.12, 6), color: 0x24221f, o: { y: 0.06 } }, { geo: G.box(0.04, 0.04, 0.7), color: ASHIRON, o: { y: 2.95, z: 0.33 } }, { geo: G.torus(0.06, 0.012, 3, 8, Math.PI * 1.5), color: 0x3a3632, o: { y: 2.86, z: 0.64, rx: Math.PI / 2 } }]); },
  // Isarn's staff, planted by the beacon: the lantern hangs from its crook
  staff() {
    const g = new THREE.Group();
    g.add(solid([{ geo: G.cyl(0.028, 0.034, 2.1, 6), color: 0x4a3524, o: { y: 1.05 } }, { geo: G.segTo(0.24, 0.1, 0, 0.018, 0.014, 4), color: 0x4a3524, o: { y: 2.0 } }]));
    const lan = lanternMesh(0.3); lan.position.set(0.24, 1.66, 0); g.add(lan);
    const fl = flameMesh(0.35, 0xffd890); fl.position.set(0.24, 1.73, 0); g.add(fl);
    g.rotation.z = -0.05;
    const C = { gold: [0xffc070, 0xffa040], white: [0xfff6e8, 0xffffff], dark: [0x15130f, 0] };
    g.userData.setLantern = (k) => { const c = C[k] || C.gold; lan.userData.glass.color.set(c[0]); fl.visible = k !== 'dark'; if (c[1]) fl.userData.halo.material.color.set(c[1]); };
    g.userData.setLantern('gold');
    return g;
  },
  // a light pool's rim on the ground (radius 1)
  lightRing() {
    const m = new THREE.Mesh(drapable(new THREE.PlaneGeometry(2, 2, 16, 16).rotateX(-Math.PI / 2), 0.05), new THREE.MeshBasicMaterial({ map: ringTexture(), color: 0xffb060, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.renderOrder = 2;
    const g = new THREE.Group(); g.add(m);
    g.userData.setColor = (c) => m.material.color.set(c);
    g.userData.setOpacity = (a) => { m.material.opacity = a; };
    return g;
  },
  // a Lampless lantern's cone on the ground: length 1 along +z, half-angle o.arc. The lantern's light falls off along it and
  // its edge is a faint line, so a patrol's reach reads without flooding the Graves; flash(k) whitens it as the alarm nears
  cone(o) {
    const arc = o.arc ?? 0.7, n = 16, nr = 8, pos = [0, 0, 0], col = [0.2, 0.2, 0.2], idx = [];
    for (let j = 1; j <= nr; j++) {
      const r = j / nr, k = 0.025 + 0.15 * Math.pow(1 - r, 1.6);
      for (let i = 0; i <= n; i++) {
        const a = -arc + (2 * arc * i) / n, v = 1 + (j - 1) * (n + 1) + i;
        pos.push(Math.sin(a) * r, 0, Math.cos(a) * r); col.push(k, k, k);
        if (!i) continue;
        if (j === 1) idx.push(0, v - 1, v); else idx.push(v - n - 2, v - 1, v, v - n - 2, v, v - n - 1);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x9ab8e0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(drapable(geo, 0.06), mat); m.renderOrder = 3;
    const side = (a) => Array.from({ length: nr }, (_, j) => V3(Math.sin(a) * (j + 1) / nr, 0, Math.cos(a) * (j + 1) / nr));
    const rim = Array.from({ length: n + 1 }, (_, i) => { const a = -arc + (2 * arc * i) / n; return V3(Math.sin(a), 0, Math.cos(a)); });
    const edge = new THREE.Line(drapable(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), ...side(-arc), ...rim, ...side(arc).reverse(), V3(0, 0, 0)]), 0.07), new THREE.LineBasicMaterial({ color: 0xb8d0f0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    const g = new THREE.Group(); g.add(m, edge);
    const base = new THREE.Color(0x9ab8e0), white = new THREE.Color(0xffffff);
    g.userData.flash = (k) => { k = clamp(k, 0, 1); mat.color.copy(base).lerp(white, k); mat.opacity = 0.5 + 0.5 * k; edge.material.opacity = 0.3 + 0.6 * k; };
    // (its Lampless frees it when it dies: ai.js)
    g.userData.dispose = () => { geo.dispose(); mat.dispose(); edge.geometry.dispose(); edge.material.dispose(); };
    return g;
  }
};
function anvilMesh(s, block) {
  const g = new THREE.Group(), M = MAT;
  g.add(solid([{ geo: G.box(2.3, block * 0.6, 2.3), color: DSTONE, o: { y: block * 0.3 }, jit: 0.08 }, { geo: G.box(1.8, block * 0.4, 1.8), color: STONE, o: { y: block * 0.8 } }].map((p) => ({ ...p, o: { ...p.o, sx: s / 3.2, sz: s / 3.2 } })), M.ashBlocks || M.lam));
  const top = block;
  const parts = cinder('anvil'), sz = size4(parts);
  if (parts) { const k = s / Math.max(0.01, Math.max(sz.x, sz.z)); for (const p of parts) { const m = new THREE.Mesh(p.geo, cinMat(p.mat)); m.scale.setScalar(k); m.position.y = top - sz.y0 * k; m.castShadow = true; g.add(m); } if (sz.z > sz.x) g.children[g.children.length - 1].rotation.y = Math.PI / 2; }
  else g.add(iron([{ geo: G.box(0.38 * s, 0.32 * s, 0.3 * s), color: 0x24221f, o: { y: top + 0.16 * s } }, { geo: G.box(0.7 * s, 0.17 * s, 0.32 * s), color: 0x2e2a28, o: { y: top + 0.4 * s } }, { geo: G.cone(0.13 * s, 0.32 * s, 5), color: 0x2e2a28, o: { y: top + 0.42 * s, x: 0.5 * s, rz: -Math.PI / 2 } }]));
  g.userData.top = top + 0.5 * s;
  return g;
}
// ---------- ground decals over the Act IV terrain ----------
// a flat geometry (in its local XZ) that drape() can lay on the ground, `lift` above it (on flat ground, as made)
export function drapable(geo, lift) {
  const P = geo.attributes.position, xz = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { xz[i * 2] = P.getX(i); xz[i * 2 + 1] = P.getZ(i); P.setY(i, lift); }
  geo.userData.drape = { xz, lift };
  return geo;
}
// every drapable geometry under obj follows the ground of layout L (L.hgt, gen4.js) where obj now stands; obj may be moved,
// turned about y and scaled (the decals of the other acts' flat ground need none of it)
export function drape(obj, L) {
  if (!L?.hgt || !obj) return;
  obj.updateWorldMatrix(true, true);
  obj.traverse((o) => {
    const D = o.geometry?.userData.drape; if (!D) return;
    const e = o.matrixWorld.elements, sy = e[5] || 1, P = o.geometry.attributes.position, A = P.array, xz = D.xz;
    for (let i = 0; i < P.count; i++) {
      const x = xz[i * 2], z = xz[i * 2 + 1];
      A[i * 3 + 1] = (groundY(L, e[0] * x + e[8] * z + e[12], e[2] * x + e[10] * z + e[14]) + D.lift - e[13]) / sy;
    }
    P.needsUpdate = true;
    o.geometry.computeBoundingSphere();
  });
}
let ringTex = null;
function ringTexture() {
  if (ringTex) return ringTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 63);
  gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.96, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (ringTex = new THREE.CanvasTexture(c));
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
  // Act V (sea.js): the water over the tidal flats, the leads and the open sea; the thin ice, its windows and floes
  if (L.bed || L.sea) out.sea = buildSea(L, group, quality);
  if (L.ice) out.ice = buildIce(L, group, quality);
  // (Act V's props are the rime pack's, placed by act5Level)
  if (!ACT5.has(L.type)) for (const p of L.props) addProp(B, I, p, L, rng, out);
  if (L.type === 'weep' || L.type === 'heart') act3Level(L, I, B, out);
  if (ACT4.has(L.type)) act4Level(L, I, B, out);
  // the sea past the north and east edges, out into the fog: pack ice after the Freeze, and round the Farthest Light
  if (ACT5.has(L.type)) { out.beyond = seaBeyond(L, group, { ice: L.type === 'farlight' ? 'pack' : L.mode === 'frozen' }); act5Level(L, I, B, out); }
  if (L.type === 'town') townBeyond(L, I, group);
  // per-level shader globals, set whenever this level's ground is drawn (only the zone the hero is in): the Edge of Tears,
  // where the last of the wind still reaches the Weeping Woods, and the Heartwood's heart that the lights beat with
  const edge = L.type === 'weep' ? [L.h - 40, L.h - 26] : [0, 0], heartAt = L.type === 'heart' ? L.spots.heart : null;
  // (FX.L5: an Act V layout for fx.js's footprints, which lie only on its snow)
  const l5 = ACT5.has(L.type) ? L : null;
  if (out.ground) out.ground.onBeforeRender = () => { WIND.uEdge.value.set(edge[0], edge[1]); LIGHTS.heart = heartAt; FX.L5 = l5; };
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
// (for build5.js: Act V's props share the materials, the geometry helpers and the Act IV fire looks)
export { MAT, mats, worldMat, bake, jitter, prism, solid, size4, own, glowMat, flameMesh, lanternMesh, lay4, hash2, act4Mats, Std };
