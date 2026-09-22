// ---------- render: the guardians ----------
// The four old guardians (giant squid, Kraken, queen, Leviathan, wreck) keep their drawings in creatures.js.
import {ctx} from './canvas.js';
import {G,P} from '../game/state.js';
import {TAU} from '../util.js';
import {drawSquid,drawAngler} from './creatures.js';
import {shShark,shCrust,shBlob,shHuman} from './creatures2.js';

const rgba=function(c,a){return 'rgba('+c+','+a+')';};
function oval(x,y,rx,ry,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,TAU);}
function tri(ax,ay,bx,by,cx,cy){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.closePath();}

function mine(e){
  const s=e.r,c=e.col,pul=0.5+0.5*Math.sin(G.t*5+e.seed),bob=Math.sin(G.t*1.2+e.seed)*0.1;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(bob);
  ctx.strokeStyle='rgba(120,130,140,0.8)';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(0,s*0.9);ctx.quadraticCurveTo(s*0.4,s*2,0,s*3.2);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(150,160,170,0.95)';ctx.lineWidth=s*0.12;ctx.lineCap='round';
  for(let k=0;k<10;k++){const a=k/10*TAU+0.3;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*0.9,Math.sin(a)*s*0.9);ctx.lineTo(Math.cos(a)*s*1.35,Math.sin(a)*s*1.35);ctx.stroke();
    ctx.fillStyle='rgba(255,'+Math.round(120+90*pul)+',90,0.95)';ctx.beginPath();ctx.arc(Math.cos(a)*s*1.38,Math.sin(a)*s*1.38,s*0.09,0,TAU);ctx.fill();}
  const g=ctx.createRadialGradient(-s*0.3,-s*0.3,s*0.1,0,0,s);g.addColorStop(0,'rgba(120,130,135,1)');g.addColorStop(1,'rgba(36,42,48,1)');
  ctx.fillStyle=g;ctx.strokeStyle=rgba(c,0.6);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(20,24,28,0.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,s,s*0.3,0,0,TAU);ctx.stroke();
  ctx.fillStyle='rgba(150,90,50,0.6)';for(let k=0;k<8;k++){ctx.beginPath();ctx.arc(Math.sin(k*2.1)*s*0.6,Math.cos(k*1.3)*s*0.6,s*0.1,0,TAU);ctx.fill();}
  ctx.restore();
}
function seal(e){
  const s=e.r,c=e.col,wag=Math.sin(G.t*4+e.seed)*0.25;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle=rgba(c,0.95);
  tri(-s*1.5,0,-s*2.3,-s*0.6+wag*s,-s*2.2,s*0.1+wag*s);ctx.fill();tri(-s*1.5,0,-s*2.3,s*0.6+wag*s,-s*2.2,-s*0.1+wag*s);ctx.fill();
  tri(s*0.3,-s*0.6,-s*0.3,-s*1.3,-s*0.5,-s*0.6);ctx.fill();tri(s*0.3,s*0.6,-s*0.3,s*1.3,-s*0.5,s*0.6);ctx.fill();
  ctx.beginPath();ctx.moveTo(s*1.3,0);ctx.quadraticCurveTo(s*0.9,-s*0.95,-s*0.2,-s*0.85);ctx.quadraticCurveTo(-s*1.4,-s*0.5,-s*1.7,0);ctx.quadraticCurveTo(-s*1.4,s*0.5,-s*0.2,s*0.85);ctx.quadraticCurveTo(s*0.9,s*0.95,s*1.3,0);ctx.fill();
  ctx.fillStyle='rgba(150,125,105,0.97)';oval(s*1.45,0,s*0.42,s*0.3+0.06*s*Math.sin(G.t*3),0);ctx.fill();   // the proboscis
  ctx.fillStyle='rgba(80,60,50,0.5)';for(let k=0;k<6;k++){ctx.beginPath();ctx.arc(-s*0.9+k*s*0.35,Math.sin(k*2)*s*0.4,s*0.09,0,TAU);ctx.fill();}
  ctx.fillStyle='#0a0808';ctx.beginPath();ctx.arc(s*0.95,-s*0.42,s*0.09,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.95,s*0.42,s*0.09,0,TAU);ctx.fill();
  ctx.restore();
}
function whale(e){
  const s=e.r,c=e.col,wag=Math.sin(G.t*2.2+e.seed)*0.18;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle=rgba(c,0.93);
  ctx.beginPath();ctx.moveTo(-s*2.0,wag*s);ctx.quadraticCurveTo(-s*2.6,-s*0.9+wag*s*2,-s*3.0,-s*0.75+wag*s*2);ctx.quadraticCurveTo(-s*2.6,wag*s*2,-s*3.0,s*0.75+wag*s*2);ctx.quadraticCurveTo(-s*2.6,s*0.9+wag*s*2,-s*2.0,wag*s);ctx.fill();
  tri(s*0.2,-s*0.6,-s*0.4,-s*1.15,-s*0.5,-s*0.55);ctx.fill();tri(s*0.2,s*0.6,-s*0.4,s*1.15,-s*0.5,s*0.55);ctx.fill();
  // the great square head is a third of the animal
  ctx.beginPath();ctx.moveTo(s*1.6,-s*0.55);ctx.quadraticCurveTo(s*1.85,0,s*1.6,s*0.55);ctx.quadraticCurveTo(s*0.4,s*0.85,-s*0.8,s*0.6);ctx.quadraticCurveTo(-s*1.8,s*0.3,-s*2.1,wag*s);ctx.quadraticCurveTo(-s*1.8,-s*0.3,-s*0.8,-s*0.6);ctx.quadraticCurveTo(s*0.4,-s*0.85,s*1.6,-s*0.55);ctx.fill();
  ctx.strokeStyle='rgba(120,130,150,0.55)';ctx.lineWidth=1.5;   // old scars, the marks of squid
  for(let k=0;k<7;k++){const x=s*1.3-k*s*0.4,y=Math.sin(k*2.7)*s*0.35;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-s*0.3,y+Math.cos(k)*s*0.18);ctx.stroke();}
  ctx.beginPath();ctx.arc(s*0.9,s*0.1,s*0.12,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(s*0.4,-s*0.3,s*0.09,0,TAU);ctx.stroke();
  ctx.fillStyle='rgba(120,190,230,0.5)';ctx.beginPath();ctx.arc(s*1.2,-s*0.15,s*0.07,0,TAU);ctx.fill();   // the blowhole, left of centre
  ctx.fillStyle='#0a0a12';ctx.beginPath();ctx.arc(s*0.55,-s*0.68,s*0.07,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.55,s*0.68,s*0.07,0,TAU);ctx.fill();
  ctx.restore();
}
function vents(e){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);
  ctx.fillStyle='rgba(20,10,6,0.92)';oval(0,s*0.3,s*2.0,s*0.9,0);ctx.fill();
  const stacks=[[-1.1,0.1,0.55],[0.0,-0.1,0.8],[1.0,0.2,0.6],[-0.4,0.55,0.4],[0.55,0.6,0.45]];
  for(let i=0;i<stacks.length;i++){const st=stacks[i],x=st[0]*s,y=st[1]*s,r=st[2]*s,pul=0.6+0.4*Math.sin(G.t*4+i*1.7);
    const g=ctx.createLinearGradient(x,y-r*2.4,x,y+r);g.addColorStop(0,'rgba(90,60,40,1)');g.addColorStop(1,'rgba(30,18,12,1)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-r,y+r*0.6);ctx.lineTo(x-r*0.55,y-r*2.2);ctx.lineTo(x+r*0.55,y-r*2.2);ctx.lineTo(x+r,y+r*0.6);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,'+Math.round(140+80*pul)+',70,'+(0.6+0.35*pul).toFixed(2)+')';oval(x,y-r*2.2,r*0.5,r*0.2,0);ctx.fill();
    for(let k=0;k<4;k++){const q=(G.t*0.5+k*0.25+i*0.13)%1;ctx.fillStyle='rgba(30,26,30,'+((1-q)*0.55).toFixed(2)+')';ctx.beginPath();ctx.arc(x+Math.sin(G.t*2+k+i)*r*0.5*q,y-r*2.2-q*s*1.6,r*(0.3+q*0.7),0,TAU);ctx.fill();}}
  // giant tube worms around the base: white tubes, red plumes
  for(let k=0;k<12;k++){const a=k/12*TAU,x=Math.cos(a)*s*1.5,y=s*0.3+Math.sin(a)*s*0.6,sw=Math.sin(G.t*2+k)*s*0.12;
    ctx.strokeStyle='rgba(235,235,225,0.9)';ctx.lineWidth=Math.max(2,s*0.09);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sw,y-s*0.55);ctx.stroke();
    ctx.fillStyle='rgba(220,40,50,0.95)';oval(x+sw,y-s*0.62,s*0.07,s*0.14,0);ctx.fill();}
  ctx.strokeStyle=rgba(c,0.5);ctx.lineWidth=1.5;oval(0,s*0.3,s*2.0,s*0.9,0);ctx.stroke();
  ctx.restore();
}
function turret(e){
  const s=e.r,c=e.col,aim=e.inkAim!==undefined?e.inkAim:Math.atan2(P.y-e.y,P.x-e.x);
  ctx.save();ctx.translate(e.x,e.y);
  ctx.fillStyle='rgba(40,48,54,0.97)';ctx.strokeStyle=rgba(c,0.55);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s*1.15,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(120,70,40,0.5)';for(let k=0;k<10;k++){ctx.beginPath();ctx.arc(Math.cos(k*1.9)*s*0.95,Math.sin(k*1.9)*s*0.95,s*0.1,0,TAU);ctx.fill();}
  ctx.rotate(aim);
  ctx.fillStyle='rgba(70,80,88,0.98)';ctx.strokeStyle='rgba(20,24,28,0.8)';
  for(let k=-1;k<=1;k++){const rec=e.at&&e.at[0].tell>0?-s*0.1:0;ctx.beginPath();ctx.rect(s*0.5+rec,k*s*0.36-s*0.09,s*1.7,s*0.18);ctx.fill();ctx.stroke();}
  ctx.fillStyle='rgba(86,96,104,0.98)';ctx.beginPath();ctx.moveTo(s*0.8,-s*0.65);ctx.lineTo(-s*0.6,-s*0.8);ctx.lineTo(-s*0.9,0);ctx.lineTo(-s*0.6,s*0.8);ctx.lineTo(s*0.8,s*0.65);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,170,90,'+(0.5+0.4*Math.sin(G.t*3)).toFixed(2)+')';ctx.beginPath();ctx.rect(s*0.35,-s*0.12,s*0.2,s*0.24);ctx.fill();
  ctx.restore();
}
function trash(e){
  const s=e.r,rot=G.t*0.25+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(rot);
  ctx.fillStyle='rgba(40,46,50,0.9)';ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.fill();
  const bits=['235,245,255','255,90,80','90,170,255','255,215,90','120,220,140','200,200,210'];
  for(let k=0;k<26;k++){const a=k*2.399,r=s*(0.25+((k*37)%60)/100),x=Math.cos(a)*r,y=Math.sin(a)*r,t=k%4;
    ctx.save();ctx.translate(x,y);ctx.rotate(k*1.3+Math.sin(G.t+k)*0.2);ctx.fillStyle=rgba(bits[k%6],t===0?0.45:0.85);
    if(t===0){ctx.beginPath();ctx.moveTo(-s*0.22,-s*0.2);ctx.lineTo(s*0.22,-s*0.2);ctx.lineTo(s*0.27,s*0.24);ctx.lineTo(-s*0.27,s*0.24);ctx.closePath();ctx.fill();}   // bag
    else if(t===1){ctx.beginPath();ctx.rect(-s*0.09,-s*0.17,s*0.18,s*0.34);ctx.fill();}                                                                     // can
    else if(t===2){oval(0,0,s*0.09,s*0.24,0);ctx.fill();ctx.beginPath();ctx.rect(-s*0.04,-s*0.33,s*0.08,s*0.1);ctx.fill();}                               // bottle
    else{ctx.beginPath();ctx.arc(0,0,s*0.14,0,TAU);ctx.fill();}                                                                                             // cup lid
    ctx.restore();}
  ctx.strokeStyle='rgba(120,200,180,0.5)';ctx.lineWidth=1;   // a ghost net holds it together
  for(let k=-4;k<=4;k++){ctx.beginPath();ctx.moveTo(k*s*0.24,-Math.sqrt(Math.max(0,1-k*k*0.0576))*s);ctx.lineTo(k*s*0.24,Math.sqrt(Math.max(0,1-k*k*0.0576))*s);ctx.moveTo(-Math.sqrt(Math.max(0,1-k*k*0.0576))*s,k*s*0.24);ctx.lineTo(Math.sqrt(Math.max(0,1-k*k*0.0576))*s,k*s*0.24);ctx.stroke();}
  ctx.restore();
}
function swarm(e){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);
  ctx.fillStyle='rgba(60,40,30,0.55)';ctx.beginPath();ctx.arc(0,0,s*1.2,0,TAU);ctx.fill();
  for(let k=0;k<46;k++){const a=k*2.399+G.t*(0.8+((k*7)%10)/10)*(k%2?1:-1),r=s*(0.2+((k*53)%110)/100),x=Math.cos(a)*r,y=Math.sin(a)*r*0.9;
    ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.fillStyle=rgba(c,0.9);oval(0,0,s*0.16,s*0.08,0);ctx.fill();ctx.restore();}
  ctx.fillStyle=rgba(c,1);ctx.rotate(e.ang);oval(0,0,s*0.55,s*0.32,0);ctx.fill();ctx.fillStyle='#1a0e08';ctx.beginPath();ctx.arc(s*0.35,-s*0.12,s*0.06,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.35,s*0.12,s*0.06,0,TAU);ctx.fill();
  ctx.restore();
}
function fault(e){
  const s=e.r,c=e.col,pul=0.6+0.4*Math.sin(G.t*3+e.seed);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.seed);
  ctx.lineJoin='round';ctx.lineCap='round';
  const pts=[];for(let k=-6;k<=6;k++)pts.push([k*s*0.42,Math.sin(k*1.9+e.seed)*s*0.35]);
  [[s*0.55,'rgba(12,6,4,0.95)'],[s*0.3,rgba(c,(0.45*pul).toFixed(2))],[s*0.12,'rgba(255,230,170,'+(0.85*pul).toFixed(2)+')']].forEach(function(l){
    ctx.strokeStyle=l[1];ctx.lineWidth=l[0];ctx.beginPath();pts.forEach(function(p,i){if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.stroke();});
  ctx.fillStyle='rgba(50,40,36,0.97)';ctx.strokeStyle=rgba(c,0.4);ctx.lineWidth=1;
  for(let k=0;k<9;k++){const x=(k-4)*s*0.6,y=(k%2?1:-1)*s*(0.55+0.2*Math.sin(k*3)),r=s*(0.18+0.1*Math.sin(k*5));ctx.beginPath();ctx.moveTo(x-r,y+r*0.6);ctx.lineTo(x-r*0.3,y-r);ctx.lineTo(x+r*0.8,y-r*0.4);ctx.lineTo(x+r,y+r*0.7);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
}
function snailking(e){
  const s=e.r,c=e.col,wag=Math.sin(G.t*3+e.seed)*0.3;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle=rgba(c,0.5);ctx.strokeStyle=rgba(c,0.85);ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(s*1.2,-s*0.3);ctx.quadraticCurveTo(s*0.3,-s*1.15,-s*1.0,-s*0.5);ctx.quadraticCurveTo(-s*2.2,-s*0.15+wag*s,-s*2.9,wag*s*1.5);ctx.quadraticCurveTo(-s*2.2,s*0.15+wag*s,-s*1.0,s*0.5);ctx.quadraticCurveTo(s*0.3,s*1.15,s*1.2,s*0.3);ctx.quadraticCurveTo(s*1.45,0,s*1.2,-s*0.3);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,170,190,0.45)';oval(-s*0.1,0,s*0.6,s*0.4,0);ctx.fill();   // you can see through it
  ctx.strokeStyle=rgba(c,0.5);for(let k=0;k<5;k++){ctx.beginPath();ctx.moveTo(s*0.2-k*s*0.2,-s*0.75+k*s*0.04);ctx.lineTo(s*0.0-k*s*0.2,-s*1.35);ctx.moveTo(s*0.2-k*s*0.2,s*0.75-k*s*0.04);ctx.lineTo(s*0.0-k*s*0.2,s*1.35);ctx.stroke();}
  ctx.fillStyle='rgba(255,220,120,0.95)';for(let k=-2;k<=2;k++){tri(s*0.95-Math.abs(k)*s*0.08,k*s*0.2-s*0.07,s*(1.5-Math.abs(k)*0.12),k*s*0.24,s*0.95-Math.abs(k)*s*0.08,k*s*0.2+s*0.07);ctx.fill();}
  ctx.fillStyle='#10121c';ctx.beginPath();ctx.arc(s*0.8,-s*0.5,s*0.07,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.8,s*0.5,s*0.07,0,TAU);ctx.fill();
  ctx.restore();
}
function rtg(e){
  const s=e.r,c=e.col,pul=0.5+0.5*Math.sin(G.t*2.4);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(G.t*0.3+e.seed);
  ctx.strokeStyle=rgba(c,(0.18+0.2*pul).toFixed(2));ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,150,0,TAU);ctx.stroke();   // the reach of its glow
  ctx.fillStyle='rgba(70,76,84,0.97)';for(let k=0;k<8;k++){ctx.save();ctx.rotate(k/8*TAU);ctx.beginPath();ctx.rect(s*0.5,-s*0.07,s*0.85,s*0.14);ctx.fill();ctx.restore();}
  const g=ctx.createRadialGradient(0,0,s*0.1,0,0,s*0.7);g.addColorStop(0,'rgba(230,255,235,1)');g.addColorStop(0.5,rgba(c,0.9));g.addColorStop(1,'rgba(40,60,50,1)');
  ctx.fillStyle=g;ctx.strokeStyle='rgba(20,26,30,0.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s*0.7,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(16,22,20,0.85)';for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,s*0.5,k*TAU/3,k*TAU/3+TAU/6);ctx.closePath();ctx.fill();}
  ctx.fillStyle=rgba(c,1);ctx.beginPath();ctx.arc(0,0,s*0.12,0,TAU);ctx.fill();
  ctx.restore();
}
function nautilus(e){
  const s=e.r,pa=G.t*24;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle='rgba(255,230,170,0.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-s*2.35,Math.sin(pa)*s*0.5);ctx.lineTo(-s*2.35,-Math.sin(pa)*s*0.5);ctx.stroke();
  ctx.fillStyle='rgba(96,72,38,0.98)';tri(-s*1.6,0,-s*2.3,-s*0.7,-s*2.0,0);ctx.fill();tri(-s*1.6,0,-s*2.3,s*0.7,-s*2.0,0);ctx.fill();
  const g=ctx.createLinearGradient(0,-s*0.7,0,s*0.7);g.addColorStop(0,'#e0b060');g.addColorStop(0.5,'#8a6428');g.addColorStop(1,'#3c2a10');
  ctx.fillStyle=g;ctx.strokeStyle='rgba(30,20,8,0.8)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(s*2.0,0);ctx.quadraticCurveTo(s*0.9,-s*0.78,-s*0.6,-s*0.62);ctx.quadraticCurveTo(-s*1.7,-s*0.35,-s*2.1,0);ctx.quadraticCurveTo(-s*1.7,s*0.35,-s*0.6,s*0.62);ctx.quadraticCurveTo(s*0.9,s*0.78,s*2.0,0);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(225,235,240,0.97)';tri(s*1.9,-s*0.1,s*3.0,0,s*1.9,s*0.1);ctx.fill();          // the steel spur
  ctx.strokeStyle='rgba(40,28,10,0.8)';ctx.lineWidth=s*0.1;ctx.beginPath();for(let k=0;k<9;k++){ctx.moveTo(s*1.3-k*s*0.35,-s*0.12);ctx.lineTo(s*1.15-k*s*0.35,s*0.12);}ctx.stroke();   // the saw-toothed ridge
  for(let k=0;k<4;k++){const pul=0.6+0.4*Math.sin(G.t*2+k);ctx.fillStyle='rgba(255,235,150,'+pul.toFixed(2)+')';ctx.beginPath();ctx.arc(s*0.9-k*s*0.55,-s*0.4,s*0.1,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.9-k*s*0.55,s*0.4,s*0.1,0,TAU);ctx.fill();}
  ctx.fillStyle='rgba(180,240,255,0.85)';oval(s*1.0,0,s*0.22,s*0.16,0);ctx.fill();   // the salon window
  ctx.restore();
}
// A neck of curved segments from a rooted body to a head: Scylla's six, the Hydra's seven
function multineck(e,heads,dog){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);
  ctx.fillStyle=dog?'rgba(40,34,50,0.97)':'rgba(24,54,28,0.97)';ctx.strokeStyle=rgba(c,0.6);ctx.lineWidth=2;
  ctx.beginPath();for(let k=0;k<=14;k++){const a=k/14*TAU,l=s*(1.0+0.16*Math.sin(k*2.3+e.seed));if(k)ctx.lineTo(Math.cos(a)*l*1.15,Math.sin(a)*l*0.85);else ctx.moveTo(Math.cos(a)*l*1.15,Math.sin(a)*l*0.85);}ctx.closePath();ctx.fill();ctx.stroke();
  ctx.restore();
  const toP=Math.atan2(P.y-e.y,P.x-e.x);
  for(let i=0;i<heads;i++){
    const lu=e.lunges&&e.lunges.find(function(l){return l.i===i;});
    let hx,hy;
    if(lu){const k=lu.t<lu.tell?0.25*lu.t/lu.tell:Math.max(0,1-(lu.t-lu.tell)/0.5),kk=lu.t<lu.tell?k:Math.max(k,0.25);hx=e.x+(lu.x-e.x)*(lu.t>=lu.tell?kk:k);hy=e.y+(lu.y-e.y)*(lu.t>=lu.tell?kk:k);if(lu.t>=lu.tell&&lu.t<lu.tell+0.12){hx=lu.x;hy=lu.y;}}
    else{const a=toP+(i-(heads-1)/2)*0.42+Math.sin(G.t*1.3+i*1.7)*0.18,l=s*(1.9+0.3*Math.sin(G.t*2+i));hx=e.x+Math.cos(a)*l;hy=e.y+Math.sin(a)*l;}
    const bx=e.x+Math.cos(toP+(i-(heads-1)/2)*0.5)*s*0.7,by=e.y+Math.sin(toP+(i-(heads-1)/2)*0.5)*s*0.6;
    const mx=(bx+hx)/2+Math.sin(G.t*2+i*2)*s*0.35,my=(by+hy)/2+Math.cos(G.t*1.7+i)*s*0.35;
    ctx.strokeStyle=rgba(c,0.85);ctx.lineWidth=s*0.3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(mx,my,hx,hy);ctx.stroke();
    const ha=Math.atan2(hy-my,hx-mx);
    ctx.save();ctx.translate(hx,hy);ctx.rotate(ha);
    ctx.fillStyle=rgba(c,0.98);
    if(dog){ctx.beginPath();ctx.moveTo(s*0.75,0);ctx.lineTo(s*0.1,-s*0.32);ctx.lineTo(-s*0.3,-s*0.28);ctx.lineTo(-s*0.3,s*0.28);ctx.lineTo(s*0.1,s*0.32);ctx.closePath();ctx.fill();tri(-s*0.2,-s*0.26,-s*0.45,-s*0.55,-s*0.02,-s*0.3);ctx.fill();tri(-s*0.2,s*0.26,-s*0.45,s*0.55,-s*0.02,s*0.3);ctx.fill();}
    else{ctx.beginPath();ctx.moveTo(s*0.7,0);ctx.quadraticCurveTo(s*0.3,-s*0.4,-s*0.3,-s*0.3);ctx.lineTo(-s*0.3,s*0.3);ctx.quadraticCurveTo(s*0.3,s*0.4,s*0.7,0);ctx.fill();
      ctx.strokeStyle='rgba(255,90,90,0.9)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s*0.7,0);ctx.lineTo(s*0.95,Math.sin(G.t*14+i)*s*0.08);ctx.stroke();}
    ctx.fillStyle='rgba(255,230,120,0.97)';ctx.beginPath();ctx.arc(s*0.15,-s*0.15,s*0.07,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.15,s*0.15,s*0.07,0,TAU);ctx.fill();
    ctx.restore();
  }
}
function plesio(e){
  const s=e.r,c=e.col,b=e.body||[],tail=b.length?b[b.length-1]:{x:e.x-s*3,y:e.y};
  // neck along the trail, torso and flippers where the trail ends
  ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=b.length-1;i>0;i--){const k=i/b.length;ctx.strokeStyle=rgba(c,0.92);ctx.lineWidth=s*(0.45+k*0.55);ctx.beginPath();ctx.moveTo(b[i].x,b[i].y);ctx.lineTo(b[i-1].x,b[i-1].y);ctx.stroke();}
  const pa=b.length>3?Math.atan2(b[b.length-4].y-tail.y,b[b.length-4].x-tail.x):e.ang,fl=Math.sin(G.t*3+e.seed)*0.5;
  ctx.save();ctx.translate(tail.x,tail.y);ctx.rotate(pa);ctx.fillStyle=rgba(c,0.95);
  [[0.7,1],[0.7,-1],[-0.8,1],[-0.8,-1]].forEach(function(q){ctx.save();ctx.translate(q[0]*s,q[1]*s*0.7);ctx.rotate(q[1]*(1.0+fl*(q[0]>0?1:-1)));oval(s*0.9,0,s*1.0,s*0.3,0);ctx.fill();ctx.restore();});
  oval(0,0,s*1.7,s*1.0,0);ctx.fill();tri(-s*1.5,0,-s*2.8,-s*0.2,-s*2.8,s*0.2);ctx.fill();
  ctx.restore();
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);ctx.fillStyle=rgba(c,1);
  ctx.beginPath();ctx.moveTo(s*1.3,0);ctx.quadraticCurveTo(s*0.5,-s*0.55,-s*0.4,-s*0.45);ctx.lineTo(-s*0.4,s*0.45);ctx.quadraticCurveTo(s*0.5,s*0.55,s*1.3,0);ctx.fill();
  ctx.fillStyle='#f4fbff';for(let k=0;k<5;k++){tri(s*(1.1-k*0.2),-s*0.12,s*(1.05-k*0.2),-s*0.34,s*(0.98-k*0.2),-s*0.13);ctx.fill();tri(s*(1.1-k*0.2),s*0.12,s*(1.05-k*0.2),s*0.34,s*(0.98-k*0.2),s*0.13);ctx.fill();}
  ctx.fillStyle='#ffd94a';ctx.beginPath();ctx.arc(s*0.2,-s*0.3,s*0.1,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.2,s*0.3,s*0.1,0,TAU);ctx.fill();
  ctx.restore();
}
function cthulhu(e){
  const s=e.r,c=e.col,ph=G.t*1.6+e.seed;
  ctx.save();ctx.translate(e.x,e.y);
  ctx.fillStyle='rgba(16,44,30,0.9)';const fl=Math.sin(ph)*0.12;
  [-1,1].forEach(function(d){ctx.beginPath();ctx.moveTo(d*s*0.4,-s*0.6);ctx.quadraticCurveTo(d*s*2.2,-s*(1.9+fl),d*s*2.6,-s*0.2);ctx.quadraticCurveTo(d*s*2.0,s*0.2,d*s*1.7,s*0.9);ctx.quadraticCurveTo(d*s*1.2,s*0.3,d*s*0.5,s*0.4);ctx.closePath();ctx.fill();});
  ctx.fillStyle='rgba(28,70,44,0.98)';ctx.strokeStyle=rgba(c,0.6);ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-s*0.95,-s*0.5);ctx.quadraticCurveTo(-s*1.2,s*0.9,-s*0.7,s*1.5);ctx.lineTo(s*0.7,s*1.5);ctx.quadraticCurveTo(s*1.2,s*0.9,s*0.95,-s*0.5);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.lineCap='round';ctx.strokeStyle='rgba(40,96,60,0.98)';
  for(let k=0;k<7;k++){const x0=(k-3)*s*0.17;ctx.lineWidth=s*0.16;ctx.beginPath();ctx.moveTo(x0,-s*0.75);ctx.quadraticCurveTo(x0*1.6+Math.sin(ph*1.5+k)*s*0.3,-s*0.1,x0*2.0+Math.sin(ph+k*1.3)*s*0.4,s*(0.55+0.15*Math.sin(ph*2+k)));ctx.stroke();}
  ctx.fillStyle='rgba(40,96,60,0.99)';oval(0,-s*1.05,s*0.75,s*0.62,0);ctx.fill();
  ctx.fillStyle='rgba(255,80,60,'+(0.75+0.25*Math.sin(G.t*3)).toFixed(2)+')';oval(-s*0.3,-s*1.05,s*0.15,s*0.07,0.3);ctx.fill();oval(s*0.3,-s*1.05,s*0.15,s*0.07,-0.3);ctx.fill();
  ctx.restore();
}
function cerberus(e){
  const s=e.r,c=e.col,wag=Math.sin(G.t*6+e.seed)*0.3;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle='rgba(60,180,90,0.9)';ctx.lineWidth=s*0.16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s*1.2,0);ctx.quadraticCurveTo(-s*1.9,wag*s,-s*2.5,wag*s*1.6);ctx.stroke();   // the tail is a snake
  ctx.fillStyle='rgba(78,34,26,0.98)';ctx.strokeStyle=rgba(c,0.85);ctx.lineWidth=2.5;
  [[-0.7,1],[-0.7,-1],[0.4,1],[0.4,-1]].forEach(function(q,i){ctx.save();ctx.translate(q[0]*s,q[1]*s*0.7);ctx.rotate(q[1]*0.4+Math.sin(G.t*9+i*1.6)*0.35);oval(s*0.35,q[1]*s*0.25,s*0.55,s*0.2,0);ctx.fill();ctx.restore();});
  oval(-s*0.2,0,s*1.25,s*0.85,0);ctx.fill();ctx.stroke();
  for(let k=-1;k<=1;k++){ctx.save();ctx.translate(s*0.8,k*s*0.55);ctx.rotate(k*0.45+Math.sin(G.t*3+k*2)*0.12);
    ctx.fillStyle='rgba(96,42,30,0.99)';ctx.beginPath();ctx.moveTo(s*1.15,0);ctx.lineTo(s*0.45,-s*0.36);ctx.lineTo(-s*0.1,-s*0.34);ctx.lineTo(-s*0.1,s*0.34);ctx.lineTo(s*0.45,s*0.36);ctx.closePath();ctx.fill();
    tri(0,-s*0.3,-s*0.3,-s*0.62,s*0.22,-s*0.34);ctx.fill();tri(0,s*0.3,-s*0.3,s*0.62,s*0.22,s*0.34);ctx.fill();
    ctx.fillStyle='rgba(255,'+Math.round(120+80*Math.sin(G.t*5+k))+',40,0.97)';ctx.beginPath();ctx.arc(s*0.45,-s*0.16,s*0.07,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.45,s*0.16,s*0.07,0,TAU);ctx.fill();
    ctx.fillStyle='#f4ead0';tri(s*1.1,-s*0.05,s*0.95,-s*0.2,s*0.9,-s*0.04);ctx.fill();tri(s*1.1,s*0.05,s*0.95,s*0.2,s*0.9,s*0.04);ctx.fill();
    ctx.restore();}
  ctx.restore();
}
function charon(e){
  const s=e.r,f=P.x<e.x?-1:1,bob=Math.sin(G.t*1.5+e.seed)*s*0.08;
  ctx.save();ctx.translate(e.x,e.y+bob);ctx.scale(f,1);
  ctx.fillStyle='rgba(22,18,28,0.98)';ctx.strokeStyle='rgba(190,200,255,0.5)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-s*2.2,s*0.2);ctx.quadraticCurveTo(-s*2.4,-s*0.5,-s*1.9,-s*0.9);ctx.quadraticCurveTo(-s*1.7,s*0.4,0,s*0.5);ctx.quadraticCurveTo(s*1.7,s*0.4,s*2.0,-s*0.7);ctx.quadraticCurveTo(s*2.4,-s*0.2,s*2.0,s*0.4);ctx.quadraticCurveTo(0,s*1.3,-s*2.2,s*0.2);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,210,120,'+(0.7+0.3*Math.sin(G.t*4)).toFixed(2)+')';ctx.beginPath();ctx.arc(s*2.0,-s*1.0,s*0.16,0,TAU);ctx.fill();   // the lantern on the prow
  ctx.restore();
  shHuman({x:e.x-f*s*0.3,y:e.y-s*0.75+bob,r:s*0.5,col:e.col,seed:e.seed,mode:0},{skin:'dark',robe:1,weapon:'oar'});
}

