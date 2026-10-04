// Mesh-level helpers: merge skinned primitives that share a material, remap UVs into atlas patches,
// skirt re-weighting, grips, finger poses, free-block search in a UV layout.
import { THREE, pose } from './lib.mjs';
import { uvRaster } from './tex.mjs';

export const meshesNamed = (doc, sub) => doc.getRoot().listMeshes().filter((m) => m.getName().toLowerCase().includes(sub));
export const primsOf = (doc, sub) => meshesNamed(doc, sub).flatMap((m) => m.listPrimitives());

// remap a primitive's UVs from [0,1]^2 into rect [x0, y0, size] (glTF UV space)
export function remapUV(prim, x0, y0, sx, sy = sx) {
  const uv = prim.getAttribute('TEXCOORD_0'); const a = uv.getArray().slice();
  for (let i = 0; i < a.length; i += 2) { a[i] = x0 + Math.min(1, Math.max(0, a[i])) * sx; a[i + 1] = y0 + Math.min(1, Math.max(0, a[i + 1])) * sy; }
  uv.setArray(a);
}

// find a free square block (fraction of texture) in the union of the given primitives' UV islands
export function freeBlock(prims, size, taken = [], N = 256, margin = 3) {
  const map = uvRaster(N, prims, () => 1);
  const b = Math.ceil(size * N);
  const busy = (x, y) => map[y * N + x] >= 0 || taken.some(([tx, ty, ts]) => x >= tx * N - margin && x < (tx + ts) * N + margin && y >= ty * N - margin && y < (ty + ts) * N + margin);
  for (let y = 1; y + b < N; y += 2) for (let x = 1; x + b < N; x += 2) {
    let ok = true;
    for (let yy = y - margin; yy < y + b + margin && ok; yy++) for (let xx = x - margin; xx < x + b + margin; xx++) {
      if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue;
      if (busy(xx, yy)) { ok = false; break; }
    }
    if (ok) return [x / N, y / N, size];
  }
  throw new Error('no free block of size ' + size);
}

// merge skinned primitives (same skin, identity node transforms) into the first one; other meshes' nodes are removed
export function mergeInto(doc, prims, material) {
  const root = doc.getRoot(), buf = root.listBuffers()[0];
  const sem = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];
  const out = {}; for (const s of sem) out[s] = [];
  const idx = []; let base = 0;
  for (const p of prims) {
    const n = p.getAttribute('POSITION').getCount();
    for (const s of sem) { const a = p.getAttribute(s); out[s].push(a ? Array.from(a.getArray()) : null); }
    const I = p.getIndices(); const ia = I ? I.getArray() : Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < ia.length; i++) idx.push(ia[i] + base);
    base += n;
  }
  const first = prims[0];
  const types = { POSITION: 'VEC3', NORMAL: 'VEC3', TEXCOORD_0: 'VEC2', JOINTS_0: 'VEC4', WEIGHTS_0: 'VEC4' };
  for (const s of sem) {
    const parts = out[s]; if (parts.some((x) => !x)) throw new Error('missing ' + s);
    const flat = parts.flat();
    const arr = s === 'JOINTS_0' ? new Uint16Array(flat) : new Float32Array(flat);
    first.setAttribute(s, doc.createAccessor().setType(types[s]).setArray(arr).setBuffer(buf));
  }
  first.setIndices(doc.createAccessor().setType('SCALAR').setArray(base > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)).setBuffer(buf));
  first.setMaterial(material);
  const keepMesh = root.listMeshes().find((m) => m.listPrimitives().includes(first));
  for (const p of prims.slice(1)) {
    const m = root.listMeshes().find((mm) => mm.listPrimitives().includes(p));
    if (m && m !== keepMesh) { for (const n of root.listNodes()) if (n.getMesh() === m) n.dispose(); m.dispose(); }
  }
  return first;
}

