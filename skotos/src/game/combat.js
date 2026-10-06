// Damage, status effects, deaths, experience and drops.
import { G, later, vibrate } from './state.js';
import { DIFFS, monsterXP, xpToNext, MAX_LEVEL, SKILLS, CLASSES, BUFFS } from './data.js';
import { makeItem } from './items.js';
import { refreshStats } from './stats.js';
import { number } from '../ui/overlay.js';
import { emit } from '../ui/bus.js';
import { hitFx, sparks, glowBurst, explosion, decal, puff, flash, ring, bolt, P } from '../gfx/fx.js';
import { shake, addLight, removeLight } from '../gfx/gfx.js';
import Audio from '../audio/audio.js';
import * as THREE from 'three';
import { rand, clamp, angleDiff } from '../core/util.js';
import { t, has, lang } from '../i18n/i18n.js';
import { foes, spawnMonster } from './actors.js';
import { dropGold, dropItem, dropGlobe } from './pickups.js';
import { area } from './projectiles.js';
import { addSapPool } from './sap.js';
import { lightAt, lightOn, addLightPool, relightNear } from './light.js';
import { staticGeo, makeCharMat } from '../gfx/rig.js';
import { slagParts } from '../gfx/models.js';
import { R as RR } from '../gfx/gfx.js';

const HIT_SFX = { flesh: 'hitFlesh', bone: 'hitBone', spirit: 'hitSpirit', chitin: 'hitChitin', ash: 'hitFlesh', stone: 'hitBone', magma: 'hitFlesh', wood: 'woodHit' };
const DIE_SFX = { goblin: 'goblinDie', wolf: 'wolfDie', spider: 'spiderDie', orc: 'orcDie', troll: 'trollRoar', skeleton: 'skeletonDie', wraith: 'wraithDie', hound: 'wolfDie', bat: 'batDie', worm: 'wormDie', dwarf: 'dwarfDie', golem: 'golemDie', moth: 'mothDie', bear: 'bearRoar', hart: 'hartBellow' };
const FLESH_DIE = { wood: 'woodDie' };
// a line of the game's text, or the words given if the text has none yet
const tx = (key, el, en) => (has(key) ? t(key) : lang() === 'en' ? en : el);

export function heroCrit() { return Math.random() * 100 < G.stats.critC; }

// the hero's outgoing damage for a skill hit: weapon roll * multipliers
export function heroHit(mult, o = {}) {
  const s = G.stats, p = G.player;
  let d = rand.range(s.wmin, s.wmax) * s.dmgMult * mult;
  if (o.area) d *= 1 + s.area / 100;
  if (p.buffs.cry > 0) d *= 1.3;
  if (p.buffs.shrineFury > 0) d *= 1.5;
  if (p.buffs.memory > 0) d *= 1 + BUFFS.memory.dmg;
  return d;
}

