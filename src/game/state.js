// ---------- state ----------
// G and P are live bindings: every module sees the current game/player object.
// Only newGame() reassigns them.
import {W,H} from '../render/canvas.js';
import {rnd} from '../util.js';
import {TIER_HP,TIER_DMG,TIER_SPD,TIER_DENSITY,xpFor,ngLabel} from './config.js';
import {setNg,showBanner} from '../ui/hud.js';
import {ring} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {specialsUnlocked} from './progression.js';

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
  P={x:0,y:0,vx:0,vy:0,dir:0,aim:0,hp:100,maxHp:100,r:13,speed:170,speedMul:1,magnet:95,regen:0,dmgMul:1,cdMul:1,armor:0,inv:0,flash:0,bubbleT:0};
  G={state:state,t:0,depth:0,enemies:[],bullets:[],torps:[],motes:[],parts:[],fx:[],orbs:[],
     kills:0,level:1,xp:0,xpNext:xpFor(1),weapons:{lamp:1},passives:{},cds:{},
     spawnT:1.2,spawnEvery:1.15,phase:0,phaseT:150,boss:null,specials:{},emerUsed:false,zone:0,pendingLevels:0,
     hpScale:1,dmgScale:1,spdScale:1,tier:0,whaleT:14,orbAng:0,shake:0,lastKillSfx:0,bannerT:0};
  cam.x=P.x-W/2;cam.y=P.y-H/2;
  applyTier();
  initSnow();
}
export function applyTier(){
  const t=G.tier;
  G.hpScale=Math.pow(TIER_HP,t);G.dmgScale=Math.pow(TIER_DMG,t);G.spdScale=Math.pow(TIER_SPD,t);
  G.spawnEvery=Math.max(0.22,1.15/Math.pow(TIER_DENSITY,t));
  setNg(ngLabel(t));
}
export function nextTier(){
  const before=specialsUnlocked();
  G.tier++;applyTier();
  G.phase=0;G.phaseT=120;G.emerUsed=false;
  P.hp=P.maxHp;
  showBanner(ngLabel(G.tier)+' · Νέο παιχνίδι',4);
  ring(P.x,P.y,340,1,'62,242,208',4);SFX.levelup();
  if(specialsUnlocked()>before)setTimeout(function(){if(G&&G.state==='play')showBanner('Ξεκλειδώθηκαν ειδικές αναβαθμίσεις',3.5);},4300);
}
