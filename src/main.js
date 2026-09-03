// ---------- bootstrap & main loop ----------
import {G,newGame,advanceClock} from './game/state.js';
import {update} from './game/update.js';
import {render} from './render/scene.js';
import {updateHud} from './ui/hud.js';
import {loadBest} from './save.js';
import {showBest} from './ui/screens.js';
import './ui/input.js';

newGame('start');
loadBest();showBest();
let last=performance.now();
function frame(now){
  let dt=(now-last)/1000;last=now;if(dt>0.05)dt=0.05;
  advanceClock(dt);
  if(G){if(G.state==='play')update(dt);render();updateHud();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
