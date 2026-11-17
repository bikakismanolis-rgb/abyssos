// Act VII layout check: node tools/check-act7.mjs [n=300] [seed0=5]
// Sweeps genThaw (both readings, 'spate' and 'green') and genTarn (both, 'full' and 'let') over n seeds.
// Hard (exit 1):
// - the contract's fields: the sizes (112 x 184, 104 x 176), every per-cell array, Act V's thick, window, deck, sea and
//   Act VI's keel zero-filled, L.ice undefined, tideCfg { phases [50, 18, 34, 18], stepT 4.5, hMax 0.6 }, the beds in
//   0.15 m steps, a bed below BED_DRY exactly on the pockets, every footprint dry, every walkable cell's corners at y 0,
//   nothing carved within 6 cells of the map's edge, the arena's disc inside the frame, the vault's rows, refuges dry;
// - the spots the three design parts ask for, and the landmarks in their ranges;
// - part 2's reach checks, walked here on the real GridMap rule (walk7 + genlib reach) at the brooks' low and top and
//   the own-level water at 1.2, 0.9, 0.6 and 0.3: in thaw the camp reaches exactly what the gates' table allows and
//   nothing more (weir 2 and lookout 2 from 0.9, weir 3 from 0.6, the Narrows, lookout 3 and the Den from 0.3); in
//   tarn winch 3 at the clock's low and never at its top (lake 0.9 and above), lookout 6 and the great wheel from 0.6
//   down, the rim's levers, hearth and Halda's stump round the ring outside r 12, r 12 of floor at 1.2, the plug shut
//   in 'full'; every pack within reach at its stretch's level;
// - the lanes, with map.js's own los and forge.js's inFlue formula: every chute has a horn-stone on dry ground outside
//   its lane, a sunny cornice, a length of 21.5-30 m; no chute lane touches a pocket-2 cell; every trail cell a chute
//   strikes has a covered cell of the lane within 4 m; every cover spot is one the mouth cannot see; lookout and call
//   hearths out of every lane (0.5 m to spare) and 3 m from any other interact; no interact but winch 1 in a lane;
// - gen7's own lists (thawFaults, tarnFaults: the Den's boulders and wedges, the fords' beds, no hut by water, the
//   refuges, the clouds off the Den and 20 s apart at every pack, ice in shade, the Dam's channels, 40% bare floor);
// - the two readings the same layout but for what the reading changes (thaw: the chutes kept; tarn: the plug);
// - both generators deterministic: the same seed twice gives identical JSON.
// Soft (reported): a mean above 3 tries per seed, a seed above 12 tries, a seed that took all 24, oddities (fewer than
// 4 brooks or 4 huts, no plank bridge on the causeway, weir 3's cloud leaving outside 20-40 s, the Dam's middle under
// cloud outside 20-40% of the time, fewer than 15 thaw or 13 tarn packs off the lookouts, trees within 3 m of the way).
// GEN7=<path> checks another copy of gen7.js.
import { pathToFileURL } from 'node:url';
const GEN7 = process.env.GEN7 ? pathToFileURL(process.env.GEN7).href : '../src/world/gen7.js';
const { genThaw, genTarn, thawFaults, tarnFaults, walk7, cloudAt, REJECT7, MARGIN7, LEVELS7, BROOK_TOP } = await import(GEN7);
const { BED_DRY, reach, nearReach, wetAt } = await import('../src/world/genlib.js');
const { firm } = await import('../src/world/gen5.js');
const { GridMap } = await import('../src/world/map.js');
const N = +(process.argv[2] || 300), S0 = +(process.argv[3] || 5);
const fails = {}, soft = {}, HARD = new Set();
const add = (o, k, s) => { (o[k] ||= new Set()).add(s); };
const bad = (k, s) => { add(fails, k, s); HARD.add(k); };
const odd = (k, s) => add(soft, k, s);
const cellOf = (L, x, z) => Math.floor(z) * L.w + Math.floor(x);
const inR = (v, c, r) => Math.abs(v - c) <= r + 1e-9;
const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const J = (o) => JSON.stringify(o, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v));
const st = { thaw: { tries: 0, ms: 0, n: 0, props: 0, packs: 0, flues: 0, brook: 0, own: 0, max: 0 }, tarn: { tries: 0, ms: 0, n: 0, props: 0, packs: 0, flues: 0, brook: 0, own: 0, max: 0, bare: 0 } };

// forge.js inFlue, on a GridMap of the layout
function inFlue(map, f, x, z, pad = 0) {
  const ux = Math.sin(f.dir), uz = Math.cos(f.dir), dx = x - f.x, dz = z - f.z, u = dx * ux + dz * uz, v = -dx * uz + dz * ux;
  if (u < -0.3 || u > f.len || Math.abs(v) > f.w / 2 + pad) return false;
  return map.los(f.x + ux * 0.5, f.z + uz * 0.5, x, z);
}
const inRect = (f, x, z, pad = 0) => { const ux = Math.sin(f.dir), uz = Math.cos(f.dir), dx = x - f.x, dz = z - f.z, u = dx * ux + dz * uz, v = -dx * uz + dz * ux; return u >= -0.3 && u <= f.len && Math.abs(v) <= f.w / 2 + pad; };
const rectCells = (L, f, pad = 0) => { const out = [], R = f.len + f.w + 2; for (let z = Math.max(0, Math.floor(f.z - R)); z <= Math.min(L.h - 1, f.z + R); z++) for (let x = Math.max(0, Math.floor(f.x - R)); x <= Math.min(L.w - 1, f.x + R); x++) if (inRect(f, x + 0.5, z + 0.5, pad)) out.push(z * L.w + x); return out; };

