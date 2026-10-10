// Act V's props. act5Level dresses a layout from L.props (gen5.js lists the vocabulary: wrecks, boats, huts, racks, the
// jetty, the whale, the frozen fall and its icicles, rocks, kelp, driftwood, anchors, the bay's ribs, the Icebound Ship,
// bergs, ice blocks, marker poles, the skerry's rocks, the drowned lanterns): the rime pack's scan where it has one (always
// 'rime/<name>', packProp), else a code model. What repeats is instanced (Instancer types 'icy:' the shared ice material,
// 'cliff5:' the world-projected sea-cliff stone, 'rime:' a rime scan as packed, 'c5:' a code model); the rest is merged
// into the level's batches. act5Prop builds the props the story owns (sea-lights, the hearth, cairns, lamps, the Farthest
// Light, the door-stone, the ice windows, boats, the bell, casks, the Neck's rubble...), each with its userData switches.
// No lights of their own: the pools that light them are world.js's (light5) and light.js's.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, addLight, removeLight } from '../gfx/gfx.js';
import { emitAt } from '../gfx/fx.js';
import { ENV, packProp } from '../gfx/env.js';
import { tex, runeLines } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { RNG, clamp, fbm, lerp } from '../core/util.js';
import { BED_DRY, groundY } from './genlib.js';
import { SEA, SEA_U, SEA_LIT, SEA_GLSL, noiseTex, iceMat, beamMesh, swellY, TICKS } from './sea.js';
import { MAT, mats, worldMat, bake, jitter, prism, size4, own, glowMat, flameMesh, lanternMesh, lay4, hash2, act4Mats, act4Prop, occlude } from './build.js';

const rime = (name) => packProp('rime', name);
// relative colours (the world-projected materials multiply their layer by vertexColour / GREY; the code fallbacks show
// them as they are): GREY is the layer itself
const GREY = 0x6a6a6a, TAR = 0x2c2824, WOODG = 0x6a645c, WOODD = 0x4a443e, STONEL = 0x7a7874, STONED = 0x4e4c4a;
const IRON = 0x2a2a2c, BONE = 0x7a7468, KELP = 0x24261a, FISH = 0x8a8478;
const LIT5 = new THREE.Color(0xffc070), DEAD5 = new THREE.Color(0x15130f), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// a full transform: at (x, y, z), turned ry, tilted about its own z by tilt (and its x by pitch), scaled
const TRS = (x, y, z, ry = 0, tilt = 0, s = 1, pitch = 0) => { _e.set(pitch, ry, tilt, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(s, s, s)); };

// ---------- materials ----------
// planks5 (the jetty, huts, boats, wrecks: rime planks, else plain vertex colour), cliff5 (the sea-cliff stone with snow
// settling on top: rime seaCliff, else the deep's cliff, else the base set's wall), icy5 (the shared ice), lam for bone,
// kelp and the like, iron (Act IV's)
const M5 = { key: '' };
function mats5() {
  const M = act4Mats(), key = (ENV.packs.rime ? 'r' : '') + (ENV.packs.deep ? 'd' : '') + (ENV.ready ? 'e' : '') + R.quality;
  if (M5.key === key) return M;
  M5.key = key;
  const pl = lay4('rime/planks'), cl = lay4('rime/seaCliff', 'cliff', 'wall');
  MAT.planks5 = pl ? worldMat(pl, { scale: 1.7, vc: 0.144, rough: 0.85, frost: true }) : (MAT.planks5c ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: 0x6a6866 })));
  // (roofs: the grey planks with the snow lying on them where they face the sky, the boards showing at the eaves)
  MAT.roof5 = pl ? worldMat(pl, { scale: 1.3, vc: 0.144, rough: 0.85, snow: true, soft: true, frost: true }) : M.lam;
  MAT.cliff5 = cl ? worldMat(cl, { scale: 3.0, vc: 0.144, tri: true, rough: 0.9, snow: true, soft: true, tint: cl === 'rime/seaCliff' ? 0xd8dce0 : 0xb4b8bc }) : M.lam;
  MAT.icy5 = icyMat(); MAT.icyFall = icyMat(true);
  // (the drifts: the snow layer itself, projected from above)
  const sn = lay4('rime/snow', 'snow');
  MAT.snow5 = sn ? worldMat(sn, { scale: 3.2, vc: 0.144, rough: 0.6, tint: 0xd4dae4 }) : M.lam;
  return M;
}
// The ice that bergs, ridges, icicles and the frozen fall are made of (the design's image 13): one world-projected material
// for every scan and code model, no texture of its own. Pale blue-white on the faces, deepening to blue-green in the hollows
// and underneath, snow settling on whatever faces the sky, a fresnel rim of the sky, a little light caught inside; quality
// 1+ adds the ice layer's detail and the aurora mirrored in it. Quality 0: Lambert, the noise alone.
// glow (the Frozen Fall): a cold light held inside the ice, and less snow on it
const ICY = {};
function icyMat(glow = false) {
  const lay = ENV.layers['rime/ice'] || null, hi = R.quality >= 1, key = 'icy|' + (lay ? 'l' : '') + R.quality + (glow ? '|g' : '');
  if (ICY[+glow]?.userData.key === key) return ICY[+glow];
  noiseTex();
  // (Lambert on every quality: a Phong highlight laid a hot blot in the middle of every berg; the ice's sheen is its
  // fresnel rim instead)
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const u = SEA_U({ tIceL: { value: lay?.d || null }, uSkyC: SEA_LIT.uSkyC });
  const patch = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.defines = Object.assign(sh.defines || {}, hi ? { ICY_HI: '' } : {}, glow ? { ICY_GLOW: '' } : {});
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vYW;\nvarying vec3 vYN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 ywp = vec4(transformed, 1.0); vec3 ywn = objectNormal;
#ifdef USE_INSTANCING
  ywp = instanceMatrix * ywp; ywn = mat3(instanceMatrix) * ywn;
#endif
  vYW = (modelMatrix * ywp).xyz; vYN = normalize(mat3(modelMatrix) * ywn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${SEA_GLSL()}
uniform sampler2D tIceL; uniform vec3 uSkyC;
varying vec3 vYW; varying vec3 vYN;
vec3 icyEm = vec3(0.0);`)
      .replace('#include <map_fragment>', `
  vec3 yN = normalize(vYN), yA = abs(yN), yV = normalize(cameraPosition - vYW);
  vec2 yq = yA.y > max(yA.x, yA.z) ? vYW.xz : yA.x > yA.z ? vYW.zy : vYW.xy;
  vec4 yn = texture2D(tNoise, yq * 0.09 + 0.31);
  // (no texture of its own: the ice layer's crack network read as a swimming pool's caustics on a berg. Its sheer faces
  // are streaked up and down by the calving and the meltwater; the level ones smooth)
  float ylk = 0.55 + (yn.g - 0.5) * 0.45;
  float ystk = texture2D(tNoise, vec2(yq.x * 0.42, yq.y * 0.035) + 0.17).b;
  ylk += (ystk - 0.5) * 0.7 * (1.0 - smoothstep(0.55, 0.85, abs(yN.y)));
  // old ice is white and opaque at its core: pale blue-white faces, blue-green only in the hollows, the cracks and
  // underneath; laid in strata that run level across it; snow on whatever faces the sky
  float yao = clamp(0.3 + 0.55 * (yN.y * 0.5 + 0.5) + (yn.r - 0.5) * 0.7, 0.0, 1.0);
  vec3 ycol = mix(vec3(0.03, 0.1, 0.13), vec3(0.26, 0.36, 0.44), smoothstep(0.15, 0.7, yao)) * (0.75 + 0.45 * ylk);
  float ystr = sin(vYW.y * 3.3 + yn.g * 2.2 + yn.r * 1.3);
  ycol *= 0.9 + 0.12 * ystr;
  // (cracks run up and down its sheer faces, deep blue in them)
  // (few: a noise's isoline everywhere drew worms)
  float ycr = (1.0 - smoothstep(0.0, 0.03, abs(ystk - 0.5))) * smoothstep(0.62, 0.8, yn.a);
  ycol = mix(ycol, vec3(0.04, 0.13, 0.18), ycr * 0.4 * (1.0 - smoothstep(0.55, 0.85, abs(yN.y))));
  // (a dusting, broken: a block snowed white all over its top read as a sugar cube)
  float ysn = smoothstep(0.62, 0.9, yN.y + (yn.a - 0.5) * 0.5) * (0.45 + 0.4 * smoothstep(0.35, 0.65, yn.g));
#ifdef ICY_GLOW
  ysn *= 0.25 * smoothstep(0.5, 0.75, yn.a);
#endif
  ycol = mix(ycol, vec3(0.6, 0.64, 0.7) * (0.92 + 0.12 * yn.g), ysn);
  diffuseColor.rgb *= ycol;
  float yF = pow(1.0 - clamp(dot(yN, yV), 0.0, 1.0), 3.0);
  icyEm = (uSkyC * (0.25 + yF * 1.2) + vec3(0.006, 0.024, 0.032) * (1.0 - yao)) * (1.0 - ysn);
#ifdef ICY_GLOW
  icyEm += vec3(0.02, 0.07, 0.1) * (0.55 + 0.45 * yn.b) * (0.6 + 0.4 * yao) * (1.0 - ysn) * (0.7 + 0.3 * ystr);
#endif
#ifdef ICY_HI
  vec3 yR = reflect(-yV, yN);
  if (yR.y > 0.06 && uAur * max(1.0 - uAurDark, uAurFront) > 0.02) icyEm += aurora(vYW.xz + yR.xz * ((70.0 - vYW.y) / yR.y), 1.0, 30.0) * yF * 0.6 * (1.0 - ysn);
#endif`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += icyEm;');
  };
  m.customProgramCacheKey = () => key + '|' + m.type;
  occlude(m, patch);
  m.userData.key = key;
  return (ICY[+glow] = m);
}

