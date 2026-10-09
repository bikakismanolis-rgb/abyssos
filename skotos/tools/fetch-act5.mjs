// Downloads every third-party source of Act V (docs/act5-design.md, "Assets": creatures, props, ground layers), and the
// design's fallbacks on demand. Nothing lands in the repository:
//   Sketchfab   /tmp/claude-0/sf/act5/<name>/model.glb (or gltf/scene.gltf from the archive) + meta.json
//   Poly Haven  /tmp/claude-0/ph/<id>/<id>_{diff,nor_gl,arm}_1k.jpg (layers), <id>_1k.gltf + .bin + textures/ (models),
//               meta.json, and /tmp/claude-0/ph/dl_log.json ({ id: { authors } }, read by the packers' CREDITS writers)
//   ambientCG   /tmp/claude-0/ph/<id>/<id>_1K-JPG.zip, extracted beside it, + meta.json
// meta.json keeps the API's record: licence, author, isDownloadable, faceCount, animationCount, publishedAt, viewerUrl
// (and url, tags, description, thumbnail, the format and bytes fetched). Idempotent: an entry whose files are all there
// (sizes as recorded, md5 where the API gives one) is skipped. A Sketchfab entry is refused unless the API still says
// downloadable with a CC-BY 4.0 or CC0 licence; an author other than the design's is reported.
// Format: the GLB (one file, and mostly the smaller: the Ocean Creature's is 44 MB against a 215 MB glTF archive) unless
// the glTF archive is under 60% of a GLB over 8 MB (scans whose GLB carries PNG maps), or no GLB is offered; `fmt`
// overrides. An archive is extracted to <name>/gltf/ and meta.model names the .gltf inside. Poly Haven at 1k (the layers
// ship d 1024 / n 512, the props 1024 at most).
// usage: node tools/fetch-act5.mjs [--only=name,...] [--with=fallback,...] [--fallbacks] [--dry] [--force]
//   --only: just these entries; --with / --fallbacks: also the named / all fallbacks (fetched only once a gate fails);
//   --dry: metadata and download sizes, nothing written; --force: fetch again over what is there.
//   Needs $SKETCHFAB_API_TOKEN for Sketchfab (never printed or written).
import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync, renameSync, rmSync, createReadStream, createWriteStream } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

// Node's fetch reads HTTPS_PROXY only with NODE_USE_ENV_PROXY (Node >= 22.21): run again with it set
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  process.exit(r.status ?? 1);
}

const SF_DIR = '/tmp/claude-0/sf/act5', PH_DIR = '/tmp/claude-0/ph';
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3).split(',').filter(Boolean);
const ONLY = arg('only'), WITH = arg('with'), ALLFB = process.argv.includes('--fallbacks');
const DRY = process.argv.includes('--dry'), FORCE = process.argv.includes('--force');

