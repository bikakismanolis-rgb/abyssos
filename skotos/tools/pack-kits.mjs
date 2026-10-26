// Packs selected KayKit (CC0, Kay Lousberg) models into one compact GLB per kit: src/assets/<kit>.glb
// Each model becomes a top-level node named after its file. usage: node tools/pack-kits.mjs <scratch dir with kk-* clones>
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, mergeDocuments, textureCompress, flatten, join, unpartition } from '@gltf-transform/functions';
import { existsSync, mkdirSync, statSync } from 'node:fs';

const SP = process.argv[2];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const KITS = {
  dungeon: {
    dir: 'kk-dun/addons/kaykit_dungeon_remastered/Assets/gltf',
    names: ['wall', 'wall_corner', 'wall_cracked', 'wall_broken', 'wall_arched', 'wall_pillar', 'wall_shelves', 'wall_gated', 'wall_doorway', 'wall_endcap', 'wall_Tsplit', 'wall_crossing',
      'floor_tile_large', 'floor_tile_large_rocks', 'floor_tile_big_grate', 'floor_tile_big_spikes', 'floor_dirt_large', 'floor_dirt_large_rocky', 'floor_tile_small', 'floor_tile_small_broken_A', 'floor_tile_small_weeds_A',
      'pillar', 'pillar_decorated', 'column', 'torch_mounted', 'torch_lit', 'candle_lit', 'candle_triple', 'candle_melted', 'candle_thin_lit',
      'barrel_large', 'barrel_small', 'barrel_small_stack', 'box_large', 'box_small', 'box_stacked', 'crates_stacked', 'chest', 'chest_gold', 'keg',
      'banner_patternA_red', 'banner_thin_red', 'banner_shield_red', 'banner_triple_red', 'banner_patternB_blue', 'rubble_large', 'rubble_half', 'sword_shield_broken', 'sword_shield',
      'shelf_small_candles', 'table_long_broken', 'table_medium_broken', 'table_small_decorated_A', 'stairs', 'stairs_wide', 'trunk_large_A', 'trunk_medium_B',
      'coin', 'coin_stack_small', 'coin_stack_medium', 'bottle_A_green', 'bottle_B_brown', 'keyring_hanging', 'barrier_column', 'stool', 'chair', 'bed_floor']
  },
  grave: {
    dir: 'kk-hal/addons/kaykit_halloween_bits/Assets/gltf',
    names: ['coffin', 'coffin_decorated', 'grave_A', 'grave_A_destroyed', 'grave_B', 'gravestone', 'gravemarker_A', 'gravemarker_B', 'crypt', 'arch', 'arch_gate',
      'fence', 'fence_broken', 'fence_pillar', 'fence_pillar_broken', 'fence_gate', 'lantern_standing', 'lantern_hanging', 'post_lantern', 'post_skull', 'post',
      'skull', 'skull_candle', 'ribcage', 'bone_A', 'bone_B', 'bone_C', 'shrine', 'shrine_candles', 'plaque_candles', 'candle_triple', 'candle', 'bench', 'bench_decorated', 'pillar',
      'tree_dead_large', 'tree_dead_large_decorated', 'tree_dead_medium', 'tree_dead_small', 'floor_dirt_grave', 'pumpkin_orange_jackolantern']
  },
  town: {
    dir: 'kk-hex/addons/kaykit_medieval_hexagon_pack/Assets/gltf',
    names: ['building_home_A_red', 'building_home_B_red', 'building_home_A_blue', 'building_home_B_yellow', 'building_home_A_green', 'building_blacksmith_red', 'building_tavern_blue', 'building_market_red',
      'building_well_blue', 'building_tower_A_red', 'building_windmill_red', 'building_church_blue', 'building_barracks_red', 'building_lumbermill_yellow',
      'tent', 'barrel', 'crate_A_big', 'crate_B_small', 'crate_long_A', 'sack', 'weaponrack', 'wheelbarrow', 'bucket_water', 'bucket_arrows', 'pallet', 'resource_lumber', 'resource_stone', 'target', 'flag_red', 'ladder',
      'fence_wood_straight', 'fence_wood_straight_gate', 'fence_stone_straight', 'wall_straight', 'wall_straight_gate', 'wall_corner_A_outside',
      'tree_single_A', 'tree_single_B', 'trees_A_large', 'trees_B_large', 'trees_B_medium', 'rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D', 'rock_single_E', 'hill_single_A', 'mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C']
  }
};

function find(dir, name) {
  for (const ext of ['.gltf.glb', '.glb', '.gltf']) {
    for (const sub of ['', '/buildings/red', '/buildings/blue', '/buildings/green', '/buildings/yellow', '/buildings/neutral', '/decoration/nature', '/decoration/props', '/tiles/base', '/tiles/coast', '/tiles/rivers', '/tiles/roads']) {
      const p = `${SP}/${dir}${sub}/${name}${ext}`;
      if (existsSync(p)) return p;
    }
  }
  return null;
}

mkdirSync(new URL('../src/assets', import.meta.url), { recursive: true });
for (const [kit, def] of Object.entries(KITS)) {
  const out = new Document();
  out.createBuffer();
  const scene = out.createScene('kit');
  const missing = [];
  for (const name of def.names) {
    const path = find(def.dir, name);
    if (!path) { missing.push(name); continue; }
    const src = await io.read(path);
    // wrap the model's scene roots in one named node
    const before = new Set(out.getRoot().listNodes());
    const map = mergeDocuments(out, src);
    const srcScene = src.getRoot().getDefaultScene() || src.getRoot().listScenes()[0];
    const holder = out.createNode(name);
    for (const n of srcScene.listChildren()) holder.addChild(map.get(n));
    scene.addChild(holder);
    for (const s of out.getRoot().listScenes()) if (s !== scene) s.dispose();
  }
  for (const b of out.getRoot().listBuffers().slice(1)) b.dispose();
  for (const acc of out.getRoot().listAccessors()) acc.setBuffer(out.getRoot().listBuffers()[0]);
  out.getRoot().setDefaultScene(scene);
  await out.transform(dedup(), prune(), weld(), quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }));
  const file = new URL(`../src/assets/${kit}.glb`, import.meta.url);
  await io.write(file.pathname, out);
  console.log(kit, 'models', def.names.length - missing.length, 'missing', missing.join(',') || '-', 'bytes', statSync(file).size, 'textures', out.getRoot().listTextures().map((t) => t.getName() || t.getURI()).join(','));
}