// ---------- instanced types (build.js Instancer hands 'icy:', 'cliff5:', 'rime:' and 'c5:' here) ----------
// 'icy:<scan>' and 'cliff5:<scan>' (a base or deep scan's geometry, '#<code>' a code model), 'rime:<name>' (the scan as
// packed), 'c5:<code>' (a code model in its own material). Returns { parts: [{ geo, material, glow }], shadow } or null
export function instDef5(type, M, quality) {
  mats5();
  // ('~ns' at the end: small dressing that casts no shadow)
  const ns = type.endsWith('~ns'), k = type.slice(0, type.indexOf(':')), name = type.slice(k.length + 1).replace('~ns', '');
  const def = instDef(k, name, M, quality);
  if (def && ns) def.shadow = false;
  return def;
}
function instDef(k, name, M, quality) {
  if (k === 'rime') {
    const parts = rime(name); if (!parts) return null;
    return { parts: parts.map((p) => ({ geo: p.geo, material: p.mat.transparent || /glow/i.test(p.mat.name) ? glowPart() : p.mat, glow: p.mat.transparent || /glow/i.test(p.mat.name) })), shadow: true };
  }
  if (name.startsWith('#') || k === 'c5') {
    const c = CODE5[name.replace('#', '')]?.(); if (!c) return null;
    return { parts: [{ geo: c.geo, material: k === 'icy' ? MAT.icy5 : k === 'cliff5' ? MAT.cliff5 : MAT[c.mat] || M.lam }], shadow: c.shadow ?? true };
  }
  const parts = ENV.props[name]; if (!parts) return null;
  return { parts: parts.map((p) => ({ geo: k === 'icy' ? p.geo : withVC(p.geo), material: k === 'icy' ? MAT.icy5 : MAT.cliff5 })), shadow: k !== 'icy' || quality >= 2 };
}
// (the sea-cliff stone is a vertex-coloured material, its layer times colour / GREY: a scan with no colours of its own
// would read black, so it gets a copy coloured GREY throughout)
const VC = new Map();
function withVC(geo) {
  if (geo.attributes.color) return geo;
  if (VC.has(geo)) return VC.get(geo);
  const g = geo.clone(), n = g.attributes.position.count, c = new THREE.Color(GREY), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.userData.shared = true;
  VC.set(geo, g);
  return g;
}
const glowPart = () => (MAT.glow5 ||= new THREE.MeshBasicMaterial({ color: 0xffb35a, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
// code models shared by the instancer (each baked once)
const CODE5_CACHE = {};
const CODE5 = new Proxy({
  // a marker pole: a pole with a strip of ochre cloth at its head, three ice blocks at its foot
  // (its foot in a low mound of drifted snow, three small blocks of ice wedged round it)
  pole: () => ({ mat: 'lam', geo: bake([{ geo: G.cyl(0.06, 0.08, 2.6, 6), color: 0x5a4a3a, o: { y: 1.3 } }, { geo: G.box(0.07, 0.55, 0.02), color: 0xa8401c, o: { y: 2.2, x: 0.1, rz: 0.12 } }, { geo: G.box(0.06, 0.38, 0.02), color: 0x8a3014, o: { y: 2.24, x: 0.18, rz: 0.45 } }, { geo: G.box(0.3, 0.05, 0.05), color: 0x5a4a3a, o: { y: 2.45 } },
    { geo: jitter(G.dome(0.62, 0.3, 9), 0.06, 599), color: 0xc4ccd6, o: { y: -0.02, sy: 0.55 } },
    ...[0, 1, 2].map((i) => ({ geo: jitter(G.box(0.24 - i * 0.04, 0.18, 0.16, 1, 1, 1), 0.04, 600 + i), color: 0x8ea4b4, o: { x: Math.sin(i * 2.1) * 0.3, z: Math.cos(i * 2.1) * 0.3, y: 0.12, ry: i * 1.3, rz: 0.3 - i * 0.2 }, jit: 0.1 }))]) }),
  // a heap of kelp and wrack: dark lumps, strands lying out from them
  kelp: () => {
    const rr = RNG(611), parts = [];
    for (let i = 0; i < 6; i++) parts.push({ geo: jitter(G.dodeca(rr.range(0.22, 0.4)), 0.07, 612 + i), color: i % 2 ? KELP : 0x2e2a1a, o: { x: rr.range(-0.5, 0.5), z: rr.range(-0.4, 0.4), y: 0.04, sy: 0.35 }, jit: 0.25 });
    for (let i = 0; i < 9; i++) { const a = rr.range(0, 6.28), l = rr.range(0.5, 1.1); parts.push({ geo: G.box(0.07, 0.025, l), color: i % 3 ? 0x3a3418 : 0x4a3c1c, o: { x: Math.sin(a) * l * 0.5, z: Math.cos(a) * l * 0.5, y: 0.03, ry: a + rr.range(-0.3, 0.3) } }); }
    return { mat: 'lam', geo: bake(parts), shadow: false };
  },
  // a cluster of icicles hanging from a lip of ice (from y 0 down)
  icicles: () => {
    const rr = RNG(621), parts = [{ geo: jitter(G.box(1.4, 0.1, 0.3, 4, 1, 2), 0.04, 622), color: 0xffffff, o: { y: 0.03 } }];
    for (let i = 0; i < 9; i++) { const l = rr.range(0.35, 1.6); parts.push({ geo: G.cone(rr.range(0.05, 0.11), l, 5), color: 0xffffff, o: { x: -0.62 + i * 0.155 + rr.range(-0.04, 0.04), y: -l / 2, z: rr.range(-0.12, 0.12), rx: Math.PI } }); }
    return { geo: bake(parts), shadow: false };
  },
  // firewood stacked against a wall: three courses of split logs, snow on the top
  firewood: () => {
    const rr = RNG(641), parts = [];
    for (let j = 0; j < 3; j++) for (let k = 0; k < 6 - j * 2; k++) parts.push({ geo: G.cyl(0.085, 0.095, 0.95, 6), color: (k + j) % 2 ? 0x5a4636 : 0x46382c, o: { x: -0.5 + j * 0.17 + k * 0.2, y: 0.09 + j * 0.16, z: rr.range(-0.05, 0.05), rx: Math.PI / 2 }, jit: 0.15, snow: j === 2 ? 0.7 : 0 });
    return { mat: 'lam', geo: bake(parts) };
  },
  // a sledge: two runners turned up at the front, crossbars and slats, a load lashed under a hide
  sledge: () => {
    const parts = [];
    for (const s of [-1, 1]) { parts.push({ geo: G.box(0.07, 0.07, 2.0), color: WOODD, o: { x: s * 0.36, y: 0.04 } }, { geo: G.segTo(0, 0.32, 0.3, 0.035, 0.03, 4), color: WOODD, o: { x: s * 0.36, y: 0.06, z: 1.0 } }); for (const z of [-0.7, 0, 0.7]) parts.push({ geo: G.box(0.05, 0.22, 0.05), color: WOODD, o: { x: s * 0.36, y: 0.17, z } }); }
    for (const z of [-0.7, -0.35, 0, 0.35, 0.7]) parts.push({ geo: G.box(0.86, 0.04, 0.16), color: WOODG, o: { y: 0.3, z } });
    parts.push({ geo: jitter(G.box(0.7, 0.32, 1.1, 2, 1, 2), 0.05, 643), color: 0x4a3a2c, o: { y: 0.48, z: -0.15 }, snow: 1.2 });
    return { mat: 'lam', geo: bake(parts) };
  },
  // a tent of hides on a ridge pole, its door to local +z, snow on its roof
  tent: () => {
    const parts = [{ geo: G.box(0.06, 1.7, 0.06), color: WOODD, o: { y: 0.85, z: 1.1 } }, { geo: G.box(0.06, 1.7, 0.06), color: WOODD, o: { y: 0.85, z: -1.1 } }, { geo: G.cyl(0.035, 0.035, 2.5, 5), color: WOODD, o: { y: 1.7, rx: Math.PI / 2 } }];
    // (each side sewn from six hides of different tones, overlapping, laced along their seams: one plain sheet read as a
    // board)
    const HIDE = [0x5a4a3a, 0x6c5642, 0x4a3c30, 0x76604a, 0x544438, 0x664e3a];
    for (const s of [-1, 1]) {
      const a = s * 0.62, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const dy = (j - 0.5) * 0.94, dz = (i - 1) * 0.76, nk = (j * 0.014 + (i % 2) * 0.008) * s;
        parts.push({ geo: jitter(G.box(0.045, 1.04, 0.84, 1, 2, 2), 0.035, 645 + s * 7 + i * 3 + j), color: HIDE[(i * 2 + j + (s > 0 ? 3 : 0)) % 6], o: { x: s * 0.62 - dy * sa + ca * nk, y: 0.86 + dy * ca + sa * nk, z: dz, rz: a }, snow: 0.3 });
      }
      for (const dz of [-0.38, 0.38]) parts.push({ geo: G.box(0.06, 1.9, 0.025), color: 0x2a2018, o: { x: s * 0.62 + ca * 0.03 * s, y: 0.86 + sa * 0.03 * s, z: dz, rz: a } });
    }
    parts.push({ geo: G.box(0.05, 1.2, 1.1), color: 0x241c16, o: { y: 0.55, z: 1.12, ry: Math.PI / 2 } });
    return { mat: 'lam', geo: bake(parts) };
  },
  // a drift of snow: a long low mound, softly lumped
  drift: () => ({ mat: 'snow5', geo: bake([{ geo: jitter(G.dome(1.0, 0.28, 12), 0.08, 649), color: GREY, o: { sx: 1.9, sy: 0.55 } }]), shadow: false }),
  // a fur thrown down on the ice
  fur: () => ({ mat: 'lam', geo: bake([{ geo: jitter(G.cyl(0.75, 0.8, 0.05, 9), 0.08, 647), color: 0x3a2c22, o: { y: 0.02, sx: 1.2 } }, { geo: jitter(G.cyl(0.45, 0.5, 0.05, 7), 0.06, 648), color: 0x4e3c2e, o: { y: 0.05, x: 0.3, sx: 1.3 } }]), shadow: false }),
  // the keepers' old cairn-pole: stones stacked about a pole, a rag at its head
  cairnPole: () => ({ mat: 'lam', geo: bake([...[0, 1, 2, 3, 4].map((i) => ({ geo: jitter(G.dodeca(0.3 - i * 0.04), 0.07, 650 + i), color: i % 2 ? 0x5a5a5e : 0x48484c, o: { x: Math.sin(i * 2.4) * (i < 3 ? 0.26 : 0.1), z: Math.cos(i * 2.4) * (i < 3 ? 0.26 : 0.1), y: 0.15 + (i < 3 ? 0 : (i - 2) * 0.26) }, snow: 1.3 })), { geo: G.cyl(0.04, 0.05, 2.2, 5), color: 0x4a3a2a, o: { y: 1.1, rz: 0.06 } }, { geo: G.box(0.05, 0.4, 0.02), color: 0x6a2a18, o: { y: 1.9, x: 0.08, rz: 0.2 } }]) }),
  // a floe: a broken plate of the sea ice, its outline ragged, riding low in the water
  floe: () => {
    // (fourteen sides, broken at two scales: with seven a floe read as a paper hexagon)
    const g = new THREE.CylinderGeometry(0.5, 0.55, 0.14, 14, 1), pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), k = 0.7 + 0.36 * Math.abs(Math.sin(a * 2.3 + 0.7)) + 0.12 * Math.sin(a * 5.1) + 0.09 * Math.sin(a * 11.3 + 1.1); pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k * 0.8); }
    return { geo: bake([{ geo: g, color: 0xffffff, o: { y: 0.0 } }]), shadow: false };
  },
  // a slab of sea ice (pressure ridges, a berg's rubble): a thick plate, its edges broken
  slab: () => ({ geo: bake([{ geo: jitter(G.box(1.3, 0.3, 0.95, 3, 1, 2), 0.07, 631), color: 0xffffff, o: { y: 0.1 } }]), shadow: true }),
  // a stockfish card (two dried fish hung tail to tail)
  fish: () => ({ mat: 'lam', geo: bake([{ geo: G.box(0.1, 0.5, 0.02), color: FISH, o: { y: -0.25 }, jit: 0.2 }, { geo: G.box(0.06, 0.1, 0.022), color: 0x6a6458, o: { y: -0.52 } }]), shadow: false })
}, { get: (t, k) => (t[k] ? () => (CODE5_CACHE[k] ||= ((c) => { c.geo.userData.shared = true; return c; })(t[k]())) : undefined) });

// a scan of the base set or the deep pack fitted to a size: { k (uniform), y0 } so it sits on its base, or null
function fit(name, want, by = 'h') {
  const parts = ENV.props[name], sz = size4(parts);
  if (!sz) return null;
  const k = by === 'h' ? want / Math.max(0.01, sz.y) : by === 'w' ? want / Math.max(0.01, sz.x, sz.z) : want / Math.max(0.01, sz.x, sz.y, sz.z);
  return { k, y0: sz.y0 * k, sz };
}
const ROCKS = ['boulder', 'rockA', 'rockB', 'rockC'], STONES = ['stoneA', 'stoneB', 'stoneC'];
const rockAt = (x, z, list = ROCKS) => list[Math.floor(hash2(x * 1.7, z * 2.3) * list.length)];

