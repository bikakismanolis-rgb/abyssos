// The crab: "Crab mountain" by pro100voron (sketchfab.com/pro100voron), CC-BY 4.0 -> src/assets/creatures/crab.glb.
// One file for two monsters: Skerry, the Walking Tower (look.scale 4, the code ruin stood on the socket on its spire) and
// the Reefback (x1.5). A crab with a spire of stacked rock for a shell, five pairs of limbs (the big claws, three pairs of
// walking legs, the small claws by the mouth), two pairs of mouthparts and a pair of feelers.
// The source rig is an 85-joint C4D rig whose right side hangs off mirrored joints (scale -1), skinned rigidly (one joint
// per vertex: the segments of a shell). It is rebuilt here as a clean FK skeleton: every bind frame is the identity at the
// joint's position in the rest pose (character space: Y up, facing +Z, metres), so the skinning matrices are pure
// rotations about each joint and nothing is mirrored. The rest pose is the first frame of the source's one clip.
// 42k triangles in three parts (shell and spire, legs and claws, head) are thinned to about 12k and merged into one
// skinned primitive with one material on a 1024 atlas (spire on the top half, legs and head below). The brown and
// red-brown are graded to slate-blue chitin with pale barnacles; the spire is cold grey stone, rimed pale on the ledges
// that face up and hung with dark weed round its foot. The source's normal maps are kept (corrected for the atlas's squash) and
// its AO goes into one ORM map with a wet-shell roughness.
// Clips (in place; rotations plus the root's translation): idle (the source's own clip: it breathes, works its
// mouthparts and lifts a claw once a loop; its walking legs planted), walk (a wave gait of the six walking legs, the claws carried), run, side
// (the sideways scuttle, toward its left, +X), attack (the claw sweep, right to left), attack2 (the hammer claw: both
// claws overhead and down in front), slam (rears and drops its whole weight), rear, dive (sinks out of sight), rise
// (bursts up out of the water), breach (out of the water nose-up and down again; the game carries it along the line),
// wake (unfolds from the rock), rock (the dormant boulder, held), settle (folds down into the rock, held), overturned
// (5 s: rolls onto its back, flails, rights itself), flounder (through the ice, thrashing; loops), shake, hit, daze
// (loops), die, crawl (the death crawl home: a dragging, laboured loop).
// An empty 'socket_light' under the root marks the summit of the spire, where the code ruin stands (scene extras
// socket, socketAt, socketR).
// usage: node crab.mjs [source.glb] [out.glb] [--dbg=<dir> writes an uncompressed copy and the atlas maps as PNG]
//        [--only=idle,walk keeps only those clips (look-dev)]
import { MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync } from 'node:fs';
import { simplifyPrim } from '../../envlib.mjs';
import { load, locals, worlds, finish, dropClip, slimRig, X, Y, Z, bump, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const argv = process.argv.slice(2);
const [SRC = '/tmp/claude-0/sf/act5/crab/model.glb', OUT = new URL('../../../src/assets/creatures/crab.glb', import.meta.url).pathname] = argv.filter((a) => !a.startsWith('--'));
const DBG = (argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
if (DBG) mkdirSync(DBG, { recursive: true });
const deg = Math.PI / 180, TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Qa = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a * deg);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const SPAN = 1.12;                                   // tip to tip of the walking legs across, metres (the contract's legSpan)
const TRIS = { body: 4800, leg: 5300, head: 1900 };  // triangles kept per part (source 7061, 21464, 13468)

const doc = await load(SRC);
const R = doc.getRoot(), buf = R.listBuffers()[0];
const SRCA = R.listAnimations()[0];
const meshNodes = R.listNodes().filter((n) => n.getSkin() && n.getMesh());
const skin = meshNodes[0].getSkin(), sJ = skin.listJoints(), sIbm = skin.getInverseBindMatrices().getArray();
const sIdx = new Map(sJ.map((j, i) => [j, i]));
const W0 = worlds(doc, locals(doc, SRCA, 0));
const P0 = (j) => new THREE.Vector3().setFromMatrixPosition(W0.get(j));

// ---------- 1. the new skeleton, read off the source tree ----------
// root, head; on the head the feelers (ant), two pairs of mouthparts (mxa, mxb); on the root the small claws by the mouth
// (palp, 3 joints), then front to back the big claws (claw0-4: claw3 the palm, claw4 the movable finger) and three
// pairs of walking legs (legA, legB, legC: 0 the coxa, 2 the femur, 3 the knee, 4 the last segment). Each chain's end
// joint (T) only marks the tip. _L is +X, the crab's own left.
const kids = (j) => j.listChildren().filter((c) => sIdx.has(c));
const chain = (j) => { const out = [j]; while (kids(out[out.length - 1]).length) out.push(kids(out[out.length - 1])[0]); return out; };
const sRoot = sJ.find((j) => /^root_\d+$/.test(j.getName())), sHead = kids(sRoot).find((j) => /^head_/.test(j.getName()));
const sideOf = (j) => (P0(j).x > 0 ? 'L' : 'R');
const TABLE = [];   // { name, src, parent }
const JI = new Map();
const add = (name, src, parent) => { JI.set(name, TABLE.length); TABLE.push({ name, src, parent: parent == null ? -1 : JI.get(parent) }); };
const addChain = (kind, js, parent) => {
  const s = sideOf(js[js.length - 1]);
  js.forEach((j, i) => add(i === js.length - 1 ? `${kind}T_${s}` : `${kind}${i}_${s}`, j, i ? `${kind}${i - 1}_${s}` : parent));
};
add('root', sRoot, null); add('head', sHead, 'root');
for (const c of kids(sHead)) addChain(/^us_/.test(c.getName()) ? 'ant' : /^limb1_/.test(c.getName()) ? 'mxa' : 'mxb', chain(c), 'head');
{
  const legRoots = kids(sRoot).filter((j) => j !== sHead);
  for (const s of ['L', 'R']) {
    const mine = legRoots.filter((j) => sideOf(j) === s);
    const palp = mine.filter((j) => chain(j).length === 4), long = mine.filter((j) => chain(j).length === 6).sort((a, b) => P0(b).z - P0(a).z);
    if (palp.length !== 1 || long.length !== 4) throw new Error('unexpected limbs on side ' + s);
    addChain('palp', chain(palp[0]), 'root');
    ['claw', 'legA', 'legB', 'legC'].forEach((k, i) => addChain(k, chain(long[i]), 'root'));
  }
}
for (const n of ['ant', 'mxa', 'mxb']) for (const s of ['L', 'R']) if (!JI.has(`${n}0_${s}`)) throw new Error('no ' + n + ' ' + s);
const NJ = TABLE.length, parentIdx = TABLE.map((r) => r.parent);
const J = (name) => { const i = JI.get(name); if (i === undefined) throw new Error('no joint ' + name); return i; };

// ---------- 2. the mesh baked into the rest pose (source units), then scaled to metres ----------
const M0 = sJ.map((j, i) => W0.get(j).clone().multiply(new THREE.Matrix4().fromArray(sIbm, i * 16)));
const remap = new Int32Array(sJ.length).fill(-1);
TABLE.forEach((r, i) => { remap[sIdx.get(r.src)] = i; });
const PARTS = meshNodes.map((node) => {
  const prim = node.getMesh().listPrimitives()[0], mat = prim.getMaterial();
  const kind = mat.getName() === 'Body' ? 'body' : mat.getName() === 'golova' ? 'head' : 'leg';
  const Pa = prim.getAttribute('POSITION'), Na = prim.getAttribute('NORMAL'), Ja = prim.getAttribute('JOINTS_0'), Wa = prim.getAttribute('WEIGHTS_0');
  const n = Pa.getCount(), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), jo = new Uint16Array(n * 4), wo = new Float32Array(n * 4);
  const e = [], je = [], we = [], m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  for (let i = 0; i < n; i++) {
    Ja.getElement(i, je); Wa.getElement(i, we);
    m.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    let s = 0;
    for (let k = 0; k < 4; k++) if (we[k] > 0) {
      for (let c = 0; c < 16; c++) m.elements[c] += M0[je[k]].elements[c] * we[k];
      if (remap[je[k]] < 0) throw new Error('weight on an unmapped joint ' + sJ[je[k]].getName());
      jo[i * 4 + k] = remap[je[k]]; wo[i * 4 + k] = we[k]; s += we[k];
    }
    for (let k = 0; k < 4; k++) wo[i * 4 + k] /= s;
    V(...Pa.getElement(i, e)).applyMatrix4(m).toArray(pos, i * 3);
    V(...Na.getElement(i, e)).applyMatrix3(nm.setFromMatrix4(m)).normalize().toArray(nor, i * 3);
  }
  return { node, prim, mat, kind, pos, nor, jo, wo };
});
// the frame: x and z centred between the walking legs' sockets, the lowest point of the rest pose on the ground, scaled
// to SPAN across the walking legs
const C0 = V(0, 0, 0); { const roots = []; for (const k of ['claw', 'legA', 'legB', 'legC']) for (const s of ['L', 'R']) roots.push(P0(TABLE[J(`${k}0_${s}`)].src)); for (const p of roots) C0.add(p); C0.divideScalar(roots.length); }
let K = 1;
{
  let x0 = 1e9, x1 = -1e9, y0 = 1e9;
  for (const p of PARTS) for (let i = 0; i < p.pos.length; i += 3) { x0 = Math.min(x0, p.pos[i]); x1 = Math.max(x1, p.pos[i]); y0 = Math.min(y0, p.pos[i + 1]); }
  K = SPAN / (x1 - x0); C0.y = y0;
}
const toChar = (v) => v.clone().sub(C0).multiplyScalar(K);
for (const p of PARTS) for (let i = 0; i < p.pos.length; i += 3) toChar(V(p.pos[i], p.pos[i + 1], p.pos[i + 2])).toArray(p.pos, i);
const bindPos = TABLE.map((r) => toChar(P0(r.src)));
const offs = bindPos.map((p, i) => (parentIdx[i] < 0 ? p.clone() : p.clone().sub(bindPos[parentIdx[i]])));
console.log('scale', K.toFixed(5), 'm per unit;', NJ, 'joints');

