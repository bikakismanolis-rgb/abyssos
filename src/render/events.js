// ---------- render: events (vent, chest), enemy projectiles, fog ----------
import {ctx,W,H} from './canvas.js';
import {G,clock} from '../game/state.js';
import {TAU} from '../util.js';
import {drawGlow} from './draw.js';

// glow pass (world space, 'lighter')
export function drawEventsGlow(){
  const a=G.ev.active;
  if(a&&a.kind==='vent'){drawGlow(a.x,a.y,150,'255,150,70',0.35+0.1*Math.sin(clock*6));drawGlow(a.x,a.y-60,90,'255,200,120',0.15);}
  if(a&&a.kind==='chest')drawGlow(a.x,a.y,40,'255,220,140',0.6+0.2*Math.sin(clock*4));
  for(const b of G.ebullets)drawGlow(b.x,b.y,24,'255,125,220',0.8);
}
// body pass (world space)
export function drawEventsBody(){
  const a=G.ev.active;
  if(a&&a.kind==='vent'){
    // a crack in the floor and a shimmering column above it
    ctx.fillStyle='rgba(20,8,4,0.9)';ctx.beginPath();ctx.ellipse(a.x,a.y+10,46,14,0,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(255,170,80,0.85)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y+10,30,8,0,0,TAU);ctx.stroke();
    for(let i=0;i<5;i++){const k=(clock*0.6+i*0.2)%1;ctx.globalAlpha=(1-k)*0.22;ctx.strokeStyle='rgba(255,210,150,1)';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(a.x+Math.sin(clock*3+i)*8,a.y-k*140,22+k*30,8+k*6,0,0,TAU);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  if(a&&a.kind==='chest'){
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.sin(clock*1.2)*0.12);
    ctx.fillStyle='#5a3d22';ctx.strokeStyle='#d9b675';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.rect(-16,-11,32,22);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-16,-3);ctx.lineTo(16,-3);ctx.moveTo(-5,-11);ctx.lineTo(-5,11);ctx.moveTo(5,-11);ctx.lineTo(5,11);ctx.stroke();
    ctx.fillStyle='#ffe2a8';ctx.beginPath();ctx.arc(0,-3,2.5,0,TAU);ctx.fill();
    ctx.restore();
  }
  for(const e of G.enemies){if(e.inkAim===undefined||e.dead)continue;
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.inkAim);
    ctx.strokeStyle='#ffd5f4';ctx.lineWidth=2;ctx.setLineDash([5,6]);
    ctx.beginPath();ctx.moveTo(e.r+8,0);ctx.lineTo(e.r+65,0);ctx.stroke();ctx.restore();
  }
  for(const b of G.ebullets){
    const speed=Math.hypot(b.vx,b.vy)||1;
    ctx.strokeStyle='rgba(255,155,225,0.65)';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(b.x-b.vx/speed*24,b.y-b.vy/speed*24);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle='#28143c';ctx.strokeStyle='#ffd5f4';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffb8eb';ctx.beginPath();ctx.arc(b.x-2,b.y-2,2,0,TAU);ctx.fill();
  }
}
// screen-space fog from plankton and ink
export function drawFog(){
  if(G.fog<=0)return;
  const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.15,W/2,H/2,Math.max(W,H)*0.75);
  g.addColorStop(0,'rgba(18,8,36,0)');g.addColorStop(0.4,'rgba(18,8,36,'+(G.fog*0.25).toFixed(3)+')');g.addColorStop(1,'rgba(18,8,36,'+(G.fog*0.6).toFixed(3)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
