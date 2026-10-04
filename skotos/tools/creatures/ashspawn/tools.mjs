// Frame-list tools (shared with the troll build): FK, CPU skinning probes, grounding, loop closing, time warps, leg IK.
import { THREE } from './lib.mjs';
export const smooth = (w) => w * w * (3 - 2 * w);
export const ease = (t, a, b) => smooth(Math.min(1, Math.max(0, (t - a) / (b - a))));
export const qAxis = (x, y, z, ang) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z).normalize(), ang);
export const _p = (m) => new THREE.Vector3().setFromMatrixPosition(m);
export const _q = (m) => { const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
export const cloneFrame = (f) => new Map([...f].map(([k, v]) => [k, { q: v.q.clone(), p: v.p.clone() }]));
export function blendFrame(a, b, w) {
  const o = new Map();
  for (const [k, v] of a) { const u = b.get(k); o.set(k, { q: v.q.clone().slerp(u.q, w), p: v.p.clone().lerp(u.p, w) }); }
  return o;
}
export function concat(a, b, n) {
  const out = a.slice(0, a.length - n).map(cloneFrame);
  for (let i = 0; i < n; i++) { const w = (i + 1) / (n + 1); out.push(blendFrame(a[a.length - n + i], b[i], smooth(w))); }
  for (let i = n; i < b.length; i++) out.push(cloneFrame(b[i]));
  return out;
}

export function makeTools(doc, T, FPS, grips) {
  const root = doc.getRoot(), skin = root.listSkins()[0], jointList = skin.listJoints();
  const order = T.bones.map((n) => n.getName());
  const parentName = new Map(T.bones.map((n) => [n.getName(), T.joints.has(T.parentOf.get(n)) ? T.parentOf.get(n).getName() : null]));
  const rootW = T.RT.get('hips').parentWorld.clone();
  function fk(f) {
    const W = new Map();
    for (const b of order) {
      const { q, p } = f.get(b);
      const L = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
      const pn = parentName.get(b);
      W.set(b, pn ? W.get(pn).clone().multiply(L) : rootW.clone().multiply(L));
    }
    return W;
  }
  const gripWorld = (W, sd) => W.get('hand_' + sd).clone().multiply(new THREE.Matrix4().compose(grips[sd].p, grips[sd].q, new THREE.Vector3(1, 1, 1)));
  const ibm = skin.getInverseBindMatrices().getArray();
  const IBM = jointList.map((_, i) => new THREE.Matrix4().fromArray(ibm, i * 16));
  const VERTS = [];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
      for (let i = 0; i < P.getCount(); i++) VERTS.push({ p: new THREE.Vector3().fromArray(P.getElement(i, [])), j: J.getElement(i, []), w: Wt.getElement(i, []) });
    }
  }
  const mats = (f) => { const W = fk(f); return jointList.map((j, i) => W.get(j.getName()).clone().multiply(IBM[i])); };
  function skinned(f, list = VERTS) {
    const M = mats(f);
    return list.map((v) => { const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (v.w[k]) o.addScaledVector(v.p.clone().applyMatrix4(M[v.j[k]]), v.w[k]); return o; });
  }
  function minY(f) {
    const M = mats(f).map((m) => m.elements); let mn = 1e9;
    for (const v of VERTS) {
      let y = 0;
      for (let k = 0; k < 4; k++) { const w = v.w[k]; if (!w) continue; const e = M[v.j[k]]; y += w * (e[1] * v.p.x + e[5] * v.p.y + e[9] * v.p.z + e[13]); }
      if (y < mn) mn = y;
    }
    return mn;
  }
  function maxY(f) {
    const M = mats(f).map((m) => m.elements); let mx = -1e9;
    for (const v of VERTS) {
      let y = 0;
      for (let k = 0; k < 4; k++) { const w = v.w[k]; if (!w) continue; const e = M[v.j[k]]; y += w * (e[1] * v.p.x + e[5] * v.p.y + e[9] * v.p.z + e[13]); }
      if (y > mx) mx = y;
    }
    return mx;
  }
  const rest = T.RT.get('hips').local.p;
  function hips(frames, { keepXZ = 0, loop = false } = {}) {
    const p0 = frames[0].get('hips').p.clone(), pN = frames[frames.length - 1].get('hips').p.clone(), n = frames.length;
    frames.forEach((f, i) => {
      const p = f.get('hips').p;
      if (loop) { const t = i / (n - 1); p.x -= (pN.x - p0.x) * t; p.z -= (pN.z - p0.z) * t; }
      p.x = rest.x + (p.x - rest.x) * (loop ? 1 : keepXZ); p.z = rest.z + (p.z - rest.z) * (loop ? 1 : keepXZ);
    });
  }
  function ground(frames, mode) {
    const ys = frames.map(minY);
    if (mode === 'const') { const m = Math.min(...ys); frames.forEach((f) => (f.get('hips').p.y -= m)); return { min: +m.toFixed(3), range: +(Math.max(...ys) - m).toFixed(3) }; }
    if (mode === 'stance') {
      const P = ys.length - 1;
      const sm = ys.map((_, i) => { let s = 0, c = 0; for (let k = -2; k <= 2; k++) { const j = (((i + k) % P) + P) % P; s += ys[j]; c++; } return s / c; });
      frames.forEach((f, i) => (f.get('hips').p.y -= sm[i]));
      return { min: +Math.min(...ys).toFixed(3), max: +Math.max(...ys).toFixed(3) };
    }
    if (mode === 'lift') {
      const L = ys.map((y) => Math.max(-y, 0));
      const sm = L.map((_, i) => { let m = 0; for (let k = -4; k <= 4; k++) { const j = Math.min(L.length - 1, Math.max(0, i + k)); m = Math.max(m, L[j]); } return m; });
      // before the body touches down keep the feet planted (shift down by the first-frame offset)
      const y0 = ys[0];
      frames.forEach((f, i) => (f.get('hips').p.y += sm[i] + 0.005 - (sm[i] > 0 ? 0 : 0) - (i === 0 ? 0 : 0)));
      return { minBefore: +Math.min(...ys).toFixed(3), y0: +y0.toFixed(3) };
    }
  }
  const SOLE = { L: [], R: [] };
  VERTS.forEach((v) => {
    if (v.p.y > 0.05) return;
    const names = [0, 1, 2, 3].filter((k) => v.w[k] > 0.5).map((k) => jointList[v.j[k]].getName());
    for (const sd of ['L', 'R']) if (names.some((n) => n === 'foot_' + sd || n === 'toe_' + sd)) SOLE[sd].push(v);
  });
  function footSpeed(frames, thr = 0.02) {
    const v = [];
    for (const sd of ['L', 'R']) {
      const S = frames.map((f) => skinned(f, SOLE[sd]));
      const lo = S.map((ps) => Math.min(...ps.map((p) => p.y)));
      const cz = S.map((ps) => ps.reduce((a, p) => a + p.z, 0) / ps.length);
      const m = Math.min(...lo);   // contact = sole within thr of its lowest height in the cycle
      for (let i = 1; i < frames.length; i++) if (lo[i] < m + thr && lo[i - 1] < m + thr) v.push((cz[i - 1] - cz[i]) * FPS);
    }
    v.sort((a, b) => a - b);
    return { median: v.length ? v[Math.floor(v.length / 2)] : 0, n: v.length };
  }
  function legIK(f, targets) {
    for (const sd of ['L', 'R']) {
      const tg = targets[sd]; if (!tg) continue;
      const W = fk(f);
      const A = _p(W.get('thigh_' + sd)), B = _p(W.get('shin_' + sd)), C = _p(W.get('foot_' + sd)), Tp = _p(tg);
      const l1 = B.distanceTo(A), l2 = C.distanceTo(B);
      const dv = Tp.clone().sub(A), dl = dv.length(), dir = dv.clone().normalize();
      const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, dl));
      const pole = B.clone().sub(A).projectOnPlane(dir).normalize();
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const B2 = A.clone().addScaledVector(dir, a).addScaledVector(pole, h);
      const q1 = new THREE.Quaternion().setFromUnitVectors(B.clone().sub(A).normalize(), B2.clone().sub(A).normalize());
      const thighW = q1.clone().multiply(_q(W.get('thigh_' + sd)));
      f.get('thigh_' + sd).q.copy(_q(W.get('hips')).invert().multiply(thighW));
      const cdir = C.clone().sub(B).applyQuaternion(q1).normalize();
      const q2 = new THREE.Quaternion().setFromUnitVectors(cdir, Tp.clone().sub(B2).normalize());
      const calfW = q2.clone().multiply(q1).multiply(_q(W.get('shin_' + sd)));
      f.get('shin_' + sd).q.copy(thighW.clone().invert().multiply(calfW));
      f.get('foot_' + sd).q.copy(calfW.clone().invert().multiply(_q(tg)));
    }
  }
  // world-space rotation R applied to bone b (about its own joint), children follow
  function rotWorld(f, b, R) {
    const W = fk(f); const pn = parentName.get(b);
    const Pq = pn ? _q(W.get(pn)) : _q(rootW);
    const Wq = _q(W.get(b));
    f.get(b).q.copy(Pq.clone().invert().multiply(R.clone().multiply(Wq)));
  }
  function timewarp(frames, map) {
    const dur = map[map.length - 1][1], n = Math.round(dur * FPS) + 1, out = [];
    for (let i = 0; i < n; i++) {
      const t = i / FPS; let k = 1; while (k < map.length - 1 && t > map[k][1]) k++;
      const [s0, d0] = map[k - 1], [s1, d1] = map[k];
      const st = s0 + (s1 - s0) * Math.min(1, Math.max(0, (t - d0) / (d1 - d0)));
      const x = Math.min(frames.length - 1.0001, st * FPS), j = Math.min(frames.length - 2, Math.floor(x));
      out.push(blendFrame(frames[j], frames[j + 1], Math.min(1, x - j)));
    }
    return out;
  }
  // uniform resample to a new duration (keeps first and last frame exact: for loops)
  function resample(frames, newDur) {
    const n = Math.round(newDur * FPS) + 1, out = [], m = frames.length - 1;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * m, j = Math.min(m - 1, Math.floor(x)); out.push(blendFrame(frames[j], frames[j + 1], x - j)); }
    return out;
  }
  function closeLoop(frames) {
    const n = frames.length, f0 = frames[0], fl = frames[n - 1];
    for (const b of f0.keys()) {
      const D = fl.get(b).q.clone().invert().multiply(f0.get(b).q), dp = f0.get(b).p.clone().sub(fl.get(b).p);
      frames.forEach((f, i) => { const t = i / (n - 1); f.get(b).q.multiply(new THREE.Quaternion().slerp(D, t)); if (b === 'hips') f.get(b).p.addScaledVector(dp, t); });
    }
  }

  // foot locking for in-place loops: each foot's stance runs from touch-down to its most backward point; during it
  // the ankle slides straight back at one constant speed (the speed the cycle is authored for). After toe-off the
  // foot is lifted clear instead of dragging forward on its toes. Knees re-solved by IK. Returns the speed in m/s.
  function lockFeet(frames, { contact = 0.05, ramp = 2, lift = 0.035 } = {}) {
    const N = frames.length - 1, cyc = (i) => ((i % N) + N) % N;
    const per = {};
    for (const sd of ['L', 'R']) {
      const lo = frames.map((f) => Math.min(...skinned(f, SOLE[sd]).map((p) => p.y)));
      const M = frames.map((f) => fk(f).get('foot_' + sd).clone()), A = M.map(_p);
      let iTo = 0; for (let i = 0; i < N; i++) if (A[i].z < A[iTo].z) iTo = i;
      let k = 0; while (k < N - 1 && lo[cyc(iTo - k - 1)] < contact) k++;
      const iSt = iTo - k;     // may be negative (wraps)
      per[sd] = { lo, M, A, iSt, iTo, v: (A[cyc(iSt)].z - A[iTo].z) / (k / FPS), k };
      if (process.env.DEBUG_LOCK) console.error(sd, lo.map((y, i) => i + ':' + y.toFixed(2) + '/' + A[i].z.toFixed(2) + '/' + A[i].y.toFixed(2)).join(' '));
    }
    const v = (per.L.v + per.R.v) / 2;
    const tg = frames.map(() => ({}));
    for (const sd of ['L', 'R']) {
      const { lo, M, A, iSt, iTo, k } = per[sd];
      const pm = new THREE.Vector3(); for (let j = iSt; j <= iTo; j++) pm.add(A[cyc(j)]); pm.multiplyScalar(1 / (k + 1));
      const mid = (iSt + iTo) / 2;
      for (let j = iSt - ramp; j <= iTo + 10; j++) {
        const fi = cyc(j), p = A[fi], q = _q(M[fi]);
        let target;
        if (j <= iTo) {
          const w = j < iSt ? smooth((j - (iSt - ramp - 1)) / (ramp + 1)) : 1;
          target = p.clone().lerp(new THREE.Vector3(pm.x, p.y, pm.z - v * (j - mid) / FPS), w);
        } else {
          // after toe-off: keep the stance end x/z for a frame or two blended out, raise the foot clear of the ground
          const n = j - iTo, w = smooth(Math.max(0, 1 - n / (ramp + 2)));
          const end = new THREE.Vector3(pm.x, A[iTo].y, pm.z - v * (iTo - mid) / FPS);
          target = p.clone().lerp(end, w);
          const need = Math.min(0.14, lift * n) - lo[fi];       // sole height wanted vs natural
          if (need <= 0 && w < 0.01) break;
          if (need > 0) target.y += need;
        }
        tg[fi][sd] = new THREE.Matrix4().compose(target, q, new THREE.Vector3(1, 1, 1));
      }
    }
    for (let i = 0; i < N; i++) legIK(frames[i], tg[i]);
    for (const [bn, x] of frames[0]) { frames[N].get(bn).q.copy(x.q); frames[N].get(bn).p.copy(x.p); }
    return { v, L: [per.L.iSt, per.L.iTo, +per.L.v.toFixed(2)], R: [per.R.iSt, per.R.iTo, +per.R.v.toFixed(2)] };
  }
  return { lockFeet, fk, gripWorld, skinned, minY, maxY, hips, ground, footSpeed, legIK, rotWorld, timewarp, resample, closeLoop, VERTS, jointList, parentName };
}
