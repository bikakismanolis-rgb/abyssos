/**
 * Σκότος — procedural audio engine. Everything is synthesized with the Web Audio API:
 * no samples, no dependencies, no AudioWorklet.
 *
 *   import Audio from './audio/audio.js';
 *   window.addEventListener('pointerdown', () => Audio.init());   // must come from a user gesture
 *   Audio.music('forest'); Audio.intensity(0.6); Audio.sfx('hitFlesh', { x, z });
 *
 * Layout:
 *   1. utilities
 *   2. core graph: buses, compressor, soft limiter, generated reverb, noise buffers
 *   3. voices + instruments
 *   4. sfx table
 *   5. stings
 *   6. music: themes + lookahead scheduler
 *   7. public API
 */

// ───────────────────────────── 1. utilities ─────────────────────────────

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;
const jit = (x, amt) => x * (1 + (Math.random() * 2 - 1) * amt);
const num = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
const EPS = 1e-4;

const LOOKAHEAD = 0.25; // seconds of music scheduled ahead of the audio clock
const TICK_MS = 25;
const MAX_SFX = 64; // global cap on concurrently sounding sfx voices

// linear attack → exponential decay to silence
function ad(p, t, a, pk, d) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(pk, t + a);
  p.exponentialRampToValueAtTime(EPS, t + a + d);
}

// attack → hold until `hold` → smooth release; returns the time the sound is gone
function asr(p, t, a, pk, hold, rel) {
  const h = Math.max(hold, t + a);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(pk, t + a);
  p.setValueAtTime(pk, h);
  p.setTargetAtTime(0, h, rel / 6);
  return h + rel;
}

// random impulses on a gain param (crackle, rattle, debris). bias > 1 front-loads and fades them.
function spikes(p, t, dur, n, pk, len, bias = 1) {
  const ts = [];
  for (let i = 0; i < n; i++) ts.push(t + dur * Math.pow(Math.random(), bias));
  ts.sort((a, b) => a - b);
  p.setValueAtTime(0, t);
  for (const x of ts) {
    const fade = bias > 1 ? 1 - ((x - t) / dur) * 0.75 : 1;
    p.setValueAtTime(pk * rand(0.3, 1) * fade, x);
    p.setTargetAtTime(0, x + 0.001, len * rand(0.5, 1.5));
  }
}

// cancel future automation but keep the value the param has right now
function hold(p, t) {
  if (p.cancelAndHoldAtTime) {
    try { p.cancelAndHoldAtTime(t); return; } catch (e) { /* fall back */ }
  }
  const v = p.value;
  p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
}

// ───────────────────── 2. core graph: buses, reverb, noise ─────────────────────

function makeNoise(ctx, kind) {
  const sr = ctx.sampleRate, n = Math.floor(sr * 2), m = Math.floor(sr * 0.05);
  const raw = new Float32Array(n + m);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0, mean = 0;
  for (let i = 0; i < n + m; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'p') { // Paul Kellet's pink filter
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    } else if (kind === 'b') {
      br = (br + 0.02 * w) / 1.02; raw[i] = br;
    } else raw[i] = w;
    mean += raw[i];
  }
  mean /= n + m;
  // crossfade the overhang into the head so the looped buffer has no seam click
  for (let i = 0; i < m; i++) { const a = i / m; raw[i] = raw[i] * a + raw[n + i] * (1 - a); }
  let s = 0;
  for (let i = 0; i < n; i++) { raw[i] -= mean; s += raw[i] * raw[i]; }
  const k = 0.3 / Math.sqrt(s / n || 1); // common RMS for all colours
  const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = clamp(raw[i] * k, -1, 1);
  return buf;
}

// stereo hall impulse response: early reflections + exponentially decaying, darkening noise tail
function makeIR(ctx, secs) {
  const sr = ctx.sampleRate, len = Math.floor(sr * secs), pre = Math.floor(sr * 0.012);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      lp += (Math.random() * 2 - 1 - lp) * (0.9 - 0.75 * x);
      d[i] = lp * Math.exp(-6.2 * x) * (1 - x);
    }
    for (let r = 0; r < 12; r++) {
      const i = pre + Math.floor(sr * rand(0.004, 0.085));
      if (i < len) d[i] += (chance(0.5) ? -1 : 1) * rand(0.3, 0.8) * (1 - r / 14);
    }
  }
  return buf;
}

function distCurve(k) {
  const n = 1024, c = new Float32Array(n), nk = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / nk; }
  return c;
}

// transparent below 0.8, soft knee above, hard ceiling 0.98. Input is pre-scaled by 0.5 (curve spans ±2).
function limiterCurve() {
  const n = 4096, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = ((i / (n - 1)) * 2 - 1) * 2, m = Math.abs(a);
    c[i] = Math.sign(a) * (m < 0.8 ? m : 0.8 + 0.18 * Math.tanh((m - 0.8) / 0.18));
  }
  return c;
}

function makeGraph(ctx, opt = {}) {
  const g = {
    ctx, offline: !!opt.offline, want: true, live: 0, sfxVoices: 0, queued: 0,
    themes: [], cur: null, lx: 0, lz: 0, intT: 0, intC: 0, recent: Object.create(null), lastTick: 0,
    hasPan: typeof ctx.createStereoPanner === 'function',
    vol: { master: 1, music: 0.5, sfx: 0.8 },
  };
  const gain = (v, to) => { const n = ctx.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };

  // master: sum → compressor → soft limiter → speakers
  g.masterIn = gain(g.vol.master);
  let x = g.masterIn;
  if (opt.comp !== false) {
    const c = ctx.createDynamicsCompressor();
    const set = (p, v) => { try { p.value = v; } catch (e) { /* older engines */ } };
    set(c.threshold, -10); set(c.knee, 6); set(c.ratio, 5); set(c.attack, 0.003); set(c.release, 0.22);
    x.connect(c); x = c;
  }
  if (opt.limiter !== false) {
    const pre = gain(0.5), ws = ctx.createWaveShaper();
    ws.curve = limiterCurve();
    x.connect(pre); pre.connect(ws); x = ws;
  }
  x.connect(ctx.destination);

  // one shared hall reverb (highpassed input keeps drums and drones from muddying it)
  g.revIn = gain(1);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 170; hp.Q.value = 0.5;
  const conv = ctx.createConvolver();
  conv.normalize = true;
  conv.buffer = makeIR(ctx, 3.4);
  g.revIn.connect(hp); hp.connect(conv); conv.connect(gain(0.6, g.masterIn));

  // sfx bus with a light room send; voices can add more through sfxWet
  g.sfxIn = gain(g.vol.sfx, g.masterIn);
  g.sfxIn.connect(gain(0.1, g.revIn));
  g.sfxWet = gain(g.vol.sfx, g.revIn);

  // music bus → duck (stings) → master, with a generous reverb send
  g.musicIn = gain(g.vol.music);
  g.duck = gain(1, g.masterIn);
  g.musicIn.connect(g.duck);
  g.duck.connect(gain(0.3, g.revIn));
  g.musicWet = gain(g.vol.music, g.revIn);

  g.noise = { w: makeNoise(ctx, 'w'), p: makeNoise(ctx, 'p'), b: makeNoise(ctx, 'b') };
  const curves = {};
  g.curve = (k) => curves[k] || (curves[k] = distCurve(k));
  return g;
}

// ───────────────────────── 3. voices + instruments ─────────────────────────

// Block-rate automation: filter coefficients / detune evaluated once per 128-frame block. Inaudible
// for these envelopes; spares engines that would otherwise recompute biquad coefficients per sample.
function kRate(...ps) {
  for (const p of ps) { try { if (p.automationRate === 'a-rate') p.automationRate = 'k-rate'; } catch (e) { /* unsupported */ } }
}

// A Voice owns every node of one sound. When its last source ends, all nodes are disconnected.
class Voice {
  constructor(g, dest, vol = 1, pan = 0, owner = null) {
    this.g = g; this.c = g.ctx; this.ns = []; this.ss = []; this.n = 0;
    this.dead = false; this.owner = owner; this.wetTo = null; this.sfx = false;
    this.out = this.G(vol);
    const p = pan ? this.Pn(pan) : null;
    if (p) { this.out.connect(p); p.connect(dest); } else this.out.connect(dest);
    if (owner) owner.voices.add(this);
  }
  G(v = 0) { const n = this.c.createGain(); n.gain.value = v; this.ns.push(n); return n; }
  F(type, f, q = 1) {
    const n = this.c.createBiquadFilter();
    n.type = type; n.frequency.value = f; n.Q.value = q;
    kRate(n.frequency, n.Q, n.detune, n.gain);
    this.ns.push(n); return n;
  }
  Pn(p) {
    if (!this.g.hasPan) return null;
    const n = this.c.createStereoPanner(); n.pan.value = clamp(p, -1, 1);
    this.ns.push(n); return n;
  }
  W(k) { const n = this.c.createWaveShaper(); n.curve = this.g.curve(k); this.ns.push(n); return n; }
  O(type, f, t0, t1) {
    const o = this.c.createOscillator(); o.type = type; o.frequency.value = f;
    kRate(o.detune);
    this.ns.push(o); this._run(o, t0, t1); return o;
  }
  N(kind, t0, t1, rate = 1) {
    const s = this.c.createBufferSource();
    s.buffer = this.g.noise[kind]; s.loop = true; s.playbackRate.value = rate;
    this.ns.push(s); this._run(s, t0, t1, Math.random() * 1.8); return s;
  }
  _run(s, t0, t1, off) {
    s.onended = () => this._end();
    if (off !== undefined) s.start(t0, off); else s.start(t0);
    s.stop(Math.max(t1, t0 + 0.01));
    this.n++; this.g.live++; this.ss.push(s);
  }
  _end() { this.g.live--; if (--this.n <= 0) this.free(); }
  free() {
    if (this.dead) return;
    this.dead = true;
    for (const n of this.ns) { try { n.disconnect(); } catch (e) { /* already gone */ } }
    this.ns = this.ss = [];
    if (this.owner) this.owner.voices.delete(this);
    if (this.sfx) this.g.sfxVoices--;
  }
  kill(t) { for (const s of this.ss) { try { s.stop(t); } catch (e) { /* not started */ } } }
  send(dest, amt) { const s = this.G(amt); this.out.connect(s); s.connect(dest); return s; }
  wet(amt) { if (this.wetTo && amt > 0) this.send(this.wetTo, amt); }
}

// noise burst through a filter.
// o: k ('w'|'p'|'b'), ft filter type, f start Hz, fp Hz at peak, fe Hz at end, q, a attack, pk peak, d decay,
//    rate, drive, am [Hz, depth], to
function nb(v, t, o) {
  const a = o.a ?? 0.003, d = o.d ?? 0.1, end = t + a + d;
  const s = v.N(o.k || 'w', t, end + 0.02, o.rate || 1);
  const f = v.F(o.ft || 'bandpass', o.f, o.q ?? 1);
  if (o.fp || o.fe) {
    f.frequency.setValueAtTime(o.f, t);
    if (o.fp) f.frequency.exponentialRampToValueAtTime(o.fp, t + a);
    if (o.fe) f.frequency.exponentialRampToValueAtTime(o.fe, end);
  }
  let x = f;
  s.connect(f);
  if (o.drive) { const w = v.W(o.drive); x.connect(w); x = w; }
  if (o.am) {
    const am = v.G(1 - o.am[1]), lfo = v.O('sine', o.am[0], t, end + 0.02), lg = v.G(o.am[1]);
    lfo.connect(lg); lg.connect(am.gain); x.connect(am); x = am;
  }
  const e = v.G(0);
  ad(e.gain, t, a, o.pk ?? 1, d);
  x.connect(e); e.connect(o.to || v.out);
  return e;
}

// oscillator blip/sweep. o: w wave, f, fe end Hz, sw sweep time, a, pk, d, det cents, lp Hz, drive, to
function tn(v, t, o) {
  const a = o.a ?? 0.002, d = o.d ?? 0.1, end = t + a + d;
  const os = v.O(o.w || 'sine', o.f, t, end + 0.02);
  if (o.det) os.detune.value = o.det;
  if (o.fe) {
    os.frequency.setValueAtTime(o.f, t);
    os.frequency.exponentialRampToValueAtTime(o.fe, t + (o.sw ?? a + d));
  }
  let x = os;
  if (o.lp) { const f = v.F('lowpass', o.lp, 0.7); x.connect(f); x = f; }
  if (o.drive) { const w = v.W(o.drive); x.connect(w); x = w; }
  const e = v.G(0);
  ad(e.gain, t, a, o.pk ?? 1, d);
  x.connect(e); e.connect(o.to || v.out);
  return os;
}

// inharmonic struck-metal partials
function metal(v, t, f, ratios, d, pk, to) {
  ratios.forEach((r, k) => {
    const fr = f * r * jit(1, 0.01);
    if (fr < 16000) tn(v, t, { f: fr, a: 0.001, pk: pk / (1 + k * 0.6), d: d / (1 + k * 0.35), to });
  });
}

const VOW = {
  a: [[730, 1, 6], [1090, 0.5, 8], [2440, 0.25, 10]],
  o: [[570, 1, 6], [840, 0.45, 8], [2410, 0.18, 10]],
  u: [[300, 1, 5], [870, 0.3, 7], [2240, 0.1, 9]],
  e: [[530, 1, 6], [1840, 0.45, 9], [2480, 0.3, 10]],
  i: [[270, 1, 5], [2290, 0.5, 9], [3010, 0.35, 10]],
};

// parallel formant bank src → dest; optionally morphs towards vowel `to` over [t, t+mt]
function formant(v, src, dest, vow, gain = 1, fs = 1, to = null, t = 0, mt = 0.1) {
  VOW[vow].forEach(([f, a, q], i) => {
    const bp = v.F('bandpass', f * fs, q), g = v.G(a * gain);
    if (to) {
      bp.frequency.setValueAtTime(f * fs, t);
      bp.frequency.linearRampToValueAtTime(VOW[to][i][0] * fs, t + mt);
    }
    src.connect(bp); bp.connect(g); g.connect(dest);
  });
}

// vocal-ish source: detuned saws with a pitch contour → growl AM → drive → formants → envelope.
// o: f, d, c [[dt, ratio]...], vow, to, mt, vib [Hz, cents], growl [Hz, depth], drive, breath, pk, fg, fs, a, hold, n, w
function vox(v, t, o) {
  const d = o.d, end = t + d + 0.05, f = o.f, sum = v.G(1);
  let lg = null;
  if (o.vib) { const lfo = v.O('sine', o.vib[0], t, end); lg = v.G(o.vib[1]); lfo.connect(lg); }
  for (let k = 0; k < (o.n || 2); k++) {
    const os = v.O(o.w || 'sawtooth', f, t, end);
    os.detune.value = k * 13;
    const q = os.frequency;
    q.setValueAtTime(f * o.c[0][1], t);
    for (const [dt, r] of o.c) q.linearRampToValueAtTime(f * r, t + dt);
    if (lg) lg.connect(os.detune);
    os.connect(sum);
  }
  if (o.breath) { const nz = v.N('p', t, end), ng = v.G(o.breath); nz.connect(ng); ng.connect(sum); }
  let x = sum;
  if (o.growl) {
    const am = v.G(1 - o.growl[1]), gl = v.O('square', o.growl[0], t, end), gg = v.G(o.growl[1]);
    gl.connect(gg); gg.connect(am.gain); x.connect(am); x = am;
  }
  if (o.drive) { const w = v.W(o.drive); x.connect(w); x = w; }
  const e = v.G(0);
  formant(v, x, e, o.vow, o.fg ?? 3, o.fs ?? 1, o.to, t, o.mt ?? 0.12);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(o.pk, t + (o.a ?? 0.03));
  e.gain.setValueAtTime(o.pk, t + Math.max(d * (o.hold ?? 0.6), (o.a ?? 0.03) + 0.01));
  e.gain.exponentialRampToValueAtTime(EPS, t + d);
  e.connect(v.out);
  return e;
}

// low layered roar (trolls, bosses)
function roar(v, t, f, d, pk, drive) {
  const end = t + d + 0.05, lp = v.F('lowpass', 300, 2), am = v.G(0.65), w = v.W(drive), e = v.G(0);
  [['sawtooth', f, 0], ['sawtooth', f, 15], ['square', f / 2, 0]].forEach(([type, fr, det]) => {
    const o = v.O(type, fr, t, end);
    o.detune.value = det;
    o.frequency.setValueAtTime(fr * 0.9, t);
    o.frequency.linearRampToValueAtTime(fr * 1.12, t + d * 0.22);
    o.frequency.linearRampToValueAtTime(fr * 0.78, t + d);
    o.connect(lp);
  });
  lp.frequency.setValueAtTime(250, t);
  lp.frequency.linearRampToValueAtTime(1100, t + d * 0.22);
  lp.frequency.linearRampToValueAtTime(350, t + d);
  const gl = v.O('sine', rand(15, 19), t, end), gg = v.G(0.35);
  gl.connect(gg); gg.connect(am.gain);
  const pre = v.G(0.6);
  lp.connect(pre); pre.connect(w); w.connect(am); am.connect(e);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(pk, t + 0.12);
  e.gain.setValueAtTime(pk, t + d * 0.55);
  e.gain.exponentialRampToValueAtTime(EPS, t + d);
  e.connect(v.out);
  nb(v, t, { k: 'b', f: 450, q: 0.9, a: 0.12, pk: pk * 0.8, d: d - 0.12, drive: 3 });
}

