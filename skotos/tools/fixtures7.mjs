// Act VII's three named saves, built from flags by this one file (docs/act7-contract.md, the four test rules, rule 1).
// A scenario of Act VII never starts from a fresh test hero and never assumes a zone "as it is this week": it names
// its fixture. Each is a URL query for the game's test hook (boot.js: ?auto=<zone>&quest=&flags=...), so the hero is made
// by the game's own code and then crosses the game's own migration (&v22: stamped as v22 wrote her, format 1 and no
// `act7` field).
//   fx7_new   a v22 hero at quest 39: every flag of Acts I-VI in the order the story saves them (crownUnmade among them:
//             the flag that used to silence every flue), the three Names' deeds done (remembered, landing6, asgerRest)
//   fx7_mid   the Meltwaters done: three weirs open, Kallisto at rest (quest 43, at the foot of the Water-stair)
//   fx7_done  the act finished (quest 47): the lake let down, the hero home and slept
export const ACT4 = ['act1', 'act2', 'act3', 'act4', 'after3', 'hart', 'autumn', 'weaver', 'lord', 'fireTaken', 'ivar', 'plug', 'karthax', 'crownUnmade', 'giftsTaken', 'unbound', 'newFire'];
export const ACT5 = ['alkyone', 'coastCall', 'cradle', 'coal', 'alkField', 'coastSeen', 'hearth', 'rite', 'tamMet', 'glaukosMet', 'light_grey', 'mem_i1', 'light_wreck', 'mem_i2', 'light_fall', 'mem_i3', 'towerWake', 'towerDown', 'frozen', 'farSeen', 'alkShip', 'hole0', 'hole1', 'hole2', 'ternSeen', 'skotosWake', 'skotosDown', 'selnaBack', 'seaLit', 'mem_i4', 'carved', 'homeSeen', 'toldChild', 'act5', 'remembered'];
export const ACT6 = ['tam6', 'call6', 'coal6', 'drainedSeen', 'teach6', 'gates6', 'ketosWake', 'ketosDown', 'keyxLamp', 'bottomSeen', 'glaukosB6', 'blackLamp0', 'blackLamp1', 'blackLamp2', 'keyxFreed', 'lost0', 'lost1', 'lost2', 'lost3', 'nineLit', 'sailorRest', 'asgerRest', 'shadeWake', 'shadeDown', 'herFire', 'nameBack', 'nameCard6', 'homeGate', 'act6', 'landing6'];
// Act VII's own chain, in save order (docs/act7-design/10-story.md, Quests 40-46): the flag, and the quest it leaves her at
export const ACT7 = [['call7', 40], ['haldaOut', 41], ['thawSeen', 41], ['weir1', 41], ['mem_s1', 41], ['weir2', 41], ['mem_s2', 41], ['weir3', 42], ['mem_s3', 42],
  ['kallistoRest', 43], ['tarnSeen', 44], ['winch1', 44], ['mem_s4', 44], ['winch2', 44], ['mem_s5', 44], ['winch3', 44], ['mem_s6', 44], ['keladosWake', 45],
  ['keladosRest', 46], ['lakeLet', 46], ['home7', 46], ['act7', 47]];
export const flagsTo7 = (f) => (f ? ACT7.slice(0, ACT7.findIndex(([k]) => k === f) + 1).map(([k]) => k) : []);
export const questAt7 = (f) => (f ? ACT7.find(([k]) => k === f)[1] : 39);
// the query for a hero whose last saved Act VII flag is `upTo` (none: the v22 hero), in `zone`
export function fx7(upTo, zone = 'town', o = {}) {
  const flags = [...ACT4, ...ACT5, ...ACT6, ...flagsTo7(upTo), ...(o.flags || [])].filter((k) => !(o.drop || []).includes(k));
  return `auto=${zone}&quest=${o.quest ?? questAt7(upTo)}&lvl=${o.lvl ?? 50}&flags=${flags.join(',')}${upTo ? '' : '&v22'}&cloud=off`;
}
export const FX7 = {
  fx7_new: (zone = 'town', o) => fx7(null, zone, o),
  fx7_mid: (zone = 'thaw', o) => fx7('kallistoRest', zone, o),
  fx7_done: (zone = 'town', o) => fx7('act7', zone, o)
};
if (process.argv[1]?.endsWith('fixtures7.mjs')) for (const k in FX7) console.log(k + ': ?' + FX7[k]());
