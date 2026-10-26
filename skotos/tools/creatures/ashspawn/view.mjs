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
const ref = flag('--ref'); const gizmo = flag('--gizmo'); const gamelit = flag('--gamelit'); const tgt = opt('--target', null); const az = +opt('--az', 'NaN'), el = +opt('--el', '15'), fov = +opt('--fov', '30'), club = flag('--club'), cleaver = flag('--cleaver'), refx = +opt('--refx', '-0.9'); const wdbg = opt('--weights', ''); const hdbg = opt('--handdbg', ''); const noweap = flag('--noweap'); const cy = +opt('--cy', '0.55');
const [model, out, framesArg = '0@0'] = argv;
const frames = framesArg.split(',').map((s) => { const [c, t, a, e] = s.split('@'); return { c, t: +(t ?? 0), az: a === undefined ? null : +a, el: e === undefined ? null : +e }; });
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
const scene = new THREE.Scene(); scene.background = new THREE.Color(${gamelit} ? 0x0b0e12 : 0x2a2e38);
if (${gamelit}) { r.toneMappingExposure = 1.15; }
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
if (${gamelit}) { scene.environmentIntensity = 0.35; scene.add(new THREE.HemisphereLight(0x50608a, 0x1a140e, 0.9)); const m = new THREE.DirectionalLight(0xa6bcff, 1.1); m.position.set(-12, 30, 8); scene.add(m); const hl = new THREE.PointLight(0xffa860, 30, 15, 1.4); hl.position.set(${refx}, 1.6, 1.2); scene.add(hl);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x2b2a24, roughness: 1 })); gr.rotation.x = -Math.PI / 2; scene.add(gr); }
else { scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x403830, 1.0)); const d = new THREE.DirectionalLight(0xfff0dd, 3); d.position.set(2, 6, 5); scene.add(d); }
const grid = new THREE.GridHelper(4, 8, 0x667788, 0x445060); if (!${gamelit}) scene.add(grid);
const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const g = await L.loadAsync('/m/model.glb');
const WD = '${wdbg}', HD = '${hdbg}';
if (HD) { g.scene.updateMatrixWorld(true); g.scene.traverse((o) => { if (!o.isSkinnedMesh || !o.name.includes('body')) return; const [HDn, K1, K2, TZ] = HD.split(':'); const bi = o.skeleton.bones.findIndex((b) => b.name === HDn); const hb = o.skeleton.bones[bi]; const inv = hb.matrixWorld.clone().invert();
  const J = o.geometry.attributes.skinIndex, Wt = o.geometry.attributes.skinWeight, P = o.geometry.attributes.position, n = J.count; const col = new Float32Array(n * 3); const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { let w = 0; for (let k = 0; k < 4; k++) if (J.getComponent(i, k) === bi) w += Wt.getComponent(i, k); col[i*3] = col[i*3+1] = col[i*3+2] = 0.4;
    if (w > 0.3) { v.fromBufferAttribute(P, i).applyMatrix4(o.bindMatrix).applyMatrix4(inv); const c = new THREE.Color(v.z > +TZ && v.y < 0.36 ? 0x20c020 : v.z > +TZ ? 0x20e0e0 : v.y < +K1 ? 0x6080c0 : v.y < +K2 ? 0xd03030 : 0xe0d040); col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b; } }
  o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.material = new THREE.MeshLambertMaterial({ vertexColors: true }); }); }
if (WD) g.scene.traverse((o) => { if (!o.isSkinnedMesh) return; const bi = o.skeleton.bones.findIndex((b) => b.name === WD); const J = o.geometry.attributes.skinIndex, Wt = o.geometry.attributes.skinWeight, n = J.count; const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { let w = 0; for (let k = 0; k < 4; k++) if (J.getComponent(i, k) === bi) w += Wt.getComponent(i, k); col[i*3] = w; col[i*3+1] = 0.15; col[i*3+2] = 1 - w; }
  o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.material = new THREE.MeshLambertMaterial({ vertexColors: true }); });
