// Damage, status effects, deaths, experience and drops.
import { G, later, vibrate } from './state.js';
import { DIFFS, monsterXP, xpToNext, MAX_LEVEL, SKILLS, CLASSES } from './data.js';
import { makeItem } from './items.js';
import { refreshStats } from './stats.js';
import { number } from '../ui/overlay.js';
import { emit } from '../ui/bus.js';
import { hitFx, sparks, glowBurst, explosion, decal, puff, flash, ring } from '../gfx/fx.js';
import { shake, addLight } from '../gfx/gfx.js';
import Audio from '../audio/audio.js';
import { rand, clamp } from '../core/util.js';
import { t } from '../i18n/i18n.js';
import { foes, spawnMonster } from './actors.js';
import { dropGold, dropItem, dropGlobe } from './pickups.js';
import { area } from './projectiles.js';

const HIT_SFX = { flesh: 'hitFlesh', bone: 'hitBone', spirit: 'hitSpirit', chitin: 'hitChitin', ash: 'hitFlesh', stone: 'hitBone', magma: 'hitFlesh' };
const DIE_SFX = { goblin: 'goblinDie', wolf: 'wolfDie', spider: 'spiderDie', orc: 'orcDie', troll: 'trollRoar', skeleton: 'skeletonDie', wraith: 'wraithDie', hound: 'wolfDie', bat: 'batDie', worm: 'wormDie', dwarf: 'dwarfDie', golem: 'golemDie' };

export function heroCrit() { return Math.random() * 100 < G.stats.critC; }

// the hero's outgoing damage for a skill hit: weapon roll * multipliers
export function heroHit(mult, o = {}) {
  const s = G.stats, p = G.player;
  let d = rand.range(s.wmin, s.wmax) * s.dmgMult * mult;
  if (o.area) d *= 1 + s.area / 100;
  if (p.buffs.cry > 0) d *= 1.3;
  if (p.buffs.shrineFury > 0) d *= 1.5;
  return d;
}

export function damage(src, target, amount, o = {}) {
  if (!target || target.dead || target.removed) return 0;
  if (target.team === 'hero' && target.hero) return hurtHero(src, amount, o);
  if (target.team === 'npc') return 0;
  const fromHero = src && (src.hero || src.team === 'hero');
  let crit = false;
  if (fromHero) {
    const s = G.stats;
    if (o.crit ?? (!o.dot && heroCrit())) { crit = true; amount *= 1 + s.critD / 100; }
    if (target.elite || target.boss) { amount *= 1 + s.eliteDmg / 100; if (s.legs.has('kingslayer')) amount *= 1.3; }
  }
  if (target.invuln > 0) { if (!o.dot) number(target.x, 2.2, target.z, t('hud.immune'), 'text', '#9ab8ff'); return 0; }
  if (target.armored) amount *= 0.72;
  if (target.ward > 0) amount *= 0.5;
  if (target.prop) amount = target.hp;
  amount = Math.max(1, Math.round(amount));
  target.hp -= amount;
  target.hpShow = 3;
  target.aggro = true;
  if (!o.dot) {
    target.flash = 1;
    if (target.avatar?.anim) target.avatar.anim.hit = target.boss ? 0.3 : 1;
    const def = target.def;
    const dx = o.kx ?? (src ? target.x - src.x : 0), dz = o.kz ?? (src ? target.z - src.z : 0), l = Math.hypot(dx, dz) || 1;
    if (!o.noFx) {
      hitFx(target.x, (def.big || target.boss ? 1.6 : 1.0) * (target.scale || 1), target.z, target.prop ? 'wood' : def.flesh, dx / l, dz / l, crit);
      if (!o.quiet) Audio.sfx(target.prop ? 'break' : (HIT_SFX[def.flesh] || 'hitFlesh'), { x: target.x, z: target.z, vol: crit ? 1 : 0.8 });
      if (crit && !o.quiet) Audio.sfx('crit', { x: target.x, z: target.z, vol: 0.6 });
    }
    if (o.knock && !target.boss && !target.prop) {
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
  if (o.dot !== true && s.block > 0 && Math.random() * 100 < s.block) { amount *= 0.45; number(p.x, 2.3, p.z, t('hud.block'), 'text', '#c8d0e0'); Audio.sfx('block'); }
  const L = src?.level || p.level || G.hero.level;
  const red = s.armor / (s.armor + 45 * L + 60);
  amount *= 1 - red;
  if (p.buffs.cry > 0) amount *= 0.77;
  if (p.buffs.shrineShield > 0) amount *= 0.6;
  if (s.legs.has('stoneborn') && p.hp < p.hpMax * 0.5) amount *= 0.8;
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
  }
  if (p.hp <= 0) { p.hp = 0; emit('heroDeath'); }
  return amount;
}

// ---------- status effects, once per frame per actor ----------
export function tickStatus(a, dt) {
  const s = a.status;
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
  if (s.freeze > 0 || s.stun > 0) return 0;
  let m = 1;
  if (s.slow > 0) m *= 1 - s.slowK;
  if (a.hero && a.buffs?.shrineSpeed > 0) m *= 1.4;
  if (a.hero && a.buffs?.evergreen > 0) m *= 1.3;
  return m;
}

// ---------- death ----------
export function kill(a, src, o = {}) {
  if (a.dead) return;
  a.dead = true; a.deadT = 0; a.hp = 0;
  const def = a.def;
  if (a.prop) { emit('propBroken', a); return; }
  if (a.pet) { a.avatar?.play(a.kind === 'spiritWolf' ? 'die' : 'die'); return; }
  const av = a.avatar;
  if (av) {
    if (av.kind === 'warg' || av.kind === 'spider') av.play('die');
    else av.play(a.kind.startsWith('skeleton') ? 'dieBones' : Math.random() < 0.5 ? 'die' : 'dieFwd', 1);
  }
  Audio.sfx(DIE_SFX[def.sfx] || 'hitFlesh', { x: a.x, z: a.z });
  if (def.flesh === 'flesh' || def.flesh === 'ash' || def.flesh === 'magma') decal(a.x, a.z, 'blood', 1.2 + a.radius);
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
