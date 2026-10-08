// Monster, pet and boss behaviour.
import * as THREE from 'three';
import { G, later } from './state.js';
import { MONSTERS } from './data.js';
import { rebuildHash, foes, near, spawnMonster, restoreRim, spawnNpc } from './actors.js';
import { damage, tickStatus, moveMul, heroHit, seeHero, clingHero, shakeOff, rootHero, REMAINS, remainsNear, takeRemains } from './combat.js';
import { LIGHT, lightOn, lightAt, lampAt, lampNear, snuffLamp, isLamp, halveCradle, heroLightR, setHeroLight, setLightDark, addLightPool, getLightPool, shrinkPool, lightPools } from './light.js';
import { setFluePumping, startFlues, flues, fluePeriod, setFlueHeat } from './forge.js';
import { refreshStats } from './stats.js';
import { fire, area } from './projectiles.js';
import { teleCircle, teleCone, teleLine, killTele, sparks, glowBurst, explosion, ring, bolt, P, puff, decal, flash } from '../gfx/fx.js';
import { shake, addLight, removeLight, R } from '../gfx/gfx.js';
import { drape } from '../world/build.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { rand, angleTo, angleDiff, dampAngle, damp, clamp } from '../core/util.js';
import { has } from '../i18n/i18n.js';
import { sapAt, addSapPool, addSapRing, sapPools, startDrips } from './sap.js';
import { grantBuff } from './stats.js';

const ATK_SFX = { goblin: 'goblinAttack', wolf: 'wolfAttack', spider: 'spiderHiss', orc: 'orcAttack', troll: 'trollRoar', skeleton: 'skeletonRattle', wraith: 'wraithWail', hound: 'houndGrowl', bat: 'batScreech', worm: 'wormRumble', dwarf: 'dwarfAttack', golem: 'golemStep', moth: 'batScreech', bear: 'bearRoar', hart: 'hartBellow' };
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
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__act3 = { AI_LOG, damage, addSapPool, sapPools, spawnNpc, moveMul, heroHit, startDrips, grantBuff };
  window.__act4 = { AI_LOG, LIGHT, lightAt, heroLightR, addLightPool, setHeroLight, getLightPool, lightPools, seeHero, clingHero, shakeOff, REMAINS, startFlues, flues, fluePeriod, setFlueHeat, setFluePumping, spawnNpc, damage, moveMul };
}

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
      else { const av = a.avatar; if (av) { av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot; av.update(a.disguised && !a.pose ? 0 : dt, { speed: 0 }); } continue; }
    }
    tickStatus(a, dt);
    if (a.dead) continue;
    // Act IV: revealed by light, the shroud broken, a shield dropped, an immune line not repeated too often
    if (a.revealed > 0) a.revealed -= dt;
    if (a.unshroud > 0) a.unshroud -= dt;
    if (a.shroudTxt > 0) a.shroudTxt -= dt;
    if (a.immT > 0) a.immT -= dt;
    if (a.guardDown > 0 && (a.guardDown -= dt) <= 0) restoreRim(a);
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
    else if (a.status.freeze > 0 || a.status.stun > 0) { a.state = a.state === 'attack' ? 'chase' : a.state; a.interrupted = true; if (a.tele) { killTele(a.tele); a.tele = null; } }
    else if (a.pet) speed = petAI(a, dt);
    else if (a.status.fear > 0) speed = flee(a, dt, pl);
    else {
      speed = (AI[a.def.ai] || AI.melee)(a, dt, pl, d);
      // no affix from what cannot be struck yet: a rootling still underground, an archer in the trees, a Rootwarden asleep
      if (a.affixes.length && !(a.under && a.def.burst) && !a.hidden && !(a.def.ai === 'rooted' && !a.awake)) elite(a, dt, pl, d);
    }
    // knockback, separation, walls
    if (a.kx || a.kz) { a.x += a.kx * dt; a.z += a.kz * dt; const k = Math.exp(-dt * 7); a.kx *= k; a.kz *= k; if (Math.abs(a.kx) + Math.abs(a.kz) < 0.05) a.kx = a.kz = 0; }
    if (!a.airborne && !a.cling) for (const b of near(a.x, a.z, a.radius + 1)) {
      if (b === a || b.dead || b.prop || b.airborne || b.cling) continue;
      const ex = a.x - b.x, ez = a.z - b.z, l = Math.hypot(ex, ez), min = (a.radius + b.radius) * 0.9;
      if (l < min && l > 0.001) { const push = (min - l) * 0.5 * (b.boss ? 2 : 1) * (a.boss || a.def.anchored ? 0 : 1); a.x += (ex / l) * push; a.z += (ez / l) * push; }
    }
    if (a.def.ai === 'bat') { if (map.blocks(Math.floor(a.x), Math.floor(a.z))) { a.x = a.px; a.z = a.pz; } }
    else if (!a.under && !a.cling && !a.airborne && (!a.def.float || !a.boss)) map.collide(a, Math.min(a.radius, 0.9));
    // visuals
    const av = a.avatar;
    if (av) {
      av.group.position.set(a.x, a.y || 0, a.z);
      av.group.rotation.y = a.rot;
      // a Lampless's cone lies over the slopes it sweeps
      if (a.cone?.visible) drape(a.cone, G.zone.L);
      const frozen = a.status.freeze > 0 || (a.statue && !a.awake);
      av.update(frozen ? 0 : dt * (a.affixes.includes('fast') ? 1.25 : 1), { speed: speed * (frozen ? 0 : 1), runSpeed: a.speed, walkSpeed: Math.min(2.4, a.speed * 0.5), runNat: 5, float: a.def.float });
      av.setFlash(a.flash * 0.9);
      // ice, or the ash of a keeper's statue (a.statueTint)
      if (frozen) { const ash = a.statueTint && !(a.status.freeze > 0); av.setTint(ash ? a.statueTint : 0x80c8ff, ash ? a.baseTintAmt ?? 2.75 : 0.8); } else if (a.frozenTint) { av.setTint(a.baseTint ?? 0xffffff, a.baseTintAmt ?? 0); if (a.shLook) a.shLook = -1; }
      a.frozenTint = frozen;
      if (!frozen && (a.def.shroud || a.shrouded || a.shLook)) shroudLook(a, av);
    }
  }
}
// the Shrouded look smoky and dim outside light, and show a pale rim while revealed
function shroudLook(a, av) {
  const on = (a.def.shroud || a.shrouded) && !(a.unshroud > 0) && lightOn();
  const st = !on ? 0 : a.revealed > 0 || lightAt(a.x, a.z) ? 1 : 2;
  if (st === 2 && Math.random() < 0.25) P({ add: false, x: a.x + rand.range(-0.4, 0.4), y: rand.range(0.3, 1.8) * (a.scale || 1), z: a.z + rand.range(-0.4, 0.4), vy: 0.4, life: 1.1, size: 0.5, size1: 1.0, color: 0x14161c, alpha: 0.35, alpha1: 0 });
  if (st === (a.shLook ?? 0)) return;
  a.shLook = st;
  if (st === 2) { av.setTint(0x4a4e58, 1.6); av.setRim(0x7888a0, 0.3); }
  else { av.setTint(a.baseTint ?? 0xffffff, a.baseTintAmt ?? 0); if (st === 1) av.setRim(0xe0ecff, 0.7); else restoreRim(a); }
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
  // what it left about it: an ash mound, a stoker's chain and its pump, a Lampless's cone
  if (!a.tidied) { a.tidied = true; if (a.mesh) { R.scene.remove(a.mesh); a.mesh = null; } if (a.post && a.pumping) setFluePumping(a.post.flue, false); a.airborne = false; }
  if (a.cone) { if (a.cone.userData.fade) a.cone.userData.fade(Math.max(0, 1 - a.deadT)); else a.cone.visible = false; }
  const av = a.avatar; if (!av) { a.cone?.userData.dispose?.(); a.remove(); return; }
  if (a.y > 0) a.y = Math.max(0, a.y - dt * 7);
  else if (a.y < 0) a.y = Math.min(0, a.y + dt * 3);
  av.group.position.set(a.x, a.y || 0, a.z);
  av.update(a.keeper ? 0 : dt, { speed: 0, float: false });
  av.setFlash(0);
  const k = clamp((a.deadT - (a.boss ? 3 : 1.6)) / 1.2, 0, 1);
  if (k > 0) av.setDissolve(k);
  if (a.pet && a.deadT > 0.1) { glowBurst(a.x, 0.8, a.z, 0x80d0ff, 24, 3, 0.3, 0.6); a.remove(); return; }
  if (k >= 1) { a.cone?.userData.dispose?.(); a.remove(); }
}

