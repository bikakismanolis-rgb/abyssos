// ---------- spawning & enemy AI ----------
// Creature behaviour is chosen by the `ai` field of its entry in config.js ET; guardians are driven
// by their list of attack modules (`atk`). Nothing here knows a place or a chapter by name.
import {G,P} from './state.js';
import {W,H} from '../render/canvas.js';
import {ET} from './config.js';
import {rnd,rndi,TAU,lerp,angDiff} from '../util.js';
import {showBanner,showBossBar} from '../ui/hud.js';
import {SFX} from '../audio/sfx.js';
import {burst,ring} from './effects.js';
import {hurtPlayer,mineBlast} from './combat.js';
import {addHazard,slamAt} from './hazards.js';
import {t} from '../i18n/index.js';
import {difficultyAt} from './run-rules.js';
import {placeAt,spawnTable} from './places.js';

function every(a){return Array.isArray(a.every)?rnd(a.every[0],a.every[1]):a.every;}
export function spawnEnemy(type,x,y,hpMul){
  const t=ET[type];const hp=t.hp*(t.boss?(hpMul||1):G.hpScale);
  const e={type:type,x:x,y:y,vx:0,vy:0,hp:hp,maxHp:hp,spd:t.spd*rnd(0.9,1.1)*(t.boss?1:G.spdScale),dmg:t.dmg,r:t.r,xp:t.xp,col:t.col,
    turn:t.turn||1,wob:t.wob||0,wobf:t.wobf||6,boss:!!t.boss,mine:!!t.mine,ghost:!!t.ghost,armor:t.armor||0,ai:t.ai||'chase',
    warn:false,ang:Math.atan2(P.y-y,P.x-x),seed:rnd(0,100),flash:0,stun:0,stunReady:0,
    timer:rnd(0.5,2),dash:0,mode:0,dead:false,lit:false,lureX:x,lureY:y};
  if(t.chain||t.trail)e.body=[];
  if(t.orbit&&!t.boss){e.orbitA=rnd(0,TAU);e.orbitDir=Math.random()<0.5?-1:1;}
  if(t.boss){
    e.orbitA=rnd(0,TAU);e.sting=0;e.cloak=0;e.splitDone=0;e.lunges=[];e.pullT=0;
    e.at=t.atk.map(function(a){return {t:a.first!==undefined?a.first:(a.every?every(a):0),tell:0,left:0};});
  }
  G.enemies.push(e);return e;
}
function weighted(tab){
  let s=0;for(const r of tab)s+=r[1];let v=Math.random()*s;
  for(const r of tab){v-=r[1];if(v<=0)return r[0];}return tab[0][0];
}
export function spawnWave(){
  const tier=G.tier;
  if(G.enemies.length>=Math.min(240,170+tier*10))return;
  const type=weighted(spawnTable(tier,G.bossesCleared)),pack=ET[type].pack;
  // loners come in twos and threes in the later chapters, as they always did
  const n=pack?rndi(pack[0],pack[1]):1+(tier>=3?1:0)+(tier>=6?1:0);
  const ang=rnd(0,TAU),dist=Math.hypot(W,H)/2+70;
  for(let i=0;i<n;i++)spawnEnemy(type,P.x+Math.cos(ang)*dist+rnd(-50,50),P.y+Math.sin(ang)*dist+rnd(-50,50));
}
// The guardian of the place just reached. The descent stays locked until it dies.
export function spawnBoss(slot){
  const place=placeAt(G.tier,slot),def=ET[place.boss];
  const mul=difficultyAt(G.depth,G.tier).bossHp;
  // a guardian rooted to its place rises close by; the others swim in from beyond the screen
  const ang=rnd(0,TAU),dist=def.move==='anchor'?Math.min(W,H)*0.5+90:Math.hypot(W,H)/2+120;
  const b=spawnEnemy(place.boss,P.x+Math.cos(ang)*dist,P.y+Math.sin(ang)*dist,mul);
  b.slot=slot;b.hitsTaken=0;b.place=place;G.boss=b;
  G.ev.active=null;G.ev.next=rnd(20,35);
  const name=place.id?t('pl.'+place.id+'.name'):t('pl.echo');
  showBanner(name,3.2);
  showBossBar(t('e.'+place.boss));
  SFX.whale();
  return b;
}
export function nearestEnemies(n,maxD){
  const md=(maxD||1e9)*(maxD||1e9);const arr=[];
  for(const e of G.enemies){if(e.dead||e.cloak>0)continue;const d=(e.x-P.x)*(e.x-P.x)+(e.y-P.y)*(e.y-P.y);if(d<md)arr.push({e:e,d:d});}
  arr.sort(function(a,b){return a.d-b.d;});
  return arr.slice(0,n).map(function(o){return o.e;});
}
// A trail of points behind the head, spaced by distance so it does not depend on the frame rate
function trail(e,n,gap){
  const b=e.body,h=b[0];
  if(!h||(h.x-e.x)*(h.x-e.x)+(h.y-e.y)*(h.y-e.y)>=gap*gap){b.unshift({x:e.x,y:e.y});if(b.length>n)b.length=n;}
}
function trailHits(e,step,rad,dmg){
  const b=e.body;
  for(let i=step;i<b.length;i+=step){const bx=P.x-b[i].x,by=P.y-b[i].y;if(bx*bx+by*by<(P.r+rad)*(P.r+rad)){hurtPlayer(dmg);return;}}
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
  const beacons=[];for(const e of es)if(!e.dead&&e.ai==='beacon')beacons.push(e);
  const far=Math.max(W,H)*1.5;
  for(const e of es){
    if(e.dead)continue;
    const dx=P.x-e.x,dy=P.y-e.y;const d=Math.hypot(dx,dy)||1;const ux=dx/d,uy=dy/d;
    e.flash-=dt;
    if(e.stun>0){e.stun-=dt;e.vx*=Math.exp(-3*dt);e.vy*=Math.exp(-3*dt);}
    else if(e.boss){updateBoss(e,dt,ux,uy,d);if(G.state!=='play')return;}
    else{
      const def=ET[e.type],k=1-Math.exp(-e.turn*dt);
      let spd=e.spd;
      if(beacons.length&&e.ai!=='beacon'){for(const b of beacons){const bx=b.x-e.x,by=b.y-e.y;if(bx*bx+by*by<400*400){spd*=1.4;break;}}}
      let tx=ux*spd,ty=uy*spd;
      if(e.wob){const w=Math.sin(G.t*e.wobf+e.seed)*e.wob;tx+=-uy*w;ty+=ux*w;}
      switch(e.ai){
      case 'dash':{
        const p=def.dashP;e.timer-=dt;
        if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-1.5*dt);e.vy*=Math.exp(-1.5*dt);}
        else if(e.timer<=0&&d<p.range){e.timer=rnd(p.cd[0],p.cd[1]);e.dash=p.dur;e.vx=ux*e.spd*p.mul;e.vy=uy*e.spd*p.mul;burst(e.x,e.y,3,e.col,50);}
        else{e.vx=lerp(e.vx,tx*p.cruise,k);e.vy=lerp(e.vy,ty*p.cruise,k);}
        break;}
      case 'fogswarm':
        e.vx=lerp(e.vx,tx,k);e.vy=lerp(e.vy,ty,k);
        if(d<110)G.fog=Math.min(1,G.fog+dt*0.8);   // a swarm around you clouds the water
        break;
      case 'beacon':{
        // hangs back at ~180 px and shines; the lure is applied to the others above
        const f=d<180?0:1;e.vx=lerp(e.vx,tx*f,k);e.vy=lerp(e.vy,ty*f,k);
        break;}
      case 'shooter':{
        // keeps its distance, warns, then shoots where it warned
        const s=def.shot;let f=d<s.near?-1:d>s.far?1:0;const sx=-uy*spd*0.6,sy=ux*spd*0.6;
        e.vx=lerp(e.vx,ux*spd*f+sx,k);e.vy=lerp(e.vy,uy*spd*f+sy,k);
        e.timer-=dt;
        if(e.timer<=0.65&&d<s.far+130&&e.inkAim===undefined){e.inkAim=Math.atan2(dy,dx);ring(e.x,e.y,32,0.65,'255,160,235',2);}
        if(e.timer<=0&&e.inkAim!==undefined){e.timer=Math.max(s.cd*0.6,s.cd-G.tier*0.1);const a=e.inkAim;delete e.inkAim;
          for(let i=0;i<s.n;i++)fireShot(e,a+(i-(s.n-1)/2)*s.spread,s.speed,s.kind,s.dmg,s.fog);
          e.vx-=ux*120;e.vy-=uy*120;burst(e.x,e.y,4,e.col,60);SFX.shoot();}
        break;}
      case 'snapper':{
        // closes to 170 px, then snaps: a sonic pulse that hurts and shoves you back
        const f=d<170?0:1;e.vx=lerp(e.vx,tx*f,k);e.vy=lerp(e.vy,ty*f,k);
        e.timer-=dt;
        if(e.timer<=0){e.timer=2.5;if(d<190){ring(e.x,e.y,150,0.35,e.col,2);SFX.pulse();hurtPlayer(e.dmg);P.vx+=ux*260;P.vy+=uy*260;if(G.state!=='play')return;}}
        break;}
      case 'ambush':{
        // creeps closer, freezes for a breath, then lunges
        const L=def.lunge;e.timer-=dt;
        if(e.mode===2){e.dash-=dt;e.vx*=Math.exp(-1.2*dt);e.vy*=Math.exp(-1.2*dt);if(e.dash<=0){e.mode=0;e.timer=L.rest;}}
        else if(e.mode===1){e.dash-=dt;e.vx*=Math.exp(-8*dt);e.vy*=Math.exp(-8*dt);if(e.dash<=0){e.mode=2;e.dash=L.dur;e.vx=ux*e.spd*L.mul;e.vy=uy*e.spd*L.mul;burst(e.x,e.y,4,e.col,70);}}
        else if(e.timer<=0&&d<L.near){e.mode=1;e.dash=0.35;ring(e.x,e.y,e.r+14,0.35,e.col,2);}
        else{const c=e.timer>0?0.3:0.55;e.vx=lerp(e.vx,tx*c,k);e.vy=lerp(e.vy,ty*c,k);}
        break;}
      case 'charger':{
        // lines up from a distance, shows the line, then goes straight down it
        const C=def.charge;e.timer-=dt;
        if(e.mode===2){e.dash-=dt;if(e.dash<=0){e.mode=0;e.timer=C.rest;delete e.chargeAim;}}
        else if(e.mode===1){e.dash-=dt;e.vx*=Math.exp(-6*dt);e.vy*=Math.exp(-6*dt);
          if(e.dash<=0){e.mode=2;e.dash=C.dur;e.vx=Math.cos(e.chargeAim)*C.speed;e.vy=Math.sin(e.chargeAim)*C.speed;burst(e.x,e.y,5,e.col,80);}}
        else if(e.timer<=0&&d<C.near){e.mode=1;e.dash=C.tell;e.chargeAim=Math.atan2(dy,dx);e.chargeLen=C.speed*C.dur;}
        else{const c=e.timer>0?0.55:1;e.vx=lerp(e.vx,tx*c,k);e.vy=lerp(e.vy,ty*c,k);}
        break;}
      case 'circler':{
        // rides a circle around you and cuts in across it
        const O=def.orbit;e.timer-=dt;
        if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-1.2*dt);e.vy*=Math.exp(-1.2*dt);}
        else if(e.timer<=0&&d<O.r+120){e.timer=O.dive+rnd(-0.5,0.5);e.dash=0.45;e.vx=ux*e.spd*3;e.vy=uy*e.spd*3;}
        else{
          e.orbitA+=e.orbitDir*spd/O.r*dt;
          const gx=P.x+Math.cos(e.orbitA)*O.r-e.x,gy=P.y+Math.sin(e.orbitA)*O.r-e.y,gd=Math.hypot(gx,gy)||1,m=Math.min(1,gd/60+0.3);
          e.vx=lerp(e.vx,gx/gd*spd*m,k);e.vy=lerp(e.vy,gy/gd*spd*m,k);
        }
        break;}
      case 'puller':{
        // keeps away and sings; the song drags the vessel towards her
        const S=def.song,f=d<S.keep?-0.6:d>S.keep+80?1:0;
        e.vx=lerp(e.vx,tx*f,k);e.vy=lerp(e.vy,ty*f,k);
        e.timer-=dt;
        if(e.sing>0){e.sing-=dt;if(d<S.radius){P.vx-=ux*S.force*dt*4;P.vy-=uy*S.force*dt*4;}
          e.noteT=(e.noteT||0)-dt;if(e.noteT<=0){e.noteT=0.45;ring(e.x,e.y,S.radius*0.5,0.8,e.col,1.5);}}
        else if(e.timer<=0&&d<S.radius){e.timer=S.every;e.sing=S.dur;SFX.sonar();}
        break;}
      case 'chain':{
        e.vx=lerp(e.vx,tx,k);e.vy=lerp(e.vy,ty,k);
        const c=def.chain;trail(e,c.n,c.gap);trailHits(e,3,e.r*0.7,e.dmg*c.hit);if(G.state!=='play')return;
        break;}
      default:
        e.vx=lerp(e.vx,tx,k);e.vy=lerp(e.vy,ty,k);
      }
    }
    if(e.boss&&ET[e.type].move==='anchor'){e.vx=e.vy=0;}   // rooted: torpedoes and sonar cannot push it off its place
    else{e.x+=e.vx*dt;e.y+=e.vy*dt;}
    if(Math.hypot(e.vx,e.vy)>3)e.ang+=angDiff(e.ang,Math.atan2(e.vy,e.vx))*Math.min(1,10*dt);
    if(e.mine){e.warn=d<170;if(d<e.r+P.r+30){mineBlast(e,true);if(G.state!=='play')return;continue;}}
    if(d<e.r+P.r){
      if(e.ai==='entangle'){
        // a plastic bag does not bite: it wraps the propeller
        P.slowT=2.6;e.dead=true;G.kills++;burst(e.x,e.y,8,e.col,70);SFX.hurt();
        if(!G.bagWarned){G.bagWarned=true;showBanner(t('banner.bag'),2.5);}
      }else{
        hurtPlayer(e.dmg);if(!e.boss){e.vx-=ux*160;e.vy-=uy*160;}else{P.vx+=ux*220;P.vy+=uy*220;}   // both shoves part the two: ux points from the creature to the vessel
        if(G.state!=='play')return;
      }
    }
    if(d>far&&!e.boss)e.dead=true;
  }
  G.enemies=es.filter(function(e){return !e.dead;});
}

