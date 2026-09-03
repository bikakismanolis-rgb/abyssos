// ---------- events: current, hydrothermal vent, wreck with a chest ----------
// One event at a time, never while a boss is out, the first after 60 s and then every 45 to 75 s.
import {G,P} from './state.js';
import {rnd,rndi,TAU} from '../util.js';
import {showBanner} from '../ui/hud.js';
import {SFX} from '../audio/sfx.js';
import {burst,bubble,ring,mote} from './effects.js';
import {hurtPlayer,hurtEnemy} from './combat.js';
import {addLight} from './shop.js';
import {openLevelUp} from '../ui/screens.js';
import {t} from '../i18n/index.js';

const KINDS=['current','vent','chest'];
export function updateEvents(dt){
  const ev=G.ev;
  if(!ev.active){
    ev.next-=dt;
    if(ev.next<=0&&!G.boss)startEvent(KINDS[rndi(0,KINDS.length-1)]);
    return;
  }
  const a=ev.active;a.t-=dt;a.age+=dt;
  if(a.kind==='current'){
    // the whole sea drifts: you are carried, and streaks show the direction
    P.x+=a.cx*90*dt;P.y+=a.cy*90*dt;
    if(Math.random()<dt*25&&G.parts.length<400)G.parts.push({x:P.x+rnd(-500,500),y:P.y+rnd(-500,500),vx:a.cx*260,vy:a.cy*260,life:0.8,max:0.8,col:'160,210,255',s:1.2,type:'p'});
  }else if(a.kind==='vent'){
    // a column of scalding water: it burns anything inside, but scatters light around it
    const dx=P.x-a.x,dy=P.y-a.y;
    if(dx*dx+dy*dy<90*90)hurtPlayer(10);
    for(const e of G.enemies){if(e.dead)continue;const ex=e.x-a.x,ey=e.y-a.y;if(ex*ex+ey*ey<90*90)hurtEnemy(e,20*dt,true);}
    a.emitT-=dt;
    if(a.emitT<=0){a.emitT=0.6;if(G.motes.length<320){const an=rnd(0,TAU),r=rnd(100,170);G.motes.push(mote(a.x+Math.cos(an)*r,a.y+Math.sin(an)*r,2));}}
    if(Math.random()<dt*30)bubble(a.x+rnd(-40,40),a.y+rnd(-20,20));
    if(Math.random()<dt*20)burst(a.x+rnd(-30,30),a.y,1,'255,170,80',60);
  }else if(a.kind==='chest'){
    // a crate from a wreck sinks slowly; reach it for a free upgrade or some Light
    a.y+=12*dt;
    const dx=P.x-a.x,dy=P.y-a.y;
    if(dx*dx+dy*dy<(P.r+18)*(P.r+18)){
      burst(a.x,a.y,20,'255,220,140',160);ring(a.x,a.y,120,0.5,'255,220,140',3);SFX.levelup();
      if(Math.random()<0.5){G.pendingLevels++;endEvent();openLevelUp();return;}
      const n=rndi(15,40);addLight(n);showBanner(t('event.light',{n:n}),2.5);
      endEvent();return;
    }
  }
  if(a.t<=0)endEvent();
}
function startEvent(kind){
  const a={kind:kind,t:0,age:0};
  if(kind==='current'){const an=rnd(0,TAU);a.cx=Math.cos(an);a.cy=Math.sin(an);a.t=20;}
  else if(kind==='vent'){const an=rnd(0,TAU);a.x=P.x+Math.cos(an)*300;a.y=P.y+Math.sin(an)*300;a.t=25;a.emitT=0.3;ring(a.x,a.y,90,0.8,'255,170,80',3);}
  else{const an=rnd(0,TAU);a.x=P.x+Math.cos(an)*350;a.y=P.y+Math.sin(an)*350;a.t=30;}
  G.ev.active=a;
  showBanner(t('event.'+kind),3);
}
function endEvent(){G.ev.active=null;G.ev.next=rnd(45,75);}
