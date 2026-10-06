// Game data: classes, skills, monsters, items, affixes, legendaries, difficulties.

// ---------- difficulty ----------
export const DIFFS = [
  { id: 'wanderer', hp: 0.65, dmg: 0.55, xp: 0.9, gold: 0.9, loot: 0.9, elite: 0.7, leg: 1, color: '#9ec7a0' },
  { id: 'warden', hp: 1, dmg: 1, xp: 1, gold: 1, loot: 1, elite: 1, leg: 1, color: '#d9c58a' },
  { id: 'hero', hp: 1.9, dmg: 1.55, xp: 1.6, gold: 1.6, loot: 1.5, elite: 1.25, leg: 1.4, color: '#e09a50' },
  { id: 'nightmare', hp: 3.6, dmg: 2.4, xp: 2.6, gold: 2.4, loot: 2.2, elite: 1.5, leg: 2.2, color: '#d0503a', unlock: 'act1:hero' },
  { id: 'ash', hp: 7, dmg: 3.8, xp: 4.2, gold: 3.6, loot: 3.2, elite: 1.8, leg: 3.2, color: '#b04aff', unlock: 'act1:nightmare' }
];

// ---------- classes ----------
// resource: fury builds on hit and fades; energy and mana regenerate
export const CLASSES = {
  warden: { main: 'str', res: 'fury', resMax: 100, resRegen: -4, resOnHit: 6, life: 1.25, armor: 1.3, speed: 5.4, color: '#c9483a', weapon: 'sword', off: 'shield', range: 2.2, style: 'sword' },
  ranger: { main: 'dex', res: 'energy', resMax: 100, resRegen: 16, resOnHit: 0, life: 1.0, armor: 1.0, speed: 5.8, color: '#d8b040', weapon: 'crossbow', off: 'quiver', range: 13, style: 'bow' },
  mage: { main: 'int', res: 'mana', resMax: 100, resRegen: 9, resOnHit: 0, life: 0.9, armor: 0.85, speed: 5.4, color: '#4a8aff', weapon: 'staff', off: 'orb', range: 12, style: 'staff' }
};

// ---------- skills ----------
// dmg is % of weapon damage; per rank +15% unless rankDmg given
export const SKILLS = {
  warden: [
    { id: 'combo', basic: true, dmg: 1.15, icon: 'sword', range: 2.4 },
    { id: 'whirl', cost: 22, cd: 0, dmg: 0.55, icon: 'whirl', lvl: 1, dur: 2.2, tick: 0.25, radius: 2.7 },
    { id: 'leap', cost: 0, cd: 7, dmg: 2.6, icon: 'leap', lvl: 2, radius: 3.2, range: 9, ground: true },
    { id: 'cry', cost: 0, cd: 16, icon: 'horn', lvl: 4, buff: 7, gain: 40 },
    { id: 'quake', cost: 45, cd: 5, dmg: 4.2, icon: 'quake', lvl: 6, range: 11 }
  ],
  ranger: [
    { id: 'bolt', basic: true, dmg: 1.0, icon: 'bolt', range: 14, gain: 4 },
    { id: 'multi', cost: 24, cd: 0, dmg: 0.9, icon: 'fan', lvl: 1, count: 5 },
    { id: 'rain', cost: 34, cd: 3, dmg: 0.6, icon: 'rain', lvl: 2, radius: 3.6, dur: 2.2, range: 12, ground: true },
    { id: 'wolf', cost: 20, cd: 18, dmg: 0.8, icon: 'wolf', lvl: 4, dur: 22 },
    { id: 'pierce', cost: 40, cd: 4, dmg: 5.0, icon: 'arrow', lvl: 6, range: 22 }
  ],
  mage: [
    { id: 'arcane', basic: true, dmg: 1.0, icon: 'orb', range: 14, gain: 3 },
    { id: 'fireball', cost: 18, cd: 0, dmg: 2.2, icon: 'fire', lvl: 1, radius: 2.8 },
    { id: 'nova', cost: 26, cd: 7, dmg: 1.6, icon: 'frost', lvl: 2, radius: 5.5, freeze: 2.2 },
    { id: 'chain', cost: 22, cd: 0.8, dmg: 1.7, icon: 'storm', lvl: 4, jumps: 4, range: 13 },
    { id: 'meteor', cost: 42, cd: 6, dmg: 6.0, icon: 'meteor', lvl: 6, radius: 3.6, range: 12, ground: true }
  ]
};
export const DODGE = { warden: { cd: 2.2, dist: 5, kind: 'roll' }, ranger: { cd: 1.6, dist: 6, kind: 'roll' }, mage: { cd: 3, dist: 7, kind: 'blink' } };
export const SKILL_MAX_RANK = 5;