// skirt: below the hip line, cloth follows pelvis + both thighs by lateral position (no knee bending)
export function skirtWeights(doc, prim, o = {}) {
  const skin = doc.getRoot().listSkins()[0], joints = skin.listJoints(), ji = (n) => joints.findIndex((j) => j.getName() === n);
  const RT = pose(doc, null, 0);
  const hipY = RT.get('pelvis').wp.y + (o.hipUp ?? 0.04), hemY = o.hemY ?? 0.05, armBones = new Set(['clavicle', 'upperarm', 'lowerarm', 'hand'].flatMap((b) => [ji(b + '_l'), ji(b + '_r')]));
  const fingerRe = /(index|middle|ring|pinky|thumb)/;
  for (const [i, j] of joints.entries()) if (fingerRe.test(j.getName())) armBones.add(i);
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
  const Ja = J.getArray().slice(), Wa = Wt.getArray().slice();
  const pel = ji('pelvis'), tl = ji('thigh_l'), tr = ji('thigh_r'), cl = ji('calf_l'), cr = ji('calf_r');
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let changed = 0;
  for (let i = 0; i < P.getCount(); i++) {
    const p = P.getElement(i, []);
    if (p[1] > hipY) continue;
    let arm = 0; for (let k = 0; k < 4; k++) if (armBones.has(Ja[i * 4 + k])) arm += Wa[i * 4 + k];
    if (arm > 0.25) continue;
    const d = Math.min(1, Math.max(0, (hipY - p[1]) / (hipY - hemY)));
    const leg = (o.legMax ?? 0.8) * sstep(0, o.legRamp ?? 0.3, d);
    const a = sstep(-(o.side ?? 0.11), o.side ?? 0.11, p[0]);       // +X = character's left
    const calf = (o.calf ?? 0) * sstep(0.45, 1, d);
    const nw = new Map([[pel, 1 - leg], [tl, leg * a * (1 - calf)], [tr, leg * (1 - a) * (1 - calf)], [cl, leg * a * calf], [cr, leg * (1 - a) * calf]]);
    const blend = sstep(0, 0.12, d);
    const cur = new Map(); for (let k = 0; k < 4; k++) { const w = Wa[i * 4 + k]; if (w > 0) cur.set(Ja[i * 4 + k], (cur.get(Ja[i * 4 + k]) || 0) + w * (1 - blend)); }
    for (const [jj, w] of nw) cur.set(jj, (cur.get(jj) || 0) + w * blend);
    const top = [...cur].filter(([, w]) => w > 1e-4).sort((x, y) => y[1] - x[1]).slice(0, 4);
    const s = top.reduce((q, [, w]) => q + w, 0);
    for (let k = 0; k < 4; k++) { Ja[i * 4 + k] = top[k] ? top[k][0] : 0; Wa[i * 4 + k] = top[k] ? top[k][1] / s : 0; }
    changed++;
  }
  J.setArray(Ja); Wt.setArray(Wa);
  return changed;
}

// palm frame of a hand in the rest pose
export function handFrame(RT, s) {
  const h = RT.get('hand_' + s).wp.clone(), m = RT.get('middle_01_' + s).wp.clone(), i = RT.get('index_01_' + s).wp.clone(), p = RT.get('pinky_01_' + s).wp.clone();
  const dir = m.clone().sub(h); const len = dir.length(); dir.normalize();
  const across = i.clone().sub(p).projectOnPlane(dir).normalize();           // towards index / thumb side
  const palm = dir.clone().cross(across).multiplyScalar(s === 'l' ? 1 : -1).normalize();
  return { h, m, dir, across, palm, len };
}
// grip_R / grip_L under the hand bones: palm centre, +Y out of the thumb side of the fist (blade), +Z towards the knuckles
export function addGrips(doc, o = {}) {
  const RT = pose(doc, null, 0), out = {};
  for (const s of ['r', 'l']) {
    const f = handFrame(RT, s);
    const P = f.h.clone().addScaledVector(f.dir, f.len * (o.along ?? 0.62)).addScaledVector(f.palm, o.palm ?? 0.03);
    const Y = f.across.clone(), Z = f.dir.clone().projectOnPlane(Y).normalize(), X = Y.clone().cross(Z).normalize();
    const Wg = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(P);
    const hand = RT.get('hand_' + s);
    const L = hand.world.clone().invert().multiply(Wg);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); L.decompose(p, q, sc);
    const node = doc.createNode('grip_' + s.toUpperCase()).setTranslation(p.toArray()).setRotation(q.toArray());
    hand.node.addChild(node);
    out[s] = { node, p, q, hand: 'hand_' + s };
  }
  return out;
}
