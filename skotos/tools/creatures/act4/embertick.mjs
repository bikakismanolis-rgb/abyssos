// The Ember Tick (Πυροτσιμπούρι): "Fireborne Blight Drone" by HighPolyDensity (sketchfab.com/HighPolyDensity), CC-BY 4.0
// -> src/assets/creatures/embertick.glb. A six-legged brood bug with a pair of fore-pincers, four eyes, a swollen
// abdomen and a dorsal spike. The source has six clips (Defensive Idle, Walk, Burrow, Light Attack, Heavy Attack,
// Falter) on an FK leg rig with baked IK; its IK targets and end bones are dropped with the rest of the unweighted joints.
// 16k triangles in 25 parts are thinned to about 3.5k (the eight small mouth teeth go: nothing sees them from above) and
// merged into one skinned primitive with one material on a 1024 x 768 atlas (body, legs, pincers, spike, eyes).
// The red-brown hide is graded to charcoal chitin (a little ash on what faces up); lava-orange light runs in its seams
// (the borders of plates laid on the surface as 3D cells, so they run on across UV seams, and the mesh's own grooves,
// measured on the full-res source: leg sockets, the waist, the eye sockets, the mouth); the abdomen is a sac of molten
// light under a crust of small dark plates; the pincer, spike and claw tips are heated orange and the four eyes burn.
// Emissive factor 1 is the resting glow (it is baked into the map); creatures.js breathes the intensity.
// Clips (in place; rotations plus the hips' translation only): idle, walk, run (a fast skitter), spawn (bursts up out of
// the ash: its Burrow played backwards, from below the ground), attack (a lunge with a pincer snap), leap (a 0.6 s
// crouch with the abdomen pumping, then a launch with the pincers spread and the legs flung forward; the game carries it
// 5 m and lifts it, the clip stays in place), cling (a held, legs-wrapped pose on the hero's back, loopable), hit, die.
// The game holds the tick at y 0.95 m, 0.28 m behind the hero's centre, turned to face away from him: in 'cling' the body
// is pitched head-down so its belly and legs face local -Z (the hero's back), its back and glowing abdomen face out.
// usage: node embertick.mjs [source.glb] [out.glb] [--raw keeps the source clips] [--dbg=<dir> also writes an
//        uncompressed copy and the atlas maps as PNG]
import { MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync } from 'node:fs';
import { simplifyPrim } from '../../envlib.mjs';
import { load, normalise, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds, skinnedPoints,
  X, Y, Z, deg, bump, ramp, smooth, env, THREE, sharp, io } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/embertick/model.glb', OUT = new URL('../../../src/assets/creatures/embertick.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
if (DBG) mkdirSync(DBG, { recursive: true });
const LENGTH = 0.58;            // nose of the pincers to the tip of the spike, metres (the legs span about 0.8 m)
// triangles kept per part (the source's are in brackets)
const TRIS = { body: 1350 /* 4418 */, leg2: 85 /* 390-438 */, leg3: 165 /* 1008-1024 */, pincer: 130 /* 608 */, stinger: 120 /* 620 */, eyes: 72 /* 448 */ };

const doc = await load(SRC);
const R = doc.getRoot(), buf = R.listBuffers()[0];
const SRCA = Object.fromEntries(R.listAnimations().map((a) => [a.getName(), a]));
const IDLE = SRCA['Defensive Idle'];

// ---------- 1. names, and the idle's first frame as the rest pose ----------
// (the source's node rest pose is a lopsided bind pose; with the idle frame as rest, the procedural keys below rotate
// about axes as the bug actually stands)
for (const n of R.listNodes()) {
  let nm = n.getName().replace(/_\d+$/, '');
  const leg = nm.match(/^Leg_(Front|Mid|Back)_(\d)_(L|R)(_end)?$/);
  if (leg) nm = `leg${leg[1][0]}${leg[2]}_${leg[3]}${leg[4] || ''}`;
  else nm = { Root: 'root', Spine_3: 'hips', Spine_2: 'spine', Spine_1: 'chest', Head: 'head', Abdomen: 'abdomen', Abdomen_end: 'abdomen_end', Under_Jaw: 'mouth', Under_Jaw_end: 'mouth_end',
    Pincer_Jaw_L: 'jaw_L', Pincer_Jaw_R: 'jaw_R', Pincer_L: 'pincer_L', Pincer_R: 'pincer_R', Pincer_L_end: 'pincer_L_end', Pincer_R_end: 'pincer_R_end' }[nm] || n.getName();
  n.setName(nm);
}
{
  const L = locals(doc, IDLE, 0);
  for (const n of R.listNodes()) { const l = L.get(n); n.setTranslation(l.p.toArray()).setRotation(l.q.toArray()).setScale(l.s.toArray()); }
}
const SIDES = ['L', 'R'], LEGS = ['F', 'M', 'B'];
const parentOf = (n) => R.listNodes().find((p) => p.listChildren().includes(n));

