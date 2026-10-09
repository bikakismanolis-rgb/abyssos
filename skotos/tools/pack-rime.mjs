// Packs the Act V environment set ('rime' pack: the Frozen Coast and the Farthest Light), loaded with loadPack('rime'):
//   src/assets/rime/<id>_d.webp, <id>_n.webp   tiling layers: snow, trodden snow, the low-tide shore, sea-cliff rock, sea ice
//                                               and grey jetty planks (d 1024 / n 512, AO baked into the colour)
//   src/assets/rime.glb                         props (see PROPS; extras.size on every one; extras.top on the towers and the
//                                               Farthest Light, extras.door on the Farthest Light, extras.hang on the icicles)
//   src/assets/rime/CREDITS.txt
// Layers and the ship, casks, crate, oil lamp and cliffs are Poly Haven (CC0), the ice is ambientCG (CC0); the wrecks, boats,
// towers, lighthouse, anchors, whale, runestone, shore scans, icicles and the shack are Sketchfab (CC-BY 4.0).
// usage: node tools/pack-rime.mjs [polyhaven/ambientCG dir] [sketchfab dir]
//   ONLY=layers|props rebuilds one half; KEYS=a,b packs only those props into <os tmp>/skotos-rime/rime.test.glb (the pack is
//   left alone); LAYER=a,b rebuilds only those layers, OUT_DIR=dir elsewhere, LAYERX='{"id":{...}}' overrides (trials);
//   REPORT=file.json writes the measured pack (props, triangles, textures, bytes)
//   polyhaven dir: <id>/<id>_{diff,nor_gl,arm}_1k.jpg (layers), <id>/<id>_1k.gltf (models), <id>/meta.json, dl_log.json;
//   ambientCG: <id>/<id>_1K-JPG_{Color,NormalGL}.jpg; sketchfab dir: <name>/model.glb + meta.json (tools/fetch-act5.mjs)
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as THREE from 'three';
import sharp from 'sharp';
import { prune, transformMesh, compactPrimitive, metalRough, join, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { io, loadProp, writePack, triCount } from './envlib.mjs';

const PH = process.argv[2] || '/tmp/claude-0/ph';
const SF = process.argv[3] || '/tmp/claude-0/sf/act5';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_TEX = path.join(ROOT, 'src/assets/rime');
const OUT_GLB = path.join(ROOT, 'src/assets/rime.glb');
const TMP = path.join(os.tmpdir(), 'skotos-rime');

// ---------- tiling layers (Poly Haven and ambientCG, CC0) ----------
// grade: { mul, sat, gamma, contrast, mean } as in pack-cinder.mjs (mean: the layer's average sRGB colour, set last);
// flat: the tile's broad brightness blotches divided out; clean ({ r, t, grow }: dark marks filled in, colour and relief,
// see cleanMarks); despeckle ({ r, t, k }: thin dark marks, darker than their surroundings by more than t, lifted); nboost: normal map strength; acg: an ambientCG set (Color and
// NormalGL maps, no AO). The act's palette: blue-white snow under a pale sky, dark wet rock and shingle, green-black sea ice.
const LAYERS = [
  // powder snow, its dark prints and scratches lifted out (they would march in rows across the ground tile after tile),
  // cooled a little: the coast's and the frozen sea's base
  { id: 'snow', src: 'snow_02', d: 1024, n: 512, ao: 0.7, clean: { r: 24, t: 0.025, grow: 3 }, despeckle: { r: 4, t: 0.025, k: 1 }, flat: { k: 0.5, r: 0.12 }, grade: { sat: 0.6, contrast: 1.1, mean: [182, 188, 198] }, nboost: 1.2 },
  // snow trodden thin over dark ground: the roads, the Landing, the paths along the shore
  { id: 'snowTrod', src: 'snow_03', d: 1024, n: 512, ao: 0.8, grade: { sat: 0.55, contrast: 0.72, mean: [140, 140, 142] } },
  // wet shingle and sand: the flats the tide uncovers, the beaches
  { id: 'shore', src: 'low_tide_rocks', d: 1024, n: 512, ao: 0.9, grade: { sat: 0.55, contrast: 1.15, mean: [92, 88, 80] }, nboost: 1.1 },
  // dark sea-worn rock: the cliffs, and the rock props stoned in world space
  { id: 'seaCliff', src: 'seaside_rock', d: 1024, n: 512, ao: 0.9, flat: { k: 0.6, r: 0.12 }, grade: { sat: 0.35, contrast: 1.6, mean: [66, 66, 68] }, nboost: 1.4 },
  // cracked lake ice taken from green toward the black-green of sea ice: the frozen sea, thick ice, the ice shader's albedo
  { id: 'ice', src: 'Ice002', acg: true, d: 1024, n: 512, ao: 0, grade: { mul: [0.9, 1, 1.12], sat: 0.8, contrast: 1.05, mean: [92, 116, 128] } },
  // weathered grey boards: the jetty, the stilt huts, the wreck decks
  { id: 'planks', src: 'wood_planks_grey', d: 1024, n: 512, ao: 0.85, grade: { sat: 0.6, contrast: 1.05, mean: [86, 84, 80] } }
];

// ---------- props ----------
// ph: Poly Haven model id; sf: Sketchfab folder (credit: [title, author, page, licence]).
// pre (on the source, all transforms baked first, in this order):
//   drop / keep (regexps on mesh node names), dropMat (regexp on material names), ao (AO maps baked into the base colour at
//   this strength, then dropped), pad (UV islands' edges dilated this many px into the unused texture), paint (patches of the
//   base colour painted out: [material regexp, [[x0, y0, x1, y1]...] in texture fractions]), tile ([material regexp,
//   [[v0, v1]...], blend]: bands of its maps made to repeat vertically, see tileBands),
//   atlas ({ mats: [regexps], cols, rows, cell, name }: the materials' maps copied into one grid, UVs moved into its cells),
//   budget0 (as budget, before the stack), stack (a tower drawn up from bands of its scans: see stackTower),
//   fn0 / fn (steps of the prop's own: before the textures are touched / after the first decimation), rot ([x,y,z] degrees),
//   scale (number or [x,y,z]), cut / cuts (planes: { p, n, keep, cap, lift }), thin ([material regexp, rMin, lMin]: ropes
//   and nets dropped, see dropThin), budget ([[regexp on node or material names,
//   tris]]: each group decimated together), each (every mesh decimated alone, all to about this many triangles), join (one
//   primitive per material, welded: scan chunks decimate without cracks), len (uniform scale: longest side)
// then loadProp: tris, err, d/n (texture sizes; a number or [w, h]), solid, fit ({ ground, centre, height, hang })
// look (after decimation): grade ([[material regexp, grade]]), rime (moss and green taken to frost), dered (red paint
//   taken out), frost ({ k, color }:
//   snow on every surface facing the sky, see frostUp), glow (regexp: those
//   materials become the emissive 'glow'), metal ([regexp, metalness, roughness]), keepMR (keep the metal/rough maps)
// finish: loose (drop pieces under this fraction of the triangles), sink, shift ([x,y,z] after the fit), extra (node extras)
// the lighthouse's base colour (fractions of the image): the spray-painted hearts beside and over the door, the door's
// painted outline, the dark stain under the window, and the dark seam line down the door side
const LIGHTHOUSE_PAINT = [
  [0.585, 0.342, 0.665, 0.412], [0.712, 0.466, 0.796, 0.588], [0.688, 0.528, 0.722, 0.566], [0.772, 0.528, 0.808, 0.566],
  [0.722, 0.572, 0.782, 0.622], [0.738, 0.402, 0.8, 0.478], [0.628, 0.478, 0.646, 0.932], [0.646, 0.855, 0.712, 0.935]
];
const BY = 'CC-BY-4.0';
// the towers' look, applied to the shared atlas before each tower is split off (so the three props share one texture set)
const TOWER_LOOK = { rime: 0.6, grade: [[/./, { sat: 0.6, contrast: 1.0, mul: [0.97, 0.99, 1.03] }]] };
const WOOD = (k = 0.9, sat = 0.55, mean = null) => [[/./, { mul: [k, k, k * 1.02], sat, ...(mean ? { mean } : {}) }]];
const PROPS = [
  // ----- the Frozen Coast's wrecks and boats -----
  // the Dalarö wreck: the seabed (its own meshes) dropped, the hull's scan chunks joined, turned bow to +z, the bow broken
  // open (the belly is walked into from +z) and the hull cut where the sediment met it; 13.6 m long, sunk 0.45 m into the bar;
  // the hull 1024, the standing masts 256
  { key: 'wreck', sf: 'wreck', pre: { drop: /^Botten/, join: true, fn: wreckPrep }, tris: 12000, err: 0.01, d: { material0_1: 1024, material0_0: 256 }, n: { '.': 0 }, solid: false, fit: { ground: true, centre: true }, sink: 0.45, loose: 0.0015,
    look: { grade: [[/material0_1/, { sat: 0.35, mul: [1.03, 1.0, 0.95], contrast: 1.1, gamma: 0.95 }], [/material0_0/, { sat: 0.35, mul: [1.03, 1.0, 0.95] }]] },
    credit: ['The Dalarö wreck/ Bodekull part 2', 'Swedish National Maritime and Transport History Museums (maritima)', '', BY] },
  // the Gislinge boat drawn up for the winter: sail, mast, yard and rigging stowed (dropped); 8.1 m, bow +z
  { key: 'keelboat', sf: 'keelboat', pre: { drop: /Sail|Rigging Pin|Ropes|Yard|Mast|Shrouds|Stay/, ao: 0.8, len: 8.1 }, tris: 4000, err: 0.01, d: [512, 1024], n: [256, 512], solid: false, fit: { ground: true, centre: true },
    look: { grade: WOOD(0.92, 0.6), frost: { k: 0.55 } },
    credit: ['Gislinge Viking Boat', 'Opus Poly (OpusPoly)', '', BY] },
  // a weathered rowboat, its oars lost; 4.6 m, bow +z
  { key: 'rowboat', sf: 'rowboat', pre: { drop: /^Cylinder_low/, ao: 0.8, len: 4.6 }, tris: 2000, err: 0.01, d: 512, solid: false, fit: { ground: true, centre: true },
    look: { grade: [[/./, { gamma: 0.9, mul: [1.12, 1.12, 1.14], sat: 0.6 }]], frost: { k: 0.55 } },
    credit: ['Old Rowboat', 'TooManyDemons (toomanydemons)', '', BY] },
  // a broken hull lying keel up, its stern stove in; 6.4 m long, along z
  { key: 'brokenBoat', sf: 'brokenboat', pre: { rot: [0, 90, 0], len: 6.4 }, tris: 1600, err: 0.01, d: 256, solid: false, fit: { ground: true, centre: true },
    look: { grade: [[/./, { gamma: 0.85, mul: [1.2, 1.18, 1.16], sat: 0.6, contrast: 1.1 }]], frost: { k: 0.35 } },
    credit: ['Broken Row Boat', 'megamaniac', '', BY] },
  // ----- the sea-lights: three ruined round towers, their three texture sets atlased into one strip (one shared set),
  // moss taken to rime, each drawn up to about 2.6 times its width from bands of the scans (windows turned from storey to
  // storey): towerA the intact tower raised by two storeys; towerB the split tower, its breached band repeated so the rent
  // runs up it; towerC the battlemented stub set on the intact tower's mirrored foot and plain wall, its own doorway now
  // high in the wall. 3.5 m across the foot, the doorway (if any at the foot) to +z; extras.top: where the fire-cage sits -----
  { key: 'towerA', sf: 'towers', pre: { ao: 0.85, atlas: TOWER_ATLAS(), lookFirst: true, keep: /^Object_3$/, budget0: [[/^Object_3$/, 2000]], stack: { segs: [['Object_3', 0, 23.5], ['Object_3', 23.5, 51.5], ['Object_3', 23.5, 51.5, 120], ['Object_3', 23.5, 51.5, 240], ['Object_3', 51.5, 64]] }, fn: towerPrep },
    tris: 3400, err: 0.008, d: [1536, 512], n: [768, 256], solid: false, fit: { ground: true, centre: true }, look: TOWER_LOOK, credit: towerCredit() },
  { key: 'towerB', sf: 'towers', pre: { ao: 0.85, atlas: TOWER_ATLAS(), lookFirst: true, keep: /^Object_2$/, budget0: [[/^Object_2$/, 1500]], stack: { segs: [['Object_2', 0, 10], ['Object_2', 10, 34], ['Object_2', 10, 34], ['Object_2', 10, 34], ['Object_2', 10, 34], ['Object_2', 34, 64]] }, fn: towerPrep },
    tris: 3400, err: 0.008, d: [1536, 512], n: [768, 256], solid: false, fit: { ground: true, centre: true }, look: TOWER_LOOK, credit: towerCredit() },
  { key: 'towerC', sf: 'towers', pre: { ao: 0.85, atlas: TOWER_ATLAS(), lookFirst: true, keep: /^Object_[34]$/, budget0: [[/^Object_3$/, 1700], [/^Object_4$/, 1500]], stack: { segs: [['Object_3', 0, 23.5, 0, true], ['Object_3', 23.5, 41, 60], ['Object_3', 23.5, 41, 200], ['Object_3', 23.5, 41, 310], ['Object_4', 3, 46]] }, fn: towerPrep },
    tris: 3400, err: 0.008, d: [1536, 512], n: [768, 256], solid: false, fit: { ground: true, centre: true }, look: TOWER_LOOK, credit: towerCredit() },
  // the Farthest Light: the Old Lighthouse's stone shaft alone (its iron lantern room, galleries, rails, window and door
  // dropped), the spray-painted hearts, the painted door outline, a stain under the window and a dark seam painted out of
  // its texture; drawn up from its own brick bands (each turned) to 15.5 m, tapering from 3.4 m at the foot to 2.4 m at
  // the capped top (extras.top: where the code lantern room sits), turned so the doorway faces +z (extras.door: its foot)
  { key: 'farLight', sf: 'lighthouse', pre: { keep: /^Object_4$/, pad: 24, erode: 3, paint: [[/^Concrete_material$/, LIGHTHOUSE_PAINT]], tile: [/^Concrete_material$/, [[0.308, 0.466], [0.78, 0.938]], 0.3],
    stack: { segs: [['Object_4', 0, 2.44], ['Object_4', 2.44, 3.7], ['Object_4', 2.44, 3.7, 140], ['Object_4', 2.44, 3.7, 270], ['Object_4', 2.44, 3.7, 50], ['Object_4', 2.44, 3.7, 190]], taper: 0.86, top: 7.93, seam: 0.06, smooth: true, capUV: { at: [0.56, 0.2], scale: 0.05 } }, fn: farLightPrep },
    tris: 5000, err: 0.004, d: 512, n: 512, solid: false, fit: { ground: true, centre: true },
    look: { grade: [[/./, { sat: 0.5, contrast: 0.95, mul: [0.98, 0.99, 1.02], mean: [132, 132, 134] }]], metal: [[/./, 0, 0.9]] },
    credit: ['Old Lighthouse', 'Nirved Kamble (nirved)', '', BY] },
  // ----- dressing -----
  // a medieval anchor standing on its crown (wooden stock up; build5 tilts and sinks it), its three maps atlased; 1.6 m
  { key: 'anchor', sf: 'anchor', pre: { ao: 0.7, atlas: { mats: [/AnchorHook/, /AnchorWoodAttach/, /IronAnchorDeco/], cols: 2, rows: 2, cell: 1024, name: 'anchor' }, len: 1.7 }, tris: 1500, err: 0.01, d: 256, solid: false, fit: { ground: true, centre: true },
    look: { grade: [[/./, { gamma: 0.85, mul: [1.25, 1.22, 1.2], sat: 0.7 }]] },
    credit: ['Medieval Anchor (Free)', 'wolfgar74', '', BY] },
  // a sunken anchor lying on its side with its chain, crusted with weed; 1.8 m long
  { key: 'sunkenAnchor', sf: 'anchor_sunken', pre: { len: 1.8 }, tris: 1500, err: 0.01, d: 256, solid: false, fit: { ground: true, centre: true },
    credit: ['Sunken Anchor', 'guillaume.biju-duval', '', BY] },
  // the right whale's skeleton, settled on the strand: ribs where they stand, the flippers down on the sand, the skull dipped
  // to rest on its jaws and the spine sinking toward the tail; its thirteen maps atlased into one; bleached; 13 m, skull +z
  // (centred where the layout's blocks are: the skull at +5.1..+7.3)
  { key: 'whale', sf: 'whale', pre: { fn0: whalePrep, atlas: { mats: WHALE_MATS(), cols: 4, rows: 4, cell: 512, name: 'bone' }, each: 5200, eachErr: 0.06, len: 12.9 }, tris: 6000, err: 0.012, d: 512, solid: false, fit: { ground: true, centre: true }, shift: [0, 0, 0.85], loose: 0.0006,
    look: { grade: [[/./, { sat: 0.25, gamma: 0.9, mul: [1.0, 1.0, 1.02], contrast: 1.1, mean: [176, 172, 164] }]], metal: [[/./, 0, 0.85]] },
    credit: ['Skeleton - North Atlantic Right Whale', 'Ingenium Canada (technoscience3d)', '', BY] },
  // the Name-stones: a carved runestone, its museum's red paint taken out of the carving (the game cuts its own glowing
  // name-lines), carved face +z; 1.7 m
  { key: 'runestone', sf: 'runestone', pre: { len: 1.7 }, tris: 2500, err: 0.004, d: 512, n: 512, solid: true, fit: { ground: true, centre: true }, loose: 0.002,
    look: { dered: 1, grade: [[/./, { sat: 0.55, contrast: 1.05, mul: [0.97, 0.98, 1.0] }]], frost: { k: 0.35 }, metal: [[/./, 0, 0.9]] },
    credit: ['Monumental Runic Stone - Optimised, 20k', 'Thomas Flynn (nebulousflynn)', '', BY] },
  // a beach rock crusted with barnacles (its stray 3-triangle fragment dropped); 1.4 m
  { key: 'barnacleRock', sf: 'barnacle_rock', pre: { drop: /^Object_2$/, ao: 0.8, len: 1.4 }, tris: 1200, err: 0.01, d: 512, solid: true, fit: { ground: true, centre: true }, loose: 0.01,
    look: { metal: [[/./, 0, 0.8]] },
    credit: ['Beach Rock with Barnacles Photoscan', 'EFX (evan4129)', '', BY] },
  // a bleached driftwood root-stump, its two texture sets atlased, cut out of its sand (a plane fitted to the sand around
  // it); 2.6 m
  { key: 'driftwood', sf: 'driftwood', pre: { atlas: { mats: [/^Driftwood$/, /^Driftwood1$/], cols: 2, rows: 1, cell: 1024, name: 'driftwood' }, join: true, tris: 60000, fn: (doc, P) => groundCut(doc, P, { r0: 2.6, r1: 5, keep: 3.4, lift: 0.07 }), len: 2.6 }, tris: 2000, err: 0.008, d: [512, 256], solid: false, fit: { ground: true, centre: true }, loose: 0.05,
    look: { grade: [[/./, { sat: 0.6, contrast: 1.1, mul: [0.94, 0.94, 0.96] }]], metal: [[/./, 0, 0.9]] },
    credit: ['Large Pine Driftwood (Pacific Northwest)', 'Crew Froebel (crufro)', '', BY] },
  // a heap of kelp and wrack, cut out of its sand; 2.3 m across
  { key: 'kelp', sf: 'kelp', pre: { join: true, tris: 40000, fn: (doc, P) => groundCut(doc, P, { r0: 1.35, r1: 1.75, keep: 1.45, lift: 0.02, sand: (r, g, b) => smooth(0.5, 0.66, luma(r, g, b)) * (1 - smooth(0.06, 0.13, Math.max(r, g, b) - Math.min(r, g, b))), sandTo: [0.44, 0.42, 0.39] }), len: 2.2 }, tris: 1500, err: 0.008, d: 512, solid: false, fit: { ground: true, centre: true }, loose: 0.02,
    look: { grade: [[/./, { sat: 0.9, contrast: 1.05, mul: [0.97, 0.97, 0.95] }]], metal: [[/./, 0, 0.55]] },
    credit: ['Scan of Kelp and Seaweed on sand beach', 'sterlingcrispin', '', BY], creditNote: 'credited under the CC-BY 4.0 licence its page carries, though its description says cc0' },
  // a strip of icicles, geometry only (the game's ice material): its top edge on y = 0, hanging down (extras.hang); 2.1 m
  { key: 'icicle', sf: 'icicle', pre: {}, tris: 800, err: 0.01, geo: 'ice', solid: false, fit: { hang: true, centre: true }, extra: { hang: true },
    credit: ['Icicle 01', 'Elin Hohler (ElinHohler)', '', BY] },
  // the fishermen's shack: its gabled main room only (the lean-to and the front room cut away, the cut walls capped), its
  // door to +z, 3.5 m square (its lit window went with the front room)
  { key: 'shack', sf: 'shack', pre: { fn: shackPrep }, tris: 4000, err: 0.006, d: 512, solid: false, fit: { ground: true, centre: true },
    look: { grade: [[/Material\.001/, { sat: 0.6, contrast: 1.05, mul: [0.95, 0.96, 1.0] }]], frost: { k: 0.8 }, metal: [[/./, 0, 0.9]] },
    credit: ['Wooden Shack', 'Dominic Baker (Domuk)', '', BY] },
  // ----- the Farthest Light -----
  // the Icebound Ship: Poly Haven's Dutch ship with its sails stowed (dropped), its ropes and nets dropped (masts, yards
  // and tops kept: decimation shreds thin rope to slivers), the hull below 0.8 m under the waterline cut away (the ice
  // hides it), bow +z, the waterline on y = 0; beam 4.3 m
  { key: 'ship', ph: 'dutch_ship_medium', pre: { drop: /sails/, ao: 0.8, rot: [0, -90, 0], scale: 0.83, cut: { p: [0, -0.66, 0], n: [0, 1, 0], keep: 'above', cap: false }, thin: [/rigging/, 0.03, 0.3], budget: [[/hull/, 4000], [/rigging/, 2000]] }, tris: 6000, err: 0.006, d: { hull: 1024, rigging: 512 }, n: { hull: 512, rigging: 0 }, solid: false, fit: { centre: true },
    look: { grade: [[/hull/, { sat: 0.55, contrast: 1.05, mul: [0.95, 0.96, 1.0] }], [/rigging/, { sat: 0.5 }]], frost: { k: 0.85 }, metal: [[/./, 0, 0.88]] } },
  // a whale-oil cask (one of Poly Haven's barrels), 0.92 m
  { key: 'cask', ph: 'wooden_barrels_01', pre: { keep: /barrel01$/, ao: 0.8 }, tris: 1200, err: 0.006, d: 256, solid: true, fit: { ground: true, centre: true },
    look: { grade: WOOD(0.9, 0.6), frost: { k: 0.5 }, metal: [[/./, 0, 0.85]] } },
  // a sea-chest crate with its lid, 1.17 m long
  { key: 'crate', ph: 'wooden_crate_02', pre: { ao: 0.8 }, tris: 600, err: 0.006, d: 256, solid: true, fit: { ground: true, centre: true },
    look: { grade: WOOD(0.92, 0.6), frost: { k: 0.5 }, metal: [[/./, 0, 0.85]] } },
  // the keepers' sea-lantern: a brass oil lamp, its painted roses taken out, its flame dropped, its glass chimney widened
  // x2.2 (so the light reads at the game's distance) and made the 'glow' material (the game recolours it)
  { key: 'oilLamp', ph: 'vintage_oil_lamp', pre: { dropMat: /flame/, ao: 0.8, budget: [[/glass/, 160], [/^vintage_oil_lamp$/, 640]], fn: (doc) => widenGlass(doc, /glass/, 2.2) }, tris: 800, err: 0.005, d: 256, solid: false, fit: { ground: true, centre: true },
    look: { glow: /glass/, glowColor: [1, 0.86, 0.62], dered: 1, grade: [[/^vintage_oil_lamp$/, { sat: 0.6, gamma: 0.9 }]], metal: [[/^vintage_oil_lamp$/, 0.25, 0.5]] } },
  // cliff faces, geometry only (the seaCliff layer, world-projected): a 92 m stretch of coastal cliff and a 5 m rock face,
  // each turned so its face looks +z
  { key: 'coastCliff', ph: 'coastal_cliff_01', pre: { tris: 60000, fn: faceForward }, tris: 4000, err: 0.01, geo: 'rock', solid: true, fit: { ground: true, centre: true } },
  { key: 'rockFace', ph: 'rock_face_01', pre: { fn: faceForward }, tris: 2000, err: 0.01, geo: 'rock', solid: true, fit: { ground: true, centre: true } }
];
function towerCredit() { return ['Pack of old towers in ruins', 'JB3D (taz83)', '', BY]; }
function TOWER_ATLAS() { return { mats: [/tower_intact2/, /tower_damaged2/, /tower_ruined3/], cols: 3, rows: 1, cell: 1024, name: 'tower' }; }
function WHALE_MATS() { return ['None', 'None.004', 'None.005', 'None.006', 'None.007', 'None.008', 'None.009', 'None.010', 'None.011', 'None.013', 'None.017', 'None.018', 'None.019'].map((n) => new RegExp('^' + n.replace('.', '\\.') + '$')); }

// ---------- layers ----------
async function packRimeLayer(L, srcDir, outDir) {
  const dir = path.join(srcDir, L.src);
  const f = L.acg ? { d: `${L.src}_1K-JPG_Color.jpg`, n: `${L.src}_1K-JPG_NormalGL.jpg`, a: null } : { d: `${L.src}_diff_1k.jpg`, n: `${L.src}_nor_gl_1k.jpg`, a: `${L.src}_arm_1k.jpg` };
  const diff = await sharp(path.join(dir, f.d)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = diff.info.width;
  const arm = f.a ? await sharp(path.join(dir, f.a)).resize(W, W).removeAlpha().raw().toBuffer() : null;
  const nrm = await sharp(path.join(dir, f.n)).resize(W, W).removeAlpha().raw().toBuffer();
  const col = new Float64Array(W * W * 3), nor = new Float32Array(W * W * 3);
  for (let p = 0, i = 0; p < W * W; p++, i += diff.info.channels) {
    const ao = arm ? 1 - L.ao * (1 - arm[p * 3] / 255) : 1;
    for (let q = 0; q < 3; q++) { col[p * 3 + q] = (diff.data[i + q] / 255) * ao; nor[p * 3 + q] = (nrm[p * 3 + q] / 255) * 2 - 1; }
  }
  if (L.clean) cleanMarks(col, nor, W, L.clean);
  if (L.despeckle) despeckle(col, W, L.despeckle);
  if (L.flat) flattenTile(col, nor, W, L.flat);
  if (L.grade) grade(col, L.grade);
  if (L.nboost) for (let p = 0; p < nor.length; p += 3) {
    const x = nor[p] * L.nboost, y = nor[p + 1] * L.nboost, l = Math.min(0.999, Math.hypot(x, y)), s = l / Math.max(1e-6, Math.hypot(x, y));
    nor[p] = x * s; nor[p + 1] = y * s; nor[p + 2] = Math.sqrt(1 - l * l);
  }
  const toU8 = (a, n) => { const u = Buffer.alloc(a.length); for (let i = 0; i < a.length; i++) u[i] = Math.max(0, Math.min(255, n ? Math.round((a[i] * 0.5 + 0.5) * 255) : Math.round(a[i] * 255))); return u; };
  const raw = { raw: { width: W, height: W, channels: 3 } };
  const dOut = path.join(outDir, `${L.id}_d.webp`), nOut = path.join(outDir, `${L.id}_n.webp`);
  await sharp(toU8(col), raw).resize(L.d, L.d, { kernel: 'lanczos3' }).webp({ quality: 76, effort: 6 }).toFile(dOut);
  await sharp(toU8(nor, true), raw).resize(L.n, L.n, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(nOut);
  return statSync(dOut).size + statSync(nOut).size;
}
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// colour grade in place (pack-cinder.mjs's): gamma and mul per channel, luminance contrast about the mean and saturation,
// then each channel rescaled so the average lands on mean (sRGB 0-255); w (optional): per-pixel weights (0 = left out of
// the averages: a texture's unused background)
function grade(col, { mul = [1, 1, 1], sat = 1, gamma = 1, contrast = 1, mean = null }, w = null) {
  const n = col.length / 3;
  let lm = 0, sw = 0;
  for (let p = 0; p < col.length; p += 3) {
    for (let q = 0; q < 3; q++) col[p + q] = Math.pow(col[p + q], gamma) * mul[q];
    const k = w ? w[p / 3] : 1; lm += luma(col[p], col[p + 1], col[p + 2]) * k; sw += k;
  }
  lm /= Math.max(1e-9, sw);
  const avg = [0, 0, 0];
  for (let p = 0; p < col.length; p += 3) {
    const l = luma(col[p], col[p + 1], col[p + 2]), l2 = contrast === 1 ? l : Math.max(0, lm + (l - lm) * contrast), k = contrast === 1 ? 1 : l > 1e-5 ? l2 / l : 0;
    for (let q = 0; q < 3; q++) col[p + q] = Math.max(0, l2 + (col[p + q] * k - l2) * sat);
    const wk = w ? w[p / 3] : 1; for (let q = 0; q < 3; q++) avg[q] += (col[p + q] * wk) / Math.max(1e-9, sw);
  }
  void n;
  if (mean) for (let p = 0; p < col.length; p += 3) for (let q = 0; q < 3; q++) col[p + q] = Math.min(1, col[p + q] * (mean[q] / 255 / Math.max(1e-6, avg[q])));
  for (let i = 0; i < col.length; i++) col[i] = Math.min(1, col[i]);
}
// the large-scale brightness blotches (and normal tilt) divided out of a tile, its detail kept: { k: strength, r: blur radius
// as a fraction of the tile }
function flattenTile(col, nor, W, { k = 0.7, r: rf = 1 / 10 }) {
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
// dark marks (prints, scratches) taken out of a tile, colour and relief: where a texel's luminance falls more than t under
// its neighbourhood's (a wide blur, radius r), the mark (grown by grow px, feathered) is filled with the neighbourhood's
// colour and a flat normal, each carrying the fine grain of a far part of the tile (so the fill is not smooth)
function cleanMarks(col, nor, W, { r = 24, t = 0.02, grow = 4, feather = 3 }) {
  const N = W * W, L = new Float32Array(N); for (let p = 0; p < N; p++) L[p] = luma(col[p * 3], col[p * 3 + 1], col[p * 3 + 2]);
  const wide = (a) => { let b = a; for (let pass = 0; pass < 3; pass++) b = boxBlur(boxBlur(b, W, r, 1), W, r, W); return b; };
  const fine = (a) => boxBlur(boxBlur(a, W, 2, 1), W, 2, W);
  const M = wide(L);
  let mask = new Float32Array(N); for (let p = 0; p < N; p++) mask[p] = M[p] - L[p] > t ? 1 : 0;
  for (let g = 0; g < grow; g++) { const m2 = mask.slice(); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (mask[p]) continue; if (mask[y * W + ((x + 1) % W)] || mask[y * W + ((x + W - 1) % W)] || mask[((y + 1) % W) * W + x] || mask[((y + W - 1) % W) * W + x]) m2[p] = 1; } mask = m2; }
  for (let f = 0; f < feather; f++) mask = boxBlur(boxBlur(mask, W, 1, 1), W, 1, W);
  const ch = (a, q) => { const o = new Float32Array(N); for (let p = 0; p < N; p++) o[p] = a[p * 3 + q]; return o; };
  // the source of each filled texel: the same spot shifted across the tile, the first of three shifts that lands clear
  const shifts = [[0.37, 0.71], [0.61, 0.23], [0.19, 0.53]].map(([a, b]) => [Math.round(W * a), Math.round(W * b)]);
  const from = new Int32Array(N);
  for (let p = 0; p < N; p++) { const x = p % W, y = (p - x) / W; let j = -1; for (const [dx, dy] of shifts) { const k = ((y + dy) % W) * W + ((x + dx) % W); if (mask[k] < 0.05) { j = k; break; } } from[p] = j < 0 ? ((y + shifts[0][1]) % W) * W + ((x + shifts[0][0]) % W) : j; }
  // the neighbourhood's colour without the marks (a normalised blur: the marks weigh nothing), plus the source's own
  // departure from its neighbourhood (the grain and gentle relief of clean snow)
  const keep = new Float32Array(N); for (let p = 0; p < N; p++) keep[p] = 1 - Math.min(1, mask[p]);
  const kw = wide(keep);
  for (let q = 0; q < 3; q++) {
    const c = ch(col, q), ck = new Float32Array(N); for (let p = 0; p < N; p++) ck[p] = c[p] * keep[p];
    const cw = wide(ck); for (let p = 0; p < N; p++) cw[p] /= Math.max(1e-4, kw[p]);
    for (let p = 0; p < N; p++) { const a = Math.min(1, mask[p] * 1.2); if (!a) continue; const j = from[p]; col[p * 3 + q] = Math.max(0, c[p] * (1 - a) + (cw[p] + c[j] - cw[j]) * a); }
  }
  for (let q = 0; q < 2; q++) { const n = ch(nor, q); for (let p = 0; p < N; p++) { const a = Math.min(1, mask[p] * 1.2); if (!a) continue; nor[p * 3 + q] = n[p] * (1 - a) + n[from[p]] * a; } }
  for (let p = 0; p < N * 3; p += 3) { let x = nor[p], y = nor[p + 1]; const l = Math.hypot(x, y); if (l > 0.95) { x *= 0.95 / l; y *= 0.95 / l; } nor[p] = x; nor[p + 1] = y; nor[p + 2] = Math.sqrt(1 - x * x - y * y); }
}
// thin dark marks lifted out of a tile: where a texel's luminance falls more than t under its neighbourhood's (a box blur of
// radius r), it is raised toward it by k (soft over a further t)
function despeckle(col, W, { r = 8, t = 0.04, k = 0.85 }) {
  let L = new Float32Array(W * W); for (let p = 0; p < L.length; p++) L[p] = luma(col[p * 3], col[p * 3 + 1], col[p * 3 + 2]);
  let M = L; for (let pass = 0; pass < 2; pass++) M = boxBlur(boxBlur(M, W, r, 1), W, r, W);
  for (let p = 0; p < L.length; p++) {
    const d = M[p] - L[p] - t; if (d <= 0) continue;
    const a = k * Math.min(1, d / t), f = (L[p] + (M[p] - L[p]) * a) / Math.max(1e-4, L[p]);
    for (let q = 0; q < 3; q++) col[p * 3 + q] = Math.min(1, col[p * 3 + q] * f);
  }
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

// ---------- source preparation ----------
const primsOf = (doc) => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
const sceneOf = (doc) => doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
const meshNodes = (doc) => doc.getRoot().listNodes().filter((n) => n.getMesh());
// every mesh in world space straight under one node 'flat' (pack-cinder.mjs's, skins posed at rest); every primitive
// indexed and owning its accessors, with only position, normal and the first UVs
function bakeWorld(doc) {
  const root = doc.getRoot(), scene = sceneOf(doc);
  const found = [];
  scene.traverse((n) => { if (n.getMesh()) found.push(n); });
  const used = new Set(), holder = doc.createNode('flat');
  for (const n of found) {
    let mesh = n.getMesh();
    if (used.has(mesh)) { const copy = doc.createMesh(mesh.getName()); for (const p of mesh.listPrimitives()) copy.addPrimitive(p.clone()); mesh = copy; }
    used.add(mesh);
    transformMesh(mesh, n.getWorldMatrix());
    holder.addChild(doc.createNode(n.getName()).setMesh(mesh));
  }
  const old = []; for (const t of scene.listChildren()) t.traverse((n) => old.push(n));
  for (const n of old) { n.setMesh(null); n.setSkin(null); n.dispose(); }
  for (const s of root.listSkins()) s.dispose();
  for (const a of root.listAnimations()) a.dispose();
  scene.addChild(holder);
  const buf = root.listBuffers()[0];
  for (const p of primsOf(doc)) {
    for (const s of p.listSemantics()) if (!/^(POSITION|NORMAL|TEXCOORD_0)$/.test(s)) p.setAttribute(s, null);
    for (const t of p.listTargets()) p.removeTarget(t);
    if (!p.getIndices()) p.setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from({ length: p.getAttribute('POSITION').getCount() }, (_, i) => i)).setBuffer(buf));
    const shared = (a) => a.listParents().filter((x) => x.propertyType === 'Primitive').length > 1;
    for (const s of p.listSemantics()) { const a = p.getAttribute(s); if (shared(a)) p.setAttribute(s, a.clone()); }
    if (shared(p.getIndices())) p.setIndices(p.getIndices().clone());
  }
}
// fn(pos, nrm|null, prim) edits each vertex in place (each accessor once); prims: only these
function eachVertex(doc, fn, prims = null) {
  const seen = new Set(), p = new THREE.Vector3(), n = new THREE.Vector3(), v = [];
  for (const prim of prims || primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), b = prim.getAttribute('NORMAL');
    if (seen.has(a)) continue; seen.add(a); if (b) seen.add(b);
    for (let i = 0; i < a.getCount(); i++) {
      p.fromArray(a.getElement(i, v)); if (b) n.fromArray(b.getElement(i, v));
      fn(p, b ? n : null, prim);
      a.setElement(i, p.toArray()); if (b) b.setElement(i, n.normalize().toArray());
    }
  }
}
function boundsOf(doc, prims = null) { const b = new THREE.Box3(); eachVertex(doc, (p) => b.expandByPoint(p), prims); return b; }
function rotate(doc, deg, prims = null, pivot = null) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...deg.map((d) => (d * Math.PI) / 180), 'XYZ'));
  eachVertex(doc, (p, n) => { if (pivot) p.sub(pivot); p.applyQuaternion(q); if (pivot) p.add(pivot); n?.applyQuaternion(q); }, prims);
}
// uniform or per-axis scale (the normals follow the inverse transpose)
function scaleAll(doc, s) {
  const k = Array.isArray(s) ? s : [s, s, s];
  eachVertex(doc, (p, n) => { p.set(p.x * k[0], p.y * k[1], p.z * k[2]); n?.set(n.x / k[0], n.y / k[1], n.z / k[2]); });
}
const moveAll = (doc, d, prims = null) => eachVertex(doc, (p) => p.add(d), prims);
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
// thin pieces (ropes, nets) of the materials matching re dropped: a piece's mean radius, its area over 2 pi times its
// longest extent, under rMin, or a piece shorter than lMin (blocks and pins); what decimation would shred to slivers
function dropThin(doc, re, rMin, lMin = 0) {
  const v = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  let gone = 0;
  keepPieces(doc, (c) => {
    if (!re.test(c.tris[0][0].getMaterial()?.getName() || '')) return true;
    let area = 0;
    for (const [prim, t] of c.tris) { const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray(); A.fromArray(a.getElement(idx[t], v)); B.fromArray(a.getElement(idx[t + 1], v)); C.fromArray(a.getElement(idx[t + 2], v)); area += B.sub(A).cross(C.sub(A)).length() / 2; }
    const s = c.box.getSize(new THREE.Vector3()), L = Math.max(s.x, s.y, s.z), keep = area / (2 * Math.PI * L) >= rMin && L >= lMin;
    if (!keep) gone += c.n;
    return keep;
  });
  return gone;
}
// keep only the triangles for which keep(a, b, c) (their three positions) is true
function keepTris(doc, keep) {
  const v = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray(), out = [];
    for (let t = 0; t < idx.length; t += 3) {
      A.fromArray(a.getElement(idx[t], v)); B.fromArray(a.getElement(idx[t + 1], v)); C.fromArray(a.getElement(idx[t + 2], v));
      if (keep(A, B, C)) out.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    if (!out.length) { prim.dispose(); continue; }
    prim.getIndices().setArray(new Uint32Array(out)); compactPrimitive(prim);
  }
}
// Clips every primitive by the plane n . x = n . p, keeping one side; the triangles across it are split (positions, normals
// and UVs interpolated) and, unless cap is false, each closed loop of the cut is filled with a fan from its centre (lifted
// `lift` metres off the plane, its UVs a small patch of the texture at the loop's first vertex, or capUV); only: a filter on
// the primitives cut (the rest are left whole). (pack-cinder.mjs's)
function clipPlane(doc, { p, n, keep = 'below', cap = true, lift = 0, capUV = null, only = null }) {
  const N = new THREE.Vector3(...n).normalize(), d = N.dot(new THREE.Vector3(...p)), sgn = keep === 'below' ? 1 : -1;
  const loopsAll = [], centre = new THREE.Vector3(); let cn = 0;
  for (const prim of primsOf(doc)) {
    if (only && !only(prim)) continue;
    const pos = prim.getAttribute('POSITION'), nor = prim.getAttribute('NORMAL'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray();
    const P = [], NN = [], U = [], e = [];
    for (let i = 0; i < pos.getCount(); i++) { P.push(new THREE.Vector3().fromArray(pos.getElement(i, e))); NN.push(nor ? new THREE.Vector3().fromArray(nor.getElement(i, e)) : new THREE.Vector3(0, 1, 0)); U.push(uv ? uv.getElement(i, []) : [0, 0]); }
    const s = P.map((v) => sgn * (N.dot(v) - d));
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
      let r = 0; for (; r < 3; r++) if (nIn === 1 ? ins[r] : !ins[r]) break;
      const a = T[r], b = T[(r + 1) % 3], c = T[(r + 2) % 3];
      const ab = cutV(a, b), ac = cutV(a, c);
      if (nIn === 1) { out.push(a, ab, ac); segs.push([ac, ab]); }
      else { out.push(ab, b, c, ab, c, ac); segs.push([ab, ac]); }
    }
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
        const ci = P.length, out2 = N.clone().multiplyScalar(sgn);
        const t1 = new THREE.Vector3(1, 0, 0).addScaledVector(N, -N.x); if (t1.lengthSq() < 1e-4) t1.set(0, 0, 1).addScaledVector(N, -N.z);
        t1.normalize(); const t2 = N.clone().cross(t1), u0 = capUV ? capUV.at : U[loop[0]], k = capUV ? capUV.scale : 0.15;
        const cuv = (v) => [u0[0] + t1.dot(v.clone().sub(c)) * k, u0[1] + t2.dot(v.clone().sub(c)) * k];
        P.push(c.clone().addScaledVector(out2, lift)); NN.push(out2.clone()); U.push(cuv(c)); s.push(0);
        const base = P.length;
        for (const i of loop) { P.push(P[i].clone()); NN.push(out2.clone()); U.push(cuv(P[i])); s.push(0); }
        for (let q = 0; q < loop.length; q++) {
          const i = base + q, j = base + ((q + 1) % loop.length);
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
// meshoptimizer simplification that keeps the UV seams: strict first (seams only collapse along themselves); where the
// seams stall it far above the target (scans cut into many islands), seams may collapse where the UVs barely change (heavy
// UV weights), then more freely; returns the mode used
function simp(p, ratio, err = 0.03) {
  const idx = p.getIndices(), pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), uv = p.getAttribute('TEXCOORD_0');
  const indices = new Uint32Array(idx.getArray()), positions = new Float32Array(pos.getArray()), n = pos.getCount(), at = new Float32Array(n * 5), v = [];
  for (let i = 0; i < n; i++) { if (nor) { nor.getElement(i, v); at[i * 5] = v[0]; at[i * 5 + 1] = v[1]; at[i * 5 + 2] = v[2]; } if (uv) { uv.getElement(i, v); at[i * 5 + 3] = v[0]; at[i * 5 + 4] = v[1]; } }
  const want = Math.min(indices.length, Math.max(36, Math.floor((indices.length * ratio) / 3) * 3));
  if (want >= indices.length) return 'as-is';
  const run = (w, e, flags) => MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, at, 5, [0.4, 0.4, 0.4, w, w], null, want, e, flags)[0];
  let out = run(1.5, err, []), mode = 'strict';
  if (out.length > want * 1.1) { const o2 = run(6, err * 2, ['Permissive']); if (o2.length < out.length) { out = o2; mode = 'seams'; } }
  if (out.length > want * 1.25) { const o3 = run(2, err * 4, ['Permissive']); if (o3.length < out.length) { out = o3; mode = 'loose'; } }
  idx.setArray(new Uint32Array(out));
  compactPrimitive(p);
  return mode;
}
function decimateAll(doc, want, err) {
  const prims = primsOf(doc), t = prims.reduce((a, p) => a + p.getIndices().getCount() / 3, 0), modes = new Set();
  if (want < t) for (const p of prims) modes.add(simp(p, want / t, err));
  return [...modes].join('+') || 'as-is';
}
// meshes decimated in groups (a regexp on node or material names and the group's triangles), or each mesh alone
function decimateGroups(doc, budget) {
  for (const [re, want] of budget) {
    const nodes = meshNodes(doc).filter((n) => re.test(n.getName()) || n.getMesh().listPrimitives().some((p) => re.test(p.getMaterial()?.getName() || '')));
    const prims = [...new Set(nodes.flatMap((n) => n.getMesh().listPrimitives()))];
    const t = prims.reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
    if (want < t) for (const p of prims) simp(p, want / t, 0.02);
  }
}
function decimateEach(doc, want, err = 0.02) {
  const prims = primsOf(doc), t = prims.reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
  if (want >= t) return;
  for (const p of prims) { const n = p.getIndices().getCount() / 3; simp(p, Math.max(want / t, Math.min(1, 24 / n)), err); }
}

// ---------- textures (on the source's own maps, before they are resized) ----------
async function readImg(tex) {
  const { data, info } = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
async function writeImg(tex, data, w, h) {
  tex.setImage(new Uint8Array(await sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer())).setMimeType('image/png').setURI('');
}
// the texture a material reads its AO from: its occlusion map, or a Poly Haven 'arm' map in the metal/rough slot (R = AO)
const aoTex = (m) => m.getOcclusionTexture() || (/arm/i.test(m.getMetallicRoughnessTexture()?.getURI() || '') ? m.getMetallicRoughnessTexture() : null);
// AO baked into the base colour (strength k), then the AO and metal/rough maps dropped (the factors stay)
async function bakeAO(doc, k) {
  const done = new Map();
  for (const m of doc.getRoot().listMaterials()) {
    const bc = m.getBaseColorTexture(), ao = aoTex(m);
    if (bc && ao && !done.has(bc)) {
      const c = await readImg(bc), a = await sharp(Buffer.from(ao.getImage())).resize(c.w, c.h).removeAlpha().raw().toBuffer();
      for (let p = 0; p < c.w * c.h; p++) { const f = 1 - k * (1 - a[p * 3] / 255); for (let q = 0; q < 3; q++) c.data[p * 3 + q] = Math.round(c.data[p * 3 + q] * f); }
      await writeImg(bc, c.data, c.w, c.h); done.set(bc, true);
    }
    m.setOcclusionTexture(null).setMetallicRoughnessTexture(null);
  }
}
// the UV islands of every primitive using material m, rasterised at w x h (1 = covered)
function uvMask(doc, m, w, h) {
  const mask = new Uint8Array(w * h), v = [];
  for (const prim of primsOf(doc)) {
    if (prim.getMaterial() !== m) continue;
    const uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray(); if (!uv) continue;
    const U = new Float32Array(uv.getCount() * 2); for (let i = 0; i < uv.getCount(); i++) { uv.getElement(i, v); U[i * 2] = v[0] * w - 0.5; U[i * 2 + 1] = v[1] * h - 0.5; }
    for (let t = 0; t < idx.length; t += 3) {
      const ax = U[idx[t] * 2], ay = U[idx[t] * 2 + 1], bx = U[idx[t + 1] * 2], by = U[idx[t + 1] * 2 + 1], cx = U[idx[t + 2] * 2], cy = U[idx[t + 2] * 2 + 1];
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx) - 1)), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx) + 1));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy) - 1)), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy) + 1));
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      for (const [px, py] of [[ax, ay], [bx, by], [cx, cy]]) { const X = Math.round(px), Y = Math.round(py); if (X >= 0 && Y >= 0 && X < w && Y < h) mask[Y * w + X] = 1; }
      if (Math.abs(den) < 1e-9) continue;
      // pixels within about a pixel of the triangle (barycentric margin scaled by its size)
      const e = 1.2 / Math.sqrt(Math.abs(den));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, l3 = 1 - l1 - l2;
        if (l1 >= -e && l2 >= -e && l3 >= -e) mask[y * w + x] = 1;
      }
    }
  }
  return mask;
}
// colour bled outward from the islands into the unused texture, px passes (mipmaps and the downscale then never mix in the
// background's black); the base colour and normal map of every material
async function padIslands(doc, px, erode = 0) {
  for (const m of doc.getRoot().listMaterials()) for (const tex of [m.getBaseColorTexture(), m.getNormalTexture()]) {
    if (!tex) continue;
    const c = await readImg(tex), w = c.w, h = c.h, mask = uvMask(doc, m, w, h);
    // the islands' outermost pixels (dark with the background's bleed) taken back first, so they are filled from inside
    for (let e = 0; e < erode; e++) { const was = mask.slice(); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (was[i] && (!was[i - 1] || !was[i + 1] || !was[i - w] || !was[i + w])) mask[i] = 0; } }
    let cur = mask.slice();
    for (let pass = 0; pass < px; pass++) {
      const nxt = cur.slice(); let grew = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (cur[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (cur[j]) { r += c.data[j * 3]; g += c.data[j * 3 + 1]; b += c.data[j * 3 + 2]; n++; } }
        if (n) { c.data[i * 3] = r / n; c.data[i * 3 + 1] = g / n; c.data[i * 3 + 2] = b / n; nxt[i] = 1; grew++; }
      }
      cur = nxt; if (!grew) break;
    }
    await writeImg(tex, c.data, w, h);
  }
}
// marks painted out of a material's base colour: each rectangle (fractions of the image) is filled from the nearby patch
// of the same island whose surroundings best match its own (the sum of squared differences over a 6 px ring round it, so
// brick courses line up), the source wholly inside the UV islands and clear of every marked rectangle; feathered 6 px
async function paintOut(doc, matRe, rects) {
  const m = doc.getRoot().listMaterials().find((x) => matRe.test(x.getName())); if (!m) throw new Error('paint: no material ' + matRe);
  const tex = m.getBaseColorTexture(), c = await readImg(tex), w = c.w, h = c.h, src = c.data, F = 6, R = Math.round(0.22 * w);
  const mask = uvMask(doc, m, w, h), px = rects.map((r) => [Math.round(r[0] * w), Math.round(r[1] * h), Math.round(r[2] * w), Math.round(r[3] * h)]);
  // the islands (4-connected runs of the mask): a patch is only ever taken from its own island
  const isl = new Int32Array(w * h).fill(-1); let nIsl = 0;
  for (let i0 = 0; i0 < w * h; i0++) {
    if (!mask[i0] || isl[i0] >= 0) continue;
    const st = [i0]; isl[i0] = nIsl;
    while (st.length) { const i = st.pop(), x = i % w, y = (i - x) / w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && mask[j] && isl[j] < 0) { isl[j] = nIsl; st.push(j); } }
    nIsl++;
  }
  const picked = [];
  for (let ri = 0; ri < px.length; ri++) {
    const [x0, y0, x1, y1] = px[ri];
    const cnt = new Map(); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = isl[y * w + x]; if (k >= 0) cnt.set(k, (cnt.get(k) || 0) + 1); }
    const own = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
    // bad: a pixel no source may use (outside the islands, or in a rectangle not yet painted, with its ring); its
    // summed-area table (the rectangles already painted are clean sources now)
    const bad = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) bad[i] = isl[i] === own ? 0 : 1;
    for (const [a0, b0, a1, b1] of px.slice(ri)) for (let y = Math.max(0, b0 - F); y < Math.min(h, b1 + F); y++) for (let x = Math.max(0, a0 - F); x < Math.min(w, a1 + F); x++) bad[y * w + x] = 1;
    const sat = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) for (let x = 0, row = 0; x < w; x++) { row += bad[y * w + x]; sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row; }
    const badIn = (a0, b0, a1, b1) => (a0 < 0 || b0 < 0 || a1 > w || b1 > h ? 1 : sat[b1 * (w + 1) + a1] - sat[b0 * (w + 1) + a1] - sat[b1 * (w + 1) + a0] + sat[b0 * (w + 1) + a0]);
    const ring = [];
    for (let y = y0 - F; y < y1 + F; y++) for (let x = x0 - F; x < x1 + F; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h || (x >= x0 && x < x1 && y >= y0 && y < y1) || !mask[y * w + x]) continue;
      ring.push(x, y);
    }
    let best = null, bc = Infinity;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx += 2) {
      if (Math.abs(dx) < (x1 - x0) && Math.abs(dy) < (y1 - y0)) continue;
      if (badIn(x0 + dx - F, y0 + dy - F, x1 + dx + F, y1 + dy + F)) continue;
      let cost = 0;
      for (let k = 0; k < ring.length && cost < bc; k += 2) {
        const i = (ring[k + 1] * w + ring[k]) * 3, j = ((ring[k + 1] + dy) * w + ring[k] + dx) * 3;
        const a = src[i] - src[j], b = src[i + 1] - src[j + 1], d = src[i + 2] - src[j + 2]; cost += a * a + b * b + d * d;
      }
      if (cost < bc) { bc = cost; best = [dx, dy]; }
    }
    if (!best) throw new Error(`paint: no clean source for ${[x0, y0, x1, y1]}`);
    picked.push(best);
    const [dx, dy] = best, copy = Buffer.from(src);
    for (let y = y0 - F; y < y1 + F; y++) for (let x = x0 - F; x < x1 + F; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const d = Math.min(x - (x0 - F), x1 + F - 1 - x, y - (y0 - F), y1 + F - 1 - y), a = Math.min(1, (d + 1) / (F + 1));
      const i = (y * w + x) * 3, j = ((y + dy) * w + x + dx) * 3;
      for (let q = 0; q < 3; q++) src[i + q] = Math.round(copy[i + q] * (1 - a) + copy[j + q] * a);
    }
  }
  await writeImg(tex, c.data, w, h);
  return picked;
}
// a band of a texture made to repeat vertically: its top rows (blend: a share of the band's height) faded into the rows just
// under its foot, so a copy stacked on it carries on where the band began ([v0, v1]: the band's rows as texture v, for
// each strip of the material's base colour and normal maps)
async function tileBands(doc, matRe, bands, blend = 0.25) {
  const m = doc.getRoot().listMaterials().find((x) => matRe.test(x.getName())); if (!m) throw new Error('tileBands: no material ' + matRe);
  for (const tex of [m.getBaseColorTexture(), m.getNormalTexture()].filter(Boolean)) {
    const c = await readImg(tex), w = c.w, h = c.h, src = Buffer.from(c.data);
    for (const [v0, v1] of bands) {
      const r0 = Math.round(v0 * h), r1 = Math.round(v1 * h), H = r1 - r0, zone = Math.round(H * blend);
      for (let y = r1 - zone; y < r1; y++) {
        const t = (y - (r1 - zone)) / zone, a = t * t * (3 - 2 * t), ys = y - H; if (ys < 0) continue;
        for (let x = 0; x < w; x++) for (let q = 0; q < 3; q++) { const i = (y * w + x) * 3 + q; c.data[i] = Math.round(src[i] * (1 - a) + src[(ys * w + x) * 3 + q] * a); }
      }
    }
    await writeImg(tex, c.data, w, h);
  }
}
// Several materials' maps copied into one grid (a cell per material, its image shrunk by a margin of cell/64 and the margin
// filled with its edge pixels so mipmaps do not bleed between cells), every primitive's UVs moved into its material's cell
// and the materials replaced by one named spec.name. Only the base colour and normal maps are carried.
async function atlas(doc, { mats, cols, rows, cell, name }) {
  const root = doc.getRoot(), all = root.listMaterials(), W = cols * cell, H = rows * cell, m = Math.round(cell / 64);
  const found = mats.map((re) => all.find((x) => re.test(x.getName())));
  if (found.some((x) => !x)) throw new Error('atlas: missing ' + mats.filter((_, i) => !found[i]).join(','));
  const hasN = found.some((x) => x.getNormalTexture());
  const sheet = async (slot, fill) => {
    const parts = [];
    for (let i = 0; i < found.length; i++) {
      const t = slot === 'n' ? found[i].getNormalTexture() : found[i].getBaseColorTexture();
      const img = t ? sharp(Buffer.from(t.getImage())).removeAlpha().resize(cell - 2 * m, cell - 2 * m, { fit: 'fill' })
        : sharp({ create: { width: cell - 2 * m, height: cell - 2 * m, channels: 3, background: slot === 'n' ? { r: 128, g: 128, b: 255 } : { r: Math.round(found[i].getBaseColorFactor()[0] * 255), g: Math.round(found[i].getBaseColorFactor()[1] * 255), b: Math.round(found[i].getBaseColorFactor()[2] * 255) } } });
      parts.push({ input: await img.extend({ top: m, bottom: m, left: m, right: m, extendWith: 'copy' }).png().toBuffer(), left: (i % cols) * cell, top: Math.floor(i / cols) * cell });
    }
    return new Uint8Array(await sharp({ create: { width: W, height: H, channels: 3, background: fill } }).composite(parts).png().toBuffer());
  };
  const out = doc.createMaterial(name).setBaseColorTexture(doc.createTexture(name).setImage(await sheet('d', { r: 128, g: 128, b: 128 })).setMimeType('image/png'))
    .setRoughnessFactor(found[0].getRoughnessFactor()).setMetallicFactor(found[0].getMetallicFactor()).setDoubleSided(true);
  if (hasN) out.setNormalTexture(doc.createTexture(name + 'N').setImage(await sheet('n', { r: 128, g: 128, b: 255 })).setMimeType('image/png'));
  const v = [];
  for (const prim of primsOf(doc)) {
    const i = found.indexOf(prim.getMaterial()); if (i < 0) continue;
    const uv = prim.getAttribute('TEXCOORD_0'); if (!uv) { prim.setMaterial(out); continue; }
    const cu = uv.clone(), cx = (i % cols) * cell + m, cy = Math.floor(i / cols) * cell + m, s = cell - 2 * m;
    for (let k = 0; k < cu.getCount(); k++) { cu.getElement(k, v); const u = Math.min(1, Math.max(0, v[0])), w = Math.min(1, Math.max(0, v[1])); cu.setElement(k, [(cx + u * s) / W, (cy + w * s) / H]); }
    prim.setAttribute('TEXCOORD_0', cu).setMaterial(out);
  }
  for (const x of found) x.dispose();
}

