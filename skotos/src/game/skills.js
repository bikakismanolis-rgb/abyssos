// The heroes' skills. Each starts an action: an animation with timed events.
import * as THREE from 'three';
import { G, later } from './state.js';
import { SKILLS, DODGE, POTION, CLASSES } from './data.js';
import { skillMult, skillRank, skillUnlocked } from './stats.js';
import { damage, heroHit, healHero, freeHero, shakeOff } from './combat.js';
import { foes, spawnMonster, Actor } from './actors.js';
import { fire, area } from './projectiles.js';
import { sparks, glowBurst, explosion, ring, bolt, puff, P, flash, decal, teleCircle } from '../gfx/fx.js';
import { shake, addLight, kick } from '../gfx/gfx.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { rand, angleTo, angleDiff, clamp } from '../core/util.js';
import { t } from '../i18n/i18n.js';

const V = new THREE.Vector3(), V2 = new THREE.Vector3();
const p = () => G.player;
const fx = (x, z) => ({ x, z });

// ---------- targeting ----------
export function nearestFoe(range, dir = null, from = p()) {
  let best = null, bs = 1e9;
  for (const f of foes(from.x, from.z, range)) {
    // a Hollowed passing for dead wood is no target until it shows itself (aim at it, or catch it in an area)
    if ((f.prop && !f.hp) || f.hidden || f.disguised) continue;
    const d = Math.hypot(f.x - from.x, f.z - from.z) - f.radius;
    let s = d + (f.prop ? 4 : 0);
    if (dir != null) s += Math.abs(angleDiff(dir, angleTo(from.x, from.z, f.x, f.z))) * 1.6;
    if (s < bs) { bs = s; best = f; }
  }
  return best;
}
// aim from an input event: {aim:{x,z}} (mouse) | {aim:{dir,far}} (drag) | null (auto)
function resolveAim(ev, range, ground) {
  const pl = p();
  if (ev?.aim?.dir) {
    const a = Math.atan2(ev.aim.dir.x, ev.aim.dir.z);
    const d = ground ? Math.max(2, ev.aim.far * range) : range;
    return { dir: a, x: pl.x + Math.sin(a) * d, z: pl.z + Math.cos(a) * d, target: ground ? null : nearestFoe(range, a) };
  }
  if (ev?.aim && ev.aim.x != null) {
    const a = angleTo(pl.x, pl.z, ev.aim.x, ev.aim.z), d = Math.min(range, Math.hypot(ev.aim.x - pl.x, ev.aim.z - pl.z));
    return { dir: a, x: pl.x + Math.sin(a) * d, z: pl.z + Math.cos(a) * d, target: ground ? null : nearestFoe(range, a) };
  }
  const moving = Math.hypot(G.input.mx, G.input.mz) > 0.3 ? Math.atan2(G.input.mx, G.input.mz) : null;
  const tg = nearestFoe(range, moving);
  if (tg) return { dir: angleTo(pl.x, pl.z, tg.x, tg.z), x: tg.x, z: tg.z, target: tg };
  const a = moving ?? pl.rot;
  return { dir: a, x: pl.x + Math.sin(a) * Math.min(range, 6), z: pl.z + Math.cos(a) * Math.min(range, 6), target: null };
}

// ---------- actions ----------
function act(o) {
  const pl = p();
  const clipDur = o.anim ? pl.avatar.play(o.anim, o.speed ?? 1, o.animOpts) || 0.8 : 0.5;
  const a = Object.assign({ t: 0, move: 0, clip: clipDur }, o);
  a.dur = o.dur ?? clipDur * (o.cut ?? 0.72);
  a.ev = (o.events || []).map(([at, fn]) => ({ at: o.abs ? at : at * clipDur, fn, done: false }));
  if (o.face != null) pl.rot = o.face;
  pl.act = a;
  return a;
}
export function updateAction(dt) {
  const pl = p(), a = pl.act; if (!a) return;
  a.t += dt;
  for (const e of a.ev) if (!e.done && a.t >= e.at) { e.done = true; e.fn(a); }
  a.update?.(dt, a);
  if (a.t >= a.dur) {
    a.end?.(a);
    if (pl.act === a) { pl.act = null; if (!a.keepAnim) pl.avatar.anim.stop?.(0.18); }
  }
}
export function trailOn(a) { return a && a.trail && a.t >= a.trail[0] * a.clip && a.t <= a.trail[1] * a.clip; }
const attackSpeed = (base = 1) => clamp(G.stats.aps / 1.15, 0.6, 2.6) * base;

