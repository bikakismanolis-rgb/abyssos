// Renderer, scene, camera rig, lights and quality scaling.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, damp, noise2 } from '../core/util.js';
import { lang } from '../i18n/i18n.js';
import { G } from '../game/state.js';
import { diagInit } from './diag.js';

export const R = {
  renderer: null, scene: null, camera: null,
  quality: 1,           // 0 low, 1 medium, 2 high
  mobile: false,        // a phone or tablet: high quality is capped (shadow map, pixel ratio) and maps are halved (gltf.js)
  lost: false, reload: false, // the GL context was lost: nothing is drawn any more, the page reloads (onContextLost)
  leaving: false,       // the page is going away and let its context go itself (pagehide): no loss to mend
  glWhy: '',            // what the browser said when it refused a context (webglcontextcreationerror), for the boot screen
  basePR: 1, prScale: 1,
  w: 1, h: 1,
  hemi: null, moon: null, heroLight: null, hemiBase: new THREE.Color(), drift: 0, driftCol: new THREE.Color(0x6af0b0), driftCol2: null,
  pool: [], sources: new Set(),
  cam: { x: 0, z: 0, tx: 0, tz: 0, zoom: 1, zoomT: 1, trauma: 0, shakeT: 0, lookY: 0.9, pitch: 0.95, dist: 15, kick: { x: 0, z: 0 } },
  time: 0,
  frameMs: 16, slowT: 0, fastT: 0, lastResize: 0
};

const POOL_SIZE = [3, 6, 8];
const SHADOW = [0, 1024, 2048];

// o.mobile: a phone (boot.js); o.lost(hidden, stuck): called when the GL context is lost, before the page reloads (boot.js
// saves, lowers the quality unless the page was hidden: a phone may drop a backgrounded tab's context; and stops the game).
// stuck: lost again within a minute and a half at the lowest quality, when it waits for a tap rather than reload
// The GL context is asked for three ways: as the quality wants it; without antialias or the high-performance GPU; at low
// power. A phone's GPU that has just come back, or a WebView at its limit of contexts, can refuse the first and give a
// later one. All refused: the last error, with what the browser said in R.glWhy (boot.js waits and asks again, then says
// what to do). Anything after the context that fails lets it go again, so a second try starts clean.
const GL_ASKS = (q) => [
  { antialias: q >= 1, powerPreference: 'high-performance', stencil: false },
  { antialias: false, powerPreference: 'default', stencil: false },
  { antialias: false, powerPreference: 'low-power', stencil: false }
];
function makeRenderer(q) {
  let err = null;
  for (const ask of GL_ASKS(q)) {
    const canvas = document.createElement('canvas');
    canvas.addEventListener('webglcontextcreationerror', (e) => { if (e.statusMessage) R.glWhy = String(e.statusMessage).slice(0, 160); });
    try { return new THREE.WebGLRenderer({ ...ask, canvas }); } catch (e) { err = e; }
  }
  throw err;
}
export function initGfx(quality, o = {}) {
  R.quality = quality;
  R.mobile = !!o.mobile;
  const renderer = makeRenderer(quality);
  diagInit(renderer);
  try { setupGfx(renderer, quality, o); } catch (e) { R.renderer = null; R.pool.length = 0; try { renderer.domElement.remove(); renderer.dispose(); renderer.forceContextLoss(); } catch (er) { /* gone anyway */ } throw e; }
  if (!initGfx.once) {
    initGfx.once = true;
    window.addEventListener('resize', () => resize(true));
    window.addEventListener('orientationchange', () => setTimeout(() => resize(true), 200));
    // (a page going away lets its context go at once: a WebView that opens the game again, as the claude.ai app does on
    // each opening and each new version, need not wait for the old one to be collected; a page kept for going back keeps it)
    // (only the browser's own: a test's synthetic pagehide, which saves, keeps a page that goes on)
    window.addEventListener('pagehide', (e) => { if (!e.isTrusted || e.persisted || !R.renderer) return; R.leaving = true; try { R.renderer.forceContextLoss(); } catch (er) { /* going anyway */ } });
  }
}
function setupGfx(renderer, quality, o) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = quality >= 1;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.id = 'gl';
  document.getElementById('stage').prepend(renderer.domElement);
  // (a context let go after a failed setup, gfx.js initGfx, is no loss of the game's: R.renderer is no longer it)
  renderer.domElement.addEventListener('webglcontextlost', () => { if (R.renderer === renderer) onContextLost(o); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { if (R.reload) location.reload(); });
  R.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070a);
  scene.fog = new THREE.FogExp2(0x05070a, 0.03);
  R.scene = scene;

  R.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 160);

  // a soft studio environment gives metal something to reflect; kept dim so the night stays dark
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pm.dispose();

  R.hemi = new THREE.HemisphereLight(0x50608a, 0x1a140e, 0.9);
  scene.add(R.hemi);

  const moon = new THREE.DirectionalLight(0xa6bcff, 1.1);
  moon.position.set(-12, 30, 8);
  moon.castShadow = quality >= 1;
  if (moon.castShadow) {
    // (a phone's high quality keeps the medium map: 8 MB of GPU memory instead of 32)
    const sm = R.mobile ? Math.min(SHADOW[quality], 1024) : SHADOW[quality];
    moon.shadow.mapSize.set(sm, sm);
    const s = moon.shadow.camera; s.left = -20; s.right = 20; s.top = 20; s.bottom = -20; s.near = 1; s.far = 70;
    moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.03;
  }
  scene.add(moon); scene.add(moon.target);
  R.moon = moon;

  // the hero carries a warm light; it is what makes the dark readable
  R.heroLight = new THREE.PointLight(0xffa860, 30, 15, 1.4);
  scene.add(R.heroLight);

  for (let i = 0; i < POOL_SIZE[quality]; i++) {
    const l = new THREE.PointLight(0xff8840, 0, 10, 1.6);
    l.userData.src = null;
    scene.add(l); R.pool.push(l);
  }

  resize(true);
}

