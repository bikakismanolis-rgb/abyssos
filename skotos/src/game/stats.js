// Hero stats from level, items and buffs.
import { CLASSES, SKILLS, SKILL_MAX_RANK } from './data.js';
import { G } from './state.js';

export function computeStats(hero, equip = hero.equip) {
  const C = CLASSES[hero.cls], L = hero.level;
  const s = { main: 8 + L * 3, vit: 7 + L * 2, life: 0, dmgPct: 0, crit: 5, critDmg: 50, atkSpd: 0, armor: 0, lifeOnHit: 0, regen: 0, move: 0, cdr: 0, resRegen: 0, area: 0, eliteDmg: 0, gold: 0, mf: 0, thorns: 0, block: 0, skill: {}, legs: new Set() };
  let wmin = 2, wmax = 4, wspd = 1.2;
  for (const slot in equip) {
    const it = equip[slot]; if (!it) continue;
    if (it.dmg) { wmin = it.dmg[0]; wmax = it.dmg[1]; wspd = it.spd; }
    if (it.armor) s.armor += it.armor;
    if (it.block) s.block += it.block;
    if (it.leg) s.legs.add(it.leg);
    for (const k in it.stats) {
      const v = it.stats[k];
      if (k === 'skill') s.skill[v.id] = (s.skill[v.id] || 0) + v.v;
      else s[k] += v;
    }
  }
  if (s.legs.has('swiftboots')) s.move += 15;
  const lifeMax = Math.round((40 + L * 12 + s.vit * 5 + s.life) * C.life);
  const armor = Math.round(s.armor * C.armor + L * 3);
  const dmgMult = (1 + s.main / 100) * (1 + s.dmgPct / 100);
  const aps = wspd * (1 + s.atkSpd / 100);
  const critC = Math.min(75, s.crit), critD = s.critDmg;
  const avg = ((wmin + wmax) / 2) * dmgMult;
  const dps = avg * aps * (1 + (critC / 100) * (critD / 100));
  const red = armor / (armor + 45 * L + 60);
  return {
    ...s, lifeMax, armor, dmgMult, aps, critC, critD, wmin, wmax, wspd, dps, red,
    toughness: lifeMax / (1 - red),
    speed: C.speed * (1 + Math.min(s.move, 40) / 100),
    resMax: C.resMax, resRegen: C.resRegen * (C.resRegen > 0 ? 1 + s.resRegen / 100 : 1),
    cdr: Math.min(40, s.cdr)
  };
}
export function refreshStats() {
  G.stats = computeStats(G.hero);
  const p = G.player;
  if (p) {
    const frac = p.hpMax ? p.hp / p.hpMax : 1;
    p.hpMax = G.stats.lifeMax; p.hp = Math.min(p.hpMax, Math.max(1, Math.round(p.hpMax * frac)));
    p.speed = G.stats.speed;
  }
  return G.stats;
}
export const skillRank = (id) => G.hero.skills[id] || 0;
export function skillMult(sk) {
  const r = Math.max(1, skillRank(sk.id));
  return (sk.dmg || 1) * (1 + 0.15 * (r - 1)) * (1 + (G.stats.skill[sk.id] || 0) / 100);
}
export function skillUnlocked(sk) { return sk.basic || G.hero.level >= sk.lvl; }
export { SKILL_MAX_RANK, SKILLS };
