// The skills' variants (two other ways to play each of the first four) and the later skills (levels 20, 30, 40).
// Each is called like a skill in skills.js: (sk, aim, rank, mult, ci), ci the skill's cooldown slot.
import * as THREE from 'three';
import { G, later } from './state.js';
import { damage, heroHit, healHero } from './combat.js';
import { foes, spawnMonster } from './actors.js';
import { fire, area } from './projectiles.js';
import { act, arcHit, circleHit, swingFx, staffTip, handPoint, nearestFoe } from './skills.js';
import { sparks, glowBurst, explosion, ring, bolt, puff, P, flash, decal, teleCircle } from '../gfx/fx.js';
import { R, shake, addLight, removeLight, kick } from '../gfx/gfx.js';
import { number } from '../ui/overlay.js';
import Audio from '../audio/audio.js';
import { rand, angleTo, angleDiff, clamp } from '../core/util.js';
import { emit } from '../ui/bus.js';
import { crackAt, crackLine, crackRing, refreezeAt } from './ice.js';
import { NET } from '../net/state.js';

const V = new THREE.Vector3();
const p = () => G.player;
const live = (f) => !f.dead && !f.prop && !f.disguised && !f.keeper && !f.hidden;
// drawn toward (x, z): never a boss, a rooted thing, a statue or one still asleep
function pull(f, x, z, k) {
  if (f.boss || f.prop || f.keeper || f.def.anchored || f.dormant || f.cling) return;
  const dx = x - f.x, dz = z - f.z, d = Math.hypot(dx, dz); if (d < 0.7) return;
  const s = k / (f.def.big ? 2.5 : 1) * Math.min(1, d / 2);
  // (co-op, on a guest: the host's monster is pulled on the host, net/coop.js)
  if (f.puppet) { NET.h.pullPuppet?.(f, (dx / d) * s, (dz / d) * s); return; }
  f.kx += (dx / d) * s; f.kz += (dz / d) * s;
}
// held to her for dur s (ai.js victim, and on a co-op host targetOf); on a guest the host holds its monster to her
function taunt(f, dur) {
  if (f.prop || f.keeper) return;
  if (f.puppet) { NET.h.tauntPuppet?.(f, dur); return; }
  f.aggro = true; f.status.fear = 0; f.taunt = G.hero.stats.time + dur; f.tauntBy = p();
}
// the foes nearest (x, z), up to n, not in skip
function nearest(x, z, r, n, skip) {
  const out = [];
  for (const f of foes(x, z, r)) if (live(f) && !skip?.has(f)) out.push([f, (f.x - x) ** 2 + (f.z - z) ** 2]);
  return out.sort((a, b) => a[1] - b[1]).slice(0, n).map((e) => e[0]);
}
// a hero effect that runs itself (projectiles.js 'custom'): o.tick(a, dt), o.end(a), o.dispose(a). o.follow: it goes
// about with her, and ends with no burst when she goes down (a co-op hero downed, who does not leave the zone)
function effect(x, z, r, dur, o) {
  const pl = p();
  const tick = o.follow ? (a, dt) => { if (pl.dead || G.player !== pl) { a.done = true; a.quiet = true; return; } o.tick?.(a, dt); } : o.tick;
  // (o.vis: [name, ...numbers], what the other pages of a co-op party draw of it: VIS below, net/coop.js)
  return area('custom', x, z, r, dur, { onTick: tick, onEnd: o.end && ((a) => { if (!a.quiet) o.end(a); }), dispose: o.dispose, light: o.light, vis: o.vis });
}
const cdr = () => 1 - G.stats.cdr / 100;

