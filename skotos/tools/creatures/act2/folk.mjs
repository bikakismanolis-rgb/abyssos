// Builds src/assets/folk.glb: Act II's people, made from the Quaternius characters already in people.glb (CC0).
// Dwarves are the same characters re-proportioned: every bone keeps its rest rotation (so the shared clips in moves.bin
// still fit), the skeleton is re-measured (short legs, broad shoulders, a long back) and the skin follows by blending
// each vertex's per-bone transforms (scale the flesh about the bone, move it with the bone's new joint).
// usage: node folk.mjs [people.glb] [out.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, textureCompress, weld, unpartition, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { statSync } from 'node:fs';

const [PEOPLE = new URL('../../../src/assets/people.glb', import.meta.url).pathname, OUT = new URL('../../../src/assets/folk.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// ---------- proportions ----------
// len: factor on the offset of a joint from its parent; girth: flesh scale across the bone; size: uniform flesh scale
const DWARF = {
  len: { calf: 0.7, foot: 0.72, thigh: 1.18, spine_01: 1.0, spine_02: 1.02, spine_03: 1.02, neck_01: 0.75, Head: 0.9, upperarm: 1.25, lowerarm: 0.86, hand: 0.86, clavicle: 1.1 },
  girth: { pelvis: 1.22, spine_01: 1.26, spine_02: 1.3, spine_03: 1.28, neck_01: 1.3, thigh: 1.3, calf: 1.28, upperarm: 1.24, lowerarm: 1.24, clavicle: 1.2 },
  size: { Head: 1.12, hand: 1.18, foot: 1.18, ball: 1.15 }
};
const side = (n) => n.replace(/_(l|r)$/, '');

// ---------- recolouring ----------
// selective hue move (pack-chars.mjs): pixels with hue in [f0, f1] go to `to`, saturation x sat, value x bri
async function recolor(img, [f0, f1, to, sat, bri]) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mid = (f0 + f1) / 2;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.04 || mx < 0.03) continue;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    if (h < f0 || h > f1 || d / mx < 0.12) continue;
    const nh = (to + (h - mid) * 0.4 + 360) % 360, ns = Math.min(1, (d / mx) * sat), nv = Math.min(1, mx * bri);
    const c = nv * ns, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = nv - c;
    const [rr, gg, bb] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x];
    data[i] = Math.round((rr + m) * 255); data[i + 1] = Math.round((gg + m) * 255); data[i + 2] = Math.round((bb + m) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
// ash: grey the whole map toward a cold stone tone, keep the light and dark
async function ashen(img, k = 0.8, tint = [0.62, 0.6, 0.6]) {
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    const l = 0.3 * data[i] + 0.55 * data[i + 1] + 0.15 * data[i + 2];
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - k) + l * tint[c] * k * 1.25);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
const hexRGB = (h) => { const v = parseInt(h.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255].map((c) => Math.pow(c, 2.2)); };

// ---------- one character from people.glb, alone in its document ----------
async function isolate(sceneName) {
  const doc = await io.read(PEOPLE);
  const root = doc.getRoot();
  for (const s of root.listScenes()) if (s.getName() !== sceneName) { for (const n of s.listChildren()) n.dispose(); s.dispose(); }
  const sc = root.listScenes()[0];
  root.setDefaultScene(sc);
  const live = new Set(); sc.traverse((n) => live.add(n));
  for (const n of root.listNodes()) if (!live.has(n)) n.dispose();
  for (const sk of root.listSkins()) if (!sk.listJoints().some((j) => live.has(j))) sk.dispose();
  await doc.transform(prune({ keepLeaves: true }));
  return doc;
}

