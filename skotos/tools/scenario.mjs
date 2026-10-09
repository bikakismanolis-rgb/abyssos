// Scenario runner: node tools/scenario.mjs <name> <outdir>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , name = 'combat', out = '/tmp', W = '1280', H = '720'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!t.includes('ERR_CERT')) logs.push(m.type() + ': ' + t); } });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
// Act IV: a dialog advances on Enter (the key finishes the line, then moves on), whatever the frame rate; what is said is
// recorded for the report
const A4 = {
  enter: (pg) => pg.evaluate(() => window.__D.emit('key', 'enter')),
  async dialogs(pg, n = 10, until) {
    for (let i = 0; i < n * 2 + 2; i++) {
      if (until && await pg.evaluate(until)) return;
      if (!(await pg.evaluate(() => !!document.querySelector('#dialog:not([hidden])')))) { if (!until) return; await pg.waitForTimeout(250); continue; }
      await A4.enter(pg); await pg.waitForTimeout(220);
    }
  },
  listen: (pg) => pg.evaluate(async () => { const B = await import('/src/ui/bus.js'); window.__says = []; B.on('say', (k) => window.__says.push(k)); }),
  // strike the boss down to frac of its life (null: to death), through a dark step, a daze or a burst floor
  async hit(pg, frac) {
    for (let i = 0; i < 10; i++) {
      const ok = await pg.evaluate((frac) => { const b = window.__G.zone.boss; if (!b || b.dead) return true; b.dazed = 0; b.hidden = false; b.invuln = 0; if (frac == null) b.hpFloor = 0; window.__D.kill(b); return frac == null ? b.dead : b.hp <= b.hpMax * frac + 1; }, frac);
      if (ok) return true;
      await pg.waitForTimeout(700);
    }
    return false;
  }
};
const S = {
  combat: { q: 'auto=forest&sim=6&q=1', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const p = G.zone.packs[1]; G.player.x = p.x; G.player.z = p.z + 5; G.player.hp = G.player.hpMax = 5000; });
    await pg.waitForTimeout(1200); await shot();
    for (let i = 0; i < 6; i++) { await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 0, aim: null })); await pg.waitForTimeout(250); }
    await shot();
    await pg.evaluate(() => { const G = window.__G; G.hero.level = 7; window.__D.refreshStats(); G.player.res = 100; });
    for (const i of [1, 2, 3, 4]) { await pg.evaluate((i) => { window.__G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i, aim: null }); }, i); await pg.waitForTimeout(700); await shot(); }
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(() => { const G = window.__G; return { kills: G.hero.stats.kills, xp: G.hero.xp, lvl: G.hero.level, gold: G.hero.gold, pickups: G.pickups.map(p => p.kind + (p.item ? ':' + p.item.rar : '')), inv: G.hero.inv.filter(Boolean).length }; });
  } },
  ranger: { q: 'auto=forest&sim=6&q=1&cls=ranger&lvl=7', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const p = G.zone.packs[1]; G.player.x = p.x; G.player.z = p.z + 7; G.player.hp = G.player.hpMax = 5000; });
    await pg.waitForTimeout(1200);
    for (let i = 0; i < 4; i++) { await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 0, aim: null })); await pg.waitForTimeout(300); }
    await shot();
    for (const i of [1, 2, 3, 4]) { await pg.evaluate((i) => { window.__G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i, aim: null }); }, i); await pg.waitForTimeout(600); await shot(); }
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { kills: G.hero.stats.kills, pets: G.actors.filter(a => a.pet).length }; });
  } },
  mage: { q: 'auto=forest&sim=6&q=1&cls=mage&lvl=7', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const p = G.zone.packs[1]; G.player.x = p.x; G.player.z = p.z + 6; G.player.hp = G.player.hpMax = 5000; });
    await pg.waitForTimeout(1200);
    for (let i = 0; i < 4; i++) { await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 0, aim: null })); await pg.waitForTimeout(300); }
    await shot();
    for (const i of [1, 2, 3, 4]) { await pg.evaluate((i) => { window.__G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i, aim: null }); }, i); await pg.waitForTimeout(500); await shot(); }
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { kills: G.hero.stats.kills }; });
  } },
  panels: { q: 'auto=town&sim=2&q=1', run: async (pg, shot) => {
    await pg.evaluate(() => { const D = window.__D, G = window.__G; for (let i = 0; i < 10; i++) { const it = (window.__mk || (() => null))(); } });
    await pg.evaluate(async () => { const m = await import('/src/game/items.js'); const inv = await import('/src/game/inventory.js'); for (let i = 0; i < 14; i++) inv.addToBag(m.makeItem(8, { rar: i % 4 })); window.__G.hero.points = 3; window.__G.hero.level = 8; window.__D.refreshStats(); });
    await pg.evaluate(() => window.__D.openPanel('inventory')); await pg.waitForTimeout(500); await shot();
    await pg.click('.bag .cell.r3').catch(() => {}); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('skills')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('vendor')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('waypoints')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.closePanel());
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {})); await pg.waitForTimeout(800); await shot();
    return 'ok';
  } },
  weaver: { q: 'auto=forest&sim=6&q=1&lvl=6', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 9; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(2500); await shot();
    for (let k = 0; k < 40; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(400); if (k % 10 === 9) await shot(); }
    // software rendering under load runs few game frames per second: keep swinging until the boss falls, measured in game
    // time (a swing is dropped mid-leap, or misses while she blinks: the hero swings again as soon as she is free to)
    const swung = await pg.evaluate(async () => {
      const G = window.__G, b = G.zone.boss, p = G.player, t0 = G.hero.stats.time, w0 = performance.now();
      while (b && !b.dead && G.hero.stats.time - t0 < 20 && performance.now() - w0 < 300000) {
        if (!p.act && !window.__D.IN.events.some((e) => e.t === 'skill')) { b.hp = 1; p.x = b.x; p.z = b.z + b.radius + 1; window.__D.IN.events.push({ t: 'skill', i: 0, aim: { x: b.x, z: b.z } }); }
        await new Promise((ok) => setTimeout(ok, 250));
      }
      return !b || b.dead ? true : +(G.hero.stats.time - t0).toFixed(1);
    });
    // the hero's own swings never landed: the story still gets its kill, and the report says so (forced: the game seconds tried)
    if (swung !== true) await A4.hit(pg, null);
    await pg.waitForFunction(() => window.__G.hero.quest >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(1000); await shot();
    return pg.evaluate((forced) => { const G = window.__G, pa = G.player.act; return { act: pa && { name: pa.name, t: +pa.t.toFixed(2), dur: +pa.dur.toFixed(2) }, d: G.zone.boss && +Math.hypot(G.zone.boss.x - G.player.x, G.zone.boss.z - G.player.z).toFixed(2), boss: G.zone.boss?.dead, hp: G.zone.boss && Math.round(G.zone.boss.hp), flag: G.hero.flags.weaver, quest: G.hero.quest, pickups: G.pickups.map(p => p.kind + (p.item ? ':' + p.item.rar : '')), ...(forced != null ? { forced } : {}) }; }, swung === true ? null : swung);
  } },
  lord: { q: 'auto=crypt&sim=6&q=1&lvl=8&cls=mage', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.flags.weaver = true; G.hero.quest = 3; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 9; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(2500); await shot();
    for (let k = 0; k < 30; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 2, 3, 4][Math.floor(Math.random() * 5)], aim: null }); }); await pg.waitForTimeout(400); if (k % 10 === 9) await shot(); }
    await pg.evaluate(() => { const G = window.__G; const b = G.zone.boss; if (b && !b.dead) b.hp = 1; window.__D.IN.events.push({ t: 'skill', i: 3, aim: null }); });
    await pg.waitForTimeout(5000);
    await pg.evaluate(() => { const G = window.__G; const s = G.pickups.find(p => p.kind === 'shard'); if (s) { G.player.x = s.x; G.player.z = s.z; } });
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { boss: G.zone.boss?.dead, quest: G.hero.quest, lordFlag: G.hero.flags.lord }; });
  } },
  ending: { q: 'auto=town&sim=3&q=1&norender&lvl=10', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 4; });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {}));
    // dialogs advance on Enter (it finishes the line, then moves on), whatever the frame rate
    const next = () => pg.evaluate(() => window.__D.emit('key', 'enter'));
    for (let i = 0; i < 30; i++) { if (await pg.evaluate(() => !!window.__G.cine)) break; await next(); await pg.waitForTimeout(300); }
    await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 4.5, null, { timeout: 120000 }); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    for (let i = 0; i < 8; i++) { await next(); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate(() => { const G = window.__G; return { quest: G.hero.quest, act1: G.hero.act1, panel: G.panel, mode: G.mode }; });
  } },
  gate: { q: 'auto=town&sim=6&q=1&lvl=12&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 5; G.player.hp = G.player.hpMax = 99999; window.__D.emit('startGate', 3); });
    await pg.waitForTimeout(4000); await shot();
    await pg.evaluate(() => { const G = window.__G; G.gate.progress = 0.99; const m = G.actors.find(a => a.team === 'foe' && !a.prop && !a.dead); if (m) { m.hp = 1; window.__D.emit('gateKill', m); } });
    await pg.waitForTimeout(3000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { zone: G.zone.id, guardian: !!G.gate?.guardian, name: G.gate?.guardian?.name }; });
  } },
  // ---------- Act II ----------
  // walk the pass pack by pack with an unkillable hero, swinging, and report what died and what broke
  pass: { q: 'auto=pass&sim=6&q=1&norender&lvl=12&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const n = await pg.evaluate(() => window.__G.zone.packs.length);
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; G.player.x = p.x; G.player.z = p.z + 4; const f = G.zone.map.nearestFloor(G.player.x, G.player.z); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; }, i);
      for (let k = 0; k < 12; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      await shot();
    }
    return pg.evaluate(() => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { kills: G.hero.stats.kills, lvl: G.hero.level, alive: kinds, quest: G.hero.quest }; });
  } },
  stonewarden: { q: 'auto=pass&sim=6&q=1&norender&lvl=12&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; window.__immortal = true; G.hero.quest = 6; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 9; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    for (let k = 0; k < 36; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(400); if (k % 9 === 8) await shot(); }
    const moves = await pg.evaluate(() => Object.keys(window.__G.zone.boss?.mcd || {}));
    await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (b && !b.dead) b.hp = 1; G.player.x = b.x; G.player.z = b.z + 2.5; window.__D.IN.events.push({ t: 'skill', i: 0, aim: { x: b.x, z: b.z } }); });
    await pg.waitForTimeout(6000); await shot();
    return pg.evaluate((moves) => { const G = window.__G; return { moves, boss: G.zone.boss?.dead, flag: G.hero.flags.stonewarden, quest: G.hero.quest, doors: G.zone.gateDoors?.userData.leaves.map((l) => +l.hinge.rotation.y.toFixed(2)) }; }, moves);
  } },
  halls: { q: 'auto=halls&sim=6&q=1&norender&lvl=14&cls=' + (process.env.CLS || 'mage'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; window.__immortal = true; G.hero.quest = 7; G.hero.flags.stonewarden = true; G.player.hp = G.player.hpMax = 99999; });
    await pg.waitForTimeout(1500); await shot();
    await pg.evaluate(() => window.__D.emit('talk', 'brokka', {}));
    for (let i = 0; i < 10; i++) { await pg.waitForTimeout(400); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); }
    await pg.waitForTimeout(800); await shot();
    const n = await pg.evaluate(() => window.__G.zone.packs.length);
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; const f = G.zone.map.nearestFloor(p.x, p.z + 4); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 12; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 2, 3, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      await shot();
    }
    return pg.evaluate(() => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { kills: G.hero.stats.kills, quest: G.hero.quest, alive: kinds }; });
  } },
  king: { q: 'auto=halls&sim=6&q=1&norender&lvl=15&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; window.__immortal = true; G.hero.quest = 8; G.hero.flags.stonewarden = true; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 7; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    for (let k = 0; k < 40; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 2, 3, 4][Math.floor(Math.random() * 5)], aim: null }); }); await pg.waitForTimeout(400); if (k % 10 === 9) await shot(); }
    const mid = await pg.evaluate(() => { const b = window.__G.zone.boss; return { moves: Object.keys(b?.mcd || {}), hp: b && Math.round(b.hp / b.hpMax * 100), phase: b?.phase }; });
    for (let k = 0; k < 8; k++) {
      const dead = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; window.__D.kill(b); G.player.x = b.x; G.player.z = b.z + b.radius + 1.5; return false; });
      if (dead) break;
      await pg.waitForTimeout(1500);
    }
    await pg.waitForTimeout(4000);
    await pg.evaluate(() => { const G = window.__G; const s = G.pickups.find((p) => p.kind === 'shard'); if (s) { G.player.x = s.x; G.player.z = s.z; } });
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate((mid) => { const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'); return { mid, boss: G.zone.boss?.dead, quest: G.hero.quest, king: G.hero.flags.king, shard: s && [s.x, s.z, s.y, s.t], pl: [G.player.x, G.player.z, G.player.dead], mode: G.mode, panel: G.panel }; }, mid);
  } },
  // Act II's cast lined up in the halls (no fighting): &zone=pass to see them in the snow
  cast2: { q: 'auto=' + (process.env.ZONE || 'halls') + '&sim=1&q=' + (process.env.Q || '1') + '&lvl=14&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(() => {
      const G = window.__G; window.__immortal = true;
      for (const a of G.actors) if (a.team === 'foe' && !a.boss) a.dead = true;
      for (const p of G.zone.packs) p.spawned = true;
      const ids = ['magmaHound', 'stoneborn', 'stonebornArbalest', 'runepriest', 'caveBat', 'deepworm'];
      ids.forEach((id, i) => { const f = G.zone.map.nearestFloor(G.player.x - 5 + i * 2, G.player.z - 3); const m = window.__D.spawnMonster(id, f.x, f.z, {}); m.speed = 0; G.actors.push(m); });
    });
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate(() => window.__G.actors.filter((a) => a.team === 'foe' && !a.dead).map((a) => a.kind + ':' + a.avatar.kind));
  } },
  ending2: { q: 'auto=town&sim=3&q=1&norender&lvl=16', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 9; G.hero.act1 = 1; });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {}));
    for (let i = 0; i < 3; i++) { await pg.waitForTimeout(600); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); }
    await pg.waitForTimeout(2500); await shot();
    await pg.waitForTimeout(4000); await shot();
    await pg.waitForTimeout(6000);
    for (let i = 0; i < 5; i++) { await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate(() => { const G = window.__G; return { quest: G.hero.quest, act2: G.hero.act2, panel: G.panel, mode: G.mode, extras: G.zone.extra.length }; });
  } },
  // the beacon's blessing after Act I, then an Act I veteran from before the blessings gets the Act II one on load
  boons: { q: 'auto=town&sim=3&q=1&norender&lvl=9', run: async (pg, shot) => {
    const before = await pg.evaluate(() => ({ dmg: window.__G.stats.dmgMult, life: window.__G.stats.lifeMax }));
    await pg.evaluate(() => { const G = window.__G; G.hero.act1 = 0; window.__D.emit('openPanel', 'boon', { act: 1 }); });
    await pg.waitForTimeout(800); await shot();
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(1500);
    const still = await pg.evaluate(() => window.__G.panel);
    await pg.click('[data-a="boon:ember"]'); await pg.waitForTimeout(1200); await shot();
    const after = await pg.evaluate(() => ({ dmg: window.__G.stats.dmgMult, life: window.__G.stats.lifeMax, boons: window.__G.hero.boons, panel: window.__G.panel }));
    await pg.evaluate(() => { const G = window.__G; G.hero.act2 = 0; window.__D.emit('actClosed'); });
    await pg.waitForTimeout(1500); await shot();
    const second = await pg.evaluate(() => ({ panel: window.__G.panel, timers: window.__G.timers.length, mode: window.__G.mode, act2: window.__G.hero.act2, boons: window.__G.hero.boons }));
    if (second.panel !== 'boon') return { before, still, after, second };
    await pg.click('[data-a="boon:anvil"]'); await pg.waitForTimeout(600);
    await pg.evaluate(() => window.__D.openPanel('inventory')); await pg.waitForTimeout(600); await shot();
    return pg.evaluate((o) => ({ ...o, final: window.__G.hero.boons, armor: window.__G.stats.armor }), { before, still, after, second });
  } },
  // ---------- Act III ----------
  // the Weeping Woods: what the zone holds, Elati's welcome, the three Tears of the Long Sorrow, then the packs one by one
  weep: { q: 'auto=weep&sim=6&q=1&norender&lvl=17&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const info = await pg.evaluate(async () => {
      const G = window.__G, z = G.zone, B = await import('/src/world/build.js'); window.__immortal = true; G.hero.quest = 11; G.hero.flags.act2 = true; G.player.hp = G.player.hpMax = 99999; z.bossSpawned = true;
      return { tears: z.interact.filter((i) => i.kind === 'tear').map((i) => i.id), npcs: z.actors.filter((a) => a.npc).map((a) => a.npc), boss: z.bossSpot?.kind, wind: B.WIND.uWind.value, autumn: B.WIND.uAutumn.value, gate: z.act3?.gate?.userData.progress, voices: z.voices?.length, packs: z.packs.length, gateOpen: z.map.walkable(z.L.spots.rootGate.x, z.L.spots.rootGate.z) };
    });
    // Elati at the Lanternglade
    await pg.evaluate(() => { const G = window.__G, e = G.zone.L.spots.npcs.elati; G.player.x = e.x; G.player.z = e.z + 2; for (const p of G.zone.packs) p.spawned = true; window.__D.emit('talk', 'elati', G.actors.find((a) => a.npc === 'elati')); });
    for (let i = 0; i < 8; i++) { await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 600 }).catch(() => {}); }
    const q12 = await pg.evaluate(() => window.__G.hero.quest);
    await shot();
    // the three Tears: a memory each (sepia, a choir, the narrator), then the buff
    const tears = [];
    for (const id of ['planting', 'sorrow', 'breaking']) {
      await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'tear' && i.id === id); const f = G.zone.map.nearestFloor(it.x, it.z + 1.6); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await pg.waitForTimeout(700);
      const mid = await pg.evaluate(() => ({ sepia: document.body.classList.contains('memory'), mode: window.__G.mode, who: document.querySelector('#dialog .who')?.textContent }));
      if (id === 'sorrow') await shot();
      for (let i = 0; i < 12; i++) { await pg.click('#dialog', { timeout: 600 }).catch(() => {}); await pg.waitForTimeout(200); }
      await pg.waitForTimeout(1500);
      tears.push(await pg.evaluate((id) => { const G = window.__G; return { id, mid: 0, flag: !!G.hero.flags['tear_' + id], buff: Math.round(G.player.buffs.memory || 0), sepia: document.body.classList.contains('memory'), mode: G.mode }; }, id));
      tears[tears.length - 1].mid = mid;
    }
    await pg.waitForTimeout(3000);
    const after = await pg.evaluate(() => ({ quest: window.__G.hero.quest }));
    // the packs
    const n = await pg.evaluate(() => { const z = window.__G.zone; for (const p of z.packs) p.spawned = false; z.bossSpawned = false; return z.packs.length; });
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 7))) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; const f = G.zone.map.nearestFloor(p.x, p.z + 4); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 12; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      await shot();
    }
    return pg.evaluate((o) => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop && !a.dead) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { ...o, kills: G.hero.stats.kills, lvl: G.hero.level, alive: kinds }; }, { info, q12, tears, after });
  } },
  // Silverhorn in the Glade of Stones, fought to the end: the white tree, the Root Gate drawing back, quest 14
  hart: { q: 'auto=weep&sim=6&q=1&norender&lvl=18&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G, b = G.zone.L.boss; window.__immortal = true; G.hero.quest = 13; G.hero.flags.metElati = true; const f = G.zone.map.nearestFloor(b.x, b.z + 9); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    for (let k = 0; k < 36; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(400); if (k % 12 === 11) await shot(); }
    const mid = await pg.evaluate(() => { const b = window.__G.zone.boss; return b && { moves: Object.keys(b.mcd || {}), hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase }; });
    for (let k = 0; k < 8; k++) {
      const dead = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; b.hidden = false; b.invuln = 0; window.__D.kill(b); return b.dead; });
      if (dead) break;
      await pg.waitForTimeout(800);
    }
    await pg.waitForTimeout(6000); await shot();
    return pg.evaluate((mid) => { const G = window.__G, z = G.zone, s = z.L.spots.rootGate, A = z.act3; return { mid, boss: z.boss?.dead, hart: G.hero.flags.hart, at: G.hero.flags.hartAt, quest: G.hero.quest, gate: A.gate.userData.progress, open: s.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), whiteTree: !!A.whiteTree, exit: z.interact.find((i) => i.to === 'heart')?.locked }; }, mid);
  } },
  // the Heartwood's three thorn walls, each withering when its Heartroot dies
  heart: { q: 'auto=heart&sim=6&q=1&norender&lvl=19&cls=' + (process.env.CLS || 'mage'), run: async (pg, shot) => {
    const info = await pg.evaluate(() => { const G = window.__G, z = G.zone; window.__immortal = true; G.hero.quest = 14; G.hero.flags.hart = true; G.player.hp = G.player.hpMax = 99999; return { walls: z.L.thorns.length, nodes: z.actors.filter((a) => a.kind === 'heartroot').map((a) => a.wall), shut: z.L.thorns.map((t) => t.cells.filter(([x, zz]) => !z.map.walkable(x + 0.5, zz + 0.5)).length), npcs: z.actors.filter((a) => a.npc).map((a) => a.npc), heart: !!z.heartProp, cocoons: z.act3.cocoons?.length, boss: z.bossSpot?.kind, text: document.querySelector('#quest')?.textContent }; });
    await pg.evaluate(() => window.__D.emit('talk', 'elati', window.__G.actors.find((a) => a.npc === 'elati')));
    for (let i = 0; i < 6; i++) { await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 600 }).catch(() => {}); }
    const shop = await pg.evaluate(() => window.__G.panel);
    await pg.evaluate(() => window.__D.closePanel());
    const steps = [];
    for (let i = 0; i < 3; i++) {
      await pg.evaluate((i) => { const G = window.__G, n = G.actors.find((a) => a.kind === 'heartroot' && a.wall === i && !a.dead); const f = G.zone.map.nearestFloor(n.x, n.z + 3); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 6; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2][Math.floor(Math.random() * 4)], aim: null }); }); await pg.waitForTimeout(300); }
      await pg.evaluate((i) => { const n = window.__G.actors.find((a) => a.kind === 'heartroot' && a.wall === i && !a.dead); if (n) window.__D.kill(n); }, i);
      await pg.waitForTimeout(2500); await shot();
      steps.push(await pg.evaluate((i) => { const G = window.__G, z = G.zone, t = z.L.thorns[i]; return { i, flag: !!G.hero.flags['thorn' + i], open: t.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), quest: document.querySelector('#quest')?.textContent }; }, i));
    }
    return { info, shop, steps };
  } },
  // the Lady: her three phases (the Heartroots at the alcoves, torn free, the Mourners), her fall, the First Autumn, the shard
  amaranthe: { q: 'auto=heart&sim=6&q=1&norender&lvl=20&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G, b = G.zone.L.boss; window.__immortal = true; G.hero.quest = 14; G.hero.flags.hart = true; for (const i of [0, 1, 2]) G.hero.flags['thorn' + i] = true; const f = G.zone.map.nearestFloor(b.x, b.z + 8); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    const swing = async (n) => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(350); } };
    await swing(20);
    const p0 = await pg.evaluate(() => { const b = window.__G.zone.boss; return b && { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, moves: Object.keys(b.mcd || {}) }; });
    // past the floor: she walks home and roots, and four Heartroots wake
    await pg.evaluate(() => { const b = window.__G.zone.boss; window.__D.kill(b); });
    await pg.waitForTimeout(5000); await shot();
    const p1 = await pg.evaluate(() => { const b = window.__G.zone.boss; return { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, rooted: b.rooted, nodes: (b.nodes || []).length, music: window.__G.zone.id }; });
    for (let k = 0; k < 4; k++) { await pg.evaluate(() => { const b = window.__G.zone.boss, n = (b.nodes || []).find((x) => !x.dead); if (n) window.__D.kill(n); }); await pg.waitForTimeout(1200); }
    await pg.waitForTimeout(2500);
    const p2 = await pg.evaluate(() => { const b = window.__G.zone.boss; return { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, rooted: b.rooted, dazed: b.dazed > 0 }; });
    await swing(14); await shot();
    for (let k = 0; k < 8; k++) {
      const dead = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; b.invuln = 0; b.ward = 0; window.__D.kill(b); return b.dead; });
      if (dead) break;
      await pg.waitForTimeout(800);
    }
    // her lucid moment, then the Autumn
    await pg.waitForTimeout(2500);
    const words = await pg.evaluate(() => document.querySelector('#dialog .txt')?.textContent);
    for (let i = 0; i < 10; i++) { await pg.click('#dialog', { timeout: 600 }).catch(() => {}); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(3000); await shot();
    await pg.waitForTimeout(8000);
    await pg.evaluate(() => { const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'); if (s) { G.player.x = s.x; G.player.z = s.z; } });
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(async (o) => { const G = window.__G, z = G.zone, B = await import('/src/world/build.js'), F = await import('/src/gfx/fx.js'); return { ...o, boss: z.boss?.dead, autumn: G.hero.flags.autumn, quest: G.hero.quest, wind: +B.WIND.uWind.value.toFixed(2), dry: +B.WIND.uAutumn.value.toFixed(2), beat: +F.FX.beat.toFixed(2), sapling: !!z.act3.sapling, elati: z.actors.some((a) => a.npc === 'elati'), mode: G.mode, panel: G.panel, shardLeft: G.pickups.some((p) => p.kind === 'shard') }; }, { p0, p1, p2, words });
  } },
  // after the story: the white tree and the Lady's sapling each raise an amber echo of their boss, fought again without story
  echo: { q: 'auto=weep&sim=6&q=1&norender&lvl=20&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const out = {};
    for (const zid of ['weep', 'heart']) {
      await pg.evaluate((zid) => { const G = window.__G; window.__immortal = true; G.hero.quest = 16; Object.assign(G.hero.flags, { hart: true, autumn: true, thorn0: true, thorn1: true, thorn2: true }); window.__D.enterZone(zid, { fresh: true }); G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; }, zid);
      await pg.waitForTimeout(1500);
      const before = await pg.evaluate(() => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); if (!it) return { echo: false }; const f = z.map.nearestFloor(it.x, it.z + 2); G.player.x = f.x; G.player.z = f.z; it.use(); it.use(); return { echo: it.boss, prompt: window.__D.t(it.prompt), extra: z.extra.length, foes: z.actors.filter((a) => a.boss).length }; });
      await pg.waitForTimeout(3500); await shot();
      const spawned = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return b && { kind: b.kind, echo: b.echo, awake: b.awake, bar: G.bossActor === b, bosses: G.zone.actors.filter((a) => a.boss).length, d: +Math.hypot(b.x - G.player.x, b.z - G.player.z).toFixed(1) }; });
      for (let k = 0; k < 14; k++) {
        const st = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return 'dead'; for (const n of b.nodes || []) if (!n.dead) { window.__D.kill(n); return 'node'; } b.hidden = false; b.ward = 0; if (!b.rooted && !b.goingHome) { b.invuln = 0; window.__D.kill(b); } return b.dead ? 'dead' : 'hit'; });
        if (st === 'dead') break;
        await pg.waitForTimeout(1200);
      }
      await pg.waitForTimeout(4000); await shot();
      out[zid] = await pg.evaluate((o) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); return { ...o, dead: z.boss?.dead, bar: !!G.bossActor, quest: G.hero.quest, hart: G.hero.flags.hart, autumn: G.hero.flags.autumn, used: it?.used, extra: z.extra.length, shard: G.pickups.some((p) => p.kind === 'shard'), dialog: !document.querySelector('#dialog')?.hidden, mode: G.mode, loot: G.pickups.filter((p) => p.item).length }; }, { before, spawned });
    }
    return out;
  } },
  // the third shard on the beacon: the green-gold fire no hand lit, Isarn's lantern, his partial confession, the act panel, the blessing
  ending3: { q: 'auto=town&sim=1&q=1&norender&lvl=20', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 15; G.hero.act1 = 1; G.hero.act2 = 1; G.hero.boons = ['ember', 'forge']; Object.assign(G.hero.flags, { act1: true, act2: true, hart: true, autumn: true }); });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', window.__G.actors.find((a) => a.npc === 'wayfarer')));
    // through Isarn's two lines into the beacon scene (game time: wait on the scene's own clock)
    // dialogs advance on Enter (the key handler finishes the line, then moves on), whatever the frame rate
    const next = () => pg.evaluate(() => window.__D.emit('key', 'enter'));
    for (let i = 0; i < 30; i++) { const c = await pg.evaluate(() => !!window.__G.cine); if (c) break; await next(); await pg.waitForTimeout(400); }
    const at = (t) => pg.waitForFunction((t) => !window.__G.cine || window.__G.cine.t >= t, t, { timeout: 180000 });
    await at(5.8); await shot();
    await at(8.6); const lean = await pg.evaluate(() => ({ t: +window.__G.cine?.t.toFixed(1), x: window.__G.cine?.x, far: window.__G.zone.extra.filter((e) => e.isSprite).length })); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    const lines = [];
    for (let i = 0; i < 8; i++) { await next(); await pg.waitForTimeout(200); lines.push(await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent?.slice(0, 40))); await next(); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(1500); await shot();
    const act = await pg.evaluate(() => ({ panel: window.__G.panel, done: document.querySelector('.act-h')?.textContent, next: [...document.querySelectorAll('#panel .muted')].map((e) => e.textContent).pop() }));
    await pg.click('[data-a="close"]').catch(() => {}); await pg.waitForTimeout(3000); await shot();
    const boon = await pg.evaluate(() => ({ panel: window.__G.panel, title: document.querySelector('.act-h')?.textContent, cards: [...document.querySelectorAll('[data-a^="boon:"]')].map((e) => e.dataset.a) }));
    await pg.click('[data-a="boon:amber"]').catch(() => {}); await pg.waitForTimeout(1000);
    return pg.evaluate((o) => { const G = window.__G, h = G.hero; return { ...o, quest: h.quest, act3: h.act3, flag: h.flags.act3, boons: h.boons, regen: G.stats.regen, lifeOnHit: G.stats.lifeOnHit, extras: G.zone.extra.length, panel: G.panel }; }, { act, boon, lines, lean });
  } },
  // Act III's cast lined up in the Weeping Woods (no fighting); &ZONE=heart to see them in the root caves
  cast3: { q: 'auto=' + (process.env.ZONE || 'weep') + '&sim=1&q=' + (process.env.Q || '1') + '&lvl=17&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(async () => {
      const G = window.__G, gfx = await import('/src/gfx/gfx.js'); window.__immortal = true;
      for (const a of G.actors) if (a.team === 'foe') a.dead = true;
      for (const p of G.zone.packs) p.spawned = true;
      G.zone.bossSpawned = true;
      const ids = ['hollowed', 'rootling', 'amberMoth', 'amberBear', 'rootsworn', 'rootswornArcher', 'rootwarden', 'mourner', 'heartroot', 'silverhorn', 'amaranthe'];
      const c = G.zone.L.spots.lanternglade || G.zone.L.spots.waypoint;
      ids.forEach((id, i) => { const f = G.zone.map.nearestFloor(c.x - 11 + i * 2.2, c.z - 2); const m = window.__D.spawnMonster(id, f.x, f.z, { surface: true }); m.dormant = true; m.disguised = false; m.under = false; m.y = 0; m.aggro = false; if (m.avatar) m.avatar.group.visible = true; m.rot = 0; G.actors.push(m); });
      const h = G.zone.map.nearestFloor(c.x, c.z + 5.5); G.player.x = h.x; G.player.z = h.z;
      gfx.R.cam.dist = 23; gfx.updateCamera(0, c.x, c.z + 2, true);
    });
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(() => window.__G.actors.filter((a) => a.team === 'foe' && !a.dead).map((a) => a.kind + ':' + (a.avatar?.kind || '-')));
  } },
  // ---------- Act IV ----------
  // q17 in town (the rest of the truth, Brokka and the Cradle, the fire leaving), then the Field of Ash: the camp, the five
  // lamps and their memories (white ash), a lamp snuffed and lit again, the altars, the checkpoint, the packs
  ashfield: { q: 'auto=town&sim=4&q=1&norender&lvl=23&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 16; h.act1 = h.act2 = h.act3 = 1; h.boons = ['ember', 'forge', 'amber']; Object.assign(h.flags, { act1: true, act2: true, act3: true, hart: true, autumn: true }); });
    const talk = () => pg.evaluate(() => window.__D.emit('talk', 'wayfarer', window.__G.actors.find((a) => a.npc === 'wayfarer')));
    await talk(); await A4.dialogs(pg, 6);
    const q17 = await pg.evaluate(() => { const G = window.__G, p = G.panel; window.__D.closePanel(); return { quest: G.hero.quest, after3: G.hero.flags.after3, panel: p }; });
    // the e-lines, Brokka walking up with the Cradle, her lines, then the scene
    await talk();
    for (let i = 0; i < 80 && !(await pg.evaluate(() => !!window.__G.cine)); i++) { await A4.enter(pg); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(3500); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    await A4.dialogs(pg, 6);
    await pg.waitForTimeout(1500); await shot();
    const town = await pg.evaluate(() => { const G = window.__G, z = G.zone, R = window.__R; return { quest: G.hero.quest, fireTaken: G.hero.flags.fireTaken, beaconOn: z.town?.beaconOn, beaconLight: [...R.sources].some((s) => s.key === 'beacon'), far: (z.town?.far || []).filter(Boolean).length, torches: z.actors.filter((a) => a.npc === 'villager' && a.avatar?.held.R).length, isarn: z.actors.some((a) => a.npc === 'wayfarer'), exitLocked: z.interact.find((i) => i.to === 'ashfield')?.locked }; });
    // down the north path to the Field
    await pg.evaluate(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'ashfield').use());
    await pg.waitForFunction(() => window.__G.zone?.id === 'ashfield' && !document.getElementById('fade')?.classList.contains('on'), null, { timeout: 180000 });
    await pg.waitForTimeout(1500); await shot();
    const field = await pg.evaluate(() => { const G = window.__G, z = G.zone; for (const p of z.packs) p.spawned = true; z.bossSpawned = true; return { quest: G.hero.quest, npcs: z.actors.filter((a) => a.npc).map((a) => a.key), lamps: z.act4.lamps.map((l) => l.id + (l.lit ? '*' : '')), altars: z.act4.altars.length, braziers: z.act4.braziers.filter((b) => b.lit).length, voices: z.voices.length, light: window.__act4.heroLightR() }; });
    // Isarn and Brokka at the Dark Beacon
    await pg.evaluate(() => { const G = window.__G, a = G.actors.find((x) => x.key === 'isarn'); G.player.x = a.x; G.player.z = a.z + 2; window.__D.emit('talk', 'wayfarer', a); });
    await A4.dialogs(pg, 6);
    await pg.evaluate(() => { const G = window.__G; window.__D.emit('talk', 'brokka', G.actors.find((x) => x.key === 'brokka')); });
    await A4.dialogs(pg, 3); await pg.evaluate(() => window.__D.closePanel());
    // the five lamps: each a short touch, a pool of light, a place to wake, and a memory in white ash
    const lamps = [];
    for (const id of ['l1', 'l2', 'l3', 'l4', 'l5']) {
      await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === id), f = G.zone.map.nearestFloor(it.x + 1.4, it.z + 1.4); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await pg.waitForFunction(() => !!window.__G.cine || document.querySelector('#dialog:not([hidden])'), null, { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(1200);
      const mid = await pg.evaluate(() => ({ ash: document.body.classList.contains('memory-ash'), who: document.querySelector('#dialog .who')?.textContent, figs: window.__G.zone.actors.filter((a) => a.npc && ['isarnBoy', 'arna', 'arnaOld', 'ivarGhost'].includes(a.npc)).map((a) => a.npc) }));
      if (id === 'l5') await shot();
      await A4.dialogs(pg, 8);
      await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 60000 });
      await pg.waitForTimeout(600);
      lamps.push(await pg.evaluate((id) => { const G = window.__G, F = G.hero.flags, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === id); return { id, mid: 0, lit: it.lit, lamp: !!F['lamp_' + id], mem: !!F['mem_' + id], pool: !!window.__act4.getLightPool('lamp:' + id), buff: Math.round(G.player.buffs.memory || 0), ash: document.body.classList.contains('memory-ash'), quest: G.hero.quest }; }, id));
      lamps[lamps.length - 1].mid = mid;
    }
    await pg.waitForTimeout(3000);
    const after = await pg.evaluate(() => { const G = window.__G, z = G.zone; return { quest: G.hero.quest, checkpoint: z.checkpoint && [+z.checkpoint.x.toFixed(1), +z.checkpoint.z.toFixed(1)], hook: z.actors.some((a) => a.key === 'isarnHook'), camp: z.actors.some((a) => a.key === 'isarn'), voices: z.voices.filter((v) => v.done).length }; });
    // a lamp put out (as a Smoke-eater would) and lit again by a touch
    const snuff = await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === 'l2'); it.snuff(); return { lit: it.lit, used: it.used, prompt: it.prompt, pool: !!window.__act4.getLightPool('lamp:l2') }; });
    await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === 'l2'), f = G.zone.map.nearestFloor(it.x + 1.4, it.z + 1.4); G.player.x = f.x; G.player.z = f.z; it.use(); });
    await pg.waitForTimeout(2200);
    snuff.relit = await pg.evaluate(() => { const it = window.__G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === 'l2'); return { lit: it.lit, pool: !!window.__act4.getLightPool('lamp:l2') }; });
    // Isarn at the empty hook
    await pg.evaluate(() => { const G = window.__G, a = G.actors.find((x) => x.key === 'isarnHook'); if (a) window.__D.emit('talk', 'wayfarer', a); });
    await A4.dialogs(pg, 5);
    // the three altars: the Throne taken, the Forge and the Unfading refused
    const armor0 = await pg.evaluate(() => window.__G.stats.armor);
    const altars = [];
    for (const [id, pick] of [['throne', 'taken'], ['forge', 'refused'], ['unfading', 'refused']]) {
      await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'altar' && i.id === id), f = G.zone.map.nearestFloor(it.x, it.z); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await A4.dialogs(pg, 3, () => window.__G.panel === 'altar');
      const panel = await pg.evaluate(() => ({ panel: window.__G.panel, cards: [...document.querySelectorAll('[data-a^="gift:"]')].map((e) => e.dataset.a) }));
      if (id === 'throne') await shot();
      await pg.click(`[data-a="gift:${pick}"]`).catch(() => {});
      await pg.waitForTimeout(600);
      altars.push(await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'altar' && i.id === id); return { id, gift: G.hero.flags.gifts?.[id], state: it.mesh.userData.state, used: it.used }; }, id));
      altars[altars.length - 1].panel = panel;
    }
    const gifts = await pg.evaluate((a0) => ({ armor0: a0, armor: window.__G.stats.armor, unbound: !!window.__G.hero.flags.unbound }), armor0);
    // she falls: she wakes at the last lamp she lit
    await pg.evaluate(() => { const G = window.__G; window.__immortal = false; G.player.dead = true; window.__D.emit('respawn', false); });
    await pg.waitForFunction(() => window.__G.zone?.id === 'ashfield' && !document.getElementById('fade')?.classList.contains('on') && !window.__G.player.dead, null, { timeout: 60000 });
    await pg.waitForTimeout(800);
    const wake = await pg.evaluate(() => { const G = window.__G, c = G.zone.checkpoint; window.__immortal = true; return { d: +Math.hypot(G.player.x - c.x, G.player.z - c.z).toFixed(1) }; });
    // the packs (the Ash-Fallen line, the bowmen, the Lampless, the Smoke-eaters, the ticks, the Ashwing)
    const n = await pg.evaluate(() => { const z = window.__G.zone; for (const p of z.packs) p.spawned = false; return z.packs.length; });
    for (let i = 0; i < n; i += 2) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; const f = G.zone.map.nearestFloor(p.x, p.z + 5); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 10; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      if (i % 6 === 0) await shot();
    }
    return pg.evaluate((o) => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop && !a.dead) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { ...o, kills: G.hero.stats.kills, lvl: G.hero.level, alive: kinds, says: window.__says.slice(0, 40) }; }, { q17, town, field, lamps, after, snuff, altars, gifts, wake });
  } },
  // Ivar at the Anvil Gate, fought to the end: his Dark (the braziers relit by hand), his son's light, the three falters, his
  // last words, the Last Lamp lit, the Lampless kneeling, the gate open, quest 20
  ivar: { q: 'auto=ashfield&sim=6&q=1&norender&lvl=24&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 19; for (const id of ['l1', 'l2', 'l3', 'l4', 'l5']) { h.flags['lamp_' + id] = true; h.flags['mem_' + id] = true; } Object.assign(h.flags, { act3: true, fireTaken: true }); window.__D.enterZone('ashfield', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x + 2.5, b.z + 3); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; });
    // (a little off the axis: the Last Lamp in the middle of the plaza would hide him from straight south)
    await pg.waitForTimeout(3500); await shot();
    const swing = async (n) => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(350); } };
    await swing(16);
    const p0 = await pg.evaluate(() => { const b = window.__G.zone.boss; return b && { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, awake: b.awake, moves: Object.keys(b.mcd || {}) }; });
    // past 60%: the Dark
    await A4.hit(pg, 0.6);
    await pg.waitForTimeout(2500);
    const p1 = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, z = G.zone; return { phase: b.phase, shrouded: b.shrouded, light: window.__act4.heroLightR(), braziers: z.act4.braziers.filter((x) => x.lit).length }; });
    await shot();
    // the hero lights the three braziers again, one touch each
    for (let i = 0; i < 3; i++) {
      await pg.evaluate((i) => { const G = window.__G, it = G.zone.act4.braziers[i], f = G.zone.map.nearestFloor(it.x + 1.5, it.z + 1.5); G.player.x = f.x; G.player.z = f.z; G.player.act = null; it.use(); }, i);
      await pg.waitForTimeout(1600);
      await pg.evaluate((i) => { const it = window.__G.zone.act4.braziers[i]; if (!it.lit) it.relight(); }, i);
    }
    // (his Lantern Sweep may have put one out again meanwhile: all three burning at once is what blinds him)
    await pg.evaluate(() => { for (const it of window.__G.zone.act4.braziers) if (!it.lit) it.relight(); });
    await pg.waitForTimeout(500);
    const blind = await pg.evaluate(() => { const b = window.__G.zone.boss; return { allLit: b.allLit, dazed: b.dazed > 0, unshroud: b.unshroud > 0, braziers: window.__G.zone.act4.braziers.filter((x) => x.lit).length }; });
    // past 30%: Remembering. Isarn runs in from the Graves; his lantern ends the dark
    await A4.hit(pg, 0.3);
    await pg.waitForTimeout(6000); await shot();
    const p2 = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, I = G.zone.ivarIsarn; return { phase: b.phase, dark: b.dark, gold: !!window.__act4.getLightPool('ivarGold'), light: window.__act4.heroLightR(), isarn: I && +Math.hypot(I.x - b.x, I.z - b.z).toFixed(1) }; });
    for (const f of [0.24, 0.17, 0.09]) { await pg.evaluate((f) => { const b = window.__G.zone.boss; b.dazed = 0; b.hp = b.hpMax * f; }, f); await pg.waitForTimeout(900); }
    const falters = await pg.evaluate(() => window.__G.zone.boss.falters);
    // his death: the twist, the lantern's laugh, the Last Lamp, the gate
    await A4.hit(pg, null);
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(2000); await shot();
    const words = [];
    for (let i = 0; i < 40; i++) { const w = await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent?.slice(0, 30)); if (w && words[words.length - 1] !== w) words.push(w); await A4.enter(pg); await pg.waitForTimeout(300); if (await pg.evaluate(() => !window.__G.cine && !document.querySelector('#dialog:not([hidden])') && window.__G.hero.flags.ivar)) break; }
    await pg.waitForFunction(() => !window.__G.cine && window.__G.hero.quest >= 20, null, { timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate((o) => { const G = window.__G, z = G.zone, F = G.hero.flags, gate = z.L.gate; return { ...o, falters: o.falters, words: o.words.length, ivar: F.ivar, ivarDown: F.ivarDown, quest: G.hero.quest, gateOpen: gate.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), gateProgress: +z.act4.gate.userData.progress.toFixed(2), lastLamp: z.act4.lastLampIt.lit, lampless: z.actors.filter((a) => a.kind === 'lampless' && !a.dead).length, isarn: z.actors.filter((a) => a.npc === 'wayfarer').length, echo: !!z.interact.find((i) => i.kind === 'echo'), exit: z.interact.find((i) => i.to === 'forge')?.locked, says: window.__says.filter((k) => /ivar|isarn|voice/.test(k)) }; }, { p0, p1, blind, p2, falters, words });
  } },
  // the Ashen Forge: the flues breathing, Brokka's camp, the three Great Bellows woken (a fire-pit snuffed and relit), the heat
  // rising, the slag plug melting, Elati at the camp, quest 21
  forge: { q: 'auto=forge&sim=6&q=1&norender&lvl=26&cls=' + (process.env.CLS || 'mage'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 20; Object.assign(h.flags, { act3: true, fireTaken: true, ivar: true }); window.__D.enterZone('forge', { fresh: true }); G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(1500);
    const B = await pg.evaluate(async () => { const G = window.__G, z = G.zone, Fg = await import('/src/game/forge.js'), Bd = await import('/src/world/build.js'); return { flues: (Fg.flues() || []).length, period: Fg.flues()?.[0] && Fg.fluePeriod(Fg.flues()[0]), heat: Bd.HEAT.k, bellows: z.act4.bellows.map((b) => b.id + (b.lit ? '*' : '')), npcs: z.actors.filter((a) => a.npc).map((a) => a.key), plug: !!z.act4.plug, boss: z.bossSpot?.kind || null }; });
    await pg.evaluate(() => { const G = window.__G, a = G.actors.find((x) => x.key === 'brokka'); G.player.x = a.x; G.player.z = a.z + 2; window.__D.emit('talk', 'brokka', a); });
    await A4.dialogs(pg, 4); await pg.evaluate(() => window.__D.closePanel());
    await shot();
    const runs = [];
    for (const id of [0, 1, 2]) {
      await pg.evaluate((id) => { const G = window.__G, z = G.zone, it = z.act4.bellows[id], f = z.map.nearestFloor(it.x, it.z); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await pg.waitForFunction(() => window.__G.zone.run?.ready, null, { timeout: 40000 }).catch(() => {});
      const r = await pg.evaluate(() => { const R0 = window.__G.zone.run; return R0 && { ready: R0.ready, t: +R0.t.toFixed(1), brokka: R0.it && +Math.hypot(window.__G.actors.find((a) => a.key === 'brokka').x - R0.b.pump.x, window.__G.actors.find((a) => a.key === 'brokka').z - R0.b.pump.z).toFixed(1) }; });
      if (id === 0) {
        // the fire-pit eaten: the hold waits until it burns again
        await pg.evaluate(() => window.__G.zone.run.it.snuff());
        await pg.waitForTimeout(800);
        await shot();
        r.out = await pg.evaluate(() => ({ paused: window.__G.zone.run.paused, out: window.__G.zone.run.out, ring: !document.getElementById('ring')?.hidden, label: document.querySelector('#ring b')?.textContent }));
        await pg.evaluate(() => { const G = window.__G, it = G.zone.run.it; G.player.act = null; it.use(); });
        await pg.waitForTimeout(1800);
        await pg.evaluate(() => { const it = window.__G.zone.run?.it; if (it && !it.lit) it.relight(); });
        r.relit = await pg.evaluate(() => window.__G.zone.run?.it.lit);
      }
      // the hold: she fights by the bellows, cuts down the Smoke-eaters that go for the fire-pit, lights it again if one
      // ate it, and (after the first seconds) the clock is moved on to the last breath
      const hold = (bump) => pg.evaluate((bump) => {
        const G = window.__G, z = G.zone, R0 = z.run, pl = G.player; if (!R0) return true;
        for (const a of z.actors) if (a.kind === 'smokeEater' && !a.dead && (a.lamp === R0.it || Math.hypot(a.x - R0.it.x, a.z - R0.it.z) < 5)) { window.__D.kill(a); window.__eaten = (window.__eaten || 0) + 1; }
        if (!R0.it.lit) { if (!pl.act) { const f = z.map.nearestFloor(R0.it.x, R0.it.z); pl.x = f.x; pl.z = f.z; R0.it.use(); } }
        else { pl.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2][Math.floor(Math.random() * 4)], aim: null }); }
        if (bump) R0.t = Math.max(R0.t, 18.5);
        return false;
      }, bump);
      for (let k = 0; k < 6; k++) { await hold(false); await pg.waitForTimeout(450); }
      r.waves = await pg.evaluate(() => window.__G.zone.run?.wi);
      for (let k = 0; k < 80 && !(await hold(true)); k++) await pg.waitForTimeout(500);
      r.eatersCut = await pg.evaluate(() => window.__eaten || 0);
      await pg.waitForTimeout(4000);
      r.after = await pg.evaluate(async (id) => { const G = window.__G, Fg = await import('/src/game/forge.js'), Bd = await import('/src/world/build.js'); return { done: !!G.hero.flags['bellows' + id], heat: G.hero.flags.heat, heatK: +Bd.HEAT.k.toFixed(2), period: Fg.flues()?.[0] && Fg.fluePeriod(Fg.flues()[0]), quest: G.hero.quest }; }, id);
      runs.push(r);
    }
    await pg.waitForTimeout(5000); await shot();
    return pg.evaluate((o) => { const G = window.__G, z = G.zone, P0 = z.L.plug; return { ...o, plug: G.hero.flags.plug, open: P0.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), quest: G.hero.quest, elati: z.actors.some((a) => a.key === 'elati'), boss: z.bossSpot?.kind || null, says: window.__says.filter((k) => /brokka|voice|forge/.test(k)) }; }, { B, runs });
  } },
  // Karthax at the Anvil of the Crown: his arrival (the brow-stone, the shards, the slag), the gifts taken back, the three
  // cages broken by his own Hammerfall, Isarn's light in the last fire, the beacon-keeper's answer, his death, the Unmaking
  karthax: { q: 'auto=forge&sim=6&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = window.__tough = true; h.quest = 21; Object.assign(h.flags, { act3: true, fireTaken: true, ivar: true, bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, gifts: { throne: 'taken', forge: 'refused' } }); window.__D.refreshStats(); window.__D.enterZone('forge', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x, b.z + 15); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; });
    const armor0 = await pg.evaluate(() => window.__G.stats.armor);
    await pg.waitForTimeout(2000);
    // closer: Karthax pours himself out of the slag
    await pg.evaluate(() => { const G = window.__G, b = G.zone.L.boss, f = G.zone.map.nearestFloor(b.x, b.z + 8); G.player.x = f.x; G.player.z = f.z; });
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 30000 }).catch(() => {});
    const arrive = await pg.evaluate(() => { const b = window.__G.zone.boss; return { hidden: b?.hidden, hold: b?.holdWake }; });
    for (let i = 0; i < 40 && (await pg.evaluate(() => !!window.__G.cine)); i++) { await A4.enter(pg); await pg.waitForTimeout(400); if (i === 12) await shot(); }
    await pg.waitForTimeout(2500); await shot();
    arrive.after = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return { hidden: b.hidden, hold: b.holdWake, awake: b.awake, y: b.y, browstone: G.hero.flags.browstone, lantern: G.zone.act4.npcs.isarn?.a.lantern }; });
    const swing = async (n) => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(350); } };
    await swing(12);
    // past 65%: the cages, the gifts taken back
    await A4.hit(pg, 0.65);
    await pg.waitForTimeout(4000); await shot();
    const cages = await pg.evaluate((a0) => { const G = window.__G, b = G.zone.boss; return { phase: b.phase, statues: (b.cages || []).map((s) => s.keeper + ':' + s.blows), giftsTaken: G.hero.flags.giftsTaken, armor0: a0, armor: G.stats.armor }; }, armor0);
    // stand by each statue until his Hammerfall breaks it
    for (let k = 0; k < 24; k++) {
      const left = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, s = (b.cages || []).find((x) => !x.dead); if (!s) return 0; const a = Math.atan2(s.x - b.x, s.z - b.z), f = G.zone.map.nearestFloor(s.x - Math.sin(a) * 1.6, s.z - Math.cos(a) * 1.6); G.player.x = f.x; G.player.z = f.z; return (b.cages || []).filter((x) => !x.dead).length; });
      if (!left) break;
      await pg.waitForTimeout(2500);
    }
    const broken = await pg.evaluate(() => { const b = window.__G.zone.boss; return { cages: b.cages ? b.cages.filter((s) => !s.dead).length : 0, phase: b.phase, hp: Math.round(b.hp / b.hpMax * 100) }; });
    // the last fire: Isarn's lantern walks toward him
    await pg.evaluate(() => { const b = window.__G.zone.boss; if (b.cages) for (const s of b.cages) { s.dead = true; s.hp = 0; } b.dazed = 0; });
    await pg.waitForTimeout(6500); await shot();
    const last = await pg.evaluate(() => { const G = window.__G, z = G.zone, b = z.boss, I = z.act4.npcs.isarn?.a, P0 = window.__act4.getLightPool('isarn'); return { phase: b.phase, light: window.__act4.heroLightR(), pool: P0 && [+P0.x.toFixed(1), +P0.z.toFixed(1), P0.r], isarn: I && +Math.hypot(I.x - b.x, I.z - b.z).toFixed(1), ghosts: window.__act4.lightPools().filter((p) => p.tag === 'ghost').length }; });
    await pg.evaluate(() => { const b = window.__G.zone.boss; b.dazed = 0; b.hp = b.hpMax * 0.14; });
    await pg.waitForTimeout(5000);
    // his death, and the Unmaking
    await A4.hit(pg, null);
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 20000 }).catch(() => {});
    const words = [];
    for (let i = 0; i < 160; i++) {
      const w = await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .who')?.textContent);
      if (w && words[words.length - 1] !== w) words.push(w);
      await A4.enter(pg); await pg.waitForTimeout(400);
      if (i === 30 || i === 60) await shot();
      if (await pg.evaluate(() => window.__G.hero.flags.crownUnmade && !window.__G.cine)) break;
    }
    await pg.waitForTimeout(9000); await shot();
    return pg.evaluate(async (o) => { const G = window.__G, z = G.zone, F = G.hero.flags, Fg = await import('/src/game/forge.js'), Bd = await import('/src/world/build.js'); return { ...o, words: o.words, karthax: F.karthax, crownUnmade: F.crownUnmade, quest: G.hero.quest, heat: Bd.HEAT.k, flues: !!Fg.flues(), echo: !!z.interact.find((i) => i.kind === 'echo'), npcs: z.actors.filter((a) => a.npc && !a.removed).map((a) => a.npc), mode: G.mode, says: window.__says.filter((k) => /karthax|isarn|cage|u\.|k\./.test(k)) }; }, { arrive, cages, broken, last, words });
  } },
  // how long the Three Cages last (game seconds), the hero keeping by a standing statue as a player would. GIFTS=taken|refused
  // (all three); RUNS=n fights
  cagetime: { q: 'auto=forge&sim=6&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'ranger'), run: async (pg) => {
    const gift = process.env.GIFTS || 'taken', out = [];
    for (let run = 0; run < +(process.env.RUNS || 3); run++) {
      await pg.evaluate((gift) => { const G = window.__G, h = G.hero; window.__immortal = window.__tough = true; h.quest = 21; Object.assign(h.flags, { act3: true, fireTaken: true, ivar: true, bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, karthax: false, giftsTaken: false, gifts: { throne: gift, forge: gift, unfading: gift } }); window.__D.refreshStats(); window.__D.enterZone('forge', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x, b.z + 8); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; }, gift);
      await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 30000 }).catch(() => {});
      for (let i = 0; i < 40 && (await pg.evaluate(() => !!window.__G.cine || !!document.querySelector('#dialog:not([hidden])'))); i++) { await A4.enter(pg); await pg.waitForTimeout(300); }
      await pg.waitForFunction(() => window.__G.zone.boss?.awake, null, { timeout: 20000 }).catch(() => {});
      await A4.hit(pg, 0.65);
      await pg.waitForFunction(() => !!window.__G.zone.boss?.cages, null, { timeout: 20000 }).catch(() => {});
      for (let i = 0; i < 20 && (await pg.evaluate(() => !!document.querySelector('#dialog:not([hidden])'))); i++) { await A4.enter(pg); await pg.waitForTimeout(200); }
      const t0 = await pg.evaluate(() => window.__G.hero.stats.time);
      let r = null;
      for (let k = 0; k < 600; k++) {
        r = await pg.evaluate((t0) => { const G = window.__G, b = G.zone.boss, t = G.hero.stats.time - t0; if (!b.cages) return { t, done: true }; if (G.mode !== 'play') return { t };
          const pl = G.player, up = b.cages.filter((s) => !s.dead); let s = up.find((x) => x === window.__keepBy) || up.sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0]; window.__keepBy = s;
          if (Math.hypot(s.x - pl.x, s.z - pl.z) > 2.6) { const a = Math.atan2(s.x - b.x, s.z - b.z), f = G.zone.map.nearestFloor(s.x - Math.sin(a) * 1.8, s.z - Math.cos(a) * 1.8); pl.x = f.x; pl.z = f.z; }
          return { t, left: up.map((x) => x.keeper + x.blows).join(' ') }; }, t0);
        if (r.done || r.t > 150) break;
        await pg.waitForTimeout(250);
      }
      out.push(+r.t.toFixed(1));
    }
    return { gift, secs: out };
  } },
  // q22: the Night Without Fires in Whitecliff (the beacon cold, no far fires, the torches), Elianthe, the new fire lit from
  // Isarn's lantern, the far fires answering one by one (the fourth too), the act panel, the Unbound blessing, the staff
  ending4: { q: 'auto=town&sim=2&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 22; h.act1 = h.act2 = h.act3 = 1; h.boons = ['ember', 'forge', 'amber']; Object.assign(h.flags, { act1: true, act2: true, act3: true, after3: true, fireTaken: true, ivar: true, plug: true, heat: 3, karthax: true, crownUnmade: true, giftsTaken: true, gifts: { throne: 'refused', forge: 'refused', unfading: 'refused' }, unbound: true }); window.__D.refreshStats(); window.__D.enterZone('town', { fresh: true }); });
    await pg.waitForTimeout(1200);
    const night = await pg.evaluate(() => { const G = window.__G, z = G.zone, R = window.__R; return { beaconOn: z.town.beaconOn, beaconLight: [...R.sources].some((s) => s.key === 'beacon'), far: z.town.far.filter(Boolean).length, torches: z.actors.filter((a) => a.npc === 'villager' && a.avatar?.held.R).length, isarn: z.actors.some((a) => a.npc === 'wayfarer'), beacon: !!z.interact.find((i) => i.kind === 'beacon') }; });
    await pg.waitForTimeout(1500);
    const elianthe = await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent);
    await A4.dialogs(pg, 3); await shot();
    const crit0 = await pg.evaluate(() => window.__G.stats.critC);
    await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'beacon'); G.player.x = it.x; G.player.z = it.z + 1; it.use(); });
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 20000 });
    const at = (t) => pg.waitForFunction((t) => !window.__G.cine || window.__G.cine.t >= t, t, { timeout: 180000 });
    await at(3); await shot();
    await at(9); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    await pg.waitForTimeout(1500); await shot();
    const act = await pg.evaluate(() => ({ panel: window.__G.panel, done: document.querySelector('.act-h')?.textContent, sub: document.querySelector('#panel .pn-b p')?.textContent, next: [...document.querySelectorAll('#panel .muted')].map((e) => e.textContent).pop() }));
    await pg.click('[data-a="close"]').catch(() => {}); await pg.waitForTimeout(3000); await shot();
    const boon = await pg.evaluate(() => ({ panel: window.__G.panel, title: document.querySelector('.act-h')?.textContent, unbound: document.querySelector('.unbound-k')?.textContent, cards: [...document.querySelectorAll('[data-a^="boon:"]')].map((e) => e.dataset.a + ' ' + e.querySelector('p')?.textContent) }));
    await pg.click('[data-a="boon:lantern"]').catch(() => {}); await pg.waitForTimeout(1500);
    const lit = await pg.evaluate((c0) => { const G = window.__G, z = G.zone, R = window.__R; return { newFire: G.hero.flags.newFire, beaconLight: [...R.sources].some((s) => s.key === 'beacon'), far: z.town.far.filter(Boolean).length, torches: z.actors.filter((a) => a.npc === 'villager' && a.avatar?.held.R).length, staff: !!z.town.staff, crit0: +c0.toFixed(1), crit: +G.stats.critC.toFixed(1), boons: G.hero.boons, quest: G.hero.quest, act4: G.hero.act4, flag: G.hero.flags.act4 }; }, crit0);
    // the staff: «Rest.», and the Shadow Gates
    await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'staff'); G.player.x = it.x; G.player.z = it.z + 1.5; it.use(); });
    await pg.waitForTimeout(2500);
    lit.staffPanel = await pg.evaluate(() => window.__G.panel);
    return { night, elianthe, act, boon, lit, says: await pg.evaluate(() => window.__says) };
  } },
  // Act IV's cast lined up on the Field (no fighting); &ZONE=forge to see them in the Forge
  cast4: { q: 'auto=' + (process.env.ZONE || 'ashfield') + '&sim=1&q=' + (process.env.Q || '1') + '&lvl=23&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(async () => {
      const G = window.__G, gfx = await import('/src/gfx/gfx.js'); window.__immortal = true;
      for (const a of G.actors) if (a.team === 'foe') a.dead = true;
      for (const p of G.zone.packs) p.spawned = true;
      G.zone.bossSpawned = true;
      const ids = ['lampless', 'ashSpear', 'ashDwarf', 'ashBow', 'smokeEater', 'ashwing', 'emberTick', 'ashsmith', 'hammerhorn', 'ivar', 'karthax'];
      const c = G.zone.L.spots.camp || G.zone.L.spots.waypoint;
      ids.forEach((id, i) => { const f = G.zone.map.nearestFloor(c.x - 12 + i * 2.4, c.z - 3); const m = window.__D.spawnMonster(id, f.x, f.z, { surface: true, free: true, dormant: false }); m.dormant = true; m.disguised = false; m.under = false; m.y = 0; m.airborne = false; m.aggro = false; if (m.avatar) m.avatar.group.visible = true; m.rot = 0; G.actors.push(m); });
      const h = G.zone.map.nearestFloor(c.x, c.z + 6); G.player.x = h.x; G.player.z = h.z;
      gfx.R.cam.dist = 25; gfx.updateCamera(0, c.x, c.z + 1, true);
    });
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(() => window.__G.actors.filter((a) => a.team === 'foe' && !a.dead).map((a) => a.kind + ':' + (a.avatar?.modelName || '-')));
  } },
  // after the Unmaking: the Last Lamp raises an echo of Ivar, the cold Anvil one of Karthax; fought again, no story touched
  echo4: { q: 'auto=ashfield&sim=6&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A4.listen(pg);
    const out = {};
    for (const zid of ['ashfield', 'forge']) {
      // (all four blessings chosen: an act done without one opens the blessing panel, which pauses the game)
      await pg.evaluate((zid) => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 23; h.act1 = h.act2 = h.act3 = h.act4 = 1; h.boons = ['ember', 'forge', 'amber', 'lantern']; window.__D.closePanel(); Object.assign(h.flags, { act3: true, act4: true, fireTaken: true, ivar: true, bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, karthax: true, crownUnmade: true, newFire: true, giftsTaken: true }); window.__D.enterZone(zid, { fresh: true }); G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; }, zid);
      await pg.waitForTimeout(1500);
      const before = await pg.evaluate(() => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); if (!it) return { echo: false }; const f = z.map.nearestFloor(it.x, it.z + 2); G.player.x = f.x; G.player.z = f.z; it.use(); it.use(); return { echo: it.boss, prompt: window.__D.t(it.prompt), foes: z.actors.filter((a) => a.boss).length, braziers: z.act4.braziers?.filter((b) => b.lit).length }; });
      await pg.waitForTimeout(3500); await shot();
      const spawned = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return b && { kind: b.kind, echo: b.echo, awake: b.awake, bar: G.bossActor === b, d: +Math.hypot(b.x - G.player.x, b.z - G.player.z).toFixed(1), hold: !!b.holdWake }; });
      for (let k = 0; k < 18; k++) {
        const st = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return 'dead'; b.dazed = 0; if (b.cages) { for (const s of b.cages) { s.dead = true; s.hp = 0; } return 'cages'; } b.hpFloor = 0; window.__D.kill(b); return b.dead ? 'dead' : 'hit'; });
        if (st === 'dead') break;
        await pg.waitForTimeout(1200);
      }
      await pg.waitForTimeout(4000); await shot();
      out[zid] = await pg.evaluate((o) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); return { ...o, dead: z.boss?.dead, bar: !!G.bossActor, quest: G.hero.quest, crownUnmade: G.hero.flags.crownUnmade, ivar: G.hero.flags.ivar, used: it?.used, mode: G.mode, dialog: !document.querySelector('#dialog')?.hidden, loot: G.pickups.filter((p) => p.item).length, toast: [...document.querySelectorAll('.toast')].map((e) => e.textContent).pop() }; }, { before, spawned });
    }
    return out;
  } },
  title: { q: 'sim=1&q=' + (process.env.Q || '1'), run: async (pg, shot) => {
    await pg.waitForTimeout(2500); await shot();
    await pg.mouse.click(640, 360); await pg.waitForTimeout(1500); await shot();
    await pg.click('#m-new'); await pg.waitForTimeout(2500); await shot();
    await pg.click('.pcard[data-c="mage"]'); await pg.waitForTimeout(2500); await shot();
    await pg.click('#p-go'); await pg.waitForTimeout(3500); await shot();
    await pg.evaluate(() => document.getElementById('i-skip')?.click()); await pg.waitForTimeout(4000); await shot();
    return pg.evaluate(() => ({ mode: window.__G.mode, zone: window.__G.zone?.id, cls: window.__G.hero?.cls }));
  } },
  // Act V, the sea's draw order (on the world viewer: the coast's real build, the real telegraphs and light rings): a
  // telegraph, a light pool and the Cradle's ring stay visible over shallow water, and wading and closed water differ in
  // tone. Pixels are read in the frame they are drawn in, each with and without the decal
  shallowtele: { q: 'world=coast&q=' + (process.env.Q || '1') + '&deep=1&seed=' + (process.env.SEED || '3'), run: async (pg, shot) => {
    const res = await pg.evaluate(async () => {
      const { R, toScreen, fx, B } = window.__v5;
      const L = window.__L, w = L.w, h = 0.6;
      // a patch of wading water (0.1-0.35 m deep at h, 5 x 3 cells round it) with closed water (0.6 m or more) 3-5 cells north
      const sh = (x, z) => { const i = z * w + x, d = h - L.bed[i]; return L.bed[i] < 9 && !L.ice[i] && !L.thick[i] && !L.deck[i] && d >= 0.1 && d <= 0.35; };
      let spot = null;
      for (let z = 8; z < L.h - 8 && !spot; z++) for (let x = 8; x < w - 8 && !spot; x++) {
        let ok = true;
        for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -2; dx <= 2 && ok; dx++) ok = sh(x + dx, z + dz);
        if (!ok) continue;
        for (let k = 3; k <= 5 && !spot; k++) { const j = (z - k) * w + x; if (L.bed[j] < 9 && h - L.bed[j] >= 0.6 && !L.ice[j] && !L.thick[j]) spot = { x: x + 0.5, z: z + 0.5, deep: { x: x + 0.5, z: z - k + 0.5 } }; }
      }
      if (!spot) return { error: 'no wading patch beside closed water at h 0.6' };
      window.__view(spot.x, spot.z + 2, { tide: h });
      const gl = R.renderer.getContext(), pr = R.renderer.getPixelRatio(), px = new Uint8Array(4), s = {};
      const read = (x, z) => { toScreen(x, 0.2, z, s); gl.readPixels(Math.round(s.x * pr), Math.round((R.h - s.y) * pr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; };
      const ring = (x, z, r, n = 8) => Array.from({ length: n }, (_, k) => [x + Math.sin(k * 6.283 / n) * r, z + Math.cos(k * 6.283 / n) * r]);
      const mean = (pts) => { const c = [0, 0, 0]; for (const [x, z] of pts) { const v = read(x, z); for (let i = 0; i < 3; i++) c[i] += v[i] / pts.length; } return c; };
      const diff = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const draw = () => window.__view(spot.x, spot.z + 2, { tide: h });
      // a telegraph, a light pool and the hero's ring, each on the wading water; each read with and without itself
      const tele = fx.teleCircle(spot.x + 1.4, spot.z, 0.7, 99);
      const pool = B.act4Prop('lightRing'); pool.userData.setColor(0xfff0d0); pool.scale.setScalar(0.7); pool.position.set(spot.x - 1.4, 0, spot.z); B.drape(pool, L); R.scene.add(pool);
      const cradle = B.act4Prop('lightRing'); cradle.scale.setScalar(0.6); cradle.position.set(spot.x, 0, spot.z + 0.2); B.drape(cradle, L); R.scene.add(cradle);
      const items = { tele: [tele.m, ring(spot.x + 1.4, spot.z, 0.66)], pool: [pool, ring(spot.x - 1.4, spot.z, 0.63)], cradle: [cradle, ring(spot.x, spot.z + 0.2, 0.54)] };
      const out = { spot };
      for (const k in items) {
        const [o, pts] = items[k];
        draw(); const on = mean(pts);
        o.visible = false; draw(); const off = mean(pts); o.visible = true;
        out[k] = +diff(on, off).toFixed(1);
      }
      for (const k in items) items[k][0].visible = false;
      draw(); out.tones = +diff(mean([[spot.x, spot.z], [spot.x + 0.3, spot.z + 0.2]]), mean([[spot.deep.x, spot.deep.z], [spot.deep.x + 0.3, spot.deep.z]])).toFixed(1);
      for (const k in items) items[k][0].visible = true;
      draw();
      out.pass = out.tele > 12 && out.pool > 12 && out.cradle > 12 && out.tones > 12;
      return out;
    });
    await shot();
    return res;
  } },
  // Act V, the perf gate: frame time at quality 1 under phone emulation (915 x 412 at a pixel ratio of 1.5, a coarse
  // pointer, MSAA; adaptive resolution pinned at 1.0, the scale it would have picked reported beside it) in the Shallows at
  // high water and mid Ice Road, against the Field of Ash measured the same way: each within the Field's + 15%. Quality 0
  // is measured too, as a floor. The three zones are open at once and measured in turn, ROUNDS times over (the other two
  // pages draw nothing and run no game logic meanwhile), so a load that drifts hits them alike, and each zone's verdict is
  // the median of its round-by-round ratios to the Field; the packs are kept from spawning everywhere (the
  // gate is the world's look: terrain, water, ice, props, FX). Env: QS (default '1,0'), FRAMES (frames per sample, 16),
  // ROUNDS (3), PACKS=1 lets the packs spawn
  perf5: { q: 'world=town&q=0&noenv', run: async (pg, shot) => {
    const browser = pg.context().browser(), base = process.env.BASE || 'http://localhost:5199/';
    const QS = (process.env.QS || '1,0').split(','), N = +(process.env.FRAMES || 16), ROUNDS = +(process.env.ROUNDS || 3), out = {};
    const spots = {
      ashfield: (G) => { const s = G.zone.L.spots.camp; return { x: s.x, z: s.z - 8 }; },
      coast: (G) => { const L = G.zone.L, s = L.spots.dalaro; return { x: s.x, z: s.z + 4, tide: 1.2 }; },
      farlight: (G) => { const p = G.zone.L.spots.poles; const s = p[p.length >> 1]; return { x: s.x, z: s.z }; }
    };
    for (const Q of QS) {
      const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      const pages = {};
      for (const zone of Object.keys(spots)) {
        const p = await ctx.newPage();
        p.on('pageerror', (e) => logs.push('pageerror(' + zone + '): ' + e.message));
        p.on('console', (m) => { if (m.type() === 'error') logs.push(zone + ': ' + m.text()); });
        await p.goto(base + '?auto=' + zone + '&q=' + Q + '&lvl=30' + (zone === 'farlight' ? '&flags=frozen' : ''));
        try { await p.waitForFunction(() => window.__G?.player && window.__G.zone && window.__G.mode === 'play', null, { timeout: 400000 }); } catch (e) { out[zone + Q] = 'no zone'; continue; }
        await p.evaluate(({ src, packs }) => {
          const G = window.__G, R = window.__R, v = new Function('return ' + src)()(G), f = G.zone.map.nearestFloor(v.x, v.z);
          window.__immortal = true;
          if (!packs) { for (const pk of G.zone.packs) pk.spawned = true; for (const a of G.actors.slice()) if (a.team === 'foe') { a.remove?.(); G.actors.splice(G.actors.indexOf(a), 1); } G.zone.bossSpawned = true; }
          G.player.x = f.x; G.player.z = f.z;
          // (high water: the tide's own force where tide.js has it, the water's uniforms held there besides)
          const T = window.__act5?.tide, S = window.__act5?.sea;
          if (v.tide != null) { if (T?.TIDE) T.TIDE.force = { h: v.tide, rate: 10 }; window.__hold = () => { if (S) { S.uLevel.value = v.tide; S.uWetLevel.value = v.tide; } }; }
          R.prScale = 1; R.renderer.setPixelRatio(R.basePR); R.renderer.setSize(R.w, R.h, false); R.lastResize = 1e15;
        }, { src: spots[zone].toString(), packs: process.env.PACKS === '1' });
        pages[zone] = p;
      }
      // (a page on hold draws nothing and runs no game logic either: its loop only ticks the clock)
      const freeze = (p, on) => p.evaluate((on) => { const G = window.__G; window.__R.lost = on; if (on && G.mode !== 'hold') { window.__mode0 = G.mode; G.mode = 'hold'; } if (!on && G.mode === 'hold') G.mode = window.__mode0; }, on);
      const samples = {};
      for (const p of Object.values(pages)) await freeze(p, true);
      for (let r = 0; r < ROUNDS; r++) for (const [zone, p] of Object.entries(pages)) {
        await freeze(p, false);
        const ms = await p.evaluate(async (N) => {
          const t = [];
          await new Promise((ok) => setTimeout(ok, 1500));
          await new Promise((ok) => { let last = -1; const step = (now) => { window.__hold?.(); if (last >= 0) t.push(now - last); last = now; if (t.length < N) requestAnimationFrame(step); else ok(); }; requestAnimationFrame(step); });
          t.sort((a, b) => a - b);
          return t[t.length >> 1];
        }, N);
        await freeze(p, true);
        (samples[zone] ||= []).push(+ms.toFixed(1));
        console.log('perf5 q' + Q + ' round ' + r + ' ' + zone + ' ' + ms.toFixed(1) + ' ms');
      }
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      for (const [zone, p] of Object.entries(pages)) {
        const ms = med(samples[zone]), pr = await p.evaluate(() => window.__R.renderer.getPixelRatio());
        out[zone + '@q' + Q] = { ms, rounds: samples[zone], pr, wouldScale: ms > 21 ? 'down (to 0.55 at worst)' : ms < 14.5 ? 'up' : 'hold' };
        await freeze(p, false); await p.waitForTimeout(400);
        await p.screenshot({ path: shot.dir + '/perf5-' + zone + '-q' + Q + '.png', timeout: 240000 }).catch((e) => logs.push('perf5 shot ' + zone + ': ' + e.message.split('\n')[0]));
        await freeze(p, true);
      }
      // (the ratio to the Field is taken round by round, each zone against the Field measured beside it, and the median of
      // those ratios is the verdict: a load that swells or eases between rounds cancels out)
      const F = samples.ashfield;
      for (const z of ['coast', 'farlight']) {
        const o = out[z + '@q' + Q], s = samples[z];
        if (F?.length && s?.length) { o.ratios = s.map((v, i) => +(v / F[i]).toFixed(3)); o.vsField = med(o.ratios); o.pass = o.vsField <= 1.15; }
      }
      await ctx.close();
    }
    out.pass = ['coast@q1', 'farlight@q1'].every((k) => !out[k] || out[k].pass) && !!out['coast@q1']?.ms && !!out['farlight@q1']?.ms;
    return out;
  } }
};
const sc = S[name];
// the test hero never dies (levelling up resets the life pool, so keep topping it up; window.__tough also puts back the
// huge pool whenever the stats are recounted, as when Karthax takes the gifts back)
await page.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player && window.__tough && G.player.hpMax < 99999) G.player.hpMax = 99999; if (G?.player && G.player.hpMax >= 99999) G.player.hp = G.player.hpMax; if (G?.player && window.__immortal) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
await page.goto((process.env.BASE || 'http://localhost:5199/') + '?' + sc.q);
page.setDefaultTimeout(120000);
// auto-start runs after __ready: wait for the hero too
await page.waitForFunction(() => window.__ready && (!location.search.includes('auto=') || window.__G?.player), null, { timeout: 180000 });
let n = 0;
// with &norender the game skips drawing; a screenshot asks for one drawn frame first
const shot = async () => { await page.evaluate(() => new Promise((ok) => { window.__shoot = true; requestAnimationFrame(() => requestAnimationFrame(() => { window.__shoot = false; ok(); })); })); await page.screenshot({ path: `${out}/${name}-${n++}.png` }); };
shot.dir = out;
let res;
try { res = await sc.run(page, shot); } catch (e) { logs.push('scenario error: ' + e.message); }
console.log(name, JSON.stringify(res));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
