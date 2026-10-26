// Act V code rigs (Node only): a creature built as plain arrays (positions, normals, colours, uvs, indices) on a code
// skeleton whose bind frames are the identity at each joint's position (character space: Y up, facing +Z, metres), so a
// joint's local frame at rest is the world's axes and FK rotations read as "bend about X toward +Z". Used by skotos.mjs
// and tentacle.mjs. Clips are sampled from a pose function and written as local rotations (and translations where a
// joint moves), and every clip is measured: the lowest and highest skin points and the worst edge stretch.
import { Document } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { THREE, load, worlds, locals } from '../act2/lib.mjs';
export { THREE };
export const deg = Math.PI / 180;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
export const Qa = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a * deg);
// local rotation from bends in degrees: about X (toward +Z), about Z (toward -X), then the twist about the bone (Y)
export const Qb = (bx = 0, bz = 0, ty = 0) => Qa(X, bx).multiply(Qa(Z, bz)).multiply(Qa(Y, ty));
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const ramp = (t, a, b) => smooth((t - a) / (b - a));
export const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin((Math.PI * (t - a)) / (b - a)));
export const env = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));
export const TAU = Math.PI * 2;
// piecewise smoothstep through [time, value] keys (numbers or arrays)
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], f = smooth((t - t0) / (t1 - t0));
    return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * f) : a + (b - a) * f;
  }
  return keys[keys.length - 1][1];
}

// ---------- the skeleton ----------
// joints: [{ name, parent (name or null), p: Vector3 bind position }]
export function makeRig(joints) {
  const names = joints.map((j) => j.name), idx = new Map(names.map((n, i) => [n, i]));
  const parent = joints.map((j) => (j.parent == null ? -1 : idx.get(j.parent)));
  parent.forEach((p, i) => { if (p === undefined) throw new Error('no parent for ' + names[i]); if (p >= i) throw new Error('parents first: ' + names[i]); });
  const bind = joints.map((j) => j.p.clone());
  const off = bind.map((p, i) => (parent[i] < 0 ? p.clone() : p.clone().sub(bind[parent[i]])));
  return { names, idx, parent, bind, off, n: joints.length };
}
// world rotations and positions of every joint for a pose { q: { name: local Quaternion }, p: { name: Vector3 added to the rest offset } }
export function fk(rig, pose = {}) {
  const Wq = [], Wp = [], Lq = [], Lp = [];
  for (let i = 0; i < rig.n; i++) {
    const nm = rig.names[i], q = pose.q?.[nm] ? pose.q[nm].clone().normalize() : new THREE.Quaternion(), p = rig.off[i].clone();
    if (pose.p?.[nm]) p.add(pose.p[nm]);
    Lq.push(q); Lp.push(p);
    const pi = rig.parent[i];
    if (pi < 0) { Wq.push(q.clone()); Wp.push(p.clone()); }
    else { Wq.push(Wq[pi].clone().multiply(q)); Wp.push(Wp[pi].clone().add(p.clone().applyQuaternion(Wq[pi]))); }
  }
  return { Wq, Wp, Lq, Lp };
}
// skinned positions (every step-th vertex) of mesh { pos, J, W } under an fk() result
export function skin(rig, mesh, F, step = 1) {
  const out = [], v = V(), acc = V();
  const n = mesh.pos.length / 3;
  for (let i = 0; i < n; i += step) {
    acc.set(0, 0, 0);
    for (let k = 0; k < 4; k++) {
      const w = mesh.W[i * 4 + k]; if (!w) continue;
      const j = mesh.J[i * 4 + k];
      v.set(mesh.pos[i * 3] - rig.bind[j].x, mesh.pos[i * 3 + 1] - rig.bind[j].y, mesh.pos[i * 3 + 2] - rig.bind[j].z).applyQuaternion(F.Wq[j]).add(F.Wp[j]);
      acc.addScaledVector(v, w);
    }
    out.push(acc.clone());
  }
  return out;
}

