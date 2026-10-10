// The Hull-louse (Σκαροψείρα): "CC0 オオグソクムシ Giant Isopod, B. doederleinii" by ffish.asia / floraZia.com
// (sketchfab.com/ffishAsia-and-floraZia), CC0 1.0 -> src/assets/creatures/louse.glb. A giant sea-louse the size of a
// dog, pale and armoured, that lives in wreck hulls and under cracked ice; it curls into a ball the hero can bowl.
// The source is a 583k-triangle photogrammetry scan of a real specimen on a 1024 px atlas of some 58,000 islands (and a
// colour-checker card, dropped). No UV seam survives a thinning to a few thousand triangles, so here the scan is thinned
// and given new UVs, and its colour and surface are baked back from the full-res scan (scanbake.mjs):
// - the parts are found on the full-res scan: each vertex's thickness (a ray in along its normal); the thin parts are the
//   legs, the antennae, the side plates and the tail fan; the 14 legs (thin, hanging below the body) are grown up into
//   their hips through the half-thick surface;
// - the hi-res surface is skinned first (the body plates by their place along the body, the side plates' slant
//   followed; each leg by its geodesic distance from its hip), then thinned to about 2.5k triangles with the skin
//   weights as attributes, so the thinned mesh keeps its vertices where the plates and the leg joints bend;
// - the long second antennae, which no thinning keeps, are rebuilt as tapered tubes along the scan's own antennae;
// - new UV charts (region-grown, packed), and per texel the scan's colour (regraded from boiled orange-pink to a cold
//   pale grey-violet, the deep-sea pallor of a thing that lives under the ice) and its normal, as a 512 px colour map
//   and a 256 px normal map.
// Code rig (bind frames are the world axes at each joint, rig.mjs): root, the body chain from the 4th thoracic plate
// forward (p3, p2, p1, head) and back (p5, p6, p7, two pleon bones, the tail shield), the tail fans, the antennae
// (three bones each) and fourteen legs (hip, knee, ankle). The feet are planted with two-bone IK.
// The first leg pair, short hooks set high under the head, are graspers held up off the ground.
// Clips (in place; rotations and the root's translation only): idle, walk and run (a metachronal leg wave, back to
// front, the two sides half a cycle apart; feet planted, so walkSpeed and runSpeed are measured), attack (rears on its
// back legs, lunges and bites; strike in extras), hit, die (convulses, curls up and rolls 0.5 m forward; held), curl
// (rolls into a ball; held), roll (the ball rolling forward in place, one turn, loops; extras.rollSpeed is the ground
// speed it matches, extras.ballRadius its radius), uncurl (the ball opens and stands), spawn (rolls in as a ball from
// 0.5 m behind and unrolls).
// usage: node louse.mjs [source.glb] [out.glb] [--dbg=<dir>: debug GLBs (the parts on the full scan, the low-poly's
//        weights, the uncompressed result), the maps at 1024, the most stretched edges]
import { MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { load, finish, worlds, locals, io, sharp } from '../act2/lib.mjs';
import { THREE, V, X, Y, Z, Qa, deg, clamp, smooth, ramp, bump, env, kf, TAU, makeRig, fk, skin, buildDoc, writeClip } from './rig.mjs';
import { buildBVH, raycast, nearest, vertexNormals, adjacency, dijkstra, components, unwrap, rasterUV, dilate } from './scanbake.mjs';
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [SRC = '/tmp/claude-0/sf/act5/louse/model.glb', OUT = new URL('../../../src/assets/creatures/louse.glb', import.meta.url).pathname] = ARGS;
const DBG = (process.argv.find((a) => a.startsWith('--dbg=')) || '').slice(6);
if (DBG) mkdirSync(DBG, { recursive: true });
await MeshoptSimplifier.ready;
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);

const LENGTH = 0.7;      // tail fan to the head, metres (x1: the game shows it at look.scale 1)
const LIFT = 0.12;       // the scan raised so its standing legs reach the ground
const TRIS = 2350;       // the thinned scan (the antenna tubes add about 160)

