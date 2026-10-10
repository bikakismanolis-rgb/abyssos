// The Cold (Act V): a meter on the hero, 0 to 100, on the Frozen Coast and the Farthest Light only. It never builds from
// simply being outdoors.
// - In: coldAdd(v, o), the one way in, every gain times HAZ5[diff].cold: wading (the tide, brine, slush) +4/s; a blizzard
//   gust on the Farthest Light out of the lee (of a berg, the ship, a warm pool) +2.5/s; the blows that carry o.cold
//   (combat.js hurtHero): a wash-out 20, a plunge 35, a Skua's bite 3, a Sunken's blow from the water 4, an Ice Singer's
//   wail 10, the Rime Bear's roar 15, the Black Wave and the Black Breath 20, the Deep Cold 30.
// - Out: -3/s anywhere dry and out of a gust; -12/s in a warm pool (light.js warmAt: lamp light, a lit hole lamp, the
//   camp's brazier); -8/s in burning ground; a beam: warmHero (-15 at once, then Warmed: 4 s with no build-up).
// - What it does: 50 Chilled (-8% move and attack speed), 75 Freezing (-15%, no regeneration), 100 Frostbite: frozen in
//   place 1 s with an ice tint (rootHero; a dodge breaks it), 5% of her life, then 70. In a boss fight Frostbite is a 50%
//   slow for 2 s instead, and it waits while a red telegraph is under her.
// - For the HUD (story's): COLD { v, state, warmT, k, dir }, bus 'cold' (state) on each change, 'frostbite'; FX.chill for
//   the breath (fx.js walk5); the frost overlay reads COLD.v (fx.js frostVignette).
import { G } from './state.js';
import { HAZ5 } from './data.js';
import { damage, rootHero } from './combat.js';
import { warmAt, fireAt } from './light.js';
import { FX, freezeCrystals, glowBurst } from '../gfx/fx.js';
import { emit, on } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { clamp } from '../core/util.js';

export const COLD = { v: 0, state: 'none', warmT: 0, k: 0, dir: 0, fbT: 0, held: false };
const haz = () => HAZ5[G.hero?.diff ?? 1] || HAZ5[1];
export const coldZone = () => !!G.zone?.act5;
const stateOf = (v) => (v >= 100 ? 'frostbite' : v >= 75 ? 'freezing' : v >= 50 ? 'chilled' : 'none');

// the one way in: v of Cold, times the difficulty's factor; nothing outside Act V's zones, nothing while she is Warmed
// (o.pierce: the Deep Cold reaches through the warmth), nothing while she is dead
export function coldAdd(v, o = {}) {
  const pl = G.player;
  if (!v || !pl || pl.dead || !coldZone()) return 0;
  if (v > 0) {
    if (pl.buffs?.warmed > 0 && !o.pierce) return 0;
    v *= haz().cold;
  }
  const v0 = COLD.v;
  COLD.v = clamp(COLD.v + v, 0, 100);
  settle();
  return COLD.v - v0;
}
// a beam: -15 at once, then t seconds of Warmed (the Cold does not rise); a flame on the HUD (pl.buffs.warmed)
export function warmHero(t = 4) {
  const pl = G.player; if (!pl || pl.dead || !coldZone()) return;
  COLD.v = Math.max(0, COLD.v - 15);
  pl.buffs.warmed = Math.max(pl.buffs.warmed || 0, t);
  if (COLD.state === 'frostbite' && COLD.held) COLD.held = false;
  glowBurst(pl.x, 1.2, pl.z, 0xffe0b0, 10, 1.5, 0.25, 0.5);
  settle();
}
// on leaving Act V's zones and on a respawn: all warm again
export function resetCold() {
  COLD.v = 0; COLD.k = 0; COLD.dir = 0; COLD.fbT = 0; COLD.held = false; COLD.warmT = 0;
  if (COLD.state !== 'none') { COLD.state = 'none'; emit('cold', 'none'); }
  FX.chill = 0;
}
on('zoneEnter', (id, z) => { if (!z?.act5) resetCold(); });
on('respawn', () => resetCold());

// the lee of the gust: behind a berg (downwind: the blizzard blows west, fx.js) or beside the ship, or in a warm pool
function lee(z, x, zz) {
  const S = z.L.spots || {};
  for (const b of S.bergs || []) {
    const dx = x - b.x, dz = zz - b.z, d = Math.hypot(dx, dz);
    if (d < b.r + 1.5 || (dx < 0 && dx > -(b.r + 6) && Math.abs(dz) < b.r + 1)) return true;
  }
  if (S.ship && Math.hypot(x - S.ship.x, zz - S.ship.z) < 11) for (const [cx, cz] of S.ship.cells || []) if (Math.abs(cx + 0.5 - x) < 3 && Math.abs(cz + 0.5 - zz) < 3) return true;
  return !!warmAt(x, zz);
}

