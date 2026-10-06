// Character models built from primitives. Each returns { mesh, bones, mat, rest, kind, dims }.
import * as THREE from 'three';
import { RigBuilder, G, staticGeo, makeCharMat } from './rig.js';

// ---------- skeletons ----------
// Humanoids rest in a T-pose (arms along ±x) to match the retargeted animation set.
// Arm parts are still authored as if the arm hangs down; the bone frame turns them.
const FRAME_L = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
const FRAME_R = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
export function humanoid(rb, P = {}) {
  const s = P.s ?? 1, leg = P.leg ?? 1, arm = P.arm ?? 1, tor = P.torso ?? 1, sh = P.shoulder ?? 1, hw = P.hip ?? 1, bulk = P.bulk ?? 1;
  const hipsY = (0.88 * leg + 0.07) * s;
  rb.bone('root', null)
    .bone('hips', 'root', 0, hipsY, 0)
    .bone('spine', 'hips', 0, 0.12 * tor * s, 0)
    .bone('chest', 'spine', 0, 0.2 * tor * s, 0)
    .bone('neck', 'chest', 0, 0.22 * tor * s, 0)
    .bone('head', 'neck', 0, 0.08 * s, 0)
    .bone('armL', 'chest', 0.19 * sh * s, 0.15 * tor * s, 0, FRAME_L)
    .bone('foreL', 'armL', 0.29 * arm * s, 0, 0, FRAME_L)
    .bone('handL', 'foreL', 0.26 * arm * s, 0, 0, FRAME_L)
    .bone('armR', 'chest', -0.19 * sh * s, 0.15 * tor * s, 0, FRAME_R)
    .bone('foreR', 'armR', -0.29 * arm * s, 0, 0, FRAME_R)
    .bone('handR', 'foreR', -0.26 * arm * s, 0, 0, FRAME_R)
    .bone('thighL', 'hips', 0.1 * hw * s, -0.03 * s, 0)
    .bone('shinL', 'thighL', 0, -0.42 * leg * s, 0)
    .bone('footL', 'shinL', 0, -0.41 * leg * s, 0)
    .bone('thighR', 'hips', -0.1 * hw * s, -0.03 * s, 0)
    .bone('shinR', 'thighR', 0, -0.42 * leg * s, 0)
    .bone('footR', 'shinR', 0, -0.41 * leg * s, 0)
    .bone('cape', 'chest', 0, 0.15 * tor * s, -0.135 * s * bulk)
    .bone('cape2', 'cape', 0, -0.42 * s * tor, 0);
  return { s, leg, arm, tor, sh, hw, bulk, hipsY, ua: 0.29 * arm * s, fa: 0.26 * arm * s, th: 0.42 * leg * s, sn: 0.41 * leg * s };
}

// standard body; c = colors, o = options
function body(rb, d, c, o = {}) {
  const s = d.s, b = d.bulk, hs = o.head ?? 1, zs = 0.66;
  rb.add('hips', G.cyl(0.155 * d.hw * s * b, 0.14 * d.hw * s * b, 0.2 * s, 8), c.pants, { y: -0.03 * s, sz: zs * 1.05 });
  rb.add('spine', G.cyl(0.155 * d.sh * s * b, 0.145 * s * b, 0.23 * s * d.tor, 8), c.belly ?? c.shirt, { y: 0.09 * s * d.tor, sz: zs });
  rb.add('chest', G.cyl(0.215 * d.sh * s * b, 0.16 * s * b, 0.31 * s * d.tor, 8), c.shirt, { y: 0.11 * s * d.tor, sz: zs, metal: c.shirtMetal || 0 });
  rb.add('chest', G.ball(0.13 * d.sh * s * b, 8, 4), c.shirt, { y: 0.25 * s * d.tor, sx: 1.55, sy: 0.45, sz: 0.95, metal: c.shirtMetal || 0 });
  rb.add('neck', G.cyl(0.05 * s * b, 0.06 * s * b, 0.12 * s), c.skin, { y: 0.01 * s });
  if (!o.noHead) rb.add('head', G.ball(0.115 * s * hs, 10, 8), c.skin, { y: 0.1 * s * hs, sy: 1.1, sz: 1.02 });
  rb.pair('armL', 'armR', G.limb(d.ua, 0.062 * s * b, 0.05 * s * b), c.sleeve ?? c.shirt);
  rb.pair('foreL', 'foreR', G.limb(d.fa, 0.05 * s * b, 0.04 * s * b), c.fore ?? c.skin);
  rb.pair('handL', 'handR', G.ball(0.05 * s * b, 6, 5), c.hand ?? c.skin, { y: -0.035 * s, sy: 1.25 });
  if (!o.noLegs) {
    rb.pair('thighL', 'thighR', G.limb(d.th, 0.08 * s * b, 0.06 * s * b), c.pants);
    rb.pair('shinL', 'shinR', G.limb(d.sn, 0.058 * s * b, 0.045 * s * b), c.shin ?? c.pants);
    rb.pair('footL', 'footR', G.box(0.1 * s * b, 0.09 * s, 0.22 * s), c.boots, { y: -0.045 * s, z: 0.05 * s });
  }
}
function eyes(rb, d, color, o = {}) {
  const s = d.s, hs = o.head ?? 1, gl = o.glow ?? 0;
  const g = gl ? G.ball(0.022 * s * hs, 5, 4) : G.box(0.03 * s * hs, 0.018 * s * hs, 0.01 * s);
  rb.pair('head', 'head', g, color, { x: 0.042 * s * hs, y: (o.y ?? 0.11) * s * hs, z: (o.z ?? 0.105) * s * hs, glow: gl });
}

// ---------- held items (static meshes mounted on hand bones) ----------
const steel = 0x9aa1ab, darkSteel = 0x50555e, leather = 0x4a3020, wood = 0x5a3e26, gold = 0xc9a24a;

