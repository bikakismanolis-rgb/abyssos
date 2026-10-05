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
  ending: { q: 'auto=town&sim=3&q=1&lvl=10', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 4; });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {}));
    for (let i = 0; i < 3; i++) { await pg.waitForTimeout(600); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); }
    await pg.waitForTimeout(2500); await shot();
    await pg.waitForTimeout(4000); await shot();
    await pg.waitForTimeout(6000);
    for (let i = 0; i < 5; i++) { await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.waitForTimeout(300); }
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
