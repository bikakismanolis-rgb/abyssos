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
  }
}
