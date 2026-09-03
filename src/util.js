// ---------- helpers ----------
export const $=id=>document.getElementById(id);
export const TAU=Math.PI*2;
export const rnd=(a,b)=>a+Math.random()*(b-a);
export const rndi=(a,b)=>Math.floor(rnd(a,b+1));
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export function angDiff(a,b){let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;}
export function fmtDepth(m){return String(Math.floor(m)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
export function fmtTime(s){const m=Math.floor(s/60),x=Math.floor(s%60);return m+':'+(x<10?'0':'')+x;}
export function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