// ---------- 3. the source clip, read as rotations of the new joints (before the old tree goes) ----------
// a joint's world rotation is its source world matrix against its rest matrix: both mirrored or neither, so the
// difference is a proper rotation
function srcPose(t) {
  const W = worlds(doc, locals(doc, SRCA, t)), Wq = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (const r of TABLE) {
    m.copy(W.get(r.src)).multiply(W0.get(r.src).clone().invert());
    if (m.determinant() < 0) throw new Error('mirrored delta at ' + r.name);
    m.decompose(new THREE.Vector3(), q, sc); Wq.push(q.clone());
  }
  const Lq = Wq.map((wq, i) => (parentIdx[i] < 0 ? wq.clone() : Wq[parentIdx[i]].clone().invert().multiply(wq)));
  return { Lq, root: toChar(new THREE.Vector3().setFromMatrixPosition(W.get(sRoot))) };
}
const SRC_FPS = 30, SRC_IDLE = 8.5;   // the calm stretch: breathing, the mouthparts, one claw lifted and set down
const srcFrames = []; for (let i = 0; i <= Math.round(SRC_IDLE * SRC_FPS); i++) srcFrames.push(srcPose(i / SRC_FPS));
const srcAt = (t) => { const f = ((t % SRC_IDLE) + SRC_IDLE) % SRC_IDLE * SRC_FPS, i = Math.floor(f), k = f - i, a = srcFrames[i], b = srcFrames[Math.min(i + 1, srcFrames.length - 1)];
  return { Lq: a.Lq.map((q, j) => q.clone().slerp(b.Lq[j], k)), root: a.root.clone().lerp(b.root, k) }; };

// ---------- 4. per-vertex fields on the full-res mesh (rest pose): what faces up, grooves, heights ----------
const fields = (p) => {
  const n = p.pos.length / 3, I = p.prim.getIndices().getArray();
  const up = new Float32Array(n), cav = new Float32Array(n);
  for (let i = 0; i < n; i++) up[i] = p.nor[i * 3 + 1];
  // grooves: how far a vertex's 2-ring neighbours stand above its tangent plane (welded by position: UV seams split vertices)
  const key = (i) => [0, 1, 2].map((k) => Math.round(p.pos[i * 3 + k] * 2e4)).join(','), grp = new Map(), gid = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = key(i); if (!grp.has(k)) grp.set(k, grp.size); gid[i] = grp.get(k); }
  const G = grp.size, gp = Array.from({ length: G }, () => V(0, 0, 0)), gn = Array.from({ length: G }, () => V(0, 0, 0)), nb = Array.from({ length: G }, () => new Set());
  for (let i = 0; i < n; i++) { gp[gid[i]].set(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]); gn[gid[i]].add(V(p.nor[i * 3], p.nor[i * 3 + 1], p.nor[i * 3 + 2])); }
  gn.forEach((v) => v.normalize());
  for (let t = 0; t < I.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) nb[gid[I[t + a]]].add(gid[I[t + b]]);
  const gc = new Float32Array(G);
  for (let g = 0; g < G; g++) {
    const ring = new Set(nb[g]); for (const h of nb[g]) for (const k of nb[h]) ring.add(k); ring.delete(g);
    let s = 0; for (const h of ring) { const d = gp[h].clone().sub(gp[g]); const l = d.length(); if (l > 0) s += gn[g].dot(d) / l; }
    gc[g] = s / Math.max(1, ring.size);
  }
  for (let i = 0; i < n; i++) cav[i] = gc[gid[i]];
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  for (let i = 0; i < n; i++) { px[i] = p.pos[i * 3]; py[i] = p.pos[i * 3 + 1]; pz[i] = p.pos[i * 3 + 2]; }
  return { up, cav, px, py, pz };
};
for (const p of PARTS) p.f = fields(p);

