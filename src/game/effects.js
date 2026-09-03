// ---------- effects ----------
import {G} from './state.js';
import {rnd,TAU} from '../util.js';

export function burst(x,y,n,col,speed){
  if(G.parts.length>420)return;
  for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(speed*0.3,speed),life=rnd(0.4,0.9);
    G.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life,max:life,col:col,s:rnd(1.5,3.5),type:'p'});}
}
export function bubble(x,y){
  if(G.parts.length>420)return;
  G.parts.push({x:x,y:y,vx:rnd(-8,8),vy:rnd(-30,-16),life:rnd(1,1.8),max:1.8,col:'190,230,255',s:rnd(1.5,3.5),type:'b'});
}
export function ring(x,y,r1,dur,col,w){G.fx.push({x:x,y:y,r1:r1,t:0,dur:dur,col:col,w:w||2});}
export function mote(x,y,v){return{x:x,y:y,v:v,seed:rnd(0,100),t:0};}
