// ---------- update ----------
import {G,P,cam} from './state.js';
import {W,H} from '../render/canvas.js';
import {DEPTH_RATE} from './config.js';
import {readMove} from '../ui/input.js';
import {nearestEnemies,updateEnemies,updateEnemyBullets,spawnWave,spawnBoss} from './enemies.js';
import {updateEvents} from './events.js';
import {updateWeapons,lampStats} from './weapons.js';
import {check as checkAchievements} from './achievements.js';
import {hurtEnemy,explode} from './combat.js';
import {collectMote} from './progression.js';
import {bubble,burst} from './effects.js';
import {showBanner,hideBanner} from '../ui/hud.js';
import {SFX} from '../audio/sfx.js';
import {rnd,lerp,angDiff} from '../util.js';
import {t} from '../i18n/index.js';

export function update(dt){
  G.t+=dt;G.depth+=DEPTH_RATE*dt;
  if(!G.boss){G.phaseT-=dt;if(G.phaseT<=0){if(G.phase===0){G.phase=1;spawnBoss(1);}else if(G.phase===2){G.phase=3;spawnBoss(2);}}}
  if(G.fog>0)G.fog=Math.max(0,G.fog-dt*0.35);
  if(G.zone===0&&G.depth>=1000){G.zone=1;if(Object.keys(G.weapons).length===1)G.lampOnly1000=true;showBanner(t('banner.midnight'),3);}
  if(G.zone===1&&G.depth>=3000){G.zone=2;showBanner(t('banner.abyssal'),3);}
  if(G.bannerT>0){G.bannerT-=dt;if(G.bannerT<=0)hideBanner();}
  // achievements: checked twice a second, announced one at a time when the banner is free
  G.achT-=dt;if(G.achT<=0){G.achT=0.5;const ids=checkAchievements(G,P,false);if(ids.length){G.achQueue.push.apply(G.achQueue,ids);G.newAch.push.apply(G.newAch,ids);}}
  if(G.achQueue.length&&G.bannerT<=0){showBanner(t('ach.unlocked',{name:t('ach.'+G.achQueue.shift()+'.name')}),2.5);}
  G.whaleT-=dt;if(G.whaleT<=0){G.whaleT=rnd(16,32);SFX.whale();}
  if(G.shake>0)G.shake=Math.max(0,G.shake-dt*30);

  // input
  let {ix,iy}=readMove();
  const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il;}
  const sp=P.speed*P.speedMul,k=1-Math.exp(-8*dt);
  P.vx=lerp(P.vx,ix*sp,k);P.vy=lerp(P.vy,iy*sp,k);
  P.x+=P.vx*dt;P.y+=P.vy*dt;
  if(il>0.15)P.dir+=angDiff(P.dir,Math.atan2(iy,ix))*Math.min(1,7*dt);
  const lampSt=lampStats();
  const ne=nearestEnemies(1,lampSt.range+90)[0];
  const aimTo=ne?Math.atan2(ne.y-P.y,ne.x-P.x):P.dir;
  P.aim+=angDiff(P.aim,aimTo)*Math.min(1,11*dt);
  const moving=Math.hypot(P.vx,P.vy)>20;
  P.bubbleT-=dt;
  if(P.bubbleT<=0){P.bubbleT=moving?0.07:0.5;bubble(P.x-Math.cos(P.dir)*P.r*1.6,P.y-Math.sin(P.dir)*P.r*1.6);}
  if(P.inv>0)P.inv-=dt;
  if(P.flash>0)P.flash=Math.max(0,P.flash-dt*2.5);
  if(P.regen>0)P.hp=Math.min(P.maxHp,P.hp+P.regen*dt);

  // weapons
  updateWeapons(dt);

  updateEnemies(dt);
  if(G.state!=='play')return;
  updateEnemyBullets(dt);
  if(G.state!=='play')return;
  updateEvents(dt);
  if(G.state!=='play')return;

  // bullets
  for(const b of G.bullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const e of G.enemies){if(e.dead||b.hit.indexOf(e)>=0)continue;const dx=e.x-b.x,dy=e.y-b.y;const rr=e.r+5;
      if(dx*dx+dy*dy<rr*rr){b.hit.push(e);hurtEnemy(e,b.dmg);burst(b.x,b.y,3,'220,245,255',70);b.pierce--;if(b.pierce<0){b.life=0;break;}}}
  }
  G.bullets=G.bullets.filter(function(b){return b.life>0;});

  // torpedoes
  for(const t of G.torps){
    t.life-=dt;t.t+=dt;
    if(!t.target||t.target.dead){const n=nearestEnemies(1,900);t.target=n[0]||null;}
    const spd=Math.min(300,120+t.t*260);
    let a=Math.atan2(t.vy,t.vx);
    if(t.target){const want=Math.atan2(t.target.y-t.y,t.target.x-t.x);a+=angDiff(a,want)*Math.min(1,4.5*dt);}
    t.vx=Math.cos(a)*spd;t.vy=Math.sin(a)*spd;t.x+=t.vx*dt;t.y+=t.vy*dt;
    if(Math.random()<0.5)bubble(t.x,t.y);
    for(const e of G.enemies){if(e.dead)continue;const dx=e.x-t.x,dy=e.y-t.y;const rr=e.r+7;if(dx*dx+dy*dy<rr*rr){explode(t.x,t.y,t.radius,t.dmg);t.life=0;break;}}
  }
  G.torps=G.torps.filter(function(t){return t.life>0;});

  // motes
  const mag2=P.magnet*P.magnet;
  for(const mo of G.motes){
    mo.t+=dt;const dx=P.x-mo.x,dy=P.y-mo.y;const d2=dx*dx+dy*dy;
    const d=Math.sqrt(d2)||1;
    if(d2<mag2){const s=(260+(P.magnet-d)*5)*dt;mo.x+=dx/d*s;mo.y+=dy/d*s;}
    else{const s=(30+mo.t*12)*dt;mo.x+=dx/d*s;mo.y+=dy/d*s;}
    if(d2<(P.r+8)*(P.r+8)){mo.got=true;collectMote(mo);if(G.state!=='play')break;}
  }
  G.motes=G.motes.filter(function(m){return !m.got;});

  // particles
  for(const p of G.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type==='p'){p.vx*=Math.exp(-3*dt);p.vy*=Math.exp(-3*dt);}else{p.x+=Math.sin(p.life*9)*10*dt;}}
  G.parts=G.parts.filter(function(p){return p.life>0;});
  for(const f of G.fx)f.t+=dt;
  G.fx=G.fx.filter(function(f){return f.t<f.dur;});

  // spawning
  G.spawnT-=dt;
  if(G.spawnT<=0){G.spawnT=G.spawnEvery;spawnWave();}

  // camera
  const ck=1-Math.exp(-6*dt);
  cam.x=lerp(cam.x,P.x-W/2,ck);cam.y=lerp(cam.y,P.y-H/2,ck);
}