// ---------- the sources ----------
// sf: Sketchfab uid; ph: Poly Haven id (kind 'tex' = a tiling layer's maps, 'model' = its glTF); acg: ambientCG id.
// name: the download folder; author and lic as the design credits them; use: what it becomes; fallback: the primary it
// replaces (not fetched unless asked); shipped: already in the game, nothing to fetch.
const BY = 'CC-BY 4.0', CC0 = 'CC0 1.0';
const SOURCES = [
  // ----- creatures (group act5) -----
  { name: 'crab', sf: 'ac8fa79586f84c84a8a55dd86b7a2e2f', title: 'Crab mountain', author: 'pro100voron', lic: BY, use: 'crab.glb: the Walking Tower (boss) and the Reefback' },
  { name: 'skotos', sf: '5c17cca6086e4910aa12e7d701ccd6a1', title: 'Ocean Creature', author: 'bast_yy (bast_y)', lic: BY, use: 'skotos.glb: the Skotos (boss)' },
  { name: 'tentacle', sf: '8fcc783af94246a0b8febf424a4b96b9', title: 'Tentacle (rigged)', author: 'CG Daniel Glebinski', lic: BY, use: 'tentacle.glb: the Hands of the Skotos, the Coil' },
  { name: 'icemaw', sf: '3f4a2090598b4741ac38e0d255ece191', title: 'Leopard Seal', author: 'Grace Belt (neatGrace)', lic: BY, use: 'icemaw.glb: the Icemaw' },
  { name: 'louse', sf: '3979c291d1f9454c90851efe291eab60', title: 'CC0 Giant Isopod, B. doederleinii', author: 'ffish.asia / floraZia.com', lic: CC0, use: 'louse.glb: the Hull-louse' },
  { name: 'skua', sf: 'dc42ffc81c86480e9e7f7752fa134174', title: 'Seagull', author: 'Dayvable', lic: BY, use: 'skua.glb: the Skua' },
  { name: 'bear', sf: 'bffc3c87d2d148ff8533e1cc8a11c9f1', title: 'Realistic Animated Bear', author: 'WildMesh 3D', lic: BY, use: 'the Rime Bear (runtime tint of the shipped bear)', shipped: 'src/assets/creatures/bear.glb' },
  { name: 'crab_giant', sf: '6295676291c141728457ef7550b0650a', title: 'Giant Crab', author: 'Mohamed (mohamedbenarous)', lic: BY, use: 'the Walking Tower', fallback: 'crab' },
  { name: 'lurker', sf: '28b3e1a216904de7ad212368fb9d8f59', title: 'Lurker - Rigged and Animated', author: 'HighPolyDensity', lic: BY, use: 'the Skotos', fallback: 'skotos' },
  { name: 'woodlouse', sf: 'fae04aa296f844c18675f6ae50aefe77', title: 'Woodlouse', author: '.hapto GmbH', lic: BY, use: 'the Hull-louse', fallback: 'louse' },
  { name: 'seal', sf: 'fb79ae1e6021481f819f34ebc2dcaecd', title: 'Seal/Baikal/Непра', author: 'fedalina', lic: BY, use: 'the Icemaw', fallback: 'icemaw' },
  // ----- props (pack rime) -----
  { name: 'wreck', sf: '027900c8fdf840f589cadb9f4a60d78c', title: 'The Dalarö wreck / Bodekull part 2', author: 'Swedish National Maritime and Transport History Museums (maritima)', lic: BY, use: 'hero wreck' },
  { name: 'keelboat', sf: '01098ad7973647a9b558f41d2ebc5193', title: 'Gislinge Viking Boat (no sail)', author: 'Opus Poly', lic: BY, use: 'keel-boats' },
  { name: 'rowboat', sf: '9922d5678af84adeb1c9b479856446ca', title: 'Old Rowboat', author: 'TooManyDemons', lic: BY, use: 'rowboat' },
  { name: 'brokenboat', sf: '41c2bcc5ca544897a132be71f3b2673a', title: 'Broken Row Boat', author: 'megamaniac', lic: BY, use: 'broken boat' },
  { name: 'towers', sf: 'f213359c6cbb4c29bf8880764faa0fb8', title: 'Pack of old towers in ruins', author: 'JB3D (taz83)', lic: BY, use: 'towerA/B/C: the sea-lights, the Skerry Light' },
  { name: 'lighthouse', sf: '19e1ff049db74dc8b6173976417c1048', title: 'Old Lighthouse', author: 'Nirved Kamble', lic: BY, use: 'the Farthest Light (shaft only)' },
  { name: 'anchor', sf: '5896ac54d63e4b84bd32e0b232619dfd', title: 'Medieval Anchor (Free)', author: 'wolfgar74', lic: BY, use: 'anchor' },
  { name: 'anchor_sunken', sf: 'e654cb6e6e2c4217a7decb6bb9c0010d', title: 'Sunken Anchor', author: 'guillaume.biju-duval', lic: BY, use: 'sunken anchor' },
  { name: 'whale', sf: '5c8664c56f9a4cf3ae6d9b8ec33b8dba', title: 'Skeleton - North Atlantic Right Whale', author: 'Ingenium Canada (technoscience3d)', lic: BY, use: 'whale bones' },
  { name: 'runestone', sf: 'd95a850cd9114828a18b5dd72878d9ec', title: 'Monumental Runic Stone - Optimised, 20k', author: 'Thomas Flynn (nebulousflynn)', lic: BY, use: 'Name-stones' },
  { name: 'barnacle_rock', sf: '21c9848ca38b4d289e2f38a98a905f86', title: 'Beach Rock with Barnacles Photoscan', author: 'EFX (evan4129)', lic: BY, use: 'barnacle rocks' },
  { name: 'driftwood', sf: '95d1087e513e4fb992a27b7b8a05ca9e', title: 'Large Pine Driftwood (Pacific Northwest)', author: 'Crew Froebel (crufro)', lic: BY, use: 'driftwood' },
  { name: 'kelp', sf: 'c9b5ef07047a4b7a90a4ffd6930ec22c', title: 'Scan of Kelp and Seaweed on sand beach', author: 'sterlingcrispin', lic: BY, use: 'kelp heaps (credited CC-BY 4.0 despite "cc0" in its description)' },
  { name: 'icicle', sf: '2dc75ae22f1c4d11abbfd32819312a12', title: 'Icicle 01', author: 'Elin Hohler (ElinHohler)', lic: BY, use: 'icicles' },
  { name: 'shack', sf: 'b0bc474f7803488dbe0fa5aeef2e9ace', title: 'Wooden Shack', author: 'Dominic Baker (Domuk)', lic: BY, use: 'shack' },
  { ph: 'dutch_ship_medium', kind: 'model', author: 'James Ray Cock, Rico Cilliers, Nicolò Zubbini', lic: CC0, use: 'the Icebound Ship (sails dropped)' },
  { ph: 'wooden_barrels_01', kind: 'model', author: 'James Ray Cock', lic: CC0, use: 'whale-oil casks' },
  { ph: 'wooden_crate_02', kind: 'model', author: 'James Ray Cock, Jurita Burger', lic: CC0, use: 'crates' },
  { ph: 'vintage_oil_lamp', kind: 'model', author: 'Monsta3D', lic: CC0, use: 'sea-lanterns' },
  { ph: 'coastal_cliff_01', kind: 'model', author: 'Rob Tuytel, Rico Cilliers', lic: CC0, use: 'cliffs (geometry; seaCliff layer)' },
  { ph: 'rock_face_01', kind: 'model', author: 'Dario Barresi', lic: CC0, use: 'cliffs (geometry; seaCliff layer)' },
  { ph: 'wooden_lantern_01', kind: 'model', author: 'James Ray Cock', lic: CC0, use: 'drowned lanterns', shipped: 'src/assets/env.glb' },
  // ----- ground layers (pack rime, d 1024 / n 512) -----
  { ph: 'snow_02', kind: 'tex', author: 'Rob Tuytel', lic: CC0, use: 'layer snow' },
  { ph: 'snow_03', kind: 'tex', author: 'Rob Tuytel', lic: CC0, use: 'layer snowTrod' },
  { ph: 'low_tide_rocks', kind: 'tex', author: 'Dimitrios Savva', lic: CC0, use: 'layer shore' },
  { ph: 'seaside_rock', kind: 'tex', author: 'Dimitrios Savva', lic: CC0, use: 'layer seaCliff' },
  { ph: 'wood_planks_grey', kind: 'tex', author: 'Rob Tuytel', lic: CC0, use: 'layer planks' },
  { acg: 'Ice002', res: '1K-JPG', author: 'ambientCG (Lennart Demes)', lic: CC0, use: 'layer ice' }
];
const RES = '1k', TEX_MAPS = ['Diffuse', 'nor_gl', 'arm'], TEX_ALT = { arm: ['Rough', 'AO'] };

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mb = (b) => (b / 1048576).toFixed(b < 1048576 ? 2 : 1) + ' MB';
const size = (f) => (existsSync(f) ? statSync(f).size : -1);
const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { return null; } };
const md5 = (f) => new Promise((ok, no) => { const h = createHash('md5'); createReadStream(f).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', no); });
// retries server errors and rate limits (429: waits as long as Retry-After says, else 20 s, 40 s, ...)
async function getJson(url, headers = {}) {
  for (let i = 0; ; i++) {
    let wait = 1500 * (i + 1);
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return await r.json();
      if (r.status < 500 && r.status !== 429) throw Object.assign(new Error(`HTTP ${r.status} ${url.replace(/\?.*/, '')}`), { fatal: true });
      if (r.status === 429) wait = Math.max(+r.headers.get('retry-after') || 0, 20 * (i + 1)) * 1000;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (e.fatal || i >= 5) throw e; await sleep(wait); }
  }
}
// streams url to file (through file.part), checks the expected size / md5 when given; returns the bytes
async function download(url, file, want = {}) {
  mkdirSync(path.dirname(file), { recursive: true });
  const part = file + '.part';
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await pipeline(Readable.fromWeb(r.body), createWriteStream(part));
      const n = size(part);
      if (want.size && n !== want.size) throw new Error(`size ${n} != ${want.size}`);
      if (want.md5 && (await md5(part)) !== want.md5) throw new Error('md5 mismatch');
      renameSync(part, file);
      return n;
    } catch (e) { rmSync(part, { force: true }); if (i >= 3) throw new Error(`${path.basename(file)}: ${e.message}`); await sleep(2000 * (i + 1)); }
  }
}
const unzip = (zip, dir) => execFileSync('unzip', ['-o', '-q', zip, '-d', dir], { stdio: ['ignore', 'ignore', 'inherit'] });

