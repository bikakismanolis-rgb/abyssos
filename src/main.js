// ---------- bootstrap & main loop ----------
import {load} from './save.js';
import {applyAllSettings} from './settings.js';
import {G,newGame,advanceClock} from './game/state.js';
import {update} from './game/update.js';
import {render} from './render/scene.js';
import {updateHud} from './ui/hud.js';
import {showBest} from './ui/screens.js';
import './ui/input.js';

load();               // versioned save + migration
applyAllSettings();   // volume, language (translates the static DOM)
newGame('start');
showBest();
let last=performance.now();
function frame(now){
  let dt=(now-last)/1000;last=now;if(dt>0.05)dt=0.05;
  advanceClock(dt);
  if(G){if(G.state==='play')update(dt);render();updateHud();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