// ======================================================================================================================
// variants
// ======================================================================================================================
export const VARIANT_FN = {
  // ===== Warden =====
  // Maelstrom: the spin drags everything near into the blades
  'whirl.vortex'(sk, aim, rank, mult) {
    const pl = p(); let tick = 0, snd = 0, tor = 0;
    act({
      name: 'whirl', anim: 'spin', dur: sk.dur + 0.15 * (rank - 1), move: 0.65, trail: [0, 99],
      update(dt) {
        tick -= dt; snd -= dt;
        if (snd <= 0) { snd = 0.5; Audio.sfx('whirlwind', { vol: 0.7, pitch: 0.85 }); Audio.sfx('windGust', { vol: 0.25 }); }
        for (const f of foes(pl.x, pl.z, 6.5)) if (live(f)) pull(f, pl.x, pl.z, 26 * dt);
        if ((tor -= dt) <= 0) tor = dawnTornado(pl);
        if (tick <= 0) {
          tick = sk.tick;
          const n = circleHit(pl.x, pl.z, sk.radius + 0.3, (f) => damage(pl, f, heroHit(mult * 0.7, { area: true }), { quiet: true, resMul: 0.3, area: true }));
          if (n) { Audio.sfx('hitFlesh', { vol: 0.45 }); G.hitstop = Math.max(G.hitstop, 0.02); }
        }
        // the wind spiralling in
        for (let k = 0; k < 4; k++) { const a = Math.random() * 6.28, r = rand.range(3, 6.5); P({ add: false, x: pl.x + Math.sin(a) * r, y: rand.range(0.2, 1.6), z: pl.z + Math.cos(a) * r, vx: -Math.sin(a) * r * 1.6 + Math.cos(a) * 6, vy: 0.2, vz: -Math.cos(a) * r * 1.6 - Math.sin(a) * 6, life: 0.45, size: 0.5, size1: 0.1, color: 0xb8c4d0, alpha: 0.35, alpha1: 0, drag: 1.5 }); }
        if (Math.random() < 0.5) { const a = Math.random() * 6.28; P({ x: pl.x + Math.sin(a) * 2.4, y: 0.9, z: pl.z + Math.cos(a) * 2.4, vx: Math.cos(a) * 5, vz: -Math.sin(a) * 5, life: 0.25, size: 0.4, size1: 0.05, color: 0xe0f0ff, color1: 0x6080c0 }); }
        pl.res -= dt * 4;
        if (pl.res < 0) { pl.res = 0; pl.act.dur = Math.min(pl.act.dur, pl.act.t + 0.05); }
      }
    });
  },
  // Ember Dance: the blade burns, and so does the ground behind her
  'whirl.ember'(sk, aim, rank, mult) {
    const pl = p(); let tick = 0, snd = 0, tor = 0, patch = null;
    act({
      name: 'whirl', anim: 'spin', dur: sk.dur + 0.15 * (rank - 1), move: 0.9, trail: [0, 99],
      update(dt) {
        tick -= dt; snd -= dt;
        if (snd <= 0) { snd = 0.55; Audio.sfx('whirlwind', { vol: 0.6 }); Audio.sfx('fireCrackle', { vol: 0.4 }); }
        if ((tor -= dt) <= 0) tor = dawnTornado(pl);
        if (tick <= 0) {
          tick = sk.tick;
          const n = circleHit(pl.x, pl.z, sk.radius, (f) => damage(pl, f, heroHit(mult * 0.75, { area: true }), { knock: 1.2, kx: f.x - pl.x, kz: f.z - pl.z, quiet: true, resMul: 0.3, area: true, burn: heroHit(mult * 0.25) }));
          if (n) G.hitstop = Math.max(G.hitstop, 0.02);
          for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28; P({ x: pl.x + Math.sin(a) * sk.radius * 0.9, y: 0.8, z: pl.z + Math.cos(a) * sk.radius * 0.9, vx: Math.cos(a) * 3, vy: 0.6, vz: -Math.sin(a) * 3, life: 0.3, size: 0.45, size1: 0.05, color: 0xffd070, color1: 0xff3000 }); }
        }
        // the burning ground: where she stands the patch under her burns on; a new one only once she has moved off it
        // (a foe beside her stands in one patch, not in one for every 0.3 s she spins there); never light in a boss's dark,
        // never warmth against the Cold (Act V: a spin would hold it off for good); it melts the ice under it like any fire
        if (patch && patch.t <= patch.dur && Math.hypot(pl.x - patch.x, pl.z - patch.z) < 1.4) patch.dur = patch.t + 2.6;
        else patch = area('fire', pl.x, pl.z, 1.5, 2.6, { tick: 0.5, dmg: heroHit(mult * 0.3, { area: true }), dim: true, nowarm: true });
        pl.res -= dt * 4;
        if (pl.res < 0) { pl.res = 0; pl.act.dur = Math.min(pl.act.dur, pl.act.t + 0.05); }
      }
    });
  },
  // Seismic Leap: a heavier fall over a wider ground, and what stands round it is dragged into the pit
  'leap.seismic'(sk, aim, rank, mult) { leapCore(sk, aim, mult, { speed: 1.15, r: sk.radius * 1.45, m: 1.1, height: 3.2, seismic: true }); },
  // Twin Leap: shorter, lighter, and a second one before the first is cold
  'leap.twin'(sk, aim, rank, mult, ci) {
    const pl = p(), second = pl.twinT > 0;
    leapCore(sk, aim, mult, { speed: 1.6, r: sk.radius * 0.85, m: 0.8, range: sk.range * 0.75, height: 1.8, ghost: true });
    if (second) { pl.twinT = 0; return; }
    // the first: the cooldown waits 3 s for the second; unused, it runs on from where it would have been
    const full = sk.cd * cdr();
    pl.cds[ci] = 0.45; pl.twinT = 3; const stamp = pl.twinStamp = (pl.twinStamp || 0) + 1;
    later(3, () => { if (pl.twinStamp === stamp && pl.twinT > 0) { pl.twinT = 0; pl.cds[ci] = Math.max(pl.cds[ci], full - 3); } });
  },
  // Rallying Cry: no fear; the cry heals instead
  'cry.rally'(sk, aim, rank) {
    const pl = p();
    act({
      name: 'cry', anim: 'warcry', speed: 1.4, cut: 0.6,
      events: [[0.3, () => {
        pl.buffs.cry = sk.buff + rank;
        pl.res = Math.min(G.stats.resMax, pl.res + sk.gain);
        const heal = pl.hpMax * 0.34, dur = 4; let given = 0;
        effect(pl.x, pl.z, 3, dur, {
          follow: true, vis: ['rally'],
          light: { color: 0xffd070, intensity: 14, range: 8, y: 1.5 },
          tick(a, dt) {
            a.x = pl.x; a.z = pl.z;
            const h = heal * dt / dur; healHero(h, true); given += h;
            a.pulse = (a.pulse ?? 0) - dt; if (a.pulse <= 0) { a.pulse = 0.5; ring(pl.x, pl.z, 1.6, 0xffd070, 0.5); glowBurst(pl.x, 0.4, pl.z, 0xffe8a0, 8, 1.2, 0.3, 0.6); }
            if (Math.random() < 0.6) { const an = Math.random() * 6.28, r = rand.range(0.3, 1.1); P({ x: pl.x + Math.sin(an) * r, y: rand.range(0, 0.6), z: pl.z + Math.cos(an) * r, vy: rand.range(1.5, 3), life: 0.8, size: 0.2, size1: 0.02, color: 0xfff0b0, color1: 0xffa040 }); }
          },
          end() { if (given >= 1) number(pl.x, 2.4, pl.z, '+' + Math.round(given), 'heal'); }
        });
        ring(pl.x, pl.z, 6, 0xffd070, 0.6); ring(pl.x, pl.z, 3.5, 0xfff0c0, 0.45);
        glowBurst(pl.x, 1.4, pl.z, 0xffd070, 34, 5, 0.35, 0.7);
        addLight({ x: pl.x, y: 2, z: pl.z, color: 0xffc050, intensity: 40, range: 12, life: 0.6, fade: 0.6 });
        shake(0.25); Audio.sfx('warcry'); Audio.sfx('hornCall', { vol: 0.45 });
        if (G.stats.legs.has('lastBastion')) pl.shield = pl.hpMax * 0.25;
      }]]
    });
  },
  // Challenge: every foe near comes for her, and what they do to her comes back at them
  'cry.challenge'(sk, aim, rank) {
    const pl = p();
    act({
      name: 'cry', anim: 'taunt', speed: 1.8, cut: 0.5,
      events: [[0.25, () => {
        pl.buffs.challenge = sk.buff + rank;
        pl.res = Math.min(G.stats.resMax, pl.res + sk.gain * 1.5);
        circleHit(pl.x, pl.z, 10, (f) => { if (f.prop || f.keeper) return; taunt(f, pl.buffs.challenge); pull(f, pl.x, pl.z, 5); });
        ring(pl.x, pl.z, 10, 0xff3a20, 0.7); ring(pl.x, pl.z, 6, 0xc0c8d0, 0.5);
        for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.28; P({ x: pl.x + Math.sin(a) * 1.2, y: 0.4, z: pl.z + Math.cos(a) * 1.2, vx: Math.sin(a) * 14, vy: 0.5, vz: Math.cos(a) * 14, life: 0.5, size: 0.4, size1: 0.1, color: 0xff6040, color1: 0x601010, drag: 2.5 }); }
        addLight({ x: pl.x, y: 2, z: pl.z, color: 0xff3020, intensity: 40, range: 12, life: 0.6, fade: 0.6 });
        shake(0.35); Audio.sfx('warcry', { pitch: 0.8 }); Audio.sfx('anvil', { vol: 0.5 });
        if (G.stats.legs.has('lastBastion')) pl.shield = pl.hpMax * 0.25;
      }]]
    });
  },
  // Shatterfan: three shorter fissures in a fan
  'quake.shatter'(sk, aim, rank, mult) { quakeLines(aim.dir, [-0.5, 0, 0.5], 8, mult * 0.78); },
  // Ring of Earth: the ground breaks open round her, ring by ring
  'quake.ring'(sk, aim, rank, mult) {
    const pl = p(), hit = new Set();
    act({
      name: 'quake', anim: 'slam', speed: 1.45, face: aim.dir, cut: 0.7, trail: [0.3, 0.5],
      events: [[0.45, () => {
        Audio.sfx('slam'); shake(0.6); G.hitstop = 0.06;
        const x0 = pl.x, z0 = pl.z;
        [2.2, 4.2, 6.4].forEach((r, k) => later(k * 0.14, () => {
          ring(x0, z0, r + 0.6, 0xffa040, 0.35);
          const n = Math.round(r * 4.5);
          for (let i = 0; i < n; i++) {
            const a = (i / n) * 6.28 + k, x = x0 + Math.sin(a) * r, z = z0 + Math.cos(a) * r;
            if (!G.zone.map.walkable(x, z)) continue;
            P({ add: false, x, y: 0.1, z, vx: Math.sin(a) * 1.5, vy: rand.range(4, 8), vz: Math.cos(a) * 1.5, life: 0.8, size: rand.range(0.2, 0.35), size1: 0.18, color: 0x4a4038, alpha: 1, grav: 18 });
            if (i % 2 === 0) P({ x, y: 0.2, z, vy: 2, life: 0.35, size: 1, size1: 0.2, color: 0xffa040, color1: 0xff3000 });
            if (i % 3 === 0) decal(x, z, 'scorch', 1.1);
          }
          puff(x0, 0.3, z0, 4, 0x4a4038, 1.2, r, 0.7);
          Audio.sfx('stoneCrack', { vol: 0.6 });
          // Act V: each ring cracks the thin ice it opens (+1 stage), never the ground she stands on
          crackRing(x0, z0, r - 0.5, r + 0.5, 1, { src: 'quake' });
          circleHit(x0, z0, r + 0.9, (f) => { if (hit.has(f)) return; hit.add(f); damage(pl, f, heroHit(mult * 0.9, { area: true }), { knock: 3, kx: f.x - x0, kz: f.z - z0, stun: 0.8, area: true, breakGuard: true }); });
        }));
      }]]
    });
  },

  // ===== Ranger =====
  // Tight Volley: the bolts one after another down one line, each through two
  'multi.volley'(sk, aim, rank, mult) {
    const pl = p(), n = sk.count + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0);
    const volley = () => { for (let i = 0; i < n; i++) later(i * 0.05, () => { const o = handPoint(V); fire('bolt', pl, o.x, o.z, pl.rot + rand.range(-0.05, 0.05), { y: 1.25, pierce: 2, dmg: heroHit(mult * 0.45), opts: { knock: 1 }, look: goldBolt }); if (i % 2 === 0) Audio.sfx('arrowShoot', { vol: 0.6 }); }); };
    act({ name: 'multi', anim: 'shoot', speed: 1.4, face: aim.dir, cut: 0.5, events: [[0.1, () => { volley(); if (G.stats.legs.has('windQuiver')) later(0.35, volley); }]] });
  },
  // Scatter Blast: three bolts that burst where they strike
  'multi.scatter'(sk, aim, rank, mult) {
    const pl = p();
    const volley = () => {
      const o = handPoint(V), n = 3 + (rank >= 4 ? 1 : 0), spread = 0.8;
      for (let i = 0; i < n; i++) {
        const a = pl.rot - spread / 2 + (spread * i) / (n - 1);
        fire('blast', pl, o.x, o.z, a, { y: 1.25, onHit: (f, pr) => { pr.life = 0; }, onEnd: (x, z) => { explosion(x, z, 1.9, 0xff8a30, { shake: 0.12 }); Audio.sfx('explosion', { x, z, vol: 0.5 }); circleHit(x, z, 2.1, (f) => damage(pl, f, heroHit(mult * 0.75, { area: true }), { knock: 3, kx: f.x - x, kz: f.z - z, area: true, quiet: true })); }, look: fireBolt });
      }
      Audio.sfx('arrowShoot');
    };
    act({ name: 'multi', anim: 'volley', speed: 1.6, face: aim.dir, cut: 0.45, events: [[0.15, () => { volley(); if (G.stats.legs.has('windQuiver')) later(0.22, volley); }]] });
  },
  // Rain of Fire: burning bolts, and the ground they fall on burns after them
  'rain.fire'(sk, aim, rank, mult) {
    rainCore(sk, aim, rank, (x, z, dur) => {
      area('rain', x, z, sk.radius, dur, { tick: 0.25, delay: 0.35, dmg: heroHit(mult * 0.4, { area: true }), opts: { burn: heroHit(mult * 0.18), quiet: true }, look: fireRain });
      later(0.4, here(() => area('fire', x, z, sk.radius * 0.85, dur + 1.2, { tick: 0.5, dmg: heroHit(mult * 0.16, { area: true }), dim: true })));
    }, 0xffe0a0);
  },
  // Hail: ice instead of iron; what is under it at the end is frozen
  'rain.hail'(sk, aim, rank, mult) {
    const pl = p();
    rainCore(sk, aim, rank, (x, z, dur) => {
      area('rain', x, z, sk.radius, dur, { tick: 0.25, delay: 0.35, dmg: heroHit(mult * 0.34, { area: true }), opts: { slow: { k: 0.7, t: 0.6 }, quiet: true }, look: hailRain });
      later(dur + 0.3, here(() => { ring(x, z, sk.radius, 0xc8f0ff, 0.5); glowBurst(x, 0.6, z, 0xd8f4ff, 30, 4, 0.3, 0.6); Audio.sfx('frost', { x, z, vol: 0.8 }); circleHit(x, z, sk.radius, (f) => damage(pl, f, heroHit(mult * 0.8, { area: true }), { freeze: 1.4, area: true, quiet: true })); }));
    }, 0xffe0a0);
  },
  // The Pack: three lesser wolves
  'wolf.pack'(sk, aim, rank, mult) {
    wolfCore(sk, rank, G.stats.legs.has('wolfmother') ? 4 : 3, { hp: 0.3, m: mult * 0.5, life: 0.75, scale: 0.78, tint: 0x90d8ff });
  },
  // The Alpha: one great wolf; while it runs with her, her blows land harder (player.js ends the +15% with the last
  // Alpha). It bites lighter than a spirit wolf: the +15% on her own blows is what it is worth
  'wolf.alpha'(sk, aim, rank, mult) {
    wolfCore(sk, rank, G.stats.legs.has('wolfmother') ? 2 : 1, { hp: 1.3, m: mult * 0.6, life: 1, scale: 1.45, rim: 0xffe8a0, alpha: true });
  },
  // Splitting Shot: at the first foe it strikes, the bolt breaks into four
  'pierce.split'(sk, aim, rank, mult) {
    pierceCore(sk, aim, mult * 0.75, (f, pr) => {
      if (pr.split) return;
      pr.split = true;
      const base = Math.atan2(pr.vx, pr.vz);
      for (let k = 0; k < 4; k++) { const a = base + (-0.6 + k * 0.4); fire('bolt', p(), f.x, f.z, a, { y: 1.25, dmg: heroHit(mult * 0.35), opts: { knock: 1.5 }, life: 0.45, look: goldBolt }).hit.add(f); }
      glowBurst(f.x, 1.25, f.z, 0xfff0c0, 16, 4, 0.25, 0.4); Audio.sfx('hitMetal', { x: f.x, z: f.z, vol: 0.6 });
    });
  },
  // Siege Bolt: slower, heavier; where it stops it bursts
  'pierce.siege'(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'pierce', anim: 'shoot', speed: 0.75, face: aim.dir, cut: 0.55,
      update(dt, a) { if (a.t < 0.36 * a.clip) { const o = handPoint(V); P({ x: o.x + rand.range(-0.4, 0.4), y: o.y + rand.range(-0.4, 0.4), z: o.z + rand.range(-0.4, 0.4), life: 0.25, size: 0.2, size1: 0.4, color: 0xffc060 }); } },
      events: [[0.36, () => {
        const o = handPoint(V);
        fire('siege', pl, o.x, o.z, pl.rot, { y: 1.25, dmg: heroHit(mult * 0.7), pierce: 99, scale: 1.8, opts: { knock: 6, breakGuard: true }, look: siegeLook,
          onEnd: (x, z) => { explosion(x, z, 3.4, 0xffb040, { shake: 0.5 }); Audio.sfx('explosion', { x, z }); circleHit(x, z, 3.4, (f) => damage(pl, f, heroHit(mult * 1.3, { area: true }), { knock: 7, kx: f.x - x, kz: f.z - z, area: true, stun: 0.6 })); } });
        flash(o.x, o.y, o.z, 0xffe0a0, 3, 0.15); shake(0.3); kick(-Math.sin(pl.rot), -Math.cos(pl.rot), 0.6);
        Audio.sfx('arrowShoot', { pitch: 0.7 }); Audio.sfx('slam', { vol: 0.4 });
      }]]
    });
  },

  // ===== Mage =====
  // Trident of Flame: three smaller fireballs
  'fireball.triple'(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'fireball', anim: 'cast', speed: 1.6, face: aim.dir, cut: 0.45,
      events: [[0.22, () => {
        const o = staffTip(V); Audio.sfx('fireball');
        for (const da of [-0.28, 0, 0.28]) fire('fireball', pl, o.x, o.z, pl.rot + da, { y: Math.max(1, o.y), scale: 0.7, onHit: (f, pr) => { pr.life = 0; }, onEnd: (x, z) => { fireBoom(x, z, (sk.radius + 0.15 * rank) * 0.72, mult * 0.55, true, 1.1); wayfarer(pl, x, z, mult, 1); } });
      }]]
    });
  },
  // Pale Cinder: a white flame that seeks, and burns on where it falls
  'fireball.cinder'(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'fireball', anim: 'cast', speed: 1.6, face: aim.dir, cut: 0.45,
      events: [[0.22, () => {
        const o = staffTip(V); Audio.sfx('fireball', { pitch: 1.2 });
        fire('cinder', pl, o.x, o.z, pl.rot, { y: Math.max(1, o.y), homing: 6, onHit: (f, pr) => { pr.life = 0; }, look: cinderLook,
          onEnd: (x, z) => { wayfarer(pl, x, z, mult, 3); const r = (sk.radius + 0.15 * rank) * 0.85; explosion(x, z, r, 0xfff0c0, { shake: 0.22, smoke: 0x4a4440 }); crackAt(x, z, 1.5, 1, { src: 'fireball' }); Audio.sfx('explosion', { x, z, vol: 0.8 }); circleHit(x, z, r, (f) => damage(pl, f, heroHit(mult * 0.8, { area: true }), { knock: 3, kx: f.x - x, kz: f.z - z, burn: heroHit(mult * 0.3), area: true })); area('fire', x, z, 1.9, 3, { tick: 0.5, dmg: heroHit(mult * 0.14, { area: true }), look: paleFire, light: { color: 0xffe8b0, intensity: 12 }, dim: true }); } });
      }]]
    });
  },
  // Shatter: a shorter freeze, and what is still frozen after it bursts (a boss, whose freeze is short, always does)
  'nova.shatter'(sk, aim, rank, mult) {
    const pl = p();
    novaCore(sk, mult * 0.6, sk.freeze * 0.6 + 0.2 * rank, 0xa0e0ff, (hits) => later(1.1, here(() => {
      for (const f of hits) {
        if (f.dead || !(f.status.freeze > 0 || f.boss)) continue;
        glowBurst(f.x, 1, f.z, 0xe8faff, 22, 5, 0.3, 0.5); sparks(f.x, 1, f.z, 14, 0xd0f0ff, 7, { color1: 0x4080ff });
        damage(pl, f, heroHit(mult * 0.6, { area: true }), { area: true, quiet: true });
        f.status.freeze = 0;
      }
      if (hits.length) Audio.sfx('break', { x: pl.x, z: pl.z, vol: 0.8 });
    })));
  },
  // Blizzard: a softer wave, and a storm of snow that goes with her
  'nova.blizzard'(sk, aim, rank, mult) {
    const pl = p();
    novaCore(sk, mult * 0.5, 0, 0xd0e8ff, () => {
      let tick = 0;
      effect(pl.x, pl.z, sk.radius, 4 + 0.3 * rank, {
        follow: true, vis: ['blizzard'],
        light: { color: 0x9ac8ff, intensity: 10, range: 10, y: 2 },
        tick(a, dt) {
          a.x = pl.x; a.z = pl.z; tick -= dt;
          for (let k = 0; k < 4; k++) { const an = Math.random() * 6.28, r = Math.sqrt(Math.random()) * a.r; P({ x: pl.x + Math.sin(an) * r, y: rand.range(1.5, 3.5), z: pl.z + Math.cos(an) * r, vx: Math.cos(an) * 3, vy: -3, vz: -Math.sin(an) * 3, life: 0.7, size: 0.16, size1: 0.08, color: 0xffffff, color1: 0xa0d0ff }); }
          if (Math.random() < 0.3) P({ add: false, x: pl.x + rand.range(-4, 4), y: 0.3, z: pl.z + rand.range(-4, 4), vy: 0.2, life: 1.2, size: 1.4, size1: 2.6, color: 0xd8e8f8, alpha: 0.12, alpha1: 0 });
          if (tick <= 0) { tick = 0.4; circleHit(pl.x, pl.z, a.r, (f) => damage(pl, f, heroHit(mult * 0.07, { area: true }), { slow: { k: 0.5, t: 0.6 }, quiet: true, area: true, lohMul: 0.3 })); }
        }
      });
    });
  },
  // Forked Lightning: it splits at the first foe into three, and each of those once more
  'chain.fork'(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'chain', anim: 'cast', speed: 1.8, face: aim.dir, cut: 0.42,
      events: [[0.2, () => {
        const o = staffTip(V).clone(), first = aim.target || nearestFoe(sk.range, aim.dir);
        Audio.sfx('lightning');
        if (!first) { bolt(o.x, o.y, o.z, pl.x + Math.sin(pl.rot) * 6, 0.3, pl.z + Math.cos(pl.rot) * 6, 0xc0b0ff); return; }
        const hit = new Set([first]), forks = 3 + (rank >= 4 ? 1 : 0) + (G.stats.legs.has('stormRing') ? 2 : 0);
        const zap = (f, sx, sy, sz, m, delay) => later(delay, () => { if (f.dead) return; bolt(sx, sy, sz, f.x, 1.1, f.z, 0xc0b0ff, 1.1); damage(pl, f, heroHit(m), { stun: 0.25, quiet: delay > 0 }); });
        zap(first, o.x, o.y, o.z, mult * 1.0, 0);
        nearest(first.x, first.z, 8, forks, hit).forEach((f, i) => {
          hit.add(f); zap(f, first.x, 1.1, first.z, mult * 0.8, 0.08);
          const g = nearest(f.x, f.z, 6, 1, hit)[0];
          if (g) { hit.add(g); zap(g, f.x, 1.1, f.z, mult * 0.65, 0.16 + i * 0.02); }
        });
        glowBurst(first.x, 1.2, first.z, 0xc0b0ff, 18, 4, 0.25, 0.4);
      }]]
    });
  },
  // Ball Lightning: a slow sphere of storm that lashes what it passes
  'chain.ball'(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'chain', anim: 'cast', speed: 1.6, face: aim.dir, cut: 0.45,
      events: [[0.22, () => {
        const o = staffTip(V); Audio.sfx('lightning', { vol: 0.7 });
        let z0 = 0;
        fire('spark', pl, o.x, o.z, pl.rot, { y: 1.2, pierce: 999, onHit: () => {}, look: sparkLook,
          onTick(pr, dt) {
            z0 -= dt; if (z0 > 0) return; z0 = 0.25;
            const n = nearest(pr.x, pr.z, 4.5, 2 + (rank >= 4 ? 1 : 0) + (G.stats.legs.has('stormRing') ? 1 : 0));
            for (const f of n) { bolt(pr.x, pr.y, pr.z, f.x, 1.1, f.z, 0xb0a0ff, 0.9); damage(pl, f, heroHit(mult * 0.34), { stun: 0.15, quiet: true }); }
            if (n.length) Audio.sfx('lightning', { x: pr.x, z: pr.z, vol: 0.3 });
          },
          onEnd: (x, z) => { glowBurst(x, 1.2, z, 0xc0b0ff, 24, 5, 0.3, 0.5); circleHit(x, z, 2.5, (f) => damage(pl, f, heroHit(mult * 0.8, { area: true }), { stun: 0.4, area: true })); Audio.sfx('lightning', { x, z }); } });
      }]]
    });
  },
  // Meteor Shower: five smaller stones over the place
  'meteor.shower'(sk, aim, rank, mult) {
    const pl = p(), x = aim.x, z = aim.z;
    act({
      name: 'meteor', anim: 'castUp', speed: 2.0, face: angleTo(pl.x, pl.z, x, z), cut: 0.42,
      events: [[0.2, () => {
        teleCircle(x, z, sk.radius + 1.2, 0.9, 0xff6a20);
        Audio.sfx('meteorFall', { x, z });
        const n = 5 + (rank >= 4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.28 + rand.range(-0.4, 0.4), r = i === 0 ? 0 : rand.range(1.2, sk.radius + 0.8), mx = x + Math.sin(a) * r, mz = z + Math.cos(a) * r;
          meteorFall(mx, mz, 0.55 + i * 0.22, 0.7, () => { explosion(mx, mz, 1.9, 0xff5a10, { shake: 0.25 }); crackAt(mx, mz, 2, 1, { src: 'meteor' }); Audio.sfx('explosion', { x: mx, z: mz, vol: 0.6 }); circleHit(mx, mz, 2.0, (f) => damage(pl, f, heroHit(mult * 0.55, { area: true }), { knock: 3, kx: f.x - mx, kz: f.z - mz, burn: heroHit(mult * 0.1), area: true })); });
        }
      }]]
    });
  },
  // Frozen Comet: a stone of ice that freezes where it falls
  'meteor.comet'(sk, aim, rank, mult) {
    const pl = p(), x = aim.x, z = aim.z, r = sk.radius;
    act({
      name: 'meteor', anim: 'castUp', speed: 2.0, face: angleTo(pl.x, pl.z, x, z), cut: 0.42,
      events: [[0.2, () => {
        teleCircle(x, z, r, 0.95, 0xffe0a0);
        Audio.sfx('meteorFall', { x, z, pitch: 1.2 });
        meteorFall(x, z, 0.95, 1.4, () => {
          explosion(x, z, r, 0x9ad8ff, { shake: 0.7, smoke: 0xb0c8e0 });
          // Act V: a stone of ice is a stone still: it breaks thin ice wide open as a Meteor does (+2 stages, r 3.5)
          crackAt(x, z, 3.5, 2, { src: 'meteor' });
          for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, s = rand.range(3, 9); P({ x, y: 0.5, z, vx: Math.cos(a) * s, vy: rand.range(2, 6), vz: Math.sin(a) * s, life: 0.7, size: rand.range(0.15, 0.3), size1: 0.05, color: 0xffffff, color1: 0x80c0ff, grav: 12 }); }
          Audio.sfx('explosion', { x, z }); Audio.sfx('frost', { x, z });
          G.hitstop = 0.08;
          circleHit(x, z, r, (f) => damage(pl, f, heroHit(mult * 0.85, { area: true }), { knock: 4, kx: f.x - x, kz: f.z - z, freeze: 2 + 0.2 * rank, area: true }));
          let tick = 0;
          effect(x, z, r * 0.8, 3 + rank * 0.3, { light: { color: 0x9ac8ff, intensity: 10 }, vis: ['comet'], tick(a, dt) {
            tick -= dt; if (Math.random() < 0.6) P({ x: x + rand.range(-a.r, a.r) * 0.8, y: 0.1, z: z + rand.range(-a.r, a.r) * 0.8, vy: rand.range(0.4, 1.2), life: 0.6, size: 0.3, size1: 0.05, color: 0xe0f4ff, color1: 0x4a8aff });
            if (tick <= 0) { tick = 0.5; circleHit(x, z, a.r, (f) => damage(pl, f, heroHit(mult * 0.1, { area: true }), { chill: 0.8, quiet: true, area: true, dot: true })); }
          } });
          decal(x, z, 'ecto', r * 1.6);
        }, true);
      }]]
    });
  }
};

