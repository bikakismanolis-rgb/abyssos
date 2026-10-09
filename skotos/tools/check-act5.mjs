// Act V layout check: node tools/check-act5.mjs [n=300] [seed0=5]
// Sweeps genCoast (the tidal reading and, from the same seed, the frozen one), genFarlight and the Field of Ash's Anvil's
// Neck over n seeds. Hard (exit 1): on the coast every place the story needs is reached at low and at high water (the
// tide-locked ones at low water), every pocket that is dry at high water is the camp's or a marked refuge, a refuge of
// 3 x 3 dry cells within 12 m of every tide-locked place, the spines (wreck, fall; the bay road once frozen) and the bay's
// rim whole, nothing the story stands on thin or tidal (but the tide-locked), the beds in 0.15 m steps, the landmarks in
// their ranges, the Freeze changing only the bay; on the Farthest Light the camp reached over thick ice, each hole's lamps
// with the holes before it sealed and not before, the arena, the core through the cross, Selna's pad, the cairns and the
// door with all three sealed, the road whole, no lamp, cairn or window on thin ice, every chest islet within 8 cells of
// thick ice; in the Field the corridor out of the Graves' rectangle, through rock only, shut by its four cells of rubble
// and open to the coast without them. Both generators deterministic. Soft: a mean above 3 tries per seed, and oddities.
// GEN5=<path> checks another copy of gen5.js.
import { pathToFileURL } from 'node:url';
const GEN5 = process.env.GEN5 ? pathToFileURL(process.env.GEN5).href : '../src/world/gen5.js';
const { genCoast, genFarlight, walkAt, coastFaults, farlightFaults, sealedCells, inBay, REJECT } = await import(GEN5);
const { reach, nearReach, BED_DRY } = await import('../src/world/genlib.js');
const { genAshfield } = await import('../src/world/gen4.js');
const N = +(process.argv[2] || 300), S0 = +(process.argv[3] || 5);
const fails = {}, soft = {}, HARD = new Set();
const add = (o, k, s) => { (o[k] ||= new Set()).add(s); };
const bad = (k, s) => { add(fails, k, s); HARD.add(k); };
const odd = (k, s) => add(soft, k, s);
const cellOf = (L, x, z) => Math.floor(z) * L.w + Math.floor(x);
const inR = (v, c, r) => Math.abs(v - c) <= r + 1e-9;
const J = (o) => JSON.stringify(o, (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v));
const st = { coast: { tries: 0, ms: 0, props: 0, packs: 0, wrecks: 0, dry1: 0, flats0: 0 }, far: { tries: 0, ms: 0, props: 0, packs: 0 }, field: { ms: 0, cells: 0 } };

