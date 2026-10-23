// Monster, pet and boss behaviour.
import * as THREE from 'three';
import { G, later } from './state.js';
import { MONSTERS, HAZ5 } from './data.js';
import { rebuildHash, foes, near, spawnMonster, restoreRim, spawnNpc, lieDown } from './actors.js';
import { damage, kill, tickStatus, moveMul, heroHit, seeHero, clingHero, shakeOff, rootHero, REMAINS, remainsNear, takeRemains, addVuln, clearVuln, vuln, vulnOf } from './combat.js';
import { LIGHT, lightOn, shroudOn, lightAt, lampAt, lampNear, snuffLamp, isLamp, halveCradle, heroLightR, setHeroLight, setLightDark, addLightPool, getLightPool, shrinkPool, lightPools, addBeam, removeBeam, beams, inBeam, beamHas, lampLightAt, warmAt, cradlePoint } from './light.js';
import { setFluePumping, startFlues, flues, fluePeriod, setFlueHeat } from './forge.js';
import { refreshStats } from './stats.js';
import { fire, area } from './projectiles.js';
import { teleCircle, teleCone, teleLine, killTele, sparks, glowBurst, explosion, ring, bolt, P, puff, decal, flash, splash as splashFx, iceShards, freezeCrystals, breath, fireStream } from '../gfx/fx.js';
import { shake, addLight, removeLight, R, setAtmosphere } from '../gfx/gfx.js';
import { drape } from '../world/build.js';
import { emit, on } from '../ui/bus.js';
import { number } from '../ui/overlay.js';
import Audio from '../audio/audio.js';
import { rand, angleTo, angleDiff, dampAngle, damp, clamp } from '../core/util.js';
import { has, t } from '../i18n/i18n.js';
import { sapAt, addSapPool, addSapRing, sapPools, startDrips, placeCasks } from './sap.js';
import { grantBuff } from './stats.js';
import { wadeAt, waterAt, TIDE } from './tide.js';
import { ICE, iceAt, stageAt, crackAt, crackLine, crackCone, breakAt, holeNear, FALLS, drown } from './ice.js';
import { setShade, setWake } from '../world/sea.js';
import { ATMOS, mixAtmos } from '../world/atmos.js';
import { ZONES, checkpoint5 } from './world.js';
import { tidal } from '../world/gen5.js';
import { COLD, coldAdd } from './cold.js';
import { dropGlobe } from './pickups.js';
import { NET, nearestHero, heroes } from '../net/state.js';

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
  window.__act5 = Object.assign(window.__act5 || {}, { AI_LOG, LIGHT, lightAt, lampLightAt, warmAt, addBeam, removeBeam, beams, inBeam, addVuln, vuln, vulnOf, COLD, coldAdd, spawnNpc, spawnMonster, damage, moveMul, addSapPool, placeCasks });
}

export function updateActors(dt) {
  const pl0 = G.player, map = G.zone.map;
  clock += dt;
  rebuildHash();
  flow.t -= dt;
  if (flow.t <= 0 && pl0) { map.updateFlow(pl0.x, pl0.z, 45); flow.t = 0.2; }
  for (let i = G.actors.length - 1; i >= 0; i--) {
    const a = G.actors[i];
    if (a.removed) { G.actors.splice(i, 1); continue; }
    // a Mourner's bond holds only while she keeps singing it
    if (a.bondT > 0) a.bondT -= dt;
    if (a.team === 'npc') { npc(a, dt); continue; }
    // co-op: the other heroes are their pages' to move; on a guest the host's monsters are puppets (net/coop.js)
    if (a.remote || a.puppet) continue;
    if (a.prop) { if (a.dead) { a.deadT += dt; if (a.deadT > 0.05) { a.remove(); G.actors.splice(i, 1); } } continue; }
    if (a.dead) { dying(a, dt); if (a.removed) G.actors.splice(i, 1); continue; }
    // Act V: gone through the ice, coming up through another hole (ice.js FALLS)
    if (a.sunk > 0) { sunkTick(a, dt); continue; }
    // the hero it is after: on a co-op host the nearest of the party, held until another is 3 m nearer
    const pl = NET.mode === 'host' && a.team === 'foe' ? targetOf(a) : pl0;
    // only think when near the hero
    const dx = pl.x - a.x, dz = pl.z - a.z, d = Math.hypot(dx, dz);
    if (d > 38 && !a.boss && !a.pet) { if (a.avatar) a.avatar.group.visible = false; continue; }
    if (a.avatar) a.avatar.group.visible = !a.hidden;
    // Act V: a frozen crew stands as ice at the rails until the ice cracks beside it
    if (a.dormant && a.statue) { statueTick(a, dt, d, pl); continue; }
    if (a.dormant) {
      // the disguised (Hollowed passing for dead wood) wake only when the hero is close, they are struck, or a pack-mate breaks cover
      const W = a.def.wake || WAKE;
      const roused = a.disguised ? d < W.d || a.hp < a.hpMax : d < W.d || a.aggro;
      const called = a.disguised && a.wakeIn != null && (a.wakeIn -= dt) <= 0;
      // Act V: the flood wakes the Sunken and the Reefbacks it reaches (the Sunken never in lamp light); woken by the sea and
      // not by her, they rise calm (and lie down again at the ebb if she never came)
      const tide = !roused && !called && (a.def.tideWake || W.tide) && tideWakes(a, dt);
      if (roused || called || tide) {
        const calm = !roused && (tide || a.wakeCalm);
        a.dormant = false; a.rising = W.t; a.aggro = !calm; a.wakeCalm = false; a.tideRisen = calm; a.wakeIn = null;
        if (!calm) a.rot = angleTo(a.x, a.z, pl.x, pl.z);
        a.avatar?.play(W.clip, W.speed ?? 1.1); Audio.sfx(W.sfx, { x: a.x, z: a.z });
        if (a.disguised) unmask(a);
        if (calm) { splashFx(a.x, a.z, 0.7); tally(a, 'tideWake'); for (const b of G.actors) if (b.dormant && b.wakeIn != null && b.packId === a.packId) b.wakeCalm = true; }
      }
      else { const av = a.avatar; if (av) { av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot; av.update(a.disguised && !a.pose ? 0 : dt, { speed: 0 }); } continue; }
    }
    tickStatus(a, dt);
    if (a.dead) continue;
    if (a.rope) ropeTick(a, dt);
    // Act IV: revealed by light, the shroud broken, a shield dropped, an immune line not repeated too often
    if (a.revealed > 0) a.revealed -= dt;
    if (a.unshroud > 0) a.unshroud -= dt;
    if (a.shroudTxt > 0) a.shroudTxt -= dt;
    if (a.blockTxt > 0) a.blockTxt -= dt;
    if (a.immT > 0) a.immT -= dt;
    if (a.guardDown > 0 && (a.guardDown -= dt) <= 0) restoreRim(a);
    a.t += dt; a.cd -= dt;
    a.px = a.x; a.pz = a.z;
    if (a.ward > 0) { a.ward -= dt; if (a.ward <= 0) restoreRim(a); else if (Math.random() < 0.3) P({ x: a.x + rand.range(-0.5, 0.5), y: rand.range(0.4, 1.8), z: a.z + rand.range(-0.5, 0.5), vy: 0.6, life: 0.5, size: 0.12, size1: 0.02, color: 0xffb050 }); }
    a.flash = Math.max(0, a.flash - dt * 6);
    // amber sap slows flesh; wood, fliers and floaters never notice it (a charge handles sap itself)
    a.onSap = !a.def.float && a.def.flesh !== 'wood' && a.def.ai !== 'bat' && !a.under && !a.dash && sapAt(a.x, a.z) === 'amber';
    // Act V: wading (tide.js; moveMul slows all but swimmers); never the floaters, fliers or the hidden
    a.inWater = a.def.float || a.def.ai === 'bat' || a.under || a.airborne ? null : wadeAt(a.x, a.z);
    // ... swimmers in the deep, the Sunken stronger in the shallows (waterTick)
    if (G.zone.act5) waterTick(a, dt);
    // a sea-light's beam: the unlit dazzled and revealed, the light-shy scattered
    if (a.def.unlit || a.def.lightShy) beamTick(a);
    // floundering in a broken hole: no actions until it hauls out (ice.js)
    if (a.flounder > 0) { a.state = 'chase'; if (a.tele) { killTele(a.tele); a.tele = null; } }
    // stunned, frozen or terrified, a Mourner loses her song
    if (a.bond && (a.status.freeze > 0 || a.status.stun > 0 || a.status.fear > 0)) breakBond(a);
    let speed = 0;
    if (a.rising > 0) a.rising -= dt;
    else if (a.status.freeze > 0 || a.status.stun > 0) { if (a.state === 'song') songBreak(a); a.state = HELD.has(a.state) ? 'chase' : a.state; if (a.lurk && (a.state === 'surface' || a.state === 'lunge')) { a.state = 'up'; a.lurk.upT = 3; killTele(a.lurk.arrow); } a.interrupted = true; if (a.tele) { killTele(a.tele); a.tele = null; } }
    else if (a.pet) speed = petAI(a, dt);
    // (the Skuas scatter their own way: up and away, skua)
    else if (a.status.fear > 0 && !a.def.lightShy) speed = flee(a, dt, pl);
    // the Sunken the flood woke, back to their kelp at the ebb if she never came
    else if (a.tideRisen && !a.aggro && ebbing()) speed = goRest(a, dt);
    else {
      speed = (AI[a.def.ai] || AI.melee)(a, dt, pl, d);
      // no affix from what cannot be struck yet: a rootling still underground, an archer in the trees, a Rootwarden asleep,
      // an Ember Tick on her back, an Ashwing on the wing
      if (a.affixes.length && !(a.under && a.def.burst) && !a.hidden && !a.cling && !a.airborne && !(a.def.ai === 'rooted' && !a.awake)) elite(a, dt, pl, d);
    }
    // knockback, separation, walls
    if (a.kx || a.kz) { a.x += a.kx * dt; a.z += a.kz * dt; const k = Math.exp(-dt * 7); a.kx *= k; a.kz *= k; if (Math.abs(a.kx) + Math.abs(a.kz) < 0.05) a.kx = a.kz = 0; }
    if (!a.airborne && !a.cling) for (const b of near(a.x, a.z, a.radius + 1)) {
      if (b === a || b.dead || b.prop || b.airborne || b.cling) continue;
      const ex = a.x - b.x, ez = a.z - b.z, l = Math.hypot(ex, ez), min = (a.radius + b.radius) * 0.9;
      if (l < min && l > 0.001) { const push = (min - l) * 0.5 * (b.boss ? 2 : 1) * (a.boss || a.def.anchored ? 0 : 1); a.x += (ex / l) * push; a.z += (ez / l) * push; }
    }
    if (a.def.ai === 'bat') { if (map.blocks(Math.floor(a.x), Math.floor(a.z)) && !map.blocks(Math.floor(a.px), Math.floor(a.pz))) { a.x = a.px; a.z = a.pz; } }
    else if (!a.under && !a.cling && !a.airborne && !(a.flounder > 0) && (!a.def.float || !a.boss)) { if (a.swim) swimCollide(a, Math.min(a.radius, 0.9)); else map.collide(a, Math.min(a.radius, 0.9)); }
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
      // the Rime Bear's breath in the cold
      if (a.def.frostRoar && Math.random() < dt * 0.7) breath(a.x + Math.sin(a.rot) * 1.25 * (a.scale || 1), 1.15 * (a.scale || 1), a.z + Math.cos(a.rot) * 1.25 * (a.scale || 1), 0.6, Math.sin(a.rot), Math.cos(a.rot));
    }
  }
  if (G.zone.act5) shadeTick(dt);
}
function targetOf(a) {
  // held by a Challenge or an Iron Bulwark (skillsx.js; a guest's, net/coop.js): that hero, while it stands
  const tb = a.tauntBy;
  if (a.taunt > G.hero.stats.time && tb && !tb.dead && !tb.removed && (tb === G.player || NET.remotes.includes(tb))) return (a.tgt = tb);
  const n = nearestHero(a.x, a.z), c = a.tgt;
  if (!c || c.dead || c.removed || (c.remote && !NET.remotes.includes(c))) return (a.tgt = n);
  if (n !== c && Math.hypot(n.x - a.x, n.z - a.z) < Math.hypot(c.x - a.x, c.z - a.z) - 3) a.tgt = n;
  return a.tgt;
}
// what a stun or a freeze cuts short (a blow's wind-up, a throw, a reel's warning, a wail, a roar)
const HELD = new Set(['attack', 'reel', 'throw', 'wail', 'roar']);
// the Shrouded look smoky and dim outside light, and show a pale rim while revealed
function shroudLook(a, av) {
  const on = (a.def.shroud || a.shrouded) && !(a.unshroud > 0) && shroudOn();
  const st = !on ? 0 : a.revealed > 0 || lightAt(a.x, a.z, { pad: a.radius * 0.5 }) ? 1 : 2;
  if (st === 2 && Math.random() < 0.25) P({ add: false, x: a.x + rand.range(-0.4, 0.4), y: rand.range(0.3, 1.8) * (a.scale || 1), z: a.z + rand.range(-0.4, 0.4), vy: 0.4, life: 1.1, size: 0.5, size1: 1.0, color: 0x14161c, alpha: 0.35, alpha1: 0 });
  if (st === (a.shLook ?? 0)) return;
  a.shLook = st;
  if (st === 2) { av.setTint(0x4a4e58, 1.6); av.setRim(0x7888a0, 0.3); }
  else { av.setTint(a.baseTint ?? 0xffffff, a.baseTintAmt ?? 0); if (st === 1) av.setRim(0xe0ecff, 0.7); else restoreRim(a); }
}

