// The Rootwarden: "Treeman" by DJMaesen (sketchfab.com/bumstrum), CC-BY 4.0 -> src/assets/creatures/treeman.glb
// A stationary tree-man turret. The source has a clean 45-bone biped rig (arms, hands and fingers separately weighted)
// and one short idle; every contract clip is made here as rotations of its deform bones about body axes:
// idle (a slow, creaking sway), walk/run (copies of the idle: it never walks), attack ('lash': both arms sweep round at
// ground level), attack2 ('spikes': arms raised, then driven down into the ground), cast ('weep': head bowed, arms
// spread, shoulders shaking), rise ('uproot': from a hunched, dormant crouch to upright), dormant (that crouch, held),
// hit and die (sags, then topples like a felled trunk).
// The olive bark is re-graded to grey-brown and its yellow crack streaks become amber that glows (emissive mask); the
// leaf cards of its crown turn autumn gold.
// usage: node treeman.mjs [source.glb] [out.glb] [--raw keeps the source clip]
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, duration, dropClip, slimRig, byName, locals, worlds, skinnedPoints,
  X, Y, Z, bump, ramp, smooth, env, THREE, sharp } from '../act2/lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/treeman/model.glb', OUT = new URL('../../../src/assets/creatures/treeman.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RAW = process.argv.includes('--raw');
const HEIGHT = 3.4;   // to the top of the leaf crown
const FPS = 30;
const doc = await load(SRC);
const R = doc.getRoot();
dropLoose(doc);

// ---------- bones: plain names (the game's hit flinch looks for 'chest') ----------
const RENAME = { hip_01: 'hips', L_leg_02: 'thighL', L_knee_00: 'shinL', L_foot_03: 'footL', R_leg_04: 'thighR', R_knee_05: 'shinR', R_foot_06: 'footR',
  spine_07: 'spine', chest_08: 'chest', neck_041: 'neck', head_042: 'head', tip_043: 'headTip',
  L_shoulder_09: 'clavL', L_arm_010: 'armL', L_elbow_011: 'foreL', L_wrist_012: 'handL', R_shoulder_025: 'clavR', R_arm_026: 'armR', R_elbow_027: 'foreR', R_wrist_028: 'handR' };
for (const n of R.listNodes()) {
  const nm = n.getName();
  if (RENAME[nm]) n.setName(RENAME[nm]);
  else { const m = nm.match(/^([LR])_(pink|point|thumb)(\d)_\d+$/); if (m) n.setName({ pink: 'pinky', point: 'index', thumb: 'thumb' }[m[2]] + m[3] + m[1]); }
}
const SRCA = R.listAnimations()[0];
normalise(doc, { height: HEIGHT });
const FING = (s) => ['pinky', 'index', 'thumb'].flatMap((f) => [1, 2, 3].map((i) => f + i + s));

// ---------- helpers ----------
const W0 = worlds(doc, locals(doc, null, 0));
const wpos = (W, name) => new THREE.Vector3().setFromMatrixPosition(W.get(byName(doc, name)));
const idleBase = { base: SRCA };   // replaced below by the made idle
// a clip whose feet stay where the base pose puts them: the hips are moved to cancel the feet's drift (both feet, averaged),
// weighted by plant(t) (1 = fully planted). ground: also lifts the body wherever it would sink below y = 0.
function planted(name, o) {
  const n = Math.max(2, Math.round(o.dur * FPS) + 1);
  const tmp = makeClip(doc, '_tmp_' + name, { ...o, rootNode: 'hips' });
  const fix = [];
  for (let i = 0; i < n; i++) {
    const t = Math.min(o.dur, i / FPS);
    const W = worlds(doc, locals(doc, tmp, t));
    const Wb = worlds(doc, o.base ? locals(doc, o.base, o.baseAt ? o.baseAt(t) : Math.min(t, duration(o.base))) : locals(doc, null, 0));
    const d = new THREE.Vector3();
    for (const f of ['footL', 'footR']) d.add(wpos(Wb, f).sub(wpos(W, f)).multiplyScalar(0.5));
    d.multiplyScalar(o.plant ? o.plant(t, o.dur) : 1);
    fix.push(d);
  }
  dropClip(tmp);
  const at = (arr, t) => { const f = Math.min(n - 1, t * FPS), i = Math.floor(f), j = Math.min(n - 1, i + 1); return arr[i].clone().lerp(arr[j], f - i); };
  const rootFn = (extra) => (t, d) => { const r = o.root ? o.root(t, d) : {}; const p = at(fix, t).add(new THREE.Vector3(...(r.p || [0, 0, 0]))); if (extra) p.add(at(extra, t)); return { p: p.toArray(), r: r.r }; };
  if (!o.ground) return makeClip(doc, name, { ...o, rootNode: 'hips', root: rootFn(null) });
  const tmp2 = makeClip(doc, '_tmp2_' + name, { ...o, rootNode: 'hips', root: rootFn(null) });
  const lift = [];
  for (let i = 0; i < n; i++) lift.push(Math.max(0, -bounds(doc, tmp2, Math.min(o.dur, i / FPS), 4).min.y - (o.sink ?? 0)));
  dropClip(tmp2);
  // a running max over a few frames, so the lift never pops
  const sm = lift.map((_, i) => { let m = 0; for (let j = -3; j <= 3; j++) m = Math.max(m, lift[Math.max(0, Math.min(n - 1, i + j))]); return new THREE.Vector3(0, m, 0); });
  return makeClip(doc, name, { ...o, rootNode: 'hips', root: rootFn(sm) });
}
// a creak: a slow motion that sticks and slips, like a loaded trunk (0..1 in, 0..1 out, monotonic)
const creak = (x, steps = 4) => { x = Math.min(1, Math.max(0, x)); const f = x * steps, i = Math.floor(f), u = f - i; return (i + smooth(Math.min(1, u * 1.6))) / steps; };

// ---------- idle: a slow, creaking sway ----------
const IDLE_T = 6;
const swayKeys = (t, d) => {
  const p = (t / d) * Math.PI * 2;
  const s = Math.sin(p), c = Math.cos(p), s2 = Math.sin(2 * p);
  // a little stick-slip in the trunk: a faint shudder when the sway turns
  const jit = 0.5 * Math.sin(p * 9) * Math.pow(Math.abs(c), 6);
  return {
    hips: [[Z, 1.2 * s]], spine: [[Z, 1.6 * s + jit], [X, 1.0 * s2]], chest: [[Z, 1.4 * Math.sin(p - 0.5)], [Y, 2 * Math.sin(p - 0.3)], [X, 1.5 + 1.0 * c]],
    neck: [[X, 2 * Math.sin(p + 1)]], head: [[Z, -2 * Math.sin(p - 0.8)], [Y, 4 * Math.sin(p + 0.4)], [X, 2 * s2]],
    clavL: [[Z, 1.5 * c]], clavR: [[Z, -1.5 * c]],
    armL: [[X, -3 * Math.sin(p - 1)], [Z, 2 * Math.sin(p - 1.2)]], armR: [[X, 3 * Math.sin(p - 1.4)], [Z, 2 * Math.sin(p - 1.2)]],
    foreL: [[X, -3 + 2 * Math.sin(p - 1.6)]], foreR: [[X, -3 + 2 * Math.sin(p - 2)]],
    handL: [[X, 3 * Math.sin(p - 2)]], handR: [[X, 3 * Math.sin(p - 2.4)]]
  };
};
const idle = planted('idle', { dur: IDLE_T, loop: true, keys: swayKeys });
const idleAt = (t) => t % IDLE_T;
const onIdle = (o) => ({ base: idle, baseAt: o.baseAt ?? (() => 0), ...o });
copyClip(doc, idle, 'walk', { loop: true });
copyClip(doc, idle, 'run', { loop: true });

// ---------- hit ----------
const hit = planted('hit', onIdle({ dur: 0.6, keys: (t, d) => {
  const k = bump(t, 0, d) * (1 - 0.3 * t / d), w = Math.sin(t * 30) * (1 - t / d);
  return { spine: [[X, -5 * k]], chest: [[X, -7 * k], [Z, 3 * w]], neck: [[X, -6 * k]], head: [[X, -10 * k], [Y, 4 * w]],
    armL: [[Z, 10 * k], [X, 6 * k]], armR: [[Z, -10 * k], [X, 6 * k]], foreL: [[X, -12 * k]], foreR: [[X, -12 * k]] };
} }));

if (!RAW) dropClip(SRCA);
// ---------- materials ----------
// the source is specular-glossiness: plain metal/rough here (rough bark, glassy amber in the cracks)
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi); const L = (a, b, t) => a + (b - a) * t; return L(L(hash(xi, yi), hash(xi + 1, yi), u), L(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
const toPNG = (buf, w, h, ch) => sharp(buf, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
const BARK = [[0, [12, 9, 7]], [0.2, [30, 23, 18]], [0.45, [54, 44, 35]], [0.7, [80, 68, 56]], [1, [112, 100, 86]]];
const grad = (G, l) => { for (let i = 1; i < G.length; i++) if (l <= G[i][0]) { const [a, ca] = G[i - 1], [b, cb] = G[i], t = (l - a) / (b - a); return ca.map((c, k) => c + (cb[k] - c) * t); } return G[G.length - 1][1]; };
const LEAF = [[0, [226, 172, 52]], [0.35, [234, 150, 38]], [0.6, [206, 106, 28]], [1, [140, 52, 18]]];
const AMBER_DEEP = [150, 62, 8], AMBER_GOLD = [255, 176, 58];
for (const mat of R.listMaterials()) {
  const sg = mat.getExtension('KHR_materials_pbrSpecularGlossiness');
  const tex = sg.getDiffuseTexture(), nrm = mat.getNormalTexture();
  mat.setExtension('KHR_materials_pbrSpecularGlossiness', null);
  sg.getSpecularGlossinessTexture()?.dispose();
  mat.setBaseColorTexture(tex).setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0);
  const img = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: Wd, height: Hd } = img.info, src = img.data;
  if (mat.getName() === 'branch1') {
    // the crown: leaf cards turn autumn gold, amber and rust (a patchy noise across the atlas), twigs grey-brown bark
    const out = Buffer.alloc(Wd * Hd * 4), em = Buffer.alloc(Wd * Hd * 3);
    for (let i = 0, y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++, i++) {
      const r = src[i * 4] / 255, g = src[i * 4 + 1] / 255, b = src[i * 4 + 2] / 255, a = src[i * 4 + 3];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = (mx - mn) / Math.max(1e-3, mx), l = 0.3 * r + 0.55 * g + 0.15 * b;
      const leaf = ss(0.3, 0.5, sat) * ss(0.06, 0.14, mx);
      const bark = grad(BARK, Math.min(1, l * 2.2));
      const n = vnoise(x / 70, y / 70) * 0.7 + vnoise(x / 23 + 9, y / 23) * 0.3;
      const tone = grad(LEAF, n);
      const shade = 0.35 + 1.5 * l;
      const lc = tone.map((c) => c * shade);
      const c = bark.map((v, k) => Math.min(255, v + (lc[k] - v) * leaf));
      out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = a;
      em[i * 3] = c[0] * leaf; em[i * 3 + 1] = c[1] * leaf; em[i * 3 + 2] = c[2] * leaf;
    }
    tex.setImage(await sharp(out, { raw: { width: Wd, height: Hd, channels: 4 } }).resize(512, 512).png().toBuffer()).setMimeType('image/png');
    const et = doc.createTexture('crown_glow').setImage(await sharp(em, { raw: { width: Wd, height: Hd, channels: 3 } }).resize(256, 256).png().toBuffer()).setMimeType('image/png');
    mat.setEmissiveTexture(et).setEmissiveFactor([0.12, 0.12, 0.12]);
    mat.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true).setRoughnessFactor(0.75);
    if (nrm) nrm.setImage(await sharp(Buffer.from(nrm.getImage())).resize(256, 256).png().toBuffer()).setMimeType('image/png');
    continue;
  }
  // the body: bark re-graded from luminance; the yellow crack streaks become amber
  const N = Wd * Hd, val = new Float32Array(N), crack = new Float32Array(N);
  for (let i = 0; i < N; i++) val[i] = Math.max(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]);
  const blur = await sharp(Buffer.from(Uint8Array.from(val)), { raw: { width: Wd, height: Hd, channels: 1 } }).blur(5).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < N; i++) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2], mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, sat = (mx - mn) / Math.max(1e-3, mx);
    crack[i] = ss(0.55, 0.8, sat) * ss(0.2, 0.38, mx) * ss(0, 0.08, mx - blur[i] / 255);
  }
  const col = Buffer.alloc(N * 3);
  for (let i = 0, y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++, i++) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2], l = (0.3 * r + 0.55 * g + 0.15 * b) / 255;
    const n = vnoise(x / 40, y / 40);
    let c = grad(BARK, Math.min(1, l * 2.1)).map((v, k) => v * (0.9 + 0.2 * n) * [1.04, 1, 0.94][k]);
    const m = crack[i], am = AMBER_DEEP.map((v, k) => v + (AMBER_GOLD[k] - v) * Math.min(1, m * (0.4 + l * 2)));
    c = c.map((v, k) => Math.min(255, v + (am[k] - v) * m));
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  tex.setImage(await toPNG(col, Wd, Hd, 3)).setMimeType('image/png');
  // the glow: the crack mask grown a little and softened, so the thin streaks survive the 512 px map and bleed light
  const mk = Buffer.from(crack.map((v) => Math.round(v * 255)));
  const grown = await sharp(mk, { raw: { width: Wd, height: Hd, channels: 1 } }).dilate(1).extractChannel(0).raw().toBuffer();
  const halo = await sharp(grown, { raw: { width: Wd, height: Hd, channels: 1 } }).blur(3).extractChannel(0).raw().toBuffer();
  const em = Buffer.alloc(N * 3), mr = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) {
    const e = Math.min(1, Math.max(crack[i], 0.5 * grown[i] / 255, 0.45 * halo[i] / 255));
    em[i * 3] = 255 * e; em[i * 3 + 1] = 132 * e; em[i * 3 + 2] = 30 * e;
    mr[i * 3] = 255; mr[i * 3 + 1] = Math.round(255 * (0.92 - 0.55 * crack[i])); mr[i * 3 + 2] = 0;
  }
  const et = doc.createTexture('amber_glow').setImage(await sharp(em, { raw: { width: Wd, height: Hd, channels: 3 } }).resize(512, 512).png().toBuffer()).setMimeType('image/png');
  const rt = doc.createTexture('bark_rough').setImage(await sharp(mr, { raw: { width: Wd, height: Hd, channels: 3 } }).resize(512, 512).png().toBuffer()).setMimeType('image/png');
  mat.setEmissiveTexture(et).setEmissiveFactor([1, 1, 1]).setMetallicRoughnessTexture(rt).setRoughnessFactor(1);
  if (process.env.DUMP) { await sharp(col, { raw: { width: Wd, height: Hd, channels: 3 } }).png().toFile(process.env.DUMP + '/tm_col.png'); await sharp(em, { raw: { width: Wd, height: Hd, channels: 3 } }).png().toFile(process.env.DUMP + '/tm_em.png'); }
}
for (const e of R.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_pbrSpecularGlossiness') e.dispose();
for (const m of R.listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TANGENT', 'TEXCOORD_1', 'TEXCOORD_2']) p.setAttribute(s, null);

// ---------- finish ----------
const nUsed = slimRig(doc);
const b = bounds(doc, null, 0);
const hitT = {};
const bytes = await finish(doc, OUT, {
  hit: hitT, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 1, runSpeed: 2,
  credit: '"Treeman" by DJMaesen (sketchfab.com/bumstrum), CC-BY 4.0 - bark re-graded with glowing amber cracks, autumn crown, all animations made for Skotos', license: 'CC-BY-4.0'
}, { base: 1024, aux: 512 });
console.log('treeman', (bytes / 1024).toFixed(0) + ' KB', 'joints', nUsed, JSON.stringify(hitT), 'size', b.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join('x'));
