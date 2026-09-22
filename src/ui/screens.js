// ---------- screens: start, level-up, pause, settings, shop, achievements, end of dive ----------
import {$,fmtDepth,fmtTime} from '../util.js';
import {G,P,newGame} from '../game/state.js';
import {WEAPONS,PASSIVES,VESSELS,EVOLUTIONS,CONDITIONS} from '../game/config.js';
import {CHAPTERS,PLACES,LAST_TIER,ROMAN,chapterStart,travel} from '../game/places.js';
import {travelled} from '../game/run-rules.js';
import {tierLabel,chapterName,chapterShort} from './labels.js';
import {optionChanges,shopChanges} from './upgrade-details.js';
import {levelOptions,chooseOption,pips,weaponSlots,weaponSlotsUsed,passiveSlots} from '../game/progression.js';
import {SHOP,level,maxLevel,cost,light,buy,lightFor,addLight} from '../game/shop.js';
import {ACHIEVEMENTS,PLATINUM_IDS,has,count,check as checkAchievements} from '../game/achievements.js';
import {joyEnd} from './input.js';
import {SFX} from '../audio/sfx.js';
import {showBanner,hideBanner,hideBossBar,resetHud,invalidateHud} from './hud.js';
import {save,saveNow,recordRun} from '../save.js';
import {settings,setSetting,buzz} from '../settings.js';
import {t,deviceLang} from '../i18n/index.js';

