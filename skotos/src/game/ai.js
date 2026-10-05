// Monster, pet and boss behaviour.
import { G, later } from './state.js';
import { MONSTERS } from './data.js';
import { rebuildHash, foes, near, spawnMonster, restoreRim } from './actors.js';
import { damage, tickStatus, moveMul, heroHit } from './combat.js';
import { fire, area } from './projectiles.js';
import { teleCircle, teleCone, teleLine, killTele, sparks, glowBurst, explosion, ring, bolt, P, puff, decal, flash } from '../gfx/fx.js';
import { shake, addLight } from '../gfx/gfx.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { rand, angleTo, angleDiff, dampAngle, clamp } from '../core/util.js';

const ATK_SFX = { goblin: 'goblinAttack', wolf: 'wolfAttack', spider: 'spiderHiss', orc: 'orcAttack', troll: 'trollRoar', skeleton: 'skeletonRattle', wraith: 'wraithWail', hound: 'houndGrowl', bat: 'batScreech', worm: 'wormRumble', dwarf: 'dwarfAttack', golem: 'golemStep' };
// attack timing per animation: speed, hit time (s), total (s)
const ATK = {
  stab: { speed: 1.25, hit: 0.34, dur: 0.85 }, slash1: { speed: 1.05, hit: 0.38, dur: 0.85 }, chop: { speed: 1.05, hit: 0.7, dur: 1.25 },
  smash: { speed: 0.75, hit: 0.5, dur: 1.3 }, claw: { speed: 1.1, hit: 0.52, dur: 1.0 }, bite: { speed: 1, hit: 0.22, dur: 0.6 }, cast: { speed: 0.9, hit: 0.35, dur: 1.0 }
};
const flow = { t: 0 };
const dirTmp = { x: 0, z: 0 };

export function updateActors(dt) {
  const pl = G.player, map = G.zone.map;
  rebuildHash();
  flow.t -= dt;
  if (flow.t <= 0 && pl) { map.updateFlow(pl.x, pl.z, 45); flow.t = 0.2; }
  for (let i = G.actors.length - 1; i >= 0; i--) {
    const a = G.actors[i];
    if (a.removed) { G.actors.splice(i, 1); continue; }
    if (a.team === 'npc') { npc(a, dt); continue; }
    if (a.prop) { if (a.dead) { a.deadT += dt; if (a.deadT > 0.05) { a.remove(); G.actors.splice(i, 1); } } continue; }
    if (a.dead) { dying(a, dt); if (a.removed) G.actors.splice(i, 1); continue; }
    // only think when near the hero
    const dx = pl.x - a.x, dz = pl.z - a.z, d = Math.hypot(dx, dz);
    if (d > 38 && !a.boss && !a.pet) { if (a.avatar) a.avatar.group.visible = false; continue; }
    if (a.avatar) a.avatar.group.visible = true;
    if (a.dormant) {
      if (d < 7 || a.aggro) { a.dormant = false; a.rising = 2.1; a.aggro = true; a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.avatar?.play('rise', 1.1); Audio.sfx('skeletonRattle', { x: a.x, z: a.z }); }
      else { const av = a.avatar; if (av) { av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot; av.update(dt, { speed: 0 }); } continue; }
    }
    tickStatus(a, dt);
    if (a.dead) continue;
    a.t += dt; a.cd -= dt;
    a.px = a.x; a.pz = a.z;
    if (a.ward > 0) { a.ward -= dt; if (a.ward <= 0) restoreRim(a); else if (Math.random() < 0.3) P({ x: a.x + rand.range(-0.5, 0.5), y: rand.range(0.4, 1.8), z: a.z + rand.range(-0.5, 0.5), vy: 0.6, life: 0.5, size: 0.12, size1: 0.02, color: 0xffb050 }); }
    a.flash = Math.max(0, a.flash - dt * 6);
    let speed = 0;
    if (a.rising > 0) a.rising -= dt;
    else if (a.status.freeze > 0 || a.status.stun > 0) { a.state = a.state === 'attack' ? 'chase' : a.state; if (a.tele) { killTele(a.tele); a.tele = null; } }
    else if (a.pet) speed = petAI(a, dt);
    else if (a.status.fear > 0) speed = flee(a, dt, pl);
    else {
      speed = (AI[a.def.ai] || AI.melee)(a, dt, pl, d);
      if (a.affixes.length) elite(a, dt, pl, d);
    }
    // knockback, separation, walls
    if (a.kx || a.kz) { a.x += a.kx * dt; a.z += a.kz * dt; const k = Math.exp(-dt * 7); a.kx *= k; a.kz *= k; if (Math.abs(a.kx) + Math.abs(a.kz) < 0.05) a.kx = a.kz = 0; }
    for (const b of near(a.x, a.z, a.radius + 1)) {
      if (b === a || b.dead || b.prop) continue;
      const ex = a.x - b.x, ez = a.z - b.z, l = Math.hypot(ex, ez), min = (a.radius + b.radius) * 0.9;
      if (l < min && l > 0.001) { const push = (min - l) * 0.5 * (b.boss ? 2 : 1) * (a.boss ? 0 : 1); a.x += (ex / l) * push; a.z += (ez / l) * push; }
    }
    if (a.def.ai === 'bat') { if (map.blocks(Math.floor(a.x), Math.floor(a.z))) { a.x = a.px; a.z = a.pz; } }
    else if (!a.under && (!a.def.float || !a.boss)) map.collide(a, Math.min(a.radius, 0.9));
    // visuals
    const av = a.avatar;
    if (av) {
      av.group.position.set(a.x, a.y || 0, a.z);
      av.group.rotation.y = a.rot;
      const frozen = a.status.freeze > 0 || (a.statue && !a.awake);
      av.update(frozen ? 0 : dt * (a.affixes.includes('fast') ? 1.25 : 1), { speed: speed * (frozen ? 0 : 1), runSpeed: a.speed, walkSpeed: Math.min(2.4, a.speed * 0.5), runNat: 5, float: a.def.float });
      av.setFlash(a.flash * 0.9);
      if (frozen) av.setTint(0x80c8ff, 0.8); else if (a.frozenTint) av.setTint(a.baseTint ?? 0xffffff, a.baseTintAmt ?? 0);
      a.frozenTint = frozen;
    }
  }
}

function npc(a, dt) {
  const pl = G.player, av = a.avatar;
  const d = Math.hypot(pl.x - a.x, pl.z - a.z);
  if (d < 6) a.rot = dampAngle(a.rot, angleTo(a.x, a.z, pl.x, pl.z), 3, dt);
  else if (a.home) a.rot = dampAngle(a.rot, a.home, 2, dt);
  av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot;
  av.update(dt, { speed: 0, lookAround: 1 });
}
function dying(a, dt) {
  a.deadT += dt;
  const av = a.avatar; if (!av) { a.remove(); return; }
  if (a.y > 0) a.y = Math.max(0, a.y - dt * 7);
  else if (a.y < 0) a.y = Math.min(0, a.y + dt * 3);
  av.group.position.set(a.x, a.y || 0, a.z);
  av.update(dt, { speed: 0, float: false });
  av.setFlash(0);
  const k = clamp((a.deadT - (a.boss ? 3 : 1.6)) / 1.2, 0, 1);
  if (k > 0) av.setDissolve(k);
  if (a.pet && a.deadT > 0.1) { glowBurst(a.x, 0.8, a.z, 0x80d0ff, 24, 3, 0.3, 0.6); a.remove(); return; }
  if (k >= 1) a.remove();
}