const _lq = new THREE.Quaternion(), _lr = new THREE.Quaternion(), _ly = new THREE.Vector3(0, 1, 0);
function npc(a, dt) {
  const pl = G.player, av = a.avatar;
  const d = Math.hypot(pl.x - a.x, pl.z - a.z);
  // a rooted elder (Old Linden) neither turns nor stirs much
  if (a.still) { if (a.home != null) a.rot = a.home; }
  else if (d < 6) a.rot = dampAngle(a.rot, angleTo(a.x, a.z, pl.x, pl.z), 3, dt);
  else if (a.home) a.rot = dampAngle(a.rot, a.home, 2, dt);
  av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot;
  av.update(dt * (a.animRate ?? 1), { speed: 0, lookAround: 1 });
  // a sea-lantern in her hand (Act V): it hangs from its bail whatever the hand does, and its small light goes where she
  // goes (lights are dropped on leaving a zone: lit again)
  if (a.lampC != null) {
    const h = av.held.R; if (h?.mesh.parent) h.mesh.quaternion.copy(h.mesh.parent.getWorldQuaternion(_lq).invert()).multiply(_lr.setFromAxisAngle(_ly, a.rot));
    if (!a.lampSrc || !R.sources.has(a.lampSrc)) a.lampSrc = addLight({ x: a.x, y: 1.4, z: a.z, color: a.lampC, intensity: 9 * (a.lampK || 1), range: 6, flicker: 0.12 });
    a.lampSrc.x = a.x + Math.sin(a.rot) * 0.3; a.lampSrc.z = a.z + Math.cos(a.rot) * 0.3;
    // a keeper's lamp is lamp light (a.lampPool metres: warms, holds the ice, keeps the dark's creatures off; light.js)
    if (a.lampPool) { if (!a.lampP || !lightPools().includes(a.lampP)) a.lampP = addLightPool(a.x, a.z, a.lampPool, Infinity, null, { lamp: true, fx: false, owner: a }); a.lampP.x = a.x; a.lampP.z = a.z; }
  }
}
function dying(a, dt) {
  a.deadT += dt;
  // what it left about it: an ash mound, a stoker's chain and its pump, a Lampless's cone
  if (!a.tidied) { a.tidied = true; if (a.mesh) { R.scene.remove(a.mesh); a.mesh = null; } if (a.post && a.pumping) setFluePumping(a.post.flue, false); a.airborne = false; if (a.rope) dropRope(a); if (a.lurk) killTele(a.lurk.arrow); }
  if (a.cone) { if (a.cone.userData.fade) a.cone.userData.fade(Math.max(0, 1 - a.deadT)); else a.cone.visible = false; }
  // Act V: the fight's camera given back; the Walking Tower crawls home to its skerry, the Skotos waits for its name to sink
  if (a.boss) fightCam(dt, null);
  if (a.kind === 'tower' && towerHome(a, dt)) return;
  if (a.kind === 'skotos') { skotosDying(a, dt); return; }
  const av = a.avatar; if (!av) { a.cone?.userData.dispose?.(); a.remove(); return; }
  // gone under the water: it sinks out of sight, no corpse left to burn away
  if (a.drowned) {
    a.y = Math.max(-2.6 * (a.scale || 1), (a.y || 0) - dt * (0.6 + a.deadT * 1.6));
    av.group.position.set(a.x, a.y, a.z); av.update(dt, { speed: 0, float: false }); av.setFlash(0);
    if (Math.random() < 0.3) P({ add: false, x: a.x + rand.range(-0.4, 0.4), y: 0.05, z: a.z + rand.range(-0.4, 0.4), vy: 0.4, life: 0.6, size: 0.12, size1: 0.3, color: 0xd8e8f0, alpha: 0.5, alpha1: 0 });
    if (a.deadT > 1.8) a.remove();
    return;
  }
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
  // (a swimmer goes straight across the water: only walls are in its way)
  if (d < 1.5 || (d < 22 && !(a.detourT > 0) && (map.clear(a.x, a.z, tx, tz) || (a.swim && map.los(a.x, a.z, tx, tz))))) { dx = (tx - a.x) / (d || 1); dz = (tz - a.z) / (d || 1); }
  else {
    // the flow field leads to the hero: a target at her side and nearer her than the actor is (a chase, a pet's place behind
    // her, a foe beside her). Anything else (a point to back off to, a mould's rim, a patrol post, a lamp) gets a small field
    // of its own, and past its reach (20 m) is felt for round what is in the way
    const pl = G.player, hd = pl ? Math.hypot(tx - pl.x, tz - pl.z) : Infinity;
    const toHero = hd <= 3 && hd < Math.hypot(a.x - pl.x, a.z - pl.z);
    let f = toHero ? map.flowDir(a.x, a.z, dirTmp) : map.stepToward(a.path ||= {}, a.x, a.z, tx, tz, dirTmp) || skirt(a, tx, tz, map);
    // a swimmer out in the water with no way through: to the nearest shore first
    if (!f && a.swim && !map.walkable(a.x, a.z)) { const s = map.nearestFloor(a.x, a.z, 10), l = Math.hypot(s.x - a.x, s.z - a.z) || 1; dirTmp.x = (s.x - a.x) / l; dirTmp.z = (s.z - a.z) / l; f = dirTmp; }
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
  const m = (a.def.turn || 2.2) * dt; a.rot += clamp(angleDiff(a.rot, r), -m, m);
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
  // Act V: a Sunken's blow from the water brings the sea's cold with it (cold.js)
  if (a.def.tideborne && a.inWater && o.cold == null) o = Object.assign({ cold: 4 }, o);
  const n = damage(a, tg, a.dmg * mult, Object.assign({ kx: tg.x - a.x, kz: tg.z - a.z }, o));
  if (a.def.drain) { a.hp = Math.min(a.hpMax, a.hp + a.dmg * mult * 0.5); glowBurst(a.x, 1.2, a.z, 0x60d0ff, 6, 1.5, 0.2, 0.4); }
  return n;
}
// pets draw aggro too: pick the nearest of hero and pets
function victim(a, pl) {
  // a War Cry's Challenge or an Iron Bulwark holds them to her (skillsx.js)
  if (a.taunt > G.hero.stats.time) return pl;
  let best = pl, bd = Math.hypot(pl.x - a.x, pl.z - a.z);
  for (const b of G.actors) if (b.pet && !b.dead) { const d = Math.hypot(b.x - a.x, b.z - a.z); if (d < bd - 1.5) { bd = d; best = b; } }
  return best;
}

// ---------- behaviours ----------
const AI = {
  melee(a, dt, pl, d) {
    // a Hull-louse waiting in its hull, curled into a ball, or bowled (louse)
    if (a.def.curl && (a.under || a.curled > 0 || a.bowling || a.bowl)) return louse(a, dt, pl, d);
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    const tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
    if (a.state === 'attack') {
      face(a, tg, dt, 6);
      if (attackTick(a, dt)) {
        if (a.spin) { killTele(a.tele); a.tele = null; tally(a, 'spin'); if (td < 2.5 + tg.radius) hitHero(a, pl, 1.1, { target: tg }); }
        else if (a.bash) { killTele(a.tele); a.tele = null; Audio.sfx('shieldBlock', { x: a.x, z: a.z, pitch: 0.8 }); if (meleeLands(a, tg, 2.6, 0.95)) hitHero(a, pl, 1.0, { push: 12, target: tg }); }
        else if (a.hook) hookStrike(a, pl, tg);
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
        // the Sunken hook her with the boat-hook every third blow: a sea-green cone, and a pull
        a.hook = !a.spin && !a.bash && !!a.def.hookEvery && a.swings % a.def.hookEvery === 0;
        if (a.spin) { a.tele = teleCircle(a.x, a.z, 2.5, 0.55, 0xff9030); startAttack(a, 'spinOnce'); }
        else if (a.bash) { a.tele = teleCone(a.x, a.z, a.rot, 2.6, 0.95, 0.6, 0xffa040); startAttack(a, 'Shield_Dash', { hit: 0.6, dur: 1.0, speed: 1.3 }); tally(a, 'bash'); }
        else if (a.hook) { a.tele = teleCone(a.x, a.z, a.rot, 2.4, 0.62, 0.6, SEA); startAttack(a, 'Melee_Hook', { hit: 0.6, dur: 1.1, speed: 0.48 }); tally(a, 'hook'); }
        else startAttack(a, a.def.atk);
      }
      return 0;
    }
    return seek(a, tg.x, tg.z, a.speed, dt);
  },
  ranged(a, dt, pl, d) {
    if (a.def.harpoonEvery) return harpooner(a, dt, pl, d);
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
    if (a.def.guard) return reef(a, dt, pl, d);
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
        if (a.slam) { explosion(a.x, a.z, 4, 0xb09070, { smoke: 0x4a4038, shake: 0.4 }); if (Math.hypot(pl.x - a.x, pl.z - a.z) < 4.2) hitHero(a, pl, 1.6, { stun: 0.5 }); crackAt(a.x, a.z, a.kind === 'reefback' ? 2.4 : 2.5, a.kind === 'reefback' ? 2 : 1, { src: 'slam' }); }
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
    if (a.def.lightShy) return skua(a, dt, pl, d);
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
      if (!a.atkHit && u > 0.35 && td < a.def.reach + tg.radius) { a.atkHit = true; hitHero(a, pl, 1, { target: tg, slow: a.def.biteSlow, cold: a.def.coldBite }); }
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
    // the Amberback Bear: rears, charges, and if it hits a wall, a stone or sap it stands there dazed (the Rime Bear: slush
    // too, and its charge cracks thin ice and can go through it: ice.js has it floundering, no actions)
    if (a.flounder > 0) return 0;
    if (a.dazed > 0) return dazedTick(a, dt);
    if (a.dash) return dashStep(a, dt, pl);
    if (!aggroCheck(a, pl, d)) return idle(a, dt);
    a.chargeCd = (a.chargeCd ?? rand.range(0.5, 2)) - dt;
    // the Rime Bear's Frost Roar, when she is close in front of it
    if (a.state === 'roar') return roar(a, dt, pl);
    if (a.def.frostRoar && (a.roarCd = (a.roarCd ?? rand.range(1.5, 3)) - dt) <= 0 && a.state !== 'rear' && a.state !== 'attack' && d < 5.2 && G.zone.map.los(a.x, a.z, pl.x, pl.z)) {
      a.roarCd = rand.range(9, 11); a.state = 'roar'; a.atkT = 0; a.atkHit = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      a.tele = teleCone(a.x, a.z, a.rot, 5, 0.6, 0.8, 0xffa060);
      a.avatar?.play('howl', 1, { hitIn: 0.8 }); Audio.sfx('bearRoar', { x: a.x, z: a.z, vol: 0.5 }); tally(a, 'roar');
      return 0;
    }
    if (a.state === 'rear') {
      a.atkT += dt * windMul(a);
      if (a.atkT >= 0.9) {
        a.state = 'chase'; killTele(a.tele); a.tele = null; a.chargeCd = rand.range(5, 7);
        startDash(a, a.chargeDir, 18, a.chargeLen, { daze: 2, sapDaze: 1, dmg: 1.4, hitO: { push: 20 }, dust: a.def.iceCharge ? 0xd8e0e8 : 0x5a4a38, ice: !!a.def.iceCharge });
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
      a.tele = teleLine(a.x, a.z, a.rot, a.chargeLen, Math.max(2.4, 2 * (a.radius + 1.05)), 0.9, 0xff9020);
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
        for (const p of heroes()) if (Math.hypot(p.x - a.x, p.z - a.z) < 4.2 + p.radius * 0.5) hitHero(a, p, 1.3, { push: 28 });
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
      cast('attack2', 0.9, 1.8, () => { spikes(x, z, 1.6); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 1.6 + p.radius * 0.5) hitHero(a, p, 1.0, { slow: { k: 0.35, t: 1.5 } }); });
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
    // (a keeper's statue in Karthax's cage stands still: his tick and his Hammerfall decide what happens to it; the Skotos
    // moves its Hands and its Coil)
    if (a.keeper || a.hand) return 0;
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
  // Act V
  singer: (a, dt, pl, d) => singer(a, dt, pl, d),
  lurker: (a, dt, pl, d) => lurker(a, dt, pl, d),
  // the bosses: what runs whatever they do (the water, the Hands, the Night, the camera), then their moves
  tower: (a, dt, pl, d) => { const v = towerPre(a, dt, pl, d); const r = boss(a, dt, pl, d, TOWER); return v || r; },
  skotos: (a, dt, pl, d) => { skotosPre(a, dt, pl, d); return boss(a, dt, pl, d, SKOTOS); },
  pet: null
};

// ---------- Act V: light on the dark's creatures, and what goes through the ice ----------
// a sea-light's beam passing over one of the Skotos's creatures (unlit) dazzles it for 1.5 s and leaves it Revealed for
// 3 s (x1.25: HAZ5.reveal), once a pass; the light-shy (the Skuas) scatter from it for 3 s. Nothing while it lies dormant
function beamTick(a) {
  const b = beams().length ? inBeam(a.x, a.z) : null;
  if (b === a.inBeam) return;
  a.inBeam = b;
  if (!b) return;
  if (a.def.unlit) {
    a.status.stun = Math.max(a.status.stun, 1.5);
    addVuln(a, 'revealed', 3);
    glowBurst(a.x, 1.2 * (a.scale || 1), a.z, 0xfff4e0, 14, 2.5, 0.25, 0.5);
    Audio.sfx('lightCatch', { x: a.x, z: a.z, vol: 0.6 }); tally(a, 'dazzled');
  }
  if (a.def.lightShy) { a.status.fear = Math.max(a.status.fear, 3); tally(a, 'scattered'); }
}
// gone through the ice (ice.js FALLS: the Sunken, the Icemaw): under the water for a.sunk seconds, then up out of the
// nearest open water within 10 m of where it went in (at the hole's edge), rising, back in the fight
function sunkTick(a, dt) {
  if (a.avatar) a.avatar.group.visible = false;
  if ((a.sunk -= dt) > 0) return;
  a.sunk = 0; a.under = false; a.hidden = false; a.y = 0;
  const map = G.zone.map, h = holeNear(a.x, a.z, 10), f = map.nearestFloor(h ? h.x : a.x, h ? h.z : a.z, 6);
  a.x = f.x; a.z = f.z; a.kx = a.kz = 0; a.aggro = true; a.state = 'chase';
  const pl = G.player; if (pl) a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  if (a.avatar) { a.avatar.group.visible = true; a.avatar.group.position.set(a.x, 0, a.z); a.avatar.play(a.def.wake?.clip || 'rise', 1.4); }
  a.rising = 1.2;
  puff(a.x, 0.2, a.z, 6, 0xd8e4ec, 1, 1, 1);
  for (let i = 0; i < 14; i++) P({ add: false, x: a.x, y: 0.2, z: a.z, vx: rand.range(-3, 3), vy: rand.range(2, 5), vz: rand.range(-3, 3), life: 0.8, size: 0.12, size1: 0.06, color: 0xd8ecf8, alpha: 1, grav: 14 });
  Audio.sfx('splash', { x: a.x, z: a.z }); tally(a, 'resurface');
}

// ---------- Act V: the Skotos's creatures and the coast's beasts ----------
// the telegraph palette (design, Touch and phone readability): red and orange harm; sea-green a pull or a reel; white the
// ice about to break; the Ice Singer's song a pale cold blue
const SEA = 0x30e0a8, SONG = 0xbfe8ff, ICE_W = 0xf0f8ff;
const wet = () => { const L = G.zone?.L; return !!(L && (L.bed || L.sea || L.ice)); };
// a swimmer is held off walls, never off the water (map.collide pushes everything out of a closed cell)
function swimCollide(a, r) {
  const map = G.zone.map;
  for (let iz = Math.floor(a.z - r); iz <= Math.floor(a.z + r); iz++) for (let ix = Math.floor(a.x - r); ix <= Math.floor(a.x + r); ix++) {
    if (!map.blocks(ix, iz)) continue;
    const cx = clamp(a.x, ix, ix + 1), cz = clamp(a.z, iz, iz + 1), dx = a.x - cx, dz = a.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 < 1e-8) { a.x = a.px; a.z = a.pz; return; }
    const dd = Math.sqrt(d2), k = (r - dd) / dd; a.x += dx * k; a.z += dz * k;
  }
}
// how deep a swimmer stands in closed water (the Sunken to the chest, a Reefback to its spire, a louse under)
const SWIM_Y = { sunken: -0.95, harpooner: -0.95, hullLouse: -0.3, reefback: -0.5 };
// the water under an Act V creature, once a frame: swimmers cross the deep and stand in it; the Sunken are quicker and mend
// in the shallows (2% a second) and slower on the flats the tide has left; a Reefback is quicker in any water
function waterTick(a, dt) {
  const L = G.zone.L;
  a.swim = (a.def.swim || (a.def.float && !a.boss && a.def.ai !== 'bat')) && wet();
  if (!a.swim && !a.def.tideborne) return;
  const w = waterAt(a.x, a.z), deep = w === 'deep' && !a.under && !a.airborne;
  a.inDeep = deep;
  if (a.def.tideborne) {
    const shallow = w === 'shallow' || a.inWater === 'brine';
    const left = w === 'dry' && L.bed && tidal(L, Math.floor(a.z) * L.w + Math.floor(a.x));
    a.waterK = shallow || deep ? 1.3 : left ? 0.85 : 1;
    if (shallow && a.hp < a.hpMax && !a.dead) { a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.02 * dt); if (Math.random() < dt * 3) P({ add: false, x: a.x + rand.range(-0.3, 0.3), y: 0.1, z: a.z + rand.range(-0.3, 0.3), vy: 0.5, life: 0.6, size: 0.08, size1: 0.02, color: 0xc8f0e8, alpha: 0.8 }); }
  } else if (a.def.wake?.tide) a.waterK = w !== 'dry' ? 1.3 : 1;
  // standing in closed water (a wave walking in, a swimmer crossing a creek): sunk to the chest, a wake behind it
  const sy = SWIM_Y[a.kind];
  if (sy != null && !a.under && !(a.flounder > 0) && !a.dead) {
    a.y = damp(a.y || 0, deep ? sy * (a.scale || 1) : 0, 4, dt);
    const mv = Math.hypot(a.x - (a.wpx ?? a.x), a.z - (a.wpz ?? a.z)); a.wpx = a.x; a.wpz = a.z;
    if (deep && mv > dt * 0.5 && Math.random() < dt * 6) P({ add: false, x: a.x - Math.sin(a.rot) * 0.4, y: 0.06, z: a.z - Math.cos(a.rot) * 0.4, vy: 0.1, life: 0.9, size: 0.3, size1: 1.0, color: 0xdce8ee, alpha: 0.35, alpha1: 0 });
  }
}
// the flood: is it at this one's feet now (every 0.25 s)? Never for the Skotos's own inside lamp light
function tideWakes(a, dt) {
  if ((a.tideT = (a.tideT ?? rand.range(0, 0.25)) - dt) > 0) return false;
  a.tideT = 0.25;
  return waterAt(a.x, a.z) !== 'dry' && !(a.def.unlit && lampLightAt(a.x, a.z));
}
// the ebb: what the flood woke and the hero never met walks back to where it lay and lies down again, whole
const ebbing = () => !!TIDE && (TIDE.phase === 'ebb' || TIDE.phase === 'low');
function goRest(a, dt) {
  const h = a.home;
  if (waterAt(h.x, h.z) !== 'dry') return idle(a, dt);
  if (Math.hypot(h.x - a.x, h.z - a.z) > 0.6) return seek(a, h.x, h.z, a.speed * 0.5, dt);
  lieDown(a); tally(a, 'restAgain');
  return 0;
}
// a frozen crew: ice until the ice beside it cracks (a stage 1 in the 3 x 3 round it), the hero comes within 4 m, or it is
// struck; then the whole rail breaks out, a moment apart
function statueTick(a, dt, d, pl) {
  const av = a.avatar;
  if (av) { av.group.position.set(a.x, 0, a.z); av.group.rotation.y = a.rot; av.update(0, { speed: 0 }); }
  let wake = (a.wakeIn != null && (a.wakeIn -= dt) <= 0) || d < 4 || a.hp < a.hpMax;
  if (!wake && (a.iceT = (a.iceT ?? rand.range(0, 0.25)) - dt) <= 0) { a.iceT = 0.25; for (let k = 0; k < 9 && !wake; k++) wake = stageAt(a.x + (k % 3) - 1, a.z + Math.floor(k / 3) - 1) >= 1; }
  if (!wake) return;
  breakStatue(a, pl);
  for (const b of G.actors) if (b !== a && b.statue && b.dormant && a.packId != null && b.packId === a.packId && b.wakeIn == null) b.wakeIn = rand.range(0.1, 0.7);
}
function breakStatue(a, pl) {
  const av = a.avatar;
  a.dormant = false; a.disguised = false; a.awake = true; a.aggro = true; a.rising = 0.7; a.wakeIn = null;
  a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  if (av) { av.setTint(...(a.wakeTint || [0xffffff, 0])); restoreRim(a); av.anim.stop?.(0.15); av.play('hit', 1.2); }
  for (let i = 0; i < 18; i++) P({ x: a.x + rand.range(-0.3, 0.3), y: rand.range(0.3, 1.8), z: a.z + rand.range(-0.3, 0.3), vx: rand.range(-3, 3), vy: rand.range(1, 4), vz: rand.range(-3, 3), life: rand.range(0.6, 1.1), size: rand.range(0.08, 0.16), size1: 0.05, color: 0xe8f6ff, color1: 0x7ab4e0, grav: 9.8 });
  puff(a.x, 1, a.z, 6, 0xe4ecf2, 0.9, 1, 1);
  Audio.sfx('iceCrack2', { x: a.x, z: a.z, vol: 0.8 }); tally(a, 'thaw');
}

// pull the hero dist metres toward (x, z) over dur seconds (the hook, the harpoon's reel, the Icemaw's drag): never past
// the puller (stop: how near it may bring her), never into a wall or the water (every enemy pull stops at the first deep
// cell, map.castT); key: the hit text over her
function pullHero(x, z, dist, dur, key, stop = 1.2) {
  const p = G.player; if (!p || p.dead || p.pull || G.mode !== 'play') return false;
  const dx = x - p.x, dz = z - p.z, l = Math.hypot(dx, dz), k = Math.min(dist, l - stop);
  if (k < 0.3) return false;
  const tx = p.x + (dx / l) * k, tz = p.z + (dz / l) * k, f = G.zone.map.castT(p.x, p.z, tx, tz, 0.3);
  if (f * k < 0.3) return false;
  p.pull = { x: p.x + (tx - p.x) * f, z: p.z + (tz - p.z) * f, sx: p.x, sz: p.z, t: dur, t0: dur }; p.act = null;
  if (has(key)) number(p.x, 2.5, p.z, t(key), 'text', '#7af0c8');
  for (let i = 0; i < 8; i++) P({ x: p.x + (dx / l) * i * 0.3, y: 1.0, z: p.z + (dz / l) * i * 0.3, life: 0.3, size: 0.2, size1: 0.04, color: 0x9affd8 });
  return true;
}
// the Sunken's boat-hook: every third blow, a sea-green cone, and on a hit she is pulled 1.5 m in
function hookStrike(a, pl, tg) {
  killTele(a.tele); a.tele = null;
  for (let i = 1; i <= 6; i++) P({ x: a.x + Math.sin(a.rot) * i * 0.4, y: 1.1, z: a.z + Math.cos(a.rot) * i * 0.4, life: 0.25, size: 0.22, size1: 0.04, color: 0x9affd8 });
  Audio.sfx('swingHeavy', { x: a.x, z: a.z, vol: 0.7 });
  if (!meleeLands(a, tg, 2.4, 0.62)) { tally(a, 'hookMissed'); return; }
  const n = hitHero(a, pl, 1.0, { target: tg });
  if (n > 0 && tg.hero && pullHero(a.x, a.z, 1.5, 0.25, 'hud.hooked', a.radius + tg.radius + 0.5)) tally(a, 'hooked');
}

// ---------- the Harpooner: keeps 7-10 m off and throws; every third throw is the reel (0.9 s of warning, a sea-green line
// through her): a hit drags her 4 m toward him (2 m in lamp light), a roll in the warning slips it. A miss sticks in the
// ground for a second (and cracks thin ice); a rope runs from his hand to the harpoon while it flies ----------
const ROPES = new Map();
let ropeG = null, ropeM = null;
function rope() {
  ropeG ||= new THREE.CylinderGeometry(0.018, 0.018, 1, 4, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
  ropeM ||= new THREE.MeshBasicMaterial({ color: 0xc8b48a });
  const m = new THREE.Mesh(ropeG, ropeM); m.frustumCulled = false; R.scene.add(m);
  return m;
}
const _ra = new THREE.Vector3(), _rb = new THREE.Vector3();
function ropeTo(m, ax, ay, az, bx, by, bz) {
  _ra.set(ax, ay, az); _rb.set(bx, by, bz);
  m.position.copy(_ra); m.lookAt(_rb); m.scale.set(1, 1, Math.max(0.01, _ra.distanceTo(_rb)));
}
function dropRope(a) { if (a.rope) { R.scene.remove(a.rope.mesh); ROPES.delete(a.rope.mesh); a.rope = null; } }
function harpooner(a, dt, pl, d) {
  if (!aggroCheck(a, pl, d)) return idle(a, dt);
  const map = G.zone.map, tg = victim(a, pl), td = Math.hypot(tg.x - a.x, tg.z - a.z);
  if (a.state === 'reel') {
    // the warning: the coil glints, the rope creaks, the line lies through her
    a.atkT += dt;
    if (Math.random() < 0.5) { const h = a.coil ? a.avatar?.bonePoint('spine_03', _ra, 0, 0.1, -0.1) : null; P({ x: (h?.x ?? a.x) + rand.range(-0.2, 0.2), y: (h?.y ?? 1.3) + rand.range(-0.2, 0.2), z: (h?.z ?? a.z) + rand.range(-0.2, 0.2), life: 0.25, size: 0.16, size1: 0.02, color: 0xe8fff4 }); }
    if (a.atkT >= 0.9) { throwHarpoon(a, tg, true); a.state = 'thrown'; a.atkT = 0; }
    return 0;
  }
  if (a.state === 'throw') {
    face(a, tg, dt, 10); a.atkT += dt;
    if (!a.atkHit && a.atkT >= a.atkHitT) { a.atkHit = true; throwHarpoon(a, tg, false); }
    if (a.atkT >= a.atkDur) a.state = 'chase';
    return 0;
  }
  if (a.state === 'thrown') { if ((a.atkT += dt) >= 0.6) a.state = 'chase'; return 0; }
  const los = map.los(a.x, a.z, tg.x, tg.z);
  // (he swims across the deep, but never fights from it: backing off, he keeps to ground she can walk; out in the deep, he
  // wades back toward her before he throws, so no hero is sniped from water she cannot enter)
  if (a.inDeep && td > 3) return seek(a, tg.x, tg.z, a.speed, dt);
  if (td < 4.5 && los) { const ang = angleTo(tg.x, tg.z, a.x, a.z), nx = a.x + Math.sin(ang) * 3, nz = a.z + Math.cos(ang) * 3; if (map.walkable(nx, nz)) return seek(a, nx, nz, a.speed * 0.85, dt); }
  if (td < a.def.reach && los) {
    face(a, tg, dt);
    if (a.cd <= 0 && !a.rope) {
      a.throws = (a.throws || 0) + 1; a.cd = a.def.atkTime * rand.range(0.9, 1.2);
      if (a.throws % a.def.harpoonEvery === 0 && tg.hero) {
        a.state = 'reel'; a.atkT = 0; a.reelDir = a.rot = angleTo(a.x, a.z, tg.x, tg.z); a.reelStamp = pl.dodgeStamp || 0;
        a.tele = teleLine(a.x, a.z, a.reelDir, 11, 1.0, 0.9, SEA);
        a.avatar?.play('throw2', 0.81); Audio.sfx('harpoonReel', { x: a.x, z: a.z }); tally(a, 'reelTell');
      } else { a.state = 'throw'; a.atkT = 0; a.atkHit = false; a.atkHitT = 0.47; a.atkDur = 1.1; a.avatar?.play('throw', 0.85); }
      return 0;
    }
    return 0;
  }
  return seek(a, tg.x, tg.z, a.speed, dt);
}
function throwHarpoon(a, tg, reel) {
  killTele(a.tele); a.tele = null;
  const dir = reel ? a.reelDir : angleTo(a.x, a.z, tg.x, tg.z) + rand.range(-0.05, 0.05);
  const h = a.avatar?.bonePoint('hand_r', _rb) || _rb.set(a.x, 1.5, a.z);
  const sp = reel ? 24 : 16, pl = G.player;
  let p = null;
  p = fire('harpoon', a, h.x, h.z, dir, { y: Math.max(1.1, h.y), dmg: a.dmg * (reel ? 0.9 : 1), speed: sp, life: (reel ? 11.5 : 12) / sp, onHit: (who, q) => harpoonHit(a, who, q), onEnd: (x, z, wall) => harpoonEnd(a, p, x, z, wall) });
  p.reel = reel;
  // she rolled in the warning: it flies through where she was
  if (reel && (pl.dodgeStamp || 0) !== a.reelStamp) { p.hit.add(pl); tally(a, 'reelSlipped'); }
  const held = a.avatar?.held.R; if (held) held.mesh.visible = false;
  dropRope(a); a.rope = { mesh: rope(), p, t: 0 }; ROPES.set(a.rope.mesh, a);
  Audio.sfx('harpoonThrow', { x: a.x, z: a.z }); tally(a, reel ? 'reel' : 'throw');
}
function harpoonHit(a, who, p) {
  p.struck = true;
  const n = damage(a, who, p.dmg, { kx: p.vx, kz: p.vz });
  if (p.reel && n > 0 && who.hero && !a.dead) {
    const lamp = lampLightAt(who.x, who.z);
    if (pullHero(a.x, a.z, lamp ? 2 : 4, 0.4, 'hud.hooked', a.radius + who.radius + 0.6)) { a.rope.hold = who; a.rope.t = 0.5; tally(a, 'reeled'); Audio.sfx('harpoonReel', { x: a.x, z: a.z, vol: 0.9 }); }
  }
}
// a miss: it stands in the ground a second (in thin ice, a crack), or goes into the water
function harpoonEnd(a, p, x, z, wall) {
  if (p.struck) return;
  const w = waterAt(x, z);
  if (w === 'deep') { splashFx(x, z, 0.6); return; }
  if (wall) { sparks(x, 1.2, z, 8, 0xd8dce0, 4); Audio.sfx('hitBone', { x, z, vol: 0.5 }); return; }
  if (iceAt(x, z) === 'thin') crackAt(x, z, 1, 1, { src: 'harpoon' });
  if (!p.mesh) return;
  const m = new THREE.Mesh(p.mesh.geometry, p.mesh.material);
  m.position.set(x, 0.55, z); m.rotation.set(-0.55, Math.atan2(p.vx, p.vz), 0, 'YXZ'); R.scene.add(m);
  puff(x, 0.1, z, 4, 0xe4ecf2, 0.4, 0.5, 0.6);
  const zn = G.zone; later(1, () => { R.scene.remove(m); if (G.zone !== zn) return; puff(x, 0.2, z, 3, 0xe4ecf2, 0.3, 0.3, 0.5); });
}
// the rope from his hand to the flying harpoon; to her while the reel drags her; then reeled in
function ropeTick(a, dt) {
  const r = a.rope, av = a.avatar, h = av?.bonePoint('hand_r', _rb);
  if (!h || a.dead) { dropRope(a); return; }
  const p = r.p, flying = G.projs.includes(p);
  if (flying) { const u = Math.hypot(p.vx, p.vz) || 1; ropeTo(r.mesh, h.x, h.y, h.z, p.x - (p.vx / u) * 0.7, p.y, p.z - (p.vz / u) * 0.7); return; }
  if (r.hold && (r.t -= dt) > 0) { ropeTo(r.mesh, h.x, h.y, h.z, r.hold.x, 1.1, r.hold.z); return; }
  dropRope(a);
  const held = av.held.R; if (held) held.mesh.visible = true;
}

// ---------- the Ice Singer: keeps 8-11 m off and sings (3 s, one at a time in a zone): the ice under the hero cracks two
// stages (r 2.5), or on land the sea comes up under her as brine (r 4, 8 s); a white (or pale) circle shows where for its
// last second. A blow of 6% of her life, a stun or a beam breaks it; in lamp light it comes to nothing. Close in, she wails ----------
function singer(a, dt, pl, d) {
  if (!aggroCheck(a, pl, d)) return idle(a, dt);
  const map = G.zone.map;
  if (a.state === 'song') return songTick(a, dt, pl);
  if (a.state === 'wail') {
    a.atkT += dt;
    if (!a.atkHit && a.atkT >= 0.5) {
      a.atkHit = true; killTele(a.tele); a.tele = null;
      for (let i = 0; i < 18; i++) { const ang = a.rot + rand.range(-0.7, 0.7), sp = rand.range(4, 8); P({ add: false, x: a.x, y: 1.3, z: a.z, vx: Math.sin(ang) * sp, vy: rand.range(-0.3, 0.6), vz: Math.cos(ang) * sp, life: 0.5, size: 0.3, size1: 0.8, color: 0xd8f0ff, alpha: 0.5, alpha1: 0, drag: 3 }); }
      if (inCone(a.x, a.z, a.rot, 4, 0.75, pl)) hitHero(a, pl, 0.6, { slow: { k: 0.3, t: 2 }, cold: 10 });
    }
    if (a.atkT >= 1.0) a.state = 'chase';
    return 0;
  }
  a.wailCd = (a.wailCd ?? 1) - dt;
  if (d < 3.2 && a.wailCd <= 0) {
    a.wailCd = 4.5; a.state = 'wail'; a.atkT = 0; a.atkHit = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z);
    a.tele = teleCone(a.x, a.z, a.rot, 4, 0.75, 0.5, 0xff8040);
    a.avatar?.play('wail', 1.1); Audio.sfx('singerWail', { x: a.x, z: a.z }); tally(a, 'wail');
    return 0;
  }
  const los = map.los(a.x, a.z, pl.x, pl.z);
  if (a.cd <= 0 && d < 13 && los && songToken(a)) {
    a.state = 'song'; a.atkT = 0; a.songHp = a.hp; a.interrupted = false; a.songAt = null;
    a.avatar?.play('song', 1, { loop: true }); Audio.sfx('singerSong', { x: a.x, z: a.z }); tally(a, 'song');
    return 0;
  }
  // keep 8-11 m off, and run from anything closer than 5
  if (d < 8 && los) { const ang = angleTo(pl.x, pl.z, a.x, a.z), nx = a.x + Math.sin(ang) * 3, nz = a.z + Math.cos(ang) * 3; if (map.walkable(nx, nz) || a.swim) return seek(a, nx, nz, a.speed * (d < 5 ? 1 : 0.6), dt); }
  if (d > 11 || !los) return seek(a, pl.x, pl.z, a.speed, dt);
  face(a, pl, dt);
  return 0;
}
// one song at a time in a zone (the sea's own telegraphs are enough on a phone's screen)
function songToken(a) {
  const z = G.zone, h = z.songBy;
  if (h && h !== a && !h.dead && !h.removed && h.state === 'song') return false;
  z.songBy = a; return true;
}
// a blow, a stun or a beam breaks her song (a ring of it scattering)
function songBreak(a) {
  a.state = 'chase'; a.cd = 4; killTele(a.tele); a.tele = null; a.avatar?.anim.stop?.(0.15);
  ring(a.x, a.z, 1.6, SONG, 0.4); glowBurst(a.x, 1.4, a.z, SONG, 14, 2.5, 0.2, 0.5); Audio.sfx('hitSpirit', { x: a.x, z: a.z, vol: 0.6 });
  tally(a, 'songBroken');
}
function songTick(a, dt, pl) {
  a.atkT += dt;
  const broke = interrupted(a) || a.songHp - a.hp >= a.hpMax * 0.06;
  a.songHp = a.hp;
  if (broke) { songBreak(a); return 0; }
  face(a, pl, dt, 4);
  // the ring about her and the song's wavering line to the hero
  if ((a.ringT = (a.ringT ?? 0) - dt) <= 0) { a.ringT = 0.45; ring(a.x, a.z, 1.3 + Math.sin(a.atkT * 4) * 0.2, SONG, 0.5); }
  if ((a.beamT = (a.beamT ?? 0) - dt) <= 0) { a.beamT = 0.16; const T = a.songAt || pl; bolt(a.x, 1.7, a.z, T.x, a.songAt ? 0.2 : 1.1, T.z, SONG, 0.45); }
  if (Math.random() < 0.4) P({ x: a.x + rand.range(-0.6, 0.6), y: rand.range(0.4, 2), z: a.z + rand.range(-0.6, 0.6), vy: 0.6, life: 0.7, size: 0.1, size1: 0.02, color: 0xe0f4ff });
  // its last second: where it will land is shown
  if (!a.songAt && a.atkT >= 2.0) {
    const thin = iceAt(pl.x, pl.z), ice = thin === 'thin' || thin === 'slush';
    a.songAt = { x: pl.x, z: pl.z, ice };
    a.tele = teleCircle(pl.x, pl.z, ice ? 2.5 : 4, 1.0, ice ? ICE_W : SONG);
  }
  if (a.atkT < 3.0) return 0;
  const T = a.songAt; a.state = 'chase'; a.cd = 7; a.tele = null; a.avatar?.anim.stop?.(0.2);
  if (lampLightAt(T.x, T.z)) {
    // in lamp light the song comes to nothing
    T.fizzled = true; puff(T.x, 0.4, T.z, 10, 0xe8f0f4, 1, T.ice ? 2 : 3, 0.9); Audio.sfx('refreeze', { x: T.x, z: T.z, vol: 0.5 }); tally(a, 'songFizzled');
  } else if (T.ice) {
    crackAt(T.x, T.z, 2.5, 2, { src: 'song' }); freezeCrystals(T.x, T.z, 2.5, 22); tally(a, 'songCracked');
  } else {
    addSapPool(T.x, T.z, 4, 8, a, 'brine'); splashFx(T.x, T.z, 1.4); ring(T.x, T.z, 4, 0x9ad8e8, 0.7); tally(a, 'songBrine');
  }
  emit('iceSong', a, T);
  return 0;
}

// ---------- the Hull-lice: they wait inside something (a hull, a crack in thin ice, a den, a Reefback's rock) and boil out
// together when the hero is near, a pack-mate wakes, or (a hull's) the flood starts; a curled louse is a ball the hero
// rolls through, or knocks hard, to bowl it through its pack ----------
function louse(a, dt, pl, d) {
  if (a.under) return louseUnder(a, dt, pl, d);
  if (a.bowling) return bowlStep(a, dt);
  if (a.bowl) { const b = a.bowl; a.bowl = null; startBowl(a, b.ux, b.uz); return 0; }
  // curled: a ball the hero can roll into
  if (pl.act?.name === 'roll' && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.35) { startBowl(a, Math.sin(pl.rot), Math.cos(pl.rot)); return 0; }
  if ((a.curled -= dt) <= 0) { a.curled = 0; a.dmgTaken = null; a.state = 'chase'; a.rising = 0.7; a.avatar?.play('uncurl', 1.3); }
  return 0;
}
function louseUnder(a, dt, pl, d) {
  if (a.avatar) a.avatar.group.visible = false;
  const pk = a.burstPack;
  // what it waits in, decided the first time: the pack's (gen5: a hull), else a crack if it lies on thin ice, else a den
  if (!a.burst) {
    a.burst = pk?.burst || (iceAt(pk?.x ?? a.x, pk?.z ?? a.z) === 'thin' ? 'ice' : 'den');
    if (a.burst === 'ice' && pk && !pk.cracked) { pk.cracked = true; crackAt(pk.x, pk.z, 1.5, 1, { src: 'lice' }); }
  }
  if (a.emergeIn == null && (a.lookT = (a.lookT ?? 0) - dt) <= 0) {
    a.lookT = 0.25;
    const at = pk || a, near6 = Math.hypot(pl.x - at.x, pl.z - at.z) < 6;
    const mate = a.packId != null && G.actors.some((b) => b !== a && b.packId === a.packId && !b.dead && !b.under && b.aggro);
    // (in lamp light only her own coming brings them out: the Skotos's creatures never stir in it)
    const lit = !!lampLightAt(at.x, at.z), flood = !lit && a.burst === 'hull' && pk?.release > (a.seenRelease ?? 0);
    if (near6 || (mate && !lit) || flood || a.hp < a.hpMax || a.aggro) boilOut(a, pk, flood);
  }
  if (a.emergeIn != null && (a.emergeIn -= dt) <= 0) louseOut(a);
  return 0;
}
function boilOut(a, pk, flood) {
  for (const b of G.actors) if (b.under && b.def.curl && !b.dead && b.emergeIn == null && (b === a || (a.packId != null && b.packId === a.packId))) { b.emergeIn = b === a ? 0 : rand.range(0.1, 0.6); b.seenRelease = pk?.release || 0; if (flood) b.aggro = true; }
  if (!pk) return;
  // the hull rattles, the crack opens wider (the 3 x 3 round it to stage 2), the den spills
  if (a.burst === 'ice') crackAt(pk.x, pk.z, 1.5, 1, { src: 'lice' });
  Audio.sfx('louseSkitter', { x: pk.x, z: pk.z }); tally(a, 'boil:' + a.burst);
}
function louseOut(a) {
  a.under = false; a.hidden = false; a.emergeIn = null; a.y = 0; a.aggro = true; a.rising = 0.9;
  if (a.avatar) { a.avatar.group.visible = true; a.avatar.play('spawn', 1.2); }
  if (a.burst === 'ice') { iceShards(a.x, a.z, 8); splashFx(a.x, a.z, 0.5); }
  else if (a.burst === 'hull') { puff(a.x, 0.4, a.z, 5, 0x5a4a38, 0.6, 0.8, 0.9); for (let i = 0; i < 6; i++) P({ add: false, x: a.x, y: 0.4, z: a.z, vx: rand.range(-2, 2), vy: rand.range(1, 3), vz: rand.range(-2, 2), life: 0.7, size: 0.08, size1: 0.05, color: 0x3a3024, alpha: 1, grav: 12 }); }
  else puff(a.x, 0.2, a.z, 5, 0x8a8478, 0.6, 0.7, 0.8);
  tally(a, 'out');
}
// a ball sent rolling at 9 m/s for up to 7 m: through every foe in its path (heroHit 1, knock 4: the lice it strikes curl
// too), cracking thin ice a stage a cell; it drowns in deep water and bursts against a wall or a big body (0.5x round it)
function startBowl(a, ux, uz) {
  a.curled = 0; a.bowling = { ux, uz, run: 0, hit: new Set([a]), cell: -1 }; a.dmgTaken = 0.25; a.state = 'bowl'; a.kx = a.kz = 0;
  a.rot = Math.atan2(ux, uz);
  a.avatar?.play('roll', 1, { loop: true }); Audio.sfx('louseRoll', { x: a.x, z: a.z }); tally(a, 'bowled');
}
function bowlStep(a, dt) {
  const B = a.bowling, map = G.zone.map, st = 9 * dt, pl = G.player;
  const nx = a.x + B.ux * st, nz = a.z + B.uz * st;
  if (map.blocks(Math.floor(nx), Math.floor(nz))) { louseBurst(a); return 0; }
  a.x = nx; a.z = nz; B.run += st;
  if (Math.random() < 0.5) puff(a.x, 0.1, a.z, 1, 0xd8dee4, 0.4, 0.3, 0.5);
  if (waterAt(a.x, a.z) === 'deep') { a.bowling = null; tally(a, 'bowlDrowned'); drown(G.zone, a); return 0; }
  const c = Math.floor(a.z) * 4096 + Math.floor(a.x);
  if (c !== B.cell) { B.cell = c; if (iceAt(a.x, a.z) === 'thin') crackAt(Math.floor(a.x) + 0.5, Math.floor(a.z) + 0.5, 0.5, 1, { src: 'louse' }); }
  for (const f of near(a.x, a.z, 0.8)) {
    if (B.hit.has(f) || f.dead || f.prop || f.team !== 'foe' || f.under || f.hidden || f.airborne || f.dormant) continue;
    B.hit.add(f);
    if (f.def.big || f.boss) { louseBurst(a); return 0; }
    damage(pl, f, heroHit(1.0, { area: true }), { knock: 4, kx: B.ux, kz: B.uz, area: true, noLoh: true });
    tally(a, 'bowlHit');
  }
  if (B.run >= 7) { a.bowling = null; a.curled = 1.2; a.avatar?.play('curl', 1); }
  return 9;
}
function louseBurst(a) {
  a.bowling = null;
  const pl = G.player;
  explosion(a.x, a.z, 1.5, 0xb8c0d0, { smoke: 0x5a5a68, shake: 0.15 });
  for (const f of foes(a.x, a.z, 1.5)) if (f !== a && !f.prop) damage(pl, f, heroHit(0.5, { area: true }), { knock: 3, kx: f.x - a.x, kz: f.z - a.z, area: true, quiet: true, noLoh: true });
  tally(a, 'bowlBurst');
  kill(a, pl, { burst: true });
}
// a wreck's hull gives up a swarm again at the start of a flood (twice a visit at most): its lice all gone, a new one
on('tideTurn', (ph, z) => {
  if (ph !== 'flood' || !z || z !== G.zone || !G.player) return;
  for (const p of z.packs) {
    if (p.tag !== 'hullSwarm' || !p.spawned || (p.visitRel || 0) >= 2 || Math.hypot(p.x - G.player.x, p.z - G.player.z) > 34) continue;
    p.visitRel = (p.visitRel || 0) + 1; p.release = (p.release || 0) + 1;
    const alive = z.actors.filter((a) => a.packId === p.id && !a.dead).length;
    for (let i = alive; i < Math.min(p.n, 6); i++) {
      const ang = rand.range(0, 6.28), f = z.map.nearestFloor(p.x + Math.sin(ang) * rand.range(0.4, 1.8), p.z + Math.cos(ang) * rand.range(0.4, 1.8), 3);
      z.actors.push(spawnMonster('hullLouse', f.x, f.z, { packId: p.id }));
    }
  }
});
on('zoneEnter', (id, z) => { for (const p of z?.packs || []) p.visitRel = 0; for (const m of ROPES.keys()) R.scene.remove(m); ROPES.clear(); });

// ---------- the Icemaw: a shape under the ice that hunts from its holes (open water within 14 m of its home). By a hole near
// the hero: 0.6 s of bubbles and a bark, then up with a red line and a sea-green arrow back (0.7 s), the lunge; a hit drags
// her 2.5 m toward the hole. Up (Exposed) it bites what is near, then slides back in. With no hole near her it breaches a
// webbed cell. Never through thick ice, land or lamp light; a hole frozen while it is up strands it ----------
const lurkOK = (x, z) => { const i = iceAt(x, z); return i === 'water' || i === 'thin' || i === 'slush'; };
// is (x, z) open water it can come up through: a hole, broken ice, the sea, closed tide water; not in lamp light
function holeAt(x, z) { return waterAt(x, z) === 'deep' && !lampLightAt(x, z); }
function lurker(a, dt, pl, d) {
  if (a.lurk == null) lurkInit(a);
  if (!a.lurk) return AI.pounce(a, dt, pl, d);
  const L = a.lurk;
  if (a.under) return lurkUnder(a, dt, pl, d, L);
  if (a.state === 'surface') {
    a.atkT += dt;
    if (Math.random() < 0.6) splashFx(L.hole.x + rand.range(-0.6, 0.6), L.hole.z + rand.range(-0.6, 0.6), 0.3);
    if (a.atkT < 0.7) return 0;
    a.state = 'lunge'; a.atkT = 0; L.run = 0; L.hit = false;
    a.avatar?.play('lunge', 1.6); Audio.sfx('sealLunge', { x: a.x, z: a.z }); tally(a, 'lunge');
    return 0;
  }
  if (a.state === 'lunge') {
    // 5 m of body out of the water in a third of a second; its head reaches 7
    const st = Math.min(16 * dt, 5 - L.run), nx = a.x + Math.sin(L.dir) * st, nz = a.z + Math.cos(L.dir) * st;
    if (!G.zone.map.blocks(Math.floor(nx), Math.floor(nz)) && (G.zone.map.walkable(nx, nz) || waterAt(nx, nz) === 'deep')) { a.x = nx; a.z = nz; L.run += st; } else L.run = 5;
    if (!L.hit && !pl.dead && inLine(L.hole.x, L.hole.z, L.dir, Math.min(7, L.run + 2.2), 1.6, pl)) {
      L.hit = true;
      // a bite: it stops on her and hauls back toward its hole with her
      if (hitHero(a, pl, 1.4) > 0) { a.avatar?.play('drag', 1); if (pullHero(L.hole.x, L.hole.z, 2.5, 0.45, 'hud.dragged', 0.6)) tally(a, 'dragged'); L.recoil = 0.45; L.run = 5; }
    }
    if (L.run < 5) return 16;
    killTele(a.tele); a.tele = null; killTele(L.arrow); L.arrow = null;
    a.state = 'up'; L.upT = 3; a.cd = 0.6;
    addVuln(a, 'exposed', 6); puff(a.x, 0.2, a.z, 6, 0xe4ecf2, 0.9, 1, 0.8);
    return 0;
  }
  if (a.state === 'stranded') {
    a.atkT += dt;
    if (Math.random() < 0.3) puff(a.x, 0.15, a.z, 1, 0xe4ecf2, 0.5, 0.6, 0.6);
    if (a.atkT < 4) return 0;
    // then it wriggles for the nearest water it can go down into, at 1.2 m/s
    const h = L.back ||= lurkHole(a, a.x, a.z, 14);
    if (!h || !holeAt(h.x, h.z)) { L.back = null; return 0; }
    if (Math.hypot(h.x - a.x, h.z - a.z) < 1.2 + a.radius * 0.5) { L.hole = h; L.back = null; slideIn(a, L); return 0; }
    return crawl(a, h.x, h.z, 1.2, dt, true);
  }
  if (a.state === 'slide') {
    // (the clip takes it back and down into the hole behind it; a stand-in sinks)
    a.atkT += dt;
    if (a.avatar?.standIn) a.y = -Math.max(0, a.atkT - 0.3) * 2;
    if (a.atkT >= 1.15 || a.avatar?.anim.under) { a.x = L.hole.x; a.z = L.hole.z; goUnder(a, L); }
    return 0;
  }
  if (a.state === 'bite') {
    a.atkT += dt;
    if (!a.atkHit && a.atkT >= 0.5) { a.atkHit = true; killTele(a.tele); a.tele = null; Audio.sfx('wolfAttack', { x: a.x, z: a.z, vol: 0.8 }); if (meleeLands(a, pl, 2.2 + a.radius, 0.85)) hitHero(a, pl, 1.1); }
    if (a.atkT >= 0.9) a.state = 'up';
    return 0;
  }
  // up on the ice: its hole frozen under it strands it
  if (!holeAt(L.hole.x, L.hole.z) || seaSkinned(L.hole)) { strand(a, L); return 0; }
  if (L.recoil > 0) { L.recoil -= dt; const v = crawl(a, L.hole.x, L.hole.z, 5, dt, true); if (Math.hypot(L.hole.x - a.x, L.hole.z - a.z) < 1.4 + a.radius * 0.6) L.recoil = 0; return v; }
  L.upT -= dt;
  if (L.upT > 0 && d < 2.2 + a.radius + pl.radius && a.cd <= 0) {
    a.state = 'bite'; a.atkT = 0; a.atkHit = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z); a.cd = a.def.atkTime;
    a.tele = teleCone(a.x, a.z, a.rot, 2.2 + a.radius, 0.85, 0.5, 0xff6a30);
    a.avatar?.play('bite', 1, { hitIn: 0.5 }); tally(a, 'bite');
    return 0;
  }
  // back to the hole, facing the hero, and down tail first
  const back = Math.hypot(L.hole.x - a.x, L.hole.z - a.z);
  if (L.upT <= 0) {
    if (back < 1.4 + a.radius * 0.6) { slideIn(a, L); return 0; }
    return crawl(a, L.hole.x, L.hole.z, a.speed * 1.4, dt, true);
  }
  face(a, pl, dt, 4);
  return 0;
}
// the hole nearest (x, z) within r that it can use: open water, not lamp-lit, within 14 m of its home
function lurkHole(a, x, z, r) {
  const L = a.lurk, h = holeNear(x, z, r);
  if (!h || !holeAt(h.x, h.z) || Math.hypot(h.x - L.home.x, h.z - L.home.z) > 14) return null;
  return h;
}
// the sea's own water (L.sea: the Fall's holes, a Breathing-hole) does not freeze; a beam on it or a Frost Nova by it (the
// last 1.5 s) skins it over long enough to strand what is up
function seaSkinned(h) {
  const L = G.zone.L, i = Math.floor(h.z) * L.w + Math.floor(h.x);
  if (!L.sea?.[i]) return false;
  return !!inBeam(h.x, h.z) || clock - (NOVA.t ?? -99) < 1.5 && Math.hypot(NOVA.x - h.x, NOVA.z - h.z) < NOVA.r + 1;
}
function lurkInit(a) {
  // its home: the open water nearest where it was put, else the thin ice (it comes up only where the ice gives, then)
  let h = holeNear(a.x, a.z, 14);
  if (!h) for (let r = 0; r <= 8 && !h; r++) for (let k = 0; k < 8 && !h; k++) { const x = a.x + Math.sin(k * 0.785) * r, z = a.z + Math.cos(k * 0.785) * r; if (iceAt(x, z) === 'thin') h = { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 }; }
  if (!h) { a.lurk = false; return; }
  a.lurk = { home: { x: h.x, z: h.z }, hole: h, aim: null, trapT: 0 };
  a.x = h.x; a.z = h.z; a.home = { x: h.x, z: h.z };
  goUnder(a, a.lurk, true);
}
function goUnder(a, L, quiet) {
  a.under = true; a.hidden = true; a.state = 'chase'; a.y = -1.5; a.dmgTaken = null; a.kx = a.kz = 0;
  if (a.avatar) { a.avatar.group.visible = false; a.avatar.anim.stop?.(0); }
  clearVuln(a, 'exposed'); clearVuln(a, 'stranded');
  L.aim = null; L.tellT = 0; L.back = null;
  a.cd = quiet ? rand.range(0.5, 2) : rand.range(2.5, 4);
  if (!quiet) { splashFx(a.x, a.z, 1); tally(a, 'under'); }
}
function slideIn(a, L) {
  a.state = 'slide'; a.atkT = 0; a.rot = angleTo(L.hole.x, L.hole.z, a.x, a.z);
  a.avatar?.play('slide', 1); splashFx(L.hole.x, L.hole.z, 0.8); Audio.sfx('icemawDive', { x: L.hole.x, z: L.hole.z });
}
function strand(a, L) {
  a.state = 'stranded'; a.atkT = 0; killTele(a.tele); a.tele = null; L.back = null;
  addVuln(a, 'stranded', 4); a.avatar?.play('stranded', 1, { loop: true });
  Audio.sfx('sealBark', { x: a.x, z: a.z, pitch: 1.3 }); tally(a, 'stranded');
}
// a wriggle over the ice toward (x, z), backwards if it keeps its face to the hero
function crawl(a, x, z, sp, dt, backward) {
  const dx = x - a.x, dz = z - a.z, l = Math.hypot(dx, dz) || 1, v = sp * moveMul(a);
  const nx = a.x + (dx / l) * v * dt, nz = a.z + (dz / l) * v * dt;
  if (!G.zone.map.blocks(Math.floor(nx), Math.floor(nz))) { a.x = nx; a.z = nz; }
  turnTo(a, backward ? Math.atan2(-dx, -dz) : Math.atan2(dx, dz), 6, dt);
  return v;
}
// under the ice: hunting at 7 m/s through water and thin ice only (its shape shows through the ice, sea.js uShade; over
// open water a dark shape and a trail of bubbles)
function lurkUnder(a, dt, pl, d, L) {
  if (a.avatar) a.avatar.group.visible = false;
  if (L.trapT > 0) { L.trapT -= dt; if (Math.random() < 0.2) P({ x: a.x, y: 0.05, z: a.z, vy: 0.3, life: 0.5, size: 0.1, size1: 0.02, color: 0xd8f0ff }); return 0; }
  bubbles(a, dt);
  // it feels her on the ice above it (16 m, no sight needed)
  if (!a.aggro && d < 16 && !pl.dead) { a.aggro = true; tally(a, 'senses'); }
  if (!aggroCheck(a, pl, d)) {
    // patrolling under, round its home
    if (!L.aim || Math.hypot(L.aim.x - a.x, L.aim.z - a.z) < 1) { const ang = rand.range(0, 6.28), r = rand.range(2, 7); L.aim = { x: L.home.x + Math.sin(ang) * r, z: L.home.z + Math.cos(ang) * r, idle: true }; }
    return swimUnder(a, L.aim.x, L.aim.z, a.def.underSpeed * 0.3, dt) || ((L.aim = null), 0);
  }
  // a breach or a hole by her, chosen twice a second; else it stalks under her
  if ((L.pickT = (L.pickT ?? 0) - dt) <= 0) {
    L.pickT = 0.5;
    const h = lurkHole(a, pl.x, pl.z, 6), b = h ? null : breachCell(a, pl);
    L.target = h ? { x: h.x, z: h.z } : b ? { x: b.x, z: b.z, breach: true } : null;
  }
  const T = L.target;
  if (L.tellT > 0) {
    // the warning at the hole: bubbles boiling up, a bulge of water, a bark
    L.tellT -= dt;
    if (Math.random() < 0.8) P({ x: a.x + rand.range(-0.8, 0.8), y: 0.05, z: a.z + rand.range(-0.8, 0.8), vy: rand.range(0.4, 1.2), life: 0.5, size: rand.range(0.08, 0.2), size1: 0.02, color: 0xe8f6ff });
    if (L.tellT <= 0) mawUp(a, L, pl);
    return 0;
  }
  if (T && Math.hypot(T.x - pl.x, T.z - pl.z) < 7 && a.cd <= 0) {
    if (Math.hypot(T.x - a.x, T.z - a.z) < 0.9) {
      L.hole = { x: T.x, z: T.z };
      if (T.breach) { breach(a, L, pl); return 0; }
      L.tellT = 0.6; a.x = T.x; a.z = T.z;
      ring(a.x, a.z, 1.4, 0xd8ecf4, 0.6); puff(a.x, 0.1, a.z, 5, 0xd8e8f0, 0.8, 0.9, 0.7);
      Audio.sfx('sealBark', { x: a.x, z: a.z }); tally(a, 'tell');
      return 0;
    }
    return swimUnder(a, T.x, T.z, a.def.underSpeed, dt);
  }
  // no way up near her: under her, if the ice lets it
  return lurkOK(pl.x, pl.z) && Math.hypot(pl.x - L.home.x, pl.z - L.home.z) < 16 ? swimUnder(a, pl.x, pl.z, a.def.underSpeed * 0.6, dt) : swimUnder(a, L.home.x, L.home.z, a.def.underSpeed * 0.4, dt);
}
// straight on under the ice and through the water; land and thick ice turn it aside
function swimUnder(a, x, z, sp, dt) {
  const dx = x - a.x, dz = z - a.z, l = Math.hypot(dx, dz); if (l < 0.05) return 0;
  const base = Math.atan2(dx, dz), st = Math.min(sp * dt, l);
  for (const o of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
    const ang = base + o, nx = a.x + Math.sin(ang) * st, nz = a.z + Math.cos(ang) * st;
    if (!lurkOK(nx, nz) || (L5home(a, nx, nz))) continue;
    a.x = nx; a.z = nz; a.rot = dampAngle(a.rot, ang, 8, dt);
    return sp;
  }
  return 0;
}
const L5home = (a, x, z) => Math.hypot(x - a.lurk.home.x, z - a.lurk.home.z) > 15;
function bubbles(a, dt) {
  if (iceAt(a.x, a.z) !== 'water') return;
  // over open water: a dark shape and its bubbles
  if (Math.random() < dt * 14) P({ add: false, x: a.x + rand.range(-0.3, 0.3), y: 0.03, z: a.z + rand.range(-0.3, 0.3), life: 0.35, size: 1.6, size1: 1.9, color: 0x06121a, alpha: 0.32, alpha1: 0 });
  if (Math.random() < dt * 8) P({ x: a.x + rand.range(-0.5, 0.5), y: 0.04, z: a.z + rand.range(-0.5, 0.5), vy: 0.6, life: 0.5, size: 0.1, size1: 0.02, color: 0xe8f6ff });
}
// a webbed cell (stage 2 or worse) within 4 m of her that it can reach under the ice, not in lamp light
function breachCell(a, pl) {
  let best = null, bd = 17;
  for (let k = 0; k < 81; k++) {
    const x = Math.floor(pl.x) + (k % 9) - 4 + 0.5, z = Math.floor(pl.z) + Math.floor(k / 9) - 4 + 0.5, d2 = (x - pl.x) ** 2 + (z - pl.z) ** 2;
    if (d2 >= bd || stageAt(x, z) < 2 || iceAt(x, z) !== 'thin' || lampLightAt(x, z) || L5home(a, x, z)) continue;
    bd = d2; best = { x, z };
  }
  return best;
}
// it bursts up through the webbed ice: the cell goes, the ice round it takes two stages; up at once, Exposed
function breach(a, L, pl) {
  breakAt(L.hole.x, L.hole.z, 0.6); crackAt(L.hole.x, L.hole.z, 1.5, 2, { src: 'breach' });
  a.x = L.hole.x; a.z = L.hole.z;
  iceShards(a.x, a.z, 16); splashFx(a.x, a.z, 1.2); shake(0.3);
  Audio.sfx('iceBreak', { x: a.x, z: a.z }); tally(a, 'breach');
  mawUp(a, L, pl);
}
function mawUp(a, L, pl) {
  a.under = false; a.hidden = false; a.state = 'surface'; a.atkT = 0; a.y = 0;
  L.dir = a.rot = angleTo(L.hole.x, L.hole.z, pl.x, pl.z);
  if (a.avatar) { a.avatar.group.visible = true; a.avatar.group.position.set(a.x, a.y, a.z); a.avatar.play('surface', 2.2); }
  a.tele = teleLine(L.hole.x, L.hole.z, L.dir, 7, 1.6, 0.7, 0xff4020);
  // the drag's way, back toward the hole
  L.arrow = teleLine(L.hole.x + Math.sin(L.dir) * 6.5, L.hole.z + Math.cos(L.dir) * 6.5, L.dir + Math.PI, 4.5, 0.5, 0.7, SEA);
  splashFx(L.hole.x, L.hole.z, 1.1); Audio.sfx('icemawSurface', { x: a.x, z: a.z });
}
// what a Frost Nova does to the Icemaws: one under a hole it covers is held below 6 s (and a sea hole skins over a moment)
const NOVA = { t: -99, x: 0, z: 0, r: 0 };
on('frostNova', (x, z, r) => {
  Object.assign(NOVA, { t: clock, x, z, r });
  for (const a of G.actors) if (a.lurk && a.under && !a.dead && Math.hypot(a.x - x, a.z - z) < r + 1) { a.lurk.trapT = 6; a.lurk.tellT = 0; tally(a, 'trapped'); freezeCrystals(a.x, a.z, 1.2, 10); }
});
// through the ice under it: it goes down there (the hole is its now)
FALLS.icemaw = (a) => { if (!a.lurk) return false; a.lurk.hole = { x: Math.floor(a.x) + 0.5, z: Math.floor(a.z) + 0.5 }; killTele(a.tele); a.tele = null; goUnder(a, a.lurk); return true; };
// the shapes under the ice: the three Icemaws under it nearest the hero (sea.js uShade slots 0-2), faded in and out
const SHADE = [0, 0, 0];
function shadeTick(dt) {
  // (a rope whose thrower is gone, however it went)
  for (const [m, a] of ROPES) if (a.removed || a.dead || a.rope?.mesh !== m) { R.scene.remove(m); ROPES.delete(m); if (a.rope?.mesh === m) a.rope = null; }
  const pl = G.player; if (!pl) return;
  const under = G.actors.filter((a) => a.lurk && a.under && !a.dead && Math.abs(a.x - pl.x) < 30 && Math.abs(a.z - pl.z) < 30).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z));
  for (let i = 0; i < 3; i++) {
    const a = under[i], on = a && iceAt(a.x, a.z) !== 'water' && !(a.lurk.trapT > 0);
    SHADE[i] = damp(SHADE[i], on ? 1 : 0, 6, dt);
    if (a) setShade(i, a.x, a.z, 1.25 * (a.scale || 1), SHADE[i]); else setShade(i, 0, 0, 1, SHADE[i]);
  }
}