export function weaponGeo(type, look = {}) {
  const p = [], bl = look.blade ?? steel, gl = look.glow ?? 0, acc = look.accent ?? gold;
  switch (type) {
    case 'sword': {
      const L = look.len ?? 0.92;
      p.push({ geo: G.cyl(0.022, 0.022, 0.2, 6), color: leather, o: { y: -0.02 } });
      p.push({ geo: G.ball(0.035, 6, 5), color: acc, o: { y: -0.14, metal: 1 } });
      p.push({ geo: G.box(0.26, 0.04, 0.05), color: acc, o: { y: 0.09, metal: 1 } });
      p.push({ geo: G.blade(L, look.width ?? 0.085), color: bl, o: { y: 0.1, metal: 1, glow: gl } });
      if (gl) p.push({ geo: G.blade(L * 0.8, 0.02, 0.03), color: look.rune ?? 0xffb050, o: { y: 0.16, glow: 1.4 } });
      return { parts: p, tip: L + 0.1, base: 0.15 };
    }
    case 'greatsword': {
      const L = look.len ?? 1.6;
      p.push({ geo: G.cyl(0.03, 0.03, 0.42, 6), color: leather, o: { y: -0.08 } });
      p.push({ geo: G.ball(0.05, 6, 5), color: acc, o: { y: -0.3, metal: 1 } });
      p.push({ geo: G.box(0.46, 0.06, 0.08), color: acc, o: { y: 0.15, metal: 1 } });
      p.push({ geo: G.blade(L, look.width ?? 0.16, 0.035), color: bl, o: { y: 0.17, metal: 1, glow: gl } });
      return { parts: p, tip: L + 0.17, base: 0.25 };
    }
    case 'axe': {
      p.push({ geo: G.cyl(0.026, 0.03, 0.85, 6), color: wood, o: { y: 0.22 } });
      p.push({ geo: G.shape([[0, 0], [0.24, -0.12], [0.3, 0.02], [0.26, 0.2], [0, 0.1]], 0.035), color: bl, o: { y: 0.52, x: 0.02, metal: 1, glow: gl } });
      p.push({ geo: G.box(0.07, 0.12, 0.07), color: darkSteel, o: { y: 0.58, metal: 1 } });
      return { parts: p, tip: 0.72, base: 0.4 };
    }
    case 'mace': {
      p.push({ geo: G.cyl(0.025, 0.03, 0.7, 6), color: leather, o: { y: 0.15 } });
      p.push({ geo: G.ico(0.11), color: bl, o: { y: 0.55, metal: 1, glow: gl } });
      for (let i = 0; i < 6; i++) p.push({ geo: G.cone(0.03, 0.09, 4), color: darkSteel, o: { y: 0.55, rz: (i / 6) * 6.28, x: Math.sin((i / 6) * 6.28) * 0.12, metal: 1 } });
      return { parts: p, tip: 0.62, base: 0.4 };
    }
    case 'dagger': {
      p.push({ geo: G.cyl(0.018, 0.018, 0.12, 5), color: leather, o: { y: -0.01 } });
      p.push({ geo: G.box(0.12, 0.025, 0.03), color: darkSteel, o: { y: 0.06, metal: 1 } });
      p.push({ geo: G.blade(0.34, 0.05), color: bl, o: { y: 0.07, metal: 1 } });
      return { parts: p, tip: 0.4, base: 0.1 };
    }
    case 'cleaver': {
      p.push({ geo: G.cyl(0.03, 0.03, 0.3, 6), color: leather, o: { y: 0 } });
      p.push({ geo: G.shape([[-0.06, 0], [0.12, 0], [0.18, 0.75], [-0.06, 0.62]], 0.04), color: look.blade ?? 0x5a5650, o: { y: 0.14, metal: 1 } });
      return { parts: p, tip: 0.85, base: 0.2 };
    }
    case 'club': {
      p.push({ geo: G.cyl(0.11, 0.05, 1.3, 7), color: look.blade ?? 0x4a3a2a, o: { y: 0.45 } });
      for (let i = 0; i < 5; i++) p.push({ geo: G.cone(0.04, 0.12, 4), color: 0x8a8070, o: { y: 0.75 + i * 0.08, rz: 1.57 * (i % 2 ? 1 : -1), x: (i % 2 ? -1 : 1) * 0.1, metal: 0.4 } });
      return { parts: p, tip: 1.1, base: 0.5 };
    }
    case 'bow': {
      const r = 0.55, a = 2.1;
      const arc = G.torus(r, 0.022, 4, 14, a); arc.rotateZ(-a / 2); arc.translate(-r, 0, 0); arc.rotateY(-Math.PI / 2);
      p.push({ geo: arc, color: look.blade ?? wood, o: { glow: gl } });
      const tipZ = -(r - r * Math.cos(a / 2)), tipY = r * Math.sin(a / 2);
      p.push({ geo: G.box(0.006, tipY * 2, 0.006), color: 0xd8d0c0, o: { z: tipZ } });
      p.push({ geo: G.cyl(0.03, 0.03, 0.16, 6), color: leather, o: {} });
      return { parts: p, tip: tipY, base: 0, stringZ: tipZ };
    }
    case 'crossbow': {
      p.push({ geo: G.box(0.07, 0.08, 0.95), color: look.wood ?? wood, o: { z: 0.3, y: 0.02 } });
      p.push({ geo: G.box(0.06, 0.16, 0.22), color: look.wood ?? wood, o: { z: -0.12, y: -0.06, rx: 0.3 } });
      const arms = G.torus(0.36, 0.022, 4, 12, 2.2); arms.rotateZ(-1.1 + Math.PI / 2); arms.rotateX(Math.PI / 2); arms.translate(0, 0.04, 0.95);
      p.push({ geo: arms, color: look.blade ?? darkSteel, o: { metal: 1, glow: gl } });
      p.push({ geo: G.box(0.62, 0.008, 0.008), color: 0xd8d0c0, o: { y: 0.05, z: 0.68 } });
      p.push({ geo: G.cyl(0.012, 0.012, 0.5, 4), color: 0x8a7a60, o: { y: 0.08, z: 0.55, rx: Math.PI / 2 } });
      p.push({ geo: G.cone(0.025, 0.08, 4), color: steel, o: { y: 0.08, z: 0.84, rx: Math.PI / 2, metal: 1 } });
      return { parts: p, tip: 1.0, base: 0, axis: 'z' };
    }
    case 'staff': {
      p.push({ geo: G.cyl(0.024, 0.03, 1.8, 6), color: look.wood ?? 0x4a3524, o: { y: 0.3 } });
      p.push({ geo: G.cone(0.05, 0.14, 5), color: acc, o: { y: 1.24, metal: 1, rx: Math.PI } });
      for (let i = 0; i < 3; i++) p.push({ geo: G.segTo(Math.sin(i * 2.09) * 0.1, 0.22, Math.cos(i * 2.09) * 0.1, 0.012, 0.008, 4), color: acc, o: { y: 1.2, metal: 1 } });
      p.push({ geo: G.oct(0.075), color: look.gem ?? 0x7ab8ff, o: { y: 1.36, sy: 1.5, glow: 1.6 } });
      return { parts: p, tip: 1.36, base: 1.0, gem: 1.36 };
    }
    case 'staffSkull': {
      p.push({ geo: G.cyl(0.022, 0.028, 1.5, 6), color: 0x3a2a1c, o: { y: 0.2 } });
      p.push({ geo: G.ball(0.08, 6, 5), color: 0xd8d0b8, o: { y: 1.0 } });
      p.push({ geo: G.ball(0.025, 4, 3), color: 0x7aff6a, o: { y: 1.02, z: 0.06, x: 0.03, glow: 2 } });
      p.push({ geo: G.ball(0.025, 4, 3), color: 0x7aff6a, o: { y: 1.02, z: 0.06, x: -0.03, glow: 2 } });
      for (let i = 0; i < 3; i++) p.push({ geo: G.box(0.02, 0.18, 0.05), color: [0xa04030, 0x3060a0, 0xd0c040][i], o: { y: 0.82, x: (i - 1) * 0.05, rz: (i - 1) * 0.3 } });
      return { parts: p, tip: 1.0, base: 0.6, gem: 1.0 };
    }
    case 'lanternStaff': {
      p.push({ geo: G.cyl(0.025, 0.03, 2.0, 6), color: 0x4a3524, o: { y: 0.4 } });
      p.push({ geo: G.segTo(0.22, 0.08, 0, 0.015, 0.012, 4), color: darkSteel, o: { y: 1.35, metal: 1 } });
      // a dead lantern (the Lampless, Ivar) keeps a dim pale glass: look.glow, look.lamp
      p.push({ geo: G.box(0.1, 0.14, 0.1), color: look.lamp ?? 0xffc070, o: { y: 1.3, x: 0.22, glow: look.glow ?? 2.2 } });
      p.push({ geo: G.cone(0.08, 0.06, 4), color: darkSteel, o: { y: 1.4, x: 0.22, metal: 1 } });
      return { parts: p, tip: 1.4, base: 1, gem: 1.3 };
    }
    case 'hammer': {
      // look.len: a bigger maul for a bigger hand (the Hammerhorn's, Karthax's); look.ember: black iron with a vein of fire
      const k = look.len ?? 1;
      p.push({ geo: G.cyl(0.025 * k, 0.028 * k, 0.6 * k, 6), color: wood, o: { y: 0.12 * k } });
      p.push({ geo: G.box(0.22 * k, 0.12 * k, 0.12 * k), color: look.ember ? 0x1a1816 : darkSteel, o: { y: 0.45 * k, metal: 1 } });
      if (look.ember) p.push({ geo: G.box(0.23 * k, 0.02 * k, 0.125 * k), color: look.ember, o: { y: 0.45 * k, glow: 1.6 } });
      return { parts: p, tip: 0.5 * k, base: 0.3 * k };
    }
    case 'spear': {
      // the Evergreen's living-wood spear: held a third of the way up, a leaf-shaped amber blade bound with leaves
      const L = look.len ?? 2.2, b0 = -0.3 * L, s1 = 0.72 * L, bl = Math.min(0.5, 0.2 * L), wd = look.wood ?? 0x3a2a18;
      p.push({ geo: G.cyl(0.02, 0.026, s1 - b0, 6), color: wd, o: { y: (s1 + b0) / 2 } });
      for (let i = 0; i < 4; i++) p.push({ geo: G.cyl(0.027, 0.027, 0.045, 6), color: 0x5a4628, o: { y: b0 + 0.18 * L + i * 0.16 * L, ry: i } });
      p.push({ geo: G.ball(0.034, 6, 4), color: wd, o: { y: b0, sy: 1.5 } });
      p.push({ geo: G.cone(0.038, 0.1, 6), color: 0x7a5a28, o: { y: s1 - 0.03, rx: Math.PI } });
      p.push({ geo: G.blade(bl, look.width ?? 0.12, 0.028), color: look.blade ?? 0xc87a18, o: { y: s1, glow: look.glow ?? 0.18, metal: 0.2 } });
      p.push({ geo: G.blade(bl * 0.75, 0.02, 0.034), color: 0xffb040, o: { y: s1 + 0.02, glow: 0.5 } });
      for (const sg of [-1, 1]) p.push({ geo: G.box(0.05, 0.13, 0.006), color: 0x5a7a2a, o: { y: s1 - 0.1, x: sg * 0.04, rz: sg * 0.55 } });
      return { parts: p, tip: s1 + bl, base: s1 - 0.15 };
    }
  }
  return { parts: [{ geo: G.box(0.05, 0.6, 0.05), color: steel }], tip: 0.6, base: 0.1 };
}

