// ---------- permanent progress: Light currency and the shop ----------
// Balance agreed with the owner on 2026-09-03: at max the raw power gain is about +35%
// (hull +25%, damage +15%, speed +9%); the rest are choices, not power.
import {save,saveNow} from '../save.js';

export const SHOP=[
  {key:'hull',  costs:[40,80,140,220,320]},   // +5% max hull per tier
  {key:'dmg',   costs:[50,100,170,260,380]},  // +3% damage per tier
  {key:'speed', costs:[40,90,160]},           // +3% speed per tier
  {key:'magnet',costs:[30,60,110]},           // +10% pickup radius per tier
  {key:'lamp',  costs:[60,140,260]},          // start with the searchlight at level 2/3/4
  {key:'card4', costs:[300]},                 // four cards per level-up
  {key:'reroll',costs:[200]},                 // one reroll per dive
  {key:'slot',  costs:[400]}                  // one more weapon slot from the start
];
function def(key){return SHOP.find(function(s){return s.key===key;});}
export function level(key){return save.meta.upgrades[key]||0;}
export function maxLevel(key){return def(key).costs.length;}
export function cost(key){const l=level(key);return l>=maxLevel(key)?null:def(key).costs[l];}
export function light(){return save.meta.light||0;}
export function buy(key){
  const c=cost(key);
  if(c===null||light()<c)return false;
  save.meta.light-=c;save.meta.upgrades[key]=level(key)+1;saveNow();return true;
}

// Light earned by a dive: 1 per 50 m, 1 per 25 creatures, and 30·T·(T+1)/2 for the tier reached
export function lightFor(depth,kills,tier){
  const d=Math.floor(depth/50),k=Math.floor(kills/25),t=30*tier*(tier+1)/2;
  return{depth:d,kills:k,tier:t,total:d+k+t};
}
export function addLight(n){save.meta.light=light()+n;save.meta.stats.lightEarned=(save.meta.stats.lightEarned||0)+n;saveNow();}

// Applied once per new game, right after the base player/game objects exist
export function applyUpgrades(P,G){
  const u=save.meta.upgrades;
  P.maxHp=Math.round((P.baseHp||100)*(1+0.05*u.hull));P.hp=P.maxHp;
  P.dmgMul+=0.03*u.dmg;
  P.speedMul+=0.03*u.speed;   // on top of the vessel's own speed factor
  P.magnet*=Math.pow(1.1,u.magnet);
  G.weapons.lamp=1+u.lamp;
  G.extraSlots=u.slot;
  G.cardCount=3+u.card4;
  G.rerolls=u.reroll;
}
