// The graphics diagnostic (gfx/diag.js): snapshots in play, the last one kept apart when the context is lost, and the quiet
// graphics report (gfx/report.js, main's 9aed565): the loss noted among its events and the kept snapshot read from the
// device at the next start, nothing shown. Act VII stage 0: the title's box and the no-GL screen's lines were taken out on
// purpose by that change ("Nothing is shown"; diag.js diagShow has no caller), so this tool asserts the quiet behaviour now:
// no box on the title, no diagnostic lines on the no-GL screen (its retry still there), the kept snapshot left in place for
// the report. A lost context reproduces headless (renderer.forceContextLoss under SwiftShader): this is not a manual check.
// node tools/diagcheck.mjs <out>  (BASE=...)
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
r.lostScreen = await page.waitForSelector('#gl-lost', { timeout: 20000 }).then(() => true).catch(() => false);
r.event = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('skotos.report') || 'null'); const e = (o?.events || []).filter((x) => x.kind === 'lost').pop(); return e ? { kind: e.kind, zone: e.zone } : null; });
await page.goto(base, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(1500);
r.box = await page.evaluate(() => document.getElementById('diag')?.innerText || null);
r.keptAfter = await page.evaluate(() => !!localStorage.getItem('skotos.diag.crash'));
await page.screenshot({ path: out + '/title-box.png' });
// the no-GL screen carries it too
const p2 = await ctx.newPage();
await p2.addInitScript(() => { const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, a) { return t === 'webgl2' || t === 'webgl' ? null : o.call(this, t, a); }; });
await p2.goto(base, { waitUntil: 'load' });
await p2.waitForSelector('#gl-retry', { timeout: 90000 }).catch(() => {});
r.nogl = await p2.evaluate(() => document.getElementById('boot')?.innerText.replace(/\s+/g, ' ').slice(0, 600) || null);
r.retry = await p2.evaluate(() => !!document.getElementById('gl-retry'));
await p2.screenshot({ path: out + '/nogl-box.png' }); await p2.close();
r.menu = await page.evaluate(() => !!document.getElementById('screen') && !document.getElementById('screen').hidden);
r.ok = !!(r.snap?.zone === 'forest' && r.snap.frames > 0 && r.snap.tex > 0 && r.kept?.phase === 'lost' && r.kept.zone === 'forest' && r.lostScreen && r.event?.zone === 'forest'
  && r.box === null && r.keptAfter && r.menu && r.retry && !/tex \d/.test(r.nogl || '')) && !errs.length;
r.errs = errs.slice(0, 3);
console.log(JSON.stringify(r, null, 1));
console.log(r.ok ? 'DIAG PASS' : 'DIAG FAIL');
await browser.close(); process.exit(r.ok ? 0 : 1);
