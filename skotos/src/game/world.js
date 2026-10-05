// Zones: building, entering and leaving, monster packs, interactables, shadow gates.
import * as THREE from 'three';
import { G, later } from './state.js';
import { R, setAtmosphere, addLight, clearLights, updateCamera, removeLight, shake } from '../gfx/gfx.js';
import { genForest, genCrypt, genTown } from '../world/gen.js';
import { genPass, genHalls } from '../world/gen2.js';
import { genWeep, genHeart } from '../world/gen3.js';
import { buildLevel, propMesh, runeDisc, WIND, act3Prop, setAutumn } from '../world/build.js';
import { GridMap } from '../world/map.js';
import { ATMOS } from '../world/atmos.js';
import { kitMesh } from '../gfx/kits.js';
import { tex } from '../gfx/textures.js';
import { envMesh, envChest, hasEnv, loadPack } from '../gfx/env.js';
import { loadFolk } from '../gfx/people.js';
import { loadCreatures } from '../gfx/creatures.js';
import { setEmitters, setAmbient, clearFX, glowBurst, puff, sparks, ring, P, explosion, FX, sapBurst } from '../gfx/fx.js';
import { Actor, spawnMonster, spawnNpc, createPlayer, rollAffixes, monsterLevel } from './actors.js';
import { PACKS, DIFFS, MONSTERS, PACK_LEAD, packKinds } from './data.js';
import { startDrips, stopDrips } from './sap.js';
import { makeItem } from './items.js';
import { dropGold, dropItem, dropGlobe, clearPickups } from './pickups.js';
import { clearProjs } from './projectiles.js';
import { emit, on } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { RNG, rand, angleTo } from '../core/util.js';
import { t } from '../i18n/i18n.js';

export const ZONES = {
  town: { level: 1, music: 'town', ambient: 'town', atmos: 'town' },
  forest: { level: 1, music: 'forest', ambient: 'forest', atmos: 'forest' },
  crypt: { level: 4, music: 'crypt', ambient: 'crypt', atmos: 'crypt' },
  pass: { level: 10, music: 'pass', ambient: 'snow', atmos: 'pass', act: 2, pack: 'deep' },
  halls: { level: 13, music: 'halls', ambient: 'halls', atmos: 'halls', act: 2, pack: 'deep' },
  // Act III: the Still Wood west of Whitecliff and the root caves of the First Oak (each has an Autumn atmosphere and ambient)
  weep: { level: 16, music: 'weep', ambient: 'weep', atmos: 'weep', act: 3, pack: 'wood' },
  heart: { level: 19, music: 'heart', ambient: 'heart', atmos: 'heart', act: 3, pack: 'wood' },
  gate: { level: 1, music: 'gate', ambient: 'gate', atmos: 'gate' }
};
// beacons that have answered Whitecliff's: Arna's hill after Act I, Deepstone after Act II, and after Act III the
// Evergreen's old beacon-tree far in the west, green-gold, that no hand lit (offsets from our beacon)
export const FAR_BEACONS = [{ dx: -40, dz: -60, y: 14 }, { dx: 46, dz: -58, y: 17 }, { dx: -44, dz: -32, y: 8, color: 0xb8e060 }];
// a far-off beacon: a glow seen through the fog (sprites ignore it), breathing like a fire
export function farFire(p, color = 0xffa040) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color, blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true }));
  s.position.set(p.x, p.y, p.z); s.scale.setScalar(7);
  s.onBeforeRender = () => { const k = 1 + Math.sin(performance.now() * 0.007) * 0.08 + Math.sin(performance.now() * 0.019) * 0.05; s.scale.setScalar(7 * k); };
  return s;
}
// the zone's extra assets (Act II's stone, snow and lava; Act III's wood, its Evergreen and its beasts), fetched the
// first time it is visited
export function zoneReady(id) {
  const p = ZONES[id]?.pack;
  if (!p) return Promise.resolve();
  return p === 'wood' ? Promise.all([loadPack('wood'), loadFolk('grove'), loadCreatures('act3')]) : Promise.all([loadPack(p), loadFolk(), loadCreatures('act2')]);
}

function seedFor(id) {
  G.hero.seeds ||= {};
  if (!G.hero.seeds[id]) G.hero.seeds[id] = (Math.random() * 1e9) | 0;
  return G.hero.seeds[id];
}

