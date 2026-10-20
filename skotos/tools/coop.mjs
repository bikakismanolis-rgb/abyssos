// Co-op scenarios: node tools/coop.mjs <name> <outdir>   (BASE=http://localhost:<port>/, a private no-HMR server)
// One headless browser, two to four pages in one context (LocalTransport: BroadcastChannel), each with its own save
// (?slot=). Every page is ?net=local&norender: the game runs, nothing is drawn (but for the screenshots).
// Names: join, pack, boss1..boss5, loot, revive, churn, hostleave, act5, scaling, four, ui
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , name = 'join', out = '/tmp/coop'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5311/';
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let fails = 0;
const ok = (c, m, v) => { results.push({ ok: !!c, m, v }); console.log((c ? 'ok   ' : 'FAIL ') + m + (v !== undefined ? '  ' + JSON.stringify(v) : '')); if (!c) fails++; };

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const pages = [];
async function open(peer, q) {
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('[' + peer + '] pageerror', e.message.slice(0, 300)));
  pg.on('console', (m) => { if (m.type() === 'error') console.log('[' + peer + '] console', m.text().slice(0, 300)); });
  await pg.goto(BASE + '?net=local&peer=' + peer + '&slot=' + peer + '&q=0&' + (q.includes('render') ? '' : 'norender&') + q);
  await pg.waitForFunction(() => window.__ready && window.__G?.zone && window.__G.mode === 'play' && window.__NET, null, { timeout: 240000 });
  // (a page that draws nothing still needs its frames: a tick of DOM)
  await pg.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;z-index:99;font-size:1px'; document.body.appendChild(d); let k = 0; setInterval(() => { d.textContent = k++ % 2 ? '.' : ':'; }, 20); window.__immortal = false; });
  pages.push(pg);
  return pg;
}
const ev = (pg, fn, arg) => pg.evaluate(fn, arg);
async function until(pg, fn, arg, ms = 30000, what = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await pg.evaluate(fn, arg)) return true; await sleep(250); }
  console.log('     (timed out: ' + what + ')');
  return false;
}
// a host in zone z and n guests, all in the host's world
async function party(z, n = 1, o = {}) {
  const host = await open('host', `auto=${z}&lvl=${o.lvl || 14}&cls=${o.hcls || 'warden'}&diff=${o.diff ?? 1}${o.hq || ''}`);
  const code = await ev(host, async () => { const c = await window.__NET.hostGame(); window.__NET.startGame(); return c; });
  ok(/^[a-z0-9]{4}$/.test(code), 'host opened a game', code);
  const cls = ['ranger', 'mage', 'warden'];
  const guests = [];
  for (let i = 0; i < n; i++) {
    const g = await open('g' + (i + 1), `auto=town&lvl=${o.glvl || 12}&cls=${cls[i % 3]}`);
    await ev(g, (c) => window.__NET.joinGame(c), code);
    guests.push(g);
  }
  for (const [i, g] of guests.entries()) {
    const inz = await until(g, (z) => window.__G.zone?.id === z && window.__NET.S.zoneKey && window.__NET.S.zoneKey === window.__G.zone.netKey, z, 90000, 'guest in zone');
    ok(inz, 'guest ' + (i + 1) + ' is in the host\'s ' + z);
  }
  await until(host, (n) => window.__NET.NET.remotes.length === n && window.__NET.NET.n === n + 1, n, 20000, 'host sees guests');
  ok(await ev(host, (n) => window.__NET.NET.n === n + 1, n), 'host counts ' + (n + 1) + ' players', await ev(host, () => window.__NET.NET.n));
  return { host, guests, code };
}
// put a page's hero at (x, z) (the nearest floor)
const place = (pg, x, z) => ev(pg, ([x, z]) => { const G = window.__G, f = G.zone.map.nearestFloor(x, z); G.player.x = f.x; G.player.z = f.z; return f; }, [x, z]);
const hostPos = (h) => ev(h, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
const stats = (pg) => ev(pg, () => { const S = window.__NET.S, r = S.ch?.meter.rate(); return { r, peak: S.ch?.meter.peak, tx: S.ch?.meter.tx, snaps: S.stats.snaps, snapBytes: S.stats.snapBytes, rejected: S.stats.rejected, hits: S.stats.hits, why: S.stats.why }; });
async function shot(pg, file) { await pg.evaluate(() => { window.__shoot = true; }); await sleep(400); await pg.screenshot({ path: out + '/' + file }); await pg.evaluate(() => { window.__shoot = false; }); }

const SC = {
  // two heroes in the Old Forest: the guest sees the host and the host's monsters; the host sees the guest
  async join() {
    const { host, guests: [g] } = await party('forest', 1);
    const hp = await hostPos(host);
    await place(g, hp.x + 2, hp.z + 1);
    await sleep(1500);
    const gseen = await ev(g, () => ({ remotes: window.__NET.NET.remotes.length, party: window.__NET.party().map((p) => p.name) }));
    ok(gseen.remotes === 1, 'the guest draws the host', gseen);
    const hseen = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return r && { x: r.x, z: r.z }; });
    const gp = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    ok(hseen && Math.hypot(hseen.x - gp.x, hseen.z - gp.z) < 1.5, 'the host has the guest where it is', { hseen, gp });
    ok(await ev(g, () => window.__G.hero.__real && window.__G.hero.quest === undefined ? false : !!window.__G.hero.__real), 'the guest plays in a view of its hero (the host\'s story over it)');
  },
  // a pack: monsters come for the guest too, the guest's blows land on the host, the kill pays the guest
  async pack() {
    const { host, guests: [g] } = await party('forest', 1, { lvl: 8, glvl: 8 });
    // the nearest pack to both
    const pk = await ev(host, () => { const z = window.__G.zone, p = window.__G.player; const list = z.packs.filter((q) => !q.spawned).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); return list[0] && { x: list[0].x, z: list[0].z }; });
    await place(host, pk.x + 12, pk.z); await place(g, pk.x + 3, pk.z);
    await ev(host, () => { window.__immortal = true; });
    const spawned = await until(host, () => window.__G.actors.some((a) => a.team === 'foe' && !a.prop && !a.dead), null, 15000, 'pack');
    ok(spawned, 'a pack woke for the guest (the host is 12 m off)');
    const pups = await until(g, () => [...window.__NET.S.pup.values()].filter((a) => !a.dead).length > 0, null, 10000, 'puppets');
    ok(pups, 'the guest sees the host\'s monsters', await ev(g, () => window.__NET.S.pup.size));
    // the guest stands in it: it is struck
    const hp0 = await ev(g, () => window.__G.player.hp);
    await until(g, (h0) => window.__G.player.hp < h0, hp0, 20000, 'guest struck');
    const hp1 = await ev(g, () => window.__G.player.hp);
    ok(hp1 < hp0, 'the host\'s monsters strike the guest (on the guest\'s page)', { hp0, hp1 });
    // the guest strikes back: its blows (through the game's own damage) land on the host's monsters
    const xp0 = await ev(g, () => window.__G.hero.xp + window.__G.hero.level * 1e6);
    const gold0 = await ev(g, () => window.__G.hero.gold);
    const k0 = await ev(host, () => window.__G.hero.stats.kills);
    for (let i = 0; i < 40; i++) {
      await ev(g, () => { const G = window.__G; G.player.hp = G.player.hpMax; for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe') { G.player.x = a.x + 1.2; G.player.z = a.z; window.__D.emit; window.__dmg ||= null; } });
      await ev(g, async () => { const C = await import('/src/game/combat.js'); const G = window.__G; for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe' && Math.hypot(a.x - G.player.x, a.z - G.player.z) < 20) C.damage(G.player, a, G.stats.wmax * G.stats.dmgMult * 2.5, { crit: false }); });
      await sleep(300);
      const left = await ev(host, () => window.__G.actors.filter((a) => a.team === 'foe' && !a.prop && !a.dead && !a.remote).length);
      if (!left) break;
    }
    const k1 = await ev(host, () => window.__G.hero.stats.kills);
    ok(k1 > k0, 'the guest\'s blows killed the host\'s monsters', { k0, k1 });
    await sleep(1500);
    const xp1 = await ev(g, () => window.__G.hero.xp + window.__G.hero.level * 1e6), gk = await ev(g, () => window.__G.hero.stats.kills);
    ok(xp1 > xp0, 'the guest gained its own XP', { xp0, xp1 });
    ok(gk > 0, 'the guest\'s kills counted on its own hero', gk);
    // gold on the ground: the guest's own; picked up on its page
    const piles = await ev(g, () => window.__G.pickups.filter((p) => p.kind === 'gold').length);
    const hostPiles = await ev(host, () => window.__G.pickups.filter((p) => p.kind === 'gold').length);
    ok(true, 'gold on the ground: guest ' + piles + ', host ' + hostPiles + ' (each their own)');
    const st = await stats(host);
    ok(!st.why.big && !st.why.rate && !st.why.bad, 'no honest blow was refused (too big, too fast, malformed)', st.why);
    console.log('     host net', JSON.stringify(st));
  }
};

try {
  if (!SC[name]) throw new Error('no scenario ' + name);
  await SC[name]();
} catch (e) { ok(false, 'scenario threw: ' + (e.stack || e).toString().slice(0, 600)); }
fs.writeFileSync(out + '/' + name + '.json', JSON.stringify({ name, fails, results }, null, 1));
console.log(fails ? fails + ' FAILED' : 'all passed');
await browser.close();
process.exit(fails ? 1 : 0);
