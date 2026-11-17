// Act VII's code props (docs/act7-contract.md, "Expected assets" and L.spots; act7-design/40-production.md, item 6 and
// "The look: daylight"). Everything here is made in code and stands in daylight: lit Lambert/standard materials that read
// under the sun, no additive glow but a flame's, and every flame over a dark normal-blended under-sprite so it shows on
// pale ground and snow. The conventions are build6.js's: a prop is a THREE.Group with userData.kind and its switches
// (userData.setX), no light of its own (the layout's L.lights and light.js's pools light it), geometries shared and
// cached (geometry.userData.shared, which world.js disposeZone leaves alone), a material made for one prop marked own().
//   act7Prop(kind, o)      one prop (the table is PROP7 below; docs/act7-briefs/reports/stageA-build7.md lists each)
//   act7Level(L, lvl, o)   builds every prop of a gen7 layout once at its spot, in the first state of the reading
//                          (L.mode), adds them to lvl.group and returns the handles (world.js keeps them as lvl.act7)
//   dispose7(handles)      takes them out again (a rebuilt reading, a test)
//   keladosParts / keladosDress   Kelados's eight ice plates, snow cap, pine and moss, to hang on the golem's bones
//   cloudDisc(r)           the cloud's shade on the ground (light.js moves it)
// Nothing here stands a hut or a fold in water, and nothing here is a body.
import * as THREE from 'three';
import { R } from '../gfx/gfx.js';
import { emitAt } from '../gfx/fx.js';
import { ENV } from '../gfx/env.js';
import { tex } from '../gfx/textures.js';
import { G } from '../gfx/rig.js';
import { RNG, clamp, lerp, noise2 } from '../core/util.js';
import { groundY } from './genlib.js';
import { TICKS } from './sea.js';
import { MAT, mats, worldMat, bake, jitter, prism, own, lay4, hash2, occlude, WIND, drapable, drape } from './build.js';

// ---------- colours ----------
// stone7 is world-projected where a layer is in (vertex colour relative to GREY, as build6's stone6); the rest are plain
// vertex colours, chosen pale enough for the sun
const GREY = 0x6a6a6a, ST = 0x6a6a6a, STL = 0x808080, STD = 0x56575a, STW = 0x767068;
const WD = 0x5e4a36, WDD = 0x3e3024, WDL = 0x7a6448, BARK = 0x3e3228, GRAIN = 0x9a8058, ROPE = 0x857250;
const IR = 0x3c3e44, IRL = 0x5a5e66;
const SN = 0xd2d8e0, SNS = 0x9aa8bc, SND = 0x8a8a86;
const IC = 0x9cc8e0, ICD = 0x6ea4c8, ICL = 0xcae6f4;
const PINE = 0x34502e, PINED = 0x263a22, MOSS = 0x47562c, TURF = 0x4c5438;
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const TRS = (x, y, z, ry = 0, tilt = 0, s = 1, pitch = 0, sy = s) => { _e.set(pitch, ry, tilt, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(s, sy, s)); };

// ---------- materials (shared, cached in build.js's MAT as build6's are) ----------
const M7 = { key: '' };
function mats7() {
  const key = (ENV.packs?.rime ? 'r' : '') + (ENV.ready ? 'e' : '') + R.quality;
  if (M7.key === key) return MAT;
  M7.key = key;
  // rock7: the mountain's own rock (rime's sea cliff where the pack is in, tarn; else the boot set's pale blocks, wide and
  // a little warm: the boot wall layer, thaw's cliff, drew every boulder as mossy brickwork at any scale); stone7: dressed
  // Stoneborn masonry (the same blocks at their own scale, paler). The fallback's colour lifts GREY to a pale stone, so one set of
  // vertex colours serves both
  const rk = ENV.ready ? lay4('rime/seaCliff', 'blocks', 'wall') : null, bl = ENV.ready ? lay4('blocks', 'wall') : null;
  MAT.rock7 = rk ? worldMat(rk, { scale: rk === 'blocks' ? 5 : 4.4, vc: rk === 'rime/seaCliff' ? 0.11 : rk === 'blocks' ? 0.1 : 0.07, tri: true, rough: 0.92, tint: rk === 'blocks' ? 0xb4b0a8 : 0xc4c6c8 }) : (MAT.rock7c ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: new THREE.Color(0x8e9092).multiplyScalar(2.4) })));
  MAT.stone7 = bl ? worldMat(bl, { scale: 3, vc: bl === 'blocks' ? 0.09 : 0.07, tri: true, rough: 0.88, tint: 0xc8c8c6 }) : (MAT.stone7c ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, color: new THREE.Color(0xa4a6a8).multiplyScalar(2.4) })));
  MAT.solid7 ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  // snow: never dithered away between the camera and her (it lies low), a little of its own light so its shaded side
  // stays blue-white and not grey
  MAT.snow7 ||= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x0c1016 });
  // ice: a clear block (the Icebound's, the winch's and the levers' shells) and the solid blue ice (the wall, the plug,
  // Kelados's plates, cover)
  MAT.ice7 ||= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.8, emissive: 0x10262e });
  // (a shell round a winch or a lever: thin enough to show what stands in it)
  MAT.ice7s ||= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.5, emissive: 0x10262e, depthWrite: false });
  MAT.ice7o ||= occlude(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x14303c }));
  MAT.dark7 ||= new THREE.MeshBasicMaterial({ color: 0x0b0a09 });
  MAT.wet7 ||= new THREE.MeshBasicMaterial({ color: 0x24323e, transparent: true, opacity: 0.34, depthWrite: false });
  return MAT;
}
// ---------- geometry: shared and cached ----------
const GEO7 = new Map();
const geo7 = (key, f) => { let g = GEO7.get(key); if (!g) { g = f(); g.userData.shared = true; GEO7.set(key, g); } return g; };
// a baked mesh; key: its geometry cached under it (parts is then a thunk, run once)
function solid7(key, parts, mat, shadow = true) {
  const m = new THREE.Mesh(key ? geo7(key, () => bake(parts())) : bake(typeof parts === 'function' ? parts() : parts), mat || MAT.solid7);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
// a grid of nx x nz quads, f(u, v) -> [x, y, z, colour] (indexed, flat-shaded by its material)
function gridGeo(nx, nz, f) {
  const pos = [], col = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const p = f(i / nx, j / nz, i, j); pos.push(p[0], p[1], p[2]); _c.set(p[3]); col.push(_c.r, _c.g, _c.b); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
const mixC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)).getHex();
// a ring of n stones round the origin (build6's stoneRing, pale)
function stoneRing(seed, n, r, s, color = ST, sy = 0.7) {
  const rr = RNG(seed), parts = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + rr.range(-0.15, 0.15), w = s * rr.range(0.8, 1.2); parts.push({ geo: jitter(G.dodeca(w), w * 0.25, seed + k), color: k % 3 ? color : STD, o: { x: Math.sin(a) * r, y: w * sy * 0.45, z: Math.cos(a) * r, sy, ry: rr.range(0, 6.28) }, jit: 0.12 }); }
  return parts;
}
// a tween run while its prop stands in the scene: f(k), k 0..1 over dur s, then done
function tween(obj, dur, f, done) {
  let t = 0;
  const tk = { obj, tick(dt) { t += dt; const k = clamp(t / Math.max(dur, 1e-3), 0, 1); f(k); if (k >= 1) { TICKS.delete(tk); done?.(); } } };
  TICKS.add(tk);
  return tk;
}
const ease = (k) => k * k * (3 - 2 * k);

