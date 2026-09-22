// ---------- the dive map: chapters and places ----------
// Pure data and pure functions. No game state, no UI text: names and stories live in src/i18n/
// under ch.<key>.name, pl.<id>.name / .where / .story, and e.<type> for the guardians.
// The design document is ΧΑΡΤΗΣ_ΚΑΤΑΔΥΣΗΣ.md in the project root.
//
// A chapter is what the old rules called an NG tier: four places, the fourth guarded by the
// chapter's great guardian. Depths down to 10,935 m are real; below that they are invented.

// Seconds of descent between two places. Same pacing as the old 600 m at 7 m/s, so the balance
// of the game does not depend on how far apart two places really are.
export const SEG_TIME=600/7;
export const PLACES_PER_CHAPTER=4;
export const LAST_TIER=7;                 // the Underworld; tier 8 and beyond is the endless Bottomless
export const ENDLESS_STEP=600;            // metres between gates below the throne of Hades

// spawn rows: [creature type, weight, places cleared in this chapter before it appears]
export const CHAPTERS=[
  {key:'sun',top:[20,112,162],bot:[5,50,96],rays:1,
   spawn:[['fish',10,0],['jelly',6,0],['moray',2.6,0],['barracuda',1.8,1],['lionfish',1.6,2],['urchin',1.2,2],['shrimp',1,3],['reefshark',0.8,3]]},
  {key:'twilight',top:[9,54,92],bot:[3,24,46],rays:0.5,
   spawn:[['lantern',9,0],['hatchet',6,0],['squid',4,0],['viperfish',2.2,0],['inksquid',2,1],['swordfish',1.2,2],['siphon',1.1,2],['angler',1,3]]},
  {key:'midnight',top:[5,22,52],bot:[1,6,18],rays:0,
   spawn:[['dragonfish',8,0],['plankton',3,0],['angler',4,0],['gulper',3,0],['vampire',2.4,0],['beacon',1.2,1],['isopod',2,1],['ghost',2.4,2],['urchin',1.6,2]]},
  {key:'abyss',top:[4,8,24],bot:[0,1,6],rays:0,
   spawn:[['amphipod',7,0],['rattail',6,0],['seapig',4,0],['dumbo',3,0],['cuskeel',3,0],['tripod',2.2,1],['faceless',1.8,2],['shrimp',1.8,2]]},
  {key:'trench',top:[10,4,16],bot:[0,0,0],rays:0,
   spawn:[['snailfish',9,0],['redshrimp',3,0],['holothurian',3,0],['hadaljelly',3,0],['superamphipod',2.4,1],['xeno',2,1],['plasticbag',1.6,2],['faceless',1.2,3]]},
  {key:'sunken',top:[6,30,34],bot:[0,8,10],rays:0,
   spawn:[['fishman',7,0],['automaton',4,0],['hoplite',3,0],['tridentguard',3,1],['ammonite',2.4,1],['formless',2,2],['ichthyosaur',2,2]]},
  {key:'myth',top:[30,10,44],bot:[6,0,12],rays:0,
   spawn:[['triton',5,0],['hippocampus',4,0],['gorgona',4,0],['siren',2.4,0],['draugr',3,1],['telchine',1.4,1],['seaserpent',2,2]]},
  {key:'underworld',top:[44,10,8],bot:[8,0,0],rays:0,
   spawn:[['shade',9,0],['skeleton',4,0],['fury',3.5,0],['ker',3,1],['lamia',2.6,1],['flame',2,2]]}
];
export const ENDLESS={key:'endless',top:[14,14,18],bot:[0,0,0],rays:0};

