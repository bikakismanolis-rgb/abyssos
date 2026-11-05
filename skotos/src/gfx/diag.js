// What the graphics were doing, kept on this device for after a crash (the owner's phone lost its GPU on the Frozen Coast
// and we could not tell memory from a shader): a small snapshot at each zone's loading, at its first frames (1, 2, 5, 10,
// 30, 60) and every 4 s of play after (zone, how far in, quality, pixel ratio, screen, GPU, the device's memory, textures,
// an estimate of their memory, geometries, shader programs, draw calls, triangles, the JS heap). After a lost context, or
// a page that died soon after a wake (wake.js skotos.crash), the last snapshot is kept apart and shown on the title and on
// the no-GL boot screen, to be photographed and sent; a tap on its × lets it go.
import { R } from './gfx.js';
import { G } from '../game/state.js';

const KEY = 'skotos.diag', KEPT = 'skotos.diag.crash', FIRST = new Set([1, 2, 5, 10, 30, 60]);
const D = { gpu: '', zone: '', phase: '', t0: 0, frames: 0, every: 0 };
const store = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage: nothing kept */ } };
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };

// the GPU's name, asked once while the context is alive (after a loss it can no longer be asked)
export function diagInit(renderer) {
  try { const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); D.gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '').slice(0, 90); } catch (e) { /* unnamed */ }
}
// the textures' memory, estimated from the images still held (a phone lets a decoded image go once uploaded: those count
// apart, as 'released'); each material looked at once
function textures() {
  const mats = new Set(), seen = new Set(); let bytes = 0, released = 0;
  R.scene?.traverse((o) => { const m = o.material; if (Array.isArray(m)) m.forEach((x) => x && mats.add(x)); else if (m) mats.add(m); });
  for (const m of mats) for (const k in m) {
    const t = m[k]; if (!t || !t.isTexture || seen.has(t)) continue;
    seen.add(t);
    const im = t.image, w = im?.width || im?.data?.width || 0, h = im?.height || im?.data?.height || 0;
    if (!w || !h) { released++; continue; }
    bytes += w * h * 4 * (t.generateMipmaps === false ? 1 : 1.33);
  }
  return { seen: seen.size, mb: Math.round(bytes / 1048576), released };
}
function snap(phase) {
  const r = R.renderer; if (!r) return;
  const info = r.info, tx = textures();
  const s = {
    t: Date.now(), zone: D.zone || G.zone?.id || '', phase, secs: D.t0 ? Math.round((performance.now() - D.t0) / 1000) : 0, frames: D.frames,
    q: R.quality, pr: +(r.getPixelRatio() || 1).toFixed(2), w: R.w, h: R.h, gpu: D.gpu, ram: navigator.deviceMemory || null,
    tex: info.memory.textures, texMB: tx.mb, texSeen: tx.seen, released: tx.released, geo: info.memory.geometries,
    progs: info.programs?.length || 0, calls: info.render.calls, tris: info.render.triangles,
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
  };
  store(KEY, s);
  return s;
}
// a zone begins to load (travel, Continue)
export function diagLoad(zone) { D.zone = zone; D.phase = 'load'; D.t0 = performance.now(); D.frames = 0; snap('load'); }
// a zone entered
export function diagZone(zone) { D.zone = zone; D.phase = 'play'; D.t0 = performance.now(); D.frames = 0; D.every = 0; snap('enter'); }
// each frame drawn in play
export function diagFrame(dt) {
  if (!D.zone) return;
  D.frames++;
  D.every += dt;
  if (FIRST.has(D.frames) || D.every >= 4) { D.every = 0; snap('play'); }
}
// the context lost here: the last snapshot, taken now, kept apart for the next start
export function diagLost() { const s = snap('lost') || read(KEY); if (s) store(KEPT, s); }
// a start after a crash the last page could not report (a page that died with its GPU): its last snapshot kept apart
export function diagBoot() { try { const c = JSON.parse(localStorage.getItem('skotos.crash') || 'null'), s = read(KEY); if (c && s && !read(KEPT)) store(KEPT, { ...s, crash: c.kind }); } catch (e) { /* nothing kept */ } }
export const diagKept = () => read(KEPT);
// the snapshot as lines a photo can carry
export function diagLines(s, el) {
  if (!s) return [];
  const zone = s.zone ? (typeof el?.zone === 'function' ? el.zone(s.zone) : s.zone) : '-';
  const when = new Date(s.t).toLocaleString();
  return [
    `${zone} · ${s.phase}${s.crash ? '/' + s.crash : ''} · ${s.secs}s · ${s.frames}f · ${when}`,
    `q${s.q} · pr ${s.pr} · ${s.w}×${s.h}${s.ram ? ' · RAM ' + s.ram + ' GB' : ''}`,
    `GPU ${s.gpu || '?'}`,
    `tex ${s.tex} (~${s.texMB} MB, ${s.released} rel) · geo ${s.geo} · prog ${s.progs} · calls ${s.calls} · tris ${s.tris}${s.heap ? ' · heap ' + s.heap + ' MB' : ''}`
  ];
}
// the box on the title: what happened, the lines, a × that lets it go
export function diagShow(title, zoneName) {
  const s = diagKept(); if (!s || document.getElementById('diag')) return;
  const box = document.createElement('div');
  box.id = 'diag';
  box.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top,0px));z-index:30;max-width:min(560px,calc(100vw - 24px));padding:8px 30px 8px 10px;border:1px solid #6a4a2a;border-radius:8px;background:rgba(14,10,6,.94);color:#d8ccb4;font:12px/1.45 Georgia,serif;text-align:left;pointer-events:auto';
  const h = document.createElement('div'); h.style.cssText = 'color:#ffb070;font-weight:700;margin-bottom:2px'; h.textContent = title;
  box.appendChild(h);
  for (const l of diagLines(s, { zone: zoneName })) { const d = document.createElement('div'); d.textContent = l; d.style.cssText = 'word-break:break-word'; box.appendChild(d); }
  const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', 'close');
  x.style.cssText = 'position:absolute;top:2px;right:4px;border:0;background:none;color:#d8b46a;font:700 20px Georgia,serif;cursor:pointer;padding:2px 6px';
  x.onclick = (e) => { e.stopPropagation(); store(KEPT, null); box.remove(); };
  box.addEventListener('pointerdown', (e) => e.stopPropagation());
  box.addEventListener('click', (e) => e.stopPropagation());
  box.appendChild(x);
  document.body.appendChild(box);
}
