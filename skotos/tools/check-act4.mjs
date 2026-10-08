// Act IV layout check: node tools/check-act4.mjs [n=2000] [seed0=5]
// Sweeps genAshfield and genForge over n seeds and checks what the story and the fights need. The Field: the five story
// lamps, the extra waylamps, the three altars (one of each), both camps, the braziers, the Last Lamp, the gate and the
// arena can all be walked to; the patrol loops stay on the floor; lamps 4 and 5 are in the Graves. The Forge: with the slag
// plug in place every chamber, bellows, fire-pit, door, station, flue mouth and the camp can be reached, and the Anvil of
// the Crown cannot; with the plug melted the Anvil, the cages, the ghosts' spots and Isarn's place can; each gallery is
// straight, five cells wide over its whole flue. And that nothing stands where it should not (a prop over a hole, an NPC
// or a lamp in rock, a chest in a sink or a pit, a prop laid at 0 over ground that sinks, battle debris on a shrine, chest
// or waylamp). Exits 1 if a hard check fails. GEN=<path> checks another copy of gen4.js.
import { pathToFileURL } from 'node:url';
const GEN = process.env.GEN ? pathToFileURL(process.env.GEN).href : '../src/world/gen4.js';
const { genAshfield, genForge, reach, nearReach, groundY, craneSamples } = await import(GEN);
const N = +(process.argv[2] || 2000), S0 = +(process.argv[3] || 5);
const fails = {}, soft = {}, HARD = new Set();
const add = (o, k, s) => { (o[k] ||= new Set()).add(s); };
const bad = (k, s) => { add(fails, k, s); HARD.add(k); };
const odd = (k, s) => add(soft, k, s);
const cellOf = (L, x, z) => Math.floor(z) * L.w + Math.floor(x);
const floor = (L, x, z) => !!L.cells[cellOf(L, x, z)];
// props that stand on the ground: over a hole they hang in the air
const GROUNDED = new Set(['ashTuft', 'ashStone', 'debris', 'bones', 'tickNest', 'slag', 'fallenBanner', 'forgeClutter', 'bedroll', 'campfire', 'stairStep']);
const stats = { ashfield: { lanterns: 0, poles: 0, packs: 0, props: 0 }, forge: { packs: 0, props: 0, flueLen: [] } };
// a chest stands on floor, out of every hole, on level ground (build.js lays it at 0; its loot is thrown round it)
function chests(L, z, seed) {
  for (const c of L.spots.chests) {
    if (!floor(L, c.x, c.z) || L.low[cellOf(L, c.x, c.z)]) bad(z + '.chest.inHole', seed);
    let lo = 0, hi = 0;
    for (let k = 0; k < 9; k++) { const y = groundY(L, c.x + (k ? Math.sin(k * 0.785) * 0.6 : 0), c.z + (k ? Math.cos(k * 0.785) * 0.6 : 0)); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (lo < -0.12 || hi > 0.12) odd(z + '.chest.notLevel', seed);
  }
}
// grounded props laid at 0 (no y) over ground that sinks beside a hole hang in the air
function sunk(L, z, seed) {
  for (const p of L.props) if (GROUNDED.has(p.t) && p.y == null && groundY(L, p.x, p.z) < -0.15) odd(z + '.propOverSunkGround.' + p.t, seed);
}

function ashfield(seed) {
  const L = genAshfield(seed);
  if (!L) return bad('ash.noLayout', seed);
  const sp = L.spots, R = reach(L, L.start.x, L.start.z), far = (p, r = 2) => nearReach(L, R, p.x, p.z) > r;
  if (sp.lamps.length !== 5) bad('ash.lamps!=5', seed);
  sp.lamps.forEach((p, i) => { if (p.id !== 'l' + (i + 1) || !p.memory) bad('ash.lampIds', seed); if (far(p, 2.2)) bad('ash.lamp' + (i + 1) + '.unreachable', seed); });
  for (const p of sp.waylamps) if (far(p, 2.2)) bad('ash.waylamp.unreachable', seed);
  const ids = sp.altars.map((a) => a.id).sort().join(',');
  if (ids !== 'forge,throne,unfading') bad('ash.altars', seed);
  for (const a of sp.altars) if (far(a, 2.4)) bad('ash.altar.' + a.id + '.unreachable', seed);
  for (const k of ['camp', 'camp2', 'waypoint', 'lastLamp', 'hook', 'banners', 'drake', 'isarnRun']) if (!sp[k] || far(sp[k], 2.2)) bad('ash.' + k + '.unreachable', seed);
  for (const k of ['wayfarer', 'brokka', 'elati']) { const n = sp.npcs[k]; if (far(n, 2.2)) bad('ash.npc.' + k + '.unreachable', seed); if (!floor(L, n.x, n.z)) odd('ash.npc.' + k + '.inRock', seed); }
  if (sp.braziers.length !== 3) bad('ash.braziers!=3', seed);
  for (const b of sp.braziers) { if (far(b, 1.6)) bad('ash.brazier.unreachable', seed); if (Math.hypot(b.x - L.boss.x, b.z - L.boss.z) > L.boss.r) bad('ash.brazier.outsideArena', seed); }
  if (floor(L, sp.lastLamp.x, sp.lastLamp.z)) bad('ash.lastLamp.notSolid', seed);
  if (far(L.boss, 1.6)) bad('ash.arena.unreachable', seed);
  for (const e of L.exits) if (far(e, 1.5)) bad('ash.exit.' + e.to + '.unreachable', seed);
  if (!L.gate?.cells?.length) bad('ash.gate.noCells', seed);
  else if (L.gate.cells.some(([x, z]) => L.cells[z * L.w + x])) bad('ash.gate.open', seed);
  // lamps 4 and 5 in the Graves, 25 m or so apart; 1-3 roughly a road's walk apart
  const G = sp.graves;
  for (const i of [3, 4]) { const p = sp.lamps[i]; if (p && (Math.abs(p.x - G.x) > G.hw || Math.abs(p.z - G.z) > G.r)) bad('ash.lamp' + (i + 1) + '.notInGraves', seed); }
  for (let i = 1; i < 5; i++) { const a = sp.lamps[i - 1], b = sp.lamps[i], d = a && b ? Math.hypot(a.x - b.x, a.z - b.z) : 0; if (d < 14 || d > 34) odd('ash.lampSpacing', seed); }
  if (sp.patrols.length < 2) bad('ash.patrols<2', seed);
  for (const loop of sp.patrols) for (const p of loop) if (!floor(L, p.x, p.z) || far(p, 0.8)) bad('ash.patrol.offFloor', seed);
  if (L.graveLanterns.length < 200) odd('ash.lanterns<200', seed);
  for (const p of L.packs) if (far(p, 3.5)) bad('ash.pack.' + p.tag + '.unreachable', seed);
  for (const t of ['ashLine', 'ashBowmen', 'lamplessPatrol', 'snuffers', 'ticks', 'ashwing']) if (!L.packs.some((p) => p.tag === t)) bad('ash.noPack.' + t, seed);
  for (const p of L.props) if (GROUNDED.has(p.t) && L.low[cellOf(L, p.x, p.z)]) odd('ash.overSink.' + p.t, seed);
  for (const p of [...sp.lamps, ...sp.waylamps]) if (L.low[cellOf(L, p.x, p.z)]) bad('ash.lampInSink', seed);
  if (L.hgt.length !== (L.w + 1) * (L.h + 1)) bad('ash.hgt', seed);
  chests(L, 'ash', seed); sunk(L, 'ash', seed);
  for (const q of [...sp.shrines, ...sp.chests, ...sp.waylamps]) if (L.props.some((p) => p.t === 'debris' && Math.hypot(p.x - q.x, p.z - q.z) < 1.2)) odd('ash.debrisOnSpot', seed);
  const s = stats.ashfield; s.lanterns += L.graveLanterns.length; s.poles += L.gravePoles.length; s.packs += L.packs.length; s.props += L.props.length;
}

function forge(seed) {
  const L = genForge(seed);
  if (!L) return bad('forge.noLayout', seed);
  const sp = L.spots, { w } = L;
  const R0 = reach(L, L.start.x, L.start.z), far0 = (p, r = 2) => nearReach(L, R0, p.x, p.z, 5) > r;
  const c1 = L.cells.slice(); for (const [x, z] of L.plug.cells) c1[z * w + x] = 1;
  const R1 = reach(L, L.start.x, L.start.z, c1), far1 = (p, r = 1.6) => nearReach(L, R1, p.x, p.z, 5) > r;
  if (sp.bellows.length !== 3) bad('forge.bellows!=3', seed);
  // a crane's girder lies on floor end to end, its rails never bare over the slag (craneSamples: gen4's own footprint)
  const cranes = L.props.filter((p) => p.t === 'crane');
  if (!cranes.length) odd('forge.noCrane', seed);
  for (const p of cranes) craneSamples(p, (x, z, rail) => {
    const i = cellOf(L, x, z);
    if (L.lava[i]) bad(rail ? 'forge.craneRailOverLava' : 'forge.craneOverLava', seed);
    else if (rail && groundY(L, x, z) < -0.041 * p.s) bad('forge.craneRailBare', seed);
    else if (!rail && !L.cells[i]) odd('forge.craneInRock', seed);
  });
  for (const b of sp.bellows) {
    if (far0(b, 1.5)) bad('forge.chamber' + b.id + '.unreachable', seed);
    if (far0(b.pit, 2)) bad('forge.pit.unreachable', seed);
    if (far0(b.pump, 1.5)) bad('forge.pump.unreachable', seed);
    if (b.doors.length !== 2) bad('forge.doors!=2', seed);
    for (const d of b.doors) if (far0(d, 1.6)) bad('forge.door.unreachable', seed);
    const front = { x: b.prop.x + Math.sin(b.prop.r) * 3, z: b.prop.z + Math.cos(b.prop.r) * 3 };
    if (far0(front, 1.6)) bad('forge.bellowsFront.unreachable', seed);
  }
  for (const k of ['camp', 'waypoint']) if (far0(sp[k], 2)) bad('forge.' + k + '.unreachable', seed);
  for (const k of ['brokka', 'elati']) { const n = sp.npcs[k]; if (far0(n, 2)) bad('forge.npc.' + k + '.unreachable', seed); if (!L.cells[cellOf(L, n.x, n.z)]) odd('forge.npc.' + k + '.inRock', seed); }
  for (const st of sp.stations) if (far0(st, 1.6)) bad('forge.station.unreachable', seed);
  if (sp.stations.length < 3) bad('forge.stations<3', seed);
  for (const m of sp.moulds) if (far0({ x: m.x, z: m.z + m.r + 1 }, 2)) bad('forge.mould.unreachable', seed);
  if (sp.moulds.length < 2) odd('forge.moulds<2', seed);
  for (const e of L.exits) if (far0(e, 1.5)) bad('forge.exit.unreachable', seed);
  if (far0(L.plug, 2.6)) bad('forge.plug.unreachable', seed);
  if (!far0(L.boss, 3)) bad('forge.anvil.reachableThroughPlug', seed);
  if (far1({ x: L.boss.x, z: L.boss.z + 2 }, 1.5)) bad('forge.anvil.unreachable', seed);
  for (const c of sp.cages) if (far1(c, 1.5)) bad('forge.cage.' + c.id + '.unreachable', seed);
  for (const g of sp.ghosts) if (far1(g, 1.5)) bad('forge.ghost.unreachable', seed);
  if (far1(sp.isarn, 1.2)) bad('forge.isarn.unreachable', seed);
  if ([...sp.cages, ...sp.ghosts].some((p) => Math.hypot(p.x - L.boss.x, p.z - L.boss.z) > L.boss.r)) bad('forge.spotOutsideArena', seed);
  const an = sp.anvil; if ([[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dx, dz]) => L.cells[(an.z + dz) * w + an.x + dx])) bad('forge.anvil.notSolid', seed);
  // each flue's gallery: floor all along it (bar a pillar), no flue inside the Anvil's arena
  for (const f of L.flues) {
    const fx = Math.sin(f.dir), fz = Math.cos(f.dir);
    let blocked = 0;
    for (let u = 0.5; u < f.len; u += 1) for (let v = -2; v <= 2; v++) { const x = f.x + fx * u + fz * v, z = f.z + fz * u - fx * v; if (!L.cells[cellOf(L, x, z)]) blocked++; }
    if (blocked > 4) bad('forge.gallery' + f.gallery + '.blocked', seed);
    if (f.len < 28 || f.len > 41) odd('forge.flueLen', seed);
    if (Math.hypot(f.x - L.boss.x, f.z - L.boss.z) < L.boss.r + 6) bad('forge.flueInArena', seed);
    stats.forge.flueLen.push(f.len);
  }
  for (const p of L.packs) if (far0(p, 3.5)) bad('forge.pack.' + p.tag + '.unreachable', seed);
  for (const t of ['smiths', 'stokers', 'mouldHall', 'ticks']) if (!L.packs.some((p) => p.tag === t)) bad('forge.noPack.' + t, seed);
  for (const p of L.props) if (GROUNDED.has(p.t) && L.low[cellOf(L, p.x, p.z)]) odd('forge.overHole.' + p.t, seed);
  chests(L, 'forge', seed); sunk(L, 'forge', seed);
  const s = stats.forge; s.packs += L.packs.length; s.props += L.props.length;
}

