// Time-frozen shots of the Act V water and ground, and their pixel diff: proof that a shader change meant to be exact
// (a cost cut, no look change) leaves every pixel as it was.
//   node tools/stillshots.mjs shoot <outdir> [group,...]   (BASE, default http://localhost:5199/; one browser)
//   node tools/stillshots.mjs diff <dirA> <dirB>            (no browser: per shot, how many pixels differ and by how much)
//   node tools/stillshots.mjs edges                         (the longest triangle edge of the coast's and the Farthest
//                                                            Light's ground and water meshes, for a margin of view)
//   node tools/stillshots.mjs bench <base> <base> ...       (PLACE=coast|farlight, ROUNDS, N: the same pinned view timed
//                                                            on several trees, each served on its own port)
// Each group is one page of the world viewer (?world=coast|farlight, phone emulation as perf5: 915 x 412 at 1.5, coarse
// pointer, MSAA; or desktop 1280 x 720), its views drawn one after another. Before each picture the page is pinned:
// Math.random seeded (init script: the lights' flicker phases, the particles), the light sources the viewer's own &beam
// added reset, uTime and R.time set, the aurora's three uniforms set to the atmosphere's, the hemisphere's drift worked
// out from that time, the particles and the snow hidden, the camera placed (pitch, zoom, lookY: the cines' 5.9). Then one
// render and a read of the whole canvas in the same task (no compositing between). Two runs of one tree give the same
// bytes; a run of another tree differs exactly where its frame does.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
const require = createRequire(import.meta.url);