// ---------- movement helpers ----------
function seek(a, tx, tz, sp, dt, map = G.zone.map) {
  const d = Math.hypot(tx - a.x, tz - a.z);
  let dx, dz;
  if (d < 1.5 || (d < 22 && map.clear(a.x, a.z, tx, tz))) { dx = (tx - a.x) / (d || 1); dz = (tz - a.z) / (d || 1); }
  else { const f = map.flowDir(a.x, a.z, dirTmp); if (!f) return 0; dx = f.x; dz = f.z; }
  const v = sp * moveMul(a);
  a.x += dx * v * dt; a.z += dz * v * dt;
  a.rot = dampAngle(a.rot, Math.atan2(dx, dz), 10, dt);
  return v;
}
function flee(a, dt, pl) {
  const ang = angleTo(pl.x, pl.z, a.x, a.z), v = a.speed * 0.8 * moveMul(a);
  a.x += Math.sin(ang) * v * dt; a.z += Math.cos(ang) * v * dt; a.rot = dampAngle(a.rot, ang, 8, dt);
  return v;
}
function face(a, pl, dt, k = 12) { a.rot = dampAngle(a.rot, angleTo(a.x, a.z, pl.x, pl.z), k, dt); }
function aggroCheck(a, pl, d) {
  if (a.aggro) return true;
  if (d < 13 && G.zone.map.los(a.x, a.z, pl.x, pl.z)) {
    a.aggro = true;
    // the pack wakes together
    for (const b of G.actors) if (b.packId === a.packId && a.packId != null) b.aggro = true;
    if (a.def.sfx === 'wolf' && Math.random() < 0.4) Audio.sfx('wolfHowl', { x: a.x, z: a.z, vol: 0.6 });
    return true;
  }
  return false;
}
function idle(a, dt) {
  // wander a little around home
  if (!a.wander || a.t > a.wanderT) { a.wanderT = a.t + rand.range(2, 5); a.wander = Math.random() < 0.5 ? null : { x: a.home.x + rand.range(-3, 3), z: a.home.z + rand.range(-3, 3) }; }
  if (a.wander && Math.hypot(a.wander.x - a.x, a.wander.z - a.z) > 0.5 && G.zone.map.walkable(a.wander.x, a.wander.z)) return seek(a, a.wander.x, a.wander.z, a.speed * 0.3, dt);
  return 0;
}
function startAttack(a, name, o = {}) {
  const T = ATK[name] || ATK.slash1;
  a.state = 'attack'; a.atkT = 0; a.atkHit = false; a.atkName = name;
  a.atkHitT = (o.hit ?? T.hit) / (a.affixes.includes('fast') ? 1.25 : 1); a.atkDur = (o.dur ?? T.dur) / (a.affixes.includes('fast') ? 1.25 : 1);
  // realistic creatures time-scale their clip so the strike lands when the hit is applied
  a.avatar?.play(name, (o.speed ?? T.speed) * (a.affixes.includes('fast') ? 1.25 : 1), { hitIn: a.atkHitT });
  if (Math.random() < 0.35) Audio.sfx(ATK_SFX[a.def.sfx] || 'swing', { x: a.x, z: a.z, vol: 0.7 });
  a.cd = a.def.atkTime * rand.range(0.85, 1.15);
}
// returns true when the hit moment arrives
function attackTick(a, dt) {
  a.atkT += dt;
  if (!a.atkHit && a.atkT >= a.atkHitT) { a.atkHit = true; return true; }
  if (a.atkT >= a.atkDur) a.state = 'chase';
  return false;
}
function meleeLands(a, pl, reach, arc = 1.8) {
  const d = Math.hypot(pl.x - a.x, pl.z - a.z);
  return d < reach + pl.radius + 0.3 && Math.abs(angleDiff(a.rot, angleTo(a.x, a.z, pl.x, pl.z))) < arc;
}
function hitHero(a, pl, mult = 1, o = {}) {
  const tg = o.target || pl;
  damage(a, tg, a.dmg * mult, Object.assign({ kx: tg.x - a.x, kz: tg.z - a.z }, o));
  if (a.def.drain) { a.hp = Math.min(a.hpMax, a.hp + a.dmg * mult * 0.5); glowBurst(a.x, 1.2, a.z, 0x60d0ff, 6, 1.5, 0.2, 0.4); }
}
// pets draw aggro too: pick the nearest of hero and pets
function victim(a, pl) {
  let best = pl, bd = Math.hypot(pl.x - a.x, pl.z - a.z);
  for (const b of G.actors) if (b.pet && !b.dead) { const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < bd - 1.5) { bd = d; best = b; } }
  return best;
}

