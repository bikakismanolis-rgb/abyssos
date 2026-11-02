// Act VI's props (docs/act6-contract.md, Visuals; act6-design.md, The look). act6Level dresses a layout of gen6.js from
// L.props (the rime pack's scans where it has one, 'rime/<name>'; the boot sets' props of the stamped crypt and wood, and
// the village's houses, in the drowned grade; code for the rest) and the spots no one else places (skylights, the glade's
// garlands, the Well's mouth once the Mere is dry, the rope's foot, the vault for the cines). What gen6 leaves to the zone
// (world.js act6Zone, from L.spots: hearths, lost lights, lanterns, bells, lures, black lamps, stones, niches, the ring,
// the ember, the neck) comes from act6Prop, which builds the props the story owns, each a THREE.Object3D with userData.kind and its
// switches, and a code fallback for every part. No light of their own: the pools that light them are light.js's (true
// light, `it.lit && it.lightR`) and the layout's (L.lights: the braziers, the fire-pots, the camp fires). Every image has
// its quality-0 path first (no sparks, no motes, no shafts, half the dark's particles); quality 1 adds them.
// Instancer types (build.js): 'drowned:<type>' any type in the drowned grade; 'c6:<name>' a code model of this file,
// 'c6:stone/<scan>' an env scan in the vault's stone (stone6), unlit by snow.
import * as THREE from 'three';
import { R } from '../gfx/gfx.js';
import { emitAt, marksMesh } from '../gfx/fx.js';
import { ENV, packProp } from '../gfx/env.js';
import { tex, runeLines } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { KIT, KIT_SCALE } from '../gfx/kits.js';
import { RNG, clamp, lerp, noise2 } from '../core/util.js';
import { groundY } from './genlib.js';
import { TICKS, vaultMesh } from './sea.js';
import { instDef5, act5Prop } from './build5.js';
import { MAT, mats, worldMat, bake, jitter, size4, own, lanternMesh, lay4, hash2, occlude, addProp, WIND } from './build.js';

const rime = (name) => packProp('rime', name);
// relative colours: the world-projected materials multiply their layer by vertexColour / GREY (GREY the layer itself)
const GREY = 0x6a6a6a, BLACKST = 0x2c2e32, DARKST = 0x3e4044, WOODW = 0x4e4a46, WOODD = 0x34302c, IRON = 0x222224, BONE = 0x6e685e, OIL = 0x0a0806;
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const TRS = (x, y, z, ry = 0, tilt = 0, s = 1, pitch = 0) => { _e.set(pitch, ry, tilt, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(s, s, s)); };
const ROCKS = ['boulder', 'rockA', 'rockB', 'rockC'];
const rockAt = (x, z) => { const l = ROCKS.filter((k) => ENV.props[k]); return l.length ? l[Math.floor(hash2(x * 1.7, z * 2.3) * l.length) % l.length] : null; };

// ---------- materials ----------
// stone6 (the shore's and the vault's stone, no snow: rime seaCliff, else the shore, else the base set's wall), wood6 (old
// wet timber: rime planks, else plain vertex colour), iron6, bone6 (the Ketos's neck), bronze6 (the bells), flame6 (the
// fires' cards, additive, their own vertex colours)
const M6 = { key: '' };
function mats6() {
  const key = (ENV.packs.rime ? 'r' : '') + (ENV.ready ? 'e' : '') + R.quality;
  if (M6.key === key) return MAT;
  M6.key = key;
  const st = lay4('rime/seaCliff', 'rime/shore', 'wall'), pl = lay4('rime/planks');
  MAT.stone6 = st ? worldMat(st, { scale: 2.6, vc: 0.144, tri: true, rough: 0.88, tint: 0x9a9ea4 }) : (MAT.stone6c ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x7a7c80 })));
  MAT.wood6 = pl ? worldMat(pl, { scale: 1.7, vc: 0.144, rough: 0.7, tint: 0x9c9a96 }) : (MAT.wood6c ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x6a6866 })));
  MAT.iron6 ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  MAT.bone6 ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  MAT.bronze6 ||= new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.flame6 ||= new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  return MAT;
}
const solid6 = (parts, mat) => { const m = new THREE.Mesh(bake(parts), mat || MAT.lam); m.castShadow = true; m.receiveShadow = true; return m; };
const sprite6 = (c, s, o = {}) => { const h = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: o.map || tex('dot'), color: c, transparent: true, opacity: o.opacity ?? 0.8, blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }))); h.scale.setScalar(s); h.renderOrder = o.order ?? 2; return h; };

