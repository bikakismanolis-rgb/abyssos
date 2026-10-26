// Packs the trees (Sketchfab, CC-BY 4.0, by evolveduk) into src/assets/trees.glb, one top-level node per tree:
// feet on y = 0, centred, scaled to a game height; trunks and branches decimated, leaf cards kept, textures WebP.
// usage: node tools/pack-trees.mjs [dir holding tree_<id>/model.glb]
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadProp, writePack } from './envlib.mjs';

const SRC = process.argv[2] || '/tmp/claude-0/sf/models';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT = path.join(ROOT, 'src/assets/trees.glb');
// key, source folder, triangle budget, game height (m), Sketchfab page
const TREES = [
  ['treePine', 'tree_pine', 1500, 8.5, 'https://sketchfab.com/3d-models/pine-tree-d45218a3fab349e5b1de040f29e7b6f9', 'Pine Tree'],
  ['treeFir', 'tree_fir', 2900, 7.2, 'https://sketchfab.com/3d-models/fir-tree-3f39aa5485e94477a36b435f7a1a8b54', 'Fir tree'],
  ['treeSpruce', 'tree_spruce', 2300, 9.5, 'https://sketchfab.com/3d-models/spruce-a50a5df3164246a5af97992cec33a143', 'Spruce'],
  ['treeOak', 'tree_oak', 1500, 7.4, 'https://sketchfab.com/3d-models/oak-tree-6468dd4d3eb240ef902b9057d9913606', 'Oak tree'],
  ['treeBeech', 'tree_beech', 2100, 7.0, 'https://sketchfab.com/3d-models/beech-tree-0983d8933531491f9be71c669e8a907b', 'Beech tree'],
  ['treeDead', 'tree_old', 900, 7.0, 'https://sketchfab.com/3d-models/old-tree-3cb4d59eb4844dc4802480e9ee53785e', 'Old tree']
];
const loaded = [], report = [];
for (const [key, dir, tris, height] of TREES) {
  const P = { key, src: dir, file: path.join(SRC, dir, 'model.glb'), tris, err: 0.04, d: 512, n: 256, orm: 128, solid: false, keepCards: true, ground: true, centre: true, height };
  const { doc, before, after, modes } = await loadProp(P);
  loaded.push({ P, doc });
  report.push(`${key.padEnd(11)} ${String(before).padStart(6)} -> ${String(after).padStart(5)} tris (${modes}) size ${P.bounds.size.map((x) => x.toFixed(1)).join('x')}`);
}
const res = await writePack(loaded, OUT, {
  credit: 'Trees by evolveduk (sketchfab.com/evolveduk), CC-BY 4.0: Pine Tree, Fir tree, Spruce, Oak tree, Beech tree, Old tree. Decimated, rescaled and re-encoded (WebP) for Skotos.',
  license: 'CC-BY-4.0'
});
console.log(report.join('\n'));
console.log(`trees.glb ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures`);
writeFileSync(path.join(ROOT, 'src/assets/TREES_CREDITS.txt'), [
  'Skotos trees (src/assets/trees.glb) - CC-BY 4.0, by evolveduk (https://sketchfab.com/evolveduk).',
  'Packed by tools/pack-trees.mjs: trunks decimated, rescaled, textures re-encoded as WebP.', '',
  ...TREES.map((T) => `  ${T[0]}: "${T[5]}" by evolveduk - ${T[4]}`), ''
].join('\n'));