const seeds = Array.from({ length: N }, (_, n) => S0 + n * 92821);
const t0 = Date.now();
for (const s of seeds) ashfield(s);
const t1 = Date.now();
for (const s of seeds) forge(s);
const show = (o) => Object.keys(o).sort().map((k) => '  ' + k.padEnd(36) + String(o[k].size).padStart(5) + '  e.g. ' + [...o[k]].slice(0, 5).join(', ')).join('\n');
console.log(`${N} seeds: ashfield ${((t1 - t0) / N).toFixed(1)} ms, forge ${((Date.now() - t1) / N).toFixed(1)} ms each`);
const A = stats.ashfield, F = stats.forge, fl = F.flueLen.sort((a, b) => a - b);
console.log(`ashfield: ${(A.lanterns / N).toFixed(0)} grave lanterns on ${(A.poles / N).toFixed(0)} poles, ${(A.packs / N).toFixed(1)} packs, ${(A.props / N).toFixed(0)} props; forge: ${(F.packs / N).toFixed(1)} packs, ${(F.props / N).toFixed(0)} props, flues ${fl[0]}-${fl[fl.length - 1]} m`);
console.log('hard failures:' + (HARD.size ? '\n' + show(fails) : ' none'));
console.log('oddities:' + (Object.keys(soft).length ? '\n' + show(soft) : ' none'));
process.exit(HARD.size ? 1 : 0);