// ---------- the Reefback: the brute's slow claws behind a guard (it turns 1.8 rad/s: roll past it and its back is open);
// claw a 3.2 m cone (0.8 s), every third a slam (2.4 m, 1.0 s) that cracks thin ice two stages ----------
function reef(a, dt, pl, d) {
  if (!aggroCheck(a, pl, d)) return idle(a, dt);
  if (a.state === 'attack') {
    if (attackTick(a, dt)) {
      killTele(a.tele); a.tele = null;
      if (a.slam) {
        explosion(a.x, a.z, 2.4, 0xb0a890, { smoke: 0x5a5a60, shake: 0.4 }); Audio.sfx('slam', { x: a.x, z: a.z });
        if (Math.hypot(pl.x - a.x, pl.z - a.z) < 2.4 + pl.radius * 0.5 + a.radius * 0.3) hitHero(a, pl, 1.3, { stun: 0.4 });
        crackAt(a.x, a.z, 2.4, 2, { src: 'slam' }); tally(a, 'slam');
      } else {
        const fx = a.x + Math.sin(a.rot) * 2, fz = a.z + Math.cos(a.rot) * 2; puff(fx, 0.3, fz, 5, 0x6a6a70, 0.9, 0.9);
        Audio.sfx('swingHeavy', { x: a.x, z: a.z, vol: 0.7 });
        if (inCone(a.x, a.z, a.rot, 3.2 + a.radius * 0.3, 0.75, pl)) hitHero(a, pl, 1.1);
      }
    }
    return 0;
  }
  if (d < a.def.reach + pl.radius + 0.2) {
    face(a, pl, dt, 5);
    if (a.cd <= 0) {
      a.slams = (a.slams || 0) + 1; a.slam = a.slams % 3 === 0;
      a.tele = a.slam ? teleCircle(a.x, a.z, 2.4 + a.radius * 0.3, 1.0, 0xff7020) : teleCone(a.x, a.z, a.rot, 3.2 + a.radius * 0.3, 0.75, 0.8, 0xff8030);
      startAttack(a, a.slam ? 'slam' : 'attack', { hit: a.slam ? 1.0 : 0.8, dur: a.slam ? 1.7 : 1.3, speed: 1 });
      a.cd = a.def.atkTime;
    }
    return 0;
  }
  return seek(a, pl.x, pl.z, a.speed, dt);
}

// ---------- the Rime Bear's Frost Roar: a 5 m cone (0.8 s): Cold +15, a 20% slow for 2 s, every thin cell within 4 m a stage ----------
function roar(a, dt, pl) {
  a.atkT += dt;
  if (!a.atkHit && a.atkT >= 0.8) {
    a.atkHit = true; killTele(a.tele); a.tele = null;
    const hx = a.x + Math.sin(a.rot) * 1.3 * (a.scale || 1), hz = a.z + Math.cos(a.rot) * 1.3 * (a.scale || 1);
    for (let i = 0; i < 30; i++) { const ang = a.rot + rand.range(-0.55, 0.55), sp = rand.range(3, 7); P({ add: false, x: hx, y: 1.2, z: hz, vx: Math.sin(ang) * sp, vy: rand.range(-0.2, 0.5), vz: Math.cos(ang) * sp, life: rand.range(0.6, 1.0), size: 0.4, size1: 1.5, color: 0xa8d0ec, alpha: 0.6, alpha1: 0, drag: 2 }); }
    for (let i = 0; i < 16; i++) { const ang = a.rot + rand.range(-0.6, 0.6), sp = rand.range(4, 9); P({ x: hx, y: 1.1, z: hz, vx: Math.sin(ang) * sp, vy: rand.range(0, 0.6), vz: Math.cos(ang) * sp, life: 0.5, size: 0.14, size1: 0.03, color: 0xe8f8ff, color1: 0x6ab0e8, drag: 2 }); }
    ring(a.x, a.z, 4, 0x9ad0f0, 0.6); freezeCrystals(a.x, a.z, 4, 24); shake(0.4);
    Audio.sfx('frostRoar', { x: a.x, z: a.z }); Audio.sfx('frost', { x: a.x, z: a.z, vol: 0.6 });
    if (inCone(a.x, a.z, a.rot, 5, 0.6, pl) && !(pl.iframes > 0) && !pl.dead) { coldAdd(15); pl.status.slow = Math.max(pl.status.slow, 2); pl.status.slowK = Math.max(pl.status.slowK, 0.2); tally(a, 'roarHit'); }
    crackAt(a.x, a.z, 4, 1, { src: 'roar' });
  }
  if (a.atkT >= 1.5) a.state = 'chase';
  return 0;
}