// hit everything in an arc in front of the hero
function arcHit(range, arc, fn) {
  const pl = p(); let n = 0;
  for (const f of foes(pl.x, pl.z, range)) {
    const ang = Math.abs(angleDiff(pl.rot, angleTo(pl.x, pl.z, f.x, f.z)));
    if (arc >= Math.PI || ang <= arc / 2 || Math.hypot(f.x - pl.x, f.z - pl.z) < f.radius + 0.6) { fn(f); n++; }
  }
  return n;
}
function circleHit(x, z, r, fn) { let n = 0; for (const f of foes(x, z, r)) { fn(f); n++; } return n; }
function swingFx(n, heavy) {
  Audio.sfx(heavy ? 'swingHeavy' : 'swing', { vol: 0.8 });
  if (n > 0) { G.hitstop = Math.max(G.hitstop, heavy ? 0.07 : 0.045); shake(heavy ? 0.22 : 0.1); }
}
function staffTip(out) { const pl = p(); const h = pl.avatar.held.R; if (h?.gem) return pl.avatar.weaponPoint('R', h.gem, out); return out.set(pl.x + Math.sin(pl.rot) * 0.5, 1.6, pl.z + Math.cos(pl.rot) * 0.5); }
function handPoint(out) { const pl = p(); return pl.avatar.bonePoint('handR', out) || out.set(pl.x, 1.3, pl.z); }

// ---------- basic attacks ----------
function basicWarden(aim) {
  const pl = p(), sk = SKILLS.warden[0];
  const step = pl.comboT > 0 ? (pl.comboStep + 1) % 3 : 0;
  pl.comboStep = step;
  const anim = ['slash1', 'slash2', 'slash3'][step];
  const third = step === 2;
  // realistic characters report where their swing lands; the action ends shortly after it
  const hit = pl.avatar.anim.hitAt?.(anim), impact = hit ?? [0.38, 0.25, 0.55][step];
  const cut = hit != null ? Math.min(1, hit + (third ? 0.3 : 0.26)) : third ? 0.78 : 0.62;
  act({
    name: 'basic', anim, speed: attackSpeed(third ? 1.25 : 1.15), face: aim.dir, cut, trail: [impact - 0.15, impact + 0.12],
    events: [[impact, () => {
      const mult = skillMult(sk) * (third ? 1.5 : 1);
      const n = arcHit(third ? 3.0 : 2.6, third ? Math.PI * 2 : Math.PI * 0.8, (f) => damage(pl, f, heroHit(mult, { area: third }), { knock: third ? 7 : 2.5, kx: f.x - pl.x, kz: f.z - pl.z }));
      swingFx(n, third);
      if (third) {
        ring(pl.x, pl.z, 3, 0xffe0b0, 0.3);
        if (G.stats.legs.has('cleaverOfAsh')) for (let i = 1; i <= 5; i++) later(i * 0.06, () => { const x = pl.x + Math.sin(pl.rot) * i * 1.4, z = pl.z + Math.cos(pl.rot) * i * 1.4; explosion(x, z, 1.4, 0xff6a20, { shake: 0.05 }); circleHit(x, z, 1.6, (f) => damage(pl, f, heroHit(skillMult(sk) * 0.6, { area: true }), { burn: 4, quiet: true, area: true })); });
      }
    }]]
  });
  pl.comboT = 1.0;
}
function basicRanger(aim) {
  const pl = p(), sk = SKILLS.ranger[0];
  act({
    name: 'basic', anim: 'shoot', speed: attackSpeed(1.6), face: aim.dir, cut: 0.42,
    events: [[pl.avatar.anim.hitAt ? 0.05 : 0.14, () => {
      const o = handPoint(V);
      fire('bolt', pl, o.x, o.z, pl.rot, { y: 1.25, dmg: heroHit(skillMult(sk)), opts: { knock: 1.2 } });
      pl.res = Math.min(G.stats.resMax, pl.res + sk.gain);
      Audio.sfx('arrowShoot', { vol: 0.7 });
    }]]
  });
}
function basicMage(aim) {
  const pl = p(), sk = SKILLS.mage[0];
  act({
    name: 'basic', anim: 'cast', speed: attackSpeed(1.5), face: aim.dir, cut: 0.45,
    events: [[0.22, () => {
      const o = staffTip(V);
      fire('arcane', pl, o.x, o.z, pl.rot, { y: Math.max(1, o.y), dmg: heroHit(skillMult(sk)), homing: 4 });
      pl.res = Math.min(G.stats.resMax, pl.res + sk.gain);
      Audio.sfx('arcaneBolt', { vol: 0.7 });
    }]]
  });
}
export function basicAttack(ev) {
  const pl = p(), C = CLASSES[G.hero.cls];
  const aim = resolveAim(ev, C.range + 0.5, false);
  if (G.hero.cls === 'warden') basicWarden(aim); else if (G.hero.cls === 'ranger') basicRanger(aim); else basicMage(aim);
}