// A tower stacked from bands of its scans (all transforms baked, one shared material): segs [[node name, y0, y1, turn?,
// mirror?]...], bottom up, each the named scan's slab between y0 and y1 (its own units, from its foot), centred, turned
// turn degrees about its axis (mirror: x flipped), laid on the stack so far. Each slab is scaled about the axis so its
// outer wall meets a target radius at its foot and at its top (taper: the target at the top as a share of the first
// slab's top radius; 1 keeps a cylinder), and the walls are drawn onto common inner and outer radii within seam of every
// join, so the stones' relief never steps. top: the stack cut there (and capped) instead of at its last slab's top;
// smooth: normals set square to the cone (a plain shaft).
// Returns the joins' heights.
function stackTower(doc, P, { segs, taper = 1, seam = 1.5, top = null, capUV = null, smooth = false }) {
  const root = doc.getRoot(), nodes = meshNodes(doc), byName = (n) => nodes.find((x) => x.getName() === n);
  const out = doc.createMesh('stack'), made = [], joins = [];
  const deep = (prim) => { const c = prim.clone(); for (const s of c.listSemantics()) c.setAttribute(s, c.getAttribute(s).clone()); c.setIndices(c.getIndices().clone()); out.addPrimitive(c); return c; };
  // the mean radius (about x = z = 0) of the walls facing out (sign 1) or in (-1) within d of height y
  const radius = (prims, y, d, sign = 1) => {
    let n = 0, sum = 0;
    eachVertex(doc, (p, nn) => { if (Math.abs(p.y - y) > d || !nn) return; const r = Math.hypot(p.x, p.z); if (r < 1e-6) return; if (((nn.x * p.x + nn.z * p.z) / r) * sign < 0.45) return; n++; sum += r; }, prims);
    return n ? sum / n : null;
  };
  let H = 0, R0 = null;
  const slabs = [];
  for (const [name, y0, y1, turn = 0, mirror = false] of segs) {
    const node = byName(name); if (!node) throw new Error('stack: no node ' + name);
    const src = node.getMesh().listPrimitives(), b = boundsOf(doc, src), c = b.getCenter(new THREE.Vector3());
    const prims = src.map(deep), only = (p) => prims.includes(p);
    clipPlane(doc, { p: [0, b.min.y + y0, 0], n: [0, 1, 0], keep: 'above', cap: false, only });
    clipPlane(doc, { p: [0, b.min.y + y1, 0], n: [0, 1, 0], keep: 'below', cap: false, only });
    const live = out.listPrimitives().filter(only);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (turn * Math.PI) / 180);
    eachVertex(doc, (p, nn) => { p.set(p.x - c.x, p.y - b.min.y - y0 + H, p.z - c.z); if (mirror) { p.x = -p.x; if (nn) nn.x = -nn.x; } p.applyQuaternion(q); nn?.applyQuaternion(q); }, live);
    if (mirror) for (const pr of live) { const ix = pr.getIndices().getArray(); for (let t = 0; t < ix.length; t += 3) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; } pr.getIndices().setArray(ix); }
    const d = Math.max(seam, (y1 - y0) * 0.05), rb = radius(live, H, d), rt = radius(live, H + y1 - y0, d);
    slabs.push({ live, yb: H, yt: H + y1 - y0, rb, rt });
    made.push(...live);
    H += y1 - y0;
  }
  // the target radius: the first slab as scanned, then a straight taper from its top radius to taper x that at the top
  R0 = slabs[0].rt; const Y0 = slabs[0].yt, YT = top ?? H, target = (y) => R0 * (1 + (taper - 1) * Math.min(1, Math.max(0, y - Y0) / Math.max(1e-6, YT - Y0)));
  for (const S of slabs.slice(1)) {
    // (a cylinder: each slab scaled evenly to meet the target at its foot; its ruined top may have no wall to measure)
    const sb = target(S.yb) / S.rb, st = taper === 1 || !S.rt ? sb : target(S.yt) / S.rt;
    eachVertex(doc, (p) => { const t = (p.y - S.yb) / Math.max(1e-6, S.yt - S.yb), k = sb + (st - sb) * Math.min(1, Math.max(0, t)); p.x *= k; p.z *= k; }, S.live);
    joins.push(S.yb);
  }
  // the joins: the walls within seam drawn onto the join's outer radius (the target) and its inner radius (their mean)
  for (const Y of joins) {
    const ri = radius(made, Y, seam, -1), ro = target(Y);
    eachVertex(doc, (p, nn) => {
      const dy = Math.abs(p.y - Y); if (dy > seam || !nn) return;
      const r = Math.hypot(p.x, p.z); if (r < 1e-6) return;
      const f = (nn.x * p.x + nn.z * p.z) / r, want = f > 0.4 ? ro : f < -0.4 ? ri : null; if (!want) return;
      const w = 1 - dy / seam, k = (r + (want - r) * w * w * (3 - 2 * w)) / r; p.x *= k; p.z *= k;
    }, made);
  }
  // smooth: a plain shaft (its relief in the normal map): every normal set square to the cone (the scan's rings carry
  // normals bent by the parts cut away, which would draw a dark line at every join)
  if (smooth) {
    const slope = (R0 * (1 - taper)) / Math.max(1e-6, YT - Y0);
    eachVertex(doc, (p, nn) => { if (!nn) return; const r = Math.hypot(p.x, p.z); if (r < 1e-6) return; nn.set(p.x / r, p.y > Y0 ? slope : nn.y, p.z / r); }, made);
  }
  for (const n of nodes) { n.setMesh(null); n.dispose(); }
  sceneOf(doc).listChildren()[0].addChild(doc.createNode('stack').setMesh(out));
  if (top != null) clipPlane(doc, { p: [0, top, 0], n: [0, 1, 0], keep: 'below', cap: true, capUV });
  void root;
  return { joins, height: top ?? H };
}