// ---------- variant helpers ----------
function leapCore(sk, aim, mult, o) {
  const pl = p(), map = G.zone.map, range = o.range || sk.range;
  let tx = aim.x, tz = aim.z;
  const d = Math.hypot(tx - pl.x, tz - pl.z);
  if (d > range) { tx = pl.x + (tx - pl.x) * range / d; tz = pl.z + (tz - pl.z) * range / d; }
  const k = map.castT(pl.x, pl.z, tx, tz, 0.3); tx = pl.x + (tx - pl.x) * k; tz = pl.z + (tz - pl.z) * k;
  const sx = pl.x, sz = pl.z, R0 = o.r;
  teleCircle(tx, tz, R0, 0.5, 0xffb040);
  Audio.sfx('leap');
  act({
    name: 'leap', anim: 'leap', speed: o.speed, face: angleTo(pl.x, pl.z, tx, tz), cut: 0.8, trail: [0.4, 0.62],
    update(dt, a) {
      const u = clamp((a.t - 0.08 * a.clip) / (0.47 * a.clip), 0, 1);
      pl.x = sx + (tx - sx) * u; pl.z = sz + (tz - sz) * u; pl.y = Math.sin(u * Math.PI) * o.height;
      pl.iframes = Math.max(pl.iframes, u < 1 ? 0.1 : 0);
      if (o.ghost && u > 0 && u < 1) P({ x: pl.x, y: pl.y + 1, z: pl.z, life: 0.35, size: 1.1, size1: 0.3, color: 0x9ad8ff, alpha: 0.35 });
    },
    events: [[0.56, () => {
      pl.y = 0;
      // Act V: her landing cracks thin ice round it (+1 stage), as wide as the fall
      crackAt(tx, tz, 3 * R0 / sk.radius, 1, { src: 'leap' });
      if (o.seismic) for (const f of foes(tx, tz, R0 * 2)) if (live(f)) pull(f, tx, tz, 9);
      const n = circleHit(tx, tz, R0, (f) => damage(pl, f, heroHit(mult * o.m, { area: true }), { knock: o.seismic ? 0 : 5, kx: f.x - tx, kz: f.z - tz, stun: o.seismic ? 1.8 : 1.0, area: true, breakGuard: true }));
      explosion(tx, tz, R0 * 0.8, o.seismic ? 0xffa060 : 0x9ad8ff, { smoke: 0x5a4a3a, shake: o.seismic ? 0.8 : 0.4 });
      if (o.seismic) { ring(tx, tz, R0 * 2, 0xffb040, 0.6); for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28; P({ add: false, x: tx + Math.sin(a) * R0, y: 0.2, z: tz + Math.cos(a) * R0, vx: -Math.sin(a) * 4, vy: rand.range(3, 6), vz: -Math.cos(a) * 4, life: 0.8, size: 0.3, size1: 0.2, color: 0x5a4a3a, alpha: 1, grav: 16 }); } decal(tx, tz, 'scorch', R0 * 1.6); }
      else ring(tx, tz, R0, 0xc0e8ff, 0.4);
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28; P({ add: false, x: tx, y: 0.2, z: tz, vx: Math.cos(a) * 6, vy: rand.range(2, 5), vz: Math.sin(a) * 6, life: 0.8, size: 0.18, size1: 0.12, color: 0x5a4a3a, alpha: 1, grav: 14 }); }
      Audio.sfx('slam', { pitch: o.seismic ? 0.75 : 1.1 }); kick(0, 0.4, o.seismic ? 1.4 : 0.8);
      G.hitstop = n ? 0.09 : 0.03;
    }]]
  });
}
function quakeLines(dir, offs, len, m) {
  const pl = p(), hit = new Set();
  act({
    name: 'quake', anim: 'slam', speed: 1.45, face: dir, cut: 0.7, trail: [0.3, 0.5],
    events: [[0.45, () => {
      Audio.sfx('slam'); shake(0.5); G.hitstop = 0.06;
      const x0 = pl.x, z0 = pl.z;
      // Act V: every fissure cracks thin ice along it (+1 stage)
      for (const da of offs) crackLine(x0 + Math.sin(dir + da) * 1.2, z0 + Math.cos(dir + da) * 1.2, x0 + Math.sin(dir + da) * (1.2 + len), z0 + Math.cos(dir + da) * (1.2 + len), 2, 1, { src: 'quake' });
      for (const da of offs) for (let i = 0; i < len; i++) later(i * 0.035, () => {
        const a = dir + da, x = x0 + Math.sin(a) * (1.2 + i), z = z0 + Math.cos(a) * (1.2 + i);
        if (!G.zone.map.walkable(x, z)) return;
        for (let k = 0; k < 3; k++) P({ add: false, x: x + rand.range(-0.3, 0.3), y: 0.1, z: z + rand.range(-0.3, 0.3), vx: rand.range(-1, 1), vy: rand.range(4, 7), vz: rand.range(-1, 1), life: 0.8, size: rand.range(0.18, 0.3), size1: 0.18, color: 0x4a4038, alpha: 1, grav: 18 });
        P({ x, y: 0.2, z, vy: 2, life: 0.35, size: 1.1, size1: 0.2, color: 0xffb050, color1: 0xff3000 });
        decal(x, z, 'scorch', 1.1);
        if (i % 4 === 0 && da === 0) Audio.sfx('hitBone', { x, z, vol: 0.5 });
        circleHit(x, z, 1.5, (f) => { if (hit.has(f)) return; hit.add(f); damage(pl, f, heroHit(m, { area: true }), { knock: 3, kx: Math.sin(a), kz: Math.cos(a), stun: 0.6, area: true, breakGuard: true }); });
      });
    }]]
  });
}
function rainCore(sk, aim, rank, drop, tele) {
  const pl = p(), x = aim.x, z = aim.z;
  act({
    name: 'rain', anim: 'volley', speed: 1.6, face: angleTo(pl.x, pl.z, x, z), cut: 0.45,
    events: [[0.15, () => {
      Audio.sfx('arrowShoot'); for (let i = 0; i < 8; i++) P({ x: pl.x, y: 1.6, z: pl.z, vx: rand.range(-1, 1), vy: 14, vz: rand.range(-1, 1), life: 0.4, size: 0.15, size1: 0.05, color: 0xfff0d0 });
      teleCircle(x, z, sk.radius, 0.35, tele);
      drop(x, z, sk.dur + 0.2 * (rank - 1));
      // Act V: +1 stage under the rain, once a cast (the Ranger cracks from range, whatever falls)
      later(0.4, here(() => crackAt(x, z, 3.5, 1, { src: 'rain' })));
    }]]
  });
}
function wolfCore(sk, rank, count, o) {
  const pl = p(), out = [];
  act({
    name: 'wolf', anim: 'summon', speed: 3.2, cut: 0.35,
    events: [[0.3, () => {
      for (let i = 0; i < count; i++) {
        const a = pl.rot + (count === 1 ? 0.9 : -1.4 + (2.8 * i) / (count - 1)), x = pl.x + Math.sin(a) * 1.8, z = pl.z + Math.cos(a) * 1.8;
        const w = spawnMonster('spiritWolf', x, z, { level: G.hero.level, scale: o.scale });
        w.team = 'hero'; w.pet = true; w.life = (sk.dur + rank * 2) * o.life; w.dmgMult = o.m; w.hp = w.hpMax = G.stats.lifeMax * 0.6 * o.hp;
        if (o.rim) { w.avatar?.setRim(o.rim, 2.2); w.avatar?.setTint(0xfff0d0, 0.5); }
        if (o.tint) w.avatar?.setTint(o.tint, 0.85);
        G.actors.push(w); out.push(w);
        if (o.alpha) { w.alpha = true; pl.buffs.alpha = w.life; }
        glowBurst(x, 0.8, z, o.rim || 0x80d0ff, 30, 4, 0.3, 0.8); ring(x, z, 2 * o.scale, o.rim || 0x80d0ff, 0.5);
      }
      Audio.sfx('summon'); Audio.sfx('wolfHowl', { vol: 0.6, pitch: o.scale > 1 ? 0.75 : 1.15 });
    }]]
  });
  return out;
}
function pierceCore(sk, aim, m, onHit) {
  const pl = p();
  act({
    name: 'pierce', anim: 'shoot', speed: 0.9, face: aim.dir, cut: 0.5,
    events: [[0.3, () => {
      const o = handPoint(V);
      fire('pierce', pl, o.x, o.z, pl.rot, { y: 1.25, pierce: 99, life: 0.75, onHit: (f, pr) => { damage(pl, f, heroHit(m), { knock: 4, kx: pr.vx, kz: pr.vz, breakGuard: true }); onHit(f, pr); } });
      flash(o.x, o.y, o.z, 0xfff0c0, 2.5, 0.12); shake(0.2);
      Audio.sfx('arrowShoot'); Audio.sfx('crit', { vol: 0.5 });
    }]]
  });
}
// a delayed landing (a Hail's burst, a falling stone, a thrown trap) only in the zone it was cast in: travel keeps the
// timers going through its fade
const here = (fn) => { const z0 = G.zone; return (...a) => { if (G.zone === z0) fn(...a); }; };
// the legendaries that change a skill (skills.js) change its variants too: Dawnblade's fire tornadoes behind a spin
// (one each 0.5 s: what it returns is the wait), the Wayfarer's Staff's small fireballs where a fireball bursts (the base
// skill's three; one each for the Trident's three)
function dawnTornado(pl) {
  if (!G.stats.legs.has('dawnblade')) return 0.5;
  const a = Math.random() * 6.28;
  area('tornado', pl.x, pl.z, 1.3, 3, { tick: 0.4, dmg: heroHit(0.25, { area: true }), vx: Math.sin(a) * 2.5, vz: Math.cos(a) * 2.5, opts: { burn: 3 } });
  return 0.5;
}
function wayfarer(pl, x, z, mult, n) {
  if (!G.stats.legs.has('wayfarerStaff')) return;
  for (let k = 0; k < n; k++) { const a = Math.random() * 6.28; fire('mini', pl, x, z, a, { y: 1, onHit: (f, pr) => { pr.life = 0; }, onEnd: (mx, mz) => fireBoom(mx, mz, 1.8, mult * 0.4, true) }); }
}
// (crack: the thin ice it breaks round it, Act V; the Trident's three each a smaller one than a Fireball's 1.5)
function fireBoom(x, z, r, m, small, crack = 0) {
  const pl = p();
  explosion(x, z, r, 0xff7a20, { shake: small ? 0.12 : 0.3 });
  if (crack) crackAt(x, z, crack, 1, { src: 'fireball' });
  Audio.sfx('explosion', { x, z, vol: small ? 0.6 : 1 });
  circleHit(x, z, r, (f) => damage(pl, f, heroHit(m, { area: true }), { knock: small ? 2 : 4, kx: f.x - x, kz: f.z - z, burn: heroHit(m * 0.3), area: true }));
}
function novaCore(sk, m, freeze, color, then) {
  const pl = p();
  act({
    name: 'nova', anim: 'castUp', speed: 2.4, cut: 0.42,
    events: [[0.2, () => {
      const r = sk.radius, hits = [];
      for (let i = 0; i < 70; i++) { const a = (i / 70) * 6.283; P({ x: pl.x, y: 0.5, z: pl.z, vx: Math.sin(a) * r * 2.4, vy: rand.range(0, 1.5), vz: Math.cos(a) * r * 2.4, life: 0.45, size: 0.5, size1: 0.15, color: 0xe0f8ff, color1: color, drag: 3 }); }
      ring(pl.x, pl.z, r, color, 0.5); ring(pl.x, pl.z, r * 0.6, 0xffffff, 0.35);
      addLight({ x: pl.x, y: 1.5, z: pl.z, color: 0x80c8ff, intensity: 45, range: r * 2.5, life: 0.5, fade: 0.5 });
      Audio.sfx('frost'); shake(0.2);
      circleHit(pl.x, pl.z, r, (f) => { damage(pl, f, heroHit(m, { area: true }), freeze ? { freeze, area: true } : { chill: 2, area: true }); hits.push(f); glowBurst(f.x, 1, f.z, 0xb0e8ff, 6, 2, 0.25, 0.5); });
      // Act V: the wave builds with frost as the Nova does (cracks heal, holes freeze to slush; an Icemaw under one is held:
      // ai.js), the wave only: Blizzard's storm that goes with her never does
      if (refreezeAt(pl.x, pl.z, r)) Audio.sfx('refreeze', { x: pl.x, z: pl.z, vol: 0.7 });
      emit('frostNova', pl.x, pl.z, r);
      then(hits);
    }]]
  });
}
// a stone (of fire or ice) from the sky, landing at (x, z) after t s
function meteorFall(x, z, t, size, land, ice) {
  const c0 = ice ? 0xe8f8ff : 0xffd080, c1 = ice ? 0x4a8aff : 0xff3000, sm = ice ? 0xc0d8f0 : 0x2a2420;
  const n = Math.round(t / 0.05);
  for (let k = 0; k < n; k++) later(k * 0.05, () => { const u = k / n; P({ x: x - 6 + u * 6, y: 14 - u * 14, z: z - 3 + u * 3, life: 0.35, size: 2.2 * size, size1: 0.4, color: c0, color1: c1 }); P({ add: false, x: x - 6 + u * 6, y: 14 - u * 14, z: z - 3 + u * 3, vy: 0.5, life: 1.0, size: 1.2 * size, size1: 2.5 * size, color: sm, alpha: 0.45 }); });
  later(t, here(land));
}
// projectile looks
function goldBolt(pr) { P({ x: pr.x, y: pr.y, z: pr.z, life: 0.2, size: 0.3, size1: 0.04, color: 0xfff0b0, color1: 0xffa040 }); }
function fireBolt(pr) { P({ x: pr.x, y: pr.y, z: pr.z, vx: -pr.vx * 0.04, vy: rand.range(0.2, 0.6), vz: -pr.vz * 0.04, life: 0.3, size: 0.42, size1: 0.05, color: 0xffc060, color1: 0xff3000 }); }
function siegeLook(pr, dt) {
  for (let k = 0; k < 3; k++) P({ x: pr.x - pr.vx * dt * k * 0.4, y: pr.y, z: pr.z - pr.vz * dt * k * 0.4, life: 0.4, size: 0.9, size1: 0.05, color: 0xfff0c0, color1: 0xff8020 });
  if (Math.random() < 0.4) P({ add: false, x: pr.x, y: pr.y, z: pr.z, vy: 0.4, life: 0.8, size: 0.5, size1: 1.2, color: 0x3a3430, alpha: 0.35 });
}
function cinderLook(pr) {
  for (let k = 0; k < 3; k++) P({ x: pr.x + rand.range(-0.12, 0.12), y: pr.y + rand.range(-0.12, 0.12), z: pr.z + rand.range(-0.12, 0.12), vx: -pr.vx * 0.05, vy: rand.range(0.3, 1.2), vz: -pr.vz * 0.05, life: rand.range(0.25, 0.45), size: 0.6, size1: 0.08, color: 0xffffff, color1: 0xffc060 });
}
function sparkLook(pr) {
  P({ x: pr.x, y: pr.y, z: pr.z, life: 0.15, size: 1.4 + Math.random() * 0.4, size1: 0.6, color: 0xe8e0ff, color1: 0x7060ff });
  if (Math.random() < 0.5) { const a = Math.random() * 6.28, e = Math.random() * 6.28; bolt(pr.x, pr.y, pr.z, pr.x + Math.sin(a) * 1.2, pr.y + Math.sin(e) * 0.8, pr.z + Math.cos(a) * 1.2, 0xc0b0ff, 0.5); }
}
function fireRain(a) {
  for (let k = 0; k < 2; k++) { const rx = a.x + rand.range(-a.r, a.r) * 0.85, rz = a.z + rand.range(-a.r, a.r) * 0.85; P({ x: rx, y: 6, z: rz - 1, vy: -24, vz: 4, life: 0.24, size: 0.3, size1: 0.12, color: 0xffd080, color1: 0xff4010 }); if (Math.random() < 0.3) sparks(rx, 0.1, rz, 3, 0xffa040, 3); }
}
function hailRain(a) {
  for (let k = 0; k < 3; k++) { const rx = a.x + rand.range(-a.r, a.r) * 0.85, rz = a.z + rand.range(-a.r, a.r) * 0.85; P({ x: rx, y: 6, z: rz - 0.6, vy: -22, vz: 2, life: 0.26, size: 0.2, size1: 0.14, color: 0xffffff, color1: 0xa0d8ff }); if (Math.random() < 0.3) sparks(rx, 0.1, rz, 3, 0xe0f4ff, 3, { color1: 0x6090ff }); }
}
function paleFire(a) { if (Math.random() < 0.7) P({ x: a.x + rand.range(-a.r, a.r) * 0.8, y: 0.1, z: a.z + rand.range(-a.r, a.r) * 0.8, vy: rand.range(1, 2.5), life: rand.range(0.3, 0.6), size: 0.5, size1: 0.1, color: 0xfff4d0, color1: 0xffa040 }); }

