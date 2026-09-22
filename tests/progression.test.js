import {game} from './headless-game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDescent,difficultyAt,bossFor,nextBossDepth,betterRecord,travelled} from '../src/game/run-rules.js';
import {PLACES,CHAPTERS,SEG_TIME,LAST_TIER,gateDepth,chapterStart,chapterProgress,travel,placeAt,spawnTable} from '../src/game/places.js';
import {ET,WEAPONS,PASSIVES,EVOLUTIONS,CONDITIONS} from '../src/game/config.js';
import el from '../src/i18n/el.js';
import en from '../src/i18n/en.js';
import {optionChanges,shopChanges} from '../src/ui/upgrade-details.js';

// ---------- the map ----------
test('the map: 32 places in 8 chapters, depths always increasing, the real ones at their real depth',()=>{
  assert.equal(PLACES.length,32);assert.equal(CHAPTERS.length,8);
  for(let i=1;i<PLACES.length;i++)assert.ok(PLACES[i].depth>PLACES[i-1].depth,PLACES[i].id);
  const real={antikythera:45,britannic:122,bluehole:202,titanic:3800,bismarck:4791,calypso:5109,sammyb:6895,challenger:10935};
  for(const id in real)assert.equal(PLACES.find(p=>p.id===id).depth,real[id],id);
  assert.equal(PLACES[31].id,'hades');assert.equal(PLACES[31].depth,20000);
  assert.equal(new Set(PLACES.map(p=>p.id)).size,32);
});
test('every guardian and every creature in a spawn table exists, with a name in both languages',()=>{
  for(const p of PLACES){assert.ok(ET[p.boss]&&ET[p.boss].boss,p.boss);assert.ok(Array.isArray(ET[p.boss].atk)&&ET[p.boss].atk.length,p.boss);}
  for(const ch of CHAPTERS){
    assert.ok(ch.spawn.length>=6,ch.key+' has at least six creatures');
    assert.ok(ch.spawn.some(r=>r[2]===0),ch.key+' has creatures from its first place');
    for(const r of ch.spawn){assert.ok(ET[r[0]]&&!ET[r[0]].boss,r[0]);}
  }
  for(const type in ET){
    for(const dict of [el,en])assert.ok(dict['e.'+type],'e.'+type);
    const d=ET[type];
    if(d.split)assert.ok(ET[d.split.type],type+' splits into a known creature');
    for(const a of d.atk||[])if(a.type)assert.ok(ET[a.type],type+' summons a known creature');
  }
  for(const p of PLACES)for(const dict of [el,en])for(const f of ['name','where','story'])assert.ok(dict['pl.'+p.id+'.'+f],p.id+'.'+f);
  for(const ch of CHAPTERS)for(const dict of [el,en]){assert.ok(dict['ch.'+ch.key+'.name']);assert.ok(dict['ch.'+ch.key+'.desc']);}
});
test('the descent stops dead at every place and takes the same time between any two of them',()=>{
  const run={tier:0,bossesCleared:0,depth:0,boss:null};
  let t=0;while(!advanceDescent(run,0.05)){t+=0.05;assert.ok(t<SEG_TIME+1);}
  assert.ok(Math.abs(t-SEG_TIME)<0.2,'surface to the reef in '+t);assert.equal(run.depth,30);
  run.boss={};for(let i=0;i<100;i++)assert.equal(advanceDescent(run,1),0);assert.equal(run.depth,30);
  // a long real distance takes no longer than a short one
  const deep={tier:4,bossesCleared:2,depth:gateDepth(4,2),boss:null};
  t=0;while(!advanceDescent(deep,0.05))t+=0.05;
  assert.ok(Math.abs(t-SEG_TIME)<0.2);assert.equal(deep.depth,10800);
  assert.equal(nextBossDepth(1,0),332);assert.equal(chapterStart(1),202);assert.equal(bossFor(4,0),'queen');assert.equal(bossFor(3,6),'boss2');
});
test('difficulty rises through a chapter and across chapters, into the Bottomless',()=>{
  let prev=difficultyAt(0,0);
  for(let tier=0;tier<=LAST_TIER+3;tier++)for(let s=0;s<=4;s++){
    const depth=s?gateDepth(tier,s):chapterStart(tier),cur=difficultyAt(depth,tier);
    for(const key of ['hp','damage','speed','bossHp'])assert.ok(cur[key]>=prev[key]-1e-9,key+' at tier '+tier+' slot '+s);
    assert.ok(cur.interval<=prev.interval+1e-9);prev=cur;
  }
  assert.equal(chapterProgress(30,0),0.25);assert.equal(chapterProgress(202,0),1);assert.equal(chapterProgress(202,1),0);
  assert.equal(travel(0,0),0);assert.equal(travel(202,0),2400);assert.equal(travel(20000,7),19200);
  assert.ok(placeAt(9,2).depth>20000);assert.ok(ET[placeAt(9,2).boss].boss);assert.ok(spawnTable(9,1).length>=6);
});