// ---------- building ----------
function createZone(id, o = {}) {
  const seed = o.seed ?? seedFor(id);
  let L;
  // the town keeps the far fires' hilltops clear of the woods beyond its edge (see build.js townBeyond)
  if (id === 'town') { L = genTown(); L.farFires = FAR_BEACONS.map((F) => ({ x: L.beacon.x + F.dx, z: L.beacon.z + F.dz })); }
  else if (id === 'forest') L = genForest(seed);
  else if (id === 'crypt') L = genCrypt(seed);
  else if (id === 'pass') L = genPass(seed);
  else if (id === 'halls') L = genHalls(seed);
  else if (id === 'weep') L = genWeep(seed);
  else if (id === 'heart') L = genHeart(seed);
  else if (id === 'gate') L = (o.tier % 2 ? genCrypt(seed, { rooms: 12, mh: 30 }) : genForest(seed, { h: 120 }));
  const map = new GridMap(L.w, L.h, L.cells, L.low);
  const lvl = buildLevel(L, R.quality);
  const z = { id, L, map, lvl, level: o.level ?? ZONES[id].level, actors: [], pickups: [], interact: [], packs: [], seed, tier: o.tier || 0, extra: [] };
  // breakables
  for (const p of lvl.breakables) {
    const mesh = p.t === 'urn' ? propMesh('urn')
      : hasEnv(p.t) ? envMesh(p.t, (p.t === 'crate' ? 1.15 : 0.95) * (p.s || 1))
      : kitMesh('dungeon', p.t === 'barrel' ? 'barrel_small' : 'box_small', 0.42 * (p.s || 1));
    mesh.position.set(p.x, 0, p.z); mesh.rotation.y = rand.range(0, 6.28);
    const a = new Actor({ x: p.x, z: p.z, team: 'foe', kind: 'prop', radius: 0.45, hp: 1, def: { flesh: 'wood' } });
    a.prop = true; a.mesh = mesh; a.propType = p.t;
    a.remove = function () { if (this.removed) return; this.removed = true; R.scene.remove(this.mesh); };
    z.actors.push(a); z.extra.push(mesh);
  }
  // waypoint
  if (L.spots.waypoint) {
    const w = L.spots.waypoint, m = propMesh('waypoint'); m.position.set(w.x, 0, w.z);
    const disc = runeDisc(1.3); disc.position.set(w.x, 0.17, w.z);
    z.extra.push(m, disc); z.wpDisc = disc;
    z.interact.push({ kind: 'waypoint', x: w.x, z: w.z, r: 2.2, prompt: 'wp.title', use: () => emit('openPanel', 'waypoints') });
    z.emit = (z.emit || []).concat([{ x: w.x, y: 0.4, z: w.z, type: 'bluefire', s: 0.5 }]);
  }
  // shrines and chests
  for (const s of L.spots.shrines || []) {
    const m = propMesh('shrine'); m.position.set(s.x, 0, s.z); z.extra.push(m);
    const kind = rand.pick(['fury', 'speed', 'fortune', 'shield']);
    const light = { x: s.x, y: 2.4, z: s.z, color: 0xffe0a0, intensity: 10, range: 7, flicker: 0.2 };
    L.lights.push(light);
    const it = { kind: 'shrine', shrine: kind, x: s.x, z: s.z, r: 2, prompt: 'use', mesh: m, light };
    it.use = () => useShrine(z, it);
    z.interact.push(it);
    z.emit = (z.emit || []).concat([{ x: s.x, y: 2.25, z: s.z, type: 'fire', s: 0.45, shrine: it }]);
  }
  for (const c of L.spots.chests || []) {
    const m = hasEnv('chest') ? envChest(c.rare ? 1.15 : 1) : kitMesh('dungeon', c.rare ? 'chest_gold' : 'chest', 0.55); m.position.set(c.x, 0, c.z); m.rotation.y = rand.range(-0.4, 0.4);
    z.extra.push(m);
    const it = { kind: 'chest', rare: c.rare, x: c.x, z: c.z, r: 1.8, prompt: 'open', mesh: m };
    it.use = () => openChest(z, it);
    z.interact.push(it);
  }
  // exits
  for (const e of L.exits) z.interact.push({ kind: 'exit', to: e.to, x: e.x, z: e.z, r: 2.4, prompt: e.label, locked: e.locked, use: () => takeExit(z, e) });
  // packs spawn when the hero comes near
  L.packs.forEach((p, i) => z.packs.push(Object.assign({ id: id + i, spawned: false }, p)));
  // bosses
  if (id === 'forest') z.bossSpot = { kind: 'weaver', x: L.boss.x, z: L.boss.z - 2 };
  if (id === 'crypt') z.bossSpot = { kind: 'barrowLord', x: L.boss.x, z: L.boss.z };
  if (id === 'pass') { z.bossSpot = { kind: 'stonewarden', x: L.boss.x, z: L.boss.z }; z.gateDoors = deepGateDoors(L.gate, !!G.hero.flags.stonewarden); z.extra.push(z.gateDoors); }
  if (id === 'halls') {
    z.bossSpot = { kind: 'moltenKing', x: L.boss.x, z: L.boss.z };
    const s = L.spots.npcs.brokka, a = spawnNpc('brokka', s.x, s.z, s.r); a.home = s.r; z.actors.push(a);
    z.interact.push({ kind: 'npc', npc: 'brokka', actor: a, x: s.x, z: s.z, r: 2.4, prompt: 'talk', use: () => emit('talk', 'brokka', a) });
  }
  if (id === 'weep' || id === 'heart') act3Zone(z);
  // town people and the stash
  if (id === 'town') {
    const N = L.spots.npcs;
    for (const k of ['wayfarer', 'smith', 'healer']) {
      const s = N[k], a = spawnNpc(k, s.x, s.z, s.r); a.home = s.r; z.actors.push(a);
      z.interact.push({ kind: 'npc', npc: k, actor: a, x: s.x, z: s.z, r: 2.4, prompt: 'talk', use: () => emit('talk', k, a) });
    }
    N.villagers.forEach((s, i) => { const a = spawnNpc('villager', s.x, s.z, s.r); a.home = s.r; a.bark = i; z.actors.push(a); z.interact.push({ kind: 'npc', npc: 'villager', bark: i, actor: a, x: s.x, z: s.z, r: 2, prompt: 'talk', use: () => emit('talk', 'villager', a) }); });
    z.interact.push({ kind: 'stash', x: 36, z: 41.5, r: 2, prompt: 'stash.title', use: () => emit('openPanel', 'stash') });
    const h = G.hero, lit = [h.act1 >= 0 || h.quest >= 5, (h.act2 ?? -1) >= 0 || h.quest >= 10, (h.act3 ?? -1) >= 0 || h.quest >= 16];
    FAR_BEACONS.forEach((F, i) => {
      if (!lit[i]) return;
      const b = L.beacon, far = { x: b.x + F.dx, y: F.y, z: b.z + F.dz };
      L.lights.push({ x: far.x, y: far.y, z: far.z, color: F.color ?? 0xff8a30, intensity: 200, range: 60, flicker: 0.3 });
      z.emit = (z.emit || []).concat([{ x: far.x, y: far.y - 2, z: far.z, type: 'beacon', s: 1.2 }]);
      z.extra.push(farFire(far, F.color));
    });
  }
  // actors were added to the scene on creation; keep them parked until we enter
  for (const a of z.actors) if (a.avatar) R.scene.remove(a.avatar.group);
  return z;
}

