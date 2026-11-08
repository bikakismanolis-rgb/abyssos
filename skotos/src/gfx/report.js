// What this device's GPU is and what failed on it, written quietly to the player's own cloud space in claude.ai (the
// artifact's db: data/users/<id>/gpu, which the hero sync never reads, it takes only h-* documents), so a failure on a
// phone we cannot hold can be read and mended (the owner's phone lost its graphics on the Frozen Coast). Nothing is shown;
// outside claude.ai nothing is sent. The last events are kept on the device too, so a page that died sends them next time.
import { R } from './gfx.js';
import { G } from '../game/state.js';

const KEY = 'skotos.report', MAX = 24;
const REP = { gpu: '', lim: null, errors: [], events: [] };
let send = null, due = 0;
try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && Array.isArray(o.events)) { REP.events = o.events.slice(-MAX); REP.errors = (o.errors || []).slice(-5); } } catch (e) { /* none kept */ }
// the graphics' snapshots (game/diag.js: frames drawn in the zone, textures, programs, the heap): the last one the page
// before left (it may have died with its GPU, or drawn nothing), sent from the start; and this page's, through each
// zone's first minute. A zone that loads and then shows only black can be told apart: no frame, a frame and a stop, or
// frames drawn behind something
REP.diag = null; REP.prev = null;
try { REP.prev = { last: JSON.parse(localStorage.getItem('skotos.diag') || 'null'), crash: JSON.parse(localStorage.getItem('skotos.diag.crash') || 'null'), gl: JSON.parse(localStorage.getItem('skotos.gl') || 'null') }; } catch (e) { /* none kept */ }
export function reportDiag(s) { if (!s || (s.phase === 'play' && s.secs > 60)) return; REP.diag = s; flush(); }
// and the script errors (the game's own red box shows them; they are kept here too)
export function reportErr(m) { REP.errors.push({ t: Date.now(), zone: G.zone?.id || '', js: String(m).slice(0, 600) }); REP.errors = REP.errors.slice(-6); flush(); }
function keep() { try { localStorage.setItem(KEY, JSON.stringify({ events: REP.events, errors: REP.errors })); } catch (e) { /* no storage */ } }
function flush() {
  keep();
  if (!send || due) return;
  due = setTimeout(() => { due = 0; send({ ...REP, ua: navigator.userAgent.slice(0, 200), ram: navigator.deviceMemory || null, at: Date.now() }); }, 1500);
}
// the shader programs as they are made and first drawn, noted on the device as they go: a phone that freezes on one
// leaves its name (three's SHADER_NAME, the material's) for the next start
function traceGL(gl) {
  const sn = new WeakMap(), pn = new WeakMap(), used = new WeakSet(); let n = 0;
  const note = (step, p) => { try { localStorage.setItem('skotos.gl', JSON.stringify({ t: Date.now(), zone: G.zone?.id || '', mode: G.mode, n, step, name: pn.get(p) || '?' })); } catch (e) { /* no storage */ } };
  const ss = gl.shaderSource.bind(gl), at = gl.attachShader.bind(gl), lp = gl.linkProgram.bind(gl), up = gl.useProgram.bind(gl);
  gl.shaderSource = (s, src) => { const m = /#define SHADER_NAME (\S+)/.exec(src); sn.set(s, m ? m[1] : (/#define SHADER_TYPE (\S+)/.exec(src) || [])[1] || '?'); return ss(s, src); };
  gl.attachShader = (p, s) => { if (!pn.has(p)) pn.set(p, sn.get(s)); return at(p, s); };
  gl.linkProgram = (p) => { n++; note('link', p); return lp(p); };
  gl.useProgram = (p) => { if (p && !used.has(p)) { used.add(p); note('use', p); } return up(p); };
}
// the GPU and its limits, and three's shader errors (a program that will not compile or link on this GPU)
export function reportInit(renderer) {
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    try { traceGL(gl); } catch (e) { /* untraced */ }
    REP.gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '').slice(0, 120);
    const P = (k) => gl.getParameter(gl[k]);
    REP.lim = { vary: P('MAX_VARYING_VECTORS'), fu: P('MAX_FRAGMENT_UNIFORM_VECTORS'), vu: P('MAX_VERTEX_UNIFORM_VECTORS'), tex: P('MAX_TEXTURE_SIZE'), units: P('MAX_TEXTURE_IMAGE_UNITS'), prec: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision ?? null };
    renderer.debug.onShaderError = (g, prog, vs, fs) => {
      const cut = (s) => String(s || '').slice(0, 1500);
      console.error('shader', g.getProgramInfoLog(prog), g.getShaderInfoLog(vs), g.getShaderInfoLog(fs));
      REP.errors.push({ t: Date.now(), zone: G.zone?.id || '', q: R.quality, prog: cut(g.getProgramInfoLog(prog)), vs: cut(g.getShaderInfoLog(vs)), fs: cut(g.getShaderInfoLog(fs)) });
      REP.errors = REP.errors.slice(-5); flush();
    };
  } catch (e) { /* unnamed */ }
  reportEvent('start');
}
export function reportEvent(kind, data) {
  REP.events.push({ t: Date.now(), kind, zone: G.zone?.id || '', q: R.quality, pr: R.renderer ? +R.renderer.getPixelRatio().toFixed(2) : null, ...data });
  REP.events = REP.events.slice(-MAX); flush();
}
// claude.ai: the player's own document (a page outside it sends nothing)
export async function reportBind() {
  try {
    if (!window.claude?.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const uid = await user.id(); if (!db || typeof uid !== 'string' || !uid) return;
    const d = db.collection('data/users/' + uid).doc('gpu');
    send = (o) => Promise.resolve(d.set(o)).catch(() => {});
    flush();
  } catch (e) { /* no cloud: nothing sent */ }
}