// ---------- the Skuas: a flock on its roost (the whale's skull, a mast) that takes off when the hero comes within 10 m and
// circles her high (out of reach); they come down only at a hero out in the dark (beyond every pool and beam: the Cradle's
// own ring does not count), two at a time; a beam or burning oil within 6 m scatters them ----------
let castRay = null;
function perchY(p) {
  if (!p.top) return 0;
  if (p.y != null) return p.y;
  const g = G.zone?.lvl?.group; p.y = 0;
  if (!g) return 0;
  castRay ||= new THREE.Raycaster();
  castRay.set(_ra.set(p.x, 14, p.z), _rb.set(0, -1, 0)); castRay.far = 14;
  const hit = castRay.intersectObject(g, true).find((h) => h.object.visible && h.point.y > 0.3);
  p.y = hit ? Math.min(6, hit.point.y) : 0;
  return p.y;
}
function skua(a, dt, pl, d) {
  if (a.fly == null) {
    a.fly = a.perch ? 'roost' : 'sky'; a.hy = rand.range(4.2, 5.4); a.orbR = rand.range(5.5, 7.5); a.orbDir = rand.sign();
    a.y = a.perch ? perchY(a.perch) : a.hy; a.airborne = !a.perch;
  }
  // scattered: a beam over it, burning oil near (up and away from the light, crying)
  if ((a.oilT = (a.oilT ?? 0) - dt) <= 0) { a.oilT = 0.5; if (G.areas.some((f) => f.kind === 'fire' && f.floats && f.t < f.dur && Math.hypot(f.x - a.x, f.z - a.z) < 6)) a.status.fear = Math.max(a.status.fear, 3); }
  if (a.status.fear > 0 && a.fly !== 'roost') {
    if (a.fly === 'dive') { a.fly = 'climb'; tally(a, 'diveScattered'); }
    a.y = damp(a.y, a.hy + 2, 2, dt); a.airborne = a.y > 2.2;
    if (Math.random() < dt * 0.8) Audio.sfx('skuaCry', { x: a.x, z: a.z, vol: 0.5 });
    const away = angleTo(pl.x, pl.z, a.x, a.z) + (a.orbDir * 0.6);
    return fly(a, a.x + Math.sin(away) * 4, a.z + Math.cos(away) * 4, a.speed * 1.1, dt);
  }
  if (a.fly === 'roost') {
    if (!a.perched && !a.avatar?.anim.busy) { a.perched = true; a.avatar?.play('perch', 1, { loop: true }); }
    if (d < 10 || a.hp < a.hpMax || a.aggro || a.status.fear > 0) {
      // the flock goes up together, a beat apart
      for (const b of G.actors) if (b.fly === 'roost' && (b === a || (a.packId != null && b.packId === a.packId))) { b.fly = 'rise'; b.liftT = b === a ? 0 : rand.range(0.05, 0.6); b.aggro = true; }
    }
    return 0;
  }
  if (a.fly === 'rise') {
    if ((a.liftT -= dt) > 0) return 0;
    if (!a.lifting) { a.lifting = true; a.y0 = a.y; a.avatar?.play('takeoff', 1); if (Math.random() < 0.4) Audio.sfx('skuaCry', { x: a.x, z: a.z, vol: 0.6 }); puff(a.x, a.y + 0.1, a.z, 3, 0xd8d4cc, 0.5, 0.5, 0.6); }
    const k = a.avatar?.anim.liftK ?? 1;
    a.y = Math.max(a.y, a.y0 + k * 1.2);
    if (k >= 1 || !a.avatar?.anim.busy) a.y = Math.min(a.hy, a.y + dt * 3.5);
    a.airborne = a.y > 2.2;
    const v = fly(a, a.x + Math.sin(a.rot) * 2, a.z + Math.cos(a.rot) * 2, a.speed * 0.35 * k, dt);
    if (a.y >= a.hy) { a.fly = 'sky'; a.lifting = false; a.avatar?.play('glide', 1, { loop: true }); }
    return v;
  }
  if (a.fly === 'dive') {
    // down in a stoop, through her, and up again; out of the stoop if she gets into light
    a.atkT += dt;
    const lit = lightAt(pl.x, pl.z, { ring: false }), td = Math.hypot(pl.x - a.x, pl.z - a.z);
    if (lit && !a.atkHit) { a.fly = 'climb'; tally(a, 'diveBroken'); return 0; }
    a.y = Math.max(0.9, damp(a.y, td < 3 ? 0.9 : 1.6, 5, dt)); a.airborne = a.y > 2.2;
    if (!a.atkHit && td < a.def.reach + pl.radius + 0.2 && a.y < 1.6) {
      a.atkHit = true; a.avatar?.play('bite', 1.4);
      hitHero(a, pl, 1, { cold: a.def.coldBite }); tally(a, 'bite');
    }
    if (a.atkHit || a.atkT > 2.2) { a.fly = 'climb'; a.climbDir = a.rot; }
    return fly(a, pl.x + Math.sin(a.rot) * 0.6, pl.z + Math.cos(a.rot) * 0.6, a.speed * 1.45, dt);
  }
  if (a.fly === 'climb') {
    a.y = Math.min(a.hy, a.y + dt * 3); a.airborne = a.y > 2.2;
    if (a.y >= a.hy) { a.fly = 'sky'; a.cd = rand.range(1.5, 3); a.avatar?.play('glide', 1, { loop: true }); releaseDive(a); }
    const dir = a.climbDir ?? a.rot;
    return fly(a, a.x + Math.sin(dir) * 3, a.z + Math.cos(dir) * 3, a.speed, dt);
  }
  if (a.fly === 'home') {
    const p = a.perch, py = perchY(p), dh = Math.hypot(p.x - a.x, p.z - a.z);
    if (d < 12) { a.fly = 'sky'; return 0; }
    if (dh > 0.4) { a.y = damp(a.y, dh < 3 ? py + 0.6 : a.hy, 2, dt); return fly(a, p.x, p.z, a.speed * 0.6, dt); }
    a.x = p.x; a.z = p.z; a.y = py; a.airborne = false; a.fly = 'roost'; a.perched = false; a.aggro = false; a.avatar?.play('land', 1);
    return 0;
  }
  // circling her high, out of reach, crying; wider while she stands in light
  a.airborne = a.y > 2.2;
  const lit = lightAt(pl.x, pl.z, { ring: false });
  a.y = damp(a.y, a.hy + Math.sin(a.t * 1.7 + a.id) * 0.3, 2, dt);
  a.orb = (a.orb ?? angleTo(pl.x, pl.z, a.x, a.z)) + dt * (a.speed / (lit ? 10 : a.orbR)) * a.orbDir;
  const r = lit ? 9.5 : a.orbR;
  if (Math.random() < dt * 0.25) Audio.sfx('skuaCry', { x: a.x, z: a.z, vol: 0.45 });
  // a flock with no hero near goes home to its roost
  if (a.perch && d > 26 && Math.hypot(pl.x - a.home.x, pl.z - a.home.z) > 26) { a.fly = 'home'; return 0; }
  if (!lit && a.cd <= 0 && d < 12 && !pl.dead && diveToken(a)) {
    a.fly = 'dive'; a.atkT = 0; a.atkHit = false; a.rot = angleTo(a.x, a.z, pl.x, pl.z);
    a.avatar?.play('dive', 1, { loop: true }); Audio.sfx('skuaCry', { x: a.x, z: a.z, vol: 0.8 }); tally(a, 'dive');
    return 0;
  }
  return fly(a, pl.x + Math.sin(a.orb) * r, pl.z + Math.cos(a.orb) * r, a.speed, dt);
}
// two stoops at a time in a zone
function diveToken(a) {
  const z = G.zone, n = (z.skuaDives ||= new Set());
  for (const b of n) if (b.dead || b.removed || b.fly !== 'dive') n.delete(b);
  if (n.size >= 2) return false;
  n.add(a); return true;
}
function releaseDive(a) { G.zone.skuaDives?.delete(a); }

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
// bosses, the Amberback and the Rime Bear. D = { vx, vz, t, hit, probe (how far ahead the front is), daze (seconds dazed on
// hitting something solid), sapDaze (seconds dazed on running into fresh sap or slush), trail (sap left behind), crack
// (stones crack), ice (Act V: each thin cell it runs onto cracks a stage, and one already webbed gives way under it: it
// flounders, ice.js), dmg / hitO (what trampling the hero does), w (the drawn line's width: no hit wider than it), dust,
// end(a, D) }. Returns the speed, for the gait.
export function dashStep(a, dt, pl = G.player) {
  const D = a.dash, map = G.zone.map, st = Math.min(dt, D.t);
  D.t -= dt;
  const sp = Math.hypot(D.vx, D.vz) || 1, ux = D.vx / sp, uz = D.vz / sp, pr = D.probe || 0;
  const nx = a.x + D.vx * st, nz = a.z + D.vz * st;
  if (map.walkable(nx, nz) && (!pr || map.walkable(nx + ux * pr, nz + uz * pr))) { a.x = nx; a.z = nz; D.run = (D.run || 0) + sp * st; }
  else { D.t = 0; D.wall = { x: nx + ux * pr, z: nz + uz * pr }; }
  // fresh sap ahead stops it dead (not its own trail, nor sap it started in); so does slush
  if (D.sapDaze && !D.wall && D.t > 0) { const s = stops(a.x + ux * pr * 0.5, a.z + uz * pr * 0.5, D); if (s && !D.inSap) { D.t = 0; D.sap = s; } D.inSap = s; }
  if (D.ice && !D.wall && D.t > 0) iceStep(a, D);
  if (D.ice5 && !D.wall && D.t > 0) rushIce(a, D);
  if (D.trail && (D.run || 0) - (D.lastPool ?? -9) > 3.2) { D.lastPool = D.run; addSapPool(a.x - ux, a.z - uz, 1.5, 5, D); }
  if (Math.random() < 0.7) puff(a.x, 0.3, a.z, 2, D.dust ?? 0x8a8680, 0.8, 0.8, 0.8);
  if (D.drop && (D.run || 0) - (D.lastDrop ?? -9) > D.drop.every) { D.lastDrop = D.run; D.drop.fn(a.x - ux, a.z - uz); }
  const hitR = D.w != null ? Math.min(a.radius + pl.radius + 0.6, D.w / 2 + pl.radius * 0.5) : a.radius + pl.radius + 0.6;
  if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < hitR) { D.hit = true; hitHero(a, pl, D.dmg ?? 1.5, D.hitO ?? { stun: 0.5 }); D.onHit?.(a, pl); shake(0.4); }
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
  if (a.dash.sapDaze) a.dash.inSap = stops(a.x + ux * a.dash.probe * 0.5, a.z + uz * a.dash.probe * 0.5);
  return a.dash;
}
// what stops a charge dead: amber sap and slush (a pool of it, or refrozen ice), never brine (ignore: its own trail)
function stops(x, z, ignore) {
  const s = sapAt(x, z, ignore);
  if (s === 'amber' || s === 'slush') return s;
  return iceAt(x, z) === 'slush' ? 'slush' : null;
}
// a charge on thin ice: each thin cell it runs onto takes a stage; one at 2 or more breaks at once under it, and the charge
// ends there (it flounders when the break's batch closes the cell, ice.js)
function iceStep(a, D) {
  const ix = Math.floor(a.x), iz = Math.floor(a.z), c = iz * 4096 + ix;
  if (c === D.iceCell) return;
  D.iceCell = c;
  if (iceAt(a.x, a.z) !== 'thin') return;
  if (stageAt(a.x, a.z) >= 2) { breakAt(ix + 0.5, iz + 0.5, 0.5); D.t = 0; D.broke = true; tally(a, 'iceBreak'); return; }
  crackAt(ix + 0.5, iz + 0.5, 0.5, 1, { src: 'charge' });
}
function chargeEnd(a, D) {
  // (on thin ice its weight comes down at the end: +1 stage round it; through a webbed cell it is already going under)
  if (D.ice && !D.broke) crackAt(a.x, a.z, 2.5, 1, { src: 'charge' });
  if (D.broke) { a.avatar?.anim.stop?.(0.1); puff(a.x, 0.2, a.z, 8, 0xd8e4ec, 1, 1.2, 1); }
  else if (D.wall && D.daze) { daze(a, D.daze); tally(a, 'hitWall'); if (D.crack) crackStone(a, D.wall); }
  else if (D.sap && D.sapDaze) { daze(a, D.sap === 'slush' ? 2 : D.sapDaze); tally(a, D.sap === 'slush' ? 'hitSlush' : 'hitSap'); const c = D.sap === 'slush' ? 0xc8d4dc : 0xe0a030; for (let i = 0; i < 16; i++) P({ add: false, x: a.x, y: 0.3, z: a.z, vx: rand.range(-3, 3), vy: rand.range(2, 4), vz: rand.range(-3, 3), life: 0.7, size: 0.16, size1: 0.08, color: c, alpha: 1, grav: 14 }); Audio.sfx(D.sap === 'slush' ? 'splash' : 'sapCrack', { x: a.x, z: a.z }); }
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
    for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < r + 0.2) hitHero(a, p, mult);
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
    later(1.0, () => { bolt(x, 14, z, x, 0, z, 0xe0e8ff, 2); explosion(x, z, 1.4, 0xd0e0ff, { smoke: 0x6a6a7a, shake: 0.2 }); Audio.sfx('lightning', { x, z }); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 1.8) damage(a, p, a.dmg * 1.6, { stun: 0.3 }); });
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
    { id: 'pyres', when: (a) => a.phase >= 2, cd: 7, run(a, pl) { for (let i = 0; i < 5; i++) { const x = pl.x + rand.range(-5, 5), z = pl.z + rand.range(-5, 5); if (!G.zone.map.walkable(x, z)) continue; teleCircle(x, z, 1.8, 1.1, 0x4080ff); later(1.1, () => { explosion(x, z, 1.8, 0x4a90ff, { smoke: 0x102040, shake: 0.1 }); area('fire', x, z, 1.5, 4, { team: 'foe', src: a, dmg: a.dmg * 0.4, tick: 0.5 }); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 1.9) hitHero(a, p, 1.0); }); } return { t: 0.4, fn() {}, after: 0.3 }; } }
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
      return { t: 0.5, fn() { lob(a.x + Math.sin(a.rot), a.z + Math.cos(a.rot), tx, tz, 0.8, 5, 0x3a3836, (x, z) => { explosion(x, z, 2.6, 0x9a9080, { smoke: 0x6a6258, shake: 0.3 }); Audio.sfx('slam', { x, z }); for (let i = 0; i < 10; i++) P({ add: false, x, y: 0.5, z, vx: rand.range(-5, 5), vy: rand.range(2, 6), vz: rand.range(-5, 5), life: 1, size: 0.25, size1: 0.2, color: 0x4a4844, alpha: 1, grav: 16 }); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 2.8) hitHero(a, p, 1.4, { stun: 0.3 }); }); }, after: 0.6 };
    } },
    { id: 'charge', when: (a, d) => d > 5 && d < 18, cd: 9, phaseCd: [10, 8, 6.5], run(a, pl) {
      a.rot = angleTo(a.x, a.z, pl.x, pl.z);
      const len = Math.min(18, Math.hypot(pl.x - a.x, pl.z - a.z) + 3);
      a.tele = teleLine(a.x, a.z, a.rot, len, Math.max(3.2, 2 * (a.radius + 1.05)), 0.9, 0xffa040);
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
        later(dl, () => { explosion(x, z, 1.9, 0x9a9080, { smoke: 0x6a6258, shake: 0.12 }); Audio.sfx('slam', { x, z, vol: 0.5 }); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 2.0) hitHero(a, p, 1.0, { stun: 0.25 }); });
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
          for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 1.9) hitHero(a, p, 1.1, { burn: a.dmg * 0.6 });
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
        later(dl, () => { explosion(x, z, 2.4, 0xff6a10, { smoke: 0x2a1a10, shake: 0.35 }); area('fire', x, z, 2, 5, { team: 'foe', src: a, dmg: a.dmg * 0.35, tick: 0.5 }); Audio.sfx('explosion', { x, z, vol: 0.7 }); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 2.5) hitHero(a, p, 1.6, { burn: a.dmg }); });
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
  a.tele = teleLine(a.x, a.z, dir, len, Math.max(3, 2 * (a.radius + 1.05)), wind, last ? 0xffd040 : 0xffc040);
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
      return { t: 0.8, fn() { ring(a.x, a.z, 6, 0xffa040, 0.5); for (let i = 0; i < 6; i++) spikes(a.x + Math.sin(i) * 4, a.z + Math.cos(i) * 4, 1, 0x5a2a18); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); for (const p of heroes()) if (Math.hypot(p.x - a.x, p.z - a.z) < 6.2) hitHero(a, p, 1.2, { push: 34 }); }, after: 0.5 };
    } },
    { id: 'briar', when: (a, d) => !a.rooted && d > 3 && d < 15, phaseCd: [6, 5, 4], run: (a, pl) => briar(a, pl) },
    { id: 'tears', when: (a, d) => d < 18, cd: 8, run: (a, pl) => tears(a, pl) },
    { id: 'spikes', when: (a, d) => a.rooted && d < 22, cd: 3.5, run(a, pl) {
      const x = pl.x, z = pl.z; a.tele = teleCircle(x, z, 1.8, 0.9, 0xc05a20); a.avatar?.play('castUp', 1.3);
      return { t: 0.9, fn() { spikes(x, z, 1.8); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 1.8 + p.radius * 0.5) hitHero(a, p, 1.0); }, after: 0.3 };
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
    return { t: 0.5, fn() { Audio.sfx('swingHeavy', { x: a.x, z: a.z }); for (const p of heroes()) if (meleeLands(a, p, 4.6, 1.0)) hitHero(a, p, 1.0); a.combo++; }, after: 0.2, chain: Math.hypot(G.player.x - a.x, G.player.z - a.z) < 7, chainFn: thornspear };
  }
  const len = a.phase >= 2 ? 8 : 6, dir = a.rot;
  // drawn as wide as it strikes (dashStep: her body, 0.6 m and the hero's own 0.45 m either side)
  a.tele = teleLine(a.x, a.z, dir, len, 2 * (a.radius + 1.05), 0.5, 0xffa020);
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
    later(dl, inZone(a, () => { spikes(x, z, 1.4, 0x5a2a18); for (const p of heroes()) if (!once.hit && Math.hypot(p.x - x, p.z - z) < 1.4 + p.radius * 0.5) { once.hit = true; hitHero(a, p, 1.1, { slow: { k: 0.3, t: 1.5 } }); } }));
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
    later(dl, inZone(a, () => { explosion(x, z, 2.4, 0xffb040, { smoke: 0x4a3018, shake: 0.2 }); addSapPool(x, z, 2, 6); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 2.5) hitHero(a, p, 1.4); }));
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
    for (const p of heroes()) if (meleeLands(a, p, 4.5, 1.0)) hitHero(a, p, step === 2 ? 1.5 : 1, { burn: a.dmg * 0.4 });
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
  return { t: 0.5, fn() { for (const p of heroes()) if (meleeLands(a, p, 4.4, 1.0)) hitHero(a, p, step === 2 ? 1.5 : 1); Audio.sfx('swingHeavy', { x: a.x, z: a.z }); shake(step === 2 ? 0.3 : 0.12); a.combo++; }, after: 0.25, chain: a.combo < 2 && Math.hypot(G.player.x - a.x, G.player.z - a.z) < 5 };
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
      startDash(a, a.grabDir, 13, 4, { probe: 0.4, w: 1.4, dmg: 0.9, hitO: { burn: a.gorged > 0 ? a.dmg * 0.6 : 0 }, onHit: () => { halveCradle(4); tally(a, 'grabbed'); Audio.sfx('smokeGulp', { x: a.x, z: a.z }); }, end: () => { a.avatar?.anim.stop?.(0.2); } });
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
    const D = startDash(a, T.dir, 22, 14, { probe: 0.6, w: 2.4, dmg: 1.3, hitO: { push: 22 }, end: land });
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
    // no nearer for 3 s of one unbroken approach (a gap too narrow for its body): it lets that mould be for 20 s and fights
    const dm0 = m && Math.hypot(m.x - a.x, m.z - a.z);
    if (m && (a.mouldOf !== m || a.t - (a.mouldSeen ?? -1) > 0.25 || dm0 < a.mouldD - 0.25)) { a.mouldOf = m; a.mouldD = dm0; a.mouldStall = 0; }
    else if (m && (a.mouldStall += dt) > 3) { a.mouldSkip = m; a.mouldSkipT = 20; a.mouldOf = null; tally(a, 'mouldGiveUp'); }
    a.mouldSeen = a.t;
    if (m && m !== a.mouldSkip) {
      // the mould is a pit: make for its rim, on this side, and kneel there (a carved cell's corner reaches m.r + 0.71, and
      // the smith's body keeps its radius off it)
      const dm = dm0 || 1, ar = Math.min(a.radius || 0.5, 0.9), f = rimSpot(m, a, dm);
      if (dm < m.r + 0.8 + ar || (Math.hypot(f.x - m.x, f.z - m.z) < m.r + 1.2 && Math.hypot(f.x - a.x, f.z - a.z) < ar + 0.4)) { m.busy = a; startMend(a, 'mould', m, 8); return 0; }
      return seek(a, f.x, f.z, a.speed, dt);
    }
  }
  const los = G.zone.map.los(a.x, a.z, pl.x, pl.z);
  if (d < 6 && los) { const ang = angleTo(pl.x, pl.z, a.x, a.z), nx = a.x + Math.sin(ang) * 3, nz = a.z + Math.cos(ang) * 3; if (G.zone.map.walkable(nx, nz)) return seek(a, nx, nz, a.speed * 0.85, dt); }
  if (d < a.def.reach && los) { face(a, pl, dt); if (a.cd <= 0) startAttack(a, 'throw', { hit: 0.55, dur: 1.0 }); return 0; }
  return seek(a, pl.x, pl.z, a.speed, dt);
}
// the floor at a mould's rim on the smith's side; where clutter stands on it, the free cell nearest the pit beside it
function rimSpot(m, a, dm) {
  const map = G.zone.map, rx = m.x + ((a.x - m.x) / dm) * (m.r + 0.6), rz = m.z + ((a.z - m.z) / dm) * (m.r + 0.6);
  if (map.walkable(rx, rz)) return { x: rx, z: rz };
  let f = { x: rx, z: rz }, bd = Infinity;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const cx = Math.floor(rx) + dx + 0.5, cz = Math.floor(rz) + dz + 0.5;
    if (!map.walkable(cx, cz)) continue;
    const k = Math.hypot(cx - m.x, cz - m.z) + 0.5 * Math.hypot(cx - rx, cz - rz);
    if (k < bd) { bd = k; f = { x: cx, z: cz }; }
  }
  return f;
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
      startDash(a, a.rushDir, 15, a.rushLen, { w: 2.6, dmg: 1.3, hitO: { push: 20 }, dust: 0x4a4038, daze: 2, yank: a.rushYank, end: rushEnd });
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
    if (a.dark) setHeroLight(heroNear(a) ? 3.5 : null, a);
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
// phase 2, The Dark: the braziers go out, the Cradle shrinks to 3.5 m, and he is Shrouded
function ivarDark(a) {
  a.dark = true; a.shrouded = true; a.hpFloor = a.hpMax * 0.299;
  setHeroLight(3.5, a);
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
  return { t: 0.6, fn() { Audio.sfx('swingHeavy', { x: a.x, z: a.z }); for (const p of heroes()) if (meleeLands(a, p, 4.5, 1.0)) hitHero(a, p, 1.0, step ? { push: 16 } : {}); a.combo++; }, after: 0.2, chain: step === 0 && Math.hypot(G.player.x - a.x, G.player.z - a.z) < 7, chainFn: staffCombo };
}
// Lantern Sweep: the dead lantern raised, a pale 10 m cone; she is Seen, and in the dark it puts out the braziers it finds
// (not the one she stands by)
function lanternSweep(a, pl) {
  const rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.rot = rot;
  a.tele = teleCone(a.x, a.z, rot, 10, 0.8, 1.0, 0xb8d0ff);
  a.avatar?.play('castUp', 1, { hitIn: 1.0 }); Audio.sfx('wraithWail', { x: a.x, z: a.z, vol: 0.4 });
  return { t: 1.0, noFace: true, fn() {
    for (let i = 0; i < 30; i++) { const ang = rot + rand.range(-0.8, 0.8), sp = rand.range(6, 12); P({ x: a.x, y: 1.8, z: a.z, vx: Math.sin(ang) * sp, vy: rand.range(-0.5, 0.5), vz: Math.cos(ang) * sp, life: 0.7, size: 0.4, size1: 0.05, color: 0xe0ecff, color1: 0x6a88c0, drag: 1.5 }); }
    for (const p of heroes()) if (inCone(a.x, a.z, rot, 10, 0.8, p)) hitHero(a, p, 1.0, { seen: 4 });
    if (a.dark) for (const b of braziers(a)) if (b.lit && inCone(a.x, a.z, rot, 10.5, 0.8, b) && Math.hypot(b.x - G.player.x, b.z - G.player.z) > 3) { snuffLamp(b, a); tally(a, 'sweepSnuff'); }
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
    startDash(a, dir, 24, len, { probe: 0.6, w: 2.6, dmg: 1.4, hitO: { push: 24 }, end() { a.avatar?.anim.stop?.(0.2); }, drop: { every: 2.4, fn: (x, z) => area('ash', x, z, 1.4, 3, { team: 'foe', src: a }) } });
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
      for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 2 + p.radius * 0.5) hitHero(a, p, 1.0);
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
    // behind the cages one every 3.8 s, wherever she is in the arena (the statues break only to it); never far out of it.
    // Statues risen whole (gifts taken) take more blows, so he strikes faster: 3.8 s for three blows, 3.2 s for six
    { id: 'hammerfall', when: (a, d) => (a.phase === 1 && heroInArena(a)) || (d > 3 && d < 16), phaseCd: [9, 5, 9], cdOf: (a, ph) => (ph === 1 && a.cageBlows ? 3.8 - 0.2 * (a.cageBlows - 3) : null), run: (a, pl) => hammerfall(a, pl) },
    { id: 'kneel', when: (a, d) => a.phase === 1 && cageUp(a, 'lord') && d < 8.5, cd: 12, run: (a) => kneel(a) },
    { id: 'rain', when: (a) => a.phase === 1 && cageUp(a, 'king') && heroInArena(a), cd: 10, run: (a, pl) => moltenRain(a, pl) },
    { id: 'host', when: (a) => a.phase === 0 && alive(a.host).length < 4, cd: 22, run: (a) => raiseHost(a) },
    { id: 'tongs', when: (a, d) => a.phase !== 1 && d > 3.5 && d < 10, cd: 12, run: (a, pl) => tongs(a, pl) },
    { id: 'gaze', when: (a, d) => a.phase !== 1 && d > 4, phaseCd: [9, 9, 10], run: (a, pl) => gaze(a, pl) },
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
  a.lockPhase = 1; a.hpFloor = a.hpMax * 0.2; a.misses = 0;
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
  a.mcd.hammerfall = 1.2;
  emit('karthaxCages', a, a.cages);
}
function crackLook(s) { s.avatar?.setRim(0xff5a18, 0.9); s.baseTint = 0x9a948c; s.statueTint = 0x9a948c; for (let i = 0; i < 12; i++) sparks(s.x, rand.range(0.5, 2.5), s.z, 1, 0xff8030, 2); }
// a Hammerfall in the cages' phase: every statue within 4.5 m of the blow (6 m after two misses running) takes it
function cageBlow(a, x, z) {
  const R0 = a.misses >= 2 ? 6 : 4.5;
  let hit = false;
  for (const s of a.cages || []) {
    if (s.dead || Math.hypot(s.x - x, s.z - z) > R0 + s.radius * 0.5) continue;
    hit = true; s.blows--;
    Audio.sfx('crownCrack', { x: s.x, z: s.z }); sparks(s.x, 2, s.z, 20, 0xffc080, 6);
    if (s.blows <= 0) breakCage(a, s);
    else { s.cracked = true; crackLook(s); emit('cageCracked', s, s.keeper, a); tally(a, 'cageCracked'); }
  }
  if (hit) a.misses = 0;
  else if (++a.misses === 2) { say('d.karthax.hint'); emit('cageHint', a); tally(a, 'hint'); }
}
function breakCage(a, s) {
  s.dead = true; s.deadT = 0; s.hp = 0;
  explosion(s.x, s.z, 2.6, 0xb0a898, { smoke: 0x7a7670, shake: 0.6 }); puff(s.x, 1.5, s.z, 26, 0x8a8680, 2.2, 2.4, 1.8);
  glowBurst(s.x, 2.4, s.z, s.keeper === 'lady' ? 0xffb040 : s.keeper === 'king' ? 0xff6a20 : 0x7ad0ff, 40, 4, 0.35, 1);
  Audio.sfx('statueBreak', { x: s.x, z: s.z }); Audio.sfx('crownCrack');
  dropGlobe(s.x, s.z);
  // the shard cracks and speaks the wish it held; then the keeper, for one breath, is himself
  say('d.cage.' + s.keeper);
  later(2.6, () => say('d.cage.' + s.keeper + '2'));
  emit('cageBroken', s, s.keeper, a); tally(a, 'cageBroken:' + s.keeper);
}
// (what she did to him behind the cages counts: he enters the last fire at 20-29.9%)
function cagesBroken(a) {
  a.cages = null; a.hp = Math.min(a.hp, a.hpMax * 0.299); a.hpFloor = a.hpMax * 0.2; a.ward = 0; restoreRim(a);
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
// Ember Combo: three blows (0.8, 0.5, 0.8 s; 0.7, 0.45, 0.7 in the last fire), the third leaves fire. The aim is taken for the
// first; the second and third strike along the same line, and a step out of it ends the combo. The hammer cools after the third
function emberCombo(a, pl) {
  const step = a.combo, W = a.phase >= 2 ? [0.7, 0.45, 0.7] : [0.8, 0.5, 0.8], t = W[step];
  if (step === 0) a.rot = angleTo(a.x, a.z, pl.x, pl.z);
  a.tele = teleCone(a.x, a.z, a.rot, 5, 1.0, t, 0xff5010);
  a.avatar?.play(['slash1', 'slash2', 'slam'][step], 1.2, { hitIn: t });
  return { t, noFace: step > 0, fn() {
    for (const p of heroes()) if (meleeLands(a, p, 5, 1.0)) hitHero(a, p, step === 2 ? 1.15 : 1, { burn: a.dmg * 0.4 });
    Audio.sfx('swingHeavy', { x: a.x, z: a.z }); shake(step === 2 ? 0.35 : 0.12);
    if (step === 2) { const x = a.x + Math.sin(a.rot) * 3, z = a.z + Math.cos(a.rot) * 3; explosion(x, z, 1.8, 0xff6a10, { smoke: 0x2a1a10, shake: 0.3 }); area('fire', x, z, 1.5, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }
    a.combo++;
  }, after: step === 2 ? 0.9 : 0.25, chain: step < 2 && inCone(a.x, a.z, a.rot, 5.5, 1.0, G.player), chainFn: emberCombo };
}
// Hammerfall: a circle on the hero, 4.5 m in 1.6 s while the cages stand, else 3.5 m in 1.4 s (a walk out of it); he leaps
// to bring the hammer down on it, and wrenches it free after (an opening)
function hammerfall(a, pl) {
  const caged = !!a.cages, wind = caged ? 1.6 : 1.4, tx = pl.x, tz = pl.z, d = Math.hypot(tx - a.x, tz - a.z), dir = angleTo(a.x, a.z, tx, tz);
  // after two misses running the statues break within 6 m (cageBlow), and the circle shows it; she is still hit within 4.5 m
  const R0 = caged ? (a.misses >= 2 ? 6 : 4.5) : 3.5;
  a.rot = dir;
  a.tele = teleCircle(tx, tz, R0, wind, 0xff5010);
  const leap = d > 4.8;
  if (leap) { const k = d - 3.2, f = G.zone.map.nearestFloor(a.x + Math.sin(dir) * k, a.z + Math.cos(dir) * k, 3); a.lx = a.x; a.lz = a.z; a.leapTo = f; }
  a.avatar?.play('chop', 1, { hitIn: wind }); Audio.sfx('swingHeavy', { x: a.x, z: a.z });
  return { t: wind, leap, noFace: true, fn() {
    explosion(tx, tz, R0, 0xff6a10, { smoke: 0x2a1a10, shake: 0.7 }); ring(tx, tz, R0 + 0.3, 0xffa040, 0.6);
    Audio.sfx('slam'); Audio.sfx('anvil', { x: tx, z: tz });
    for (const p of heroes()) if (Math.hypot(p.x - tx, p.z - tz) < (caged ? 4.5 : R0) + p.radius * 0.5) hitHero(a, p, 1.15, { stun: 0.4, burn: a.dmg * 0.4 });
    for (let i = 0; i < 2; i++) { const ang = i * 2.094 + rand.range(0, 1), r = rand.range(1.2, 3), x = tx + Math.sin(ang) * r, z = tz + Math.cos(ang) * r; if (G.zone.map.walkable(x, z)) area('fire', x, z, 1.3, 4, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); }
    if (caged) cageBlow(a, tx, tz);
  }, after: caged ? 0.7 : 1.1 };
}
// Tongs: a 10 m line; caught (no dodge during the wind-up), she is dragged to the anvil and hammered (1.3x and burn)
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
    later(0.5, inZone(a, () => { a.avatar?.play('slam', 1.4); const q = G.player; explosion(q.x, q.z, 1.6, 0xff6a10, { smoke: 0x2a1a10, shake: 0.5 }); Audio.sfx('anvil', { x: q.x, z: q.z }); hitHero(a, q, 1.3, { burn: a.dmg * 0.6 }); }));
  }, after: 1.0 };
}
// Gaze of the Brow-stone: a white-gold 20 m line that burns on for 3 s; in the last fire two crossing lines, never into Isarn's light
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
      for (let d = 3; d < 20; d += 5) { const x = a.x + ux * d, z = a.z + uz * d; if (G.zone.map.walkable(x, z)) area('fire', x, z, 1.2, 3, { team: 'foe', src: a, dmg: a.dmg * 0.2, tick: 0.5 }); }
      if (!p.dead && inLine(a.x, a.z, r, 20, 2.4, p)) hitHero(a, p, 1.15, { burn: a.dmg * 0.6 });
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
  return { t: 1.3, noFace: true, fn() { ring(a.x, a.z, 8, 0x9ad0ff, 0.6); glowBurst(a.x, 1, a.z, 0x9ad0ff, 30, 6, 0.3, 0.6); for (const p of heroes()) if (Math.hypot(p.x - a.x, p.z - a.z) < 8 + p.radius * 0.5) { hitHero(a, p, 1.0); if (p === G.player) rootHero(1.5); } tally(a, 'kneelHit'); }, after: 0.6 };
}
// Molten Rain (Durgan's statue stands): three drops on and around the hero, 1.0 to 1.5 s, each leaving fire
function moltenRain(a, pl) {
  a.avatar?.play('castUp', 1); Audio.sfx('lavaBurst', { vol: 0.7 });
  for (let i = 0; i < 3; i++) {
    const x = pl.x + (i ? rand.range(-4.5, 4.5) : 0), z = pl.z + (i ? rand.range(-4.5, 4.5) : 0);
    if (!G.zone.map.walkable(x, z)) continue;
    const dl = 1.0 + i * 0.25;
    teleCircle(x, z, 1.8, dl, 0xff5010);
    later(dl - 0.32, inZone(a, () => fall(x, z, 0xffa040, true)));
    later(dl, inZone(a, () => { explosion(x, z, 1.8, 0xff7a20, { smoke: 0x2a1a10, shake: 0.1 }); area('fire', x, z, 1.4, 3, { team: 'foe', src: a, dmg: a.dmg * 0.2, tick: 0.5 }); Audio.sfx('lavaBurst', { x, z, vol: 0.6 }); for (const p of heroes()) if (Math.hypot(p.x - x, p.z - z) < 1.9) hitHero(a, p, 1.0, { burn: a.dmg * 0.5 }); }));
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
    for (const p of heroes()) if (!p.dead && Math.hypot(p.x - c.x, p.z - c.z) < R0 && !lightAt(p.x, p.z)) { hitHero(a, p, 1.3, { burn: a.dmg * 0.5 }); tally(a, 'darkHit'); } else tally(a, 'darkSafe');
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
    if (!p.dead && inCone(a.x, a.z, rot, 8, 0.8, p)) { hitHero(a, p, 1.0, { burn: a.dmg * 0.3 }); tally(a, 'breathTaken'); }
    else if (Math.hypot(I.x - a.x, I.z - a.z) < 8 + I.r * 0.5) { shrinkPool(I, 3, 6); emit('isarnDimmed', a); tally(a, 'breathDimmed'); }
  }, after: 0.5 };
}


