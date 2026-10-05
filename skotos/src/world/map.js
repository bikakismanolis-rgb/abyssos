// Walkability grid: 1 cell = 1 world unit. Circle collision, line of sight and a flow field toward the hero.
// Low cells (lava, chasms) block feet but not eyes or arrows: los() and projectiles pass over them, clear() does not.

export class GridMap {
  constructor(w, h, cells, low) {
    this.w = w; this.h = h; this.cells = cells; // 0 solid, 1 floor
    this.low = low || null;                     // 1 where a solid cell is only a hole in the floor
    this.flow = new Uint16Array(w * h);
    this.flowT = { x: -1, z: -1, t: 0 };
    this.queue = new Int32Array(w * h);
    this.explored = new Uint8Array(w * h);
  }
  solid(ix, iz) {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return true;
    return this.cells[iz * this.w + ix] === 0;
  }
  walkable(x, z) { return !this.solid(Math.floor(x), Math.floor(z)); }
  // solid and tall: a wall, not a hole
  blocks(ix, iz) {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return true;
    const i = iz * this.w + ix;
    return this.cells[i] === 0 && !(this.low && this.low[i]);
  }
  setSolid(ix, iz, v = true) { if (ix >= 0 && iz >= 0 && ix < this.w && iz < this.h) this.cells[iz * this.w + ix] = v ? 0 : 1; }
  // reopen cells at runtime (broken standing stones, withered thorns, the Root Gate): [[ix, iz], ...] become floor and
  // the flow field is rebuilt on its next update. Nothing ever turns solid around the hero this way.
  open(cells) {
    let n = 0;
    for (const [ix, iz] of cells || []) {
      if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) continue;
      const i = iz * this.w + ix;
      if (this.cells[i] === 0) { this.cells[i] = 1; n++; }
      if (this.low) this.low[i] = 0;
    }
    if (n) this.flowT.x = -1;
    return n;
  }

  // push a circle out of solid cells; returns true if it touched a wall
  collide(p, r) {
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor(p.x - r), x1 = Math.floor(p.x + r), z0 = Math.floor(p.z - r), z1 = Math.floor(p.z + r);
      for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
        if (!this.solid(ix, iz)) continue;
        const cx = Math.max(ix, Math.min(p.x, ix + 1)), cz = Math.max(iz, Math.min(p.z, iz + 1));
        let dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        hit = true;
        if (d2 < 1e-8) { // center inside the cell: push toward the nearest free side
          const l = p.x - ix, rr = ix + 1 - p.x, t = p.z - iz, b = iz + 1 - p.z, m = Math.min(l, rr, t, b);
          if (m === l) p.x = ix - r; else if (m === rr) p.x = ix + 1 + r; else if (m === t) p.z = iz - r; else p.z = iz + 1 + r;
          continue;
        }
        const d = Math.sqrt(d2), push = (r - d) / d;
        p.x += dx * push; p.z += dz * push;
      }
    }
    return hit;
  }

  // grid walk between two points: can one see (and shoot) from a to b
  los(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.blocks(Math.floor(x0 + dx * t), Math.floor(z0 + dz * t))) return false;
    }
    return true;
  }
  // ... and walk there in a straight line
  clear(x0, z0, x1, z1) {
    if (!this.low) return this.los(x0, z0, x1, z1);
    const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.solid(Math.floor(x0 + dx * t), Math.floor(z0 + dz * t))) return false;
    }
    return true;
  }
  // first blocked point along a segment (for projectiles and dashes); returns t in 0..1
  castT(x0, z0, x1, z1, r = 0) {
    const dx = x1 - x0, dz = z1 - z0, n = Math.max(1, Math.ceil(Math.hypot(dx, dz) * 3));
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + dx * t, z = z0 + dz * t;
      if (this.solid(Math.floor(x), Math.floor(z)) || (r && (this.solid(Math.floor(x + r), Math.floor(z)) || this.solid(Math.floor(x - r), Math.floor(z)) || this.solid(Math.floor(x), Math.floor(z + r)) || this.solid(Math.floor(x), Math.floor(z - r))))) return (i - 1) / n;
    }
    return 1;
  }

  // BFS distances from the target cell, capped
  updateFlow(tx, tz, maxD = 60) {
    const ix = Math.floor(tx), iz = Math.floor(tz);
    if (ix === this.flowT.x && iz === this.flowT.z) return;
    this.flowT.x = ix; this.flowT.z = iz;
    const { w, h, cells, flow, queue } = this;
    flow.fill(65535);
    if (this.solid(ix, iz)) return;
    let head = 0, tail = 0;
    const start = iz * w + ix;
    flow[start] = 0; queue[tail++] = start;
    while (head < tail) {
      const c = queue[head++], d = flow[c];
      if (d >= maxD * 10) continue;
      const cx = c % w, cz = (c - cx) / w;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], nz = cz + DZ[k];
        if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
        const n = nz * w + nx;
        if (cells[n] === 0) continue;
        if (k >= 4 && (cells[cz * w + nx] === 0 || cells[nz * w + cx] === 0)) continue; // no corner cutting
        const nd = d + (k < 4 ? 10 : 14);
        if (nd < flow[n]) { flow[n] = nd; queue[tail++] = n; }
      }
    }
  }
  // direction toward the flow target from a world position; null if unreachable
  flowDir(x, z, out) {
    const ix = Math.floor(x), iz = Math.floor(z), w = this.w;
    if (this.solid(ix, iz)) return null;
    let best = this.flow[iz * w + ix], bx = 0, bz = 0;
    if (best === 65535) return null;
    for (let k = 0; k < 8; k++) {
      const nx = ix + DX[k], nz = iz + DZ[k];
      if (this.solid(nx, nz)) continue;
      if (k >= 4 && (this.solid(nx, iz) || this.solid(ix, nz))) continue;
      const v = this.flow[nz * w + nx];
      if (v < best) { best = v; bx = DX[k]; bz = DZ[k]; }
    }
    if (bx === 0 && bz === 0) return null;
    // aim at the center of the next cell so actors don't scrape walls
    const tx = ix + bx + 0.5 - x, tz = iz + bz + 0.5 - z, l = Math.hypot(tx, tz) || 1;
    out.x = tx / l; out.z = tz / l;
    return out;
  }
  flowDist(x, z) { const ix = Math.floor(x), iz = Math.floor(z); if (this.solid(ix, iz)) return 65535; return this.flow[iz * this.w + ix]; }

  // nearest floor cell center to a point
  nearestFloor(x, z, maxR = 12) {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (!this.solid(ix, iz)) return { x, z };
    for (let r = 1; r <= maxR; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      if (!this.solid(ix + dx, iz + dz)) return { x: ix + dx + 0.5, z: iz + dz + 0.5 };
    }
    return { x, z };
  }
  reveal(x, z, r) {
    const ix = Math.floor(x), iz = Math.floor(z), r2 = r * r;
    let changed = false;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r2) continue;
      const nx = ix + dx, nz = iz + dz;
      if (nx < 0 || nz < 0 || nx >= this.w || nz >= this.h) continue;
      const i = nz * this.w + nx;
      if (!this.explored[i]) { this.explored[i] = 1; changed = true; }
    }
    return changed;
  }
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
