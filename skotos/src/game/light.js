// Light: Act IV's Light and Shroud, and Act V's sea-lights. Each zone says what its light is (world.js ZONES[id].light):
// 'ember' on the Field of Ash and in the Ashen Forge, where light decides what the dead can be hurt by (the Shrouded take
// 30% outside it, combat.js) and the Cradle drinks the fires round it; 'sea' on the Frozen Coast and the Farthest Light,
// where light warms the hero (cold.js), holds the ice (ice.js) and reveals the Skotos's creatures, and the sea-lights'
// beams turn. What is lit: the hero's Ember Cradle (a ring of ZONES[id].ring metres: 6 in Act IV, 4 in Act V; 9 m for 8 s
// after it drinks, in 'ember' zones only; a boss may override it, setHeroLight), lit interactables (it.lit && it.lightR:
// waylamps, braziers, the bellows' fire-pits, sea-lights, cairns, Name-stones, hole lamps), burning ground (G.areas
// 'fire'), pools (addLightPool) and beams (addBeam). Lamp light (lampLightAt) is the steadier kind: lamps and lamp pools,
// never fire, never a beam, never a Breathing-hole's rim lamp. Nothing here runs where a zone has no light (LIGHT.force
// turns it on anywhere, for tests: true or 'ember' for Act IV's rules, 'sea' for Act V's).
import * as THREE from 'three';
import { G } from './state.js';
import { R, addLight, removeLight, trembler, trembleStep, trembleAmp } from '../gfx/gfx.js';
import * as FXM from '../gfx/fx.js';
import * as B from '../world/build.js';
import { SEA, beamMesh } from '../world/sea.js';
import { tex } from '../gfx/textures.js';
import { attachUpright } from './actors.js';
import { ZONES } from './world.js';
import { warmHero } from './cold.js';
import { stageAt } from './ice.js';
import Audio from '../audio/audio.js';
import { emit, on } from '../ui/bus.js';
import { t } from '../i18n/i18n.js';
import { addVuln } from './combat.js';
import { HAZ6 } from './data.js';
import { NET } from '../net/state.js';
import { clamp, damp, rand, angleDiff } from '../core/util.js';

export const LIGHT = { force: false, base: 6, swell: 9, swellT: 8 };
// the hero's ring for the shaders that show what only her light shows (Act VI: the First's marks, fx.js marksMesh): its
// drawn radius and where she stands, written each frame by tickLight (the object lives in fx.js, which cannot import this)
export { FIRE_U } from '../gfx/fx.js';
const S = { zone: null, pools: [], beams: [], over: null, owner: null, dark: null, swellT: 0, halfT: 0, sipT: 0, streamT: 0, ring: null, ringR: 6, cradle: null, cradleAv: null, flame: null, range0: 15, litT: 0, ice: 0 };
const V = new THREE.Vector3();
// in a boss's darkness her own fire (a Mage's Meteor) lights only as it bursts, and the fires the variants leave behind
// (area o.dim) not at all: the braziers are the way through Ivar's dark
const FLARE = 0.5;

// the zone's kind of light: 'ember', 'sea' or null (ZONES is read at run time only: world.js imports this file)
export function lightKind() {
  if (LIGHT.force) return typeof LIGHT.force === 'string' ? LIGHT.force : 'ember';
  return ZONES[G.zone?.id]?.light || null;
}
export const lightOn = () => !!lightKind();
// the Shroud belongs to the ember zones and to the act below the ice ('under'); the Cradle's drinking and its swell to the
// ember zones only
export const shroudOn = () => { const k = lightKind(); return k === 'ember' || k === 'under'; };
const ember = () => lightKind() === 'ember';
// what a Shrouded foe outside light takes: 30% (Act IV), the act's row below the ice (HAZ6.shroud: 45% on Wanderer)
export const shroudK = () => (lightKind() === 'under' ? h6().shroud ?? 0.3 : 0.3);
const h6 = () => HAZ6[G.hero?.diff ?? 1] || HAZ6[1];

