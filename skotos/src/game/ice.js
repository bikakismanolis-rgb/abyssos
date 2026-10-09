// The Cracking Ice (Act V): thin ice (L.ice) under load, stages 0 intact, 1 hairline, 2 web, 3 crazed, 4 broken (water,
// closed low), 5 slush. z.ice = { stage, load, t, warn, tex, dirty, upT, ring, floes, ... } lives on the zone; thick ice and
// land never break.
// - Load: each frame, within 30 m of the hero, each actor adds its weight (iceWeight) to the thin cell under it (big ones
//   to every cell under their radius), x0.3 while it moves faster than 1 m/s. One stage per HAZ5.load; load decays at
//   0.25/s, never below its stage. A stage-3 cell's next stage starts a 0.6 s warning; the break joins the next batch.
// - Batches: breaks and refreezes are one map.change every 0.25 s at most (map.ver: four bumps a second at most, the
//   stepToward windows with it). A break chains to the stage-3 cells beside it 0.3 s later. Broken cells refreeze to
//   slush after 20 s (6 s in lamp light, at once under a beam or a Frost Nova: refreezeAt); slush takes no load for 8 s,
//   then is stage 1. Lamp light (light.js lampLightAt, or lit lamps and lamp pools) holds the ice: stages capped at 1.
// - The plunge, in the break's own batch, no tween: she is set on the nearest safe cell within 3 m (behind her if she
//   was moving), else on the oldest safe point of the last 2 s; HAZ5.plunge % of her life (half within 5 s, never under
//   10%), Cold +35, 1 s of iframes, bus 'plunge'. A break under her while she is in the air waits for her to land.
// - Monsters that fall in drown (combat.js kill, o.drown), `big` ones flounder 3 s and haul out, floaters and bosses do
//   not fall; FALLS[kind] gives a kind its own rule (combat's: the Sunken resurface, the Icemaw dives).
// - tCrack: an R8 DataTexture w x h over z.ice.stage itself (one byte per cell, the stage), nearest; uploaded when dirty,
//   at most every 0.1 s; SEA.tCrack and SEA.uMap point at the zone's on entry. The floe pool: 32 shards bobbing in holes.
import * as THREE from 'three';
import { G, vibrate } from './state.js';
import { HAZ5 } from './data.js';
import { damage, kill } from './combat.js';
import * as LT from './light.js';
import * as FXM from '../gfx/fx.js';
import { number } from '../ui/overlay.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { SEA, swellY } from '../world/sea.js';
import { t, has } from '../i18n/i18n.js';
import { angleDiff, clamp } from '../core/util.js';
import { TIDE } from './tide.js';
import { tidal } from '../world/gen5.js';

const BATCH = 0.25, WARN = 0.6, CHAIN = 0.3, MELT = 20, MELT_LAMP = 6, SLUSH = 8, DECAY = 0.25, NEAR = 30, RING = 2, UP = 0.1, FLOES = 32;
// cell flags: in the loaded list, warning, a break waiting for its batch, a refreeze waiting, in the broken list, in the
// slush list, weighed this frame
const LIVE = 1, WARNF = 2, PEND = 4, REO = 8, BRK = 16, SLU = 32, HIT = 64;
const N4 = [1, -1, 0, 0], M4 = [0, 0, 1, -1];
export let ICE = null;
// what the scenarios read
export const ICE_LOG = { breaks: 0, refreezes: 0, slushed: 0, batches: 0, plunges: [], drowned: 0, floundered: 0, warns: 0, bumps: [] };
// a kind's own rule when its cell breaks under it (a, cell, zone) -> true when handled (combat's, stage C)
export const FALLS = {};
const haz = () => HAZ5[G.hero?.diff ?? 1] || HAZ5[1];
const fx = (k, ...a) => typeof FXM[k] === 'function' && (FXM[k](...a), true);