export function resize(force) {
  const w = window.innerWidth, h = window.innerHeight;
  if (!force && w === R.w && h === R.h) return;
  R.w = w; R.h = h;
  const dpr = window.devicePixelRatio || 1;
  R.basePR = Math.min(dpr, [1, 1.5, R.mobile ? 1.5 : 2][R.quality]);
  R.renderer.setPixelRatio(R.basePR * R.prScale);
  R.renderer.setSize(w, h, false);
  R.renderer.domElement.style.width = w + 'px';
  R.renderer.domElement.style.height = h + 'px';
  R.camera.aspect = w / h;
  // narrow (portrait) screens pull the camera back so the same width of the world stays visible
  const portrait = clamp(1.25 / (w / h), 1, 1.75);
  R.cam.aspectZoom = portrait;
  R.camera.updateProjectionMatrix();
  for (const fn of resizeHooks) fn(w, h);
}
const resizeHooks = [];
export const onResize = (fn) => resizeHooks.push(fn);

// keeps the frame time near 60 fps by trading resolution
export function adaptResolution(dtMs) {
  R.frameMs = R.frameMs * 0.95 + dtMs * 0.05;
  const now = performance.now();
  if (now - R.lastResize < 2500) return;
  if (R.frameMs > 21) R.slowT += dtMs; else R.slowT = 0;
  if (R.frameMs < 14.5) R.fastT += dtMs; else R.fastT = 0;
  let s = R.prScale;
  if (R.slowT > 1200) s = Math.max(0.55, s - 0.12);
  else if (R.fastT > 4000) s = Math.min(1, s + 0.08);
  if (s !== R.prScale) {
    R.prScale = s; R.slowT = R.fastT = 0; R.lastResize = now;
    R.renderer.setPixelRatio(R.basePR * s);
    R.renderer.setSize(R.w, R.h, false);
  }
}

