// Zones: building, entering and leaving, monster packs, interactables, shadow gates.
import * as THREE from 'three';
import { G, later } from './state.js';
import { R, setAtmosphere, addLight, clearLights, updateCamera, removeLight, shake } from '../gfx/gfx.js';
import { genForest, genCrypt, genTown } from '../world/gen.js';
import { genPass, genHalls } from '../world/gen2.js';
import { genWeep, genHeart } from '../world/gen3.js';
import { genAshfield, genForge } from '../world/gen4.js';
import { buildLevel, propMesh, runeDisc, WIND, act3Prop, setAutumn, act4Prop, setHeat, setNight, setFlueGlow } from '../world/build.js';
import { GridMap } from '../world/map.js';
import { ATMOS } from '../world/atmos.js';
import { kitMesh } from '../gfx/kits.js';
import { tex } from '../gfx/textures.js';
import { envMesh, envChest, hasEnv, loadPack } from '../gfx/env.js';
import { loadFolk } from '../gfx/people.js';
import { loadCreatures, creatureCount } from '../gfx/creatures.js';
import { setEmitters, setAmbient, clearFX, glowBurst, puff, sparks, ring, P, explosion, FX, sapBurst, fireStream } from '../gfx/fx.js';
import { Actor, spawnMonster, spawnNpc, createPlayer, rollAffixes, monsterLevel, ghostly } from './actors.js';
import { PACKS, DIFFS, MONSTERS, PACK_LEAD, packKinds } from './data.js';
import { startDrips, stopDrips } from './sap.js';
import { addLightPool, removeLightPool, cradlePoint } from './light.js';
import { startFlues, stopFlues, setFlueHeat, flues, BREATH } from './forge.js';
import { makeItem } from './items.js';
import { dropGold, dropItem, dropGlobe, clearPickups } from './pickups.js';
import { clearProjs } from './projectiles.js';
import { emit, on } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { RNG, rand, angleTo, clamp } from '../core/util.js';
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
  // Act IV: the Wayfarers' Road north of Whitecliff to the Anvil Gate, and Karthax's forge inside the Black Anvil (each has a
  // state after the Unmaking: the Field under stars, then at dawn; the Forge cold)
  ashfield: { level: 22, music: 'ashfield', ambient: 'ashfall', atmos: 'ashfield', act: 4, pack: 'cinder' },
  forge: { level: 25, music: 'forge', ambient: 'forge', atmos: 'forge', act: 4, pack: 'cinder' },
  gate: { level: 1, music: 'gate', ambient: 'gate', atmos: 'gate' }
};
// beacons that have answered Whitecliff's: Arna's hill after Act I, Deepstone after Act II, and after Act III the
// Evergreen's old beacon-tree far in the west, green-gold, that no hand lit (offsets from our beacon). After the Unmaking
// they are dark until the new fire, and then a fourth burns far to the north, on the Dark Beacon (seed: no hilltop of ours)
export const FAR_BEACONS = [{ dx: -40, dz: -60, y: 14 }, { dx: 46, dz: -58, y: 17 }, { dx: -44, dz: -32, y: 8, color: 0xb8e060 }, { dx: 0, dz: -72, y: 12, color: 0xfff0c0, seed: true }];
// a far-off beacon: a glow seen through the fog (sprites ignore it), breathing like a fire (userData.k: a scene may shrink it)
export function farFire(p, color = 0xffa040) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color, blending: THREE.AdditiveBlending, fog: false, depthWrite: false, transparent: true }));
  s.position.set(p.x, p.y, p.z); s.scale.setScalar(7);
  s.onBeforeRender = () => { const k = 1 + Math.sin(performance.now() * 0.007) * 0.08 + Math.sin(performance.now() * 0.019) * 0.05; s.scale.setScalar(7 * k * (s.userData.k ?? 1)); };
  return s;
}
// the zone's extra assets, fetched the first time it is visited: Act II's stone, snow and lava with the dwarves and the
// deep's beasts; Act III's wood with its Evergreen and beasts; Act IV's cinder with the ash people, the Forge's creatures,
// and Brokka and Durgan (folk) and Elati and Amaranthe (grove) for the camps and the keepers' statues. The Forge also
// takes the deep's lava and slabs.
const READY = { deep: { folk: ['folk'], creatures: 'act2' }, wood: { folk: ['grove'], creatures: 'act3' }, cinder: { folk: ['ash', 'folk', 'grove'], creatures: 'act4' } };
const zonePacks = (id) => { const p = ZONES[id]?.pack; return p ? (id === 'forge' ? [p, 'deep'] : [p]) : []; };
export function zoneReady(id, onPart) {
  const R0 = READY[ZONES[id]?.pack];
  if (!R0) return Promise.resolve();
  const part = (pr) => pr.then((v) => { onPart?.(); return v; });
  return Promise.all([...zonePacks(id).map((k) => part(loadPack(k))), ...R0.folk.map((f) => part(loadFolk(f))), loadCreatures(R0.creatures, onPart)]);
}
// how many parts zoneReady reports (0: nothing to fetch)
export const zoneParts = (id) => { const R0 = READY[ZONES[id]?.pack]; return R0 ? zonePacks(id).length + R0.folk.length + creatureCount(R0.creatures) : 0; };

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
  if (id === 'town') {
    L = genTown(); L.farFires = FAR_BEACONS.filter((F) => !F.seed).map((F) => ({ x: L.beacon.x + F.dx, z: L.beacon.z + F.dz }));
    // the north road to the Field of Ash opens with the fire that has to go north (the Cradle, at the end of q17)
    for (const e of L.exits) if (e.to === 'ashfield') e.locked = 'fireTaken';
  }
  else if (id === 'forest') L = genForest(seed);
  else if (id === 'crypt') L = genCrypt(seed);
  else if (id === 'pass') L = genPass(seed);
  else if (id === 'halls') L = genHalls(seed);
  else if (id === 'weep') L = genWeep(seed);
  else if (id === 'heart') L = genHeart(seed);
  else if (id === 'ashfield') L = genAshfield(seed);
  else if (id === 'forge') L = genForge(seed);
  else if (id === 'gate') L = (o.tier % 2 ? genCrypt(seed, { rooms: 12, mh: 30 }) : genForest(seed, { h: 120 }));
  const map = new GridMap(L.w, L.h, L.cells, L.low);
  const lvl = buildLevel(L, R.quality);
  const z = { id, L, map, lvl, level: o.level ?? ZONES[id].level, actors: [], pickups: [], interact: [], packs: [], seed, tier: o.tier || 0, extra: [], emit4: [] };
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
  if (ZONES[id].act === 4) act4Zone(z);
  // town people and the stash
  if (id === 'town') {
    const N = L.spots.npcs;
    z.townNpc = {};
    for (const k of ['wayfarer', 'smith', 'healer']) {
      const s = N[k], a = spawnNpc(k, s.x, s.z, s.r); a.home = s.r; z.actors.push(a);
      const it = { kind: 'npc', npc: k, actor: a, x: s.x, z: s.z, r: 2.4, prompt: 'talk', use: () => emit('talk', k, a) };
      z.interact.push(it); z.townNpc[k] = { a, it };
    }
    N.villagers.forEach((s, i) => { const a = spawnNpc('villager', s.x, s.z, s.r); a.home = s.r; a.bark = i; z.actors.push(a); z.interact.push({ kind: 'npc', npc: 'villager', bark: i, actor: a, x: s.x, z: s.z, r: 2, prompt: 'talk', use: () => emit('talk', 'villager', a) }); });
    z.interact.push({ kind: 'stash', x: 36, z: 41.5, r: 2, prompt: 'stash.title', use: () => emit('openPanel', 'stash') });
    townFires(z);
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
  clearProjs(); clearFX(); clearLights(); stopFlues();
  if (z.run) endBellows(z, false);
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
  setEmitters(zoneEmitters(z));
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
  // Act IV: the night or the heat, the lit lamps and their light, the flues, who is where
  if (Z.act === 4) act4Enter(z);
  else if (id === 'town') townFires(z);
  // where the hero appears
  let at = o.at;
  if (!at || at === 'start') at = z.L.start;
  else if (at === 'waypoint') at = z.L.spots.waypoint ? { x: z.L.spots.waypoint.x, z: z.L.spots.waypoint.z + 2 } : z.L.start;
  else if (at === 'waypoint2') at = z.L.spots.camp2 ? { x: z.L.spots.camp2.x, z: z.L.spots.camp2.z + 2 } : z.L.start;
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
  // Silverhorn rises only once the Long Sorrow is known (the bellow after the third Tear sets quest 13)
  const asleep = z.bossSpot?.kind === 'silverhorn' && G.hero.quest < 13;
  if (z.bossSpot && !z.bossSpawned && !asleep && Math.hypot(z.bossSpot.x - pl.x, z.bossSpot.z - pl.z) < 30) {
    z.bossSpawned = true;
    const first = z.bossSpot.kind === 'weaver' || z.bossSpot.kind === 'stonewarden' || z.bossSpot.kind === 'silverhorn' || z.bossSpot.kind === 'ivar';
    const b = spawnMonster(z.bossSpot.kind, z.bossSpot.x, z.bossSpot.z, { level: Math.max(z.level + (first ? 2 : 3), G.hero.level + 1) });
    b.rot = Math.PI * 0.0 + angleTo(b.x, b.z, pl.x, pl.z);
    // Karthax waits under the slag until the story has brought the shards to him (story.js 'karthaxArrive')
    if (b.kind === 'karthax') { b.holdWake = true; b.hidden = true; b.y = -3.4; b.rot = angleTo(b.x, b.z, z.L.spots.anvil?.x ?? b.x, (z.L.spots.anvil?.z ?? b.z) + 9); }
    z.actors.push(b); z.boss = b;
  }
  // the voices that speak once per place: Act III's Lady in the still trees (until the First Autumn), Act IV's Voice in
  // the Cradle between the lamps (until Ivar is at rest; v.need: only after that lamp burns)
  const F = G.hero.flags, act = ZONES[z.id]?.act, mute = act === 3 ? F.autumn || F.ladyDown : act === 4 ? F.ivar || F.crownUnmade : false;
  if (z.voices && !mute) for (const v of z.voices) if (!v.done && (!v.need || F[v.need]) && Math.hypot(v.x - pl.x, v.z - pl.z) < v.r) { v.done = true; emit('voice', v.key, v); }
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
    if (MONSTERS[kind].big) kind = z.id === 'pass' || z.id === 'halls' ? 'stoneborn' : z.id === 'weep' || z.id === 'heart' ? 'rootsworn' : z.id === 'ashfield' || z.id === 'forge' ? 'ashSpear' : 'ash';
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
  setEmitters(zoneEmitters(z));
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
    // (the north road: only a hero at Act III's end is sent to Isarn about it)
    const why = { weaver: 'd.weaver', stonewarden: 'd.gateShut', act1: 'd.mountainShut', act2: 'd.woodShut', hart: 'd.rootShut', fireTaken: G.hero.flags.act3 ? 'd.roadShut' : 'd.northShut', ivar: 'd.anvilShut' }[e.locked];
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
    if (F.hart) { const w = F.hartAt || { x: L.spots.glade.x, z: L.spots.glade.z + 1 }; A.whiteTree = put(z, act3Prop('whiteTree'), w.x, w.z); echoAt(z, 'silverhorn', w.x, w.z); }
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
      // fallen but the Autumn not yet seen (the game closed during her last words): story.js replays them on entry
      if (!F.ladyDown) z.bossSpot = { kind: 'amaranthe', x: L.boss.x, z: L.boss.z };
    } else { A.sapling = put(z, act3Prop('sapling'), L.boss.x, L.boss.z); echoAt(z, 'amaranthe', L.boss.x, L.boss.z); }
    npc('elati', L.spots.npcs.elati);
    const ch = (L.chambers || []).slice().sort((a, b) => b.z - a.z);
    z.voices = voice(ch, 'd.lady.h').concat([{ x: H.x, z: H.z, r: 26, key: 'd.lady.h6' }]);
  }
}
// a fallen boss's tree keeps the memory of the fight: touched, it lets an amber echo of the boss rise to be fought again
// (story.js 'echo'); like the small Tears, once a day
const ECHO_PROMPT = { silverhorn: 'echo.hart', amaranthe: 'echo.lady', ivar: 'echo.ivar', karthax: 'echo.karthax' };
export function echoAt(z, boss, x, zz) {
  const it = { kind: 'echo', boss, x, z: zz, r: 2.8, prompt: ECHO_PROMPT[boss] };
  it.use = () => emit('echo', it, z);
  z.interact.push(it);
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

// ---------- Act IV: the Field of Ash and the Ashen Forge ----------
// z.act4 keeps what the story moves: { lamps[], altars[], braziers[], bellows[], npcs{}, gate, lastLamp, hook, plug, anvil, mouth }
const LAMP_C = 0xffb060, GOLD = 0xffd080;
// what the Field shows: ash falling until the Unmaking, then the stars, and dawn once the new fire burns at Whitecliff
export const nightMode = () => { const F = G.hero.flags; return F.newFire ? 'dawn' : F.crownUnmade ? 'stars' : 'ash'; };
// the Forge's heat: 0 banked, one stage for each Great Bellows that has breathed, -1 cold after the Unmaking
export const forgeHeat = () => (G.hero.flags.crownUnmade ? -1 : G.hero.flags.heat || 0);
export const bellowsDone = () => [0, 1, 2].filter((i) => G.hero.flags['bellows' + i]).length;
// a point on a placed prop, in the world (a lamp's flame)
const _w = new THREE.Vector3();
function worldAt(o, p) { o.updateMatrixWorld(true); return o.localToWorld(_w.set(p.x || 0, p.y || 0, p.z || 0)); }
// the extra fires a zone shows: the level's, the shrines' and waypoints', and Act IV's lit braziers, fire-pits and far fires
export const zoneEmitters = (z) => z.lvl.emitters.concat(z.emit || [], z.emit4 || []);
function setEmit(z, key, e, quiet) {
  z.emit4 = (z.emit4 || []).filter((x) => x.key !== key);
  if (e) z.emit4.push(Object.assign(e, { key }));
  if (!quiet) refreshEmit(z);
}
function refreshEmit(z) { if (G.zone === z) setEmitters(zoneEmitters(z)); }
// an NPC of the act: talks (story.js 'talk'), may walk (walkTo), comes and goes with the story (act4Presence)
function npc4(z, key, kind, s, o = {}) {
  const a = spawnNpc(kind, s.x, s.z, s.r ?? 0); a.home = s.r ?? 0; z.actors.push(a);
  const it = { kind: 'npc', npc: kind, actor: a, x: s.x, z: s.z, r: 2.4, prompt: 'talk', use: () => emit('talk', kind, a) };
  a.it = it; a.key = key;
  z.interact.push(it);
  if (o.kneel) { a.still = true; a.avatar?.play('kneel', 1); }
  return (z.act4.npcs[key] = { a, it, spot: { x: s.x, z: s.z, r: s.r ?? 0 }, kneel: !!o.kneel });
}
// Isarn's lantern: gold while the brow-stone is in it, white (Arna's own fire) once it has torn out, dark when it sleeps
export function isarnLantern(a, k) {
  if (!a?.avatar || a.lantern === k) return;
  a.lantern = k;
  a.avatar.hold('R', 'lanternStaff', k === 'white' ? { lamp: 0xfff4e0, glow: 2.8 } : k === 'dark' ? { lamp: 0x24201c, glow: 0.05 } : {});
}

function act4Zone(z) {
  const L = z.L, S = L.spots, F = G.hero.flags, A = z.act4 = { lamps: [], altars: [], braziers: [], bellows: [], npcs: {} };
  if (z.id === 'ashfield') {
    // the waylamps: five that remember (Arna, then Ivar and the boy) and the odd one that only gives light
    for (const sp of [...(S.lamps || []), ...(S.waylamps || [])]) {
      const mesh = put(z, act4Prop('waylamp'), sp.x, sp.z, sp.r - Math.PI / 2);
      const it = { kind: 'waylamp', id: sp.id, memory: !!sp.memory, x: sp.x, z: sp.z, r: 2.4, lightR: sp.lightR || 8, mesh, spot: sp, lit: false, prompt: 'lamp.light' };
      it.use = () => lampUse(z, it);
      it.snuff = () => setLamp(z, it, false);
      it.relight = () => setLamp(z, it, true);
      z.interact.push(it); A.lamps.push(it);
    }
    // the Altars of the Wish in their hollows (story.js 'altar': a keeper's voice, then the offer)
    for (const sp of S.altars || []) {
      const r = sp.r || 0, mesh = put(z, act4Prop('altar'), sp.x, sp.z, r);
      const it = { kind: 'altar', id: sp.id, x: sp.x + Math.sin(r) * 1.7, z: sp.z + Math.cos(r) * 1.7, r: 2.4, prompt: 'altar.touch', mesh };
      it.use = () => emit('altar', it, z);
      z.interact.push(it); A.altars.push(it);
    }
    // Ivar's three braziers on the rim of the Anvil Gate plaza: put out in his dark, lit again by a 1 s touch
    A.braziers = (S.braziers || []).map((b, i) => {
      const mesh = put(z, act4Prop('brazier'), b.x, b.z);
      const it = { kind: 'brazier', i, x: b.x, z: b.z, r: 2.3, lightR: 6, mesh, lit: false, prompt: 'brazier.light' };
      it.snuff = () => setBrazier(z, it, false);
      it.relight = () => setBrazier(z, it, true);
      it.use = () => { if (!it.lit) touch(1, it, mesh.userData.fireY || 1.2, () => { setBrazier(z, it, true); Audio.sfx('lampLight', { x: it.x, z: it.z }); }); };
      z.interact.push(it); return it;
    });
    // the Last Lamp in the middle of the plaza: Ivar's lantern hangs there once he is at rest (a light, not a lamp to eat)
    const ll = S.lastLamp;
    if (ll) { A.lastLamp = put(z, act4Prop('lastLamp'), ll.x, ll.z, Math.PI / 2); A.lastLampIt = { kind: 'lastLamp', x: ll.x, z: ll.z, r: 0, lightR: 7, lit: false, used: true }; z.interact.push(A.lastLampIt); }
    if (L.gate) { A.gate = put(z, act4Prop('anvilGate'), L.gate.x, L.gate.z); A.gate.userData.setOpen(!!F.ivar); if (F.ivar) z.map.open(L.gate.cells); }
    if (S.hook) A.hook = put(z, act4Prop('hook'), S.hook.x, S.hook.z, S.hook.r || 0);
    // the second waypoint, at Elati's camp at the mouth of the Graves
    if (S.camp2) {
      const w = S.camp2, m = propMesh('waypoint'); m.position.set(w.x, 0, w.z);
      const disc = runeDisc(1.3); disc.position.set(w.x, 0.17, w.z);
      z.extra.push(m, disc); z.wpDisc2 = disc;
      z.interact.push({ kind: 'waypoint', x: w.x, z: w.z, r: 2.2, prompt: 'wp.title', use: () => { discoverWp2(); emit('openPanel', 'waypoints'); } });
      z.emit = (z.emit || []).concat([{ x: w.x, y: 0.4, z: w.z, type: 'bluefire', s: 0.5 }]);
    }
    // who waits where: Isarn and Brokka at the Dark Beacon's camp, Elati at the Graves, and later Isarn at the empty hook
    const N = S.npcs;
    npc4(z, 'isarn', 'wayfarer', N.wayfarer);
    npc4(z, 'brokka', 'brokka', N.brokka);
    npc4(z, 'elati', 'elati', N.elati);
    if (S.hook) { const r = S.hook.r || 0, f = z.map.nearestFloor(S.hook.x + Math.sin(r) * 1.4, S.hook.z + Math.cos(r) * 1.4, 2); npc4(z, 'isarnHook', 'wayfarer', { x: f.x, z: f.z, r: r + Math.PI }); }
    // the Voice in the Cradle, once between one lamp and the next (only after the first of them burns)
    const lamps = S.lamps || [];
    z.voices = lamps.slice(0, -1).map((l, i) => { const n = lamps[i + 1]; return { x: (l.x + n.x) / 2, z: (l.z + n.z) / 2, r: 7, key: 'd.voice.' + Math.min(i + 1, 4), need: 'lamp_' + l.id }; });
    // (Ivar fallen but his lantern never hung: the replayed Last Lamp brings his echo, story.js lastLamp)
    if (!F.ivar && !F.ivarDown) z.bossSpot = { kind: 'ivar', ...z.map.nearestFloor(L.boss.x, L.boss.z - 6, 4) };
    else if (F.ivar && ll) echoAt(z, 'ivar', ll.x, ll.z + 1.4);
  } else {
    // the three Great Bellows; the interactable is the fire-pit before each (to a Smoke-eater, a lamp)
    A.bellows = (S.bellows || []).map((b) => {
      const r = b.prop.r || 0, mesh = put(z, act4Prop('bellows'), b.prop.x, b.prop.z, r);
      const it = { kind: 'bellows', id: b.id, b, x: b.prop.x + Math.sin(r) * 3, z: b.prop.z + Math.cos(r) * 3, r: 2.6, lightR: 5, mesh, lit: false, prompt: 'bellows.use' };
      it.snuff = () => setPit(z, it, false);
      it.relight = () => setPit(z, it, true);
      it.use = () => bellowsUse(z, it);
      z.interact.push(it); return it;
    });
    if (L.plug) { if (F.plug) z.map.open(L.plug.cells); else { A.plug = act4Prop('slagPlug', L.plug); z.extra.push(A.plug); } }
    if (S.anvil) A.anvil = put(z, act4Prop('anvil'), S.anvil.x, S.anvil.z);
    for (const c of S.cages || []) put(z, act4Prop('shardAnvil'), c.x, c.z, Math.atan2(S.anvil.x - c.x, S.anvil.z - c.z));
    if (S.mouth) A.mouth = put(z, act4Prop('forgeMouth', S.mouth), S.mouth.x, S.mouth.z);
    const N = S.npcs;
    npc4(z, 'brokka', 'brokka', N.brokka);
    npc4(z, 'elati', 'elati', N.elati);
    // Isarn, dragged ahead by the lantern, kneels at the Anvil
    if (S.isarn) npc4(z, 'isarn', 'wayfarer', { x: S.isarn.x, z: S.isarn.z, r: Math.PI }, { kneel: true });
    if (F.plug && !F.karthax) karthaxWaits(z);
    else if (F.crownUnmade && S.anvil) echoAt(z, 'karthax', S.anvil.x, S.anvil.z + 2.4);
  }
}
// on every entry: the night or the heat, the lamps and their light (snuffed lamps burn again; pools are the zone's own),
// the flues, who is where
function act4Enter(z) {
  const F = G.hero.flags, A = z.act4, L = z.L;
  if (z.id === 'ashfield') {
    const mode = nightMode();
    setAtmosphere(ATMOS[{ ash: 'ashfield', stars: 'ashfieldStars', dawn: 'ashfieldDawn' }[mode]] || ATMOS.ashfield);
    setNight(mode);
    Audio.mood({ night: mode === 'ash' ? 0 : mode === 'stars' ? 1 : 2, heat: 0 });
    for (const it of A.lamps) setLamp(z, it, mode === 'dawn' || (mode === 'ash' && !!F['lamp_' + it.id]));
    // (in Ivar's dark the braziers stay as they were: a death and a respawn here do not relight them for nothing)
    const dark = z.boss && !z.boss.dead && z.boss.dark;
    for (const it of A.braziers) setBrazier(z, it, dark ? it.lit : mode !== 'stars', true);
    for (const it of A.altars) { const st = F.gifts?.[it.id]; it.mesh.userData.setState(st || 'idle'); it.used = !!st || !!F.giftsTaken || !!F.crownUnmade; }
    setLastLamp(z, !!F.ivar);
    // the Lampless are released after the Unmaking: none walk the Graves any more
    if (F.crownUnmade) { z.packs = z.packs.filter((p) => p.tag !== 'lamplessPatrol'); for (const a of z.actors.slice()) if (a.kind === 'lampless' && !a.dead) release(z, a, false); }
  } else {
    const k = forgeHeat();
    z.heatK = k; z.heatTo = null; setHeat(k);
    setAmbient(k < 0 ? 'forgeCold' : 'forge');
    Audio.mood({ heat: k, night: 0 });
    for (const it of A.bellows) setPit(z, it, k >= 0, true);
    if (A.mouth) { A.mouth.userData.setWhite(0); mouthHalo(A.mouth, k >= 0); }
    if (k >= 0) { startFlues(L.flues); setFlueHeat(k); } else stopFlues();
    // Isarn's lantern in Karthax's last fire walks on after a death and a respawn here (pools are cleared on leaving)
    const W = z.isarnWalk;
    if (W?.a && !W.a.removed && z.boss && !z.boss.dead) W.pool = addLightPool(W.a.x, W.a.z, 6, Infinity, 'isarn', { color: 0xfff0c8, intensity: 26 });
  }
  act4Presence(z);
  refreshEmit(z);
}
// the Forge Mouth's red halo goes out with the forge
function mouthHalo(m, on) { m.traverse((o) => { if (o.isSprite) o.visible = on; }); }
// who is where, by the story so far (zones are kept between visits, so this runs on every entry and as the story moves)
export function act4Presence(z) {
  const A = z?.act4; if (!A) return;
  const F = G.hero.flags, here = G.zone === z, gone = !!F.crownUnmade;
  const want = z.id === 'ashfield'
    ? { isarn: !F.mem_l5 && !F.ivar && !gone, isarnHook: !!F.mem_l5 && !F.ivar && !gone, brokka: !F.ivar && !gone, elati: !F.plug && !gone }
    : { brokka: !gone, elati: !!F.plug && !gone, isarn: !gone };
  for (const k in A.npcs) {
    const n = A.npcs[k]; if (n.a.removed) continue;
    const on = !!want[k] && !n.gone, talk = on && !n.busy, inA = z.actors.includes(n.a), inI = z.interact.includes(n.it);
    if (on && !inA) { z.actors.push(n.a); if (here && n.a.avatar) R.scene.add(n.a.avatar.group); }
    if (!on && inA) { z.actors.splice(z.actors.indexOf(n.a), 1); if (n.a.avatar) R.scene.remove(n.a.avatar.group); }
    if (talk && !inI) z.interact.push(n.it);
    if (!talk && inI) z.interact.splice(z.interact.indexOf(n.it), 1);
  }
  // the lantern is gold until the brow-stone tears out of it at the Anvil
  for (const k of ['isarn', 'isarnHook']) if (A.npcs[k]) isarnLantern(A.npcs[k].a, F.browstone ? 'white' : 'gold');
}
// a waylamp: lit from the Cradle (a short touch), a permanent pool of light, a place to wake, and five of them remember
function setLamp(z, it, on) {
  const F = G.hero.flags, ash = nightMode() === 'ash';
  it.lit = on; it.mesh.userData.setLit(on);
  const tag = 'lamp:' + it.id;
  removeLightPool(tag);
  if (on && G.zone === z) addLightPool(it.x, it.z, it.lightR, Infinity, tag, { color: LAMP_C, intensity: 24 });
  // dark: light it (again); lit with its memory unseen: remember. Nothing to do once the Night Without Fires has come
  it.used = !ash || (on && !(it.memory && !F['mem_' + it.id]));
  it.prompt = on ? 'lamp.remember' : F['lamp_' + it.id] ? 'lamp.relight' : 'lamp.light';
}
function lampUse(z, it) {
  const F = G.hero.flags;
  if (it.lit) { if (it.memory && !F['mem_' + it.id]) emit('lamp', it, z); return; }
  const f = worldAt(it.mesh, it.mesh.userData.flameAt || { y: 2 });
  touch(F['lamp_' + it.id] ? 1 : 0.8, it, f.y, () => {
    const first = !F['lamp_' + it.id];
    F['lamp_' + it.id] = true;
    setLamp(z, it, true);
    // the place to wake if she falls
    const r = it.spot.r || 0;
    z.checkpoint = z.map.nearestFloor(it.x + Math.sin(r) * 1.6, it.z + Math.cos(r) * 1.6, 3);
    glowBurst(f.x, f.y, f.z, 0xffd080, 26, 2.5, 0.3, 0.8); ring(it.x, it.z, it.lightR, LAMP_C, 0.9);
    Audio.sfx('lampLight', { x: it.x, z: it.z }); Audio.sting('lantern');
    emit('lampLit', it, first, z);
  });
}
// Ivar's braziers
function setBrazier(z, it, on, quiet) {
  it.lit = on; it.mesh.userData.setLit(on); it.used = on;
  const tag = 'brazier:' + it.i;
  removeLightPool(tag);
  if (on && G.zone === z) addLightPool(it.x, it.z, it.lightR, Infinity, tag, { color: 0xff9a40, intensity: 22 });
  setEmit(z, tag, on ? { x: it.x, y: it.mesh.userData.fireY || 1.2, z: it.z, type: 'fire', s: 0.7 } : null, quiet);
}
export function setLastLamp(z, on) {
  const A = z?.act4; if (!A?.lastLamp) return;
  A.lastLamp.userData.setLit(on); A.lastLampIt.lit = on;
  removeLightPool('lastLamp');
  if (on && G.zone === z) addLightPool(A.lastLampIt.x, A.lastLampIt.z, A.lastLampIt.lightR, Infinity, 'lastLamp', { color: GOLD, intensity: 30 });
}
// a Great Bellows' fire-pit: a light, a lamp to the Smoke-eaters, and the bellows' handle (wake it; relight it)
function setPit(z, it, on, quiet) {
  const F = G.hero.flags, p = it.b.pit || it, tag = 'pit:' + it.id;
  it.lit = on;
  removeLightPool(tag);
  if (on && G.zone === z) addLightPool(p.x, p.z, it.lightR, Infinity, tag, { color: 0xff7a30, intensity: 20 });
  it.used = !!F.crownUnmade || (on && (!!F['bellows' + it.id] || z.run?.it === it));
  it.prompt = on ? 'bellows.use' : 'bellows.relight';
  setEmit(z, tag, on ? { x: p.x, y: 0.4, z: p.z, type: 'fire', s: 1 } : null, quiet);
}
// a touch that takes a moment (a waylamp, a brazier, a fire-pit): the Cradle's fire streams across; a blow breaks it
function touch(dur, it, y, done) {
  const pl = G.player; if (!pl || pl.dead || pl.act) return;
  pl.rot = angleTo(pl.x, pl.z, it.x, it.z);
  const c = new THREE.Vector3();
  pl.act = { name: 'touch', t: 0, dur, ev: [], clip: dur, move: 0, blows: pl.blows || 0, st: 0,
    update(dt, a) {
      // a blow that reaches her life breaks it (combat.js hurtHero counts them); a burn or a poison tick does not
      if ((pl.blows || 0) !== a.blows) { a.dur = Infinity; pl.act = null; pl.avatar.anim.stop?.(0.15); return; }
      if ((a.st -= dt) <= 0) { a.st = 0.08; cradlePoint(c); fireStream({ x: c.x, y: c.y, z: c.z }, { x: it.x, y, z: it.z }, 3); }
    },
    end() { done(); } };
  pl.avatar.play('interact', 1);
  Audio.sfx('lanternDrink', { x: it.x, z: it.z, vol: 0.5 });
}
// the Graves' waypoint: found by walking past it
export function discoverWp2() {
  const w = G.hero.wps;
  if (!w.includes('ashfield@2')) { w.push('ashfield@2'); emit('toast', t('hud.discovered')); }
}

// ---------- the Great Bellows: Brokka works one while the hero holds the chamber for 20 s ----------
function bellowsUse(z, it) {
  const F = G.hero.flags;
  if (!it.lit) { touch(1, it, 0.6, () => { setPit(z, it, true); Audio.sfx('lampLight', { x: it.x, z: it.z }); }); return; }
  if (F['bellows' + it.id] || z.run || F.crownUnmade) return;
  startBellows(z, it);
}
function startBellows(z, it) {
  const b = it.b, br = z.act4.npcs.brokka, f = (z.L.flues || []).find((x) => x.gallery === b.id);
  const R0 = z.run = { it, b, t: 0, dur: 20, waves: [0.6, 9], wi: 0, eaters: [], ready: false, k: 0, paused: true };
  setPit(z, it, it.lit);
  // Brokka comes down the gallery behind the hero and takes the pump; the 20 s start when she does
  if (br && !br.a.removed) {
    br.busy = true; act4Presence(z);
    if (!z.actors.includes(br.a)) { z.actors.push(br.a); R.scene.add(br.a.avatar.group); }
    const from = f ? z.map.nearestFloor(f.x + Math.sin(f.dir) * 3, f.z + Math.cos(f.dir) * 3, 3) : z.map.nearestFloor(b.x, b.z + (b.r || 9) - 1, 3);
    br.a.x = from.x; br.a.z = from.z; br.it.x = from.x; br.it.z = from.z;
    R0.from = from;
    walkTo(br.a, b.pump.x, b.pump.z, 4.2, () => { R0.ready = true; br.a.home = angleTo(b.pump.x, b.pump.z, b.prop.x, b.prop.z); br.a.rot = br.a.home; br.a.avatar?.play('hammer', 1.2); });
  } else R0.ready = true;
  emit('bellowsStart', b.id, z);
}
function updateRun(z, dt) {
  const R0 = z.run, pl = G.player, b = R0.b;
  if (pl.dead) { endBellows(z, false); return; }
  R0.out = !R0.it.lit;
  R0.away = Math.hypot(pl.x - b.x, pl.z - b.z) > (b.r || 9) + 4;
  R0.paused = !R0.ready || R0.out || R0.away;
  if (!R0.paused) R0.t += dt;
  // two waves through the chamber's doors; Smoke-eaters go for the fire-pit
  if (R0.ready && R0.wi < R0.waves.length && R0.t >= R0.waves[R0.wi]) { R0.wi++; bellowsWave(z, R0); }
  R0.k = clamp(R0.t / R0.dur, 0, 1);
  R0.it.mesh.userData.breathe?.(R0.paused ? 0.1 : 0.5 + 0.5 * Math.sin(R0.t * 2.6));
  if (R0.t >= R0.dur) bellowsBreathe(z, R0);
}
function bellowsWave(z, R0) {
  const D = DIFFS[G.hero.diff], n = Math.max(2, Math.round(3 * (0.85 + D.elite * 0.15))), doors = R0.b.doors || [];
  for (const d of doors) for (let i = 0; i < n; i++) {
    const s = z.map.nearestFloor(d.x + rand.range(-1.2, 1.2), d.z + rand.range(-1.2, 1.2), 3), m = spawnMonster(rand.weighted(PACKS.bellowsWave), s.x, s.z);
    m.aggro = true; m.alarmed = true; z.actors.push(m);
    puff(s.x, 0.8, s.z, 6, 0x3a3028, 1, 0.8, 1);
  }
  R0.eaters = R0.eaters.filter((a) => !a.dead);
  if (R0.eaters.length < 2 && doors.length) {
    const d = doors[R0.wi % doors.length], s = z.map.nearestFloor(d.x, d.z, 3), m = spawnMonster('smokeEater', s.x, s.z);
    z.actors.push(m); R0.eaters.push(m);
  }
  Audio.sfx('hornCall', { vol: 0.5 });
}
// the bellows breathes: the Forge's heat rises a stage (story.js 'bellowsDone': the lines, the quest, the plug)
function bellowsBreathe(z, R0) {
  const F = G.hero.flags, b = R0.b, p = b.pit || R0.it;
  F['bellows' + b.id] = true; F.heat = bellowsDone();
  endBellows(z, true);
  shake(0.7); Audio.sfx('bellowsRoar', { vol: 1 }); Audio.sfx('anvil', { x: p.x, z: p.z });
  explosion(p.x, p.z, 3, 0xff8a30, { smoke: 0x2a1a10, shake: 0.4 }); glowBurst(p.x, 1.5, p.z, 0xffb050, 50, 6, 0.4, 1);
  heatTo(z, F.heat);
  emit('bellowsDone', b.id, F.heat, z);
}
function endBellows(z, done) {
  const R0 = z.run; if (!R0) return;
  z.run = null;
  R0.it.mesh.userData.breathe?.(0);
  setPit(z, R0.it, R0.it.lit);
  // Brokka goes back up the gallery to her camp
  const br = z.act4?.npcs.brokka; if (!br) return;
  const home = () => { stopWalk(br.a); br.a.avatar?.anim.stop?.(0.3); br.a.x = br.spot.x; br.a.z = br.spot.z; br.a.home = br.spot.r; br.a.rot = br.spot.r; br.it.x = br.spot.x; br.it.z = br.spot.z; br.busy = false; act4Presence(z); };
  if (!done || G.zone !== z || !R0.from) { home(); return; }
  later(3.5, () => walkTo(br.a, R0.from.x, R0.from.z, 3.4, home));
}
// the heat eases from one stage to the next (lava, grates, the light, the fog)
export function heatTo(z, k) {
  if (!z) return;
  z.heatTo = k; if (z.heatK == null) z.heatK = forgeHeat();
  if (k >= 0) setFlueHeat(k);
  Audio.mood({ heat: k });
}
// Karthax under the slag at the Anvil (he rises when the hero comes up the stair: updatePacks, then story.js)
function karthaxWaits(z) { const b = z.L.boss; z.bossSpot = { kind: 'karthax', ...z.map.nearestFloor(b.x, b.z - 4.6, 4) }; }
// the third breath: the slag on the Great Stair runs down and the way up to the Anvil opens
export function meltPlug(z) {
  const P0 = z?.L.plug; if (!P0) return;
  z.map.open(P0.cells); emit('mapChanged');
  if (!G.hero.flags.karthax && !z.bossSpot) karthaxWaits(z);
  const m = z.act4?.plug;
  later(0.4, () => {
    m?.userData.melt?.();
    if (G.zone !== z) return;
    Audio.sfx('lavaBurst', { x: P0.x, z: P0.z, vol: 1 }); shake(0.5);
    explosion(P0.x, P0.z, 3, 0xff7a20, { smoke: 0x2a1a10, shake: 0.3 }); puff(P0.x, 1.5, P0.z, 18, 0x3a2a20, 2, 2.5, 2);
  });
}
// the Unmaking is done: the Forge goes cold (the lava crusts over, the flues and bellows fall silent)
export function forgeCold(z) {
  if (!z?.act4) return;
  stopFlues(); heatTo(z, -1);
  for (const it of z.act4.bellows) setPit(z, it, false);
  if (z.act4.mouth) mouthHalo(z.act4.mouth, false);
  setAmbient('forgeCold');
}
// the Anvil Gate: Ivar has hung up his lantern, and the leaves swing in
export function openAnvilGate(z) {
  const g = z?.act4?.gate, G0 = z?.L.gate; if (!g || !G0) return;
  z.map.open(G0.cells); emit('mapChanged');
  later(0.3, () => {
    Audio.sfx('door', { vol: 1 }); shake(0.4); puff(G0.x, 2, G0.z + 1, 18, 0x3a3634, 2.5, 3, 2);
    const step = () => { if (G.zone !== z) { g.userData.setOpen(true); return; } if (!g.userData.open(0.016)) later(0.016, step); };
    step();
  });
}
// the dead let go: a Lampless (kneeling first) no longer fights, and fades into the dark
export function release(z, a, kneel = true) {
  const i = z.actors.indexOf(a); if (i >= 0) z.actors.splice(i, 1);
  if (a.cone) a.cone.visible = false;
  if (a.mesh) { a.mesh.parent?.remove(a.mesh); a.mesh = null; }
  a.aggro = false; a.loose = true;
  if (kneel) a.avatar?.play('kneel', 1);
  vanish(z, a, kneel ? 3.5 : 0.1);
}

// ---------- scripted walks and fades (npc() has no feet of its own) ----------
const WALKS = [], FADES = [];
// straight to (x, z) at speed m/s, facing the way, the walk (or the run) playing; done() on arrival
export function walkTo(a, x, z, speed = 1.4, done) {
  if (!a) return null;
  stopWalk(a);
  const w = { a, x, z, speed, done };
  a.stillAt = a.still; a.still = true; a.walking = w;
  WALKS.push(w);
  const run = speed > 3;
  a.avatar?.play(run ? 'Jog_Fwd_Loop' : 'Walk_Loop', clamp(speed / (run ? 3.9 : 1.45), 0.5, 2), { loop: true, fade: 0.2 });
  return w;
}
export function stopWalk(a) {
  const i = WALKS.findIndex((w) => w.a === a); if (i < 0) return;
  WALKS.splice(i, 1); a.walking = null; a.still = a.stillAt; a.avatar?.anim.stop?.(0.25);
}
function tickWalks(dt) {
  for (let i = WALKS.length - 1; i >= 0; i--) {
    const w = WALKS[i], a = w.a;
    if (a.removed) { WALKS.splice(i, 1); continue; }
    const dx = w.x - a.x, dz = w.z - a.z, d = Math.hypot(dx, dz), step = w.speed * dt;
    if (d > 0.05) a.home = a.rot = Math.atan2(dx, dz);
    if (d <= step) { a.x = w.x; a.z = w.z; } else { a.x += (dx / d) * step; a.z += (dz / d) * step; }
    if (a.it) { a.it.x = a.x; a.it.z = a.z; }
    if (d <= step) { WALKS.splice(i, 1); a.walking = null; a.still = a.stillAt; a.avatar?.anim.stop?.(0.25); w.done?.(); }
  }
}
// someone leaves the scene: fades out over dur seconds, then is gone from the zone
export function vanish(z, a, dur = 1.5, done) {
  if (!a?.avatar) { done?.(); return; }
  const mats = a.avatar.model.mats || [a.avatar.mat];
  for (const m of mats) { m.transparent = true; m.depthWrite = false; }
  FADES.push({ z, a, t: 0, dur, done, mats, o0: mats.map((m) => m.opacity ?? 1) });
}
function tickFades(dt) {
  for (let i = FADES.length - 1; i >= 0; i--) {
    const f = FADES[i], a = f.a; f.t += dt;
    if (!a.avatar) { FADES.splice(i, 1); continue; }
    const k = 1 - clamp(f.t / f.dur, 0, 1);
    f.mats.forEach((m, j) => { m.opacity = f.o0[j] * k; });
    // the released are no longer in the zone's actors: keep them moving
    if (a.loose) { a.avatar.group.position.set(a.x, 0, a.z); a.avatar.update(dt, { speed: 0 }); }
    if (f.t >= f.dur) {
      FADES.splice(i, 1);
      const j = f.z.actors.indexOf(a); if (j >= 0) f.z.actors.splice(j, 1);
      if (a.it) { const q = f.z.interact.indexOf(a.it); if (q >= 0) f.z.interact.splice(q, 1); }
      a.remove(); f.done?.();
    }
  }
}

// ---------- per frame (boot.js, with the packs): walks, fades, the bellows, the heat, the flues' glow, Karthax's arrival ----------
const _fg = [0, 0, 0];
export function updateAct4(dt) {
  tickWalks(dt); tickFades(dt);
  const z = G.zone, pl = G.player; if (!z?.act4 || !pl) return;
  const F = G.hero.flags;
  if (z.id === 'ashfield') {
    const w = z.L.spots.camp2;
    if (w && Math.hypot(w.x - pl.x, w.z - pl.z) < 7) discoverWp2();
    return;
  }
  if (z.run) updateRun(z, dt);
  // the heat eases toward its stage
  if (z.heatTo != null) {
    const to = z.heatTo, from = z.heatK ?? 0, step = dt / 2.5;
    let k = Math.abs(to - from) <= step ? to : from + Math.sign(to - from) * step;
    if (to < 0 && k <= 0) k = to; // banked to cold in one step: the crust closes
    z.heatK = k; if (k === to) z.heatTo = null;
    setHeat(k);
  }
  // the galleries' grates glow with each inhale and flare as the fire goes down
  _fg.fill(0);
  for (const f of flues() || []) if (f.gallery != null && f.gallery < 3) _fg[f.gallery] = Math.max(_fg[f.gallery], f.st === 'inhale' ? 1 - f.t / BREATH.inhale : f.st === 'fire' ? 1.2 * (f.t / BREATH.fire) : 0);
  for (let g = 0; g < 3; g++) setFlueGlow(g, _fg[g]);
  // Karthax waits in the slag until the hero comes up to the Anvil (story.js plays his arrival)
  const b = z.boss;
  if (b && b.kind === 'karthax' && b.holdWake && !z.karthaxArrived && !b.dead && Math.hypot(b.x - pl.x, b.z - pl.z) < 13.5) { z.karthaxArrived = true; emit('karthaxArrive', z, b); }
  // Isarn's lantern walks toward the Ash King in his last fire, a 6 m light, and stops 4 m short
  const I = z.isarnWalk;
  if (I && I.a && !I.a.removed) {
    const t0 = b && !b.dead ? b : null;
    if (t0) {
      const d = Math.hypot(t0.x - I.a.x, t0.z - I.a.z);
      if (d > 4.3 && !I.a.walking) { const s = Math.min(1.2 * dt, d - 4.2); I.a.x += ((t0.x - I.a.x) / d) * s; I.a.z += ((t0.z - I.a.z) / d) * s; I.a.home = I.a.rot = angleTo(I.a.x, I.a.z, t0.x, t0.z); if (!I.moving) { I.moving = true; I.a.avatar?.play('Walk_Loop', 0.8, { loop: true, fade: 0.3 }); } }
      else if (I.moving) { I.moving = false; I.a.avatar?.anim.stop?.(0.3); }
      if (I.a.it) { I.a.it.x = I.a.x; I.a.it.z = I.a.z; }
    }
    if (I.pool) { I.pool.x = I.a.x; I.pool.z = I.a.z; }
  }
}

// the Forge's music breathes with the flues near her (audio.js: an inhale swell, then the roar with the anvil)
on('flueInhale', (f) => { const pl = G.player; if (pl && Math.hypot(f.x - pl.x, f.z - pl.z) < 32) Audio.mood({ breath: 1 }); });
on('flueRoar', (f) => { const pl = G.player; if (pl && Math.hypot(f.x - pl.x, f.z - pl.z) < 32) Audio.mood({ roar: 1 }); });

// ---------- Whitecliff's fires ----------
// its own beacon (gone north in the Ember Cradle from q17 until the new fire, which burns white-gold), the far fires that
// answered it (dark in the Night Without Fires, then lit again by hand, with a fourth far to the north), the torches the
// village carries while its beacon is cold, and Isarn's staff planted by the beacon once the new fire burns
export function townFires(z) {
  if (z?.id !== 'town') return;
  const h = G.hero, F = h.flags;
  z.town ||= { far: [] };
  setBeacon(z, !F.fireTaken || !!F.newFire);
  const night = F.crownUnmade && !F.newFire, lit = [h.act1 >= 0 || h.quest >= 5, (h.act2 ?? -1) >= 0 || h.quest >= 10, (h.act3 ?? -1) >= 0 || h.quest >= 16, !!F.newFire];
  FAR_BEACONS.forEach((_, i) => setFar(z, i, lit[i] && !night));
  townTorches(z, !!F.fireTaken && !F.newFire);
  townPresence(z);
}
const liveLights = (key) => [...R.sources].filter((s) => s.key === key);
// one far fire: its light, its glow over the treeline and its flames (kept with the zone and shown on every entry)
export function setFar(z, i, on) {
  const T = z.town ||= { far: [] }, L = z.L, b = L.beacon, F0 = FAR_BEACONS[i], cur = T.far[i], here = G.zone === z;
  if (!!cur === !!on || !F0) return cur;
  if (on) {
    const far = { x: b.x + F0.dx, y: F0.y, z: b.z + F0.dz }, key = 'far' + i;
    const light = { x: far.x, y: far.y, z: far.z, color: F0.color ?? 0xff8a30, intensity: 200, range: 60, flicker: 0.3, key };
    const em = { x: far.x, y: far.y - 2, z: far.z, type: 'beacon', s: 1.2, key }, spr = farFire(far, F0.color);
    L.lights.push(light); z.extra.push(spr); z.emit4.push(em);
    if (here) { addLight(light); R.scene.add(spr); }
    T.far[i] = { light, spr, em, far };
  } else {
    L.lights.splice(L.lights.indexOf(cur.light), 1); z.extra.splice(z.extra.indexOf(cur.spr), 1); z.emit4.splice(z.emit4.indexOf(cur.em), 1);
    if (here) { for (const s of liveLights(cur.light.key)) removeLight(s); R.scene.remove(cur.spr); }
    T.far[i] = null;
  }
  refreshEmit(z);
  return T.far[i];
}
// the village's own beacon: its fire and light, or a cold bowl of grey ash
export function setBeacon(z, on) {
  const T = z.town ||= { far: [] }, L = z.L, b = L.beacon, here = G.zone === z;
  T.light ||= L.lights.find((l) => l.fx === 'beacon');
  T.em ||= z.lvl.emitters.find((e) => e.type === 'beacon');
  if (T.light) { T.light.key = 'beacon'; T.light.color = G.hero.flags.newFire ? 0xffe2a8 : 0xff8a30; }
  if (T.beaconOn === on) return;
  T.beaconOn = on;
  const has = (list, x) => list.includes(x), drop = (list, x) => { const i = list.indexOf(x); if (i >= 0) list.splice(i, 1); };
  if (T.light) { if (on && !has(L.lights, T.light)) L.lights.push(T.light); if (!on) drop(L.lights, T.light); }
  if (T.em) { if (on && !has(z.lvl.emitters, T.em)) z.lvl.emitters.push(T.em); if (!on) drop(z.lvl.emitters, T.em); }
  if (here) { for (const s of liveLights('beacon')) removeLight(s); if (on && T.light) addLight(T.light); }
  if (!T.cap) { T.cap = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.12, 0.16, 12), new THREE.MeshLambertMaterial({ color: 0x2c2926 })); T.cap.position.set(b.x, 9.05, b.z); }
  showExtra(z, T.cap, !on);
  refreshEmit(z);
}
// while the beacon is cold the village holds torches (and Elianthe with them)
function townTorches(z, on) {
  const T = z.town; if (T.torches === on) return;
  T.torches = on;
  // (each light is keyed by its holder: the actors' order shifts as people come and go)
  z.actors.forEach((a) => {
    if (a.npc !== 'villager' && a.npc !== 'healer') return;
    const key = 'torch' + a.id, av = a.avatar; if (!av) return;
    for (const l of z.L.lights.filter((x) => x.key === key)) z.L.lights.splice(z.L.lights.indexOf(l), 1);
    if (G.zone === z) for (const s of liveLights(key)) removeLight(s);
    if (on) {
      const h = av.hold('R', 'club', { wood: 0x3a2a1a });
      if (h) { const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.position.set(0, (h.tip ?? 0.6) + 0.08, 0); fl.scale.setScalar(0.5 / (h.mesh.scale.x || 1)); h.mesh.add(fl); }
      av.play('torch', 1);
      const l = { x: a.x + Math.sin(a.rot) * 0.3, y: 2.2, z: a.z + Math.cos(a.rot) * 0.3, color: 0xffa050, intensity: 10, range: 8, flicker: 0.35, key };
      z.L.lights.push(l); if (G.zone === z) addLight(l);
    } else { av.hold('R', null); av.anim.stop?.(0.3); }
  });
}
// who is at the beacon: Isarn until the fire leaves with him; his staff once the new fire burns; the beacon to light in q22
export function townPresence(z) {
  const F = G.hero.flags, T = z.town, b = z.L.beacon, w = z.townNpc?.wayfarer, here = G.zone === z;
  if (w && !w.leaving) {
    const on = !F.fireTaken, inA = z.actors.includes(w.a);
    if (on && !inA) { z.actors.push(w.a); z.interact.push(w.it); if (here) R.scene.add(w.a.avatar.group); }
    if (!on && inA) { z.actors.splice(z.actors.indexOf(w.a), 1); const i = z.interact.indexOf(w.it); if (i >= 0) z.interact.splice(i, 1); R.scene.remove(w.a.avatar.group); }
  }
  const s = z.L.spots.npcs.wayfarer;
  if (F.newFire && !T.staff) {
    T.staff = put(z, act4Prop('staff'), s.x, s.z, 0.4); if (here) R.scene.add(T.staff);
    T.staff.userData.setLantern?.('dark');
    z.interact.push({ kind: 'staff', x: s.x, z: s.z, r: 2.4, prompt: 'staff.touch', use: () => emit('staff') });
  }
  const want = G.hero.quest === 22 && !!F.crownUnmade && !F.newFire, cur = z.interact.find((i) => i.kind === 'beacon');
  if (want && !cur) z.interact.push({ kind: 'beacon', x: s.x + 1.2, z: s.z - 0.8, r: 3, prompt: 'beacon.light', use: () => emit('lightBeacon', z) });
  if (!want && cur) z.interact.splice(z.interact.indexOf(cur), 1);
}

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
  if (G.zone?.wpDisc2) G.zone.wpDisc2.rotation.z += dt * 0.3;
}
export { WIND };
