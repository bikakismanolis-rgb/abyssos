import {$} from '../util.js';

export const canvas=$('c');
export const ctx=canvas.getContext('2d',{alpha:false});
export let W=0,H=0,DPR=1;
let vig=null;

export function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=window.innerWidth;H=window.innerHeight;
  canvas.width=Math.max(1,Math.floor(W*DPR));canvas.height=Math.max(1,Math.floor(H*DPR));
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);vig=null;
}
// Cached full-screen vignette, rebuilt lazily after every resize
export function getVignette(){
  // Guard: a 0×0 source canvas makes drawImage throw and would kill the frame loop (hidden tab at load)
  if(!vig){vig=document.createElement('canvas');vig.width=Math.max(1,W);vig.height=Math.max(1,H);const g=vig.getContext('2d');
    const r=g.createRadialGradient(W/2,H/2,Math.min(W,H)*0.32,W/2,H/2,Math.max(W,H)*0.72);
    r.addColorStop(0,'rgba(0,0,0,0)');r.addColorStop(1,'rgba(0,0,0,0.62)');g.fillStyle=r;g.fillRect(0,0,W,H);}
  return vig;
}
window.addEventListener('resize',resize);resize();