// ---------- 2. per-vertex fields on the full-res source (rest pose): abdomen weight, up-facing, grooves, hot tips ----------
const parts = [];   // { node, prim, kind, mat, main, fields: { abd, up, cav, tip, px, py, pz } }
{
  const W = worlds(doc, locals(doc, null, 0));
  const P = (name) => new THREE.Vector3().setFromMatrixPosition(W.get(byName(doc, name)));
  for (const node of R.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const skin = node.getSkin(), js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
    const M = js.map((j, i) => W.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16)));
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial().getName();
      const Pa = prim.getAttribute('POSITION'), Na = prim.getAttribute('NORMAL'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), I = prim.getIndices().getArray();
      const n = Pa.getCount(), e = [], je = [], we = [];
      const pos = [], nor = [], abd = new Float32Array(n), up = new Float32Array(n), cav = new Float32Array(n), tip = new Float32Array(n);
      const bones = new Map();
      for (let i = 0; i < n; i++) {
        J.getElement(i, je); Wt.getElement(i, we);
        const m = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        for (let k = 0; k < 4; k++) if (we[k]) {
          for (let c = 0; c < 16; c++) m.elements[c] += M[je[k]].elements[c] * we[k];
          const bn = js[je[k]].getName(); bones.set(bn, (bones.get(bn) || 0) + we[k]);
          if (bn === 'abdomen') abd[i] += we[k];
        }
        pos.push(new THREE.Vector3(...Pa.getElement(i, e)).applyMatrix4(m));
        nor.push(new THREE.Vector3(...Na.getElement(i, e)).applyMatrix3(new THREE.Matrix3().setFromMatrix4(m)).normalize());
        up[i] = nor[i].y;
      }
      const main = [...bones.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const kind = mat === 'Body' ? 'body' : mat === 'Fore_Teeth' ? 'teeth' : mat === 'Eyes' ? 'eyes' : mat === 'Stinger' ? 'stinger' : mat === 'Fore_Pincers' ? 'pincer' : /^leg.3_/.test(main) ? 'leg3' : 'leg2';
      // grooves: how far a vertex's 2-ring neighbours stand above its tangent plane (welded by position: UV seams split vertices)
      {
        const Pb = [], e2 = []; for (let i = 0; i < n; i++) Pb.push(new THREE.Vector3(...Pa.getElement(i, e2)));
        const key = (v) => v.toArray().map((x) => Math.round(x * 1e4)).join(','), grp = new Map(), gid = [];
        for (let i = 0; i < n; i++) { const k = key(Pb[i]); if (!grp.has(k)) grp.set(k, grp.size); gid.push(grp.get(k)); }
        const G = grp.size, gp = new Array(G), gn = Array.from({ length: G }, () => new THREE.Vector3()), nb = Array.from({ length: G }, () => new Set());
        for (let i = 0; i < n; i++) { gp[gid[i]] = Pb[i]; gn[gid[i]].add(new THREE.Vector3(...Na.getElement(i, e2))); }
        gn.forEach((v) => v.normalize());
        for (let t = 0; t < I.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) nb[gid[I[t + a]]].add(gid[I[t + b]]);
        const gc = new Float32Array(G);
        for (let g = 0; g < G; g++) {
          const ring = new Set(nb[g]); for (const h of nb[g]) for (const k of nb[h]) ring.add(k); ring.delete(g);
          let s = 0; for (const h of ring) { const d = gp[h].clone().sub(gp[g]); s += gn[g].dot(d) / d.length(); }
          gc[g] = s / Math.max(1, ring.size);
        }
        for (let i = 0; i < n; i++) cav[i] = gc[gid[i]];
      }
      // heated tips: the last stretch of each pincer, spike and claw, measured from the joint it hangs from
      const from = kind === 'pincer' ? P(main.replace('pincer', 'jaw')) : kind === 'stinger' ? P('abdomen') : kind === 'leg3' ? P(main) : null;
      if (from) {
        let dmax = 0; for (const p of pos) dmax = Math.max(dmax, p.distanceTo(from));
        const [a, b] = kind === 'leg3' ? [0.8, 0.2] : kind === 'pincer' ? [0.62, 0.38] : [0.6, 0.4];
        for (let i = 0; i < n; i++) tip[i] = smooth((pos[i].distanceTo(from) / dmax - a) / b);
      }
      const px = new Float32Array(pos.map((v) => v.x)), py = new Float32Array(pos.map((v) => v.y)), pz = new Float32Array(pos.map((v) => v.z));
      parts.push({ node, prim, kind, mat, main, fields: { abd, up, cav, tip, px, py, pz } });
    }
  }
}

