// Screenshot helper: node tools/shot.mjs "<query>" out.png [w h] [waitMs]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , query = 'viewer', out = 'shots/out.png', w = '1280', h = '720', wait = '600'] = process.argv;
const base = process.env.BASE || 'http://localhost:5199/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto(base + '?' + query, { waitUntil: 'load' });
try { await page.waitForFunction(() => window.__ready, null, { timeout: 60000 }); } catch (e) { logs.push('timeout waiting for __ready'); }
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
console.log('saved', out);
await browser.close();