export function shieldGeo(look = {}) {
  const p = [], r = look.r ?? 0.3;
  const disc = G.cyl(r, r * 0.92, 0.06, 12); disc.rotateX(Math.PI / 2);
  p.push({ geo: disc, color: look.face ?? 0x24365a, o: { z: 0.06 } });
  const rim = G.torus(r, 0.028, 4, 14);
  p.push({ geo: rim, color: look.rim ?? steel, o: { z: 0.09, metal: 1 } });
  p.push({ geo: G.ball(0.075, 6, 4), color: look.rim ?? steel, o: { z: 0.1, sz: 0.6, metal: 1, glow: look.glow ?? 0 } });
  p.push({ geo: G.box(0.06, r * 1.5, 0.012), color: look.emblem ?? gold, o: { z: 0.095, metal: 1 } });
  p.push({ geo: G.box(r * 1.2, 0.06, 0.012), color: look.emblem ?? gold, o: { z: 0.095, y: 0.06, metal: 1 } });
  p.push({ geo: G.box(0.05, 0.16, 0.06), color: leather, o: { z: 0.0 } });
  return p;
}

// ---------- Act III worn and ground pieces (see game/actors.js) ----------
const amber = 0xc87818;
// the Lady's crown: a band and two antlers of amber, in head space (+y up, +z the face), band at y = 0
export function crownParts() {
  const p = [];
  const band = G.torus(0.098, 0.012, 4, 18); band.rotateX(Math.PI / 2);
  p.push({ geo: band, color: 0x7a4a14, o: { glow: 0.08, metal: 0.3 } });
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.42; p.push({ geo: G.segTo(Math.sin(a) * 0.02, 0.07 + (i === 2 ? 0.03 : 0), 0.01, 0.009, 0.002, 4), color: amber, o: { x: Math.sin(a) * 0.098, z: Math.cos(a) * 0.098, glow: 0.22 } }); }
  for (const sg of [-1, 1]) {
    // beam: temple, up and out and back, three tines forward and up
    const pts = [[0.085, 0.0, -0.01], [0.15, 0.13, -0.05], [0.2, 0.27, -0.1], [0.2, 0.41, -0.17]];
    for (let k = 0; k < 3; k++) { const a = pts[k], b = pts[k + 1]; p.push({ geo: G.segTo(sg * (b[0] - a[0]), b[1] - a[1], b[2] - a[2], 0.016 - k * 0.004, 0.012 - k * 0.004, 5), color: amber, o: { x: sg * a[0], y: a[1], z: a[2], glow: 0.2 } }); }
    const tines = [[1, [0.04, 0.11, 0.09]], [2, [0.09, 0.13, 0.04]], [2, [-0.06, 0.15, -0.02]], [3, [0.05, 0.09, 0.03]]];
    for (const [k, d] of tines) { const a = pts[k]; p.push({ geo: G.segTo(sg * d[0], d[1], d[2], 0.008, 0.002, 4), color: 0xe89a28, o: { x: sg * a[0], y: a[1], z: a[2], glow: 0.32 } }); }
  }
  return p;
}
// a Mourner's veil: a hood and shroud from the crown of the head (y = 0) down past the shoulders
export function veilParts() {
  const prof = [[0.0, 0.05], [0.09, 0.03], [0.128, -0.06], [0.142, -0.16], [0.165, -0.3], [0.22, -0.46], [0.29, -0.64]];
  const g = G.lathe(prof, 18); g.translate(0, 0, 0.012);
  const hem = G.torus(0.29, 0.008, 3, 24); hem.rotateX(Math.PI / 2); hem.translate(0, -0.64, 0.012);
  return [{ geo: g, color: 0x0c0b0e }, { geo: hem, color: 0x6a6860, o: { glow: 0.05 } }];
}
// ---------- Act IV worn and ground pieces (see game/actors.js) ----------
const iron = 0x2a2826;
// an Ashsmith's one-eyed iron mask: a curved plate over the face (head space, +z the face, y = 0 the eyes) and a coal in the brow
export function maskParts() {
  const p = [];
  for (let i = -2; i <= 2; i++) { const a = i * 0.32; p.push({ geo: G.box(0.068, 0.17, 0.014), color: iron, o: { x: Math.sin(a) * 0.1, z: Math.cos(a) * 0.1, ry: a, metal: 0.8 } }); }
  p.push({ geo: G.box(0.2, 0.022, 0.03), color: 0x3a3430, o: { y: 0.035, z: 0.105, metal: 0.8 } });
  for (const x of [-0.06, 0.06]) p.push({ geo: G.ball(0.012, 4, 3), color: 0x5a5048, o: { x, y: -0.05, z: 0.108, metal: 1 } });
  // the single eye: a coal set in the brow, the other socket a dark slit
  p.push({ geo: G.ball(0.024, 6, 5), color: 0xff6a18, o: { x: 0.036, y: 0.0, z: 0.112, glow: 2.4 } });
  p.push({ geo: G.box(0.04, 0.008, 0.01), color: 0x0a0806, o: { x: -0.036, y: 0.0, z: 0.113 } });
  return p;
}
// iron shackles: a cuff (axis along the arm, x) and a collar (axis up, y)
export function cuffParts(r = 0.07) { const g = G.torus(r, 0.022, 5, 12); g.rotateY(Math.PI / 2); return [{ geo: g, color: iron, o: { metal: 0.9 } }, { geo: G.box(0.03, 0.05, 0.03), color: 0x3a3430, o: { y: -r - 0.01, metal: 0.9 } }]; }
export function collarParts(r = 0.11) { const g = G.torus(r, 0.026, 5, 14); g.rotateX(Math.PI / 2); return [{ geo: g, color: iron, o: { metal: 0.9 } }, { geo: G.torus(0.035, 0.01, 4, 8), color: 0x3a3430, o: { z: r + 0.02, y: -0.03, metal: 0.9 } }]; }
// the Ash Crown on Karthax's brow (when the world has none): a black iron ring of prongs with four ember sockets
export function ashCrownParts() {
  const p = [];
  const band = G.torus(0.105, 0.016, 4, 18); band.rotateX(Math.PI / 2);
  p.push({ geo: band, color: 0x1a1816, o: { metal: 0.8, glow: 0.04 } });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, tall = i % 2 === 0; p.push({ geo: G.segTo(Math.sin(a) * 0.02, tall ? 0.13 : 0.07, Math.cos(a) * 0.02, 0.016, 0.003, 4), color: 0x1e1c1a, o: { x: Math.sin(a) * 0.105, z: Math.cos(a) * 0.105, metal: 0.8 } }); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.39; p.push({ geo: G.ball(0.02, 6, 4), color: 0xff7a20, o: { x: Math.sin(a) * 0.112, y: 0.02, z: Math.cos(a) * 0.112, glow: 2.2 } }); }
  return p;
}
// a heap of ash over one of the Ash-Fallen (a hilt or a bow-tip showing), and the slag left where a foe fell near an Ashsmith
export function ashMoundParts() {
  const p = [{ geo: G.dome(0.7, 0.5, 10), color: 0x4a4642, o: { sy: 0.3 } }, { geo: G.dome(0.4, 0.5, 8), color: 0x5a5650, o: { sy: 0.45, x: 0.25, z: -0.1 } }];
  p.push({ geo: G.cyl(0.02, 0.02, 0.5, 5), color: 0x3a3430, o: { x: -0.2, y: 0.25, z: 0.15, rz: 0.4, rx: 0.2, metal: 0.6 } });
  p.push({ geo: G.box(0.14, 0.03, 0.04), color: 0x4a4038, o: { x: -0.3, y: 0.46, z: 0.2, rz: 0.4, metal: 0.6 } });
  return p;
}
export function slagParts() {
  const p = [{ geo: G.dome(0.55, 0.5, 9), color: 0x2a2220, o: { sy: 0.4 } }, { geo: G.dome(0.3, 0.5, 7), color: 0x3a2a22, o: { sy: 0.6, x: -0.15, z: 0.12 } }];
  for (let i = 0; i < 6; i++) { const a = i * 1.1; p.push({ geo: G.box(0.3, 0.02, 0.03), color: 0xff5a10, o: { x: Math.sin(a) * 0.25, y: 0.14, z: Math.cos(a) * 0.25, ry: a, glow: 1.6 } }); }
  return p;
}
// one iron link of a stoker's chain (axis along z)
export function linkGeo() { const g = G.torus(0.07, 0.02, 4, 8); g.scale(1, 1.6, 1); g.rotateX(Math.PI / 2); return staticGeo([{ geo: g, color: iron, o: { metal: 0.9 } }]); }

