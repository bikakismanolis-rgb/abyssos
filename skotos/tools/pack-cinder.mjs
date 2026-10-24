// Packs the Act IV environment set ('cinder' pack: the Field of Ash and the Ashen Forge), loaded with loadPack('cinder'):
//   src/assets/cinder/<id>_d.webp, <id>_n.webp   tiling layers: char and trodden ash, black scree, the pale Wayfarers' Road,
//                                                 cliff rock, the Forge's volcanic tiles and herringbone, iron plate, a vent
//                                                 grate (its slots near black) and rust; grateGlow_d.webp is the grate's
//                                                 emissive mask (white in the slots; a layer with no normal map)
//   src/assets/cinder.glb                         props (see PROPS; extras.size on every one, extras.pivot/fire/neck where noted)
//   src/assets/cinder/CREDITS.txt
// Layers and most props are Poly Haven (CC0); the war-drake's bones, the ruined tower, the brazier, the bellows, the anvil and
// the forge clutter (tongs, quench trough, workbench, stump) are Sketchfab (CC-BY 4.0).
// usage: node tools/pack-cinder.mjs [polyhaven dir] [sketchfab models dir]
//   ONLY=layers|props rebuilds one half; KEYS=a,b packs only those props into <os tmp>/skotos-cinder/cinder.test.glb (the
//   pack is left alone); LAYER=a,b rebuilds only those layers, OUT_DIR=dir elsewhere, LAYERX='{"id":{...}}' overrides (trials)
//   polyhaven dir: tex/<id>/<id>_{diff,nor_gl,arm}_1k.jpg and models/<id>/<id>_1k.gltf (ph_dl.py), dl_log.json (authors)
//   sketchfab dir: <folder>/model.glb + meta.json (dl.py): c4_ribs, c4_spine, c4_skull, c4_tower, c4_brazier, c4_bellows,
//   c4_anvil, c4_smith
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as THREE from 'three';
import sharp from 'sharp';
import { prune, transformMesh, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { io, loadProp, writePack, simplifyPrim, triCount } from './envlib.mjs';

const PH = process.argv[2] || '/tmp/claude-0/ph';
const SF = process.argv[3] || '/tmp/claude-0/sf/models';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_TEX = path.join(ROOT, 'src/assets/cinder');
const OUT_GLB = path.join(ROOT, 'src/assets/cinder.glb');
const TMP = path.join(os.tmpdir(), 'skotos-cinder');

// ---------- tiling layers (Poly Haven, CC0) ----------
// grade: { mul, sat, gamma, contrast, mean } as in pack-wood.mjs (mean: the layer's average sRGB colour, set last);
// quilt: the tile rebuilt from soft-edged patches of the source so its blotches do not repeat tile after tile;
// flat: the tile's broad brightness blotches divided out; nboost: normal map strength; nsrgb: the source normal map is
// gamma-encoded (decoded to linear first). The act's palette: grey-black ash under a dull red sun, black iron, soot.
const LAYERS = [
  // burnt ground (scorched earth, charred grass stalks) taken to grey-black ash, its big blotches flattened out: the Field's base
  { id: 'ashGround', src: 'burned_ground_01', d: 1024, n: 512, ao: 0.8, flat: { k: 0.75 }, grade: { sat: 0.3, contrast: 1.15, mean: [70, 67, 63] } },
  // fine grey dust trampled with footprints (the scan's one trail), quilted in turned patches so the prints go every way
  // instead of marching in one file tile after tile
  { id: 'ashTrod', src: 'moon_footprints_01', d: 1024, n: 512, ao: 1.0, quilt: { k: 1.0, cells: 3, seed: 5, flat: 0.6, turns: 4, sharp: 5 }, grade: { sat: 0.2, contrast: 1.5, mean: [96, 93, 89] }, nboost: 1.4 },
  // broken angular stones taken to black: volcanic scree
  { id: 'scree', src: 'gray_rocks', d: 1024, n: 512, ao: 0.9, grade: { sat: 0.25, contrast: 1.3, mean: [50, 48, 46] }, nboost: 1.15 },
  // pale grey dust and pebbles: the Wayfarers' Road (the scan's normal map was saved sRGB-encoded: decoded first)
  { id: 'road', src: 'rocks_ground_09', nsrgb: true, d: 1024, n: 512, ao: 0.8, grade: { sat: 0.35, contrast: 1.05, mean: [118, 112, 104] } },
  // near-black layered rock (its broad shading flattened a little): the cliffs of the Black Anvil, rocks stoned in world space
  { id: 'cliffRock', src: 'dark_rock_02', d: 1024, n: 512, ao: 0.9, flat: { k: 0.6, r: 0.12 }, grade: { sat: 0.35, contrast: 1.25, mean: [56, 53, 50] } },
  // dark volcanic stone set in rows: the Forge's floors
  { id: 'forgeTiles', src: 'volcanic_rock_tiles', d: 1024, n: 512, ao: 0.85, grade: { sat: 0.75, contrast: 1.1, mean: [62, 55, 50] } },
  // dark stone herringbone: Karthax's paving (darker and warmer than the deep pack's grey herring)
  { id: 'forgeHerring', src: 'volcanic_herringbone_01', d: 1024, n: 512, ao: 0.85, grade: { sat: 0.6, contrast: 1.15, mean: [60, 55, 51] } },
  // riveted, scratched iron plates: flue floors
  { id: 'ironPlate', src: 'metal_plate_02', d: 1024, n: 512, ao: 0.8, grade: { sat: 0.4, contrast: 1.15, mean: [66, 63, 60] } },
  // a vent grate (see grate()): bearing bars along v with two cross bars and a frame at the tile's edge, cast from the
  // plate's iron with the rust over it; the slots are near black (build.js grateMat lights dark texels) and grateGlow_d.webp
  // is the same slots as an emissive mask
  { id: 'grate', src: 'metal_plate_02', rust: 'rust_coarse_01', synth: 'grate', d: 1024, n: 512, ao: 0.8, mask: 512 },
  // coarse rust, quilted (the scan has one big light-dark sweep across it), browned a little
  { id: 'rust', src: 'rust_coarse_01', d: 1024, n: 512, ao: 0.8, quilt: { k: 1.0, cells: 4, seed: 8, flat: 0.75, sharp: 3 }, grade: { sat: 0.85, contrast: 1.1, mean: [86, 56, 38] } }
];

// ---------- props ----------
// ph: Poly Haven model id; sf: Sketchfab folder (credit: [title, author, page, licence]).
// pre (on the source, all transforms and skins baked first, in this order):
//   keep / drop (regexps on mesh node names), dropMat (regexp on material names), region ({ min, max }: only the connected
//   pieces whose bounds lie inside), largest / smallest (keep only the biggest / smallest connected piece), rot ([x,y,z]
//   degrees), budget ([[regexp on node names, tris]]: each matching mesh decimated alone first), tris (a first decimation of
//   everything to about this), cut ({ p: point, n: normal, keep: 'below'|'above', lift }: clipped by a plane and the hole capped),
//   len (uniform scale: longest side), scale, fn (a step of its own)
// then loadProp: tris, err, d/n/orm (texture sizes), solid, ground, centre, height
// look (after decimation): grade (per material regexp: colour grade of its base colour), metal ([regexp, metalness,
//   roughness?]), glow (regexp: those materials become the emissive 'glow'), noMR (drop the metal/rough/AO maps)
// finish: loose (drop pieces under this fraction of the triangles), sink, back (min z on 0: wall-mounted), extra (node extras)
const ROCK = { grade: [[/./, { gamma: 1.3, sat: 0.15, contrast: 1.35, mean: [42, 41, 40] }]], metal: [[/./, 0, 0.92]], noMR: true };
// bleached bone gone ash-grey; matte (the scans' roughness maps make them glossy, wet-looking bone)
const BONE = { grade: [[/./, { sat: 0.45, mul: [0.8, 0.78, 0.76] }]], metal: [[/./, 0, 0.82]], noMR: true };
const SOOT = (k = 0.85, sat = 0.75) => ({ grade: [[/./, { mul: [k, k, k], sat }]] });
const PROPS = [
  // ----- the Field of Ash -----
  // a dead trunk standing (a quiver tree's, broken off at 2 m), charred: 5.2 m, as build.js plants them
  { key: 'deadTree', ph: 'dead_quiver_trunk', tris: 2400, err: 0.03, d: 512, n: 256, orm: 256, solid: true, ground: true, centre: true, height: 5.2,
    look: { char: true } },
  // a forked dead trunk (a lying scan) stood on its thick end, charred: 4.6 m
  { key: 'deadTreeB', ph: 'dead_tree_trunk_02', pre: { tris: 12000, fn: standUp }, tris: 3000, err: 0.03, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true, height: 4.6,
    look: { char: true }, loose: 0.02 },
  // black rocks (moon rock scans graded to basalt), 1.2 m on their longest side; A a flat slab, B a low wedge, C an angular
  // block, D a tall shard (build.js uses C and D as crags too)
  { key: 'rockA', ph: 'moon_rock_01', pre: { len: 1.2 }, tris: 1400, err: 0.03, d: 512, n: 256, solid: true, ground: true, centre: true, look: ROCK },
  { key: 'rockB', ph: 'moon_rock_04', pre: { len: 1.2 }, tris: 1400, err: 0.03, d: 512, n: 256, solid: true, ground: true, centre: true, look: ROCK },
  { key: 'rockC', ph: 'moon_rock_06', pre: { len: 1.2 }, tris: 1400, err: 0.03, d: 512, n: 256, solid: true, ground: true, centre: true, look: ROCK },
  { key: 'rockD', ph: 'moon_rock_05', pre: { len: 1.2 }, tris: 1400, err: 0.03, d: 512, n: 256, solid: true, ground: true, centre: true, look: ROCK },
  // a cluster of blocky boulders, 2.5 m across, graded black
  { key: 'boulder', ph: 'namaqualand_boulder_02', pre: { tris: 20000 }, tris: 2800, err: 0.03, d: 512, n: 256, solid: true, ground: true, centre: true, look: ROCK, loose: 0.01 },
  // battle debris, upright as made (build.js tilts them and sinks a fifth of their length): a kite shield on its point, an
  // estoc point down, a war hammer and a mace head up
  { key: 'shield', ph: 'kite_shield', pre: { budget: [[/clamps/, 700], [/trim/, 500], [/body/, 1200]] }, tris: 2400, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: { grade: [[/body/, { gamma: 1.2, mul: [0.46, 0.45, 0.44], sat: 0.45 }], [/trim/, { mul: [0.75, 0.75, 0.75], sat: 0.7 }]] } },
  { key: 'sword', ph: 'antique_estoc', pre: { rot: [0, 0, 180] }, tris: 1300, err: 0.02, d: 256, n: 256, orm: 128, solid: false, ground: true, centre: true },
  { key: 'warhammer', ph: 'ornate_war_hammer', tris: 1400, err: 0.02, d: 256, n: 256, orm: 128, solid: false, ground: true, centre: true },
  { key: 'mace', ph: 'ornate_medieval_mace', tris: 1700, err: 0.02, d: 256, n: 256, orm: 128, solid: false, ground: true, centre: true },
  // a crowned, veiled statue, beheaded: cut just under the veil's hem at the neck, the stump capped (headless as packed;
  // statueHead is the struck-off head)
  { key: 'statue', ph: 'gothic_statue', pre: { tris: 3300, cut: { p: [0.02, 1.405, -0.06], n: [0, 1, -0.18], keep: 'below', lift: 0.012, mark: 'neck' } }, tris: 3300, err: 0.02, d: 1024, n: 512, orm: 256, solid: true, ground: true, centre: true,
    look: { grade: [[/./, { mul: [0.7, 0.68, 0.66], sat: 0.5 }]] } },
  // the head with its crown and veil, origin where it sat on the neck (extras.pivot: that point on the packed statue); its
  // textures are the statue's (same sizes, so the pack stores them once)
  { key: 'statueHead', ph: 'gothic_statue', pre: { tris: 8000, cut: { p: [0.02, 1.405, -0.06], n: [0, 1, -0.18], keep: 'above', lift: 0.008 } }, tris: 1300, err: 0.02, d: 1024, n: 512, orm: 256, solid: true, head: true,
    look: { grade: [[/./, { mul: [0.7, 0.68, 0.66], sat: 0.5 }]] } },
  // the Wayfarers' lantern (a hurricane lantern, 0.29 m): its glass is the 'glow' material (warm, emissive; the game swaps
  // or dims it); the brass loses its transmission
  { key: 'lantern', ph: 'Lantern_01', pre: { budget: [[/glass/, 220], [/./, 2200]] }, tris: 2400, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: { glow: /glass/ } },
  // a caged hanging light: a brass lantern on a short chain (Poly Haven's caged_hanging_light is a modern fluorescent tube
  // fitting); its flame dropped, the brass darkened toward old bronze, the glass the 'glow' material
  { key: 'cagedLight', ph: 'brass_diya_lantern', pre: { dropMat: /flame/, cut: { p: [0, 0.23, 0], n: [0, 1, 0], keep: 'below', cap: false } }, tris: 1900, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: { glow: /glass/, grade: [[/^brass_diya_lantern$/, { mul: [0.62, 0.55, 0.48], sat: 0.55 }]] } },
  // ----- the Forge -----
  // an iron-hooped barrel (0.87 m), sooted
  { key: 'barrel', ph: 'wine_barrel_01', tris: 1500, err: 0.02, d: 512, n: 256, orm: 256, solid: true, ground: true, centre: true, look: SOOT(0.8, 0.7) },
  // a cross-pein hammer laid on its side (0.3 m long, along z)
  { key: 'crossPein', ph: 'cross_pein_hammer', pre: { rot: [-90, 0, 0] }, tris: 900, err: 0.02, d: 256, n: 256, orm: 128, solid: false, ground: true, centre: true, look: SOOT(0.85, 0.8) },
  // a bull's head (its bust's pedestal and stem cut off, the neck capped), facing +z, its back on z = 0 for the wall;
  // bronze darkened toward iron
  { key: 'bullHead', ph: 'bull_head', pre: { tris: 9000, cut: { p: [0, 0.1, 0], n: [0, 1, 0], keep: 'above', lift: 0 } }, tris: 2500, err: 0.02, d: 512, n: 256, orm: 256, solid: true, ground: true, centre: true, back: true,
    look: { grade: [[/./, { mul: [0.8, 0.78, 0.78], sat: 0.5 }]] } },
  // ----- Sketchfab (CC-BY 4.0) -----
  // the war-drake's bones, bleached to ash-grey bone: a ribcage (6 m), a length of spine (4 m), the skull (3.2 m, ~8k tris)
  { key: 'drakeRibs', sf: 'c4_ribs', pre: { fn: alongZ, len: 6 }, tris: 3000, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true, loose: 0.002,
    look: BONE,
    credit: ['Ribs', 'Bregorn', 'https://sketchfab.com/3d-models/ribs-328309ecbdef4e9ebd148d4b730aab35', 'CC-BY-4.0'] },
  { key: 'drakeSpine', sf: 'c4_spine', pre: { fn: alongZ, len: 4 }, tris: 2600, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: BONE,
    credit: ['Spine', 'Bregorn', 'https://sketchfab.com/3d-models/spine-c5512ed80ce442aca263cc43585c7d0d', 'CC-BY-4.0'] },
  { key: 'drakeSkull', sf: 'c4_skull', pre: { fn: skullDown, len: 3.2 }, tris: 8000, err: 0.01, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: BONE,
    credit: ['Dragon Skull', 'Bregorn', 'https://sketchfab.com/3d-models/dragon-skull-326d0f7359af43c995217f654aba0fec', 'CC-BY-4.0'] },
  // the Wayfarers' watchtower: a broken stone tower (8.5 m), its moss and green taken out to ash-grey stone
  { key: 'ruinedTower', sf: 'c4_tower', tris: 1700, err: 0.01, d: 1024, n: 256, orm: 256, solid: false, ground: true, centre: true, height: 8.5,
    look: { grade: [[/./, { gamma: 1.15, sat: 0.18, contrast: 1.05, mean: [70, 67, 64] }]], metal: [[/./, 0, 0.9]] },
    credit: ['Ruined Tower', 'Cianon', 'https://sketchfab.com/3d-models/ruined-tower-a345f230525a43749f97927b3429e734', 'CC-BY-4.0'] },
  // an iron fire-basket (0.91 m) with a bed of coals in its bowl: the coals are the 'glow' material (extras.fire: the
  // coals' top centre, fireR their radius)
  { key: 'brazier', sf: 'c4_brazier', pre: { scale: 0.01, fn: coalBed }, tris: 1500, err: 0.01, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: { glow: /^glow$/, embers: true },
    credit: ['Medieval Brazier', 'Sky_Hunter', 'https://sketchfab.com/3d-models/medieval-brazier-cff29e533e3a4298a5d112cf7bb2558c', 'CC-BY-4.0'] },
  // a blacksmith's bellows in its frame, the lever up (static: its rig's rest pose baked; 2.2 m long, along z, the nozzle +z)
  { key: 'bellows', sf: 'c4_bellows', pre: { fn: bellowsPose, len: 2.2 }, tris: 3000, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: { metal: [[/./, 0]] },
    credit: ['Medieval Blacksmith Bellows', 'TomasKiniulis', 'https://sketchfab.com/3d-models/medieval-blacksmith-bellows-b9eaf7057b194e36b73da1f49cf49886', 'CC-BY-4.0'] },
  // the anvil (0.84 m long, horn along x as made)
  { key: 'anvil', sf: 'c4_anvil', pre: { scale: 0.01 }, tris: 700, err: 0.01, d: 512, n: 256, orm: 256, solid: true, ground: true, centre: true,
    credit: ['PBR Anvil', 'NOT_Lonely (not_lonely)', 'https://sketchfab.com/3d-models/pbr-anvil-3529b9ef4e2c4a32add55948b5361609', 'CC-BY-4.0'] },
  // MikeFarrant's blacksmith pack, split: the long tongs (lying, 0.53 m), the quench trough (1.7 m), a workbench with its
  // hammers, sledge and coal shovel laid on it (toolRack), the anvil's stump
  { key: 'tongs', sf: 'c4_smith', pre: { keep: /Clamps/, region: { min: [2.5, -1, 0.55], max: [2.62, 1, 1.1] }, fn: alongZ }, tris: 700, err: 0.01, d: 256, n: 256, orm: 128, solid: false, ground: true, centre: true,
    look: SOOT(0.85, 0.8), credit: smithCredit() },
  { key: 'quench', sf: 'c4_smith', pre: { keep: /Quench/ }, tris: 400, err: 0.01, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: SOOT(0.8, 0.75), credit: smithCredit() },
  { key: 'toolRack', sf: 'c4_smith', pre: { keep: /Workbench|Hammers|Large Tools/, fn: benchTools, budget: [[/Workbench/, 2000], [/Hammers/, 520], [/Large Tools/, 420]] }, tris: 3000, err: 0.02, d: 512, n: 256, orm: 256, solid: false, ground: true, centre: true,
    look: SOOT(0.8, 0.75), credit: smithCredit() },
  { key: 'stump', sf: 'c4_smith', pre: { keep: /Anvil/, smallest: true }, tris: 600, err: 0.01, d: 512, n: 256, orm: 256, solid: true, ground: true, centre: true,
    look: SOOT(0.85, 0.8), credit: smithCredit() }
];
function smithCredit() { return ['Asset Pack - Blacksmith Equipment', 'Mike Farrant (MikeFarrant)', 'https://sketchfab.com/3d-models/asset-pack-blacksmith-equipment-0f358eaab21d4e70836ad855de34c423', 'CC-BY-4.0']; }

// ---------- layers ----------
async function packCinderLayer(L, srcDir, outDir) {
  const dir = path.join(srcDir, L.src), res = '1k';
  const diff = await sharp(path.join(dir, `${L.src}_diff_${res}.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let W = diff.info.width;
  const arm = await sharp(path.join(dir, `${L.src}_arm_${res}.jpg`)).resize(W, W).removeAlpha().raw().toBuffer();
  const nrm = await sharp(path.join(dir, `${L.src}_nor_gl_${res}.jpg`)).resize(W, W).removeAlpha().raw().toBuffer();
  let col = new Float64Array(W * W * 3), nor = new Float32Array(W * W * 3), ao = new Float64Array(W * W);
  for (let p = 0, i = 0; p < W * W; p++, i += diff.info.channels) {
    ao[p] = 1 - L.ao * (1 - arm[p * 3] / 255);
    for (let q = 0; q < 3; q++) { col[p * 3 + q] = diff.data[i + q] / 255; nor[p * 3 + q] = (L.nsrgb ? srgbLin(nrm[p * 3 + q] / 255) : nrm[p * 3 + q] / 255) * 2 - 1; }
    if (L.nsrgb) { const o = p * 3, l = Math.hypot(nor[o], nor[o + 1], nor[o + 2]) || 1; nor[o] /= l; nor[o + 1] /= l; nor[o + 2] /= l; }
  }
  let mask = null;
  if (L.synth === 'grate') ({ col, nor, mask } = await grate(L, srcDir, col, nor, ao, W));
  else {
    if (!L.grade || L.quilt) { for (let p = 0; p < W * W; p++) for (let q = 0; q < 3; q++) col[p * 3 + q] *= ao[p]; ao = null; }
    if (L.quilt) {
      const out = W, S = Math.round(W / L.quilt.k);
      if (S !== W) { col = await resampleF(col, W, S); nor = await resampleF(nor, W, S, true); }
      ({ col, nor } = quilt(col, nor, S, out, L.quilt));
      W = out;
    }
    if (L.flat) flatten(col, nor, W, L.flat);
    if (L.grade) grade(col, L.grade, ao);
  }
  if (L.nboost) for (let p = 0; p < nor.length; p += 3) {
    const x = nor[p] * L.nboost, y = nor[p + 1] * L.nboost, l = Math.min(0.999, Math.hypot(x, y)), s = l / Math.max(1e-6, Math.hypot(x, y));
    nor[p] = x * s; nor[p + 1] = y * s; nor[p + 2] = Math.sqrt(1 - l * l);
  }
  const toU8 = (f, n) => { const u = Buffer.alloc(f.length); for (let i = 0; i < f.length; i++) u[i] = Math.max(0, Math.min(255, n ? Math.round((f[i] * 0.5 + 0.5) * 255) : Math.round(f[i] * 255))); return u; };
  const raw = { raw: { width: W, height: W, channels: 3 } };
  const dOut = path.join(outDir, `${L.id}_d.webp`), nOut = path.join(outDir, `${L.id}_n.webp`);
  await sharp(toU8(col), raw).resize(L.d, L.d, { kernel: 'lanczos3' }).webp({ quality: 74, effort: 6 }).toFile(dOut);
  await sharp(toU8(nor, true), raw).resize(L.n, L.n, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(nOut);
  let bytes = statSync(dOut).size + statSync(nOut).size;
  if (mask) {
    const mOut = path.join(outDir, `${L.id}Glow_d.webp`), m8 = Buffer.alloc(W * W);
    for (let i = 0; i < m8.length; i++) m8[i] = Math.round(Math.max(0, Math.min(1, mask[i])) * 255);
    await sharp(m8, { raw: { width: W, height: W, channels: 1 } }).resize(L.mask, L.mask, { kernel: 'lanczos3' }).toColourspace('b-w').webp({ quality: 80, effort: 6 }).toFile(mOut);
    bytes += statSync(mOut).size;
  }
  return bytes;
}
async function resampleF(f, W, S, isNormal = false) {
  const u = Buffer.alloc(f.length);
  for (let i = 0; i < f.length; i++) u[i] = Math.max(0, Math.min(255, Math.round(isNormal ? (f[i] * 0.5 + 0.5) * 255 : f[i] * 255)));
  const r = await sharp(u, { raw: { width: W, height: W, channels: 3 } }).resize(S, S, { kernel: 'lanczos3' }).raw().toBuffer();
  const o = new Float32Array(S * S * 3);
  for (let i = 0; i < o.length; i++) o[i] = isNormal ? (r[i] / 255) * 2 - 1 : r[i] / 255;
  if (isNormal) for (let p = 0; p < o.length; p += 3) { const l = Math.hypot(o[p], o[p + 1], o[p + 2]) || 1; o[p] /= l; o[p + 1] /= l; o[p + 2] /= l; }
  return o;
}
const srgbLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
// colour grade in place (pack-wood.mjs's): gamma and mul (and the AO when given) per channel, then luminance contrast about
// the mean and saturation, then each channel rescaled so the average lands on mean (sRGB 0-255)
function grade(col, { mul = [1, 1, 1], sat = 1, gamma = 1, contrast = 1, mean = null }, ao = null) {
  const n = col.length / 3;
  let lm = 0;
  for (let p = 0; p < col.length; p += 3) {
    for (let q = 0; q < 3; q++) col[p + q] = Math.pow(col[p + q], gamma) * mul[q] * (ao ? ao[p / 3] : 1);
    lm += luma(col[p], col[p + 1], col[p + 2]);
  }
  lm /= n;
  const avg = [0, 0, 0];
  for (let p = 0; p < col.length; p += 3) {
    const l = luma(col[p], col[p + 1], col[p + 2]), l2 = contrast === 1 ? l : Math.max(0, lm + (l - lm) * contrast), k = contrast === 1 ? 1 : l > 1e-5 ? l2 / l : 0;
    for (let q = 0; q < 3; q++) col[p + q] = Math.max(0, l2 + (col[p + q] * k - l2) * sat);
    for (let q = 0; q < 3; q++) avg[q] += col[p + q] / n;
  }
  if (mean) for (let p = 0; p < col.length; p += 3) for (let q = 0; q < 3; q++) col[p + q] = Math.min(1, col[p + q] * (mean[q] / 255 / Math.max(1e-6, avg[q])));
}
// pack-wood.mjs's quilting: a seamless tile rebuilt from a jittered grid of soft-edged patches copied from random spots of the
// source (half turned 180 degrees), contrast-preserving blend; flat divides the large-scale brightness (and normal tilt) out
// (turns: 4 lets a patch turn by any quarter, not just half: for prints and tracks with no grain to keep)
function quilt(src, srcN, S, out, { cells = 6, seed = 1, sharp: pw = 6, jitter = 0.32, flat = 0, turns = 2 }) {
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const c = out / cells, P = [];
  const R = 4, region = [];
  for (let gy = 0; gy < cells; gy++) for (let gx = 0; gx < cells; gx++) {
    let r, tries = 0;
    do { r = Math.floor(rnd() * R * R); tries++; } while (tries < 50 && [[-1, -1], [0, -1], [1, -1], [-1, 0]].some(([dx, dy]) => region[((gy + dy + cells) % cells) * cells + ((gx + dx + cells) % cells)] === r));
    region[gy * cells + gx] = r;
    P.push({
      x: Math.round((gx + 0.5 + (rnd() - 0.5) * 2 * jitter) * c), y: Math.round((gy + 0.5 + (rnd() - 0.5) * 2 * jitter) * c),
      ox: Math.round(((r % R) + 0.2 + rnd() * 0.6) * (S / R)), oy: Math.round((Math.floor(r / R) + 0.2 + rnd() * 0.6) * (S / R)), turn: rnd() < 0.5, q: Math.floor(rnd() * 4) % 4
    });
    if (turns !== 4) P[P.length - 1].q = P[P.length - 1].turn ? 2 : 0;
  }
  const mean = [0, 0, 0];
  for (let p = 0; p < src.length; p += 3) for (let q = 0; q < 3; q++) mean[q] += src[p + q] / (S * S);
  const col = new Float32Array(out * out * 3), nor = new Float32Array(out * out * 3);
  const sig2 = 2 * (0.5 * c) ** 2, wrap = (d) => (d > out / 2 ? d - out : d < -out / 2 ? d + out : d), mod = (a, m) => ((a % m) + m) % m;
  const w = new Float64Array(9), si = new Int32Array(9), tq = new Int8Array(9);
  for (let y = 0; y < out; y++) for (let x = 0; x < out; x++) {
    const gx = Math.floor(x / c), gy = Math.floor(y / c);
    let n = 0, sw = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const p = P[mod(gy + dy, cells) * cells + mod(gx + dx, cells)];
      const u = wrap(x - p.x), v = wrap(y - p.y);
      w[n] = Math.exp((-pw * (u * u + v * v)) / sig2); sw += w[n];
      // the source offset for a patch turned by q quarters (image coordinates)
      const du = p.q === 0 ? u : p.q === 1 ? -v : p.q === 2 ? -u : v, dv = p.q === 0 ? v : p.q === 1 ? u : p.q === 2 ? -v : -u;
      const sx = mod(p.ox + du, S), sy = mod(p.oy + dv, S);
      si[n] = (sy * S + sx) * 3; tq[n] = p.q; n++;
    }
    let s2 = 0; for (let k = 0; k < n; k++) { w[k] /= sw; s2 += w[k] * w[k]; }
    const norm = 1 / Math.sqrt(s2), o = (y * out + x) * 3;
    let cr = 0, cg = 0, cb = 0, nx = 0, ny = 0;
    for (let k = 0; k < n; k++) {
      const i = si[k], a = w[k];
      cr += a * (src[i] - mean[0]); cg += a * (src[i + 1] - mean[1]); cb += a * (src[i + 2] - mean[2]);
      // the normal turned with its patch (OpenGL tangent frame: x right, y up the image)
      const sx = srcN[i], sy = srcN[i + 1], q = tq[k];
      nx += a * (q === 0 ? sx : q === 1 ? -sy : q === 2 ? -sx : sy); ny += a * (q === 0 ? sy : q === 1 ? sx : q === 2 ? -sy : -sx);
    }
    col[o] = mean[0] + cr * norm; col[o + 1] = mean[1] + cg * norm; col[o + 2] = mean[2] + cb * norm;
    nx *= norm; ny *= norm; const l = Math.hypot(nx, ny); if (l > 0.95) { nx *= 0.95 / l; ny *= 0.95 / l; }
    nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = Math.sqrt(1 - nx * nx - ny * ny);
  }
  if (flat) {
    let L = new Float32Array(out * out); for (let p = 0; p < L.length; p++) L[p] = luma(col[p * 3], col[p * 3 + 1], col[p * 3 + 2]);
    const lm = L.reduce((a, b) => a + b, 0) / L.length, r = Math.round(out / 14);
    for (let pass = 0; pass < 3; pass++) L = boxBlur(boxBlur(L, out, r, 1), out, r, out);
    for (let p = 0; p < L.length; p++) { const k = Math.pow(lm / Math.max(1e-4, L[p]), flat); for (let q = 0; q < 3; q++) col[p * 3 + q] = Math.min(1, col[p * 3 + q] * k); }
    for (const q of [0, 1]) {
      let t = new Float32Array(out * out); for (let p = 0; p < t.length; p++) t[p] = nor[p * 3 + q];
      for (let pass = 0; pass < 3; pass++) t = boxBlur(boxBlur(t, out, r, 1), out, r, out);
      for (let p = 0; p < t.length; p++) nor[p * 3 + q] -= t[p];
    }
    for (let p = 0; p < nor.length; p += 3) { let x = nor[p], y = nor[p + 1]; const l = Math.hypot(x, y); if (l > 0.95) { x *= 0.95 / l; y *= 0.95 / l; } nor[p] = x; nor[p + 1] = y; nor[p + 2] = Math.sqrt(1 - x * x - y * y); }
  }
  return { col, nor };
}
// the large-scale brightness blotches (and normal tilt) divided out of a tile, its detail kept: { k: strength, r: blur radius
// as a fraction of the tile }
function flatten(col, nor, W, { k = 0.7, r: rf = 1 / 10 }) {
  let L = new Float32Array(W * W); for (let p = 0; p < L.length; p++) L[p] = luma(col[p * 3], col[p * 3 + 1], col[p * 3 + 2]);
  const lm = L.reduce((a, b) => a + b, 0) / L.length, r = Math.round(W * rf);
  for (let pass = 0; pass < 3; pass++) L = boxBlur(boxBlur(L, W, r, 1), W, r, W);
  for (let p = 0; p < L.length; p++) { const f = Math.pow(lm / Math.max(1e-4, L[p]), k); for (let q = 0; q < 3; q++) col[p * 3 + q] = Math.min(1, col[p * 3 + q] * f); }
  for (const q of [0, 1]) {
    let t = new Float32Array(W * W); for (let p = 0; p < t.length; p++) t[p] = nor[p * 3 + q];
    for (let pass = 0; pass < 3; pass++) t = boxBlur(boxBlur(t, W, r, 1), W, r, W);
    for (let p = 0; p < t.length; p++) nor[p * 3 + q] -= t[p] * k;
  }
  for (let p = 0; p < nor.length; p += 3) { let x = nor[p], y = nor[p + 1]; const l = Math.hypot(x, y); if (l > 0.95) { x *= 0.95 / l; y *= 0.95 / l; } nor[p] = x; nor[p + 1] = y; nor[p + 2] = Math.sqrt(1 - x * x - y * y); }
}
function boxBlur(a, W, r, step) {
  const o = new Float32Array(a.length), n = 2 * r + 1;
  for (let line = 0; line < W; line++) {
    const base = step === 1 ? line * W : line, at = (i) => a[base + (((i % W) + W) % W) * step];
    let s = 0; for (let i = -r; i <= r; i++) s += at(i);
    for (let i = 0; i < W; i++) { o[base + i * step] = s / n; s += at(i + r + 1) - at(i - r); }
  }
  return o;
}
// value noise (tileable with period per) for the grate's rust
function tnoise(x, y, per, seed) {
  const h = (i, j) => { i = ((i % per) + per) % per; j = ((j % per) + per) % per; let t = Math.imul(i * 374761393 + j * 668265263 + seed * 1442695041, 1274126177); t ^= t >>> 13; t = Math.imul(t, 1274126177); return ((t ^ (t >>> 16)) >>> 0) / 4294967295; };
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return h(xi, yi) * (1 - u) * (1 - v) + h(xi + 1, yi) * u * (1 - v) + h(xi, yi + 1) * (1 - u) * v + h(xi + 1, yi + 1) * u * v;
}
// The vent grate, built on the tile (W x W px, seamless): a frame half on each edge (so tiles meet as panels), NB bearing
// bars along the image's columns (v) with slots between, two lower cross bars; a height field gives the normal map (the
// plate's own scratches added), the iron colour is the plate scan darkened with patches of rust, the slots near black.
async function grate(L, srcDir, plate, plateN, ao, W) {
  const rdir = path.join(srcDir, L.rust);
  const rust = await sharp(path.join(rdir, `${L.rust}_diff_1k.jpg`)).resize(W, W).removeAlpha().raw().toBuffer();
  const F = Math.round(W * 0.04), NB = 8, inner = W - 2 * F, bar = Math.round(inner * 0.074), slot = (inner - NB * bar) / (NB + 1);
  const cross = [W / 3, (2 * W) / 3], cw = Math.round(W * 0.03), bev = W / 170;
  // signed distance to the nearest slot edge (positive on iron), and which iron it is (1 frame/bar, 0.8 cross bar)
  const H = new Float32Array(W * W), E = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const fx = Math.min(x + 0.5, W - x - 0.5) - F, fy = Math.min(y + 0.5, W - y - 0.5) - F; // < 0 inside the frame band
    let d, h;
    if (fx < 0 || fy < 0) { d = Math.max(-fx, -fy); h = 1; } // the frame band (distance to its inner edge)
    else {
      // bars along the columns: position within the inner run; d is the distance to the nearest iron/slot edge (+ on iron)
      const u = x + 0.5 - F; let onBar = false, dIn = 0, dBar = 1e9;
      for (let b = 0; b < NB; b++) { const b0 = slot * (b + 1) + bar * b, b1 = b0 + bar; if (u >= b0 && u <= b1) { onBar = true; dIn = Math.min(u - b0, b1 - u); } else dBar = Math.min(dBar, u < b0 ? b0 - u : u - b1); }
      const best = onBar ? dIn : -Math.min(dBar, u, inner - u);
      d = best; h = onBar ? 1 : -1;
      // cross bars (lower, under the bearing bars)
      for (const cy of cross) { const dc = cw / 2 - Math.abs(y + 0.5 - cy); if (!onBar && dc > 0) { h = 0.8; d = Math.min(dc, -best); } }
    }
    H[y * W + x] = h; E[y * W + x] = d;
  }
  const col = new Float64Array(W * W * 3), nor = new Float32Array(W * W * 3), mask = new Float32Array(W * W);
  // a rounded profile on the iron's edges, deep slots
  const prof = new Float32Array(W * W);
  for (let i = 0; i < W * W; i++) prof[i] = H[i] < 0 ? -1.4 : H[i] * (1 - 0.3 * Math.pow(1 - Math.min(1, E[i] / bev), 2));
  const at = (x, y) => prof[((y + W) % W) * W + ((x + W) % W)];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 3;
    const iron = H[i] >= 0;
    // normal: height gradient (OpenGL: green up the image) clamped, plus the plate's surface detail on the iron
    let nx = -(at(x + 1, y) - at(x - 1, y)) * (W / 260), ny = (at(x, y + 1) - at(x, y - 1)) * (W / 260);
    const l = Math.hypot(nx, ny); if (l > 2.5) { nx *= 2.5 / l; ny *= 2.5 / l; }
    if (iron) { nx += plateN[o] * 0.6; ny += plateN[o + 1] * 0.6; }
    const nl = Math.hypot(nx, ny, 1); nor[o] = nx / nl; nor[o + 1] = ny / nl; nor[o + 2] = 1 / nl;
    if (iron) {
      // dark iron (the plate, greyed) under rust patches; edges catch a little wear, the iron beside the slots is sooted
      const rn = tnoise(x / 96, y / 96, W / 96, 7) * 0.65 + tnoise(x / 24, y / 24, W / 24, 3) * 0.35;
      const rk = Math.min(1, Math.max(0, (rn - 0.45) * 2.6)) * 0.8;
      const wear = Math.pow(1 - Math.min(1, E[i] / (bev * 1.5)), 2) * 0.18, soot = 0.72 + 0.28 * Math.min(1, E[i] / (bev * 3));
      const pl = luma(plate[o], plate[o + 1], plate[o + 2]);
      for (let q = 0; q < 3; q++) {
        const ironc = (pl * 0.7 + plate[o + q] * 0.3) * [0.98, 0.96, 0.94][q] * 0.95, rustc = rust[o + q] / 255 * 0.85;
        col[o + q] = ((ironc * (1 - rk) + rustc * rk) * (0.75 + 0.25 * ao[i]) * soot + wear) * (H[i] < 1 ? 0.8 : 1);
      }
      // a floor so no iron reads as a slot to build.js's dark-texel test (linear luma >= 0.05, sRGB ~0.25)
      const lv = luma(col[o], col[o + 1], col[o + 2]); if (lv < 0.27) { const k = 0.27 / Math.max(1e-4, lv); for (let q = 0; q < 3; q++) col[o + q] = Math.min(1, col[o + q] * k); }
      mask[i] = 0;
    } else {
      // the slot: near black, a dull ember red deep down (the shader's glow and the mask light it)
      const depth = Math.min(1, -E[i] / (slot * 0.5));
      col[o] = 0.026 + 0.012 * depth; col[o + 1] = 0.02 + 0.004 * depth; col[o + 2] = 0.018;
      mask[i] = Math.min(1, 0.35 + 0.65 * Math.sqrt(depth)) * Math.min(1, -E[i] / 1.5);
    }
  }
  return { col, nor, mask };
}

// ---------- source preparation ----------
const primsOf = (doc) => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
// every mesh in world space (skinned ones posed by their joints' current transforms) straight under one node 'flat'
function bakeWorld(doc) {
  const root = doc.getRoot(), scene = root.getDefaultScene() || root.listScenes()[0];
  const found = [];
  scene.traverse((n) => { if (n.getMesh()) found.push(n); });
  const used = new Set(), holder = doc.createNode('flat');
  for (const n of found) {
    let mesh = n.getMesh();
    if (used.has(mesh)) { const copy = doc.createMesh(mesh.getName()); for (const p of mesh.listPrimitives()) copy.addPrimitive(p.clone()); mesh = copy; }
    used.add(mesh);
    const skin = n.getSkin();
    if (skin) {
      const joints = skin.listJoints(), ibm = skin.getInverseBindMatrices(), J = joints.map((j, k) => new THREE.Matrix4().fromArray(j.getWorldMatrix()).multiply(ibm ? new THREE.Matrix4().fromArray(ibm.getElement(k, [])) : new THREE.Matrix4()));
      for (const p of mesh.listPrimitives()) {
        const pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), jo = p.getAttribute('JOINTS_0'), we = p.getAttribute('WEIGHTS_0');
        const P = pos.clone(), N = nor ? nor.clone() : null, v = new THREE.Vector3(), nv = new THREE.Vector3(), acc = new THREE.Vector3(), accN = new THREE.Vector3(), t = new THREE.Vector3(), e = [], ji = [], wi = [];
        for (let i = 0; i < pos.getCount(); i++) {
          v.fromArray(pos.getElement(i, e)); if (N) nv.fromArray(nor.getElement(i, e));
          jo.getElement(i, ji); we.getElement(i, wi); acc.set(0, 0, 0); accN.set(0, 0, 0);
          for (let k = 0; k < 4; k++) { if (!wi[k]) continue; acc.addScaledVector(t.copy(v).applyMatrix4(J[ji[k]]), wi[k]); if (N) accN.addScaledVector(t.copy(nv).transformDirection(J[ji[k]]), wi[k]); }
          P.setElement(i, acc.toArray()); if (N) N.setElement(i, accN.normalize().toArray());
        }
        p.setAttribute('POSITION', P); if (N) p.setAttribute('NORMAL', N);
        for (const s of p.listSemantics()) if (/^(JOINTS|WEIGHTS)_/.test(s)) p.setAttribute(s, null);
      }
    } else transformMesh(mesh, n.getWorldMatrix());
    holder.addChild(doc.createNode(n.getName()).setMesh(mesh));
  }
  const old = []; for (const t of scene.listChildren()) t.traverse((n) => old.push(n));
  for (const n of old) { n.setMesh(null); n.setSkin(null); n.dispose(); }
  for (const s of root.listSkins()) s.dispose();
  for (const a of root.listAnimations()) a.dispose();
  scene.addChild(holder);
  // only position, normal and first UVs; every primitive indexed and owning its accessors (the cuts rewrite them)
  const buf = root.listBuffers()[0];
  for (const p of primsOf(doc)) {
    for (const s of p.listSemantics()) if (!/^(POSITION|NORMAL|TEXCOORD_0)$/.test(s)) p.setAttribute(s, null);
    if (!p.getIndices()) p.setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from({ length: p.getAttribute('POSITION').getCount() }, (_, i) => i)).setBuffer(buf));
    const shared = (a) => a.listParents().filter((x) => x.propertyType === 'Primitive').length > 1;
    for (const s of p.listSemantics()) { const a = p.getAttribute(s); if (shared(a)) p.setAttribute(s, a.clone()); }
    if (shared(p.getIndices())) p.setIndices(p.getIndices().clone());
  }
}
// fn(pos, nrm|null) edits each vertex in place (each accessor once)
function eachVertex(doc, fn) {
  const seen = new Set(), p = new THREE.Vector3(), n = new THREE.Vector3(), v = [];
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), b = prim.getAttribute('NORMAL');
    if (seen.has(a)) continue; seen.add(a); if (b) seen.add(b);
    for (let i = 0; i < a.getCount(); i++) {
      p.fromArray(a.getElement(i, v)); if (b) n.fromArray(b.getElement(i, v));
      fn(p, b ? n : null);
      a.setElement(i, p.toArray()); if (b) b.setElement(i, n.normalize().toArray());
    }
  }
}
function boundsOf(doc) { const b = new THREE.Box3(); eachVertex(doc, (p) => b.expandByPoint(p)); return b; }
function rotate(doc, deg) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...deg.map((d) => (d * Math.PI) / 180), 'XYZ'));
  eachVertex(doc, (p, n) => { p.applyQuaternion(q); n?.applyQuaternion(q); });
}
const scaleAll = (doc, s) => eachVertex(doc, (p) => p.multiplyScalar(s));
// connected pieces (triangles joined through shared positions, across primitives): [{ tris: [[prim, t]], n, box }]
function pieces(doc) {
  const parent = new Map(), find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
  const v = [], per = [];
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray(), ks = [];
    for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); const k = `${Math.round(v[0] * 4000)},${Math.round(v[1] * 4000)},${Math.round(v[2] * 4000)}`; ks.push(k); if (!parent.has(k)) parent.set(k, k); }
    for (let t = 0; t < idx.length; t += 3) { const r = find(ks[idx[t]]); parent.set(find(ks[idx[t + 1]]), r); parent.set(find(ks[idx[t + 2]]), find(r)); }
    per.push({ prim, a, idx, ks });
  }
  const map = new Map(), e = new THREE.Vector3();
  for (const { prim, a, idx, ks } of per) for (let t = 0; t < idx.length; t += 3) {
    const r = find(ks[idx[t]]);
    if (!map.has(r)) map.set(r, { tris: [], n: 0, box: new THREE.Box3() });
    const c = map.get(r); c.tris.push([prim, t]); c.n++;
    for (let k = 0; k < 3; k++) c.box.expandByPoint(e.fromArray(a.getElement(idx[t + k], v)));
  }
  return [...map.values()];
}
// keep only the triangles of the pieces for which keep(piece) is true
function keepPieces(doc, keep) {
  const ps = pieces(doc), on = new Map();
  for (const c of ps) if (keep(c, ps)) for (const [prim, t] of c.tris) { if (!on.has(prim)) on.set(prim, []); on.get(prim).push(t); }
  for (const prim of primsOf(doc)) {
    const idx = prim.getIndices().getArray(), ts = on.get(prim) || [], out = [];
    for (const t of ts) out.push(idx[t], idx[t + 1], idx[t + 2]);
    if (!out.length) { prim.dispose(); continue; }
    prim.getIndices().setArray(new Uint32Array(out)); compactPrimitive(prim);
  }
}
// Clips every primitive by the plane n . x = n . p, keeping one side; the triangles across it are split (positions, normals
// and UVs interpolated) and, unless cap is false, each closed loop of the cut is filled with a fan from its centre (lifted
// `lift` metres off the plane for an uneven break, its UVs taken from the loop). Returns the cut's centre (on the plane).
function clipPlane(doc, { p, n, keep = 'below', cap = true, lift = 0 }) {
  const N = new THREE.Vector3(...n).normalize(), d = N.dot(new THREE.Vector3(...p)), sgn = keep === 'below' ? 1 : -1;
  const loopsAll = [], centre = new THREE.Vector3(); let cn = 0;
  for (const prim of primsOf(doc)) {
    const pos = prim.getAttribute('POSITION'), nor = prim.getAttribute('NORMAL'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray();
    const P = [], NN = [], U = [], e = [];
    for (let i = 0; i < pos.getCount(); i++) { P.push(new THREE.Vector3().fromArray(pos.getElement(i, e))); NN.push(nor ? new THREE.Vector3().fromArray(nor.getElement(i, e)) : new THREE.Vector3(0, 1, 0)); U.push(uv ? uv.getElement(i, []) : [0, 0]); }
    const s = P.map((v) => sgn * (N.dot(v) - d)); // <= 0: kept
    const out = [], edgeV = new Map(), segs = [];
    const cutV = (a, b) => {
      const k = a < b ? a + ',' + b : b + ',' + a; if (edgeV.has(k)) return edgeV.get(k);
      const t = s[a] / (s[a] - s[b]);
      P.push(P[a].clone().lerp(P[b], t)); NN.push(NN[a].clone().lerp(NN[b], t).normalize()); U.push([U[a][0] + (U[b][0] - U[a][0]) * t, U[a][1] + (U[b][1] - U[a][1]) * t]); s.push(0);
      edgeV.set(k, P.length - 1); return P.length - 1;
    };
    for (let t = 0; t < idx.length; t += 3) {
      const T = [idx[t], idx[t + 1], idx[t + 2]], ins = T.map((i) => s[i] <= 0), nIn = ins.filter(Boolean).length;
      if (nIn === 3) { out.push(...T); continue; }
      if (nIn === 0) continue;
      // rotate so the odd vertex is first
      let r = 0; for (; r < 3; r++) if (nIn === 1 ? ins[r] : !ins[r]) break;
      const a = T[r], b = T[(r + 1) % 3], c = T[(r + 2) % 3];
      const ab = cutV(a, b), ac = cutV(a, c);
      if (nIn === 1) { out.push(a, ab, ac); segs.push([ac, ab]); }
      else { out.push(ab, b, c, ab, c, ac); segs.push([ab, ac]); }
    }
    // cap: chain the cut segments into loops (joined by position) and fan each from its centre
    if (cap && segs.length) {
      const key = (i) => `${Math.round(P[i].x * 5000)},${Math.round(P[i].y * 5000)},${Math.round(P[i].z * 5000)}`;
      const next = new Map(); for (const [a, b] of segs) next.set(key(a), [a, b]);
      const done = new Set();
      for (const [a0] of segs) {
        if (done.has(key(a0))) continue;
        const loop = []; let cur = key(a0), guard = 0;
        while (next.has(cur) && !done.has(cur) && guard++ < 100000) { done.add(cur); const [a, b] = next.get(cur); loop.push(a); cur = key(b); }
        if (loop.length < 3) continue;
        const c = new THREE.Vector3(); for (const i of loop) c.add(P[i]); c.divideScalar(loop.length);
        centre.add(c.clone().multiplyScalar(loop.length)); cn += loop.length;
        const ci = P.length, out2 = N.clone().multiplyScalar(sgn); // the cap faces away from the kept side
        // the cap's UVs: a small planar patch of the texture around the loop's first vertex (a fan of the loop's own UVs
        // would streak radially)
        const t1 = new THREE.Vector3(1, 0, 0).addScaledVector(N, -N.x); if (t1.lengthSq() < 1e-4) t1.set(0, 0, 1).addScaledVector(N, -N.z);
        t1.normalize(); const t2 = N.clone().cross(t1), u0 = U[loop[0]], capUV = (v) => [u0[0] + t1.dot(v.clone().sub(c)) * 0.15, u0[1] + t2.dot(v.clone().sub(c)) * 0.15];
        P.push(c.clone().addScaledVector(out2, lift)); NN.push(out2.clone()); U.push(capUV(c)); s.push(0);
        const base = P.length;
        for (const i of loop) { P.push(P[i].clone()); NN.push(out2.clone()); U.push(capUV(P[i])); s.push(0); }
        for (let k = 0; k < loop.length; k++) {
          const i = base + k, j = base + ((k + 1) % loop.length);
          const fn = new THREE.Vector3().subVectors(P[i], P[ci]).cross(new THREE.Vector3().subVectors(P[j], P[ci]));
          if (fn.dot(out2) >= 0) out.push(ci, i, j); else out.push(ci, j, i);
        }
        loopsAll.push(loop.length);
      }
    }
    if (!out.length) { prim.dispose(); continue; }
    const fl = (arr, k) => { const f = new Float32Array(arr.length * k); arr.forEach((v, i) => { const a = v.toArray ? v.toArray() : v; for (let q = 0; q < k; q++) f[i * k + q] = a[q]; }); return f; };
    pos.setArray(fl(P, 3)); if (nor) nor.setArray(fl(NN, 3)); if (uv) uv.setArray(fl(U, 2));
    prim.getIndices().setArray(new Uint32Array(out));
    compactPrimitive(prim);
  }
  if (cn) centre.divideScalar(cn); else centre.copy(new THREE.Vector3(...p));
  return { centre, loops: loopsAll };
}

// --- per-prop steps (pre.fn) ---
// a lying log stood up on its thicker end (its length was along x)
function standUp(doc, P) {
  const b = boundsOf(doc), L = b.max.x - b.min.x, r = [0, 0];
  eachVertex(doc, (p) => { const t = (p.x - b.min.x) / L; if (t < 0.15) r[0] = Math.max(r[0], Math.hypot(p.y - (b.min.y + b.max.y) / 2, p.z - (b.min.z + b.max.z) / 2)); if (t > 0.85) r[1] = Math.max(r[1], Math.hypot(p.y - (b.min.y + b.max.y) / 2, p.z - (b.min.z + b.max.z) / 2)); });
  // the thick end goes down: rotate about z by +90 (x -> y) when the thick end is at max x... (-x up)
  rotate(doc, [0, 0, r[1] > r[0] ? -90 : 90]);
  P.note = `stood up on its ${r[1] > r[0] ? '+x' : '-x'} end (end radii ${r[0].toFixed(2)} / ${r[1].toFixed(2)})`;
}
// lay the prop's long axis along z: the principal axis of its vertices on the ground plane (scans often lie diagonally)
function alongZ(doc) {
  let n = 0, mx = 0, mz = 0; eachVertex(doc, (p) => { n++; mx += p.x; mz += p.z; }); mx /= n; mz /= n;
  let sxx = 0, szz = 0, sxz = 0; eachVertex(doc, (p) => { const x = p.x - mx, z = p.z - mz; sxx += x * x; szz += z * z; sxz += x * z; });
  const a = 0.5 * Math.atan2(2 * sxz, sxx - szz); // the major axis' angle from +x
  // turn about y so that axis lies along z (three.js: a positive turn about y takes +x toward -z)
  rotate(doc, [0, ((a + Math.PI / 2) * 180) / Math.PI, 0]);
}
// the dragon skull: snout to +z, jaw down on the ground (the scan sits tilted, its snout down and the horn up)
function skullDown(doc, P) {
  alongZ(doc);
  const b = boundsOf(doc), c = b.getCenter(new THREE.Vector3());
  // which end is the snout: the end where the lowest points are (the jaw's teeth), not the horn's
  let lowZ = 0, lowY = 1e9; eachVertex(doc, (p) => { if (p.y < lowY) { lowY = p.y; lowZ = p.z; } });
  if (lowZ < c.z) rotate(doc, [0, 180, 0]);
  rotate(doc, P.pre.tilt ? [P.pre.tilt, 0, 0] : [0, 0, 0]);
}
// the bellows: its rig's rest pose is already baked; lay it along z with the nozzle toward +z
function bellowsPose(doc, P) {
  alongZ(doc);
  // the nozzle is the long thin end at the low end of the bag: the end whose extreme points are lowest
  const b = boundsOf(doc); let zmax = { y: 1e9 }, zmin = { y: 1e9 };
  eachVertex(doc, (p) => { if (p.z > b.max.z - 0.15 * (b.max.z - b.min.z)) zmax.y = Math.min(zmax.y, p.y); if (p.z < b.min.z + 0.15 * (b.max.z - b.min.z)) zmin.y = Math.min(zmin.y, p.y); });
  P.note = `ends' lowest points ${zmin.y.toFixed(2)} / ${zmax.y.toFixed(2)}`;
}
// the brazier's bed of coals: a low dome of lumps filling the bowl just under its rim, material 'glow'
function coalBed(doc, P) {
  const b = boundsOf(doc), H = b.max.y - b.min.y, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  // the bowl's inner wall: the smallest radius of the geometry in a band below its rim (the cage bars stand further out)
  const y0 = b.min.y + H * 0.55, y1 = b.min.y + H * 0.6;
  let rIn = 1e9; eachVertex(doc, (p) => { if (p.y > y0 && p.y < y1) rIn = Math.min(rIn, Math.hypot(p.x - cx, p.z - cz)); });
  const rr = Math.min(rIn, H * 0.42) * 0.97, yb = b.min.y + H * 0.555, rise = H * 0.05;
  // geometry: rings x segments, the dome jittered into lumps
  const RINGS = 5, SEG = 20, pos = [], nrm = [], uv = [], idx = [];
  let seed = 17; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  pos.push(cx, yb + rise, cz); nrm.push(0, 1, 0); uv.push(0.5, 0.5);
  for (let r = 1; r <= RINGS; r++) for (let s = 0; s < SEG; s++) {
    const a = (s / SEG) * Math.PI * 2 + (r % 2) * 0.15, k = r / RINGS, rad = rr * k * (r === RINGS ? 1 : 0.94 + rnd() * 0.12);
    const y = yb + rise * (1 - k * k) + (r < RINGS ? (rnd() - 0.4) * rise * 0.6 : 0);
    pos.push(cx + Math.sin(a) * rad, y, cz + Math.cos(a) * rad); nrm.push(0, 1, 0); uv.push(0.5 + Math.sin(a) * k * 0.5, 0.5 + Math.cos(a) * k * 0.5);
  }
  for (let s = 0; s < SEG; s++) idx.push(0, 1 + s, 1 + ((s + 1) % SEG));
  for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEG; s++) {
    const a = 1 + (r - 1) * SEG + s, b2 = 1 + (r - 1) * SEG + ((s + 1) % SEG), c = 1 + r * SEG + s, d = 1 + r * SEG + ((s + 1) % SEG);
    idx.push(a, c, d, a, d, b2);
  }
  // face normals for the lumps
  const pv = (i) => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]), acc = pos.map(() => 0);
  for (let t = 0; t < idx.length; t += 3) { const fn = pv(idx[t + 1]).sub(pv(idx[t])).cross(pv(idx[t + 2]).sub(pv(idx[t]))); if (fn.y < 0) { const k = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = k; fn.negate(); } for (let k = 0; k < 3; k++) { acc[idx[t + k] * 3] += fn.x; acc[idx[t + k] * 3 + 1] += fn.y; acc[idx[t + k] * 3 + 2] += fn.z; } }
  for (let i = 0; i < acc.length; i += 3) { const l = Math.hypot(acc[i], acc[i + 1], acc[i + 2]) || 1; nrm[i] = acc[i] / l; nrm[i + 1] = acc[i + 1] / l; nrm[i + 2] = acc[i + 2] / l; }
  const buf = doc.getRoot().listBuffers()[0];
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nrm)).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf))
    .setMaterial(doc.createMaterial('glow'));
  const mesh = doc.createMesh('coals').addPrimitive(prim);
  const holder = (doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0]).listChildren()[0];
  holder.addChild(doc.createNode('coals').setMesh(mesh));
  P.points.fire = new THREE.Vector3(cx, yb + rise, cz); P.fireR = rr;
  P.note = `coals r ${rr.toFixed(3)} at y ${(yb - b.min.y).toFixed(3)}..${(yb + rise - b.min.y).toFixed(3)} of ${H.toFixed(3)}`;
}
// the workbench with tools laid on its top: the small hammers at its left, the sledge and coal shovel (turned along the bench)
// at its right
function benchTools(doc, P) {
  const nodes = doc.getRoot().listNodes().filter((n) => n.getMesh());
  const bench = nodes.find((n) => /Workbench/.test(n.getName()));
  const bb = new THREE.Box3(); for (const p of bench.getMesh().listPrimitives()) { const a = p.getAttribute('POSITION'), e = []; for (let i = 0; i < a.getCount(); i++) bb.expandByPoint(new THREE.Vector3().fromArray(a.getElement(i, e))); }
  // the bench top: a ray down through the middle of the bench, the highest hit below 1.5 m
  const tris = [];
  for (const p of bench.getMesh().listPrimitives()) { const a = p.getAttribute('POSITION'), idx = p.getIndices().getArray(), e = [], P = []; for (let i = 0; i < a.getCount(); i++) P.push(new THREE.Vector3().fromArray(a.getElement(i, e))); for (let t = 0; t < idx.length; t += 3) tris.push([P[idx[t]], P[idx[t + 1]], P[idx[t + 2]]]); }
  const ray = new THREE.Ray(new THREE.Vector3((bb.min.x + bb.max.x) / 2, 1.5, bb.max.z - 0.35), new THREE.Vector3(0, -1, 0)), hit = new THREE.Vector3();
  let top = 0; for (const [a, b, c] of tris) if (ray.intersectTriangle(a, b, c, false, hit)) top = Math.max(top, hit.y);
  P.note = `bench top at ${top.toFixed(3)} m`;
  const place = (re, fn) => {
    const n = nodes.find((x) => re.test(x.getName())); if (!n) return;
    const b = new THREE.Box3(), e = []; for (const p of n.getMesh().listPrimitives()) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) b.expandByPoint(new THREE.Vector3().fromArray(a.getElement(i, e))); }
    const m = fn(b); transformMesh(n.getMesh(), m.toArray());
  };
  // the hammers (lying side by side along x, handles along z): to the bench's left third, on the top, near its front
  place(/Hammers/, (b) => new THREE.Matrix4().makeTranslation(bb.min.x + 0.35 - b.min.x, top - b.min.y + 0.002, bb.max.z - 0.62 - b.min.z));
  // the large tools (lengths along z): turned along x, to the right half
  place(/Large Tools/, (b) => {
    const c = b.getCenter(new THREE.Vector3());
    const r = new THREE.Matrix4().makeRotationY(Math.PI / 2), t0 = new THREE.Matrix4().makeTranslation(-c.x, -b.min.y, -c.z);
    const t1 = new THREE.Matrix4().makeTranslation(bb.max.x - 0.95, top + 0.002, bb.max.z - 0.5);
    return t1.multiply(r).multiply(t0);
  });
}