// ---------- per-prop steps (pre.fn) ----------
// the wreck: bow (the source's -x, where the spars lie) to +z; the spars fallen beside the hull clipped to its footprint
// (the two masts stand inside it), the hull cut over its keel where the sediment met it, and the bow broken open (the
// belly is walked into from +z); 13.6 m long
function wreckPrep(doc, P) {
  rotate(doc, [0, 90, 0]);
  const isHull = (p) => /material0_1/.test(p.getMaterial()?.getName() || ''), hb = boundsOf(doc, primsOf(doc).filter(isHull)), L = hb.max.z - hb.min.z;
  const spar = (p) => !isHull(p), m = L * 0.01;
  for (const [n, q] of [[[1, 0, 0], hb.min.x - m], [[-1, 0, 0], -(hb.max.x + m)], [[0, 0, 1], hb.min.z + L * 0.02], [[0, 0, -1], -(hb.max.z - L * 0.12)]])
    clipPlane(doc, { p: n.map((x) => x * q), n, keep: 'above', cap: false, only: spar });
  // the beam: the hull's 3rd and 97th percentiles across (the spars fallen against its sides are few points)
  const xs = []; eachVertex(doc, (p) => xs.push(p.x), primsOf(doc).filter(isHull)); xs.sort((a, b) => a - b);
  const bx0 = xs[Math.floor(xs.length * 0.03)] - L * 0.012, bx1 = xs[Math.floor(xs.length * 0.97)] + L * 0.012;
  clipPlane(doc, { p: [bx0, 0, 0], n: [1, 0, 0], keep: 'above', cap: false });
  clipPlane(doc, { p: [bx1, 0, 0], n: [1, 0, 0], keep: 'below', cap: false });
  const yCut = hb.min.y + (hb.max.y - hb.min.y) * 0.05;
  clipPlane(doc, { p: [0, yCut, 0], n: [0, 1, 0], keep: 'above', cap: false });
  const zCut = hb.max.z - L * 0.15;
  clipPlane(doc, { p: [0, 0, zCut], n: [0.3, -0.25, 1], keep: 'below', cap: false });
  const b2 = boundsOf(doc, primsOf(doc).filter(isHull)), k = 13.6 / (b2.max.z - b2.min.z);
  scaleAll(doc, k);
  P.note = `hull cut ${((yCut - hb.min.y) * k).toFixed(2)} m over the keel, bow broken open ${(L * 0.15 * k).toFixed(1)} m back`;
}
// a tower of the three, 3.5 m across its base, turned so its doorway (the widest gap in the wall between 0.15 and 1.6 m,
// if it has one) faces +z; extras.top is the height of its broken rim (the 30th percentile of the highest wall points in
// 36 sectors round it: the cage stands among the broken stones)
function towerPrep(doc, P) {
  const b = boundsOf(doc), c = b.getCenter(new THREE.Vector3());
  moveAll(doc, new THREE.Vector3(-c.x, -b.min.y, -c.z));
  const b1 = boundsOf(doc), k = 3.5 / Math.max(b1.max.x - b1.min.x, b1.max.z - b1.min.z);
  scaleAll(doc, k);
  // the wall's area per 5-degree sector near the ground (outer surface only), smoothed over 15 degrees
  const S = 72, area = new Float64Array(S), v = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray();
    for (let t = 0; t < idx.length; t += 3) {
      A.fromArray(a.getElement(idx[t], v)); B.fromArray(a.getElement(idx[t + 1], v)); C.fromArray(a.getElement(idx[t + 2], v));
      const m = A.clone().add(B).add(C).divideScalar(3); if (m.y < 0.15 || m.y > 1.6 || Math.hypot(m.x, m.z) < 1.75 * 0.8) continue;
      area[Math.floor(((Math.atan2(m.x, m.z) + Math.PI) / (2 * Math.PI)) * S) % S] += B.clone().sub(A).cross(C.clone().sub(A)).length() / 2;
    }
  }
  const sm = Array.from(area, (_, i) => area[(i + S - 1) % S] + area[i] + area[(i + 1) % S]), med = [...sm].sort((a, b) => a - b)[S >> 1];
  const lo = sm.indexOf(Math.min(...sm)), ang = ((lo + 0.5) / S) * 2 * Math.PI - Math.PI;
  if (sm[lo] < med * 0.35) { rotate(doc, [0, (-ang * 180) / Math.PI, 0]); P.note = `doorway turned to +z (it was at ${((ang * 180) / Math.PI).toFixed(0)} deg)`; }
  else P.note = 'no doorway';
  const R = 1.75, top = new Array(36).fill(0);
  eachVertex(doc, (p) => { const r = Math.hypot(p.x, p.z); if (r > R * 0.6) { const s = Math.floor(((Math.atan2(p.x, p.z) + Math.PI) / (2 * Math.PI)) * 36) % 36; top[s] = Math.max(top[s], p.y); } });
  const sorted = [...top].sort((a, b) => a - b);
  P.extra = { ...(P.extra || {}), top: +sorted[Math.floor(36 * 0.3)].toFixed(3), topMax: +sorted[35].toFixed(3) };
}
// the lighthouse shaft (stacked and capped by pre.stack): turned door (+x) to +z, 15.5 m tall
function farLightPrep(doc, P) {
  rotate(doc, [0, -90, 0]);
  const b = boundsOf(doc); scaleAll(doc, 15.5 / (b.max.y - b.min.y));
  const b2 = boundsOf(doc);
  // the doorway's foot: the shaft's surface at +z on the ground
  let zf = 0; eachVertex(doc, (p) => { if (p.y < b2.min.y + 0.3 && Math.abs(p.x) < 0.3) zf = Math.max(zf, p.z); });
  P.points.door = new THREE.Vector3(0, b2.min.y, zf);
  P.points.top = new THREE.Vector3(0, b2.max.y, 0);
  P.note = [P.note, `shaft ${(b2.max.y - b2.min.y).toFixed(2)} m, base ${(b2.max.x - b2.min.x).toFixed(2)} m, painted from ${JSON.stringify(P.painted)}`].join('; ');
}
// the shack: its gabled room alone (x > -0.05 and z < 1.78 of the source: the hipped corner, the front room and the
// lean-to cut away, the cut walls capped with its boards), turned so the door in its gable end faces +z, x0.88 (3.4 m)
function shackPrep(doc, P) {
  for (const c of [{ p: [-0.05, 0, 0], n: [1, 0, 0], keep: 'above' }, { p: [0, 0, 1.78], n: [0, 0, 1], keep: 'below' }]) clipPlane(doc, { cap: true, capUV: { at: [0.3, 0.75], scale: 0.12 }, ...c });
  rotate(doc, [0, -90, 0]);
  scaleAll(doc, 0.88);
}
// the whale settled on the strand (source units, before any scaling): the ribs (and the thoracic vertebrae over them) stay;
// the flippers come down to the ribs' lowest point; the skull dips nose-down about the back of its crown until its jaws
// reach that level; the vertebrae behind the ribcage sink, more toward the tail, until the last reach it
function whalePrep(doc, P) {
  const nodes = meshNodes(doc), mat = (n) => n.getMesh().listPrimitives()[0]?.getMaterial()?.getName() || '';
  const box = (n) => boundsOf(doc, n.getMesh().listPrimitives());
  // stray scraps first (a few triangles each)
  for (const n of nodes) if (n.getMesh().listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0) < 40) { n.getMesh().dispose(); n.dispose(); }
  const live = meshNodes(doc), ribs = live.filter((n) => /^None\.(005|006|007|018)$/.test(mat(n)));
  const floor = Math.min(...ribs.map((n) => box(n).min.y));
  // flippers: each side's group raised so its lowest bone rests on the floor
  const flip = live.filter((n) => /^None\.(013|019|017)$/.test(mat(n)));
  for (const side of [-1, 1]) {
    const g = flip.filter((n) => Math.sign(box(n).getCenter(new THREE.Vector3()).x) === side); if (!g.length) continue;
    const lo = Math.min(...g.map((n) => box(n).min.y));
    moveAll(doc, new THREE.Vector3(0, floor - lo, 0), g.flatMap((n) => n.getMesh().listPrimitives()));
  }
  // the skull and jaws (one mesh): pitched nose-down about the top of its back end
  const skull = live.find((n) => mat(n) === 'None');
  if (skull) {
    const prims = skull.getMesh().listPrimitives(), sb = box(skull), piv = new THREE.Vector3(0, sb.max.y, sb.min.z);
    let lowFront = new THREE.Vector3(0, 1e9, 0); eachVertex(doc, (p) => { if (p.z > sb.max.z - (sb.max.z - sb.min.z) * 0.15 && p.y < lowFront.y) lowFront = p.clone(); }, prims);
    const a0 = Math.atan2(lowFront.y - piv.y, lowFront.z - piv.z), r = Math.hypot(lowFront.y - piv.y, lowFront.z - piv.z);
    const a1 = -Math.asin(Math.min(1, (piv.y - floor) / r));
    rotate(doc, [((a0 - a1) * 180) / Math.PI, 0, 0], prims, piv);
    P.note = `skull pitched ${(((a0 - a1) * 180) / Math.PI).toFixed(1)} deg`;
  }
  // the spine behind the ribcage: each vertebra lowered (rigidly) by a share that grows toward the tail
  const spine = live.filter((n) => /^None\.(008|010|011)$/.test(mat(n)));
  const zA = Math.min(...ribs.map((n) => box(n).min.z)), tail = spine.reduce((a, n) => (box(n).min.z < box(a).min.z ? n : a), spine[0]);
  const zT = box(tail).getCenter(new THREE.Vector3()).z, drop = box(tail).min.y - floor;
  for (const n of spine) {
    const z = box(n).getCenter(new THREE.Vector3()).z; if (z >= zA) continue;
    const t = Math.min(1, (zA - z) / (zA - zT)), k = t * t * (3 - 2 * t);
    moveAll(doc, new THREE.Vector3(0, -drop * k, 0), n.getMesh().listPrimitives());
  }
}
// the glass of a lamp (materials matching re) widened about its own vertical axis by k
function widenGlass(doc, re, k) {
  const prims = primsOf(doc).filter((p) => re.test(p.getMaterial()?.getName() || '')), c = boundsOf(doc, prims).getCenter(new THREE.Vector3());
  eachVertex(doc, (p, n) => { p.x = c.x + (p.x - c.x) * k; p.z = c.z + (p.z - c.z) * k; n?.set(n.x / k, n.y, n.z / k); }, prims);
}
// a cut out of its sand: a plane fitted (least squares) to the scan's points between r0 and r1 from the highest point (the
// object), the scan clipped lift metres above it, then only what lies within `keep` of the object is kept
async function groundCut(doc, P, { r0, r1, keep, lift, sand = null, sandTo = [0.34, 0.33, 0.31] }) {
  let top = new THREE.Vector3(0, -1e9, 0); eachVertex(doc, (p) => { if (p.y > top.y) top = p.clone(); });
  const b = boundsOf(doc), c = new THREE.Vector3((b.min.x + b.max.x) / 2, 0, (b.min.z + b.max.z) / 2);
  const o = P.pre.centreOnTop === false ? c : top;
  // y = a x + b z + c over the ring (normal equations)
  let n = 0, sx = 0, sz = 0, sy = 0, sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0;
  eachVertex(doc, (p) => { const d = Math.hypot(p.x - o.x, p.z - o.z); if (d < r0 || d > r1) return; n++; sx += p.x; sz += p.z; sy += p.y; sxx += p.x * p.x; szz += p.z * p.z; sxz += p.x * p.z; sxy += p.x * p.y; szy += p.z * p.y; });
  const M = new THREE.Matrix3().set(sxx, sxz, sx, sxz, szz, sz, sx, sz, n), inv = M.clone().invert(), r = new THREE.Vector3(sxy, szy, sy).applyMatrix3(inv);
  const N = new THREE.Vector3(-r.x, 1, -r.y).normalize(), y0 = r.x * o.x + r.y * o.z + r.z;
  clipPlane(doc, { p: [o.x, y0 + lift / N.y, o.z], n: N.toArray(), keep: 'above', cap: false });
  keepTris(doc, (A, B, C) => [A, B, C].every((v) => Math.hypot(v.x - o.x, v.z - o.z) < keep));
  // what is left of the sand (sand(r, g, b), 0-1) recoloured toward the wet shingle it will lie on (sandTo, sRGB 0-1),
  // keeping its relief: the heap's ragged edge then reads as the shore's own ground
  if (sand) {
    let n = 0;
    for (const tex of new Set(primsOf(doc).map((p) => p.getMaterial()?.getBaseColorTexture()).filter(Boolean))) {
      const img = await readImg(tex);
      for (let i = 0; i < img.data.length; i += 3) {
        const r = img.data[i] / 255, g = img.data[i + 1] / 255, b = img.data[i + 2] / 255, k = sand(r, g, b); if (!k) continue;
        const l = luma(r, g, b) / 0.78; n++;
        for (let q = 0; q < 3; q++) img.data[i + q] = Math.round((img.data[i + q] / 255 * (1 - k) + Math.min(1, sandTo[q] * l) * k) * 255);
      }
      await writeImg(tex, img.data, img.w, img.h);
    }
    P.note = `${n} sand texels recoloured`;
  }
  // level the cut: the plane's tilt taken out so the object stands upright on y = 0
  const q = new THREE.Quaternion().setFromUnitVectors(N, new THREE.Vector3(0, 1, 0));
  eachVertex(doc, (p, nn) => { p.sub(o).applyQuaternion(q); nn?.applyQuaternion(q); });
  P.note = [`ground plane over ${n} points, tilt ${((Math.acos(N.y) * 180) / Math.PI).toFixed(1)} deg`, P.note].filter(Boolean).join('; ');
}
// a cliff scan turned so its face (the area-weighted mean of its normals, in plan) looks toward +z
function faceForward(doc, P) {
  const acc = new THREE.Vector3(), v = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const prim of primsOf(doc)) {
    const a = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray();
    for (let t = 0; t < idx.length; t += 3) { A.fromArray(a.getElement(idx[t], v)); B.fromArray(a.getElement(idx[t + 1], v)); C.fromArray(a.getElement(idx[t + 2], v)); acc.add(B.clone().sub(A).cross(C.clone().sub(A))); }
  }
  const ang = Math.atan2(acc.x, acc.z);
  rotate(doc, [0, (-ang * 180) / Math.PI, 0]);
  P.note = `turned ${((-ang * 180) / Math.PI).toFixed(0)} deg (face was ${((ang * 180) / Math.PI).toFixed(0)} deg from +z)`;
}