// a rootling's hiding place: a heap of turned soil with a tuft of gold leaves
let mound = null;
export function moundMesh() {
  if (!mound) {
    const p = [{ geo: G.dome(0.5, 0.5, 10), color: 0x2e2216, o: { sy: 0.35 } }, { geo: G.dome(0.3, 0.5, 8), color: 0x3a2a1a, o: { sy: 0.55, x: 0.1, z: -0.05 } }];
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.08 + (i % 3) * 0.06; p.push({ geo: G.box(0.07, 0.24, 0.008), color: [0xa08a30, 0x7a8a2a, 0xc09a38][i % 3], o: { x: Math.sin(a) * r, y: 0.18, z: Math.cos(a) * r, ry: a, rx: 0.35 * (i % 2 ? 1 : -1), rz: 0.3 } }); }
    for (let i = 0; i < 3; i++) p.push({ geo: G.segTo(0.2 - i * 0.15, 0.08, 0.12 * (i - 1), 0.02, 0.008, 4), color: 0x4a3420, o: { y: 0.05 } });
    mound = { geo: staticGeo(p), mat: makeCharMat({ rim: 0x806020, rimI: 0.15 }) };
  }
  const m = new THREE.Mesh(mound.geo, mound.mat);
  m.castShadow = false;
  return m;
}
// a Heartroot: a cage of roots around a beating amber bulb; it never moves (see NodeAnim below)
export function buildHeartroot() {
  const rb = new RigBuilder();
  rb.bone('root', null).bone('heart', 'root', 0, 1.0, 0).bone('crown', 'root', 0, 1.62, 0);
  const bark = 0x2a1c10, bark2 = 0x3a2816;
  // spreading roots, thick at the knot
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + 0.3, r = 0.3; rb.add('root', G.segTo(Math.cos(a) * 0.85, -0.3, Math.sin(a) * 0.85, 0.15, 0.04, 6), i % 2 ? bark : bark2, { x: Math.cos(a) * r, y: 0.26, z: Math.sin(a) * r }); }
  rb.add('root', G.cyl(0.42, 0.55, 0.4, 8), bark, { y: 0.18 });
  // a cage of twisted roots around the bulb, closing over it
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28, c = Math.cos(a), s = Math.sin(a), c2 = Math.cos(a + 0.5), s2 = Math.sin(a + 0.5);
    rb.add('root', G.segTo(c2 * 0.5 - c * 0.42, 0.62, s2 * 0.5 - s * 0.42, 0.11, 0.08, 6), i % 2 ? bark : bark2, { x: c * 0.42, y: 0.3, z: s * 0.42 });
    rb.add('root', G.segTo(c2 * -0.38, 0.72, s2 * -0.38, 0.08, 0.03, 5), bark2, { x: c2 * 0.5, y: 0.92, z: s2 * 0.5 });
    for (let k = 0; k < 2; k++) rb.add('root', G.cone(0.03, 0.14, 4), 0x1e140a, { x: c2 * 0.52, y: 0.75 + k * 0.3, z: s2 * 0.52, rz: -c2 * 1.3, rx: s2 * 1.3 });
  }
  rb.add('heart', G.ico(0.3, 1), 0xd07812, { sy: 1.18, glow: 0.32 });
  rb.add('heart', G.ico(0.13, 0), 0xffc050, { y: 0.02, z: 0.22, glow: 0.9 });
  for (let i = 0; i < 4; i++) { const a = i * 1.57; rb.add('heart', G.segTo(Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.36, 0.022, 0.01, 4), 0xe89a28, { glow: 0.5 }); }
  for (let i = 0; i < 3; i++) { const a = i * 2.09; rb.add('crown', G.segTo(Math.cos(a) * 0.22, 0.42, Math.sin(a) * 0.22, 0.04, 0.008, 4), bark2, {}); }
  const r = rb.build({ rim: 0xffa040, rimI: 0.3 });
  r.kind = 'node'; r.dims = { s: 1 }; r.Anim = NodeAnim;
  return r;
}
// a heartbeat in place of a walk: a double thump that swells the bulb, shrinking away when it dies
class NodeAnim {
  constructor(av) { this.av = av; this.b = av.bones; this.t = Math.random() * 3; this.hit = 0; this.act = null; this.dead = 0; this.rate = 0.9; }
  play(name) { if (name === 'die' || name === 'dieFwd') this.dead = 0.001; return 0.6; }
  stop() {}
  get busy() { return false; }
  get progress() { return 1; }
  update(dt) {
    this.t += dt;
    const ph = (this.t * this.rate) % 1, beat = Math.exp(-((ph - 0.1) ** 2) / 0.003) + 0.6 * Math.exp(-((ph - 0.3) ** 2) / 0.003);
    const k = this.dead ? Math.max(0.05, 1 - (this.dead += dt) * 1.4) : 1;
    this.b.heart.scale.setScalar((1 + beat * 0.14 - this.hit * 0.12) * k);
    this.b.crown.rotation.set(Math.sin(this.t * 1.3) * 0.12, 0, Math.cos(this.t * 1.1) * 0.12);
    if (this.hit > 0) this.hit = Math.max(0, this.hit - dt * 5);
  }
}

export function heldMesh(parts, mat) {
  const m = new THREE.Mesh(staticGeo(parts), mat);
  m.castShadow = true;
  return m;
}

// ---------- heroes ----------
const SKIN = 0xc8987a;

export function buildWarden(look = {}) {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.04, shoulder: 1.12, bulk: 1.08 });
  const s = d.s;
  const armor = look.armor ?? 0x7d838e, tabard = look.tabard ?? 0x1d2c4c, capeC = look.cape ?? 0x5a1a1c, trim = 0xb8913e;
  body(rb, d, { skin: SKIN, shirt: armor, shirtMetal: 1, belly: 0x3a3a40, sleeve: 0x5a5e66, fore: 0x4a3524, hand: 0x3a2a1e, pants: 0x34302c, shin: armor, boots: 0x3a2618 });
  // armor dressing
  rb.add('chest', G.box(0.3 * s, 0.27 * s, 0.02), tabard, { y: 0.1 * s, z: 0.128 * s });
  rb.add('chest', G.oct(0.045 * s), trim, { y: 0.14 * s, z: 0.14 * s, sz: 0.4, metal: 1, glow: 0.4 });
  rb.add('hips', G.box(0.2 * s, 0.36 * s, 0.025), tabard, { y: -0.2 * s, z: 0.115 * s });
  rb.add('hips', G.box(0.33 * s, 0.06 * s, 0.22 * s), 0x3a2618, { y: 0.05 * s });
  rb.add('hips', G.box(0.06 * s, 0.05 * s, 0.03 * s), trim, { y: 0.05 * s, z: 0.115 * s, metal: 1 });
  rb.pair('armL', 'armR', G.ball(0.12 * s, 7, 5), armor, { y: 0.0, x: 0.03 * s, sy: 0.75, metal: 1 });
  rb.pair('armL', 'armR', G.ball(0.1 * s, 7, 5), trim, { y: 0.03 * s, x: 0.035 * s, sy: 0.5, sx: 1.1, metal: 1 });
  rb.pair('foreL', 'foreR', G.cyl(0.058 * s, 0.05 * s, 0.14 * s, 6), armor, { y: -0.15 * s, metal: 1 });
  rb.pair('shinL', 'shinR', G.box(0.1 * s, 0.24 * s, 0.05 * s), armor, { y: -0.18 * s, z: 0.045 * s, metal: 1 });
  // head: helmet with nasal guard, beard
  rb.add('head', G.dome(0.135 * s, 0.56), armor, { y: 0.1 * s, sy: 1.15, metal: 1 });
  rb.add('head', G.box(0.03 * s, 0.12 * s, 0.03 * s), armor, { y: 0.1 * s, z: 0.13 * s, metal: 1 });
  rb.add('head', G.cyl(0.14 * s, 0.14 * s, 0.035 * s, 10), trim, { y: 0.13 * s, metal: 1 });
  rb.add('head', G.cone(0.025 * s, 0.07 * s, 4), trim, { y: 0.27 * s, metal: 1 });
  rb.pair('head', 'head', G.box(0.02 * s, 0.1 * s, 0.07 * s), armor, { x: 0.125 * s, y: 0.06 * s, z: 0.05 * s, metal: 1 });
  rb.add('head', G.box(0.15 * s, 0.09 * s, 0.07 * s), 0x4a3020, { y: 0.03 * s, z: 0.075 * s });
  eyes(rb, d, 0x1a1410);
  // cape
  rb.add('cape', G.box(0.42 * s, 0.46 * s, 0.03), capeC, { y: -0.21 * s });
  rb.add('cape2', G.box(0.46 * s, 0.5 * s, 0.03), capeC, { y: -0.22 * s });
  rb.add('cape', G.box(0.46 * s, 0.07 * s, 0.1 * s), capeC, { y: 0.0, z: 0.03 });
  const r = rb.build({ rim: 0x7090c0, rimI: 0.45 });
  r.kind = 'warden'; r.dims = d;
  return r;
}

