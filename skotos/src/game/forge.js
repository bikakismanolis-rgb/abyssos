// The Forge's Breath (Act IV, the Ashen Forge). Each flue (L.flues: mouth x, z, dir, len, w, period, phase, gallery)
// breathes: a 2.0 s inhale (a telegraph down the whole flue, the grate glowing, embers drawn in; never shortened), then
// 1.2 s of fire roaring down it (a sheet of fire on the floor behind the front) that hits once per breath for 20% of max
// life plus burn (12% on the first difficulty). Anything solid between the mouth and the hero is cover (map.los).
// Fireproof monsters ignore it; the rest take a quarter.
// Periods: 10 s, 5 s while a Hammerhorn pumps its station (setFluePumping), 1.5 s less per stage of the Forge Heat, never
// under 4.5 s. Only flues within 40 m breathe. Also here: slag dripping from the dark over the Slag Rivers, and the vents of
// a Great Bellows chamber that has breathed. startFlues(L.flues) / stopFlues() from world.js; ticked from updateAreas.
import { G, later } from './state.js';
import { DIFFS, monsterDmg } from './data.js';
import { damage } from './combat.js';
import { area } from './projectiles.js';
import { teleLine, teleCircle, killTele, P, explosion } from '../gfx/fx.js';
import { addLight, removeLight, shake } from '../gfx/gfx.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { rand } from '../core/util.js';

export const BREATH = { inhale: 2.0, fire: 1.2, base: 10, pumped: 5, perHeat: 1.5, floor: 4.5, reach: 40, hit: 0.2, hitEasy: 0.12, monsters: 0.25 };
const F = { list: null, zone: null, heat: 0, pumping: new Set(), dripT: 6, ventT: 12 };

export function startFlues(list) {
  F.zone = G.zone; F.pumping.clear();
  F.heat = G.hero?.flags?.heat || 0;
  F.list = (list || []).map((f, i) => ({ ...f, i, st: 'idle', t: f.phase ?? rand.range(1, 6), tele: null, sheet: null, light: null, hit: new Set() }));
  F.dripT = rand.range(4, 7); F.ventT = 6;
}
export function stopFlues() {
  for (const f of F.list || []) { killTele(f.tele); killTele(f.sheet); if (f.light) removeLight(f.light); }
  F.list = null; F.zone = null; F.pumping.clear();
}
export function setFlueHeat(k) { F.heat = Math.max(0, Math.min(3, k | 0)); }
// a Hammerhorn at its station (ai.js): that gallery's flue breathes twice as often
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
  f.st = 'inhale'; f.t = BREATH.inhale; f.hit.clear();
  f.tele = teleLine(f.x, f.z, f.dir, f.len, f.w, BREATH.inhale, 0xff6a10);
  f.light = addLight({ x: f.x, y: 1.2, z: f.z, color: 0xff7020, intensity: 6, range: 9, flicker: 0.3 });
  Audio.sfx('bellowsInhale', { x: f.x, z: f.z });
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
    const k = G.hero.diff === 0 ? BREATH.hitEasy : BREATH.hit, v = pl.hpMax * k;
    damage(null, pl, v, { pure: true, burn: pl.hpMax * 0.03, kx: ux, kz: uz });
    emit('flueHit', f);
  }
  for (const a of G.actors) {
    if (a.dead || a.team !== 'foe' || f.hit.has(a) || a.def.fireproof || a.def.flesh === 'magma' || a.airborne || a.prop) continue;
    if (!reached(a.x, a.z) || !inFlue(f, a.x, a.z, a.radius * 0.5)) continue;
    f.hit.add(a);
    damage(null, a, (pl ? pl.hpMax : 100) * BREATH.hit * BREATH.monsters, { burn: a.hpMax * 0.03 });
  }
}
// slag drips from the dark over the Slag Rivers: near lava, now and then, a drop where the hero stands
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
  const x = pl.x + rand.range(-1.5, 1.5), z = pl.z + rand.range(-1.5, 1.5);
  if (!G.zone.map.walkable(x, z)) return;
  slag(x, z, 1.6, 1.0, 1.0);
}
export function slag(x, z, r, dur, mult) {
  const zone = G.zone;
  teleCircle(x, z, r, dur, 0xff5010);
  for (let k = 0; k < 8; k++) later(dur * (0.5 + k * 0.06), () => { if (G.zone === zone) P({ x, y: 9 - k, z, vy: -14, life: 0.12, size: 0.5, size1: 0.3, color: 0xffb040, color1: 0xff3000 }); });
  later(dur, () => {
    if (G.zone !== zone) return;
    explosion(x, z, r, 0xff6a10, { smoke: 0x2a1a10, shake: 0.08 });
    Audio.sfx('lavaBurst', { x, z, vol: 0.6 });
    const D = DIFFS[G.hero.diff], dmg = monsterDmg(zone.level || 25) * D.dmg, pl = G.player;
    if (pl && Math.hypot(pl.x - x, pl.z - z) < r + pl.radius * 0.5) damage(null, pl, dmg * mult, { burn: dmg * 0.4 });
    area('fire', x, z, r * 0.8, 3, { team: 'foe', dmg: dmg * 0.2, tick: 0.5 });
  });
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
    if (!pl.dead && pl.iframes <= 0 && u > 0 && u < f.len && Math.abs(v) < f.w / 2 + pl.radius * 0.5) damage(null, pl, pl.hpMax * (G.hero.diff === 0 ? 0.07 : 0.1), { pure: true, burn: pl.hpMax * 0.02 });
  });
}
