// Clip authoring on retargeted frames: keyed poses, layering, world-space bends, planted feet, grounding, timing.
import { THREE, FPS, cloneFrame, blendFrame, smooth, mpos, mrot, qAxis, shiftHip } from './lib.mjs';

// frames from pose keys [[time, frame, easeIn?], ...]; smoothstep between keys
export function keyed(keys, dur = keys[keys.length - 1][0]) {
  const n = Math.round(dur * FPS) + 1, out = [];
  for (let i = 0; i < n; i++) {
    const t = i / FPS; let k = 1; while (k < keys.length - 1 && t > keys[k][0]) k++;
    const [t0, a] = keys[k - 1], [t1, b, e = 'smooth'] = keys[k];
    let w = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 1;
    w = e === 'linear' ? w : e === 'in' ? w * w : e === 'out' ? 1 - (1 - w) * (1 - w) : e === 'snap' ? 1 - Math.pow(1 - w, 3) : smooth(w);
    out.push(blendFrame(a, b, w));
  }
  return out;
}
// per-bone layer: frames take `over` rotations for the listed bones with weight w (number or fn(i, bone))
export function layer(base, over, bones, w = 1) {
  return base.map((f, i) => {
    const o = cloneFrame(f), g = typeof over === 'function' ? over(i) : over[Math.min(i, over.length - 1)];
    for (const b of bones) { const ww = typeof w === 'function' ? w(i, b) : w; if (ww > 0) o.get(b).q.slerp(g.get(b).q, ww); }
    return o;
  });
}
// exaggerate every bone's rotation away from a reference frame by k (k=1 unchanged)
export function amplify(frames, ref, k, bones) {
  return frames.map((f) => { const o = cloneFrame(f); for (const b of bones || [...f.keys()]) { const r = ref.get(b).q, q = o.get(b).q; const d = r.clone().invert().multiply(q); const id = new THREE.Quaternion(); o.get(b).q.copy(r.clone().multiply(id.slerp(d, k))); } return o; });
}
// average pose (slerp-accumulated) of a frame list
export function meanFrame(frames) {
  const o = cloneFrame(frames[0]);
  for (let i = 1; i < frames.length; i++) for (const [b, v] of o) { v.q.slerp(frames[i].get(b).q, 1 / (i + 1)); v.p.lerp(frames[i].get(b).p, 1 / (i + 1)); }
  return o;
}
// reduce motion amplitude of bones towards their mean over the clip
export function damp(frames, bones, k) {
  const m = meanFrame(frames);
  return frames.map((f) => { const o = cloneFrame(f); for (const b of bones) o.get(b).q.copy(m.get(b).q.clone().slerp(f.get(b).q, k)); return o; });
}
// world-space rotation about a world axis applied to bones (each gets ang(i) * share), children follow
export function bend(rig, frames, parts, axis, angFn) {
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i], a = angFn(i);
    if (!a) continue;
    for (const [b, share] of parts) rig.rotateWorld(f, b, qAxis(axis[0], axis[1], axis[2], a * share));
  }
}
// keep the feet where they are in `ref` frames (world matrices) while the body moves: two-bone IK per frame
export function plant(rig, frames, ref, w = () => 1) {
  for (let i = 0; i < frames.length; i++) {
    const W = rig.fk(ref[i] || ref[ref.length - 1]);
    const tg = {};
    for (const s of ['l', 'r']) {
      const ww = typeof w === 'function' ? w(i, s) : w; if (ww <= 0) continue;
      const cur = rig.fk(frames[i]).get('foot_' + s);
      const want = W.get('foot_' + s);
      const p = mpos(cur).lerp(mpos(want), ww), q = mrot(cur).slerp(mrot(want), ww);
      tg[s] = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
    }
    rig.legIK(frames[i], tg);
  }
}
// grounding with the soles (body vertices weighted to the feet): 'const' | 'stance' (per frame, smoothed) | 'lift' (only up)
export function soleList(rig) {
  const fj = new Set(rig.jointList.map((j, i) => (/^(foot|ball)_[lr]$/.test(j.getName()) ? i : -1)).filter((i) => i >= 0));
  return rig.VERTS.filter((v) => /human|base|body/i.test(v.mesh) && [0, 1, 2, 3].some((k) => v.w[k] > 0.5 && fj.has(v.j[k])));
}
export function ground(T, rig, frames, mode = 'const', list) {
  const ys = frames.map((f) => rig.minY(f, list));
  if (mode === 'const') { const m = Math.min(...ys); frames.forEach((f) => shiftHip(T, f, new THREE.Vector3(0, -m, 0))); return { min: +m.toFixed(3), range: +(Math.max(...ys) - m).toFixed(3) }; }
  if (mode === 'first') { const m = ys[0]; frames.forEach((f) => shiftHip(T, f, new THREE.Vector3(0, -m, 0))); return { first: +m.toFixed(3), min: +(Math.min(...ys) - m).toFixed(3) }; }
  if (mode === 'stance') {
    const P = ys.length - 1;
    const sm = ys.map((_, i) => { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const j = (((i + k) % P) + P) % P; s += ys[j]; c++; } return s / c; });
    frames.forEach((f, i) => shiftHip(T, f, new THREE.Vector3(0, -sm[i], 0)));
    return { min: +Math.min(...ys).toFixed(3), max: +Math.max(...ys).toFixed(3) };
  }
  if (mode === 'perframe') {
    const sm = ys.map((_, i) => { let s = 0, c = 0; for (let k = -1; k <= 1; k++) { const j = Math.min(ys.length - 1, Math.max(0, i + k)); s += ys[j]; c++; } return s / c; });
    frames.forEach((f, i) => shiftHip(T, f, new THREE.Vector3(0, -sm[i], 0)));
    return { min: +Math.min(...ys).toFixed(3), max: +Math.max(...ys).toFixed(3) };
  }
  if (mode === 'lift') {
    // first frame on the ground, later frames never below it (bodies lying down)
    const base = ys[0];
    const L = ys.map((y) => Math.max(0, base - y));
    const sm = L.map((_, i) => { let m = 0; for (let k = -3; k <= 3; k++) m = Math.max(m, L[Math.min(L.length - 1, Math.max(0, i + k))]); return m; });
    frames.forEach((f, i) => shiftHip(T, f, new THREE.Vector3(0, sm[i] - base, 0)));
    return { base: +base.toFixed(3) };
  }
}
// ground speed a locomotion loop is authored for: speed of planted sole points sliding backwards (in place)
export function footSpeed(rig, frames, list) {
  const v = [];
  const S = frames.map((f) => rig.skinned(f, list));
  const lo = S.map((ps) => Math.min(...ps.map((p) => p.y)));
  // split the sole list by side using x at rest
  const sides = { l: list.map((s, i) => (s.p.x > 0 ? i : -1)).filter((i) => i >= 0), r: list.map((s, i) => (s.p.x <= 0 ? i : -1)).filter((i) => i >= 0) };
  for (const s of ['l', 'r']) {
    const idx = sides[s];
    const ly = S.map((ps) => Math.min(...idx.map((i) => ps[i].y))), cz = S.map((ps) => idx.reduce((a, i) => a + ps[i].z, 0) / idx.length);
    for (let i = 1; i < frames.length; i++) if (ly[i] < lo[i] + 0.02 && ly[i - 1] < lo[i - 1] + 0.02) v.push((cz[i - 1] - cz[i]) * FPS);
  }
  v.sort((a, b) => a - b);
  return { median: v.length ? v[Math.floor(v.length / 2)] : 0, n: v.length };
}
// world matrix of a grip (hand bone * grip local)
export function gripWorld(rig, f, grip) {
  return rig.fk(f).get(grip.hand).clone().multiply(new THREE.Matrix4().compose(grip.p, grip.q, new THREE.Vector3(1, 1, 1)));
}
export function tipTrack(rig, frames, grip, along = 0.5, axis = 'y') {
  return frames.map((f) => (axis === 'y' ? new THREE.Vector3(0, along, 0) : new THREE.Vector3(0, 0, along)).applyMatrix4(gripWorld(rig, f, grip)));
}
export function speeds(track) { return track.map((t, i) => (i ? t.distanceTo(track[i - 1]) * FPS : 0)); }
export const argmax = (a, from = 0, to = a.length) => { let b = from; for (let i = from; i < to; i++) if (a[i] > a[b]) b = i; return b; };

