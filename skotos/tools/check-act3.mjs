// Act III layout check: node tools/check-act3.mjs [n=2000] [seed0=5]
// Sweeps genWeep and genHeart over n seeds (plus the seeds the Act III review named) and checks what the story needs:
// every Heartroot can be walked to while its thorn wall stands, every chamber and Tear can be reached, the Weeping
// Woods keep their three Tears, guaranteed clearings and 2-3 minor Tears; and that nothing stands where it should not
// (props over the amber or on a deck, Elati or a chest inside a tree or stone, a cocoon on a Heartroot, sap in an
// alcove's mouth). Exits 1 if a hard check fails. GEN=<path> checks another copy of gen3.js.
import { pathToFileURL } from 'node:url';
const GEN = process.env.GEN ? pathToFileURL(process.env.GEN).href : '../src/world/gen3.js';
const { genWeep, genHeart } = await import(GEN);
const N = +(process.argv[2] || 2000), S0 = +(process.argv[3] || 5);
const NAMED = {
  heart: [711937075, 394953360, 963017880, 965988152, 1820962383, 1255496851, 1575172375, 18968397, 925837620, 69193199, 584627585, 233776534, 9374926, 1534238314, 1575450838, 61737, 1844364, 1612864, 12345],
  weep: [601927, 594210, 324115, 463021, 524757, 38586, 270096, 748550, 856588, 872022, 1466231, 277823, 3742756, 7215406, 1813496, 5278439, 2947905, 7778747, 540201, 12345]
};
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 4-connected flood from (sx, sz) over walkable cells (the game's flow field never cuts corners: same connectivity)
function flood(L, c, sx, sz) {
  const { w, h } = L, seen = new Uint8Array(w * h), s = Math.floor(sz) * w + Math.floor(sx);
  if (!c[s]) return seen;
  const q = [s]; seen[s] = 1;
  for (let hd = 0; hd < q.length; hd++) {
    const i = q[hd], x = i % w, z = (i - x) / w;
    for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz, n = nz * w + nx; if (nx >= 0 && nz >= 0 && nx < w && nz < h && c[n] && !seen[n]) { seen[n] = 1; q.push(n); } }
  }
  return seen;
}
// distance from (x, z) to the nearest reached cell's centre
function near(L, R, x, z, r = 4) {
  let b = 99;
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz;
    if (cx >= 0 && cz >= 0 && cx < L.w && cz < L.h && R[cz * L.w + cx]) b = Math.min(b, Math.hypot(cx + 0.5 - x, cz + 0.5 - z));
  }
  return b;
}
const fails = {}, soft = {}, HARD = new Set();
const add = (o, k, s) => { (o[k] ||= new Set()).add(s); };
const bad = (k, s) => { add(fails, k, s); HARD.add(k); };
const odd = (k, s) => add(soft, k, s);
const cellOf = (L, x, z) => Math.floor(z) * L.w + Math.floor(x);
const wet = (L, i) => L.low[i] || L.deck[i];
// props that stand on the ground: over amber (or on a deck) they hang in the air
const GROUNDED = new Set(['mush', 'shroom', 'cocoon', 'songStone', 'mound', 'nameStone', 'sapling', 'log', 'bones', 'branches', 'stone', 'tuft', 'bush', 'bracken', 'shrub']);
function heart(seed) {
  const L = genHeart(seed);
  if (!L) return bad('heart.noLayout', seed);
  const { w } = L, walls = (k) => { const c = L.cells.slice(); L.thorns.forEach((t, j) => { for (const [x, z] of t.cells) c[z * w + x] = j < k ? 1 : 0; }); return c; };
  for (let k = 0; k <= 3; k++) {
    const R = flood(L, walls(k), L.start.x, L.start.z);
    if (k < 3) {
      const nd = L.thorns[k].node;
      if (near(L, R, nd.x, nd.z) > 1.5) bad('heart.node' + k + '.unreachable', seed);
      if (near(L, R, L.boss.x, L.boss.z) < 1) bad('heart.wall' + k + '.leaks', seed);
      if (!L.cells[cellOf(L, nd.x, nd.z)]) odd('heart.nodeCellBlocked', seed);
      if (L.spots.cocoons.some((c) => Math.hypot(c.x - nd.x, c.z - nd.z) < 2)) odd('heart.cocoonOnNode', seed);
    } else {
      if (near(L, R, L.boss.x, L.boss.z) > 1) bad('heart.boss.unreachable', seed);
      for (const c of L.chambers) if (near(L, R, c.x, c.z, 4) > 3) bad('heart.chamber.' + c.kind + '.unreachable', seed);
      for (const t of L.spots.tears) if (near(L, R, t.x, t.z) > 1.8) bad('heart.tear.unreachable', seed);
      for (const a of L.spots.alcoves) if (near(L, R, a.x, a.z) > 1) bad('heart.alcove.unreachable', seed);
    }
  }
  for (const p of L.props) if (GROUNDED.has(p.t) && wet(L, cellOf(L, p.x, p.z))) odd('heart.overAmber.' + p.t, seed);
  // each alcove's mouth stays dry: no sap within 4.5 m of its centre
  for (const a of L.spots.alcoves) {
    let n = 0;
    for (let z = Math.floor(a.z - 5); z <= a.z + 5; z++) for (let x = Math.floor(a.x - 5); x <= a.x + 5; x++) if (Math.hypot(x + 0.5 - a.x, z + 0.5 - a.z) < 4.5 && L.sap[z * w + x]) n++;
    if (n) odd('heart.alcoveSap', seed);
  }
}
function weep(seed) {
  const L = genWeep(seed), c = L.cells.slice();
  for (const [x, z] of L.spots.rootGate.cells) c[z * L.w + x] = 1;
  const R = flood(L, c, L.start.x, L.start.z);
  const story = L.spots.tears.filter((t) => t.story), minor = L.spots.tears.filter((t) => !t.story);
  if (story.length < 3) bad('weep.storyTearMissing', seed);
  for (const t of L.spots.tears) if (near(L, R, t.x, t.z) > 1.8) bad('weep.tear.' + (t.story ? 'story' : 'minor') + '.unreachable', seed);
  if (near(L, R, L.boss.x, L.boss.z) > 1) bad('weep.glade.unreachable', seed);
  const e = L.exits.find((x) => x.to === 'heart');
  if (near(L, R, e.x, e.z - 3) > 1.2) bad('weep.rootGate.unreachable', seed);
  for (const k of ['elati', 'linden']) if (near(L, R, L.spots.npcs[k].x, L.spots.npcs[k].z) > 2.2) bad('weep.' + k + '.unreachable', seed);
  if (near(L, R, L.spots.waypoint.x, L.spots.waypoint.z) > 2) bad('weep.waypoint.unreachable', seed);
  for (const k of ['weepers', 'mourners', 'den']) if (!L.clearings.some((q) => q.kind === k)) odd('weep.noClearing.' + k, seed);
  if (minor.length < 2) odd('weep.minorTears<2', seed);
  const el = L.spots.npcs.elati;
  if (!L.cells[cellOf(L, el.x, el.z)]) odd('weep.elatiInSolid', seed);
  if (L.props.some((p) => p.t === 'wtree' && Math.hypot(p.x - el.x, p.z - el.z) < 1.5)) odd('weep.elatiInTree', seed);
  for (const ch of L.spots.chests) if (!L.cells[cellOf(L, ch.x, ch.z)]) odd('weep.chestInSolid', seed);
  for (const p of L.props) if (GROUNDED.has(p.t) && wet(L, cellOf(L, p.x, p.z))) odd('weep.overAmber.' + p.t, seed);
}
const seeds = Array.from({ length: N }, (_, n) => S0 + n * 92821);
const t0 = Date.now();
for (const s of NAMED.heart.concat(seeds)) heart(s);
for (const s of NAMED.weep.concat(seeds)) weep(s);
const show = (o) => Object.keys(o).sort().map((k) => '  ' + k.padEnd(32) + String(o[k].size).padStart(5) + '  e.g. ' + [...o[k]].slice(0, 5).join(', ')).join('\n');
console.log(`${N} seeds (+${NAMED.heart.length} heart, +${NAMED.weep.length} weep named) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log('hard failures:' + (HARD.size ? '\n' + show(fails) : ' none'));
console.log('oddities:' + (Object.keys(soft).length ? '\n' + show(soft) : ' none'));
process.exit(HARD.size ? 1 : 0);