// Instruments. Each takes a Voice and schedules at absolute time t. Notes are MIDI numbers.
const INS = {
  // detuned-saw string section, slow filter movement, stereo spread
  strings(v, t, notes, dur, o = {}) {
    const vel = o.vel ?? 0.3, att = o.att ?? 1.5, rel = o.rel ?? 2, cut = o.cut ?? 1000;
    const lp = v.F('lowpass', cut, 0.5), e = v.G(0);
    const end = asr(e.gain, t, att, (vel * 1.1) / Math.sqrt(notes.length * 3), t + dur, rel);
    lp.frequency.setValueAtTime(cut * 0.7, t);
    lp.frequency.linearRampToValueAtTime(cut * rand(1.05, 1.35), t + att + dur * 0.4);
    lp.frequency.linearRampToValueAtTime(cut * 0.65, end);
    const L = v.Pn(-0.55), R = v.Pn(0.55);
    if (L) { L.connect(lp); R.connect(lp); }
    for (const m of notes) {
      const f = mf(m);
      for (let k = 0; k < 3; k++) {
        const os = v.O('sawtooth', f, t, end + 0.05);
        os.detune.value = (k - 1) * rand(6, 11) + rand(-2, 2);
        os.connect(k === 0 && L ? L : k === 2 && R ? R : lp);
      }
    }
    lp.connect(e); e.connect(o.to || v.out);
    if (o.wet) v.wet(o.wet);
  },

  // "aah" choir: saws with shared vibrato + breath through a formant bank
  choir(v, t, notes, dur, o = {}) {
    const vel = o.vel ?? 0.25, att = o.att ?? 1.2, rel = o.rel ?? 1.8;
    const sum = v.G(1), e = v.G(0);
    const end = asr(e.gain, t, att, (vel * 4.4) / Math.sqrt(notes.length * 2), t + dur, rel);
    const lfo = v.O('sine', rand(4.6, 5.6), t, end + 0.05), lg = v.G(o.vib ?? 14);
    lfo.connect(lg);
    for (const m of notes) {
      for (let k = 0; k < 2; k++) {
        const os = v.O('sawtooth', mf(m), t, end + 0.05);
        os.detune.value = k ? rand(4, 9) : -rand(4, 9);
        lg.connect(os.detune); os.connect(sum);
      }
    }
    const nz = v.N('p', t, end + 0.05), ng = v.G(0.12);
    nz.connect(ng); ng.connect(sum);
    formant(v, sum, e, o.vowel || 'a', 1, o.fs || 1);
    e.connect(o.to || v.out);
    if (o.wet) v.wet(o.wet);
  },

  // harp / lute: triangle body + filtered saw with closing filter
  pluck(v, t, m, o = {}) {
    const f = mf(m), vel = (o.vel ?? 0.2) * 1.4, dec = o.dec ?? 1.5, br = o.bright ?? 5, end = t + dec + 0.05;
    const e = v.G(0);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(vel, t + 0.004);
    e.gain.exponentialRampToValueAtTime(EPS, t + dec);
    const tri = v.O('triangle', f, t, end);
    tri.connect(e);
    const saw = v.O('sawtooth', f * 1.003, t, end), lp = v.F('lowpass', Math.min(f * br, 14000), 1.5), sg = v.G(o.saw ?? 0.35);
    lp.frequency.setValueAtTime(Math.min(f * br, 14000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + dec * 0.35);
    saw.connect(lp); lp.connect(sg); sg.connect(e);
    e.connect(o.to || v.out);
    if (o.wet) v.wet(o.wet);
  },

  // sub drone: root + octave, slow breathing filter
  drone(v, t, m, dur, o = {}) {
    const f = mf(m), vel = o.vel ?? 0.15, e = v.G(0), lp = v.F('lowpass', o.cut ?? 380, 0.7);
    const end = asr(e.gain, t, o.att ?? 3, vel, t + dur, o.rel ?? 3) + 0.05;
    const a = v.O('sine', f, t, end), b = v.O('triangle', f * 2, t, end), c = v.O('sine', f * 2, t, end);
    b.detune.value = 5; c.detune.value = -4;
    const bg = v.G(0.35), cg = v.G(0.25);
    a.connect(lp); b.connect(bg); bg.connect(lp); c.connect(cg); cg.connect(lp);
    const lfo = v.O('sine', rand(0.06, 0.12), t, end), lg = v.G(120);
    lfo.connect(lg); lg.connect(lp.frequency);
    lp.connect(e); e.connect(o.to || v.out);
  },

  // church-bell style inharmonic partials with long decays
  bell(v, t, m, o = {}) {
    const f = mf(m), vel = o.vel ?? 0.1, dec = o.dec ?? 4;
    const P = [[0.5, 0.5, 1], [1, 1, 0.8], [1.19, 0.45, 0.6], [1.5, 0.3, 0.5], [2, 0.55, 0.45], [2.74, 0.22, 0.3], [3.76, 0.12, 0.2], [5.4, 0.06, 0.12]];
    for (const [r, a, k] of P) {
      if (f * r < 15000) tn(v, t, { f: f * r, det: rand(-3, 3), a: 0.002, pk: vel * a, d: dec * k, to: o.to });
    }
    if (o.wet) v.wet(o.wet);
  },

  // breathy flute line: one oscillator pair for the whole phrase, legato glides, delayed vibrato.
  // seq: [[midi, start, dur], ...] absolute times.
  flute(v, seq, o = {}) {
    if (!seq.length) return;
    const vel = (o.vel ?? 0.12) * 2, t = seq[0][1], last = seq[seq.length - 1], end = last[1] + last[2] + 0.5;
    const f0 = mf(seq[0][0]);
    const a = v.O('triangle', f0, t, end), b = v.O('sine', f0 * 2, t, end);
    const lfo = v.O('sine', rand(4.8, 5.6), t, end), lg = v.G(0);
    lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    const bg = v.G(0.1), e = v.G(0);
    a.connect(e); b.connect(bg); bg.connect(e);
    const nz = v.N('w', t, end), bp = v.F('bandpass', f0 * 1.5, 1.5), ng = v.G(0.05);
    nz.connect(bp); bp.connect(ng); ng.connect(e);
    e.gain.setValueAtTime(0, t);
    let pe = -1;
    for (let i = 0; i < seq.length; i++) {
      const [m, s, d] = seq[i], f = mf(m), leg = s - pe < 0.06;
      if (leg) {
        a.frequency.setTargetAtTime(f, s - 0.015, 0.02);
        b.frequency.setTargetAtTime(f * 2, s - 0.015, 0.02);
      } else {
        a.frequency.setValueAtTime(f, s);
        b.frequency.setValueAtTime(f * 2, s);
      }
      bp.frequency.setValueAtTime(f * 1.5, s);
      e.gain.setTargetAtTime(vel, s, leg ? 0.03 : 0.045);
      lg.gain.setValueAtTime(0, s);
      lg.gain.linearRampToValueAtTime(d > 0.5 ? 16 : 5, s + Math.min(d, 0.7));
      const next = seq[i + 1], ne = s + d;
      if (next && next[1] - ne < 0.06) e.gain.setTargetAtTime(vel * 0.72, ne - 0.05, 0.02);
      else e.gain.setTargetAtTime(0, ne - 0.02, 0.07);
      pe = ne;
    }
    e.connect(o.to || v.out);
    if (o.wet) v.wet(o.wet);
  },

  // swelling filtered-noise "whisper" that drifts across the stereo field
  whisper(v, t, dur, o = {}) {
    const s = v.N('p', t, t + dur + 0.1), bp = v.F('bandpass', 500, 4), bp2 = v.F('bandpass', 1500, 6), e = v.G(0);
    for (const [f, r] of [[bp, 1], [bp2, 2.6]]) {
      f.frequency.setValueAtTime(rand(300, 600) * r, t);
      f.frequency.exponentialRampToValueAtTime(rand(900, 1800) * r, t + dur * 0.5);
      f.frequency.exponentialRampToValueAtTime(rand(400, 700) * r, t + dur);
    }
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime((o.vel ?? 0.1) * 9, t + dur * 0.45);
    e.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp); s.connect(bp2); bp.connect(e); bp2.connect(e);
    let x = e;
    const pn = v.Pn(rand(-0.7, 0.7));
    if (pn) { pn.pan.setValueAtTime(pn.pan.value, t); pn.pan.linearRampToValueAtTime(rand(-0.7, 0.7), t + dur); e.connect(pn); x = pn; }
    x.connect(o.to || v.out);
    if (o.wet) v.wet(o.wet);
  },

  // taiko-like war drum: sine with fast pitch drop + skin noise
  taiko(v, t, vel, o = {}) {
    const f0 = jit(o.f ?? 110, 0.04), dec = o.dec ?? 0.8, to = o.to || v.out;
    const os = v.O('sine', f0, t, t + dec + 0.05), e = v.G(0);
    os.frequency.setValueAtTime(f0, t);
    os.frequency.exponentialRampToValueAtTime(o.f1 ?? 45, t + 0.22);
    ad(e.gain, t, 0.004, vel, dec);
    os.connect(e); e.connect(to);
    const nz = v.N('p', t, t + 0.2), lp = v.F('lowpass', 900, 0.8), ne = v.G(0);
    ad(ne.gain, t, 0.002, vel * 0.6, 0.12);
    nz.connect(lp); lp.connect(ne); ne.connect(to);
  },

  tom(v, t, vel, o = {}) {
    const f = jit(o.f ?? 190, 0.03), to = o.to || v.out;
    tn(v, t, { f, fe: f * 0.55, sw: 0.25, a: 0.003, pk: vel, d: 0.4, to });
    nb(v, t, { k: 'w', f: 1100, q: 1, a: 0.001, pk: vel * 0.4, d: 0.05, to });
  },

  rim(v, t, vel, o = {}) {
    const to = o.to || v.out;
    tn(v, t, { w: 'triangle', f: jit(1250, 0.03), a: 0.001, pk: vel, d: 0.04, to });
    nb(v, t, { k: 'w', ft: 'highpass', f: 3000, q: 0.7, a: 0.001, pk: vel * 0.6, d: 0.025, to });
  },

  // staccato low string ostinato note
  ost(v, t, m, d, vel, o = {}) {
    const f = mf(m), end = t + d + 0.15;
    const a = v.O('sawtooth', f, t, end), b = v.O('sawtooth', f * 1.005, t, end);
    const lp = v.F('lowpass', f * 8, 2.5), e = v.G(0);
    lp.frequency.setValueAtTime(Math.min(f * (o.br ?? 9), 8000), t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.8, t + d);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(vel, t + 0.006);
    e.gain.setTargetAtTime(vel * 0.55, t + 0.03, d * 0.4);
    e.gain.setTargetAtTime(0, t + d * 0.85, 0.025);
    a.connect(lp); b.connect(lp); lp.connect(e); e.connect(o.to || v.out);
  },

  // brass-like power chords: saws through a lowpass with a filter envelope, optional drive
  brass(v, t, notes, dur, o = {}) {
    const vel = o.vel ?? 0.25, att = o.att ?? 0.05, rel = o.rel ?? 0.3, br = o.bright ?? 2600;
    const h = t + Math.max(dur, att + 0.1), end = h + rel;
    const lp = v.F('lowpass', 300, 1.2), pre = v.G(0.7 / Math.sqrt(notes.length * 2)), e = v.G(0);
    lp.frequency.setValueAtTime(250, t);
    lp.frequency.linearRampToValueAtTime(br, t + att + 0.06);
    lp.frequency.setTargetAtTime(br * 0.5, t + att + 0.06, 0.25);
    lp.frequency.setTargetAtTime(300, h, rel / 3);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(vel, t + att);
    e.gain.setTargetAtTime(vel * 0.75, t + att, 0.2);
    e.gain.setTargetAtTime(0, h, rel / 5);
    for (const m of notes) {
      for (const det of [-6, 6]) {
        const os = v.O('sawtooth', mf(m), t, end + 0.05);
        os.detune.value = det + rand(-2, 2);
        os.connect(lp);
      }
    }
    lp.connect(pre);
    let x = pre;
    if (o.drive) { const w = v.W(o.drive); x.connect(w); x = w; }
    x.connect(e); e.connect(o.to || v.out);
    if (o.wet) v.wet(o.wet);
  },
};

// ───────────────────────────── 4. sfx table ─────────────────────────────
// Each entry: (voice, startTime, pitch-with-jitter, pitch-as-requested). Tonal/musical ones use the
// un-jittered pitch so they stay in tune with the score.

