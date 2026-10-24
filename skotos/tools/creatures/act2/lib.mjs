// Act II creature toolkit (Node, gltf-transform + three.js math): normalise a downloaded rigged model to the creature
// contract (Y up, facing +Z, feet on y = 0, metres), sample and copy its clips, and write procedural clips as rotations
// about character-space axes ("swing the thigh about X by 25 degrees"), layered on a base clip or on the rest pose.
import * as THREE from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, meshopt, unpartition, resample, textureCompress, weld, metalRough, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';
export { THREE, sharp };

export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
export const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
export const deg = Math.PI / 180;
export const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin((Math.PI * (t - a)) / (b - a)));
export const ramp = (t, a, b) => smooth((t - a) / (b - a));
export const env = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));

export async function load(path) { await MeshoptDecoder.ready; return io.read(path); }
export const byName = (doc, name) => doc.getRoot().listNodes().find((n) => n.getName() === name);
export const findBone = (doc, re) => doc.getRoot().listNodes().find((n) => re.test(n.getName()));
const sceneRoots = (doc) => doc.getRoot().getDefaultScene().listChildren();

// ---------- sampling ----------
export function sample(ch, t) {
  const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), path = ch.getTargetPath();
  let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++;
  const j = Math.min(i + 1, inp.length - 1), t0 = inp[i], t1 = inp[j], f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  if (s.getInterpolation() === 'STEP') return path === 'rotation' ? new THREE.Quaternion().fromArray(out, i * 4) : new THREE.Vector3().fromArray(out, i * 3);
  if (path === 'rotation') return new THREE.Quaternion().fromArray(out, i * 4).slerp(new THREE.Quaternion().fromArray(out, j * 4), f);
  return new THREE.Vector3().fromArray(out, i * 3).lerp(new THREE.Vector3().fromArray(out, j * 3), f);
}
// removes a clip with its samplers (their keyframe accessors are then orphans, dropped when finishing)
export function dropClip(a) { for (const s of a.listSamplers()) s.dispose(); a.dispose(); }
export const duration = (anim) => { let d = 0; for (const s of anim.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); return d; };
// local TRS of every node at time t of anim (rest when anim is null)
export function locals(doc, anim, t) {
  const loc = new Map();
  for (const n of doc.getRoot().listNodes()) loc.set(n, { p: new THREE.Vector3().fromArray(n.getTranslation()), q: new THREE.Quaternion().fromArray(n.getRotation()), s: new THREE.Vector3().fromArray(n.getScale()) });
  if (anim) for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode(), path = ch.getTargetPath(); if (!n || !loc.has(n)) continue;
    const v = sample(ch, t);
    if (path === 'rotation') loc.get(n).q.copy(v); else if (path === 'translation') loc.get(n).p.copy(v); else if (path === 'scale') loc.get(n).s.copy(v);
  }
  return loc;
}
export function worlds(doc, loc) {
  const out = new Map();
  const visit = (n, pm) => {
    const l = loc.get(n), m = new THREE.Matrix4().compose(l.p, l.q, l.s), w = pm ? pm.clone().multiply(m) : m;
    out.set(n, w);
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of sceneRoots(doc)) visit(n, null);
  return out;
}
// skinned vertex positions (every k-th vertex) under the given world matrices
export function skinnedPoints(doc, W, step = 3) {
  const pts = [], v = new THREE.Vector3(), acc = new THREE.Vector3(), m = new THREE.Matrix4();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const skin = node.getSkin();
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
      const ibm = skin?.getInverseBindMatrices(), joints = skin?.listJoints();
      const e = [], je = [], we = [];
      for (let i = 0; i < P.getCount(); i += step) {
        P.getElement(i, e); v.fromArray(e);
        if (skin && J) {
          J.getElement(i, je); Wt.getElement(i, we); acc.set(0, 0, 0);
          for (let k = 0; k < 4; k++) { if (!we[k]) continue; const jm = W.get(joints[je[k]]); const ib = new THREE.Matrix4().fromArray(ibm.getArray(), je[k] * 16); m.multiplyMatrices(jm, ib); acc.add(v.clone().applyMatrix4(m).multiplyScalar(we[k])); }
          pts.push(acc.clone());
        } else pts.push(v.clone().applyMatrix4(W.get(node)));
      }
    }
  }
  return pts;
}
export function bounds(doc, anim = null, t = 0, step = 3) {
  const b = new THREE.Box3(); for (const p of skinnedPoints(doc, worlds(doc, locals(doc, anim, t)), step)) b.expandByPoint(p);
  return b;
}