// ---------- 3. the atlas: charcoal chitin, lava seams, the molten abdomen, hot tips ----------
const AW = 1024, AH = 768;
const CELLS = { Body: [0, 0, 512, 512], Legs: [512, 0, 512, 512], Fore_Pincers: [0, 512, 256, 256], Stinger: [256, 512, 256, 256], Eyes: [512, 512, 256, 256] };
const PAD = 3; // px of edge-extended margin inside each cell (mip bleed)
const lum = (r, g, b) => (0.3 * r + 0.59 * g + 0.11 * b) / 255;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mixc = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
// per-texel values of per-vertex fields, rasterised in a cell's UV space (w x h) and dilated over the island borders
function rasterise(list, w, h, key) {
  const f = new Float32Array(w * h), cov = new Uint8Array(w * h), e = [];
  for (const pt of list) {
    const uv = pt.prim.getAttribute('TEXCOORD_0'), I = pt.prim.getIndices().getArray(), val = pt.fields[key];
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
  }
  for (let pass = 0; pass < 6; pass++) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x; if (cov[k]) continue;
      let s = 0, c = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const kk = yy * w + xx; if (cov[kk]) { s += f[kk]; c++; } }
      if (c) add.push([k, s / c]);
    }
    for (const [k, v] of add) { f[k] = v; cov[k] = 1; }
  }
  return { f, cov };
}
const LAVA = [255, 104, 22], HOT = [255, 176, 70], EMBER = [214, 58, 10];
const atlas = { base: Buffer.alloc(AW * AH * 3), nrm: Buffer.alloc(AW * AH * 3), em: Buffer.alloc(AW * AH * 3) };
for (let i = 0; i < AW * AH; i++) { atlas.nrm[i * 3] = 128; atlas.nrm[i * 3 + 1] = 128; atlas.nrm[i * 3 + 2] = 255; }
async function cell(matName, shade) {
  const [cx, cy, cw, ch] = CELLS[matName];
  const w = cw - 2 * PAD, h = ch - 2 * PAD;
  const mat = R.listMaterials().find((m) => m.getName() === matName);
  const list = parts.filter((p) => p.mat === matName);
  const src = await sharp(Buffer.from(mat.getBaseColorTexture().getImage())).removeAlpha().resize(w, h).raw().toBuffer();
  const orm = await sharp(Buffer.from(mat.getMetallicRoughnessTexture().getImage())).removeAlpha().resize(w, h).raw().toBuffer();
  const nrm = await sharp(Buffer.from(mat.getNormalTexture().getImage())).removeAlpha().resize(w, h).raw().toBuffer();
  const F = {}; for (const k of ['abd', 'up', 'cav', 'tip', 'px', 'py', 'pz']) F[k] = rasterise(list, w, h, k).f;
  const base = Buffer.alloc(w * h * 3), em = Buffer.alloc(w * h * 3);
  for (let k = 0; k < w * h; k++) {
    const r = src[k * 3], g = src[k * 3 + 1], b = src[k * 3 + 2];
    const o = shade({ l: lum(r, g, b), ao: orm[k * 3] / 255, abd: F.abd[k], up: F.up[k], cav: F.cav[k], tip: F.tip[k], p: [F.px[k], F.py[k], F.pz[k]] });
    for (let q = 0; q < 3; q++) { base[k * 3 + q] = Math.min(255, Math.max(0, o.c[q])); em[k * 3 + q] = Math.min(255, Math.max(0, o.e[q])); }
  }
  // into the atlas, the margin edge-extended
  const put = async (img, dst) => {
    const ext = await sharp(img, { raw: { width: w, height: h, channels: 3 } }).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, extendWith: 'copy' }).raw().toBuffer();
    for (let y = 0; y < ch; y++) ext.copy(dst, ((cy + y) * AW + cx) * 3, y * cw * 3, (y + 1) * cw * 3);
  };
  await put(base, atlas.base); await put(em, atlas.em); await put(nrm, atlas.nrm);
}
// 3D cell noise on the surface (rest-pose positions, source units): plates whose borders are seams, continuous across
// UV seams. vor(p, size) -> { b: distance to the nearest cell border, c: distance to the cell's seed, id }
const hash3 = (i, j, k, s) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vor(p, S) {
  const g = p.map((v) => Math.floor(v / S));
  let d1 = 1e9, d2 = 1e9, s1 = null, s2 = null, id = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
    const c = [g[0] + i, g[1] + j, g[2] + k], sd = [0, 1, 2].map((a) => (c[a] + 0.15 + 0.7 * hash3(c[0], c[1], c[2], a)) * S);
    const d = Math.hypot(sd[0] - p[0], sd[1] - p[1], sd[2] - p[2]);
    if (d < d1) { d2 = d1; s2 = s1; d1 = d; s1 = sd; id = hash3(c[0], c[1], c[2], 7); } else if (d < d2) { d2 = d; s2 = sd; }
  }
  const sep = Math.hypot(s2[0] - s1[0], s2[1] - s1[1], s2[2] - s1[2]);
  return { b: (d2 * d2 - d1 * d1) / (2 * sep), c: d1, id };
}
const vnoise = (p, S) => { // trilinear value noise
  const q = p.map((v) => v / S), g = q.map(Math.floor), f = q.map((v, a) => smooth(v - g[a]));
  let o = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) o += hash3(g[0] + i, g[1] + j, g[2] + k, 3) * (i ? f[0] : 1 - f[0]) * (j ? f[1] : 1 - f[1]) * (k ? f[2] : 1 - f[2]);
  return o;
};
const heatCol = (h) => mixc(mixc(EMBER, LAVA, smooth(h / 0.55)), HOT, smooth((h - 0.75) / 0.25)).map((x) => x * Math.min(1, h * 1.25));
// chitin: near-black with a warm undertone; the source's mottling kept as value; ash dust settles on what faces up
const chitin = (l, ao, up, p) => {
  const x = clamp01((l - 0.05) / 0.5);
  let c = mixc([15, 13, 12], [50, 46, 43], Math.pow(x, 0.9));
  c = mixc(c, [86, 82, 78], 0.18 * smooth((up - 0.3) / 0.5) * vnoise(p, 0.05));
  const a = 0.55 + 0.45 * ao; return c.map((v) => v * a);
};
await cell('Body', (s) => {
  const A = smooth((s.abd - 0.2) / 0.5);
  // head and thorax: broad plates with thin seams, and the deep grooves (leg sockets, the waist) lit from inside
  const vt = vor(s.p, 0.12), seam = 1 - smooth((vt.b - 0.002) / 0.006), groove = smooth((s.cav - 0.1) / 0.2);
  const hT = Math.max(seam * 0.5, groove * 0.8);
  // the abdomen: a crust of small dark plates over molten light; the gaps burn, the plates smoulder unevenly
  const va = vor(s.p, 0.06), gap = 1 - smooth((va.b - 0.003) / 0.008), lump = vnoise(s.p, 0.09);
  const hA = Math.max(gap, 0.1 + 0.28 * lump * lump + 0.18 * (1 - smooth((va.b - 0.008) / 0.012)) + 0.2 * groove);
  const heat = hT * (1 - A) + hA * A;
  let c = chitin(s.l, s.ao, s.up * (1 - A), s.p);
  c = mixc(c, [30, 18, 15], A * 0.6);
  c = mixc(c, [92, 30, 8], clamp01(Math.max(hT * (1 - A), gap * A)));
  return { c, e: heatCol(heat) };
});
await cell('Legs', (s) => {
  const v = vor(s.p, 0.08), seam = 1 - smooth((v.b - 0.0015) / 0.004), groove = smooth((s.cav - 0.15) / 0.25);
  const heat = clamp01(Math.max(seam * 0.22, groove * 0.5, s.tip * 0.85));
  let c = chitin(s.l, s.ao, s.up, s.p);
  c = mixc(c, [80, 26, 8], heat);
  return { c, e: heatCol(heat) };
});
await cell('Fore_Pincers', (s) => {
  const v = vor(s.p, 0.07), seam = 1 - smooth((v.b - 0.0015) / 0.004);
  const heat = clamp01(Math.max(seam * 0.25, s.tip));
  let c = chitin(s.l, s.ao, s.up, s.p);
  c = mixc(c, [92, 30, 8], heat);
  return { c, e: heatCol(heat) };
});
await cell('Stinger', (s) => {
  const v = vor(s.p, 0.1), seam = 1 - smooth((v.b - 0.002) / 0.005), groove = smooth((s.cav - 0.15) / 0.25);
  const heat = clamp01(Math.max(seam * 0.35, groove * 0.4, s.tip * 0.95));
  let c = chitin(s.l, s.ao, s.up, s.p);
  c = mixc(c, [92, 30, 8], heat);
  return { c, e: heatCol(heat) };
});
// four glossy black eyes with an ember deep in each
await cell('Eyes', () => ({ c: [26, 10, 6], e: [230, 92, 20] }));
const atlasPng = async (b, w = AW, h = AH) => sharp(b, { raw: { width: AW, height: AH, channels: 3 } }).resize(w, h).png().toBuffer();
if (DBG) for (const [k, b] of Object.entries(atlas)) await sharp(b, { raw: { width: AW, height: AH, channels: 3 } }).png().toFile(`${DBG}/atlas_${k}.png`);