// ---------- 5. the atlas: the three texture sets graded and packed into one ----------
// spire and shell on the top half (1024 x 512), legs and claws bottom left (576 x 512), head bottom right (448 x 512)
const AW = 1024, AH = 1024, PAD = 4;
const CELLS = { body: [0, 0, 1024, 512], leg: [0, 512, 576, 512], head: [576, 512, 448, 512] };
const lum = (r, g, b) => (0.3 * r + 0.59 * g + 0.11 * b) / 255;
const mixc = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
const ramp3 = (x, stops) => { // piecewise-linear colour ramp over [x, colour] stops
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) return mixc(stops[i - 1][1], stops[i][1], (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
};
// per-texel values of per-vertex fields, rasterised in a cell's UV space (w x h) and dilated over the island borders
function rasterise(p, w, h, val) {
  const f = new Float32Array(w * h), cov = new Uint8Array(w * h), e = [];
  const uv = p.prim.getAttribute('TEXCOORD_0'), I = p.prim.getIndices().getArray();
  for (let t = 0; t < I.length; t += 3) {
    const v = [0, 1, 2].map((k) => { uv.getElement(I[t + k], e); return [e[0] * w, e[1] * h]; }), c = [val[I[t]], val[I[t + 1]], val[I[t + 2]]];
    const x0 = Math.max(0, Math.floor(Math.min(v[0][0], v[1][0], v[2][0]))), x1 = Math.min(w - 1, Math.ceil(Math.max(v[0][0], v[1][0], v[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(v[0][1], v[1][1], v[2][1]))), y1 = Math.min(h - 1, Math.ceil(Math.max(v[0][1], v[1][1], v[2][1])));
    const ar = (v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[2][0] - v[0][0]) * (v[1][1] - v[0][1]); if (!ar) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((v[1][0] - px) * (v[2][1] - py) - (v[2][0] - px) * (v[1][1] - py)) / ar, w1 = ((v[2][0] - px) * (v[0][1] - py) - (v[0][0] - px) * (v[2][1] - py)) / ar, w2 = 1 - w0 - w1;
      if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) { f[y * w + x] = w0 * c[0] + w1 * c[1] + w2 * c[2]; cov[y * w + x] = 1; }
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    const addv = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x; if (cov[k]) continue;
      let s = 0, c = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const kk = yy * w + xx; if (cov[kk]) { s += f[kk]; c++; } }
      if (c) addv.push([k, s / c]);
    }
    for (const [k, v] of addv) { f[k] = v; cov[k] = 1; }
  }
  return f;
}
// 3D value noise on the surface (rest-pose positions, metres): continuous across UV seams
const hash3 = (i, j, k, s) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (p, S, seed = 3) => {
  const q = p.map((v) => v / S), g = q.map(Math.floor), f = q.map((v, a) => smooth(v - g[a]));
  let o = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) o += hash3(g[0] + i, g[1] + j, g[2] + k, seed) * (i ? f[0] : 1 - f[0]) * (j ? f[1] : 1 - f[1]) * (k ? f[2] : 1 - f[2]);
  return o;
};
const fbm = (p, S, seed = 3) => 0.55 * vnoise(p, S, seed) + 0.3 * vnoise(p, S / 2.3, seed + 1) + 0.15 * vnoise(p, S / 5.1, seed + 2);
const atlas = { base: Buffer.alloc(AW * AH * 3), nrm: Buffer.alloc(AW * AH * 3), orm: Buffer.alloc(AW * AH * 3) };
for (let i = 0; i < AW * AH; i++) { atlas.nrm[i * 3] = 128; atlas.nrm[i * 3 + 1] = 128; atlas.nrm[i * 3 + 2] = 255; atlas.orm[i * 3] = 255; atlas.orm[i * 3 + 1] = 200; }
const SPIRE_Y = 0.30, TOP_Y = 0.585;   // where the stacked rock of the spire begins above the shell, and its summit (metres, rest)
async function cell(p, shade) {
  const [cx, cy, cw, ch] = CELLS[p.kind], w = cw - 2 * PAD, h = ch - 2 * PAD;
  const img = async (t) => (t ? sharp(Buffer.from(t.getImage())).removeAlpha().resize(w, h, { fit: 'fill' }).raw().toBuffer() : null);
  const src = await img(p.mat.getBaseColorTexture()), occ = await img(p.mat.getOcclusionTexture()), nrm = await img(p.mat.getNormalTexture());
  const F = {}; for (const k of ['up', 'cav', 'px', 'py', 'pz']) F[k] = rasterise(p, w, h, p.f[k]);
  const base = Buffer.alloc(w * h * 3), orm = Buffer.alloc(w * h * 3), nout = Buffer.alloc(w * h * 3);
  // the normal map: tangent-space x and y rescaled for the cell's squash (three.js builds the tangent frame from the UV
  // gradients and normalises both by the larger, so a squashed cell would flatten the bumps across it)
  const su = w / 1024, sv = h / 1024, mn = Math.min(su, sv), mx = Math.max(su, sv);
  for (let k = 0; k < w * h; k++) {
    const r = src[k * 3], g = src[k * 3 + 1], b = src[k * 3 + 2];
    const o = shade({ r, g, b, l: lum(r, g, b), ao: occ ? occ[k * 3] / 255 : 1, up: F.up[k], cav: F.cav[k], p: [F.px[k], F.py[k], F.pz[k]] });
    for (let q = 0; q < 3; q++) base[k * 3 + q] = clamp(Math.round(o.c[q]), 0, 255);
    orm[k * 3] = clamp(Math.round(o.ao * 255), 0, 255); orm[k * 3 + 1] = clamp(Math.round(o.rough * 255), 0, 255); orm[k * 3 + 2] = 0;
    const nx = nrm[k * 3] / 127.5 - 1, ny = nrm[k * 3 + 1] / 127.5 - 1, nz = nrm[k * 3 + 2] / 127.5 - 1;
    nout[k * 3] = clamp(Math.round((nx * mn / su + 1) * 127.5), 0, 255); nout[k * 3 + 1] = clamp(Math.round((ny * mn / sv + 1) * 127.5), 0, 255); nout[k * 3 + 2] = clamp(Math.round((nz * mn / mx + 1) * 127.5), 0, 255);
  }
  const put = async (buf3, dst) => {
    const ext = await sharp(buf3, { raw: { width: w, height: h, channels: 3 } }).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, extendWith: 'copy' }).raw().toBuffer();
    for (let y = 0; y < ch; y++) ext.copy(dst, ((cy + y) * AW + cx) * 3, y * cw * 3, (y + 1) * cw * 3);
  };
  await put(base, atlas.base); await put(orm, atlas.orm); await put(nout, atlas.nrm);
}
// (the source's maps are dark, about 0.16 in sRGB value on average: the grade keeps it about there, so the crab reads
// dark against snow and sand, and lets the light pick out the rime, the barnacles and the wet shine)
const RIME = [150, 162, 174];
await cell(PARTS.find((p) => p.kind === 'body'), (s) => {
  const y = s.p[1], spire = smooth((y - SPIRE_Y + 0.03) / 0.06), hi = clamp((y - SPIRE_Y) / (TOP_Y - SPIRE_Y), 0, 1);
  // cold grey stone, a little blue in the shadows; the source's mottling kept as value and a trace of its hue
  const x = clamp((s.l - 0.02) / 0.42, 0, 1);
  let c = ramp3(x, [[0, [11, 13, 16]], [0.25, [34, 38, 42]], [0.55, [66, 69, 71]], [1, [116, 116, 112]]]);
  c = mixc(c, [s.r, s.g, s.b], 0.15);
  // the shell under the spire: darker, wet
  c = mixc(c, c.map((v) => v * 0.7), (1 - spire) * 0.6);
  // weed hanging round the foot of the spire: dark olive and brown, in strands (noise stretched along y)
  const st = fbm([s.p[0] * 3, s.p[1] * 0.6, s.p[2] * 3], 0.05, 11), band = env(y, SPIRE_Y - 0.05, SPIRE_Y + 0.01, SPIRE_Y + 0.07, SPIRE_Y + 0.15);
  const weed = clamp(band * smooth((st - 0.38) / 0.18) * (1 - smooth((s.up - 0.55) / 0.3)), 0, 1);
  c = mixc(c, mixc([20, 24, 13], [52, 50, 26], clamp(s.l * 2.5, 0, 1)), weed * 0.9);
  // rime on the ledges that face up, thicker higher up, broken by noise, kept out of the grooves
  const n = fbm(s.p, 0.018, 5), rime = clamp(smooth((s.up - 0.5) / 0.4) * (0.25 + 0.75 * hi) * smooth((n - 0.45) / 0.22) * spire * (1 - smooth((s.cav - 0.02) / 0.15)), 0, 1);
  c = mixc(c, RIME.map((v) => v * (0.8 + 0.6 * (s.l - 0.16))), rime * 0.6);
  const rough = 0.86 - 0.12 * rime - 0.3 * weed - 0.22 * (1 - spire);
  return { c, ao: 0.35 + 0.65 * s.ao, rough };
});
await cell(PARTS.find((p) => p.kind === 'leg'), (s) => {
  // slate-blue chitin; the barnacles (bright and grey in the source) stay pale; a rusty purple in the joints' folds
  const sat = (Math.max(s.r, s.g, s.b) - Math.min(s.r, s.g, s.b)) / Math.max(1, Math.max(s.r, s.g, s.b));
  const x = clamp((s.l - 0.06) / 0.4, 0, 1);
  let c = ramp3(x, [[0, [12, 14, 20]], [0.3, [30, 36, 48]], [0.6, [56, 64, 78]], [1, [100, 106, 114]]]);
  const barn = smooth((s.l - 0.34) / 0.14) * (1 - smooth((sat - 0.25) / 0.2));
  c = mixc(c, [140, 140, 134].map((v) => v * (0.8 + 0.5 * (s.l - 0.4))), barn * 0.8);
  const red = clamp((s.r - s.g) / 60, 0, 1) * smooth((s.cav - 0.05) / 0.25);
  c = mixc(c, [56, 28, 34], red * 0.55);
  const n = fbm(s.p, 0.02, 7), rime = clamp(smooth((s.up - 0.65) / 0.3) * smooth((n - 0.52) / 0.2), 0, 1) * 0.18;
  c = mixc(c, RIME, rime);
  const ao = 1 - 0.45 * smooth((s.cav - 0.05) / 0.35);
  return { c, ao, rough: 0.56 + 0.22 * barn + 0.1 * rime - 0.08 * smooth((s.l - 0.12) / 0.2) };
});
await cell(PARTS.find((p) => p.kind === 'head'), (s) => {
  const x = clamp((s.l - 0.04) / 0.36, 0, 1);
  let c = ramp3(x, [[0, [10, 13, 15]], [0.35, [28, 34, 36]], [0.7, [58, 66, 64]], [1, [104, 108, 100]]]);
  c = mixc(c, [s.r, s.g, s.b], 0.2);
  return { c, ao: 0.3 + 0.7 * s.ao, rough: 0.55 };
});
const png = async (b, w = AW, h = AH) => sharp(b, { raw: { width: AW, height: AH, channels: 3 } }).resize(w, h).png().toBuffer();
if (DBG) for (const [k, b] of Object.entries(atlas)) await sharp(b, { raw: { width: AW, height: AH, channels: 3 } }).png().toFile(`${DBG}/atlas_${k}.png`);