// ---------- code geometry: hulls ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _w = new THREE.Vector3();
// A clinker hull along local z (bow +z), keel at y 0, gunwale at depth (rising toward the stems): s strakes, each a band of
// planks with its lower edge standing proud of the one below, an outer and an inner skin and a cap along the gunwale;
// frames inside. o: { seg, strakes, fine (how sharp the ends), sheer, tar (colour below the waterline), wood, cut(u, k, side)
// -> true drops that plank (wrecks), frames: false, weed (a green-black band low down) }. Returns a non-indexed geometry
// with position, normal and color (what bake() makes, so it merges into the batches)
function hullGeo(len, beam, depth, o = {}) {
  const N = o.seg ?? 14, S = o.strakes ?? 6, rr = RNG(o.seed || 7), pos = [], col = [];
  const cT = new THREE.Color(o.tar ?? TAR), cW = new THREE.Color(o.wood ?? WOODG), cWeed = new THREE.Color(0x1e2418), c = new THREE.Color();
  const hb = (u) => (beam / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), o.fine ?? 2.2)), 0.55);
  const sh = (u) => depth * (1 + (o.sheer ?? 0.22) * u * u);
  const P = (u, t, side, inset, out) => { const a = (t * Math.PI) / 2, b = Math.max(0, hb(u) - inset); return out.set(side * b * Math.sin(a), sh(u) * (1 - Math.cos(a)) + inset * (1 - t), (u * len) / 2); };
  const want = (p, u, sgn) => _w.set(p.x, p.y - sh(u) * 0.7, 0).multiplyScalar(sgn);
  const tri = (p, q, r, w, cc) => {
    _a.subVectors(q, p); _b.subVectors(r, p); _n.crossVectors(_a, _b);
    if (_n.dot(w) < 0) { const t = q; q = r; r = t; }
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    for (let k = 0; k < 3; k++) col.push(cc.r, cc.g, cc.b);
  };
  const quad = (a, b, cq, d, w, cc) => { tri(a, b, cq, w, cc); tri(a, cq, d, w, cc); };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), D = new THREE.Vector3(), M = new THREE.Vector3();
  for (let k = 0; k < S; k++) for (let i = 0; i < N; i++) for (const side of [-1, 1]) {
    const u0 = -1 + (2 * i) / N, u1 = -1 + (2 * (i + 1)) / N, um = (u0 + u1) / 2, t0 = k / S, t1 = (k + 1) / S;
    if (o.cut?.(um, k, side)) continue;
    c.copy(k < S * 0.34 ? cT : cW).multiplyScalar(0.86 + rr.next() * 0.26);
    if (o.weed && k < S * 0.5) c.lerp(cWeed, 0.55 * (1 - k / (S * 0.5)));
    // outer skin (the strake's lower edge proud), inner skin, then the gunwale cap on the top strake
    P(um, (t0 + t1) / 2, side, 0, M); want(M, um, 1);
    quad(P(u0, t0, side, -0.03, A), P(u1, t0, side, -0.03, B), P(u1, t1, side, 0, C), P(u0, t1, side, 0, D), _w.clone(), c);
    const ci = c.clone().multiplyScalar(0.7);
    want(M, um, -1);
    quad(P(u0, t0, side, 0.05, A), P(u1, t0, side, 0.05, B), P(u1, t1, side, 0.05, C), P(u0, t1, side, 0.05, D), _w.clone(), ci);
    if (k === S - 1) quad(P(u0, 1, side, 0, A), P(u1, 1, side, 0, B), P(u1, 1, side, 0.05, C), P(u0, 1, side, 0.05, D), new THREE.Vector3(0, 1, 0), c.clone().multiplyScalar(1.1));
  }
  // frames: thin ribs up the inside every half metre or so (three straight pieces each)
  if (o.frames !== false) for (let u = -0.84; u <= 0.85; u += 1.1 / Math.max(2, len / 2)) for (const side of [-1, 1]) {
    if (o.cut?.(u, S - 1, side) && o.cut?.(u, 0, side)) continue;
    for (let j = 0; j < 3; j++) {
      const ta = j / 3, tb = (j + 1) / 3;
      P(u, ta, side, 0.07, A); P(u, tb, side, 0.07, B); C.copy(A).setZ(A.z + 0.07); D.copy(B).setZ(B.z + 0.07);
      want(A, u, -1); quad(A, B, D, C, _w.clone(), c.copy(cW).multiplyScalar(0.62));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
// with bake()'d extras merged in (keel, stems, thwarts, masts...)
const withParts = (geo, parts) => (parts.length ? mergeGeometries([geo, bake(parts)], false) : geo);
// a keel-boat, a rowboat or a broken boat: length, beam, depth, stems; o.broken drops planks (more toward one end)
function boatGeo(kind, o = {}) {
  const K = { keel: [8.4, 2.6, 1.0, 1], landing: [5.2, 1.7, 0.72, 1], row: [4.6, 1.5, 0.6, 0], broken: [7.0, 2.4, 0.9, 1] }[kind] || [5, 1.6, 0.7, 0];
  const [len, beam, depth, stems] = K, rr = RNG(o.seed || 11), holes = new Set();
  if (kind === 'broken' || o.broken) for (let i = 0; i < 14; i++) holes.add(rr.int(0, 13) + ',' + rr.int(0, 5) + ',' + (rr.chance(0.5) ? 1 : -1));
  const cut = kind === 'broken' || o.broken ? (u, k, side) => (u > 0.35 && k > 1 && (side > 0 || u > 0.6)) || holes.has(Math.floor((u + 1) * 7) + ',' + k + ',' + side) : null;
  const geo = hullGeo(len, beam, depth, { seg: kind === 'row' ? 10 : 14, strakes: kind === 'row' ? 4 : 6, fine: kind === 'row' ? 1.6 : 2.4, cut, seed: o.seed, weed: o.weed });
  const parts = [{ geo: G.box(0.12, 0.14, len * 0.96), color: TAR, o: { y: 0.02 } }];
  if (stems) for (const s of [-1, 1]) { if (cut && s > 0) continue; parts.push({ geo: G.segTo(0, depth * 0.75, s * 0.32, 0.07, 0.05, 4), color: WOODD, o: { y: depth * 0.92, z: (s * len) / 2 } }); }
  for (const u of kind === 'row' ? [-0.3, 0.2] : [-0.45, 0, 0.45]) if (!cut || u < 0.3) parts.push({ geo: G.box(beam * 0.78 * (1 - u * u * 0.7), 0.05, 0.22), color: WOODG, o: { y: depth * 0.68, z: (u * len) / 2 } });
  return withParts(geo, parts);
}
const BOAT_GEO = {};
const boatGeoC = (kind, o = {}) => (BOAT_GEO[kind + (o.weed ? 'w' : '')] ||= shared(boatGeo(kind, o)));
const shared = (g) => { g.userData.shared = true; return g; };

// ---------- the dressing: L.props, rime scan or code model ----------
// (each handler places one prop; I instances, B merges by material and chunk; out.emitters takes fx and drips)
let COAST_L = null;
const PLACE = {
  // the Dalarö on its bar: the warship's hull, sides and stern standing, the bow broken open onto the belly
  wreck(p, I, B, out) {
    const parts = rime('wreck');
    if (parts && fitInst(I, 'rime:wreck', p, 13.5, 'l', -0.2)) { drip(out, p, 2.2); return; }
    const geo = hullGeo(13.6, 5.0, 2.7, { seg: 16, strakes: 8, fine: 2.6, weed: true, seed: 31, cut: (u, k, side) => u > 0.55 || (u > 0.25 && k > 3) || (k > 5 && hash2(u * 9, side) > 0.6) });
    const rr = RNG(Math.round(p.x * 7 + p.z)), extra = [{ geo: G.box(0.22, 0.25, 13), color: TAR, o: { y: 0.0 } }];
    // ribs standing proud where the planking has gone, a fallen mast across the bar
    for (let u = 0.3; u < 0.95; u += 0.11) for (const s of [-1, 1]) extra.push({ geo: G.segTo(s * 0.25, 2.2 + rr.range(-0.5, 0.4), 0.05, 0.08, 0.05, 4), color: WOODD, o: { x: s * 2.25, y: 0.3, z: u * 6.8 } });
    extra.push({ geo: G.cyl(0.16, 0.22, 9, 6), color: WOODD, o: { x: 1.2, y: 0.25, z: -1, rx: Math.PI / 2, ry: 0.5 }, snow: 0.8 });
    B.put('planks5', withParts(geo, extra), TRS(p.x, -0.25, p.z, p.r, p.tilt || 0));
    drip(out, p, 2.2);
  },
  // the Graveyard's boats: on the shore drawn up and listing, or held in the ice to the gunwale
  keelboat(p, I, B, out) { boat5(p, I, B, out, 'keel', 'keelboat', 8.6); },
  rowboat(p, I, B, out) { boat5(p, I, B, out, 'row', 'rowboat', 4.6); },
  brokenBoat(p, I, B, out) { boat5(p, I, B, out, 'broken', 'brokenBoat', 7); },
  shack(p, I, B) { if (!fitInst(I, 'rime:shack', p, 4.3, 'l')) shackCode(p, B); },
  stiltHut(p, I, B) { stiltHut(p, B, I); },
  rack(p, I, B) { rackCode(p, I, B); },
  jetty(p, I, B) { jettyCode(p, B); },
  whale(p, I, B) { if (!fitInst(I, 'rime:whale', p, 15, 'l')) whaleCode(p, B); },
  frozenFall(p, I, B, out, L) { fallCode(p, I, B, L); },
  // icicles on the cliff by the fall: hung where the rock face stands at their height (out from the prop along local +z)
  icicle(p, I, B, out, L) {
    // (from the lip: no higher than the rock stands where the prop is set)
    const fx = Math.sin(p.r), fz = Math.cos(p.r), y = Math.min(p.y, groundY(L, p.x, p.z) - 0.3);
    if (y < 1.5) return;
    let d = 0; while (d < 6 && groundY(L, p.x + fx * d, p.z + fz * d) > y) d += 0.25;
    const x = p.x + fx * (d - 0.15), z = p.z + fz * (d - 0.15), parts = rime('icicle');
    if (parts) { const sz = size4(parts), k = (p.s * 1.4) / Math.max(0.01, sz.y); I.add('icy:rime/icicle', x, z, p.r, k, y - sz.y0 * k - sz.y * k); return; }
    I.add('icy:#icicles', x, z, p.r, p.s, y);
  },
  anchor(p, I, B) { if (!fitInst(I, 'rime:anchor', p, 2.2, 'l', -0.3)) anchorCode(p, B, true); },
  sunkenAnchor(p, I, B) { if (!fitInst(I, 'rime:sunkenAnchor', { ...p, tilt: (p.tilt || 0.4) + 0.25 }, 2.2, 'l', -0.62)) anchorCode(p, B, false); },
  kelp(p, I) { if (!fitInst(I, 'rime:kelp', p, 1.6 * p.s, 'w', -0.05)) I.add('c5:kelp', p.x, p.z, p.r, p.s, 0.0); },
  driftwood(p, I) {
    if (fitInst(I, 'rime:driftwood', p, 2.4 * p.s, 'l', -0.05)) return;
    const f = fit('log', 2.2 * p.s, 'l'); if (f) I.add('cliff5:log~ns', p.x, p.z, p.r, f.k, -f.y0 - 0.08, f.k * 0.8, f.k);
  },
  barnacleRock(p, I) { if (!fitInst(I, 'rime:barnacleRock', p, 1.2 * p.s, 'w', -0.1)) rock5(I, 'cliff5', p, 1.2 * p.s, 0.55, -0.12, ROCKS, '~ns'); },
  rockFace(p, I) {
    // (the rime faces are geometry only, packed untextured: drawn in the sea-cliff stone. Each is a one-sided scan facing
    // its local +z: only where that faces the camera, south-ish; seen from behind it would show a scatter of slivers)
    const front = Math.cos(p.r || 0) > 0.35;
    if (front && (fitInst(I, 'cliff5:rime/rockFace', p, 5 * p.s, 'w', p.y ?? -0.3) || fitInst(I, 'cliff5:rime/coastCliff', p, 6 * p.s, 'w', p.y ?? -0.3))) return;
    const name = front && ENV.props.faceA ? (hash2(p.x, p.z) > 0.5 ? 'faceA' : 'cliffB') : null;
    if (name) { const f = fit(name, 4.4 * p.s, 'w'); I.add('cliff5:' + name, p.x, p.z, p.r, f.k, (p.y ?? -0.3) - f.y0, f.k * 1.25, f.k); }
    else rock5(I, 'cliff5', p, 3.4 * p.s, 1.4, p.y ?? -0.3);
  },
  // a sea stack: three or four rocks of the base set stacked and narrowing, each its own shape (one boulder stretched
  // tall streaked its stone)
  seaStack(p, I) {
    const rr = RNG(Math.round(p.x * 13 + p.z * 29)), n = 3 + (rr.next() < 0.5 ? 1 : 0);
    let y = p.y ?? -1.5;
    for (let k = 0; k < n; k++) {
      const w = 2.7 * p.s * (1 - k * 0.2) * rr.range(0.9, 1.1), q = { x: p.x + rr.range(-0.3, 0.3) * k, z: p.z + rr.range(-0.3, 0.3) * k, r: rr.range(0, 6.28) };
      const nm = ROCKS[(k + Math.floor(rr.next() * 4)) % 4], f = fit(nm, w, 'w');
      if (!f) return;
      const sy = rr.range(0.8, 1.05), ky = f.k * sy;
      I.add('cliff5:' + nm, q.x, q.z, q.r, f.k, y - f.sz.y0 * ky, ky, f.k);
      y += f.sz.y * ky * 0.62;
    }
  },
  shoreRock(p, I) { rock5(I, 'cliff5', p, 1.6 * p.s, 0.75, -0.08, ROCKS, p.s < 1 ? '~ns' : ''); },
  boulder(p, I) { rock5(I, 'cliff5', p, 2.3 * p.s, 0.75, -0.1, ['boulder']); },
  skerryRock(p, I) { rock5(I, 'cliff5', p, 2.4 * p.s, 1.2, -0.2, ['boulder', 'rockA', 'rockB']); },
  // the wrecked hull in Skerry Bay: its ribs standing in an arc on one flank of the bowl, the keel along their feet
  ribs(p, I, B) {
    const rr = RNG(Math.round(p.cx * 31 + p.cz)), parts = [], [a0, a1] = p.arc, n = 7;
    for (let k = 0; k < n; k++) {
      const a = a0 + ((a1 - a0) * k) / (n - 1), x = p.cx + Math.sin(a) * p.R, z = p.cz + Math.cos(a) * p.R, h = rr.range(2.4, 3.8) * (k === 0 || k === n - 1 ? 0.7 : 1);
      // (each rib a bent timber leaning in over the bowl, its tip broken)
      const inx = -Math.sin(a), inz = -Math.cos(a);
      const seg = [[0, 0], [0.25, h * 0.45], [0.75, h * 0.8], [1.25, h]];
      for (let j = 1; j < seg.length; j++) parts.push({ geo: G.segTo(inx * (seg[j][0] - seg[j - 1][0]), seg[j][1] - seg[j - 1][1], inz * (seg[j][0] - seg[j - 1][0]), 0.17 - j * 0.03, 0.15 - j * 0.03, 5), color: j === 3 ? 0x2e2a26 : 0x3c3630, o: { x: x - p.x + inx * seg[j - 1][0], y: seg[j - 1][1] - 0.1, z: z - p.z + inz * seg[j - 1][0] }, snow: 0.7 });
    }
    for (let k = 0; k < 10; k++) { const a = a0 + ((a1 - a0) * (k + 0.5)) / 10, x = p.cx + Math.sin(a) * (p.R + 0.2), z = p.cz + Math.cos(a) * (p.R + 0.2); parts.push({ geo: G.box(0.3, 0.26, 1.9), color: 0x2c2824, o: { x: x - p.x, y: 0.02, z: z - p.z, ry: a + Math.PI / 2 }, snow: 0.5 }); }
    B.add('lam', parts, p.x, p.z, 0);
  },
  // the Icebound Ship, held at a list in the ice
  ship(p, I, B) { if (!fitInst(I, 'rime:ship', p, 18.5, 'l', -1.0)) shipCode(p, B); },
  // a berg: a faceted dome of ice over the ground's own rise (gen5's bergH, which it always covers), a shoulder or two
  berg(p, I, B) {
    B.put('icy5', bergGeo(p.s, p.hgt, Math.round(p.x * 13 + p.z * 7)), TRS(p.x, 0, p.z, p.r));
    const rr = RNG(Math.round(p.x * 7 + p.z * 13));
    // (calved rubble round its foot: blocks and slabs of the same ice)
    for (let k = 0; k < 7; k++) {
      const a = rr.range(0, 6.28), d = p.s * rr.range(1.0, 1.35), n = rockAt(p.x + k, p.z), g = fit(n, 1, 'w');
      if (k % 2) { I.add('icy:#slab~ns', p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, rr.range(0, 6.28), rr.range(0.6, 1.2), 0.05, rr.range(0.6, 1.1), rr.range(0.6, 1.1), rr.range(0.3, 0.9)); continue; }
      if (g) { const w = p.s * rr.range(0.15, 0.32), ky = (w * 0.7) / g.sz.y; I.add('icy:' + n + '~ns', p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, rr.range(0, 6.28), w * g.k, -0.2 - g.sz.y0 * ky, ky, w * g.k); }
    }
  },
  // a pressure ridge's block: two or three slabs of the sea ice shoved up on edge, leaning on each other
  iceBlock(p, I) {
    const rr = RNG(Math.round(p.x * 31 + p.z * 17)), n = 2 + (rr.next() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const a = p.r + rr.range(-0.5, 0.5), d = rr.range(0, 0.45) * p.s, ox = Math.cos(p.r + k * 2.1) * d, oz = Math.sin(p.r + k * 2.1) * d;
      I.add('icy:#slab', p.x + ox, p.z + oz, a, p.s * rr.range(0.75, 1.05), 0.0, p.s * rr.range(0.8, 1.15), p.s * rr.range(0.65, 0.9), (rr.next() < 0.5 ? -1 : 1) * rr.range(0.45, 0.95));
    }
  },
  pole(p, I) { I.add('c5:pole', p.x, p.z, p.r, 1, 0); },
  // a drowned lantern under its window (warm glass: the ice shader's uGlow lights the ice round it)
  sunkenLantern(p, I, B, out) {
    const y = p.y ?? -2;
    if (!fitInst(I, 'rime:oilLamp', { ...p, tilt: 1.1 }, 0.6, 'h', y)) { const f = fit('lantern', 0.6); if (f) I.add('env:lantern', p.x, p.z, p.r, f.k, y - f.y0, f.k, f.k, 1.1); }
    const s = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xffa040, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
    s.scale.setScalar(1.6); s.position.set(p.x, (p.y ?? -2) + 0.4, p.z); out.group.add(s);
  },
  brazier(p, I, B, out) { const g = act4Prop('brazier'); g.position.set(p.x, 0, p.z); out.group.add(g); },
  // ---- the dressing (gen5 dress5Coast, dress5Far): decoration that blocks nothing ----
  // a stone of the base set half sunk in the snow (scree at a cliff's foot, shingle on the flats)
  stone(p, I) { rock5(I, 'cliff5', p, 0.6 * p.s, 0.6, -0.08 - 0.06 * p.s, STONES, p.s < 0.9 ? '~ns' : ''); },
  // a tuft of dry stalks poking through the snow
  tuft(p, I) { const f = fit('branches', 0.9 * p.s, 'w'); if (f) I.add('env:branches', p.x, p.z, p.r, f.k, -0.04 - f.y0, f.k * 1.6, f.k); },
  // timber washed up long ago and drifted over
  log(p, I) { fitInst(I, 'rime:driftwood', p, 2.2 * p.s, 'l', -0.16); },
  crate(p, I) { if (!fitInst(I, 'rime:crate', p, 0.75 * p.s, 'h', -0.03)) { const f = fit('crate', 0.75 * p.s); if (f) I.add('env:crate', p.x, p.z, p.r, f.k, -0.03 - f.y0); } },
  cask5(p, I) { if (!fitInst(I, 'rime:cask', p, 0.9 * p.s, 'h', -0.03)) { const f = fit('barrel', 0.9 * p.s); if (f) I.add('env:barrel', p.x, p.z, p.r, f.k, -0.03 - f.y0); } },
  bucket(p, I) { const f = fit('bucket', 0.4 * p.s); if (f) I.add('env:bucket', p.x, p.z, p.r, f.k, -0.02 - f.y0); },
  firewood(p, I) { I.add('c5:firewood', p.x, p.z, p.r, p.s, 0); },
  sledge(p, I) { I.add('c5:sledge', p.x, p.z, p.r, p.s, p.wreck ? -0.12 : 0, p.s, p.s, p.wreck ? 0.12 : 0); },
  tent(p, I) { I.add('c5:tent', p.x, p.z, p.r, p.s, 0); },
  fur(p, I) { I.add('c5:fur~ns', p.x, p.z, p.r, p.s, 0.01); },
  cairnPole(p, I) { I.add('c5:cairnPole', p.x, p.z, p.r, p.s, 0); },
  // a drift: a low mound of snow the wind has heaped (its long side across the wind)
  drift(p, I) { I.add('c5:drift~ns', p.x, p.z, p.r, p.s, -0.02, p.s * 0.5, p.s * 0.6); },
  // gear frozen into the ice: a cask or a crate tilted, half under
  gear(p, I) { fitInst(I, p.k === 'cask' ? 'rime:cask' : 'rime:crate', { ...p, tilt: 0.35 }, (p.k === 'cask' ? 0.9 : 0.75) * p.s, 'h', -0.3); },
  // ice rubble: two or three plates of the sea ice shoved up together
  iceRubble(p, I) { const rr = RNG(Math.round(p.x * 37 + p.z * 11)); for (let k = 0; k < 3; k++) { const a = p.r + k * 2.2, d = rr.range(0, 0.5) * p.s; I.add('icy:#slab~ns', p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, a + rr.range(-0.4, 0.4), p.s * rr.range(0.35, 0.7), -0.04, p.s * rr.range(0.4, 0.8), p.s * rr.range(0.35, 0.6), rr.range(0.2, 0.9) * (k % 2 ? 1 : -1)); } },
  // a floe: a plate of broken ice floating at a hole's rim
  floe(p, I) { I.add('icy:#floe~ns', p.x, p.z, p.r, p.s * 1.2, -0.1, p.s * 0.8, p.s * 1.2, (hash2(p.x, p.z) - 0.5) * 0.14); },
  // the ropes from the camp to the ship: posts, and two sagging lines between them
  ropeLine(p, I, B) {
    const dx = p.x1 - p.x, dz = p.z1 - p.z, L2 = Math.hypot(dx, dz), parts = [], n = Math.max(2, Math.round(L2 / 4.5));
    for (let k = 0; k <= n; k++) { const t = k / n; parts.push({ geo: G.cyl(0.05, 0.06, 1.3, 5), color: WOODD, o: { x: dx * t, y: 0.62, z: dz * t } }); }
    for (let k = 0; k < n; k++) for (let j = 0; j < 4; j++) {
      const t0 = (k + j / 4) / n, t1 = (k + (j + 1) / 4) / n, sag = (u) => 1.18 - 0.28 * Math.sin(((u * n) % 1) * Math.PI);
      parts.push({ geo: G.segTo(dx * (t1 - t0), sag(t1) - sag(t0), dz * (t1 - t0), 0.014, 0.014, 3), color: 0x6a5a40, o: { x: dx * t0, y: sag(t0), z: dz * t0 } });
    }
    B.add('lam', parts, p.x, p.z, 0);
  },
  // an ebb cave's overhang: a shelf of the cliff out over the back half of the pool, icicles along its lip, the floor under
  // it dark (build.js darkens the ground in the caves)
  caveArch(p, I) {
    const f = fit('boulder', 1, 'w'), g = fit('rockA', 1, 'w');
    if (f) I.add('cliff5:boulder', p.x, p.z + 1.6, 0.3, 5.2 * f.k, 2.3 - f.sz.y0 * 1.5 * f.k, 1.5 * f.k, 3.6 * f.k);
    if (g) for (const s of [-1, 1]) I.add('cliff5:rockA', p.x + s * 2.6, p.z + 0.9, s, 2.4 * g.k, -0.3 - g.sz.y0 * 3.4 * g.k, 3.4 * g.k, 2.4 * g.k);
    for (let k = 0; k < 4; k++) I.add('icy:#icicles~ns', p.x - 1.6 + k * 1.05, p.z - 0.1, 0, 0.7 + (k % 2) * 0.3, 2.15);
    I.add('c5:kelp', p.x - 0.8, p.z - 0.6, 1.1, 0.8, 0.0);
  },
  fx(p, I, B, out) { out.emitters.push({ x: p.x, y: p.y, z: p.z, type: p.fx, s: p.s || 1, color: p.color }); }
};
// the rime scan (by its key) fitted to a size: 'l' longest side, 'w' widest, 'h' height; tilt from the prop
function fitInst(I, type, p, want, by = 'l', y = 0) {
  const name = type.slice(type.indexOf(':') + 1).replace('rime/', ''), parts = rime(name), sz = size4(parts);
  if (!sz) return false;
  const k = by === 'h' ? want / Math.max(0.01, sz.y) : by === 'w' ? want / Math.max(0.01, sz.x, sz.z) : want / Math.max(0.01, sz.x, sz.y, sz.z);
  I.add(type, p.x, p.z, p.r || 0, k, y - sz.y0 * k, k, k, p.tilt || 0);
  return true;
}
// a rock scan in a material ('cliff5' or 'icy'), want metres wide, sy its height over its width
function rock5(I, kind, p, want, sy, y, list = ROCKS, tag = '') {
  const n = rockAt(p.x, p.z, list), f = fit(n, want, 'w');
  if (!f) return;
  const ky = (want * sy) / Math.max(0.01, f.sz.y);
  I.add(kind + ':' + n + tag, p.x, p.z, p.r || 0, f.k, y - f.sz.y0 * ky, ky, f.k);
}
// wrecks drip as the tide leaves them (fx.js 'seaDrip': its bed, its height)
function drip(out, p, h) { if (COAST_L) out.emitters.push({ x: p.x, y: h, z: p.z, type: 'seaDrip', s: 1.6, bed: bedAt(COAST_L, p.x, p.z) }); }
function bedAt(L, x, z) {
  if (!L?.bed) return 0.6;
  const W = L.w + 1, vx = clamp(Math.round(x), 0, L.w), vz = clamp(Math.round(z), 0, L.h), b = (L.vbed || [])[vz * W + vx];
  return b != null && b < BED_DRY - 1 ? b : 0.6;
}
function boat5(p, I, B, out, kind, scan, len) {
  // (the broken boat is always the code hull, its planks gone toward one end and its ribs showing: the scan read as a
  // pill with a white cut end)
  if (kind !== 'broken' && fitInst(I, 'rime:' + scan, p, len, 'l', p.ice ? -0.45 : -0.12)) { if (!p.ice) drip(out, p, 1.2); return; }
  const geo = boatGeoC(kind, { weed: !p.ice, seed: kind.length * 7 });
  B.put('planks5', geo, TRS(p.x, p.ice ? -0.42 : -0.08, p.z, p.r, p.tilt || 0));
  if (p.ice) I.add('icy:boulder', p.x, p.z, p.r, (len * 0.55) / (size4(ENV.props.boulder)?.x || 1), -0.36, 0.08, 0.6);
  else drip(out, p, 1.2);
}
// a plank shack (the Wooden Shack's stand-in): low walls, a lean-to roof with snow on it, the door to local +z
function shackCode(p, B) {
  const W = 3.3, D = 4.0, H = 2.1, walls = [], roof = [];
  for (const [x, z, w, d] of [[0, -D / 2, W, 0.12], [-W / 2, 0, 0.12, D], [W / 2, 0, 0.12, D]]) walls.push({ geo: G.box(w, H, d), color: WOODG, o: { x, y: H / 2, z }, jit: 0.15 });
  walls.push({ geo: G.box(1.1, H, 0.12), color: WOODG, o: { x: -1.1, y: H / 2, z: D / 2 } }, { geo: G.box(1.3, H, 0.12), color: WOODG, o: { x: 1.0, y: H / 2, z: D / 2 } }, { geo: G.box(1.0, 0.5, 0.12), color: WOODG, o: { x: -0.05, y: H - 0.25, z: D / 2 } });
  walls.push({ geo: G.box(0.9, 1.6, 0.06), color: 0x2a2420, o: { x: -0.05, y: 0.8, z: D / 2 - 0.1 } });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) walls.push({ geo: G.box(0.16, H + 0.3, 0.16), color: WOODD, o: { x: (x * W) / 2, y: (H + 0.3) / 2, z: (z * D) / 2 } });
  roof.push({ geo: G.box(W + 0.6, 0.2, D + 0.7), color: 0x5a5650, o: { y: H + 0.35, rx: 0.2 }, jit: 0.12 });
  B.add('planks5', walls, p.x, p.z, p.r); B.add('roof5', roof, p.x, p.z, p.r);
}
// a stilt hut: a plank house on posts, a pitched roof of turf under snow, steps to its door (local +z)
function stiltHut(p, B, I) {
  const W = 2.8, D = 2.8, F = 0.75, H = 1.9, walls = [], roof = [];
  for (const x of [-1, 0, 1]) for (const z of [-1, 1]) walls.push({ geo: G.cyl(0.08, 0.1, F, 5), color: WOODD, o: { x: x * 1.3, y: F / 2, z: z * 1.3 } });
  walls.push({ geo: G.box(W + 0.4, 0.14, D + 0.5), color: WOODD, o: { y: F, z: 0.15 } });
  for (const [x, z, w, d] of [[0, -D / 2, W, 0.1], [-W / 2, 0, 0.1, D], [W / 2, 0, 0.1, D]]) walls.push({ geo: G.box(w, H, d), color: WOODG, o: { x, y: F + H / 2, z }, jit: 0.15 });
  walls.push({ geo: G.box(0.95, H, 0.1), color: WOODG, o: { x: -0.93, y: F + H / 2, z: D / 2 } }, { geo: G.box(0.95, H, 0.1), color: WOODG, o: { x: 0.93, y: F + H / 2, z: D / 2 } }, { geo: G.box(0.9, 0.45, 0.1), color: WOODG, o: { y: F + H - 0.22, z: D / 2 } });
  walls.push({ geo: G.box(0.86, 1.45, 0.05), color: 0x241e1a, o: { y: F + 0.72, z: D / 2 - 0.08 } }, { geo: G.box(0.5, 0.4, 0.05), color: 0x181412, o: { x: W / 2 + 0.03, y: F + 1.2, rz: 0, ry: Math.PI / 2 } });
  for (let k = 0; k < 3; k++) walls.push({ geo: G.box(0.9, 0.08, 0.3), color: WOODD, o: { y: F - 0.22 - k * 0.25, z: D / 2 + 0.45 + k * 0.3 } });
  roof.push({ geo: prism(W + 0.7, 1.15, D + 0.8), color: 0x5a5650, o: { y: F + H, ry: Math.PI / 2 }, jit: 0.12 });
  roof.push({ geo: G.box(0.12, 0.12, D + 0.9), color: WOODD, o: { y: F + H + 1.15 } });
  B.add('planks5', walls, p.x, p.z, p.r); B.add('roof5', roof, p.x, p.z, p.r);
  // icicles along both eaves
  if (I) { const c = Math.cos(p.r), sn = Math.sin(p.r); for (const [lx, lz, k] of [[-1.72, -0.7, 0.55], [-1.72, 0.9, 0.7], [1.72, -0.2, 0.6], [1.72, 1.1, 0.45]]) I.add('icy:#icicles~ns', p.x + lx * c + lz * sn, p.z - lx * sn + lz * c, p.r + Math.PI / 2, k, F + H - 0.02); }
}
// a drying rack: two A-frames, a ridge pole and two rails along local z, stockfish hung in rows (instanced)
function rackCode(p, I, B) {
  const parts = [], L2 = 1.5;
  for (const z of [-L2, L2]) for (const s of [-1, 1]) parts.push({ geo: G.cyl(0.045, 0.055, 2.5, 5), color: WOODD, o: { x: s * 0.42, y: 1.15, z, rz: s * 0.36 } });
  parts.push({ geo: G.cyl(0.04, 0.04, L2 * 2 + 0.4, 5), color: WOODD, o: { y: 2.22, rx: Math.PI / 2 } });
  for (const s of [-1, 1]) parts.push({ geo: G.cyl(0.035, 0.035, L2 * 2 + 0.2, 5), color: WOODD, o: { x: s * 0.24, y: 1.7, rx: Math.PI / 2 } });
  B.add('lam', parts, p.x, p.z, p.r);
  const c = Math.cos(p.r), s0 = Math.sin(p.r);
  for (const s of [-1, 1]) for (let z = -L2 + 0.15; z <= L2 - 0.1; z += 0.21) {
    const lx = s * 0.24, wx = p.x + lx * c + z * s0, wz = p.z - lx * s0 + z * c;
    I.add('c5:fish', wx, wz, p.r + Math.PI / 2 + hash2(wx, wz) * 0.4, 1, 1.7, 0.85 + hash2(wz, wx) * 0.3, 1);
  }
}
// the Landing's jetty: boards across, stringers, posts down into the water, a bollard at its end (local z out from the
// root, its deck flush with the floor)
function jettyCode(p, B) {
  const len = p.len || 9, wd = p.wd || 2, parts = [], rr = RNG(Math.round(p.x * 11 + p.z));
  for (let z = 0.1; z < len; z += 0.26) parts.push({ geo: G.box(wd + 0.25 + rr.range(-0.06, 0.08), 0.06, 0.22), color: rr.chance(0.2) ? WOODD : WOODG, o: { y: 0.03, z: z + 0.05, x: rr.range(-0.05, 0.05) }, jit: 0.12 });
  for (const s of [-1, 1]) {
    parts.push({ geo: G.box(0.16, 0.34, len), color: TAR, o: { x: (s * wd) / 2, y: -0.16, z: len / 2 } });
    for (let z = 0.6; z < len; z += 1.6) parts.push({ geo: G.cyl(0.11, 0.13, 1.3, 6), color: TAR, o: { x: (s * (wd + 0.2)) / 2, y: -0.4, z } });
  }
  parts.push({ geo: G.cyl(0.13, 0.15, 0.9, 6), color: WOODD, o: { x: wd / 2 - 0.2, y: 0.42, z: len - 0.3 } }, { geo: G.torus(0.16, 0.035, 4, 8), color: 0x6a5a40, o: { x: wd / 2 - 0.2, y: 0.5, z: len - 0.3, rx: Math.PI / 2 } });
  B.add('planks5', parts, p.x, p.z, p.r);
  // (a collar of ice on every post where the water rises and falls about it)
  const ice = [];
  for (const s of [-1, 1]) for (let z = 0.6; z < len; z += 1.6) ice.push({ geo: jitter(G.cyl(0.22, 0.26, 0.16, 7), 0.03, 670 + Math.round(z * 3) + s), color: 0xffffff, o: { x: (s * (wd + 0.2)) / 2, y: -0.12, z } });
  B.add('icy5', ice, p.x, p.z, p.r);
}
// the right whale's bones on the strand, the skull to local +z, half buried, snow in their hollows
function whaleCode(p, B) {
  const parts = [], rr = RNG(Math.round(p.x * 5 + p.z * 3)), bone = (geo, o, c = BONE) => parts.push({ geo, color: c, o, jit: 0.08, snow: 0.35 });
  // a bone along a polyline of points [x, y, z] (local), tapering r0 to r1
  const curve = (pts, r0, r1, seg = 5) => { for (let j = 1; j < pts.length; j++) { const [a, b] = [pts[j - 1], pts[j]], t0 = (j - 1) / (pts.length - 1), t1 = j / (pts.length - 1); bone(G.segTo(b[0] - a[0], b[1] - a[1], b[2] - a[2], lerp(r0, r1, t0), lerp(r0, r1, t1), seg), { x: a[0], y: a[1], z: a[2] }); } };
  // the skull: the great narrow arch of the rostrum rising off its broad base, half sunk in the shingle
  const sk = new THREE.LatheGeometry([[0, 0], [0.62, 0.2], [0.9, 0.9], [0.95, 1.8], [0.7, 3.0], [0.42, 4.1], [0.2, 4.7], [0.02, 4.9]].map(([a, b]) => new THREE.Vector2(a, b)), 9);
  sk.rotateX(Math.PI / 2);
  bone(sk, { y: 0.35, z: 3.3, sx: 1.25, sy: 0.55, rx: -0.12 });
  bone(jitter(G.ball(1.0, 8, 6), 0.08, 640), { y: 0.25, z: 3.4, sx: 1.4, sy: 0.75, sz: 0.9 });
  for (const s of [-1, 1]) curve([[s * 1.1, 0.1, 3.4], [s * 1.75, 0.18, 5.0], [s * 1.8, 0.2, 6.6], [s * 1.35, 0.15, 8.0], [s * 0.6, 0.1, 8.7]], 0.24, 0.12, 6);
  // the spine: vertebrae along local z, each with its spine and wings, smaller toward the tail
  for (let z = -5.2; z <= 2.4; z += 0.58) {
    const k = clamp(1 - Math.abs(z + 0.8) / 5.5, 0.25, 1), r = 0.14 + 0.2 * k, y = 0.12 + 0.3 * k + rr.range(-0.04, 0.04);
    bone(G.cyl(r, r, 0.36, 7), { y, z, rx: Math.PI / 2 });
    bone(G.box(0.07, 0.45 * k + 0.08, 0.16), { y: y + r + 0.15 * k, z, rz: rr.range(-0.15, 0.15) });
    bone(G.box(0.9 * k + 0.2, 0.06, 0.14), { y, z });
  }
  // the ribs: long bows from the spine out over the sand, fallen open, one or two lying loose
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) {
    if (rr.chance(0.15)) continue;
    const z = 2.0 - i * 0.62, w = 1.6 + 1.2 * Math.sin(((i + 1) / 9) * Math.PI), h = 0.7 + 0.9 * Math.sin(((i + 1) / 9) * Math.PI), dz = -0.35;
    curve([[s * 0.35, 0.5, z], [s * w * 0.45, h, z + dz * 0.3], [s * w * 0.85, h * 0.75, z + dz * 0.7], [s * w * 1.05, 0.12, z + dz]], 0.085, 0.05, 5);
  }
  for (let k = 0; k < 3; k++) { const a = rr.range(0, 6.28), x = rr.range(-3, 3), z = rr.range(-6, 1); curve([[x, 0.06, z], [x + Math.sin(a) * 1.2, 0.12, z + Math.cos(a) * 1.2], [x + Math.sin(a + 0.4) * 2.2, 0.06, z + Math.cos(a + 0.4) * 2.2]], 0.07, 0.05, 4); }
  B.add('lam', parts, p.x, p.z, p.r);
}
// the Frozen Fall: columns of ice down the cliff (each a bulging half-tube standing out of the rock, thickest where the
// water froze in flows, flaring out over the floor at its foot), a glassy frozen pool spread over the thick ice below them,
// icicles along the lip (local x along the cliff, local +z out from it). In the icy material's glowing variant (icyFall)
function fallCode(p, I, B, L) {
  const top = p.hgt || 12, rr = RNG(Math.round(p.x * 17 + p.z * 5)), fx = Math.sin(p.r), fz = Math.cos(p.r), cx = Math.cos(p.r), cz = -Math.sin(p.r);
  const gy = (lx, d) => groundY(L, p.x + cx * lx + fx * d, p.z + cz * lx + fz * d);
  // (where the rock stands at height y along the line lx: walked in from the floor in 5 cm steps)
  const at = (lx, y, d0) => { let d = d0; while (d > d0 - 9 && gy(lx, d) < y) d -= 0.05; return d; };
  const pos = [], tri = (a, b, c, ox, oz) => {
    // (wound to face out of the rock: along (ox, oz), the column's own outward)
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
    if (nx * ox + nz * oz < 0) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
  };
  const KS = 7;
  for (let k = 0; k < 11; k++) {
    const lx = -4.3 + k * 0.86 + rr.range(-0.2, 0.2), w0 = rr.range(0.32, 0.62) * (k % 3 === 1 ? 1.35 : 1), q0 = rr.range(0.45, 0.95), hk = top * rr.range(0.62, 0.98), ph = rr.range(0, 9);
    let d0 = 3; while (d0 > -3 && gy(lx, d0) < 0.12) d0 -= 0.1;
    const rows = [];
    // (the flare: out over the floor at the foot, low and wide)
    rows.push({ y: 0.03, d: d0 + 1.0 + rr.range(0, 0.5), w: w0 * 1.9, q: 0.1 });
    for (let j = 0, y = 0.12; y < hk; j++, y += 0.45) {
      const t = y / hk, bul = 1 + 0.32 * Math.sin(j * 0.8 + ph) + 0.18 * Math.sin(j * 2.1 + ph * 1.7);
      rows.push({ y, d: at(lx, y, d0 + 0.2) + 0.04, w: w0 * bul * (0.55 + 0.6 * (1 - t)), q: q0 * bul * (0.5 + 0.7 * (1 - t)) });
    }
    rows.push({ y: hk + 0.3, d: at(lx, hk + 0.3, d0) + 0.02, w: w0 * 0.3, q: 0.05 });
    const ring = (r) => Array.from({ length: KS }, (_, i) => { const th = -Math.PI / 2 + (Math.PI * i) / (KS - 1); return [lx + r.w * Math.sin(th), r.y + (i === 0 || i === KS - 1 ? 0 : 0.02), r.d + r.q * Math.cos(th)]; });
    let prev = ring(rows[0]);
    for (let j = 1; j < rows.length; j++) {
      const cur = ring(rows[j]);
      for (let i = 0; i < KS - 1; i++) { const th = -Math.PI / 2 + (Math.PI * (i + 0.5)) / (KS - 1), ox = Math.sin(th), oz = Math.cos(th); tri(prev[i], prev[i + 1], cur[i], ox, oz); tri(prev[i + 1], cur[i + 1], cur[i], ox, oz); }
      prev = cur;
    }
  }
  // (the rows welded and smooth-shaded: bulging columns, not facets)
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo = mergeVertices(geo, 1e-3); geo.computeVertexNormals(); geo = geo.toNonIndexed();
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  B.put('icyFall', geo, TRS(p.x, 0, p.z, p.r));
  // the frozen pool: a glassy sheet over the thick ice at the foot, its rim ragged, lifting a little toward the columns
  const pr = [], N = 28, M = 5, R0 = 2.9, pc = 2.6;
  const rim = (a) => R0 * (0.82 + 0.3 * fbm(Math.cos(a) * 1.3 + 3, Math.sin(a) * 1.3, 77, 2));
  const pt = (a, f) => { const r = rim(a) * f, x = Math.sin(a) * r, d = pc + Math.cos(a) * r; return [x, 0.025 + 0.05 * (1 - f) + 0.12 * clamp(1 - d / 1.2, 0, 1), d]; };
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, f0 = j / M, f1 = (j + 1) / M;
    const A = pt(a0, f0), Bq = pt(a1, f0), C = pt(a0, f1), D = pt(a1, f1);
    pr.push(...A, ...C, ...Bq, ...Bq, ...C, ...D);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pr, 3)); pg.computeVertexNormals();
  // (an upward face: the triangles are wound so their normals rise)
  const pn = pg.attributes.normal; for (let i = 0; i < pn.count; i++) if (pn.getY(i) < 0) { pn.setXYZ(i, -pn.getX(i), -pn.getY(i), -pn.getZ(i)); }
  const pp = pg.attributes.position.array; for (let i = 0; i < pp.length; i += 9) { const ux = pp[i + 3] - pp[i], uz = pp[i + 5] - pp[i + 2], vx = pp[i + 6] - pp[i], vz = pp[i + 8] - pp[i + 2]; if (uz * vx - ux * vz < 0) for (let k = 0; k < 3; k++) { const t = pp[i + 3 + k]; pp[i + 3 + k] = pp[i + 6 + k]; pp[i + 6 + k] = t; } }
  pg.computeVertexNormals();
  pg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pg.attributes.position.count * 3).fill(1), 3));
  B.put('icyFall', pg, TRS(p.x, 0, p.z, p.r));
  for (let k = 0; k < 5; k++) { const lx = -4 + k * 2 + rr.range(-0.4, 0.4); let d = 2.5; while (d > -6 && gy(lx, d) < top * 0.55) d -= 0.25; I.add('icy:#icicles', p.x + cx * lx + fx * (d + 0.15), p.z + cz * lx + fz * (d + 0.15), p.r, rr.range(0.8, 1.3), gy(lx, d) - 0.1); }
}
// a berg: a great slab of old ice calved off the shelf (sheer, noisy walls leaning in a little, a snow-capped top that is
// nearly flat), two or three lesser slabs leaning against it, tilted; their walls smooth-shaded, their rims crisp. Its
// half-axes 1.15 r along local x and 0.95 r along z cover the ground's rise under it (gen5 bergH, kept under the slabs)
const BERG = {};
function slabGeo(rx, rz, h, rr, sink = 0.8) {
  const N = 11, rows = 5, pos = [], idx = [], out = [], off = rr.range(0, 9);
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; out.push([Math.cos(a), Math.sin(a), 0.84 + 0.3 * fbm(Math.cos(a) * 1.4 + off, Math.sin(a) * 1.4, 5, 2)]); }
  const top = out.map(() => h * (0.92 + rr.range(0, 0.1)));
  // the walls: rows from under the ice to the rim, each vertex pushed about by the calving
  for (let j = 0; j <= rows; j++) for (let i = 0; i < N; i++) {
    const t = j / rows, [c, sn, k] = out[i], lean = 1 - 0.1 * t, y = -sink + (top[i] + sink) * t, n = (j && j < rows) ? rr.range(-0.22, 0.22) : 0;
    pos.push(c * (rx * k * lean + n), y, sn * (rz * k * lean + n));
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < N; i++) { const a = j * N + i, b2 = j * N + (i + 1) % N, c = a + N, d = b2 + N; idx.push(a, c, b2, b2, c, d); }
  const walls = new THREE.BufferGeometry(); walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); walls.setIndex(idx); walls.computeVertexNormals();
  // the cap: its own vertices (a crisp rim), a little crowned
  const cp = [0, h * 1.02, 0], ci = [];
  for (let i = 0; i < N; i++) { const [c, sn, k] = out[i]; cp.push(c * rx * k * 0.9, top[i], sn * rz * k * 0.9); }
  for (let i = 0; i < N; i++) ci.push(0, 1 + (i + 1) % N, 1 + i);
  const cap = new THREE.BufferGeometry(); cap.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cap.setIndex(ci); cap.computeVertexNormals();
  return [walls.toNonIndexed(), cap.toNonIndexed()];
}
function bergGeo(r, hgt, seed) {
  const key = r.toFixed(1) + '|' + hgt.toFixed(1) + '|' + seed;
  if (BERG[key]) return BERG[key];
  const rr = RNG(seed), parts = [], H = hgt * rr.range(0.8, 0.95);
  for (const g of slabGeo(1.15 * r, 0.95 * r, H, rr)) parts.push(g);
  for (let k = 0, n = rr.int(2, 3); k < n; k++) {
    const a = rr.range(0, 6.28), d = r * rr.range(0.55, 0.85), s = r * rr.range(0.4, 0.6), m = TRS(Math.cos(a) * d, 0, Math.sin(a) * d, rr.range(0, 6.28), rr.range(-0.25, 0.25), 1, rr.range(-0.2, 0.2));
    for (const g of slabGeo(s * 1.1, s * 0.8, H * rr.range(0.35, 0.65), rr, 1.2)) parts.push(g.applyMatrix4(m));
  }
  for (const g of parts) { g.deleteAttribute('uv'); }
  const geo = mergeGeometries(parts, false);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  geo.computeBoundingSphere();
  return (BERG[key] = shared(geo));
}
// an anchor, shank and arms of black iron, its stock of wood (rotted away on the sunken one), tilted into the shingle
function anchorCode(p, B, stock) {
  const parts = [{ geo: G.cyl(0.07, 0.09, 1.9, 6), color: IRON, o: { y: 0.95 } }, { geo: G.torus(0.16, 0.035, 4, 9), color: IRON, o: { y: 2.02 } }];
  for (const s of [-1, 1]) parts.push({ geo: G.segTo(s * 0.55, 0.45, 0, 0.07, 0.05, 5), color: IRON, o: { y: 0.05 } }, { geo: G.cone(0.16, 0.32, 3), color: IRON, o: { x: s * 0.58, y: 0.55, rz: -s * 0.8 } });
  if (stock) parts.push({ geo: G.box(1.6, 0.14, 0.14), color: WOODD, o: { y: 1.75, ry: Math.PI / 2 } });
  B.put('iron', bake(parts), TRS(p.x, -0.25, p.z, p.r, p.tilt || 0.4));
}
// the Icebound Ship: a merchantman frozen in at a list, her masts broken, her sails frozen in rags, snow on her decks
function shipCode(p, B) {
  const len = 18.5, beam = 5.2, depth = 4.4;
  const hull = hullGeo(len, beam, depth, { seg: 20, strakes: 9, fine: 3.2, sheer: 0.3, tar: 0x221e1a, wood: 0x5a5248, frames: false, seed: 41 });
  const parts = [{ geo: G.box(beam * 0.86, 0.12, len * 0.78), color: WOODG, o: { y: depth * 0.82 }, snow: 0.9 }];
  // the stern castle, the bowsprit, the masts and their yards, the frozen rags of sail
  parts.push({ geo: G.box(beam * 0.8, 1.6, 4.0), color: WOODG, o: { y: depth * 0.82 + 0.8, z: -len / 2 + 2.6 }, snow: 0.9 }, { geo: G.box(beam * 0.84, 0.14, 4.2), color: WOODD, o: { y: depth * 0.82 + 1.65, z: -len / 2 + 2.6 }, snow: 0.9 });
  parts.push({ geo: G.cyl(0.14, 0.2, 7, 6), color: WOODD, o: { y: depth + 1.2, z: len / 2 + 1.4, rx: Math.PI / 2 - 0.4 } });
  for (const [z, h, broken] of [[4.2, 13, 0.55], [-1.5, 15, 1], [-6, 8, 0.4]]) {
    const hh = h * broken;
    parts.push({ geo: G.cyl(0.18, 0.26, hh, 7), color: WOODD, o: { y: depth * 0.82 + hh / 2, z } });
    if (broken > 0.5) {
      parts.push({ geo: G.cyl(0.09, 0.1, beam * 1.4, 5), color: WOODD, o: { y: depth * 0.82 + hh * 0.72, z, rz: Math.PI / 2 + 0.06 }, snow: 1.5 });
      parts.push({ geo: G.box(beam * 1.2, hh * 0.32, 0.05), color: 0x8a8478, o: { y: depth * 0.82 + hh * 0.55, z: z + 0.1, rz: 0.04 }, jit: 0.15, snow: 0.9 });
    }
  }
  for (const s of [-1, 1]) for (let z = -len / 2 + 5; z < len / 2 - 2; z += 1.1) parts.push({ geo: G.box(0.08, 0.7, 0.08), color: WOODD, o: { x: s * beam * 0.42, y: depth * 0.82 + 0.35, z } });
  B.put('planks5', withParts(hull, parts), TRS(p.x, -1.1, p.z, p.r, p.tilt || 0));
  // the ice heaped up round her waterline
  const ice = [];
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, rx = Math.sin(a) * (beam * 0.62), rz = Math.cos(a) * (len * 0.52); ice.push({ geo: jitter(G.dodeca(1.0), 0.25, 660 + k), color: 0xffffff, o: { x: rx, z: rz, y: -0.15, sy: 0.5, sx: 1.4, ry: a } }); }
  B.add('icy5', ice, p.x, p.z, p.r);
}

