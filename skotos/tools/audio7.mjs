// Act VII audio check: every new theme and sound is non-silent, does not clip, sits within ±3 dB of an existing theme,
// raises no console error; old themes still start; unknown ids stay silent.
//   node tools/audio7.mjs [baseUrl]        (default http://localhost:5311)
// Two measurements: offline (Audio._renderOffline, the same graph, 12 s) for the numbers, and live (an AnalyserNode
// tapped on whatever reaches ctx.destination) for the real-time path. LIVE=0 skips the live pass; SECS sets its length.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = (process.argv[2] || 'http://localhost:5311').replace(/\/$/, '');
const LIVE = process.env.LIVE !== '0', SECS = +(process.env.SECS || 12);
const REF = 'pass', REF2 = 'forest';
const THEMES = ['thaw', 'thawGreen', 'tarn', 'tarnGreen', 'kallisto', 'kelados'];
// [label, theme, mood, intensity]
const VARIANTS = [
  ['thaw race 1 (spate)', 'thaw', { race: 1 }, 0], ['thaw race 1, fight', 'thaw', { race: 1 }, 1], ['thaw race 0 (low)', 'thaw', { race: 0 }, 0],
  ['tarn, fight', 'tarn', {}, 1], ['kallisto phase 2', 'kallisto', { phase: 1 }, 0], ['kallisto phase 3', 'kallisto', { phase: 2 }, 0],
  ['kallisto dazed', 'kallisto', { daze: 1 }, 0], ['kelados phase 2', 'kelados', { phase: 1 }, 0], ['kelados phase 3', 'kelados', { phase: 2 }, 0],
];
const SFX = ['weirWheel', 'raceStep', 'brookRoar', 'corniceCrack', 'slideRoar', 'snowThump', 'iceBlockSplit', 'iceWake', 'choughCall', 'cubCry', 'tremor', 'sluiceGate', 'winchChain', 'lakeOut', 'hearthCatch', 'callHorn',
  'callAnswer', 'softBell', 'lanternNote', 'lanternWake'];
const SFX_REF = ['tideBell', 'iceGroan', 'surfSwell', 'washOut', 'bearRoar', 'splash', 'iceBreak', 'hornCall', 'shrine', 'towerBell', 'skuaCry', 'golemStep', 'chainRattle', 'fireRekindle'];
const STINGS = ['rest'];
const MOOD0 = { race: 0, shade: 0, rest: 0, daze: 0, slide: 0, phase: 0, hearth: 0, sub: 0 };
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const f1 = (x) => (Number.isFinite(x) ? (x >= 0 ? '+' : '') + x.toFixed(1) : '-inf');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.route('**/__audio7.html', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>audio7</title>' }));
await page.goto(BASE + '/__audio7.html');
await page.evaluate(async () => {
  // tee everything that reaches the speakers into an analyser
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) {
    if (dest && dest === this.context.destination && !(this.context instanceof OfflineAudioContext)) {
      const an = (window.__an ||= (() => { const n = this.context.createAnalyser(); n.fftSize = 2048; return n; })());
      conn.call(this, an);
    }
    return conn.call(this, dest, ...a);
  };
  window.A = (await import('/src/audio/audio.js')).default;
});

const off = (name, mood, lvl, secs = 12, opt = {}) => page.evaluate(async ([name, mood, lvl, secs, opt, MOOD0]) => {
  // (a theme's start clears rest, daze and shade, so the mood is set again once it has started: the incremental render
  // schedules a quarter second ahead, as the live engine does)
  A.mood(MOOD0); A.mood(mood);
  const r = await A._renderOffline((api) => { api.music(name, lvl); A.mood(mood); }, secs, { incremental: true, ...opt });
  A.mood(MOOD0);
  return { peak: r.peak, rms: r.rms, loud: r.loud };
}, [name, mood, lvl, secs, opt, MOOD0]);
const offSfx = (name, sting) => page.evaluate(async ([name, sting]) => {
  const r = await A._renderOffline((api) => (sting ? api.sting(name, 0.05) : api.sfx(name, { at: 0.05 })), 8);
  return { peak: r.peak, rms: r.rms, loud: r.loud };
}, [name, sting]);

