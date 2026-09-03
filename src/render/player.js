// ---------- render: the player's vessel ----------
import {ctx} from './canvas.js';
import {G,P} from '../game/state.js';
import {TAU} from '../util.js';

export function drawPlayer(){
  const r=P.r,blink=P.inv>0&&Math.floor(G.t*20)%2===0,dart=P.vessel==='dart';
  ctx.save();ctx.translate(P.x,P.y);ctx.rotate(P.dir);
  ctx.globalAlpha=blink?0.45:1;
  const pa=G.t*30;
  // propeller
  ctx.strokeStyle='rgba(220,235,255,0.7)';ctx.lineWidth=2;
  const tail=dart?r*2.0:r*1.65;
  ctx.beginPath();ctx.moveTo(-tail,Math.sin(pa)*r*0.5);ctx.lineTo(-tail,-Math.sin(pa)*r*0.5);ctx.stroke();
  if(dart){
    // the Dart: slim silver hull, swept fin, teal trim
    ctx.fillStyle='#6f93a8';ctx.beginPath();ctx.moveTo(-r*0.9,0);ctx.lineTo(-r*1.9,-r*0.9);ctx.lineTo(-r*1.7,r*0.15);ctx.closePath();ctx.fill();
    const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#e4f4ff');g.addColorStop(0.5,'#8fb9cf');g.addColorStop(1,'#2f5468');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r*1.95,r*0.62,0,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(62,242,208,0.6)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-r*1.5,0);ctx.lineTo(r*1.4,0);ctx.stroke();
    ctx.fillStyle='#0b2a3c';ctx.beginPath();ctx.ellipse(r*0.35,-r*0.08,r*0.42,r*0.26,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#d8f3ff';ctx.lineWidth=1.3;ctx.stroke();
    ctx.fillStyle='rgba(130,230,255,0.75)';ctx.beginPath();ctx.arc(r*0.28,-r*0.15,r*0.12,0,TAU);ctx.fill();
  }else{
    // the Bathyscaphe: round brass hull
    ctx.fillStyle='#b3833f';ctx.beginPath();ctx.moveTo(-r*0.7,0);ctx.lineTo(-r*1.5,-r*0.8);ctx.lineTo(-r*1.5,r*0.2);ctx.closePath();ctx.fill();
    const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'#f2ca78');g.addColorStop(0.5,'#c9953f');g.addColorStop(1,'#6e4a1c');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r*1.55,r*0.85,0,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(60,35,10,0.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r*1.1,0);ctx.lineTo(r*1.1,0);ctx.stroke();
    ctx.fillStyle='#0b2a3c';ctx.beginPath();ctx.arc(r*0.2,-r*0.1,r*0.36,0,TAU);ctx.fill();
    ctx.strokeStyle='#f6dfa8';ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle='rgba(130,230,255,0.75)';ctx.beginPath();ctx.arc(r*0.12,-r*0.2,r*0.15,0,TAU);ctx.fill();
  }
  ctx.restore();
  // searchlight head, turned with the aim
  ctx.save();ctx.translate(P.x,P.y);ctx.rotate(P.aim);ctx.globalAlpha=blink?0.45:1;
  ctx.fillStyle=dart?'#4f7386':'#8a6a34';ctx.beginPath();ctx.arc(r*0.55,0,r*0.3,0,TAU);ctx.fill();
  ctx.fillStyle='#fff3cf';ctx.beginPath();ctx.arc(r*0.9,0,r*0.3,0,TAU);ctx.fill();
  ctx.restore();ctx.globalAlpha=1;
}