// on every entry (act5Enter): broken and slush cells back to thin ice at stage 0, every load cleared, one open batch
export function resetIce(z) {
  const L = z?.L;
  if (!L?.ice) { ICE = null; return; }
  const N = L.w * L.h;
  z.ice ||= { stage: new Uint8Array(N), load: new Float32Array(N), t: new Float32Array(N), warn: [], tex: null, dirty: true, upT: 0, ring: [], floes: [] };
  const I = ICE = z.ice, open = [];
  Object.assign(I, { fl: I.fl || new Uint8Array(N), litAt: I.litAt || new Float32Array(N).fill(-1e9), litV: I.litV || new Uint8Array(N), live: [], pend: [], reo: [], broken: [], slush: [], hit: [], batchT: BATCH, clock: 0, lastPlunge: -99, ringT: 0, sndT: 0, flounder: [] });
  for (let i = 0; i < N; i++) {
    I.fl[i] = 0;
    if (!L.ice[i]) continue;
    if (I.stage[i] === 4) open.push([i % L.w, (i - i % L.w) / L.w]);
    I.stage[i] = 0; I.load[i] = 0; I.t[i] = 0;
  }
  I.warn.length = 0; I.ring.length = 0; I.floes.length = 0; I.dirty = true;
  if (!I.tex) {
    I.tex = new THREE.DataTexture(I.stage, L.w, L.h, THREE.RedFormat, THREE.UnsignedByteType);
    I.tex.magFilter = I.tex.minFilter = THREE.NearestFilter; I.tex.generateMipmaps = false; I.tex.unpackAlignment = 1;
  }
  I.tex.needsUpdate = true; I.upT = UP;
  SEA.tCrack.value = I.tex; SEA.uMap.value.set(L.w, L.h);
  const fm = z.lvl?.ice?.floes; if (fm) fm.count = 0;
  if (z.map.open(open)) emit('mapChanged');
}

// ---------- per frame (projectiles.js updateAreas, after tickTide) ----------
export function tickIce(dt) {
  const z = G.zone;
  ICE = z?.L?.ice && z.ice ? z.ice : null;
  const I = ICE;
  if (I) {
    I.clock += dt;
    if (G.mode === 'play') weigh(z, I, dt);
    decay(z, I, dt);
    timers(z, I, dt);
    melt(z, I, dt);
    if ((I.batchT -= dt) <= 0) { I.batchT = BATCH; batch(z, I); }
    ringTick(z, I, dt);
    floeTick(z, I);
    I.upT -= dt;
    if (I.dirty && I.upT <= 0) { I.tex.needsUpdate = true; I.dirty = false; I.upT = UP; }
  }
  if (PROBE) window.__act5?.probe?.(dt);
}