const rows = [];
let fail = 0;
const row = (kind, id, m, ref, checks) => {
  const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  if (bad.length) fail++;
  rows.push([kind, id, dB(m.rms).toFixed(1), ref != null ? f1(dB(m.rms) - ref) : '', dB(m.loud ?? 0).toFixed(1), m.peak.toFixed(3), m.raw != null ? m.raw.toFixed(2) : '', bad.length ? 'FAIL ' + bad.join(',') : 'ok']);
};

// ── offline: the reference, then every new theme and variant (mean of two renders: the scores are generative)
const mean2 = async (name, mood, lvl) => {
  const a = await off(name, mood, lvl), b = await off(name, mood, lvl), c = await off(name, mood, lvl, 12, { limiter: false, comp: false });
  return { rms: Math.sqrt((a.rms * a.rms + b.rms * b.rms) / 2), peak: Math.max(a.peak, b.peak), loud: Math.max(a.loud, b.loud), raw: c.peak };
};
const ref = await mean2(REF, {}, 0), refDb = dB(ref.rms);
row('ref', REF, ref, null, {});
row('ref', REF2, await mean2(REF2, {}, 0), refDb, {});
for (const n of ['town', 'drained', 'pherousa', 'ketos', 'boss']) row('old', n, await mean2(n, {}, 0), refDb, {});
const FLOOR = 0.003;
for (const n of THEMES) { const m = await mean2(n, {}, 0); row('theme', n, m, refDb, { silent: m.rms > FLOOR, clip: m.peak < 1, level: Math.abs(dB(m.rms) - refDb) <= 3 }); }
for (const [label, n, mood, lvl] of VARIANTS) { const m = await mean2(n, mood, lvl); row('variant', label, m, refDb, { silent: m.rms > FLOOR, clip: m.peak < 1, level: Math.abs(dB(m.rms) - refDb) <= 3 }); }

// ── the rest: after MOOD.rest the boss themes fall silent but for the motif (the last 4 s of 14 are silence)
for (const n of ['kallisto', 'kelados']) {
  const r = await page.evaluate(async ([n, MOOD0]) => {
    A.mood(MOOD0); A.mood({ rest: 1 });
    const r = await A._renderOffline((api) => { api.music(n, 0); A.mood({ rest: 1 }); }, 14, { keep: true, incremental: true });
    A.mood(MOOD0);
    const d = r.buffer.getChannelData(0), sr = r.buffer.sampleRate, seg = (a, b) => { let s = 0; for (let i = (a * sr) | 0; i < ((b * sr) | 0); i++) s += d[i] * d[i]; return Math.sqrt(s / ((b - a) * sr)); };
    return { peak: r.peak, rms: seg(0, 6), loud: r.loud, tail: seg(11, 14) };
  }, [n, MOOD0]);
  row('rest', n + ' rest (motif)', r, null, { silent: r.rms > 0.001, clip: r.peak < 1, tailSilent: r.tail < 0.0005 });
}

// ── sounds and the sting (loud = the loudest 50 ms window, the engine's own trim measure)
for (const n of SFX_REF) { const m = await offSfx(n); row('old sfx', n, m, null, {}); }
for (const n of SFX) { const m = await offSfx(n); row('sfx', n, m, null, { silent: m.loud > 0.01, clip: m.peak < 1, level: dB(m.loud) > -25 && dB(m.loud) < -7 }); }
for (const n of STINGS) { const m = await offSfx(n, true); row('sting', n, m, null, { silent: m.loud > 0.01, clip: m.peak < 1 }); }

