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
    await pg.evaluate(() => { const G = window.__G; const b = G.zone.boss; if (b && !b.dead) { b.hp = 1; } window.__D.IN.events.push({ t: 'skill', i: 0, aim: null }); });
    await pg.waitForTimeout(4000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { boss: G.zone.boss?.dead, hp: G.zone.boss && Math.round(G.zone.boss.hp), flag: G.hero.flags.weaver, quest: G.hero.quest, pickups: G.pickups.map(p => p.kind + (p.item ? ':' + p.item.rar : '')) }; });
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
    for (let i = 0; i < 3; i++) { await pg.waitForTimeout(600); await pg.click('#dialog').catch(() => {}); await pg.click('#dialog').catch(() => {}); }
    await pg.waitForTimeout(2500); await shot();
    await pg.waitForTimeout(4000); await shot();
    await pg.waitForTimeout(6000);
    for (let i = 0; i < 5; i++) { await pg.click('#dialog').catch(() => {}); await pg.waitForTimeout(300); await pg.click('#dialog').catch(() => {}); await pg.waitForTimeout(300); }
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
  title: { q: 'sim=1&q=1', run: async (pg, shot) => {
    await pg.waitForTimeout(2500); await shot();
    await pg.mouse.click(640, 360); await pg.waitForTimeout(1500); await shot();
    await pg.click('#m-new'); await pg.waitForTimeout(2500); await shot();
    await pg.click('.pcard[data-c="mage"]'); await pg.waitForTimeout(2500); await shot();
    await pg.click('#p-go'); await pg.waitForTimeout(3500); await shot();
    await pg.click('#i-skip'); await pg.waitForTimeout(4000); await shot();
    return pg.evaluate(() => ({ mode: window.__G.mode, zone: window.__G.zone?.id, cls: window.__G.hero?.cls }));
  } }
};
const sc = S[name];
await page.goto((process.env.BASE || 'http://localhost:5199/') + '?' + sc.q);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
let n = 0;
const shot = async () => { await page.screenshot({ path: `${out}/${name}-${n++}.png` }); };
let res;
try { res = await sc.run(page, shot); } catch (e) { logs.push('scenario error: ' + e.message); }
console.log(name, JSON.stringify(res));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
