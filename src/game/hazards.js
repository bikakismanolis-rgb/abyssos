// ---------- hazards: things in the water that hurt without being creatures ----------
// slam   a warned circle that detonates once (quakes, tail slaps, shells landing, lunging heads)
// fire   a burning patch left by a flame mine
// vent   a scalding column thrown up by a guardian; burns creatures too
// whirl  Charybdis: drags the vessel towards its core for as long as its guardian lives
import {G,P} from './state.js';
import {hurtPlayer,hurtEnemy} from './combat.js';
import {burst,ring,bubble} from './effects.js';
import {SFX} from '../audio/sfx.js';
import {rnd} from '../util.js';

export function addHazard(h){
  if(G.hazards.length>=40)return null;
  h.t=0;G.hazards.push(h);return h;
}
export function slamAt(x,y,r,tell,dmg,col){return addHazard({kind:'slam',x:x,y:y,r:r,tell:tell,dur:tell+0.25,dmg:dmg,col:col||'255,190,120'});}
export function updateHazards(dt){
  for(const h of G.hazards){
    h.t+=dt;
    const dx=P.x-h.x,dy=P.y-h.y,d2=dx*dx+dy*dy,inside=d2<(h.r+P.r*0.5)*(h.r+P.r*0.5);
    if(h.kind==='slam'){
      if(!h.done&&h.t>=h.tell){
        h.done=true;burst(h.x,h.y,16,h.col,200);ring(h.x,h.y,h.r,0.3,h.col,4);SFX.torpedo();G.shake=Math.max(G.shake,5);
        if(inside){hurtPlayer(h.dmg);if(G.state!=='play')return;}
      }
    }else if(h.kind==='fire'||h.kind==='vent'){
      if(h.t>=(h.tell||0)){
        if(inside){hurtPlayer(h.dmg);if(G.state!=='play')return;}
        if(h.kind==='vent'){for(const e of G.enemies){if(e.dead||e.boss)continue;const ex=e.x-h.x,ey=e.y-h.y;if(ex*ex+ey*ey<h.r*h.r)hurtEnemy(e,20*dt,true);}
          if(Math.random()<dt*20)bubble(h.x+rnd(-30,30),h.y+rnd(-20,20));}
        if(Math.random()<dt*14)burst(h.x+rnd(-h.r,h.r)*0.6,h.y+rnd(-h.r,h.r)*0.6,1,h.col,50);
      }
    }else if(h.kind==='whirl'){
      if(!h.owner||h.owner.dead){h.dur=0;continue;}
      const d=Math.sqrt(d2)||1;
      if(d<h.r){const k=1-d/h.r,f=h.force*(0.35+k*1.4);P.vx-=dx/d*f*dt*6;P.vy-=dy/d*f*dt*6;
        // the water turns as well as sinks
        P.vx+=-dy/d*f*dt*2.2;P.vy+=dx/d*f*dt*2.2;}
      if(d<h.core){hurtPlayer(h.dmg);if(G.state!=='play')return;}
    }
  }
  G.hazards=G.hazards.filter(function(h){return h.t<h.dur;});
}
