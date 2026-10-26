// Shared helpers: FK on gltf-transform documents, clip sampling, writing baked clips.
import * as THREE from 'three';
export { THREE };

export function sample(ch, t) {
  const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), q = ch.getTargetPath() === 'rotation';
  let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++;
  const j = Math.min(i + 1, inp.length - 1), t0 = inp[i], t1 = inp[j], f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
  if (q) return new THREE.Quaternion().fromArray(out, i * 4).slerp(new THREE.Quaternion().fromArray(out, j * 4), f);
  return new THREE.Vector3().fromArray(out, i * 3).lerp(new THREE.Vector3().fromArray(out, j * 3), f);
}
// world transforms of every node of the default scene at time t of anim (null = rest)
export function pose(doc, anim, t) {
  const loc = new Map();
  for (const n of doc.getRoot().listNodes()) loc.set(n, { p: new THREE.Vector3().fromArray(n.getTranslation()), q: new THREE.Quaternion().fromArray(n.getRotation()), s: new THREE.Vector3().fromArray(n.getScale()) });
  if (anim) for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode(), path = ch.getTargetPath(); if (!n || !loc.has(n)) continue;
    if (path === 'rotation') loc.get(n).q.copy(sample(ch, t)); else if (path === 'translation') loc.get(n).p.copy(sample(ch, t));
  }
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
export const duration = (anim) => { let d = 0; for (const s of anim.listSamplers()) d = Math.max(d, s.getInput().getMax([])[0]); return d; };

// writes a clip: frames[i] = Map(boneName -> {q: Quaternion local, p?: Vector3 local}); times = i / fps
export function writeClip(doc, name, frames, fps, joints, transBones) {
  const root = doc.getRoot(), buf = root.listBuffers()[0];
  const n = frames.length, times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = i / fps;
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf);
  const anim = doc.createAnimation(name);
  for (const [bn, node] of joints) {
    if (!frames[0].has(bn)) continue;
    const qa = new Float32Array(n * 4); let prev = null;
    for (let i = 0; i < n; i++) {
      const q = frames[i].get(bn).q.clone().normalize();
      if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); // hemisphere continuity
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
