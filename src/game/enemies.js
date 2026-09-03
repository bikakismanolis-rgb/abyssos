// ---------- spawning & enemy AI ----------
import {G,P} from './state.js';
import {W,H} from '../render/canvas.js';
import {ET,TIER_BOSS} from './config.js';
import {rnd,rndi,TAU,lerp,angDiff} from '../util.js';
import {showBanner,showBossBar} from '../ui/hud.js';
import {SFX} from '../audio/sfx.js';
import {burst} from './effects.js';
import {hurtPlayer,mineBlast} from './combat.js';

export function spawnEnemy(type,x,y,hpMul){
  const t=ET[type];const hp=t.hp*(t.boss?(hpMul||1):G.hpScale);
  const e={type:type,x:x,y:y,vx:0,vy:0,hp:hp,maxHp:hp,spd:t.spd*rnd(0.9,1.1)*(t.boss?1:G.spdScale),dmg:t.dmg,r:t.r,xp:t.xp,col:t.col,
    turn:t.turn,wob:t.wob,wobf:t.wobf||6,boss:!!t.boss,mine:!!t.mine,ghost:!!t.ghost,warn:false,ang:Math.atan2(P.y-y,P.x-x),seed:rnd(0,100),flash:0,stun:0,
    timer:rnd(0.5,2),dash:0,spawnT:5,dead:false,lit:false,lureX:x,lureY:y};
  G.enemies.push(e);return e;
}
function weighted(tab){
  let s=0;for(const r of tab)s+=r[1];let v=Math.random()*s;
  for(const r of tab){v-=r[1];if(v<=0)return r[0];}return tab[0][0];
}
export function spawnWave(){
  const t=G.tier;
  if(G.enemies.length>170+t*10)return;
  const tab=[['fish',10],['jelly',6],['eel',Math.min(6,3+t*1.5)],['squid',2+t]];
  if(t>=1)tab.push(['angler',2+t*0.5]);
  if(t>=2){tab.push(['urchin',2+t*0.4]);tab.push(['ghost',2+t*0.5]);}
  const type=weighted(tab);
  const n=type==='fish'?rndi(4,7):type==='jelly'?rndi(2,3):type==='urchin'?rndi(2,3):type==='ghost'?2:1+(t>=3?1:0)+(t>=6?1:0);
  const ang=rnd(0,TAU),dist=Math.hypot(W,H)/2+70;
  for(let i=0;i<n;i++)spawnEnemy(type,P.x+Math.cos(ang)*dist+rnd(-50,50),P.y+Math.sin(ang)*dist+rnd(-50,50));
}
export function spawnBoss(type){
  const mul=Math.pow(TIER_BOSS,G.tier);
  const ang=rnd(0,TAU),dist=Math.hypot(W,H)/2+120;
  const b=spawnEnemy(type,P.x+Math.cos(ang)*dist,P.y+Math.sin(ang)*dist,mul);
  b.timer=3;b.spawnT=6;G.boss=b;
  showBanner('Κάτι μεγάλο πλησιάζει',3);
  showBossBar(ET[type].name);
  SFX.whale();
}
export function nearestEnemies(n,maxD){
  const md=(maxD||1e9)*(maxD||1e9);const arr=[];
  for(const e of G.enemies){if(e.dead)continue;const d=(e.x-P.x)*(e.x-P.x)+(e.y-P.y)*(e.y-P.y);if(d<md)arr.push({e:e,d:d});}
  arr.sort(function(a,b){return a.d-b.d;});
  return arr.slice(0,n).map(function(o){return o.e;});
}

export function updateEnemies(dt){
  const es=G.enemies,n=es.length;
  if(n<150){
    for(let i=0;i<n;i++){const a=es[i];if(a.dead)continue;
      for(let j=i+1;j<n;j++){const b=es[j];if(b.dead)continue;
        let dx=b.x-a.x;if(dx>40||dx<-40)continue;let dy=b.y-a.y;if(dy>40||dy<-40)continue;
        const d2=dx*dx+dy*dy,min=(a.r+b.r)*0.85;
        if(d2<min*min&&d2>0.01){const d=Math.sqrt(d2),f=(min-d)/d*0.5;dx*=f;dy*=f;
          if(!a.boss){a.x-=dx;a.y-=dy;}if(!b.boss){b.x+=dx;b.y+=dy;}}
      }
    }
  }
  const far=Math.max(W,H)*1.5;
  for(const e of es){
    if(e.dead)continue;
    const dx=P.x-e.x,dy=P.y-e.y;const d=Math.hypot(dx,dy)||1;const ux=dx/d,uy=dy/d;
    e.flash-=dt;
    if(e.stun>0){e.stun-=dt;e.vx*=Math.exp(-3*dt);e.vy*=Math.exp(-3*dt);}
    else if(e.boss)updateBoss(e,dt,ux,uy,d);
    else{
      const k=1-Math.exp(-e.turn*dt);
      let tx=ux*e.spd,ty=uy*e.spd;
      if(e.wob){const w=Math.sin(G.t*e.wobf+e.seed)*e.wob;tx+=-uy*w;ty+=ux*w;}
      if(e.type==='squid'){
        e.timer-=dt;
        if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-1.5*dt);e.vy*=Math.exp(-1.5*dt);}
        else if(e.timer<=0&&d<420){e.timer=rnd(1.8,2.8);e.dash=0.55;e.vx=ux*e.spd*4.2;e.vy=uy*e.spd*4.2;burst(e.x,e.y,3,e.col,50);}
        else{e.vx=lerp(e.vx,tx*0.45,k);e.vy=lerp(e.vy,ty*0.45,k);}
      }else{e.vx=lerp(e.vx,tx,k);e.vy=lerp(e.vy,ty,k);}
    }
    e.x+=e.vx*dt;e.y+=e.vy*dt;
    if(Math.hypot(e.vx,e.vy)>3)e.ang+=angDiff(e.ang,Math.atan2(e.vy,e.vx))*Math.min(1,10*dt);
    if(e.mine){e.warn=d<170;if(d<e.r+P.r+30){mineBlast(e,true);if(G.state!=='play')return;continue;}}
    if(d<e.r+P.r){hurtPlayer(e.dmg);if(!e.boss){e.vx-=ux*160;e.vy-=uy*160;}else{P.vx-=ux*220;P.vy-=uy*220;}if(G.state!=='play')return;}
    if(d>far&&!e.boss)e.dead=true;
  }
  G.enemies=es.filter(function(e){return !e.dead;});
}
export function updateBoss(e,dt,ux,uy,d){
  e.timer-=dt;e.spawnT-=dt;
  if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-0.8*dt);e.vy*=Math.exp(-0.8*dt);}
  else{
    const k=1-Math.exp(-e.turn*dt);e.vx=lerp(e.vx,ux*e.spd,k);e.vy=lerp(e.vy,uy*e.spd,k);
    if(e.timer<=0&&d<520){e.timer=rnd(3,4.5);e.dash=0.8;e.vx=ux*430;e.vy=uy*430;SFX.pulse();burst(e.x,e.y,12,e.col,70);}
  }
  if(e.spawnT<=0){e.spawnT=8;const mt=e.type==='boss1'?'fish':'squid';for(let i=0;i<3;i++)spawnEnemy(mt,e.x+rnd(-70,70),e.y+rnd(-70,70));}
}