function boss(shape){return function(e){shape(e);};}
const BOSS={mine:mine,seal:seal,whale:whale,vents:vents,turret:turret,trash:trash,swarm:swarm,fault:fault,snailking:snailking,rtg:rtg,nautilus:nautilus,
  plesio:plesio,cthulhu:cthulhu,cerberus:cerberus,charon:charon,
  squidboss:function(e){drawSquid(e);},anglerboss:function(e){drawAngler(e);},
  rust:function(e){shBlob(e,{rust:1});},
  titan:function(e){shCrust(e,{segs:8,legs:7,flat:1,claws:1});},
  scylla:function(e){multineck(e,6,true);},hydra:function(e){multineck(e,7,false);},
  colossus:function(e){shHuman(e,{skin:'bronze',weapon:'spear',shield:1,crest:1},0.62);},
  poseidon:function(e){shHuman(e,{skin:'sea',tail:1,weapon:'trident',crown:1,beard:1},0.7);},
  hades:function(e){shHuman(e,{skin:'dark',robe:1,weapon:'bident',helm:1},0.72);}};
export function drawBossShape(e,def){
  const f=BOSS[def.shape];if(!f)return false;
  if(e.cloak>0){ctx.globalAlpha=0.12+0.08*Math.sin(G.t*12);f(e);ctx.globalAlpha=1;}else f(e);
  return true;
}
// Warnings a guardian gives before it strikes: the line of a ram, the reach of a lash
export function drawBossTells(e){
  if(e.chargeAim!==undefined){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.chargeAim);ctx.strokeStyle='rgba(255,210,170,0.7)';ctx.lineWidth=e.boss?3:2;ctx.setLineDash([10,9]);ctx.beginPath();ctx.moveTo(e.r+6,0);ctx.lineTo(e.r+(e.chargeLen||300),0);ctx.stroke();ctx.restore();}
  if(e.stingWarn){const w=e.stingWarn;w.t+=1/60;ctx.strokeStyle='rgba(255,170,200,'+(0.35+0.4*Math.abs(Math.sin(G.t*14))).toFixed(2)+')';ctx.lineWidth=2;ctx.setLineDash([6,7]);ctx.beginPath();ctx.arc(e.x,e.y,w.r,0,TAU);ctx.stroke();ctx.setLineDash([]);}
  if(e.pullT>0){ctx.strokeStyle='rgba(200,220,255,0.25)';ctx.lineWidth=1.5;for(let k=0;k<3;k++){const q=((G.t*0.9+k/3)%1);ctx.beginPath();ctx.arc(e.x,e.y,e.pullR*(1-q),0,TAU);ctx.stroke();}}
}
