// Act VI layout check: node tools/check-act6.mjs [n=300] [seed0=5]
// Sweeps genDrained (both readings, 'mere' and 'dry') and genBottom (both, 'dark' and 'lit') over n seeds, and the rope
// hole's spot (gen6 ropeSpot) on n farlight seeds. Hard (exit 1): the contract's fields (Act V's thick, window, deck, sea
// zero-filled, L.ice undefined, the beds in 0.15 m steps, a bed below BED_DRY exactly on the pockets, every footprint dry),
// the landmarks in their ranges, the two readings the same layout but for the Well and the neck (drained) and the Stair's
// walls (bottom), and the design's reach checks through gen6's drainedFaults and bottomFaults (at black water 0 and 0.9,
// the Mere at 1.6, at its phase-2 0.85 and drained; the shadow-walls closed, then opened one by one; the First's trail and
// what the story stands on dry; the shore ring 6 m wide; the 15 m rule; the arenas' interacts 3 m apart; a dry refuge
// within 12 m of every pocket; no carved feature within 3 cells of the solid frame; the stamped windows the size of their
// sub-layouts with their doors on the road, two dry clearings in the wood, a leaf room for the ember); both generators
// deterministic. Besides gen6's own lists, the check holds each layout itself to: no pocket, vault or keel cell in the
// margin and the arenas' discs inside it; every basin's refuge in L.refuges within 12 m; the 15 m rule and the arenas'
// 3 m spacing; on the Drained Sea the Old Shore's huts, shacks and boats, the keels in the Keels' rows and clear of the
// Heap's ring, the three lanterns 120 degrees apart, the lure-rock at r 6 in the Mere's north water, the fourth lost
// light on the Heap's outer slope, the brazier on its north rim, the camp dry, the First's trail at every hearth, the
// second hearth's spine three cells wide and dry at full flood, the beds in their ranges (the basins 0.15-0.9, the
// Mere's core 0-0.15 and ring 0.45-0.6), L.lights Tamarisk's braziers only; on the Bottom the ember in a stamped leaf
// room (one way in, dry), the wood's trail dry, two lure posts on its bends, the black lamps in the barrow, the wood
// and Keyx's hand, his pool, the village and the Stair's pools in their places, the stones on the diagonals, the black
// pools on the north rims, the vault over the square and the Hearth's east and west thirds, the beds 0.3-0.75 (the
// barrow's 0.3-0.6), each window the size of its sub-layout drawn again from its seed, its door on its north edge,
// L.lights the camp's fire-pit, her fire at the Hearth's centre and Glaukos's fire-pots only.
// Soft: a mean above 3 tries per seed, a seed above 12, and oddities (fewer than three pockets in the Hollows, no
// causeway, a clearing far off the wood's trail, a fire-pot on it, a window keeping under 80% of its sub-layout's cells).
// GEN6=<path> checks another copy of gen6.js.
import { pathToFileURL } from 'node:url';
const GEN6 = process.env.GEN6 ? pathToFileURL(process.env.GEN6).href : '../src/world/gen6.js';
const { genDrained, genBottom, drainedFaults, bottomFaults, ropeSpot, walk6, REJECT6, MARGIN, LIGHT_R } = await import(GEN6);
const { genCrypt, genForest } = await import('../src/world/gen.js');
const { BED_DRY } = await import('../src/world/genlib.js');
const { firm } = await import('../src/world/gen5.js');
const { genFarlight } = await import('../src/world/gen5.js');
const N = +(process.argv[2] || 300), S0 = +(process.argv[3] || 5);
const fails = {}, soft = {}, HARD = new Set();
const add = (o, k, s) => { (o[k] ||= new Set()).add(s); };
const bad = (k, s) => { add(fails, k, s); HARD.add(k); };
const odd = (k, s) => add(soft, k, s);
const cellOf = (L, x, z) => Math.floor(z) * L.w + Math.floor(x);
const inR = (v, c, r) => Math.abs(v - c) <= r + 1e-9;
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const J = (o) => JSON.stringify(o, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v));
const inFrame = (L, p, r = 0) => p.x - r >= MARGIN && p.z - r >= MARGIN && p.x + r <= L.w - MARGIN && p.z + r <= L.h - MARGIN;
const dryC = (L, i) => !!L.cells[i] && !L.pocket[i];
const wet = (L, p) => { const i = cellOf(L, p.x, p.z); return !!L.pocket[i] || L.bed[i] < BED_DRY; };
const angle = (p, c) => Math.atan2(p.x - c.x, p.z - c.z);
const turn = (a, b) => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
// the 4-connected regions of cells with m[i] === v
function regions(L, m, v) {
  const { w, h } = L, seen = new Uint8Array(m.length), out = [];
  for (let s = 0; s < m.length; s++) if (m[s] === v && !seen[s]) {
    const q = [s]; seen[s] = 1;
    for (let hd = 0; hd < q.length; hd++) { const i = q[hd], x = i % w, z = (i - x) / w; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Z = z + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < h && m[n] === v && !seen[n]) { seen[n] = 1; q.push(n); } } }
    out.push(q);
  }
  return out;
}
// from a to within 3 m of b over cells whose four neighbours are dry floor too, 8-connected (a way three cells wide)
function wide3(L, a, b) {
  const { w, h } = L, D = new Uint8Array(w * h);
  for (let z = 1; z < h - 1; z++) for (let x = 1; x < w - 1; x++) { const i = z * w + x; if (dryC(L, i) && dryC(L, i - 1) && dryC(L, i + 1) && dryC(L, i - w) && dryC(L, i + w)) D[i] = 1; }
  let s = -1, bd = 1e9;
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const x = Math.floor(a.x) + dx, z = Math.floor(a.z) + dz, d = Math.hypot(x + 0.5 - a.x, z + 0.5 - a.z); if (x > 0 && z > 0 && x < w && z < h && D[z * w + x] && d < bd) { bd = d; s = z * w + x; } }
  if (s < 0) return false;
  const seen = new Uint8Array(w * h), q = [s]; seen[s] = 1;
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], x = i % w, z = (i - x) / w;
    if (Math.hypot(x + 0.5 - b.x, z + 0.5 - b.z) < 3) return true;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = i + dz * w + dx; if ((dx || dz) && D[n] && !seen[n]) { seen[n] = 1; q.push(n); } }
  }
  return false;
}
// the runs of open cells on the ring just outside a room (its ways in)
function doors(L, r) {
  const ring = [];
  for (let x = r.x; x < r.x + r.w; x++) ring.push([x, r.z - 1]);
  for (let z = r.z; z < r.z + r.h; z++) ring.push([r.x + r.w, z]);
  for (let x = r.x + r.w - 1; x >= r.x; x--) ring.push([x, r.z + r.h]);
  for (let z = r.z + r.h - 1; z >= r.z; z--) ring.push([r.x - 1, z]);
  const open = ring.map(([x, z]) => !!L.cells[z * L.w + x]);
  if (open.every(Boolean)) return 1;
  return open.filter((o, k) => o && !open[(k + open.length - 1) % open.length]).length;
}
const st = { drained: { tries: 0, ms: 0, props: 0, packs: 0, pockets: 0, high: 0, n: 0 }, bottom: { tries: 0, ms: 0, props: 0, packs: 0, pockets: 0, n: 0 }, rope: 0 };