// ---------- queries ----------
// is (x, z) in light? Everywhere is, in a zone with no light. o.ring === false: the hero's own ring does not count (the
// Skuas mob a hero who lingers in the dark with only the Cradle's light round her). o.pad: a body's half-width (a light that
// reaches the body lights it: combat.js, the Shroud's look); 0 for a point (the hero in the Dark). Beams stay a point test
export function lightAt(x, z, o = {}) {
  if (!lightOn()) return true;
  const pad = o.pad || 0;
  for (const p of S.pools) if (p.r > 0 && !p.beam && !p.fake && (p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + pad) ** 2) return true;
  if (S.beams.length && inBeam(x, z)) return true;
  // Karthax has drunk every fire: only the pools are left (Isarn's lantern, the ghosts)
  if (S.dark) return false;
  const pl = G.player, hr = heroLightR();
  if (o.ring !== false && pl && !pl.dead && hr > 0 && (pl.x - x) ** 2 + (pl.z - z) ** 2 < (hr + pad) ** 2) return true;
  // (below the ice every hero's ring is light, not only the page's own: the other heroes here, each with its own light pools)
  if (NET.remotes.length && fireOn()) for (const a of NET.remotes) {
    if (a.dead || a.removed) continue;
    const rr = ringOf(a); if (rr > 0 && (a.x - x) ** 2 + (a.z - z) ** 2 < (rr + pad) ** 2) return true;
    for (const p of a.lightPools || []) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + pad) ** 2) return true;
  }
  if (lampAt(x, z, pad)) return true;
  return !!fireAt(x, z, 1.5 + pad);
}
// lit by a lamp, a brazier or a fire-pit (what blinds a landing Ashwing)
export function lampAt(x, z, pad = 0) {
  for (const it of G.zone?.interact || []) if (it.lit && it.lightR && (it.x - x) ** 2 + (it.z - z) ** 2 < (it.lightR + pad) ** 2) return it;
  return null;
}
// burning ground at (x, z), pad metres past its edge (in a boss's dark a hero's fire, hers or a co-op companion's drawn
// here, team 'vis', lights only as it bursts, and
// the fires the skills' variants leave, a.dim, never: Rain of Fire, Pale Cinder, Ember Dance)
// warm: asked for the Cold (cold.js). A fire that follows her about (a.nowarm: Ember Dance) never answers, for warmth
// or for light (a Skua would never dive at a spinning Warden), and the Cradle never drinks it
export function fireAt(x, z, pad = 0, warm = false) {
  for (const a of G.areas) if (a.kind === 'fire' && a.t <= a.dur && !a.nowarm && !(S.over != null && (a.team === 'hero' || a.team === 'vis') && (a.t > FLARE || a.dim)) && (a.x - x) ** 2 + (a.z - z) ** 2 < (a.r + pad) ** 2) return a;
  return null;
}
// lamp light (Act V): what holds the ice, keeps the Sunken from waking with the tide, and keeps the Icemaw, the Hands and
// the Ice Singer's song out: lit lamps (a sea-light's base, the hearth, a cairn, a Name-stone, a brazier) and the pools
// added with { lamp: true } (the keepers' lamps, the marker-lights). Never fire (it melts), never a beam, never a
// Breathing-hole's rim lamp (the seals could not work)
export function lampLightAt(x, z) {
  for (const it of G.zone?.interact || []) if (it.lit && it.lightR && it.kind !== 'holeLamp' && (it.x - x) ** 2 + (it.z - z) ** 2 < it.lightR * it.lightR) return it;
  for (const p of S.pools) if (p.lamp && !p.fake && p.r > 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < p.r * p.r) return p;
  return null;
}
// a warm pool (cold.js: -12/s): lamp light, a lit hole lamp, the camp's brazier on the ice
export function warmAt(x, z) {
  const l = lampLightAt(x, z); if (l) return l;
  for (const it of G.zone?.interact || []) if (it.lit && it.kind === 'holeLamp' && (it.x - x) ** 2 + (it.z - z) ** 2 < it.lightR * it.lightR) return it;
  const br = G.zone?.L?.spots?.brazier;
  if (br && (br.x - x) ** 2 + (br.z - z) ** 2 < 16) return br;
  return null;
}
// the Cradle's ring: ZONES[id].ring metres (6 in Act IV, 4 in Act V), 9 m while swollen (Act IV), halved for a while when a
// Smoke-eater gets a claw in it; a boss may set it
export function heroLightR() {
  if (S.over != null) return S.over;
  // (below the ice the ring is the Carried Fire's: FIRE.r, a War Cry's flare, the lantern chain; never S.over there)
  if (fireOn()) return ringOf(G.player);
  return (S.swellT > 0 && ember() ? LIGHT.swell : LIGHT.base) * (S.halfT > 0 ? 0.5 : 1);
}
// a skylight's pool at (x, z) (Act VI: it fills the Carried Fire a little and warms against the Cold, cold.js)
export function skyAt(x, z) {
  for (const p of S.pools) if (p.sky && p.r > 0 && (p.x - x) ** 2 + (p.z - z) ** 2 < p.r * p.r) return p;
  return null;
}
// a boss's darkness: r metres (3.5 in Ivar's dark, 0 in Karthax's last fire) until null, or until the owner dies
export function setHeroLight(r, owner = null) { S.over = r; S.owner = r == null ? null : owner; }
// only the pools give light (Karthax's Last Fire), until off or the owner dies
export function setLightDark(on, owner = null) { S.dark = on ? owner || true : null; }
export function halveCradle(t = 4) { S.halfT = Math.max(S.halfT, t); }
export const cradleSwollen = () => S.swellT > 0;