// ---------- behaviours ----------
const AI = {
  melee(a, dt, pl, d) {
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    const tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (a.state === 'attack') {
      face(a, tg, dt, 6);
      if (attackTick(a, dt) && meleeLands(a, tg, a.def.reach)) hitHero(a, pl, 1, { poison: a.def.poison ? a.dmg * 0.6 : 0, burn: a.def.burns ? a.dmg * 0.5 : 0, target: tg });
      return 0;
    }
    if (td < a.def.reach + tg.radius + 0.1) {
      face(a, tg, dt);
      if (a.cd <= 0) startAttack(a, a.def.atk);
      return 0;
    }
    return seek(a, tg.x, tg.z, a.speed, dt);
  },
  ranged(a, dt, pl, d) {
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    const tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (a.state === 'aim') {
      face(a, tg, dt, 10); a.atkT += dt;
      if (a.atkT > 0.55) { a.state = 'attack'; a.atkT = 0; a.atkHit = false; a.atkHitT = 0.12; a.atkDur = 0.6; a.avatar?.play('shoot', 0.9); }
      return 0;
    }
    if (a.state === 'attack') {
      if (attackTick(a, dt)) { fire(a.def.proj || 'arrow', a, a.x + Math.sin(a.rot) * 0.5, a.z + Math.cos(a.rot) * 0.5, angleTo(a.x, a.z, tg.x, tg.z) + rand.range(-0.06, 0.06), { y: 1.2, dmg: a.dmg }); Audio.sfx('arrowShoot', { x: a.x, z: a.z, vol: 0.5 }); }
      return 0;
    }
    const los = G.zone.map.los(a.x, a.z, tg.x, tg.z);
    if (td < 4.5 && los) { const ang = angleTo(tg.x, tg.z, a.x, a.z); const nx = a.x + Math.sin(ang) * 3, nz = a.z + Math.cos(ang) * 3; if (G.zone.map.walkable(nx, nz)) return seek(a, nx, nz, a.speed * 0.85, dt); }
    if (td < a.def.reach && los) {
      face(a, tg, dt);
      if (a.cd <= 0) { a.state = 'aim'; a.atkT = 0; a.avatar?.play('aim', 1); a.cd = a.def.atkTime * rand.range(0.9, 1.3); }
      return 0;
    }
    return seek(a, tg.x, tg.z, a.speed, dt);
  },
  caster(a, dt, pl, d) {
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    a.healT = (a.healT ?? 3) - dt;
    if (a.state === 'attack') {
      face(a, pl, dt, 8);
      if (attackTick(a, dt)) {
        if (a.healing) {
          for (const b of near(a.x, a.z, 9)) if (b.team === 'foe' && !b.dead && b !== a && !b.prop) { b.hp = Math.min(b.hpMax, b.hp + b.hpMax * 0.3); glowBurst(b.x, 1, b.z, 0x70ff60, 12, 2, 0.3, 0.6); }
          ring(a.x, a.z, 9, 0x70ff60, 0.6); Audio.sfx('heal', { x: a.x, z: a.z });
        } else { fire('hex', a, a.x, a.z, angleTo(a.x, a.z, pl.x, pl.z), { y: 1.4, dmg: a.dmg * 1.2, opts: { slow: { k: 0.3, t: 1.5 } } }); Audio.sfx('arcaneBolt', { x: a.x, z: a.z, vol: 0.5 }); }
      }
      return 0;
    }
    const hurt = near(a.x, a.z, 9).some((b) => b.team === 'foe' && !b.dead && !b.prop && b !== a && b.hp < b.hpMax * 0.6);
    if (a.healT <= 0 && hurt) { a.healT = 7; a.healing = true; startAttack(a, 'cast', { hit: 0.5, dur: 1.1 }); return 0; }
    const los = G.zone.map.los(a.x, a.z, pl.x, pl.z);
    if (d < 5 && los) { const ang = angleTo(pl.x, pl.z, a.x, a.z); return seek(a, a.x + Math.sin(ang) * 3, a.z + Math.cos(ang) * 3, a.speed, dt); }
    if (d < a.def.reach && los) { face(a, pl, dt); if (a.cd <= 0) { a.healing = false; startAttack(a, 'cast'); } return 0; }
    return seek(a, pl.x, pl.z, a.speed, dt);
  },
  pounce(a, dt, pl, d) {
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    const tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (a.state === 'leap') {
      a.atkT += dt; const u = Math.min(1, a.atkT / 0.45);
      a.x = a.lx + (a.tx - a.lx) * u; a.z = a.lz + (a.tz - a.lz) * u; a.y = Math.sin(u * Math.PI) * 1.2;
      if (u >= 1) { a.y = 0; a.state = 'chase'; if (meleeLands(a, tg, 1.8, 3)) hitHero(a, pl, 1.3, { target: tg, burn: a.def.burns ? a.dmg * 0.6 : 0 }); puff(a.x, 0.2, a.z, 3, 0x4a4038, 0.6); if (a.def.burns) sparks(a.x, 0.3, a.z, 10, 0xffa040, 4); }
      return a.speed;
    }
    if (a.state === 'attack') { face(a, tg, dt, 8); if (attackTick(a, dt) && meleeLands(a, tg, a.def.reach)) hitHero(a, pl, 1, { target: tg, burn: a.def.burns ? a.dmg * 0.5 : 0 }); return 0; }
    if (td < a.def.reach + tg.radius) { face(a, tg, dt); if (a.cd <= 0) startAttack(a, 'bite'); return 0; }
    if (td > 3.5 && td < 7 && a.cd <= -1 && G.zone.map.clear(a.x, a.z, tg.x, tg.z)) {
      a.state = 'leap'; a.atkT = 0; a.lx = a.x; a.lz = a.z; a.tx = tg.x - Math.sin(angleTo(a.x, a.z, tg.x, tg.z)) * 1.2; a.tz = tg.z - Math.cos(angleTo(a.x, a.z, tg.x, tg.z)) * 1.2;
      a.rot = angleTo(a.x, a.z, tg.x, tg.z); a.avatar?.play('pounce'); a.cd = 2.5; Audio.sfx('wolfAttack', { x: a.x, z: a.z });
      return a.speed;
    }
    return seek(a, tg.x, tg.z, a.speed, dt);
  },
  brute(a, dt, pl, d) {
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    if (a.state === 'wind') {
      a.atkT += dt;
      if (a.atkT >= a.windT) {
        a.state = 'attack'; a.atkT = 0; a.atkHit = false; a.atkHitT = 0.32; a.atkDur = 0.9;
        a.avatar?.play(a.slam ? 'slam' : 'smash', 1.4);
      }
      return 0;
    }
    if (a.state === 'attack') {
      if (attackTick(a, dt)) {
        killTele(a.tele); a.tele = null;
        shake(0.35); Audio.sfx('slam', { x: a.x, z: a.z });
        if (a.slam) { explosion(a.x, a.z, 4, 0xb09070, { smoke: 0x4a4038, shake: 0.4 }); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 4.2) hitHero(a, pl, 1.6, { stun: 0.5 }); }
        else { const fx = a.x + Math.sin(a.rot) * 2, fz = a.z + Math.cos(a.rot) * 2; puff(fx, 0.3, fz, 6, 0x4a4038, 1, 1); if (meleeLands(a, pl, a.def.reach + 0.6, 0.95)) hitHero(a, pl, 1.3); }
      }
      return 0;
    }
    if (d < a.def.reach + pl.radius + 0.2) {
      face(a, pl, dt, 5);
      if (a.cd <= 0) {
        a.slams = (a.slams || 0) + 1; a.slam = a.slams % 3 === 0;
        a.state = 'wind'; a.atkT = 0; a.windT = a.slam ? 1.1 : 0.85;
        a.tele = a.slam ? teleCircle(a.x, a.z, 4, a.windT + 0.32) : teleCone(a.x, a.z, a.rot, a.def.reach + 0.8, 0.95, a.windT + 0.32);
        a.avatar?.play('taunt', 1.4); a.cd = a.def.atkTime;
        Audio.sfx('trollRoar', { x: a.x, z: a.z, vol: 0.6 });
      }
      return 0;
    }
    return seek(a, pl.x, pl.z, a.speed, dt);
  },
  wraith(a, dt, pl, d) {
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    a.blinkT = (a.blinkT ?? rand.range(3, 7)) - dt;
    if (a.blinkT <= 0 && d > 3 && d < 14) {
      a.blinkT = rand.range(5, 8);
      glowBurst(a.x, 1.2, a.z, 0x7ae0ff, 20, 3, 0.3, 0.5);
      const ang = Math.random() * 6.28, nx = pl.x + Math.sin(ang) * 2.2, nz = pl.z + Math.cos(ang) * 2.2;
      if (G.zone.map.walkable(nx, nz)) { a.x = nx; a.z = nz; glowBurst(a.x, 1.2, a.z, 0x7ae0ff, 20, 3, 0.3, 0.5); Audio.sfx('wraithWail', { x: a.x, z: a.z, vol: 0.5 }); }
    }
    if (Math.random() < 0.15) P({ add: false, x: a.x + rand.range(-0.3, 0.3), y: rand.range(0.2, 1.2), z: a.z + rand.range(-0.3, 0.3), vy: 0.3, life: 1, size: 0.6, size1: 1.2, color: 0x30485a, alpha: 0.4 });
    return AI.melee(a, dt, pl, d);
  },
  bat(a, dt, pl, d) {
    // flits at head height: circles its prey, swoops in to bite, wheels away
    const bob = Math.sin(a.t * 7 + a.id) * 0.2;
    if (!aggroCheck(a, pl, d)) {
      a.orb = (a.orb ?? Math.random() * 6.28) + dt * 1.4;
      a.y = 1.6 + bob;
      return fly(a, a.home.x + Math.sin(a.orb) * 2.5, a.home.z + Math.cos(a.orb) * 2.5, a.speed * 0.45, dt);
    }
    const tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (a.state === 'attack') {
      a.atkT += dt;
      const u = Math.min(1, a.atkT / 0.55);
      a.y = 1.6 - Math.sin(u * Math.PI) * 0.75 + bob;
      const v = u < 0.5 ? fly(a, tg.x, tg.z, a.speed * 1.5, dt) : fly(a, a.x + Math.sin(a.rot) * 3, a.z + Math.cos(a.rot) * 3, a.speed * 1.2, dt);
      if (!a.atkHit && u > 0.35 && td < a.def.reach + tg.radius) { a.atkHit = true; hitHero(a, pl, 1, { target: tg }); }
      if (u >= 1) { a.state = 'chase'; a.cd = rand.range(1.1, 2.0); a.orbDir = rand.sign(); }
      return v;
    }
    a.y = 1.6 + bob;
    a.orb = (a.orb ?? angleTo(tg.x, tg.z, a.x, a.z)) + dt * 1.9 * (a.orbDir || 1);
    if (a.cd <= 0 && td < 7) { a.state = 'attack'; a.atkT = 0; a.atkHit = false; a.avatar?.play('bite', 1.4); if (Math.random() < 0.5) Audio.sfx('batScreech', { x: a.x, z: a.z, vol: 0.5 }); return 0; }
    return fly(a, tg.x + Math.sin(a.orb) * 3.4, tg.z + Math.cos(a.orb) * 3.4, a.speed, dt);
  },
  burrow(a, dt, pl, d) {
    // below: a ridge of churned earth that hunts the hero; above: bites what is close, spits at what is not, then dives again
    if (a.under == null) { a.under = true; a.y = -3; }
    if (a.under) {
      if (a.avatar) a.avatar.group.visible = false;
      if (!aggroCheck(a, pl, d)) return 0;
      if (Math.random() < 0.5) puff(a.x + rand.range(-0.4, 0.4), 0.1, a.z + rand.range(-0.4, 0.4), 1, 0x6a5a48, 0.5, 0.3, 0.8);
      a.rumbleT = (a.rumbleT ?? 0) - dt;
      if (a.rumbleT <= 0) { a.rumbleT = 1.3; Audio.sfx('wormRumble', { x: a.x, z: a.z, vol: 0.45 }); }
      if (a.state === 'emerge') {
        a.atkT += dt;
        if (a.atkT >= 0.9) {
          a.under = false; a.state = 'up'; a.upT = rand.range(5, 8); a.y = -2.6; a.cd = 0.6;
          if (a.avatar) { a.avatar.group.visible = true; a.avatar.play('attack', 1.2); }
          killTele(a.tele); a.tele = null;
          explosion(a.x, a.z, 2.2, 0x8a7a60, { smoke: 0x5a4a38, shake: 0.25 });
          for (let i = 0; i < 16; i++) P({ add: false, x: a.x, y: 0.4, z: a.z, vx: rand.range(-4, 4), vy: rand.range(3, 7), vz: rand.range(-4, 4), life: 1, size: 0.18, size1: 0.12, color: 0x5a4a38, alpha: 1, grav: 16 });
          if (Math.hypot(pl.x - a.x, pl.z - a.z) < 2.4) hitHero(a, pl, 1.4, { stun: 0.4 });
          Audio.sfx('slam', { x: a.x, z: a.z });
        }
        return 0;
      }
      a.surfaceT = (a.surfaceT ?? rand.range(0.8, 2)) - dt;
      if (a.surfaceT <= 0 && d < 3.2) { a.state = 'emerge'; a.atkT = 0; a.surfaceT = null; a.tele = teleCircle(a.x, a.z, 2.2, 0.9, 0xc09050); return 0; }
      return seek(a, pl.x, pl.z, a.speed * 1.35, dt);
    }
    if (a.y < 0) a.y = Math.min(0, a.y + dt * 6);
    a.upT -= dt;
    if (a.state === 'dive') {
      a.atkT += dt; a.y = -a.atkT * 4;
      if (a.atkT > 0.7) { a.under = true; a.state = 'chase'; a.y = -3; a.surfaceT = rand.range(1.5, 3); }
      return 0;
    }
    if (a.state === 'attack') {
      face(a, pl, dt, 6);
      if (attackTick(a, dt)) {
        if (a.spit) { fire('acid', a, a.x, a.z, angleTo(a.x, a.z, pl.x, pl.z), { y: 1.6, dmg: a.dmg * 0.9, onEnd: (x, z) => area('poison', x, z, 1.6, 4, { team: 'foe', src: a, dmg: a.dmg * 0.25, tick: 0.5 }) }); Audio.sfx('spiderHiss', { x: a.x, z: a.z }); }
        else if (meleeLands(a, pl, a.def.reach, 1.2)) hitHero(a, pl, 1, { poison: a.dmg * 0.5 });
      }
      return 0;
    }
    if (a.upT <= 0 || d > 13) { a.state = 'dive'; a.atkT = 0; a.avatar?.play('die', 2.2); puff(a.x, 0.3, a.z, 8, 0x6a5a48, 1.2, 1.2, 1); Audio.sfx('wormRumble', { x: a.x, z: a.z }); return 0; }
    face(a, pl, dt, 4);
    if (a.cd <= 0) {
      if (d < a.def.reach + pl.radius + 0.3) { a.spit = false; startAttack(a, 'bite', { hit: 0.45, dur: 1.0 }); }
      else if (d < 10 && G.zone.map.los(a.x, a.z, pl.x, pl.z)) { a.spit = true; startAttack(a, 'bite', { hit: 0.5, dur: 1.1 }); a.cd = 2.2; }
    }
    return 0;
  },
  runepriest(a, dt, pl, d) {
    // the Ashbound priests sing rune-wards over their kin and hurl embers
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    a.wardT = (a.wardT ?? 2) - dt;
    if (a.state === 'attack') {
      face(a, pl, dt, 8);
      if (attackTick(a, dt)) {
        if (a.warding) {
          for (const b of near(a.x, a.z, 9)) if (b.team === 'foe' && !b.dead && !b.prop && !b.boss) { b.ward = 6; b.avatar?.setRim(0xffa040, 1.6); glowBurst(b.x, 1.2, b.z, 0xffb050, 10, 2, 0.25, 0.5); }
          ring(a.x, a.z, 9, 0xffa040, 0.6); Audio.sfx('shrine', { x: a.x, z: a.z, vol: 0.6 });
        } else { fire('ember', a, a.x, a.z, angleTo(a.x, a.z, pl.x, pl.z), { y: 1.4, dmg: a.dmg * 1.2, opts: { burn: a.dmg * 0.6 } }); Audio.sfx('fireball', { x: a.x, z: a.z, vol: 0.5 }); }
      }
      return 0;
    }
    if (a.wardT <= 0 && near(a.x, a.z, 9).some((b) => b.team === 'foe' && !b.dead && !b.prop && b !== a && !(b.ward > 0))) { a.wardT = 9; a.warding = true; startAttack(a, 'castUp', { hit: 0.6, dur: 1.2 }); return 0; }
    const los = G.zone.map.los(a.x, a.z, pl.x, pl.z);
    if (d < 5 && los) { const ang = angleTo(pl.x, pl.z, a.x, a.z); return seek(a, a.x + Math.sin(ang) * 3, a.z + Math.cos(ang) * 3, a.speed, dt); }
    if (d < a.def.reach && los) { face(a, pl, dt); if (a.cd <= 0) { a.warding = false; startAttack(a, 'cast'); } return 0; }
    return seek(a, pl.x, pl.z, a.speed, dt);
  },
  stonewarden: (a, dt, pl, d) => boss(a, dt, pl, d, STONEWARDEN),
  molten: (a, dt, pl, d) => boss(a, dt, pl, d, MOLTEN),
  weaver: (a, dt, pl, d) => boss(a, dt, pl, d, WEAVER),
  lord: (a, dt, pl, d) => boss(a, dt, pl, d, LORD),
  pet: null
};

