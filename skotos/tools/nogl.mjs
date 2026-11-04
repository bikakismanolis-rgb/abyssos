// The game when the device refuses a GL context (a phone whose GPU process crashed, a WebView at its limit), simulated by
// wrapping canvas.getContext: node tools/nogl.mjs <out_dir>  (BASE=http://localhost:<port>/; the artifact too, with a page
// that serves it). Cases: attrs (a context only without the high-performance ask), late1 (none for 1 s), late3 (none for
// 3 s), never (none at all: the boot screen says what to do and its button reloads), leave (a page that goes away lets its
// context go and lowers no quality). Fails on a page error or a #fatal box.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const out = process.argv[2] || 'shots/nogl';
mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'http://localhost:5199/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const wrap = (mode) => {
  const orig = HTMLCanvasElement.prototype.getContext; let t0 = 0; window.__glCalls = 0; window.__glRefused = 0;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type === 'webgl2' || type === 'webgl') {
      window.__glCalls++; t0 ||= performance.now();
      const no = mode === 'never' || (mode === 'attrs' && attrs?.powerPreference === 'high-performance') || (mode === 'late1' && performance.now() - t0 < 1000) || (mode === 'late3' && performance.now() - t0 < 3000);
      if (no) { window.__glRefused++; this.dispatchEvent(Object.assign(new Event('webglcontextcreationerror'), { statusMessage: 'test: refused (' + mode + ')' })); return null; }
    }
    return orig.call(this, type, attrs);
  };
};
const report = {};
let ok = true;
for (const mode of ['attrs', 'late1', 'late3', 'never', 'leave']) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(wrap, mode === 'leave' ? 'none' : mode);
  await page.goto(base, { waitUntil: 'load' });
  const r = { mode };
  if (mode === 'never') {
    await page.waitForSelector('#gl-retry', { timeout: 90000 }).catch(() => {});
    r.retry = await page.locator('#gl-retry').count();
    r.text = await page.evaluate(() => document.getElementById('boot')?.innerText.replace(/\s+/g, ' ').slice(0, 300));
    r.ready = await page.evaluate(() => !!window.__ready);
    await page.screenshot({ path: `${out}/never.png` });
    let reloaded = false; page.once('load', () => { reloaded = true; });
    if (r.retry) { await page.click('#gl-retry'); await page.waitForTimeout(1500); }
    r.reloads = reloaded;
    r.ok = r.retry === 1 && !r.ready && /WebGL/.test(r.text || '') && /refused/.test(r.text || '') && reloaded;
  } else {
    await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => {});
    r.ready = await page.evaluate(() => !!window.__ready);
    r.gl = await page.evaluate(() => ({ calls: window.__glCalls, refused: window.__glRefused, canvases: document.querySelectorAll('canvas[data-engine]').length, lost: !!window.__R?.lost }));
    if (mode === 'leave') {
      const q0 = await page.evaluate(() => window.__G.settings.quality);
      // (a listener added after the game's: by then its pagehide has let the context go, which isContextLost shows at once)
      await page.evaluate(() => { localStorage.removeItem('nogl.lost'); const gl = window.__R.renderer.getContext(); window.addEventListener('pagehide', () => localStorage.setItem('nogl.lost', gl.isContextLost() ? '1' : '0')); });
      await page.goto('about:blank'); await page.goto(base, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => {});
      r.after = await page.evaluate(() => ({ lostSeen: localStorage.getItem('nogl.lost') === '1', overlay: !!document.getElementById('gl-lost'), quality: window.__G.settings.quality }));
      r.q0 = q0;
      r.ok = r.ready && r.after.lostSeen && !r.after.overlay && r.after.quality === q0;
    } else r.ok = r.ready && r.gl.canvases === 1 && !r.gl.lost && r.gl.refused > 0;
    await page.screenshot({ path: `${out}/${mode}.png` });
  }
  r.fatal = await page.evaluate(() => document.getElementById('fatal')?.textContent || '').catch(() => '');
  r.errs = errs.slice(0, 3);
  if (r.fatal || errs.length) r.ok = false;
  ok &&= r.ok;
  report[mode] = r;
  console.log(mode, JSON.stringify(r));
  await page.close();
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(ok ? 'NOGL PASS' : 'NOGL FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
