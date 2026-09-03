// ---------- data ----------
// Pure data and formulas. No game state and no UI text here: names and descriptions live in src/i18n/
// under the keys w.<key>.name / p.<key>.name / s.<key>.name / e.<type>.
export const WEAPONS={
  lamp:{max:6,lv:function(l){return{dmg:16+l*7,range:165+l*24,arc:Math.min(1.7,0.85+l*0.1)};}},
  harpoon:{max:6,lv:function(l){return{dmg:18+l*7,cd:Math.max(0.2,1.1-l*0.1),count:Math.min(6,1+Math.floor((l-1)/2)),pierce:1+Math.floor(l/2),speed:520};}},
  field:{max:6,lv:function(l){return{dmg:16+l*8,cd:Math.max(0.6,2.6-l*0.22),radius:95+l*16};}},
  orbs:{max:6,lv:function(l){return{n:Math.min(8,1+Math.floor((l+1)/2)),dmg:22+l*5,r:62+l*6,spin:2.2+l*0.2};}},
  torpedo:{max:6,lv:function(l){return{dmg:40+l*16,cd:Math.max(0.7,2.8-l*0.25),radius:70+l*8,count:Math.min(5,1+Math.floor(l/3))};}},
  sonar:{max:6,lv:function(l){return{dmg:18+l*9,cd:Math.max(1.4,4.2-l*0.4),radius:190+l*25,push:460+l*50,stun:0.9+l*0.2};}}
};
export const PASSIVES={
  speed:{max:5,apply:function(P,f){P.speedMul+=0.12*f;}},
  magnet:{max:5,apply:function(P,f){P.magnet*=Math.pow(1.35,f);}},
  hull:{max:5,apply:function(P,f){P.maxHp+=25*f;P.hp=Math.min(P.maxHp,P.hp+25*f);}},
  regen:{max:5,apply:function(P,f){P.regen+=f;}},
  power:{max:5,apply:function(P,f){P.dmgMul+=0.12*f;}},
  cool:{max:4,apply:function(P,f){P.cdMul*=Math.pow(0.9,f);}}
};
// Special one-time upgrades: two unlock every 5 new games (NG+5, NG+10, NG+15)
export const SPECIALS={lamp2:{},emergency:{},overclock:{},shell:{},deathpulse:{},lightheal:{}};
export const SPECIAL_ORDER=['lamp2','emergency','overclock','shell','deathpulse','lightheal'];
// Each new game adds one level above the base cap; those extra levels give half the normal gain
export function effLv(l,base){return l<=base?l:base+(l-base)*0.5;}
// Difficulty only changes when a new game starts (both bosses killed)
export const TIER_HP=1.4,TIER_DMG=1.2,TIER_SPD=1.04,TIER_DENSITY=1.15,TIER_BOSS=1.5;
export const ET={
  fish:{hp:9,spd:125,dmg:6,r:8,xp:1,col:'120,215,255',turn:4,wob:40},
  jelly:{hp:22,spd:38,dmg:11,r:15,xp:3,col:'255,110,200',turn:0.8,wob:0},
  eel:{hp:34,spd:100,dmg:14,r:11,xp:4,col:'110,255,170',turn:3,wob:70},
  squid:{hp:55,spd:70,dmg:16,r:14,xp:6,col:'255,165,90',turn:2,wob:0},
  angler:{hp:130,spd:48,dmg:24,r:21,xp:12,col:'200,130,255',turn:1.2,wob:0},
  urchin:{hp:60,spd:34,dmg:28,r:13,xp:5,col:'255,120,90',turn:0.6,wob:0,mine:true},
  ghost:{hp:40,spd:190,dmg:18,r:10,xp:6,col:'190,230,255',turn:2.5,wob:90,wobf:11,ghost:true},
  boss1:{hp:1500,spd:55,dmg:30,r:44,xp:60,col:'255,120,60',turn:1,wob:0,boss:true},
  boss2:{hp:3600,spd:50,dmg:38,r:60,xp:120,col:'255,70,120',turn:0.9,wob:0,boss:true}
};
export const ZONES=[
  {d:0,top:[9,54,92],bot:[3,24,46]},
  {d:1000,top:[5,28,60],bot:[2,9,24]},
  {d:3000,top:[4,7,22],bot:[0,1,6]},
  {d:6000,top:[10,3,14],bot:[0,0,0]}
];
export const DEPTH_RATE=7;
// Vessels. The Dart trades hull for speed and a narrow, long searchlight; unlocked by killing the Kraken.
export const VESSELS={
  bathy:{maxHp:100,speed:1,lampArc:1,lampRange:1},
  dart:{maxHp:70,speed:1.25,lampArc:0.6,lampRange:1.35}
};
export function ngLabel(t){if(t<=3){let s='NG';for(let i=0;i<t;i++)s+='+';return s;}return 'NG+'+t;}
export function xpFor(l){return Math.floor(8+l*4+l*l*0.5);}