// ---------- the drowned grade (the stamped crypt's and wood's boot props, the village's houses) ----------
// Black-blue and wet (roughness 0.3 where the material has one), its own colour all but gone, a pale rime on what faces up.
// The source material's own patches are kept and this one laid after them (cached per material); a basic (unlit) material
// and a glow part stay as they are. (The studio environment at its old 0.45 on a wet roughness laid a pale sheen down
// every drowned trunk and house wall, and a brighter rime drew every wall's, pillar's and stump's top as a white outline
// under the hemisphere's light: in the Bottom's dark both read as white models)
// kind 'silt': the Drained Sea's own (its rocks, the rime pack's hulls, shacks and bones, the crates): wet and darkened
// toward the silt's grey-green, a third of its own colour kept, no rime (nothing up there freezes; the sea only left)
const DROWN = new Map();
const GRADE6 = {
  drowned: `{ float dl = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
    diffuseColor.rgb = mix(vec3(dl), diffuseColor.rgb, 0.2) * vec3(0.23, 0.27, 0.35);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.22, 0.25) * (0.75 + dl * 0.4), smoothstep(0.72, 0.95, normalize(vDrN).y) * 0.32); }`,
  silt: `{ float dl = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
    diffuseColor.rgb = mix(vec3(dl), diffuseColor.rgb, 0.34) * vec3(0.4, 0.42, 0.4);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.21, 0.19) * (0.8 + dl * 0.4), smoothstep(0.75, 0.97, normalize(vDrN).y) * 0.3); }`
};
export function drownMat(src, kind = 'drowned') {
  if (!src || src.isMeshBasicMaterial || src.isSpriteMaterial || src.transparent) return src;
  const ck = kind === 'drowned' ? src : kind + ':' + src.uuid;
  if (DROWN.has(ck)) return DROWN.get(ck);
  const m = src.clone(), prev = src.onBeforeCompile, key = src.customProgramCacheKey?.() || src.type;
  if (m.isMeshStandardMaterial) { m.roughness = kind === 'silt' ? 0.45 : 0.3; m.metalness = 0; m.envMapIntensity = 0.12; }
  m.onBeforeCompile = (sh, r) => {
    prev?.call(src, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDrN;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
  { vec3 dn = objectNormal;
#ifdef USE_INSTANCING
    dn = mat3(instanceMatrix) * dn;
#endif
    vDrN = normalize(mat3(modelMatrix) * dn); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vDrN;')
      .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
  // (${kind}: the colour drained ${kind === 'silt' ? 'and wet, the silt settled on top' : 'to a cold black-blue, the rime on top faces'})
  ${GRADE6[kind]}`);
  };
  m.customProgramCacheKey = () => key + '|' + kind;
  DROWN.set(ck, m);
  return m;
}
// an Instancer type's parts in the drowned grade (or kind's): leaves dropped (the wood stands bare: an alpha-tested or
// see-through part of a tree scan), glow parts put out (a drowned house's windows are dark)
let DEADGLASS = null;
export function drownDef(def, kind = 'drowned') {
  if (!def) return null;
  DEADGLASS ||= new THREE.MeshBasicMaterial({ color: 0x06080c });
  const parts = def.parts.filter((p) => !(p.material?.alphaTest > 0 || (p.material?.transparent && !p.glow))).map((p) => ({ ...p, glow: false, material: p.glow ? DEADGLASS : drownMat(p.material, kind) }));
  return parts.length ? { parts, shadow: def.shadow } : null;
}
// I and B wrapped so a boot prop placed through build.js addProp comes out drowned, or in kind's grade (what it adds to the
// group itself, a cobweb, stays as it is)
function drowned(I, B, kind = 'drowned') {
  const pre = kind + ':';
  return { I: { add: (type, ...a) => I.add(pre + type, ...a), group: I.group }, B: { add: (mat, ...a) => B.add(pre + mat, ...a), put: (mat, ...a) => B.put(pre + mat, ...a), group: B.group } };
}

// ---------- 'c6:' instanced code models ----------
const CODE6_CACHE = {};
const CODE6 = {
  // a lure post: a weathered post, a crook, a dead lamp hanging from it (the Falselight's bait sits within 4 m)
  lurePost: () => ({ mat: 'wood6', geo: bake([{ geo: G.cyl(0.07, 0.1, 2.3, 6), color: WOODW, o: { y: 1.15, rz: 0.05 } }, { geo: G.box(0.62, 0.07, 0.07), color: WOODD, o: { x: 0.26, y: 2.22 } },
    { geo: G.cyl(0.012, 0.012, 0.22, 3), color: IRON, o: { x: 0.52, y: 2.08 } }, { geo: G.cyl(0.13, 0.11, 0.24, 6), color: 0x1a1816, o: { x: 0.52, y: 1.88 } }, { geo: G.cone(0.15, 0.1, 6), color: 0x1a1816, o: { x: 0.52, y: 2.04 } },
    ...[0, 1, 2].map((i) => ({ geo: jitter(G.dodeca(0.16), 0.04, 951 + i), color: DARKST, o: { x: Math.sin(i * 2.1) * 0.2, z: Math.cos(i * 2.1) * 0.2, y: 0.06 } }))]) }),
  // a slab of the vault's ice fallen at a keel's foot
  slab: () => ({ mat: 'stone6', geo: bake([{ geo: jitter(G.box(0.9, 0.24, 0.6, 2, 1, 2), 0.06, 961), color: 0x8a9aa4 }]), shadow: false })
};
// a 'c6:' type: 'c6:stone/<env scan>' that scan in stone6 (no snow on it under the ice), else a CODE6 model
export function instDef6(type, M, quality) {
  mats6();
  const name = type.slice(3).replace('~ns', ''), ns = type.endsWith('~ns');
  if (name.startsWith('stone/')) {
    const parts = ENV.props[name.slice(6)] || rime(name.slice(6)); if (!parts) return null;
    return { parts: parts.map((p) => ({ geo: p.geo, material: MAT.stone6 })), shadow: !ns };
  }
  const f = CODE6[name]; if (!f) return null;
  const c = (CODE6_CACHE[name] ||= f());
  return { parts: [{ geo: c.geo, material: MAT[c.mat] || M.lam }], shadow: !ns && (c.shadow ?? true) };
}

// ---------- fire: the look of a true light's flame (its light is the pool's or the layout's) ----------
let FLAME_GEO = null;
function flame6(s) {
  FLAME_GEO ||= bake([{ geo: G.cone(0.1, 0.36, 6), color: 0xff7a24, o: { y: 0.18 } }, { geo: G.cone(0.066, 0.26, 5), color: 0xffb850, o: { y: 0.14 } }, { geo: G.cone(0.035, 0.14, 5), color: 0xfff0c8, o: { y: 0.08 } }]);
  const f = new THREE.Mesh(FLAME_GEO, MAT.flame6); f.scale.setScalar(s); f.renderOrder = 2.2;
  // (its own sway: band-limited, a seed of its own, never one beat)
  const seed = Math.random() * 100;
  f.onBeforeRender = () => { const t = R.time * 4.5 + seed; f.scale.set(s * (1 + (noise2(t, seed) - 0.5) * 0.18), s * (1 + (noise2(t * 1.3, seed + 7) - 0.5) * 0.34), s * (1 + (noise2(t * 0.9, seed + 3) - 0.5) * 0.18)); };
  return f;
}
// o: { smoke, color, n (cards) }. { group, set(b), k(k), lit }: set lights it (flames, halo, coals); k brightens it (a
// flare); its sparks and embers come from fx's pools on quality 1 and up
function fire6(s = 1, o = {}) {
  const g = new THREE.Group(), color = o.color ?? 0xffb060;
  const coal = own(new THREE.MeshBasicMaterial({ color: 0x1a120c, toneMapped: false }));
  const bed = new THREE.Mesh(jitter(G.dome(0.28 * s, 0.25, 8), 0.03 * s, 931), coal); bed.position.y = -0.02 * s; g.add(bed);
  const fl = new THREE.Group(); g.add(fl);
  const n = o.n ?? 4;
  for (let k = 0; k < n; k++) { const a = k * 2.1, f = flame6(s * (k ? 0.6 + k * 0.08 : 1)); if (k) f.position.set(Math.sin(a) * s * 0.09, 0, Math.cos(a) * s * 0.09); fl.add(f); }
  const ha = sprite6(color, 2.4 * s, { opacity: 0.55 }); ha.position.y = 0.4 * s; g.add(ha);
  const fx = [{ type: 'fire', s: 0.55 * s, y0: 0.08 * s }, { type: 'embers', s: 1, y0: 0.3 * s }];
  if (o.smoke) fx.push({ type: 'smoke', s: 1, y0: 0.9 * s });
  const p = new THREE.Vector3();
  let lit = false, kk = 0;
  TICKS.add({ obj: g, tick(dt) { if (!lit || R.quality < 1) return; g.updateWorldMatrix(true, false); p.setFromMatrixPosition(g.matrixWorld); for (const e of fx) { e.x = p.x; e.y = p.y + e.y0; e.z = p.z; emitAt(e, dt); } } });
  const set = (b) => { lit = !!b; coal.color.set(lit ? 0xff7024 : 0x1a120c); fl.visible = ha.visible = lit; };
  set(false);
  return { group: g, set, k(k) { kk = k; ha.scale.setScalar(2.4 * s * (1 + kk * 0.9)); fl.scale.setScalar(1 + kk * 0.4); ha.material.opacity = Math.min(1, 0.55 + kk * 0.3); }, get lit() { return lit; } };
}
// a ring of n stones round the origin (r out, s wide), in stone6, a jittered code stone each (black for a hearth)
function stoneRing(seed, n, r, s, color = BLACKST, sy = 0.7) {
  const rr = RNG(seed), parts = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + rr.range(-0.15, 0.15), w = s * rr.range(0.8, 1.2); parts.push({ geo: jitter(G.dodeca(w), w * 0.25, seed + k), color: k % 3 ? color : DARKST, o: { x: Math.sin(a) * r, y: w * sy * 0.45, z: Math.cos(a) * r, sy, ry: rr.range(0, 6.28) }, jit: 0.15 }); }
  return parts;
}
// a lit/dark switch on a lantern's glass (lanternMesh) with a flame and a halo: set(b)
function lampLight(g, at, s = 1, color = 0xffc070) {
  const lan = lanternMesh(0.4 * s); lan.position.set(at.x, at.y, at.z); g.add(lan);
  const fl = flame6(0.5 * s); fl.position.set(at.x, at.y + 0.08 * s, at.z); g.add(fl);
  const ha = sprite6(color, 2.2 * s, { opacity: 0.6 }); ha.position.set(at.x, at.y + 0.2 * s, at.z); g.add(ha);
  const LITC = new THREE.Color(0xffc070), DEADC = new THREE.Color(0x15130f);
  return (b) => { lan.userData.glass.color.copy(b ? LITC : DEADC); fl.visible = ha.visible = !!b; };
}

// ---------- act6Prop: the story's props ----------
let ringTex = null;
function ringTexture() {
  if (ringTex) return ringTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (ringTex = new THREE.CanvasTexture(c));
}
let stripTex = null;
function stripTexture() {
  if (stripTex) return stripTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'), im = g.createImageData(64, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) { const u = Math.min(x, 63 - x) / 12, v = 1 - Math.abs(y - 15.5) / 16, a = Math.min(1, u) * v * v * (0.75 + 0.25 * Math.sin(x * 0.7 + y * 0.3)); const i = (y * 64 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(clamp(a, 0, 1) * 255); }
  g.putImageData(im, 0, 0);
  return (stripTex = new THREE.CanvasTexture(c));
}
// a shadow-wall's seam: bright along both long edges, nothing between them, fading at the band's ends (alpha only)
let seamTex = null;
function seamTexture() {
  if (seamTex) return seamTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'), im = g.createImageData(64, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) { const u = Math.min(1, Math.min(x, 63 - x) / 8), e = Math.abs(y - 15.5) / 16, a = u * Math.max(0, 1 - Math.abs(e - 0.8) / 0.16) * (0.8 + 0.2 * Math.sin(x * 0.9 + y)); const i = (y * 64 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(clamp(a, 0, 1) * 255); }
  g.putImageData(im, 0, 0);
  return (seamTex = new THREE.CanvasTexture(c));
}
// the dark's particles over a shadow-wall's band (one draw: points that rise and drift, dark, normal-blended)
function darkPoints(n, len, dep, hgt) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), rr = RNG(n * 7 + Math.round(len * 13));
  for (let i = 0; i < n; i++) { pos[i * 3] = rr.range(-len / 2, len / 2); pos[i * 3 + 1] = 0; pos[i * 3 + 2] = rr.range(-dep / 2, dep / 2); ph[i] = rr.next(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, hgt / 2, 0), Math.hypot(len / 2, dep / 2, hgt));
  const u = { uTime: WIND.uTime, uThin: { value: 0 }, uVH: { value: 600 }, uH: { value: hgt } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false,
    vertexShader: `attribute float aPh; uniform float uTime; uniform float uThin; uniform float uVH; uniform float uH; varying float vA;
void main() {
  vec3 p = position; float t = uTime * 0.11 + aPh * 7.0, y = fract(t);
  p.y = 0.15 + y * uH; p.x += sin(t * 5.1 + aPh * 11.0) * 0.35; p.z += cos(t * 4.3 + aPh * 5.0) * 0.25;
  vA = sin(y * 3.1416) * (1.0 - uThin);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.75 + aPh * 0.6) * (1.0 - uThin * 0.6) * projectionMatrix[1][1] * uVH * 0.5 / max(-mv.z, 0.5);
  gl_Position = projectionMatrix * mv;
}`,
    // (each mote black-violet at its heart, its edge the dark's violet: black alone on the black floor never read as a wall)
    fragmentShader: `varying float vA;
void main() { vec2 q = gl_PointCoord - 0.5; float d = dot(q, q) * 4.0, a = (1.0 - smoothstep(0.45, 1.0, d)) * vA * 0.75; if (a < 0.01) discard; gl_FragColor = vec4(mix(vec3(0.018, 0.01, 0.028), vec3(0.15, 0.11, 0.3), smoothstep(0.3, 0.8, d)), a); }` });
  const pts = new THREE.Points(geo, mat); pts.renderOrder = 2.4;
  pts.onBeforeRender = (r) => { u.uVH.value = r.getDrawingBufferSize(_v2).y; };
  return { pts, u };
}
const _v2 = new THREE.Vector2();
// a column of slow motes falling through a skylight's light (one draw, additive)
function skyMotes(n, r, hgt, color) {
  const pos = new Float32Array(n * 3), ph = new Float32Array(n), rr = RNG(n * 3 + Math.round(r * 31));
  for (let i = 0; i < n; i++) { const a = rr.range(0, 6.28), d = Math.sqrt(rr.next()) * r; pos[i * 3] = Math.sin(a) * d; pos[i * 3 + 2] = Math.cos(a) * d; ph[i] = rr.next(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, hgt / 2, 0), Math.hypot(r, hgt));
  const u = { uTime: WIND.uTime, uK: { value: 1 }, uVH: { value: 600 }, uH: { value: hgt }, uC: { value: new THREE.Color(color) } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aPh; uniform float uTime; uniform float uVH; uniform float uH; uniform float uK; varying float vA;
void main() {
  vec3 p = position; float t = uTime * 0.035 + aPh, y = 1.0 - fract(t);
  p.y = 0.1 + y * uH; p.x += sin(uTime * 0.3 + aPh * 9.0) * 0.3; p.z += cos(uTime * 0.25 + aPh * 6.0) * 0.3;
  vA = smoothstep(0.0, 0.12, y) * smoothstep(1.0, 0.7, y) * uK;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = 0.09 * projectionMatrix[1][1] * uVH * 0.5 / max(-mv.z, 0.5) + 1.5;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `uniform vec3 uC; varying float vA;
void main() { vec2 q = gl_PointCoord - 0.5; float a = (1.0 - dot(q, q) * 4.0) * vA; if (a < 0.01) discard; gl_FragColor = vec4(uC * a * 1.4, a); }` });
  const pts = new THREE.Points(geo, mat); pts.renderOrder = 2.3;
  pts.onBeforeRender = (rd) => { u.uVH.value = rd.getDrawingBufferSize(_v2).y; };
  return { pts, u };
}
// a faint shaft of light falling through thin ice: an open cone, brightest where it is seen through its middle, fading
// toward the floor (additive, quality 1 and up)
function shaftMesh(r, hgt, color) {
  const geo = new THREE.CylinderGeometry(r * 0.8, r, hgt, 18, 1, true); geo.translate(0, hgt / 2, 0);
  const u = { uK: { value: 1 }, uC: { value: new THREE.Color(color) }, uH: { value: hgt } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vY = position.y; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 uC; uniform float uK; uniform float uH; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.0); float y = vY / uH; float a = f * smoothstep(0.0, 0.35, y) * (0.35 + 0.65 * y) * 0.3 * uK; gl_FragColor = vec4(uC * a, a); }' });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 2.3;
  return { m, u };
}
// a tween run while its prop stands in the scene: f(k) with k 0..1 over dur s, then done
function tween(obj, dur, f, done) {
  let t = 0;
  const tk = { obj, tick(dt) { t += dt; const k = clamp(t / Math.max(dur, 1e-3), 0, 1); f(k); if (k >= 1) { TICKS.delete(tk); done?.(); } } };
  TICKS.add(tk);
}
// a fitted scan: { k, y0, sz } so it stands on its base at the wanted size ('h' height, 'w' widest, 'l' longest)
function fit6(parts, want, by = 'h') {
  const sz = size4(parts); if (!sz) return null;
  const k = by === 'h' ? want / Math.max(0.01, sz.y) : by === 'w' ? want / Math.max(0.01, sz.x, sz.z) : want / Math.max(0.01, sz.x, sz.y, sz.z);
  return { k, y0: sz.y0 * k, sz };
}
// a scan's parts as meshes at scale k (in mat, or their own; drown: their own in the drowned grade)
const meshOf = (parts, k, mat, drown) => { const g = new THREE.Group(); for (const p of parts) { const m = new THREE.Mesh(p.geo, mat || (drown ? drownMat(p.mat) : p.mat)); m.scale.setScalar(k); m.castShadow = !p.mat?.transparent; m.receiveShadow = true; g.add(m); } return g; };

const PROP6 = {
  // a hearth of the First: a ring of black stones (Act V's cairn ring, low), her old fire's char in it, a fire when lit
  hearth6() {
    const g = new THREE.Group();
    g.add(solid6([...stoneRing(971, R.quality >= 1 ? 9 : 7, 0.82, 0.3), ...stoneRing(972, 5, 0.5, 0.2, DARKST, 0.6)], MAT.stone6));
    const rr = RNG(973), char = [];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + rr.range(-0.3, 0.3); char.push({ geo: G.cyl(0.05, 0.08, 0.8, 5), color: 0x1a1612, o: { x: Math.sin(a) * 0.14, y: 0.12, z: Math.cos(a) * 0.14, rx: Math.cos(a) * 1.1, rz: -Math.sin(a) * 1.1 } }); }
    g.add(solid6(char, MAT.iron6));
    const fire = fire6(1.25, { smoke: true }); fire.group.position.y = 0.12; g.add(fire.group);
    g.userData.fireY = 0.45;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; };
    g.userData.flash = (k) => fire.k(k);
    return g;
  },
  // Tamarisk's whale-oil brazier: an iron bowl on three splayed legs, black oil in it, stones at its feet; o.pot: Glaukos's
  // fire-pot (x 0.7)
  brazier6(o) {
    const g = new THREE.Group(), body = new THREE.Group(), s = o.pot ? 0.7 : 1; g.add(body); body.scale.setScalar(s);
    const legs = [0, 1, 2].map((i) => ({ geo: G.segTo(Math.sin(i * 2.09) * 0.4, -0.92, Math.cos(i * 2.09) * 0.4, 0.04, 0.034, 5), color: IRON, o: { y: 0.94 } }));
    body.add(solid6([...legs, { geo: G.lathe([[0.12, 0], [0.36, 0.05], [0.46, 0.2], [0.48, 0.28], [0.44, 0.28], [0.4, 0.12], [0.1, 0.06]], 12), color: 0x26221e, o: { y: 0.86 } }, { geo: G.torus(0.47, 0.03, 4, 14), color: 0x1c1a18, o: { y: 1.14, rx: Math.PI / 2 } }], MAT.iron6));
    body.add(solid6(stoneRing(981, 5, 0.5, 0.18, DARKST), MAT.stone6));
    const oil = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12).rotateX(-Math.PI / 2), own(new THREE.MeshLambertMaterial({ color: OIL }))); oil.position.y = 1.07; body.add(oil);
    const fire = fire6(0.95); fire.group.position.y = 1.1; body.add(fire.group);
    g.userData.fireY = 1.3 * s;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; };
    g.userData.flash = (k) => fire.k(k);
    return g;
  },
  // a black lamp: an iron cage on a pole, the dark burning in it (a normal-blended black-violet core under an additive
  // 0x8a70ff rim: an additive black draws nothing), no light; setLit(false): the cage cold and empty; flare(k): the Black
  // Flare's swell (0 at rest)
  blackLamp() {
    const g = new THREE.Group(), y = 2.05;
    const bars = [{ geo: G.cyl(0.06, 0.08, 2.5, 6), color: IRON, o: { y: 1.25 } }, { geo: G.box(0.08, 0.08, 0.5), color: IRON, o: { y: 2.46, z: 0.2 } }, { geo: G.cyl(0.32, 0.36, 0.14, 8), color: DARKST, o: { y: 0.07 } }];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; bars.push({ geo: G.cyl(0.018, 0.018, 0.62, 3), color: IRON, o: { x: Math.sin(a) * 0.2, y, z: 0.42 + Math.cos(a) * 0.2 } }); }
    bars.push({ geo: G.torus(0.21, 0.025, 4, 10), color: IRON, o: { y: y + 0.31, z: 0.42, rx: Math.PI / 2 } }, { geo: G.torus(0.21, 0.025, 4, 10), color: IRON, o: { y: y - 0.31, z: 0.42, rx: Math.PI / 2 } }, { geo: G.cone(0.24, 0.18, 6), color: IRON, o: { y: y + 0.42, z: 0.42 } });
    g.add(solid6(bars, MAT.iron6));
    const core = sprite6(0x0a0612, 0.95, { normal: true, opacity: 0.94, order: 2.5 }), rim = sprite6(0x8a70ff, 1.25, { map: ringTexture(), opacity: 0.85, order: 2.6 });
    const glow = sprite6(0x5a40c0, 2.6, { opacity: 0.22, order: 2.6 });
    for (const sp of [core, rim, glow]) { sp.position.set(0, y, 0.42); g.add(sp); }
    let lit = true, fk = 0;
    const look = () => { core.visible = rim.visible = lit; glow.visible = lit && R.quality >= 1; core.scale.setScalar(0.95 * (1 + fk * 1.2)); rim.scale.setScalar(1.25 * (1 + fk * 1.4)); glow.scale.setScalar(2.6 * (1 + fk * 1.8)); rim.material.opacity = Math.min(1, 0.85 + fk * 0.3); };
    g.userData.setLit = (b) => { lit = !!b; g.userData.lit = lit; look(); };
    g.userData.flare = (k = 1) => { fk = clamp(k, 0, 2); look(); };
    g.userData.flameAt = { x: 0, y, z: 0.42 };
    look();
    return g;
  },
  // a shadow-wall across the Stair's head: the dark's particles rising over its band and a dark strip on the floor; o.len,
  // o.depth (14 x 3: one band of the Stair, local x along it), or o.cells (its cells: userData.at their centre, the band
  // laid along its longer side); thin(dur, done) thins it away (then hidden)
  shadowWall(o) {
    const g = new THREE.Group();
    let len = o.len ?? 14, dep = o.depth ?? 3;
    if (o.cells?.length) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const [x, z] of o.cells) { x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); z0 = Math.min(z0, z); z1 = Math.max(z1, z + 1); }
      g.userData.at = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, rot: x1 - x0 >= z1 - z0 ? 0 : Math.PI / 2 };
      len = Math.max(x1 - x0, z1 - z0); dep = Math.min(x1 - x0, z1 - z0);
    }
    const n = R.quality >= 1 ? 40 : 20, P = darkPoints(n, len, dep, 3.4); g.add(P.pts);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + 1, dep + 1.6).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ map: stripTexture(), color: 0x040208, transparent: true, opacity: 0.85, depthWrite: false })));
    strip.position.y = 0.035; strip.renderOrder = 2; g.add(strip);
    // (a wall of the dark reads as one at a glance: a low veil standing over the strip, darker toward the floor)
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(len, 2.4), own(new THREE.MeshBasicMaterial({ map: stripTexture(), color: 0x05030a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })));
    veil.position.y = 1.0; veil.renderOrder = 2.35; g.add(veil);
    // (and a seam of the dark's violet along both long edges of its band, breathing slowly (0.5 Hz, far under the flash
    // rule's three a second), additive over the strip: on the black floor the wall's own dark showed only where her light fell)
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.6, dep + 1.2).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ map: seamTexture(), color: 0x8a70ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
    seam.position.y = 0.045; seam.renderOrder = 2.05; g.add(seam);
    let sk = 1;
    seam.onBeforeRender = () => { seam.material.opacity = (0.3 + 0.12 * Math.sin(R.time * Math.PI)) * sk; };
    g.userData.thin = (dur = 2, done) => tween(g, dur, (k) => { P.u.uThin.value = k; strip.material.opacity = 0.85 * (1 - k); veil.material.opacity = 0.55 * (1 - k); sk = 1 - k; }, () => { g.visible = false; g.userData.open = true; done?.(); });
    return g;
  },
  // an ice keel reaching down to the floor: an env rock stretched tall in Act V's ice, hung upside down and fading into the
  // dark above; o.r (1-2.5), o.h (its height, 16), o.window: a clear face toward local +z (Asger's). (Its icicles hang where
  // it meets the vault, which play never sees: a ring of them at the play camera's height read as a crown floating round it)
  keel(o) {
    const g = new THREE.Group(), r = o.r ?? 1.6, H = o.h ?? 16, name = rockAt(o.seed ?? r * 13, r * 7);
    if (name) for (const m of keelMeshes(name, [{ x: 0, z: 0, rot: 0, r, h: H }])) g.add(m);
    else g.add(solid6([{ geo: jitter(G.cyl(r * 1.1, r * 0.8, H, 9, 4), r * 0.18, 991), color: 0x3a4a54, o: { y: H / 2 - 1 } }], MAT.stone6));
    if (o.window) { const wd = keelWindow(r); g.add(wd); g.userData.window = wd.userData.window; }
    return g;
  },
  // a skylight: green-white light falling through thin vault, slow motes in its column and a faint shaft (quality 1 and up;
  // the pool on the floor is light.js's, o.light false); dim(k): its strength, 1 full, 0.5 at the high water's dimming
  skylight(o) {
    const g = new THREE.Group(), r = o.r ?? 4, c = o.color ?? 0xa8e8cc;
    let M = null, S = null;
    if (R.quality >= 1) { M = skyMotes(30, r * 0.85, 11, c); g.add(M.pts); S = shaftMesh(r, 13, c); g.add(S.m); }
    g.userData.dim = (k = 1) => { if (M) M.u.uK.value = k; if (S) S.u.uK.value = k; g.userData.k = k; };
    g.userData.r = r;
    return g;
  },
  // a toppled sea-light: a rime tower (o.v 0-2, or o.kind 'towerA'-'towerC' as gen6's L.spots.lost name it) lying on its
  // side along local +z from its base at the origin, its lantern end (its cut top, extras.top) at userData.lampAt; o.len
  // its length (gen6's footprint), o.lampZ where along it its fire-cage fell (the lantern end's interact); setLit(b) the
  // fire relit lying on its side; code tower when the scan is missing
  toppledLight(o) {
    const g = new THREE.Group(), v = (o.v ?? Math.max(0, ['towerA', 'towerB', 'towerC'].indexOf(o.kind))) % 3, nm = ['towerA', 'towerB', 'towerC'][v], parts = rime(nm), H = o.len ?? [8.6, 9.4, 7.8][v];
    let top = H, rad = 1.5;
    if (parts) {
      const f = fit6(parts, H, 'h'), ex = ENV.extras['rime/' + nm]?.top, body = meshOf(parts, f.k, null, true);
      // (on its side: its base at the origin, up along +z, half sunk in the silt; the scan's own stone in the drowned grade)
      body.rotation.x = Math.PI / 2; body.position.set(0, (f.sz.x * f.k) / 2 * 0.55, -f.y0); g.add(body);
      top = ex != null ? (ex - f.sz.y0) * f.k : H; rad = (Math.max(f.sz.x, f.sz.z) * f.k) / 2;
    } else {
      g.add(solid6([{ geo: jitter(G.cyl(1.3, 1.55, H, 12, 2), 0.06, 1001), color: GREY, o: { y: 1.0, z: H / 2, rx: Math.PI / 2 } }, ...Array.from({ length: 7 }, (_, k) => ({ geo: jitter(G.dodeca(0.4 + (k % 3) * 0.15), 0.1, 1002 + k), color: DARKST, o: { x: Math.sin(k * 2.3) * 2.2, y: 0.2, z: H + 0.6 + Math.cos(k * 1.7) * 1.4 } }))], MAT.stone6));
    }
    // (its fire-cage tipped out of the cut top onto the sand)
    top = o.lampZ != null ? o.lampZ - 0.5 : top;
    const cage = new THREE.Group(); cage.position.set(0.5, 0.25, top + 0.5); cage.rotation.z = 1.2; g.add(cage);
    const bars = [{ geo: G.torus(0.42, 0.045, 4, 12), color: 0x1c1a1a, o: { rx: Math.PI / 2 } }, { geo: G.torus(0.5, 0.04, 4, 12), color: 0x1c1a1a, o: { y: 0.55, rx: Math.PI / 2 } }];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; bars.push({ geo: G.segTo(Math.sin(a) * 0.08, 0.55, Math.cos(a) * 0.08, 0.035, 0.03, 4), color: 0x201e1c, o: { x: Math.sin(a) * 0.42, z: Math.cos(a) * 0.42 } }); }
    cage.add(solid6(bars, MAT.iron6));
    const fire = fire6(0.8); fire.group.position.set(0.7, 0.3, top + 0.5); g.add(fire.group);
    g.userData.lampAt = { x: 0.7, z: top + 0.5 }; g.userData.fireY = 0.7; g.userData.r = rad;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; };
    return g;
  },
  // a stilt-hut frame lying on the sand: its posts fallen, the floor frame askew, a wall panel of planks, boards strewn
  stiltFrame(o) { const B = soloBatch(); stiltFrameParts({ x: 0, z: 0, r: 0, seed: o.seed }, B); return B.mesh(); },
  // the rope through the ice: o.foot, the rope's foot on the Drained Sea's floor (it hangs down out of the vault, its end
  // coiled); else at the hole above (the Light's Skerry): the winch post over the hole, the rope down into it, the hole's oil
  // fire beside it (setFire(b))
  ropeWinch(o) {
    const g = new THREE.Group();
    if (o.foot) {
      const parts = [{ geo: G.cyl(0.045, 0.045, 18, 5), color: 0x7a6a50, o: { y: 9.6, rz: 0.012 } }];
      for (let k = 0; k < 4; k++) parts.push({ geo: G.torus(0.38 - k * 0.04, 0.045, 4, 12), color: k % 2 ? 0x6a5a42 : 0x7a6a50, o: { x: 0.55, y: 0.05 + k * 0.08, rx: Math.PI / 2 } });
      parts.push({ geo: G.segTo(0.55, 0.0, 0, 0.045, 0.045, 4), color: 0x7a6a50, o: { y: 0.3 } });
      g.add(solid6(parts, MAT.wood6));
      g.userData.setFire = () => {};
      return g;
    }
    const wood = [];
    for (const s of [-1, 1]) { wood.push({ geo: G.segTo(s * 0.35, 1.3, 0, 0.08, 0.07, 5), color: WOODW, o: { x: s * 0.95, z: -0.3 } }, { geo: G.segTo(-s * 0.35, 1.3, 0, 0.08, 0.07, 5), color: WOODW, o: { x: s * 0.25, z: -0.3 } }); }
    wood.push({ geo: G.cyl(0.18, 0.18, 1.5, 10), color: WOODD, o: { y: 1.28, z: -0.3, rz: Math.PI / 2 } }, { geo: G.box(0.06, 0.06, 0.5), color: IRON, o: { x: 0.85, y: 1.28, z: -0.05 } }, { geo: G.box(0.06, 0.4, 0.06), color: IRON, o: { x: 0.85, y: 1.1, z: 0.18 } });
    for (let k = 0; k < 5; k++) wood.push({ geo: G.torus(0.2, 0.03, 4, 10), color: 0x7a6a50, o: { x: -0.4 + k * 0.18, y: 1.28, z: -0.3, ry: Math.PI / 2 } });
    wood.push({ geo: G.cyl(0.04, 0.04, 4.4, 5), color: 0x7a6a50, o: { y: -0.9, z: 0.0 } }, { geo: G.segTo(0, 1.32, -0.3, 0.04, 0.04, 4), color: 0x7a6a50, o: { y: -0.04, z: 0.0 } });
    g.add(solid6(wood, MAT.wood6));
    // (the hole: a ragged black disc in the ice with a pale lip)
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.75, 14).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ color: 0x020305 }))); hole.position.y = 0.03; hole.renderOrder = 1.5; g.add(hole);
    g.add(solid6(stoneRing(1011, 8, 0.82, 0.16, 0x9aa6b0, 0.4), MAT.stone6));
    const pot = new THREE.Group(); pot.position.set(1.5, 0, 0.6); g.add(pot);
    pot.add(solid6([{ geo: G.lathe([[0.1, 0], [0.26, 0.04], [0.3, 0.2], [0.24, 0.32], [0.2, 0.3]], 10), color: 0x2a2420 }], MAT.iron6));
    const fire = fire6(0.7); fire.group.position.y = 0.3; pot.add(fire.group);
    g.userData.fireAt = { x: 1.5, y: 0.6, z: 0.6 };
    g.userData.setFire = (b) => { fire.set(b); g.userData.fire = !!b; };
    return g;
  },
  // the Gate ring on the Hearth's south rim: a black stone ring of r 2.6 standing on its base, runes cut round its faces and a
  // rune disc turning in it (the Shadow Gate exit's), dark until her fire; setWarm(k) 0..1: the runes and the disc warm,
  // ember motes rising off its stone (fx 'emberMotes', half as many on quality 0)
  gateRing() {
    const g = new THREE.Group(), R0 = 2.6, cy = R0 + 0.42;
    g.add(solid6([{ geo: jitter(G.torus(R0, 0.42, 8, 36), 0.04, 1021), color: BLACKST, o: { y: cy } }, { geo: jitter(G.box(1.6, 0.55, 1.2), 0.05, 1022), color: DARKST, o: { y: 0.25 } }, { geo: jitter(G.box(0.7, 0.5, 0.9), 0.05, 1023), color: BLACKST, o: { x: -1.2, y: 0.22 } }, { geo: jitter(G.box(0.7, 0.45, 0.9), 0.05, 1024), color: BLACKST, o: { x: 1.2, y: 0.2 } }], MAT.stone6));
    const rm = own(new THREE.MeshBasicMaterial({ map: runeLines(1025, 1), color: 0x3a3050, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const rg = new THREE.PlaneGeometry(0.62, 0.62);
    for (let k = 0; k < 14; k++) for (const side of [1, -1]) { const a = (k / 14) * Math.PI * 2, m = new THREE.Mesh(rg, rm); m.position.set(Math.sin(a) * R0, cy + Math.cos(a) * R0, side * 0.43); m.rotation.set(0, side > 0 ? 0 : Math.PI, -a); m.renderOrder = 2; g.add(m); }
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(R0 * 1.75, R0 * 1.75), own(new THREE.MeshBasicMaterial({ map: tex('rune'), color: 0xffa050, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
    disc.position.y = cy; disc.renderOrder = 2.2; g.add(disc);
    const glow = sprite6(0xff9a40, R0 * 3.2, { opacity: 0 }); glow.position.y = cy; g.add(glow);
    disc.onBeforeRender = () => { disc.rotation.z = R.time * 0.25; };
    let k = 0;
    const COLD = new THREE.Color(0x3a3050), WARM = new THREE.Color(0xffa050), e = { type: 'emberMotes', s: 1, r: R0 }, p = new THREE.Vector3();
    TICKS.add({ obj: g, tick(dt) { if (k <= 0.05) return; g.updateWorldMatrix(true, false); const m = g.matrixWorld.elements; p.set(0, cy, 0).applyMatrix4(g.matrixWorld); e.x = p.x; e.y = p.y; e.z = p.z; e.rot = Math.atan2(-m[2], m[0]); emitAt(e, dt * Math.min(1, k)); } });
    g.userData.setWarm = (v = 1) => { k = clamp(v, 0, 1.5); rm.color.copy(COLD).lerp(WARM, Math.min(1, k)); disc.material.opacity = 0.6 * Math.min(1, k); disc.visible = k > 0.01; glow.material.opacity = 0.35 * Math.min(1, k); glow.visible = k > 0.01; g.userData.warm = k; };
    g.userData.setWarm(0);
    g.userData.cy = cy;
    return g;
  },
  // the Ketos's neck lying across the drained Mere from its core to the south shore as an arch (centred; along local z,
  // o.len 14), its skull on the shore end (+z): passable under its middle third to the eye only
  neckArch(o) {
    const len = o.len ?? 14, parts = [], n = R.quality >= 1 ? 22 : 14, rr = RNG(1031);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, z = -len / 2 + t * len, y = -0.7 + 4.4 * Math.sin(Math.PI * Math.min(1, t * 1.05)), w = lerp(0.62, 0.34, t), up = Math.cos(Math.PI * t) * 0.6;
      // (old bone, wet and dark, the weed black-green on its underside)
      parts.push({ geo: jitter(G.dodeca(w), w * 0.12, 1032 + i), color: i % 2 ? BONE : 0x58534a, o: { y, z, sx: 1.0, sy: 0.85, sz: 0.8, rx: -up }, top: 1.1 });
      parts.push({ geo: G.cone(w * 0.28, w * 1.3, 4), color: 0x4c4840, o: { y: y + w * 0.95, z, rx: -up } });
      for (const s of [-1, 1]) parts.push({ geo: G.segTo(s * w * 1.1, -w * 0.35, 0, w * 0.18, w * 0.08, 4), color: 0x2c3024, o: { x: s * w * 0.4, y, z } });
      if (y < 0.4) parts.push({ geo: jitter(G.dodeca(w * 0.7), 0.05, 1060 + i), color: 0x1c2018, o: { x: rr.range(-0.3, 0.3), y: -0.1, z, sy: 0.4 } });
    }
    // the skull: a long low head, its jaw half open on the sand, teeth in rows
    const hz = len / 2 + 1.2;
    parts.push({ geo: jitter(G.cyl(0.42, 0.68, 2.8, 7, 3), 0.08, 1071), color: BONE, o: { y: 0.55, z: hz, rx: Math.PI / 2 + 0.12, sx: 1.1, sz: 0.62 } }, { geo: jitter(G.cyl(0.32, 0.55, 2.5, 6, 2), 0.06, 1072), color: 0x56514a, o: { y: 0.14, z: hz + 0.15, rx: Math.PI / 2 - 0.08, sx: 1.0, sz: 0.4 } });
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) parts.push({ geo: G.cone(0.06, 0.32, 4), color: 0xa8a090, o: { x: s * 0.42, y: 0.32, z: hz + 1.1 - k * 0.28, rx: Math.PI } });
    for (const s of [-1, 1]) parts.push({ geo: G.ball(0.2, 6, 4), color: 0x0c0c0c, o: { x: s * 0.5, y: 0.75, z: hz - 0.3 } });
    return solid6(parts, MAT.bone6);
  },
  // a hearthstone of the Hearth: a standing stone, a fire bowl cut in its top; setLit(b), fireY
  hearthStone() {
    const g = new THREE.Group();
    g.add(solid6([{ geo: jitter(G.cyl(0.42, 0.55, 1.15, 7, 2), 0.06, 1081), color: DARKST, o: { y: 0.57 } }, { geo: G.torus(0.34, 0.08, 4, 10), color: BLACKST, o: { y: 1.16, rx: Math.PI / 2 } }, ...stoneRing(1082, 4, 0.62, 0.18, BLACKST)], MAT.stone6));
    const fire = fire6(0.8); fire.group.position.y = 1.18; g.add(fire.group);
    g.userData.fireY = 1.4;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; };
    g.userData.flash = (k) => fire.k(k);
    return g;
  },
  // a named niche in the Hearth's rim (o.id): a stone set in the rim, a lamp in its niche, the name cut under it in the
  // Name-stones' style (dark in the stone; lit, glowing from inside the strokes); local +z its face; setLit(b)
  nameLamp(o) {
    const g = new THREE.Group(), seed = (o.id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    g.add(solid6([{ geo: jitter(G.box(1.2, 1.5, 0.6, 2, 2, 1), 0.04, 1090 + seed), color: DARKST, o: { y: 0.75 } }, { geo: G.box(0.6, 0.62, 0.3), color: 0x0c0c0e, o: { y: 1.02, z: 0.2 } }, { geo: G.box(0.7, 0.08, 0.36), color: BLACKST, o: { y: 0.7, z: 0.2 } }], MAT.stone6));
    const map = runeLines(seed, 1), geo = new THREE.PlaneGeometry(0.9, 0.3);
    const cut = new THREE.Mesh(geo, own(new THREE.MeshBasicMaterial({ map, color: 0x0e0c0a, transparent: true, opacity: 0.62, depthWrite: false })));
    const glow = new THREE.Mesh(geo, own(new THREE.MeshBasicMaterial({ map, color: 0xffc070, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    for (const m of [cut, glow]) { m.position.set(0, 0.42, 0.31); m.renderOrder = 2; g.add(m); }
    const lamp = new THREE.Group(); g.add(lamp);
    lamp.add(solid6([{ geo: G.lathe([[0, 0], [0.12, 0.02], [0.14, 0.07], [0.1, 0.09], [0.02, 0.08]], 8), color: 0x5a4a3a }], MAT.iron6)); lamp.position.set(0, 0.76, 0.22);
    const fl = flame6(0.45); fl.position.set(0, 0.84, 0.22); g.add(fl);
    const ha = sprite6(0xffc070, 1.4, { opacity: 0.55 }); ha.position.set(0, 0.95, 0.3); g.add(ha);
    g.userData.setLit = (b) => { glow.visible = fl.visible = ha.visible = !!b; cut.material.opacity = b ? 0.35 : 0.62; g.userData.lit = !!b; };
    g.userData.fireY = 0.9;
    g.userData.setLit(false);
    return g;
  },
  // a wreck lantern: the rime oilLamp hung from the crosstree of a mast stump (the code lantern without the scan); o.keyx:
  // the carved gunwale of Keyx's boat lying at its foot; setLit(b), fireY
  wreckLantern(o) {
    const g = new THREE.Group();
    g.add(solid6([{ geo: jitter(G.cyl(0.13, 0.17, 2.7, 7, 2), 0.02, 1101), color: WOODW, o: { y: 1.3, rz: 0.06 } }, { geo: G.box(1.0, 0.1, 0.1), color: WOODD, o: { x: 0.32, y: 2.42, rz: 0.06 } }, { geo: G.cyl(0.012, 0.012, 0.3, 3), color: IRON, o: { x: 0.72, y: 2.22 } }, ...stoneRing(1102, 4, 0.3, 0.2, DARKST)], MAT.wood6));
    const lampParts = rime('oilLamp'), at = { x: 0.72, y: 1.86, z: 0 };
    let set;
    if (lampParts) {
      const f = fit6(lampParts, 0.5, 'h'), m = meshOf(lampParts, f.k); m.position.set(at.x, at.y - 0.25 - f.y0, at.z); g.add(m);
      const fl = flame6(0.42); fl.position.set(at.x, at.y - 0.06, at.z); g.add(fl);
      const ha = sprite6(0xffb060, 2.4, { opacity: 0.6 }); ha.position.set(at.x, at.y, at.z); g.add(ha);
      set = (b) => { fl.visible = ha.visible = !!b; };
    } else set = lampLight(g, { x: at.x, y: at.y - 0.25, z: at.z });
    if (o.keyx) {
      // (the gunwale's carving: a strip of plank, its boat's mark cut in it, pale where the knife went)
      g.add(solid6([{ geo: G.box(2.2, 0.16, 0.12), color: WOODW, o: { x: -0.4, y: 0.1, z: 0.7, ry: 0.3, rz: 0.08 } }], MAT.wood6));
      const mk = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.13), own(new THREE.MeshBasicMaterial({ map: runeLines(1103, 1), color: 0xc8b8a0, transparent: true, opacity: 0.75, depthWrite: false })));
      mk.position.set(-0.4, 0.12, 0.77); mk.rotation.y = 0.3; mk.renderOrder = 2; g.add(mk);
    }
    g.userData.fireY = at.y; g.userData.flameAt = at;
    g.userData.setLit = (b) => { set(b); g.userData.lit = !!b; };
    g.userData.setLit(false);
    return g;
  },
  // a ship's bell hung from a broken spar: a lathe bell in bronze gone green, the mouth dark; ring(k) swings it
  shipBell() {
    const g = new THREE.Group();
    g.add(solid6([{ geo: G.cyl(0.1, 0.13, 2.4, 6), color: WOODW, o: { y: 1.2 } }, { geo: G.box(0.12, 0.12, 1.0), color: WOODD, o: { y: 2.3, z: 0.38 } }, { geo: G.segTo(0, 0.45, 0.42, 0.045, 0.04, 4), color: WOODD, o: { y: 1.82 } }, ...stoneRing(1111, 4, 0.28, 0.18, DARKST)], MAT.wood6));
    const pivot = new THREE.Group(); pivot.position.set(0, 2.24, 0.78); g.add(pivot);
    const lp = [[0, 0.02], [0.21, 0.0], [0.225, 0.03], [0.21, 0.08], [0.18, 0.17], [0.155, 0.28], [0.14, 0.36], [0.115, 0.415], [0.06, 0.44], [0, 0.445]].map(([a, b]) => [a * 1.5, (b - 0.44) * 1.5]);
    const bell = new THREE.Mesh(bake([{ geo: G.lathe(lp, R.quality >= 1 ? 20 : 12), color: 0x34402f }, { geo: G.cone(0.3, 0.42, 14), color: 0x080808, o: { y: -0.45 } }, { geo: G.ball(0.06, 6, 4), color: IRON, o: { y: -0.6 } }]), MAT.bronze6);
    bell.castShadow = true; pivot.add(bell);
    let t0 = -99, amp = 0;
    bell.onBeforeRender = () => { const t = R.time - t0; pivot.rotation.x = amp * Math.exp(-t * 1.1) * Math.sin(t * 6.5); };
    g.userData.ring = (k = 1) => { t0 = R.time; amp = 0.45 * clamp(k, 0, 1.5); };
    g.userData.bellAt = { x: 0, y: 1.9, z: 0.78 };
    return g;
  },
  // a lure post: a dead lamp on a post (the Falselight's bait within 4 m: its light is combat's, a false pool)
  lurePost() { return new THREE.Mesh(instDef6('c6:lurePost', mats()).parts[0].geo, MAT.wood6); },
  // a garland hung on the glade's trees: small rings of dried flowers (tori of 24 triangles, instanced) on a sagging cord,
  // o.len long along local x
  garland(o) {
    const len = o.len ?? 1.8, n = Math.max(6, Math.round(len * 5)), g = new THREE.Group(), rr = RNG(Math.round(len * 100) + (o.seed || 0));
    const sag = (u) => -Math.sin(u * Math.PI) * len * 0.18;
    const geo = new THREE.TorusGeometry(0.075, 0.03, 3, 4), mat = own(new THREE.MeshLambertMaterial({ color: 0xffffff }));
    const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), c = new THREE.Color();
    const TINTS = [0x8a5a50, 0x9a7a52, 0x7a5a62, 0xa08a6a, 0x6a5a48];
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; m4.copy(TRS(-len / 2 + u * len, sag(u) + rr.range(-0.02, 0.02), rr.range(-0.03, 0.03), rr.range(0, 6.28), rr.range(-0.6, 0.6), rr.range(0.8, 1.25), rr.range(0, 1.4))); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(TINTS[i % TINTS.length]).multiplyScalar(rr.range(0.75, 1.05))); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    g.add(im);
    const cord = []; for (let j = 0; j < 6; j++) { const u0 = j / 6, u1 = (j + 1) / 6; cord.push({ geo: G.segTo(len / 6, sag(u1) - sag(u0), 0, 0.008, 0.008, 3), color: 0x4a3a2a, o: { x: -len / 2 + u0 * len, y: sag(u0) } }); }
    g.add(solid6(cord, MAT.wood6));
    return g;
  },
  // the ember's pane: a pane of clear ice in the crypt's leaf room, the tyrant's ember held in it (0xff5a2a, pulsing slowly);
  // setGlow(k), 0 out; local +z its face
  emberPane() {
    const g = new THREE.Group();
    const pane = new THREE.Mesh(jitter(G.box(1.7, 2.3, 0.22, 2, 2, 1), 0.03, 1121), own(new THREE.MeshLambertMaterial({ color: 0x5a7886, transparent: true, opacity: 0.38, depthWrite: false, emissive: 0x060c10 })));
    pane.position.y = 1.15; pane.renderOrder = 1.7; g.add(pane);
    const frame = solid6([{ geo: jitter(G.box(2.1, 0.3, 0.5), 0.05, 1122), color: DARKST, o: { y: 0.15 } }, { geo: jitter(G.box(2.1, 0.25, 0.5), 0.05, 1123), color: DARKST, o: { y: 2.4 } }], MAT.stone6); g.add(frame);
    // (the ember a coal's size, its haze a hand wider than the pane: smaller, from the play camera it was a pale slab of ice
    // with nothing in it)
    const core = sprite6(0xffd0a0, 0.3, { opacity: 0.95, order: 1.8 }), ember = sprite6(0xff5a2a, 1.0, { opacity: 0.9, order: 1.8 }), haze = sprite6(0xff5a2a, 3.0, { opacity: 0.26, order: 1.8 });
    for (const sp of [core, ember, haze]) { sp.position.set(0.1, 1.25, 0.0); g.add(sp); }
    let k = 1;
    ember.onBeforeRender = () => { const p = 0.82 + 0.18 * Math.sin(R.time * 0.9); ember.scale.setScalar(1.0 * p * Math.max(k, 0.01)); ember.material.opacity = 0.9 * Math.min(1, k); haze.material.opacity = 0.26 * p * Math.min(1, k); core.material.opacity = 0.95 * Math.min(1, k); };
    g.userData.setGlow = (v = 1) => { k = Math.max(0, v); core.visible = ember.visible = haze.visible = k > 0.001; g.userData.glow = k; };
    g.userData.emberAt = { x: 0.1, y: 1.25, z: 0 };
    return g;
  },
  // Keyx's lantern: a hand lantern, its flame trembling as true light does; setLit(b)
  keyxLantern() {
    const g = new THREE.Group(), set = lampLight(g, { x: 0, y: 0, z: 0 }, 0.9, 0xffc070);
    g.add(solid6([{ geo: G.torus(0.09, 0.012, 3, 8, Math.PI), color: IRON, o: { y: 0.42 } }], MAT.iron6));
    g.userData.setLit = (b) => { set(b); g.userData.lit = !!b; };
    g.userData.setLit(true);
    return g;
  },
  // the blue bird: twelve triangles (a body of four, two wings of four), its wings beating; fly(path, dur, done) along a
  // spline through path's points ({x, y, z}), facing its way
  bird() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const tri = (pts) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3)); geo.computeVertexNormals(); return geo; };
    const mat = own(new THREE.MeshLambertMaterial({ color: 0x3a78c8, side: THREE.DoubleSide, emissive: 0x0a1830 }));
    body.add(new THREE.Mesh(tri([[0, 0.03, 0.14], [-0.04, 0, -0.06], [0.04, 0, -0.06], [0, 0.03, 0.14], [0.04, 0, -0.06], [0, -0.03, -0.02], [0, 0.03, 0.14], [0, -0.03, -0.02], [-0.04, 0, -0.06], [-0.04, 0, -0.06], [0, -0.01, -0.16], [0.04, 0, -0.06]]), mat));
    const wings = [];
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(s * 0.03, 0.01, 0.02); body.add(w); wings.push(w);
      w.add(new THREE.Mesh(tri([[0, 0, 0.05], [s * 0.12, 0, 0.03], [0, 0, -0.04], [s * 0.12, 0, 0.03], [s * 0.2, 0, -0.02], [0, 0, -0.04], [s * 0.2, 0, -0.02], [s * 0.1, 0, -0.07], [0, 0, -0.04], [s * 0.1, 0, -0.07], [s * 0.04, 0, -0.08], [0, 0, -0.04]]), mat));
    }
    body.scale.setScalar(1.6);
    body.onBeforeRender = () => { const a = Math.sin(R.time * 14) * 0.7; wings[0].rotation.z = a; wings[1].rotation.z = -a; };
    g.userData.fly = (path, dur = 4, done) => {
      if (!path?.length) return;
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(p.x, p.y ?? 2, p.z))), v = new THREE.Vector3(), d = new THREE.Vector3();
      g.visible = true;
      tween(g, dur, (k) => { curve.getPointAt(k, v); g.position.copy(v); curve.getTangentAt(Math.min(k, 0.999), d); g.rotation.y = Math.atan2(d.x, d.z); }, done);
    };
    return g;
  }
};
// the parts of a stilt-hut frame lying on the sand (p: x, z, r; seed), into a batch
function stiltFrameParts(p, B) {
  const rr = RNG(p.seed ?? Math.round(p.x * 7 + p.z * 13)), parts = [];
  // (the floor frame, its rails askew; the posts fallen out round it; a wall panel flat on the sand; the roof's boards)
  for (const s of [-1, 1]) parts.push({ geo: G.box(3.0, 0.16, 0.16), color: WOODD, o: { z: s * 1.3, y: 0.1, ry: rr.range(-0.12, 0.12), rz: rr.range(-0.05, 0.05) } }, { geo: G.box(0.16, 0.16, 2.8), color: WOODD, o: { x: s * 1.4, y: 0.12, ry: rr.range(-0.1, 0.1) } });
  for (let k = 0; k < 5; k++) { const a = rr.range(0, 6.28), d = rr.range(1.6, 2.6); parts.push({ geo: G.cyl(0.08, 0.1, 1.6, 5), color: WOODW, o: { x: Math.sin(a) * d, y: 0.09, z: Math.cos(a) * d, rz: Math.PI / 2, ry: a + rr.range(-0.5, 0.5) } }); }
  for (let k = 0; k < 7; k++) parts.push({ geo: G.box(0.32, 0.05, 2.1), color: k % 2 ? WOODW : 0x5a5650, o: { x: -0.95 + k * 0.32, y: 0.2, z: 0.1, ry: rr.range(-0.06, 0.06), rx: rr.range(-0.04, 0.04) }, jit: 0.15 });
  for (let k = 0; k < 6; k++) { const a = rr.range(0, 6.28), d = rr.range(1.8, 3.4); parts.push({ geo: G.box(0.3, 0.05, rr.range(1.2, 2.2)), color: 0x4a4640, o: { x: Math.sin(a) * d, y: 0.04, z: Math.cos(a) * d, ry: rr.range(0, 6.28) }, jit: 0.15 }); }
  parts.push({ geo: G.box(2.6, 1.6, 0.1), color: WOODW, o: { x: 2.4, y: 0.06, z: -1.6, rx: -Math.PI / 2, ry: 0.4 }, jit: 0.12 });
  B.add('wood6', parts, p.x, p.z, p.r || 0);
}
// a batch for one prop (act6Prop's frames): add() as Batch does, mesh() a group of its materials' meshes
function soloBatch() {
  const by = {};
  return {
    add(mat, parts, x, z, ry = 0) { (by[mat] ||= []).push(...parts.map((p) => ({ ...p, o: { ...p.o, x: (p.o?.x || 0) + x, z: (p.o?.z || 0) + z, ry: (p.o?.ry || 0) + ry } }))); },
    mesh() { const g = new THREE.Group(); for (const k in by) g.add(solid6(by[k], MAT[k] || MAT.lam)); return g; }
  };
}
// Act VI's story props (the contract's kinds): a THREE.Object3D with userData.kind and the kind's switches; any kind not
// known is an empty group. 'brazier' is 'brazier6' (the design's name for it)
export function act6Prop(kind, o = {}) {
  mats(); mats6();
  const f = PROP6[kind] || (kind === 'brazier' ? PROP6.brazier6 : null), g = f ? f(o) : new THREE.Group();
  g.userData.kind = kind;
  return g;
}

// ---------- act6Level: the layout's dressing ----------
// L.props kinds placed here (the rest are a boot set's, placed by build.js addProp in the drowned grade): the rime pack's
// scans (want: its size, by: which side, y: its base), code where the scan is missing
const RIME6 = { wreck: [13.5, 'l', -0.25], keelboat: [8.6, 'l', -0.12], rowboat: [4.6, 'l', -0.1], brokenBoat: [7, 'l', -0.12], shack: [4.3, 'l', 0], anchor: [2.2, 'l', -0.3], sunkenAnchor: [2.2, 'l', -0.5],
  whale: [15, 'l', -0.1], kelp: [1.6, 'w', -0.04], barnacleRock: [1.2, 'w', -0.1], driftwood: [2.2, 'l', -0.08], cask: [0.9, 'h', -0.03], crate: [0.75, 'h', -0.03], oilLamp: [0.5, 'h', 0] };
// (in the Drained Sea's wet grade, 'silt:': as packed, its hulls, shacks, crates and bones stood bone-white and dry on the
// dark sea floor; the wreck and the rowboat carry Act V's wet wood already)
function rime6(I, B, out, name, p) {
  const [want, by, y] = RIME6[name], parts = rime(name), s = p.s || 1, pre = name === 'wreck' || name === 'rowboat' ? 'rime:' : 'silt:rime:';
  if (parts) {
    const f = fit6(parts, want * s, by);
    // (laid flat, the kelp: a mat of strands, not a heap)
    if (name === 'kelp') { I.add(pre + 'kelp', p.x, p.z, p.r || 0, f.k * 1.3, y - f.y0 * 0.28, f.k * 0.28, f.k * 1.3); return; }
    // (a shack lying on its side, gen6's side: turned over onto its long wall)
    const tilt = p.side ? 1.45 : p.tilt || 0, lift = p.side ? (f.sz.x * f.k) / 2 * 0.85 : 0;
    I.add(pre + name, p.x, p.z, p.r || 0, f.k, (p.y ?? y) - (p.side ? f.y0 * 0 : f.y0) + lift, f.k, f.k, tilt);
    return;
  }
  // (no scan: the hulls the Act V code boat, the rest left out: dressing only)
  if (name === 'wreck' || name === 'keelboat' || name === 'rowboat' || name === 'brokenBoat') {
    const b = act5Prop('boat'); b.position.set(p.x, -0.1, p.z); b.rotation.y = p.r || 0; b.scale.setScalar(want / 5.2 * s); b.rotation.z = p.tilt || 0; out.group.add(b);
  }
}
const PLACE6 = {
  // Tamarisk's braziers and Glaukos's fire-pots: true light burning from the build (their light is the layout's, L.lights)
  brazier(p, I, B, out) { const m = act6Prop('brazier6', { pot: p.pot }); m.position.set(p.x, 0, p.z); m.rotation.y = p.r || 0; m.userData.setLit(p.lit !== false); out.group.add(m); out.act6.braziers.push(m); },
  pot(p, I, B, out) { PLACE6.brazier({ ...p, pot: true }, I, B, out); },
  // a fire-pit (the Saltborn's at the Well's Foot): lit while the layout lights it (a light within a metre or so)
  firepit(p, I, B, out, L) { const m = act6Prop('hearth6'); m.position.set(p.x, 0, p.z); m.userData.setLit(p.lit ?? (L.lights || []).some((l) => Math.hypot(l.x - p.x, l.z - p.z) < 1.5)); out.group.add(m); out.act6.fires.push(m); },
  // (gen6: p.s its radius, p.hgt how far up it shows, p.asger the sleeper's keel with its clear face; p.r its turn)
  // (Asger's clear face toward the road: L.spots.asger.rot)
  keel(p, I, B, out, L) {
    keel6(I, { x: p.x, z: p.z, r: p.s ?? 1.6, rot: p.r, h: p.hgt != null ? p.hgt + 1 : undefined }, out);
    if (p.asger) { const m = keelWindow(p.s ?? 2); m.position.set(p.x, 0, p.z); m.rotation.y = L?.spots?.asger?.rot ?? p.r ?? 0; out.group.add(m); out.act6.asger = m; }
  },
  // the village's houses (bottom: tilt and sink, in radians and metres), drowned; the stamped windows' 'bld' too
  bld(p, I) { house6(I, { x: p.x, z: p.z, rot: p.r, tilt: p.tilt ?? 0, sink: p.sink ?? 0, m: p.m, kit: p.kit, s: p.s }); },
  // the village square's well, sunk and leaning (the base set's, drowned; the code one standing in without it)
  well(p, I, B, out, L) { if (ENV.props.sWell) I.add('drowned:env:sWell', p.x, p.z, p.r || 0, 1, p.sunk ? -0.45 : 0, 1, 1, p.sunk ? 0.09 : 0); else addProp(drowned(I, B).B, drowned(I, B).I, p, L, RNG(1), out); },
  stiltFrame(p, I, B) { stiltFrameParts(p, B); },
  lurePost(p, I) { I.add('c6:lurePost', p.x, p.z, p.r || 0, 1, 0); },
  garland(p, I, B, out) { const m = act6Prop('garland', { len: p.len, seed: Math.round(p.x * 7) }); m.position.set(p.x, p.y ?? 2, p.z); m.rotation.y = p.r || 0; out.group.add(m); },
  // a toppled tower as dressing (not a Lost Light: those are the story's, act6Prop)
  toppled(p, I, B, out) { const m = act6Prop('toppledLight', { v: p.v }); m.position.set(p.x, 0, p.z); m.rotation.y = p.r || 0; out.group.add(m); },
  // icicles under the vault's lip (p.y the lip, 5 m when not given)
  icicle(p, I) { const parts = rime('icicle'), y = p.y ?? 5; if (parts) { const f = fit6(parts, 1.4 * (p.s || 1), 'h'); I.add('icy:rime/icicle', p.x, p.z, p.r || 0, f.k, y - f.y0 - f.sz.y * f.k); } else I.add('icy:#icicles', p.x, p.z, p.r || 0, p.s || 1, y); },
  // a rock face standing against the vault's wall (a one-sided scan facing its +z) in the vault's stone
  rockFace(p, I) { const nm = rime('rockFace') ? 'rockFace' : rime('coastCliff') ? 'coastCliff' : null; if (!nm) return; const f = fit6(rime(nm), 5 * (p.s || 1), 'w'); I.add('c6:stone/' + nm, p.x, p.z, p.r || 0, f.k, (p.y ?? -0.3) - f.y0); },
  fx(p, I, B, out) { out.emitters.push({ x: p.x, y: p.y ?? 0.5, z: p.z, type: p.fx, s: p.s || 1, color: p.color, color1: p.color1 }); }
};
for (const k in RIME6) PLACE6[k] = (p, I, B, out) => rime6(I, B, out, k, p);
for (const k of ['towerA', 'towerB', 'towerC']) PLACE6[k] = (p, I, B, out) => PLACE6.toppled({ ...p, v: ['towerA', 'towerB', 'towerC'].indexOf(k) }, I, B, out);
PLACE6.coastCliff = PLACE6.rockFace;
// the keels of one rock scan as instanced meshes in the 'icy:' material (instDef5's, graded for the dark: keelMat): each
// stretched tall (o.h, 16 m: from under the floor up past the vault) and hung upside down, as a keel hangs from the ice
// (what faced the sky faces the floor, so no snow lies on it), its pale faces darkened by an instance colour
const KEEL_C = new THREE.Color(0.32, 0.37, 0.42);
// (the ice's own material graded for the dark below: its sky rim a third as strong (that sky is the vault's dark), and
// fading upward into the dark it hangs from, so a keel never ends on a top the play camera sees. No snow: hung upside
// down, its old undersides face up, and the ice's snow on every upward face laid a white crust over each keel that the
// play camera saw as white models)
const KEELM = new Map();
function keelMat(src) {
  if (KEELM.has(src)) return KEELM.get(src);
  const m = src.clone(), prev = src.onBeforeCompile, key = src.customProgramCacheKey?.() || src.type;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(src, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('totalEmissiveRadiance += icyEm;', 'totalEmissiveRadiance += icyEm * 0.2 * (1.0 - smoothstep(2.5, 9.0, vYW.y));')
      .replace('ysn *= smoothstep(0.0, 0.3, vYW.y);', 'ysn = 0.0;')
      .replace('diffuseColor.rgb *= ycol;', 'diffuseColor.rgb *= ycol * mix(1.0, 0.18, smoothstep(2.5, 9.0, vYW.y));');
  };
  m.customProgramCacheKey = () => key + '|keel6';
  KEELM.set(src, m);
  return m;
}
function keelMeshes(name, list) {
  const def = instDef5('icy:' + name, mats(), R.quality), sz = size4(ENV.props[name]); if (!def || !sz) return [];
  return def.parts.map((p) => {
    const im = new THREE.InstancedMesh(p.geo, keelMat(p.material), list.length);
    list.forEach((k, i) => {
      const kx = (2 * k.r) / Math.max(0.01, sz.x, sz.z), ky = (k.h ?? 16) / Math.max(0.01, sz.y);
      _e.set(0, k.rot || 0, Math.PI, 'YXZ'); _q.setFromEuler(_e);
      im.setMatrixAt(i, new THREE.Matrix4().compose(_p.set(k.x, -1 + (sz.y0 + sz.y) * ky, k.z), _q, _s.set(kx * (k.sx ?? 1), ky, kx)));
      im.setColorAt(i, KEEL_C);
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
    im.castShadow = def.shadow !== false && R.quality >= 1; im.receiveShadow = true;
    return im;
  });
}
// the clear face of a sleeper's keel (Asger's): a pane of clear ice toward local +z, the figure behind it the story's
function keelWindow(r) {
  const g = new THREE.Group(), pane = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.1, 2.1), own(new THREE.MeshLambertMaterial({ color: 0x5a7886, transparent: true, opacity: 0.34, depthWrite: false, emissive: 0x060c10 })));
  pane.position.set(0, 1.25, r * 0.9); pane.renderOrder = 1.6; g.add(pane); g.userData.window = { x: 0, y: 1.25, z: r * 0.75 };
  return g;
}
// a keel of the layout: its body gathered for keelMeshes (act6Level draws them), a fallen slab or two at its foot (quality
// 1 and up)
function keel6(I, k, out) {
  const r = k.r ?? 1.6, name = rockAt(k.x, k.z); if (!name) return;
  const rot = k.rot ?? hash2(k.x, k.z) * 6.28;
  (out.keels6[name] ||= []).push({ x: k.x, z: k.z, rot, r, h: k.h, sx: 0.85 + hash2(k.z, k.x) * 0.3 });
  out.act6.keels++;
  if (R.quality < 1) return;
  for (let j = 0; j < 2; j++) { const a = rot + j * 2.6 + 1.1, d = r + 0.6 + hash2(k.x + j, k.z) * 0.8; I.add('c6:slab~ns', k.x + Math.sin(a) * d, k.z + Math.cos(a) * d, a, 0.7 + hash2(j, k.x) * 0.6, 0.02, 0.8, 0.9, 0.25); }
}
// a village house of the Forgotten Village (bottom: L.spots.houses), tilted and sunk, drowned: the village pack's house, or
// the KayKit one standing in
// (h: x, z, rot, tilt (radians, about its own z), sink (metres), m and kit (gen6's; else one by k))
const HOUSES6 = [['hLong', 'building_home_B_yellow'], ['hTall', 'building_home_A_red'], ['hManor', 'building_home_A_green'], ['hStilt', 'building_home_B_yellow']];
function house6(I, h, k = 0) {
  const m = h.m || HOUSES6[k % HOUSES6.length][0], kit = h.kit || HOUSES6[k % HOUSES6.length][1], tilt = h.tilt ?? 0.1, y = -(h.sink ?? 0.5), s = h.s || 1;
  if (ENV.props[m]) I.add('drowned:env:' + m, h.x, h.z, h.rot ?? h.r ?? 0, s, y, s, s, tilt);
  else if (KIT.town?.[kit]) I.add('drowned:kit:town/' + kit, h.x, h.z, h.rot ?? h.r ?? 0, KIT_SCALE.town * s, y, KIT_SCALE.town * s, KIT_SCALE.town * s, tilt);
}
// the Well's mouth at the drained Mere's centre (mode dry): a low ring of black stones round the dark of the shaft
function wellMouth(out, w) {
  const g = new THREE.Group(), r = w.r ?? 2;
  g.add(solid6([...stoneRing(1131, 14, r * 0.95, 0.42, BLACKST, 0.9), ...stoneRing(1132, 9, r * 0.8, 0.3, DARKST, 0.8)], MAT.stone6));
  const dark = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 18).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ color: 0x010102 }))); dark.position.y = 0.04; dark.renderOrder = 1.5; g.add(dark);
  g.position.set(w.x, 0, w.z); out.group.add(g);
  return g;
}

// the stamped wood's undergrowth, left out below: grass, bushes, webs and spiders' eggs do not outlast the sea (drowned, they
// stood as pale tufts all over the black floor); its trees stand bare, its logs, stumps, branches and bones stay
const DROP6 = new Set(['grass', 'bush', 'web', 'eggs', 'flowers']);
// the story's props at gen6's spots (L.spots), each built as it stands at first arrival in the layout's reading (L.mode):
// the hearths, the lost lights, the wreck lanterns and Asger's brazier cold; the lure posts dead; the black lamps burning;
// a shadow-wall over each band gen6 left shut (one opened before the build stands hidden); the ember glowing in its pane;
// Leif's fire dead; the Hearth's fire burning from the build, its stones and niches cold, the Gate ring dark ('lit': her
// fire flared, the stones lit, the ring warm); the Ketos's neck across the drained Mere ('dry'). Handed to the zone in
// out.act6 by gen6's keys, so world.js act6Zone fills z.act6 and lays the interacts on these (act6Presence lights them
// from the flags) and never builds a second one
function story6(L, out) {
  const S = L.spots || {}, A = out.act6, lit = L.mode === 'lit';
  const put = (kind, o, x, z, ry = 0) => { const m = act6Prop(kind, o); m.position.set(x, 0, z); m.rotation.y = ry; out.group.add(m); return m; };
  // (local +z toward q; local +x toward q)
  const face = (p, q) => Math.atan2(q.x - p.x, q.z - p.z), arm = (p, q) => Math.atan2(-(q.z - p.z), q.x - p.x);
  // ---- the Drained Sea ----
  for (const h of S.hearths || []) A.hearths.push({ k: h.k, x: h.x, z: h.z, mesh: put('hearth6', {}, h.x, h.z, hash2(h.x, h.z) * 6.28) });
  // (gen6's lost light: its body 7.2 m along rot about (x, z), its lantern end's interact at lamp)
  for (const l of S.lost || []) {
    const len = 7.2, bx = l.x - Math.sin(l.rot) * len / 2, bz = l.z - Math.cos(l.rot) * len / 2, lampZ = l.lamp ? Math.hypot(l.lamp.x - bx, l.lamp.z - bz) : len + 1.7;
    A.lost.push({ id: l.id, x: l.lamp?.x ?? l.x, z: l.lamp?.z ?? l.z, mesh: put('toppledLight', { kind: l.kind, len, lampZ }, bx, bz, l.rot) });
  }
  for (const p of S.lures || []) A.lures.push({ x: p.x, z: p.z, mesh: put('lurePost', {}, p.x, p.z, p.bait ? arm(p, p.bait) : 0) });
  const HP = S.heap || S.mere;
  for (const l of S.wreckLamps || []) A.wrecks.push({ i: l.i, x: l.x, z: l.z, mesh: put('wreckLantern', { keyx: l.keyx }, l.x, l.z, HP ? arm(l, HP) : 0) });
  for (const b of S.bells || []) A.bells.push({ i: b.i, x: b.x, z: b.z, mesh: put('shipBell', {}, b.x, b.z, HP ? face(b, HP) : 0) });
  if (S.asger?.brazier) A.asgerBrazier = put('brazier6', {}, S.asger.brazier.x, S.asger.brazier.z);
  if (L.type === 'drained' && L.mode === 'dry' && S.arch) A.neck = put('neckArch', { len: 14 }, S.arch.x, S.arch.z, S.arch.rot || 0);
  // ---- the Bottom ----
  for (const l of S.lamps || []) A.lamps.push({ k: l.k, x: l.x, z: l.z, mesh: put('blackLamp', {}, l.x, l.z, 0) });
  for (const wl of L.walls || []) {
    const m = act6Prop('shadowWall', { cells: wl.cells }), at = m.userData.at;
    m.position.set(at.x, 0, at.z); m.rotation.y = at.rot; out.group.add(m);
    // (a band the build left open: its lamp is out, or her fire burns)
    if (wl.cells.some(([x, z]) => L.cells[z * L.w + x])) { m.visible = false; m.userData.open = true; }
    A.walls.push({ k: wl.k, mesh: m });
  }
  if (S.ember?.pane) A.ember = put('emberPane', {}, S.ember.pane.x, S.ember.pane.z, S.ember.pane.rot || 0);
  if (S.leif?.fire) { A.leif = put('hearth6', {}, S.leif.fire.x, S.leif.fire.z, 0.7); A.leif.scale.setScalar(0.75); }
  // (the Well's foot: the rope down the shaft from the Drained Sea)
  if (L.type === 'bottom' && S.well) A.rope = put('ropeWinch', { foot: true }, S.well.x, S.well.z);
  const H = S.hearth;
  if (H) {
    // her stone and fire on the 2 x 2 at the centre, burning from the build (the shipped brazier fire, half again)
    A.centre = put('hearth6', {}, H.fire.x, H.fire.z, 0.4); A.centre.scale.setScalar(1.5); A.centre.userData.setLit(true); A.centre.userData.flash?.(lit ? 0.8 : 0);
    for (const st of H.stones || []) { const m = put('hearthStone', {}, st.x, st.z, face(st, H)); m.userData.setLit(lit); A.stones.push({ i: st.i, x: st.x, z: st.z, mesh: m }); }
    for (const n of H.niches || []) A.niches.push({ id: n.id, x: n.x, z: n.z, mesh: put('nameLamp', { id: n.id }, n.x, n.z, face(n, H)) });
    if (H.ring) { A.ring = put('gateRing', {}, H.ring.x, H.ring.z, H.ring.rot || 0); A.ring.userData.setWarm(lit ? 1 : 0); }
  }
}

// Dresses an Act VI layout (buildLevel): its props, the spots no one else places, the story's props at gen6's spots
// (story6), the First's marks, the vault for the cines, the drips and the forgotten's motes (out.emitters). The boot sets'
// props come out in the zone's grade: the Drained Sea's wet silt, the Bottom's drowned black-blue. Writes out.act6 for
// world.js (act6Zone) to find them: { braziers, fires, sky, keels (a count), rope, well, asger (the sleeper's pane), marks,
// vault; hearths, lost, lures, wrecks, bells, lamps, walls, stones, niches ([{ k | i | id, x, z, mesh }], gen6's keys),
// asgerBrazier, neck, ember, leif, centre (the Hearth's fire), ring }
export function act6Level(L, I, B, out) {
  mats(); mats6();
  const S = L.spots || {}, rng = RNG((L.seed || 1) * 13 + 6), boot = drowned(I, B, L.type === 'drained' ? 'silt' : 'drowned'), props = L.props || [], has = (t) => props.some((p) => p.t === t);
  out.act6 = { braziers: [], fires: [], sky: [], keels: 0, rope: null, well: null, asger: null, vault: null, hearths: [], lost: [], lures: [], wrecks: [], bells: [], lamps: [], walls: [], stones: [], niches: [], asgerBrazier: null, neck: null, ember: null, leif: null, centre: null, ring: null };
  out.keels6 = {};
  for (const p of props) {
    const f = PLACE6[p.t];
    if (f) f(p, I, B, out, L);
    else if (DROP6.has(p.t)) continue;
    // (a boot set's prop, the stamped crypt's and wood's: the shipped placement, drowned)
    else addProp(boot.B, boot.I, p, L, rng, out);
  }
  // the keels reaching down to the floor (L.keel's footprints, gen6), unless the props carry them
  if (!has('keel')) for (const k of S.keels || []) keel6(I, k, out);
  for (const name in out.keels6) for (const m of keelMeshes(name, out.keels6[name])) out.group.add(m);
  // the skylights' columns (their pools are light.js's, o.light false; systems dims them at the high water: dim(k))
  for (const s of S.sky || []) { const m = act6Prop('skylight', { r: s.r }); m.position.set(s.x, 0, s.z); out.group.add(m); out.act6.sky.push(m); }
  // the garland glade's garlands, hung round its rim between the trees (bottom)
  if (S.glade && !has('garland')) {
    const n = 8 + Math.floor(hash2(S.glade.x, S.glade.z) * 5);
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + hash2(k, S.glade.x) * 0.4, d = (S.glade.r ?? 5) - 0.4; PLACE6.garland({ x: S.glade.x + Math.sin(a) * d, z: S.glade.z + Math.cos(a) * d, y: 1.7 + hash2(S.glade.z, k) * 0.8, r: a + Math.PI / 2, len: 1.3 + hash2(k, S.glade.z) * 0.9 }, I, B, out); }
  }
  // the Forgotten Village's houses, tilted and sunk (bottom), when the props do not carry them ('bld')
  if (!has('bld')) (S.houses || []).forEach((h, k) => house6(I, h, k));
  // the Drained Sea once the Mere is dry: the Well's mouth at its centre
  if (L.mode === 'dry' && S.well && L.type === 'drained') out.act6.well = wellMouth(out, S.well);
  // the rope's foot at the Rope camp (drained), hanging down out of the vault
  if (L.type === 'drained' && S.rope) { const m = act6Prop('ropeWinch', { foot: true }); m.position.set(S.rope.x, 0, S.rope.z); out.group.add(m); out.act6.rope = m; }
  // the Mere's lure-rock (drained), in the water at its north side
  if (S.mere?.lure) { const n = rockAt(S.mere.lure.x, S.mere.lure.z), f = n && fit6(ENV.props[n], 1.8, 'w'); if (f) I.add('drowned:env:' + n, S.mere.lure.x, S.mere.lure.z, 0.6, f.k, -0.35 - f.y0, f.k * 0.8, f.k); }
  story6(L, out);
  // the First's marks along her trail, seen only in the hero's light (fx.js marksMesh: one draw)
  const mk = marksMesh(S.trail, (x, z) => groundY(L, x, z)); if (mk) { out.group.add(mk); out.act6.marks = mk; }
  // the vault's drips over each of its low patches (white, falling from it), and the forgotten's black motes rising round
  // the dark's lamps and the drowned village (the Bottom)
  for (const v of S.vaults || []) out.emitters.push({ type: 'drips', x: v.x, y: 6.5, z: v.z, s: clamp((v.r || 2) / 2, 0.6, 2.5) });
  for (const p of [...(S.lamps || []), ...(S.houses || [])]) out.emitters.push({ type: 'motes', dark: true, x: p.x, y: 0.1, z: p.z, s: 1.6 });
  // the vault over all of it, for the cines (sea.js: shown only while the camera looks low)
  out.act6.vault = vaultMesh(L); out.group.add(out.act6.vault);
}