// ---------- 4. thin it out and merge into one primitive on the atlas ----------
await MeshoptSimplifier.ready;
let tris0 = 0, tris1 = 0;
const keep = parts.filter((p) => p.kind !== 'teeth');
for (const p of parts) if (p.kind === 'teeth') p.node.setMesh(null).setSkin(null);
for (const p of keep) {
  for (const s of ['TANGENT', 'TEXCOORD_1', 'COLOR_0']) p.prim.setAttribute(s, null);
  const before = p.prim.getIndices().getCount() / 3; tris0 += before;
  const mode = simplifyPrim(p.prim, Math.min(1, TRIS[p.kind] / before), 0.03);
  tris1 += p.prim.getIndices().getCount() / 3;
  p.mode = mode;
}
console.log('triangles', tris0, '->', tris1, keep.map((p) => `${p.kind}:${p.prim.getIndices().getCount() / 3}${p.mode === 'strict' ? '' : '(' + p.mode + ')'}`).join(' '));
const body = keep.find((p) => p.kind === 'body');
{
  const sem = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];
  const cat = Object.fromEntries(sem.map((s) => [s, []])), idx = []; let off = 0;
  const skin = body.node.getSkin();
  for (const p of keep) {
    if (p.node.getSkin() !== skin) throw new Error('parts on different skins');
    const [cx, cy, cw, ch] = CELLS[p.mat], e = [];
    for (const s of sem) {
      const a = p.prim.getAttribute(s);
      for (let i = 0; i < a.getCount(); i++) {
        a.getElement(i, e);
        if (s === 'TEXCOORD_0') cat[s].push((cx + PAD + e[0] * (cw - 2 * PAD)) / AW, (cy + PAD + e[1] * (ch - 2 * PAD)) / AH);
        else cat[s].push(...e);
      }
    }
    for (const i of p.prim.getIndices().getArray()) idx.push(i + off);
    off += p.prim.getAttribute('POSITION').getCount();
  }
  const types = { POSITION: ['VEC3', Float32Array], NORMAL: ['VEC3', Float32Array], TEXCOORD_0: ['VEC2', Float32Array], JOINTS_0: ['VEC4', Uint16Array], WEIGHTS_0: ['VEC4', Float32Array] };
  const mat = R.listMaterials().find((m) => m.getName() === 'Body');
  const q = doc.createPrimitive().setMaterial(mat).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
  for (const s of sem) q.setAttribute(s, doc.createAccessor().setType(types[s][0]).setArray(new types[s][1](cat[s])).setBuffer(buf));
  const mesh = doc.createMesh('embertick').addPrimitive(q);
  for (const p of keep) p.node.setMesh(null).setSkin(p === body ? skin : null);
  body.node.setMesh(mesh).setSkin(skin).setName('embertick_mesh');
  for (const m of R.listMeshes()) if (m !== mesh) m.dispose();
  // one material on the atlas
  for (const t of R.listTextures()) t.dispose();
  const tex = async (name, b) => doc.createTexture(name).setImage(await atlasPng(b)).setMimeType('image/png');
  mat.setName('embertick').setBaseColorTexture(await tex('embertick_base', atlas.base)).setNormalTexture(await tex('embertick_normal', atlas.nrm))
    .setEmissiveTexture(await tex('embertick_glow', atlas.em)).setEmissiveFactor([1, 1, 1])
    .setMetallicRoughnessTexture(null).setOcclusionTexture(null).setMetallicFactor(0).setRoughnessFactor(0.68).setBaseColorFactor([1, 1, 1, 1]).setDoubleSided(false);
  for (const m of R.listMaterials()) if (m !== mat) m.dispose();
  console.log('merged', idx.length / 3, 'triangles,', off, 'vertices');
}

