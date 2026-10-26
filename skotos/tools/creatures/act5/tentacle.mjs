// The Hands of the Skotos (Χέρια του Σκότους) and the Coil: "Tentacle (rigged)" by CG Daniel Glebinski
// (sketchfab.com/CGDanielGlebinski), CC-BY 4.0 -> src/assets/creatures/tentacle.glb.
// The source is the tentacle prop of his short film: a straight, even tube with two rows of suckers (16k triangles) that
// Blender bent along a path; the GLB carries no skin, only 200 morph targets baked from that path. Its first target is
// the tentacle laid out straight and tapered, which is the shape used here: straightened onto the Y axis, the suckers
// turned to face +Z (the inside of a forward curl), stood 5 m tall with its root 0.6 m below the surface it rises
// through, thickened toward the base, and thinned to about 3k triangles. Its textures were procedural Blender nodes, so
// it wears a code material with no texture: near-black, glossy, the suckers pale (vertex colour). The game patches the
// material (sea.js skotosSkin: aurora fresnel, the beam's streak, pale flecks), so the scene extras carry keepMat.
// The rig is code: 'root' at the surface (rise and sink move it), 'seg01'..'seg14' up the tentacle, closer toward the tip.
// Clips (in place): idle (a slow sway, the tip curling), rise (bursts up out of the water, uncurling), sweep (bent
// forward, swung across the front), lash (wound back, whipped out flat along the ground, the tip curls round and pulls
// back), slam (reared up and over, slammed down ahead), wrap (coiled up and around), smother (reaches out and coils
// down and tight, squeezing), recoil (thrown back from the beam), sink (curls and slides under; held), hit, die (writhes,
// goes limp and slides under; held).
// usage: node tentacle.mjs [source.glb] [out.glb]
import { finish } from '../act2/lib.mjs';
import { THREE, V, X, Y, Z, Qa, Qb, deg, clamp, smooth, ramp, bump, env, kf, TAU, makeRig, fk, skin, buildDoc, writeClip, smoothNormals, straightTentacle } from './rig.mjs';
const [SRC = '/tmp/claude-0/sf/act5/tentacle/model.glb', OUT = new URL('../../../src/assets/creatures/tentacle.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const TOP = 5.0;          // the tip at rest, metres above the surface
const BASE = -0.6;        // the root end, under the surface (never seen)
const TRIS = 3000;
// radial gain along the length (s 0 root .. 1 tip): thicker toward the base; the source's spade-shaped tip drawn in to a point
const THICK = (s) => 1.2 * (1.0 + 0.5 * Math.pow(1 - s, 1.4)) * (1 - 0.62 * smooth((s - 0.86) / 0.14));

// ---------- 1. the straight tapered shape (rig.mjs straightTentacle: the source's first morph target), thinned ----------
const T = await straightTentacle(SRC, { base: BASE, top: TOP, thick: THICK, tris: TRIS });
const P = T.pos, idx = T.idx, S = T.s, C = T.suck, NV = P.length / 3;

// ---------- 2. colours and normals ----------
const nor = smoothNormals(P, idx);
// colour: near-black skin, the sucker rims pale and their cups a little darker (COLOR_0 times the base factor)
const col = new Float32Array(NV * 3);
for (let i = 0; i < NV; i++) {
  const k = C[i], tipFade = 1 - 0.35 * smooth((S[i] - 0.8) / 0.2);
  const v = 0.08 + 0.72 * k * tipFade;
  col[i * 3] = v * 0.93; col[i * 3 + 1] = v * 0.94; col[i * 3 + 2] = v;
}

// ---------- 3. the rig: root at the surface, 14 segments up to the tip ----------
const NSEG = 14;
const segY = [0]; // joint heights: the first at the surface, then closing up toward the tip
for (let k = 1; k < NSEG; k++) { const u = k / NSEG; segY.push(TOP * (1 - Math.pow(1 - u, 1.35)) * 0.985); }
const joints = [{ name: 'root', parent: null, p: V(0, 0, 0) }];
segY.forEach((y, k) => joints.push({ name: 'seg' + String(k + 1).padStart(2, '0'), parent: k ? 'seg' + String(k).padStart(2, '0') : 'root', p: V(0, y, 0) }));
const rig = makeRig(joints);
const SEG = rig.names.filter((n) => n.startsWith('seg'));
// weights: each vertex blends the two segments around its height, the blend centred on the joint between them
const J = new Uint16Array(NV * 4), Wt = new Float32Array(NV * 4);
for (let i = 0; i < NV; i++) {
  const y = P[i * 3 + 1];
  if (y <= 0) { J[i * 4] = rig.idx.get('root'); J[i * 4 + 1] = rig.idx.get('seg01'); const f = smooth((y + 0.25) / 0.5); Wt[i * 4] = 1 - f; Wt[i * 4 + 1] = f; continue; }
  let k = 0; while (k < NSEG - 1 && y > segY[k + 1]) k++;
  // segment k spans segY[k]..segY[k+1]; blend into k-1 below its middle and into k+1 above it
  const a = segY[k], b = k < NSEG - 1 ? segY[k + 1] : TOP + 0.3, u = (y - a) / (b - a);
  const jk = rig.idx.get(SEG[k]);
  if (u < 0.5 && k > 0) { const f = 0.5 + u; J[i * 4] = jk; J[i * 4 + 1] = rig.idx.get(SEG[k - 1]); Wt[i * 4] = smooth(f); Wt[i * 4 + 1] = 1 - smooth(f); }
  else if (u >= 0.5 && k < NSEG - 1) { const f = 1.5 - u; J[i * 4] = jk; J[i * 4 + 1] = rig.idx.get(SEG[k + 1]); Wt[i * 4] = smooth(f); Wt[i * 4 + 1] = 1 - smooth(f); }
  else { J[i * 4] = jk; Wt[i * 4] = 1; }
}
const mesh = { pos: P, nor, col, idx, J, W: Wt };

// ---------- 4. clips ----------
// Poses are lists of local rotations, one per segment, built from: local bends (fromBends), a world tilt profile in one
// vertical plane (fromTilt: degrees from upright, as a function of the place along the tentacle), or world directions
// (fromDirs: each segment's heading, carried up the chain so nothing twists); poses blend by slerp (mix) and stack (mul).
const NS2 = SEG.length;
const U = SEG.map((_, k) => k / (NS2 - 1));
const LEN = segY.map((y, k) => (k < NSEG - 1 ? segY[k + 1] : TOP) - y);
const MID = segY.map((y, k) => y + LEN[k] / 2);   // the middle of each segment, metres up the tentacle
const fromBends = (fn) => U.map((u, k) => { const b = fn(u, k); return Qb(b.bx || 0, b.bz || 0, b.tw || 0); });
const fromTilt = (tilt, az = 0) => {
  const ax = X.clone().applyAxisAngle(Y, az * deg); let prev = 0;
  return U.map((u, k) => { const a = tilt(u, k); const q = Qa(ax, a - prev); prev = a; return q; });
};
const fromDirs = (dirs) => {
  let W = new THREE.Quaternion(), d0 = Y.clone();
  return dirs.map((d) => {
    const dn = d.clone().normalize(), Wn = new THREE.Quaternion().setFromUnitVectors(d0, dn).multiply(W);
    const q = W.clone().invert().multiply(Wn); W = Wn; d0 = dn; return q;
  });
};
const mix = (A, B, w) => A.map((a, k) => a.clone().slerp(B[k], typeof w === 'function' ? w(U[k], k) : w));
const mul = (A, B) => A.map((a, k) => a.clone().multiply(B[k]));
const pose = (Q, root = {}) => {
  const q = {}, p = {};
  Q.forEach((x, k) => (q[SEG[k]] = x));
  q.root = Qa(Y, root.yaw || 0).multiply(Qa(X, root.bx || 0)).multiply(Qa(Z, root.bz || 0));
  if (root.y) p.root = V(0, root.y, 0);
  return { q, p };
};
// a helix round an upright post in front of the root: straight up for `lead` metres, then round the post at radius r,
// climbing at `pitch` degrees (negative: coiling down); dir +1 turns counter-clockwise seen from above
function helix({ lead = 0.5, ease = 0.6, r = 0.8, pitch = 15, dir = 1, lean = 0 }) {
  const dirs = []; let psi = Math.PI;
  for (let k = 0; k < NS2; k++) {
    const s = MID[k];
    if (s < lead) { dirs.push(V(0, 1, Math.tan(lean * deg) * s / Math.max(lead, 0.01)).normalize()); continue; }
    const f = smooth((s - lead) / ease), b = pitch * deg;
    psi += (dir * LEN[k] * Math.cos(b)) / r * f;
    const h = V(Math.cos(psi), 0, -Math.sin(psi)).multiplyScalar(dir); // the circle's heading (its centre stays in front)
    const d = h.multiplyScalar(Math.cos(b)).add(V(0, Math.sin(b), 0));
    dirs.push(V(0, 1, Math.tan(lean * deg)).normalize().lerp(d, f).normalize());
  }
  return fromDirs(dirs);
}
const IDLE = 4.8;
// its standing shape (local bends, degrees): leaning back a little from the surface, then over forward, the last
// quarter hooked over like a question mark (about 75 degrees in all)
const SHAPE = (u) => -4 * (1 - smooth(u / 0.35)) + 4 * smooth((u - 0.3) / 0.3) + 26 * Math.pow(u, 5);
// the resting sway (also every clip's first and last pose): a slow wave travelling up, the tip curled forward a little
const swayB = (u, k, t) => {
  const w = TAU * t / IDLE, amp = 0.5 + 1.1 * u;
  return {
    bx: 2.8 * amp * Math.sin(w - k * 0.42) + SHAPE(u) * (1 + 0.18 * Math.sin(w * 2 - 1.1)),
    bz: 2.4 * amp * Math.sin(w + 1.7 - k * 0.38),
    tw: 1.5 * Math.sin(w * 2 - k * 0.3)
  };
};
const sway = (t) => fromBends((u, k) => swayB(u, k, t));
const REST = sway(0);
const D = buildDoc(rig, mesh, { name: 'skotosHand', base: [0.2, 0.19, 0.24, 1], rough: 0.24, metal: 0 }, { rootName: 'tentacle', meshName: 'tentacle_mesh', skinName: 'tentacle' });
const info = {}, HIT = {};
const CLIPS = {};
const clip = (name, dur, fn, o = {}) => { const r = writeClip(D, rig, mesh, name, dur, fn, { minEdge: 0.03, ...o }); info[name] = r.info; CLIPS[name] = r; return r; };

clip('idle', IDLE, (t) => pose(sway(t)), { loop: true });

// rise: comes up through its hole straight, the tip first with a small S running up it; out, it whips and settles
clip('rise', 1.5, (t) => {
  const up = kf(t, [[0, -5.9], [0.55, 0.15], [0.8, -0.05], [1.05, 0]]);
  const s = 1 - ramp(t, 0.4, 0.75), whip = bump(t, 0.5, 1.0), back = bump(t, 0.85, 1.35);
  const Q = mul(REST, fromBends((u) => ({
    bx: 3.5 * s * Math.sin(u * 7 - t * 16) + 7 * s * Math.pow(u, 4) - 10 * whip * Math.pow(u, 1.5) + 6 * back * Math.pow(u, 2),
    bz: 2.5 * s * Math.sin(u * 6 - t * 13 + 1), tw: 8 * s * u
  })));
  return pose(mix(Q, REST, ramp(t, 1.2, 1.5)), { y: up });
});

// sweep: bends out over its front (about 4 m out, 1.5 m up), swings from its right to its left (strike: the middle),
// the tip trailing the swing, and stands back up
HIT.sweep = 0.86;
clip('sweep', 1.7, (t) => {
  const reach = env(t, 0.1, 0.55, 1.25, 1.65);
  const yaw = kf(t, [[0, 0], [0.5, 62], [0.62, 58], [1.1, -64], [1.35, -60], [1.7, 0]]);
  const swing = bump(t, 0.55, 1.25);
  const out = fromTilt((u) => 72 * smooth(u / 0.4) + 8 * u);
  const Q = mul(mix(REST, out, reach), fromBends((u) => ({ bz: 16 * swing * u * u, bx: 4 * swing * Math.sin(u * 5 - t * 12) })));
  return pose(Q, { yaw });
});

// lash: rears back, whips out flat along the line before it (strike), the crack running out to the tip; the tip hooks
// round its catch and the whole tentacle hauls it back in
HIT.lash = 0.66;
clip('lash', 1.8, (t) => {
  const back = env(t, 0.0, 0.42, 0.45, 0.62), out = env(t, 0.5, 0.66, 1.0, 1.6), hook = env(t, 0.8, 1.05, 1.45, 1.8);
  const wave = (u) => bump(t - 0.14 * u, 0.5, 0.82);
  const reared = fromTilt((u) => -26 * smooth(u / 0.6) - 18 * Math.pow(u, 2));
  const flat = fromTilt((u) => 90 * smooth(u / 0.22) + 24 * smooth((u - 0.25) / 0.4) - 12 * smooth((u - 0.8) / 0.2));
  let Q = mix(REST, reared, back);
  Q = mix(Q, flat, out);
  Q = mul(Q, fromBends((u) => ({ bx: -4 * wave(u) * u - 3 * hook * u, bz: 3 * back * Math.sin(u * 5) + 40 * hook * Math.pow(u, 3) })));
  return pose(Q);
});

// slam: rears up and back over itself, then slams down ahead, the tip on the ice (strike), shivers there and recovers
HIT.slam = 0.74;
clip('slam', 1.6, (t) => {
  const rear = env(t, 0.05, 0.5, 0.55, 0.72), down = env(t, 0.6, 0.74, 1.05, 1.5);
  const shiver = bump(t, 0.74, 1.05) * Math.sin((t - 0.74) * 60);
  const reared = fromTilt((u) => -14 * smooth(u / 0.5) - 55 * Math.pow(u, 2.2));
  const flat = fromTilt((u) => 90 * smooth(u / 0.24) + 21 * smooth((u - 0.28) / 0.4) - 11 * smooth((u - 0.8) / 0.2));
  let Q = mix(mix(REST, reared, rear), flat, down);
  Q = mul(Q, fromBends((u) => ({ bx: -2.5 * shiver * u, bz: 1.5 * shiver * u })));
  return pose(Q);
});

// wrap: climbs round a post before it, once round and up, and holds there
HIT.wrap = 1.2;
const CLIMB = helix({ lead: 0.3, ease: 1.0, r: 0.62, pitch: 17, dir: 1, lean: 6 });
clip('wrap', 2.0, (t) => {
  const c = ramp(t, 0.15, 1.3), set = bump(t, 1.2, 1.8);
  return pose(mul(mix(REST, CLIMB, c), fromBends((u) => ({ bx: 3 * set * u }))));
});

// smother: reaches up tall, then coils down tight round what it holds, three squeezes (the tip curling in), and holds
HIT.smother = 1.1;
const TALL = fromTilt((u) => 10 * u + 20 * Math.pow(u, 3));
const COIL = helix({ lead: 1.6, ease: 0.8, r: 0.5, pitch: -16, dir: -1, lean: 14 });
clip('smother', 3.0, (t) => {
  const reach = env(t, 0.05, 0.45, 0.6, 1.0), c = ramp(t, 0.55, 1.2);
  const sq = [1.5, 2.05, 2.6].reduce((a, s) => a + bump(t, s, s + 0.45), 0);
  const Q = mix(mix(REST, TALL, reach), COIL, c);
  return pose(mul(Q, fromBends((u) => ({ bx: 7 * sq * smooth((u - 0.5) / 0.5), bz: -2 * sq * u }))));
});

// recoil: struck by the beam, it is thrown back and curls in on itself, then sways back up
HIT.recoil = 0.12;
clip('recoil', 1.1, (t) => {
  const k1 = env(t, 0, 0.12, 0.35, 1.0);
  const struck = fromBends((u) => ({ bx: -6 * (1 - u) + 22 * Math.pow(u, 2.2), bz: 5 * Math.sin(u * 6 + t * 20) * bump(t, 0, 0.6), tw: 10 * u }));
  return pose(mix(REST, struck, k1), { bx: -18 * k1 });
});

// sink: curls up and slides down under the surface; held
clip('sink', 1.4, (t) => {
  const c = ramp(t, 0, 0.6), d = kf(t, [[0, 0], [0.25, 0.2], [1.4, -5.9]]);
  return pose(mix(REST, fromBends((u) => ({ bx: 22 * Math.pow(u, 1.5), bz: 4 * Math.sin(u * 5), tw: 10 * u })), c), { y: d, bx: -8 * c });
});

// hit: a flinch back and a shudder up to the tip
HIT.hit = 0.1;
clip('hit', 0.55, (t) => {
  const k1 = bump(t, 0, 0.55);
  return pose(mul(REST, fromBends((u) => ({ bx: -6 * k1 * (1 - u) + 8 * k1 * u * Math.sin(t * 30 - u * 6), bz: 3 * k1 * Math.sin(t * 26 - u * 5) }))), { bx: -9 * k1 });
});

// die: cut: it writhes, buckles over to one side and goes limp, sliding under; held
clip('die', 2.4, (t) => {
  const wr = env(t, 0, 0.15, 0.7, 1.1), limp = ramp(t, 0.7, 1.5), d = kf(t, [[0, 0], [1.0, 0.1], [2.4, -6.0]]);
  const writhe = mul(REST, fromBends((u) => ({ bx: 12 * wr * Math.sin(t * 14 - u * 7), bz: 10 * wr * Math.sin(t * 11 + 1 - u * 6), tw: 20 * wr * u })));
  const limpQ = fromTilt((u) => 70 * smooth(u / 0.5) + 25 * u, -90);
  return pose(mix(writhe, limpQ, limp), { y: d });
});

for (const [k, v] of Object.entries(info)) console.log(k.padEnd(8), JSON.stringify(v));
{
  const far = []; for (let i = 0; i < NV; i++) if (P[i * 3 + 1] > 1.2) far.push(i);
  const sub = { pos: far.flatMap((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]), J: far.flatMap((i) => Array.from(J.slice(i * 4, i * 4 + 4))), W: far.flatMap((i) => Array.from(Wt.slice(i * 4, i * 4 + 4))) };
  const out = [];
  for (const nm of ['sweep', 'lash', 'slam', 'wrap', 'smother', 'recoil', 'hit']) {
    const r = CLIPS[nm]; let lo = 1e9, at = 0;
    r.frames.forEach((F, fi) => { if (fi % 3) return; for (const p of skin(rig, sub, F)) if (p.y < lo) { lo = p.y; at = fi / 30; } });
    out.push(`${nm} ${lo.toFixed(2)}@${at.toFixed(2)}`);
  }
  console.log('lowest point past 1.2 m up the tentacle (the ice is 0):', out.join(', '));
}

// ---------- 5. write ----------
const size = await finish(D.doc, OUT, {
  hit: HIT, height: TOP, keepMat: true, walkSpeed: 0, runSpeed: 0,
  credit: '"Tentacle (rigged)" by CG Daniel Glebinski (sketchfab.com/CGDanielGlebinski), CC-BY 4.0 - straightened, thinned, re-rigged; code material; every animation made for Skotos',
  license: 'CC-BY-4.0'
});
console.log('wrote', OUT, size, 'bytes');