// ---------- looks (materials, after decimation, before the textures are compressed) ----------
async function editImage(tex, fn) {
  const c = await readImg(tex), col = new Float64Array(c.data.length);
  for (let i = 0; i < col.length; i++) col[i] = c.data[i] / 255;
  fn(col, c);
  const u = Buffer.alloc(col.length); for (let i = 0; i < col.length; i++) u[i] = Math.max(0, Math.min(255, Math.round(col[i] * 255)));
  await writeImg(tex, u, c.w, c.h);
}
// moss and green growth taken to rime: where green leads, the colour goes toward a pale blue-grey frost, its brightness
// following the stone's own (so the relief stays)
function rimeCol(col, k) {
  for (let p = 0; p < col.length; p += 3) {
    const r = col[p], g = col[p + 1], b = col[p + 2], gr = Math.max(0, Math.min(1, (g - Math.max(r, b) + 0.005) / 0.06)) * k;
    if (!gr) continue;
    const l = luma(r, g, b), f = 0.42 + l * 1.25;
    col[p] = r * (1 - gr) + 0.78 * f * gr; col[p + 1] = g * (1 - gr) + 0.82 * f * gr; col[p + 2] = b * (1 - gr) + 0.9 * f * gr;
  }
}
// snow and hoar frost on what faces the sky: every triangle facing up (its normal's y over 0.35, fully over 0.8) is
// rasterised into its material's base colour and that patch taken toward frost (k: strength), the grain kept faintly;
// texels that a wall or an underside also uses (shared, tiling UVs) are left bare, so the frost never runs down the sides
async function frostUp(doc, { k = 0.8, color = [0.86, 0.9, 0.95] }) {
  for (const m of doc.getRoot().listMaterials()) {
    const tex = m.getBaseColorTexture(); if (!tex) continue;
    const img = await readImg(tex), w = img.w, h = img.h, wt = new Float32Array(w * h), bare = new Uint8Array(w * h), v = [], A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (const prim of primsOf(doc)) {
      if (prim.getMaterial() !== m) continue;
      const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices().getArray(); if (!uv) continue;
      for (let t = 0; t < idx.length; t += 3) {
        A.fromArray(pos.getElement(idx[t], v)); B.fromArray(pos.getElement(idx[t + 1], v)); C.fromArray(pos.getElement(idx[t + 2], v));
        const n = B.clone().sub(A).cross(C.clone().sub(A)).normalize(), f = smooth(0.35, 0.8, Math.abs(n.y)) * (n.y > 0 ? 1 : 0), side = n.y < 0.25;
        if (!f && !side) continue;
        const U = [0, 1, 2].map((q) => uv.getElement(idx[t + q], []));
        const ax = U[0][0] * w, ay = U[0][1] * h, bx = U[1][0] * w, by = U[1][1] * h, cx = U[2][0] * w, cy = U[2][1] * h, den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(den) < 1e-9) continue;
        for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(h - 1, Math.ceil(Math.max(ay, by, cy))); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
          const l1 = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / den, l2 = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / den;
          if (l1 >= -0.02 && l2 >= -0.02 && 1 - l1 - l2 >= -0.02) { if (side) bare[y * w + x] = 1; else wt[y * w + x] = Math.max(wt[y * w + x], f); }
        }
      }
    }
    for (let p = 0; p < w * h; p++) {
      const a = bare[p] ? 0 : wt[p] * k; if (!a) continue;
      const i = p * 3, l = luma(img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255), g = 0.82 + 0.5 * (l - 0.3);
      for (let q = 0; q < 3; q++) img.data[i + q] = Math.round((img.data[i + q] / 255 * (1 - a) + Math.min(1, color[q] * g) * a) * 255);
    }
    await writeImg(tex, img.data, w, h);
  }
}
// paint taken out of a carving: where red leads the other channels, the colour goes to the stone's grey (k: strength)
function deRed(col, k) {
  for (let p = 0; p < col.length; p += 3) {
    const r = col[p], g = col[p + 1], b = col[p + 2], e = smooth(0.02, 0.1, r - Math.max(g, b)) * k; if (!e) continue;
    const l = luma(r, g, b) * 0.95;
    col[p] = r + (l - r) * e; col[p + 1] = g + (l - g) * e; col[p + 2] = b + (l * 1.02 - b) * e;
  }
}
async function applyLook(doc, P) {
  const look = P.look || {}, root = doc.getRoot(), done = new Set();
  for (const e of root.listExtensionsUsed()) if (/KHR_materials_(transmission|volume|clearcoat|sheen|iridescence|anisotropy|specular|ior|dispersion|emissive_strength|pbrSpecularGlossiness|unlit)/.test(e.extensionName)) e.dispose();
  if (look.frost) await frostUp(doc, look.frost);
  for (const m of root.listMaterials()) {
    const name = m.getName() || '';
    if (look.glow && look.glow.test(name)) {
      // the emissive glass: lit from within, no textures (the game recolours or dims it)
      const gc = look.glowColor || [1, 0.56, 0.22];
      m.setName('glow').setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
      m.setBaseColorFactor([0.24, 0.2, 0.15, 1]).setEmissiveFactor(gc).setMetallicFactor(0).setRoughnessFactor(0.35).setAlphaMode('OPAQUE').setDoubleSided(true);
      continue;
    }
    m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]);
    if (!look.keepMR) m.setMetallicRoughnessTexture(null).setOcclusionTexture(null);
    for (const [re, metal, rough] of look.metal || []) if (re.test(name)) { m.setMetallicFactor(metal); if (rough != null) m.setRoughnessFactor(rough); }
    if (!look.metal && !look.keepMR) m.setMetallicFactor(0).setRoughnessFactor(0.9);
    if (m.getAlphaMode() === 'BLEND') m.setAlphaMode('OPAQUE');
    const tex = m.getBaseColorTexture();
    if (!tex || done.has(tex)) continue;
    const g = (look.grade || []).find(([re]) => re.test(name));
    if (g || look.rime || look.dered) {
      done.add(tex);
      const mask = uvMask(doc, m, ...(await sharp(Buffer.from(tex.getImage())).metadata().then((x) => [x.width, x.height])));
      await editImage(tex, (col) => { if (look.rime) rimeCol(col, look.rime); if (look.dered) deRed(col, look.dered); if (g) grade(col, g[1], mask); });
    }
  }
}

