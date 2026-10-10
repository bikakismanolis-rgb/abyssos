// Act V soaks, headless (the scenario runner's pattern): node tools/soak5.mjs <tide|ice|perf|all> <outdir>
//   tide  CYCLES (20) tide cycles on the coast, game logic only (&norender, SIM ticks of 1/30 s a frame), with MON (12)
//         monsters hunting a hero who walks the flats; once a flood she stands in a cell the next step closes (her lane:
//         held, then walked out of or washed out along). Fails on: an actor's centre in a closed cell, the hero stuck (on
//         fewer than 9 open cells), her centre in a closed cell after a tick (the player.js snap), a jump over 3.5 m in a
//         tick, a wash-out leaving its lane, more than one ice-free tide bump per step, gold left lying in closed water
//         (each lane test drops some on a cell 4-9 m off that the same step closes: it must slide to the dry).
//   ice   MIN (10) minutes of game time on the coast's thin ice (the Fall shelf) and on the Farthest Light's Ice Road: she
//         walks, stands till it breaks, takes impacts, breaks and Frost Novas; monsters hunt her onto it (a troll among
//         them). Fails on: a landing over 3 m away that is not her 2 s ring's point, a snap, life under 10% after a
//         plunge, more than 4 map.ver bumps from the ice in any second, no breaks, refreezes, plunges or drownings.
//   perf  frame times (each rAF callback, the game's whole frame) on the coast with 30 monsters while the tide steps once
//         a second (TIDE.force), and on the Ice Road with batches four times a second; logic only and rendered (Q).
// env: BASE (http://localhost:5199/), DIFF (1), SIM (30), CYCLES, MIN, MON, Q (1)
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , which = 'all', out = '/tmp'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199/', DIFF = +(process.env.DIFF ?? 1), SIM = +(process.env.SIM || 30), SEED = process.env.SEED ? '&seed=' + process.env.SEED : '';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function open(q, vw = 960, vh = 540) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!t.includes('ERR_CERT') && !t.includes('404')) logs.push(m.type() + ': ' + t.slice(0, 300)); } });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  // every rAF callback timed (the game's frame: its ticks, and the draw unless &norender)
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__ft = []; window.__ftOn = false;
    window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); if (window.__ftOn) window.__ft.push([performance.now() - t0, window.__G?.zone?.map?.ver ?? 0]); });
    // she never dies here (a death would open the panel and stop the clock): the monsters' blows are kept at 1, and her
    // life is put back only under 5% (a plunge never takes her under 10%: that is what the ice soak checks)
    setInterval(() => { const G = window.__G, p = G?.player; if (!p) return; if (window.__immortal) p.hp = p.hpMax; if (p.hp < p.hpMax * 0.05 || p.dead) { p.dead = false; p.hp = p.hpMax; } if (G.panel && window.__D) { window.__D.closePanel(); window.__panels = (window.__panels || 0) + 1; } }, 50);
  });
  await page.goto(BASE + '?' + q);
  page.setDefaultTimeout(600000);
  await page.waitForFunction(() => window.__ready && window.__G?.player && window.__act5?.tide && window.__act5?.ice, null, { timeout: 300000 });
  return { page, logs };
}
const shotOf = (page) => async (name) => { await page.evaluate(() => new Promise((ok) => { window.__shoot = true; requestAnimationFrame(() => requestAnimationFrame(() => { window.__shoot = false; ok(); })); })); await page.screenshot({ path: `${out}/${name}.png` }); };