// fliers go straight over anything that is not a wall
function fly(a, tx, tz, sp, dt) {
  const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
  if (d < 0.05) return 0;
  const v = Math.min(sp * moveMul(a), d / Math.max(dt, 1e-3));
  a.x += (dx / d) * v * dt; a.z += (dz / d) * v * dt;
  a.rot = dampAngle(a.rot, Math.atan2(dx, dz), 8, dt);
  return v;
}
// a thrown rock: a dark lump arcing through the air with dust streaming off it, landing on (x1, z1)
function lob(x0, z0, x1, z1, dur, h, color, onLand) {
  const n = Math.max(6, Math.round(dur / 0.03));
  let i = 0;
  const step = () => {
    i++;
    const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, y = 2.6 + Math.sin(u * Math.PI) * h - u * 2.4;
    P({ add: false, x, y, z, life: 0.07, size: 1.3, size1: 1.3, color, alpha: 1, alpha1: 1 });
    P({ add: false, x, y, z, vy: 0.2, life: 0.7, size: 0.4, size1: 1.1, color: 0x8a8070, alpha: 0.35 });
    if (i < n) later(dur / n, step); else onLand(x1, z1);
  };
  step();
}
// a rock or a meteor dropping out of the dark onto (x, z)
function fall(x, z, color, hot) {
  for (let k = 0; k < 8; k++) later(k * 0.04, () => P({ add: !!hot, x: x + rand.range(-0.2, 0.2), y: 11 - k * 1.3, z, vy: -24, life: 0.12, size: hot ? 0.9 : 1.1, size1: 0.5, color, color1: hot ? 0xff3000 : color, alpha: 1, alpha1: 0.6 }));
}