// ---------- act5Level ----------
export function act5Level(L, I, B, out) {
  mats5();
  if (L.type === 'coast') COAST_L = L;
  for (const p of L.props) {
    const f = PLACE[p.t];
    if (f) f(p, I, B, out, L); else console.warn('act5Level: no prop', p.t);
  }
  // sea smoke off the open water: one emitter per 16-metre square that holds enough of it, each with its own cells
  // (fx.js 'seasmoke' rises from a random one; the coast's tidal flats only where they stay deep)
  const { w, h } = L, sq = 16;
  for (let z0 = 0; z0 < h; z0 += sq) for (let x0 = 0; x0 < w; x0 += sq) {
    const cells = [];
    const water = (x, z) => { if (x < 0 || z < 0 || x >= w || z >= h) return true; const i = z * w + x; return !!(L.sea?.[i] || (L.bed && L.bed[i] < -0.25 && !L.ice[i] && !L.thick[i] && !L.window[i]) || (!L.bed && L.low[i])); };
    for (let z = z0; z < Math.min(h, z0 + sq); z += 2) for (let x = x0; x < Math.min(w, x0 + sq); x += 2) {
      if (!water(x, z)) continue;
      cells.push(x + 0.5, z + 0.5);
      // (the lip, where the water meets the ice or the shore, twice over: it breathes most there)
      if (!water(x - 2, z) || !water(x + 2, z) || !water(x, z - 2) || !water(x, z + 2)) cells.push(x + 0.5, z + 0.5);
    }
    if (cells.length >= 16) out.emitters.push({ x: x0 + sq / 2, z: z0 + sq / 2, y: 0, type: 'seasmoke', cells: Float32Array.from(cells), s: cells.length / 128 });
  }
}

