// ---------- screens: start, level-up, pause, game over ----------
import {$,fmtDepth,fmtTime} from '../util.js';
import {G,newGame} from '../game/state.js';
import {WEAPONS,PASSIVES,SPECIALS,ngLabel} from '../game/config.js';
import {levelOptions,chooseOption,pips,weaponSlots,weaponSlotsUsed,passiveSlots} from '../game/progression.js';
import {joyEnd} from './input.js';
import {SFX} from '../audio/sfx.js';
import {showBanner,hideBanner,hideBossBar,resetHud} from './hud.js';
import {best,saveBest} from '../save.js';

export function openLevelUp(){
  G.state='levelup';joyEnd();SFX.levelup();
  $('lvtitle').textContent='Επίπεδο '+(G.level-G.pendingLevels+1);
  $('slots').textContent='Όπλα '+weaponSlotsUsed()+'/'+weaponSlots()+' (συν Προβολέας) · Ικανότητες '+Object.keys(G.passives).length+'/'+passiveSlots();
  const wrap=$('cards');wrap.innerHTML='';
  const opts=levelOptions();
  opts.forEach(function(o){
    const b=document.createElement('button');b.className='card';
    if(o.kind==='heal'){b.innerHTML='<div class="top"><b>Επισκευή σκάφους</b></div><p>Πλήρης αποκατάσταση αντοχής.</p>';}
    else if(o.kind==='s'){const sd=SPECIALS[o.key];b.innerHTML='<div class="top"><b>'+sd.name+'<em class="sp">ειδική</em></b></div><p>'+sd.desc+'</p>';}
    else{
      const def=o.kind==='w'?WEAPONS[o.key]:PASSIVES[o.key];
      b.innerHTML='<div class="top"><b>'+def.name+(o.lvl===0?'<em>'+(o.kind==='w'?'νέο όπλο':'νέα ικανότητα')+'</em>':'')+'</b><span class="pips">'+pips(o.lvl+1,def.max)+'</span></div><p>'+def.desc+'</p>';
    }
    b.addEventListener('click',function(){pick(o);});
    wrap.appendChild(b);
  });
  $('levelup').classList.remove('hidden');
}
function pick(o){
  chooseOption(o);
  if(G.pendingLevels>0){openLevelUp();return;}
  $('levelup').classList.add('hidden');G.state='play';
}
export function gameOver(){
  G.state='over';joyEnd();
  const d=Math.floor(G.depth);
  if(d>best)saveBest(d);
  $('stats').innerHTML='<span>Βάθος</span><b>'+fmtDepth(d)+' μ.</b><span>Χρόνος</span><b>'+fmtTime(G.t)+'</b><span>Πλάσματα</span><b>'+G.kills+'</b><span>Επίπεδο</span><b>'+G.level+'</b><span>Δυσκολία</span><b>'+ngLabel(G.tier)+'</b><span>Ρεκόρ</span><b>'+fmtDepth(best)+' μ.</b>';
  hideBossBar();hideBanner();
  setTimeout(function(){$('over').classList.remove('hidden');},600);
  SFX.boom();
}
export function togglePause(){
  if(!G)return;
  if(G.state==='play'){G.state='pause';joyEnd();$('pausescr').classList.remove('hidden');}
  else if(G.state==='pause'){G.state='play';$('pausescr').classList.add('hidden');SFX.resume();}
}
export function showBest(){$('startbest').textContent=best>0?'Μεγαλύτερο βάθος: '+fmtDepth(best)+' μέτρα':'';}

// ---------- wiring ----------
export function startGame(){
  SFX.init();SFX.resume();
  newGame('play');
  ['start','over','pausescr','levelup'].forEach(function(id){$(id).classList.add('hidden');});
  hideBossBar();
  resetHud();
  setTimeout(function(){if(G&&G.state==='play')showBanner('Ζώνη λυκόφωτος',2.5);},600);
}
$('startbtn').addEventListener('click',startGame);
$('againbtn').addEventListener('click',startGame);
$('pausebtn').addEventListener('click',function(){if(G&&G.state==='play')togglePause();});
$('resumebtn').addEventListener('click',togglePause);
$('mutebtn').addEventListener('click',function(){SFX.setMuted(!SFX.muted);this.textContent='Ήχος: '+(SFX.muted?'όχι':'ναι');});
document.addEventListener('visibilitychange',function(){if(document.hidden&&G&&G.state==='play')togglePause();});
