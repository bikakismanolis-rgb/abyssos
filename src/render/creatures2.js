// ---------- render: creature families ----------
// A creature with a `shape` in config.js ET is drawn by one of these families, tuned by its `sp`
// parameters, so a new creature is usually a line of data and not a new drawing.
// Bodies that swim are turned by e.ang; figures with a head and arms stay upright and face the vessel.
import {ctx} from './canvas.js';
import {G,P} from '../game/state.js';
import {TAU} from '../util.js';
import {drawEel} from './creatures.js';

const rgba=function(c,a){return 'rgba('+c+','+a+')';};
function oval(x,y,rx,ry,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,TAU);}
function tri(ax,ay,bx,by,cx,cy){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.closePath();}

// ---------- fish of every proportion ----------
function shFish(e,sp){
  const s=e.r,L=s*(sp.len||1.4),T=s*(sp.tall||0.6),wag=Math.sin(G.t*12+e.seed)*0.35,c=e.col;
  const body=sp.dark?'rgba(16,18,34,0.97)':sp.metal?'rgba(132,102,52,0.97)':rgba(c,sp.pale?0.55:0.92);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  if(sp.spines){ctx.strokeStyle=rgba(c,0.8);ctx.lineWidth=1.3;for(let k=0;k<sp.spines;k++){const a=-2.4+k*(4.8/(sp.spines-1)),l=s*(1.5+0.25*Math.sin(G.t*3+k+e.seed));ctx.beginPath();ctx.moveTo(Math.cos(a)*T*0.6,Math.sin(a)*T*0.6);ctx.lineTo(Math.cos(a)*l-s*0.3,Math.sin(a)*l);ctx.stroke();}}
  if(sp.rays){ctx.strokeStyle=rgba(c,0.6);ctx.lineWidth=1;[[-0.2,1],[0.4,1],[-L*0.9/s,0.2]].forEach(function(r,i){ctx.beginPath();ctx.moveTo(r[0]*s,0);ctx.lineTo(r[0]*s-s*0.4,(i<2?(i?1:-1):0.2)*s*2.2);ctx.stroke();});}
  ctx.fillStyle=body;
  if(sp.taper){ctx.beginPath();ctx.moveTo(L*0.5,-T*0.2);ctx.quadraticCurveTo(-L*0.2,-T*0.9,-L*1.25,wag*s*0.6);ctx.quadraticCurveTo(-L*0.2,T*0.9,L*0.5,T*0.2);ctx.closePath();ctx.fill();}
  else{tri(-L*0.7,0,-L*1.3,-T*1.15+wag*s,-L*1.3,T*1.15+wag*s);ctx.fill();}
  if(sp.sail){ctx.fillStyle=rgba(c,0.45);tri(L*0.3,-T*0.5,-L*0.3,-T*2.3,-L*0.55,-T*0.5);ctx.fill();ctx.fillStyle=body;}
  if(sp.keel){tri(L*0.1,T*0.6,-L*0.2,T*1.5,-L*0.6,T*0.4);ctx.fill();}
  oval(0,0,L*0.9,T,0);ctx.fill();
  if(sp.blunt){oval(L*0.62,0,T*0.75,T*0.92,0);ctx.fill();}
  if(sp.sword){ctx.strokeStyle=rgba(c,0.95);ctx.lineWidth=Math.max(1.5,s*0.12);ctx.beginPath();ctx.moveTo(L*0.8,0);ctx.lineTo(L*0.8+s*sp.sword*1.4,0);ctx.stroke();}
  if(sp.metal){ctx.strokeStyle='rgba(255,225,150,0.7)';ctx.lineWidth=1;oval(0,0,L*0.9,T,0);ctx.stroke();ctx.fillStyle='rgba(255,230,170,0.85)';for(let k=-2;k<=2;k++){ctx.beginPath();ctx.arc(k*L*0.28,0,s*0.08,0,TAU);ctx.fill();}}
  if(sp.prop){ctx.strokeStyle='rgba(255,230,170,0.8)';ctx.lineWidth=1.5;const pa=G.t*26;ctx.beginPath();ctx.moveTo(-L*1.32,Math.sin(pa)*T);ctx.lineTo(-L*1.32,-Math.sin(pa)*T);ctx.stroke();}
  if(sp.stripes){ctx.strokeStyle=sp.dark?rgba(c,0.5):'rgba(10,20,34,0.45)';ctx.lineWidth=Math.max(1,s*0.12);for(let k=0;k<sp.stripes;k++){const x=L*0.55-k*(L*1.2/sp.stripes),h=T*Math.sqrt(Math.max(0,1-(x/(L*0.9))*(x/(L*0.9))));ctx.beginPath();ctx.moveTo(x,-h*0.85);ctx.lineTo(x-s*0.15,h*0.85);ctx.stroke();}}
  if(!sp.dark&&!sp.metal){ctx.fillStyle='rgba(255,255,255,0.3)';oval(L*0.05,-T*0.3,L*0.5,T*0.3,0);ctx.fill();}
  if(sp.dots){for(let k=0;k<sp.dots;k++){const pul=0.55+0.45*Math.sin(G.t*5+k+e.seed);ctx.fillStyle=rgba(c,pul.toFixed(2));ctx.beginPath();ctx.arc(L*0.5-k*(L*1.1/sp.dots),T*0.45,Math.max(1,s*0.11),0,TAU);ctx.fill();}}
  if(sp.teeth){ctx.fillStyle='#eef6ff';const n=sp.teeth>1?5:4,tl=s*(sp.teeth>1?0.42:0.24);for(let k=0;k<n;k++){const x=L*0.85-k*s*0.22;tri(x,T*0.05,x-s*0.07,T*0.05+tl,x-s*0.16,T*0.05);ctx.fill();tri(x-s*0.1,-T*0.05,x-s*0.17,-T*0.05-tl*0.8,x-s*0.26,-T*0.05);ctx.fill();}}
  if(sp.barbel){ctx.strokeStyle='rgba(255,90,90,0.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L*0.7,T*0.4);ctx.quadraticCurveTo(L*0.9,T*2,L*0.5,T*2.6);ctx.stroke();ctx.fillStyle='rgba(255,120,120,0.95)';ctx.beginPath();ctx.arc(L*0.5,T*2.6,s*0.16,0,TAU);ctx.fill();}
  if(sp.eye!==0){const er=s*(sp.eye||0.16);ctx.fillStyle=sp.dark?rgba(c,0.95):'#04101b';ctx.beginPath();ctx.arc(L*0.55,-T*0.2,er,0,TAU);ctx.fill();if(sp.eye>0.2){ctx.fillStyle='rgba(255,255,255,0.7)';ctx.beginPath();ctx.arc(L*0.58,-T*0.26,er*0.35,0,TAU);ctx.fill();}}
  ctx.restore();
}
// ---------- sharks and other torpedo bodies, seen from above ----------
export function shShark(e,sp){
  const s=e.r,c=e.col,wag=Math.sin(G.t*(sp.old?3:7)+e.seed)*0.3;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle=rgba(c,0.95);
  // tail, pectoral fins, body
  ctx.beginPath();ctx.moveTo(-s*1.5,0);ctx.lineTo(-s*2.5,-s*0.9+wag*s);ctx.lineTo(-s*2.1,wag*s*0.5);ctx.lineTo(-s*2.5,s*0.9+wag*s);ctx.closePath();ctx.fill();
  tri(s*0.5,-s*0.45,-s*0.5,-s*1.5,-s*0.3,-s*0.45);ctx.fill();tri(s*0.5,s*0.45,-s*0.5,s*1.5,-s*0.3,s*0.45);ctx.fill();
  ctx.beginPath();ctx.moveTo(s*(1.9+(sp.snout||0)),0);ctx.quadraticCurveTo(s*0.9,-s*0.78,-s*0.4,-s*0.6);ctx.quadraticCurveTo(-s*1.3,-s*0.3,-s*1.7,0);ctx.quadraticCurveTo(-s*1.3,s*0.3,-s*0.4,s*0.6);ctx.quadraticCurveTo(s*0.9,s*0.78,s*(1.9+(sp.snout||0)),0);ctx.fill();
  ctx.fillStyle='rgba(8,18,30,0.5)';tri(s*0.1,0,-s*0.9,-s*0.12,-s*0.9,s*0.12);ctx.fill();          // dorsal fin
  if(sp.stripes){ctx.strokeStyle='rgba(30,40,30,0.55)';ctx.lineWidth=s*0.12;for(let k=0;k<sp.stripes;k++){const x=s*0.9-k*s*0.36;ctx.beginPath();ctx.moveTo(x,-s*0.5);ctx.lineTo(x-s*0.12,-s*0.12);ctx.moveTo(x,s*0.5);ctx.lineTo(x-s*0.12,s*0.12);ctx.stroke();}}
  if(sp.old){ctx.fillStyle='rgba(60,70,70,0.5)';for(let k=0;k<9;k++){ctx.beginPath();ctx.arc(Math.sin(k*2.3+e.seed)*s*1.1,Math.cos(k*1.7+e.seed)*s*0.4,s*0.1,0,TAU);ctx.fill();}}
  const er=s*(sp.eye||0.1);ctx.fillStyle=sp.old?'rgba(210,230,235,0.9)':'#04101b';
  ctx.beginPath();ctx.arc(s*1.15,-s*0.42,er,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*1.15,s*0.42,er,0,TAU);ctx.fill();
  ctx.restore();
}
function shGulper(e){
  const s=e.r,c=e.col,open=0.55+0.35*Math.sin(G.t*2+e.seed)+(e.mode===2?0.5:0);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle=rgba(c,0.8);ctx.lineCap='round';
  for(let i=0;i<8;i++){ctx.lineWidth=Math.max(1,s*(0.5-i*0.055));const w1=Math.sin(G.t*6+e.seed-i*0.6)*s*0.3*i/8,w2=Math.sin(G.t*6+e.seed-(i+1)*0.6)*s*0.3*(i+1)/8;ctx.beginPath();ctx.moveTo(-s*0.5-i*s*0.45,w1);ctx.lineTo(-s*0.5-(i+1)*s*0.45,w2);ctx.stroke();}
  ctx.fillStyle='rgba(18,14,40,0.97)';ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,0,s*1.25,open,TAU-open);ctx.lineTo(-s*0.1,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=rgba(c,0.95);ctx.beginPath();ctx.arc(s*0.2,-s*0.95,s*0.12,0,TAU);ctx.fill();
  ctx.restore();
}
function shVampire(e){
  const s=e.r,c=e.col,ph=G.t*3+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle='rgba(60,10,24,0.92)';ctx.strokeStyle=rgba(c,0.8);ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-s*0.2,-s*0.8);for(let k=0;k<=8;k++){const a=-1.1+k*0.275,l=s*(2.1+0.2*Math.sin(ph+k));ctx.lineTo(-Math.cos(a)*l,Math.sin(a)*l*0.9);}ctx.lineTo(-s*0.2,s*0.8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=rgba(c,0.9);for(let k=0;k<=8;k+=2){const a=-1.1+k*0.275,l=s*2.1;ctx.beginPath();ctx.arc(-Math.cos(a)*l,Math.sin(a)*l*0.9,s*0.1,0,TAU);ctx.fill();}
  ctx.fillStyle='rgba(90,16,34,0.97)';oval(s*0.5,0,s*1.1,s*0.8,0);ctx.fill();ctx.stroke();
  tri(s*0.9,-s*0.6,s*0.3,-s*1.35,s*0.2,-s*0.6);ctx.fill();tri(s*0.9,s*0.6,s*0.3,s*1.35,s*0.2,s*0.6);ctx.fill();
  ctx.fillStyle='rgba(150,220,255,0.95)';ctx.beginPath();ctx.arc(s*0.1,-s*0.4,s*0.17,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.1,s*0.4,s*0.17,0,TAU);ctx.fill();
  ctx.restore();
}
// ---------- crustaceans: isopods, amphipods, the titan ----------
export function shCrust(e,sp){
  const s=e.r,c=e.col,n=sp.segs||6,ph=G.t*10+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle=rgba(c,0.6);ctx.lineWidth=Math.max(1,s*0.08);ctx.lineCap='round';
  for(let k=0;k<(sp.legs||5);k++){const x=s*0.7-k*s*1.6/(sp.legs||5),w=Math.sin(ph+k)*s*0.2;
    ctx.beginPath();ctx.moveTo(x,-s*0.4);ctx.lineTo(x-s*0.2+w,-s*(sp.flat?1.25:1.0));ctx.moveTo(x,s*0.4);ctx.lineTo(x-s*0.2-w,s*(sp.flat?1.25:1.0));ctx.stroke();}
  ctx.beginPath();ctx.moveTo(s*0.9,-s*0.2);ctx.quadraticCurveTo(s*1.6,-s*0.9,s*2.1,-s*0.5+Math.sin(ph*0.3)*s*0.2);ctx.moveTo(s*0.9,s*0.2);ctx.quadraticCurveTo(s*1.6,s*0.9,s*2.1,s*0.5+Math.cos(ph*0.3)*s*0.2);ctx.stroke();
  ctx.fillStyle=rgba(c,0.93);ctx.strokeStyle='rgba(20,14,10,0.45)';ctx.lineWidth=1;
  for(let k=n-1;k>=0;k--){const u=k/(n-1),x=s*1.0-u*s*2.1,curl=sp.curl?u*u*s*0.7:0,w=s*(sp.flat?0.95:0.62)*Math.sin(Math.PI*(0.18+u*0.72));
    oval(x,curl,s*0.42,Math.max(s*0.2,w),sp.curl?u*0.5:0);ctx.fill();ctx.stroke();}
  if(sp.claws){ctx.fillStyle=rgba(c,1);[-1,1].forEach(function(d){const snap=Math.abs(Math.sin(G.t*2+e.seed))*0.35;ctx.save();ctx.translate(s*1.0,d*s*0.75);ctx.rotate(d*-0.5);
      tri(0,0,s*1.2,-s*(0.12+snap),s*0.3,-s*0.4);ctx.fill();tri(0,0,s*1.2,s*(0.12+snap),s*0.3,s*0.4);ctx.fill();ctx.restore();});}
  ctx.fillStyle='#160c0a';ctx.beginPath();ctx.arc(s*0.95,-s*0.25,s*0.09,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.95,s*0.25,s*0.09,0,TAU);ctx.fill();
  ctx.restore();
}
// ---------- soft things ----------
export function shBlob(e,sp){
  const s=e.r,c=e.col,ph=G.t*2.4+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  if(sp.legs){ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=Math.max(1.5,s*0.16);ctx.lineCap='round';for(let k=0;k<sp.legs;k++){const x=s*0.6-k*s*1.3/sp.legs,w=Math.sin(G.t*5+k)*s*0.12;ctx.beginPath();ctx.moveTo(x,-s*0.5);ctx.lineTo(x+w,-s*1.05);ctx.moveTo(x,s*0.5);ctx.lineTo(x-w,s*1.05);ctx.stroke();}}
  if(sp.feelers){ctx.strokeStyle=rgba(c,0.6);ctx.lineWidth=1.2;for(let k=0;k<sp.feelers;k++){const a=-0.6+k*1.2/(sp.feelers-1);ctx.beginPath();ctx.moveTo(s*0.8,0);ctx.quadraticCurveTo(s*1.3,Math.sin(a)*s,s*1.7+Math.sin(ph+k)*s*0.15,Math.sin(a)*s*1.6);ctx.stroke();}}
  if(sp.veil){ctx.fillStyle=rgba(c,0.25);ctx.beginPath();for(let k=0;k<=12;k++){const a=Math.PI*0.5+k/12*Math.PI,l=s*(1.5+0.25*Math.sin(ph*1.6+k));ctx.lineTo(Math.cos(a)*l*1.1,Math.sin(a)*l);}ctx.closePath();ctx.fill();}
  if(sp.rust){ctx.strokeStyle='rgba(190,90,40,0.85)';ctx.lineWidth=Math.max(1.5,s*0.1);ctx.lineCap='round';for(let k=0;k<11;k++){const a=k/11*TAU+e.seed,l=s*(1.25+0.35*Math.sin(k*3.1+e.seed));ctx.beginPath();ctx.moveTo(Math.cos(a)*s*0.8,Math.sin(a)*s*0.8);ctx.lineTo(Math.cos(a)*l,Math.sin(a)*l+s*0.12);ctx.stroke();}}
  ctx.fillStyle=sp.dark?'rgba(12,26,18,0.96)':sp.rust?'rgba(96,44,20,0.97)':rgba(c,sp.veil?0.6:0.88);ctx.strokeStyle=rgba(c,0.8);ctx.lineWidth=1.3;
  ctx.beginPath();for(let k=0;k<=14;k++){const a=k/14*TAU,l=s*(0.95+0.13*Math.sin(ph+k*1.9)+0.06*Math.sin(ph*1.7+k*3.3));const x=Math.cos(a)*l*(sp.legs?1.25:1),y=Math.sin(a)*l*(sp.legs?0.72:1);if(k)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
  ctx.closePath();ctx.fill();ctx.stroke();
  if(sp.eyes){for(let k=0;k<sp.eyes;k++){const a=k*2.4+e.seed,rr=s*0.5*((k%3)/3+0.25),blink=Math.sin(G.t*1.3+k*2)>-0.9?1:0.15;ctx.fillStyle='rgba(230,255,190,0.95)';oval(Math.cos(a)*rr,Math.sin(a)*rr,s*0.15,s*0.15*blink,0);ctx.fill();ctx.fillStyle='#051008';ctx.beginPath();ctx.arc(Math.cos(a)*rr,Math.sin(a)*rr,s*0.06,0,TAU);ctx.fill();}}
  else if(sp.rust){ctx.fillStyle='rgba(255,200,110,0.9)';for(let k=-1;k<=1;k++){ctx.beginPath();ctx.arc(k*s*0.35,-s*0.1,s*0.1,0,TAU);ctx.fill();}}
  else{ctx.fillStyle='rgba(255,255,255,0.28)';oval(-s*0.1,-s*0.25,s*0.5,s*0.22,0);ctx.fill();}
  ctx.restore();
}
function shDumbo(e){
  const s=e.r,c=e.col,flap=Math.sin(G.t*4+e.seed);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=Math.max(1.5,s*0.18);ctx.lineCap='round';
  for(let k=0;k<6;k++){const y0=(k-2.5)*s*0.3;ctx.beginPath();ctx.moveTo(-s*0.5,y0);ctx.quadraticCurveTo(-s*1.1,y0*1.5+Math.sin(G.t*3+k)*s*0.2,-s*1.5,y0*1.8);ctx.stroke();}
  ctx.fillStyle=rgba(c,0.7);oval(s*0.2,-s*0.95,s*0.5,s*0.28,-0.6+flap*0.5);ctx.fill();oval(s*0.2,s*0.95,s*0.5,s*0.28,0.6-flap*0.5);ctx.fill();
  ctx.fillStyle=rgba(c,0.95);oval(s*0.1,0,s*0.95,s*0.85,0);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-s*0.1,-s*0.42,s*0.2,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-s*0.1,s*0.42,s*0.2,0,TAU);ctx.fill();
  ctx.fillStyle='#10131c';ctx.beginPath();ctx.arc(-s*0.14,-s*0.42,s*0.11,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-s*0.14,s*0.42,s*0.11,0,TAU);ctx.fill();
  ctx.restore();
}
function shLump(e){
  const s=e.r,c=e.col,pul=0.5+0.5*Math.sin(G.t*(e.warn?16:4)+e.seed);
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.seed);
  ctx.fillStyle='rgba(74,64,48,0.97)';ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=1.3;
  ctx.beginPath();for(let k=0;k<=16;k++){const a=k/16*TAU,l=s*(0.95+0.22*Math.sin(k*2.7+e.seed));if(k)ctx.lineTo(Math.cos(a)*l,Math.sin(a)*l);else ctx.moveTo(Math.cos(a)*l,Math.sin(a)*l);}ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=rgba(c,0.35);for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(0,0,s*(0.25+k*0.18),k,k+2.4);ctx.stroke();}
  ctx.fillStyle='rgba(255,'+Math.round(150+80*pul)+',110,'+(0.35+0.6*pul).toFixed(2)+')';ctx.beginPath();ctx.arc(0,0,s*0.2,0,TAU);ctx.fill();
  ctx.restore();
}
function shBag(e){
  const s=e.r,ph=G.t*1.4+e.seed;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.sin(ph)*0.5);
  ctx.strokeStyle='rgba(235,245,255,0.75)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(-s*0.35,-s*1.05,s*0.22,s*0.35,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.ellipse(s*0.35,-s*1.05,s*0.22,s*0.35,0,0,TAU);ctx.stroke();
  ctx.fillStyle='rgba(235,245,255,0.34)';
  ctx.beginPath();ctx.moveTo(-s*0.7,-s*0.8);ctx.lineTo(s*0.7,-s*0.8);ctx.quadraticCurveTo(s*(1.0+0.15*Math.sin(ph*2)),0,s*0.75,s*0.95);
  for(let k=0;k<=4;k++)ctx.lineTo(s*0.75-k*s*0.375,s*(0.95+0.18*Math.sin(ph*3+k*1.7)));
  ctx.quadraticCurveTo(-s*(1.0+0.15*Math.cos(ph*2)),0,-s*0.7,-s*0.8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-s*0.3,-s*0.6);ctx.lineTo(-s*0.15,s*0.6);ctx.moveTo(s*0.25,-s*0.55);ctx.lineTo(s*0.35,s*0.5);ctx.stroke();
  ctx.restore();
}
function shShell(e){
  const s=e.r,c=e.col;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.strokeStyle=rgba(c,0.75);ctx.lineWidth=Math.max(1.3,s*0.13);ctx.lineCap='round';
  for(let k=0;k<7;k++){const y0=(k-3)*s*0.13,ph=G.t*4+k+e.seed;ctx.beginPath();ctx.moveTo(s*0.7,y0);ctx.quadraticCurveTo(s*1.3,y0*2+Math.sin(ph)*s*0.2,s*1.75,y0*3+Math.sin(ph+1)*s*0.25);ctx.stroke();}
  ctx.fillStyle='rgba(120,84,50,0.97)';ctx.strokeStyle=rgba(c,0.85);ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.fill();ctx.stroke();
  ctx.beginPath();for(let a=0;a<TAU*2.6;a+=0.25){const r=s*(1-a/(TAU*2.75));const x=Math.cos(a)*r-s*0.06*a/TAU,y=Math.sin(a)*r;if(a)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();
  ctx.strokeStyle=rgba(c,0.4);ctx.lineWidth=1;for(let k=0;k<12;k++){const a=k/12*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*0.62,Math.sin(a)*s*0.62);ctx.lineTo(Math.cos(a)*s*0.97,Math.sin(a)*s*0.97);ctx.stroke();}
  ctx.fillStyle='#fff6e0';ctx.beginPath();ctx.arc(s*0.78,-s*0.3,s*0.13,0,TAU);ctx.fill();ctx.fillStyle='#1a0e06';ctx.beginPath();ctx.arc(s*0.8,-s*0.3,s*0.06,0,TAU);ctx.fill();
  ctx.restore();
}
function shFlame(e){
  const s=e.r,c=e.col,ph=G.t*9+e.seed,hot=e.warn?1:0.6;
  ctx.save();ctx.translate(e.x,e.y);
  for(let l=0;l<3;l++){const k=1-l*0.28;ctx.fillStyle=l===2?'rgba(255,250,200,'+hot+')':l?'rgba(255,190,70,0.9)':rgba(c,0.75);
    ctx.beginPath();ctx.moveTo(-s*0.8*k,s*0.7*k);ctx.quadraticCurveTo(-s*1.0*k,-s*0.2*k,-s*0.3*k+Math.sin(ph+l)*s*0.2,-s*1.0*k);ctx.quadraticCurveTo(-s*0.1*k,-s*0.4*k,Math.sin(ph*1.3+l)*s*0.25,-s*1.7*k);
    ctx.quadraticCurveTo(s*0.3*k,-s*0.5*k,s*0.4*k+Math.cos(ph+l)*s*0.2,-s*1.1*k);ctx.quadraticCurveTo(s*1.0*k,-s*0.2*k,s*0.8*k,s*0.7*k);ctx.quadraticCurveTo(0,s*1.1*k,-s*0.8*k,s*0.7*k);ctx.fill();}
  ctx.restore();
}
// A body that follows a trail of points: siphonophores, sea serpents, the heads of the Hydra
function shChain(e,sp){
  const s=e.r,c=e.col,b=e.body||[];
  ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=b.length-1;i>0;i--){const k=i/b.length;ctx.strokeStyle=rgba(c,(0.9-k*0.55).toFixed(2));ctx.lineWidth=Math.max(1.5,s*1.5*(1-k*0.8));ctx.beginPath();ctx.moveTo(b[i].x,b[i].y);ctx.lineTo(b[i-1].x,b[i-1].y);ctx.stroke();}
  if(sp.bead){for(let i=2;i<b.length;i+=3){const pul=0.5+0.5*Math.sin(G.t*6-i*0.5);ctx.fillStyle='rgba(255,245,210,'+(0.35+0.6*pul).toFixed(2)+')';ctx.beginPath();ctx.arc(b[i].x,b[i].y,Math.max(1.5,s*0.3),0,TAU);ctx.fill();}}
  if(sp.fins){ctx.strokeStyle='rgba(220,255,235,0.4)';ctx.lineWidth=1.3;for(let i=3;i<b.length-1;i+=4){const p=b[i],q=b[i-1],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1,px=-dy/d,py=dx/d,f=s*1.5*(1-i/b.length);ctx.beginPath();ctx.moveTo(p.x+px*f,p.y+py*f);ctx.lineTo(p.x-px*f,p.y-py*f);ctx.stroke();}}
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);
  ctx.fillStyle=rgba(c,0.97);ctx.beginPath();ctx.moveTo(s*1.5,0);ctx.quadraticCurveTo(s*0.6,-s*0.95,-s*0.6,-s*0.7);ctx.lineTo(-s*0.6,s*0.7);ctx.quadraticCurveTo(s*0.6,s*0.95,s*1.5,0);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*0.45,-s*0.35,s*0.18,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.45,s*0.35,s*0.18,0,TAU);ctx.fill();
  ctx.fillStyle='#08140c';ctx.beginPath();ctx.arc(s*0.52,-s*0.35,s*0.09,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(s*0.52,s*0.35,s*0.09,0,TAU);ctx.fill();
  ctx.restore();
}
function shHippo(e){
  const s=e.r,c=e.col,wag=Math.sin(G.t*9+e.seed)*0.4;
  ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.ang);if(Math.cos(e.ang)<0)ctx.scale(1,-1);
  ctx.strokeStyle=rgba(c,0.9);ctx.lineCap='round';
  for(let i=0;i<6;i++){ctx.lineWidth=Math.max(1.5,s*(0.75-i*0.1));ctx.beginPath();ctx.moveTo(-s*0.3-i*s*0.38,Math.sin(i*0.9)*s*0.35+wag*s*i*0.1);ctx.lineTo(-s*0.3-(i+1)*s*0.38,Math.sin((i+1)*0.9)*s*0.35+wag*s*(i+1)*0.1);ctx.stroke();}
  ctx.fillStyle=rgba(c,0.6);tri(-s*2.5,wag*s*0.6,-s*3.2,-s*0.6+wag*s,-s*3.1,s*0.7+wag*s);ctx.fill();
  ctx.fillStyle=rgba(c,0.95);oval(0,0,s*0.9,s*0.62,0);ctx.fill();
  ctx.beginPath();ctx.moveTo(s*0.3,-s*0.3);ctx.quadraticCurveTo(s*0.7,-s*1.5,s*1.3,-s*1.35);ctx.lineTo(s*2.1,-s*0.9);ctx.lineTo(s*1.9,-s*0.55);ctx.quadraticCurveTo(s*1.2,-s*0.6,s*0.9,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(230,255,250,0.7)';ctx.lineWidth=1.5;for(let k=0;k<5;k++){ctx.beginPath();ctx.moveTo(s*(0.45+k*0.17),-s*(0.7+k*0.17));ctx.lineTo(s*(0.15+k*0.17),-s*(1.0+k*0.2)+Math.sin(G.t*8+k)*s*0.1);ctx.stroke();}
  ctx.fillStyle='#062018';ctx.beginPath();ctx.arc(s*1.45,-s*1.1,s*0.1,0,TAU);ctx.fill();
  ctx.strokeStyle=rgba(c,0.9);ctx.lineWidth=s*0.18;ctx.beginPath();ctx.moveTo(s*0.5,s*0.3);ctx.lineTo(s*1.0,s*0.9+Math.sin(G.t*12+e.seed)*s*0.3);ctx.stroke();
  ctx.restore();
}
// ---------- figures: upright, facing the vessel ----------
const SKIN={scale:['rgba(40,120,90,0.96)','rgba(140,255,200,0.9)'],bronze:['rgba(150,100,40,0.97)','rgba(255,215,140,0.9)'],sea:['rgba(30,110,150,0.96)','rgba(170,235,255,0.9)'],
  pale:['rgba(225,215,225,0.95)','rgba(255,255,255,0.9)'],ghost:['rgba(170,200,255,0.35)','rgba(230,245,255,0.6)'],dark:['rgba(30,14,34,0.96)','rgba(255,120,140,0.85)'],bone:['rgba(225,220,200,0.95)','rgba(60,50,40,0.9)']};