// ---------- pets ----------
function petAI(a, dt) {
  const pl = G.player;
  a.life -= dt;
  if (a.life <= 0 || pl.dead) { a.dead = true; a.deadT = 0; return 0; }
  if (Math.random() < 0.3) P({ x: a.x + rand.range(-0.3, 0.3), y: rand.range(0.3, 1), z: a.z + rand.range(-0.3, 0.3), vy: 0.6, life: 0.6, size: 0.15, size1: 0.02, color: 0x90e0ff });
  let tg = null, bd = 1e9;
  for (const f of foes(pl.x, pl.z, 10)) { if (f.prop) continue; const dd = (f.x - a.x) ** 2 + (f.z - a.z) ** 2; if (dd < bd) { bd = dd; tg = f; } }
  if (a.state === 'attack') {
    if (tg) face(a, tg, dt, 10);
    if (attackTick(a, dt) && tg && Math.hypot(tg.x - a.x, tg.z - a.z) < a.def.reach + tg.radius + 0.4) damage(pl, tg, heroHit((a.dmgMult || 1) * 0.55), { knock: 1, quiet: false, noLoh: true, noRes: true, crit: false });
    return 0;
  }
  if (tg) {
    const dd = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (dd < a.def.reach + tg.radius) { face(a, tg, dt); if (a.cd <= 0) { startAttack(a, a.kind === 'spiritWolf' ? 'bite' : 'slash1'); a.cd = 0.7; } return 0; }
    return seek(a, tg.x, tg.z, a.speed, dt);
  }
  const dd = Math.hypot(pl.x - a.x, pl.z - a.z);
  if (dd > 3) return seek(a, pl.x - Math.sin(pl.rot) * 1.5, pl.z - Math.cos(pl.rot) * 1.5, a.speed * (dd > 8 ? 1.4 : 1), dt);
  return 0;
}

// ---------- elite affixes ----------
function elite(a, dt, pl, d) {
  if (!a.aggro) return;
  a.affT = a.affT || {};
  const T = a.affT;
  for (const k of a.affixes) T[k] = (T[k] ?? rand.range(1, 4)) - dt;
  if (a.invuln > 0) { a.invuln -= dt; if (Math.random() < 0.6) P({ x: a.x + Math.sin(a.t * 8) * a.radius * 1.4, y: 0.4 + Math.random() * 1.6, z: a.z + Math.cos(a.t * 8) * a.radius * 1.4, life: 0.3, size: 0.3, size1: 0.05, color: 0x9ab8ff }); }
  if (a.affixes.includes('shielding') && T.shielding <= 0) { T.shielding = 9; a.invuln = 2.5; ring(a.x, a.z, 1.8, 0x9ab8ff, 0.4); }
  if (a.affixes.includes('teleporter') && T.teleporter <= 0 && d > 4) {
    T.teleporter = 5; const ang = Math.random() * 6.28, nx = pl.x + Math.sin(ang) * 2.5, nz = pl.z + Math.cos(ang) * 2.5;
    if (G.zone.map.walkable(nx, nz)) { glowBurst(a.x, 1, a.z, 0xc080ff, 18, 3, 0.3, 0.4); a.x = nx; a.z = nz; glowBurst(a.x, 1, a.z, 0xc080ff, 18, 3, 0.3, 0.4); Audio.sfx('blink', { x: a.x, z: a.z, vol: 0.6 }); }
  }
  if (a.affixes.includes('frozen') && T.frozen <= 0 && d < 14) {
    T.frozen = 4.5;
    const x = pl.x + rand.range(-1.5, 1.5), z = pl.z + rand.range(-1.5, 1.5);
    teleCircle(x, z, 2.2, 1.6, 0x80c8ff);
    area('frostOrb', x, z, 2.2, 1.6, { team: 'foe', src: a, dmg: a.dmg * 1.4 });
  }
  if (a.affixes.includes('thunder') && T.thunder <= 0 && d < 14) {
    T.thunder = 3.2;
    const x = pl.x, z = pl.z;
    teleCircle(x, z, 1.6, 1.0, 0xffe080);
    later(1.0, () => { bolt(x, 14, z, x, 0, z, 0xe0e8ff, 2); explosion(x, z, 1.4, 0xd0e0ff, { smoke: 0x6a6a7a, shake: 0.2 }); Audio.sfx('lightning', { x, z }); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 1.8) damage(a, p, a.dmg * 1.6, { stun: 0.3 }); });
  }
  if (a.affixes.includes('molten') && T.molten <= 0) { T.molten = 0.8; area('fire', a.x, a.z, 0.9, 3.5, { team: 'foe', src: a, dmg: a.dmg * 0.35, tick: 0.5 }); }
}

