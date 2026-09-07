// ---------- state ----------
// G and P are live bindings: every module sees the current game/player object.
// Only newGame() reassigns them.
import {W,H} from '../render/canvas.js';
import {rnd} from '../util.js';
import {xpFor,ngLabel,VESSELS,WEAPONS} from './config.js';
import {save} from '../save.js';
import {setNg,showBanner} from '../ui/hud.js';
import {ring} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {specialsUnlocked} from './progression.js';
import {t} from '../i18n/index.js';
import {applyUpgrades} from './shop.js';
import {difficultyAt} from './run-rules.js';

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
export function newGame(state){
  const vk=save.meta.unlocks.vessels[save.meta.vessel]||save.meta.vessel==='bathy'?save.meta.vessel:'bathy';
  const V=VESSELS[vk]||VESSELS.bathy;
  P={x:0,y:0,vx:0,vy:0,dir:0,aim:0,hp:100,maxHp:100,r:13,speed:170,speedMul:1,magnet:95,regen:0,dmgMul:1,cdMul:1,armor:0,inv:0,flash:0,bubbleT:0,
     vessel:vk,baseHp:V.maxHp,lampArc:V.lampArc,lampRange:V.lampRange};
  P.speedMul=V.speed;
  G={state:state,t:0,depth:0,enemies:[],bullets:[],torps:[],motes:[],parts:[],fx:[],orbs:[],
     kills:0,level:1,xp:0,xpNext:xpFor(1),weapons:{lamp:1},passives:{},cds:{},
     spawnT:1.2,spawnEvery:1.15,bossesCleared:0,boss:null,specials:{},emerUsed:false,zone:0,pendingLevels:0,
     bossKills:{},flawlessKraken:false,restrictedKraken:false,cleanCycle:false,cycleHits:0,lastHitT:-99,
     depthBand:0,tutorialShown:false,
     hpScale:1,dmgScale:1,spdScale:1,tier:0,whaleT:14,orbAng:0,shake:0,lastKillSfx:0,bannerT:0,
     extraSlots:0,cardCount:3,rerolls:0,lampOnly1000:false,achT:0,achQueue:[],newAch:[],
     ebullets:[],fog:0,ev:{next:60,active:null}};
  applyUpgrades(P,G);
  const sw=save.meta.startWeapon;
  if(sw&&WEAPONS[sw]&&sw!=='lamp'&&save.meta.unlocks.startWeapons[sw])G.weapons[sw]=1;
  cam.x=P.x-W/2;cam.y=P.y-H/2;
  applyTier();
  initSnow();
}
export function applyTier(){
  const d=difficultyAt(G.depth,G.tier);
  G.hpScale=d.hp;G.dmgScale=d.damage;G.spdScale=d.speed;G.spawnEvery=d.interval;
  setNg(ngLabel(G.tier));
}
export function nextTier(){
  const before=specialsUnlocked();
  G.tier++;applyTier();
  G.bossesCleared=0;G.cycleHits=0;G.emerUsed=false;
  P.hp=P.maxHp;
  showBanner(t('banner.newGame',{ng:ngLabel(G.tier)}),4);
  ring(P.x,P.y,340,1,'62,242,208',4);SFX.levelup();
  if(specialsUnlocked()>before)setTimeout(function(){if(G&&G.state==='play')showBanner(t('banner.specials'),3.5);},4300);
}