// ---------- normalising ----------
// puts everything under one root that scales to `height` (or by `scale`), turns by `yaw` and stands the feet on y = 0
export function normalise(doc, o = {}) {
  const sc = doc.getRoot().getDefaultScene();
  const kids = sc.listChildren();
  const root = doc.createNode('creature');
  for (const k of kids) { sc.removeChild(k); root.addChild(k); }
  sc.addChild(root);
  if (o.yaw) root.setRotation(new THREE.Quaternion().setFromAxisAngle(Y, o.yaw).toArray());
  let b = bounds(doc, o.anim || null, o.t || 0);
  const s = o.scale ?? (o.height ? o.height / (b.max.y - b.min.y) : 1);
  root.setScale([s, s, s]);
  b = bounds(doc, o.anim || null, o.t || 0);
  const c = b.getCenter(new THREE.Vector3());
  root.setTranslation([o.keepXZ ? 0 : -c.x, -b.min.y + (o.lift || 0), o.keepXZ ? 0 : -c.z]);
  return root;
}
// drops meshes that are not skinned (Sketchfab's bone display shapes and the like) unless kept by name
export function dropLoose(doc, keep = /$^/) {
  for (const n of doc.getRoot().listNodes()) if (n.getMesh() && !n.getSkin() && !keep.test(n.getName())) n.setMesh(null);
}

