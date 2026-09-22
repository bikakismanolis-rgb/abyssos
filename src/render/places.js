// ---------- render: the backdrop of each place ----------
// A place is a silhouette far behind the fight: it rises from below as the vessel arrives, holds
// while the guardian lives, and drifts up and away once the descent goes on. Screen space, faint,
// with a little parallax; nothing here can be touched.
import {ctx,W,H} from './canvas.js';
import {G,cam,clock} from '../game/state.js';
import {TAU,clamp} from '../util.js';
import {placeAt,gateDepth,chapterStart} from '../game/places.js';

let anchor={id:null,x:0,y:0};
function ink(a,c){return 'rgba('+(c||'150,200,235')+','+a+')';}
function rect(x,y,w,h){ctx.beginPath();ctx.rect(x,y,w,h);ctx.fill();}
function poly(pts){ctx.beginPath();pts.forEach(function(p,i){if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);});ctx.closePath();ctx.fill();}

// ---- hulls ----
function hull(L,h,bow,stern){poly([[-L/2,-h],[L/2-bow,-h],[L/2,-h*0.2],[L/2-bow*0.6,h*0.5],[-L/2+stern,h*0.5],[-L/2,-h*0.3]]);}
function ship(kind,a){
  const c='150,190,215';
  if(kind==='ancient'){
    ctx.fillStyle=ink(a,'190,160,110');
    ctx.beginPath();ctx.moveTo(-170,-30);ctx.quadraticCurveTo(-190,40,-90,55);ctx.lineTo(110,55);ctx.quadraticCurveTo(200,40,215,-60);ctx.quadraticCurveTo(170,0,120,-10);ctx.lineTo(-120,-10);ctx.closePath();ctx.fill();
    rect(-6,-120,10,112);rect(-70,-92,140,7);                                   // the mast and its yard, still standing
    for(let k=0;k<9;k++){ctx.beginPath();ctx.ellipse(-150+k*38+Math.sin(k*3)*8,70+Math.cos(k*2)*6,9,15,Math.sin(k)*0.8,0,TAU);ctx.fill();}   // amphorae
    ctx.strokeStyle=ink(a*1.6,'255,215,140');ctx.lineWidth=2;ctx.beginPath();ctx.arc(60,78,13,0,TAU);ctx.stroke();                          // a bronze gearwheel in the sand
    for(let k=0;k<12;k++){ctx.beginPath();ctx.moveTo(60+Math.cos(k/12*TAU)*13,78+Math.sin(k/12*TAU)*13);ctx.lineTo(60+Math.cos(k/12*TAU)*17,78+Math.sin(k/12*TAU)*17);ctx.stroke();}
    return;
  }
  ctx.fillStyle=ink(a,c);
  if(kind==='liner'||kind==='broken'){
    const half=function(x0,L,funnels,tilt){ctx.save();ctx.translate(x0,0);ctx.rotate(tilt);hull(L,34,50,kind==='broken'?6:30);rect(-L/2+30,-52,L-90,20);rect(-L/2+50,-66,L-150,15);
      for(let k=0;k<funnels;k++){ctx.save();ctx.translate(-L/2+90+k*62,-66);ctx.rotate(-0.12);rect(-11,-44,22,46);ctx.restore();}
      for(let k=0;k<Math.floor(L/26);k++){ctx.fillStyle=ink(a*0.5,'255,220,150');ctx.beginPath();ctx.arc(-L/2+30+k*24,-14,2.2,0,TAU);ctx.fill();}ctx.fillStyle=ink(a,c);ctx.restore();};
    if(kind==='liner')half(0,520,4,0.05);
    else{half(-190,260,2,-0.1);half(205,230,2,0.22);ctx.fillStyle=ink(a*0.7,'200,120,70');for(let k=0;k<14;k++)rect(-60+k*9+Math.sin(k*5)*6,30+Math.cos(k*3)*14,5,10+((k*7)%12));}   // debris field, rusticles
    return;
  }
  const war=kind==='battleship',L=war?560:330;
  hull(L,war?36:24,70,40);rect(-L*0.2,-(war?78:50),L*0.34,war?44:28);rect(-L*0.1,-(war?120:74),L*0.12,war?44:26);
  rect(-L*0.06,-(war?170:104),5,war?52:32);
  [[-0.36,1],[-0.27,1],[0.27,-1],[0.36,-1]].slice(0,war?4:2).forEach(function(t){const x=t[0]*L;rect(x-20,-(war?54:36),40,war?20:14);ctx.save();ctx.translate(x,-(war?46:30));ctx.rotate(t[1]*-0.2);rect(t[1]>0?0:-62,-3,62,5);rect(t[1]>0?0:-62,4,62,5);ctx.restore();});
  if(!war){rect(-40,-66,14,20);rect(10,-64,14,18);}
}
// ---- ground ----
function floor(kind,a){
  const y=H*0.33;
  ctx.fillStyle=ink(a*0.9,kind==='trash'?'120,130,140':'120,110,100');
  ctx.beginPath();ctx.moveTo(-W,y+40);for(let x=-W;x<=W;x+=40)ctx.lineTo(x,y+Math.sin(x*0.013)*12+Math.sin(x*0.041)*5);ctx.lineTo(W,H);ctx.lineTo(-W,H);ctx.closePath();ctx.fill();
  if(kind==='trash'){const cols=['235,245,255','255,100,90','100,170,255','255,215,100'];
    for(let k=0;k<30;k++){const x=-W*0.8+((k*173)%Math.floor(W*1.6)),yy=y+14+((k*29)%40);ctx.fillStyle=ink(a*1.5,cols[k%4]);ctx.save();ctx.translate(x,yy);ctx.rotate(k*1.7);if(k%3)rect(-5,-9,10,18);else poly([[-10,-8],[10,-8],[12,10],[-12,10]]);ctx.restore();}}
  else if(kind==='bottom'){ctx.strokeStyle=ink(a*1.3);ctx.lineWidth=2;for(let k=0;k<2;k++){ctx.beginPath();ctx.moveTo(-W*0.5,y+26+k*12);ctx.lineTo(W*0.4,y+22+k*12);ctx.stroke();}   // the skid marks of a bathyscaphe
    ctx.fillStyle=ink(a*2,'235,245,255');ctx.save();ctx.translate(W*0.22,y+10+Math.sin(clock)*3);ctx.rotate(Math.sin(clock*0.7)*0.3);poly([[-9,-10],[9,-10],[11,10],[-11,10]]);ctx.restore();}
  else{ctx.strokeStyle=ink(a*0.9);ctx.lineWidth=1;for(let k=0;k<7;k++){ctx.beginPath();ctx.moveTo(-W,y+30+k*16);ctx.bezierCurveTo(-W*0.3,y+22+k*16,W*0.3,y+40+k*16,W,y+28+k*16);ctx.stroke();}}
}
function walls(a,gap,col){
  ctx.fillStyle=ink(a,col||'110,120,140');
  [-1,1].forEach(function(d){ctx.beginPath();ctx.moveTo(d*W,-H);for(let y=-H;y<=H;y+=50){ctx.lineTo(d*(gap+(H-y)*0.12+Math.sin(y*0.021+d)*26+Math.sin(y*0.07)*9),y);}ctx.lineTo(d*W,H);ctx.closePath();ctx.fill();});
}
function columns(a,col,n,broken){
  ctx.fillStyle=ink(a,col);
  for(let k=0;k<n;k++){const x=-(n-1)*45+k*90,h=broken&&k%3===1?90:200;rect(x-13,80-h,26,h);rect(x-19,80-h-10,38,10);rect(x-19,80,38,9);
    ctx.fillStyle=ink(a*0.5,'10,20,30');for(let f=-1;f<=1;f++)rect(x+f*7-1,84-h,2,h-8);ctx.fillStyle=ink(a,col);}
  if(!broken||n>4){poly([[-(n-1)*45-30,-130],[0,-185],[(n-1)*45+30,-130]]);rect(-(n-1)*45-30,-130,(n-1)*90+60,12);}
}
const SCENES={
  reef:function(a){
    const y=H*0.3,cols=['255,120,150','255,180,90','150,230,200','190,140,255','255,220,120'];
    for(let k=0;k<16;k++){const x=-W*0.75+k*W*0.1,c=cols[k%5],h=50+((k*37)%70);ctx.strokeStyle=ink(a*1.4,c);ctx.fillStyle=ink(a*1.1,c);ctx.lineWidth=5;ctx.lineCap='round';
      if(k%3===0){for(let b=-2;b<=2;b++){ctx.beginPath();ctx.moveTo(x,y+60);ctx.quadraticCurveTo(x+b*12,y+60-h*0.5,x+b*26+Math.sin(clock+k)*4,y+60-h);ctx.stroke();}}
      else if(k%3===1){ctx.beginPath();ctx.arc(x,y+50,28+(k%4)*6,Math.PI,0);ctx.fill();}
      else{ctx.lineWidth=2;for(let b=0;b<9;b++){const an=-Math.PI*0.9+b*Math.PI*0.1;ctx.beginPath();ctx.moveTo(x,y+60);ctx.lineTo(x+Math.cos(an)*h,y+60+Math.sin(an)*h);ctx.stroke();}}}
    floor('sand',a*0.8);},
  ancientwreck:function(a){floor('sand',a*0.7);ctx.save();ctx.translate(0,H*0.22);ctx.rotate(-0.08);ship('ancient',a);ctx.restore();},
  liner:function(a){ctx.save();ctx.translate(0,H*0.2);ctx.scale(0.8,0.8);ship('liner',a);ctx.restore();floor('sand',a*0.6);},
  brokenliner:function(a){ctx.save();ctx.translate(0,H*0.22);ctx.scale(0.72,0.72);ship('broken',a);ctx.restore();floor('sand',a*0.6);},
  battleship:function(a){ctx.save();ctx.translate(0,H*0.2);ctx.scale(0.72,0.72);ctx.rotate(0.06);ship('battleship',a);ctx.restore();walls(a*0.35,W*0.62,'90,80,80');floor('sand',a*0.6);},
  destroyer:function(a){ctx.save();ctx.translate(0,H*0.24);ctx.rotate(-0.14);ship('destroyer',a);ctx.restore();floor('sand',a*0.6);},
  cave:function(a){
    const g=ctx.createRadialGradient(0,-H*0.5,20,0,-H*0.5,H*0.7);g.addColorStop(0,ink(a*1.1,'150,225,255'));g.addColorStop(1,ink(0,'150,225,255'));ctx.fillStyle=g;ctx.fillRect(-W,-H,W*2,H*2);   // the mouth of the hole, far above
    walls(a*1.3,W*0.42,'60,80,95');ctx.fillStyle=ink(a*1.3,'60,80,95');for(let k=0;k<9;k++){const x=-W*0.45+k*W*0.11;poly([[x-14,-H],[x+14,-H],[x,-H*0.5+((k*53)%90)]]);}},
  line:function(a){
    ctx.strokeStyle=ink(a*2.2,'255,240,200');ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-W*0.22,-H);ctx.lineTo(-W*0.22,H);ctx.stroke();
    for(let k=-6;k<=6;k++){const y=k*70+((clock*6)%70);ctx.fillStyle=ink(a*2.4,k%2?'255,215,110':'255,120,100');rect(-W*0.22-9,y,18,9);}   // the depth tags a record dive collects
    ctx.fillStyle=ink(a*2,'255,245,210');ctx.beginPath();ctx.arc(-W*0.22,-H*0.1,5,0,TAU);ctx.fill();},
  ice:function(a){
    for(let k=0;k<7;k++){const q=((clock*0.11+k*0.29)%1),x=-W*0.6+k*W*0.2+q*80,y=-H*0.7+q*H*1.5;ctx.save();ctx.translate(x,y);ctx.rotate(1.0);
      ctx.fillStyle=ink(a*2,'230,240,250');ctx.beginPath();ctx.ellipse(0,0,15,6.5,0,0,TAU);ctx.fill();ctx.fillStyle=ink(a*2,'20,26,36');ctx.beginPath();ctx.ellipse(-2,-2.5,12,3.5,0,0,TAU);ctx.fill();poly([[15,0],[22,-1.5],[15,2]]);   // a penguin, flying down
      ctx.strokeStyle=ink(a,'230,245,255');ctx.lineWidth=1;for(let b=1;b<5;b++){ctx.beginPath();ctx.arc(-16-b*9,Math.sin(b*2+k)*4,1.5+b*0.4,0,TAU);ctx.stroke();}ctx.restore();}},
  open:function(a){for(let k=0;k<40;k++){const x=Math.sin(k*12.9)*W*0.8,y=Math.cos(k*7.3)*H*0.7,p=0.5+0.5*Math.sin(clock*2+k);ctx.fillStyle=ink(a*2.2*p,k%3?'140,230,255':'255,180,120');ctx.beginPath();ctx.arc(x,y,1.5+p*1.5,0,TAU);ctx.fill();}},
  lastlight:function(a){const g=ctx.createLinearGradient(0,-H,0,H*0.2);g.addColorStop(0,ink(a*1.6,'70,140,210'));g.addColorStop(1,ink(0,'70,140,210'));ctx.fillStyle=g;ctx.fillRect(-W,-H,W*2,H*1.2);
    ctx.fillStyle='rgba(0,0,0,'+(a*1.2).toFixed(3)+')';ctx.fillRect(-W,H*0.2,W*2,H);},
  vents:function(a){floor('sand',a*0.8);const y=H*0.33;
    for(let k=0;k<7;k++){const x=-W*0.7+k*W*0.23,h=70+((k*41)%80);ctx.fillStyle=ink(a*1.4,'90,70,60');poly([[x-26,y+30],[x-11,y-h],[x+11,y-h],[x+26,y+30]]);
      ctx.fillStyle=ink(a*2,'255,160,80');ctx.beginPath();ctx.ellipse(x,y-h,10,4,0,0,TAU);ctx.fill();
      for(let s=0;s<5;s++){const q=((clock*0.35+s*0.2+k*0.1)%1);ctx.fillStyle='rgba(20,18,22,'+((1-q)*a*2.4).toFixed(3)+')';ctx.beginPath();ctx.arc(x+Math.sin(clock+s+k)*14*q,y-h-q*150,8+q*26,0,TAU);ctx.fill();}}},
  canyon:function(a){walls(a,W*0.5,'100,110,135');},
  walls:function(a){walls(a*1.2,W*0.4,'120,100,110');},
  trash:function(a){floor('trash',a);},
  sediment:function(a){floor('sand',a);},
  bottom:function(a){floor('bottom',a);walls(a*0.6,W*0.6,'110,100,110');},
  garden:function(a){SCENES.reef(a*0.7);ctx.fillStyle=ink(a,'255,215,130');for(let k=0;k<5;k++){const x=-W*0.6+k*W*0.3,y=H*0.26;ctx.beginPath();ctx.arc(x,y,20+k*3,Math.PI*0.9,TAU*1.02);ctx.fill();}},
  atlantis:function(a){floor('sand',a*0.6);ctx.save();ctx.translate(0,H*0.22);columns(a*1.2,'215,190,140',6,true);
    ctx.fillStyle=ink(a*1.2,'215,190,140');ctx.save();ctx.translate(W*0.34,40);ctx.rotate(1.2);rect(-13,-100,26,200);ctx.restore();ctx.beginPath();ctx.arc(-W*0.36,58,22,0,TAU);ctx.fill();ctx.restore();},
  innersea:function(a){
    ctx.fillStyle=ink(a*1.1,'90,80,70');for(let k=0;k<11;k++){const x=-W*0.7+k*W*0.14;poly([[x-20,-H],[x+20,-H],[x+Math.sin(k)*6,-H*0.55+((k*47)%120)]]);}
    for(let k=0;k<7;k++){const x=-W*0.66+k*W*0.22,h=90+((k*61)%120),y=H*0.36;ctx.fillStyle=ink(a*1.2,'235,225,200');rect(x-7,y-h,14,h);ctx.fillStyle=ink(a*1.5,k%2?'255,190,150':'200,235,210');ctx.beginPath();ctx.ellipse(x,y-h,44+(k%3)*12,20,0,Math.PI,0);ctx.fill();}   // Verne's forest of giant mushrooms
    floor('sand',a*0.7);},
  rlyeh:function(a){floor('sand',a*0.6);const c='130,255,160';
    for(let k=0;k<9;k++){const x=-W*0.7+k*W*0.175,h=110+((k*71)%190),w=30+((k*13)%40),tl=Math.sin(k*2.7)*0.35;ctx.save();ctx.translate(x,H*0.34);ctx.rotate(tl);ctx.fillStyle=ink(a*1.1,'70,100,85');
      poly([[-w/2,0],[-w/2+8,-h],[w/2+14,-h+18],[w/2,0]]);ctx.strokeStyle=ink(a*1.6,c);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-w*0.2,-h*0.3);ctx.lineTo(w*0.3,-h*0.45);ctx.lineTo(-w*0.1,-h*0.62);ctx.lineTo(w*0.25,-h*0.8);ctx.stroke();ctx.restore();}},
  strait:function(a){walls(a*1.5,W*0.36,'120,105,140');},
  bones:function(a){floor('sand',a*0.7);ctx.strokeStyle=ink(a*1.6,'235,230,215');ctx.lineCap='round';
    for(let k=0;k<9;k++){const x=-W*0.55+k*W*0.14,h=140-Math.abs(k-4)*14;ctx.lineWidth=9-Math.abs(k-4);ctx.beginPath();ctx.moveTo(x,H*0.34);ctx.quadraticCurveTo(x-30,H*0.34-h*1.1,x+46,H*0.34-h);ctx.stroke();}
    ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-W*0.62,H*0.35);ctx.lineTo(W*0.62,H*0.35);ctx.stroke();},
  shipyard:function(a){floor('sand',a*0.7);[[-0.5,0.4,-0.5],[0.1,0.55,0.3],[0.55,0.35,-0.2]].forEach(function(s){ctx.save();ctx.translate(s[0]*W,H*0.25);ctx.scale(s[1],s[1]);ctx.rotate(s[2]);ship('ancient',a*0.9);ctx.restore();});},
  palace:function(a){floor('sand',a*0.6);ctx.save();ctx.translate(0,H*0.22);columns(a*1.3,'255,215,130',8,false);ctx.fillStyle=ink(a*1.3,'255,215,130');ctx.beginPath();ctx.arc(0,-185,52,Math.PI,0);ctx.fill();ctx.restore();},
  river:function(a){
    const y=H*0.12,g=ctx.createLinearGradient(0,y-50,0,y+70);g.addColorStop(0,ink(0,'190,200,255'));g.addColorStop(0.5,ink(a*1.6,'190,200,255'));g.addColorStop(1,ink(0,'190,200,255'));ctx.fillStyle=g;ctx.fillRect(-W,y-50,W*2,120);
    ctx.strokeStyle=ink(a*1.6,'235,240,255');ctx.lineWidth=1.5;for(let k=0;k<6;k++){const x=((clock*26+k*W*0.4)%(W*2))-W;ctx.beginPath();ctx.moveTo(x,y+k*9-18);ctx.quadraticCurveTo(x+40,y+k*9-26,x+90,y+k*9-18);ctx.stroke();}
    ctx.fillStyle=ink(a*1.4,'40,36,50');rect(-W*0.62,y-8,W*0.3,10);for(let k=0;k<4;k++)rect(-W*0.6+k*W*0.085,y,7,70);   // the landing stage
    for(let k=0;k<12;k++){const x=-W*0.7+k*W*0.13,h=80+((k*43)%90);ctx.fillStyle=ink(a*0.8,'60,56,80');poly([[x-9,y-50],[x,y-50-h],[x+9,y-50]]);}},
  gates:function(a){walls(a*1.2,W*0.46,'70,40,40');ctx.save();ctx.translate(0,H*0.05);ctx.fillStyle=ink(a*1.5,'90,50,40');
    rect(-150,-220,40,400);rect(110,-220,40,400);ctx.beginPath();ctx.arc(0,-220,130,Math.PI,0);ctx.arc(0,-220,110,0,Math.PI,true);ctx.closePath();ctx.fill();
    ctx.fillStyle=ink(a*0.9,'140,70,40');rect(-108,-210,104,390);rect(4,-210,104,390);ctx.fillStyle=ink(a*2,'255,170,90');for(let k=0;k<8;k++){ctx.beginPath();ctx.arc(k%2?-56:56,-170+Math.floor(k/2)*100,5,0,TAU);ctx.fill();}ctx.restore();},
  tartarus:function(a){
    ctx.fillStyle=ink(a*1.3,'150,100,50');rect(-W,H*0.1,W*2,H);ctx.fillStyle=ink(a*0.9,'40,20,10');for(let k=0;k<10;k++)rect(-W+k*W*0.2,H*0.1,6,H);   // the wall of bronze
    ctx.strokeStyle=ink(a*2,'200,160,100');ctx.lineWidth=4;ctx.setLineDash([12,8]);for(let k=0;k<5;k++){ctx.beginPath();ctx.moveTo(-W*0.7+k*W*0.35,-H);ctx.lineTo(-W*0.7+k*W*0.35+Math.sin(clock+k)*12,H*0.1);ctx.stroke();}ctx.setLineDash([]);
    const q=(clock*0.07)%1;ctx.save();ctx.translate(W*0.24,-H+q*H*1.1);ctx.rotate(clock*0.8);ctx.fillStyle=ink(a*2.4,'220,200,170');poly([[-22,-10],[22,-10],[12,0],[18,14],[-18,14],[-12,0]]);ctx.restore();},   // Hesiod's anvil, nine days falling
  throne:function(a){floor('sand',a*0.5);ctx.save();ctx.translate(0,H*0.2);columns(a*1.1,'120,80,150',6,false);
    ctx.fillStyle=ink(a*1.8,'200,120,255');for(let k=0;k<4;k++)rect(-90+k*12,70-k*16,180-k*24,16);rect(-34,-110,68,130);rect(-44,-150,12,60);rect(32,-150,12,60);poly([[-34,-110],[0,-165],[34,-110]]);ctx.restore();
    for(let k=0;k<26;k++){const x=-W*0.8+((k*97)%Math.floor(W*1.6)),y=H*0.3+((k*31)%50);ctx.strokeStyle=ink(a*1.6,'235,235,255');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+16);ctx.lineTo(x+Math.sin(clock+k)*2,y);ctx.stroke();ctx.fillStyle=ink(a*2,'245,245,255');ctx.beginPath();ctx.arc(x+Math.sin(clock+k)*2,y,2.5,0,TAU);ctx.fill();}}   // asphodels
};