// ---------- weight ----------
// the load table: the hero 1, a monster 0.6 (only while it hunts: a pack idling on the ice does not sink itself), a
// Hull-louse 0.3 and an Icemaw 2.0 (def.weight), the Ranger's wolf 0.5, big ones 2.5; floaters, fliers, the hidden, frozen
// statues, NPCs and bosses 0
export function iceWeight(a) {
  if (!a || a.dead || a.removed || a.prop) return 0;
  if (a.hero) return airborne(a) ? 0 : 1;
  const d = a.def || {};
  if (a.team === 'npc' || a.boss || d.float || d.ai === 'bat' || a.under || a.airborne || a.cling || a.hidden || a.dormant || (a.statue && !a.awake) || (a.flounder > 0)) return 0;
  if (d.weight != null) return d.weight;
  if (a.pet) return a.kind === 'spiritWolf' ? 0.5 : 0.6;
  if (!a.aggro) return 0;
  return d.big ? 2.5 : 0.6;
}
const airborne = (p) => (p.y || 0) > 0.2 || !!(p.act && (p.act.name === 'roll' || p.act.name === 'blink' || p.act.name === 'leap'));
function weigh(z, I, dt) {
  const pl = G.player, L = z.L, w = L.w, h = L.h;
  if (!pl || pl.dead) return;
  const one = (a) => {
    const wt = iceWeight(a), P = a._ice || (a._ice = { x: a.x, z: a.z });
    const v = Math.hypot(a.x - P.x, a.z - P.z) / Math.max(dt, 1e-3); P.x = a.x; P.z = a.z;
    if (!wt) return;
    const amt = wt * (v > 1 ? 0.3 : 1) * dt, r = a.def?.big ? a.radius || 0.5 : 0;
    if (!r) { const ix = Math.floor(a.x), iz = Math.floor(a.z); if (ix >= 0 && iz >= 0 && ix < w && iz < h) press(z, I, iz * w + ix, amt); return; }
    for (let cz = Math.floor(a.z - r); cz <= Math.floor(a.z + r); cz++) for (let cx = Math.floor(a.x - r); cx <= Math.floor(a.x + r); cx++)
      if (cx >= 0 && cz >= 0 && cx < w && cz < h && Math.hypot(cx + 0.5 - a.x, cz + 0.5 - a.z) <= r + 0.35) press(z, I, cz * w + cx, amt);
  };
  one(pl);
  for (const a of z.actors) if (Math.abs(a.x - pl.x) < NEAR && Math.abs(a.z - pl.z) < NEAR) one(a);
}
function press(z, I, i, amt) {
  if (!z.L.ice[i] || I.stage[i] >= 4) return;
  I.load[i] += amt;
  if (!(I.fl[i] & LIVE)) { I.fl[i] |= LIVE; I.live.push(i); }
  if (!(I.fl[i] & HIT)) { I.fl[i] |= HIT; I.hit.push(i); }
  settle(z, I, i);
}
export function loadAt(x, z, r, amount) {
  const zn = G.zone, I = zn?.ice; if (!I) return 0;
  const list = cellsIn(zn.L, x, z, r);
  for (const i of list) press(zn, I, i, amount);
  return list.length;
}
// the load's stage (capped at 1 in lamp light), and from stage 3 the warning
function settle(z, I, i) {
  const per = haz().load;
  if (lampLit(z, i) && I.load[i] >= 2 * per) I.load[i] = 2 * per - 1e-3;
  const s = Math.min(3, Math.floor(I.load[i] / per));
  if (s > I.stage[i]) setStage(z, I, i, s);
  if (I.stage[i] === 3 && I.load[i] >= 4 * per && !(I.fl[i] & (WARNF | PEND))) warn(z, I, i, WARN);
}
function setStage(z, I, i, s, quiet) {
  I.stage[i] = s; I.load[i] = Math.max(I.load[i], s * haz().load); I.dirty = true;
  if (quiet) return;
  const pl = G.player, w = z.L.w, x = i % w + 0.5, y = (i - i % w) / w + 0.5;
  if (I.sndT < I.clock && Math.abs(x - pl.x) + Math.abs(y - pl.z) < 14) { I.sndT = I.clock + 0.15; Audio.sfx(['iceCreak', 'iceCrack1', 'iceCrack2'][s - 1] || 'iceCreak', { x, z: y, vol: 0.7 }); }
}
// the 0.6 s warning (0.3 s down a chain): a white ring, a sharp crack, a buzz if she stands on it
function warn(z, I, i, dur) {
  I.fl[i] |= WARNF; I.t[i] = dur; I.warn.push(i); ICE_LOG.warns++;
  const w = z.L.w, x = i % w + 0.5, y = (i - i % w) / w + 0.5, pl = G.player;
  FXM.ring(x, y, 0.7, 0xf0f8ff, dur, ICE_Y_FX);
  if (I.sndT < I.clock) { I.sndT = I.clock + 0.12; Audio.sfx('iceCrack3', { x, z: y, vol: 0.8 }); }
  if (pl && Math.floor(pl.x) === i % w && Math.floor(pl.z) === (i - i % w) / w) vibrate(30);
}
const ICE_Y_FX = 0.06;
// unweighed cells lose load, never below their stage
function decay(z, I, dt) {
  const per = haz().load, L = I.live;
  for (let j = L.length - 1; j >= 0; j--) {
    const i = L[j];
    if (I.fl[i] & HIT) continue;
    const floor = Math.min(3, I.stage[i]) * per;
    if (I.stage[i] >= 4 || (I.load[i] -= DECAY * dt) <= floor) { I.load[i] = I.stage[i] >= 4 ? 0 : floor; I.fl[i] &= ~LIVE; L[j] = L[L.length - 1]; L.pop(); }
  }
  for (const i of I.hit) I.fl[i] &= ~HIT;
  I.hit.length = 0;
}
// the warnings run out into the next batch; broken cells refreeze (faster in lamp light); slush firms up to stage 1;
// the floundering haul out or go under
function timers(z, I, dt) {
  for (let j = I.warn.length - 1; j >= 0; j--) {
    const i = I.warn[j];
    if (!(I.fl[i] & WARNF)) { I.warn.splice(j, 1); continue; }
    if ((I.t[i] -= dt) > 0) continue;
    I.fl[i] &= ~WARNF; I.warn.splice(j, 1); pend(I, i);
  }
  for (let j = I.broken.length - 1; j >= 0; j--) {
    const i = I.broken[j];
    if (I.stage[i] !== 4) { I.fl[i] &= ~BRK; I.broken[j] = I.broken[I.broken.length - 1]; I.broken.pop(); continue; }
    if (I.fl[i] & REO) continue;
    if ((I.t[i] -= dt * (lampLit(z, i) ? MELT / MELT_LAMP : 1)) <= 0) { I.fl[i] |= REO; I.reo.push(i); }
  }
  const per = haz().load;
  for (let j = I.slush.length - 1; j >= 0; j--) {
    const i = I.slush[j];
    if (I.stage[i] !== 5) { I.fl[i] &= ~SLU; I.slush[j] = I.slush[I.slush.length - 1]; I.slush.pop(); continue; }
    if ((I.t[i] -= dt) > 0) continue;
    I.stage[i] = 1; I.load[i] = per; I.dirty = true; I.fl[i] &= ~SLU; I.slush[j] = I.slush[I.slush.length - 1]; I.slush.pop();
  }
  for (let j = I.flounder.length - 1; j >= 0; j--) {
    const a = I.flounder[j];
    if (a.dead || a.removed) { I.flounder.splice(j, 1); continue; }
    if ((a.flounder -= dt) > 0) { if (Math.random() < 0.2) splash(a.x, a.z, 0.5); continue; }
    I.flounder.splice(j, 1); a.flounder = 0; a.y = 0;
    // (three open cells or more round it: it goes under; else it hauls out and breaks the edge it climbs)
    let open = 0; for (const i of cellsIn(z.L, a.x, a.z, 1.5)) if (z.L.ice[i] && I.stage[i] === 4) open++;
    if (open >= 3) drown(z, a);
    else { let n = 0; for (const i of cellsIn(z.L, a.x, a.z, 1.8)) if (n < 2 && z.L.ice[i] && I.stage[i] < 4 && !(I.fl[i] & PEND)) { pend(I, i); n++; } }
  }
}
function pend(I, i) { if (!(I.fl[i] & PEND)) { I.fl[i] |= PEND; I.pend.push(i); } }
// burning ground melts what it burns on: +1 stage every 2 s under a fire area
function melt(z, I, dt) {
  for (const a of G.areas) {
    if (a.kind !== 'fire' || a.t > a.dur) continue;
    if ((a.iceT = (a.iceT ?? 2) - dt) > 0) continue;
    a.iceT += 2; crackAt(a.x, a.z, a.r, 1, { src: 'fire' });
  }
}

