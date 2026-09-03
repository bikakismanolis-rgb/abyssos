// ---------- HUD: depth, time, hp, xp, level, NG label, boss bar, banner ----------
import {$,fmtDepth,fmtTime,clamp} from '../util.js';
import {G,P} from '../game/state.js';
import {t} from '../i18n/index.js';

const depthEl=$('depthv'),timeEl=$('time'),hpEl=$('hp'),xpEl=$('xp'),lvlEl=$('lvl'),bossHpEl=$('bosshp');
const ngEl=$('ng'),bannerEl=$('banner'),bossbarEl=$('bossbar'),bossnameEl=$('bossname');
let lastDepth=-1,lastTime='',lastLvl=-1;

// Forces every cached label to redraw on the next frame (new game, language change)
export function invalidateHud(){lastDepth=-1;lastTime='';lastLvl=-1;}
export function resetHud(){invalidateHud();ngEl.textContent='NG';}
export function updateHud(){
  const d=Math.floor(G.depth);if(d!==lastDepth){lastDepth=d;depthEl.textContent=fmtDepth(d);}
  const tm=fmtTime(G.t);if(tm!==lastTime){lastTime=tm;timeEl.textContent=tm;}
  hpEl.style.width=(clamp(P.hp/P.maxHp,0,1)*100).toFixed(1)+'%';
  xpEl.style.width=(clamp(G.xp/G.xpNext,0,1)*100).toFixed(1)+'%';
  if(G.level!==lastLvl){lastLvl=G.level;lvlEl.textContent=t('hud.level',{n:G.level});}
  if(G.boss)bossHpEl.style.width=(clamp(G.boss.hp/G.boss.maxHp,0,1)*100).toFixed(1)+'%';
}
export function setNg(txt){ngEl.textContent=txt;}
export function showBanner(txt,dur){bannerEl.textContent=txt;bannerEl.classList.add('show');G.bannerT=dur;}
export function hideBanner(){bannerEl.classList.remove('show');}
export function showBossBar(name){bossnameEl.textContent=name;bossbarEl.classList.remove('hidden');}
export function hideBossBar(){bossbarEl.classList.add('hidden');}
