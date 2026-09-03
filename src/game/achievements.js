// ---------- achievements ----------
// Each entry: id and a check(run, life) predicate. `run` is the live game (G, P), `life` the lifetime
// stats/meta. Live checks run every half second during a dive and once more at the end; lifetime-only
// checks (marked life:true) run only at the end of a dive or in the shop.
// Names and descriptions live in i18n under ach.<id>.name / ach.<id>.desc.
import {save,saveNow} from '../save.js';
import {WEAPONS,PASSIVES} from './config.js';
import {SHOP,cost} from './shop.js';

const W=Object.keys(WEAPONS),PS=Object.keys(PASSIVES);
export const ACHIEVEMENTS=[
  {id:'depth500',   check:function(G){return G.depth>=500;}},
  {id:'depth1000',  check:function(G){return G.depth>=1000;}},
  {id:'depth3000',  check:function(G){return G.depth>=3000;}},
  {id:'depth5000',  check:function(G){return G.depth>=5000;}},
  {id:'depth10000', check:function(G){return G.depth>=10000;}},
  {id:'squid',      check:function(G){return G.phase>=2||G.tier>=1;}},
  {id:'kraken',     check:function(G){return G.tier>=1;}},
  {id:'ng2',        check:function(G){return G.tier>=2;}},
  {id:'ng3',        check:function(G){return G.tier>=3;}},
  {id:'ng5',        check:function(G){return G.tier>=5;}},
  {id:'noHarpoon',  check:function(G){return G.tier>=1&&!G.weapons.harpoon;}},
  {id:'lampOnly',   check:function(G){return !!G.lampOnly1000;}},
  {id:'maxWeapon',  check:function(G){return W.some(function(k){return (G.weapons[k]||0)>=6;});}},
  {id:'allWeapons', check:function(G){return W.every(function(k){return G.weapons[k];});}},
  {id:'allPassives',check:function(G){return PS.every(function(k){return G.passives[k];});}},
  {id:'special',    check:function(G){return Object.keys(G.specials).length>0;}},
  {id:'kills500',   check:function(G){return G.kills>=500;}},
  {id:'kills2000',  check:function(G){return G.kills>=2000;}},
  {id:'time10',     check:function(G){return G.t>=600;}},
  {id:'time20',     check:function(G){return G.t>=1200;}},
  {id:'emergency',  check:function(G){return !!G.emerUsed;}},
  {id:'level20',    check:function(G){return G.level>=20;}},
  {id:'dart',       check:function(G,P){return P.vessel==='dart'&&G.tier>=1;}},
  {id:'killsTotal', life:true,check:function(G,P,m){return m.stats.kills>=10000;}},
  {id:'dives10',    life:true,check:function(G,P,m){return m.stats.dives>=10;}},
  {id:'dives50',    life:true,check:function(G,P,m){return m.stats.dives>=50;}},
  {id:'light1000',  life:true,check:function(G,P,m){return m.stats.lightEarned>=1000;}},
  {id:'shopAll',    life:true,check:function(){return SHOP.every(function(s){return cost(s.key)===null;});}}
];

export function has(id){return !!save.meta.achievements[id];}
export function count(){return Object.keys(save.meta.achievements).length;}
// Unlocks one achievement. Returns true when it was new.
export function unlock(id){
  if(has(id))return false;
  save.meta.achievements[id]=Math.floor(Date.now()/1000);
  if(id==='kraken')save.meta.unlocks.vessels.dart=true;   // the Dart is earned, not bought
  saveNow();return true;
}
// Runs the checks; returns the ids unlocked by this call. `life` includes lifetime-only checks.
export function check(G,P,life){
  const out=[];
  for(const a of ACHIEVEMENTS){
    if(a.life&&!life)continue;
    if(has(a.id))continue;
    let ok=false;try{ok=a.check(G,P,save.meta);}catch(e){ok=false;}
    if(ok&&unlock(a.id))out.push(a.id);
  }
  return out;
}