// the fields every Act VII layout carries
function fields(L, tag, seed, w, h) {
  const N2 = w * h, S = L.spots;
  if (L.w !== w || L.h !== h || L.type !== tag) bad(tag + '.size', seed);
  for (const k of ['cells', 'low', 'bed', 'paint', 'pocket', 'vault', 'keel', 'thick', 'window', 'deck', 'sea', 'trail', 'shade', 'snow', 'noCloud', 'dist']) if (!L[k] || L[k].length !== N2) bad(tag + '.field.' + k, seed);
  if (!L.vbed || L.vbed.length !== (w + 1) * (h + 1) || !L.hgt || L.hgt.length !== (w + 1) * (h + 1)) bad(tag + '.corners', seed);
  if ('ice' in L && L.ice !== undefined) bad(tag + '.iceDefined', seed);
  for (const k of ['thick', 'window', 'deck', 'sea', 'keel']) if (L[k]?.some((v) => v)) bad(tag + '.' + k + 'NotZero', seed);
  const T = L.tideCfg;
  if (!T || J(T.phases) !== J([50, 18, 34, 18]) || T.stepT !== 4.5 || T.hMax !== 0.6) bad(tag + '.tideCfg', seed);
  if (!L.own || J(L.own.levels) !== J([1.2, 0.9, 0.6, 0.3])) bad(tag + '.own', seed);
  if (!Array.isArray(L.flues) || !Array.isArray(L.clouds) || !Array.isArray(L.road) || !L.road.length || !L.start || !L.boss) bad(tag + '.lists', seed);
  let pk1 = 0, pk2 = 0;
  for (let i = 0; i < N2; i++) {
    const b = L.bed[i];
    if (L.pocket[i]) {
      if (L.pocket[i] === 1) pk1++; else pk2++;
      if (!(b < BED_DRY)) { bad(tag + '.pocketDry', seed); break; }
      if (Math.abs(b / 0.15 - Math.round(b / 0.15)) > 1e-4 || b < -0.45 - 1e-6) { bad(tag + '.bedNotQuantised', seed); break; }
      if (L.pocket[i] === 1 && b < -1e-6) { bad(tag + '.brookBelowZero', seed); break; }
    } else if (b !== BED_DRY) { bad(tag + '.bedOffPocket', seed); break; }
    if (!L.cells[i] && L.pocket[i]) { bad(tag + '.blockedPocket', seed); break; }
    if (L.low[i] && L.cells[i]) { bad(tag + '.lowOpen', seed); break; }
    if (L.snow[i] > 5 || (L.snow[i] && L.pocket[i])) { bad(tag + '.snowByte', seed); break; }
    if (L.trail[i] && !L.cells[i] && !(S.plug?.cells || []).some(([px, pz]) => pz * w + px === i)) { bad(tag + '.trailBlocked', seed); break; }
  }
  st[tag].brook += pk1; st[tag].own += pk2;
  // the vault's rows
  const ids = new Map();
  for (let i = 0; i < N2; i++) if (L.vault[i]) { const v = ids.get(L.vault[i]) || []; v.push(i); ids.set(L.vault[i], v); }
  if (!S.vaults || S.vaults.length !== ids.size) bad(tag + '.vaultRows', seed);
  for (const v of S.vaults || []) { const c = ids.get(v.id) || []; if (c.length !== v.n || c.some((i) => Math.hypot(i % w + 0.5 - v.x, Math.floor(i / w) + 0.5 - v.z) > v.r + 1e-6 || !L.cells[i])) { bad(tag + '.vaultPatch', seed); break; } }
  // refuges 3 x 3 of dry ground; nothing walkable, wet, low or vaulted in the margin; the arena inside the frame
  for (const r of L.refuges) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const i = cellOf(L, r.x + dx, r.z + dz); if (!L.cells[i] || L.pocket[i]) { bad(tag + '.refugeNotDry', seed); dz = dx = 9; } }
  for (let i = 0; i < N2; i++) { const x = i % w, z = (i - x) / w; if ((x < MARGIN7 || z < MARGIN7 || x >= w - MARGIN7 || z >= h - MARGIN7) && (L.cells[i] || L.pocket[i] || L.vault[i] || L.low[i])) { bad(tag + '.frame', seed); break; } }
  const B = L.boss; if (B.x - B.r < MARGIN7 || B.z - B.r < MARGIN7 || B.x + B.r > w - MARGIN7 || B.z + B.r > h - MARGIN7) bad(tag + '.frame.arena', seed);
  // every walkable cell's corners at y 0
  const W = w + 1;
  // (a corner shared with a crevasse's cell sinks with it, as the lava's edge does: genlib terrain)
  const byHole = (vx, vz) => [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dx, dz]) => L.low[(vz + dz) * w + vx + dx]);
  for (let i = 0; i < N2; i++) if (L.cells[i]) { const x = i % w, z = (i - x) / w; if ([[0, 0], [1, 0], [0, 1], [1, 1]].some(([dx, dz]) => L.hgt[(z + dz) * W + x + dx] !== 0 && !byHole(x + dx, z + dz))) { bad(tag + '.floorNotLevel', seed); break; } }
  // the packs: a tag, a count, a spot on open floor; which are dormant is the layout's to say
  for (const p of L.packs) if (!p.tag || !(p.n >= 1) || !L.cells[cellOf(L, p.x, p.z)] || typeof p.trail !== 'boolean') { bad(tag + '.pack', seed); break; }
  if (!L.packs.some((p) => p.dormant) || !L.packs.some((p) => !p.dormant)) bad(tag + '.dormant', seed);
  for (const c of S.chests || []) if (!L.cells[cellOf(L, c.x, c.z)] || L.pocket[cellOf(L, c.x, c.z)]) bad(tag + '.chest', seed);
  if (!S.chests || S.chests.length < 2) bad(tag + '.chests', seed);
  if (!S.waypoint || !S.camp || S.camp.r !== 8) bad(tag + '.camp', seed);
}
// the lanes
function lanes(L, tag, seed, ints, hearths, inLaneOk = []) {
  const map = new GridMap(L.w, L.h, L.cells.slice(), L.low.slice()), { w } = L, P = (i) => ({ x: i % w + 0.5, z: Math.floor(i / w) + 0.5 });
  for (const f of L.flues) {
    if (f.w !== 4 || !(f.kind === 'snow' || f.kind === 'water') || f.armed !== true || !Array.isArray(f.cover) || typeof f.dir !== 'number') bad(tag + '.flue.shape', seed);
    if (map.solid(Math.floor(f.x + Math.sin(f.dir) * 0.5), Math.floor(f.z + Math.cos(f.dir) * 0.5))) bad(tag + '.flue.mouthShut', seed);
    if (f.kind !== 'snow') continue;
    if (!f.horn || inRect(f, f.horn.x, f.horn.z, 0.4) || !firm(L, f.horn.x, f.horn.z) || L.pocket[cellOf(L, f.horn.x, f.horn.z)]) bad(tag + '.chute.horn', seed);
    if (f.len < 21.5 || f.len > 30.01) bad(tag + '.chute.len', seed);
    if (L.shade[cellOf(L, f.x, f.z)]) bad(tag + '.chute.headInShade', seed);
    const cells = rectCells(L, f);
    // no chute lane touches a pocket-2 cell (half a metre to spare: a slide's tongue never fords the Race or the lake)
    if (rectCells(L, f, 0.5).some((i) => L.pocket[i] === 2)) bad(tag + '.chute.touchesOwnWater', seed);
    // solid cover within 4 m of every trail cell it strikes
    const sh = cells.filter((i) => L.cells[i] && !inFlue(map, f, i % w + 0.5, Math.floor(i / w) + 0.5)).map(P);
    let crossed = 0;
    for (const i of cells) {
      if (!L.trail[i]) continue;
      const p = P(i); if (!inFlue(map, f, p.x, p.z)) continue;
      crossed++;
      if (!sh.some((q) => hyp(q, p) <= 4)) { bad(tag + '.chute.noCover', seed); break; }
    }
    if (crossed && !f.cover.length) bad(tag + '.chute.coverUnmarked', seed);
    for (const c of f.cover) if (inFlue(map, f, c.x, c.z, 0) || !L.cells[cellOf(L, c.x, c.z)]) { bad(tag + '.chute.coverSeen', seed); break; }
  }
  // hearths out of every lane and 3 m from any other interact; no interact in a lane but those the design puts there
  for (const hh of hearths) {
    if (L.flues.some((f) => inRect(f, hh.x, hh.z, 0.5))) bad(tag + '.hearthInLane', seed);
    if (ints.some((p) => p !== hh && hyp(p, hh) > 0.01 && hyp(p, hh) < 3)) bad(tag + '.hearthCrowded', seed);
    if (!firm(L, hh.x, hh.z) || L.pocket[cellOf(L, hh.x, hh.z)]) bad(tag + '.hearthWet', seed);
  }
  for (const p of ints) if (!inLaneOk.includes(p) && L.flues.some((f) => inRect(f, p.x, p.z, 0.3))) bad(tag + '.interactInLane', seed);
  return map;
}
const lookoutsOk = (S, ks) => S.lookouts?.length === 3 && S.lookouts.every((q, k) => q.k === ks[k] && q.hearth && q.keeper && Array.isArray(q.approach) && q.approach.length >= 2 && q.hut && q.woodpile && q.pack?.tag && q.pack.elite && hyp(q.keeper, q.hearth) <= 3.5);
const reached = (L, R, p, r = 2.6) => nearReach(L, R, p.x, p.z) <= r;