// ---------- in the page: the probe (called by ice.js at the end of every tick) and the bot that walks the hero ----------
function install(o) {
  const G = window.__G, A = window.__act5, D = window.__D, IN = D.IN;
  const S = window.__soak = { o, wet: [], drops: 0, ticks: 0, time: 0, maxJump: 0, jumps: [], snaps: [], closed: [], stuck: [], offLane: [], verT: [], tideBumpsPerStep: [], lanes: [], tp: false, last: null, ver: G.zone.map.ver, chk: 0, walk: null, P: {}, mode: 'walk', modeT: 0, laneTest: null, laneCycle: -1, cycle: 0, phase0: null, hpFloor: [], notes: [] };
  const key = (dx, dz) => {
    IN.keys.clear();
    if (Math.hypot(dx, dz) < 0.2) return;
    const a = Math.atan2(dx, dz), oct = Math.round(a / (Math.PI / 4));
    const dirs = { 0: ['s'], 1: ['s', 'd'], 2: ['d'], 3: ['w', 'd'], 4: ['w'], '-4': ['w'], '-3': ['w', 'a'], '-2': ['a'], '-1': ['s', 'a'] };
    for (const k of dirs[oct]) IN.keys.add(k);
  };
  S.key = key;
  const comp = (m, s, cap) => { const w = m.w, q = [s], seen = new Set(q); for (let h = 0; h < q.length && q.length < cap; h++) { const i = q[h], x = i % w, y = (i - x) / w; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dz, n = ny * w + nx; if (nx >= 0 && ny >= 0 && nx < w && ny < m.h && !seen.has(n) && m.cells[n]) { seen.add(n); q.push(n); } } } return q.length; };
  const pickTarget = () => {
    const z = G.zone, L = z.L, m = z.map, pl = G.player;
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * 6.283, r = 4 + Math.random() * (o.mode === 'ice' ? 9 : 14), x = pl.x + Math.sin(a) * r, y = pl.z + Math.cos(a) * r;
      const ix = Math.floor(x), iz = Math.floor(y); if (ix < 2 || iz < 2 || ix >= L.w - 2 || iz >= L.h - 2) continue;
      const i = iz * L.w + ix; if (!m.cells[i]) continue;
      if (o.mode === 'ice' ? !L.ice[i] && k < 50 : L.ice[i] || (k < 40 && !(L.bed && L.bed[i] < 9))) continue;
      return { x: ix + 0.5, z: iz + 0.5 };
    }
    return null;
  };
  A.probe = (dt) => {
    const z = G.zone, m = z.map, pl = G.player, L = z.L, T = A.tide.TIDE, I = A.ice.ICE;
    S.ticks++; S.time += dt;
    // a jump: how far she moved in one tick (a test's own teleport aside)
    if (S.last && !S.tp) { const d = Math.hypot(pl.x - S.last.x, pl.z - S.last.z); if (d > S.maxJump) S.maxJump = d; if (d > 3.5) S.jumps.push({ t: +S.time.toFixed(2), d: +d.toFixed(2), from: S.last, to: { x: pl.x, z: pl.z }, plunge: A.ice.LOG.plunges.at(-1)?.t }); }
    S.tp = false; S.last = { x: pl.x, z: pl.z };
    // her centre in a closed cell after the tick: player.js would snap her next frame
    if (!m.walkable(pl.x, pl.z) && !pl.dead) S.snaps.push({ t: +S.time.toFixed(2), x: pl.x, z: pl.z });
    // a wash-out keeps to its lane's cells
    // (more than 1 m off the wave's polyline: a monster's shove or a knock lasts a frame, the pull puts her back)
    if (pl.pull?.wash) {
      const P = pl.pull.path; let dm = 1e9;
      for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((pl.x - a.x) * dx + (pl.z - a.z) * dz) / l2)); dm = Math.min(dm, Math.hypot(a.x + dx * u - pl.x, a.z + dz * u - pl.z)); }
      if (dm > 1) S.offLane.push({ t: +S.time.toFixed(2), x: pl.x, z: pl.z, d: +dm.toFixed(2) });
    }
    // a lane held past its grace with no wave, or one held for ever
    if (T?.lane) { S.laneAge = (S.laneAge || 0) + dt; if (!pl.pull && T.laneT < -0.5 && !S.overdueT) { S.overdue = (S.overdue || 0) + 1; S.overdueT = true; } S.maxLaneAge = Math.max(S.maxLaneAge || 0, S.laneAge); } else { S.laneAge = 0; S.overdueT = false; }
    if (m.ver !== S.ver) {
      S.verT.push(+S.time.toFixed(3)); S.ver = m.ver;
      const s = Math.floor(pl.z) * L.w + Math.floor(pl.x);
      const n9 = m.cells[s] ? comp(m, s, 9) : 9;
      if (n9 < 9) S.stuck.push({ t: +S.time.toFixed(2), x: pl.x, z: pl.z, n: n9, lane: !!T?.lane, goal: T?.lane?.goal, path: T?.lane?.path?.length, def: T?.lane ? [...T.lane.def].length : 0, mem: T?.lane ? [...T.lane.mem].length : 0, wash: !!T?.wash, tide: T && [T.phase, T.h, T.step], ice: L.ice[s] ? 'thin' : I?.stage[s] ?? '' });
    }
    if ((S.chk -= dt) <= 0) {
      S.chk = 0.25;
      for (const a of z.actors) {
        if (a.team === 'foe' && a.dmg > 0.01) a.dmg = 0.01;
        // (floundering in a broken hole is being in the water: combat's ice rule holds them there 3 s)
        if (a.dead || a.removed || a.prop || a.under || a.airborne || a.cling || a.flounder > 0 || a.def?.float || a.def?.swim || a.def?.ai === 'bat') continue;
        if (!m.walkable(a.x, a.z)) { const ix = Math.floor(a.x), iz = Math.floor(a.z), nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => m.cells[(iz + dz) * L.w + ix + dx]).join(''); S.closed.push({ t: +S.time.toFixed(2), kind: a.kind, x: +a.x.toFixed(2), z: +a.z.toFixed(2), d: +Math.hypot(a.x - pl.x, a.z - pl.z).toFixed(1), fl: a.flounder || 0, st: a.state, dorm: !!a.dormant, vis: a.avatar?.group.visible, nb, lane: !!T?.lane?.def.has(iz * L.w + ix), bed: L.bed?.[iz * L.w + ix], T: T && [T.phase, T.h] }); }
      }
      const s = Math.floor(pl.z) * L.w + Math.floor(pl.x);
      if (m.cells[s] && comp(m, s, 9) < 9 && !T?.lane) S.stuck.push({ t: +S.time.toFixed(2), x: pl.x, z: pl.z, lane: false });
      // gold lying in closed water for over 1.5 s (not flying, not sliding)
      for (const p of z.pickups) { if (p.wash || p.y > 0 || p.vy > 0 || m.walkable(p.x, p.z)) { p._wet = 0; continue; } if ((p._wet = (p._wet || 0) + 0.25) > 1.5 && !p._wetLog) { p._wetLog = true; S.wet.push({ t: +S.time.toFixed(2), x: +p.x.toFixed(2), z: +p.z.toFixed(2) }); } }
    }
    S.bot?.(dt);
  };
  // the tide's bot: walk the flats; once a flood stand in a cell the next step closes (even cycles: stand till the wave
  // washes her out; odd ones: walk out after 2 s)
  if (o.mode === 'tide') S.bot = (dt) => {
    const z = G.zone, m = z.map, pl = G.player, L = z.L, T = A.tide.TIDE, C = z.tideC;
    if (S.phase0 !== T.phase) { if (T.phase === 'low' && S.phase0 === 'ebb') S.cycle++; S.phase0 = T.phase; }
    const si = o.stepT;
    if (S.mode !== 'lane' && T.phase === 'flood' && T.step < 7 && T.since > si - 0.6 && S.laneCycle !== S.cycle) {
      // the nearest cell open now that the next step closes (not the bay's), off the ice, and one she could have walked
      // to (on 9 open cells or more: a cell the water has already cut off is no place to drop her)
      let best = -1, bd = 1e9;
      for (let j = 0; j < C.idx.length; j++) { const i = C.idx[j]; if (C.thr[j] !== T.step + 1 || C.bay[i] || !m.cells[i]) continue; const x = i % L.w + 0.5, y = (i - i % L.w) / L.w + 0.5, d = Math.hypot(x - pl.x, y - pl.z); if (d < bd && comp(m, i, 9) >= 9) { bd = d; best = i; } }
      if (best >= 0) {
        S.laneCycle = S.cycle; S.mode = 'lane'; S.modeT = 0; S.tp = true;
        pl.x = best % L.w + 0.5; pl.z = (best - best % L.w) / L.w + 0.5; pl.kx = pl.kz = 0; key(0, 0);
        S.laneTest = { cycle: S.cycle, cell: best, wait: S.cycle % 2 === 0, t0: S.time, lane: false, wash: false, closed: false, out: false };
        S.lanes.push(S.laneTest);
        // and gold on another cell the same step closes, 4-9 m off (out of her pickup's reach)
        for (let j = 0; j < C.idx.length && window.__pk; j++) { const i = C.idx[j]; if (C.thr[j] !== T.step + 1 || C.bay[i] || !m.cells[i]) continue; const x = i % L.w + 0.5, y = (i - i % L.w) / L.w + 0.5, d = Math.hypot(x - pl.x, y - pl.z); if (d > 4 && d < 9) { window.__pk.dropGold(x, y, 7); S.drops++; break; } }
      }
    }
    if (S.mode === 'lane') {
      const LT = S.laneTest; S.modeT += dt;
      if (T.lane) LT.lane = true;
      if (pl.pull?.wash) LT.wash = true;
      if (!LT.wait && LT.lane && S.modeT > 2.5 && T.lane) {
        // walk out along her lane to its open end
        const g = T.lane.goal; if (g >= 0) { const gx = g % L.w + 0.5, gz = (g - g % L.w) / L.w + 0.5; key(gx - pl.x, gz - pl.z); LT.out = true; }
      } else key(0, 0);
      if (S.modeT > 1 && !T.lane && !pl.pull) { LT.closed = true; LT.dur = +S.modeT.toFixed(2); LT.cellClosed = !m.cells[LT.cell]; S.mode = 'walk'; S.walk = null; }
      if (S.modeT > 15) { LT.timeout = true; S.mode = 'walk'; S.walk = null; }
      return;
    }
    if (!S.walk || Math.hypot(S.walk.x - pl.x, S.walk.z - pl.z) < 1 || (S.modeT += dt) > 12) { S.walk = pickTarget(); S.modeT = 0; }
    if (!S.walk) { key(0, 0); return; }
    // (she keeps off the thin ice: this soak is the tide's; a wave that leaves her on it, she walks off)
    S.dry ||= L.ice.map((v) => (v ? 0 : 1));
    const v = m.stepToward(S.P, pl.x, pl.z, S.walk.x, S.walk.z, { x: 0, z: 0 }, 20, L.ice[Math.floor(pl.z) * L.w + Math.floor(pl.x)] ? null : S.dry);
    if (!v) { S.walk = null; key(0, 0); return; }
    key(v.x, v.z);
  };
  // the ice's bot: walk the thin ice, stand till it breaks (now and then with little life left), impacts round her
  if (o.mode === 'ice') S.bot = (dt) => {
    const z = G.zone, m = z.map, pl = G.player, L = z.L, I = A.ice;
    S.modeT += dt; S.imp = (S.imp ?? 4) - dt; S.brk = (S.brk ?? 9) - dt; S.nova = (S.nova ?? 14) - dt; S.heal = (S.heal ?? 10) - dt;
    if (S.imp <= 0) { S.imp = 3 + Math.random() * 3; const a = Math.random() * 6.28, r = 2 + Math.random() * 5; I.crackAt(pl.x + Math.sin(a) * r, pl.z + Math.cos(a) * r, 1.5 + Math.random() * 2, 1 + (Math.random() < 0.4 ? 1 : 0)); }
    if (S.brk <= 0) { S.brk = 8 + Math.random() * 6; const a = Math.random() * 6.28; I.breakAt(pl.x + Math.sin(a) * 3.5, pl.z + Math.cos(a) * 3.5, 1.2); }
    if (S.nova <= 0) { S.nova = 13 + Math.random() * 6; I.refreezeAt(pl.x, pl.z, 5.5); S.novas = (S.novas || 0) + 1; }
    if (S.heal <= 0) { S.heal = 10; if (Math.random() < 0.25) { pl.hp = Math.ceil(pl.hpMax * 0.12); S.lowHp = (S.lowHp || 0) + 1; } else pl.hp = pl.hpMax; }
    // now and then a second plunge within 5 s (it costs half): the ice breaks again under where she climbed out
    const np = A.ice.LOG.plunges.length;
    if (np !== S.np) { S.np = np; if (Math.random() < 0.4) S.again = 1.5; }
    if (S.again != null && (S.again -= dt) <= 0) { S.again = null; I.breakAt(pl.x, pl.z, 0.4); S.agains = (S.agains || 0) + 1; }
    if (S.mode === 'stand') { key(0, 0); if (S.modeT > 7.5 || A.ice.LOG.plunges.at(-1)?.t > S.standT0) { S.mode = 'walk'; S.walk = null; S.modeT = 0; } return; }
    if (S.modeT > 6 && Math.random() < 0.02) { S.mode = 'stand'; S.modeT = 0; S.standT0 = I.ICE?.clock ?? 0; key(0, 0); return; }
    if (!S.walk || Math.hypot(S.walk.x - pl.x, S.walk.z - pl.z) < 1 || S.modeT > 10) { S.walk = pickTarget(); if (S.modeT > 10) S.modeT = 0; }
    if (!S.walk) { key(0, 0); return; }
    const v = m.stepToward(S.P, pl.x, pl.z, S.walk.x, S.walk.z, { x: 0, z: 0 }, 20);
    if (!v) { S.walk = null; key(0, 0); return; }
    key(v.x, v.z);
  };
}
// monsters round her, hunting (they hit for nothing: only the water hurts her here)
function spawn(o) {
  const G = window.__G, D = window.__D, pl = G.player, z = G.zone, m = z.map, out = [];
  for (let k = 0; k < o.n; k++) {
    const kind = o.kinds[k % o.kinds.length];
    for (let t = 0; t < 30; t++) {
      const a = Math.random() * 6.28, r = (o.r0 ?? 4) + Math.random() * (o.r1 ?? 10), x = pl.x + Math.sin(a) * r, y = pl.z + Math.cos(a) * r;
      if (!m.walkable(x, y) || (o.ice && !z.L.ice[Math.floor(y) * z.L.w + Math.floor(x)])) continue;
      const b = D.spawnMonster(kind, x, y, { level: G.hero.level }); b.aggro = true; b.dmg = 0.01; z.actors.push(b); out.push(kind); break;
    }
  }
  return out;
}
const windowMax = (ts, w = 1) => { let best = 0; for (let i = 0, j = 0; i < ts.length; i++) { while (ts[i] - ts[j] >= w) j++; best = Math.max(best, i - j + 1); } return best; };
const stats = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return { n: a.length, med: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +s[s.length - 1].toFixed(2), mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) }; };

