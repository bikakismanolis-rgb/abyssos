// Act VIII audio check: every new theme is non-silent, does not clip, sits within ±3.5 dB of the reference theme, and
// raises no console error.   node tools/audio8.mjs [baseUrl]   (default http://localhost:5311)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = (process.argv[2] || 'http://localhost:5311').replace(/\/$/, '');
const V = [['tinder', {}, 0], ['tinder', {}, 1], ['vigil', {}, 0], ['vigil', {}, 1], ['aithon', { phase: 0 }, 0], ['aithon', { phase: 2 }, 0], ['aithon', { rest: 1 }, 0], ['ragna', { phase: 0 }, 0], ['ragna', { phase: 2 }, 0], ['ragna', { rest: 1 }, 0]];
const MOOD0 = { race: 0, shade: 0, rest: 0, daze: 0, slide: 0, phase: 0, hearth: 0, sub: 0 };
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage(); const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.route('**/__audio8.html', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>audio8</title>' }));
await page.goto(BASE + '/__audio8.html');
await page.evaluate(async () => { window.A = (await import('/src/audio/audio.js')).default; });
const off = (name, mood, lvl) => page.evaluate(async ([name, mood, lvl, MOOD0]) => { A.mood(MOOD0); A.mood(mood); const r = await A._renderOffline((api) => { api.music(name, lvl); A.mood(mood); }, 12, { incremental: true }); A.mood(MOOD0); return { peak: r.peak, rms: r.rms }; }, [name, mood, lvl, MOOD0]);
const two = async (...a) => { const x = await off(...a), y = await off(...a); return { rms: Math.sqrt((x.rms * x.rms + y.rms * y.rms) / 2), peak: Math.max(x.peak, y.peak) }; };
const ref = dB((await two('pass', {}, 0)).rms); let fail = 0;
console.log('ref pass ' + ref.toFixed(1) + ' dB');
for (const [name, mood, lvl] of V) {
  const m = await two(name, mood, lvl), d = dB(m.rms) - ref, rest = !!mood.rest;
  const ok = m.rms > 0.0005 && m.peak <= 1.0 && (rest ? d < 3.5 : Math.abs(d) <= 3.5);
  if (!ok) fail++;
  console.log((ok ? 'OK ' : 'XX ') + name + ' ' + JSON.stringify(mood) + ' lvl ' + lvl + ': ' + dB(m.rms).toFixed(1) + ' dB (' + (d >= 0 ? '+' : '') + d.toFixed(1) + '), peak ' + m.peak.toFixed(2));
}
if (errors.length) { fail++; console.log('errors: ' + errors.slice(0, 5).join(' | ')); }
console.log(fail ? 'FAIL ' + fail : 'audio8 pass');
await browser.close(); process.exit(fail ? 1 : 0);