export function damage(src, target, amount, o = {}) {
  if (!target || target.dead || target.removed) return 0;
  if (target.team === 'hero' && target.hero) return hurtHero(src, amount, o);
  if (target.team === 'npc') return 0;
  // stepped into the trees, gone into mist, wheeling high above, or clinging to the hero's back: nothing to hit
  if (target.hidden || target.airborne || target.cling) return 0;
  // a keeper's statue in Karthax's cage: only his own hammer breaks it (ai.js)
  if (target.keeper) { if (!o.dot && !(target.immT > 0)) { target.immT = 0.6; number(target.x, 3, target.z, tx('hud.cage', 'Μόνο η φωτιά που τα έφτιαξε', 'Only the fire that made them'), 'text', '#ffb070'); } return 0; }
  const fromHero = src && (src.hero || src.team === 'hero');
  let crit = false;
  if (fromHero) {
    const s = G.stats;
    if (o.crit ?? (!o.dot && heroCrit())) { crit = true; amount *= 1 + s.critD / 100; }
    if (target.elite || target.boss) { amount *= 1 + s.eliteDmg / 100; if (s.legs.has('kingslayer')) amount *= 1.3; }
  }
  // invulnerable, or held by a Mourner's lament-bond
  if (target.invuln > 0 || target.bondT > 0) { if (!o.dot) number(target.x, 2.2, target.z, t('hud.immune'), 'text', target.bondT > 0 ? '#ffe8a0' : '#9ab8ff'); return 0; }
  if (target.armored) amount *= 0.72;
  if (target.ward > 0) amount *= 0.5;
  const blocked = act4Hit(src, target, o, fromHero);
  amount *= blocked;
  // dazed, rooted in bark, torn free: some states take more or less
  if (target.dmgTaken != null) amount *= target.dmgTaken;
  if (target.prop) amount = target.hp;
  amount = Math.max(1, Math.round(amount));
  target.hp -= amount;
  // a boss phase that a single burst may not skip
  if (target.hpFloor) target.hp = Math.max(target.hp, target.hpFloor);
  target.hpShow = 3;
  target.aggro = true;
  if (!o.dot) {
    target.flash = 1;
    if (target.avatar?.anim) target.avatar.anim.hit = target.boss ? 0.3 : 1;
    const def = target.def;
    const dx = o.kx ?? (src ? target.x - src.x : 0), dz = o.kz ?? (src ? target.z - src.z : 0), l = Math.hypot(dx, dz) || 1;
    if (!o.noFx) {
      hitFx(target.x, (def.big || target.boss ? 1.6 : 1.0) * (target.scale || 1), target.z, target.prop ? 'wood' : def.flesh === 'wood' ? 'bark' : def.flesh, dx / l, dz / l, crit);
      if (!o.quiet) Audio.sfx(target.prop ? 'break' : (HIT_SFX[def.flesh] || 'hitFlesh'), { x: target.x, z: target.z, vol: crit ? 1 : 0.8 });
      if (crit && !o.quiet) Audio.sfx('crit', { x: target.x, z: target.z, vol: 0.6 });
    }
    if (o.knock && !target.boss && !target.prop && !def.anchored && blocked > 0.5) {
      const k = o.knock / (def.big ? 3 : 1);
      target.kx += (dx / l) * k; target.kz += (dz / l) * k;
    }
    if (o.stun && !target.boss) target.status.stun = Math.max(target.status.stun, o.stun);
    if (o.freeze) { target.status.freeze = Math.max(target.status.freeze, target.boss ? o.freeze * 0.3 : o.freeze); }
    if (o.chill) { target.status.slow = Math.max(target.status.slow, o.chill); target.status.slowK = 0.4; }
    if (o.slow) { target.status.slow = Math.max(target.status.slow, o.slow.t); target.status.slowK = Math.max(target.status.slowK, o.slow.k); }
    if (o.fear && !target.boss) target.status.fear = Math.max(target.status.fear, o.fear);
    if (o.burn) { target.status.burn = 3; target.status.burnDps = Math.max(target.status.burnDps, o.burn / 3); }
    if (fromHero) {
      const s = G.stats, p = G.player;
      if (s.lifeOnHit && !o.noLoh) healHero(s.lifeOnHit * (o.lohMul ?? 1), true);
      if (s.legs.has('vampiricMail')) healHero(amount * 0.02, true);
      if (s.legs.has('emberRing') && !o.burn) { target.status.burn = 3; target.status.burnDps = Math.max(target.status.burnDps, (amount * 0.6) / 3); }
      if (o.res !== false && CLASSES[G.hero.cls].resOnHit && !o.noRes) p.res = Math.min(G.stats.resMax, p.res + CLASSES[G.hero.cls].resOnHit * (o.resMul ?? 1));
      if (target.affixes?.includes('vampiric')) { /* nothing on hero hit */ }
    }
  }
  number(target.x, (target.boss ? 3.2 : target.def.big ? 3.4 : 2.0) * (target.scale || 1), target.z, amount, o.dot ? 'dot' : crit ? 'crit' : 'hit');
  if (target.hp <= 0) kill(target, src, o);
  return amount;
}

export function healHero(v, quiet) {
  const p = G.player; if (!p || p.dead) return;
  const before = p.hp;
  p.hp = Math.min(p.hpMax, p.hp + v);
  if (!quiet && p.hp - before >= 1) number(p.x, 2.4, p.z, '+' + Math.round(p.hp - before), 'heal');
}

