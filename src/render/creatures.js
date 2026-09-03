// ---------- render: creatures ----------
import {ctx} from './canvas.js';
import {G} from '../game/state.js';
import {TAU} from '../util.js';

export function drawFish(e){
  const s=e.r,wag=Math.sin(G.t*14+e.seed)*0.4;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle='rgba('+e.col+',0.92)';
  ctx.beginPath();ctx.ellipse(0,0,s*1.4,s*0.6,0,0,TAU);ctx.fill();
  ctx.beginPath();ctx.moveTo(-s*1.1,0);ctx.lineTo(-s*2.1,-s*0.75+wag*s);ctx.lineTo(-s*2.1,s*0.75+wag*s);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.beginPath();ctx.ellipse(s*0.1,-s*0.15,s*0.8,s*0.25,0,0,TAU);ctx.fill();
  ctx.fillStyle='#04101b';ctx.beginPath();ctx.arc(s*0.75,-s*0.12,s*0.16,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawJelly(e){
  const pulse=1+Math.sin(G.t*2.6+e.seed)*0.1,s=e.r*pulse;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang+Math.PI/2);
  ctx.strokeStyle='rgba('+e.col+',0.55)';ctx.lineWidth=1.4;ctx.lineCap='round';
  for(let k=0;k<5;k++){const x0=(k-2)*s*0.38,ph=G.t*2.2+e.seed+k;
    ctx.beginPath();ctx.moveTo(x0,s*0.15);ctx.quadraticCurveTo(x0+Math.sin(ph)*s*0.45,s*1.2,x0+Math.sin(ph*0.8+1)*s*0.7,s*2.3);ctx.stroke();}
  ctx.fillStyle='rgba('+e.col+',0.42)';ctx.strokeStyle='rgba('+e.col+',0.85)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(0,0,s,Math.PI,0);ctx.quadraticCurveTo(s*0.55,s*0.4,0,s*0.28);ctx.quadraticCurveTo(-s*0.55,s*0.4,-s,0);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.beginPath();ctx.arc(0,-s*0.15,s*0.45,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawEel(e){
  const s=e.r,n=9,seg=s*0.95,dx=Math.cos(e.ang),dy=Math.sin(e.ang),px=-dy,py=dx;
  ctx.lineCap='round';
  for(let i=n-1;i>=0;i--){
    const w1=Math.sin(G.t*9+e.seed-i*0.7)*s*0.7*(i/n+0.2),w2=Math.sin(G.t*9+e.seed-(i+1)*0.7)*s*0.7*((i+1)/n+0.2);
    ctx.strokeStyle='rgba('+e.col+','+(0.9-i*0.07).toFixed(2)+')';ctx.lineWidth=Math.max(1,s*(1.1-i*0.09));
    ctx.beginPath();ctx.moveTo(e.x-dx*seg*i+px*w1,e.y-dy*seg*i+py*w1);ctx.lineTo(e.x-dx*seg*(i+1)+px*w2,e.y-dy*seg*(i+1)+py*w2);ctx.stroke();
  }
  ctx.fillStyle='rgba('+e.col+',1)';ctx.beginPath();ctx.arc(e.x,e.y,s*0.62,0,TAU);ctx.fill();
  ctx.fillStyle='#04101b';
  ctx.beginPath();ctx.arc(e.x+dx*s*0.25+px*s*0.3,e.y+dy*s*0.25+py*s*0.3,s*0.14,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(e.x+dx*s*0.25-px*s*0.3,e.y+dy*s*0.25-py*s*0.3,s*0.14,0,TAU);ctx.fill();
}
export function drawSquid(e){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle='rgba('+c+',0.7)';ctx.lineWidth=Math.max(1.2,s*0.14);ctx.lineCap='round';
  const nt=e.boss?10:6;
  for(let k=0;k<nt;k++){const y0=((k/(nt-1))-0.5)*s*1.1,ph=G.t*4+e.seed+k*0.9;
    ctx.beginPath();ctx.moveTo(-s*0.5,y0);ctx.quadraticCurveTo(-s*1.6,y0*1.6+Math.sin(ph)*s*0.4,-s*2.8,y0*2.2+Math.sin(ph+1)*s*0.5);ctx.stroke();}
  ctx.fillStyle='rgba('+c+',0.85)';
  ctx.beginPath();ctx.moveTo(s*2.1,0);ctx.quadraticCurveTo(s*0.6,-s*0.9,-s*0.5,-s*0.6);ctx.lineTo(-s*0.5,s*0.6);ctx.quadraticCurveTo(s*0.6,s*0.9,s*2.1,0);ctx.fill();
  ctx.fillStyle='rgba('+c+',0.5)';
  ctx.beginPath();ctx.moveTo(s*1.6,0);ctx.lineTo(s*0.4,-s*1.4);ctx.lineTo(s*0.2,-s*0.4);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(s*1.6,0);ctx.lineTo(s*0.4,s*1.4);ctx.lineTo(s*0.2,s*0.4);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba('+c+',0.95)';ctx.beginPath();ctx.arc(-s*0.6,0,s*0.55,0,TAU);ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(-s*0.55,-s*0.32,s*0.16,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(-s*0.55,s*0.32,s*0.16,0,TAU);ctx.fill();
  ctx.fillStyle='#08111c';
  ctx.beginPath();ctx.arc(-s*0.55,-s*0.32,s*0.08,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(-s*0.55,s*0.32,s*0.08,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawAngler(e){
  const s=e.r;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  const lx=s*1.5,ly=-s*1.1+Math.sin(G.t*3+e.seed)*s*0.15;
  ctx.strokeStyle='rgba(200,180,220,0.5)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(s*0.2,-s*0.8);ctx.quadraticCurveTo(s*1.1,-s*1.6,lx,ly);ctx.stroke();
  ctx.fillStyle='rgba(28,18,44,0.96)';ctx.strokeStyle='rgba('+e.col+',0.45)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(0,0,s*1.25,s,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(28,18,44,0.96)';ctx.beginPath();ctx.moveTo(-s*1.1,0);ctx.lineTo(-s*1.9,-s*0.6);ctx.lineTo(-s*1.9,s*0.6);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba('+e.col+',0.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s*0.3,s*0.15,s*0.75,-0.3,1.4);ctx.stroke();
  ctx.fillStyle='#e8f3ff';
  for(let k=0;k<5;k++){const a=-0.1+k*0.32,tx=s*0.3+Math.cos(a)*s*0.75,ty=s*0.15+Math.sin(a)*s*0.75;
    ctx.beginPath();ctx.moveTo(tx,ty);
    ctx.lineTo(tx-Math.cos(a)*s*0.25+Math.sin(a)*s*0.07,ty-Math.sin(a)*s*0.25-Math.cos(a)*s*0.07);
    ctx.lineTo(tx-Math.cos(a)*s*0.25-Math.sin(a)*s*0.07,ty-Math.sin(a)*s*0.25+Math.cos(a)*s*0.07);ctx.closePath();ctx.fill();}
  ctx.fillStyle='rgba('+e.col+',0.9)';ctx.beginPath();ctx.arc(s*0.45,-s*0.3,s*0.14,0,TAU);ctx.fill();
  ctx.restore();
  e.lureX=e.x+Math.cos(e.ang)*lx-Math.sin(e.ang)*ly;e.lureY=e.y+Math.sin(e.ang)*lx+Math.cos(e.ang)*ly;
}
export function drawKraken(e){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle='rgba('+c+',0.75)';ctx.lineCap='round';ctx.lineWidth=s*0.16;
  for(let k=0;k<8;k++){
    const a=Math.PI*0.35+(k/7)*Math.PI*1.3,ph=G.t*2.5+e.seed+k;
    const bx=Math.cos(a)*s*0.8,by=Math.sin(a)*s*0.8;
    const mx=Math.cos(a)*s*1.8+Math.sin(ph)*s*0.35,my=Math.sin(a)*s*1.8+Math.cos(ph)*s*0.35;
    const ex=Math.cos(a)*s*3+Math.sin(ph+1.3)*s*0.6,ey=Math.sin(a)*s*3+Math.cos(ph+0.7)*s*0.6;
    ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(mx,my,ex,ey);ctx.stroke();
    ctx.fillStyle='rgba(255,220,230,0.5)';
    for(let q=1;q<4;q++){const t=q/4,qx=(1-t)*(1-t)*bx+2*(1-t)*t*mx+t*t*ex,qy=(1-t)*(1-t)*by+2*(1-t)*t*my+t*t*ey;ctx.beginPath();ctx.arc(qx,qy,s*0.05,0,TAU);ctx.fill();}
  }
  ctx.fillStyle='rgba('+c+',0.9)';
  ctx.beginPath();ctx.moveTo(s*1.7,0);ctx.quadraticCurveTo(s*0.9,-s*1.1,-s*0.3,-s*0.95);ctx.quadraticCurveTo(-s*0.9,0,-s*0.3,s*0.95);ctx.quadraticCurveTo(s*0.9,s*1.1,s*1.7,0);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=2;
  for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(-s*0.2,0,s*(0.35+k*0.25),-1.2,1.2);ctx.stroke();}
  ctx.fillStyle='#fff8e8';
  ctx.beginPath();ctx.arc(s*0.1,-s*0.55,s*0.2,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.1,s*0.55,s*0.2,0,TAU);ctx.fill();
  ctx.fillStyle='#200812';
  ctx.beginPath();ctx.arc(s*0.16,-s*0.55,s*0.1,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.16,s*0.55,s*0.1,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawUrchin(e){
  const s=e.r,fast=e.warn?16:5,pul=0.5+0.5*Math.sin(G.t*fast+e.seed);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(G.t*0.5+e.seed);
  ctx.strokeStyle='rgba('+e.col+',0.85)';ctx.lineWidth=1.6;ctx.lineCap='round';
  for(let k=0;k<14;k++){const a=k/14*TAU,l=s*(1.55+0.35*Math.sin(G.t*4+k*1.7+e.seed));ctx.beginPath();ctx.moveTo(Math.cos(a)*s*0.7,Math.sin(a)*s*0.7);ctx.lineTo(Math.cos(a)*l,Math.sin(a)*l);ctx.stroke();}
  ctx.fillStyle='rgba(40,16,24,0.97)';ctx.strokeStyle='rgba('+e.col+',0.6)';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(0,0,s*0.85,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,'+Math.round(110+100*pul)+',90,'+(0.45+0.55*pul).toFixed(2)+')';ctx.beginPath();ctx.arc(0,0,s*0.32,0,TAU);ctx.fill();
  ctx.restore();
}
export function ghostAlpha(e){return 0.22+0.6*(0.5+0.5*Math.sin(G.t*6+e.seed));}
export function drawGhost(e){
  const s=e.r,a=ghostAlpha(e),ph=G.t*9+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);ctx.globalAlpha=a;
  ctx.fillStyle='rgba('+e.col+',0.6)';
  ctx.beginPath();ctx.moveTo(s*1.6,0);ctx.quadraticCurveTo(s*0.3,-s*0.95,-s*1.2,-s*0.5);
  ctx.quadraticCurveTo(-s*2.6,-s*0.2+Math.sin(ph)*s*0.7,-s*1.7,0);ctx.quadraticCurveTo(-s*2.6,s*0.2+Math.sin(ph+1.2)*s*0.7,-s*1.2,s*0.5);
  ctx.quadraticCurveTo(s*0.3,s*0.95,s*1.6,0);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.95)';ctx.beginPath();ctx.arc(s*0.8,-s*0.15,s*0.17,0,TAU);ctx.fill();
  ctx.restore();ctx.globalAlpha=1;
}
// ---------- phase 3 creatures ----------
export function drawPlankton(e){
  const s=e.r,ph=G.t*3+e.seed;
  ctx.fillStyle='rgba('+e.col+',0.75)';
  for(let k=0;k<4;k++){const a=ph+k*1.57,rr=s*0.7+Math.sin(ph*1.3+k)*s*0.3;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,s*0.4,0,TAU);ctx.fill();}
  ctx.fillStyle='rgba(255,255,255,0.6)';ctx.beginPath();ctx.arc(e.x,e.y,s*0.3,0,TAU);ctx.fill();
}
export function drawBeacon(e){
  const s=e.r,wag=Math.sin(G.t*10+e.seed)*0.35,pul=0.7+0.3*Math.sin(G.t*4+e.seed);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle='rgba(60,70,110,0.95)';
  ctx.beginPath();ctx.ellipse(0,0,s*1.5,s*0.7,0,0,TAU);ctx.fill();
  ctx.beginPath();ctx.moveTo(-s*1.2,0);ctx.lineTo(-s*2.2,-s*0.8+wag*s);ctx.lineTo(-s*2.2,s*0.8+wag*s);ctx.closePath();ctx.fill();
  // the lamp on a stalk above the head
  ctx.strokeStyle='rgba(255,240,150,0.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s*0.4,-s*0.6);ctx.quadraticCurveTo(s*1.1,-s*1.6,s*1.3,-s*1.2);ctx.stroke();
  ctx.fillStyle='rgba(255,250,200,'+pul.toFixed(2)+')';ctx.beginPath();ctx.arc(s*1.3,-s*1.2,s*0.42,0,TAU);ctx.fill();
  ctx.fillStyle='#04101b';ctx.beginPath();ctx.arc(s*0.8,-s*0.15,s*0.16,0,TAU);ctx.fill();
  ctx.restore();
  e.lureX=e.x+Math.cos(e.ang)*s*1.3+Math.sin(e.ang)*s*1.2;e.lureY=e.y+Math.sin(e.ang)*s*1.3-Math.cos(e.ang)*s*1.2;
}
export function drawInkSquid(e){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle='rgba('+c+',0.8)';ctx.lineWidth=Math.max(1.2,s*0.16);ctx.lineCap='round';
  for(let k=0;k<6;k++){const y0=((k/5)-0.5)*s*1.1,ph=G.t*5+e.seed+k*0.9;
    ctx.beginPath();ctx.moveTo(-s*0.5,y0);ctx.quadraticCurveTo(-s*1.5,y0*1.6+Math.sin(ph)*s*0.4,-s*2.6,y0*2.2+Math.sin(ph+1)*s*0.5);ctx.stroke();}
  ctx.fillStyle='rgba(40,25,70,0.96)';ctx.strokeStyle='rgba('+c+',0.9)';ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(s*2,0);ctx.quadraticCurveTo(s*0.6,-s*0.9,-s*0.5,-s*0.6);ctx.lineTo(-s*0.5,s*0.6);ctx.quadraticCurveTo(s*0.6,s*0.9,s*2,0);ctx.fill();ctx.stroke();
  ctx.fillStyle='#e8d8ff';ctx.beginPath();ctx.arc(-s*0.4,-s*0.3,s*0.18,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-s*0.4,s*0.3,s*0.18,0,TAU);ctx.fill();
  ctx.fillStyle='#120818';ctx.beginPath();ctx.arc(-s*0.4,-s*0.3,s*0.09,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-s*0.4,s*0.3,s*0.09,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawShrimp(e){
  const s=e.r,ph=G.t*8+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle='rgba('+e.col+',0.9)';ctx.strokeStyle='rgba(255,220,200,0.5)';ctx.lineWidth=1;
  // segmented tail curling under
  for(let k=0;k<5;k++){const x=-s*0.3-k*s*0.42,y=Math.sin(ph+k*0.6)*s*0.15+k*k*s*0.05;ctx.beginPath();ctx.ellipse(x,y,s*0.5,s*0.38-k*s*0.04,-k*0.25,0,TAU);ctx.fill();ctx.stroke();}
  ctx.beginPath();ctx.ellipse(s*0.4,0,s*0.9,s*0.5,0,0,TAU);ctx.fill();ctx.stroke();
  // the big snapping claw
  ctx.fillStyle='rgba(255,200,170,0.95)';
  ctx.beginPath();ctx.moveTo(s*0.9,-s*0.3);ctx.lineTo(s*2.1,-s*0.9);ctx.lineTo(s*2.3,-s*0.3);ctx.lineTo(s*1.4,s*0.1);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(s*0.9,s*0.35);ctx.lineTo(s*1.7,s*0.5);ctx.lineTo(s*1.2,s*0.7);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,220,200,0.6)';ctx.beginPath();ctx.moveTo(s*0.8,-s*0.4);ctx.lineTo(s*1.6,-s*1.3);ctx.moveTo(s*0.9,-s*0.2);ctx.lineTo(s*1.8,-s*0.9);ctx.stroke();
  ctx.fillStyle='#200a0a';ctx.beginPath();ctx.arc(s*0.9,-s*0.25,s*0.13,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawQueen(e){
  const s=e.r,pulse=1+Math.sin(G.t*1.6+e.seed)*0.06,ss=s*pulse,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang+Math.PI/2);
  // long tentacles; when stinging they snap straight
  ctx.lineCap='round';
  for(let k=0;k<11;k++){const x0=(k-5)*ss*0.19,ph=G.t*1.4+e.seed+k*0.7,len=ss*(2.2+0.5*Math.sin(ph));
    ctx.strokeStyle='rgba('+c+','+(k%2?0.55:0.35)+')';ctx.lineWidth=k%2?2.2:1.2;
    ctx.beginPath();ctx.moveTo(x0,ss*0.2);
    if(e.sting>0){ctx.lineTo(x0*2.2,ss*3.4);}
    else ctx.quadraticCurveTo(x0+Math.sin(ph)*ss*0.5,ss*1.3,x0*1.6+Math.sin(ph*0.7+1)*ss*0.6,ss*0.2+len);
    ctx.stroke();}
  const g=ctx.createRadialGradient(0,-ss*0.3,ss*0.1,0,0,ss);g.addColorStop(0,'rgba(255,220,250,0.7)');g.addColorStop(1,'rgba('+c+',0.35)');
  ctx.fillStyle=g;ctx.strokeStyle='rgba('+c+',0.9)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(0,0,ss,Math.PI,0);ctx.quadraticCurveTo(ss*0.6,ss*0.45,0,ss*0.3);ctx.quadraticCurveTo(-ss*0.6,ss*0.45,-ss,0);ctx.fill();ctx.stroke();
  // crown of lights
  ctx.fillStyle='rgba(255,255,255,0.8)';
  for(let k=0;k<5;k++){const a=Math.PI+k*Math.PI/4,r=ss*0.75;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,ss*0.06,0,TAU);ctx.fill();}
  ctx.restore();
}
export function drawLeviathan(e){
  const s=e.r,c=e.col,b=e.body;
  // body: a tapering ribbon through the trail
  ctx.lineCap='round';ctx.lineJoin='round';
  if(b.length>2){
    for(let i=b.length-1;i>0;i-=1){const k=i/b.length;ctx.strokeStyle='rgba('+c+','+(0.9-k*0.6).toFixed(2)+')';ctx.lineWidth=Math.max(2,s*1.5*(1-k*0.85));
      ctx.beginPath();ctx.moveTo(b[i].x,b[i].y);ctx.lineTo(b[i-1].x,b[i-1].y);ctx.stroke();}
    // fins along the spine
    ctx.strokeStyle='rgba(200,255,230,0.35)';ctx.lineWidth=1.5;
    for(let i=4;i<b.length-2;i+=5){const p=b[i],q=b[i-2];const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1,px=-dy/d,py=dx/d,f=s*(1.4-i/b.length);
      ctx.beginPath();ctx.moveTo(p.x+px*f*0.4,p.y+py*f*0.4);ctx.lineTo(p.x+px*f,p.y+py*f);ctx.moveTo(p.x-px*f*0.4,p.y-py*f*0.4);ctx.lineTo(p.x-px*f,p.y-py*f);ctx.stroke();}
  }
  // head
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle='rgba('+c+',0.95)';ctx.beginPath();ctx.moveTo(s*1.6,0);ctx.quadraticCurveTo(s*0.8,-s*0.9,-s*0.6,-s*0.75);ctx.lineTo(-s*0.6,s*0.75);ctx.quadraticCurveTo(s*0.8,s*0.9,s*1.6,0);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s*1.2,-s*0.1);ctx.lineTo(s*0.2,-s*0.5);ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*0.5,-s*0.35,s*0.2,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.5,s*0.35,s*0.2,0,TAU);ctx.fill();
  ctx.fillStyle='#062018';ctx.beginPath();ctx.arc(s*0.58,-s*0.35,s*0.1,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.58,s*0.35,s*0.1,0,TAU);ctx.fill();
  ctx.restore();
}
export function drawWreck(e){
  const s=e.r,c=e.col,tilt=Math.sin(G.t*0.7+e.seed)*0.08;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang+tilt);
  // hull, keel down; barnacles; a broken mast
  ctx.fillStyle='rgba(38,30,24,0.97)';ctx.strokeStyle='rgba('+c+',0.5)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-s*1.6,-s*0.5);ctx.lineTo(s*1.7,-s*0.5);ctx.quadraticCurveTo(s*1.9,s*0.4,s*1.1,s*0.75);ctx.lineTo(-s*1.2,s*0.75);ctx.quadraticCurveTo(-s*1.9,s*0.4,-s*1.6,-s*0.5);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba('+c+',0.35)';ctx.lineWidth=1;
  for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(-s*1.5,k*s*0.18);ctx.lineTo(s*1.6,k*s*0.18);ctx.stroke();}
  ctx.strokeStyle='rgba(120,100,70,0.9)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s*0.1,-s*0.5);ctx.lineTo(s*0.35,-s*1.6);ctx.stroke();
  ctx.beginPath();ctx.moveTo(s*0.2,-s*1.25);ctx.lineTo(s*0.9,-s*1.1);ctx.stroke();
  // portholes that still glow
  for(let k=-2;k<=2;k++){const pul=0.6+0.4*Math.sin(G.t*2+k+e.seed);ctx.fillStyle='rgba(255,190,90,'+pul.toFixed(2)+')';ctx.beginPath();ctx.arc(k*s*0.6,s*0.05,s*0.11,0,TAU);ctx.fill();}
  // barnacles and weed
  ctx.fillStyle='rgba(150,160,140,0.8)';
  for(let k=0;k<7;k++){const a=k*1.1+e.seed;ctx.beginPath();ctx.arc(Math.cos(a)*s*1.3,s*0.5+Math.sin(a)*s*0.15,s*0.07,0,TAU);ctx.fill();}
  ctx.strokeStyle='rgba(60,140,90,0.6)';ctx.lineWidth=1.5;
  for(let k=0;k<4;k++){const x=-s*1.2+k*s*0.8,ph=G.t*1.5+k;ctx.beginPath();ctx.moveTo(x,s*0.75);ctx.quadraticCurveTo(x+Math.sin(ph)*s*0.3,s*1.2,x+Math.sin(ph+1)*s*0.4,s*1.6);ctx.stroke();}
  ctx.restore();
}
export function drawEnemy(e){
  switch(e.type){
    case 'urchin':drawUrchin(e);break;
    case 'ghost':drawGhost(e);break;
    case 'fish':drawFish(e);break;
    case 'jelly':drawJelly(e);break;
    case 'eel':drawEel(e);break;
    case 'squid':case 'boss1':drawSquid(e);break;
    case 'angler':drawAngler(e);break;
    case 'boss2':drawKraken(e);break;
    case 'plankton':drawPlankton(e);break;
    case 'beacon':drawBeacon(e);break;
    case 'inksquid':drawInkSquid(e);break;
    case 'shrimp':drawShrimp(e);break;
    case 'queen':drawQueen(e);break;
    case 'leviathan':drawLeviathan(e);break;
    case 'wreck':drawWreck(e);break;
  }
}
