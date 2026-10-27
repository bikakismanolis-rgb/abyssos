// Co-op scenarios: node tools/coop.mjs <name> <outdir>   (BASE=http://localhost:<port>/, a private no-HMR server)
// One headless browser, two to four pages in one context (LocalTransport: BroadcastChannel), each with its own save
// (?slot=). Every page is ?net=local&norender: the game runs, nothing is drawn (but for the screenshots).
// Names: join, pack, boss1..boss5, loot, revive, churn, hostleave, cheat, world, act5, scaling, four, ui, ux, access
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { watchFatal, fatalAll } from './fatal.mjs';
const [, , name = 'join', out = '/tmp/coop'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5311/';
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let fails = 0;
const ok = (c, m, v) => { results.push({ ok: !!c, m, v }); console.log((c ? 'ok   ' : 'FAIL ') + m + (v !== undefined ? '  ' + JSON.stringify(v) : '')); if (!c) fails++; };

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const FATAL = watchFatal(browser);
// (the phone: 844 x 390 landscape; the ui scenario as a touch phone)
const ctx = await browser.newContext(name === 'ui' || name === 'ux' ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 844, height: 390 } });
const pages = [];
// the room and access scenarios: every page's window.claude.use('room') is a faithful fake of the artifact's room
// (fakeroom.mjs, in this process: its budget, sizes, coalescing and loss), reached through a binding; the game picks
// RoomTransport. A page's address gives its part: by=<its user id>, acc=view a Viewer or Commenter (admitted, its sends
// refused), ng=1 a view the room cannot connect (not_granted); window.__roomEnd(code) ends the room for a page (revoked),
// window.__roomViewer(v) makes its sends refused from then on. use('user'): profiles 'Name-<id>', canEdit() false,
// can('data.write') true but for a Viewer
let HUB = null;
if (name === 'room' || name === 'access') {
  const { Hub } = await import('./net/fakeroom.mjs');
  HUB = new Hub({ loss: name === 'room' ? +(process.env.LOSS || 0.05) : 0, lag: 30, topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } });
  const state = new Map();
  const plain = (ch) => JSON.parse(JSON.stringify({ peers: ch.peers, joined: ch.joined, left: ch.left, updated: ch.updated }));
  const stOf = (page) => {
    let st = state.get(page);
    if (!st) { const q = new URL(page.url()).searchParams; st = { hp: HUB.page({ by: q.get('by') || 'u' + (state.size + 1), viewer: q.get('acc') === 'view' }), rooms: new Map() }; state.set(page, st); }
    return st;
  };
  await ctx.exposeBinding('__roomEnd', ({ page }, code) => { stOf(page).hp.end(code); return 1; });
  await ctx.exposeBinding('__roomViewer', ({ page }, v) => { stOf(page).hp.viewer = !!v; return 1; });
  await ctx.exposeBinding('__roomsOf', ({ page }) => { const pid = stOf(page).hp.pid; return [...HUB.rooms.values()].filter((R) => R.name && R.members.has(pid)).map((R) => R.name); });
  await ctx.exposeBinding('__roomCall', async ({ page }, scope, method, args) => {
    const st = stOf(page);
    const api = scope === '' ? st.hp.room : st.rooms.get(scope);
    if (!api) return { err: 'invalid_argument' };
    const send = (fn, arg) => page.evaluate(fn, arg).catch(() => {});
    const err = (e) => send(([s, c]) => window.__roomIn?.[s]?.err(c), [scope, e.code]);
    try {
      if (method === 'init') { api.onPeers((ch) => send(([s, c]) => window.__roomIn?.[s]?.peers(c), [scope, plain(ch)]), err); api.onConnection((v) => send(([s, v]) => window.__roomIn?.[s]?.conn(v), [scope, v]), err); return { ok: 1 }; }
      if (method === 'on') { api.on(args[0], (m) => send(([s, m]) => window.__roomIn?.[s]?.msg(m), [scope, JSON.parse(JSON.stringify(m))]), err); return { ok: 1 }; }
      if (method === 'join') { const r = await st.hp.room.join(args[0]); st.rooms.set(args[0], r); return { ok: 1 }; }
      if (method === 'leave') { await api.leave(); st.rooms.delete(scope); return { ok: 1 }; }
      await api[method](...args); return { ok: 1 };
    } catch (e) { return { err: e.code || 'upstream_error' }; }
  });
  await ctx.addInitScript(() => {
    const q = new URLSearchParams(location.search), ng = q.get('ng') === '1', viewer = q.get('acc') === 'view';
    const user = ng ? null : Object.freeze({ profiles: async (ids) => Object.fromEntries([].concat(ids).map((id) => [id, { id, name: 'Name-' + id, avatarUrl: '', color: '#888', email: null, isMe: false, guest: false }])), canEdit: async () => false, can: async (n) => (n === 'data.write' ? !viewer : false), id: async () => q.get('by') });
    if (ng) {
      // (a view the platform cannot connect: every call not_granted, every listener's onError once)
      const no = () => Promise.reject(Object.assign(new Error('not_granted'), { code: 'not_granted' }));
      const lst = (f, e) => { setTimeout(() => e?.({ code: 'not_granted', message: 'not_granted' }), 0); return () => {}; };
      const R = Object.freeze({ name: '', emit: no, presence: no, join: no, peers: () => Object.freeze([]), connected: () => false, on: lst, onPeers: lst, onConnection: (f, e) => { setTimeout(() => f(false), 0); return lst(f, e); }, leave: () => Promise.resolve() });
      window.claude = Object.freeze({ use: async (n) => (n === 'room' ? R : n === 'user' ? user : null) });
      return;
    }
    const make = (scope) => {
      const L = {}, P = [], C = [], E = []; let peers = Object.freeze([]), conn = false;
      (window.__roomIn ||= {})[scope] = { msg(m) { for (const f of (L[m.topic] || []).slice()) f(m); }, peers(ch) { peers = ch.peers; for (const f of P.slice()) f(ch); }, conn(v) { conn = v; for (const f of C.slice()) f(v); },
        err(code) { conn = false; peers = Object.freeze(peers.filter((p) => p.isMe)); for (const f of E.splice(0)) f({ code, message: code }); } };
      const call = (m, a) => window.__roomCall(scope, m, a).then((r) => { if (r?.err) throw Object.assign(new Error(r.err), { code: r.err }); });
      call('init', []);
      const subbed = new Set();
      return Object.freeze({
        name: scope, emit: (t, d) => call('emit', [t, d]), presence: (p) => call('presence', [p]), peers: () => peers, connected: () => conn,
        on(t, f, e) { if (e) E.push(e); (L[t] ||= []).push(f); if (!subbed.has(t)) { subbed.add(t); call('on', [t]); } return () => { const i = L[t].indexOf(f); if (i >= 0) L[t].splice(i, 1); }; },
        onPeers(f, e) { if (e) E.push(e); P.push(f); return () => { const i = P.indexOf(f); if (i >= 0) P.splice(i, 1); }; },
        onConnection(f, e) { if (e) E.push(e); C.push(f); setTimeout(() => f(conn), 0); return () => { const i = C.indexOf(f); if (i >= 0) C.splice(i, 1); }; },
        join: (n) => call('join', [n]).then(() => make(n)), leave: () => call('leave', [])
      });
    };
    window.claude = Object.freeze({ use: async (n) => (n === 'room' ? make('') : n === 'user' ? user : null) });
  });
}
// NET=supa: every page's co-op is SupabaseTransport, stamped, against the fake project of tools/net/fakesupa.mjs in this
// process (its rules as the migration's: the RPCs, private channels, the server's stamp, the sender's own echo; the
// project's events counted, each sent and each delivered), the page's supabase-js client a stand-in that reaches it
// through a binding (?net=supabase and window.__skotosSupa: transport.js pickTransport). Each call answers after
// SUPA_LAG ms (default 110) and up to SUPA_JIT more (60): about the live project's 140-160 ms from here. ECON=0: the
// channels as they were before the economy (no bundles, no outboxes, the room's rates)
let SUPA = null;
if (process.env.NET === 'supa' && name !== 'room' && name !== 'access') {
  const { fakeSupabase } = await import('./net/fakesupa.mjs');
  SUPA = { bus: {}, clients: new Map() };
  const lag = { lagMin: +(process.env.SUPA_LAG ?? 110), lag: +(process.env.SUPA_JIT ?? 60) };
  const send = (page, fn, arg) => page.evaluate(fn, arg).catch(() => {});
  await ctx.exposeBinding('__supa', async ({ page }, op, a) => {
    let st = SUPA.clients.get(page);
    if (!st) { st = { c: fakeSupabase(SUPA.bus, lag), ch: new Map() }; SUPA.clients.set(page, st); }
    const c = st.c;
    if (op === 'getSession') return c.auth.getSession();
    if (op === 'signIn') return c.auth.signInAnonymously(a);
    if (op === 'rpc') return await c.schema(a[0]).rpc(a[1], a[2]);
    if (op === 'chan') {
      const [id, nm, opts] = a, sc = c.channel(nm, opts);
      sc.on('broadcast', { event: '*' }, (m) => send(page, ([id, m]) => window.__supaIn?.(id, 'b', m), [id, JSON.parse(JSON.stringify(m))]));
      sc.on('presence', { event: 'sync' }, () => send(page, ([id, x]) => window.__supaIn?.(id, 'sync', x), [id, sc.presenceState()]));
      st.ch.set(id, sc); return 1;
    }
    const sc = st.ch.get(a[0]); if (!sc) return 'error';
    if (op === 'sub') { sc.subscribe((v) => send(page, ([id, v]) => window.__supaIn?.(id, 'st', v), [a[0], v])); return 1; }
    if (op === 'send') return sc.send(a[1]);
    if (op === 'track') return sc.track(a[1]);
    if (op === 'unsub') { st.ch.delete(a[0]); return sc.unsubscribe(); }
    return 'error';
  });
  await ctx.addInitScript((econ) => {
    const chans = {}; let n = 0;
    window.__supaIn = (id, kind, x) => {
      const c = chans[id]; if (!c) return;
      if (kind === 'b') { for (const [ev, f] of c.L.b) if (ev === '*' || ev === x.event) f(x); }
      else if (kind === 'sync') { c.state = x; for (const f of c.L.p) f(); }
      else if (kind === 'st') c.cb?.(x);
    };
    const call = (op, a) => window.__supa(op, a);
    const client = () => ({
      auth: { getSession: () => call('getSession'), signInAnonymously: (o) => call('signIn', o) },
      realtime: { setAuth: async () => {} },
      schema: (sch) => ({ rpc: (fn, args) => { const b = { abortSignal() { return b; }, then: (f, r) => call('rpc', [sch, fn, args]).then(f, r) }; return b; } }),
      channel(name, opts) {
        const id = ++n, c = (chans[id] = { L: { b: [], p: [] }, state: {}, cb: null });
        call('chan', [id, name, opts]);
        const ch = {
          on(t, flt, f) { if (t === 'broadcast') c.L.b.push([flt.event, f]); if (t === 'presence') c.L.p.push(f); return ch; },
          subscribe(cb) { c.cb = cb; call('sub', [id]); return ch; },
          send: (m) => call('send', [id, m]), track: (p) => call('track', [id, p]),
          presenceState: () => c.state, unsubscribe: () => { delete chans[id]; return call('unsub', [id]); }
        };
        return ch;
      },
      removeChannel: (ch) => ch.unsubscribe()
    });
    window.__skotosSupa = { url: 'https://fake.supabase.co', anonKey: 'k', stamped: true, createClient: client, economy: econ ? undefined : false };
  }, process.env.ECON !== '0');
}
const NETQ = name === 'room' || name === 'access' ? '' : SUPA ? 'net=supabase&' : 'net=local&';
async function open(peer, q) {
  const pg = await ctx.newPage();
  // (THROTTLE=<n>: the page's CPU n times slower, as a busy phone, or four pages on a few cores)
  if (+process.env.THROTTLE > 1) { const c = await ctx.newCDPSession(pg); await c.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }
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

// (NET=supa: the fake project's counts, and their rates between two of them)
const supaCount = () => SUPA && { t: Date.now(), ev: SUPA.bus.log?.events || 0, calls: SUPA.bus.srv?.log.calls || 0, del: SUPA.bus.srv?.log.delivered || 0, sends: SUPA.bus.srv?.log.fn.send || 0, msgs: SUPA.bus.srv?.ids || 0 };
const supaRate = (a, b) => { const s = (b.t - a.t) / 1000; return { evs: (b.ev - a.ev) / s, calls: (b.sends - a.sends) / s, del: (b.del - a.del) / s, msgs: (b.msgs - a.msgs) / s }; };

const SC = {
  // how the others look: one hero walks a circle (5 m, 5 m/s), another page watches it every 16 ms. late: how far behind
  // the walker it is shown (its angle on the circle against the walker's own, both by Date.now()), mean and p95; cv: the
  // spread of its steps frame to frame over their mean (0 when even); held: the share of frames it did not move. Three
  // views: the host seen by a guest, a guest by the host, a guest by another guest (the host passes it on where the
  // channel bundles: NET=supa)
  async feel() {
    const { host, guests } = await party('town', 2, { lvl: 14, glvl: 13 });
    const all = [host, ...guests];
    for (const pg of all) await ev(pg, () => { window.__immortal = true; });
    const R = 5, V = 5;
    // an open circle near the host
    const c = await ev(host, ([R]) => {
      const G = window.__G, m = G.zone.map, p = G.player;
      for (let k = 0; k < 400; k++) {
        const a = k * 2.4, d = Math.sqrt(k) * 1.5, cx = p.x + Math.cos(a) * d, cz = p.z + Math.sin(a) * d;
        let open = true;
        for (let i = 0; i < 32 && open; i++) { const x = cx + Math.cos(i / 32 * 6.2832) * R, z = cz + Math.sin(i / 32 * 6.2832) * R, f = m.nearestFloor(x, z); if (!f || Math.hypot(f.x - x, f.z - z) > 0.05) open = false; }
        if (open) return { x: cx, z: cz };
      }
      return null;
    }, [R]);
    ok(!!c, 'an open circle to walk', c);
    const rows = [];
    const view = async (walker, watcher, what) => {
      for (const pg of all) await place(pg, c.x + 7 * (pg === walker ? 0 : 1), c.z + (pg === watcher ? 1 : -1) * 2 * (pg === walker ? 0 : 1));
      const peer = await ev(walker, () => window.__NET.S.ch.me);
      const T0 = Date.now() + 300;
      await ev(walker, ([c, R, V, T0]) => { const G = window.__G, w = V / R; clearInterval(window.__walk); window.__walk = setInterval(() => { const a = Math.max(0, Date.now() - T0) / 1000 * w; G.player.x = c.x + Math.cos(a) * R; G.player.z = c.z + Math.sin(a) * R; G.player.rot = -a; }, 8); }, [c, R, V, T0]);
      await sleep(3000);
      await ev(watcher, ([peer]) => { window.__look = []; clearInterval(window.__looker); window.__looker = setInterval(() => { const a = window.__NET.S.peers.get(peer)?.actor; if (a) window.__look.push([Date.now(), a.x, a.z]); }, 16); }, [peer]);
      await sleep(12000);
      const r = await ev(watcher, ([c, R, V, T0]) => {
        clearInterval(window.__looker); const L = window.__look, w = V / R, late = [], st = [];
        for (let i = 0; i < L.length; i++) {
          const [t, x, z] = L[i], want = (t - T0) / 1000 * w; let th = Math.atan2(z - c.z, x - c.x);
          let d = want - th; d -= Math.round(d / 6.2832) * 6.2832; late.push(d / w * 1000);
          if (i) { const dt = (t - L[i - 1][0]) / 1000; if (dt > 0) st.push(Math.hypot(x - L[i - 1][1], z - L[i - 1][2]) / (V * dt)); }
        }
        const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length), sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
        const ls = late.slice().sort((a, b) => a - b);
        return { n: L.length, late: Math.round(mean(late)), p95: Math.round(ls[Math.floor(ls.length * 0.95)] || 0), cv: +(sd(st) / Math.max(1e-6, mean(st))).toFixed(2), held: +(st.filter((v) => v < 0.2).length / Math.max(1, st.length)).toFixed(2) };
      }, [c, R, V, T0]);
      await ev(walker, () => clearInterval(window.__walk));
      rows.push({ what, ...r });
      console.log('     ' + what + ': ' + r.late + ' ms behind (p95 ' + r.p95 + '), steps cv ' + r.cv + ', held ' + Math.round(r.held * 100) + '% of ' + r.n + ' frames');
      return r;
    };
    await view(host, guests[0], 'the host seen by a guest');
    await view(guests[0], host, 'a guest seen by the host');
    await view(guests[0], guests[1], 'a guest seen by another guest');
    for (const r of rows) ok(r.n > 300 && r.late > 0 && r.late < 1500, r.what + ': followed', r);
    fs.writeFileSync(out + '/feel.json', JSON.stringify({ net: process.env.NET || 'local', econ: process.env.ECON !== '0', lag: SUPA ? [+(process.env.SUPA_LAG ?? 110), +(process.env.SUPA_JIT ?? 60)] : null, rows }, null, 1));
  },

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
    // a guest's killing blow on a Rootsworn (its death cry is a hit's sound): the guest hears its blow once (its own look)
    // and the death once (the host's echo), as the host does: what the death plays is not taken for the blow's look
    const snd = (pg) => ev(pg, async () => { const A = (await import('/src/audio/audio.js')).default, f = A.sfx; window.__snd = []; A.sfx = function (n, o) { window.__snd.push(n); return f.call(this, n, o); }; });
    await snd(g); await snd(host);
    // (its stand-in on the host by it first: the fight moved it about faster than a hero runs; a Rootsworn that is
    // not there to strike when the blow comes, another)
    let rid = 0;
    for (let k = 0; k < 4; k++) {
      const gp = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
      await until(host, (gp) => { const r = window.__NET.NET.remotes[0]; return !!r && Math.hypot(r.x - gp.x, r.z - gp.z) < 3; }, gp, 15000, 'stand-in by the guest');
      rid = await ev(host, async (gp) => { const A = await import('/src/game/actors.js'), G = window.__G, f = G.zone.map.nearestFloor(gp.x + 1.5, gp.z), a = A.spawnMonster('rootsworn', f.x, f.z, {}); a.hp = 1; a.speed = 0; G.actors.push(a); return a.id; }, gp);
      await until(g, (id) => window.__NET.S.pup.has(id), rid, 8000, 'rootsworn');
      if (!(await ev(host, (id) => { const a = window.__G.actors.find((x) => x.id === id); return !!a && !a.dead; }, rid))) continue;
      await ev(g, () => { window.__snd.length = 0; }); await ev(host, () => { window.__snd.length = 0; });
      await ev(g, async (id) => { const C = await import('/src/game/combat.js'), G = window.__G; C.damage(G.player, window.__NET.S.pup.get(id), 50, { crit: false }); }, rid);
      if (await until(host, (id) => !!window.__G.actors.find((a) => a.id === id)?.dead, rid, 3000, 'rootsworn dead')) break;
    }
    await sleep(1500);
    const heard = [await ev(g, () => window.__snd.filter((n) => n === 'hitFlesh').length), await ev(host, () => window.__snd.filter((n) => n === 'hitFlesh').length)];
    if (heard[0] !== 2) console.log('     diag', JSON.stringify(await ev(g, (id) => { const a = window.__NET.S.pup.get(id), p = window.__G.player; return { pup: a && { hidden: a.hidden, air: a.airborne, inv: a.invuln, bond: a.bondT, dead: a.dead, hp: a.hp, removed: a.removed, d: Math.hypot(a.x - p.x, a.z - p.z) }, me: { dead: p.dead, hp: p.hp }, mode: window.__G.mode, panel: window.__G.panel, why: window.__NET.S.stats.why }; }, rid)), JSON.stringify(await ev(host, (id) => { const a = window.__G.actors.find((x) => x.id === id), N = window.__NET; return { a: a && { dead: a.dead, hp: a.hp, x: a.x, z: a.z }, why: N.S.stats.why, r: N.NET.remotes[0] && { x: N.NET.remotes[0].x, z: N.NET.remotes[0].z, dead: N.NET.remotes[0].dead } }; }, rid)));
    ok(heard[0] === 2 && heard[1] === 2, 'a guest\'s killing blow on a Rootsworn: its blow and its death cry once each, on the guest\'s page as on the host\'s', { guest: heard[0], host: heard[1] });
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
    await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; G.player.iframes = 0; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
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
    await ev(host, async () => { const C = await import('/src/game/combat.js'), G = window.__G; G.player.iframes = 0; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await sleep(2500);
    ok(await ev(host, () => window.__G.player.dead && !!window.__NET.S.downed && window.__G.panel !== 'dead'), 'the host is downed too (co-op: no death panel)');
    const hp2 = await hostPos(host); await place(g, hp2.x + 0.5, hp2.z);
    const up2 = await until(host, () => !window.__G.player.dead, null, 12000, 'host raised');
    ok(up2, 'the guest raised the host (its ask, checked on the host)');
    // the rise: downed and left alone, the guest gets up by itself (its grace from being raised let go: on a busy machine
    // the game's seconds run slow)
    await place(host, gp.x + 20, gp.z);
    await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; G.player.iframes = 0; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
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
    await ev(g, ([near, far]) => { const S = window.__NET.S; for (const e of [['h', near, 1e9, 0, {}], ['h', far, 5, 0, {}], ['h', 999999, 5, 0, {}], ['h', near, 'x', 0, {}], ['h', near, 5, 0, { stun: 1e9, knock: 1e9 }], ['zz', 1], ['h', near, -5, 0, null]]) S.ev.push([++S.evSeq, ...e]); for (let i = 0; i < 400; i++) S.ev.push([++S.evSeq, 'h', near, 2000, 0, {}]); }, ids);
    await sleep(3000);
    const r = await ev(host, () => ({ near: window.__near.dead ? 0 : Math.round(window.__near.hp), max: Math.round(window.__near.hpMax), why: { ...window.__NET.S.stats.why }, far: window.__far.hp === window.__far.hpMax, stun: window.__near.status.stun, err: document.getElementById('fatal')?.textContent || '' }));
    ok(r.why.big >= 1 && r.far && !r.err, 'a blow too big is held to the cap and one from 40 m refused; nothing broke', r);
    ok(r.stun <= 3, 'statuses are clamped', r.stun);
    ok((r.why.rate || 0) > 0 && r.near > 1e7 - 400 * 2000 / 4, 'a flood of 400 blows in a moment is rate-held', { why: r.why, lost: 1e7 - r.near });
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
    const whyK = await ev(g, () => window.__NET.S.stats.why.k || 0);
    ok(g1.kills === g0.kills && g1.level === g0.level && g1.xp === 0 && g1.gold === g0.gold && whyK >= 100, 'a kill of no monster the host showed dying pays nothing at all (XP, gold, kills)', { before: g0, after: { level: g1.level, xp: g1.xp, gold: g1.gold, kills: g1.kills }, whyK });
    ok(g1.bag - g0.bag === 0, 'and brings no item', { before: g0.bag, after: g1.bag });

    // a monster the guest sees die, paid by a lying host: a billion XP twice, ten-million piles, items stuffed with every
    // stat at a billion: paid once, as such a monster pays at most, and its items as such a kill rolls them
    const lie = await ev(host, async (gp) => { const A = await import('/src/game/actors.js'), G = window.__G, f = G.zone.map.nearestFloor(gp.x + 2, gp.z + 1), a = A.spawnMonster('skeleton', f.x, f.z, { elite: 'rare' }); a.hp = a.hpMax = 1e6; G.actors.push(a); window.__lieA = a; return { id: a.id, level: a.level }; }, gp);
    await until(g, (id) => window.__NET.S.pup.has(id), lie.id, 10000, 'the puppet');
    const k0 = await ev(g, () => { const h = window.__G.hero.__real; return { level: h.level, xp: h.xp, gold: h.gold, kills: h.stats.kills, elites: h.stats.elites, bag: h.inv.filter(Boolean).length }; });
    await ev(host, async (pr) => {
      const C = await import('/src/game/combat.js'), D = await import('/src/game/data.js'), N = window.__NET, a = window.__lieA, x = Math.round(a.x * 10), z = Math.round(a.z * 10), r0 = N.NET.h.reward;
      const all = {}; for (const k of Object.keys(D.STATS)) all[k] = 1e9; all.skill = { id: 'multi', v: 1e9 };
      N.NET.h.reward = () => {
        for (let i = 0; i < 2; i++) N.relTo(pr, ['k', a.id, x, z, 1e9, Array(8).fill(1e7), [], 0, 1]);
        for (let i = 0; i < 8; i++) N.relTo(pr, ['it', x, z, { id: 'stuff' + i, base: ['helm', 'ring', 'sword', 'boots'][i % 4], rar: i % 4, leg: 'swiftboots', ilvl: 99, stats: { ...all } }]);
      };
      try { C.kill(a, null, {}); } finally { N.NET.h.reward = r0; }
    }, me);
    await sleep(2500);
    for (let k = 0; k < 12; k++) {
      const left = await ev(g, () => { const G = window.__G, p = G.pickups.find((q) => q.kind === 'item' || q.kind === 'gold'); if (!p) return 0; G.player.x = p.x; G.player.z = p.z; G.player.hp = G.player.hpMax; return G.pickups.length; });
      if (!left) break;
      await sleep(700);
    }
    const k1 = await ev(g, async ([id, k0]) => {
      const D = await import('/src/game/data.js'), I = await import('/src/game/items.js'), S = window.__NET.S, h = window.__G.hero.__real, P = S.pupInfo.get(id);
      const top = Math.max(window.__G.zone.level, (S.peers.get(S.hostPeer)?.lk?.l | 0) + 2) + 3, Dd = D.DIFFS[S.world.diff];
      // (all the XP to this level and in it, then the most such a rare could pay)
      let got = h.xp - k0.xp; for (let L = k0.level; L < h.level; L++) got += D.xpToNext(L);
      const most = D.monsterXP(P.level) * D.MONSTERS.skeleton.xp * Dd.xp * 5 * D.COOP.xp[3], pile = (3 + P.level * 1.6) * 1.4 * Dd.gold * (1 + 401 / 100) * D.COOP.gold[3];
      const items = h.inv.filter((it) => it && String(it.id).startsWith('stuff'));
      const bad = items.filter((it) => { const ks = Object.keys(it.stats), slot = D.BASES[it.base].slot; return ks.length > [0, 2, 4, 4][it.rar] || ks.some((k) => !(D.STATS[k].slots === '*' || D.STATS[k].slots.split(',').includes(slot))) || it.ilvl > top || (it.leg && D.LEGENDARIES.find((l) => l.id === it.leg)?.base !== it.base); }).map((it) => ({ base: it.base, rar: it.rar, ilvl: it.ilvl, stats: Object.keys(it.stats) }));
      return { pLevel: P.level, top, level: h.level, xp: h.xp, got, dKills: h.stats.kills - k0.kills, dElites: h.stats.elites - k0.elites, dGold: h.gold - k0.gold, mostGold: Math.ceil(pile * 2), mostXp: Math.ceil(most), items: items.length, stats: items.map((it) => Object.keys(it.stats).length), bad };
    }, [lie.id, k0]);
    ok(k1.dKills === 1 && k1.dElites === 1 && k1.got <= k1.mostXp && k1.pLevel <= k1.top, 'a kill paid once, at most what that rare of its level pays, whatever the host says', { before: k0, after: k1 });
    ok(k1.dGold <= k1.mostGold, 'its gold no more than its two piles can be', { gold: k1.dGold, most: k1.mostGold });
    ok(k1.items <= 3 && k1.bad.length === 0, 'and three items at most, each with only its slot\'s stats, no more than its rarity rolls, at the zone\'s level', { items: k1.items, stats: k1.stats, bad: k1.bad });
    // a host that shows a hundred and fifty rare Cave Trolls dying by the guest in the Old Forest (none live there), each
    // paid a billion: the guest is paid no more than the forest's own monsters are worth (its plan), its rares as many as
    // the plan has
    const t0 = await ev(g, () => { const h = window.__G.hero.__real; return { level: h.level, xp: h.xp, kills: h.stats.kills }; });
    for (let b = 0; b < 15; b++) {
      const ids = await ev(host, async (gp) => { const A = await import('/src/game/actors.js'), G = window.__G, out = []; for (let i = 0; i < 10; i++) { const f = G.zone.map.nearestFloor(gp.x + 2 + (i % 5), gp.z + 2 + Math.floor(i / 5)), a = A.spawnMonster('caveTroll', f.x, f.z, { elite: 'rare' }); a.hp = a.hpMax = 1e6; a.speed = 0; G.actors.push(a); out.push(a.id); } return out; }, gp);
      await until(g, (ids) => ids.every((id) => window.__NET.S.pup.has(id)), ids, 8000, 'trolls seen');
      // (the host's own share of them would raise its level, and with it its monsters': it stays at its own)
      await ev(host, async ([pr, ids]) => { const C = await import('/src/game/combat.js'), N = window.__NET, h = window.__G.hero, l0 = h.level, x0 = h.xp, r0 = N.NET.h.reward; N.NET.h.reward = (a) => N.relTo(pr, ['k', a.id, Math.round(a.x * 10), Math.round(a.z * 10), 1e9, [1e7, 1e7], [], 0, 1]); try { for (const id of ids) { const a = window.__G.actors.find((x) => x.id === id); if (a) C.kill(a, null, {}); } } finally { N.NET.h.reward = r0; h.level = l0; h.xp = x0; } }, [me, ids]);
      await sleep(1300);
    }
    await sleep(1500);
    const t1 = await ev(g, async (t0) => {
      const D = await import('/src/game/data.js'), S = window.__NET.S, h = window.__G.hero.__real, P = S.purses.get(S.zoneKey), Dd = D.DIFFS[S.world.diff];
      const top = Math.max(window.__G.zone.level, (S.peers.get(S.hostPeer)?.lk?.l | 0) + 2) + 3;
      let got = h.xp - t0.xp; for (let L = t0.level; L < h.level; L++) got += D.xpToNext(L);
      const most = (P.u + (performance.now() - P.t) / 60000 * 90) * D.monsterXP(top) * Dd.xp * D.COOP.xp[3];
      return { level: h.level, got: Math.round(got), most: Math.round(most), kills: h.stats.kills - t0.kills, units: Math.round(P.u), used: Math.round(P.used), rares: P.rares, paidRares: Math.min(P.usedR, P.rares), refused: S.stats.why.k || 0 };
    }, t0);
    ok(t1.got <= t1.most && t1.used <= t1.units + 60 && t1.refused >= 150 - t1.kills, 'a hundred and fifty rare Cave Trolls shown dying in the Old Forest pay no more than the forest\'s own monsters are worth', { before: t0, after: t1 });

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
    // what only monsters make (a herd of ghosts, waves), and more shots than a page holds, from the guest: the host plays
    // none of the first and holds the rest; a herd of ghosts and orbs past count from the host: the guest holds them
    await gapOn(host); await gapOn(g);
    await ev(g, () => { const S = window.__NET.S, p = window.__G.player; let k = 0; const send = () => { const L = []; for (let i = 0; i < 39; i++) L.push(i % 3 === 0 ? [18, 'phantomHart', 0, 0, p.x, p.z, 0, { speed: 0, life: 8 }] : i % 3 === 1 ? [19, 'wave', p.x, p.z, 30, 20, 0, 0, 0, 0, 0, 0, 0, 0] : [18, 'bolt', 0, 0, p.x, p.z, 0, { speed: 0, life: 8 }]); S.ch.emit('f', L); if (++k < 30) setTimeout(send, 66); }; send(); });
    await ev(host, () => { const N = window.__NET; let k = 0; const t = setInterval(() => { const r = N.NET.remotes[0]; if (r) for (let i = 0; i < 12; i++) (N.S.fxHost ||= []).push({ n: 'fire', a: ['phantomHart', 1, 0, r.x, r.z, 0, { speed: 0, life: 8 }], x: r.x, z: r.z }, { n: 'area', a: ['frostOrb', r.x, r.z, 3, 0, 0, 0, 0, 0.5, {}, 0, 0, 0], x: r.x, z: r.z }); if (++k > 45) clearInterval(t); }, 66); });
    let most = { hHart: 0, hWave: 0, hNet: 0, gHart: 0, gRings: 0 };
    for (let i = 0; i < 12; i++) {
      const [a, b] = [await ev(host, () => { const G = window.__G; return { hHart: G.projs.filter((p) => p.kind === 'phantomHart').length, hWave: G.areas.filter((q) => q.kind === 'wave').length, hNet: G.projs.filter((p) => p.net).length }; }), await ev(g, async () => { const G = window.__G; return { gHart: G.projs.filter((p) => p.kind === 'phantomHart').length, gRings: (await import('/src/gfx/fx.js')).FX.rings.length }; })];
      for (const [k, v] of Object.entries({ ...a, ...b })) most[k] = Math.max(most[k], v);
      await sleep(250);
    }
    const gaps2 = { host: await gapOff(host), guest: await gapOff(g) };
    ok(most.hHart === 0 && most.hWave === 0 && most.hNet <= 96, 'a guest\'s page sends a monster\'s ghosts and waves: the host plays none, and holds a flood of shots', most);
    ok(most.gHart <= 8 && most.gRings <= 110 && gaps2.host < 200 && gaps2.guest < 200, 'a host\'s flood of ghosts and orbs: the guest holds them, every frame goes on', { most, gaps: gaps2 });

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
    // (to a spot 40-46 m off where the guest's own game lets its hero stand: well past a run and a dodge's bank in 0.45 s)
    const to = await ev(g, () => { const G = window.__G, p = G.player, m = G.zone.map; for (let a = 0; a < 6.28; a += 0.2) for (const d of [42, 40, 44, 46]) { const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; if (m.walkable(x, z)) { p.x = x; p.z = z; return { x, z }; } } return null; });
    await sleep(450);
    const a1 = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return { x: r.x, z: r.z }; });
    const gat = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    ok(to && Math.hypot(gat.x - to.x, gat.z - to.z) < 2.5 && Math.hypot(a1.x - a0.x, a1.z - a0.z) < 32 && Math.hypot(a1.x - to.x, a1.z - to.z) > 8, 'a guest\'s jump of 40 m: its stand-in on the host does not jump with it', { a0, a1, to, gat });
    await sleep(6000);
    const a2 = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return { x: r.x, z: r.z }; });
    const gat2 = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    ok(to && Math.hypot(a2.x - gat2.x, a2.z - gat2.z) < 2, 'and it catches up at a hero\'s pace', { a2, at: gat2, to });
    // lies about itself: a moment in another zone, a fall it gets up from, a spot off the map; then by a foe far off. The
    // stand-in jumps only where the game puts a hero (by the host; rising, where it fell), stands on the map, and does not
    // reach it
    // (a foe far from both, and from where the zone puts a hero: more than its reach and a run and a dodge's bank away)
    const gpT = await ev(g, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
    const T = await ev(host, async (gq) => { const A = await import('/src/game/actors.js'), G = window.__G, p = G.player, m = G.zone.map, sp = G.zone.L.spots, far = (x, z) => [G.zone.L.start, sp.waypoint, sp.camp2, G.zone.checkpoint].every((q) => !q || Math.hypot(q.x - x, q.z - z) > 20) && Math.hypot(p.x - x, p.z - z) > 70; for (let d = 140; d >= 70; d -= 5) for (let a = 0; a < 6.28; a += 0.3) { const x = gq.x + Math.cos(a) * d, z = gq.z + Math.sin(a) * d; if (m.walkable(x, z) && m.walkable(x + 2, z) && far(x, z)) { const s = A.spawnMonster('skeleton', x, z, {}); s.hp = s.hpMax = 5e6; s.speed = 0; G.actors.push(s); window.__farT = s; return { id: s.id, x, z }; } } return null; }, gpT);
    await ev(g, () => { const S = window.__NET.S, P0 = S.ch.presence.bind(S.ch); S.ch.presence = (p) => P0(window.__lie ? window.__lie(p) : p); });
    const at = (T) => `(p) => p.h ? { ...p, h: [Math.round((${T.x} + 2) * 20), Math.round(${T.z} * 20), ...p.h.slice(2)] } : p`;
    const trick = async (first, T) => {
      const r0 = await ev(host, () => { const r = window.__NET.NET.remotes[0]; return r && { x: r.x, z: r.z }; });
      await ev(g, (f) => { window.__lie = eval(f); }, first); await sleep(400);
      await ev(g, (f) => { window.__lie = eval(f); }, at(T)); await sleep(700);
      const r = await ev(host, ([id, T, r0]) => { const N = window.__NET, r = N.NET.remotes[0], st = N.S.peers.get(r?.peer)?.state, m = window.__G.zone.map, p = window.__G.player; return { d: r ? Math.round(Math.hypot(r.x - T.x, r.z - T.z)) : null, moved: r && r0 ? Math.round(Math.hypot(r.x - r0.x, r.z - r0.z)) : null, byHost: r ? Math.round(Math.hypot(r.x - p.x, r.z - p.z)) : null, onMap: !!st && m.walkable(st.x, st.z), far: N.S.stats.why.far || 0, hp: window.__farT.hp }; }, [T.id, T, r0]);
      await ev(g, (id) => { const S = window.__NET.S; for (let i = 0; i < 5; i++) S.ev.push([++S.evSeq, 'h', id, 50, 0, {}]); }, T.id); await sleep(600);
      const r2 = await ev(host, () => ({ far: window.__NET.S.stats.why.far || 0, hp: window.__farT.hp }));
      await ev(g, () => { window.__lie = null; }); await sleep(5000);
      return { ...r, refused: r2.far - r.far, struck: r.hp - r2.hp };
    };
    const zk = await trick(`(p) => ({ ...p, zk: 'nowhere:0' })`, T);
    ok(T && zk.d > 26 && zk.byHost < 30 && zk.onMap && zk.refused === 5 && zk.struck === 0, 'a guest that says it was in another zone a moment is put by the host, not by the foe it names: its blows are refused', zk);
    const up = await trick(`(p) => p.h ? { ...p, h: [...p.h.slice(0, 6), p.h[6] | 1, p.h[7]] } : p`, T);
    ok(T && up.d > 26 && up.moved < 36 && up.onMap && up.refused === 5 && up.struck === 0, 'one that says it fell and got up far away does not rise there (it goes from where it fell, at a run)', up);
    await ev(g, () => { window.__lie = (p) => (p.h ? { ...p, h: [499 * 20, 499 * 20, ...p.h.slice(2)] } : p); });
    let off = 0, n = 0;
    for (let i = 0; i < 25; i++) { const w = await ev(host, () => { const N = window.__NET, r = N.NET.remotes[0], st = N.S.peers.get(r?.peer)?.state, m = window.__G.zone.map; return !st || (m.walkable(st.x, st.z) && r.x >= 0 && r.z >= 0 && r.x < m.w && r.z < m.h); }); n++; if (!w) off++; await sleep(120); }
    await ev(g, () => { window.__lie = null; }); await sleep(4000);
    ok(off === 0, 'one that says it stands off the map: its stand-in stands on the map\'s floor all the while', { off, n });

    // a listing in another's name: the room's own peer and person stand on it
    await ev(g, () => window.__NET.S.T.lobby.presence({ g: { c: 'zzzz', cls: 'warden', l: 40, z: 'coast', n: 1, d: 0, v: window.__NET.VER, on: 1, by: 'user_owner', peer: 'forged' } }));
    await until(host, () => window.__NET.S.hosts.some((h) => h.c === 'zzzz'), null, 8000, 'listing');
    const L = await ev(host, () => window.__NET.S.hosts.find((h) => h.c === 'zzzz'));
    const lme = await ev(g, () => window.__NET.S.T.lobby.me);
    ok(L && L.peer === lme && L.by !== 'user_owner', 'a listing cannot name another peer or person', L);
    // two listings of the host's code (the host's and a copy): each button names its own listing's peer, so a tap joins
    // the host it shows however the list has moved since it was drawn
    const code = await ev(host, () => window.__NET.S.code), hpeer = await ev(host, () => window.__NET.S.T.lobby.me);
    await ev(g, (c) => window.__NET.S.T.lobby.presence({ g: { c, cls: 'mage', l: 50, z: 'coast', n: 1, d: 0, v: window.__NET.VER, on: 1 } }), code);
    const v = await open('v1', 'auto=town&lvl=8&cls=mage');
    const two = await until(v, (c) => window.__NET.S.hosts.filter((h) => h.c === c).length === 2, code, 15000, 'two listings');
    const tap = await ev(v, (hp) => { window.__D.openPanel('coop'); const b = [...document.querySelectorAll('#panel [data-a^="cjoin:"]')].find((e) => e.dataset.a.split(':')[2] === encodeURIComponent(hp)); window.__NET.S.hosts.reverse(); b?.click(); return { found: !!b, want: window.__NET.S.wantHost }; }, hpeer);
    await until(v, () => !!window.__NET.S.hostPeer, null, 10000, 'host taken');
    const [vh, want] = await ev(v, () => [window.__NET.S.hostPeer, window.__NET.S.wantHost]);
    ok(two && tap.found && want === hpeer && vh === hpeer, 'a tap on a listing joins that listing\'s host, the list moved under it', { two, tap, vh, want, hpeer });
    ok(!(await fatal(v)), 'no error on its page', await fatal(v));
    await ev(v, () => window.__NET.leaveGame()); await sleep(500);
    pages.splice(pages.indexOf(v), 1); await v.close();
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
    const eq = await ev(g, async () => { const Iv = await import('/src/game/inventory.js'), h = window.__G.hero.__real, I = await import('/src/game/items.js'), i = h.inv.findIndex((it) => it && String(it.id).startsWith('stuff') && I.usable(it, h.cls)); if (i < 0) return { none: true }; const id = h.inv[i].id, ok1 = Iv.equip(i); return { ok: ok1, ring: Object.values(h.equip).some((e) => e?.id === id), dps: window.__G.stats.dps, life: window.__G.stats.lifeMax }; });
    ok(eq.ok && eq.ring && isFinite(eq.dps) && isFinite(eq.life), 'and equipping what the host sent works', eq);
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
    const card = (pg) => ev(pg, () => ({ card: !document.getElementById('downed')?.hidden, dead: window.__G.player.dead, downed: !!window.__NET.S.downed, panel: window.__G.panel, role: window.__NET.S.role, zone: window.__G.zone?.id, act: window.__G.player.avatar?.anim?.actName || null, hold: !!window.__G.player.avatar?.anim?.hold }));
    const d0 = [await card(host), await card(g)];
    await ev(host, () => window.__NET.leaveGame());
    await until(g, () => !window.__NET.S.role, null, 15000, 'guest out');
    await sleep(2500);
    const d1 = [await card(host), await card(g)];
    ok(d0[0].downed && d0[1].downed && d0[0].card && d0[1].card, 'both were down, their cards shown', d0);
    ok(!d1[1].card && !d1[1].dead && !d1[1].role && !d1[1].hold && !/^die/.test(d1[1].act || ''), 'the game ended: the guest\'s card is gone and it is up at home, on its feet', d1[1]);
    ok(!d1[0].card && d1[0].dead && d1[0].panel === 'dead', 'and the host, alone and down, has the death panel', d1[0]);
    ok(!(await fatal(host)) && !(await fatal(g)), 'no error on either page', { host: await fatal(host), guest: await fatal(g) });
    // home, none of the host's zones is kept (the one it stood in let go once it left it); and another host's zones are
    // that host's: in the Forge by a wall (seed 1234, a cell beyond it sealed off), a guest joining comes in where it can
    // walk to the host from, every time
    await until(g, () => window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, 20000, 'home');
    await sleep(2000);
    const zs = await ev(g, () => Object.values(window.__G.zones).map((z) => [z.id, z.netKey || null]));
    ok(zs.length === 1 && zs.every(([, k]) => !k), 'at home the guest holds none of the host\'s zones', zs);
    const hB = await open('hostB', 'auto=forge&lvl=14&cls=warden&seed=1234');
    await tough(hB);
    await place(hB, 5.5, 97.5);
    const codeB = await ev(hB, async () => { const c = await window.__NET.hostGame(); window.__NET.startGame(); return c; });
    const walks = () => ev(g, () => { const G = window.__G, m = G.zone.map, H = window.__NET.S.peers.get(window.__NET.S.hostPeer), P = {}; m.fillWindow(P, Math.floor(H.state.x), Math.floor(H.state.z), 20); const W = 41, cx = Math.floor(G.player.x) - P.x0, cz = Math.floor(G.player.z) - P.z0, d = P.d[cz * W + cx]; return { at: [+G.player.x.toFixed(2), +G.player.z.toFixed(2)], host: [H.state.x, H.state.z], walk: d === 65535 ? null : d / 10, seed: G.zone.seed }; });
    const lands = [];
    for (let r = 0; r < 3; r++) {
      await ev(g, (c) => window.__NET.joinGame(c), codeB);
      const inB = await inZone(g, 'forge', 90000); await sleep(1500);
      lands.push(inB ? await walks() : null);
      await ev(g, () => window.__NET.leaveGame()); await until(g, () => !window.__NET.S.role && window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, 30000, 'home'); await sleep(1500);
    }
    const seedB = await ev(hB, () => window.__G.zone.seed);
    ok(lands.every((l) => l && l.walk !== null && l.walk < 6 && l.seed === seedB), 'by a wall in another host\'s Forge the guest comes in where it walks to the host from, every time', lands);
    ok(!(await fatal(hB)) && !(await fatal(g)), 'no error on either page', { host: await fatal(hB), guest: await fatal(g) });
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
    // --- a boss's darkness on the host: a guest's fire there (Rain of Fire's, dim) is drawn but is no light past its flare ---
    await ev(host, async () => { (await import('/src/game/light.js')).setHeroLight(2.5, null); });
    await ev(gR, () => { window.__G.player.cds.fill(0); });
    await cast(gR, 2, spot.x - 4, spot.z + 2);
    await sleep(3200);
    const dark = await ev(host, async ([x, z]) => { const L = await import('/src/game/light.js'), G = window.__G; const f = G.areas.filter((a) => a.kind === 'fire' && a.team === 'vis' && Math.hypot(a.x - x, a.z - z) < 4); const r = { fires: f.length, dim: f.filter((a) => a.dim).length, lit: f.some((a) => L.lightAt(a.x, a.z)) }; L.setHeroLight(null); return r; }, [spot.x - 4, spot.z + 2]);
    ok(dark.fires > 0 && dark.dim === dark.fires && !dark.lit, 'in a boss\'s darkness a guest\'s fire is drawn on the host, and is no light there', dark);
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
    // fight for a while: everyone's blows, every page's sends counted (and, NET=supa, the project's events)
    const t0 = Date.now(), e0 = supaCount();
    while (Date.now() - t0 < 15000) {
      for (const g of guests) await ev(g, async () => { const C = await import('/src/game/combat.js'), G = window.__G; G.player.hp = G.player.hpMax; for (const a of window.__NET.S.pup.values()) if (!a.dead && a.team === 'foe' && Math.hypot(a.x - G.player.x, a.z - G.player.z) < 14) { C.damage(G.player, a, G.stats.wmax * G.stats.dmgMult * 0.4, { crit: false }); break; } });
      await sleep(400);
    }
    const e1 = supaCount(), all = [];
    if (e0) { const r = supaRate(e0, e1); console.log('     the project: ' + r.msgs.toFixed(1) + ' messages a second in ' + r.calls.toFixed(1) + ' calls, ' + Math.round(r.del) + ' deliveries: ' + Math.round(r.evs) + ' events a second'); if (process.env.ECON !== '0') ok(r.evs < 85, 'a party of four in a fight: under 85 Realtime events a second', Math.round(r.evs)); }
    for (const [i, pg] of [host, ...guests].entries()) { const st = await stats(pg); all.push(st); console.log('     ' + (i ? 'guest ' + i : 'host   ') + ' sends/s ' + st.r.msgsOut.toFixed(1) + ' (peak ' + st.peak.toFixed(1) + '), bytes/s out ' + Math.round(st.r.bytesOut) + ', in ' + Math.round(st.r.bytesIn) + ', drops ' + st.tx.drops + ', too big ' + st.tx.big); }
    ok(all.every((s) => s.peak <= 20), 'every page under 20 sends a second (the room allows ~40)', all.map((s) => +s.peak.toFixed(1)));
    ok(all.every((s) => s.tx.big === 0), 'no message or presence ever over 4 KiB');
    ok(all[0].snaps > 0 && all[0].snapBytes / all[0].snaps < 3900, 'the host\'s snapshots average ' + Math.round(all[0].snapBytes / all[0].snaps) + ' bytes');
    const gk = []; for (const g of guests) gk.push(await ev(g, () => window.__G.hero.stats.kills));
    console.log('     guests\' kills', gk.join(' '));
    // the guests' mixed classes in the HUD
    ok(await ev(guests[0], () => window.__NET.party().length) === 3, 'a guest\'s party list holds the other three');
    for (const [i, pg] of [host, ...guests].entries()) console.log('     page ' + i + ': role ' + (await ev(pg, () => window.__NET.S.role)) + ', n ' + (await ev(pg, () => window.__NET.NET.n)));
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
  // the player's side (LocalTransport, a touch phone): a mistyped code leaves the hero where it was; a guest waiting for a
  // host that has not started keeps its own world, story and Shadow Gate, and the party frame says it waits; a listing
  // of four is refused at once; the open panel is not drawn again on every presence; a double tap on Host opens one
  // room; three names over three heroes side by side; the kill counter and the revive ring clear of the frames and the
  // Bellows' ring; the downed card under the panels, gone when the game ends (a guest up at home, a host by the death
  // panel); the Greek downed words
  async ux() {
    const watch = (pg) => ev(pg, async () => {
      const B = await import('/src/ui/bus.js'), I = await import('/src/i18n/i18n.js'); window.__t = I.t; window.__toasts = []; B.on('toast', (m) => window.__toasts.push(m));
      // (kept alive unless a test means it to fall)
      setInterval(() => { const p = window.__G.player; if (p && !p.dead && !window.__mortal) p.hp = p.hpMax; }, 50);
    });
    const toasted = (pg, k) => ev(pg, (k) => window.__toasts.includes(window.__t(k)), k);
    // a mistyped code, from its own Shadow Gate
    const g = await open('g1', 'auto=town&lvl=12&cls=ranger&quest=10&diff=1&render=1'); await watch(g);
    await ev(g, () => window.__D.emit('startGate', 2));
    await until(g, () => window.__G.zone.id === 'gate' && window.__G.mode === 'play', null, 60000, 'own gate');
    await sleep(1200);
    const at = await ev(g, () => { const G = window.__G; G.gate.progress = 0.6; window.__z0 = G.zone; window.__g0 = G.gate; return { x: G.player.x, z: G.player.z }; });
    await ev(g, () => window.__NET.joinGame('zzzz'));
    await until(g, () => !window.__NET.S.role, null, 16000, 'no host');
    const af = await ev(g, () => { const G = window.__G; return { zone: G.zone === window.__z0, gate: G.gate === window.__g0 && G.gate.progress, x: G.player.x, z: G.player.z, mode: window.__NET.NET.mode }; });
    ok(af.zone && af.gate === 0.6 && Math.hypot(af.x - at.x, af.z - at.z) < 3 && !af.mode, 'a mistyped code: the hero is still in its own Shadow Gate, its run as it was', af);
    ok(await toasted(g, 'coop.noHost') && !(await toasted(g, 'coop.youLeft')), 'and is told no host has that code, not that it is back');
    // waiting for a host that has not started
    const host = await open('host', 'auto=town&lvl=14&quest=2&diff=0&render=1'); await watch(host);
    const code = await ev(host, () => { window.__G.gate = { tier: 5, progress: 0, guardian: null, start: 0, done: false }; return window.__NET.hostGame(); });
    await ev(g, (c) => window.__NET.joinGame(c), code);
    await until(g, () => !!window.__NET.S.world && !!window.__NET.S.hostPeer, null, 15000, 'world');
    await sleep(1500);
    const w = await ev(g, () => { const G = window.__G, pe = document.getElementById('party'); return { world: !!window.__NET.S.world, view: !!G.hero.__real, quest: G.hero.quest, diff: G.hero.diff, gate: G.gate === window.__g0, zone: G.zone === window.__z0, mode: window.__NET.NET.mode, frame: !pe.hidden && pe.querySelector('.pw')?.textContent === window.__t('coop.waitStart') }; });
    ok(w.world && !w.view && w.quest === 10 && w.diff === 1 && w.gate && w.zone && !w.mode, 'the host\'s world came but a guest waiting plays its own: its quest, difficulty and Shadow Gate', w);
    ok(w.frame, 'its party frame shows, with the code and that it waits for the host to start');
    await ev(g, () => { const h = window.__G.hero; h.quest = 11; h.flags.uxWait = true; });
    await ev(g, () => window.__D.openPanel('coop')); await sleep(400);
    await ev(g, () => document.querySelector('[data-a="cleave"]').click()); await sleep(800);
    const lw = await ev(g, () => { const G = window.__G; return { role: window.__NET.S.role, zone: G.zone === window.__z0, gate: G.gate === window.__g0, quest: G.hero.quest, flag: !!G.hero.flags.uxWait, saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /skotos/i.test(k) && /g1/.test(k)) || 'null') || 'null') }; });
    ok(!lw.role && lw.zone && lw.gate && lw.quest === 11 && lw.flag, 'leaving while waiting: still in its gate, what its story did meanwhile kept', { ...lw, saved: undefined });
    ok(await toasted(g, 'coop.leftWait') && !(await toasted(g, 'coop.youLeft')), 'told it left the party, not that it is back');
    // a game its listing shows full: refused at once, its button disabled
    const full = await ev(g, async () => { const N = window.__NET; N.S.hosts = [{ c: 'fu11', cls: 'warden', l: 5, z: 'town', n: 4, d: 0, v: N.VER, on: 1, peer: 'pz', by: null }]; window.__D.openPanel('coop'); const r = await N.joinGame('fu11'); return { r, err: N.S.err, role: N.S.role, disabled: document.querySelector('[data-a^="cjoin:fu11:"]')?.disabled }; });
    ok(full.r === false && full.err === 'full' && !full.role && full.disabled, 'a listing of four: its button disabled, joining it refused at once (full)', full);
    await ev(g, () => window.__D.closePanel());
    // a guest waiting walks out of its zone (its own travel) just as the host starts: it ends in the host's town, not in
    // the zone its own travel built
    await ev(g, (c) => window.__NET.joinGame(c), code);
    await until(g, () => !!window.__NET.S.world && !!window.__NET.S.hostPeer, null, 15000, 'world again');
    await ev(g, () => window.__D.emit('travel', 'forest', { at: 'waypoint' }));
    await sleep(100);
    await ev(host, () => window.__NET.startGame());
    ok(await until(g, () => window.__NET.S.zoneKey && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 60000, 'g in'), 'the guest came into the host\'s town');
    await sleep(3000);
    const race = await ev(g, () => ({ zone: window.__G.zone.id, key: window.__G.zone.netKey || null, zk: window.__NET.S.zoneKey, mode: window.__NET.NET.mode }));
    ok(race.zone === 'town' && race.key === race.zk && race.mode === 'guest', 'its own travel, begun while it waited, did not leave it elsewhere', race);
    // the open panel with a guest walking: the same body, its scroll kept, the meter set in place
    const hp = await hostPos(host); await place(g, hp.x + 2, hp.z + 1);
    await ev(g, () => { let k = 0; window.__walk = setInterval(() => { const p = window.__G.player, f = window.__G.zone.map.nearestFloor(p.x + Math.sin(k / 6) * 0.3, p.z + Math.cos(k / 6) * 0.3); p.x = f.x; p.z = f.z; k++; }, 50); });
    await ev(host, () => window.__D.openPanel('coop')); await sleep(600);
    const p0 = await ev(host, () => { const b = document.querySelector('#panel .pn-b'); window.__pb = b; b.scrollTop = 40; window.__renders = 0; new MutationObserver(() => window.__renders++).observe(document.getElementById('panel'), { childList: true }); return { top: b.scrollTop, h: b.scrollHeight, c: b.clientHeight, meter: document.querySelector('#panel .coop-meter')?.textContent }; });
    await sleep(3500);
    const p1 = await ev(host, () => { const b = document.querySelector('#panel .pn-b'); return { same: b === window.__pb, top: b.scrollTop, renders: window.__renders, meter: document.querySelector('#panel .coop-meter')?.textContent }; });
    ok(p1.same && p1.renders === 0 && p1.top === p0.top, 'the host\'s open panel, the guest walking: not drawn again, its scroll kept', { p0, p1 });
    ok(!!p1.meter && p1.meter !== p0.meter, 'its meter set in place', [p0.meter, p1.meter]);
    await ev(g, () => clearInterval(window.__walk));
    await ev(host, () => window.__D.closePanel());
    // three guests side by side, on one screen line: three names, none over another
    const g2 = await open('g2', 'auto=town&lvl=12&cls=mage&render=1'); await watch(g2);
    const g3 = await open('g3', 'auto=town&lvl=12&cls=warden&render=1'); await watch(g3);
    for (const pg of [g2, g3]) await ev(pg, (c) => window.__NET.joinGame(c), code);
    for (const pg of [g2, g3]) await until(pg, () => window.__NET.S.zoneKey && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 60000, 'in');
    await until(host, () => window.__NET.NET.n === 4, null, 20000, 'n 4');
    for (const [i, pg] of [g, g2, g3].entries()) await place(pg, hp.x - 1 + i, hp.z + 2);
    await place(host, hp.x, hp.z - 2);
    await sleep(2000);
    const pl = await ev(host, () => [...document.querySelectorAll('#plates .plate')].filter((e) => e.style.display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, getComputedStyle(e).backgroundColor]; }));
    const over = pl.some((a, i) => pl.some((b, j) => j > i && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]));
    ok(pl.length === 3 && !over, 'three plates over three heroes side by side, none over another', pl.map((r) => r.slice(0, 4).map(Math.round)));
    ok(pl.every((r) => r[4] !== 'rgba(0, 0, 0, 0)'), 'each on its own background', pl[0]?.[4]);
    await shot(host, 'ux-plates.png');
    // a cinematic on the host while their names change (they level up): after it the plates still stand apart
    // (four pages drawing on one machine run the game slowly: a short scene, waited for as long as it takes)
    await ev(host, (hp) => window.__D.emit('cine', { x: hp.x, z: hp.z - 2, dur: 2.5, zoom: 1, steps: [] }), hp);
    await until(host, () => document.getElementById('hud').hidden, null, 5000, 'cine on');
    for (const pg of [g, g2, g3]) await ev(pg, () => { const h = window.__NET.S.real || window.__G.hero; h.level += 1; });
    const inCine = await until(host, () => window.__G.mode === 'cine' && [...document.querySelectorAll('#plates .plate')].filter((e) => / 13$/.test(e.textContent)).length === 3, null, 20000, 'names changed in the scene');
    await until(host, () => window.__G.mode === 'play' && !document.getElementById('hud').hidden, null, 90000, 'cine end');
    await sleep(1200);
    const pl2 = await ev(host, () => [...document.querySelectorAll('#plates .plate')].filter((e) => e.style.display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, e.textContent]; }));
    const over2 = pl2.some((a, i) => pl2.some((b, j) => j > i && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]));
    ok(inCine && pl2.length === 3 && pl2.every((r) => r[2] > r[0]) && !over2, 'after a cinematic in which their names changed, none over another', pl2.map((r) => [...r.slice(0, 4).map(Math.round), r[4]]));
    // the kill counter right of the party frames; the revive ring below a Bellows' ring
    const hud = await ev(host, () => {
      const m = document.getElementById('massacre'), pe = document.getElementById('party'), ring = document.getElementById('ring'), rv = document.getElementById('revive');
      const pr = pe.getBoundingClientRect(), ml = m.getBoundingClientRect().left;
      ring.hidden = false; rv.hidden = false; const a = ring.getBoundingClientRect(), b = rv.getBoundingClientRect(); ring.hidden = true; rv.hidden = true;
      return { partyRight: pr.right, massLeft: ml, ringBottom: a.bottom, reviveTop: b.top };
    });
    ok(hud.massLeft >= hud.partyRight, 'the kill counter stands right of the party frames', hud);
    ok(hud.reviveTop >= hud.ringBottom - 2, 'the revive ring stands below a Bellows\' ring', hud);
    // downed: the card under an open panel; the words neutral
    await ev(g2, async () => { window.__mortal = true; const C = await import('/src/game/combat.js'), G = window.__G; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await until(g2, () => !!window.__NET.S.downed, null, 5000, 'downed');
    await sleep(800);
    const dn = await ev(g2, () => ({ h: document.querySelector('#downed .h')?.textContent, shown: !document.getElementById('downed').hidden, word: window.__t('coop.downedTag') }));
    ok(dn.shown && dn.h === 'ΕΚΤΟΣ ΜΑΧΗΣ' && dn.word === 'εκτός μάχης', 'the downed card and tag in neutral Greek', dn);
    await until(host, () => [...document.querySelectorAll('#plates .plate')].some((e) => e.textContent.includes('εκτός μάχης')), null, 5000, 'tag');
    ok(await ev(host, () => [...document.querySelectorAll('#plates .plate')].some((e) => e.textContent.includes('εκτός μάχης'))), 'the host\'s plate over it says so too');
    const under = await ev(g2, () => { window.__D.openPanel('inventory'); const r = document.getElementById('downed').getBoundingClientRect(); const pts = [[r.left + 8, r.top + 8], [(r.left + r.right) / 2, (r.top + r.bottom) / 2], [r.right - 8, r.bottom - 8]]; return pts.map(([x, y]) => document.elementFromPoint(x, y)?.closest('#downed') ? 'card' : 'panel'); });
    ok(under.every((x) => x === 'panel'), 'with a panel open, the card is under it: its taps are the panel\'s', under);
    await ev(g2, () => window.__D.closePanel());
    // the host down too (a guest by it), then the host closes the game: the guest up at home, the host by the death panel
    // (the cinematic's end leaves its hero a moment's grace, and four drawing pages run the game slowly)
    await ev(host, async () => { window.__mortal = true; const C = await import('/src/game/combat.js'), G = window.__G; G.player.iframes = 0; C.damage({ team: 'foe', level: 10, x: G.player.x, z: G.player.z, def: {}, affixes: [] }, G.player, 1e7, { pure: true }); });
    await until(host, () => !!window.__NET.S.downed, null, 5000, 'host downed');
    await ev(host, () => window.__NET.leaveGame(null));
    await until(g2, () => !window.__NET.S.role && window.__G.zone.id === 'town', null, 15000, 'g2 home');
    await sleep(800);
    const ge = await ev(g2, () => ({ dead: window.__G.player.dead, card: !document.getElementById('downed').hidden, role: window.__NET.S.role, act: window.__G.player.avatar?.anim?.actName || null, hold: !!window.__G.player.avatar?.anim?.hold }));
    ok(!ge.dead && !ge.card && !ge.role && !ge.hold && !/^die/.test(ge.act || ''), 'the game closed: the downed guest is up at home on its feet, no card left', ge);
    const he = await ev(host, () => ({ dead: window.__G.player.dead, panel: window.__G.panel, card: !document.getElementById('downed').hidden, ring: !document.getElementById('revive').hidden }));
    ok(he.dead && he.panel === 'dead' && !he.card && !he.ring, 'the downed host alone: the death panel, no card', he);
    await ev(host, () => { document.querySelector('#panel [data-a="respawn"]')?.click(); });
    ok(await until(host, () => !window.__G.player.dead && window.__G.mode === 'play', null, 15000, 'host up'), 'and it rises from it');
    // a double tap on Host: one room, the button disabled while it connects
    await ev(host, () => window.__D.openPanel('coop')); await sleep(300);
    const dt = await ev(host, async () => { const N = window.__NET; const n0 = N.S.T.rooms.size; document.querySelector('[data-a="chost"]').click(); const dis = document.querySelector('[data-a="chost"]')?.disabled; document.querySelector('[data-a="chost"]')?.click(); const again = await N.hostGame(); await new Promise((r) => setTimeout(r, 600)); return { n0, dis, again, rooms: [...N.S.T.rooms.keys()], code: N.S.code, role: N.S.role }; });
    ok(dt.dis && dt.again === null && dt.rooms.length === 1 && dt.rooms[0] === 'skotos-' + dt.code && dt.role === 'host', 'a double tap on Host: the button disabled while it connects, one room', dt);
  },
  // who may play together on the room (the fake room): a Viewer or Commenter and a view the room cannot connect are told
  // why and play alone; the hosts listed by name; a double tap on Host joins one room; a host whose sends are refused
  // ends its game; a grant withdrawn mid-game ends it for that page (a guest home, a host alone)
  async access() {
    const watch = (pg) => ev(pg, async () => { const B = await import('/src/ui/bus.js'), I = await import('/src/i18n/i18n.js'); window.__t = I.t; window.__toasts = []; B.on('toast', (m) => window.__toasts.push(m)); setInterval(() => { const p = window.__G.player; if (p && !p.dead) p.hp = p.hpMax; }, 50); });
    const toasted = (pg, k) => ev(pg, (k) => window.__toasts.includes(window.__t(k)), k);
    const h = await open('alice', 'by=alice&auto=town&lvl=12&cls=warden'); await watch(h);
    const code = await ev(h, () => window.__NET.hostGame());
    // a Viewer: admitted, told it plays alone, nothing to tap that fails
    const v = await open('vic', 'by=vic&acc=view&auto=town&lvl=8&cls=mage'); await watch(v);
    await until(v, () => window.__NET.S.send === false, null, 8000, 'viewer');
    const vv = await ev(v, async (c) => { const N = window.__NET; window.__D.openPanel('coop'); const txt = document.querySelector('#panel .pn-b').textContent; const r = { send: N.S.send, told: txt.includes(window.__t('coop.noSend')), host: !!document.querySelector('[data-a="chost"]'), join: !!document.querySelector('[data-a="cjoin"]'), hud: !document.getElementById('h-coop').hidden }; window.__D.openPanel('pause'); r.pause = !!document.querySelector('#panel [data-a="coop"]'); window.__D.closePanel(); r.hg = await N.hostGame(); r.jg = await N.joinGame(c); r.mode = window.__G.mode; return r; }, code);
    ok(vv.told && !vv.host && !vv.join && vv.hg === false && vv.jg === false, 'a Viewer: the panel says why it plays alone, no Host or Join, both refused', vv);
    ok(!vv.hud && vv.pause && vv.mode === 'play', 'no party button on its HUD; Co-op in the pause menu (to say why); the game plays on', vv);
    // a view the room cannot connect (signed out, a public link)
    const n = await open('nat', 'ng=1&auto=town&lvl=8&cls=ranger'); await watch(n);
    await until(n, () => window.__NET.S.dead === 'not_granted', null, 8000, 'ng');
    const nn = await ev(n, async () => { const N = window.__NET; window.__D.openPanel('coop'); const txt = document.querySelector('#panel .pn-b').textContent; window.__D.openPanel('pause'); const pause = !!document.querySelector('#panel [data-a="coop"]'); window.__D.closePanel(); return { dead: N.S.dead, none: txt === window.__t('coop.none'), how: txt.includes(window.__t('coop.noneHow')), host: txt.includes(window.__t('coop.host')), pause, hud: !document.getElementById('h-coop').hidden, hg: await N.hostGame(), mode: window.__G.mode }; });
    ok(nn.dead === 'not_granted' && nn.none && !nn.how && !nn.host && !nn.pause && !nn.hud && nn.hg === false && nn.mode === 'play', 'not_granted: the single-player page (no Co-op in the pause menu, no party button; a panel left open says only that there is no co-op here, nothing of access), the game plays on', nn);
    // (and its title has no Co-op)
    await n.goto(BASE + '?peer=nat&slot=nat&q=0&norender&ng=1');
    await n.waitForFunction(() => window.__ready && window.__G.mode === 'title', null, { timeout: 240000 });
    await sleep(600); await ev(n, () => document.getElementById('screen').click());
    await n.waitForFunction(() => !!document.getElementById('m-cont'), null, { timeout: 30000 });
    await until(n, () => window.__NET?.S.dead === 'not_granted', null, 8000, 'ng at the title'); await sleep(300);
    ok(await ev(n, () => !!document.getElementById('m-cont') && !document.getElementById('m-coop')), 'nor its title');
    // the hosts listed by name, one there before the page and one after
    const c = await open('carol', 'by=carol&auto=town&lvl=12&cls=ranger'); await watch(c);
    await until(c, () => window.__NET.S.names.alice === 'Name-alice', null, 8000, 'alice named');
    const b = await open('bob', 'by=bob&auto=town&lvl=12&cls=warden'); await watch(b);
    // (a double tap on Host: one room; the second tap finds the button disabled)
    const dt = await ev(b, async () => { window.__D.openPanel('coop'); await new Promise((r) => setTimeout(r, 200)); document.querySelector('[data-a="chost"]').click(); const dis = document.querySelector('[data-a="chost"]')?.disabled; document.querySelector('[data-a="chost"]')?.click(); await new Promise((r) => setTimeout(r, 1500)); window.__D.closePanel(); return { dis, rooms: await window.__roomsOf(), code: window.__NET.S.code }; });
    ok(dt.dis && dt.rooms.length === 1 && dt.rooms[0] === 'skotos-' + dt.code, 'a double tap on Host: the room holds this page in one game room only', dt);
    await until(c, () => window.__NET.S.names.bob === 'Name-bob', null, 8000, 'bob named');
    const list = await ev(c, () => { window.__D.openPanel('coop'); const l = [...document.querySelectorAll('.coop-h .nm')].map((e) => e.textContent); window.__D.closePanel(); return l; });
    ok(list.includes('Name-alice') && list.includes('Name-bob'), 'the games waiting listed by their hosts\' names (one hosting before the page, one after)', list);
    // a host whose sends the room refuses ends its game; its guest, waiting, is told the host has gone
    await ev(b, () => window.__roomViewer(true));
    await ev(c, (code) => window.__NET.joinGame(code), dt.code);
    ok(await until(b, () => !window.__NET.S.role, null, 15000, 'b ends'), 'a host whose sends are refused (not_permitted: its world for the guest) ends its game');
    ok(await toasted(b, 'coop.noSend') && await ev(b, () => window.__NET.S.send === false), 'and is told why', await ev(b, () => window.__toasts));
    ok(await until(c, () => !window.__NET.S.role, null, 20000, 'c leaves'), 'its guest, waiting, leaves');
    ok(await toasted(c, 'coop.hostGone') && await ev(c, () => window.__G.zone.id === 'town' && !window.__G.hero.__real), 'told the host has gone, still in its own world', await ev(c, () => window.__toasts));
    // a grant withdrawn mid-game: the guest goes home, told why; then the host, alone
    await ev(c, (code) => window.__NET.joinGame(code), code);
    await until(h, () => window.__NET.S.roster.length === 1, null, 10000, 'h roster');
    await ev(h, () => window.__NET.startGame());
    ok(await until(c, () => window.__NET.S.zoneKey && window.__NET.S.zoneKey === window.__G.zone.netKey, null, 60000, 'c in'), 'a guest in alice\'s game');
    await ev(c, () => window.__roomEnd('revoked'));
    ok(await until(c, () => !window.__NET.S.role && window.__NET.S.dead === 'revoked' && !window.__G.hero.__real, null, 8000, 'c revoked'), 'revoked on the guest: out of the game, its own hero');
    ok(await toasted(c, 'coop.off'), 'and told co-op is no longer here (nothing of access)');
    ok(await until(c, () => window.__G.zone.id === 'town' && window.__G.mode === 'play' && !window.__NET.NET.mode, null, 20000, 'c home'), 'home in its own town, playing');
    const cp = await ev(c, async () => { window.__D.openPanel('pause'); const pause = !!document.querySelector('#panel [data-a="coop"]'); window.__D.closePanel(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return { pause, hud: !document.getElementById('h-coop').hidden, avail: window.__NET.S.avail }; });
    ok(!cp.pause && !cp.hud && !cp.avail, 'the single-player page after: no Co-op entry, no party button', cp);
    ok(await until(h, () => window.__NET.NET.n === 1 && !window.__NET.NET.remotes.length, null, 20000, 'h alone'), 'the host plays on, the guest gone');
    await ev(h, () => window.__roomEnd('revoked'));
    ok(await until(h, () => !window.__NET.S.role && window.__NET.S.dead === 'revoked', null, 8000, 'h revoked'), 'revoked on the host: its game ended');
    await sleep(600);
    const hh = await ev(h, () => ({ party: !document.getElementById('party').hidden, mode: window.__G.mode, net: window.__NET.NET.mode, told: window.__toasts.includes(window.__t('coop.off')) }));
    ok(!hh.party && hh.mode === 'play' && !hh.net && hh.told, 'no party frame or blinking link left, told co-op is no longer here, the game plays on alone', hh);
    // a grant withdrawn while Host is on its way (the room's answer to the join after the end): no game, no party frame
    const e = await open('eve', 'by=eve&auto=town&lvl=12&cls=mage'); await watch(e);
    await until(e, () => window.__NET.S.send === true, null, 8000, 'eve may send');
    await ev(e, () => { window.__D.openPanel('coop'); document.querySelector('[data-a="chost"]').click(); window.__roomEnd('revoked'); });
    await sleep(4000);
    const ee = await ev(e, () => ({ role: window.__NET.S.role, dead: window.__NET.S.dead, status: window.__NET.S.status, party: !document.getElementById('party').hidden, stale: document.getElementById('party').classList.contains('stale'), hud: !document.getElementById('h-coop').hidden, net: window.__NET.NET.mode, panel: document.querySelector('#panel .pn-b')?.textContent, told: window.__toasts.includes(window.__t('coop.off')) }));
    ok(!ee.role && ee.dead === 'revoked' && !ee.party && !ee.hud && !ee.net && ee.told, 'revoked while Host connects: no game is left open, no party frame, told co-op is no longer here', ee);
  },
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
// (a runtime error on any page's #fatal box fails the scenario)
const fatal = await fatalAll(browser, FATAL);
ok(!fatal.length, 'no #fatal error on any page', fatal.length ? fatal.slice(0, 10) : undefined);
fs.writeFileSync(out + '/' + name + '.json', JSON.stringify({ name, fails, results }, null, 1));
console.log(fails ? fails + ' FAILED' : 'all passed');
await browser.close();
process.exit(fails ? 1 : 0);