// ---------- looks (materials, after decimation, before the textures are compressed) ----------
async function editImage(tex, fn) {
  const { data, info } = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const col = new Float64Array(info.width * info.height * 3);
  for (let i = 0; i < col.length; i++) col[i] = data[i] / 255;
  fn(col, info);
  const u = Buffer.alloc(col.length); for (let i = 0; i < col.length; i++) u[i] = Math.max(0, Math.min(255, Math.round(col[i] * 255)));
  tex.setImage(new Uint8Array(await sharp(u, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer())).setMimeType('image/png');
}
// charred wood: whatever the bark's own brightness, it goes to char black (its relief kept as the texture's local contrast),
// the raised grain greyed with ash, a trace of brown left in the deepest char
function charCol(col) {
  const n = col.length / 3; let m = 0, m2 = 0;
  for (let p = 0; p < col.length; p += 3) { const l = luma(col[p], col[p + 1], col[p + 2]); m += l / n; m2 += (l * l) / n; }
  const sd = Math.sqrt(Math.max(1e-6, m2 - m * m));
  for (let p = 0; p < col.length; p += 3) {
    const t = (luma(col[p], col[p + 1], col[p + 2]) - m) / sd;
    const v = Math.max(0.03, 0.115 + 0.045 * t), ash = Math.max(0, Math.min(1, (t - 0.9) / 1.4));
    const c = v + ash * 0.14, warm = Math.max(0, 0.6 - ash) * 0.012;
    col[p] = c + warm; col[p + 1] = c; col[p + 2] = c * 0.96 - warm * 0.5;
  }
}
// coals: lumps of black coal (base colour) with the fire in the cracks between them and a few lumps glowing through
// (emissive), 256 px, big enough to read from the game's camera
async function emberTex(doc, m) {
  const N = 256, C = 52, base = Buffer.alloc(N * N * 3), em = Buffer.alloc(N * N * 3);
  const h = (a, b) => { let t = Math.imul(a * 374761393 + b * 668265263, 1274126177); t ^= t >>> 13; return ((Math.imul(t, 1274126177) ^ (t >>> 16)) >>> 0) / 4294967295; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // cellular lumps: the nearest and second nearest of a jittered grid of points (their difference: the cracks)
    let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = Math.floor(x / C) + i, gy = Math.floor(y / C) + j;
      const px = (gx + 0.15 + 0.7 * h(gx, gy)) * C, py = (gy + 0.15 + 0.7 * h(gy + 91, gx + 7)) * C, d = Math.hypot(x - px, y - py) / C;
      if (d < d1) { d2 = d1; d1 = d; id = h(gx * 3 + 1, gy * 5 + 2); } else if (d < d2) d2 = d;
    }
    const crack = Math.max(0, 1 - (d2 - d1) * 2.4), heat = 0.45 + 0.55 * tnoise(x / 48, y / 48, N / 48, 5), o = (y * N + x) * 3;
    const hot = id < 0.3 ? (0.3 - id) / 0.3 : 0, lump = 0.06 + 0.07 * (1 - d1);
    base[o] = lump * 255; base[o + 1] = lump * 0.9 * 255; base[o + 2] = lump * 0.85 * 255;
    const e = Math.min(1, Math.pow(crack, 1.5) * heat * 1.3 + hot * 0.45 * (1 - d1) + 0.06 * heat);
    em[o] = 255 * e; em[o + 1] = 255 * e * e * 0.6; em[o + 2] = 255 * e * e * e * 0.22;
  }
  const raw = { raw: { width: N, height: N, channels: 3 } };
  const tb = doc.createTexture('coals').setImage(new Uint8Array(await sharp(base, raw).png().toBuffer())).setMimeType('image/png');
  const te = doc.createTexture('coalsGlow').setImage(new Uint8Array(await sharp(em, raw).png().toBuffer())).setMimeType('image/png');
  m.setBaseColorTexture(tb).setBaseColorFactor([1, 1, 1, 1]).setEmissiveTexture(te).setEmissiveFactor([1, 1, 1]).setRoughnessFactor(0.9);
}
async function applyLook(doc, P) {
  const look = P.look || {}, root = doc.getRoot(), done = new Set();
  // no transmission, volume, clearcoat or sheen on the game's materials
  for (const e of root.listExtensionsUsed()) if (/KHR_materials_(transmission|volume|clearcoat|sheen|iridescence|anisotropy|specular|ior|dispersion)/.test(e.extensionName)) e.dispose();
  for (const m of root.listMaterials()) {
    const name = m.getName() || '';
    if (look.glow && look.glow.test(name)) {
      // the emissive glass/coals: warm, no textures (the game recolours or swaps it)
      m.setName('glow').setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
      // dark amber glass (what shows when the game turns the emissive down) lit warm from within
      m.setBaseColorFactor([0.22, 0.15, 0.1, 1]).setEmissiveFactor([1, 0.56, 0.22]).setMetallicFactor(0).setRoughnessFactor(0.35).setAlphaMode('OPAQUE').setDoubleSided(true);
      if (look.embers) await emberTex(doc, m);
      continue;
    }
    for (const [re, metal, rough] of look.metal || []) if (re.test(name)) { m.setMetallicFactor(metal); if (rough != null) m.setRoughnessFactor(rough); }
    if (look.noMR) { m.setMetallicRoughnessTexture(null).setOcclusionTexture(null); }
    const tex = m.getBaseColorTexture();
    if (!tex || done.has(tex)) continue;
    const g = (look.grade || []).find(([re]) => re.test(name));
    if (look.char) { done.add(tex); await editImage(tex, charCol); }
    else if (g) { done.add(tex); await editImage(tex, (col) => grade(col, g[1])); }
  }
}