// The last step of a prop's prep (after loadProp's decimation): loose pieces dropped, then the fit (fit: feet on y = 0,
// centred on x/z, scaled to a height; hang: the top on y = 0), sunk by P.sink and shifted by P.shift; the same transform
// carried to the prop's marked points (P.points) and its bounds measured again.
function dropLoose(doc, frac) {
  const ps = pieces(doc), total = ps.reduce((a, c) => a + c.n, 0);
  const small = ps.filter((c) => c.n < frac * total);
  if (small.length) keepPieces(doc, (c) => c.n >= frac * total);
  return { pieces: small.length, dropped: small.reduce((a, c) => a + c.n, 0) };
}
function finish(doc, P) {
  const notes = [], F = P.fit || {};
  if (P.loose) { const r = dropLoose(doc, P.loose); if (r.pieces) notes.push(`${r.pieces} loose pieces (${r.dropped} tris) dropped`); }
  const b = boundsOf(doc);
  const s = F.height ? F.height / (b.max.y - b.min.y) : 1;
  const off = new THREE.Vector3(F.centre ? -(b.min.x + b.max.x) / 2 : 0, F.ground ? -b.min.y : F.hang ? -b.max.y : 0, F.centre ? -(b.min.z + b.max.z) / 2 : 0);
  const sh = new THREE.Vector3(...(P.shift || [0, 0, 0])).setY((P.shift?.[1] || 0) - (P.sink || 0));
  const to = (v) => v.add(off).multiplyScalar(s).add(sh);
  eachVertex(doc, (p) => to(p));
  P.points = Object.fromEntries(Object.entries(P.points || {}).map(([k, v]) => [k, to(v.clone())]));
  P.fitScale = s;
  if (P.sink) notes.push(`sunk ${P.sink} m`);
  const b2 = boundsOf(doc);
  P.bounds = { size: b2.getSize(new THREE.Vector3()).toArray() };
  P.note = [P.note, ...notes].filter(Boolean).join('; ');
}

