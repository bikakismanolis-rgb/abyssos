// The Forge's Breath (Act IV, the Ashen Forge). Each flue (L.flues: mouth x, z, dir, len, w, period, phase, gallery, cover)
// breathes: a 2.8 s inhale (a telegraph down the whole flue, the grate glowing, embers drawn in, blue marks on the cover of
// the flue she is in; never shortened), then 1.2 s of fire roaring down it (a sheet of fire on the floor behind the front)
// that hits once per breath for a share of max life plus burn by difficulty (2.5, 5, 9, 13, 20, 24%). Anything solid
// between the mouth and the hero is cover (map.los). Fireproof monsters ignore it; the rest take a quarter of 20% of her life.
// Periods: 10 s, 6.5 s while a Hammerhorn pumps its station (setFluePumping), 0.75 s less per stage of the Forge Heat,
// never under 6 s. Only flues within 40 m breathe. Also here: slag dripping from the dark over the Slag Rivers, and the vents of
// a Great Bellows chamber that has breathed. startFlues(L.flues) / stopFlues() from world.js; ticked from updateAreas.
// Act VI (docs/act6-contract.md, The Ice Overhead): drip() is the slag drip made generic (a colour, a blow, a landing hook,
// a shard left behind), vaultAt() brings icicles down from the low vault (L.vault patches) where the ground is struck below
// the ice, and the shards they leave block their cells for 20 s (SHARDS, for co-op's cells6).
import * as THREE from 'three';
import { G, later } from './state.js';
import { DIFFS, HAZ6, monsterDmg } from './data.js';
import { damage, addVuln } from './combat.js';
import { area } from './projectiles.js';
import { heroes, NET, MIRROR } from '../net/state.js';
import { R } from '../gfx/gfx.js';
import { teleLine, teleCircle, killTele, P, explosion, puff } from '../gfx/fx.js';
import { addLight, removeLight, shake } from '../gfx/gfx.js';
import { emit, on } from '../ui/bus.js';
import { lightKind } from './light.js';
import Audio from '../audio/audio.js';
import { rand } from '../core/util.js';

// hitBy / burnBy: shares of max life by difficulty (G.hero.diff, indexed like DIFFS, 0-5); the vents' likewise
export const BREATH = { inhale: 2.8, fire: 1.2, base: 10, pumped: 6.5, perHeat: 0.75, floor: 6.0, reach: 40,
  hitBy: [0.025, 0.05, 0.09, 0.13, 0.20, 0.24], burnBy: [0.005, 0.01, 0.015, 0.02, 0.03, 0.035], monsterHit: 0.2, monsters: 0.25 };
const VENT = { hitBy: [0.025, 0.05, 0.065, 0.08, 0.10, 0.12], burnBy: [0.005, 0.01, 0.012, 0.015, 0.02, 0.024] };
const di = () => Math.max(0, Math.min(G.hero.diff | 0, DIFFS.length - 1));
const F = { list: null, zone: null, heat: 0, pumping: new Set(), dripT: 6, ventT: 12 };

export function startFlues(list) {
  F.zone = G.zone; F.pumping.clear();
  F.heat = G.hero?.flags?.heat || 0;
  F.list = (list || []).map((f, i) => ({ ...f, i, st: 'idle', t: f.phase ?? rand.range(1, 6), tele: null, sheet: null, light: null, hit: new Set(), coverShown: false }));
  // the cover marks: only spots the fire cannot see (gen4.js lays them by the alcoves, the bays and the pillars' lee)
  for (const f of F.list) f.cover = (f.cover || []).filter((c) => !inFlue(f, c.x, c.z, 0));
  F.dripT = rand.range(4, 7); F.ventT = 6;
  // the Hammerhorns still at their stations from the last visit (G.actors is already the Forge's) go on pumping
  for (const a of G.actors || []) if (a.post && a.pumping && !a.dead) F.pumping.add(a.post.flue);
}
export function stopFlues() {
  for (const f of F.list || []) { killTele(f.tele); killTele(f.sheet); if (f.light) removeLight(f.light); }
  F.list = null; F.zone = null; F.pumping.clear();
}
export function setFlueHeat(k) { F.heat = Math.max(0, Math.min(3, k | 0)); }
// a Hammerhorn at its station (ai.js): that gallery's flue breathes faster (BREATH.pumped)
export function setFluePumping(i, on) { if (i == null) return; if (on) F.pumping.add(i); else F.pumping.delete(i); }
export const fluePeriod = (f) => Math.max(BREATH.floor, (F.pumping.has(f.i) || F.pumping.has(f.gallery) ? BREATH.pumped : f.period || BREATH.base) - BREATH.perHeat * F.heat);
export const flues = () => F.list;