// ---------- Sketchfab ----------
const TOKEN = process.env.SKETCHFAB_API_TOKEN;
const SF_LIC = { by: 'CC-BY 4.0', cc0: 'CC0 1.0' };
async function fetchSketchfab(S) {
  const dir = path.join(SF_DIR, S.name), metaFile = path.join(dir, 'meta.json');
  const old = readJson(metaFile);
  if (!FORCE && old?.file && old.model && size(path.join(dir, old.file)) === old.bytes && existsSync(path.join(dir, old.model))) return { path: path.join(dir, old.model), bytes: old.bytes, skipped: true };
  if (!TOKEN) throw new Error('SKETCHFAB_API_TOKEN is not set');
  const auth = { Authorization: `Token ${TOKEN}` };
  const m = await getJson(`https://api.sketchfab.com/v3/models/${S.sf}`, auth);
  const lic = SF_LIC[m.license?.slug];
  if (!lic) throw new Error(`licence "${m.license?.label}" is not CC-BY 4.0 or CC0`);
  if (!m.isDownloadable) throw new Error('not downloadable');
  const user = m.user || {};
  const authorOk = [user.username, user.displayName].some((u) => u && S.author.toLowerCase().includes(u.toLowerCase()));
  const dl = await getJson(`https://api.sketchfab.com/v3/models/${S.sf}/download`, auth);
  const fmt = S.fmt || (dl.glb && !(dl.gltf && dl.glb.size > 8e6 && dl.gltf.size < 0.6 * dl.glb.size) ? 'glb' : 'gltf');
  if (!dl[fmt]) throw new Error(`no ${fmt} download (offered: ${Object.keys(dl).join(', ')})`);
  const offered = Object.fromEntries(Object.entries(dl).map(([k, v]) => [k, v.size]));
  const meta = {
    name: m.name, uid: m.uid, url: m.viewerUrl, viewerUrl: m.viewerUrl,
    license: { label: m.license.label, slug: m.license.slug, url: m.license.url, as: lic },
    author: { username: user.username, displayName: user.displayName, profileUrl: user.profileUrl },
    isDownloadable: m.isDownloadable, faceCount: m.faceCount, vertexCount: m.vertexCount, animationCount: m.animationCount,
    textureCount: m.textureCount, materialCount: m.materialCount, publishedAt: m.publishedAt, createdAt: m.createdAt, updatedAt: m.updatedAt,
    tags: (m.tags || []).map((t) => t.name), description: m.description,
    thumbnail: [...(m.thumbnails?.images || [])].sort((a, b) => b.width - a.width)[0]?.url,
    design: { title: S.title, author: S.author, licence: S.lic, use: S.use, fallbackFor: S.fallback || null, authorMatches: authorOk },
    offered, format: fmt
  };
  if (DRY) return { dry: true, meta };
  mkdirSync(dir, { recursive: true });
  let file, bytes;
  if (fmt === 'glb') {
    file = 'model.glb';
    bytes = await download(dl.glb.url, path.join(dir, file), { size: dl.glb.size });
    meta.model = file;
  } else {
    const zip = path.join(dir, `${fmt}.zip`);
    bytes = await download(dl[fmt].url, zip, { size: dl[fmt].size });
    rmSync(path.join(dir, fmt), { recursive: true, force: true });
    unzip(zip, path.join(dir, fmt));
    file = `${fmt}.zip`;
    const find = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { const q = find(p); if (q) return q; } else if (/\.(gltf|glb|fbx|blend|obj)$/i.test(e.name)) return p; } return null; };
    const model = find(path.join(dir, fmt));
    if (!model) throw new Error(`no model inside ${file}`);
    meta.model = path.relative(dir, model);
  }
  Object.assign(meta, { file, bytes, fetchedAt: new Date().toISOString() });
  writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  return { path: path.join(dir, meta.model), bytes, meta };
}