export function buildRanger(look = {}) {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.0, shoulder: 0.9, leg: 1.05, bulk: 0.92 });
  const s = d.s;
  const cloak = look.cloak ?? 0x2c4636, leatherC = look.leather ?? 0x6a4a2c, hair = 0xd9c48a;
  body(rb, d, { skin: 0xe2b896, shirt: leatherC, belly: 0x4a3420, sleeve: 0x3a4a34, fore: 0x5a3e24, hand: 0x5a3e24, pants: 0x3a3428, shin: 0x4a3420, boots: 0x3a2818 });
  rb.add('chest', G.box(0.3 * s, 0.05 * s, 0.25 * s), 0x2a1c12, { y: 0.02 * s, rz: 0.5 });
  // hood and cloak
  rb.add('head', G.dome(0.15 * s, 0.62), cloak, { y: 0.09 * s, z: -0.02 * s, sy: 1.25, rx: -0.35 });
  rb.add('head', G.cone(0.09 * s, 0.2 * s, 6), cloak, { y: 0.2 * s, z: -0.14 * s, rx: -2.0 });
  rb.add('head', G.box(0.2 * s, 0.12 * s, 0.06 * s), hair, { y: 0.14 * s, z: 0.06 * s, rx: -0.2 });
  rb.add('head', G.box(0.06 * s, 0.3 * s, 0.05 * s), hair, { y: -0.05 * s, z: -0.1 * s, x: 0.08 * s });
  rb.pair('head', 'head', G.cone(0.025 * s, 0.1 * s, 4), 0xe2b896, { x: 0.12 * s, y: 0.12 * s, rz: -1.2 });
  eyes(rb, d, 0x2a4a3a);
  rb.add('chest', G.cyl(0.17 * s, 0.27 * s, 0.17 * s, 8), cloak, { y: 0.22 * s, sz: 0.8 });
  rb.add('cape', G.box(0.44 * s, 0.46 * s, 0.03), cloak, { y: -0.21 * s });
  rb.add('cape2', G.box(0.4 * s, 0.48 * s, 0.03), cloak, { y: -0.22 * s, sx: 1 });
  // quiver
  rb.add('chest', G.cyl(0.06 * s, 0.05 * s, 0.5 * s, 6), 0x5a3a20, { y: 0.02 * s, z: -0.17 * s, x: 0.06, rz: -0.35 });
  for (let i = 0; i < 4; i++) rb.add('chest', G.box(0.02, 0.09 * s, 0.05), 0xd8d8d0, { y: 0.29 * s, z: -0.17 * s + (i % 2) * 0.03, x: 0.14 + i * 0.02, rz: -0.35 });
  rb.add('hips', G.box(0.33 * s, 0.05 * s, 0.22 * s), 0x2a1c12, { y: 0.05 * s });
  rb.add('hips', G.box(0.18 * s, 0.3 * s, 0.025), cloak, { y: -0.18 * s, z: 0.11 * s });
  const r = rb.build({ rim: 0x80c0a0, rimI: 0.45 });
  r.kind = 'ranger'; r.dims = d;
  return r;
}

export function buildMage(look = {}) {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.0, shoulder: 0.95, bulk: 0.95 });
  const s = d.s;
  const robe = look.robe ?? 0x262a58, trim = 0xc8a24a, inner = 0x6a2030;
  body(rb, d, { skin: 0xd4a888, shirt: robe, belly: robe, sleeve: robe, fore: robe, hand: 0xd4a888, pants: 0x1c1c2c, boots: 0x2a1e18 });
  // long robe skirt hanging from the hips
  rb.add('hips', G.cyl(0.2 * s, 0.34 * s, 0.82 * s, 8), robe, { y: -0.36 * s });
  rb.add('hips', G.box(0.07 * s, 0.8 * s, 0.02), inner, { y: -0.36 * s, z: 0.25 * s, rx: -0.17 });
  rb.add('hips', G.cyl(0.345 * s, 0.35 * s, 0.05 * s, 8), trim, { y: -0.76 * s, metal: 1 });
  rb.add('hips', G.cyl(0.2 * s, 0.2 * s, 0.06 * s, 8), trim, { y: 0.05 * s, metal: 1 });
  // wide sleeves
  rb.pair('foreL', 'foreR', G.cyl(0.06 * s, 0.11 * s, 0.24 * s, 6), robe, { y: -0.16 * s });
  rb.pair('foreL', 'foreR', G.cyl(0.112 * s, 0.112 * s, 0.03 * s, 6), trim, { y: -0.28 * s, metal: 1 });
  // mantle, cowl, circlet with a gem
  rb.add('chest', G.cyl(0.18 * s, 0.3 * s, 0.16 * s, 8), 0x1a1c3c, { y: 0.2 * s });
  rb.add('head', G.ball(0.15 * s, 8, 6), 0x1a1c3c, { y: 0.12 * s, z: -0.04 * s, sy: 1.1 });
  rb.add('head', G.cone(0.12 * s, 0.32 * s, 6), 0x1a1c3c, { y: 0.24 * s, z: -0.12 * s, rx: -0.9 });
  rb.add('head', G.torus(0.118 * s, 0.012 * s, 3, 12), trim, { y: 0.15 * s, rx: 1.57, metal: 1 });
  rb.add('head', G.oct(0.022 * s), 0x8ad0ff, { y: 0.16 * s, z: 0.12 * s, glow: 2 });
  rb.add('head', G.box(0.16 * s, 0.07 * s, 0.06 * s), 0x3a2a20, { y: 0.02 * s, z: 0.08 * s });
  eyes(rb, d, 0x1a2030);
  rb.add('cape', G.box(0.4 * s, 0.46 * s, 0.03), 0x1a1c3c, { y: -0.21 * s });
  rb.add('cape2', G.box(0.44 * s, 0.52 * s, 0.03), 0x1a1c3c, { y: -0.24 * s });
  const r = rb.build({ rim: 0x8090ff, rimI: 0.5 });
  r.kind = 'mage'; r.dims = d;
  return r;
}

// ---------- humanoid enemies ----------
export function buildGoblin(variant = 'melee') {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 0.66, leg: 0.85, arm: 1.15, shoulder: 0.9, bulk: 1.05 });
  const s = d.s, skin = variant === 'shaman' ? 0x6a7a44 : 0x56683a;
  body(rb, d, { skin, shirt: skin, belly: 0x4a5a30, sleeve: skin, fore: skin, pants: 0x4a3a28, shin: skin, boots: skin }, { head: 1.45 });
  const hs = 1.45;
  rb.add('head', G.cone(0.06 * s, 0.13 * s, 4), skin, { y: 0.1 * s * hs, z: 0.15 * s * hs, rx: 1.57 });
  rb.pair('head', 'head', G.cone(0.045 * s, 0.26 * s, 4), skin, { x: 0.17 * s, y: 0.17 * s, rz: -1.3, rx: 0.25 });
  eyes(rb, d, 0xffd040, { head: hs, glow: 1.6, y: 0.12, z: 0.1 });
  rb.add('head', G.box(0.12 * s, 0.025 * s, 0.03 * s), 0x1a1a10, { y: 0.06 * s * hs, z: 0.15 * s * hs });
  rb.add('hips', G.box(0.34 * s, 0.22 * s, 0.025), 0x5a4028, { y: -0.13 * s, z: 0.1 * s });
  rb.add('chest', G.box(0.42 * s, 0.1 * s, 0.26 * s), 0x3a2a1a, { y: 0.17 * s, rz: 0.2 });
  if (variant === 'shaman') {
    for (let i = 0; i < 5; i++) rb.add('head', G.box(0.03, 0.22 * s, 0.07 * s), [0xa03020, 0x2050a0, 0xd0b040, 0x208040, 0xa03020][i], { y: 0.3 * s * hs, x: (i - 2) * 0.045, z: -0.04, rz: (i - 2) * 0.28 });
    rb.add('hips', G.cyl(0.14 * s, 0.24 * s, 0.4 * s, 7), 0x4a3a2a, { y: -0.18 * s });
    rb.add('chest', G.ball(0.03, 4, 3), 0x7aff6a, { y: 0.0, z: 0.13 * s, glow: 1.5 });
  }
  if (variant === 'archer') rb.add('chest', G.cyl(0.05 * s, 0.045 * s, 0.45 * s, 5), 0x4a3020, { z: -0.15 * s, rz: -0.4 });
  const r = rb.build({ rim: 0x405020, rimI: 0.3 });
  r.kind = 'goblin'; r.dims = d;
  return r;
}