// ---------- entering and leaving ----------
export function leaveZone() {
  const z = G.zone; if (!z) return;
  R.scene.remove(z.lvl.group);
  for (const m of z.extra) R.scene.remove(m);
  for (const a of z.actors) { if (a.avatar) R.scene.remove(a.avatar.group); if (a.mesh) R.scene.remove(a.mesh); }
  for (const p of z.pickups) { if (p.mesh) R.scene.remove(p.mesh); if (p.beam) R.scene.remove(p.beam); }
  // pets don't follow across zones
  for (const a of z.actors) if (a.pet && !a.dead) { a.dead = true; a.remove(); }
  clearProjs(); clearFX(); clearLights();
  if (G.player?.avatar) R.scene.remove(G.player.avatar.group);
  G.bossActor = null;
}
export function enterZone(id, o = {}) {
  leaveZone();
  let z = G.zones[id];
  if (!z || o.fresh) { if (z) disposeZone(z); z = G.zones[id] = createZone(id, o); }
  G.zone = z; G.actors = z.actors; G.pickups = z.pickups;
  R.scene.add(z.lvl.group);
  for (const m of z.extra) R.scene.add(m);
  for (const a of z.actors) { if (a.avatar) R.scene.add(a.avatar.group); if (a.mesh) R.scene.add(a.mesh); }
  for (const p of z.pickups) { if (p.mesh) R.scene.add(p.mesh); if (p.beam) R.scene.add(p.beam); }
  for (const l of z.L.lights) addLight(l);
  setEmitters(z.lvl.emitters.concat(z.emit || []));
  const Z = ZONES[id];
  // Act III: the Still Wood holds its breath until the First Autumn (wind, dry leaves, lanterns, heartbeat all follow)
  const act3 = Z.act === 3, aut = act3 && !!G.hero.flags.autumn, v = aut ? 'Autumn' : '';
  setAmbient(Z.ambient + (act3 ? v : ''));
  setAtmosphere(ATMOS[Z.atmos + (act3 ? v : '')]);
  WIND.uSnow.value = id === 'pass' ? 1 : 0;
  WIND.uWind.value = act3 && !aut ? 0 : 1;
  setAutumn(aut ? 1 : 0);
  FX.beat = aut ? 0 : 1;
  z.heartProp?.userData.setBeat(aut ? 0 : 1);
  Audio.mood({ autumn: aut });
  Audio.music(Z.music);
  if (id === 'weep' && !aut) startDrips(z.L.weepers); else stopDrips();
  if (act3) act3Presence(z);
  // where the hero appears
  let at = o.at;
  if (!at || at === 'start') at = z.L.start;
  else if (at === 'waypoint') at = z.L.spots.waypoint ? { x: z.L.spots.waypoint.x, z: z.L.spots.waypoint.z + 2 } : z.L.start;
  else if (typeof at === 'string') {
    const e = z.L.exits.find((x) => x.to === at), L = z.L;
    // step in from the exit, north or south of it (the town's west road to the woods: east of it)
    const side = e && id === 'town' && e.to === 'weep';
    at = !e ? L.start : side ? { x: e.x + (e.x > L.w / 2 ? -2.5 : 2.5), z: e.z } : { x: e.x, z: e.z + (e.z > L.h / 2 ? -2.5 : 2.5) };
  }
  at = z.map.nearestFloor(at.x, at.z);
  if (!G.player) G.player = createPlayer(G.hero, at.x, at.z);
  const pl = G.player;
  pl.x = at.x; pl.z = at.z; pl.kx = pl.kz = 0; pl.act = null; pl.y = 0;
  R.scene.add(pl.avatar.group);
  if (pl.trail) { pl.trail.dispose(); pl.trail = null; }
  if (id === 'town' && G.portal) spawnTownPortal(z);
  updateCamera(0, pl.x, pl.z, true);
  z.map.reveal(pl.x, pl.z, 12);
  if (!G.hero.wps.includes(id) && id !== 'gate' && z.L.spots.waypoint && id === 'town') G.hero.wps.push(id);
  emit('zoneEnter', id, z);
  return z;
}
function disposeZone(z) {
  for (const a of z.actors) a.remove();
  for (const p of z.pickups) { if (p.mesh) R.scene.remove(p.mesh); if (p.light) removeLight(p.light); }
  z.lvl.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { if (!o.geometry.userData?.shared) o.geometry.dispose(); } });
}