function hurtHero(src, amount, o) {
  const p = G.player;
  if (p.dead || G.mode !== 'play') return 0;
  if (p.iframes > 0) return 0;
  const s = G.stats;
  // o.pure: a share of her life whatever she wears (the Forge's Breath)
  if (o.dot !== true && !o.pure && s.block > 0 && Math.random() * 100 < s.block) { amount *= 0.45; number(p.x, 2.3, p.z, t('hud.block'), 'text', '#c8d0e0'); Audio.sfx('block'); }
  const L = src?.level || p.level || G.hero.level;
  const red = s.armor / (s.armor + 45 * L + 60);
  if (!o.pure) amount *= 1 - red;
  if (p.buffs.cry > 0) amount *= 0.77;
  if (p.buffs.shrineShield > 0) amount *= 0.6;
  if (s.legs.has('stoneborn') && p.hp < p.hpMax * 0.5) amount *= 0.8;
  // Seen by the dead (a Lampless alarm, Ivar's lantern): +15%
  if (p.buffs.seen > 0) amount *= 1.15;
  amount = Math.max(1, Math.round(amount));
  if (p.shield > 0) { const a = Math.min(p.shield, amount); p.shield -= a; amount -= a; if (amount <= 0) { sparks(p.x, 1.2, p.z, 6, 0xffd080, 3); return 0; } }
  p.hp -= amount;
  p.flash = 0.6;
  number(p.x, 2.2, p.z, amount, 'hurt');
  emit('hurt', amount / p.hpMax);
  if (!o.dot) {
    if (amount > p.hpMax * 0.08) { shake(0.25); vibrate(40); Audio.sfx('playerHurt', { vol: 0.8 }); }
    if (src && s.thorns && !src.dead && src.team === 'foe') damage(p, src, s.thorns, { noFx: true, quiet: true, noLoh: true, noRes: true });
    if (src?.affixes?.includes('vampiric')) { src.hp = Math.min(src.hpMax, src.hp + amount * 2); }
    if (o.slow) { p.status.slow = Math.max(p.status.slow, o.slow.t); p.status.slowK = Math.max(p.status.slowK, o.slow.k); }
    if (o.freeze) p.status.freeze = Math.max(p.status.freeze, o.freeze * 0.5);
    if (o.poison) { p.status.poison = 3; p.status.poisonDps = Math.max(p.status.poisonDps, o.poison / 3); }
    if (o.burn) { p.status.burn = 3; p.status.burnDps = Math.max(p.status.burnDps, o.burn / 3); }
    // Act III: amber roots (capped), blows that throw the hero back, shrieks that break a channel
    if (o.root) rootHero(o.root);
    if (o.push && src) { const dx = o.kx ?? p.x - src.x, dz = o.kz ?? p.z - src.z, l = Math.hypot(dx, dz) || 1; p.kx += (dx / l) * o.push; p.kz += (dz / l) * o.push; }
    if (o.interrupt && p.act && (p.act.name === 'whirl' || p.act.name === 'portal')) { p.act = null; p.avatar.anim.stop?.(0.15); }
    if (o.seen) seeHero(o.seen);
  }
  if (p.hp <= 0) { p.hp = 0; emit('heroDeath'); }
  return amount;
}

// Rooted: the hero's one Act III status. Only amber roots (sap amber-lock, the Song of Sorrow); at most 1.2 s,
// it cannot be refreshed while it holds, and when it ends the hero is immune for 1.8 s. A dodge always breaks it.
export function rootHero(t) {
  const p = G.player; if (!p || p.dead) return false;
  const s = p.status;
  if (s.rootImm > 0 || s.root > 0) return false;
  s.root = Math.min(1.2, t);
  s.stick = 0;
  for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = rand.range(0.2, 0.55); P({ add: false, x: p.x + Math.sin(a) * r, y: rand.range(0, 0.9), z: p.z + Math.cos(a) * r, vy: 0.2, life: 1.1, size: 0.22, size1: 0.18, color: 0xe0a030, alpha: 0.9, alpha1: 0 }); }
  glowBurst(p.x, 0.5, p.z, 0xffc050, 12, 1.5, 0.25, 0.5);
  Audio.sfx('sapRoot', { vol: 0.9 });
  emit('rooted', s.root);
  return true;
}
export function freeHero(crack = true) {
  const p = G.player; if (!p) return;
  const s = p.status, was = s.root > 0;
  s.stick = 0;
  if (!was) return;
  s.root = 0; s.rootImm = 1.8;
  if (crack) { sparks(p.x, 0.5, p.z, 12, 0xffd080, 4, { color1: 0xa05010 }); Audio.sfx('sapCrack', { vol: 0.8 }); }
}

