// ---------- weapons ----------
import {G,P} from './state.js';
import {WEAPONS,effLv} from './config.js';
import {explode} from './combat.js';
import {nearestEnemies} from './enemies.js';
import {hurtEnemy} from './combat.js';
import {burst,ring} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {rnd,TAU,angDiff} from '../util.js';

// Searchlight stats for the current level, scaled by the vessel (the Dart has a narrow, long beam)
export function lampStats(){
  const st=WEAPONS.lamp.lv(effLv(G.weapons.lamp||1,WEAPONS.lamp.max));
  st.range*=(P.lampRange||1)*G.mods.lamp;st.arc*=P.lampArc||1;return st;
}
export function lampDamage(st,dt){
  const r2=st.range*st.range,second=!!G.specials.lamp2,halo=G.evo.lamp?r2*0.36:0;
  for(const e of G.enemies){
    e.lit=false;if(e.dead)continue;
    const dx=e.x-P.x,dy=e.y-P.y;const d2=dx*dx+dy*dy;
    if(d2>r2)continue;
    const a=Math.atan2(dy,dx),tol=st.arc/2+e.r/Math.max(30,Math.sqrt(d2));
    let f=0;if(Math.abs(angDiff(P.aim,a))<tol)f=1;else if(second&&Math.abs(angDiff(P.aim+Math.PI,a))<tol)f=0.7;
    // Lighthouse: a ring of light all around, weaker than the beam
    if(!f&&halo&&d2<halo)f=0.35;
    if(f){e.lit=true;hurtEnemy(e,st.dmg*P.dmgMul*dt*f,true);if(Math.random()<dt*5)burst(e.x+rnd(-e.r,e.r),e.y+rnd(-e.r,e.r),1,'255,225,170',40);}
  }
}
export function fireHarpoon(st){
  const tg=nearestEnemies(st.count,520);if(!tg.length)return false;
  for(let i=0;i<st.count;i++){
    const t=tg[i%tg.length];const a=Math.atan2(t.y-P.y,t.x-P.x)+rnd(-0.05,0.05);
    // Trident: every harpoon becomes three, and they go through two more
    const prongs=G.evo.harpoon?[-0.2,0,0.2]:[0];
    for(const o of prongs)G.bullets.push({x:P.x,y:P.y,vx:Math.cos(a+o)*st.speed,vy:Math.sin(a+o)*st.speed,life:1.3,dmg:st.dmg*P.dmgMul,pierce:st.pierce+(G.evo.harpoon?2:0),hit:[]});
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
  // Living field: the pulse feeds the hull, one point per creature struck, six at most
  if(G.evo.field&&n){P.hp=Math.min(P.maxHp,P.hp+Math.min(6,n));ring(P.x,P.y,st.radius*0.6,0.4,'120,255,170',2);}
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
  // Whale song: twice the stun, and every light in reach comes to the vessel
  if(G.evo.sonar){st={dmg:st.dmg,radius:st.radius,push:st.push,stun:st.stun*2};for(const mo of G.motes){const mx=mo.x-P.x,my=mo.y-P.y;if(mx*mx+my*my<r2*4)mo.pull=true;}}
  for(const e of G.enemies){if(e.dead||e.boss)continue;const dx=e.x-P.x,dy=e.y-P.y;const d2=dx*dx+dy*dy;
    if(d2<r2){const d=Math.sqrt(d2)||1;
      if(e.ghost){hurtEnemy(e,st.dmg*P.dmgMul);}
      else if(e.mine){sonarControl(e,0.4,dx/d*st.push,dy/d*st.push);}
      else{sonarControl(e,st.stun,dx/d*st.push,dy/d*st.push);hurtEnemy(e,st.dmg*P.dmgMul);}
      any=true;}}
  for(const e of G.enemies){if(e.dead||!e.boss)continue;const dx=e.x-P.x,dy=e.y-P.y;if(dx*dx+dy*dy<r2){hurtEnemy(e,st.dmg*P.dmgMul*3);sonarControl(e,st.stun*0.5,e.vx,e.vy);}}
  ring(P.x,P.y,st.radius,0.6,'62,242,208',2);ring(P.x,P.y,st.radius*0.7,0.6,'62,242,208',1);
  SFX.sonar();return true;
}
function sonarControl(e,duration,vx,vy){
  // Every stun leaves a guaranteed recovery window, even with maximum cooling.
  if(G.t<e.stunReady)return;
  e.vx=vx;e.vy=vy;e.stun=duration;e.stunReady=G.t+duration+(e.boss?1.25:0.8);
}
// Depth mines: dropped behind the vessel, armed after half a second, set off by the first creature to touch them
export function dropMine(st){
  if(G.mines.length>=st.count)return false;
  G.mines.push({x:P.x-Math.cos(P.dir)*P.r*1.5,y:P.y-Math.sin(P.dir)*P.r*1.5,t:0,life:16,dmg:st.dmg*P.dmgMul,radius:st.radius});
  return true;
}
export function updateMines(dt){
  for(const m of G.mines){
    m.t+=dt;if(m.t<0.5)continue;
    for(const e of G.enemies){if(e.dead||e.ghost)continue;const dx=e.x-m.x,dy=e.y-m.y,rr=e.r+16;if(dx*dx+dy*dy<rr*rr){explode(m.x,m.y,m.radius,m.dmg);m.t=m.life;break;}}
  }
  G.mines=G.mines.filter(function(m){return m.t<m.life;});
}
// Anchor: thrown on its chain, it ploughs out through everything and ploughs back
export function throwAnchor(st){
  const tg=nearestEnemies(st.count,st.range+80);if(!tg.length)return false;
  for(let i=0;i<st.count;i++){const t=tg[i%tg.length];
    G.anchors.push({x:P.x,y:P.y,a:Math.atan2(t.y-P.y,t.x-P.x)+(i?rnd(-0.5,0.5):0),t:0,range:st.range,dmg:st.dmg*P.dmgMul,out:true,hit:[],spin:0});}
  SFX.shoot();return true;
}
export function updateAnchors(dt){
  for(const an of G.anchors){
    an.t+=dt;an.spin+=dt*9;
    if(an.out){
      const k=an.t/0.55;an.x=P.x+Math.cos(an.a)*an.range*Math.sin(Math.min(1,k)*Math.PI/2);an.y=P.y+Math.sin(an.a)*an.range*Math.sin(Math.min(1,k)*Math.PI/2);
      if(k>=1){an.out=false;an.hit=[];an.t=0;}
    }else{
      const dx=P.x-an.x,dy=P.y-an.y,d=Math.hypot(dx,dy)||1,sp=Math.min(d,(260+an.t*520)*dt);an.x+=dx/d*sp;an.y+=dy/d*sp;
      if(d<P.r+6)an.done=true;
    }
    for(const e of G.enemies){if(e.dead||an.hit.indexOf(e)>=0)continue;const dx=e.x-an.x,dy=e.y-an.y,rr=e.r+13;
      if(dx*dx+dy*dy<rr*rr){an.hit.push(e);hurtEnemy(e,an.dmg);if(!e.boss&&!e.ghost){const d=Math.hypot(dx,dy)||1;e.vx+=dx/d*120;e.vy+=dy/d*120;}burst(an.x,an.y,3,'220,230,240',70);}}
  }
  G.anchors=G.anchors.filter(function(an){return !an.done&&an.t<4;});
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
    else if(w==='mines')tickCd(w,st.cd,function(){return dropMine(st);},dt);
    else if(w==='anchor')tickCd(w,st.cd,function(){return throwAnchor(st);},dt);
    else if(w==='orbs'){
      // Maelstrom: two more lights, the ring breathes in and out, and it burns half again as hot
      const mael=!!G.evo.orbs,n=st.n+(mael?2:0),rad=st.r*(mael?1.15+0.5*Math.sin(G.t*2.2):1),burn=st.dmg*(mael?1.5:1);
      G.orbAng+=st.spin*dt;G.orbs.length=0;
      for(let i=0;i<n;i++){const a=G.orbAng+i*TAU/n;G.orbs.push({x:P.x+Math.cos(a)*rad,y:P.y+Math.sin(a)*rad});}
      for(const o of G.orbs)for(const e of G.enemies){if(e.dead)continue;const dx=e.x-o.x,dy=e.y-o.y;const rr=e.r+9;if(dx*dx+dy*dy<rr*rr){hurtEnemy(e,burn*P.dmgMul*dt,true);}}
    }
  }
  if(!G.weapons.orbs)G.orbs.length=0;
  updateMines(dt);updateAnchors(dt);
  if(G.weapons.field){G.crackT=(G.crackT||0)-dt;if(G.crackT<=0){G.crackT=rnd(0.07,0.2);const a=rnd(0,TAU),b=a+rnd(-1.2,1.2),r0=P.r*1.25,l=rnd(9,22);
    G.fx.push({kind:'bolt',rel:true,dx0:Math.cos(a)*r0,dy0:Math.sin(a)*r0,dx1:Math.cos(a)*r0+Math.cos(b)*l,dy1:Math.sin(a)*r0+Math.sin(b)*l,t:0,dur:0.07,jit:4,w:1});}}
}
