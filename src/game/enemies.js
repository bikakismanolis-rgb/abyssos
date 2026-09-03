// ---------- spawning & enemy AI ----------
import {G,P} from './state.js';
import {W,H} from '../render/canvas.js';
import {ET,TIER_BOSS,bossTypeFor} from './config.js';
import {rnd,rndi,TAU,lerp,angDiff} from '../util.js';
import {showBanner,showBossBar} from '../ui/hud.js';
import {SFX} from '../audio/sfx.js';
import {burst,ring} from './effects.js';
import {hurtPlayer,mineBlast} from './combat.js';
import {t} from '../i18n/index.js';

export function spawnEnemy(type,x,y,hpMul){
  const t=ET[type];const hp=t.hp*(t.boss?(hpMul||1):G.hpScale);
  const e={type:type,x:x,y:y,vx:0,vy:0,hp:hp,maxHp:hp,spd:t.spd*rnd(0.9,1.1)*(t.boss?1:G.spdScale),dmg:t.dmg,r:t.r,xp:t.xp,col:t.col,
    turn:t.turn,wob:t.wob,wobf:t.wobf||6,boss:!!t.boss,mine:!!t.mine,ghost:!!t.ghost,warn:false,ang:Math.atan2(P.y-y,P.x-x),seed:rnd(0,100),flash:0,stun:0,
    timer:rnd(0.5,2),dash:0,spawnT:5,dead:false,lit:false,lureX:x,lureY:y};
  if(type==='leviathan'){e.body=[];e.orbitA=rnd(0,TAU);}
  if(type==='queen')e.sting=0;
  if(type==='wreck')e.pull=0;
  G.enemies.push(e);return e;
}
function weighted(tab){
  let s=0;for(const r of tab)s+=r[1];let v=Math.random()*s;
  for(const r of tab){v-=r[1];if(v<=0)return r[0];}return tab[0][0];
}
export function spawnWave(){
  const t=G.tier,z=G.zone;
  if(G.enemies.length>170+t*10)return;
  const tab=[['fish',10],['jelly',6],['eel',Math.min(6,3+t*1.5)],['squid',2+t]];
  if(t>=1)tab.push(['angler',2+t*0.5]);
  if(t>=2){tab.push(['urchin',2+t*0.4]);tab.push(['ghost',2+t*0.5]);}
  // deeper zones bring their own creatures, whatever the tier
  if(z>=1){tab.push(['plankton',3]);tab.push(['beacon',1.2]);tab.push(['inksquid',2]);}
  if(z>=2)tab.push(['shrimp',2.2]);
  const type=weighted(tab);
  const n=type==='fish'?rndi(4,7):type==='jelly'?rndi(2,3):type==='urchin'?rndi(2,3):type==='ghost'?2:
          type==='plankton'?10:type==='beacon'?1:type==='shrimp'?rndi(1,2):type==='inksquid'?1+(t>=3?1:0):1+(t>=3?1:0)+(t>=6?1:0);
  const ang=rnd(0,TAU),dist=Math.hypot(W,H)/2+70;
  for(let i=0;i<n;i++)spawnEnemy(type,P.x+Math.cos(ang)*dist+rnd(-50,50),P.y+Math.sin(ang)*dist+rnd(-50,50));
}
// slot 1 = first boss of the cycle, slot 2 = the one that ends it (NG+1)
export function spawnBoss(slot){
  const type=bossTypeFor(slot,G.depth,G.tier);
  const mul=Math.pow(TIER_BOSS,G.tier);
  const ang=rnd(0,TAU),dist=Math.hypot(W,H)/2+120;
  const b=spawnEnemy(type,P.x+Math.cos(ang)*dist,P.y+Math.sin(ang)*dist,mul);
  b.timer=3;b.spawnT=6;b.slot=slot;G.boss=b;
  showBanner(t('banner.boss'),3);
  showBossBar(t('e.'+type));
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
  // beacons lure everything near them: +40% speed for enemies within 400 px of a live beacon
  const beacons=[];for(const e of es)if(!e.dead&&e.type==='beacon')beacons.push(e);
  const far=Math.max(W,H)*1.5;
  for(const e of es){
    if(e.dead)continue;
    const dx=P.x-e.x,dy=P.y-e.y;const d=Math.hypot(dx,dy)||1;const ux=dx/d,uy=dy/d;
    e.flash-=dt;
    if(e.stun>0){e.stun-=dt;e.vx*=Math.exp(-3*dt);e.vy*=Math.exp(-3*dt);}
    else if(e.boss)updateBoss(e,dt,ux,uy,d);
    else{
      const k=1-Math.exp(-e.turn*dt);
      let spd=e.spd;
      if(beacons.length&&e.type!=='beacon'){for(const b of beacons){const bx=b.x-e.x,by=b.y-e.y;if(bx*bx+by*by<400*400){spd*=1.4;break;}}}
      let tx=ux*spd,ty=uy*spd;
      if(e.wob){const w=Math.sin(G.t*e.wobf+e.seed)*e.wob;tx+=-uy*w;ty+=ux*w;}
      if(e.type==='squid'){
        e.timer-=dt;
        if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-1.5*dt);e.vy*=Math.exp(-1.5*dt);}
        else if(e.timer<=0&&d<420){e.timer=rnd(1.8,2.8);e.dash=0.55;e.vx=ux*e.spd*4.2;e.vy=uy*e.spd*4.2;burst(e.x,e.y,3,e.col,50);}
        else{e.vx=lerp(e.vx,tx*0.45,k);e.vy=lerp(e.vy,ty*0.45,k);}
      }
      else if(e.type==='plankton'){
        e.vx=lerp(e.vx,tx,k);e.vy=lerp(e.vy,ty,k);
        if(d<110)G.fog=Math.min(1,G.fog+dt*0.8);   // a swarm around you clouds the water
      }
      else if(e.type==='beacon'){
        // hangs back at ~180 px and shines; the lure is applied to the others above
        const f=d<180?0:1;e.vx=lerp(e.vx,tx*f,k);e.vy=lerp(e.vy,ty*f,k);
      }
      else if(e.type==='inksquid'){
        // keeps its distance and spits ink every 3 s
        let f=d<230?-1:d>320?1:0;let sx=-uy*spd*0.6,sy=ux*spd*0.6;
        e.vx=lerp(e.vx,ux*spd*f+sx,k);e.vy=lerp(e.vy,uy*spd*f+sy,k);
        e.timer-=dt;
        if(e.timer<=0&&d<450){e.timer=3;const a=Math.atan2(dy,dx)+rnd(-0.08,0.08);
          G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*220,vy:Math.sin(a)*220,life:2.5,dmg:12,r:6,kind:'ink'});
          e.vx-=ux*120;e.vy-=uy*120;burst(e.x,e.y,4,e.col,60);SFX.shoot();}
      }
      else if(e.type==='shrimp'){
        // closes to 170 px, then snaps: a sonic pulse that hurts and shoves you back
        const f=d<170?0:1;e.vx=lerp(e.vx,tx*f,k);e.vy=lerp(e.vy,ty*f,k);
        e.timer-=dt;
        if(e.timer<=0){e.timer=2.5;if(d<190){ring(e.x,e.y,150,0.35,e.col,2);SFX.pulse();hurtPlayer(e.dmg);P.vx+=ux*260;P.vy+=uy*260;if(G.state!=='play')return;}}
      }
      else{e.vx=lerp(e.vx,tx,k);e.vy=lerp(e.vy,ty,k);}
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
  if(e.type==='queen'){
    // drifts slowly; lashes with her tentacles when you are close; breeds jellies
    const k=1-Math.exp(-e.turn*dt);e.vx=lerp(e.vx,ux*e.spd,k);e.vy=lerp(e.vy,uy*e.spd,k);
    if(e.sting>0)e.sting-=dt;
    if(e.timer<=0){e.timer=4;if(d<230){e.sting=0.45;SFX.pulse();hurtPlayer(e.dmg);P.vx+=ux*200;P.vy+=uy*200;}}
    if(e.spawnT<=0){e.spawnT=7;for(let i=0;i<3;i++){const a=rnd(0,TAU);spawnEnemy('jelly',e.x+Math.cos(a)*70,e.y+Math.sin(a)*70);}burst(e.x,e.y,10,e.col,60);}
    return;
  }
  if(e.type==='leviathan'){
    // circles you at ~260 px, charges through you every 5 s; the body trails the head
    if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-0.6*dt);e.vy*=Math.exp(-0.6*dt);}
    else{
      e.orbitA+=0.9*dt;
      const gx=P.x+Math.cos(e.orbitA)*260,gy=P.y+Math.sin(e.orbitA)*260;
      const ddx=gx-e.x,ddy=gy-e.y,dd=Math.hypot(ddx,ddy)||1;
      const k=1-Math.exp(-e.turn*dt);e.vx=lerp(e.vx,ddx/dd*e.spd*Math.min(1,dd/80+0.4),k);e.vy=lerp(e.vy,ddy/dd*e.spd*Math.min(1,dd/80+0.4),k);
      if(e.timer<=0&&d<420){e.timer=5;e.dash=0.7;e.vx=ux*480;e.vy=uy*480;SFX.pulse();burst(e.x,e.y,12,e.col,70);}
    }
    e.body.unshift({x:e.x,y:e.y});if(e.body.length>42)e.body.length=42;
    // the body hurts too, a little less than the head
    for(let i=6;i<e.body.length;i+=6){const b=e.body[i];const bx=P.x-b.x,by=P.y-b.y;if(bx*bx+by*by<(P.r+e.r*0.7)*(P.r+e.r*0.7)){hurtPlayer(e.dmg*0.55);break;}}
    if(e.spawnT<=0){e.spawnT=9;for(let i=0;i<2;i++)spawnEnemy('eel',e.x+rnd(-60,60),e.y+rnd(-60,60));}
    return;
  }
  if(e.type==='wreck'){
    // heavy and slow; every 6 s it drags you towards it for 2 s, and it sheds mines
    const k=1-Math.exp(-e.turn*dt);e.vx=lerp(e.vx,ux*e.spd,k);e.vy=lerp(e.vy,uy*e.spd,k);
    if(e.pull>0){e.pull-=dt;if(d<340){P.vx-=ux*640*dt;P.vy-=uy*640*dt;}}
    if(e.timer<=0){e.timer=6;e.pull=2;ring(e.x,e.y,340,0.8,e.col,2);SFX.whale();}
    if(e.spawnT<=0){e.spawnT=9;for(let i=0;i<2;i++)spawnEnemy('urchin',e.x+rnd(-90,90),e.y+rnd(-90,90));}
    return;
  }
  // giant squid & kraken: chase, dash, spawn minions
  if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-0.8*dt);e.vy*=Math.exp(-0.8*dt);}
  else{
    const k=1-Math.exp(-e.turn*dt);e.vx=lerp(e.vx,ux*e.spd,k);e.vy=lerp(e.vy,uy*e.spd,k);
    if(e.timer<=0&&d<520){e.timer=rnd(3,4.5);e.dash=0.8;e.vx=ux*430;e.vy=uy*430;SFX.pulse();burst(e.x,e.y,12,e.col,70);}
  }
  if(e.spawnT<=0){e.spawnT=8;const mt=e.type==='boss1'?'fish':'squid';for(let i=0;i<3;i++)spawnEnemy(mt,e.x+rnd(-70,70),e.y+rnd(-70,70));}
}

// Enemy projectiles (ink): move, expire, hit the player
export function updateEnemyBullets(dt){
  for(const b of G.ebullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    const dx=P.x-b.x,dy=P.y-b.y;const rr=P.r+b.r;
    if(dx*dx+dy*dy<rr*rr){b.life=0;hurtPlayer(b.dmg);if(b.kind==='ink')G.fog=Math.min(1,G.fog+0.6);burst(b.x,b.y,6,'90,60,130',70);if(G.state!=='play')return;}
  }
  G.ebullets=G.ebullets.filter(function(b){return b.life>0;});
}