// ---------- per frame (player.js, after tickLight; Act V zones only) ----------
export function tickCold(dt) {
  const pl = G.player, z = G.zone;
  if (!pl || pl.dead || !coldZone()) { if (COLD.v || COLD.state !== 'none') resetCold(); return; }
  const v0 = COLD.v, wet = !!pl.inWater, gust = !!z.gust?.on && !lee(z, pl.x, pl.z);
  const warm = warmAt(pl.x, pl.z), fire = !warm && fireAt(pl.x, pl.z, 0.3);
  COLD.warmT = pl.buffs.warmed || 0;
  let gain = (wet ? 4 : 0) + (gust ? 2.5 : 0);
  if (gain) coldAdd(gain * dt);
  if (warm) COLD.v -= 12 * dt;
  else if (fire) COLD.v -= 8 * dt;
  else if (!gain || COLD.warmT > 0) COLD.v -= 3 * dt;
  COLD.v = clamp(COLD.v, 0, 100);
  const dv = COLD.v - v0; COLD.dir = dv > 1e-4 ? 1 : dv < -1e-4 ? -1 : 0;
  // Frostbite: frozen (or slowed, in a boss fight) for its time; after it the Cold sits at 70
  if (COLD.fbT > 0 && (COLD.fbT -= dt) <= 0) COLD.fbT = 0;
  if (COLD.v >= 100 && COLD.fbT <= 0) frostbite(pl);
  settle();
}
// the state from the value (Frostbite while it holds her), the HUD's share, the breath
function settle() {
  const st = COLD.fbT > 0 || COLD.held ? 'frostbite' : stateOf(Math.min(COLD.v, 99.9));
  COLD.k = COLD.v / 100;
  FX.chill = clamp((COLD.v - 25) / 75, 0, 1);
  if (st !== COLD.state) { COLD.state = st; emit('cold', st); }
}
// at 100: frozen in place for 1 s with the ice on her (a dodge breaks it), 5% of her life, and the Cold back to 70. In a
// boss fight: a 50% slow for 2 s instead, held while a red telegraph is under her (the boss's blow comes first)
function frostbite(pl) {
  const boss = G.bossActor && !G.bossActor.dead;
  if (boss && redUnder(pl.x, pl.z)) { COLD.held = true; return; }
  COLD.held = false;
  if (boss) { pl.status.slow = Math.max(pl.status.slow, 2); pl.status.slowK = Math.max(pl.status.slowK, 0.5); COLD.fbT = 2; }
  else { rootHero(1.0, { tint: 0x9ad8ff }); COLD.fbT = 1; }
  damage(null, pl, pl.hpMax * 0.05, { pure: true, frost: true });
  COLD.v = 70;
  freezeCrystals(pl.x, pl.z, 1.4, 22);
  Audio.sfx('frost', { x: pl.x, z: pl.z });
  emit('frostbite', boss ? 'slow' : 'frozen');
}
// a live red or orange telegraph (harm) whose shape covers (x, z): circles, cones and lines (fx.js teleCircle/Cone/Line)
function redUnder(x, z) {
  for (const t of FX.teles || []) {
    if (!t.alive || t.t >= t.dur) continue;
    const m = t.m, u = m.material.uniforms, c = u.uColor.value;
    if (!(c.r > 0.6 && c.r > c.b * 1.6 && c.r > c.g)) continue;
    const dx = x - m.position.x, dz = z - m.position.z, sh = u.uShape.value;
    if (sh === 0 && dx * dx + dz * dz < m.scale.x * m.scale.x) return true;
    const rot = m.rotation.y - Math.PI, fx = Math.sin(rot), fz = Math.cos(rot);
    if (sh === 1) { const d = Math.hypot(dx, dz), a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)); if (d < m.scale.x && a < u.uArc.value) return true; }
    if (sh === 2) { const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); if (along >= 0 && along <= m.scale.z * 2 && side <= m.scale.x) return true; }
  }
  return false;
}
// what the Cold does to her speed (moveMul, the attack speed): Chilled -8%, Freezing and Frostbite -15%
export function coldMul() {
  if (!coldZone()) return 1;
  return COLD.v >= 75 ? 0.85 : COLD.v >= 50 ? 0.92 : 1;
}
// Freezing: no life comes back on its own
export const coldNoRegen = () => coldZone() && COLD.v >= 75;

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__act5 ||= {};
  window.__act5.cold = { COLD, coldAdd, warmHero, resetCold, coldMul };
}