// ---------- re-proportioning ----------
function worldOf(sc) {
  const W = new Map(), P = new Map();
  const visit = (n, pm, par) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale())); const w = pm ? pm.clone().multiply(m) : m; W.set(n, w); P.set(n, par); for (const c of n.listChildren()) visit(c, w, n); };
  for (const n of sc.listChildren()) visit(n, null, null);
  return { W, P };
}
function morph(doc, M) {
  const root = doc.getRoot(), sc = root.getDefaultScene();
  const { W, P } = worldOf(sc);
  const joints = new Set(); for (const sk of root.listSkins()) for (const j of sk.listJoints()) joints.add(j);
  const order = []; sc.traverse((n) => { if (joints.has(n)) order.push(n); });
  // new rest: same world rotations, joint offsets scaled
  const Wn = new Map();
  for (const j of order) {
    const par = P.get(j), w = W.get(j), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    w.decompose(p, q, s);
    if (!par || !joints.has(par)) { Wn.set(j, w.clone()); continue; }
    const pw = W.get(par), pp = new THREE.Vector3().setFromMatrixPosition(pw);
    const off = p.clone().sub(pp).multiplyScalar(M.len[side(j.getName())] ?? 1);
    const npp = new THREE.Vector3().setFromMatrixPosition(Wn.get(par));
    Wn.set(j, new THREE.Matrix4().compose(npp.add(off), q, s));
  }
  // stand the new skeleton on the old ground
  const low = (map) => Math.min(...order.filter((j) => /^ball_|^foot_/.test(j.getName())).map((j) => new THREE.Vector3().setFromMatrixPosition(map.get(j)).y));
  const dy = low(W) - low(Wn);
  for (const j of order) { const m = Wn.get(j); m.elements[13] += dy; }
  // per-joint flesh transform: T'_j * S_j * T_j^-1 (S in the joint's frame: girth across the bone, length along it)
  const X = new Map();
  for (const j of order) {
    const nm = side(j.getName()), Tj = W.get(j), Tn = Wn.get(j);
    const child = j.listChildren().find((c) => joints.has(c));
    let S = new THREE.Matrix4();
    const g = M.girth[nm] ?? 1, u = M.size[nm] ?? 1;
    if (u !== 1) S.makeScale(u, u, u);
    else if (g !== 1 || child) {
      const along = child ? new THREE.Vector3(...child.getTranslation()).normalize() : new THREE.Vector3(1, 0, 0);
      const L = child ? (M.len[side(child.getName())] ?? 1) : 1;
      // G*I + (L - G) * a a^T
      const a = along, e = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e.push((r === c ? g : 0) + (L - g) * a.getComponent(r) * a.getComponent(c));
      S.set(e[0], e[1], e[2], 0, e[3], e[4], e[5], 0, e[6], e[7], e[8], 0, 0, 0, 0, 1);
    }
    X.set(j, Tn.clone().multiply(S).multiply(Tj.clone().invert()));
  }
  // skin every vertex into its bind-world position, move it by the blended flesh transforms, rebind to the new joints
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(), skin = node.getSkin(); if (!mesh || !skin) continue;
    const js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
    const B = js.map((j, i) => W.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16)));
    for (const prim of mesh.listPrimitives()) {
      const Pa = prim.getAttribute('POSITION'), Na = prim.getAttribute('NORMAL'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
      const pos = new Float32Array(Pa.getCount() * 3), nor = Na ? new Float32Array(Na.getCount() * 3) : null;
      const e = [], je = [], we = [], v = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < Pa.getCount(); i++) {
        Pa.getElement(i, e); J.getElement(i, je); Wt.getElement(i, we);
        const acc = new THREE.Vector3(), nacc = new THREE.Vector3();
        if (Na) Na.getElement(i, e.length ? [] : []);
        for (let k = 0; k < 4; k++) {
          if (!we[k]) continue;
          const jt = js[je[k]], bw = v.fromArray(Pa.getElement(i, [])).applyMatrix4(B[je[k]]).applyMatrix4(X.get(jt));
          acc.addScaledVector(bw, we[k]);
          if (Na) { const nn = n.fromArray(Na.getElement(i, [])).transformDirection(B[je[k]]); const lin = new THREE.Matrix3().setFromMatrix4(X.get(jt)).invert().transpose(); nacc.addScaledVector(nn.applyMatrix3(lin), we[k]); }
        }
        acc.toArray(pos, i * 3);
        if (nor) nacc.normalize().toArray(nor, i * 3);
      }
      prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(root.listBuffers()[0]));
      if (nor) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(root.listBuffers()[0]));
    }
    const arr = new Float32Array(js.length * 16);
    js.forEach((j, i) => Wn.get(j).clone().invert().toArray(arr, i * 16));
    skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(arr).setBuffer(root.listBuffers()[0]));
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
  // node locals from the new world transforms
  for (const j of order) {
    const par = P.get(j), pw = par ? (joints.has(par) ? Wn.get(par) : W.get(par)) : new THREE.Matrix4();
    const l = pw.clone().invert().multiply(Wn.get(j)), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    l.decompose(p, q, s);
    j.setTranslation(p.toArray()).setRotation(q.toArray()).setScale(s.toArray());
  }
}