// ---------- atmosphere ----------
export function setAtmosphere(a) {
  const s = R.scene;
  s.background.set(a.fog);
  s.fog.color.set(a.fog);
  s.fog.density = a.density;
  R.hemi.color.set(a.sky); R.hemi.groundColor.set(a.ground); R.hemi.intensity = a.hemi;
  R.moon.color.set(a.moon); R.moon.intensity = a.moonI;
  // no moon (the crypt, the halls, the Heartwood before the Autumn): its shadow map is not redrawn each frame (one last
  // update on the switch; castShadow stays, so no shader recompiles)
  const sh = a.moonI > 0;
  if (R.moon.shadow.autoUpdate !== sh) { R.moon.shadow.autoUpdate = sh; R.moon.shadow.needsUpdate = true; }
  R.renderer.toneMappingExposure = a.exposure ?? 1.15;
  R.heroLight.color.set(a.heroColor ?? 0xffa860);
  R.heroLight.userData.base = a.heroI ?? 30;
  R.heroLight.distance = a.heroRange ?? 15;
  R.cam.zoomT = a.zoom ?? 1;
  // Act V: the aurora's brightness and darkness (sea.js reads them), and the hemisphere light's slow green drift (Act VI:
  // a.driftCol the colour it wanders toward, the aurora's green through the ice, or the thaw's warmth; a.driftCol2 a
  // second one the first itself wanders toward, as the Drained Sea's green goes white and back)
  R.drift = a.drift || 0; R.hemiBase.set(a.sky);
  R.driftCol.set(a.driftCol ?? AUR_GREEN_HEX); R.driftCol2 = a.driftCol2 != null ? (R.driftCol2 || new THREE.Color()).set(a.driftCol2) : null;
  R.atmosHook?.(a);
}
// (the drift: the hemisphere colour wanders between its own and the aurora's green, over about a minute and a half)
const AUR_GREEN_HEX = 0x6af0b0, _dc = new THREE.Color();
function driftHemi() {
  if (!R.drift) return;
  const k = R.drift * (0.5 + 0.5 * Math.sin(R.time * 0.07)) * (0.6 + 0.4 * Math.sin(R.time * 0.23 + 1.3));
  const to = R.driftCol2 ? _dc.copy(R.driftCol).lerp(R.driftCol2, 0.5 + 0.5 * Math.sin(R.time * 0.041 + 2.1)) : R.driftCol;
  R.hemi.color.copy(R.hemiBase).lerp(to, k * 0.6);
}

// ---------- dynamic light sources ----------
// Anything that glows registers a source; the nearest few get a real PointLight each frame.
export function addLight(o) {
  const src = Object.assign({ x: 0, y: 1.5, z: 0, color: 0xff8840, intensity: 12, range: 9, flicker: 0, phase: Math.random() * 100, life: -1 }, o);
  src._c = new THREE.Color(src.color);
  R.sources.add(src);
  return src;
}
export function removeLight(src) { if (src) R.sources.delete(src); }
export function clearLights() { R.sources.clear(); }

// Light modes (Act III). flicker: 'beat' follows the Heartwood's heartbeat, a double thump at 0.9 Hz that quickens toward
// 1.2 Hz near the Heart Chamber (LIGHTS.heart); LIGHTS.beat (0-1, FX.beat) fades the beat out to a steady ember glow.
// flicker: 'seed' is a seed-lantern: it breathes gently and goes out as LIGHTS.autumn reaches 1.
export const LIGHTS = { beat: 1, hz: 0.9, phase: 0, heart: null, autumn: 0 };
// the heartbeat's pulse now (0 between beats, about 1 on the first thump, 0.7 on the second)
export function beatPulse() {
  const f = LIGHTS.phase - Math.floor(LIGHTS.phase), a = (f - 0.06) / 0.055, b = (f - 0.31) / 0.07;
  return Math.exp(-a * a) + 0.7 * Math.exp(-b * b);
}
const tmpList = [];
function updateLights(dt) {
  const cx = R.cam.x, cz = R.cam.z;
  const H = LIGHTS.heart;
  LIGHTS.hz = H ? 1.2 - 0.3 * clamp((Math.hypot(H.x - cx, H.z - cz) - 18) / 50, 0, 1) : 0.9;
  LIGHTS.phase += dt * LIGHTS.hz;
  const beatK = 0.5 + LIGHTS.beat * (0.05 + 0.8 * beatPulse());
  tmpList.length = 0;
  for (const s of R.sources) {
    if (s.life > 0) { s.life -= dt; if (s.life <= 0) { R.sources.delete(s); continue; } }
    if (s.flicker === 'seed' && LIGHTS.autumn >= 1) continue; // a lantern gone out keeps no light
    const dx = s.x - cx, dz = s.z - cz;
    s._d = dx * dx + dz * dz - s.intensity * 2;
    if (s._d < 900) tmpList.push(s);
  }
  tmpList.sort((a, b) => a._d - b._d);
  for (let i = 0; i < R.pool.length; i++) {
    const l = R.pool[i], s = tmpList[i];
    if (!s) { l.intensity = 0; continue; }
    let k = 1;
    if (s.flicker === 'beat') k = beatK;
    else if (s.flicker === 'seed') k = (1 - LIGHTS.autumn) * (1 + 0.16 * (noise2(R.time * 1.3 + s.phase, s.phase) - 0.5));
    // (Act VI's true light: the tremble, +-10% from band-limited noise, +-8.5% at quality 0 (trembleAmp); none with
    // 'reduce flicker')
    else if (s.flicker === 'tremble') { const n = trembleStep(s.trem ||= trembler(Math.floor(s.phase * 1e4)), dt); k = G.settings.flicker ? 1 : 1 + trembleAmp().i * n; }
    else if (s.flicker) k = 1 + s.flicker * (noise2(R.time * 9 + s.phase, s.phase) - 0.5) * 2;
    if (s.fade) k *= s.life > 0 ? Math.min(1, s.life / s.fade) : 1;
    if (s.gain) k *= s.gain.k; // a shared dimmer (an Amber Tear once its memory is spent)
    l.position.set(s.x, s.y, s.z);
    l.color.copy(s._c);
    l.intensity = s.intensity * k;
    l.distance = s.range;
  }
}

