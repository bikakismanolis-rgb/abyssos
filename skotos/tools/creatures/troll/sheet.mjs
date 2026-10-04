// Contact sheet: renders several clip@time frames of one GLB into a grid, with optional 1.8 m reference figure.
// usage: node sheet.mjs <model.glb> <out.png> "clip@t,clip@t,..." [--cam side|front|back|game|top|right] [--ref] [--tile 300] [--cols 4] [--dist k]
// t is a fraction 0..1 of the clip duration. clip may be an index. Prints per-frame stats (minY, height, hips xz).
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (k) => { const i = argv.indexOf(k); if (i < 0) return false; argv.splice(i, 1); return true; };
const camMode = opt('--cam', 'side'), tile = +opt('--tile', '300'), cols0 = opt('--cols', null), distK = +opt('--dist', '1');
const ref = flag('--ref'); const noweap = flag('--noweap'); const cy = +opt('--cy', '0.55');
const [model, out, framesArg = '0@0'] = argv;
const frames = framesArg.split(',').map((s) => { const [c, t] = s.split('@'); return { c, t: +(t ?? 0) }; });
const cols = cols0 ? +cols0 : Math.min(frames.length, 4), rows = Math.ceil(frames.length / cols);
const W = cols * tile, H = rows * tile;
const THREE_DIR = '/home/user/abyssos/skotos/node_modules/three';
const PEOPLE = '/home/user/abyssos/skotos/src/assets/people.glb';
const html = `<!doctype html><html><head><style>html,body{margin:0;background:#1a1d24}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
try {
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(${W}, ${H}); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
r.setScissorTest(true); r.autoClear = true;
document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a2e38);
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x403830, 1.0));
const d = new THREE.DirectionalLight(0xfff0dd, 3); d.position.set(2, 6, 5); scene.add(d);
const grid = new THREE.GridHelper(4, 8, 0x667788, 0x445060); scene.add(grid);
const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const g = await L.loadAsync('/m/model.glb');
const root = g.scene; scene.add(root);
if (!${noweap}) root.traverse((o) => {
  if (o.name === 'grip_R' || o.name === 'grip_L') {
    const long = o.name === 'grip_R' ? 0.55 : 0.3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, long, 0.006), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.6, roughness: 0.35 })); blade.position.y = long / 2 + 0.05; o.add(blade);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.018), new THREE.MeshStandardMaterial({ color: 0x4a3020 })); o.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.09), new THREE.MeshStandardMaterial({ color: 0x806040 })); guard.position.y = 0.05; o.add(guard);
    const zmark = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.07), new THREE.MeshBasicMaterial({ color: 0xff2020 })); zmark.position.z = 0.035; o.add(zmark);
  }
});
let refObj = null;
if (${ref}) { const pg = await L.loadAsync('/p/people.glb'); refObj = pg.scenes.find((s) => s.name === 'warden') || pg.scenes[0]; refObj.position.set(-0.9, 0, 0); scene.add(refObj); }
const mixer = new THREE.AnimationMixer(root);
const frames = ${JSON.stringify(frames)};
const stats = { clips: g.animations.map((a) => a.name + ':' + a.duration.toFixed(2)), extras: root.userData, frames: [] };
let tris = 0; root.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); stats.tris = tris;
const cam = new THREE.PerspectiveCamera(${camMode === 'game' ? 30 : 30}, 1, 0.05, 200);
let hips = null; root.traverse((o) => { if (!hips && o.isBone && /spine1|pelvis|hips/i.test(o.name)) hips = o; });
for (let i = 0; i < frames.length; i++) {
  const f = frames[i];
  mixer.stopAllAction();
  const clip = isNaN(+f.c) ? g.animations.find((a) => a.name === f.c) : g.animations[+f.c];
  if (clip) { const a = mixer.clipAction(clip); a.reset().play(); mixer.setTime(0); mixer.update(clip.duration * Math.min(0.9999, f.t)); }
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); const p = o.geometry.attributes.position, v = new THREE.Vector3(); for (let k = 0; k < p.count; k += 3) { o.getVertexPosition(k, v); v.applyMatrix4(o.matrixWorld); box.expandByPoint(v); } } });
  const hp = hips ? hips.getWorldPosition(new THREE.Vector3()) : null;
  stats.frames.push({ f: f.c + '@' + f.t, clip: clip ? clip.name : null, minY: +box.min.y.toFixed(3), maxY: +box.max.y.toFixed(3), x: [+box.min.x.toFixed(2), +box.max.x.toFixed(2)], z: [+box.min.z.toFixed(2), +box.max.z.toFixed(2)], hips: hp ? [hp.x, hp.y, hp.z].map((v) => +v.toFixed(3)) : null });
  const h = 1.3, c = new THREE.Vector3(${ref} ? -0.4 : 0, ${ref} ? 0.9 : ${cy}, 0);
  const D = ${distK} * (${ref} ? 5.5 : 4.2);
  const mode = '${camMode}';
  if (mode === 'game') { const pitch = 55 * Math.PI / 180, dist = 15 * ${distK}; cam.fov = 12; cam.position.set(c.x, c.y + dist * Math.sin(pitch), c.z + dist * Math.cos(pitch)); }
  else if (mode === 'front') cam.position.set(c.x, c.y + 0.3, c.z + D);
  else if (mode === 'back') cam.position.set(c.x, c.y + 0.3, c.z - D);
  else if (mode === 'right') cam.position.set(c.x - D, c.y + 0.2, c.z);
  else if (mode === 'top') cam.position.set(c.x, c.y + D, c.z + 0.01);
  else cam.position.set(c.x + D * 0.75, c.y + 0.5, c.z + D * 0.66);
  cam.updateProjectionMatrix(); cam.lookAt(c);
  const col = i % ${cols}, row = Math.floor(i / ${cols});
  r.setViewport(col * ${tile}, (${rows} - 1 - row) * ${tile}, ${tile}, ${tile}); r.setScissor(col * ${tile}, (${rows} - 1 - row) * ${tile}, ${tile}, ${tile});
  r.render(scene, cam);
  const lab = document.createElement('div'); lab.textContent = f.c + '@' + f.t; lab.style.cssText = 'position:absolute;font:12px monospace;color:#cde;left:' + (col * ${tile} + 4) + 'px;top:' + (row * ${tile} + 3) + 'px';
  document.body.appendChild(lab);
}
window.__stats = stats; window.__done = true;
} catch (e) { window.__stats = { error: String(e.stack || e) }; window.__done = true; }
</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); let f = null;
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
  if (u.startsWith('/three/')) f = path.join(THREE_DIR, u.slice(7));
  else if (u === '/m/model.glb') f = path.resolve(model); else if (u === '/p/people.glb') f = PEOPLE;
  if (!f || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.__done, null, { timeout: 300000 }).catch(() => errs.push('timeout'));
await page.waitForTimeout(300);
await page.screenshot({ path: out });
const st = await page.evaluate(() => window.__stats);
console.log(JSON.stringify({ ...st, errs: errs.slice(0, 5) }));
await browser.close(); server.close();