// the fields every Act VI layout carries
function fields(L, tag, seed, w, h) {
  const N2 = w * h;
  if (L.w !== w || L.h !== h) bad(tag + '.size', seed);
  for (const k of ['cells', 'low', 'bed', 'paint', 'pocket', 'vault', 'keel', 'thick', 'window', 'deck', 'sea']) if (!L[k] || L[k].length !== N2) bad(tag + '.field.' + k, seed);
  if (!L.vbed || L.vbed.length !== (w + 1) * (h + 1) || !L.hgt || L.hgt.length !== (w + 1) * (h + 1)) bad(tag + '.corners', seed);
  if ('ice' in L && L.ice !== undefined) bad(tag + '.iceDefined', seed);
  for (const k of ['thick', 'window', 'deck', 'sea', 'low']) if (L[k]?.some((v) => v)) bad(tag + '.' + k + 'NotZero', seed);
  const T = L.tideCfg;
  if (!T || J(T.phases) !== J([40, 27, 26, 27]) || T.stepT !== 4.5 || T.hMax !== 0.9) bad(tag + '.tideCfg', seed);
  for (let i = 0; i < N2; i++) {
    const b = L.bed[i];
    if (L.pocket[i]) {
      if (!(b < BED_DRY)) { bad(tag + '.pocketDry', seed); break; }
      if (Math.abs(b / 0.15 - Math.round(b / 0.15)) > 1e-4 || b < -1e-6) { bad(tag + '.bedNotQuantised', seed); break; }
    } else if (b !== BED_DRY) { bad(tag + '.bedOffPocket', seed); break; }
    if (!L.cells[i] && L.pocket[i]) { bad(tag + '.blockedPocket', seed); break; }
    if (L.keel[i] && L.cells[i]) { bad(tag + '.keelOpen', seed); break; }
    if (L.vault[i] && !L.cells[i] && !L.pocket[i] && L.vault[i] > 255) { bad(tag + '.vaultId', seed); break; }
  }
  // the vault's rows: one per id, every cell within its r of its centre, its count
  const S = L.spots, ids = new Map();
  for (let i = 0; i < N2; i++) if (L.vault[i]) { const v = ids.get(L.vault[i]) || []; v.push(i); ids.set(L.vault[i], v); }
  if (!S.vaults || S.vaults.length !== ids.size) bad(tag + '.vaultRows', seed);
  for (const v of S.vaults || []) {
    const cells = ids.get(v.id) || [];
    if (cells.length !== v.n || cells.some((i) => Math.hypot(i % w + 0.5 - v.x, Math.floor(i / w) + 0.5 - v.z) > v.r + 1e-6)) { bad(tag + '.vaultPatch', seed); break; }
  }
  // the build's lights on dry cells; refuges 3 x 3 of dry ground
  for (const l of L.lights) if (!firm(L, l.x, l.z) || L.pocket[cellOf(L, l.x, l.z)]) { bad(tag + '.lightOnWet', seed); break; }
  for (const r of L.refuges) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const i = cellOf(L, r.x + dx, r.z + dz); if (!L.cells[i] || L.pocket[i]) { bad(tag + '.refugeNotDry', seed); dz = dx = 9; } }
  // nothing walkable, wet, vaulted or keeled in the frame and its margin; the arena's disc inside it
  for (let i = 0; i < N2; i++) { const x = i % w, z = (i - x) / w; if ((x < MARGIN || z < MARGIN || x >= w - MARGIN || z >= h - MARGIN) && (L.cells[i] || L.pocket[i] || L.vault[i] || L.keel[i])) { bad(tag + '.frame', seed); break; } }
  if (!inFrame(L, L.boss, L.boss.r)) bad(tag + '.frame.arena', seed);
  // every basin (a region of breathing pocket) has its refuge in L.refuges within 12 m of its water
  for (const q of regions(L, L.pocket, 1)) if (!q.some((i) => L.refuges.some((r) => Math.hypot(i % w + 0.5 - r.x, Math.floor(i / w) + 0.5 - r.z) <= 12))) { bad(tag + '.basinNoRefuge', seed); break; }
  // the 15 m rule on its own: every pack (and the Bottom's black lamps) within 15 m of a light that burns from the build, on dry ground
  const lit = L.lights.filter((l) => firm(L, l.x, l.z) && !L.pocket[cellOf(L, l.x, l.z)]);
  for (const p of [...L.packs, ...(S.lamps || [])]) if (!lit.some((l) => hyp(l, p) <= LIGHT_R)) { bad(tag + '.light15', seed); break; }
  // every walkable cell's corners at y 0
  const W = w + 1;
  for (let i = 0; i < N2; i++) if (L.cells[i]) { const x = i % w, z = (i - x) / w; if ([0, 1, W, W + 1].some((d) => L.hgt[z * W + x + d] !== 0)) { bad(tag + '.floorNotLevel', seed); break; } }
}