// The last step of a prop's prep (after loadProp's decimation): loose pieces dropped, then the fit (fitOpts: feet on y = 0,
// centred on x/z, scaled to a height; back: its min z on 0 for wall props; head: the origin on the neck it was struck from),
// sunk by P.sink; the same transform carried to the prop's marked points (P.points) and its bounds measured again.
function dropLoose(doc, frac) {
  const ps = pieces(doc), total = ps.reduce((a, c) => a + c.n, 0);
  const small = ps.filter((c) => c.n < frac * total);
  if (small.length) keepPieces(doc, (c) => c.n >= frac * total);
  return { pieces: small.length, dropped: small.reduce((a, c) => a + c.n, 0) };
}
function finish(doc, P) {
  const notes = [], F = P.fitOpts || {};
  if (P.loose) { const r = dropLoose(doc, P.loose); if (r.pieces) notes.push(`${r.pieces} loose pieces (${r.dropped} tris) dropped`); }
  const b = boundsOf(doc);
  const s = F.height ? F.height / (b.max.y - b.min.y) : 1;
  const off = P.head ? P.cutAt.clone().negate()
    : new THREE.Vector3(F.centre ? -(b.min.x + b.max.x) / 2 : 0, F.ground ? -b.min.y : 0, P.back ? -b.min.z : F.centre ? -(b.min.z + b.max.z) / 2 : 0);
  const sink = P.sink || 0;
  const to = (v) => v.add(off).multiplyScalar(s).setY(v.y - sink);
  eachVertex(doc, (p) => to(p));
  P.points = Object.fromEntries(Object.entries(P.points || {}).map(([k, v]) => [k, to(v.clone())]));
  P.fitScale = s;
  if (sink) notes.push(`sunk ${sink} m`);
  const b2 = boundsOf(doc);
  P.bounds = { size: b2.getSize(new THREE.Vector3()).toArray() };
  P.note = [P.note, ...notes].filter(Boolean).join('; ');
}