// ---------- skills ----------
export function canUse(i) {
  const sk = SKILLS[G.hero.cls][i];
  if (!sk || !skillUnlocked(sk)) return 'locked';
  const pl = p();
  if (pl.cds[i] > 0) return 'cd';
  if ((sk.cost || 0) > pl.res) return 'res';
  return null;
}
export function useSkill(i, ev) {
  const pl = p(), sk = SKILLS[G.hero.cls][i];
  const why = canUse(i);
  if (why) {
    if (why === 'res') { emit('toast', t('hud.noRes', t('res.' + CLASSES[G.hero.cls].res))); Audio.sfx('denied'); }
    else if (why === 'cd') Audio.sfx('denied', { vol: 0.4 });
    return false;
  }
  if (pl.act && pl.act.name === 'whirl' && sk.id !== 'whirl') pl.act = null;
  pl.res -= sk.cost || 0;
  if (sk.cd) pl.cds[i] = sk.cd * (1 - G.stats.cdr / 100);
  const rank = Math.max(1, skillRank(sk.id)), mult = skillMult(sk);
  const aim = resolveAim(ev, sk.range || CLASSES[G.hero.cls].range, !!sk.ground);
  SKILL_FN[sk.id](sk, aim, rank, mult);
  emit('skillUsed', i);
  return true;
}