// ---------- Act VI: the Carried Fire (docs/act6-contract.md, Light) ----------
// Below the ice ('under' zones) the Cradle's ring is a meter, FIRE.r metres between 0 and FIRE.max (ZONES[id].ring, 4.5 m,
// times the Lamplight track's bonus). It never drains by itself: only the dark's actions take it (fireDrain: a Drink, a
// Forgetting Touch, a snap, wading black water, a Black Flare...), each times HAZ6.coal; only true light fills it (standing
// in lamp light at HAZ6.refill m/s, 1.5 on Warden; a skylight 0.3 m/s; the names falling from above; a burning cask
// 1 m/s; fireFill for the kills and a Lampbearer's death). Dim under 1.5 m (the ring pulses; bus 'fireDim'), Out at 0
// (bus 'fireOut': the ring gone, her own light 4 m, the Cold's gains doubled, every unlit foe Shrouded wherever it
// stands); a second in true lamp light brings it back at 2.5 m (fireRelight, bus 'fireBack'). Every entry starts full
// (fireEnter: a fresh coal from the camp). Co-op: a remote hero's ring is a.ringR (setRemoteLight, from its presence),
// and each ring gains 1 m for every other living hero within 6 m (at most 2: the lantern chain), drawn and as light
export const FIRE = { r: 4.5, max: 4.5, state: 'full', t: 0 };
export const fireOn = () => lightKind() === 'under';
// the Lamplight Mastery track (progression.js 'lamp': ringPct): the base ring, never a swell or a boss's override
export const lampBonus = () => G.stats?.ringPct || 0;
export const fireMax = () => (ZONES[G.zone?.id]?.ring ?? 4.5) * (1 + lampBonus() / 100);
// o: { src (the log), half (a Drink, a snap, a Gnaw: halved for a wearer of the Lure-bone) }; the Shade's Ring floors it
export function fireDrain(v, o = {}) {
  if (!fireOn() || !(v > 0) || FIRE.state === 'out') return 0;
  const legs = G.stats?.legs;
  let d = v * (h6().coal ?? 1);
  if (o.half && legs?.has('ketosLure')) d *= 0.5;
  const floor = legs?.has('shadeRing') ? Math.min(1.5, FIRE.r) : 0, r0 = FIRE.r;
  FIRE.r = Math.max(floor, FIRE.r - d);
  if (o.src) { FIRE_LOG.drains[o.src] = (FIRE_LOG.drains[o.src] || 0) + (r0 - FIRE.r); }
  fireState();
  return r0 - FIRE.r;
}
export function fireFill(v) {
  if (!fireOn() || !(v > 0) || FIRE.state === 'out') return 0;
  const r0 = FIRE.r; FIRE.r = Math.min(FIRE.max, FIRE.r + v); fireState();
  return FIRE.r - r0;
}
export function fireRelight() {
  if (!fireOn() || FIRE.state !== 'out') return;
  FIRE.r = Math.min(FIRE.max, 2.5); FIRE_LOG.relit++; fireState();
  const pl = G.player; if (pl) FXM.glowBurst?.(pl.x, 1.1, pl.z, 0xffb050, 16, 2.2, 0.3, 0.6);
  Audio.sfx('lanternDrink', { vol: 0.8 });
  emit('toast', t('q.fireBack'), 'quest'); emit('fireBack');
}
// on every entry to an act-6 zone (world.js act6Enter): a fresh coal, the build's true fires as lamp light (their light is
// the layout's own, L.lights: a brazier 4 m, a fire-pot 3 m, a fire-pit 5 m, her fire at the centre 5 m), and the names'
// clock set to fall half a minute into the black water's first rise
export function fireEnter(z) {
  FIRE.max = fireMax(); FIRE.r = FIRE.max; FIRE.state = 'full'; FIRE.t = 0; S.relightT = 0; S.flareT = 0; S.dimHint = S.dimHint || false;
  for (const l of z?.L?.lights || []) {
    if (!(l.flicker === 0.35 || l.flicker === 'tremble' || l.centre)) continue;
    const r = l.centre ? 5 : l.range <= 7 ? 3 : l.intensity >= 22 ? 5 : 4;
    addLightPool(l.x, l.z, r, Infinity, 'fire6', { lamp: true, light: false, tremble: true });
  }
  // the skylights: the aurora through the vault's thinnest places (gen6 L.spots.sky, r 3-5), true light that fills a little
  for (const sk of z?.L?.spots?.sky || []) addLightPool(sk.x, sk.z, sk.r || 4, Infinity, 'sky6', { sky: true, light: false });
  const H = h6(), cfg = z?.L?.tideCfg, first = cfg ? cfg.phases[0] * (H.tide ?? 120) / 120 : 0;
  Object.assign(NAMES, { t: Math.max(0, (H.namesEvery ?? 90) - first - 30), on: false, left: 0, list: null, i: 0, sayT: 0 });
}
// the ring at r for t seconds (War Cry 8 m for 3 s), drawn and counted; never through S.over
export function flareRing(r, t) { S.flareR = Math.max(S.flareT > 0 ? S.flareR : 0, r); S.flareT = Math.max(S.flareT || 0, t); }
// the radius a hero's ring lights with: this page's (FIRE.r or a flare) or a remote stand-in's (a.ringR), with the chain
export function ringOf(a) {
  if (!a) return 0;
  const r = a === G.player ? Math.max(FIRE.r, S.flareT > 0 ? S.flareR : 0) : a.ringR || 0;
  if (r <= 0) return 0;
  let n = 0;
  const near = (b) => b && b !== a && !b.dead && !b.removed && (b.x - a.x) ** 2 + (b.z - a.z) ** 2 < 36;
  if (near(G.player)) n++;
  for (const b of NET.remotes) if (near(b)) n++;
  return r + Math.min(2, n);
}
// another hero's ring and its light pools (up to three: { x, z, r }), from its presence or the host's snapshot (net)
export function setRemoteLight(a, r, pools) { if (!a) return; a.ringR = r || 0; a.lightPools = (pools || []).slice(0, 3); }
export const FIRE_LOG = { drains: {}, fills: 0, relit: 0, outs: 0, dims: 0, min: Infinity };
function fireState() {
  const st = FIRE.r <= 1e-3 ? 'out' : FIRE.r < 1.5 ? 'dim' : 'full';
  if (st === 'out') FIRE.r = 0;
  FIRE_LOG.min = Math.min(FIRE_LOG.min, FIRE.r);
  if (st === FIRE.state) return;
  const was = FIRE.state; FIRE.state = st;
  if (st === 'dim' && was === 'full') {
    FIRE_LOG.dims++; emit('fireDim');
    if (!S.dimHint) { S.dimHint = true; emit('toast', t('hint.carry')); }
  } else if (st === 'out') {
    FIRE_LOG.outs++; S.relightT = 0;
    const pl = G.player; if (pl) FXM.puff?.(pl.x, 1.0, pl.z, 8, 0x2a2624, 1, 0.8, 1.2);
    Audio.sfx('torchOut', { vol: 0.8 });
    emit('toast', t('q.fireOut'), 'quest'); emit('fireOut');
  }
}
// each frame below the ice (tickLight, before the Cold reads FIRE.state): what drains and fills the ring, its turns, and
// the relight. Fills do not add: the strongest true light she stands in counts
function fireTick(dt, pl) {
  const H = h6();
  FIRE.max = fireMax(); if (FIRE.r > FIRE.max) FIRE.r = FIRE.max;
  if (S.flareT > 0) S.flareT -= dt;
  if (pl.dead) return;
  FIRE.t += dt;
  const lamp = lampLightAt(pl.x, pl.z);
  if (FIRE.state === 'out') {
    // (Out: a second in true lamp light lights the coal again)
    if (lamp) { if ((S.relightT += dt) >= 1) fireRelight(); } else S.relightT = 0;
    return;
  }
  // the dark's slow drain: wading black water, a Black Spray's puddle
  let drain = pl.inWater === 'tide' ? 0.15 : 0;
  if (!drain) for (const a of G.areas) if (a.kind === 'black' && a.t <= a.dur && (a.x - pl.x) ** 2 + (a.z - pl.z) ** 2 < a.r * a.r) { drain = 0.15; break; }
  if (drain) fireDrain(drain * dt, { src: 'wade' });
  let fill = 0;
  if (lamp) fill = H.refill ?? 1.5;
  if (NAMES.on) fill = Math.max(fill, H.refill ?? 1.5);
  if (fill < 1) { const f = fireAt(pl.x, pl.z, 0, true); if (f?.floats) fill = Math.max(fill, 1.0); }
  if (fill < 0.3 && skyAt(pl.x, pl.z)) fill = 0.3;
  if (fill) FIRE_LOG.fills += fireFill(fill * dt);
}