// ---------- bosses ----------
const WEAVER = {
  name: 'weaver',
  intro(a) { emit('bossIntro', a); Audio.sfx('spiderHiss', { vol: 1 }); Audio.sfx('bossRoar'); a.avatar?.play('rear'); },
  moves: [
    { id: 'bite', when: (a, d) => d < 4.2, cd: 1.4, run(a, pl) { a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.tele = teleCone(a.x, a.z, a.rot, 4.8, 0.8, 0.55); return { t: 0.55, fn() { a.avatar?.play('bite', 1.2); if (meleeLands(a, pl, 4.4, 0.85)) hitHero(a, pl, 1, { poison: a.dmg * 0.8 }); Audio.sfx('wolfAttack', { x: a.x, z: a.z }); }, after: 0.5 }; } },
    { id: 'web', when: (a, d) => d > 3, cd: 6, run(a, pl) { a.avatar?.play('spit'); Audio.sfx('spiderHiss', { x: a.x, z: a.z }); return { t: 0.45, fn() { const base = angleTo(a.x, a.z, pl.x, pl.z); for (let i = -1; i <= 1; i++) fire('web', a, a.x, a.z, base + i * 0.28, { y: 1.4, dmg: a.dmg * 0.6, opts: { slow: { k: 0.5, t: 2 } }, onEnd: (x, z) => area('web', x, z, 2, 6, { team: 'foe', src: a }) }); }, after: 0.6 }; } },
    { id: 'leap', when: (a, d) => d > 6, cd: 9, run(a, pl) { const tx = pl.x, tz = pl.z; a.tele = teleCircle(tx, tz, 3.5, 0.9); a.lx = a.x; a.lz = a.z; a.leapTo = { x: tx, z: tz }; a.avatar?.play('leap'); return { t: 0.9, leap: true, fn() { explosion(tx, tz, 3, 0x9a70c0, { smoke: 0x3a2a3a, shake: 0.6 }); if (Math.hypot(pl.x - tx, pl.z - tz) < 3.6) hitHero(a, pl, 1.5, { stun: 0.4 }); Audio.sfx('slam'); }, after: 0.6 }; } },
    { id: 'brood', when: () => true, cd: 15, phaseCd: [15, 10, 8], run(a) { a.avatar?.play('rear'); Audio.sfx('spiderHiss'); return { t: 0.6, fn() { const n = a.phase >= 1 ? 6 : 4; for (let i = 0; i < n; i++) { const ang = (i / n) * 6.28, x = a.x + Math.sin(ang) * 3, z = a.z + Math.cos(ang) * 3; if (!G.zone.map.walkable(x, z)) continue; const m = spawnMonster('spiderling', x, z, {}); m.aggro = true; G.actors.push(m); puff(x, 0.3, z, 3, 0x6a7a50, 0.6, 0.6); } }, after: 0.8 }; } },
    { id: 'spray', when: (a, d) => a.phase >= 1 && d < 8, cd: 7, run(a, pl) { a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.tele = teleCone(a.x, a.z, a.rot, 8, 0.6, 0.8, 0x90ff40); a.avatar?.play('spit'); return { t: 0.8, fn() { for (let i = 0; i < 40; i++) { const ang = a.rot + rand.range(-0.6, 0.6), s = rand.range(6, 14); P({ add: false, x: a.x, y: 1.2, z: a.z, vx: Math.sin(ang) * s, vy: rand.range(0, 2), vz: Math.cos(ang) * s, life: 0.6, size: 0.4, size1: 0.8, color: 0x8ad030, alpha: 0.8, drag: 2 }); } if (meleeLands(a, pl, 8, 0.6)) hitHero(a, pl, 0.8, { poison: a.dmg * 2 }); area('poison', a.x + Math.sin(a.rot) * 4, a.z + Math.cos(a.rot) * 4, 2.6, 5, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }, after: 0.5 }; } }
  ]
};
const LORD = {
  name: 'lord',
  intro(a) { emit('bossIntro', a); Audio.sfx('bossRoar'); a.avatar?.play('taunt'); emit('say', 'd.lord'); },
  moves: [
    { id: 'combo', when: (a, d) => d < 4, cd: 1.6, run(a, pl) { a.combo = 0; return comboStep(a, pl); } },
    { id: 'wave', when: (a, d) => d > 4.5 && d < 16, cd: 5.5, run(a, pl) { a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.tele = teleLine(a.x, a.z, a.rot, 16, 2.4, 0.75, 0x60b0ff); a.avatar?.play('chop', 1.2); return { t: 0.75, fn() { fire('spectral', a, a.x, a.z, a.rot, { y: 1, dmg: a.dmg * 1.3, life: 1.4, r: 1.2 }); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); Audio.sfx('wraithWail', { vol: 0.5 }); }, after: 0.5 }; } },
    { id: 'raise', when: () => true, cd: 16, phaseCd: [16, 13, 11], run(a) { a.avatar?.play('summon', 2); Audio.sfx('summon'); return { t: 1.2, fn() { const n = a.phase >= 1 ? 5 : 4; for (let i = 0; i < n; i++) { const ang = (i / n) * 6.28 + 0.4, x = a.x + Math.sin(ang) * 4.5, z = a.z + Math.cos(ang) * 4.5; if (!G.zone.map.walkable(x, z)) continue; const m = spawnMonster(i % 3 === 2 ? 'skeletonArcher' : 'skeleton', x, z, { rising: true }); m.aggro = true; G.actors.push(m); glowBurst(x, 0.3, z, 0x60b0ff, 14, 2, 0.3, 0.6); } }, after: 0.6 }; } },
    { id: 'blink', when: (a) => a.phase >= 1, cd: 10, run(a, pl) { glowBurst(a.x, 1.5, a.z, 0x60b0ff, 40, 4, 0.4, 0.6); a.hidden = true; if (a.avatar) a.avatar.group.visible = false; const tx = pl.x - Math.sin(pl.rot) * 2, tz = pl.z - Math.cos(pl.rot) * 2; const ok = G.zone.map.walkable(tx, tz); const X = ok ? tx : pl.x, Z = ok ? tz : pl.z; a.tele = teleCircle(X, Z, 3, 0.9, 0x60b0ff); Audio.sfx('blink'); return { t: 0.9, fn() { a.x = X; a.z = Z; a.hidden = false; if (a.avatar) a.avatar.group.visible = true; a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.avatar?.play('slam', 1.6); explosion(X, Z, 3, 0x60b0ff, { smoke: 0x203040, shake: 0.6 }); if (Math.hypot(pl.x - X, pl.z - Z) < 3.2) hitHero(a, pl, 1.6); Audio.sfx('slam'); }, after: 0.7 }; } },
    { id: 'wail', when: (a, d) => a.phase >= 1 && d < 9, cd: 12, run(a) { a.tele = teleCircle(a.x, a.z, 8, 1.3, 0x80c0ff); a.avatar?.play('taunt', 1); Audio.sfx('wraithWail', { vol: 1 }); return { t: 1.3, fn() { ring(a.x, a.z, 8, 0x80c0ff, 0.6); shake(0.4); const pl = G.player; if (Math.hypot(pl.x - a.x, pl.z - a.z) < 8) hitHero(a, pl, 1.2, { slow: { k: 0.6, t: 2.5 } }); }, after: 0.4 }; } },
    { id: 'pyres', when: (a) => a.phase >= 2, cd: 7, run(a, pl) { for (let i = 0; i < 5; i++) { const x = pl.x + rand.range(-5, 5), z = pl.z + rand.range(-5, 5); if (!G.zone.map.walkable(x, z)) continue; teleCircle(x, z, 1.8, 1.1, 0x4080ff); later(1.1, () => { explosion(x, z, 1.8, 0x4a90ff, { smoke: 0x102040, shake: 0.1 }); area('fire', x, z, 1.5, 4, { team: 'foe', src: a, dmg: a.dmg * 0.4, tick: 0.5 }); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 1.9) hitHero(a, p, 1.0); }); } return { t: 0.4, fn() {}, after: 0.3 }; } }
  ]
};
const STONEWARDEN = {
  name: 'stonewarden', phases: [0.6, 0.3], wake: 10,
  intro(a) {
    emit('bossIntro', a); emit('say', 'd.warden');
    Audio.sfx('stoneCrack'); Audio.sfx('bossRoar'); shake(0.6);
    a.avatar?.play('warcry');
    puff(a.x, 1.5, a.z, 20, 0x9a968e, 2, 2.5, 1.6);
    for (let i = 0; i < 30; i++) P({ add: false, x: a.x + rand.range(-1, 1), y: rand.range(1, 4), z: a.z + rand.range(-1, 1), vx: rand.range(-3, 3), vy: rand.range(1, 4), vz: rand.range(-3, 3), life: 1.2, size: 0.22, size1: 0.15, color: 0x7a766e, alpha: 1, grav: 14 });
  },
  moves: [
    { id: 'smash', basic: true, when: (a, d) => d < 4.6, cd: 1.7, run(a, pl) { a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.tele = teleCone(a.x, a.z, a.rot, 5, 0.85, 0.65, 0xffa040); a.avatar?.play(rand.next() < 0.5 ? 'slash1' : 'slash2', 1, { hitIn: 0.65 }); return { t: 0.65, fn() { shake(0.3); Audio.sfx('golemStep', { x: a.x, z: a.z }); puff(a.x + Math.sin(a.rot) * 3, 0.3, a.z + Math.cos(a.rot) * 3, 6, 0x8a8680, 1.2, 1.2); if (meleeLands(a, pl, 4.8, 0.85)) hitHero(a, pl, 1.1); }, after: 0.5 }; } },
    { id: 'stomp', when: (a, d) => d < 7, cd: 6, phaseCd: [6.5, 5.5, 4.5], run(a, pl) { a.tele = teleCircle(a.x, a.z, 5.5, 1.0, 0xffa040); a.avatar?.play('slam', 1, { hitIn: 1.0 }); return { t: 1.0, fn() { explosion(a.x, a.z, 5.5, 0xb0a080, { smoke: 0x6a6258, shake: 0.6 }); ring(a.x, a.z, 6, 0xffc080, 0.6); Audio.sfx('slam'); Audio.sfx('golemStep'); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 5.7) hitHero(a, pl, 1.35, { stun: 0.6 }); }, after: 0.7 }; } },
    { id: 'boulder', when: (a, d) => d > 6, cd: 5, phaseCd: [5.5, 4.5, 3.5], run(a, pl) {
      a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      const tx = pl.x, tz = pl.z;
      teleCircle(tx, tz, 2.6, 1.3, 0xffa040);
      a.avatar?.play('slash2', 1);
      return { t: 0.5, fn() { lob(a.x + Math.sin(a.rot), a.z + Math.cos(a.rot), tx, tz, 0.8, 5, 0x3a3836, (x, z) => { explosion(x, z, 2.6, 0x9a9080, { smoke: 0x6a6258, shake: 0.3 }); Audio.sfx('slam', { x, z }); for (let i = 0; i < 10; i++) P({ add: false, x, y: 0.5, z, vx: rand.range(-5, 5), vy: rand.range(2, 6), vz: rand.range(-5, 5), life: 1, size: 0.25, size1: 0.2, color: 0x4a4844, alpha: 1, grav: 16 }); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 2.8) hitHero(a, p, 1.4, { stun: 0.3 }); }); }, after: 0.6 };
    } },
    { id: 'charge', when: (a, d) => d > 5 && d < 18, cd: 9, phaseCd: [10, 8, 6.5], run(a, pl) {
      a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      const len = Math.min(18, Math.hypot(pl.x - a.x, pl.z - a.z) + 3);
      a.tele = teleLine(a.x, a.z, a.rot, len, 3.2, 0.9, 0xffa040);
      a.avatar?.play('warcry', 1.4); Audio.sfx('stoneCrack', { x: a.x, z: a.z });
      return { t: 0.9, fn() { a.dash = { vx: Math.sin(a.rot) * 20, vz: Math.cos(a.rot) * 20, t: len / 20, hit: false }; a.avatar?.play('slash1', 1.3); }, after: len / 20 + 0.4 };
    } },
    { id: 'rockfall', when: (a) => a.phase >= 1, cd: 9, phaseCd: [9, 9, 7], run(a, pl) {
      a.avatar?.play('slam', 1); shake(0.4); Audio.sfx('golemStep');
      for (let i = 0; i < 7; i++) {
        const x = pl.x + (i ? rand.range(-5.5, 5.5) : 0), z = pl.z + (i ? rand.range(-5.5, 5.5) : 0);
        if (!G.zone.map.walkable(x, z)) continue;
        const dl = 1.0 + i * 0.12;
        teleCircle(x, z, 1.9, dl, 0xffa040);
        later(dl - 0.32, () => fall(x, z, 0x4a4844));
        later(dl, () => { explosion(x, z, 1.9, 0x9a9080, { smoke: 0x6a6258, shake: 0.12 }); Audio.sfx('slam', { x, z, vol: 0.5 }); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 2.0) hitHero(a, p, 1.0, { stun: 0.25 }); });
      }
      return { t: 0.5, fn() {}, after: 0.4 };
    } },
    { id: 'pulse', when: (a, d) => a.phase >= 2 && d < 10, cd: 10, run(a, pl) {
      a.tele = teleCircle(a.x, a.z, 9, 1.5, 0xff6020);
      const safe = teleCircle(a.x, a.z, 3, 1.5, 0x60c0ff);
      a.avatar?.play('warcry', 1); Audio.sfx('stoneCrack');
      return { t: 1.5, fn() { killTele(safe); ring(a.x, a.z, 9, 0xffa040, 0.7); ring(a.x, a.z, 6, 0xffa040, 0.5); glowBurst(a.x, 1.5, a.z, 0xffa040, 40, 7, 0.4, 0.7); shake(0.5); const dd = Math.hypot(pl.x - a.x, pl.z - a.z); if (dd > 3.2 && dd < 9.3) hitHero(a, pl, 1.6, { burn: a.dmg * 0.5 }); }, after: 0.6 };
    } }
  ]
};
const MOLTEN = {
  name: 'molten', phases: [0.6, 0.3],
  intro(a) { emit('bossIntro', a); emit('say', 'd.king'); Audio.sfx('bossRoar'); Audio.sfx('lavaBurst'); a.avatar?.play('taunt'); explosion(a.x, a.z, 4, 0xff7a20, { smoke: 0x2a2220, shake: 0.6 }); },
  moves: [
    { id: 'combo', basic: true, when: (a, d) => d < 4.4, cd: 1.6, run(a, pl) { a.combo = 0; return fireCombo(a, pl); } },
    { id: 'slam', when: (a, d) => d < 7, cd: 6, phaseCd: [6.5, 5.5, 4.5], run(a, pl) { a.tele = teleCircle(a.x, a.z, 5, 1.0, 0xff5010); a.avatar?.play('slam', 1, { hitIn: 1.0 }); return { t: 1.0, fn() { explosion(a.x, a.z, 5, 0xff6a10, { smoke: 0x2a1a10, shake: 0.7 }); area('fire', a.x + Math.sin(a.rot) * 2, a.z + Math.cos(a.rot) * 2, 2.8, 5, { team: 'foe', src: a, dmg: a.dmg * 0.35, tick: 0.5 }); Audio.sfx('lavaBurst'); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 5.2) hitHero(a, pl, 1.5, { burn: a.dmg * 0.8, stun: 0.4 }); }, after: 0.6 }; } },
    { id: 'eruption', when: () => true, cd: 9, phaseCd: [9, 7.5, 6], run(a, pl) {
      a.avatar?.play('castUp', 1); Audio.sfx('lavaBurst', { vol: 0.7 });
      const n = 4 + a.phase;
      for (let i = 0; i < n; i++) {
        const x = pl.x + (i ? rand.range(-5, 5) : 0), z = pl.z + (i ? rand.range(-5, 5) : 0);
        if (!G.zone.map.walkable(x, z)) continue;
        const dl = 1.1 + i * 0.15;
        teleCircle(x, z, 1.8, dl, 0xff5010);
        later(dl, () => {
          explosion(x, z, 1.8, 0xff7a20, { smoke: 0x2a1a10, shake: 0.1 });
          for (let k = 0; k < 18; k++) P({ x: x + rand.range(-0.4, 0.4), y: 0.2, z: z + rand.range(-0.4, 0.4), vx: rand.range(-1, 1), vy: rand.range(5, 10), vz: rand.range(-1, 1), life: rand.range(0.5, 1), size: 0.4, size1: 0.1, color: 0xffc050, color1: 0xff3000, grav: 9 });
          area('fire', x, z, 1.4, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 });
          Audio.sfx('lavaBurst', { x, z, vol: 0.6 });
          const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 1.9) hitHero(a, p, 1.1, { burn: a.dmg * 0.6 });
        });
      }
      return { t: 0.6, fn() {}, after: 0.4 };
    } },
    { id: 'hounds', when: () => true, cd: 18, phaseCd: [18, 15, 12], run(a) {
      a.avatar?.play('summon', 1.5); Audio.sfx('summon'); Audio.sfx('lavaBurst');
      return { t: 1.0, fn() {
        const c = G.zone.L.boss, n = 2 + a.phase;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * 6.28 + rand.range(0, 1), p = G.zone.map.nearestFloor(c.x + Math.sin(ang) * 7.6, c.z + Math.cos(ang) * 7.6);
          const m = spawnMonster('magmaHound', p.x, p.z, {}); m.aggro = true; G.actors.push(m);
          explosion(p.x, p.z, 1.4, 0xff7a20, { smoke: 0x2a1a10, shake: 0.05 });
        }
      }, after: 0.6 };
    } },
    { id: 'wave', when: (a, d) => a.phase >= 1 && d > 4.5 && d < 16, cd: 7, run(a, pl) { a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.tele = teleLine(a.x, a.z, a.rot, 16, 2.6, 0.8, 0xff5010); a.avatar?.play('chop', 1.2); return { t: 0.8, fn() { fire('firewave', a, a.x, a.z, a.rot, { y: 0.8, dmg: a.dmg * 1.3, life: 1.3, r: 1.3, opts: { burn: a.dmg * 0.6 } }); Audio.sfx('fireball'); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); }, after: 0.5 }; } },
    { id: 'meteor', when: (a) => a.phase >= 2, cd: 6, run(a, pl) {
      for (let i = 0; i < 3; i++) {
        const x = pl.x + rand.range(-3, 3), z = pl.z + rand.range(-3, 3), dl = 1.3 + i * 0.35;
        if (!G.zone.map.walkable(x, z)) continue;
        teleCircle(x, z, 2.4, dl, 0xff3000);
        later(dl - 0.35, () => fall(x, z, 0xffa040, true));
        later(dl, () => { explosion(x, z, 2.4, 0xff6a10, { smoke: 0x2a1a10, shake: 0.35 }); area('fire', x, z, 2, 5, { team: 'foe', src: a, dmg: a.dmg * 0.35, tick: 0.5 }); Audio.sfx('explosion', { x, z, vol: 0.7 }); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 2.5) hitHero(a, p, 1.6, { burn: a.dmg }); });
      }
      Audio.sfx('meteorFall');
      return { t: 0.4, fn() {}, after: 0.3 };
    } }
  ]
};
function fireCombo(a, pl) {
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.tele = teleCone(a.x, a.z, a.rot, 4.7, 1.0, 0.5, 0xff5010);
  const step = a.combo;
  a.avatar?.play(['slash1', 'slash2', 'slam'][step], 1.25, { hitIn: 0.5 });
  return { t: 0.5, fn() {
    if (meleeLands(a, G.player, 4.5, 1.0)) hitHero(a, G.player, step === 2 ? 1.5 : 1, { burn: a.dmg * 0.4 });
    Audio.sfx('swingHeavy', { x: a.x, z: a.z }); shake(step === 2 ? 0.35 : 0.12);
    if (step === 2) { const x = a.x + Math.sin(a.rot) * 3, z = a.z + Math.cos(a.rot) * 3; explosion(x, z, 1.8, 0xff6a10, { smoke: 0x2a1a10, shake: 0.3 }); area('fire', x, z, 1.5, 3.5, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }
    a.combo++;
  }, after: 0.25, chain: a.combo < 2 && Math.hypot(G.player.x - a.x, G.player.z - a.z) < 5, chainFn: fireCombo };
}
function comboStep(a, pl) {
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.tele = teleCone(a.x, a.z, a.rot, 4.6, 1.0, 0.5, 0x60b0ff);
  const step = a.combo;
  a.avatar?.play(['slash1', 'slash2', 'chop'][step], 1.3);
  return { t: 0.5, fn() { if (meleeLands(a, G.player, 4.4, 1.0)) hitHero(a, G.player, step === 2 ? 1.5 : 1); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); shake(step === 2 ? 0.3 : 0.12); a.combo++; }, after: 0.25, chain: a.combo < 2 && Math.hypot(G.player.x - a.x, G.player.z - a.z) < 5 };
}