// ---------- 5. size: nose to spike tip, the legs on the ground ----------
{
  const b0 = bounds(doc, null, 0, 1);
  normalise(doc, { scale: LENGTH / (b0.max.z - b0.min.z) });
}
const rb = bounds(doc, null, 0, 1);
console.log('rest bounds', rb.min.toArray().map((v) => +v.toFixed(3)), rb.max.toArray().map((v) => +v.toFixed(3)));

// ---------- 6. clips: every one baked as poses (rotations of the deform joints, the hips' translation) ----------
const FPS = 30;
const node = (n) => { const x = byName(doc, n); if (!x) throw new Error('no node ' + n); return x; };
const HIPS = node('hips');
const restL = locals(doc, null, 0), Wr = worlds(doc, restL);
const restWq = new Map(); for (const [n, M] of Wr) { const q = new THREE.Quaternion(); M.decompose(new THREE.Vector3(), q, new THREE.Vector3()); restWq.set(n, q); }
const at = (n, W) => new THREE.Vector3().setFromMatrixPosition(W.get(typeof n === 'string' ? node(n) : n));
const DEF = (() => {
  const prim = R.listMeshes()[0].listPrimitives()[0], skin = R.listSkins().find((s) => s.listJoints().length), js = skin.listJoints(), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0');
  const used = new Set(), je = [], we = [];
  for (let i = 0; i < J.getCount(); i++) { J.getElement(i, je); Wt.getElement(i, we); for (let k = 0; k < 4; k++) if (we[k] > 0) used.add(js[je[k]]); }
  return [...used];
})();
const clone = (L) => new Map([...L].map(([n, v]) => [n, { p: v.p.clone(), q: v.q.clone(), s: v.s.clone() }]));
const pose = (anim, t) => (anim ? locals(doc, anim, Math.max(0, Math.min(t, duration(anim)))) : clone(restL));
// a bone turned about a character-space axis (as the axis stands at rest), in the bone's own frame (makeClip's convention)
function rot(L, name, axis, a) {
  if (!a) return;
  const nd = node(name), ax = axis.clone().applyQuaternion(restWq.get(nd).clone().invert()).normalize();
  L.get(nd).q.multiply(new THREE.Quaternion().setFromAxisAngle(ax, a * deg));
}
// the whole body moved (metres) and turned about the hips joint, in character space
const parH = parentOf(HIPS), PINV3 = new THREE.Matrix3().setFromMatrix4(Wr.get(parH).clone().invert()), parQinv = restWq.get(parH).clone().invert();
const move = (L, v) => L.get(HIPS).p.add(new THREE.Vector3(...v).applyMatrix3(PINV3));
const turn = (L, axis, a) => { if (a) L.get(HIPS).q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis.clone().applyQuaternion(parQinv).normalize(), a * deg)); };
// legs: lift raises the claw (about the horizontal axis across the leg), fwd swings it toward +Z, bend curls the tibia down
const LEG = {};
for (const l of LEGS) for (const s of SIDES) {
  const g = { l, s, b2: `leg${l}2_${s}`, b3: `leg${l}3_${s}`, end: `leg${l}3_${s}_end` };
  const d = at(g.end, Wr).sub(at(g.b2, Wr)).setY(0).normalize();
  g.lift = d.clone().cross(Y).normalize(); g.side = Math.sign(d.x);
  LEG[l + s] = g;
}
const leg = (L, k, { lift = 0, fwd = 0, bend = 0, lift3 = 0 } = {}) => {
  const g = LEG[k]; rot(L, g.b2, g.lift, lift); rot(L, g.b2, Y, -fwd * g.side); rot(L, g.b3, g.lift, -bend + lift3);
};
const legs = (L, which, o) => { for (const k of Object.keys(LEG)) if (which.includes(k[0])) leg(L, k, typeof o === 'function' ? o(k) : o); };
const pincers = (L, open) => { rot(L, 'jaw_L', Y, open); rot(L, 'jaw_R', Y, -open); };
// two-bone IK: the claw onto a target (character space), the knee kept in its current bend plane
function worldRot(L, W, nd, q) { // pre-rotates a node by a world-space rotation about its own pivot
  const pq = new THREE.Quaternion(); W.get(parentOf(nd)).decompose(new THREE.Vector3(), pq, new THREE.Vector3());
  L.get(nd).q.premultiply(pq.clone().invert().multiply(q).multiply(pq));
}
function legIK(L, k, T) {
  const g = LEG[k], b2 = node(g.b2), b3 = node(g.b3), e = node(g.end);
  let W = worlds(doc, L);
  const H = at(b2, W), K = at(b3, W), F = at(e, W), a = H.distanceTo(K), b = K.distanceTo(F);
  const c = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, H.distanceTo(T)));
  const u = H.clone().sub(K).normalize(), v = F.clone().sub(K).normalize();
  const cur = Math.acos(Math.min(1, Math.max(-1, u.dot(v)))), want = Math.acos(Math.min(1, Math.max(-1, (a * a + b * b - c * c) / (2 * a * b))));
  const n = u.clone().cross(v).normalize();
  if (n.lengthSq() > 0.5) worldRot(L, W, b3, new THREE.Quaternion().setFromAxisAngle(n, want - cur));
  W = worlds(doc, L);
  const F2 = at(e, W);
  worldRot(L, W, b2, new THREE.Quaternion().setFromUnitVectors(F2.sub(H).normalize(), T.clone().sub(H).normalize()));
}
const TIP0 = Object.fromEntries(Object.entries(LEG).map(([k, g]) => [k, at(g.end, Wr)]));
// blends two poses bone by bone
const mixL = (A, B, k) => { if (k <= 0) return A; if (k >= 1) return B; const o = new Map(); for (const [n, a] of A) { const b = B.get(n); o.set(n, { p: a.p.clone().lerp(b.p, k), q: a.q.clone().slerp(b.q, k), s: a.s }); } return o; };
// writes poseAt(t) as a clip: rotations of every deform joint, translation of the hips only
function bake(name, dur, poseAt, o = {}) {
  const fps = o.fps || FPS, n = Math.max(2, Math.round(dur * fps) + 1), rows = [], times = new Float32Array(n);
  for (let i = 0; i < n; i++) { times[i] = (dur * i) / (n - 1); rows.push(poseAt(times[i])); }
  if (o.loop) rows[n - 1] = rows[0];
  const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(times).setBuffer(buf), anim = doc.createAnimation(name);
  for (const nd of [...DEF, ...(DEF.includes(HIPS) ? [] : [HIPS])]) for (const path of nd === HIPS ? ['rotation', 'translation'] : ['rotation']) {
    const k = path === 'rotation' ? 4 : 3, arr = new Float32Array(n * k); let prev = null;
    for (let i = 0; i < n; i++) {
      const v = rows[i].get(nd);
      if (k === 4) { const q = v.q.clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(arr, i * 4); prev = q; } else v.p.toArray(arr, i * 3);
    }
    const smp = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType(k === 4 ? 'VEC4' : 'VEC3').setArray(arr).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(smp).addChannel(doc.createAnimationChannel().setTargetNode(nd).setTargetPath(path).setSampler(smp));
  }
  return anim;
}
const lowY = (L, step = 2) => { let m = 9; for (const p of skinnedPoints(doc, worlds(doc, L), step)) m = Math.min(m, p.y); return m; };
const highY = (L, step = 2) => { let m = -9; for (const p of skinnedPoints(doc, worlds(doc, L), step)) m = Math.max(m, p.y); return m; };