// ---------- Act IV: the dead in the dark, the shield line, the Seen and the Clinging ----------
// what a blow is worth against an Act IV rule (1 = full): a Lampless struck unaware from outside its cone takes double;
// a guarding Ash-Fallen takes 15% from the front unless the blow is an area one, and a breaking blow (a stun, a freeze, a
// hard knock, o.breakGuard) drops its shield for 3 s; the Shrouded take 30% outside light, and a blow in light reveals them
function act4Hit(src, a, o, fromHero) {
  let k = 1;
  const def = a.def, pl = G.player;
  if (fromHero && def.ai === 'watch' && !a.aggro && !a.sneaked && pl) {
    a.sneaked = true;
    const d = Math.hypot(pl.x - a.x, pl.z - a.z), inCone = d < 8.5 && Math.abs(angleDiff(a.rot, Math.atan2(pl.x - a.x, pl.z - a.z))) < 0.75;
    if (!inCone) { k *= 2; number(a.x, 2.6, a.z, tx('hud.sneak', 'Απροειδοποίητα!', 'Unaware!'), 'text', '#d8e8ff'); }
  }
  const gd = def.guard;
  if (gd && !o.dot && !a.dormant && !(a.guardDown > 0)) {
    if (o.breakGuard || o.stun > 0 || o.freeze > 0 || (o.knock || 0) >= 8) breakGuard(a);
    else if (!o.area) {
      // the blow comes from against its push, or from where its source stands
      const bx = o.kx != null ? -o.kx : src ? src.x - a.x : 0, bz = o.kz != null ? -o.kz : src ? src.z - a.z : 0;
      if ((bx || bz) && Math.abs(angleDiff(a.rot, Math.atan2(bx, bz))) < gd.arc) {
        k *= gd.k;
        const fx = a.x + Math.sin(a.rot) * 0.5, fz = a.z + Math.cos(a.rot) * 0.5;
        sparks(fx, 1.2, fz, 8, 0xffe0b0, 4, { color1: 0x8a7a60 });
        if (!o.quiet) Audio.sfx('shieldBlock', { x: a.x, z: a.z, vol: 0.8 });
        if (a.state !== 'attack' && a.state !== 'wind') a.avatar?.play('blockHit', 1.3);
        a.blocks = (a.blocks || 0) + 1;
      }
    }
  }
  if ((def.shroud || a.shrouded) && !(a.unshroud > 0) && lightOn()) {
    if (lightAt(a.x, a.z)) a.revealed = 3;
    else if (!(a.revealed > 0)) {
      k *= 0.3;
      if (!o.dot && !(a.shroudTxt > 0)) { a.shroudTxt = 0.8; number(a.x, 2.7 * (a.scale || 1), a.z, tx('hud.shrouded', 'Σκιασμένος', 'Shrouded'), 'text', '#9aa8c0'); }
    }
  }
  return k;
}
export function breakGuard(a, t = 3) {
  if (!a.def.guard) return;
  const was = a.guardDown > 0;
  a.guardDown = t;
  if (was) return;
  a.avatar?.play('Idle_Shield_Break', 1.2); a.avatar?.setRim(0xff3020, 1.2);
  sparks(a.x, 1.2, a.z, 14, 0xffc080, 6, { color1: 0xa04010 });
  Audio.sfx('shieldBlock', { x: a.x, z: a.z, pitch: 0.7 });
  a.guardBreaks = (a.guardBreaks || 0) + 1;
}
// Seen: the dead know where she is (+15% damage taken), from a Lampless alarm or Ivar's lantern; an eye on the HUD (buffs.seen)
export function seeHero(t = 6) {
  const p = G.player; if (!p || p.dead) return;
  const fresh = !(p.buffs.seen > 0);
  p.buffs.seen = Math.max(p.buffs.seen || 0, t);
  if (fresh) { glowBurst(p.x, 2.4, p.z, 0xc8d8ff, 14, 1.5, 0.2, 0.6); emit('seen', t); }
}
// Clinging: Ember Ticks on the hero's back (two at most): -25% move and a burn tick a second each; a dodge throws them
// all off, stunned 1.5 s; one left on for 3 s bursts into a 2.5 m fire that burns its own kind too
export function clingHero(a) {
  const p = G.player; if (!p || p.dead || p.iframes > 0 || a.dead) return false;
  p.cling ||= [];
  if (p.cling.length >= 2 || p.cling.includes(a)) return false;
  p.cling.push(a); a.cling = true; a.clingT = 0; a.clingTick = 1; a.state = 'cling';
  a.avatar?.play('cling', 1, { loop: true });
  Audio.sfx('tickLatch', { x: p.x, z: p.z });
  sparks(p.x, 1.2, p.z, 10, 0xffa040, 3);
  if (!G.hero.flags.tickHint) { G.hero.flags.tickHint = true; emit('toast', tx('hud.shakeOff', 'Κύλησε για να το τινάξεις', 'Roll to shake it off')); }
  emit('cling', p.cling.length);
  return true;
}
export function shakeOff() {
  const p = G.player; if (!p?.cling?.length) return 0;
  const n = p.cling.length;
  for (const a of p.cling) {
    a.cling = false; a.y = 0; a.state = 'chase'; a.cd = 1.5;
    const ang = p.rot + Math.PI + rand.range(-0.7, 0.7), f = G.zone.map.nearestFloor(p.x + Math.sin(ang) * 1.6, p.z + Math.cos(ang) * 1.6, 3);
    a.x = f.x; a.z = f.z; a.status.stun = Math.max(a.status.stun, 1.5);
    a.avatar?.anim.stop?.(0.1); a.avatar?.play('hit', 1);
    sparks(a.x, 0.5, a.z, 8, 0xffa040, 3);
  }
  p.cling.length = 0;
  emit('cling', 0);
  return n;
}
export function tickCling(dt) {
  const p = G.player, c = p?.cling; if (!c?.length) return;
  for (let i = c.length - 1; i >= 0; i--) {
    const a = c[i];
    if (a.dead || a.removed || !a.cling || p.dead) { a.cling = false; c.splice(i, 1); emit('cling', c.length); continue; }
    a.clingT += dt; a.clingTick -= dt;
    if (a.clingTick <= 0) { a.clingTick += 1; hurtHero(a, a.dmg * 0.45, { dot: true }); sparks(a.x, a.y || 1.2, a.z, 4, 0xff8030, 2); }
    if (a.clingT >= 3) { c.splice(i, 1); emit('cling', c.length); tickBurst(a); }
  }
}
function tickBurst(a) {
  a.cling = false;
  const p = G.player, x = p.x, z = p.z;
  a.x = x; a.z = z; a.y = 0;
  explosion(x, z, 2.5, 0xff7a20, { smoke: 0x2a2220, shake: 0.3 });
  Audio.sfx('lavaBurst', { x, z, vol: 0.8 });
  hurtHero(a, a.dmg * 1.6, { burn: a.dmg * 0.6 });
  for (const f of foes(x, z, 2.5)) if (f !== a) damage(a, f, a.dmg * 1.6, { burn: a.dmg * 0.4, quiet: true });
  area('fire', x, z, 2.5, 2, { team: 'foe', src: a, dmg: a.dmg * 0.25, tick: 0.5 });
  kill(a, null, { burst: true });
}