const SFX = {
  // ── combat ──
  swing(v, t, p) {
    nb(v, t, { k: 'w', f: 450 * p, fp: 2300 * p, fe: 800 * p, q: 1.3, a: 0.07, pk: 0.6, d: 0.16 });
  },
  swingHeavy(v, t, p) {
    nb(v, t, { k: 'p', f: 200 * p, fp: 1100 * p, fe: 300 * p, q: 1, a: 0.13, pk: 1, d: 0.27 });
    tn(v, t, { f: 90 * p, fe: 50 * p, a: 0.1, pk: 0.3, d: 0.25 });
  },
  hitFlesh(v, t, p) {
    tn(v, t, { f: 150 * p, fe: 48 * p, sw: 0.12, pk: 0.9, d: 0.18 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 2400 * p, fe: 300, q: 0.7, pk: 0.8, d: 0.1 });
    nb(v, t + 0.004, { k: 'w', f: 1000 * p * rand(0.8, 1.2), q: 1.6, a: 0.001, pk: 0.45, d: 0.05, drive: 8 });
  },
  hitBone(v, t, p) {
    nb(v, t, { k: 'w', f: 2600 * p, q: 4, a: 0.001, pk: 0.9, d: 0.03 });
    nb(v, t + rand(0.012, 0.02), { k: 'w', f: 1700 * p, q: 5, a: 0.001, pk: 0.6, d: 0.035 });
    tn(v, t, { w: 'triangle', f: 720 * p, fe: 380 * p, pk: 0.4, d: 0.045 });
  },
  hitMetal(v, t, p) {
    metal(v, t, 540 * p * rand(0.9, 1.1), [1, 2.76, 5.4, 8.93, 13.3], 0.45, 0.32);
    nb(v, t, { k: 'w', ft: 'highpass', f: 3000, q: 0.7, a: 0.001, pk: 0.5, d: 0.025 });
    tn(v, t, { f: 180 * p, fe: 90 * p, pk: 0.35, d: 0.07 });
    v.wet(0.15);
  },
  hitSpirit(v, t, p) {
    nb(v, t, { k: 'w', f: 3200 * p, fe: 1100 * p, q: 2, a: 0.02, pk: 0.5, d: 0.35 });
    const f = 880 * p * rand(0.95, 1.05);
    tn(v, t, { f, fe: f * 0.85, a: 0.01, pk: 0.14, d: 0.45 });
    tn(v, t, { f: f * 1.013, fe: f * 0.86, a: 0.01, pk: 0.14, d: 0.45 });
    tn(v, t, { f: f * 1.5, fe: f * 1.3, a: 0.02, pk: 0.06, d: 0.35 });
    v.wet(0.5);
  },
  hitChitin(v, t, p) {
    const s = v.N('w', t, t + 0.15), bp = v.F('bandpass', 1300 * p, 1.2), w = v.W(12), e = v.G(0);
    spikes(e.gain, t, 0.07, 6, 0.6, 0.012);
    s.connect(bp); bp.connect(w); w.connect(e); e.connect(v.out);
    tn(v, t, { f: 120 * p, fe: 60 * p, pk: 0.6, d: 0.1 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 900 * p, fe: 400, q: 4, pk: 0.4, d: 0.12 });
  },
  block(v, t, p) {
    tn(v, t, { f: 190 * p, fe: 90 * p, pk: 0.7, d: 0.12 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 1000 * p, q: 0.8, pk: 0.6, d: 0.07 });
    metal(v, t + 0.006, 760 * p, [1, 2.41, 3.93, 6.1], 0.22, 0.2);
  },
  crit(v, t, p) {
    nb(v, t, { k: 'w', ft: 'highpass', f: 3500, q: 0.7, a: 0.0005, pk: 0.8, d: 0.04, drive: 4 });
    tn(v, t, { w: 'square', f: 2400 * p, fe: 1100 * p, pk: 0.1, d: 0.04 });
    tn(v, t, { f: 3200 * p, fe: 1900 * p, sw: 0.18, pk: 0.12, d: 0.22 });
    tn(v, t, { f: 80 * p, fe: 40 * p, pk: 0.6, d: 0.12 });
  },
  arrowShoot(v, t, p) {
    tn(v, t, { w: 'triangle', f: 230 * p, fe: 160 * p, sw: 0.06, pk: 0.4, d: 0.16, lp: 1800 });
    tn(v, t, { w: 'sawtooth', f: 115 * p, fe: 85 * p, pk: 0.12, d: 0.08, lp: 1200 });
    nb(v, t + 0.01, { k: 'w', f: 2000 * p, fp: 3600 * p, fe: 1500, q: 1.5, a: 0.03, pk: 0.3, d: 0.12 });
  },
  arrowHit(v, t, p) {
    tn(v, t, { f: 320 * p, fe: 110 * p, sw: 0.05, pk: 0.7, d: 0.07 });
    nb(v, t, { k: 'w', f: 1300 * p, q: 1.5, pk: 0.4, d: 0.04 });
    tn(v, t, { w: 'triangle', f: 560 * p, pk: 0.2, d: 0.05 });
  },
  arcaneBolt(v, t, p) {
    tn(v, t, { w: 'sawtooth', f: 1400 * p, fe: 300 * p, sw: 0.2, pk: 0.14, d: 0.2, lp: 3000 });
    for (let k = 0; k < 4; k++) tn(v, t + k * 0.03 + rand(0, 0.02), { f: rand(2000, 5000) * p, pk: 0.09, d: 0.06 });
    nb(v, t, { k: 'w', ft: 'highpass', f: 5000, q: 0.7, a: 0.01, pk: 0.15, d: 0.15 });
    v.wet(0.3);
  },
  fireball(v, t, p) {
    nb(v, t, { k: 'p', ft: 'lowpass', f: 400 * p, fp: 2600 * p, fe: 700 * p, q: 1.2, a: 0.12, pk: 0.8, d: 0.4 });
    nb(v, t, { k: 'b', ft: 'lowpass', f: 500 * p, q: 1, a: 0.06, pk: 0.8, d: 0.5, drive: 5 });
    tn(v, t, { f: 85 * p, fe: 45, pk: 0.4, d: 0.25 });
    v.wet(0.25);
  },
  explosion(v, t, p) {
    tn(v, t, { f: 95 * p, fe: 28, sw: 0.6, pk: 1, d: 1 });
    nb(v, t, { k: 'w', ft: 'lowpass', f: 4000 * p, fe: 250, q: 0.7, pk: 0.8, d: 0.6, drive: 3 });
    nb(v, t + 0.02, { k: 'b', ft: 'lowpass', f: 260 * p, q: 0.8, a: 0.04, pk: 1, d: 1.9 });
    v.wet(0.55);
  },
  frost(v, t, p) {
    const F = [2093, 2637, 3136, 3951, 4699, 5274];
    for (let k = 0; k < 5; k++) tn(v, t + k * 0.022 + rand(0, 0.01), { f: pick(F) * p, pk: 0.09, d: rand(0.35, 0.6) });
    nb(v, t, { k: 'w', ft: 'highpass', f: 3500, q: 1, a: 0.001, pk: 0.6, d: 0.03 });
    nb(v, t + 0.015, { k: 'w', f: 6500 * p, q: 1.2, a: 0.02, pk: 0.22, d: 0.3 });
    v.wet(0.4);
  },
  lightning(v, t, p) {
    const s = v.N('w', t, t + 0.45), w = v.W(20), bp = v.F('bandpass', 2600 * p, 0.6), e = v.G(0);
    spikes(e.gain, t, 0.35, 26, 0.5, 0.012);
    s.connect(w); w.connect(bp); bp.connect(e); e.connect(v.out);
    tn(v, t, { w: 'sawtooth', f: 62 * p, pk: 0.25, d: 0.3, drive: 6, lp: 1600 });
    nb(v, t, { k: 'w', ft: 'highpass', f: 2500, q: 0.7, a: 0.0005, pk: 0.9, d: 0.03 });
    nb(v, t + 0.05, { k: 'b', ft: 'lowpass', f: 320, q: 0.7, a: 0.1, pk: 0.6, d: 1.2 });
    v.wet(0.4);
  },
  meteorFall(v, t, p) {
    nb(v, t, { k: 'p', f: 3000 * p, fe: 280 * p, q: 1.6, a: 0.7, pk: 0.8, d: 0.12 });
    tn(v, t, { f: 1000 * p, fe: 140 * p, a: 0.6, pk: 0.08, d: 0.2 });
    nb(v, t + 0.2, { k: 'b', ft: 'lowpass', f: 300, fe: 600, q: 1, a: 0.55, pk: 0.5, d: 0.1, drive: 3 });
  },
  whirlwind(v, t, p) {
    const dur = 0.7, end = t + dur + 0.05;
    const s = v.N('p', t, end), bp = v.F('bandpass', 900 * p, 1.3), am = v.G(0.5), e = v.G(0);
    const lfo = v.O('sine', 8.5 * p, t, end), lg = v.G(0.5), lf = v.G(500 * p);
    lfo.connect(lg); lg.connect(am.gain); lfo.connect(lf); lf.connect(bp.frequency);
    s.connect(bp); bp.connect(am); am.connect(e);
    let x = e;
    const pn = v.Pn(0.001);
    if (pn) { const lp = v.G(0.6); lfo.connect(lp); lp.connect(pn.pan); e.connect(pn); x = pn; }
    x.connect(v.out);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(1, t + 0.12);
    e.gain.setValueAtTime(1, t + dur - 0.2);
    e.gain.linearRampToValueAtTime(0, t + dur);
  },
  leap(v, t, p) {
    nb(v, t, { k: 'p', f: 350 * p, fp: 1500 * p, fe: 900 * p, q: 1.1, a: 0.12, pk: 0.6, d: 0.18 });
    tn(v, t, { f: 120 * p, fe: 180 * p, a: 0.05, pk: 0.15, d: 0.15 });
  },
  slam(v, t, p) {
    tn(v, t, { f: 75 * p, fe: 28, sw: 0.4, pk: 1, d: 0.7 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 1400 * p, fe: 200, q: 0.8, pk: 0.9, d: 0.16, drive: 2 });
    const s = v.N('w', t + 0.03, t + 0.7), bp = v.F('bandpass', 2500 * p, 1.5), e = v.G(0);
    spikes(e.gain, t + 0.03, 0.5, 14, 0.35, 0.015, 1.6);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    v.wet(0.35);
  },
  warcry(v, t, p) {
    vox(v, t, {
      f: 140 * p, d: 0.85, c: [[0, 0.85], [0.15, 1.2], [0.55, 1.1], [0.85, 0.8]], vow: 'o', to: 'a', mt: 0.12,
      vib: [6, 25], drive: 3, breath: 0.25, pk: 0.75, fg: 3.5, a: 0.05, hold: 0.7,
    });
    v.wet(0.4);
  },
  roll(v, t, p) {
    nb(v, t, { k: 'p', f: 300 * p, fp: 900 * p, fe: 350 * p, q: 0.8, a: 0.1, pk: 0.45, d: 0.22 });
    nb(v, t + 0.05, { k: 'w', ft: 'highpass', f: 3000, q: 0.5, a: 0.05, pk: 0.06, d: 0.15 });
  },
  blink(v, t, p) {
    const d = 0.26, s = v.N('w', t, t + d + 0.02), bp = v.F('bandpass', 700 * p, 2), e = v.G(0);
    bp.frequency.setValueAtTime(700 * p, t);
    bp.frequency.exponentialRampToValueAtTime(4500 * p, t + d);
    e.gain.setValueAtTime(0.002, t);
    e.gain.exponentialRampToValueAtTime(0.6, t + d);
    e.gain.linearRampToValueAtTime(0, t + d + 0.01);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    tn(v, t, { f: 300 * p, fe: 1500 * p, a: d, pk: 0.15, d: 0.01 });
    tn(v, t + d, { f: 1100 * p, fe: 180 * p, sw: 0.04, pk: 0.5, d: 0.06 });
    v.wet(0.3);
  },
  trap(v, t, p) {
    nb(v, t, { k: 'w', ft: 'highpass', f: 2200, q: 0.7, a: 0.0005, pk: 0.8, d: 0.02 });
    metal(v, t, 1350 * p, [1, 2.3, 3.7, 5.2], 0.14, 0.25);
    tn(v, t, { f: 220 * p, fe: 80 * p, pk: 0.5, d: 0.07 });
  },
  summon(v, t, p, pp) {
    const base = 220 * pp;
    [1, 1.189, 1.498].forEach((r, k) => tn(v, t + k * 0.05, { w: 'triangle', f: base * r, fe: base * r * 2, sw: 0.9, a: 0.5, pk: 0.12, d: 0.6 }));
    nb(v, t, { k: 'p', f: 300 * p, fe: 3000 * p, q: 2, a: 0.7, pk: 0.4, d: 0.4 });
    v.wet(0.6);
  },
  potion(v, t, p, pp) {
    for (let k = 0; k < 3; k++) {
      const f = rand(180, 260) * p;
      tn(v, t + k * 0.09 + rand(0, 0.02), { f, fe: f * 2.8, sw: 0.05, a: 0.005, pk: 0.4, d: 0.06, lp: 1200 });
    }
    tn(v, t + 0.3, { f: 2637 * pp, pk: 0.07, d: 0.3 });
    tn(v, t + 0.34, { f: 3520 * pp, pk: 0.06, d: 0.3 });
  },
  heal(v, t, p, pp) {
    [74, 78, 81, 86].forEach((m, k) => {
      tn(v, t + k * 0.045, { f: mf(m) * pp, a: 0.012, pk: 0.13, d: 1.2 });
      tn(v, t + k * 0.045, { w: 'triangle', f: mf(m) * pp * 2, a: 0.012, pk: 0.025, d: 0.6 });
    });
    v.wet(0.5);
  },

  // ── loot / ui ──
  gold(v, t, p) {
    const n = 2 + ((Math.random() * 3) | 0), end = t + n * 0.07 + 0.15;
    const a = v.O('sine', 3000, t, end), b = v.O('sine', 3000, t, end), bg = v.G(0.5), e = v.G(0);
    a.connect(e); b.connect(bg); bg.connect(e); e.connect(v.out);
    e.gain.setValueAtTime(0, t);
    let x = t;
    for (let k = 0; k < n; k++) {
      const f = rand(2600, 4200) * p;
      a.frequency.setValueAtTime(f, x);
      b.frequency.setValueAtTime(f * 2.76, x);
      e.gain.setValueAtTime(rand(0.12, 0.2), x);
      e.gain.setTargetAtTime(0, x + 0.002, 0.025);
      x += rand(0.035, 0.07);
    }
  },
  itemDrop(v, t, p) {
    tn(v, t, { f: 170 * p, fe: 80 * p, pk: 0.5, d: 0.1 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 700 * p, q: 0.8, pk: 0.4, d: 0.06 });
  },
  itemDropRare(v, t, p, pp) {
    SFX.itemDrop(v, t, p);
    [88, 95].forEach((m, k) => tn(v, t + 0.04 + k * 0.06, { f: mf(m) * pp, pk: 0.1, d: 0.7 }));
    v.wet(0.35);
  },
  itemDropLegendary(v, t, p, pp) {
    SFX.itemDrop(v, t, p);
    tn(v, t, { f: 55, fe: 75, sw: 1, a: 0.3, pk: 0.3, d: 0.9 });
    [74, 78, 81, 86, 90, 93, 98].forEach((m, k) => {
      tn(v, t + 0.08 + k * 0.075, { f: mf(m) * pp, a: 0.004, pk: 0.11, d: 0.9 - k * 0.05 });
      tn(v, t + 0.08 + k * 0.075, { f: mf(m) * pp * 2, a: 0.004, pk: 0.025, d: 0.4 });
    });
    [62, 69, 74, 78].forEach((m) => tn(v, t + 0.1, { w: 'triangle', f: mf(m) * pp, det: rand(-8, 8), a: 0.6, pk: 0.06, d: 0.8 }));
    const s = v.N('w', t + 0.1, t + 1.4), hp = v.F('highpass', 6000, 0.7), e = v.G(0);
    spikes(e.gain, t + 0.1, 1.1, 30, 0.2, 0.02);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    v.wet(0.6);
  },
  pickup(v, t, p) {
    tn(v, t, { f: 1250 * p, fe: 1900 * p, sw: 0.03, pk: 0.22, d: 0.08 });
    tn(v, t + 0.035, { w: 'triangle', f: 2500 * p, pk: 0.07, d: 0.07 });
  },
  equip(v, t, p) {
    const s = v.N('w', t, t + 0.18), bp = v.F('bandpass', 1500 * p, 1.2), e = v.G(0);
    spikes(e.gain, t, 0.12, 7, 0.35, 0.015);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    metal(v, t + 0.07, 900 * p, [1, 2.6, 4.1], 0.12, 0.15);
    tn(v, t + 0.065, { f: 200 * p, fe: 120 * p, pk: 0.25, d: 0.05 });
  },
  click(v, t, p) {
    tn(v, t, { w: 'triangle', f: 1900 * p, fe: 1300 * p, sw: 0.02, pk: 0.18, d: 0.025 });
  },
  open(v, t, p) {
    nb(v, t, { k: 'p', f: 500 * p, fe: 1600 * p, q: 1.2, a: 0.08, pk: 0.3, d: 0.12 });
    tn(v, t, { f: 220 * p, fe: 330 * p, a: 0.02, pk: 0.08, d: 0.13 });
  },
  close(v, t, p) {
    nb(v, t, { k: 'p', f: 1500 * p, fe: 450 * p, q: 1.2, a: 0.05, pk: 0.28, d: 0.1 });
    tn(v, t, { f: 330 * p, fe: 210 * p, a: 0.01, pk: 0.08, d: 0.1 });
  },
  denied(v, t, p) {
    const e = v.G(0), lp = v.F('lowpass', 650, 1);
    for (const f of [110, 116.5]) v.O('square', f * p, t, t + 0.3).connect(lp);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.16, t + 0.01);
    e.gain.setValueAtTime(0.16, t + 0.18);
    e.gain.linearRampToValueAtTime(0, t + 0.24);
    lp.connect(e); e.connect(v.out);
  },
  chest(v, t, p) {
    const d = 0.45, o = v.O('sawtooth', 80 * p, t, t + d + 0.05), bp = v.F('bandpass', 700 * p, 7);
    const am = v.G(0.6), lfo = v.O('square', 28, t, t + d + 0.05), lg = v.G(0.4), e = v.G(0);
    o.frequency.setValueAtTime(70 * p, t);
    o.frequency.linearRampToValueAtTime(115 * p, t + 0.25);
    o.frequency.linearRampToValueAtTime(85 * p, t + d);
    bp.frequency.setValueAtTime(600 * p, t);
    bp.frequency.linearRampToValueAtTime(1050 * p, t + 0.25);
    bp.frequency.linearRampToValueAtTime(700 * p, t + d);
    lfo.connect(lg); lg.connect(am.gain);
    o.connect(bp); bp.connect(am); am.connect(e); e.connect(v.out);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.9, t + 0.05);
    e.gain.setValueAtTime(0.9, t + d - 0.1);
    e.gain.linearRampToValueAtTime(0, t + d);
    const L = t + d + 0.03; // latch
    nb(v, L, { k: 'w', ft: 'highpass', f: 2500, a: 0.0005, pk: 0.6, d: 0.02 });
    metal(v, L, 1100 * p, [1, 2.7, 4.4], 0.1, 0.2);
    tn(v, L, { f: 300 * p, fe: 120 * p, pk: 0.4, d: 0.06 });
  },
  break(v, t, p) {
    tn(v, t, { f: 160 * p, fe: 70 * p, pk: 0.5, d: 0.08 });
    const s = v.N('w', t, t + 0.5), bp = v.F('bandpass', 3200 * p, 0.8), e = v.G(0);
    spikes(e.gain, t, 0.35, 18, 0.45, 0.02, 1.8);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    for (let k = 0; k < 4; k++) tn(v, t + rand(0, 0.2), { f: rand(2200, 5200) * p, pk: 0.06, d: rand(0.05, 0.15) });
    nb(v, t, { k: 'w', ft: 'highpass', f: 1500, a: 0.001, pk: 0.6, d: 0.05 });
  },
  shrine(v, t) {
    INS.choir(v, t, [62, 66, 69, 74], 0.9, { vel: 0.3, att: 0.5, rel: 1.4 });
    INS.bell(v, t + 0.05, 81, { vel: 0.1, dec: 3 });
    INS.bell(v, t + 0.35, 86, { vel: 0.07, dec: 3 });
    v.wet(0.6);
  },
  waypoint(v, t, p) {
    tn(v, t, { f: 48 * p, fe: 82 * p, sw: 1, a: 0.35, pk: 0.6, d: 1 });
    nb(v, t, { k: 'p', f: 200, fp: 700, fe: 250, q: 2, a: 0.4, pk: 0.4, d: 0.9 });
    tn(v, t, { w: 'triangle', f: 220 * p, det: -10, a: 0.3, pk: 0.06, d: 1.1 });
    tn(v, t, { w: 'triangle', f: 330 * p, det: 10, a: 0.3, pk: 0.05, d: 1.1 });
    v.wet(0.65);
  },
  door(v, t, p) {
    const d = 1, s = v.N('b', t, t + d + 0.1, 1.5), bp = v.F('bandpass', 320 * p, 2), e = v.G(0);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(1.2, t + 0.15);
    e.gain.setValueAtTime(1.2, t + d - 0.2);
    e.gain.linearRampToValueAtTime(0, t + d);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    const g2 = v.N('w', t, t + d), bp2 = v.F('bandpass', 1200 * p, 3), e2 = v.G(0);
    spikes(e2.gain, t + 0.05, d - 0.15, 22, 0.12, 0.02);
    g2.connect(bp2); bp2.connect(e2); e2.connect(v.out);
    tn(v, t, { f: 42, a: 0.2, pk: 0.3, d });
    tn(v, t + d - 0.05, { f: 90 * p, fe: 40, pk: 0.7, d: 0.25 });
    nb(v, t + d - 0.05, { k: 'p', ft: 'lowpass', f: 600, pk: 0.5, d: 0.15 });
    v.wet(0.3);
  },

  // ── creatures ──
  goblinDie(v, t, p) {
    vox(v, t, { f: 600 * p, d: 0.45, c: [[0, 1], [0.07, 1.75], [0.45, 0.45]], vow: 'i', vib: [28, 45], pk: 0.5, fg: 3, a: 0.015, hold: 0.3, n: 1 });
  },
  goblinAttack(v, t, p) {
    vox(v, t, { f: 250 * p, d: 0.26, c: [[0, 0.9], [0.26, 1.25]], vow: 'e', growl: [32, 0.45], breath: 0.4, pk: 0.45, fg: 3, a: 0.02, hold: 0.5 });
  },
  wolfDie(v, t, p) {
    vox(v, t, { f: 900 * p, d: 0.3, c: [[0, 1.2], [0.04, 1.45], [0.3, 0.55]], vow: 'a', fs: 1.3, pk: 0.45, fg: 3, a: 0.01, hold: 0.25, n: 1 });
    vox(v, t + 0.34, { f: 560 * p, d: 0.32, c: [[0, 1], [0.32, 0.75]], vow: 'u', fs: 1.4, pk: 0.18, fg: 3, a: 0.04, hold: 0.4, n: 1, vib: [9, 30] });
  },
  wolfAttack(v, t, p) {
    nb(v, t, { k: 'p', f: 700 * p, q: 2, a: 0.03, pk: 0.4, d: 0.18, am: [26, 0.45] });
    tn(v, t, { w: 'sawtooth', f: 110 * p, fe: 95 * p, a: 0.03, pk: 0.12, d: 0.18, lp: 900 });
    nb(v, t + 0.17, { k: 'w', ft: 'highpass', f: 1800, a: 0.0005, pk: 0.7, d: 0.02 });
    tn(v, t + 0.17, { f: 600 * p, fe: 150 * p, pk: 0.4, d: 0.035 });
  },
  wolfHowl(v, t, p) {
    const d = 2.1, f = rand(400, 470) * p, end = t + d + 0.25;
    const a = v.O('sine', f, t, end), b = v.O('triangle', f, t, end);
    for (const o of [a, b]) {
      const q = o.frequency;
      q.setValueAtTime(f * 0.85, t);
      q.exponentialRampToValueAtTime(f * 1.45, t + 0.55);
      q.exponentialRampToValueAtTime(f * 1.38, t + 1.4);
      q.exponentialRampToValueAtTime(f * 0.92, t + d);
    }
    b.detune.value = 6;
    const lfo = v.O('sine', 5.5, t, end), lg = v.G(0);
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(30, t + 1.1);
    lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    const bg = v.G(0.25), lp = v.F('lowpass', 1500, 0.7), e = v.G(0);
    a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(e);
    nb(v, t, { k: 'w', f: 1200, q: 3, a: 0.4, pk: 0.05, d: d - 0.4, to: e });
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.4, t + 0.35);
    e.gain.setValueAtTime(0.4, t + d - 0.6);
    e.gain.setTargetAtTime(0, t + d - 0.6, 0.12);
    e.connect(v.out);
    v.wet(0.8);
  },
  spiderHiss(v, t, p) {
    nb(v, t, { k: 'w', ft: 'highpass', f: 3000 * p, q: 0.8, a: 0.04, pk: 0.35, d: 0.4, am: [24, 0.3] });
  },
  spiderDie(v, t, p) {
    SFX.hitChitin(v, t, p * 0.8);
    nb(v, t + 0.04, { k: 'w', ft: 'highpass', f: 2500 * p, q: 0.8, a: 0.05, pk: 0.3, d: 0.55, am: [30, 0.35] });
    for (let k = 0; k < 3; k++) nb(v, t + 0.15 + rand(0, 0.35), { k: 'w', f: rand(2000, 3000), q: 6, a: 0.0005, pk: 0.35, d: 0.02 });
  },
  skeletonRattle(v, t, p) {
    const d = rand(0.25, 0.4), s = v.N('w', t, t + d + 0.05), bp = v.F('bandpass', 2600 * p, 6), bp2 = v.F('bandpass', 1500 * p, 5), e = v.G(0);
    spikes(e.gain, t, d, 8 + ((Math.random() * 6) | 0), 1.1, 0.006);
    s.connect(bp); s.connect(bp2); bp.connect(e); bp2.connect(e); e.connect(v.out);
  },
  skeletonDie(v, t, p) {
    tn(v, t, { f: 140 * p, fe: 70, pk: 0.4, d: 0.1 });
    const d = 0.8, s = v.N('w', t, t + d + 0.05), bp = v.F('bandpass', 2200 * p, 4), bp2 = v.F('bandpass', 1200 * p, 4), e = v.G(0);
    spikes(e.gain, t, d, 22, 1.1, 0.008, 1.8);
    s.connect(bp); s.connect(bp2); bp.connect(e); bp2.connect(e); e.connect(v.out);
    for (let k = 0; k < 4; k++) tn(v, t + rand(0, 0.5), { w: 'triangle', f: rand(600, 1300) * p, pk: 0.12, d: 0.04 });
  },
  wraithWail(v, t, p) {
    const d = 1.4, f = 520 * p, end = t + d + 0.3;
    const a = v.O('sine', f, t, end), b = v.O('sine', f, t, end);
    b.detune.value = 14;
    for (const o of [a, b]) {
      o.frequency.setValueAtTime(f * 0.85, t);
      o.frequency.linearRampToValueAtTime(f * 1.35, t + 0.45);
      o.frequency.linearRampToValueAtTime(f * 1.05, t + d);
    }
    const lfo = v.O('sine', 6, t, end), lg = v.G(35), e = v.G(0);
    lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    a.connect(e); b.connect(e);
    const nz = v.N('w', t, end), bp = v.F('bandpass', f * 2.2, 5), ng = v.G(0.6);
    bp.frequency.setValueAtTime(f * 1.9, t);
    bp.frequency.linearRampToValueAtTime(f * 2.9, t + 0.45);
    bp.frequency.linearRampToValueAtTime(f * 2.2, t + d);
    nz.connect(bp); bp.connect(ng); ng.connect(e);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.2, t + 0.3);
    e.gain.setValueAtTime(0.2, t + d - 0.45);
    e.gain.setTargetAtTime(0, t + d - 0.45, 0.12);
    e.connect(v.out);
    v.wet(0.75);
  },
  wraithDie(v, t, p) {
    const d = 1.3, f = 700 * p, end = t + d + 0.35;
    const a = v.O('sine', f, t, end), b = v.O('sine', f, t, end), lfo = v.O('sine', 7, t, end), lg = v.G(0), e = v.G(0);
    b.detune.value = 18;
    for (const o of [a, b]) { o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.3, t + d); }
    lg.gain.setValueAtTime(5, t);
    lg.gain.linearRampToValueAtTime(80, t + d);
    lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    a.connect(e); b.connect(e);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.22, t + 0.05);
    e.gain.setTargetAtTime(0, t + 0.5, 0.18);
    e.connect(v.out);
    nb(v, t, { k: 'p', f: 2200 * p, fe: 300 * p, q: 1.5, a: 0.25, pk: 0.45, d: 0.9 });
    v.wet(0.8);
  },
  orcDie(v, t, p) {
    vox(v, t, { f: 95 * p, d: 0.65, c: [[0, 1.05], [0.15, 1], [0.65, 0.62]], vow: 'o', growl: [22, 0.4], drive: 4, breath: 0.3, pk: 0.7, fg: 4, fs: 0.85, a: 0.03, hold: 0.45 });
  },
  orcAttack(v, t, p) {
    vox(v, t, { f: 118 * p, d: 0.28, c: [[0, 0.95], [0.08, 1.05], [0.28, 0.85]], vow: 'a', growl: [26, 0.3], drive: 3, breath: 0.3, pk: 0.6, fg: 4, fs: 0.8, a: 0.02, hold: 0.5 });
  },
  trollRoar(v, t, p) {
    roar(v, t, 55 * p, 1.4, 0.55, 5);
    v.wet(0.45);
  },
  bossRoar(v, t, p) {
    roar(v, t, 42 * p, 2.2, 0.5, 8);
    vox(v, t + 0.05, { f: 88 * p, d: 2.1, c: [[0, 0.9], [0.3, 1.15], [2.1, 0.7]], vow: 'a', to: 'o', mt: 1.5, growl: [19, 0.35], drive: 6, breath: 0.4, pk: 0.45, fg: 3, fs: 0.75, a: 0.15, hold: 0.55 });
    tn(v, t, { f: 38 * p, fe: 30, a: 0.1, pk: 0.5, d: 2 });
    v.wet(0.85);
  },
  playerHurt(v, t, p) {
    tn(v, t, { f: 170 * p, fe: 80 * p, pk: 0.6, d: 0.12 });
    vox(v, t, { f: 190 * p, d: 0.16, c: [[0, 1], [0.16, 0.7]], vow: 'u', pk: 0.35, fg: 4, a: 0.01, hold: 0.4, breath: 0.2 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 1200, pk: 0.4, d: 0.06 });
  },
  playerDie(v, t, p) {
    tn(v, t, { f: 65 * p, fe: 30, sw: 1, pk: 1, d: 1.4 });
    nb(v, t, { k: 'b', ft: 'lowpass', f: 600, fe: 150, pk: 0.8, d: 0.8 });
    const lp = v.F('lowpass', 500, 0.8), e = v.G(0);
    for (const m of [38, 39, 26]) v.O('sawtooth', mf(m), t, t + 2.6).connect(lp);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.18, t + 0.04);
    e.gain.exponentialRampToValueAtTime(EPS, t + 2.5);
    lp.connect(e); e.connect(v.out);
    v.wet(0.9);
  },
  heartbeat(v, t, p) {
    const o = v.O('sine', 60 * p, t, t + 0.6), w = v.W(3), e = v.G(0), q = o.frequency;
    e.gain.setValueAtTime(0, t);
    for (const [dt, a] of [[0, 1], [0.24, 0.65]]) {
      const x = t + dt;
      q.setValueAtTime(72 * p, x);
      q.exponentialRampToValueAtTime(38 * p, x + 0.12);
      e.gain.setValueAtTime(0, x);
      e.gain.linearRampToValueAtTime(0.6 * a, x + 0.008);
      e.gain.setTargetAtTime(0, x + 0.03, 0.05);
    }
    o.connect(w); w.connect(e); e.connect(v.out);
  },
  footstep(v, t, p) {
    const s = v.N('b', t, t + 0.14, p), f = v.F('lowpass', rand(500, 900), 0.7), e = v.G(0);
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime(0.4, t + 0.006);
    e.gain.setTargetAtTime(0, t + 0.012, 0.02);
    s.connect(f); f.connect(e); e.connect(v.out);
  },

  // ── Act II creatures ──
  batScreech(v, t, p) {
    for (let k = 0; k < 3; k++) { const x = t + k * rand(0.05, 0.08), f = rand(3200, 4200) * p; tn(v, x, { f, fe: f * 0.7, pk: 0.1, d: 0.05 }); }
    nb(v, t, { k: 'w', ft: 'highpass', f: 4000 * p, q: 1, a: 0.005, pk: 0.12, d: 0.12 });
  },
  batDie(v, t, p) {
    tn(v, t, { f: 3600 * p, fe: 1200 * p, pk: 0.12, d: 0.18 });
    nb(v, t + 0.05, { k: 'p', f: 900 * p, q: 1, a: 0.01, pk: 0.3, d: 0.15, am: [30, 0.5] });
  },
  wormRumble(v, t, p) {
    nb(v, t, { k: 'b', ft: 'lowpass', f: 180 * p, q: 0.8, a: 0.2, pk: 0.9, d: 0.9, drive: 3 });
    tn(v, t, { f: 46 * p, fe: 38 * p, a: 0.15, pk: 0.5, d: 0.9 });
    for (let k = 0; k < 6; k++) nb(v, t + rand(0, 0.7), { k: 'p', f: rand(300, 700), q: 3, a: 0.002, pk: 0.3, d: 0.05 });
    v.wet(0.3);
  },
  wormDie(v, t, p) { roar(v, t, 70 * p, 0.9, 0.4, 3); SFX.hitChitin(v, t, p * 0.7); v.wet(0.3); },
  dwarfAttack(v, t, p) {
    vox(v, t, { f: 135 * p, d: 0.3, c: [[0, 0.95], [0.1, 1.1], [0.3, 0.9]], vow: 'a', growl: [24, 0.25], drive: 2.5, breath: 0.3, pk: 0.55, fg: 4, fs: 0.82, a: 0.02, hold: 0.5 });
  },
  dwarfDie(v, t, p) {
    vox(v, t, { f: 120 * p, d: 0.7, c: [[0, 1.05], [0.15, 1], [0.7, 0.6]], vow: 'o', growl: [20, 0.3], drive: 3, breath: 0.3, pk: 0.65, fg: 4, fs: 0.82, a: 0.03, hold: 0.45 });
  },
  houndGrowl(v, t, p) {
    vox(v, t, { f: 150 * p, d: 0.5, c: [[0, 0.9], [0.5, 1]], vow: 'o', growl: [34, 0.6], drive: 5, breath: 0.6, pk: 0.4, fg: 3, fs: 1.1, a: 0.05, hold: 0.6 });
    nb(v, t, { k: 'p', ft: 'lowpass', f: 700, q: 1, a: 0.05, pk: 0.3, d: 0.5, am: [30, 0.5] });
  },
  golemStep(v, t, p) {
    tn(v, t, { f: 60 * p, fe: 32, sw: 0.4, pk: 0.9, d: 0.5 });
    nb(v, t, { k: 'b', ft: 'lowpass', f: 400 * p, fe: 120, pk: 0.7, d: 0.4, drive: 2 });
    for (let k = 0; k < 5; k++) nb(v, t + rand(0.02, 0.3), { k: 'w', f: rand(1500, 3000), q: 4, a: 0.001, pk: 0.25, d: 0.03 });
    v.wet(0.35);
  },
  golemDie(v, t, p) {
    SFX.golemStep(v, t, p * 0.8); SFX.golemStep(v, t + 0.35, p * 0.7);
    nb(v, t, { k: 'b', ft: 'lowpass', f: 300, q: 0.8, a: 0.1, pk: 0.8, d: 2, drive: 3 });
    v.wet(0.6);
  },
  stoneCrack(v, t, p) {
    const d = 0.5, s = v.N('w', t, t + d), bp = v.F('bandpass', 1800 * p, 3), e = v.G(0);
    spikes(e.gain, t, d, 14, 0.9, 0.01, 1.5);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    tn(v, t, { f: 90 * p, fe: 50, pk: 0.5, d: 0.25 });
  },
  lavaBurst(v, t, p) {
    nb(v, t, { k: 'p', ft: 'lowpass', f: 300 * p, fp: 1800 * p, fe: 400 * p, q: 1, a: 0.05, pk: 0.8, d: 0.6, drive: 3 });
    for (let k = 0; k < 8; k++) nb(v, t + rand(0.05, 0.6), { k: 'w', f: rand(1500, 3500), q: 4, a: 0.001, pk: 0.2, d: 0.02 });
    tn(v, t, { f: 70 * p, fe: 40, pk: 0.5, d: 0.4 });
    v.wet(0.4);
  },
  anvil(v, t, p) {
    metal(v, t, 330 * p * rand(0.98, 1.02), [1, 2.76, 5.4, 8.93, 13.3], 1.2, 0.35);
    tn(v, t, { f: 140 * p, fe: 90 * p, pk: 0.3, d: 0.08 });
    v.wet(0.5);
  },

  // ── story / world ──
  beaconIgnite(v, t) {
    nb(v, t, { k: 'p', ft: 'lowpass', f: 300, fp: 3200, fe: 700, q: 1, a: 0.45, pk: 0.75, d: 2 });
    nb(v, t + 0.1, { k: 'b', ft: 'lowpass', f: 450, q: 0.9, a: 0.3, pk: 0.6, d: 2.2, drive: 3 });
    const s = v.N('w', t + 0.2, t + 2.6), hp = v.F('highpass', 1800, 0.7), e = v.G(0);
    spikes(e.gain, t + 0.2, 2.3, 60, 0.3, 0.008);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    INS.strings(v, t, [50, 57, 62, 66], 1.3, { vel: 0.32, att: 1.4, rel: 1.4, cut: 1500 });
    INS.bell(v, t + 1.4, 74, { vel: 0.08, dec: 3 });
    v.wet(0.6);
  },
  fireCrackle(v, t, p) {
    const s = v.N('w', t, t + 0.35), hp = v.F('highpass', 2000 * p, 0.7), e = v.G(0);
    spikes(e.gain, t, 0.3, 9, 0.22, 0.006);
    s.connect(hp); hp.connect(e); e.connect(v.out);
  },

  // ── Act III: the Weeping Woods ──
  // bark splitting: a dry crackle over a hollow knock (a Hollowed waking, a Heartroot)
  hollowCrack(v, t, p) {
    const d = 0.55, s = v.N('w', t, t + d), bp = v.F('bandpass', 1500 * p, 2.5), e = v.G(0);
    spikes(e.gain, t, d, 18, 0.8, 0.008, 1.6);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    tn(v, t, { w: 'triangle', f: 210 * p, fe: 120 * p, pk: 0.45, d: 0.14 });
    nb(v, t + 0.05, { k: 'b', f: 420 * p, q: 3, a: 0.04, pk: 0.35, d: 0.45, am: [rand(22, 30), 0.8] });
    v.wet(0.3);
  },
  // a mandrake's scream out of the earth
  rootlingShriek(v, t, p) {
    vox(v, t, { f: 820 * p, d: 0.62, c: [[0, 0.8], [0.08, 1.35], [0.45, 1.2], [0.62, 0.7]], vow: 'i', to: 'e', mt: 0.4, vib: [24, 60], breath: 0.5, pk: 0.32, fg: 3, a: 0.02, hold: 0.5, n: 2 });
    nb(v, t, { k: 'w', ft: 'highpass', f: 3500 * p, q: 0.8, a: 0.03, pk: 0.18, d: 0.5, am: [36, 0.5] });
    v.wet(0.35);
  },
  // a moth comes apart in dust: papery flutter and a tiny chime
  mothDie(v, t, p) {
    nb(v, t, { k: 'w', ft: 'highpass', f: 2600 * p, q: 0.8, a: 0.01, pk: 0.25, d: 0.35, am: [48, 0.8] });
    tn(v, t + 0.04, { f: 2400 * p, fe: 1300 * p, pk: 0.06, d: 0.4 });
    INS.bell(v, t + 0.08, 96, { vel: 0.02, dec: 0.8 });
    v.wet(0.5);
  },
  bearRoar(v, t, p) {
    roar(v, t, 62 * p, 1.3, 0.5, 6);
    vox(v, t + 0.04, { f: 105 * p, d: 1.2, c: [[0, 0.9], [0.25, 1.1], [1.2, 0.75]], vow: 'o', to: 'a', mt: 0.6, growl: [21, 0.45], drive: 5, breath: 0.5, pk: 0.4, fg: 3, fs: 0.8, a: 0.08, hold: 0.55 });
    v.wet(0.45);
  },
  // four heavy paws, faster and faster, and a snort
  bearCharge(v, t, p) {
    for (let k = 0; k < 5; k++) { const x = t + k * (0.22 - k * 0.025); tn(v, x, { f: 70 * p, fe: 36, pk: 0.5, d: 0.18 }); nb(v, x, { k: 'b', ft: 'lowpass', f: 500, pk: 0.35, d: 0.12 }); }
    nb(v, t, { k: 'p', f: 900 * p, q: 1.5, a: 0.03, pk: 0.3, d: 0.25, am: [30, 0.6] });
    v.wet(0.25);
  },
  // the White Hart's bugle: a long rising whistle out of a deep chest, falling into grunts
  hartBellow(v, t, p) {
    const d = 2.2, end = t + d + 0.3, f = 560 * p, a = v.O('sine', f, t, end), b = v.O('triangle', f, t, end), e = v.G(0);
    for (const o of [a, b]) { const q = o.frequency; q.setValueAtTime(f * 0.7, t); q.exponentialRampToValueAtTime(f * 1.9, t + 0.7); q.exponentialRampToValueAtTime(f * 1.75, t + 1.4); q.exponentialRampToValueAtTime(f * 0.8, t + d); }
    b.detune.value = 9;
    const lfo = v.O('sine', 6.5, t, end), lg = v.G(0); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(40, t + 1); lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    const bg = v.G(0.3), lp = v.F('lowpass', 2600, 0.7); a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(e);
    nb(v, t, { k: 'w', f: 1800, q: 3, a: 0.5, pk: 0.05, d: d - 0.5, to: e });
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.26, t + 0.4); e.gain.setValueAtTime(0.26, t + d - 0.7); e.gain.setTargetAtTime(0, t + d - 0.7, 0.15);
    e.connect(v.out);
    vox(v, t, { f: 120 * p, d: 0.7, c: [[0, 0.9], [0.7, 1.05]], vow: 'o', growl: [18, 0.4], drive: 3, breath: 0.4, pk: 0.3, fg: 3, fs: 0.8, a: 0.1, hold: 0.5 });
    for (let k = 0; k < 3; k++) vox(v, t + d - 0.2 + k * 0.32, { f: 95 * p, d: 0.22, c: [[0, 1], [0.22, 0.8]], vow: 'u', growl: [20, 0.5], drive: 3, breath: 0.5, pk: 0.28, fg: 3, fs: 0.8, a: 0.02, hold: 0.4 });
    v.wet(0.85);
  },
  hartCharge(v, t, p) {
    for (let k = 0; k < 6; k++) { const x = t + k * 0.13; tn(v, x, { f: 85 * p, fe: 40, pk: 0.45, d: 0.12 }); nb(v, x, { k: 'w', f: 1400, q: 2, pk: 0.15, d: 0.03 }); }
    vox(v, t, { f: 140 * p, d: 0.4, c: [[0, 1], [0.4, 0.85]], vow: 'u', growl: [24, 0.5], breath: 0.6, pk: 0.3, fg: 3, a: 0.02, hold: 0.4 });
    v.wet(0.3);
  },
  // wood struck: a hollow knock and a click of splinters
  woodHit(v, t, p) {
    tn(v, t, { w: 'triangle', f: 260 * p * rand(0.9, 1.1), fe: 170 * p, pk: 0.5, d: 0.09 });
    nb(v, t, { k: 'w', f: 1900 * p, q: 3, a: 0.001, pk: 0.45, d: 0.05 });
    nb(v, t + 0.01, { k: 'p', ft: 'lowpass', f: 700, pk: 0.3, d: 0.08 });
  },
  woodDie(v, t, p) {
    SFX.hollowCrack(v, t, p * 0.85);
    nb(v, t + 0.15, { k: 'b', f: 300 * p, q: 3, a: 0.1, pk: 0.4, d: 0.8, am: [rand(14, 20), 0.85] });
    tn(v, t + 0.5, { f: 70 * p, fe: 40, pk: 0.4, d: 0.3 });
    v.wet(0.4);
  },
  // a Mourner's keen: a woman's voice sliding up out of a whisper
  mournerKeen(v, t, p) {
    vox(v, t, { f: 640 * p, d: 1.6, c: [[0, 0.85], [0.5, 1.3], [1.1, 1.2], [1.6, 0.9]], vow: 'a', to: 'i', mt: 1.2, vib: [5.5, 45], breath: 0.6, pk: 0.2, fg: 3, a: 0.25, hold: 0.6, n: 2 });
    INS.whisper(v, t, 1.8, { vel: 0.08 });
    v.wet(0.85);
  },
  // the sap takes hold: a thick, gulping set
  sapRoot(v, t, p) {
    tn(v, t, { f: 210 * p, fe: 80 * p, sw: 0.3, pk: 0.5, d: 0.35 });
    for (let k = 0; k < 4; k++) tn(v, t + 0.05 + k * rand(0.05, 0.09), { f: rand(300, 520) * p, fe: rand(140, 220) * p, pk: 0.15, d: 0.06 });
    nb(v, t, { k: 'b', ft: 'lowpass', f: 600, q: 1, a: 0.04, pk: 0.4, d: 0.4 });
    v.wet(0.25);
  },
  // and breaks: brittle amber cracking like ice
  sapCrack(v, t, p) {
    const d = 0.35, s = v.N('w', t, t + d), hp = v.F('highpass', 2600 * p, 0.8), e = v.G(0);
    spikes(e.gain, t, d, 12, 0.6, 0.006, 1.8);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    tn(v, t, { w: 'triangle', f: 1350 * p, fe: 900 * p, pk: 0.12, d: 0.2 });
    v.wet(0.3);
  },
  // a wall of thorns dries, cracks and sinks
  thornWither(v, t, p) {
    const d = 1.3, s = v.N('w', t, t + d), bp = v.F('bandpass', 2600 * p, 1.5), e = v.G(0);
    spikes(e.gain, t, d, 40, 0.45, 0.01, 1.2);
    bp.frequency.setValueAtTime(3200 * p, t); bp.frequency.exponentialRampToValueAtTime(900 * p, t + d);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    nb(v, t, { k: 'b', f: 260 * p, q: 3, a: 0.2, pk: 0.35, d: 1.0, am: [rand(12, 18), 0.8] });
    tn(v, t + 0.1, { f: 60 * p, fe: 34, pk: 0.4, d: 0.9 });
    v.wet(0.5);
  },
  // the Lady's Song of Sorrow: a high line on 'a' over a bell
  amaranthSong(v, t) {
    INS.choir(v, t, [69, 76], 1.7, { vel: 0.22, att: 0.35, rel: 1.2, vowel: 'a' });
    INS.choir(v, t + 0.5, [72], 1.1, { vel: 0.14, att: 0.3, rel: 1, vowel: 'a' });
    INS.bell(v, t + 0.1, 81, { vel: 0.05, dec: 3 });
    v.wet(0.8);
  },
  // the First Autumn: a long gust through high leaves
  windGust(v, t, p) {
    const d = 4, s = v.N('p', t, t + d), bp = v.F('bandpass', 500 * p, 0.8), hp = v.F('highpass', 2500, 0.7), e = v.G(0), e2 = v.G(0);
    bp.frequency.setValueAtTime(300 * p, t); bp.frequency.exponentialRampToValueAtTime(1200 * p, t + d * 0.45); bp.frequency.exponentialRampToValueAtTime(400 * p, t + d);
    asr(e.gain, t, d * 0.4, 0.6, t + d * 0.5, d * 0.5);
    const s2 = v.N('w', t, t + d); spikes(e2.gain, t + 0.6, d - 1, 60, 0.07, 0.03);
    s.connect(bp); bp.connect(e); e.connect(v.out); s2.connect(hp); hp.connect(e2); e2.connect(v.out);
    v.wet(0.5);
  },

  // ── Act IV: the Field of Ash and the Ashen Forge ──
  // a flue draws breath: two seconds of air rushing up into the grate, the leather of the bellows creaking
  bellowsInhale(v, t, p) {
    const d = 2, s = v.N('p', t, t + d + 0.2), bp = v.F('bandpass', 200 * p, 1.1), e = v.G(0);
    bp.frequency.setValueAtTime(170 * p, t); bp.frequency.exponentialRampToValueAtTime(1100 * p, t + d);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.55, t + d * 0.93); e.gain.linearRampToValueAtTime(0, t + d + 0.08);
    s.connect(bp); bp.connect(e); e.connect(v.out);
    nb(v, t + 0.3, { k: 'b', f: 240 * p, q: 4, a: 0.6, pk: 0.14, d: 1.1, am: [rand(11, 16), 0.85] });
    tn(v, t, { w: 'triangle', f: 40, fe: 62, sw: d, a: 1.4, pk: 0.25, d: 0.6 });
    v.wet(0.45);
  },
  // and breathes out fire: a deep roar, the rush of flame, embers crackling
  bellowsRoar(v, t, p) {
    roar(v, t, 52 * p, 1.3, 0.55, 5);
    nb(v, t, { k: 'p', ft: 'lowpass', f: 600 * p, fp: 3200 * p, fe: 420 * p, q: 0.8, a: 0.06, pk: 0.75, d: 1.2, drive: 2 });
    const s = v.N('w', t + 0.1, t + 1.4), hp = v.F('highpass', 2400, 0.7), e = v.G(0);
    spikes(e.gain, t + 0.1, 1.2, 40, 0.25, 0.008, 1.4);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    v.wet(0.45);
  },
  // the Ember Cradle drinks a fire: a sucking rush that rises into a small, warm glow
  lanternDrink(v, t, p) {
    nb(v, t, { k: 'p', ft: 'bandpass', f: 2400 * p, fe: 380 * p, q: 1.2, a: 0.25, pk: 0.4, d: 0.45 });
    tn(v, t + 0.15, { f: 260 * p, fe: 620 * p, sw: 0.35, a: 0.08, pk: 0.12, d: 0.5 });
    INS.bell(v, t + 0.42, 81, { vel: 0.03, dec: 1.6 });
    v.wet(0.4);
  },
  // a stoker's chain: links knocking together
  chainRattle(v, t, p) {
    for (let k = 0; k < 7; k++) metal(v, t + k * rand(0.03, 0.07), 1700 * p * rand(0.85, 1.15), [1, 2.4, 3.9], 0.12, 0.05);
    v.wet(0.2);
  },
  // and the chain tearing from its post: a hard iron snap, links flying
  chainSnap(v, t, p) {
    metal(v, t, 880 * p, [1, 2.76, 5.4, 8.9], 0.7, 0.32);
    nb(v, t, { k: 'w', ft: 'highpass', f: 3500, q: 0.7, a: 0.001, pk: 0.5, d: 0.08 });
    for (let k = 0; k < 6; k++) metal(v, t + 0.12 + k * rand(0.05, 0.11), 1900 * rand(0.8, 1.2), [1, 2.4, 3.9], 0.1, 0.05);
    v.wet(0.3);
  },
  // a spearman's shield takes the blow: a wooden thud with an iron rim
  shieldBlock(v, t, p) {
    tn(v, t, { w: 'triangle', f: 190 * p, fe: 110 * p, pk: 0.5, d: 0.12 });
    metal(v, t, 620 * p, [1, 2.3, 4.1], 0.25, 0.14);
    nb(v, t, { k: 'p', ft: 'lowpass', f: 1200, q: 0.8, a: 0.002, pk: 0.4, d: 0.08 });
    v.wet(0.2);
  },
  // an Ember Tick latches on: a chitin click and a sizzle
  tickLatch(v, t, p) {
    SFX.hitChitin(v, t, p * 1.3);
    nb(v, t + 0.05, { k: 'w', ft: 'highpass', f: 4200, q: 0.7, a: 0.02, pk: 0.16, d: 0.5, am: [rand(30, 44), 0.6] });
    v.wet(0.2);
  },
  // a Smoke-eater swallows a flame: a wet, cold gulp
  smokeGulp(v, t, p) {
    tn(v, t, { f: 190 * p, fe: 80 * p, sw: 0.25, pk: 0.4, d: 0.3 });
    nb(v, t, { k: 'b', ft: 'lowpass', f: 700 * p, q: 1, a: 0.05, pk: 0.35, d: 0.35, am: [rand(18, 26), 0.7] });
    nb(v, t + 0.12, { k: 'p', ft: 'bandpass', f: 1400 * p, fe: 500 * p, q: 1.5, a: 0.1, pk: 0.15, d: 0.4 });
    v.wet(0.3);
  },
  // an Ashwing's cry from the dark above: a long raw shriek
  ashwingScreech(v, t, p) {
    vox(v, t, { f: 460 * p, d: 0.8, c: [[0, 0.8], [0.15, 1.45], [0.8, 0.85]], vow: 'a', to: 'e', mt: 0.5, growl: [32, 0.5], drive: 4, breath: 0.6, pk: 0.28, fg: 3, a: 0.03, hold: 0.55 });
    nb(v, t, { k: 'w', ft: 'highpass', f: 3000 * p, q: 0.8, a: 0.02, pk: 0.14, d: 0.6, am: [40, 0.5] });
    v.wet(0.6);
  },
  // a shard cracks: glass and iron at once, ringing
  crownCrack(v, t, p) {
    const s = v.N('w', t, t + 0.3), hp = v.F('highpass', 3000 * p, 0.8), e = v.G(0);
    spikes(e.gain, t, 0.25, 10, 0.7, 0.005, 2);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    metal(v, t, 1250 * p, [1, 1.52, 2.73, 4.3], 1.6, 0.16);
    tn(v, t, { f: 90 * p, fe: 45, pk: 0.35, d: 0.3 });
    v.wet(0.55);
  },
  // the Lampless horn: a falling fourth, far off
  hornCall(v, t, p) {
    INS.brass(v, t, [62], 0.6, { vel: 0.2, att: 0.22, rel: 0.5, bright: 900 });
    INS.brass(v, t + 0.75, [57], 1.0, { vel: 0.2, att: 0.18, rel: 0.9, bright: 780 });
    v.wet(0.85);
  },
  // a lamp catches: a soft whump of flame and a warm glint
  lampLight(v, t, p) {
    nb(v, t, { k: 'p', ft: 'lowpass', f: 300 * p, fp: 1800 * p, fe: 500 * p, q: 0.9, a: 0.08, pk: 0.4, d: 0.5 });
    const s = v.N('w', t + 0.05, t + 0.7), hp = v.F('highpass', 2200, 0.7), e = v.G(0);
    spikes(e.gain, t + 0.05, 0.6, 14, 0.18, 0.006);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    INS.bell(v, t + 0.1, 86, { vel: 0.035, dec: 2 });
    v.wet(0.45);
  },
  // a keeper's statue of ash comes apart: a crack, then rubble
  statueBreak(v, t, p) {
    SFX.stoneCrack(v, t, p * 0.8);
    const s = v.N('b', t + 0.1, t + 1.2), lp = v.F('lowpass', 900, 0.7), e = v.G(0);
    spikes(e.gain, t + 0.1, 1, 30, 0.45, 0.02, 1.5);
    s.connect(lp); lp.connect(e); e.connect(v.out);
    tn(v, t, { f: 60 * p, fe: 32, pk: 0.5, d: 0.6 });
    v.wet(0.45);
  },
};

