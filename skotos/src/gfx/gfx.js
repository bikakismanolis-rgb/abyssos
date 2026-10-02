// Renderer, scene, camera rig, lights and quality scaling.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, damp, noise2 } from '../core/util.js';

export const R = {
  renderer: null, scene: null, camera: null,
  quality: 1,           // 0 low, 1 medium, 2 high
  basePR: 1, prScale: 1,
  w: 1, h: 1,
  hemi: null, moon: null, heroLight: null,
  pool: [], sources: new Set(),
  cam: { x: 0, z: 0, tx: 0, tz: 0, zoom: 1, zoomT: 1, trauma: 0, shakeT: 0, lookY: 0.9, pitch: 0.95, dist: 15, kick: { x: 0, z: 0 } },
  time: 0,
  frameMs: 16, slowT: 0, fastT: 0, lastResize: 0
};

const POOL_SIZE = [3, 6, 8];
const SHADOW = [0, 1024, 2048];

export function initGfx(quality) {
  R.quality = quality;
  const renderer = new THREE.WebGLRenderer({ antialias: quality >= 1, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = quality >= 1;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.id = 'gl';
  document.getElementById('stage').prepend(renderer.domElement);
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
    moon.shadow.mapSize.set(SHADOW[quality], SHADOW[quality]);
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
  window.addEventListener('resize', () => resize(true));
  window.addEventListener('orientationchange', () => setTimeout(() => resize(true), 200));
}

export function resize(force) {
  const w = window.innerWidth, h = window.innerHeight;
  if (!force && w === R.w && h === R.h) return;
  R.w = w; R.h = h;
  const dpr = window.devicePixelRatio || 1;
  R.basePR = Math.min(dpr, [1, 1.5, 2][R.quality]);
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
  R.renderer.toneMappingExposure = a.exposure ?? 1.15;
  R.heroLight.color.set(a.heroColor ?? 0xffa860);
  R.heroLight.userData.base = a.heroI ?? 30;
  R.heroLight.distance = a.heroRange ?? 15;
  R.cam.zoomT = a.zoom ?? 1;
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

const tmpList = [];
function updateLights(dt) {
  const cx = R.cam.x, cz = R.cam.z;
  tmpList.length = 0;
  for (const s of R.sources) {
    if (s.life > 0) { s.life -= dt; if (s.life <= 0) { R.sources.delete(s); continue; } }
    const dx = s.x - cx, dz = s.z - cz;
    s._d = dx * dx + dz * dz - s.intensity * 2;
    if (s._d < 900) tmpList.push(s);
  }
  tmpList.sort((a, b) => a._d - b._d);
  for (let i = 0; i < R.pool.length; i++) {
    const l = R.pool[i], s = tmpList[i];
    if (!s) { l.intensity = 0; continue; }
    let k = 1;
    if (s.flicker) k = 1 + s.flicker * (noise2(R.time * 9 + s.phase, s.phase) - 0.5) * 2;
    if (s.fade) k *= s.life > 0 ? Math.min(1, s.life / s.fade) : 1;
    l.position.set(s.x, s.y, s.z);
    l.color.copy(s._c);
    l.intensity = s.intensity * k;
    l.distance = s.range;
  }
}

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
  cam.position.set(c.x + ox + c.kick.x, c.lookY + Math.sin(c.pitch) * d + oy, c.z + Math.cos(c.pitch) * d + c.kick.z);
  lookAt.set(c.x + ox * 0.5 + c.kick.x, c.lookY, c.z + c.kick.z);
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
}

export function render() { R.renderer.render(R.scene, R.camera); }

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