export function buildAshspawn() {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.06, shoulder: 1.3, arm: 1.08, leg: 0.95, bulk: 1.22 });
  const s = d.s, skin = 0x5a524c, iron = 0x3c3a3a;
  body(rb, d, { skin, shirt: iron, shirtMetal: 0.7, belly: 0x2a2624, sleeve: skin, fore: skin, pants: 0x2a2420, shin: iron, boots: 0x1e1a18 });
  // ember cracks in the ash skin
  rb.pair('armL', 'armR', G.box(0.012, 0.18 * s, 0.012), 0xff5a10, { y: -0.12 * s, z: 0.06 * s, x: 0.02, glow: 1.6 });
  rb.pair('foreL', 'foreR', G.box(0.01, 0.14 * s, 0.01), 0xff5a10, { y: -0.1 * s, z: 0.05 * s, glow: 1.6 });
  rb.add('chest', G.box(0.2 * s, 0.012, 0.012), 0xff5a10, { y: 0.06 * s, z: 0.14 * s, rz: 0.4, glow: 1.4 });
  // spiked pauldrons and helm
  rb.pair('armL', 'armR', G.ball(0.14 * s, 6, 4), iron, { x: 0.03 * s, sy: 0.7, metal: 0.8 });
  rb.pair('armL', 'armR', G.cone(0.04 * s, 0.16 * s, 4), 0x2a2828, { x: 0.08 * s, y: 0.07 * s, rz: -0.6, metal: 0.6 });
  rb.add('head', G.cyl(0.11 * s, 0.14 * s, 0.17 * s, 6), iron, { y: 0.15 * s, metal: 0.8 });
  rb.add('head', G.cone(0.035 * s, 0.18 * s, 4), 0x2a2828, { y: 0.32 * s, metal: 0.6 });
  rb.add('head', G.box(0.2 * s, 0.07 * s, 0.1 * s), skin, { y: 0.02 * s, z: 0.07 * s });
  rb.pair('head', 'head', G.cone(0.016 * s, 0.07 * s, 4), 0xd8ccb0, { x: 0.06 * s, y: 0.06 * s, z: 0.12 * s });
  eyes(rb, d, 0xff7a20, { glow: 2, y: 0.11, z: 0.11 });
  rb.add('hips', G.box(0.36 * s, 0.32 * s, 0.03), 0x3a2018, { y: -0.18 * s, z: 0.12 * s });
  rb.add('hips', G.box(0.4 * s, 0.07 * s, 0.25 * s), 0x2a1a12, { y: 0.05 * s });
  const r = rb.build({ rim: 0xff6020, rimI: 0.25 });
  r.kind = 'ash'; r.dims = d;
  return r;
}

export function buildSkeleton(variant = 'melee') {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.0, bulk: 0.6 });
  const s = d.s, bone = 0xd6ccb0, dark = 0x8a8068;
  rb.add('hips', G.box(0.26 * s, 0.1 * s, 0.12 * s), bone, { y: -0.03 * s });
  rb.add('spine', G.cyl(0.025 * s, 0.025 * s, 0.24 * s, 5), bone, { y: 0.06 * s });
  for (let i = 0; i < 4; i++) rb.add('chest', G.torus(0.12 * s - i * 0.008, 0.012 * s, 3, 10), bone, { y: 0.02 * s + i * 0.055 * s, rx: 1.57, sx: 1.15 - i * 0.05, sy: 0.85 });
  rb.add('chest', G.box(0.02 * s, 0.22 * s, 0.02 * s), bone, { y: 0.1 * s, z: 0.1 * s });
  rb.add('chest', G.box(0.36 * s, 0.03 * s, 0.05 * s), bone, { y: 0.22 * s });
  rb.add('neck', G.cyl(0.02 * s, 0.02 * s, 0.12 * s, 4), bone, { y: 0.02 * s });
  rb.add('head', G.ball(0.11 * s, 7, 6), bone, { y: 0.12 * s, sy: 1.1 });
  rb.add('head', G.box(0.13 * s, 0.05 * s, 0.1 * s), bone, { y: 0.03 * s, z: 0.04 * s });
  rb.pair('head', 'head', G.ball(0.03 * s, 5, 4), 0x0a0a0a, { x: 0.04 * s, y: 0.12 * s, z: 0.085 * s });
  eyes(rb, d, 0x8ad0ff, { glow: 2.5, y: 0.12, z: 0.1 });
  rb.pair('armL', 'armR', G.limb(d.ua, 0.022 * s, 0.018 * s, 5), bone);
  rb.pair('foreL', 'foreR', G.limb(d.fa, 0.018 * s, 0.015 * s, 5), bone);
  rb.pair('handL', 'handR', G.box(0.05 * s, 0.08 * s, 0.03 * s), bone, { y: -0.04 * s });
  rb.pair('thighL', 'thighR', G.limb(d.th, 0.028 * s, 0.022 * s, 5), bone);
  rb.pair('shinL', 'shinR', G.limb(d.sn, 0.022 * s, 0.018 * s, 5), bone);
  rb.pair('footL', 'footR', G.box(0.07 * s, 0.04 * s, 0.17 * s), bone, { y: -0.06 * s, z: 0.04 * s });
  rb.pair('shinL', 'shinR', G.ball(0.03 * s, 5, 4), dark, {});
  // rusted barrow armor scraps
  rb.add('head', G.ball(0.125 * s, 7, 5), 0x5a5248, { y: 0.17 * s, sy: 0.6, metal: 0.6 });
  rb.pair('armL', 'armR', G.ball(0.08 * s, 6, 4), 0x5a5248, { sy: 0.7, metal: 0.6 });
  rb.add('hips', G.box(0.28 * s, 0.3 * s, 0.02), 0x3a3428, { y: -0.17 * s, z: 0.08 * s });
  const r = rb.build({ rim: 0x5080c0, rimI: 0.4 });
  r.kind = 'skeleton'; r.dims = d;
  return r;
}

export function buildWraith(scale = 1, lord = false) {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.08 * scale, arm: 1.2, shoulder: 0.95, bulk: 0.9 });
  const s = d.s, robe = lord ? 0x1c1e26 : 0x1e232c, glowC = lord ? 0x60c0ff : 0x7ae0ff;
  // a robe that ends in tatters instead of legs
  rb.add('chest', G.box(0.36 * s, 0.32 * s, 0.22 * s), robe, { y: 0.1 * s });
  rb.add('spine', G.cyl(0.17 * s, 0.2 * s, 0.3 * s, 7), robe, { y: 0.05 * s });
  rb.add('hips', G.cyl(0.2 * s, 0.36 * s, 0.9 * s, 7, 1), robe, { y: -0.38 * s });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * 6.283;
    rb.add('hips', G.cone(0.08 * s, 0.32 * s, 3), robe, { x: Math.sin(a) * 0.3 * s, z: Math.cos(a) * 0.3 * s, y: -0.92 * s, rx: Math.PI });
  }
  rb.add('neck', G.cyl(0.05 * s, 0.06 * s, 0.1 * s, 5), robe, {});
  // hood with a void inside and two cold eyes
  rb.add('head', G.cone(0.17 * s, 0.42 * s, 7), robe, { y: 0.17 * s, z: -0.03 * s });
  rb.add('head', G.ball(0.1 * s, 7, 5), 0x020304, { y: 0.1 * s, z: 0.05 * s });
  eyes(rb, d, glowC, { glow: 3, y: 0.12, z: 0.13 });
  rb.pair('armL', 'armR', G.limb(d.ua, 0.06 * s, 0.07 * s), robe);
  rb.pair('foreL', 'foreR', G.limb(d.fa, 0.06 * s, 0.1 * s), robe);
  rb.pair('handL', 'handR', G.box(0.06 * s, 0.1 * s, 0.03 * s), 0x8a9aa8, { y: -0.04 * s });
  for (let i = 0; i < 3; i++) rb.pair('handL', 'handR', G.cone(0.01 * s, 0.12 * s, 3), 0xa0b4c4, { y: -0.12 * s, x: (i - 1) * 0.02 * s, rx: Math.PI });
  rb.add('cape', G.box(0.5 * s, 0.5 * s, 0.03), robe, { y: -0.22 * s });
  rb.add('cape2', G.box(0.55 * s, 0.6 * s, 0.03), robe, { y: -0.27 * s });
  if (lord) {
    // the Barrow Lord: crown, armor, a cold greatsword
    const crown = 0x8a7a4a;
    rb.add('head', G.cyl(0.13 * s, 0.12 * s, 0.06 * s, 8), crown, { y: 0.24 * s, metal: 1 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; rb.add('head', G.cone(0.025 * s, 0.12 * s, 4), crown, { y: 0.31 * s, x: Math.sin(a) * 0.12 * s, z: Math.cos(a) * 0.12 * s, metal: 1 }); }
    rb.add('head', G.oct(0.025 * s), 0x60c0ff, { y: 0.25 * s, z: 0.13 * s, glow: 3 });
    rb.add('chest', G.box(0.44 * s, 0.34 * s, 0.27 * s), 0x3a3e46, { y: 0.11 * s, metal: 0.8 });
    rb.pair('armL', 'armR', G.ball(0.15 * s, 7, 4), 0x3a3e46, { x: 0.03 * s, sy: 0.75, metal: 0.8 });
    rb.pair('armL', 'armR', G.cone(0.05 * s, 0.2 * s, 4), 0x2a2e36, { x: 0.1 * s, y: 0.08 * s, rz: -0.7, metal: 0.8 });
    rb.add('chest', G.box(0.06 * s, 0.2 * s, 0.02), 0x60c0ff, { y: 0.12 * s, z: 0.15 * s, glow: 1.8 });
  }
  const r = rb.build({ rim: glowC, rimI: lord ? 0.9 : 0.75, burn: 0x60c0ff });
  r.kind = 'wraith'; r.dims = d; r.float = true;
  return r;
}