function boss(a, dt, pl, d, S) {
  if (!a.awake) {
    if ((d < (S.wake || 13) || a.hp < a.hpMax) && G.zone.map.los(a.x, a.z, pl.x, pl.z)) { a.awake = true; a.aggro = true; S.intro(a); a.cd = 1.5; a.mcd = {}; }
    return 0;
  }
  const hpf = a.hp / a.hpMax, ph = S.phases || [S.name === 'lord' ? 0.6 : 0.5, 0.25];
  const phase = hpf < ph[1] ? 2 : hpf < ph[0] ? 1 : 0;
  if (phase !== a.phase) { if (a.phase != null && phase > a.phase) { emit('bossPhase', a, phase); Audio.sfx('bossRoar'); shake(0.4); } a.phase = phase; }
  const fast = phase === 2 ? 1.25 : 1;
  a.mcd = a.mcd || {};
  for (const k in a.mcd) a.mcd[k] -= dt * fast;
  // a charge in progress: straight on until a wall, trampling whatever is in the way
  if (a.dash) {
    const D = a.dash, st = Math.min(dt, D.t);
    D.t -= dt;
    const nx = a.x + D.vx * st, nz = a.z + D.vz * st;
    if (G.zone.map.walkable(nx, nz)) { a.x = nx; a.z = nz; } else D.t = 0;
    if (Math.random() < 0.7) puff(a.x, 0.3, a.z, 2, 0x8a8680, 0.8, 0.8, 0.8);
    if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.6) { D.hit = true; hitHero(a, pl, 1.5, { stun: 0.5 }); shake(0.4); }
    if (D.t <= 0) { a.dash = null; explosion(a.x, a.z, 2.4, 0xb0a080, { smoke: 0x6a6258, shake: 0.4 }); Audio.sfx('slam', { x: a.x, z: a.z }); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 2.6) hitHero(a, pl, 0.8); }
    return 20;
  }
  if (a.move) {
    const m = a.move;
    m.t -= dt;
    if (m.leap) { const u = clamp(1 - m.t / m.t0, 0, 1); a.x = a.lx + (a.leapTo.x - a.lx) * u; a.z = a.lz + (a.leapTo.z - a.lz) * u; a.y = Math.sin(u * Math.PI) * 3; }
    else if (!a.hidden) face(a, pl, dt, 3);
    if (m.t <= 0 && !m.fired) { m.fired = true; a.y = 0; killTele(a.tele); a.tele = null; m.fn(); m.t = m.after; }
    else if (m.fired && m.t <= 0) {
      if (m.chain) { a.move = Object.assign((m.chainFn || comboStep)(a, pl), { fired: false }); a.move.t0 = a.move.t; }
      else { a.move = null; a.cd = 0.5 / fast; }
    }
    return 0;
  }
  if (a.cd > 0) { if (d > 3.5) return seek(a, pl.x, pl.z, a.speed * fast * (S.name === 'lord' ? 0.8 : 1), dt); face(a, pl, dt, 4); return 0; }
  const choices = S.moves.filter((m) => (a.mcd[m.id] ?? 0) <= 0 && m.when(a, d));
  // prefer the special moves when they are ready
  const pick = choices.find((m) => m.id !== 'bite' && m.id !== 'combo' && !m.basic) || choices[0];
  if (!pick) return seek(a, pl.x, pl.z, a.speed * fast, dt);
  a.mcd[pick.id] = pick.phaseCd ? pick.phaseCd[phase] : pick.cd;
  const m = pick.run(a, pl);
  m.t0 = m.t; m.fired = false;
  a.move = m;
  return 0;
}
export { AI };