// ---------- the batch: every break and every refreeze waiting, one map.change ----------
function batch(z, I) {
  const pl = G.player, L = z.L, w = L.w, map = z.map, alive = pl && !pl.dead;
  const hc = alive ? Math.floor(pl.z) * w + Math.floor(pl.x) : -1, up = alive && airborne(pl);
  const close = [], open = [], keep = [];
  for (const i of I.pend) {
    if (!(I.fl[i] & PEND)) continue; // (refrozen since: it holds)
    // (under her while she is in the air: it waits for her to come down)
    if (up && i === hc) { keep.push(i); continue; }
    I.fl[i] &= ~PEND;
    if (I.stage[i] !== 4 && L.ice[i]) close.push(i);
  }
  I.pend = keep;
  for (const i of I.reo) { I.fl[i] &= ~REO; if (I.stage[i] === 4) open.push(i); }
  I.reo.length = 0;
  if (!close.length && !open.length) return;
  for (const i of close) {
    I.stage[i] = 4; I.load[i] = 0; I.t[i] = MELT; I.fl[i] &= ~WARNF;
    if (!(I.fl[i] & BRK)) { I.fl[i] |= BRK; I.broken.push(i); }
  }
  for (const i of open) {
    I.stage[i] = 5; I.load[i] = 0; I.t[i] = SLUSH;
    if (!(I.fl[i] & SLU)) { I.fl[i] |= SLU; I.slush.push(i); }
    dropFloes(z, I, i);
  }
  const xz = (i) => [i % w, (i - i % w) / w];
  const n = map.change(open.map(xz), close.map(xz));
  I.dirty = true; ICE_LOG.batches++; ICE_LOG.breaks += close.length; ICE_LOG.refreezes += open.length;
  if (n) { ICE_LOG.bumps.push(+I.clock.toFixed(3)); if (ICE_LOG.bumps.length > 400) ICE_LOG.bumps.splice(0, 200); emit('mapChanged'); }
  if (close.length) {
    const c0 = close[0];
    Audio.sfx('iceBreak', { x: c0 % w + 0.5, z: (c0 - c0 % w) / w + 0.5 });
    close.forEach((i, k) => { if (k < 6) splash(i % w + 0.5, (i - i % w) / w + 0.5, 1); addFloes(z, I, i); });
    // the chain: crazed cells beside a break go 0.3 s later
    for (const i of close) {
      const x = i % w, y = (i - x) / w;
      for (let d = 0; d < 4; d++) {
        const nx = x + N4[d], ny = y + M4[d], j = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < L.h && L.ice[j] && I.stage[j] === 3 && !(I.fl[j] & (WARNF | PEND))) warn(z, I, j, CHAIN);
      }
    }
    const hit = new Set(close);
    if (alive && hit.has(hc)) plunge(z, I, pl);
    for (const a of z.actors.slice()) if (!a.dead && !a.removed && hit.has(Math.floor(a.z) * w + Math.floor(a.x))) fall(z, I, a);
  }
  if (open.length) { const o0 = open[0]; Audio.sfx('refreeze', { x: o0 % w + 0.5, z: (o0 - o0 % w) / w + 0.5, vol: 0.5 }); ICE_LOG.slushed += open.length; }
}