// ---------- movement helpers ----------
function seek(a, tx, tz, sp, dt, map = G.zone.map) {
  const d = Math.hypot(tx - a.x, tz - a.z);
  // clear() follows the centre, not the body: pinned last frame on a corner the straight line clips, it takes the way
  // round for a moment
  if (a.seekT > a.t - dt * 1.5 && a.seekStep > 1e-3 && Math.hypot(a.x - a.seekX, a.z - a.seekZ) < a.seekStep * 0.2) a.detourT = 0.8;
  a.detourT = (a.detourT || 0) - dt;
  let dx, dz;
  if (d < 1.5 || (d < 22 && !(a.detourT > 0) && map.clear(a.x, a.z, tx, tz))) { dx = (tx - a.x) / (d || 1); dz = (tz - a.z) / (d || 1); }
  else {
    // the flow field leads to the hero; anything else (a mould's rim, a patrol post, a lamp) gets a small field of its own,
    // and past its reach (20 m) is felt for round what is in the way
    const toHero = Math.max(Math.abs(Math.floor(tx) - map.flowT.x), Math.abs(Math.floor(tz) - map.flowT.z)) <= 3;
    const f = toHero ? map.flowDir(a.x, a.z, dirTmp) : map.stepToward(a.path ||= {}, a.x, a.z, tx, tz, dirTmp) || skirt(a, tx, tz, map);
    if (!f) return 0; dx = f.x; dz = f.z;
  }
  const v = sp * moveMul(a);
  a.seekT = a.t; a.seekX = a.x; a.seekZ = a.z; a.seekStep = v * dt;
  a.x += dx * v * dt; a.z += dz * v * dt;
  turnTo(a, Math.atan2(dx, dz), 10, dt);
  return v;
}
// the first open way within ~125° of the target, the side it last turned to first (so it follows a wall, not dithers).
// The probe reaches past its body: collide() keeps its centre a radius off every wall, so a shorter one always looks open
function skirt(a, tx, tz, map) {
  const base = Math.atan2(tx - a.x, tz - a.z), sd = a.skirtS || 1, L = Math.min(a.radius || 0.5, 0.9) + 0.45;
  for (const o of [0, 0.5, 1, 1.5, 2.2, -0.5, -1, -1.5, -2.2]) {
    const ang = base + o * sd, px = a.x + Math.sin(ang) * L, pz = a.z + Math.cos(ang) * L;
    if (!map.walkable(px, pz) || !map.clear(a.x, a.z, px, pz)) continue;
    if (o) a.skirtS = Math.sign(o) * sd;
    dirTmp.x = Math.sin(ang); dirTmp.z = Math.cos(ang);
    return dirTmp;
  }
  return null;
}
// the Ash-Fallen turn slowly behind their shields (2.2 rad/s): roll past one and it is open
function turnTo(a, ang, k, dt) {
  const r = dampAngle(a.rot, ang, k, dt);
  if (!a.def.guard || a.guardDown > 0) { a.rot = r; return; }
  const m = 2.2 * dt; a.rot += clamp(angleDiff(a.rot, r), -m, m);
}
function flee(a, dt, pl) {
  const ang = angleTo(pl.x, pl.z, a.x, a.z), v = a.speed * 0.8 * moveMul(a);
  a.x += Math.sin(ang) * v * dt; a.z += Math.cos(ang) * v * dt; a.rot = dampAngle(a.rot, ang, 8, dt);
  return v;
}
function face(a, pl, dt, k = 12) { turnTo(a, angleTo(a.x, a.z, pl.x, pl.z), k, dt); }
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
        else if (a.bash) { killTele(a.tele); a.tele = null; Audio.sfx('shieldBlock', { x: a.x, z: a.z, pitch: 0.8 }); if (meleeLands(a, tg, 2.6, 0.95)) hitHero(a, pl, 1.0, { push: 12, target: tg }); }
        else if (meleeLands(a, tg, a.def.reach)) hitHero(a, pl, 1, { poison: a.def.poison ? a.dmg * 0.6 : 0, burn: a.def.burns ? a.dmg * 0.5 : 0, target: tg });
      }
      return 0;
    }
    if (td < a.def.reach + tg.radius + 0.1) {
      face(a, tg, dt);
      if (a.cd <= 0) {
        // the Rootsworn sweep their spear right round every third blow
        a.swings = (a.swings || 0) + 1; a.spin = !!a.def.spinEvery && a.swings % a.def.spinEvery === 0;
        // the Ash-Fallen bash with the shield every third blow
        a.bash = !a.spin && !!a.def.bashEvery && !(a.guardDown > 0) && a.swings % a.def.bashEvery === 0;
        if (a.spin) { a.tele = teleCircle(a.x, a.z, 2.5, 0.55, 0xff9030); startAttack(a, 'spinOnce'); }
        else if (a.bash) { a.tele = teleCone(a.x, a.z, a.rot, 2.6, 0.95, 0.6, 0xffa040); startAttack(a, 'Shield_Dash', { hit: 0.6, dur: 1.0, speed: 1.3 }); tally(a, 'bash'); }
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
    if (a.def.chain) return hammerhorn(a, dt, pl, d);
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
    // (a keeper's statue in Karthax's cage stands still: his tick and his Hammerfall decide what happens to it)
    if (a.keeper) return 0;
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
  // Act IV
  watch: (a, dt, pl, d) => watch(a, dt, pl, d),
  snuffer: (a, dt, pl, d) => snuffer(a, dt, pl, d),
  diver: (a, dt, pl, d) => diver(a, dt, pl, d),
  latcher: (a, dt, pl, d) => latcher(a, dt, pl, d),
  forger: (a, dt, pl, d) => forger(a, dt, pl, d),
  ivar: (a, dt, pl, d) => boss(a, dt, pl, d, IVAR),
  karthax: (a, dt, pl, d) => boss(a, dt, pl, d, KARTHAX),
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
// a thrown rock: a dark lump arcing through the air with dust streaming off it, landing on (x1, z1); it is gone if the hero leaves the zone
function lob(x0, z0, x1, z1, dur, h, color, onLand) {
  const n = Math.max(6, Math.round(dur / 0.03)), zone = G.zone;
  let i = 0;
  const step = () => {
    if (G.zone !== zone) return;
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
  if (D.drop && (D.run || 0) - (D.lastDrop ?? -9) > D.drop.every) { D.lastDrop = D.run; D.drop.fn(a.x - ux, a.z - uz); }
  if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.6) { D.hit = true; hitHero(a, pl, D.dmg ?? 1.5, D.hitO ?? { stun: 0.5 }); D.onHit?.(a, pl); shake(0.4); }
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
  if (a.pose) { a.pose = null; if (a.mesh) { R.scene.remove(a.mesh); a.mesh = null; } puff(a.x, 0.4, a.z, 12, 0x6a6660, 1.2, 1.2, 1.4); }
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
  for (const f of foes(pl.x, pl.z, 10)) { if (f.prop || f.disguised || f.keeper) continue; const dd = (f.x - a.x) ** 2 + (f.z - a.z) ** 2; if (dd < bd) { bd = dd; tg = f; } }
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
  const c = arena(a), R0 = gladeR(), hx = a.x, hz = a.z;
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
    // never out of the glade, nor behind the shut Root Gate: where the hero cannot walk to, it steps out where it went in
    const map = G.zone.map, ex = end.x - c.x, ez = end.z - c.z, el = Math.hypot(ex, ez), k = el > R0 - 2 ? (R0 - 2) / el : 1;
    let f = map.nearestFloor(c.x + ex * k, c.z + ez * k, 6);
    if (map.flowDist(f.x, f.z) === 65535 || Math.hypot(f.x - c.x, f.z - c.z) > R0) f = { x: hx, z: hz };
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
  // drawn as wide as it strikes (dashStep: her body and 0.6 m either side)
  a.tele = teleLine(a.x, a.z, dir, len, 2 * (a.radius + 0.6), 0.5, 0xffa020);
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
  // the whole reach of the wave is drawn while she sings
  const tele = teleCircle(a.x, a.z, 14, 1.6, 0xffd060);
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
    // half the life of a thorn wall's Heartroot: four of them to fell, far apart, guarded
    n.hpMax *= 0.5; n.hp = n.hpMax;
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
    // it wakes when it sees the hero, or when struck from anywhere; phase 0 is its first, so a phase it was hurt into still begins (the Lady's root)
    // (a.holdWake: the story keeps it asleep, as Karthax is until his intro is over)
    if (a.holdWake) return 0;
    if ((d < (S.wake || 13) && G.zone.map.los(a.x, a.z, pl.x, pl.z)) || a.hp < a.hpMax) { a.awake = true; a.aggro = true; a.mcd = {}; a.phase = 0; S.intro(a); a.cd = 1.5; }
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
  a.mcd[pick.id] = pick.cdOf?.(a, phase) ?? (pick.phaseCd ? pick.phaseCd[phase] : pick.cd);
  tally(a, pick.id);
  const m = pick.run(a, pl);
  m.t0 = m.t; m.fired = false;
  a.move = m;
  return 0;
}

// =====================================================================================================================
// ---------- Act IV: the Field of Ash and the Ashen Forge ----------
const inCone = (x, z, rot, range, arc, p) => Math.hypot(p.x - x, p.z - z) < range + (p.radius || 0) * 0.5 && Math.abs(angleDiff(rot, angleTo(x, z, p.x, p.z))) < arc;
function inLine(x, z, rot, len, w, p) {
  const ux = Math.sin(rot), uz = Math.cos(rot), dx = p.x - x, dz = p.z - z, u = dx * ux + dz * uz, v = dx * uz - dz * ux;
  return u > -0.5 && u < len && Math.abs(v) < w / 2 + (p.radius || 0) * 0.5;
}
const alive = (list) => (list || []).filter((m) => !m.dead && !m.removed);
const rimAt = (c, r, ang) => G.zone.map.nearestFloor(c.x + Math.sin(ang) * r, c.z + Math.cos(ang) * r, 4);
const arenaR = (r) => G.zone.L.boss?.r ?? r;
// is the hero in the boss's arena (its circle and pad metres more)? Its arena-wide moves stay there; its dark holds there,
// or near the boss wherever the fight has drifted (heroNear), not across the whole zone
const heroInArena = (a, pad = 6) => { const c = arena(a), p = G.player; return Math.hypot(p.x - c.x, p.z - c.z) < arenaR(16) + pad; };
const heroNear = (a, r = 20) => heroInArena(a) || Math.hypot(G.player.x - a.x, G.player.z - a.z) < r;
// a channel broken by a stun (updateActors skips the AI while stunned, and marks it)
const interrupted = (a) => { const i = a.interrupted; a.interrupted = false; return i || a.status.stun > 0 || a.status.freeze > 0 || a.status.fear > 0; };

// ---------- the Lampless: Arna's watch kept by the dead. A patrol loop, a pale cone, an alarm; elsewhere they just fight ----------
function watch(a, dt, pl, d) {
  if (a.patrol === undefined) { a.patrol = findPatrol(a); if (!a.patrol) a.alarmed = true; a.pauseT = rand.range(0, 1.5); a.sweep = a.rot; }
  const cone = a.cone;
  if (a.state === 'alarm') {
    a.atkT += dt;
    // a blow or a stun stops it: the alarm never sounds
    if (a.hp < a.alarmHp || interrupted(a)) { a.state = 'chase'; a.alarmed = true; cone?.userData.flash?.(0); a.avatar?.anim.stop?.(0.15); tally(a, 'alarmBroken'); return 0; }
    cone?.userData.flash?.(0.6 + 0.4 * Math.sin(a.atkT * 25));
    if (Math.random() < 0.5) P({ x: a.x + rand.range(-0.3, 0.3), y: 2.2 * (a.scale || 1), z: a.z + rand.range(-0.3, 0.3), vy: 1.2, life: 0.5, size: 0.14, size1: 0.02, color: 0xe0ecff });
    face(a, pl, dt, 5);
    if (a.atkT >= 1.0) { a.state = 'chase'; a.alarmed = true; raiseAlarm(a); }
    return 0;
  }
  if (!a.aggro && a.patrol) {
    // the hero in the cone and in sight for half a second (the cone flashes white at a quarter)
    const seen = !pl.dead && d < 8 && Math.abs(angleDiff(a.rot, angleTo(a.x, a.z, pl.x, pl.z))) < 0.7 && G.zone.map.los(a.x, a.z, pl.x, pl.z);
    a.spotT = seen ? (a.spotT || 0) + dt : Math.max(0, (a.spotT || 0) - dt);
    cone?.userData.flash?.(a.spotT >= 0.25 ? 1 : 0);
    if (seen && a.spotT >= 0.25 && !a.warned) { a.warned = true; Audio.sfx('wraithWail', { x: a.x, z: a.z, vol: 0.35 }); tally(a, 'warn'); }
    if (a.spotT <= 0) a.warned = false;
    if (a.spotT < 0.5) return patrol(a, dt);
    a.aggro = true; tally(a, 'spotted');
  }
  if (a.aggro && !a.alarmed) {
    a.state = 'alarm'; a.atkT = 0; a.alarmHp = a.hp; a.interrupted = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z);
    a.avatar?.play('Idle_Rail_Call', 1); Audio.sfx('hornCall', { x: a.x, z: a.z, vol: 0.6 }); tally(a, 'alarm');
    return 0;
  }
  // in a fight the cone dims (or, the world's, goes)
  if (cone) { if (cone.userData.fade) cone.userData.fade(a.aggro ? 0.3 : 1); else cone.visible = !a.aggro; }
  return AI.melee(a, dt, pl, d);
}
// every Lampless within 20 m comes, and the hero is Seen
function raiseAlarm(a) {
  for (const b of G.actors) if (b.def.ai === 'watch' && !b.dead && Math.hypot(b.x - a.x, b.z - a.z) < 20) { b.aggro = true; b.alarmed = true; }
  seeHero(6);
  glowBurst(a.x, 2.2 * (a.scale || 1), a.z, 0xd8e8ff, 30, 3, 0.3, 0.8); ring(a.x, a.z, 4, 0xc8d8ff, 0.6);
  Audio.sfx('hornCall', { vol: 0.9 }); emit('lamplessAlarm', a); tally(a, 'alarmRaised');
}
// the loop (L.spots.patrols) nearest its post, joined at the nearest point
function findPatrol(a) {
  const loops = G.zone.L.spots?.patrols; if (!loops?.length) return null;
  let best = null, bd = 14 * 14;
  for (const lp of loops) lp.forEach((p, i) => { const d2 = (p.x - a.x) ** 2 + (p.z - a.z) ** 2; if (d2 < bd) { bd = d2; best = lp; a.wp = i; } });
  return best;
}
// walk the loop at 2.2 m/s; at each point stand 2 s sweeping the lantern
function patrol(a, dt) {
  const pts = a.patrol;
  if (a.pauseT > 0) { a.pauseT -= dt; a.rot = a.sweep + Math.sin((2 - a.pauseT) * 2.2) * 0.6; return 0; }
  const w = pts[a.wp % pts.length];
  if (Math.hypot(w.x - a.x, w.z - a.z) < 0.7) { a.wp = (a.wp + 1) % pts.length; a.pauseT = 2; a.sweep = a.rot; return 0; }
  return seek(a, w.x, w.z, 2.2, dt);
}

// ---------- the Smoke-eater: the lamps first, while any burns within 18 m; then the hero, and the Cradle on her hip ----------
function snuffer(a, dt, pl, d) {
  if (a.gorged > 0) {
    if ((a.gorged -= dt) <= 0) ungorge(a);
    else {
      const L0 = a.gorgeLight; if (L0) { L0.x = a.x + Math.sin(a.rot) * 0.45; L0.z = a.z + Math.cos(a.rot) * 0.45; }
      if (Math.random() < 0.3) P({ x: a.x + Math.sin(a.rot) * 0.3, y: 0.9, z: a.z + Math.cos(a.rot) * 0.3, vy: 0.8, life: 0.4, size: 0.12, size1: 0.02, color: 0xffa040, color1: 0xff3000 });
    }
  }
  if (a.dash) return dashStep(a, dt, pl);
  if (a.state === 'consume') return consume(a, dt);
  const fast = a.gorged > 0 ? 1.3 : 1;
  if (a.state === 'crouch') {
    a.atkT += dt;
    if (a.atkT >= 0.7) {
      a.state = 'chase'; killTele(a.tele); a.tele = null;
      startDash(a, a.grabDir, 13, 4, { probe: 0.4, dmg: 0.9, hitO: { burn: a.gorged > 0 ? a.dmg * 0.6 : 0 }, onHit: () => { halveCradle(4); tally(a, 'grabbed'); Audio.sfx('smokeGulp', { x: a.x, z: a.z }); }, end: () => { a.avatar?.anim.stop?.(0.2); } });
    }
    return 0;
  }
  if (a.state === 'attack') { face(a, pl, dt, 6); if (attackTick(a, dt) && meleeLands(a, pl, a.def.reach)) hitHero(a, pl, 1, { burn: a.gorged > 0 ? a.dmg * 0.6 : 0 }); return 0; }
  a.lampT = (a.lampT ?? 0) - dt;
  if (a.lampT <= 0) { a.lampT = 0.5; a.lamp = lampNear(a.x, a.z, 18, true); }
  const L = a.lamp;
  if (L?.lit) {
    a.aggro = true;
    const dl = Math.hypot(L.x - a.x, L.z - a.z) || 1;
    if (dl < 1.9) {
      a.state = 'consume'; a.atkT = 0; a.hpMark = a.hp; a.interrupted = false; L.eater = a;
      a.tele = teleCircle(L.x, L.z, 1.2, 2.5, 0x9a9aa8);
      a.avatar?.play('consume', 1, { loop: true, fade: 0.35 }); Audio.sfx('smokeGulp', { x: a.x, z: a.z, vol: 0.6 }); tally(a, 'consume');
      return 0;
    }
    // no nearer for 2 s (no way through to it): it lets that lamp be for a while and comes for the hero
    if (a.lampOf !== L || dl < a.lampD - 0.25) { a.lampOf = L; a.lampD = dl; a.lampStall = 0; }
    else if ((a.lampStall += dt) > 2) { a.lamp = a.lampOf = null; a.lampT = 4; tally(a, 'lampGiveUp'); }
    // the lamp stands in its own solid cell: make for the floor beside it, on this side
    if (a.lamp) { const ap = G.zone.map.nearestFloor(L.x + ((a.x - L.x) / dl) * 1.3, L.z + ((a.z - L.z) / dl) * 1.3, 2); return seek(a, ap.x, ap.z, a.speed * fast, dt); }
  }
  if (!aggroCheck(a, pl, d)) return idle(a, dt);
  if (d < a.def.reach + pl.radius + 0.1) {
    face(a, pl, dt);
    if (a.cd <= 0) {
      a.swings = (a.swings || 0) + 1;
      // every third: a crouch, and a leap at the Cradle (on a hit its light is halved for 4 s)
      if (a.swings % 3 === 0) {
        a.state = 'crouch'; a.atkT = 0; a.grabDir = angleTo(a.x, a.z, pl.x, pl.z); a.rot = a.grabDir; a.cd = a.def.atkTime;
        a.tele = teleLine(a.x, a.z, a.grabDir, 4, 1.4, 0.7, 0xffa050);
        a.avatar?.play('attack2', 1, { hitIn: 0.7 }); tally(a, 'grab');
      } else startAttack(a, 'claw');
    }
    return 0;
  }
  return seek(a, pl.x, pl.z, a.speed * fast, dt);
}
// 2.5 s: smoke drawn out of the flame into its maw. Any blow, a stun, or the lamp going out first breaks it
function consume(a, dt) {
  const L = a.lamp;
  a.atkT += dt;
  if (!L?.lit || a.hp < a.hpMark || !a.tele || interrupted(a)) {
    a.state = 'chase'; killTele(a.tele); a.tele = null; a.avatar?.anim.stop?.(0.15); a.lampT = 1.2;
    if (L && L.eater === a) L.eater = null;
    tally(a, 'consumeBroken'); return 0;
  }
  a.rot = dampAngle(a.rot, angleTo(a.x, a.z, L.x, L.z), 8, dt);
  const mx = a.x + Math.sin(a.rot) * 0.4, mz = a.z + Math.cos(a.rot) * 0.4, sx = L.x + rand.range(-0.15, 0.15), sz = L.z + rand.range(-0.15, 0.15);
  P({ add: false, x: sx, y: 1.4, z: sz, vx: (mx - sx) / 0.6, vy: -0.8, vz: (mz - sz) / 0.6, life: 0.6, size: 0.35, size1: 0.15, color: 0x2a2624, alpha: 0.6, alpha1: 0.2 });
  if (Math.random() < 0.4) P({ x: sx, y: 1.4, z: sz, vx: (mx - sx) / 0.5, vy: -1, vz: (mz - sz) / 0.5, life: 0.5, size: 0.12, size1: 0.03, color: 0xffb050, color1: 0xff3000 });
  if (a.atkT < 2.5) return 0;
  snuffLamp(L, a); L.eater = null;
  a.state = 'chase'; a.tele = null; a.lampT = 0.3; a.avatar?.anim.stop?.(0.2);
  gorge(a); tally(a, 'ate');
  return 0;
}
// a creature's own embers flare (a Gorged throat, a tick about to leap): its emissive colour times k, plus some red
function flare(mats, k, add) { for (const m of mats || []) { m.userData.em0 ??= m.emissive.clone(); m.emissive.copy(m.userData.em0).multiplyScalar(k).add(add); } }
function unflare(mats) { for (const m of mats || []) if (m.userData.em0) m.emissive.copy(m.userData.em0); }
// Gorged for 15 s: an ember in its throat (its own small light, so it reads in the ash), 30% faster, its claws burn
function gorge(a) {
  a.gorged = 15;
  Audio.sfx('smokeGulp', { x: a.x, z: a.z });
  a.avatar?.setRim(0xff6a10, 1.1);
  flare(a.throat, 4, { r: 0.45, g: 0.12, b: 0 });
  if (a.gorgeLight) removeLight(a.gorgeLight);
  a.gorgeLight = addLight({ x: a.x, y: 1.0, z: a.z, color: 0xff6a20, intensity: 7, range: 3.2, flicker: 0.35 });
  glowBurst(a.x, 1, a.z, 0xff8030, 14, 2, 0.25, 0.5);
}
function ungorge(a) {
  a.gorged = 0; restoreRim(a);
  unflare(a.throat);
  if (a.gorgeLight) { removeLight(a.gorgeLight); a.gorgeLight = null; }
}

// ---------- the Ashwing: it wheels high over the hero (out of reach), takes the zone's one dive token every 6-8 s and comes
// down a line through her; grounded 2.5 s it can be struck (x1.25) and bites; landing in a lamp's light blinds it ----------
function diver(a, dt, pl, d) {
  if (a.fly == null) { a.fly = 'roost'; a.airborne = false; a.y = 0; a.hy = 7; }
  if (a.dash) { const D = a.dash, u = 1 - D.t / D.t0; a.y = Math.max(0, D.y0 * (1 - u / D.low)); return dashStep(a, dt, pl); }
  if (a.dazed > 0) { const v = dazedTick(a, dt); if (!(a.dazed > 0) && a.fly === 'ground') { a.dmgTaken = 1.25; a.avatar?.play('perch', 1, { loop: true, fade: 0.3 }); } return v; }
  if (a.fly === 'roost') {
    // roosting on the drake's bones until the hero comes, or something hurts it
    if (!a.perched) { a.perched = true; a.avatar?.play('perch', 1, { loop: true }); }
    if (d < 20 || a.hp < a.hpMax || a.aggro) { a.aggro = true; takeOff(a); }
    return 0;
  }
  if (a.fly === 'rise') {
    // the takeoff clip crouches with its feet planted before the wings bite
    if ((a.liftT -= dt) > 0) { a.y = 0; return 0; }
    a.y = Math.min(a.hy, a.y + dt * 4.5);
    if (a.y > 2) a.airborne = true;
    const v = fly(a, a.x + Math.sin(a.rot) * 2, a.z + Math.cos(a.rot) * 2, a.speed * 0.4, dt);
    if (a.y >= a.hy) { a.fly = 'sky'; a.diveT = a.dives ? rand.range(6, 8) : rand.range(2.5, 4); if (G.zone.diveToken === a) G.zone.diveToken = null; a.avatar?.play('glide', 1, { loop: true }); }
    return v;
  }
  if (a.fly === 'sky') {
    a.orb = (a.orb ?? angleTo(pl.x, pl.z, a.x, a.z)) + dt * (a.speed / 10) * (a.orbDir ||= rand.sign());
    a.y = damp(a.y, a.hy + Math.sin(a.t * 1.3) * 0.5, 2, dt);
    const v = fly(a, pl.x + Math.sin(a.orb) * 10, pl.z + Math.cos(a.orb) * 10, a.speed, dt);
    if ((a.diveT -= dt) <= 0 && !pl.dead) { if (takeToken(a)) diveTele(a, pl); else a.diveT = rand.range(1, 2); }
    return v;
  }
  if (a.fly === 'tele') {
    a.atkT += dt; const T = a.diveAt;
    a.x += (T.x - a.x) * Math.min(1, dt * 5); a.z += (T.z - a.z) * Math.min(1, dt * 5);
    a.y = damp(a.y, 4.5, 3, dt); a.rot = dampAngle(a.rot, T.dir, 8, dt);
    if (a.atkT < 1.0) return a.speed * 0.5;
    killTele(a.tele); a.tele = null;
    a.x = T.x; a.z = T.z; a.rot = T.dir; a.airborne = false; a.fly = 'dive'; a.dives = (a.dives || 0) + 1;
    const D = startDash(a, T.dir, 22, 14, { probe: 0.6, dmg: 1.3, hitO: { push: 22 }, end: land });
    D.t0 = D.t; D.y0 = a.y; D.low = clamp(T.reach / 14, 0.3, 0.9);
    a.avatar?.play('dive', 1, { loop: true }); Audio.sfx('ashwingScreech', { x: a.x, z: a.z, vol: 0.8 }); tally(a, 'dive');
    return 22;
  }
  if (a.fly === 'ground') {
    a.groundT -= dt;
    if (a.state === 'bite') {
      a.atkT += dt;
      if (!a.atkHit && a.atkT >= 0.5) { a.atkHit = true; killTele(a.tele); a.tele = null; Audio.sfx('wolfAttack', { x: a.x, z: a.z }); if (meleeLands(a, pl, 2.2 + pl.radius * 0.5, 0.95)) hitHero(a, pl, 1.0); }
      if (a.atkT >= 0.9) a.state = 'idle';
      return 0;
    }
    if (!a.bit && d < 2.2 + a.radius + pl.radius) {
      a.bit = true; a.state = 'bite'; a.atkT = 0; a.atkHit = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      a.tele = teleCone(a.x, a.z, a.rot, 2.2 + a.radius, 0.95, 0.5, 0xff7020); a.avatar?.play('bite', 1, { hitIn: 0.5 }); tally(a, 'bite');
      return 0;
    }
    // on the ground between bites it crouches on folded wings (its idle is a flight pose)
    if (!a.avatar?.anim.busy) a.avatar?.play('perch', 1, { loop: true, fade: 0.3 });
    face(a, pl, dt, 3);
    if (a.groundT <= 0) takeOff(a);
    return 0;
  }
  return 0;
}
function takeOff(a) {
  a.fly = 'rise'; a.dmgTaken = null; a.state = 'idle'; a.hy = rand.range(6, 8); a.liftT = 0.8;
  a.avatar?.play('takeoff', 1); Audio.sfx('ashwingScreech', { x: a.x, z: a.z, vol: 0.5 });
  puff(a.x, 0.3, a.z, 10, 0x5a5650, 1.4, 1.6, 1);
}
// one dive at a time in a zone
function takeToken(a) {
  const Z = G.zone, h = Z.diveToken;
  if (h && h !== a && !h.dead && !h.removed && (h.fly === 'tele' || h.fly === 'dive' || h.fly === 'ground')) return false;
  Z.diveToken = a; return true;
}
// the line starts where it can come down (a walkable point on the way to the hero) and runs 14 m on through her
function diveTele(a, pl) {
  const map = G.zone.map, dir = angleTo(a.x, a.z, pl.x, pl.z);
  let sx = a.x, sz = a.z;
  for (let k = 0; k < 12 && !map.walkable(sx, sz); k++) { sx += Math.sin(dir); sz += Math.cos(dir); }
  if (!map.walkable(sx, sz) || Math.hypot(pl.x - sx, pl.z - sz) < 3) { const f = map.nearestFloor(pl.x - Math.sin(dir) * 9, pl.z - Math.cos(dir) * 9, 6); sx = f.x; sz = f.z; }
  const d2 = angleTo(sx, sz, pl.x, pl.z);
  a.diveAt = { x: sx, z: sz, dir: d2, reach: Math.hypot(pl.x - sx, pl.z - sz) };
  a.fly = 'tele'; a.atkT = 0;
  a.tele = teleLine(sx, sz, d2, 14, 2.4, 1.0, 0xff7020);
  a.avatar?.play('glide', 1, { loop: true }); Audio.sfx('ashwingScreech', { x: a.x, z: a.z }); tally(a, 'diveTele');
}
function land(a, D) {
  a.y = 0; a.fly = 'ground'; a.groundT = 2.5; a.dmgTaken = 1.25; a.bit = false; a.state = 'idle';
  explosion(a.x, a.z, 2, 0x8a8070, { smoke: 0x4a4440, shake: 0.35 }); Audio.sfx('slam', { x: a.x, z: a.z });
  a.avatar?.anim.stop?.(0.1); a.avatar?.play('land', 1);
  tally(a, D.wall ? 'landWall' : 'land');
  // a lamp's light where it lands blinds it
  if (lampAt(a.x, a.z)) { tally(a, 'blinded'); daze(a, 2); }
}

// ---------- the Ember Tick: out of the ash, a crouch (0.6 s, its belly glowing) and a leap; on the hero it clings (combat.js) ----------
function latcher(a, dt, pl, d) {
  if (a.cling) {
    const c = pl.cling || [], i = Math.max(0, c.indexOf(a)), b = pl.rot + Math.PI + (i ? 0.45 : -0.45);
    a.x = pl.x + Math.sin(b) * 0.28; a.z = pl.z + Math.cos(b) * 0.28; a.y = 0.95 + i * 0.25; a.rot = pl.rot + Math.PI;
    if (Math.random() < 0.2) P({ x: a.x, y: a.y + 0.1, z: a.z, vy: 0.6, life: 0.4, size: 0.1, size1: 0.02, color: 0xffa040, color1: 0xff3000 });
    return 0;
  }
  // a brood in its nest waits under the ash; summoned ones come up at once
  if (a.buried === undefined) { a.buried = a.packId != null && !(a.rising > 0); if (a.buried) { a.under = true; a.y = -0.4; } }
  if (a.under) {
    if (a.avatar) a.avatar.group.visible = false;
    if (d < 9 || a.aggro) surface(a);
    return 0;
  }
  if (a.state === 'crouch') {
    a.atkT += dt;
    if (Math.random() < 0.5) P({ x: a.x, y: 0.3, z: a.z, vy: 0.5, life: 0.3, size: 0.2, size1: 0.05, color: 0xffc060, color1: 0xff3000 });
    if (a.atkT < 0.6) return 0;
    killTele(a.tele); a.tele = null; a.state = 'leap'; a.atkT = 0; a.lx = a.x; a.lz = a.z; a.leapHit = false; unflare(a.embers);
    Audio.sfx('spiderHiss', { x: a.x, z: a.z, vol: 0.6 });
  }
  if (a.state === 'leap') {
    a.atkT += dt;
    const u = Math.min(1, a.atkT / 0.38), nx = a.lx + Math.sin(a.leapDir) * 5 * u, nz = a.lz + Math.cos(a.leapDir) * 5 * u;
    if (G.zone.map.walkable(nx, nz)) { a.x = nx; a.z = nz; }
    a.y = Math.sin(u * Math.PI) * 0.9;
    if (!a.leapHit && !pl.dead && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.4) {
      a.leapHit = true;
      if (clingHero(a)) { tally(a, 'cling'); restoreRim(a); return 0; }
      hitHero(a, pl, 0.8, { burn: a.dmg * 0.3 });
    }
    if (u >= 1) { a.y = 0; a.state = 'chase'; a.cd = 0.5; restoreRim(a); }
    return 13;
  }
  if (!aggroCheck(a, pl, d)) return idle(a, dt);
  a.leapCd = (a.leapCd ?? rand.range(0.4, 1.4)) - dt;
  if (a.state !== 'attack' && d > 1.8 && d < 5.2 && a.leapCd <= 0 && (pl.cling?.length || 0) < 2 && G.zone.map.clear(a.x, a.z, pl.x, pl.z)) {
    a.leapCd = rand.range(2.8, 3.6); a.state = 'crouch'; a.atkT = 0; a.leapDir = angleTo(a.x, a.z, pl.x, pl.z); a.rot = a.leapDir;
    a.tele = teleLine(a.x, a.z, a.leapDir, 5, 1, 0.6, 0xff7020);
    a.avatar?.play('leap', 1, { hitIn: 0.6 }); a.avatar?.setRim(0xffb040, 2.4); tally(a, 'crouch');
    // its belly and seams brighten as it gathers (creatures.js drives emissiveIntensity, so the colour is raised)
    a.embers ??= (a.avatar?.model.mats || []).filter((m) => m.emissive && m.emissiveMap);
    flare(a.embers, 3, { r: 0.35, g: 0.12, b: 0 });
    return 0;
  }
  return AI.melee(a, dt, pl, d);
}
function surface(a) {
  a.under = false; a.buried = false; a.aggro = true; a.y = 0; a.rising = 0.8;
  if (a.avatar) { a.avatar.group.visible = true; a.avatar.play('spawn', 1); }
  puff(a.x, 0.2, a.z, 8, 0x5a5650, 0.8, 0.8, 1); sparks(a.x, 0.2, a.z, 8, 0xff8030, 3);
  tally(a, 'surface');
  // the brood comes up together
  for (const b of G.actors) if (b !== a && b.under && b.def.ai === 'latcher' && a.packId != null && b.packId === a.packId) b.aggro = true;
}

// ---------- the Ashsmith: keeps 6-9 m off and throws hot rivets; mends what falls near it (the remains: a 2.2 s kneel, broken
// by a tenth of its life or a stun; three times at most); by a casting pit it raises one of the Ash-Fallen (8 s) ----------
function forger(a, dt, pl, d) {
  if (!aggroCheck(a, pl, d)) return idle(a, dt);
  if (a.state === 'mend') return mendTick(a, dt);
  if (a.state === 'attack') {
    face(a, pl, dt, 8);
    if (attackTick(a, dt)) { fire('ember', a, a.x + Math.sin(a.rot) * 0.5, a.z + Math.cos(a.rot) * 0.5, angleTo(a.x, a.z, pl.x, pl.z) + rand.range(-0.05, 0.05), { y: 1.5, dmg: a.dmg * 1.1, opts: { burn: a.dmg * 0.3 } }); Audio.sfx('swing', { x: a.x, z: a.z, vol: 0.5 }); tally(a, 'rivet'); }
    return 0;
  }
  a.lookT = (a.lookT ?? 0) - dt;
  if (a.lookT <= 0) {
    a.lookT = 0.5;
    if (!a.mendQ || !REMAINS.includes(a.mendQ)) a.mendQ = (a.reforges || 0) < 3 ? remainsNear(a.x, a.z, 14, a) : null;
    if (a.mendQ) a.mendQ.claimed = a;
  }
  const q = a.mendQ;
  if (q) {
    if (Math.hypot(q.x - a.x, q.z - a.z) < 1.5) { startMend(a, 'reforge', q, 2.2); return 0; }
    return seek(a, q.x, q.z, a.speed, dt);
  }
  const M = G.zone.L.spots?.moulds;
  if (a.mouldSkip && (a.mouldSkipT -= dt) <= 0) a.mouldSkip = null;
  if (M?.length && (a.mouldCd = (a.mouldCd ?? 3) - dt) <= 0) {
    const m = M.find((p) => p !== a.mouldSkip && !(p.busy && !p.busy.dead && p.busy.state === 'mend') && Math.hypot(p.x - a.x, p.z - a.z) < 8);
    // no nearer for 3 s (a gap too narrow for its body): it lets that mould be for 20 s and fights
    if (m && (a.mouldOf !== m || Math.hypot(m.x - a.x, m.z - a.z) < a.mouldD - 0.25)) { a.mouldOf = m; a.mouldD = Math.hypot(m.x - a.x, m.z - a.z); a.mouldStall = 0; }
    else if (m && (a.mouldStall += dt) > 3) { a.mouldSkip = m; a.mouldSkipT = 20; a.mouldOf = null; tally(a, 'mouldGiveUp'); }
    if (m && m !== a.mouldSkip) {
      // the mould is a pit: make for its rim, on this side, and kneel there (a carved cell's corner reaches m.r + 0.71, and
      // the smith's body keeps its radius off it)
      const dm = Math.hypot(m.x - a.x, m.z - a.z) || 1, ar = Math.min(a.radius || 0.5, 0.9);
      const f = G.zone.map.nearestFloor(m.x + ((a.x - m.x) / dm) * (m.r + 0.6), m.z + ((a.z - m.z) / dm) * (m.r + 0.6), 2);
      if (dm < m.r + 0.8 + ar || Math.hypot(f.x - a.x, f.z - a.z) < ar + 0.4) { m.busy = a; startMend(a, 'mould', m, 8); return 0; }
      return seek(a, f.x, f.z, a.speed, dt);
    }
  }
  const los = G.zone.map.los(a.x, a.z, pl.x, pl.z);
  if (d < 6 && los) { const ang = angleTo(pl.x, pl.z, a.x, a.z), nx = a.x + Math.sin(ang) * 3, nz = a.z + Math.cos(ang) * 3; if (G.zone.map.walkable(nx, nz)) return seek(a, nx, nz, a.speed * 0.85, dt); }
  if (d < a.def.reach && los) { face(a, pl, dt); if (a.cd <= 0) startAttack(a, 'throw', { hit: 0.55, dur: 1.0 }); return 0; }
  return seek(a, pl.x, pl.z, a.speed, dt);
}
function startMend(a, kind, at, dur) {
  a.state = 'mend'; a.mendKind = kind; a.mendAt = at; a.mendT = 0; a.mendDur = dur; a.mendHp = a.hp; a.interrupted = false;
  a.rot = angleTo(a.x, a.z, at.x, at.z);
  a.tele = teleCircle(at.x, at.z, 2.0, dur, 0xff8030);
  a.avatar?.play('kneel', 1, { loop: true }); tally(a, kind);
}
function mendTick(a, dt) {
  const T = a.mendAt;
  a.mendT += dt;
  if (a.mendHp - a.hp >= a.hpMax * 0.1 || interrupted(a) || !a.tele || (a.mendKind === 'reforge' && !REMAINS.includes(T))) { endMend(a); tally(a, a.mendKind + 'Broken'); return 0; }
  if (Math.random() < 0.5) sparks(T.x, 0.4, T.z, 3, 0xffc060, 3);
  a.clangT = (a.clangT ?? 0) - dt;
  if (a.clangT <= 0) { a.clangT = 0.55; Audio.sfx('anvil', { x: a.x, z: a.z, vol: 0.4 }); }
  if (a.mendT < a.mendDur) return 0;
  if (a.mendKind === 'reforge') reforge(a, T);
  else { const f = G.zone.map.nearestFloor(T.x, T.z, 3), m = spawnMonster(Math.random() < 0.6 ? 'ashSpear' : 'ashDwarf', f.x, f.z, { rising: true }); m.aggro = true; G.actors.push(m); explosion(f.x, f.z, 1.8, 0xff7a20, { smoke: 0x2a2220, shake: 0.2 }); tally(a, 'cast'); }
  endMend(a);
  return 0;
}
function endMend(a) {
  a.state = 'chase'; killTele(a.tele); a.tele = null; a.avatar?.anim.stop?.(0.2);
  if (a.mendKind === 'mould') { a.mouldCd = 25; if (a.mendAt.busy === a) a.mendAt.busy = null; }
  if (a.mendQ?.claimed === a) a.mendQ.claimed = null;
  a.mendQ = null; a.cd = Math.max(a.cd, 0.6);
}
// the fallen rise again from the slag: the same kind, +40% life, armoured and iron-grey, and never reforged twice
function reforge(a, q) {
  takeRemains(q);
  a.reforges = (a.reforges || 0) + 1;
  const f = G.zone.map.nearestFloor(q.x, q.z, 3), m = spawnMonster(q.kind, f.x, f.z, { rising: true, level: q.level });
  m.hpMax *= 1.4; m.hp = m.hpMax; m.armored = true; m.reforged = true; m.aggro = true; m.alarmed = true; m.patrol = null;
  if (!m.affixes.includes('armored')) m.affixes = m.affixes.concat('armored');
  m.baseTint = 0x7a8088; m.baseTintAmt = 0.5; m.avatar?.setTint(0x7a8088, 0.5); m.avatar?.setRim(0xffa050, 0.8);
  G.actors.push(m);
  explosion(f.x, f.z, 1.6, 0xff8030, { smoke: 0x2a2220, shake: 0.15 }); sparks(f.x, 1, f.z, 20, 0xffd080, 5); Audio.sfx('anvil', { x: f.x, z: f.z });
  tally(a, 'reforged'); emit('reforged', m, a);
}

// ---------- the Hammerhorn: chained to its station's post (9 m) it pumps the bellows while left alone (that flue breathes every
// 5 s); roused, it smashes and rushes, and a rush that runs out of chain yanks it off its feet (dazed 2.5 s, x1.5);
// at 40% it tears free and fights on as a charger ----------
function hammerhorn(a, dt, pl, d) {
  const P0 = a.free ? null : a.post;
  if (P0) chainTick(a);
  if (a.dash) return dashStep(a, dt, pl);
  if (a.dazed > 0) return dazedTick(a, dt);
  if (P0 && a.aggro && a.hp < a.hpMax * 0.4) return tearFree(a);
  if (!a.aggro && !aggroCheck(a, pl, d)) {
    if (!P0) return idle(a, dt);
    const h = a.home;
    if (Math.hypot(h.x - a.x, h.z - a.z) > 0.8) { pump(a, false); return seek(a, h.x, h.z, a.speed * 0.5, dt); }
    pump(a, true);
    a.rot = dampAngle(a.rot, angleTo(a.x, a.z, P0.x, P0.z), 4, dt);
    if ((a.creakT = (a.creakT ?? 0) - dt) <= 0) { a.creakT = 2.6; Audio.sfx('chainRattle', { x: a.x, z: a.z, vol: 0.3 }); }
    return 0;
  }
  pump(a, false);
  if (a.state === 'wind') {
    a.atkT += dt;
    if (a.atkT >= a.windT) { a.state = 'attack'; a.atkT = 0; a.atkHit = false; a.atkHitT = 0.3; a.atkDur = 0.85; a.avatar?.play(a.over ? 'slam' : 'smash', 1.4); }
    return 0;
  }
  if (a.state === 'attack') {
    if (attackTick(a, dt)) {
      killTele(a.tele); a.tele = null; shake(0.35); Audio.sfx('slam', { x: a.x, z: a.z });
      if (a.over) { const o = a.overAt; explosion(o.x, o.z, 2.6, 0xb08060, { smoke: 0x3a3028, shake: 0.4 }); if (Math.hypot(pl.x - o.x, pl.z - o.z) < 2.6 + pl.radius * 0.5) hitHero(a, pl, 1.4); }
      else { puff(a.x + Math.sin(a.rot) * 2, 0.3, a.z + Math.cos(a.rot) * 2, 6, 0x4a4038, 1, 1); if (meleeLands(a, pl, a.def.reach + 0.6, 0.95)) hitHero(a, pl, 1.15); }
    }
    return 0;
  }
  if (a.state === 'rear') {
    a.atkT += dt;
    if (a.atkT >= 0.9) {
      killTele(a.tele); a.tele = null; a.state = 'chase';
      startDash(a, a.rushDir, 15, a.rushLen, { dmg: 1.3, hitO: { push: 20 }, dust: 0x4a4038, daze: 2, yank: a.rushYank, end: rushEnd });
      a.avatar?.play('Shield_Dash', 1.3); Audio.sfx('bearCharge', { x: a.x, z: a.z }); if (P0) Audio.sfx('chainRattle', { x: a.x, z: a.z }); tally(a, 'rush');
    }
    return 0;
  }
  a.rushCd = (a.rushCd ?? rand.range(1, 3)) - dt;
  if (d > 4 && d < 14 && a.rushCd <= 0 && G.zone.map.clear(a.x, a.z, pl.x, pl.z)) {
    const dir = angleTo(a.x, a.z, pl.x, pl.z);
    let len = Math.min(d + 3, a.free ? 18 : 16), yank = false;
    // drawn only as far as the chain reaches: past it, the chain throws it down
    if (P0) { const lim = chainReach(a, P0, dir); if (lim < len) { len = Math.max(0.5, lim); yank = true; } }
    a.state = 'rear'; a.atkT = 0; a.rushDir = dir; a.rot = dir; a.rushLen = len; a.rushYank = yank; a.rushCd = rand.range(5, 7);
    a.tele = teleLine(a.x, a.z, dir, len, 2.6, 0.9, 0xff8020);
    a.avatar?.play('warcry', 1.2); Audio.sfx('trollRoar', { x: a.x, z: a.z, vol: 0.6 });
    return 0;
  }
  if (d < a.def.reach + pl.radius + 0.3) {
    face(a, pl, dt, 5);
    if (a.cd <= 0) {
      a.slams = (a.slams || 0) + 1; a.over = a.slams % 2 === 0; a.state = 'wind'; a.atkT = 0; a.cd = a.def.atkTime;
      // the overhead smash: a 2.6 m circle in front of it, 1.0 s
      if (a.over) { a.windT = 0.7; a.overAt = { x: a.x + Math.sin(a.rot) * 1.8, z: a.z + Math.cos(a.rot) * 1.8 }; a.tele = teleCircle(a.overAt.x, a.overAt.z, 2.6, 1.0, 0xff6020); }
      else { a.windT = 0.75; a.tele = teleCone(a.x, a.z, a.rot, a.def.reach + 0.8, 0.95, a.windT + 0.3); }
      a.avatar?.play('taunt', 1.4); tally(a, a.over ? 'overhead' : 'smash');
    }
    return 0;
  }
  const v = seek(a, pl.x, pl.z, a.speed, dt);
  if (P0) clampChain(a, P0);
  return v;
}
function pump(a, on) {
  if (!!a.pumping === on || !a.post) return;
  a.pumping = on; setFluePumping(a.post.flue, on);
  if (on) { a.avatar?.play('hammer', 1, { loop: true }); tally(a, 'pump'); } else a.avatar?.anim.stop?.(0.2);
}
// how far it can run along dir before the chain is taut
function chainReach(a, P0, dir) {
  const ux = Math.sin(dir), uz = Math.cos(dir), wx = a.x - P0.x, wz = a.z - P0.z, b = wx * ux + wz * uz, c = wx * wx + wz * wz - a.chainLen * a.chainLen, q = b * b - c;
  return q < 0 ? 0 : -b + Math.sqrt(q);
}
function clampChain(a, P0) {
  const dx = a.x - P0.x, dz = a.z - P0.z, l = Math.hypot(dx, dz);
  if (l > a.chainLen) { a.x = P0.x + (dx / l) * a.chainLen; a.z = P0.z + (dz / l) * a.chainLen; }
}
function rushEnd(a, D) {
  if (D.yank && !D.wall) {
    daze(a, 2.5); a.avatar?.play('Hit_Knockback', 1, { hold: true });
    Audio.sfx('chainRattle', { x: a.x, z: a.z }); sparks(a.post.x, 0.5, a.post.z, 12, 0xffe0b0, 4);
    tally(a, 'yanked'); return;
  }
  chargeEnd(a, D);
}
function tearFree(a) {
  a.free = true; pump(a, false);
  if (a.mesh) { R.scene.remove(a.mesh); a.mesh = null; }
  a.speed *= 1.25; a.rising = 1.4; a.state = 'chase'; killTele(a.tele); a.tele = null;
  a.avatar?.play('warcry', 1); Audio.sfx('chainSnap', { x: a.x, z: a.z }); Audio.sfx('trollRoar', { x: a.x, z: a.z });
  sparks(a.x, 1, a.z, 30, 0xd0c8c0, 7, { color1: 0x6a6460 }); shake(0.4);
  emit('chainSnap', a); tally(a, 'tornFree');
  return 0;
}
// the chain from the post to its waist: links sagging with the slack, every other one turned
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cr = new THREE.Quaternion(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(), _cz = new THREE.Vector3(0, 0, 1), _ct = new THREE.Vector3();
function chainTick(a) {
  const M = a.mesh; if (!M?.isInstancedMesh) return;
  const P0 = a.post, n = a.chainN, hy = 0.95 * (a.scale || 1), py = 0.35, dist = Math.hypot(a.x - P0.x, a.z - P0.z);
  const sag = Math.max(0.15, (a.chainLen - dist) * 0.3), at = (u, o) => o.set(P0.x + (a.x - P0.x) * u, Math.max(0.05, py + (hy - py) * u - sag * 4 * u * (1 - u)), P0.z + (a.z - P0.z) * u);
  _cs.setScalar(clamp(Math.max(dist, 1) / n / 0.2, 1, 1.6));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    at(u, _cp); at(Math.min(1, u + 0.02), _ct); _ct.sub(_cp).normalize();
    _cq.setFromUnitVectors(_cz, _ct); _cr.setFromAxisAngle(_cz, i % 2 ? Math.PI / 2 : 0); _cq.multiply(_cr);
    M.setMatrixAt(i, _cm.compose(_cp, _cq, _cs));
  }
  M.instanceMatrix.needsUpdate = true;
}

// ---------- Act IV bosses ----------
// Ivar, Keeper of the Last Lamp: Isarn's father, captain of the Lampless at the Anvil Gate
const braziers = (a) => { const c = arena(a), r = arenaR(14) + 6; return (G.zone.interact || []).filter((it) => it.kind === 'brazier' && Math.hypot(it.x - c.x, it.z - c.z) < r); };
const IVAR = {
  name: 'ivar', phases: [0.6, 0.3], wake: 13,
  intro(a) {
    emit('bossIntro', a); say('d.ivar');
    Audio.sfx('hornCall'); Audio.sfx('bossRoar', { vol: 0.5 });
    a.avatar?.play('castUp', 1); ring(a.x, a.z, 6, 0xc8d8ff, 0.8);
    a.mcd.call = 7; a.mcd.road = 4; a.mcd.sweep = 3;
    a.endDark = () => ivarEndDark(a);
  },
  onPhase(a, ph) {
    if (ph === 1) ivarDark(a);
    if (ph === 2) ivarRemember(a);
  },
  tick(a, dt) {
    // his dark and his son's light hold for as long as he does (a hero back from the waypoint finds them again); the dark
    // is the fight's, not the whole field's
    if (a.dark) setHeroLight(heroNear(a) ? 2.5 : null, a);
    else if (a.phase === 2 && !getLightPool('ivarGold')) { a.dark = true; ivarEndDark(a); }
    // the dark: three braziers lit at once blind him (dazed 4 s), and his shroud stays broken (8 s at least) while all three burn
    if (a.dark) {
      const lit = braziers(a).filter((b) => b.lit).length;
      if (lit >= 3) a.unshroud = Math.max(a.unshroud || 0, 0.5);
      if (lit >= 3 && !a.allLit) { a.allLit = true; a.unshroud = 8; daze(a, 4); say('d.ivar.blind'); emit('ivarBlinded', a); tally(a, 'blinded'); return 0; }
      if (lit < 3) a.allLit = false;
    }
    if (a.phase === 2) {
      // at 25, 18 and 10% the boy calls out and his father falters (dazed 2 s); not in an echo
      const F = [0.25, 0.18, 0.1];
      if (!a.echo && a.falters < 3 && a.hp < a.hpMax * F[a.falters]) { const n = a.falters++; emit('ivarFalter', a, n); daze(a, 2); tally(a, 'falter'); return 0; }
    }
    return null;
  },
  moves: [
    { id: 'nova', when: (a, d) => a.phase >= 2 && d < 9, cd: 12, run: (a, pl) => lanternNova(a, pl) },
    { id: 'step', when: (a, d) => a.phase >= 1 && d > 5 && d < 16, cd: 9, run: (a, pl) => darkStep(a, pl) },
    // no Lampless called in the dark (the Smoke-eaters are its pressure on the braziers)
    { id: 'call', when: (a) => a.phase < 2 && !a.dark && alive(a.summons).length < 3, cd: 18, run: (a) => callLampless(a) },
    { id: 'eaters', when: (a) => a.dark && alive(a.eaters).length < 2 && braziers(a).length > 0, cd: 30, run: (a) => callEater(a) },
    { id: 'lanterns', when: (a, d) => a.phase >= 1 && d < 16, cd: 11, run: (a, pl) => deadLanterns(a, pl) },
    { id: 'road', when: (a, d) => d > 4 && d < 18, phaseCd: [9, 9, 8], run: (a, pl) => { a.roadN = 0; return longRoad(a, pl); } },
    { id: 'sweep', when: (a, d) => d < 10, phaseCd: [8, 7, 8], run: (a, pl) => lanternSweep(a, pl) },
    { id: 'staff', basic: true, when: (a, d) => d < 4.6, cd: 1.6, run(a, pl) { a.combo = 0; return staffCombo(a, pl); } }
  ]
};
// phase 2, The Dark: the braziers go out, the Cradle shrinks to 2.5 m, and he is Shrouded
function ivarDark(a) {
  a.dark = true; a.shrouded = true; a.hpFloor = a.hpMax * 0.299;
  setHeroLight(2.5, a);
  for (const b of braziers(a)) snuffLamp(b, a);
  glowBurst(a.x, 2, a.z, 0x8a98b0, 40, 4, 0.35, 0.8); Audio.sfx('wraithWail', { vol: 0.8 });
  say('d.ivar.dark'); emit('ivarDark', a); tally(a, 'dark');
  a.mcd.eaters = 5; a.mcd.step = 3; a.mcd.lanterns = 6;
}
// phase 3, Remembering: Isarn comes (the story); his lantern ends the dark
function ivarRemember(a) {
  a.hpFloor = 0; a.falters = 0;
  // Isarn ends the dark (the story calls a.endDark()); if he never comes, or in an echo (the Last Lamp's light), it ends itself
  later(a.echo ? 0.6 : 9, inZone(a, () => a.endDark?.()));
  emit('ivarRemember', a); tally(a, 'remember');
}
function ivarEndDark(a) {
  if (!a.dark) return;
  a.dark = false; a.shrouded = false;
  // ended while the hero is in another zone (Isarn's run arrives after she left): the gold light is lit when she is back
  if (!G.actors.includes(a)) return;
  setHeroLight(null);
  const c = a.echo && G.zone.L.spots?.lastLamp ? G.zone.L.spots.lastLamp : arena(a);
  addLightPool(c.x, c.z, arenaR(14) + 2, Infinity, 'ivarGold', { owner: a, color: 0xffd080, intensity: 26 });
  ring(c.x, c.z, 8, 0xffd080, 1.2); glowBurst(c.x, 2, c.z, 0xffd080, 50, 5, 0.35, 1);
  emit('ivarLight', a); tally(a, 'light');
}
// Staff Combo: two strikes in a 4.5 m cone, the second throws her back
function staffCombo(a, pl) {
  const step = a.combo;
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.tele = teleCone(a.x, a.z, a.rot, 4.5, 1.0, 0.6, 0x9ab8ff);
  a.avatar?.play(step ? 'chop' : 'slash1', 1.1, { hitIn: 0.6 });
  return { t: 0.6, fn() { Audio.sfx('swingHeavy', { x: a.x, z: a.z }); if (meleeLands(a, G.player, 4.5, 1.0)) hitHero(a, G.player, 1.0, step ? { push: 16 } : {}); a.combo++; }, after: 0.2, chain: step === 0 && Math.hypot(G.player.x - a.x, G.player.z - a.z) < 7, chainFn: staffCombo };
}
// Lantern Sweep: the dead lantern raised, a pale 10 m cone; she is Seen, and in the dark it puts out the braziers it finds
function lanternSweep(a, pl) {
  const rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.rot = rot;
  a.tele = teleCone(a.x, a.z, rot, 10, 1.1, 1.0, 0xb8d0ff);
  a.avatar?.play('castUp', 1, { hitIn: 1.0 }); Audio.sfx('wraithWail', { x: a.x, z: a.z, vol: 0.4 });
  return { t: 1.0, noFace: true, fn() {
    for (let i = 0; i < 30; i++) { const ang = rot + rand.range(-1.1, 1.1), sp = rand.range(6, 12); P({ x: a.x, y: 1.8, z: a.z, vx: Math.sin(ang) * sp, vy: rand.range(-0.5, 0.5), vz: Math.cos(ang) * sp, life: 0.7, size: 0.4, size1: 0.05, color: 0xe0ecff, color1: 0x6a88c0, drag: 1.5 }); }
    const p = G.player; if (inCone(a.x, a.z, rot, 10, 1.1, p)) hitHero(a, p, 1.0, { seen: 6 });
    if (a.dark) for (const b of braziers(a)) if (b.lit && inCone(a.x, a.z, rot, 10.5, 1.1, b)) { snuffLamp(b, a); tally(a, 'sweepSnuff'); }
  }, after: 0.5 };
}
// The Long Road: a 16 m line, then a dash that throws her down and leaves ash that slows (twice in a row when he remembers)
function longRoad(a, pl) {
  const dir = angleTo(a.x, a.z, pl.x, pl.z), len = Math.min(16, Math.hypot(pl.x - a.x, pl.z - a.z) + 4), n = a.roadN++;
  a.rot = dir;
  a.tele = teleLine(a.x, a.z, dir, len, 2.6, 0.9, 0x9ab8ff);
  a.avatar?.play('block', 1); Audio.sfx('hornCall', { x: a.x, z: a.z, vol: 0.6, pitch: 0.8 });
  return { t: 0.9, noFace: true, fn() {
    a.avatar?.play('Shield_Dash', 1.3);
    startDash(a, dir, 24, len, { probe: 0.6, dmg: 1.4, hitO: { push: 24 }, end() { a.avatar?.anim.stop?.(0.2); }, drop: { every: 2.4, fn: (x, z) => area('ash', x, z, 1.4, 3, { team: 'foe', src: a }) } });
    Audio.sfx('swingHeavy', { x: a.x, z: a.z });
  }, after: 0.35, chain: a.phase >= 2 && n < 1, chainFn: longRoad };
}
// Call the Lampless: three rise at the rim, already alert
function callLampless(a) {
  a.avatar?.play('summon', 1); Audio.sfx('hornCall'); Audio.sfx('summon', { vol: 0.6 });
  const c = arena(a), r = arenaR(14) - 1.5, a0 = rand.range(0, 6.28), pts = [0, 1, 2].map((i) => rimAt(c, r, a0 + i * 2.094));
  for (const p of pts) { glowBurst(p.x, 0.3, p.z, 0xc8d0e0, 16, 1.5, 0.3, 1.2); puff(p.x, 0.3, p.z, 8, 0x6a6c74, 1, 1, 1.2); }
  return { t: 1.2, fn() {
    a.summons = alive(a.summons);
    for (const p of pts) {
      if (a.summons.length >= 3) break;
      const m = spawnMonster('lampless', p.x, p.z, { rising: true, level: Math.max(1, a.level - 2) });
      m.aggro = true; m.alarmed = true; m.patrol = null; G.actors.push(m); a.summons.push(m);
    }
  }, after: 0.5 };
}
// a Smoke-eater crawls in for the braziers (two at most, one every half minute)
function callEater(a) {
  const c = arena(a), f = rimAt(c, arenaR(14) - 1, rand.range(0, 6.28));
  const m = spawnMonster('smokeEater', f.x, f.z, { rising: true, level: Math.max(1, a.level - 2) });
  m.aggro = true; G.actors.push(m); (a.eaters ||= []).push(m);
  puff(f.x, 0.3, f.z, 10, 0x2a2624, 1.2, 1, 1.4);
  return { t: 0.2, fn() {}, after: 0.1 };
}
// Dark Step: he goes to smoke and comes out of it behind her (the Barrow Lord's blink)
function darkStep(a, pl) {
  puff(a.x, 1, a.z, 18, 0x14161c, 1.6, 1.4, 1.2); a.hidden = true; if (a.avatar) a.avatar.group.visible = false;
  const tx = pl.x - Math.sin(pl.rot) * 2, tz = pl.z - Math.cos(pl.rot) * 2, ok = G.zone.map.walkable(tx, tz), X = ok ? tx : pl.x, Z = ok ? tz : pl.z;
  a.tele = teleCircle(X, Z, 3, 0.9, 0x8a9ab8); Audio.sfx('wraithWail', { x: X, z: Z, vol: 0.5 });
  return { t: 0.9, noFace: true, fn() {
    a.x = X; a.z = Z; a.hidden = false; if (a.avatar) a.avatar.group.visible = true; a.rot = angleTo(a.x, a.z, G.player.x, G.player.z);
    a.avatar?.play('slam', 1.6); puff(X, 1, Z, 14, 0x14161c, 1.4, 1.2, 1); Audio.sfx('slam', { x: X, z: Z });
    if (Math.hypot(G.player.x - X, G.player.z - Z) < 3.2) hitHero(a, G.player, 1.5);
  }, after: 0.6 };
}
// Dead Lanterns: three lobbed, landing at 1.1, 1.3 and 1.5 s, each leaving cold fire that slows
function deadLanterns(a, pl) {
  a.avatar?.play('KK_Spellcast_Shoot', 1); Audio.sfx('wraithWail', { x: a.x, z: a.z, vol: 0.3 });
  for (let i = 0; i < 3; i++) {
    const x0 = pl.x + (i ? rand.range(-3.5, 3.5) : 0), z0 = pl.z + (i ? rand.range(-3.5, 3.5) : 0), f = G.zone.map.walkable(x0, z0) ? { x: x0, z: z0 } : G.zone.map.nearestFloor(x0, z0, 3);
    const dl = 1.1 + i * 0.2;
    teleCircle(f.x, f.z, 2, dl, 0x9ab8ff);
    later(dl - 0.7, inZone(a, () => lob(a.x, a.z, f.x, f.z, 0.7, 4, 0x4a5466, (x, z) => {
      glowBurst(x, 0.5, z, 0xc8dcff, 20, 3, 0.25, 0.6); Audio.sfx('frost', { x, z, vol: 0.5 });
      const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 2 + p.radius * 0.5) hitHero(a, p, 1.0);
      area('coldFire', x, z, 2, 4, { team: 'foe', src: a });
    })));
  }
  return { t: 0.5, fn() {}, after: 0.4 };
}
// Lantern Nova: 7 m of pale fire with a 2.5 m calm at his feet (step in, or get out)
function lanternNova(a, pl) {
  a.tele = teleCircle(a.x, a.z, 7, 1.4, 0xff4020);
  const safe = teleCircle(a.x, a.z, 2.5, 1.4, 0x60c0ff);
  a.avatar?.play('castUp', 1, { hitIn: 1.4 }); Audio.sfx('wraithWail');
  return { t: 1.4, noFace: true, fn() {
    killTele(safe); ring(a.x, a.z, 7, 0xd8e8ff, 0.7); glowBurst(a.x, 1.5, a.z, 0xd8e8ff, 40, 7, 0.4, 0.7); shake(0.4);
    const dd = Math.hypot(pl.x - a.x, pl.z - a.z); if (dd > 2.7 && dd < 7.3) hitHero(a, pl, 1.6);
  }, after: 0.6 };
}