function thaw(seed) {
  let t0 = Date.now();
  const L = genThaw(seed, { mode: 'spate' });
  const T = st.thaw; T.ms += Date.now() - t0; T.tries += L.tries; T.n++; T.max = Math.max(T.max, L.tries);
  if (L.tries > 12) odd('thaw.manyTries', seed);
  if (L.tries >= 24) odd('thaw.lastTryAccepted', seed);
  const { w } = L, S = L.spots;
  if (L.mode !== 'spate' || L.own.level !== 1.2) bad('thaw.shape', seed);
  fields(L, 'thaw', seed, 112, 184);
  // the spots
  const need = ['camp', 'waypoint', 'weirs', 'fords', 'narrows', 'lookouts', 'hornStones', 'dens', 'slabs', 'iceblocks', 'huts', 'arena', 'hearth', 'callHearth', 'haldaDen', 'haldaRim', 'den', 'stair', 'echo', 'shallows', 'stream', 'bridges', 'boulders', 'knolls', 'chests', 'npcs'];
  for (const k of need) if (S[k] == null) bad('thaw.spot.' + k, seed);
  if (HARD.has('thaw.spot.weirs') || !S.weirs || S.weirs.length !== 3) { bad('thaw.weirs', seed); return; }
  if (S.weirs.some((q, k) => q.k !== k + 1 || !q.mark || !q.stand || q.figures?.length !== 3 || hyp(q.mark, q) > 3.5)) bad('thaw.weirs.shape', seed);
  if (S.weirs[0].bank !== 'south' || S.weirs[0].z < 120 || S.weirs[0].x > 30 || S.weirs[1].z > 108 || S.weirs[2].z > 108 || !(S.weirs[1].x >= 44 && S.weirs[1].x <= 66) || S.weirs[2].x < 86) bad('thaw.weirs.place', seed);
  for (const q of S.weirs) for (const p of [q.stand, ...q.figures]) if (!L.cells[cellOf(L, p.x, p.z)] || L.pocket[cellOf(L, p.x, p.z)]) { bad('thaw.weirs.room', seed); break; }
  if (!lookoutsOk(S, [1, 2, 3])) bad('thaw.lookouts', seed);
  if (S.fords.length !== 3 || S.fords.map((f) => f.bed).join() !== '0.6,0.3,0' || S.narrows.bed !== 0) bad('thaw.fords', seed);
  if (!inR(S.camp.x, 56, 6) || !inR(S.camp.z, 168, 2) || !inR(L.boss.x, 56, 4) || !inR(L.boss.z, 24.5, 1.5) || L.boss.r !== 17) bad('thaw.landmarks', seed);
  if (L.exits.length !== 2 || L.exits[0].to !== 'pass' || L.exits[1].to !== 'tarn' || L.exits[1].label !== 'exit.tarn' || L.exits[1].locked !== 'kallistoRest' || hyp(L.exits[1], S.stair) > 0.01) bad('thaw.exits', seed);
  if (!S.dens.some((d) => d.sleeper) || S.dens.length < 4 || S.iceblocks.length !== 2 || S.iceblocks[0].weir !== 3) bad('thaw.dens', seed);
  if (S.huts.length < 4) odd('thaw.fewHuts', seed);
  if (!(S.brooks >= 4 && S.brooks <= 6)) odd('thaw.brooks', seed);
  if (S.bridges.filter((b) => b.main).length < 1) odd('thaw.noCausewayBridge', seed);
  // the gates' table: the camp reaches exactly this and nothing more, at the brooks' low and at their top
  const table = [[S.weirs[0].stand, 1.2, 'weir1'], [S.lookouts[0].hearth, 1.2, 'lookout1'], [S.weirs[1].stand, 0.9, 'weir2'], [S.lookouts[1].hearth, 0.9, 'lookout2'], [S.weirs[2].stand, 0.6, 'weir3'],
    [S.lookouts[2].hearth, 0.3, 'lookout3'], [S.callHearth, 0.3, 'den'], [S.stair, 0.3, 'stair'], [S.haldaDen, 0.3, 'haldaDen'], [{ x: S.narrows.x, z: S.narrows.z0 - 1.5 }, 0.3, 'narrows']];
  const north = (f) => ({ x: f.x, z: f.z0 - 1.5 });
  for (const mh of LEVELS7) for (const hb of [0, BROOK_TOP]) {
    const R = reach(L, L.start.x, L.start.z, walk7(L, hb, mh));
    for (const [p, lv, id] of table) { const got = reached(L, R, p), want = mh <= lv + 1e-6; if (got && !want) bad('thaw.early.' + id + '@' + mh, seed); if (!got && want) bad('thaw.noWay.' + id + '@' + mh, seed); }
    // each ford's far bank from exactly its level
    S.fords.forEach((f, k) => { const got = reached(L, R, north(f), 1.2); if (k === 0 && got !== (mh <= 0.9 + 1e-6)) bad('thaw.westFord@' + mh, seed); });
    for (const p of [S.camp, S.waypoint, L.exits[0], ...S.huts.map((q) => q.door)]) if (!reached(L, R, p, 2.2)) bad('thaw.noWay.south@' + mh, seed);
  }
  // the trodden way is never shut by the brooks: its planks wade at the top (bed 0.45) and are dry below it; it is
  // three cells wide or more on the causeway; the huts and the fold stand clear of every water cell
  for (let i = 0; i < L.cells.length; i++) if (L.trail[i] && L.pocket[i] === 1 && (wetAt(L.bed[i], BROOK_TOP) === 2 || wetAt(L.bed[i], 0.45) !== 0)) { bad('thaw.wayShutByBrook', seed); break; }
  for (const q of S.huts) for (let dz = -4; dz <= 3; dz++) for (let dx = -4; dx <= 3; dx++) if (Math.hypot(dx + 0.5, dz + 0.5) <= 3.5 && L.pocket[cellOf(L, q.x + dx, q.z + dz)]) { bad('thaw.hutByWater', seed); dz = dx = 9; }
  // the fords by their beds: wading at their level, deep a step above
  for (const [f, lv] of [[S.fords[0], 0.9], [S.fords[1], 0.6], [S.fords[2], 0.3], [S.narrows, 0.3]]) { const b = L.bed[cellOf(L, f.x, f.z)]; if (L.pocket[cellOf(L, f.x, f.z)] !== 2 || wetAt(b, lv) !== 1 || wetAt(b, lv + 0.3) !== 2) bad('thaw.fordBed.' + f.id, seed); }
  // the Den's stream only ever wades; no own-level water in the bowl; no cloud's line there (noCloud set over r + 4)
  for (let i = 0; i < L.cells.length; i++) { const x = i % w + 0.5, z = Math.floor(i / w) + 0.5, d = Math.hypot(x - L.boss.x, z - L.boss.z); if (d <= L.boss.r + 2 && L.pocket[i] && (L.pocket[i] === 2 || wetAt(L.bed[i], BROOK_TOP) === 2)) { bad('thaw.denDeep', seed); break; } if (L.cells[i] && d <= L.boss.r + 4 && !L.noCloud[i]) { bad('thaw.noCloudMask', seed); break; } }
  // the lanes
  const ints = [...S.weirs, ...S.lookouts.map((q) => q.hearth), S.callHearth, S.stair, S.waypoint, ...L.exits, ...S.chests, S.den, S.haldaDen, S.npcs.halda, ...S.iceblocks];
  lanes(L, 'thaw', seed, ints, [...S.lookouts.map((q) => q.hearth), S.callHearth]);
  const fl = L.flues.filter((f) => f.area === 'flank'), dn = L.flues.filter((f) => f.area === 'den'), gl = L.flues.filter((f) => f.area === 'gully');
  if (fl.length < 5 || fl.length > 7 || dn.length !== 3 || gl.length !== 1 || L.flues.some((f) => f.kind !== 'snow')) bad('thaw.chuteCount', seed);
  if (fl.filter((f) => f.pack).length < 2 || fl.filter((f) => !f.pack).length < 2 || !gl[0]?.pack) bad('thaw.chutePacks', seed);
  // weir 3's cloud leaves its block 20-40 s after it starts; the trees stand off the way
  { const c = L.clouds.find((q) => q.scripted), b = S.iceblocks[0]; let t = 0; if (!c || Math.hypot(cloudAt(c, 0).x - b.x, cloudAt(c, 0).z - b.z) > c.r) bad('thaw.weir3Cloud', seed); else { while (t < 60 && Math.hypot(cloudAt(c, t).x - b.x, cloudAt(c, t).z - b.z) <= c.r) t += 0.5; if (t < 20 || t > 40) odd('thaw.weir3CloudTime', seed); } }
  if (L.clouds.filter((c) => !c.scripted && !c.extra).length !== 3) bad('thaw.clouds', seed);
  for (const p of S.pines) if (!p.fallen && !p.dead) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.hypot(dx, dz) <= 3 && L.trail[cellOf(L, p.x + dx, p.z + dz)]) { odd('thaw.treeByTheWay', seed); dz = dx = 9; }
  if (L.packs.filter((p) => !p.lookout).length < 15) odd('thaw.fewPacks', seed);
  if (L.packs.filter((p) => p.lookout).length !== 3) bad('thaw.lookoutPacks', seed);
  for (const fa of thawFaults(L)) bad('thaw.' + fa.replace(/@.*/, ''), seed);
  // the green reading: the same layout; the Race at 0.3; the gully's chute gone, the Den's three and four of the flank's kept
  t0 = Date.now();
  const G = genThaw(seed, { mode: 'green' });
  T.ms += Date.now() - t0;
  if (G.mode !== 'green' || G.own.level !== 0.3) bad('green.shape', seed);
  for (const k of ['cells', 'bed', 'pocket', 'low', 'trail', 'shade', 'snow', 'noCloud', 'vault', 'hgt']) if (J(G[k]) !== J(L[k])) { bad('green.changedLayout', seed); break; }
  if (J(G.props) !== J(L.props) || J(G.packs) !== J(L.packs) || J(G.spots) !== J(L.spots) || J(G.clouds) !== J(L.clouds)) bad('green.notSameLayout', seed);
  if (G.flues.filter((f) => f.area === 'den').length !== 3 || G.flues.filter((f) => f.area === 'flank').length !== 4 || G.flues.some((f) => f.area === 'gully') || G.flues.some((f) => !L.flues.some((q) => q.id === f.id && J(q) === J(f)))) bad('green.chutes', seed);
  for (const fa of thawFaults(G)) bad('green.' + fa.replace(/@.*/, ''), seed);
  if (J(genThaw(seed, { mode: 'spate' })) !== J(L)) bad('thaw.nondeterministic', seed);
  T.props += L.props.length; T.packs += L.packs.length; T.flues += L.flues.length;
}

