// ---------- achievements ----------
// Each entry: id and a check(run, life) predicate. `run` is the live game (G, P), `life` the lifetime
// stats/meta. Live checks run every half second during a dive and once more at the end; lifetime-only
// checks (marked life:true) run only at the end of a dive or in the shop.
// Names and descriptions live in i18n under ach.<id>.name / ach.<id>.desc.
import {save,saveNow} from '../save.js';
import {WEAPONS,PASSIVES} from './config.js';
import {SHOP,cost} from './shop.js';
import {PLACES} from './places.js';

const W=Object.keys(WEAPONS),PS=Object.keys(PASSIVES);
// A fixed mastery set: future achievements do not move the Platinum goalposts.
export const PLATINUM_IDS=['depth10000','ng5','queen','leviathan','wreck','flawlessKraken',
  'restrictedKraken','cleanCycle','dartNG3','bathyNG3','ng8','depth20000'];
// These count only in a dive that began at the surface: starting from a chapter already reached is a convenience, not mastery
export const SURFACE_ONLY=['depth10000','depth20000','ng5','ng8','dartNG3','bathyNG3','leviathan','flawlessKraken','restrictedKraken','cleanCycle',
  // and these would otherwise be handed over with the build a deep start begins with
  'depth500','depth1000','depth3000','depth5000','maxWeapon','allWeapons','allPassives','special','level20','evolve','evolve3'];
export const ACHIEVEMENTS=[
  {id:'depth500',   check:function(G){return G.depth>=500;}},
  {id:'depth1000',  check:function(G){return G.depth>=1000;}},
  {id:'depth3000',  check:function(G){return G.depth>=3000;}},
  {id:'depth5000',  check:function(G){return G.depth>=5000;}},
  {id:'depth10000', check:function(G){return G.depth>=10000;}},
  {id:'squid',      check:function(G){return G.bossKills.boss1>0;}},
  {id:'kraken',     check:function(G){return G.bossKills.boss2>0;}},
  {id:'ng2',        check:function(G){return G.tier>=2;}},
  {id:'ng3',        check:function(G){return G.tier>=3;}},
  {id:'ng5',        check:function(G){return G.tier>=5;}},
  {id:'noHarpoon',  check:function(G){return !!G.noHarpoonKraken;}},
  {id:'lampOnly',   check:function(G){return !!G.lampOnly;}},
  {id:'maxWeapon',  check:function(G){return W.some(function(k){return (G.weapons[k]||0)>=6;});}},
  {id:'allWeapons', check:function(G){return Object.keys(G.weapons).length>=6;}},
  {id:'allPassives',check:function(G){return Object.keys(G.passives).length>=4;}},
  {id:'special',    check:function(G){return Object.keys(G.specials).length>0;}},
  {id:'kills500',   check:function(G){return G.kills>=500;}},
  {id:'kills2000',  check:function(G){return G.kills>=2000;}},
  {id:'time10',     check:function(G){return G.t>=600;}},
  {id:'time20',     check:function(G){return G.t>=1200;}},
  {id:'emergency',  check:function(G){return !!G.emerUsed;}},
  {id:'level20',    check:function(G){return G.level>=20;}},
  {id:'dart',       check:function(G,P){return P.vessel==='dart'&&G.tier>=1&&G.tier>G.startTier;}},
  {id:'killsTotal', life:true,check:function(G,P,m){return m.stats.kills>=10000;}},
  {id:'dives10',    life:true,check:function(G,P,m){return m.stats.dives>=10;}},
  {id:'dives50',    life:true,check:function(G,P,m){return m.stats.dives>=50;}},
  {id:'light1000',  life:true,check:function(G,P,m){return m.stats.lightEarned>=1000;}},
  {id:'shopAll',    life:true,check:function(){return SHOP.every(function(s){return cost(s.key)===null;});}},
  {id:'queen',check:G=>G.bossKills.queen>0},
  {id:'leviathan',check:G=>G.bossKills.leviathan>0},
  {id:'wreck',check:G=>G.bossKills.wreck>0},
  {id:'flawlessKraken',check:G=>G.flawlessKraken},
  {id:'restrictedKraken',check:G=>G.restrictedKraken},
  {id:'cleanCycle',check:G=>G.cleanCycle},
  {id:'dartNG3',check:(G,P)=>P.vessel==='dart'&&G.tier>=3},
  {id:'bathyNG3',check:(G,P)=>P.vessel==='bathy'&&G.tier>=3},
  {id:'ng8',check:G=>G.tier>=8},
  {id:'depth20000',check:G=>G.depth>=20000},
  // the dive map
  {id:'ch1',check:G=>G.tier>=1},
  {id:'ch3',check:G=>G.tier>=3},
  {id:'ch5',check:G=>G.tier>=5},
  {id:'ending',check:G=>G.tier>=8},
  {id:'evolve',check:G=>Object.keys(G.evo).length>0},
  {id:'evolve3',check:G=>Object.keys(G.evo).length>=3},
  {id:'cleanup',check:G=>G.bags>=10},
  {id:'pages10',life:true,check:(G,P,m)=>Object.keys(m.logbook).length>=10},
  {id:'pages20',life:true,check:(G,P,m)=>Object.keys(m.logbook).length>=20},
  {id:'pagesAll',life:true,check:(G,P,m)=>Object.keys(m.logbook).length>=PLACES.length},
  {id:'platinum',check:()=>PLATINUM_IDS.every(has)}
];

export function has(id){return !!save.meta.achievements[id];}
export function count(){return ACHIEVEMENTS.filter(a=>has(a.id)).length;}
// Unlocks one achievement. Returns true when it was new.
export function unlock(id){
  if(has(id))return false;
  save.meta.achievements[id]=Math.floor(Date.now()/1000);
  if(id==='kraken'||id==='ch1')save.meta.unlocks.vessels.dart=true;   // the Dart is earned, not bought: by the first chapter (the Kraken, under the old rules)
  saveNow();return true;
}
// Runs the checks; returns the ids unlocked by this call. `life` includes lifetime-only checks.
export function check(G,P,life){
  const out=[];
  for(const a of ACHIEVEMENTS){
    if(a.life&&!life)continue;
    if(has(a.id))continue;
    if(G.startTier>0&&SURFACE_ONLY.includes(a.id))continue;
    let ok=false;try{ok=a.check(G,P,save.meta);}catch(e){ok=false;}
    if(ok&&unlock(a.id))out.push(a.id);
  }
  return out;
}