// ---------- guardians ----------
function summon(e,type,n){
  if(G.enemies.length>210)return;
  for(let i=0;i<n;i++){const a=rnd(0,TAU),r=e.r+rnd(20,70);spawnEnemy(type,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);}
  burst(e.x,e.y,10,e.col,60);
}
export function updateBoss(e,dt,ux,uy,d){
  const def=ET[e.type],k=1-Math.exp(-e.turn*dt);
  const rage=e.hp<e.maxHp*0.35?1.25:1;
  if(e.cloak>0)e.cloak-=dt;
  if(e.sting>0)e.sting-=dt;
  // ---- movement ----
  if(e.ram>0){e.ram-=dt;}                                           // a ram keeps its line
  else if(e.dash>0){e.dash-=dt;e.vx*=Math.exp(-0.8*dt);e.vy*=Math.exp(-0.8*dt);
    if(e.dash<=0&&e.dashLeft>0){e.dashLeft--;e.dash=e.dashDur;e.vx=ux*e.dashSpeed;e.vy=uy*e.dashSpeed;SFX.pulse();}}
  else if(e.hold>0){e.hold-=dt;e.vx*=Math.exp(-6*dt);e.vy*=Math.exp(-6*dt);}
  else if(def.move==='anchor'){e.vx*=Math.exp(-4*dt);e.vy*=Math.exp(-4*dt);}
  else if(def.move==='orbit'){
    e.orbitA+=0.9*dt;
    const gx=P.x+Math.cos(e.orbitA)*def.orbit-e.x,gy=P.y+Math.sin(e.orbitA)*def.orbit-e.y,gd=Math.hypot(gx,gy)||1,m=Math.min(1,gd/80+0.4);
    e.vx=lerp(e.vx,gx/gd*e.spd*m,k);e.vy=lerp(e.vy,gy/gd*e.spd*m,k);
  }
  else if(def.move==='keep'){
    const f=d<def.keep[0]?-1:d>def.keep[1]?1:0;
    e.vx=lerp(e.vx,ux*e.spd*f-uy*e.spd*0.5,k);e.vy=lerp(e.vy,uy*e.spd*f+ux*e.spd*0.5,k);
  }
  else{e.vx=lerp(e.vx,ux*e.spd,k);e.vy=lerp(e.vy,uy*e.spd,k);}
  if(def.trail){trail(e,def.trail,6);trailHits(e,5,e.r*0.7,e.dmg*0.55);if(G.state!=='play')return;}
  if(e.pullT>0){e.pullT-=dt;if(d<e.pullR){P.vx-=ux*e.pullF*dt;P.vy-=uy*e.pullF*dt;}}
  e.lunges=e.lunges.filter(function(l){l.t+=dt;return l.t<l.dur;});

  // ---- attacks ----
  for(let i=0;i<def.atk.length;i++){
    const a=def.atk[i],s=e.at[i];
    if(a.k==='aura'){if(d<a.radius+P.r){hurtPlayer(a.dps);if(G.state!=='play')return;}continue;}
    if(a.k==='whirl'){
      if(!s.made){s.made=!!addHazard({kind:'whirl',x:e.x+ux*a.dist,y:e.y+uy*a.dist,r:a.radius,core:a.core,force:a.force,dmg:a.dps,dur:1e9,owner:e,col:'150,200,255'});}
      continue;}
    if(a.k==='split'){
      if(e.splitDone<a.at.length&&e.hp<e.maxHp*a.at[e.splitDone]){e.splitDone++;summon(e,a.type,a.n);ring(e.x,e.y,e.r*2.4,0.6,e.col,3);SFX.boom();}
      continue;}
    // a telegraph in progress: finish it
    if(s.tell>0){
      s.tell-=dt;
      if(s.tell<=0)strike(e,a,s,ux,uy,d);
      if(G.state!=='play')return;
      continue;
    }
    s.t-=dt*rage;
    if(s.t>0)continue;
    // the attack is due: is there a reason to use it now?
    if((a.k==='dash'||a.k==='fan')&&d>a.range){s.t=0.3;continue;}
    if(a.k==='sting'&&d>a.range+90){s.t=0.4;continue;}
    if((a.k==='ram'||a.k==='dash')&&(e.ram>0||e.dash>0)){s.t=0.2;continue;}
    s.t=every(a);
    if(a.tell){
      s.tell=a.tell;
      if(a.k==='fan'){e.inkAim=Math.atan2(uy,ux);ring(e.x,e.y,e.r+20,a.tell,'255,160,235',3);}
      else if(a.k==='ram'){e.hold=a.tell;e.chargeAim=Math.atan2(uy,ux);e.chargeLen=a.speed*a.dur;ring(e.x,e.y,e.r+30,a.tell,e.col,3);SFX.whale();}
      else if(a.k==='dash'){e.hold=a.tell;ring(e.x,e.y,e.r+18,a.tell,e.col,2);}
      else if(a.k==='sting'){e.stingWarn={r:a.range,t:0,dur:a.tell};}
      else if(a.k==='nova'){e.hold=Math.max(e.hold||0,a.tell*0.6);ring(e.x,e.y,e.r+60,a.tell,'255,220,160',3);}
      else if(a.k==='lunge'){
        // one head picks the spot where you are now; it lands there after the warning
        const reach=Math.min(a.reach,d),x=e.x+ux*reach,y=e.y+uy*reach;
        slamAt(x,y,a.r,a.tell,e.dmg*a.dmg,e.col);
        e.lunges.push({i:rndi(0,a.heads-1),x:x,y:y,t:0,dur:a.tell+0.5,tell:a.tell});
        s.tell=0;
      }
      else if(a.k==='slam'){
        // warned circles: one under the vessel, the rest scattered around it
        for(let j=0;j<a.n;j++){const an=rnd(0,TAU),rr=j?rnd(90,230):rnd(0,30);slamAt(P.x+Math.cos(an)*rr,P.y+Math.sin(an)*rr,a.r,a.tell+j*0.12,e.dmg*a.dmg,e.col);}
        s.tell=0;
      }
    }else strike(e,a,s,ux,uy,d);
    if(G.state!=='play')return;
  }
}
// The moment an attack lands, after its warning (if it had one)
function strike(e,a,s,ux,uy,d){
  switch(a.k){
  case 'dash':
    e.dash=a.dur;e.dashDur=a.dur;e.dashSpeed=a.speed;e.dashLeft=(a.chain||1)-1;e.vx=ux*a.speed;e.vy=uy*a.speed;SFX.pulse();burst(e.x,e.y,12,e.col,70);break;
  case 'ram':
    e.ram=a.dur;e.vx=Math.cos(e.chargeAim)*a.speed;e.vy=Math.sin(e.chargeAim)*a.speed;delete e.chargeAim;SFX.boom();burst(e.x,e.y,16,e.col,90);G.shake=Math.max(G.shake,4);break;
  case 'fan':{
    const aim=e.inkAim!==undefined?e.inkAim:Math.atan2(uy,ux);delete e.inkAim;
    for(let i=0;i<a.n;i++)fireShot(e,aim+(i-(a.n-1)/2)*a.spread,a.speed,a.kind,12);
    SFX.shoot();break;}
  case 'nova':{
    const ph=rnd(0,TAU);for(let i=0;i<a.n;i++)fireShot(e,ph+i*TAU/a.n,a.speed,a.kind,12);
    SFX.pulse();break;}
  case 'sting':
    delete e.stingWarn;e.sting=0.45;SFX.pulse();ring(e.x,e.y,a.range,0.3,e.col,3);
    if(d<a.range){hurtPlayer(e.dmg);P.vx+=ux*a.push;P.vy+=uy*a.push;}
    break;
  case 'summon':summon(e,a.type,a.n);break;
  case 'pull':e.pullT=a.dur;e.pullR=a.radius;e.pullF=a.force;ring(e.x,e.y,a.radius,0.8,e.col,2);SFX.whale();break;
  case 'fog':G.fog=Math.min(1,G.fog+a.amount);ring(e.x,e.y,e.r*3,0.8,'90,60,130',3);break;
  case 'vents':
    for(let j=0;j<a.n;j++){const an=rnd(0,TAU),rr=rnd(110,250);
      addHazard({kind:'vent',x:P.x+Math.cos(an)*rr,y:P.y+Math.sin(an)*rr,r:80,tell:0.9,dur:5.5,dmg:10,col:'255,170,80'});}
    break;
  case 'teleport':{
    ring(e.x,e.y,e.r*2,0.5,e.col,3);burst(e.x,e.y,14,e.col,120);
    const an=rnd(0,TAU),rr=rnd(260,340);e.x=P.x+Math.cos(an)*rr;e.y=P.y+Math.sin(an)*rr;e.vx=e.vy=0;e.hold=0.6;
    if(e.body)e.body.length=0;
    ring(e.x,e.y,e.r*2,0.5,e.col,3);SFX.sonar();break;}
  case 'cloak':e.cloak=a.dur;ring(e.x,e.y,e.r*2,0.6,e.col,2);break;
  }
}

// Enemy projectiles: move, expire, hit the player. Ink and mucus also cloud the water.
const FOGGY={ink:0.6,mucus:0.5,poison:0.35};
export function fireShot(e,a,speed,kind,dmg,fog){
  if(G.ebullets.length>=140)return;
  G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:kind==='ink'?3.5:Math.min(4.5,900/speed),dmg:dmg,r:kind==='shell'||kind==='rock'?10:8,kind:kind,fog:fog!==undefined?fog:(FOGGY[kind]||0)});
}
export function updateEnemyBullets(dt){
  for(const b of G.ebullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    const dx=P.x-b.x,dy=P.y-b.y;const rr=P.r+b.r;
    if(dx*dx+dy*dy<rr*rr){b.life=0;hurtPlayer(b.dmg);if(b.fog)G.fog=Math.min(1,G.fog+b.fog);burst(b.x,b.y,6,'90,60,130',70);if(G.state!=='play')return;}
  }
  G.ebullets=G.ebullets.filter(function(b){return b.life>0;});
}
