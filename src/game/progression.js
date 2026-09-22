// ---------- progression ----------
import {G,P} from './state.js';
import {WEAPONS,PASSIVES,SPECIAL_ORDER,EVOLUTIONS,EVO_PASSIVE_LEVEL,xpFor} from './config.js';
import {shuffle} from '../util.js';
import {SFX} from '../audio/sfx.js';
import {burst} from './effects.js';
import {openLevelUp} from '../ui/screens.js';
import {save,saveNow} from '../save.js';

// Slots are fixed: four weapons (the searchlight is free, the shop sells a fifth) and four abilities,
// so every dive is a choice. Set SLOTS_GROW to true to bring back the old "+1 slot per chapter" rule.
export const SLOTS_GROW=false;
export function capOf(def){return def.max+G.tier;}
export function weaponSlots(){return 4+(SLOTS_GROW?G.tier:0)+(G.extraSlots||0);}
export function weaponSlotsUsed(){return Object.keys(G.weapons).filter(function(k){return k!=='lamp';}).length;}
export function passiveSlots(){return 4+(SLOTS_GROW?G.tier:0);}
export function specialsUnlocked(){const cleared=G.tier*4+G.bossesCleared;return cleared>=8?6:cleared>=4?4:cleared>=2?2:0;}

export function collectMote(mo){
  G.xp+=mo.v*G.mods.xp;SFX.pickup();
  if(G.specials.lightheal)P.hp=Math.min(P.maxHp,P.hp+1);
  burst(mo.x,mo.y,1,'120,255,225',40);
  while(G.xp>=G.xpNext){G.xp-=G.xpNext;G.level++;G.xpNext=xpFor(G.level);G.pendingLevels++;}
  if(G.pendingLevels>0)openLevelUp();
}
// Evolutions on offer: the weapon is at its base cap, its partner ability is at level 3, and it has not evolved yet
export function evolutionsReady(){
  return Object.keys(EVOLUTIONS).filter(function(k){
    return !G.evo[k]&&(G.weapons[k]||0)>=WEAPONS[k].max&&(G.passives[EVOLUTIONS[k].passive]||0)>=EVO_PASSIVE_LEVEL;
  });
}
export function levelOptions(){
  const opts=[];
  const ownedW=weaponSlotsUsed(),ownedP=Object.keys(G.passives).length,wSlots=weaponSlots(),pSlots=passiveSlots();
  for(const k in WEAPONS){const l=G.weapons[k]||0;if(l>=capOf(WEAPONS[k]))continue;if(!l&&ownedW>=wSlots)continue;opts.push({kind:'w',key:k,lvl:l});}
  for(const k in PASSIVES){const l=G.passives[k]||0;if(l>=capOf(PASSIVES[k]))continue;if(!l&&ownedP>=pSlots)continue;opts.push({kind:'p',key:k,lvl:l});}
  shuffle(opts);
  const extra=opts.filter(function(o){return o.lvl>=(o.kind==='w'?WEAPONS:PASSIVES)[o.key].max;});
  const normal=opts.filter(function(o){return o.lvl<(o.kind==='w'?WEAPONS:PASSIVES)[o.key].max;});
  const sp=shuffle(SPECIAL_ORDER.slice(0,specialsUnlocked()).filter(function(k){return !G.specials[k];})).map(function(k){return{kind:'s',key:k};});
  const ev=shuffle(evolutionsReady()).map(function(k){return{kind:'x',key:k};});
  const n=G.cardCount||3;   // a fourth card is a shop upgrade
  const out=[];
  if(ev.length)out.push(ev.shift());          // an evolution you have earned is always on the table
  if(sp.length)out.push(sp.shift());
  if(extra.length&&out.length<n)out.push(extra.shift());
  const rest=normal.concat(extra,sp,ev);
  while(out.length<n&&rest.length)out.push(rest.shift());
  if(out.length<n)out.push({kind:'heal'});
  return out;
}
export function pips(l,max){let s='';for(let i=0;i<max;i++)s+=i<l?'●':'○';if(l>max)s+=' +'+(l-max);return s;}
function applyPassive(key,level){PASSIVES[key].apply(P,level<=PASSIVES[key].max?1:0.5);}
function applySpecial(key){if(key==='overclock')P.cdMul*=0.8;if(key==='shell')P.armor=0.3;}
// Applies the chosen card and consumes one pending level. The screen decides what to show next.
// `quiet` builds a loadout without touching the permanent unlocks.
export function chooseOption(o,quiet){
  if(o.kind==='heal')P.hp=P.maxHp;
  else if(o.kind==='w'){
    G.weapons[o.key]=(G.weapons[o.key]||0)+1;
    // a weapon that reaches its base cap can be chosen as the starting weapon from then on
    if(!quiet&&o.key!=='lamp'&&G.weapons[o.key]>=WEAPONS[o.key].max&&!save.meta.unlocks.startWeapons[o.key]){save.meta.unlocks.startWeapons[o.key]=true;saveNow();}
  }
  else if(o.kind==='p'){const l=(G.passives[o.key]||0)+1;G.passives[o.key]=l;applyPassive(o.key,l);}
  else if(o.kind==='s'){G.specials[o.key]=true;applySpecial(o.key);}
  else if(o.kind==='x'){G.evo[o.key]=true;}
  G.pendingLevels--;
}

// ---------- builds: what a dive carries from one chapter to the next ----------
export function snapshot(){
  return {level:G.level,xp:G.xp,weapons:Object.assign({},G.weapons),passives:Object.assign({},G.passives),
    specials:Object.keys(G.specials),evo:Object.keys(G.evo)};
}
// Rebuilds a saved build on a fresh game: levels, abilities and specials are applied to the new vessel
export function restore(b){
  G.level=b.level||1;G.xp=b.xp||0;G.xpNext=xpFor(G.level);
  const lamp=Math.max(G.weapons.lamp||1,(b.weapons||{}).lamp||1);
  G.weapons={lamp:lamp};
  for(const k in b.weapons||{})if(WEAPONS[k]&&k!=='lamp')G.weapons[k]=b.weapons[k];
  G.passives={};
  for(const k in b.passives||{}){if(!PASSIVES[k])continue;G.passives[k]=b.passives[k];for(let l=1;l<=b.passives[k];l++)applyPassive(k,l);}
  G.specials={};(b.specials||[]).forEach(function(k){G.specials[k]=true;applySpecial(k);});
  G.evo={};(b.evo||[]).forEach(function(k){if(EVOLUTIONS[k])G.evo[k]=true;});
  P.hp=P.maxHp;
}
// A build of the same worth, drawn card by card the way a real dive would have drawn it
export function randomLoadout(level){
  G.level=Math.max(1,level);G.xpNext=xpFor(G.level);G.pendingLevels=G.level-1;
  let guard=400;
  while(G.pendingLevels>0&&guard-->0){
    const o=levelOptions().filter(function(c){return c.kind!=='heal';});
    if(!o.length){G.pendingLevels=0;break;}
    chooseOption(o[Math.floor(Math.random()*o.length)],true);
  }
  G.pendingLevels=0;P.hp=P.maxHp;
}
