// node tools/net/live-web.mjs [outdir]: the web build (npm run build:web, dist-web/) in a browser, co-op over the live
// Supabase project its .env.web.local names. A static server of this process serves dist-web/ (PORT, default 5391);
// one headless Chromium (swiftshader, as tools/scenario.mjs), two pages, each in its own browser context, so two
// anonymous users, nothing faked: the build picks SupabaseTransport itself (its netcfg.web.js). Through the game's own
// UI: page A taps the title, makes a Warden (New, the card, Go, the intro skipped), opens Co-op from the HUD and hosts;
// page B makes a Mage, opens Co-op, finds A's game in the lobby's list, types A's code and joins; A presses Start. Then:
// each sees the other (the party frame, the other hero's actor, the host's monsters on the guest), a monster B kills is
// dead on A, and A ends the game from its panel: B is told and is back in its own town. The #fatal box and the console
// errors of both pages are reported. What it does on the project: two anonymous sign-ins (a context each), a game
// hosted and ended, a minute or two of a pair's traffic (about 60 messages a second, deliveries counted).
// Screenshots in outdir (default /tmp/skotos-live-web).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { watchFatal, fatalAll } from '../fatal.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const root = fileURLToPath(new URL('../../', import.meta.url)), dist = path.join(root, 'dist-web');
const out = process.argv[2] || '/tmp/skotos-live-web', PORT = +(process.env.PORT || 5391);
fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.log('no dist-web/: npm run build:web first'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = []; let fails = 0;
const ok = (c, m, v) => { rows.push({ pass: !!c, m, v: v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v) }); if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m + (v !== undefined ? '  ' + (typeof v === 'string' ? v : JSON.stringify(v)) : '')); };
const info = (m, v) => { rows.push({ pass: null, m, v: typeof v === 'string' ? v : JSON.stringify(v) }); console.log('     ' + m + '  ' + (typeof v === 'string' ? v : JSON.stringify(v))); };

// the build: its URL, key and supabase-js (a chunk of its own), or this is no test of co-op
const env = Object.fromEntries((fs.existsSync(path.join(root, '.env.web.local')) ? fs.readFileSync(path.join(root, '.env.web.local'), 'utf8') : '').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const URL_ = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL, KEY = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const js = fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js')).map((f) => [f, fs.readFileSync(path.join(dist, 'assets', f), 'utf8')]);
const withUrl = js.filter(([, s]) => URL_ && s.includes(URL_)).map(([f]) => f), withKey = js.filter(([, s]) => KEY && s.includes(KEY)).map(([f]) => f), sb = js.filter(([, s]) => s.includes('signInAnonymously') && s.includes('realtime/v1')).map(([f]) => f);
ok(withUrl.length && withKey.length && sb.length && !sb.some((f) => withUrl.includes(f)), 'the build carries the project\'s URL and key, and supabase-js in a chunk of its own', { url: withUrl, key: withKey.length, supabase: sb });

// the static server (no CSP: the default)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(dist, p);
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);
const BASE = 'http://localhost:' + PORT + '/';

