// Level layouts as plain data. Visuals are built from these in build.js, gameplay content in zones.js.
import { RNG, clamp, fbm, angleDiff } from '../core/util.js';

export function base(w, h) {
  return { w, h, cells: new Uint8Array(w * h), paint: new Float32Array(w * h), props: [], lights: [], packs: [], spots: {}, exits: [], rooms: [] };
}
export function carveCircle(L, cx, cz, r, paint = 0) {
  const { w, h, cells } = L;
  for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    if (x < 2 || z < 2 || x >= w - 2 || z >= h - 2) continue;
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
    if (d > r) continue;
    const i = z * w + x;
    cells[i] = 1;
    if (paint) L.paint[i] = Math.max(L.paint[i], paint * clamp((r - d) / Math.max(0.8, r * 0.6), 0, 1));
  }
}
export function carveLine(L, x0, z0, x1, z1, r, paint = 0) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0));
  for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); carveCircle(L, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, r, paint); }
}
export function smoothCells(L, passes = 2) {
  const { w, h } = L;
  for (let p = 0; p < passes; p++) {
    const c = L.cells.slice();
    for (let z = 2; z < h - 2; z++) for (let x = 2; x < w - 2; x++) {
      let n = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && c[(z + dz) * w + x + dx]) n++;
      const i = z * w + x;
      if (!c[i] && n >= 6) L.cells[i] = 1;
      else if (c[i] && n <= 2) L.cells[i] = 0;
    }
  }
}
// distance (in cells) from every solid cell to the nearest floor, capped
export function distField(L, cap = 10) {
  const { w, h, cells } = L, d = new Uint8Array(w * h).fill(255), q = [];
  for (let i = 0; i < w * h; i++) if (cells[i]) { d[i] = 0; q.push(i); }
  for (let head = 0; head < q.length; head++) {
    const i = q[head], x = i % w, z = (i - x) / w;
    if (d[i] >= cap) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const n = nz * w + nx; if (d[n] > d[i] + 1) { d[n] = d[i] + 1; q.push(n); }
    }
  }
  return d;
}
export const floorAt = (L, x, z) => x >= 0 && z >= 0 && x < L.w && z < L.h && L.cells[Math.floor(z) * L.w + Math.floor(x)] === 1;
export function blockCircle(L, cx, cz, r) {
  for (let z = Math.floor(cz - r); z <= Math.floor(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++)
    if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= r && x >= 0 && z >= 0 && x < L.w && z < L.h) L.cells[z * L.w + x] = 0;
}

