// ---------- render: events (vent, chest), enemy projectiles, fog ----------
import {ctx,W,H} from './canvas.js';
import {G,P,clock} from '../game/state.js';
import {TAU} from '../util.js';
import {drawGlow} from './draw.js';

// glow pass (world space, 'lighter')
export function drawEventsGlow(){
  const a=G.ev.active;
  if(a&&a.kind==='vent'){drawGlow(a.x,a.y,150,'255,150,70',0.35+0.1*Math.sin(clock*6));drawGlow(a.x,a.y-60,90,'255,200,120',0.15);}
  if(a&&a.kind==='chest')drawGlow(a.x,a.y,40,'255,220,140',0.6+0.2*Math.sin(clock*4));
  for(const b of G.ebullets)drawGlow(b.x,b.y,24,(SHOT[b.kind]||SHOT.ink)[0],0.8);
  for(const m of G.mines)drawGlow(m.x,m.y,14,'255,90,70',m.t<0.5?0.2:0.35+0.35*Math.sin(clock*8));
  for(const an of G.anchors)drawGlow(an.x,an.y,20,'200,225,245',0.5);
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
    const speed=Math.hypot(b.vx,b.vy)||1,k=SHOT[b.kind]||SHOT.ink;
    ctx.strokeStyle='rgba('+k[0]+',0.65)';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(b.x-b.vx/speed*24,b.y-b.vy/speed*24);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=k[1];ctx.strokeStyle='rgba('+k[0]+',1)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.stroke();
  }
}
// colour of the trail and the body of each kind of enemy shot
const SHOT={ink:['255,155,225','#28143c'],mucus:['150,220,255','#0c2030'],spine:['255,200,150','#3c1c10'],sting:['255,90,90','#30080c'],
  bolt:['255,235,150','#fff6c8'],trident:['150,225,255','#e8fbff'],fire:['255,150,60','#ffe9a0'],shell:['200,210,220','#30363c'],rock:['210,170,130','#2c2018'],
  rust:['255,140,70','#40200c'],junk:['220,235,245','#50585c'],ray:['120,255,170','#eafff0'],soul:['200,150,255','#f2e6ff'],poison:['160,255,110','#12300c']};

// Hazards: drawn under everything that swims (world space)
export function drawHazards(){
  for(const h of G.hazards){
    if(h.kind==='slam'){
      const k=Math.min(1,h.t/h.tell);
      if(h.t<h.tell){ctx.fillStyle='rgba('+h.col+','+(0.08+0.12*k).toFixed(3)+')';ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.fill();
        ctx.strokeStyle='rgba('+h.col+',0.8)';ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
        ctx.strokeStyle='rgba(255,255,255,0.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(h.x,h.y,h.r*k,0,TAU);ctx.stroke();}
    }else if(h.kind==='fire'||h.kind==='vent'){
      const live=h.t>=(h.tell||0),fade=Math.min(1,(h.dur-h.t)/0.6);
      ctx.fillStyle='rgba('+h.col+','+((live?0.22+0.08*Math.sin(clock*9):0.08)*fade).toFixed(3)+')';ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba('+h.col+','+((live?0.8:0.5)*fade).toFixed(2)+')';ctx.lineWidth=2;if(!live)ctx.setLineDash([6,6]);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
    }else if(h.kind==='whirl'){
      ctx.save();ctx.translate(h.x,h.y);
      for(let k=0;k<7;k++){const r=h.r*(1-k/7)*0.98,a=clock*(0.5+k*0.35)+k;ctx.strokeStyle='rgba('+h.col+','+(0.12+k*0.05).toFixed(2)+')';ctx.lineWidth=2+k*0.5;ctx.beginPath();ctx.arc(0,0,Math.max(h.core*0.6,r),a,a+4.2);ctx.stroke();}
      ctx.fillStyle='rgba(2,4,10,0.85)';ctx.beginPath();ctx.arc(0,0,h.core,0,TAU);ctx.fill();
      ctx.restore();
    }
  }
}
// The vessel's mines and anchors (body pass, world space)
export function drawPlayerWeapons(){
  for(const m of G.mines){
    ctx.fillStyle='#2a3038';ctx.strokeStyle='#8a97a3';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(m.x,m.y,7,0,TAU);ctx.fill();ctx.stroke();
    for(let k=0;k<6;k++){const a=k/6*TAU+m.t*0.4;ctx.beginPath();ctx.moveTo(m.x+Math.cos(a)*7,m.y+Math.sin(a)*7);ctx.lineTo(m.x+Math.cos(a)*11,m.y+Math.sin(a)*11);ctx.stroke();}
    if(m.t>=0.5){ctx.fillStyle='rgba(255,90,70,'+(0.5+0.5*Math.sin(clock*8)).toFixed(2)+')';ctx.beginPath();ctx.arc(m.x,m.y,2.5,0,TAU);ctx.fill();}
  }
  for(const an of G.anchors){
    ctx.strokeStyle='rgba(190,205,220,0.5)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(an.x,an.y);ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.translate(an.x,an.y);ctx.rotate(an.spin);ctx.strokeStyle='#dfe9f2';ctx.lineWidth=3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,10);ctx.moveTo(-6,-6);ctx.lineTo(6,-6);ctx.stroke();
    ctx.beginPath();ctx.arc(0,2,10,0.15,Math.PI-0.15);ctx.stroke();ctx.beginPath();ctx.arc(0,-13,2.5,0,TAU);ctx.stroke();
    ctx.restore();
  }
}
// screen-space fog from plankton and ink
export function drawFog(){
  const fog=Math.max(G.fog,G.mods.fog);if(fog<=0)return;
  const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.15,W/2,H/2,Math.max(W,H)*0.75);
  g.addColorStop(0,'rgba(18,8,36,0)');g.addColorStop(0.4,'rgba(18,8,36,'+(fog*0.25).toFixed(3)+')');g.addColorStop(1,'rgba(18,8,36,'+(fog*0.6).toFixed(3)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