// ======================================================================================================================
// the later skills
// ======================================================================================================================
export const NEW_FN = {
  // ===== Warden =====
  // Shield Charge: behind the shield, straight through them
  charge(sk, aim, rank, mult) {
    const pl = p(), map = G.zone.map, dir = aim.dir;
    let tx = pl.x + Math.sin(dir) * sk.range, tz = pl.z + Math.cos(dir) * sk.range;
    const k = map.castT(pl.x, pl.z, tx, tz, 0.35); tx = pl.x + (tx - pl.x) * k; tz = pl.z + (tz - pl.z) * k;
    const sx = pl.x, sz = pl.z, hit = new Set(), T = 0.36;
    let done = false;
    Audio.sfx('roll'); Audio.sfx('swingHeavy', { pitch: 0.8 });
    const end = () => {
      if (done) return; done = true;
      const n = circleHit(pl.x, pl.z, sk.radius, (f) => damage(pl, f, heroHit(mult * 0.8, { area: true }), { knock: 5, kx: f.x - pl.x, kz: f.z - pl.z, stun: 0.8, area: true }));
      explosion(pl.x + Math.sin(dir), pl.z + Math.cos(dir), 1.6, 0xffd080, { smoke: 0x5a4a3a, shake: 0.35 });
      Audio.sfx('shieldBlock', { pitch: 0.8 }); Audio.sfx('slam', { vol: 0.6 });
      G.hitstop = Math.max(G.hitstop, n ? 0.07 : 0.02);
    };
    act({
      name: 'charge', anim: 'Shield_Dash', speed: 1.6, face: dir, dur: T + 0.22,
      update(dt, a) {
        const u = clamp(a.t / T, 0, 1);
        pl.x = sx + (tx - sx) * u; pl.z = sz + (tz - sz) * u;
        pl.iframes = Math.max(pl.iframes, u < 1 ? 0.08 : 0);
        for (const f of foes(pl.x, pl.z, 1.8)) {
          if (hit.has(f) || !live(f)) continue; hit.add(f);
          const side = Math.sign(angleDiff(dir, angleTo(pl.x, pl.z, f.x, f.z))) || 1, kx = Math.sin(dir + side * 1.2), kz = Math.cos(dir + side * 1.2);
          damage(pl, f, heroHit(mult), { knock: 8, kx, kz, stun: 1 + 0.1 * rank, breakGuard: true });
          pl.res = Math.min(G.stats.resMax, pl.res + 4);
          sparks(f.x, 1.2, f.z, 10, 0xffe0b0, 5);
        }
        if (u < 1) { P({ add: false, x: pl.x, y: 0.15, z: pl.z, vx: rand.range(-1, 1), vy: 0.6, vz: rand.range(-1, 1), life: 0.6, size: 0.5, size1: 1.2, color: 0x6a5a48, alpha: 0.45 }); P({ x: pl.x + Math.sin(dir) * 0.7, y: 1.1, z: pl.z + Math.cos(dir) * 0.7, life: 0.15, size: 1.4, size1: 0.6, color: 0xffe8b0, alpha: 0.35 }); }
        else end();
      },
      end
    });
    pl.res = Math.min(G.stats.resMax, pl.res + sk.gain);
  },
  // Iron Bulwark: the shield up, the foes drawn to it; what it takes it gives back when it falls
  bulwark(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'bulwark', anim: 'Shield_OneShot', speed: 1.2, cut: 0.6,
      events: [[0.25, () => {
        const amount = pl.hpMax * (sk.shield + 0.04 * (rank - 1)), dur = sk.buff + 0.5 * rank;
        pl.shield = Math.max(pl.shield || 0, amount);
        pl.buffs.bulwark = dur;
        circleHit(pl.x, pl.z, 9, (f) => taunt(f, dur));
        ring(pl.x, pl.z, 9, 0xffd070, 0.6);
        Audio.sfx('shieldBlock'); Audio.sfx('anvil', { vol: 0.6 }); shake(0.25);
        let spin = 0;
        const dome = domeMesh(), start = amount;
        effect(pl.x, pl.z, sk.radius, dur, {
          follow: true, vis: ['bulwark'],
          light: { color: 0xffd070, intensity: 10, range: 6, y: 1.2 },
          tick(a, dt) {
            a.x = pl.x; a.z = pl.z; spin += dt;
            dome.position.set(pl.x, 0, pl.z); dome.rotation.y = spin * 0.8;
            dome.material.opacity = 0.1 + 0.04 * Math.sin(spin * 6) + 0.16 * Math.min(1, (pl.shield || 0) / start);
            for (let k = 0; k < 2; k++) { const an = spin * 3 + k * 3.14, r = 1.2; P({ x: pl.x + Math.sin(an) * r, y: 0.3 + (spin * 1.3 + k) % 1.8, z: pl.z + Math.cos(an) * r, life: 0.4, size: 0.25, size1: 0.04, color: 0xfff0c0, color1: 0xffa040 }); }
            if (!(pl.shield > 0) && a.t > 0.2) a.done = true;
          },
          end() {
            const taken = Math.max(0, start - Math.max(0, pl.shield || 0)), k = 1 + Math.min(3, (taken / pl.hpMax) * 4);
            pl.shield = 0; delete pl.buffs.bulwark;
            explosion(pl.x, pl.z, sk.radius, 0xffd070, { smoke: 0x5a4a3a, shake: 0.4 });
            ring(pl.x, pl.z, sk.radius, 0xfff0c0, 0.5);
            Audio.sfx('explosion', { vol: 0.8 }); Audio.sfx('shieldBlock', { pitch: 0.7 });
            circleHit(pl.x, pl.z, sk.radius, (f) => damage(pl, f, heroHit(mult * k, { area: true }), { knock: 6, kx: f.x - pl.x, kz: f.z - pl.z, stun: 0.6, area: true, breakGuard: true }));
          },
          // (also when a waypoint clears it, with no burst: the ward does not go on without its dome)
          dispose() { dropMesh(dome); pl.shield = 0; delete pl.buffs.bulwark; }
        });
      }]]
    });
  },
  // Dawnbreaker: three great blows, each a wave of light down the field; the third is three waves
  dawn(sk, aim, rank, mult) {
    const pl = p();
    // (the third blow's three waves strike a foe once between them)
    const wave = (da, m, big, hit) => {
      const a = pl.rot + da, x = pl.x + Math.sin(a) * 0.8, z = pl.z + Math.cos(a) * 0.8;
      const pr = fire('radiant', pl, x, z, a, { y: 1, pierce: 99, life: sk.range / 19, r: big ? 1.8 : 1.4, dmg: heroHit(m, { area: true }), opts: { knock: big ? 5 : 3, area: true, breakGuard: big }, look: radiantLook });
      if (hit) pr.hit = hit;
    };
    const blow = (k) => () => {
      const big = k === 2;
      if (big) { const hit = new Set(); for (const da of [-0.35, 0, 0.35]) wave(da, mult * 1.1, true, hit); } else wave(0, mult, false);
      flash(pl.x + Math.sin(pl.rot), 1.2, pl.z + Math.cos(pl.rot), 0xfff0c0, big ? 4 : 2.5, 0.15);
      addLight({ x: pl.x, y: 2, z: pl.z, color: 0xffd070, intensity: big ? 50 : 25, range: 12, life: 0.4, fade: 0.4 });
      arcHit(2.8, Math.PI * 0.9, (f) => damage(pl, f, heroHit(mult * 0.5), { knock: 3, kx: f.x - pl.x, kz: f.z - pl.z }));
      swingFx(1, big); if (big) { shake(0.45); Audio.sfx('beaconIgnite', { vol: 0.5 }); } else Audio.sfx('lampLight', { vol: 0.6 });
    };
    act({ name: 'dawn', anim: 'Sword_Heavy_Combo', speed: 2.4, face: aim.dir, cut: 0.92, trail: [0.12, 0.85], events: [[0.24, blow(0)], [0.47, blow(1)], [0.74, blow(2)]],
      update(dt, a) { if (a.t < 0.24 * a.clip && Math.random() < 0.6) { const o = handPoint(V); P({ x: o.x, y: o.y, z: o.z, vy: 1, life: 0.3, size: 0.3, size1: 0.05, color: 0xfff0c0, color1: 0xffa040 }); } } });
  },

  // ===== Ranger =====
  // Snare: a sprung trap thrown ahead; whatever steps near, or after four seconds, it bites
  trap(sk, aim, rank, mult) {
    const pl = p(), map = G.zone.map;
    let tx = aim.x, tz = aim.z;
    if (!map.walkable(tx, tz)) { const f = map.nearestFloor(tx, tz, 3); tx = f.x; tz = f.z; }
    act({
      name: 'trap', anim: 'OverhandThrow', speed: 1.8, face: angleTo(pl.x, pl.z, tx, tz), cut: 0.5,
      events: [[0.3, () => {
        const o = handPoint(V), fly = 0.38, sx = o.x, sy = o.y, sz = o.z;
        Audio.sfx('swing', { vol: 0.6 });
        for (let k = 0; k <= 8; k++) later((k / 8) * fly, () => { const u = k / 8; P({ x: sx + (tx - sx) * u, y: sy + (0 - sy) * u + Math.sin(u * Math.PI) * 2.2, z: sz + (tz - sz) * u, life: 0.25, size: 0.3, size1: 0.05, color: 0xd0d8e0, color1: 0x6a7480 }); });
        later(fly, here(() => {
          Audio.sfx('trap', { x: tx, z: tz, vol: 0.6 }); sparks(tx, 0.2, tz, 8, 0xe0e8f0, 3);
          const jaw = trapMesh(); jaw.position.set(tx, 0.05, tz); jaw.rotation.y = Math.random() * 6.28;
          let armed = false, sprung = false;
          const spring = () => {
            if (sprung) return; sprung = true;
            jaw.scale.set(1, 2.4, 0.4);
            explosion(tx, tz, 1.4, 0xd8e0e8, { smoke: 0x4a4a4a, shake: 0.3 });
            ring(tx, tz, sk.radius, 0xe8eef4, 0.4);
            for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.28; P({ add: false, x: tx, y: 0.3, z: tz, vx: Math.sin(a) * 9, vy: rand.range(1, 3), vz: Math.cos(a) * 9, life: 0.4, size: 0.12, size1: 0.08, color: 0x9aa4b0, alpha: 1, grav: 10, drag: 3 }); }
            Audio.sfx('chainSnap', { x: tx, z: tz }); Audio.sfx('hitMetal', { x: tx, z: tz });
            circleHit(tx, tz, sk.radius, (f) => damage(pl, f, heroHit(mult, { area: true }), { stun: 1.3 + 0.1 * rank, burn: heroHit(mult * 0.35), area: true, breakGuard: true }));
          };
          effect(tx, tz, sk.radius, 4.6, {
            vis: ['trap'],
            tick(a) {
              if (!armed && a.t > 0.5) { armed = true; ring(tx, tz, 1.6, 0xffe0a0, 0.3); }
              if (sprung) { if (a.t > a.springT + 0.5) a.done = true; return; }
              if (Math.random() < 0.15) P({ x: tx + rand.range(-0.4, 0.4), y: 0.15, z: tz + rand.range(-0.4, 0.4), life: 0.3, size: 0.1, size1: 0.02, color: 0xfff0d0 });
              if ((armed && foes(tx, tz, 1.7).some(live)) || a.t > 4) { a.springT = a.t; spring(); }
            },
            end() { if (!sprung) spring(); },
            dispose() { dropMesh(jaw); }
          });
        }));
      }]]
    });
  },
  // Vault: a leap back out of reach, loosing a fan of bolts at what was there; the ground left behind is strewn with caltrops
  vault(sk, aim, rank, mult) {
    const pl = p(), map = G.zone.map, face = aim.dir, back = face + Math.PI;
    let tx = pl.x + Math.sin(back) * sk.dist, tz = pl.z + Math.cos(back) * sk.dist;
    const k = map.castT(pl.x, pl.z, tx, tz, 0.35); tx = pl.x + (tx - pl.x) * k; tz = pl.z + (tz - pl.z) * k;
    const sx = pl.x, sz = pl.z, T = 0.42;
    Audio.sfx('roll');
    area('rain', sx, sz, 2.2, 3, { tick: 0.5, dmg: heroHit(mult * 0.15, { area: true }), opts: { slow: { k: 0.5, t: 0.6 }, quiet: true }, look: caltrops });
    act({
      name: 'vault', anim: 'KK_Dodge_Backward', speed: 0.95, face, dur: T + 0.15,
      update(dt, a) {
        const u = clamp(a.t / T, 0, 1), e = 1 - (1 - u) * (1 - u);
        pl.x = sx + (tx - sx) * e; pl.z = sz + (tz - sz) * e; pl.y = Math.sin(u * Math.PI) * 1.2; pl.rot = face;
        pl.iframes = Math.max(pl.iframes, u < 1 ? 0.12 : 0);
        if (u >= 1) pl.y = 0;
      },
      end() { pl.y = 0; },
      events: [[0.14, () => {
        const o = handPoint(V), n = sk.count + (rank >= 4 ? 2 : 0), spread = 0.9;
        for (let i = 0; i < n; i++) { const a = face - spread / 2 + (spread * i) / (n - 1); fire('bolt', pl, o.x, o.z, a, { y: 1.4, dmg: heroHit(mult, { area: true }), opts: { knock: 2.5, area: true }, look: goldBolt }); }
        Audio.sfx('arrowShoot'); flash(o.x, o.y, o.z, 0xfff0c0, 2, 0.1);
      }]], abs: true
    });
  },
  // Storm of Hawks: three spirit hawks wheel over her and stoop on what is near
  hawks(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'hawks', anim: 'summon', speed: 3.2, cut: 0.35,
      events: [[0.3, () => {
        Audio.sfx('summon'); Audio.sfx('ashwingScreech', { vol: 0.35, pitch: 1.6 });
        const n = sk.count + (rank >= 4 ? 1 : 0), birds = [];
        for (let i = 0; i < n; i++) { const m = hawkMesh(); birds.push({ m, a: (i / n) * 6.28, cd: 0.4 + i * 0.3, dive: null, x: pl.x, y: 3, z: pl.z }); }
        glowBurst(pl.x, 2.5, pl.z, 0x9ad8ff, 30, 4, 0.3, 0.6);
        effect(pl.x, pl.z, 11, sk.dur + rank * 0.6, {
          follow: true, vis: ['hawks', n],
          tick(a, dt) {
            a.x = pl.x; a.z = pl.z;
            for (const b of birds) {
              b.a += dt * 1.6; b.cd -= dt;
              if (b.dive) {
                const d = b.dive; d.t += dt; const u = Math.min(1, d.t / 0.32);
                b.x = d.sx + (d.f.x - d.sx) * u; b.z = d.sz + (d.f.z - d.sz) * u; b.y = d.sy + (1 - d.sy) * u;
                if (u >= 1) {
                  b.dive = null; b.cd = 0.9 - 0.05 * rank;
                  sparks(b.x, 1, b.z, 10, 0xc8f0ff, 5, { color1: 0x3080ff }); glowBurst(b.x, 1, b.z, 0x9ad8ff, 10, 3, 0.25, 0.4);
                  circleHit(b.x, b.z, 1.7, (f) => damage(pl, f, heroHit(mult, { area: true }), { knock: 2, kx: f.x - b.x, kz: f.z - b.z, area: true, quiet: true, burn: heroHit(mult * 0.15) }));
                  Audio.sfx('hitSpirit', { x: b.x, z: b.z, vol: 0.5 });
                }
              } else {
                const tx = pl.x + Math.sin(b.a) * 2.6, tz = pl.z + Math.cos(b.a) * 2.6, k = Math.min(1, dt * 6);
                b.x += (tx - b.x) * k; b.z += (tz - b.z) * k; b.y += (3.2 + Math.sin(b.a * 2) * 0.3 - b.y) * k;
                if (b.cd <= 0) { const f = nearestFoe(11, null, pl); if (f) b.dive = { f, t: 0, sx: b.x, sy: b.y, sz: b.z }; else b.cd = 0.3; }
              }
              const nx = b.dive ? b.dive.f.x - b.x : Math.cos(b.a), nz = b.dive ? b.dive.f.z - b.z : -Math.sin(b.a);
              b.m.position.set(b.x, b.y, b.z); b.m.rotation.y = Math.atan2(nx, nz);
              b.m.rotation.x = b.dive ? 0.6 : 0;
              const flap = Math.sin(a.t * (b.dive ? 30 : 14) + b.a * 3) * (b.dive ? 0.2 : 0.6);
              b.m.children[0].rotation.z = 0.25 + flap; b.m.children[1].rotation.z = -0.25 - flap;
              P({ x: b.x, y: b.y, z: b.z, life: 0.12, size: 0.9, size1: 0.4, color: 0x4a90d0, alpha: 0.35 }); if (Math.random() < 0.6) P({ x: b.x, y: b.y, z: b.z, life: 0.35, size: 0.2, size1: 0.02, color: 0xc8f0ff, color1: 0x3070ff });
            }
          },
          dispose() { for (const b of birds) { glowBurst(b.x, b.y, b.z, 0x9ad8ff, 10, 2, 0.25, 0.4); dropMesh(b.m); } }
        });
      }]]
    });
  },

  // ===== Mage =====
  // Frozen Orb: a slow orb of winter that throws shards of ice about it as it goes, and bursts at the end
  frostorb(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'frostorb', anim: 'cast', speed: 1.5, face: aim.dir, cut: 0.45,
      events: [[0.22, () => {
        const o = staffTip(V); Audio.sfx('frost', { vol: 0.6 });
        let t0 = 0, spin = Math.random() * 6.28;
        const shard = (x, z, a) => fire('shard', pl, x, z, a, { y: 1.1, dmg: heroHit(mult), opts: { chill: 1.5, quiet: true }, look: shardLook });
        fire('frostorb', pl, o.x, o.z, pl.rot, { y: 1.2, pierce: 999, onHit: (f) => damage(pl, f, heroHit(mult * 0.6), { chill: 2, quiet: true }), look: orbLook,
          onTick(pr, dt) { t0 -= dt; if (t0 > 0) return; t0 = 0.1; spin += 2.4; shard(pr.x, pr.z, spin); if (rank >= 4) shard(pr.x, pr.z, spin + 3.14); },
          onEnd: (x, z) => { for (let k = 0; k < 12; k++) shard(x, z, (k / 12) * 6.28); glowBurst(x, 1.2, z, 0xd8f4ff, 26, 5, 0.3, 0.5); Audio.sfx('frost', { x, z }); } });
      }]]
    });
  },
  // Void Rift: a tear in the dark that drags in all round it, then shuts on them
  rift(sk, aim, rank, mult) {
    const pl = p(), x = aim.x, z = aim.z, r = sk.radius;
    act({
      name: 'rift', anim: 'castUp', speed: 2.0, face: angleTo(pl.x, pl.z, x, z), cut: 0.42,
      events: [[0.2, () => {
        Audio.sfx('blink', { x, z, pitch: 0.6 }); Audio.sfx('wraithWail', { x, z, vol: 0.3, pitch: 0.6 });
        let tick = 0; const core = riftMesh(); core.position.set(x, 1.1, z);
        effect(x, z, r, sk.dur + 0.15 * rank, {
          light: { color: 0x8a50ff, intensity: 18, range: 10, y: 1.2 }, vis: ['rift'],
          tick(a, dt) {
            tick -= dt; core.rotation.y += dt * 3; core.rotation.z += dt * 1.3;
            core.scale.setScalar(Math.min(1, a.t * 4) * (1 + 0.08 * Math.sin(a.t * 12)));
            for (const f of foes(x, z, r + 1.5)) if (live(f)) pull(f, x, z, 30 * dt);
            for (let k = 0; k < 5; k++) { const an = Math.random() * 6.28, rr = rand.range(1.5, r); P({ x: x + Math.sin(an) * rr, y: rand.range(0.2, 2), z: z + Math.cos(an) * rr, vx: -Math.sin(an) * rr * 2 + Math.cos(an) * 4, vy: 0, vz: -Math.cos(an) * rr * 2 - Math.sin(an) * 4, life: 0.45, size: 0.3, size1: 0.02, color: 0xc0a0ff, color1: 0x3a10a0, drag: 0.5 }); }
            if (Math.random() < 0.4) P({ add: false, x: x + rand.range(-1, 1), y: 1.1, z: z + rand.range(-1, 1), life: 0.5, size: 1.4, size1: 0.2, color: 0x10081a, alpha: 0.6 });
            if (tick <= 0) { tick = 0.3; circleHit(x, z, r, (f) => damage(pl, f, heroHit(mult, { area: true }), { quiet: true, area: true, lohMul: 0.3 })); }
          },
          end() {
            explosion(x, z, r * 0.7, 0xa070ff, { smoke: 0x1a1028, shake: 0.5 });
            ring(x, z, r, 0xd0b0ff, 0.4); flash(x, 1.2, z, 0xe0d0ff, 5, 0.2);
            Audio.sfx('explosion', { x, z }); Audio.sfx('blink', { x, z, pitch: 1.4 });
            circleHit(x, z, r * 0.8, (f) => damage(pl, f, heroHit(mult * 6, { area: true }), { stun: 1, area: true, knock: 3, kx: f.x - x, kz: f.z - z }));
          },
          dispose() { dropMesh(core); }
        });
      }]]
    });
  },
  // Ray of Dawn: a held beam of white fire through everything in its line (press again to let it go)
  beam(sk, aim, rank, mult) {
    const pl = p(), map = G.zone.map, beam = beamMesh();
    let tick = 0, len = sk.range, snd = 0;
    const me = act({
      name: 'beam', anim: 'channel', dur: sk.dur + 0.2 * rank, face: aim.dir, move: 0,
      update(dt, a) {
        // she turns slowly toward where she is pushed, or to the nearest foe
        const mv = Math.hypot(G.input.mx, G.input.mz) > 0.3 ? Math.atan2(G.input.mx, G.input.mz) : null, tg = mv == null ? nearestFoe(sk.range, pl.rot) : null;
        const want = mv ?? (tg ? angleTo(pl.x, pl.z, tg.x, tg.z) : pl.rot);
        pl.rot += clamp(angleDiff(pl.rot, want), -2.4 * dt, 2.4 * dt);
        pl.res -= sk.drain * dt;
        if (pl.res <= 0) { pl.res = 0; a.dur = Math.min(a.dur, a.t + 0.05); }
        const o = staffTip(V), dx = Math.sin(pl.rot), dz = Math.cos(pl.rot);
        len = sk.range * map.castT(o.x, o.z, o.x + dx * sk.range, o.z + dz * sk.range, 0.2);
        beam.position.set(o.x, o.y, o.z); beam.rotation.y = pl.rot; beam.scale.set(1 + 0.15 * Math.sin(a.t * 40), 1, len);
        beam.children[0].material.opacity = 0.32 + 0.1 * Math.sin(a.t * 23);
        const ex = o.x + dx * len, ez = o.z + dz * len;
        for (let k = 0; k < 3; k++) { const u = Math.random(); P({ x: o.x + dx * len * u, y: o.y + rand.range(-0.15, 0.15), z: o.z + dz * len * u, vy: rand.range(0.2, 1), life: 0.25, size: 0.25, size1: 0.02, color: 0xfff4d0, color1: 0xffa040 }); }
        P({ x: ex, y: o.y, z: ez, life: 0.12, size: 1.5, size1: 0.6, color: 0xfff0c0, alpha: 0.8 });
        if (Math.random() < 0.5) sparks(ex, o.y, ez, 2, 0xffe0a0, 4);
        snd -= dt; if (snd <= 0) { snd = 0.35; Audio.sfx('fireCrackle', { vol: 0.5 }); }
        tick -= dt;
        if (tick <= 0) {
          tick = 0.15;
          for (const f of foes(o.x + dx * len / 2, o.z + dz * len / 2, len / 2 + 1)) {
            if (!live(f)) continue;
            const fx = f.x - o.x, fz = f.z - o.z, u = fx * dx + fz * dz, v = Math.abs(fx * dz - fz * dx);
            if (u > -0.3 && u < len + f.radius && v < 0.6 + f.radius) damage(pl, f, heroHit(mult), { quiet: true, lohMul: 0.4, burn: heroHit(mult * 0.08) });
          }
        }
      }
    });
    Audio.sfx('lampLight'); addLight({ x: pl.x, y: 2, z: pl.z, color: 0xffd070, intensity: 30, range: 10, life: 0.3, fade: 0.3 });
    const glow = addLight({ x: pl.x, y: 1.5, z: pl.z, color: 0xffe0a0, intensity: 22, range: 8 });
    effect(pl.x, pl.z, 1, sk.dur + 0.2 * rank + 0.3, {
      follow: true, vis: ['beam', sk.range],
      tick(a) { const o = staffTip(V); glow.x = o.x + Math.sin(pl.rot) * len * 0.6; glow.y = o.y; glow.z = o.z + Math.cos(pl.rot) * len * 0.6; if (pl.act !== me) a.done = true; },
      dispose() { dropMesh(beam); removeLight(glow); }
    });
  }
};