// Karthax, the Ash King: the crown's will in a body of slag. A smith, then behind his keepers' cages, then the fire itself
const KEEPERS = [
  { id: 'lord', model: 'barrowLord', gift: 'throne', pose: 'castUp', ang: -Math.PI / 2 },
  { id: 'king', model: 'moltenKing', gift: 'forge', pose: 'slam', ang: Math.PI / 2 },
  { id: 'lady', model: 'amaranthe', gift: 'unfading', pose: 'kneel', ang: Math.PI }
];
const cageUp = (a, id) => !!a.cages?.some((s) => s.keeper === id && !s.dead);
const KARTHAX = {
  name: 'karthax', phases: [0.65, 0.3], wake: 14,
  intro(a) {
    emit('bossIntro', a); say('d.karthax');
    Audio.sfx('bossRoar'); Audio.sfx('lavaBurst'); a.avatar?.play('taunt');
    explosion(a.x, a.z, 4, 0xff7a20, { smoke: 0x2a2220, shake: 0.6 });
    a.mcd.host = 8; a.mcd.gaze = 5; a.mcd.tongs = 4; a.misses = 0;
  },
  onPhase(a, ph) {
    if (ph === 1) threeCages(a);
    if (ph === 2) lastFire(a);
  },
  tick(a, dt) {
    if (a.cages) {
      const up = alive(a.cages);
      if (!up.length) { cagesBroken(a); return 0; }
      // warded while any keeper stands; each lends him its light
      a.ward = Math.max(a.ward || 0, 0.3); a.avatar?.setRim(0xd8c8a8, 1.2);
      a.beamT = (a.beamT ?? 0) - dt;
      const lady = up.find((s) => s.keeper === 'lady');
      // Unfading: the Lady's statue mends him, 1% a second, never above 65%
      if (lady && a.hp < a.hpMax * 0.65) a.hp = Math.min(a.hpMax * 0.65, a.hp + a.hpMax * 0.01 * dt);
      if (a.beamT <= 0) { a.beamT = 0.3; for (const s of up) bolt(s.x, 2.2, s.z, a.x, 2.6 * (a.scale || 1), a.z, s.keeper === 'lady' ? 0xffb040 : 0xc8c0b0, s.keeper === 'lady' ? 0.9 : 0.5); }
    }
    if (a.phase === 2) {
      // the last fire holds for as long as he does (a hero back from the waypoint finds it again), where the fight is
      const inside = heroNear(a);
      setHeroLight(inside ? 0 : null, a); setLightDark(inside, a);
      if (!getLightPool('ghost')) ghostPools(a);
      if (a.isarnT == null && !getLightPool('isarn')) a.isarnT = 3;
      // without the story's lantern (an echo), a still 6 m light on the anvil
      if (a.isarnT != null && (a.isarnT -= dt) <= 0) { a.isarnT = null; if (!getLightPool('isarn')) { const an = G.zone.L.spots?.anvil || arena(a); addLightPool(an.x, an.z, 6, Infinity, 'isarn', { owner: a, color: 0xfff0c0, intensity: 24 }); } }
      if (!a.beacon && a.hp < a.hpMax * 0.15) { a.beacon = true; emit('karthaxBeacon', a); }
    }
    return null;
  },
  moves: [
    // every 15 s (cooldowns run a quarter faster in a last phase)
    { id: 'dark', when: (a) => a.phase >= 2 && heroNear(a), cd: 18.75, run: (a) => theDark(a) },
    { id: 'breath', when: (a, d) => a.phase >= 2 && !!getLightPool('isarn'), cd: 10, run: (a, pl) => ashBreath(a, pl) },
    // behind the cages one every 5 s, wherever she is in the arena (the statues break only to it); never far out of it.
    // Statues risen whole (gifts taken) take more blows, so he strikes faster: 5 s for three blows, 3.2 s for six (~30 s)
    { id: 'hammerfall', when: (a, d) => (a.phase === 1 && heroInArena(a)) || (d > 3 && d < 16), phaseCd: [9, 5, 8], cdOf: (a, ph) => (ph === 1 && a.cageBlows ? 5 - 0.6 * (a.cageBlows - 3) : null), run: (a, pl) => hammerfall(a, pl) },
    { id: 'kneel', when: (a, d) => a.phase === 1 && cageUp(a, 'lord') && d < 8.5, cd: 12, run: (a) => kneel(a) },
    { id: 'rain', when: (a) => a.phase === 1 && cageUp(a, 'king') && heroInArena(a), cd: 10, run: (a, pl) => moltenRain(a, pl) },
    { id: 'host', when: (a) => a.phase === 0 && alive(a.host).length < 4, cd: 22, run: (a) => raiseHost(a) },
    { id: 'tongs', when: (a, d) => a.phase !== 1 && d > 3.5 && d < 10, cd: 12, run: (a, pl) => tongs(a, pl) },
    { id: 'gaze', when: (a, d) => a.phase !== 1 && d > 4, phaseCd: [9, 9, 8], run: (a, pl) => gaze(a, pl) },
    { id: 'combo', basic: true, when: (a, d) => d < 5.2, cd: 1.6, run(a, pl) { a.combo = 0; return emberCombo(a, pl); } }
  ]
};
// phase 2, The Three Cages: the shards sink into ash statues of their last keepers. A gift taken at an altar makes its statue
// rise whole (two blows), a gift refused cracked (one); echoes always cracked. Only his own Hammerfall breaks them
function threeCages(a) {
  say('d.karthax.p2'); tally(a, 'cages');
  const F = G.hero.flags, gifts = F.gifts || {};
  if (!a.echo) {
    if (Object.values(gifts).includes('taken')) later(3.2, inZone(a, () => say('d.karthax.take')));
    F.giftsTaken = true; refreshStats();
  }
  a.lockPhase = 1; a.hpFloor = a.hpMax * 0.3; a.misses = 0;
  a.crown?.userData?.setSockets?.(1);
  const c = arena(a), spots = G.zone.L.spots?.cages || [];
  a.cages = KEEPERS.map((k) => {
    const s = spots.find((p) => p.id === k.id) || { x: c.x + Math.sin(k.ang) * 10, z: c.z + Math.cos(k.ang) * 10 }, f = G.zone.map.nearestFloor(s.x, s.z, 4);
    const cracked = !!a.echo || gifts[k.gift] === 'refused';
    const m = spawnMonster('keeperStatue', f.x, f.z, { model: k.model, scale: MONSTERS[k.model]?.look?.scale || 1, keeper: k.id, pose: k.pose, level: a.level });
    m.blows = cracked ? 1 : 2; m.cracked = cracked; m.cageOf = a; m.rot = angleTo(f.x, f.z, c.x, c.z);
    if (cracked) crackLook(m);
    explosion(f.x, f.z, 2.2, 0x9a9690, { smoke: 0x6a6660, shake: 0.3 }); puff(f.x, 1.5, f.z, 20, 0x8a8680, 2, 2, 1.6);
    G.actors.push(m);
    return m;
  });
  a.cageBlows = a.cages.reduce((n, s) => n + s.blows, 0);
  a.mcd.hammerfall = 2;
  emit('karthaxCages', a, a.cages);
}
function crackLook(s) { s.avatar?.setRim(0xff5a18, 0.9); s.baseTint = 0x9a948c; s.statueTint = 0x9a948c; for (let i = 0; i < 12; i++) sparks(s.x, rand.range(0.5, 2.5), s.z, 1, 0xff8030, 2); }
// a Hammerfall in the cages' phase: every statue within 4.5 m of the blow (6 m after three misses running) takes it
function cageBlow(a, x, z) {
  const R0 = a.misses >= 3 ? 6 : 4.5;
  let hit = false;
  for (const s of a.cages || []) {
    if (s.dead || Math.hypot(s.x - x, s.z - z) > R0 + s.radius * 0.5) continue;
    hit = true; s.blows--;
    Audio.sfx('crownCrack', { x: s.x, z: s.z }); sparks(s.x, 2, s.z, 20, 0xffc080, 6);
    if (s.blows <= 0) breakCage(a, s);
    else { s.cracked = true; crackLook(s); emit('cageCracked', s, s.keeper, a); tally(a, 'cageCracked'); }
  }
  if (hit) a.misses = 0;
  else if (++a.misses === 3) { say('d.karthax.hint'); emit('cageHint', a); tally(a, 'hint'); }
}
function breakCage(a, s) {
  s.dead = true; s.deadT = 0; s.hp = 0;
  explosion(s.x, s.z, 2.6, 0xb0a898, { smoke: 0x7a7670, shake: 0.6 }); puff(s.x, 1.5, s.z, 26, 0x8a8680, 2.2, 2.4, 1.8);
  glowBurst(s.x, 2.4, s.z, s.keeper === 'lady' ? 0xffb040 : s.keeper === 'king' ? 0xff6a20 : 0x7ad0ff, 40, 4, 0.35, 1);
  Audio.sfx('statueBreak', { x: s.x, z: s.z }); Audio.sfx('crownCrack');
  // the shard cracks and speaks the wish it held; then the keeper, for one breath, is himself
  say('d.cage.' + s.keeper);
  later(2.6, () => say('d.cage.' + s.keeper + '2'));
  emit('cageBroken', s, s.keeper, a); tally(a, 'cageBroken:' + s.keeper);
}
function cagesBroken(a) {
  a.cages = null; a.hpFloor = a.hpMax * 0.2; a.hp = Math.min(a.hp, a.hpMax * 0.299); a.ward = 0; restoreRim(a);
  tally(a, 'cagesBroken'); daze(a, 3.4);
  // he staggers while the last keeper says her piece (no blow ends him there); then the last fire
  later(3.4, () => { a.lockPhase = null; a.hpFloor = 0; });
}
// phase 3, The Last Fire: he drinks every fire in the arena, the Cradle's too, and is Shrouded; only the pools give light:
// Isarn's lantern (the story's pool 'isarn', walking toward him) and four ghosts on the rim diagonals
function lastFire(a) {
  say('d.karthax.p3'); tally(a, 'lastFire');
  const c = arena(a);
  for (const ar of G.areas) if (ar.kind === 'fire' && Math.hypot(ar.x - c.x, ar.z - c.z) < 24) { for (let k = 0; k < 8; k++) P({ x: ar.x, y: 0.4, z: ar.z, vx: (a.x - ar.x) / 0.6, vy: 3, vz: (a.z - ar.z) / 0.6, life: 0.6, size: 0.4, size1: 0.1, color: 0xffc060, color1: 0xff3000 }); ar.t = ar.dur; }
  for (const it of G.zone.interact || []) if (it.lit && isLamp(it) && Math.hypot(it.x - c.x, it.z - c.z) < 24) snuffLamp(it, a);
  setHeroLight(0, a); setLightDark(true, a); a.shrouded = true;
  ghostPools(a);
  a.isarnT = a.echo ? 0.5 : 6;
  a.mcd.dark = 7; a.mcd.breath = 8;
  glowBurst(a.x, 3, a.z, 0xff5a10, 60, 6, 0.4, 1); shake(0.6); Audio.sfx('lavaBurst'); Audio.sfx('bossRoar');
  emit('karthaxLastFire', a);
}
// four hooded Wayfarer ghosts on the rim diagonals, each a still 4 m light (the story shows the ghosts themselves)
function ghostPools(a) {
  const c = arena(a), R0 = arenaR(16) - 3, gs = G.zone.L.spots?.ghosts || [0, 1, 2, 3].map((i) => ({ x: c.x + Math.sin(i * 1.571 + 0.785) * R0, z: c.z + Math.cos(i * 1.571 + 0.785) * R0 }));
  for (const g of gs) addLightPool(g.x, g.z, 4, Infinity, 'ghost', { owner: a, color: 0xc8d8ff, intensity: 14 });
}
// Ember Combo: three blows (0.6, 0.5, 0.8 s; quicker in the last fire), the third leaves fire
function emberCombo(a, pl) {
  const step = a.combo, W = a.phase >= 2 ? [0.5, 0.45, 0.7] : [0.6, 0.5, 0.8], t = W[step];
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.tele = teleCone(a.x, a.z, a.rot, 5, 1.0, t, 0xff5010);
  a.avatar?.play(['slash1', 'slash2', 'slam'][step], 1.2, { hitIn: t });
  return { t, fn() {
    if (meleeLands(a, G.player, 5, 1.0)) hitHero(a, G.player, step === 2 ? 1.4 : 1, { burn: a.dmg * 0.4 });
    Audio.sfx('swingHeavy', { x: a.x, z: a.z }); shake(step === 2 ? 0.35 : 0.12);
    if (step === 2) { const x = a.x + Math.sin(a.rot) * 3, z = a.z + Math.cos(a.rot) * 3; explosion(x, z, 1.8, 0xff6a10, { smoke: 0x2a1a10, shake: 0.3 }); area('fire', x, z, 1.5, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }
    a.combo++;
  }, after: 0.25, chain: step < 2 && Math.hypot(pl.x - a.x, pl.z - a.z) < 6.5, chainFn: emberCombo };
}
// Hammerfall: a 4.5 m circle on the hero (1.6 s while the cages stand, else 1.0 s); he leaps to bring the hammer down on it
function hammerfall(a, pl) {
  const caged = !!a.cages, wind = caged ? 1.6 : 1.0, tx = pl.x, tz = pl.z, d = Math.hypot(tx - a.x, tz - a.z), dir = angleTo(a.x, a.z, tx, tz);
  // after three misses running the statues break within 6 m (cageBlow), and the circle shows it; she is still hit within 4.5 m
  const R0 = caged && a.misses >= 3 ? 6 : 4.5;
  a.rot = dir;
  a.tele = teleCircle(tx, tz, R0, wind, 0xff5010);
  const leap = d > 4.8;
  if (leap) { const k = d - 2.6, f = G.zone.map.nearestFloor(a.x + Math.sin(dir) * k, a.z + Math.cos(dir) * k, 3); a.lx = a.x; a.lz = a.z; a.leapTo = f; }
  a.avatar?.play('chop', 1, { hitIn: wind }); Audio.sfx('swingHeavy', { x: a.x, z: a.z });
  return { t: wind, leap, noFace: true, fn() {
    explosion(tx, tz, R0, 0xff6a10, { smoke: 0x2a1a10, shake: 0.7 }); ring(tx, tz, R0 + 0.3, 0xffa040, 0.6);
    Audio.sfx('slam'); Audio.sfx('anvil', { x: tx, z: tz });
    const p = G.player; if (Math.hypot(p.x - tx, p.z - tz) < 4.5 + p.radius * 0.5) hitHero(a, p, 1.5, { stun: 0.4, burn: a.dmg * 0.5 });
    for (let i = 0; i < 3; i++) { const ang = i * 2.094 + rand.range(0, 1), r = rand.range(1.2, 3), x = tx + Math.sin(ang) * r, z = tz + Math.cos(ang) * r; if (G.zone.map.walkable(x, z)) area('fire', x, z, 1.3, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }
    if (caged) cageBlow(a, tx, tz);
  }, after: 0.7 };
}
// Tongs: a 10 m line; caught (no dodge during the wind-up), she is dragged to the anvil and hammered (1.8x and burn)
function tongs(a, pl) {
  const dir = angleTo(a.x, a.z, pl.x, pl.z), stamp = pl.dodgeStamp || 0;
  a.rot = dir;
  a.tele = teleLine(a.x, a.z, dir, 10, 1.6, 0.9, 0xff8030);
  a.avatar?.play('Melee_Hook', 1, { hitIn: 0.9 }); Audio.sfx('chainRattle', { x: a.x, z: a.z, vol: 0.6 });
  return { t: 0.9, noFace: true, fn() {
    const p = G.player, ux = Math.sin(dir), uz = Math.cos(dir);
    for (let d = 1; d < 10; d += 0.8) P({ x: a.x + ux * d, y: 1.2, z: a.z + uz * d, life: 0.25, size: 0.25, size1: 0.05, color: 0xffb060 });
    if ((p.dodgeStamp || 0) !== stamp || p.iframes > 0 || p.dead || !inLine(a.x, a.z, dir, 10, 1.6, p)) { tally(a, 'tongsMissed'); return; }
    const an = G.zone.L.spots?.anvil, near = an && Math.hypot(an.x - a.x, an.z - a.z) < 9;
    const to = near ? (() => { const k = Math.atan2(p.x - an.x, p.z - an.z); return G.zone.map.nearestFloor(an.x + Math.sin(k) * 1.8, an.z + Math.cos(k) * 1.8, 3); })() : G.zone.map.nearestFloor(a.x + ux * (a.radius + 1.2), a.z + uz * (a.radius + 1.2), 3);
    p.pull = { x: to.x, z: to.z, sx: p.x, sz: p.z, t: 0.45, t0: 0.45 }; p.act = null;
    tally(a, 'tongsCaught'); Audio.sfx('chainRattle', { x: p.x, z: p.z });
    later(0.5, inZone(a, () => { a.avatar?.play('slam', 1.4); const q = G.player; explosion(q.x, q.z, 1.6, 0xff6a10, { smoke: 0x2a1a10, shake: 0.5 }); Audio.sfx('anvil', { x: q.x, z: q.z }); hitHero(a, q, 1.8, { burn: a.dmg * 0.6 }); }));
  }, after: 1.0 };
}
// Gaze of the Brow-stone: a white-gold 20 m line that burns on for 4 s; in the last fire two crossing lines, never into Isarn's light
function gaze(a, pl) {
  const wind = a.phase >= 2 ? 1.2 : 1.1, I = a.phase >= 2 ? getLightPool('isarn') : null;
  let rays = [angleTo(a.x, a.z, pl.x, pl.z)];
  if (a.phase >= 2) { const r1 = rays[0] + Math.PI / 2, r2 = rays[0] - Math.PI / 2; rays.push(I && Math.abs(angleDiff(r1, angleTo(a.x, a.z, I.x, I.z))) < Math.abs(angleDiff(r2, angleTo(a.x, a.z, I.x, I.z))) ? r2 : r1); }
  if (I) rays = rays.map((r) => spareLight(a, r, I));
  for (const r of rays) teleLine(a.x, a.z, r, 20, 2.4, wind, 0xfff0b0);
  glowBurst(a.x, 3.4 * (a.scale || 1) * 0.6, a.z, 0xfff0c0, 30, 2, 0.3, wind);
  a.avatar?.play('castUp', 1, { hitIn: wind }); Audio.sfx('fireball', { x: a.x, z: a.z, vol: 0.6 });
  return { t: wind, noFace: true, fn() {
    const p = G.player;
    for (const r of rays) {
      const ux = Math.sin(r), uz = Math.cos(r);
      for (let d = 1; d < 20; d += 0.6) P({ x: a.x + ux * d, y: 1.2, z: a.z + uz * d, vy: rand.range(0.5, 2), life: 0.5, size: 0.8, size1: 0.1, color: 0xfff0c0, color1: 0xff7020 });
      for (let d = 3; d < 20; d += 3.5) { const x = a.x + ux * d, z = a.z + uz * d; if (G.zone.map.walkable(x, z)) area('fire', x, z, 1.2, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }
      if (!p.dead && inLine(a.x, a.z, r, 20, 2.4, p)) hitHero(a, p, 1.6, { burn: a.dmg * 0.6 });
    }
    Audio.sfx('explosion', { x: a.x, z: a.z, vol: 0.6 }); shake(0.3);
  }, after: 0.6 };
}
// a ray from him that would cross Isarn's light swings clear of it
function spareLight(a, r, I) {
  const dI = Math.hypot(I.x - a.x, I.z - a.z); if (dI > 21) return r;
  const aI = angleTo(a.x, a.z, I.x, I.z), half = Math.asin(Math.min(1, (I.r + 1.4) / Math.max(dI, 0.1))), off = angleDiff(aI, r);
  return Math.abs(off) >= half ? r : aI + (off >= 0 ? half : -half) + Math.sign(off || 1) * 0.1;
}
// Raise the Host: ash pours from two rim points; two spearmen and a bowman rise (four at most)
function raiseHost(a) {
  const c = arena(a), r = arenaR(16) - 2, a0 = rand.range(0, 6.28), pts = [rimAt(c, r, a0), rimAt(c, r, a0 + 2.6)];
  a.avatar?.play('summon', 1); Audio.sfx('summon');
  for (const p of pts) for (let k = 0; k < 8; k++) later(k * 0.15, inZone(a, () => puff(p.x, 2.5 - k * 0.25, p.z, 3, 0x6a6660, 1.2, 0.6, 1)));
  return { t: 1.4, fn() {
    a.host = alive(a.host);
    for (const [k, p] of [['ashSpear', pts[0]], ['ashSpear', pts[1]], ['ashBow', pts[0]]]) {
      if (a.host.length >= 4) break;
      const f = G.zone.map.nearestFloor(p.x + rand.range(-1.2, 1.2), p.z + rand.range(-1.2, 1.2), 3), m = spawnMonster(k, f.x, f.z, { rising: true, level: Math.max(1, a.level - 2) });
      m.aggro = true; G.actors.push(m); a.host.push(m);
    }
  }, after: 0.5 };
}
// Kneel (the Barrow Lord's statue stands): an 8 m throne glyph; whoever is still in it is struck and held
function kneel(a) {
  a.tele = teleCircle(a.x, a.z, 8, 1.3, 0xb0a0ff); ring(a.x, a.z, 5, 0xc0b0ff, 1.3); ring(a.x, a.z, 2.5, 0xc0b0ff, 1.3);
  a.avatar?.play('slam', 1, { hitIn: 1.3 }); Audio.sfx('wraithWail', { vol: 0.6 });
  return { t: 1.3, noFace: true, fn() { ring(a.x, a.z, 8, 0x9ad0ff, 0.6); glowBurst(a.x, 1, a.z, 0x9ad0ff, 30, 6, 0.3, 0.6); const p = G.player; if (Math.hypot(p.x - a.x, p.z - a.z) < 8 + p.radius * 0.5) { hitHero(a, p, 1.0); rootHero(1.5); } tally(a, 'kneelHit'); }, after: 0.6 };
}
// Molten Rain (Durgan's statue stands): five drops on and around the hero, 1.1 to 2.1 s, each leaving fire
function moltenRain(a, pl) {
  a.avatar?.play('castUp', 1); Audio.sfx('lavaBurst', { vol: 0.7 });
  for (let i = 0; i < 5; i++) {
    const x = pl.x + (i ? rand.range(-4.5, 4.5) : 0), z = pl.z + (i ? rand.range(-4.5, 4.5) : 0);
    if (!G.zone.map.walkable(x, z)) continue;
    const dl = 1.1 + i * 0.25;
    teleCircle(x, z, 1.8, dl, 0xff5010);
    later(dl - 0.32, inZone(a, () => fall(x, z, 0xffa040, true)));
    later(dl, inZone(a, () => { explosion(x, z, 1.8, 0xff7a20, { smoke: 0x2a1a10, shake: 0.1 }); area('fire', x, z, 1.4, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); Audio.sfx('lavaBurst', { x, z, vol: 0.6 }); const p = G.player; if (Math.hypot(p.x - x, p.z - z) < 1.9) hitHero(a, p, 1.1, { burn: a.dmg * 0.5 }); }));
  }
  return { t: 0.6, fn() {}, after: 0.4 };
}
// The Dark: every 15 s the whole platform burns for anyone not standing in a light (Isarn's 6 m, the ghosts' 4 m);
// a fight drawn off the platform burns around him
function theDark(a) {
  const c = heroInArena(a) ? arena(a) : { x: a.x, z: a.z }, R0 = arenaR(16) + 3;
  a.tele = teleCircle(c.x, c.z, R0, 1.8, 0xff2010);
  const safes = lightPools().filter((p) => p.r > 0).map((p) => teleCircle(p.x, p.z, p.r, 1.8, 0x60c0ff));
  a.avatar?.play('summon', 0.8); Audio.sfx('bossRoar', { vol: 0.6 }); shake(0.3);
  return { t: 1.8, noFace: true, fn() {
    for (const s of safes) killTele(s);
    for (let i = 0; i < 60; i++) { const ang = Math.random() * 6.28, r = Math.random() * R0; P({ x: c.x + Math.sin(ang) * r, y: 0.2, z: c.z + Math.cos(ang) * r, vy: rand.range(2, 5), life: 0.6, size: 0.9, size1: 0.2, color: 0xff6020, color1: 0x300800 }); }
    shake(0.6); Audio.sfx('explosion', { vol: 0.8 });
    const p = G.player; if (!p.dead && Math.hypot(p.x - c.x, p.z - c.z) < R0 && !lightAt(p.x, p.z)) { hitHero(a, p, 2.0, { burn: a.dmg * 0.5 }); tally(a, 'darkHit'); } else tally(a, 'darkSafe');
  }, after: 0.6 };
}
// Ash Breath at the Lantern: an 8 m cone at Isarn; it dims his light to 3 m for 6 s unless the hero stands in it and takes it
function ashBreath(a, pl) {
  const I = getLightPool('isarn'); if (!I) return { t: 0.1, fn() {}, after: 0.1 };
  const rot = angleTo(a.x, a.z, I.x, I.z);
  a.rot = rot;
  a.tele = teleCone(a.x, a.z, rot, 8, 0.8, 1.0, 0xa09080);
  a.avatar?.play('castUp', 1, { hitIn: 1.0 }); Audio.sfx('windGust', { x: a.x, z: a.z, vol: 0.6 });
  return { t: 1.0, noFace: true, fn() {
    for (let i = 0; i < 40; i++) { const ang = rot + rand.range(-0.8, 0.8), sp = rand.range(5, 10); P({ add: false, x: a.x, y: 2, z: a.z, vx: Math.sin(ang) * sp, vy: rand.range(-0.5, 0.5), vz: Math.cos(ang) * sp, life: 0.9, size: 0.6, size1: 1.4, color: 0x4a4642, alpha: 0.6, alpha1: 0, drag: 1.5 }); }
    const p = G.player;
    if (!p.dead && inCone(a.x, a.z, rot, 8, 0.8, p)) { hitHero(a, p, 1.2, { burn: a.dmg * 0.3 }); tally(a, 'breathTaken'); }
    else if (Math.hypot(I.x - a.x, I.z - a.z) < 8 + I.r * 0.5) { shrinkPool(I, 3, 6); emit('isarnDimmed', a); tally(a, 'breathDimmed'); }
  }, after: 0.5 };
}

export { AI };