// ---------- true light's tremble (Act VI: docs/act6-contract.md, Light) ----------
// Band-limited noise: white noise stepped at 60 Hz through a 4th-order Butterworth high-pass at 3 Hz and a 4th-order
// low-pass at 7 Hz (two biquads each), so about 80% of its power lies in 3-7 Hz and it has no beat (noise, never summed
// sines), one seed per light. trembler(seed) -> T; trembleStep(T, dt) -> n in [-1, 1] (its RMS about 0.38, clipped under 1%
// of the time), the same for the same seed and time at any frame rate (fixed steps, the last two joined linearly).
// light.js trembles its pools with it (their drawn radius and intensity), updateLights a source of flicker 'tremble'
const TR_FS = 60, TR_K = 1.8;
const biquad = (lp, f, q) => {
  const w = (2 * Math.PI * f) / TR_FS, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al, b = lp ? (1 - c) / 2 : (1 + c) / 2;
  return [b / a0, (lp ? 2 * b : -2 * b) / a0, b / a0, (-2 * c) / a0, (1 - al) / a0];
};
const TR_SECS = [biquad(false, 3, 0.5412), biquad(false, 3, 1.3066), biquad(true, 7, 0.5412), biquad(true, 7, 1.3066)];
function trStep(T) {
  // (the seed's own white noise: mulberry32)
  let a = (T.s = (T.s + 0x6d2b79f5) | 0), t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  let x = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  for (let k = 0; k < 4; k++) { const q = TR_SECS[k], z = T.z, j = k * 2, y = q[0] * x + z[j]; z[j] = q[1] * x - q[3] * y + z[j + 1]; z[j + 1] = q[2] * x - q[4] * y; x = y; }
  T.y0 = T.y1; T.y1 = clamp(x * TR_K, -1, 1);
}
export function trembler(seed = 1) {
  const T = { s: seed | 0 || 1, z: new Float64Array(8), y0: 0, y1: 0, acc: 0 };
  // (a second and a half of it run off, so it starts in its stride, not from rest)
  for (let i = 0; i < 90; i++) trStep(T);
  return T;
}
export function trembleStep(T, dt) {
  T.acc = Math.min(T.acc + dt * TR_FS, 8);
  while (T.acc >= 1) { T.acc -= 1; trStep(T); }
  return T.y0 + (T.y1 - T.y0) * T.acc;
}
// how far the tremble reaches at full swing (n = +-1): r the drawn radius, i the intensity. +-8% and +-10%; at quality 0
// +-7% and +-8.5%, where the ground and the stones are drawn brighter: the brightest pixel a hearth's r 6 pool lights (a
// standing stone's lit face by the Drained Sea's arrival) swung 0.100 of the maximum luminance from n = -1 to +1 at the
// full reach, on WCAG's flash line; 0.087 at this one, as at quality 1 (tremble6)
const TREM_A = [{ r: 0.07, i: 0.085 }, { r: 0.08, i: 0.1 }];
export const trembleAmp = () => TREM_A[R.quality ? 1 : 0];

// ---------- camera ----------
export function shake(amount) { R.cam.trauma = Math.min(1, R.cam.trauma + amount); }
export function kick(dx, dz, amt) { R.cam.kick.x += dx * amt; R.cam.kick.z += dz * amt; }