// ---------- textures made in code (each once) ----------
const TEX7 = {};
const canvas7 = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// a mason's mark: a few straight cuts (a chevron, a stem, a bar), white on clear; one per seed (0-5: the six memories)
function markTex(seed = 0) {
  const key = 'mark' + (seed % 6);
  if (TEX7[key]) return TEX7[key];
  const c = canvas7(64, 64), g = c.getContext('2d'), rr = RNG(700 + (seed % 6) * 31);
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'square'; g.lineJoin = 'miter';
  const P = [[32, 8], [12, 30], [52, 30], [32, 56], [14, 52], [50, 52], [32, 30]];
  const L = [[1, 0, 2], [0, 3]];                                    // the chevron over a stem: every mark has it
  const extra = [[[4, 5]], [[1, 4]], [[2, 5]], [[4, 6, 5]], [[1, 3, 2]], [[4, 5], [1, 2]]][seed % 6];
  for (const l of [...L, ...extra]) { g.beginPath(); l.forEach((i, k) => { const x = P[i][0] + rr.range(-1, 1), y = P[i][1] + rr.range(-1, 1); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  return (TEX7[key] = new THREE.CanvasTexture(c));
}
// the flower cards' atlas: 256 px, 4 x 4 tiles of 64 (column: the kind's colour; row: how many heads and how tall)
const FLOWER_C = [['#8a5ad8', '#f0c040'], ['#f2d040', '#c88a20'], ['#f6f6ee', '#e8c040'], ['#e078a4', '#f4e070']];
function flowerAtlas() {
  if (TEX7.flowers) return TEX7.flowers;
  const c = canvas7(256, 256), g = c.getContext('2d'), rr = RNG(7411);
  for (let row = 0; row < 4; row++) for (let colm = 0; colm < 4; colm++) {
    const x0 = colm * 64, y0 = row * 64, n = 3 + row, [pet, eye] = FLOWER_C[colm];
    for (let k = 0; k < n; k++) {
      const bx = x0 + 32 + rr.range(-5, 5), tx = x0 + 10 + (k + 0.5) * (44 / n) + rr.range(-3, 3), ty = y0 + rr.range(8, 30) + (3 - row) * 3;
      g.strokeStyle = k % 2 ? '#4a7a34' : '#5c8a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, y0 + 64); g.quadraticCurveTo((bx + tx) / 2, y0 + 44, tx, ty); g.stroke();
      // (a leaf low on the stem)
      g.fillStyle = '#4e8236'; g.beginPath(); g.ellipse((bx + tx) / 2 + 3, y0 + 50, 6, 2.5, rr.range(-0.8, 0.8), 0, 6.3); g.fill();
      g.fillStyle = pet;
      for (let p = 0; p < 5; p++) { const a = p * 1.2566 + rr.range(0, 0.6); g.beginPath(); g.arc(tx + Math.cos(a) * 4.2, ty + Math.sin(a) * 4.2, 3.6, 0, 6.3); g.fill(); }
      g.fillStyle = eye; g.beginPath(); g.arc(tx, ty, 2.6, 0, 6.3); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.anisotropy = 2;
  return (TEX7.flowers = t);
}
// the rainbow's arc: seven soft bands, clear inside and out, fading toward its feet
function rainbowTex() {
  if (TEX7.rainbow) return TEX7.rainbow;
  const W = 256, H = 128, c = canvas7(W, H), g = c.getContext('2d'), im = g.createImageData(W, H), col = new THREE.Color();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - 127.5, dy = H - 0.5 - y, r = Math.hypot(dx, dy), t = (r - 100) / 22, i = (y * W + x) * 4;
    if (t < 0 || t > 1) continue;
    col.setHSL(0.76 * (1 - t), 0.9, 0.6);
    const a = Math.pow(Math.sin(Math.PI * t), 0.7) * clamp(dy / 34, 0, 1);
    im.data[i] = col.r * 255; im.data[i + 1] = col.g * 255; im.data[i + 2] = col.b * 255; im.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c);
  return (TEX7.rainbow = t);
}
// the lake's thread: white water falling, streaked along its length, soft at both sides (it repeats along v)
function threadTex() {
  if (TEX7.thread) return TEX7.thread;
  const W = 16, H = 64, c = canvas7(W, H), g = c.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = 1 - Math.abs(x - 7.5) / 8, a = Math.pow(u, 1.4) * (0.62 + 0.38 * Math.sin(y * 0.39 + x * 1.7) * Math.sin(y * 0.098 * 2 + 1.3)), i = (y * W + x) * 4;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(clamp(a, 0, 1) * 255);
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping;
  return (TEX7.thread = t);
}
// a column of day smoke: narrow at its foot, wide and thin at its head
function smokeTex() {
  if (TEX7.smoke) return TEX7.smoke;
  const W = 32, H = 128, c = canvas7(W, H), g = c.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = 1 - y / (H - 1), half = 0.16 + 0.34 * v, cx = 0.5 + Math.sin(v * 5.2) * 0.07 * v, d = Math.abs(x / (W - 1) - cx) / half, i = (y * W + x) * 4;
    const a = d > 1 ? 0 : (1 - d * d) * Math.min(1, v * 10) * (1 - v) * (0.75 + 0.25 * noise2(x * 0.3, y * 0.11));
    im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(clamp(a * 1.5, 0, 1) * 255);
  }
  g.putImageData(im, 0, 0);
  return (TEX7.smoke = new THREE.CanvasTexture(c));
}

// ---------- fire in daylight ----------
// The flame is the one additive thing in the act. Its cards carry grey levels and its own material the colour (the
// lookout's rank); behind them a dark, normal-blended sprite (the "dark under-plane" of part 4's table) so the flame has
// something to add to on snow. { group, set(b), k(k), color(hex), lit }
let FLAME_GEO = null;
function fire7(s = 1, o = {}) {
  const g = new THREE.Group();
  const coal = own(new THREE.MeshBasicMaterial({ color: 0x15100c, toneMapped: false }));
  const bed = new THREE.Mesh(geo7('coal', () => jitter(G.dome(0.28, 0.25, 8), 0.03, 931)), coal); bed.scale.setScalar(s); bed.position.y = -0.02 * s; g.add(bed);
  const under = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: tex('dot'), color: 0x120a06, transparent: true, opacity: 0.5, depthWrite: false }))); under.scale.set(1.25 * s, 1.5 * s, 1); under.position.y = 0.3 * s; under.renderOrder = 2.1; g.add(under);
  const tint = own(new THREE.MeshBasicMaterial({ color: o.color ?? 0xff8a30, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  FLAME_GEO ||= (() => { const f = bake([{ geo: G.cone(0.1, 0.36, 6), color: 0x8c8c8c, o: { y: 0.18 } }, { geo: G.cone(0.066, 0.26, 5), color: 0xb4b4b4, o: { y: 0.14 } }, { geo: G.cone(0.035, 0.14, 5), color: 0xffffff, o: { y: 0.08 } }]); f.userData.shared = true; return f; })();
  const fl = new THREE.Group(); g.add(fl);
  const n = o.n ?? 5;
  for (let k = 0; k < n; k++) {
    const a = k * 2.1, fs = s * (k ? 0.6 + k * 0.08 : 1), f = new THREE.Mesh(FLAME_GEO, tint), seed = (k + 1) * 17.3 + s * 5;
    if (k) f.position.set(Math.sin(a) * s * 0.09, 0, Math.cos(a) * s * 0.09);
    f.scale.setScalar(fs); f.renderOrder = 2.2;
    // (its own sway: band-limited, a seed of its own, never one beat)
    f.onBeforeRender = () => { const t = R.time * 4.5 + seed; f.scale.set(fs * (1 + (noise2(t, seed) - 0.5) * 0.18), fs * (1 + (noise2(t * 1.3, seed + 7) - 0.5) * 0.34), fs * (1 + (noise2(t * 0.9, seed + 3) - 0.5) * 0.18)); };
    fl.add(f);
  }
  // (no fire particles of fx's: they are orange whatever the rank, and swamped a pale flame)
  const fx = [];
  if (o.smoke) fx.push({ type: 'smoke', s: 1, y0: 0.9 * s });
  const p = new THREE.Vector3();
  let lit = false;
  TICKS.add({ obj: g, tick(dt) { if (!lit || R.quality < 1) return; g.updateWorldMatrix(true, false); p.setFromMatrixPosition(g.matrixWorld); for (const e of fx) { e.x = p.x; e.y = p.y + e.y0; e.z = p.z; emitAt(e, dt); } } });
  // (the coal bed is most of what the play camera sees of a fire from above: it takes the flame's colour too)
  const HOT = new THREE.Color(0xff7024);
  const set = (b) => { lit = !!b; if (lit) coal.color.copy(tint.color).lerp(HOT, 0.3); else coal.color.set(0x15100c); fl.visible = under.visible = lit; };
  set(false);
  return { group: g, set, k(k) { fl.scale.setScalar(1 + k * 0.6); under.scale.set(1.25 * s * (1 + k * 0.6), 1.5 * s * (1 + k * 0.6), 1); }, color(c) { tint.color.set(c); set(lit); }, get lit() { return lit; } };
}
// the lookout's flame by rank (contract F9: 0 the shipped orange and small ... 6 white)
export const RANK7 = [0xff8a30, 0xff8a30, 0xffc050, 0xffd870, 0xffe8a8, 0xfff4d8, 0xffffff];

// an ice shell round a winch or a lever: setIce(k) 1 whole, 0 gone
function iceShell(g, w, h, y, seed) {
  const m = solid7('shell' + w + '|' + h, () => [{ geo: jitter(G.ico(1, 1), 0.16, seed), color: IC, o: { sx: w, sy: h, sz: w * 0.8 }, top: 1.2 }, { geo: jitter(G.box(w * 0.9, h * 0.5, w * 0.7), 0.1, seed + 1), color: ICD, o: { x: w * 0.6, y: -h * 0.55, ry: 0.5 } }], MAT.ice7s, false);
  m.position.y = y; m.renderOrder = 1.6; g.add(m);
  return (k = 1) => { k = clamp(k, 0, 1); m.visible = k > 0.02; m.scale.set(0.55 + 0.45 * k, Math.max(0.05, k), 0.55 + 0.45 * k); m.position.y = y * (0.3 + 0.7 * k); g.userData.ice = k; };
}
// a mason's mark as a decal (cut: dark in the stone; glowing: warm and pale, normal-blended, never additive)
function markDecal(seed, size) {
  const m = new THREE.Mesh(geo7('markq', () => new THREE.PlaneGeometry(1, 1)), own(new THREE.MeshBasicMaterial({ map: markTex(seed), color: 0x1c1814, transparent: true, opacity: 0.9, depthWrite: false })));
  m.scale.setScalar(size); m.renderOrder = 2;
  const CUT = new THREE.Color(0x1c1814), LIT = new THREE.Color(0xffdc8a);
  m.userData.setGlow = (k = 1) => { k = clamp(k, 0, 1); m.material.color.copy(CUT).lerp(LIT, k); m.material.opacity = 0.9 + 0.1 * k; };
  return m;
}

// ---------- the props ----------
const LOG_N = 18, LOG_HALF = 8;
const PROP7 = {
  // a weir: a Stoneborn wheel lying flat on a stone pillar, on a sill of dressed stone with a plank gate between two
  // cheeks (the channel runs along local z under the gate). setTurn(k) 0..1 turns the wheel and lifts the gate;
  // setOpen(b, anim) the whole turn; the sill carries its mason's mark (o.mark 0-5; setGlow(k)). o.great: the great wheel
  // at the Dam's west lip (x 1.7)
  weir(o) {
    const g = new THREE.Group(), body = new THREE.Group(), s = o.great ? 1.7 : 1; g.add(body); body.scale.setScalar(s);
    body.add(solid7('weirSill', () => [
      { geo: jitter(G.box(3.2, 0.5, 1.5), 0.04, 701), color: ST, o: { y: 0.25 }, top: 1.15 },
      { geo: jitter(G.box(0.5, 1.5, 0.7), 0.03, 702), color: STL, o: { x: -0.95, y: 1.2, z: -0.3 } }, { geo: jitter(G.box(0.5, 1.5, 0.7), 0.03, 703), color: STL, o: { x: 0.35, y: 1.2, z: -0.3 } },
      { geo: jitter(G.box(2.0, 0.3, 0.8), 0.03, 704), color: STD, o: { x: -0.3, y: 2.05, z: -0.3 } },
      { geo: jitter(G.cyl(0.3, 0.38, 0.75, 7), 0.02, 705), color: STL, o: { x: 1.1, y: 0.86, z: 0.25 } },
      { geo: jitter(G.box(0.9, 0.3, 0.6), 0.04, 706), color: STD, o: { x: -1.9, y: 0.14, z: 0.3, ry: 0.3 } }], MAT.stone7));
    const gate = solid7('weirGate', () => [...[0, 1, 2].map((k) => ({ geo: G.box(0.27, 1.25, 0.09), color: k % 2 ? WD : WDL, o: { x: -0.57 + k * 0.275, y: 0.62 }, jit: 0.1 })), { geo: G.box(0.9, 0.09, 0.12), color: IR, o: { y: 0.3, z: 0.02 } }, { geo: G.box(0.9, 0.09, 0.12), color: IR, o: { y: 1.0, z: 0.02 } }]);
    gate.position.set(-0.3, 0.5, -0.3); body.add(gate);
    const wheel = solid7('weirWheel', () => [{ geo: G.torus(0.78, 0.085, 5, 16), color: WDD, o: { rx: Math.PI / 2 } }, ...[0, 1, 2, 3].map((k) => ({ geo: G.box(1.56, 0.07, 0.1), color: k % 2 ? WD : WDL, o: { ry: k * 0.7854 } })),
      { geo: G.cyl(0.15, 0.17, 0.2, 8), color: IR }, ...Array.from({ length: 8 }, (_, k) => ({ geo: G.cyl(0.035, 0.04, 0.3, 4), color: WDL, o: { x: Math.sin(k * 0.7854) * 0.78, y: 0.16, z: Math.cos(k * 0.7854) * 0.78 } }))]);
    wheel.position.set(1.1, 1.32, 0.25); body.add(wheel);
    const mark = markDecal(o.mark ?? 0, 0.42); mark.position.set(0.35, 1.2, 0.075); body.add(mark);
    // (and once more on the sill's top, where the play camera looks)
    const top = markDecal(o.mark ?? 0, 0.5); top.rotation.x = -Math.PI / 2; top.position.set(-1.05, 0.515, 0.42); body.add(top);
    let tk = null;
    g.userData.setTurn = (k = 0) => { k = clamp(k, 0, 1); wheel.rotation.y = -k * Math.PI * 3; gate.position.y = 0.5 + ease(k) * 0.95; g.userData.turn = k; g.userData.open = k >= 1; };
    g.userData.setOpen = (b, anim = false) => { if (tk) TICKS.delete(tk); tk = null; const k0 = g.userData.turn || 0, k1 = b ? 1 : 0; if (!anim) return g.userData.setTurn(k1); tk = tween(g, 2, (k) => g.userData.setTurn(lerp(k0, k1, k))); };
    g.userData.setGlow = (k) => { mark.userData.setGlow(k); top.userData.setGlow(k); g.userData.glow = k; };
    g.userData.wheelAt = { x: 1.1 * s, y: 1.32 * s, z: 0.25 * s };
    g.userData.setTurn(0);
    return g;
  },
  // a log-jam against a weir: a dozen stripped trunks piled across each other, pale and wet (o.n logs, 11)
  logjam(o) {
    const n = o.n ?? 11;
    return wrap(solid7('logjam' + n, () => { const rr = RNG(721), parts = []; for (let k = 0; k < n; k++) { const len = rr.range(2.4, 4.2), r = rr.range(0.13, 0.21), lay = k < n * 0.6 ? 0 : 1; parts.push({ geo: G.cyl(r * 0.8, r, len, 6), color: k % 3 ? 0x6c665c : 0x565048, o: { x: rr.range(-1.3, 1.3), y: r + lay * 0.3 + rr.range(0, 0.1), z: rr.range(-0.7, 0.7), rz: Math.PI / 2 + rr.range(-0.12, 0.12), ry: rr.range(-0.22, 0.22) + (k % 5 === 4 ? 1.1 : 0) }, jit: 0.12 }); } return parts; }));
  },
  // a horn-stone at a chute's foot: a leaning standing stone with a horn's mouth cut through its head (a stone ring), a
  // pale band where hands have worn it
  hornStone() {
    return wrap(solid7('hornStone', () => [{ geo: jitter(G.cyl(0.3, 0.5, 1.7, 6), 0.05, 731), color: STL, o: { y: 0.85, rz: 0.06 }, top: 1.2 }, { geo: jitter(G.torus(0.4, 0.14, 5, 9), 0.02, 732), color: STL, o: { x: -0.1, y: 2.02, rz: 0.06 } },
      { geo: G.cyl(0.4, 0.43, 0.16, 6), color: 0x3c3a38, o: { y: 1.2, rz: 0.06, x: -0.07 } }, { geo: G.cyl(0.46, 0.49, 0.12, 6), color: 0x3c3a38, o: { y: 0.6, rz: 0.06, x: -0.03 } }, ...stoneRing(733, 4, 0.62, 0.2, STD)], MAT.stone7));
  },
  // a cornice at a chute's head: a rock lip (always), and a loaded lip of snow hanging over it toward local +z, down the
  // lane. setArmed(b): armed the snow, spent bare rock; setK(k) the cap's size as it grows back (0..1). o.w its width (4)
  cornice(o) {
    const g = new THREE.Group(), w = o.w ?? 4, s = w / 4;
    const rock = solid7('corniceRock', () => [{ geo: jitter(G.ico(1, 1), 0.12, 741), color: ST, o: { y: 0.45, z: -0.5, sx: 2.25, sy: 0.95, sz: 0.95 }, top: 1.15 }, { geo: jitter(G.dodeca(0.85), 0.14, 742), color: STD, o: { x: -1.6, y: 0.35, z: 0.25, sy: 0.8 } }, { geo: jitter(G.dodeca(0.7), 0.12, 743), color: STL, o: { x: 1.65, y: 0.3, z: 0.2, sy: 0.8 } }], MAT.rock7);
    rock.scale.setScalar(s); g.add(rock);
    const snow = solid7('corniceSnow', () => [{ geo: jitter(G.ico(1, 1), 0.07, 744), color: SN, o: { y: 1.45, z: 0.25, sx: 2.3, sy: 0.55, sz: 1.25 } }, { geo: jitter(G.ico(1, 0), 0.08, 745), color: SNS, o: { x: -1.2, y: 1.15, z: 1.0, sx: 0.9, sy: 0.4, sz: 0.6 } }, { geo: jitter(G.ico(1, 0), 0.08, 746), color: SNS, o: { x: 1.0, y: 1.1, z: 1.1, sx: 1.1, sy: 0.42, sz: 0.55 } }], MAT.snow7);
    g.add(snow);
    let armed = true, kk = 1;
    const look = () => { snow.visible = armed && kk > 0.02; snow.scale.set(s * (0.5 + 0.5 * kk), s * Math.max(0.05, kk), s * (0.35 + 0.65 * kk)); g.userData.armed = armed; g.userData.k = kk; };
    g.userData.setArmed = (b) => { armed = !!b; if (armed && kk < 0.02) kk = 1; look(); };
    g.userData.setK = (k = 1) => { kk = clamp(k, 0, 1); look(); };
    look();
    return g;
  },
  // a slide's tongue lying down a lane: a low mound of dirty snow from the origin along local +z (o.len 8, o.w 4).
  // setK(k): 0 nothing, 1 the whole tongue (it grows down the lane as it comes to rest)
  snowTongue(o) {
    const len = o.len ?? 8, w = o.w ?? 4, rr = RNG(751 + Math.round(len * 7));
    // (lumps and blocks of old snow with grit in it, a lobed nose: flat and clean it was a white sheet on the ground)
    const geo = gridGeo(5, 10, (u, v, i, j) => {
      const nose = v < 0.7 ? 1 : Math.sqrt(Math.max(0.03, 1 - Math.pow((v - 0.7) / 0.3, 2) * 0.92)), edge = i === 0 || i === 5 || j === 0 || j === 10, lobe = 1 + 0.12 * Math.sin(v * 9 + u * 4);
      const y = edge ? 0.02 : Math.pow(Math.sin(Math.PI * u), 0.6) * (0.3 + 0.35 * v) + rr.range(0, 0.38), dirt = rr.next();
      return [(u - 0.5) * w * nose * lobe + (edge ? 0 : rr.range(-0.25, 0.25)), y, v * len + (edge ? 0 : rr.range(-0.25, 0.25)), dirt < 0.16 ? SND : mixC(SNS, SN, y / 0.6 + rr.range(-0.25, 0.1))];
    }).toNonIndexed();
    geo.computeVertexNormals();
    const g = wrap(Object.assign(new THREE.Mesh(geo, MAT.snow7), { receiveShadow: true }));
    g.userData.setK = (k = 1) => { k = clamp(k, 0, 1); g.visible = k > 0.01; g.scale.set(0.7 + 0.3 * k, Math.max(0.02, k), 0.25 + 0.75 * k); g.userData.k = k; };
    g.userData.setK(o.k ?? 1);
    return g;
  },
  // a block of ice an Icebound stands in: o.size 'small' (1.2 x 1.4 m) or 'big' (1.9 x 2.4 m), clear enough to show what is
  // in it. setMelt(k): 0 whole, 1 a puddle; shatter(done): it breaks into shards (a blow, the sun's last second);
  // reset(): whole again
  iceBlock(o) {
    const g = new THREE.Group(), big = o.size === 'big' || !!o.big, w = big ? 1.9 : 1.2, h = big ? 2.4 : 1.4;
    const body = solid7('iceBlock' + (big ? 'B' : 'S'), () => [{ geo: jitter(G.cyl(w * 0.4, w * 0.56, h, 6), w * 0.07, 761), color: IC, o: { y: h / 2 }, top: 1.25 },
      { geo: jitter(G.box(w * 0.5, h * 0.42, w * 0.5), 0.06, 762), color: ICD, o: { x: w * 0.42, y: h * 0.2, z: 0.1, ry: 0.5 } }, { geo: jitter(G.box(w * 0.4, h * 0.3, w * 0.45), 0.05, 763), color: ICL, o: { x: -w * 0.4, y: h * 0.14, z: -w * 0.2, ry: -0.3 } }], MAT.ice7);
    body.renderOrder = 1.6; g.add(body);
    const puddle = new THREE.Mesh(geo7('disc12', () => new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2)), MAT.wet7); puddle.position.y = 0.03; puddle.renderOrder = 1.5; g.add(puddle);
    let shards = null, melt = 0;
    const look = () => { body.visible = !g.userData.shattered && melt < 0.995; body.scale.set(1 - 0.3 * melt, Math.max(0.03, 1 - 0.85 * melt), 1 - 0.3 * melt); puddle.visible = melt > 0.01 || !!g.userData.shattered; puddle.scale.setScalar(w * (0.5 + 0.8 * Math.max(melt, g.userData.shattered ? 0.6 : 0))); };
    g.userData.setMelt = (k = 0) => { melt = clamp(k, 0, 1); g.userData.melt = melt; look(); };
    g.userData.shatter = (done, dur = 0.7) => {
      if (g.userData.shattered) return done?.();
      g.userData.shattered = true; look();
      if (!shards) { shards = new THREE.Group(); g.add(shards); for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(geo7('shard', () => bake([{ geo: jitter(G.oct(0.3), 0.08, 765), color: ICL }])), MAT.ice7o); m.userData.a = k * 0.9 + 0.3; m.userData.d = 0.5 + (k % 3) * 0.3; shards.add(m); } }
      shards.visible = true;
      const lay = (k) => { for (const m of shards.children) { const d = w * 0.3 + m.userData.d * w * 0.9 * k; m.position.set(Math.sin(m.userData.a) * d, 0.12 + h * 0.5 * (1 - k) + Math.sin(Math.PI * k) * 0.5, Math.cos(m.userData.a) * d); m.rotation.set(k * 3 + m.userData.a, k * 2, 0); m.scale.setScalar((big ? 1.3 : 0.9) * (1 - 0.35 * k)); } };
      lay(0);
      // (the shards stay as rubble where they fell: low, never cover)
      tween(g, dur, lay, done);
      g.userData.layShards = lay;
    };
    g.userData.reset = () => { g.userData.shattered = false; if (shards) shards.visible = false; g.userData.setMelt(0); };
    g.userData.h = h; g.userData.r = w / 2;
    g.userData.setMelt(o.melt ?? 0);
    return g;
  },
  // a flat stone a scorpion pack lies under: setOpen(b): lifted on its near edge (local +z), the hollow under it dark
  slab(o) {
    const g = new THREE.Group();
    const hollow = new THREE.Mesh(geo7('disc12', () => new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2)), MAT.dark7); hollow.scale.set(0.75, 1, 0.5); hollow.position.y = 0.025; g.add(hollow);
    const pivot = new THREE.Group(); pivot.position.set(0, 0.04, 0.62); g.add(pivot);
    const st = solid7('slab', () => [{ geo: jitter(G.box(1.8, 0.24, 1.3), 0.05, 771), color: STL, o: { y: 0.12, z: -0.62 }, top: 1.2 }], MAT.rock7); pivot.add(st);
    g.add(solid7('slabFeet', () => stoneRing(772, 5, 1.0, 0.16, STD, 0.6), MAT.rock7, false));
    g.userData.setOpen = (b, anim = false) => { g.userData.open = !!b; const a1 = b ? 0.8 : 0, a0 = pivot.rotation.x; if (!anim) { pivot.rotation.x = a1; return; } tween(g, 0.35, (k) => { pivot.rotation.x = lerp(a0, a1, ease(k)); }); };
    g.userData.setOpen(!!o.open);
    return g;
  },
  // a den's mouth in a wall: two shoulders of rock, a lintel across them, the dark inside (local +z is out).
  // o.blocked: fallen stones fill it (the Den's own mouth, the cub's spot); o.s its size (1: 2.2 m wide)
  denMouth(o) {
    const g = new THREE.Group(), s = o.s ?? 1; g.scale.setScalar(s);
    g.add(solid7('denMouth', () => [{ geo: jitter(G.dodeca(1.15), 0.2, 781), color: ST, o: { x: -1.75, y: 0.8, sy: 1.25 } }, { geo: jitter(G.dodeca(1.05), 0.2, 782), color: STD, o: { x: 1.7, y: 0.75, sy: 1.3 } },
      { geo: jitter(G.box(4.3, 0.95, 1.7), 0.16, 783), color: STL, o: { y: 2.25, z: -0.1 }, top: 1.15 }, { geo: jitter(G.dodeca(0.5), 0.1, 784), color: STD, o: { x: -1.2, y: 0.25, z: 1.0 } }, { geo: jitter(G.dodeca(0.38), 0.1, 785), color: ST, o: { x: 1.35, y: 0.2, z: 1.1 } }], MAT.rock7));
    const hole = solid7('denHole', () => [{ geo: G.box(2.5, 1.9, 0.1), color: 0xffffff, o: { y: 0.95, z: -0.35 } }, { geo: G.box(2.3, 0.04, 1.3), color: 0xffffff, o: { y: 0.03, z: 0.25 } }], MAT.dark7, false); g.add(hole);
    if (o.blocked) g.add(solid7('denBlock', () => [{ geo: jitter(G.dodeca(0.75), 0.15, 786), color: STL, o: { x: -0.45, y: 0.55, z: 0.1 } }, { geo: jitter(G.dodeca(0.65), 0.14, 787), color: ST, o: { x: 0.6, y: 0.45, z: 0.2 } }, { geo: jitter(G.dodeca(0.55), 0.12, 788), color: STD, o: { x: 0.1, y: 1.3, z: 0.0 } }], MAT.rock7));
    g.userData.mouthAt = { x: 0, z: 1.2 * s };
    return g;
  },
  // a fallen pine: the trunk along local z from its root plate at the origin (o.len 8), stubs of branches, a few green
  // boughs still on its head. Thick enough to be cover
  fallenPine(o) {
    const len = o.len ?? 8;
    return wrap(solid7('fallenPine' + len, () => {
      const rr = RNG(791), parts = [{ geo: G.cyl(0.2, 0.42, len, 7), color: BARK, o: { y: 0.42, z: len / 2, rx: Math.PI / 2 }, jit: 0.15 }, { geo: jitter(G.cyl(1.0, 0.8, 0.3, 8), 0.12, 792), color: 0x4a4034, o: { y: 0.75, z: -0.1, rx: Math.PI / 2 } }];
      for (let k = 0; k < 5; k++) { const a = k * 1.3; parts.push({ geo: G.segTo(Math.sin(a) * 1.0, Math.abs(Math.cos(a)) * 0.9, -0.4, 0.09, 0.03, 4), color: WDD, o: { y: 0.6, z: -0.1 } }); }
      for (let k = 0; k < 7; k++) { const z = len * (0.25 + k * 0.1), sd = k % 2 ? 1 : -1; parts.push({ geo: G.segTo(sd * rr.range(0.5, 1.0), rr.range(0.3, 0.9), rr.range(-0.2, 0.3), 0.06, 0.02, 4), color: WD, o: { y: 0.5, z } }); }
      for (let k = 0; k < 4; k++) { const z = len * (0.62 + k * 0.11); parts.push({ geo: G.cone(0.75 - k * 0.12, 1.5, 6), color: k % 2 ? PINE : PINED, o: { y: 0.55 + (k % 2) * 0.2, z, rx: Math.PI / 2 - 0.15, x: (k % 2 ? 0.25 : -0.2) }, soft: 0.5 }); }
      return parts;
    }));
  },
  // a lookout's hearth: a round stone floor, a ring of stones, wood laid in it. setLit(b); setRank(0..6) the flame's colour
  // and size (the far fire of its peak takes the same rank)
  lookHearth(o) {
    const g = new THREE.Group();
    g.add(solid7('lookHearth', () => [{ geo: jitter(G.cyl(1.25, 1.4, 0.24, 9), 0.05, 801), color: ST, o: { y: 0.12 }, top: 1.18 }, ...stoneRing(802, 8, 0.66, 0.24, STL).map((p) => (p.o.y += 0.24, p))], MAT.stone7));
    g.add(solid7('hearthWood', () => Array.from({ length: 5 }, (_, k) => { const a = (k / 5) * Math.PI * 2; return { geo: G.cyl(0.05, 0.07, 0.8, 5), color: k % 2 ? WD : WDD, o: { x: Math.sin(a) * 0.16, y: 0.5, z: Math.cos(a) * 0.16, rx: Math.cos(a) * 0.9, rz: -Math.sin(a) * 0.9 } }; })));
    const fire = fire7(1.8, { smoke: true }); fire.group.position.y = 0.36; g.add(fire.group);
    g.userData.fireY = 0.75;
    g.userData.setLit = (b) => { fire.set(b); g.userData.lit = !!b; };
    g.userData.setRank = (r = 0) => { r = clamp(Math.round(r), 0, 6); fire.color(RANK7[r]); fire.group.scale.setScalar(r ? 1 + 0.06 * r : 0.8); g.userData.rank = r; };
    g.userData.flash = (k) => fire.k(k);
    g.userData.setRank(o.rank ?? 0); g.userData.setLit(!!o.lit);
    return g;
  },
  // a boss arena's hearth: a wide stone bowl on two steps, a beacon's worth of wood in it. setArmed(b): the wood laid and
  // dry (it can flare); flare(done): it catches and roars up once on the fight's beat, then burns; setLit(b)
  arenaHearth(o) {
    const g = new THREE.Group();
    g.add(solid7('arenaHearth', () => [{ geo: jitter(G.cyl(2.0, 2.15, 0.25, 10), 0.05, 811), color: STD, o: { y: 0.12 }, top: 1.15 }, { geo: jitter(G.cyl(1.5, 1.65, 0.3, 10), 0.04, 812), color: ST, o: { y: 0.4 }, top: 1.15 },
      { geo: G.lathe([[0.5, 0], [1.05, 0.12], [1.25, 0.42], [1.3, 0.6], [1.14, 0.6], [1.0, 0.36], [0.3, 0.26]], 12), color: STL, o: { y: 0.55 } }], MAT.stone7));
    const wood = solid7('arenaWood', () => Array.from({ length: 9 }, (_, k) => { const a = (k / 9) * Math.PI * 2; return { geo: G.cyl(0.07, 0.1, 1.5, 5), color: k % 2 ? WD : WDD, o: { x: Math.sin(a) * 0.3, y: 1.35, z: Math.cos(a) * 0.3, rx: Math.cos(a) * 0.62, rz: -Math.sin(a) * 0.62 } }; })); g.add(wood);
    const fire = fire7(2.8, { smoke: true, n: 6, color: 0xffa040 }); fire.group.position.y = 1.15; g.add(fire.group);
    g.userData.fireY = 1.9;
    g.userData.setLit = (b) => { fire.set(b); fire.k(0); g.userData.lit = !!b; };
    g.userData.setArmed = (b) => { wood.visible = !!b || !!g.userData.lit; g.userData.armed = !!b; };
    g.userData.flare = (done, dur = 2.6) => { if (!g.userData.armed && !g.userData.lit) return done?.(); g.userData.setLit(true); g.userData.armed = false; g.userData.flared = true; tween(g, dur, (k) => fire.k(Math.sin(Math.PI * Math.min(1, k * 1.15)) * 1.4 + 0.25 * k), done); };
    g.userData.setArmed(o.armed ?? true); if (o.lit) g.userData.setLit(true);
    return g;
  },
  // a keeper's hut (and a shepherd's: the same): dry stone walls, a low turf roof, a dark doorway on local +z, a chimney
  // stub. o.snow: snow on the roof (tarn). Always on dry ground, shut and empty for the season
  hut(o) {
    const g = new THREE.Group();
    g.add(solid7('hutWalls', () => [{ geo: jitter(G.box(3.2, 1.8, 2.6), 0.05, 821), color: ST, o: { y: 0.9 } }, { geo: jitter(G.box(1.1, 0.26, 0.4), 0.03, 822), color: STL, o: { y: 1.5, z: 1.32 } }, { geo: jitter(G.box(0.5, 0.9, 0.5), 0.03, 823), color: STD, o: { x: 1.1, y: 2.5, z: -0.5 } },
      ...stoneRing(824, 5, 2.2, 0.22, STD)], MAT.stone7));
    g.add(solid7('hutDoor', () => [{ geo: G.box(0.85, 1.35, 0.12), color: 0xffffff, o: { y: 0.68, z: 1.27 } }], MAT.dark7, false));
    g.add(solid7('hutRoof' + (o.snow ? 's' : ''), () => [{ geo: prism(3.7, 0.95, 3.1), color: o.snow ? SN : TURF, o: { y: 1.8 }, jit: 0.16 }, { geo: G.box(3.8, 0.1, 3.2), color: WDD, o: { y: 1.78 } }], o.snow ? MAT.snow7 : MAT.solid7));
    g.userData.doorAt = { x: 0, z: 1.9 }; g.userData.r = 2.1;
    return g;
  },
  // a sheepfold: a ring of dry stone (o.r 3 m), a gap on local +z; empty
  fold(o) {
    const r = o.r ?? 3, n = Math.round(r * 7), g = new THREE.Group();
    const im = new THREE.InstancedMesh(geo7('foldStone', () => bake([{ geo: jitter(G.box(0.95, 0.42, 0.5), 0.07, 831), color: ST, top: 1.15 }])), MAT.rock7, n * 2);
    let c = 0;
    for (let course = 0; course < 2; course++) for (let k = 0; k < n; k++) { const a = ((k + course * 0.5) / n) * Math.PI * 2; if (a < 0.28 || a > Math.PI * 2 - 0.28) continue; im.setMatrixAt(c++, TRS(Math.sin(a) * r, 0.2 + course * 0.4, Math.cos(a) * r, a + Math.PI / 2 + hash2(k, course) * 0.2, 0, 0.9 + hash2(course, k) * 0.25)); }
    im.count = c; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = true; im.receiveShadow = true; g.add(im);
    g.userData.r = r;
    return g;
  },
  // a woodpile between two stakes: split logs stacked along local x (instanced). setHalf(b): half of it gone (lookout 2's,
  // after the slide); o.half its first state
  woodpile(o) {
    const g = new THREE.Group();
    g.add(solid7('pileStakes', () => [{ geo: G.cyl(0.05, 0.06, 0.95, 5), color: WDD, o: { x: -0.95, y: 0.47 } }, { geo: G.cyl(0.05, 0.06, 0.95, 5), color: WDD, o: { x: 0.95, y: 0.47 } }]));
    const im = new THREE.InstancedMesh(geo7('pileLog', () => bake([{ geo: G.cyl(0.085, 0.085, 0.9, 5), color: 0xffffff, o: { rx: Math.PI / 2 } }])), MAT.solid7, LOG_N);
    // (bottom rows first, so half a pile is its lower rows)
    const rows = [7, 6, 5]; let c = 0;
    rows.forEach((n, row) => { for (let k = 0; k < n && c < LOG_N; k++) { im.setMatrixAt(c, TRS(-0.78 + (k + (7 - n) / 2) * 0.26, 0.09 + row * 0.165, hash2(k, row) * 0.08 - 0.04, 0, 0, 1)); im.setColorAt(c, _c.set([WD, WDL, GRAIN, WDD][(k + row * 3) % 4])); c++; } });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = true; im.receiveShadow = true; g.add(im);
    g.userData.setHalf = (b) => { im.count = b ? LOG_HALF : LOG_N; g.userData.half = !!b; };
    g.userData.setHalf(!!o.half);
    return g;
  },
  // a winch of the Old Works: a drum between two timber frames on a stone footing, rope on the drum, a spoked crank wheel
  // on its end. setIce(k): the ice it stands in (1 frozen, 0 free; the Cradle frees it); setTurn(k) 0..1 turns the drum;
  // setOpen(b, anim)
  winch(o) {
    const g = new THREE.Group();
    g.add(solid7('winchFoot', () => [{ geo: jitter(G.box(2.4, 0.3, 1.5), 0.04, 841), color: ST, o: { y: 0.15 }, top: 1.15 }], MAT.stone7));
    g.add(solid7('winchFrame', () => { const parts = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ geo: G.segTo(0, 1.05, -sz * 0.42, 0.075, 0.065, 5), color: WD, o: { x: sx * 0.8, y: 0.3, z: sz * 0.45 } }); for (const sx of [-1, 1]) parts.push({ geo: G.box(0.14, 0.12, 1.1), color: WDD, o: { x: sx * 0.8, y: 0.45 } }); return parts; }));
    const drum = solid7('winchDrum', () => [{ geo: G.cyl(0.2, 0.2, 1.75, 8), color: WDD, o: { rz: Math.PI / 2 } }, ...[0, 1, 2, 3].map((k) => ({ geo: G.torus(0.22, 0.035, 4, 8), color: ROPE, o: { x: -0.36 + k * 0.2, ry: Math.PI / 2 } })),
      { geo: G.torus(0.46, 0.04, 4, 12), color: IR, o: { x: 1.02, ry: Math.PI / 2 } }, ...[0, 1, 2].map((k) => ({ geo: G.box(0.05, 0.92, 0.06), color: IRL, o: { x: 1.02, rx: k * 1.047 } })), { geo: G.cyl(0.03, 0.03, 0.3, 4), color: WDL, o: { x: 1.17, y: 0.46, rz: Math.PI / 2 } }]);
    drum.position.y = 1.22; g.add(drum);
    g.add(solid7('winchRope', () => [{ geo: G.segTo(0, -0.95, 0.9, 0.03, 0.03, 4), color: ROPE, o: { x: -0.1, y: 1.1, z: 0.15 } }]));
    g.userData.setIce = iceShell(g, 1.35, 1.0, 0.95, 845);
    let tk = null;
    g.userData.setTurn = (k = 0) => { k = clamp(k, 0, 1); drum.rotation.x = k * Math.PI * 4; g.userData.turn = k; g.userData.open = k >= 1; };
    g.userData.setOpen = (b, anim = false) => { if (tk) TICKS.delete(tk); tk = null; const k0 = g.userData.turn || 0, k1 = b ? 1 : 0; if (!anim) return g.userData.setTurn(k1); tk = tween(g, 2, (k) => g.userData.setTurn(lerp(k0, k1, k))); };
    g.userData.setIce(o.ice ?? 0); g.userData.setTurn(0);
    return g;
  },
  // a sluice lever: an iron arm in a slotted stone, at the head of its channel's stone mouth (the channel runs toward local
  // +z). setPulled(b, anim); setIce(k): the block of ice levers 2 and 3 stand in until Kelados's plates fall
  lever(o) {
    const g = new THREE.Group();
    g.add(solid7('leverBase', () => [{ geo: jitter(G.box(0.9, 0.55, 1.0), 0.04, 851), color: ST, o: { y: 0.27 }, top: 1.15 }, { geo: G.box(0.14, 0.04, 0.8), color: 0x1a1a1c, o: { y: 0.56 } },
      { geo: jitter(G.box(0.5, 0.7, 1.4), 0.04, 852), color: STD, o: { x: -1.25, y: 0.35, z: 1.3 } }, { geo: jitter(G.box(0.5, 0.7, 1.4), 0.04, 853), color: STD, o: { x: 1.25, y: 0.35, z: 1.3 } }, { geo: jitter(G.box(3.0, 0.3, 0.5), 0.04, 854), color: STL, o: { y: 0.15, z: 0.75 } }], MAT.stone7));
    const pivot = new THREE.Group(); pivot.position.y = 0.45; g.add(pivot);
    pivot.add(solid7('leverArm', () => [{ geo: G.cyl(0.06, 0.08, 1.7, 6), color: 0x8a8e96, o: { y: 0.85 } }, { geo: G.cyl(0.11, 0.11, 0.42, 6), color: 0xa8763a, o: { y: 1.78 } }, { geo: G.cyl(0.12, 0.12, 0.26, 6), color: IR, o: { rz: Math.PI / 2 } }]));
    g.userData.setIce = iceShell(g, 0.95, 1.15, 0.95, 855);
    g.userData.setPulled = (b, anim = false) => { g.userData.pulled = !!b; const a1 = b ? 0.8 : -0.8, a0 = pivot.rotation.x; if (!anim) { pivot.rotation.x = a1; return; } tween(g, 0.35, (k) => { pivot.rotation.x = lerp(a0, a1, ease(k)); }); };
    g.userData.setPulled(!!o.pulled); g.userData.setIce(o.ice ?? 0);
    return g;
  },
  // a sluice channel's stone kerbs: two rows of dressed stones along local +z from the origin (o.len 24, o.w 4 between
  // them), instanced. The water in it is the Race's telegraph and sheet, not this
  channel(o) {
    const len = o.len ?? 24, w = o.w ?? 4, n = Math.max(2, Math.round(len / 1.5)), g = new THREE.Group();
    const im = new THREE.InstancedMesh(geo7('kerb', () => bake([{ geo: jitter(G.box(0.42, 0.32, 1.35), 0.04, 861), color: ST, top: 1.15 }])), MAT.stone7, n * 2);
    for (let k = 0; k < n; k++) for (const sd of [0, 1]) im.setMatrixAt(k * 2 + sd, TRS((sd ? 1 : -1) * (w / 2 + 0.2), 0.1, (k + 0.5) * (len / n), hash2(k, sd) * 0.08 - 0.04, 0, 0.92 + hash2(sd, k) * 0.16));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.receiveShadow = true; g.add(im);
    g.userData.len = len;
    return g;
  },
  // the row of stone piers: o.at their places ([{ x, z, h?, r? }] in the group's own space: act7Level gives world cells), or
  // o.n of them (7) o.gap apart (4) along local x. One instanced draw; every third is broken short
  piers(o) {
    const at = o.at || Array.from({ length: o.n ?? 7 }, (_, k) => ({ x: (k - ((o.n ?? 7) - 1) / 2) * (o.gap ?? 4), z: 0 })), g = new THREE.Group();
    const im = new THREE.InstancedMesh(geo7('pier', () => bake([{ geo: jitter(G.box(1.9, 0.45, 1.9), 0.04, 871), color: STD, o: { y: 0.22 } }, { geo: jitter(G.box(1.45, 3.0, 1.45), 0.06, 872), color: ST, o: { y: 1.9 } }, { geo: jitter(G.box(1.75, 0.3, 1.75), 0.04, 873), color: STL, o: { y: 3.5 }, top: 1.2 }])), MAT.stone7, at.length);
    const cap = o.snow === false ? null : new THREE.InstancedMesh(geo7('pierCap', () => bake([{ geo: jitter(G.ico(1, 0), 0.1, 874), color: SN, o: { sx: 0.95, sy: 0.3, sz: 0.95 } }])), MAT.snow7, at.length);
    at.forEach((p, k) => { const sy = p.h != null ? p.h / 3.65 : k % 3 === 1 ? 0.55 : 1, ry = p.r ?? hash2(p.x, p.z) * 0.3; im.setMatrixAt(k, TRS(p.x, p.y || 0, p.z, ry, 0, 1, 0, sy)); cap?.setMatrixAt(k, TRS(p.x, (p.y || 0) + 3.65 * sy + 0.05, p.z, ry, 0, 1)); });
    for (const m of [im, cap]) if (m) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = m === im; m.receiveShadow = true; g.add(m); }
    g.userData.n = at.length;
    return g;
  },
  // a plank bridge over a brook on the Meltwaters' causeway: planks across, two stringers along local z (o.len its cells, o.w 3)
  plankBridge(o) {
    const len = Math.max(2, Math.round(o.len ?? 6)), w = o.w ?? 3;
    const g = solid7('plank' + len + '|' + w, () => [
      { geo: G.box(0.22, 0.24, len + 0.6), color: WDD, o: { x: -w / 2 + 0.2, y: 0.12 } },
      { geo: G.box(0.22, 0.24, len + 0.6), color: WDD, o: { x: w / 2 - 0.2, y: 0.12 } },
      ...Array.from({ length: Math.round(len / 0.5) }, (_, k) => ({ geo: G.box(w, 0.07, 0.42), color: k % 3 === 0 ? WDL : k % 3 === 1 ? WD : GRAIN, o: { y: 0.27 + (k % 2) * 0.012, z: -len / 2 + 0.25 + k * 0.5 }, jit: 0.03 }))
    ]);
    return wrap(g);
  },
  // a snow bridge over a crevasse: a sagging span of old snow along local z (o.len the crevasse's width, 5; o.w 3)
  snowBridge(o) {
    const len = (o.len ?? 5) + 2, w = o.w ?? 3, rr = RNG(881 + Math.round(len * 5));
    const geo = gridGeo(4, 6, (u, v, i) => { const edge = i === 0 || i === 4; return [(u - 0.5) * (w + (edge ? 0.5 : 0)) * (1 + rr.range(-0.06, 0.06)), edge ? -0.55 : 0.1 + 0.22 * Math.sin(Math.PI * v) * (0.5 + 0.5 * Math.sin(Math.PI * u)) + rr.range(0, 0.05), (v - 0.5) * len, edge ? SNS : mixC(SNS, SN, 0.55 + 0.45 * Math.sin(Math.PI * u))]; });
    const g = wrap(Object.assign(new THREE.Mesh(geo, MAT.snow7), { receiveShadow: true }));
    g.userData.len = len;
    return g;
  },
  // the Dam's mouth plugged with ice: five standing chunks across o.w cells (3) along local x. setOpen(b, anim): they fall
  // and are gone (keladosWake)
  icePlug(o) {
    const g = new THREE.Group(), w = o.w ?? 3, n = 5, list = [];
    for (let k = 0; k < n; k++) { const h = 2.2 + hash2(k, 3) * 1.1, m = solid7('plug' + k, () => [{ geo: jitter(G.cyl(0.42, 0.62, 1, 6), 0.08, 891 + k), color: k % 2 ? IC : ICD, o: { y: 0.5 }, top: 1.3 }], MAT.ice7o); m.scale.set(1, h, 1); m.position.set((k - (n - 1) / 2) * (w / n) * 1.05, 0, (k % 2) * 0.35 - 0.17); m.userData.h = h; g.add(m); list.push(m); }
    const lay = (k) => list.forEach((m, i) => { const kk = clamp(k * 1.4 - i * 0.08, 0, 1); m.rotation.x = kk * 1.35 * (i % 2 ? 1 : -1); m.scale.set(1 - 0.5 * kk, m.userData.h * (1 - 0.8 * kk), 1 - 0.5 * kk); m.visible = kk < 0.999; });
    g.userData.setOpen = (b, anim = false) => { g.userData.open = !!b; if (!anim || !b) return lay(b ? 1 : 0); tween(g, 1.4, lay); };
    g.userData.setOpen(!!o.open);
    return g;
  },
  // the wall of ice at the Dam's north (o.w 26 m wide, o.h 9 high, its face toward local +z), and Kelados's seat o.seat m
  // out from it (2): a seat cut for something the size of a house, old snow in its lap
  iceWall(o) {
    const g = new THREE.Group(), w = o.w ?? 26, h = o.h ?? 9, seat = o.seat ?? 2, rr = RNG(901);
    const geo = geo7('iceWall' + w + '|' + h, () => gridGeo(14, 5, (u, v, i, j) => { const n = noise2(i * 0.9 + 3, j * 1.3 + 7), top = j === 5; return [(u - 0.5) * w + (j ? rr.range(-0.5, 0.5) : 0), v * h * (top ? 0.86 + n * 0.3 : 1), -v * 1.6 + (j ? (n - 0.5) * 1.5 : 0.3), top ? SN : mixC(ICD, ICL, n * 0.9 + v * 0.25)]; }));
    const wall = new THREE.Mesh(geo, MAT.ice7o); wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
    g.add(solid7('iceWallFoot' + w, () => Array.from({ length: 7 }, (_, k) => ({ geo: jitter(G.dodeca(0.9 + (k % 3) * 0.35), 0.2, 902 + k), color: k % 2 ? IC : ICL, o: { x: (k / 6 - 0.5) * w * 0.9 + (k % 2) * 0.8, y: 0.5, z: 0.7 + (k % 3) * 0.3, sy: 1.1 + (k % 2) * 0.5 } })).filter((p) => Math.abs(p.o.x) > 3.2), MAT.ice7o));
    const st = solid7('kelSeat', () => [{ geo: jitter(G.box(4.2, 1.0, 2.6), 0.07, 911), color: ST, o: { y: 0.5 }, top: 1.15 }, { geo: jitter(G.box(4.6, 3.4, 0.9), 0.08, 912), color: STD, o: { y: 1.7, z: -1.45 } }, { geo: jitter(G.box(0.8, 1.0, 2.3), 0.06, 913), color: STL, o: { x: -2.3, y: 1.3, z: -0.1 } }, { geo: jitter(G.box(0.8, 1.0, 2.3), 0.06, 914), color: STL, o: { x: 2.3, y: 1.3, z: -0.1 } }], MAT.stone7);
    st.position.z = seat; g.add(st);
    const lap = solid7('kelSeatSnow', () => [{ geo: jitter(G.ico(1, 0), 0.1, 915), color: SN, o: { y: 3.45, z: -1.45, sx: 2.3, sy: 0.3, sz: 0.55 } }, { geo: jitter(G.ico(1, 0), 0.08, 916), color: SNS, o: { x: -2.3, y: 1.85, sx: 0.5, sy: 0.18, sz: 1.2 } }, { geo: jitter(G.ico(1, 0), 0.08, 917), color: SNS, o: { x: 2.3, y: 1.85, sx: 0.5, sy: 0.18, sz: 1.2 } }], MAT.snow7, false);
    lap.position.z = seat; g.add(lap);
    g.userData.seatAt = { x: 0, y: 1.0, z: seat }; g.userData.h = h;
    return g;
  },
  // cover, 2 x 2 cells: a rock 1.8 m high (userData.h) that reads as something to stand behind
  coverRock() {
    const g = wrap(solid7('coverRock', () => [{ geo: jitter(G.ico(1, 1), 0.13, 921), color: ST, o: { y: 0.78, sx: 1.08, sy: 1.05, sz: 0.98 }, top: 1.15 }, { geo: jitter(G.dodeca(0.5), 0.1, 922), color: STD, o: { x: 0.85, y: 0.3, z: 0.7 } }, { geo: jitter(G.dodeca(0.4), 0.1, 923), color: STL, o: { x: -0.9, y: 0.25, z: -0.6 } }], MAT.rock7));
    g.userData.h = 1.8; g.userData.w = 2;
    return g;
  },
  // cover, 2 x 2 cells: a fallen block of blue ice 2 m high, solid (never see-through: it is cover)
  coverIce() {
    const g = wrap(solid7('coverIce', () => [{ geo: jitter(G.cyl(0.82, 1.08, 2.0, 6), 0.1, 931), color: IC, o: { y: 1.0, rz: 0.06 }, top: 1.3 }, { geo: jitter(G.box(0.8, 0.9, 0.8), 0.08, 932), color: ICD, o: { x: 0.8, y: 0.42, z: 0.55, ry: 0.5 } }, { geo: jitter(G.box(0.6, 0.6, 0.7), 0.07, 933), color: ICL, o: { x: -0.85, y: 0.3, z: -0.5, ry: -0.4 } }], MAT.ice7o));
    g.userData.h = 2.0; g.userData.w = 2;
    return g;
  },
  // a Rock-roller's boulder (and Kelados's): r o.r (0.9). setRoll(a): turned a radians about local x as it rolls along z
  boulder(o) {
    const g = new THREE.Group(), r = o.r ?? 0.9, m = solid7('boulder', () => [{ geo: jitter(G.ico(1, 1), 0.1, 941), color: STL, jit: 0.1 }], MAT.rock7);
    m.scale.setScalar(r); m.position.y = r * 0.92; g.add(m);
    g.userData.setRoll = (a = 0) => { m.rotation.x = a; }; g.userData.r = r;
    return g;
  },
  // Halda's ledge on the Den's rim: a flat shelf of rock (r 2) with a stone to sit on, a step up to it on local +z
  haldaLedge() {
    const g = wrap(solid7('haldaLedge', () => [{ geo: jitter(G.cyl(1.85, 2.15, 0.5, 8), 0.1, 951), color: ST, o: { y: 0.25 }, top: 1.2 }, { geo: jitter(G.box(1.2, 0.26, 0.7), 0.05, 952), color: STD, o: { y: 0.12, z: 2.2 } }, { geo: jitter(G.dodeca(0.36), 0.05, 953), color: STL, o: { x: -0.6, y: 0.68, z: -0.5, sy: 0.7 } },
      { geo: jitter(G.dodeca(0.9), 0.15, 954), color: STD, o: { x: 1.3, y: 0.6, z: -1.6 } }, { geo: jitter(G.dodeca(0.7), 0.12, 955), color: ST, o: { x: -1.5, y: 0.45, z: -1.5 } }], MAT.rock7));
    g.userData.standAt = { x: 0.2, y: 0.5, z: 0.3 }; g.userData.r = 2;
    return g;
  },
  // Halda's place on the Dam's rim: the stump of a broken pier (r 2), its fallen stones round it
  haldaStump() {
    const g = wrap(solid7('haldaStump', () => [{ geo: jitter(G.box(2.5, 0.45, 2.5), 0.05, 961), color: STD, o: { y: 0.22 } }, { geo: jitter(G.box(2.0, 0.6, 2.0), 0.08, 962), color: ST, o: { y: 0.72 }, top: 1.2 }, { geo: jitter(G.box(0.9, 0.5, 0.7), 0.06, 963), color: STL, o: { x: 1.9, y: 0.25, z: 0.8, ry: 0.5 } },
      { geo: jitter(G.box(0.8, 0.45, 0.6), 0.06, 964), color: ST, o: { x: -1.7, y: 0.22, z: -1.2, ry: -0.7 } }, { geo: jitter(G.box(0.7, 0.4, 0.9), 0.06, 965), color: STD, o: { x: 0.4, y: 0.2, z: 2.0, ry: 0.2 } }], MAT.stone7));
    g.userData.standAt = { x: 0, y: 1.02, z: 0 }; g.userData.r = 2;
    return g;
  },
  // Halda's field anvil: a small anvil on a block of wood, her hammer on it, a quench bucket beside
  fieldAnvil() {
    const g = new THREE.Group();
    g.add(solid7('anvilWood', () => [{ geo: G.cyl(0.3, 0.34, 0.5, 8), color: WD, o: { y: 0.25 }, top: 1.3 }, { geo: G.cyl(0.03, 0.03, 0.42, 4), color: WDL, o: { x: 0.12, y: 0.83, z: 0.14, rz: Math.PI / 2, ry: 0.5 } },
      { geo: G.lathe([[0.14, 0], [0.18, 0.3], [0.165, 0.3], [0.13, 0.03]], 8), color: WDD, o: { x: 0.62, z: 0.3 } }]));
    g.add(solid7('anvilIron', () => [{ geo: G.box(0.3, 0.07, 0.22), color: IR, o: { y: 0.535 } }, { geo: G.box(0.16, 0.12, 0.14), color: IR, o: { y: 0.63 } }, { geo: G.box(0.52, 0.11, 0.2), color: IRL, o: { y: 0.745 }, top: 1.5 }, { geo: G.cone(0.085, 0.3, 6), color: IRL, o: { x: -0.4, y: 0.745, rz: Math.PI / 2 } },
      { geo: G.box(0.13, 0.09, 0.09), color: IR, o: { x: 0.31, y: 0.83, z: 0.03, ry: 0.5 } }, { geo: new THREE.CircleGeometry(0.15, 8).rotateX(-Math.PI / 2), color: 0x2a3a48, o: { x: 0.62, y: 0.26, z: 0.3 } }]));
    return g;
  },
  // a bed-roll (the beacon's, in the home scene): a wool mat, a rolled blanket at its head, a pack
  bedRoll() {
    return wrap(solid7('bedRoll', () => [{ geo: jitter(G.box(0.8, 0.07, 1.85), 0.015, 971), color: 0x8a6a48, o: { y: 0.035 } }, { geo: jitter(G.box(0.7, 0.06, 1.2), 0.02, 972), color: 0x6a4e58, o: { y: 0.1, z: 0.25 } },
      { geo: G.cyl(0.15, 0.15, 0.78, 8), color: 0x9a7a52, o: { y: 0.16, z: -0.72, rz: Math.PI / 2 } }, { geo: G.torus(0.155, 0.02, 3, 8), color: 0x3a2a1e, o: { x: -0.22, y: 0.16, z: -0.72, ry: Math.PI / 2 } }, { geo: G.torus(0.155, 0.02, 3, 8), color: 0x3a2a1e, o: { x: 0.22, y: 0.16, z: -0.72, ry: Math.PI / 2 } },
      { geo: jitter(G.dodeca(0.24), 0.03, 973), color: 0x5a4a36, o: { x: 0.62, y: 0.17, z: -0.6, sy: 0.75 } }]));
  },
  // a mason's mark stone beside a wheel or a winch: a dressed block, the mark cut in its face (local +z) and its top
  // (o.mark 0-5: which of the six). setGlow(k) 0 cut and dark, 1 warm and pale (the memory waking; never additive)
  markStone(o) {
    const g = new THREE.Group();
    g.add(solid7('markStone', () => [{ geo: jitter(G.box(0.75, 0.9, 0.5), 0.03, 981), color: STL, o: { y: 0.45 }, top: 1.15 }, { geo: jitter(G.box(1.0, 0.16, 0.75), 0.03, 982), color: STD, o: { y: 0.08 } }], MAT.stone7));
    const face = markDecal(o.mark ?? 0, 0.52); face.position.set(0, 0.5, 0.262); g.add(face);
    const top = markDecal(o.mark ?? 0, 0.44); top.rotation.x = -Math.PI / 2; top.position.set(0, 0.915, 0); g.add(top);
    g.userData.setGlow = (k = 1) => { face.userData.setGlow(k); top.userData.setGlow(k); g.userData.glow = clamp(k, 0, 1); };
    g.userData.setGlow(o.glow ?? 0);
    return g;
  },
  // flower cards: crossed quads from a 256 px atlas (16 kinds), one instanced draw. o.at: [{ x, y?, z }] in the group's
  // space (act7Level gives world cells), or o.n of them scattered in o.r (60 in 6 m). Count by quality: none at quality 0,
  // half at quality 1, all from quality 2 (part 4's perf plan); userData.count what was drawn
  flowers(o) {
    const g = new THREE.Group(), rr = RNG(o.seed ?? 991);
    let at = o.at || Array.from({ length: o.n ?? 60 }, () => { const a = rr.range(0, 6.28), d = Math.sqrt(rr.next()) * (o.r ?? 6); return { x: Math.sin(a) * d, z: Math.cos(a) * d }; });
    const keep = R.quality <= 0 ? 0 : R.quality === 1 ? 0.5 : 1;
    at = at.filter((_, k) => hash2(k * 0.37, 5.1) < keep);
    g.userData.count = at.length;
    if (!at.length) return g;
    const geo = geo7('flowerCard', () => {
      const q = new THREE.BufferGeometry(), w = 0.3, h = 0.56, pos = [], uv = [], idx = [];
      for (const a of [0, Math.PI / 2]) { const cx = Math.cos(a) * w, sz = Math.sin(a) * w, b = pos.length / 3; pos.push(-cx, 0, -sz, cx, 0, sz, cx, h, sz, -cx, h, -sz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
      q.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); q.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      q.setAttribute('normal', new THREE.Float32BufferAttribute(Array.from({ length: 8 }, () => [0, 1, 0]).flat(), 3)); q.setIndex(idx);
      return q;
    }).clone();
    geo.userData = {};
    // (its own copy: the tile attribute is this patch's, sized to its count)
    const tile = new Float32Array(at.length * 2);
    const im = new THREE.InstancedMesh(geo, flowerMat(), at.length);
    at.forEach((p, k) => { const t = Math.floor(hash2(p.x * 3.1 + k, p.z * 1.7) * 16) % 16; tile[k * 2] = (t % 4) * 0.25; tile[k * 2 + 1] = Math.floor(t / 4) * 0.25; im.setMatrixAt(k, TRS(p.x, p.y || 0, p.z, hash2(p.x, p.z) * 3.14, 0, 0.75 + hash2(p.z, p.x) * 0.6)); });
    geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 2));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.receiveShadow = false; im.castShadow = false; g.add(im);
    return g;
  },
  // the rainbow in the spray below the Dam: one arc on a plane facing local +z (o.w its span in metres, 40), normal
  // blending, no fog. setK(k) its strength
  rainbow(o) {
    const w = o.w ?? 40, m = new THREE.Mesh(geo7('rainbowq', () => new THREE.PlaneGeometry(1, 0.5).translate(0, 0.25, 0)), own(new THREE.MeshBasicMaterial({ map: rainbowTex(), transparent: true, opacity: 0.5, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false })));
    m.scale.set(w, w, 1); m.renderOrder = 2.4;
    const g = wrap(m);
    g.userData.setK = (k = 1) => { m.material.opacity = 0.5 * clamp(k, 0, 1.6); m.visible = k > 0.01; g.userData.k = k; };
    return g;
  },
  // the lake's white thread going down the Water-stair: a strip of white water along o.pts ([{ x, y, z }] in the group's
  // space; else straight for o.len (40) dropping o.drop (18) along local +z), o.w wide (0.9), its streaks running down it.
  // setK(k): how far down it has come (0..1)
  lakeThread(o) {
    const pts = (o.pts || Array.from({ length: 9 }, (_, k) => ({ x: Math.sin(k * 1.9) * 0.5, y: -(o.drop ?? 18) * (k / 8), z: (o.len ?? 40) * (k / 8) }))).map((p) => new THREE.Vector3(p.x, p.y || 0, p.z));
    const w = (o.w ?? 0.9) / 2, pos = [], uv = [], idx = [], n = pts.length - 1, d = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
    let run = 0;
    // (two ribbons crossed along the path, so it shows from the play camera and from a low cine alike)
    for (let pass = 0; pass < 2; pass++) { run = 0; for (let k = 0; k <= n; k++) {
      d.copy(pts[Math.min(k + 1, n)]).sub(pts[Math.max(k - 1, 0)]).normalize(); side.set(d.z, 0, -d.x).normalize(); up.crossVectors(side, d).normalize();
      const s = pass ? up : side, p = pts[k]; if (k) run += p.distanceTo(pts[k - 1]);
      pos.push(p.x - s.x * w, p.y - s.y * w + 0.06, p.z - s.z * w, p.x + s.x * w, p.y + s.y * w + 0.06, p.z + s.z * w); uv.push(0, run / 4, 1, run / 4);
    } }
    // (indices by segment, both ribbons together, so a draw range uncovers it from the top)
    for (let k = 0; k < n; k++) for (let pass = 0; pass < 2; pass++) { const a = pass * (n + 1) * 2 + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeBoundingSphere();
    const map = threadTex().clone(); map.needsUpdate = true;
    const m = new THREE.Mesh(geo, own(new THREE.MeshBasicMaterial({ map, color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide, fog: false })));
    m.renderOrder = 2.3; m.frustumCulled = false;
    m.onBeforeRender = () => { map.offset.y = (R.time * 0.9) % 1; };
    const g = wrap(m);
    g.userData.setK = (k = 1) => { k = clamp(k, 0, 1); geo.setDrawRange(0, Math.round(k * n) * 12); m.visible = k > 0.01; g.userData.k = k; };
    g.userData.dispose = () => map.dispose();
    g.userData.setK(o.k ?? 1);
    return g;
  },
  // day smoke over a far fire (FAR_BEACONS 0 and 7-12) or a lookout seen from below: one tall pale sprite, its foot at the
  // origin (o.w 5, o.h 20). setK(k)
  daySmoke(o) {
    const sp = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: smokeTex(), color: o.color ?? 0xe8eaec, transparent: true, opacity: 0.6, depthWrite: false, fog: false })));
    sp.center.set(0.5, 0); sp.scale.set(o.w ?? 5, o.h ?? 20, 1); sp.renderOrder = 2.3;
    const g = wrap(sp);
    g.userData.setK = (k = 1) => { sp.material.opacity = 0.6 * clamp(k, 0, 1.5); sp.visible = k > 0.01; g.userData.k = k; };
    return g;
  },
  // a cloud's shade on the ground: cloudDisc(o.r)
  cloudDisc(o) { return cloudDisc(o.r ?? 11, o); },
  // Kelados's code parts laid out on a stand-in frame of blocks, for the look script and the creature viewer only (the
  // fight hangs them on the golem's bones: keladosDress)
  keladosParts(o) {
    const g = new THREE.Group(), K = keladosParts(o);
    g.add(solid7('kelDummy', () => [{ geo: G.box(1.9, 1.9, 1.1), color: 0x7a8078, o: { y: 3.0 } }, { geo: G.box(0.9, 0.8, 0.8), color: 0x7a8078, o: { y: 4.35 } }, { geo: G.box(0.6, 1.9, 0.6), color: 0x6e746c, o: { x: -1.45, y: 2.9 } }, { geo: G.box(0.6, 1.9, 0.6), color: 0x6e746c, o: { x: 1.45, y: 2.9 } },
      { geo: G.box(0.7, 2.0, 0.7), color: 0x6e746c, o: { x: -0.55, y: 1.0 } }, { geo: G.box(0.7, 2.0, 0.7), color: 0x6e746c, o: { x: 0.55, y: 1.0 } }]));
    const AT = { chest: [0, 3.1, 0.62], back: [0, 3.1, -0.62], shoulderL: [1.45, 3.95, 0], shoulderR: [-1.45, 3.95, 0], armL: [1.82, 2.7, 0], armR: [-1.82, 2.7, 0], legL: [0.55, 1.2, 0.42], legR: [-0.55, 1.2, 0.42] };
    const ROT = { chest: [0, 0, 0], back: [0, Math.PI, 0], shoulderL: [-Math.PI / 2, 0, 0], shoulderR: [-Math.PI / 2, 0, 0], armL: [0, Math.PI / 2, 0], armR: [0, -Math.PI / 2, 0], legL: [0, 0, 0], legR: [0, 0, 0] };
    for (const p of K.plates) { p.position.fromArray(AT[p.userData.slot]); p.rotation.fromArray(ROT[p.userData.slot]); g.add(p); }
    K.cap.position.set(0, 4.75, 0); g.add(K.cap);
    K.pine.position.set(1.45, 4.05, -0.1); g.add(K.pine);
    K.moss.forEach((m, k) => { m.position.set([-1.45, 0.3, -0.55][k], [3.9, 3.98, 2.02][k], [0.1, -0.2, 0.2][k]); g.add(m); });
    Object.assign(g.userData, { parts: K, drop: K.drop, dropPhase: K.dropPhase, setMoss: K.setMoss, reset: K.reset });
    return g;
  }
};
// a single mesh as a prop's group (so every kind answers as a Group with children)
function wrap(m) { const g = new THREE.Group(); g.add(m); return g; }