function drained(seed) {
  let t0 = Date.now();
  const L = genDrained(seed, { mode: 'mere' });
  st.drained.ms += Date.now() - t0; st.drained.tries += L.tries; st.drained.n++;
  if (L.tries > 12) odd('drained.manyTries', seed);
  const { w, h } = L, S = L.spots;
  if (L.type !== 'drained' || L.mode !== 'mere') bad('drained.shape', seed);
  fields(L, 'drained', seed, 112, 176);
  // the landmarks
  if (!inR(S.camp.x, 56, 6) || !inR(S.camp.z, 18, 3) || S.camp.r !== 9) bad('drained.camp.range', seed);
  if (!inR(L.boss.x, 58, 6) || !inR(L.boss.z, 146, 2) || L.boss.r !== 20 || S.heap.r !== 20) bad('drained.heap.range', seed);
  if (L.boss.z + L.boss.r > 168 || L.boss.z - L.boss.r < 124) bad('drained.heap.clear', seed);
  if (S.mere.r !== 10 || S.mere.core !== 5 || hyp(S.mere.lure, S.mere) > 6.01 || S.well.r !== 2) bad('drained.mere', seed);
  const k = S.hearths.map((q) => q.k).sort().join(',');
  if (k !== '1,2,3') bad('drained.hearths', seed);
  const H1 = S.hearths.find((q) => q.k === 1), H3 = S.hearths.find((q) => q.k === 3);
  if (H1 && !(H1.x >= 6 && H1.x <= 46 && H1.z >= 30 && H1.z <= 84)) bad('drained.hearth1.oldShore', seed);
  if (H3 && !(H3.x >= 8 && H3.x <= 52 && H3.z >= 98 && H3.z <= 122)) bad('drained.hearth3.keels', seed);
  if (S.lost.map((l) => l.id).join(',') !== 'galini,twins,kranea,psamathe') bad('drained.lost', seed);
  for (const l of S.lost) if (!firm(L, l.lamp.x, l.lamp.z) || L.pocket[cellOf(L, l.lamp.x, l.lamp.z)]) bad('drained.lostLampWet', seed);
  if (S.wreckLamps.length !== 3 || S.wreckLamps.filter((l) => l.keyx).length !== 1 || S.wreckLamps.some((l) => !inR(hyp(l, S.heap), 14, 0.01))) bad('drained.wreckLamps', seed);
  const kx = S.wreckLamps.find((l) => l.keyx), gap = S.heap.gap;
  if (kx && S.wreckLamps.some((l) => hyp(l, gap) < hyp(kx, gap) - 1e-6)) bad('drained.keyxNotNearestGap', seed);
  for (const b of S.bells) { const l = S.wreckLamps[b.lamp]; const d = l && hyp(b, l); if (!l || d < 3 || d > 4) bad('drained.bell', seed); }
  if (S.bells.length !== 2 || S.casks.length !== 4) bad('drained.bellsCasks', seed);
  if (S.keels.length < 14 || S.keels.length > 22 || S.keels.some((q) => q.r < 1 || q.r > 2.5)) bad('drained.keels', seed);
  if (!S.asger?.keel || S.asger.keel.r !== 2 || !S.asger.brazier || !S.sailor) bad('drained.lostPeople', seed);
  if (S.sky.length < 4 || S.sky[0].r !== 6 || S.sky.slice(1).some((q) => q.r < 3 || q.r > 5)) bad('drained.sky', seed);
  if (S.trail.length < 60 || S.trail.length > 120) bad('drained.trail.count', seed);
  for (const lu of S.lures) if (!lu.bait || hyp(lu, lu.bait) > 4) bad('drained.lureBait', seed);
  if (S.lures.length < 3) bad('drained.lures', seed);
  if (S.voices.length !== 4 || S.voices.some((v) => !/^d\.skotos6\.w[1-4]$/.test(v.key))) bad('drained.voices', seed);
  if (!S.npcs?.glaukos || !S.npcs.tamarisk || !S.npcs.brazier || !S.npcs.heapRim || !S.npcs.mere) bad('drained.npcs', seed);
  if (S.braziers.length < 3) bad('drained.braziers', seed);
  if (L.gaps?.length !== 2 || L.gaps.some((g) => g.cells.length !== 3 || g.cells.some(([x, z]) => !L.cells[z * w + x]))) bad('drained.gaps', seed);
  if (S.arch?.cells.length !== 28 || S.arch.cells.some(([x, z]) => !L.cells[z * w + x])) bad('drained.arch', seed);
  for (const t of ['blackCrew', 'shoreFaded', 'keelLice', 'poolHunter', 'heapLice', 'lures']) if (!L.packs.some((p) => p.tag === t)) bad('drained.noPack.' + t, seed);
  if (L.packs.some((p) => (p.tag === 'blackCrew') !== !!p.dormant && p.tag !== 'poolHunter')) odd('drained.dormant', seed);
  const ex = L.exits;
  if (ex.length !== 1 || ex[0].to !== 'farlight' || ex[0].label !== 'exit.ropeUp' || hyp(ex[0], S.rope) > 0.01) bad('drained.exits', seed);
  for (const f of drainedFaults(L)) bad('drained.' + f.replace(/@.*/, ''), seed);
  // the Old Shore: 4-6 stilt frames, 2 shacks, 3 boats (the Sailor on the first), all on it
  const stilts = S.huts.filter((q) => q.kind === 'stilt').length, shacks = S.huts.filter((q) => q.kind === 'shack').length;
  if (stilts < 4 || stilts > 6 || shacks !== 2 || S.boats.length !== 3 || hyp(S.sailor, S.boats[0]) > 0.01) bad('drained.oldShore', seed);
  if ([...S.huts, ...S.boats].some((q) => q.x < 6 || q.x > 46 || q.z < 30 || q.z > 84)) bad('drained.oldShore.range', seed);
  // the Keels in their rows, clear of the Heap's ring; Asger's among them
  if (S.keels.some((q) => q.x < 8 || q.x > 52 || q.z < 98 || q.z > 122 || hyp(q, S.heap) < S.heap.r + q.r)) bad('drained.keels.range', seed);
  if (S.keels.filter((q) => q.asger).length !== 1 || hyp(S.keels.find((q) => q.asger) || S.asger, S.asger.keel) > 0.01) bad('drained.keels.asger', seed);
  // the Heap: the lanterns 120 degrees apart, the lure-rock at r 6 in the Mere's north water, the fourth lost light on its
  // outer slope, Tamarisk's brazier on its north rim
  const la = S.wreckLamps.map((l) => angle(l, S.heap));
  if (la.some((a, k) => Math.abs(turn(a, la[(k + 1) % 3]) - 2 * Math.PI / 3) > 0.01)) bad('drained.wreckLamps.angle', seed);
  const lu = S.mere.lure;
  if (!inR(hyp(lu, S.mere), 6, 0.01) || lu.z >= S.mere.z || L.pocket[cellOf(L, lu.x, lu.z)] !== 2) bad('drained.lureRock', seed);
  const ps = S.lost.find((l) => l.id === 'psamathe');
  if (!ps || hyp(ps, S.heap) < S.heap.r || hyp(ps, S.heap) > S.heap.r + 6) bad('drained.lost.psamathe', seed);
  if (!S.braziers.some((b) => Math.hypot(b.x - S.heap.x, b.z - (S.heap.z - S.heap.r - 1)) < 4.5)) bad('drained.rimBrazier', seed);
  if (L.lights.length !== S.braziers.length) bad('drained.lightsNotOwn', seed);
  // the camp dry all over; the skylight of r 6 over the rope; the First's trail at every hearth
  for (let z = Math.floor(S.camp.z - S.camp.r); z <= S.camp.z + S.camp.r; z++) for (let x = Math.floor(S.camp.x - S.camp.r); x <= S.camp.x + S.camp.r; x++) if (Math.hypot(x + 0.5 - S.camp.x, z + 0.5 - S.camp.z) <= S.camp.r && L.pocket[z * w + x]) { bad('drained.campWet', seed); z = x = 1e9; }
  if (hyp(S.sky[0], S.rope) > 3) bad('drained.sky.camp', seed);
  for (const hh of S.hearths) if (!S.trail.some((m) => hyp(m, hh) < 4)) bad('drained.trail.hearth' + hh.k, seed);
  // the second hearth's spine: three cells wide, dry at full flood, from the road to her island
  if (!wide3(L, S.spine.to, S.hearths.find((q) => q.k === 2))) bad('drained.spine', seed);
  // the beds: the basins 0.15-0.9, the Mere's core 0-0.15, its ring 0.45-0.6
  for (let i = 0; i < w * h; i++) {
    const p = L.pocket[i], b = L.bed[i], d = Math.hypot(i % w + 0.5 - S.mere.x, Math.floor(i / w) + 0.5 - S.mere.z);
    if (p === 1 && (b < 0.15 - 1e-4 || b > 0.9 + 1e-4)) { bad('drained.bed.basin', seed); break; }
    if (p === 2 && (d > S.mere.r || (d < S.mere.core ? b > 0.15 + 1e-4 : b < 0.45 - 1e-4 || b > 0.6 + 1e-4))) { bad('drained.bed.mere', seed); break; }
  }
  // the arena's interacts 3 m apart (the lanterns, the bells, the casks)
  if ([...S.wreckLamps, ...S.bells, ...S.casks].some((a, i, l) => l.some((b, j) => j > i && hyp(a, b) < 3))) bad('drained.arenaCrowded', seed);
  // (soft) three pockets or more in the Hollows; the causeway wading at high water
  const hol = regions(L, L.pocket, 1).filter((q) => q.some((i) => i % w >= 54 && Math.floor(i / w) >= 40 && Math.floor(i / w) <= 104));
  if (hol.length < 3) odd('drained.hollows<3', seed);
  const cw = S.causeway;
  if (cw) { let n = 0; for (let t = 0; t <= 20; t++) { const i = cellOf(L, cw.x0 + (cw.x1 - cw.x0) * t / 20, cw.z0 + (cw.z1 - cw.z0) * t / 20); if (L.pocket[i] && L.bed[i] >= 0.45 - 1e-4 && L.bed[i] <= 0.6 + 1e-4) n++; } if (n < 3) odd('drained.noCauseway', seed); } else odd('drained.noCauseway', seed);
  // the dry reading: the same layout, the Well's mouth and the neck blocked, the exit down
  t0 = Date.now();
  const D = genDrained(seed, { mode: 'dry' });
  st.drained.ms += Date.now() - t0;
  if (D.mode !== 'dry' || D.tries !== L.tries) bad('dry.shape', seed);
  const de = D.exits.find((e) => e.to === 'bottom');
  if (!de || de.label !== 'exit.well' || de.locked !== 'ketosDown' || hyp(de, S.well) > 0.01) bad('dry.exitWell', seed);
  const shut = new Set([...S.well.cells, ...S.arch.cells].map(([x, z]) => z * w + x));
  for (let i = 0; i < w * h; i++) if (shut.has(i) ? D.cells[i] : D.cells[i] !== L.cells[i]) { bad('dry.changedLayout', seed); break; }
  if (J(D.props) !== J(L.props) || J(D.packs) !== J(L.packs) || J(D.spots) !== J(L.spots)) bad('dry.notSameLayout', seed);
  for (const f of drainedFaults(D)) bad('dry.' + f.replace(/@.*/, ''), seed);
  // the black water's share of the floor
  let pk = 0, hi = 0; const W1 = walk6(L, 0.9, 1.6);
  for (let i = 0; i < w * h; i++) if (L.pocket[i] === 1) { pk++; if (!W1[i]) hi++; }
  st.drained.pockets += pk; st.drained.high += hi;
  if (seed % 7 === 5 && J(genDrained(seed, { mode: 'mere' })) !== J(L)) bad('drained.nondeterministic', seed);
  st.drained.props += L.props.length; st.drained.packs += L.packs.length;
}