const root = g.scene; scene.add(root);
if (${gizmo}) root.traverse((o) => { if (o.name === 'grip_R' || o.name === 'grip_L') { const a = new THREE.AxesHelper(0.6); a.material.depthTest = false; a.renderOrder = 10; o.add(a); window.__grips = (window.__grips || []); window.__grips.push(o); } });
if (${club}) root.traverse((o) => {
  if (o.name === 'grip_R' || o.name === 'grip_L') {
    if (o.name === 'grip_L') { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), new THREE.MeshBasicMaterial({ color: 0x20ff20 })); m.position.y = 0.1; o.add(m); const zm = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.15), new THREE.MeshBasicMaterial({ color: 0xff2020 })); zm.position.z = 0.075; o.add(zm); return; }
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.6, 8), mat); h.position.y = 0.1; o.add(h);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 1.0, 9), mat); head.position.y = 0.9; o.add(head);
    const zm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.15), new THREE.MeshBasicMaterial({ color: 0xff2020 })); zm.position.z = 0.075; o.add(zm);
  }
});
else if (${cleaver}) root.traverse((o) => {
  if (o.name === 'grip_R') {
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.9 }), iron = new THREE.MeshStandardMaterial({ color: 0x5a5c60, metalness: 0.7, roughness: 0.45 });
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.36, 8), wood); h.position.y = 0.06; o.add(h);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.6, 0.24), iron); bl.position.set(0, 0.52, 0.07); o.add(bl);
    const zm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2020 })); zm.position.z = 0.05; o.add(zm);
  }
  if (o.name === 'grip_L') { const m = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.015), new THREE.MeshBasicMaterial({ color: 0x20ff20 })); m.position.y = 0.075; o.add(m); const zm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2020 })); zm.position.z = 0.05; o.add(zm); }
});
else if (!${noweap}) root.traverse((o) => {
  if (o.name === 'grip_R' || o.name === 'grip_L') {
    const long = o.name === 'grip_R' ? 0.55 : 0.3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, long, 0.006), new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.6, roughness: 0.35 })); blade.position.y = long / 2 + 0.05; o.add(blade);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.018), new THREE.MeshStandardMaterial({ color: 0x4a3020 })); o.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.09), new THREE.MeshStandardMaterial({ color: 0x806040 })); guard.position.y = 0.05; o.add(guard);
    const zmark = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.07), new THREE.MeshBasicMaterial({ color: 0xff2020 })); zmark.position.z = 0.035; o.add(zmark);
  }
});
let refObj = null;
if (${ref}) { const pg = await L.loadAsync('/p/people.glb'); refObj = pg.scenes.find((s) => s.name === 'warden') || pg.scenes[0]; refObj.position.set(${refx}, 0, 0); scene.add(refObj); }
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
  const gp = {}; root.traverse((o) => { if (/^grip_/.test(o.name)) { const v = o.getWorldPosition(new THREE.Vector3()); gp[o.name] = [v.x, v.y, v.z].map((x) => +x.toFixed(2)); } });
  stats.frames.push({ grips: gp, f: f.c + '@' + f.t, clip: clip ? clip.name : null, minY: +box.min.y.toFixed(3), maxY: +box.max.y.toFixed(3), x: [+box.min.x.toFixed(2), +box.max.x.toFixed(2)], z: [+box.min.z.toFixed(2), +box.max.z.toFixed(2)], hips: hp ? [hp.x, hp.y, hp.z].map((v) => +v.toFixed(3)) : null });
  const h = 1.3, c = new THREE.Vector3(${ref} ? -0.4 : 0, ${ref} ? 0.9 : ${cy}, 0);
  const D = ${distK} * (${ref} ? 5.5 : 4.2);
  const mode = '${camMode}';
  if (mode === 'game') { const pitch = 55 * Math.PI / 180, dist = 15 * ${distK}; cam.fov = ${gamelit} ? 38 : 12; cam.position.set(c.x, c.y + dist * Math.sin(pitch), c.z + dist * Math.cos(pitch)); }
  else if (mode === 'front') cam.position.set(c.x, c.y + 0.3, c.z + D);
  else if (mode === 'back') cam.position.set(c.x, c.y + 0.3, c.z - D);
  else if (mode === 'right') cam.position.set(c.x - D, c.y + 0.2, c.z);
  else if (mode === 'top') cam.position.set(c.x, c.y + D, c.z + 0.01);
  else cam.position.set(c.x + D * 0.75, c.y + 0.5, c.z + D * 0.66);
  if (${tgt ? 'true' : 'false'}) { const T = [${tgt || '0,0,0'}]; c.set(T[0], T[1], T[2]); const a = (f.az ?? ${isNaN(az) ? 35 : az}) * Math.PI / 180, e = (f.el ?? ${el}) * Math.PI / 180; cam.fov = ${fov}; cam.position.set(c.x + D * Math.cos(e) * Math.sin(a), c.y + D * Math.sin(e), c.z + D * Math.cos(e) * Math.cos(a)); }
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
