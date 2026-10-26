// Scripted play test: node tools/play.mjs "<query>" <outPrefix> [w h]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , query = 'auto=forest', out = '/tmp/play', w = '1280', h = '720'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto('http://localhost:5199/?' + query);
await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: out + '-0.png' });
const steps = (process.env.STEPS || 'w:1500,shot,j:200,j:200,j:200,shot,d:1200,1:0,shot,2:0,3:0,4:0,shot').split(',');
let n = 1;
for (const s of steps) {
  if (s === 'shot') { await page.screenshot({ path: out + '-' + n++ + '.png' }); continue; }
  const [k, ms] = s.split(':');
  if (k === 'wait') { await page.waitForTimeout(+ms); continue; }
  const key = k === 'j' ? 'mouse' : k;
  if (key === 'mouse') { await page.mouse.move(+w / 2, +h / 2 - 100); await page.mouse.down(); await page.waitForTimeout(+ms); await page.mouse.up(); continue; }
  await page.keyboard.down(key); await page.waitForTimeout(+ms || 60); await page.keyboard.up(key); await page.waitForTimeout(250);
}
const state = await page.evaluate(() => { const G = window.__G; return G ? { mode: G.mode, zone: G.zone?.id, hp: G.player?.hp, lvl: G.hero?.level, actors: G.actors.length, kills: G.hero?.stats.kills, x: G.player?.x, z: G.player?.z } : null; });
console.log(JSON.stringify(state));
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