// ---------- 1. the scan: head to +Z, up +Y, metres; welded; its largest piece ----------
const src = await load(SRC);
const SW = worlds(src, locals(src, null, 0));
const parts = [];
for (const node of src.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  for (const p of mesh.listPrimitives()) if (p.getMaterial()?.getBaseColorTexture()?.getSize()?.[0] && p.getAttribute('POSITION').getCount() > 1000) parts.push({ node, p });
}
const nRaw = parts.reduce((a, q) => a + q.p.getAttribute('POSITION').getCount(), 0), tRaw = parts.reduce((a, q) => a + q.p.getIndices().getCount(), 0);
const RP = new Float32Array(nRaw * 3), RUV = new Float32Array(nRaw * 2), RI = new Uint32Array(tRaw);
{
  let vo = 0, io0 = 0; const v = V();
  for (const { node, p } of parts) {
    const M = SW.get(node), Pa = p.getAttribute('POSITION').getArray(), Ua = p.getAttribute('TEXCOORD_0').getArray(), Ia = p.getIndices().getArray();
    for (let i = 0; i < Pa.length / 3; i++) { v.fromArray(Pa, i * 3).applyMatrix4(M); RP[(vo + i) * 3] = v.z; RP[(vo + i) * 3 + 1] = v.y; RP[(vo + i) * 3 + 2] = -v.x; RUV[(vo + i) * 2] = Ua[i * 2]; RUV[(vo + i) * 2 + 1] = Ua[i * 2 + 1]; }
    for (let k = 0; k < Ia.length; k++) RI[io0 + k] = Ia[k] + vo;
    vo += Pa.length / 3; io0 += Ia.length;
  }
}
const SRCTEX = parts[0].p.getMaterial().getBaseColorTexture();
// weld by position (the scan is split into primitives and cut along its UV seams)
let P, I, remap;
{
  const key = (i) => { const q = 1e6; return (Math.round(RP[i * 3] * q) + 1e5) * 4e10 + (Math.round(RP[i * 3 + 1] * q) + 1e5) * 2e5 + (Math.round(RP[i * 3 + 2] * q) + 1e5); };   // (the scan spans +-0.07 m)
  const map = new Map(); remap = new Uint32Array(nRaw); const out = [];
  for (let i = 0; i < nRaw; i++) { const k = key(i); let j = map.get(k); if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(RP[i * 3], RP[i * 3 + 1], RP[i * 3 + 2]); } remap[i] = j; }
  P = new Float32Array(out); I = new Uint32Array(RI.length); for (let k = 0; k < RI.length; k++) I[k] = remap[RI[k]];
}
// the largest connected piece only (the rest are crumbs of the scan); RIk: the kept triangles' unwelded vertices
// (whose UVs the bake reads), in the order of I
let RIk;
{
  const G0 = adjacency(P.length / 3, I), C = components(P.length / 3, G0, () => true), cnt = new Uint32Array(C.n);
  for (let i = 0; i < P.length / 3; i++) cnt[C.comp[i]]++;
  const big = cnt.indexOf(Math.max(...cnt)), keepT = [];
  for (let t = 0; t < I.length / 3; t++) if (C.comp[I[t * 3]] === big) keepT.push(t);
  const I2 = new Uint32Array(keepT.length * 3), RI2 = new Uint32Array(keepT.length * 3);
  keepT.forEach((t, k) => { for (let j = 0; j < 3; j++) { I2[k * 3 + j] = I[t * 3 + j]; RI2[k * 3 + j] = RI[t * 3 + j]; } });
  I = I2; RIk = RI2;
}
// scaled to LENGTH, centred, lifted
{
  let z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9, xa = 1e9, xb = -1e9;
  for (let i = 0; i < P.length / 3; i++) { z0 = Math.min(z0, P[i * 3 + 2]); z1 = Math.max(z1, P[i * 3 + 2]); y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]); }
  // the middle of the back (its upper third holds no legs or antennae)
  for (let i = 0; i < P.length / 3; i++) if (P[i * 3 + 1] > y0 + 0.67 * (y1 - y0)) { xa = Math.min(xa, P[i * 3]); xb = Math.max(xb, P[i * 3]); }
  const s = LENGTH / (z1 - z0), cx = (xa + xb) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < P.length / 3; i++) { P[i * 3] = (P[i * 3] - cx) * s; P[i * 3 + 1] = P[i * 3 + 1] * s + LIFT; P[i * 3 + 2] = (P[i * 3 + 2] - cz) * s; }
}
const NV = P.length / 3, NT = I.length / 3;
const G = adjacency(NV, I), NOR = vertexNormals(P, I);
const px = (i) => P[i * 3], py = (i) => P[i * 3 + 1], pz = (i) => P[i * 3 + 2], PV = (i) => V(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
log(`scan: ${NV} vertices, ${NT} triangles`);
const bvh = buildBVH(P, I);
log('bvh');

// ---------- 2. the parts ----------
// thickness: a ray in along the normal (the median of five, jittered), smoothed over the 1-ring three times
const TH = new Float32Array(NV);
{
  const jit = [[0, 0, 0], [0.35, 0, 0], [0, 0.35, 0], [0, 0, 0.35], [-0.35, -0.35, 0]], ds = new Float64Array(5);
  for (let i = 0; i < NV; i++) {
    for (let k = 0; k < 5; k++) {
      let dx = -NOR[i * 3] + jit[k][0], dy = -NOR[i * 3 + 1] + jit[k][1], dz = -NOR[i * 3 + 2] + jit[k][2]; const l = Math.hypot(dx, dy, dz);
      const h = raycast(bvh, px(i), py(i), pz(i), dx / l, dy / l, dz / l, 2e-4, 0.5); ds[k] = h ? h.t : 0.5;
    }
    ds.sort(); TH[i] = ds[2];
  }
  for (let it = 0; it < 3; it++) {
    const o = new Float32Array(NV);
    for (let i = 0; i < NV; i++) { let s = TH[i], n = 1; for (let k = G.off[i]; k < G.off[i + 1]; k++) { s += TH[G.adj[k]]; n++; } o[i] = s / n; }
    TH.set(o);
  }
}
log('thickness');
// thin pieces: legs hang below the body and reach well down; antennae reach the head's front; the rest (side plates,
// tail fan, mouthparts) stay with the body
const PART = new Int16Array(NV).fill(-1);   // -1 body, 0..13 legs (L1..L7, R1..R7), 20/21 antennae (L, R), 30 other thin
const thinC = components(NV, G, (i) => TH[i] < 0.02);
const pieces = [];
{
  const acc = Array.from({ length: thinC.n }, () => ({ n: 0, lo: [9, 9, 9], hi: [-9, -9, -9], sum: [0, 0, 0] }));
  for (let i = 0; i < NV; i++) { const c = thinC.comp[i]; if (c < 0) continue; const a = acc[c]; a.n++; for (let k = 0; k < 3; k++) { const v = P[i * 3 + k]; a.lo[k] = Math.min(a.lo[k], v); a.hi[k] = Math.max(a.hi[k], v); a.sum[k] += v; } }
  acc.forEach((a, c) => { if (a.n > 200) pieces.push({ ...a, c, cen: a.sum.map((v) => v / a.n) }); });
}
const legPieces = pieces.filter((q) => q.n > 1000 && q.lo[1] < LIFT - 0.085 && q.hi[2] < 0.25);
const antPieces = pieces.filter((q) => q.n > 1000 && q.hi[2] > 0.29 && Math.abs(q.cen[0]) > 0.05);
if (legPieces.length !== 14 || antPieces.length !== 2) throw new Error(`expected 14 legs and 2 antennae, found ${legPieces.length} and ${antPieces.length}`);
{
  const lab = new Map();
  legPieces.forEach((q, k) => lab.set(q.c, 100 + k)); antPieces.forEach((q) => lab.set(q.c, q.cen[0] > 0 ? 20 : 21));
  for (const q of pieces) if (!lab.has(q.c)) lab.set(q.c, 30);
  for (let i = 0; i < NV; i++) { const c = thinC.comp[i]; if (c >= 0 && lab.has(c)) PART[i] = lab.get(c); }
}
// the legs grown up into their hips through the half-thick surface (multi-source Dijkstra, up to 4 cm)
{
  const srcs = []; for (let i = 0; i < NV; i++) if (PART[i] >= 100) srcs.push(i);
  const D = dijkstra(P, G, srcs, (j) => PART[j] === -1 && TH[j] < 0.045, 0.04);
  for (let i = 0; i < NV; i++) if (PART[i] === -1 && D.from[i] >= 0) PART[i] = PART[D.from[i]];
}
// small islands of one label inside another (spots of the leg surface whose thickness ray ran along the leg, crumbs
// of the side plates) take the label around them
for (let pass = 0; pass < 2; pass++) {
  const comp = new Int32Array(NV).fill(-1); let nc = 0; const st = [], members = [];
  for (let s0 = 0; s0 < NV; s0++) {
    if (comp[s0] >= 0) continue;
    const lab = PART[s0], m = [s0]; comp[s0] = nc; st.push(s0);
    while (st.length) { const i = st.pop(); for (let a = G.off[i]; a < G.off[i + 1]; a++) { const j = G.adj[a]; if (comp[j] < 0 && PART[j] === lab) { comp[j] = nc; st.push(j); m.push(j); } } }
    members.push(m); nc++;
  }
  let moved = 0;
  for (const m of members) {
    if (m.length >= 400) continue;
    const votes = new Map();
    for (const i of m) for (let a = G.off[i]; a < G.off[i + 1]; a++) { const j = G.adj[a]; if (PART[j] !== PART[i]) votes.set(PART[j], (votes.get(PART[j]) || 0) + 1); }
    if (!votes.size) continue;
    const to = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    for (const i of m) PART[i] = to; moved += m.length;
  }
  log('islands relabelled', moved);
}
// legs named by side (+x is the louse's left) and by their hips' order from the head
const LEGS = [];
for (let k = 0; k < 14; k++) {
  const vs = []; for (let i = 0; i < NV; i++) if (PART[i] === 100 + k) vs.push(i);
  // the hip ring: leg vertices next to the body
  const touch = (labs) => vs.filter((i) => { for (let a = G.off[i]; a < G.off[i + 1]; a++) if (labs.includes(PART[G.adj[a]])) return true; return false; });
  let ring = touch([-1]); if (ring.length < 12) ring = touch([-1, 30]);
  const hip = ring.reduce((a, i) => a.add(PV(i)), V()).multiplyScalar(1 / ring.length);
  LEGS.push({ k, vs, ring, hip, side: legPieces[k].cen[0] > 0 ? 'L' : 'R' });
}
for (const s of ['L', 'R']) LEGS.filter((g) => g.side === s).sort((a, b) => b.hip.z - a.hip.z).forEach((g, n) => { g.n = n + 1; g.name = `leg${n + 1}${s}`; });
LEGS.sort((a, b) => (a.side === b.side ? a.n - b.n : a.side === 'L' ? -1 : 1));
for (let i = 0; i < NV; i++) if (PART[i] >= 100) PART[i] = LEGS.findIndex((g) => g.k === PART[i] - 100);
// each leg's length coordinate s (geodesic from the hip ring), and its joints: knee at 40%, ankle at 72% of its length
const LS = new Float32Array(NV);
for (const [li, g] of LEGS.entries()) {
  const D = dijkstra(P, G, g.ring, (j) => PART[j] === li);
  let smax = 0, tip = g.ring[0]; for (const i of g.vs) if (D.dist[i] < Infinity && D.dist[i] > smax) { smax = D.dist[i]; tip = i; }
  for (const i of g.vs) LS[i] = D.dist[i] < Infinity ? D.dist[i] / smax : 0;
  const at = (f, w = 0.04) => { const a = V(); let n = 0; for (const i of g.vs) if (Math.abs(LS[i] - f) < w) { a.add(PV(i)); n++; } return a.multiplyScalar(1 / n); };
  g.smax = smax; g.knee = at(0.4); g.ankle = at(0.72); g.tipV = tip;
  // the claw's reach: the far end of the leg from the hip (on the hooked front legs, the hook's bend, not its point)
  let far = 0; for (const i of g.vs) if (LS[i] > 0.5) far = Math.max(far, PV(i).distanceTo(g.hip));
  g.tip = V(); let nt = 0; for (const i of g.vs) if (LS[i] > 0.5 && PV(i).distanceTo(g.hip) > far - 0.006) { g.tip.add(PV(i)); nt++; }
  g.tip.multiplyScalar(1 / nt);
}
log('legs', LEGS.map((g) => `${g.name} n ${g.vs.length} ring ${g.ring.length} hip ${g.hip.toArray().map((v) => v.toFixed(3))} len ${g.smax.toFixed(3)}`).join('\n  '));

// ---------- 3. the skeleton ----------
// the body plates: the steps between them on the back's midline (measured on the scan), head to tail; each plate's
// bone pivots on its boundary nearer the middle of the body (the 4th thoracic plate, 'body'), 5 cm under the back
const PLATES = ['head', 'p1', 'p2', 'p3', 'body', 'p5', 'p6', 'p7', 'pleon1', 'pleon2', 'tail'];
const CUTZ = [0.268, 0.2, 0.152, 0.098, 0.044, -0.01, -0.056, -0.074, -0.116, -0.164];   // head|p1 .. pleon2|tail
const backY = (z) => { let m = -1; for (let i = 0; i < NV; i++) if (Math.abs(px(i)) < 0.012 && Math.abs(pz(i) - z) < 0.006) m = Math.max(m, py(i)); return m; };
const PIV = {};
PLATES.forEach((b, k) => {
  const z = b === 'body' ? (CUTZ[3] + CUTZ[4]) / 2 : k < 4 ? CUTZ[k] : CUTZ[k - 1];
  PIV[b] = V(0, backY(z) - 0.05, z);
});
const PLATE_PARENT = { body: 'root', p3: 'body', p2: 'p3', p1: 'p2', head: 'p1', p5: 'body', p6: 'p5', p7: 'p6', pleon1: 'p7', pleon2: 'pleon1', tail: 'pleon2' };
const LEG_PLATE = ['p1', 'p2', 'p3', 'body', 'p5', 'p6', 'p7'];
// the antennae: centre lines of the scan's (thin) second antennae, base (at the head) to tip
const ANT = {};
for (const [lab, s] of [[20, 'L'], [21, 'R']]) {
  const vs = []; for (let i = 0; i < NV; i++) if (PART[i] === lab) vs.push(i);
  // the base: the antenna vertex nearest the head's middle front
  const head = V(0, PIV.head.y, 0.3); let base = vs[0], bd = 9; for (const i of vs) { const d = PV(i).distanceTo(head); if (d < bd) { bd = d; base = i; } }
  const D = dijkstra(P, G, [base], (j) => PART[j] === lab);
  let smax = 0; for (const i of vs) if (D.dist[i] < Infinity) smax = Math.max(smax, D.dist[i]);
  const NB = 24, cen = Array.from({ length: NB }, () => [V(), 0]);
  for (const i of vs) { if (D.dist[i] === Infinity) continue; const b = Math.min(NB - 1, Math.floor((D.dist[i] / smax) * NB)); cen[b][0].add(PV(i)); cen[b][1]++; }
  let line = cen.filter((c) => c[1] > 0).map((c) => c[0].multiplyScalar(1 / c[1]));
  // smoothed twice, and started 1.5 cm back inside the head
  for (let it = 0; it < 2; it++) line = line.map((p, k) => (k === 0 || k === line.length - 1 ? p : p.clone().multiplyScalar(0.5).addScaledVector(line[k - 1], 0.25).addScaledVector(line[k + 1], 0.25)));
  line.unshift(line[0].clone().addScaledVector(line[0].clone().sub(line[1]).normalize(), 0.015));
  ANT[s] = { line, len: line.reduce((a, p, k) => a + (k ? p.distanceTo(line[k - 1]) : 0), 0) };
}
// a point at fraction f of a polyline's length
const along = (line, f) => {
  const L = line.reduce((a, p, k) => a + (k ? p.distanceTo(line[k - 1]) : 0), 0); let d = f * L;
  for (let k = 1; k < line.length; k++) { const l = line[k].distanceTo(line[k - 1]); if (d <= l) return line[k - 1].clone().lerp(line[k], d / l); d -= l; }
  return line[line.length - 1].clone();
};
const JOINTS = [{ name: 'root', parent: null, p: V(0, 0, 0) }];
const addJ = (name, parent, p) => JOINTS.push({ name, parent, p: p.clone() });
for (const b of ['body', 'p3', 'p2', 'p1', 'head', 'p5', 'p6', 'p7', 'pleon1', 'pleon2', 'tail']) addJ(b, PLATE_PARENT[b], PIV[b]);
// the tail fans (uropods) hinge at the tail shield's sides
const UROX = 0.05, UROZ = -0.215;
for (const s of ['L', 'R']) addJ(`uro${s}`, 'tail', V(s === 'L' ? UROX : -UROX, backY(UROZ) - 0.035, UROZ));
for (const s of ['L', 'R']) for (const [k, f] of [[0, 0.06], [1, 0.38], [2, 0.7]]) addJ(`ant${s}${k}`, k ? `ant${s}${k - 1}` : 'head', along(ANT[s].line, f));
for (const g of LEGS) { addJ(`${g.name}_hip`, LEG_PLATE[g.n - 1], g.hip); addJ(`${g.name}_knee`, `${g.name}_hip`, g.knee); addJ(`${g.name}_ankle`, `${g.name}_knee`, g.ankle); }
const rig = makeRig(JOINTS);
const J = (n) => { const j = rig.idx.get(n); if (j === undefined) throw new Error('no joint ' + n); return j; };
log(`rig: ${rig.n} joints; antennae ${ANT.L.len.toFixed(3)} / ${ANT.R.len.toFixed(3)} m`);

// ---------- 4. weights on the full-res scan ----------
// body plates: by place along the body; down the sides the plates' borders slant back (the side plates), followed here
const sm = smooth;
const plateZ = (i) => pz(i) + 0.6 * Math.max(0, PIV.body.y - 0.03 - py(i)) * sm((Math.abs(px(i)) - 0.08) / 0.04);
function plateW(i, w) {
  const z = plateZ(i), h = 0.006;
  // the share of each plate: between its two cuts, blended across each
  let prev = 1;   // the share past the cut before (head side)
  for (let k = 0; k < PLATES.length; k++) {
    const behind = k < CUTZ.length ? sm((CUTZ[k] - z) / (2 * h) + 0.5) : 0;   // 1 when behind cut k (the tail takes the rest)
    const share = prev * (1 - behind);
    if (share > 1e-4) w[PLATES[k]] = (w[PLATES[k]] || 0) + share;
    prev *= behind;
    if (prev < 1e-4) break;
  }
  return w;
}
// each leg's base blends into the body as it is next to its hip ring (whatever plates those are)
for (const g of LEGS) {
  const acc = {}; let n = 0;
  for (const i of g.ring) for (let a = G.off[i]; a < G.off[i + 1]; a++) { const j = G.adj[a]; if (PART[j] !== -1 && PART[j] !== 30) continue; const w = plateW(j, {}); for (const k in w) acc[k] = (acc[k] || 0) + w[k]; n++; }
  g.baseW = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v / n]));
}
const WJ = new Uint8Array(NV * 4), WW = new Float32Array(NV * 4);
const KNEE = 0.4, ANKLE = 0.72, LB = 0.05;
for (let i = 0; i < NV; i++) {
  let w = {};
  const part = PART[i];
  if (part >= 0 && part < 14) {
    const g = LEGS[part], s = LS[i], n = g.name;
    const kn = sm((s - KNEE) / (2 * LB) + 0.5), an = sm((s - ANKLE) / (2 * LB) + 0.5), base = 0.5 * (1 - sm(s / 0.14));
    w[`${n}_ankle`] = an; w[`${n}_knee`] = kn * (1 - an); const hp = (1 - kn) * (1 - an);
    w[`${n}_hip`] = hp * (1 - base); for (const k in g.baseW) w[k] = (w[k] || 0) + hp * base * g.baseW[k];
  } else {
    plateW(i, w);
    // the tail fans: outside the tail shield's edge, behind their hinge
    if (pz(i) < UROZ + 0.02) {
      const f = sm((Math.abs(px(i)) - 0.045) / 0.02) * sm((UROZ + 0.02 - pz(i)) / 0.03);
      if (f > 0) { for (const k in w) w[k] *= 1 - f; const b = px(i) > 0 ? 'uroL' : 'uroR'; w[b] = (w[b] || 0) + f; }
    }
  }
  const e = Object.entries(w).filter(([, x]) => x > 1e-3).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = e.reduce((a, [, x]) => a + x, 0);
  e.forEach(([b, x], k) => { WJ[i * 4 + k] = J(b); WW[i * 4 + k] = x / sum; });
}
log('weights');

