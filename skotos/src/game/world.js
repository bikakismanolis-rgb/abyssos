// Zones: building, entering and leaving, monster packs, interactables, shadow gates.
import * as THREE from 'three';
import { G, later } from './state.js';
import { R, setAtmosphere, addLight, clearLights, updateCamera, removeLight } from '../gfx/gfx.js';
import { genForest, genCrypt, genTown } from '../world/gen.js';
import { buildLevel, propMesh, runeDisc, WIND } from '../world/build.js';
import { GridMap } from '../world/map.js';
import { ATMOS } from '../world/atmos.js';
import { kitMesh } from '../gfx/kits.js';
import { setEmitters, setAmbient, clearFX, glowBurst, puff, sparks, ring, P, explosion } from '../gfx/fx.js';
import { Actor, spawnMonster, spawnNpc, createPlayer, rollAffixes } from './actors.js';
import { PACKS, DIFFS, MONSTERS } from './data.js';
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
  gate: { level: 1, music: 'gate', ambient: 'gate', atmos: 'gate' }
};

function seedFor(id) {
  G.hero.seeds ||= {};
  if (!G.hero.seeds[id]) G.hero.seeds[id] = (Math.random() * 1e9) | 0;
  return G.hero.seeds[id];
}

// ---------- building ----------
function createZone(id, o = {}) {
  const seed = o.seed ?? seedFor(id);
  let L;
  if (id === 'town') L = genTown();
  else if (id === 'forest') L = genForest(seed);
  else if (id === 'crypt') L = genCrypt(seed);
  else if (id === 'gate') L = (o.tier % 2 ? genCrypt(seed, { rooms: 12, mh: 30 }) : genForest(seed, { h: 120 }));
  const map = new GridMap(L.w, L.h, L.cells);
  const lvl = buildLevel(L, R.quality);
  const z = { id, L, map, lvl, level: o.level ?? ZONES[id].level, actors: [], pickups: [], interact: [], packs: [], seed, tier: o.tier || 0, extra: [] };
  // breakables
  for (const p of lvl.breakables) {
    const mesh = p.t === 'urn' ? propMesh('urn') : kitMesh('dungeon', p.t === 'barrel' ? 'barrel_small' : 'box_small', 0.42 * (p.s || 1));
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
    const m = kitMesh('dungeon', c.rare ? 'chest_gold' : 'chest', 0.55); m.position.set(c.x, 0, c.z); m.rotation.y = rand.range(-0.4, 0.4);
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
  // town people and the stash
  if (id === 'town') {
    const N = L.spots.npcs;
    for (const k of ['wayfarer', 'smith', 'healer']) {
      const s = N[k], a = spawnNpc(k, s.x, s.z, s.r); a.home = s.r; z.actors.push(a);
      z.interact.push({ kind: 'npc', npc: k, actor: a, x: s.x, z: s.z, r: 2.4, prompt: 'talk', use: () => emit('talk', k, a) });
    }
    N.villagers.forEach((s, i) => { const a = spawnNpc('villager', s.x, s.z, s.r); a.home = s.r; a.bark = i; z.actors.push(a); z.interact.push({ kind: 'npc', npc: 'villager', bark: i, actor: a, x: s.x, z: s.z, r: 2, prompt: 'talk', use: () => emit('talk', 'villager', a) }); });
    z.interact.push({ kind: 'stash', x: 36, z: 41.5, r: 2, prompt: 'stash.title', use: () => emit('openPanel', 'stash') });
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
  setAmbient(Z.ambient);
  setAtmosphere(ATMOS[Z.atmos]);
  Audio.music(Z.music);
  // where the hero appears
  let at = o.at;
  if (!at || at === 'start') at = z.L.start;
  else if (at === 'waypoint') at = z.L.spots.waypoint ? { x: z.L.spots.waypoint.x, z: z.L.spots.waypoint.z + 2 } : z.L.start;
  else if (typeof at === 'string') { const e = z.L.exits.find((x) => x.to === at); at = e ? { x: e.x, z: e.z + (e.z > z.L.h / 2 ? -2.5 : 2.5) } : z.L.start; }
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
    const b = spawnMonster(z.bossSpot.kind, z.bossSpot.x, z.bossSpot.z, { level: Math.max(z.level + (z.bossSpot.kind === 'weaver' ? 2 : 3), G.hero.level + 1) });
    b.rot = Math.PI * 0.0 + angleTo(b.x, b.z, pl.x, pl.z);
    z.actors.push(b); z.boss = b;
  }
}
function spawnPack(z, p, D) {
  const weights = PACKS[z.id === 'gate' ? 'gate' : p.tag] || PACKS.goblins;
  let n = Math.round(p.n * (0.85 + D.elite * 0.15));
  let elite = p.elite;
  if (!elite && Math.random() < 0.06 * D.elite) elite = 'champion';
  const pick = () => rand.weighted(weights);
  const spots = [];
  const place = () => { for (let k = 0; k < 12; k++) { const a = rand.range(0, 6.28), r = rand.range(0.5, 3.2); const x = p.x + Math.sin(a) * r, y = p.z + Math.cos(a) * r; if (z.map.walkable(x, y) && !spots.some((s) => Math.hypot(s.x - x, s.z - y) < 0.9)) { spots.push({ x, z: y }); return { x, z: y }; } } return z.map.nearestFloor(p.x, p.z); };
  const gateMul = z.id === 'gate' ? Math.pow(1.14, z.tier) : 1;
  const opts = { packId: p.id, gateMul };
  const nAff = G.hero.diff >= 3 ? 3 : G.hero.diff >= 2 ? 2 : 1;
  if (elite === 'champion') {
    const kind = pick() === 'spiderling' ? 'spider' : pick();
    const aff = rollAffixes(nAff + 1);
    const cnt = aff.includes('horde') ? 5 : 3;
    for (let i = 0; i < cnt; i++) { const s = place(); z.actors.push(spawnMonster(kind === 'troll' ? 'ash' : kind, s.x, s.z, Object.assign({ elite: 'champion', affixes: aff }, opts))); }
    n = Math.max(0, n - cnt - 1);
  } else if (elite === 'rare') {
    let kind = p.tag === 'troll' ? 'troll' : pick(); if (kind === 'spiderling') kind = 'spider';
    const aff = rollAffixes(nAff + 2);
    const s = place(); z.actors.push(spawnMonster(kind, s.x, s.z, Object.assign({ elite: 'rare', affixes: aff }, opts)));
    const minions = p.tag === 'troll' ? 0 : (aff.includes('horde') ? 6 : 3);
    for (let i = 0; i < minions; i++) { const q = place(); const mk = kind === 'troll' ? 'goblin' : kind; z.actors.push(spawnMonster(mk === 'troll' ? 'goblin' : mk, q.x, q.z, Object.assign({ minion: true }, opts))); }
    n = Math.max(0, n - minions - 1);
  }
  for (let i = 0; i < n; i++) {
    const s = place(); const kind = pick();
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
  if (it.mesh) { it.mesh.rotation.x = -0.15; it.mesh.position.y = 0.02; }
  const n = it.rare ? rand.int(2, 4) : rand.int(1, 2);
  for (let i = 0; i < n; i++) later(0.15 + i * 0.15, () => dropItem(it.x, it.z, makeItem(L, { elite: it.rare, mf: G.stats.mf, legMul: D.leg, rar: it.rare && i === 0 ? 2 : undefined })));
  for (let i = 0; i < (it.rare ? 4 : 2); i++) later(0.1 + i * 0.1, () => dropGold(it.x, it.z, Math.round((8 + L * 3) * rand.range(0.7, 1.3) * D.gold)));
}
function takeExit(z, e) {
  if (e.locked && !G.hero.flags[e.locked]) { emit('toast', t('locked')); Audio.sfx('denied'); if (e.locked === 'weaver') emit('say', 'd.weaver'); return; }
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