// ---------- the document ----------
// mesh: { pos, nor, col?, uv?, idx, J (Uint16 n*4), W (Float32 n*4) }; mat: { name, base: [r,g,b,a], rough, metal, doubleSided?,
// textures?: { base?, normal?, orm? } as { image (Buffer), mime } }
export function buildDoc(rig, mesh, mat, o = {}) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const jNodes = rig.names.map((n) => doc.createNode(n));
  const root = doc.createNode(o.rootName || 'creature');
  rig.names.forEach((n, i) => {
    jNodes[i].setTranslation(rig.off[i].toArray());
    if (rig.parent[i] < 0) root.addChild(jNodes[i]); else jNodes[rig.parent[i]].addChild(jNodes[i]);
  });
  const sk = doc.createSkin(o.skinName || 'skin').setSkeleton(jNodes[0]);
  const ib = new Float32Array(rig.n * 16);
  rig.bind.forEach((p, i) => { new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z).toArray(ib, i * 16); sk.addJoint(jNodes[i]); });
  sk.setInverseBindMatrices(acc('MAT4', ib));
  const m = doc.createMaterial(mat.name).setBaseColorFactor(mat.base).setRoughnessFactor(mat.rough).setMetallicFactor(mat.metal ?? 0).setDoubleSided(!!mat.doubleSided);
  const tex = (t, name) => doc.createTexture(name).setImage(t.image).setMimeType(t.mime);
  if (mat.textures?.base) m.setBaseColorTexture(tex(mat.textures.base, mat.name + '_d'));
  if (mat.textures?.normal) { m.setNormalTexture(tex(mat.textures.normal, mat.name + '_n')); if (mat.normalScale) m.setNormalScale(mat.normalScale); }
  if (mat.textures?.orm) { const t = tex(mat.textures.orm, mat.name + '_orm'); m.setMetallicRoughnessTexture(t); if (mat.ao) m.setOcclusionTexture(t); }
  const prim = doc.createPrimitive().setMaterial(m)
    .setAttribute('POSITION', acc('VEC3', new Float32Array(mesh.pos)))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(mesh.nor)))
    .setAttribute('JOINTS_0', acc('VEC4', rig.n < 256 ? new Uint8Array(mesh.J) : new Uint16Array(mesh.J)))
    .setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array(mesh.W)))
    .setIndices(acc('SCALAR', mesh.pos.length / 3 < 65536 ? new Uint16Array(mesh.idx) : new Uint32Array(mesh.idx)));
  if (mesh.col) prim.setAttribute('COLOR_0', acc('VEC3', new Float32Array(mesh.col)));
  if (mesh.uv) prim.setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(mesh.uv)));
  const meshNode = doc.createNode(o.meshName || 'body').setMesh(doc.createMesh(o.meshName || 'body').addPrimitive(prim)).setSkin(sk);
  root.addChild(meshNode);
  doc.createScene('scene').addChild(root);
  doc.getRoot().setDefaultScene(doc.getRoot().listScenes()[0]);
  return { doc, buf, jNodes, root };
}

// ---------- clips ----------
// fn(t, dur) -> pose; writes every joint that turns (and the translation of those that move) at fps; o.loop copies frame 0
// to the last frame. Returns the clip's measurements.
export function writeClip(D, rig, mesh, name, dur, fn, o = {}) {
  const { doc, buf, jNodes } = D;
  const fps = o.fps ?? 30, n = Math.max(2, Math.round(dur * fps) + 1);
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(fk(rig, fn(Math.min(dur, i / fps), dur)));
  if (o.loop) frames[n - 1] = frames[0];
  const times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = Math.min(dur, i / fps);
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  const add = (node, path, arr, type) => {
    const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(s));
  };
  const I = new THREE.Quaternion();
  for (let j = 0; j < rig.n; j++) {
    if (o.all || frames.some((f) => 1 - Math.abs(f.Lq[j].dot(I)) > 1e-7)) {
      const arr = new Float32Array(n * 4); let prev = null;
      for (let i = 0; i < n; i++) { const q = frames[i].Lq[j].clone(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; }
      add(jNodes[j], 'rotation', arr, 'VEC4');
    }
    if (frames.some((f) => f.Lp[j].distanceTo(rig.off[j]) > 1e-5)) {
      const arr = new Float32Array(n * 3); frames.forEach((f, i) => f.Lp[j].toArray(arr, i * 3));
      add(jNodes[j], 'translation', arr, 'VEC3');
    }
  }
  // measurements: lowest / highest skin point, the worst edge stretch and squash against the bind pose
  let lo = 1e9, hi = -1e9, loT = 0, hiT = 0, worst = 1, worstT = 0, worstJ = '', squash = 1, squashT = 0;
  const step = Math.max(1, Math.round(n / 24)), nv = mesh.pos.length / 3;
  const bindP = []; for (let v = 0; v < nv; v++) bindP.push(V(mesh.pos[v * 3], mesh.pos[v * 3 + 1], mesh.pos[v * 3 + 2]));
  for (let i = 0; i < n; i += step) {
    const pts = skin(rig, mesh, frames[i], 1), t = i / fps;
    for (const p of pts) { if (p.y < lo) { lo = p.y; loT = t; } if (p.y > hi) { hi = p.y; hiT = t; } }
    if (o.noStretch) continue;
    const I3 = mesh.idx;
    for (let k = 0; k < I3.length; k += 3) for (const [a, b] of [[I3[k], I3[k + 1]], [I3[k + 1], I3[k + 2]], [I3[k + 2], I3[k]]]) {
      const l0 = bindP[a].distanceTo(bindP[b]); if (l0 < (o.minEdge ?? 0.01)) continue;
      const r = pts[a].distanceTo(pts[b]) / l0;
      if (r > worst) { worst = r; worstT = t; worstJ = rig.names[mesh.J[a * 4]]; }
      if (r < squash) { squash = r; squashT = t; }
    }
  }
  const info = { dur: +dur.toFixed(3), lo: `${lo.toFixed(2)}@${loT.toFixed(2)}`, hi: `${hi.toFixed(2)}@${hiT.toFixed(2)}`, stretch: `${worst.toFixed(2)}@${worstT.toFixed(2)} ${worstJ}`, squash: `${squash.toFixed(2)}@${squashT.toFixed(2)}` };
  return { anim, frames, info };
}

