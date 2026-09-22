// Pure rules shared by gameplay, HUD and regression tests.
// The map itself (places, depths, guardians) lives in places.js.
import {SEG_TIME,PLACES_PER_CHAPTER,placeAt,gateDepth,chapterStart,chapterProgress,travel} from './places.js';

export const BOSSES_PER_CYCLE=PLACES_PER_CHAPTER;
export function nextBossDepth(tier,cleared){return gateDepth(tier,cleared+1);}
export function bossFor(slot,tier){return placeAt(tier,slot).boss;}
// Within a chapter the pressure rises from the first place to the fourth; each chapter starts above the last.
// The curve is set for a journey of eight chapters that a good, upgraded dive can finish: by the Underworld
// (each chapter begins exactly where the last one ended: the ramp inside a chapter equals the step between chapters)
// creatures have about 13 times the health and 4 times the bite they had on the reef. (The old endless
// ladder used 1.65 / 1.4 / 1.7, which made everything past the fifth rung unplayable.)
export function difficultyAt(depth,tier){
  const progress=chapterProgress(depth,tier);
  return {hp:Math.pow(1.45,tier)*(1+0.45*progress),
    damage:Math.pow(1.22,tier)*(1+0.22*progress),
    speed:Math.min(1.5,Math.pow(1.09,tier)*(1+0.09*progress)),
    interval:Math.max(0.3,1.15/(Math.pow(1.42,tier)*(1+0.42*progress))),
    bossHp:Math.pow(1.6,tier)*(0.8+0.2*progress)};
}
// The descent takes SEG_TIME seconds from one place to the next, whatever the real distance,
// and stops dead at the place until its guardian is gone. Returns the slot reached, or 0.
export function advanceDescent(run,dt){
  if(run.boss)return 0;
  const target=nextBossDepth(run.tier,run.bossesCleared);
  const from=run.bossesCleared?gateDepth(run.tier,run.bossesCleared):chapterStart(run.tier);
  run.depth=Math.min(target,Math.max(run.depth,from)+(target-from)/SEG_TIME*dt);
  return run.depth>=target?run.bossesCleared+1:0;
}
export function betterRecord(candidate,best){
  return candidate.tier>best.tier||(candidate.tier===best.tier&&candidate.depth>best.depth);
}
// Light for a dive is paid on the distance travelled in this dive, never on where it started
export function travelled(run){return Math.max(0,travel(run.depth,run.tier)-(run.startTravel||0));}
