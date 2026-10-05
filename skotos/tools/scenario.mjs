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
    // software rendering runs few game frames per second: keep swinging until the boss falls (game time, not wall time)
    for (let k = 0; k < 6; k++) {
      const dead = await pg.evaluate(async () => {
        const G = window.__G, b = G.zone.boss, p = G.player;
        if (!b || b.dead) return true;
        b.hp = 1; p.x = b.x; p.z = b.z + b.radius + 1;
        window.__D.IN.events.push({ t: 'skill', i: 0, aim: { x: b.x, z: b.z } });
        let seen = false;
        for (let i = 0; i < 120; i++) { await new Promise((ok) => setTimeout(ok, 100)); if (p.act) seen = true; if (b.dead || (seen && !p.act)) break; }
        return b.dead;
      });
      if (dead) break;
    }
    await pg.waitForTimeout(4000); await shot();
    return pg.evaluate(() => { const G = window.__G, pa = G.player.act; return { act: pa && { name: pa.name, t: +pa.t.toFixed(2), dur: +pa.dur.toFixed(2) }, d: G.zone.boss && +Math.hypot(G.zone.boss.x - G.player.x, G.zone.boss.z - G.player.z).toFixed(2), boss: G.zone.boss?.dead, hp: G.zone.boss && Math.round(G.zone.boss.hp), flag: G.hero.flags.weaver, quest: G.hero.quest, pickups: G.pickups.map(p => p.kind + (p.item ? ':' + p.item.rar : '')) }; });
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
  title: { q: 'sim=1&q=' + (process.env.Q || '1'), run: async (pg, shot) => {
    await pg.waitForTimeout(2500); await shot();
    await pg.mouse.click(640, 360); await pg.waitForTimeout(1500); await shot();
    await pg.click('#m-new'); await pg.waitForTimeout(2500); await shot();
    await pg.click('.pcard[data-c="mage"]'); await pg.waitForTimeout(2500); await shot();
    await pg.click('#p-go'); await pg.waitForTimeout(3500); await shot();
    await pg.evaluate(() => document.getElementById('i-skip')?.click()); await pg.waitForTimeout(4000); await shot();
    return pg.evaluate(() => ({ mode: window.__G.mode, zone: window.__G.zone?.id, cls: window.__G.hero?.cls }));
  } }
};
const sc = S[name];
// the test hero never dies (levelling up resets the life pool, so keep topping it up)
await page.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player && G.player.hpMax >= 99999) G.player.hp = G.player.hpMax; if (G?.player && window.__immortal) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
await page.goto((process.env.BASE || 'http://localhost:5199/') + '?' + sc.q);
page.setDefaultTimeout(120000);
// auto-start runs after __ready: wait for the hero too
await page.waitForFunction(() => window.__ready && (!location.search.includes('auto=') || window.__G?.player), null, { timeout: 180000 });
let n = 0;
// with &norender the game skips drawing; a screenshot asks for one drawn frame first
const shot = async () => { await page.evaluate(() => new Promise((ok) => { window.__shoot = true; requestAnimationFrame(() => requestAnimationFrame(() => { window.__shoot = false; ok(); })); })); await page.screenshot({ path: `${out}/${name}-${n++}.png` }); };
let res;
try { res = await sc.run(page, shot); } catch (e) { logs.push('scenario error: ' + e.message); }
console.log(name, JSON.stringify(res));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