function coast(seed) {
  let t0 = Date.now();
  const L = genCoast(seed);
  st.coast.ms += Date.now() - t0; st.coast.tries += L.tries;
  if (L.tries > 12) odd('coast.manyTries', seed);
  const { w, h } = L, sp = L.spots, N2 = w * h;
  // the contract's arrays
  for (const k of ['cells', 'low', 'bed', 'sea', 'ice', 'thick', 'window', 'deck', 'paint']) if (!L[k] || L[k].length !== N2) bad('coast.field.' + k, seed);
  if (!L.vbed || L.vbed.length !== (w + 1) * (h + 1) || !L.hgt || L.hgt.length !== (w + 1) * (h + 1)) bad('coast.corners', seed);
  if (w !== 120 || h !== 200 || L.type !== 'coast' || L.mode !== 'tide') bad('coast.shape', seed);
  for (let i = 0; i < N2; i++) {
    const b = L.bed[i];
    if (b < BED_DRY && Math.abs(b / 0.15 - Math.round(b / 0.15)) > 1e-4) { bad('coast.bedNotQuantised', seed); break; }
    if (L.cells[i] && L.low[i]) { bad('coast.floorAndLow', seed); break; }
    if ((L.ice[i] || L.thick[i] || L.window[i]) && b !== Math.fround(-0.6) && L.cells[i]) { bad('coast.iceBed', seed); break; }
    if (L.sea[i] && L.cells[i]) { bad('coast.seaWalkable', seed); break; }
  }
  // the landmarks in their ranges
  if (!inR(sp.camp.x, 30, 6) || !inR(sp.camp.z, 136, 6)) bad('coast.landing.range', seed);
  if (!inR(L.boss.x, 60, 8) || !inR(L.boss.z, 30, 3) || L.boss.r !== 18) bad('coast.bay.range', seed);
  const sl = Object.fromEntries(sp.sealights.map((s) => [s.id, s]));
  if (!sl.grey || !inR(sl.grey.x, 106, 4) || !inR(sl.grey.z, 116, 8)) bad('coast.greyLight.range', seed);
  if (!sl.wreck || !inR(sl.wreck.x, 110, 4) || !inR(sl.wreck.z, 66, 6)) bad('coast.wreckLight.range', seed);
  if (!sp.fall || !inR(sp.fall.x, 9, 3.3) || !inR(sp.fall.z, 90, 8)) bad('coast.fall.range', seed);
  const ex = Object.fromEntries(L.exits.map((e) => [e.to, e]));
  if (!ex.ashfield || !inR(ex.ashfield.x, 52, 10) || ex.ashfield.z !== h - 5 || ex.ashfield.label !== 'exit.ashfield') bad('coast.exit.ashfield', seed);
  if (!ex.farlight || ex.farlight.z !== 3 || ex.farlight.locked !== 'frozen' || ex.farlight.label !== 'exit.farlight') bad('coast.exit.farlight', seed);
  // what the story counts on
  if (sp.sealights.length !== 3) bad('coast.sealights!=3', seed);
  for (const s of sp.sealights) {
    if (!s.base || !s.window) { bad('coast.sealight.parts', seed); continue; }
    const win = [[-1, -1], [0, -1], [-1, 0], [0, 0]].map(([dx, dz]) => (s.window.z + dz) * w + s.window.x + dx);
    if (!win.every((i) => L.window[i])) bad('coast.window!=2x2', seed);
    for (let dz = -2; dz < 2; dz++) for (let dx = -2; dx < 2; dx++) { const i = (s.window.z + dz) * w + s.window.x + dx; if (!L.window[i] && !L.thick[i]) bad('coast.windowOnThin', seed); }
  }
  const ids = sp.stones.map((s) => s.id).sort().join(',');
  if (ids !== 'carriers,keyx,sailor,thaleia') bad('coast.stones', seed);
  if (!sp.stones.find((s) => s.id === 'carriers')?.tideLocked) bad('coast.carriersNotTideLocked', seed);
  const hoards = sp.chests.filter((c) => c.hoard);
  if (hoards.length < 2 || hoards.length > 3 || hoards.some((c) => !c.tideLocked)) bad('coast.hoards', seed);
  if (L.tideLocked.length < 3) bad('coast.tideLocked<3', seed);
  if (sp.huts.length < 5 || sp.huts.length > 7) bad('coast.huts', seed);
  if (sp.racks.length !== 2) odd('coast.racks!=2', seed);
  if (sp.boats.length !== 3) bad('coast.boats!=3', seed);
  if (!sp.npcs.alkyone || !sp.npcs.tamarisk || !sp.npcs.glaukos || sp.npcs.shore.length !== 3 || !sp.npcs.rock) bad('coast.npcs', seed);
  if (sp.caves.length !== 2) bad('coast.caves!=2', seed);
  const gy = sp.wrecks.filter((x) => x.kind !== 'dalaro');
  if (!sp.wrecks.some((x) => x.kind === 'dalaro' && x.belly) || gy.length < 6 || gy.length > 9) bad('coast.wrecks', seed);
  if (!gy.some((x) => x.lice)) odd('coast.noLiceHull', seed);
  if (sp.mawHoles.length < 3 || sp.mawHoles.length > 5 || sp.mawHoles.some((m) => !L.sea[cellOf(L, m.x, m.z)])) bad('coast.mawHoles', seed);
  if (sp.bayIslets.length !== 3) bad('coast.bayIslets', seed);
  for (const b of sp.bayIslets) if (!inR(Math.hypot(b.x - L.boss.x, b.z - L.boss.z), 9, 0.3) || b.r !== 3.5 || L.cells[cellOf(L, b.boulder.x, b.boulder.z)]) bad('coast.bayIslet', seed);
  if (!sp.skerry?.cells?.length || sp.skerry.cells.some(([x, z]) => L.cells[z * w + x])) bad('coast.skerryOpen', seed);
  if (!sp.ribs?.cells?.length || sp.ribs.cells.some(([x, z]) => L.cells[z * w + x])) bad('coast.ribs', seed);
  if (!sp.iceRoad?.cells?.length || sp.iceRoad.cells.some(([x, z]) => L.cells[z * w + x])) bad('coast.iceRoadOpen', seed);
  if (L.refuges.filter((r) => r.skerry).length < 8 || !L.refuges.some((r) => r.light === 'grey')) bad('coast.refuges', seed);
  if (!sp.whale || !sp.den || !sp.overlook || !sp.bell || !sp.jetty || sp.casks.length < 2 || sp.roosts.length < 2) bad('coast.spots', seed);
  for (const t of ['sunkenCrew', 'tideChoir', 'hullSwarm', 'reefRocks', 'strandBear', 'fallHunters', 'skuaFlock']) if (!L.packs.some((p) => p.tag === t)) bad('coast.noPack.' + t, seed);
  if (sp.jetty.cells.length !== 18) odd('coast.jetty!=2x9', seed);
  // reach at both tide extremes, pockets, refuges, spines, rims, footing
  const R0 = reach(L, L.start.x, L.start.z, walkAt(L, 0)), R1 = reach(L, L.start.x, L.start.z, walkAt(L, 1.2));
  for (const f of coastFaults(L, R0, R1)) bad('coast.' + f.replace(/@.*/, ''), seed);
  // how the tide works the flats: walkable outside the bay at low water and high water
  let a0 = 0, a1 = 0; for (let i = 0; i < N2; i++) if (R0[i] && !inBay(L, i % w, Math.floor(i / w))) { a0++; if (R1[i]) a1++; }
  st.coast.flats0 += a0; st.coast.dry1 += a1;
  if (a1 > a0 * 0.8) odd('coast.tideTooSmall', seed);
  // the Freeze: the same coast but the bay's way north (thick, to the exit) and the sea before it
  t0 = Date.now();
  const F = genCoast(seed, { frozen: true });
  st.coast.ms += Date.now() - t0;
  if (F.mode !== 'frozen') bad('frozen.mode', seed);
  const Rf0 = reach(F, F.start.x, F.start.z, walkAt(F, 0)), Rf1 = reach(F, F.start.x, F.start.z, walkAt(F, 1.2));
  for (const f of coastFaults(F, Rf0, Rf1)) bad('frozen.' + f.replace(/@.*/, ''), seed);
  const fe = F.exits.find((e) => e.to === 'farlight');
  if (nearReach(F, Rf0, fe.x, fe.z) > 1.5 || nearReach(F, Rf1, fe.x, fe.z) > 1.5) bad('frozen.exitUnreachable', seed);
  if (!F.spines.some((s) => s.id === 'bayRoad')) bad('frozen.noBayRoad', seed);
  for (const [x, z] of F.spots.iceRoad.cells) if (!F.thick[z * w + x] || !F.cells[z * w + x]) { bad('frozen.roadNotThick', seed); break; }
  for (let i = 0; i < N2; i++) {
    const x = i % w, z = (i - x) / w, bay = z < L.boss.z - 16 && Math.abs(x + 0.5 - L.boss.x) < 25;
    if (!bay && (F.cells[i] !== L.cells[i] || F.bed[i] !== L.bed[i] || F.ice[i] !== L.ice[i] || F.thick[i] !== L.thick[i])) { bad('frozen.changedOutsideBay', seed); break; }
  }
  if (J(F.spots.stones) !== J(L.spots.stones) || J(F.packs) !== J(L.packs) || J(F.props) !== J(L.props)) bad('frozen.notSameLayout', seed);
  // the same seed, the same coast
  if (seed % 7 === 5 && J(genCoast(seed)) !== J(L)) bad('coast.nondeterministic', seed);
  st.coast.props += L.props.length; st.coast.packs += L.packs.length; st.coast.wrecks += gy.length;
}