// the flower cards' material: the atlas tile chosen per instance (aTile), lit from above like the ground they stand on, a
// little sway from the wind's clock
function flowerMat() {
  if (MAT.flower7) return MAT.flower7;
  const m = new THREE.MeshLambertMaterial({ map: flowerAtlas(), alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aTile;\nuniform float uTime;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMapUv = uv * 0.25 + aTile;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.x += sin(uTime * 1.7 + instanceMatrix[3][0] * 1.3 + instanceMatrix[3][2] * 0.7) * 0.05 * uv.y;');
  };
  m.customProgramCacheKey = () => 'flower7';
  return (MAT.flower7 = m);
}

// ---------- the cloud's shade ----------
// A soft grey-blue disc laid on the ground, normal-blended at about 0.3 alpha: flat to 0.6 of its radius, then fading out,
// its edge shimmering slowly (stilled by 'Reduce flicker': setShimmer(false)). Its own small shader, not light.js's
// dark-cored disc (that one's core is 82% violet-black and reads as a hole in daylight; reusing its shader with other
// colours would have meant editing light.js, another builder's file). Drawn without the depth test, after the opaque
// world: laid 9 cm over the ground with it on, a disc this wide was cut by every rise between its vertices, and a cloud's
// shade falls on what stands in it as well (her, a hut, a rock). Its geometry is drapable (build.js drape): on sloped
// ground call userData.drape(L) after it moves, so it keeps to the slope it darkens. userData: setR(r), setA(a), setShimmer(b), drape(L), r
const CLOUD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const CLOUD_FS = `varying vec2 vUv; uniform vec3 uColor; uniform float uA; uniform float uTime; uniform float uShim;
void main(){ vec2 q = vUv * 2.0 - 1.0; float ang = atan(q.y, q.x);
  float d = length(q) / (0.93 + uShim * 0.035 * (sin(ang * 5.0 + uTime * 0.31) + sin(ang * 9.0 - uTime * 0.2)));
  if (d > 1.0) discard;
  gl_FragColor = vec4(uColor, uA * (1.0 - smoothstep(0.6, 1.0, d)));
  #include <colorspace_fragment>
}`;
export function cloudDisc(r = 11, o = {}) {
  const geo = drapable(new THREE.PlaneGeometry(2, 2, 16, 16).rotateX(-Math.PI / 2), o.lift ?? 0.09);
  const u = { uColor: { value: new THREE.Color(o.color ?? 0x1c2a3a) }, uA: { value: o.a ?? 0.3 }, uTime: WIND.uTime, uShim: { value: 1 } };
  const m = new THREE.Mesh(geo, own(new THREE.ShaderMaterial({ uniforms: u, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, depthTest: false })));
  m.renderOrder = 1.9; m.frustumCulled = false;
  const g = wrap(m);
  g.userData.kind = 'cloudDisc';
  g.userData.setR = (v) => { m.scale.set(v, 1, v); g.userData.r = v; };
  g.userData.setA = (a) => { u.uA.value = a; };
  g.userData.setShimmer = (b) => { u.uShim.value = b ? 1 : 0; };
  g.userData.drape = (L) => drape(g, L);
  g.userData.setR(r);
  return g;
}

// ---------- Kelados's code parts ----------
// The fight hangs these on the golem's bones (golem.glb: Spine2, Head, shoulder.L/R, LowerArm.L/R, UpperLeg.L/R; three
// strips the dots, so the patterns below take both spellings).
//   const K = keladosParts();                 // { plates[8], cap, pine, moss[3], drop(i, done), dropPhase(n), setMoss(k), reset() }
//   keladosDress(avatar.bones, { s: 1 });     // builds them and parents each to its bone; returns the same K
// Each piece is a mesh built in metres at Kelados's shown size, with userData { slot, bone (a RegExp), at [x, y, z] and rot
// [x, y, z] in the bone's space }. keladosDress divides out the bone's world scale, so `at` is in world metres along the
// bone's own axes: the offsets below are a first guess made without the body on screen and are tuned in stage C (item 12).
// The ice is the life bar's picture: plates fall two at 66%, four at 33%, the last two when he kneels: dropPhase(1..3)
// drops KELADOS_FALL's rows; drop(i) one plate (it tips off, shrinks and is hidden: nothing is left on the ground).
// setMoss(k) shows the moss (0 in the fight, 1 in the `let` reading, where the pine and the cap stay and no plate is left).
export const KELADOS_SLOTS = ['chest', 'back', 'shoulderL', 'shoulderR', 'armL', 'armR', 'legL', 'legR'];
export const KELADOS_FALL = [[4, 5], [6, 7, 3, 1], [0, 2]];
const KEL = {
  chest: { bone: /spine2/i, size: [1.7, 1.5], at: [0, 0.2, 0.6], rot: [0, 0, 0] },
  back: { bone: /spine2/i, size: [1.8, 1.7], at: [0, 0.2, -0.6], rot: [0, Math.PI, 0] },
  shoulderL: { bone: /shoulder\.?L/i, size: [1.1, 0.9], at: [0, 0.35, 0], rot: [-Math.PI / 2, 0, 0] },
  shoulderR: { bone: /shoulder\.?R/i, size: [1.1, 0.9], at: [0, 0.35, 0], rot: [-Math.PI / 2, 0, 0] },
  armL: { bone: /lowerarm\.?L/i, size: [0.75, 1.2], at: [0.35, 0, 0], rot: [0, Math.PI / 2, 0] },
  armR: { bone: /lowerarm\.?R/i, size: [0.75, 1.2], at: [-0.35, 0, 0], rot: [0, -Math.PI / 2, 0] },
  legL: { bone: /upperleg\.?L/i, size: [0.85, 1.3], at: [0, 0, 0.4], rot: [0, 0, 0] },
  legR: { bone: /upperleg\.?R/i, size: [0.85, 1.3], at: [0, 0, 0.4], rot: [0, 0, 0] }
};
export function keladosParts(o = {}) {
  mats(); mats7();
  const s = o.s ?? 1;
  const plates = KELADOS_SLOTS.map((slot, i) => {
    const d = KEL[slot], [w, h] = d.size;
    // (a slab of blue ice with a second, paler pane over its lower half: it reads as plate, not as a box)
    const m = solid7('kelPlate' + slot, () => [{ geo: jitter(G.box(w, h, 0.24), 0.07, 1001 + i), color: IC, top: 1.25 }, { geo: jitter(G.box(w * 0.62, h * 0.55, 0.16), 0.05, 1011 + i), color: ICL, o: { x: w * 0.12, y: -h * 0.16, z: 0.16 } }, { geo: jitter(G.box(w * 0.4, h * 0.3, 0.14), 0.04, 1021 + i), color: ICD, o: { x: -w * 0.24, y: h * 0.26, z: 0.15 } }], MAT.ice7o);
    Object.assign(m.userData, { kind: 'keladosPlate', slot, i, bone: d.bone, at: d.at, rot: d.rot, s });
    m.scale.setScalar(s);
    return m;
  });
  const cap = solid7('kelCap', () => [{ geo: jitter(G.dome(0.95, 0.5, 9), 0.07, 1031), color: SN, o: { sy: 0.6 } }, { geo: jitter(G.ico(1, 0), 0.08, 1032), color: SNS, o: { x: 0.5, y: 0.02, z: 0.3, sx: 0.5, sy: 0.22, sz: 0.45 } }], MAT.snow7);
  Object.assign(cap.userData, { kind: 'keladosCap', bone: /head/i, at: [0, 0.45, 0], rot: [0, 0, 0], s }); cap.scale.setScalar(s);
  const pine = solid7('kelPine', () => [{ geo: G.cyl(0.05, 0.09, 0.7, 5), color: BARK, o: { y: 0.35 } }, { geo: G.cone(0.52, 0.8, 6), color: PINED, o: { y: 0.85 } }, { geo: G.cone(0.4, 0.7, 6), color: PINE, o: { y: 1.3 } }, { geo: G.cone(0.26, 0.6, 6), color: PINE, o: { y: 1.72 }, snow: 1.2 },
    { geo: jitter(G.dodeca(0.22), 0.04, 1033), color: MOSS, o: { y: 0.06, sy: 0.5 } }]);
  Object.assign(pine.userData, { kind: 'keladosPine', bone: /shoulder\.?L/i, at: [0.1, 0.45, -0.1], rot: [0, 0, 0], s }); pine.scale.setScalar(s);
  const MOSSAT = [{ bone: /shoulder\.?R/i, at: [0, 0.3, 0.1] }, { bone: /spine2/i, at: [0.3, 0.75, -0.2] }, { bone: /upperleg\.?R/i, at: [0, 0.3, 0.3] }];
  const moss = MOSSAT.map((d, k) => { const m = solid7('kelMoss' + k, () => [{ geo: jitter(G.ico(1, 0), 0.12, 1041 + k), color: k % 2 ? 0x3a4826 : 0x33401f, o: { sx: 0.6, sy: 0.16, sz: 0.5 } }, { geo: jitter(G.ico(1, 0), 0.1, 1051 + k), color: 0x46522a, o: { x: 0.4, y: -0.03, z: 0.2, sx: 0.32, sy: 0.12, sz: 0.3 } }]); Object.assign(m.userData, { kind: 'keladosMoss', bone: d.bone, at: d.at, rot: [0, 0, 0], s }); m.scale.setScalar(s); m.visible = false; return m; });
  const K = { plates, cap, pine, moss, all: [...plates, cap, pine, ...moss] };
  // a plate tips off and is gone (anim: over 0.9 s while it stands in the scene; else at once)
  K.drop = (i, done, anim = true) => {
    const m = plates[i]; if (!m || m.userData.gone) return done?.();
    m.userData.gone = true;
    const p0 = m.position.clone(), r0 = m.rotation.x, s0 = m.scale.x, fin = () => { m.visible = false; m.position.copy(p0); m.rotation.x = r0; m.scale.setScalar(s0); done?.(); };
    if (!anim) return fin();
    // (down its bone's -y by its own size, in the bone's units)
    tween(m, 0.9, (k) => { m.position.y = p0.y - k * k * 2.2 * s0; m.rotation.x = r0 + k * 1.3; m.scale.setScalar(s0 * (1 - 0.5 * k)); }, fin);
  };
  K.dropPhase = (n, anim = true) => { for (const i of KELADOS_FALL[n - 1] || []) K.drop(i, null, anim); };
  K.left = () => plates.filter((m) => !m.userData.gone).length;
  K.setMoss = (k = 1) => { for (const m of moss) { m.visible = k > 0.02; m.scale.setScalar(m.userData.s0 ?? s * Math.max(0.05, k)); } K.moss.k = k; };
  K.reset = () => { for (const m of plates) { m.userData.gone = false; m.visible = true; } };
  return K;
}
// bones: a map of name -> bone (an avatar's `bones`), or a function (RegExp) -> bone. Parents each piece to its bone and
// returns the parts (K.missing: slots whose bone was not found, left unparented and hidden)
export function keladosDress(bones, o = {}) {
  const K = keladosParts(o), s = o.s ?? 1, find = typeof bones === 'function' ? bones : (re) => { for (const k in bones) if (re.test(k)) return bones[k]; return null; };
  K.missing = [];
  for (const m of K.all) {
    const b = find(m.userData.bone);
    if (!b) { K.missing.push(m.userData.slot || m.userData.kind); m.visible = false; continue; }
    b.updateWorldMatrix(true, false); b.getWorldScale(_v);
    const ws = Math.max(1e-6, Math.abs(_v.x));
    m.position.fromArray(m.userData.at).multiplyScalar(s / ws); m.rotation.fromArray(m.userData.rot); m.scale.setScalar(s / ws);
    if (m.userData.kind === 'keladosMoss') m.userData.s0 = s / ws;
    b.add(m);
  }
  K.dispose = () => { for (const m of K.all) m.removeFromParent(); };
  return K;
}

// ---------- act7Prop ----------
export const ACT7_KINDS = Object.keys(PROP7);
// Act VII's code props: a THREE.Group with userData.kind and the kind's switches; a kind not known is an empty group
export function act7Prop(kind, o = {}) {
  mats(); mats7();
  const f = PROP7[kind], g = f ? f(o || {}) : new THREE.Group();
  g.userData.kind = kind;
  return g;
}

// ---------- act7Level ----------
// Builds the props of a gen7 layout once, each at its spot (docs/act7-contract.md, L.spots) in the first state of the
// reading L.mode, adds them to lvl.group (lvl: buildLevel's `out`; a THREE.Group is taken as the group itself) and returns
// the handles, which world.js keeps as lvl.act7 and lays its interacts and its flags' states on (act7Presence), never
// building a second one. Every spot is optional: what the layout does not carry is left out and its array stays empty.
// o: { clouds: n (cloud discs to make, none by default: light.js asks for HAZ7.clouds, 2 at quality 0), flowers: false to
// leave them out, y: (x, z) => ground height (else genlib's groundY) }
// The handles: arrays of { i | k, x, z, mesh, ... } by spot name, single props by name, null where the layout has none:
//   weirs[{ i, x, z, mesh, jam }]   lookouts[{ i (1-6), x, z, mesh, hut, pile }]   horns[{ flue, x, z, mesh }]
//   cornices[{ k (L.flues index), x, z, mesh, tongue }]   channels[{ k, mesh }]   dens[{ x, z, mesh }]   slabs[...]
//   iceblocks[...]   huts[...]   winches[{ i, x, z, mesh, mark }]   bridges[...]   levers[{ i, x, z, mesh }]
//   props{ kind: [mesh] } (L.props entries whose t is a kind of this file)   clouds[mesh]   flowers (mesh | null)
//   hearth, halda, den, anvil, piers, wall, plug, wheel (mesh | null)   rainbow, thread (null: the story builds them)
//   skipped[] (what could not be placed, by name)   all[] (every mesh, for dispose7)
export function act7Level(L, lvl, o = {}) {
  mats(); mats7();
  const group = lvl?.isObject3D ? lvl : lvl?.group || new THREE.Group(), S = L?.spots || {}, W = L?.w || 0, H = L?.h || 0;
  const thaw = L?.type === 'thaw', after = L?.mode === 'green' || L?.mode === 'let';
  const A = { type: L?.type, mode: L?.mode, group, weirs: [], lookouts: [], horns: [], cornices: [], channels: [], dens: [], slabs: [], iceblocks: [], huts: [], winches: [], bridges: [], levers: [], props: {}, clouds: [], flowers: null,
    hearth: null, halda: null, den: null, anvil: null, piers: null, wall: null, plug: null, wheel: null, rainbow: null, thread: null, skipped: [], all: [] };
  const gy = o.y || ((x, z) => { try { return L?.hgt ? groundY(L, x, z) : 0; } catch (e) { return 0; } });
  const ok = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.z);
  const list = (v) => (Array.isArray(v) ? v.filter(ok) : []);
  const put = (kind, po, x, z, ry = 0) => { const m = act7Prop(kind, po); m.position.set(x, gy(x, z), z); m.rotation.y = ry; group.add(m); A.all.push(m); return m; };
  const cell = (x, z) => { const cx = Math.floor(x), cz = Math.floor(z); return cx < 0 || cz < 0 || cx >= W || cz >= H ? -1 : cz * W + cx; };
  const walk = (x, z) => { const i = cell(x, z); return i >= 0 && !!L.cells?.[i]; };
  const wet = (x, z) => { const i = cell(x, z); return i >= 0 && !!(L.pocket?.[i] || L.sea?.[i]); };
  // local +z toward q
  const face = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
  // a place of r cells round (x, z), d0..d1 away, that is rock (not walkable, not water, in the frame): for what must not
  // be walked through and must never stand in water (huts, the fold, a log-jam's bank). null when there is none
  const rockNear = (x, z, d0, d1, r = 1) => {
    if (!L?.cells) return null;
    for (let d = d0; d <= d1; d += 0.5) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + hash2(x, z) * 6.28, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
      let good = true;
      for (let dz = -r; dz <= r && good; dz++) for (let dx = -r; dx <= r && good; dx++) { const i = cell(px + dx, pz + dz); if (i < 0 || L.cells[i] || wet(px + dx, pz + dz)) good = false; }
      if (good) return { x: px, z: pz };
    }
    return null;
  };
  const centre = S.arena || L?.boss || null;
  // ---- both zones ----
  // the chutes' cornices at their heads (armed: every chute is armed when the zone is entered) and their tongues, laid
  // out and hidden (k 0) over the lane's last third; the sluice channels' kerbs
  list(L?.flues).forEach((f, k) => {
    const dir = f.dir || 0, len = f.len ?? 24, w = f.w ?? 4;
    if (f.kind === 'water') { A.channels.push({ k, x: f.x, z: f.z, mesh: put('channel', { len, w }, f.x, f.z, dir) }); return; }
    const m = put('cornice', { w }, f.x - Math.sin(dir) * 0.6, f.z - Math.cos(dir) * 0.6, dir); m.userData.setArmed(f.armed !== false);
    const tl = len / 3, tx = f.x + Math.sin(dir) * (len - tl), tz = f.z + Math.cos(dir) * (len - tl), tongue = put('snowTongue', { len: tl, w, k: 0 }, tx, tz, dir);
    A.cornices.push({ k, x: f.x, z: f.z, mesh: m, tongue });
  });
  list(S.hornStones).forEach((h) => A.horns.push({ flue: h.flue, x: h.x, z: h.z, mesh: put('hornStone', {}, h.x, h.z, centre ? face(h, centre) : hash2(h.x, h.z) * 6.28) }));
  // the lookouts' hearths (cold, rank 0: world.js sets the rank from hero.fires), each with its keeper's hut on rock
  // beside it and its woodpile. Lookout 2 (the hook's third peak) keeps half a woodpile
  list(S.lookouts).forEach((p, k) => {
    const i = (thaw ? 1 : 4) + k, m = put('lookHearth', {}, p.x, p.z, hash2(p.x, p.z) * 6.28);
    const hp = rockNear(p.x, p.z, 3.5, 7, 2), hut = hp ? put('hut', { snow: !thaw }, hp.x, hp.z, face(hp, p)) : null;
    if (!hut) A.skipped.push('lookout' + i + '.hut');
    // (the pile on the far side from the hut, 1.9 m out: small, walked round)
    const a = hp ? face(hp, p) : hash2(p.z, p.x) * 6.28, pile = put('woodpile', { half: i === 2 }, p.x + Math.sin(a + 0.9) * 1.9, p.z + Math.cos(a + 0.9) * 1.9, a + 0.9 + Math.PI / 2);
    A.lookouts.push({ i, x: p.x, z: p.z, mesh: m, hut, pile });
  });
  if (ok(S.hearth)) { A.hearth = put('arenaHearth', { armed: true }, S.hearth.x, S.hearth.z, centre ? face(S.hearth, centre) : 0); }
  if (ok(S.haldaRim)) A.halda = put(thaw ? 'haldaLedge' : 'haldaStump', {}, S.haldaRim.x, S.haldaRim.z, centre ? face(S.haldaRim, centre) : 0);
  list(S.slabs).forEach((p) => A.slabs.push({ x: p.x, z: p.z, mesh: put('slab', {}, p.x, p.z, hash2(p.x, p.z) * 6.28) }));
  list(S.iceblocks).forEach((p) => A.iceblocks.push({ x: p.x, z: p.z, mesh: put('iceBlock', { size: p.size || 'big' }, p.x, p.z, hash2(p.x, p.z) * 6.28) }));
  // ---- thaw ----
  // the weirs: shut in `spate`, open in `green`; a log-jam on the rock or the deep water beside each while it is shut
  list(S.weirs).forEach((p, k) => {
    const m = put('weir', { mark: k }, p.x, p.z, p.rot ?? p.r ?? 0); m.userData.setOpen(after);
    let jam = null;
    if (!after && L?.cells) {
      // (never on a cell she can walk: a non-walkable one 2-4.5 m off, the Race's own water first)
      let at = null;
      for (let d = 2; d <= 4.5 && !at; d += 0.5) for (let j = 0; j < 12 && !at; j++) { const a = (j / 12) * Math.PI * 2, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, i = cell(x, z); if (i >= 0 && !L.cells[i] && L.pocket?.[i] === 2) at = { x, z }; }
      at ||= rockNear(p.x, p.z, 2, 4.5, 1);
      if (at) jam = put('logjam', {}, at.x, at.z, face(at, p) + Math.PI / 2); else A.skipped.push('weir' + (k + 1) + '.jam');
    }
    A.weirs.push({ i: k + 1, x: p.x, z: p.z, mesh: m, jam });
  });
  list(S.dens).forEach((p) => A.dens.push({ x: p.x, z: p.z, mesh: put('denMouth', {}, p.x, p.z, p.rot ?? (centre && Math.hypot(p.x - centre.x, p.z - centre.z) < 30 ? face(p, centre) : 0)) }));
  if (thaw && ok(S.den)) A.den = put('denMouth', { blocked: true, s: 1.25 }, S.den.x, S.den.z, S.den.rot ?? (centre ? face(S.den, centre) : 0));
  // the shepherds' huts and the fold: only on a dry cell (a spot the layout has left in water is skipped and named)
  list(S.huts).forEach((p, k) => {
    if (wet(p.x, p.z)) { A.skipped.push('hut' + k + '.wet'); return; }
    A.huts.push({ x: p.x, z: p.z, fold: !!p.fold, mesh: put(p.fold ? 'fold' : 'hut', p.fold ? { r: p.r } : {}, p.x, p.z, p.rot ?? hash2(p.x, p.z) * 6.28) });
  });
  if (thaw && ok(S.camp)) { const c = S.camp, a = hash2(c.x, c.z) * 6.28; A.anvil = put('fieldAnvil', {}, c.x + Math.sin(a) * 2.4, c.z + Math.cos(a) * 2.4, a + 2.2); }
  // ---- tarn ----
  // the winches: frozen in `full` (the Cradle frees them), free and turned in `let`; a mason's mark stone beside each
  list(S.winches).forEach((p, k) => {
    const ry = p.rot ?? hash2(p.x, p.z) * 6.28, m = put('winch', {}, p.x, p.z, ry); m.userData.setIce(after ? 0 : 1); m.userData.setOpen(after);
    const mark = put('markStone', { mark: 3 + k }, p.x + Math.sin(ry + 1.9) * 1.7, p.z + Math.cos(ry + 1.9) * 1.7, ry);
    A.winches.push({ i: k + 1, x: p.x, z: p.z, mesh: m, mark });
  });
  // the snow bridges: along the way across (the crevasse, L.low, lies to both sides of it)
  list(S.bridges).forEach((p) => {
    let ry = p.rot;
    if (ry == null) { const lowAt = (x, z) => { const i = cell(x, z); return i >= 0 && !!L.low?.[i] && !L.cells?.[i]; }; ry = (lowAt(p.x - 3, p.z) || lowAt(p.x + 3, p.z)) ? 0 : (lowAt(p.x, p.z - 3) || lowAt(p.x, p.z + 3)) ? Math.PI / 2 : 0; }
    // (the Meltwaters' are plank bridges along the causeway, local z; the Hanging Lake's snow bridges over its crevasses)
    if (thaw) { A.bridges.push({ x: p.x, z: p.z, mesh: put('plankBridge', { len: p.n ?? p.len ?? 6, w: p.w ?? 3 }, p.x, p.z, p.rot ?? 0) }); return; }
    A.bridges.push({ x: p.x, z: p.z, mesh: put('snowBridge', { len: p.len, w: p.w }, p.x, p.z, ry) });
  });
  if (list(S.piers).length) { const at = list(S.piers).map((p) => ({ x: p.x, y: gy(p.x, p.z), z: p.z, h: p.h, r: p.rot })); const m = act7Prop('piers', { at, snow: !thaw }); group.add(m); A.all.push(m); A.piers = m; }
  // the levers: each faces down its own channel (the water flue whose horn it is), else the arena's middle; levers 2 and 3
  // stand in ice until Kelados's plates fall (`full`)
  list(S.levers).forEach((p, k) => {
    const fl = list(L?.flues).find((f) => f.kind === 'water' && f.horn && Math.hypot(f.horn.x - p.x, f.horn.z - p.z) < 1.5);
    const m = put('lever', {}, p.x, p.z, fl ? fl.dir || 0 : centre ? face(p, centre) : 0); m.userData.setIce(!after && k > 0 ? 1 : 0); m.userData.setPulled(after);
    A.levers.push({ i: k + 1, x: p.x, z: p.z, mesh: m });
  });
  if (ok(S.seat)) { const st = S.seat, d = st.out ?? 2; A.wall = put('iceWall', { seat: d, w: st.w, h: st.h }, st.x, st.z - d, 0); }
  if (S.plug?.cells?.length) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const c of S.plug.cells) { const x = c.x ?? c[0], z = c.z ?? c[1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); z0 = Math.min(z0, z); z1 = Math.max(z1, z + 1); }
    const along = x1 - x0 >= z1 - z0;
    A.plug = put('icePlug', { w: Math.max(x1 - x0, z1 - z0) }, (x0 + x1) / 2, (z0 + z1) / 2, along ? 0 : Math.PI / 2); A.plug.userData.setOpen(after);
  }
  if (ok(S.wheel)) { A.wheel = put('weir', { great: true, mark: 5 }, S.wheel.x, S.wheel.z, S.wheel.rot ?? Math.PI / 2); A.wheel.userData.setOpen(after); }
  // ---- the layout's own props whose kind is one of this file's (cover rocks and ice, boulders, fallen pines, ...) ----
  for (const p of L?.props || []) { if (!ok(p) || !PROP7[p.t]) continue; const m = put(p.t, p, p.x, p.z, p.r || 0); if (p.s && p.s !== 1) m.scale.multiplyScalar(p.s); (A.props[p.t] ||= []).push(m); }
  // ---- the after readings' flowers: on dry walkable ground that is never snow, off the trodden path ----
  if (after && o.flowers !== false && R.quality >= 1 && L?.cells) {
    const at = [], want = thaw ? 900 : 420, rr = RNG((L.seed || 1) * 31 + 7);
    const src = list(S.flowers);
    if (src.length) for (const f of src) for (let k = 0; k < (f.n ?? 40); k++) { const a = rr.range(0, 6.28), d = Math.sqrt(rr.next()) * (f.r ?? 5), x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d; if (walk(x, z) && !wet(x, z)) at.push({ x, y: gy(x, z), z }); }
    else for (let tries = 0; tries < want * 12 && at.length < want; tries++) {
      const x = rr.range(3, W - 3), z = rr.range(3, H - 3), i = cell(x, z);
      if (i < 0 || !L.cells[i] || wet(x, z) || L.snow?.[i] || L.paint?.[i] || L.shade?.[i]) continue;
      // (in drifts, not a lawn: where a slow noise is high)
      if (noise2(x * 0.09 + 11, z * 0.09 + 5) < 0.56) continue;
      at.push({ x, y: gy(x, z), z });
    }
    if (at.length) { const m = act7Prop('flowers', { at }); if (m.userData.count) { group.add(m); A.all.push(m); A.flowers = m; } }
  }
  // ---- the clouds' discs, when asked for (hidden until light.js places them) ----
  for (let k = 0; k < (o.clouds || 0); k++) { const m = cloudDisc(11); m.visible = false; group.add(m); A.all.push(m); A.clouds.push(m); }
  if (lvl && !lvl.isObject3D) lvl.act7 = A;
  return A;
}
// Takes act7Level's props out again (a reading rebuilt in place, a test): out of their parent and out of TICKS, their own
// geometries and own() materials freed. The shared geometries, materials and code textures stay (they are every zone's).
// world.js disposeZone does the same for a zone it drops, so a zone's handles need no call of this
export function dispose7(A) {
  if (!A) return;
  const gone = new Set();
  const drop = (o) => {
    gone.add(o);
    o.userData?.dispose?.();
    if ((o.isMesh || o.isLine || o.isPoints) && o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose();
    for (const m of [].concat(o.material || [])) if (m?.userData?.own) m.dispose();
  };
  for (const m of A.all || []) { m.traverse(drop); m.removeFromParent(); }
  for (const t of TICKS) if (gone.has(t.obj)) TICKS.delete(t);
  for (const k in A) if (Array.isArray(A[k])) A[k].length = 0; else if (A[k]?.isObject3D && k !== 'group') A[k] = null;
  A.props = {};
}
// how many triangles a prop draws (instances counted): the look script's and the report's count
export function tris7(obj) {
  let n = 0;
  obj.traverse((o) => { if (!o.isMesh || !o.geometry) return; const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position?.count || 0) / 3; n += t * (o.isInstancedMesh ? o.count : 1); });
  return Math.round(n);
}