// ---------- clips ----------
export function joints(doc) { const s = doc.getRoot().listSkins()[0]; return s ? s.listJoints() : []; }
// a copy of src (or a time window of it) as a new clip, resampled at fps, optionally time-scaled
export function copyClip(doc, src, name, o = {}) {
  const t0 = o.from ?? 0, t1 = o.to ?? duration(src), speed = o.speed ?? 1, fps = o.fps ?? 30;
  return makeClip(doc, name, { dur: (t1 - t0) / speed, fps, base: src, baseAt: (t) => t0 + t * speed, keys: o.keys, root: o.root, loop: o.loop, nodes: o.nodes });
}
// keys(t, dur) -> { boneName: [[axisVector (character space), degrees], ...] }; root(t) -> { p: [dx, dy, dz] char space, r: [[axis, deg]] }
// base: a clip sampled underneath (baseAt maps clip time to base time); nodes: limit the written channels to these nodes
export function makeClip(doc, name, o) {
  const fps = o.fps ?? 30, n = Math.max(2, Math.round(o.dur * fps) + 1);
  const all = doc.getRoot().listNodes(), restLoc = locals(doc, null, 0), restW = worlds(doc, restLoc);
  const nodes = o.nodes || [...new Set([...joints(doc), ...(o.base ? o.base.listChannels().map((c) => c.getTargetNode()).filter(Boolean) : [])])];
  const named = new Map(all.map((nd) => [nd.getName(), nd]));
  const rootNode = o.rootNode ? named.get(o.rootNode) : null;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(o.dur, i / fps);
    const L = o.base ? locals(doc, o.base, o.baseAt ? o.baseAt(t) : Math.min(t, duration(o.base))) : locals(doc, null, 0);
    const k = o.keys ? o.keys(t, o.dur) : {};
    for (const [bn, rots] of Object.entries(k)) {
      const nd = named.get(bn); if (!nd) throw new Error('no bone ' + bn);
      const wq = new THREE.Quaternion(); restW.get(nd).decompose(new THREE.Vector3(), wq, new THREE.Vector3());
      const inv = wq.clone().invert();
      for (const [axis, a] of rots) { if (!a) continue; const ax = axis.clone().applyQuaternion(inv).normalize(); L.get(nd).q.multiply(new THREE.Quaternion().setFromAxisAngle(ax, a * deg)); }
    }
    if (o.root && rootNode) {
      // a character-space offset and turn of the root bone, brought into its parent's frame
      const r = o.root(t, o.dur);
      const par = all.find((nd) => nd.listChildren().includes(rootNode));
      const pinv3 = new THREE.Matrix3().setFromMatrix4(par ? restW.get(par).clone().invert() : new THREE.Matrix4());
      if (r.p) L.get(rootNode).p.add(new THREE.Vector3(...r.p).applyMatrix3(pinv3));
      if (r.r) { const wq = new THREE.Quaternion(); restW.get(rootNode).decompose(new THREE.Vector3(), wq, new THREE.Vector3()); for (const [axis, a] of r.r) { const ax = axis.clone().applyQuaternion(wq.clone().invert()).normalize(); L.get(rootNode).q.multiply(new THREE.Quaternion().setFromAxisAngle(ax, a * deg)); } }
    }
    rows.push(L);
  }
  if (o.loop) rows[n - 1] = rows[0];
  const buf = doc.getRoot().listBuffers()[0];
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = Math.min(o.dur, i / fps);
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  const moved = (nd, path) => rows.some((L) => (path === 'rotation' ? 1 - Math.abs(L.get(nd).q.dot(restLoc.get(nd).q)) > 1e-6 : L.get(nd).p.distanceTo(restLoc.get(nd).p) > 1e-5));
  for (const nd of nodes) {
    for (const path of ['rotation', 'translation']) {
      if (path === 'translation' && !moved(nd, path)) continue;
      if (path === 'rotation' && !moved(nd, path) && !o.base) continue;
      const k = path === 'rotation' ? 4 : 3, arr = new Float32Array(n * k);
      let prev = null;
      for (let i = 0; i < n; i++) {
        if (k === 4) { const q = rows[i].get(nd).q.clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; }
        else rows[i].get(nd).p.toArray(arr, i * 3);
      }
      const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(k === 4 ? 'VEC4' : 'VEC3').setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
      anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nd).setTargetPath(path).setSampler(s));
    }
  }
  return anim;
}
// a grip empty under a hand bone: +Y along the held blade, +Z along the knuckles (character space directions)
export function addGrip(doc, boneName, name, pos, up, fwd) {
  const b = byName(doc, boneName); if (!b) throw new Error('no bone ' + boneName);
  const W = worlds(doc, locals(doc, null, 0)).get(b), wq = new THREE.Quaternion(), wp = new THREE.Vector3(), ws = new THREE.Vector3();
  W.decompose(wp, wq, ws);
  const yv = up.clone().normalize(), zv = fwd.clone().projectOnPlane(yv).normalize(), xv = yv.clone().cross(zv);
  const R = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv, yv, zv));
  const g = doc.createNode(name).setTranslation(new THREE.Vector3(...pos).sub(wp).applyQuaternion(wq.clone().invert()).divide(ws).toArray()).setRotation(wq.clone().invert().multiply(R).toArray()).setScale([1 / ws.x, 1 / ws.y, 1 / ws.z]);
  b.addChild(g);
  return g;
}

// ---------- finishing ----------
const dropOrphans = (doc) => { for (const a of doc.getRoot().listAccessors()) if (a.listParents().every((p) => p.propertyType === 'Root')) a.dispose(); };
export async function finish(doc, out, extras, o = {}) {
  await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  dropOrphans(doc);
  doc.getRoot().getDefaultScene().setExtras(extras);
  await doc.transform(
    metalRough(),   // three.js reads metal/rough only: older specular-glossiness materials are converted
    resample({ tolerance: 2e-4 }),
    dedup(), weld(),
    ...(o.simplify ? [simplify({ simplifier: MeshoptSimplifier, ratio: o.simplify, error: o.simplifyError ?? 0.02 })] : []),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColorTexture$/, resize: [o.base ?? 1024, o.base ?? 1024], quality: 82 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(normalTexture|metallicRoughnessTexture|occlusionTexture|emissiveTexture)$/, resize: [o.aux ?? 512, o.aux ?? 512], quality: 88 }),
    // anything left (specular-glossiness maps and the like)
    textureCompress({ encoder: sharp, targetFormat: 'webp', pattern: /^(?!.*webp)/, resize: [o.base ?? 1024, o.base ?? 1024], quality: 84 }),
    prune({ keepLeaves: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    prune({ keepLeaves: true }),
    unpartition()
  );
  dropOrphans(doc);
  await io.write(out, doc);
  return statSync(out).size;
}
// the clip's strike: the moment a named bone moves fastest (character space)
export function fastest(doc, anim, boneName, fps = 60) {
  const b = byName(doc, boneName), d = duration(anim); let best = 0, bt = 0, prev = null;
  for (let i = 0; i <= d * fps; i++) { const t = i / fps; const p = new THREE.Vector3().setFromMatrixPosition(worlds(doc, locals(doc, anim, t)).get(b)); if (prev) { const v = p.distanceTo(prev); if (v > best) { best = v; bt = t; } } prev = p; }
  return +bt.toFixed(3);
}