// finger curl offsets (bone-frame rotations computed at rest): curl(frame, side, k) closes the hand k (0..1)
export function makeCurl(T, handFrame) {
  const RT = T.RT, off = {};
  for (const s of ['l', 'r']) {
    const f = handFrame(RT, s), axis = f.dir.clone().cross(f.palm).normalize();
    off[s] = [];
    const ang = { index: [1.2, 1.4, 0.9], middle: [1.3, 1.45, 0.9], ring: [1.35, 1.45, 0.9], pinky: [1.4, 1.4, 0.9], thumb: [0.35, 0.5, 0.45] };
    for (const fin of Object.keys(ang)) for (let j = 1; j <= 3; j++) {
      const n = `${fin}_0${j}_${s}`; if (!RT.has(n)) continue;
      const Wq = RT.get(n).wq.clone();
      // thumb bends across the palm, fingers fold towards it
      const ax = fin === 'thumb' ? f.dir.clone().multiplyScalar(s === 'l' ? -1 : 1).add(axis).normalize() : axis;
      off[s].push([n, ang[fin][j - 1], Wq.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(ax, 1)).multiply(Wq), ax, Wq]);
    }
  }
  return (frame, s, k) => {
    for (const [n, a, , ax, Wq] of off[s]) {
      const R = new THREE.Quaternion().setFromAxisAngle(ax, a * k);
      frame.get(n).q.multiply(Wq.clone().invert().multiply(R).multiply(Wq));
    }
  };
}