// ---------- packs ----------
const tmp = [];
export function updatePacks() {
  const z = G.zone, pl = G.player; if (!z || !pl) return;
  const D = DIFFS[G.hero.diff];
  for (const p of z.packs) {
    if (p.spawned) continue;
    if (Math.hypot(p.x - pl.x, p.z - pl.z) > 32) continue;
    p.spawned = true;
    spawnPack(z, p, D);
  }
  if (z.bossSpot && !z.bossSpawned && Math.hypot(z.bossSpot.x - pl.x, z.bossSpot.z - pl.z) < 30) {
    z.bossSpawned = true;
    const first = z.bossSpot.kind === 'weaver' || z.bossSpot.kind === 'stonewarden' || z.bossSpot.kind === 'silverhorn';
    const b = spawnMonster(z.bossSpot.kind, z.bossSpot.x, z.bossSpot.z, { level: Math.max(z.level + (first ? 2 : 3), G.hero.level + 1) });
    b.rot = Math.PI * 0.0 + angleTo(b.x, b.z, pl.x, pl.z);
    z.actors.push(b); z.boss = b;
  }
  // Act III: the Lady's voice in the still trees, once per place (never after the First Autumn)
  if (z.voices && !G.hero.flags.autumn) for (const v of z.voices) if (!v.done && Math.hypot(v.x - pl.x, v.z - pl.z) < v.r) { v.done = true; emit('voice', v.key, v); }
}
function spawnPack(z, p, D) {
  const tag = z.id === 'gate' ? 'gate' : p.tag;
  let n = Math.round(p.n * (0.85 + D.elite * 0.15));
  let elite = p.elite;
  if (!elite && Math.random() < 0.06 * D.elite) elite = 'champion';
  const weights = PACKS[tag] || PACKS.goblins;
  const pick = () => rand.weighted(weights);
  // Act III packs are built round a lead creature (the den's bear, the grove's Rootwarden, the Mourners): it comes first
  const lead = PACK_LEAD[tag];
  let leadTaken = 0;
  const spots = [];
  const place = () => { for (let k = 0; k < 12; k++) { const a = rand.range(0, 6.28), r = rand.range(0.5, 3.2); const x = p.x + Math.sin(a) * r, y = p.z + Math.cos(a) * r; if (z.map.walkable(x, y) && !spots.some((s) => Math.hypot(s.x - x, s.z - y) < 0.9)) { spots.push({ x, z: y }); return { x, z: y }; } } return z.map.nearestFloor(p.x, p.z); };
  const gateMul = z.id === 'gate' ? Math.pow(1.14, z.tier) : 1;
  const opts = { packId: p.id, gateMul };
  const nAff = G.hero.diff >= 3 ? 3 : G.hero.diff >= 2 ? 2 : 1;
  if (elite === 'champion') {
    let kind = pick() === 'spiderling' ? 'spider' : pick();
    if (MONSTERS[kind].big) kind = z.id === 'pass' || z.id === 'halls' ? 'stoneborn' : z.id === 'weep' || z.id === 'heart' ? 'rootsworn' : 'ash';
    const aff = rollAffixes(nAff + 1);
    const cnt = aff.includes('horde') ? 5 : 3;
    for (let i = 0; i < cnt; i++) { const s = place(); z.actors.push(spawnMonster(kind, s.x, s.z, Object.assign({ elite: 'champion', affixes: aff }, opts))); }
    n = Math.max(0, n - cnt - 1);
  } else if (elite === 'rare') {
    let kind = p.tag === 'troll' ? 'troll' : lead ? lead[0] : pick(); if (kind === 'spiderling') kind = 'spider';
    if (lead) leadTaken = 1;
    const aff = rollAffixes(nAff + 2);
    const s = place(); z.actors.push(spawnMonster(kind, s.x, s.z, Object.assign({ elite: 'rare', affixes: aff }, opts)));
    // big brutes come alone
    const minions = MONSTERS[kind].big ? 0 : (aff.includes('horde') ? 6 : 3);
    for (let i = 0; i < minions; i++) { const q = place(); z.actors.push(spawnMonster(kind, q.x, q.z, Object.assign({ minion: true }, opts))); }
    n = Math.max(0, n - minions - 1);
  }
  const kinds = lead ? packKinds(tag, n + leadTaken, rand.weighted).slice(leadTaken) : null;
  for (let i = 0; i < n; i++) {
    const s = place(); const kind = kinds ? kinds[i] : pick();
    const m = spawnMonster(kind, s.x, s.z, opts);
    if (MONSTERS[kind].rises && Math.random() < 0.5) { m.dormant = true; m.avatar?.play('bonePile', 1); }
    z.actors.push(m);
  }
}