// ---------- Act VI: the Names from Above (the Drained Sea; docs/act6-contract.md, Names from Above) ----------
// Every HAZ6.namesEvery s (paused while a boss fights) a low bell, then the names the Saltborn say each night fall through
// the ice (story.js rollNames6), one each 0.8 s, for HAZ6.namesBase + 0.5 s for each Name-stone she lit (at most four):
// while they fall every hero's ring fills at HAZ6.refill m/s and every unlit foe in the zone is Revealed (the listening
// ones stop, ai.js). Bus 'namesFall' (z, list) and 'namesEnd' (z)
export const NAMES = { t: 0, on: false, left: 0, list: null, i: 0, sayT: 0, falls: 0 };
let rollNamesFn = null;
// (story.js hands over its list; light.js cannot import story.js)
export function setNamesRoll(fn) { rollNamesFn = fn; }
// a co-op guest: the host's window, its time left and its index (the host's clock decides; this page fills its own ring)
export function namesFromHost(left, idx) {
  if (NAMES.on && NAMES.idx === idx) { NAMES.left = left; return; }
  if (NAMES.idx === idx) return;
  NAMES.idx = idx; NAMES.on = true; NAMES.left = left; NAMES.i = 0; NAMES.sayT = 0.2;
  NAMES.list = rollNamesFn ? rollNamesFn(false) : null;
  emit('namesFall', G.zone, NAMES.list);
}
export function namesTick(z, dt) {
  if (z?.id !== 'drained' || !G.player) return;
  const H = h6();
  // (a co-op guest keeps no clock of its own: the host's window comes in its snapshot, namesFromHost)
  if (NET.mode === 'guest') { if (NAMES.list && NAMES.i < NAMES.list.length && (NAMES.sayT -= dt) <= 0) { NAMES.sayT = 0.8; emit('say', NAMES.list[NAMES.i++]); } if (NAMES.on && (NAMES.left -= dt) <= 0) { NAMES.on = false; emit('namesEnd', z); } return; }
  // (the names fall 0.8 s apart to the last, «Σκότος.», after the window too, with no effect then)
  if (NAMES.list && NAMES.i < NAMES.list.length && (NAMES.sayT -= dt) <= 0) { NAMES.sayT = 0.8; emit('say', NAMES.list[NAMES.i++]); }
  if (NAMES.on) {
    NAMES.left -= dt;
    if (NAMES.left <= 0) { NAMES.on = false; emit('namesEnd', z); }
    return;
  }
  if (G.bossActor && !G.bossActor.dead) return;
  if ((NAMES.t += dt) < (H.namesEvery ?? 90)) return;
  NAMES.t = 0; NAMES.falls++;
  const F = G.hero.flags;
  NAMES.list = rollNamesFn ? rollNamesFn(false) : ['name.first', 'name.einar', 'name.arna', 'name.skotos'];
  NAMES.left = (H.namesBase ?? 5) + 0.5 * Math.min(4, (F.names || []).length);
  NAMES.on = true; NAMES.i = 0; NAMES.sayT = 1.5; NAMES.left += 1.5;
  Audio.sfx('nameBell', { vol: 0.8 });
  // (every unlit foe in the zone is Revealed for the window: the act's Lit factor, HAZ6.reveal)
  for (const a of G.zone.actors) if (!a.dead && !a.removed && a.team === 'foe' && a.def?.unlit) { a.revealed = Math.max(a.revealed || 0, NAMES.left); addVuln(a, 'revealed', NAMES.left, { quiet: true }); }
  emit('namesFall', z, NAMES.list);
}
// the high water dims the skylights to half for 10 s (the black water's breath on the vault)
on('tideTurn', (ph, z) => { if (ph === 'high' && z?.act6 && z === G.zone) for (const p of S.pools) if (p.sky) shrinkPool(p, p.r0 * 0.5, 10); });

// ---------- the lamps a Smoke-eater eats: interactables that say they can be put out (it.snuff), or of a lamp kind ----------
const LAMPS = new Set(['waylamp', 'brazier', 'bellows', 'firepit']);
export const isLamp = (it) => !!(it.snuff || LAMPS.has(it.kind));
// the nearest lamp within r that is lit (lit = true) or dark (lit = false)
export function lampNear(x, z, r, lit = true, skip = null) {
  let best = null, bd = r * r;
  for (const it of G.zone?.interact || []) {
    if (!isLamp(it) || !!it.lit !== lit || it === skip) continue;
    const d2 = (it.x - x) ** 2 + (it.z - z) ** 2; if (d2 < bd) { bd = d2; best = it; }
  }
  return best;
}
// put a lamp out (the story's it.snuff decides what that means for a waylamp, a brazier, a bellows fire-pit)
export function snuffLamp(it, by = null) {
  if (!it?.lit) return;
  if (it.snuff) it.snuff(by); else it.lit = false;
  FXM.puff?.(it.x, 1.4, it.z, 8, 0x2a2624, 1, 0.8, 1.4);
  emit('lampSnuffed', it, by);
}
// a Gorged Smoke-eater's death gives its fire back to the nearest dark lamp within r
export function relightNear(x, z, r) {
  const it = lampNear(x, z, r, false); if (!it) return null;
  if (it.relight) it.relight(); else it.lit = true;
  FXM.glowBurst?.(it.x, 1.5, it.z, 0xffb050, 24, 3, 0.3, 0.6);
  emit('lampRelit', it);
  return it;
}

