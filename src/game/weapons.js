// ---------- weapons ----------
import {G,P} from './state.js';
import {WEAPONS,effLv} from './config.js';
import {nearestEnemies} from './enemies.js';
import {hurtEnemy} from './combat.js';
import {burst,ring} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {rnd,TAU,angDiff} from '../util.js';

// Searchlight stats for the current level, scaled by the vessel (the Dart has a narrow, long beam)
export function lampStats(){
  const st=WEAPONS.lamp.lv(effLv(G.weapons.lamp||1,WEAPONS.lamp.max));
  st.range*=P.lampRange||1;st.arc*=P.lampArc||1;return st;
}
export function lampDamage(st,dt){
  const r2=st.range*st.range,second=!!G.specials.lamp2;
  for(const e of G.enemies){
    e.lit=false;if(e.dead)continue;
    const dx=e.x-P.x,dy=e.y-P.y;const d2=dx*dx+dy*dy;
    if(d2>r2)continue;
    const a=Math.atan2(dy,dx),tol=st.arc/2+e.r/Math.max(30,Math.sqrt(d2));
    let f=0;if(Math.abs(angDiff(P.aim,a))<tol)f=1;else if(second&&Math.abs(angDiff(P.aim+Math.PI,a))<tol)f=0.7;
    if(f){e.lit=true;hurtEnemy(e,st.dmg*P.dmgMul*dt*f,true);if(Math.random()<dt*5)burst(e.x+rnd(-e.r,e.r),e.y+rnd(-e.r,e.r),1,'255,225,170',40);}
  }
}
export function fireHarpoon(st){
  const tg=nearestEnemies(st.count,520);if(!tg.length)return false;
  for(let i=0;i<st.count;i++){
    const t=tg[i%tg.length];const a=Math.atan2(t.y-P.y,t.x-P.x)+rnd(-0.05,0.05);
    G.bullets.push({x:P.x,y:P.y,vx:Math.cos(a)*st.speed,vy:Math.sin(a)*st.speed,life:1.3,dmg:st.dmg*P.dmgMul,pierce:st.pierce,hit:[]});
  }
  SFX.shoot();return true;
}
export function firePulse(st){
  const r2=st.radius*st.radius;let n=0;
  for(const e of G.enemies){if(e.dead)continue;const dx=e.x-P.x,dy=e.y-P.y;const d2=dx*dx+dy*dy;
    if(d2<r2+e.r*e.r){
      hurtEnemy(e,st.dmg*P.dmgMul);
      if(!e.boss&&!e.ghost){const d=Math.sqrt(d2)||1;e.vx+=dx/d*270;e.vy+=dy/d*270;}
      if(n<16){G.fx.push({kind:'bolt',tg:e,x1:e.x,y1:e.y,t:0,dur:0.26,jit:10,w:2.1});n++;}
      burst(e.x,e.y,2,'150,220,255',60);}}
  for(let i=0;i<6;i++){const a=rnd(0,TAU),l=rnd(st.radius*0.35,st.radius);G.fx.push({kind:'bolt',x1:P.x+Math.cos(a)*l,y1:P.y+Math.sin(a)*l,t:0,dur:0.13,jit:16,w:1.2});}
  G.fx.push({kind:'zap',x:P.x,y:P.y,r1:st.radius,t:0,dur:0.32});
  G.fx.push({kind:'flash',x:P.x,y:P.y,r1:80,t:0,dur:0.22});
  SFX.zap();return true;
}
export function fireTorpedo(st){
  const tg=nearestEnemies(1,700);if(!tg.length)return false;
  for(let i=0;i<st.count;i++){
    const a=P.dir+Math.PI+rnd(-0.6,0.6);
    G.torps.push({x:P.x,y:P.y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,life:5,dmg:st.dmg*P.dmgMul,radius:st.radius,target:null,t:0});
  }
  SFX.shoot();return true;
}
export function fireSonar(st){
  const r2=st.radius*st.radius;let any=false;
  for(const e of G.enemies){if(e.dead||e.boss)continue;const dx=e.x-P.x,dy=e.y-P.y;const d2=dx*dx+dy*dy;
    if(d2<r2){const d=Math.sqrt(d2)||1;
      if(e.ghost){hurtEnemy(e,st.dmg*P.dmgMul);}
      else if(e.mine){e.vx=dx/d*st.push;e.vy=dy/d*st.push;e.stun=0.4;}
      else{e.vx=dx/d*st.push;e.vy=dy/d*st.push;e.stun=st.stun;hurtEnemy(e,st.dmg*P.dmgMul);}
      any=true;}}
  for(const e of G.enemies){if(e.dead||!e.boss)continue;const dx=e.x-P.x,dy=e.y-P.y;if(dx*dx+dy*dy<r2){hurtEnemy(e,st.dmg*P.dmgMul*3);e.stun=st.stun*0.5;}}
  ring(P.x,P.y,st.radius,0.6,'62,242,208',2);ring(P.x,P.y,st.radius*0.7,0.6,'62,242,208',1);
  SFX.sonar();return true;
}
export function tickCd(k,cd,fn,dt){
  G.cds[k]=(G.cds[k]||0)-dt;
  if(G.cds[k]<=0){G.cds[k]=fn()===false?0.25:cd*P.cdMul;}
}
// One tick of every owned weapon, plus the idle crackle of the electric field
export function updateWeapons(dt){
  for(const w in G.weapons){
    const st=WEAPONS[w].lv(effLv(G.weapons[w],WEAPONS[w].max));
    if(w==='lamp')lampDamage(lampStats(),dt);
    else if(w==='harpoon')tickCd(w,st.cd,function(){return fireHarpoon(st);},dt);
    else if(w==='field')tickCd(w,st.cd,function(){return firePulse(st);},dt);
    else if(w==='torpedo')tickCd(w,st.cd,function(){return fireTorpedo(st);},dt);
    else if(w==='sonar')tickCd(w,st.cd,function(){return fireSonar(st);},dt);
    else if(w==='orbs'){
      G.orbAng+=st.spin*dt;G.orbs.length=0;
      for(let i=0;i<st.n;i++){const a=G.orbAng+i*TAU/st.n;G.orbs.push({x:P.x+Math.cos(a)*st.r,y:P.y+Math.sin(a)*st.r});}
      for(const o of G.orbs)for(const e of G.enemies){if(e.dead)continue;const dx=e.x-o.x,dy=e.y-o.y;const rr=e.r+9;if(dx*dx+dy*dy<rr*rr){hurtEnemy(e,st.dmg*P.dmgMul*dt,true);}}
    }
  }
  if(!G.weapons.orbs)G.orbs.length=0;
  if(G.weapons.field){G.crackT=(G.crackT||0)-dt;if(G.crackT<=0){G.crackT=rnd(0.07,0.2);const a=rnd(0,TAU),b=a+rnd(-1.2,1.2),r0=P.r*1.25,l=rnd(9,22);
    G.fx.push({kind:'bolt',rel:true,dx0:Math.cos(a)*r0,dy0:Math.sin(a)*r0,dx1:Math.cos(a)*r0+Math.cos(b)*l,dy1:Math.sin(a)*r0+Math.sin(b)*l,t:0,dur:0.07,jit:4,w:1});}}
}
