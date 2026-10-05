// Monster, pet and boss behaviour.
import { G, later } from './state.js';
import { MONSTERS } from './data.js';
import { rebuildHash, foes, near, spawnMonster, restoreRim, spawnNpc } from './actors.js';
import { damage, tickStatus, moveMul, heroHit } from './combat.js';
import { fire, area } from './projectiles.js';
import { teleCircle, teleCone, teleLine, killTele, sparks, glowBurst, explosion, ring, bolt, P, puff, decal, flash } from '../gfx/fx.js';
import { shake, addLight, R } from '../gfx/gfx.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { rand, angleTo, angleDiff, dampAngle, clamp } from '../core/util.js';
import { has } from '../i18n/i18n.js';
import { sapAt, addSapPool, addSapRing, sapPools, startDrips } from './sap.js';
import { grantBuff } from './stats.js';

const ATK_SFX = { goblin: 'goblinAttack', wolf: 'wolfAttack', spider: 'spiderHiss', orc: 'orcAttack', troll: 'trollRoar', skeleton: 'skeletonRattle', wraith: 'wraithWail', hound: 'houndGrowl', bat: 'batScreech', worm: 'wormRumble', dwarf: 'dwarfAttack', golem: 'golemStep' };
// attack timing per animation: speed, hit time (s), total (s)
const ATK = {
  stab: { speed: 1.25, hit: 0.34, dur: 0.85 }, slash1: { speed: 1.05, hit: 0.38, dur: 0.85 }, chop: { speed: 1.05, hit: 0.7, dur: 1.25 },
  smash: { speed: 0.75, hit: 0.5, dur: 1.3 }, claw: { speed: 1.1, hit: 0.52, dur: 1.0 }, bite: { speed: 1, hit: 0.22, dur: 0.6 }, cast: { speed: 0.9, hit: 0.35, dur: 1.0 },
  heavyStab: { speed: 1.0, hit: 0.5, dur: 1.05 }, spinOnce: { speed: 1.1, hit: 0.55, dur: 1.15 }
};
const flow = { t: 0 };
const dirTmp = { x: 0, z: 0 };
// how the dormant wake: skeletons from their bone piles; others say so in MONSTERS (def.wake)
const WAKE = { d: 7, clip: 'rise', sfx: 'skeletonRattle', t: 2.1, speed: 1.1 };
let clock = 0;
// what the Act III creatures and bosses did, move by move (read by the scenario tests)
export const AI_LOG = {};
const tally = (a, what) => { const k = a.kind + ':' + what; AI_LOG[k] = (AI_LOG[k] || 0) + 1; };
if (import.meta.env?.DEV && typeof window !== 'undefined') window.__act3 = { AI_LOG, damage, addSapPool, sapPools, spawnNpc, moveMul, heroHit, startDrips, grantBuff };

