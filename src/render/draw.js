// ---------- render: glow sprites, background, rays, snow, vignette, lamp cone ----------
import {ctx,W,H,getVignette} from './canvas.js';
import {G,P,cam,snow,clock} from '../game/state.js';
import {ZONES,WEAPONS,effLv} from '../game/config.js';
import {clamp,lerp} from '../util.js';

// ---------- glow sprites ----------
const glowCache=new Map();
export function glow(col){
  let s=glowCache.get(col);if(s)return s;
  const size=64,c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d');
  const grd=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  grd.addColorStop(0,'rgba('+col+',1)');grd.addColorStop(0.22,'rgba('+col+',0.5)');
  grd.addColorStop(0.55,'rgba('+col+',0.13)');grd.addColorStop(1,'rgba('+col+',0)');
  g.fillStyle=grd;g.fillRect(0,0,size,size);glowCache.set(col,c);return c;
}
export function drawGlow(x,y,r,col,a){ctx.globalAlpha=a;ctx.drawImage(glow(col),x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}

export function zoneColor(){
  const d=G.depth;let i=0;while(i<ZONES.length-2&&d>ZONES[i+1].d)i++;
  const a=ZONES[i],b=ZONES[i+1],t=clamp((d-a.d)/(b.d-a.d),0,1);
  const mix=function(p,q){return p.map(function(v,k){return Math.round(lerp(v,q[k],t));});};
  return{top:mix(a.top,b.top),bot:mix(a.bot,b.bot)};
}
export function drawBackground(){
  const z=zoneColor();const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgb('+z.top.join(',')+')');g.addColorStop(1,'rgb('+z.bot.join(',')+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
export function drawRays(){
  const k=1-G.depth/900;if(k<=0)return;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const span=W*1.3;
  for(let i=0;i<6;i++){
    const x=(((i*W/5+clock*9+i*37-cam.x*0.08)%span)+span)%span-W*0.15;
    const a=0.055*k*(0.6+0.4*Math.sin(clock*0.5+i));
    const grd=ctx.createLinearGradient(0,0,0,H*0.9);grd.addColorStop(0,'rgba(120,200,255,'+a.toFixed(3)+')');grd.addColorStop(1,'rgba(120,200,255,0)');
    ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(x-30,0);ctx.lineTo(x+30,0);ctx.lineTo(x+150,H*0.9);ctx.lineTo(x-20,H*0.9);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
export function drawSnow(near){
  ctx.fillStyle='rgba(205,228,255,1)';
  for(const f of snow){
    if((f.f>0.6)!==near)continue;
    const sx=(((f.x-cam.x*f.f)%W)+W)%W,sy=(((f.y-cam.y*f.f-clock*f.v)%H)+H)%H;
    ctx.globalAlpha=near?0.42:0.28;ctx.fillRect(sx,sy,f.s,f.s);
  }
  ctx.globalAlpha=1;
}
export function drawVignette(){
  ctx.drawImage(getVignette(),0,0,W,H);
}
export function drawLamp(){
  const st=WEAPONS.lamp.lv(effLv(G.weapons.lamp,WEAPONS.lamp.max));
  lampCone(P.aim,st,1);
  if(G.specials.lamp2)lampCone(P.aim+Math.PI,st,0.7);
}
function lampCone(ang,st,k){
  ctx.save();ctx.translate(P.x,P.y);ctx.rotate(ang);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,0,8,0,0,st.range);
  g.addColorStop(0,'rgba(255,220,160,'+(0.42*k).toFixed(3)+')');g.addColorStop(0.5,'rgba(255,210,150,'+(0.16*k).toFixed(3)+')');g.addColorStop(1,'rgba(255,200,140,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,st.range,-st.arc/2,st.arc/2);ctx.closePath();ctx.fill();
  ctx.restore();
}
export function inView(x,y,pad){return x>cam.x-pad&&x<cam.x+W+pad&&y>cam.y-pad&&y<cam.y+H+pad;}