const lookAt = new THREE.Vector3();
export function updateCamera(dt, tx, tz, snap) {
  const c = R.cam;
  c.tx = tx; c.tz = tz;
  if (snap) { c.x = tx; c.z = tz; } else { c.x = damp(c.x, tx, 7, dt); c.z = damp(c.z, tz, 7, dt); }
  c.zoom = damp(c.zoom, c.zoomT, 2.5, dt);
  c.kick.x = damp(c.kick.x, 0, 12, dt); c.kick.z = damp(c.kick.z, 0, 12, dt);
  c.trauma = Math.max(0, c.trauma - dt * 1.6);
  c.shakeT += dt;
  const sh = c.trauma * c.trauma * 0.55;
  const ox = sh * (noise2(c.shakeT * 22, 1.3) - 0.5) * 2;
  const oy = sh * (noise2(c.shakeT * 22, 7.1) - 0.5) * 2;
  const d = c.dist * c.zoom * (c.aspectZoom || 1);
  const cam = R.camera;
  // (a boss fight may aim a little ahead of the hero, toward what she fights: c.aimX, c.aimZ, eased by ai.js)
  const ax = c.aimX || 0, az = c.aimZ || 0;
  cam.position.set(c.x + ox + c.kick.x + ax, c.lookY + Math.sin(c.pitch) * d + oy, c.z + Math.cos(c.pitch) * d + c.kick.z + az);
  lookAt.set(c.x + ox * 0.5 + c.kick.x + ax, c.lookY, c.z + c.kick.z + az);
  cam.lookAt(lookAt);
  // shadow box follows the hero
  if (R.moon.castShadow) {
    R.moon.target.position.set(c.x, 0, c.z - 2);
    R.moon.position.set(c.x - 12, 30, c.z + 6);
  }
}

export function frame(dt) {
  R.time += dt;
  updateLights(dt);
  driftHemi();
}

// (R.skyHook: sea.js shows the aurora dome when a cine lowers the camera, and runs its freeze waves)
export function render() { if (R.lost) return; R.skyHook?.(); R.renderer.render(R.scene, R.camera); }

// A lost GL context (a phone out of memory, a GPU reset). The decoded images were let go once uploaded (gltf.js), so it
// cannot be drawn again as it was: the game is saved (o.lost, which also lowers the quality one step) and the page reloads,
// with a word on the screen. If it is lost again within a minute and a half at the lowest quality, it waits for a tap.
function onContextLost(o) {
  if (R.lost || R.leaving) return;
  R.lost = true;
  let again = false;
  try { again = Date.now() - (+sessionStorage.getItem('skotos.glLost') || 0) < 90000; sessionStorage.setItem('skotos.glLost', String(Date.now())); } catch (e) { /* no storage: as if the first time */ }
  const low = R.quality === 0, lower = !low && !document.hidden;
  try { o.lost?.(document.hidden, again && low); } catch (e) { /* the reload matters more */ }
  // (the player chooses: Continue, where she was, or back to the village (o.home lets the visit go); nothing reloads alone)
  R.reload = false;
  void lower;
  const el = document.createElement('div');
  el.id = 'gl-lost';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;text-align:center;padding:16px;background:rgba(5,7,10,0.94);color:#e8dcc8;font:17px/1.5 Georgia,serif';
  const en = lang() === 'en', msg = document.createElement('div');
  msg.textContent = en ? 'The graphics were lost. The game is saved.' : 'Τα γραφικά χάθηκαν. Το παιχνίδι σώθηκε.';
  const btn = (id, text, go) => { const b = document.createElement('button'); b.id = id; b.textContent = text; b.style.cssText = 'min-width:220px;padding:11px 18px;border-radius:9px;border:1px solid #d8b46a;background:#2a1e0e;color:#f0d89a;font:700 16px Georgia,serif;cursor:pointer'; b.onclick = go; return b; };
  el.append(msg,
    btn('gl-cont', en ? 'Continue' : 'Συνέχεια', () => location.reload()),
    btn('gl-home', en ? 'Back to the village' : 'Επιστροφή στο χωριό', () => { try { o.home?.(); } catch (e) { /* the reload matters more */ } location.reload(); }));
  document.body.appendChild(el);
}

// ---------- projections ----------
const v3 = new THREE.Vector3();
export function toScreen(x, y, z, out) {
  v3.set(x, y, z).project(R.camera);
  out.x = (v3.x * 0.5 + 0.5) * R.w;
  out.y = (-v3.y * 0.5 + 0.5) * R.h;
  out.vis = v3.z < 1 && v3.z > -1;
  return out;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
export function screenToGround(px, py) {
  ndc.set((px / R.w) * 2 - 1, -(py / R.h) * 2 + 1);
  ray.setFromCamera(ndc, R.camera);
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return { x: hit.x, z: hit.z };
}