export function buildTroll() {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.7, shoulder: 1.45, arm: 1.3, leg: 0.8, torso: 1.1, bulk: 1.35 });
  const s = d.s, skin = 0x66705a, dark = 0x4a5040;
  body(rb, d, { skin, shirt: skin, belly: 0x7a8064, sleeve: skin, fore: skin, pants: 0x3a3024, shin: skin, boots: dark }, { head: 0.9 });
  rb.add('chest', G.ico(0.2 * s), dark, { y: 0.22 * s, z: -0.1 * s, sx: 1.4 });
  for (let i = 0; i < 5; i++) rb.add('chest', G.dodeca(0.05 * s), 0x5a5c50, { y: 0.28 * s, z: -0.16 * s, x: (i - 2) * 0.07 * s });
  rb.add('head', G.cone(0.04 * s, 0.12 * s, 5), skin, { y: 0.09 * s, z: 0.11 * s, rx: 1.3 });
  rb.pair('head', 'head', G.cone(0.018 * s, 0.07 * s, 4), 0xe0d8c0, { x: 0.05 * s, y: 0.02 * s, z: 0.1 * s });
  rb.add('head', G.box(0.18 * s, 0.03 * s, 0.05 * s), dark, { y: 0.14 * s, z: 0.08 * s });
  eyes(rb, d, 0xffb030, { glow: 1.5, y: 0.11, z: 0.1, head: 0.9 });
  rb.add('hips', G.box(0.4 * s, 0.3 * s, 0.03), 0x4a3a28, { y: -0.18 * s, z: 0.13 * s });
  const r = rb.build({ rim: 0x405040, rimI: 0.25 });
  r.kind = 'troll'; r.dims = d;
  return r;
}

// ---------- quadrupeds ----------
export function buildWarg(scale = 1) {
  const rb = new RigBuilder();
  const s = 1.05 * scale, fur = 0x2a2522, belly = 0x403630;
  rb.bone('root', null)
    .bone('body', 'root', 0, 0.72 * s, 0)
    .bone('chest', 'body', 0, 0.04 * s, 0.38 * s)
    .bone('neck', 'chest', 0, 0.12 * s, 0.22 * s)
    .bone('head', 'neck', 0, 0.06 * s, 0.2 * s)
    .bone('jaw', 'head', 0, -0.07 * s, 0.05 * s)
    .bone('tail', 'body', 0, 0.08 * s, -0.42 * s)
    .bone('tail2', 'tail', 0, 0, -0.26 * s);
  for (const [n, side, par, z] of [['fl', 1, 'chest', 0.04], ['fr', -1, 'chest', 0.04], ['bl', 1, 'body', -0.3], ['br', -1, 'body', -0.3]]) {
    rb.bone(n + '1', par, 0.14 * s * side, -0.06 * s, z * s).bone(n + '2', n + '1', 0, -0.32 * s, 0).bone(n + '3', n + '2', 0, -0.3 * s, 0);
  }
  rb.add('body', G.ball(0.3 * s, 8, 6), fur, { sx: 0.85, sy: 0.8, sz: 1.5, z: -0.1 * s });
  rb.add('chest', G.ball(0.33 * s, 8, 6), fur, { sx: 0.95, sy: 1.0, sz: 1.05, y: 0.02 * s });
  for (let i = 0; i < 6; i++) rb.add('chest', G.cone(0.08 * s, 0.22 * s, 4), 0x1e1a18, { y: 0.24 * s, z: -0.05 * s - i * 0.08 * s, rx: -0.6, x: (i % 2 ? 0.05 : -0.05) * s });
  rb.add('neck', G.cyl(0.13 * s, 0.17 * s, 0.3 * s, 7), fur, { y: 0.0, z: 0.05 * s, rx: 1.0 });
  rb.add('head', G.box(0.2 * s, 0.18 * s, 0.2 * s), fur, { y: 0.02 * s });
  rb.add('head', G.box(0.12 * s, 0.09 * s, 0.22 * s), fur, { y: 0.0, z: 0.17 * s });
  rb.add('head', G.box(0.05 * s, 0.04 * s, 0.04 * s), 0x0a0808, { y: 0.03 * s, z: 0.28 * s });
  rb.pair('head', 'head', G.cone(0.05 * s, 0.13 * s, 4), fur, { x: 0.07 * s, y: 0.15 * s, z: -0.04 * s });
  rb.pair('head', 'head', G.ball(0.022 * s, 5, 4), 0xff3020, { x: 0.065 * s, y: 0.055 * s, z: 0.1 * s, glow: 3 });
  rb.add('jaw', G.box(0.1 * s, 0.04 * s, 0.2 * s), belly, { z: 0.1 * s });
  rb.pair('jaw', 'jaw', G.cone(0.012 * s, 0.05 * s, 3), 0xe8e0d0, { x: 0.035 * s, y: 0.04 * s, z: 0.17 * s });
  rb.pair('head', 'head', G.cone(0.012 * s, 0.05 * s, 3), 0xe8e0d0, { x: 0.04 * s, y: -0.05 * s, z: 0.24 * s, rx: Math.PI });
  rb.add('tail', G.segTo(0, 0.02 * s, -0.27 * s, 0.07 * s, 0.06 * s), fur);
  rb.add('tail2', G.segTo(0, -0.03 * s, -0.26 * s, 0.06 * s, 0.02 * s), fur);
  for (const n of ['fl', 'fr', 'bl', 'br']) {
    const back = n[0] === 'b';
    rb.add(n + '1', G.limb(0.32 * s, back ? 0.11 * s : 0.09 * s, 0.06 * s), fur);
    rb.add(n + '2', G.limb(0.3 * s, 0.05 * s, 0.04 * s), fur);
    rb.add(n + '3', G.box(0.08 * s, 0.05 * s, 0.12 * s), 0x1a1614, { y: -0.02 * s, z: 0.03 * s });
  }
  const r = rb.build({ rim: 0x806050, rimI: 0.3 });
  r.kind = 'warg'; r.dims = { s };
  return r;
}