// ---------- pools ----------
// a disc of light r metres for dur seconds (Infinity: until removed). o: { owner (gone with it), fx: false (no glow of its
// own), decal: false (it lights, but draws nothing on the ground: a beam's moving light), lamp: true (lamp light, see
// lampLightAt), color, intensity }. The pool is a plain object: move it (x, z) or resize it (r) freely; shrink(p, r, t) for
// a while. (On the snow of the sea zones a pool is a soft warm glow with no rim, and its light a third as strong: the ember
// zones' pool burns white snow into a bright disc and drowns the fire that throws it)
// Act VI's light (docs/act6-contract.md, Light): o.tremble (by default a lamp pool's in an 'under' zone): true light, its
// drawn radius +-8% and its intensity (the decal's and its light's) +-10% (at quality 0 +-7% and +-8.5%: gfx.js
// trembleAmp) from band-limited noise (gfx.js trembler, its own seed: o.seed), +-3% and steady with 'reduce flicker'
// (G.settings.flicker); what it lights for the rules (p.r) never trembles. o.fake: false light, dead still, a hard rim,
// and lightAt, lampLightAt and warmAt pass it by. o.light === false: the decal without a light of its own (a false pool,
// a skylight, a niche). o.core: 'dark' (a fake pool's): a dark core
// over the ground under its rim (the black lamps, 0x8a70ff). o.sky: a skylight's (p.sky for the Carried Fire's fills; its
// look green-white and soft). All of them draw the act's own disc (discMesh's o)
export function addLightPool(x, z, r, dur = Infinity, tag = null, o = {}) {
  const snow = lightKind() === 'sea', fake = !!o.fake, trem = !fake && (o.tremble ?? (!!o.lamp && lightKind() === 'under'));
  const p = { x, z, r, r0: r, t: 0, dur, tag, owner: o.owner || null, shrinkT: 0, color: o.color ?? (o.core === 'dark' ? 0x8a70ff : fake ? 0xd8e0ff : o.sky ? 0xa8e8cc : 0xffc070), lamp: !!o.lamp, a0: snow ? 0.13 : 0.3, k: 1, ki: 1, sc: 1 };
  if (fake) p.fake = true;
  if (o.sky) p.sky = true;
  if (trem) { p.seed = o.seed ?? Math.floor(Math.random() * 2147483647); p.trem = trembler(p.seed); p.sc = TREM_MAX; }
  if (o.fx !== false) {
    const I = o.intensity ?? 12 + r * 2;
    // (a trembling pool's light follows its tremble, not the pool's own flicker; a false one's never flickers)
    if (o.light !== false) { p.light = addLight({ x, y: 1.8, z, color: p.color, intensity: snow ? I * 0.36 : I, range: r * 2, flicker: o.flicker ?? (trem || fake ? 0 : 0.12) }); p.I0 = p.light.intensity; }
    if (o.decal !== false) { p.mesh = discMesh(snow ? warmer(p.color) : p.color, p.a0, snow ? 0 : 0.6, trem || fake || o.core || o.sky ? { hard: fake, core: o.core === 'dark' } : null); p.mesh.position.set(x, 0, z); p.mesh.scale.setScalar(r * p.sc); B.drape(p.mesh, G.zone?.L); R.scene.add(p.mesh); }
  }
  S.pools.push(p);
  return p;
}
// (a trembling pool's disc is drawn this much bigger than its radius, and cut to its trembling radius in the shader, so it
// is laid on the ground once)
const TREM_MAX = 1.09;
// a pool's colour on snow: deeper and warmer, so the white under it reads as firelit, not bleached
const _w = new THREE.Color();
const warmer = (c) => _w.set(c).multiply(_w.clone().setRGB(1, 0.78, 0.55)).getHex();
export function removeLightPool(q) {
  for (let i = S.pools.length - 1; i >= 0; i--) { const p = S.pools[i]; if (p === q || (typeof q === 'string' && p.tag === q)) dropPool(i); }
}
export const getLightPool = (tag) => S.pools.find((p) => p.tag === tag) || null;
export const lightPools = () => S.pools;
export function shrinkPool(p, r, t) { if (!p) return; p.r = Math.min(p.r, r); p.shrinkT = Math.max(p.shrinkT, t); }
function dropPool(i) {
  const p = S.pools[i];
  if (p.light) removeLight(p.light);
  if (p.mesh) { R.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  S.pools.splice(i, 1);
}

// ---------- beams (Act V): a lit sea-light's turning beam ----------
// addBeam(x, z, o) -> b = { x, z, y, len, half, period, theta, sweep, pool, light, mesh, tag, owner, prop }. o: { len (26 m),
// half (0.18 rad), period (12 s a turn, on every difficulty), theta (where it starts), y (its lantern's height), color, tag,
// owner (gone with it), prop (an act5Prop with setBeam: the prop draws its own cone), cone (false: none drawn; without a
// prop one of sea.js's), dir (1 or -1), warm (false: it does not warm the hero) }. Each frame it turns, its light moves
// along the ground it sweeps, and the hero it passes over is warmed once a pass (cold.js warmHero). What it does to thin
// ice is ice.js's (beamIce), to the unlit and the light-shy ai.js's (beamTick). b.sweep counts its turns ("once per sweep")
let beamId = 0;
export function addBeam(x, z, o = {}) {
  const prop = o.prop || null, y = o.y ?? prop?.userData.fireY ?? 8;
  const b = { id: ++beamId, x, z, y, len: o.len ?? 26, half: o.half ?? 0.18, period: o.period ?? 12, theta: o.theta ?? rand.range(0, Math.PI * 2), dir: o.dir ?? 1, sweep: 0, tag: o.tag ?? null, owner: o.owner || null, prop, mesh: null, warm: o.warm !== false, color: o.color ?? 0xfff0d6, k: 1, heroIn: false };
  if (!prop && o.cone !== false) { b.mesh = beamMesh({ y, len: b.len, color: b.color }); b.mesh.position.set(x, y, z); R.scene.add(b.mesh); b.own = true; }
  // the light it lays on the ground as it turns (lightAt counts the beam itself, not this pool)
  b.pool = addLightPool(x, z, 3, Infinity, null, { decal: false, color: b.color, intensity: o.intensity ?? 26, flicker: 0.05 });
  b.pool.beam = b; b.light = b.pool.light;
  if (b.light) { b.light.range = 11; b.light.y = 2.2; }
  S.beams.push(b);
  aim(b);
  return b;
}
export function removeBeam(q) {
  for (let i = S.beams.length - 1; i >= 0; i--) { const b = S.beams[i]; if (b === q || (typeof q === 'string' && b.tag === q)) dropBeam(i); }
}
export const beams = () => S.beams;
export const getBeam = (tag) => S.beams.find((b) => b.tag === tag) || null;
// a beam shortened (the Skotos's Eclipse) or given back its length
export function setBeamLen(b, d) { if (!b) return; b.len = d; b.mesh?.userData.setLen?.(d); }
function dropBeam(i) {
  const b = S.beams[i];
  removeLightPool(b.pool);
  if (b.prop) b.prop.userData.setBeam?.(null);
  else if (b.mesh) { R.scene.remove(b.mesh); b.mesh.traverse((o) => { if (o.material?.userData?.own) o.material.dispose(); }); }
  S.beams.splice(i, 1);
}
// is (x, z) in a beam: between 3 m and its length from it, within its half-angle (wider near the tower: + 0.6 / d)
export function beamHas(b, x, z) {
  const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz);
  return d >= 3 && d <= b.len && b.k > 0 && Math.abs(angleDiff(b.theta, Math.atan2(dx, dz))) < b.half + 0.6 / d;
}
export function inBeam(x, z) {
  for (const b of S.beams) if (beamHas(b, x, z)) return b;
  return null;
}
// the cone and its light pointed at theta: the prop's (setBeam), or ours; the light where the beam meets the ground
function aim(b) {
  if (b.prop) b.mesh = b.prop.userData.setBeam?.(b.theta) || b.mesh;
  else if (b.mesh) b.mesh.userData.setDir(b.theta);
  const d = b.len * 0.6, s = Math.sin(b.theta), c = Math.cos(b.theta);
  b.pool.x = b.x + s * d; b.pool.z = b.z + c * d;
}
const TAU = Math.PI * 2;
function tickBeams(dt) {
  const pl = G.player;
  for (let i = S.beams.length - 1; i >= 0; i--) {
    const b = S.beams[i];
    if (b.owner && (b.owner.dead || b.owner.removed)) { dropBeam(i); continue; }
    b.theta += b.dir * TAU * dt / b.period;
    if (b.theta >= TAU || b.theta < 0) {
      b.theta -= Math.sign(b.theta) * TAU; b.sweep++;
      // each turn the beam's bell (a lantern room's or the Tower's cracked one), for the ear: audio carries the beat
      b.prop?.userData.ring?.(0.6); emit('beamTurn', b);
    }
    aim(b);
    if (b.own) b.mesh.userData.tick(dt);
    // the hero it passes over: warmed (Cold -15, then 4 s of no build-up), once a pass; a low hum as it goes by
    const inside = !!pl && !pl.dead && beamHas(b, pl.x, pl.z);
    if (inside && !b.heroIn) { if (b.warm) warmHero(4); Audio.sfx('beamHum', { x: pl.x, z: pl.z, vol: 0.5 }); emit('beamPass', b); }
    b.heroIn = inside;
  }
  // the sea shaders' nearest beam (uBeam: origin and k, direction and length) and two nearest lanterns (uLights)
  const ub = SEA.uBeam.value;
  let best = null, bd = 1e9;
  if (pl) for (const b of S.beams) { const d = (b.x - pl.x) ** 2 + (b.z - pl.z) ** 2; if (d < bd) { bd = d; best = b; } }
  if (best) {
    const dip = Math.atan2(Math.max(0, best.y - 1.5), best.len * 0.75), cd = Math.cos(dip);
    ub[0].set(best.x, best.y, best.z, best.k); ub[1].set(Math.sin(best.theta) * cd, -Math.sin(dip), Math.cos(best.theta) * cd, best.len);
  } else ub[0].w = 0;
}
// the two lit lanterns nearest the hero, for the light paths on the water and the glints on the ice: the beams' fires, then
// the act's lit lamps (each at its fire's height)
const LT2 = [];
function lanterns() {
  const pl = G.player, ul = SEA.uLights.value;
  LT2.length = 0;
  if (pl && lightKind() === 'sea') {
    for (const b of S.beams) LT2.push({ x: b.x, y: b.y, z: b.z, w: 1.2 * b.k, d: (b.x - pl.x) ** 2 + (b.z - pl.z) ** 2 });
    for (const it of G.zone?.interact || []) if (it.lit && it.lightR && it.kind !== 'sealight') LT2.push({ x: it.x, y: (it.mesh?.userData.fireY ?? 1.2) + (it.mesh?.position?.y || 0), z: it.z, w: 0.6, d: (it.x - pl.x) ** 2 + (it.z - pl.z) ** 2 });
    LT2.sort((a, b) => a.d - b.d);
  }
  for (let i = 0; i < 2; i++) { const q = LT2[i]; if (q) ul[i].set(q.x, q.y, q.z, q.w); else ul[i].set(0, -99, 0, 0); }
}

