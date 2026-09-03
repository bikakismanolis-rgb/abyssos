// ---------- bootstrap & main loop ----------
import {load} from './save.js';
import {applyAllSettings} from './settings.js';
import {G,newGame,advanceClock} from './game/state.js';
import {update} from './game/update.js';
import {render} from './render/scene.js';
import {updateHud} from './ui/hud.js';
import {showBest} from './ui/screens.js';
import './ui/input.js';
import {initNative} from './native.js';

load();               // versioned save + migration
applyAllSettings();   // volume, language (translates the static DOM)
newGame('start');
showBest();
let last=performance.now(),first=true;
function frame(now){
  let dt=(now-last)/1000;last=now;if(dt>0.05)dt=0.05;
  advanceClock(dt);
  if(G){if(G.state==='play')update(dt);render();updateHud();}
  if(first){first=false;initNative();}   // hide the native splash once the first frame is on screen
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
