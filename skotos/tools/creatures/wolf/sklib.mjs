// FK on gltf-transform documents + world-space retargeting onto the skeleton's UE-style rig.
import * as THREE from 'three';
export { THREE };

export function sample(ch, t) {
  const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), q = ch.getTargetPath() === 'rotation';
  let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++;
  const j = Math.min(i + 1, inp.length - 1), t0 = inp[i], t1 = inp[j];
  const f = s.getInterpolation() === 'STEP' ? 0 : (t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0);
  const stride = s.getInterpolation() === 'CUBICSPLINE' ? 3 : 1, off = s.getInterpolation() === 'CUBICSPLINE' ? 1 : 0;
  if (q) return new THREE.Quaternion().fromArray(out, (i * stride + off) * 4).slerp(new THREE.Quaternion().fromArray(out, (j * stride + off) * 4), f);
  return new THREE.Vector3().fromArray(out, (i * stride + off) * 3).lerp(new THREE.Vector3().fromArray(out, (j * stride + off) * 3), f);
}
export const duration = (anim) => { let d = 0; for (const s of anim.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); return d; };

// world transforms of every node of the default scene at time t of anim (null = rest)
export function pose(doc, anim, t, override) {
  const loc = new Map();
  for (const n of doc.getRoot().listNodes()) loc.set(n, { p: new THREE.Vector3().fromArray(n.getTranslation()), q: new THREE.Quaternion().fromArray(n.getRotation()), s: new THREE.Vector3().fromArray(n.getScale()) });
  if (anim) for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode(), path = ch.getTargetPath(); if (!n || !loc.has(n)) continue;
    if (path === 'rotation') loc.get(n).q.copy(sample(ch, t)); else if (path === 'translation') loc.get(n).p.copy(sample(ch, t));
    else if (path === 'scale') loc.get(n).s.copy(sample(ch, t));
  }
  if (override) for (const n of doc.getRoot().listNodes()) { const o = override.get(n.getName()); if (o) { if (o.q) loc.get(n).q.copy(o.q); if (o.p) loc.get(n).p.copy(o.p); } }
  const out = new Map();
  const visit = (n, pm) => {
    const l = loc.get(n), m = new THREE.Matrix4().compose(l.p, l.q, l.s), w = pm ? pm.clone().multiply(m) : m;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3(); w.decompose(wp, wq, ws);
    out.set(n.getName(), { node: n, local: l, world: w, wp, wq, parentWorld: pm || new THREE.Matrix4() });
    for (const c of n.listChildren()) visit(c, w);
  };
  for (const n of doc.getRoot().getDefaultScene().listChildren()) visit(n, null);
  return out;
}

// target rig description
export function makeTarget(doc) {
  const RT = pose(doc, null, 0);
  const joints = new Set(doc.getRoot().listSkins()[0].listJoints());
  const order = [], parentOf = new Map();
  const walk = (n) => { order.push(n); for (const c of n.listChildren()) { parentOf.set(c, n); walk(c); } };
  for (const n of doc.getRoot().getDefaultScene().listChildren()) walk(n);
  const bones = order.filter((n) => joints.has(n));
  const names = bones.map((n) => n.getName());
  const parentName = new Map(bones.map((n) => [n.getName(), joints.has(parentOf.get(n)) ? parentOf.get(n).getName() : null]));
  return { doc, RT, bones, names, parentName, hip: RT.get('pelvis').wp.y };
}

// source rig: spec.map = target bone -> source bone | [a, b, w] (slerp of the two world deltas); spec.pelvis = source hip bone
export function makeSource(doc, spec) {
  const RS = pose(doc, null, 0);
  return { doc, spec, RS, hip: RS.get(spec.pelvis).wp.y };
}