// ---------- the plunge ----------
// a cell she can be set down on: open, and land, thick ice, a wading flat or thin ice at stage 0-1 that is not about to go
function safeCell(z, I, i) {
  if (!z.map.cells[i]) return false;
  if (z.L.ice[i]) return I.stage[i] <= 1 && !(I.fl[i] & (WARNF | PEND));
  return true;
}
// ... and not a scrap of ice in open water: on nine walkable cells or more
function roomy(z, s) {
  const L = z.L, w = L.w, q = [s], seen = new Set(q);
  for (let hd = 0; hd < q.length && q.length < 9; hd++) {
    const i = q[hd], x = i % w, y = (i - x) / w;
    for (let d = 0; d < 4; d++) { const nx = x + N4[d], ny = y + M4[d], n = ny * w + nx; if (nx >= 0 && ny >= 0 && nx < w && ny < L.h && !seen.has(n) && z.map.cells[n]) { seen.add(n); q.push(n); } }
  }
  return q.length >= 9;
}
// where she climbs out: the nearest safe cell within 3 m (one ahead of her way only if none lies behind), else the
// oldest safe point of the last 2 s
function landing(z, I, pl) {
  const L = z.L, w = L.w, ring = I.ring;
  let mx = 0, mz = 0;
  for (let j = ring.length - 1; j >= 0; j--) if (I.clock - ring[j].t >= 0.3) { mx = pl.x - ring[j].x; mz = pl.z - ring[j].z; break; }
  const ml = Math.hypot(mx, mz);
  let best = null, bs = 1e9;
  for (let cz = Math.floor(pl.z - 3); cz <= Math.floor(pl.z + 3); cz++) for (let cx = Math.floor(pl.x - 3); cx <= Math.floor(pl.x + 3); cx++) {
    if (cx < 0 || cz < 0 || cx >= w || cz >= L.h) continue;
    const i = cz * w + cx, x = cx + 0.5, y = cz + 0.5, d = Math.hypot(x - pl.x, y - pl.z);
    if (d > 3 || !safeCell(z, I, i)) continue;
    const ahead = ml > 0.3 && ((x - pl.x) * mx + (y - pl.z) * mz) / (ml * Math.max(d, 1e-3)) > 0.3;
    const sc = d + (ahead ? 1.5 : 0);
    if (sc < bs && roomy(z, i)) { bs = sc; best = { x, z: y, how: 'near' }; }
  }
  if (best) return best;
  for (const p of ring) { const i = Math.floor(p.z) * w + Math.floor(p.x); if (safeCell(z, I, i) && roomy(z, i)) return { x: p.x, z: p.z, how: 'ring', age: +(I.clock - p.t).toFixed(2) }; }
  // (nothing safe within 3 m and no safe point in the last 2 s: the nearest safe ground further out, ring by ring)
  for (let r = 4; r <= 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const cx = Math.floor(pl.x) + dx, cz = Math.floor(pl.z) + dz;
    if (cx >= 0 && cz >= 0 && cx < w && cz < L.h && safeCell(z, I, cz * w + cx) && roomy(z, cz * w + cx)) return { x: cx + 0.5, z: cz + 0.5, how: 'far' };
  }
  const f = z.map.nearestFloor(pl.x, pl.z, 24);
  return { x: f.x, z: f.z, how: 'floor' };
}
function plunge(z, I, pl) {
  const x0 = pl.x, z0 = pl.z, at = landing(z, I, pl);
  pl.x = at.x; pl.z = at.z; pl.kx = pl.kz = 0; pl.pull = null;
  if (pl._ice) { pl._ice.x = at.x; pl._ice.z = at.z; }
  pl.avatar?.group.position.set(pl.x, pl.y || 0, pl.z);
  const half = I.clock - I.lastPlunge < 5, hp0 = pl.hp, lim = Math.min(hp0, Math.ceil(pl.hpMax * 0.1));
  I.lastPlunge = I.clock;
  const amt = Math.floor(Math.min(pl.hpMax * haz().plunge / 100 * (half ? 0.5 : 1), hp0 - pl.hpMax * 0.1));
  if (amt >= 1 && G.mode === 'play') damage(null, pl, amt, { pure: true, plunge: true, cold: 35 });
  // (never under 10%, whatever else her armour or her buffs do to the blow)
  if (pl.hp < lim) pl.hp = lim;
  pl.iframes = Math.max(pl.iframes || 0, 1);
  splash(x0, z0, 1.4); splash(at.x, at.z, 0.6);
  Audio.sfx('plunge', { x: x0, z: z0 });
  if (has('hud.plunge')) number(pl.x, 2.4, pl.z, t('hud.plunge'), 'text', '#9ad8ff');
  ICE_LOG.plunges.push({ from: { x: +x0.toFixed(2), z: +z0.toFixed(2) }, to: { x: at.x, z: at.z }, d: +Math.hypot(at.x - x0, at.z - z0).toFixed(2), how: at.how, age: at.age, hp: [hp0, pl.hp, pl.hpMax], t: +I.clock.toFixed(2) });
  emit('plunge', { x: x0, z: z0, to: at });
}