// name → [max calls, window seconds]; extras inside the window are dropped
const LIMITS = {
  footstep: [2, 0.07], gold: [3, 0.06], heartbeat: [1, 0.3], wolfHowl: [2, 1.2], bossRoar: [1, 0.8],
  trollRoar: [2, 0.5], beaconIgnite: [1, 1], explosion: [3, 0.06], warcry: [1, 0.4], itemDropLegendary: [1, 0.3],
  wraithWail: [2, 0.5], door: [1, 0.3], fireCrackle: [2, 0.1],
  hartBellow: [1, 1.2], bearRoar: [2, 0.6], rootlingShriek: [2, 0.3], hollowCrack: [3, 0.15], mournerKeen: [2, 0.6],
  amaranthSong: [1, 1], sapRoot: [1, 0.5], sapCrack: [2, 0.2], thornWither: [2, 0.4], windGust: [1, 2], woodHit: [5, 0.05],
  bellowsInhale: [2, 1], bellowsRoar: [2, 1], hornCall: [1, 2.5], chainRattle: [2, 0.4], tickLatch: [2, 0.2], lanternDrink: [1, 0.5], smokeGulp: [2, 0.4], ashwingScreech: [1, 0.8], crownCrack: [2, 0.25], statueBreak: [1, 0.5], shieldBlock: [3, 0.08],
};
const DEF_LIMIT = [5, 0.06];