// ---------- the tide soak ----------
async function tideSoak() {
  const CYCLES = +(process.env.CYCLES || 20), MON = +(process.env.MON || 12);
  const { page, logs } = await open(`auto=coast&lvl=30&diff=${DIFF}&q=0&sim=${SIM}&norender${SEED}`);
  const shot = shotOf(page);
  const setup = await page.evaluate(async ({ install, spawn, DIFF, MON }) => {
    window.__immortal = true;
    window.__pk = await import('/src/game/pickups.js');
    const G = window.__G, L = G.zone.L, sp = L.spots, pl = G.player;
    // start on the Shallows' dry ground by the Dalarö's bar (or the camp)
    const s = sp.dalaro || sp.camp, f = G.zone.map.nearestFloor(s.x, s.z + 6, 12);
    pl.x = f.x; pl.z = f.z;
    // (a few monsters only, ours: the zone's own packs stay where they are)
    for (const p of G.zone.packs) p.spawned = true;
    new Function('return ' + install)()({ mode: 'tide', stepT: DIFF === 0 ? 5 : 4.5 });
    const kinds = new Function('return ' + spawn)()({ n: MON, kinds: ['goblin', 'skeleton', 'warg', 'spider', 'goblin', 'troll'] });
    return { at: [pl.x, pl.z], kinds, tidal: G.zone.tideC.idx.length };
  }, { install: install.toString(), spawn: spawn.toString(), DIFF, MON });
  console.log('tide setup', JSON.stringify(setup));
  const t0 = Date.now(); let last = '';
  const cyc = DIFF === 0 ? 180 : 152;
  while (true) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => ({ t: window.__soak.time, cyc: window.__soak.cycle, alive: window.__G.actors.filter((a) => !a.dead && a.team === 'foe').length }));
    if (st.alive < 6) await page.evaluate(({ spawn }) => new Function('return ' + spawn)()({ n: 6, kinds: ['goblin', 'skeleton', 'warg', 'spider', 'troll'] }), { spawn: spawn.toString() });
    const line = `tide: ${st.t.toFixed(0)} s, cycle ${st.cyc}, ${st.alive} hunting, ${((Date.now() - t0) / 1000).toFixed(0)} s real`;
    if (line !== last) { console.log(line); last = line; }
    if (st.t >= CYCLES * cyc + 2) break;
    if (Date.now() - t0 > 60 * 60 * 1000) { logs.push('soak: out of real time'); break; }
  }
  const res = await page.evaluate(() => {
    const S = window.__soak, A = window.__act5, TL = A.tide.LOG;
    return { seed: window.__G.zone.seed, time: +S.time.toFixed(1), ticks: S.ticks, cycles: S.cycle, steps: TL.steps, bells: TL.bells, turns: TL.turns, lanesLog: TL.lanes, washes: TL.washes.length, washesSample: TL.washes.slice(0, 4), evicted: TL.evicted, slid: TL.slid, maxJump: +S.maxJump.toFixed(3), jumps: S.jumps.slice(0, 10), snaps: S.snaps.length, snapsSample: S.snaps.slice(0, 5), closed: S.closed.length, closedSample: S.closed.slice(0, 8), stuck: S.stuck.length, stuckSample: S.stuck.slice(0, 5), offLane: S.offLane.length, offLaneSample: S.offLane.slice(0, 5), drops: S.drops, wet: S.wet.length, wetSample: S.wet.slice(0, 5), overdue: S.overdue || 0, maxLaneAge: +(S.maxLaneAge || 0).toFixed(1), laneTests: S.lanes, verBumps: S.verT.length, iceBumps: A.ice.LOG.bumps.length, plunges: A.ice.LOG.plunges.length };
  });
  await page.evaluate(() => { window.__shoot = true; }); await shot('tide-end');
  const lt = res.laneTests;
  // (a test whose lane never formed: she was shoved off the cell before the step, and it closed behind her)
  const washed = lt.filter((l) => l.wash).length, walked = lt.filter((l) => !l.wash && l.out).length, stillOpen = lt.filter((l) => !l.cellClosed && !l.timeout && l.cycle < CYCLES);
  res.pass = res.cycles >= CYCLES && res.closed === 0 && res.stuck === 0 && res.snaps === 0 && res.jumps.length === 0 && res.offLane === 0 && res.wet === 0 && (res.slid > 0 || !res.drops) && res.overdue === 0 && res.maxLaneAge < 40 && lt.length >= CYCLES - 1 && washed >= Math.min(3, CYCLES >> 2) && walked >= Math.min(3, CYCLES >> 2) && !stillOpen.length && res.verBumps <= res.steps + res.lanesLog * 2 + res.iceBumps;
  res.laneTests = { n: lt.length, formed: lt.filter((l) => l.lane).length, washed, walkedOut: walked, cellOpen: stillOpen, sample: lt.slice(0, 6) };
  await page.close();
  return { res, logs };
}

