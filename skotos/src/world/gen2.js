// Act II layouts as plain data: the Giants' Stair (a snowbound pass up to the Great Gate of Deepstone) and the Halls of
// Deepstone (dwarven halls, mines and forges over the lava, with the Deep Forge at the far end).
// Besides cells/paint they carry L.low (holes in the floor: lava, the chasm), L.lava, and per-cell floor kinds.
import { RNG, clamp, fbm, angleDiff } from '../core/util.js';
import { base, carveCircle, carveLine, smoothCells, distField, floorAt, blockCircle } from './gen.js';

// ======================= PASS: the Giants' Stair =======================
export function genPass(seed, o = {}) {
  const rng = RNG(seed);
  const w = o.w || 100, h = o.h || 184;
  const L = base(w, h);
  L.type = 'pass'; L.seed = seed;
  L.low = new Uint8Array(w * h);
  L.chasm = new Uint8Array(w * h);
  // the old dwarf road climbs in switchbacks: it steers for control points that swap sides
  const gx = w / 2 + rng.range(-10, 10), gz = 22;
  const cps = [];
  const nCp = 6;
  for (let i = 1; i <= nCp; i++) {
    const t = i / nCp, side = i % 2 ? -1 : 1;
    cps.push({ x: i === nCp ? gx : w / 2 + side * rng.range(w * 0.18, w * 0.3), z: h - 12 - t * (h - 12 - (gz + 16)) });
  }
  let x = w / 2 + rng.range(-8, 8), z = h - 9, ang = Math.PI, ci = 0;
  const trail = [];
  for (let guard = 0; guard < 2000 && ci < cps.length; guard++) {
    const c = cps[ci];
    const want = Math.atan2(c.x - x, c.z - z);
    ang += angleDiff(ang, want) * 0.12 + rng.range(-0.22, 0.22);
    if (Math.cos(ang) > 0.1) ang += angleDiff(ang, Math.PI) * 0.4; // never back downhill
    x = clamp(x + Math.sin(ang), 10, w - 10); z += Math.cos(ang);
    trail.push({ x, z });
    const r = 3.1 + fbm(x * 0.06, z * 0.06, seed) * 2.6;
    carveCircle(L, x, z, r);
    carveCircle(L, x, z, 1.8, 1);
    // a control point counts as reached once the road is level with it (the road never turns back downhill)
    if (Math.hypot(c.x - x, c.z - z) < 5 || z < c.z + 1.5) ci++;
    if (z < gz + 12) break;
  }
  L.trail = trail;
  carveCircle(L, trail[0].x, h - 7, 6.5);
  L.start = { x: trail[0].x, z: h - 8 };
  // side ledges off the road
  const kinds = rng.shuffle(['camp', 'ruin', 'den', 'cave', 'cairn', 'frozen', 'camp', 'den', 'ruin', 'cave', 'cairn']);
  const ledges = [];
  let k = 0;
  // the chasm crosses about halfway up; keep the ledges off it
  const ci0 = Math.floor(trail.length * rng.range(0.5, 0.58));
  for (let i = 20; i < trail.length - 20; i += rng.int(13, 18)) {
    if (Math.abs(i - ci0) < 12) continue;
    const t = trail[i], side = rng.sign();
    const a = Math.atan2(trail[i + 1].x - t.x, trail[i + 1].z - t.z) + side * Math.PI / 2 + rng.range(-0.4, 0.4);
    const dd = rng.range(9, 15), cx = clamp(t.x + Math.sin(a) * dd, 13, w - 13), cz = clamp(t.z + Math.cos(a) * dd, 13, h - 13);
    const r = rng.range(5.5, 8);
    carveLine(L, t.x, t.z, cx, cz, 2.3, 0.55);
    carveCircle(L, cx, cz, r);
    ledges.push({ x: cx, z: cz, r, kind: kinds[k++ % kinds.length], trailIdx: i });
  }
  L.ledges = ledges;
  // the courtyard before the Great Gate
  const end = trail[trail.length - 1];
  carveCircle(L, gx, gz, 14);
  carveLine(L, end.x, end.z, gx, gz, 3.5, 1);
  carveCircle(L, gx, gz, 9, 0.85);
  // the bridge approach: a straight run of road where the chasm cuts across
  const bc = trail[ci0], bx = bc.x, bz = bc.z;
  carveLine(L, bx, bz + 9, bx, bz - 9, 2.6, 1);
  smoothCells(L, 2);
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) if (xx < 3 || zz < 3 || xx >= w - 3 || zz >= h - 3) L.cells[zz * w + xx] = 0;
  // the chasm: a crooked gash from edge to edge, the road crossing it on one narrow bridge
  for (let xx = 0; xx < w; xx++) {
    const c = bz + (fbm(xx * 0.05, 3.1, seed) - 0.5) * 9 * clamp(Math.abs(xx - bx) / 12, 0, 1);
    const half = 2.6 + fbm(xx * 0.11, 7.7, seed) * 2.2;
    for (let zz = Math.floor(c - half); zz <= Math.ceil(c + half); zz++) {
      if (zz < 1 || zz >= h - 1) continue;
      const i = zz * w + xx;
      if (Math.abs(xx + 0.5 - bx) < 1.7) { L.cells[i] = 1; L.paint[i] = 1; continue; } // the bridge deck
      L.cells[i] = 0; L.low[i] = 1; L.chasm[i] = 1;
    }
  }
  L.bridge = { x: bx, z: bz, len: 14 };
  L.gate = { x: gx, z: gz - 14.2 };
  // the gate is cut into the cliff: rock on both sides of the doorway
  for (let zz = gz - 16; zz <= gz - 13; zz++) for (let xx = Math.floor(gx - 16); xx <= gx + 16; xx++) if (Math.abs(xx + 0.5 - gx) > 2.6 && xx > 0 && xx < w) L.cells[zz * w + xx] = 0;
  L.boss = { x: gx, z: gz - 1 };

  // ---- dressing ----
  const D = distField(L, 12);
  L.dist = D;
  const hAt = (d) => Math.min(d, 10) * 0.55;          // the slopes rise away from the road
  const taken = new Uint8Array(Math.ceil(w / 4) * Math.ceil(h / 4));
  const free = (xx, zz, rad) => {
    const cw = Math.ceil(w / 4), r = Math.ceil(rad / 4), x0 = Math.floor(xx / 4), z0 = Math.floor(zz / 4);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const X = x0 + dx, Z = z0 + dz; if (X >= 0 && Z >= 0 && X < cw && taken[Z * cw + X]) return false; }
    taken[z0 * cw + x0] = 1; return true;
  };
  // which way is the road from a solid cell (so rock faces turn toward it)
  const toFloor = (xx, zz) => {
    let bx2 = 0, bz2 = 0;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const c = D[clamp(zz + dz, 0, h - 1) * w + clamp(xx + dx, 0, w - 1)]; if (c < D[zz * w + xx]) { bx2 += dx; bz2 += dz; } }
    return Math.atan2(bx2, bz2);
  };
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) {
    const i = zz * w + xx, d = D[i];
    if (L.chasm[i]) continue;
    if (d === 0) {
      if (L.paint[i] < 0.3 && rng.chance(0.07)) L.props.push({ t: 'tuft', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.7, 1.2) });
      if (rng.chance(0.012)) L.props.push({ t: 'stone', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.3, 0.6) });
      if (L.paint[i] < 0.2 && rng.chance(0.003)) L.props.push({ t: 'branches', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.2) });
      continue;
    }
    if (d === 255) continue;
    const y = hAt(d);
    if (d === 1) {
      if (rng.chance(0.1)) L.props.push({ t: 'boulder', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.6), y: 0.1 });
      else if (rng.chance(0.05)) L.props.push({ t: 'pineS', x: xx + 0.5, z: zz + 0.5, r: rng.range(0, 6.28), s: rng.range(0.75, 1.1), y: 0.2, d });
      else if (rng.chance(0.03) && free(xx, zz, 3)) L.props.push({ t: 'face', x: xx + 0.5, z: zz + 0.5, r: toFloor(xx, zz), s: rng.range(0.9, 1.4), y: -0.2 });
    } else if (d <= 4) {
      if (rng.chance(0.09) && free(xx, zz, 5)) L.props.push({ t: 'cliff', x: xx + 0.5, z: zz + 0.5, r: toFloor(xx, zz) + rng.range(-0.5, 0.5), s: rng.range(0.55, 0.9), y: y - 1.2 });
      else if (rng.chance(0.1)) L.props.push({ t: 'pineS', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.85, 1.3), y: y - 0.1, d });
      else if (rng.chance(0.04)) L.props.push({ t: 'boulder', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(1, 2), y });
    } else if (d <= 8) {
      if (rng.chance(0.06) && free(xx, zz, 7)) L.props.push({ t: 'cliff', x: xx + 0.5, z: zz + 0.5, r: rng.range(0, 6.28), s: rng.range(0.8, 1.2), y: y - 1.5 });
      else if (rng.chance(0.05)) L.props.push({ t: 'pineS', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(1, 1.5), y: y - 0.2, d });
    } else if (rng.chance(0.04) && free(xx, zz, 9)) L.props.push({ t: 'mount', x: xx + 0.5, z: zz + 0.5, r: rng.range(0, 6.28), s: rng.range(1.0, 1.7), y: y - 2.5 });
  }
  // mist rising out of the chasm, the bridge across it
  for (let xx = 4; xx < w - 4; xx += 6) {
    let zs = 0, n = 0; for (let zz = 0; zz < h; zz++) if (L.chasm[zz * w + xx]) { zs += zz; n++; }
    if (n) L.props.push({ t: 'fx', fx: 'abyss', x: xx + 0.5, y: -2, z: zs / n + 0.5 });
  }
  L.props.push({ t: 'bridge', x: bx, z: bz, len: 15 });
  // ledges
  L.spots.shrines = []; L.spots.chests = [];
  for (const c of ledges) {
    if (c.kind === 'camp') {
      L.props.push({ t: 'campfire', x: c.x, z: c.z });
      L.lights.push({ x: c.x, y: 1.2, z: c.z, color: 0xff7a30, intensity: 28, range: 13, flicker: 0.35, fx: 'fire' });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + rng.next(), px = c.x + Math.sin(a) * (c.r - 2.2), pz = c.z + Math.cos(a) * (c.r - 2.2); L.props.push({ t: 'tent', x: px, z: pz, r: a + Math.PI, s: rng.range(0.9, 1.2) }); blockCircle(L, px, pz, 1.1); }
      for (let i = 0; i < 4; i++) L.props.push({ t: 'bones', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.range(0, 6.28), s: 1 });
      L.props.push({ t: 'crate', x: c.x + rng.range(-3, 3), z: c.z + rng.range(2, 3.5), r: rng.next(), s: 1, breakable: true });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(6, 9), tag: 'passGoblins', elite: rng.chance(0.5) ? 'champion' : null });
    } else if (c.kind === 'ruin') {
      // a dwarven watch post: a ring of broken columns round a king's statue
      const n = rng.int(6, 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28, px = c.x + Math.sin(a) * (c.r - 1.6), pz = c.z + Math.cos(a) * (c.r - 1.6);
        L.props.push({ t: rng.chance(0.45) ? 'pillarBroken' : 'pillar', x: px, z: pz, r: rng.next() * 6, s: rng.range(1, 1.25), h: rng.range(0.5, 1), dwarf: true });
        blockCircle(L, px, pz, 0.6);
      }
      L.props.push({ t: 'statue', x: c.x, z: c.z - 0.5, s: 1.2 });
      blockCircle(L, c.x, c.z - 0.5, 1);
      L.spots.shrines.push({ x: c.x, z: c.z + 2.4 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(4, 6), tag: 'ashbound', elite: rng.chance(0.45) ? 'rare' : null });
    } else if (c.kind === 'den') {
      for (let i = 0; i < 8; i++) L.props.push({ t: 'bones', x: c.x + rng.range(-3.5, 3.5), z: c.z + rng.range(-3.5, 3.5), r: rng.range(0, 6.28), s: 1.2 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'wolves', elite: rng.chance(0.6) ? 'champion' : null });
    } else if (c.kind === 'cave') {
      // a troll's cave: rock walls round three sides, its mouth to the road
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 4.4 + 0.95, px = c.x + Math.sin(a) * (c.r + 0.5), pz = c.z + Math.cos(a) * (c.r + 0.5); L.props.push({ t: 'face', x: px, z: pz, r: a + Math.PI, s: rng.range(1.2, 1.6), y: -0.3 }); }
      for (let i = 0; i < 10; i++) L.props.push({ t: 'bones', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.range(0, 6.28), s: 1.4 });
      L.spots.chests.push({ x: c.x + rng.range(-2, 2), z: c.z - 2, rare: rng.chance(0.5) });
      L.packs.push({ x: c.x, z: c.z, n: 1, tag: 'trollCave', elite: 'rare' });
    } else if (c.kind === 'cairn') {
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28 + 0.4, px = c.x + Math.sin(a) * 3, pz = c.z + Math.cos(a) * 3; L.props.push({ t: 'cairn', x: px, z: pz, r: rng.next() * 6, s: rng.range(0.8, 1.2) }); blockCircle(L, px, pz, 0.7); }
      L.spots.shrines.push({ x: c.x, z: c.z });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 8), tag: rng.chance(0.5) ? 'bats' : 'hounds', elite: rng.chance(0.4) ? 'champion' : null });
    } else if (c.kind === 'frozen') {
      // a frozen tarn: worms sleep under the ice
      L.props.push({ t: 'ice', x: c.x, z: c.z, s: c.r - 1.2 });
      L.spots.chests.push({ x: c.x, z: c.z + c.r - 2, rare: true });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(2, 3), tag: 'worms', elite: rng.chance(0.3) ? 'champion' : null });
    }
  }
  // packs along the road (the hounds come down from the gate side)
  for (let i = 24; i < trail.length - 16; i += rng.int(10, 15)) {
    const t = trail[i], up = i / trail.length;
    if (Math.abs(i - ci0) < 6) continue;
    L.packs.push({ x: t.x + rng.range(-2, 2), z: t.z + rng.range(-2, 2), n: rng.int(3, 6), tag: rng.weighted([['passGoblins', 4 - up * 2], ['wolves', 3], ['bats', 1.5], ['ashbound', 1 + up * 2], ['hounds', up * 3]]), elite: rng.chance(0.15) ? 'champion' : null });
  }
  // the Great Gate: statues of the first kings, braziers, runes over the door
  L.props.push({ t: 'deepgate', x: gx, z: L.gate.z });
  for (const sx of [-1, 1]) {
    L.props.push({ t: 'kingStatue', x: gx + sx * 7.5, z: gz - 11.5, r: 0 });
    blockCircle(L, gx + sx * 7.5, gz - 11.5, 1.8);
    L.props.push({ t: 'brazier', x: gx + sx * 4, z: gz - 10.5 });
    blockCircle(L, gx + sx * 4, gz - 10.5, 0.45);
    L.lights.push({ x: gx + sx * 4, y: 1.7, z: gz - 10.5, color: 0xff9040, intensity: 22, range: 13, flicker: 0.35 });
  }
  L.lights.push({ x: gx, y: 6, z: L.gate.z + 1.5, color: 0xffb060, intensity: 14, range: 12, flicker: 0.08 });
  L.lights.push({ x: gx, y: 3, z: gz, color: 0x8ab0ff, intensity: 10, range: 18, flicker: 0.05 });
  L.exits.push({ x: gx, z: L.gate.z + 2.2, to: 'halls', label: 'exit.halls', locked: 'stonewarden' });
  L.exits.push({ x: L.start.x, z: h - 4.5, to: 'town', label: 'exit.town' });
  L.spots.waypoint = { x: L.start.x + 3.4, z: L.start.z - 0.5 };
  L.lights.push({ x: L.spots.waypoint.x, y: 1.2, z: L.spots.waypoint.z, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
  return L;
}

// ======================= HALLS: the Halls of Deepstone =======================
// Same 3x3-cell macro grid as the barrow (the KayKit walls line up), on a larger plan: a gate hall, the Great Hall with its
// lava channel, side rooms (mines, smithies, tombs, store rooms, pillared halls) and the Deep Forge where the king waits.
export function genHalls(seed, o = {}) {
  const rng = RNG(seed);
  const S = 3, MW = o.mw || 30, MH = o.mh || 44, w = MW * S, h = MH * S;
  const L = base(w, h);
  L.type = 'halls'; L.seed = seed; L.macro = S;
  L.low = new Uint8Array(w * h); L.lava = new Uint8Array(w * h);
  L.fk = new Uint8Array(w * h); // floor kind: 0 dressed slabs, 1 paved avenue, 2 raw rock (mines and tunnels)
  const M = new Uint8Array(MW * MH);
  const rooms = [];
  const fits = (r) => r.x >= 1 && r.z >= 1 && r.x + r.w <= MW - 1 && r.z + r.h <= MH - 1 && !rooms.some((q) => r.x < q.x + q.w + 1 && r.x + r.w + 1 > q.x && r.z < q.z + q.h + 1 && r.z + r.h + 1 > q.z);
  const cx0 = Math.floor(MW / 2);
  const forge = { x: cx0 - 5, z: 1, w: 10, h: 9, kind: 'forge' };
  const ante = { x: cx0 - 2, z: 12, w: 4, h: 3, kind: 'ante' };
  const great = { x: cx0 - 6, z: 18, w: 12, h: 8, kind: 'great' };
  const start = { x: cx0 - 4, z: MH - 7, w: 8, h: 5, kind: 'start' };
  rooms.push(forge, ante, great, start);
  const kinds = [['mine', 3], ['smithy', 2], ['tomb', 2], ['hall', 2], ['store', 1.2]];
  for (let tries = 0; tries < 700 && rooms.length < (o.rooms || 17); tries++) {
    const r = { x: rng.int(1, MW - 6), z: rng.int(14, MH - 9), w: rng.int(3, 5), h: rng.int(3, 5), kind: rng.weighted(kinds) };
    if (fits(r)) rooms.push(r);
  }
  for (const r of rooms) for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) M[z * MW + x] = 1;
  const ctr = (r) => ({ x: Math.floor(r.x + r.w / 2), z: Math.floor(r.z + r.h / 2) });
  const avenue = new Uint8Array(MW * MH);
  const dig = (x0, z0, x1, z1, av) => { for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { M[z * MW + x] = 1; if (av) avenue[z * MW + x] = 1; } };
  const normal = rooms.filter((r) => r !== forge);
  const inTree = [start], rest = normal.filter((r) => r !== start), edges = [];
  while (rest.length) {
    let best = null, bd = 1e9;
    for (const a of inTree) for (const b of rest) { const d = Math.abs(ctr(a).x - ctr(b).x) + Math.abs(ctr(a).z - ctr(b).z); if (d < bd) { bd = d; best = [a, b]; } }
    edges.push(best); inTree.push(best[1]); rest.splice(rest.indexOf(best[1]), 1);
  }
  for (let i = 0; i < 3; i++) { const a = rng.pick(normal), b = rng.pick(normal); if (a !== b && a !== ante && b !== ante) edges.push([a, b]); }
  for (const [a, b] of edges) {
    const A = ctr(a), B = ctr(b);
    if (rng.chance(0.5)) { dig(A.x, A.z, B.x, A.z); dig(B.x, A.z, B.x, B.z); } else { dig(A.x, A.z, A.x, B.z); dig(A.x, B.z, B.x, B.z); }
  }
  // the king's road: gate hall -> Great Hall -> antechamber -> Deep Forge, paved and three cells wide
  dig(cx0, great.z + great.h, cx0, start.z, true);
  dig(cx0, ante.z + ante.h, cx0, great.z, true);
  dig(cx0, forge.z + forge.h, cx0, ante.z, true);
  for (let mz = 0; mz < MH; mz++) for (let mx = 0; mx < MW; mx++) if (M[mz * MW + mx]) for (let dz = 0; dz < S; dz++) for (let dx = 0; dx < S; dx++) L.cells[(mz * S + dz) * w + mx * S + dx] = 1;
  const Mf = (x, z) => x >= 0 && z >= 0 && x < MW && z < MH && M[z * MW + x] === 1;
  const roomAt = (mx, mz) => rooms.find((r) => mx >= r.x && mx < r.x + r.w && mz >= r.z && mz < r.z + r.h);
  // floor kinds
  for (let mz = 0; mz < MH; mz++) for (let mx = 0; mx < MW; mx++) {
    if (!Mf(mx, mz)) continue;
    const r = roomAt(mx, mz), kind = r ? (r.kind === 'mine' ? 2 : 0) : avenue[mz * MW + mx] ? 1 : 2;
    for (let dz = 0; dz < S; dz++) for (let dx = 0; dx < S; dx++) L.fk[(mz * S + dz) * w + mx * S + dx] = kind;
  }
  const K = (m, x, z, r = 0, extra = {}) => L.props.push(Object.assign({ t: 'kit', kit: 'dungeon', m, x, z, r }, extra));
  const KG = (m, x, z, r = 0, extra = {}) => L.props.push(Object.assign({ t: 'kit', kit: 'grave', m, x, z, r }, m === 'skull' || m === 'ribcage' ? { s: 0.6 } : {}, extra));
  const T = 0.375;
  // walls: dressed stone in the rooms (taller in the great rooms), raw rock along the tunnels and in the mines
  const walls = [];
  const wallKind = (room) => !room || room.kind === 'mine' ? rng.weighted([['wall', 10], ['wall_cracked', 3], ['wall_broken', 1]])
    : room.kind === 'forge' || room.kind === 'great' ? rng.weighted([['wall', 5], ['wall_arched', 2], ['wall_pillar', 2]])
      : rng.weighted([['wall', 10], ['wall_cracked', 1.5], ['wall_shelves', room.kind === 'store' || room.kind === 'smithy' ? 2 : 0.5], ['wall_arched', 0.8], ['wall_pillar', 0.8]]);
  for (let mz = 0; mz < MH; mz++) for (let mx = 0; mx < MW; mx++) {
    if (!Mf(mx, mz)) continue;
    const room = roomAt(mx, mz);
    const skin = !room || room.kind === 'mine' ? 'cave' : 'dwall';
    const sy = room && (room.kind === 'great' || room.kind === 'forge') ? 1.5 : room ? 1.2 : 1;
    const add = (x, z, r, side) => { const m = wallKind(room); K(m, x, z, r, { wall: true, side, skin, sy }); walls.push({ x, z, r, m, room }); };
    if (!Mf(mx, mz - 1)) add(mx * S + 1.5, mz * S - T, 0, 'n');
    if (!Mf(mx, mz + 1)) add(mx * S + 1.5, (mz + 1) * S + T, Math.PI, 's');
    if (!Mf(mx - 1, mz)) add(mx * S - T, mz * S + 1.5, Math.PI / 2, 'w');
    if (!Mf(mx + 1, mz)) add((mx + 1) * S + T, mz * S + 1.5, -Math.PI / 2, 'e');
  }
  for (let vz = 0; vz <= MH; vz++) for (let vx = 0; vx <= MW; vx++) {
    const a = Mf(vx - 1, vz - 1), b = Mf(vx, vz - 1), c = Mf(vx - 1, vz), d = Mf(vx, vz), n = a + b + c + d;
    if (n === 0 || n === 4) continue;
    if (n === 2 && ((a && b) || (c && d) || (a && c) || (b && d))) continue;
    let px = vx * S, pz = vz * S;
    if (n === 1) { px += a || c ? T : -T; pz += a || b ? T : -T; }
    const rm = roomAt(vx - (a || c ? 1 : 0), vz - (a || b ? 1 : 0));
    K('pillar', px, pz, 0, { post: true, sx: 0.5, sy: rm && (rm.kind === 'great' || rm.kind === 'forge') ? 1.5 : rm ? 1.2 : 1, wall: true, skin: !rm || rm.kind === 'mine' ? 'cave' : 'dwall' });
  }
  L.walls = walls;
  const fr = (r) => ({ x: r.x * S, z: r.z * S, w: r.w * S, h: r.h * S, kind: r.kind });
  L.rooms = rooms.map(fr);
  const F = fr(forge), St = fr(start), Gr = fr(great);
  L.bossDoor = { x: cx0 * S + 1.5, z: F.z + F.h + 0.2 };
  L.start = { x: St.x + St.w / 2, z: St.z + St.h - 2.5 };
  const lava = (x, z) => { const i = z * w + x; if (x < 0 || z < 0 || x >= w || z >= h || !L.cells[i]) return; L.cells[i] = 0; L.low[i] = 1; L.lava[i] = 1; };
  // torches on the dressed walls, lanterns in the tunnels
  for (const wl of rng.shuffle(walls.filter((q) => q.m === 'wall' && rng.chance(0.17)))) {
    const fx = Math.sin(wl.r), fz = Math.cos(wl.r);
    if (wl.room && wl.room.kind !== 'mine') {
      K('torch_mounted', wl.x + fx * (T + 0.05), wl.z + fz * (T + 0.05), wl.r, { y: 1.85 });
      L.lights.push({ x: wl.x + fx * 0.9, y: 2.2, z: wl.z + fz * 0.9, color: 0xff9040, intensity: 10, range: 9, flicker: 0.4 });
      L.props.push({ t: 'fx', fx: 'torch', x: wl.x + fx * (T + 0.25), y: 2.28, z: wl.z + fz * (T + 0.25) });
    } else {
      L.props.push({ t: 'lantern', x: wl.x + fx * (T + 0.2), z: wl.z + fz * (T + 0.2), r: wl.r, y: 1.9 });
      L.lights.push({ x: wl.x + fx * 0.8, y: 2.0, z: wl.z + fz * 0.8, color: 0xffb060, intensity: 7, range: 7, flicker: 0.2 });
    }
  }
  for (const wl of walls) if (wl.room && wl.room.kind !== 'mine' && wl.m === 'wall' && rng.chance(0.07)) { const fx = Math.sin(wl.r), fz = Math.cos(wl.r); K(rng.pick(['banner_patternA_red', 'banner_thin_red', 'banner_shield_red', 'banner_triple_red']), wl.x + fx * (T - 0.25), wl.z + fz * (T - 0.25), wl.r, { y: 0.4 }); }
  L.spots.shrines = []; L.spots.chests = [];
  L.spots.npcs = {};
  for (const r of L.rooms) {
    const cx = r.x + r.w / 2, cz = r.z + r.h / 2;
    if (r.kind === 'forge') {
      // the Deep Forge: an island of black slabs in a ring of lava, four bridges, the great anvil at its heart
      const ox = cx0 * S + 1.5, oz = cz + 0.5, r1 = 8.6, r2 = 11.2;
      for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) {
        const d = Math.hypot(x + 0.5 - ox, z + 0.5 - oz), a = Math.atan2(x + 0.5 - ox, z + 0.5 - oz);
        const bridge = Math.min(Math.abs(Math.sin(a)), Math.abs(Math.cos(a))) * d < 1.6;
        if (d > r1 && d < r2 + fbm(x * 0.3, z * 0.3, seed) * 1.2 && !bridge) lava(x, z);
      }
      L.props.push({ t: 'anvilGreat', x: ox, z: oz - 3.2 }); blockCircle(L, ox, oz - 3.2, 1.3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283 + 0.39, px = ox + Math.sin(a) * 12.6, pz = oz + Math.cos(a) * 11.4;
        if (pz > oz + 9 && Math.abs(px - ox) < 3) continue;
        K('pillar', px, pz, 0, { sx: 1.2, sy: 1.9, skin: 'dwall' }); blockCircle(L, px, pz, 0.9);
      }
      for (const [dx, dz] of [[-5.6, -4.8], [5.6, -4.8], [-5.6, 4.8], [5.6, 4.8]]) {
        L.props.push({ t: 'brazier', x: ox + dx, z: oz + dz }); blockCircle(L, ox + dx, oz + dz, 0.45);
        L.lights.push({ x: ox + dx, y: 1.6, z: oz + dz, color: 0xff7a30, intensity: 18, range: 11, flicker: 0.35 });
      }
      L.lights.push({ x: ox, y: 4, z: oz, color: 0xff5a20, intensity: 20, range: 22, flicker: 0.2 });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.785; L.lights.push({ x: ox + Math.sin(a) * 9.9, y: 0.7, z: oz + Math.cos(a) * 9.9, color: 0xff4a10, intensity: 14, range: 9, flicker: 0.3 }); }
      L.boss = { x: ox, z: oz };
      continue;
    }
    if (r.kind === 'start') {
      // the gate hall: stairs up to the mountain, the survivors' camp
      K('stairs', cx, r.z + r.h - 0.2, Math.PI, { block: false, skin: 'dwall' });
      L.exits.push({ x: cx, z: r.z + r.h - 1.6, to: 'pass', label: 'exit.pass' });
      L.spots.waypoint = { x: cx - 4, z: cz - 1 };
      L.lights.push({ x: cx - 4, y: 1.2, z: cz - 1, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
      L.props.push({ t: 'campfire', x: cx + 3.5, z: cz - 1.5 });
      L.lights.push({ x: cx + 3.5, y: 1.2, z: cz - 1.5, color: 0xff7a30, intensity: 26, range: 12, flicker: 0.35, fx: 'fire' });
      L.spots.npcs.brokka = { x: cx + 5.2, z: cz - 3.2, r: -0.8 };
      for (const [dx, dz, a] of [[6.5, 0.5, 2.2], [1.6, -3.5, -0.6]]) L.props.push({ t: 'bedroll', x: cx + dx, z: cz + dz, r: a });
      L.props.push({ t: 'crateS', x: cx + 7.4, z: cz - 3.6, r: 0.3 }, { t: 'barrelS', x: cx + 7.8, z: cz - 2.6, r: 1 });
      for (const sx of [-1, 1]) {
        L.props.push({ t: 'kingStatue', x: cx + sx * (r.w / 2 - 2), z: r.z + 2.4, s: 0.62 }); blockCircle(L, cx + sx * (r.w / 2 - 2), r.z + 2.4, 1.1);
        L.props.push({ t: 'brazier', x: cx + sx * (r.w / 2 - 1.3), z: r.z + r.h - 2.2 }); L.lights.push({ x: cx + sx * (r.w / 2 - 1.3), y: 1.6, z: r.z + r.h - 2.2, color: 0xff8a40, intensity: 16, range: 10, flicker: 0.35 });
      }
      continue;
    }
    if (r.kind === 'great') {
      // two rows of giant columns, chandeliers, the lava channel and its bridges
      const nCol = 5;
      for (let i = 0; i < nCol; i++) for (const fz of [0.24, 0.76]) {
        const px = r.x + 3 + (i + 0.5) * (r.w - 6) / nCol, pz = r.z + r.h * fz;
        K('pillar', px, pz, 0, { sx: 1.5, sy: 2.3, skin: 'dwall' }); blockCircle(L, px, pz, 0.95);
      }
      for (let i = 0; i < 3; i++) { const px = r.x + r.w * (0.25 + i * 0.25), pz = cz; L.props.push({ t: 'chandelier', x: px, z: pz - 4.5, y: 5.2 }); L.lights.push({ x: px, y: 4.6, z: pz - 4.5, color: 0xffb060, intensity: 14, range: 12, flicker: 0.15 }); }
      const lz = Math.floor(cz + 2), bx1 = cx0 * S + 1.5, bx2 = rng.chance(0.5) ? r.x + 6 : r.x + r.w - 6;
      for (let z = lz - 1; z <= lz + 1; z++) for (let x = r.x; x < r.x + r.w; x++) {
        if (Math.abs(x + 0.5 - bx1) < 2.1 || Math.abs(x + 0.5 - bx2) < 1.6) continue;
        lava(x, z + (fbm(x * 0.2, 1, seed) > 0.62 ? 1 : 0));
      }
      L.props.push({ t: 'bridge', x: bx1, z: lz + 0.5, len: 5, w: 4.2, dwarf: true }, { t: 'bridge', x: bx2, z: lz + 0.5, len: 5, w: 3.2, dwarf: true });
      for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) L.lights.push({ x: x + 0.5, y: 0.6, z: lz + 0.5, color: 0xff5010, intensity: 9, range: 7, flicker: 0.3 });
      for (const sx of [-1, 1]) { L.props.push({ t: 'kingStatue', x: cx + sx * 5, z: r.z + 1.8, s: 0.7 }); blockCircle(L, cx + sx * 5, r.z + 1.8, 1.2); }
      L.packs.push({ x: cx, z: cz - 4, n: rng.int(6, 8), tag: 'ashbound', elite: 'rare' });
      L.packs.push({ x: cx - 9, z: cz + 6, n: rng.int(4, 6), tag: 'hounds', elite: rng.chance(0.4) ? 'champion' : null });
      L.packs.push({ x: cx + 9, z: cz + 6, n: rng.int(4, 6), tag: 'deep', elite: null });
      continue;
    }
    if (r.kind === 'ante') {
      L.props.push({ t: 'irongate', x: cx, z: r.z + 0.4, s: 1 });
      for (const sx of [-1, 1]) { L.props.push({ t: 'kingStatue', x: cx + sx * (r.w / 2 - 1.5), z: r.z + 2, s: 0.55 }); blockCircle(L, cx + sx * (r.w / 2 - 1.5), r.z + 2, 0.9); }
      L.packs.push({ x: cx, z: cz, n: rng.int(5, 7), tag: 'ashbound', elite: 'rare' });
      continue;
    }
    const big = r.w >= 12 && r.h >= 12;
    if (r.kind === 'mine') {
      // a worked-out gallery: rails, a cart, timber props, glowing ore in the rock
      const along = r.w >= r.h;
      L.props.push({ t: 'rails', x: cx, z: cz, r: along ? Math.PI / 2 : 0, len: (along ? r.w : r.h) - 1 });
      L.props.push({ t: 'cart', x: cx + (along ? rng.range(-2, 2) : 0), z: cz + (along ? 0 : rng.range(-2, 2)), r: along ? Math.PI / 2 : 0 });
      blockCircle(L, cx, cz, 0.6);
      for (let i = 0; i < rng.int(3, 6); i++) { const px = r.x + rng.range(0.8, r.w - 0.8), pz = r.z + rng.range(0.8, r.h - 0.8); L.props.push({ t: 'ore', x: px, z: pz, r: rng.next() * 6, s: rng.range(0.6, 1.2) }); if (i % 2 === 0) L.lights.push({ x: px, y: 0.7, z: pz, color: 0x40c8ff, intensity: 6, range: 6, flicker: 0.1 }); }
      for (let i = 0; i < rng.int(2, 4); i++) L.props.push({ t: 'timber', x: r.x + rng.range(1, r.w - 1), z: r.z + 0.9, r: 0 });
      if (rng.chance(0.4)) L.props.push({ t: 'ladder', x: r.x + 1.2, z: r.z + 0.7, r: 0 });
      for (let i = 0; i < rng.int(2, 5); i++) L.props.push({ t: 'rubble', x: r.x + rng.range(1, r.w - 1), z: r.z + rng.range(1, r.h - 1), r: rng.next() * 6, s: rng.range(0.6, 1.1) });
      if (rng.chance(0.35)) L.spots.chests.push({ x: cx + rng.range(-2, 2), z: r.z + 1.8, rare: rng.chance(0.25) });
      L.packs.push({ x: cx, z: cz, n: rng.int(4, 7) + (big ? 2 : 0), tag: rng.weighted([['mine', 3], ['worms', 1.5], ['bats', 1.5]]), elite: rng.chance(0.25) ? rng.weighted([['champion', 2], ['rare', 1]]) : null });
      continue;
    }
    if (r.kind === 'smithy') {
      // a forge room: hearth, anvils, racks, a pool of lava fed from below
      L.props.push({ t: 'forge', x: cx, z: r.z + 1.5, r: 0 }); blockCircle(L, cx, r.z + 1.5, 1.5);
      L.lights.push({ x: cx, y: 1.2, z: r.z + 2.2, color: 0xff6020, intensity: 20, range: 10, flicker: 0.45 });
      for (let i = 0; i < 2; i++) { const px = cx + (i ? 2.4 : -2.4), pz = cz + 0.5; L.props.push({ t: 'anvil', x: px, z: pz }); blockCircle(L, px, pz, 0.5); }
      L.props.push({ t: 'kit', kit: 'town', m: 'weaponrack', x: r.x + 1.2, z: cz, r: Math.PI / 2 });
      const px = r.x + r.w - 2.5, pz = r.z + r.h - 2.5;
      for (let z = Math.floor(pz - 2); z <= pz + 2; z++) for (let x = Math.floor(px - 2); x <= px + 2; x++) if (Math.hypot(x + 0.5 - px, z + 0.5 - pz) < 1.9) lava(x, z);
      L.lights.push({ x: px, y: 0.6, z: pz, color: 0xff5010, intensity: 12, range: 8, flicker: 0.3 });
      L.packs.push({ x: cx, z: cz, n: rng.int(4, 6), tag: rng.weighted([['ashbound', 3], ['hounds', 2], ['deep', 1]]), elite: rng.chance(0.3) ? 'champion' : null });
      if (rng.chance(0.3)) L.spots.chests.push({ x: r.x + 1.6, z: r.z + r.h - 1.6, rare: rng.chance(0.3) });
      continue;
    }
    if (r.kind === 'tomb') {
      // the honoured dead of Deepstone, who do not rest
      const n = Math.max(1, Math.floor((r.w - 2) / 3.2));
      for (let i = 0; i < n; i++) { const px = r.x + 1.8 + i * 3.2 + 0.2; for (const pz of [r.z + 2.2, r.z + r.h - 2.4]) { if (pz > r.z + r.h - 2 || rng.chance(0.2)) continue; L.props.push({ t: 'sarcophagus', x: px, z: pz, r: 0, open: rng.chance(0.35) }); blockCircle(L, px, pz, 0.8); blockCircle(L, px, pz + 0.7, 0.6); } }
      L.props.push({ t: 'kingStatue', x: cx, z: r.z + 1.2, s: 0.5 });
      for (let i = 0; i < rng.int(1, 3); i++) L.props.push({ t: 'candlestick', x: r.x + rng.range(1.2, r.w - 1.2), z: r.z + rng.range(1.5, r.h - 1.2), r: rng.next() * 6, n: rng.int(2, 3) });
      L.lights.push({ x: cx, y: 1, z: cz, color: 0xffb060, intensity: 7, range: 8, flicker: 0.25 });
      for (let i = 0; i < rng.int(2, 5); i++) KG(rng.pick(['bone_A', 'bone_B', 'bone_C', 'skull', 'ribcage']), r.x + rng.range(0.8, r.w - 0.8), r.z + rng.range(0.8, r.h - 0.8), rng.next() * 6);
      if (rng.chance(0.5)) L.spots.chests.push({ x: cx, z: cz + 1, rare: rng.chance(0.4) });
      L.packs.push({ x: cx, z: cz, n: rng.int(4, 6), tag: 'deadDwarves', elite: rng.chance(0.3) ? 'rare' : null });
      continue;
    }
    // pillared halls and store rooms
    if (r.kind === 'hall' || big) for (const fx of [0.3, 0.7]) for (const fz of [0.3, 0.7]) { const px = r.x + r.w * fx, pz = r.z + r.h * fz; K('pillar', px, pz, 0, { sx: 0.9, sy: 1.25, skin: 'dwall' }); blockCircle(L, px, pz, 0.6); }
    if (r.kind === 'store') for (let i = 0; i < rng.int(4, 8); i++) { const corner = rng.int(0, 3), px = corner % 2 ? r.x + r.w - 0.9 - rng.next() * 2 : r.x + 0.9 + rng.next() * 2, pz = corner > 1 ? r.z + r.h - 0.9 - rng.next() * 2 : r.z + 1.2 + rng.next() * 2; L.props.push({ t: rng.pick(['barrel', 'crate', 'crate']), x: px, z: pz, breakable: true, s: rng.range(0.85, 1.05) }); }
    if (rng.chance(0.6)) { const px = r.x + 1.3, pz = r.z + r.h - 1.3; L.props.push({ t: 'brazier', x: px, z: pz }); L.lights.push({ x: px, y: 1.6, z: pz, color: 0xff8a40, intensity: 14, range: 9, flicker: 0.35 }); blockCircle(L, px, pz, 0.4); }
    if (rng.chance(r.kind === 'store' ? 0.7 : 0.3)) L.spots.chests.push({ x: cx, z: cz, rare: rng.chance(0.3) });
    if (rng.chance(0.25)) L.spots.shrines.push({ x: cx + rng.range(-2, 2), z: cz + rng.range(-1, 1) });
    L.packs.push({ x: cx, z: cz, n: rng.int(4, 6) + (big ? 2 : 0), tag: rng.weighted([['deep', 3], ['ashbound', 2], ['hounds', 1]]), elite: rng.chance(0.28) ? rng.weighted([['champion', 2], ['rare', 1]]) : null });
  }
  // stragglers in the tunnels
  for (let i = 0; i < 8; i++) {
    const mx = rng.int(1, MW - 2), mz = rng.int(13, MH - 6);
    if (Mf(mx, mz) && !roomAt(mx, mz)) L.packs.push({ x: mx * S + 1.5, z: mz * S + 1.5, n: rng.int(2, 4), tag: rng.weighted([['bats', 2], ['mine', 1], ['deep', 1]]), elite: null });
  }
  // lava breathes: embers over every channel
  for (let z = 0; z < h; z += 3) for (let x = 0; x < w; x += 3) if (L.lava[z * w + x]) L.props.push({ t: 'fx', fx: 'lava', x: x + 0.5, y: 0, z: z + 0.5 });
  L.lights.push({ x: L.bossDoor.x, y: 2.4, z: L.bossDoor.z + 0.8, color: 0xff7030, intensity: 10, range: 8, flicker: 0.3 });
  L.dist = distField(L, 3);
  return L;
}