// ---------- what falls in ----------
function fall(z, I, a) {
  const d = a.def || {};
  if (a.prop || a.pet || a.team === 'npc' || a.under || a.airborne || a.cling || d.float || d.ai === 'bat') return;
  const f = FALLS[a.kind]; if (f && f(a, Math.floor(a.z) * z.L.w + Math.floor(a.x), z)) return;
  if (a.boss) return;
  if (d.big) { a.flounder = 3; a.status.stun = Math.max(a.status.stun || 0, 3); a.y = -0.6; I.flounder.push(a); ICE_LOG.floundered++; splash(a.x, a.z, 1.4); emit('flounder', a); return; }
  drown(z, a);
}
// a monster under the water: full xp, its loot washed to the nearest floor (tide.js), no corpse on the ice
export function drown(z, a) {
  if (a.dead) return;
  splash(a.x, a.z, 1.2);
  a.y = -0.4;
  kill(a, null, { drown: true });
  ICE_LOG.drowned++;
  if (has('hud.drowned')) number(a.x, 2.2, a.z, t('hud.drowned'), 'text', '#9ad8ff');
}
function splash(x, z, s = 1) {
  if (fx('splash', x, z, s)) return;
  FXM.sparks(x, 0.1, z, Math.round(8 * s), 0xd8ecff, 3 * s);
  FXM.puff(x, 0.15, z, Math.round(3 * s), 0xc8d8e4, 0.5 * s, 0.6 * s, 0.7);
}

// ---------- the floes: 2-3 shards in each fresh hole (the oldest given up past 32) ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function addFloes(z, I, i) {
  if (!z.lvl?.ice?.floes) return;
  const w = z.L.w, n = 2 + (Math.random() < 0.5 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    if (I.floes.length >= FLOES) I.floes.shift();
    I.floes.push({ i, x: i % w + 0.2 + Math.random() * 0.6, z: (i - i % w) / w + 0.2 + Math.random() * 0.6, r: Math.random() * 6.28, s: 0.45 + Math.random() * 0.4, ph: Math.random() * 6.28 });
  }
}
function dropFloes(z, I, i) { for (let k = I.floes.length - 1; k >= 0; k--) if (I.floes[k].i === i) I.floes.splice(k, 1); }
function floeTick(z, I) {
  const m = z.lvl?.ice?.floes; if (!m) return;
  if (!I.floes.length && !m.count) return;
  const tt = SEA.uTime.value;
  I.floes.forEach((f, k) => {
    const sw = swellY(f.x, f.z, tt);
    _p.set(f.x, -0.07 + sw * 0.03, f.z);
    _q.setFromEuler(_e.set(Math.sin(tt * 0.9 + f.ph) * 0.06, f.r + Math.sin(tt * 0.3 + f.ph) * 0.1, Math.cos(tt * 0.8 + f.ph) * 0.06));
    m.setMatrixAt(k, _m.compose(_p, _q, _s.set(f.s, 1, f.s)));
  });
  m.count = I.floes.length; m.instanceMatrix.needsUpdate = true;
}

// ---------- her safe points of the last 2 s (a plunge's fallback) ----------
function ringTick(z, I, dt) {
  const pl = G.player; if (!pl || pl.dead) return;
  if ((I.ringT -= dt) > 0) return;
  I.ringT = 0.1;
  const r = I.ring;
  while (r.length && I.clock - r[0].t > RING) r.shift();
  const i = Math.floor(pl.z) * z.L.w + Math.floor(pl.x);
  if (!airborne(pl) && i >= 0 && i < I.stage.length && safeCell(z, I, i)) r.push({ x: pl.x, z: pl.z, t: I.clock });
}