// ---------- interactables ----------
export function nearestInteract() {
  const z = G.zone, pl = G.player; if (!z || !pl) return null;
  let best = null, bd = 1e9;
  for (const it of z.interact) {
    if (it.used) continue;
    const d = Math.hypot(it.x - pl.x, it.z - pl.z);
    if (d < it.r && d < bd) { bd = d; best = it; }
  }
  return best;
}
function useShrine(z, it) {
  it.used = true;
  const pl = G.player;
  const dur = it.shrine === 'fortune' ? 60 : 30;
  pl.buffs['shrine' + it.shrine[0].toUpperCase() + it.shrine.slice(1)] = dur;
  ring(it.x, it.z, 4, 0xffe0a0, 0.7); glowBurst(it.x, 2.2, it.z, 0xffe0a0, 40, 5, 0.35, 0.8);
  if (it.light) removeLight(it.light);
  z.emit = (z.emit || []).filter((e) => e.shrine !== it);
  setEmitters(z.lvl.emitters.concat(z.emit));
  Audio.sfx('shrine');
  emit('toast', t('shrine.' + it.shrine) + ': ' + t('shrine.' + it.shrine + '.d'));
}
function openChest(z, it) {
  it.used = true;
  Audio.sfx('chest');
  const L = Math.max(z.level, G.hero.level), D = DIFFS[G.hero.diff];
  sparks(it.x, 0.8, it.z, 20, 0xffd070, 4);
  addLight({ x: it.x, y: 1.5, z: it.z, color: 0xffd070, intensity: 25, range: 8, life: 1.2, fade: 1.2 });
  if (it.mesh?.userData.lid) swingLid(it.mesh.userData.lid);
  else if (it.mesh) { it.mesh.rotation.x = -0.15; it.mesh.position.y = 0.02; }
  const n = it.rare ? rand.int(2, 4) : rand.int(1, 2);
  for (let i = 0; i < n; i++) later(0.15 + i * 0.15, () => dropItem(it.x, it.z, makeItem(L, { elite: it.rare, mf: G.stats.mf, legMul: D.leg, rar: it.rare && i === 0 ? 2 : undefined })));
  for (let i = 0; i < (it.rare ? 4 : 2); i++) later(0.1 + i * 0.1, () => dropGold(it.x, it.z, Math.round((8 + L * 3) * rand.range(0.7, 1.3) * D.gold)));
}
// the scanned chest's lid swings back on its hinge
function swingLid(lid) {
  let t = 0;
  const step = () => { t = Math.min(1, t + 0.06); lid.rotation.x = -1.9 * (1 - (1 - t) ** 3); if (t < 1) later(0.016, step); };
  step();
}
function takeExit(z, e) {
  if (e.locked && !G.hero.flags[e.locked]) {
    emit('toast', t('locked')); Audio.sfx('denied');
    const why = { weaver: 'd.weaver', stonewarden: 'd.gateShut', act1: 'd.mountainShut', act2: 'd.woodShut', hart: 'd.rootShut' }[e.locked];
    if (why) emit('say', why);
    return;
  }
  emit('travel', e.to, { at: z.id });
}
on('propBroken', (a) => {
  const x = a.x, z = a.z;
  Audio.sfx('break', { x, z });
  puff(x, 0.5, z, 6, a.propType === 'urn' ? 0x6a4a34 : 0x5a4030, 0.7, 0.8, 0.8);
  for (let i = 0; i < 12; i++) P({ add: false, x, y: 0.5, z, vx: rand.range(-3, 3), vy: rand.range(2, 5), vz: rand.range(-3, 3), life: 0.9, size: 0.14, size1: 0.1, color: a.propType === 'urn' ? 0x8a5a3a : 0x6a4a2e, alpha: 1, grav: 16 });
  if (Math.random() < 0.4) dropGold(x, z, Math.round((2 + G.zone.level * 1.2) * rand.range(0.6, 1.4)));
  if (Math.random() < 0.05) dropItem(x, z, makeItem(Math.max(G.zone.level, G.hero.level), { mf: G.stats.mf }));
  if (Math.random() < 0.06) dropGlobe(x, z);
  if (a.mesh) R.scene.remove(a.mesh);
});