const PHONE = { viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1280, height: 720 } };
// views: at a spot (dalaro, window k, xy), dx/dz from it, tide, the camera (pitch, zoom, lookY; the play camera's
// 0.95 / 1 / 0.9 when unset)
const CINE = [{ n: 'cine-a', pitch: 0.3, zoom: 0.95 }, { n: 'cine-b', pitch: 0.2, zoom: 1.25 }, { n: 'cine-c', pitch: 0.3, zoom: 1.0 }, { n: 'cine-low', pitch: 0.12, zoom: 0.85 }];
const COAST = [
  { name: 'dalaro-1.2', at: 'dalaro', dz: 4, tide: 1.2 },
  { name: 'dalaro-0.6', at: 'dalaro', dz: 4, tide: 0.6 },
  { name: 'dalaro-0', at: 'dalaro', dz: 4, tide: 0 },
  { name: 'step-0.9', at: 'dalaro', dz: 4, tide: 0.9 },
  { name: 'step-1.05', at: 'dalaro', dz: 4, tide: 1.05 },
  { name: 'window-grey-1.2', at: 'window', k: 0, dz: 3, tide: 1.2 },
  { name: 'window-grey-0.6', at: 'window', k: 0, dz: 3, tide: 0.6 },
  { name: 'window-fall-1.2', at: 'window', k: 2, dz: 3, tide: 1.2 },
  { name: 'window-fall-0.6', at: 'window', k: 2, dz: 3, tide: 0.6 },
  // (a steep shore below the hero: the lace)
  { name: 'lace-1.2', at: 'xy', x: 49.5, z: 126.5, tide: 1.2 },
  { name: 'lace-0.6', at: 'xy', x: 49.5, z: 126.5, tide: 0.6 },
  // (wading: the hero on a 0.9 m bed at 1.2 m water)
  { name: 'wading-1.2', at: 'xy', x: 71.5, z: 114.5, tide: 1.2 },
  { name: 'landing-0.6', at: 'jetty', dx: -3, dz: 3, tide: 0.6 },
  { name: 'strand-0.6', at: 'strand', dz: 2, tide: 0.6 },
  ...CINE.map((c) => ({ name: c.n + '-1.2', at: 'dalaro', dz: 4, tide: 1.2, pitch: c.pitch, zoom: c.zoom, lookY: 5.9 })),
  { name: 'cine-b-0.6', at: 'dalaro', dz: 4, tide: 0.6, pitch: 0.2, zoom: 1.25, lookY: 5.9 }
];
const GROUPS = {
  coast: { q: 'world=coast&q=1&seed=3', ctx: PHONE, views: COAST },
  // (a lit sea-light's beam and its light path on the water: the viewer's &beam, 12 m back and left of the hero)
  beam: { q: 'world=coast&q=1&seed=3&beam=1', ctx: PHONE, views: [
    { name: 'beam-1.2', at: 'dalaro', dz: 4, tide: 1.2 }, { name: 'beam-0.6', at: 'dalaro', dz: 4, tide: 0.6 },
    { name: 'beam-window-1.2', at: 'window', k: 0, dz: 3, tide: 1.2 }, { name: 'beam-cine-b-1.2', at: 'dalaro', dz: 4, tide: 1.2, pitch: 0.2, zoom: 1.25, lookY: 5.9 }] },
  // (the Walking Tower's wake, 7 m ahead of the hero over open water)
  wake: { q: 'world=coast&q=1&seed=3&wake=1', ctx: PHONE, views: [{ name: 'wake-1.2', at: 'xy', x: 111.5, z: 53.5, tide: 1.2 }, { name: 'wake-0.6', at: 'xy', x: 111.5, z: 53.5, tide: 0.6 }] },
  // (the Freeze half way: its crests, the frozen flats)
  freeze: { q: 'world=coast&q=1&seed=3&freeze=0.5', ctx: PHONE, views: [{ name: 'freeze-1.2', at: 'dalaro', dz: 4, tide: 1.2 }, { name: 'freeze-cine-b', at: 'dalaro', dz: 4, tide: 1.2, pitch: 0.2, zoom: 1.25, lookY: 5.9 }] },
  farlight: { q: 'world=farlight&q=1&seed=3', ctx: PHONE, views: [
    { name: 'far-poles', at: 'poles' }, { name: 'far-drowned', at: 'drowned', k: 0, dz: 3 }, { name: 'far-drowned2', at: 'drowned', k: 2, dz: 3 },
    { name: 'far-hole', at: 'hole', k: 1, dz: 6 }, { name: 'far-cine-b', at: 'poles', pitch: 0.2, zoom: 1.25, lookY: 5.9 },
    { name: 'far-cine-light', at: 'farLight', dz: 2, pitch: 0.1, zoom: 2.2, lookY: 10 }] },
  coastQ0: { q: 'world=coast&q=0&seed=3', ctx: PHONE, views: [
    { name: 'q0-dalaro-1.2', at: 'dalaro', dz: 4, tide: 1.2 }, { name: 'q0-dalaro-0.6', at: 'dalaro', dz: 4, tide: 0.6 }, { name: 'q0-window-1.2', at: 'window', k: 0, dz: 3, tide: 1.2 },
    { name: 'q0-lace-1.2', at: 'xy', x: 49.5, z: 126.5, tide: 1.2 }, { name: 'q0-cine-b-1.2', at: 'dalaro', dz: 4, tide: 1.2, pitch: 0.2, zoom: 1.25, lookY: 5.9 }] },
  coastQ2: { q: 'world=coast&q=2&seed=3', ctx: DESK, views: [
    { name: 'q2-dalaro-1.2', at: 'dalaro', dz: 4, tide: 1.2 }, { name: 'q2-dalaro-0.6', at: 'dalaro', dz: 4, tide: 0.6 }, { name: 'q2-window-1.2', at: 'window', k: 0, dz: 3, tide: 1.2 },
    { name: 'q2-lace-1.2', at: 'xy', x: 49.5, z: 126.5, tide: 1.2 }, { name: 'q2-cine-b-1.2', at: 'dalaro', dz: 4, tide: 1.2, pitch: 0.2, zoom: 1.25, lookY: 5.9 }] },
  farQ2: { q: 'world=farlight&q=2&seed=3', ctx: DESK, views: [{ name: 'q2-far-poles', at: 'poles' }, { name: 'q2-far-drowned', at: 'drowned', k: 0, dz: 3 }] }
};
const T0 = 37.25;

// ---------- PNG (RGBA, filter 0), enough for our own files ----------
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length), t = Buffer.from(type, 'ascii');
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}
// rows top first (the GL read is bottom first: flip)
function encodePNG(w, h, rgba, flip) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { const sy = flip ? h - 1 - y : y; raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, sy * w * 4, (sy + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
function decodePNG(buf) {
  let p = 8, w = 0, h = 0; const idat = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6) throw new Error('not RGBA8'); }
    else if (type === 'IDAT') idat.push(data);
    p += 12 + n;
  }
  const raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) { if (raw[y * (w * 4 + 1)] !== 0) throw new Error('filtered PNG'); raw.copy(out, y * w * 4, y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)); }
  return { w, h, data: out };
}