// is (x, z) in the flue's path, with nothing solid between it and the mouth?
export function inFlue(f, x, z, pad = 0) {
  const ux = Math.sin(f.dir), uz = Math.cos(f.dir), dx = x - f.x, dz = z - f.z, u = dx * ux + dz * uz, v = -dx * uz + dz * ux;
  if (u < -0.3 || u > f.len || Math.abs(v) > f.w / 2 + pad) return false;
  return G.zone.map.los(f.x + ux * 0.5, f.z + uz * 0.5, x, z);
}

export function tickFlues(dt) {
  tickDrips(dt);
  if (!F.list || G.zone !== F.zone) { if (F.list && G.zone !== F.zone) stopFlues(); return; }
  const pl = G.player; if (!pl || G.hero.flags.crownUnmade) return;
  for (const f of F.list) {
    if (Math.hypot(f.x - pl.x, f.z - pl.z) > BREATH.reach + f.len * 0.5 && f.st === 'idle') continue;
    f.t -= dt;
    if (f.st === 'idle') {
      // a pump starting or the heat rising shortens the wait, never the inhale
      f.t = Math.min(f.t, fluePeriod(f) - BREATH.inhale - BREATH.fire);
      if (f.t <= 0) inhale(f);
    } else if (f.st === 'inhale') {
      const k = 1 - f.t / BREATH.inhale, ux = Math.sin(f.dir), uz = Math.cos(f.dir);
      if (f.light) f.light.intensity = 6 + 30 * k;
      // embers and soot drawn up the flue into the grate
      if (Math.random() < 0.6) { const u = rand.range(1, f.len), v = rand.range(-f.w / 2, f.w / 2), x = f.x + ux * u - uz * v, z = f.z + uz * u + ux * v; P({ x, y: rand.range(0.2, 1.6), z, vx: -ux * 6, vy: 0.2, vz: -uz * 6, life: Math.min(0.9, u / 6), size: 0.12, size1: 0.03, color: 0xffa040, color1: 0xff3000 }); }
      if (pl && !pl.dead && inFlue(f, pl.x, pl.z, pl.radius)) emit('flueWarn', k);
      // the first frame she is in this flue's path during the inhale: its cover shows blue until the fire has passed
      if (!f.coverShown && f.cover.length && pl && !pl.dead && inFlue(f, pl.x, pl.z, 2)) { f.coverShown = true; for (const c of f.cover) teleCircle(c.x, c.z, c.r, f.t + BREATH.fire, 0x60c0ff); }
      if (f.t <= 0) roar(f);
    } else if (f.st === 'fire') {
      const u = 1 - f.t / BREATH.fire, front = Math.min(f.len, f.len * (u / 0.33)), ux = Math.sin(f.dir), uz = Math.cos(f.dir);
      for (let k = 0, n = Math.min(14, Math.max(6, Math.ceil(f.len * f.w / 8))); k < n; k++) { const d = rand.range(0, front), v = rand.range(-f.w / 2, f.w / 2) * 0.8, x = f.x + ux * d - uz * v, z = f.z + uz * d + ux * v; P({ x, y: rand.range(0.2, 2.2), z, vx: ux * 9, vy: rand.range(0.5, 2), vz: uz * 9, life: rand.range(0.25, 0.5), size: rand.range(0.6, 1.1), size1: 0.2, color: 0xffd070, color1: 0xff3000 }); }
      if (f.light) { f.light.x = f.x + ux * front * 0.7; f.light.z = f.z + uz * front * 0.7; f.light.intensity = 40; }
      burn(f, front);
      if (f.t <= 0) { f.st = 'idle'; f.t = fluePeriod(f) - BREATH.inhale - BREATH.fire; killTele(f.sheet); f.sheet = null; if (f.light) { removeLight(f.light); f.light = null; } }
    }
  }
  drips(dt, pl);
  vents(dt, pl);
}
function inhale(f) {
  f.st = 'inhale'; f.t = BREATH.inhale; f.hit.clear(); f.coverShown = false;
  f.tele = teleLine(f.x, f.z, f.dir, f.len, f.w, BREATH.inhale, 0xff6a10);
  f.light = addLight({ x: f.x, y: 1.2, z: f.z, color: 0xff7020, intensity: 6, range: 9, flicker: 0.3 });
  // (the sound is two seconds of drawn air: it starts so as to end on the roar)
  later(BREATH.inhale - 2, () => { if (f.st === 'inhale' && F.list?.includes(f)) Audio.sfx('bellowsInhale', { x: f.x, z: f.z }); });
  emit('flueInhale', f);
}
function roar(f) {
  f.st = 'fire'; f.t = BREATH.fire; killTele(f.tele); f.tele = null;
  // the fire's sheet on the floor, running down the flue with the front (a third of the breath) and burning till it ends
  f.sheet = teleLine(f.x, f.z, f.dir, f.len, f.w, BREATH.fire * 0.33, 0xffa040);
  Audio.sfx('bellowsRoar', { x: f.x, z: f.z });
  const pl = G.player;
  if (pl && Math.hypot(pl.x - f.x, pl.z - f.z) < f.len + 6) shake(0.25);
  emit('flueRoar', f);
}
// the fire front passes: everything in the open in front of it burns, once per breath
function burn(f, front) {
  const pl = G.player, ux = Math.sin(f.dir), uz = Math.cos(f.dir);
  const reached = (x, z) => (x - f.x) * ux + (z - f.z) * uz <= front;
  if (pl && !pl.dead && !f.hit.has(pl) && pl.iframes <= 0 && reached(pl.x, pl.z) && inFlue(f, pl.x, pl.z, pl.radius * 0.5)) {
    f.hit.add(pl);
    const d = di(), v = pl.hpMax * BREATH.hitBy[d];
    damage(null, pl, v, { pure: true, burn: pl.hpMax * BREATH.burnBy[d], kx: ux, kz: uz });
    emit('flueHit', f);
  }
  for (const a of G.actors) {
    if (a.dead || a.team !== 'foe' || f.hit.has(a) || a.def.fireproof || a.def.flesh === 'magma' || a.airborne || a.prop) continue;
    if (!reached(a.x, a.z) || !inFlue(f, a.x, a.z, a.radius * 0.5)) continue;
    f.hit.add(a);
    damage(null, a, (pl ? pl.hpMax : 100) * BREATH.monsterHit * BREATH.monsters, { burn: a.hpMax * 0.03 });
  }
}
// slag drips from the dark over the Slag Rivers: near lava, now and then, a drop where the hero stands (never at the Anvil
// of the Crown, its moat and the Forge Mouth, nor in the Hall of Moulds by its brood pools)
function drips(dt, pl) {
  const L = G.zone.L;
  if (!L.lava || pl.dead) return;
  F.dripT -= dt;
  if (F.dripT > 0) return;
  F.dripT = rand.range(5, 9);
  const ix = Math.floor(pl.x), iz = Math.floor(pl.z);
  let near = false;
  for (let dz = -6; dz <= 6 && !near; dz++) for (let dx = -6; dx <= 6; dx++) { const x = ix + dx, z = iz + dz; if (x >= 0 && z >= 0 && x < L.w && z < L.h && L.lava[z * L.w + x]) { near = true; break; } }
  if (!near) return;
  const S = L.spots || {}, B = L.boss;
  if (B && Math.hypot(pl.x - B.x, pl.z - B.z) < B.r + 5) return;
  if (S.hall && Math.hypot(pl.x - S.hall.x, pl.z - S.hall.z) < S.hall.r + 4) return;
  const x = pl.x + rand.range(-1.5, 1.5), z = pl.z + rand.range(-1.5, 1.5);
  if (!G.zone.map.walkable(x, z)) return;
  slag(x, z, 1.6, 1.0, 1.0);
}
export function slag(x, z, r, dur, mult) {
  drip(x, z, r, dur, { mult, burn: 0.4, onLand: (lx, lz) => { const D = DIFFS[G.hero.diff], dmg = monsterDmg(G.zone.level || 25) * D.dmg; area('fire', lx, lz, r * 0.8, 3, { team: 'foe', dmg: dmg * 0.2, tick: 0.5 }); } });
}
// something falls from the dark at (x, z): a teleCircle of r for dur s (amber for slag; o.color white 0xe8f4ff for ice),
// then the blow, o.mult times the zone's monster blow, to every hero inside (heroes(): a guest's stand-in through
// hurtRemote, combat.js damage), with o.burn (a share of the blow) and o.cold (the Cold). Ice (o.color set) also strikes the
// monsters inside: 8% of their life and a 1.5 s stun with Stunned (x1.5; o.stun for longer), and o.shard leaves an icicle
// on its cell, blocked for 20 s. o.onLand(x, z) after
export function drip(x, z, r, dur, o = {}) {
  const zone = G.zone, ice = o.color != null, c = o.color ?? 0xffb040;
  teleCircle(x, z, r, dur, ice ? c : 0xffa040); // (amber: not the Hammerfall's red)
  for (let k = 0; k < 8; k++) later(dur * (0.5 + k * 0.06), () => { if (G.zone === zone) P({ x, y: 9 - k, z, vy: -14, life: 0.12, size: ice ? 0.32 : 0.5, size1: ice ? 0.16 : 0.3, color: c, color1: ice ? 0x9ad8ff : 0xff3000 }); });
  later(dur, () => {
    if (G.zone !== zone) return;
    if (ice) { puff(x, 0.4, z, 14, 0xe8f4ff, 1.4, 0.6, 1.0); explosion(x, z, r, 0xcfe8ff, { shake: 0.06 }); Audio.sfx('iceBreak', { x, z, vol: 0.7 }); }
    else { explosion(x, z, r, 0xff6a10, { smoke: 0x2a1a10, shake: 0.08 }); Audio.sfx('lavaBurst', { x, z, vol: 0.6 }); }
    const D = DIFFS[G.hero.diff], dmg = monsterDmg(zone.level || 25) * D.dmg * (o.mult ?? 1);
    for (const h of heroes()) if (!h.dead && Math.hypot(h.x - x, h.z - z) < r + (h.radius || 0.5) * 0.5) damage(null, h, dmg, { burn: o.burn ? dmg * o.burn : 0, cold: o.cold || 0, drip: true });
    if (ice) for (const a of zone.actors) {
      if (a.dead || a.removed || a.team !== 'foe' || a.prop || a.airborne || a.under || Math.hypot(a.x - x, a.z - z) > r + a.radius * 0.5) continue;
      const st = o.stun ?? (a.def.vaultStun || 1.5);
      // (a boss takes nothing of its own life from one: the Shade's troll form is Stunned by it, ai.js 'icicleHit')
      if (a.boss) { emit('icicleHit', a, st); continue; }
      damage(null, a, a.hpMax * 0.08, { pure: true, quiet: true, icicle: true });
      if (!a.dead && !a.boss) { a.status.stun = Math.max(a.status.stun || 0, st); addVuln(a, 'stunned', st); }
      if (a.dead && o.shard) a.underShard = true;
    }
    if (o.shard) addShard(x, z);
    o.onLand?.(x, z);
  });
}