// ---------- the Great Gate of Deepstone: two slabs of rune-cut stone that swing inward once the Stonewarden falls ----------
const gateMat = { m: null };
function deepGateDoors(g, open) {
  gateMat.m ||= new THREE.MeshLambertMaterial({ color: 0x4a4844 });
  const grp = new THREE.Group();
  grp.position.set(g.x, 0, g.z + 1.2);
  const runeMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  grp.userData.leaves = [];
  for (const sx of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(sx * 2.8, 0, 0);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 8.4, 0.7), gateMat.m); slab.position.set(-sx * 1.4, 4.2, 0); slab.castShadow = true;
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.6, 0.05), runeMat); rune.position.set(-sx * 1.4, 4.4, 0.37);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 16), runeMat); ring.position.set(-sx * 1.4, 4.4, 0.38);
    hinge.add(slab, rune, ring); grp.add(hinge); grp.userData.leaves.push({ hinge, sx });
    if (open) hinge.rotation.y = sx * 1.45;
  }
  return grp;
}
export function openDeepGate(z) {
  const d = z?.gateDoors; if (!d) return;
  let t = 0;
  const step = () => { t = Math.min(1, t + 0.012); for (const l of d.userData.leaves) l.hinge.rotation.y = l.sx * 1.45 * (1 - (1 - t) ** 2); if (t < 1) later(0.016, step); };
  later(0.5, () => { Audio.sfx('door'); shakeGate(); step(); });
}
function shakeGate() { const g = G.zone.L.gate; puff(g.x, 1, g.z + 1.5, 14, 0x8a8a86, 2.5, 3, 2); }