// ---------- lamp light holds the ice (light.js lampLightAt, stage C; until then lit lamps and lamp pools, never the
// hole lamps or fire), read at most four times a second per cell ----------
function lampLit(z, i) {
  const I = z.ice;
  if (I.clock - I.litAt[i] < BATCH) return I.litV[i] === 1;
  const w = z.L.w, x = i % w + 0.5, y = (i - i % w) / w + 0.5;
  let v = false;
  if (typeof LT.lampLightAt === 'function') v = !!LT.lampLightAt(x, y);
  else {
    for (const it of z.interact) if (it.lit && it.lightR && it.kind !== 'holeLamp' && (it.x - x) ** 2 + (it.z - y) ** 2 < it.lightR * it.lightR) { v = true; break; }
    if (!v) for (const p of LT.lightPools()) if (p.lamp && p.r > 0 && (p.x - x) ** 2 + (p.z - y) ** 2 < p.r * p.r) { v = true; break; }
  }
  I.litAt[i] = I.clock; I.litV[i] = v ? 1 : 0;
  return v;
}

// ---------- what moves and skills call (combat's, stage C) ----------
function cellsIn(L, x, z, r) {
  const out = [];
  for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++)
    if (cx >= 0 && cz >= 0 && cx < L.w && cz < L.h && Math.hypot(cx + 0.5 - x, cz + 0.5 - z) <= r) out.push(cz * L.w + cx);
  return out;
}
// add stages at once to the thin cells in a list (out of lamp light unless o.lamp === false; capped at 1 inside it):
// past stage 3 a cell starts its warning. Returns how many cells took a stage
function crackCells(z, I, list, stages, o = {}) {
  let n = 0, top = 0, cx = 0, cz = 0;
  const w = z.L.w;
  for (const i of list) {
    if (!z.L.ice[i] || I.stage[i] >= 4) continue;
    let s = I.stage[i] + stages;
    if (o.lamp !== false && lampLit(z, i)) s = Math.min(s, 1);
    if (s <= I.stage[i]) continue;
    if (s >= 4) { if (I.stage[i] < 3) setStage(z, I, i, 3, true); if (!(I.fl[i] & (WARNF | PEND))) warn(z, I, i, WARN); }
    else setStage(z, I, i, s, true);
    if (!(I.fl[i] & LIVE)) { I.fl[i] |= LIVE; I.live.push(i); }
    n++; top = Math.max(top, Math.min(s, 3)); cx += i % w; cz += (i - i % w) / w;
  }
  if (n && I.sndT < I.clock) { I.sndT = I.clock + 0.12; Audio.sfx(['iceCreak', 'iceCrack1', 'iceCrack2'][top - 1] || 'iceCrack2', { x: cx / n + 0.5, z: cz / n + 0.5 }); }
  return n;
}
export function crackAt(x, z, r, stages = 1, o = {}) {
  const zn = G.zone, I = zn?.L?.ice && zn.ice; if (!I) return 0;
  return crackCells(zn, I, cellsIn(zn.L, x, z, r), stages, o);
}
// along a line w wide (Earthsplitter, the Black Wave, the Black Breath)
export function crackLine(x0, z0, x1, z1, w = 2, stages = 1, o = {}) {
  const zn = G.zone, I = zn?.L?.ice && zn.ice; if (!I) return 0;
  const L = zn.L, dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz || 1, out = [];
  for (let cz = Math.floor(Math.min(z0, z1) - w); cz <= Math.floor(Math.max(z0, z1) + w); cz++) for (let cx = Math.floor(Math.min(x0, x1) - w); cx <= Math.floor(Math.max(x0, x1) + w); cx++) {
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) continue;
    const px = cx + 0.5, pz = cz + 0.5, u = clamp(((px - x0) * dx + (pz - z0) * dz) / l2, 0, 1);
    if (Math.hypot(x0 + dx * u - px, z0 + dz * u - pz) <= w / 2) out.push(cz * L.w + cx);
  }
  return crackCells(zn, I, out, stages, o);
}
// in a cone from (x, z) facing rot, len long, arc its half-angle (as teleCone and ai.js inCone take it)
export function crackCone(x, z, rot, len, arc, stages = 1, o = {}) {
  const zn = G.zone, I = zn?.L?.ice && zn.ice; if (!I) return 0;
  const out = cellsIn(zn.L, x, z, len).filter((i) => { const cx = i % zn.L.w + 0.5 - x, cz = (i - i % zn.L.w) / zn.L.w + 0.5 - z; return Math.hypot(cx, cz) < 0.6 || Math.abs(angleDiff(rot, Math.atan2(cx, cz))) < arc; });
  return crackCells(zn, I, out, stages, o);
}
// straight to broken in the next batch (Hand Rise, the Skotos's ram): no warning, thin ice and slush alike, lamp light or
// not (o.lamp: true, only out of it)
export function breakAt(x, z, r, o = {}) {
  const zn = G.zone, I = zn?.L?.ice && zn.ice; if (!I) return 0;
  let n = 0;
  for (const i of cellsIn(zn.L, x, z, r)) {
    if (!zn.L.ice[i] || I.stage[i] === 4 || (o.lamp === true && lampLit(zn, i))) continue;
    if (I.stage[i] !== 5) setStage(zn, I, i, 3, true);
    pend(I, i); n++;
  }
  return n;
}
// Frost Nova, a beam: stages 1-3 back to 0, broken cells to slush in the next batch
export function refreezeAt(x, z, r) {
  const zn = G.zone, I = zn?.L?.ice && zn.ice; if (!I) return 0;
  let n = 0;
  for (const i of cellsIn(zn.L, x, z, r)) {
    if (!zn.L.ice[i]) continue;
    const s = I.stage[i];
    if (s === 4) { if (!(I.fl[i] & REO)) { I.fl[i] |= REO; I.reo.push(i); n++; } }
    else if (s >= 1 && s <= 3) { I.stage[i] = 0; I.load[i] = 0; I.fl[i] &= ~(WARNF | PEND); I.dirty = true; n++; }
  }
  if (n) fx('freezeCrystals', x, z, r);
  return n;
}
// a seal: the lead's cells [[ix, iz], ...] become thick ice for good (stage 0, open), one batch
export function freezeCells(cells) {
  const zn = G.zone, L = zn?.L; if (!L) return 0;
  const I = zn.ice;
  for (const [x, z] of cells) {
    const i = z * L.w + x; if (x < 0 || z < 0 || x >= L.w || z >= L.h) continue;
    if (L.sea) L.sea[i] = 0; if (L.ice) L.ice[i] = 0; if (L.thick) L.thick[i] = 1;
    if (I) { I.stage[i] = 0; I.load[i] = 0; I.fl[i] = 0; I.dirty = true; dropFloes(zn, I, i); }
  }
  const n = zn.map.open(cells);
  if (n) emit('mapChanged');
  return n;
}