async function prepare(P, file) {
  const doc = await io.read(file);
  bakeWorld(doc);
  const pre = P.pre || {};
  if (pre.keep) for (const n of doc.getRoot().listNodes()) if (n.getMesh() && !pre.keep.test(n.getName())) n.setMesh(null);
  if (pre.drop) for (const n of doc.getRoot().listNodes()) if (n.getMesh() && pre.drop.test(n.getName())) n.setMesh(null);
  if (pre.dropMat) for (const p of primsOf(doc)) if (pre.dropMat.test(p.getMaterial()?.getName() || '')) p.dispose();
  await doc.transform(prune());
  if (pre.region) { const lo = new THREE.Vector3(...pre.region.min), hi = new THREE.Vector3(...pre.region.max); keepPieces(doc, (c) => c.box.min.x >= lo.x && c.box.min.y >= lo.y && c.box.min.z >= lo.z && c.box.max.x <= hi.x && c.box.max.y <= hi.y && c.box.max.z <= hi.z); }
  if (pre.largest) keepPieces(doc, (c, ps) => c.n === Math.max(...ps.map((x) => x.n)));
  if (pre.smallest) keepPieces(doc, (c, ps) => c.n === Math.min(...ps.map((x) => x.n)));
  if (pre.rot) rotate(doc, pre.rot);
  if (pre.scale) scaleAll(doc, pre.scale);
  if (pre.budget) for (const n of doc.getRoot().listNodes()) {
    const m = n.getMesh(); if (!m) continue;
    const hit = pre.budget.find(([re]) => re.test(n.getName())); if (!hit) continue;
    const t = m.listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
    if (hit[1] < t) for (const p of m.listPrimitives()) simplifyPrim(p, hit[1] / t, 0.02, true);
  }
  if (pre.tris) { const ratio = pre.tris / triCount(doc); if (ratio < 1) for (const p of primsOf(doc)) simplifyPrim(p, ratio, 0.02, true); }
  if (pre.fn) pre.fn(doc, P);
  if (pre.cut) {
    const r = clipPlane(doc, pre.cut);
    // the plane's own point marks the cut (the head and the body are decimated differently, so their loops' centres differ)
    P.cutAt = new THREE.Vector3(...pre.cut.p); if (pre.cut.mark) P.points[pre.cut.mark] = P.cutAt.clone(); P.note = [P.note, `cut: ${r.loops.length} loops${pre.cut.cap === false ? '' : ' capped'}`].filter(Boolean).join('; ');
  }
  if (pre.len) { const b = boundsOf(doc), s = b.getSize(new THREE.Vector3()), k = pre.len / Math.max(s.x, s.y, s.z); scaleAll(doc, k); for (const v of Object.values(P.points)) v.multiplyScalar(k); if (P.cutAt) P.cutAt.multiplyScalar(k); }
  await doc.transform(prune());
  mkdirSync(TMP, { recursive: true });
  const out = path.join(TMP, P.key + '.glb');
  await io.write(out, doc);
  return out;
}