// (LIVE_PROXY=<http://host:port>: the project reached through that proxy, this server directly)
const proxy = process.env.LIVE_PROXY;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'], ...(proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1,<-loopback>' } } : {}) });
const FATAL = watchFatal(browser);
const logs = { A: [], B: [] }, net = { A: { supa: 0, failed: [] }, B: { supa: 0, failed: [] } };
async function open(who, q) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
  // (the toasts a page shows, as text: what it was told)
  await ctx.addInitScript(() => { window.__t0 = performance.now(); const rd = setInterval(() => { if (window.__NET?.S.ready && (!window.__NET.S.T || window.__NET.S.T.lobby?.connected())) { window.__readyAt = Math.round(performance.now() - window.__t0); window.__titleAt ??= null; clearInterval(rd); } if (window.__ready && window.__titleAt == null) window.__titleAt = Math.round(performance.now() - window.__t0); }, 50); window.__frames = 0; const tick = () => { window.__frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); window.__toasts = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('toast')) window.__toasts.push(n.textContent); }).observe(document, { childList: true, subtree: true }); });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => { logs[who].push('pageerror ' + e.message.slice(0, 300)); console.log('[' + who + '] pageerror', e.message.slice(0, 300)); });
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.type() + ' ' + m.text().slice(0, 300); logs[who].push(t); console.log('[' + who + '] ' + t); } });
  pg.on('requestfinished', (r) => { if (r.url().includes('.supabase.co')) net[who].supa++; });
  pg.on('requestfailed', (r) => { net[who].failed.push(r.url().replace(/\?.*/, '').slice(0, 100) + ' ' + (r.failure()?.errorText || '')); });
  await pg.goto(BASE + '?' + q);
  await pg.waitForFunction(() => window.__ready && window.__G && window.__G.mode === 'title' && document.getElementById('screen') && !document.getElementById('screen').hidden, null, { timeout: 240000 });
  // (a page that draws nothing still needs its frames: a tick of DOM, as tools/coop.mjs)
  await pg.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;z-index:99;font-size:1px'; document.body.appendChild(d); let k = 0; setInterval(() => { d.textContent = k++ % 2 ? '.' : ':'; }, 20); });
  return pg;
}
const ev = (pg, fn, arg) => pg.evaluate(fn, arg);
async function until(pg, fn, arg, ms = 30000, what = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await pg.evaluate(fn, arg).catch(() => false)) return true; await sleep(250); }
  console.log('     (timed out: ' + what + ')');
  return false;
}
const click = async (pg, sel) => {
  try { await pg.waitForSelector(sel, { state: 'visible', timeout: 30000 }); } catch (e) {
    const st = await pg.evaluate((sel) => { const el = document.querySelector(sel), G = window.__G; return { sel, there: !!el, hidden: el?.hidden, css: el && getComputedStyle(el).display + '/' + getComputedStyle(el).visibility, hud: document.getElementById('hud')?.className, hudHidden: document.getElementById('hud')?.hidden, mode: G?.mode, panel: G?.panel, dialog: !!G?.dialog, net: { ready: window.__NET?.S.ready, avail: window.__NET?.S.avail, role: window.__NET?.S.role, dead: window.__NET?.S.dead, send: window.__NET?.S.send } }; }, sel).catch((x) => String(x));
    await shot(pg, 'fail-' + sel.replace(/[^a-z0-9]+/gi, '_') + '.png');
    throw new Error('not visible: ' + JSON.stringify(st));
  }
  // (a click as the page's own: Playwright's pointer click waits for the element to be still and on top, which a page
  // under load, its HUD redrawn each frame, may never give it within the timeout; then the element's own click)
  try { await pg.click(sel, { timeout: 8000 }); } catch (e) { console.log('     (pointer click on ' + sel + ' not taken: ' + e.message.split('\n').slice(0, 6).join(' | ').slice(0, 400) + ')'); await shot(pg, 'click-' + sel.replace(/[^a-z0-9]+/gi, '_') + '.png'); await pg.$eval(sel, (el) => el.click()); }
};
// (the pages run ?norender, the game's test mode, as tools/coop.mjs: two pages drawing through swiftshader on a few
// cores run at 2 frames a second, and the game sends once a frame. A screenshot draws for its moment)
async function shot(pg, f) { try { await pg.evaluate(() => { window.__shoot = true; }); await sleep(500); await pg.screenshot({ path: path.join(out, f) }); await pg.evaluate(() => { window.__shoot = false; }); } catch (e) { /* none */ } }
const fps = async (pg) => { const a = await ev(pg, () => window.__frames); await sleep(1000); return (await ev(pg, () => window.__frames)) - a; };
// a hero made through the title: tap, New, the class's card, Go, the intro skipped; then in its town
async function newHero(pg, cls) {
  await sleep(600); await click(pg, '#screen'); await sleep(700);
  await click(pg, '#m-new'); await sleep(500);
  await click(pg, `.pcard[data-c="${cls}"]`); await sleep(300);
  await click(pg, '#p-go'); await sleep(800);
  await click(pg, '#i-skip');
  return until(pg, (c) => window.__G.mode === 'play' && window.__G.zone?.id === 'town' && window.__G.hero?.cls === c && window.__G.player, cls, 120000, 'in town');
}