// =====================================================================================================================
// ---------- Act V: Skerry, the Walking Tower, and the Skotos ----------
// The act's phone rules: at most two big telegraphs up at once, the environment's own warning (the tide coming, the Deep
// Cold) counted as one (bigs, bigTele); telegraphs never change with the difficulty, cooldowns and adds do (HAZ5: bcd, adds)
const H5 = () => HAZ5[G.hero?.diff ?? 1] || HAZ5[1];
const bcd = (s) => s * H5().bossCd;
const cdm = (base) => (a, ph) => bcd(Array.isArray(base) ? base[ph] : base);
function bigs(a) { const t = a.t; a.bigs = (a.bigs || []).filter((e) => e > t); return a.bigs.length; }
function bigTele(a, dur) { (a.bigs ||= []).push(a.t + dur); }
const roomFor = (a) => bigs(a) < 2;

// the fight's camera: pitch, zoom and the aim's height eased in while she fights it (and, near the Skotos, a little ahead
// toward it, so its hood stays in the frame: the contract's Stage A outcome); given back when the fight ends
const CAM = { on: false };
function fightCam(dt, w) {
  const c = R.cam, k = Math.min(1, dt * 1.6);
  if (G.mode !== 'play') { c.aimX = c.aimZ = 0; return; }
  if (w) {
    CAM.on = true;
    c.pitch += (w.p - c.pitch) * k; c.lookY += (w.y - c.lookY) * k; c.zoomT = w.z;
    c.aimX = (c.aimX || 0) + ((w.ax || 0) - (c.aimX || 0)) * k; c.aimZ = (c.aimZ || 0) + ((w.az || 0) - (c.aimZ || 0)) * k;
    return;
  }
  if (!CAM.on) return;
  c.pitch += (0.95 - c.pitch) * k; c.lookY += (0.9 - c.lookY) * k; c.aimX *= 1 - k; c.aimZ *= 1 - k;
  if (Math.abs(c.pitch - 0.95) < 0.004 && Math.abs(c.lookY - 0.9) < 0.01 && Math.abs(c.aimX) + Math.abs(c.aimZ) < 0.02) {
    c.pitch = 0.95; c.lookY = 0.9; c.aimX = c.aimZ = 0; c.zoomT = ATMOS[ZONES[G.zone?.id]?.atmos]?.zoom ?? 1; CAM.on = false;
  }
}
on('zoneEnter', () => { if (CAM.on) { const c = R.cam; c.pitch = 0.95; c.lookY = 0.9; c.aimX = c.aimZ = 0; CAM.on = false; } });

// the Skerry Light rides the shell's socket (where the walk, the rear and the dive carry it), upright, turning with the crab
const _sp = new THREE.Vector3();
function skerryRide(a) {
  const m = a.skerry, s = a.skerrySock, g = a.avatar?.group; if (!m || !s || !g) return;
  g.updateWorldMatrix(true, false); s.updateWorldMatrix(true, false);
  s.getWorldPosition(_sp); g.worldToLocal(_sp); m.position.copy(_sp);
}
// the Skerry Light's world point (its fire), for the beam on the Tower's back and the Cradle's fire streaming to it
const _sk = new THREE.Vector3();
function skerryFire(a) {
  const m = a.skerry; if (!m) return { x: a.x, y: 9, z: a.z };
  m.updateWorldMatrix(true, false);
  _sk.set(0, m.userData.fireY ?? 8, 0).applyMatrix4(m.matrixWorld);
  return { x: _sk.x, y: _sk.y, z: _sk.z };
}