// ---------- remains: where a foe fell near an Ashsmith, a mound of slag he can reforge it from (12 s) ----------
export const REMAINS = [];
let slagGeo = null, slagMat = null;
function addRemains(a) {
  if (a.boss || a.reforged || a.team !== 'foe' || a.def.anchored || a.pet || a.minion || a.kind === 'ashsmith' || a.kind === 'keeperStatue' || a.def.ai === 'diver') return;
  if (!G.actors.some((s) => s.kind === 'ashsmith' && !s.dead && Math.hypot(s.x - a.x, s.z - a.z) < 10)) return;
  const m = new THREE.Mesh(slagGeo ||= staticGeo(slagParts()), slagMat ||= makeCharMat({ rim: 0xff5a10, rimI: 0.3 }));
  m.position.set(a.x, 0, a.z); m.rotation.y = Math.random() * 6.28; m.scale.setScalar(0.01);
  RR.scene.add(m);
  REMAINS.push({ x: a.x, z: a.z, kind: a.kind, level: a.level, elite: a.elite, affixes: a.affixes, t: 0, dur: 12, zone: G.zone, mesh: m, claimed: null });
}
// the remains near (x, z) no Ashsmith has claimed yet (a living claimant keeps them)
export function remainsNear(x, z, r, by) {
  let best = null, bd = r * r;
  for (const q of REMAINS) { if (q.zone !== G.zone || (q.claimed && q.claimed !== by && !q.claimed.dead)) continue; const d2 = (q.x - x) ** 2 + (q.z - z) ** 2; if (d2 < bd) { bd = d2; best = q; } }
  return best;
}
export function takeRemains(q) { const i = REMAINS.indexOf(q); if (i >= 0) dropRemains(i); }
function dropRemains(i) { const q = REMAINS[i]; RR.scene.remove(q.mesh); REMAINS.splice(i, 1); }
export function updateRemains(dt) {
  for (let i = REMAINS.length - 1; i >= 0; i--) {
    const q = REMAINS[i]; q.t += dt;
    if (q.zone !== G.zone || q.t > q.dur) { dropRemains(i); continue; }
    q.mesh.scale.setScalar(Math.min(1, q.t * 2) * Math.min(1, (q.dur - q.t) / 1.5));
    if (Math.random() < dt * 3) P({ x: q.x + rand.range(-0.3, 0.3), y: 0.3, z: q.z + rand.range(-0.3, 0.3), vy: rand.range(0.4, 1), life: 0.6, size: 0.1, size1: 0.02, color: 0xffa040, color1: 0xff3000 });
  }
}
export function clearRemains() { while (REMAINS.length) dropRemains(REMAINS.length - 1); }

