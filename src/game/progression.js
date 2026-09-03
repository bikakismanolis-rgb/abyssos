// ---------- progression ----------
import {G,P} from './state.js';
import {WEAPONS,PASSIVES,SPECIAL_ORDER,xpFor} from './config.js';
import {shuffle} from '../util.js';
import {SFX} from '../audio/sfx.js';
import {burst} from './effects.js';
import {openLevelUp} from '../ui/screens.js';

export function capOf(def){return def.max+G.tier;}
// The lamp never takes a slot; one more weapon slot opens with every new game
export function weaponSlots(){return 4+G.tier;}
export function weaponSlotsUsed(){return Object.keys(G.weapons).filter(function(k){return k!=='lamp';}).length;}
export function passiveSlots(){return 4+G.tier;}
export function specialsUnlocked(){return Math.min(SPECIAL_ORDER.length,2*Math.floor(G.tier/5));}

export function collectMote(mo){
  G.xp+=mo.v;SFX.pickup();
  if(G.specials.lightheal)P.hp=Math.min(P.maxHp,P.hp+1);
  burst(mo.x,mo.y,1,'120,255,225',40);
  while(G.xp>=G.xpNext){G.xp-=G.xpNext;G.level++;G.xpNext=xpFor(G.level);G.pendingLevels++;}
  if(G.pendingLevels>0)openLevelUp();
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
  const out=[];
  if(sp.length)out.push(sp.shift());
  if(extra.length)out.push(extra.shift());
  const rest=normal.concat(extra,sp);
  while(out.length<3&&rest.length)out.push(rest.shift());
  if(out.length<3)out.push({kind:'heal'});
  return out;
}
export function pips(l,max){let s='';for(let i=0;i<max;i++)s+=i<l?'●':'○';if(l>max)s+=' +'+(l-max);return s;}
// Applies the chosen card and consumes one pending level. The screen decides what to show next.
export function chooseOption(o){
  if(o.kind==='heal')P.hp=P.maxHp;
  else if(o.kind==='w')G.weapons[o.key]=(G.weapons[o.key]||0)+1;
  else if(o.kind==='p'){const l=(G.passives[o.key]||0)+1;G.passives[o.key]=l;PASSIVES[o.key].apply(P,l<=PASSIVES[o.key].max?1:0.5);}
  else if(o.kind==='s'){G.specials[o.key]=true;if(o.key==='overclock')P.cdMul*=0.8;if(o.key==='shell')P.armor=0.3;}
  G.pendingLevels--;
}