const WALK = SRCA.Walk, BURROW = SRCA.Burrow, JAB = SRCA['Light Attack'];
const iT = duration(IDLE), wT = duration(WALK);

// idle: its defensive idle (it sways, shifts its weight and raises a claw), 15 keys a second
bake('idle', iT, (t) => pose(IDLE, t), { loop: true, fps: 15 });
// walk: its own (four steps of each leg in 2.5 s); run: the same gait at 3x, abdomen up, head down, pincers open: a skitter
bake('walk', wT, (t) => pose(WALK, t), { loop: true });
const RUN = wT / 3;
bake('run', RUN, (t) => { const L = pose(WALK, t * 3); rot(L, 'abdomen', X, 6); rot(L, 'head', X, -4); pincers(L, 10); return L; }, { loop: true, fps: 60 });
// ground speed of the gait: how fast a claw sweeps back while it is down (front and back legs)
const sweep = (() => {
  const n = 100, v = [];
  for (const k of ['FL', 'FR', 'BL', 'BR']) {
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const p = at(LEG[k].end, worlds(doc, pose(WALK, (wT * i) / n)));
      if (prev && p.y < 0.012 && prev.y < 0.012 && p.z < prev.z) v.push((prev.z - p.z) / (wT / n));
      prev = p;
    }
  }
  return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
})();