// ---------- co-op: what the other pages of a party draw (net/coop.js) ----------
// the looks a shot or an area is drawn with, by name: the mirror sends the name and the page that replays it the look
export const LOOKS = { goldBolt, fireBolt, siegeLook, cinderLook, sparkLook, fireRain, hailRain, paleFire, radiantLook, shardLook, orbLook, caltrops };
// an effect of another hero's, drawn here: its look only (particles and meshes; what it does to foes, its bursts and rings
// are the mirror's). VIS[name](a, args, who) for an area a (x, z, r, dur), who the hero it goes about with (an actor with
// x, z, rot, y), or null: { tick(a, dt), dispose(a), light }
export const VIS = {
  rally: (a, args, who) => ({ light: { color: 0xffd070, intensity: 14, range: 8, y: 1.5 }, tick(a) {
    a.x = who.x; a.z = who.z;
    if (Math.random() < 0.6) { const an = Math.random() * 6.28, r = rand.range(0.3, 1.1); P({ x: who.x + Math.sin(an) * r, y: rand.range(0, 0.6), z: who.z + Math.cos(an) * r, vy: rand.range(1.5, 3), life: 0.8, size: 0.2, size1: 0.02, color: 0xfff0b0, color1: 0xffa040 }); }
  } }),
  blizzard: (a, args, who) => ({ light: { color: 0x9ac8ff, intensity: 10, range: 10, y: 2 }, tick(a) {
    a.x = who.x; a.z = who.z;
    for (let k = 0; k < 3; k++) { const an = Math.random() * 6.28, r = Math.sqrt(Math.random()) * a.r; P({ x: who.x + Math.sin(an) * r, y: rand.range(1.5, 3.5), z: who.z + Math.cos(an) * r, vx: Math.cos(an) * 3, vy: -3, vz: -Math.sin(an) * 3, life: 0.7, size: 0.16, size1: 0.08, color: 0xffffff, color1: 0xa0d0ff }); }
    if (Math.random() < 0.3) P({ add: false, x: who.x + rand.range(-4, 4), y: 0.3, z: who.z + rand.range(-4, 4), vy: 0.2, life: 1.2, size: 1.4, size1: 2.6, color: 0xd8e8f8, alpha: 0.12, alpha1: 0 });
  } }),
  comet: () => ({ light: { color: 0x9ac8ff, intensity: 10 }, tick(a) { if (Math.random() < 0.6) P({ x: a.x + rand.range(-a.r, a.r) * 0.8, y: 0.1, z: a.z + rand.range(-a.r, a.r) * 0.8, vy: rand.range(0.4, 1.2), life: 0.6, size: 0.3, size1: 0.05, color: 0xe0f4ff, color1: 0x4a8aff }); } }),
  bulwark: (a, args, who) => {
    const dome = domeMesh(); let spin = 0;
    return { light: { color: 0xffd070, intensity: 10, range: 6, y: 1.2 }, tick(a, dt) {
      a.x = who.x; a.z = who.z; spin += dt;
      dome.position.set(who.x, who.y || 0, who.z); dome.rotation.y = spin * 0.8; dome.material.opacity = 0.18 + 0.04 * Math.sin(spin * 6);
      for (let k = 0; k < 2; k++) { const an = spin * 3 + k * 3.14; P({ x: who.x + Math.sin(an) * 1.2, y: 0.3 + (spin * 1.3 + k) % 1.8, z: who.z + Math.cos(an) * 1.2, life: 0.4, size: 0.25, size1: 0.04, color: 0xfff0c0, color1: 0xffa040 }); }
    }, dispose() { dropMesh(dome); } };
  },
  trap: (a) => {
    const jaw = trapMesh(); jaw.position.set(a.x, 0.05, a.z); jaw.rotation.y = Math.random() * 6.28;
    return { tick(a) { if (Math.random() < 0.15) P({ x: a.x + rand.range(-0.4, 0.4), y: 0.15, z: a.z + rand.range(-0.4, 0.4), life: 0.3, size: 0.1, size1: 0.02, color: 0xfff0d0 }); }, dispose() { dropMesh(jaw); } };
  },
  // (the hawks wheel over the hero and stoop on what is near as hers do; where they strike is the mirror's sparks)
  hawks: (a, args, who) => {
    const n = clamp(args[0] | 0, 1, 6), birds = [];
    for (let i = 0; i < n; i++) birds.push({ m: hawkMesh(), a: (i / n) * 6.28, cd: 0.4 + i * 0.3, dive: null, x: who.x, y: 3, z: who.z });
    return { tick(a, dt) {
      a.x = who.x; a.z = who.z;
      for (const b of birds) {
        b.a += dt * 1.6; b.cd -= dt;
        if (b.dive) { const d = b.dive; d.t += dt; const u = Math.min(1, d.t / 0.32); b.x = d.sx + (d.f.x - d.sx) * u; b.z = d.sz + (d.f.z - d.sz) * u; b.y = d.sy + (1 - d.sy) * u; if (u >= 1) { b.dive = null; b.cd = 0.7; } }
        else {
          const tx = who.x + Math.sin(b.a) * 2.6, tz = who.z + Math.cos(b.a) * 2.6, k = Math.min(1, dt * 6);
          b.x += (tx - b.x) * k; b.z += (tz - b.z) * k; b.y += (3.2 + Math.sin(b.a * 2) * 0.3 - b.y) * k;
          if (b.cd <= 0) { const f = foes(who.x, who.z, 11).find(live); if (f) b.dive = { f, t: 0, sx: b.x, sy: b.y, sz: b.z }; else b.cd = 0.3; }
        }
        const nx = b.dive ? b.dive.f.x - b.x : Math.cos(b.a), nz = b.dive ? b.dive.f.z - b.z : -Math.sin(b.a);
        b.m.position.set(b.x, b.y, b.z); b.m.rotation.y = Math.atan2(nx, nz); b.m.rotation.x = b.dive ? 0.6 : 0;
        const flap = Math.sin(a.t * (b.dive ? 30 : 14) + b.a * 3) * (b.dive ? 0.2 : 0.6);
        b.m.children[0].rotation.z = 0.25 + flap; b.m.children[1].rotation.z = -0.25 - flap;
        P({ x: b.x, y: b.y, z: b.z, life: 0.12, size: 0.9, size1: 0.4, color: 0x4a90d0, alpha: 0.35 });
      }
    }, dispose() { for (const b of birds) dropMesh(b.m); } };
  },
  rift: (a) => {
    const core = riftMesh(); core.position.set(a.x, 1.1, a.z);
    return { light: { color: 0x8a50ff, intensity: 18, range: 10, y: 1.2 }, tick(a, dt) {
      core.rotation.y += dt * 3; core.rotation.z += dt * 1.3; core.scale.setScalar(Math.min(1, a.t * 4) * (1 + 0.08 * Math.sin(a.t * 12)));
      for (let k = 0; k < 4; k++) { const an = Math.random() * 6.28, rr = rand.range(1.5, a.r); P({ x: a.x + Math.sin(an) * rr, y: rand.range(0.2, 2), z: a.z + Math.cos(an) * rr, vx: -Math.sin(an) * rr * 2 + Math.cos(an) * 4, vy: 0, vz: -Math.cos(an) * rr * 2 - Math.sin(an) * 4, life: 0.45, size: 0.3, size1: 0.02, color: 0xc0a0ff, color1: 0x3a10a0, drag: 0.5 }); }
    }, dispose() { dropMesh(core); } };
  },
  // (the beam from the hero's hands along where she faces, as far as the walls let it)
  beam: (a, args, who) => {
    const beam = beamMesh(), range = clamp(+args[0] || 16, 2, 20);
    return { light: { color: 0xffe0a0, intensity: 22, range: 8, y: 1.5 }, tick(a, dt) {
      const dx = Math.sin(who.rot), dz = Math.cos(who.rot), ox = who.x + dx * 0.5, oz = who.z + dz * 0.5, oy = (who.y || 0) + 1.4;
      const len = range * (G.zone?.map ? G.zone.map.castT(ox, oz, ox + dx * range, oz + dz * range, 0.2) : 1);
      a.x = ox + dx * len * 0.6; a.z = oz + dz * len * 0.6;
      beam.position.set(ox, oy, oz); beam.rotation.y = who.rot; beam.scale.set(1 + 0.15 * Math.sin(a.t * 40), 1, len);
      beam.children[0].material.opacity = 0.32 + 0.1 * Math.sin(a.t * 23);
      for (let k = 0; k < 2; k++) { const u = Math.random(); P({ x: ox + dx * len * u, y: oy + rand.range(-0.15, 0.15), z: oz + dz * len * u, vy: rand.range(0.2, 1), life: 0.25, size: 0.25, size1: 0.02, color: 0xfff4d0, color1: 0xffa040 }); }
      P({ x: ox + dx * len, y: oy, z: oz + dz * len, life: 0.12, size: 1.5, size1: 0.6, color: 0xfff0c0, alpha: 0.8 });
    }, dispose() { dropMesh(beam); } };
  }
};
// which of them go about with their hero (a page that has no actor for that hero draws them not at all)
export const VIS_FOLLOW = new Set(['rally', 'blizzard', 'bulwark', 'hawks', 'beam']);