// ---------- monsters ----------
// hp/dmg are multipliers on the level curve; speed in units/s
export const MONSTERS = {
  goblin: { model: 'goblin', hp: 0.55, dmg: 0.7, speed: 4.6, radius: 0.45, ai: 'melee', reach: 1.4, atk: 'stab', atkTime: 0.9, flesh: 'flesh', xp: 1, weapon: 'dagger', style: 'sword', hunch: 0.25, sfx: 'goblin' },
  goblinArcher: { model: 'goblinArcher', hp: 0.45, dmg: 0.7, speed: 4.2, radius: 0.45, ai: 'ranged', reach: 11, atk: 'shoot', atkTime: 1.6, flesh: 'flesh', xp: 1.1, weapon: 'crossbow', style: 'bow', hunch: 0.2, proj: 'arrow', sfx: 'goblin' },
  goblinShaman: { model: 'goblinShaman', hp: 0.6, dmg: 0.8, speed: 3.8, radius: 0.45, ai: 'caster', reach: 10, atk: 'cast', atkTime: 2.2, flesh: 'flesh', xp: 1.6, weapon: 'staffSkull', style: 'staff', hunch: 0.25, proj: 'hex', sfx: 'goblin', heals: true },
  warg: { model: 'warg', hp: 0.8, dmg: 0.9, speed: 6.6, radius: 0.6, ai: 'pounce', reach: 1.6, atk: 'bite', atkTime: 1.1, flesh: 'flesh', xp: 1.3, sfx: 'wolf' },
  spider: { model: 'spider', hp: 0.7, dmg: 0.85, speed: 5.2, radius: 0.7, ai: 'melee', reach: 1.5, atk: 'bite', atkTime: 1.0, flesh: 'chitin', xp: 1.2, sfx: 'spider', poison: true },
  spiderling: { model: 'spiderling', hp: 0.22, dmg: 0.4, speed: 6, radius: 0.35, ai: 'melee', reach: 1.0, atk: 'bite', atkTime: 0.8, flesh: 'chitin', xp: 0.35, sfx: 'spider' },
  ash: { model: 'ash', hp: 1.6, dmg: 1.4, speed: 3.9, radius: 0.6, ai: 'melee', reach: 1.9, atk: 'chop', atkTime: 1.5, flesh: 'ash', xp: 2.2, weapon: 'cleaver', style: 'heavy', hunch: 0.15, sfx: 'orc', armored: true },
  troll: { model: 'troll', hp: 6, dmg: 2.6, speed: 3.4, radius: 1.1, ai: 'brute', reach: 2.8, atk: 'smash', atkTime: 2.2, flesh: 'flesh', xp: 9, weapon: 'club', style: 'heavy', hunch: 0.25, sfx: 'troll', big: true },
  skeleton: { model: 'skeleton', hp: 0.75, dmg: 0.9, speed: 3.8, radius: 0.45, ai: 'melee', reach: 1.6, atk: 'slash1', atkTime: 1.1, flesh: 'bone', xp: 1.1, weapon: 'sword', style: 'undead', sfx: 'skeleton', rises: true },
  skeletonArcher: { model: 'skeletonArcher', hp: 0.55, dmg: 0.8, speed: 3.6, radius: 0.45, ai: 'ranged', reach: 11, atk: 'shoot', atkTime: 1.7, flesh: 'bone', xp: 1.2, weapon: 'crossbow', style: 'bow', sfx: 'skeleton', proj: 'arrow', rises: true },
  wraith: { model: 'wraith', hp: 1.1, dmg: 1.1, speed: 4.6, radius: 0.55, ai: 'wraith', reach: 1.8, atk: 'claw', atkTime: 1.2, flesh: 'spirit', xp: 1.8, style: 'claw', sfx: 'wraith', float: true, drain: true },
  // bosses
  weaver: { model: 'weaver', hp: 38, dmg: 1.8, speed: 5.2, radius: 2.2, ai: 'weaver', reach: 3.6, atk: 'bite', atkTime: 1.6, flesh: 'chitin', xp: 60, boss: true, sfx: 'spider' },
  barrowLord: { model: 'barrowLord', hp: 55, dmg: 2.1, speed: 4.2, radius: 1.2, ai: 'lord', reach: 3.6, atk: 'smash', atkTime: 1.5, flesh: 'spirit', xp: 90, boss: true, weapon: 'greatsword', style: 'heavy', sfx: 'wraith', float: true },
  // Act II: the Giants' Stair and the Halls of Deepstone
  magmaHound: { model: 'magmaHound', hp: 0.95, dmg: 1.0, speed: 6.4, radius: 0.6, ai: 'pounce', reach: 1.6, atk: 'bite', atkTime: 1.1, flesh: 'magma', xp: 1.6, sfx: 'hound', burns: true, deathFire: true, look: { rim: 0xff5a18, rimI: 0.3 } },
  caveBat: { model: 'caveBat', hp: 0.28, dmg: 0.5, speed: 7.2, radius: 0.35, ai: 'bat', reach: 1.1, atk: 'bite', atkTime: 0.9, flesh: 'flesh', xp: 0.45, sfx: 'bat' },
  deepworm: { model: 'deepworm', hp: 1.5, dmg: 1.35, speed: 4.4, radius: 0.85, ai: 'burrow', reach: 2.4, atk: 'bite', atkTime: 1.4, flesh: 'chitin', xp: 2.6, sfx: 'worm', proj: 'acid' },
  stoneborn: { model: 'stoneborn', hp: 1.25, dmg: 1.1, speed: 4.0, radius: 0.5, ai: 'melee', reach: 1.7, atk: 'chop', atkTime: 1.25, flesh: 'flesh', xp: 1.6, weapon: 'axe', style: 'sword', sfx: 'dwarf', armor: true },
  stonebornArbalest: { model: 'stonebornArb', hp: 0.9, dmg: 0.95, speed: 3.8, radius: 0.5, ai: 'ranged', reach: 12, atk: 'shoot', atkTime: 1.8, flesh: 'flesh', xp: 1.5, weapon: 'crossbow', style: 'bow', sfx: 'dwarf', proj: 'bolt' },
  runepriest: { model: 'runepriest', hp: 1.0, dmg: 1.0, speed: 3.6, radius: 0.5, ai: 'runepriest', reach: 10, atk: 'cast', atkTime: 2.2, flesh: 'flesh', xp: 2.2, weapon: 'staff', style: 'staff', sfx: 'dwarf', proj: 'ember' },
  caveTroll: { model: 'troll', hp: 7.5, dmg: 2.9, speed: 3.6, radius: 1.25, ai: 'brute', reach: 3.0, atk: 'smash', atkTime: 2.1, flesh: 'flesh', xp: 11, weapon: 'club', style: 'heavy', hunch: 0.25, sfx: 'troll', big: true, look: { scale: 1.18, tint: 0x8a9aa8, tintAmt: 0.35 } },
  deadDwarf: { model: 'skeleton', hp: 0.9, dmg: 1.0, speed: 3.7, radius: 0.48, ai: 'melee', reach: 1.6, atk: 'slash1', atkTime: 1.15, flesh: 'bone', xp: 1.2, weapon: 'axe', style: 'undead', sfx: 'skeleton', rises: true, look: { scale: 0.86, tint: 0xd8b880, tintAmt: 0.2 } },
  stonewarden: { model: 'stonewarden', hp: 46, dmg: 2.0, speed: 3.6, radius: 1.6, ai: 'stonewarden', reach: 3.8, atk: 'smash', atkTime: 1.6, flesh: 'stone', xp: 80, boss: true, sfx: 'golem' },
  moltenKing: { model: 'moltenKing', hp: 72, dmg: 2.4, speed: 4.1, radius: 0.9, look: { scale: 1.55, rim: 0xff6a20, rimI: 0.4 }, ai: 'molten', reach: 3.9, atk: 'smash', atkTime: 1.5, flesh: 'magma', xp: 130, boss: true, weapon: 'hammer', style: 'heavy', sfx: 'golem' },
  // Act III: the Weeping Woods and the Heartwood. 'wood' flesh shrugs off sap; flesh is slowed by it; floaters never touch it
  hollowed: { model: 'hollowed', hp: 1.4, dmg: 1.15, speed: 3.6, radius: 0.5, ai: 'hollow', reach: 1.7, atk: 'claw', atkTime: 1.25, flesh: 'wood', xp: 1.8, style: 'undead', hunch: 0.15, deathSap: 1.5, wake: { d: 6, clip: 'riseStand', sfx: 'hollowCrack', t: 2.2 } },
  rootling: { model: 'rootling', hp: 0.3, dmg: 0.5, speed: 6.2, radius: 0.35, ai: 'rootling', reach: 1.2, atk: 'bite', atkTime: 0.9, flesh: 'wood', xp: 0.6, burst: true },
  amberMoth: { model: 'amberMoth', hp: 0.3, dmg: 0.5, speed: 6.8, radius: 0.4, ai: 'bat', reach: 1.1, atk: 'bite', atkTime: 0.9, flesh: 'chitin', xp: 0.5, sfx: 'moth', float: true, biteSlow: { k: 0.15, t: 1 }, deathDust: true, look: { rim: 0xffb040, rimI: 0.35 } },
  amberBear: { model: 'amberBear', hp: 3.2, dmg: 1.8, speed: 5.6, radius: 1.0, ai: 'charger', reach: 2.2, atk: 'smash', atkTime: 1.6, flesh: 'flesh', xp: 5, sfx: 'bear', big: true },
  rootsworn: { model: 'rootsworn', hp: 1.2, dmg: 1.15, speed: 4.4, radius: 0.5, ai: 'melee', reach: 2.3, atk: 'heavyStab', atkTime: 1.3, flesh: 'flesh', xp: 1.6, weapon: 'spear', wlook: { len: 2.0 }, style: 'heavy', spinEvery: 3 },
  rootswornArcher: { model: 'rootswornArcher', hp: 0.85, dmg: 1.0, speed: 4.4, radius: 0.48, ai: 'skirmisher', reach: 13, atk: 'shoot', atkTime: 1.6, flesh: 'flesh', xp: 1.5, weapon: 'bow', wlook: { blade: 0x3a2a1a }, style: 'bow', proj: 'arrow' },
  rootwarden: { model: 'rootwarden', hp: 4.5, dmg: 1.6, speed: 0, radius: 1.1, ai: 'rooted', reach: 4, atk: 'smash', atkTime: 3, flesh: 'wood', xp: 6, big: true, anchored: true },
  mourner: { model: 'mourner', hp: 0.9, dmg: 0.8, speed: 4.2, radius: 0.45, ai: 'tether', reach: 11, atk: 'cast', atkTime: 3.2, flesh: 'spirit', xp: 2, sfx: 'wraith', float: true, look: { rim: 0xe8d8a8, rimI: 0.5 } },
  heartroot: { model: 'heartroot', hp: 6, dmg: 1, speed: 0, radius: 0.9, ai: 'node', reach: 0, atk: 'cast', atkTime: 9, flesh: 'wood', xp: 3, big: true, anchored: true },
  silverhorn: { model: 'silverhorn', hp: 52, dmg: 2.1, speed: 6.0, radius: 1.4, ai: 'silverhorn', reach: 4.6, atk: 'smash', atkTime: 1.6, flesh: 'flesh', xp: 110, boss: true, sfx: 'hart', look: { scale: 1.15, tint: 0xf0ece0, tintAmt: 0.15, rim: 0xffc060, rimI: 0.3 } },
  amaranthe: { model: 'amaranthe', hp: 80, dmg: 2.5, speed: 4.4, radius: 0.9, ai: 'amaranthe', reach: 4.6, atk: 'heavyStab', atkTime: 1.5, flesh: 'wood', xp: 160, boss: true, weapon: 'spear', wlook: { len: 1.3 }, style: 'heavy', dieClip: 'kneel', look: { scale: 1.45, rim: 0xffb040, rimI: 0.5 } },
  // Act IV: the Field of Ash and the Ashen Forge. shroud: 30% damage outside light (light.js); guard: a shield arc in
  // front (combat.js); wake: lies in the ash until the hero is close; fireproof: the Forge's Breath passes over it
  lampless: { model: 'lampless', hp: 1.3, dmg: 1.15, speed: 3.8, radius: 0.5, ai: 'watch', reach: 2.2, atk: 'heavyStab', atkTime: 1.3, flesh: 'spirit', xp: 2, weapon: 'lanternStaff', wlook: { glow: 0.05, lamp: 0x6a7684 }, style: 'staff', animSet: 'formal', shroud: true, dieSfx: 'wraithDie', look: { rim: 0xb0c0d8, rimI: 0.35 } },
  ashSpear: { model: 'ashSpear', hp: 1.6, dmg: 1.2, speed: 3.2, radius: 0.5, ai: 'melee', reach: 2.0, atk: 'heavyStab', atkTime: 1.3, flesh: 'ash', xp: 2, weapon: 'spear', wlook: { len: 2.0, blade: 0x6a645c, glow: 0, wood: 0x2a2420 }, style: 'heavy', guard: { arc: 1.05, k: 0.15 }, bashEvery: 3, shield: { face: 0x3a3632, rim: 0x6a645c, emblem: 0x8a3a20, r: 0.32 }, dieSfx: 'skeletonDie', wake: { d: 6, clip: 'rise', pose: 'bonePile', sfx: 'skeletonRattle', t: 2.0, speed: 1 } },
  ashDwarf: { model: 'ashDwarf', hp: 1.7, dmg: 1.25, speed: 3.0, radius: 0.5, ai: 'melee', reach: 1.8, atk: 'chop', atkTime: 1.35, flesh: 'ash', xp: 2, weapon: 'axe', wlook: { blade: 0x6a5a48 }, style: 'sword', guard: { arc: 1.05, k: 0.15 }, bashEvery: 3, shield: { face: 0x4a3a28, rim: 0x9a7a40, emblem: 0xb07a30, r: 0.3 }, dieSfx: 'dwarfDie', wake: { d: 6, clip: 'rise', pose: 'bonePile', sfx: 'skeletonRattle', t: 2.0, speed: 1 } },
  ashBow: { model: 'ashBow', hp: 0.9, dmg: 1.0, speed: 3.4, radius: 0.48, ai: 'ranged', reach: 12, atk: 'shoot', atkTime: 1.9, flesh: 'ash', xp: 1.5, weapon: 'bow', wlook: { blade: 0x3a3028 }, style: 'bow', proj: 'fireArrow', dieSfx: 'skeletonDie', wake: { d: 7, clip: 'rise', pose: 'bonePile', sfx: 'skeletonRattle', t: 2.0, speed: 1 } },
  smokeEater: { model: 'smokeEater', hp: 0.7, dmg: 0.8, speed: 5.8, radius: 0.55, ai: 'snuffer', reach: 1.5, atk: 'claw', atkTime: 1.1, flesh: 'ash', xp: 1.4, dieSfx: 'wraithDie', look: { rim: 0x8a7a6a, rimI: 0.25 } },
  ashwing: { model: 'ashwing', hp: 2.0, dmg: 1.4, speed: 7.5, radius: 1.0, ai: 'diver', reach: 2.2, atk: 'bite', atkTime: 1.2, flesh: 'bone', xp: 3, big: true, float: true, sfx: 'bat', dieSfx: 'skeletonDie', fireproof: true, look: { rim: 0xff7a30, rimI: 0.45 } },
  emberTick: { model: 'emberTick', hp: 0.35, dmg: 0.6, speed: 6.2, radius: 0.35, ai: 'latcher', reach: 1.0, atk: 'bite', atkTime: 0.9, flesh: 'chitin', xp: 0.6, sfx: 'spider', fireproof: true, look: { rim: 0xff6a20, rimI: 0.5 } },
  ashsmith: { model: 'ashsmith', hp: 1.1, dmg: 1.0, speed: 3.8, radius: 0.5, ai: 'forger', reach: 9, atk: 'throw', atkTime: 1.8, flesh: 'flesh', xp: 2.4, weapon: 'hammer', style: 'none', proj: 'ember', fireproof: true, dieSfx: 'dwarfDie' },
  hammerhorn: { model: 'hammerhorn', hp: 4.5, dmg: 2.0, speed: 3.6, radius: 1.0, ai: 'brute', reach: 2.8, atk: 'smash', atkTime: 2.0, flesh: 'flesh', xp: 6, big: true, weapon: 'hammer', wlook: { len: 1.4 }, style: 'heavy', sfx: 'troll', chain: 9, fireproof: true, look: { scale: 1.13, rim: 0xff5a18, rimI: 0.3 } },
  // a keeper's statue in Karthax's second phase: the real model (o.model), frozen and ash-grey; only his Hammerfall breaks it
  keeperStatue: { model: 'barrowLord', hp: 1, dmg: 0, speed: 0, radius: 1.0, ai: 'node', reach: 0, atk: 'cast', atkTime: 9, flesh: 'stone', xp: 0, big: true, anchored: true, fireproof: true },
  ivar: { model: 'ivar', hp: 58, dmg: 2.3, speed: 4.4, radius: 0.6, ai: 'ivar', reach: 4.4, atk: 'heavyStab', atkTime: 1.5, flesh: 'spirit', xp: 130, boss: true, weapon: 'lanternStaff', wlook: { glow: 0.05, lamp: 0x6a7684 }, style: 'staff', dieClip: 'kneel', dieSfx: 'wraithDie', look: { scale: 1.25, rim: 0xb0b8c8, rimI: 0.5 } },
  karthax: { model: 'karthax', hp: 95, dmg: 2.7, speed: 4.0, radius: 1.3, ai: 'karthax', reach: 4.8, atk: 'smash', atkTime: 1.5, flesh: 'magma', xp: 220, boss: true, weapon: 'hammer', wlook: { len: 1.6, ember: 0xff5a10 }, style: 'heavy', dieClip: 'kneel', sfx: 'golem', fireproof: true, look: { scale: 1.5, rim: 0xff5a18, rimI: 0.6 } },
  // the ranger's companion
  spiritWolf: { model: 'spiritWolf', hp: 2, dmg: 1, speed: 7.5, radius: 0.55, ai: 'pet', reach: 1.7, atk: 'bite', atkTime: 0.8, flesh: 'spirit', xp: 0, pet: true }
};
export const PACKS = {
  goblins: [['goblin', 5], ['goblinArcher', 2], ['goblinShaman', 0.8]],
  wolves: [['warg', 1]],
  spiders: [['spider', 3], ['spiderling', 4]],
  mixed: [['goblin', 3], ['warg', 2], ['goblinArcher', 1], ['ash', 0.7]],
  troll: [['troll', 1]],
  undead: [['skeleton', 5], ['skeletonArcher', 2], ['wraith', 0.8]],
  wraiths: [['wraith', 2], ['skeleton', 2]],
  ash: [['ash', 3], ['goblin', 2], ['goblinArcher', 1]],
  gate: [['skeleton', 3], ['goblin', 3], ['warg', 2], ['wraith', 1.5], ['ash', 1.5], ['spider', 1.5], ['skeletonArcher', 1], ['goblinShaman', 0.6]],
  // Act II
  passGoblins: [['goblin', 5], ['goblinArcher', 2.5], ['goblinShaman', 1], ['warg', 1.2]],
  bats: [['caveBat', 1]],
  hounds: [['magmaHound', 3], ['ash', 1]],
  ashbound: [['stoneborn', 5], ['stonebornArbalest', 2.2], ['runepriest', 1]],
  trollCave: [['caveTroll', 1]],
  worms: [['deepworm', 2], ['caveBat', 2]],
  deep: [['stoneborn', 3], ['magmaHound', 2], ['ash', 2], ['caveBat', 2], ['stonebornArbalest', 1]],
  mine: [['spider', 3], ['caveBat', 3], ['deepworm', 0.6], ['spiderling', 2]],
  deadDwarves: [['deadDwarf', 5], ['skeletonArcher', 1.5], ['wraith', 1]],
  // Act III
  weepHollow: [['hollowed', 4], ['rootling', 3]],
  weepDen: [['amberBear', 1], ['rootling', 2]],
  weepMoths: [['amberMoth', 6]],
  weepSentinels: [['rootsworn', 3], ['rootswornArcher', 2]],
  weepMourners: [['mourner', 1], ['rootsworn', 2], ['hollowed', 2]],
  weepWeepers: [['rootwarden', 1], ['hollowed', 2]],
  weepMixed: [['hollowed', 3], ['rootswornArcher', 1.5], ['amberMoth', 2], ['rootling', 2]],
  heartSleepers: [['hollowed', 4], ['rootling', 2]],
  heartWarden: [['rootwarden', 1], ['hollowed', 2], ['rootling', 3]],
  heartChoir: [['mourner', 2], ['rootsworn', 3], ['rootswornArcher', 1]],
  heartDeep: [['hollowed', 3], ['rootsworn', 2], ['rootswornArcher', 1.5], ['amberBear', 0.4], ['mourner', 0.5]],
  // Act IV
  ashLine: [['ashSpear', 4], ['ashDwarf', 3], ['ashBow', 2]],
  ashBowmen: [['ashBow', 3], ['ashSpear', 1.5], ['emberTick', 1]],
  lamplessPatrol: [['lampless', 1]],
  snuffers: [['smokeEater', 3], ['ashSpear', 1]],
  ticks: [['emberTick', 1]],
  ashwing: [['ashwing', 1]],
  smiths: [['ashsmith', 2], ['ashSpear', 2], ['ashDwarf', 1.5], ['emberTick', 1.5]],
  stokers: [['hammerhorn', 1]],
  mouldHall: [['ashsmith', 2], ['ashSpear', 2], ['ashBow', 1], ['emberTick', 2], ['smokeEater', 0.6], ['hammerhorn', 0.3]],
  bellowsWave: [['ashSpear', 2], ['ashDwarf', 1.5], ['ashsmith', 1], ['emberTick', 2]]
};
// packs built around one creature: it comes first, exactly once (or the count given), and the rest are drawn without it
export const PACK_LEAD = { weepDen: ['amberBear'], weepWeepers: ['rootwarden'], weepMourners: ['mourner'], heartWarden: ['rootwarden'], heartChoir: ['mourner', 'mourner'],
  ashLine: ['ashSpear'], snuffers: ['smokeEater', 'smokeEater'], smiths: ['ashsmith'], mouldHall: ['ashsmith'], bellowsWave: ['ashsmith'] };