// ---------- status effects, once per frame per actor ----------
export function tickStatus(a, dt) {
  const s = a.status;
  if (s.root > 0) { s.root -= dt; if (s.root <= 0) { s.root = 0; s.rootImm = 1.8; if (a.hero) { sparks(a.x, 0.5, a.z, 12, 0xffd080, 4, { color1: 0xa05010 }); Audio.sfx('sapCrack', { vol: 0.8 }); } } }
  if (s.rootImm > 0) s.rootImm -= dt;
  if (s.stun > 0) s.stun -= dt;
  if (s.freeze > 0) s.freeze -= dt;
  if (s.fear > 0) s.fear -= dt;
  if (s.slow > 0) { s.slow -= dt; if (s.slow <= 0) s.slowK = 0; }
  s.dotT = (s.dotT || 0) + dt;
  if (s.dotT >= 0.5) {
    s.dotT -= 0.5;
    if (s.burn > 0) { const d = s.burnDps * 0.5; s.burn -= 0.5; if (a.hero) hurtHero(null, d, { dot: true }); else damage(G.player, a, d, { dot: true, noFx: true }); if (!a.dead) sparks(a.x, 1, a.z, 3, 0xff8030, 2); }
    if (s.poison > 0) { const d = s.poisonDps * 0.5; s.poison -= 0.5; if (a.hero) hurtHero(null, d, { dot: true }); else damage(G.player, a, d, { dot: true, noFx: true }); }
  }
}
export function moveMul(a) {
  const s = a.status;
  if (s.freeze > 0 || s.stun > 0 || s.root > 0) return 0;
  let m = 1;
  if (s.slow > 0) m *= 1 - s.slowK;
  // amber sap: the hero wades at 55%, flesh at 65% (wood and floaters never get onSap, see ai.js)
  if (a.onSap) m *= a.hero ? 0.55 : 0.65;
  if (a.hero && a.buffs?.shrineSpeed > 0) m *= 1.4;
  if (a.hero && a.buffs?.evergreen > 0) m *= 1.3;
  if (a.hero && a.buffs?.memory > 0) m *= 1 + BUFFS.memory.move;
  if (a.hero && a.cling?.length) m *= 0.75;
  return m;
}