// ── live: the real-time path
const liveRows = [];
if (LIVE) {
  const live = (name, secs, mood) => page.evaluate(async ([name, secs, mood, MOOD0]) => {
    A.init(); A.mood(MOOD0); if (mood) A.mood(mood);
    A.music(null); await new Promise((r) => setTimeout(r, 300));
    A.music(name);
    const an = window.__an, buf = new Float32Array(an.fftSize);
    let sum = 0, n = 0, peak = 0, voices = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) {
      await new Promise((r) => setTimeout(r, 40));
      an.getFloatTimeDomainData(buf);
      for (const x of buf) { sum += x * x; n++; const a = Math.abs(x); if (a > peak) peak = a; }
      const d = A._debug(); voices = Math.max(voices, ...d.themes.filter((t) => t.name === name).map((t) => t.voices), 0);
    }
    const d = A._debug();
    return { rms: Math.sqrt(sum / n), peak, cur: d.cur, state: d.state, voices };
  }, [name, secs, mood || null, MOOD0]);
  const lr = await live(REF, SECS), lrDb = dB(lr.rms);
  liveRows.push(['ref', REF, dB(lr.rms).toFixed(1), '', lr.peak.toFixed(3), lr.voices, lr.state === 'running' ? 'ok' : 'FAIL ctx ' + lr.state]);
  if (lr.state !== 'running') fail++;
  for (const n of THEMES) {
    const m = await live(n, SECS, n === 'thaw' ? { race: 1 } : null);
    const bad = [];
    if (!(m.rms > FLOOR)) bad.push('silent'); if (!(m.peak < 1)) bad.push('clip'); if (m.cur !== n) bad.push('cur'); if (Math.abs(dB(m.rms) - lrDb) > 3) bad.push('level');
    if (bad.length) fail++;
    liveRows.push(['theme', n, dB(m.rms).toFixed(1), f1(dB(m.rms) - lrDb), m.peak.toFixed(3), m.voices, bad.length ? 'FAIL ' + bad.join(',') : 'ok']);
  }
  for (const n of ['town', 'drained']) {
    const m = await live(n, 4);
    const ok = m.cur === n && m.voices > 0 && m.rms > 0.001;
    if (!ok) fail++;
    liveRows.push(['old', n, dB(m.rms).toFixed(1), f1(dB(m.rms) - lrDb), m.peak.toFixed(3), m.voices, ok ? 'ok (starts)' : 'FAIL']);
  }
  // every new sound once, live, and the sting; then ids that do not exist: nothing sounds, nothing throws, the theme stays
  const s = await page.evaluate(async ([SFX, STINGS]) => {
    A.music(null); await new Promise((r) => setTimeout(r, 3200));
    const an = window.__an, buf = new Float32Array(an.fftSize), out = {};
    const hear = async (ms) => { let pk = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { await new Promise((r) => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); for (const x of buf) { const a = Math.abs(x); if (a > pk) pk = a; } } return pk; };
    out.quiet = await hear(400);
    for (const n of SFX) { A.sfx(n); out[n] = await hear(900); await new Promise((r) => setTimeout(r, 300)); }
    for (const n of STINGS) { A.sting(n); out['sting:' + n] = await hear(1500); }
    await new Promise((r) => setTimeout(r, 6000));
    const before = A._debug();
    A.sfx('noSuchSound7'); A.sting('noSuchSting7'); A.music('noSuchTheme7'); A.mood({ noSuchMood7: 1 });
    out.unknown = await hear(600);
    const after = A._debug();
    out.unknownOk = after.cur === before.cur && after.sfxVoices === before.sfxVoices;
    return out;
  }, [SFX, STINGS]);
  for (const n of [...SFX, ...STINGS.map((x) => 'sting:' + x)]) { const ok = s[n] > 0.01 && s[n] < 1; if (!ok) fail++; liveRows.push(['sfx live', n, '', '', s[n].toFixed(3), '', ok ? 'ok' : 'FAIL']); }
  const uok = s.unknownOk && s.unknown < 0.004;
  if (!uok) fail++;
  liveRows.push(['unknown ids', 'sfx/sting/music/mood', '', '', s.unknown.toFixed(4), '', uok ? 'ok (silent)' : 'FAIL']);
}
await browser.close();

const table = (head, rs) => {
  const all = [head, ...rs].map((r) => r.map(String)), w = head.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  const line = (r) => '| ' + r.map((c, i) => c.padEnd(w[i])).join(' | ') + ' |';
  console.log(line(all[0])); console.log('|' + w.map((n) => '-'.repeat(n + 2)).join('|') + '|');
  for (const r of all.slice(1)) console.log(line(r));
};
console.log(`\nOffline (12 s themes at music volume 0.5, 8 s sounds; Δ against '${REF}')`);
table(['kind', 'id', 'rms dB', 'Δ dB', 'loud dB', 'peak', 'raw peak', 'result'], rows);
if (LIVE) { console.log(`\nLive (${SECS} s each, analyser on the output)`); table(['kind', 'id', 'rms dB', 'Δ dB', 'peak', 'voices', 'result'], liveRows); }
console.log(`\nconsole errors: ${errors.length}`); for (const e of errors) console.log('  ' + e);
if (errors.length) fail++;
console.log(fail ? `\nFAIL (${fail})` : '\nPASS');
process.exit(fail ? 1 : 0);