// ---------- 6. thinned and merged into one primitive on the atlas ----------
await MeshoptSimplifier.ready;
const prim = doc.createPrimitive();
{
  let t0 = 0, t1 = 0;
  const cat = { POSITION: [], NORMAL: [], TEXCOORD_0: [], JOINTS_0: [], WEIGHTS_0: [] }, idx = []; let off = 0;
  for (const p of PARTS) {
    const q = p.prim;
    q.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(p.pos).setBuffer(buf));
    q.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(p.nor).setBuffer(buf));
    q.setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(p.jo).setBuffer(buf));
    q.setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(p.wo).setBuffer(buf));
    for (const sm of ['TANGENT', 'TEXCOORD_1', 'TEXCOORD_2', 'COLOR_0']) q.setAttribute(sm, null);
    const before = q.getIndices().getCount() / 3; t0 += before;
    const mode = simplifyPrim(q, Math.min(1, TRIS[p.kind] / before), 0.02);
    const after = q.getIndices().getCount() / 3; t1 += after;
    console.log('  ', p.kind, before, '->', after, mode, 'vertices', q.getAttribute('POSITION').getCount());
    const [cx, cy, cw, ch] = CELLS[p.kind], e = [];
    for (const sm of Object.keys(cat)) {
      const a = q.getAttribute(sm);
      for (let i = 0; i < a.getCount(); i++) {
        a.getElement(i, e);
        if (sm === 'TEXCOORD_0') cat[sm].push((cx + PAD + e[0] * (cw - 2 * PAD)) / AW, (cy + PAD + e[1] * (ch - 2 * PAD)) / AH);
        else cat[sm].push(...e);
      }
    }
    for (const i of q.getIndices().getArray()) idx.push(i + off);
    off += q.getAttribute('POSITION').getCount();
  }
  const types = { POSITION: ['VEC3', Float32Array], NORMAL: ['VEC3', Float32Array], TEXCOORD_0: ['VEC2', Float32Array], JOINTS_0: ['VEC4', Uint16Array], WEIGHTS_0: ['VEC4', Float32Array] };
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
  for (const sm of Object.keys(cat)) prim.setAttribute(sm, doc.createAccessor().setType(types[sm][0]).setArray(new types[sm][1](cat[sm])).setBuffer(buf));
  console.log('triangles', t0, '->', t1, 'vertices', off);
}
const mat = doc.createMaterial('crab').setMetallicFactor(0).setRoughnessFactor(1).setBaseColorFactor([1, 1, 1, 1]).setDoubleSided(false);
{
  const tex = async (name, b) => doc.createTexture(name).setImage(await png(b)).setMimeType('image/png');
  const ormT = await tex('crab_orm', atlas.orm);
  mat.setBaseColorTexture(await tex('crab_base', atlas.base)).setNormalTexture(await tex('crab_normal', atlas.nrm)).setMetallicRoughnessTexture(ormT).setOcclusionTexture(ormT);
}
prim.setMaterial(mat);

// ---------- 7. the new nodes and skin; the old tree, skin, meshes and clip go ----------
const rootNode = doc.createNode('creature');
const jNodes = TABLE.map((r) => doc.createNode(r.name));
TABLE.forEach((r, i) => { (parentIdx[i] < 0 ? rootNode : jNodes[parentIdx[i]]).addChild(jNodes[i]); jNodes[i].setTranslation(offs[i].toArray()); });
const newSkin = doc.createSkin('crab').setSkeleton(jNodes[0]);
{
  const ib = new Float32Array(NJ * 16);
  bindPos.forEach((p, i) => { new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z).toArray(ib, i * 16); newSkin.addJoint(jNodes[i]); });
  newSkin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ib).setBuffer(buf));
}
const meshNode = doc.createNode('crab_mesh').setMesh(doc.createMesh('crab').addPrimitive(prim)).setSkin(newSkin);
rootNode.addChild(meshNode);
{
  const sc = R.getDefaultScene();
  for (const k of sc.listChildren()) sc.removeChild(k);
  sc.addChild(rootNode);
  for (const n of meshNodes) n.setMesh(null).setSkin(null);
  dropClip(SRCA);
  for (const n of R.listNodes()) if (n !== rootNode && !jNodes.includes(n) && n !== meshNode) n.dispose();
  skin.dispose();
  for (const m of R.listMeshes()) if (m.listPrimitives()[0] !== prim) m.dispose();
  for (const m of R.listMaterials()) if (m !== mat) m.dispose();
  for (const t of R.listTextures()) if (![mat.getBaseColorTexture(), mat.getNormalTexture(), mat.getMetallicRoughnessTexture()].includes(t)) t.dispose();
}

// ---------- 8. posing: FK on the new skeleton (every rest rotation is the identity) ----------
const ROOT0 = bindPos[0].clone();
const restPose = () => ({ Lq: Array.from({ length: NJ }, () => new THREE.Quaternion()), root: ROOT0.clone() });
const clonePose = (P) => ({ Lq: P.Lq.map((q) => q.clone()), root: P.root.clone() });
function fk(P) {
  const Wq = new Array(NJ), Wp = new Array(NJ);
  for (let i = 0; i < NJ; i++) {
    const p = parentIdx[i];
    if (p < 0) { Wq[i] = P.Lq[i].clone(); Wp[i] = P.root.clone(); }
    else { Wq[i] = Wq[p].clone().multiply(P.Lq[i]); Wp[i] = Wp[p].clone().add(offs[i].clone().applyQuaternion(Wq[p])); }
  }
  return { Wq, Wp };
}
// a joint turned about a character-space axis as it stands at rest (carried by its parent's turn): makeClip's convention
const rot = (P, name, axis, a) => { if (a) P.Lq[J(name)].multiply(Qa(axis, a)); return P; };
// the whole crab moved (metres) and turned about the root joint, in character space
const move = (P, v) => { P.root.add(V(...v)); return P; };
const turn = (P, axis, a) => { if (a) P.Lq[0].premultiply(Qa(axis, a)); return P; };
// pre-rotates a joint by a world-space rotation about its own pivot
const worldRot = (P, F, j, q) => { const pq = F.Wq[parentIdx[j]]; P.Lq[j].premultiply(pq.clone().invert().multiply(q).multiply(pq)); };
const mixPose = (A, B, k) => (k <= 0 ? clonePose(A) : k >= 1 ? clonePose(B) : { Lq: A.Lq.map((q, i) => q.clone().slerp(B.Lq[i], k)), root: A.root.clone().lerp(B.root, k) });
// skinned vertex positions for a pose (bind frames are identity: v -> Wq (v - bind) + Wp)
const PA = prim.getAttribute('POSITION'), JA = prim.getAttribute('JOINTS_0'), WA = prim.getAttribute('WEIGHTS_0'), NV = PA.getCount();
const VB = [], VJ = [], VW = [];
{ const e = [], je = [], we = []; for (let i = 0; i < NV; i++) { VB.push(V(...PA.getElement(i, e))); VJ.push([...JA.getElement(i, je)]); VW.push([...WA.getElement(i, we)]); } }
function skinned(F, step = 1) {
  const out = [], v = V(0, 0, 0);
  for (let i = 0; i < NV; i += step) {
    const acc = V(0, 0, 0);
    for (let k = 0; k < 4; k++) { const w = VW[i][k]; if (!w) continue; const j = VJ[i][k]; v.copy(VB[i]).sub(bindPos[j]).applyQuaternion(F.Wq[j]).add(F.Wp[j]); acc.addScaledVector(v, w); }
    out.push(acc);
  }
  return out;
}
const lowY = (P, step = 2) => { let m = 9; for (const p of skinned(fk(P), step)) m = Math.min(m, p.y); return m; };

// ---------- 9. clips ----------
const FPS = 30, HIT = {}, INFO = {}, INFO_EX = {};
// keys a second for the slow clips (the rest bake at 30, the fast loops at 60)
const SLOW = { idle: 12, rear: 20, daze: 20, wake: 20, settle: 20, dive: 20, overturned: 20, die: 20, crawl: 20 };
// writes poseAt(t) as a clip: the rotation of every joint that moves, the root's translation; reports the lowest and
// highest skin point and the worst stretch of a triangle edge against the rest pose
function bake(name, dur, poseAt, o = {}) {
  if (ONLY.length && !ONLY.includes(name)) return null;
  IKERR = 0;
  const fps = o.fps || SLOW[name] || FPS, n = Math.max(2, Math.round(dur * fps) + 1), rows = [], times = new Float32Array(n);
  for (let i = 0; i < n; i++) { times[i] = (dur * i) / (n - 1); rows.push(poseAt(times[i])); }
  if (o.loop) rows[n - 1] = rows[0];
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf), anim = doc.createAnimation(name);
  const add = (node, path, arr, type) => {
    const smp = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp));
  };
  for (let j = 0; j < NJ; j++) {
    if (j && !rows.some((r) => 1 - Math.abs(r.Lq[j].w) > 1e-7)) continue;
    const arr = new Float32Array(n * 4); let prev = null;
    for (let i = 0; i < n; i++) { const q = rows[i].Lq[j].clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; }
    add(jNodes[j], 'rotation', arr, 'VEC4');
  }
  const tr = new Float32Array(n * 3); rows.forEach((r, i) => r.root.toArray(tr, i * 3));
  add(jNodes[0], 'translation', tr, 'VEC3');
  // checks
  let lo = 9, hi = -9, loAt = '', worst = 1, worstAt = '';
  const I = prim.getIndices().getArray();
  for (let i = 0; i < n; i += Math.max(1, Math.round(n / 40))) {
    const pts = skinned(fk(rows[i]), 1);
    pts.forEach((p, k) => { if (p.y < lo) { lo = p.y; loAt = TABLE[VJ[k][0]].name + '@' + times[i].toFixed(2); } hi = Math.max(hi, p.y); });
    if (i % Math.max(1, Math.round(n / 10)) === 0) for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
      const l0 = VB[a].distanceTo(VB[b]); if (l0 < 0.002) continue;
      const r = pts[a].distanceTo(pts[b]) / l0; if (r > worst) { worst = r; worstAt = TABLE[VJ[a][0]].name + '/' + TABLE[VJ[b][0]].name + '@' + times[i].toFixed(2); }
    }
  }
  INFO[name] = `${dur.toFixed(2)} s  ik ${(IKERR * 100).toFixed(1)} cm  low ${lo.toFixed(3)} (${loAt})  high ${hi.toFixed(3)}  edge x${worst.toFixed(2)} (${worstAt})`;
  return anim;
}