const SKILL_FN = {
  // ===== Warden =====
  whirl(sk, aim, rank, mult) {
    const pl = p(); let tick = 0, snd = 0, tor = 0;
    act({
      name: 'whirl', anim: 'spin', dur: sk.dur + 0.15 * (rank - 1), move: 0.8, trail: [0, 99], keepAnim: false,
      update(dt) {
        tick -= dt; snd -= dt; tor -= dt;
        if (snd <= 0) { snd = 0.55; Audio.sfx('whirlwind', { vol: 0.7 }); }
        if (tick <= 0) {
          tick = sk.tick;
          const n = circleHit(pl.x, pl.z, sk.radius, (f) => damage(pl, f, heroHit(mult, { area: true }), { knock: 1.6, kx: f.x - pl.x, kz: f.z - pl.z, quiet: true, resMul: 0.3, area: true }));
          if (n) { Audio.sfx('hitFlesh', { vol: 0.5 }); G.hitstop = Math.max(G.hitstop, 0.02); }
          for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28; P({ x: pl.x + Math.sin(a) * sk.radius * 0.9, y: 0.8, z: pl.z + Math.cos(a) * sk.radius * 0.9, vx: Math.cos(a) * 3, vy: 0.3, vz: -Math.sin(a) * 3, life: 0.25, size: 0.35, size1: 0.05, color: 0xfff0d0, color1: 0x8090c0 }); }
        }
        if (G.stats.legs.has('dawnblade') && tor <= 0) {
          tor = 0.5;
          const a = Math.random() * 6.28;
          area('tornado', pl.x, pl.z, 1.3, 3, { tick: 0.4, dmg: heroHit(0.25, { area: true }), vx: Math.sin(a) * 2.5, vz: Math.cos(a) * 2.5, opts: { burn: 3 } });
        }
        pl.res -= dt * 4;
        if (pl.res < 0) { pl.res = 0; pl.act.dur = Math.min(pl.act.dur, pl.act.t + 0.05); }
      }
    });
  },
  leap(sk, aim, rank, mult) {
    const pl = p(), map = G.zone.map;
    let tx = aim.x, tz = aim.z;
    const d = Math.hypot(tx - pl.x, tz - pl.z);
    if (d > sk.range) { tx = pl.x + (tx - pl.x) * sk.range / d; tz = pl.z + (tz - pl.z) * sk.range / d; }
    const k = map.castT(pl.x, pl.z, tx, tz, 0.3); tx = pl.x + (tx - pl.x) * k; tz = pl.z + (tz - pl.z) * k;
    const sx = pl.x, sz = pl.z;
    const tele = teleCircle(tx, tz, sk.radius, 0.5, 0xffb040);
    Audio.sfx('leap');
    act({
      name: 'leap', anim: 'leap', speed: 1.35, face: angleTo(pl.x, pl.z, tx, tz), cut: 0.8, trail: [0.4, 0.62],
      update(dt, a) {
        const u = clamp((a.t - 0.08 * a.clip) / (0.47 * a.clip), 0, 1);
        pl.x = sx + (tx - sx) * u; pl.z = sz + (tz - sz) * u; pl.y = Math.sin(u * Math.PI) * 2.4;
        pl.iframes = Math.max(pl.iframes, u < 1 ? 0.1 : 0);
      },
      events: [[0.56, () => {
        pl.y = 0;
        const n = circleHit(tx, tz, sk.radius, (f) => damage(pl, f, heroHit(mult, { area: true }), { knock: 5, kx: f.x - tx, kz: f.z - tz, stun: 1.2, area: true, breakGuard: true }));
        explosion(tx, tz, sk.radius * 0.8, 0xffc080, { smoke: 0x5a4a3a, shake: 0.55 });
        for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28; P({ add: false, x: tx, y: 0.2, z: tz, vx: Math.cos(a) * 6, vy: rand.range(2, 5), vz: Math.sin(a) * 6, life: 0.8, size: 0.18, size1: 0.12, color: 0x5a4a3a, alpha: 1, grav: 14 }); }
        Audio.sfx('slam'); kick(0, 0.4, 1);
        G.hitstop = n ? 0.09 : 0.03;
      }]]
    });
    void tele;
  },
  cry(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'cry', anim: 'warcry', speed: 1.4, cut: 0.6,
      events: [[0.3, () => {
        pl.buffs.cry = sk.buff + rank;
        pl.res = Math.min(G.stats.resMax, pl.res + sk.gain);
        circleHit(pl.x, pl.z, 7, (f) => { f.status.fear = Math.max(f.status.fear, 2 + rank * 0.3); });
        ring(pl.x, pl.z, 7, 0xff5030, 0.6); ring(pl.x, pl.z, 4, 0xffb060, 0.4);
        glowBurst(pl.x, 1.4, pl.z, 0xff6030, 30, 6, 0.4, 0.6);
        addLight({ x: pl.x, y: 2, z: pl.z, color: 0xff5020, intensity: 40, range: 12, life: 0.6, fade: 0.6 });
        shake(0.3); Audio.sfx('warcry');
        if (G.stats.legs.has('lastBastion')) pl.shield = pl.hpMax * 0.25;
      }]]
    });
  },
  quake(sk, aim, rank, mult) {
    const pl = p(), dir = aim.dir, hit = new Set();
    act({
      name: 'quake', anim: 'slam', speed: 1.45, face: dir, cut: 0.7, trail: [0.3, 0.5],
      events: [[0.45, () => {
        Audio.sfx('slam'); shake(0.5); G.hitstop = 0.06;
        for (let i = 0; i < 11; i++) later(i * 0.035, () => {
          const x = pl.x + Math.sin(dir) * (1.2 + i), z = pl.z + Math.cos(dir) * (1.2 + i);
          if (!G.zone.map.walkable(x, z)) return;
          for (let k = 0; k < 4; k++) P({ add: false, x: x + rand.range(-0.4, 0.4), y: 0.1, z: z + rand.range(-0.4, 0.4), vx: rand.range(-1, 1), vy: rand.range(4, 8), vz: rand.range(-1, 1), life: 0.9, size: rand.range(0.2, 0.35), size1: 0.2, color: 0x4a4038, alpha: 1, grav: 18 });
          P({ x, y: 0.2, z, vy: 2, life: 0.4, size: 1.4, size1: 0.2, color: 0xffa040, color1: 0xff3000 });
          puff(x, 0.3, z, 2, 0x4a4038, 0.8, 0.6, 0.7);
          decal(x, z, 'scorch', 1.4);
          if (i % 3 === 0) Audio.sfx('hitBone', { x, z, vol: 0.5 });
          circleHit(x, z, 1.7, (f) => { if (hit.has(f)) return; hit.add(f); damage(pl, f, heroHit(mult, { area: true }), { knock: 3, kx: Math.sin(dir), kz: Math.cos(dir), stun: 0.6, area: true, breakGuard: true }); });
        });
      }]]
    });
  },
  // ===== Ranger =====
  multi(sk, aim, rank, mult) {
    const pl = p();
    const volley = () => {
      const o = handPoint(V), n = sk.count + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0), spread = 1.1;
      for (let i = 0; i < n; i++) { const a = pl.rot - spread / 2 + (spread * i) / (n - 1); fire('bolt', pl, o.x, o.z, a, { y: 1.25, dmg: heroHit(mult, { area: true }), opts: { knock: 1.5 } }); }
      Audio.sfx('arrowShoot');
    };
    act({ name: 'multi', anim: 'volley', speed: 1.7, face: aim.dir, cut: 0.42, events: [[0.15, () => { volley(); if (G.stats.legs.has('windQuiver')) later(0.22, volley); }]] });
  },
  rain(sk, aim, rank, mult) {
    const pl = p(), x = aim.x, z = aim.z;
    act({
      name: 'rain', anim: 'volley', speed: 1.6, face: angleTo(pl.x, pl.z, x, z), cut: 0.45,
      events: [[0.15, () => {
        Audio.sfx('arrowShoot'); for (let i = 0; i < 8; i++) P({ x: pl.x, y: 1.6, z: pl.z, vx: rand.range(-1, 1), vy: 14, vz: rand.range(-1, 1), life: 0.4, size: 0.15, size1: 0.05, color: 0xfff0d0 });
        teleCircle(x, z, sk.radius, 0.35, 0xffe0a0);
        area('rain', x, z, sk.radius, sk.dur + 0.2 * (rank - 1), { tick: 0.25, delay: 0.35, dmg: heroHit(mult * 0.42, { area: true }), opts: { slow: { k: 0.45, t: 0.6 }, quiet: true } });
      }]]
    });
  },
  wolf(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'wolf', anim: 'summon', speed: 3.2, cut: 0.35,
      events: [[0.3, () => {
        const count = G.stats.legs.has('wolfmother') ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const a = pl.rot + (i ? 1.2 : -1.2), x = pl.x + Math.sin(a) * 1.6, z = pl.z + Math.cos(a) * 1.6;
          const w = spawnMonster('spiritWolf', x, z, { level: G.hero.level });
          w.team = 'hero'; w.pet = true; w.life = sk.dur + rank * 2; w.dmgMult = mult; w.hp = w.hpMax = G.stats.lifeMax * 0.6;
          G.actors.push(w);
          glowBurst(x, 0.8, z, 0x80d0ff, 30, 4, 0.3, 0.8); ring(x, z, 2, 0x80d0ff, 0.5);
        }
        Audio.sfx('summon'); Audio.sfx('wolfHowl', { vol: 0.6 });
      }]]
    });
  },
  pierce(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'pierce', anim: 'shoot', speed: 0.9, face: aim.dir, cut: 0.5,
      update(dt, a) { if (a.t < 0.3 * a.clip) { const o = handPoint(V); P({ x: o.x + rand.range(-0.3, 0.3), y: o.y + rand.range(-0.3, 0.3), z: o.z + rand.range(-0.3, 0.3), vx: 0, vy: 0, vz: 0, life: 0.2, size: 0.15, size1: 0.3, color: 0xffe0a0 }); } },
      events: [[0.3, () => {
        const o = handPoint(V);
        fire('pierce', pl, o.x, o.z, pl.rot, { y: 1.25, dmg: heroHit(mult), pierce: 99, life: 0.75, opts: { knock: 4, breakGuard: true } });
        flash(o.x, o.y, o.z, 0xfff0c0, 2.5, 0.12); shake(0.2); kick(-Math.sin(pl.rot), -Math.cos(pl.rot), 0.4);
        Audio.sfx('arrowShoot'); Audio.sfx('crit', { vol: 0.5 });
      }]]
    });
  },
  // ===== Mage =====
  fireball(sk, aim, rank, mult) {
    const pl = p();
    const boom = (x, z, r, m, small) => {
      explosion(x, z, r, 0xff7a20, { shake: small ? 0.12 : 0.3 });
      Audio.sfx('explosion', { x, z, vol: small ? 0.6 : 1 });
      circleHit(x, z, r, (f) => damage(pl, f, heroHit(m, { area: true }), { knock: small ? 2 : 4, kx: f.x - x, kz: f.z - z, burn: heroHit(m * 0.3), area: true }));
    };
    act({
      name: 'fireball', anim: 'cast', speed: 1.6, face: aim.dir, cut: 0.45,
      events: [[0.22, () => {
        const o = staffTip(V);
        Audio.sfx('fireball');
        fire('fireball', pl, o.x, o.z, pl.rot, {
          y: Math.max(1, o.y),
          onHit: (f, pr) => { pr.life = 0; },
          onEnd: (x, z) => {
            boom(x, z, sk.radius + 0.15 * rank, mult, false);
            if (G.stats.legs.has('wayfarerStaff')) for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28; fire('mini', pl, x, z, a, { y: 1, onHit: (f, pr) => { pr.life = 0; }, onEnd: (mx, mz) => boom(mx, mz, 1.8, mult * 0.4, true) }); }
          }
        });
      }]]
    });
  },
  nova(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'nova', anim: 'castUp', speed: 2.4, cut: 0.42,
      events: [[0.2, () => {
        const r = sk.radius;
        for (let i = 0; i < 70; i++) { const a = (i / 70) * 6.283; P({ x: pl.x, y: 0.5, z: pl.z, vx: Math.sin(a) * r * 2.4, vy: rand.range(0, 1.5), vz: Math.cos(a) * r * 2.4, life: 0.45, size: 0.5, size1: 0.15, color: 0xe0f8ff, color1: 0x4a9aff, drag: 3 }); }
        ring(pl.x, pl.z, r, 0xa0e0ff, 0.5); ring(pl.x, pl.z, r * 0.6, 0xffffff, 0.35);
        addLight({ x: pl.x, y: 1.5, z: pl.z, color: 0x80c8ff, intensity: 45, range: r * 2.5, life: 0.5, fade: 0.5 });
        Audio.sfx('frost'); shake(0.2);
        circleHit(pl.x, pl.z, r, (f) => { damage(pl, f, heroHit(mult, { area: true }), { freeze: sk.freeze + 0.2 * rank, area: true }); glowBurst(f.x, 1, f.z, 0xb0e8ff, 6, 2, 0.25, 0.5); });
      }]]
    });
  },
  chain(sk, aim, rank, mult) {
    const pl = p();
    act({
      name: 'chain', anim: 'cast', speed: 1.8, face: aim.dir, cut: 0.42,
      events: [[0.2, () => {
        const o = staffTip(V).clone();
        let cur = aim.target || nearestFoe(sk.range, aim.dir);
        const jumps = sk.jumps + Math.floor(rank / 2) + (G.stats.legs.has('stormRing') ? 3 : 0);
        Audio.sfx('lightning');
        if (!cur) { bolt(o.x, o.y, o.z, pl.x + Math.sin(pl.rot) * 6, 0.3, pl.z + Math.cos(pl.rot) * 6, 0x9ad8ff); return; }
        const hit = new Set();
        let fx0 = o.x, fy0 = o.y, fz0 = o.z;
        for (let j = 0; j <= jumps && cur; j++) {
          const target = cur, sx = fx0, sy = fy0, sz = fz0;
          later(j * 0.07, () => { bolt(sx, sy, sz, target.x, 1.1, target.z, 0x9ad8ff, 1.1); damage(pl, target, heroHit(mult * (1 - j * 0.06)), { stun: 0.25, quiet: j > 0 }); if (j) Audio.sfx('lightning', { x: target.x, z: target.z, vol: 0.5 }); });
          hit.add(target); fx0 = target.x; fy0 = 1.1; fz0 = target.z;
          let nb = null, nd = 64;
          for (const f of foes(target.x, target.z, 7)) { if (hit.has(f) || f.prop || f.disguised) continue; const d = (f.x - target.x) ** 2 + (f.z - target.z) ** 2; if (d < nd) { nd = d; nb = f; } }
          cur = nb;
        }
      }]]
    });
  },
  meteor(sk, aim, rank, mult) {
    const pl = p(), x = aim.x, z = aim.z, r = sk.radius;
    act({
      name: 'meteor', anim: 'castUp', speed: 2.0, face: angleTo(pl.x, pl.z, x, z), cut: 0.42,
      events: [[0.2, () => {
        teleCircle(x, z, r, 0.95, 0xff6a20);
        Audio.sfx('meteorFall', { x, z });
        for (let k = 0; k < 16; k++) later(k * 0.05, () => { const u = k / 16; P({ x: x - 6 + u * 6, y: 14 - u * 14, z: z - 3 + u * 3, life: 0.35, size: 2.2, size1: 0.4, color: 0xffd080, color1: 0xff3000 }); P({ add: false, x: x - 6 + u * 6, y: 14 - u * 14, z: z - 3 + u * 3, vy: 0.5, life: 1.0, size: 1.2, size1: 2.5, color: 0x2a2420, alpha: 0.5 }); });
        later(0.95, () => {
          explosion(x, z, r, 0xff5a10, { shake: 0.7 });
          Audio.sfx('explosion', { x, z });
          G.hitstop = 0.08;
          circleHit(x, z, r, (f) => damage(pl, f, heroHit(mult, { area: true }), { knock: 6, kx: f.x - x, kz: f.z - z, burn: heroHit(mult * 0.2), area: true }));
          area('fire', x, z, r * 0.8, 3 + rank * 0.3, { tick: 0.5, dmg: heroHit(mult * 0.12, { area: true }) });
        });
      }]]
    });
  }
};

