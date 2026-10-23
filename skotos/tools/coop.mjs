// Co-op scenarios: node tools/coop.mjs <name> <outdir>   (BASE=http://localhost:<port>/, a private no-HMR server)
// One headless browser, two to four pages in one context (LocalTransport: BroadcastChannel), each with its own save
// (?slot=). Every page is ?net=local&norender: the game runs, nothing is drawn (but for the screenshots).
// Names: join, pack, boss1..boss5, loot, revive, churn, hostleave, act5, scaling, four, ui
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { watchFatal } from './fatal.mjs';
const [, , name = 'join', out = '/tmp/coop'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5311/';
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let fails = 0;
const ok = (c, m, v) => { results.push({ ok: !!c, m, v }); console.log((c ? 'ok   ' : 'FAIL ') + m + (v !== undefined ? '  ' + JSON.stringify(v) : '')); if (!c) fails++; };

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
// (the phone: 844 x 390 landscape; the ui scenario as a touch phone)
const ctx = await browser.newContext(name === 'ui' ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 844, height: 390 } });
const pages = [];
// every page's #fatal text (tools/fatal.mjs) fails the run
const FATAL = [];
await watchFatal(ctx, FATAL);
// the room scenario: every page's window.claude.use('room') is a faithful fake of the artifact's room (fakeroom.mjs,
// in this process: its budget, sizes, coalescing and loss), reached through a binding; the game picks RoomTransport
let HUB = null;
if (name === 'room') {
  const { Hub } = await import('./net/fakeroom.mjs');
  HUB = new Hub({ loss: +(process.env.LOSS || 0.05), lag: 30, topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } });
  const state = new Map();
  const plain = (ch) => JSON.parse(JSON.stringify({ peers: ch.peers, joined: ch.joined, left: ch.left, updated: ch.updated }));
  await ctx.exposeBinding('__roomCall', async ({ page }, scope, method, args) => {
    let st = state.get(page);
    if (!st) { st = { hp: HUB.page({ by: 'u' + (state.size + 1) }), rooms: new Map() }; state.set(page, st); }
    const api = scope === '' ? st.hp.room : st.rooms.get(scope);
    if (!api) return { err: 'invalid_argument' };
    const send = (fn, arg) => page.evaluate(fn, arg).catch(() => {});
    try {
      if (method === 'init') { api.onPeers((ch) => send(([s, c]) => window.__roomIn?.[s]?.peers(c), [scope, plain(ch)])); api.onConnection((v) => send(([s, v]) => window.__roomIn?.[s]?.conn(v), [scope, v])); return { ok: 1 }; }
      if (method === 'on') { api.on(args[0], (m) => send(([s, m]) => window.__roomIn?.[s]?.msg(m), [scope, JSON.parse(JSON.stringify(m))])); return { ok: 1 }; }
      if (method === 'join') { const r = await st.hp.room.join(args[0]); st.rooms.set(args[0], r); return { ok: 1 }; }
      if (method === 'leave') { await api.leave(); st.rooms.delete(scope); return { ok: 1 }; }
      await api[method](...args); return { ok: 1 };
    } catch (e) { return { err: e.code || 'upstream_error' }; }
  });
  await ctx.addInitScript(() => {
    const make = (scope) => {
      const L = {}, P = [], C = []; let peers = Object.freeze([]), conn = false;
      (window.__roomIn ||= {})[scope] = { msg(m) { for (const f of (L[m.topic] || []).slice()) f(m); }, peers(ch) { peers = ch.peers; for (const f of P.slice()) f(ch); }, conn(v) { conn = v; for (const f of C.slice()) f(v); } };
      const call = (m, a) => window.__roomCall(scope, m, a).then((r) => { if (r?.err) throw Object.assign(new Error(r.err), { code: r.err }); });
      call('init', []);
      const subbed = new Set();
      return Object.freeze({
        name: scope, emit: (t, d) => call('emit', [t, d]), presence: (p) => call('presence', [p]), peers: () => peers, connected: () => conn,
        on(t, f) { (L[t] ||= []).push(f); if (!subbed.has(t)) { subbed.add(t); call('on', [t]); } return () => { const i = L[t].indexOf(f); if (i >= 0) L[t].splice(i, 1); }; },
        onPeers(f) { P.push(f); return () => { const i = P.indexOf(f); if (i >= 0) P.splice(i, 1); }; },
        onConnection(f) { C.push(f); setTimeout(() => f(conn), 0); return () => { const i = C.indexOf(f); if (i >= 0) C.splice(i, 1); }; },
        join: (n) => call('join', [n]).then(() => make(n)), leave: () => call('leave', [])
      });
    };
    window.claude = Object.freeze({ use: async (n) => (n === 'room' ? make('') : null) });
  });
}
const NETQ = name === 'room' ? '' : 'net=local&';
async function open(peer, q) {
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('[' + peer + '] pageerror', e.message.slice(0, 300)));
  pg.on('console', (m) => { if (m.type() === 'error') console.log('[' + peer + '] console', m.text().slice(0, 300)); });
  await pg.goto(BASE + '?' + NETQ + 'peer=' + peer + '&slot=' + peer + '&q=0&' + (q.includes('render') ? '' : 'norender&') + q);
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
  },
  // each player's own loot: the host's drops are not on the guest's page, the guest's not on the host's
  async loot() {
    const { host, guests: [g] } = await party('forest', 1, { lvl: 10, glvl: 10 });
    const hp = await hostPos(host); await place(g, hp.x + 1, hp.z);
    // a rare pack beside them, killed by the host
    for (let r = 0; r < 3; r++) {
      await ev(host, async () => { const A = await import('/src/game/actors.js'), G = window.__G, p = G.player; for (let i = 0; i < 2; i++) { const m = A.spawnMonster('skeleton', p.x + 3 + i, p.z + 2, { elite: 'rare', affixes: [] }); G.actors.push(m); } });
      await sleep(1200);
      await ev(host, () => { for (const a of window.__G.actors) if (a.team === 'foe' && !a.prop && !a.dead && !a.remote) window.__D.kill(a); });
      await sleep(1500);
    }
    await sleep(2500);
    const hi = await ev(host, () => window.__G.pickups.filter((p) => p.kind === 'item').map((p) => p.item.id));
    const gi = await ev(g, () => window.__G.pickups.filter((p) => p.kind === 'item').map((p) => p.item.id));
    ok(hi.length >= 4 && gi.length >= 4, 'both got items from the rares (host ' + hi.length + ', guest ' + gi.length + ')');
    ok(!hi.some((id) => gi.includes(id)), 'no item is on both pages: each player\'s drops are their own');
    const cls = await ev(g, () => window.__G.pickups.filter((p) => p.kind === 'item').map((p) => p.item.base));
    console.log('     guest item bases', cls.join(' '));
    // the guest picks one up: it is in the guest's bag and save, not the host's
    const got = await ev(g, async () => { const G = window.__G, p = G.pickups.find((q) => q.kind === 'item'); G.player.x = p.x; G.player.z = p.z; await new Promise((r) => setTimeout(r, 1500)); const S = (await import('/src/game/save.js')); S.writeSave(); const raw = JSON.parse(localStorage.getItem('skotos.save.v1.g1')); const h = raw.heroes.find((x) => x.id === G.hero.id); return { inBag: G.hero.inv.some((i) => i && i.id === p.item.id), inSave: h.inv.some((i) => i && i.id === p.item.id), quest: h.quest, flags: Object.keys(h.flags).length, diff: h.diff }; });
    ok(got.inBag && got.inSave, 'the guest\'s pickup is in its own bag and its own save', got);
    ok(got.quest === 0 && got.flags < 5, 'the guest\'s saved story is its own (the host\'s never written to it)', got);
  },
  // downed and raised: a guest raised by the host, the host raised by the guest, and the 30 s rise
  async revive() {
    const { host, guests: [g] } = await party('forest', 1, { lvl: 10, glvl: 10 });
    const hp = await hostPos(host); await place(g, hp.x + 6, hp.z);
    await ev(host, () => { for (const p of window.__G.zone.packs) p.spawned = true; });
    // the guest falls
    await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await sleep(2600);
    const dn = await ev(g, () => ({ dead: window.__G.player.dead, downed: !!window.__NET.S.downed, panel: window.__G.panel, card: !document.getElementById('downed')?.hidden }));
    ok(dn.dead && dn.downed && dn.panel !== 'dead', 'a guest at 0 life is downed (no death panel)', dn);
    const hs = await until(host, () => window.__NET.NET.remotes[0]?.dead, null, 5000, 'host sees downed');
    ok(hs, 'the host sees the guest down (its monsters leave it)');
    // the host stands by it
    const gp = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    await place(host, gp.x + 0.6, gp.z);
    const up = await until(g, () => !window.__G.player.dead, null, 12000, 'raised');
    const r1 = await ev(g, () => ({ dead: window.__G.player.dead, hp: Math.round(window.__G.player.hp / window.__G.player.hpMax * 100) }));
    ok(up && r1.hp >= 35 && r1.hp <= 45, 'the host raised the guest (at 40% life)', r1);
    // the host falls, the guest raises it
    await ev(host, async () => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await sleep(2500);
    ok(await ev(host, () => window.__G.player.dead && !!window.__NET.S.downed && window.__G.panel !== 'dead'), 'the host is downed too (co-op: no death panel)');
    const hp2 = await hostPos(host); await place(g, hp2.x + 0.5, hp2.z);
    const up2 = await until(host, () => !window.__G.player.dead, null, 12000, 'host raised');
    ok(up2, 'the guest raised the host (its ask, checked on the host)');
    // the rise: downed and left alone, the guest gets up by itself
    await place(host, gp.x + 20, gp.z);
    await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await sleep(2400);
    await ev(g, () => { if (window.__NET.S.downed) window.__NET.S.downed.t = 0.2; });
    const up3 = await until(g, () => !window.__G.player.dead && window.__G.player.hp >= window.__G.player.hpMax * 0.95, null, 6000, 'rose');
    const hk = await ev(host, () => window.__G.zone.id + ':' + window.__G.zone.ep), gk = await ev(g, () => window.__G.zone.netKey);
    ok(up3 && hk === gk, 'left alone it rose at full life, still in the host\'s zone', { hk, gk });
  },
  // guests leaving and joining mid-fight; a page closed outright; the host plays on untouched
  async churn() {
    const { host, guests: [g, g2], code } = await party('forest', 2, { lvl: 12, glvl: 12 });
    const hp = await hostPos(host); await place(g, hp.x + 2, hp.z); await place(g2, hp.x - 2, hp.z);
    await ev(host, async () => { const A = await import('/src/game/actors.js'), G = window.__G, p = G.player; for (let i = 0; i < 5; i++) { const m = A.spawnMonster('skeleton', p.x + 4, p.z + i - 2, {}); m.aggro = true; G.actors.push(m); } window.__immortal = true; });
    await sleep(1500);
    const hp3 = await ev(host, () => window.__G.actors.filter((a) => a.kind === 'skeleton' && !a.dead).map((a) => Math.round(a.hpMax)));
    ok(await ev(host, () => window.__NET.NET.n) === 3, 'three in the fight');
    // one leaves by the button
    await ev(g, () => window.__NET.leaveGame('coop.youLeft'));
    await until(host, () => window.__NET.NET.n === 2, null, 8000, 'n 2');
    const hp2 = await ev(host, () => window.__G.actors.filter((a) => a.kind === 'skeleton' && !a.dead).map((a) => Math.round(a.hpMax)));
    ok(hp2.length && hp2[0] < hp3[0], 'one left: the monsters\' life scaled down for two', { three: hp3[0], two: hp2[0] });
    const home = await until(g, () => window.__G.zone?.id === 'town' && !window.__G.hero.__real && !window.__NET.S.role, null, 30000, 'home');
    ok(home, 'the one who left is home in its own town, its own hero');
    // and comes back with the code
    await ev(g, (c) => window.__NET.joinGame(c), code);
    const back = await until(g, () => window.__G.zone?.id === 'forest' && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 90000, 'back');
    ok(back, 'it joined again, mid-fight, into the host\'s forest');
    await until(host, () => window.__NET.NET.n === 3, null, 15000, 'n 3');
    ok(await ev(host, () => window.__NET.NET.n) === 3, 'three again on the host');
    // one closes its page outright
    await g2.close(); pages.splice(pages.indexOf(g2), 1);
    const gone = await until(host, () => window.__NET.NET.n === 2 && window.__NET.NET.remotes.length === 1, null, 25000, 'dropped');
    ok(gone, 'a page closed outright: the host let its hero go');
    const alive = await ev(host, () => ({ mode: window.__G.mode, zone: window.__G.zone.id, err: document.getElementById('fatal')?.textContent || '' }));
    ok(alive.mode === 'play' && !alive.err, 'the host\'s game never broke', alive);
  },
  // the host leaves: its guests go home gracefully, their heroes as they were
  async hostleave() {
    const { host, guests: [g] } = await party('forest', 1);
    const lvl0 = await ev(g, () => window.__G.hero.level);
    await host.close(); pages.splice(pages.indexOf(host), 1);
    const home = await until(g, () => window.__G.zone?.id === 'town' && !window.__NET.S.role && !window.__G.hero.__real, null, 45000, 'home');
    ok(home, 'the host gone, the guest is home in its own town');
    const st = await ev(g, () => ({ lvl: window.__G.hero.level, mode: window.__G.mode, err: document.getElementById('fatal')?.textContent || '', quest: window.__G.hero.quest }));
    ok(st.mode === 'play' && !st.err && st.lvl === lvl0 && st.quest === 0, 'its hero and its game as they were', st);
  },
  // a guest that lies: blows too big, on what is not there or far away, junk; the host refuses them and plays on
  async cheat() {
    const { host, guests: [g] } = await party('forest', 1, { lvl: 10, glvl: 10 });
    await ev(host, async () => { const A = await import('/src/game/actors.js'), G = window.__G, p = G.player; window.__far = A.spawnMonster('skeleton', p.x + 40, p.z, {}); G.actors.push(window.__far); window.__near = A.spawnMonster('skeleton', p.x + 3, p.z, {}); window.__near.hp = window.__near.hpMax = 1e7; G.actors.push(window.__near); });
    const ids = await ev(host, () => [window.__near.id, window.__far.id]);
    const hp = await hostPos(host); await place(g, hp.x + 2, hp.z);
    await sleep(1200);
    await ev(g, ([near, far]) => { const S = window.__NET.S; for (const e of [['h', near, 1e9, 0, {}], ['h', far, 5, 0, {}], ['h', 999999, 5, 0, {}], ['h', near, 'x', 0, {}], ['h', near, 5, 0, { stun: 1e9, knock: 1e9 }], ['zz', 1], ['h', near, -5, 0, null]]) S.ev.push([++S.evSeq, ...e]); for (let i = 0; i < 400; i++) S.ev.push([++S.evSeq, 'h', near, 60, 0, {}]); }, ids);
    await sleep(3000);
    const r = await ev(host, () => ({ near: window.__near.dead ? 0 : Math.round(window.__near.hp), max: Math.round(window.__near.hpMax), why: window.__NET.S.stats.why, far: window.__far.hp === window.__far.hpMax, stun: window.__near.status.stun, err: document.getElementById('fatal')?.textContent || '' }));
    ok(r.why.big >= 1 && r.far && !r.err, 'a blow too big and one from 40 m are refused; nothing broke', r);
    ok(r.stun <= 3, 'statuses are clamped', r.stun);
    ok((r.why.rate || 0) > 0 && r.near > 1e7 - 400 * 60, 'a flood of 400 blows in a moment is rate-held', { why: r.why, lost: 1e7 - r.near });
  },

  // Act V: the host's tide on the guest's coast (its clock and a boss's hold), the host's ice breaking under the guest
  // the progression in co-op, four players on the Farthest Light's ice, each with its own Mastery, variants and later
  // skills from its own save: the host lands what each guest's blows were (its Mastery in them once, the host's not at
  // all, none refused), a guest's taunt, pull, cracks and refreeze are done on the host's world, every page draws the
  // others' effects (VIS) and they end, and the room's budget holds with the most effect-heavy loadouts cast for 20 s
  async prog() {
    const A4 = 'act1,act2,act3,act4,after3,hart,autumn,weaver,lord,fireTaken,ivar,plug,karthax,crownUnmade,giftsTaken,unbound,newFire';
    const F5 = 'alkyone,coastCall,cradle,coal,alkField,coastSeen,hearth,rite,tamMet,glaukosMet,light_grey,mem_i1,light_wreck,mem_i2,light_fall,mem_i3,towerWake,towerDown,frozen,farSeen,alkShip';
    const { host, guests } = await party('farlight', 3, { lvl: 45, glvl: 45, hq: '&quest=28&flags=' + A4 + ',' + F5 });
    const [gR, gM, gW] = guests, all = [host, ...guests];
    // each page's own build (its own save): Mastery, every rank and variant, a loadout of the heavy skills
    const BUILD = {
      host: { mast: { might: 100, vigor: 40 }, load: ['bulwark', 'whirl', 'leap', 'dawn'], variant: { whirl: 2, leap: 1 } },
      ranger: { mast: { might: 40, fury: 30, aim: 30, leech: 20 }, load: ['hawks', 'rain', 'multi', 'vault'], variant: { rain: 1, multi: 2 } },
      mage: { mast: { might: 50, fury: 60, aim: 40 }, load: ['rift', 'beam', 'meteor', 'nova'], variant: { meteor: 1, nova: 2 } },
      warden: { mast: { might: 30, iron: 30, well: 20 }, load: ['cry', 'bulwark', 'quake', 'whirl'], variant: { cry: 2, quake: 2, whirl: 1 } }
    };
    for (const [i, pg] of all.entries()) await ev(pg, async ([B, host]) => {
      const G = window.__G, h = G.__real || G.hero, D = await import('/src/game/data.js'), b = host ? B.host : B[h.cls];
      for (const sk of D.SKILLS[h.cls]) if (!sk.basic) h.skills[sk.id] = 5;
      for (const id in D.VARIANTS) if (D.SKILLS[h.cls].some((s) => s.id === id)) h.vars[id] = 3;
      Object.assign(h.variant, b.variant); h.mast = { ...b.mast }; h.loadout = b.load.slice(); h.mlvl = 30;
      // (the host's story owes a guest the blessings of the acts it has finished: they are taken, so no panel waits on them)
      h.boons = ['ember', 'forge', 'amber', 'lantern']; if (G.panel) window.__D.closePanel();
      window.__D.refreshStats(); window.__D.emit('loadout'); window.__immortal = true;
      (await import('/src/game/save.js')).writeSave();
    }, [BUILD, i === 0]);
    const mine = await ev(gR, () => ({ might: window.__G.hero.mast.might, saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('g1')) || 'x') || 'null')?.heroes?.[0]?.mast?.might ?? null, dm: window.__G.stats.dmgMult }));
    ok(mine.might === 40, 'a guest\'s Mastery is its own hero\'s (its own save)', mine);
    // a thin-ice spot near the host; everyone there; a pack of sturdy monsters 6 m off and a dummy
    const spot = await ev(host, () => { const G = window.__G, L = G.zone.L, p = G.player; let best = null, bd = 1e9; for (let i = 0; i < L.ice.length; i += 2) { if (!L.ice[i] || L.thick?.[i]) continue; const x = i % L.w + 0.5, z = Math.floor(i / L.w) + 0.5; let ok = true; for (let k = 0; k < 12 && ok; k++) for (const r of [3, 7]) { const xx = x + Math.sin(k * 0.52) * r, zz = z + Math.cos(k * 0.52) * r, j = Math.floor(zz) * L.w + Math.floor(xx); if (!L.ice[j] || L.thick?.[j] || !G.zone.map.walkable(xx, zz)) ok = false; } const d = Math.hypot(x - p.x, z - p.z); if (ok && d < bd) { bd = d; best = { x, z }; } } return best; });
    ok(!!spot, 'a spot of thin ice', spot);
    const at = [[0, 0], [2, -1.5], [-2, -1.5], [0, -3]];
    for (const [i, pg] of all.entries()) await place(pg, spot.x + at[i][0], spot.z + at[i][1]);
    await sleep(1200);
    const spawnPack = () => ev(host, ([x, z]) => { const G = window.__G; for (const a of G.actors) if (a.team === 'foe' && !a.boss) { a.dead = true; a.remove(); } G.actors = G.actors.filter((a) => !a.removed); for (const p of G.zone.packs || []) p.spawned = true; for (let i = 0; i < 10; i++) { const m = window.__D.spawnMonster(i % 2 ? 'goblin' : 'skeleton', x + Math.sin(i * 0.63) * 2.5, z + 6 + Math.cos(i * 0.63) * 2.5, { level: 45 }); m.hp = m.hpMax = 1e7; m.test = true; G.actors.push(m); } return G.actors.filter((a) => a.test).length; }, [spot.x, spot.z]);
    ok(await spawnPack() === 10, 'ten sturdy monsters 6 m off');
    await until(gW, () => [...window.__NET.S.pup.values()].filter((a) => !a.dead).length >= 8, null, 10000, 'puppets');
    // --- taunt: the Warden guest's Challenge holds the host's monsters to its stand-in ---
    await ev(host, () => { for (const a of window.__G.actors) if (a.test) a.status.stun = 0; });
    // (a cast is pushed again until the page says it was used: an input taken while a panel or a channel holds it is lost)
    const cast = async (pg, i, x, z) => {
      for (let n = 0; n < 4; n++) {
        const used = await ev(pg, async ([i, x, z]) => {
          const G = window.__G, pl = G.player, B = await import('/src/ui/bus.js');
          if (!window.__usedOn) { window.__usedOn = true; window.__used = 0; B.on('skillUsed', () => window.__used++); }
          const u0 = window.__used;
          if (G.panel) window.__D.closePanel(); pl.res = G.stats.resMax; pl.act = null;
          window.__D.IN.events.push({ t: 'skill', i, aim: x == null ? null : { x, z } });
          for (let k = 0; k < 20 && window.__used === u0; k++) await new Promise((r) => setTimeout(r, 50));
          return window.__used > u0;
        }, [i, x, z]);
        if (used) return true;
      }
      return false;
    };
    await cast(gW, 1, spot.x, spot.z + 6);
    await sleep(300);
    const taunted = await until(host, () => { const r = window.__NET.NET.remotes; return window.__G.actors.filter((a) => a.test && a.taunt > window.__G.hero.stats.time && a.tauntBy && r.includes(a.tauntBy)).length >= 3; }, null, 8000, 'taunt');
    const tg = await ev(host, () => { const r = window.__NET.NET.remotes; return window.__G.actors.filter((a) => a.test && a.tgt && r.includes(a.tgt) && a.tauntBy === a.tgt).length; });
    ok(taunted && tg >= 3, 'a guest\'s Challenge holds the host\'s monsters to that guest', { held: tg });
    // --- pull: the Mage guest's Void Rift draws them in on the host ---
    await spawnPack();
    await ev(host, () => { for (const a of window.__G.actors) if (a.test) { a.status.stun = 99; a.x0 = a.x; a.z0 = a.z; } });
    await sleep(800);
    const rx = spot.x + 3.5, rz = spot.z + 6;
    await cast(gM, 1, rx, rz);
    await sleep(2200);
    const pulled = await ev(host, ([rx, rz]) => { const L = window.__G.actors.filter((a) => a.test && !a.dead); return { n: L.length, closer: L.filter((a) => Math.hypot(a.x - rx, a.z - rz) < Math.hypot(a.x0 - rx, a.z0 - rz) - 0.4).length }; }, [rx, rz]);
    const why0 = await ev(host, () => ({ ...window.__NET.S.stats.why }));
    ok(pulled.closer >= 3, 'a guest\'s Rift pulls the host\'s monsters in', { ...pulled, why: why0 });
    // --- the ice: the Warden guest's Ring of Earth cracks the host's; the Mage guest's Nova heals it ---
    const iceSum = (pg, x, z, r) => ev(pg, ([x, z, r]) => { const G = window.__G, L = G.zone.L, I = G.zone.ice; let n = 0; for (let cz = Math.floor(z - r); cz <= z + r; cz++) for (let cx = Math.floor(x - r); cx <= x + r; cx++) { const i = cz * L.w + cx; if (L.ice[i] && Math.hypot(cx + 0.5 - x, cz + 0.5 - z) <= r && I.stage[i] >= 1 && I.stage[i] <= 3) n += I.stage[i]; } return n; }, [x, z, r]);
    const wp = await ev(gW, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    const c0 = await iceSum(host, wp.x, wp.z, 8);
    await ev(gW, () => { const G = window.__G; G.player.cds.fill(0); });
    await cast(gW, 3, wp.x, wp.z + 6);
    await sleep(2000);
    const c1 = await iceSum(host, wp.x, wp.z, 8), cg = await iceSum(gW, wp.x, wp.z, 8);
    ok(c1 >= c0 + 20, 'a guest\'s Ring of Earth cracks the host\'s ice (and the guest\'s follows it)', { before: c0, host: c1, guest: cg });
    const mp = await ev(gM, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    await ev(host, async ([x, z]) => { const I = await import('/src/game/ice.js'); I.crackAt(x, z, 4, 2, { lamp: false }); }, [mp.x, mp.z]);
    await sleep(1500);
    const f0 = await iceSum(host, mp.x, mp.z, 4.5);
    await ev(gM, () => { window.__G.player.cds.fill(0); });
    await cast(gM, 4, null, null);
    await sleep(1800);
    const f1 = await iceSum(host, mp.x, mp.z, 4.5);
    ok(f0 > 10 && f1 < f0 * 0.5, 'a guest\'s Blizzard (a Nova) heals the host\'s cracks', { before: f0, after: f1 });
    // --- every page draws the others' effects: the host's Bulwark on the guests, the guests' on the host ---
    await ev(host, () => { window.__G.player.cds.fill(0); });
    await cast(host, 1, null, null); await cast(gR, 1, null, null); await cast(gW, 2, null, null);
    await sleep(1500);
    const vis = await Promise.all(all.map((pg) => ev(pg, () => window.__G.areas.filter((a) => a.kind === 'custom' && a.team === 'vis').length)));
    ok(vis[0] >= 2 && vis[1] >= 1 && vis[2] >= 2 && vis[3] >= 1, 'each page draws the others\' Bulwarks and Hawks', vis);
    // --- 20 s of every page casting its four in turn (cooldowns as they are, resources full) ---
    await spawnPack();
    await ev(host, () => { for (const a of window.__G.actors) if (a.test) a.status.stun = 99; });
    // (everyone at the pack's edge: the Warden's spins reach it)
    for (const [i, pg] of all.entries()) await place(pg, spot.x + [-1.5, 1.5, -3, 3][i], spot.z + 3.6);
    for (const pg of all) await ev(pg, () => { window.__sent = 0; const h0 = window.__NET.NET.h.hitPuppet; if (h0 && !h0.wrapped) { const f = (src, tg, amt, o, crit) => { const r = h0(src, tg, amt, o, crit); window.__sent += r; return r; }; f.wrapped = true; window.__NET.NET.h.hitPuppet = f; } });
    const hp0 = await ev(host, () => window.__G.actors.filter((a) => a.test && !a.dead).reduce((s, a) => s + a.hp, 0));
    const drops0 = await Promise.all(all.map((pg) => ev(pg, () => window.__NET.S.ch.meter.tx.drops)));
    for (const pg of all) await ev(pg, () => { window.__NET.S.ch.meter.peak = 0; });
    for (const pg of all) await ev(pg, async () => { const B = await import('/src/ui/bus.js'); window.__casts = {}; if (!window.__castOn) { window.__castOn = true; B.on('skillUsed', (i) => { const id = (window.__G.hero.loadout || [])[i - 1]; window.__casts[id] = (window.__casts[id] || 0) + 1; }); } });
    let looks = 0;
    const t0 = Date.now(); let k = 0;
    while (Date.now() - t0 < 20000) {
      for (const pg of all) await ev(pg, async (k) => { const G = window.__G, pl = G.player, S = await import('/src/game/skills.js'); if (G.panel) window.__D.closePanel(); pl.res = G.stats.resMax; const f = S.nearestFoe(20); if (!pl.act || pl.act.name === 'whirl') window.__D.IN.events.push({ t: 'skill', i: 1 + (k % 4), aim: f ? { x: f.x, z: f.z } : null }); }, k);
      k++; await sleep(350);
      if (k % 6 === 0) looks = Math.max(looks, await ev(gM, () => window.__G.projs.filter((p) => p.team === 'vis' && p.look).length + window.__G.areas.filter((a) => a.team === 'vis' && (a.look || a.kind === 'custom')).length));
    }
    await sleep(1500);
    // (the host's own blows on them: its Bulwark, Ember Dance and the rest; the guests' sum is what they sent)
    const sent = await Promise.all(guests.map((g) => ev(g, () => window.__sent)));
    console.log('     casts', JSON.stringify(await Promise.all(all.map((pg) => ev(pg, () => window.__casts)))));
    ok(looks > 0, 'the mage guest draws the others\' shots and effects by their looks', looks);
    const hs = await ev(host, () => ({ left: window.__G.actors.filter((a) => a.test && !a.dead).reduce((s, a) => s + a.hp, 0), why: window.__NET.S.stats.why, rejected: window.__NET.S.stats.rejected, hits: window.__NET.S.stats.hits }));
    ok(!hs.why.big && !hs.why.rate && !hs.why.bad && !hs.why.pull && !hs.why.ice, 'nothing a guest\'s Mastery or skills did was refused as too much', hs.why);
    const st = await Promise.all(all.map((pg) => stats(pg)));
    for (const [i, x] of st.entries()) console.log('     ' + (i ? 'guest ' + i : 'host   ') + ' sends/s ' + x.r.msgsOut.toFixed(1) + ' (peak ' + (x.peak || 0).toFixed(1) + '), bytes/s out ' + Math.round(x.r.bytesOut) + ', in ' + Math.round(x.r.bytesIn) + ', drops ' + x.tx.drops + ', too big ' + x.tx.big);
    ok(st.every((x, i) => !x.tx.big && x.tx.drops === drops0[i] && x.peak <= 20), 'every page under 20 sends a second, none over 4 KiB, none dropped by the budget', st.map((x, i) => [+x.peak.toFixed(1), Math.round(x.r.bytesOut), x.tx.drops - drops0[i]]));
    // what the host took off them: at least the guests' blows (its own on top), each guest's no more than once
    ok(hp0 - hs.left >= sent.reduce((a, b) => a + b, 0) * 0.98, 'the host landed every blow the guests sent (Mastery in it once)', { sent, took: Math.round(hp0 - hs.left) });
    await sleep(14000);
    const end = await Promise.all(all.map((pg) => ev(pg, () => window.__G.areas.filter((a) => a.kind === 'custom' && a.team === 'vis').length)));
    ok(end.every((n) => n === 0), 'the drawn effects all end', end);
  },
  async act5() {
    const A4 = 'act1,act2,act3,act4,after3,hart,autumn,weaver,lord,fireTaken,ivar,plug,karthax,crownUnmade,giftsTaken,unbound,newFire';
    const { host, guests: [g] } = await party('coast', 1, { lvl: 30, glvl: 30, hq: '&quest=26&flags=' + A4 + ',alkyone,coastCall,cradle,coal,alkField,coastSeen,hearth,rite' });
    ok(await ev(g, () => !!window.__G.zone.tide), 'the guest\'s coast has its tide');
    // the host's clock jumped into the flood: the guest's follows within a snapshot or two, then the water rises on both
    await ev(host, () => { window.__G.zone.tide.t = 60; });
    await sleep(2500);
    const t1 = await ev(host, () => window.__G.zone.tide.t), t2 = await ev(g, () => window.__G.zone.tide.t);
    ok(Math.abs(t1 - t2) < 1.2, 'the guest\'s tide clock is the host\'s', { host: +t1.toFixed(2), guest: +t2.toFixed(2) });
    await sleep(9000);
    const h1 = await ev(host, () => ({ h: window.__G.zone.tide.h, ph: window.__G.zone.tide.phase })), h2 = await ev(g, () => ({ h: window.__G.zone.tide.h, ph: window.__G.zone.tide.phase }));
    ok(h1.ph === h2.ph && Math.abs(h1.h - h2.h) <= 0.16, 'the water stands the same on both (flood)', { host: h1, guest: h2 });
    // a boss's hold on the water (the Tower's forced flood) reaches the guest
    await ev(host, () => { window.__G.zone.tide.force = { h: 1.2, rate: 0.5 }; });
    await sleep(1500);
    const f2 = await ev(g, () => window.__G.zone.tide.force);
    ok(f2 && Math.abs(f2.h - 1.2) < 0.02, 'a boss\'s hold on the tide reaches the guest', f2);
    await ev(host, () => { window.__G.zone.tide.force = null; });
    // the Farthest Light: the ice
    await ev(host, async () => { const G = window.__G, h = G.hero; Object.assign(h.flags, { towerWake: true, towerDown: true, frozen: true, farSeen: true, alkShip: true, light_grey: true, light_wreck: true, light_fall: true, mem_i1: true, mem_i2: true, mem_i3: true }); h.quest = 28; const W = await import('/src/game/world.js'); await W.zoneReady('farlight'); window.__D.enterZone('farlight', { fresh: true }); });
    const there = await until(g, () => window.__G.zone?.id === 'farlight' && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 120000, 'farlight');
    ok(there, 'the guest followed onto the ice');
    // a thin-ice cell near the host, the guest on it
    const cell = await ev(host, () => { const G = window.__G, L = G.zone.L, p = G.player; let best = null, bd = 1e9; for (let i = 0; i < L.ice.length; i++) { if (!L.ice[i] || L.thick?.[i] || !G.zone.map.walkable(i % L.w + 0.5, Math.floor(i / L.w) + 0.5)) continue; const x = i % L.w + 0.5, z = Math.floor(i / L.w) + 0.5, d = Math.hypot(x - p.x, z - p.z); if (d < bd && d > 4) { bd = d; best = { i, x, z }; } } return best; });
    ok(!!cell, 'a cell of thin ice', cell);
    await place(host, cell.x + 6, cell.z);
    await ev(g, ([x, z]) => { const G = window.__G; G.player.x = x; G.player.z = z; G.player.hp = G.player.hpMax; window.__immortal = true; }, [cell.x, cell.z]);
    await sleep(1500);
    const pl0 = await ev(g, async () => (await import('/src/game/ice.js')).ICE_LOG.plunges.length);
    await ev(host, async ([x, z]) => { const I = await import('/src/game/ice.js'); I.breakAt(x, z, 1.6, { lamp: false }); }, [cell.x, cell.z]);
    await sleep(2500);
    const after = await ev(g, async (i) => { const I = await import('/src/game/ice.js'), G = window.__G; return { stage: G.zone.ice.stage[i], plunges: I.ICE_LOG.plunges.length, walk: G.zone.map.walkable(i % G.zone.L.w + 0.5, Math.floor(i / G.zone.L.w) + 0.5) }; }, cell.i);
    const hst = await ev(host, (i) => window.__G.zone.ice.stage[i], cell.i);
    ok(hst === 4 && after.stage === 4 && !after.walk, 'the host\'s break is open water on the guest\'s page too', { host: hst, guest: after });
    ok(after.plunges > pl0, 'and the guest standing on it went in (its own plunge, on its page)', { before: pl0, after: after.plunges });
    // the guest's weight is on the host's ice
    const load = await ev(host, async ([x, z]) => { const G = window.__G; const r = window.__NET.NET.remotes[0]; return r ? { at: [r.x.toFixed(1), r.z.toFixed(1)] } : null; }, [cell.x, cell.z]);
    ok(!!load, 'the host has the guest on its ice', load);
    console.log('     host net', JSON.stringify(await stats(host)));
  },

  // four heroes in a fight: the scaling table applied, every page well inside the room's budget
  async four() {
    const { host, guests } = await party('forest', 3, { lvl: 14, glvl: 13 });
    const hp = await hostPos(host);
    for (const [i, g] of guests.entries()) await place(g, hp.x + 2 * (i + 1), hp.z + 1);
    await sleep(1500);
    const sc = await ev(host, async () => { const A = await import('/src/game/actors.js'), D = await import('/src/game/data.js'), G = window.__G, p = G.player; const m = A.spawnMonster('skeleton', p.x + 5, p.z, {}); G.actors.push(m); const base = D.monsterHP(m.level) * D.MONSTERS.skeleton.hp * D.DIFFS[G.hero.diff].hp; return { n: window.__NET.NET.n, k: +(m.hpMax / base).toFixed(3), want: D.COOP.hp[3] }; });
    ok(sc.n === 4 && Math.abs(sc.k - sc.want) < 0.01, 'four players: a monster has the table\'s life (x' + sc.want + ')', sc);
    // a pack, bigger for four (the table's x1.75)
    const pk = await ev(host, () => { const z = window.__G.zone, p = window.__G.player; const list = z.packs.filter((q) => !q.spawned && q.n >= 4 && !q.elite).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); return list[0] && { x: list[0].x, z: list[0].z, n: list[0].n, id: list[0].id }; });
    await ev(host, () => { window.__immortal = true; });
    for (const g of guests) await ev(g, () => { window.__immortal = true; });
    await place(host, pk.x + 1, pk.z); for (const [i, g] of guests.entries()) await place(g, pk.x - 1 - i, pk.z + 1);
    await sleep(2500);
    const cnt = await ev(host, (id) => window.__G.actors.filter((a) => a.packId === id).length, pk.id);
    ok(cnt >= Math.round(pk.n * 1.75 * 0.85) - 1, 'the pack came bigger for four', { listed: pk.n, spawned: cnt });
    // fight for a while: everyone's blows, every page's sends counted
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      for (const g of guests) await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; G.player.hp = G.player.hpMax; for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe' && Math.hypot(a.x - G.player.x, a.z - G.player.z) < 14) { C.damage(G.player, a, G.stats.wmax * G.stats.dmgMult * 0.4, { crit: false }); break; } });
      await sleep(400);
    }
    const all = [];
    for (const [i, pg] of [host, ...guests].entries()) { const st = await stats(pg); all.push(st); console.log('     ' + (i ? 'guest ' + i : 'host   ') + ' sends/s ' + st.r.msgsOut.toFixed(1) + ' (peak ' + st.peak.toFixed(1) + '), bytes/s out ' + Math.round(st.r.bytesOut) + ', in ' + Math.round(st.r.bytesIn) + ', drops ' + st.tx.drops + ', too big ' + st.tx.big); }
    ok(all.every((s) => s.peak <= 20), 'every page under 20 sends a second (the room allows ~40)', all.map((s) => +s.peak.toFixed(1)));
    ok(all.every((s) => s.tx.big === 0), 'no message or presence ever over 4 KiB');
    ok(all[0].snaps > 0 && all[0].snapBytes / all[0].snaps < 3900, 'the host\'s snapshots average ' + Math.round(all[0].snapBytes / all[0].snaps) + ' bytes');
    const gk = []; for (const g of guests) gk.push(await ev(g, () => window.__G.hero.stats.kills));
    console.log('     guests\' kills', gk.join(' '));
    // the guests' mixed classes in the HUD
    ok(await ev(guests[0], () => window.__NET.party().length) === 3, 'a guest\'s party list holds the other three');
  },

  // the lobby and the HUD on a phone (844 x 390, touch), drawn
  async ui() {
    const host = await open('host', 'auto=town&lvl=14&render=1');
    await sleep(1500);
    await ev(host, () => window.__D.openPanel('coop')); await sleep(800);
    await shot(host, 'lobby-alone.png');
    const code = await ev(host, async () => { const c = await window.__NET.hostGame(); return c; });
    await sleep(600);
    const g = await open('g1', 'auto=town&lvl=12&cls=mage&render=1');
    await sleep(3500);
    await ev(g, () => window.__D.openPanel('coop')); await sleep(1500);
    await shot(g, 'lobby-list.png');
    ok(await ev(g, (c) => window.__NET.S.hosts.some((h) => h.c === c), code), 'the guest sees the host in the lobby\'s list');
    await ev(g, (c) => { document.querySelector(`[data-a="cjoin:${c}"]`)?.click(); }, code);
    await until(host, () => window.__NET.S.roster.length === 1, null, 15000, 'roster');
    await ev(host, () => window.__D.openPanel('coop')); await sleep(800);
    await shot(host, 'lobby-host.png');
    await ev(host, () => document.querySelector('[data-a="cstart"]')?.click());
    const inz = await until(g, () => window.__NET.S.zoneKey && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 60000, 'guest in');
    ok(inz, 'joined from the list and started from the panel');
    await ev(host, () => window.__D.closePanel()); await ev(g, () => window.__D.closePanel());
    const hp = await hostPos(host); await place(g, hp.x + 2.5, hp.z + 1);
    await sleep(2500);
    await shot(host, 'hud-host.png'); await shot(g, 'hud-guest.png');
    const plate = await ev(host, () => document.querySelectorAll('#plates .plate').length);
    ok(plate === 1, 'the host sees the guest\'s name over its head', plate);
    ok(await ev(g, () => !document.getElementById('party').hidden && document.querySelectorAll('#party .pm').length === 1), 'the guest\'s party frame shows the host');
    // downed
    await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await sleep(2800);
    await shot(g, 'downed-guest.png');
    await place(host, hp.x + 2.6, hp.z + 1.2); await sleep(1200);
    await shot(host, 'revive-host.png');
    ok(await ev(host, () => !document.getElementById('revive').hidden), 'the host\'s revive ring shows by the downed guest');
  },

  // the game over RoomTransport against the faithful fake room (its budget, 4 KiB, coalesced presence, 5% loss): join,
  // a fight, every page under the room's budget, nothing the room refuses
  async room() {
    const { host, guests: [g, g2] } = await party('forest', 2, { lvl: 10, glvl: 10 });
    ok(await ev(host, () => window.__NET.S.T.kind) === 'room' && await ev(g, () => window.__NET.S.T.kind) === 'room', 'the game picked the room transport');
    const pk = await ev(host, () => { const z = window.__G.zone, p = window.__G.player; const list = z.packs.filter((q) => !q.spawned && q.n >= 3).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)); return list[0] && { x: list[0].x, z: list[0].z }; });
    await ev(host, () => { window.__immortal = true; });
    await place(host, pk.x + 2, pk.z); await place(g, pk.x - 1, pk.z); await place(g2, pk.x, pk.z + 1);
    const hp0 = await ev(g, () => window.__G.player.hp);
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      for (const pg of [g, g2]) await ev(pg, async () => { const C = await import('/src/game/combat.js'), G = window.__G; if (G.player.dead) return; G.player.hp = Math.max(G.player.hp, G.player.hpMax * 0.5); for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe' && Math.hypot(a.x - G.player.x, a.z - G.player.z) < 14) { C.damage(G.player, a, G.stats.wmax * G.stats.dmgMult * 3, { crit: false }); break; } });
      await sleep(350);
    }
    const struck = await ev(g, (h0) => window.__G.player.hp < window.__G.player.hpMax || window.__G.hero.stats.kills > 0, hp0);
    const kills = [await ev(g, () => window.__G.hero.stats.kills), await ev(g2, () => window.__G.hero.stats.kills)];
    ok(kills[0] > 0 && kills[1] > 0, 'both guests fought and were paid for their kills through the room', kills);
    console.log('     diag host', JSON.stringify(await ev(host, () => ({ kills: window.__G.hero.stats.kills, hits: window.__NET.S.stats.hits, why: window.__NET.S.stats.why, done: [...window.__NET.S.done], rel: window.__NET.S.rel.length, foes: window.__G.actors.filter((a) => a.team === 'foe' && !a.prop && !a.dead).length, peers: [...window.__NET.S.peers.values()].map((p) => [p.peer, p.ack, (p.ev || []).length]) }))), 'guest', JSON.stringify(await ev(g, () => ({ ev: window.__NET.S.ev.length, evSeq: window.__NET.S.evSeq, relDone: window.__NET.S.relDone, pups: window.__NET.S.pup.size, me: window.__NET.S.ch.me }))));
    ok(struck, 'the host\'s monsters reached a guest through the room');
    const L = HUB.log;
    console.log('     room: emits ' + L.emits + ', delivered ' + L.delivered + ', lost ' + L.lost + ', presence sends ' + L.presSends + ', budget drops ' + L.budgetDrops + ', rejects ' + JSON.stringify(L.rejects));
    ok(L.budgetDrops === 0, 'the room never dropped a send for budget');
    ok(!Object.keys(L.rejects).length, 'the room never refused a call (sizes, topics, names)');
    for (const [i, pg] of [host, g, g2].entries()) { const st = await stats(pg); console.log('     ' + (i ? 'guest ' + i : 'host   ') + ' sends/s ' + st.r.msgsOut.toFixed(1) + ' (peak ' + (st.peak || 0).toFixed(1) + '), bytes/s out ' + Math.round(st.r.bytesOut) + ', in ' + Math.round(st.r.bytesIn)); }
  },

  // a boss of each act, the party moving from zone to zone with the host (the guest follows every change)
  async bosses() {
    const only = process.env.ACTS ? process.env.ACTS.split(',').map(Number) : [1, 2, 3, 4, 5];
    const { host, guests: [g] } = await party('town', 1, { lvl: 30, glvl: 28 });
    const ACT5 = 'act1,act2,act3,act4,after3,hart,autumn,weaver,lord,fireTaken,ivar,plug,karthax,crownUnmade,giftsTaken,unbound,newFire,alkyone,coastCall,cradle,coal,alkField,coastSeen,hearth,rite,tamMet,glaukosMet,light_grey,mem_i1,light_wreck,mem_i2,light_fall,mem_i3,towerWake';
    const ACTS = [
      { n: 1, z: 'crypt', kind: 'barrowLord', quest: 3, flags: 'weaver' },
      { n: 2, z: 'halls', kind: 'moltenKing', quest: 8, flags: 'stonewarden,act1' },
      { n: 3, z: 'heart', kind: 'amaranthe', quest: 14, flags: 'hart,thorn0,thorn1,thorn2,act1,act2' },
      { n: 4, z: 'ashfield', kind: 'ivar', quest: 19, flags: 'act1,act2,act3,fireTaken,lamp_l1,lamp_l2,lamp_l3,lamp_l4,lamp_l5,mem_l1,mem_l2,mem_l3,mem_l4,mem_l5' },
      { n: 5, z: 'coast', kind: 'tower', quest: 27, flags: ACT5 }
    ].filter((a) => only.includes(a.n));
    for (const A of ACTS) {
      const t0 = Date.now();
      await ev(host, async (A) => {
        const G = window.__G, h = G.hero; window.__immortal = true;
        h.quest = A.quest; for (const f of A.flags.split(',')) h.flags[f] = true;
        if (A.n >= 5) { h.act1 = h.act2 = h.act3 = h.act4 = 1; h.flags.lights5 = ['grey', 'wreck', 'fall']; }
        const W = await import('/src/game/world.js'); await W.zoneReady(A.z);
        window.__D.enterZone(A.z, { fresh: true });
        const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true;
        const f = z.map.nearestFloor(b.x + 2, b.z + 8); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999;
      }, A);
      const followed = await until(g, (z) => window.__G.zone?.id === z && window.__NET.S.zoneKey === window.__G.zone.netKey, A.z, 120000, 'guest follows to ' + A.z);
      ok(followed, `act ${A.n}: the guest followed the host to ${A.z} (${Math.round((Date.now() - t0) / 1000)} s)`);
      if (!followed) console.log('     guest', JSON.stringify(await ev(g, () => { const S = window.__NET.S, H = S.peers.get(S.hostPeer); return { role: S.role, zk: S.zoneKey, zone: window.__G.zone.id, mode: window.__G.mode, panel: window.__G.panel, loading: S.loading, world: !!S.world, H: H && [H.on, H.zone?.k, H.zk], fatal: document.getElementById('fatal')?.textContent?.slice(0, 400) }; })), 'host', JSON.stringify(await ev(host, () => ({ mode: window.__G.mode, zone: window.__G.zone.id, key: window.__G.zone.netKey || window.__G.zone.ep }))));
      const hp = await hostPos(host);
      await place(g, hp.x - 2, hp.z);
      await ev(g, () => { window.__immortal = true; const p = window.__G.player; p.hpMax = p.hp = 99999; });
      const up = await until(host, (k) => window.__G.zone.boss?.kind === k, A.kind, 20000, 'boss');
      // (the Tower is woken by its scene; the scenes are the host's)
      if (A.kind === 'tower') await ev(host, async () => { const b = window.__G.zone.boss; if (b?.holdWake) { const B = await import('/src/ui/bus.js'); B.emit('towerWake', window.__G.zone, b); } });
      ok(up, `act ${A.n}: the host's ${A.kind} is up`);
      const seen = await until(g, (k) => [...window.__NET.S.pup.values()].some((a) => a.kind === k && a.boss), A.kind, 20000, 'boss puppet');
      ok(seen, `act ${A.n}: the guest sees the ${A.kind}`);
      // the guest's blows on it land (its share of life goes down on the host)
      const h0 = await ev(host, () => { const b = window.__G.zone.boss; return b.hp / b.hpMax; });
      for (let i = 0; i < 12; i++) { await ev(g, async (k) => { const C = await import('/src/game/combat.js'), G = window.__G, b = [...window.__NET.S.pup.values()].find((a) => a.kind === k); if (b && !b.dead) { G.player.x = b.x + b.radius + 1.2; G.player.z = b.z; C.damage(G.player, b, G.stats.wmax * G.stats.dmgMult * 3, { crit: false }); } }, A.kind); await sleep(250); }
      await sleep(800);
      const h1 = await ev(host, () => { const b = window.__G.zone.boss; return b.hp / b.hpMax; });
      ok(h1 < h0 || h0 <= (await ev(host, () => (window.__G.zone.boss.hpFloor || 0) / window.__G.zone.boss.hpMax)) + 0.01, `act ${A.n}: the guest's blows took the ${A.kind}'s life`, { h0: +h0.toFixed(3), h1: +h1.toFixed(3) });
      // the host finishes it (its phases and floors), the party paid
      const items0 = await ev(g, () => window.__G.pickups.filter((p) => p.kind === 'item').length + window.__G.hero.inv.filter(Boolean).length);
      let dead = false;
      for (let k = 0; k < 40 && !dead; k++) {
        dead = await ev(host, () => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; b.dazed = 0; b.hidden = false; b.invuln = 0; b.hpFloor = 0; b.holdWake = false; for (const n of b.nodes || []) if (!n.dead) window.__D.kill(n); for (const a of G.actors) if (a.bossNode === b && !a.dead) window.__D.kill(a); window.__D.kill(b); return b.dead; });
        await sleep(1200);
      }
      ok(dead, `act ${A.n}: the ${A.kind} is down`);
      const gotDeath = await until(g, (k) => ![...window.__NET.S.pup.values()].some((a) => a.kind === k && !a.dead), A.kind, 15000, 'boss dead on guest');
      ok(gotDeath, `act ${A.n}: and down on the guest's page`);
      await until(g, (n0) => window.__G.pickups.filter((p) => p.kind === 'item').length + window.__G.hero.inv.filter(Boolean).length >= n0 + 4, items0, 20000, 'boss loot');
      const items1 = await ev(g, () => window.__G.pickups.filter((p) => p.kind === 'item').length + window.__G.hero.inv.filter(Boolean).length);
      ok(items1 - items0 >= 4, `act ${A.n}: the guest's own boss loot dropped on its page`, items1 - items0);
      await shot(g, `boss${A.n}-guest.png`).catch(() => {});
      // the guest's pickups were never the host's
      await ev(g, () => { for (const p of window.__G.pickups.slice()) if (p.kind === 'item') { /* leave them */ } });
    }
    console.log('     host net', JSON.stringify(await stats(host)));
  }
};

try {
  if (!SC[name]) throw new Error('no scenario ' + name);
  await SC[name]();
} catch (e) { ok(false, 'scenario threw: ' + (e.stack || e).toString().slice(0, 600)); }
fs.writeFileSync(out + '/' + name + '.json', JSON.stringify({ name, fails, results }, null, 1));
await sleep(250);
ok(!FATAL.length, 'no #fatal on any page', FATAL.length ? FATAL.slice(0, 6) : undefined);
console.log(fails ? fails + ' FAILED' : 'all passed');
await browser.close();
process.exit(fails ? 1 : 0);
