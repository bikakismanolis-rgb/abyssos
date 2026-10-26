// Packs Lefkovrachos' houses (Sketchfab, CC-BY 4.0) into src/assets/village.glb, one top-level node per building:
// spec-gloss converted to metal-roughness, feet on y = 0, centred, rescaled to the game, textures WebP.
// The windmill's sails are a part of their own (pivot = the hub) so the game can turn them.
// usage: node tools/pack-village.mjs [dir holding <src>/model.glb]
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadProp, writePack } from './envlib.mjs';

// warm light behind the glass: blue-grey window panes in the atlas become an emissive mask (the lead lattice stays dark)
async function windows(doc) {
  for (const mat of doc.getRoot().listMaterials()) {
    const t = mat.getBaseColorTexture(); if (!t) continue;
    const { data, info } = await sharp(Buffer.from(t.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height);
    for (let i = 0, j = 0; j < out.length; i += 3, j++) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const d = mx - mn, h = d < 0.01 ? -1 : mx === r ? (((g - b) / d) % 6) * 60 : mx === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
      out[j] = h >= 178 && h <= 235 && d / mx > 0.15 && mx > 0.08 && mx < 0.5 && b - r > 0.025 ? 255 : 0;
    }
    const em = await sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } }).blur(0.8).toColourspace('srgb').png().toBuffer();
    mat.setEmissiveTexture(doc.createTexture('windows').setImage(new Uint8Array(em)).setMimeType('image/png')).setEmissiveFactor([1.0, 0.6, 0.28]);
  }
}
// a chimney is a small cluster at the very top (a roof ridge is long)
function chimneyOf(doc) {
  const pts = [], v = [];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); pts.push([...v]); } }
  const top = Math.max(...pts.map((p) => p[1])), hi = pts.filter((p) => p[1] > top - 0.35);
  const ext = (k) => Math.max(...hi.map((p) => p[k])) - Math.min(...hi.map((p) => p[k]));
  if (ext(0) > 1.2 || ext(2) > 1.2) return null;
  const c = (k) => hi.reduce((a, p) => a + p[k], 0) / hi.length;
  return [+c(0).toFixed(2), +(top + 0.1).toFixed(2), +c(2).toFixed(2)];
}

