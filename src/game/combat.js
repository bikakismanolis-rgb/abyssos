// ---------- combat ----------
import {G,P,nextTier} from './state.js';
import {burst,ring,mote} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {showBanner,hideBossBar} from '../ui/hud.js';
import {gameOver} from '../ui/screens.js';
import {rnd} from '../util.js';

export function hurtEnemy(e,dmg,quiet){if(e.dead)return;e.hp-=dmg;if(!quiet)e.flash=0.1;if(e.hp<=0)killEnemy(e);}
export function mineBlast(e,hurtsPlayer){
  e.dead=true;G.kills++;
  burst(e.x,e.y,24,'255,140,90',210);ring(e.x,e.y,92,0.35,'255,140,90',3);SFX.torpedo();G.shake=Math.max(G.shake,5);
  for(const o of G.enemies){if(o.dead||o===e)continue;const dx=o.x-e.x,dy=o.y-e.y;if(dx*dx+dy*dy<92*92+o.r*o.r)hurtEnemy(o,o.boss?120:80);}
  if(hurtsPlayer){const dx=P.x-e.x,dy=P.y-e.y;if(dx*dx+dy*dy<(92+P.r)*(92+P.r))hurtPlayer(e.dmg);}
  if(G.motes.length<320)G.motes.push(mote(e.x,e.y,e.xp));
}
export function killEnemy(e){
  if(e.mine){mineBlast(e,false);return;}
  e.dead=true;G.kills++;
  burst(e.x,e.y,e.boss?70:8,e.col,e.boss?280:110);
  if(e.boss){
    for(let i=0;i<14;i++)G.motes.push(mote(e.x+rnd(-60,60),e.y+rnd(-60,60),Math.ceil(e.xp/14)));
    P.hp=Math.min(P.maxHp,P.hp+35);G.boss=null;hideBossBar();
    SFX.boom();G.shake=14;ring(e.x,e.y,260,0.8,'255,200,220',4);
    if(e.type==='boss1'){G.phase=2;G.phaseT=90;showBanner('Το βάθος ησύχασε, για λίγο',3);}
    else nextTier();
  }else{
    if(G.motes.length<320)G.motes.push(mote(e.x,e.y,e.xp));
    if(G.specials.deathpulse){const pr=48+e.r;for(const o of G.enemies){if(o.dead||o===e||o.boss)continue;const dx=o.x-e.x,dy=o.y-e.y;if(dx*dx+dy*dy<pr*pr)hurtEnemy(o,e.maxHp*0.5);}burst(e.x,e.y,4,'255,120,160',80);}
    if(G.t-G.lastKillSfx>0.06){G.lastKillSfx=G.t;SFX.kill();}
  }
}
export function hurtPlayer(dmg){
  if(P.inv>0)return;
  P.hp-=dmg*G.dmgScale*(1-P.armor);P.inv=0.85;P.flash=1;G.shake=7;SFX.hurt();
  burst(P.x,P.y,6,'255,120,120',90);
  if(P.hp<P.maxHp*0.2&&G.specials.emergency&&!G.emerUsed){
    G.emerUsed=true;P.hp=P.maxHp;P.inv=1.5;showBanner('Έκτακτη επισκευή',2.5);ring(P.x,P.y,150,0.6,'255,181,71',3);SFX.levelup();return;
  }
  if(P.hp<=0){P.hp=0;gameOver();}
}
export function explode(x,y,radius,dmg){
  const r2=radius*radius;
  for(const e of G.enemies){if(e.dead)continue;const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<r2+e.r*e.r){hurtEnemy(e,dmg);const d=Math.hypot(dx,dy)||1;e.vx+=dx/d*160;e.vy+=dy/d*160;}}
  burst(x,y,18,'255,200,120',170);ring(x,y,radius,0.3,'255,200,120',3);SFX.torpedo();G.shake=Math.max(G.shake,4);
}