export function updateActors(dt) {
  const pl = G.player, map = G.zone.map;
  clock += dt;
  rebuildHash();
  flow.t -= dt;
  if (flow.t <= 0 && pl) { map.updateFlow(pl.x, pl.z, 45); flow.t = 0.2; }
  for (let i = G.actors.length - 1; i >= 0; i--) {
    const a = G.actors[i];
    if (a.removed) { G.actors.splice(i, 1); continue; }
    // a Mourner's bond holds only while she keeps singing it
    if (a.bondT > 0) a.bondT -= dt;
    if (a.team === 'npc') { npc(a, dt); continue; }
    if (a.prop) { if (a.dead) { a.deadT += dt; if (a.deadT > 0.05) { a.remove(); G.actors.splice(i, 1); } } continue; }
    if (a.dead) { dying(a, dt); if (a.removed) G.actors.splice(i, 1); continue; }
    // only think when near the hero
    const dx = pl.x - a.x, dz = pl.z - a.z, d = Math.hypot(dx, dz);
    if (d > 38 && !a.boss && !a.pet) { if (a.avatar) a.avatar.group.visible = false; continue; }
    if (a.avatar) a.avatar.group.visible = !a.hidden;
    if (a.dormant) {
      // the disguised (Hollowed passing for dead wood) wake only when the hero is close, they are struck, or a pack-mate breaks cover
      const W = a.def.wake || WAKE;
      const wake = a.disguised ? d < W.d || a.hp < a.hpMax || (a.wakeIn != null && (a.wakeIn -= dt) <= 0) : d < W.d || a.aggro;
      if (wake) { a.dormant = false; a.rising = W.t; a.aggro = true; a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.avatar?.play(W.clip, W.speed ?? 1.1); Audio.sfx(W.sfx, { x: a.x, z: a.z }); if (a.disguised) unmask(a); }
      else { const av = a.avatar; if (av) { av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot; av.update(a.disguised ? 0 : dt, { speed: 0 }); } continue; }
    }
    tickStatus(a, dt);
    if (a.dead) continue;
    a.t += dt; a.cd -= dt;
    a.px = a.x; a.pz = a.z;
    if (a.ward > 0) { a.ward -= dt; if (a.ward <= 0) restoreRim(a); else if (Math.random() < 0.3) P({ x: a.x + rand.range(-0.5, 0.5), y: rand.range(0.4, 1.8), z: a.z + rand.range(-0.5, 0.5), vy: 0.6, life: 0.5, size: 0.12, size1: 0.02, color: 0xffb050 }); }
    a.flash = Math.max(0, a.flash - dt * 6);
    // amber sap slows flesh; wood, fliers and floaters never notice it (a charge handles sap itself)
    a.onSap = !a.def.float && a.def.flesh !== 'wood' && a.def.ai !== 'bat' && !a.under && !a.dash && sapAt(a.x, a.z);
    // stunned, frozen or terrified, a Mourner loses her song
    if (a.bond && (a.status.freeze > 0 || a.status.stun > 0 || a.status.fear > 0)) breakBond(a);
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
      if (l < min && l > 0.001) { const push = (min - l) * 0.5 * (b.boss ? 2 : 1) * (a.boss || a.def.anchored ? 0 : 1); a.x += (ex / l) * push; a.z += (ez / l) * push; }
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
  // a rooted elder (Old Linden) neither turns nor stirs much
  if (a.still) { if (a.home != null) a.rot = a.home; }
  else if (d < 6) a.rot = dampAngle(a.rot, angleTo(a.x, a.z, pl.x, pl.z), 3, dt);
  else if (a.home) a.rot = dampAngle(a.rot, a.home, 2, dt);
  av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot;
  av.update(dt * (a.animRate ?? 1), { speed: 0, lookAround: 1 });
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
      if (attackTick(a, dt)) {
        if (a.spin) { killTele(a.tele); a.tele = null; tally(a, 'spin'); if (td < 2.5 + tg.radius) hitHero(a, pl, 1.1, { target: tg }); }
        else if (meleeLands(a, tg, a.def.reach)) hitHero(a, pl, 1, { poison: a.def.poison ? a.dmg * 0.6 : 0, burn: a.def.burns ? a.dmg * 0.5 : 0, target: tg });
      }
      return 0;
    }
    if (td < a.def.reach + tg.radius + 0.1) {
      face(a, tg, dt);
      if (a.cd <= 0) {
        // the Rootsworn sweep their spear right round every third blow
        a.swings = (a.swings || 0) + 1; a.spin = !!a.def.spinEvery && a.swings % a.def.spinEvery === 0;
        if (a.spin) { a.tele = teleCircle(a.x, a.z, 2.5, 0.55, 0xff9030); startAttack(a, 'spinOnce'); }
        else startAttack(a, a.def.atk);
      }
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
      if (!a.atkHit && u > 0.35 && td < a.def.reach + tg.radius) { a.atkHit = true; hitHero(a, pl, 1, { target: tg, slow: a.def.biteSlow }); }
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
  // ---------- Act III ----------
  hollow(a, dt, pl, d) {
    // once, when badly hurt, it takes root: kneels, hardens (half damage) and mends 8%/s up to 60%. Fire cracks the bark.
    if (a.rootT > 0) {
      a.rootT -= dt;
      if (a.status.burn > 0) { a.rootT = 0; tally(a, 'cracked'); sparks(a.x, 1, a.z, 16, 0xffa040, 5); puff(a.x, 0.8, a.z, 6, 0x3a2a1a, 0.8, 0.8, 0.8); Audio.sfx('hollowCrack', { x: a.x, z: a.z }); }
      else if (a.hp < a.hpMax * 0.6) a.hp = Math.min(a.hpMax * 0.6, a.hp + a.hpMax * 0.08 * dt);
      if (Math.random() < 0.5) P({ x: a.x + rand.range(-0.5, 0.5), y: rand.range(0.1, 1.2), z: a.z + rand.range(-0.5, 0.5), vy: rand.range(0.4, 1), life: 0.8, size: 0.1, size1: 0.02, color: 0xc8e070, color1: 0xffb030 });
      if (a.rootT <= 0) { a.dmgTaken = null; a.rising = 1.1; a.avatar?.play('riseStand', 1.6); }
      return 0;
    }
    if (!a.tookRoot && a.aggro && a.hp < a.hpMax * 0.35) {
      a.tookRoot = true; a.rootT = 3; a.dmgTaken = 0.5; a.state = 'chase'; killTele(a.tele); a.tele = null;
      a.avatar?.play('kneel', 1, { loop: true }); Audio.sfx('hollowCrack', { x: a.x, z: a.z, vol: 0.7 });
      glowBurst(a.x, 0.8, a.z, 0xc8e070, 14, 2, 0.25, 0.6); tally(a, 'takeRoot');
      return 0;
    }
    return AI.melee(a, dt, pl, d);
  },
  rootling(a, dt, pl, d) {
    // underground under a leaf mound until the hero is close; then the whole pack bursts out together
    if (a.under) {
      if (a.avatar) a.avatar.group.visible = false;
      if (a.emergeIn == null && (d < 6 || a.hp < a.hpMax)) burstPack(a);
      if (a.emergeIn != null && (a.emergeIn -= dt) <= 0) emerge(a);
      return 0;
    }
    // the shriek: a cone that slows and breaks a channel; one per pack every 8 s
    if (a.state === 'shriek') {
      a.atkT += dt;
      if (!a.atkHit && a.atkT >= 0.6) {
        a.atkHit = true; killTele(a.tele); a.tele = null;
        for (let i = 0; i < 12; i++) { const ang = a.rot + rand.range(-0.7, 0.7), sp = rand.range(5, 10); P({ x: a.x, y: 0.5, z: a.z, vx: Math.sin(ang) * sp, vy: rand.range(0, 1), vz: Math.cos(ang) * sp, life: 0.5, size: 0.3, size1: 0.6, color: 0xd8ff90, alpha: 0.5, alpha1: 0, drag: 3 }); }
        if (meleeLands(a, pl, 6, 0.75)) hitHero(a, pl, 0.3, { slow: { k: 0.5, t: 1.2 }, interrupt: true });
      }
      if (a.atkT >= 1.2) { a.state = 'chase'; a.cd = 0.2; }
      return 0;
    }
    if (a.shriek && d < 6.5 && clock - (SHRIEK.get(a.shriekKey) ?? -99) >= 8 && G.zone.map.los(a.x, a.z, pl.x, pl.z)) {
      SHRIEK.set(a.shriekKey, clock); a.shriek = false; tally(a, 'shriek');
      a.state = 'shriek'; a.atkT = 0; a.atkHit = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      a.tele = teleCone(a.x, a.z, a.rot, 6, 0.7, 0.6, 0xc8ff60);
      a.avatar?.play('attack2', 1, { hitIn: 0.6 }); Audio.sfx('rootlingShriek', { x: a.x, z: a.z });
      return 0;
    }
    return AI.melee(a, dt, pl, d);
  },
  charger(a, dt, pl, d) {
    // the Amberback Bear: rears, charges, and if it hits a wall, a stone or sap it stands there dazed
    if (a.dazed > 0) return dazedTick(a, dt);
    if (a.dash) return dashStep(a, dt, pl);
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    a.chargeCd = (a.chargeCd ?? rand.range(0.5, 2)) - dt;
    if (a.state === 'rear') {
      a.atkT += dt * windMul(a);
      if (a.atkT >= 0.9) {
        a.state = 'chase'; killTele(a.tele); a.tele = null; a.chargeCd = rand.range(5, 7);
        startDash(a, a.chargeDir, 18, a.chargeLen, { daze: 2, sapDaze: 1, dmg: 1.4, hitO: { push: 20 }, dust: 0x5a4a38 });
        a.avatar?.play('charge', 1.5, { loop: true }); Audio.sfx('bearCharge', { x: a.x, z: a.z }); tally(a, 'charge');
      }
      return 0;
    }
    if (a.state === 'attack') {
      if (attackTick(a, dt)) { killTele(a.tele); a.tele = null; Audio.sfx('slam', { x: a.x, z: a.z, vol: 0.5 }); if (meleeLands(a, pl, 2.6 + pl.radius, 1.0)) hitHero(a, pl, a.atkName === 'attack2' ? 1.25 : 1, { push: 8 }); }
      return 0;
    }
    if (d > 5 && d < 14 && a.chargeCd <= 0 && G.zone.map.clear(a.x, a.z, pl.x, pl.z)) {
      a.state = 'rear'; a.atkT = 0; a.rot = a.chargeDir = angleTo(a.x, a.z, pl.x, pl.z); a.chargeLen = Math.min(18, d + 4);
      a.tele = teleLine(a.x, a.z, a.rot, a.chargeLen, 2.4, 0.9, 0xff9020);
      a.avatar?.play('rear', 1, { hitIn: 0.9 }); Audio.sfx('bearRoar', { x: a.x, z: a.z }); tally(a, 'rear');
      return 0;
    }
    if (d < a.def.reach + pl.radius + 0.3) {
      face(a, pl, dt, 6);
      if (a.cd <= 0) {
        const big = Math.random() < 0.35;
        a.tele = teleCone(a.x, a.z, a.rot, 3, 1.0, big ? 0.85 : 0.6, 0xff6020);
        startAttack(a, big ? 'attack2' : 'attack', { hit: big ? 0.85 : 0.6, dur: big ? 1.5 : 1.1 });
        a.cd = 1.6; tally(a, 'maul');
      }
      return 0;
    }
    return seek(a, pl.x, pl.z, a.speed, dt);
  },
  skirmisher(a, dt, pl, d) {
    // the Rootsworn archer: shoots, steps into the trees (unseen, untouchable) and steps out somewhere else along the tree line
    if (a.hidden) { a.invuln = Math.max(0, (a.invuln || 0) - dt); if ((a.hideT -= dt) <= 0) reappear(a, pl); return 0; }
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    a.stepCd = (a.stepCd ?? 1.5) - dt;
    if (a.stepCd <= 0 && a.state !== 'attack' && ((a.shotsSince || 0) >= 2 || d < 5)) { vanish(a); return 0; }
    const tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (a.state === 'aim') {
      face(a, tg, dt, 10); a.atkT += dt;
      if (a.atkT > 0.55) { a.state = 'attack'; a.atkT = 0; a.atkHit = false; a.atkHitT = 0.12; a.atkDur = 0.6; a.avatar?.play('shoot', 0.9); }
      return 0;
    }
    if (a.state === 'attack') {
      if (attackTick(a, dt)) {
        a.shots = (a.shots || 0) + 1; a.shotsSince = (a.shotsSince || 0) + 1;
        // every third arrow is a pinning arrow: green fletching, a hard slow (never a root)
        const pin = a.shots % 3 === 0;
        fire(pin ? 'pin' : a.def.proj || 'arrow', a, a.x + Math.sin(a.rot) * 0.5, a.z + Math.cos(a.rot) * 0.5, angleTo(a.x, a.z, tg.x, tg.z) + rand.range(-0.05, 0.05), { y: 1.25, dmg: a.dmg, opts: pin ? { slow: { k: 0.5, t: 1.2 } } : {} });
        Audio.sfx('arrowShoot', { x: a.x, z: a.z, vol: 0.5 }); tally(a, pin ? 'pin' : 'shoot');
      }
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
  rooted(a, dt, pl, d) {
    // the Rootwarden: an old Evergreen rooted where it stood. Never moves; spikes, lashes, and weeps sap around itself
    const av = a.avatar;
    if (!a.awake) {
      if (!a.slumber) { a.slumber = true; av?.play('dormant', 1, { loop: true }); }
      if (d < 10 || a.hp < a.hpMax) {
        a.awake = true; a.aggro = true; a.rising = 2.7; av?.play('rise', 1); tally(a, 'wake');
        Audio.sfx('hollowCrack', { x: a.x, z: a.z }); Audio.sfx('trollRoar', { x: a.x, z: a.z, vol: 0.4 });
        puff(a.x, 0.3, a.z, 14, 0x4a3a28, 1.4, 2, 1.4);
        for (const b of G.actors) if (a.packId != null && b.packId === a.packId) b.aggro = true;
      }
      return 0;
    }
    if (a.state === 'cast') {
      a.atkT += dt;
      if (!a.atkHit && a.atkT >= a.atkHitT) { a.atkHit = true; a.castFn(); }
      if (a.atkT >= a.atkDur) a.state = 'idle';
      return 0;
    }
    face(a, pl, dt, 1.2);
    a.spikeT = (a.spikeT ?? 1.5) - dt; a.weepT = (a.weepT ?? 4) - dt; a.lashT = (a.lashT ?? 0) - dt;
    const cast = (clip, hit, dur, fn) => { a.state = 'cast'; a.atkT = 0; a.atkHit = false; a.atkHitT = hit; a.atkDur = dur; a.castFn = fn; av?.play(clip, 1, { hitIn: hit }); };
    if (d < 4 + pl.radius && a.lashT <= 0) {
      a.lashT = 4.5; tally(a, 'lash');
      const t = teleCircle(a.x, a.z, 4, 0.8, 0xff7020);
      cast('attack', 0.8, 1.6, () => {
        killTele(t); ring(a.x, a.z, 4, 0xc08040, 0.4); puff(a.x, 0.4, a.z, 8, 0x4a3a28, 1, 3, 0.8); Audio.sfx('swingHeavy', { x: a.x, z: a.z });
        const p = G.player; if (Math.hypot(p.x - a.x, p.z - a.z) < 4.2 + p.radius * 0.5) hitHero(a, p, 1.3, { push: 28 });
      });
    } else if (a.weepT <= 0) {
      a.weepT = 8; tally(a, 'weep');
      cast('cast', 1.0, 2.2, () => {
        for (let i = 0; i < 3; i++) { const ang = rand.range(0, 6.28), r = rand.range(2.4, 3.6), f = G.zone.map.nearestFloor(a.x + Math.sin(ang) * r, a.z + Math.cos(ang) * r, 3); addSapPool(f.x, f.z, 2, 6); }
        Audio.sfx('sapRoot', { x: a.x, z: a.z, vol: 0.5 });
      });
    } else if (a.spikeT <= 0 && d < 12 && G.zone.map.los(a.x, a.z, pl.x, pl.z)) {
      a.spikeT = 3; tally(a, 'spikes');
      const x = pl.x, z = pl.z; teleCircle(x, z, 1.6, 0.9, 0xc05a20);
      cast('attack2', 0.9, 1.8, () => { spikes(x, z, 1.6); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 1.6 + p.radius * 0.5) hitHero(a, p, 1.0, { slow: { k: 0.35, t: 1.5 } }); });
    }
    return 0;
  },
  tether(a, dt, pl, d) {
    // a Keening Mourner: binds the toughest guard near her (immune while she sings; a boss is only warded),
    // keeps 8-11 m off, and keens at the hero while unbonded
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    const map = G.zone.map;
    // a hard blow breaks her song: a fifth of her life within half a second
    if (a.t >= (a.hpMarkT ?? 0)) { a.hpMarkT = a.t + 0.5; a.hpMark = a.hp; }
    else if (a.bond && a.hpMark - a.hp >= a.hpMax * 0.2) { breakBond(a); tally(a, 'broken'); }
    let b = a.bond;
    if (b && (b.dead || b.removed || b.hidden || Math.hypot(b.x - a.x, b.z - a.z) > 13 || !map.los(a.x, a.z, b.x, b.z))) { breakBond(a); tally(a, 'lost'); b = null; }
    a.bondCd = (a.bondCd ?? 0.8) - dt;
    if (!b && a.bondCd <= 0 && a.state !== 'keen') {
      b = pickBond(a);
      if (b) { a.bond = b; b.bondBy = a; a.avatar?.play('channel', 1, { loop: true }); Audio.sfx('mournerKeen', { x: a.x, z: a.z, vol: 0.4 }); tally(a, b.boss ? 'wardBoss' : 'bond:' + b.kind); }
      else a.bondCd = 1;
    }
    if (b) {
      if (b.boss) { b.ward = Math.max(b.ward || 0, 0.3); b.avatar?.setRim(0xffe0a0, 1.4); } else b.bondT = 0.3;
      a.beamT = (a.beamT ?? 0) - dt;
      if (a.beamT <= 0) { a.beamT = 0.25; bolt(a.x, 1.8, a.z, b.x, headH(b) * 0.6, b.z, 0xffe8a0, 0.6); }
      if (Math.random() < 0.3) P({ x: b.x + rand.range(-0.5, 0.5), y: rand.range(0.3, headH(b)), z: b.z + rand.range(-0.5, 0.5), vy: 0.5, life: 0.6, size: 0.1, size1: 0.02, color: 0xffe8a0 });
      // keep the guard between her and the hero
      const ang = angleTo(pl.x, pl.z, b.x, b.z), tx = b.x + Math.sin(ang) * 4, tz = b.z + Math.cos(ang) * 4;
      if (Math.hypot(tx - a.x, tz - a.z) > 1.5 && map.walkable(tx, tz) && !b.boss) return seek(a, tx, tz, a.speed * 0.8, dt);
      face(a, b, dt, 4);
      return 0;
    }
    if (a.state === 'keen') {
      a.atkT += dt;
      if (!a.atkHit && a.atkT >= 1.2) {
        a.atkHit = true; const k = a.keen;
        ring(k.x, k.z, 2.2, 0xd8c8ff, 0.4); glowBurst(k.x, 0.8, k.z, 0xd8c8ff, 14, 2.5, 0.25, 0.5);
        if (Math.hypot(pl.x - k.x, pl.z - k.z) < 2.2 + pl.radius * 0.5) hitHero(a, pl, 0.9, { slow: { k: 0.4, t: 2 } });
      }
      if (a.atkT >= 1.5) a.state = 'chase';
      return 0;
    }
    const los = map.los(a.x, a.z, pl.x, pl.z);
    if (a.cd <= 0 && d < 13 && los) {
      a.state = 'keen'; a.atkT = 0; a.atkHit = false; a.keen = { x: pl.x, z: pl.z }; tally(a, 'keen');
      teleCircle(pl.x, pl.z, 2.2, 1.2, 0xd8c8ff); a.avatar?.play('castUp', 1); Audio.sfx('mournerKeen', { x: a.x, z: a.z });
      a.cd = rand.range(3.2, 4.2);
      return 0;
    }
    // keep 8-11 m off, and run from anything closer than 5
    if (d < 8 && los) { const ang = angleTo(pl.x, pl.z, a.x, a.z), nx = a.x + Math.sin(ang) * 3, nz = a.z + Math.cos(ang) * 3; if (map.walkable(nx, nz)) return seek(a, nx, nz, a.speed * (d < 5 ? 1 : 0.6), dt); }
    if (d > 11 || !los) return seek(a, pl.x, pl.z, a.speed, dt);
    face(a, pl, dt);
    return 0;
  },
  node(a, dt, pl, d) {
    // a Heartroot: wakes (with its guards), feeds the Lady through a tendril, or sprouts rootlings by a thorn wall
    const B = a.bossNode;
    if (!a.awake) {
      const due = a.wakeIn != null ? (a.wakeIn -= dt) <= 0 : d < 11;
      if (due || a.hp < a.hpMax) {
        a.awake = true; a.aggro = true; tally(a, 'wake');
        glowBurst(a.x, 1, a.z, 0xffb040, 26, 3, 0.3, 0.7); ring(a.x, a.z, 3, 0xffb040, 0.6); Audio.sfx('hollowCrack', { x: a.x, z: a.z });
        for (const k of a.guards || []) { const ang = Math.random() * 6.28, f = G.zone.map.nearestFloor(a.x + Math.sin(ang) * 2.5, a.z + Math.cos(ang) * 2.5, 4); const m = spawnMonster(k, f.x, f.z, { rising: true, level: a.level }); m.aggro = true; G.actors.push(m); }
      }
      return 0;
    }
    if (B && !B.dead) { a.beamT = (a.beamT ?? 0) - dt; if (a.beamT <= 0) { a.beamT = 0.25; bolt(a.x, 1.1, a.z, B.x, 1.6 * (B.scale || 1), B.z, 0xffa030, 0.9); } }
    else if (!B && a.sprout !== false && d < 16) {
      a.sproutT = (a.sproutT ?? 3) - dt;
      if (a.sproutT <= 0) {
        a.sproutT = 9;
        a.kids = (a.kids || []).filter((k) => !k.dead);
        if (a.kids.length < 2) { const ang = Math.random() * 6.28, f = G.zone.map.nearestFloor(a.x + Math.sin(ang) * 2, a.z + Math.cos(ang) * 2, 4); const m = spawnMonster('rootling', f.x, f.z, { rising: true }); m.aggro = true; G.actors.push(m); a.kids.push(m); tally(a, 'sprout'); }
      }
    }
    return 0;
  },
  silverhorn: (a, dt, pl, d) => boss(a, dt, pl, d, HART),
  amaranthe: (a, dt, pl, d) => { shardFollow(a); return boss(a, dt, pl, d, AMARANTHE); },
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

// ---------- Act III: helpers ----------
// a line said aloud if the text exists; the Evergreen know a ranger for one of their own (key + '.r')
function say(key) { const k = G.hero?.cls === 'ranger' && has(key + '.r') ? key + '.r' : key; if (has(k)) emit('say', k); }
// a timer that only fires if the boss is still alive and the hero has not left the zone
function inZone(a, fn) { const z = G.zone; return () => { if (G.zone === z && !a.dead) fn(); }; }
const headH = (a) => (a.avatar?.model?.tpl?.height || a.avatar?.model?.height || 1.8) * (a.avatar?.model?.base || 1) * (a.scale || 1);
// amber dust and other slows stall a wind-up
const windMul = (a) => (a.status.slow > 0 ? 1 - a.status.slowK : 1);
const SHRIEK = new Map();

// knocked senseless by a wall, a standing stone or sap: open to every blow (x1.5) for t seconds
function daze(a, t) {
  a.dazed = Math.max(a.dazed || 0, t); a.dmgTaken = 1.5;
  a.dash = null; a.move = null; a.state = 'dazed'; killTele(a.tele); a.tele = null;
  const av = a.avatar;
  if (av) av.play(a.dazeClip || (av.anim.clipFor?.('daze') ? 'daze' : 'hit'), 1, { loop: true });
  puff(a.x, 0.4, a.z, 10, 0x6a5a48, 1.4, 1.6, 1.2); shake(0.35);
  Audio.sfx('slam', { x: a.x, z: a.z }); tally(a, 'dazed');
}
function dazedTick(a, dt) {
  a.dazed -= dt; a.dmgTaken = 1.5;
  if (Math.random() < 0.6) { const h = headH(a) * 0.95, r = 0.35 + a.radius * 0.3; for (let k = 0; k < 2; k++) { const ang = clock * 7 + k * 3.14; P({ x: a.x + Math.sin(ang) * r, y: h, z: a.z + Math.cos(ang) * r, life: 0.25, size: 0.16, size1: 0.04, color: 0xffe880, color1: 0xffa020 }); } }
  if (a.dazed <= 0) { a.dazed = 0; a.dmgTaken = null; a.state = 'chase'; a.avatar?.anim.stop?.(0.25); a.cd = Math.max(a.cd, 0.4); }
  return 0;
}
// A charge in progress: straight on, trampling whatever is in the way, until something stops it. Shared by the
// bosses and the Amberback Bear. D = { vx, vz, t, hit, probe (how far ahead the front is), daze (seconds dazed on
// hitting something solid), sapDaze (seconds dazed on running into fresh sap), trail (sap left behind), crack (stones
// crack), dmg / hitO (what trampling the hero does), dust, end(a, D) }. Returns the speed, for the gait.
export function dashStep(a, dt, pl = G.player) {
  const D = a.dash, map = G.zone.map, st = Math.min(dt, D.t);
  D.t -= dt;
  const sp = Math.hypot(D.vx, D.vz) || 1, ux = D.vx / sp, uz = D.vz / sp, pr = D.probe || 0;
  const nx = a.x + D.vx * st, nz = a.z + D.vz * st;
  if (map.walkable(nx, nz) && (!pr || map.walkable(nx + ux * pr, nz + uz * pr))) { a.x = nx; a.z = nz; D.run = (D.run || 0) + sp * st; }
  else { D.t = 0; D.wall = { x: nx + ux * pr, z: nz + uz * pr }; }
  // fresh sap ahead stops it dead (not its own trail, nor sap it started in)
  if (D.sapDaze && !D.wall && D.t > 0) { const s = sapAt(a.x + ux * pr * 0.5, a.z + uz * pr * 0.5, D); if (s && !D.inSap) { D.t = 0; D.sap = true; } D.inSap = s; }
  if (D.trail && (D.run || 0) - (D.lastPool ?? -9) > 3.2) { D.lastPool = D.run; addSapPool(a.x - ux, a.z - uz, 1.5, 5, D); }
  if (Math.random() < 0.7) puff(a.x, 0.3, a.z, 2, D.dust ?? 0x8a8680, 0.8, 0.8, 0.8);
  if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.6) { D.hit = true; hitHero(a, pl, D.dmg ?? 1.5, D.hitO ?? { stun: 0.5 }); shake(0.4); }
  if (D.t <= 0) {
    a.dash = null;
    if (D.end) D.end(a, D);
    else { explosion(a.x, a.z, 2.4, 0xb0a080, { smoke: 0x6a6258, shake: 0.4 }); Audio.sfx('slam', { x: a.x, z: a.z }); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 2.6) hitHero(a, pl, 0.8); }
  }
  return sp;
}
function startDash(a, dir, sp, len, o = {}) {
  const ux = Math.sin(dir), uz = Math.cos(dir);
  a.rot = dir;
  a.dash = Object.assign({ vx: ux * sp, vz: uz * sp, t: len / sp, hit: false, probe: a.radius * 0.8, end: chargeEnd }, o);
  if (a.dash.sapDaze) a.dash.inSap = sapAt(a.x + ux * a.dash.probe * 0.5, a.z + uz * a.dash.probe * 0.5);
  return a.dash;
}
function chargeEnd(a, D) {
  if (D.wall && D.daze) { daze(a, D.daze); tally(a, 'hitWall'); if (D.crack) crackStone(a, D.wall); }
  else if (D.sap && D.sapDaze) { daze(a, D.sapDaze); tally(a, 'hitSap'); for (let i = 0; i < 16; i++) P({ add: false, x: a.x, y: 0.3, z: a.z, vx: rand.range(-3, 3), vy: rand.range(2, 4), vz: rand.range(-3, 3), life: 0.7, size: 0.16, size1: 0.08, color: 0xe0a030, alpha: 1, grav: 14 }); Audio.sfx('sapCrack', { x: a.x, z: a.z }); }
  else { a.avatar?.anim.stop?.(0.2); puff(a.x, 0.3, a.z, 6, D.dust ?? 0x8a8680, 1, 1, 1); }
}
// the Glade's standing stones: in the Hart's last run each charge cracks the stone it hits, and a second breaks it
function crackStone(a, at) {
  sparks(at.x, 1.4, at.z, 14, 0xfff0d0, 6, { color1: 0x8a8070 }); puff(at.x, 1.2, at.z, 6, 0x8a8680, 1, 1, 1);
  const L = G.zone.L; if (!L.stones || !a.boss || a.phase < 2) return;
  let best = null, bd = 9;
  for (const s of L.stones) { if (s.broken) continue; const d2 = (s.x - at.x) ** 2 + (s.z - at.z) ** 2; if (d2 < bd) { bd = d2; best = s; } }
  if (!best) return;
  best.cracks = (best.cracks || 0) + 1;
  Audio.sfx('stoneCrack', { x: best.x, z: best.z });
  if (best.cracks === 1) { tally(a, 'stoneCracked'); emit('stoneCracked', best); return; }
  best.broken = true; tally(a, 'stoneBroken');
  openCells(best.cells || []);
  explosion(best.x, best.z, 2.2, 0xb0a890, { smoke: 0x6a6258, shake: 0.6 });
  for (let i = 0; i < 24; i++) P({ add: false, x: best.x, y: rand.range(0.5, 2.5), z: best.z, vx: rand.range(-5, 5), vy: rand.range(2, 7), vz: rand.range(-5, 5), life: 1.2, size: rand.range(0.18, 0.35), size1: 0.2, color: 0x6a665e, alpha: 1, grav: 16 });
  Audio.sfx('slam', { x: best.x, z: best.z });
  emit('stoneBroken', best);
}
function openCells(cells) {
  const map = G.zone.map;
  if (map.open) map.open(cells);
  else { for (const [ix, iz] of cells) map.setSolid(ix, iz, false); map.flowT.x = -1; }
}
function spikes(x, z, r, color = 0x3a2a18) {
  for (let i = 0; i < 14; i++) { const ang = Math.random() * 6.28, rr = Math.random() * r * 0.8; P({ add: false, x: x + Math.sin(ang) * rr, y: 0, z: z + Math.cos(ang) * rr, vy: rand.range(5, 8), life: 0.35, size: 0.2, size1: 0.06, color, alpha: 1, grav: 18 }); }
  puff(x, 0.3, z, 5, 0x4a3a28, 0.9, r, 0.9); ring(x, z, r, 0xc08040, 0.35);
  Audio.sfx('hitBone', { x, z, vol: 0.6 });
}
function leafBurst(x, z) {
  for (let i = 0; i < 22; i++) P({ add: false, x: x + rand.range(-0.4, 0.4), y: rand.range(0.3, 2), z: z + rand.range(-0.4, 0.4), vx: rand.range(-2.5, 2.5), vy: rand.range(0.5, 2.5), vz: rand.range(-2.5, 2.5), life: rand.range(0.8, 1.4), size: rand.range(0.1, 0.18), size1: 0.08, color: [0x8a9a3a, 0xc0a040, 0x5a6a2a][i % 3], alpha: 1, alpha1: 0, grav: 2, drag: 1.5 });
}
// an amber drop lobbed onto (x1, z1): it hits, and leaves a pool of sap
function amberLob(a, x0, z0, x1, z1, dur, r, mult, poolDur) {
  lob(x0, z0, x1, z1, dur, 4, 0xd08a20, (x, z) => {
    for (let k = 0; k < 14; k++) P({ x, y: 0.3, z, vx: rand.range(-3, 3), vy: rand.range(2, 5), vz: rand.range(-3, 3), life: 0.6, size: 0.18, size1: 0.05, color: 0xffd070, color1: 0xff8a10, grav: 12 });
    Audio.sfx('sapRoot', { x, z, vol: 0.5 });
    const p = G.player; if (Math.hypot(p.x - x, p.z - z) < r + 0.2) hitHero(a, p, mult);
    addSapPool(x, z, r, poolDur);
  });
}
// the Hollowed's disguise falls away: bark cracks, and the rest of its pack breaks cover after it
function unmask(a) {
  a.disguised = false;
  a.avatar?.setTint(a.baseTint ?? 0xffffff, a.baseTintAmt ?? 0);
  for (let i = 0; i < 14; i++) P({ add: false, x: a.x + rand.range(-0.3, 0.3), y: rand.range(0.4, 1.8), z: a.z + rand.range(-0.3, 0.3), vx: rand.range(-2, 2), vy: rand.range(1, 3), vz: rand.range(-2, 2), life: 0.9, size: 0.12, size1: 0.08, color: 0x3a2a1a, alpha: 1, grav: 14 });
  tally(a, 'unmask');
  for (const b of G.actors) if (b !== a && b.disguised && b.dormant && a.packId != null && b.packId === a.packId && b.wakeIn == null) b.wakeIn = rand.range(0.2, 0.9);
}
function burstPack(a) {
  for (const b of G.actors) if (b.under && b.def.burst && !b.dead && b.emergeIn == null && (b === a || (a.packId != null && b.packId === a.packId))) b.emergeIn = b === a ? 0 : rand.range(0.1, 0.45);
}
function emerge(a) {
  a.under = false; a.emergeIn = null; a.y = 0; a.aggro = true; a.shriek = true; a.shriekKey = a.packId ?? 'loose';
  if (a.mesh) { R.scene.remove(a.mesh); a.mesh = null; }
  if (a.avatar) { a.avatar.group.visible = true; a.avatar.play('rise', 1.5); }
  a.rising = 1.0; tally(a, 'emerge');
  puff(a.x, 0.3, a.z, 8, 0x4a3a28, 1, 1.2, 1);
  for (let i = 0; i < 12; i++) P({ add: false, x: a.x, y: 0.3, z: a.z, vx: rand.range(-3, 3), vy: rand.range(2, 5), vz: rand.range(-3, 3), life: 0.9, size: 0.14, size1: 0.1, color: i % 3 ? 0x3a2a1a : 0xb09a40, alpha: 1, grav: 14 });
  Audio.sfx('slam', { x: a.x, z: a.z, vol: 0.3 });
}
function vanish(a) {
  leafBurst(a.x, a.z);
  a.hidden = true; a.invuln = 1.2; a.hideT = 1.2; a.state = 'chase'; killTele(a.tele); a.tele = null;
  Audio.sfx('roll', { x: a.x, z: a.z, vol: 0.5 }); tally(a, 'vanish');
}
// step out at the tree line (a floor cell beside a solid one), 9-12 m from the hero and in sight of her
function reappear(a, pl) {
  const map = G.zone.map;
  let best = null;
  for (let k = 0; k < 20 && !best; k++) {
    const ang = Math.random() * 6.28, r = k < 12 ? rand.range(9, 12) : rand.range(7, 14), ix = Math.floor(pl.x + Math.sin(ang) * r), iz = Math.floor(pl.z + Math.cos(ang) * r);
    if (map.solid(ix, iz) || !(map.solid(ix + 1, iz) || map.solid(ix - 1, iz) || map.solid(ix, iz + 1) || map.solid(ix, iz - 1))) continue;
    if (map.los(ix + 0.5, iz + 0.5, pl.x, pl.z)) best = { x: ix + 0.5, z: iz + 0.5 };
  }
  if (best) { a.x = best.x; a.z = best.z; }
  a.hidden = false; a.invuln = 0; a.shotsSince = 0; a.stepCd = rand.range(4, 6); a.cd = 0.3;
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  leafBurst(a.x, a.z); tally(a, best ? 'treeline' : 'stayed');
}
// a Mourner binds the toughest guard in reach (never another Mourner, never a Heartroot); the Lady first, if called by her
const BOND_RANK = { rootwarden: 5, amberBear: 4, rootsworn: 3, rootswornArcher: 2.5, hollowed: 2 };
function pickBond(a) {
  const map = G.zone.map, B = a.bondBoss;
  if (B && !B.dead && Math.hypot(B.x - a.x, B.z - a.z) < 16 && map.los(a.x, a.z, B.x, B.z)) return B;
  let best = null, bs = 0;
  for (const b of near(a.x, a.z, 10)) {
    if (b === a || b.dead || b.prop || b.team !== 'foe' || b.under || b.hidden || b.dormant || b.def.ai === 'tether' || b.def.ai === 'node') continue;
    let sc = b.boss ? 10 : BOND_RANK[b.kind] ?? 1;
    if (!b.boss && b.bondBy && b.bondBy !== a && b.bondBy.bond === b) sc -= 3;
    if (sc > bs && map.los(a.x, a.z, b.x, b.z)) { bs = sc; best = b; }
  }
  return best;
}
function breakBond(a) {
  const b = a.bond; if (!b) return;
  a.bond = null; a.bondCd = 5;
  if (b.bondBy === a) { b.bondBy = null; b.bondT = 0; }
  ring(b.x, b.z, 1.6, 0xd0c0a0, 0.4); glowBurst(b.x, 1.2, b.z, 0xd0c0a0, 10, 2, 0.2, 0.4);
  a.avatar?.anim.stop?.(0.2);
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
// ---------- Act III bosses ----------
const arena = (a) => G.zone.L.boss || a.home;
const gladeR = () => G.zone.L.spots?.glade?.r ?? 14;
function stampFx(a, r) { explosion(a.x, a.z, r, 0xffe0a0, { smoke: 0x6a6258, shake: 0.6 }); ring(a.x, a.z, r + 0.5, 0xffd080, 0.6); Audio.sfx('slam'); Audio.sfx('golemStep', { vol: 0.6 }); }
// Silverhorn, the White Hart: it charges, and the Glade's standing stones are its weakness
const HART = {
  name: 'silverhorn', phases: [0.6, 0.3], wake: 14,
  intro(a) {
    emit('bossIntro', a); say('d.hart');
    Audio.sfx('hartBellow'); Audio.sfx('bossRoar', { vol: 0.6 }); shake(0.5);
    a.avatar?.play('howl'); ring(a.x, a.z, 10, 0xffe0a0, 0.9);
    a.mcd.call = 7; a.mcd.stamp = 2;
  },
  // galloping off to open the distance for a charge (see wheelAway)
  tick(a, dt) {
    if (!(a.wheel > 0)) return null;
    a.wheel -= dt;
    const T = a.wheelTo, dx = T.x - a.x, dz = T.z - a.z, d = Math.hypot(dx, dz), v = a.speed * 1.6;
    if (d > 0.8 && a.wheel > 0) { const st = Math.min(v * dt, d); a.x += (dx / d) * st; a.z += (dz / d) * st; a.rot = dampAngle(a.rot, Math.atan2(dx, dz), 9, dt); if (Math.random() < 0.5) puff(a.x, 0.3, a.z, 2, 0xa09a88, 0.7, 0.8, 0.8); return v; }
    a.wheel = 0; a.move = null; a.cd = 0.15;
    return 0;
  },
  moves: [
    { id: 'lastRun', when: (a, d) => a.phase >= 2 && d > 4, cd: 12, run(a, pl) { a.runN = 0; glowBurst(a.x, headH(a), a.z, 0xffd040, 40, 4, 0.35, 0.8); Audio.sfx('hartBellow'); return lastRun(a, pl); } },
    { id: 'herd', when: (a) => a.phase >= 1, cd: 14, run: (a, pl) => phantomHerd(a, pl) },
    { id: 'call', when: () => true, phaseCd: [16, 13, 11], run(a) {
      a.avatar?.play('howl', 1); Audio.sfx('hartBellow'); ring(a.x, a.z, 9, 0xffe0a0, 0.8);
      return { t: 0.9, fn() { callOfTheWood(a); }, after: 1.0 };
    } },
    { id: 'charge', when: (a, d) => d > 5 && d < 24, phaseCd: [8, 7, 5.5], run: (a, pl) => hartCharge(a, pl, 1.0, 22, false) },
    // too close to charge: wheel away across the glade, so the charge can come
    { id: 'wheel', when: (a, d) => d < 5 && (a.mcd.charge ?? 0) <= 0.5, cd: 5, run: (a, pl) => wheelAway(a, pl) },
    { id: 'weep', when: (a, d) => a.phase >= 1 && d < 16, cd: 9, run(a, pl) {
      a.avatar?.play('hit', 0.6); Audio.sfx('hartBellow', { vol: 0.5 });
      const hx = a.x + Math.sin(a.rot) * 1.2, hz = a.z + Math.cos(a.rot) * 1.2;
      for (let i = 0; i < 5; i++) {
        const x = pl.x + (i ? rand.range(-4, 4) : 0), z = pl.z + (i ? rand.range(-4, 4) : 0);
        if (!G.zone.map.walkable(x, z)) continue;
        const dl = 1.0 + i * 0.15;
        teleCircle(x, z, 1.8, dl, 0xffb030);
        later(dl - 0.7, inZone(a, () => amberLob(a, hx, hz, x, z, 0.7, 1.8, 0.9, 6)));
      }
      return { t: 0.6, fn() {}, after: 0.5 };
    } },
    { id: 'stamp', when: (a, d) => d < 5.2, phaseCd: [6, 5, 4], run(a, pl) {
      a.tele = teleCircle(a.x, a.z, 5, 1.0, 0xffc040);
      a.avatar?.play('attack2', 1, { hitIn: 1.0 });
      return { t: 1.0, fn() { stampFx(a, 5); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 5.2) hitHero(a, pl, 1.35, { push: 18 }); }, after: 0.7 };
    } },
    { id: 'gore', basic: true, when: (a, d) => d < 4.8, cd: 1.6, run(a, pl) {
      a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      a.tele = teleCone(a.x, a.z, a.rot, 4.8, 0.9, 0.55, 0xffc040);
      a.avatar?.play('attack', 1, { hitIn: 0.55 });
      return { t: 0.55, fn() { Audio.sfx('swingHeavy', { x: a.x, z: a.z }); if (meleeLands(a, pl, 4.8, 0.95)) hitHero(a, pl, 1.1, { push: 12 }); }, after: 0.45 };
    } }
  ]
};
// paw the ground behind a line that runs 4 m past the hero, then go: a wall or a stone dazes it, sap stops it dead
function hartCharge(a, pl, wind, sp, last) {
  const dir = angleTo(a.x, a.z, pl.x, pl.z), len = Math.min(26, Math.hypot(pl.x - a.x, pl.z - a.z) + 4);
  a.rot = dir;
  a.tele = teleLine(a.x, a.z, dir, len, 3, wind, last ? 0xffd040 : 0xffc040);
  a.avatar?.play('paw', 1.2, { loop: true }); Audio.sfx('golemStep', { x: a.x, z: a.z, vol: 0.5 });
  return { t: wind, noFace: true, stall: true, fn() {
    a.avatar?.anim.stop?.(0.1);
    startDash(a, dir, sp, len, { daze: 2.2, sapDaze: 1, dmg: 1.5, hitO: { push: 24 }, trail: last, crack: true, dust: 0xa09a88 });
    Audio.sfx('hartCharge', { x: a.x, z: a.z });
  }, after: 0.3 };
}
// away from the hero, but never out of the glade: the far side of it if the hart stands near its rim
function wheelAway(a, pl) {
  const c = arena(a), R0 = gladeR(), map = G.zone.map, away = angleTo(pl.x, pl.z, a.x, a.z);
  let T = { x: a.x + Math.sin(away) * 9, z: a.z + Math.cos(away) * 9 };
  if (Math.hypot(T.x - c.x, T.z - c.z) > R0 - 3 || !map.clear(a.x, a.z, T.x, T.z)) {
    const k = Math.min(7, R0 - 4), back = angleTo(pl.x, pl.z, c.x, c.z);
    T = map.nearestFloor(c.x + Math.sin(back) * k, c.z + Math.cos(back) * k, 4);
  }
  a.wheelTo = T; a.wheel = 1.4;
  Audio.sfx('hartBellow', { x: a.x, z: a.z, vol: 0.35 });
  // the move only holds the boss's attention; the gallop itself runs in HART.tick
  return { t: 99, noFace: true, fn() {}, after: 0 };
}
// the last run: three charges, each re-aimed, each leaving a trail of sap (a daze ends the run)
function lastRun(a, pl) {
  const m = hartCharge(a, pl, 0.7, 24, true), n = a.runN++;
  m.chain = n < 2; m.chainFn = lastRun;
  return m;
}
// four rootlings rise at the edge of the glade (and two moths from the second phase on)
function callOfTheWood(a) {
  const c = arena(a), R0 = gladeR() - 2;
  a.summons = (a.summons || []).filter((m) => !m.dead);
  const want = ['rootling', 'rootling', 'rootling', 'rootling'].concat(a.phase >= 1 ? ['amberMoth', 'amberMoth'] : []);
  for (const k of want) {
    if (a.summons.length >= 8) break;
    const ang = Math.random() * 6.28, f = G.zone.map.nearestFloor(c.x + Math.sin(ang) * R0, c.z + Math.cos(ang) * R0, 4);
    const m = spawnMonster(k, f.x, f.z, { rising: k === 'rootling', level: Math.max(1, a.level - 2) });
    m.aggro = true; G.actors.push(m); a.summons.push(m);
    puff(f.x, 0.3, f.z, 5, 0x4a3a28, 0.8, 0.8, 0.8);
  }
}
// the hart goes into mist; three phantom harts gallop across the glade; it steps out at the end of the last with a stamp
function phantomHerd(a, pl) {
  const c = arena(a), R0 = gladeR();
  a.hidden = true; a.invuln = 1e9; killTele(a.tele); a.tele = null;
  puff(a.x, 1, a.z, 24, 0xd8d4c8, 2, 2.4, 1.6); glowBurst(a.x, 1.6, a.z, 0xfff0d0, 30, 3, 0.3, 0.8);
  Audio.sfx('wraithWail', { vol: 0.6 }); Audio.sfx('hartBellow', { vol: 0.5 });
  let end = null, tEnd = 0;
  for (let i = 0; i < 3; i++) {
    const ang = Math.random() * 6.28, sx = c.x + Math.sin(ang) * R0, sz = c.z + Math.cos(ang) * R0;
    const tx = pl.x + rand.range(-2, 2), tz = pl.z + rand.range(-2, 2), dir = angleTo(sx, sz, tx, tz), len = Math.hypot(tx - sx, tz - sz) + R0 * 0.7;
    // the hart itself steps out of the last one, a few strides past where the hero stood
    end = { x: tx + Math.sin(dir) * 5, z: tz + Math.cos(dir) * 5 }; tEnd = i * 0.5 + 0.9 + len / 20;
    later(i * 0.5, inZone(a, () => { teleLine(sx, sz, dir, len, 2.8, 0.9, 0xfff0d0); later(0.9, inZone(a, () => { fire('phantomHart', a, sx, sz, dir, { y: 1.2, dmg: a.dmg * 1.2, life: len / 20 }); Audio.sfx('hartCharge', { x: sx, z: sz, vol: 0.6 }); })); }));
  }
  return { t: tEnd, noFace: true, fn() {
    const f = G.zone.map.nearestFloor(end.x, end.z, 6);
    a.x = f.x; a.z = f.z; a.hidden = false; a.rot = angleTo(a.x, a.z, G.player.x, G.player.z);
    glowBurst(a.x, 1.6, a.z, 0xfff0d0, 30, 3, 0.3, 0.8); puff(a.x, 1, a.z, 12, 0xd8d4c8, 1.6, 2, 1.2);
    a.tele = teleCircle(a.x, a.z, 4, 0.6, 0xffc040);
    a.avatar?.play('attack2', 1.6, { hitIn: 0.6 });
  }, after: 0, chain: true, chainFn: (a, pl) => ({ t: 0.6, noFace: true, fn() { stampFx(a, 4); a.invuln = 0; if (Math.hypot(pl.x - a.x, pl.z - a.z) < 4.2) hitHero(a, pl, 1.35, { push: 18 }); }, after: 0.6 }) };
}

// Amaranthe the Unfading: the Lady of the Evergreen, then the heart's prisoner, then Karthax's voice
const AMARANTHE = {
  name: 'amaranthe', phases: [0.65, 0.3], wake: 15,
  intro(a) {
    emit('bossIntro', a); say('d.amaranthe');
    Audio.sfx('bossRoar', { vol: 0.5 }); Audio.sfx('amaranthSong', { vol: 0.7 });
    a.avatar?.play('castUp', 1); ring(a.x, a.z, 6, 0xffc060, 0.8);
    a.mcd.song = 7; a.mcd.tears = 3;
  },
  onPhase(a, ph) {
    if (ph === 1) takeRoot(a);
    if (ph === 2) { say('d.amaranthe.p2'); a.queue = ['mourners']; if (a.shardLight) a.shardLight.intensity = 55; glowBurst(a.x, 2.2, a.z, 0xffa030, 40, 4, 0.35, 0.8); }
  },
  tick(a, dt, pl, d) {
    if (a.goingHome) {
      const h = arena(a), dist = Math.hypot(h.x - a.x, h.z - a.z);
      a.homeT -= dt;
      if (dist > 0.5 && a.homeT > 0) { const v = Math.min(a.speed * 1.4 * dt, dist); a.x += ((h.x - a.x) / dist) * v; a.z += ((h.z - a.z) / dist) * v; a.rot = dampAngle(a.rot, angleTo(a.x, a.z, h.x, h.z), 8, dt); return a.speed * 1.4; }
      if (dist > 0.5) { glowBurst(a.x, 1.5, a.z, 0xffc060, 20, 3, 0.3, 0.5); a.x = h.x; a.z = h.z; }
      a.goingHome = false;
      rootDown(a);
      return 0;
    }
    if (a.rooted) {
      if (a.nodes && !a.nodes.some((n) => !n.dead)) { tornFree(a); return 0; }
      if (!a.move && !a.avatar?.anim.busy) a.avatar?.play('channel', 1, { loop: true });
    }
    return null;
  },
  moves: [
    { id: 'mourners', when: () => false, cd: 1, run: (a, pl) => callMourners(a, pl) },
    { id: 'flood', when: (a, d) => a.phase >= 2 && d < 17, cd: 15, run: (a) => flood(a) },
    { id: 'song', when: (a, d) => !a.rooted && d < 13, phaseCd: [14, 14, 11], run: (a) => song(a) },
    { id: 'storm', when: (a) => a.phase >= 2, cd: 7, run: (a, pl) => storm(a, pl) },
    { id: 'lash', when: (a, d) => a.rooted && d < 6, cd: 5, run(a) {
      a.tele = teleCircle(a.x, a.z, 6, 0.8, 0xff8020); a.avatar?.play('spinOnce', 1.2);
      return { t: 0.8, fn() { ring(a.x, a.z, 6, 0xffa040, 0.5); for (let i = 0; i < 6; i++) spikes(a.x + Math.sin(i) * 4, a.z + Math.cos(i) * 4, 1, 0x5a2a18); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); const p = G.player; if (Math.hypot(p.x - a.x, p.z - a.z) < 6.2) hitHero(a, p, 1.2, { push: 34 }); }, after: 0.5 };
    } },
    { id: 'briar', when: (a, d) => !a.rooted && d > 3 && d < 15, phaseCd: [6, 5, 4], run: (a, pl) => briar(a, pl) },
    { id: 'tears', when: (a, d) => d < 18, cd: 8, run: (a, pl) => tears(a, pl) },
    { id: 'spikes', when: (a, d) => a.rooted && d < 22, cd: 3.5, run(a, pl) {
      const x = pl.x, z = pl.z; a.tele = teleCircle(x, z, 1.8, 0.9, 0xc05a20); a.avatar?.play('castUp', 1.3);
      return { t: 0.9, fn() { spikes(x, z, 1.8); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 1.8 + p.radius * 0.5) hitHero(a, p, 1.0); }, after: 0.3 };
    } },
    { id: 'combo', basic: true, when: (a, d) => !a.rooted && d < 4.4, cd: 1.5, run(a, pl) { a.combo = 0; return thornspear(a, pl); } }
  ]
};
// the shard's light follows her breast, and blazes in her last phase
function shardFollow(a) {
  const L = a.shardLight; if (!L || a.dead) return;
  if (!R.sources.has(L)) R.sources.add(L);
  const g = a.shardGlow;
  if (g) { const e = g.matrixWorld.elements; L.x = e[12]; L.y = e[13]; L.z = e[14]; g.scale.setScalar(a.shardBase * (1 + Math.sin(clock * 5) * 0.15) * (a.phase >= 2 ? 1.7 : 1)); }
}
// Thornspear: two sweeps, then a lunge along a line that carries her through
function thornspear(a, pl) {
  const step = a.combo;
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  if (step < 2) {
    a.tele = teleCone(a.x, a.z, a.rot, 4.6, 1.0, 0.5, 0xffa020);
    a.avatar?.play(step ? 'slash2' : 'slash1', 1.2);
    return { t: 0.5, fn() { Audio.sfx('swingHeavy', { x: a.x, z: a.z }); if (meleeLands(a, G.player, 4.6, 1.0)) hitHero(a, G.player, 1.0); a.combo++; }, after: 0.2, chain: Math.hypot(G.player.x - a.x, G.player.z - a.z) < 7, chainFn: thornspear };
  }
  const len = a.phase >= 2 ? 8 : 6, dir = a.rot;
  a.tele = teleLine(a.x, a.z, dir, len, 1.8, 0.5, 0xffa020);
  a.avatar?.play('heavyStab', 1.1);
  return { t: 0.5, noFace: true, fn() { startDash(a, dir, 26, len - 1, { probe: 0.6, dmg: 1.5, hitO: { push: 12 }, end() {} }); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); a.combo++; }, after: 0.5 };
}
// Briar Line: seven thorn bursts marching from her to the hero; sidestep it
function briar(a, pl) {
  const dir = angleTo(a.x, a.z, pl.x, pl.z), once = { hit: false };
  a.rot = dir; a.avatar?.play('castUp', 1.2);
  for (let i = 0; i < 7; i++) {
    const r = 1.8 + i * 1.9, x = a.x + Math.sin(dir) * r, z = a.z + Math.cos(dir) * r;
    if (!G.zone.map.walkable(x, z)) break;
    const dl = 0.5 + i * 0.12;
    teleCircle(x, z, 1.4, dl, 0xc05a20);
    later(dl, inZone(a, () => { spikes(x, z, 1.4, 0x5a2a18); const p = G.player; if (!once.hit && Math.hypot(p.x - x, p.z - z) < 1.4 + p.radius * 0.5) { once.hit = true; hitHero(a, p, 1.1, { slow: { k: 0.3, t: 1.5 } }); } }));
  }
  return { t: 0.5, noFace: true, fn() { Audio.sfx('thornWither', { x: a.x, z: a.z, vol: 0.6 }); }, after: 0.5 };
}
// Amber Tears: three drops where the hero is and where she is going; each leaves a pool
function tears(a, pl) {
  const s = pl.speed || 5, vx = (G.input?.mx || 0) * s, vz = (G.input?.mz || 0) * s, still = Math.abs(vx) + Math.abs(vz) < 0.5;
  const pts = [[pl.x, pl.z], still ? [pl.x + rand.range(-3, 3), pl.z + rand.range(-3, 3)] : [pl.x + vx * 0.7, pl.z + vz * 0.7], still ? [pl.x + rand.range(-3, 3), pl.z + rand.range(-3, 3)] : [pl.x + vx * 1.4, pl.z + vz * 1.4]];
  a.avatar?.play('castUp', 1.3);
  for (const [x, z] of pts) {
    const f = G.zone.map.walkable(x, z) ? { x, z } : G.zone.map.nearestFloor(x, z, 3);
    teleCircle(f.x, f.z, 2, 1.2, 0xffb030);
    later(0.4, inZone(a, () => amberLob(a, a.x, a.z, f.x, f.z, 0.8, 2, 0.9, 7)));
  }
  return { t: 0.5, fn() {}, after: 0.4 };
}
// Song of Sorrow: a channel, then a ring of gold rolling outward; it roots whoever it catches (a dodge goes through it)
function song(a) {
  a.avatar?.play('channel', 1, { loop: true }); Audio.sfx('amaranthSong');
  const tele = teleCircle(a.x, a.z, 3, 1.6, 0xffd060);
  for (let i = 0; i < 20; i++) later(i * 0.08, inZone(a, () => P({ x: a.x + rand.range(-1.2, 1.2), y: rand.range(0.5, 3), z: a.z + rand.range(-1.2, 1.2), vy: 1.2, life: 0.8, size: 0.14, size1: 0.02, color: 0xffe090 })));
  return { t: 1.6, noFace: true, fn() {
    killTele(tele); a.avatar?.anim.stop?.(0.1); a.avatar?.play('castUp', 1.4);
    area('wave', a.x, a.z, 14, 1.4, { team: 'foe', src: a, dmg: a.dmg * 1.3, opts: { root: 1.2 } });
    ring(a.x, a.z, 14, 0xffd060, 1.4); ring(a.x, a.z, 13.5, 0xffa030, 1.4, 0.5);
  }, after: 0.9 };
}
// the Lady takes root: back to the heart, untouchable, and four Heartroots wake to feed her
function takeRoot(a) {
  a.move = null; a.dash = null; killTele(a.tele); a.tele = null;
  a.invuln = 1e9; a.hpFloor = 0; a.lockPhase = 1; a.goingHome = true; a.homeT = 2.5;
  say('d.amaranthe.root'); Audio.sfx('amaranthSong', { vol: 0.8 });
  glowBurst(a.x, 2, a.z, 0xffc060, 30, 3, 0.3, 0.8);
}
function rootDown(a) {
  a.rooted = true; tally(a, 'rooted');
  a.avatar?.play('channel', 1, { loop: true });
  explosion(a.x, a.z, 3, 0xffb040, { smoke: 0x3a2a1a, shake: 0.5 }); Audio.sfx('hollowCrack');
  const c = arena(a), al = G.zone.L.spots?.alcoves;
  const spots = al?.length ? al : [0, 1, 2, 3].map((i) => G.zone.map.nearestFloor(c.x + Math.sin(i * 1.571) * 9, c.z + Math.cos(i * 1.571) * 9, 5));
  a.nodes = spots.slice(0, 4).map((s, i) => {
    const f = G.zone.map.nearestFloor(s.x, s.z, 4);
    const n = spawnMonster('heartroot', f.x, f.z, { level: a.level });
    n.bossNode = a; n.guards = ['hollowed', 'hollowed']; n.wakeIn = 0.6 + i * 0.35; n.sprout = false; n.aggro = true;
    G.actors.push(n);
    return n;
  });
  a.mcd.spikes = 1.5; a.mcd.lash = 2; a.mcd.tears = 3; a.cd = 1;
}
// the fourth Heartroot dies: she tears free of the heart, wounded and reeling
function tornFree(a) {
  a.rooted = false; a.nodes = null; a.lockPhase = null; a.invuln = 0;
  a.hp = Math.min(a.hp, a.hpMax * 0.29);
  explosion(a.x, a.z, 4, 0xffb040, { smoke: 0x3a2a1a, shake: 0.7 }); Audio.sfx('thornWither'); Audio.sfx('sapCrack');
  say('d.amaranthe.free'); tally(a, 'tornFree');
  daze(a, 3);
}
// two Mourners break from the cocoons nearest the hero; while either sings, the Lady is warded
function callMourners(a, pl) {
  a.avatar?.play('summon', 1.2); Audio.sfx('summon'); say('d.amaranthe.call');
  return { t: 1.0, fn() {
    const c = arena(a), al = G.zone.L.spots?.alcoves;
    const spots = (al?.length ? al.slice() : [0, 1, 2, 3].map((i) => ({ x: c.x + Math.sin(i * 1.571 + 0.78) * 10, z: c.z + Math.cos(i * 1.571 + 0.78) * 10 })))
      .sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z));
    a.mourners = spots.slice(0, 2).map((s) => {
      const f = G.zone.map.nearestFloor(s.x, s.z, 5);
      explosion(f.x, f.z, 2, 0xffb040, { smoke: 0x3a2a1a, shake: 0.2 }); emit('cocoonBurst', s);
      const m = spawnMonster('mourner', f.x, f.z, { level: Math.max(1, a.level - 1) });
      m.aggro = true; m.bondBoss = a; G.actors.push(m);
      return m;
    });
  }, after: 0.6 };
}
// Amber Storm: five drops out of the dark, each leaving a pool
function storm(a, pl) {
  a.avatar?.play('castUp', 1); Audio.sfx('amaranthSong', { vol: 0.4 });
  for (let i = 0; i < 5; i++) {
    const x = pl.x + (i ? rand.range(-5, 5) : 0), z = pl.z + (i ? rand.range(-5, 5) : 0);
    if (!G.zone.map.walkable(x, z)) continue;
    const dl = 1.3 + i * 0.27;
    teleCircle(x, z, 2.4, dl, 0xffa020);
    later(dl - 0.32, inZone(a, () => fall(x, z, 0xffb030, true)));
    later(dl, inZone(a, () => { explosion(x, z, 2.4, 0xffb040, { smoke: 0x4a3018, shake: 0.2 }); addSapPool(x, z, 2, 6); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 2.5) hitHero(a, p, 1.4); }));
  }
  return { t: 0.4, fn() {}, after: 0.3 };
}
// The Flood: amber everywhere between 7 and 16 m (the Stonewarden's pulse turned inside out); the ring stays sap
function flood(a) {
  a.tele = teleCircle(a.x, a.z, 16, 1.5, 0xffa020);
  const safe = teleCircle(a.x, a.z, 7, 1.5, 0x60c0ff);
  a.avatar?.play('castUp', 0.9); Audio.sfx('amaranthSong');
  return { t: 1.5, fn() {
    killTele(safe); ring(a.x, a.z, 16, 0xffb040, 0.8); ring(a.x, a.z, 11, 0xffa030, 0.6); glowBurst(a.x, 1, a.z, 0xffb040, 50, 9, 0.4, 0.8); shake(0.6); Audio.sfx('sapRoot');
    const p = G.player, dd = Math.hypot(p.x - a.x, p.z - a.z);
    if (dd > 7 && dd < 16.3) hitHero(a, p, 1.4);
    addSapRing(a.x, a.z, 7, 16, 6);
  }, after: 0.8 };
}

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
    if ((d < (S.wake || 13) || a.hp < a.hpMax) && G.zone.map.los(a.x, a.z, pl.x, pl.z)) { a.awake = true; a.aggro = true; a.mcd = {}; S.intro(a); a.cd = 1.5; }
    return 0;
  }
  const hpf = a.hp / a.hpMax, ph = S.phases || [S.name === 'lord' ? 0.6 : 0.5, 0.25];
  // a boss may hold a phase whatever its life says (the Lady, rooted at the heart)
  const phase = a.lockPhase ?? (hpf < ph[1] ? 2 : hpf < ph[0] ? 1 : 0);
  if (phase !== a.phase) {
    const was = a.phase;
    if (was != null && phase > was) { emit('bossPhase', a, phase); Audio.sfx('bossRoar'); shake(0.4); }
    a.phase = phase;
    if (was != null) S.onPhase?.(a, phase, was);
  }
  const fast = phase === 2 ? 1.25 : 1;
  a.mcd = a.mcd || {};
  for (const k in a.mcd) a.mcd[k] -= dt * fast;
  // knocked senseless (a stone, sap, the Lady torn from her roots): open to every blow
  if (a.dazed > 0) return dazedTick(a, dt);
  if (S.tick) { const r = S.tick(a, dt, pl, d); if (r != null) return r; }
  // a charge in progress: straight on until a wall, trampling whatever is in the way
  if (a.dash) return dashStep(a, dt, pl);
  if (a.move) {
    const m = a.move;
    // amber dust and other slows stall a wind-up (the Hart's paw)
    m.t -= dt * (m.stall && !m.fired ? windMul(a) : 1);
    if (m.leap) { const u = clamp(1 - m.t / m.t0, 0, 1); a.x = a.lx + (a.leapTo.x - a.lx) * u; a.z = a.lz + (a.leapTo.z - a.lz) * u; a.y = Math.sin(u * Math.PI) * 3; }
    else if (!a.hidden && !m.noFace) face(a, pl, dt, 3);
    if (m.t <= 0 && !m.fired) { m.fired = true; a.y = 0; killTele(a.tele); a.tele = null; m.fn(); m.t = m.after; }
    else if (m.fired && m.t <= 0) {
      const next = m.chain && (m.chainFn || comboStep)(a, pl);
      if (next) { a.move = Object.assign(next, { fired: false }); a.move.t0 = a.move.t; }
      else { a.move = null; a.cd = 0.5 / fast; }
    }
    return 0;
  }
  if (a.cd > 0) { if (d > 3.5 && !a.rooted) return seek(a, pl.x, pl.z, a.speed * fast * (S.name === 'lord' ? 0.8 : 1), dt); face(a, pl, dt, 4); return 0; }
  // a move the boss owes (the Lady's call of the Mourners on entering her last phase) comes first
  let pick = a.queue?.length ? S.moves.find((m) => m.id === a.queue[0]) : null;
  if (pick) a.queue.shift();
  else {
    const choices = S.moves.filter((m) => (a.mcd[m.id] ?? 0) <= 0 && m.when(a, d));
    // prefer the special moves when they are ready
    pick = choices.find((m) => m.id !== 'bite' && m.id !== 'combo' && !m.basic) || choices[0];
  }
  if (!pick) return a.rooted ? 0 : seek(a, pl.x, pl.z, a.speed * fast, dt);
  a.mcd[pick.id] = pick.phaseCd ? pick.phaseCd[phase] : pick.cd;
  tally(a, pick.id);
  const m = pick.run(a, pl);
  m.t0 = m.t; m.fired = false;
  a.move = m;
  return 0;
}
export { AI };