// ---------- in the page ----------
async function pinAndRead({ v, T, noRead }) {
  const R = window.__R, L = window.__L, V5 = window.__v5, S = L.spots, SEA = V5.S.SEA, WIND = V5.B.WIND, FX = V5.fx.FX;
  const gfx = await import('/src/gfx/gfx.js');
  const one = (a, k) => (Array.isArray(a) ? a[k ?? 0] : a);
  const base = v.at === 'dalaro' ? S.dalaro : v.at === 'window' ? S.sealights[v.k].window : v.at === 'jetty' ? S.jetty : v.at === 'strand' ? S.strand
    : v.at === 'poles' ? S.poles[S.poles.length >> 1] : v.at === 'drowned' ? S.drowned[v.k].window : v.at === 'hole' ? S.holes[v.k] : v.at === 'farLight' ? S.farLight : v.at === 'xy' ? { x: v.x, z: v.z } : one(S[v.at], v.k);
  const x = base.x + (v.dx || 0), z = base.z + (v.dz || 0);
  // (the sources as the page built them: the viewer's &beam adds two at every __view)
  window.__src0 ||= [...R.sources];
  R.sources.clear(); for (const s of window.__src0) R.sources.add(s);
  window.__aur0 ||= [SEA.uAur.value, SEA.uAurDark.value, SEA.uAurFront.value];
  const pitch = v.pitch ?? 0.95, zoom = v.zoom ?? 1, lookY = v.lookY ?? 0.9;
  R.cam.pitch = pitch; R.cam.zoom = R.cam.zoomT = zoom; R.cam.lookY = lookY;
  window.__view(x, z, { tide: v.tide, pitch });
  // pinned: the clock, the aurora, the hemisphere's drift (from R.time), the camera, no particles
  WIND.uTime.value = T; SEA.uTime.value = T; R.time = T;
  [SEA.uAur.value, SEA.uAurDark.value, SEA.uAurFront.value] = window.__aur0;
  R.cam.pitch = pitch; R.cam.zoom = R.cam.zoomT = zoom; R.cam.lookY = lookY; R.cam.trauma = 0;
  FX.group.visible = false;
  gfx.frame(0);
  gfx.updateCamera(0, x, z, true);
  R.skyHook?.();
  R.renderer.render(R.scene, R.camera);
  if (noRead) return { at: [+x.toFixed(2), +z.toFixed(2)], pr: R.renderer.getPixelRatio(), calls: R.renderer.info.render.calls };
  const gl = R.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, a = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a);
  let s = ''; const C = 0x8000;
  for (let i = 0; i < a.length; i += C) s += String.fromCharCode.apply(null, a.subarray(i, i + C));
  return { w, h, b64: btoa(s), at: [+x.toFixed(2), +z.toFixed(2)], pr: R.renderer.getPixelRatio(), tide: SEA.uLevel.value, aur: window.__aur0, calls: R.renderer.info.render.calls, sameT: WIND.uTime === SEA.uTime };
}