// ---------- Act VI: the vault's icicles and the shards they leave ----------
// SHARDS: [{ id, ix, iz, end (s, performance clock), mesh }]. A shard blocks its cell for 20 s (never a cell a hero stands
// on); the cells change in batches at most every 0.25 s (the slush's are tide.js's)
export const SHARDS = [];
const SH = { id: 0, open: [], close: [], t: 0, falls: new Map(), geo: null, mat: null, log: { falls: 0, shards: 0, skipped: 0 } };
const nowS = () => performance.now() / 1000;
function shardMesh() {
  SH.geo ||= new THREE.ConeGeometry(0.22, 1.3, 5, 1).translate(0, 0.45, 0);
  SH.mat ||= new THREE.MeshStandardMaterial({ color: 0xdcecff, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.88, emissive: 0x2a3c50 });
  const m = new THREE.Mesh(SH.geo, SH.mat); m.rotation.set(Math.PI + 0.35, Math.random() * 6.28, 0.2); m.castShadow = false;
  return m;
}
function addShard(x, z, t = 20, ixz = null) {
  const zone = G.zone, map = zone?.map; if (!map) return null;
  const ix = ixz ? ixz[0] : Math.floor(x), iz = ixz ? ixz[1] : Math.floor(z);
  if (SHARDS.some((d) => d.ix === ix && d.iz === iz)) return null;
  const d = { id: ++SH.id, ix, iz, end: nowS() + t, mesh: shardMesh(), blocked: false };
  d.mesh.position.set(ix + 0.5, 0, iz + 0.5); R.scene.add(d.mesh);
  // (never under a hero: the cell stays open while someone stands on it, closed once they step off)
  if (map.walkable(ix + 0.5, iz + 0.5)) SH.close.push(d);
  SHARDS.push(d); SH.log.shards++;
  return d;
}
function dropShard(i) {
  const d = SHARDS[i]; SHARDS.splice(i, 1);
  R.scene.remove(d.mesh);
  if (d.blocked) SH.open.push([d.ix, d.iz]);
}
// the falls: n icicles on random vault cells within r + 1 of (x, z), one per patch, a patch at most once each 4 s; a white
// circle of 1.2 m for 1 s, 0.9 x the zone's blow x HAZ6.icicle, Cold +10, a shard. o.mult multiplies the blow (a troll's)
// (co-op, on a guest: the vault falls on the host's only, which keeps the shards and sends them on 'i'; what the guest's
// own hero (MIRROR.hero) or its own high water (o.mine) brings down is asked of the host, net/coop.js 'ic' 'v', 'vl',
// 'vr'; nothing falls on the guest's own)
const guestFall = (o) => (NET.mode === 'guest' ? ((MIRROR.hero || o?.mine) && NET.h.iceOp) || (() => 0) : null);
export function vaultAt(x, z, r, n = 1, o = {}) {
  const zone = G.zone, L = zone?.L; if (!L?.vault || !(n > 0)) return 0;
  const gf = guestFall(o); if (gf) return gf('v', x, z, r, n);
  const now = nowS(), byPatch = new Map(), w = L.w, R1 = r + 1;
  for (let iz = Math.max(0, Math.floor(z - R1)); iz <= Math.min(L.h - 1, Math.floor(z + R1)); iz++) for (let ix = Math.max(0, Math.floor(x - R1)); ix <= Math.min(w - 1, Math.floor(x + R1)); ix++) {
    const id = L.vault[iz * w + ix]; if (!id || (ix + 0.5 - x) ** 2 + (iz + 0.5 - z) ** 2 > R1 * R1 || !zone.map.walkable(ix + 0.5, iz + 0.5)) continue;
    if ((SH.falls.get(id) ?? -99) > now - 4) continue;
    (byPatch.get(id) || byPatch.set(id, []).get(id)).push([ix, iz]);
  }
  const ids = [...byPatch.keys()].sort(() => Math.random() - 0.5).slice(0, n), H = HAZ6[G.hero?.diff ?? 1] || HAZ6[1];
  for (const id of ids) {
    const cs = byPatch.get(id), [ix, iz] = cs[(Math.random() * cs.length) | 0];
    SH.falls.set(id, now); SH.log.falls++;
    drip(ix + 0.5, iz + 0.5, 1.2, 1.0, { color: 0xe8f4ff, mult: 0.9 * (H.icicle ?? 0.9) * (o.mult ?? 1), cold: 10, shard: true, stun: o.stun });
  }
  if (!ids.length) SH.log.skipped++;
  return ids.length;
}
// below the ice the skills' blows on the ground bring the vault down instead of cracking ice (skills.js, skillsx.js)
export const vaultOn = () => lightKind() === 'under';
// along a line (Earthsplitter): one icicle each 4 m of it; round a ring (its Ring variant): one each 4 m of the ring
export function vaultLine(x0, z0, x1, z1, w = 2) {
  if (!G.zone?.L?.vault) return 0;
  const gf = guestFall(); if (gf) return gf('vl', x0, z0, x1, z1, w);
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 4)); let k = 0;
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; k += vaultAt(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, w, 1); }
  return k;
}
export function vaultRing(x, z, r) {
  if (!G.zone?.L?.vault) return 0;
  const gf = guestFall(); if (gf) return gf('vr', x, z, r);
  const n = Math.max(1, Math.round(Math.PI * 2 * r / 4)); let k = 0;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; k += vaultAt(x + Math.sin(a) * r, z + Math.cos(a) * r, 1, 1); }
  return k;
}
// the black water's breath shakes the vault: at the start of each high water one icicle on each patch within 20 m of her
on('tideTurn', (ph, z) => {
  if (ph !== 'high' || !z?.act6 || z !== G.zone) return;
  const pl = G.player; if (!pl || pl.dead) return;
  for (const v of z.L.spots?.vaults || []) if (Math.hypot(v.x - pl.x, v.z - pl.z) < 20) vaultAt(v.x, v.z, v.r || 3, 1, { mine: true });
});
// on every entry to an act-6 zone (world.js act6Enter): no shards, every patch ready
export function vaultEnter() {
  while (SHARDS.length) { const d = SHARDS.pop(); R.scene.remove(d.mesh); }
  SH.open.length = 0; SH.close.length = 0; SH.falls.clear(); SH.t = 0;
}
// a co-op guest: the host's shards, with their time left (tide.js cells6Apply)
export function setShards(list) {
  const keep = new Set(list.map(([ix, iz]) => ix + ',' + iz));
  for (let i = SHARDS.length - 1; i >= 0; i--) if (!keep.has(SHARDS[i].ix + ',' + SHARDS[i].iz)) dropShard(i);
  for (const [ix, iz, t] of list) { const d = SHARDS.find((s) => s.ix === ix && s.iz === iz); if (d) d.end = nowS() + t / 10; else addShard(0, 0, t / 10, [ix, iz]); }
}
// each frame (tickFlues' first line): the shards' 20 s and their cells, in batches at most every 0.25 s
function tickDrips(dt) {
  if (!SHARDS.length && !SH.open.length && !SH.close.length) return;
  const zone = G.zone, map = zone?.map; if (!map) return;
  const now = nowS();
  for (let i = SHARDS.length - 1; i >= 0; i--) if (SHARDS[i].end <= now) dropShard(i);
  if ((SH.t -= dt) > 0) return;
  SH.t = 0.25;
  const hs = heroes(), close = [], open = SH.open.splice(0);
  for (let j = SH.close.length - 1; j >= 0; j--) {
    const d = SH.close[j];
    if (!SHARDS.includes(d)) { SH.close.splice(j, 1); continue; }
    if (hs.some((h) => !h.dead && Math.floor(h.x) === d.ix && Math.floor(h.z) === d.iz)) continue;
    SH.close.splice(j, 1); d.blocked = true; close.push([d.ix, d.iz]);
  }
  if ((open.length || close.length) && map.change(open, close)) emit('mapChanged');
}
// a Great Bellows chamber that has breathed: its vents erupt along a line through the hero every 12 s while she is inside
function vents(dt, pl) {
  const B = G.zone.L.spots?.bellows; if (!B || pl.dead) return;
  const b = B.find((c) => G.hero.flags['bellows' + c.id] && Math.hypot(c.x - pl.x, c.z - pl.z) < (c.r || 9));
  if (!b) { F.ventT = Math.max(F.ventT, 4); return; }
  F.ventT -= dt;
  if (F.ventT > 0) return;
  F.ventT = 12;
  const dir = rand.range(0, 6.283), r = b.r || 9, sx = pl.x - Math.sin(dir) * r, sz = pl.z - Math.cos(dir) * r;
  vent({ x: sx, z: sz, dir, len: r * 2, w: 2.2, i: -1 - b.id });
}
function vent(f) {
  const zone = G.zone;
  teleLine(f.x, f.z, f.dir, f.len, f.w, 1.3, 0xff5010);
  Audio.sfx('bellowsInhale', { x: f.x, z: f.z, vol: 0.6 });
  later(1.3, () => {
    if (G.zone !== zone) return;
    const ux = Math.sin(f.dir), uz = Math.cos(f.dir), pl = G.player;
    for (let d = 0; d < f.len; d += 1.5) P({ x: f.x + ux * d, y: 0.3, z: f.z + uz * d, vy: rand.range(4, 8), life: 0.5, size: 0.9, size1: 0.2, color: 0xffd070, color1: 0xff3000 });
    Audio.sfx('bellowsRoar', { x: f.x, z: f.z, vol: 0.6 });
    const dx = pl.x - f.x, dz = pl.z - f.z, u = dx * ux + dz * uz, v = -dx * uz + dz * ux;
    if (!pl.dead && pl.iframes <= 0 && u > 0 && u < f.len && Math.abs(v) < f.w / 2 + pl.radius * 0.5) damage(null, pl, pl.hpMax * VENT.hitBy[di()], { pure: true, burn: pl.hpMax * VENT.burnBy[di()] });
  });
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__act6 ||= {};
  Object.assign(window.__act6, { drip, vaultAt, vaultLine, vaultRing, SHARDS, shardLog: SH.log });
}