// ---------- Act III: the Weeping Woods and the Heartwood ----------
// z.act3 keeps what the story moves: { npcs: { elati, linden }, gate, whiteTree, sapling, heart, thorns[], cocoons[] }
const put = (z, o, x, zz, ry = 0) => { o.position.set(x, 0, zz); o.rotation.y = ry; z.extra.push(o); return o; };
function act3Zone(z) {
  const L = z.L, F = G.hero.flags, aut = !!F.autumn, A = z.act3 = { npcs: {} };
  // the Amber Tears: memories you can touch. The three verses of the Long Sorrow (and the nursery's) stay spent once seen;
  // the small ones glow again on another day
  for (const sp of L.spots.tears || []) {
    const spent = !!((sp.story || sp.id === 'nursery') && F['tear_' + sp.id]);
    sp.dim = spent;
    const mesh = put(z, act3Prop('tear', sp), sp.x, sp.z, sp.r || 0);
    const it = { kind: 'tear', id: sp.id, story: !!sp.story, x: sp.x, z: sp.z, r: 2.3, prompt: 'tear.touch', mesh, spot: sp, used: spent };
    it.use = () => emit('tear', it, z);
    z.interact.push(it);
  }
  const npc = (k, s) => {
    const a = spawnNpc(k, s.x, s.z, s.r); a.home = s.r; z.actors.push(a);
    const it = { kind: 'npc', npc: k, actor: a, x: s.x, z: s.z, r: 2.4, prompt: 'talk', use: () => emit('talk', k, a) };
    z.interact.push(it);
    A.npcs[k] = { a, it };
  };
  // where the Lady speaks: each place once, nearer and more tender the deeper you go
  const voice = (list, pre) => list.slice(0, 4).map((c, i) => ({ x: c.x, z: c.z, r: (c.r || 6) + 2.5, key: pre + (i + 2) }));
  if (z.id === 'weep') {
    const d = L.spots.deer; if (d) put(z, act3Prop('deer', { r: d.r }), d.x, d.z);
    const g = L.spots.rootGate;
    if (g) { A.gate = put(z, act3Prop('rootGate'), g.x, g.z); A.gate.userData.setOpen(!!F.hart); if (F.hart) z.map.open(g.cells); }
    // Silverhorn guards the Glade of Stones; once it has fallen it is the white tree there, and the gate stays open
    if (F.hart) { const w = F.hartAt || { x: L.spots.glade.x, z: L.spots.glade.z + 1 }; A.whiteTree = put(z, act3Prop('whiteTree'), w.x, w.z); }
    else z.bossSpot = { kind: 'silverhorn', x: L.boss.x, z: L.boss.z };
    // Elati and Old Linden in the Lanternglade; after the First Autumn Linden is a tree and the Lady's sapling grows at her feet
    npc('elati', L.spots.npcs.elati); npc('linden', L.spots.npcs.linden);
    const ln = L.spots.npcs.linden;
    A.sapling = act3Prop('sapling'); A.sapling.position.set(ln.x, 0, ln.z); A.sapling.rotation.y = ln.r || 0;
    const cl = (L.clearings || []).filter((c) => c.kind !== 'nook').sort((a, b) => b.z - a.z);
    z.voices = voice(cl, 'd.lady.w').concat([{ x: L.spots.glade.x, z: L.spots.glade.z, r: L.spots.glade.r + 7, key: 'd.lady.w6' }]);
  } else {
    A.heart = z.heartProp = put(z, act3Prop('heart', { beat: aut ? 0 : 1 }), L.spots.heart.x, L.spots.heart.z);
    // three thorn walls seal the rootway, each fed by a Heartroot in a chamber before it
    A.thorns = (L.thorns || []).map((t, i) => {
      if (aut || F['thorn' + i]) { z.map.open(t.cells); return null; }
      const m = act3Prop('thorns', t); z.extra.push(m);
      const n = spawnMonster('heartroot', t.node.x, t.node.z, { level: monsterLevel(z.level) });
      n.wall = i; n.guards = ['hollowed']; z.actors.push(n);
      return m;
    });
    const H = L.spots.heart;
    if (!aut) {
      // sleepers in amber in the four alcoves, for the Lady to wake (pushed back against the wall, clear of the Heartroots)
      A.cocoons = (L.spots.alcoves || []).map((s) => { const a = Math.atan2(s.x - H.x, s.z - H.z); return put(z, act3Prop('cocoon'), s.x + Math.sin(a) * 1.3, s.z + Math.cos(a) * 1.3, a + Math.PI); });
      z.bossSpot = { kind: 'amaranthe', x: L.boss.x, z: L.boss.z };
    } else A.sapling = put(z, act3Prop('sapling'), L.boss.x, L.boss.z);
    npc('elati', L.spots.npcs.elati);
    const ch = (L.chambers || []).slice().sort((a, b) => b.z - a.z);
    z.voices = voice(ch, 'd.lady.h').concat([{ x: H.x, z: H.z, r: 26, key: 'd.lady.h6' }]);
  }
}
// who is where depends on the story so far; zones are kept between visits, so this runs on every entry (and at the
// First Autumn). In the wood Elati is at the Lanternglade until she goes down to the Heartwood, and back after the Autumn.
export function act3Presence(z) {
  const A = z?.act3; if (!A) return;
  const F = G.hero.flags, aut = !!F.autumn, here = G.zone === z;
  const want = z.id === 'weep' ? { elati: G.hero.quest < 14 || aut, linden: !aut } : { elati: !aut };
  for (const k in A.npcs) {
    const n = A.npcs[k], on = !!want[k], inZ = z.actors.includes(n.a);
    if (on && !inZ) { z.actors.push(n.a); z.interact.push(n.it); if (here) R.scene.add(n.a.avatar.group); }
    if (!on && inZ) { z.actors.splice(z.actors.indexOf(n.a), 1); z.interact.splice(z.interact.indexOf(n.it), 1); R.scene.remove(n.a.avatar.group); }
  }
  if (z.id === 'weep' && A.sapling) showExtra(z, A.sapling, aut);
}
function showExtra(z, o, on) {
  const i = z.extra.indexOf(o);
  if (on && i < 0) { z.extra.push(o); if (G.zone === z) R.scene.add(o); }
  if (!on && i >= 0) { z.extra.splice(i, 1); R.scene.remove(o); }
}
// something that grows where it stands (the white tree, the Lady's sapling)
export function growProp(z, o, x, zz, dur = 2.5, ry = 0) {
  put(z, o, x, zz, ry); if (G.zone === z) R.scene.add(o);
  const s1 = o.scale.x; let t = 0;
  o.scale.setScalar(0.01);
  const step = () => { t = Math.min(1, t + 0.016 / dur); o.scale.setScalar(s1 * Math.max(0.01, 1 - (1 - t) ** 3)); if (t < 1) later(0.016, step); };
  step();
  return o;
}
// the Root Gate: Silverhorn has fallen, and the roots draw back into the jambs
export function openRootGate(z) {
  const g = z?.act3?.gate, s = z?.L.spots.rootGate; if (!g || !s) return;
  z.map.open(s.cells); emit('mapChanged');
  later(0.4, () => {
    Audio.sfx('thornWither', { x: s.x, z: s.z }); Audio.sfx('door', { vol: 0.6 }); shake(0.35);
    puff(s.x, 1.5, s.z + 0.5, 16, 0x5a4630, 2.5, 3, 2); sapBurst(s.x, s.z + 1.2, 1.4);
    const step = () => { if (G.zone !== z) { g.userData.setOpen(true); return; } if (!g.userData.open(0.016)) later(0.016, step); };
    step();
  });
}
// a Heartroot is dead: its thorn wall withers and the rootway beyond opens
export function witherWall(z, i) {
  const t = z?.L.thorns?.[i]; if (!t) return;
  z.map.open(t.cells); emit('mapChanged');
  z.act3?.thorns?.[i]?.userData.wither();
  Audio.sfx('thornWither', { x: t.x, z: t.z }); shake(0.2);
  puff(t.x, 1, t.z, 14, 0x4a2a1a, 2, 2.5, 1.6); sapBurst(t.x, t.z, 1);
}
// The First Autumn, live (the Lady has fallen): the wind comes back, the heartbeat stops, the dry leaves spread, the
// lanterns go out. Later visits read the flag (enterZone).
export function firstAutumn(z, dur = 6) {
  const A0 = ATMOS[z.id], A1 = ATMOS[z.id + 'Autumn'];
  stopDrips();
  Audio.mood({ autumn: true }); Audio.sfx('windGust');
  let t = 0, amb = false;
  const step = () => {
    if (G.zone !== z) return;
    t = Math.min(1, t + 0.016 / dur);
    const k = t * t * (3 - 2 * t);
    setAutumn(k); WIND.uWind.value = k; FX.beat = 1 - k; z.heartProp?.userData.setBeat(1 - k);
    if (A0 && A1) setAtmosphere(mixAtmos(A0, A1, k));
    if (t >= 0.35 && !amb) { amb = true; setAmbient(ZONES[z.id].ambient + 'Autumn'); }
    if (t < 1) later(0.016, step); else act3Presence(z);
  };
  step();
}
const _ca = new THREE.Color(), _cb = new THREE.Color();
function mixAtmos(a, b, k) {
  const o = {};
  for (const key in b) {
    const x = a[key] ?? b[key], y = b[key];
    if (typeof y !== 'number') o[key] = y;
    else if (key === 'fog' || key === 'sky' || key === 'ground' || key === 'moon' || key === 'heroColor') o[key] = _ca.set(x).lerp(_cb.set(y), k).getHex();
    else o[key] = x + (y - x) * k;
  }
  return o;
}
// the Lady calls the Mourners out of the alcoves: the amber sleepers there crack open
on('cocoonBurst', (s) => {
  const list = G.zone?.act3?.cocoons; if (!list || !s) return;
  let best = null, bd = 1e9;
  for (const c of list) { const d = Math.hypot(c.position.x - s.x, c.position.z - s.z); if (d < bd && c.visible) { bd = d; best = c; } }
  best?.userData.burst?.();
});