// ---------- Poly Haven ----------
const phLog = readJson(path.join(PH_DIR, 'dl_log.json')) || {};
async function fetchPolyHaven(S) {
  const dir = path.join(PH_DIR, S.ph), metaFile = path.join(dir, 'meta.json');
  const old = readJson(metaFile);
  const there = (o) => o?.files?.length && o.files.every((f) => size(path.join(dir, f.path)) === f.size);
  if (!FORCE && there(old)) return { path: dir, bytes: old.files.reduce((s, f) => s + f.size, 0), skipped: true };
  const [info, files] = await Promise.all([getJson(`https://api.polyhaven.com/info/${S.ph}`), getJson(`https://api.polyhaven.com/files/${S.ph}`)]);
  const list = [];   // { path (relative to dir), url, size, md5 }
  if (S.kind === 'model') {
    const g = files.gltf?.[RES]?.gltf;
    if (!g) throw new Error(`no ${RES} glTF`);
    list.push({ path: `${S.ph}_${RES}.gltf`, url: g.url, size: g.size, md5: g.md5 });
    for (const [p, f] of Object.entries(g.include || {})) list.push({ path: p, url: f.url, size: f.size, md5: f.md5 });
  } else {
    for (const k of TEX_MAPS) {
      for (const kk of files[k]?.[RES] ? [k] : (TEX_ALT[k] || [])) {
        const f = files[kk]?.[RES]?.jpg;
        if (!f) throw new Error(`no ${RES} ${kk} map`);
        list.push({ path: path.basename(new URL(f.url).pathname), url: f.url, size: f.size, md5: f.md5 });
      }
    }
  }
  const authors = Object.keys(info.authors || {});
  const meta = {
    id: S.ph, name: info.name, url: `https://polyhaven.com/a/${S.ph}`, license: 'CC0 1.0', authors,
    datePublished: info.date_published ? new Date(info.date_published * 1000).toISOString() : null,
    categories: info.categories, tags: info.tags, dimensions: info.dimensions, polycount: info.polycount ?? null,
    design: { author: S.author, licence: S.lic, use: S.use, kind: S.kind }, res: RES,
    files: list.map(({ path: p, size: s, md5: h }) => ({ path: p, size: s, md5: h }))
  };
  if (DRY) return { dry: true, meta, bytes: list.reduce((s, f) => s + f.size, 0) };
  let bytes = 0;
  for (const f of list) {
    const out = path.join(dir, f.path);
    if (!out.startsWith(dir + path.sep)) throw new Error(`bad path ${f.path}`);
    bytes += !FORCE && size(out) === f.size ? f.size : await download(f.url, out, f);
  }
  meta.fetchedAt = new Date().toISOString();
  writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  phLog[S.ph] = { authors, name: info.name, kind: S.kind, res: RES };
  return { path: dir, bytes, meta };
}

