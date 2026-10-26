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
    this.ver = 0;                               // bumped whenever cells change at runtime (stepToward's windows rebuild)
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
  // one cell (Act V never calls it: open and close batch): a change bumps ver and rebuilds the flow field like a batch
  setSolid(ix, iz, v = true) {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return;
    const i = iz * this.w + ix, c = v ? 0 : 1;
    if (this.cells[i] !== c) { this.cells[i] = c; this.flowT.x = -1; this.ver++; }
  }
  // reopen cells at runtime (broken standing stones, withered thorns, the Root Gate): [[ix, iz], ...] become floor and
  // the flow field is rebuilt on its next update. Nothing ever turns solid around the hero this way.
  open(cells) { return this.change(cells, null); }
  // close cells at runtime (Act V: the tide coming in, ice breaking, the skerry under the dead Tower): [[ix, iz], ...]
  // become solid, and low (water: eyes and arrows pass over) unless low is false; one ver bump and a flow rebuild per batch
  close(cells, low = true) { return this.change(null, cells, low); }
  // both in one batch (a tide step, an ice batch): one ver bump, so every stepToward window rebuilds once. Returns the
  // number of cells that changed
  change(open, close, low = true) {
    let n = 0;
    const { w, h } = this;
    for (const [ix, iz] of open || []) {
      if (ix < 0 || iz < 0 || ix >= w || iz >= h) continue;
      const i = iz * w + ix;
      if (this.cells[i] === 0) { this.cells[i] = 1; n++; }
      if (this.low) this.low[i] = 0;
    }
    if (close?.length && low && !this.low) this.low = new Uint8Array(w * h);
    for (const [ix, iz] of close || []) {
      if (ix < 0 || iz < 0 || ix >= w || iz >= h) continue;
      const i = iz * w + ix;
      if (this.cells[i] === 1) { this.cells[i] = 0; n++; }
      if (this.low) this.low[i] = low ? 1 : 0;
    }
    if (n) { this.flowT.x = -1; this.ver++; }
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
        if (d2 < 1e-8) { // center inside the cell: out through the nearest side with floor beyond it (a side into more
          // rock only sinks it a cell deeper each frame, off the map in the end); rock on all four sides: the nearest floor
          const l = this.solid(ix - 1, iz) ? 9 : p.x - ix, rr = this.solid(ix + 1, iz) ? 9 : ix + 1 - p.x;
          const t = this.solid(ix, iz - 1) ? 9 : p.z - iz, b = this.solid(ix, iz + 1) ? 9 : iz + 1 - p.z, m = Math.min(l, rr, t, b);
          if (m === 9) { const f = this.nearestFloor(p.x, p.z); p.x = f.x; p.z = f.z; }
          else if (m === l) p.x = ix - r; else if (m === rr) p.x = ix + 1 + r; else if (m === t) p.z = iz - r; else p.z = iz + 1 + r;
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
  // the way to a point that is not the hero (a mould's rim, a patrol post, a lamp): a small flow field of the caller's own,
  // BFS over a (2R+1)^2 window round the target's nearest floor, kept in P (an object the caller owns) while the target
  // cell and the map hold. A direction from (x, z), or null if (x, z) is outside the window or cut off from the target.
  // mask (a Uint8 w x h, or null): cells where it is 0 are walls to this window (the Walking Tower keeps to thick ice)
  stepToward(P, x, z, tx, tz, out, R = 20, mask = null) {
    const f = this.nearestFloor(tx, tz, 3), ix = Math.floor(f.x), iz = Math.floor(f.z);
    if (this.solid(ix, iz)) return null;
    if (P.ix !== ix || P.iz !== iz || P.ver !== this.ver || P.R !== R || P.mask !== mask) this.fillWindow(P, ix, iz, R, mask);
    const W = 2 * R + 1, cx = Math.floor(x) - P.x0, cz = Math.floor(z) - P.z0;
    if (cx < 0 || cz < 0 || cx >= W || cz >= W) return null;
    let best = P.d[cz * W + cx], bx = 0, bz = 0;
    if (best === 65535) return null;
    const gx = Math.floor(x), gz = Math.floor(z);
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k], nz = cz + DZ[k];
      if (nx < 0 || nz < 0 || nx >= W || nz >= W) continue;
      if (k >= 4 && (this.solid(gx + DX[k], gz) || this.solid(gx, gz + DZ[k]))) continue;
      const v = P.d[nz * W + nx];
      if (v < best) { best = v; bx = DX[k]; bz = DZ[k]; }
    }
    // in the target's cell (or as near as the floor goes): straight at the point
    const ax = bx || bz ? gx + bx + 0.5 : f.x, az = bx || bz ? gz + bz + 0.5 : f.z;
    const dx = ax - x, dz = az - z, l = Math.hypot(dx, dz);
    if (l < 1e-6) return null;
    out.x = dx / l; out.z = dz / l;
    return out;
  }
  fillWindow(P, ix, iz, R, mask = null) {
    const W = 2 * R + 1, N = W * W, { w, h, cells } = this;
    if (!P.d || P.d.length !== N) P.d = new Uint16Array(N);
    if (WQ.length < N * 4) WQ = new Int32Array(N * 4); // (a cell can be queued again when a shorter way reaches it)
    Object.assign(P, { ix, iz, R, ver: this.ver, x0: ix - R, z0: iz - R, mask });
    const d = P.d, x0 = P.x0, z0 = P.z0;
    d.fill(65535);
    let head = 0, tail = 0;
    d[R * W + R] = 0; WQ[tail++] = R * W + R;
    while (head < tail) {
      const c = WQ[head++], dc = d[c], cx = c % W, cz = (c - cx) / W;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], nz = cz + DZ[k], gx = x0 + nx, gz = z0 + nz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= W || gx < 0 || gz < 0 || gx >= w || gz >= h) continue;
        if (cells[gz * w + gx] === 0 || (mask && !mask[gz * w + gx])) continue;
        if (k >= 4 && (cells[(z0 + cz) * w + gx] === 0 || cells[gz * w + x0 + cx] === 0 || (mask && (!mask[(z0 + cz) * w + gx] || !mask[gz * w + x0 + cx])))) continue; // no corner cutting
        const n = nz * W + nx, nd = dc + (k < 4 ? 10 : 14);
        if (nd < d[n]) { d[n] = nd; WQ[tail++] = n; }
      }
    }
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
let WQ = new Int32Array(0); // stepToward's BFS queue, shared