// ---------- Skerry, the Walking Tower: an island that stands up ----------
// Phase 1, the Tide: on the sand it sweeps, rushes sideways, hammers and spits brine; every so often the tide comes (its own
// flood, TIDE.force) and it hunts from the water as a wake, breaching through her: a Breach that ends on dry ground beaches
// it (x1.5), and still under when the bay drains it is Stranded. At 65% it turns onto the ice and keeps to the thick
// (stepToward's mask): only the Shell Rush crosses thin ice, and across a webbed patch it goes through and lies Overturned
// (x2, its one window). At 30% it hauls itself back onto the sand, an Island now and then (x0.3): light its light on its
// flank and it is Blinded by it (x1.6). Dead, it crawls home to its skerry and is an island again, its light burning
const TOWER = {
  name: 'tower', phases: [0.65, 0.3], wake: 24,
  intro(a) {
    emit('bossIntro', a); tally(a, 'intro');
    Audio.sfx('towerBell', { vol: 1 }); Audio.sfx('bossRoar', { vol: 0.5 });
    a.avatar?.play('rear', 1); a.skerry?.userData.ring?.(1.2); shake(0.5);
    a.st = 'fight'; a.tide = { st: 'low', t: bcd(a.echo ? 8 : 10) }; a.rushes = 0; a.unlitT = 0;
    // (and the turn waits for the tide: phase 1 holds until it has been Beached or Stranded once, or a flood has come and
    // gone; struck to 65% at low water, it calls the flood at once. What she deals meanwhile still counts, down to 50%)
    a.lockPhase = 0; a.hpFloor = a.hpMax * 0.5;
    a.mcd.rush = bcd(5); a.mcd.hammer = bcd(3); a.mcd.spit = bcd(7); a.mcd.brood = bcd(10); a.mcd.drowned = bcd(4);
    towerWater(a, 0, 0.3);
  },
  onPhase(a, ph) { if (ph === 1) towerTurn(a); if (ph === 2) towerBack(a); },
  tick(a, dt, pl, d) {
    if (a.st === 'under') return wakeTick(a, dt, pl);
    if (a.st !== 'fight') return 0;
    return null;
  },
  moves: [
    // phase 1 at low water and phase 3: sideways at her; in phase 2 the Shell Rush across the ice (the bait)
    { id: 'rush', when: (a, d) => a.phase !== 1 && d > 3 && d < 15 && roomFor(a), cdOf: cdm(9), run: (a, pl) => { a.rushN = 0; return sideRush(a, pl); } },
    { id: 'shellRush', when: (a, d) => a.phase === 1 && d > 3.5 && d < 16 && roomFor(a), cdOf: cdm(7), run: (a, pl) => sideRush(a, pl, true) },
    { id: 'bell', when: (a, d) => a.phase === 1 && d < 9.5 && roomFor(a), cdOf: cdm(9), run: (a) => towerBellMove(a) },
    { id: 'hammer', when: (a, d) => a.phase !== 2 && d < 9 && roomFor(a), cdOf: cdm(10), run: (a, pl) => hammerClaw(a, pl) },
    { id: 'spit', when: (a, d) => a.phase !== 1 && d > 4 && d < 16 && roomFor(a), cdOf: cdm(8), run: (a, pl) => brineSpit(a, pl) },
    { id: 'brood', when: (a) => a.phase === 0 && alive(a.lice).length < 3, cdOf: cdm(18), run: (a) => brood(a) },
    { id: 'shake', when: (a, d) => a.phase === 2 && d < 6 && !(a.blindT > 3) && roomFor(a), cdOf: cdm(9), run: (a) => towerShake(a) },
    { id: 'drowned', when: (a) => a.phase === 2 && alive(a.drownedAdds).length < 4 + H5().adds, cdOf: cdm(12), run: (a) => callDrowned(a) },
    { id: 'sweep', basic: true, when: (a, d) => d < 7.2, cdOf: cdm(2.0), run: (a, pl) => clawSweep(a, pl) }
  ]
};
// what runs every frame whatever it is doing (a daze included): the bay's water, the tide's clock, the wake, the light on its
// back and its beam, the Island's interact, the turn and the hauls, the walk on the thick; the speed it moved, for its gait
function towerPre(a, dt, pl, d) {
  const av = a.avatar;
  // asleep as the skerry (the story wakes it): a rock, its light dark
  if (!a.awake) {
    if (a.holdWake && !a.posed && av) { a.posed = true; av.play('rock', 1); a.skerry?.userData.setLit?.(false); }
    skerryRide(a);
    return 0;
  }
  if (a.posed) { a.posed = false; }
  // (the turn's 3 s that nothing hurts: a white rim while they last)
  if (a.invuln > 0 && (a.invuln -= dt) <= 0) { a.invuln = 0; restoreRim(a); }
  // (a little lower and further back while she fights it, and aimed between her and it while it is near: the crab's whole
  // bulk, the light on its back and its telegraphs on a phone screen)
  if (heroNear(a, 26) && !pl.dead) {
    const D = Math.hypot(a.x - pl.x, a.z - pl.z), k = clamp((18 - D) / 10, 0, 1), g = angleTo(pl.x, pl.z, a.x, a.z), ah = Math.min(4, D * 0.4) * k;
    fightCam(dt, { p: 0.86 - 0.1 * k, y: 1.2 + 1.4 * k, z: 1.15 + 0.08 * k, ax: Math.sin(g) * ah, az: Math.cos(g) * ah });
  } else fightCam(dt, null);
  // the bay's water is the Tower's while it is awake and she is at the bay (and back at low water on every entry:
  // act5Enter, then here). Away from it (the force holds every tidal cell of the coast, tide.js) the coast keeps its own
  // clock, and the Tower comes up out of what it called; back at the bay the water is at low again, its tide anew
  const away = !heroInArena(a, 24);
  if (away && !a.away) towerAway(a);
  a.away = away;
  if (TIDE && !TIDE.force && !away) towerWater(a, 0, 0.3);
  if (a.phase === 0 && a.tide && !away) {
    if (a.lockPhase === 0 && a.tide.st === 'low' && a.hp <= a.hpMax * 0.65) a.tide.t = Math.min(a.tide.t, 0);
    tideClock(a, dt, pl);
  }
  skerryRide(a);
  // the light on its back hides while it lies on its back (the socket goes under the ground in that clip)
  if (a.skerry && av) { const act = av.anim.act, ov = av.anim.actName === 'overturned' && act, ex = av.model.tpl?.ex?.overturned; a.skerry.visible = !(ov && ex && act.time > ex.down && act.time < ex.up); }
  // its beam goes where it goes
  const b = a.beam; if (b) { const f = skerryFire(a); b.x = f.x; b.z = f.z; b.y = f.y; if (b.mesh) b.mesh.position.set(f.x, f.y, f.z); }
  if (a.blindT > 0 && (a.blindT -= dt) <= 0) towerDark(a, true);
  if (a.lightIt) { const ang = angleTo(a.x, a.z, pl.x, pl.z), r = a.radius + 0.7; a.lightIt.x = a.x + Math.sin(ang) * r; a.lightIt.z = a.z + Math.cos(ang) * r; }
  if (a.phase === 1 && a.lockPhase === 1 && a.st !== 'over' && (a.lockT -= dt) <= 0) a.lockPhase = null;
  if (a.phase === 2) {
    // unlit too long: Alkyone's flask (in an echo, the shore rock's brazier throws one) at the next Island
    if (!a.lit) a.unlitT += dt;
    if (a.unlitT > 60) a.hpFloor = 0;
    if (a.st === 'island' && a.unlitT > 45 && !a.flask) towerFlask(a);
    // (an Island that fell due while it was in a rush, and its light never lit since: at its first free moment, or the
    // Islands, the light and Alkyone's flask would never come round again)
    if (a.islandDue && !a.lit && a.st === 'fight' && !a.dash && !a.move && !(a.dazed > 0)) { a.islandDue = false; killTele(a.tele); a.tele = null; islandStart(a); }
  }
  if (a.st === 'island') { a.resist = 0.3; if ((a.islandT -= dt) <= 0) islandEnd(a); return 0; }
  if (a.st === 'over') { if ((a.overT -= dt) <= 0) overEnd(a); return 0; }
  if (a.st === 'turn') { if ((a.turnT -= dt) <= 0) { a.st = 'haul'; a.haul = thickNear(a, a.x, a.z - 4, true) || { x: a.x, z: a.z - 6 }; } return 0; }
  if (a.st === 'haul' || a.st === 'back') return towerHaul(a, dt);
  if (a.st === 'rear' || a.st === 'dive' || a.st === 'surface') return 0;
  // beached and the water still up: back down into the deep, and under again
  if (a.phase === 0 && a.st === 'fight' && (a.tide?.st === 'flood' || a.tide?.st === 'high') && !a.move && !a.dash && !(a.dazed > 0)) return toWater(a, dt);
  // phase 2: it keeps to the thick ice (a wall to it is any thin cell), as near her as the thick goes
  if (a.phase === 1 && a.st === 'fight' && !a.move && !a.dash && !(a.dazed > 0) && d > 4.5) return thickSeek(a, pl, dt);
  if (a.phase === 1 && a.st === 'fight' && !a.move && !a.dash && !(a.dazed > 0)) face(a, pl, dt, 3);
  return 0;
}
// the bay's water at h (m), rising or falling at rate m/s (0.15: one step a second); null: back to the zone's clock
function towerWater(a, h, rate = 0.15) {
  if (!TIDE) return;
  if (h == null) { TIDE.force = null; return; }
  if (!TIDE.force || TIDE.force.h !== h || TIDE.force.rate !== rate) TIDE.force = { h, rate };
}
// the tide's clock in the first phase: low water (its moves on the sand), then the tide comes (it rears, the bell rings, the
// water draws back for a breath, the bay floods to 0.9 m in six steps over 6 s while it dives), 16 s of high water (the
// wake, the Breaches, the Drowned called), then 6 s draining; still under when the sand comes up: Stranded
function tideClock(a, dt, pl) {
  const T = a.tide;
  T.t -= dt;
  if (T.st === 'low') {
    if (T.t > 0 || a.st !== 'fight' || a.move || a.dash || a.dazed > 0 || !roomFor(a)) return;
    T.st = 'rear'; T.t = 1.6; a.st = 'rear'; bigTele(a, 7.6); tally(a, 'tide');
    a.avatar?.play('rear', 1); Audio.sfx('towerBell', { vol: 1 }); Audio.sfx('tideBell'); a.skerry?.userData.ring?.(1.4);
    emit('towerTide', a, 'flood');
    // (the water draws back from the bay's edge for a breath before it comes)
    const c = arena(a); ring(c.x, c.z, 15, 0xd8ecff, 1.2); for (let k = 0; k < 12; k++) { const g = k * 0.52; splashFx(c.x + Math.sin(g) * 14, c.z + Math.cos(g) * 14, 0.8); }
    return;
  }
  if (T.st === 'rear' && T.t <= 0) {
    T.st = 'flood'; T.t = 6.5; towerWater(a, 0.9, 0.15); Audio.sfx('surfSwell', { vol: 1 });
    if (a.st === 'rear') submerge(a);
    return;
  }
  if (T.st === 'flood' && T.t <= 0) { T.st = 'high'; T.t = 16; a.breachT = 1.5; a.mcd.drowned = Math.min(a.mcd.drowned || 0, 2); return; }
  if (T.st === 'high') {
    // the Drowned walk in out of the bay while the water is up
    if ((a.mcd.drowned || 0) <= 0 && alive(a.drownedAdds).length < 4 + H5().adds && !(a.dazed > 0)) { a.mcd.drowned = bcd(15); callDrowned(a, true); }
    if (T.t <= 0) { T.st = 'drain'; T.t = 6.5; towerWater(a, 0, 0.15); emit('towerTide', a, 'ebb'); }
    return;
  }
  if (T.st === 'drain' && T.t <= 0) {
    T.st = 'low'; T.t = bcd(24); Audio.mood({ sub: 0 }); a.lockPhase = null;
    // the sand came up round it: Stranded where it lies
    if (a.st === 'under' || a.st === 'breach') { a.br = null; towerUp(a); daze(a, 3); addVuln(a, 'stranded', 3); a.lockPhase = null; tally(a, 'stranded'); }
  }
}
// under the water: hidden from blows, the light on its back riding out of the water like a mast, a foam V behind it
function submerge(a) {
  a.st = 'dive'; a.avatar?.play('dive', 1); Audio.sfx('towerDive', { x: a.x, z: a.z });
  Audio.mood({ sub: 1 });
  later(0.7, inZone(a, () => { if (a.st !== 'dive') return; a.st = 'under'; a.under = true; a.hidden = false; for (const k in a.status) if (k === 'burn' || k === 'poison') a.status[k] = 0; tally(a, 'under'); }));
}
function towerUp(a) {
  a.under = false; a.st = 'fight'; a.y = 0; setWake(a.x, a.z, a.rot, 0);
  a.avatar?.play('rise', 1); splashFx(a.x, a.z, 2.6); Audio.sfx('splash', { x: a.x, z: a.z, vol: 1 });
}
const deepAt = (x, z) => waterAt(x, z) === 'deep';
function toWater(a, dt) {
  if (deepAt(a.x, a.z)) { submerge(a); return 0; }
  if (!a.deepTo || (a.deepT = (a.deepT || 0) - dt) <= 0) {
    a.deepT = 1; a.deepTo = null;
    for (let r = 1.5; r <= 10 && !a.deepTo; r += 1) for (let k = 0; k < 16; k++) { const g = (k / 16) * Math.PI * 2, x = a.x + Math.sin(g) * r, z = a.z + Math.cos(g) * r; if (deepAt(x, z)) { a.deepTo = { x, z }; break; } }
  }
  const p = a.deepTo; if (!p) return 0;
  const dx = p.x - a.x, dz = p.z - a.z, l = Math.hypot(dx, dz) || 1, sp = 3.2;
  a.x += (dx / l) * sp * dt; a.z += (dz / l) * sp * dt; a.rot = dampAngle(a.rot, Math.atan2(dx, dz) + Math.PI / 2, 5, dt);
  return sp;
}
// the wake: it keeps about 9 m off her in deep water, out of reach, and every 6 s breaches through her
function wakeTick(a, dt, pl) {
  a.y = damp(a.y || 0, -1.6, 3, dt);
  let v = 0;
  if (!a.br) {
    const c = arena(a), away = angleTo(pl.x, pl.z, a.x, a.z);
    let tx = a.x, tz = a.z;
    for (const o of [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 2, -2, 3.1]) { const x = pl.x + Math.sin(away + o) * 9, z = pl.z + Math.cos(away + o) * 9; if (deepAt(x, z) && Math.hypot(x - c.x, z - c.z) < arenaR(18) + 2) { tx = x; tz = z; break; } }
    const dx = tx - a.x, dz = tz - a.z, l = Math.hypot(dx, dz);
    if (l > 0.6) {
      const base = Math.atan2(dx, dz), sp = (a.def.wakeSpeed || 6.5) * Math.min(1, l / 2);
      for (const o of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
        const ang = base + o, nx = a.x + Math.sin(ang) * sp * dt, nz = a.z + Math.cos(ang) * sp * dt;
        if (!deepAt(nx + Math.sin(ang) * 1.5, nz + Math.cos(ang) * 1.5)) continue;
        a.x = nx; a.z = nz; a.rot = dampAngle(a.rot, ang + Math.PI / 2, 4, dt); v = sp; break;
      }
    }
    setWake(a.x, a.z, a.rot - Math.PI / 2, v > 0.5 ? 1 : 0.4);
    if (Math.random() < dt * 8) splashFx(a.x + rand.range(-1.5, 1.5), a.z + rand.range(-1.5, 1.5), 0.5);
    if (a.tide?.st === 'high' && (a.breachT -= dt) <= 0 && roomFor(a) && !pl.dead) breachTele(a, pl);
    return 0;
  }
  return breachStep(a, dt, pl);
}
// Breach: the water humps along a 16 x 5 m line through her for 1.2 s; then it bursts out along it (1.3x, thrown 14 m):
// stopped by dry ground it is Beached (dazed 3.5 s, x1.5); run out in the water, it goes under again
function breachTele(a, pl) {
  const dir = angleTo(a.x, a.z, pl.x, pl.z), d = Math.hypot(pl.x - a.x, pl.z - a.z), len = clamp(d + 6, 10, 20);
  a.br = { dir, len, t: 1.2, run: 0, hit: false, go: false };
  a.tele = teleLine(a.x, a.z, dir, len, 5, 1.2, 0xff4a20); bigTele(a, 1.2);
  Audio.sfx('towerBreach', { x: a.x, z: a.z, vol: 0.6, pitch: 0.8 });
  for (let k = 1; k < 8; k++) later(k * 0.15, inZone(a, () => { const u = (k / 8) * len; splashFx(a.x + Math.sin(dir) * u, a.z + Math.cos(dir) * u, 0.9); }));
  tally(a, 'breach');
}
function breachStep(a, dt, pl) {
  const D = a.br, map = G.zone.map;
  if (!D.go) { D.t -= dt; a.rot = dampAngle(a.rot, D.dir, 6, dt); if (D.t > 0) return 0; D.go = true; a.under = false; a.avatar?.play('breach', 1); Audio.sfx('towerBreach', { x: a.x, z: a.z }); splashFx(a.x, a.z, 2.4); shake(0.3); }
  const sp = 18, ux = Math.sin(D.dir), uz = Math.cos(D.dir), st = sp * dt;
  const nx = a.x + ux * st, nz = a.z + uz * st;
  a.y = damp(a.y || 0, 0, 10, dt);
  const wall = map.blocks(Math.floor(nx + ux * a.radius * 0.6), Math.floor(nz + uz * a.radius * 0.6));
  if (!wall) { a.x = nx; a.z = nz; D.run += st; }
  if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.5) { D.hit = true; hitHero(a, pl, 1.3, { push: 14, kx: ux, kz: uz }); shake(0.4); }
  if (Math.random() < 0.8) splashFx(a.x, a.z, 1.4);
  const dry = map.walkable(a.x, a.z) && waterAt(a.x, a.z) === 'dry';
  if (dry || wall) { a.br = null; a.st = 'fight'; a.y = 0; setWake(a.x, a.z, a.rot, 0); daze(a, 3.5); addVuln(a, 'beached', 3.5); a.lockPhase = null; tally(a, 'beached'); explosion(a.x, a.z, 3, 0xd8e4ec, { smoke: 0x8a9aa8, shake: 0.5 }); Audio.sfx('slam', { x: a.x, z: a.z }); return 0; }
  if (D.run >= D.len) { a.br = null; a.breachT = bcd(6); a.st = 'dive'; a.avatar?.play('dive', 1); later(0.6, inZone(a, () => { if (a.st === 'dive') { a.st = 'under'; a.under = true; } })); }
  return sp;
}
// the turn at 65%: it rears and holds there 3 s (nothing hurts it), the bay drains, and it drags itself onto the ice
function towerTurn(a) {
  a.br = null; a.dash = null; a.move = null; killTele(a.tele); a.tele = null;
  if (a.under || a.st === 'under' || a.st === 'dive') towerUp(a);
  a.dazed = 0; a.dmgTaken = null; clearVuln(a, 'beached'); clearVuln(a, 'stranded');
  a.st = 'turn'; a.turnT = 3; a.invuln = 3; a.rooted = true; a.rushes = 0; a.avatar?.setRim(0xf0f8ff, 2);
  // (and no burst skips the ice: the ice phase holds until its first Overturn is over, or for 30 s; what she deals
  // meanwhile still counts, down to 20%)
  a.hpFloor = a.hpMax * 0.2; a.lockPhase = 1; a.lockT = 30;
  if (a.tide) a.tide.st = 'done';
  towerWater(a, 0, 0.3); Audio.mood({ sub: 0 });
  a.avatar?.play('rear', 1); a.skerry?.userData.ring?.(1.3); Audio.sfx('towerBell', { vol: 1, pitch: 0.9 });
  a.mcd.shellRush = bcd(3); a.mcd.bell = bcd(5); a.mcd.hammer = bcd(4);
  tally(a, 'turn');
}
// at 30%: back south onto the sand, and the first Island there
function towerBack(a) {
  a.dash = null; a.move = null; killTele(a.tele); a.tele = null;
  // (never from its back: up out of the hole first, its window shut)
  if (a.st === 'over') { a.vulnWindow = false; clearVuln(a, 'overturned'); a.y = 0; }
  // (and it does not die before its light has been lit once: held 10% under where it came back to the sand, 5% at the
  // least, until then; the flask lights it at 45 s anyway)
  a.rooted = false; a.st = 'back'; a.unlitT = 0; a.hpFloor = a.hpMax * Math.max(0.05, Math.min(a.hp / a.hpMax, 0.3) - 0.1);
  const c = arena(a); a.haul = G.zone.map.nearestFloor(c.x, c.z + 7, 4);
  a.avatar?.play('rear', 1); Audio.sfx('towerBell', { vol: 1, pitch: 0.8 });
  a.mcd.drowned = bcd(8); a.mcd.spit = bcd(5);
  tally(a, 'back');
}
// a walk it owns (the turn onto the thick, a haul out of a hole, back to the sand): crawling, straight there, over thin ice
// or round what is solid
function towerHaul(a, dt) {
  const h = a.haul; if (!h) { a.st = 'fight'; return 0; }
  const d = Math.hypot(h.x - a.x, h.z - a.z);
  if (d < 0.7) {
    a.haul = null;
    if (a.st === 'back') { islandStart(a); return 0; }
    a.st = 'fight'; a.cd = Math.max(a.cd, 0.6); return 0;
  }
  return seek(a, h.x, h.z, a.speed * 1.1, dt);
}
// the thick cell nearest (x, z) within 14 m (north of the bowl's middle if north: the turn)
function thickNear(a, x, z, north) {
  const L = G.zone.L, map = G.zone.map, c = arena(a);
  let best = null, bd = 1e9;
  for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) {
    const ix = Math.floor(x) + dx, iz = Math.floor(z) + dz; if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) continue;
    const i = iz * L.w + ix; if (!L.thick?.[i] || map.solid(ix, iz) || (north && iz + 0.5 > c.z)) continue;
    const d2 = (ix + 0.5 - x) ** 2 + (iz + 0.5 - z) ** 2; if (d2 < bd) { bd = d2; best = { x: ix + 0.5, z: iz + 0.5 }; }
  }
  return best;
}
// on the thick toward her: the thick cell nearest her as the goal, a window that sees only thick ice (map.js mask)
function thickSeek(a, pl, dt) {
  const L = G.zone.L, map = G.zone.map;
  if ((a.goalT = (a.goalT || 0) - dt) <= 0 || !a.goal) { a.goalT = 0.5; a.goal = thickNear(a, pl.x, pl.z) || a.goal; }
  const g = a.goal; if (!g || Math.hypot(g.x - a.x, g.z - a.z) < 0.8) { face(a, pl, dt, 3); return 0; }
  let f = map.stepToward(a.pathT ||= {}, a.x, a.z, g.x, g.z, dirTmp, 24, L.thick);
  // (off the thick, a haul out of a hole say: straight to the nearest thick cell first)
  if (!f) { const n = thickNear(a, a.x, a.z); if (!n) return 0; const l = Math.hypot(n.x - a.x, n.z - a.z) || 1; dirTmp.x = (n.x - a.x) / l; dirTmp.z = (n.z - a.z) / l; f = dirTmp; }
  const v = a.speed * moveMul(a);
  a.x += f.x * v * dt; a.z += f.z * v * dt;
  turnTo(a, Math.atan2(f.x, f.z), 6, dt);
  return v;
}
// Claw Sweep: a 7 m cone (1.0 s), 1.1x and thrown 10 m; on ice the cone cracks a stage
function clawSweep(a, pl) {
  const rot = angleTo(a.x, a.z, pl.x, pl.z) + (a.blindT > 0 ? rand.sign() * 0.7 : 0);
  a.rot = rot;
  a.tele = teleCone(a.x, a.z, rot, 7, 1.0, 1.0, 0xff6a20);
  a.avatar?.play('attack', 1, { hitIn: 1.0 });
  return { t: 1.0, noFace: true, fn() {
    Audio.sfx('swingHeavy', { x: a.x, z: a.z }); shake(0.25);
    if (!pl.dead && inCone(a.x, a.z, rot, 7, 1.0, pl)) hitHero(a, pl, 1.1, { push: 10 });
    if (a.phase === 1) crackCone(a.x, a.z, rot, 7, 1.0, 1, { src: 'tower' });
  }, after: 0.5 };
}
// Sidelong Rush (phases 1 and 3; in phase 2 the Shell Rush): it turns broadside and scuttles sideways along a 14 x 4 m line
// (1.1 s) at 16 m/s, 1.3x and thrown 14 m. Into an islet's boulder or the wreck's ribs: dazed 3 s. The Shell Rush over
// thin ice webbed to stage 2 goes through (Overturned 5 s, x2); each thin cell it runs over cracks a stage. After three
// Shell Rushes that held, the next goes through the first thin ice it crosses (the fail-safe: the Hammer Claw's +3 only
// reaches a hero within its 9 m). In phase 3 twice in a row, the second back the other way
function sideRush(a, pl, shell) {
  const aim = angleTo(a.x, a.z, pl.x, pl.z) + (a.blindT > 0 ? rand.sign() * 0.7 : 0), dist = Math.hypot(pl.x - a.x, pl.z - a.z);
  const len = shell ? clamp(dist + 3, 6, 16) : 14, wide = Math.max(4, a.radius * 2 + 0.2);
  a.rot = aim + Math.PI / 2;
  a.tele = teleLine(a.x, a.z, aim, len, wide, 1.1, 0xff4a20); bigTele(a, 1.1);
  a.avatar?.play('side', 1.6); Audio.sfx('louseSkitter', { x: a.x, z: a.z, vol: 1, pitch: 0.5 });
  if (shell) { a.rushes = (a.rushes || 0) + 1; tally(a, 'shellRush'); }
  return { t: 1.1, noFace: true, fn() {
    // (w: no hit wider than the drawn line, dashStep)
    const D = startDash(a, aim, 16, len, { probe: a.radius * 0.7, w: wide, dmg: 1.3, hitO: { push: 14 }, end: rushEnd5, dust: 0xa8b4bc, dir: aim });
    D.shell = !!shell; D.ice5 = true; D.tired = !!shell && a.rushes > 3;
    a.rot = aim + Math.PI / 2;
    Audio.sfx('swingHeavy', { x: a.x, z: a.z });
  }, after: 0.4, chain: a.phase === 2 && !shell && (a.rushN = (a.rushN || 0) + 1) < 2, chainFn: (b, p) => sideRush(b, p) };
}
// each step of a rush on thin ice: the cells under it crack a stage; one webbed (2+) under its body breaks: the Shell Rush
// goes through (after three that held, any thin cell does)
function rushIce(a, D) {
  const ix = Math.floor(a.x), iz = Math.floor(a.z), c = iz * 4096 + ix;
  if (c === D.iceCell) return;
  D.iceCell = c;
  const px = Math.cos(D.dir ?? 0), pz = -Math.sin(D.dir ?? 0);
  for (const o of [0, 1.2, -1.2]) {
    const x = a.x + px * o, z = a.z + pz * o;
    if (iceAt(x, z) !== 'thin') continue;
    if (D.shell && (stageAt(x, z) >= 2 || D.tired)) { D.t = 0; D.broke = { x, z }; return; }
    crackAt(Math.floor(x) + 0.5, Math.floor(z) + 0.5, 0.5, 1, { src: 'tower' });
  }
}
function rushEnd5(a, D) {
  a.avatar?.anim.stop?.(0.2);
  if (D.broke) { overturn(a, D.broke); return; }
  // (a Shell Rush run up against an open hole in the thin ice goes into it all the same)
  const L = G.zone.L, w = D.wall;
  if (D.shell && w && iceAt(w.x, w.z) === 'water' && L.ice?.[Math.floor(w.z) * L.w + Math.floor(w.x)]) { a.x += (w.x - a.x) * 0.6; a.z += (w.z - a.z) * 0.6; overturn(a, w); return; }
  // (the third Shell Rush that held: Alkyone calls the rule again at once, wherever she stands)
  if (D.shell && a.phase === 1 && a.rushes >= 3 && !a.hinted) { a.hinted = true; emit('towerHint', a); tally(a, 'hint'); }
  // (in the ice phase, off the thick after a rush that held: it hauls itself back onto it before anything else)
  if (a.phase === 1 && iceAt(a.x, a.z) !== 'thick') { const n = thickNear(a, a.x, a.z); if (n) { a.st = 'haul'; a.haul = n; a.move = null; } }
  if (!w) { puff(a.x, 0.3, a.z, 8, 0xa8b4bc, 1.2, 1.4, 1); return; }
  // into an islet's boulder or the wreck's ribs: dazed (the Silverhorn and the standing stone)
  const S = G.zone.L.spots || {}, near = (p, r) => p && Math.hypot(p.x - w.x, p.z - w.z) < r;
  const hard = (S.bayIslets || []).some((i) => near(i.boulder, 2.6)) || (S.ribs?.cells || []).some(([x, z]) => Math.hypot(x + 0.5 - w.x, z + 0.5 - w.z) < 1.6);
  explosion(a.x, a.z, 2.6, 0xc8d0d8, { smoke: 0x8a9098, shake: 0.5 }); Audio.sfx('slam', { x: a.x, z: a.z });
  if (hard) { daze(a, 3); tally(a, 'rushDazed'); }
}
// through the ice: on its back in the hole, its underside glowing, 5 s (x2, its one window); the hole refreezes in time
function overturn(a, p) {
  a.dash = null; a.move = null; killTele(a.tele); a.tele = null;
  breakAt(p.x, p.z, 2.6);
  // (the ice phase is let go when it is up again, overEnd: struck under 30% on its back, it still lies there its 5 s)
  a.st = 'over'; a.overT = 5; a.rushes = 0; a.hinted = false; a.vulnWindow = true; a.y = -0.9;
  addVuln(a, 'overturned', 5);
  a.avatar?.play('overturned', 1); a.avatar?.setRim(0xffb070, 1.6);
  splashFx(a.x, a.z, 2.6); iceShards(a.x, a.z, 24); Audio.sfx('iceBreak', { x: a.x, z: a.z, vol: 1 }); Audio.sfx('splash', { x: a.x, z: a.z, vol: 1 }); shake(0.6);
  emit('towerOverturned', a); tally(a, 'overturned');
}
function overEnd(a) {
  a.vulnWindow = false; clearVuln(a, 'overturned'); a.y = 0;
  a.avatar?.play('shake', 1); splashFx(a.x, a.z, 2);
  a.st = 'haul'; a.haul = thickNear(a, a.x, a.z) || { x: a.x, z: a.z };
  if (a.lockPhase === 1) a.lockPhase = null;
}
// Hammer Claw: a 3 m circle on her (1.4 s: walked out of even wading), 1.3x and a 0.4 s stun; on ice +2 stages in it (+3
// after three Shell Rushes that never broke through: Alkyone calls the rule again, if the third Rush's end has not)
function hammerClaw(a, pl) {
  const aim = angleTo(a.x, a.z, pl.x, pl.z) + (a.blindT > 0 ? rand.sign() * 0.7 : 0), d = Math.min(Math.hypot(pl.x - a.x, pl.z - a.z), a.def.reach + 2.5);
  const tx = a.x + Math.sin(aim) * d, tz = a.z + Math.cos(aim) * d, extra = a.phase === 1 && (a.rushes || 0) >= 3;
  if (extra && !a.hinted) { a.hinted = true; emit('towerHint', a); tally(a, 'hint'); }
  a.rot = aim;
  a.tele = teleCircle(tx, tz, 3, 1.4, 0xff5010); bigTele(a, 1.4);
  a.avatar?.play('attack2', 1, { hitIn: 1.4 });
  return { t: 1.4, noFace: true, fn() {
    explosion(tx, tz, 3, 0xd8e0e8, { smoke: 0x8a98a8, shake: 0.6 }); ring(tx, tz, 3.2, 0xe8f4ff, 0.6); Audio.sfx('slam', { x: tx, z: tz });
    if (!pl.dead && Math.hypot(pl.x - tx, pl.z - tz) < 3 + pl.radius * 0.5) hitHero(a, pl, 1.3, { stun: 0.4 });
    if (crackAt(tx, tz, 3, extra ? 3 : 2, { src: 'tower' }) && extra) { a.rushes = 0; a.hinted = false; }
  }, after: 0.7 };
}
// the Tower Bell (phase 2): the cracked bell on its back tolls; a red 9 m ring round it with a blue calm of 4.5 m at its
// body (1.3 s): step in close. 1.2x between; thin ice in the ring cracks a stage
function towerBellMove(a) {
  a.tele = teleCircle(a.x, a.z, 9, 1.3, 0xff3020); bigTele(a, 1.3);
  const safe = teleCircle(a.x, a.z, 4.5, 1.3, 0x60c0ff);
  a.skerry?.userData.ring?.(1.5); Audio.sfx('towerBell', { x: a.x, z: a.z, vol: 1 });
  a.avatar?.play('rear', 1.4);
  const x = a.x, z = a.z;
  return { t: 1.3, noFace: true, fn() {
    killTele(safe); Audio.sfx('towerBell', { x, z, vol: 1, pitch: 0.85 }); ring(x, z, 9, 0xd8e8ff, 0.8); ring(x, z, 4.5, 0x9ad8ff, 0.6); shake(0.4);
    const p = G.player, dd = Math.hypot(p.x - x, p.z - z);
    if (!p.dead && dd > 4.5 && dd < 9 + p.radius * 0.5) hitHero(a, p, 1.2, { push: 6 });
    // (the ring's thin ice, not the calm's)
    for (let k = 0; k < 28; k++) { const g = (k / 28) * Math.PI * 2; for (const r of [5.5, 7, 8.5]) { const cx = x + Math.sin(g) * r, cz = z + Math.cos(g) * r; if (iceAt(cx, cz) === 'thin') crackAt(Math.floor(cx) + 0.5, Math.floor(cz) + 0.5, 0.5, 1, { src: 'tower' }); } }
    tally(a, 'bellRung');
  }, after: 0.8 };
}
// Brine Spit: three globs lobbed at her, landing at 1.0, 1.2 and 1.4 s in 2 m circles: 0.9x each, slush pools for 6 s
function brineSpit(a, pl) {
  a.avatar?.play('attack2', 1); Audio.sfx('brineSpit', { x: a.x, z: a.z });
  for (let i = 0; i < 3; i++) {
    const x0 = pl.x + (i ? rand.range(-3, 3) : 0), z0 = pl.z + (i ? rand.range(-3, 3) : 0), f = G.zone.map.walkable(x0, z0) ? { x: x0, z: z0 } : G.zone.map.nearestFloor(x0, z0, 3);
    const dl = 1.0 + i * 0.2;
    teleCircle(f.x, f.z, 2, dl, 0xff6a30);
    later(dl - 0.7, inZone(a, () => lob(a.x, a.z, f.x, f.z, 0.7, 4, 0x6a8a90, (x, z) => {
      splashFx(x, z, 1.3); Audio.sfx('slush', { x, z, vol: 0.7 });
      for (const p of heroes()) if (!p.dead && Math.hypot(p.x - x, p.z - z) < 2 + p.radius * 0.5) hitHero(a, p, 0.9, { cold: 6 });
      addSapPool(x, z, 2, 6, a, 'slush');
    })));
  }
  bigTele(a, 1.4);
  return { t: 0.5, fn() {}, after: 0.5 };
}
// Brood: a clatter from its shell, and four Hull-lice skitter out (six at most)
function brood(a) {
  a.avatar?.play('shake', 1); Audio.sfx('louseSkitter', { x: a.x, z: a.z, vol: 1 });
  return { t: 1.0, fn() {
    a.lice = alive(a.lice);
    for (let i = 0; i < 4 && a.lice.length < 6; i++) {
      const g = rand.range(0, 6.28), f = G.zone.map.nearestFloor(a.x + Math.sin(g) * (a.radius + 1), a.z + Math.cos(g) * (a.radius + 1), 3);
      const m = spawnMonster('hullLouse', f.x, f.z, { level: Math.max(1, a.level - 3), out: true });
      m.aggro = true; G.actors.push(m); a.lice.push(m);
    }
    tally(a, 'broodOut');
  }, after: 0.4 };
}
// Shake (phase 3): a 5 m ring round it (1.2 s), 1.0x and thrown; it shakes out the light on its back if it burns
function towerShake(a) {
  a.tele = teleCircle(a.x, a.z, 5, 1.2, 0xff5020); bigTele(a, 1.2);
  a.avatar?.play('shake', 1, { hitIn: 1.2 });
  return { t: 1.2, noFace: true, fn() {
    splashFx(a.x, a.z, 2.4); ring(a.x, a.z, 5, 0xd8e8ff, 0.5); Audio.sfx('splash', { x: a.x, z: a.z, vol: 1 }); shake(0.3);
    for (const p of heroes()) if (!p.dead && Math.hypot(p.x - a.x, p.z - a.z) < 5 + p.radius * 0.5) hitHero(a, p, 1.0, { push: 10 });
    if (a.lit) towerDark(a, true);
  }, after: 0.5 };
}
// Call the Drowned: the bay boils at two points of its edge (1.0 s) and two Sunken walk in (four at most; one more a call
// from Nightmare on)
function callDrowned(a, quiet) {
  const c = arena(a), n = 2 + H5().adds, pts = [];
  for (let k = 0; k < 24 && pts.length < n; k++) { const g = rand.range(-1.4, 1.4) + (pts.length % 2 ? Math.PI * 0.35 : -Math.PI * 0.35), x = c.x + Math.sin(g) * rand.range(13, 16), z = c.z + Math.cos(g) * rand.range(13, 16); if (G.zone.map.walkable(x, z) || deepAt(x, z)) pts.push({ x, z }); }
  for (const p of pts) { ring(p.x, p.z, 1.8, 0xd8ecff, 1); for (let k = 0; k < 5; k++) later(k * 0.2, inZone(a, () => splashFx(p.x, p.z, 1))); }
  const go = () => {
    // (its own list: a.drowned is kill()'s mark for what went down under the water, combat.js)
    a.drownedAdds = alive(a.drownedAdds);
    for (const p of pts) {
      if (a.drownedAdds.length >= 4 + H5().adds) break;
      const m = spawnMonster('sunken', p.x, p.z, { rising: true, level: Math.max(1, a.level - 2) });
      m.aggro = true; G.actors.push(m); a.drownedAdds.push(m);
    }
    tally(a, 'drownedIn');
  };
  if (quiet) { later(1.0, inZone(a, go)); return null; }
  Audio.sfx('surfSwell', { vol: 0.7 });
  return { t: 1.0, fn: go, after: 0.3 };
}
// the Island (phase 3): it settles, shell up, water running off its back: 6 s, x0.3, and on its flank its light to be lit
// from the Cradle (1.5 s, broken by a blow)
function islandStart(a) {
  a.st = 'island'; a.islandT = 6; a.resist = 0.3; a.move = null; a.dash = null;
  a.avatar?.play('settle', 1); Audio.sfx('towerBell', { x: a.x, z: a.z, vol: 0.6, pitch: 0.7 });
  for (let k = 0; k < 10; k++) later(k * 0.3, inZone(a, () => splashFx(a.x + rand.range(-2, 2), a.z + rand.range(-2, 2), 0.7)));
  if (!a.lit && !a.lightIt) {
    const it = a.lightIt = { kind: 'towerLight', x: a.x, z: a.z, r: 3.6, prompt: 'tower.light', tower: a };
    it.use = () => { if (a.st !== 'island' || a.lit || a.dead) return; lightChannel(it, 1.5, () => skerryFire(a), () => towerLit(a)); };
    G.zone.interact.push(it);
  }
  if (a.unlitT > 45 && !a.flask) towerFlask(a);
  tally(a, 'island');
}
function islandEnd(a) {
  a.resist = null; dropLightIt(a);
  a.st = 'fight'; a.avatar?.play('rise', 1); a.cd = Math.max(a.cd, 0.8);
  // the next Island: after 12 s of fighting (it is long enough to light it, the fight round it short enough to come again)
  later(bcd(12), inZone(a, () => { if (a.phase === 2 && a.st === 'fight' && !a.dash) { a.move = null; killTele(a.tele); a.tele = null; islandStart(a); } else if (a.phase === 2) a.islandDue = true; }));
}
// the Cradle's fire given across (the Island's light): dur s with the fire streaming to it; a blow worth a tenth of her life
// (one or several) breaks it, a lesser one does not. Like a touch (world.js), it takes the place of a basic attack held
// down, not of a skill
const CH = { hurt: 0 };
on('hurt', (f) => { CH.hurt += f; });
function lightChannel(it, dur, to, done) {
  const pl = G.player; if (!pl || pl.dead || (pl.act && pl.act.name !== 'basic') || G.mode !== 'play') return;
  pl.rot = angleTo(pl.x, pl.z, it.x, it.z); CH.hurt = 0;
  const c = new THREE.Vector3();
  pl.act = { name: 'touch', t: 0, dur, ev: [], clip: dur, move: 0, st: 0,
    update(dt, a) {
      if (CH.hurt >= 0.1) { a.dur = Infinity; pl.act = null; pl.avatar.anim.stop?.(0.15); return; }
      if ((a.st -= dt) <= 0) { a.st = 0.08; cradlePoint(c); fireStream({ x: c.x, y: c.y, z: c.z }, to(), 3); }
    },
    end() { done(); } };
  pl.avatar.play('interact', 1);
  Audio.sfx('lanternDrink', { x: it.x, z: it.z, vol: 0.5 });
}
function dropLightIt(a) { const it = a.lightIt; if (!it) return; it.used = true; const i = G.zone.interact.indexOf(it); if (i >= 0) G.zone.interact.splice(i, 1); a.lightIt = null; }
// lit: its light blazes and its beam spins (a 3 s turn): Blinded 8 s (x1.6, every blow of its aimed 40 degrees wide, its
// beam dazzling the Sunken round it); then the spray puts it out, until the next Island
function towerLit(a, flask) {
  if (a.dead || a.lit) return;
  a.lit = true; a.unlitT = 0; a.flask = false; a.hpFloor = 0;
  dropLightIt(a);
  a.skerry?.userData.setLit?.(true);
  const f = skerryFire(a);
  glowBurst(f.x, f.y, f.z, 0xfff0c8, 50, 5, 0.45, 1.1); shake(0.4);
  a.beam = addBeam(f.x, f.z, { y: f.y, period: 3, len: 20, tag: 'towerBeam', owner: a, intensity: 22 });
  Audio.sfx('lightCatch', { vol: 1 }); Audio.sfx('towerBell', { vol: 1, pitch: 1.2 }); Audio.mood({ lit: true });
  // (up off its Island as it ends by itself, and the next one 12 s on: the light goes dark in 8)
  if (a.st === 'island') islandEnd(a);
  a.blindT = 8; addVuln(a, 'blinded', 8);
  emit('towerLit', a, !!flask); tally(a, flask ? 'litFlask' : 'lit');
}
function towerDark(a, spray) {
  if (!a.lit) return;
  a.lit = false; a.blindT = 0; clearVuln(a, 'blinded');
  a.skerry?.userData.setLit?.(false);
  if (a.beam) { removeBeam(a.beam); a.beam = null; }
  if (spray) { const f = skerryFire(a); for (let k = 0; k < 16; k++) P({ add: false, x: f.x, y: f.y, z: f.z, vx: rand.range(-3, 3), vy: rand.range(1, 4), vz: rand.range(-3, 3), life: 0.9, size: 0.4, size1: 1.2, color: 0xd8e4ec, alpha: 0.6, alpha1: 0, grav: 4 }); Audio.sfx('splash', { x: a.x, z: a.z, vol: 0.8 }); }
  Audio.mood({ lit: false });
  tally(a, 'dark');
  if (a.islandDue && a.phase === 2 && a.st === 'fight') { a.islandDue = false; later(1.5, inZone(a, () => { if (a.st === 'fight' && !a.dash) { a.move = null; islandStart(a); } })); }
}
// unlit 45 s: Alkyone throws a flask of whale oil at its back (story.js plays her throw); in an echo, the shore rock's
// brazier throws it. The light catches 1.2 s later
function towerFlask(a) {
  a.flask = true; tally(a, 'flask');
  if (!a.echo) emit('towerFlask', a);
  else { const r = G.zone.L.spots?.npcs?.rock; if (r) { const f = skerryFire(a); lob(r.x, r.z, f.x, f.z, 1.0, 6, 0xffa040, () => {}); } }
  later(1.2, inZone(a, () => towerLit(a, true)));
}
// dead: it crawls home to the skerry it slept on for a thousand years (about 3 s), settles there as an island, its light
// lit and turning slowly. She (and anything else) is set clear of the disc first, then those cells close for good
function towerHome(a, dt) {
  const z = G.zone, sk = z.L.spots?.skerry, av = a.avatar;
  if (TIDE?.force) TIDE.force = null;
  // (struck down on an Island: the light on its flank is no longer to be lit)
  dropLightIt(a);
  if (!sk || a.echo) return false;
  const H = a.homeD ||= { t: 0, l0: Math.hypot(sk.x - a.x, sk.z - a.z), crawl: false };
  H.t += dt;
  if (TIDE?.force) TIDE.force = null;
  if (a.beam && !H.lit) { removeBeam(a.beam); a.beam = null; }
  if (!H.home) {
    const dx = sk.x - a.x, dz = sk.z - a.z, l = Math.hypot(dx, dz);
    if (H.t > 1.4 && l > 0.2 && H.t < 8) {
      if (!H.crawl) { H.crawl = true; av?.play('crawl', 1); }
      const sp = Math.max(1.2, H.l0 / 3) * dt; a.x += (dx / l) * Math.min(sp, l); a.z += (dz / l) * Math.min(sp, l);
      a.rot = dampAngle(a.rot, Math.atan2(dx, dz) + Math.PI / 2, 2, dt); a.y = damp(a.y || 0, 0, 4, dt);
    } else if (H.t > 1.4) {
      H.home = true; a.x = sk.x; a.z = sk.z; a.y = 0;
      av?.play('settle', 1);
      skerryClose(z, sk);
      a.skerry?.userData.setLit?.(true); H.lit = true;
      const f = skerryFire(a);
      addBeam(f.x, f.z, { y: f.y, period: 16, tag: 'islandBeam', intensity: 22 });
      addLightPool(sk.x, sk.z, 5.5, Infinity, 'island', { lamp: true, color: 0xffe8c8, intensity: 18 });
      checkpoint5(z, 'island');
      tally(a, 'home');
    }
  }
  if (av) { av.group.position.set(a.x, a.y || 0, a.z); av.group.rotation.y = a.rot; av.update(dt, { speed: H.crawl && !H.home ? 1 : 0, float: false }); av.setFlash(0); }
  skerryRide(a);
  return true;
}
function skerryClose(z, sk) {
  const pl = G.player, R0 = sk.r + 0.75;
  const clear = (p) => {
    const dx = p.x - sk.x, dz = p.z - sk.z, l = Math.hypot(dx, dz);
    if (l > R0 + (p.radius || 0.45)) return;
    const g = l > 0.01 ? Math.atan2(dx, dz) : Math.PI;
    for (const o of [0, 0.4, -0.4, 0.9, -0.9, 1.6, -1.6, 3.1]) { const x = sk.x + Math.sin(g + o) * (R0 + 1.2), zz = sk.z + Math.cos(g + o) * (R0 + 1.2); if (z.map.walkable(x, zz)) { p.x = x; p.z = zz; p.kx = p.kz = 0; return; } }
    const f = z.map.nearestFloor(sk.x, sk.z + R0 + 1.5, 8); p.x = f.x; p.z = f.z;
  };
  if (pl && !pl.dead) { pl.pull = null; clear(pl); }
  for (const b of z.actors) if (b.team === 'foe' && !b.dead && !b.boss) clear(b);
  if (z.map.close(sk.cells, false)) emit('mapChanged');
}
// a death or a walk away from the bay: the water is at low again when she is back (tide.js), and the Tower up out of it
on('zoneEnter', (id, z) => { const b = z?.boss; if (b && b.kind === 'tower' && b.awake && !b.dead) towerReset(b); });
function towerAway(a) {
  if (TIDE?.force) TIDE.force = null;
  if (a.st === 'under' || a.st === 'dive' || a.st === 'rear') { a.br = null; killTele(a.tele); a.tele = null; towerUp(a); }
  if (a.phase === 0 && a.tide) a.tide = { st: 'low', t: bcd(16) };
  setWake(0, 0, 0, 0); Audio.mood({ sub: 0 }); tally(a, 'away');
}
function towerReset(a) {
  a.br = null; killTele(a.tele); a.tele = null; a.dash = null; a.move = null; a.bigs = [];
  if (a.st === 'under' || a.st === 'dive' || a.st === 'rear') { a.under = false; a.y = 0; a.st = 'fight'; }
  if (a.phase === 0) a.tide = { st: 'low', t: bcd(16) };
  setWake(0, 0, 0, 0); Audio.mood({ sub: 0 });
}

