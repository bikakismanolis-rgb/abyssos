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
function keep() { try { localStorage.setItem(KEY, JSON.stringify({ events: REP.events, errors: REP.errors })); } catch (e) { /* no storage */ } }
function flush() {
  keep();
  if (!send || due) return;
  due = setTimeout(() => { due = 0; send({ ...REP, ua: navigator.userAgent.slice(0, 200), ram: navigator.deviceMemory || null, at: Date.now() }); }, 1500);
}
// the GPU and its limits, and three's shader errors (a program that will not compile or link on this GPU)
export function reportInit(renderer) {
  try {
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
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