// ---------- run ----------
// ONLY=layers or ONLY=props rebuilds just that half; KEYS=a,b packs only those props, into <tmp>/skotos-cinder/cinder.test.glb
const ONLY = process.env.ONLY || '', KEYS = process.env.KEYS ? process.env.KEYS.split(',') : null;
await MeshoptSimplifier.ready;
mkdirSync(OUT_TEX, { recursive: true });
let texBytes = 0;
// LAYER=a,b rebuilds only those layers (into OUT_DIR when given); LAYERX='{"id": {...}}' overrides their settings (trials)
const LAYER = process.env.LAYER ? process.env.LAYER.split(',') : null, LX = process.env.LAYERX ? JSON.parse(process.env.LAYERX) : {};
const LDIR = process.env.OUT_DIR || OUT_TEX;
if (ONLY !== 'props' && !KEYS) {
  mkdirSync(LDIR, { recursive: true });
  if (!LAYER) for (const f of readdirSync(OUT_TEX)) if (f.endsWith('.webp')) rmSync(path.join(OUT_TEX, f));
  for (const L0 of LAYERS.filter((L) => !LAYER || LAYER.includes(L.id))) {
    const L = { ...L0, ...(LX[L0.id] || {}) };
    const b = await packCinderLayer(L, path.join(PH, 'tex'), LDIR);
    texBytes += b; console.log('layer', L.id.padEnd(13), L.src.padEnd(24), (b / 1024).toFixed(0) + ' KB');
  }
}