async function shoot(out, only) {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const base = process.env.BASE || 'http://localhost:5199/';
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const meta = existsSync(out + '/meta.json') ? JSON.parse(readFileSync(out + '/meta.json', 'utf8')) : {}, logs = [];
  for (const [gname, G] of Object.entries(GROUPS)) {
    if (only.length && !only.includes(gname)) continue;
    const t0 = Date.now();
    const ctx = await browser.newContext(G.ctx), p = await ctx.newPage();
    p.on('pageerror', (e) => logs.push(gname + ' pageerror ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') logs.push(gname + ' console ' + m.text().slice(0, 200)); });
    await p.addInitScript(() => { let s = 0x2545f491; Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; });
    await p.goto(base + '?' + G.q);
    await p.waitForFunction(() => window.__ready && window.__v5 && window.__view, null, { timeout: 600000 });
    for (const v of G.views) {
      const r = await p.evaluate(pinAndRead, { v, T: T0 });
      const png = encodePNG(r.w, r.h, Buffer.from(r.b64, 'base64'), true);
      writeFileSync(out + '/' + v.name + '.png', png);
      delete r.b64; meta[v.name] = { group: gname, ...r };
      console.log(v.name, JSON.stringify(meta[v.name]));
    }
    await ctx.close();
    console.log('group', gname, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await browser.close();
  writeFileSync(out + '/meta.json', JSON.stringify(meta, null, 1));
  if (logs.length) console.log([...new Set(logs)].slice(0, 30).join('\n'));
}

// A/B timing of the same pinned view on several trees (one page each, one browser, rounds interleaved): the whole frame;
// the ground alone through a one-pixel scissor (its vertex work: every fragment but one clipped); the ground alone and
// the water alone over the full screen (each drawn with the rest hidden, so without the depth the rest would leave)
async function timeParts({ N }) {
  const R = window.__R, gl = R.renderer.getContext(), px = new Uint8Array(4), r = R.renderer;
  const parts = { ground: [], sea: [] }, all = [];
  R.scene.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
    all.push([o, o.visible]);
    const key = o.material?.customProgramCacheKey?.() || '';
    if (key.startsWith('groundPBR')) parts.ground.push(o); else if (key.startsWith('sea|')) parts.sea.push(o);
  });
  const draw = () => { r.render(R.scene, R.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  const best = (f) => { f(); let b = 1e9; for (let i = 0; i < N; i++) { const t0 = performance.now(); f(); b = Math.min(b, performance.now() - t0); } return +b.toFixed(1); };
  const only = (list, f) => { for (const [o] of all) o.visible = false; for (const o of list) o.visible = true; try { return f(); } finally { for (const [o, v] of all) o.visible = v; } };
  const out = { frame: best(draw) };
  out.groundVS = only(parts.ground, () => { r.setScissorTest(true); r.setScissor(0, 0, 1, 1); try { return best(draw); } finally { r.setScissorTest(false); } });
  out.ground = only(parts.ground, () => best(draw));
  out.sea = only(parts.sea, () => best(draw));
  return out;
}
async function bench(bases) {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const place = process.env.PLACE || 'coast', ROUNDS = +(process.env.ROUNDS || 9), N = +(process.env.N || 3);
  const G = place === 'farlight' ? { q: 'world=farlight&q=1&seed=3', v: { at: 'poles' } } : { q: 'world=coast&q=1&seed=3', v: { at: 'dalaro', dz: 4, tide: 1.2 } };
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pages = [];
  for (const b of bases) {
    const ctx = await browser.newContext(PHONE), p = await ctx.newPage();
    await p.addInitScript(() => { let s = 0x2545f491; Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; });
    await p.goto(b + '?' + G.q);
    await p.waitForFunction(() => window.__ready && window.__v5 && window.__view, null, { timeout: 600000 });
    console.log(b, JSON.stringify(await p.evaluate(pinAndRead, { v: G.v, T: T0, noRead: true })));
    pages.push(p);
  }
  const res = bases.map(() => []);
  for (let k = 0; k < ROUNDS; k++) {
    // (each round in a turned order, so no tree is always first after the others' work)
    for (let j = 0; j < pages.length; j++) { const i = (j + k) % pages.length; res[i].push(await pages[i].evaluate(timeParts, { N })); }
    console.log('round', k, JSON.stringify(res.map((a) => a[a.length - 1])));
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  bases.forEach((b, i) => { const o = {}; for (const key of Object.keys(res[i][0])) o[key] = med(res[i].map((m) => m[key])); console.log('median', place, b, JSON.stringify(o)); });
  // (and each tree against the first, round by round: the median of the per-round ratios)
  bases.forEach((b, i) => { if (!i) return; const o = {}; for (const key of Object.keys(res[i][0])) o[key] = med(res[i].map((m, k) => m[key] / res[0][k][key])).toFixed(3); console.log('vs first', place, b, JSON.stringify(o)); });
  await browser.close();
}

// per shot: pixels differing at all, by more than 1/255, the largest difference, and where (a box); a x16 picture of the
// difference beside the shots when any
function diff(A, B) {
  const names = readdirSync(A).filter((f) => f.endsWith('.png') && !f.startsWith('diff-') && existsSync(B + '/' + f));
  const res = {};
  for (const f of names) {
    const a = decodePNG(readFileSync(A + '/' + f)), b = decodePNG(readFileSync(B + '/' + f));
    if (a.w !== b.w || a.h !== b.h) { res[f] = { size: [a.w, a.h, b.w, b.h] }; continue; }
    let n = 0, n1 = 0, max = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    const vis = Buffer.alloc(a.w * a.h * 4);
    for (let i = 0; i < a.w * a.h; i++) {
      const d = Math.max(Math.abs(a.data[i * 4] - b.data[i * 4]), Math.abs(a.data[i * 4 + 1] - b.data[i * 4 + 1]), Math.abs(a.data[i * 4 + 2] - b.data[i * 4 + 2]));
      vis[i * 4 + 3] = 255;
      if (!d) continue;
      n++; if (d > 1) n1++; if (d > max) max = d;
      const x = i % a.w, y = (i - x) / a.w; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      vis[i * 4] = vis[i * 4 + 1] = vis[i * 4 + 2] = Math.min(255, 64 + d * 16);
    }
    res[f] = { px: a.w * a.h, differ: n, over1: n1, max, box: n ? [x0, y0, x1, y1] : null };
    if (n) writeFileSync(B + '/diff-' + f, encodePNG(a.w, a.h, vis, false));
  }
  return res;
}

// the longest edge of any triangle of the ground and the water (world metres), as built in the world viewer
async function edges() {
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const base = process.env.BASE || 'http://localhost:5199/';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const q of (process.env.EDGES || 'world=coast&q=1&seed=3;world=coast&q=1&seed=3&frozen=1;world=farlight&q=1&seed=3;world=town&q=1').split(';')) {
    const p = await (await browser.newContext({ viewport: { width: 320, height: 200 } })).newPage();
    await p.goto(base + '?' + q);
    await p.waitForFunction(() => window.__ready && window.__lvl, null, { timeout: 600000 });
    const r = await p.evaluate(() => {
      const out = {};
      window.__R.scene.updateMatrixWorld(true);
      window.__R.scene.traverse((m) => {
        if (!m.isMesh || !m.geometry?.attributes?.position) return;
        const key = m.material?.customProgramCacheKey?.() || '';
        const kind = key.startsWith('groundPBR') ? 'ground' : key.startsWith('sea|') ? key : null;
        if (!kind) return;
        const P = m.geometry.attributes.position, I = m.geometry.index, e = m.matrixWorld.elements, n = I ? I.count : P.count;
        const wp = (k) => { const x = P.getX(k), y = P.getY(k), z = P.getZ(k); return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; };
        let mx = 0, mxH = 0;
        for (let t = 0; t + 2 < n; t += 3) {
          const v = [0, 1, 2].map((j) => wp(I ? I.getX(t + j) : t + j));
          for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
            const dx = v[a][0] - v[b][0], dy = v[a][1] - v[b][1], dz = v[a][2] - v[b][2];
            mx = Math.max(mx, Math.hypot(dx, dy, dz)); mxH = Math.max(mxH, Math.hypot(dx, dz));
          }
        }
        const o = (out[kind] ||= { meshes: 0, maxEdge: 0, maxEdgeXZ: 0, moved: 0, shadow: 0 });
        o.meshes++; o.maxEdge = Math.max(o.maxEdge, +mx.toFixed(3)); o.maxEdgeXZ = Math.max(o.maxEdgeXZ, +mxH.toFixed(3));
        // (the water's shader takes its own world point (x, the surface's y, z) for the vertex's: so its mesh must stand
        // unmoved; and a mesh that casts a shadow is drawn by the moon's orthographic camera too)
        if (e.some((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) > 1e-9)) o.moved++;
        if (m.castShadow) o.shadow++;
      });
      return out;
    });
    console.log(q, JSON.stringify(r));
    await p.context().close();
  }
  await browser.close();
}

const [, , mode, a1, a2] = process.argv;
if (mode === 'shoot') await shoot(a1, (a2 || '').split(',').filter(Boolean));
else if (mode === 'diff') { const r = diff(a1, a2); for (const [k, v] of Object.entries(r)) console.log(k.padEnd(24), JSON.stringify(v)); const bad = Object.values(r).filter((v) => v.differ); console.log(JSON.stringify({ shots: Object.keys(r).length, identical: Object.keys(r).length - bad.length, worstMax: Math.max(0, ...bad.map((v) => v.max ?? 99)) })); }
else if (mode === 'edges') await edges();
else if (mode === 'bench') await bench(process.argv.slice(3));
else console.log('node tools/stillshots.mjs shoot <outdir> [groups] | diff <dirA> <dirB> | edges | bench <base> <base> ...');
