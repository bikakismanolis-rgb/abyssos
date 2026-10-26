import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(S + '/research/opengameart/glb/giant-spider.glb');
const r = doc.getRoot();
function comps(prim) {
  const P = prim.getAttribute('POSITION'); const n = P.getCount(); const key = new Map(); const id = new Int32Array(n);
  for (let i = 0; i < n; i++) { const v = P.getElement(i, []); const k = v.map(x => Math.round(x * 1e4)).join(','); if (!key.has(k)) key.set(k, key.size); id[i] = key.get(k); }
  const par = Array.from({ length: key.size }, (_, i) => i); const f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const I = prim.getIndices().getArray();
  for (let t = 0; t < I.length; t += 3) { const a = f(id[I[t]]), b = f(id[I[t + 1]]), c = f(id[I[t + 2]]); par[b] = a; par[f(c)] = a; }
  const groups = new Map();
  for (let i = 0; i < n; i++) { const g = f(id[i]); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  const out = [];
  for (const [g, vs] of groups) { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const i of vs) { const v = P.getElement(i, []); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } } out.push({ n: vs.length, mn: mn.map(x => +x.toFixed(2)), mx: mx.map(x => +x.toFixed(2)) }); }
  let tris = 0; return out.sort((a, b) => b.n - a.n);
}
for (const m of r.listMeshes()) { const c = comps(m.listPrimitives()[0]); console.log(m.getName(), c.length, 'components'); if (c.length < 30) for (const x of c) console.log('   ', JSON.stringify(x)); }
// leg roots
const root = new THREE.Vector3(0.316, 0.97, 0.212), tip = new THREE.Vector3(3.30 * 0.544 + 0.17 * 0.839, 0.12, 3.30 * 0.839 - 0.17 * 0.544);
for (const n of r.listNodes()) { if (!n.getMesh().getName().startsWith('Spider-leg')) continue; const M = new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(1, 1, 1));
  const a = root.clone().applyMatrix4(M), b = tip.clone().applyMatrix4(M); const yaw = Math.atan2(b.x - a.x, b.z - a.z) * 180 / Math.PI;
  console.log(n.getName(), 'root', a.toArray().map(v => +v.toFixed(2)), 'tip', b.toArray().map(v => +v.toFixed(2)), 'yaw', yaw.toFixed(0)); }