function bottom(seed) {
  let t0 = Date.now();
  const L = genBottom(seed, { mode: 'dark' });
  st.bottom.ms += Date.now() - t0; st.bottom.tries += L.tries; st.bottom.n++;
  if (L.tries > 12) odd('bottom.manyTries', seed);
  const { w, h } = L, S = L.spots, H = S.hearth;
  if (L.type !== 'bottom' || L.mode !== 'dark') bad('bottom.shape', seed);
  fields(L, 'bottom', seed, 104, 200);
  if (!inR(S.camp.x, 52, 4) || !inR(S.camp.z, 16, 2) || S.camp.r !== 8) bad('bottom.camp.range', seed);
  if (!inR(H.x, 52, 4) || !inR(H.z, 176, 1) || H.r !== 14 || H.z - H.r < 161 || H.z + H.r > 191) bad('bottom.hearth.range', seed);
  // the windows: the crypt at x 6-48, the wood at 56-98, both z 28-106, flipped, each the size of its generator's own
  const [c, f] = L.stamps;
  if (L.stamps.length !== 2 || c.kind !== 'crypt' || f.kind !== 'forest' || c.x0 !== 6 || f.x0 !== 56 || c.z0 !== 28 || f.z0 !== 28 || !c.flipZ || !f.flipZ) bad('bottom.stamps', seed);
  if ([c, f].some((r) => r.w !== 42 || r.h !== 78)) bad('bottom.window.size', seed);
  if (!c.rooms?.some((r) => r.kind === 'boss') || !f.trail?.length || !c.door || !f.door || !c.end || !f.end) bad('bottom.stampRecords', seed);
  if (c.door.z > c.end.z || f.door.z > f.end.z) bad('bottom.notFlipped', seed);
  if (L.props.some((p) => p.stamp && (p.t === 'kit' ? ['torch_mounted', 'skull_candle'].includes(p.m) : ['torch', 'brazier', 'candlestick', 'campfire', 'shroom', 'fx', 'barrowDoor'].includes(p.t)))) bad('bottom.litPropStamped', seed);
  // (the build's lights: the camp's fire-pit, her fire at the Hearth's centre (its own, r 5), Glaukos's pots)
  if (L.lights.length !== 2 + S.pots.length || L.lights.filter((l) => l.centre && hyp(l, H.fire) < 0.01 && l.range >= 10).length !== 1) bad('bottom.lightsNotOwn', seed);
  // the Stair's walls: three bands of 3 x 14, shut in this reading
  if (L.walls.length !== 3 || L.walls.some((wl, k) => wl.k !== k || wl.cells.length !== 42 || wl.cells.some(([x, z]) => L.cells[z * w + x] || L.pocket[z * w + x]))) bad('bottom.walls', seed);
  if (S.lamps.map((l) => l.k + l.place).join(',') !== '0barrow,1wood,2village' || S.lamps.some((l) => l.wall !== l.k)) bad('bottom.lamps', seed);
  if (!S.ember?.pane || !S.leif?.fire || S.leif.r !== 4 || S.glade?.r !== 5 || !S.keyx?.pool || S.keyx.pool.r !== 4) bad('bottom.spots', seed);
  if (S.houses.length < 6 || S.houses.length > 8 || S.houses.some((q) => q.tilt < 0.069 || q.tilt > 0.21 || q.sink < 0.3 || q.sink > 0.8)) bad('bottom.houses', seed);
  if (H.stones.length !== 4 || H.stones.some((q) => !inR(hyp(q, H), 9, 0.01)) || H.niches.length !== 7 || H.niches.map((q) => q.id).join(',') !== 'galini,twins,kranea,psamathe,sailor,asger,leif' || H.niches.some((q) => !inR(hyp(q, H), 13, 0.01))) bad('bottom.hearth.parts', seed);
  if (H.pools.length !== 2 || H.casks.length !== 4 || S.casks !== H.casks || !inR(hyp(H.ring, H), 11, 0.01) || H.ring.z < H.z) bad('bottom.hearth.ring', seed);
  for (const [x, z] of [[H.x - 1, H.z - 1], [H.x, H.z - 1], [H.x - 1, H.z], [H.x, H.z]]) if (L.cells[z * w + x]) bad('bottom.fireOpen', seed);
  if (S.stair.z0 !== 144 || S.stair.z1 !== 160 || S.stair.pools.length !== 2 || S.stair.pools.some((p) => p.r !== 2.5)) bad('bottom.stair', seed);
  if (S.voices.length !== 3 || S.voices.some((v) => !/^d\.skotos6\.w[5-7]$/.test(v.key))) bad('bottom.voices', seed);
  for (const t of ['gateFallen', 'drownedWood', 'lures', 'forgotten', 'stairCrew']) if (!L.packs.some((p) => p.tag === t)) bad('bottom.noPack.' + t, seed);
  if (!L.packs.some((p) => p.tag === 'gateFallen' && p.elite === 'rare') || !L.packs.some((p) => p.tag === 'lures' && p.elite === 'rare') || !L.packs.some((p) => p.tag === 'forgotten' && p.elite === 'rare')) bad('bottom.guards', seed);
  const ex = Object.fromEntries(L.exits.map((e) => [e.to, e]));
  if (L.exits.length !== 2 || ex.drained?.label !== 'exit.well' || ex.town?.label !== 'exit.gateUp' || ex.town.at !== 'staff' || ex.town.locked !== 'herFire' || hyp(ex.town, H.ring) > 0.01) bad('bottom.exits', seed);
  for (const fl of bottomFaults(L)) bad('bottom.' + fl.replace(/@.*/, ''), seed);
  // each window drawn again from its seed: the size of its sub-layout, its door on its north edge (the side facing the Well)
  for (const [r, gen] of [[c, (sd) => genCrypt(sd, { mw: 14, mh: 26, rooms: 6 })], [f, (sd) => genForest(sd, { w: 42, h: 78 })]]) {
    if (r.seed == null) { bad('bottom.window.seed', seed); continue; }
    const sub = gen(r.seed);
    if (sub.w !== r.w || sub.h !== r.h) bad('bottom.window.sub', seed);
    if (r.door.z < r.z0 || r.door.z > r.z0 + 8) bad('bottom.window.doorEdge', seed);
    let same = 0;
    for (let z = 0; z < sub.h; z++) for (let x = 0; x < sub.w; x++) if (!!sub.cells[z * sub.w + x] === !!L.cells[(r.z0 + sub.h - 1 - z) * w + r.x0 + x]) same++;
    if (same < 0.8 * sub.w * sub.h) odd('bottom.window.kept<80%', seed);
  }
  // the ember in a stamped leaf room: a free room with one way in, dry
  const er = c.rooms.find((r) => S.ember.x >= r.x && S.ember.x < r.x + r.w && S.ember.z >= r.z && S.ember.z < r.z + r.h);
  if (!er || er.kind !== 'room' || doors(L, er) !== 1) bad('bottom.emberNotLeaf', seed);
  if (wet(L, S.ember) || !L.cells[cellOf(L, S.ember.x, S.ember.z)]) bad('bottom.emberWet', seed);
  // the wood's trail dry (its own props stand on it, as in the Gates); two lure posts on its bends; no fire-pot on it
  if (f.trail.some((t) => L.pocket[cellOf(L, t.x, t.z)])) bad('bottom.woodTrailWet', seed);
  if (S.lures.length !== 2 || S.lures.some((l) => hyp(l, l.bait) > 4 || !(l.x >= f.x0 && l.x < f.x0 + f.w && l.z >= f.z0 && l.z < f.z0 + f.h))) bad('bottom.lures', seed);
  if (S.pots.some((p) => f.trail.some((t) => hyp(t, p) < 1))) odd('bottom.potOnTrail', seed);
  for (const g of [S.leif, S.glade]) { const d = Math.min(...f.trail.map((t) => hyp(t, g))); if (d < g.r + 1 || d > 16) odd('bottom.clearingOffTrail', seed); }
  // the black lamps: the barrow's in its window by the throne hall, the wood's in its hollow, the third in Keyx's hand
  const inW = (p, r) => p.x >= r.x0 && p.x < r.x0 + r.w && p.z >= r.z0 && p.z < r.z0 + r.h;
  const throne = c.rooms.find((r) => r.kind === 'boss');
  if (!inW(S.lamps[0], c) || !throne || Math.abs(S.lamps[0].z - (throne.z + throne.h)) > 6 || !inW(S.lamps[1], f) || hyp(S.lamps[1], f.end) > 6 || hyp(S.lamps[2], S.keyx) > 0.01) bad('bottom.lampPlaces', seed);
  // Keyx's pool (bed 0.3, r 4) beside the square's well; the village in its place; the Stair's two pools (bed 0.6)
  { let n = 0; for (let z = Math.floor(S.keyx.pool.z - 4); z <= S.keyx.pool.z + 4; z++) for (let x = Math.floor(S.keyx.pool.x - 4); x <= S.keyx.pool.x + 4; x++) { const i = z * w + x; if (L.pocket[i] && inR(L.bed[i], 0.3, 1e-4)) n++; } if (n < 12 || hyp(S.keyx.pool, S.keyx.well) > 7) bad('bottom.keyxPool', seed); }
  if (S.houses.some((q) => q.x < 28 || q.x > 76 || q.z < 110 || q.z > 142) || !inR(S.keyx.well.x, 52, 6) || S.keyx.well.z < 110 || S.keyx.well.z > 142) bad('bottom.village', seed);
  for (const p of S.stair.pools) { let n = 0; for (let z = Math.floor(p.z - p.r); z <= p.z + p.r; z++) for (let x = Math.floor(p.x - p.r); x <= p.x + p.r; x++) { const i = z * w + x; if (L.pocket[i] && inR(L.bed[i], 0.6, 1e-4)) n++; } if (n < 8 || p.z < S.stair.z0 || p.z > S.stair.z1) bad('bottom.stairPools', seed); }
  // the Hearth: the stones on the diagonals, the black pools on its north rims, the vault over its east and west thirds
  // (and over the village square), its interacts 3 m apart (the stones, the casks, the Gate ring)
  if (H.stones.some((q) => Math.abs(((angle(q, H) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4) > 0.01)) bad('bottom.hearth.stones', seed);
  if (H.pools.some((p) => p.z >= H.z || !inR(hyp(p, H), 12.5, 1)) || !H.pools.some((p) => p.x < H.x) || !H.pools.some((p) => p.x > H.x)) bad('bottom.hearth.pools', seed);
  if (!S.vaults.some((v) => v.x > H.x + 4 && hyp(v, H) < H.r) || !S.vaults.some((v) => v.x < H.x - 4 && hyp(v, H) < H.r) || !S.vaults.some((v) => hyp(v, S.keyx.well) < 3)) bad('bottom.vaults', seed);
  if ([...H.stones, ...H.casks, H.ring].some((a, i, l) => l.some((b, j) => j > i && hyp(a, b) < 3))) bad('bottom.arenaCrowded', seed);
  // the beds: 0.3-0.75 everywhere, the barrow's 0.3-0.6
  for (let i = 0; i < w * h; i++) {
    if (!L.pocket[i]) continue;
    const b = L.bed[i], x = i % w, z = (i - x) / w;
    if (b < 0.3 - 1e-4 || b > 0.75 + 1e-4) { bad('bottom.bed', seed); break; }
    if (x >= c.x0 && x < c.x0 + c.w && z >= c.z0 && z < c.z0 + c.h && b > 0.6 + 1e-4) { bad('bottom.bed.barrow', seed); break; }
  }
  // the lit reading: the walls open, nothing else changed
  t0 = Date.now();
  const Lt = genBottom(seed, { mode: 'lit' });
  st.bottom.ms += Date.now() - t0;
  const wall = new Set(L.walls.flatMap((wl) => wl.cells.map(([x, z]) => z * w + x)));
  for (let i = 0; i < w * h; i++) if (wall.has(i) ? !Lt.cells[i] : Lt.cells[i] !== L.cells[i]) { bad('lit.changedLayout', seed); break; }
  if (Lt.mode !== 'lit' || J(Lt.props) !== J(L.props) || J(Lt.packs) !== J(L.packs) || J(Lt.spots) !== J(L.spots)) bad('lit.notSameLayout', seed);
  for (const fl of bottomFaults(Lt)) bad('lit.' + fl.replace(/@.*/, ''), seed);
  let pk = 0; for (let i = 0; i < w * h; i++) if (L.pocket[i]) pk++;
  st.bottom.pockets += pk;
  if (seed % 7 === 5 && J(genBottom(seed, { mode: 'dark' })) !== J(L)) bad('bottom.nondeterministic', seed);
  st.bottom.props += L.props.length; st.bottom.packs += L.packs.length;
}

// the rope hole on the Light's Skerry (the farlight zone's only Act VI change: props and an interact on thick ice)
function rope(seed) {
  const L = genFarlight(seed), p = ropeSpot(L), S = L.spots;
  if (!p) return bad('rope.none', seed);
  st.rope++;
  const { w } = L;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const i = cellOf(L, p.x + dx, p.z + dz); if (!L.cells[i] || !firm(L, p.x + dx, p.z + dz)) { bad('rope.notFirm', seed); dz = dx = 9; } }
  if (!L.thick[cellOf(L, p.x, p.z)] && L.bed) bad('rope.notThick', seed);
  const door = { x: S.farLight.door.x + 1.2, z: S.farLight.door.z - 0.6 };
  if (hyp(p, door) < 2.5 || (S.selnaPad && hyp(p, S.selnaPad) < 3)) bad('rope.tooNear', seed);
  if (hyp(p, S.core) > S.core.r) bad('rope.offCore', seed);
  void w;
}

const seeds = Array.from({ length: N }, (_, n) => S0 + n * 92821);
for (const s of seeds) { drained(s); bottom(s); rope(s); }
const show = (o) => Object.keys(o).sort().map((k) => '  ' + k.padEnd(36) + String(o[k].size).padStart(5) + '  e.g. ' + [...o[k]].slice(0, 5).join(', ')).join('\n');
const D = st.drained, B = st.bottom;
const meanD = D.tries / N, meanB = B.tries / N;
if (meanD > 3) odd('drained.meanTries>3', meanD.toFixed(2));
if (meanB > 3) odd('bottom.meanTries>3', meanB.toFixed(2));
console.log(`${N} seeds per zone and reading: drained ${(D.ms / N / 2).toFixed(0)} ms (mean ${meanD.toFixed(2)} tries), bottom ${(B.ms / N / 2).toFixed(0)} ms (mean ${meanB.toFixed(2)} tries); the rope hole found on ${st.rope}/${N} farlight seeds`);
console.log(`drained: ${(D.props / N).toFixed(0)} props, ${(D.packs / N).toFixed(1)} packs, ${(D.pockets / N).toFixed(0)} pocket cells (${(100 * D.high / D.pockets).toFixed(0)}% deep at high water); bottom: ${(B.props / N).toFixed(0)} props, ${(B.packs / N).toFixed(1)} packs, ${(B.pockets / N).toFixed(0)} pocket cells; the 15 m rule at ${LIGHT_R} m`);
console.log('tries thrown away, by reason: ' + (Object.keys(REJECT6).length ? Object.entries(REJECT6).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ') : 'none'));
console.log('hard failures:' + (HARD.size ? '\n' + show(fails) : ' none'));
console.log('oddities:' + (Object.keys(soft).length ? '\n' + show(soft) : ' none'));
process.exit(HARD.size ? 1 : 0);