// ---------- town portal ----------
let portalObj = null;
export function spawnTownPortal(z) {
  if (portalObj) { R.scene.remove(portalObj.mesh); portalObj = null; }
  const w = z.L.spots.waypoint, x = w.x - 3.2, zz = w.z;
  const mesh = new THREE.Group();
  const ring1 = propMesh('portal'); mesh.add(ring1);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshBasicMaterial({ color: 0x3a80ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.y = 1.25; mesh.add(disc);
  mesh.position.set(x, 0, zz);
  R.scene.add(mesh);
  portalObj = { mesh, x, z: zz };
  z.extra.push(mesh);
  z.interact = z.interact.filter((i) => i.kind !== 'portal');
  z.interact.push({ kind: 'portal', x, z: zz, r: 2, prompt: 'wp.back', use: () => { const P0 = G.portal; G.portal = null; z.interact = z.interact.filter((i) => i.kind !== 'portal'); R.scene.remove(mesh); z.extra.splice(z.extra.indexOf(mesh), 1); emit('travel', P0.zone, { at: { x: P0.x, z: P0.z }, portal: true }); } });
  addLight({ x, y: 1.3, z: zz, color: 0x4a90ff, intensity: 16, range: 8, flicker: 0.2 });
}
export function updatePortalFx(dt) {
  if (portalObj && G.zone?.id === 'town') { portalObj.mesh.children[1].rotation.z += dt; if (Math.random() < 0.5) P({ x: portalObj.x + rand.range(-0.6, 0.6), y: 1.25 + rand.range(-0.8, 0.8), z: portalObj.z, vy: 0.4, life: 0.6, size: 0.12, size1: 0.02, color: 0x90c0ff }); }
  if (G.zone?.wpDisc) G.zone.wpDisc.rotation.z += dt * 0.3;
}
export { WIND };