// ---------- limbs ----------
const SIDES = ['L', 'R'];
const mir = (s, a) => (s === 'L' ? a.clone() : V(a.x, -a.y, -a.z));   // an axis on the left, mirrored for the right
const hz = (a, b) => { const d = b.clone().sub(a); d.y = 0; return d.normalize(); };
// walking legs: c0 the coxa (swings the leg about the vertical), hip (the femur), knee; T0 the tip at rest
const LEG = {};
for (const k of ['A', 'B', 'C']) for (const s of SIDES) {
  const g = { k, s, c0: J(`leg${k}0_${s}`), hip: J(`leg${k}2_${s}`), knee: J(`leg${k}3_${s}`), tip: J(`leg${k}T_${s}`) };
  g.T0 = bindPos[g.tip].clone(); g.dir = hz(bindPos[g.c0], g.T0); g.lift = g.dir.clone().cross(Y).normalize();
  LEG[k + s] = g;
}
// at rest the walking legs' tips stand about 2 cm clear of the ground (the claws carry the front): each leg's planting
// target is set down so its lowest point just touches it
{
  const pts = skinned(fk(restPose()), 1);
  for (const g of Object.values(LEG)) { let m = 9; pts.forEach((p, i) => { if (VJ[i][0] === J(`leg${g.k}4_${g.s}`)) m = Math.min(m, p.y); }); g.T0.y -= m + 0.001; }
}
const LEGKEYS = Object.keys(LEG);
let IKERR = 0;
// two passes of: the coxa turned so the tip's bearing matches, the knee bent so the reach matches, the femur aimed
function legIK(P, g, T) {
  for (let it = 0; it < 2; it++) {
    let F = fk(P);
    const c0 = F.Wp[g.c0], tp = F.Wp[g.tip];
    worldRot(P, F, g.c0, new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(T.x - c0.x, T.z - c0.z) - Math.atan2(tp.x - c0.x, tp.z - c0.z)));
    F = fk(P);
    const H = F.Wp[g.hip], Kp = F.Wp[g.knee], E = F.Wp[g.tip];
    const a = H.distanceTo(Kp), b = Kp.distanceTo(E), c = clamp(H.distanceTo(T), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const u = H.clone().sub(Kp).normalize(), v = E.clone().sub(Kp).normalize(), n = u.clone().cross(v).normalize();
    worldRot(P, F, g.knee, new THREE.Quaternion().setFromAxisAngle(n, Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1)) - Math.acos(clamp(u.dot(v), -1, 1))));
    F = fk(P);
    worldRot(P, F, g.hip, new THREE.Quaternion().setFromUnitVectors(F.Wp[g.tip].clone().sub(H).normalize(), T.clone().sub(H).normalize()));
  }
  IKERR = Math.max(IKERR, fk(P).Wp[g.tip].distanceTo(T));   // a tip left short of its mark (out of reach) slides
  return P;
}
// a leg turned in the air (no ground): swing about the vertical (+ forward on both sides), lift, knee bend (+ curls)
const legFK = (P, g, { swing = 0, lift = 0, bend = 0 } = {}) => {
  P.Lq[g.c0].multiply(Qa(mir(g.s, V(0, -1, 0)), swing)); P.Lq[g.hip].multiply(Qa(g.lift, lift)); P.Lq[g.knee].multiply(Qa(g.lift, -bend));
  return P;
};
// the big claws: out (+ away from the midline, at the coxa), lift (the whole arm), elbow (the forearm up), wrist (the
// palm's tip up), open (the movable finger)
const CL = {};
for (const s of SIDES) {
  const c = [0, 1, 2, 3, 4].map((i) => J(`claw${i}_${s}`)), tip = J(`clawT_${s}`), B = (i) => bindPos[i];
  CL[s] = { s, c, tip, out: mir(s, Y), lift: hz(B(c[0]), B(tip)).cross(Y).normalize(), elbow: hz(B(c[2]), B(c[3])).cross(Y).normalize(),
    wrist: hz(B(c[3]), B(tip)).cross(Y).normalize(), hinge: mir(s, V(-0.87, 0.17, 0.47).normalize()) };
}
const claw = (P, s, { out = 0, lift = 0, elbow = 0, wrist = 0, open = 0 } = {}) => {
  const g = CL[s];
  P.Lq[g.c[0]].multiply(Qa(g.out, out)); P.Lq[g.c[1]].multiply(Qa(g.lift, lift)); P.Lq[g.c[2]].multiply(Qa(g.elbow, elbow));
  P.Lq[g.c[3]].multiply(Qa(g.wrist, wrist)); P.Lq[g.c[4]].multiply(Qa(g.hinge, open));
  return P;
};
// a claw's finger tip onto a point (character space): the coxa turned, the wrist bent, the forearm aimed
const clawIK = (P, s, T) => legIK(P, { c0: CL[s].c[0], hip: CL[s].c[2], knee: CL[s].c[3], tip: CL[s].tip }, T);
const claws = (P, o) => { claw(P, 'L', typeof o === 'function' ? o('L') : o); claw(P, 'R', typeof o === 'function' ? o('R') : o); return P; };
// the head's small parts alive: mouthparts working, the small claws by the mouth and the feelers swaying (k: how much;
// f: whole cycles per clip, so loops close)
const headLife = (P, t, dur, k = 1, f = 1) => {
  const w = (n, ph = 0) => Math.sin(TAU * (n * f * t / dur + ph));
  for (const s of SIDES) {
    const m = s === 'L' ? 1 : -1;
    rot(P, `mxa0_${s}`, X, 7 * k * w(2, 0.1 * m)); rot(P, `mxb0_${s}`, X, 6 * k * w(2, 0.35 + 0.1 * m));
    rot(P, `palp1_${s}`, mir(s, V(-0.95, 0.05, -0.32)), 6 * k * w(1, 0.2 * m));
    rot(P, `ant0_${s}`, Y, 8 * k * m * w(1, 0.25 * m)); rot(P, `ant1_${s}`, X, 6 * k * w(2, 0.4));
  }
  return P;
};
// the body moved and turned about the root: y, pitch (+ nose down), roll (+ left side up), yaw (+ turns left), x, z
const body = (P, { x = 0, y = 0, z = 0, pitch = 0, roll = 0, yaw = 0 } = {}) => { move(P, [x, y, z]); turn(P, Y, yaw); turn(P, X, pitch); turn(P, Z, roll); return P; };
const plant = (P, at = (g) => g.T0) => { for (const lk of LEGKEYS) legIK(P, LEG[lk], at(LEG[lk])); return P; };

// piecewise ease through [time, value] keys (values numbers or arrays)
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], f = smooth((t - t0) / (t1 - t0));
    return Array.isArray(a) ? a.map((v, k) => v + (b[k] - v) * f) : a + (b - a) * f;
  }
  return keys[keys.length - 1][1];
}
// a step cycle: the stance (ph < duty) slides the tip back along the travel, the swing carries it forward in an arc
function step(ph, duty, stride, lift) {
  ph = ((ph % 1) + 1) % 1;
  if (ph < duty) return { d: stride * (0.5 - ph / duty), y: 0, sw: 0 };
  const s = (ph - duty) / (1 - duty);
  return { d: stride * (smooth(s) - 0.5), y: lift * Math.sin(Math.PI * Math.pow(s, 0.8)), sw: Math.sin(Math.PI * s) };
}

// ---------- the rock: legs folded in against the shell, the claws folded over the face, the shell down on the ground ----------
// (each leg: the coxa swung back, the femur lowered, the knee and the last joint folded so the leg lies along the shell)
const RK = { y: -0.1, pitch: 3, swing: { A: -10, B: -12, C: -8 }, lift: 10, bend: 120, bend4: 50, claw: { wrist: -40, open: -10 }, tip: [0.1, 0.01, 0.34] };
const legFold = (P, g, k = 1) => { legFK(P, g, { swing: RK.swing[g.k] * k, lift: RK.lift * k, bend: RK.bend * k }); P.Lq[J(`leg${g.k}4_${g.s}`)].multiply(Qa(g.lift, -RK.bend4 * k)); return P; };
const rockPose = () => {
  const P = claws(body(restPose(), { y: RK.y, pitch: RK.pitch }), RK.claw);
  for (const lk of LEGKEYS) legFold(P, LEG[lk]);
  if (RK.tip) for (const s of SIDES) clawIK(P, s, V(RK.tip[0] * (s === 'L' ? 1 : -1), RK.tip[1], RK.tip[2]));
  return move(P, [0, -lowY(P, 1), 0]);
};
const ROCK = rockPose();