// ---------- ambientCG ----------
async function fetchAmbientCG(S) {
  const dir = path.join(PH_DIR, S.acg), metaFile = path.join(dir, 'meta.json');
  const old = readJson(metaFile);
  if (!FORCE && old?.file && size(path.join(dir, old.file)) === old.bytes) return { path: dir, bytes: old.bytes, skipped: true };
  const j = await getJson(`https://ambientcg.com/api/v2/full_json?id=${S.acg}&include=downloadData,displayData,tagData`);
  const a = j.foundAssets?.[0];
  if (!a) throw new Error('not found');
  const d = a.downloadFolders?.default?.downloadFiletypeCategories?.zip?.downloads?.find((x) => x.attribute === S.res);
  if (!d) throw new Error(`no ${S.res} zip`);
  const file = `${S.acg}_${S.res}.zip`;
  const meta = {
    id: S.acg, name: a.displayName, url: a.shortLink || `https://ambientcg.com/view?id=${S.acg}`, license: 'CC0 1.0',
    releaseDate: a.releaseDate, dataType: a.dataType, creationMethod: a.creationMethod, tags: a.tags, maps: a.maps,
    design: { author: S.author, licence: S.lic, use: S.use }, res: S.res, file, bytes: d.size
  };
  if (DRY) return { dry: true, meta, bytes: d.size };
  const bytes = await download(d.fullDownloadPath || d.downloadLink, path.join(dir, file), { size: d.size });
  unzip(path.join(dir, file), dir);
  Object.assign(meta, { bytes, fetchedAt: new Date().toISOString() });
  writeFileSync(metaFile, JSON.stringify(meta, null, 1));
  phLog[S.acg] = { authors: ['ambientCG'], name: a.displayName, kind: 'tex', res: S.res };
  return { path: dir, bytes, meta };
}