// packs whose dead wait in disguise (Hollowed as dead trees and amber cocoons, the Ash-Fallen under the ash) until the hero is close
export const PACK_DORMANT = { weepHollow: true, heartSleepers: true, ashLine: true };
// packs that stand in a line, the shields toward the hero (the Ash-Fallen still holding the battle line where they fell)
export const PACK_LINE = { ashLine: true };
// the kinds to spawn for a pack of n: the leads, then weighted picks of the rest (pick = rand.weighted)
export function packKinds(tag, n, pick) {
  const lead = PACK_LEAD[tag] || [], w = (PACKS[tag] || PACKS.goblins).filter(([k]) => !lead.includes(k));
  const out = lead.slice(0, n);
  while (out.length < n) out.push(pick(w.length ? w : PACKS[tag]));
  return out;
}
// beacon blessings: when a shard is laid on the beacon and another fire answers, the flame gives one of three, for good
export const BOONS = {
  1: [
    { id: 'ember', icon: 'flame', stats: { dmgPct: 12, critDmg: 10 } },
    { id: 'hearth', icon: 'shield', stats: { lifePct: 15, armorPct: 10 } },
    { id: 'north', icon: 'roll', stats: { move: 8, atkSpd: 6 } }
  ],
  2: [
    { id: 'forge', icon: 'fire', stats: { eliteDmg: 20, area: 10 } },
    { id: 'anvil', icon: 'shield', stats: { armorPct: 20, thorns: 40 } },
    { id: 'rune', icon: 'star', stats: { cdr: 8, resRegen: 20 } }
  ],
  3: [
    { id: 'amber', icon: 'potion', stats: { lifeOnHit: 15, regen: 10 } },
    { id: 'hart', icon: 'leap', stats: { crit: 5, move: 6 } },
    { id: 'root', icon: 'shield', stats: { block: 10, lifePct: 8 } }
  ],
  // the fire lit by hand: worth half again to a hero the crown never held (h.flags.unbound, see stats.js)
  4: [
    { id: 'wayfarer', icon: 'roll', stats: { move: 8, cdr: 10 } },
    { id: 'lantern', icon: 'star', stats: { crit: 6, critDmg: 25 } },
    { id: 'rest', icon: 'shield', stats: { lifePct: 15, regen: 15 } }
  ]
};
export const UNBOUND = 1.5;
// the Crown's Offers (Act IV altars): what each gift gives and takes while it is held (stats.js)
export const GIFTS = {
  throne: { armorPct: 25, lifePct: 10, move: -12 },
  forge: { dmgPct: 20, critDmg: 15, armorPct: -20 },
  unfading: { lifeOnHit: 15, regen: 15, atkSpd: -15 }
};
// timed hero buffs granted by the world (shrines live in world.js): seconds and what they do
export const BUFFS = { memory: { dur: 60, dmg: 0.12, move: 0.08 } };
export const BOON = Object.fromEntries(Object.values(BOONS).flat().map((b) => [b.id, b]));
// elite affixes
export const AFFIXES = ['fast', 'vampiric', 'molten', 'frozen', 'shielding', 'teleporter', 'thunder', 'horde', 'armored'];