// ---------- act5Prop: the story's props ----------
const solid5 = (parts, mat) => { const m = new THREE.Mesh(bake(parts), mat || MAT.lam); m.castShadow = true; m.receiveShadow = true; return m; };
const halo = (c, s) => { const h = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: tex('dot'), color: c, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))); h.scale.setScalar(s); return h; };
// a fire's flames: three or four flame cards round its bed, each with its own flicker, the middle one tallest (s: height)
// (Act V's flame: the Act IV flame's shape in a fire's own colours, orange at its skirt, yellow-white only at the core: the
// white cone read as a lamp's bulb in the cage)
function flame5(s, color) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(bake([{ geo: G.cone(0.1, 0.34, 6), color: 0xff8a30, o: { y: 0.17 } }, { geo: G.cone(0.065, 0.24, 5), color: 0xffc860, o: { y: 0.13 } }, { geo: G.cone(0.035, 0.13, 5), color: 0xfff0c8, o: { y: 0.08 } }]), glowMat(0xffffff));
  const halo = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: tex('dot'), color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
  halo.scale.setScalar(1.4); halo.position.y = 0.18;
  g.add(f, halo); g.scale.setScalar(s);
  let t = Math.random() * 10;
  f.onBeforeRender = () => { t += 0.05; f.scale.set(1 + Math.sin(t * 3.1) * 0.08, 1 + Math.sin(t * 4.7) * 0.15, 1 + Math.cos(t * 3.7) * 0.08); };
  g.userData.halo = halo;
  return g;
}
function flames(s, color) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const f = flame5(s * (k ? 0.62 + k * 0.08 : 1), color), a = k * 2.1;
    if (k) { f.position.set(Math.sin(a) * s * 0.07, 0, Math.cos(a) * s * 0.07); f.rotation.y = a; f.userData.halo.visible = false; }
    g.add(f);
  }
  return g;
}
// a fire's life while it is lit: flames, embers and a thread of smoke from the fx pools, and a warm light that reaches
// round it (gfx.js's pooled lights), run through sea.js TICKS while the prop stands in the scene. at: the fire's bed in the
// prop's frame. Returns set(b)
function fireLife(g, at, o = {}) {
  const fx = [{ type: 'fire', s: o.s ?? 1, y0: 0 }, { type: 'embers', s: 1, y0: 0.2 }];
  if (o.smoke) fx.push({ type: 'smoke', s: 1, y0: 0.9 * (o.s ?? 1) });
  const p = new THREE.Vector3();
  let lit = false, light = null;
  TICKS.add({ obj: g, tick(dt) {
    if (!lit) return;
    g.updateWorldMatrix(true, false); p.set(at.x || 0, at.y || 0, at.z || 0).applyMatrix4(g.matrixWorld);
    for (const e of fx) { e.x = p.x; e.y = p.y + e.y0; e.z = p.z; emitAt(e, dt); }
    if (!light || !R.sources.has(light)) light = addLight({ x: p.x, y: p.y + 0.7, z: p.z, color: o.color ?? 0xff9a50, intensity: o.i ?? 20, range: o.range ?? 10, flicker: 0.32 });
    else { light.x = p.x; light.y = p.y + 0.7; light.z = p.z; }
  } });
  return (b) => { lit = !!b; if (!lit && light) { removeLight(light); light = null; } };
}
// an iron fire-basket on a stone lip: bars round a bed of coals, a flame and a halo when lit. { group, y (the fire), set(b),
// k(k) brightness 0-1+ }
// o: { life: { s, i, range, smoke } (its flames, embers, smoke and light: fireLife), ember (a dim glow in the coals while
// it is dark, laid and ready) }
function fireCage(r = 0.5, h = 0.75, flame = 1.6, haloS = 4, color = 0xffc070, o = {}) {
  const g = new THREE.Group();
  // (sooted iron, the bars thick enough to read from the play camera)
  const bars = [{ geo: G.torus(r, 0.055, 5, 14), color: 0x1c1a1a, o: { rx: Math.PI / 2 } }, { geo: G.torus(r * 1.18, 0.05, 5, 14), color: 0x1c1a1a, o: { y: h, rx: Math.PI / 2 } }, { geo: G.cyl(r * 0.95, r * 0.75, 0.12, 10), color: 0x161414, o: { y: 0.02 } }];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; bars.push({ geo: G.segTo(Math.sin(a) * r * 0.18, h, Math.cos(a) * r * 0.18, 0.045, 0.04, 4), color: 0x201e1c, o: { x: Math.sin(a) * r, z: Math.cos(a) * r } }); }
  g.add(solid5(bars, MAT.iron));
  const coal = glowMat(0x2a1a10), bed = new THREE.Mesh(jitter(G.dome(r * 0.88, 0.22, 8), 0.04, 731), coal); bed.position.y = 0.08; g.add(bed);
  const fl = flames(flame * 1.9, color); fl.position.y = 0.16; g.add(fl);
  const ha = halo(color, haloS); ha.position.y = 0.7; g.add(ha);
  const life = o.life ? fireLife(g, { y: 0.3 }, o.life) : null;
  const C0 = new THREE.Color(0xff8a30), C1 = new THREE.Color(o.ember ? 0x5a1c06 : 0x2a1a10);
  let lit = false, kk = 0;
  const set = (b) => { lit = !!b; coal.color.copy(lit ? C0 : C1); fl.visible = ha.visible = lit; ha.material.opacity = 0.8 + kk * 0.2; life?.(lit); };
  set(false);
  return { group: g, y: 0.2, set, k(k) { kk = k; ha.scale.setScalar(haloS * (1 + k * 0.8)); fl.scale.setScalar(1 + k * 0.25); ha.material.opacity = Math.min(1, 0.8 + k * 0.2); }, get lit() { return lit; } };
}
// a beam on a prop: lazily made (sea.js beamMesh) at local y, its direction a world angle (the prop's own turn taken off);
// ticked through sea.js (motes, its cut-off past 45 m) while it shows. setBeam(null) hides it
function beamOn(g, y, o = {}) {
  let beam = null, tk = null;
  return (theta) => {
    if (theta == null || theta === false) { if (beam) { beam.visible = false; beam.userData.setK(0); } if (tk) TICKS.delete(tk); return null; }
    if (!beam) { beam = beamMesh({ y: y + (o.base || 0), len: o.len, r1: o.r1, color: o.color }); beam.position.y = y; g.add(beam); g.userData.beam = beam; tk = { obj: g, tick: (dt) => beam.userData.tick(dt) }; }
    beam.visible = true; beam.userData.setK(o.k ?? 1); TICKS.add(tk);
    beam.userData.setDir(theta - g.rotation.y);
    return beam;
  };
}
// a stone tower (the sea-lights, the Skerry Light, the Farthest Light): o { r0, r1 (base and top radius), h, broken (a
// jagged top), door (a doorway to local +z), seed }. Returns the mesh
function towerMesh(o) {
  const r0 = o.r0 ?? 1.6, r1 = o.r1 ?? 1.35, h = o.h ?? 9, rr = RNG(o.seed || 5), parts = [];
  parts.push({ geo: jitter(G.cyl(r1, r0, h, 14, 1), 0.05, 700 + (o.seed || 0)), color: GREY, o: { y: h / 2 } });
  // string courses, a plinth, slit windows, the door
  for (const y of [0.35, h * 0.38, h * 0.72]) { const r = r0 + (r1 - r0) * (y / h) + 0.08; parts.push({ geo: G.cyl(r, r + 0.03, 0.22, 14), color: STONED, o: { y } }); }
  parts.push({ geo: jitter(G.cyl(r0 + 0.35, r0 + 0.5, 0.6, 12), 0.08, 711), color: STONED, o: { y: 0.15 } });
  for (let k = 0; k < 4; k++) { const a = rr.range(0, 6.28), y = h * (0.3 + k * 0.17), r = r0 + (r1 - r0) * (y / h); parts.push({ geo: G.box(0.18, 0.7, 0.2), color: 0x141210, o: { x: Math.sin(a) * r, y, z: Math.cos(a) * r, ry: a } }); }
  if (o.door) parts.push({ geo: G.box(0.95, 1.9, 0.3), color: 0x121010, o: { y: 0.95, z: r0 - 0.08 } }, { geo: G.box(1.25, 0.25, 0.42), color: STONEL, o: { y: 2.0, z: r0 - 0.02 } });
  if (o.broken) for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2 + rr.range(-0.1, 0.1), bh = rr.range(0.2, 1.2) * (k % 3 ? 1 : 0.3); parts.push({ geo: G.box(0.85, bh, 0.5), color: k % 2 ? GREY : STONEL, o: { x: Math.sin(a) * (r1 - 0.2), y: h + bh / 2, z: Math.cos(a) * (r1 - 0.2), ry: a }, jit: 0.15 }); }
  for (let k = 0; k < 5; k++) { const a = rr.range(0, 6.28), d = r0 + rr.range(0.6, 1.6); parts.push({ geo: jitter(G.dodeca(rr.range(0.25, 0.5)), 0.08, 720 + k), color: STONED, o: { x: Math.sin(a) * d, y: 0.12, z: Math.cos(a) * d } }); }
  const m = new THREE.Mesh(bake(parts), MAT.cliff5); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// a tower scan's stone weathered for the coast: greyed and darkened (the farLight scan's pale render read as birch bark),