// ---------- dodge and potion ----------
export function dodge(ev) {
  const pl = p(), D = DODGE[G.hero.cls];
  if (pl.dodgeCd > 0) { Audio.sfx('denied', { vol: 0.4 }); return; }
  if (pl.act && pl.act.name === 'leap') return;
  // dragged by the tongs, there is no rolling free
  if (pl.pull) return;
  pl.act = null;
  // a dodge always breaks free of amber, and clears the build-up; it throws off any Ember Ticks (Act IV)
  freeHero();
  shakeOff();
  pl.dodgeStamp = (pl.dodgeStamp || 0) + 1;
  pl.dodgeCd = D.cd * (G.stats.legs.has('swiftboots') ? 0.5 : 1);
  const mv = Math.hypot(G.input.mx, G.input.mz) > 0.2 ? Math.atan2(G.input.mx, G.input.mz) : (ev?.aim?.dir ? Math.atan2(ev.aim.dir.x, ev.aim.dir.z) : pl.rot);
  const map = G.zone.map;
  if (D.kind === 'blink') {
    let tx = pl.x + Math.sin(mv) * D.dist, tz = pl.z + Math.cos(mv) * D.dist;
    const k = map.castT(pl.x, pl.z, tx, tz, 0.4); tx = pl.x + (tx - pl.x) * k; tz = pl.z + (tz - pl.z) * k;
    glowBurst(pl.x, 1, pl.z, 0xa070ff, 30, 4, 0.3, 0.5); flash(pl.x, 1, pl.z, 0xc0a0ff, 3, 0.15);
    pl.x = tx; pl.z = tz; pl.rot = mv; pl.iframes = 0.35;
    glowBurst(tx, 1, tz, 0xa070ff, 30, 4, 0.3, 0.5); ring(tx, tz, 2, 0xa070ff, 0.3);
    Audio.sfx('blink');
    act({ name: 'blink', anim: 'blink', speed: 2.5, cut: 0.3 });
    return;
  }
  const sp = D.dist / 0.42;
  pl.rot = mv;
  Audio.sfx('roll');
  act({
    name: 'roll', anim: 'roll', speed: (pl.avatar.anim.duration?.('roll') || 0.42) / 0.5, dur: 0.42,
    update(dt) {
      const nx = pl.x + Math.sin(mv) * sp * dt, nz = pl.z + Math.cos(mv) * sp * dt;
      pl.x = nx; pl.z = nz; pl.iframes = 0.08;
      if (Math.random() < 0.5) P({ add: false, x: pl.x, y: 0.15, z: pl.z, vx: rand.range(-0.5, 0.5), vy: 0.4, vz: rand.range(-0.5, 0.5), life: 0.6, size: 0.4, size1: 1, color: 0x6a5a48, alpha: 0.4 });
    }
  });
  if (G.stats.legs.has('evergreenBoots')) { pl.res = Math.min(G.stats.resMax, pl.res + 20); pl.buffs.evergreen = 2; }
}
export function drinkPotion() {
  const pl = p();
  if (pl.potionCd > 0 || pl.dead) { Audio.sfx('denied', { vol: 0.4 }); return; }
  pl.potionCd = POTION.cd;
  healHero(pl.hpMax * POTION.heal);
  glowBurst(pl.x, 1.2, pl.z, 0xff4040, 24, 2.5, 0.3, 0.7);
  for (let i = 0; i < 20; i++) P({ x: pl.x + rand.range(-0.5, 0.5), y: rand.range(0, 0.5), z: pl.z + rand.range(-0.5, 0.5), vy: rand.range(1, 3), life: 0.8, size: 0.15, size1: 0.02, color: 0xff6050, color1: 0xff2010 });
  Audio.sfx('potion');
}
export { fx };