// ---------- the clips ----------
// idle: the source's own calm stretch (8.5 s: it breathes, works its mouthparts and small claws, lifts its right claw
// and sets it down), its last 0.7 s eased back into the first frame so it loops; the walking legs planted on the ground
{
  const BL = 0.7;
  bake('idle', SRC_IDLE, (t) => { const P = srcAt(t); return plant(t > SRC_IDLE - BL ? mixPose(P, srcAt(0), smooth((t - SRC_IDLE + BL) / BL)) : P); }, { loop: true });
}

// walk: a wave gait (each side's legs lift back to front, the sides half a cycle apart), the claws carried clear of the
// ground and swinging a little with it; the shell rides level with a small bob and roll
const GAIT = {
  walk: { T: 0.84, duty: 0.68, stride: 0.24, lift: 0.07, dir: Z, ph: { CL: 0, BL: 0.667, AL: 0.333, CR: 0.5, BR: 0.167, AR: 0.833 }, bob: 0.006, roll: 1.6, yaw: 1.5, low: 0, clawLift: 14 },
  run: { T: 0.42, duty: 0.5, stride: 0.30, lift: 0.09, dir: Z, ph: { AL: 0, BR: 0, CL: 0, AR: 0.5, BL: 0.5, CR: 0.5 }, bob: 0.01, roll: 2.5, yaw: 2, low: -0.02, clawLift: 24 },
  side: { T: 0.6, duty: 0.55, stride: 0.16, lift: 0.07, dir: X, ph: { AL: 0, CL: 0, BR: 0, BL: 0.5, AR: 0.5, CR: 0.5 }, bob: 0.008, roll: 3, yaw: 0, low: -0.01, clawLift: 18 },
  crawl: { T: 1.25, duty: 0.76, stride: 0.18, lift: 0.035, dir: Z, ph: { CL: 0, BL: 0.667, AL: 0.333, CR: 0.45, BR: 0.12, AR: 0.79 }, bob: 0.012, roll: 4, yaw: 3, low: -0.07, clawLift: 0 }
};
const speedOf = (g) => g.stride / (g.duty * g.T);
function gait(name, extra) {
  const G = GAIT[name];
  return (t) => {
    const p = t / G.T, ph = TAU * p, P = restPose();
    body(P, { y: G.low + G.bob * Math.cos(2 * ph), roll: G.roll * Math.sin(ph), yaw: G.yaw * Math.sin(ph + 0.6), x: name === 'side' ? 0 : 0.004 * Math.sin(ph) });
    claws(P, (s) => ({ lift: G.clawLift + 4 * Math.sin(ph + (s === 'L' ? 0 : Math.PI)), out: -6 + 5 * Math.sin(ph + (s === 'L' ? 0.5 : Math.PI + 0.5)), elbow: 6, open: 4 + 4 * Math.sin(2 * ph) }));
    if (name === 'walk' || name === 'crawl') headLife(P, t, G.T, 0.7, 1);
    if (extra) extra(P, t, p);
    return plant(P, (g) => { const st = step(p + G.ph[g.k + g.s], G.duty, G.stride, G.lift); const T = g.T0.clone().addScaledVector(G.dir, st.d); T.y += st.y; return T; });
  };
}
bake('walk', GAIT.walk.T, gait('walk'), { loop: true });
bake('run', GAIT.run.T, gait('run', (P, t, p) => { body(P, { pitch: 3 }); }), { loop: true, fps: 60 });
bake('side', GAIT.side.T, gait('side', (P, t, p) => { body(P, { roll: -4 }); }), { loop: true, fps: 40 });
// crawl (the death crawl home): low and dragging, lurching from side to side; the right claw drags, the left reaches
bake('crawl', GAIT.crawl.T, gait('crawl', (P, t, p) => {
  const ph = TAU * p;
  body(P, { pitch: 5 + 2 * Math.sin(2 * ph), roll: 3 * Math.sin(ph + 1) });
  claw(P, 'R', { lift: 32, out: 10, elbow: -4, wrist: -6, open: 6 }); claw(P, 'L', { lift: 22 + 12 * Math.max(0, Math.sin(ph)), out: -4 + 10 * Math.sin(ph), elbow: 8 * Math.max(0, Math.sin(ph)) });
}), { loop: true });

// a standing pose: the body moved, the claws posed, the legs planted where they stood (or at at(g))
const stand = (o = {}) => { const P = restPose(); body(P, o.body || {}); if (o.L) claw(P, 'L', o.L); if (o.R) claw(P, 'R', o.R); if (o.life) headLife(P, o.t, o.dur, o.life); return plant(P, o.at || ((g) => g.T0)); };
const kfs = (t, o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? v : kf(t, v)]));
// keeps every frame of a clip out of the ground: where the lowest skin point dips below 0 the whole crab is lifted
// (smoothed over neighbouring frames, never leaving more than 4 mm in the ground)
function grounded(dur, poseAt, fps = FPS, from = 0) {
  const n = Math.round(dur * fps), off = [];
  for (let i = 0; i <= n; i++) { const t = (dur * i) / n; off.push(t < from ? 0 : Math.max(0, -lowY(poseAt(t), 2))); }
  const sm = off.map((o, i) => Math.max(o - 0.004, (off[Math.max(0, i - 1)] + 2 * o + off[Math.min(n, i + 1)]) / 4));
  return (t) => { const f = (t / dur) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return move(poseAt(t), [0, sm[i] + (sm[i + 1] - sm[i]) * k, 0]); };
}