// ---------- looks: a soft additive disc (pools, and the Cradle's ring when the world has none) ----------
const DISC_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const DISC_FS = `varying vec2 vUv; uniform vec3 uColor; uniform float uA; uniform float uRim;
void main(){ float d = length(vUv * 2.0 - 1.0); if (d > 1.0) discard;
  float a = (1.0 - smoothstep(0.55, 1.0, d)) * 0.45 + uRim * smoothstep(0.86, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d)) * 2.2;
  gl_FragColor = vec4(uColor * a * uA, 1.0); }`;
// Act VI's disc (o: { hard, core }): true light's (hard 0) a soft warm fall from the middle with a broad faint edge; false
// light's (hard 1) flat to its edge and cut there by one narrowed smoothstep, a thin bright rim; core: the dark's core, a
// black-violet drawn over the ground by its own alpha (normal blending) with the rim added over it. One pass: the blend is
// premultiplied (ONE, ONE_MINUS_SRC_ALPHA), so with no core it adds as the shipped disc does. uK: the radius it is cut to
// (the tremble), as the mesh's size over it
const DISC6_FS = `varying vec2 vUv; uniform vec3 uColor; uniform float uA; uniform float uK; uniform float uHard; uniform float uCoreA;
void main(){ float d = length(vUv * 2.0 - 1.0) * uK; if (d > 1.0) discard;
  float body = mix((1.0 - smoothstep(0.3, 1.0, d)) * 0.5, (1.0 - smoothstep(0.93, 0.995, d)) * 0.22, uHard);
  float rim = mix(smoothstep(0.4, 0.76, d) * (1.0 - smoothstep(0.76, 1.0, d)) * 0.3, smoothstep(0.91, 0.965, d) * (1.0 - smoothstep(0.975, 0.995, d)) * 2.4, uHard);
  float c = uCoreA * (1.0 - smoothstep(0.78, 0.95, d));
  gl_FragColor = vec4(uColor * (body * (1.0 - c) + rim) * uA + vec3(0.04, 0.024, 0.07) * c, c); }`;