async function prepare(P, file) {
  const doc = await io.read(file);
  await doc.transform(metalRough());
  bakeWorld(doc);
  const pre = P.pre || {};
  if (pre.drop) for (const n of meshNodes(doc)) if (pre.drop.test(n.getName())) n.setMesh(null);
  if (pre.dropMat) for (const p of primsOf(doc)) if (pre.dropMat.test(p.getMaterial()?.getName() || '')) p.dispose();
  await doc.transform(prune());
  if (pre.fn0) pre.fn0(doc, P);
  if (pre.ao) await bakeAO(doc, pre.ao);
  if (pre.paint) for (const [re, rects] of pre.paint) P.painted = await paintOut(doc, re, rects);
  if (pre.tile) await tileBands(doc, ...pre.tile);
  if (pre.atlas) await atlas(doc, pre.atlas);
  if (pre.lookFirst) await applyLook(doc, P);
  if (pre.keep) for (const n of meshNodes(doc)) if (!pre.keep.test(n.getName())) n.setMesh(null);
  await doc.transform(prune());
  if (pre.budget0) decimateGroups(doc, pre.budget0);
  if (pre.stack) { const r = stackTower(doc, P, pre.stack); P.note = [P.note, `stacked from ${pre.stack.segs.length} slabs, joins at ${r.joins.map((y) => y.toFixed(1)).join(', ')} of ${r.height.toFixed(1)}`].filter(Boolean).join('; '); await doc.transform(prune()); }
  if (pre.pad) await padIslands(doc, pre.pad, pre.erode || 0);
  if (pre.join) await doc.transform(join({ keepNamed: false }), weld());
  if (pre.rot) rotate(doc, pre.rot);
  if (pre.scale) scaleAll(doc, pre.scale);
  for (const c of [pre.cut, ...(pre.cuts || [])].filter(Boolean)) { const r = clipPlane(doc, c); P.note = [P.note, `cut: ${r.loops.length} loops${c.cap === false ? '' : ' capped'}`].filter(Boolean).join('; '); }
  if (pre.thin) { const n = dropThin(doc, ...pre.thin); P.note = [P.note, `${n} rope and net triangles dropped`].filter(Boolean).join('; '); }
  if (pre.budget) decimateGroups(doc, pre.budget);
  if (pre.tris) decimateAll(doc, pre.tris, 0.02);
  if (pre.fn) await pre.fn(doc, P);
  if (pre.each) decimateEach(doc, pre.each, pre.eachErr);
  if (pre.len) { const b = boundsOf(doc), s = b.getSize(new THREE.Vector3()), k = pre.len / Math.max(s.x, s.y, s.z); scaleAll(doc, k); for (const v of Object.values(P.points)) v.multiplyScalar(k); }
  // the prop's own budget (loadProp then leaves the triangles alone)
  P.before = triCount(doc);
  P.modes = decimateAll(doc, P.tris, P.err || 0.03);
  await doc.transform(prune());
  mkdirSync(TMP, { recursive: true });
  const out = path.join(TMP, P.key + '.glb');
  await io.write(out, doc);
  return out;
}