// ---------- recipes ----------
const RECIPES = {
  // the Ashbound: ash-grey skin, armour gone the colour of old embers
  stoneborn: { src: 'warden', dwarf: true, mats: { MI_Ranger_warden: { hsv: [180, 260, 14, 0.55, 0.62] }, MI_Superhero_Male: { ash: 0.85 } }, color: { MI_Hair_1_warden: '#2e2a28' } },
  stonebornArb: { src: 'wayfarer', dwarf: true, mats: { MI_Ranger_wayfarer: { ash: 0.55 }, MI_Superhero_Male: { ash: 0.85 } }, color: { MI_Hair_1_wayfarer: '#3a3430' } },
  runepriest: { src: 'mage', dwarf: true, mats: { MI_Ranger_mage: { hsv: [200, 300, 8, 1.1, 0.75] }, MI_Superhero_Male: { ash: 0.85 } }, color: { MI_Hair_1_mage: '#8a8682' } },
  // Brokka, smith of the third gallery
  brokka: { src: 'smith', dwarf: true, mats: { MI_Peasant_smith: { hsv: [0, 60, 28, 0.9, 0.8] } }, color: { MI_Hair_2_smith: '#9a3a12', MI_Hair_1_smith: '#9a3a12' } }
};

let out = null;
for (const [name, R] of Object.entries(RECIPES)) {
  const doc = await isolate(R.src);
  if (R.dwarf) morph(doc, DWARF);
  const root = doc.getRoot();
  for (const mat of root.listMaterials()) {
    const mn = mat.getName(), op = R.mats?.[mn], tex = mat.getBaseColorTexture();
    if (op && tex) {
      let img = Buffer.from(tex.getImage());
      if (op.hsv) img = await recolor(img, op.hsv);
      if (op.ash) img = await ashen(img, op.ash);
      mat.setBaseColorTexture(doc.createTexture(`${name}_${mn}`).setImage(new Uint8Array(img)).setMimeType('image/png'));
    }
    if (R.color?.[mn]) mat.setBaseColorFactor([...hexRGB(R.color[mn]), 1]);
    mat.setName(`${mn}_${name}`);
  }
  root.getDefaultScene().setName(name);
  if (!out) { out = doc; continue; }
  mergeDocuments(out, doc);
}
const root = out.getRoot();
for (const s of root.listScenes()) s.setExtras({ folk: true });
root.setDefaultScene(root.listScenes()[0]);
for (const b of root.listBuffers().slice(1)) b.dispose();
for (const a of root.listAccessors()) a.setBuffer(root.listBuffers()[0]);
await out.transform(
  dedup(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 80 }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
  prune({ keepAttributes: false, keepLeaves: false }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  prune({ keepAttributes: false, keepLeaves: false }),
  unpartition()
);
await io.write(OUT, out);
console.log('folk', root.listScenes().map((s) => s.getName()).join(' '), (statSync(OUT).size / 1024).toFixed(0) + ' KB', 'textures', root.listTextures().length);