// attack: the claw sweep. Its right claw swings out and up, the shell turning right (0-0.32 s), then sweeps hard across
// the front to the left, snapping shut as it passes the middle (the strike), and the shell follows round
{
  const D = 1.3; HIT.attack = 0.5;
  bake('attack', D, (t) => stand({
    body: kfs(t, { yaw: [[0, 0], [0.32, -22], [0.46, -4], [0.62, 22], [0.85, 14], [D, 0]], roll: [[0, 0], [0.32, 5], [0.6, -6], [D, 0]], pitch: [[0, 0], [0.32, -7], [0.55, 4], [D, 0]], y: [[0, 0], [0.32, 0.018], [0.55, -0.012], [D, 0]] }),
    R: kfs(t, { out: [[0, 0], [0.32, 50], [0.44, 16], [0.62, -48], [0.85, -34], [D, 0]], lift: [[0, 0], [0.32, 44], [0.5, 22], [0.7, 26], [D, 0]], elbow: [[0, 0], [0.32, 24], [0.55, 0], [D, 0]], wrist: [[0, 0], [0.32, 22], [0.5, 8], [D, 0]], open: [[0, 0], [0.3, 42], [0.45, 48], [0.53, -4], [0.9, 0], [D, 0]] }),
    L: kfs(t, { lift: [[0, 0], [0.32, 12], [D, 0]], out: [[0, 0], [0.32, -8], [D, 0]] })
  }));
}
// attack2: the hammer claw. It rears on its back legs with both claws high and shut (0-0.62 s), and brings them down
// together in front of it (the strike at 0.74 s), the shell dropping after them
{
  const D = 1.6; HIT.attack2 = 0.74;
  const cl = (t) => kfs(t, { lift: [[0, 0], [0.5, 72], [0.62, 76], [0.74, 4], [1.0, 2], [D, 0]], elbow: [[0, 0], [0.5, 30], [0.62, 34], [0.74, -6], [D, 0]], wrist: [[0, 0], [0.5, -10], [0.74, 6], [D, 0]], out: [[0, 0], [0.5, 12], [0.74, -14], [1.1, -8], [D, 0]], open: [[0, 0], [0.4, -6], [D, 0]] });
  bake('attack2', D, grounded(D, (t) => stand({
    body: kfs(t, { pitch: [[0, 0], [0.5, -18], [0.62, -20], [0.74, 8], [0.95, 5], [D, 0]], y: [[0, 0], [0.5, 0.04], [0.62, 0.045], [0.74, -0.025], [1.0, -0.015], [D, 0]], z: [[0, 0], [0.5, -0.02], [0.74, 0.03], [D, 0]] }),
    L: cl(t), R: cl(t)
  })));
}
// slam: it rears up high with its claws spread and drops its whole weight, the claws flung wide on the ground (0.82 s)
{
  const D = 1.8; HIT.slam = 0.82;
  const cl = (t) => kfs(t, { out: [[0, 0], [0.55, 36], [0.82, 46], [1.2, 30], [D, 0]], lift: [[0, 0], [0.55, 56], [0.68, 62], [0.82, 2], [1.2, 2], [D, 0]], elbow: [[0, 0], [0.55, 20], [0.82, -10], [D, 0]], open: [[0, 0], [0.55, 36], [0.82, 10], [D, 0]] });
  bake('slam', D, grounded(D, (t) => {
    const sp = kf(t, [[0, 0], [0.7, 0], [0.84, 0.07], [1.3, 0.05], [D, 0]]);
    return stand({
      body: kfs(t, { pitch: [[0, 0], [0.55, -28], [0.68, -30], [0.82, 6], [1.05, 3], [D, 0]], y: [[0, 0], [0.55, 0.07], [0.68, 0.075], [0.82, -0.06], [1.1, -0.05], [D, 0]] }),
      L: cl(t), R: cl(t),
      at: (g) => { const c = bindPos[g.c0]; return g.T0.clone().sub(c).multiplyScalar(1 + sp).add(c).setY(g.T0.y); }
    });
  }));
}
// rear: up on its back legs, the claws wide and high, snapping, the front legs lifted (the tide's warning, the turn)
{
  const D = 2.4;
  bake('rear', D, (t) => {
    const up = kf(t, [[0, 0], [0.6, 1], [1.7, 1], [D, 0]]), snap = up * (22 + 22 * Math.sin(TAU * 3 * t));
    const cl = { out: 38 * up, lift: 64 * up + 4 * Math.sin(TAU * 1.5 * t) * up, elbow: 24 * up, wrist: -6 * up, open: snap };
    return stand({
      body: { pitch: -25 * up + 2 * Math.sin(TAU * t / 1.1) * up, y: 0.068 * up, z: -0.015 * up },
      L: cl, R: cl, life: 1.4, t, dur: D,
      at: (g) => (g.k === 'A' ? g.T0.clone().add(V(0, 0.07 * up, 0.04 * up)) : g.T0)
    });
  });
}
// hit: jolted back and up, claws flinching up and open
{
  const D = 0.55;
  bake('hit', D, (t) => stand({
    body: kfs(t, { pitch: [[0, 0], [0.08, -8], [D, 0]], z: [[0, 0], [0.08, -0.025], [D, 0]], y: [[0, 0], [0.08, 0.012], [D, 0]], roll: [[0, 0], [0.1, 3], [D, 0]] }),
    L: kfs(t, { lift: [[0, 0], [0.08, 14], [D, 0]], out: [[0, 0], [0.08, 10], [D, 0]], open: [[0, 0], [0.08, 20], [D, 0]] }),
    R: kfs(t, { lift: [[0, 0], [0.1, 12], [D, 0]], out: [[0, 0], [0.1, 8], [D, 0]], open: [[0, 0], [0.1, 18], [D, 0]] })
  }));
}
// daze (loops): sagging and swaying, the claws limp and open, a leg twitching
{
  const D = 2.4;
  bake('daze', D, (t) => {
    const ph = (TAU * t) / D;
    return stand({
      body: { y: -0.045 + 0.006 * Math.sin(2 * ph), roll: 6 * Math.sin(ph), yaw: 4 * Math.sin(ph + 1), pitch: 5 + 2 * Math.sin(2 * ph) },
      L: { lift: 20 + 3 * Math.sin(ph), out: 12, open: 14 + 4 * Math.sin(ph + 2) }, R: { lift: 20 + 3 * Math.sin(ph + 2), out: 12, open: 12 },
      life: 0.4, t, dur: D,
      at: (g) => (g.k + g.s === 'AL' ? g.T0.clone().add(V(0, 0.035 * Math.pow(Math.max(0, Math.sin(2 * ph)), 4), 0)) : g.T0)
    });
  }, { loop: true });
}
// die: a spasm (claws flung up, legs flared), then it collapses onto its belly, rolling a little to one side, the legs
// sprawled flat out round it and the claws dropped open; a last twitch of the legs
{
  const D = 2.4;
  const at = (t) => {
    const sp = bump(t, 0, 0.4), col = kf(t, [[0, 0], [0.35, 0], [0.95, 1]]), tw = bump(t, 1.35, 1.75);
    const b = { pitch: -10 * sp + 5 * col, y: 0.02 * sp - 0.105 * col, roll: 12 * col, yaw: 5 * col };
    const cl = (s) => ({ lift: 40 * sp + 8 * col, out: 10 * sp + 26 * col, open: 40 * sp + 26 * col, elbow: -6 * col, wrist: -18 * col });
    const flare = 1 + 0.08 * sp + 0.2 * col;
    const P = stand({ body: b, L: cl('L'), R: cl('R'), at: (g) => {
      const c = bindPos[g.c0], f = flare + (g.s === 'R' ? 0.06 : -0.04) * col;
      const T = g.T0.clone().sub(c).multiplyScalar(f).add(c).setY(g.T0.y);
      if (g.k !== 'B') T.y += 0.03 * tw;
      return T;
    } });
    // the claws laid down on the ground as the shell drops, out to the sides
    if (col > 0) { const Q = clonePose(P); for (const s of SIDES) clawIK(Q, s, V((s === 'L' ? 1 : -1) * (0.26 + 0.1 * col), 0.03 - 0.02 * col, 0.48 - 0.04 * col)); return mixPose(P, Q, col); }
    return P;
  };
  bake('die', D, grounded(D, at));
}
// rock: the dormant boulder, held
bake('rock', 1, () => clonePose(ROCK), { fps: 2 });
// wake: the boulder shudders, then unfolds and stands, claws spread wide once, and settles
{
  const D = 2.0;
  bake('wake', D, grounded(D, (t) => {
    const sh = env(t, 0.02, 0.1, 0.4, 0.6), w = kf(t, [[0, 0], [0.45, 0], [1.4, 1]]), thr = env(t, 1.3, 1.55, 1.7, D);
    const S = stand({ L: { out: 22 * thr, lift: 30 * thr, open: 40 * thr }, R: { out: 22 * thr, lift: 30 * thr, open: 40 * thr }, body: { pitch: -6 * thr, y: 0.01 * thr }, life: 0.8, t, dur: D });
    const P = mixPose(ROCK, S, w);
    return body(P, { x: 0.004 * sh * Math.sin(TAU * 13 * t), roll: 2 * sh * Math.sin(TAU * 11 * t + 1) });
  }));
}
// settle: from standing it sinks with a long groan, folds into the rock and lies still (held: it ends as 'rock')
{
  const D = 2.2;
  bake('settle', D, grounded(D, (t) => {
    const w = kf(t, [[0, 0], [0.3, 0], [1.9, 1]]), gr = env(t, 0, 0.2, 0.5, 1.6) * (1 - w);
    const S = stand({ body: { pitch: -4 * gr, y: 0.012 * gr } });
    const P = mixPose(S, ROCK, w);
    return w >= 1 ? P : body(P, { roll: 2.2 * Math.sin(TAU * t / 1.4) * (1 - w) * w * 4 });
  }));
}
// dive: crouches, then sinks straight down out of sight (it ends under the ground: the game hides it)
{
  const D = 1.5;
  bake('dive', D, (t) => {
    const cr = kf(t, [[0, 0], [0.35, 1]]), w = kf(t, [[0, 0], [0.35, 0], [1.0, 1]]), sink = kf(t, [[0, 0], [0.35, 0], [D, 1]]);
    const S = stand({ body: { y: -0.04 * cr, pitch: 4 * cr }, L: { lift: -4 * cr, out: -10 * cr }, R: { lift: -4 * cr, out: -10 * cr } });
    return body(mixPose(S, ROCK, w), { y: -0.75 * sink, pitch: 6 * sink });
  });
}
// rise: bursts up out of the water from below, claws flung high, drops onto its legs (the strike at 0.62 s) and shakes off
{
  const D = 1.5; HIT.rise = 0.62;
  bake('rise', D, (t) => {
    const w = kf(t, [[0, 0], [0.25, 0], [0.55, 1]]);
    const cl = kfs(t, { lift: [[0, 0], [0.4, 62], [0.62, 2], [D, 0]], out: [[0, 0], [0.4, 36], [0.62, 12], [D, 0]], open: [[0, 0], [0.4, 42], [0.62, 0], [D, 0]], elbow: [[0, 0], [0.4, 24], [0.62, 0], [D, 0]] });
    const b = kfs(t, { y: [[0, -0.75], [0.42, 0.06], [0.62, -0.02], [0.9, 0.005], [D, 0]], pitch: [[0, -10], [0.42, -14], [0.62, 5], [D, 0]] });
    b.roll = 4 * env(t, 0.7, 0.85, 1.1, D) * Math.sin(TAU * 4 * t);
    const S = stand({ body: b, L: cl, R: cl });
    const T = body(claws(clonePose(ROCK), cl), { y: b.y, pitch: b.pitch });
    return w >= 1 ? S : mixPose(T, S, w);
  });
}
// breach: out of the water nose-up, claws forward and open, arcing over and snapping shut (the strike at 0.42 s), down
// onto its legs; in place (the game carries it along the line)
{
  const D = 1.3; HIT.breach = 0.42;
  bake('breach', D, (t) => {
    const w = kf(t, [[0, 0], [0.5, 0], [0.75, 1]]);
    const cl = kfs(t, { lift: [[0, 22], [0.3, 30], [0.42, 16], [0.7, 0], [D, 0]], out: [[0, -6], [0.3, -12], [0.42, -20], [0.7, 0], [D, 0]], open: [[0, 30], [0.3, 46], [0.42, -4], [0.6, 0], [D, 0]], wrist: [[0, 10], [0.3, 20], [0.6, 0], [D, 0]] });
    const b = kfs(t, { y: [[0, -0.75], [0.3, 0.16], [0.45, 0.2], [0.66, 0.0], [0.78, -0.03], [1.0, 0.005], [D, 0]], pitch: [[0, -30], [0.3, -24], [0.45, -6], [0.62, 12], [0.78, 4], [D, 0]] });
    const S = stand({ body: b, L: cl, R: cl });
    const F = restPose(); body(F, b); claws(F, cl);
    for (const k of LEGKEYS) legFK(F, LEG[k], { swing: -18, lift: 8, bend: 40 });
    return mixPose(F, S, w);
  });
}
// overturned (5 s, held): it lurches through the ice, rolls onto its back (spire down in the water, the soft underside
// up), flails with every leg and claw, and at 4.2 s heaves itself right way up again onto its legs
{
  const D = 5.0; INFO_EX.overturned = { down: 0.85, up: 4.2 };
  const flail = (P, t, k) => {
    for (const lk of LEGKEYS) {
      const g = LEG[lk], ph = TAU * 1.1 * t + (g.k.charCodeAt(0) - 65) * 1.3 + (g.s === 'L' ? 0 : 2.1);
      legFK(P, g, { swing: 24 * k * Math.sin(ph), lift: k * (14 + 18 * Math.sin(ph + 1.2)), bend: k * (30 + 26 * Math.sin(ph + 2.4)) });
    }
    for (const s of SIDES) { const ph = TAU * 0.9 * t + (s === 'L' ? 0 : 1.7); claw(P, s, { lift: k * (24 + 26 * Math.sin(ph)), out: k * 20 * Math.sin(ph + 1), open: k * (24 + 22 * Math.sin(TAU * 2.3 * t + (s === 'L' ? 0 : 1))) }); }
    return P;
  };
  bake('overturned', D, (t) => {
    const roll = kf(t, [[0, 0], [0.25, -6], [0.85, 160], [4.2, 160], [4.95, 0]]), ins = kf(t, [[0, 0], [0.3, 0], [0.85, 1], [4.2, 1], [4.9, 0]]);
    const b = { roll: roll + 6 * ins * Math.sin(TAU * 0.6 * t), y: kf(t, [[0, 0], [0.25, -0.05], [0.85, -0.07], [4.2, -0.07], [4.95, 0]]) + 0.01 * ins * Math.sin(TAU * 1.3 * t), pitch: kf(t, [[0, 0], [0.25, 8], [0.85, 0], [D, 0]]) };
    const F = flail(body(restPose(), b), t, ins);
    if (ins >= 1) return F;
    const S = stand({ body: b });
    return mixPose(S, F, ins);
  });
}
// flounder (loops, 1.2 s): through the ice, sunk to the shell in the water, tilted, thrashing every leg and the claws
{
  const D = 1.2;
  bake('flounder', D, (t) => {
    const ph = (TAU * t) / D, P = restPose();
    body(P, { y: -0.16 + 0.015 * Math.sin(2 * ph), pitch: 8 + 5 * Math.sin(ph), roll: 10 * Math.sin(ph + 0.5), yaw: 4 * Math.sin(ph + 2) });
    for (const lk of LEGKEYS) { const g = LEG[lk], q = 2 * ph + (g.k.charCodeAt(0) - 65) * 1.4 + (g.s === 'L' ? 0 : 2.2); legFK(P, g, { swing: 25 * Math.sin(q), lift: 15 + 20 * Math.sin(q + 1), bend: 22 * Math.sin(q + 2) }); }
    for (const s of SIDES) { const q = 2 * ph + (s === 'L' ? 0 : 1.9); claw(P, s, { lift: 36 + 20 * Math.sin(q), out: 15 * Math.sin(q + 1), open: 25 + 25 * Math.sin(2 * q) }); }
    return headLife(P, t, D, 1.2, 2);
  }, { loop: true });
}
// shake: a violent shudder of the whole shell, a hop and a stamp (the strike at 0.6 s), the claws flung out
{
  const D = 1.3; HIT.shake = 0.6;
  bake('shake', D, (t) => {
    const e = env(t, 0.1, 0.3, 0.8, 1.2), w = TAU * 5.5 * t;
    const stamp = bump(t, 0.38, 0.62);
    const cl = kfs(t, { out: [[0, 0], [0.4, 30], [0.6, 45], [0.9, 20], [D, 0]], lift: [[0, 0], [0.4, 28], [0.6, 22], [0.9, 10], [D, 0]] });
    cl.open = 20 * e * (1 + Math.sin(w * 0.8));
    return stand({
      body: { y: kf(t, [[0, 0], [0.25, -0.03], [0.42, 0.035], [0.6, -0.035], [0.8, -0.01], [D, 0]]), roll: 12 * e * Math.sin(w), yaw: 6 * e * Math.sin(w + 1), pitch: 3 * e * Math.sin(w * 0.5) },
      L: cl, R: cl,
      at: (g) => (g.k !== 'B' ? g.T0.clone().add(V(0, 0.045 * stamp, 0)) : g.T0)
    });
  });
}
// ---------- 10. finish ----------
for (const [k, v] of Object.entries(INFO)) console.log('  ' + k.padEnd(11) + v);
// the socket: on the summit of the spire, 5 cm under the top, centred in the rock there (the code ruin stands on it)
const SOCK = (() => {
  const b = PARTS.find((p) => p.kind === 'body'), top = Math.max(...Array.from({ length: b.pos.length / 3 }, (_, i) => b.pos[i * 3 + 1])), ys = top - 0.05;
  let x0 = 9, x1 = -9, z0 = 9, z1 = -9, tx = 0, tz = 0;
  for (let i = 0; i < b.pos.length; i += 3) {
    if (b.pos[i + 1] === top) { tx = b.pos[i]; tz = b.pos[i + 2]; }
    if (Math.abs(b.pos[i + 1] - ys) < 0.012) { x0 = Math.min(x0, b.pos[i]); x1 = Math.max(x1, b.pos[i]); z0 = Math.min(z0, b.pos[i + 2]); z1 = Math.max(z1, b.pos[i + 2]); }
  }
  return { at: V((x0 + x1) / 2, ys, (z0 + z1) / 2), r: Math.min(x1 - x0, z1 - z0) / 2, top: V(tx, top, tz) };
})();
jNodes[0].addChild(doc.createNode('socket_light').setTranslation(SOCK.at.clone().sub(bindPos[0]).toArray()));
const used = slimRig(doc, /^grip_|^socket_/);
const r3 = (v) => +v.toFixed(3);
const RB = (() => { const b = new THREE.Box3(); for (const p of skinned(fk(restPose()), 1)) b.expandByPoint(p); return b; })();
const extras = {
  hit: Object.fromEntries(Object.entries(HIT).filter(([k]) => !ONLY.length || ONLY.includes(k))),
  height: r3(RB.max.y), legSpan: r3(RB.max.x - RB.min.x), length: r3(RB.max.z - RB.min.z),
  walkSpeed: r3(speedOf(GAIT.walk)), runSpeed: r3(speedOf(GAIT.run)), sideSpeed: r3(speedOf(GAIT.side)), crawlSpeed: r3(speedOf(GAIT.crawl)),
  socket: 'socket_light', socketBone: 'root', socketAt: SOCK.at.toArray().map(r3), socketR: r3(SOCK.r), spireTop: SOCK.top.toArray().map(r3),
  overturned: INFO_EX.overturned,
  credit: '"Crab mountain" by pro100voron (sketchfab.com/pro100voron), CC-BY 4.0 - re-rigged, decimated, re-textured; every animation but the idle made for Skotos',
  license: 'CC-BY-4.0'
};
if (DBG) await io.write(`${DBG}/crab_raw.glb`, doc);
const bytes = await finish(doc, OUT, extras, { base: 1024, aux: 512 });
console.log('crab', (bytes / 1024).toFixed(0) + ' KB', used, 'joints', JSON.stringify(extras));