export function drawBackdrop(){
  if(G.state==='start')return;
  let place=null,rise=0,alpha=0;
  if(G.boss&&G.boss.place){place=G.boss.place;alpha=1;}
  else if(G.leaving&&G.t-G.leaving.t<8){place=G.leaving.place;const k=(G.t-G.leaving.t)/8;rise=-k*k*H*1.1;alpha=1-k;}
  else{
    const to=gateDepth(G.tier,G.bossesCleared+1),from=G.bossesCleared?gateDepth(G.tier,G.bossesCleared):chapterStart(G.tier);
    const f=to>from?(G.depth-from)/(to-from):0;
    if(f>0.78){place=placeAt(G.tier,G.bossesCleared+1);const k=clamp((f-0.78)/0.22,0,1);rise=(1-k)*(1-k)*H*0.9;alpha=k;}
  }
  if(!place||!place.scene||!SCENES[place.scene])return;
  if(anchor.id!==place.id){anchor={id:place.id,x:cam.x,y:cam.y};}
  const ox=clamp(-(cam.x-anchor.x)*0.12,-W*0.35,W*0.35),oy=clamp(-(cam.y-anchor.y)*0.12,-H*0.2,H*0.2);
  ctx.save();ctx.translate(W/2+ox,H/2+oy+rise);
  const sc=Math.min(1.25,Math.max(0.7,W/520));ctx.scale(sc,sc);
  SCENES[place.scene](0.16*alpha);
  ctx.restore();
}
