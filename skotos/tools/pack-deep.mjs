// Packs the Act II environment set (Poly Haven, CC0), loaded when the hero first heads for Deepstone:
//   src/assets/deep/<id>_d.webp, <id>_n.webp   tiling layers: snow, scree, gravel, cliff rock, dwarven slabs and walls, lava crust
//   src/assets/deep.glb                         props: cliffs and boulders (geometry only, the game stones them in world space),
//                                               the iron gate, doors, chandeliers, the forge crane, a ladder
// usage: node tools/pack-deep.mjs [polyhaven download dir]   (dir holds tex/<id>/ and models/<id>/, see dl_log.json)
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { packLayer, loadProp, writePack } from './envlib.mjs';

const SRC = process.argv[2] || '/tmp/claude-0/ph';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_TEX = path.join(ROOT, 'src/assets/deep');
const OUT_GLB = path.join(ROOT, 'src/assets/deep.glb');

const LAYERS = [
  { id: 'snow', src: 'snow_02', d: 1024, n: 512, ao: 0.6 },                    // the pass: wind-packed snow
  { id: 'scree', src: 'rocks_ground_05', d: 1024, n: 512, ao: 0.8 },           // snowy scree under the cliffs
  { id: 'gravel', src: 'rocks_ground_02', d: 1024, n: 512, ao: 0.8 },          // the old dwarf road
  { id: 'cliff', src: 'dark_rock_02', d: 1024, n: 512, ao: 0.8 },              // mountain rock, cliffs and boulders
  { id: 'dslab', src: 'rock_tile_floor_02', d: 1024, n: 512, ao: 0.8 },        // great slabs of the dwarven halls
  { id: 'cave', src: 'dark_rock', d: 1024, n: 512, ao: 0.8 },                  // raw cave floor in the mines
  { id: 'herring', src: 'volcanic_herringbone_01', d: 1024, n: 512, ao: 0.8 }, // paved avenues
  { id: 'dwall', src: 'stone_wall_04', d: 1024, n: 512, ao: 0.9 },             // dressed walls and pillars
  { id: 'cavewall', src: 'rock_wall_10', d: 1024, n: 512, ao: 0.9 },           // rough-hewn mine walls
  { id: 'lava', src: 'slab_tiles', d: 1024, n: 512, ao: 0.5 }                  // cooling crust over the lava (its cracks glow)
];

const PROPS = [
  // the mountain: geometry only, stoned in world space by the game (cliff layer, snow on top)
  { key: 'cliffA', src: 'namaqualand_cliff_02', tris: 3200, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'cliffB', src: 'namaqualand_cliff_01', tris: 2400, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'faceA', src: 'rock_face_01', tris: 1800, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'faceB', src: 'rock_face_02', tris: 1800, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'mount', src: 'mountainside', tris: 4200, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'boulderD', src: 'namaqualand_boulder_05', tris: 900, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'rockD', src: 'rock_07', tris: 600, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'rockE', src: 'rock_09', tris: 500, err: 0.05, geo: true, ground: true, centre: true },
  { key: 'rockF', src: 'moon_rock_03', tris: 700, err: 0.05, geo: true, ground: true, centre: true },
  // the halls
  { key: 'irongate', src: 'large_iron_gate', tris: 5000, err: 0.03, d: 512, n: 256, orm: 256, solid: false },
  { key: 'door', src: 'large_castle_door', tris: 3000, err: 0.03, d: 512, n: 256, orm: 256, solid: true },
  { key: 'chandelier', src: 'lantern_chandelier_01', tris: 2400, err: 0.04, d: 512, n: 256, orm: 256, solid: false },
  { key: 'crane', src: 'overhead_crane', tris: 3000, err: 0.04, d: 512, n: 256, orm: 256, solid: true },
  { key: 'ladder', src: 'wooden_ladder', tris: 700, err: 0.04, d: 512, n: 256, orm: 256, solid: true, ground: true }
];

mkdirSync(OUT_TEX, { recursive: true });
for (const f of readdirSync(OUT_TEX)) if (f.endsWith('.webp')) rmSync(path.join(OUT_TEX, f));
let texBytes = 0;
for (const L of LAYERS) { const b = await packLayer(L, path.join(SRC, 'tex'), OUT_TEX); texBytes += b; console.log('layer', L.id.padEnd(9), L.src.padEnd(24), (b / 1024).toFixed(0) + ' KB'); }

const loaded = [], report = [];
for (const P of PROPS) {
  const { doc, before, after, modes } = await loadProp(P, path.join(SRC, 'models'));
  loaded.push({ P, doc });
  report.push(`${P.key.padEnd(11)} ${P.src.padEnd(24)} ${String(before).padStart(7)} -> ${String(after).padStart(5)} tris (${modes})${P.bounds ? ' size ' + P.bounds.size.map((x) => x.toFixed(1)).join('x') : ''}`);
}
const res = await writePack(loaded, OUT_GLB, {
  credit: 'Act II environment: Poly Haven (polyhaven.com), CC0. Decimated, re-centred and re-encoded (WebP) for Skotos.',
  license: 'CC0'
});
console.log(report.join('\n'));
console.log(`deep.glb ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures; layers ${(texBytes / 1024).toFixed(0)} KB`);
const log = existsSync(path.join(SRC, 'dl_log.json')) ? JSON.parse(readFileSync(path.join(SRC, 'dl_log.json'), 'utf8')) : {};
const by = (id) => (log[id]?.authors?.length ? ' by ' + log[id].authors.join(', ') : '');
writeFileSync(path.join(OUT_TEX, 'CREDITS.txt'), [
  'Skotos Act II environment assets - all CC0 (public domain), from Poly Haven (https://polyhaven.com).',
  'Packed by tools/pack-deep.mjs: resized, WebP-encoded, ambient occlusion baked into the diffuse layers; props decimated and re-centred.',
  '', 'Tiling layers (src/assets/deep/*.webp):', ...LAYERS.map((L) => `  ${L.id}: ${L.src}${by(L.src)} - https://polyhaven.com/a/${L.src}`),
  '', 'Props (src/assets/deep.glb):', ...PROPS.map((P) => `  ${P.key}: ${P.src}${by(P.src)} - https://polyhaven.com/a/${P.src}`), ''
].join('\n'));
