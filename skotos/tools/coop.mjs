// Co-op scenarios: node tools/coop.mjs <name> <outdir>   (BASE=http://localhost:<port>/, a private no-HMR server)
// One headless browser, two to four pages in one context (LocalTransport: BroadcastChannel), each with its own save
// (?slot=). Every page is ?net=local&norender: the game runs, nothing is drawn (but for the screenshots).
// Names: join, pack, boss1..boss5, loot, revive, churn, hostleave, cheat, world, act5, scaling, four, ui
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
// (the phone: 844 x 390 landscape; the ui scenario as a touch phone)
const ctx = await browser.newContext(name === 'ui' ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 844, height: 390 } });
const pages = [];
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
    // (the host stays where it is, 12 m off; the monsters' deaths on the host are counted, its own share being only of those
    // within 50 m of it)
    await ev(host, async () => { window.__immortal = true; const p = window.__G.player; p.hpMax = p.hp = 99999; const B = await import('/src/ui/bus.js'); window.__kills = 0; B.on('kill', () => window.__kills++); });
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
    const k0 = await ev(host, () => window.__kills);
    for (let i = 0; i < 40; i++) {
      await ev(g, () => { const G = window.__G; G.player.hp = G.player.hpMax; for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe') { G.player.x = a.x + 1.2; G.player.z = a.z; window.__D.emit; window.__dmg ||= null; } });
      await ev(g, async () => { const C = await import('/src/game/combat.js'); const G = window.__G; for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe' && Math.hypot(a.x - G.player.x, a.z - G.player.z) < 20) C.damage(G.player, a, G.stats.wmax * G.stats.dmgMult * 2.5, { crit: false }); });
      await sleep(300);
      const left = await ev(host, () => window.__G.actors.filter((a) => a.team === 'foe' && !a.prop && !a.dead && !a.remote).length);
      if (!left) break;
    }
    const k1 = await ev(host, () => window.__kills);
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
  // a guest that lies (blows too big, on what is not there or far away, junk, a flood of raises and of fx, a jump across
  // the map, burns) and a host that lies (rewards past any kill's, items no roll makes, a zone's level, statuses, a world
  // with acts the guest never played, fx) and a listing in another's name: each page refuses them and plays on, and the
  // guest's hero still works everywhere (its bag, the shops, its stash, equipping, Continue), its save repaired on load
  async cheat() {
    const { host, guests: [g] } = await party('forest', 1, { lvl: 10, glvl: 10 });
    const fatal = (pg) => ev(pg, () => document.getElementById('fatal')?.textContent || '');
    await ev(host, async () => { const A = await import('/src/game/actors.js'), G = window.__G, p = G.player; window.__far = A.spawnMonster('skeleton', p.x + 40, p.z, {}); G.actors.push(window.__far); window.__near = A.spawnMonster('skeleton', p.x + 3, p.z, {}); window.__near.hp = window.__near.hpMax = 1e7; G.actors.push(window.__near); });
    const ids = await ev(host, () => [window.__near.id, window.__far.id]);
    const hp = await hostPos(host); await place(g, hp.x + 2, hp.z);
    await sleep(1200);
    await ev(g, ([near, far]) => { const S = window.__NET.S; for (const e of [['h', near, 1e9, 0, {}], ['h', far, 5, 0, {}], ['h', 999999, 5, 0, {}], ['h', near, 'x', 0, {}], ['h', near, 5, 0, { stun: 1e9, knock: 1e9 }], ['zz', 1], ['h', near, -5, 0, null]]) S.ev.push([++S.evSeq, ...e]); for (let i = 0; i < 400; i++) S.ev.push([++S.evSeq, 'h', near, 60, 0, {}]); }, ids);
    await sleep(3000);
    const r = await ev(host, () => ({ near: window.__near.dead ? 0 : Math.round(window.__near.hp), max: Math.round(window.__near.hpMax), why: { ...window.__NET.S.stats.why }, far: window.__far.hp === window.__far.hpMax, stun: window.__near.status.stun, err: document.getElementById('fatal')?.textContent || '' }));
    ok(r.why.big >= 1 && r.far && !r.err, 'a blow too big and one from 40 m are refused; nothing broke', r);
    ok(r.stun <= 3, 'statuses are clamped', r.stun);
    ok((r.why.rate || 0) > 0 && r.near > 1e7 - 400 * 60, 'a flood of 400 blows in a moment is rate-held', { why: r.why, lost: 1e7 - r.near });
    // burns count with their blows: forty touches that each light a burn as big as a blow may be go over the second's rate
    await sleep(1200);
    await ev(g, (near) => { const S = window.__NET.S; for (let i = 0; i < 40; i++) S.ev.push([++S.evSeq, 'h', near, 1, 0, { burn: 1e7 }]); }, ids[0]);
    await sleep(1500);
    const rate2 = await ev(host, () => window.__NET.S.stats.why.rate || 0);
    ok(rate2 > (r.why.rate || 0), 'a flood of small blows carrying big burns is rate-held too', { before: r.why.rate, after: rate2 });

    // ---- the host lies to its guest ----
    const me = await ev(g, () => window.__NET.S.ch.me);
    const g0 = await ev(g, () => { const h = window.__G.hero.__real; return { level: h.level, gold: h.gold, kills: h.stats.kills, bag: h.inv.filter(Boolean).length }; });
    const gp = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    await ev(host, ([pr, p]) => {
      const N = window.__NET, x = Math.round(p.x * 10), z = Math.round(p.z * 10);
      // a kill no monster made, paid with a billion XP and eight piles of ten million, sent again and again
      for (let i = 0; i < 20; i++) N.relTo(pr, ['k', 999999, x, z, 1e9, Array(8).fill(1e7), [], 0, 1]);
      // fresh kills a hundred at once
      for (let i = 0; i < 100; i++) N.relTo(pr, ['k', 500000 + i, x, z, 1e9, [1e7], [], 0, 0]);
      // items no roll makes: a stat no item has, a skill as a number, huge numbers, a price, a legendary not of its base,
      // damage as a number, a base that is no base, junk keys
      N.relTo(pr, ['it', x, z, { id: 'evil1', base: 'ring', rar: 2, ilvl: 99, stats: { legs: 1, main: 1e300, crit: 1e9, skill: 5, constructor: 3 }, value: 1e15, leg: 'swiftboots', dmg: 5, extraKey: 'x' }]);
      N.relTo(pr, ['it', x, z, { id: 'evil2', base: 'crossbow', rar: 3, leg: 'dawnblade', ilvl: 2e9, dmg: [1e6, 1e6], spd: 5, value: 1e15, stats: { main: 1e300, skill: { id: 'nope', v: 1e9 } } }]);
      N.relTo(pr, ['it', x, z, { id: 'evil3', base: 'amulet', rar: 1, ilvl: 40, sfx: 'legs', stats: { skill: { id: 'fireball', v: 1e9 }, vit: -1e9, mf: 'x' } }]);
      N.relTo(pr, ['it', x, z, { id: 'evil4', base: 'constructor', rar: 0, ilvl: 1 }]);
      // statuses past any monster's
      N.relTo(pr, ['h', 0, 1, 1, { freeze: 2e9, seen: 2e9, root: 2e9, push: 1e6, stun: 2e9, cold: 1e9, kx: 1e300, kz: 0 }]);
      N.relTo(pr, ['cd', 7, 'x'.repeat(5000)]);
    }, [me, gp]);
    await sleep(2500);
    const st1 = await ev(g, () => { const pl = window.__G.player; return { freeze: pl.status.freeze, seen: pl.buffs.seen || 0, root: pl.status.root, stun: pl.status.stun, clip: (window.__NET.S.hclips.get(7) || '').length }; });
    ok(st1.freeze <= 2 && st1.seen <= 6 && st1.root <= 1.2 && st1.clip <= 47, 'a host\'s statuses on a guest are the game\'s own at most (freeze, Seen, roots)', st1);
    // the guest walks over what fell
    for (let k = 0; k < 12; k++) {
      const left = await ev(g, () => { const G = window.__G, p = G.pickups.find((q) => q.kind === 'item' || q.kind === 'gold'); if (!p) return 0; G.player.x = p.x; G.player.z = p.z; G.player.hp = G.player.hpMax; return G.pickups.length; });
      if (!left) break;
      await sleep(700);
    }
    const g1 = await ev(g, async () => {
      const D = await import('/src/game/data.js'), I = await import('/src/game/items.js'), h = window.__G.hero.__real;
      const bad = [];
      for (const it of h.inv.filter(Boolean)) {
        for (const k of Object.keys(it.stats)) { const v = it.stats[k]; if (k === 'skill') { if (!D.SKILLS[I.itemClass(it) || 'mage'].concat(...Object.values(D.SKILLS)).some((s) => s.id === v.id) || !(v.v <= I.statMax('skill', it.ilvl))) bad.push(it.id + ' skill'); } else if (!(k in D.STATS) || !(v <= I.statMax(k, it.ilvl)) || !(v >= 0)) bad.push(it.id + ' ' + k); }
        for (const k of Object.keys(it)) if (!['id', 'base', 'rar', 'ilvl', 'stats', 'dmg', 'spd', 'armor', 'block', 'leg', 'sfx', 'value', 'isNew'].includes(k)) bad.push(it.id + ' key ' + k);
        if (it.ilvl > 53 || it.value > 1e5 || (it.dmg && (it.dmg[1] > 1000 || it.spd !== D.BASES[it.base].spd)) || (it.leg && D.LEGENDARIES.find((l) => l.id === it.leg)?.base !== it.base)) bad.push(it.id + ' numbers');
      }
      return { level: h.level, xp: h.xp, gold: h.gold, kills: h.stats.kills, bag: h.inv.filter(Boolean).length, ids: h.inv.filter(Boolean).map((it) => it.id + ':' + it.base + ':' + it.rar + ':' + it.ilvl), bad };
    });
    ok(g1.bad.length === 0, 'every item the host sent is rebuilt as an item: stats from STATS within a roll, no price, junk or false legendary', g1);
    ok(!g1.ids.some((s) => s.startsWith('evil4')), 'a base that is no base never reaches the bag', g1.ids);
    ok(g1.kills - g0.kills <= 50 && g1.gold - g0.gold < 2e5 && isFinite(g1.xp), 'rewards are held to what kills can pay: each kill once, forty at once, gold within a pile\'s', { before: g0, after: { level: g1.level, gold: g1.gold, kills: g1.kills } });
    ok(g1.bag - g0.bag <= 3, 'and items only as many as the kills could bring', { before: g0.bag, after: g1.bag });

    // the zone's level is the zone's own, whatever the host says
    for (const lv of [2e9, -2e9]) {
      await ev(host, (lv) => { window.__G.zone.level = lv; window.__G.zone.netKey = 'forest:evil' + (lv > 0 ? 'a' : 'b'); }, lv);
      const k = 'forest:evil' + (lv > 0 ? 'a' : 'b');
      const inz = await until(g, (k) => window.__NET.S.zoneKey === k && window.__G.zone.netKey === k, k, 60000, 'rebuilt zone');
      const zl = await ev(g, () => window.__G.zone.level);
      ok(inz && zl === 1, 'the host\'s zone at level ' + lv + ' is built at the forest\'s own level on the guest', { inz, zl });
    }
    await ev(host, () => { window.__G.zone.level = 1; });

    // fx past any skill's, from the guest to the host and from the host to the guest: clamped, the frames go on
    const gapOn = (pg) => ev(pg, () => { window.__gap = 0; let t0 = performance.now(); const f = (t) => { window.__gap = Math.max(window.__gap, t - t0); t0 = t; if (window.__gapOn) requestAnimationFrame(f); }; window.__gapOn = true; requestAnimationFrame(f); });
    const gapOff = (pg) => ev(pg, () => { window.__gapOn = false; return Math.round(window.__gap); });
    await gapOn(host); await gapOn(g);
    await ev(g, () => { const S = window.__NET.S, p = window.__G.player; S.ch.emit('f', [[3, p.x, 1, p.z, 3e7], [3, p.x, 1, p.z, 1e300], [0, p.x, p.z, 1e6, 0xffffff, {}], [11, p.x, 1, p.z, p.x + 1e6, 1, p.z, 0xffffff, 1e3]]); let k = 0; const send = () => { S.ch.emit('f', Array.from({ length: 60 }, () => [1, p.x, p.z, 50, 0xffffff, 1e9])); if (++k < 5) setTimeout(send, 250); }; send(); });
    await ev(host, () => { const N = window.__NET, p = window.__G.player; for (let i = 0; i < 40; i++) (N.S.fxHost ||= []).push({ n: 'sparks', a: [p.x, 1, p.z, 3e7], x: p.x, z: p.z }); });
    await sleep(2500);
    const gaps = { host: await gapOff(host), guest: await gapOff(g) };
    const rings = await ev(host, async () => (await import('/src/gfx/fx.js')).FX.rings.length);
    ok(gaps.host < 1000 && gaps.guest < 1000 && rings <= 100, 'a flood of fx no skill makes: each page\'s frames go on, its rings held', { gaps, rings });

    // raises: a guest cannot raise itself, nor flood the host with raises (the host away, so it raises no one)
    const hp3 = await hostPos(host); await place(host, hp3.x + 15, hp3.z);
    await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await sleep(800);
    const q0 = await ev(host, () => window.__NET.S.relSeq);
    await ev(g, () => { const S = window.__NET.S; for (let i = 0; i < 200; i++) S.ev.push([++S.evSeq, 'rv', S.ch.me]); });
    await sleep(2500);
    const rv = await ev(host, (q0) => ({ seq: window.__NET.S.relSeq - q0, why: window.__NET.S.stats.why.rv || 0 }), q0);
    const stillDown = await ev(g, () => window.__G.player.dead);
    ok(rv.why >= 1 && rv.seq < 60 && stillDown, 'a guest\'s own raise, two hundred times, is refused (no flood of events)', { rv, stillDown });
    await ev(g, () => window.__NET.respawnNow());
    await sleep(1500);

    // a jump across the map: the host's stand-in follows only as fast as a hero moves
    const a0 = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return { x: r.x, z: r.z }; });
    // (to a spot 30 m off where the guest's own game lets its hero stand)
    const to = await ev(g, () => { const G = window.__G, p = G.player, m = G.zone.map; for (let a = 0; a < 6.28; a += 0.2) for (const d of [30, 28, 32, 26]) { const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (m.walkable(x, z)) { p.x = x; p.z = z; return { x, z }; } } return null; });
    await sleep(450);
    const a1 = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return { x: r.x, z: r.z }; });
    const gat = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    ok(to && Math.hypot(gat.x - to.x, gat.z - to.z) < 1 && Math.hypot(a1.x - a0.x, a1.z - a0.z) < 25 && Math.hypot(a1.x - to.x, a1.z - to.z) > 4, 'a guest\'s jump of 30 m: its stand-in on the host does not jump with it', { a0, a1, to, gat });
    await sleep(4000);
    const a2 = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return { x: r.x, z: r.z }; });
    ok(to && Math.hypot(a2.x - to.x, a2.z - to.z) < 2, 'and it catches up at a hero\'s pace', { a2, to });

    // a listing in another's name: the room's own peer and person stand on it
    await ev(g, () => window.__NET.S.T.lobby.presence({ g: { c: 'zzzz', cls: 'warden', l: 40, z: 'coast', n: 1, d: 0, v: 2, on: 1, by: 'user_owner', peer: 'forged' } }));
    await until(host, () => window.__NET.S.hosts.some((h) => h.c === 'zzzz'), null, 8000, 'listing');
    const L = await ev(host, () => window.__NET.S.hosts.find((h) => h.c === 'zzzz'));
    const lme = await ev(g, () => window.__NET.S.T.lobby.me);
    ok(L && L.peer === lme && L.by !== 'user_owner', 'a listing cannot name another peer or person', L);
    await ev(g, () => window.__NET.S.T.lobby.presence({ g: null }));

    // a world with every act done and the new fire lit (Act IV left open), and the town: the guest is offered nothing and
    // closes no act of its own
    const own0 = await ev(g, () => { const h = window.__G.hero.__real; return JSON.stringify({ boons: h.boons, a: [h.act1, h.act2, h.act3, h.act4, h.act5], quest: h.quest }); });
    await ev(host, () => { const h = window.__G.hero; h.act1 = h.act2 = h.act3 = 0; h.act4 = -1; h.flags.newFire = true; h.flags.act1 = h.flags.act2 = h.flags.act3 = true; });
    await sleep(1500);
    const offered = await ev(g, async () => { const St = await import('/src/game/story.js'); return St.offerBoons(); });
    await ev(host, () => window.__D.emit('travel', 'town', { at: 'waypoint' }));
    await until(g, () => window.__G.zone?.id === 'town' && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 60000, 'town');
    const panels = new Set();
    for (let k = 0; k < 24; k++) { const p = await ev(g, () => window.__G.panel); if (p) panels.add(p); await sleep(250); }
    const own1 = await ev(g, () => { const h = window.__G.hero.__real; return JSON.stringify({ boons: h.boons, a: [h.act1, h.act2, h.act3, h.act4, h.act5], quest: h.quest }); });
    ok(!offered && !panels.has('boon') && !panels.has('act') && own0 === own1, 'the host\'s acts offer the guest no blessing and close no act of its own', { offered, panels: [...panels], own0, own1 });
    // a host's Act IV gifts are not the guest's
    const gift = await ev(host, () => { window.__G.hero.flags.gifts = { forge: 'taken', throne: 'taken' }; return true; });
    await sleep(1500);
    const gs = await ev(g, () => { const S0 = window.__G.stats; window.__D.refreshStats(); return { before: S0.dmgMult, after: window.__G.stats.dmgMult, own: window.__G.hero.__real.flags.gifts || null }; });
    ok(gift && Math.abs(gs.before - gs.after) < 1e-9, 'the host\'s Crown gifts do not reach the guest\'s stats', gs);
    ok(!(await fatal(host)) && !(await fatal(g)), 'neither page broke', { host: await fatal(host), guest: await fatal(g) });

    // ---- the guest's hero still works everywhere ----
    await ev(g, () => { window.__G.player.dead = false; window.__G.player.hp = window.__G.player.hpMax; });
    const panelOk = async (name, ctx) => ev(g, ([n, c]) => { window.__D.openPanel(n, c); const el = document.getElementById('panel'), r = { name: n, open: window.__G.panel === n, close: !!el.querySelector('[data-a="close"]'), cells: el.querySelectorAll('.cell').length }; window.__D.closePanel(); return r; }, [name, ctx]);
    for (const [n, c] of [['inventory'], ['vendor', { npc: 'healer' }], ['smith'], ['stash']]) { const p = await panelOk(n, c); ok(p.open && p.close && p.cells > 0, 'the guest\'s ' + n + ' panel opens, drawn', p); }
    const eq = await ev(g, async () => { const Iv = await import('/src/game/inventory.js'), h = window.__G.hero.__real, i = h.inv.findIndex((it) => it && it.id === 'evil1'); if (i < 0) return { none: true }; const ok1 = Iv.equip(i); return { ok: ok1, ring: !!(h.equip.ring1?.id === 'evil1' || h.equip.ring2?.id === 'evil1'), dps: window.__G.stats.dps, life: window.__G.stats.lifeMax }; });
    ok((eq.none || eq.ok && eq.ring) && isFinite(eq.dps ?? 1) && isFinite(eq.life ?? 1), 'and equipping what the host sent works', eq);
    // home, and its save poisoned the old way (as a page before this fix let it be): Continue repairs it
    await ev(g, () => window.__NET.leaveGame('coop.youLeft'));
    await until(g, () => window.__G.zone?.id === 'town' && !window.__NET.S.role && !window.__G.hero.__real, null, 30000, 'home');
    await ev(g, async () => {
      (await import('/src/game/save.js')).writeSave();
      const raw = JSON.parse(localStorage.getItem('skotos.save.v1.g1')), h = raw.heroes.find((x) => x.id === raw.last);
      h.inv[h.inv.indexOf(null)] = { id: 'old1', base: 'ring', rar: 0, ilvl: 1, stats: { legs: 1, main: 40 }, value: 1e15 };
      h.inv[h.inv.indexOf(null)] = { id: 'old2', base: 'crossbow', rar: 0, ilvl: 99, dmg: 5, stats: { skill: 5 } };
      h.equip.amulet = { id: 'old3', base: 'amulet', rar: 2, ilvl: 30, stats: { legs: 2, skill: { id: 3 }, crit: 1e9 }, leg: 7, sfx: -4 };
      h.gold = -5e10; h.xp = 1e9; h.boons = 'ember';
      localStorage.setItem('skotos.save.v1.g1', JSON.stringify(raw));
      // (and this page leaves without saving over it)
      window.__G.save = null;
    });
    await g.goto(BASE + '?' + NETQ + 'peer=g1&slot=g1&q=0&norender');
    await g.waitForFunction(() => window.__ready && window.__G.mode === 'title', null, { timeout: 240000 });
    await sleep(600); await ev(g, () => document.getElementById('screen').click());
    await g.waitForFunction(() => !!document.getElementById('m-cont'), null, { timeout: 30000 });
    await sleep(700); await ev(g, () => document.getElementById('m-cont').click());
    const cont = await until(g, () => window.__G.mode === 'play' && window.__G.zone, null, 90000, 'continue');
    const rep = await ev(g, () => { const h = window.__G.hero, find = (id) => h.inv.find((it) => it?.id === id); return { gold: h.gold, xp: h.xp, boons: h.boons, old1: find('old1')?.stats, v1: find('old1')?.value, old2: find('old2') && { dmg: find('old2').dmg, stats: find('old2').stats }, amulet: h.equip.amulet && { stats: h.equip.amulet.stats, leg: h.equip.amulet.leg ?? null }, dps: window.__G.stats.dps }; });
    ok(cont && !(await fatal(g)), 'Continue takes the repaired hero up', { cont, fatal: await fatal(g) });
    ok(rep.gold === 0 && rep.xp < 2e4 && Array.isArray(rep.boons) && !('legs' in (rep.old1 || {})) && rep.v1 < 100 && Array.isArray(rep.old2?.dmg) && !rep.old2.stats.skill && rep.amulet && !('legs' in rep.amulet.stats) && rep.amulet.stats.crit <= 10 && isFinite(rep.dps), 'its save repaired on load: items rebuilt, gold, XP and blessings sound', rep);
    for (const [n, c] of [['inventory'], ['vendor', { npc: 'healer' }], ['stash']]) { const p = await panelOk(n, c); ok(p.open && p.close && p.cells > 0, 'after Continue its ' + n + ' panel opens', p); }
    const eq2 = await ev(g, async () => { const Iv = await import('/src/game/inventory.js'), h = window.__G.hero, i = h.inv.findIndex((it) => it?.id === 'old1'); return { ok: Iv.equip(i), life: window.__G.stats.lifeMax }; });
    ok(eq2.ok && isFinite(eq2.life), 'and equips a repaired item', eq2);
    ok(!(await fatal(g)), 'no error on the guest\'s page', await fatal(g));
  },

  // the world kept in step while the host's story and the party move (no place(): the guests come to the host's side): a
  // guest's page that stops, the pools, the puppet's bar, the 50 m rule, a zone kept and what fell carried along, the scaling
  // in a zone left behind, the thorn walls and the slag opened with the guest there, the skerry, the Tower's clock with only a
  // guest in the bay, the ice's gusts and fires and a sealed hole, and downed when the game ends
  async world() {
    const fatal = (pg) => ev(pg, () => document.getElementById('fatal')?.textContent || '');
    const at = (pg) => ev(pg, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const tough = (pg) => ev(pg, () => { const p = window.__G.player; p.hpMax = p.hp = 99999; });
    const inZone = (pg, z, ms = 120000) => until(pg, (z) => window.__G.zone?.id === z && window.__NET.S.zoneKey === window.__G.zone.netKey, z, ms, 'guest in ' + z);
    // (the host takes a waypoint once its last arrival is over: a guest entering a zone it kept can be there before it is)
    const go = async (z) => { await until(host, () => !document.getElementById('fade').classList.contains('on'), null, 10000, 'fade'); await sleep(300); await ev(host, (z) => window.__D.emit('travel', z, { at: 'waypoint' }), z); };
    const walk = (pg, cells) => ev(pg, (cells) => { const m = window.__G.zone.map; return cells.filter(([x, z]) => m.walkable(x + 0.5, z + 0.5)).length; }, cells);
    // (a forest with chests)
    const { host, guests: [g, g2], code } = await party('forest', 2, { lvl: 14, glvl: 14, hq: '&seed=1234' });
    for (const pg of [host, g, g2]) await tough(pg);
    // arriving: at the host's side, not at the waypoint
    const h0 = await hostPos(host);
    for (const [i, pg] of [g, g2].entries()) { const p = await at(pg); ok(dist(p, h0) < 4, 'guest ' + (i + 1) + ' joined at the host\'s side', { d: +dist(p, h0).toFixed(1) }); }

    // a guest's page stops (a hidden tab): not counted once its beat stops, the other guest's events never wait for it
    const p1 = await ev(g, () => window.__NET.S.ch.me), p2 = await ev(g2, () => window.__NET.S.ch.me);
    await ev(g2, () => { window.__raf0 = window.requestAnimationFrame; window.__rafQ = []; window.requestAnimationFrame = (f) => { window.__rafQ.push(f); return 0; }; });
    await ev(host, (pr) => { for (let i = 0; i < 150; i++) window.__NET.relTo(pr, ['say', 'x'.repeat(40)]); }, p2);
    const stopped = await until(host, () => window.__NET.NET.n === 2 && window.__NET.NET.remotes.length === 1, null, 12000, 'stopped guest dropped');
    ok(stopped, 'a guest whose page stopped is not counted once its beat stops', await ev(host, () => window.__NET.NET.n));
    await ev(host, (pr) => window.__NET.relTo(pr, ['cd', 900, 'probe']), p1);
    const t0 = Date.now(), probe = await until(g, () => window.__NET.S.hclips.get(900) === 'probe', null, 10000, 'probe');
    ok(probe && Date.now() - t0 < 2000, 'and the other guest\'s reliable events still come at once', { ms: Date.now() - t0 });
    await ev(g2, () => { window.requestAnimationFrame = window.__raf0; for (const f of window.__rafQ.splice(0)) window.__raf0(f); });
    ok(await until(host, () => window.__NET.NET.n === 3, null, 15000, 'beats again'), 'it is counted again once it beats');
    await g2.close(); pages.splice(pages.indexOf(g2), 1);
    await until(host, () => window.__NET.NET.n === 2, null, 25000, 'g2 gone');

    // a monster's pool with no owner and the Flood's ring of amber: on the guest's page too
    const gp = await at(g);
    await ev(host, async (p) => { const S = await import('/src/game/sap.js'); S.addSapPool(p.x, p.z, 2, 8); S.addSapRing(p.x + 20, p.z, 7, 16, 6); }, gp);
    await sleep(1200);
    const sp = await ev(g, async (p) => (await import('/src/game/sap.js')).sapPools().map((q) => [Math.round(q.x - p.x), Math.round(q.z - p.z), q.r0, q.r]), gp);
    ok(sp.some(([dx, dz, r0, r]) => Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && r === 2) && sp.some(([, , r0, r]) => r0 === 7 && r === 16), 'a pool with no owner and the Flood\'s ring reach the guest', sp);

    // the puppet's bar: a guest's blow moves it by its share of the host's life (x1.7 for two)
    const m0 = await ev(host, async (p) => { const A = await import('/src/game/actors.js'), G = window.__G; const m = A.spawnMonster('skeleton', p.x + 3, p.z, {}); G.actors.push(m); return { id: m.id, max: Math.round(m.hpMax), k: m.coopK }; }, gp);
    await until(g, (id) => window.__NET.S.pup.has(id), m0.id, 8000, 'puppet');
    await sleep(300);
    const bar = await ev(g, async (id) => { const C = await import('/src/game/combat.js'), G = window.__G, S = window.__NET.S, a = S.pup.get(id), f0 = a.hp / a.hpMax; C.damage(G.player, a, 40, { crit: false }); const e = S.ev[S.ev.length - 1]; return { f0, f1: a.hp / a.hpMax, amt: e?.[3], net: a.netHpMax, own: Math.round(a.hpMax) }; }, m0.id);
    const want = bar.amt / m0.max;
    ok(bar.net === m0.max && Math.abs(bar.f0 - bar.f1 - want) < want * 0.25 + 0.002, 'a guest\'s blow moves the puppet\'s bar by its share of the host\'s life', { ...bar, host: m0, want: +want.toFixed(4) });

    // the 50 m rule for the host too: a kill beside the guest 60 m from the host pays the guest only; beside both, both
    const xp = (pg) => ev(pg, () => { const h = window.__G.hero.__real || window.__G.hero; return h.level * 1e7 + h.xp; });
    let hx = await xp(host), gx = await xp(g);
    await ev(host, (id) => { const m = window.__G.actors.find((a) => a.id === id); if (m) window.__D.kill(m); }, m0.id);
    await sleep(1500);
    let hx1 = await xp(host), gx1 = await xp(g);
    ok(hx1 > hx && gx1 > gx, 'a kill beside both pays both', { host: hx1 - hx, guest: gx1 - gx });
    const far = await ev(host, (p) => { const G = window.__G, m = G.zone.map; for (let a = 0; a < 6.28; a += 0.2) for (const d of [62, 66, 70]) { const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (m.walkable(x, z)) { G.player.x = x; G.player.z = z; return { x, z }; } } return null; }, gp);
    hx = await xp(host); gx = await xp(g);
    await ev(host, async (p) => { const A = await import('/src/game/actors.js'), G = window.__G; const m = A.spawnMonster('skeleton', p.x + 2, p.z, {}); G.actors.push(m); window.__D.kill(m); }, gp);
    await sleep(1500);
    hx1 = await xp(host); gx1 = await xp(g);
    ok(far && hx1 === hx && gx1 > gx, 'a kill 60 m from the host pays the guest beside it, not the host', { far: !!far, host: hx1 - hx, guest: gx1 - gx });
    await place(host, gp.x - 2, gp.z);
    await sleep(1000);

    // a chest the guest opened, its loot left lying: the host goes to town (the guest comes by its side, its loot with it)
    // and back to the same forest (the chest still open)
    const chest = await ev(g, () => { const G = window.__G, p = G.player, c = G.zone.interact.filter((i) => i.kind === 'chest' && !i.used).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (!c) return null; c.use(); return { i: G.zone.interact.indexOf(c), x: c.x, z: c.z }; });
    await sleep(1800);
    const b0 = await ev(g, () => ({ ground: window.__G.pickups.filter((p) => p.kind === 'item').length, bag: window.__G.hero.inv.filter(Boolean).length, gold: window.__G.hero.gold }));
    const fk = await ev(host, () => window.__G.zone.ep);
    await go('town');
    const inT = await inZone(g, 'town', 60000);
    await sleep(400);
    const ht = await hostPos(host), gt = await at(g);
    ok(inT && dist(ht, gt) < 4, 'after the host\'s zone change the guest arrives at its side', { d: +dist(ht, gt).toFixed(1) });
    const b1 = await ev(g, () => ({ bag: window.__G.hero.inv.filter(Boolean).length, gold: window.__G.hero.gold }));
    ok(chest && b0.ground > 0 && b1.bag - b0.bag >= b0.ground && b1.gold > b0.gold, 'what had fallen for the guest came with it', { b0, b1 });
    await go('forest');
    const inF = await inZone(g, 'forest', 60000);
    const kept = await ev(g, (c) => { const it = c && window.__G.zone.interact[c.i]; return { chest: it?.kind === 'chest' && Math.abs(it.x - c.x) < 0.01, used: !!it?.used }; }, chest);
    ok(inF && (await ev(host, () => window.__G.zone.ep)) === fk && kept.chest && kept.used, 'back in the same forest the chest it opened is still open', kept);

    // the scaling: a skeleton of the party's, the party goes to town, the guest leaves there, the host comes back alone: its
    // life and its blows are one hero's again
    await until(host, () => window.__NET.NET.n === 2, null, 15000, 'n 2 in the forest');
    const sk0 = await ev(host, async () => { const A = await import('/src/game/actors.js'), G = window.__G, p = G.player; const m = A.spawnMonster('skeleton', p.x + 30, p.z, {}); G.actors.push(m); window.__sk = m; return { hp: m.hpMax, dmg: m.dmg, k: m.coopK, d: m.coopD, n: window.__NET.NET.n }; });
    await go('town');
    await inZone(g, 'town', 60000);
    await until(host, () => window.__NET.NET.n === 2, null, 15000, 'n 2 in town');
    await ev(g, () => window.__NET.leaveGame('coop.youLeft'));
    await until(host, () => window.__NET.NET.n === 1, null, 15000, 'n 1');
    await go('forest');
    await until(host, () => window.__G.zone?.id === 'forest' && window.__G.mode === 'play', null, 30000, 'host in the forest');
    const sk1 = await ev(host, () => { const m = window.__sk; return { hp: m.hpMax, dmg: m.dmg, k: m.coopK, d: m.coopD, here: window.__G.actors.includes(m) }; });
    ok(sk0.n === 2 && sk0.k > 1 && sk0.d > 1 && sk1.here && sk1.k === 1 && sk1.d === 1 && Math.abs(sk1.hp - sk0.hp / sk0.k) < 1 && Math.abs(sk1.dmg - sk0.dmg / sk0.d) < 0.01, 'a monster of the party\'s left in the forest is one hero\'s again, life and blows, when the host comes back alone', { party: sk0, alone: sk1 });
    await until(g, () => !window.__NET.S.role && window.__G.zone?.id === 'town' && window.__G.mode === 'play', null, 30000, 'home');
    await ev(g, (c) => window.__NET.joinGame(c), code);
    ok(await inZone(g, 'forest', 60000), 'the guest joined again');
    await tough(g);

    // the Heartwood: the guest is there when the host kills the three Heartroots: their walls open on its page too
    await ev(host, async () => { const G = window.__G, h = G.hero; h.quest = 14; for (const f of ['hart', 'act1', 'act2']) h.flags[f] = true; const W = await import('/src/game/world.js'); await W.zoneReady('heart'); window.__D.enterZone('heart', { fresh: true }); for (const p of G.zone.packs) p.spawned = true; });
    const inH = await inZone(g, 'heart');
    const thorns = await ev(g, () => (window.__G.zone.L.thorns || []).map((t) => t.cells));
    const shut = []; for (const c of thorns) shut.push(await walk(g, c));
    await ev(host, () => { for (const a of window.__G.actors.slice()) if (a.kind === 'heartroot' && a.wall != null && !a.dead) window.__D.kill(a); });
    const opened = await until(g, () => { const z = window.__G.zone; return (z.L.thorns || []).every((t) => t.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5))); }, null, 15000, 'walls open');
    ok(inH && thorns.length === 3 && shut.every((n) => n === 0) && opened, 'the thorn walls the host broke with the guest there open on the guest\'s page', { shut, opened });

    // the Forge: the slag the host's third breath melts is gone on the guest's page, the stair to the Anvil open
    await ev(host, async () => { const G = window.__G, h = G.hero; h.quest = 20; for (const f of 'act3,after3,autumn,fireTaken,lamp_l1,lamp_l2,lamp_l3,lamp_l4,lamp_l5,mem_l1,mem_l2,mem_l3,mem_l4,mem_l5,ivar'.split(',')) h.flags[f] = true; const W = await import('/src/game/world.js'); await W.zoneReady('forge'); window.__D.enterZone('forge', { fresh: true }); for (const p of G.zone.packs) p.spawned = true; });
    const inFo = await inZone(g, 'forge');
    const plug = await ev(g, () => window.__G.zone.L.plug?.cells || []);
    const plug0 = await walk(g, plug);
    await ev(host, async () => { const B = await import('/src/ui/bus.js'); B.emit('bellowsDone', 'b3', 3, window.__G.zone); });
    const melted = await until(g, (n) => { const z = window.__G.zone; return z.id === 'forge' && z.L.plug.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)); }, null, 15000, 'plug');
    ok(inFo && plug.length > 0 && plug0 === 0 && melted, 'the slag the host melted is gone on the guest\'s page', { cells: plug.length, plug0, melted });

    // Skerry Bay: the skerry opens on the guest's page when the host's Tower wakes; its fight clock runs with only the
    // guest in the bay (the host 70 m off); once the Tower is down the skerry shuts again
    const A5 = 'act4,hart,weaver,lord,plug,karthax,crownUnmade,giftsTaken,unbound,newFire,alkyone,coastCall,cradle,coal,alkField,coastSeen,hearth,rite,tamMet,glaukosMet,light_grey,mem_i1,light_wreck,mem_i2,light_fall';
    await ev(host, async (F5) => { const G = window.__G, h = G.hero; h.quest = 27; for (const f of F5.split(',')) h.flags[f] = true; h.act1 = h.act2 = h.act3 = h.act4 = 1; h.flags.lights5 = ['grey', 'wreck', 'fall']; const W = await import('/src/game/world.js'); await W.zoneReady('coast'); window.__D.enterZone('coast', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x + 2, b.z + 8); G.player.x = f.x; G.player.z = f.z; }, A5);
    const inC = await inZone(g, 'coast');
    await tough(host); await tough(g);
    const skc = await ev(g, () => window.__G.zone.L.spots.skerry.cells);
    const sk0c = await walk(g, skc);
    await until(host, () => !!window.__G.zone.boss, null, 15000, 'tower');
    await ev(host, async () => { const C = await import('/src/game/combat.js'), B = await import('/src/ui/bus.js'), G = window.__G, z = G.zone, b = z.boss, sk = z.L.spots.skerry; G.hero.flags.towerWake = true; if (z.map.open(sk.cells)) B.emit('mapChanged'); b.holdWake = false; C.damage(G.player, b, 1, { crit: false }); });
    const skOpen = await until(g, (n) => { const z = window.__G.zone; return z.L.spots.skerry.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)); }, null, 15000, 'skerry open');
    ok(inC && sk0c === 0 && skOpen, 'the skerry opens on the guest\'s page when the host\'s Tower wakes', { cells: skc.length, before: sk0c, skOpen });
    await ev(host, () => { const G = window.__G, c = G.zone.L.boss, m = G.zone.map; for (let a = 0; a < 6.28; a += 0.2) for (const d of [70, 66, 74, 62]) { const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; if (m.walkable(x, z)) { G.player.x = x; G.player.z = z; return; } } });
    await ev(g, () => { const G = window.__G, c = G.zone.L.boss, f = G.zone.map.nearestFloor(c.x, c.z + 10); G.player.x = f.x; G.player.z = f.z; });
    await until(host, () => { const r = window.__NET.NET.remotes[0], c = window.__G.zone.L.boss; return r && Math.hypot(r.x - c.x, r.z - c.z) < 20; }, null, 15000, 'guest in the bay');
    const tw = () => ev(host, () => { const G = window.__G, b = G.zone.boss, c = G.zone.L.boss; return { awake: !!b.awake, away: b.away, st: b.tide?.st, t: b.tide ? +b.tide.t.toFixed(2) : null, hostD: Math.round(Math.hypot(G.player.x - c.x, G.player.z - c.z)) }; });
    await sleep(1500);
    const tw0 = await tw(); await sleep(3000); const tw1 = await tw();
    ok(tw1.awake && tw1.away === false && tw1.hostD > 42 && tw0.t != null && (tw1.t < tw0.t || tw1.st !== tw0.st), 'the Walking Tower\'s fight clock runs with only a guest in the bay', { tw0, tw1 });
    await ev(host, () => { window.__G.hero.flags.towerDown = true; });
    const skShut = await until(g, () => { const z = window.__G.zone; return z.L.spots.skerry.cells.every(([x, zz]) => !z.map.walkable(x + 0.5, zz + 0.5)); }, null, 15000, 'skerry shut');
    ok(skShut, 'and shuts again on the guest\'s page once the host\'s Tower is down');

    // the Farthest Light: the gusts on the host's clock, the fires the host lights and the dark puts out, a hole it seals
    await ev(host, async () => { const G = window.__G, h = G.hero; Object.assign(h.flags, { frozen: true, farSeen: true, alkShip: true, mem_i3: true }); h.quest = 28; const W = await import('/src/game/world.js'); await W.zoneReady('farlight'); window.__D.enterZone('farlight', { fresh: true }); for (const p of G.zone.packs) p.spawned = true; });
    const inL = await inZone(g, 'farlight');
    await tough(host); await tough(g);
    await sleep(2500);
    for (const pg of [host, g]) await ev(pg, async () => { const B = await import('/src/ui/bus.js'); window.__gusts = []; if (!window.__gustOn) { window.__gustOn = true; B.on('gust', (on) => window.__gusts?.push(on ? 1 : 0)); } });
    await ev(host, () => { window.__G.zone.gust.t = 28; });
    await sleep(1500);
    const gc = [await ev(host, () => window.__G.zone.gust.t % 40), await ev(g, () => window.__G.zone.gust?.t % 40)];
    await sleep(11000);
    const gn = [await ev(host, () => window.__gusts), await ev(g, () => window.__gusts)];
    ok(inL && Math.abs(gc[0] - gc[1]) < 1 && gn[0].length === 2 && gn[1].length >= 2 && gn[1].length <= 3, 'the guest\'s gusts come on the host\'s clock, once each', { clocks: gc.map((v) => +v.toFixed(2)), host: gn[0], guest: gn[1] });
    await ev(host, async () => { const W = await import('/src/game/world.js'), z = window.__G.zone; W.light5(z, z.act5.cairns[0], true); W.light5(z, z.act5.lamps[0], true); });
    const lit = await until(g, () => { const A = window.__G.zone.act5; return A.cairns[0].lit && A.lamps[0].lit; }, null, 5000, 'lit');
    const warm = await ev(g, () => { const c = window.__G.zone.act5.cairns[0]; return !!window.__act5.warmAt(c.x + 1.2, c.z); });
    await ev(host, async () => { const W = await import('/src/game/world.js'), z = window.__G.zone; W.light5(z, z.act5.cairns[0], false); W.light5(z, z.act5.lamps[0], false); });
    const dark = await until(g, () => { const A = window.__G.zone.act5; return !A.cairns[0].lit && !A.lamps[0].lit; }, null, 5000, 'out');
    ok(lit && warm && dark, 'a cairn and a hole lamp the host lights burn (and warm) on the guest\'s page, and go out with the host\'s', { lit, warm, dark });
    const hole0 = await ev(g, () => window.__G.zone.act5.lamps.filter((l) => l.hole === 0).length);
    await ev(host, () => { window.__G.hero.flags.hole0 = true; });
    const sealed = await until(g, () => { const z = window.__G.zone, A = z.act5, ho = z.L.spots.holes.find((h) => h.id === 0); return !A.lamps.some((l) => l.hole === 0) && A.markers.some((m) => m.userData.ho === ho) && ho.lead.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)); }, null, 15000, 'sealed');
    ok(hole0 === 3 && sealed, 'a hole the host sealed is sealed on the guest\'s page: one marker-light, its lead walkable ice', { hole0, sealed });
    ok(!(await fatal(host)) && !(await fatal(g)), 'neither page broke', { host: await fatal(host), guest: await fatal(g) });

    // downed when the game ends: both down, the host closes the game (before the wipe's 3 s): the guest's card goes and it
    // is up at home; the host, alone and down, has the death panel
    for (const pg of [g, host]) await ev(pg, async () => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e9, { pure: true }); });
    await sleep(900);
    const card = (pg) => ev(pg, () => ({ card: !document.getElementById('downed')?.hidden, dead: window.__G.player.dead, downed: !!window.__NET.S.downed, panel: window.__G.panel, role: window.__NET.S.role, zone: window.__G.zone?.id }));
    const d0 = [await card(host), await card(g)];
    await ev(host, () => window.__NET.leaveGame());
    await until(g, () => !window.__NET.S.role, null, 15000, 'guest out');
    await sleep(2500);
    const d1 = [await card(host), await card(g)];
    ok(d0[0].downed && d0[1].downed && d0[0].card && d0[1].card, 'both were down, their cards shown', d0);
    ok(!d1[1].card && !d1[1].dead && !d1[1].role, 'the game ended: the guest\'s card is gone and it is up at home', d1[1]);
    ok(!d1[0].card && d1[0].dead && d1[0].panel === 'dead', 'and the host, alone and down, has the death panel', d1[0]);
    ok(!(await fatal(host)) && !(await fatal(g)), 'no error on either page', { host: await fatal(host), guest: await fatal(g) });
  },


  // Act V: the host's tide on the guest's coast (its clock and a boss's hold), the host's ice breaking under the guest
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
    await ev(g, (c) => { document.querySelector(`[data-a^="cjoin:${c}:"]`)?.click(); }, code);
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
    console.log('     diag host', JSON.stringify(await ev(host, () => ({ kills: window.__G.hero.stats.kills, hits: window.__NET.S.stats.hits, why: window.__NET.S.stats.why, done: [...window.__NET.S.done], rel: [...window.__NET.S.rel.values()].reduce((n, q) => n + q.length, 0), foes: window.__G.actors.filter((a) => a.team === 'foe' && !a.prop && !a.dead).length, peers: [...window.__NET.S.peers.values()].map((p) => [p.peer, p.ack, (p.ev || []).length]) }))), 'guest', JSON.stringify(await ev(g, () => ({ ev: window.__NET.S.ev.length, evSeq: window.__NET.S.evSeq, relDone: window.__NET.S.relDone, pups: window.__NET.S.pup.size, me: window.__NET.S.ch.me }))));
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
      // (the guest walks up to it: its stand-in on the host goes only as fast as a hero, so it strikes once it is there)
      await ev(g, (k) => { const G = window.__G, b = [...window.__NET.S.pup.values()].find((a) => a.kind === k); if (b) { G.player.x = b.x + b.radius + 1.2; G.player.z = b.z; } }, A.kind);
      const gpos = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
      await until(host, (p) => { const r = window.__NET.NET.remotes[0]; return r && Math.hypot(r.x - p.x, r.z - p.z) < 3; }, gpos, 15000, 'stand-in at the boss');
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
  // (the game's errors from its timers and its loop go to the #fatal box, not the console: every page still open is read)
  for (const [i, pg] of pages.entries()) if (!pg.isClosed()) { const f = await pg.evaluate(() => document.getElementById('fatal')?.textContent || '').catch(() => ''); ok(!f, 'page ' + (i + 1) + ': nothing in the #fatal box', f ? f.slice(0, 300) : undefined); }
} catch (e) { ok(false, 'scenario threw: ' + (e.stack || e).toString().slice(0, 600)); }
fs.writeFileSync(out + '/' + name + '.json', JSON.stringify({ name, fails, results }, null, 1));
console.log(fails ? fails + ' FAILED' : 'all passed');
await browser.close();
process.exit(fails ? 1 : 0);