// ---------- death ----------
export function kill(a, src, o = {}) {
  if (a.dead) return;
  a.dead = true; a.deadT = 0; a.hp = 0;
  const def = a.def;
  if (a.prop) { emit('propBroken', a); return; }
  if (a.pet) { a.avatar?.play(a.kind === 'spiritWolf' ? 'die' : 'die'); return; }
  // whatever trick it was in the middle of ends with it
  a.hidden = false; a.dash = null; a.dazed = 0; a.dmgTaken = null;
  const av = a.avatar;
  if (av) {
    av.anim.stop?.(0.1);
    if (def.dieClip) av.play(def.dieClip, 1);
    else if (av.kind === 'warg' || av.kind === 'spider') av.play('die');
    else av.play(a.kind.startsWith('skeleton') ? 'dieBones' : Math.random() < 0.5 ? 'die' : 'dieFwd', 1);
  }
  Audio.sfx(def.dieSfx || DIE_SFX[def.sfx] || FLESH_DIE[def.flesh] || 'hitFlesh', { x: a.x, z: a.z });
  actDeath(a, def);
  act4Death(a, def);
  if (def.flesh === 'flesh' || def.flesh === 'ash' || def.flesh === 'magma') decal(a.x, a.z, 'blood', 1.2 + a.radius);
  else if (def.flesh === 'wood') { puff(a.x, 0.6, a.z, 6, 0x4a3a28, 1, 1.2, 1.2); glowBurst(a.x, 1, a.z, 0xffb040, 10, 2, 0.2, 0.6); }
  else if (def.flesh === 'stone') puff(a.x, 0.8, a.z, 10, 0x8a8680, 1.4, 1.6, 1.6);
  else if (def.flesh === 'chitin') decal(a.x, a.z, 'goo', 1.2 + a.radius);
  else if (def.flesh === 'spirit') { decal(a.x, a.z, 'ecto', 1.4); glowBurst(a.x, 1.2, a.z, 0x7ae0ff, 24, 3, 0.3, 0.9); }
  if (o.overkill || (src?.hero && Math.random() < 0.15)) { puff(a.x, 0.8, a.z, 4, 0x2a1a14, 0.6, 0.6, 0.6); }
  if (a.team !== 'foe') return;
  const hero = G.hero, D = DIFFS[hero.diff], s = G.stats;
  // experience
  const em = a.boss ? 1 : a.elite === 'rare' ? 5 : a.elite === 'champion' ? 3 : a.minion ? 1.5 : 1;
  gainXP(monsterXP(a.level) * def.xp * D.xp * em);
  hero.stats.kills++;
  if (a.elite) hero.stats.elites++;
  // massacre counter
  const c = G.combo; c.n = c.t > 0 ? c.n + 1 : 1; c.t = 1.4;
  // drops
  const L = a.level;
  const goldChance = a.boss ? 1 : a.elite ? 1 : 0.32;
  const piles = a.boss ? 6 : a.elite ? 2 : 1;
  for (let i = 0; i < piles; i++) if (Math.random() < goldChance) dropGold(a.x, a.z, Math.round((3 + L * 1.6) * rand.range(0.6, 1.4) * D.gold * (1 + (s.gold + (G.player.buffs.shrineFortune > 0 ? 100 : 0)) / 100) * (a.boss ? 3 : 1)));
  const mf = s.mf + (G.player.buffs.shrineFortune > 0 ? 100 : 0);
  let items = 0;
  if (a.boss) items = 4 + Math.floor(D.loot);
  else if (a.elite === 'rare') items = rand.int(2, 3);
  else if (a.elite === 'champion') items = Math.random() < 0.7 ? 1 : 0;
  else if (Math.random() < 0.085 * D.loot) items = 1;
  for (let i = 0; i < items; i++) {
    const firstBoss = a.boss && i === 0 && !hero.flags['legFrom_' + a.kind];
    const it = makeItem(L, { elite: !!a.elite, boss: a.boss, mf, legMul: D.leg, rar: firstBoss ? 3 : (a.boss && i === 1 ? 2 : undefined) });
    if (firstBoss) hero.flags['legFrom_' + a.kind] = true;
    later(i * 0.12, () => dropItem(a.x, a.z, it));
  }
  if (Math.random() < (a.elite || a.boss ? 1 : 0.07)) dropGlobe(a.x + rand.range(-0.5, 0.5), a.z + rand.range(-0.5, 0.5));
  // legendary powers that trigger on kills
  if (s.legs.has('beaconAmulet')) healHero(G.player.hpMax * 0.05, true);
  if (s.legs.has('winterOrb') && a.status.freeze > 0) {
    explosion(a.x, a.z, 2.6, 0x9ad8ff, { smoke: 0x8ab0d0, shake: 0.1 });
    for (const f of foes(a.x, a.z, 3)) damage(G.player, f, G.stats.wmax * G.stats.dmgMult * 1.5, { freeze: 1, quiet: true });
  }
  if (s.legs.has('barrowCrown') && !a.boss && Math.random() < 0.12) emit('raiseAlly', a);
  // affixes
  if (def.deathFire) later(0.25, () => { explosion(a.x, a.z, 1.6, 0xff7a20, { smoke: 0x2a2220, shake: 0.05 }); area('fire', a.x, a.z, 1.3, 3.5, { team: 'foe', src: a, dmg: a.dmg * 0.3, tick: 0.5 }); });
  if (a.affixes.includes('molten')) later(0.6, () => { explosion(a.x, a.z, 3, 0xff6a20); const p = G.player; if (Math.hypot(p.x - a.x, p.z - a.z) < 3.2) damage(a, p, a.dmg * 2.2, { burn: a.dmg }); });
  emit('kill', a);
}

