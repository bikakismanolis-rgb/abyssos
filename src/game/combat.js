// ---------- combat ----------
import {G,P,nextTier,checkpoint} from './state.js';
import {ET} from './config.js';
import {LAST_TIER} from './places.js';
import {spawnEnemy} from './enemies.js';
import {addHazard} from './hazards.js';
import {burst,ring,mote} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {showBanner,hideBossBar} from '../ui/hud.js';
import {gameOver,showEnding} from '../ui/screens.js';
import {rnd,TAU} from '../util.js';
import {t} from '../i18n/index.js';
import {settings,buzz} from '../settings.js';
import {unlock} from './achievements.js';
import {save,saveNow} from '../save.js';

export function hurtEnemy(e,dmg,quiet){
  if(e.dead)return;
  if(e.armor&&!e.lit)dmg*=1-e.armor;   // armour gives way only where the searchlight falls
  if(e.cloak>0)dmg*=0.5;
  e.hp-=dmg;
  if(!quiet){
    e.flash=0.1;
    // floating damage number (setting); continuous sources (lamp, fireflies) pass quiet=true and never show one
    if(settings().dmgNumbers&&G.fx.length<160)G.fx.push({kind:'num',x:e.x+rnd(-6,6),y:e.y-e.r,v:Math.max(1,Math.round(dmg)),t:0,dur:0.7});
  }
  if(e.hp<=0)killEnemy(e);
}
function seen(type){if(!save.meta.seen[type]){save.meta.seen[type]=1;G.unsaved=true;}}
export function mineBlast(e,hurtsPlayer){
  e.dead=true;G.kills++;seen(e.type);
  burst(e.x,e.y,24,'255,140,90',210);ring(e.x,e.y,92,0.35,'255,140,90',3);SFX.torpedo();G.shake=Math.max(G.shake,5);buzz(20);
  for(const o of G.enemies){if(o.dead||o===e)continue;const dx=o.x-e.x,dy=o.y-e.y;if(dx*dx+dy*dy<92*92+o.r*o.r)hurtEnemy(o,o.boss?120:80);}
  const dx=P.x-e.x,dy=P.y-e.y,near=dx*dx+dy*dy;
  if(hurtsPlayer&&near<(92+P.r)*(92+P.r))hurtPlayer(e.dmg);
  const blast=ET[e.type].blast;
  if(blast==='fog'&&near<190*190)G.fog=Math.min(1,G.fog+0.8);
  if(blast==='fire')addHazard({kind:'fire',x:e.x,y:e.y,r:70,dur:4,dmg:8,col:'255,140,40'});
  if(G.motes.length<320)G.motes.push(mote(e.x,e.y,e.xp));
}
export function killEnemy(e){
  if(e.mine){mineBlast(e,false);return;}
  e.dead=true;G.kills++;seen(e.type);
  if(e.type==='plasticbag')G.bags++;   // shooting one out of the water counts as cleaning up
  burst(e.x,e.y,e.boss?70:8,e.col,e.boss?280:110);
  if(e.boss){
    G.bossKills[e.type]=(G.bossKills[e.type]||0)+1;
    if(e.type==='boss2'){
      if(!G.weapons.harpoon)G.noHarpoonKraken=true;
      if(e.hitsTaken===0)G.flawlessKraken=true;
      if(Object.keys(G.weapons).length<=2)G.restrictedKraken=true;
      // Award on the actual kill, even when a later hit ends this frame.
      if(unlock('kraken')){G.newAch.push('kraken');G.achQueue.push('kraken');}
    }
    // a whole chapter, all four guardians, without a scratch
    if(e.slot===4&&G.cycleHits===0)G.cleanCycle=true;
    for(let i=0;i<14;i++)G.motes.push(mote(e.x+rnd(-60,60),e.y+rnd(-60,60),Math.ceil(e.xp/14)));
    P.hp=Math.min(P.maxHp,P.hp+35);G.boss=null;hideBossBar();
    SFX.boom();G.shake=14;ring(e.x,e.y,260,0.8,'255,200,220',4);buzz(120);
    G.bossesCleared=e.slot;
    // the place is now yours: its page opens in the logbook and its scenery drifts up and away
    const place=e.place||{};let page=false;
    if(place.id&&!save.meta.logbook[place.id]){save.meta.logbook[place.id]=Math.floor(Date.now()/1000);G.newPages.push(place.id);page=true;}
    G.leaving={place:place,t:G.t};
    if(e.slot<4){showBanner(t(page?'banner.page':'banner.calm'),3);checkpoint();}
    else{
      const last=G.tier===LAST_TIER;
      if(G.tier===0&&!save.meta.unlocks.vessels.dart){save.meta.unlocks.vessels.dart=true;}   // the Dart is earned by the first chapter
      nextTier();
      if(last)showEnding();
    }
  }else{
    if(G.motes.length<320)G.motes.push(mote(e.x,e.y,e.xp));
    if(G.specials.deathpulse){const pr=48+e.r;for(const o of G.enemies){if(o.dead||o===e||o.boss)continue;const dx=o.x-e.x,dy=o.y-e.y;if(dx*dx+dy*dy<pr*pr)hurtEnemy(o,e.maxHp*0.5);}burst(e.x,e.y,4,'255,120,160',80);}
    // the pieces of a splitter are born after the death pulse, or it would kill them at birth
    const sp=ET[e.type].split;
    if(sp&&G.enemies.length<230){for(let i=0;i<sp.n;i++){const a=rnd(0,TAU);const c=spawnEnemy(sp.type,e.x+Math.cos(a)*e.r*0.7,e.y+Math.sin(a)*e.r*0.7);c.vx=Math.cos(a)*140;c.vy=Math.sin(a)*140;c.timer=1;}}
    if(G.t-G.lastKillSfx>0.06){G.lastKillSfx=G.t;SFX.kill();}
  }
}
export function hurtPlayer(dmg){
  if(P.inv>0)return;
  G.lastHitT=G.t;G.cycleHits++;
  if(G.boss)G.boss.hitsTaken++;
  P.hp-=dmg*G.dmgScale*(1-P.armor);P.inv=0.85;P.flash=1;G.shake=7;SFX.hurt();buzz(40);
  burst(P.x,P.y,6,'255,120,120',90);
  if(P.hp<P.maxHp*0.2&&G.specials.emergency&&!G.emerUsed){
    G.emerUsed=true;P.hp=P.maxHp;P.inv=1.5;showBanner(t('banner.emergency'),2.5);ring(P.x,P.y,150,0.6,'255,181,71',3);SFX.levelup();return;
  }
  if(P.hp<=0){P.hp=0;gameOver();}
}
export function explode(x,y,radius,dmg){
  const r2=radius*radius;
  for(const e of G.enemies){if(e.dead)continue;const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<r2+e.r*e.r){hurtEnemy(e,dmg);const d=Math.hypot(dx,dy)||1;e.vx+=dx/d*160;e.vy+=dy/d*160;}}
  burst(x,y,18,'255,200,120',170);ring(x,y,radius,0.3,'255,200,120',3);SFX.torpedo();G.shake=Math.max(G.shake,4);buzz(15);
}