// output trims per sound, measured offline (loudest 50 ms window) so families sit at consistent levels
const TRIM = {
  swing: 2.6, swingHeavy: 1.1, hitFlesh: 0.75, hitBone: 2.4, hitMetal: 0.85, hitSpirit: 1.6, crit: 0.8,
  arrowShoot: 1.3, arcaneBolt: 2.4, fireball: 0.5, explosion: 0.7, frost: 1.8, lightning: 1.2, meteorFall: 0.8,
  whirlwind: 2.2, leap: 1.8, slam: 0.65, warcry: 0.55, roll: 2, pickup: 1.4, equip: 1.4, click: 1.8, open: 1.7,
  close: 1.7, denied: 0.5, shrine: 0.6, waypoint: 0.6, door: 0.7, goblinDie: 2, wolfDie: 1.4, wolfAttack: 1.8,
  wolfHowl: 0.6, spiderHiss: 2.2, skeletonRattle: 3, skeletonDie: 1.3, wraithWail: 0.75, wraithDie: 0.75,
  orcDie: 0.6, orcAttack: 0.8, trollRoar: 0.85, bossRoar: 0.75, playerHurt: 0.8, playerDie: 0.6, heartbeat: 0.8,
  footstep: 0.5, beaconIgnite: 0.85, fireCrackle: 1.6,
  woodHit: 1.6, hollowCrack: 1.6, sapCrack: 2.2, windGust: 1.5, mournerKeen: 0.85,
};
const STING_TRIM = { victory: 0.8, death: 0.55, bossIntro: 0.5, quest: 1.3, memory: 0.9, lantern: 1.1 };

// ───────────────────────────── 5. stings ─────────────────────────────

// Bb – C – D: a modal (bVI–bVII–I) lift into D major. mk() returns the voice to play into.
function fanfare(mk, t, big) {
  const A = t + (big ? 0.55 : 0);
  if (big) for (let k = 0; k < 9; k++) INS.taiko(mk(), t + k * 0.06, 0.1 + k * 0.045, { f: 90, dec: 0.35 });
  INS.brass(mk(), A, [46, 53, 58, 62], 0.5, { vel: 0.3, att: 0.03, rel: 0.12, bright: 2600 });
  INS.brass(mk(), A + 0.6, [48, 55, 60, 64], 0.5, { vel: 0.32, att: 0.03, rel: 0.12, bright: 2800 });
  INS.brass(mk(), A + 1.2, [50, 57, 62, 66, 69], big ? 3.2 : 1.6, { vel: 0.36, att: 0.04, rel: 1.2, bright: 3000 });
  INS.taiko(mk(), A + 1.2, 0.8, { f: 100 });
  for (const [m, dt, d] of [[65, 0, 0.5], [67, 0.6, 0.5], [69, 1.2, 0.4], [74, 1.62, 0.36], [78, 2, big ? 2.6 : 1.2]]) {
    INS.brass(mk(), A + dt, [m], d, { vel: 0.3, att: 0.02, rel: 0.25, bright: 3800 });
  }
  INS.strings(mk(), A + 1.2, [62, 66, 69, 74], big ? 3 : 1.4, { vel: 0.25, att: 0.3, rel: 1.6, cut: 2400 });
  if (big) INS.choir(mk(), A + 1.2, [62, 66, 69], 2.6, { vel: 0.2, att: 0.5, rel: 1.6 });
  INS.bell(mk(), A + 1.2, 74, { vel: 0.1, dec: 3 });
  INS.bell(mk(), A + 1.6, 81, { vel: 0.07, dec: 3 });
  return A + (big ? 4.4 : 2.8) - t;
}

// Each sting plays into a single sfx-bus voice and returns how long to duck the music.
const STINGS = {
  levelup(v, t) {
    INS.taiko(v, t, 0.45, { f: 100 });
    INS.strings(v, t, [62, 66, 69, 74], 1, { vel: 0.3, att: 0.25, rel: 1.4, cut: 2200 });
    [74, 78, 81, 86, 90].forEach((m, k) => INS.pluck(v, t + k * 0.075, m, { vel: 0.2, dec: 1.6, bright: 6, saw: 0.2 }));
    INS.bell(v, t + 0.4, 86, { vel: 0.12, dec: 2.5 });
    nb(v, t + 0.3, { k: 'w', ft: 'highpass', f: 7000, q: 0.7, a: 0.3, pk: 0.08, d: 0.8 });
    v.wet(0.5);
    return 1.8;
  },
  legendary(v, t) {
    tn(v, t, { f: 45, fe: 70, sw: 1.2, a: 0.4, pk: 0.4, d: 1.2 });
    [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98].forEach((m, k) => tn(v, t + k * 0.055, { f: mf(m), a: 0.003, pk: 0.09, d: 1.1 }));
    INS.choir(v, t + 0.3, [62, 66, 69, 74], 1.4, { vel: 0.26, att: 0.5, rel: 1.6 });
    INS.bell(v, t + 0.65, 86, { vel: 0.1, dec: 3.5 });
    INS.bell(v, t + 0.65, 93, { vel: 0.05, dec: 3 });
    const s = v.N('w', t, t + 1.6), hp = v.F('highpass', 6500, 0.7), e = v.G(0);
    spikes(e.gain, t, 1.4, 34, 0.18, 0.02);
    s.connect(hp); hp.connect(e); e.connect(v.out);
    v.wet(0.55);
    return 2.4;
  },
  victory(v, t) {
    const d = fanfare(() => v, t, false);
    v.wet(0.4);
    return d;
  },
  death(v, t) {
    INS.taiko(v, t, 1, { f: 80, f1: 32, dec: 1.6 });
    INS.choir(v, t + 0.05, [50, 53, 56], 2.6, { vel: 0.26, att: 0.4, rel: 2.2, vowel: 'o' });
    INS.strings(v, t, [38, 45, 51], 2.8, { vel: 0.26, att: 0.2, rel: 2.5, cut: 700 });
    tn(v, t + 0.2, { w: 'sawtooth', f: mf(62), fe: mf(50), sw: 2.5, a: 0.3, pk: 0.04, d: 2.5, lp: 900 });
    INS.bell(v, t + 0.1, 38, { vel: 0.12, dec: 5 });
    v.wet(0.6);
    return 3.5;
  },
  quest(v, t) {
    [57, 62, 64, 69].forEach((m, k) => INS.pluck(v, t + k * 0.09, m, { vel: 0.2, dec: 1.8, bright: 5, saw: 0.25 }));
    INS.brass(v, t + 0.38, [50, 57, 62, 66], 1.1, { vel: 0.22, att: 0.12, rel: 0.9, bright: 1800 });
    INS.bell(v, t + 0.38, 81, { vel: 0.08, dec: 2.5 });
    v.wet(0.45);
    return 2;
  },
  bossIntro(v, t) {
    nb(v, t, { k: 'p', f: 200, fe: 3000, q: 1.5, a: 1, pk: 0.45, d: 0.05 });
    tn(v, t, { w: 'sawtooth', f: 40, fe: 80, a: 1, pk: 0.08, d: 0.05, lp: 600 });
    const B = t + 1.05;
    INS.taiko(v, B, 1, { f: 75, f1: 30, dec: 1.8 });
    tn(v, B, { f: 42, fe: 32, a: 0.01, pk: 0.5, d: 2.2 });
    INS.brass(v, B, [38, 45, 50, 51], 2.2, { vel: 0.38, att: 0.25, rel: 1.4, bright: 2000, drive: 2 });
    INS.choir(v, B, [50, 53, 56, 59], 2.4, { vel: 0.3, att: 0.3, rel: 2 });
    v.wet(0.6);
    return 4;
  },
  // an Amber Tear's memory: a choir swells, and a bell lets fall the tear (E5 to C5)
  memory(v, t) {
    INS.choir(v, t, [64, 69, 72, 76], 3.4, { vel: 0.24, att: 1.3, rel: 2.6, vowel: 'a' });
    INS.strings(v, t, [45, 52, 57], 3.6, { vel: 0.2, att: 1.1, rel: 2.6, cut: 900 });
    INS.bell(v, t + 0.7, 76, { vel: 0.1, dec: 5 });
    INS.bell(v, t + 1.6, 72, { vel: 0.09, dec: 6 });
    nb(v, t, { k: 'w', ft: 'highpass', f: 6000, q: 0.7, a: 1.2, pk: 0.04, d: 2.4 });
    v.wet(0.75);
    return 4.2;
  },
  // the lantern's motif (A C B E), a waylamp lit: then a warm major third blooms under it
  lantern(v, t) {
    let x = t;
    const seq = MOTIF.map(([m, b]) => { const n = [m, x, b * 0.3 - 0.02]; x += b * 0.3; return n; });
    INS.flute(v, seq, { vel: 0.13 });
    INS.strings(v, t + 0.9, [62, 66, 69], 1.5, { vel: 0.17, att: 0.5, rel: 1.6, cut: 1400 });
    INS.bell(v, t + 0.92, 88, { vel: 0.04, dec: 3 });
    v.wet(0.6);
    return 2.6;
  },
  beacon(v, t) {
    INS.taiko(v, t, 0.6, { f: 95 });
    INS.strings(v, t, [50, 57, 62, 66], 2.6, { vel: 0.3, att: 1, rel: 2, cut: 1700 });
    INS.choir(v, t + 0.2, [62, 66, 69, 74], 2.4, { vel: 0.28, att: 1.2, rel: 2 });
    INS.bell(v, t + 0.3, 74, { vel: 0.12, dec: 4 });
    INS.bell(v, t + 0.9, 81, { vel: 0.09, dec: 4 });
    INS.bell(v, t + 1.5, 86, { vel: 0.08, dec: 4 });
    v.wet(0.6);
    return 4;
  },
};

// ─────────────────────── 6. music: themes + scheduler ───────────────────────

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], dim: [0, 3, 6], sus2: [0, 2, 7], sus4: [0, 5, 7], m7: [0, 3, 7, 10] };
const chordCache = Object.create(null);
function chordOf(name) {
  let c = chordCache[name];
  if (c) return c;
  const r = /^([A-G])([b#]?)(.*)$/.exec(name);
  const pc = (PC[r[1]] + (r[2] === 'b' ? 11 : r[2] === '#' ? 1 : 0)) % 12;
  const ivs = QUAL[r[3]] || QUAL[''];
  c = { name, pc, set: new Set(ivs.map((i) => (pc + i) % 12)) };
  return (chordCache[name] = c);
}

const bassNote = (ch, lo) => lo + ((((ch.pc - lo) % 12) + 12) % 12);
function tones(ch, lo, hi) { const r = []; for (let m = lo; m <= hi; m++) if (ch.set.has(m % 12)) r.push(m); return r; }
function scaleTones(pcs, lo, hi) { const r = []; for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) r.push(m); return r; }
function nearest(arr, m) { let b = arr[0]; for (const x of arr) if (Math.abs(x - m) < Math.abs(b - m)) b = x; return b; }

// close-position voicing in [lo, hi] with smooth voice leading from `prev` (plus a little randomness)
function voicing(ch, lo, hi, prev, n) {
  let best = null, bs = 1e9;
  for (let s = lo; s < lo + 12; s++) {
    if (!ch.set.has(s % 12)) continue;
    const v = [s];
    for (let x = s + 1; v.length < n && x <= hi; x++) if (ch.set.has(x % 12)) v.push(x);
    if (v.length < n) continue;
    let sc = Math.random() * 3;
    if (prev) for (let k = 0; k < n; k++) sc += Math.abs(v[k] - (prev[k] ?? prev[prev.length - 1]));
    if (sc < bs) { bs = sc; best = v; }
  }
  return best || tones(ch, lo, lo + 24).slice(0, n);
}

// mode adjusted to the chord (e.g. C → C# over an A major chord in D minor)
function scaleFor(base, ch) {
  const s = new Set(base);
  for (const pc of ch.set) {
    if (s.has(pc)) continue;
    if (s.has((pc + 11) % 12)) s.delete((pc + 11) % 12); else s.delete((pc + 1) % 12);
    s.add(pc);
  }
  return s;
}

const RHY4 = [[2, 1, 1], [1, 1, 2], [3, 1], [1.5, 0.5, 2], [1, 0.5, 0.5, 2], [2, 2], [1, 1, 1, 1], [1.5, 0.5, 1, 1]];
const RHY3 = [[2, 1], [1, 1, 1], [1.5, 0.5, 1], [1, 2], [3]];

// generative phrase over a chord list (one bar per chord): chord tones on strong beats, stepwise
// motion elsewhere, arch contour, long cadence note. Returns [[midi|null, beats], ...].
function genMelody(chords, beats, base, lo, hi, start, restP = 0.1) {
  const out = [];
  let m = start;
  chords.forEach((ch, b) => {
    const sc = scaleFor(base, ch), pool = [];
    for (let x = lo; x <= hi; x++) if (sc.has(x % 12)) pool.push(x);
    const ct = pool.filter((x) => ch.set.has(x % 12));
    const last = b === chords.length - 1, dir = b < chords.length / 2 ? 1 : -1;
    const rhy = last ? (beats === 3 ? pick([[3], [2, 1]]) : pick([[4], [3, 1], [2, 2]])) : pick(beats === 3 ? RHY3 : RHY4);
    let beat = 0;
    rhy.forEach((d, k) => {
      const strong = beat === 0 || (beats === 4 && beat === 2), fin = last && k === rhy.length - 1;
      if (!strong && !fin && chance(restP)) { out.push([null, d]); beat += d; return; }
      if (strong || fin) {
        const near = ct.filter((x) => Math.abs(x - m) <= (fin ? 7 : 5)), c = near.length ? near : ct;
        if (fin) { const roots = c.filter((x) => x % 12 === ch.pc); m = nearest(roots.length ? roots : c, m); } else m = pick(c);
      } else {
        const i = pool.indexOf(nearest(pool, m)), st = pick([1, 1, 1, 2, -1, 0]) * (chance(0.7) ? dir : -dir);
        m = pool[clamp(i + st, 0, pool.length - 1)];
      }
      out.push([m, d]);
      beat += d;
    });
  });
  return out;
}

// the title's main theme (D minor), one entry per progression 0 / 1
const MAIN = [
  [[69, 2], [74, 1], [76, 1], [77, 3], [76, 0.5], [74, 0.5], [72, 2], [69, 1], [72, 1], [74, 1.5], [72, 0.5], [67, 2]],
  [[69, 1], [74, 1], [77, 1.5], [76, 0.5], [74, 2], [70, 1], [74, 1], [77, 1.5], [79, 0.5], [77, 1], [74, 1], [76, 3], [73, 1]],
];

const ARP8 = [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 1], [0, null, 2, null, 4, null, 3, null], [0, 1, 2, null, 3, null, 2, null], [null, 0, 1, 2, null, 3, 4, 2], [0, 2, 4, 5, 4, 2, null, null]];
const ARP6 = [[null, 1, 2, 3, 2, 1], [null, 0, 2, 1, 3, 2], [null, 2, 1, 3, 2, 4], [null, 1, null, 2, null, 3], [null, 1, 2, 3, 4, 2]];

