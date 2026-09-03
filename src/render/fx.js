// ---------- render: bolts, rings, zap, flash, particles, damage numbers, joystick overlay ----------
import {ctx} from './canvas.js';
import {G,P} from '../game/state.js';
import {TAU} from '../util.js';
import {drawGlow,inView} from './draw.js';
import {joy,JR,joyFixed,joyAnchor} from '../ui/input.js';

export function boltPath(x0,y0,x1,y1,jit){
  const dx=x1-x0,dy=y1-y0,d=Math.hypot(dx,dy)||1,n=Math.max(3,Math.ceil(d/15)),px=-dy/d,py=dx/d,pts=[[x0,y0]];
  for(let i=1;i<n;i++){const t=i/n,off=(Math.random()*2-1)*jit*Math.sin(t*Math.PI);pts.push([x0+dx*t+px*off,y0+dy*t+py*off]);}
  pts.push([x1,y1]);return pts;
}
export function drawBolt(x0,y0,x1,y1,alpha,jit,width){
  const pts=boltPath(x0,y0,x1,y1,jit);
  ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.strokeStyle='rgba(110,180,255,1)';ctx.lineWidth=width*3.6;ctx.stroke();
  ctx.strokeStyle='rgba(235,248,255,1)';ctx.lineWidth=width;ctx.stroke();
  if(pts.length>4&&Math.random()<0.7){const i=1+Math.floor(Math.random()*(pts.length-2)),bx=pts[i][0],by=pts[i][1],a=Math.random()*TAU,l=8+Math.random()*18;
    ctx.lineWidth=width*0.7;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(a)*l,by+Math.sin(a)*l);ctx.stroke();}
  ctx.globalAlpha=1;
}
// Glow-pass effects: G.fx entries (bolt / zap / flash / ring). Damage numbers are drawn later, in the body pass.
export function drawFx(){
  for(const f of G.fx){const k=f.t/f.dur;
    if(f.kind==='num')continue;
    if(f.kind==='bolt'){let x1=f.x1,y1=f.y1;if(f.tg){if(f.tg.dead){continue;}x1=f.tg.x;y1=f.tg.y;}
      let x0=P.x,y0=P.y;if(f.rel){x0+=f.dx0;y0+=f.dy0;x1=P.x+f.dx1;y1=P.y+f.dy1;}
      drawBolt(x0,y0,x1,y1,Math.min(1,1.3-k*1.3),f.jit,f.w);}
    else if(f.kind==='zap'){const r=f.r1*(0.3+0.7*Math.sqrt(k));ctx.globalAlpha=(1-k)*0.8;ctx.strokeStyle='rgba(150,215,255,1)';ctx.lineWidth=2;ctx.beginPath();
      for(let i=0;i<=56;i++){const a=i/56*TAU,rr=r+(Math.random()*2-1)*7,x=f.x+Math.cos(a)*rr,y=f.y+Math.sin(a)*rr;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}
    else if(f.kind==='flash'){drawGlow(f.x,f.y,f.r1*(1+k*0.8),'160,220,255',(1-k)*0.9);}
    else{const r=f.r1*(0.2+0.8*Math.sqrt(k));ctx.globalAlpha=(1-k)*0.9;ctx.strokeStyle='rgba('+f.col+',1)';ctx.lineWidth=f.w;ctx.beginPath();ctx.arc(f.x,f.y,r,0,TAU);ctx.stroke();}}
  ctx.globalAlpha=1;
}
// Glow-pass particles: sparks ('p') and bubbles ('b')
export function drawParticles(){
  for(const p of G.parts){if(!inView(p.x,p.y,10))continue;const k=p.life/p.max;
    if(p.type==='p'){ctx.globalAlpha=k;ctx.fillStyle='rgba('+p.col+',1)';ctx.beginPath();ctx.arc(p.x,p.y,p.s*k+0.5,0,TAU);ctx.fill();}
    else{ctx.globalAlpha=k*0.55;ctx.strokeStyle='rgba('+p.col+',1)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,TAU);ctx.stroke();}}
  ctx.globalAlpha=1;
}
// Floating damage numbers (world space, body pass)
export function drawNumbers(){
  let any=false;
  for(const f of G.fx){if(f.kind!=='num')continue;
    if(!any){any=true;ctx.font='600 12px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff3cf';}
    const k=f.t/f.dur;ctx.globalAlpha=1-k*k;ctx.fillText(String(f.v),f.x,f.y-k*22);}
  if(any){ctx.globalAlpha=1;ctx.textAlign='start';ctx.textBaseline='alphabetic';}
}
// Screen-space joystick overlay
export function drawJoystick(){
  if(G.state!=='play')return;
  if(joy.active){
    ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,JR,0,TAU);ctx.stroke();
    ctx.fillStyle='rgba(62,242,208,0.35)';ctx.beginPath();ctx.arc(joy.ox+joy.dx*JR,joy.oy+joy.dy*JR,18,0,TAU);ctx.fill();
  }else if(joyFixed()){
    const a=joyAnchor();
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(a.x,a.y,JR,0,TAU);ctx.stroke();
    ctx.fillStyle='rgba(62,242,208,0.15)';ctx.beginPath();ctx.arc(a.x,a.y,18,0,TAU);ctx.fill();
  }
}