function farlight(seed) {
  const t0 = Date.now(), L = genFarlight(seed);
  st.far.ms += Date.now() - t0; st.far.tries += L.tries;
  if (L.tries > 12) odd('far.manyTries', seed);
  const { w, h } = L, sp = L.spots, N2 = w * h;
  for (const k of ['cells', 'low', 'sea', 'ice', 'thick', 'window']) if (!L[k] || L[k].length !== N2) bad('far.field.' + k, seed);
  if (w !== 112 || h !== 208 || L.type !== 'farlight' || L.bed) bad('far.shape', seed);
  if (!inR(L.boss.x, 56, 6) || !inR(L.boss.z, 28, 2) || L.boss.r !== 16) bad('far.arena.range', seed);
  const ex = L.exits[0];
  if (L.exits.length !== 1 || ex.to !== 'coast' || ex.label !== 'exit.shore' || ex.z !== h - 5) bad('far.exit', seed);
  if (sp.holes.length !== 3 || sp.holes.some((ho, k) => ho.id !== k || ho.r !== 4.5 || ho.lamps.length !== 3 || !ho.tongue || !ho.alk)) bad('far.holes', seed);
  for (let k = 1; k < sp.holes.length; k++) if (sp.holes[k].z >= sp.holes[k - 1].z) bad('far.holesNotSouthToNorth', seed);
  sp.holes.forEach((ho, k) => { if (!inR(ho.z, [150, 104, 58][k], 12)) odd('far.hole' + k + '.z', seed); if (ho.lead.some(([x, z]) => !L.sea[z * w + x])) bad('far.leadNotWater', seed); });
  // a lead crosses the whole width: no column without its water
  for (const ho of sp.holes) { const cols = new Set(ho.lead.map(([x]) => x)); for (let x = 0; x < w; x++) if (!cols.has(x)) { bad('far.leadNotAcross', seed); break; } }
  if (sp.drowned.length < 3 || sp.drowned.length > 4 || sp.drowned.some((d) => !d.glow || !d.window || !d.chest)) bad('far.drowned', seed);
  if (sp.bergs.length < 3 || sp.bergs.length > 5 || sp.bergs.some((b) => b.r < 4 || b.r > 7)) bad('far.bergs', seed);
  if (!sp.core || sp.core.r !== 6.5 || sp.fires.length !== 4 || sp.fires.some((f) => f.r !== 2.5) || !sp.selnaPad || sp.hands.length !== 6 || sp.casks.length !== 4) bad('far.arenaSpots', seed);
  for (const p of sp.hands) if (!L.ice[cellOf(L, p.x, p.z)]) bad('far.handNotThin', seed);
  for (const p of sp.casks) if (!L.thick[cellOf(L, p.x, p.z)]) bad('far.caskNotRim', seed);
  if (!L.sea[cellOf(L, sp.skotos.x, sp.skotos.z)]) bad('far.skotosNotInWater', seed);
  if (!sp.farLight || sp.farLight.cells.length !== 9 || sp.farLight.cells.some(([x, z]) => L.cells[z * w + x])) bad('far.farLight', seed);
  if (sp.npcs.keepers.length !== 6 || !sp.npcs.tern || !sp.npcs.alkyone || !sp.npcs.tamarisk) bad('far.npcs', seed);
  for (const k of sp.npcs.keepers) if (!L.cells[cellOf(L, k.x, k.z)] || L.ice[cellOf(L, k.x, k.z)]) bad('far.keeperNotOnCore', seed);
  if (!sp.ship?.cells?.length || sp.ship.cells.some(([x, z]) => L.cells[z * w + x])) bad('far.ship', seed);
  if (sp.poles.length < 12) odd('far.poles<12', seed);
  for (const t of ['frozenCrew', 'iceMixed', 'strandBear', 'skuaFlock']) if (!L.packs.some((p) => p.tag === t)) bad('far.noPack.' + t, seed);
  for (const f of farlightFaults(L)) bad('far.' + f.replace(/@.*/, ''), seed);
  // with nothing sealed, nothing beyond the first lead
  const R0 = reach(L, L.start.x, L.start.z, sealedCells(L, 0));
  if (nearReach(L, R0, L.boss.x, L.boss.z + 15.25) < 3) bad('far.arenaOpenEarly', seed);
  if (seed % 7 === 5 && J(genFarlight(seed)) !== J(L)) bad('far.nondeterministic', seed);
  st.far.props += L.props.length; st.far.packs += L.packs.length;
}

