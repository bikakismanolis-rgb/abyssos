import {game} from './headless-game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDescent,difficultyAt,bossFor,nextBossDepth,betterRecord} from '../src/game/run-rules.js';
import el from '../src/i18n/el.js';
import en from '../src/i18n/en.js';
import {optionChanges,shopChanges} from '../src/ui/upgrade-details.js';

test('depth clamps at every gate and cannot advance during a boss',()=>{
  const run={tier:0,bossesCleared:0,depth:599,boss:null};
  assert.equal(advanceDescent(run,100,7),1);assert.equal(run.depth,600);
  run.boss={};for(let i=0;i<100;i++)assert.equal(advanceDescent(run,100,7),0);
  assert.equal(run.depth,600);assert.equal(nextBossDepth(1,0),3000);
});
test('difficulty increases within cycles and across boundaries',()=>{
  let prev=difficultyAt(0,0);
  for(let depth=300;depth<=24000;depth+=300){
    const current=difficultyAt(depth,Math.floor(depth/2400));
    for(const key of ['hp','damage','speed','bossHp'])assert.ok(current[key]>=prev[key],key+' at '+depth);
    assert.ok(current.interval<=prev.interval);prev=current;
  }
  for(let tier=0;tier<20;tier++)assert.equal(bossFor(4,tier),'boss2');
});
test('real update/kill flow: four bosses, actual Kraken unlock, NG retains loadout',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;P.inv=1e9;
  G.weapons.harpoon=3;
  for(let slot=1;slot<=4;slot++){
    G.depth=slot*600-0.1;G.motes=[];g.update.update(0.05);
    assert.equal(G.boss.slot,slot);assert.equal(G.depth,slot*600);
    const depth=G.depth;g.update.update(0.05);assert.equal(G.depth,depth);
    if(slot<4)assert.equal(g.save.save.meta.unlocks.vessels.dart,undefined);
    g.combat.killEnemy(G.boss);
    assert.equal(G.tier,slot===4?1:0);
  }
  assert.equal(G.bossesCleared,0);assert.equal(G.weapons.harpoon,3);
  assert.equal(g.save.save.meta.unlocks.vessels.dart,true);
  assert.equal(G.bossKills.boss2,1);assert.equal(P.hp,P.maxHp);
  G.motes=[];g.update.update(0.05);assert.ok(G.depth>2400);
});
test('non-Kraken bosses never award Kraken; clean-hit tracking is accurate',async()=>{
  const g=await game();const G=g.state.G;
  g.enemies.spawnBoss(3);g.combat.killEnemy(G.boss);g.achievements.check(G,g.state.P,false);
  assert.equal(g.achievements.has('kraken'),false);
  g.enemies.spawnBoss(4);g.combat.hurtPlayer(1);g.combat.killEnemy(G.boss);
  assert.equal(G.flawlessKraken,false);assert.equal(G.cleanCycle,false);
  assert.equal(G.restrictedKraken,true);
});
test('repair waits for a damage-free interval',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;P.regen=5;
  g.combat.hurtPlayer(10);const hp=P.hp;
  g.update.update(0.05);assert.equal(P.hp,hp);
  G.t=4;g.update.update(0.05);assert.ok(P.hp>hp);
});
test('ink announces and locks its aim before firing',async()=>{
  const g=await game();const e=g.enemies.spawnEnemy('inksquid',300,0);e.timer=0.6;
  g.enemies.updateEnemies(0.01);const aim=e.inkAim;assert.ok(Number.isFinite(aim));
  g.state.P.y=200;g.enemies.updateEnemies(0.65);
  assert.equal(g.state.G.ebullets.length,1);
  const b=g.state.G.ebullets[0];assert.ok(Math.abs(Math.atan2(b.vy,b.vx)-aim)<1e-9);
});
test('rapid sonar pulses cannot keep enemies permanently stunned',async()=>{
  const g=await game();const e=g.enemies.spawnEnemy('angler',100,0);e.hp=10000;
  const st={radius:300,stun:1,push:50,dmg:1};
  g.weapons.fireSonar(st);assert.equal(e.stun,1);
  g.state.G.t=1.1;e.stun=0;g.weapons.fireSonar(st);assert.equal(e.stun,0);
  g.state.G.t=1.9;g.weapons.fireSonar(st);assert.equal(e.stun,1);
});
test('Platinum requires the fixed mastery set and unlocks once',async()=>{
  const g=await game();const a=g.achievements;
  const ids=Array.from(a.PLATINUM_IDS);
  for(const id of ids.slice(0,-1))a.unlock(id);
  a.check(g.state.G,g.state.P,true);assert.equal(a.has('platinum'),false);
  a.unlock(ids.at(-1));assert.ok(a.check(g.state.G,g.state.P,true).includes('platinum'));
  assert.ok(!a.check(g.state.G,g.state.P,true).includes('platinum'));
});
test('legacy progress survives; old depth cannot overwrite the new ranking',async()=>{
  const legacy={version:1,best:{depth:999999,tier:9,time:500},meta:{light:123,
    upgrades:{hull:3},achievements:{depth500:123},unlocks:{vessels:{dart:true}}}};
  const g=await game(legacy);const s=g.save.save;
  assert.equal(s.best.depth,999999);assert.equal(s.meta.light,123);assert.equal(s.meta.upgrades.hull,3);
  assert.equal(s.meta.achievements.depth500,123);assert.equal(s.meta.unlocks.vessels.dart,true);
  assert.equal(s.rankedBest.depth,0);assert.equal(g.save.recordRun(2400,1,700,50),true);
  assert.equal(g.save.recordRun(2400,0,800,60),false);
  assert.equal(s.rankedBest.tier,1);assert.equal(s.version,2);
  assert.equal(betterRecord({tier:1,depth:2400},{tier:0,depth:2400}),true);
});
test('all achievements and weapon-stat labels have Greek and English translations',async()=>{
  const g=await game();
  for(const a of g.achievements.ACHIEVEMENTS)for(const dict of [el,en]){
    assert.ok(dict['ach.'+a.id+'.name']);assert.ok(dict['ach.'+a.id+'.desc']);
  }
  assert.deepEqual(Object.keys(el).sort(),Object.keys(en).sort());
});
test('upgrade details show signed gains and before/after, including half-strength levels',()=>{
  const player={hp:80,maxHp:100,speedMul:1,magnet:100,regen:0,dmgMul:1,cdMul:1,armor:0};
  assert.ok(optionChanges({kind:'w',key:'lamp',lvl:1},player).some(s=>s.includes('+7')&&s.includes('23 → 30')));
  assert.ok(optionChanges({kind:'w',key:'harpoon',lvl:1},player).some(s=>s.includes('−0.1')&&s.includes('1 δευτ. → 0.9 δευτ.')));
  assert.ok(optionChanges({kind:'p',key:'hull',lvl:5},player).some(s=>s.includes('+12.5')&&s.includes('100 → 112.5')));
  assert.ok(optionChanges({kind:'p',key:'cool',lvl:0},player)[0].includes('100% → 90%'));
  assert.ok(optionChanges({kind:'heal'},player)[0].includes('+20'));
  for(const key of ['lamp2','emergency','overclock','shell','deathpulse','lightheal'])assert.ok(optionChanges({kind:'s',key},player)[0].includes('→'));
  for(const key of ['hull','dmg','speed','magnet','lamp','card4','reroll','slot'])assert.ok(shopChanges(key,0).includes('+'));
  assert.equal(player.maxHp,100);assert.equal(player.cdMul,1);
});