// Keeps only the joints that deform the mesh (and their ancestors as plain nodes): a rig's control and helper bones are
// dropped from the skin, from the clips and from the scene. Also drops vertex attributes the game does not read.
export function slimRig(doc, keep = /^grip_/) {
  const root = doc.getRoot();
  const used = new Set();
  for (const node of root.listNodes()) {
    const skin = node.getSkin(), mesh = node.getMesh(); if (!skin || !mesh) continue;
    const js = skin.listJoints();
    for (const p of mesh.listPrimitives()) {
      const J = p.getAttribute('JOINTS_0'), W = p.getAttribute('WEIGHTS_0'); if (!J) continue;
      const je = [], we = [];
      for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); W.getElement(i, we); for (let k = 0; k < 4; k++) if (we[k] > 0) used.add(js[je[k]]); }
    }
  }
  const parent = new Map(); for (const n of root.listNodes()) for (const c of n.listChildren()) parent.set(c, n);
  const needed = new Set();
  for (const n of root.listNodes()) if (used.has(n) || n.getMesh() || keep.test(n.getName())) { let q = n; while (q && !needed.has(q)) { needed.add(q); q = parent.get(q); } }
  // re-index every skin onto the used joints
  for (const skin of root.listSkins()) {
    const old = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
    const keepIdx = old.map((j, i) => (used.has(j) ? i : -1)).filter((i) => i >= 0), map = new Map(keepIdx.map((oi, ni) => [oi, ni]));
    const arr = new Float32Array(keepIdx.length * 16); keepIdx.forEach((oi, ni) => arr.set(ibm.slice(oi * 16, oi * 16 + 16), ni * 16));
    for (const j of old) skin.removeJoint(j);
    for (const oi of keepIdx) skin.addJoint(old[oi]);
    skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(arr).setBuffer(root.listBuffers()[0]));
    for (const node of root.listNodes()) {
      if (node.getSkin() !== skin) continue;
      for (const p of node.getMesh().listPrimitives()) {
        const J = p.getAttribute('JOINTS_0'), W = p.getAttribute('WEIGHTS_0'); if (!J) continue;
        const out = new Uint16Array(J.getCount() * 4), je = [], we = [];
        for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); W.getElement(i, we); for (let k = 0; k < 4; k++) out[i * 4 + k] = we[k] > 0 ? map.get(je[k]) : 0; }
        p.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(out).setBuffer(root.listBuffers()[0]));
      }
    }
  }
  for (const a of root.listAnimations()) for (const ch of a.listChannels()) if (!needed.has(ch.getTargetNode())) { const s = ch.getSampler(); ch.dispose(); if (s && !s.listParents().some((p) => p.propertyType === 'AnimationChannel')) s.dispose(); }
  for (const n of root.listNodes()) if (!needed.has(n) && !n.listChildren().some((c) => needed.has(c))) { const p = parent.get(n); if (p) p.removeChild(n); n.dispose(); }
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TANGENT', 'COLOR_0', 'TEXCOORD_1', 'JOINTS_1', 'WEIGHTS_1']) if (p.getAttribute(s)) p.setAttribute(s, null);
  return used.size;
}
