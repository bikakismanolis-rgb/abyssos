// ---------- data ----------
// Pure data and formulas. No game state and no UI text here: names and descriptions live in src/i18n/
// under the keys w.<key>.name / p.<key>.name / s.<key>.name / e.<type>.
export const WEAPONS={
  lamp:{max:6,lv:function(l){return{dmg:16+l*7,range:165+l*24,arc:Math.min(1.7,0.85+l*0.1)};}},
  harpoon:{max:6,lv:function(l){return{dmg:18+l*7,cd:Math.max(0.2,1.1-l*0.1),count:Math.min(6,1+Math.floor((l-1)/2)),pierce:1+Math.floor(l/2),speed:520};}},
  field:{max:6,lv:function(l){return{dmg:16+l*8,cd:Math.max(0.6,2.6-l*0.22),radius:95+l*16};}},
  orbs:{max:6,lv:function(l){return{n:Math.min(8,1+Math.floor((l+1)/2)),dmg:22+l*5,r:62+l*6,spin:2.2+l*0.2};}},
  torpedo:{max:6,lv:function(l){return{dmg:40+l*16,cd:Math.max(0.7,2.8-l*0.25),radius:70+l*8,count:Math.min(5,1+Math.floor(l/3))};}},
  sonar:{max:6,lv:function(l){return{dmg:18+l*9,cd:Math.max(1.4,4.2-l*0.4),radius:190+l*25,push:460+l*50,stun:0.9+l*0.2};}},
  // two more weapons than there are slots for: a dive has to leave something behind
  mines:{max:6,lv:function(l){return{dmg:36+l*15,cd:Math.max(1.1,3.3-l*0.3),radius:80+l*9,count:Math.min(7,2+Math.floor(l/2))};}},
  anchor:{max:6,lv:function(l){return{dmg:28+l*11,cd:Math.max(1.5,3.5-l*0.3),range:210+l*24,count:1+Math.floor(l/3)};}}
};
export const PASSIVES={
  speed:{max:5,apply:function(P,f){P.speedMul+=0.12*f;}},
  magnet:{max:5,apply:function(P,f){P.magnet*=Math.pow(1.35,f);}},
  hull:{max:5,apply:function(P,f){P.maxHp+=25*f;P.hp=Math.min(P.maxHp,P.hp+25*f);}},
  regen:{max:5,apply:function(P,f){P.regen+=f;}},
  power:{max:5,apply:function(P,f){P.dmgMul+=0.12*f;}},
  cool:{max:4,apply:function(P,f){P.cdMul*=Math.pow(0.9,f);}}
};
// Specials unlock after 2, 4 and 8 total bosses in the current dive.
export const SPECIALS={lamp2:{},emergency:{},overclock:{},shell:{},deathpulse:{},lightheal:{}};
export const SPECIAL_ORDER=['lamp2','emergency','overclock','shell','deathpulse','lightheal'];
// Each new game adds one level above the base cap; those extra levels give half the normal gain
export function effLv(l,base){return l<=base?l:base+(l-base)*0.5;}
// Depth, chapters and difficulty live in places.js and run-rules.js.
//
// Creatures. Common fields: hp, spd, dmg, r (radius), xp, col (glow colour), turn, wob/wobf (weave).
//   ai     how it moves and attacks (enemies.js): chase (default), dash, fogswarm, beacon, shooter, snapper,
//          ambush, charger, circler, puller, chain, entangle
//   pack   [min,max] spawned together
//   shape  drawing family in render/creatures2.js, with its parameters in sp; creatures without a
//          shape have their own drawing in render/creatures.js
//   flags  mine, ghost, armor (share of damage ignored while not lit by the searchlight),
//          split {type,n}, blast ('fog' | 'fire')
const INK={n:1,spread:0,speed:220,kind:'ink',dmg:12,cd:3,near:230,far:320};
export const ET={
  // ---- chapter I: the sunlit waters ----
  fish:{hp:9,spd:125,dmg:6,r:8,xp:1,col:'120,215,255',turn:4,wob:40,pack:[4,7]},
  jelly:{hp:22,spd:38,dmg:11,r:15,xp:3,col:'255,110,200',turn:0.8,wob:0,pack:[2,3]},
  moray:{hp:34,spd:72,dmg:12,r:11,xp:4,col:'170,210,90',turn:3,wob:50,ai:'ambush',lunge:{near:210,mul:4.2,dur:0.45,rest:2},shape:'eel'},
  barracuda:{hp:40,spd:95,dmg:12,r:11,xp:5,col:'190,215,235',turn:2.4,wob:0,ai:'charger',charge:{near:360,speed:470,dur:0.75,tell:0.75,rest:2.8},shape:'fish',sp:{len:2.3,tall:0.42,teeth:1,stripes:5}},
  lionfish:{hp:48,spd:48,dmg:10,r:13,xp:5,col:'255,130,95',turn:1.6,wob:0,ai:'shooter',shot:{n:3,spread:0.32,speed:210,kind:'spine',dmg:9,cd:3.2,near:200,far:300},shape:'fish',sp:{len:1.2,tall:0.85,spines:9,stripes:4}},
  urchin:{hp:60,spd:34,dmg:28,r:13,xp:5,col:'255,120,90',turn:0.6,wob:0,mine:true,pack:[2,3]},
  shrimp:{hp:50,spd:80,dmg:16,r:11,xp:8,col:'255,150,120',turn:3,wob:20,ai:'snapper',pack:[1,2]},
  reefshark:{hp:105,spd:125,dmg:20,r:17,xp:10,col:'160,180,200',turn:2.2,wob:0,ai:'circler',orbit:{r:210,dive:3.4},shape:'shark',sp:{}},
  // ---- chapter II: the twilight ----
  lantern:{hp:8,spd:130,dmg:6,r:7,xp:1,col:'140,230,255',turn:4,wob:45,pack:[5,8],glow:1,shape:'fish',sp:{len:1.3,tall:0.55,dots:4,eye:0.24}},
  hatchet:{hp:24,spd:66,dmg:11,r:12,xp:3,col:'200,220,235',turn:1.8,wob:55,wobf:4,pack:[2,4],shape:'fish',sp:{len:0.9,tall:1.05,dots:5,eye:0.26,keel:1}},
  squid:{hp:55,spd:70,dmg:16,r:14,xp:6,col:'255,165,90',turn:2,wob:0,ai:'dash',dashP:{range:420,mul:4.2,dur:0.55,cd:[1.8,2.8],cruise:0.45}},
  viperfish:{hp:46,spd:100,dmg:15,r:11,xp:5,col:'120,255,190',turn:2.6,wob:0,ai:'charger',charge:{near:330,speed:480,dur:0.7,tell:0.6,rest:2.2},shape:'fish',sp:{len:2.0,tall:0.4,teeth:2,dots:6,dark:1}},
  inksquid:{hp:70,spd:60,dmg:14,r:14,xp:7,col:'120,90,170',turn:2,wob:0,ai:'shooter',shot:INK},
  swordfish:{hp:85,spd:120,dmg:22,r:15,xp:9,col:'150,190,255',turn:2,wob:0,ai:'charger',charge:{near:460,speed:640,dur:0.9,tell:0.75,rest:2.8},shape:'fish',sp:{len:2.1,tall:0.5,sword:1.5,sail:1}},
  siphon:{hp:95,spd:62,dmg:13,r:10,xp:10,col:'255,190,120',turn:1.8,wob:60,wobf:3,ai:'chain',chain:{n:18,gap:5,hit:0.5},shape:'chain',sp:{bead:1}},
  angler:{hp:130,spd:48,dmg:24,r:21,xp:12,col:'200,130,255',turn:1.2,wob:0},
  // ---- chapter III: the midnight ----
  dragonfish:{hp:30,spd:138,dmg:12,r:9,xp:3,col:'255,80,80',turn:3.4,wob:30,pack:[3,5],glow:1,shape:'fish',sp:{len:2.4,tall:0.3,teeth:1,dark:1,barbel:1}},
  plankton:{hp:5,spd:60,dmg:4,r:6,xp:1,col:'150,255,200',turn:2,wob:50,wobf:8,ai:'fogswarm',pack:[10,10]},
  gulper:{hp:75,spd:60,dmg:20,r:15,xp:8,col:'120,110,200',turn:2.4,wob:35,ai:'ambush',lunge:{near:260,mul:5.5,dur:0.5,rest:2},shape:'gulper'},
  vampire:{hp:62,spd:58,dmg:14,r:14,xp:7,col:'255,70,110',turn:2,wob:0,ai:'shooter',shot:{n:1,spread:0,speed:170,kind:'mucus',dmg:10,cd:3.4,near:210,far:300,fog:0.8},shape:'vampire'},
  beacon:{hp:40,spd:55,dmg:10,r:12,xp:5,col:'255,240,150',turn:1.5,wob:0,ai:'beacon'},
  isopod:{hp:125,spd:44,dmg:22,r:17,xp:11,col:'215,190,170',turn:1.2,wob:0,armor:0.6,shape:'crust',sp:{segs:7,legs:7,flat:1}},
  ghost:{hp:40,spd:190,dmg:18,r:10,xp:6,col:'190,230,255',turn:2.5,wob:90,wobf:11,ghost:true,pack:[2,2]},
  // ---- chapter IV: the abyss ----
  amphipod:{hp:7,spd:150,dmg:6,r:7,xp:1,col:'255,205,160',turn:4.5,wob:60,wobf:9,pack:[6,9],shape:'crust',sp:{segs:5,legs:4,curl:1}},
  rattail:{hp:46,spd:84,dmg:15,r:13,xp:5,col:'150,165,190',turn:2,wob:25,pack:[1,2],shape:'fish',sp:{len:2.4,tall:0.6,taper:1,eye:0.26}},
  seapig:{hp:18,spd:30,dmg:9,r:11,xp:2,col:'255,170,190',turn:1,wob:0,pack:[5,8],shape:'blob',sp:{legs:6,feelers:4}},
  dumbo:{hp:52,spd:52,dmg:14,r:14,xp:6,col:'255,170,120',turn:2,wob:0,ai:'dash',dashP:{range:260,mul:3.2,dur:0.4,cd:[2.2,3.2],cruise:0.8},shape:'dumbo'},
  cuskeel:{hp:40,spd:108,dmg:14,r:11,xp:4,col:'200,200,230',turn:3,wob:70,shape:'eel'},
  tripod:{hp:88,spd:40,dmg:22,r:14,xp:9,col:'190,220,255',turn:2.6,wob:0,ai:'ambush',lunge:{near:250,mul:7,dur:0.42,rest:2.2},shape:'fish',sp:{len:1.7,tall:0.5,rays:3}},
  faceless:{hp:145,spd:50,dmg:24,r:19,xp:13,col:'170,150,140',turn:1.2,wob:0,armor:0.5,shape:'fish',sp:{len:1.6,tall:0.8,eye:0,blunt:1}},
  // ---- chapter V: the trenches ----
  snailfish:{hp:10,spd:112,dmg:7,r:8,xp:1,col:'255,225,235',turn:3.6,wob:50,pack:[5,8],shape:'fish',sp:{len:1.9,tall:0.75,taper:1,pale:1,eye:0.12}},
  redshrimp:{hp:56,spd:86,dmg:17,r:11,xp:8,col:'255,80,70',turn:3,wob:20,ai:'snapper',pack:[1,2]},
  holothurian:{hp:62,spd:46,dmg:13,r:15,xp:5,col:'255,90,120',turn:1.4,wob:40,wobf:2,split:{type:'holobit',n:2},shape:'blob',sp:{veil:1}},
  holobit:{hp:22,spd:74,dmg:9,r:9,xp:2,col:'255,120,150',turn:2.4,wob:40,wobf:3,shape:'blob',sp:{veil:1}},
  hadaljelly:{hp:52,spd:36,dmg:12,r:15,xp:6,col:'255,60,60',turn:0.9,wob:0,ai:'shooter',shot:{n:1,spread:0,speed:190,kind:'sting',dmg:11,cd:3.6,near:120,far:420}},
  superamphipod:{hp:74,spd:92,dmg:19,r:14,xp:8,col:'255,225,190',turn:2.4,wob:0,ai:'charger',charge:{near:340,speed:500,dur:0.75,tell:0.6,rest:2.3},shape:'crust',sp:{segs:7,legs:5,curl:1}},
  xeno:{hp:70,spd:26,dmg:24,r:15,xp:6,col:'210,190,150',turn:0.5,wob:0,mine:true,blast:'fog',pack:[2,3],shape:'lump'},
  plasticbag:{hp:14,spd:46,dmg:0,r:13,xp:2,col:'235,245,255',turn:1,wob:80,wobf:1.6,ai:'entangle',pack:[1,3],shape:'bag'},
  // ---- chapter VI: sunken worlds ----
  fishman:{hp:60,spd:92,dmg:17,r:13,xp:6,col:'110,230,170',turn:2.6,wob:0,ai:'dash',dashP:{range:340,mul:3.6,dur:0.5,cd:[2,3],cruise:0.7},pack:[1,3],shape:'human',sp:{tail:0,skin:'scale',weapon:'claw'}},
  automaton:{hp:66,spd:60,dmg:14,r:13,xp:7,col:'255,215,130',turn:2,wob:0,ai:'shooter',shot:{n:1,spread:0,speed:300,kind:'bolt',dmg:13,cd:2.8,near:220,far:340},shape:'fish',sp:{len:1.6,tall:0.62,metal:1,prop:1}},
  hoplite:{hp:130,spd:50,dmg:24,r:16,xp:12,col:'215,160,80',turn:1.6,wob:0,armor:0.5,ai:'ambush',lunge:{near:200,mul:5,dur:0.4,rest:2},shape:'human',sp:{tail:0,skin:'bronze',weapon:'spear',shield:1,crest:1}},
  tridentguard:{hp:82,spd:58,dmg:15,r:14,xp:8,col:'120,220,255',turn:2,wob:0,ai:'shooter',shot:{n:3,spread:0.26,speed:240,kind:'trident',dmg:12,cd:3.2,near:230,far:330},shape:'human',sp:{tail:1,skin:'bronze',weapon:'trident'}},
  ammonite:{hp:105,spd:42,dmg:20,r:16,xp:10,col:'230,190,140',turn:1.2,wob:0,armor:0.55,shape:'shell'},
  formless:{hp:110,spd:50,dmg:18,r:18,xp:8,col:'120,255,140',turn:1.4,wob:0,split:{type:'formbit',n:3},shape:'blob',sp:{eyes:5,dark:1}},
  formbit:{hp:30,spd:84,dmg:11,r:10,xp:2,col:'120,255,140',turn:2.4,wob:30,shape:'blob',sp:{eyes:2,dark:1}},
  ichthyosaur:{hp:125,spd:110,dmg:24,r:18,xp:12,col:'140,200,190',turn:2,wob:0,ai:'charger',charge:{near:440,speed:600,dur:0.9,tell:0.7,rest:2.6},shape:'shark',sp:{snout:1.2,eye:0.3}},
  // ---- chapter VII: the monsters of myth ----
  triton:{hp:92,spd:64,dmg:17,r:15,xp:9,col:'90,200,255',turn:2.2,wob:0,ai:'shooter',shot:{n:1,spread:0,speed:330,kind:'trident',dmg:15,cd:2.6,near:240,far:360},shape:'human',sp:{tail:1,skin:'sea',weapon:'trident'}},
  hippocampus:{hp:100,spd:112,dmg:21,r:16,xp:10,col:'120,255,230',turn:2.2,wob:0,ai:'charger',charge:{near:420,speed:580,dur:0.85,tell:0.65,rest:2.5},shape:'hippo'},
  gorgona:{hp:86,spd:120,dmg:18,r:14,xp:9,col:'255,170,220',turn:2.4,wob:0,ai:'circler',orbit:{r:200,dive:3},shape:'human',sp:{tail:1,skin:'pale',hair:1}},
  siren:{hp:72,spd:56,dmg:12,r:13,xp:8,col:'255,225,120',turn:1.8,wob:0,ai:'puller',song:{every:5.5,dur:2.2,radius:400,force:330,keep:260},shape:'human',sp:{tail:1,skin:'pale',hair:1,wings:1}},
  draugr:{hp:56,spd:170,dmg:19,r:12,xp:7,col:'150,255,210',turn:2.4,wob:80,wobf:9,ghost:true,pack:[2,3],shape:'human',sp:{tail:0,skin:'ghost',weapon:'axe',helm:1}},
  telchine:{hp:64,spd:58,dmg:12,r:13,xp:8,col:'255,110,60',turn:1.6,wob:0,ai:'beacon',shape:'human',sp:{tail:0,skin:'dark',weapon:'staff',dog:1}},
  seaserpent:{hp:150,spd:92,dmg:18,r:13,xp:14,col:'90,255,160',turn:2,wob:70,wobf:3,ai:'chain',chain:{n:26,gap:4,hit:0.55},shape:'chain',sp:{fins:1}},
  // ---- chapter VIII: the Underworld ----
  shade:{hp:12,spd:150,dmg:9,r:9,xp:1,col:'190,200,255',turn:3,wob:70,wobf:7,ghost:true,pack:[4,6],shape:'human',sp:{tail:0,skin:'ghost',robe:1}},
  skeleton:{hp:120,spd:60,dmg:22,r:15,xp:11,col:'235,230,210',turn:1.8,wob:0,armor:0.5,shape:'human',sp:{tail:0,skin:'bone',weapon:'oar'}},
  fury:{hp:84,spd:150,dmg:19,r:14,xp:9,col:'255,80,80',turn:2.8,wob:0,ai:'circler',orbit:{r:220,dive:2.6},shape:'human',sp:{tail:0,skin:'dark',wings:1,weapon:'whip',robe:1}},
  ker:{hp:92,spd:100,dmg:23,r:14,xp:10,col:'200,60,90',turn:2.2,wob:0,ai:'charger',charge:{near:400,speed:620,dur:0.8,tell:0.6,rest:2.3},shape:'human',sp:{tail:0,skin:'dark',wings:1,weapon:'claw',robe:1}},
  lamia:{hp:112,spd:54,dmg:24,r:16,xp:11,col:'190,255,120',turn:2.4,wob:40,ai:'ambush',lunge:{near:250,mul:6,dur:0.45,rest:1.9},shape:'human',sp:{tail:2,skin:'scale',hair:1}},
  flame:{hp:60,spd:40,dmg:24,r:13,xp:6,col:'255,140,40',turn:0.8,wob:30,mine:true,blast:'fire',pack:[2,3],shape:'flame'},

  // ---- guardians ----
  // move: chase | orbit | anchor | keep.  atk: attack modules, read by updateBoss() in enemies.js.
  // Base hp follows the place's slot in its chapter (about 1500 / 2100 / 2900 / 3600); run-rules scales it by chapter.
  tigershark:{hp:1500,spd:62,dmg:28,r:40,xp:60,col:'190,200,170',turn:1.2,boss:true,move:'chase',shape:'shark',sp:{stripes:7},
    atk:[{k:'dash',every:[3,4.5],range:520,speed:440,dur:0.8,tell:0.35},{k:'summon',every:9,first:6,type:'fish',n:4}]},
  wreck:{hp:2100,spd:30,dmg:30,r:56,xp:90,col:'190,160,110',turn:0.5,boss:true,move:'chase',
    atk:[{k:'pull',every:6,dur:2,radius:340,force:640},{k:'summon',every:9,first:6,type:'urchin',n:2}]},
  seamine:{hp:2700,spd:22,dmg:30,r:46,xp:100,col:'255,120,90',turn:0.5,boss:true,move:'chase',shape:'mine',
    atk:[{k:'summon',every:6.5,first:4,type:'urchin',n:3},{k:'slam',every:6,first:3,n:2,r:88,tell:1.1,dmg:0.7}]},
  queen:{hp:3400,spd:25,dmg:26,r:48,xp:120,col:'255,140,230',turn:0.6,boss:true,move:'chase',
    atk:[{k:'sting',every:4,range:230,push:200},{k:'summon',every:7,first:5,type:'jelly',n:3}]},

  humboldt:{hp:1500,spd:70,dmg:28,r:36,xp:60,col:'255,70,60',turn:1.4,boss:true,move:'chase',shape:'squidboss',
    atk:[{k:'dash',every:[2.6,3.8],range:500,speed:470,dur:0.7,tell:0.3},{k:'summon',every:8,first:5,type:'squid',n:3}]},
  elephantseal:{hp:2200,spd:48,dmg:32,r:46,xp:85,col:'190,170,150',turn:0.9,boss:true,move:'chase',shape:'seal',
    atk:[{k:'ram',every:5.5,first:3,speed:600,dur:1.0,tell:1},{k:'slam',every:7,first:5,n:1,r:110,tell:1,dmg:0.8}]},
  boss1:{hp:2900,spd:55,dmg:30,r:44,xp:110,col:'255,120,60',turn:1,boss:true,move:'chase',
    atk:[{k:'dash',every:[3,4.5],range:520,speed:430,dur:0.8,tell:0},{k:'summon',every:8,first:6,type:'squid',n:3},{k:'fan',every:6,first:4,n:3,spread:0.2,speed:220,kind:'ink',tell:0.7,range:650}]},
  greatangler:{hp:3600,spd:40,dmg:34,r:54,xp:130,col:'200,130,255',turn:1,boss:true,move:'chase',shape:'anglerboss',
    atk:[{k:'pull',every:7,first:4,dur:2.2,radius:380,force:560},{k:'dash',every:[4,5],range:300,speed:520,dur:0.5,tell:0.45},{k:'fog',every:9,first:6,amount:0.9},{k:'summon',every:10,first:8,type:'beacon',n:1}]},

  whitewhale:{hp:1700,spd:44,dmg:36,r:58,xp:70,col:'235,240,250',turn:0.8,boss:true,move:'chase',shape:'whale',
    atk:[{k:'ram',every:5.5,first:3,speed:680,dur:1.2,tell:1},{k:'slam',every:8,first:6,n:1,r:120,tell:0.9,dmg:1.1}]},
  ventlord:{hp:2300,spd:0,dmg:30,r:50,xp:95,col:'255,150,70',turn:1,boss:true,move:'anchor',shape:'vents',
    atk:[{k:'fan',every:3.2,first:2,n:5,spread:0.3,speed:230,kind:'fire',tell:0.7,range:900},{k:'vents',every:5,first:3,n:2},{k:'summon',every:9,first:6,type:'shrimp',n:2}]},
  colossal:{hp:3000,spd:58,dmg:32,r:48,xp:120,col:'255,90,110',turn:1,boss:true,move:'chase',shape:'squidboss',
    atk:[{k:'dash',every:[3,4.2],range:520,speed:450,dur:0.8,tell:0.3},{k:'sting',every:4.5,range:240,push:240,tell:0.5},{k:'fan',every:6,first:5,n:5,spread:0.2,speed:230,kind:'ink',tell:0.7,range:650}]},
  rusteater:{hp:3800,spd:34,dmg:30,r:54,xp:135,col:'255,130,60',turn:0.7,boss:true,move:'chase',shape:'rust',
    atk:[{k:'split',at:[0.75,0.5,0.25],type:'rustbit',n:4},{k:'nova',every:6,first:4,n:10,speed:190,kind:'rust',tell:0.8},{k:'pull',every:9,first:7,dur:1.8,radius:320,force:560}]},
  rustbit:{hp:80,spd:70,dmg:14,r:14,xp:5,col:'255,130,60',turn:1.8,wob:0,shape:'blob',sp:{rust:1}},

  turret:{hp:1700,spd:26,dmg:30,r:46,xp:70,col:'170,190,200',turn:0.6,boss:true,move:'keep',keep:[260,380],shape:'turret',
    atk:[{k:'fan',every:3.4,first:2.5,n:3,spread:0.12,speed:340,kind:'shell',tell:0.8,range:900},{k:'slam',every:6,first:4,n:3,r:78,tell:1,dmg:1}]},
  trashheap:{hp:2400,spd:30,dmg:28,r:56,xp:95,col:'200,230,240',turn:0.6,boss:true,move:'chase',shape:'trash',
    atk:[{k:'pull',every:6.5,first:4,dur:2.2,radius:360,force:600},{k:'summon',every:6,first:3,type:'plasticbag',n:3},{k:'nova',every:8,first:6,n:8,speed:170,kind:'junk',tell:0.8}]},
  greenland:{hp:3100,spd:40,dmg:38,r:52,xp:120,col:'150,170,175',turn:0.7,boss:true,move:'orbit',orbit:300,shape:'shark',sp:{old:1},
    atk:[{k:'dash',every:[4,5],range:460,speed:520,dur:0.9,tell:0.6},{k:'summon',every:10,first:7,type:'cuskeel',n:3}]},
  swarmmind:{hp:3700,spd:60,dmg:30,r:40,xp:135,col:'255,205,160',turn:1.6,boss:true,move:'chase',shape:'swarm',
    atk:[{k:'summon',every:4,first:2,type:'amphipod',n:6},{k:'dash',every:[3.5,4.5],range:480,speed:460,dur:0.7,tell:0.4},{k:'split',at:[0.5],type:'superamphipod',n:4}]},

  fault:{hp:1800,spd:0,dmg:30,r:60,xp:75,col:'255,110,50',turn:1,boss:true,move:'anchor',shape:'fault',
    atk:[{k:'slam',every:3.4,first:2,n:3,r:86,tell:1,dmg:1.1},{k:'nova',every:7,first:5,n:12,speed:200,kind:'rock',tell:0.9},{k:'vents',every:8,first:6,n:2}]},
  snailking:{hp:2400,spd:46,dmg:28,r:50,xp:95,col:'255,225,235',turn:0.9,boss:true,move:'chase',shape:'snailking',
    atk:[{k:'summon',every:5,first:3,type:'snailfish',n:6},{k:'dash',every:[3.5,5],range:440,speed:430,dur:0.8,tell:0.45},{k:'sting',every:5,range:220,push:220,tell:0.5}]},
  rtg:{hp:3100,spd:20,dmg:30,r:40,xp:120,col:'120,255,170',turn:0.6,boss:true,move:'keep',keep:[220,340],shape:'rtg',
    atk:[{k:'nova',every:4,first:2.5,n:14,speed:180,kind:'ray',tell:0.8},{k:'aura',radius:150,dps:9},{k:'summon',every:9,first:6,type:'xeno',n:2}]},
  hadaltitan:{hp:3900,spd:40,dmg:40,r:60,xp:140,col:'255,225,190',turn:0.8,boss:true,move:'chase',armor:0.5,shape:'titan',
    atk:[{k:'slam',every:4,first:3,n:2,r:100,tell:0.9,dmg:1.2},{k:'dash',every:[4.5,5.5],range:420,speed:480,dur:0.7,tell:0.5},{k:'summon',every:8,first:5,type:'plasticbag',n:2},{k:'summon',every:11,first:8,type:'superamphipod',n:2}]},

  nautilus:{hp:1800,spd:50,dmg:36,r:54,xp:75,col:'255,215,130',turn:0.9,boss:true,move:'chase',shape:'nautilus',
    atk:[{k:'ram',every:5,first:3,speed:720,dur:1.1,tell:0.9},{k:'nova',every:7,first:5,n:12,speed:230,kind:'bolt',tell:0.7},{k:'summon',every:10,first:7,type:'automaton',n:2}]},
  colossus:{hp:2500,spd:30,dmg:40,r:56,xp:100,col:'215,160,80',turn:0.7,boss:true,move:'chase',armor:0.55,shape:'colossus',
    atk:[{k:'slam',every:3.8,first:2.5,n:3,r:92,tell:1,dmg:1.2},{k:'fan',every:6,first:4,n:3,spread:0.24,speed:280,kind:'trident',tell:0.7,range:700},{k:'summon',every:11,first:8,type:'hoplite',n:2}]},
  plesiosaur:{hp:3200,spd:80,dmg:34,r:36,xp:125,col:'140,200,190',turn:1.4,boss:true,move:'orbit',orbit:270,trail:26,shape:'plesio',
    atk:[{k:'dash',every:[4,5],range:440,speed:520,dur:0.75,tell:0.4},{k:'summon',every:9,first:6,type:'ichthyosaur',n:1},{k:'sting',every:5,range:230,push:240,tell:0.5}]},
  cthulhu:{hp:4000,spd:34,dmg:40,r:62,xp:150,col:'120,255,140',turn:0.7,boss:true,move:'chase',shape:'cthulhu',
    atk:[{k:'fog',every:7,first:3,amount:1},{k:'sting',every:4,range:260,push:260,tell:0.55},{k:'summon',every:8,first:5,type:'fishman',n:3},{k:'nova',every:9,first:7,n:16,speed:170,kind:'mucus',tell:0.9},{k:'teleport',every:12,first:10}]},

  scylla:{hp:1900,spd:0,dmg:36,r:58,xp:80,col:'190,120,255',turn:1,boss:true,move:'anchor',shape:'scylla',
    atk:[{k:'whirl',radius:520,force:100,core:70,dps:22,dist:420},{k:'lunge',every:2.6,first:2,heads:6,reach:330,tell:0.7,r:60,dmg:1},{k:'fan',every:7,first:5,n:6,spread:0.22,speed:240,kind:'ink',tell:0.7,range:900}]},
  leviathan:{hp:2600,spd:95,dmg:34,r:30,xp:130,col:'120,255,190',turn:1.4,boss:true,move:'orbit',orbit:260,trail:28,
    atk:[{k:'dash',every:5,range:420,speed:480,dur:0.7,tell:0},{k:'summon',every:9,first:6,type:'seaserpent',n:1},{k:'fan',every:6,first:4,n:7,spread:0.16,speed:250,kind:'fire',tell:0.8,range:700}]},
  boss2:{hp:3300,spd:50,dmg:38,r:60,xp:120,col:'255,70,120',turn:0.9,boss:true,move:'chase',
    atk:[{k:'dash',every:[3,4.5],range:520,speed:430,dur:0.8,tell:0},{k:'summon',every:8,first:6,type:'squid',n:3},{k:'fan',every:3.6,first:4,n:5,spread:0.2,speed:220,kind:'ink',tell:0.7,range:650},{k:'sting',every:6,range:250,push:240,tell:0.5}]},
  poseidon:{hp:4200,spd:52,dmg:42,r:50,xp:160,col:'90,200,255',turn:1.1,boss:true,move:'keep',keep:[230,360],shape:'poseidon',
    atk:[{k:'fan',every:3,first:2,n:3,spread:0.2,speed:360,kind:'trident',tell:0.6,range:900},{k:'slam',every:5,first:3.5,n:3,r:90,tell:1,dmg:1.2},{k:'summon',every:9,first:6,type:'hippocampus',n:2},{k:'pull',every:11,first:8,dur:2,radius:420,force:520}]},

  charon:{hp:2000,spd:44,dmg:36,r:50,xp:85,col:'190,200,255',turn:1,boss:true,move:'keep',keep:[200,320],shape:'charon',
    atk:[{k:'summon',every:4.5,first:2.5,type:'shade',n:5},{k:'sting',every:4,range:250,push:280,tell:0.55},{k:'teleport',every:9,first:7},{k:'nova',every:8,first:5,n:10,speed:200,kind:'soul',tell:0.8}]},
  cerberus:{hp:2800,spd:74,dmg:40,r:52,xp:110,col:'255,90,50',turn:1.3,boss:true,move:'chase',shape:'cerberus',
    atk:[{k:'dash',every:[2.4,3.4],range:520,speed:500,dur:0.6,tell:0.35,chain:3},{k:'fan',every:5,first:3.5,n:9,spread:0.17,speed:260,kind:'fire',tell:0.75,range:700},{k:'summon',every:10,first:7,type:'fury',n:2}]},
  hydra:{hp:3600,spd:0,dmg:38,r:60,xp:140,col:'150,255,120',turn:1,boss:true,move:'anchor',shape:'hydra',
    atk:[{k:'lunge',every:2.2,first:2,heads:7,reach:340,tell:0.65,r:58,dmg:1},{k:'split',at:[0.8,0.6,0.4,0.2],type:'hydrahead',n:2},{k:'nova',every:7,first:5,n:12,speed:190,kind:'poison',tell:0.8}]},
  hydrahead:{hp:160,spd:96,dmg:18,r:15,xp:8,col:'150,255,120',turn:2.2,wob:50,wobf:3,ai:'chain',chain:{n:12,gap:4,hit:0.5},split:{type:'hydrabit',n:2},shape:'chain',sp:{fins:0}},
  hydrabit:{hp:50,spd:118,dmg:12,r:10,xp:3,col:'190,255,150',turn:3,wob:50,wobf:4,shape:'eel'},
  hades:{hp:4600,spd:50,dmg:44,r:48,xp:200,col:'200,120,255',turn:1.1,boss:true,move:'keep',keep:[220,340],shape:'hades',
    atk:[{k:'cloak',every:9,first:6,dur:3},{k:'fan',every:3.2,first:2,n:2,spread:0.3,speed:380,kind:'soul',tell:0.55,range:900},{k:'summon',every:6,first:4,type:'shade',n:5},{k:'slam',every:5.5,first:4,n:3,r:92,tell:0.9,dmg:1.3},{k:'teleport',every:8,first:7},{k:'summon',every:14,first:10,type:'ker',n:2}]}
};
// Vessels. The Dart trades hull for speed and a narrow, long searchlight; unlocked by clearing the first chapter.
export const VESSELS={
  bathy:{maxHp:100,speed:1,lampArc:1,lampRange:1},
  dart:{maxHp:70,speed:1.25,lampArc:0.6,lampRange:1.35}
};
// Sea conditions: every dive draws one. Multipliers on the usual rules; `light` pays for the harder ones.
//   lamp searchlight range · fog standing murk · xp light per mote · spawn seconds between waves (lower = more)
//   ehp / espd / edmg creature health, speed, damage · currents / chest bias the sea events
export const CONDITIONS={
  calm:{},
  murky:{lamp:0.8,fog:0.22,xp:1.25,light:1.15},
  swarms:{spawn:0.8,ehp:0.85,light:1.15},
  currents:{currents:1,light:1.1},
  rich:{chest:1,edmg:1.1},
  heavy:{ehp:1.3,espd:0.88,light:1.2},
  hungry:{espd:1.12,ehp:0.9,light:1.2},
  clear:{lamp:1.15,edmg:1.1}
};
export const NO_MODS={lamp:1,fog:0,xp:1,spawn:1,ehp:1,espd:1,edmg:1,light:1,currents:0,chest:0};
// Evolutions: a weapon at its base cap plus the right ability at level 3 offers one card that transforms the weapon
export const EVOLUTIONS={
  harpoon:{passive:'power',key:'trident'},
  field:{passive:'regen',key:'livefield'},
  orbs:{passive:'speed',key:'maelstrom'},
  torpedo:{passive:'cool',key:'salvo'},
  sonar:{passive:'magnet',key:'whalesong'},
  lamp:{passive:'hull',key:'lighthouse'}
};
export const EVO_PASSIVE_LEVEL=3;
export function xpFor(l){return Math.floor(8+l*4+l*l*0.5);}