// ======================= FOREST: Whisperwood =======================
export function genForest(seed, o = {}) {
  const rng = RNG(seed);
  const w = o.w || 96, h = o.h || 150;
  const L = base(w, h);
  L.type = 'forest'; L.seed = seed;
  // the trail winds north from the road to the old barrow
  let x = w / 2 + rng.range(-8, 8), z = h - 9, ang = Math.PI;
  const end = { x: w / 2 + rng.range(-14, 14), z: 18 };
  const trail = [];
  while (z > end.z + 2) {
    const want = Math.atan2(end.x - x, end.z - z);
    ang += angleDiff(ang, want) * 0.07 + rng.range(-0.32, 0.32);
    if (Math.cos(ang) > -0.25) ang += angleDiff(ang, Math.PI) * 0.3;
    x = clamp(x + Math.sin(ang), 10, w - 10); z += Math.cos(ang);
    trail.push({ x, z });
    const r = 2.8 + fbm(x * 0.07, z * 0.07, seed) * 3.2;
    carveCircle(L, x, z, r);
    carveCircle(L, x, z, 1.6, 1);
  }
  L.trail = trail;
  carveCircle(L, trail[0].x, h - 7, 6.5);
  L.start = { x: trail[0].x, z: h - 8 };
  // clearings branch off the trail
  const kinds = rng.shuffle(['camp', 'ruin', 'nest', 'grove', 'wolves', 'camp', 'ruin', 'nest', 'grove', 'troll']);
  const clearings = [];
  let k = 0;
  for (let i = 22; i < trail.length - 22; i += rng.int(11, 16)) {
    const t = trail[i], side = rng.sign();
    const a = Math.atan2(trail[i + 1].x - t.x, trail[i + 1].z - t.z) + side * Math.PI / 2 + rng.range(-0.5, 0.5);
    const dd = rng.range(8, 15), cx = clamp(t.x + Math.sin(a) * dd, 12, w - 12), cz = clamp(t.z + Math.cos(a) * dd, 12, h - 12);
    const r = rng.range(5.5, 8.5);
    carveLine(L, t.x, t.z, cx, cz, 2.4, 0.6);
    carveCircle(L, cx, cz, r);
    clearings.push({ x: cx, z: cz, r, kind: kinds[k++ % kinds.length], trailIdx: i });
  }
  L.clearings = clearings;
  // the Weaver's hollow, and the barrow door beyond it
  const bx = end.x, bz = end.z;
  carveCircle(L, bx, bz, 13.5);
  carveLine(L, trail[trail.length - 1].x, trail[trail.length - 1].z, bx, bz, 3.5, 1);
  L.boss = { x: bx, z: bz };
  smoothCells(L, 2);
  // keep the frame solid
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) if (xx < 3 || zz < 3 || xx >= w - 3 || zz >= h - 3) L.cells[zz * w + xx] = 0;
  L.barrowDoor = { x: bx, z: bz - 12.5 };
  carveLine(L, bx, bz, bx, bz - 12.5, 2.2, 0.8);

  // ---- dressing ----
  const D = distField(L, 9);
  L.dist = D;
  for (let zz = 0; zz < h; zz++) for (let xx = 0; xx < w; xx++) {
    const i = zz * w + xx, d = D[i];
    if (d === 0) {
      // undergrowth near edges, stones on the floor
      const edge = (D[i - 1] === 1 || D[i + 1] === 1 || D[i - w] === 1 || D[i + w] === 1);
      if (edge && rng.chance(0.3)) L.props.push({ t: 'bush', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.6, 1.1) });
      if (rng.chance(0.012)) L.props.push({ t: 'stone', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.25, 0.5) });
      if (L.paint[i] < 0.2 && rng.chance(edge ? 0.02 : 0.005)) L.props.push({ t: 'branches', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.25) });
      if (L.paint[i] < 0.35 && rng.chance(0.42)) L.props.push({ t: 'grass', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.7, 1.3) });
      continue;
    }
    if (d === 255) continue;
    const p = d === 1 ? 0.62 : d <= 3 ? 0.36 : d <= 6 ? 0.16 : 0.05;
    if (rng.chance(p)) {
      const tt = rng.weighted([['pine', 5], ['oak', 3], ['dead', d === 1 ? 1 : 0.4]]);
      L.props.push({ t: tt, x: xx + rng.range(0.2, 0.8), z: zz + rng.range(0.2, 0.8), r: rng.range(0, 6.28), s: rng.range(0.85, 1.35) * (d > 3 ? 1.2 : 1), d });
    } else if (d <= 2 && rng.chance(0.4)) L.props.push({ t: 'bush', x: xx + rng.next(), z: zz + rng.next(), r: rng.range(0, 6.28), s: rng.range(0.8, 1.4) });
    else if (d === 1 && rng.chance(0.05)) L.props.push({ t: 'rock', x: xx + 0.5, z: zz + 0.5, r: rng.range(0, 6.28), s: rng.range(0.8, 1.6) });
    else if (d <= 2 && rng.chance(0.025)) L.props.push({ t: 'stump', x: xx + 0.5, z: zz + 0.5, r: rng.range(0, 6.28), s: rng.range(0.8, 1.15) });
  }
  // glowing mushrooms in rings and patches
  for (let n = 0; n < 26; n++) {
    const t = rng.pick(trail), a = rng.range(0, 6.28), dd = rng.range(3, 7);
    const mx = t.x + Math.sin(a) * dd, mz = t.z + Math.cos(a) * dd;
    if (!floorAt(L, mx, mz)) continue;
    const c = rng.int(3, 7);
    for (let m = 0; m < c; m++) L.props.push({ t: 'shroom', x: mx + rng.range(-0.9, 0.9), z: mz + rng.range(-0.9, 0.9), r: rng.range(0, 6.28), s: rng.range(0.6, 1.3) });
    if (n % 3 === 0) L.lights.push({ x: mx, y: 0.6, z: mz, color: 0x40c8ff, intensity: 5, range: 6, flicker: 0.1 });
  }
  // fallen logs along the trail
  for (let n = 0; n < 14; n++) {
    const t = rng.pick(trail), a = rng.range(0, 6.28), dd = rng.range(3.5, 6);
    const lx = t.x + Math.sin(a) * dd, lz = t.z + Math.cos(a) * dd;
    if (floorAt(L, lx, lz) && D[Math.floor(lz) * w + Math.floor(lx)] === 0) L.props.push({ t: 'log', x: lx, z: lz, r: rng.range(0, 3.14), s: rng.range(0.8, 1.2) });
  }
  // clearings
  for (const c of clearings) {
    if (c.kind === 'camp') {
      L.props.push({ t: 'campfire', x: c.x, z: c.z });
      L.lights.push({ x: c.x, y: 1.2, z: c.z, color: 0xff7a30, intensity: 26, range: 13, flicker: 0.35, fx: 'fire' });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.28 + rng.next(); L.props.push({ t: 'tent', x: c.x + Math.sin(a) * (c.r - 2.2), z: c.z + Math.cos(a) * (c.r - 2.2), r: a + Math.PI, s: rng.range(0.9, 1.2) }); blockCircle(L, c.x + Math.sin(a) * (c.r - 2.2), c.z + Math.cos(a) * (c.r - 2.2), 1.1); }
      for (let i = 0; i < 4; i++) L.props.push({ t: 'bones', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.range(0, 6.28), s: 1 });
      L.props.push({ t: 'crate', x: c.x + rng.range(-3, 3), z: c.z + rng.range(2, 3.5), r: rng.next(), s: 1, breakable: true });
      { const a = rng.range(0, 6.28), bx = c.x + Math.sin(a) * (c.r - 1.2), bz = c.z + Math.cos(a) * (c.r - 1.2); L.props.push({ t: 'barrelS', x: bx, z: bz, r: rng.next() * 6 }, { t: 'crateS', x: bx + 0.9, z: bz + 0.3, r: rng.next() * 6 }); blockCircle(L, bx + 0.4, bz + 0.1, 0.9); }
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 8), tag: 'goblins', elite: rng.chance(0.5) ? 'champion' : null });
    } else if (c.kind === 'ruin') {
      const n = rng.int(5, 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28, px = c.x + Math.sin(a) * (c.r - 1.6), pz = c.z + Math.cos(a) * (c.r - 1.6);
        L.props.push({ t: rng.chance(0.3) ? 'pillarBroken' : 'pillar', x: px, z: pz, r: rng.next() * 6, s: rng.range(0.9, 1.2), h: rng.range(0.4, 1) });
        blockCircle(L, px, pz, 0.6);
      }
      L.props.push({ t: 'statue', x: c.x, z: c.z - 0.5 });
      blockCircle(L, c.x, c.z - 0.5, 0.9);
      L.spots.shrines = L.spots.shrines || [];
      L.spots.shrines.push({ x: c.x, z: c.z + 2.2 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(4, 6), tag: 'mixed', elite: rng.chance(0.4) ? 'rare' : null });
    } else if (c.kind === 'nest') {
      for (let i = 0; i < 6; i++) L.props.push({ t: 'web', x: c.x + rng.range(-c.r, c.r) * 0.7, z: c.z + rng.range(-c.r, c.r) * 0.7, r: rng.range(0, 6.28), s: rng.range(1.5, 3) });
      for (let i = 0; i < 5; i++) L.props.push({ t: 'eggs', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.next() * 6, s: rng.range(0.7, 1.1) });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 9), tag: 'spiders', elite: rng.chance(0.4) ? 'champion' : null });
    } else if (c.kind === 'grove') {
      for (let i = 0; i < 14; i++) { const a = rng.range(0, 6.28), dd = rng.range(1, c.r - 1); L.props.push({ t: 'shroom', x: c.x + Math.sin(a) * dd, z: c.z + Math.cos(a) * dd, r: rng.next() * 6, s: rng.range(0.8, 1.8) }); }
      L.lights.push({ x: c.x, y: 1, z: c.z, color: 0x50d8ff, intensity: 10, range: 9, flicker: 0.1 });
      L.spots.chests = L.spots.chests || [];
      L.spots.chests.push({ x: c.x, z: c.z, rare: true });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(3, 5), tag: 'wolves', elite: null });
    } else if (c.kind === 'wolves') {
      for (let i = 0; i < 7; i++) L.props.push({ t: 'bones', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.range(0, 6.28), s: 1.2 });
      L.packs.push({ x: c.x, z: c.z, n: rng.int(5, 7), tag: 'wolves', elite: rng.chance(0.6) ? 'champion' : null });
    } else if (c.kind === 'troll') {
      for (let i = 0; i < 6; i++) { const s = rng.range(1.2, 2), x = c.x + Math.sin(i) * (c.r - 1), z = c.z + Math.cos(i) * (c.r - 1); L.props.push({ t: 'rock', x, z, r: i, s }); blockCircle(L, x, z, 0.45 * s); }
      for (let i = 0; i < 8; i++) L.props.push({ t: 'bones', x: c.x + rng.range(-3, 3), z: c.z + rng.range(-3, 3), r: rng.range(0, 6.28), s: 1.3 });
      L.packs.push({ x: c.x, z: c.z, n: 1, tag: 'troll', elite: 'rare' });
    }
  }
  // packs along the trail
  for (let i = 26; i < trail.length - 14; i += rng.int(9, 14)) {
    const t = trail[i];
    L.packs.push({ x: t.x + rng.range(-2, 2), z: t.z + rng.range(-2, 2), n: rng.int(3, 6), tag: rng.weighted([['goblins', 4], ['wolves', 3], ['spiders', 2], ['mixed', 2]]), elite: rng.chance(0.14) ? 'champion' : null });
  }
  // the hollow: webs, egg sacs, bones
  for (let i = 0; i < 12; i++) { const a = rng.range(0, 6.28), dd = rng.range(5, 12); L.props.push({ t: 'web', x: bx + Math.sin(a) * dd, z: bz + Math.cos(a) * dd, r: rng.range(0, 6.28), s: rng.range(2, 4) }); }
  for (let i = 0; i < 10; i++) { const a = rng.range(0, 6.28), dd = rng.range(7, 12); L.props.push({ t: 'eggs', x: bx + Math.sin(a) * dd, z: bz + Math.cos(a) * dd, r: rng.next() * 6, s: rng.range(1, 1.6) }); }
  for (let i = 0; i < 12; i++) L.props.push({ t: 'bones', x: bx + rng.range(-8, 8), z: bz + rng.range(-8, 8), r: rng.range(0, 6.28), s: 1.2 });
  L.props.push({ t: 'barrowDoor', x: L.barrowDoor.x, z: L.barrowDoor.z - 0.8 });
  L.lights.push({ x: L.barrowDoor.x, y: 2.2, z: L.barrowDoor.z, color: 0x6ab0ff, intensity: 12, range: 9, flicker: 0.15 });
  L.lights.push({ x: bx, y: 3, z: bz, color: 0x9a60ff, intensity: 8, range: 16, flicker: 0.05 });
  L.exits.push({ x: L.barrowDoor.x, z: L.barrowDoor.z, to: 'crypt', label: 'exit.barrow', locked: 'weaver' });
  L.exits.push({ x: L.start.x, z: h - 4.5, to: 'town', label: 'exit.town' });
  L.spots.waypoint = { x: L.start.x + 3.2, z: L.start.z - 0.5 };
  L.lights.push({ x: L.spots.waypoint.x, y: 1.2, z: L.spots.waypoint.z, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
  return L;
}

// ======================= CRYPT: Barrow of Kings =======================
// Built on a 3x3-cell macro grid so the modular KayKit walls (4 m, scaled to 3) line up.
export function genCrypt(seed, o = {}) {
  const rng = RNG(seed);
  const S = 3, MW = o.mw || 26, MH = o.mh || 34, w = MW * S, h = MH * S;
  const L = base(w, h);
  L.type = 'crypt'; L.seed = seed; L.macro = S;
  const M = new Uint8Array(MW * MH);
  const rooms = [];
  const fits = (r) => r.x >= 1 && r.z >= 1 && r.x + r.w <= MW - 1 && r.z + r.h <= MH - 1 && !rooms.some((q) => r.x < q.x + q.w + 1 && r.x + r.w + 1 > q.x && r.z < q.z + q.h + 1 && r.z + r.h + 1 > q.z);
  const cx0 = Math.floor(MW / 2);
  const boss = { x: cx0 - 4, z: 1, w: 8, h: 7, kind: 'boss' };
  const ante = { x: cx0 - 2, z: 10, w: 4, h: 3, kind: 'ante' };
  const start = { x: cx0 - 2, z: MH - 5, w: 4, h: 3, kind: 'start' };
  rooms.push(boss, ante, start);
  for (let tries = 0; tries < 500 && rooms.length < (o.rooms || 15); tries++) {
    const r = { x: rng.int(1, MW - 6), z: rng.int(14, MH - 9), w: rng.int(3, 5), h: rng.int(3, 5), kind: 'room' };
    if (fits(r)) rooms.push(r);
  }
  for (const r of rooms) for (let z = r.z; z < r.z + r.h; z++) for (let x = r.x; x < r.x + r.w; x++) M[z * MW + x] = 1;
  const ctr = (r) => ({ x: Math.floor(r.x + r.w / 2), z: Math.floor(r.z + r.h / 2) });
  const dig = (x0, z0, x1, z1) => { for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) M[z * MW + x] = 1; };
  const normal = rooms.filter((r) => r !== boss);
  const inTree = [start], rest = normal.filter((r) => r !== start), edges = [];
  while (rest.length) {
    let best = null, bd = 1e9;
    for (const a of inTree) for (const b of rest) { const d = Math.abs(ctr(a).x - ctr(b).x) + Math.abs(ctr(a).z - ctr(b).z); if (d < bd) { bd = d; best = [a, b]; } }
    edges.push(best); inTree.push(best[1]); rest.splice(rest.indexOf(best[1]), 1);
  }
  for (let i = 0; i < 2; i++) { const a = rng.pick(normal), b = rng.pick(normal); if (a !== b && a !== ante && b !== ante) edges.push([a, b]); }
  for (const [a, b] of edges) {
    const A = ctr(a), B = ctr(b);
    if (rng.chance(0.5)) { dig(A.x, A.z, B.x, A.z); dig(B.x, A.z, B.x, B.z); } else { dig(A.x, A.z, A.x, B.z); dig(A.x, B.z, B.x, B.z); }
  }
  dig(cx0, boss.z + boss.h, cx0, ante.z); // the hall to the throne room
  // macro -> cells
  for (let mz = 0; mz < MH; mz++) for (let mx = 0; mx < MW; mx++) if (M[mz * MW + mx]) for (let dz = 0; dz < S; dz++) for (let dx = 0; dx < S; dx++) L.cells[(mz * S + dz) * w + mx * S + dx] = 1;
  const Mf = (x, z) => x >= 0 && z >= 0 && x < MW && z < MH && M[z * MW + x] === 1;
  const roomAt = (mx, mz) => rooms.find((r) => mx >= r.x && mx < r.x + r.w && mz >= r.z && mz < r.z + r.h);
  const K = (m, x, z, r = 0, extra = {}) => L.props.push(Object.assign({ t: 'kit', kit: 'dungeon', m, x, z, r }, extra));
  // skulls and ribcages at a believable size next to the scanned stone (the kit draws them large)
  const KG = (m, x, z, r = 0, extra = {}) => L.props.push(Object.assign({ t: 'kit', kit: 'grave', m, x, z, r }, m === 'skull' || m === 'ribcage' ? { s: 0.6 } : {}, extra));
  const T = 0.375; // half wall thickness after scaling
  // floors
  for (let mz = 0; mz < MH; mz++) for (let mx = 0; mx < MW; mx++) {
    if (!Mf(mx, mz)) continue;
    const room = roomAt(mx, mz);
    // the floor itself is the photoreal stone ground plane (build.js), so no floor tiles are laid
    void room;
  }
  // walls on every floor/solid edge, facing the floor
  const walls = [];
  const wallKind = (room) => room?.kind === 'boss' ? rng.weighted([['wall', 4], ['wall_arched', 2], ['wall_pillar', 1]]) : rng.weighted([['wall', 10], ['wall_cracked', 2], ['wall_shelves', room ? 1 : 0], ['wall_arched', 0.5], ['wall_pillar', 0.6]]);
  for (let mz = 0; mz < MH; mz++) for (let mx = 0; mx < MW; mx++) {
    if (!Mf(mx, mz)) continue;
    const room = roomAt(mx, mz);
    const add = (x, z, r, side) => { const m = wallKind(room); K(m, x, z, r, { wall: true, side }); walls.push({ x, z, r, m, room }); };
    if (!Mf(mx, mz - 1)) add(mx * S + 1.5, mz * S - T, 0, 'n');
    if (!Mf(mx, mz + 1)) add(mx * S + 1.5, (mz + 1) * S + T, Math.PI, 's');
    if (!Mf(mx - 1, mz)) add(mx * S - T, mz * S + 1.5, Math.PI / 2, 'w');
    if (!Mf(mx + 1, mz)) add((mx + 1) * S + T, mz * S + 1.5, -Math.PI / 2, 'e');
  }
  // posts where walls turn
  for (let vz = 0; vz <= MH; vz++) for (let vx = 0; vx <= MW; vx++) {
    const a = Mf(vx - 1, vz - 1), b = Mf(vx, vz - 1), c = Mf(vx - 1, vz), d = Mf(vx, vz), n = a + b + c + d;
    if (n === 0 || n === 4) continue;
    if (n === 2 && ((a && b) || (c && d) || (a && c) || (b && d))) continue;
    let px = vx * S, pz = vz * S;
    if (n === 1) { px += a || c ? T : -T; pz += a || b ? T : -T; }
    K('pillar', px, pz, 0, { post: true, sx: 0.5, sy: 1, wall: true });
  }
  L.walls = walls;
  // rooms in cells for dressing
  const fr = (r) => ({ x: r.x * S, z: r.z * S, w: r.w * S, h: r.h * S, kind: r.kind });
  L.rooms = rooms.map(fr);
  const B = fr(boss), A = fr(ante), St = fr(start);
  L.bossDoor = { x: cx0 * S + 1.5, z: B.z + B.h + 0.2 };
  L.boss = { x: cx0 * S + 1.5, z: B.z + 9 };
  L.start = { x: St.x + St.w / 2, z: St.z + St.h - 2.5 };
  const torchWalls = rng.shuffle(walls.filter((wl) => wl.m === 'wall' && rng.chance(0.18)));
  for (const wl of torchWalls) {
    const fx = Math.sin(wl.r), fz = Math.cos(wl.r);
    K('torch_mounted', wl.x + fx * (T + 0.05), wl.z + fz * (T + 0.05), wl.r, { y: 1.75 });
    L.lights.push({ x: wl.x + fx * 0.9, y: 2.1, z: wl.z + fz * 0.9, color: 0xff9040, intensity: 10, range: 9, flicker: 0.4 });
    L.props.push({ t: 'fx', fx: 'torch', x: wl.x + fx * (T + 0.25), y: 2.18, z: wl.z + fz * (T + 0.25) });
  }
  // banners on some room walls
  for (const wl of walls) if (wl.room && wl.m === 'wall' && rng.chance(0.08)) { const fx = Math.sin(wl.r), fz = Math.cos(wl.r); K(rng.pick(['banner_patternA_red', 'banner_thin_red', 'banner_shield_red', 'banner_triple_red']), wl.x + fx * (T - 0.25), wl.z + fz * (T - 0.25), wl.r, { y: 0.1 }); }

  for (const r of L.rooms) {
    const cx = r.x + r.w / 2, cz = r.z + r.h / 2;
    if (r.kind === 'boss') {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 6.283 + 0.31, px = cx + Math.sin(a) * 8.5, pz = cz + Math.cos(a) * 7;
        if (Math.abs(px - L.bossDoor.x) < 3 && pz > cz) continue;
        K('pillar', px, pz, 0, { sx: 0.85 }); blockCircle(L, px, pz, 0.7);
      }
      L.props.push({ t: 'throne', x: cx, z: r.z + 2.4 }); blockCircle(L, cx, r.z + 2.4, 1.6);
      for (const sx of [-1, 1]) {
        L.props.push({ t: 'brazier', x: cx + sx * 4.5, z: r.z + 3.2, blue: true });
        L.lights.push({ x: cx + sx * 4.5, y: 1.6, z: r.z + 3.2, color: 0x4aa8ff, intensity: 18, range: 12, flicker: 0.3 });
        L.props.push({ t: 'brazier', x: cx + sx * 9, z: cz + 4, blue: true });
        L.lights.push({ x: cx + sx * 9, y: 1.6, z: cz + 4, color: 0x4aa8ff, intensity: 14, range: 11, flicker: 0.3 });
        for (let k = 0; k < 3; k++) L.props.push({ t: 'candlestick', x: cx + sx * (2.5 + k * 0.9), z: r.z + 1.4 + rng.next() * 0.4, r: rng.next() * 6, n: 3 });
        KG('skull_candle', cx + sx * 6.8, r.z + 1.5, rng.next() * 6);
      }
      for (let i = 0; i < 10; i++) KG(rng.pick(['bone_A', 'bone_B', 'bone_C', 'skull', 'ribcage']), cx + rng.range(-9, 9), cz + rng.range(-5, 6), rng.next() * 6);
      continue;
    }
    if (r.kind === 'start') {
      K('stairs', cx, r.z + r.h - 0.2, Math.PI, { block: false });
      L.exits.push({ x: cx, z: r.z + r.h - 1.6, to: 'forest', label: 'exit.forest' });
      L.spots.waypoint = { x: cx - 3, z: cz - 1 };
      L.lights.push({ x: cx - 3, y: 1.2, z: cz - 1, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
      for (const sx of [-1, 1]) { L.props.push({ t: 'brazier', x: cx + sx * (r.w / 2 - 1.3), z: r.z + 1.4 }); L.lights.push({ x: cx + sx * (r.w / 2 - 1.3), y: 1.6, z: r.z + 1.4, color: 0xff8a40, intensity: 16, range: 10, flicker: 0.35 }); }
      continue;
    }
    const big = r.w >= 12 && r.h >= 12;
    if (big && rng.chance(0.8)) {
      for (const fx of [0.3, 0.7]) for (const fz of [0.3, 0.7]) { const px = r.x + r.w * fx, pz = r.z + r.h * fz; K('pillar', px, pz, 0, { sx: 0.7 }); blockCircle(L, px, pz, 0.55); }
    }
    // coffins against the north wall
    if (rng.chance(0.65)) {
      const n = Math.max(1, Math.floor((r.w - 2) / 3.2));
      for (let i = 0; i < n; i++) {
        const px = r.x + 1.6 + i * 3.2 + 0.4, pz = r.z + 1.4;
        if (rng.chance(0.25)) continue;
        KG(rng.chance(0.3) ? 'coffin_decorated' : 'coffin', px, pz, Math.PI, {});
        blockCircle(L, px, pz, 0.7); blockCircle(L, px, pz + 0.6, 0.6);
      }
    }
    for (let i = 0; i < rng.int(1, 3); i++) {
      const px = r.x + rng.range(1.2, r.w - 1.2), pz = r.z + rng.range(r.h * 0.45, r.h - 1.2);
      if (rng.chance(0.33)) KG('skull_candle', px, pz, rng.next() * 6);
      else L.props.push({ t: 'candlestick', x: px, z: pz, r: rng.next() * 6, n: rng.int(2, 3) });
      if (i === 0) L.lights.push({ x: px, y: 0.9, z: pz, color: 0xffb060, intensity: 7, range: 7, flicker: 0.25 });
    }
    if (rng.chance(0.55)) { const px = r.x + 1.3, pz = r.z + r.h - 1.3; L.props.push({ t: 'brazier', x: px, z: pz }); L.lights.push({ x: px, y: 1.6, z: pz, color: 0xff8a40, intensity: 14, range: 9, flicker: 0.35 }); blockCircle(L, px, pz, 0.4); }
    // breakables in the corners
    for (let i = 0; i < rng.int(1, 4); i++) {
      const corner = rng.int(0, 3), px = corner % 2 ? r.x + r.w - 0.9 - rng.next() : r.x + 0.9 + rng.next(), pz = corner > 1 ? r.z + r.h - 0.9 - rng.next() : r.z + 2.4 + rng.next();
      L.props.push({ t: rng.pick(['barrel', 'crate', 'urn', 'urn']), x: px, z: pz, breakable: true, s: rng.range(0.85, 1.05) });
    }
    for (let i = 0; i < rng.int(2, 6); i++) KG(rng.pick(['bone_A', 'bone_B', 'bone_C', 'skull', 'ribcage']), r.x + rng.range(0.8, r.w - 0.8), r.z + rng.range(0.8, r.h - 0.8), rng.next() * 6);
    if (rng.chance(0.4)) K(rng.pick(['rubble_large', 'rubble_half', 'sword_shield_broken', 'table_long_broken']), r.x + rng.range(1.5, r.w - 1.5), r.z + rng.range(2, r.h - 1.5), rng.next() * 6);
    if (rng.chance(0.35)) { L.spots.chests = L.spots.chests || []; L.spots.chests.push({ x: cx, z: cz, rare: rng.chance(0.3) }); }
    if (rng.chance(0.2)) { L.spots.shrines = L.spots.shrines || []; L.spots.shrines.push({ x: cx + rng.range(-2, 2), z: cz + rng.range(-1, 1) }); }
    if (r.kind === 'ante') {
      for (const sx of [-1, 1]) { L.props.push({ t: 'statue', x: cx + sx * (r.w / 2 - 1.5), z: r.z + 1.6 }); blockCircle(L, cx + sx * (r.w / 2 - 1.5), r.z + 1.6, 0.9); }
      L.packs.push({ x: cx, z: cz, n: rng.int(5, 7), tag: 'undead', elite: 'rare' });
      continue;
    }
    L.packs.push({ x: cx, z: cz, n: rng.int(3, 6) + (big ? 2 : 0), tag: rng.weighted([['undead', 5], ['wraiths', 2], ['spiders', 1], ['ash', 1.5]]), elite: rng.chance(0.28) ? rng.weighted([['champion', 2], ['rare', 1]]) : null });
  }
  // some corridors hold a few restless dead
  for (let i = 0; i < 6; i++) {
    const mx = rng.int(1, MW - 2), mz = rng.int(13, MH - 6);
    if (Mf(mx, mz) && !roomAt(mx, mz)) L.packs.push({ x: mx * S + 1.5, z: mz * S + 1.5, n: rng.int(2, 4), tag: 'undead', elite: null });
  }
  L.lights.push({ x: L.bossDoor.x, y: 2.4, z: L.bossDoor.z + 0.8, color: 0x4aa8ff, intensity: 10, range: 8, flicker: 0.2 });
  L.dist = distField(L, 3);
  return L;
}

// ======================= TOWN: Whitecliff =======================
export function genTown() {
  const w = 64, h = 70;
  const L = base(w, h);
  L.type = 'town'; L.seed = 7;
  const rng = RNG(77);
  const CX = 32, CZ = 38;
  // a walled village: an oval of open ground around the plaza, the beacon hill to the north
  for (let z = 4; z < h - 3; z++) for (let x = 3; x < w - 3; x++) {
    const nx = (x - CX) / 22, nz = (z - CZ) / (z < CZ ? 27 : 23);
    if (nx * nx + nz * nz < 1 + fbm(x * 0.12, z * 0.12, 3) * 0.18) L.cells[z * w + x] = 1;
  }
  carveLine(L, CX, h - 3, CX, CZ, 2.2, 1);
  carveLine(L, CX, CZ, CX, 18, 1.8, 1);
  carveCircle(L, CX, CZ, 5.5, 1);
  carveLine(L, CX, CZ, 20, 36, 1.4, 0.9);
  carveLine(L, CX, CZ, 44, 36, 1.4, 0.9);
  carveCircle(L, CX, 18, 3.5, 0.7);
  // the old mountain road leaves past the beacon hill, north-east toward the Giants' Stair
  carveLine(L, CX + 3, 18, 44, 15, 1.5, 0.9);
  carveLine(L, 44, 15, 55, 8.5, 1.5, 0.9);
  const Dout = distField(L, 12); // the village edge, before anything is built inside
  L.start = { x: CX, z: CZ + 6 };
  L.spots.waypoint = { x: CX + 3.8, z: 51 };
  L.lights.push({ x: CX + 3.8, y: 1.2, z: 51, color: 0x60a8ff, intensity: 10, range: 8, flicker: 0.1 });
  L.exits.push({ x: CX, z: h - 5, to: 'forest', label: 'exit.forest' });
  L.exits.push({ x: 55, z: 8.5, to: 'pass', label: 'exit.pass', locked: 'act1' });
  L.props.push({ t: 'lamp', x: 52.5, z: 11.6 });
  L.lights.push({ x: 52.5, y: 2.2, z: 11.6, color: 0xffb060, intensity: 9, range: 9, flicker: 0.2 });
  // the beacon on its hill
  L.beacon = { x: CX, z: 12 };
  L.props.push({ t: 'beacon', x: CX, z: 12 });
  blockCircle(L, CX, 12, 3.2);
  L.lights.push({ x: CX, y: 9, z: 12, color: 0xff8a30, intensity: 120, range: 34, flicker: 0.25, fx: 'beacon', big: true });
  // two tall timber houses by the beacon road
  for (const [x, z, hw, hd, r] of [[21, 23, 7, 5, 0.15], [43, 23, 7, 5, -0.15]]) {
    L.props.push({ t: 'house', x, z, w: hw, d: hd, r, roof: rng.pick([0x9a9eb0, 0xb09a88, 0x8aa0a0]) });
    for (let zz = Math.floor(z - hd / 2); zz < Math.ceil(z + hd / 2); zz++) for (let xx = Math.floor(x - hw / 2); xx < Math.ceil(x + hw / 2); xx++) L.cells[zz * w + xx] = 0;
    L.lights.push({ x, y: 1.4, z: z + hd / 2 + 0.6, color: 0xffa050, intensity: 6, range: 6, flicker: 0.15 });
  }
  // KayKit buildings around the plaza
  const kitB = [['building_tavern_blue', 17, 44, 1.3, 2.8], ['building_home_B_yellow', 47, 44, -1.3, 2.3], ['building_home_A_red', 22, 53, 0.4, 2.0], ['building_market_red', 46, 57, -0.5, 2.0], ['building_home_A_green', 13, 33, 1.5, 2.0], ['building_home_B_yellow', 51, 33, -1.5, 2.0], ['building_tower_A_red', 53, 49, -0.8, 1.8]];
  for (const [m, x, z, r, rad] of kitB) { L.props.push({ t: 'kit', kit: 'town', m, x, z, r }); blockCircle(L, x, z, rad); L.lights.push({ x: x + Math.sin(r) * (rad + 0.6), y: 1.4, z: z + Math.cos(r) * (rad + 0.6), color: 0xffa050, intensity: 6, range: 6, flicker: 0.15 }); }
  // the forge, the healer's tent, the well, the stash
  L.props.push({ t: 'forge', x: 21.5, z: 32.5, r: 0.5 }); blockCircle(L, 21, 32, 1.5);
  L.lights.push({ x: 21.4, y: 1.2, z: 32.6, color: 0xff6020, intensity: 22, range: 9, flicker: 0.45 });
  L.props.push({ t: 'anvil', x: 23.6, z: 35 }); blockCircle(L, 23.6, 35, 0.5);
  L.props.push({ t: 'kit', kit: 'town', m: 'weaponrack', x: 19.5, z: 36, r: 1.2 });
  L.props.push({ t: 'healtent', x: 43, z: 32, r: -0.4 }); blockCircle(L, 43.4, 31.2, 2.0);
  L.lights.push({ x: 42, y: 1.5, z: 34.2, color: 0x90ffc0, intensity: 7, range: 7, flicker: 0.1 });
  L.props.push({ t: 'well', x: CX, z: CZ }); blockCircle(L, CX, CZ, 1.3);
  L.props.push({ t: 'stash', x: 36, z: 41.5, r: -0.4 });
  for (const [x, z] of [[27.5, 44], [36.5, 44], [27, 31], [37, 31], [CX - 4.3, 24], [27, 51], [37, 57], [CX - 2.5, 63]]) {
    L.props.push({ t: 'lamp', x, z });
    L.lights.push({ x, y: 2.2, z, color: 0xffb060, intensity: 9, range: 9, flicker: 0.2 });
  }
  for (const [x, z, r] of [[26.5, 40, 0.3], [38, 39.5, -0.2]]) { L.props.push({ t: 'stall', x, z, r }); blockCircle(L, x, z, 1.1); }
  for (const [m, x, z, r] of [['wheelbarrow', 26, 48, 0.8], ['resource_lumber', 17, 37.5, 0.3], ['sack', 42.5, 54, 0.4], ['tent', 46, 40, -0.8], ['target', 12, 40, 1.2]]) L.props.push({ t: 'kit', kit: 'town', m, x, z, r });
  for (const [t, x, z, r] of [['bucket', 33.8, 40, 0], ['bucket', CX + 1.5, CZ + 1.1, 0.7], ['crateS', 41.6, 53.2, 0.2], ['crateS', 41.9, 53.9, 1.7], ['barrelS', 47.5, 52.5, 0], ['barrelS', 48.3, 53.1, 2], ['crateS', 24, 49.5, 1], ['barrelS', 20.6, 47.4, 0.5], ['barrelS', 21.4, 48.1, 2.2], ['bucket', 22.1, 47.2, 1]]) { L.props.push({ t, x, z, r }); blockCircle(L, x, z, t === 'bucket' ? 0.25 : 0.45); }
  // a fire pit where the villagers warm themselves
  L.props.push({ t: 'firepit', x: 40, z: 50 }); blockCircle(L, 40, 50, 0.9);
  L.lights.push({ x: 40, y: 1.0, z: 50, color: 0xff7a30, intensity: 20, range: 11, flicker: 0.35, fx: 'fire' });
  for (let i = 0; i < 14; i++) { const a = rng.range(0, 6.28), d = rng.range(8, 18), x = CX + Math.sin(a) * d * 1.1, z = CZ + Math.cos(a) * d; if (L.cells[Math.floor(z) * w + Math.floor(x)] && Math.abs(x - CX) > 3) L.props.push({ t: rng.pick(['barrel', 'crate', 'barrel']), x, z, r: rng.next() * 6, s: rng.range(0.9, 1.1), breakable: true }); }
  // palisade along the edge, trees and rocks beyond it, the gate in the south
  const D = Dout;
  L.dist = distField(L, 12);
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
    const i = z * w + x, d = D[i];
    if (d === 0 && !L.cells[i]) continue;
    if (d === 1 && z > 22 && !(Math.abs(x - CX) < 3 && z > h - 9)) L.props.push({ t: 'stake', x: x + 0.5, z: z + 0.5, r: rng.next() * 6, s: rng.range(0.9, 1.15) });
    else if (d >= 2 && d <= 11 && rng.chance(d < 4 ? 0.3 : 0.45)) L.props.push({ t: z < 24 ? rng.pick(['rock', 'pine', 'pine']) : rng.pick(['pine', 'pine', 'oak']), x: x + rng.next(), z: z + rng.next(), r: rng.next() * 6, s: rng.range(1, 1.5), d });
    else if (d === 0 && L.paint[i] < 0.3 && rng.chance(0.35)) L.props.push({ t: 'grass', x: x + rng.next(), z: z + rng.next(), r: rng.next() * 6, s: rng.range(0.6, 1) });
  }
  L.props.push({ t: 'kit', kit: 'town', m: 'building_windmill_red', x: 6, z: 56, r: 0.6, s: 1.1 });
  L.props.push({ t: 'gate', x: CX, z: h - 6.5 });
  L.spots.npcs = { wayfarer: { x: CX - 2.6, z: 20.5, r: 0.4 }, smith: { x: 24.6, z: 33.4, r: -1.2 }, healer: { x: 41.2, z: 35.6, r: 0.8 }, villagers: [{ x: 27, z: 43, r: 0.8 }, { x: 38, z: 45, r: -0.6 }, { x: 34, z: 27, r: 2.8 }] };
  return L;
}