function tarn(seed) {
  let t0 = Date.now();
  const L = genTarn(seed, { mode: 'full' });
  const T = st.tarn; T.ms += Date.now() - t0; T.tries += L.tries; T.n++; T.max = Math.max(T.max, L.tries);
  if (L.tries > 12) odd('tarn.manyTries', seed);
  if (L.tries >= 24) odd('tarn.lastTryAccepted', seed);
  const { w } = L, S = L.spots;
  if (L.mode !== 'full' || L.own.level !== 1.2) bad('tarn.shape', seed);
  fields(L, 'tarn', seed, 104, 176);
  const need = ['camp', 'waypoint', 'winches', 'lookouts', 'bridges', 'crevasses', 'islands', 'piers', 'levers', 'seat', 'plug', 'hearth', 'callHearth', 'haldaDam', 'haldaRim', 'wheel', 'spillway', 'hornStones', 'iceWall', 'arena', 'causeway', 'wheelHouse', 'walls', 'iceblocks', 'chests', 'npcs', 'lake'];
  for (const k of need) if (S[k] == null) bad('tarn.spot.' + k, seed);
  if (!S.winches || S.winches.length !== 3 || !S.levers || S.levers.length !== 3 || !S.plug) { bad('tarn.winches', seed); return; }
  if (S.winches.some((q, k) => q.k !== k + 1 || !q.mark || !q.stand || q.figures?.length !== 3 || hyp(q.mark, q) > 3.5)) bad('tarn.winches.shape', seed);
  for (const q of S.winches) for (const p of [q.stand, ...q.figures]) if (!L.cells[cellOf(L, p.x, p.z)] || L.pocket[cellOf(L, p.x, p.z)]) { bad('tarn.winches.room', seed); break; }
  if (!lookoutsOk(S, [4, 5, 6])) bad('tarn.lookouts', seed);
  if (!inR(S.camp.x, 52, 4) || !inR(S.camp.z, 160, 2) || !inR(L.boss.x, 52, 3) || !inR(L.boss.z, 23.5, 1.5) || L.boss.r !== 16) bad('tarn.landmarks', seed);
  if (L.exits.length !== 1 || L.exits[0].to !== 'thaw') bad('tarn.exits', seed);
  if (S.bridges.length !== 2 || S.crevasses.length !== 2 || S.islands.length !== 4 || S.piers.length !== 7 || S.walls.length < 3) bad('tarn.counts', seed);
  // the levers: on the rim at r 14 and bearings 50, 140, 215; each with its channel, a water lane 4 m wide
  const brg = (p) => ((Math.atan2(p.x - L.boss.x, -(p.z - L.boss.z)) * 180 / Math.PI) + 360) % 360;
  S.levers.forEach((q, k) => { const f = L.flues.find((x) => x.id === q.channel); if (!inR(hyp(q, L.boss), 14, 0.8) || !inR(brg(q), [50, 140, 215][k], 4) || !f || f.kind !== 'water' || f.lever !== k + 1 || f.w !== 4 || (k > 0) !== !!q.ice) bad('tarn.levers', seed); });
  // the plug: three cells, shut in this reading, and the Dam sealed behind it at every level
  if (S.plug.cells.length !== 3 || S.plug.cells.some(([x, z]) => L.cells[z * w + x])) bad('tarn.plugOpen', seed);
  { const R = reach(L, L.start.x, L.start.z, walk7(L, 0, 0.3)); if (reached(L, R, S.callHearth) || reached(L, R, S.seat)) bad('tarn.plugLeaks', seed); }
  const open = L.cells.slice(); for (const [x, z] of S.plug.cells) open[z * w + x] = 1;
  const rim = [...S.levers.map((q) => q.stand), S.callHearth, S.haldaDam];
  for (const mh of LEVELS7) for (const hb of [0, BROOK_TOP]) {
    const W = walk7(L, hb, mh, open), R = reach(L, L.start.x, L.start.z, W);
    for (const [p, id] of [[S.camp, 'camp'], [S.winches[0].stand, 'winch1'], [S.winches[1].stand, 'winch2'], [S.lookouts[0].hearth, 'lookout4'], [S.lookouts[1].hearth, 'lookout5'], [S.arena.mouth, 'mouth'], [S.callHearth, 'hearth'], [S.haldaDam, 'haldaDam'], ...S.levers.map((q) => [q.stand, 'lever' + q.k])]) if (!reached(L, R, p)) bad('tarn.noWay.' + id + '@' + mh, seed);
    const j = reached(L, R, S.winches[2].stand, 1.2);
    if (hb === 0 && !j) bad('tarn.noWay.winch3@' + mh, seed);
    if (hb > 0 && j && mh >= 0.9 - 1e-6) bad('tarn.winch3AtTheTop@' + mh, seed);
    for (const [p, id, r] of [[S.lookouts[2].hearth, 'lookout6', 2.6], [S.wheel.stand, 'wheel', 0.8]]) { const got = reached(L, R, p, r), want = mh <= 0.6 + 1e-6; if (got && !want) bad('tarn.early.' + id + '@' + mh, seed); if (!got && want) bad('tarn.noWay.' + id + '@' + mh, seed); }
    // the rim's ring outside r 12
    const ring = W.slice(); for (let i = 0; i < ring.length; i++) if (Math.hypot(i % w + 0.5 - L.boss.x, Math.floor(i / w) + 0.5 - L.boss.z) <= 12) ring[i] = 0;
    let s = null, bd = 9; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const x = S.callHearth.x + dx, z = S.callHearth.z + dz, d = Math.hypot(dx, dz); if (ring[cellOf(L, x, z)] && d < bd) { bd = d; s = { x, z }; } }
    const Rr = s ? reach(L, s.x, s.z, ring) : new Uint8Array(ring.length);
    for (const p of rim) if (!reached(L, Rr, p, 2.2)) { bad('tarn.rimRing@' + mh, seed); break; }
  }
  // r 12 of floor at 1.2 (no water inside it, but the wall of ice); the seat on open floor, 2 cells out from the wall,
  // in the Foot-race and in reach from its south side
  { const W = walk7(L, 0, 1.2, open); for (let i = 0; i < W.length; i++) { const x = i % w, z = (i - x) / w; if (Math.hypot(x + 0.5 - L.boss.x, z + 0.5 - L.boss.z) <= 11.9 && z > S.iceWall.z && L.pocket[i]) { bad('tarn.floor12', seed); break; } } }
  { const sc = cellOf(L, S.seat.x, S.seat.z), f1 = L.flues.find((f) => f.lever === 1); if (!L.cells[sc] || !L.cells[sc + w] || !L.cells[sc + 2 * w] || L.cells[sc - 2 * w] || !f1 || !inRect(f1, S.seat.x, S.seat.z)) bad('tarn.seat', seed); }
  // the lanes
  const ints = [...S.winches, ...S.levers, S.wheel, ...S.lookouts.map((q) => q.hearth), S.callHearth, S.waypoint, ...L.exits, ...S.chests, S.haldaDam, S.npcs.halda, ...S.iceblocks];
  const map = lanes(L, 'tarn', seed, ints, [...S.lookouts.map((q) => q.hearth), S.callHearth], [S.winches[0]]);
  const fd = L.flues.filter((f) => f.area === 'field'), dm = L.flues.filter((f) => f.area === 'dam' && f.kind === 'snow'), wk = L.flues.filter((f) => f.area === 'works');
  if (fd.length < 4 || fd.length > 6 || dm.length !== 2 || wk.length !== 1 || L.flues.filter((f) => f.kind === 'water').length !== 3) bad('tarn.chuteCount', seed);
  if (!fd.some((f) => f.side === 'east') || !fd.some((f) => f.side === 'west')) bad('tarn.chuteSides', seed);
  // winch 1 in its chute's lane, struck where she stands to turn it; the snow bridges out of every lane
  if (!inRect(wk[0], S.winches[0].x, S.winches[0].z) || !inFlue(map, wk[0], S.winches[0].stand.x, S.winches[0].stand.z)) bad('tarn.winch1NotInLane', seed);
  for (const b of S.bridges) for (const dx of [-1, 0, 1]) for (const dz of [-0.5, 0.5]) { if (L.flues.some((f) => inRect(f, b.x + dx, b.z + dz, 0.4))) bad('tarn.bridgeInLane', seed); if (!L.cells[cellOf(L, b.x + dx, b.z + dz)]) bad('tarn.bridgeBroken', seed); }
  if (L.shade[cellOf(L, S.winches[1].x, S.winches[1].z)]) bad('tarn.winch2InShade', seed);
  // the causeway: the clock's water, covered at its top; the skerry's way the lake's own
  { const c = S.causeway, i = cellOf(L, (c.x0 + c.x1) / 2, c.z0); if (L.pocket[i] !== 1 || wetAt(L.bed[i], BROOK_TOP) !== 2 || wetAt(L.bed[i], 0) !== 0) bad('tarn.causeway', seed); }
  // clouds: three over the Snowfield and the Works, two over the Dam: its middle under cloud about 15 s in every 50
  if (L.clouds.filter((c) => !c.dam && !c.extra && !c.scripted).length !== 3 || L.clouds.filter((c) => c.dam).length !== 2) bad('tarn.clouds', seed);
  { let cov = 0; for (let t = 0; t < 600; t += 0.5) if (L.clouds.some((c) => c.dam && Math.hypot(cloudAt(c, t).x - L.boss.x, cloudAt(c, t).z - L.boss.z) <= c.r)) cov++; const k = cov / 1200; if (k < 0.2 || k > 0.4) odd('tarn.damCloudShare', seed); }
  // 40% or more of the dry floor bare
  { let n = 0, bare = 0; for (let i = 0; i < L.cells.length; i++) if (L.cells[i] && !L.pocket[i]) { n++; if (!L.snow[i]) bare++; } T.bare += bare / n; if (bare < 0.4 * n) bad('tarn.bare40', seed); }
  if (L.packs.filter((p) => !p.lookout).length < 13) odd('tarn.fewPacks', seed);
  if (L.packs.filter((p) => p.lookout).length !== 3) bad('tarn.lookoutPacks', seed);
  for (const fa of tarnFaults(L)) bad('tarn.' + fa.replace(/@.*/, ''), seed);
  // the let reading: the same layout with the plug open and the lake at 0.3
  t0 = Date.now();
  const G = genTarn(seed, { mode: 'let' });
  T.ms += Date.now() - t0;
  if (G.mode !== 'let' || G.own.level !== 0.3) bad('let.shape', seed);
  const pl = new Set(S.plug.cells.map(([x, z]) => z * w + x));
  for (let i = 0; i < L.cells.length; i++) if (pl.has(i) ? !G.cells[i] : G.cells[i] !== L.cells[i]) { bad('let.changedLayout', seed); break; }
  for (const k of ['bed', 'pocket', 'low', 'trail', 'shade', 'snow', 'vault', 'hgt']) if (J(G[k]) !== J(L[k])) { bad('let.changedLayout', seed); break; }
  if (J(G.props) !== J(L.props) || J(G.packs) !== J(L.packs) || J(G.spots) !== J(L.spots) || J(G.flues) !== J(L.flues) || J(G.clouds) !== J(L.clouds)) bad('let.notSameLayout', seed);
  { const R = reach(G, G.start.x, G.start.z, walk7(G, BROOK_TOP, 0.3)); for (const p of [S.callHearth, S.lookouts[2].hearth, S.wheel.stand, ...rim]) if (!reached(G, R, p, 2.2)) bad('let.noWay', seed); }
  for (const fa of tarnFaults(G)) bad('let.' + fa.replace(/@.*/, ''), seed);
  if (J(genTarn(seed, { mode: 'full' })) !== J(L)) bad('tarn.nondeterministic', seed);
  T.props += L.props.length; T.packs += L.packs.length; T.flues += L.flues.length;
}