// ---------- the later skills' meshes and looks (code-built) ----------
// (a mesh of these taken out: its materials freed, and its geometry unless it is one of the shared ones below, built once)
function dropMesh(o) { R.scene.remove(o); o.traverse((m) => { m.material?.dispose(); if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); }); }
const shared = (g) => { g.userData.shared = true; return g; };
const ADD = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
let domeGeo = null;
function domeMesh() {
  domeGeo ||= shared(new THREE.SphereGeometry(1.35, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55));
  const m = new THREE.Mesh(domeGeo, ADD(0xc88a30, 0.2));
  m.material.wireframe = true; R.scene.add(m); return m;
}
let jawGeo = null;
function trapMesh() {
  if (!jawGeo) {
    const g = [], ring0 = new THREE.TorusGeometry(0.45, 0.04, 4, 16); ring0.rotateX(Math.PI / 2); g.push(ring0);
    for (let i = 0; i < 10; i++) { const c = new THREE.ConeGeometry(0.05, 0.22, 4); const a = (i / 10) * Math.PI * 2; c.translate(Math.sin(a) * 0.42, 0.1, Math.cos(a) * 0.42); g.push(c); }
    jawGeo = shared(mergeGeo(g));
  }
  const m = new THREE.Mesh(jawGeo, new THREE.MeshLambertMaterial({ color: 0x8a9098, emissive: 0x222018 }));
  R.scene.add(m); return m;
}
let hawkGeo = null;
function hawkMesh() {
  const wing = (k) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, k * 0.75, 0.05, -0.1, 0, 0, -0.22], 3)); return shared(geo); };
  hawkGeo ||= { l: wing(1), r: wing(-1), body: shared(new THREE.ConeGeometry(0.08, 0.5, 5)) };
  const mat = ADD(0x3a86c8, 0.55), g = new THREE.Group();
  g.add(new THREE.Mesh(hawkGeo.l, mat), new THREE.Mesh(hawkGeo.r, mat));
  const body = new THREE.Mesh(hawkGeo.body, ADD(0x9ad0ff, 0.7)); body.rotation.x = Math.PI / 2; g.add(body);
  g.scale.setScalar(1.05); R.scene.add(g); return g;
}
let riftGeo = null;
function riftMesh() {
  riftGeo ||= { core: shared(new THREE.IcosahedronGeometry(0.75, 1)), h1: shared(new THREE.TorusGeometry(1.0, 0.07, 6, 28)), h2: shared(new THREE.TorusGeometry(1.25, 0.04, 6, 28)) };
  const m = new THREE.Mesh(riftGeo.core, new THREE.MeshBasicMaterial({ color: 0x0a0414 }));
  const halo = new THREE.Mesh(riftGeo.h1, ADD(0xb080ff, 0.8)); m.add(halo);
  const halo2 = new THREE.Mesh(riftGeo.h2, ADD(0x7040ff, 0.6)); halo2.rotation.x = Math.PI / 2; m.add(halo2);
  R.scene.add(m); return m;
}
let beamGeo = null;
function beamMesh() {
  if (!beamGeo) {
    const core = new THREE.CylinderGeometry(0.09, 0.09, 1, 8, 1, true); core.rotateX(Math.PI / 2); core.translate(0, 0, 0.5);
    const outer = new THREE.CylinderGeometry(0.32, 0.32, 1, 10, 1, true); outer.rotateX(Math.PI / 2); outer.translate(0, 0, 0.5);
    beamGeo = { core: shared(core), outer: shared(outer) };
  }
  const m = new THREE.Mesh(beamGeo.core, ADD(0xfff8e0, 1)); m.add(new THREE.Mesh(beamGeo.outer, ADD(0xffb040, 0.35)));
  R.scene.add(m); return m;
}
function mergeGeo(list) {
  const pos = [], nor = [];
  for (const g of list) { const n = g.index ? g.toNonIndexed() : g; pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
function radiantLook(pr) {
  const a = Math.atan2(pr.vx, pr.vz), px = Math.cos(a), pz = -Math.sin(a), w = pr.r;
  for (let k = -3; k <= 3; k++) { const s = k / 3, bend = (1 - s * s) * 0.5; P({ x: pr.x + px * s * w + Math.sin(a) * bend, y: 0.4 + Math.random() * 1.2, z: pr.z + pz * s * w + Math.cos(a) * bend, vy: 0.6, life: 0.3, size: 0.55, size1: 0.05, color: 0xfff4d0, color1: 0xffa030 }); }
}
function shardLook(pr) { P({ x: pr.x, y: pr.y, z: pr.z, life: 0.12, size: 0.3, size1: 0.05, color: 0xffffff, color1: 0x80c8ff }); }
function orbLook(pr) {
  P({ x: pr.x, y: pr.y, z: pr.z, life: 0.15, size: 1.6, size1: 0.8, color: 0xd8f4ff, color1: 0x4a90ff, alpha: 0.8 });
  if (Math.random() < 0.5) P({ x: pr.x + rand.range(-0.5, 0.5), y: pr.y + rand.range(-0.5, 0.5), z: pr.z + rand.range(-0.5, 0.5), life: 0.4, size: 0.14, size1: 0.02, color: 0xffffff });
}
function caltrops(a) { if (a.t < 0.1) for (let i = 0; i < 14; i++) sparks(a.x + rand.range(-a.r, a.r) * 0.7, 0.1, a.z + rand.range(-a.r, a.r) * 0.7, 1, 0xb0b8c0, 1.5, { color1: 0x6a7078 }); if (Math.random() < 0.15) P({ x: a.x + rand.range(-a.r, a.r) * 0.7, y: 0.08, z: a.z + rand.range(-a.r, a.r) * 0.7, life: 0.25, size: 0.1, size1: 0.02, color: 0xe0e8f0 }); }