// ---------- run ----------
const ONLY = process.env.ONLY || '', KEYS = process.env.KEYS ? process.env.KEYS.split(',') : null;
await MeshoptSimplifier.ready;
mkdirSync(OUT_TEX, { recursive: true });
let texBytes = 0;
const LAYER = process.env.LAYER ? process.env.LAYER.split(',') : null, LX = process.env.LAYERX ? JSON.parse(process.env.LAYERX) : {};
const LDIR = process.env.OUT_DIR || OUT_TEX;
if (ONLY !== 'props' && !KEYS) {
  mkdirSync(LDIR, { recursive: true });
  if (!LAYER) for (const f of readdirSync(OUT_TEX)) if (f.endsWith('.webp')) rmSync(path.join(OUT_TEX, f));
  for (const L0 of LAYERS.filter((L) => !LAYER || LAYER.includes(L.id))) {
    const L = { ...L0, ...(LX[L0.id] || {}) };
    const b = await packRimeLayer(L, PH, LDIR);
    texBytes += b; console.log('layer', L.id.padEnd(10), L.src.padEnd(18), (b / 1024).toFixed(0) + ' KB');
  }
}

const meta = (P) => { try { return JSON.parse(readFileSync(path.join(SF, P.sf, 'meta.json'), 'utf8')); } catch (e) { return {}; } };
const loaded = [], report = [];
for (const P of ONLY === 'layers' ? [] : PROPS.filter((P) => !KEYS || KEYS.includes(P.key))) {
  P.src = P.ph || P.sf;
  const file = P.ph ? path.join(PH, P.ph, `${P.ph}_1k.gltf`) : path.join(SF, P.sf, 'model.glb');
  if (P.sf) { const m = meta(P); if (m.url) P.credit[2] = m.url; P.uid = m.uid; }
  P.points = {};
  P.file = await prepare(P, file);
  // texture sizes per material (an object { material regexp source: size }) or one size for all
  const sizes = (v, name) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v).find(([k]) => new RegExp(k).test(name))?.[1] : v);
  const per = typeof P.d === 'object' && !Array.isArray(P.d);
  P.prep = async (doc) => {
    if (!P.pre?.lookFirst) await applyLook(doc, P);
    if (per) for (const m of doc.getRoot().listMaterials()) { const n = sizes(P.n, m.getName()); if (n === 0) m.setNormalTexture(null); }
    if (!P.n && !per) for (const m of doc.getRoot().listMaterials()) m.setNormalTexture(null);
    finish(doc, P);
  };
  const L = { ...P, tris: 1e9, d: per ? 1024 : Array.isArray(P.d) ? Math.max(...P.d) : P.d, n: per ? 512 : Array.isArray(P.n) ? Math.max(...(P.n || [256])) : P.n || 256 };
  const { doc, after } = await loadProp(L), before = P.before, modes = P.modes;
  // the textures' final sizes (loadProp fits each map within one square; non-square and per-material sizes are set here)
  for (const m of doc.getRoot().listMaterials()) for (const [slot, t] of [['d', m.getBaseColorTexture()], ['n', m.getNormalTexture()]]) {
    if (!t) continue;
    const want = per ? sizes(slot === 'd' ? P.d : P.n, m.getName()) : slot === 'd' ? P.d : P.n;
    if (!want) continue;
    const [w, h] = Array.isArray(want) ? want : [want, want], cur = t.getSize();
    if (cur && (cur[0] !== w || cur[1] !== h)) t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).webp({ quality: slot === 'd' ? 80 : 84 }).toBuffer())).setMimeType('image/webp');
  }
  const pt = (k) => P.points[k].toArray().map((x) => +x.toFixed(3));
  if (P.points.door) P.extra = { ...(P.extra || {}), door: pt('door') };
  if (P.points.top) P.extra = { ...(P.extra || {}), top: pt('top')[1] };
  if (P.extra?.top && P.fitScale !== 1) P.extra.top = +(P.extra.top * P.fitScale).toFixed(3);
  loaded.push({ P, doc });
  report.push(`${P.key.padEnd(13)} ${P.src.padEnd(18)} ${String(before).padStart(7)} -> ${String(after).padStart(5)} tris (${modes}) size ${P.bounds.size.map((x) => x.toFixed(2)).join(' x ')}${P.extra ? ' ' + JSON.stringify(P.extra) : ''}${P.note ? ' [' + P.note + ']' : ''}`);
}
const sfAuthors = [...new Set(PROPS.filter((P) => P.sf).map((P) => P.credit[1]))].join(', ');
const outGlb = KEYS ? path.join(TMP, 'rime.test.glb') : OUT_GLB;
const res = ONLY === 'layers' ? { bytes: existsSync(OUT_GLB) ? statSync(OUT_GLB).size : 0, tris: '-', textures: '-' } : await writePack(loaded, outGlb, {
  credit: `Act V environment: Poly Haven (polyhaven.com, CC0), ambientCG (CC0) and Sketchfab models by ${sfAuthors} (CC-BY 4.0). Cut, decimated, re-centred, re-graded and re-encoded (WebP) for Skotos; see src/assets/rime/CREDITS.txt.`,
  license: 'CC0 / CC-BY-4.0'
});
console.log(report.join('\n'));
console.log(`${path.basename(outGlb)} ${(res.bytes / 1024).toFixed(0)} KB, ${res.tris} tris, ${res.textures} textures; layers ${(texBytes / 1024).toFixed(0)} KB`);