// war-drum layer on a 16th grid (velocities); os = ostinato semitone offsets from the chord's bass (null = rest)
const DRUMS = {
  march: {
    tk: [1, 0, 0, 0, 0, 0, 0, 0.45, 0.9, 0, 0, 0, 0, 0, 0.55, 0],
    tm: [0, 0, 0, 0, 0.55, 0, 0, 0, 0, 0, 0.4, 0, 0.65, 0, 0, 0],
    rm: [0, 0, 0.3, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0],
    os: [0, null, 0, null, 0, null, 12, null, 0, null, 0, null, 7, null, 0, null],
    os16: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 7, 12],
    osAt: 0.45,
  },
  heavy: {
    tk: [1, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0.45, 0],
    tm: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    rm: null,
    os: [0, null, null, null, 0, null, null, null, 0, null, null, null, 0, null, 1, null],
    tf: 85, osAt: 0.5,
  },
  // 3/4 on a twelve-cell bar: a frame-drum heartbeat (lub-dub on one), soft toms on two and three
  waltz: {
    tk: [1, 0, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tm: [0, 0, 0, 0, 0.5, 0, 0, 0, 0.45, 0, 0, 0.3, 0, 0, 0, 0],
    rm: [0, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.3, 0, 0, 0, 0, 0],
    os: [0, null, null, null, 7, null, null, null, 12, null, null, null, null, null, null, null],
    tf: 72, osAt: 0.55,
  },
  // 6/8 on a twelve-cell bar (three beats of two): the weight on one and four (Karthax)
  six: {
    tk: [1, 0, 0, 0, 0, 0, 0.85, 0, 0, 0, 0.4, 0, 0, 0, 0, 0],
    tm: [0, 0, 0, 0, 0.45, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0],
    rm: [0, 0, 0.35, 0, 0, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0],
    os: [0, null, null, null, 0, null, 6, null, null, null, 6, null, null, null, null, null],
    tf: 78, osAt: 0.2,
  },
  boss: {
    tk: [1, 0, 0, 0.55, 0, 0, 0.8, 0, 0.95, 0, 0, 0.55, 0, 0, 0.7, 0.45],
    tm: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    rm: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0.35],
    os: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 7],
    osAt: 0,
  },
};

const nv = (th, dest) => { const v = new Voice(th.g, dest || th.out, 1, 0, th); v.wetTo = th.rev; return v; };

function phrase(th, t, mel, spb, o) {
  const seq = [];
  let x = t;
  for (const [m, b] of mel) { const d = b * spb; if (m != null) seq.push([m + (o.tr || 0), x, d - 0.025]); x += d; }
  if (seq.length) INS.flute(nv(th), seq, o);
}

function drumStep(S, P) {
  const { th, lvl } = S;
  if (lvl < 0.04) return;
  // dt: grid cycles per bar (2 = double-time drums over a slow theme)
  const dt = th.def.dt || 1, per = (4 / th.def.sub) * dt, d16 = S.sd / per, root = bassNote(S.ch, 36);
  const os = lvl > 0.75 && P.os16 ? P.os16 : P.os, dest = th.int;
  for (let k = 0; k < per; k++) {
    const cell = S.i * per + k, s = cell % 16, t = S.t + k * d16 + rand(0, 0.006);
    const fill = S.bar % 4 === 3 && cell >= 16 * dt - 4;
    const tk = P.tk[s];
    if (tk && (tk >= 0.7 || lvl > 0.35)) INS.taiko(nv(th, dest), t, tk * 0.5, { f: P.tf || 110 });
    let tm = P.tm[s];
    if (fill && lvl > 0.55) tm = 0.3 + (s - 12) * 0.12;
    if (tm && lvl > 0.3) INS.tom(nv(th, dest), t, tm * 0.5, { f: s >= 12 ? 230 - (s - 12) * 25 : 190 });
    if (P.rm && P.rm[s] && lvl > 0.6) INS.rim(nv(th, dest), t, P.rm[s] * 0.8);
    if (os && os[s] != null && lvl > P.osAt) {
      let n = 1;
      while (n < 16 && os[(s + n) % 16] == null) n++;
      INS.ost(nv(th, dest), t, root + os[s], n * d16 * 0.85, 0.13);
    }
  }
}

// what the story tells the music: the First Autumn has come (weep, heart), how near the Heart Chamber is (0-1, the
// heartbeat's tempo), and the Lady's phase (her waltz gains brass)
const MOOD = { autumn: false, near: 0, phase: 0, heat: 0, night: 0, seen: false, breath: 0, roar: 0, keeper: 0, answer: 0 };
// what the story may set, and how far (Act IV: the Forge's heat runs from -1, cold, to 3; a keeper 1-3; a far fire 1-4).
// breath, roar, keeper and answer are moments: the theme playing takes them on its next step and clears them.
const MOOD_RANGE = { heat: [-1, 3], keeper: [0, 3], answer: [0, 4], breath: [0, 1], roar: [0, 1] };
// Act IV: the lantern's motif (A C B E, [midi, beats]); it resolves to D at the very end
const MOTIF = [[69, 1.5], [72, 0.5], [71, 1], [76, 2.5]];
function motif(th, t, beat, o = {}) {
  let x = t;
  const seq = MOTIF.map(([m, b]) => { const n = [m + (o.tr || 0), x, b * beat - 0.02]; x += b * beat; return n; });
  if (o.resolve) seq.push([74 + (o.tr || 0), x, beat * 3]);
  INS.flute(nv(th), seq, { vel: o.vel ?? 0.1, wet: o.wet ?? 0.6 });
}
// the motif on a pure sine, alone in the dark
function sineLine(v, seq, vel) { for (const [m, s, d] of seq) tn(v, s, { f: mf(m), a: 0.12, pk: vel, d: d + 0.8 }); v.wet(0.7); }
// the Forge's breath in the music: an inhale swell over the 2 s telegraph, then the exhale's roar
function inhale(v, t, d) {
  const s = v.N('p', t, t + d + 0.2), bp = v.F('bandpass', 200, 1), e = v.G(0);
  bp.frequency.setValueAtTime(160, t); bp.frequency.exponentialRampToValueAtTime(1000, t + d);
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.32, t + d * 0.92); e.gain.linearRampToValueAtTime(0, t + d + 0.1);
  s.connect(bp); bp.connect(e); e.connect(v.out);
  v.wet(0.5);
}
function exhale(v, t) { roar(v, t, 46, 1.1, 0.3, 4); nb(v, t, { k: 'p', ft: 'lowpass', f: 2600, fe: 300, q: 0.8, a: 0.03, pk: 0.35, d: 1.1 }); v.wet(0.4); }
// a keeper's statue breaks: a breath of its old music (the crypt's bell, the halls' anvil, the Lady's harp)
function keeperMotif(th, t, k, bd) {
  if (k === 1) { INS.bell(nv(th), t, 48, { vel: 0.12, dec: 6, wet: 0.7 }); INS.choir(nv(th), t, [60, 63, 67], bd * 2, { vel: 0.16, att: 0.4, rel: 1.6, vowel: 'o', wet: 0.6 }); }
  else if (k === 2) { for (const d of [0, bd / 2]) metal(nv(th), t + d, 330, [1, 2.76, 5.4, 8.93], 1, 0.06); INS.choir(nv(th), t, [52, 55, 59], bd * 2, { vel: 0.16, att: 0.4, rel: 1.6, vowel: 'o', wet: 0.6 }); }
  else { [57, 60, 64, 69, 64, 60].forEach((m, i) => INS.pluck(nv(th), t + i * bd / 6, m, { vel: 0.1, dec: 1.2, bright: 5, saw: 0.2, wet: 0.5 })); INS.choir(nv(th), t, [64, 69, 72], bd * 2, { vel: 0.15, att: 0.5, rel: 1.8, vowel: 'a', wet: 0.6 }); }
}
// the Field of Ash: D phrygian under the falling ash, D major at dawn
const ASH_PROGS = [['Dm', 'Eb', 'Dm', 'C'], ['Dm', 'Bb', 'Eb', 'Dm'], ['Gm', 'Eb', 'Dm', 'Dm'], ['Dm', 'C', 'Bb', 'Eb']];
const ASH_DAWN = [['D', 'G', 'D', 'A'], ['Bm', 'G', 'D', 'A'], ['D', 'Em', 'G', 'D']];
// the title's theme, its first phrase turned to D major: what the village sings as the fires answer
const ANSWER = [[69, 2], [74, 1], [76, 1], [78, 3], [76, 0.5], [74, 0.5], [73, 2], [74, 2]];
const WEEP_PROGS = [['Am', 'F', 'C', 'G'], ['Am', 'Dm', 'F', 'E'], ['F', 'C', 'Dm', 'Am'], ['Am', 'G', 'F', 'E']];
const WEEP_AUT = [['Am', 'F', 'C', 'G'], ['F', 'C', 'G', 'A'], ['Am', 'Dm', 'F', 'E'], ['C', 'G', 'Am', 'A']];
// the Heartwood's heartbeat: a low, filtered thump
function thump(v, t, vel) {
  tn(v, t, { f: 62, fe: 34, sw: 0.14, a: 0.006, pk: vel, d: 0.32 });
  nb(v, t, { k: 'b', ft: 'lowpass', f: 160, q: 0.8, a: 0.005, pk: vel * 0.5, d: 0.18 });
}
// old wood under strain
function creak(v, t) {
  nb(v, t, { k: 'b', f: rand(380, 620), q: 4, a: rand(0.05, 0.15), pk: 0.12, d: rand(0.4, 0.8), am: [rand(14, 26), 0.85] });
  v.wet(0.6);
}
// a small bird, after the First Autumn
function bird(v, t) {
  const n = 2 + ((Math.random() * 3) | 0), f = rand(2800, 4200);
  for (let k = 0; k < n; k++) tn(v, t + k * rand(0.09, 0.14), { f: f * rand(0.95, 1.1), fe: f * rand(1.2, 1.5), sw: 0.06, a: 0.004, pk: 0.035, d: 0.07 });
  v.wet(0.7);
}