// frames[i] = Map(target bone -> { q: local quaternion, p: local position })
// opts: from/to seconds, fps, hipScale (Vector3 multiplier of the hip offset), post(frameIndex, worldDeltas) hooks
export function retarget(T, S, anim, opts = {}) {
  const fps = opts.fps || 30, dur = duration(anim);
  const t0 = opts.from ?? 0, t1 = Math.min(opts.to ?? dur, dur);
  const n = Math.max(2, Math.round((t1 - t0) * fps) + 1), frames = [];
  const k = T.hip / S.hip, map = S.spec.map, RS = S.RS, RT = T.RT;
  for (let f = 0; f < n; f++) {
    const t = Math.min(t1, t0 + f / fps);
    const P = pose(S.doc, anim, t);
    const delta = (b) => P.get(b).wq.clone().multiply(RS.get(b).wq.clone().invert());
    const W = new Map(), out = new Map();
    for (const name of T.names) {
      const pn = T.parentName.get(name);
      const Wp = pn ? W.get(pn) : RT.get(name).parentWorld.clone();
      const WpQ = new THREE.Quaternion(); Wp.decompose(new THREE.Vector3(), WpQ, new THREE.Vector3());
      const s = map[name];
      let Wq;
      if (s) {
        const dq = Array.isArray(s) ? delta(s[0]).slerp(delta(s[1]), s[2]) : delta(s);
        if (opts.adjust && opts.adjust[name]) opts.adjust[name](dq, W, f / (n - 1));
        Wq = dq.multiply(RT.get(name).wq);
      } else Wq = WpQ.clone().multiply(RT.get(name).local.q);
      let Wpos;
      if (name === 'pelvis') {
        const d = P.get(S.spec.pelvis).wp.clone().sub(RS.get(S.spec.pelvis).wp).multiplyScalar(k);
        if (opts.hipScale) d.multiply(opts.hipScale);
        Wpos = RT.get(name).wp.clone().add(d);
      } else Wpos = RT.get(name).local.p.clone().applyMatrix4(Wp);
      const Wm = new THREE.Matrix4().compose(Wpos, Wq, new THREE.Vector3(1, 1, 1));
      W.set(name, Wm);
      const L = Wp.clone().invert().multiply(Wm);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(); L.decompose(p, q, new THREE.Vector3());
      out.set(name, { q: q.normalize(), p: name === 'pelvis' ? p : RT.get(name).local.p.clone() });
    }
    frames.push(out);
  }
  return frames;
}

// world matrices of the target bones for one frame
export function fk(T, frame) {
  const W = new Map();
  for (const name of T.names) {
    const pn = T.parentName.get(name), { q, p } = frame.get(name);
    const L = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
    W.set(name, (pn ? W.get(pn) : T.RT.get(name).parentWorld).clone().multiply(L));
  }
  return W;
}
// local rotation for a bone whose world rotation should be Wq, given the frame's parent world
export function localFromWorld(T, W, name, Wq) {
  const pn = T.parentName.get(name);
  const pw = pn ? W.get(pn) : T.RT.get(name).parentWorld;
  const pq = new THREE.Quaternion(); pw.decompose(new THREE.Vector3(), pq, new THREE.Vector3());
  return pq.invert().multiply(Wq);
}

// writes a clip: rotation tracks for every bone in the frames, translation for the hip
export function writeClip(doc, name, frames, fps, transBones = ['pelvis']) {
  const root = doc.getRoot(), buf = root.listBuffers()[0];
  const joints = new Map(root.listSkins()[0].listJoints().map((j) => [j.getName(), j]));
  const n = frames.length, times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = i / fps;
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  for (const [bn, node] of joints) {
    if (!frames[0].has(bn)) continue;
    const qa = new Float32Array(n * 4); let prev = null;
    for (let i = 0; i < n; i++) {
      const q = frames[i].get(bn).q.clone().normalize();
      if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      q.toArray(qa, i * 4); prev = q;
    }
    const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType('VEC4').setArray(qa).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(s));
    if (transBones.includes(bn)) {
      const pa = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) frames[i].get(bn).p.toArray(pa, i * 3);
      const s2 = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType('VEC3').setArray(pa).setBuffer(buf)).setInterpolation('LINEAR');
      anim.addSampler(s2).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(s2));
    }
  }
  return anim;
}
