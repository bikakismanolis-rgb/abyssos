// Pure rules shared by gameplay, HUD and regression tests.
export const BOSS_STEP=600, BOSSES_PER_CYCLE=4, CYCLE_DEPTH=BOSS_STEP*BOSSES_PER_CYCLE;
export function nextBossDepth(tier,cleared){return tier*CYCLE_DEPTH+(cleared+1)*BOSS_STEP;}
export function bossFor(slot,tier){
  return ['boss1',tier%2===0?'queen':'wreck','leviathan','boss2'][slot-1];
}
export function difficultyAt(depth,tier){
  const progress=Math.max(0,Math.min(1,(depth-tier*CYCLE_DEPTH)/CYCLE_DEPTH));
  return {hp:Math.pow(1.65,tier)*(1+0.6*progress),
    damage:Math.pow(1.4,tier)*(1+0.3*progress),
    speed:Math.min(1.65,Math.pow(1.14,tier)*(1+0.12*progress)),
    interval:Math.max(0.24,1.15/(Math.pow(1.55,tier)*(1+0.5*progress))),
    bossHp:Math.pow(1.7,tier)*(0.8+0.2*progress)};
}
export function advanceDescent(run,dt,rate){
  if(run.boss)return 0;
  const target=nextBossDepth(run.tier,run.bossesCleared);
  run.depth=Math.min(target,run.depth+rate*dt);
  return run.depth>=target?run.bossesCleared+1:0;
}
export function betterRecord(candidate,best){
  return candidate.tier>best.tier||(candidate.tier===best.tier&&candidate.depth>best.depth);
}
