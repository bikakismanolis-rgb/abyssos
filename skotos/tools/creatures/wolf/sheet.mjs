// Contact-sheet renderer: one GLB, many (clip, time, view) cells in one image, ground plane + optional 1.8 m reference.
// usage: node sheet.mjs <config.json>   (or inline JSON as the argument)
// config: { model, out, cell: [w, h], cols, ref: bool, frames: [{ clip, t (0..1 of duration) | sec, view, zoom, label }] }
// views: front | side | back | 34 | game | top ; zoom: bone name to frame closely (distance via dist)
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const arg = process.argv[2];
const cfg = JSON.parse(arg.trim().startsWith('{') ? arg : readFileSync(arg, 'utf8'));
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const THREE_DIR = '/home/user/abyssos/skotos/node_modules/three';
const FILES = { model: path.resolve(cfg.model), people: '/home/user/abyssos/skotos/src/assets/people.glb', ual: S + '/chars/ual1.glb' };
const [cw, ch] = cfg.cell || [360, 420];
const cols = cfg.cols || Math.min(cfg.frames.length, 5);
const rows = Math.ceil(cfg.frames.length / cols);
const W = cw * cols, H = ch * rows;
const html = `<!doctype html><html><head><style>html,body{margin:0;background:#1a1d24;overflow:hidden;font:12px sans-serif}
.l{position:absolute;color:#ddd;background:#0008;padding:1px 4px}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const cfg = ${JSON.stringify(cfg)};
const W = ${W}, H = ${H}, cw = ${cw}, ch = ${ch}, cols = ${cols};
try {
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.setScissorTest(true);
document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(cfg.bg ?? 0x2a2e38);
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = cfg.env ?? 0.45;
scene.add(new THREE.HemisphereLight(0xc8d0e0, 0x3a3228, cfg.hemi ?? 1.0));
const d = new THREE.DirectionalLight(0xfff0dd, cfg.sun ?? 2.6); d.position.set(3, 7, 5); d.castShadow = true;
d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 }); scene.add(d);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: cfg.groundColor ?? 0x3b3a36, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(40, 80, 0x555555, 0x444444); grid.position.y = 0.001; scene.add(grid);
const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const g = await L.loadAsync('/f/model');
const model = g.scene; scene.add(model);
model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
const mixer = new THREE.AnimationMixer(model);
if (cfg.weapons) {
  const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.6 });
  const gR = model.getObjectByName('grip_R'), gL = model.getObjectByName('grip_L');
  if (gR) {
    const sw = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.8, 0.01), M(0x9aa0a8)); blade.position.y = 0.52; sw.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.03), M(0x5a4a30)); guard.position.y = 0.11; sw.add(guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8), M(0x3a2a1a)); hilt.position.y = 0.0; sw.add(hilt);
    const zax = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.12), M(0x2050ff)); zax.position.z = 0.06; sw.add(zax);
    if (cfg.weapons === 'crossbow') { sw.clear(); const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.55), M(0x5a4030)); stock.position.set(0, 0.02, 0.18); sw.add(stock); const bow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.03), M(0x777777)); bow.position.set(0, 0.04, 0.42); sw.add(bow); }
    sw.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    gR.add(sw);
  }
  if (gL) {
    const sh = new THREE.Group();
    const y = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.3, 0.012), M(0xff3030)); y.position.y = 0.15; sh.add(y);
    const z = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.2), M(0x2050ff)); z.position.z = 0.1; sh.add(z);
    gL.add(sh);
  }
}
let ref = null, refMixer = null;
if (cfg.ref) {
  const [pg, ug] = await Promise.all([L.loadAsync('/f/people'), L.loadAsync('/f/ual')]);
  ref = pg.scenes.find((s) => s.name === 'warden') || pg.scenes[0];
  ref.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  ref.position.x = cfg.refX ?? 1.0; scene.add(ref);
  refMixer = new THREE.AnimationMixer(ref);
  refMixer.clipAction(ug.animations.find((a) => a.name === 'Idle_Loop')).play(); refMixer.update(0.3);
}
const info = { clips: g.animations.map((a) => a.name + ':' + a.duration.toFixed(2)), extras: model.userData, cells: [] };
const cam = new THREE.PerspectiveCamera(30, cw / ch, 0.02, 200);
const tmp = new THREE.Vector3();
cfg.frames.forEach((f, i) => {
  mixer.stopAllAction();
  let clip = null;
  if (f.clip) { clip = g.animations.find((a) => a.name === f.clip); if (!clip) { info.cells.push('missing ' + f.clip); return; } }
  if (clip) { const a = mixer.clipAction(clip); a.reset().play(); mixer.setTime(0); const t = f.sec ?? (f.t ?? 0) * clip.duration; mixer.update(Math.min(t, clip.duration - 1e-4)); }
  model.rotation.y = f.rot ?? 0;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  let target = new THREE.Vector3(0, 0.9, 0), dist = f.dist ?? 5.2;
  if (f.zoom) { const b = model.getObjectByName(f.zoom); b.getWorldPosition(target); dist = f.dist ?? 0.9; }
  else if (f.center) target.set(...f.center);
  const v = f.view || 'front';
  const dirs = { front: [0, 0.12, 1], back: [0, 0.12, -1], side: [1, 0.12, 0], left: [-1, 0.12, 0], 34: [0.6, 0.35, 0.8], top: [0, 1, 0.001], game: [0, Math.sin(55 * Math.PI / 180), Math.cos(55 * Math.PI / 180)], game2: [0.5, Math.sin(55 * Math.PI / 180), 0.6] };
  tmp.set(...dirs[v]).normalize();
  if (v.startsWith('game')) { dist = f.dist ?? 15; cam.fov = f.fov ?? 18; if (!f.center) target.set(0.5, 0.8, 0); }
  else cam.fov = f.fov ?? 30;
  cam.aspect = cw / ch; cam.updateProjectionMatrix();
  cam.position.copy(target).addScaledVector(tmp, dist); cam.lookAt(target);
  const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
  r.setViewport(x, H - y - ch, cw, ch); r.setScissor(x, H - y - ch, cw, ch);
  r.render(scene, cam);
  const lab = document.createElement('div'); lab.className = 'l'; lab.style.left = x + 'px'; lab.style.top = y + 'px';
  lab.textContent = f.label || ((f.clip || 'rest') + ' ' + (f.sec !== undefined ? f.sec + 's' : (f.t ?? 0)) + ' ' + v);
  document.body.appendChild(lab);
  info.cells.push({ min: box.min.toArray().map((q) => +q.toFixed(3)), max: box.max.toArray().map((q) => +q.toFixed(3)) });
});
window.__info = info; window.__done = true;
} catch (e) { window.__info = { error: String(e && e.stack || e) }; window.__done = true; }
</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); let f = null;
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
  if (u.startsWith('/three/')) f = path.join(THREE_DIR, u.slice(7));
  else if (u.startsWith('/f/')) f = FILES[u.slice(3)];
  if (!f || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.__done, null, { timeout: 300000 }).catch(() => errs.push('timeout'));
await page.waitForTimeout(300);
await page.screenshot({ path: cfg.out });
const info = await page.evaluate(() => window.__info);
console.log(JSON.stringify({ ...info, errs: errs.slice(0, 5) }));
await browser.close(); server.close();