// mottled by the weather at a metre's scale, snow on its ledges and rime on its north side (cached per material)
const WEATHER = new Map();
function weathered(mat) {
  if (!mat || mat.transparent || /glow/i.test(mat.name)) return mat;
  if (WEATHER.has(mat)) return WEATHER.get(mat);
  const m = mat.clone();
  occlude(m, (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTwN; varying vec3 vTwP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vTwN = normalize(mat3(modelMatrix) * objectNormal); vTwP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vTwN; varying vec3 vTwP;\nfloat twH(vec3 p) { return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }')
      .replace('#include <map_fragment>', `#include <map_fragment>
  {
    float l = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
    vec3 q = vTwP * vec3(1.4, 2.6, 1.4);
    float mot = mix(twH(q), twH(q + 0.5), 0.5) * 0.5 + twH(vTwP * 0.35) * 0.5;
    diffuseColor.rgb = mix(vec3(l), diffuseColor.rgb, 0.4) * vec3(0.66, 0.68, 0.72) * (0.78 + 0.34 * mot);
    float sn = smoothstep(0.55, 0.85, vTwN.y + (mot - 0.5) * 0.3) + smoothstep(0.55, 0.95, -vTwN.z) * smoothstep(0.35, 0.7, mot) * 0.4;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.78, 0.84), clamp(sn, 0.0, 0.85));
  }`);
  });
  m.customProgramCacheKey = () => 'weather|' + mat.uuid;
  WEATHER.set(mat, m);
  return m;
}
// a rime tower scan fitted to height h: { mesh group, top (y of its cut top) } or null
function rimeTower(name, h) {
  const parts = rime(name), sz = size4(parts); if (!sz) return null;
  const k = h / Math.max(0.01, sz.y), g = new THREE.Group();
  for (const p of parts) { const m = new THREE.Mesh(p.geo, weathered(p.mat)); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  g.scale.setScalar(k); g.position.y = -sz.y0 * k;
  const top = ENV.extras['rime/' + name]?.top;
  return { group: g, top: top != null ? (top - sz.y0) * k : h };
}
// the lantern room: a corbelled stone gallery and its parapet, the glass ring with the iron fire-cage inside, an iron cap
// (local y 0 at the gallery's floor). userData.setLit(b), fireY
function lanternRoom(o = {}) {
  const g = new THREE.Group(), s = o.s ?? 1;
  g.add(solid5([{ geo: G.cyl(1.9 * s, 1.45 * s, 0.5, 14), color: STONED, o: { y: 0.0 } }, { geo: G.cyl(1.95 * s, 1.95 * s, 0.14, 14), color: STONEL, o: { y: 0.3 } },
    ...Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return { geo: G.box(0.5 * s, 0.55, 0.22), color: GREY, o: { x: Math.sin(a) * 1.82 * s, y: 0.62, z: Math.cos(a) * 1.82 * s, ry: a } }; })], MAT.cliff5));
  const glass = own(new THREE.MeshBasicMaterial({ color: 0x223040, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const ring = new THREE.Mesh(G.cyl(1.05 * s, 1.05 * s, 1.5, 12), glass); ring.position.y = 1.15; ring.renderOrder = 3; g.add(ring);
  const iron = [{ geo: G.cone(1.35 * s, 1.1, 12), color: IRON, o: { y: 2.45 } }, { geo: G.ball(0.16, 6, 4), color: IRON, o: { y: 3.08 } }];
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; iron.push({ geo: G.box(0.06, 1.55, 0.06), color: IRON, o: { x: Math.sin(a) * 1.07 * s, y: 1.15, z: Math.cos(a) * 1.07 * s } }); }
  g.add(solid5(iron, MAT.iron));
  const fire = fireCage(0.42 * s, 0.6, 1.5, 5.5, o.color ?? 0xffd890, { life: { s: 0.8, i: 24, range: 14 }, ember: true }); fire.group.position.y = 0.45; g.add(fire.group);
  const cLit = new THREE.Color(0xffd8a0), cDark = new THREE.Color(0x223040);
  // (lit, the lantern blazes: a great soft halo round the glass and a thin flare streaking across it, as a lens sees it)
  const glare = halo(0xffe2b8, 9 * s); glare.position.y = 1.2; glare.material.opacity = 0.55; g.add(glare);
  const streak = halo(0xfff0d8, 1); streak.scale.set(15 * s, 0.55 * s, 1); streak.position.y = 1.2; streak.material.opacity = 0.5; g.add(streak);
  g.userData.setLit = (b) => { fire.set(b); glass.color.copy(b ? cLit : cDark); glass.opacity = b ? 0.55 : 0.35; glare.visible = streak.visible = !!b; g.userData.lit = !!b; };
  glare.visible = streak.visible = false;
  g.userData.flash = (k) => fire.k(k);
  g.userData.fireY = 0.65;
  return g;
}
// a pile of n rocks round the origin (d0-d1 out, s0-s1 wide) in the sea-cliff stone: the base set's rock scans where they
// are loaded (each a copy coloured for the stone, merged), else faceted code stones
function rockPile(seed, n, d0, d1, s0, s1, sy = 0.8, y = -0.25) {
  const rr = RNG(seed), parts = [], names = ROCKS.filter((k) => ENV.props[k]);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rr.range(-0.2, 0.2), d = rr.range(d0, d1), s = rr.range(s0, s1);
    if (names.length) {
      const nm = names[k % names.length], f = fit(nm, s * 1.6, 'w');
      for (const p of ENV.props[nm]) parts.push({ geo: withVC(p.geo).clone().applyMatrix4(TRS(Math.sin(a) * d, y - f.y0 * sy, Math.cos(a) * d, rr.range(0, 6.28), rr.range(-0.2, 0.2)).multiply(new THREE.Matrix4().makeScale(f.k, f.k * sy, f.k))) });
    } else parts.push({ geo: bake([{ geo: jitter(G.dodeca(s), 0.25, 730 + k), color: k % 2 ? GREY : STONED, o: { x: Math.sin(a) * d, z: Math.cos(a) * d, y: y + 0.55, sy: 0.75 } }]) });
  }
  const m = new THREE.Mesh(mergeGeometries(parts.map((p) => strip(p.geo)), false), MAT.cliff5); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// (position, normal and colour only, so scans and code stones merge)
const strip = (g) => { const o = new THREE.BufferGeometry(), src = g.index ? g.toNonIndexed() : g; for (const k of ['position', 'normal', 'color']) if (src.attributes[k]) o.setAttribute(k, src.attributes[k]); if (!o.attributes.normal) o.computeVertexNormals(); if (!o.attributes.color) o.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(o.attributes.position.count * 3).fill(0.144), 3)); return o; };
// a bell hanging from a beam: the bell swings and fades (ring(k), k its strength)
function bellMesh(s = 1, cracked = false) {
  const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot);
  const pts = [[0, 0.02], [0.2, 0.0], [0.22, 0.06], [0.18, 0.2], [0.14, 0.36], [0.1, 0.42], [0, 0.44]].map(([a, b]) => [a * s * 2, (b - 0.44) * s * 2]);
  const bell = solid5([{ geo: G.lathe(pts, 12), color: cracked ? 0x4a5a48 : 0x7a5a30, o: {} }, { geo: G.ball(0.07 * s, 6, 4), color: IRON, o: { y: -0.8 * s } }, ...(cracked ? [{ geo: G.box(0.02, 0.35 * s, 0.02), color: 0x101010, o: { x: 0.28 * s, y: -0.55 * s, rz: 0.3 } }] : [])], MAT.iron);
  pivot.add(bell);
  let t0 = -99, amp = 0;
  bell.onBeforeRender = () => { const t = R.time - t0; pivot.rotation.z = amp * Math.exp(-t * 1.1) * Math.sin(t * 6.5); };
  g.userData.ring = (k = 1) => { t0 = R.time; amp = 0.45 * clamp(k, 0, 1.5); };
  return g;
}
// runes cut in a stone's face: a dark cut (normal blending) and its glow (additive, shown when lit), w x h at (0, y, z)
function runeFace(seed, w, h, y, z, rows, color = 0xffc070) {
  const map = runeLines(seed, rows), geo = new THREE.PlaneGeometry(w, h);
  const cut = new THREE.Mesh(geo, own(new THREE.MeshBasicMaterial({ map, color: 0x0e0c0a, transparent: true, opacity: 0.62, depthWrite: false })));
  const glow = new THREE.Mesh(geo, own(new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
  for (const m of [cut, glow]) { m.position.set(0, y, z); m.renderOrder = 2; }
  glow.visible = false;
  return { cut, glow };
}
const PROP5 = {
  // a sea-light: the ruined tower on its rock (o.v 0-2: towerA-C), its fire-cage on the cut top
  sealight(o) {
    const g = new THREE.Group(), v = o.v ?? 0, H = [9.2, 10.4, 8.4][v % 3];
    const sc = rimeTower(['towerA', 'towerB', 'towerC'][v % 3], H);
    let top = H;
    if (sc) { g.add(sc.group); top = sc.top; } else g.add(towerMesh({ h: H, r0: 1.65, r1: 1.4, broken: true, door: true, seed: v + 1 }));
    // (a broad iron brazier on a stone cap over the ruin's open top)
    g.add(solid5([{ geo: jitter(G.cyl(1.25, 1.15, 0.28, 12), 0.04, 735), color: STONED, o: { y: top - 0.1 } }, { geo: G.cyl(0.85, 0.95, 0.12, 12), color: STONEL, o: { y: top + 0.08 } }], MAT.cliff5));
    const fire = fireCage(0.62, 0.8, 1.9, 6.5, 0xffc070, { life: { s: 1.0, i: 22, range: 13, smoke: true } }); fire.group.position.y = top + 0.14; g.add(fire.group);
    g.userData.top = top; g.userData.fireY = top + 0.14 + fire.y;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; if (!b) g.userData.setBeam(null); };
    g.userData.setBeam = beamOn(g, top + 0.6);
    g.userData.flash = (k) => fire.k(k);
    return g;
  },
  // the Walking Tower's own light: towerC with a lantern room and a cracked bell; on its island (rock and all) unless o.back
  // (on the crab's back: actors.js)
  skerryLight(o) {
    const g = new THREE.Group(), back = !!o.back, base = back ? 0 : 1.3, H = back ? 5.5 : 6.2;
    if (!back) g.add(rockPile(17, 12, 1.2, 3.6, 0.9, 1.6));
    const sc = rimeTower('towerC', H), tw = new THREE.Group(); tw.position.y = base; g.add(tw);
    let top = H;
    if (sc) { tw.add(sc.group); top = sc.top; } else tw.add(towerMesh({ h: H, r0: 1.3, r1: 1.15, door: false, seed: 9 }));
    const room = lanternRoom({ s: 0.75 }); room.position.y = base + top; g.add(room);
    const bell = bellMesh(0.8, true); bell.position.set(1.25, base + top + 0.1, 0); g.add(bell);
    g.add(solid5([{ geo: G.box(1.0, 0.08, 0.08), color: IRON, o: { x: 1.2, y: base + top + 0.12 } }], MAT.iron));
    g.userData.top = base + top; g.userData.fireY = base + top + room.userData.fireY;
    g.userData.setLit = (b) => { room.userData.setLit(b); g.userData.lit = !!b; if (!b) g.userData.setBeam(null); };
    g.userData.setBeam = beamOn(g, base + top + 1.1);
    g.userData.ring = (k) => bell.userData.ring(k);
    return g;
  },
  // the Farthest Light: the tall shaft (the rime farLight scan, or code) and its lantern room; the door to local +z
  farLight() {
    const g = new THREE.Group(), H = 15.5, sc = rimeTower('farLight', H);
    let top = H;
    if (sc) { g.add(sc.group); top = sc.top; } else g.add(towerMesh({ h: H, r0: 1.7, r1: 1.2, door: true, seed: 21 }));
    // (seated on a stepped stone base; its cut top capped under the lantern room, so it is never seen hollow)
    g.add(solid5([{ geo: jitter(G.cyl(2.25, 2.45, 0.45, 14), 0.05, 751), color: STONED, o: { y: 0.12 } }, { geo: jitter(G.cyl(1.95, 2.1, 0.4, 14), 0.04, 752), color: GREY, o: { y: 0.5 } }, { geo: G.cyl(1.32, 1.32, 0.3, 14), color: STONED, o: { y: top - 0.2 } }], MAT.cliff5));
    const room = lanternRoom({ s: 0.95 }); room.position.y = top; g.add(room);
    const dx = ENV.extras['rime/farLight']?.door;
    g.userData.top = top; g.userData.fireY = top + room.userData.fireY;
    g.userData.door = dx ? { x: dx[0] ?? 0, z: dx[2] ?? 1.7 } : { x: 0, z: 1.75 };
    // (a glow in the doorway: an ember's red while the Light is dark, warm once it is lit)
    const dg = glowMat(0x2a0e04), dm = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), dg);
    dm.position.set(g.userData.door.x, 1.05, g.userData.door.z - 0.12); g.add(dm);
    const dh = halo(0xffa050, 2.6); dh.position.set(g.userData.door.x, 1.0, g.userData.door.z + 0.4); dh.visible = false; g.add(dh);
    g.userData.setLit = (b) => { room.userData.setLit(b); dg.color.set(b ? 0xffb060 : 0x2a0e04); dh.visible = !!b; g.userData.lit = !!b; if (!b) g.userData.setBeam(null); };
    g.userData.setBeam = beamOn(g, top + 1.1, { k: 1.2 });
    g.userData.flash = (k) => room.userData.flash(k);
    return g;
  },
  lanternRoom(o) { return lanternRoom(o); },
  // the Landing's hearth: a ring of stones, driftwood laid in it, a stout iron tripod over it with the pot on its hook;
  // lit, a real fire (flames, embers, its smoke) that warms the huts round it
  hearth() {
    const g = new THREE.Group(), rr = RNG(23);
    g.add(rockPile(41, 9, 0.78, 0.86, 0.26, 0.34, 0.8, -0.05));
    const wood = [];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + rr.range(-0.2, 0.2); wood.push({ geo: G.cyl(0.07, 0.1, 1.05, 6), color: k % 2 ? 0x6a5a48 : 0x4a3e32, o: { x: Math.sin(a) * 0.2, y: 0.22, z: Math.cos(a) * 0.2, rx: Math.cos(a) * 0.9, rz: -Math.sin(a) * 0.9 } }); }
    g.add(solid5(wood));
    const iron = [];
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; iron.push({ geo: G.segTo(-Math.sin(a) * 0.62, 1.6, -Math.cos(a) * 0.62, 0.045, 0.035, 5), color: 0x1e1c1a, o: { x: Math.sin(a) * 0.66, z: Math.cos(a) * 0.66 } }); }
    iron.push({ geo: G.cyl(0.018, 0.018, 0.42, 4), color: 0x1e1c1a, o: { y: 1.38 } }, { geo: G.lathe([[0, 0], [0.24, 0.03], [0.3, 0.17], [0.29, 0.32], [0.24, 0.38]], 10), color: 0x262220, o: { y: 0.84 } }, { geo: G.torus(0.25, 0.022, 4, 10), color: 0x1e1c1a, o: { y: 1.2, rx: Math.PI / 2 } });
    g.add(solid5(iron, MAT.iron));
    const coal = glowMat(0x2a1a10), bed = new THREE.Mesh(jitter(G.dome(0.5, 0.2, 9), 0.05, 742), coal); bed.position.y = 0.02; g.add(bed);
    const fl = flames(2.8, 0xffb060); fl.position.y = 0.1; g.add(fl);
    const ha = halo(0xffa050, 5.5); ha.position.y = 0.8; g.add(ha);
    const life = fireLife(g, { y: 0.3 }, { s: 1.2, i: 30, range: 12.5, smoke: true });
    g.userData.fireY = 0.4;
    g.userData.setLit = (b) => { coal.color.set(b ? 0xff7a28 : 0x2a1a10); fl.visible = ha.visible = !!b; g.userData.lit = !!b; life(b); };
    g.userData.setLit(false);
    return g;
  },
  // a fire-cairn: the base set's rock scans stacked in a ring in the cliff stone, an iron basket on top, embers kept in it
  cairn() {
    const g = new THREE.Group();
    g.add(rockPile(57, 7, 0.55, 0.7, 0.42, 0.55, 1.0, -0.06));
    g.add(rockPile(58, 5, 0.28, 0.4, 0.34, 0.44, 1.0, 0.36));
    const fire = fireCage(0.42, 0.5, 1.4, 4.2, 0xffb060, { life: { s: 0.75, i: 16, range: 9, smoke: true }, ember: true }); fire.group.position.y = 0.86; g.add(fire.group);
    g.userData.fireY = 0.86 + fire.y;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; };
    return g;
  },
  // a Breathing-hole's marker-lamp on its pad: an iron post, its crook, the lantern; setHeld(b): Alkyone shields it
  holeLamp() {
    const g = new THREE.Group();
    g.add(solid5([{ geo: G.cyl(0.32, 0.38, 0.14, 8), color: STONED, o: { y: 0.07 } }], MAT.cliff5));
    g.add(solid5([{ geo: G.cyl(0.04, 0.055, 1.7, 6), color: IRON, o: { y: 0.85 } }, { geo: G.box(0.55, 0.04, 0.04), color: IRON, o: { x: 0.25, y: 1.68 } }, { geo: G.cyl(0.008, 0.008, 0.12, 3), color: IRON, o: { x: 0.48, y: 1.6 } }], MAT.iron));
    const lan = lanternMesh(0.42); lan.position.set(0.48, 1.12, 0); g.add(lan);
    const fl = flameMesh(0.45, 0xffc070); fl.position.set(0.48, 1.2, 0); g.add(fl);
    const ha = halo(0xffb060, 2.2); ha.position.set(0.48, 1.32, 0); g.add(ha);
    let lit = false, held = false;
    const look = () => { lan.userData.glass.color.copy(lit ? LIT5 : DEAD5); fl.visible = ha.visible = lit; ha.material.color.set(held ? 0xfff4e0 : 0xffb060); ha.scale.setScalar(held ? 3.2 : 2.2); };
    g.userData.setLit = (b) => { lit = !!b; g.userData.lit = lit; look(); };
    g.userData.setHeld = (b) => { held = !!b; look(); };
    g.userData.flameAt = { x: 0.48, y: 1.3, z: 0 };
    look();
    return g;
  },
  // a sealed hole's marker-light: a cairn of ice blocks, a pole, the lantern at its head and a short beam
  markerLight() {
    const g = new THREE.Group(), st = [];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; st.push({ geo: jitter(G.dodeca(0.35), 0.08, 780 + k), color: 0xffffff, o: { x: Math.sin(a) * 0.45, z: Math.cos(a) * 0.45, y: 0.2, sy: 0.8 } }); }
    const ice = new THREE.Mesh(bake(st), MAT.icy5); ice.castShadow = true; g.add(ice);
    g.add(solid5([{ geo: G.cyl(0.05, 0.07, 3.0, 6), color: IRON, o: { y: 1.5 } }], MAT.iron));
    const lan = lanternMesh(0.5); lan.position.set(0, 3.0, 0); g.add(lan);
    const fl = flameMesh(0.5, 0xfff0d0); fl.position.set(0, 3.08, 0); g.add(fl);
    const ha = halo(0xfff0d0, 3); ha.position.set(0, 3.2, 0); g.add(ha);
    g.userData.setLit = (b) => { lan.userData.glass.color.set(b ? 0xfff0d0 : 0x15130f); fl.visible = ha.visible = !!b; g.userData.lit = !!b; if (!b) g.userData.setBeam(null); };
    g.userData.setBeam = beamOn(g, 3.2, { len: 12, r1: 2.2, k: 0.7, color: 0xfff4e0 });
    g.userData.setLit(true);
    return g;
  },
  // a Name-stone: the runestone (rime) or a code slab, name-lines cut in its face that glow when it is lit, a lamp in a
  // niche at its foot (local +z its face)
  nameStone(o) {
    const g = new THREE.Group(), parts = rime('runestone'), sz = size4(parts);
    let face = 0.2, hgt = 2.0;
    if (sz) { const k = 2.1 / Math.max(0.01, sz.y); for (const p of parts) { const m = new THREE.Mesh(p.geo, p.mat); m.scale.setScalar(k); m.position.y = -sz.y0 * k; m.castShadow = true; g.add(m); } face = (sz.z * k) / 2 + 0.01; hgt = 2.1; }
    else g.add(solid5([{ geo: jitter(G.box(0.9, 1.85, 0.36, 2, 3, 1), 0.04, 790 + (o.id?.length || 0)), color: GREY, o: { y: 0.95 } }, { geo: jitter(G.dome(0.45, 0.5, 8), 0.04, 791), color: GREY, o: { y: 1.86, sz: 0.4 } }, { geo: jitter(G.box(1.3, 0.3, 0.8), 0.06, 792), color: STONED, o: { y: 0.12 } }], MAT.cliff5));
    // (the names cut in its face: rows of runes, dark in the stone; lit, a soft glow from inside the strokes, the stone's
    // own scanned face round them)
    const { cut, glow } = runeFace(o.id?.length || 1, 0.66, 0.96, hgt * 0.4 + 0.48, face + 0.03, 4);
    g.add(cut, glow);
    const niche = lanternMesh(0.24); niche.position.set(0.32, 0.27, face + 0.18); g.add(niche);
    const fl = flameMesh(0.28, 0xffc070); fl.position.set(0.32, 0.32, face + 0.18); g.add(fl);
    const ha = halo(0xffc070, 1.6); ha.position.set(0, hgt * 0.62, face + 0.2); g.add(ha);
    g.userData.setLit = (b) => { glow.visible = !!b; cut.material.opacity = b ? 0.35 : 0.62; niche.userData.glass.color.copy(b ? LIT5 : DEAD5); fl.visible = ha.visible = !!b; g.userData.lit = !!b; };
    g.userData.setLit(false);
    return g;
  },
  // the door-stone of the Farthest Light: Einar's and Arna's names cut in it; setCarved(b) adds Ivar's and Isarn's
  doorStone() {
    const g = new THREE.Group();
    g.add(solid5([{ geo: jitter(G.box(1.3, 2.15, 0.34, 2, 3, 1), 0.03, 800), color: STONEL, o: { y: 1.075 } }, { geo: G.box(1.6, 0.2, 0.6), color: STONED, o: { y: 0.1 } }], MAT.cliff5));
    // (Einar's and Arna's names, old and cold in the stone; the carving adds Ivar's and Isarn's below, fresh and warm)
    const old = runeFace(801, 1.0, 0.5, 1.43, 0.18, 2, 0x8a96a8), fresh = runeFace(803, 1.0, 0.5, 0.83, 0.18, 2, 0xffd8a0);
    old.glow.visible = true; old.glow.material.opacity = 0.45; g.add(old.cut, old.glow, fresh.glow);
    const carved = fresh.glow;
    g.userData.setCarved = (b) => { carved.visible = !!b; g.userData.carved = !!b; };
    g.userData.setCarved(false);
    return g;
  },
  // the pit under an ice window (its 2 x 2 cells, which the ground leaves open: the thick ice round it lies flat to their
  // edge): the pit's walls of old blue ice down to the figure, its floor, a small cold light in it (the Drowned Lights'
  // windows: o.drowned, a warm lantern lies below instead)
  iceWindow(o) {
    const g = new THREE.Group(), d = 2.2, parts = [];
    // (the pit's walls pale only at the top: lower down the ice is dark, so the pane reads as a shaft into deep water, not a
    // lit glass case)
    for (const [x, z, w, dd] of [[0, -1.02, 2.1, 0.06], [0, 1.02, 2.1, 0.06], [-1.02, 0, 0.06, 2.1], [1.02, 0, 0.06, 2.1]]) {
      parts.push({ geo: G.box(w, 0.5, dd), color: 0xc8d4dc, o: { x, y: -0.26, z } });
      parts.push({ geo: G.box(w, d - 0.5, dd), color: 0x3a4652, o: { x, y: -0.5 - (d - 0.5) / 2 - 0.01, z } });
    }
    parts.push({ geo: G.box(2, 0.1, 2), color: 0x1c242c, o: { y: -d - 0.05 } });
    // (the window's cells lie square to the grid whatever way the prop is turned: this part takes the turn off again)
    const inner = new THREE.Group(); g.add(inner);
    inner.updateMatrixWorld = function (f) { this.rotation.y = -g.rotation.y; THREE.Object3D.prototype.updateMatrixWorld.call(this, f); };
    const m = new THREE.Mesh(bake(parts), MAT.icy5); m.receiveShadow = true; inner.add(m);
    if (!o.drowned) { const c = halo(0x9ad8ff, 1.1); c.position.y = -d + 0.5; g.add(c); }
    g.userData.figureY = -d;
    return g;
  },
  stiltHut() { const B = soloBatch(); stiltHut({ x: 0, z: 0, r: 0 }, B); return B.mesh(); },
  rack() { const B = soloBatch(); rackCode({ x: 0, z: 0, r: 0 }, { add() {} }, B); return B.mesh(); },
  pole() { return new THREE.Mesh(CODE5.pole().geo, MAT.lam); },
  // a keel-boat drawn up (the rime scan or the code hull); setLevel(h): it floats and rides the swell once the water under
  // it is deep enough
  boat() {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const parts = rime('keelboat'), sz = size4(parts);
    if (sz) { const k = 5.2 / Math.max(0.01, sz.x, sz.z); for (const p of parts) { const m = new THREE.Mesh(p.geo, p.mat); m.scale.setScalar(k); m.position.y = -sz.y0 * k; if (sz.x > sz.z) m.rotation.y = Math.PI / 2; m.castShadow = true; body.add(m); } }
    else { const m = new THREE.Mesh(boatGeoC('landing'), MAT.planks5); m.castShadow = true; m.receiveShadow = true; body.add(m); }
    body.rotation.z = 0.06; body.position.y = -0.04;
    let bed = null;
    g.userData.setLevel = (h) => {
      if (bed == null) bed = bedAt(COAST_L, g.position.x, g.position.z);
      const d = h - bed - 0.18, k = clamp(d / 0.25, 0, 1), t = R.time;
      body.position.y = -0.04 + Math.max(0, d) * 0.9 + k * swellY(g.position.x, g.position.z, t) * 0.05;
      body.rotation.z = lerp(0.06, Math.sin(t * 0.9 + g.position.x) * 0.04, k); body.rotation.x = k * Math.sin(t * 0.7 + g.position.z) * 0.025;
    };
    return g;
  },
  floe() { const geo = new THREE.CylinderGeometry(0.42, 0.5, 0.12, 6, 1); return new THREE.Mesh(geo, iceMat({ floe: true })); },
  // the tide bell on its gallows by the jetty's root
  bell() {
    const g = new THREE.Group();
    g.add(solid5([{ geo: G.cyl(0.08, 0.1, 2.5, 6), color: WOODD, o: { y: 1.25 } }, { geo: G.box(0.1, 0.1, 1.0), color: WOODD, o: { y: 2.42, z: 0.4 } }, { geo: G.segTo(0, 0.5, 0.45, 0.04, 0.04, 4), color: WOODD, o: { y: 1.9 } }, ...[0, 1, 2].map((i) => ({ geo: jitter(G.dodeca(0.2), 0.05, 810 + i), color: STONED, o: { x: Math.sin(i * 2.1) * 0.22, z: Math.cos(i * 2.1) * 0.22, y: 0.1 } }))], MAT.planks5));
    const b = bellMesh(0.75); b.position.set(0, 2.38, 0.75); g.add(b);
    g.userData.ring = (k) => b.userData.ring(k);
    return g;
  },
  // a whale-oil cask (the oilCask breakable): the rime cask, the base set's barrel, or code staves; oily dark
  cask() {
    const g = new THREE.Group(), parts = rime('cask') || ENV.props.barrel, sz = size4(parts);
    if (sz) { const k = 0.95 / Math.max(0.01, sz.y); for (const p of parts) { const m = new THREE.Mesh(p.geo, p.mat); m.scale.setScalar(k); m.position.y = -sz.y0 * k; m.castShadow = true; g.add(m); } }
    else g.add(solid5([{ geo: G.cyl(0.36, 0.33, 0.95, 10), color: 0x3a2c1e, o: { y: 0.48 } }, ...[0.12, 0.48, 0.84].map((y) => ({ geo: G.cyl(0.38, 0.38, 0.05, 10), color: IRON, o: { y } }))]));
    const stain = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.45, depthWrite: false })));
    stain.position.y = 0.025; stain.renderOrder = 2; g.add(stain);
    return g;
  },
  // the Neck's plug in the Field of Ash (o = L.neck: its four cells laid in the prop's own frame); clear() brings it down
  rubble(o) {
    const g = new THREE.Group(), rr = RNG(Math.round((o.x || 1) * 13 + (o.z || 1) * 7)), parts = [], ca = Math.cos(o.r || 0), sa = Math.sin(o.r || 0);
    for (const [cx, cz] of o.plug || [[0, 0]]) {
      const dx = cx + 0.5 - (o.x ?? cx + 0.5), dz = cz + 0.5 - (o.z ?? cz + 0.5), lx = dx * ca - dz * sa, lz = dx * sa + dz * ca;
      for (let k = 0; k < 3; k++) parts.push({ geo: jitter(G.dodeca(rr.range(0.55, 0.95)), 0.2, 820 + parts.length), color: k % 2 ? 0x2c2a28 : 0x242220, o: { x: lx + rr.range(-0.35, 0.35), y: rr.range(0.3, 1.3), z: lz + rr.range(-0.35, 0.35), sy: 0.85 }, jit: 0.2 });
    }
    for (let k = 0; k < 10; k++) parts.push({ geo: jitter(G.dodeca(rr.range(0.15, 0.35)), 0.06, 860 + k), color: 0x2e2c2a, o: { x: rr.range(-1.2, 1.2), y: 0.05, z: rr.range(-2.4, 2.4) } });
    const M = act4Mats(), m = new THREE.Mesh(bake(parts), M.ashRockW || M.lam); m.castShadow = true; m.receiveShadow = true; g.add(m);
    let drawn = false, t0 = 0;
    m.onBeforeRender = () => {
      drawn = true; if (!t0) return;
      const k = clamp((R.time - t0) / 1.2, 0, 1);
      m.position.y = -2.2 * k * k; m.scale.set(1 + k * 0.2, 1 - k * 0.5, 1 + k * 0.2);
      if (k >= 1) g.visible = false;
    };
    g.userData.clear = () => { if (!drawn) { g.visible = false; return; } t0 ||= R.time; };
    return g;
  }
};
// a batch for one prop (act5Prop's huts and racks): add() as Batch does, mesh() a group of its materials' meshes
function soloBatch() {
  const by = {};
  return {
    add(mat, parts, x, z, ry = 0) { (by[mat] ||= []).push(...parts.map((p) => ({ ...p, o: { ...p.o, x: (p.o?.x || 0) + x, z: (p.o?.z || 0) + z, ry: (p.o?.ry || 0) + ry } }))); },
    put(mat, geo, m) { (by[mat] ||= []).push({ geo: geo.clone().applyMatrix4(m), color: 0xffffff }); },
    mesh() { const g = new THREE.Group(); for (const k in by) { const m = new THREE.Mesh(bake(by[k]), MAT[k] || MAT.lam); m.castShadow = true; m.receiveShadow = true; g.add(m); } return g; }
  };
}
// Act V's story props (the contract's kinds): a Group with userData.kind and the kind's switches; any kind not known is an
// empty group
export function act5Prop(kind, o = {}) {
  mats();
  mats5();
  const f = PROP5[kind], g = f ? f(o) : new THREE.Group();
  g.userData.kind = kind;
  return g;
}
