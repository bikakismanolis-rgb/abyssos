// The graphics diagnostic (gfx/diag.js): snapshots in play, the last one kept apart when the context is lost, shown on the
// title as a box (its × lets it go) and on the no-GL boot screen. node tools/diagcheck.mjs <out>  (BASE=...)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const out = process.argv[2] || 'shots/diag'; mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'http://localhost:5199/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage(), errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const r = {};
await page.goto(base + '?auto=forest&lvl=8&q=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready && window.__G?.mode === 'play', null, { timeout: 120000 });
await page.waitForTimeout(6000);
r.snap = await page.evaluate(() => JSON.parse(localStorage.getItem('skotos.diag') || 'null'));
await page.evaluate(() => window.__R.renderer.forceContextLoss());
await page.waitForFunction(() => !!localStorage.getItem('skotos.diag.crash'), null, { timeout: 20000 }).catch(() => {});
r.kept = await page.evaluate(() => JSON.parse(localStorage.getItem('skotos.diag.crash') || 'null'));
await page.goto(base, { waitUntil: 'load' });
await page.waitForSelector('#diag', { timeout: 120000 }).catch(() => {});
r.box = await page.evaluate(() => document.getElementById('diag')?.innerText || null);
await page.screenshot({ path: out + '/title-box.png' });
// the no-GL screen carries it too
const p2 = await ctx.newPage();
await p2.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, a) { return t === 'webgl2' || t === 'webgl' ? null : o.call(this, t, a); }; });
await p2.goto(base, { waitUntil: 'load' });
await p2.waitForSelector('#gl-retry', { timeout: 90000 }).catch(() => {});
r.nogl = await p2.evaluate(() => document.getElementById('boot')?.innerText.replace(/\s+/g, ' ').slice(0, 600) || null);
await p2.screenshot({ path: out + '/nogl-box.png' }); await p2.close();
// the × lets it go, for good
const b = await page.locator('#diag button').boundingBox().catch(() => null);
if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.waitForTimeout(300);
r.gone = await page.evaluate(() => !document.getElementById('diag') && !localStorage.getItem('skotos.diag.crash'));
r.menu = await page.evaluate(() => !!document.getElementById('screen') && !document.getElementById('screen').hidden);
r.ok = !!(r.snap?.zone === 'forest' && r.snap.frames > 0 && r.snap.tex > 0 && r.kept?.phase === 'lost' && r.kept.zone === 'forest' && /forest|Δάσος/.test(r.box || '') && /tex /.test(r.box || '') && /tex /.test(r.nogl || '') && r.gone) && !errs.length;
r.errs = errs.slice(0, 3);
console.log(JSON.stringify(r, null, 1));
console.log(r.ok ? 'DIAG PASS' : 'DIAG FAIL');
await browser.close(); process.exit(r.ok ? 0 : 1);