export function buildSpider(scale = 1, queen = false) {
  const rb = new RigBuilder();
  const s = scale, chit = queen ? 0x221a22 : 0x1e1a16, mark = queen ? 0xc080ff : 0xb03020;
  rb.bone('root', null).bone('body', 'root', 0, 0.42 * s, 0).bone('abdomen', 'body', 0, 0.1 * s, -0.3 * s).bone('head', 'body', 0, 0.02 * s, 0.22 * s);
  rb.bone('fangL', 'head', 0.05 * s, -0.04 * s, 0.1 * s).bone('fangR', 'head', -0.05 * s, -0.04 * s, 0.1 * s);
  const legZ = [0.16, 0.06, -0.05, -0.15];
  legZ.forEach((z, i) => {
    for (const side of [1, -1]) {
      const n = (side > 0 ? 'L' : 'R') + i, splay = (z * 1.6);
      rb.bone('c' + n, 'body', 0.12 * s * side, 0, z * s)
        .bone('f' + n, 'c' + n, 0.3 * s * side, 0.28 * s, splay * 0.5 * s)
        .bone('t' + n, 'f' + n, 0.3 * s * side, -0.66 * s, splay * 0.6 * s);
    }
  });
  rb.add('body', G.ball(0.2 * s, 8, 6), chit, { sx: 1, sy: 0.7, sz: 1.15 });
  rb.add('head', G.ball(0.13 * s, 7, 5), chit, { sy: 0.8 });
  for (let i = 0; i < 6; i++) rb.add('head', G.ball((i < 2 ? 0.03 : 0.018) * s, 5, 4), queen ? 0xc060ff : 0xff2a10, { x: ((i % 2) * 2 - 1) * (i < 2 ? 0.035 : 0.075) * s, y: (i < 2 ? 0.06 : 0.04 + (i > 3 ? 0.03 : 0)) * s, z: 0.1 * s, glow: 3 });
  rb.add('fangL', G.cone(0.025 * s, 0.12 * s, 4), 0x0a0808, { y: -0.05 * s, rx: Math.PI - 0.3 });
  rb.add('fangR', G.cone(0.025 * s, 0.12 * s, 4), 0x0a0808, { y: -0.05 * s, rx: Math.PI - 0.3 });
  rb.add('abdomen', G.ball(0.32 * s, 9, 7), chit, { sx: 0.95, sy: 0.85, sz: 1.2, z: -0.12 * s });
  rb.add('abdomen', G.oct(0.09 * s), mark, { y: 0.24 * s, z: -0.1 * s, sx: 0.8, sz: 1.6, sy: 0.3, glow: queen ? 1.4 : 0.6 });
  if (queen) {
    for (let i = 0; i < 4; i++) rb.add('abdomen', G.cone(0.04 * s, 0.18 * s, 4), 0xd8d0c0, { y: 0.2 * s, z: 0.04 * s - i * 0.12 * s, x: 0.0, rx: -0.4 });
    rb.add('head', G.box(0.18 * s, 0.08 * s, 0.06 * s), 0xd8d0c0, { y: 0.07 * s, z: 0.02 * s });
  }
  for (const i of [0, 1, 2, 3]) for (const side of ['L', 'R']) {
    const n = side + i, sg = side === 'L' ? 1 : -1, z = legZ[i], splay = z * 1.6;
    rb.add('c' + n, G.segTo(0.3 * s * sg, 0.28 * s, splay * 0.5 * s, 0.04 * s, 0.035 * s), chit);
    rb.add('f' + n, G.segTo(0.3 * s * sg, -0.66 * s, splay * 0.6 * s, 0.033 * s, 0.012 * s), chit);
    rb.add('f' + n, G.ball(0.04 * s, 5, 4), queen ? 0x3a2a3a : 0x2a221c, {});
  }
  const r = rb.build({ rim: queen ? 0xa060ff : 0x804030, rimI: 0.35 });
  r.kind = 'spider'; r.dims = { s };
  return r;
}

// ---------- NPCs ----------
export function buildWayfarer() {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.06, shoulder: 0.95, bulk: 0.95 });
  const s = d.s, cloak = 0x4a4c52;
  body(rb, d, { skin: 0xc8a088, shirt: 0x3a3a40, belly: 0x3a3a40, sleeve: cloak, fore: cloak, pants: 0x2a2a2e, boots: 0x2a2018 });
  rb.add('hips', G.cyl(0.2 * s, 0.32 * s, 0.8 * s, 8), cloak, { y: -0.36 * s });
  rb.add('chest', G.cyl(0.2 * s, 0.32 * s, 0.2 * s, 8), 0x3e4046, { y: 0.18 * s });
  rb.add('head', G.ball(0.15 * s, 8, 6), cloak, { y: 0.12 * s, z: -0.04 * s, sy: 1.12 });
  rb.add('head', G.cone(0.11 * s, 0.24 * s, 6), cloak, { y: 0.2 * s, z: -0.12 * s, rx: -1.0 });
  rb.add('head', G.cone(0.08 * s, 0.34 * s, 6), 0xbab6b0, { y: -0.08 * s, z: 0.09 * s, rx: Math.PI + 0.2 });
  rb.add('head', G.box(0.15 * s, 0.03 * s, 0.04 * s), 0xbab6b0, { y: 0.06 * s, z: 0.1 * s });
  eyes(rb, d, 0x8ab0d0, { glow: 0.6 });
  rb.add('cape', G.box(0.44 * s, 0.48 * s, 0.03), cloak, { y: -0.22 * s });
  rb.add('cape2', G.box(0.5 * s, 0.6 * s, 0.03), cloak, { y: -0.27 * s });
  const r = rb.build({ rim: 0x90a0c0, rimI: 0.5 });
  r.kind = 'npc'; r.dims = d;
  return r;
}

export function buildSmith() {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 0.84, shoulder: 1.35, leg: 0.72, arm: 1.05, bulk: 1.3 });
  const s = d.s, hair = 0xa8441c;
  body(rb, d, { skin: 0xc8906a, shirt: 0x6a4a30, belly: 0x5a3a24, sleeve: 0xc8906a, fore: 0xc8906a, pants: 0x3a2e24, boots: 0x2a1e14 });
  rb.add('chest', G.box(0.36 * s, 0.6 * s, 0.03), 0x3a2a1c, { y: -0.08 * s, z: 0.14 * s });
  rb.add('head', G.ball(0.13 * s, 8, 6), hair, { y: 0.14 * s, z: -0.03 * s, sy: 0.9 });
  rb.pair('head', 'head', G.cyl(0.035 * s, 0.025 * s, 0.4 * s, 5), hair, { x: 0.1 * s, y: -0.1 * s, z: -0.02 * s });
  rb.pair('head', 'head', G.ball(0.03 * s, 5, 4), 0xc9a24a, { x: 0.1 * s, y: -0.3 * s, z: -0.02 * s, metal: 1 });
  eyes(rb, d, 0x2a1a10);
  rb.pair('foreL', 'foreR', G.cyl(0.06 * s, 0.055 * s, 0.1 * s, 6), 0x2a2018, { y: -0.18 * s });
  const r = rb.build({ rim: 0xff8040, rimI: 0.3 });
  r.kind = 'npc'; r.dims = d;
  return r;
}

export function buildHealer() {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 1.04, shoulder: 0.86, leg: 1.06, bulk: 0.88 });
  const s = d.s, robe = 0xd8dcd0, green = 0x3a6a4a, hair = 0xe0e4ec;
  body(rb, d, { skin: 0xe8c8b0, shirt: robe, belly: green, sleeve: robe, fore: robe, pants: robe, boots: 0x6a5a44 });
  rb.add('hips', G.cyl(0.19 * s, 0.33 * s, 0.84 * s, 8), robe, { y: -0.37 * s });
  rb.add('hips', G.cyl(0.335 * s, 0.335 * s, 0.05 * s, 8), green, { y: -0.78 * s });
  rb.add('head', G.ball(0.13 * s, 8, 6), hair, { y: 0.13 * s, z: -0.03 * s });
  rb.add('head', G.box(0.22 * s, 0.5 * s, 0.08 * s), hair, { y: -0.12 * s, z: -0.08 * s });
  rb.pair('head', 'head', G.cone(0.022 * s, 0.1 * s, 4), 0xe8c8b0, { x: 0.12 * s, y: 0.12 * s, rz: -1.2 });
  rb.add('head', G.torus(0.12 * s, 0.008 * s, 3, 12), 0xd0e0ff, { y: 0.16 * s, rx: 1.57, metal: 1 });
  rb.add('chest', G.oct(0.03 * s), 0x80ffc0, { y: 0.06 * s, z: 0.13 * s, glow: 2.5 });
  eyes(rb, d, 0x3a6a5a);
  const r = rb.build({ rim: 0xa0ffd0, rimI: 0.45 });
  r.kind = 'npc'; r.dims = d;
  return r;
}

export function buildVillager(seed = 0) {
  const rb = new RigBuilder();
  const d = humanoid(rb, { s: 0.95 + (seed % 3) * 0.03, bulk: 1 });
  const s = d.s, cols = [[0x5a4a3a, 0x3a3428], [0x4a3a4a, 0x2a2a30], [0x6a5a3a, 0x3a3020]][seed % 3];
  body(rb, d, { skin: [0xc8987a, 0xb88a6a, 0xd8a888][seed % 3], shirt: cols[0], belly: cols[0], sleeve: cols[0], pants: cols[1], boots: 0x2a2018 });
  rb.add('head', G.ball(0.125 * s, 8, 6), [0x3a2a1a, 0x8a8a8a, 0x6a4a2a][seed % 3], { y: 0.15 * s, z: -0.02 * s, sy: 0.8 });
  rb.add('hips', G.cyl(0.18 * s, 0.26 * s, 0.4 * s, 7), cols[0], { y: -0.18 * s });
  eyes(rb, d, 0x1a1410);
  const r = rb.build({ rim: 0x806040, rimI: 0.3 });
  r.kind = 'npc'; r.dims = d;
  return r;
}