const meta = (P) => { try { return JSON.parse(readFileSync(path.join(SF, P.sf, 'meta.json'), 'utf8')); } catch (e) { return {}; } };
const loaded = [], report = [];
for (const P of ONLY === 'layers' ? [] : PROPS.filter((P) => !KEYS || KEYS.includes(P.key))) {
  P.src = P.ph || P.sf;
  const file = P.ph ? path.join(PH, 'models', P.ph, `${P.ph}_1k.gltf`) : path.join(SF, P.sf, 'model.glb');
  if (P.sf && meta(P).url) P.credit[2] = meta(P).url;
  P.points = {};
  P.file = await prepare(P, file);
  // the fit is finish()'s (so the marked points follow it), not loadProp's
  P.fitOpts = { ground: P.ground, centre: P.centre, height: P.height };
  delete P.ground; delete P.centre; delete P.height;
  P.prep = async (doc) => { await applyLook(doc, P); finish(doc, P); };
  const { doc, before, after, modes } = await loadProp(P);
  const pt = (k) => P.points[k].toArray().map((x) => +x.toFixed(3));
  if (P.points.fire) P.extra = { ...(P.extra || {}), fire: pt('fire'), fireR: +(P.fireR * P.fitScale).toFixed(3) };
  if (P.points.neck && !P.head) P.extra = { ...(P.extra || {}), neck: pt('neck') };
  loaded.push({ P, doc });
  report.push(`${P.key.padEnd(12)} ${P.src.padEnd(24)} ${String(before).padStart(7)} -> ${String(after).padStart(5)} tris (${modes}) size ${P.bounds.size.map((x) => x.toFixed(2)).join(' x ')}${P.extra ? ' ' + JSON.stringify(P.extra) : ''}${P.note ? ' [' + P.note + ']' : ''}`);
}
// statueHead's pivot: the neck it was struck from, on the packed statue (both packed at the source's scale)
{
  const st = loaded.find((x) => x.P.key === 'statue')?.P, hd = loaded.find((x) => x.P.key === 'statueHead')?.P;
  if (st && hd) { hd.anchor = st.extra.neck; if (Math.abs(st.fitScale - 1) > 1e-6) console.warn('statue scaled: statueHead will not fit its neck'); }
}
const sfAuthors = [...new Set(PROPS.filter((P) => P.sf).map((P) => P.credit[1]))].join(', ');
const outGlb = KEYS ? path.join(TMP, 'cinder.test.glb') : OUT_GLB;
const res = ONLY === 'layers' ? { bytes: existsSync(OUT_GLB) ? statSync(OUT_GLB).size : 0, tris: '-', textures: '-' } : await writePack(loaded, outGlb, {
  credit: `Act IV environment: Poly Haven (polyhaven.com, CC0) and Sketchfab models by ${sfAuthors} (CC-BY 4.0). Decimated, re-centred, re-graded and re-encoded (WebP) for Skotos; see src/assets/cinder/CREDITS.txt.`,
  license: 'CC0 / CC-BY-4.0'
});
console.log(report.join('\n'));
console.log(`${path.basename(outGlb)} ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures; layers ${(texBytes / 1024).toFixed(0)} KB`);