// ---------- geometry ----------
// welds by position (tolerance eps): returns { pos (welded), remap (old -> new) }
export function weldPositions(pos, eps = 1e-5) {
  const map = new Map(), remap = new Uint32Array(pos.length / 3), out = [];
  for (let i = 0; i < pos.length / 3; i++) {
    const k = Math.round(pos[i * 3] / eps) + ',' + Math.round(pos[i * 3 + 1] / eps) + ',' + Math.round(pos[i * 3 + 2] / eps);
    let j = map.get(k); if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); }
    remap[i] = j;
  }
  return { pos: out, remap };
}
// area-weighted smooth normals; vertices at the same position share their normal (no seams in the shading)
export function smoothNormals(pos, idx) {
  const { remap } = weldPositions(pos, 1e-6);
  const nW = Math.max(...remap) + 1, acc = new Float32Array(nW * 3);
  const a = V(), b = V(), c = V(), e1 = V(), e2 = V();
  for (let t = 0; t < idx.length; t += 3) {
    a.fromArray(pos, idx[t] * 3); b.fromArray(pos, idx[t + 1] * 3); c.fromArray(pos, idx[t + 2] * 3);
    const nrm = e1.subVectors(b, a).cross(e2.subVectors(c, a));
    for (const v of [idx[t], idx[t + 1], idx[t + 2]]) { const w = remap[v]; acc[w * 3] += nrm.x; acc[w * 3 + 1] += nrm.y; acc[w * 3 + 2] += nrm.z; }
  }
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length / 3; i++) { const w = remap[i]; const v = V(acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]).normalize(); v.toArray(out, i * 3); }
  return out;
}
// keeps the n largest weights of a { joint: weight } map, normalised, as 4 indices + 4 weights
export function top4(wmap) {
  const e = Object.entries(wmap).filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const s = e.reduce((a, [, w]) => a + w, 0) || 1;
  const J = [0, 0, 0, 0], W = [0, 0, 0, 0];
  e.forEach(([j, w], k) => { J[k] = +j; W[k] = w / s; });
  return { J, W };
}