// Act III deaths: sap, amber dust, broken bonds, torn tendrils, the Lady's shard going dark
function actDeath(a, def) {
  if (def.deathSap) later(0.3, () => addSapPool(a.x, a.z, def.deathSap, 5));
  if (def.deathDust) {
    area('amberDust', a.x, a.z, 1.8, 3, { team: 'all' });
    glowBurst(a.x, Math.max(0.6, a.y || 0), a.z, 0xffd070, 26, 3, 0.18, 0.9);
  }
  if (a.bond) { const b = a.bond; a.bond = null; ring(b.x, b.z, 2.4, 0xffe8a0, 0.6); glowBurst(b.x, 1.4, b.z, 0xffe8a0, 20, 3, 0.25, 0.6); Audio.sfx('mournerKeen', { x: b.x, z: b.z, vol: 0.5 }); }
  // a Heartroot feeds the Lady: when it dies its tendril snaps and the wound is hers
  const B = a.bossNode;
  if (B && !B.dead) {
    const v = Math.round(B.hpMax * 0.09);
    B.hp = Math.max(1, B.hp - v); B.hpShow = 3; B.flash = 1;
    number(B.x, 3.4 * (B.scale || 1), B.z, v, 'crit');
    bolt(a.x, 1.2, a.z, B.x, 2.2, B.z, 0xffb040, 2);
    glowBurst(B.x, 2, B.z, 0xffb040, 30, 4, 0.3, 0.7);
    if (B.avatar?.anim) B.avatar.anim.hit = 0.6;
    Audio.sfx('thornWither', { x: B.x, z: B.z });
  }
  if (a.shardGlow) a.shardGlow.visible = false;
  if (a.shardLight) { removeLight(a.shardLight); a.shardLight = null; }
}

// Act IV deaths: an Ashwing's rib-coal burns on as a light, a Gorged Smoke-eater's fire bursts back into the nearest dark
// lamp, a clinging tick lets go, and near an Ashsmith the fallen leave remains to be reforged
function act4Death(a, def) {
  if (def.ai === 'diver') {
    a.airborne = false;
    addLightPool(a.x, a.z, 4, 10, 'coal', { color: 0xff8a30, intensity: 18 });
    later(0.4, () => { if (G.zone) { sparks(a.x, 0.6, a.z, 16, 0xffa040, 4); glowBurst(a.x, 0.5, a.z, 0xff7a20, 16, 2, 0.3, 0.6); } });
  }
  if (a.gorged > 0) {
    glowBurst(a.x, 1, a.z, 0xffa040, 30, 4, 0.3, 0.7); explosion(a.x, a.z, 1.4, 0xff8a30, { smoke: 0x2a2220, shake: 0.1 });
    relightNear(a.x, a.z, 8);
  }
  if (a.cling) { a.cling = false; const c = G.player?.cling, i = c ? c.indexOf(a) : -1; if (i >= 0) { c.splice(i, 1); emit('cling', c.length); } }
  addRemains(a);
}

export function gainXP(v) {
  const h = G.hero;
  if (h.level >= MAX_LEVEL) return;
  h.xp += v;
  while (h.level < MAX_LEVEL && h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++; h.points++;
    refreshStats();
    const p = G.player; p.hp = p.hpMax;
    for (let i = 0; i < 40; i++) sparks(p.x + rand.range(-0.4, 0.4), rand.range(0, 3), p.z + rand.range(-0.4, 0.4), 1, 0xffe8a0, 1.2, { color1: 0xffa040 });
    ring(p.x, p.z, 3.5, 0xffd070, 0.8);
    flash(p.x, 1.5, p.z, 0xfff0c0, 6, 0.3);
    addLight({ x: p.x, y: 2, z: p.z, color: 0xffd080, intensity: 50, range: 12, life: 1.2, fade: 1.2 });
    Audio.sting('levelup');
    const newSkill = SKILLS[h.cls].find((sk) => sk.lvl === h.level);
    emit('levelUp', h.level, newSkill);
  }
}
export { clamp };