// spawn: bursts up out of the ash. Its Burrow (a hop, a nose-dive, then dug in with the back showing) backwards from the
// dug-in pose, started a little further down so the whole bug is under the ground at t = 0
const SPAWN = 0.8, DUG = 1.7;   // the AI holds it 0.8 s while it surfaces
const dugTop = highY(pose(BURROW, DUG));
bake('spawn', SPAWN, (t) => {
  const u = t / SPAWN, L = pose(BURROW, DUG * (1 - (0.85 * u + 0.15 * u * u)));
  move(L, [0, -(dugTop + 0.03) * (1 - smooth(t / 0.27)), 0]);
  return L;
});

// attack: its jab (rear back, lunge with the raised claws) quickened, with a pincer snap on the lunge
const ATK = 0.62, STRIKE = 0.3;
const jabAt = (t) => (t < 0.22 ? 0.5 * (t / 0.22) : t < 0.32 ? 0.5 + 0.25 * ((t - 0.22) / 0.1) : 0.75 + 0.25 * ((t - 0.32) / (ATK - 0.32)));
bake('attack', ATK, (t) => {
  const L = pose(JAB, jabAt(t));
  pincers(L, 34 * env(t, 0.02, 0.18, 0.22, 0.29) - 14 * bump(t, 0.26, 0.42));
  rot(L, 'head', X, -7 - 8 * env(t, 0.05, 0.2, 0.24, 0.3) + 10 * bump(t, 0.26, 0.42));
  return L;
});

// leap: crouches (0 - 0.6 s: body low, legs gathered, abdomen up and pumping, head up with the pincers spread), springs at 0.6 s, flies with the front
// legs and pincers flung forward and the back legs trailing (0.6 - 0.98 s, the game carries it 5 m), lands and settles
const LEAP = 1.25, TAKEOFF = 0.6;
bake('leap', LEAP, (t) => {
  const crouch = ramp(t, 0.02, 0.3) * (1 - ramp(t, 0.55, 0.64)), pump = crouch * Math.sin(2 * Math.PI * 5 * t);
  const air = env(t, 0.57, 0.66, 0.9, 1.02), land = bump(t, 0.95, LEAP), snap = bump(t, 0.86, 1.04);
  const L = pose(IDLE, 0);
  move(L, [0, -0.015 * crouch + 0.02 * air - 0.01 * land, -0.015 * crouch + 0.03 * air]);
  turn(L, X, -14 * air + 5 * land);
  rot(L, 'abdomen', X, 18 * crouch + 8 * pump - 6 * air);
  rot(L, 'head', X, -12 * crouch - 10 * air - 6 * land);
  pincers(L, 30 * crouch + 38 * air - 52 * snap);
  // free legs in the air (the planted ones are fitted to the ground below)
  const A = clone(L);
  legs(A, 'F', { lift: 30 * air, fwd: 25 * air, bend: -25 * air });
  legs(A, 'M', { lift: 12 * air + 14 * crouch, fwd: 30 * air, bend: -15 * air });
  legs(A, 'B', { lift: 10 * air, fwd: -30 * air, bend: -30 * air });
  if (air >= 0.999) return A;
  const G = clone(L);
  legs(G, 'M', { lift: 14 * crouch });
  // planted, splayed outward as it gathers itself (it reads wider from above)
  for (const k of ['FL', 'FR', 'BL', 'BR']) legIK(G, k, TIP0[k].clone().add(new THREE.Vector3(TIP0[k].x, 0, TIP0[k].z * 0.6).multiplyScalar(0.16 * crouch)));
  return mixL(G, A, air);
});

// cling: on the hero's back (see the header): pitched head-down, the belly and the claws to local -Z, the legs wrapped
// round (the outer ones further), the pincers gnawing, the abdomen throbbing; 1.2 s, loops
const CLING = 1.2;
const clingPose = (t) => {
  const w = (f) => Math.sin(2 * Math.PI * f * t / CLING);
  const L = pose(IDLE, 0);
  turn(L, X, 90 + 3 * w(2));
  turn(L, Z, 4 * w(1));
  move(L, [0, 0.11, 0.12]);
  rot(L, 'abdomen', X, 10 + 6 * w(3));
  rot(L, 'head', X, 12 + 4 * w(5));
  pincers(L, 10 + 16 * Math.max(0, w(5)));
  legs(L, 'F', () => ({ lift: -26 + 4 * w(2), fwd: 10, bend: 40 }));
  legs(L, 'M', () => ({ lift: -48 + 6 * w(2), fwd: -10, bend: 50 }));
  legs(L, 'B', () => ({ lift: -40 + 5 * w(2), fwd: 0, bend: 55 }));
  return L;
};
bake('cling', CLING, clingPose, { loop: true });

// hit: jolted back and up, legs splayed, pincers flung open
bake('hit', 0.42, (t) => {
  const k = bump(t, 0, 0.42), j = Math.pow(bump(t, 0, 0.3), 0.6), L = pose(IDLE, 0);
  turn(L, X, -10 * j); turn(L, Z, 3 * k); move(L, [0, 0.015 * k, -0.03 * k]);
  rot(L, 'abdomen', X, 14 * j); rot(L, 'head', X, -10 * j); pincers(L, 22 * j);
  legs(L, 'FMB', { lift: 12 * j });
  return L;
});