// ---------- a dive ----------
test('real update/kill flow: four guardians, pages in the logbook, the Dart, the next chapter keeps the build',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;P.inv=1e9;
  G.weapons.harpoon=3;
  const ids=['reef','antikythera','britannic','bluehole'];
  for(let slot=1;slot<=4;slot++){
    G.depth=gateDepth(0,slot)-1e-6;G.motes=[];g.update.update(0.05);
    assert.equal(G.boss.slot,slot);assert.equal(G.depth,gateDepth(0,slot));assert.equal(G.boss.place.id,ids[slot-1]);
    const depth=G.depth;g.update.update(0.05);assert.equal(G.depth,depth);
    if(slot<4)assert.equal(g.save.save.meta.unlocks.vessels.dart,undefined);
    g.combat.killEnemy(G.boss);
    assert.equal(G.tier,slot===4?1:0);
    assert.ok(g.save.save.meta.logbook[ids[slot-1]]);
    assert.ok(g.save.save.meta.resume,'a dive in progress can be continued');
  }
  assert.equal(G.bossesCleared,0);assert.equal(G.weapons.harpoon,3);
  assert.equal(g.save.save.meta.unlocks.vessels.dart,true);
  assert.equal(g.save.save.meta.reached,1);assert.equal(g.save.save.meta.loadouts[1].weapons.harpoon,3);
  assert.equal(G.bossKills.queen,1);assert.equal(P.hp,P.maxHp);assert.deepEqual(Array.from(G.newPages),ids);
  G.motes=[];g.update.update(0.05);assert.ok(G.depth>202);
});
test('only the Kraken awards the Kraken; a clean chapter is tracked across its four guardians',async()=>{
  const g=await game();const G=g.state.G;
  g.enemies.spawnBoss(3);g.combat.killEnemy(G.boss);g.achievements.check(G,g.state.P,false);
  assert.equal(g.achievements.has('kraken'),false);
  g.enemies.spawnBoss(4);g.combat.hurtPlayer(1);g.combat.killEnemy(G.boss);
  assert.equal(G.cleanCycle,false);assert.equal(G.tier,1);
  G.tier=6;G.bossesCleared=2;g.enemies.spawnBoss(3);assert.equal(G.boss.type,'boss2');g.combat.killEnemy(G.boss);
  assert.equal(g.achievements.has('kraken'),true);assert.equal(G.flawlessKraken,true);assert.equal(G.restrictedKraken,true);
});
test('starting from a reached chapter restores the saved build; a random build has the same level',async()=>{
  const g=await game();let G=g.state.G;
  G.weapons.harpoon=6;G.weapons.sonar=2;G.passives.power=3;G.level=20;G.specials.shell=true;G.evo.harpoon=true;
  g.state.nextTier();g.state.nextTier();
  assert.equal(g.save.save.meta.reached,2);
  g.state.newGame('play',{tier:2,loadout:'saved'});G=g.state.G;const P=g.state.P;
  assert.equal(G.tier,2);assert.equal(G.depth,1000);assert.equal(G.startTier,2);assert.equal(G.level,20);
  assert.equal(G.weapons.harpoon,6);assert.equal(G.passives.power,3);assert.ok(G.evo.harpoon);assert.equal(P.armor,0.3);
  assert.ok(Math.abs(P.dmgMul-1.36)<1e-9);assert.equal(travelled(G),0);
  g.state.newGame('play',{tier:2,loadout:'random'});G=g.state.G;
  assert.equal(G.level,20);assert.equal(G.pendingLevels,0);
  const spent=Object.values(G.weapons).reduce((a,b)=>a+b,0)-1+Object.values(G.passives).reduce((a,b)=>a+b,0)+Object.keys(G.specials).length+Object.keys(G.evo).length;
  assert.equal(spent,19);
  assert.ok(Object.keys(G.weapons).length-1<=4&&Object.keys(G.passives).length<=4,'slots hold');
  // a chapter that was never reached cannot be chosen
  g.state.newGame('play',{tier:6});assert.equal(g.state.G.tier,2);
});
test('a dive in progress resumes where it stood, and Light is paid only for this dive',async()=>{
  const g=await game();let G=g.state.G;
  G.weapons.orbs=4;G.kills=120;G.t=300;g.enemies.spawnBoss(1);G.depth=30;g.combat.killEnemy(G.boss);
  const snap=JSON.parse(JSON.stringify(g.save.save.meta.resume));
  g.state.newGame('play',{resume:snap});G=g.state.G;
  assert.equal(G.bossesCleared,1);assert.equal(G.depth,30);assert.equal(G.weapons.orbs,4);assert.equal(G.kills,121);assert.equal(G.t,300);
  const a=g.shop.lightFor(2400,100,1,0,1),b=g.shop.lightFor(2400,100,5,4,1),c=g.shop.lightFor(2400,100,1,0,1.2);
  assert.equal(a.total,48+4+30);assert.equal(b.tier,150);assert.equal(c.total,Math.round(82*1.2));
});
test('slots are fixed, and an evolution is offered exactly when weapon and ability are ready',async()=>{
  const g=await game();const G=g.state.G;
  assert.equal(g.progression.weaponSlots(),4);assert.equal(g.progression.passiveSlots(),4);
  G.tier=5;assert.equal(g.progression.weaponSlots(),4);assert.equal(g.progression.passiveSlots(),4);G.tier=0;
  assert.ok(Object.keys(WEAPONS).length-1>5,'more weapons than any dive can carry');
  for(const k in EVOLUTIONS){assert.ok(WEAPONS[k]);assert.ok(PASSIVES[EVOLUTIONS[k].passive]);for(const d of [el,en])assert.ok(d['x.'+EVOLUTIONS[k].key+'.name']);}
  G.weapons.harpoon=6;G.passives.power=2;assert.equal(g.progression.evolutionsReady().length,0);
  G.passives.power=3;assert.deepEqual(Array.from(g.progression.evolutionsReady()),['harpoon']);
  assert.equal(g.progression.levelOptions()[0].kind,'x');
  G.pendingLevels=1;g.progression.chooseOption({kind:'x',key:'harpoon'});assert.ok(G.evo.harpoon);assert.equal(g.progression.evolutionsReady().length,0);
  G.enemies.length=0;g.enemies.spawnEnemy('angler',100,0).hp=1e6;
  g.weapons.fireHarpoon({count:1,speed:500,dmg:10,pierce:1});assert.equal(G.bullets.length,3);assert.equal(G.bullets[0].pierce,3);
  for(const k in CONDITIONS)for(const d of [el,en]){assert.ok(d['cond.'+k+'.name']);assert.ok(d['cond.'+k+'.desc']);}
});
test('armour gives way to the searchlight; splitters split; a plastic bag slows and never hurts',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;
  const iso=g.enemies.spawnEnemy('isopod',300,0);const hp=iso.hp;
  g.combat.hurtEnemy(iso,100);assert.ok(Math.abs(hp-iso.hp-40)<1e-9);
  iso.lit=true;g.combat.hurtEnemy(iso,10);assert.ok(Math.abs(hp-iso.hp-50)<1e-9);
  G.enemies.length=0;const f=g.enemies.spawnEnemy('formless',300,0);g.combat.killEnemy(f);
  assert.equal(G.enemies.filter(e=>e.type==='formbit').length,3);
  G.enemies.length=0;const bag=g.enemies.spawnEnemy('plasticbag',5,0);const before=P.hp;
  g.enemies.updateEnemies(0.016);assert.equal(P.hp,before);assert.ok(P.slowT>2);assert.equal(G.enemies.length,0);
});
test('guardians warn before they strike: a slam can be walked out of',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;
  g.hazards.slamAt(0,0,100,1,20,'255,0,0');
  for(let i=0;i<30;i++)g.hazards.updateHazards(1/30);
  const hp=P.hp;P.x=400;                                   // leave the circle before the second is up
  for(let i=0;i<20;i++)g.hazards.updateHazards(1/30);
  assert.equal(P.hp,hp);assert.equal(G.hazards.length,0);
  P.x=0;g.hazards.slamAt(0,0,100,0.5,20,'255,0,0');for(let i=0;i<20;i++)g.hazards.updateHazards(1/30);
  assert.ok(P.hp<hp);
});
test('every guardian can be fought for a minute without an error, and can be killed',async()=>{
  for(let i=0;i<PLACES.length;i++){
    const g=await game(undefined,i+1);const G=g.state.G,P=g.state.P;P.inv=1e9;
    G.tier=Math.floor(i/4);G.bossesCleared=i%4;G.depth=gateDepth(G.tier,i%4+1)-1e-6;G.xpNext=1e12;
    g.update.update(0.05);assert.equal(G.boss.type,PLACES[i].boss);
    for(let f=0;f<1800;f++){g.move.ix=Math.cos(f/40);g.move.iy=Math.sin(f/55);g.update.update(1/30);assert.equal(G.state,'play',PLACES[i].boss);}
    for(const e of G.enemies)assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y),PLACES[i].boss+' moved '+e.type+' to nowhere');
    assert.ok(Number.isFinite(P.x)&&Number.isFinite(P.y));
    if(G.boss)g.combat.killEnemy(G.boss);assert.equal(G.boss,null);   // the searchlight alone can finish the first guardians within the minute
  }
});