// ---------- 5. the thinned scan (the antennae cut away; the skin weights steer the thinning) ----------
const PLATE_IDX = new Map(PLATES.map((b, k) => [J(b), k]));
const ATTR = new Float32Array(NV * 4);
for (let i = 0; i < NV; i++) {
  let seg = 0, leg = 0, uro = 0;
  for (let k = 0; k < 4; k++) {
    const j = WJ[i * 4 + k], w = WW[i * 4 + k]; if (!w) continue;
    const nm = rig.names[j];
    if (PLATE_IDX.has(j)) seg += w * PLATE_IDX.get(j);
    else if (nm.endsWith('_hip')) { leg += w * 1; seg += w * PLATE_IDX.get(J(LEG_PLATE[LEGS[PART[i]].n - 1])); }
    else if (nm.endsWith('_knee')) { leg += w * 2; seg += w * PLATE_IDX.get(J(LEG_PLATE[LEGS[PART[i]].n - 1])); }
    else if (nm.endsWith('_ankle')) { leg += w * 3; seg += w * PLATE_IDX.get(J(LEG_PLATE[LEGS[PART[i]].n - 1])); }
    else if (nm.startsWith('uro')) { uro += w; seg += w * PLATE_IDX.get(J('tail')); }
  }
  ATTR[i * 4] = seg; ATTR[i * 4 + 1] = leg; ATTR[i * 4 + 2] = uro; ATTR[i * 4 + 3] = PART[i] >= 0 && PART[i] < 14 ? 1 + (PART[i] % 2) * 0.5 + (LEGS[PART[i]].n % 3) : 0;
}
// (and the few triangles where two legs touch in the scan are cut, so each leg moves free of its neighbours)
const isLeg = (p) => p >= 0 && p < 14, isAnt = (p) => p === 20 || p === 21;
const keepT = [];
for (let t = 0; t < NT; t++) {
  const a = PART[I[t * 3]], b = PART[I[t * 3 + 1]], c = PART[I[t * 3 + 2]];
  if (isAnt(a) && isAnt(b) && isAnt(c)) continue;
  const legs = new Set([a, b, c].filter(isLeg)); if (legs.size > 1) continue;
  keepT.push(t);
}
const IC = new Uint32Array(keepT.length * 3); keepT.forEach((t, k) => { IC[k * 3] = I[t * 3]; IC[k * 3 + 1] = I[t * 3 + 1]; IC[k * 3 + 2] = I[t * 3 + 2]; });
// attributes: the plate coordinate, the leg joint coordinate, the tail fans, which leg (weighed against the position
// error, which meshoptimizer scales to the mesh's extent)
const [LI, lerr] = MeshoptSimplifier.simplifyWithAttributes(IC, P, 3, ATTR, 4, [0.03, 0.03, 0.02, 0.05], null, TRIS * 3, 0.05, []);
log(`thinned: ${LI.length / 3} triangles (error ${lerr.toFixed(4)})`);