// Theme definitions. bar(S) runs on each bar's first step, step(S) on every step.
// S: { g, th, d, t, i (step in bar), sd (step s), bd (bar s), cd (chord s), bar, ch (chord), nc (new chord), lvl }
const THEMES = {
  title: {
    bpm: 60, beats: 4, sub: 2, gain: 0.85, order: [0, 1], scale: [2, 4, 5, 7, 9, 10, 0],
    progs: [['Dm', 'Bb', 'F', 'C'], ['Dm', 'Gm', 'Bb', 'A'], ['Dm', 'Bb', 'Gm', 'A'], ['Bb', 'F', 'C', 'Dm'], ['Gm', 'Dm', 'Bb', 'A'], ['Dm', 'C', 'Bb', 'A']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      st.pv = voicing(ch, 55, 72, st.pv, 4);
      INS.strings(nv(th), t, st.pv, bd + 0.3, { vel: 0.3, att: 1.3, rel: 2.4, cut: rand(800, 1300), wet: 0.2 });
      INS.strings(nv(th), t, [bassNote(ch, 38)], bd + 0.2, { vel: 0.16, att: 0.8, rel: 2, cut: 420 });
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 38, bd * 8 + 1, { vel: 0.1 });
      if (th.cycle % 2 === 1) {
        st.cv = voicing(ch, 57, 70, st.cv, 3);
        INS.choir(nv(th), t, st.cv, bd, { vel: 0.17, att: 1.5, rel: 2.2, wet: 0.5 });
      }
      if (S.nc && th.ci === 0) {
        const mel = th.pi < 2 && th.cycle % 4 < 2 ? MAIN[th.pi]
          : chance(0.65) ? genMelody(th.prog.map(chordOf), 4, S.d.scale, 64, 81, 72) : null;
        if (mel) phrase(th, t, mel, S.sd * S.d.sub, { vel: 0.11, wet: 0.45 });
      }
    },
    step(S) {
      const { th, i } = S, st = th.st;
      if (i === 0) { st.arp = pick(ARP8); st.at = tones(S.ch, 62, 84); }
      const k = st.arp[i];
      if (k == null || (th.cycle === 0 && chance(0.45))) return;
      INS.pluck(nv(th), S.t + rand(0, 0.01), st.at[Math.min(k, st.at.length - 1)], { vel: rand(0.1, 0.14), dec: 2.2, bright: 4, saw: 0.15, wet: 0.5 });
    },
  },

  town: {
    bpm: 72, beats: 3, sub: 2, order: [0], scale: [0, 2, 4, 5, 7, 9, 11],
    progs: [['Dm', 'C', 'G', 'Dm'], ['Am', 'F', 'G', 'Am'], ['Dm', 'F', 'C', 'G'], ['Am', 'G', 'F', 'Em'], ['F', 'C', 'Dm', 'Am'], ['Dm', 'Am', 'C', 'Dm']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      st.pv = voicing(ch, 53, 69, st.pv, 3);
      INS.strings(nv(th), t, st.pv, bd + 0.2, { vel: 0.17, att: 0.9, rel: 1.8, cut: 760 });
      INS.pluck(nv(th), t, bassNote(ch, 38), { vel: 0.22, dec: 2.2, bright: 3, saw: 0.35 });
      if (S.nc && th.ci === 0 && chance(0.7)) {
        phrase(th, t, genMelody(th.prog.map(chordOf), 3, S.d.scale, 67, 81, 74), S.sd * S.d.sub, { vel: 0.1, wet: 0.35 });
      }
      if (chance(0.06)) INS.bell(nv(th), t + rand(0.5, 1.5), pick([81, 86, 88]), { vel: 0.035, dec: 4, wet: 0.8 });
    },
    step(S) {
      const { th, i } = S, st = th.st;
      if (i === 0) { st.arp = pick(ARP6); st.at = tones(S.ch, 55, 76); }
      const k = st.arp[i];
      if (k != null) INS.pluck(nv(th), S.t + rand(0, 0.012), st.at[Math.min(k, st.at.length - 1)], { vel: rand(0.1, 0.13), dec: 1.3, bright: 7, saw: 0.5, wet: 0.2 });
    },
  },

  forest: {
    bpm: 66, beats: 4, sub: 2, bpc: 2, gain: 1.35, drums: 'march', dt: 2, scale: [4, 5, 7, 9, 11, 0, 2],
    progs: [['Em', 'F', 'Em', 'C'], ['Em', 'Am', 'F', 'Em'], ['Em', 'C', 'D', 'B'], ['Am', 'Em', 'F', 'Em'], ['Em', 'Dm', 'F', 'Em']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 28, bd * 8 + 2, { vel: 0.16 });
      if (S.nc) {
        st.pv = voicing(ch, 52, 67, st.pv, 3);
        INS.strings(nv(th), t, st.pv, S.cd + 0.5, { vel: 0.15, att: 2.2, rel: 3, cut: 620, wet: 0.4 });
      }
      if (chance(0.35)) INS.whisper(nv(th), t + rand(0, bd * 0.5), rand(2.5, 4.5), { vel: 0.1, wet: 0.6 });
      if (chance(0.12)) INS.bell(nv(th), t + rand(0, bd), pick([64, 71, 76]), { vel: 0.045, dec: 5, wet: 0.9 });
      if (S.nc && th.ci === 0 && chance(0.35)) {
        const c = th.prog.map(chordOf);
        phrase(th, t + bd, genMelody([c[0], c[1], c[1]], 4, S.d.scale, 59, 74, 64, 0.3), S.sd * S.d.sub, { vel: 0.08, wet: 0.7 });
      }
    },
    step(S) {
      if (!chance(0.15)) return;
      const th = S.th, m = pick(scaleTones(S.d.scale, 64, 83));
      INS.pluck(nv(th), S.t, m, { vel: rand(0.06, 0.1), dec: 3, bright: 3, saw: 0.1, wet: 0.9 });
      if (chance(0.3)) INS.pluck(nv(th), S.t + S.sd * 3, m, { vel: 0.035, dec: 3, bright: 2.5, saw: 0.05, wet: 1 });
    },
  },

  crypt: {
    bpm: 54, beats: 4, sub: 2, bpc: 2, drums: 'heavy', scale: [0, 1, 3, 5, 7, 8, 10],
    progs: [['Cm', 'Ab', 'Fm', 'G'], ['Cm', 'Db', 'Cm', 'G'], ['Fm', 'Cm', 'Db', 'Cm'], ['Cm', 'Bbm', 'Ab', 'G'], ['Cm', 'Ab', 'Db', 'Cm']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 24, bd * 8 + 3, { vel: 0.18 });
      if (S.nc) {
        const v = (st.pv = voicing(ch, 52, 67, st.pv, 3)).slice();
        if (chance(0.3)) v.push(v[1] + 1); // minor-2nd cluster
        INS.choir(nv(th), t, v, S.cd, { vel: 0.2, att: 2.5, rel: 3, vowel: pick(['a', 'o', 'o']), wet: 0.5 });
        const b = bassNote(ch, 36);
        INS.strings(nv(th), t, [b, b + 7], S.cd, { vel: 0.14, att: 2.5, rel: 3, cut: 420 });
        if (chance(0.45)) INS.bell(nv(th), t + rand(0, S.cd * 0.5), pick([48, 43, 36]), { vel: 0.11, dec: 7, wet: 0.7 });
      }
    },
    step(S) {
      if (!chance(0.05)) return;
      const th = S.th, m = pick(scaleTones(S.d.scale, 72, 88));
      INS.pluck(nv(th), S.t, m, { vel: 0.045, dec: 2.5, bright: 2, saw: 0.05, wet: 1 });
      if (chance(0.4)) INS.pluck(nv(th), S.t + S.sd, m + 1, { vel: 0.03, dec: 2.5, bright: 2, saw: 0.05, wet: 1 });
    },
  },

  boss: {
    bpm: 116, beats: 4, sub: 4, gain: 0.85, int: 'always', drums: 'boss', order: [0], scale: [2, 4, 5, 7, 9, 10, 0],
    progs: [['Dm', 'Bb', 'C', 'A'], ['Dm', 'Bb', 'Gm', 'A'], ['Dm', 'Eb', 'Dm', 'C'], ['Cm', 'Ab', 'Bb', 'G']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, r = bassNote(ch, 38);
      INS.brass(nv(th), t, [r, r + 7, r + 12], bd * 0.42, { vel: 0.3, att: 0.03, rel: 0.25, bright: 2400, drive: 1.5, wet: 0.2 });
      st.pv = voicing(ch, 62, 79, st.pv, 3);
      INS.strings(nv(th), t, st.pv, bd - 0.1, { vel: 0.16, att: 0.3, rel: 0.6, cut: 2400 });
      if (S.bar % 2 === 0) INS.choir(nv(th), t, voicing(ch, 55, 70, null, 3), bd * 0.8, { vel: 0.2, att: 0.06, rel: 0.7, wet: 0.4 });
    },
    step(S) {
      const { th, i } = S;
      if (S.bar % 2 === 1 && (i === 6 || i === 10 || i === 14)) {
        const r = bassNote(S.ch, 50);
        INS.brass(nv(th), S.t, [r, r + 7], i === 14 ? 0.1 : 0.16, { vel: i === 14 ? 0.16 : 0.22, att: 0.015, rel: 0.12, bright: 2800, drive: 1.5 });
      }
    },
  },

  gate: {
    bpm: 95, beats: 4, sub: 4, drums: 'march', scale: [9, 10, 0, 2, 4, 5, 7],
    progs: [['Am', 'Bb', 'Am', 'G'], ['Am', 'F', 'Dm', 'E'], ['Am', 'C', 'G', 'E'], ['Dm', 'Am', 'Bb', 'E']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 33, bd * 8 + 2, { vel: 0.15 });
      st.pv = voicing(ch, 52, 69, st.pv, 3);
      INS.strings(nv(th), t, st.pv, bd + 0.2, { vel: 0.15, att: 0.6, rel: 1.4, cut: 950, wet: 0.3 });
      if (S.bar % 2 === 0) INS.choir(nv(th), t, voicing(ch, 57, 69, null, 3), bd, { vel: 0.13, att: 0.8, rel: 1.5, vowel: 'o', wet: 0.5 });
      if (chance(0.1)) INS.bell(nv(th), t + rand(0, bd), pick([57, 64, 69]), { vel: 0.06, dec: 5, wet: 0.8 });
      if (S.nc && th.ci === 0 && chance(0.4)) { // ominous horn call: root – b2 – root
        const r = bassNote(chordOf(th.prog[2]), 45), h = t + bd * 2;
        INS.brass(nv(th), h, [r], bd * 0.6, { vel: 0.14, att: 0.25, rel: 0.5, bright: 900, wet: 0.5 });
        INS.brass(nv(th), h + bd * 0.7, [r + 1], bd * 0.2, { vel: 0.13, att: 0.1, rel: 0.3, bright: 900, wet: 0.5 });
        INS.brass(nv(th), h + bd, [r], bd * 0.8, { vel: 0.14, att: 0.15, rel: 0.8, bright: 900, wet: 0.5 });
      }
    },
    step(S) {
      const { th, i } = S;
      if (i % 2 === 0) INS.ost(nv(th), S.t, bassNote(S.ch, 40) + (i === 12 ? 7 : 0), S.sd * 1.7, 0.08, { br: 6 });
      if (chance(0.06)) INS.pluck(nv(th), S.t, pick(scaleTones(S.d.scale, 69, 84)), { vel: 0.05, dec: 2, bright: 3, saw: 0.1, wet: 0.9 });
    },
  },

  // the Giants' Stair: wind, open strings, a lone horn far up the mountain (D dorian)
  pass: {
    bpm: 62, beats: 3, sub: 2, bpc: 2, gain: 1.25, drums: 'march', dt: 2, scale: [2, 4, 5, 7, 9, 11, 0],
    progs: [['Dm', 'C', 'Dm', 'Am'], ['Dm', 'F', 'C', 'Dm'], ['Bb', 'F', 'C', 'Dm'], ['Dm', 'Am', 'Bb', 'C'], ['Dm', 'Csus2', 'Bb', 'Am']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 26, bd * 8 + 2, { vel: 0.15 });
      if (S.nc) {
        st.pv = voicing(ch, 50, 67, st.pv, 3);
        INS.strings(nv(th), t, st.pv, S.cd + 0.6, { vel: 0.14, att: 2.4, rel: 3.2, cut: 720, wet: 0.5 });
      }
      if (chance(0.35)) INS.whisper(nv(th), t + rand(0, bd * 0.5), rand(3, 5), { vel: 0.12, wet: 0.7 });
      if (chance(0.15)) INS.bell(nv(th), t + rand(0, bd), pick([74, 81, 86]), { vel: 0.04, dec: 6, wet: 0.95 });
      if (S.nc && th.ci === 0 && chance(0.45)) {
        const r = bassNote(ch, 50), h = t + bd * 0.5;
        INS.brass(nv(th), h, [r], bd * 0.9, { vel: 0.1, att: 0.5, rel: 1, bright: 800, wet: 0.7 });
        INS.brass(nv(th), h + bd, [r + 7], bd * 1.4, { vel: 0.09, att: 0.4, rel: 1.4, bright: 800, wet: 0.7 });
      }
    },
    step(S) {
      if (!chance(0.1)) return;
      const th = S.th, m = pick(scaleTones(S.d.scale, 69, 86));
      INS.pluck(nv(th), S.t, m, { vel: rand(0.05, 0.08), dec: 3.5, bright: 2.5, saw: 0.05, wet: 0.95 });
    },
  },

  // the Halls of Deepstone: a low choir under the mountain and a far-off anvil keeping time (E phrygian)
  halls: {
    bpm: 58, beats: 4, sub: 2, bpc: 2, drums: 'heavy', scale: [4, 5, 7, 9, 11, 0, 2],
    progs: [['Em', 'F', 'Em', 'Dm'], ['Em', 'C', 'F', 'Em'], ['Am', 'F', 'Em', 'Em'], ['Em', 'Dm', 'C', 'F']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 28, bd * 8 + 3, { vel: 0.2 });
      if (S.nc) {
        st.pv = voicing(ch, 43, 58, st.pv, 3);
        INS.choir(nv(th), t, st.pv, S.cd, { vel: 0.22, att: 2.2, rel: 3, vowel: 'o', wet: 0.55 });
        const b = bassNote(ch, 33);
        INS.strings(nv(th), t, [b, b + 7], S.cd, { vel: 0.15, att: 2, rel: 3, cut: 380 });
      }
      if (S.bar % 2 === 0) for (const k of [0, 3]) metal(nv(th), t + k * S.sd, 330 * rand(0.98, 1.02), [1, 2.76, 5.4, 8.93], 0.9, k ? 0.035 : 0.05);
      if (chance(0.2)) INS.bell(nv(th), t + rand(0, bd), pick([40, 45, 52]), { vel: 0.1, dec: 7, wet: 0.7 });
    },
    step(S) {
      if (!chance(0.04)) return;
      const th = S.th, m = pick(scaleTones(S.d.scale, 64, 79));
      INS.pluck(nv(th), S.t, m, { vel: 0.05, dec: 2.5, bright: 2, saw: 0.05, wet: 1 });
    },
  },

  // the Weeping Woods: a lament in A aeolian for a forest that cannot die (3/4). High women's choir over low strings, a harp
  // climbing in broken sixes, an A drone, the 'tear' (a bell falling E5 to C5) and the Lady's whisper; a frame-drum
  // heartbeat when it fights. After the First Autumn the whisper goes, the drone lightens, the tear rises and birds sing.
  weep: {
    bpm: 56, beats: 3, sub: 2, bpc: 2, gain: 1.3, drums: 'waltz', scale: [9, 11, 0, 2, 4, 5, 7],
    get progs() { return MOOD.autumn ? WEEP_AUT : WEEP_PROGS; },
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, aut = MOOD.autumn;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, aut ? 45 : 33, bd * 8 + 2, { vel: aut ? 0.07 : 0.13 });
      if (S.nc) {
        st.pv = voicing(ch, 45, 60, st.pv, 3);
        INS.strings(nv(th), t, st.pv, S.cd + 0.4, { vel: 0.14, att: 1.8, rel: 3, cut: 600, wet: 0.4 });
        st.cv = voicing(ch, 64, 76, st.cv, 3);
        INS.choir(nv(th), t + 0.1, st.cv, S.cd, { vel: aut ? 0.12 : 0.15, att: 3, rel: 3.5, vowel: 'a', wet: 0.6 });
      }
      // the tear: a drop falling (rising, once the wood is free)
      if (S.bar % 8 === 4) {
        const [a, b] = aut ? [72, 76] : [76, 72];
        INS.bell(nv(th), t, a, { vel: 0.07, dec: 6, wet: 0.95 });
        INS.bell(nv(th), t + S.sd * 3, b, { vel: 0.065, dec: 7, wet: 0.95 });
      }
      if (!aut && chance(0.22)) INS.whisper(nv(th), t + rand(0, bd * 0.5), rand(3, 5), { vel: 0.08, wet: 0.7 });
      if (aut && chance(0.35)) bird(nv(th), t + rand(0, bd));
      if (S.nc && th.ci === 0 && chance(0.3)) {
        const c = th.prog.map(chordOf);
        phrase(th, t + bd, genMelody([c[0], c[1], c[1]], 3, S.d.scale, 64, 79, 69, 0.3), S.sd * S.d.sub, { vel: 0.07, wet: 0.75 });
      }
    },
    step(S) {
      // the harp: rising figures of six with gaps, one bar in two
      const { th, i } = S, st = th.st;
      if (i === 0) { st.harp = S.bar % 2 === 0 || chance(0.25); st.at = tones(S.ch, 57, 84); st.o = (Math.random() * 3) | 0; }
      if (!st.harp || chance(0.18)) return;
      const m = st.at[Math.min(st.o + i, st.at.length - 1)];
      INS.pluck(nv(th), S.t + rand(0, 0.012), m, { vel: rand(0.07, 0.1), dec: 3.4, bright: 4, saw: 0.12, wet: 0.8 });
    },
  },

  // the Heartwood: inside the First Oak, D phrygian dominant (the Greek dromos of laments). A low choir on 'o' with
  // clusters, a heartbeat that quickens as the Heart Chamber nears (bpm follows MOOD.near), creaking wood, sap dripping.
  // After the First Autumn the heart is still.
  heart: {
    get bpm() { return MOOD.autumn ? 46 : 48 + 12 * MOOD.near; },
    beats: 4, sub: 2, bpc: 2, gain: 1.25, drums: 'heavy', scale: [2, 3, 6, 7, 9, 10, 0],
    progs: [['D', 'Eb', 'D', 'D'], ['Gm', 'Cm', 'D', 'D'], ['D', 'Eb', 'Cm', 'D'], ['Gm', 'Eb', 'D', 'D']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, aut = MOOD.autumn;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 26, bd * 8 + 3, { vel: aut ? 0.1 : 0.17 });
      if (S.nc) {
        const v = (st.pv = voicing(ch, 43, 58, st.pv, 3)).slice();
        if (!aut && chance(0.3)) v.push(v[1] + 1);
        INS.choir(nv(th), t, v, S.cd, { vel: aut ? 0.15 : 0.2, att: 2.4, rel: 3, vowel: 'o', wet: 0.55 });
        const b = bassNote(ch, 33);
        INS.strings(nv(th), t, [b, b + 7], S.cd, { vel: 0.13, att: 2, rel: 3, cut: 380 });
      }
      // the heart: a thump on one and another just after
      if (!aut) for (const [dt, a] of [[0, 1], [0.4, 0.7]]) thump(nv(th), t + dt * S.sd * S.d.sub, a * (0.5 + 0.35 * MOOD.near));
      if (chance(aut ? 0.15 : 0.3)) creak(nv(th), t + rand(0, bd));
      if (aut && chance(0.3)) INS.whisper(nv(th), t + rand(0, bd * 0.5), rand(3, 5), { vel: 0.06, wet: 0.6 });
    },
    step(S) {
      if (!chance(MOOD.autumn ? 0.03 : 0.06)) return;
      INS.pluck(nv(S.th), S.t, pick([86, 88, 91, 93, 95]), { vel: 0.03, dec: 0.7, bright: 2, saw: 0.05, wet: 1 });
    },
  },

  // the Lady's fight: a waltz of grief in A minor (3/4). Harp ostinato and choir; brass and drums come in with her
  // second phase (MOOD.phase), and in the last the tear is sounded by the low brass.
  amaranthe: {
    bpm: 132, beats: 3, sub: 2, gain: 0.9, int: 'always', drums: 'waltz', dt: 1, order: [0], scale: [9, 11, 0, 2, 4, 5, 7],
    progs: [['Am', 'F', 'Dm', 'E'], ['Am', 'G', 'F', 'E'], ['Dm', 'Am', 'Bb', 'E'], ['Am', 'Dm', 'E', 'Am']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, ph = MOOD.phase;
      const r = bassNote(ch, 33);
      INS.pluck(nv(th), t, r, { vel: 0.22, dec: 1.6, bright: 3, saw: 0.3 });
      st.cv = voicing(ch, 62, 76, st.cv, 3);
      if (S.bar % 2 === 0) INS.choir(nv(th), t, st.cv, bd * 2, { vel: 0.17, att: 0.3, rel: 1, vowel: 'a', wet: 0.5 });
      st.pv = voicing(ch, 50, 64, st.pv, 3);
      INS.strings(nv(th), t, st.pv, bd, { vel: 0.13, att: 0.2, rel: 0.5, cut: 1600 });
      if (ph >= 1) INS.brass(nv(th), t, [r + 12, r + 19], bd * 0.45, { vel: 0.22, att: 0.03, rel: 0.25, bright: 2200, drive: 1.3 });
      if (ph >= 2 && S.bar % 8 === 4) { INS.brass(nv(th), t, [40], bd * 0.9, { vel: 0.26, att: 0.1, rel: 0.6, bright: 1200 }); INS.brass(nv(th), t + bd, [36], bd * 1.2, { vel: 0.26, att: 0.1, rel: 0.9, bright: 1200 }); }
    },
    step(S) {
      const { th, i } = S, st = th.st;
      if (i === 0) st.at = tones(S.ch, 57, 81);
      INS.pluck(nv(th), S.t + rand(0, 0.006), st.at[[0, 2, 1, 3, 2, 4][i] % st.at.length], { vel: i % 2 ? 0.07 : 0.1, dec: 0.9, bright: 5, saw: 0.2, wet: 0.35 });
    },
  },

  // ── Act IV ──
  // the Field of Ash: about 60 bpm in D phrygian. A low bowed drone and an organ pad, D against E-flat, the ash wind; far off
  // every 20-30 s the Lampless horn, a falling fourth. No drums: only a frame-drum heartbeat while the dead have seen her.
  // Under the stars after the Unmaking: no wind, high bells; at dawn D major, and a lark.
  ashfield: {
    bpm: 60, beats: 4, sub: 2, bpc: 2, gain: 1.3,
    get scale() { return MOOD.night === 2 ? [2, 4, 6, 7, 9, 11, 1] : [2, 3, 5, 7, 9, 10, 0]; },
    get progs() { return MOOD.night === 2 ? ASH_DAWN : ASH_PROGS; },
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, n = MOOD.night;
      if (S.bar % 8 === 0) { INS.drone(nv(th), t, 26, bd * 8 + 2, { vel: n === 2 ? 0.08 : 0.16 }); if (n === 0) INS.drone(nv(th), t + bd, 27, bd * 6, { vel: 0.045, cut: 300 }); }
      if (S.nc) {
        st.pv = voicing(ch, 43, 60, st.pv, 3);
        INS.strings(nv(th), t, st.pv, S.cd + 0.4, { vel: n === 2 ? 0.12 : 0.15, att: 2.2, rel: 3, cut: n === 2 ? 950 : 560, wet: 0.45 });
        if (n === 0) INS.choir(nv(th), t + 0.2, voicing(ch, 50, 62, null, 3), S.cd, { vel: 0.07, att: 3, rel: 3, vowel: 'o', wet: 0.6 });
      }
      if (n === 0 && chance(0.35)) INS.whisper(nv(th), t + rand(0, bd * 0.5), rand(3, 5), { vel: 0.1, wet: 0.6 });
      if (n === 0 && t >= (st.horn ??= t + rand(6, 12))) {
        st.horn = t + rand(20, 30);
        const h = t + rand(0, bd * 0.5);
        INS.brass(nv(th), h, [62], bd * 0.45, { vel: 0.09, att: 0.3, rel: 0.6, bright: 800, wet: 0.85 });
        INS.brass(nv(th), h + bd * 0.55, [57], bd * 0.8, { vel: 0.09, att: 0.25, rel: 1, bright: 700, wet: 0.85 });
      }
      if (n === 1 && chance(0.4)) INS.bell(nv(th), t + rand(0, bd), pick([86, 88, 93, 95]), { vel: 0.03, dec: 5, wet: 0.95 });
      if (n === 2 && chance(0.4)) bird(nv(th), t + rand(0, bd));
      if (MOOD.seen && n === 0) for (const [dt, a] of [[0, 1], [0.38, 0.7]]) thump(nv(th), t + dt * S.sd * S.d.sub, a * 0.75);
      if (S.nc && th.ci === 0 && chance(0.3)) { const c = th.prog.map(chordOf); phrase(th, t + bd, genMelody([c[0], c[1], c[1]], 4, S.d.scale, 62, 74, 62, 0.35), S.sd * S.d.sub, { vel: 0.06, wet: 0.75 }); }
    },
    step(S) {
      // in a fight the low strings pulse on the root, quietly (the Field has no drums)
      if (S.lvl > 0.3 && S.i % 2 === 0) INS.ost(nv(S.th), S.t, bassNote(S.ch, 38), S.sd * 1.6, 0.06 * S.lvl, { br: 5 });
      if (!chance(0.05)) return;
      INS.pluck(nv(S.th), S.t, pick(scaleTones(S.d.scale, 69, 86)), { vel: 0.04, dec: 3, bright: 2, saw: 0.05, wet: 1 });
    },
  },

  // Ivar: the horn call is the bass ostinato; his Dark strips it to a drone and a heartbeat; remembering, the lantern's motif
  // comes in under the fight (MOOD.phase)
  ivar: {
    bpm: 104, beats: 4, sub: 4, gain: 0.85, int: 'always', order: [0], scale: [2, 3, 5, 7, 9, 10, 0],
    get drums() { return MOOD.phase === 1 ? null : 'boss'; },
    progs: [['Dm', 'Eb', 'Dm', 'C'], ['Dm', 'Bb', 'C', 'Dm'], ['Gm', 'Eb', 'Dm', 'A'], ['Dm', 'Eb', 'Bb', 'A']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, ph = MOOD.phase, r = bassNote(ch, 38);
      if (ph === 1) {
        if (S.bar % 4 === 0) INS.drone(nv(th), t, 26, bd * 4 + 1, { vel: 0.18 });
        for (const [dt, a] of [[0, 1], [0.4, 0.7]]) thump(nv(th), t + dt * S.sd * 4, a * 0.8);
        if (S.nc) INS.strings(nv(th), t, [r + 12, r + 13], S.cd, { vel: 0.07, att: 1.5, rel: 1.5, cut: 500 });
        return;
      }
      INS.brass(nv(th), t, [r, r + 12], bd * 0.3, { vel: 0.24, att: 0.03, rel: 0.3, bright: 1600, drive: 1.3 });
      INS.brass(nv(th), t + bd * 0.5, [r - 5, r + 7], bd * 0.35, { vel: 0.22, att: 0.03, rel: 0.35, bright: 1400, drive: 1.3 });
      st.pv = voicing(ch, 60, 76, st.pv, 3);
      INS.strings(nv(th), t, st.pv, bd - 0.1, { vel: 0.14, att: 0.25, rel: 0.6, cut: 2000 });
      if (S.bar % 2 === 0) INS.choir(nv(th), t, voicing(ch, 55, 70, null, 3), bd * 0.9, { vel: 0.15, att: 0.1, rel: 0.7, vowel: 'o', wet: 0.4 });
      if (ph >= 2 && S.bar % 4 === 0) motif(th, t, S.sd * 3, { vel: 0.13, wet: 0.5 });
    },
  },

  // the Ashen Forge: 6/8 in C phrygian dominant, its rhythm the mountain's own breath (MOOD.breath, MOOD.roar from the
  // flues); each stage of the heat adds a layer: a brass drone, then the anvil on one and four, then a low choir on 'ah'.
  // Cold (heat -1): one low note and the wind in the flues.
  forge: {
    bpm: 126, beats: 3, sub: 2, bpc: 2, gain: 1.2, scale: [0, 1, 4, 5, 7, 8, 10],
    progs: [['C', 'Db', 'C', 'C'], ['Fm', 'Db', 'C', 'C'], ['C', 'Bbm', 'Db', 'C'], ['Fm', 'Ab', 'Db', 'C']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, h = MOOD.heat;
      if (h < 0) {
        if (S.bar % 8 === 0) INS.drone(nv(th), t, 24, bd * 8 + 3, { vel: 0.12, cut: 260 });
        if (chance(0.3)) INS.whisper(nv(th), t + rand(0, bd), rand(3, 5), { vel: 0.07, wet: 0.7 });
        if (chance(0.12)) INS.bell(nv(th), t + rand(0, bd), pick([48, 55, 60]), { vel: 0.06, dec: 7, wet: 0.85 });
        return;
      }
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 24, bd * 8 + 2, { vel: 0.17 });
      if (S.nc) {
        st.pv = voicing(ch, 43, 58, st.pv, 3);
        const b = bassNote(ch, 36);
        INS.strings(nv(th), t, st.pv, S.cd + 0.3, { vel: 0.14, att: 1.6, rel: 2.2, cut: 520, wet: 0.4 });
        if (h >= 1) INS.brass(nv(th), t, [b, b + 7], S.cd * 0.9, { vel: 0.08 + 0.02 * h, att: 1.2, rel: 1.2, bright: 700, wet: 0.4 });
        if (h >= 3) INS.choir(nv(th), t, voicing(ch, 45, 57, null, 3), S.cd, { vel: 0.17, att: 1.4, rel: 2, vowel: 'a', wet: 0.5 });
      }
      if (h >= 2) for (const k of [0, 3]) metal(nv(th), t + k * S.sd, 330 * rand(0.99, 1.01), [1, 2.76, 5.4, 8.93], 0.7, k ? 0.04 : 0.06);
      else if (S.bar % 2 === 0) metal(nv(th), t, 300, [1, 2.76, 5.4, 8.93], 1.1, 0.025);
    },
    step(S) {
      const th = S.th;
      if (MOOD.breath) { MOOD.breath = 0; if (MOOD.heat >= 0) inhale(nv(th), S.t, 2.0); }
      if (MOOD.roar) { MOOD.roar = 0; if (MOOD.heat >= 0) { exhale(nv(th), S.t); for (const k of [0, 3]) metal(nv(th), S.t + k * S.sd, 330, [1, 2.76, 5.4, 8.93, 13.3], 1, 0.07); } }
      if (S.lvl > 0.3 && MOOD.heat >= 0 && S.i % 3 === 0) INS.ost(nv(th), S.t, bassNote(S.ch, 36), S.sd * 2.6, 0.07 * S.lvl, { br: 6 });
    },
  },

  // Karthax: 6/8, a tritone in the bass and the full choir; as each keeper's statue breaks its old music surfaces; in his last
  // fire everything drops to one held low note, and the lantern's motif plays alone on a pure sine and a flute
  karthax: {
    bpm: 144, beats: 3, sub: 2, gain: 0.85, int: 'always', order: [0], scale: [0, 1, 4, 5, 7, 8, 10],
    get drums() { return MOOD.phase >= 2 ? null : 'six'; },
    progs: [['Cm', 'F#', 'Cm', 'Ab'], ['Cm', 'Db', 'F#', 'G'], ['Fm', 'B', 'Cm', 'G']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st, ph = MOOD.phase;
      if (ph >= 2) {
        if (S.bar % 8 === 0) INS.drone(nv(th), t, 24, bd * 8 + 2, { vel: 0.2, cut: 240 });
        if (S.bar % 6 === 2) { const b = bd * 0.5; let x = t; const seq = MOTIF.map(([m, k]) => { const n = [m, x, k * b]; x += k * b; return n; }); sineLine(nv(th), seq, 0.07); INS.flute(nv(th), seq.map(([m, s0, d]) => [m + 12, s0, d - 0.02]), { vel: 0.05, wet: 0.8 }); }
        return;
      }
      const r = bassNote(ch, 36);
      INS.brass(nv(th), t, [r, r + 6], bd * 0.45, { vel: 0.26, att: 0.03, rel: 0.3, bright: 1500, drive: 1.6 });
      INS.brass(nv(th), t + bd / 2, [r], bd * 0.3, { vel: 0.2, att: 0.03, rel: 0.25, bright: 1300, drive: 1.6 });
      if (S.bar % 2 === 0) INS.choir(nv(th), t, voicing(ch, 52, 72, null, 4), bd * 1.8, { vel: 0.22, att: 0.15, rel: 0.8, vowel: S.bar % 4 ? 'o' : 'a', wet: 0.45 });
      st.pv = voicing(ch, 60, 76, st.pv, 3);
      INS.strings(nv(th), t, st.pv, bd, { vel: 0.13, att: 0.2, rel: 0.5, cut: 2200 });
      if (MOOD.keeper) { const k = MOOD.keeper; MOOD.keeper = 0; keeperMotif(th, t, k, bd); }
    },
  },

  // the new fire (q22): the lantern's motif harmonised and slow, resolving to D major; as each far fire answers, the
  // village's tune
  newfire: {
    bpm: 66, beats: 4, sub: 2, gain: 1.0, order: [0], scale: [2, 4, 6, 7, 9, 11, 1],
    progs: [['D', 'G', 'Bm', 'A'], ['D', 'Em', 'G', 'D'], ['G', 'D', 'A', 'D']],
    bar(S) {
      const { th, t, bd, ch } = S, st = th.st;
      if (S.bar % 8 === 0) INS.drone(nv(th), t, 38, bd * 8 + 2, { vel: 0.1 });
      st.pv = voicing(ch, 55, 71, st.pv, 4);
      INS.strings(nv(th), t, st.pv, bd + 0.3, { vel: 0.16, att: 1, rel: 2, cut: 1500, wet: 0.4 });
      if (S.bar % 2 === 0) INS.choir(nv(th), t, voicing(ch, 62, 74, null, 3), bd * 2, { vel: 0.12, att: 1.2, rel: 2, vowel: 'a', wet: 0.55 });
      if (S.bar % 4 === 0) motif(th, t + bd * 0.25, S.sd * 1.8, { vel: 0.12, wet: 0.6, resolve: true });
      if (MOOD.answer) { MOOD.answer = 0; phrase(th, t + bd * 0.5, ANSWER, S.sd * 1.2, { vel: 0.09, wet: 0.6 }); INS.bell(nv(th), t, 86, { vel: 0.06, dec: 4, wet: 0.8 }); }
    },
    step(S) {
      const { th, i } = S, st = th.st;
      if (i === 0) { st.arp = pick(ARP8); st.at = tones(S.ch, 62, 81); }
      const k = st.arp[i];
      if (k != null) INS.pluck(nv(th), S.t + rand(0, 0.01), st.at[Math.min(k, st.at.length - 1)], { vel: rand(0.06, 0.09), dec: 2, bright: 4, saw: 0.15, wet: 0.5 });
    },
  },

  victory: {
    bpm: 60, beats: 4, sub: 1, gain: 0.8, once: true, fadeIn: 0.03, xfade: 1.2,
    play(S) { fanfare(() => nv(S.th), S.t, true); },
  },
};