if (!KEYS) {
  const log = existsSync(path.join(PH, 'dl_log.json')) ? JSON.parse(readFileSync(path.join(PH, 'dl_log.json'), 'utf8')) : {};
  const by = (id) => (log[id]?.authors?.length ? log[id].authors.join(', ') : 'Poly Haven');
  const ph = (id) => `${id} by ${by(id)} - https://polyhaven.com/a/${id} (CC0)`;
  writeFileSync(path.join(OUT_TEX, 'CREDITS.txt'), [
    'Skotos Act IV environment assets (the Field of Ash and the Ashen Forge).',
    'Packed by tools/pack-cinder.mjs: resized, WebP-encoded, ambient occlusion baked into the diffuse layers, colour-graded to the',
    'act\'s ash and iron (ashTrod and rust re-tiled from random patches of their sources, ashGround and cliffRock flattened, the',
    'road\'s normal map decoded from sRGB); the grate layer and its glow mask are drawn by the packer (bars, slots, frame) over the',
    'iron plate and rust scans. Props decimated, re-centred, re-scaled and re-graded: the trees charred (the second stood upright),',
    'the rocks taken to black, the statue beheaded at the neck and both cuts capped, the bull\'s head taken off its pedestal, the',
    'brass lantern\'s flame and most of its chain removed, the lanterns\' glass made an emissive "glow", the brazier given a bed',
    'of coals, the bellows posed static, the blacksmith pack split and its tools laid on the workbench, the bones made matte.',
    '', 'Tiling layers (src/assets/cinder/*.webp) - Poly Haven (https://polyhaven.com), CC0 (public domain):',
    ...LAYERS.map((L) => `  ${L.id}${L.mask ? ' (and grateGlow)' : ''}: ${ph(L.src)}${L.rust ? '; ' + ph(L.rust) : ''}`),
    '', 'Props (src/assets/cinder.glb):',
    ...PROPS.map((P) => (P.ph ? `  ${P.key}: ${ph(P.ph)}` : `  ${P.key}: "${P.credit[0]}" by ${P.credit[1]} - ${P.credit[2]} (CC-BY 4.0, https://creativecommons.org/licenses/by/4.0/)`)),
    ''
  ].join('\n'));
}