// level curves
export const monsterHP = (L) => 22 + 7 * L + 0.8 * L * L;
export const monsterDmg = (L) => 2.6 + 1.5 * L + 0.055 * L * L;
export const xpToNext = (L) => Math.round(50 + 45 * Math.pow(L, 1.45));
export const monsterXP = (L) => 6 + 2.5 * L;
export const MAX_LEVEL = 50;

// ---------- items ----------
export const SLOTS = ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'amulet', 'ring1', 'ring2'];
export const RARITY = ['common', 'magic', 'rare', 'legendary'];
export const RARITY_COLOR = ['#d8d4cc', '#6aa0ff', '#f2d24a', '#ff8a2a'];
export const BASES = {
  sword: { slot: 'weapon', cls: 'warden', dmg: [0.85, 1.25], spd: 1.25, look: 'sword' },
  axe: { slot: 'weapon', cls: 'warden', dmg: [1.0, 1.4], spd: 1.1, look: 'axe' },
  mace: { slot: 'weapon', cls: 'warden', dmg: [1.15, 1.45], spd: 1.0, look: 'mace' },
  crossbow: { slot: 'weapon', cls: 'ranger', dmg: [0.9, 1.35], spd: 1.3, look: 'crossbow' },
  staff: { slot: 'weapon', cls: 'mage', dmg: [0.95, 1.35], spd: 1.15, look: 'staff' },
  shield: { slot: 'offhand', cls: 'warden', armor: 1.4, block: 0.12 },
  quiver: { slot: 'offhand', cls: 'ranger', armor: 0.3 },
  orb: { slot: 'offhand', cls: 'mage', armor: 0.3 },
  helm: { slot: 'helm', armor: 0.9 },
  chest: { slot: 'chest', armor: 1.6 },
  gloves: { slot: 'gloves', armor: 0.6 },
  boots: { slot: 'boots', armor: 0.7 },
  amulet: { slot: 'amulet' },
  ring: { slot: 'ring' }
};
// stat ranges per item level: [min,max] at ilvl 1 and growth per level
export const STATS = {
  main: { r: [4, 8], g: 1.6, slots: '*', w: 10 },
  vit: { r: [4, 8], g: 1.4, slots: '*', w: 9 },
  life: { r: [10, 22], g: 4, slots: '*', w: 7 },
  dmgPct: { r: [4, 8], g: 0.12, slots: 'weapon,amulet,ring,gloves,offhand', w: 6, pct: true },
  crit: { r: [1.5, 3], g: 0.05, slots: 'helm,gloves,amulet,ring,offhand', w: 6, pct: true, cap: 10 },
  critDmg: { r: [8, 16], g: 0.4, slots: 'gloves,amulet,ring,weapon', w: 6, pct: true },
  atkSpd: { r: [3, 6], g: 0.06, slots: 'gloves,amulet,ring,weapon', w: 5, pct: true, cap: 9 },
  armor: { r: [8, 16], g: 3, slots: 'helm,chest,gloves,boots,offhand', w: 7 },
  lifeOnHit: { r: [3, 6], g: 1.2, slots: 'weapon,gloves,amulet,ring', w: 4 },
  regen: { r: [1, 3], g: 0.6, slots: 'chest,helm,amulet,ring', w: 4 },
  move: { r: [4, 8], g: 0, slots: 'boots', w: 5, pct: true, cap: 12 },
  cdr: { r: [3, 6], g: 0.05, slots: 'helm,amulet,ring,gloves,offhand', w: 4, pct: true, cap: 10 },
  resRegen: { r: [6, 12], g: 0.1, slots: 'helm,amulet,ring,offhand,weapon', w: 4, pct: true },
  area: { r: [6, 12], g: 0.15, slots: 'chest,helm,amulet,ring,gloves', w: 4, pct: true },
  eliteDmg: { r: [5, 10], g: 0.12, slots: 'amulet,ring,offhand,weapon', w: 3, pct: true },
  gold: { r: [10, 25], g: 0.3, slots: 'amulet,ring,helm,boots', w: 3, pct: true },
  mf: { r: [8, 18], g: 0.25, slots: 'amulet,ring,helm,boots', w: 3, pct: true },
  thorns: { r: [10, 20], g: 3, slots: 'chest,offhand', w: 2 },
  skill: { r: [8, 14], g: 0.2, slots: 'helm,chest,offhand,weapon,amulet', w: 5, pct: true }
};
// legendary powers: id, slot, class (null = any), the numbers they use
export const LEGENDARIES = [
  { id: 'dawnblade', base: 'sword', cls: 'warden', v: 0.6, look: { blade: 0xffd8a0, glow: 0.7, rune: 0xff9a30 } },
  { id: 'cleaverOfAsh', base: 'axe', cls: 'warden', v: 0.35, look: { blade: 0x5a5250, glow: 0.6, rune: 0xff5a10 } },
  { id: 'lastBastion', base: 'shield', cls: 'warden', v: 0.25, look: { face: 0x8a1a1a, rim: 0xd8b860, glow: 0.8 } },
  { id: 'wolfmother', base: 'crossbow', cls: 'ranger', v: 0.5, look: { wood: 0x2a3a3a, blade: 0x9ad0ff, glow: 0.7 } },
  { id: 'windQuiver', base: 'quiver', cls: 'ranger', v: 1 },
  { id: 'evergreenBoots', base: 'boots', cls: 'ranger', v: 0.2 },
  { id: 'wayfarerStaff', base: 'staff', cls: 'mage', v: 2, look: { gem: 0xffa040, wood: 0x6a5a40 } },
  { id: 'winterOrb', base: 'orb', cls: 'mage', v: 1.5 },
  { id: 'stormRing', base: 'ring', cls: 'mage', v: 3 },
  { id: 'beaconAmulet', base: 'amulet', cls: null, v: 0.05 },
  { id: 'emberRing', base: 'ring', cls: null, v: 0.6 },
  { id: 'kingslayer', base: 'gloves', cls: null, v: 0.3 },
  { id: 'barrowCrown', base: 'helm', cls: null, v: 0.12 },
  { id: 'vampiricMail', base: 'chest', cls: null, v: 0.02 },
  { id: 'stoneborn', base: 'chest', cls: null, v: 0.2 },
  { id: 'swiftboots', base: 'boots', cls: null, v: 0.15 }
];
export const POTION = { cd: 18, heal: 0.6 };
export const INV_SIZE = 32;
export const STASH_SIZE = 48;