const SRC = process.argv[2] || '/tmp/claude-0/sf/models';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT = path.join(ROOT, 'src/assets/village.glb');
// the mill in its own model space: ground at y = 0, hub of the sails at HUB (turning about x)
const MILL_S = 0.85, HUB = [1.9, 6.57, -0.04];
// key, source folder, triangle budget, options, title, author, page
const B = [
  ['hTall', 'house1', 700, { xform: { s: 0.8 }, prep: windows }, 'Medieval House 1', 'Animau3D', 'https://sketchfab.com/3d-models/medieval-house-1-0bbda345359349ea95280f597c8a4bd4'],
  ['hStilt', 'house2', 700, { xform: { s: 0.8 }, prep: windows }, 'Medieval House 2', 'Animau3D', 'https://sketchfab.com/3d-models/medieval-house-2-bc9272b74e544db1b93b0ebee8689bf4'],
  ['hLong', 'house3', 700, { xform: { s: 0.8 }, prep: windows }, 'Medieval House 3', 'Animau3D', 'https://sketchfab.com/3d-models/medieval-house-3-cf179aa6dc0944f1974ce3f7812031a6'],
  ['hInn', 'house4', 1500, { xform: { s: 0.8 }, prep: windows }, 'Medieval House 4', 'Animau3D', 'https://sketchfab.com/3d-models/medieval-house-4-b42578994a334bb1a544c51043276f85'],
  ['hManor', 'house_gt', 4200, { height: 8.4 }, 'Medieval house | Generic Textures | Game ready', 'by__Rx', 'https://sketchfab.com/3d-models/medieval-house-generic-textures-game-ready-3eb9e3b600264e2f99100fc43619497e'],
  ['hMarket', 'house_stilts', 1504, { height: 7.6 }, 'Medieval house', 'Young_Wizard', 'https://sketchfab.com/3d-models/medieval-house-4ec56df1c24d422ea85d1cfbf21bbe8c'],
  ['hHall', 'warehouse', 5200, { height: 10 }, 'Medieval Warehouse', 'timowes', 'https://sketchfab.com/3d-models/medieval-warehouse-570438bab7f94bbba71fb86b8a89bde6'],
  ['hMill', 'windmill', 4200, { xform: { s: MILL_S, off: [0, 0.12, 0] }, drop: /Plane|Kamni|Box266/, d: 256, n: 128, orm: 128 }, 'Windmill', 'KaramellGlass', 'https://sketchfab.com/3d-models/windmill-92f751dab03e4a2792348a21b3673ec1'],
  // the smithy, the market and the healer's corner
  ['sStall', 'tents', 1700, { only: /^Object_(4|6|8|10)$/, height: 2.3 }, 'Medieval Tents', 'AnyRPG', 'https://sketchfab.com/3d-models/medieval-tents-eaa80cf29ceb4c0099698a5f5c7aea8d'],
  ['sAwning', 'tents', 1760, { only: /^Object_(12|14)$/, height: 2.5 }, 'Medieval Tents', 'AnyRPG', 'https://sketchfab.com/3d-models/medieval-tents-eaa80cf29ceb4c0099698a5f5c7aea8d'],
  ['sTent', 'tents', 1200, { only: /^Object_(16|18)$/, height: 2.1 }, 'Medieval Tents', 'AnyRPG', 'https://sketchfab.com/3d-models/medieval-tents-eaa80cf29ceb4c0099698a5f5c7aea8d'],
  ['sForge', 'forge', 3600, { height: 4.4 }, 'Forge And Bellow', 'RBG_illustrations', 'https://sketchfab.com/3d-models/forge-and-bellow-e4b8f1ae6d6744da863812a5081b941e'],
  ['sAnvil', 'anvilset', 1078, { only: /^Anvil/, height: 0.9, d: 256, n: 128, orm: 128 }, 'Anvil, Water Bucket And Water Trough', 'RBG_illustrations', 'https://sketchfab.com/3d-models/anvil-water-bucket-and-water-trough-fddb4946ae574427a2d4ccc1fb17e33a'],
  ['sTrough', 'anvilset', 388, { only: /^trough/, height: 0.42, d: 256, n: 128, orm: 128 }, 'Anvil, Water Bucket And Water Trough', 'RBG_illustrations', 'https://sketchfab.com/3d-models/anvil-water-bucket-and-water-trough-fddb4946ae574427a2d4ccc1fb17e33a'],
  ['sBucket', 'anvilset', 576, { only: /^bucket/, height: 0.38, d: 256, n: 128, orm: 128 }, 'Anvil, Water Bucket And Water Trough', 'RBG_illustrations', 'https://sketchfab.com/3d-models/anvil-water-bucket-and-water-trough-fddb4946ae574427a2d4ccc1fb17e33a'],
  ['sGrind', 'grindstone', 1600, { height: 1.15, d: 256, n: 128, orm: 128 }, 'Medieval Grindstone', 'Thangzy', 'https://sketchfab.com/3d-models/medieval-grindstone-eb2ae5a1c1014ee989339ef8325ed804'],
  ['sWell', 'well', 3400, { height: 2.9 }, 'Well', 'FlukierJupiter', 'https://sketchfab.com/3d-models/well-d8442bc92f224f0ebfa8446a1bca836d'],
  ['hSails', 'windmill', 1600, { xform: { s: MILL_S, off: HUB.map((v) => -v) }, only: /Box266/, solid: false, anchor: [HUB[0] * MILL_S, (HUB[1] + 0.12) * MILL_S, HUB[2] * MILL_S], d: 256, n: 128, orm: 128, alpha: false }, 'Windmill (sails)', 'KaramellGlass', 'https://sketchfab.com/3d-models/windmill-92f751dab03e4a2792348a21b3673ec1']
];
const loaded = [], report = [];
for (const [key, dir, tris, o] of B) {
  const P = Object.assign({ key, src: dir, file: path.join(SRC, dir, 'model.glb'), tris, err: 0.02, d: 512, n: 256, orm: 256, solid: true, ground: !o.xform, centre: !o.xform }, o);
  const { doc, before, after, modes } = await loadProp(P);
  if (key.startsWith('h') && key !== 'hSails' && key !== 'hHall') { const c = chimneyOf(doc); if (c) P.extra = { chimney: c }; }
  loaded.push({ P, doc });
  report.push(`${key.padEnd(8)} ${String(before).padStart(6)} -> ${String(after).padStart(5)} tris (${modes}) size ${P.bounds.size.map((x) => x.toFixed(1)).join('x')}${P.extra?.chimney ? ' chimney ' + P.extra.chimney.join(',') : ''}`);
}
const authors = [...new Set(B.map((b) => b[5]))].join(', ');
// the Sketchfab page as the download recorded it (meta.json from the downloader), else the one written above
function pageOf(b) { try { return JSON.parse(readFileSync(path.join(SRC, b[1], 'meta.json'), 'utf8')).url || b[6]; } catch (e) { return b[6]; } }
const res = await writePack(loaded, OUT, { credit: `Village buildings by ${authors} (sketchfab.com), CC-BY 4.0. Rescaled, decimated and re-encoded (WebP) for Skotos.`, license: 'CC-BY-4.0' });
console.log(report.join('\n'));
console.log(`village.glb ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures`);
writeFileSync(path.join(ROOT, 'src/assets/VILLAGE_CREDITS.txt'), [
  'Skotos village buildings (src/assets/village.glb) - CC-BY 4.0, from sketchfab.com.',
  'Packed by tools/pack-village.mjs: rescaled, decimated, textures re-encoded as WebP; the windmill without its base and rocks.', '',
  ...B.filter((b) => b[0] !== 'hSails').map((b) => `  ${b[0]}: "${b[4]}" by ${b[5]} - ${pageOf(b)}`), ''
].join('\n'));