// ---------- queries ----------
// 'land', 'thick' (thick ice, a window), 'thin', 'slush' or 'water' (broken ice, a hole, the sea, closed tide water)
export function iceAt(x, z) {
  const zn = G.zone, L = zn?.L; if (!L) return 'land';
  const ix = Math.floor(x), iz = Math.floor(z); if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) return 'land';
  const i = iz * L.w + ix;
  if (L.thick?.[i] || L.window?.[i]) return 'thick';
  if (L.ice?.[i]) { const s = zn.ice?.stage[i] || 0; return s === 4 ? 'water' : s === 5 ? 'slush' : 'thin'; }
  if (L.sea?.[i] || (L.bed && !zn.map.cells[i] && tidal(L, i))) return 'water';
  return 'land';
}
// the crack stage under (x, z) (0 off the thin ice): her foot ring turns white from 2
export function stageAt(x, z) {
  const zn = G.zone, L = zn?.L, I = zn?.ice; if (!I || !L?.ice) return 0;
  const ix = Math.floor(x), iz = Math.floor(z); if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) return 0;
  const i = iz * L.w + ix; return L.ice[i] ? I.stage[i] : 0;
}
// the nearest open-water cell centre within r (a hole, the sea, broken ice; closed tide water on the coast), or null
export function holeNear(x, z, r) {
  const zn = G.zone, L = zn?.L; if (!L) return null;
  let best = null, bd = r * r;
  for (const i of cellsIn(L, x, z, r)) {
    const water = L.sea?.[i] || (L.ice?.[i] && zn.ice?.stage[i] === 4) || (L.bed && TIDE && !zn.map.cells[i] && tidal(L, i));
    if (!water) continue;
    const cx = i % L.w + 0.5, cz = (i - i % L.w) / L.w + 0.5, d2 = (cx - x) ** 2 + (cz - z) ** 2;
    if (d2 < bd) { bd = d2; best = { x: cx, z: cz }; }
  }
  return best;
}

const PROBE = !!(import.meta.env?.DEV && typeof window !== 'undefined');
if (PROBE) {
  window.__act5 ||= {};
  window.__act5.ice = { get ICE() { return ICE; }, LOG: ICE_LOG, FALLS, crackAt, crackLine, crackCone, breakAt, refreezeAt, freezeCells, loadAt, iceAt, stageAt, holeNear, iceWeight, drown };
}