// (each its own geometry: on the Act IV slopes it is laid over the ground where it lies, build.js drape)
function discMesh(color, a, rim = 0.6, o = null) {
  const geo = B.drapable(new THREE.PlaneGeometry(2, 2, 16, 16).rotateX(-Math.PI / 2), 0.07);
  const m = o ? new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: a }, uK: { value: 1 }, uHard: { value: o.hard ? 1 : 0 }, uCoreA: { value: o.core ? 0.82 : 0 } }, vertexShader: DISC_VS, fragmentShader: DISC6_FS, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }))
    : new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: a }, uRim: { value: rim } }, vertexShader: DISC_VS, fragmentShader: DISC_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  if (o?.core) m.userData.coreA = 0.82;
  m.renderOrder = 2; m.frustumCulled = false;
  return m;
}
// the hero's ring: the world's (act4Prop 'lightRing', radius 1) or a warm disc of our own
function heroRing() {
  if (S.ring) return S.ring;
  let o = null;
  try { o = B.act4Prop?.('lightRing'); } catch (e) { o = null; }
  S.ring = o?.children.length ? o : discMesh(0xffa850, 0.32, 0.9);
  S.ring.renderOrder = 2;
  return S.ring;
}
// the Ember Cradle: the world's small iron brazier (act4Prop 'cradle') or ours: an iron cup with a flame in it
function cradleMesh() {
  let o = null;
  try { o = B.act4Prop?.('cradle'); } catch (e) { o = null; }
  // the world's is a brazier you could set down; on the hip it is carried small
  if (o?.children.length) { const g = new THREE.Group(); o.scale.setScalar(0.62); g.add(o); g.userData = o.userData; return g; }
  const g = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.7, roughness: 0.5 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.1, 8, 1, true), iron); cup.position.y = 0.05; g.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 4, 12), iron); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; g.add(rim);
  for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4), iron); leg.position.set(Math.sin(i * 2.1) * 0.06, -0.03, Math.cos(i * 2.1) * 0.06); g.add(leg); }
  const coal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 5), new THREE.MeshBasicMaterial({ color: 0xff7020 })); coal.position.y = 0.08; coal.scale.y = 0.5; g.add(coal);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('dot'), color: 0xffb050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  fl.position.y = 0.17; fl.scale.set(0.22, 0.3, 1); g.add(fl);
  g.userData.flame = fl;
  return g;
}
function attachCradle(av) {
  // one Cradle for the whole game, moved to each new avatar (a new one per avatar leaked its geometries and materials)
  if (S.cradle) S.cradle.parent?.remove(S.cradle); else S.cradle = cradleMesh();
  // on the left hip, clear of the sword arm
  if (!attachUpright(av, 'hips', S.cradle, 0.19, -0.04, -0.02)) { S.cradle.quaternion.identity(); S.cradle.scale.setScalar(1); S.cradle.position.set(0.22, 0.95, 0); av.group.add(S.cradle); }
  S.cradleAv = av;
}
// where the fire goes when the Cradle drinks
export function cradlePoint(out = V) {
  const pl = G.player;
  if (S.cradle?.parent) return S.cradle.getWorldPosition(out);
  return out.set(pl.x, 1, pl.z);
}

// ---------- the Cradle drinks: fire inside its ring streams into it, burns out twice as fast, and the ring swells ----------
function drink(dt, pl) {
  if (S.over != null || S.dark) return;
  const r = heroLightR();
  let n = 0;
  S.streamT -= dt;
  const at = S.streamT <= 0 ? cradlePoint(V) : null;
  if (at) S.streamT = 0.12;
  for (const a of G.areas) {
    if (a.kind !== 'fire' || a.t > a.dur || a.nowarm || Math.hypot(a.x - pl.x, a.z - pl.z) > r + a.r * 0.5) continue;
    n++; a.t += dt;
    if (!at) continue;
    if (FXM.fireStream) FXM.fireStream({ x: a.x, y: 0.4, z: a.z }, { x: at.x, y: at.y, z: at.z });
    else for (let k = 0; k < 3; k++) {
      const sx = a.x + rand.range(-a.r, a.r) * 0.6, sz = a.z + rand.range(-a.r, a.r) * 0.6, sy = rand.range(0.2, 0.8), life = rand.range(0.35, 0.55);
      FXM.P({ x: sx, y: sy, z: sz, vx: (at.x - sx) / life, vy: (at.y - sy) / life, vz: (at.z - sz) / life, life, size: 0.3, size1: 0.08, color: 0xffc060, color1: 0xff5010 });
    }
  }
  if (!n) return;
  S.swellT = LIGHT.swellT;
  S.sipT -= dt;
  if (S.sipT <= 0) { S.sipT = 1.4; Audio.sfx('lanternDrink', { x: pl.x, z: pl.z, vol: 0.7 }); }
}

// the hero's ring warns of the ice under her: white from stage 2 (webbed), pulsing faster as it crazes
const RING_C = new THREE.Color(0xffb060), RING_W = new THREE.Color(0xf0f8ff), _rc = new THREE.Color();
function footIce(ring, pl) {
  const st = stageAt(pl.x, pl.z), bad = st >= 2 && st <= 3;
  if (bad && !S.footBad) Audio.sfx('iceCreak', { x: pl.x, z: pl.z, vol: 0.8 });
  S.footBad = bad;
  const k = bad ? 0.75 + 0.25 * Math.sin(R.time * (st === 3 ? 14 : 7)) : 0;
  if (k === S.footK) return;
  S.footK = k; _rc.copy(RING_C).lerp(RING_W, k);
  if (ring.userData.setColor) ring.userData.setColor(_rc); else ring.material?.uniforms?.uColor.value.copy(_rc);
}

