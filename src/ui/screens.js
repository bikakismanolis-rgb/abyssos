// ---------- screens: start, level-up, pause, settings, shop, achievements, end of dive ----------
import {$,fmtDepth,fmtTime} from '../util.js';
import {G,P,newGame} from '../game/state.js';
import {WEAPONS,PASSIVES,VESSELS,ngLabel} from '../game/config.js';
import {levelOptions,chooseOption,pips,weaponSlots,weaponSlotsUsed,passiveSlots} from '../game/progression.js';
import {SHOP,level,maxLevel,cost,light,buy,lightFor,addLight} from '../game/shop.js';
import {ACHIEVEMENTS,has,count,check as checkAchievements} from '../game/achievements.js';
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
    else if(o.kind==='s'){b.innerHTML='<div class="top"><b>'+t('s.'+o.key+'.name')+'<em class="sp">'+t('levelup.special')+'</em></b></div><p>'+t('s.'+o.key+'.desc')+'</p>';}
    else{
      const def=o.kind==='w'?WEAPONS[o.key]:PASSIVES[o.key],pre=o.kind==='w'?'w.':'p.';
      b.innerHTML='<div class="top"><b>'+t(pre+o.key+'.name')+(o.lvl===0?'<em>'+t(o.kind==='w'?'levelup.newWeapon':'levelup.newPassive')+'</em>':'')+'</b><span class="pips">'+pips(o.lvl+1,def.max)+'</span></div><p>'+t(pre+o.key+'.desc')+'</p>';
    }
    b.addEventListener('click',function(){pick(o);});
    wrap.appendChild(b);
  });
  const rr=$('rerollbtn');
  rr.classList.toggle('hidden',!(G.rerolls>0));
  rr.textContent=t('levelup.reroll',{n:G.rerolls});
}
export function openLevelUp(){
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
  const earned=lightFor(d,G.kills,G.tier);addLight(earned.total);
  G.newAch.push.apply(G.newAch,checkAchievements(G,P,true));
  const rows=[[t('over.depth'),fmtDepth(d)+' '+m],[t('over.time'),fmtTime(G.t)],[t('over.tier'),ngLabel(G.tier)],
    [t('over.creatures'),G.kills],[t('over.level'),G.level],[t('over.record'),fmtDepth(save.best.depth)+' '+m]];
  $('stats').innerHTML=rows.map(function(r){return '<span>'+r[0]+'</span><b>'+r[1]+'</b>';}).join('');
  $('overlight').textContent='+'+earned.total;
  $('overlightdetail').textContent=t('over.lightDetail',{d:earned.depth,k:earned.kills,t:earned.tier});
  $('overweapons').innerHTML=Object.keys(G.weapons).map(function(k){return '<span>'+t('w.'+k+'.name')+' <b>'+G.weapons[k]+'</b></span>';}).join('');
  $('newrecord').classList.toggle('hidden',!isRecord);
  $('overachwrap').classList.toggle('hidden',G.newAch.length===0);
  $('overach').innerHTML=G.newAch.map(function(id){return '<span>★ '+t('ach.'+id+'.name')+'</span>';}).join('');
  hideBossBar();hideBanner();
  setTimeout(function(){show('over');},600);
  SFX.boom();buzz(80);
}

// ---------- pause ----------
export function togglePause(){
  if(!G)return;
  if(G.state==='play'){G.state='pause';joyEnd();show('pausescr');}
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
export function showBest(){
  const b=save.best;
  $('startbest').textContent=b.depth>0?t('start.best',{d:fmtDepth(b.depth),ng:ngLabel(b.tier)}):'';
  $('startlight').textContent=t('start.light',{n:light()});
  renderStart();
}
export function startGame(){
  SFX.init();SFX.resume();
  newGame('play');
  ['start','over','pausescr','levelup','settings','shop','ach'].forEach(hide);
  hideBossBar();
  resetHud();
  setTimeout(function(){if(G&&G.state==='play')showBanner(t('banner.twilight'),2.5);},600);
}

// ---------- achievements & statistics ----------
function renderAchievements(){
  const s=save.meta.stats;
  const rows=[[t('stats.dives'),s.dives],[t('stats.kills'),fmtDepth(s.kills)],[t('stats.maxDepth'),fmtDepth(s.maxDepth)+' '+t('over.m')],[t('stats.time'),fmtLong(s.time)],[t('stats.light'),fmtDepth(s.lightEarned||0)]];
  $('lifestats').innerHTML=rows.map(function(r){return '<span>'+r[0]+'</span><b>'+r[1]+'</b>';}).join('');
  $('achcount').textContent=count()+'/'+ACHIEVEMENTS.length;
  $('achlist').innerHTML=ACHIEVEMENTS.map(function(a){
    const got=has(a.id);
    return '<div class="ach'+(got?' got':'')+'"><span class="star">'+(got?'★':'☆')+'</span><div><b>'+t('ach.'+a.id+'.name')+'</b><p>'+t('ach.'+a.id+'.desc')+'</p></div></div>';
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
  ['over','pausescr','levelup','settings','shop','ach'].forEach(hide);
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
$('startbtn').addEventListener('click',startGame);
$('againbtn').addEventListener('click',startGame);
$('startsettings').addEventListener('click',function(){openSettings('start');});
$('pausesettings').addEventListener('click',function(){openSettings('pausescr');});
$('pausebtn').addEventListener('click',function(){if(G&&G.state==='play')togglePause();});
$('resumebtn').addEventListener('click',togglePause);
document.addEventListener('visibilitychange',function(){if(document.hidden&&G&&G.state==='play')togglePause();});
