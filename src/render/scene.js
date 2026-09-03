// ---------- render: one frame, in the original pass order ----------
import {ctx,W,H} from './canvas.js';
import {G,P,cam,clock} from '../game/state.js';
import {WEAPONS,effLv} from '../game/config.js';
import {rnd,clamp,TAU} from '../util.js';
import {drawBackground,drawRays,drawSnow,drawVignette,drawLamp,drawGlow,inView} from './draw.js';
import {drawEnemy,ghostAlpha} from './creatures.js';
import {drawPlayer} from './player.js';
import {drawFx,drawParticles,drawNumbers,drawJoystick} from './fx.js';
import {drawEventsGlow,drawEventsBody,drawFog} from './events.js';

export function render(){
  const sh=G.shake,ox=sh?rnd(-sh,sh):0,oy=sh?rnd(-sh,sh):0;
  drawBackground();drawRays();drawSnow(false);
  ctx.save();ctx.translate(-cam.x+ox,-cam.y+oy);
  if(G.weapons.lamp)drawLamp();

  // glow pass
  ctx.globalCompositeOperation='lighter';
  for(const mo of G.motes){if(!inView(mo.x,mo.y,20))continue;drawGlow(mo.x,mo.y,11+Math.sin(mo.t*5+mo.seed)*2,'120,255,225',0.8);}
  for(const e of G.enemies){
    if(!inView(e.x,e.y,120))continue;
    if(e.type==='angler'){drawGlow(e.lureX,e.lureY,26,e.col,0.9);drawGlow(e.x,e.y,e.r*1.4,e.col,0.12);}
    else if(e.type==='beacon'){drawGlow(e.lureX,e.lureY,70+12*Math.sin(G.t*4+e.seed),e.col,0.9);drawGlow(e.x,e.y,e.r*2,e.col,0.3);}
    else if(e.type==='plankton')drawGlow(e.x,e.y,e.r*2.5,e.col,0.5+0.3*Math.sin(G.t*5+e.seed));
    else if(e.ghost)drawGlow(e.x,e.y,e.r*2.6,e.col,ghostAlpha(e)*0.6);
    else if(e.mine)drawGlow(e.x,e.y,e.r*2.2,e.col,e.warn?0.35+0.35*Math.sin(G.t*16+e.seed):0.25);
    else drawGlow(e.x,e.y,e.r*(e.boss?2.4:2.1),e.col,e.boss?0.55:0.42);
    if(e.lit)drawGlow(e.x,e.y,e.r*1.8,'255,220,170',0.35);
    if(e.flash>0)drawGlow(e.x,e.y,e.r*2.2,'255,255,255',0.75);
  }
  if(G.weapons.field){const fs=WEAPONS.field.lv(effLv(G.weapons.field,WEAPONS.field.max)),full=fs.cd*P.cdMul,ch=1-clamp((G.cds.field||0)/full,0,1);drawGlow(P.x,P.y,36+ch*26,'120,190,255',0.1+0.3*ch*ch);}
  for(const o of G.orbs)drawGlow(o.x,o.y,26,'255,230,140',0.9);
  for(const b of G.bullets)drawGlow(b.x,b.y,12,'200,240,255',0.7);
  for(const t of G.torps)drawGlow(t.x,t.y,16,'255,200,120',0.7);
  drawGlow(P.x+Math.cos(P.aim)*P.r*0.95,P.y+Math.sin(P.aim)*P.r*0.95,22,'255,235,190',0.9);
  drawEventsGlow();
  drawFx();
  drawParticles();
  ctx.globalCompositeOperation='source-over';
  drawEventsBody();

  // bodies
  for(const mo of G.motes){if(!inView(mo.x,mo.y,20))continue;ctx.fillStyle='#e8fffa';ctx.beginPath();ctx.arc(mo.x,mo.y,2.2,0,TAU);ctx.fill();}
  for(const e of G.enemies){if(inView(e.x,e.y,160))drawEnemy(e);}
  for(const o of G.orbs){ctx.fillStyle='#fff6d6';ctx.beginPath();ctx.arc(o.x,o.y,5,0,TAU);ctx.fill();}
  ctx.strokeStyle='#eaf6ff';ctx.lineWidth=2.2;ctx.lineCap='round';
  for(const b of G.bullets){const l=Math.hypot(b.vx,b.vy)||1;ctx.beginPath();ctx.moveTo(b.x-b.vx/l*9,b.y-b.vy/l*9);ctx.lineTo(b.x+b.vx/l*7,b.y+b.vy/l*7);ctx.stroke();}
  for(const t of G.torps){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(Math.atan2(t.vy,t.vx));ctx.fillStyle='#d9b675';ctx.beginPath();ctx.ellipse(0,0,9,3.5,0,0,TAU);ctx.fill();ctx.fillStyle='#ffd9a0';ctx.beginPath();ctx.arc(7,0,2.5,0,TAU);ctx.fill();ctx.restore();}
  drawPlayer();
  drawNumbers();
  ctx.restore();

  drawSnow(true);drawFog();drawVignette();
  if(P.flash>0){ctx.fillStyle='rgba(255,50,70,'+(P.flash*0.22).toFixed(3)+')';ctx.fillRect(0,0,W,H);}
  if(P.hp<P.maxHp*0.3&&G.state==='play'){const a=0.12+0.1*Math.sin(clock*6);ctx.fillStyle='rgba(255,60,80,'+a.toFixed(3)+')';ctx.fillRect(0,0,W,H);}
  drawJoystick();
}