// ---------- rules kept from before ----------
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
test('Platinum requires the fixed mastery set, unlocks once, and its long goals count only from the surface',async()=>{
  const g=await game();const a=g.achievements;
  const ids=Array.from(a.PLATINUM_IDS);assert.equal(ids.length,12);
  g.state.G.startTier=3;g.state.G.depth=20000;g.state.G.tier=8;
  assert.ok(!a.check(g.state.G,g.state.P,false).includes('depth20000'));
  g.state.G.startTier=0;assert.ok(a.check(g.state.G,g.state.P,false).includes('depth20000'));
  for(const id of ids.slice(0,-1))a.unlock(id);
  if(!a.has(ids.at(-1))){a.check(g.state.G,g.state.P,true);assert.equal(a.has('platinum'),false);a.unlock(ids.at(-1));}
  a.check(g.state.G,g.state.P,true);assert.ok(a.has('platinum'));
  assert.ok(!a.check(g.state.G,g.state.P,true).includes('platinum'));
});
test('old progress survives; records made under the old rules are kept apart from the new ranking',async()=>{
  const legacy={version:2,best:{depth:5000,tier:0,time:500},rankedBest:{depth:4727,tier:1,time:900},meta:{light:123,
    upgrades:{hull:3},achievements:{depth500:123,kraken:5},unlocks:{vessels:{dart:true},startWeapons:{sonar:true}}}};
  const g=await game(legacy);const s=g.save.save;
  assert.equal(s.version,3);assert.equal(s.meta.light,123);assert.equal(s.meta.upgrades.hull,3);
  assert.equal(s.meta.achievements.depth500,123);assert.equal(s.meta.unlocks.vessels.dart,true);assert.equal(s.meta.unlocks.startWeapons.sonar,true);
  assert.equal(s.best.tier,1);assert.equal(s.best.depth,4727);          // the better old record, kept as "old rules"
  assert.equal(s.rankedBest.depth,0);assert.equal(Object.keys(s.meta.logbook).length,0);assert.equal(s.meta.reached,0);assert.equal(s.meta.resume,null);
  assert.equal(g.save.recordRun(202,1,700,50),true);assert.equal(g.save.recordRun(900,0,800,60),false);
  assert.equal(betterRecord({tier:1,depth:300},{tier:0,depth:9000}),true);
});
test('all achievements have Greek and English names, and the two dictionaries have the same keys',async()=>{
  const g=await game();
  for(const a of g.achievements.ACHIEVEMENTS)for(const dict of [el,en]){
    assert.ok(dict['ach.'+a.id+'.name'],a.id);assert.ok(dict['ach.'+a.id+'.desc'],a.id);
  }
  assert.deepEqual(Object.keys(el).sort(),Object.keys(en).sort());
  for(const w in WEAPONS)for(const dict of [el,en])assert.ok(dict['w.'+w+'.name']&&dict['w.'+w+'.desc'],w);
});
test('upgrade details show signed gains and before/after, including half-strength levels and the new weapons',()=>{
  const player={hp:80,maxHp:100,speedMul:1,magnet:100,regen:0,dmgMul:1,cdMul:1,armor:0};
  assert.ok(optionChanges({kind:'w',key:'lamp',lvl:1},player).some(s=>s.includes('+7')&&s.includes('23 → 30')));
  assert.ok(optionChanges({kind:'w',key:'harpoon',lvl:1},player).some(s=>s.includes('−0.1')&&s.includes('1 δευτ. → 0.9 δευτ.')));
  assert.ok(optionChanges({kind:'p',key:'hull',lvl:5},player).some(s=>s.includes('+12.5')&&s.includes('100 → 112.5')));
  assert.ok(optionChanges({kind:'p',key:'cool',lvl:0},player)[0].includes('100% → 90%'));
  assert.ok(optionChanges({kind:'heal'},player)[0].includes('+20'));
  for(const key of ['lamp2','emergency','overclock','shell','deathpulse','lightheal'])assert.ok(optionChanges({kind:'s',key},player)[0].includes('→'));
  for(const key of ['mines','anchor'])for(const line of optionChanges({kind:'w',key,lvl:1},player))assert.ok(!line.startsWith('card.'),line);
  assert.deepEqual(optionChanges({kind:'x',key:'harpoon'},player),[]);
  for(const key of ['hull','dmg','speed','magnet','lamp','card4','reroll','slot'])assert.ok(shopChanges(key,0).includes('+'));
  assert.equal(player.maxHp,100);assert.equal(player.cdMul,1);
});