if (!KEYS && ONLY !== 'layers') {
  const log = existsSync(path.join(PH, 'dl_log.json')) ? JSON.parse(readFileSync(path.join(PH, 'dl_log.json'), 'utf8')) : {};
  const phMeta = (id) => { try { return JSON.parse(readFileSync(path.join(PH, id, 'meta.json'), 'utf8')); } catch (e) { return {}; } };
  const by = (id) => (log[id]?.authors?.length ? log[id].authors.join(', ') : phMeta(id).authors?.join(', ') || phMeta(id).design?.author || 'Poly Haven');
  const src = (L) => (L.acg ? `${L.src} by ${phMeta(L.src).design?.author || by(L.src)} - ${phMeta(L.src).url || 'https://ambientcg.com/a/' + L.src} (CC0)` : `${L.src} by ${by(L.src)} - https://polyhaven.com/a/${L.src} (CC0)`);
  writeFileSync(path.join(OUT_TEX, 'CREDITS.txt'), [
    'Skotos Act V environment assets (the Frozen Coast and the Farthest Light).',
    'Packed by tools/pack-rime.mjs. Tiling layers: resized, WebP-encoded, ambient occlusion baked into the colour, colour-graded',
    'to the act\'s cold palette (snow\'s dark prints lifted out, snow and seaCliff flattened of their broad blotches, the ice taken',
    'from green toward blue). Props: cut, decimated, re-centred, re-scaled, turned to face +z, re-graded and re-encoded (WebP);',
    'ambient occlusion baked into the colour and the metal/roughness maps dropped; snow and frost painted onto what faces the sky',
    '(the ship, boats, shack, cask, crate, Name-stone). Per prop: the Dalarö wreck\'s seabed meshes removed, its hull cut at the',
    'sediment line, the spars lying beside it trimmed and its bow broken open; the Gislinge boat\'s sail, mast, yard and rigging',
    'and the rowboat\'s oars removed; the three ruined towers\' texture sets atlased into one, their moss turned to frost, and',
    'each tower drawn up taller from bands of the scans (windows turned from storey to storey; the battlemented tower set on the',
    'intact tower\'s foot); the lighthouse cut down to its stone shaft (lantern room, galleries, railings, window, door and',
    'lights removed), the spray-painted hearts, the painted door outline, a stain and a seam painted out of its texture, the',
    'shaft drawn up from its own brick bands and capped; the medieval anchor\'s and the whale\'s texture sets atlased; the whale',
    'skeleton settled onto the ground (flippers lowered, skull tipped down, the spine lowered toward the tail) and bleached; the',
    'runestone\'s red paint taken out of its carving; the driftwood and the kelp cut out of the sand they were scanned on (the',
    'kelp\'s sand recoloured as wet shingle); the shack cut down to its gabled room; the Dutch ship\'s sails, ropes and nets',
    'removed and its hull cut below the waterline; the oil lamp\'s flame removed and its glass made an emissive "glow"; the',
    'cliffs and icicles kept as geometry only.',
    '', 'Tiling layers (src/assets/rime/*.webp) - CC0 (public domain):',
    ...LAYERS.map((L) => `  ${L.id}: ${src(L)}`),
    '', 'Props (src/assets/rime.glb):',
    ...PROPS.map((P) => (P.ph ? `  ${P.key}: ${P.ph} by ${by(P.ph)} - https://polyhaven.com/a/${P.ph} (CC0)` : `  ${P.key}: "${P.credit[0]}" by ${P.credit[1]} - ${P.credit[2]} (CC-BY 4.0, https://creativecommons.org/licenses/by/4.0/)${P.creditNote ? '; ' + P.creditNote : ''}`)),
    ''
  ].join('\n'));
}
if (process.env.REPORT) {
  const files = [OUT_GLB, ...readdirSync(OUT_TEX).filter((f) => f.endsWith('.webp')).map((f) => path.join(OUT_TEX, f))].filter(existsSync);
  writeFileSync(process.env.REPORT, JSON.stringify({ glb: { path: outGlb, bytes: res.bytes, tris: res.tris, textures: res.textures }, files: files.map((f) => ({ path: path.relative(ROOT, f), bytes: statSync(f).size })), props: loaded.map(({ P }) => ({ key: P.key, src: P.src, uid: P.uid, size: P.bounds.size.map((x) => +x.toFixed(2)), extra: P.extra || null, note: P.note || '' })) }, null, 1));
}