let A = null, B = null;
try {
  A = await open('A', 'q=0&norender');
  B = await open('B', 'q=0&norender');
  const tr = (pg) => ev(pg, () => ({ ready: window.__NET?.S.ready, avail: window.__NET?.S.avail, kind: window.__NET?.S.T?.kind, stamped: window.__NET?.S.T?.stamped, me: window.__NET?.S.me }));
  // (how long from the page's start to its transport: supabase-js loaded, the user signed in, the lobby joined)
  const readyIn = async (pg) => { await until(pg, () => window.__readyAt != null, null, 120000, 'net'); return ev(pg, () => ({ title: window.__titleAt, coop: window.__readyAt })); };
  info('ms from the page\'s start to its title, and to co-op ready (supabase-js loaded, signed in, the lobby joined)', { A: await readyIn(A), B: await readyIn(B) });
  const ta = await tr(A), tb = await tr(B);
  ok(ta.kind === 'supabase' && ta.stamped && tb.kind === 'supabase' && tb.stamped, 'both pages picked SupabaseTransport, stamped (the web build\'s own choice)', { A: ta.kind, B: tb.kind });
  ok(/^[0-9a-f-]{36}$/.test(ta.me || '') && /^[0-9a-f-]{36}$/.test(tb.me || '') && ta.me !== tb.me, 'two anonymous users, one a context', { A: ta.me, B: tb.me });
  ok(await newHero(A, 'warden'), 'A made a Warden through the title and is in its town');
  ok(await newHero(B, 'mage'), 'B made a Mage and is in its town');
  // A: Co-op from the HUD, Host
  await sleep(1200);
  await click(A, '#h-coop'); await sleep(500);
  await shot(A, 'a-lobby.png');
  await click(A, '[data-a="chost"]');
  const hosted = await until(A, () => window.__NET.S.role === 'host' && /^[a-z0-9]{4}$/.test(window.__NET.S.code || '') && window.__NET.S.ch?.host === window.__NET.S.me, null, 20000, 'A hosts');
  const code = await ev(A, () => window.__NET.S.code);
  ok(hosted, 'A hosts from the panel: a code, and the server says A hosts it', code);
  await shot(A, 'a-hosting.png');
  // B: Co-op, A's game in the list, then A's code typed
  await click(B, '#h-coop');
  const listed = await until(B, (c) => window.__NET.S.hosts.some((h) => h.c === c) && !!document.querySelector(`[data-a^="cjoin:${c}:"]`), code, 30000, 'listed');
  ok(listed, 'B\'s lobby lists A\'s game', await ev(B, () => window.__NET.S.hosts.map((h) => h.c + ' ' + h.cls + ' ' + h.l + ' ' + h.n + '/4')));
  await shot(B, 'b-lobby.png');
  await B.fill('#coop-code', code);
  await click(B, '[data-a="cjoin"]:not([data-a^="cjoin:"])');
  const inRoster = await until(A, () => window.__NET.S.roster.length === 1, null, 30000, 'roster');
  ok(inRoster, 'B joined by A\'s code: A\'s roster has it', await ev(A, () => window.__NET.S.roster));
  const bHost = await ev(B, () => ({ role: window.__NET.S.role, host: window.__NET.S.hostPeer, chHost: window.__NET.S.ch?.host }));
  ok(bHost.role === 'guest' && bHost.host === ta.me && bHost.chHost === ta.me, 'B is A\'s guest; its host is the server\'s word (game_host), A\'s user', bHost);
  await shot(A, 'a-roster.png');
  await click(A, '[data-a="cstart"]');
  const inz = await until(B, () => window.__NET.S.zoneKey && window.__NET.S.zoneKey === window.__G.zone?.netKey && window.__G.mode === 'play', null, 90000, 'B in A\'s world');
  ok(inz, 'A started: B is in A\'s world (A\'s town)', await ev(B, () => ({ zone: window.__G.zone?.id, key: window.__G.zone?.netKey, zk: window.__NET.S.zoneKey })));
  await ev(A, () => window.__D.closePanel()); await ev(B, () => window.__D.closePanel());
  // B beside A
  const hp = await ev(A, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
  await ev(B, (p) => { const G = window.__G, f = G.zone.map.nearestFloor(p.x + 2, p.z + 1); G.player.x = f.x; G.player.z = f.z; }, hp);
  await until(A, () => window.__NET.NET.remotes.length === 1 && window.__NET.NET.n === 2, null, 20000, 'A sees B');
  await until(B, () => window.__NET.NET.remotes.length === 1 && window.__NET.NET.n === 2, null, 20000, 'B sees A');
  info('frames a second', { A: await fps(A), B: await fps(B) });
  const seeA = await ev(A, () => ({ mode: window.__NET.NET.mode, n: window.__NET.NET.n, remotes: window.__NET.NET.remotes.length, frame: !document.getElementById('party')?.hidden && document.querySelectorAll('#party .pm').length, plates: document.querySelectorAll('#plates .plate').length, party: window.__NET.party().map((p) => p.cls + ' ' + p.lvl) }));
  const seeB = await ev(B, () => ({ mode: window.__NET.NET.mode, n: window.__NET.NET.n, remotes: window.__NET.NET.remotes.length, frame: !document.getElementById('party')?.hidden && document.querySelectorAll('#party .pm').length, plates: document.querySelectorAll('#plates .plate').length, party: window.__NET.party().map((p) => p.cls + ' ' + p.lvl) }));
  ok(seeA.mode === 'host' && seeA.n === 2 && seeA.remotes === 1 && seeA.frame === 1, 'A sees B: its party frame and B\'s hero', seeA);
  ok(seeB.mode === 'guest' && seeB.n === 2 && seeB.remotes === 1 && seeB.frame === 1, 'B sees A: its party frame and A\'s hero', seeB);
  const near = await until(A, (bp) => { const r = window.__NET.NET.remotes[0]; return !!r && Math.hypot(r.x - bp.x, r.z - bp.z) < 3; }, await ev(B, () => ({ x: window.__G.player.x, z: window.__G.player.z })), 10000, 'B\'s stand-in by B');
  ok(near, 'B\'s hero on A\'s page stands where B put it');
  await shot(A, 'a-party.png'); await shot(B, 'b-party.png');
  // a monster of A's beside B, its life 1; B strikes it (the game's own blow: a guest's hit goes to its host)
  const bp = await ev(B, () => ({ x: window.__G.player.x, z: window.__G.player.z }));
  const id = await ev(A, (p) => { const G = window.__G, f = G.zone.map.nearestFloor(p.x + 1.5, p.z), a = window.__D.spawnMonster('skeleton', f.x, f.z, {}); a.hp = 1; a.speed = 0; G.actors.push(a); window.__mon = a; return a.id; }, bp);
  const pup = await until(B, (id) => window.__NET.S.pup.has(id), id, 15000, 'B sees the monster');
  ok(pup, 'B sees A\'s monster (the host\'s snapshot)', id);
  const k0 = await ev(B, () => window.__G.hero.stats?.kills || 0);
  for (let i = 0; i < 8 && !(await ev(A, () => window.__mon.dead)); i++) { await ev(B, (id) => { const a = window.__NET.S.pup.get(id); if (a && !a.dead) window.__D.kill(a); }, id); await sleep(700); }
  const dead = await until(A, () => window.__mon.dead, null, 8000, 'dead on A');
  ok(dead, 'the monster B struck is dead on A', await ev(A, () => ({ dead: window.__mon.dead, hp: window.__mon.hp, why: window.__NET.S.stats.why })));
  const deadB = await until(B, (id) => { const a = window.__NET.S.pup.get(id); return !a || a.dead; }, id, 8000, 'dead on B');
  const k1 = await ev(B, () => window.__G.hero.stats?.kills || 0);
  ok(deadB && k1 > k0, 'and dead on B, the kill counted on B\'s own hero', { deadB, kills: [k0, k1] });
  // a few seconds of the pair as it plays: what it costs
  await sleep(4000);
  const meter = (pg) => ev(pg, () => { const r = window.__NET.S.ch.meter.rate(); return { out: +r.msgsOut.toFixed(1), outKB: +(r.bytesOut / 1024).toFixed(1), in: +r.msgsIn.toFixed(1), inKB: +(r.bytesIn / 1024).toFixed(1), drops: window.__NET.S.ch.meter.tx.drops, err: window.__NET.S.ch.error || null }; });
  const ma = await meter(A), mb = await meter(B);
  info('the pair\'s traffic, messages and KB a second (the last 5 s, each page\'s meter)', { A: ma, B: mb });
  ok(!ma.err && !mb.err && ma.drops === 0, 'nothing the server refused, no host drops', { A: [ma.drops, ma.err], B: [mb.drops, mb.err] });
  // A ends the game from its panel: B is told, and is home
  const lvl0 = await ev(B, () => window.__G.hero.__real?.level ?? window.__G.hero.level);
  await click(A, '#h-coop'); await sleep(500);
  await click(A, '[data-a="cleave"]');
  const left = await until(A, () => !window.__NET.S.role, null, 10000, 'A left');
  const home = await until(B, () => window.__G.zone?.id === 'town' && !window.__NET.S.role && !window.__G.hero.__real && window.__G.mode === 'play', null, 45000, 'B home');
  const told = await ev(B, () => ({ toasts: window.__toasts.slice(-6), hostLeft: window.__D.t('coop.hostLeft'), lost: window.__D.t('coop.lost') }));
  ok(left, 'A ended the game from its panel');
  ok(home, 'B is back in its own town, its own hero', await ev(B, () => ({ zone: window.__G.zone?.id, key: window.__G.zone?.netKey || null, role: window.__NET.S.role, lvl: window.__G.hero.level })));
  ok(told.toasts.includes(told.hostLeft), 'B was told the host has gone', told.toasts);
  ok((await ev(B, () => window.__G.hero.level)) === lvl0, 'B\'s hero as it was');
  await shot(B, 'b-home.png');
} catch (e) {
  ok(false, 'the run itself', e.stack?.split('\n').slice(0, 3).join(' | '));
} finally {
  const fat = await fatalAll(browser, FATAL).catch(() => []);
  ok(!fat.length, 'no #fatal on either page', fat);
  const errs = (w) => logs[w].filter((l) => l.startsWith('error') || l.startsWith('pageerror'));
  ok(!errs('A').length && !errs('B').length, 'no console errors on either page', { A: errs('A'), B: errs('B') });
  info('console warnings', { A: logs.A.filter((l) => l.startsWith('warning')).length, B: logs.B.filter((l) => l.startsWith('warning')).length });
  info('requests to the project (HTTP, finished)', { A: net.A.supa, B: net.B.supa, failed: [...net.A.failed, ...net.B.failed].slice(0, 6) });
  // (every game hosted here ended: the host's leave does it; a page closed takes its channels)
  for (const pg of [A, B]) { try { await pg?.evaluate(async () => { const N = window.__NET; if (N?.S.role) await N.leaveGame(null); }); } catch (e) { /* gone */ } }
  await sleep(500);
  await browser.close().catch(() => {});
  server.close();
  console.log('\nresult  check');
  for (const r of rows) console.log((r.pass === null ? 'info' : r.pass ? 'pass' : 'FAIL').padEnd(7) + ' ' + r.m + (r.v ? '\n        ' + r.v : ''));
  console.log('\n' + (fails ? fails + ' failed' : 'all passed') + ' (' + rows.filter((r) => r.pass !== null).length + ' checks)');
  process.exit(fails ? 1 : 0);
}