// ---------- the Skotos: the dark that was there before the first fire ----------
// Phase 1, It Rises: Hands break up through the ice ring (three at most; two or more ward the body, -50%) and Sweep and
// Lash; the body sends the Black Wave and Drinks the Light. Phase 2, the Night: the sky goes black, the Cradle shrinks to
// 2.5 m, the cairns go out; it sinks and its shadow circles under the ring, and every 9 s it Breaches where she chooses (a
// hole near her, the ice under her, the thin ice nearest), up for 4.5 s, Exposed, or Seared beside a lit cairn. Selna
// falters at 55, 45 and 35%; each Remember (story.js) tears it up; the 30% floor holds until the third (lockPhase).
// Phase 3, the Farthest Light: it wraps the tower in two Hands (the keepers come: story.js); once Whitecliff's fire is
// given to the Light ('farLightGiven') the beam sweeps the arena and each pass Sears it, while it Smothers the light with
// the Coil and calls the Deep Cold over everything not in the light. At 0% it is named (story.js), and sinks
const SKOTOS = {
  name: 'skotos', phases: [0.65, 0.3], wake: 60,
  intro(a) {
    emit('bossIntro', a); tally(a, 'intro');
    Audio.sfx('skotosRoar', { vol: 0.8 }); shake(0.4);
    a.remembers = a.remembers || 0; a.hq = [a.t + 1.2, a.t + 2.8, a.t + 4.4];
    a.mcd.wave = bcd(7); a.mcd.drink = bcd(15); a.mcd.slam = 3;
    a.atmK = 0;
    // (the Night waits for the Black Wave: phase 1 holds until one has come, 25 s at most; what she deals meanwhile still
    // counts, down to 55%)
    a.lockPhase = 0; a.lock0T = 25; a.hpFloor = a.hpMax * 0.55;
  },
  onPhase(a, ph) { if (ph === 1) skotosNight(a); if (ph === 2) wrapLight(a); },
  tick(a, dt, pl, d) {
    // beneath the ice (the Night), or a beat it owns: no blow of the body's own
    if (a.under || a.hidden || a.nb) return 0;
    // Drink the Light is broken by a blow worth 4% of its life
    const m = a.move; if (m?.drink && !m.fired && m.hp0 - a.hp > a.hpMax * 0.04) { a.move = null; killTele(a.tele); a.tele = null; a.avatar?.play('recoil', 1); puff(a.x, 6, a.z, 16, 0x0e0c14, 2, 2, 1.2); a.cd = 1; tally(a, 'drinkBroken'); return 0; }
    return null;
  },
  moves: [
    { id: 'cold', when: (a) => a.phase === 2 && heroNear(a, 26) && roomFor(a), cdOf: cdm(18.75), run: (a) => deepCold(a) },
    { id: 'smother', when: (a) => a.phase === 2 && a.relit && !a.coil && !(a.beamOffT > 0), cdOf: cdm(25), run: (a) => smother(a) },
    { id: 'wave', when: (a) => a.phase !== 1 && heroNear(a, 20) && roomFor(a), cdOf: cdm([14, 16, 22.5]), run: (a, pl) => { a.waveN = 0; return blackWave(a, pl); } },
    { id: 'drink', when: (a) => a.phase === 0 && heroNear(a, 20) && roomFor(a), cdOf: cdm(20), run: (a, pl) => drinkLight(a, pl) },
    { id: 'slam', basic: true, when: (a, d) => a.phase !== 1 && d < 8.5 && roomFor(a), cdOf: cdm(5), run: (a, pl) => bodySlam(a, pl) }
  ]
};
// every frame, a daze or a move included: where it stands, its Hands, the Night under the ice, the beam on it, the fight's
// light and sky and camera, Selna's falters (story.js), the Icemaws, the 30% floor and the Remembers
function skotosPre(a, dt, pl, d) {
  const base = a.wrapped ? -2.6 : -4.2;
  if (!a.awake) { a.y = a.hidden ? -9 : damp(a.y ?? base, base, 1.2, dt); return 0; }
  const z = G.zone, near = heroNear(a, 30);
  if (a.invuln > 0 && (a.invuln -= dt) <= 0) a.invuln = 0;
  // a fight left behind past the third Remember (a death, a walk away: her name is hidden again, story.js): the Night
  // again, from its start, and the Remembers to play again
  if (!a.echo && a.phase >= 1 && (a.remembers || 0) >= 3 && !G.selnaBack && !a.dead) skotosNight(a, true);
  if (!a.nb) { a.x = a.home.x; a.z = a.home.z; a.y = damp(a.y ?? base, base, 1.2, dt); }
  handsTick(a, dt, pl);
  // (struck to 65% before its first Black Wave: the Wave comes next)
  if (a.lockPhase === 0 && (a.waved || (a.lock0T -= dt) <= 0)) a.lockPhase = null;
  else if (a.lockPhase === 0 && a.hp <= a.hpMax * 0.65) a.mcd.wave = Math.min(a.mcd.wave || 0, 0);
  // the sky and the Cradle: the fight's framing, the Night's black and its 2.5 m of light, the Drink's dark
  const atm = a.phase === 1 ? ATMOS.farlightNight : ATMOS.farlightFight;
  if (a.atmK < 1 && near) { a.atmK = Math.min(1, (a.atmK || 0) + dt / 2); setAtmosphere(a.atmK >= 1 ? atm : mixAtmos(a.atmFrom || ATMOS.farlight, atm, a.atmK)); }
  if (a.drinkT > 0) a.drinkT -= dt;
  setHeroLight(!near ? null : a.drinkT > 0 ? 0 : a.phase === 1 ? 2.5 : null, a);
  // the Night: the shadow, the Breaches, the falters, the Icemaws, the floor and the third Remember
  if (a.phase === 1) {
    if (a.nb) nightTick(a, dt, pl);
    if (!a.echo && a.remembers < 3 && !z.remember && (a.falterT = (a.falterT ?? 0) - dt) <= 0 && a.hp < a.hpMax * [0.55, 0.45, 0.35][a.remembers]) { a.falterT = 15; emit('skotosFalter', a, a.remembers); tally(a, 'falter'); }
    if (a.echo) echoCairns(a);
    if ((a.maws || 0) < 2 && a.hp < a.hpMax * [0.55, 0.4][a.maws || 0]) { a.maws = (a.maws || 0) + 1; callIcemaw(a); }
    // (at the 30% floor: forty seconds of it, while she is up and in the fight, and Selna remembers herself, story.js; the
    // clock is the actor's, so a death or a walk away only pauses it)
    if (a.hp <= a.hpMax * 0.3 + 1 && (a.remembers || 0) < 3) {
      if (!a.floorSaid) { a.floorSaid = true; a.floorT = 0; emit('skotosFloor', a); tally(a, 'floor'); }
      if (!a.echo && near && !pl.dead && G.mode === 'play' && (a.floorT += dt) >= 40) { a.floorT = -1e9; emit('skotosSelf', a); tally(a, 'self'); }
    }
    if (a.lockPhase === 1 && (a.remembers || 0) >= 3) { a.lockPhase = null; a.hp = Math.min(a.hp, a.hpMax * 0.299); a.hpFloor = Math.min(a.hp, a.hpMax * 0.299); tally(a, 'remembered'); }
  }
  if (a.phase === 2) {
    // the beam: each pass over it Sears it (dazed 2.5 s, x1.5 for 4 s) and sends every Hand under for 5 s
    const b = a.beam, inB = !!b && !a.under && beamHas(b, a.x, a.z);
    if (inB && !a.beamIn && !a.dead) sear(a);
    a.beamIn = inB;
    if (a.coil) coilTick(a, dt);
    if (a.beamOffT > 0 && (a.beamOffT -= dt) <= 0) skotosBeam(a);
    if (!a.rolled && a.hp < a.hpMax * 0.15) { a.rolled = true; emit('skotosRoll', a); tally(a, 'roll'); }
  }
  // the camera, lowered and drawn back so the hood stays in the frame when she is near it (a little ahead, toward it)
  if (near && !pl.dead) {
    const D = Math.hypot(a.x - pl.x, a.z - pl.z), k = a.under || a.hidden ? 0 : clamp((18 - D) / 11, 0, 1), g = angleTo(pl.x, pl.z, a.x, a.z);
    fightCam(dt, clearFarLight({ p: 0.72 - 0.15 * k, y: 2.4 + 1.4 * k, z: 1.25 + 0.17 * k, ax: Math.sin(g) * 2.2 * k, az: Math.cos(g) * 2.2 * k }, g, k));
  } else fightCam(dt, null);
  return 0;
}
// The Farthest Light stands on the core's south side, some 19 m tall: a camera this low and this far back would stand in
// its shaft while she fights north of it. There the camera first leans further toward the Skotos (the aim carries it
// north, and keeps the hood in the frame), then steepens (and comes in) until it is clear of the tower's north face.
// Within some 9 m of the tower it takes the play camera's framing back: the tower is then near enough to her for the
// occluder's hole round her (build.js) to show her through it.
function clearFarLight(w, g, k) {
  const FL = G.zone.L.spots.farLight, pl = G.player, c = R.cam; if (!FL) return w;
  const dl = FL.z - pl.z;
  if (Math.abs(pl.x - FL.x) > 4.5 || dl < 0) return w;
  let room = FL.z - 4.2 - (pl.z + w.az);
  const over = Math.cos(w.p) * c.dist * w.z * (c.aspectZoom || 1) - room, n = -Math.cos(g);
  if (over > 0 && n > 0.3) { const e = Math.min(2.6 * k, over / n); w.ax += Math.sin(g) * e; w.az += Math.cos(g) * e; room += e * n; }
  const p = Math.acos(clamp(room / (c.dist * w.z * (c.aspectZoom || 1)), 0, 1));
  if (p > w.p) w.p = Math.min(1.3, p);
  const near = clamp((11.5 - dl) / 2.5, 0, 1);
  if (near > 0) { w.p += (0.95 - w.p) * near; w.y += (0.9 - w.y) * near; w.z += (1.05 - w.z) * near; w.ax *= 1 - near; w.az *= 1 - near; }
  return w;
}
on('zoneEnter', (id, z) => { const b = z?.boss; if (b && b.kind === 'skotos' && b.awake && !b.dead) { b.atmK = 0; b.atmFrom = ATMOS.farlight; b.bigs = []; b.handsRising = 0; } });

// ---------- the Hands: up out of the ice ring; one cut sinks and another comes up at another spot 12 s later ----------
// (they stand in the water of their own holes: never drowned or floundering there, ice.js FALLS)
FALLS.skotosHand = FALLS.skotosCoil = () => true;
// she is remembering Selna (a touch at her pad, story.js): the dark holds its blows for that breath
const remembering = () => { const it = G.zone?.remember, p = G.player; return !!it && p?.act?.name === 'touch' && Math.hypot(p.x - it.x, p.z - it.z) < 3; };
const handsUp = (a) => (a.handList || []).filter((h) => !h.dead && !h.removed && !h.sinking);
function handsTick(a, dt, pl) {
  const want = a.phase === 0 ? 3 : 2, list = a.handList ||= [], q = a.hq ||= [];
  // a Hand gone (cut, or sent under): its hole lets go, and its slot comes round again
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i];
    if (!h.dead && !h.removed) continue;
    list.splice(i, 1); handHole(h, false);
    if (h.dead && !h.sinking) { q.push(a.t + 12); tally(a, 'handCut'); }
  }
  const up = handsUp(a);
  // too many for this phase: the newest sink, and no slot comes back for them
  while (up.length > want) { const h = up.pop(); handSink(a, h, -1); }
  q.sort((x, y) => x - y);
  while (up.length + (a.handsRising || 0) + q.length < want) q.push(a.t + 3);
  while (up.length + (a.handsRising || 0) + q.length > want && q.length) q.pop();
  if (q.length && q[0] <= a.t && roomFor(a) && !pl.dead && heroNear(a, 30)) { q.shift(); riseHand(a, pl); }
  // each Hand turns to her and, every 5 s (staggered), Sweeps her if she is in reach or Lashes at her from further off
  for (const h of up) {
    h.rot = dampAngle(h.rot, angleTo(h.x, h.z, pl.x, pl.z), 2.2, dt);
    if ((h.holdT = (h.holdT ?? 8) - dt) <= 0) { h.holdT = 8; if (stageAt(h.x, h.z) !== 4) breakAt(h.x, h.z, 1.0); }
    if (h.busy || (h.mvT = (h.mvT ?? 1.5) - dt) > 0 || pl.dead || !roomFor(a) || remembering()) continue;
    const dd = Math.hypot(pl.x - h.x, pl.z - h.z);
    if (dd < 6.6) { handSweep(a, h, pl); h.mvT = bcd(5) + rand.range(0, 1); }
    else if (dd < 9.5) { handLash(a, h, pl); h.mvT = bcd(5) + rand.range(0, 1); }
  }
  // a grip broken: the Hand cut, or struck for a tenth of its life
  const g = a.grip;
  if (g && (pl.pull !== g.pull || g.h.dead || g.h.removed || g.h.sinking || g.hp0 - g.h.hp > g.h.hpMax * g.free)) {
    if (pl.pull === g.pull) { pl.pull = null; for (let i = 0; i < 10; i++) P({ x: pl.x, y: 1.0, z: pl.z, vx: rand.range(-3, 3), vy: rand.range(1, 3), vz: rand.range(-3, 3), life: 0.4, size: 0.2, size1: 0.04, color: 0x9affd8 }); }
    a.grip = null;
  }
  // two Hands up or more: the body is warded (-50%)
  if (up.length >= 2 && !a.under) { a.ward = Math.max(a.ward || 0, 0.3); if (!a.wardLook) { a.wardLook = true; a.avatar?.setRim(0xb090ff, 1.3); } }
  else if (a.wardLook) { a.wardLook = false; restoreRim(a); }
}
// Hand Rise: a ring of cracks at a Hand spot (2.5 m, 1.6 s, the ice groaning), 1.1x to whoever is in it; the Hand bursts up
// and its hole stays open while it stands. Never in lamp light, never where the last one was cut
function riseHand(a, pl) {
  const S = G.zone.L.spots, used = handsUp(a).map((h) => h.spot);
  const free = (S.hands || []).filter((s) => !used.includes(s) && s !== a.lastSpot && !lampLightAt(s.x, s.z));
  if (!free.length) { (a.hq ||= []).push(a.t + 2); return; }
  free.sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z));
  const s = free[Math.min(free.length - 1, rand.int(0, 2))];
  // (its own count: a.rising is the rise every actor waits out, and would hold the whole Skotos still)
  a.handsRising = (a.handsRising || 0) + 1; a.lastSpot = s;
  teleCircle(s.x, s.z, 2.5, 1.6, 0xff6a30); bigTele(a, 1.6);
  crackAt(s.x, s.z, 2.5, 1, { src: 'hand' }); iceShards(s.x, s.z, 10);
  Audio.sfx('handRise', { x: s.x, z: s.z }); Audio.sfx('iceCreak', { x: s.x, z: s.z, vol: 0.8 });
  later(1.6, inZone(a, () => {
    a.handsRising = Math.max(0, (a.handsRising || 1) - 1);
    breakAt(s.x, s.z, 1.2); iceShards(s.x, s.z, 18); splashFx(s.x, s.z, 1.6); shake(0.3);
    for (const p of heroes()) if (!p.dead && Math.hypot(p.x - s.x, p.z - s.z) < 2.5 + p.radius * 0.5) hitHero(a, p, 1.1, { push: 7, kx: p.x - s.x, kz: p.z - s.z });
    const h = spawnMonster('skotosHand', s.x, s.z, { level: a.level });
    h.hand = a; h.awake = true; h.aggro = true; h.spot = s; h.rot = angleTo(s.x, s.z, pl.x, pl.z); h.mvT = 1.4 + rand.range(0, 1.5);
    h.avatar?.play('rise', 1); G.actors.push(h); (a.handList ||= []).push(h);
    handHole(h, true); tally(a, 'handRise');
  }));
}
// the cells under a Hand are held open (ice.js I.held: no beam or Frost Nova closes them while it stands)
function handHole(h, on) {
  const I = ICE, L = G.zone.L; if (!I || !L?.ice) return;
  I.held ||= new Set();
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const ix = Math.floor(h.x) + dx, iz = Math.floor(h.z) + dz; if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) continue; if (on) I.held.add(iz * L.w + ix); else I.held.delete(iz * L.w + ix); }
}
// a Hand sent under (the beam, a phase): it sinks, and comes up again (at another spot) after wait seconds (-1: never)
function handSink(a, h, wait) {
  if (h.sinking || h.dead) return;
  h.sinking = true; h.under = true; killTele(h.tele); h.tele = null;
  h.avatar?.play('sink', 1); splashFx(h.x, h.z, 1.2);
  later(0.9, () => { if (!h.removed) h.remove(); });
  if (wait >= 0) (a.hq ||= []).push(a.t + wait);
}
// Sweep: a 6 m cone (1.2 s), 1.1x and thrown; the thin ice in it cracks a stage
function handSweep(a, h, pl) {
  const rot = angleTo(h.x, h.z, pl.x, pl.z);
  h.busy = true; h.rot = rot;
  h.tele = teleCone(h.x, h.z, rot, 6, 1.2, 1.2, 0xff5a20); bigTele(a, 1.2);
  h.avatar?.play('sweep', 1, { hitIn: 1.2 }); Audio.sfx('skotosSweep', { x: h.x, z: h.z, vol: 0.6 });
  later(1.2, inZone(a, () => {
    h.busy = false; h.tele = null; if (h.dead || h.sinking) return;
    for (const p of heroes()) if (!p.dead && inCone(h.x, h.z, rot, 6, 1.2, p)) hitHero(a, p, 1.1, { push: 8, kx: p.x - h.x, kz: p.z - h.z });
    crackCone(h.x, h.z, rot, 6, 1.2, 1, { src: 'hand' }); tally(a, 'sweep');
  }));
}
// Lash: a sea-green 9 x 1.6 m line (1.0 s), 1.0x and Grabbed: pulled 4 m toward the Hand (never past the first deep cell or
// a wall) and held 1 s. A roll in the warning slips it; a blow worth a tenth of the Hand's life frees her
function handLash(a, h, pl) {
  const rot = angleTo(h.x, h.z, pl.x, pl.z), stamp = pl.dodgeStamp || 0;
  h.busy = true; h.rot = rot;
  h.tele = teleLine(h.x, h.z, rot, 9, 1.6, 1.0, SEA); bigTele(a, 1.0);
  h.avatar?.play('lash', 1, { hitIn: 1.0 }); Audio.sfx('handLash', { x: h.x, z: h.z, vol: 0.8 });
  later(1.0, inZone(a, () => {
    h.busy = false; h.tele = null; if (h.dead || h.sinking) return;
    lashLands(a, h, rot, stamp, 0.1);
  }));
}
function lashLands(a, h, rot, stamp, free) {
  const p = G.player, ux = Math.sin(rot), uz = Math.cos(rot);
  for (let d = 1; d < 9; d += 0.7) P({ x: h.x + ux * d, y: 1.0, z: h.z + uz * d, life: 0.3, size: 0.28, size1: 0.05, color: 0x9affd8 });
  if (p.dead || (p.dodgeStamp || 0) !== stamp || p.iframes > 0 || !inLine(h.x, h.z, rot, 9, 1.6, p)) { tally(a, 'lashMissed'); return; }
  if (hitHero(a, p, 1.0, { kx: h.x - p.x, kz: h.z - p.z }) > 0) grip(a, h, p, free);
}
// pulled toward what grabbed her (0.35 s) and held there for a second (a path that stops: player.js follows it)
function grip(a, h, p, free) {
  if (p.pull || G.mode !== 'play') return;
  const dx = h.x - p.x, dz = h.z - p.z, l = Math.hypot(dx, dz), k = Math.min(4, l - (h.radius + p.radius + 0.5));
  let tx = p.x, tz = p.z;
  if (k > 0.3) { const f = G.zone.map.castT(p.x, p.z, p.x + (dx / l) * k, p.z + (dz / l) * k, 0.3); tx = p.x + (dx / l) * k * f; tz = p.z + (dz / l) * k * f; }
  const L0 = Math.max(0.01, Math.hypot(tx - p.x, tz - p.z)), len = L0 * (1.35 / 0.35);
  p.pull = { t: 1.35, t0: 1.35, sx: p.x, sz: p.z, x: tx, z: tz, path: [{ x: p.x, z: p.z, d: 0 }, { x: tx, z: tz, d: L0 }, { x: tx, z: tz, d: len }], len }; p.act = null;
  a.grip = { h, pull: p.pull, hp0: h.hp, free };
  number(p.x, 2.5, p.z, t('hud.grabbed'), 'text', '#7af0c8');
  tally(a, 'grabbed');
}

