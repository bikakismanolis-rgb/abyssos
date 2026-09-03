// ---------- input ----------
// Free stick (default): the first touch plants the stick where it lands and drags it along.
// Fixed stick (setting): the stick sits at a fixed spot at the bottom left or right; any touch
// steers relative to that spot.
import {canvas,W,H} from '../render/canvas.js';
import {G} from '../game/state.js';
import {togglePause} from './screens.js';
import {settings} from '../settings.js';

export const keys={};
window.addEventListener('keydown',function(e){keys[e.key.toLowerCase()]=true;if(e.key==='Escape'||e.key==='p'||e.key==='P')togglePause();});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false;});
export const joy={active:false,id:null,ox:0,oy:0,dx:0,dy:0,last:0};
export const JR=48;
export function joyFixed(){return settings().joystick==='fixed';}
export function joyAnchor(){return {x:settings().joySide==='right'?W-JR-44:JR+44,y:H-JR-70};}
export function joyStart(id,x,y){
  if(!G||G.state!=='play'||joy.active)return;
  joy.active=true;joy.id=id;joy.dx=joy.dy=0;joy.last=performance.now();
  if(joyFixed()){const a=joyAnchor();joy.ox=a.x;joy.oy=a.y;joyMove(id,x,y);}
  else{joy.ox=x;joy.oy=y;}
}
export function joyMove(id,x,y){
  if(!joy.active||id!==joy.id)return;
  joy.last=performance.now();
  let dx=x-joy.ox,dy=y-joy.oy;const d=Math.hypot(dx,dy);
  if(d>JR){if(!joyFixed()){joy.ox=x-dx/d*JR;joy.oy=y-dy/d*JR;}dx=dx/d*JR;dy=dy/d*JR;}
  if(d<5){joy.dx=joy.dy=0;}else{joy.dx=dx/JR;joy.dy=dy/JR;}
}
export function joyEnd(){joy.active=false;joy.id=null;joy.dx=joy.dy=0;}
// touch (phones / tablets): every new touch takes over the stick, so a lost touchend can never leave it stuck
function touchAnchor(e){
  const t=e.touches&&e.touches[0];
  if(!t){joyEnd();return;}
  joyEnd();joyStart('t',t.clientX,t.clientY);
}
canvas.addEventListener('touchstart',function(e){e.preventDefault();touchAnchor(e);},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();const t=e.touches[0];if(!t){joyEnd();return;}
  if(!joy.active)joyStart('t',t.clientX,t.clientY);
  joyMove('t',t.clientX,t.clientY);
},{passive:false});
function touchDone(e){if(!e.touches||e.touches.length===0)joyEnd();else touchAnchor(e);}
canvas.addEventListener('touchend',touchDone,{passive:true});
canvas.addEventListener('touchcancel',touchDone,{passive:true});
window.addEventListener('touchend',touchDone,{passive:true});
window.addEventListener('touchcancel',touchDone,{passive:true});
// mouse (desktop)
canvas.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')return;joyStart('p'+e.pointerId,e.clientX,e.clientY);try{canvas.setPointerCapture(e.pointerId);}catch(x){}});
canvas.addEventListener('pointermove',function(e){if(e.pointerType==='touch')return;joyMove('p'+e.pointerId,e.clientX,e.clientY);});
function pointerDone(e){if(e.pointerType==='touch')return;if(joy.active&&('p'+e.pointerId===joy.id))joyEnd();}
window.addEventListener('pointerup',pointerDone);window.addEventListener('pointercancel',pointerDone);
window.addEventListener('blur',joyEnd);
document.addEventListener('visibilitychange',function(){if(document.hidden)joyEnd();});

// Raw movement intent, un-normalised: keyboard first, the stick overrides it while active
export function readMove(){
  let ix=0,iy=0;
  if(keys['a']||keys['arrowleft'])ix-=1;if(keys['d']||keys['arrowright'])ix+=1;
  if(keys['w']||keys['arrowup'])iy-=1;if(keys['s']||keys['arrowdown'])iy+=1;
  if(joy.active){ix=joy.dx;iy=joy.dy;}
  return {ix:ix,iy:iy};
}
