// Review renderer: many poses / views of one GLB in one image (headless Chromium, three.js, meshopt).
// usage: node rv.mjs model.glb out.png spec.json|'<json>'
// spec: { cols, w, h, cells: [{ clip, t (0..1 fraction) | sec, yaw (deg, 0 = front), pitch (deg), dist, ty (look-at height), label, game:true }] , ref: true }
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [modelPath, outPng, specArg] = process.argv.slice(2);
const spec = specArg.trim().startsWith('{') ? JSON.parse(specArg) : JSON.parse(readFileSync(specArg, 'utf8'));
const THREE_DIR = '/home/user/abyssos/skotos/node_modules/three';
const PEOPLE = '/home/user/abyssos/skotos/src/assets/people.glb';
const cols = spec.cols || 4, W = spec.w || 300, H = spec.h || 400, rows = Math.ceil(spec.cells.length / cols);
const html = `<!doctype html><html><head><style>html,body{margin:0;background:#1a1d24;overflow:hidden;font:12px sans-serif}
.l{position:absolute;color:#fff;background:rgba(0,0,0,.55);padding:1px 4px}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const spec = ${JSON.stringify(spec)};
const W = ${W}, H = ${H}, cols = ${cols}, rows = ${rows};
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W * cols, H * rows); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
r.shadowMap.enabled = true; r.setScissorTest(true);
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = spec.env ?? 0.6;
scene.add(new THREE.HemisphereLight(0xc8d0e0, 0x303030, spec.hemi ?? 1.0));
const d = new THREE.DirectionalLight(0xffffff, spec.sun ?? 2.6); d.position.set(3, 7, 5); d.castShadow = true; d.shadow.mapSize.set(1024, 1024);
Object.assign(d.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 }); scene.add(d);
const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshStandardMaterial({ color: 0x3a3d35, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(12, 24, 0x555a50, 0x45483f); grid.position.y = 0.002; scene.add(grid);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const stats = {};
const g = await loader.loadAsync('/model/x.glb');
const root = g.scene; scene.add(root);
root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
stats.userData = root.userData; stats.clips = g.animations.map((a) => a.name + ':' + a.duration.toFixed(2));
let tris = 0; root.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); stats.tris = tris;
let ref = null;
if (spec.ref) {
  const pg = await loader.loadAsync('/people.glb');
  const ws = pg.scenes.find((s) => s.name === 'warden') || pg.scenes[0];
  ref = SkeletonUtils.clone(ws); ref.position.set(spec.refX ?? -1.3, 0, 0); scene.add(ref);
  ref.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const rb = new THREE.Box3().setFromObject(ref); stats.refHeight = +(rb.max.y - rb.min.y).toFixed(3);
  // the reference is scaled to exactly 1.8 m
  const k = 1.8 / (rb.max.y - rb.min.y); ref.scale.setScalar(k); ref.position.y = -rb.min.y * k;
  const idle = pg.animations.find((a) => /idle/i.test(a.name));
  if (idle) { const m = new THREE.AnimationMixer(ref); m.clipAction(idle).play(); m.update(0.5); }
}
for (const [k, ex] of (spec.extra || []).entries()) {
  const eg = await loader.loadAsync('/extra/' + k + '.glb');
  const er = eg.scene; er.position.set(ex.x || 0, 0, ex.z || 0); scene.add(er);
  er.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const clip = eg.animations.find((a) => a.name === (ex.clip || 'idle'));
  if (clip) { const m = new THREE.AnimationMixer(er); m.clipAction(clip).play(); m.update((ex.t || 0) * clip.duration); }
}
const mixer = new THREE.AnimationMixer(root);
const saved = []; root.traverse((o) => saved.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
const restore = () => { for (const [o, p, q, s] of saved) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); } };
const labels = [];
const grips = []; root.traverse((o) => { if (/^grip_/.test(o.name)) grips.push(o); });
const markers = grips.map((gp) => { const m = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.0, 0.008), new THREE.MeshStandardMaterial({ color: 0xd0d0e0, metalness: 0.8, roughness: 0.3 })); blade.position.y = 0.62; m.add(blade);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.035), new THREE.MeshStandardMaterial({ color: 0x402010 })); hilt.position.y = 0.0; m.add(hilt);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0x806020 })); guard.position.y = 0.12; m.add(guard);
  const zArrow = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.12), new THREE.MeshBasicMaterial({ color: 0x00ff00 })); zArrow.position.z = 0.06; m.add(zArrow);
  m.visible = false; gp.add(m); return m; });
for (let i = 0; i < spec.cells.length; i++) {
  const c = spec.cells[i];
  mixer.stopAllAction(); restore();
  let clipName = 'rest';
  if (c.clip) {
    const clip = g.animations.find((a) => a.name === c.clip);
    if (clip) { const a = mixer.clipAction(clip); a.reset().play(); const t = c.sec ?? (c.t ?? 0) * clip.duration; mixer.setTime(0); mixer.update(t); clipName = c.clip + ' ' + t.toFixed(2) + 's'; }
    else clipName = 'MISSING ' + c.clip;
  }
  for (const m of markers) m.visible = !!(c.sword ?? spec.sword);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(); root.traverse((o) => { if (o.isMesh && !markers.some((m) => m === o.parent)) box.expandByObject(o, true); });
  const yaw = (c.yaw ?? 0) * Math.PI / 180, pitch = (c.pitch ?? 8) * Math.PI / 180;
  if (c.game) {
    cam.fov = 40; const dist = c.dist ?? 15; const tx = c.tx ?? -0.6;
    cam.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(tx, 0.8, 0);
    if (ref) ref.visible = true;
  } else {
    cam.fov = 30; if (ref) ref.visible = !!c.withRef;
    let ty = c.ty ?? (box.min.y + box.max.y) / 2, dist = c.dist ?? Math.max(2.4, (box.max.y - box.min.y) * 2.3);
    let cx = c.cx ?? (box.min.x + box.max.x) / 2, cz = c.cz ?? (box.min.z + box.max.z) / 2;
    if (c.focus) { const b = root.getObjectByName(c.focus); if (b) { const wp = b.getWorldPosition(new THREE.Vector3()); cx = wp.x + (c.fx || 0); ty = wp.y + (c.fy || 0); cz = wp.z + (c.fz || 0); } }
    cam.position.set(cx + Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, cz + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(cx, ty, cz);
  }
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const x = (i % cols) * W, y = (rows - 1 - Math.floor(i / cols)) * H;
  r.setViewport(x, y, W, H); r.setScissor(x, y, W, H);
  scene.background = new THREE.Color(c.game ? 0x222820 : 0x2a2e38);
  r.render(scene, cam);
  labels.push({ x: (i % cols) * W, y: Math.floor(i / cols) * H, text: (c.label ? c.label + ' | ' : '') + clipName + (c.game ? '' : ' | minY ' + box.min.y.toFixed(3) + ' maxY ' + box.max.y.toFixed(3)) });
}
for (const l of labels) { const e = document.createElement('div'); e.className = 'l'; e.style.left = l.x + 'px'; e.style.top = l.y + 'px'; e.textContent = l.text; document.body.appendChild(e); }
window.__stats = stats; window.__done = true;
</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (u === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
  if (u.startsWith('/three/')) f = path.join(THREE_DIR, u.slice(7));
  else if (u === '/model/x.glb') f = path.resolve(modelPath);
  else if (u === '/people.glb') f = PEOPLE;
  else if (u.startsWith('/extra/')) f = path.resolve(spec.extra[parseInt(u.slice(7))].path);
  if (!f || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W * cols, height: H * rows } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:${port}/`);
try { await page.waitForFunction(() => window.__done, null, { timeout: 300000 }); } catch (e) { console.log(JSON.stringify({ error: 'timeout', pageErrors: errs })); await browser.close(); server.close(); process.exit(1); }
await page.waitForTimeout(200);
await page.screenshot({ path: outPng });
const stats = await page.evaluate(() => window.__stats);
console.log(JSON.stringify({ ...stats, errors: errs.slice(0, 5) }));
await browser.close(); server.close();
