// ---------- render: the bathyscaphe ----------
import {ctx} from './canvas.js';
import {G,P} from '../game/state.js';
import {TAU} from '../util.js';

export function drawPlayer(){
  const r=P.r,blink=P.inv>0&&Math.floor(G.t*20)%2===0;
  ctx.save();ctx.translate(P.x,P.y);ctx.rotate(P.dir);
  ctx.globalAlpha=blink?0.45:1;
  const pa=G.t*30;
  ctx.strokeStyle='rgba(220,235,255,0.7)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-r*1.65,Math.sin(pa)*r*0.5);ctx.lineTo(-r*1.65,-Math.sin(pa)*r*0.5);ctx.stroke();
  ctx.fillStyle='#b3833f';ctx.beginPath();ctx.moveTo(-r*0.7,0);ctx.lineTo(-r*1.5,-r*0.8);ctx.lineTo(-r*1.5,r*0.2);ctx.closePath();ctx.fill();
  const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#f2ca78');g.addColorStop(0.5,'#c9953f');g.addColorStop(1,'#6e4a1c');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r*1.55,r*0.85,0,0,TAU);ctx.fill();
  ctx.strokeStyle='rgba(60,35,10,0.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r*1.1,0);ctx.lineTo(r*1.1,0);ctx.stroke();
  ctx.fillStyle='#0b2a3c';ctx.beginPath();ctx.arc(r*0.2,-r*0.1,r*0.36,0,TAU);ctx.fill();
  ctx.strokeStyle='#f6dfa8';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='rgba(130,230,255,0.75)';ctx.beginPath();ctx.arc(r*0.12,-r*0.2,r*0.15,0,TAU);ctx.fill();
  ctx.restore();
  ctx.save();ctx.translate(P.x,P.y);ctx.rotate(P.aim);ctx.globalAlpha=blink?0.45:1;
  ctx.fillStyle='#8a6a34';ctx.beginPath();ctx.arc(r*0.55,0,r*0.3,0,TAU);ctx.fill();
  ctx.fillStyle='#fff3cf';ctx.beginPath();ctx.arc(r*0.9,0,r*0.3,0,TAU);ctx.fill();
  ctx.restore();ctx.globalAlpha=1;
}