// the Field of Ash's way to the coast (gen4.js neck(): Act V's one change to an old zone)
function field(seed) {
  const t0 = Date.now(), L = genAshfield(seed);
  st.field.ms += Date.now() - t0;
  const nk = L.neck;
  if (!nk) return bad('field.noNeck', seed);
  const { w } = L, G = L.spots.graves, GP = L.boss;
  if (nk.plug.length !== 4) bad('field.plug!=4', seed);
  for (const [x, z] of [...nk.cells, ...nk.plug]) if (Math.abs(x - G.x) < 18 && z > 41 - 4 && z < 80 + 4) { bad('field.neckInGraves', seed); break; }
  for (const [x, z] of nk.plug) if (L.cells[z * w + x]) bad('field.plugOpen', seed);
  const ex = L.exits.find((e) => e.to === 'coast');
  if (!ex || ex.z !== 3 || ex.locked !== 'coal' || ex.label !== 'exit.coast' || ex.x !== Math.min(w - 8, GP.x + 26)) bad('field.exit', seed);
  const bearing = Math.atan2(nk.x - GP.x, -(nk.z - GP.z)) * 180 / Math.PI;
  if (bearing < 95 || bearing > 135) odd('field.mouthBearing', seed);
  const R = reach(L, L.start.x, L.start.z), c1 = L.cells.slice();
  for (const [x, z] of nk.plug) c1[z * w + x] = 1;
  const R1 = reach(L, L.start.x, L.start.z, c1);
  if (ex && nearReach(L, R, ex.x, ex.z) < 3) bad('field.exitOpenWithPlug', seed);
  if (ex && nearReach(L, R1, ex.x, ex.z) > 1.5) bad('field.exitUnreachable', seed);
  // the corridor's rows north of the turn are 4 cells wide
  const rows = {}; for (const [x, z] of nk.cells) if (z < nk.z - 3) rows[z] = (rows[z] || 0) + 1;
  if (Object.values(rows).some((n) => n !== 4)) odd('field.neckWidth', seed);
  st.field.cells += nk.cells.length;
}