// one mesh: the thinned scan (its vertices are full-res vertices, srcv) and the two antenna tubes
const M = { pos: [], idx: [], J: [], W: [], srcv: [], part: [] };
{
  const map = new Map();
  for (const o of LI) {
    let j = map.get(o);
    if (j === undefined) { j = map.size; map.set(o, j); M.pos.push(px(o), py(o), pz(o)); M.srcv.push(o); M.part.push(PART[o]); for (let k = 0; k < 4; k++) { M.J.push(WJ[o * 4 + k]); M.W.push(WW[o * 4 + k]); } }
    M.idx.push(j);
  }
}
// (the thinning can join two legs' bases again where only body lay between them: such triangles are dropped)
{
  const keep = [];
  for (let t = 0; t < M.idx.length; t += 3) { const legs = new Set([M.part[M.idx[t]], M.part[M.idx[t + 1]], M.part[M.idx[t + 2]]].filter(isLeg)); if (legs.size < 2) keep.push(M.idx[t], M.idx[t + 1], M.idx[t + 2]); }
  M.idx = keep;
}
const SCAN_TRIS = M.idx.length / 3;
// tubes: 9 rings of 5 round each antenna's centre line, tapering from 6.5 mm to 2.2 mm, and a tip
const TUBE = { rings: 9, sides: 5, r0: 0.0065, r1: 0.0022 };
for (const s of ['L', 'R']) {
  const line = ANT[s].line, part = s === 'L' ? 20 : 21, o = M.pos.length / 3;
  let nrm = null;
  for (let r = 0; r < TUBE.rings; r++) {
    const f = r / TUBE.rings, c = along(line, f), d = along(line, Math.min(1, f + 0.02)).sub(along(line, Math.max(0, f - 0.02))).normalize();
    nrm = nrm ? nrm.projectOnPlane(d).normalize() : Y.clone().projectOnPlane(d).normalize();   // carried along (no twist)
    const bin = d.clone().cross(nrm), rad = TUBE.r0 + (TUBE.r1 - TUBE.r0) * f;
    for (let k = 0; k < TUBE.sides; k++) {
      const a = (k / TUBE.sides) * TAU, p = c.clone().addScaledVector(nrm, Math.cos(a) * rad).addScaledVector(bin, Math.sin(a) * rad);
      M.pos.push(p.x, p.y, p.z); M.srcv.push(-1); M.part.push(part);
      const w = f < 0.04 ? { head: 1 } : f < 0.38 ? { [`ant${s}0`]: 1 - sm((f - 0.3) / 0.16), [`ant${s}1`]: sm((f - 0.3) / 0.16) } : { [`ant${s}1`]: 1 - sm((f - 0.62) / 0.16), [`ant${s}2`]: sm((f - 0.62) / 0.16) };
      const e = Object.entries(w).filter(([, x]) => x > 1e-3); e.forEach(([b, x], q) => { M.J.push(J(b)); M.W.push(x); }); for (let q = e.length; q < 4; q++) { M.J.push(0); M.W.push(0); }
    }
    if (r) for (let k = 0; k < TUBE.sides; k++) {
      const a0 = o + (r - 1) * TUBE.sides + k, a1 = o + (r - 1) * TUBE.sides + ((k + 1) % TUBE.sides), b0 = a0 + TUBE.sides, b1 = a1 + TUBE.sides;
      M.idx.push(a0, b0, a1, a1, b0, b1);
    }
  }
  const tip = along(line, 1), t = M.pos.length / 3;
  M.pos.push(tip.x, tip.y, tip.z); M.srcv.push(-1); M.part.push(part); M.J.push(J(`ant${s}2`), 0, 0, 0); M.W.push(1, 0, 0, 0);
  for (let k = 0; k < TUBE.sides; k++) M.idx.push(o + (TUBE.rings - 1) * TUBE.sides + k, t, o + (TUBE.rings - 1) * TUBE.sides + ((k + 1) % TUBE.sides));
}
// the tubes' winding: outward (checked on the first triangle against its centre line)
const LNV = M.pos.length / 3, LNT = M.idx.length / 3;
const LP = (i) => V(M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]);
{
  const t = SCAN_TRIS, a = LP(M.idx[t * 3]), b = LP(M.idx[t * 3 + 1]), c = LP(M.idx[t * 3 + 2]);
  const n = b.clone().sub(a).cross(c.clone().sub(a)), out = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(ANT.L.line[0]);
  if (n.dot(out.projectOnPlane(ANT.L.line[1].clone().sub(ANT.L.line[0]).normalize())) < 0) for (let k = SCAN_TRIS * 3; k < M.idx.length; k += 3) { const q = M.idx[k + 1]; M.idx[k + 1] = M.idx[k + 2]; M.idx[k + 2] = q; }
}
const mesh = { pos: Float32Array.from(M.pos), idx: Uint32Array.from(M.idx), J: Uint16Array.from(M.J), W: Float32Array.from(M.W) };
mesh.nor = vertexNormals(mesh.pos, mesh.idx);
log(`low-poly: ${LNT} triangles (scan ${SCAN_TRIS}, antennae ${LNT - SCAN_TRIS}), ${LNV} vertices`);


// ---------- 6. UVs ----------
// charts never cross from one part to another (a leg, an antenna, the body); the back (what the game's camera sees)
// gets about five times the texels of the belly
const triPart = (t) => { const p = M.part[mesh.idx[t * 3]], q = M.part[mesh.idx[t * 3 + 1]], r = M.part[mesh.idx[t * 3 + 2]]; return p === q || p === r ? p : q === r ? q : p; };
const UW = unwrap(mesh.pos, mesh.idx, {
  size: 1024, pad: 6, cone: 52, group: (t) => { const p = triPart(t); return p >= 0 && p < 30 ? p : -1; },
  density: (t) => {
    const p = triPart(t); if (p === 20 || p === 21) return 0.5; if (p >= 0 && p < 14) return 0.8;
    const a = LP(mesh.idx[t * 3]), b = LP(mesh.idx[t * 3 + 1]), c = LP(mesh.idx[t * 3 + 2]), n = b.sub(a).cross(c.sub(a)).normalize();
    return 0.45 + 2.4 * smooth((n.y + 0.2) / 0.8);
  }
});
log(`uv: ${UW.charts} charts, ${UW.pos.length / 3} vertices, ${UW.scale.toFixed(0)} texels/m at 1024`);