// ---------- the ice soak (one zone) ----------
async function iceSoak(zone) {
  const MIN = +(process.env.MIN || 10);
  const { page, logs } = await open(`auto=${zone}&lvl=30&diff=${DIFF}&q=0&sim=${SIM}&norender${SEED}`);
  const shot = shotOf(page);
  const setup = await page.evaluate(({ install, spawn, zone }) => {
    const G = window.__G, z = G.zone, L = z.L, pl = G.player, m = z.map;
    // start on thin ice with room round it: the Fall shelf (the coast's west fjord) or the Ice Road's midpoint (farlight)
    const want = zone === 'farlight' ? (() => { const p = L.spots.poles; return p[p.length >> 1]; })() : { x: 22, z: 100 };
    let best = null, bd = 1e9;
    for (let i = 0; i < L.ice.length; i++) {
      if (!L.ice[i] || !m.cells[i]) continue;
      const x = i % L.w + 0.5, y = (i - i % L.w) / L.w + 0.5;
      if (zone === 'coast' && Math.hypot(x - L.boss.x, y - L.boss.z) < L.boss.r + 6) continue;
      let n = 0; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (L.ice[i + dz * L.w + dx]) n++;
      const d = Math.hypot(x - want.x, y - want.z) - n * 0.5;
      if (n >= 20 && d < bd) { bd = d; best = { x, z: y }; }
    }
    pl.x = best.x; pl.z = best.z;
    new Function('return ' + install)()({ mode: 'ice' });
    const kinds = new Function('return ' + spawn)()({ n: 8, ice: true, r0: 3, r1: 6, kinds: ['goblin', 'skeleton', 'warg', 'spider', 'troll', 'goblin', 'skeleton', 'warg'] });
    return { at: [pl.x, pl.z], kinds, ice: L.ice.reduce((a, b) => a + b, 0) };
  }, { install: install.toString(), spawn: spawn.toString(), zone });
  const t0 = Date.now(); let n = 0;
  while (true) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => ({ t: window.__soak.time, alive: window.__G.actors.filter((a) => !a.dead && a.team === 'foe').length, big: window.__G.actors.some((a) => !a.dead && a.def?.big) }));
    if (st.alive < 5 || !st.big) await page.evaluate(({ spawn, big }) => new Function('return ' + spawn)()({ n: big ? 4 : 1, ice: true, r0: 3, r1: 6, kinds: big ? ['goblin', 'skeleton', 'warg', 'spider'] : ['troll'] }), { spawn: spawn.toString(), big: st.big });
    if (++n % 5 === 0) console.log(`ice ${zone}: ${st.t.toFixed(0)} s, ${st.alive} hunting, ${((Date.now() - t0) / 1000).toFixed(0)} s real`);
    if (st.t >= MIN * 60) break;
    if (Date.now() - t0 > 40 * 60 * 1000) { logs.push('soak: out of real time'); break; }
  }
  await page.evaluate(async () => { const D = await import('/src/game/data.js'); window.__plungePct = D.HAZ5[window.__G.hero.diff].plunge; });
  const res = await page.evaluate(() => {
    const S = window.__soak, A = window.__act5, IL = A.ice.LOG, G = window.__G;
    const pl = IL.plunges, far = pl.filter((p) => !(p.d <= 3.0001 || (p.how === 'ring' && p.age <= 2.05)) || p.how === 'floor');
    return { seed: G.zone.seed, time: +S.time.toFixed(1), breaks: IL.breaks, refreezes: IL.refreezes, slushed: IL.slushed, batches: IL.batches, warns: IL.warns, drowned: IL.drowned, floundered: IL.floundered, plunges: pl.length, plungeHow: pl.reduce((o, p) => (o[p.how] = (o[p.how] || 0) + 1, o), {}), plungeMaxD: Math.max(0, ...pl.map((p) => p.how === 'ring' ? 0 : p.d)), far, lowHp: pl.filter((p) => p.hp[1] < Math.min(p.hp[0], p.hp[2] * 0.1) - 0.5), lowHpTests: S.lowHp || 0, halfPlunges: pl.filter((p, i) => i && p.t - pl[i - 1].t < 5).map((p) => ({ lost: +(p.hp[0] - p.hp[1]).toFixed(1), full: +(p.hp[2] * window.__plungePct / 100).toFixed(1), hp0: +p.hp[0].toFixed(1) })), lowHpPlunges: pl.filter((p) => p.hp[0] < p.hp[2] * 0.2).map((p) => [+p.hp[0].toFixed(1), +p.hp[1].toFixed(1), p.hp[2]]), agains: S.agains || 0, plungeSample: pl.slice(0, 4), novas: S.novas || 0, bumps: IL.bumps.length, bumpsMaxPerSec: 0, bumpsT: IL.bumps, maxJump: +S.maxJump.toFixed(3), jumps: S.jumps.slice(0, 10), snaps: S.snaps.length, snapsSample: S.snaps.slice(0, 5), stuck: S.stuck.length, stuckSample: S.stuck.slice(0, 5), closed: S.closed.length, closedSample: S.closed.slice(0, 5), ver: G.zone.map.ver };
  });
  res.bumpsMaxPerSec = windowMax(res.bumpsT); delete res.bumpsT;
  await shot('ice-' + zone + '-end');
  // (a second plunge within 5 s costs half, unless the 10% floor took less: lost <= full / 2 + 1)
  res.halfOk = res.halfPlunges.every((p) => p.lost <= p.full / 2 + 1);
  res.pass = res.breaks > 0 && res.refreezes > 0 && res.slushed > 0 && res.plunges > 0 && res.drowned > 0 && res.far.length === 0 && res.lowHp.length === 0 && res.snaps === 0 && res.bumpsMaxPerSec <= 4 && res.halfOk && res.closed === 0;
  // (stuck here is reported, not failed: breaks round her can leave her on a scrap of ice until it refreezes or gives)
  await page.close();
  return { res, logs };
}