// ---------- per frame (from player.js, after the hero has moved) ----------
export function tickLight(dt) {
  const z = G.zone, pl = G.player;
  // a new zone (leaveZone has already cleared the last one's pools and darkness): the atmosphere's reach for the hero's light
  // (and the Cradle's ring for its kind of light: 6 m in Act IV, 4 m in Act V)
  if (z !== S.zone) { S.zone = z; S.range0 = R.heroLight.distance; LIGHT.base = baseRing(); S.ringR = LIGHT.base; if (S.ring && S.footK) { S.footK = 0; S.footBad = false; S.ring.userData.setColor?.(RING_C) ?? S.ring.material?.uniforms?.uColor.value.copy(RING_C); } }
  const on = lightOn() && pl;
  if (S.owner && (S.owner.dead || S.owner.removed)) { S.over = null; S.owner = null; }
  if (S.dark && S.dark !== true && (S.dark.dead || S.dark.removed)) S.dark = null;
  for (let i = S.pools.length - 1; i >= 0; i--) {
    const p = S.pools[i];
    p.t += dt;
    if (p.t > p.dur || (p.owner && (p.owner.dead || p.owner.removed))) { dropPool(i); continue; }
    // (a pool that goes with someone: the Spirit Wolf's lantern, Iron Bulwark's ward)
    if (p.follow) { if (p.follow.dead || p.follow.removed) { dropPool(i); continue; } p.x = p.follow.x; p.z = p.follow.z; }
    if (p.shrinkT > 0 && (p.shrinkT -= dt) <= 0) p.r = p.r0;
    const fade = Math.min(1, (p.dur - p.t) / 1.5);
    // (true light's tremble: its drawn radius and its intensity, never p.r; with 'reduce flicker' +-3% and steady)
    if (p.trem) { const n = trembleStep(p.trem, dt), calm = !!G.settings.flicker, A = trembleAmp(); p.k = 1 + n * (calm ? 0.03 : A.r); p.ki = calm ? 1 : 1 + n * A.i; }
    if (p.light) { p.light.x = p.x; p.light.z = p.z; if (!p.beam) p.light.range = p.r * 2 * p.k; if (p.trem) p.light.intensity = p.I0 * p.ki; }
    if (p.mesh) {
      const m = p.mesh, r = Math.max(0.01, p.r), u = m.material.uniforms;
      if (m.position.x !== p.x || m.position.z !== p.z || m.scale.x !== r * p.sc) { m.position.set(p.x, 0, p.z); m.scale.setScalar(r * p.sc); B.drape(m, z?.L); }
      // (false light is dead still: no pulse; a trembling pool trembles; the rest breathe as they always have)
      if (p.fake) u.uA.value = p.a0 * fade;
      else if (p.trem) { u.uA.value = p.a0 * fade * p.ki; u.uK.value = p.sc / p.k; }
      else u.uA.value = p.a0 * fade * (1 + Math.sin(p.t * 3 + p.x) * 0.08);
      if (u.uCoreA) u.uCoreA.value = (m.userData.coreA || 0) * fade;
    }
  }
  if (S.beams.length) tickBeams(dt); else SEA.uBeam.value[0].w = 0;
  if ((S.litT -= dt) <= 0) { S.litT = 0.25; lanterns(); }
  if (!on) { if (S.ring) S.ring.visible = false; if (S.cradle) S.cradle.visible = false; return; }
  if (S.swellT > 0) S.swellT -= dt;
  if (S.halfT > 0) S.halfT -= dt;
  LIGHT.base = baseRing();
  if (fireOn()) fireTick(dt, pl);
  // (the Cradle drinks only in the ember zones: whale oil and her own fire keep their time by the sea)
  if (!pl.dead && ember()) drink(dt, pl);
  // the ring: eases to its radius, follows the hero, gone in the dark
  const r = heroLightR(), ring = heroRing();
  S.ringR = damp(S.ringR, r, 5, dt);
  FXM.FIRE_U.uFireR.value = pl.dead ? 0 : S.ringR; FXM.FIRE_U.uFireP.value.set(pl.x, pl.z);
  if (!ring.parent) R.scene.add(ring);
  ring.visible = S.ringR > 0.15 && !pl.dead;
  // (a Dim ring pulses: the coal is nearly out)
  const pulse = fireOn() && FIRE.state === 'dim' ? 1 + 0.07 * Math.sin(R.time * 9) : 1, rr = Math.max(0.01, S.ringR * pulse);
  ring.position.set(pl.x, 0, pl.z); ring.scale.set(rr, 1, rr);
  if (ring.visible) B.drape(ring, z.L);
  // on thin ice webbed or worse (stage 2+) the ring at her feet turns white and pulses, with a creak as she steps onto it
  if (lightKind() === 'sea') footIce(ring, pl);
  // the Cradle rides on the hero's hip (a new avatar after a change of gear gets it again)
  if (pl.avatar && S.cradleAv !== pl.avatar) attachCradle(pl.avatar);
  if (S.cradle) {
    S.cradle.visible = true;
    const U = S.cradle.userData, k = clamp(r / LIGHT.base, 0.1, 1.5);
    if (U.setFire) U.setFire(k);
    else if (U.flame) { const s = (0.8 + Math.sin(R.time * 13) * 0.08 + Math.sin(R.time * 31) * 0.05) * k; U.flame.scale.set(0.22 * s, 0.3 * s, 1); }
    if (Math.random() < 0.25 * k) { const c = cradlePoint(V); FXM.P({ x: c.x + rand.range(-0.04, 0.04), y: c.y + 0.1, z: c.z + rand.range(-0.04, 0.04), vy: rand.range(0.5, 1.1), life: 0.4, size: 0.07, size1: 0.01, color: 0xffd080, color1: 0xff4010 }); }
  }
  // the warm light it throws follows the ring (the atmosphere's reach at 6 m); in a boss's darkness enough is left to read
  // the floor by (a look only: what is lit is still lightAt's)
  const kk = clamp(S.ringR / LIGHT.base, 0, 1.5), dim = S.over != null || !!S.dark;
  R.heroLight.distance = Math.max(dim ? 6 : 2, S.range0 * Math.max(dim ? 0.45 : 0.3, kk));
  R.heroLight.intensity *= Math.max(dim ? 0.4 : 0.12, Math.min(1.25, kk));
  // (her coal Out: enough of her own light to read the floor by, 4 m, set here and never through setHeroLight: S.over
  // would make it count as ring and put out a Mage's burning ground in fireAt)
  if (fireOn() && FIRE.state === 'out') { R.heroLight.distance = 4; R.heroLight.intensity = Math.max(R.heroLight.intensity, 0.6); }
}
// the Cradle's base ring for the zone: below the ice FIRE.max; elsewhere ZONES[id].ring with the Lamplight bonus, held
// half a metre under Act IV's swell (6 -> 7.9 m at rank 40 never reaches its 9 m)
function baseRing() {
  if (fireOn()) return fireMax();
  const r = (ZONES[G.zone?.id]?.ring ?? 6) * (1 + lampBonus() / 100);
  return ember() ? Math.min(r, Math.max(ZONES[G.zone?.id]?.ring ?? 6, LIGHT.swell - 0.5)) : r;
}
// on leaving a zone (projectiles.js clearProjs) and on entering one: no beams, no pools, no darkness, the Cradle at rest
export function clearLight() {
  while (S.beams.length) dropBeam(S.beams.length - 1);
  while (S.pools.length) dropPool(S.pools.length - 1);
  lanterns();
  S.over = null; S.owner = null; S.dark = null; S.swellT = 0; S.halfT = 0; S.flareT = 0; S.relightT = 0;
  NAMES.on = false;
  if (S.ring) S.ring.visible = false;
  if (S.cradle) S.cradle.visible = false;
}

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__act6 ||= {};
  Object.assign(window.__act6, { FIRE, NAMES, lightAt, ringOf, addLightPool, fire: { FIRE, LOG: FIRE_LOG, fireDrain, fireFill, fireRelight, fireEnter, flareRing, ringOf, setRemoteLight, fireMax, skyAt, heroLightR, namesTick } });
}