// ---------- found by review, 21/09/2026 ----------
test('touching a guardian throws the vessel clear of it, never into it',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;
  const b=g.enemies.spawnBoss(1);b.x=30;b.y=0;b.at.forEach(a=>{a.t=99;});
  g.enemies.updateEnemies(0.016);
  assert.ok(P.vx<0,'the guardian is to the right, so the shove goes left');
});
test('a rooted guardian stays on its place whatever explodes beside it',async()=>{
  const g=await game();const G=g.state.G;G.tier=6;G.bossesCleared=0;
  const b=g.enemies.spawnBoss(1);assert.equal(b.type,'scylla');const x=b.x,y=b.y;
  for(let i=0;i<60;i++){g.combat.explode(b.x+20,b.y,120,1);g.enemies.updateEnemies(1/30);}
  assert.equal(b.x,x);assert.equal(b.y,y);
});
test('the death pulse does not kill the pieces of a splitter at birth',async()=>{
  const g=await game();const G=g.state.G;G.specials.deathpulse=true;
  const f=g.enemies.spawnEnemy('formless',300,0);g.combat.killEnemy(f);
  assert.equal(G.enemies.filter(e=>e.type==='formbit'&&!e.dead).length,3);
});
test('the last guardian dying cannot be overwritten by a level-up or a death in the same frame',async()=>{
  const g=await game();const G=g.state.G,P=g.state.P;G.tier=7;G.bossesCleared=3;
  const b=g.enemies.spawnBoss(4);assert.equal(b.type,'hades');b.hp=1;b.lit=true;b.x=P.x+60;b.y=P.y;P.aim=0;
  g.enemies.spawnEnemy('ker',P.x+5,P.y).dmg=1e6;
  g.update.update(0.05);
  assert.equal(G.state,'ending');assert.equal(G.tier,8);assert.ok(P.hp>0);
});