// die: a spasm (legs flailing, the abdomen jerking up), it drops flat on its belly with the head down, and the legs curl
// up and in over it (a dead bug); every frame is set down so its lowest point is on the ground (it never sinks in)
const DIE = 1.3;
const dieAt = (t) => {
  const sp = bump(t, 0, 0.34), drop = smooth((t - 0.2) / 0.35), c = smooth((t - 0.38) / 0.8), tw = Math.sin(t * 46) * sp;
  const L = pose(IDLE, 0);
  turn(L, X, -10 * sp + 7 * drop); turn(L, Z, 8 * drop);
  rot(L, 'abdomen', X, 20 * sp - 8 * drop); rot(L, 'head', X, -16 * sp + 14 * drop); pincers(L, 32 * sp - 14 * c);
  legs(L, 'FMB', (k) => ({ lift: 22 * sp + 8 * tw + 34 * c, fwd: 8 * tw, bend: -10 * sp + 80 * c }));
  return L;
};
{
  const n = Math.round(DIE * FPS), off = [];
  for (let i = 0; i <= n; i++) off.push(-lowY(dieAt((DIE * i) / n), 1));
  // a light smoothing, never letting anything more than 4 mm into the ground
  const sm = off.map((o, i) => Math.max(o - 0.004, (off[Math.max(0, i - 1)] + 2 * o + off[Math.min(n, i + 1)]) / 4));
  bake('die', DIE, (t) => { const L = dieAt(t), i = Math.round((t / DIE) * n); move(L, [0, sm[i], 0]); return L; });
}

if (!RAW) for (const a of Object.values(SRCA)) dropClip(a);

// ---------- report: per clip the lowest and highest skin point (below 0 is through the ground; spawn starts below on
// purpose, cling is held up on the hero's back) and the worst edge stretch against the rest pose, in cm ----------
{
  const prim = R.listMeshes()[0].listPrimitives()[0], skin = R.listSkins().find((s) => s.listJoints().length), js = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray();
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), Wt = prim.getAttribute('WEIGHTS_0'), I = prim.getIndices().getArray(), nV = P.getCount();
  const skinned = (W) => {
    const M = js.map((j, i) => W.get(j).clone().multiply(new THREE.Matrix4().fromArray(ibm, i * 16))), out = [], e = [], je = [], we = [];
    for (let i = 0; i < nV; i++) { P.getElement(i, e); J.getElement(i, je); Wt.getElement(i, we); const v = new THREE.Vector3(...e), acc = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (we[k]) acc.add(v.clone().applyMatrix4(M[je[k]]).multiplyScalar(we[k])); out.push(acc); }
    return out;
  };
  const dom = (i) => { const je = [], we = []; J.getElement(i, je); Wt.getElement(i, we); let b = 0; for (let k = 1; k < 4; k++) if (we[k] > we[b]) b = k; return js[je[b]].getName(); };
  const rest = skinned(Wr), len0 = [];
  for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) len0.push(rest[I[t + k]].distanceTo(rest[I[t + (k + 1) % 3]]));
  for (const a of R.listAnimations()) {
    const d = duration(a); let lo = 9, hi = -9, loAt = 0, loBone = '', st = 0, stWhere = '';
    for (let f = 0; f <= Math.round(d * 30); f++) {
      const t = Math.min(d, f / 30), V = skinned(worlds(doc, locals(doc, a, t)));
      V.forEach((v, i) => { if (v.y < lo) { lo = v.y; loAt = t; loBone = dom(i); } hi = Math.max(hi, v.y); });
      let e = 0; for (let t3 = 0; t3 < I.length; t3 += 3) for (let k = 0; k < 3; k++, e++) { const g = V[I[t3 + k]].distanceTo(V[I[t3 + (k + 1) % 3]]) - len0[e]; if (g > st) { st = g; stWhere = `${dom(I[t3 + k])}/${dom(I[t3 + (k + 1) % 3])} t ${t.toFixed(2)}`; } }
    }
    console.log(`  ${a.getName().padEnd(7)} ${d.toFixed(2)} s  low ${lo.toFixed(3)} (t ${loAt.toFixed(2)}, ${loBone})  high ${hi.toFixed(3)}  stretch +${(st * 100).toFixed(1)} cm (${stWhere})`);
  }
}

// ---------- 7. finish ----------
const used = slimRig(doc);
const b = bounds(doc, null, 0, 1);
const extras = {
  hit: { attack: STRIKE, leap: TAKEOFF }, height: +(b.max.y - b.min.y).toFixed(2), length: +(b.max.z - b.min.z).toFixed(2), legSpan: +(b.max.x - b.min.x).toFixed(2),
  walkSpeed: +sweep.toFixed(2), runSpeed: +(sweep * 3).toFixed(2),
  credit: '"Fireborne Blight Drone" by HighPolyDensity (sketchfab.com/HighPolyDensity), CC-BY 4.0 - decimated, re-textured, run, spawn, leap, cling, hit and death animations made for Skotos', license: 'CC-BY-4.0'
};
if (DBG) await io.write(`${DBG}/embertick_raw.glb`, doc);
const bytes = await finish(doc, OUT, extras, { base: 1024, aux: 512 });
console.log('embertick', (bytes / 1024).toFixed(0) + ' KB', used, 'joints', JSON.stringify(extras));