// ---------- 7. the bake ----------
const BS = 1024;   // baked at 1024, shipped at 512 (colour) and 256 (normal)
const SRCD = await sharp(Buffer.from(SRCTEX.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const SW_ = SRCD.info.width, SH_ = SRCD.info.height, SRC_RGB = SRCD.data;
const srcAt = (u, v, out) => {   // bilinear, clamped
  const x = clamp(u * SW_ - 0.5, 0, SW_ - 1.001), y = clamp(v * SH_ - 0.5, 0, SH_ - 1.001), x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  for (let c = 0; c < 3; c++) {
    const a = SRC_RGB[(y0 * SW_ + x0) * 3 + c], b = SRC_RGB[(y0 * SW_ + x0 + 1) * 3 + c], d = SRC_RGB[((y0 + 1) * SW_ + x0) * 3 + c], e = SRC_RGB[((y0 + 1) * SW_ + x0 + 1) * 3 + c];
    out[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
  }
  return out;
};
const RAW = new Float32Array(BS * BS * 3), NRM = new Float32Array(BS * BS * 3), INFO_ = new Float32Array(BS * BS * 4), NY = new Float32Array(BS * BS);   // INFO_: position (x, y, z), part; NY: the surface's up-ness
for (let k = 0; k < BS * BS; k++) { NRM[k * 3 + 2] = 1; }
let miss = 0, byNear = 0;
{
  const tframe = new Map(), p = V(), n = V(), hn = V(), T = V(), B = V(), col = [0, 0, 0];
  const uv = UW.uv, ui = UW.idx, us = UW.src;
  const hitCol = (h) => { const a = RIk[h.tri * 3], b = RIk[h.tri * 3 + 1], c = RIk[h.tri * 3 + 2], w = 1 - h.u - h.v; return srcAt(RUV[a * 2] * w + RUV[b * 2] * h.u + RUV[c * 2] * h.v, RUV[a * 2 + 1] * w + RUV[b * 2 + 1] * h.u + RUV[c * 2 + 1] * h.v, col); };
  const hitNor = (h) => { const a = I[h.tri * 3] * 3, b = I[h.tri * 3 + 1] * 3, c = I[h.tri * 3 + 2] * 3, w = 1 - h.u - h.v; return hn.set(NOR[a] * w + NOR[b] * h.u + NOR[c] * h.v, NOR[a + 1] * w + NOR[b + 1] * h.u + NOR[c + 1] * h.v, NOR[a + 2] * w + NOR[b + 2] * h.u + NOR[c + 2] * h.v).normalize(); };
  const tri = rasterUV(uv, ui, BS, BS, (k, t, w0, w1, w2) => {
    const ia = ui[t * 3], ib = ui[t * 3 + 1], ic = ui[t * 3 + 2], sa = us[ia], sb = us[ib], sc = us[ic];
    p.set(0, 0, 0); n.set(0, 0, 0);
    for (const [s0, w] of [[sa, w0], [sb, w1], [sc, w2]]) { p.x += mesh.pos[s0 * 3] * w; p.y += mesh.pos[s0 * 3 + 1] * w; p.z += mesh.pos[s0 * 3 + 2] * w; n.x += mesh.nor[s0 * 3] * w; n.y += mesh.nor[s0 * 3 + 1] * w; n.z += mesh.nor[s0 * 3 + 2] * w; }
    n.normalize();
    const part = triPart(t), tube = part === 20 || part === 21;
    INFO_[k * 4] = p.x; INFO_[k * 4 + 1] = p.y; INFO_[k * 4 + 2] = p.z; INFO_[k * 4 + 3] = part; NY[k] = n.y;
    // the scan along the normal, out or in (the nearer that faces the same way), else the nearest scan point
    let h = null;
    if (!tube) {
      const o = raycast(bvh, p.x, p.y, p.z, n.x, n.y, n.z, 0, 0.02), q = raycast(bvh, p.x, p.y, p.z, -n.x, -n.y, -n.z, 0, 0.02);
      const ok = (r) => r && hitNor(r).dot(n) > 0.1;
      h = ok(o) && ok(q) ? (o.t < q.t ? o : q) : ok(o) ? o : ok(q) ? q : null;
    }
    if (!h) { h = nearest(bvh, p.x, p.y, p.z, 0.03); if (h) byNear++; }
    if (!h) { miss++; return; }
    hitCol(h); RAW[k * 3] = col[0]; RAW[k * 3 + 1] = col[1]; RAW[k * 3 + 2] = col[2];
    if (tube) return;
    // the scan's normal in the low-poly's tangent frame (map +y up the image, toward -v)
    if (!tframe.has(t)) {
      const A = V(mesh.pos[sa * 3], mesh.pos[sa * 3 + 1], mesh.pos[sa * 3 + 2]), Bp = V(mesh.pos[sb * 3], mesh.pos[sb * 3 + 1], mesh.pos[sb * 3 + 2]), C = V(mesh.pos[sc * 3], mesh.pos[sc * 3 + 1], mesh.pos[sc * 3 + 2]);
      const du1 = uv[ib * 2] - uv[ia * 2], dv1 = uv[ib * 2 + 1] - uv[ia * 2 + 1], du2 = uv[ic * 2] - uv[ia * 2], dv2 = uv[ic * 2 + 1] - uv[ia * 2 + 1];
      const e1 = Bp.sub(A), e2 = C.sub(A), r = 1 / (du1 * dv2 - du2 * dv1 || 1e-12);
      tframe.set(t, [e1.clone().multiplyScalar(dv2).addScaledVector(e2, -dv1).multiplyScalar(r), e2.clone().multiplyScalar(du1).addScaledVector(e1, -du2).multiplyScalar(r)]);
    }
    const [TU, TV] = tframe.get(t);
    T.copy(TU).projectOnPlane(n).normalize(); B.copy(n).cross(T); if (B.dot(TV) > 0) B.negate();
    const m = hitNor(h);
    NRM[k * 3] = m.dot(T); NRM[k * 3 + 1] = m.dot(B); NRM[k * 3 + 2] = m.dot(n);
  });
  dilate(RAW, 3, tri, BS, BS, 10); dilate(NRM, 3, tri, BS, BS, 10); dilate(INFO_, 4, tri, BS, BS, 10); dilate(NY, 1, tri, BS, BS, 10);
}
log(`baked: ${miss} texels missed, ${byNear} by nearest point`);
const toPNG = (img, ch, size, f = (v) => v) => sharp(Buffer.from(Uint8Array.from(img, (v) => Math.round(clamp(f(v), 0, 255)))), { raw: { width: BS, height: BS, channels: ch } }).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
if (DBG) writeFileSync(`${DBG}/raw_d.png`, await toPNG(RAW, 3, 1024));


// ---------- 8. the maps ----------
// colour: the scan's boiled orange-pink regraded to a cold pale grey-violet, the deep-sea pallor of a thing that lives
// under the ice. Its own light and shade are kept and sharpened (the plates' rims, the grooves, the leg spines); a
// little of its own flesh tone survives as a faint lilac in the plates' fields; the belly and the undersides go colder
// and darker, the darkest browns (the gills, the fans' fringes, the claws) to a deep slate-violet; a rime of salt-frost
// specks on what faces up.
const DARK = [30, 27, 42], MID = [92, 87, 110], PALE = [166, 162, 182];
const mix3 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const GRADE = new Float32Array(BS * BS * 3);
{
  // the value, with its local contrast raised (value minus its blur)
  const L0 = new Float32Array(BS * BS); for (let k = 0; k < BS * BS; k++) L0[k] = (0.3 * RAW[k * 3] + 0.55 * RAW[k * 3 + 1] + 0.15 * RAW[k * 3 + 2]) / 255;
  const L8 = Buffer.from(Uint8Array.from(L0, (v) => Math.round(clamp(v) * 255)));
  const LB = await sharp(L8, { raw: { width: BS, height: BS, channels: 1 } }).blur(6).extractChannel(0).raw().toBuffer();
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  for (let k = 0; k < BS * BS; k++) {
    const r = RAW[k * 3], g = RAW[k * 3 + 1], b = RAW[k * 3 + 2], L = clamp(L0[k] + 1.0 * (L0[k] - LB[k] / 255)), warm = clamp((r - b) / 255);
    let c = L < 0.48 ? mix3(DARK, MID, smooth((L - 0.06) / 0.42)) : mix3(MID, PALE, smooth((L - 0.48) / 0.4));
    c = [c[0] + 16 * warm, c[1] + 2 * warm, c[2] + 9 * warm];   // the faint lilac of the old flesh
    const ny = NY[k], under = smooth((-ny - 0.1) / 0.6), part = INFO_[k * 4 + 3], leg = part >= 0 && part < 14;
    c = mix3(c, [c[0] * 0.78, c[1] * 0.8, c[2] * 0.9], 0.8 * under);
    if (leg) c = mix3(c, [c[0] * 0.92, c[1] * 0.92, c[2] * 0.98], 0.5);
    // salt-frost: sparse bright specks and a faint dusting where the shell faces up
    const up = smooth((ny - 0.35) / 0.5) * (leg ? 0.3 : 1), x = k % BS, y = (k / BS) | 0;
    const speck = hash(x >> 1, y >> 1) > 0.965 ? 1 : 0;
    c = mix3(c, [226, 232, 240], up * (0.06 + 0.5 * speck * smooth((L - 0.45) / 0.3)));
    GRADE.set(c, k * 3);
  }
}
const BASEPNG = await toPNG(GRADE, 3, 512);
const NRMPNG = await toPNG(NRM, 3, 256, (v) => 127.5 + 127.5 * v);
if (DBG) { writeFileSync(`${DBG}/louse_d.png`, await toPNG(GRADE, 3, 1024)); writeFileSync(`${DBG}/louse_n.png`, await toPNG(NRM, 3, 512, (v) => 127.5 + 127.5 * v)); }

// ---------- 9. the document ----------
const NU = UW.pos.length / 3, US = UW.src;
const umesh = { pos: UW.pos, uv: UW.uv, idx: UW.idx, nor: new Float32Array(NU * 3), J: new Uint8Array(NU * 4), W: new Float32Array(NU * 4) };
for (let v = 0; v < NU; v++) { const s0 = US[v]; for (let c = 0; c < 3; c++) umesh.nor[v * 3 + c] = mesh.nor[s0 * 3 + c]; for (let k = 0; k < 4; k++) { umesh.J[v * 4 + k] = mesh.J[s0 * 4 + k]; umesh.W[v * 4 + k] = mesh.W[s0 * 4 + k]; } }
const D = buildDoc(rig, umesh, { name: 'louse', base: [1, 1, 1, 1], rough: 0.48, metal: 0, normalScale: 1.6, textures: { base: { image: BASEPNG, mime: 'image/png' }, normal: { image: NRMPNG, mime: 'image/png' } } },
  { rootName: 'louse', meshName: 'louse_mesh', skinName: 'louse' });

// ---------- debug views ----------
const PAL = [[0.9, 0.2, 0.2], [0.2, 0.8, 0.2], [0.2, 0.4, 1], [1, 0.8, 0.1], [1, 0.3, 0.9], [0.1, 0.9, 0.9], [0.6, 0.3, 0.1], [0.5, 0.5, 1], [1, 0.5, 0.2], [0.3, 0.6, 0.3], [0.9, 0.9, 0.5], [0.7, 0.2, 0.6], [0.2, 0.2, 0.6], [0.6, 0.9, 0.3], [0.9, 0.6, 0.6], [0.4, 0.2, 0.9]];
// the full-res scan (thinned for viewing) with a colour per vertex
async function dbgScan(name, colour, tris = 150000) {
  if (!DBG) return;
  const { Document } = await import('@gltf-transform/core');
  const [s] = MeshoptSimplifier.simplify(I, P, 3, tris * 3, 0.01, []);
  const used = new Map(), pp = [], cc = [], ii = [];
  for (const o of s) { let j = used.get(o); if (j === undefined) { j = used.size; used.set(o, j); pp.push(P[o * 3], P[o * 3 + 1], P[o * 3 + 2]); cc.push(...colour(o)); } ii.push(j); }
  const d = new Document(), b = d.createBuffer(), A = (t, a) => d.createAccessor().setType(t).setArray(a).setBuffer(b);
  const pf = new Float32Array(pp), ix = new Uint32Array(ii);
  const prim = d.createPrimitive().setAttribute('POSITION', A('VEC3', pf)).setAttribute('NORMAL', A('VEC3', vertexNormals(pf, ix))).setAttribute('COLOR_0', A('VEC3', new Float32Array(cc))).setIndices(A('SCALAR', ix)).setMaterial(d.createMaterial('m').setRoughnessFactor(0.8).setDoubleSided(true));
  d.createScene('s').addChild(d.createNode('n').setMesh(d.createMesh('m').addPrimitive(prim)));
  await io.write(`${DBG}/${name}.glb`, d);
}
// a low-poly mesh (pos, idx, optional per-vertex colour) as a static GLB
async function dbgMesh(name, pos, idx, colour) {
  if (!DBG) return;
  const { Document } = await import('@gltf-transform/core');
  const d = new Document(), b = d.createBuffer(), A = (t, a) => d.createAccessor().setType(t).setArray(a).setBuffer(b);
  const pf = Float32Array.from(pos), ix = Uint32Array.from(idx), prim = d.createPrimitive().setAttribute('POSITION', A('VEC3', pf)).setAttribute('NORMAL', A('VEC3', vertexNormals(pf, ix))).setIndices(A('SCALAR', ix)).setMaterial(d.createMaterial('m').setRoughnessFactor(0.7).setDoubleSided(true));
  if (colour) prim.setAttribute('COLOR_0', A('VEC3', Float32Array.from({ length: pf.length }, (_, k) => colour(Math.floor(k / 3))[k % 3])));
  d.createScene('s').addChild(d.createNode('n').setMesh(d.createMesh('m').addPrimitive(prim)));
  await io.write(`${DBG}/${name}.glb`, d);
}
const wColour = (i) => { const c = [0, 0, 0]; for (let k = 0; k < 4; k++) { const w = mesh.W[i * 4 + k]; if (w) PAL[mesh.J[i * 4 + k] % 16].forEach((x, q) => (c[q] += x * w)); } return c; };
await dbgMesh('low_weights', mesh.pos, mesh.idx, wColour);
if (DBG) {   // the parts on the full-res scan: legs (darker at the hip), hip rings white, antennae black, other thin parts grey
  const ringSet = new Set(LEGS.flatMap((g) => g.ring));
  await dbgScan('parts', (i) => (ringSet.has(i) ? [1, 1, 1] : PART[i] >= 0 && PART[i] < 14 ? PAL[PART[i] % 16].map((v) => v * (0.4 + 0.6 * LS[i])) : PART[i] === 20 || PART[i] === 21 ? [0.05, 0.05, 0.05] : PART[i] === 30 ? [0.6, 0.6, 0.6] : [0.35, 0.33, 0.3]));
}


// ---------- 10. clips ----------
// poses: { q: { joint: local rotation }, p: { root: translation } }. The bind frames are the world axes, so a plate's
// pitch is about X (+ lowers what lies ahead of it, raises what trails behind), yaw about Y (+ toward +X, the louse's
// left) and roll about Z (+ lifts its left side). curl > 0 rolls a plate toward the belly on either side of 'body'.
const FPS = 30;
const BODY_Y = -0.022;   // standing, the body is carried low (the scan's legs hang straight down)
const newPose = (y = BODY_Y) => ({ q: {}, p: { root: V(0, y, 0) } });
const R3 = (pitch = 0, yaw = 0, roll = 0) => Qa(Y, yaw).multiply(Qa(X, pitch)).multiply(Qa(Z, roll));
function rot(P, b, pitch = 0, yaw = 0, roll = 0) { if (!pitch && !yaw && !roll) return P; const q = R3(pitch, yaw, roll); P.q[b] = P.q[b] ? P.q[b].multiply(q) : q; return P; }
function rotA(P, b, axis, a) { if (!a) return P; const q = Qa(axis, a); P.q[b] = P.q[b] ? P.q[b].multiply(q) : q; return P; }
function move(P, x = 0, y = 0, z = 0) { P.p.root = (P.p.root || V()).add(V(x, y, z)); return P; }
const clonePose = (P) => ({ q: Object.fromEntries(Object.entries(P.q).map(([k, q]) => [k, q.clone()])), p: Object.fromEntries(Object.entries(P.p).map(([k, v]) => [k, v.clone()])) });
// a blend of two poses (k: of the second)
function mixPose(A, B, k) {
  const out = newPose(0); const names = new Set([...Object.keys(A.q), ...Object.keys(B.q)]);
  for (const n of names) out.q[n] = (A.q[n] || new THREE.Quaternion()).clone().slerp(B.q[n] || new THREE.Quaternion(), k);
  out.p.root = (A.p.root || V()).clone().lerp(B.p.root || V(), k);
  return out;
}
// a world-space turn of a joint about its own position, folded into its local rotation
function worldRot(P, F, name, qW) {
  const pi = rig.parent[J(name)], Wpq = pi < 0 ? new THREE.Quaternion() : F.Wq[pi];
  P.q[name] = Wpq.clone().invert().multiply(qW).multiply(Wpq).multiply(P.q[name] ? P.q[name].clone() : new THREE.Quaternion());
}
const FRONT = ['p3', 'p2', 'p1', 'head'], BACK = ['p5', 'p6', 'p7', 'pleon1', 'pleon2', 'tail'];
// the plates rolled toward the belly (a < 0 arches the back); the front plates turn a little more (fewer of them)
const CURL_F = [1.0, 1.1, 1.2, 1.3], CURL_B = [0.9, 0.95, 1.0, 1.15, 1.25, 1.4];
function curl(P, a, front = 1, back = 1) { FRONT.forEach((b, i) => rot(P, b, a * CURL_F[i] * front)); BACK.forEach((b, i) => rot(P, b, -a * CURL_B[i] * back)); return P; }

// the legs
const LEG = {};
for (const g of LEGS) {
  const L = { g, n: g.n, side: g.side, sx: g.side === 'L' ? 1 : -1, hip: `${g.name}_hip`, knee: `${g.name}_knee`, ankle: `${g.name}_ankle`, plate: LEG_PLATE[g.n - 1], tipB: g.tip.clone() };
  const H = rig.bind[J(L.hip)], K = rig.bind[J(L.knee)];
  L.a = H.distanceTo(K); L.b = K.distanceTo(L.tipB); L.reach = L.a + L.b;
  L.verts = []; for (let i = 0; i < LNV; i++) if (M.part[i] === LEGS.indexOf(g)) L.verts.push(i);
  LEG[g.name] = L;
}
const tipW = (F, L) => F.Wp[J(L.ankle)].clone().add(L.tipB.clone().sub(rig.bind[J(L.ankle)]).applyQuaternion(F.Wq[J(L.ankle)]));
let IKERR = 0, IKWHO = '';
// two-bone IK (hip -> knee -> claw tip, the ankle as posed): the knee bent to the reach, the hip aimed, then turned
// about the aim so the knee points at the pole (a world point)
function legIK(P, L, T, pole) {
  for (let it = 0; it < 2; it++) {
    let F = fk(rig, P);
    const H = F.Wp[J(L.hip)], K = F.Wp[J(L.knee)], E = tipW(F, L);
    const a = H.distanceTo(K), b = K.distanceTo(E), c = clamp(H.distanceTo(T), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const u = H.clone().sub(K).normalize(), v = E.clone().sub(K).normalize(), n = u.clone().cross(v).normalize();
    worldRot(P, F, L.knee, Qa(n, (Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1)) - Math.acos(clamp(u.dot(v), -1, 1))) / deg));
    F = fk(rig, P);
    worldRot(P, F, L.hip, new THREE.Quaternion().setFromUnitVectors(tipW(F, L).sub(H).normalize(), T.clone().sub(H).normalize()));
    if (pole) {
      F = fk(rig, P);
      const ax = T.clone().sub(H).normalize(), k1 = F.Wp[J(L.knee)].clone().sub(H).projectOnPlane(ax), p1 = pole.clone().sub(H).projectOnPlane(ax);
      if (k1.lengthSq() > 1e-10 && p1.lengthSq() > 1e-10) {
        const ang = Math.atan2(k1.clone().cross(p1).dot(ax), k1.dot(p1));
        worldRot(P, F, L.hip, Qa(ax, ang / deg));
      }
    }
  }
  // (only a claw that should stand on the ground and does not, slides)
  if (T.y < 0.01 && L.n > 1) { const e = tipW(fk(rig, P), L).distanceTo(T); if (e > IKERR) { IKERR = e; IKWHO = L.g.name; } }
  return P;
}
// a leg's pole: out to its side and a little up from the hip (in the plate's frame, so it turns with the body)
const poleOf = (F, L, up = 0.05, out = 0.16) => F.Wp[J(L.hip)].clone().add(V(L.sx * out, up, 0).applyQuaternion(F.Wq[J(L.plate)]));
// where each claw stands: fanned from the hip, front legs forward, back legs back, at 80-88% of its reach
const FAN = [58, 40, 22, 4, -16, -32, -48];
for (const L of Object.values(LEG)) {
  const H = rig.bind[J(L.hip)].clone().add(V(0, BODY_Y, 0)), r = (L.n >= 5 || L.n === 2 ? 0.8 : 0.88) * L.reach, rh = Math.sqrt(Math.max(0.0025, r * r - H.y * H.y)), th = FAN[L.n - 1] * deg;
  L.home = V(H.x + L.sx * rh * Math.cos(th), 0, H.z + rh * Math.sin(th));
}
// the first pair, short and hooked, are graspers: held up under the head, not walked on
for (const L of Object.values(LEG)) L.held = V(L.sx * 0.035, -0.075, 0.05);
// the claws set down so each leg's lowest point just touches the ground
const legsLow = (pts, L) => { let m = 9; for (const i of L.verts) m = Math.min(m, pts[i].y); return m; };
for (let it = 0; it < 2; it++) {
  const P = newPose(); const F0 = fk(rig, P);
  for (const L of Object.values(LEG)) if (L.n > 1) legIK(P, L, L.home, poleOf(F0, L));
  const pts = skin(rig, mesh, fk(rig, P));
  for (const L of Object.values(LEG)) if (L.n > 1) L.home.y -= legsLow(pts, L);
}
{
  const P = newPose(), F0 = fk(rig, P), errs = [];
  for (const L of Object.values(LEG)) { if (L.n === 1) continue; IKERR = 0; legIK(P, L, L.home, poleOf(F0, L)); errs.push(`${L.g.name} ${L.a.toFixed(3)}+${L.b.toFixed(3)} d ${rig.bind[J(L.hip)].distanceTo(L.home).toFixed(3)} err ${(IKERR * 100).toFixed(1)}`); }
  log('legs:\n  ' + errs.join('\n  '));
}
for (const L of Object.values(LEG)) { const H = rig.bind[J(L.hip)], K = rig.bind[J(L.knee)]; L.hinge = H.clone().sub(K).cross(L.tipB.clone().sub(K)).normalize(); }

const info = {};
const clip = (name, dur, fn, o = {}) => { IKERR = 0; IKWHO = ''; const r = writeClip(D, rig, umesh, name, dur, fn, { minEdge: 0.006, fps: o.fps ?? FPS, ...o }); info[name] = { ...r.info, ik: +(IKERR * 100).toFixed(1) + 'cm ' + IKWHO }; return r; };
// the antennae feeling about (k: how much; f: whole cycles per clip, so loops close); the tail fans breathing
function life(P, t, dur, k = 1, f = 1) {
  const w = (n, ph = 0) => Math.sin(TAU * (n * f * t / dur + ph));
  for (const [s, m] of [['L', 1], ['R', -1]]) {
    rot(P, `ant${s}0`, 6 * k * w(1, 0.15 * m), m * 9 * k * w(1, 0.3 + 0.2 * m));
    rot(P, `ant${s}1`, 5 * k * w(2, 0.4 + 0.1 * m), m * 7 * k * w(1, 0.55));
    rot(P, `ant${s}2`, 6 * k * w(2, 0.7), m * 9 * k * w(1, 0.8 + 0.1 * m));
    rot(P, `uro${s}`, 0, m * 3 * k * w(1, 0.2));
  }
  return P;
}
// every claw on its mark: home + off(L) ({ x, y, z } or null), the ankle curled by curlA(L) degrees first
function stand(P, off = () => null, curlA = () => 0) {
  const F = fk(rig, P);
  for (const L of Object.values(LEG)) {
    const c = curlA(L); if (c) rotA(P, L.ankle, L.hinge, -c);
    const d = off(L), T = L.n === 1 ? F.Wp[J(L.hip)].clone().add(L.held.clone().applyQuaternion(F.Wq[J(L.plate)])) : L.home.clone();
    if (d) T.add(V(d.x || 0, d.y || 0, d.z || 0));
    legIK(P, L, T, poleOf(F, L));
  }
  return P;
}
// the metachronal wave: each leg swings forward (lifted, the claw curled) then pushes back on the ground; the wave
// runs from the last legs to the first, the two sides half a cycle apart. u: the leg's phase, 0 at lift-off.
const legPhase = (L, ph, wave) => ((ph + (L.n - 1) * wave + (L.side === 'R' ? 0.5 : 0)) % 1 + 1) % 1;
function stride(L, u, duty, len, lift) {
  const s0 = 1 - duty;
  if (u < s0) { const f = u / s0; return { z: -len / 2 + len * smooth(f), y: lift * Math.sin(Math.PI * f), c: Math.sin(Math.PI * f) }; }
  return { z: len / 2 - (len * (u - s0)) / duty, y: 0, c: 0 };
}
function gait(t, T, o) {
  const P = newPose(), ph = t / T;
  move(P, 0, o.bob * Math.cos(TAU * 2 * ph), 0);
  rot(P, 'body', o.pitch * Math.sin(TAU * 2 * ph + 0.6), o.sway * Math.sin(TAU * ph), o.roll * Math.sin(TAU * ph + 0.4));
  // a small lateral ripple down the plates
  FRONT.forEach((b, i) => rot(P, b, 0, -o.sway * 0.25 * Math.sin(TAU * (ph + 0.08 * (i + 1)))));
  BACK.forEach((b, i) => rot(P, b, 0, o.sway * 0.3 * Math.sin(TAU * (ph - 0.08 * (i + 1)))));
  life(P, t, T, o.life ?? 0.6, 1);
  const S = {}; for (const L of Object.values(LEG)) S[L.g.name] = stride(L, legPhase(L, ph, o.wave), o.duty, o.len * (L.n === 1 ? 0.35 : clamp(L.reach / 0.19, 0.6, 1.0)), o.lift * (L.n === 1 ? 0.5 : 1));
  return stand(P, (L) => ({ z: S[L.g.name].z, y: S[L.g.name].y }), (L) => o.curlA * S[L.g.name].c);
}
// idle: standing, breathing in the plates, feeling about; twice a leg shifts its grip (3.2 s, loops)
const IDLE = 3.2;
const shuffle = (t, t0, d) => (t < t0 || t > t0 + d ? null : { y: 0.035 * Math.sin((Math.PI * (t - t0)) / d), z: 0.02 * Math.sin((Math.PI * (t - t0)) / d) });
clip('idle', IDLE, (t) => {
  const P = newPose(), br = Math.sin((TAU * 2 * t) / IDLE);
  move(P, 0, 0.003 * br, 0);
  curl(P, 0.7 * br); rot(P, 'body', -0.6 * br);
  rot(P, 'head', 3 * Math.sin((TAU * t) / IDLE + 0.5), 4 * Math.sin((TAU * t) / IDLE));
  life(P, t, IDLE, 1.3, 1);
  return stand(P, (L) => (L.g.name === 'leg2L' ? shuffle(t, 0.7, 0.4) : L.g.name === 'leg5R' ? shuffle(t, 1.9, 0.45) : L.g.name === 'leg1R' ? shuffle(t, 2.5, 0.35) : null),
    (L) => (L.g.name === 'leg2L' ? 30 * bump(t, 0.7, 1.1) : L.g.name === 'leg5R' ? 30 * bump(t, 1.9, 2.35) : L.g.name === 'leg1R' ? 30 * bump(t, 2.5, 2.85) : 0));
}, { loop: true });
// walk and run: the wave at two rates; speed = stride / (duty x cycle)
const WALK = { T: 0.56, duty: 0.62, wave: 1 / 7, len: 0.12, lift: 0.035, curlA: 25, bob: 0.003, pitch: 0.6, sway: 2.2, roll: 1.2 };
const RUN = { T: 0.3, duty: 0.48, wave: 1 / 7, len: 0.16, lift: 0.05, curlA: 35, bob: 0.005, pitch: 1.0, sway: 3.0, roll: 1.8, life: 0.4 };
const WALK_V = +(WALK.len / (WALK.duty * WALK.T)).toFixed(2), RUN_V = +(RUN.len / (RUN.duty * RUN.T)).toFixed(2);
clip('walk', WALK.T, (t) => gait(t, WALK.T, WALK), { loop: true, fps: 60 });
clip('run', RUN.T, (t) => gait(t, RUN.T, RUN), { loop: true, fps: 60 });

// ---------- the ball ----------
// curling: the plates roll toward the belly (kp), the legs fold flat against it (kl: each claw on a mark under its own
// plate, the knee out to the side), the antennae and tail fans tuck in; the body is then set down on its shell
const BODYV = []; for (let i = 0; i < LNV; i += 2) if (M.part[i] === -1 || M.part[i] === 30) BODYV.push(i);
const skinList = (F, list) => { const out = [], v = V(), acc = V(); for (const i of list) { acc.set(0, 0, 0); for (let k = 0; k < 4; k++) { const w = mesh.W[i * 4 + k]; if (!w) continue; const j = mesh.J[i * 4 + k]; v.set(mesh.pos[i * 3] - rig.bind[j].x, mesh.pos[i * 3 + 1] - rig.bind[j].y, mesh.pos[i * 3 + 2] - rig.bind[j].z).applyQuaternion(F.Wq[j]).add(F.Wp[j]); acc.addScaledVector(v, w); } out.push(acc.clone()); } return out; };
const shellLow = (P) => Math.min(...skinList(fk(rig, P), BODYV).map((p) => p.y));
// the body's nose-down pitch that brings the lowest points of its front and back halves level
const mainJ = (i) => rig.names[mesh.J[i * 4]];
const FRONTV = BODYV.filter((i) => ['head', 'p1', 'p2', 'p3'].includes(mainJ(i))), BACKV = BODYV.filter((i) => ['p6', 'p7', 'pleon1', 'pleon2', 'tail', 'uroL', 'uroR'].includes(mainJ(i)));
function levelPitch(P) {
  let a = -80, b = 80;
  for (let it = 0; it < 12; it++) {
    const m = (a + b) / 2, Q = clonePose(P); rot(Q, 'body', m); const F = fk(rig, Q);
    const lf = Math.min(...skinList(F, FRONTV).map((p) => p.y)), lb = Math.min(...skinList(F, BACKV).map((p) => p.y));
    if (lf > lb) a = m; else b = m;
  }
  return (a + b) / 2;
}
// the body lifted (before the legs are set) wherever its shell would dip into the ground
const keepUp = (P) => { const low = shellLow(P); if (low < 0.004) P.p.root.y += 0.004 - low; return P; };
for (const L of Object.values(LEG)) {
  const H = rig.bind[J(L.hip)];
  L.fold = V(L.sx * 0.012, H.y - 0.035, H.z - (L.n <= 2 ? 0.0 : 0.03));   // bind coordinates, carried by the leg's plate
}
const plateAt = (F, L, b) => F.Wp[J(L.plate)].clone().add(b.clone().sub(rig.bind[J(L.plate)]).applyQuaternion(F.Wq[J(L.plate)]));
const CURL = 30;
// kp plates, kl legs, ground: the claws' ground marks (or null: the legs only fold), wig: a flail of the legs (0..1)
function ballPose(P, kp, kl, t = 0, wig = 0, ground = true, lag = 0) {
  // the head tucks first and the tail follows (lag: how far behind, 0..1)
  const kf_ = clamp(kp * (1 + lag)), kb_ = clamp(kp * (1 + lag) - lag);
  curl(P, CURL, smooth(kf_), smooth(kb_));
  // the body pitched so the half-closed C stands on both its ends (not on its longer tail)
  const lw = smooth(kp / 0.35);
  if (lw > 0) rot(P, 'body', lw * levelPitch(P));
  for (const [s, m] of [['L', 1], ['R', -1]]) {
    // the antennae laid back along the ball's flanks (bent against the head's curl), the tail fans folded in under
    rot(P, `ant${s}0`, -30 * kp, m * 12 * kp); rot(P, `ant${s}1`, -42 * kp, m * 6 * kp); rot(P, `ant${s}2`, -42 * kp);
    rot(P, `uro${s}`, -30 * kb_, m * 30 * kb_);
  }
  // set down: while the legs still stand, the body only rises off them if its shell would dip into the ground
  const low = shellLow(P), dy = -low, k = smooth(kl);
  P.p.root.y += k * dy + (1 - k) * Math.max(0, dy);
  const F = fk(rig, P);
  for (const L of Object.values(LEG)) {
    const w = wig * Math.sin(TAU * (3.1 * t + L.n * 0.37 + (L.side === 'R' ? 0.5 : 0)));
    rotA(P, L.ankle, L.hinge, -(20 + 25 * kl) * kl + 25 * w);
    const fold = plateAt(F, L, L.fold).add(V(L.sx * 0.03 * w, 0.02 * w, 0));
    let T = fold;
    if (ground && kl < 1) {
      const g = L.n === 1 ? F.Wp[J(L.hip)].clone().add(L.held.clone().applyQuaternion(F.Wq[J(L.plate)])) : L.home.clone();
      T = g.lerp(fold, k);
    }
    const pole = F.Wp[J(L.hip)].clone().add(V(L.sx * 0.16, 0.05 * (1 - k) - 0.02 * k, 0).applyQuaternion(F.Wq[J(L.plate)]));
    legIK(P, L, T, pole);
  }
  return P;
}
// the ball's centre at full curl (root space), for rolling about it
const BALL = (() => { const P = ballPose(newPose(0), 1, 1, 0, 0, false); const pts = skinList(fk(rig, P), BODYV); const c = pts.reduce((a, p) => a.add(p), V()).multiplyScalar(1 / pts.length); return { c: c.sub(P.p.root), r: 0 }; })();
{ const P = ballPose(newPose(0), 1, 1, 0, 0, false); const pts = skinList(fk(rig, P), BODYV); const c = BALL.c.clone().add(P.p.root); BALL.r = pts.reduce((a, p) => a + p.distanceTo(c), 0) / pts.length; }
log(`ball: centre ${BALL.c.toArray().map((v) => v.toFixed(3))}, radius ${BALL.r.toFixed(3)}`);
// the ball rolled by phi degrees about its centre (forward is +), its lowest point on the ground, moved z forward
function rolled(P, phi, z = 0) {
  const q = Qa(X, phi), c = BALL.c.clone().add(P.p.root);
  P.q.root = q; P.p.root = c.clone().sub(c.clone().applyQuaternion(q)).add(P.p.root.clone().setY(P.p.root.y)).add(V(0, 0, z));
  const low = Math.min(...skinList(fk(rig, P), BODYV).map((p) => p.y));
  P.p.root.y -= low;
  return P;
}

// curl: rolls up into a ball (0.6 s, held)
const CURL_T = 0.6;
clip('curl', CURL_T, (t) => {
  const P = newPose(); life(P, t, CURL_T, 0.6 * (1 - ramp(t, 0, 0.3)), 1);
  rot(P, 'head', 8 * bump(t, 0, 0.2));
  return ballPose(P, ramp(t, 0.04, 0.52), ramp(t, 0, 0.42), t, 0.5 * bump(t, 0, 0.35), true, 0.5);
}, { fps: 40 });
// roll: the ball rolling forward, in place (one turn, loops); the game moves it (rollSpeed: the ground speed it matches)
const ROLL_T = 0.5, ROLL_V = +((TAU * BALL.r) / ROLL_T).toFixed(2);
clip('roll', ROLL_T, (t) => rolled(ballPose(newPose(0), 1, 1, 0, 0, false), (360 * t) / ROLL_T), { loop: true, fps: 48 });
// uncurl: the ball loosens, the legs feel for the ground, the plates open and it stands (0.9 s)
const UNCURL_T = 0.9;
clip('uncurl', UNCURL_T, (t) => {
  const P = newPose(); life(P, t, UNCURL_T, 0.8 * ramp(t, 0.5, 0.9), 1);
  return ballPose(P, 1 - ramp(t, 0.12, 0.72), 1 - ramp(t, 0.3, 0.82), t, 0.8 * bump(t, 0.1, 0.7), true, 0.4);
}, { fps: 40 });
// spawn: tumbles out of the hull as a ball (rolling in from 0.5 m behind), unrolls and stands (1.1 s)
const SPAWN_T = 1.1;
clip('spawn', SPAWN_T, (t) => {
  const P = newPose(), open = ramp(t, 0.42, 0.85);
  life(P, t, SPAWN_T, ramp(t, 0.7, 1.1), 1);
  ballPose(P, 1 - open, 1 - ramp(t, 0.5, 0.95), t, 0.9 * bump(t, 0.4, 0.95), true, 0.4);
  // roll in while closed: about half a turn, slowing
  const k = 1 - ramp(t, 0.3, 0.55), roll = kf(t, [[0, -200], [0.42, 0]]);
  if (k > 0) { const Q = rolled(ballPose(newPose(0), 1, 1, 0, 0, false), roll, kf(t, [[0, -0.5], [0.42, 0]])); return mixPose(P, Q, k); }
  return P;
}, { fps: 40 });
// attack: rears on its back legs with the graspers spread, then lunges and bites, the graspers raking down (0.85 s)
const ATK_T = 0.85, ATK_HIT = 0.42;
clip('attack', ATK_T, (t) => {
  const P = newPose(), up = env(t, 0.04, 0.3, 0.36, 0.5), lunge = env(t, 0.3, ATK_HIT, 0.5, 0.78), snap = bump(t, 0.34, 0.52);
  move(P, 0, 0.03 * up, -0.03 * up + 0.08 * lunge);
  rot(P, 'body', -14 * up + 8 * lunge);
  FRONT.forEach((b, i) => rot(P, b, -3 * up + (i === 3 ? 22 * snap : 2 * lunge)));
  BACK.forEach((b, i) => rot(P, b, 2 * up * (i < 3 ? 1 : 0)));
  life(P, t, ATK_T, 0.5, 1);
  for (const [s0, m] of [['L', 1], ['R', -1]]) { rot(P, `ant${s0}0`, -20 * up + 10 * lunge, m * 15 * up); rot(P, `ant${s0}1`, -10 * up); }
  keepUp(P);
  return stand(P, (L) => {
    if (L.n === 1) return { x: L.sx * 0.03 * up - L.sx * 0.02 * lunge, y: 0.05 * up - 0.04 * lunge, z: 0.04 * up + 0.06 * lunge };
    if (L.n === 2) return { y: 0.05 * up * (1 - lunge), z: 0.05 * lunge };
    return null;
  }, (L) => (L.n <= 2 ? 30 * snap : 0));
}, { fps: 40 });
// hit: jolted back and reared, the head flung up and aside, the legs scrabble (0.45 s)
const HIT_T = 0.45;
clip('hit', HIT_T, (t) => {
  const P = newPose(), j = Math.pow(bump(t, 0, 0.36), 0.6), k = bump(t, 0, HIT_T);
  move(P, 0, 0.008 * j, -0.045 * k);
  curl(P, -3 * j, 1, 0.4); rot(P, 'body', -7 * j, 7 * j, 5 * j); rot(P, 'head', -6 * j, -5 * j);
  life(P, t, HIT_T, 0.4, 1);
  for (const [s0, m] of [['L', 1], ['R', -1]]) { rot(P, `ant${s0}0`, -25 * j, m * 20 * j); rot(P, `ant${s0}1`, -15 * j); }
  keepUp(P);
  return stand(P, (L) => (L.n === 1 ? { y: 0.03 * j, z: -0.03 * j } : { z: -0.015 * k * (L.n % 2 ? 1 : -1), y: 0.02 * bump(t, 0.05 + 0.02 * (L.n % 3), 0.3) }));
}, { fps: 40 });
// die: convulses, legs flailing, curls up and rolls over forward half a metre, then lies still, loosened, a last
// twitch in the legs (1.8 s, held)
const DIE_T = 1.8, DIE_ROLL = 0.5;
clip('die', DIE_T, (t) => {
  const sp = env(t, 0, 0.1, 0.3, 0.5), kp = ramp(t, 0.12, 0.62) * (1 - 0.18 * ramp(t, 1.3, 1.7)), kl = ramp(t, 0.1, 0.55) * (1 - 0.3 * ramp(t, 1.3, 1.7));
  const P = newPose(); rot(P, 'body', -6 * sp, 0, 4 * sp); rot(P, 'head', -12 * sp);
  life(P, t, DIE_T, 1.5 * sp, 2);
  ballPose(P, kp, kl, t, 0.9 * env(t, 0, 0.08, 0.35, 0.6) + 0.25 * bump(t, 1.45, 1.7), true, 0.35);
  // the roll, once it is closed: travel and turn together (the turn the ball's radius gives the distance)
  const r = ramp(t, 0.5, 1.35), d = DIE_ROLL * (r < 1 ? 1 - Math.pow(1 - r, 2.2) : 1), phi = (d / BALL.r) / deg;
  if (t > 0.5) { const Q = rolled(clonePose(P), phi, d); return mixPose(P, Q, ramp(t, 0.5, 0.62)); }
  return P;
}, { fps: 30 });

// ---------- 11. finish ----------
const STRIKE = { attack: ATK_HIT };
if (DBG) await io.write(`${DBG}/louse_raw.glb`, D.doc);
let rb = { lo: V(1e9, 1e9, 1e9), hi: V(-1e9, -1e9, -1e9) };
{ const pts = skin(rig, mesh, fk(rig, stand(newPose()))); for (const p of pts) { rb.lo.min(p); rb.hi.max(p); } }
const bytes = await finish(D.doc, OUT, {
  hit: STRIKE, height: +(rb.hi.y - rb.lo.y).toFixed(2), length: +(rb.hi.z - rb.lo.z).toFixed(2), legSpan: +(rb.hi.x - rb.lo.x).toFixed(2),
  walkSpeed: WALK_V, runSpeed: RUN_V, rollSpeed: ROLL_V, ballRadius: +BALL.r.toFixed(3), dieRoll: DIE_ROLL,
  credit: '"CC0 Giant Isopod, B. doederleinii" by ffish.asia / floraZia.com (sketchfab.com/ffishAsia-and-floraZia), CC0 1.0 - thinned, re-textured, rigged and animated for Skotos', license: 'CC0-1.0'
}, { base: 512, aux: 256 });
log('louse', (bytes / 1024).toFixed(0) + ' KB', `${UW.idx.length / 3} triangles`, `walk ${WALK_V} m/s, run ${RUN_V} m/s`);
for (const [k, v] of Object.entries(info)) console.log('  ' + k.padEnd(8), JSON.stringify(v));
// (debug) the most stretched triangle edges standing and curled, with the joints of their two vertices
if (DBG) for (const [label, pose] of [['standing', stand(newPose())], ['ball', ballPose(newPose(0), 1, 1, 0, 0, false)]]) {
  const pts = skin(rig, umesh, fk(rig, pose)), ix = umesh.idx, out = [];
  const bp = (i) => V(umesh.pos[i * 3], umesh.pos[i * 3 + 1], umesh.pos[i * 3 + 2]);
  const jn = (i) => [0, 1, 2, 3].filter((k) => umesh.W[i * 4 + k] > 0.05).map((k) => rig.names[umesh.J[i * 4 + k]] + ':' + umesh.W[i * 4 + k].toFixed(2)).join(',');
  for (let t = 0; t < ix.length; t += 3) for (const [a, b] of [[ix[t], ix[t + 1]], [ix[t + 1], ix[t + 2]], [ix[t + 2], ix[t]]]) {
    const l0 = bp(a).distanceTo(bp(b)); if (l0 < 0.006) continue;
    out.push([pts[a].distanceTo(pts[b]) / l0, l0, a, b]);
  }
  out.sort((p, q) => q[0] - p[0]);
  console.log('stretched edges,', label);
  for (const [r, l0, a, b] of out.slice(0, 6)) console.log('  x' + r.toFixed(2), (l0 * 100).toFixed(1) + ' cm', jn(a), '|', jn(b));
}