// id, real or invented depth in metres, guardian type (config.js ET), backdrop (render/places.js)
export const PLACES=[
  {id:'reef',depth:30,boss:'tigershark',scene:'reef'},
  {id:'antikythera',depth:45,boss:'wreck',scene:'ancientwreck'},
  {id:'britannic',depth:122,boss:'seamine',scene:'liner'},
  {id:'bluehole',depth:202,boss:'queen',scene:'cave'},

  {id:'scubalimit',depth:332,boss:'humboldt',scene:'line'},
  {id:'penguin',depth:564,boss:'elephantseal',scene:'ice'},
  {id:'giantsquid',depth:900,boss:'boss1',scene:'open'},
  {id:'lastlight',depth:1000,boss:'greatangler',scene:'lastlight'},

  {id:'whale',depth:2250,boss:'whitewhale',scene:'open'},
  {id:'vents',depth:2600,boss:'ventlord',scene:'vents'},
  {id:'beaked',depth:2992,boss:'colossal',scene:'canyon'},
  {id:'titanic',depth:3800,boss:'rusteater',scene:'brokenliner'},

  {id:'bismarck',depth:4791,boss:'turret',scene:'battleship'},
  {id:'calypso',depth:5109,boss:'trashheap',scene:'trash'},
  {id:'molloy',depth:5550,boss:'greenland',scene:'sediment'},
  {id:'sammyb',depth:6895,boss:'swarmmind',scene:'destroyer'},

  {id:'java',depth:7192,boss:'fault',scene:'walls'},
  {id:'deepfish',depth:8336,boss:'snailking',scene:'walls'},
  {id:'horizon',depth:10800,boss:'rtg',scene:'sediment'},
  {id:'challenger',depth:10935,boss:'hadaltitan',scene:'bottom'},

  {id:'nautilus',depth:11500,boss:'nautilus',scene:'garden'},
  {id:'atlantis',depth:12300,boss:'colossus',scene:'atlantis'},
  {id:'lidenbrock',depth:13100,boss:'plesiosaur',scene:'innersea'},
  {id:'rlyeh',depth:14000,boss:'cthulhu',scene:'rlyeh'},

  {id:'scylla',depth:14800,boss:'scylla',scene:'strait'},
  {id:'leviathan',depth:15500,boss:'leviathan',scene:'bones'},
  {id:'kraken',depth:16200,boss:'boss2',scene:'shipyard'},
  {id:'poseidon',depth:17000,boss:'poseidon',scene:'palace'},

  {id:'styx',depth:17700,boss:'charon',scene:'river'},
  {id:'cerberus',depth:18400,boss:'cerberus',scene:'gates'},
  {id:'tartarus',depth:19200,boss:'hydra',scene:'tartarus'},
  {id:'hades',depth:20000,boss:'hades',scene:'throne'}
];
export const BOTTOM=PLACES[PLACES.length-1].depth;

export function chapterOf(tier){return tier<=LAST_TIER?CHAPTERS[tier]:ENDLESS;}
// Below the throne the gates repeat every 600 m and the guardians come back in a fixed shuffle.
export function placeAt(tier,slot){
  if(tier<=LAST_TIER)return PLACES[tier*PLACES_PER_CHAPTER+slot-1];
  const n=(tier-LAST_TIER-1)*PLACES_PER_CHAPTER+slot;
  const src=PLACES[(n*7+tier*5)%PLACES.length];
  return {id:null,depth:BOTTOM+n*ENDLESS_STEP,boss:src.boss,scene:null,echo:src.id};
}
export function gateDepth(tier,slot){return placeAt(tier,slot).depth;}
// Depth at which a chapter begins: the last gate of the chapter above it
export function chapterStart(tier){return tier<=0?0:gateDepth(tier-1,PLACES_PER_CHAPTER);}
// 0..1 through the chapter, from the depth alone. Every segment counts the same, however long it really is.
export function chapterProgress(depth,tier){
  let a=chapterStart(tier);
  for(let s=1;s<=PLACES_PER_CHAPTER;s++){
    const b=gateDepth(tier,s);
    if(depth<b)return Math.max(0,(s-1+(depth-a)/(b-a))/PLACES_PER_CHAPTER);
    a=b;
  }
  return 1;
}
// Distance in "old metres" (600 per segment). Light is paid on this, so shallow chapters pay like deep ones.
export function travel(depth,tier){return (tier+chapterProgress(depth,tier))*PLACES_PER_CHAPTER*600;}
// Spawn table of a chapter; the Bottomless borrows the tables of the last chapters in turn
export function spawnTable(tier,cleared){
  const ch=tier<=LAST_TIER?CHAPTERS[tier]:CHAPTERS[2+((tier*3+cleared)%6)];
  return ch.spawn.filter(function(r){return tier>LAST_TIER||r[2]<=cleared;});
}
export const ROMAN=['I','II','III','IV','V','VI','VII','VIII'];