function chooseProg(d, th) {
  const k = th.cycle % 4;
  if (d.order && k < d.order.length) return d.order[k];
  let p;
  do { p = (Math.random() * d.progs.length) | 0; } while (d.progs.length > 1 && p === th.pi);
  return p;
}

function runStep(g, th) {
  const d = th.def, spb = d.beats * d.sub, sd = 60 / d.bpm / d.sub, i = th.step % spb;
  const S = { g, th, d, t: th.t, i, sd, bd: sd * spb, cd: sd * spb * (d.bpc || 1), bar: th.bar, ch: null, nc: false, lvl: d.int === 'always' ? 1 : g.intC };
  // advance first so a failing theme callback can never stall the scheduler
  th.step++; th.t += sd;
  if (i === spb - 1) th.bar++;
  if (d.once) { th.done = true; d.play(S); return; }
  if (i === 0 && S.bar % (d.bpc || 1) === 0) {
    if (!th.prog || ++th.ci >= th.prog.length) {
      th.cycle++; th.pi = chooseProg(d, th); th.prog = d.progs[th.pi]; th.ci = 0;
    }
    th.chord = chordOf(th.prog[th.ci]);
    S.nc = true;
  }
  S.ch = th.chord;
  if (i === 0 && d.bar) d.bar(S);
  if (d.step) d.step(S);
  if (d.drums) drumStep(S, DRUMS[d.drums]);
}

function newTheme(g, name, t) {
  const def = THEMES[name], c = g.ctx;
  const gain = (v, to) => { const n = c.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };
  const th = { g, name, def, voices: new Set(), t, step: 0, bar: 0, ci: 0, pi: -1, cycle: -1, prog: null, chord: null, st: {}, stopAt: 0, done: false, intNow: -1 };
  th.fade = gain(0, g.musicIn); th.fadeW = gain(0, g.musicWet);
  th.out = gain(def.gain || 1, th.fade); th.rev = gain(def.gain || 1, th.fadeW);
  th.int = gain(def.int === 'always' ? 1 : 0, th.out);   // combat layer (drums + ostinato)
  th.intW = gain(0.35, th.rev); th.int.connect(th.intW);
  th.nodes = [th.fade, th.fadeW, th.out, th.rev, th.int, th.intW];
  const fi = def.fadeIn ?? 2.5;
  for (const n of [th.fade, th.fadeW]) {
    n.gain.setValueAtTime(0, Math.max(0, t - 0.05));
    n.gain.linearRampToValueAtTime(1, t + fi);
  }
  return th;
}

function stopTheme(th, now, fade) {
  if (th.stopAt) return;
  th.stopAt = now + fade;
  for (const n of [th.fade, th.fadeW]) { hold(n.gain, now); n.gain.linearRampToValueAtTime(0, now + fade); }
}

function killTheme(th, now) {
  for (const v of Array.from(th.voices)) v.kill(now);
  for (const n of th.nodes) { try { n.disconnect(); } catch (e) { /* gone */ } }
}

function setTheme(g, name, at) {
  const now = at ?? g.ctx.currentTime, def = name ? THEMES[name] : null;
  for (const th of g.themes) stopTheme(th, now, def && def.xfade ? def.xfade : 2.5);
  g.cur = name;
  if (def) g.themes.push(newTheme(g, name, now + 0.06));
}

function applyInt(g, th, now, instant) {
  if (!th.def.drums || th.def.int === 'always' || th.stopAt) return;
  const x = g.intC < 0.02 ? 0 : Math.pow(g.intC, 0.8);
  if (Math.abs(x - th.intNow) < 0.01) return;
  th.intNow = x;
  if (instant) th.int.gain.value = x; else th.int.gain.setTargetAtTime(x, now, 0.12);
}

function pump(g, horizon) {
  const now = g.ctx.currentTime, max = g.offline ? 1e6 : 48;
  for (const th of g.themes) {
    let n = 0;
    while (!th.done && th.t < horizon && n++ < max) {
      if (th.stopAt && th.t >= th.stopAt) { th.done = true; break; }
      if (!g.offline && th.t < now - 0.1) th.t = now + 0.05; // timer was throttled: resync instead of bursting
      runStep(g, th);
    }
  }
}

function reap(g, now) {
  if (!g.themes.some((th) => th.stopAt && now > th.stopAt + 0.3)) return;
  g.themes = g.themes.filter((th) => {
    if (th.stopAt && now > th.stopAt + 0.3) { killTheme(th, now); return false; }
    return true;
  });
}

function duck(g, t, lvl, dur) {
  const p = g.duck.gain;
  hold(p, t);
  p.linearRampToValueAtTime(lvl, t + 0.15);
  p.setValueAtTime(lvl, t + dur);
  p.linearRampToValueAtTime(1, t + dur + 1.2);
}

// ───────────────────────────── 7. public API ─────────────────────────────

let G = null;      // live graph (null until init succeeds)
let timer = 0;
const pending = { theme: undefined, vol: null }; // requests made before init()

function tick() {
  const g = G;
  if (!g) return;
  try {
    if (g.ctx.state !== 'running') { g.lastTick = 0; return; }
    g.queued = 0;
    const pnow = performance.now(), dt = g.lastTick ? Math.min(pnow - g.lastTick, 2000) / 1000 : TICK_MS / 1000;
    g.lastTick = pnow;
    const now = g.ctx.currentTime;
    // combat intensity: quick to rise, slow to settle
    g.intC += (g.intT - g.intC) * (1 - Math.exp(-dt * (g.intT > g.intC ? 1.8 : 0.35)));
    for (const th of g.themes) applyInt(g, th, now, false);
    pump(g, now + clamp(dt * 2.5, LOOKAHEAD, 1.5));
    reap(g, now);
  } catch (e) { /* the timer must never die */ }
}

function startTimer() { if (!timer) timer = setInterval(tick, TICK_MS); }
function stopTimer() { if (timer) { clearInterval(timer); timer = 0; } }

function applyVolumes(g, v, instant) {
  const now = g.ctx.currentTime;
  const set = (n, x) => { if (instant) n.gain.value = x; else n.gain.setTargetAtTime(x, now, 0.06); };
  if (v.master != null) { g.vol.master = clamp(num(v.master, g.vol.master), 0, 1); set(g.masterIn, g.vol.master); }
  if (v.music != null) { g.vol.music = clamp(num(v.music, g.vol.music), 0, 1); set(g.musicIn, g.vol.music); set(g.musicWet, g.vol.music); }
  if (v.sfx != null) { g.vol.sfx = clamp(num(v.sfx, g.vol.sfx), 0, 1); set(g.sfxIn, g.vol.sfx); set(g.sfxWet, g.vol.sfx); }
}

function allow(g, name) {
  const [n, w] = LIMITS[name] || DEF_LIMIT, now = performance.now() / 1000;
  const a = g.recent[name] || (g.recent[name] = []);
  while (a.length && now - a[0] > w) a.shift();
  if (a.length >= n) return false;
  a.push(now);
  return true;
}

function playSfx(g, name, o, at) {
  const fn = SFX[name];
  if (!fn) return;
  let vol = num(o.vol, 1), pan = 0;
  if (Number.isFinite(o.x) && Number.isFinite(o.z)) {
    const dx = o.x - g.lx, dz = o.z - g.lz, d = Math.sqrt(dx * dx + dz * dz);
    if (d >= 30) return;
    vol *= (1 / (1 + d * 0.06)) * (1 - (d / 30) * (d / 30));
    pan = clamp(dx / 12, -0.8, 0.8);
  }
  if (vol < 0.003) return;
  if (!g.offline) {
    if (g.ctx.state !== 'running' && ++g.queued > 8) return; // don't pile up sounds while waiting for resume
    if (g.sfxVoices >= MAX_SFX || !allow(g, name)) return;
  }
  const v = new Voice(g, g.sfxIn, Math.min(vol, 2) * (TRIM[name] || 1), pan, null);
  v.wetTo = g.sfxWet; v.sfx = true; g.sfxVoices++;
  const up = clamp(num(o.pitch, 1), 0.25, 4);
  try { fn(v, (at || g.ctx.currentTime) + 0.005, up * jit(1, 0.04), up); } finally { if (!v.n) v.free(); }
}

function playSting(g, name, at) {
  const fn = STINGS[name];
  if (!fn) return;
  const v = new Voice(g, g.sfxIn, STING_TRIM[name] || 1, 0, null), t = (at || g.ctx.currentTime) + 0.02;
  v.wetTo = g.sfxWet; v.sfx = true; g.sfxVoices++;
  let dur = 2;
  try { dur = fn(v, t) || 2; } finally { if (!v.n) v.free(); }
  duck(g, t, 0.45, dur);
}

// a silent one-sample buffer started inside the gesture unlocks output on iOS
function unlock(ctx) {
  try {
    const b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
    s.onended = () => { try { s.disconnect(); } catch (e) { /* gone */ } };
  } catch (e) { /* ignore */ }
}

function resumeCtx(g) {
  try { const r = g.ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ }
}

export const Audio = {
  /** Create/resume the audio context. Call from a user gesture (tap/click/key). Safe to call repeatedly. */
  init() {
    try {
      if (!G) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return false;
        let ctx;
        try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
        G = makeGraph(ctx);
        if (pending.vol) applyVolumes(G, pending.vol, true);
        unlock(ctx);
        if (pending.theme) setTheme(G, pending.theme);
      }
      G.want = true;
      if (G.ctx.state !== 'running' && G.ctx.state !== 'closed') resumeCtx(G);
      startTimer();
      return true;
    } catch (e) {
      return false;
    }
  },

  /** Each 0..1, any subset. */
  setVolumes(v) {
    try {
      if (!v || typeof v !== 'object') return;
      if (!G) { pending.vol = Object.assign(pending.vol || {}, v); return; }
      applyVolumes(G, v, false);
    } catch (e) { /* ignore */ }
  },

  /** 'title' | 'town' | 'forest' | 'crypt' | 'boss' | 'gate' | 'victory' | null. Crossfades; same theme is a no-op. */
  music(theme) {
    try {
      const name = theme || null;
      if (name && !THEMES[name]) return;
      if (!G) { pending.theme = name; return; }
      if (name === G.cur) return;
      setTheme(G, name);
    } catch (e) { /* ignore */ }
  },

  /** Story state the music follows: { autumn: bool, near: 0..1 (the Heartwood's heartbeat), phase: 0..2 (a boss), heat: -1..3
   * (the Forge), night: 0 ash | 1 stars | 2 dawn (the Field), seen: bool; and moments: breath, roar (a flue), keeper 1-3 (a
   * statue breaks), answer 1-4 (a far fire) }. */
  mood(o) {
    if (o && typeof o === 'object') for (const k in o) if (k in MOOD) { const r = MOOD_RANGE[k] || [0, 2]; MOOD[k] = typeof MOOD[k] === 'boolean' ? !!o[k] : clamp(num(o[k], MOOD[k]), r[0], r[1]); }
  },

  /** 0..1 combat intensity. Cheap: only stores the target; smoothing happens in the scheduler. */
  intensity(x) {
    if (G) G.intT = x > 0 ? (x < 1 ? +x : 1) : 0;
  },

  /** Player world position for positional sfx. */
  listener(x, z) {
    if (!G) return;
    if (Number.isFinite(x)) G.lx = x;
    if (Number.isFinite(z)) G.lz = z;
  },

  /** One-shot effect. opts: { vol=1, pitch=1, x, z }. Unknown names are ignored. */
  sfx(name, opts) {
    try {
      const g = G;
      if (!g || !g.want) return;
      if (name === 'questComplete') { Audio.sting('quest'); return; }
      if (name === 'levelUp') { Audio.sting('levelup'); return; }
      if (!Object.prototype.hasOwnProperty.call(SFX, name)) return;
      playSfx(g, name, opts || {}, 0);
    } catch (e) { /* ignore */ }
  },

  /** Short musical phrase over the music: levelup, legendary, victory, death, quest, bossIntro, beacon. */
  sting(name) {
    try {
      const g = G;
      if (!g || !g.want || !Object.prototype.hasOwnProperty.call(STINGS, name)) return;
      if (g.ctx.state !== 'running' && ++g.queued > 8) return;
      if (!allow(g, 'sting:' + name)) return;
      playSting(g, name, 0);
    } catch (e) { /* ignore */ }
  },

  /** App hidden / paused. */
  suspend() {
    try {
      if (!G) return;
      G.want = false;
      stopTimer();
      const r = G.ctx.suspend && G.ctx.suspend();
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* ignore */ }
  },

  /** App visible again. */
  resume() {
    try {
      if (!G) return;
      G.want = true;
      G.lastTick = 0;
      resumeCtx(G);
      startTimer();
    } catch (e) { /* ignore */ }
  },

  /** Debug snapshot (live source count etc.). */
  _debug() {
    const g = G;
    if (!g) return null;
    return {
      state: g.ctx.state, live: g.live, sfxVoices: g.sfxVoices, cur: g.cur, intensity: +g.intC.toFixed(3),
      themes: g.themes.map((th) => ({ name: th.name, fading: !!th.stopAt, voices: th.voices.size })),
      sampleRate: g.ctx.sampleRate, time: g.ctx.currentTime,
    };
  },

  /**
   * Test helper: renders through an OfflineAudioContext with the same graph.
   * fn(api) with api.sfx(name, {at, vol, pitch, x, z}), api.sting(name, at), api.music(theme, intensity), api.listener(x, z).
   * opt: { limiter=true, comp=true, sampleRate=44100, volumes, incremental=false, keep=false }.
   * Resolves { peak, rms, loud (max 50 ms RMS), seconds, buffer (when keep) }.
   */
  _renderOffline(fn, seconds = 2, opt = {}) {
    try {
      const OAC = typeof window !== 'undefined' && (window.OfflineAudioContext || window.webkitOfflineAudioContext);
      if (!OAC) return Promise.resolve(null);
      const sr = opt.sampleRate || 44100, ctx = new OAC(2, Math.ceil(sr * seconds), sr);
      const g = makeGraph(ctx, { offline: true, limiter: opt.limiter, comp: opt.comp });
      if (opt.volumes) applyVolumes(g, opt.volumes, true);
      const api = {
        sfx: (name, o = {}) => playSfx(g, name, o, num(o.at, 0)),
        sting: (name, at = 0) => playSting(g, name, at),
        listener: (x, z) => { g.lx = x; g.lz = z; },
        ins: (name, ...args) => { const v = new Voice(g, g.musicIn); INS[name](v, ...args); },
        music: (name, lvl = 0) => {
          g.intT = g.intC = clamp(lvl, 0, 1);
          setTheme(g, name, 0);
          for (const th of g.themes) applyInt(g, th, 0, true);
          if (!opt.incremental || !ctx.suspend) { pump(g, seconds); return; }
          // realtime-like: schedule only LOOKAHEAD ahead, advancing at suspend points
          pump(g, LOOKAHEAD);
          for (let x = 0.1; x < seconds - 0.1; x += 0.1) {
            const at = x;
            ctx.suspend(at).then(() => { pump(g, at + LOOKAHEAD); ctx.resume(); });
          }
        },
      };
      fn(api);
      return ctx.startRendering().then((buf) => {
        let peak = 0, sum = 0, loud = 0;
        const win = Math.floor(sr * 0.05), ws = new Float64Array(Math.ceil(buf.length / win) + 1);
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const d = buf.getChannelData(c);
          for (let i = 0; i < d.length; i++) {
            const a = Math.abs(d[i]), q = d[i] * d[i];
            if (a > peak) peak = a;
            sum += q; ws[(i / win) | 0] += q;
          }
        }
        for (const s of ws) loud = Math.max(loud, Math.sqrt(s / (win * buf.numberOfChannels)));
        // loud = loudest 50 ms window RMS
        return { peak, rms: Math.sqrt(sum / (buf.length * buf.numberOfChannels)), loud, seconds, buffer: opt.keep ? buf : undefined };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
};

export default Audio;