const seeds = Array.from({ length: N }, (_, n) => S0 + n * 92821);
for (const s of seeds) { coast(s); farlight(s); field(s); }
const show = (o) => Object.keys(o).sort().map((k) => '  ' + k.padEnd(36) + String(o[k].size).padStart(5) + '  e.g. ' + [...o[k]].slice(0, 5).join(', ')).join('\n');
const C = st.coast, Fl = st.far;
const meanC = C.tries / N, meanF = Fl.tries / N;
if (meanC > 3) odd('coast.meanTries>3', meanC.toFixed(2));
if (meanF > 3) odd('far.meanTries>3', meanF.toFixed(2));
console.log(`${N} seeds: coast ${(C.ms / N / 2).toFixed(0)} ms (mean ${meanC.toFixed(2)} tries), farlight ${(Fl.ms / N).toFixed(0)} ms (mean ${meanF.toFixed(2)} tries), field ${(st.field.ms / N).toFixed(0)} ms`);
console.log(`coast: ${(C.props / N).toFixed(0)} props, ${(C.packs / N).toFixed(1)} packs, ${(C.wrecks / N).toFixed(1)} Graveyard wrecks; walkable outside the bay ${(C.flats0 / N).toFixed(0)} cells at low water, ${(C.dry1 / N).toFixed(0)} at high (${(100 * C.dry1 / C.flats0).toFixed(0)}%); farlight: ${(Fl.props / N).toFixed(0)} props, ${(Fl.packs / N).toFixed(1)} packs; the Neck ${(st.field.cells / N).toFixed(0)} cells`);
console.log('tries thrown away, by reason: ' + (Object.keys(REJECT).length ? Object.entries(REJECT).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ') : 'none'));
console.log('hard failures:' + (HARD.size ? '\n' + show(fails) : ' none'));
console.log('oddities:' + (Object.keys(soft).length ? '\n' + show(soft) : ' none'));
process.exit(HARD.size ? 1 : 0);
