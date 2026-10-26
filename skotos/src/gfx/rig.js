// Builds one SkinnedMesh (one draw call) from primitive parts bound rigidly to bones.
// The same Bone hierarchy can later drive imported glTF characters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const NOISE_GLSL = `
float h31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }`;

// shared patch: per-vertex metal/glow, rim light, hit flash, tint, and a burning dissolve for deaths
function patchChar(sh) {
  Object.assign(sh.uniforms, this.userData.u);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec2 surf;\nvarying vec2 vSurf;\nvarying vec3 vWPos;')
    .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvSurf = surf;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec2 vSurf; varying vec3 vWPos;
uniform float uFlash; uniform float uDissolve; uniform vec3 uRimColor; uniform float uRim; uniform vec3 uTint; uniform float uTintAmt; uniform vec3 uBurn;
${NOISE_GLSL}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uTint * 1.6, uTintAmt * (1.0 - vSurf.y));
float dn = 1.0;
if (uDissolve > 0.0) { dn = vnoise(vWPos * 4.0) * 0.7 + vnoise(vWPos * 11.0) * 0.3; if (dn < uDissolve) discard; }`)
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(roughness, 0.3, vSurf.x);')
    .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurf.x * 0.75;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vSurf.y * 3.0;
float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);
totalEmissiveRadiance += uRimColor * rimF * uRim;
totalEmissiveRadiance += vec3(1.0, 0.82, 0.65) * uFlash;
if (uDissolve > 0.0) totalEmissiveRadiance += uBurn * 5.0 * (1.0 - smoothstep(0.0, 0.07, dn - uDissolve));`);
}

export function makeCharMat(opts = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: opts.roughness ?? 0.82, metalness: 0, envMapIntensity: opts.env ?? 0.5 });
  m.userData.u = {
    uFlash: { value: 0 }, uDissolve: { value: 0 },
    uRimColor: { value: new THREE.Color(opts.rim ?? 0x6080b0) }, uRim: { value: opts.rimI ?? 0.35 },
    uTint: { value: new THREE.Color(1, 1, 1) }, uTintAmt: { value: 0 },
    uBurn: { value: new THREE.Color(opts.burn ?? 0xff6a1a) }
  };
  m.onBeforeCompile = patchChar;
  m.customProgramCacheKey = () => 'char1';
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();

// static (unskinned) mesh from parts, same vertex layout and material as characters: weapons, props held in hand
export function staticGeo(parts) {
  const geos = [];
  for (const p of parts) {
    let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const o = p.o || {};
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e);
    _p.set(o.x || 0, o.y || 0, o.z || 0); _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    const n = g.attributes.position.count; _c.set(p.color);
    const col = new Float32Array(n * 3), surf = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; surf[i * 2] = o.metal || 0; surf[i * 2 + 1] = o.glow || 0; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('surf', new THREE.BufferAttribute(surf, 2));
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  geo.computeBoundingSphere();
  return geo;
}

export class RigBuilder {
  constructor() { this.bones = []; this.map = {}; this.parts = []; }
  // frame: optional rotation applied to every part on this bone, so parts can be authored
  // for a hanging arm while the bone itself rests in a T-pose
  bone(name, parent, x = 0, y = 0, z = 0, frame = null) {
    const b = { name, parent: parent ? this.map[parent] : null, pos: [x, y, z], idx: this.bones.length, frame };
    if (parent && !b.parent) throw new Error('rig: unknown parent ' + parent);
    b.model = b.parent ? [b.parent.model[0] + x, b.parent.model[1] + y, b.parent.model[2] + z] : [x, y, z];
    this.bones.push(b); this.map[name] = b;
    return this;
  }
  // geo is in bone-local space; o: {x,y,z, rx,ry,rz, sx,sy,sz, metal, glow}
  add(bone, geo, color, o = {}) {
    if (!this.map[bone]) throw new Error('rig: unknown bone ' + bone);
    this.parts.push({ bone: this.map[bone], geo, color, o });
    return this;
  }
  // mirror helper: adds the part to boneL and a mirrored copy to boneR
  pair(boneL, boneR, geo, color, o = {}) {
    this.add(boneL, geo, color, o);
    this.add(boneR, geo, color, Object.assign({}, o, { x: -(o.x || 0), ry: -(o.ry || 0), rz: -(o.rz || 0) }));
    return this;
  }
  build(matOpts) {
    const geos = [];
    for (const p of this.parts) {
      let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      const o = p.o, b = p.bone.model;
      _e.set(o.rx || 0, o.ry || 0, o.rz || 0);
      _q.setFromEuler(_e);
      _p.set(b[0] + (o.x || 0), b[1] + (o.y || 0), b[2] + (o.z || 0));
      _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
      if (p.bone.frame) {
        _m.compose(_p.set(o.x || 0, o.y || 0, o.z || 0), _q, _s);
        g.applyMatrix4(_m);
        _m.makeRotationFromQuaternion(p.bone.frame);
        g.applyMatrix4(_m);
        g.translate(b[0], b[1], b[2]);
      } else {
        _m.compose(_p, _q, _s);
        g.applyMatrix4(_m);
      }
      const n = g.attributes.position.count;
      _c.set(p.color);
      const col = new Float32Array(n * 3), surf = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
        surf[i * 2] = o.metal || 0; surf[i * 2 + 1] = o.glow || 0;
        si[i * 4] = p.bone.idx; sw[i * 4] = 1;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('surf', new THREE.BufferAttribute(surf, 2));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      geos.push(g);
    }
    const geo = mergeGeometries(geos, false);
    geo.computeBoundingSphere();
    const bones = {}, list = [];
    for (const b of this.bones) {
      const bone = new THREE.Bone(); bone.name = b.name; bone.position.set(b.pos[0], b.pos[1], b.pos[2]);
      bones[b.name] = bone; list.push(bone);
      if (b.parent) bones[b.parent.name].add(bone);
    }
    const mat = makeCharMat(matOpts);
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.add(list[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    const rest = {};
    for (const k in bones) rest[k] = bones[k].position.clone();
    return { mesh, bones, mat, rest };
  }
}

// ---------- primitive helpers (low poly, centered unless noted) ----------
export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  ball: (r, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs),
  cyl: (rt, rb, h, seg = 7) => new THREE.CylinderGeometry(rt, rb, h, seg),
  cone: (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg),
  // a limb hanging down from its joint: y from 0 to -len
  limb(len, r1, r2, seg = 6) { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.translate(0, -len / 2, 0); return g; },
  // tapered segment pointing up from the joint
  up(len, r1, r2, seg = 6) { const g = new THREE.CylinderGeometry(r2, r1, len, seg); g.translate(0, len / 2, 0); return g; },
  // a cap: top part of a sphere (frac 0..1 of the height)
  dome: (r, frac = 0.5, ws = 10) => new THREE.SphereGeometry(r, ws, 6, 0, Math.PI * 2, 0, Math.PI * frac),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  dodeca: (r) => new THREE.DodecahedronGeometry(r, 0),
  torus: (r, t, rs = 4, ts = 10, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  // straight blade along +y from the guard, diamond cross section
  blade(len, w, t = 0.025) {
    const body = new THREE.CylinderGeometry(1, 1, len * 0.82, 4); body.scale(w / 2, 1, t); body.translate(0, len * 0.41, 0);
    const tip = new THREE.CylinderGeometry(0, 1, len * 0.18, 4); tip.scale(w / 2, 1, t); tip.translate(0, len * 0.91, 0);
    return mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()]);
  },
  // shape extruded thinly along z (axe heads, cleavers)
  shape(points, depth = 0.04) {
    const s = new THREE.Shape(); points.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2);
    return g;
  },
  // segment from the joint to an offset (dx,dy,dz) in bone space
  segTo(dx, dy, dz, r1, r2, seg = 5) {
    const d = new THREE.Vector3(dx, dy, dz), L = d.length();
    const g = new THREE.CylinderGeometry(r2, r1, L, seg); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    return g;
  },
  lathe(points, seg = 8) { return new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg); }
};