export function shHuman(e,sp,scale){
  const s=e.r*(scale||1),c=e.col,f=P.x<e.x?-1:1,pal=SKIN[sp.skin]||SKIN.sea,ph=G.t*3+e.seed,lunge=e.mode===2?0.5:0;
  ctx.save();ctx.translate(e.x,e.y);ctx.scale(f,1);ctx.rotate(lunge*0.6);
  if(sp.skin==='ghost')ctx.globalAlpha=0.45+0.35*Math.sin(G.t*5+e.seed);
  if(sp.wings){ctx.fillStyle=sp.skin==='dark'?'rgba(70,16,30,0.85)':'rgba(255,240,200,0.55)';const fl=Math.sin(G.t*7+e.seed)*0.35;
    ctx.beginPath();ctx.moveTo(-s*0.2,-s*0.5);ctx.quadraticCurveTo(-s*1.6,-s*(1.9+fl),-s*2.0,-s*(0.4+fl));ctx.quadraticCurveTo(-s*1.2,-s*0.3,-s*0.3,s*0.2);ctx.closePath();ctx.fill();}
  // lower body: legs or robe, a fish tail, or a snake's
  ctx.fillStyle=pal[0];ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=1.2;
  if(sp.tail===1){ctx.beginPath();ctx.moveTo(-s*0.45,s*0.3);ctx.quadraticCurveTo(-s*0.9,s*1.4,-s*(0.3+0.3*Math.sin(ph)),s*2.1);ctx.lineTo(-s*1.0,s*2.7);ctx.lineTo(s*0.3,s*2.6);ctx.lineTo(-s*(0.0+0.3*Math.sin(ph)),s*2.0);ctx.quadraticCurveTo(s*0.3,s*1.3,s*0.45,s*0.3);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(sp.tail===2){ctx.lineCap='round';ctx.strokeStyle=pal[0];for(let i=0;i<8;i++){ctx.lineWidth=Math.max(2,s*(0.8-i*0.085));ctx.beginPath();ctx.moveTo(Math.sin(ph+i*0.8)*s*0.5-i*s*0.12,s*0.4+i*s*0.34);ctx.lineTo(Math.sin(ph+(i+1)*0.8)*s*0.5-(i+1)*s*0.12,s*0.4+(i+1)*s*0.34);ctx.stroke();}ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=1.2;}
  else if(sp.robe){ctx.beginPath();ctx.moveTo(-s*0.5,0);ctx.lineTo(-s*(0.95+0.1*Math.sin(ph)),s*2.2);for(let k=0;k<=4;k++)ctx.lineTo(-s*0.95+k*s*0.475,s*(2.2+0.2*Math.sin(ph*2+k*2)));ctx.lineTo(s*0.5,0);ctx.closePath();ctx.fill();ctx.stroke();}
  else{ctx.lineCap='round';ctx.strokeStyle=pal[0];ctx.lineWidth=s*0.34;const k=Math.sin(G.t*6+e.seed)*0.3;ctx.beginPath();ctx.moveTo(-s*0.2,s*0.6);ctx.lineTo(-s*(0.35+k),s*1.9);ctx.moveTo(s*0.2,s*0.6);ctx.lineTo(s*(0.35+k),s*1.9);ctx.stroke();ctx.strokeStyle=rgba(c,0.7);ctx.lineWidth=1.2;}
  // torso, shield, head
  ctx.fillStyle=pal[0];ctx.beginPath();ctx.moveTo(-s*0.55,-s*0.55);ctx.lineTo(s*0.55,-s*0.55);ctx.lineTo(s*0.42,s*0.7);ctx.lineTo(-s*0.42,s*0.7);ctx.closePath();ctx.fill();ctx.stroke();
  if(sp.skin==='bone'){ctx.strokeStyle=pal[1];ctx.lineWidth=1.2;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(-s*0.4,-s*0.35+k*s*0.27);ctx.lineTo(s*0.4,-s*0.35+k*s*0.27);ctx.stroke();}ctx.strokeStyle=rgba(c,0.7);}
  ctx.fillStyle=sp.skin==='bronze'||sp.skin==='bone'?pal[0]:pal[1];
  if(sp.dog){ctx.beginPath();ctx.moveTo(-s*0.4,-s*1.3);ctx.lineTo(s*0.9,-s*1.05);ctx.lineTo(s*0.9,-s*0.8);ctx.lineTo(-s*0.4,-s*0.6);ctx.closePath();ctx.fill();tri(-s*0.3,-s*1.3,-s*0.15,-s*1.8,s*0.1,-s*1.25);ctx.fill();}
  else{ctx.beginPath();ctx.arc(0,-s*1.0,s*0.48,0,TAU);ctx.fill();}
  if(sp.hair){ctx.strokeStyle=rgba(c,0.85);ctx.lineWidth=Math.max(1.3,s*0.13);ctx.lineCap='round';for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(-s*0.3+k*s*0.08,-s*1.35);ctx.quadraticCurveTo(-s*(0.9+0.2*Math.sin(ph+k)),-s*0.6,-s*(0.7+k*0.08)+Math.sin(ph*1.4+k)*s*0.25,s*(0.2+k*0.1));ctx.stroke();}}
  if(sp.crest||sp.helm){ctx.fillStyle=sp.crest?'rgba(200,50,50,0.95)':'rgba(150,160,170,0.95)';ctx.beginPath();ctx.arc(0,-s*1.08,s*0.52,Math.PI,0);ctx.closePath();ctx.fill();
    if(sp.crest){ctx.beginPath();ctx.moveTo(-s*0.5,-s*1.5);ctx.quadraticCurveTo(0,-s*2.3,s*0.6,-s*1.45);ctx.lineTo(s*0.3,-s*1.4);ctx.quadraticCurveTo(0,-s*1.8,-s*0.3,-s*1.4);ctx.closePath();ctx.fill();}
    if(sp.helm==='horn'||sp.helm===1){ctx.strokeStyle='rgba(235,235,220,0.9)';ctx.lineWidth=s*0.14;ctx.beginPath();ctx.moveTo(-s*0.45,-s*1.3);ctx.quadraticCurveTo(-s*0.9,-s*1.6,-s*0.75,-s*2.0);ctx.moveTo(s*0.45,-s*1.3);ctx.quadraticCurveTo(s*0.9,-s*1.6,s*0.75,-s*2.0);ctx.stroke();}}
  if(sp.crown){ctx.fillStyle='rgba(255,215,110,0.97)';ctx.beginPath();ctx.moveTo(-s*0.5,-s*1.3);for(let k=0;k<5;k++){ctx.lineTo(-s*0.5+k*s*0.25+s*0.06,-s*1.85);ctx.lineTo(-s*0.5+(k+0.5)*s*0.25,-s*1.45);}ctx.lineTo(s*0.5,-s*1.3);ctx.closePath();ctx.fill();}
  if(sp.beard){ctx.fillStyle='rgba(235,245,255,0.9)';ctx.beginPath();ctx.moveTo(-s*0.4,-s*0.85);ctx.quadraticCurveTo(0,s*0.3+Math.sin(ph)*s*0.1,s*0.45,-s*0.85);ctx.closePath();ctx.fill();}
  ctx.fillStyle=sp.skin==='bone'?'#120c08':rgba(c,0.95);ctx.beginPath();ctx.arc(s*0.2,-s*1.05,s*0.09,0,TAU);ctx.fill();if(!sp.dog){ctx.beginPath();ctx.arc(-s*0.12,-s*1.05,s*0.09,0,TAU);ctx.fill();}
  if(sp.shield){ctx.fillStyle='rgba(120,80,30,0.97)';ctx.strokeStyle='rgba(255,215,140,0.9)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s*0.35,s*0.1,s*0.7,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(s*0.35,s*0.1,s*0.25,0,TAU);ctx.stroke();}
  // weapon arm
  const w=sp.weapon;ctx.strokeStyle=pal[0];ctx.lineWidth=s*0.26;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(s*0.45,-s*0.35);ctx.lineTo(s*1.0,-s*(0.1+lunge));ctx.stroke();
  ctx.strokeStyle=sp.skin==='bone'?'rgba(140,110,70,0.95)':'rgba(255,225,160,0.95)';ctx.lineWidth=Math.max(1.5,s*0.12);
  if(w==='trident'||w==='spear'||w==='bident'){const y0=s*1.4,y1=-s*2.1;ctx.beginPath();ctx.moveTo(s*1.0,y0);ctx.lineTo(s*1.0,y1);ctx.stroke();
    if(w==='spear'){ctx.fillStyle='rgba(255,235,190,0.97)';tri(s*1.0,y1-s*0.6,s*0.8,y1,s*1.2,y1);ctx.fill();}
    else{ctx.beginPath();const g=w==='bident'?[-1,1]:[-1,0,1];g.forEach(function(k){ctx.moveTo(s*1.0,y1+s*0.15);ctx.quadraticCurveTo(s*(1.0+k*0.4),y1+s*0.1,s*(1.0+k*0.38),y1-s*0.6);});ctx.stroke();}}
  else if(w==='axe'){ctx.beginPath();ctx.moveTo(s*1.0,s*0.9);ctx.lineTo(s*1.0,-s*1.5);ctx.stroke();ctx.fillStyle='rgba(200,215,225,0.95)';ctx.beginPath();ctx.moveTo(s*1.0,-s*1.5);ctx.quadraticCurveTo(s*1.9,-s*1.6,s*1.7,-s*0.8);ctx.lineTo(s*1.0,-s*1.0);ctx.closePath();ctx.fill();}
  else if(w==='staff'){ctx.beginPath();ctx.moveTo(s*1.0,s*1.3);ctx.lineTo(s*1.0,-s*1.7);ctx.stroke();ctx.fillStyle=rgba(c,0.95);ctx.beginPath();ctx.arc(s*1.0,-s*1.9,s*0.28,0,TAU);ctx.fill();}
  else if(w==='oar'){ctx.beginPath();ctx.moveTo(s*0.6,s*1.6);ctx.lineTo(s*1.3,-s*1.6);ctx.stroke();ctx.fillStyle='rgba(140,110,70,0.95)';oval(s*1.38,-s*1.95,s*0.22,s*0.5,0.2);ctx.fill();}
  else if(w==='whip'){ctx.beginPath();ctx.moveTo(s*1.0,-s*0.1);ctx.bezierCurveTo(s*1.9,-s*(1.2+Math.sin(ph*2)),s*2.4,s*Math.sin(ph*2.3),s*3.0,-s*0.6*Math.cos(ph*2));ctx.stroke();}
  else if(w==='claw'){ctx.beginPath();for(let k=-1;k<=1;k++){ctx.moveTo(s*1.0,-s*(0.1+lunge));ctx.lineTo(s*1.45,-s*(0.1+lunge)+k*s*0.28);}ctx.stroke();}
  ctx.restore();ctx.globalAlpha=1;
}

const FAMILY={fish:shFish,shark:shShark,eel:function(e){drawEel(e);},gulper:shGulper,vampire:shVampire,crust:shCrust,blob:shBlob,dumbo:shDumbo,
  lump:shLump,bag:shBag,shell:shShell,flame:shFlame,chain:shChain,hippo:shHippo,human:shHuman};
export function drawShape(e,def){const f=FAMILY[def.shape];if(!f)return false;f(e,def.sp||{});return true;}
