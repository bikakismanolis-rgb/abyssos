import { NodeIO } from '@gltf-transform/core';
const [path, ...names] = process.argv.slice(2);
const doc = await new NodeIO().read(path);
const root = doc.getRoot();
const all = []; const visit = (n, parent) => { all.push({ node: n, name: n.getName(), parent }); for (const c of n.listChildren()) visit(c, n.getName()); };
for (const n of root.getDefaultScene().listChildren()) visit(n, null);
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
function vrot(q, v) { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; }
function slerp(a, b, t) { let d = a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]; if (d<0){b=b.map(v=>-v);d=-d;} if (d>0.9995){const r=a.map((v,i)=>v+(b[i]-v)*t);const l=Math.hypot(...r);return r.map(v=>v/l);} const th=Math.acos(d),s=Math.sin(th); return a.map((v,i)=>(v*Math.sin((1-t)*th)+b[i]*Math.sin(t*th))/s); }
function pose(anim, t) {
  const local = new Map(); for (const a of all) local.set(a.name, { t: a.node.getTranslation().slice(), r: a.node.getRotation().slice() });
  for (const ch of anim.listChannels()) { const n = ch.getTargetNode().getName(), p = ch.getTargetPath(); if (p !== 'rotation' && p !== 'translation') continue; const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), k = p === 'rotation' ? 4 : 3; let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++; const j = Math.min(i + 1, inp.length - 1), f = inp[j] > inp[i] ? Math.min(1, Math.max(0, (t - inp[i]) / (inp[j] - inp[i]))) : 0; const A = Array.from(out.slice(i * k, i * k + k)), B = Array.from(out.slice(j * k, j * k + k)); local.get(n)[p === 'rotation' ? 'r' : 't'] = k === 4 ? slerp(A, B, f) : A.map((x, q) => x + (B[q] - x) * f); }
  const w = new Map(); for (const a of all) { const l = local.get(a.name), pp = a.parent ? w.get(a.parent) : { p: [0, 0, 0], r: [0, 0, 0, 1] }; w.set(a.name, { p: vrot(pp.r, l.t).map((v, i) => v + pp.p[i]), r: qmul(pp.r, l.r) }); }
  return w;
}
for (const nm of names) {
  const anim = root.listAnimations().find((a) => a.getName() === nm); if (!anim) { console.log(nm, 'missing'); continue; }
  let dur = 0; for (const s of anim.listSamplers()) dur = Math.max(dur, s.getInput().getMax([])[0]);
  const N = 60; let prev = null, best = 0, bt = 0; const sp = [];
  for (let f = 0; f <= N; f++) { const t = (f / N) * dur; const w = pose(anim, t); const h = w.get('handslot.r').p; if (prev) { const v = Math.hypot(h[0] - prev[0], h[1] - prev[1], h[2] - prev[2]); sp.push(v); if (v > best) { best = v; bt = f / N; } } prev = h; }
  console.log(nm.padEnd(36), 'dur', dur.toFixed(2), 'impact', bt.toFixed(2));
}