function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}
function visible(id){return !$(id).classList.contains('hidden');}
function fmtLong(s){const h=Math.floor(s/3600);return h>0?h+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0'):fmtTime(s);}

// ---------- level up ----------
function renderCards(){
  $('lvtitle').textContent=t('levelup.title',{n:G.level-G.pendingLevels+1});
  $('slots').textContent=t('levelup.slots',{w:weaponSlotsUsed(),ws:weaponSlots(),lamp:t('w.lamp.name'),p:Object.keys(G.passives).length,ps:passiveSlots()});
  const wrap=$('cards');wrap.innerHTML='';
  levelOptions().forEach(function(o){
    const b=document.createElement('button');b.className='card';
    if(o.kind==='heal'){b.innerHTML='<div class="top"><b>'+t('levelup.heal')+'</b></div><p>'+t('levelup.healDesc')+'</p>';}
    else if(o.kind==='x'){const ev=EVOLUTIONS[o.key];b.classList.add('evo');b.innerHTML='<div class="top"><b>'+t('x.'+ev.key+'.name')+'<em class="sp">'+t('levelup.evolution')+'</em></b></div><p>'+t('x.'+ev.key+'.desc')+'</p>';}
    else if(o.kind==='s'){b.innerHTML='<div class="top"><b>'+t('s.'+o.key+'.name')+'<em class="sp">'+t('levelup.special')+'</em></b></div><p>'+t('s.'+o.key+'.desc')+'</p>';}
    else{
      const def=o.kind==='w'?WEAPONS[o.key]:PASSIVES[o.key],pre=o.kind==='w'?'w.':'p.';
      b.innerHTML='<div class="top"><b>'+t(pre+o.key+'.name')+(o.lvl===0?'<em>'+t(o.kind==='w'?'levelup.newWeapon':'levelup.newPassive')+'</em>':'')+'</b><span class="pips">'+pips(o.lvl+1,def.max)+'</span></div><p>'+t(pre+o.key+'.desc')+'</p>';
    }
    const details=document.createElement('p');details.className='changes';
    details.textContent=optionChanges(o,P).join('\n');b.appendChild(details);
    b.addEventListener('click',function(){pick(o);});
    wrap.appendChild(b);
  });
  const rr=$('rerollbtn');
  rr.classList.toggle('hidden',!(G.rerolls>0));
  rr.textContent=t('levelup.reroll',{n:G.rerolls});
}
export function openLevelUp(){
  if(G.state==='ending'||G.state==='over')return;   // the level waits; it opens with the next light collected
  G.state='levelup';joyEnd();SFX.levelup();
  renderCards();
  show('levelup');
}
function pick(o){
  chooseOption(o);
  if(G.pendingLevels>0){openLevelUp();return;}
  hide('levelup');G.state='play';
}
$('rerollbtn').addEventListener('click',function(){if(G.state==='levelup'&&G.rerolls>0){G.rerolls--;SFX.pickup();renderCards();}});

// ---------- end of dive ----------
export function gameOver(){
  G.state='over';joyEnd();
  const d=Math.floor(G.depth),m=t('over.m');
  const isRecord=recordRun(d,G.tier,G.t,G.kills);
  save.meta.resume=null;   // the dive is over; there is nothing left to continue
  const earned=lightFor(travelled(G),G.kills,G.tier,G.startTier,G.mods.light);addLight(earned.total);
  G.newAch.push.apply(G.newAch,checkAchievements(G,P,true));
  const rows=[[t('over.depth'),fmtDepth(d)+' '+m],[t('over.time'),fmtTime(G.t)],[t('over.tier'),tierLabel(G.tier)],
    [t('over.creatures'),G.kills],[t('over.level'),G.level],[t('over.record'),chapterShort(save.rankedBest.tier)+' · '+fmtDepth(save.rankedBest.depth)+' '+m]];
  $('stats').innerHTML=rows.map(function(r){return '<span>'+r[0]+'</span><b>'+r[1]+'</b>';}).join('');
  $('overlight').textContent='+'+earned.total;
  $('overlightdetail').textContent=t('over.lightDetail',{d:earned.depth,k:earned.kills,t:earned.tier})+(G.mods.light!==1?' · '+t('cond.'+G.cond+'.name')+' ×'+G.mods.light:'');
  $('overweapons').innerHTML=Object.keys(G.weapons).map(function(k){const x=G.evo[k]?t('x.'+EVOLUTIONS[k].key+'.name'):t('w.'+k+'.name');return '<span>'+x+' <b>'+G.weapons[k]+'</b></span>';}).join('');
  $('newrecord').classList.toggle('hidden',!isRecord);
  $('overpageswrap').classList.toggle('hidden',G.newPages.length===0);
  $('overpages').innerHTML=G.newPages.map(function(id){return '<span>'+t('pl.'+id+'.name')+'</span>';}).join('');
  $('overachwrap').classList.toggle('hidden',G.newAch.length===0);
  $('overach').innerHTML=G.newAch.map(function(id){return '<span>★ '+t('ach.'+id+'.name')+'</span>';}).join('');
  hideBossBar();hideBanner();
  setTimeout(function(){show('over');},600);
  SFX.boom();buzz(80);
}
// The throne is empty. The dive can end here as a victory or go on into the Bottomless.
export function showEnding(){
  G.state='ending';joyEnd();hideBossBar();hideBanner();
  setTimeout(function(){show('ending');},900);
}
$('endingon').addEventListener('click',function(){if(G&&G.state==='ending'){hide('ending');G.state='play';SFX.resume();}});
$('endingstop').addEventListener('click',function(){if(G&&G.state==='ending'){hide('ending');gameOver();}});

// ---------- pause ----------
export function togglePause(){
  if(!G)return;
  if(G.state==='play'){G.state='pause';joyEnd();$('pausecond').textContent=t('cond.label')+': '+t('cond.'+G.cond+'.name')+' — '+t('cond.'+G.cond+'.desc');show('pausescr');}
  else if(G.state==='pause'){if(visible('settings'))closeSettings();G.state='play';hide('pausescr');SFX.resume();}
}

// ---------- start ----------
function chip(label,on,locked,title){
  const b=document.createElement('button');b.type='button';b.className='chip'+(on?' on':'')+(locked?' locked':'');
  b.textContent=label;if(title)b.title=title;return b;
}
function renderStart(){
  const m=save.meta;
  // vessel
  const vw=$('vesselchips');vw.innerHTML='';
  Object.keys(VESSELS).forEach(function(k){
    const unlocked=k==='bathy'||!!m.unlocks.vessels[k];
    const b=chip(t('v.'+k),m.vessel===k,!unlocked,t('v.'+k+'.desc'));
    if(unlocked)b.addEventListener('click',function(){m.vessel=k;saveNow();renderStart();});
    vw.appendChild(b);
  });
  $('vesseldesc').textContent=m.unlocks.vessels.dart||m.vessel==='dart'?t('v.'+m.vessel+'.desc'):t('v.bathy.desc')+' · '+t('v.dart')+': '+t('start.lockedDart');
  // starting weapon
  const unlockedW=Object.keys(WEAPONS).filter(function(k){return k!=='lamp'&&m.unlocks.startWeapons[k];});
  const ww=$('weaponchips');ww.innerHTML='';
  if(unlockedW.length){
    const none=chip(t('start.none'),!m.startWeapon,false);none.addEventListener('click',function(){m.startWeapon=null;saveNow();renderStart();});ww.appendChild(none);
    unlockedW.forEach(function(k){const b=chip(t('w.'+k+'.name'),m.startWeapon===k,false);b.addEventListener('click',function(){m.startWeapon=k;saveNow();renderStart();});ww.appendChild(b);});
    $('weaponhint').classList.add('hidden');$('weaponlabel').classList.remove('hidden');
  }else{$('weaponhint').classList.remove('hidden');$('weaponlabel').classList.add('hidden');}
}
let pickTier=0,pickLoadout='saved';
function renderChapters(){
  const m=save.meta,reached=Math.min(m.reached||0,LAST_TIER+1);
  $('chapterpick').classList.toggle('hidden',reached<1);
  if(reached<1){pickTier=0;return;}
  if(pickTier>reached)pickTier=0;
  const cw=$('chapterchips');cw.innerHTML='';
  for(let i=0;i<=reached;i++){
    const b=chip(i===0?t('start.surface'):chapterShort(i),pickTier===i,false,chapterName(i));
    b.addEventListener('click',function(){pickTier=i;renderChapters();});cw.appendChild(b);
  }
  const lw=$('loadoutchips');lw.innerHTML='';lw.classList.toggle('hidden',pickTier===0);
  if(pickTier>0){
    [['saved','start.loadoutSaved'],['random','start.loadoutRandom']].forEach(function(o){
      const b=chip(t(o[1]),pickLoadout===o[0],false);b.addEventListener('click',function(){pickLoadout=o[0];renderChapters();});lw.appendChild(b);});
  }
  const lo=m.loadouts[pickTier];
  $('chapterhint').textContent=pickTier===0?t('start.surfaceHint'):
    tierLabel(pickTier)+' · '+fmtDepth(chapterStart(pickTier))+' '+t('over.m')+(pickLoadout==='saved'&&lo?' · '+t('start.loadoutHint',{n:lo.level,w:Object.keys(lo.weapons).map(function(k){return t('w.'+k+'.name');}).join(', ')}):' · '+t('start.randomHint'));
}
export function showBest(){
  const b=save.rankedBest;
  $('startbest').textContent=b.depth>0?t('start.best',{d:fmtDepth(b.depth),ng:chapterShort(b.tier)}):'';
  $('legacybest').textContent=save.best.depth>0?t('start.legacyBest',{d:fmtDepth(save.best.depth)}):'';
  $('startlight').textContent=t('start.light',{n:light()});
  const rs=save.meta.resume;
  $('resumedive').classList.toggle('hidden',!rs);
  if(rs)$('resumedive').textContent=t('start.resume',{ch:chapterShort(rs.tier),d:fmtDepth(rs.depth)});
  $('startbtn').textContent=t(rs?'start.newDive':'start.dive');
  $('testunlock').classList.toggle('hidden',!TEST_BUILD||(save.meta.reached||0)>LAST_TIER);
  renderStart();renderChapters();
}
export function startGame(opts){
  SFX.init();SFX.resume();
  if(opts&&opts.resume)newGame('play',{resume:save.meta.resume});   // the checkpoint stays until the next guardian replaces it
  else{settleAbandoned();newGame('play',{tier:pickTier,loadout:pickLoadout});}
  ['start','over','pausescr','levelup','settings','shop','ach','log','ending'].forEach(hide);
  hideBossBar();
  resetHud();
  setTimeout(function(){if(G&&G.state==='play')showBanner(tierLabel(G.tier),2.5);},600);
  setTimeout(function(){if(G&&G.state==='play'&&G.cond!=='calm'&&G.bannerT<=0)showBanner(t('cond.'+G.cond+'.name')+' — '+t('cond.'+G.cond+'.desc'),3.5);},3600);
}
// Starting a new dive while another is waiting ends that one: its Light is paid and its depth recorded
function settleAbandoned(){
  const rs=save.meta.resume;if(!rs)return;
  save.meta.resume=null;
  recordRun(Math.floor(rs.depth),rs.tier,rs.t,rs.kills);
  const mult=(CONDITIONS[rs.cond]||{}).light||1;
  addLight(lightFor(Math.max(0,travel(rs.depth,rs.tier)-(rs.startTravel||0)),rs.kills,rs.tier,rs.startTier,mult).total);
}
// A test build (the private preview page) can open every chapter at once; the real game never shows this
const TEST_BUILD=!!(import.meta.env&&import.meta.env.VITE_TEST_BUILD);
$('testunlock').addEventListener('click',function(){save.meta.reached=LAST_TIER+1;saveNow();showBest();});
$('resumedive').addEventListener('click',function(){if(save.meta.resume)startGame({resume:true});});

// ---------- logbook ----------
function renderLog(){
  const m=save.meta,got=Object.keys(m.logbook).length;
  $('logcount').textContent=got+'/'+PLACES.length;
  let html='';
  CHAPTERS.forEach(function(ch,ci){
    const from=chapterStart(ci),to=PLACES[ci*4+3].depth;
    html+='<div class="logch">'+ROMAN[ci]+' · '+t('ch.'+ch.key+'.name')+'<small>'+fmtDepth(from)+'–'+fmtDepth(to)+' '+t('over.m')+' · '+t('ch.'+ch.key+'.desc')+'</small></div>';
    for(let k=0;k<4;k++){
      const pl=PLACES[ci*4+k],open=!!m.logbook[pl.id];
      html+='<div class="logpl'+(open?' got':'')+'"><div class="top"><b>'+(open?t('pl.'+pl.id+'.name'):'; ; ;')+'</b><span class="dep">'+fmtDepth(pl.depth)+' '+t('over.m')+'</span></div>'+
        (open?'<div class="where">'+t('pl.'+pl.id+'.where')+'</div><p>'+t('pl.'+pl.id+'.story')+'</p><div class="guard">'+t('log.guardian')+': '+t('e.'+pl.boss)+'</div>':'')+'</div>';
    }
    const names=ch.spawn.map(function(r){return m.seen[r[0]]?'<b>'+t('e.'+r[0])+'</b>':'; ; ;';});
    html+='<div class="logfauna">'+t('log.fauna')+': '+names.join(' · ')+'</div>';
  });
  $('loglist').innerHTML=html;
}
$('startlog').addEventListener('click',function(){renderLog();hide('start');show('log');$('log').scrollTop=0;});
$('logback').addEventListener('click',function(){hide('log');show('start');showBest();});

// ---------- achievements & statistics ----------
function renderAchievements(){
  const s=save.meta.stats;
  const rows=[[t('stats.dives'),s.dives],[t('stats.kills'),fmtDepth(s.kills)],[t('stats.maxDepth'),fmtDepth(s.maxDepth)+' '+t('over.m')],[t('stats.time'),fmtLong(s.time)],[t('stats.light'),fmtDepth(s.lightEarned||0)]];
  $('lifestats').innerHTML=rows.map(function(r){return '<span>'+r[0]+'</span><b>'+r[1]+'</b>';}).join('');
  $('achcount').textContent=count()+'/'+ACHIEVEMENTS.length;
  $('achlist').innerHTML=ACHIEVEMENTS.map(function(a){
    const got=has(a.id);
    const platinum=a.id==='platinum';
    const progress=platinum?' '+PLATINUM_IDS.filter(has).length+'/'+PLATINUM_IDS.length:'';
    const mastery=PLATINUM_IDS.includes(a.id)?' · '+t('ach.mastery'):'';
    return '<div class="ach'+(got?' got':'')+(platinum?' platinum':'')+'"><span class="star">'+(platinum?'◆':got?'★':'☆')+'</span><div><b>'+t('ach.'+a.id+'.name')+progress+'</b><p>'+t('ach.'+a.id+'.desc')+mastery+'</p></div></div>';
  }).join('');
}
$('startach').addEventListener('click',function(){renderAchievements();hide('start');show('ach');$('ach').scrollTop=0;});
$('achback').addEventListener('click',function(){hide('ach');show('start');showBest();});

// ---------- shop ----------
let visitLine=0;
function say(key){$('shopquote').textContent=t(key);}
function renderShop(){
  $('shoplight').textContent=light();
  const wrap=$('shopitems');wrap.innerHTML='';
  SHOP.forEach(function(s){
    const l=level(s.key),mx=maxLevel(s.key),c=cost(s.key);
    const row=document.createElement('div');row.className='item';
    row.innerHTML='<div class="info"><b>'+t('shop.'+s.key+'.name')+'</b><span class="pips">'+pips(l,mx)+'</span><p>'+t('shop.'+s.key+'.desc')+'</p></div>';
    if(c!==null){const details=document.createElement('p');details.className='changes';details.textContent=shopChanges(s.key,l);row.querySelector('.info').appendChild(details);}
    const b=document.createElement('button');b.className='buy';
    if(c===null){b.textContent=t('shop.max');b.disabled=true;}
    else{b.textContent=c+' ◆';b.classList.toggle('poor',light()<c);}   // stays clickable so the Hermit can answer
    b.addEventListener('click',function(){
      if(buy(s.key)){SFX.init();SFX.resume();SFX.levelup();buzz(30);say('shop.bought');renderShop();if(G)checkAchievements(G,P,true);}
      else say(cost(s.key)===null?'shop.soldout':'shop.poor');
    });
    row.appendChild(b);wrap.appendChild(row);
  });
}
let shopFrom='start';
export function openShop(from){
  shopFrom=from||'start';
  const allMax=SHOP.every(function(s){return cost(s.key)===null;});
  say(allMax?'shop.soldout':'shop.line.'+(visitLine++%8));
  renderShop();hide(shopFrom);show('shop');$('shop').scrollTop=0;
}
$('shopback').addEventListener('click',function(){hide('shop');show(shopFrom);if(shopFrom==='start')showBest();});
$('startshop').addEventListener('click',function(){openShop('start');});
$('overshop').addEventListener('click',function(){openShop('over');});
// back to the title screen after a dive: a fresh idle sea behind the menu
function goHome(){
  ['over','pausescr','levelup','settings','shop','ach','log','ending'].forEach(hide);
  newGame('start');hideBossBar();hideBanner();resetHud();
  show('start');showBest();
}
$('overhome').addEventListener('click',goHome);
$('pausequit').addEventListener('click',function(){if(G&&G.state==='pause'){hide('pausescr');G.state='play';gameOver();}});

// ---------- settings ----------
let settingsFrom='start';
export function openSettings(from){settingsFrom=from;syncSettingsUi();hide(from);show('settings');}
function closeSettings(){hide('settings');show(settingsFrom);if(settingsFrom==='start')showBest();}
function seg(id,v){$(id).querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v);});}
function syncSettingsUi(){
  const s=settings();
  $('opt-sfx').value=s.sfx;$('opt-music').value=s.music;
  $('opt-vibrate').checked=s.vibrate;$('opt-dmg').checked=s.dmgNumbers;
  seg('opt-joystick',s.joystick);seg('opt-joyside',s.joySide);seg('opt-lang',s.lang||deviceLang());
}
function wireSeg(id,key,after){
  $(id).addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;setSetting(key,b.dataset.v);syncSettingsUi();if(after)after();});
}
$('opt-sfx').addEventListener('input',function(){setSetting('sfx',+this.value);});
$('opt-sfx').addEventListener('change',function(){SFX.init();SFX.resume();SFX.pickup();});   // a short preview at the new volume
$('opt-music').addEventListener('input',function(){setSetting('music',+this.value);});
$('opt-vibrate').addEventListener('change',function(){setSetting('vibrate',this.checked);buzz(40);});
$('opt-dmg').addEventListener('change',function(){setSetting('dmgNumbers',this.checked);});
wireSeg('opt-joystick','joystick');
wireSeg('opt-joyside','joySide');
wireSeg('opt-lang','lang',function(){invalidateHud();});
$('settingsback').addEventListener('click',closeSettings);

// ---------- wiring ----------
$('startbtn').addEventListener('click',function(){startGame();});
$('againbtn').addEventListener('click',function(){startGame();});
$('startsettings').addEventListener('click',function(){openSettings('start');});
$('pausesettings').addEventListener('click',function(){openSettings('pausescr');});
$('pausebtn').addEventListener('click',function(){if(G&&G.state==='play')togglePause();});
$('resumebtn').addEventListener('click',togglePause);
document.addEventListener('visibilitychange',function(){if(document.hidden&&G&&G.state==='play')togglePause();});
