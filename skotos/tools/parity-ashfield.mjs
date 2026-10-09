// The Field of Ash against a committed copy: node tools/parity-ashfield.mjs [n=2000] [seed0=5] (check-act4's sweep)
// The Anvil's Neck (gen4.js neck(), Act V) is carved after tryAshfield returns, so a saved seed's Field must be the same
// layout but for the corridor: its cells and plug (L.neck), the 2-cell band round them (heights blended, dressing dropped,
// its own scree and trees), and the one exit pushed at its top. This builds genAshfield from REF (default HEAD; the world
// and core modules it imports, extracted from git) and from the working tree, and lists every difference outside that.
// Exits 1 on any. REF=<commit> compares against another commit.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), REF = process.env.REF || 'HEAD';
const N = +(process.argv[2] || 2000), S0 = +(process.argv[3] || 5);
// gen4.js at REF and whatever it imports (relative imports only), copied into a scratch tree
const tmp = mkdtempSync(join(tmpdir(), 'parity-'));
const fetch = (rel, seen = new Set()) => {
  if (seen.has(rel)) return; seen.add(rel);
  const src = execFileSync('git', ['show', `${REF}:./${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  mkdirSync(join(tmp, dirname(rel)), { recursive: true }); writeFileSync(join(tmp, rel), src);
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) fetch(posix.normalize(posix.join(posix.dirname(rel), m[1])), seen);
};
fetch('src/world/gen4.js');
const A0 = await import(pathToFileURL(join(tmp, 'src/world/gen4.js')).href), B0 = await import('../src/world/gen4.js');
rmSync(tmp, { recursive: true, force: true });

const fails = {}, add = (k, s) => (fails[k] ||= new Set()).add(s);
const J = (o) => JSON.stringify(o);
// what the corridor may touch: its cells and plug, and every cell within 2 of them (Chebyshev)
function bandOf(L) {
  const { w, h } = L, band = new Uint8Array(w * h), core = new Uint8Array(w * h);
  if (!L.neck) return { band, core };
  for (const [x, z] of [...L.neck.cells, ...L.neck.plug]) {
    core[z * w + x] = 1;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Z = z + dz; if (X >= 0 && Z >= 0 && X < w && Z < h) band[Z * w + X] = 1; }
  }
  return { band, core };
}
// the dressing the corridor may drop (rough footprint radii, times the prop's s): only what reached into its band
const FOOT = { ashTuft: 0.4, ashStone: 0.3, debris: 1, bones: 1, ashRock: 0.6, ashTree: 1.6, ashCrag: 1.8 };
// a prop's distance from the nearest corridor cell (centre to centre)
const distCore = (L, p) => { let b = 1e9; for (const [x, z] of [...L.neck.cells, ...L.neck.plug]) b = Math.min(b, Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z)); return b; };
let tA = 0, tB = 0, nNeck = 0, nDropped = 0, nAdded = 0, nCells = 0;
for (let n = 0; n < N; n++) {
  const seed = S0 + n * 92821;
  let t0 = Date.now(); const A = A0.genAshfield(seed); tA += Date.now() - t0;
  t0 = Date.now(); const B = B0.genAshfield(seed); tB += Date.now() - t0;
  if (!A || !B) { add('noLayout', seed); continue; }
  if (A.w !== B.w || A.h !== B.h) { add('size', seed); continue; }
  if (!B.neck) add('noNeck', seed); else nNeck++;
  const { band, core } = bandOf(B), { w, h } = B;
  // per cell: outside the band nothing may differ; inside, only the corridor's own cells may change walkability
  for (const k of ['cells', 'paint', 'low', 'lava', 'dist']) {
    const a = A[k], b = B[k]; if (!a && !b) continue;
    if (!a || !b || a.length !== b.length) { add(k + '.shape', seed); continue; }
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) {
      if (!band[i]) add(k + '.outsideBand', seed);
      else if (k === 'cells' && !core[i]) add('cells.bandNotCorridor', seed);
      else if (k === 'cells') nCells++;
    }
  }
  // per corner: only the corners of band cells
  const W = w + 1;
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    const i = vz * W + vx; if (A.hgt[i] === B.hgt[i]) continue;
    let inBand = false;
    for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const x = vx + dx, z = vz + dz; if (x >= 0 && z >= 0 && x < w && z < h && band[z * w + x]) inBand = true; }
    if (!inBand) add('hgt.outsideBand', seed);
  }
  // props: the ones that went are dressing near the corridor, the ones that came are the corridor's own
  if (B.neck) {
    const cnt = new Map();
    for (const p of B.props) { const k = J(p); cnt.set(k, (cnt.get(k) || 0) + 1); }
    for (const p of A.props) {
      const k = J(p), c = cnt.get(k);
      if (c) { cnt.set(k, c - 1); continue; }
      nDropped++;
      if (!(p.t in FOOT) || distCore(B, p) > 2.75 + FOOT[p.t] * (p.s || 1)) add('props.dropped.' + p.t, seed);
    }
    for (const [k, c] of cnt) if (c > 0) {
      const p = JSON.parse(k); nAdded += c;
      if (!p.neck) add('props.added.' + p.t, seed);
      else if (distCore(B, p) > 2.9) add('props.neckFar', seed);
    }
  } else if (J(A.props) !== J(B.props)) add('props', seed);
  // the exits: the old ones as they were, then the Neck's at the end
  const ex = B.exits.filter((e) => e.to !== 'coast');
  if (J(ex) !== J(A.exits)) add('exits', seed);
  if (B.neck && B.exits.filter((e) => e.to === 'coast').length !== 1) add('exit.coast!=1', seed);
  // everything else exactly
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (['cells', 'paint', 'low', 'lava', 'lowEmber', 'dist', 'hgt', 'props', 'exits', 'neck'].includes(k)) continue;
    if (J(A[k]) !== J(B[k])) add('field.' + k, seed);
  }
  // the Lantern Graves' keep-out (gen4's own dressing rectangle): no corridor cell in it
  const G = B.spots.graves;
  if (B.neck && G) for (const [x, z] of [...B.neck.cells, ...B.neck.plug]) if (Math.abs(x - G.x) < 18 && z > 41 - 4 && z < 80 + 4) { add('neck.inGraves', seed); break; }
}
console.log(`${N} seeds against ${REF}: ${(tA / N).toFixed(1)} ms ref, ${(tB / N).toFixed(1)} ms now; ${nNeck} with the Neck; ${(nCells / Math.max(1, nNeck)).toFixed(0)} cells opened, ${(nDropped / Math.max(1, nNeck)).toFixed(1)} props dropped and ${(nAdded / Math.max(1, nNeck)).toFixed(1)} added per seed`);
const keys = Object.keys(fails).sort();
console.log('differences outside the corridor:' + (keys.length ? '\n' + keys.map((k) => '  ' + k.padEnd(32) + String(fails[k].size).padStart(5) + '  e.g. ' + [...fails[k]].slice(0, 5).join(', ')).join('\n') : ' none'));
process.exit(keys.length ? 1 : 0);