// ---------- the body's own blows ----------
// the Black Wave: a 18 x 5 m line from it across the arena (1.4 s), the ice along it darkening: 1.1x and Cold +20, every
// thin cell on it a stage. Twice running in the last phase
function blackWave(a, pl) {
  const rot = angleTo(a.x, a.z, pl.x, pl.z), x0 = a.x, z0 = a.z, n = a.waveN++;
  a.rot = rot;
  a.tele = teleLine(x0, z0, rot, 18, 5, 1.4, 0xd02a6a); bigTele(a, 1.4);
  for (let k = 0; k < 14; k++) later(k * 0.09, inZone(a, () => { const u = 2 + (k / 14) * 16; P({ add: false, x: x0 + Math.sin(rot) * u + rand.range(-2, 2), y: 0.15, z: z0 + Math.cos(rot) * u + rand.range(-2, 2), vy: 0.2, life: 1.4, size: 1.2, size1: 2.2, color: 0x06060c, alpha: 0.55, alpha1: 0 }); }));
  a.avatar?.play('sweep', 1, { hitIn: 1.4 }); Audio.sfx('skotosInhale', { vol: 0.8 });
  return { t: 1.4, noFace: true, fn() {
    Audio.sfx('skotosBreath', { vol: 1 }); shake(0.35); a.waved = true;
    const ux = Math.sin(rot), uz = Math.cos(rot);
    for (let d = 2; d < 18; d += 0.8) P({ add: false, x: x0 + ux * d, y: 0.6, z: z0 + uz * d, vx: ux * 6, vy: rand.range(0.5, 2), vz: uz * 6, life: 0.7, size: 1.0, size1: 2.4, color: 0x0a0812, alpha: 0.6, alpha1: 0 });
    crackLine(x0, z0, x0 + ux * 18, z0 + uz * 18, 5, 1, { src: 'skotos' });
    for (const p of heroes()) if (!p.dead && inLine(x0, z0, rot, 18, 5, p)) { hitHero(a, p, 1.1, { cold: 20, push: 6, kx: ux, kz: uz }); tally(a, 'waveHit'); }
  }, after: 0.4, chain: a.phase === 2 && n < 1, chainFn: blackWave };
}
// Drink the Light (phase 1): a 2 s channel, the light streaming into its chest; every light within 12 m of her goes out for
// 6 s (the cairns, the Cradle's ring). A blow worth 4% of its life breaks it (SKOTOS.tick)
function drinkLight(a, pl) {
  a.avatar?.play('drink', 1, { hitIn: 2.0 }); Audio.sfx('skotosDrink', { vol: 0.9 });
  a.tele = teleCircle(pl.x, pl.z, 12, 2.0, 0x6a4aa0); bigTele(a, 2.0);
  for (let k = 0; k < 20; k++) later(k * 0.1, inZone(a, () => { const p = G.player, g = rand.range(0, 6.28), r = rand.range(2, 10); P({ x: p.x + Math.sin(g) * r, y: 1.2, z: p.z + Math.cos(g) * r, vx: (a.x - p.x) * 0.5, vy: 2.2, vz: (a.z - p.z) * 0.5, life: 1.2, size: 0.3, size1: 0.05, color: 0xffd8a0, drag: 0.3 }); }));
  return { t: 2.0, drink: true, hp0: a.hp, noFace: true, fn() {
    const p = G.player;
    for (const it of G.zone.act5?.cairns || []) if (it.lit && Math.hypot(it.x - p.x, it.z - p.z) < 12) { it.mesh?.userData.setLit?.(false); const r0 = it.lightR; it.lightR = 0; shrinkPool(getLightPool('l5:cairn:' + it.i), 0, 6); later(6, () => { it.lightR = r0; if (it.lit) it.mesh?.userData.setLit?.(true); }); }
    a.drinkT = 6; glowBurst(a.x, 5, a.z, 0x2a1a40, 40, 4, 0.5, 1); tally(a, 'drunk');
  }, after: 0.6 };
}
// a slam of the body's own arm on her (3.2 m, 1.2 s, 1.25x): the robe's reach is 7 m, and she can stand at the ice edge
function bodySlam(a, pl) {
  const tx = pl.x, tz = pl.z;
  a.rot = angleTo(a.x, a.z, tx, tz);
  a.tele = teleCircle(tx, tz, 3.2, 1.2, 0xff4020); bigTele(a, 1.2);
  a.avatar?.play('slam', 1, { hitIn: 1.2 }); Audio.sfx('skotosSlam', { x: a.x, z: a.z, vol: 0.6, pitch: 1.2 });
  return { t: 1.2, noFace: true, fn() {
    explosion(tx, tz, 3, 0x2a2440, { smoke: 0x0e0c14, shake: 0.5 }); iceShards(tx, tz, 14); Audio.sfx('skotosSlam', { x: tx, z: tz });
    for (const p of heroes()) if (!p.dead && Math.hypot(p.x - tx, p.z - tz) < 3.2 + p.radius * 0.5) hitHero(a, p, 1.25, { push: 8, kx: p.x - tx, kz: p.z - tz });
    crackAt(tx, tz, 3, 1, { src: 'skotos' });
  }, after: 0.6 };
}

// ---------- phase 2: the Night ----------
// (again: a fight left behind past the third Remember starts its Night over at 65%: story.js hid her name again)
function skotosNight(a, again) {
  const z = G.zone, c = arena(a);
  a.lockPhase = 1; a.hpFloor = a.hpMax * 0.2; a.floorSaid = false; a.falterT = 2;
  if (again) {
    a.hp = Math.max(a.hp, a.hpMax * 0.649); a.remembers = 0; a.phase = 1; a.wrapped = false; a.relit = false; a.rolled = false;
    removeBeam('skotosBeam'); a.beam = null; a.beamOffT = 0; dropCoil(a); dropWrap(a); a.move = null; a.dash = null;
    tally(a, 'nightAgain');
  }
  a.atmK = 0; a.atmFrom = ATMOS.farlightFight; a.cairnSeen = new Set();
  for (const it of z.act5?.cairns || []) if (it.lit) it.snuff?.();
  a.move = null; killTele(a.tele); a.tele = null; a.mcd.slam = 4;
  a.avatar?.play('roar', 1); Audio.sfx('skotosRoar', { vol: 1 }); glowBurst(a.x, 6, a.z, 0x1a1428, 60, 6, 0.6, 1.4);
  // it goes under
  a.nb = { st: 'sinking', t: 1.4, ang: angleTo(c.x, c.z, a.x, a.z), R: 12, x: a.x, z: a.z };
  later(0.3, inZone(a, () => a.avatar?.play('sink', 1)));
  if (!again) tally(a, 'night');
}
// the shadow under the ring, the Breach where she chooses, up for 4.5 s (one Lash), and under again
function nightTick(a, dt, pl) {
  const N = a.nb, c = arena(a);
  if (N.st === 'sinking') {
    a.y = (a.y ?? -4.2) - dt * 5;
    if ((N.t -= dt) <= 0) { N.st = 'down'; N.t = bcd(N.first ? 9 : 4) - (a.early ? 4 : 0); N.first = true; a.early = false; a.under = true; a.hidden = true; for (const k of ['burn', 'poison']) a.status[k] = 0; }
    return;
  }
  if (N.st === 'down') {
    const want = angleTo(c.x, c.z, pl.x, pl.z), diff = angleDiff(N.ang, want);
    N.R = damp(N.R, clamp(Math.hypot(pl.x - c.x, pl.z - c.z), 8, 12.5), 0.6, dt);
    N.ang += clamp(diff * 3, -1, 1) * ((a.def.underSpeed || 4) / N.R) * dt + Math.sin(a.t * 0.7) * 0.05 * dt;
    N.x = c.x + Math.sin(N.ang) * N.R; N.z = c.z + Math.cos(N.ang) * N.R;
    setShade(3, N.x, N.z, 5, 1);
    if (Math.random() < dt * 10) { const g = N.ang + Math.sign(diff || 1) * 6 / N.R; P({ add: false, x: c.x + Math.sin(g) * N.R + rand.range(-0.8, 0.8), y: 0.1, z: c.z + Math.cos(g) * N.R + rand.range(-0.8, 0.8), vy: 0.6, life: 0.7, size: 0.18, size1: 0.3, color: 0xd8e8f0, alpha: 0.6, alpha1: 0 }); }
    const under = Math.hypot(pl.x - N.x, pl.z - N.z) < 5 ? 1 : 0;
    if (under !== N.under) { N.under = under; Audio.mood({ under }); }
    if ((N.t -= dt) <= 0 && roomFor(a) && !pl.dead && heroInArena(a, 4) && !(a.dazed > 0) && !remembering()) breachAt(a, pl);
    return;
  }
  if (N.st === 'tele') {
    N.x = damp(N.x, N.p.x, 4, dt); N.z = damp(N.z, N.p.z, 4, dt); setShade(3, N.x, N.z, 5, 1);
    if (N.ram && Math.random() < dt * 14) iceShards(N.p.x + rand.range(-2, 2), N.p.z + rand.range(-2, 2), 3);
    if (!N.ram && Math.random() < dt * 10) splashFx(N.p.x + rand.range(-1.5, 1.5), N.p.z + rand.range(-1.5, 1.5), 0.8);
    if ((N.t -= dt) <= 0) breachUp(a, pl);
    return;
  }
  if (N.st === 'up') {
    a.y = damp(a.y, -5.2, 3, dt);
    N.t -= dt;
    if (N.lashAt != null && N.t <= N.lashAt && !(a.dazed > 0) && roomFor(a) && !remembering()) { N.lashAt = null; bodyLash(a, pl); }
    if (N.t <= 0 && !(a.dazed > 0) && !a.lashing) { N.st = 'sinking'; N.t = 1.0; a.avatar?.play('sink', 1); splashFx(a.x, a.z, 2); Audio.sfx('splash', { x: a.x, z: a.z, vol: 0.8 }); N.ang = angleTo(c.x, c.z, a.x, a.z); N.R = clamp(Math.hypot(a.x - c.x, a.z - c.z), 8, 12.5); }
  }
}
// where it comes up: an open hole within 7 m of her if there is one (1.2 s of boiling water, 1.3x); else up under her if
// she stands on thin ice (1.5 s, the ice bulging white, 1.4x, a ram that breaks 3 m); else the thin ice nearest her
function breachAt(a, pl) {
  const N = a.nb, L = G.zone.L;
  let p = holeNear(pl.x, pl.z, 7), ram = false;
  if (!p) {
    ram = true;
    if (iceAt(pl.x, pl.z) === 'thin') p = { x: pl.x, z: pl.z };
    else {
      let bd = 1e9;
      for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) { const ix = Math.floor(pl.x) + dx, iz = Math.floor(pl.z) + dz; if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h || !L.ice?.[iz * L.w + ix]) continue; const d2 = dx * dx + dz * dz; if (d2 < bd && G.zone.map.walkable(ix + 0.5, iz + 0.5)) { bd = d2; p = { x: ix + 0.5, z: iz + 0.5 }; } }
    }
  }
  if (!p) p = { x: N.x, z: N.z };
  N.st = 'tele'; N.t = ram ? 1.5 : 1.2; N.p = p; N.ram = ram;
  a.tele = teleCircle(p.x, p.z, 3.5, N.t, 0xff4020); bigTele(a, N.t);
  if (ram) { ring(p.x, p.z, 3, ICE_W, N.t); Audio.sfx('iceCreak', { x: p.x, z: p.z, vol: 1 }); Audio.sfx('iceCrack2', { x: p.x, z: p.z, vol: 0.7 }); }
  else Audio.sfx('splash', { x: p.x, z: p.z, vol: 0.8 });
  Audio.sfx('skotosInhale', { vol: 0.6 });
  tally(a, ram ? 'ramTele' : 'holeTele');
}
function breachUp(a, pl) {
  const N = a.nb, p = N.p;
  if (N.ram) breakAt(p.x, p.z, 3);
  surfaceAt(a, p);
  const dd = Math.hypot(pl.x - p.x, pl.z - p.z);
  if (!pl.dead && dd < 3.5 + pl.radius * 0.5) hitHero(a, pl, N.ram ? 1.4 : 1.3, { push: 10, kx: pl.x - p.x, kz: pl.z - p.z });
  // Seared if it came up within 2 m of a lit cairn's light; else Exposed
  const seared = (G.zone.act5?.cairns || []).some((it) => it.lit && it.lightR > 0 && Math.hypot(it.x - p.x, it.z - p.z) < it.lightR + 2);
  addVuln(a, seared ? 'seared' : 'exposed', 4.5);
  N.st = 'up'; N.t = 4.5; N.lashAt = 3.2;
  tally(a, seared ? 'breachSeared' : 'breach');
}
function surfaceAt(a, p) {
  a.x = p.x; a.z = p.z; a.under = false; a.hidden = false; a.y = -8;
  if (a.avatar) { a.avatar.group.visible = true; a.avatar.play('surface', 1); }
  a.rot = angleTo(a.x, a.z, G.player.x, G.player.z);
  setShade(3, 0, 0, 0, 0); Audio.mood({ under: 0 });
  splashFx(p.x, p.z, 3); iceShards(p.x, p.z, 26); shake(0.6);
  Audio.sfx('skotosRise', { x: p.x, z: p.z, vol: 0.8 }); Audio.sfx('iceBreak', { x: p.x, z: p.z });
}
// up out of the ice, it reaches for her once: a Lash of its own arm (as a Hand's; a blow on it for 2% of its life frees her)
function bodyLash(a, pl) {
  const rot = angleTo(a.x, a.z, pl.x, pl.z), stamp = pl.dodgeStamp || 0;
  a.lashing = true; a.rot = rot;
  a.tele = teleLine(a.x, a.z, rot, 9, 1.6, 1.0, SEA); bigTele(a, 1.0);
  a.avatar?.play('lash', 1, { hitIn: 1.0 }); Audio.sfx('handLash', { x: a.x, z: a.z });
  later(1.0, inZone(a, () => { a.lashing = false; a.tele = null; if (a.under) return; lashLands(a, a, rot, stamp, 0.02); }));
}
// Selna remembered (story.js): it is torn up wherever its shadow is, dazed 3 s and Exposed
on('selnaRemembered', (b) => { if (b?.kind === 'skotos' && !b.dead) tornUp(b); });
function tornUp(a) {
  const N = a.nb; if (!N || a.phase !== 1) return;
  if (N.st !== 'up') { killTele(a.tele); a.tele = null; surfaceAt(a, N.st === 'tele' ? N.p : { x: N.x, z: N.z }); }
  N.st = 'up'; N.t = 4.5; N.lashAt = null;
  daze(a, 3); addVuln(a, 'exposed', 4.5);
  tally(a, 'tornUp');
}
// forgotten (12 s with no one to remember her): it mends 4% (never above 65%) and its next Breach comes 4 s early
on('selnaForgotten', (b) => {
  if (b?.kind !== 'skotos' || b.dead) return;
  b.hp = Math.max(b.hp, Math.min(b.hpMax * 0.65, b.hp + b.hpMax * 0.04));
  b.hpShow = 3; glowBurst(b.x, 3, b.z, 0x2a1a40, 24, 3, 0.4, 0.8);
  if (b.nb?.st === 'down') b.nb.t -= 4; else b.early = true;
  tally(b, 'forgotten');
});
// an echo has no Selna: a cairn she has lit again in the Night tears it up once and counts as a Remember, at the falters'
// own marks (55, 45, 35%: one a mark, so lighting them is not the Night's whole work)
function echoCairns(a) {
  const n = a.remembers || 0; if (n >= 3 || a.hp >= a.hpMax * [0.55, 0.45, 0.35][n]) return;
  const it = (G.zone.act5?.cairns || []).find((c) => c.lit && !a.cairnSeen.has(c));
  if (it) { a.cairnSeen.add(it); a.remembers = n + 1; tornUp(a); tally(a, 'echoRemember'); }
}
// an Icemaw leaves the ice edge (at 55% and at 40%)
function callIcemaw(a) {
  const L = G.zone.L, side = rand.sign();
  let p = null;
  for (let k = 0; k < 30 && !p; k++) { const x = a.home.x + side * rand.range(6, 13), z = a.home.z + rand.range(-2, 3), i = Math.floor(z) * L.w + Math.floor(x); if (L.sea?.[i]) p = { x, z }; }
  if (!p) return;
  setShade(2, p.x, p.z, 2.2, 1); later(1.2, inZone(a, () => setShade(2, 0, 0, 0, 0)));
  const m = spawnMonster('icemaw', p.x, p.z, { level: Math.max(1, a.level - 2) });
  m.aggro = true; G.actors.push(m); tally(a, 'icemaw');
}

// ---------- phase 3: the Farthest Light ----------
// Wrap the Light: it rises to its full height at the ice edge and wraps two Hands round the dark tower (3 s, she cannot be
// hurt); the cairns go out, the thin ring cracks to stage 2; the keepers come (story.js 'skotosWrap'). Until Whitecliff's
// fire is given to the Light (story.js 'farLightGiven'; an echo's light comes back by itself after 6 s) it is held 10% under
// where the Night left it (10% at the least): what she deals before the relight still counts
function wrapLight(a) {
  const z = G.zone, S = z.L.spots, FL = S.farLight, pl = G.player, c = arena(a);
  a.nb = null; a.wrapped = true; a.lockPhase = null; a.hpFloor = a.hpMax * Math.max(0.1, Math.min(a.hp / a.hpMax, 0.299) - 0.1);
  setShade(3, 0, 0, 0, 0); Audio.mood({ under: 0 });
  if (a.under || a.hidden) { a.under = false; a.hidden = false; if (a.avatar) a.avatar.group.visible = true; a.y = -9; }
  a.x = a.home.x; a.z = a.home.z; a.dazed = 0; a.dmgTaken = null; a.move = null; killTele(a.tele); a.tele = null;
  a.avatar?.play('wrap', 1); Audio.sfx('skotosRoar', { vol: 1 }); shake(0.7);
  a.invuln = 3; pl.iframes = Math.max(pl.iframes || 0, 3);
  a.atmK = 0; a.atmFrom = ATMOS.farlightNight;
  for (const it of z.act5?.cairns || []) if (it.lit) it.snuff?.();
  // the whole thin ring to a web
  const L = z.L;
  for (let dz = -15; dz <= 15; dz++) for (let dx = -15; dx <= 15; dx++) {
    const ix = Math.floor(c.x) + dx, iz = Math.floor(c.z) + dz; if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h || !L.ice?.[iz * L.w + ix] || dx * dx + dz * dz > 225) continue;
    const st = stageAt(ix + 0.5, iz + 0.5); if (st < 2) crackAt(ix + 0.5, iz + 0.5, 0.45, 2 - st, { src: 'wrap' });
  }
  // two Hands round the tower (not to be cut: they are the dark's grip on it)
  if (FL) a.wrapHands = [-1, 1].map((sx) => {
    const h = spawnMonster('skotosHand', FL.x + sx * 1.5, FL.z - 1.2, { level: a.level });
    h.hand = a; h.wrap = true; h.under = true; h.awake = true; h.rot = angleTo(h.x, h.z, FL.x, FL.z);
    h.avatar?.play('smother', 0.6, { loop: true }); G.actors.push(h); splashFx(h.x, h.z, 1.4);
    return h;
  });
  a.mcd.cold = 6; a.mcd.wave = 8; a.mcd.slam = 5; a.mcd.smother = 8;
  emit('skotosWrap', a); tally(a, 'wrap');
  if (a.echo) later(6, inZone(a, () => skotosRelit(a)));
}
function dropWrap(a) { for (const h of a.wrapHands || []) if (!h.removed) { h.avatar?.play('recoil', 1); later(0.5, () => { if (!h.removed) h.remove(); }); } a.wrapHands = null; }
on('farLightGiven', (b) => skotosRelit(b));
// the Light lit: its Hands let go of the tower, the beam sweeps the arena (8 s a turn, 26 m); those who brought the fire lift
// their lamps to it
function skotosRelit(a) {
  // (only while it wraps the Light: a fire given before a fight started over must not light the Night)
  if (!a || a.dead || a.kind !== 'skotos' || a.relit || !a.wrapped) return;
  a.relit = true; a.hpFloor = 0;
  dropWrap(a);
  skotosBeam(a);
  for (const f of G.zone.follow || []) if (!f.a.removed) { f.a.avatar?.play('castUp', 0.8); later(2.4, () => f.a.avatar?.anim.stop?.(0.4)); }
  tally(a, 'relit');
}
function skotosBeam(a) {
  const z = G.zone, FL = z.L.spots.farLight; if (!FL || a.dead) return;
  removeBeam('skotosBeam');
  a.beam = addBeam(FL.x, FL.z, { prop: z.act5?.farLight, tag: 'skotosBeam', period: 8, len: 26, owner: a, intensity: 30, theta: angleTo(FL.x, FL.z, a.x, a.z) + 1.2 });
}
// a pass of the beam: dazed 2.5 s, Seared (x1.5) 4 s, and every Hand under for 5 s
function sear(a) {
  daze(a, 2.5); addVuln(a, 'seared', 4);
  for (const h of handsUp(a)) handSink(a, h, 5);
  glowBurst(a.x, 6, a.z, 0xfff0c8, 50, 6, 0.5, 1); a.avatar?.play('recoil', 1); shake(0.4);
  Audio.sfx('lightCatch', { vol: 1 }); Audio.mood({ sear: 1 });
  tally(a, 'seared');
}
// Smother: a Hand climbs the tower and the Coil grips its foot, a 4 s ring over it; if the Coil still lives then, the beam is
// dark 8 s, and it lets go. The Coil is always Revealed
function smother(a) {
  const FL = G.zone.L.spots.farLight, x = FL.x + 2.3, z = FL.z - 1.6;
  const c = spawnMonster('skotosCoil', x, z, { level: a.level });
  c.hand = a; c.awake = true; c.aggro = true; c.rot = angleTo(x, z, FL.x, FL.z);
  addVuln(c, 'revealed', 999, { quiet: true }); c.avatar?.play('smother', 1);
  G.actors.push(c);
  a.coil = { c, t: 4, tele: teleCircle(x, z, 2.4, 4, 0xa070ff) };
  ring(x, z, 2.4, 0xa070ff, 1); iceShards(x, z, 12); Audio.sfx('smother', { x, z });
  a.avatar?.play('wrap', 1);
  tally(a, 'coil');
  return { t: 0.6, fn() {}, after: 0.4 };
}
function coilTick(a, dt) {
  const C = a.coil;
  if (C.c.dead || C.c.removed) { killTele(C.tele); a.coil = null; tally(a, 'coilCut'); return; }
  if ((C.t -= dt) > 0) return;
  removeBeam('skotosBeam'); a.beam = null; a.beamOffT = 8;
  G.zone.act5?.farLight?.userData.flash?.(0);
  dropCoil(a); tally(a, 'smothered');
}
function dropCoil(a) { const C = a.coil; if (!C) return; killTele(C.tele); if (!C.c.dead && !C.c.removed) { C.c.avatar?.play('sink', 1); later(0.8, () => { if (!C.c.removed) C.c.remove(); }); } a.coil = null; }
// The Deep Cold: every 15 s a red ring over the whole arena (2.0 s) with blue calms in the light: each lit cairn's 5 m, the
// keepers' lamps, the skerry's core (6 m). Outside them: 1.5x and Cold +30 (even through Warmed)
function deepCold(a) {
  const z = G.zone, c = arena(a), R0 = arenaR(16) + 3, S = z.L.spots, safes = [];
  for (const it of z.act5?.cairns || []) if (it.lit && it.lightR > 0) safes.push({ x: it.x, z: it.z, r: it.lightR });
  for (const p of lightPools()) if (p.lamp && p.r > 0 && Math.hypot(p.x - c.x, p.z - c.z) < R0 + 4) safes.push({ x: p.x, z: p.z, r: p.r });
  if (S.core) safes.push({ x: S.core.x, z: S.core.z, r: 6 });
  a.tele = teleCircle(c.x, c.z, R0, 2.0, 0xff2a20); bigTele(a, 2.0);
  const marks = safes.map((s) => teleCircle(s.x, s.z, s.r, 2.0, 0x60c0ff));
  a.avatar?.play('roar', 1); Audio.sfx('skotosInhale', { vol: 1 }); shake(0.3);
  return { t: 2.0, noFace: true, fn() {
    for (const m of marks) killTele(m);
    for (let i = 0; i < 70; i++) { const g = Math.random() * 6.28, r = Math.random() * R0; P({ add: false, x: c.x + Math.sin(g) * r, y: 0.2, z: c.z + Math.cos(g) * r, vy: rand.range(1, 3), life: 0.9, size: 0.7, size1: 1.6, color: 0xc8e0ff, alpha: 0.5, alpha1: 0 }); }
    Audio.sfx('skotosBreath', { vol: 1 }); Audio.sfx('freezeWave', { vol: 0.6 }); shake(0.5);
    const p = G.player, safe = safes.some((s) => Math.hypot(p.x - s.x, p.z - s.z) < s.r);
    if (!p.dead && Math.hypot(p.x - c.x, p.z - c.z) < R0 && !safe) { hitHero(a, p, 1.5); coldAdd(30, { pierce: true }); tally(a, 'coldHit'); } else tally(a, 'coldSafe');
  }, after: 0.6 };
}

// ---------- named: it stands while the names are said, and sinks as the ice closes (story.js 'naming') ----------
on('say', (k) => { if (typeof k === 'string' && k.startsWith('d.skotos.die2')) for (const a of G.actors) if (a.kind === 'skotos' && a.dead) a.sinkNow = true; });
on('skotosSink', () => { for (const a of G.actors) if (a.kind === 'skotos' && a.dead) a.sinkNow = true; });
function skotosDying(a, dt) {
  const av = a.avatar; if (!av) { a.remove(); return; }
  if (!a.endDone) {
    a.endDone = true;
    for (const h of [...(a.handList || []), ...(a.wrapHands || [])]) if (!h.removed && !h.dead) { h.avatar?.play('sink', 1); later(0.8, () => { if (!h.removed) h.remove(); }); handHole(h, false); }
    dropCoil(a); setShade(3, 0, 0, 0, 0); setHeroLight(null); Audio.mood({ under: 0 });
    a.nb = null; a.under = false; a.hidden = false; av.group.visible = true;
    av.play('recoil', 0.6); later(1.2, () => { if (!a.sinking) av.play('idle', 0.5); });
  }
  // (an echo, or no naming to wait for: it goes down at once)
  if (a.sinking == null && (a.sinkNow || a.echo || a.deadT > 45)) { a.sinking = 0; av.play('sink', 0.7); }
  if (a.sinking != null) { a.sinking += dt; a.y = (a.y ?? -4.2) - dt * (0.4 + a.sinking * 0.5); if (Math.random() < 0.3) splashFx(a.x + rand.range(-2, 2), a.z + rand.range(-2, 2), 1); }
  av.group.position.set(a.x, a.y || 0, a.z); av.update(dt, { speed: 0, float: false }); av.setFlash(0);
  if (a.sinking > 7) a.remove();
}

export { AI };
