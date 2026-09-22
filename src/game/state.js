// ---------- state ----------
// G and P are live bindings: every module sees the current game/player object.
// Only newGame() reassigns them.
import {W,H} from '../render/canvas.js';
import {rnd} from '../util.js';
import {xpFor,VESSELS,WEAPONS,CONDITIONS,NO_MODS} from './config.js';
import {save,saveNow} from '../save.js';
import {setNg,showBanner} from '../ui/hud.js';
import {ring} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {specialsUnlocked,snapshot,restore,randomLoadout} from './progression.js';
import {t} from '../i18n/index.js';
import {applyUpgrades} from './shop.js';
import {difficultyAt} from './run-rules.js';
import {chapterStart,travel,LAST_TIER} from './places.js';
import {chapterShort,chapterName} from '../ui/labels.js';

export let G=null,P=null;
export const cam={x:0,y:0};
export let snow=[];
export let clock=0;
export function advanceClock(dt){clock+=dt;}

export function initSnow(){
  snow=[];
  for(let i=0;i<110;i++)snow.push({x:Math.random()*4000,y:Math.random()*4000,s:rnd(0.6,1.6),f:rnd(0.25,0.45),v:rnd(6,14)});
  for(let i=0;i<50;i++)snow.push({x:Math.random()*4000,y:Math.random()*4000,s:rnd(1.4,2.6),f:rnd(0.7,0.9),v:rnd(12,22)});
}
function pickCondition(){
  if(save.meta.stats.dives<1)return 'calm';   // the first dive ever teaches the plain rules
  const keys=Object.keys(CONDITIONS);return keys[Math.floor(Math.random()*keys.length)];
}
// opts: {tier, loadout:'saved'|'random'} starts at a chapter already reached; {resume:snapshot} continues a dive
export function newGame(state,opts){
  opts=opts||{};
  const rs=opts.resume||null;
  const want=rs?rs.vessel:save.meta.vessel;
  const vk=save.meta.unlocks.vessels[want]||want==='bathy'?want:'bathy';
  const V=VESSELS[vk]||VESSELS.bathy;
  P={x:0,y:0,vx:0,vy:0,dir:0,aim:0,hp:100,maxHp:100,r:13,speed:170,speedMul:1,magnet:95,regen:0,dmgMul:1,cdMul:1,armor:0,inv:0,flash:0,bubbleT:0,slowT:0,
     vessel:vk,baseHp:V.maxHp,lampArc:V.lampArc,lampRange:V.lampRange};
  P.speedMul=V.speed;
  G={state:state,t:0,depth:0,enemies:[],bullets:[],torps:[],motes:[],parts:[],fx:[],orbs:[],hazards:[],mines:[],anchors:[],
     kills:0,level:1,xp:0,xpNext:xpFor(1),weapons:{lamp:1},passives:{},evo:{},cds:{},
     spawnT:1.2,spawnEvery:1.15,bossesCleared:0,boss:null,specials:{},emerUsed:false,pendingLevels:0,
     bossKills:{},flawlessKraken:false,restrictedKraken:false,cleanCycle:false,cycleHits:0,lastHitT:-99,
     tutorialShown:false,startTier:0,startTravel:0,cond:'calm',mods:Object.assign({},NO_MODS),leaving:null,bags:0,
     hpScale:1,dmgScale:1,spdScale:1,tier:0,whaleT:14,orbAng:0,shake:0,lastKillSfx:0,bannerT:0,
     extraSlots:0,cardCount:3,rerolls:0,lampOnly:false,achT:0,achQueue:[],newAch:[],newPages:[],
     ebullets:[],fog:0,ev:{next:60,active:null}};
  applyUpgrades(P,G);
  const tier=rs?rs.tier:Math.max(0,Math.min(opts.tier||0,save.meta.reached||0));
  G.cond=rs?rs.cond:state==='play'?pickCondition():'calm';
  Object.assign(G.mods,CONDITIONS[G.cond]||{});
  if(rs){
    restore(rs.build);
    G.tier=rs.tier;G.bossesCleared=rs.cleared;G.depth=rs.depth;G.t=rs.t;G.kills=rs.kills;
    G.startTier=rs.startTier;G.startTravel=rs.startTravel;G.bossKills=rs.bossKills||{};G.cycleHits=rs.cycleHits||0;G.emerUsed=!!rs.emerUsed;G.bags=rs.bags||0;
    G.tutorialShown=true;P.hp=Math.min(P.maxHp,Math.max(1,rs.hp));
  }else if(tier>0){
    G.tier=tier;G.startTier=tier;G.depth=chapterStart(tier);G.startTravel=travel(G.depth,tier);G.tutorialShown=true;
    const saved=save.meta.loadouts[tier];
    // with no saved build (a test build that opened every chapter) the level is what a dive usually has by then
    if(opts.loadout==='random'||!saved)randomLoadout(saved?saved.level:Math.round(12+tier*9.5));
    else restore(saved);
    P.hp=P.maxHp;
  }else{
    const sw=save.meta.startWeapon;
    if(sw&&WEAPONS[sw]&&sw!=='lamp'&&save.meta.unlocks.startWeapons[sw])G.weapons[sw]=1;
  }
  cam.x=P.x-W/2;cam.y=P.y-H/2;
  applyTier();
  initSnow();
}
export function applyTier(){
  const d=difficultyAt(G.depth,G.tier),m=G.mods;
  G.hpScale=d.hp*m.ehp;G.dmgScale=d.damage*m.edmg;G.spdScale=d.speed*m.espd;G.spawnEvery=d.interval*m.spawn;
  setNg(chapterShort(G.tier),chapterName(G.tier));
}
// A dive that is still going: written after every guardian, consumed when it is resumed, wiped when it ends
export function checkpoint(){
  save.meta.resume={build:snapshot(),tier:G.tier,cleared:G.bossesCleared,depth:G.depth,t:G.t,kills:G.kills,hp:P.hp,vessel:P.vessel,cond:G.cond,
    startTier:G.startTier,startTravel:G.startTravel,bossKills:G.bossKills,cycleHits:G.cycleHits,emerUsed:G.emerUsed,bags:G.bags};
  saveNow();
}
export function nextTier(){
  const before=specialsUnlocked();
  G.tier++;applyTier();
  G.bossesCleared=0;G.cycleHits=0;G.emerUsed=false;
  P.hp=P.maxHp;
  // the chapter is now reached for good, with the build that reached it
  save.meta.reached=Math.max(save.meta.reached||0,G.tier);
  save.meta.loadouts[G.tier]=snapshot();
  checkpoint();
  showBanner(t(G.tier>LAST_TIER?'banner.endless':'banner.chapter',{n:chapterShort(G.tier),name:chapterName(G.tier)}),4);
  ring(P.x,P.y,340,1,'62,242,208',4);SFX.levelup();
  if(specialsUnlocked()>before)setTimeout(function(){if(G&&G.state==='play')showBanner(t('banner.specials'),3.5);},4300);
}