// ---------- the tentacle source ----------
// "Tentacle (rigged)" by CG Daniel Glebinski: a straight even tube with two rows of suckers, bent in Blender along a path;
// the GLB has no skin, only 200 morph targets baked from that path, the first of which is the tentacle laid out straight
// and tapered. Returns that shape straightened onto the Y axis from `base` (the root) to `top` (the tip), the suckers
// facing +Z, the radius times thick(s) (s 0 root .. 1 tip), welded and thinned to about `tris` triangles:
// { pos, idx, s (per vertex), suck (0..1, how much a vertex is sucker rim or cup) }
export async function straightTentacle(path, { base, top, thick = () => 1, tris, suckWeight = 0.04, log = true }) {
  await MeshoptSimplifier.ready;
  const src = await load(path), R = src.getRoot();
  const node = R.listNodes().find((n) => n.getName() === 'sketchfab.temp_0');
  const prim = node.getMesh().listPrimitives()[0];
  const M = worlds(src, locals(src, null, 0)).get(node);
  const Pa = prim.getAttribute('POSITION'), T0 = prim.listTargets()[0].getAttribute('POSITION');
  const nv = Pa.getCount(), e = [], f = [], rest = [], def = [];
  for (let i = 0; i < nv; i++) {
    Pa.getElement(i, e); T0.getElement(i, f);
    rest.push(V(...e).applyMatrix4(M));
    def.push(V(e[0] + f[0], e[1] + f[1], e[2] + f[2]).applyMatrix4(M));
  }
  // the suckers: in the source's rest tube (axis on y, radius 0.028) they are the cups and rims on the +X side
  const sucker = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const p = rest[i], a = Math.abs(Math.atan2(p.z, p.x)), r = Math.hypot(p.x, p.z);
    sucker[i] = (1 - smooth((a - 0.95) / 0.25)) * smooth((Math.abs(r - 0.0285) - 0.0015) / 0.004);
  }
  // the morph target's centre line (rings of equal rest height), so the shape can be straightened onto the axis
  const y0 = Math.min(...rest.map((p) => p.y)), y1 = Math.max(...rest.map((p) => p.y));
  const NS = 40, cen = [], cnt = new Array(NS + 1).fill(0);
  for (let k = 0; k <= NS; k++) cen.push(V());
  for (let i = 0; i < nv; i++) { const k = Math.round(((rest[i].y - y0) / (y1 - y0)) * NS); cen[k].add(def[i]); cnt[k]++; }
  cen.forEach((c, k) => c.multiplyScalar(1 / Math.max(1, cnt[k])));
  const centreAt = (ry) => { const x = ((ry - y0) / (y1 - y0)) * NS, k = Math.min(NS - 1, Math.max(0, Math.floor(x))); return cen[k].clone().lerp(cen[k + 1], clamp(x - k)); };
  const sOf = (i) => (rest[i].y - y0) / (y1 - y0);
  const len0 = cen[NS].distanceTo(cen[0]);
  // which way the suckers face once straightened (turned to +Z)
  const sd = V();
  for (let i = 0; i < nv; i++) if (sucker[i] > 0.5) { const c = centreAt(rest[i].y); sd.add(V(def[i].x - c.x, 0, def[i].z - c.z)); }
  const turn = Math.atan2(sd.x, sd.z), qTurn = Qa(Y, -turn / deg);
  const scale = (top - base) / len0;
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    const s = sOf(i), c = centreAt(rest[i].y);
    const rad = V(def[i].x - c.x, 0, def[i].z - c.z).applyQuaternion(qTurn).multiplyScalar(scale * thick(s));
    const y = base + s * (top - base) + (def[i].y - c.y) * scale; // (the tip cap rounds past its ring's centre)
    pos[i * 3] = rad.x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = rad.z;
  }
  // weld, then thin (the suckers' outline weighted, so the rows keep their rims)
  const W0 = weldPositions(Array.from(pos), 1e-5), nW = W0.pos.length / 3;
  const suckW = new Float32Array(nW), sW = new Float32Array(nW);
  for (let i = 0; i < nv; i++) { suckW[W0.remap[i]] = Math.max(suckW[W0.remap[i]], sucker[i]); sW[W0.remap[i]] = sOf(i); }
  const srcIdx = prim.getIndices().getArray(), idx0 = new Uint32Array(srcIdx.length);
  for (let k = 0; k < srcIdx.length; k++) idx0[k] = W0.remap[srcIdx[k]];
  const wpos = new Float32Array(W0.pos);
  const [simp, err] = MeshoptSimplifier.simplifyWithAttributes(idx0, wpos, 3, suckW, 1, [suckWeight], null, tris * 3, 0.05, []);
  const used = new Map(), P = [], S = [], C = [], idx = new Uint32Array(simp.length);
  for (let k = 0; k < simp.length; k++) {
    const o = simp[k]; let j = used.get(o);
    if (j === undefined) { j = used.size; used.set(o, j); P.push(wpos[o * 3], wpos[o * 3 + 1], wpos[o * 3 + 2]); S.push(sW[o]); C.push(suckW[o]); }
    idx[k] = j;
  }
  if (log) console.log(`tentacle source: ${nv} verts ${srcIdx.length / 3} tris, length ${len0.toFixed(3)} x ${scale.toFixed(2)}, suckers turned ${(turn / deg).toFixed(1)} deg; thinned to ${simp.length / 3} tris, ${P.length / 3} verts (error ${err.toFixed(4)})`);
  return { pos: P, idx, s: S, suck: C };
}
