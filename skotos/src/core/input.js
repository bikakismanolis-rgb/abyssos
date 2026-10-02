// Touch joystick, buttons with drag-to-aim, keyboard and mouse.
import { screenToGround } from '../gfx/gfx.js';

export const IN = {
  mx: 0, mz: 0,            // movement, world space, length 0..1
  attack: false,           // held
  events: [],              // {t:'skill', i, aim:{x,z}|null, far:0..1} | {t:'dodge'} | {t:'potion'} | {t:'key', k}
  mouse: { x: 0, y: 0, on: false, down: false },
  touch: false,
  aiming: null,            // {i, x, z, far} while dragging a skill button
  keys: new Set(),
  enabled: true
};
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, el: null, knob: null };
const R_JOY = 58;

export function initInput() {
  const layer = document.createElement('div'); layer.id = 'touch'; document.getElementById('app').appendChild(layer);
  joy.el = document.createElement('div'); joy.el.id = 'joy'; joy.el.innerHTML = '<div id="joyknob"></div>';
  document.getElementById('app').appendChild(joy.el);
  joy.knob = joy.el.firstChild;
  layer.addEventListener('pointerdown', (e) => {
    IN.touch = e.pointerType === 'touch'; if (!IN.enabled) return;
    if (e.pointerType === 'mouse') { IN.mouse.down = e.button === 0; if (e.button === 2) IN.events.push({ t: 'skill', i: 0, aim: aimAtMouse() }); return; }
    if (joy.id === null && e.clientX < window.innerWidth * 0.55) {
      joy.id = e.pointerId; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY;
      joy.el.style.left = joy.ox + 'px'; joy.el.style.top = joy.oy + 'px'; joy.el.classList.add('on');
      layer.setPointerCapture(e.pointerId);
    } else if (e.clientX >= window.innerWidth * 0.55) {
      // tapping the open right side attacks toward the tap
      const g = screenToGround(e.clientX, e.clientY);
      IN.events.push({ t: 'tapAttack', aim: g });
    }
  });
  layer.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { IN.mouse.x = e.clientX; IN.mouse.y = e.clientY; IN.mouse.on = true; return; }
    if (e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; }
  });
  const end = (e) => {
    if (e.pointerType === 'mouse') { if (e.button === 0) IN.mouse.down = false; return; }
    if (e.pointerId === joy.id) { joy.id = null; joy.el.classList.remove('on'); }
  };
  layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end);
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => { IN.mouse.x = e.clientX; IN.mouse.y = e.clientY; IN.mouse.on = true; });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    IN.keys.add(k);
    if (!IN.enabled) { IN.events.push({ t: 'key', k }); return; }
    if (k === ' ') { IN.events.push({ t: 'dodge', aim: null }); e.preventDefault(); }
    else if (k >= '1' && k <= '4') IN.events.push({ t: 'skill', i: +k, aim: aimAtMouse() });
    else if (k === 'q') IN.events.push({ t: 'potion' });
    else IN.events.push({ t: 'key', k });
  });
  window.addEventListener('keyup', (e) => IN.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { IN.keys.clear(); IN.mouse.down = false; joy.id = null; joy.el.classList.remove('on'); });
}
function aimAtMouse() { return IN.mouse.on && !IN.touch ? screenToGround(IN.mouse.x, IN.mouse.y) : null; }

// per frame: joystick + keys -> movement vector
export function pollInput() {
  let x = 0, z = 0;
  if (joy.id !== null) {
    let dx = joy.x - joy.ox, dy = joy.y - joy.oy; const l = Math.hypot(dx, dy);
    if (l > R_JOY) { dx *= R_JOY / l; dy *= R_JOY / l; }
    joy.knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(1, l / R_JOY);
    if (l > 8) { x = (dx / R_JOY); z = (dy / R_JOY); const n = Math.hypot(x, z); x = (x / n) * m; z = (z / n) * m; }
  }
  const K = IN.keys;
  if (K.has('w') || K.has('arrowup')) z -= 1;
  if (K.has('s') || K.has('arrowdown')) z += 1;
  if (K.has('a') || K.has('arrowleft')) x -= 1;
  if (K.has('d') || K.has('arrowright')) x += 1;
  const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
  IN.mx = x; IN.mz = z;
  IN.attack = IN.enabled && (IN.btnAttack || (IN.mouse.down && !IN.touch));
  if (IN.mouse.down && !IN.touch) IN.mouseAim = screenToGround(IN.mouse.x, IN.mouse.y); else IN.mouseAim = null;
}
export function takeEvents() { const e = IN.events; IN.events = []; return e; }

// a HUD button: tap fires; drag aims (screen direction -> world direction, distance -> reach)
export function bindButton(el, opts) {
  let id = null, sx = 0, sy = 0, aiming = false;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!IN.enabled) return;
    IN.touch = e.pointerType === 'touch';
    id = e.pointerId; sx = e.clientX; sy = e.clientY; aiming = false;
    el.setPointerCapture(e.pointerId); el.classList.add('down');
    opts.down?.();
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id || !opts.aim) return;
    const dx = e.clientX - sx, dy = e.clientY - sy, l = Math.hypot(dx, dy);
    if (l > 16) aiming = true;
    if (aiming) IN.aiming = { i: opts.index, x: dx / (l || 1), z: dy / (l || 1), far: Math.min(1, l / 110) };
  });
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = null; el.classList.remove('down');
    const aim = aiming && IN.aiming ? { dir: { x: IN.aiming.x, z: IN.aiming.z }, far: IN.aiming.far } : null;
    IN.aiming = null;
    if (e.type === 'pointercancel') { opts.up?.(null, true); return; }
    opts.up?.(aim);
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