// ---------- run ----------
const key = (S) => S.name || S.ph || S.acg;
const todo = SOURCES.filter((S) => (!ONLY.length || ONLY.includes(key(S))) && (!S.fallback || ALLFB || WITH.includes(key(S)) || ONLY.includes(key(S))));
const results = [];
for (const S of SOURCES.filter((S) => !todo.includes(S) && (!ONLY.length || ONLY.includes(key(S))))) results.push({ name: key(S), uid: S.sf || S.ph || S.acg, ok: null, note: S.fallback ? `fallback for ${S.fallback}: not fetched (--with=${key(S)})` : 'not selected' });
let next = 0;
async function worker() {
  while (next < todo.length) {
    const S = todo[next++], name = key(S), uid = S.sf || S.ph || S.acg;
    if (S.shipped) results.push({ name, uid, ok: true, path: S.shipped, bytes: 0, note: 'shipped: nothing to fetch' });
    else try {
      const r = await (S.sf ? fetchSketchfab(S) : S.ph ? fetchPolyHaven(S) : fetchAmbientCG(S));
      const warn = r.meta?.design && r.meta.design.authorMatches === false ? `author is ${r.meta.author.username} (${r.meta.author.displayName})` : '';
      const note = r.dry ? `offered ${r.meta.offered ? Object.entries(r.meta.offered).map(([k, v]) => `${k} ${mb(v)}`).join(', ') : mb(r.bytes)}; faces ${r.meta.faceCount ?? r.meta.polycount ?? '-'}, clips ${r.meta.animationCount ?? '-'}, ${r.meta.license?.as || r.meta.license}` : r.skipped ? 'already there' : 'fetched';
      results.push({ name, uid, ok: true, path: r.path, bytes: r.bytes ?? 0, note: [note, warn].filter(Boolean).join('; ') });
    } catch (e) {
      results.push({ name, uid, ok: false, error: e.message });
    }
    const x = results[results.length - 1];
    console.log(`${x.ok ? 'ok  ' : 'FAIL'} ${name.padEnd(18)} ${x.bytes ? mb(x.bytes).padStart(9) : ''.padStart(9)}  ${x.error || x.note || ''}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
if (!DRY) { mkdirSync(PH_DIR, { recursive: true }); writeFileSync(path.join(PH_DIR, 'dl_log.json'), JSON.stringify(phLog, null, 1)); }
const order = SOURCES.map(key);
results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
if (!DRY) { mkdirSync(SF_DIR, { recursive: true }); writeFileSync(path.join(SF_DIR, 'fetch-log.json'), JSON.stringify(results, null, 1)); }
const failed = results.filter((r) => r.ok === false);
console.log(`\n${results.filter((r) => r.ok).length} ok, ${failed.length} failed, ${results.filter((r) => r.ok === null).length} not fetched; ${mb(results.reduce((s, r) => s + (r.ok ? r.bytes || 0 : 0), 0))}${DRY ? ' (dry run)' : ''}`);
process.exit(failed.length ? 1 : 0);
