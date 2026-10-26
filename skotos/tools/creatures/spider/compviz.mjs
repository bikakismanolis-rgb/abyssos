// writes comps.glb: each body component as its own coloured mesh (for identification)
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const src = await io.read(S + '/research/opengameart/glb/giant-spider.glb');
const prim = src.getRoot().listMeshes().find(m => m.getName() === 'Spider-body1000').listPrimitives()[0];
const P = prim.getAttribute('POSITION'), I = prim.getIndices().getArray(), n = P.getCount();
const key = new Map(), id = new Int32Array(n);
for (let i = 0; i < n; i++) { const k = P.getElement(i, []).map(x => Math.round(x * 1e4)).join(','); if (!key.has(k)) key.set(k, key.size); id[i] = key.get(k); }
const par = Array.from({ length: key.size }, (_, i) => i), f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
for (let t = 0; t < I.length; t += 3) { const a = f(id[I[t]]); par[f(id[I[t + 1]])] = a; par[f(id[I[t + 2]])] = a; }
const groups = new Map(); for (let i = 0; i < n; i++) { const g = f(id[i]); if (!groups.has(g)) groups.set(g, groups.size); }
const doc = new Document(); const buf = doc.createBuffer(); const scene = doc.createScene();
const cols = [[.3,.3,.3],[.5,.4,.3],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,.5,0],[.5,0,1],[0,.5,.2],[.6,.6,1],[1,.7,.7],[.2,.2,.6]];
const G = [...groups.keys()];
G.forEach((g, gi) => {
  const tris = []; for (let t = 0; t < I.length; t += 3) if (f(id[I[t]]) === g) tris.push(I[t], I[t + 1], I[t + 2]);
  const pos = new Float32Array(tris.length * 3); tris.forEach((vi, k) => { const v = P.getElement(vi, []); pos.set(v, k * 3); });
  const m = doc.createMaterial('c' + gi).setBaseColorFactor([...cols[gi % cols.length], 1]).setRoughnessFactor(0.6);
  const pr = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)).setMaterial(m);
  const node = doc.createNode('comp' + gi).setMesh(doc.createMesh('m' + gi).addPrimitive(pr));
  scene.addChild(node);
  let c = [0, 0, 0]; for (let k = 0; k < pos.length; k += 3) for (let j = 0; j < 3; j++) c[j] += pos[k + j] / (pos.length / 3);
  console.log('comp' + gi, cols[gi % cols.length].join('/'), 'tris', tris.length / 3, 'centroid', c.map(x => +x.toFixed(2)));
});
await io.write('comps.glb', doc);