const seeds = Array.from({ length: N }, (_, n) => S0 + n * 92821);
for (const s of seeds) { thaw(s); tarn(s); }
const show = (o) => Object.keys(o).sort().map((k) => '  ' + k.padEnd(36) + String(o[k].size).padStart(5) + '  e.g. ' + [...o[k]].slice(0, 5).join(', ')).join('\n');
const A = st.thaw, B = st.tarn, meanA = A.tries / N, meanB = B.tries / N;
if (meanA > 3) odd('thaw.meanTries>3', meanA.toFixed(2));
if (meanB > 3) odd('tarn.meanTries>3', meanB.toFixed(2));
console.log(`${N} seeds x 4 (zone, reading): thaw ${(A.ms / N / 2).toFixed(0)} ms (mean ${meanA.toFixed(2)} tries, worst ${A.max}), tarn ${(B.ms / N / 2).toFixed(0)} ms (mean ${meanB.toFixed(2)} tries, worst ${B.max})`);
console.log(`thaw: ${(A.props / N).toFixed(0)} props, ${(A.packs / N).toFixed(1)} packs, ${(A.flues / N).toFixed(1)} lanes, ${(A.brook / N).toFixed(0)} brook cells, ${(A.own / N).toFixed(0)} Race cells; tarn: ${(B.props / N).toFixed(0)} props, ${(B.packs / N).toFixed(1)} packs, ${(B.flues / N).toFixed(1)} lanes, ${(B.brook / N).toFixed(0)} causeway cells, ${(B.own / N).toFixed(0)} lake cells, ${(100 * B.bare / N).toFixed(0)}% of the dry floor bare`);
console.log('tries thrown away, by reason: ' + (Object.keys(REJECT7).length ? Object.entries(REJECT7).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ') : 'none'));
console.log('hard failures:' + (HARD.size ? '\n' + show(fails) : ' none'));
console.log('oddities:' + (Object.keys(soft).length ? '\n' + show(soft) : ' none'));
console.log(HARD.size ? 'FAIL' : 'PASS');
process.exit(HARD.size ? 1 : 0);