// ---------- frame times ----------
async function perf() {
  const Q = process.env.Q || '1', out = {};
  for (const [zone, render] of [['coast', false], ['coast', true], ['farlight', false], ['farlight', true]]) {
    const { page, logs } = await open(`auto=${zone}&lvl=30&diff=${DIFF}&q=${render ? Q : 0}${render ? '' : '&norender'}`, 915, 412);
    const r = await page.evaluate(async ({ install, spawn, zone }) => {
      window.__immortal = true;
      const G = window.__G, z = G.zone, L = z.L, pl = G.player, A = window.__act5;
      const s = zone === 'coast' ? (L.spots.dalaro || L.spots.camp) : (() => { const p = L.spots.poles; return p[p.length >> 1]; })();
      const f = z.map.nearestFloor(s.x, s.z + 5, 12); pl.x = f.x; pl.z = f.z;
      new Function('return ' + install)()({ mode: zone === 'coast' ? 'tide' : 'ice' });
      window.__soak.bot = null;
      new Function('return ' + spawn)()({ n: 30, r0: 3, r1: 14, kinds: ['goblin', 'skeleton', 'warg', 'spider', 'goblin'] });
      const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
      await wait(1500);
      const T = A.tide.TIDE, I = A.ice;
      // the tide steps once a second (the Tower's pace), up and back; on the ice a crack or a break four times a second
      let k = 0, iv = null;
      if (zone === 'coast') { T.force = { h: 1.2, rate: 0.15 }; iv = setInterval(() => { if (T.step >= 8) T.force = { h: 0, rate: 0.15 }; else if (T.step <= 0) T.force = { h: 1.2, rate: 0.15 }; }, 250); }
      else iv = setInterval(() => { const a = (k++) * 2.4; if (k % 3) I.crackAt(pl.x + Math.sin(a) * 4, pl.z + Math.cos(a) * 4, 2, 2); else I.breakAt(pl.x + Math.sin(a) * 5, pl.z + Math.cos(a) * 5, 1); }, 250);
      const TC = A.tide.LOG.cost, IC = A.ice.LOG.cost; Object.assign(TC, { n: 0, ms: 0, max: 0 }); Object.assign(IC, { n: 0, ms: 0, max: 0 });
      window.__ft = []; window.__ftOn = true;
      await wait(20000);
      window.__ftOn = false; clearInterval(iv);
      const ft = window.__ft, all = ft.map((x) => x[0]), bump = [], calm = [];
      for (let i = 1; i < ft.length; i++) (ft[i][1] !== ft[i - 1][1] || (i > 1 && ft[i - 1][1] !== ft[i - 2][1]) ? bump : calm).push(ft[i][0]);
      const cost = (c) => ({ frames: c.n, meanMs: +(c.ms / Math.max(1, c.n)).toFixed(3), maxMs: +c.max.toFixed(2) });
      return { all, bump, calm, actors: G.actors.filter((a) => !a.dead && a.team === 'foe').length, steps: A.tide.LOG.steps, batches: A.ice.LOG.batches, tick: { tide: cost(TC), ice: cost(IC) } };
    }, { install: install.toString(), spawn: spawn.toString(), zone });
    out[zone + (render ? '-q' + Q : '-logic')] = { all: stats(r.all), bumpFrames: stats(r.bump), calmFrames: stats(r.calm), tick: r.tick, actors: r.actors, steps: r.steps, batches: r.batches, errors: logs.slice(0, 5) };
    await page.close();
  }
  return out;
}

const report = {};
if (which === 'tide' || which === 'all') report.tide = await tideSoak();
if (which === 'ice' || which === 'all') { report.iceCoast = await iceSoak('coast'); report.iceFarlight = await iceSoak('farlight'); }
if (which === 'ice-coast') report.iceCoast = await iceSoak('coast');
if (which === 'ice-farlight') report.iceFarlight = await iceSoak('farlight');
if (which === 'perf' || which === 'all') report.perf = await perf();
writeFileSync(`${out}/soak5-${which}${process.env.SEED ? '-' + process.env.SEED : ''}.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) {
  if (k === 'perf') { console.log('perf', JSON.stringify(v)); continue; }
  console.log(k, v.res.pass ? 'PASS' : 'FAIL', JSON.stringify(v.res).slice(0, 2400));
  if (v.logs.length) console.log(v.logs.slice(0, 20).join('\n'));
}
await browser.close();
process.exit(Object.values(report).every((v) => !v.res || v.res.pass) ? 0 : 1);
