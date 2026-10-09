// Quests, conversations and the moments between fights.
import * as THREE from 'three';
import { G, later } from './state.js';
import { on, emit } from '../ui/bus.js';
import { t, has } from '../i18n/i18n.js';
import { R, addLight, shake } from '../gfx/gfx.js';
import { glowBurst, ring, P, setEmitters, explosion, fireStream, puff, sparks } from '../gfx/fx.js';
import { dropShard } from './pickups.js';
import { writeSave } from './save.js';
import Audio from '../audio/audio.js';
import { grantBuff, refreshStats } from './stats.js';
import { spawnMonster, spawnNpc, ghostly } from './actors.js';
import { act3Prop, act4Prop } from '../world/build.js';
import { loadFolk } from '../gfx/people.js';
import { addLightPool, removeLightPool, cradlePoint } from './light.js';
import { angleTo } from '../core/util.js';
import { openDeepGate, FAR_BEACONS, farFire, openRootGate, witherWall, firstAutumn, growProp, zoneEmitters, setFar, setBeacon, townFires, townPresence, walkTo, stopWalk, vanish, release,
  act4Presence, isarnLantern, setLastLamp, openAnvilGate, meltPlug, forgeCold, bellowsDone, echoAt } from './world.js';

// Act III's counters: the three verses of the Long Sorrow, the three thorn walls of the Heartwood
const STORY_TEARS = ['planting', 'sorrow', 'breaking'];
const tearsSeen = () => STORY_TEARS.filter((id) => G.hero.flags['tear_' + id]).length;
const wallsDown = () => [0, 1, 2].filter((i) => G.hero.flags['thorn' + i]).length;
export function questText() {
  const q = Math.min(G.hero.quest, 23);
  if (q === 12) return t('q.12', tearsSeen());
  if (q === 14) { const n = wallsDown(); return n >= 3 ? t('q.14b') : t('q.14', n); }
  if (q === 18) return t('q.18', lampsLit());
  if (q === 20) return t('q.20', bellowsDone());
  return t('q.' + q);
}
function setQuest(n, quiet) {
  if (G.hero.quest >= n) return;
  G.hero.quest = n;
  if (!quiet) { emit('toast', t('q.new') + ': ' + questText(), 'quest'); Audio.sting('quest'); }
  emit('quest');
  writeSave();
}
export function npcHasNews(kind, a) {
  const q = G.hero.quest, F = G.hero.flags, zid = G.zone?.id, a4 = zid === 'ashfield' || zid === 'forge';
  if (a4) return (kind === 'wayfarer' && zid === 'ashfield' && (a?.key === 'isarnHook' ? !F.isarnHook : !F.isarnField))
    || (kind === 'brokka' && (zid === 'ashfield' ? !F.brokkaField : !F.brokkaForge))
    || (kind === 'elati' && (zid === 'ashfield' ? !F.elatiGraves : !F.elatiForge));
  return (kind === 'wayfarer' && (q === 0 || q === 4 || q === 5 || q === 9 || q === 10 || q === 15 || q === 16 || (q === 17 && !F.fireTaken)))
    || (kind === 'brokka' && q <= 7)
    || (kind === 'elati' && (q === 11 || (zid === 'heart' && !F.elatiHeart) || (F.autumn && !F.elatiAutumn)))
    || (kind === 'linden' && q === 12 && !F.metLinden);
}
// the Evergreen know one of their own: a ranger hears the kin variant of a line where there is one
const rl = (k) => (G.hero?.cls === 'ranger' && has(k + '.r') ? k + '.r' : k);
const rls = (list) => list.map((l) => (Array.isArray(l) ? [rl(l[0]), l[1]] : rl(l)));
const say = (k) => emit('say', rl(k));
const heal = () => { G.player.potionCd = 0; G.player.hp = G.player.hpMax; };

on('talk', (kind, actor) => {
  const q = G.hero.quest, F = G.hero.flags;
  const zid = G.zone?.id;
  if (kind === 'wayfarer' && (zid === 'ashfield' || zid === 'forge')) {
    // Act IV: at the Dark Beacon's camp; at the empty hook in the Graves; kneeling at the Anvil
    if (zid === 'forge') emit('dialog', { who: 'wayfarer', lines: ['d.isarn.k1'] });
    else if (actor?.key === 'isarnHook') emit('dialog', { who: 'wayfarer', lines: F.isarnHook ? ['d.isarn.hagain'] : ['d.isarn.h1', 'd.isarn.h2', 'd.isarn.h3'], end: () => { F.isarnHook = true; } });
    else emit('dialog', { who: 'wayfarer', lines: F.isarnField ? ['d.isarn.fagain'] : ['d.isarn.f1', 'd.isarn.f2', 'd.isarn.f3'], end: () => { F.isarnField = true; if (q < 18) setQuest(18); } });
  } else if (kind === 'wayfarer') {
    if (q === 0) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.1', 'd.isarn.2', 'd.isarn.3', 'd.isarn.4', 'd.isarn.5'], end: () => setQuest(1) });
    else if (q === 4) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.r1', 'd.isarn.r2'], end: () => beaconScene() });
    else if (q === 5) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.a1', 'd.isarn.a2', 'd.isarn.a3', 'd.isarn.a4'], end: () => { G.hero.flags.act1 = true; setQuest(6); } });
    else if (q >= 6 && q <= 8) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.a2wait'] });
    else if (q === 9) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.b1', 'd.isarn.b2'], end: () => beaconScene(2) });
    // Act III: west, to the Weeping Woods; then the third shard on the beacon, and what Isarn has not told
    else if (q === 10) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.c1', 'd.isarn.c2', 'd.isarn.c3'], end: () => setQuest(11) });
    else if (q >= 11 && q <= 14) emit('dialog', { who: 'wayfarer', lines: [q === 14 ? 'd.isarn.c5' : 'd.isarn.c4'], end: () => emit('openPanel', 'gates') });
    else if (q === 15) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.d1', 'd.isarn.d2'], end: () => beaconScene(3) });
    else if (q === 16 && !F.after3) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.after3'], end: () => { F.after3 = true; setQuest(17); emit('openPanel', 'gates'); } });
    // Act IV: the rest of the truth, then the fire leaves with the Ember Cradle
    else if ((q === 16 || q === 17) && !F.fireTaken) act4Begins();
    else if (q >= 10) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.after'], end: () => emit('openPanel', 'gates') });
    else emit('dialog', { who: 'wayfarer', lines: ['d.isarn.wait'] });
  } else if (kind === 'smith') {
    emit('dialog', { who: 'smith', lines: [G.hero.flags.metSmith ? 'd.halda.2' : 'd.halda.1'], end: () => { G.hero.flags.metSmith = true; emit('openPanel', 'smith'); } });
  } else if (kind === 'healer') {
    heal();
    emit('dialog', { who: 'healer', lines: [G.hero.flags.metHealer ? 'd.elianthe.2' : 'd.elianthe.1'], end: () => { G.hero.flags.metHealer = true; emit('openPanel', 'vendor'); } });
  } else if (kind === 'brokka' && (zid === 'ashfield' || zid === 'forge')) {
    // Act IV: at the Dark Beacon's camp, then in the Forge's cold side forge in the Hall of the Headless
    heal();
    const shop = () => emit('openPanel', 'vendor', { npc: 'brokka' });
    if (zid === 'ashfield') emit('dialog', { who: 'brokka', lines: [F.brokkaField ? 'd.brokka.again' : 'd.brokka.f1'], end: () => { F.brokkaField = true; shop(); } });
    else emit('dialog', { who: 'brokka', lines: F.brokkaForge ? [bellowsDone() ? 'd.brokka.hagain' : 'd.brokka.again'] : ['d.brokka.h1', 'd.brokka.h2'], end: () => { F.brokkaForge = true; shop(); } });
  } else if (kind === 'brokka') {
    // the last smith of the third gallery: news, a hot meal and her stores
    heal();
    const first = q <= 7;
    const lines = first ? ['d.brokka.1', 'd.brokka.2', 'd.brokka.3', 'd.brokka.4'] : q >= 9 ? ['d.brokka.after'] : ['d.brokka.again'];
    emit('dialog', { who: 'brokka', lines, end: () => { if (first) setQuest(8); else emit('openPanel', 'vendor', { npc: 'brokka' }); } });
  } else if (kind === 'elati') {
    // the last Evergreen scout: the way into the wood, then a healer and a trader at the Lanternglade and in the Heartwood
    heal();
    const shop = () => emit('openPanel', 'vendor', { npc: 'elati' });
    // Act IV: at the Lantern Graves, then at the Forge's camp once the stair is open
    if (zid === 'ashfield') emit('dialog', { who: 'elati', lines: rls(F.elatiGraves ? ['d.elati.gagain'] : ['d.elati.g1', 'd.elati.g2', 'd.elati.g3']), end: () => { F.elatiGraves = true; shop(); } });
    else if (zid === 'forge') emit('dialog', { who: 'elati', lines: rls(F.elatiForge ? ['d.elati.fagain'] : ['d.elati.f1']), end: () => { F.elatiForge = true; shop(); } });
    else if (G.zone?.id === 'heart') {
      const first = !F.elatiHeart;
      emit('dialog', { who: 'elati', lines: rls(first ? ['d.elati.h1', 'd.elati.h2', 'd.elati.h3'] : ['d.elati.hagain']), end: () => { F.elatiHeart = true; shop(); } });
    } else if (F.autumn) {
      const first = !F.elatiAutumn;
      emit('dialog', { who: 'elati', lines: rls(first ? ['d.elati.aut1', 'd.elati.aut2', 'd.elati.aut3'] : ['d.elati.autAgain']), end: () => { F.elatiAutumn = true; shop(); } });
    } else if (!F.metElati) {
      emit('dialog', { who: 'elati', lines: rls(['d.elati.1', 'd.elati.2', 'd.elati.3', 'd.elati.4']), end: () => { F.metElati = true; setQuest(12); checkTears(); } });
    } else emit('dialog', { who: 'elati', lines: rls([q <= 12 ? 'd.elati.tears' : q === 13 ? 'd.elati.stones' : 'd.elati.again']), end: shop });
  } else if (kind === 'linden') {
    // Old Linden, half rooted by choice to keep the lanterns lit: the memory of the wood
    if (!F.metLinden) emit('dialog', { who: 'linden', lines: rls(['d.linden.1', 'd.linden.2', 'd.linden.3', 'd.linden.4']), end: () => { F.metLinden = true; setQuest(12); checkTears(); } });
    else emit('dialog', { who: 'linden', lines: rls([q <= 12 ? 'd.linden.tears' : q === 13 ? 'd.linden.hart' : 'd.linden.heart']) });
  } else if (kind === 'villager') {
    emit('dialog', { who: 'villager', lines: ['d.v.' + ((actor.bark || 0) % 4 + 1)] });
  }
});

on('zoneEnter', (id, z) => {
  const q = G.hero.quest, F = G.hero.flags;
  if (id === 'forest' && G.hero.quest < 1) setQuest(1, true);
  if (id === 'crypt' && G.hero.quest < 3 && G.hero.flags.weaver) setQuest(3);
  if (id === 'pass' && G.hero.quest >= 5 && G.hero.quest < 6) setQuest(6, true);
  if (id !== 'town' && id !== 'gate' && !G.hero.wps.includes(id) && (id !== 'coast' || F.hearth)) { G.hero.wps.push(id); emit('toast', t('hud.discovered')); }
  // Act III: the Lady speaks from the still trees as soon as the fire comes in; after the Autumn, only the wind
  if (id === 'weep' && q >= 10 && q < 11) setQuest(11);
  // a step whose flags were saved but whose quest change was still on a timer when the game closed: catch up quietly
  if (id === 'weep' && q === 12 && tearsSeen() >= 3) setQuest(13, true);
  if ((id === 'weep' || id === 'heart') && F.hart && q >= 11 && q < 14) setQuest(14, true);
  // the Lady fell but the Autumn was never seen: her last words and the Autumn play now, where she fell
  if (id === 'heart' && F.ladyDown && !F.autumn) later(2.2, () => { if (G.zone === z) ladyFalls(z, { x: z.L.boss.x, z: z.L.boss.z, rot: 0 }); });
  // the Lady does not rise again: if her shard was never taken (the game closed after the Autumn), it waits at her sapling
  if (id === 'heart' && F.autumn && q < 15 && !G.pickups.some((p) => p.kind === 'shard')) dropShard(z.L.boss.x, z.L.boss.z + 1.4);
  if ((id === 'weep' || id === 'heart') && z && !z.greeted) {
    z.greeted = true;
    if (!F.autumn && !F.ladyDown) later(2.6, () => { if (G.zone === z) say(id === 'weep' ? 'd.lady.w1' : 'd.lady.h1'); });
    else if (id === 'weep' && !F.autumnWeep) { F.autumnWeep = true; later(2.6, () => { if (G.zone === z) emit('say', 'd.autumn.w'); }); }
  }
  // Act IV. The gifts are suspended in a Shadow Gate (stats.js reads the zone): recount on every entry
  if (F.gifts) refreshStats();
  // steps whose flags were saved but whose quest change was still on a timer (or at a scene's end) when the game closed:
  // caught up quietly wherever the hero comes back in (the town, the Field, the Forge)
  const q4 = G.hero.quest;
  if (id === 'town' || id === 'ashfield' || id === 'forge') {
    if (F.fireTaken && G.hero.quest < 18) setQuest(18, true);
    if (memsSeen() >= 5 && G.hero.quest === 18) setQuest(19, true);
    if (F.ivar && G.hero.quest < 20) setQuest(20, true);
    if (F.plug && G.hero.quest < 21) setQuest(21, true);
    if (F.crownUnmade && G.hero.quest < 22) setQuest(22, true);
  }
  if (id === 'ashfield') {
    // Ivar fell but never hung up his lantern (the game closed): his last words play again where he stood
    if (F.ivarDown && !F.ivar) later(2.2, () => { if (G.zone === z) { const b = z.L.boss, f = z.map.nearestFloor(b.x, b.z - 5, 3); ivarFalls(z, { x: f.x, z: f.z, rot: Math.PI }); } });
    if (z && !z.greeted && F.crownUnmade) { z.greeted = true; later(2.4, () => { if (G.zone === z) emit('say', F.newFire ? 'd.field.dawn' : 'd.field.stars'); }); }
  }
  if (id === 'forge') {
    // Karthax fell but the crown was never unmade (the game closed): it is unmade now, at the Anvil
    if (F.karthax && !F.crownUnmade) later(2.2, () => { if (G.zone === z) { const an = z.L.spots.anvil || z.L.boss; karthaxFalls(z, { x: an.x, z: an.z - 3 }); } });
    if (z && !z.greeted && F.crownUnmade) { z.greeted = true; later(2.4, () => { if (G.zone === z) emit('say', 'd.forge.cold'); }); }
  }
  if (id === 'town') {
    // (townFires ran before this: after a catch-up to q22 the beacon to light is looked at again)
    if (G.hero.quest !== q4) townPresence(z);
    if (G.hero.quest === 22 && !F.backHome) { F.backHome = true; later(1.6, () => { if (G.zone === z && G.mode === 'play') emit('dialog', { who: 'healer', lines: ['d.elianthe.back'] }); }); }
    // the new fire was lit but the act never closed (the game closed during the answer)
    if (F.newFire && (G.hero.act4 ?? -1) < 0) later(2, () => actComplete(4));
  }
});
on('voice', (key) => {
  say(key);
  // the Voice speaks through the Cradle: its flame leans and flares
  if (key.startsWith('d.voice')) { const c = cradlePoint(); glowBurst(c.x, c.y, c.z, 0xff7a30, 14, 1.2, 0.18, 0.7); }
});
// Isarn's staff by the new beacon: its last word, and the way into the Shadow Gates
on('staff', () => { emit('say', 'd.staff'); later(1.2, () => emit('openPanel', 'gates')); });
on('lightBeacon', () => { if (G.mode === 'play' && G.hero.quest === 22 && !G.hero.flags.newFire) beaconScene(4, 'answer'); });
// Ivar's fight: he comes up to the gate as the quest
on('bossIntro', (a) => { if (a.kind === 'ivar' && !a.echo && G.hero.quest < 19) setQuest(19, true); });

on('kill', (a) => {
  // an echo fades back into the amber it came from: the fight is real, the story is not touched
  if (a.echo) {
    G.bossActor = null;
    emit('bossDown', a);
    const ash = a.kind === 'ivar' || a.kind === 'karthax', c = ash ? 0xd8d0c0 : 0xffc060;
    if (ash) dismiss(G.zone, a);
    later(1.2, () => { if (G.zone?.actors.includes(a)) { glowBurst(a.x, 1.2, a.z, c, 40, 3, 0.3, 1); ring(a.x, a.z, 3, c, 0.7); } });
    later(2.2, () => emit('toast', t(ash ? 'echo.done4' : 'echo.done'), 'quest'));
    writeSave();
    return;
  }
  if (a.kind === 'weaver' && G.zone.id === 'forest') {
    G.bossActor = null;
    emit('bossDown', a);
    if (!G.hero.flags.weaver) {
      G.hero.flags.weaver = true;
      later(2.5, () => { emit('toast', t('q.weaverDead'), 'quest'); setQuest(2); });
      // the barrow door wakes
      const d = G.zone.L.barrowDoor;
      later(2.2, () => { ring(d.x, d.z, 4, 0x6ab0ff, 1); glowBurst(d.x, 2, d.z, 0x6ab0ff, 50, 5, 0.4, 1); Audio.sfx('door'); });
    }
    writeSave();
  }
  if (a.kind === 'barrowLord' && G.zone.id === 'crypt') {
    G.bossActor = null;
    emit('bossDown', a);
    emit('say', 'd.lordDie');
    if (!G.hero.flags.lord || G.hero.quest < 4) later(1.5, () => dropShard(a.x, a.z + 1));
    G.hero.flags.lord = true;
    writeSave();
  }
  if (a.kind === 'stonewarden' && G.zone.id === 'pass') {
    G.bossActor = null;
    emit('bossDown', a);
    emit('say', 'd.wardenDie');
    if (!G.hero.flags.stonewarden) {
      G.hero.flags.stonewarden = true;
      openDeepGate(G.zone);
      later(2.5, () => { emit('toast', t('q.gateOpen'), 'quest'); setQuest(7); });
    }
    writeSave();
  }
  if (a.kind === 'moltenKing' && G.zone.id === 'halls') {
    G.bossActor = null;
    emit('bossDown', a);
    emit('say', 'd.kingDie');
    if (!G.hero.flags.king || G.hero.quest < 9) later(1.5, () => dropShard(a.x, a.z + 1));
    G.hero.flags.king = true;
    writeSave();
  }
  // Silverhorn kneels, white bark closes over it, and it is the white tree of the gate; the roots of the gate draw back
  if (a.kind === 'silverhorn' && G.zone.id === 'weep') {
    G.bossActor = null;
    emit('bossDown', a);
    const z = G.zone, F = G.hero.flags;
    a.avatar?.setTint(0xf4f0e6, 0.85);
    if (!F.hart) {
      F.hart = true; F.hartAt = { x: +a.x.toFixed(2), z: +a.z.toFixed(2) };
      later(0.8, () => { for (let i = 0; i < 40; i++) P({ x: a.x + (Math.random() - 0.5) * 2, y: Math.random() * 2.4, z: a.z + (Math.random() - 0.5) * 2, vy: 0.6, life: 1.6, size: 0.1, size1: 0.02, color: 0xf8f4e8 }); });
      // the tree grows even if the hero has already gone (the zone is kept until the next session)
      later(1.6, () => { if (G.zone === z) { ring(a.x, a.z, 3, 0xfff4dc, 1); Audio.sfx('thornWither', { x: a.x, z: a.z, vol: 0.7 }); } z.act3.whiteTree = growProp(z, act3Prop('whiteTree'), a.x, a.z, 3.2, a.rot); });
      later(2.2, () => say('d.elati.rest'));
      later(3.6, () => openRootGate(z));
      later(5.6, () => { emit('toast', t('q.rootOpen'), 'quest'); setQuest(14); });
    }
    writeSave();
  }
  // a Heartroot that fed a thorn wall: the wall withers
  if (a.kind === 'heartroot' && a.wall != null && G.zone.id === 'heart') {
    const i = a.wall, F = G.hero.flags;
    witherWall(G.zone, i);
    if (!F['thorn' + i]) {
      F['thorn' + i] = true;
      const n = wallsDown();
      later(0.8, () => { emit('toast', n >= 3 ? t('q.thornsAll') : t('q.thorn', n), 'quest'); emit('quest'); if (n >= 3) Audio.sting('quest'); });
      // and in the quiet after the last wall, something that is not the Lady
      if (n >= 3) later(4, () => { if (G.zone.id === 'heart' && !G.hero.flags.autumn) emit('say', 'd.ash.1'); });
    }
    writeSave();
  }
  // the Lady falls: for one breath she is herself again, then she is a white sapling and the wood remembers the wind
  if (a.kind === 'amaranthe' && G.zone.id === 'heart') {
    G.bossActor = null;
    emit('bossDown', a);
    const z = G.zone;
    // saved at once: if the game closes during her last words, she does not rise again (zoneEnter replays them)
    if (!G.hero.flags.autumn) { G.hero.flags.ladyDown = true; later(1.6, () => { if (G.zone === z) ladyFalls(z, a); }); }
    else if (G.hero.quest < 15) later(1.5, () => dropShard(a.x, a.z + 1));
    writeSave();
  }
  // Act IV: Ivar at rest (his last words, then the Last Lamp and the gate); Karthax fallen (the Unmaking)
  if (a.kind === 'ivar' && G.zone.id === 'ashfield') {
    G.bossActor = null;
    emit('bossDown', a);
    const z = G.zone;
    dismiss(z, a);
    if (!G.hero.flags.ivar) { G.hero.flags.ivarDown = true; later(1.6, () => { if (G.zone === z) ivarFalls(z, { x: a.x, z: a.z, rot: a.rot }); }); }
    writeSave();
  }
  if (a.kind === 'karthax' && G.zone.id === 'forge') {
    G.bossActor = null;
    emit('bossDown', a);
    const z = G.zone;
    dismiss(z, a);
    if (!G.hero.flags.crownUnmade) { G.hero.flags.karthax = true; later(1.6, () => { if (G.zone === z) karthaxFalls(z, a); }); }
    writeSave();
  }
  if (G.gate && G.zone.id === 'gate') emit('gateKill', a);
});
// Act IV's bosses take what they called up with them: Ivar's Lampless kneel and fade, Karthax's raised host falls back into
// the ash (no fight goes on through their last words)
function dismiss(z, b) {
  for (const m of b.summons || []) if (!m.dead && z?.actors.includes(m)) release(z, m, true);
  for (const m of b.host || []) if (!m.dead && z?.actors.includes(m)) { puff(m.x, 1, m.z, 14, 0x6a6660, 1.4, 1.4, 1.4); release(z, m, false); }
}
// her lucid moment, then the Autumn (at the kill, or on the next entry if the game closed or the hero left first)
function ladyFalls(z, a) {
  if (z.ladyFalling) return;
  z.ladyFalling = true;
  emit('dialog', { who: 'amaranthe', lines: rls(['d.amaranthe.die1', 'd.amaranthe.die2', 'd.amaranthe.die3', 'd.amaranthe.die4']), end: () => autumnFalls(z, a) });
}
function autumnFalls(z, a) {
  // the hero died or left while she spoke: the Autumn waits for the next entry (zoneEnter)
  if (G.zone !== z) { z.ladyFalling = false; return; }
  G.hero.flags.autumn = true;
  writeSave();
  emit('cine', {
    x: a.x, z: a.z, dur: 8, zoom: 1.35,
    steps: [
      [0.2, () => { glowBurst(a.x, 1.2, a.z, 0xfff0d0, 50, 3, 0.35, 1.2); ring(a.x, a.z, 4, 0xfff0d0, 0.9); z.act3.sapling = growProp(z, act3Prop('sapling'), a.x, a.z, 3); }],
      [1.0, () => firstAutumn(z, 6)],
      [3.4, () => emit('say', 'd.autumn.h')],
      [5.2, () => dropShard(a.x, a.z + 1.4)]
    ],
    end: () => writeSave()
  });
}
on('shard', () => {
  if (G.zone.id === 'halls') { emit('toast', t('q.shard2'), 'quest'); setQuest(9); return; }
  if (G.zone.id === 'heart') { emit('toast', t('q.shard3'), 'quest'); setQuest(15); return; }
  emit('toast', t('q.shard'), 'quest');
  setQuest(4);
});

// ---------- the Amber Tears: memories you can touch ----------
// lines are [key, who]; 'memory' is the narrator
const M = 'memory';
const TEARS = {
  planting: [[1, M], [2, M], [3, 'youngLinden'], [4, 'amaranthe'], [5, M]],
  sorrow: [[1, M], [2, 'amaranthe'], [3, M], [4, M], [5, 'youngElati'], [6, M]],
  breaking: [[1, M], [2, M], [3, M], [4, 'amaranthe'], [5, M]],
  m1: [[1, M], [2, M], [3, M]],
  m2: [[1, M], [2, M], [3, M]],
  m3: [[1, M], [2, M], [3, 'youngElati']],
  nursery: [[1, M], [2, 'amaranthe'], [3, M]]
};
on('tear', (it, z) => {
  if (it.used || G.mode !== 'play') return;
  it.used = true;
  const id = TEARS[it.id] ? it.id : 'm1', lines = rls(TEARS[id].map(([n, who]) => ['d.tear.' + id + '.' + n, who]));
  let done = false;
  Audio.sting('memory');
  glowBurst(it.x, 1.7, it.z, 0xffc060, 30, 2.5, 0.3, 0.9); ring(it.x, it.z, 2.4, 0xffc060, 0.8);
  document.body.classList.add('memory');
  emit('cine', {
    x: it.x, z: it.z, dur: 3.2, zoom: 1.75, until: () => done,
    steps: [[1.0, () => emit('dialog', { who: M, lines, end: () => { done = true; } })]],
    end: () => endMemory(it, z)
  });
});
function endMemory(it, z) {
  const F = G.hero.flags, first = !F['tear_' + it.id];
  document.body.classList.remove('memory');
  F['tear_' + it.id] = true;
  it.mesh?.userData.dim?.();
  grantBuff('memory');
  const p = G.player;
  if (p) { glowBurst(p.x, 1.2, p.z, 0xffd070, 26, 3, 0.25, 0.8); ring(p.x, p.z, 2.6, 0xffd070, 0.6); }
  emit('toast', t('tear.buff'), 'quest');
  if (it.story && first) { emit('quest'); later(1.2, () => emit('toast', t('q.tear', tearsSeen()), 'quest')); }
  checkTears();
  writeSave();
}
// all three verses of the Long Sorrow are known: something in the Glade of Stones wakes
function checkTears() {
  if (tearsSeen() < 3 || G.hero.quest !== 12) return;
  later(2.4, () => {
    if (G.hero.quest !== 12) return;
    Audio.sfx('hartBellow', { vol: 1 }); shake(0.25);
    later(1.4, () => { say('d.linden.bellow'); setQuest(13); });
  });
}

// a boss's tree remembers the fight (world.js echoAt): an amber echo of the boss rises across from the hero
on('echo', (it, z) => {
  if (it.used || G.mode !== 'play' || G.zone !== z || (z.boss && !z.boss.dead)) return;
  it.used = true;
  // Act III's echoes rise out of amber; Act IV's out of ash (Ivar at the Last Lamp, Karthax at the cold Anvil)
  const k = it.boss, pl = G.player, away = Math.atan2(it.x - pl.x, it.z - pl.z), d = k === 'silverhorn' ? 8 : k === 'karthax' ? 6 : 5;
  const ash = k === 'ivar' || k === 'karthax', c = ash ? 0xd8d0c0 : 0xffc060;
  const across = (a) => z.map.nearestFloor(it.x + Math.sin(away + a) * d, it.z + Math.cos(away + a) * d, 4);
  // straight across, or a little to the side where something solid stands between (the Last Lamp, the Anvil): it must see her
  const s = [0, 0.7, -0.7, 1.3, -1.3].map(across).find((p) => z.map.los(p.x, p.z, pl.x, pl.z)) || across(0);
  Audio.sting('memory');
  glowBurst(it.x, 1.7, it.z, c, 40, 3, 0.3, 1); ring(it.x, it.z, 3, c, 0.8);
  emit('toast', t(ash ? 'echo.rise4' : 'echo.rise'), 'quest');
  // Ivar's braziers burn again for his echo (after the Unmaking the plaza is dark)
  if (k === 'ivar') for (const b of z.act4?.braziers || []) if (!b.lit) b.relight();
  later(1.4, () => {
    if (G.zone !== z) { it.used = false; return; }
    glowBurst(s.x, 1.5, s.z, c, 50, 4, 0.35, 1); ring(s.x, s.z, 5, ash ? 0xe8e0d0 : 0xffd080, 1); shake(0.3);
    const b = spawnMonster(k, s.x, s.z, { level: Math.max(z.level + (k === 'silverhorn' || k === 'ivar' ? 2 : 3), G.hero.level + 1) });
    b.echo = true; b.rot = Math.atan2(G.player.x - b.x, G.player.z - b.z);
    b.baseTint = ash ? 0x9a9690 : 0xffc870; b.baseTintAmt = ash ? 1.2 : 0.4; b.avatar?.setTint(b.baseTint, b.baseTintAmt); b.avatar?.setRim?.(ash ? 0xffa040 : 0xffd070, 1.4);
    z.actors.push(b); z.boss = b;
  });
});

// ---------- the beacon flares when a shard is fed to it, and another fire answers ----------
const BEACON = {
  1: { say: 'd.isarn.r3', after: ['d.isarn.r4', 'd.isarn.r5'], at: 4.0, sayAt: 3.5, dur: 9 },
  2: { say: 'd.isarn.b3', after: ['d.isarn.b4', 'd.isarn.b5'], at: 4.0, sayAt: 3.5, dur: 9 },
  // the third: no watchman answers. Far in the west the Evergreen's beacon-tree kindles by itself, and Isarn's lantern leans to it
  3: { say: 'd.isarn.d3', after: ['d.isarn.d4', 'd.isarn.d5', 'd.isarn.d6', 'd.isarn.d7', 'd.isarn.d8'], at: 4.8, sayAt: 7.6, dur: 12.5, lean: true }
};
function beaconScene(act = 1, mode) {
  // Act IV: the fire leaves (q17), and the new fire answered (q22)
  if (act === 4) { if (mode === 'leave') fireLeaves(); else fireAnswers(); return; }
  const L = G.zone.L, b = L.beacon, F = FAR_BEACONS[act - 1], S = BEACON[act], col = F.color ?? 0xff8a30;
  const far = { x: b.x + F.dx, y: F.y, z: b.z + F.dz };
  const steps = [
    [0.5, () => { Audio.sfx('beaconIgnite'); Audio.sting('beacon'); }],
    [1.2, () => { explosion(b.x, b.z, 3, 0xffa040, { smoke: 0x3a3028, shake: 0.6 }); for (let i = 0; i < 80; i++) P({ x: b.x, y: 9, z: b.z, vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 8, vz: (Math.random() - 0.5) * 6, life: 2.5, size: 0.25, size1: 0.02, color: 0xffd080, color1: 0xff4000, drag: 0.6 }); addLight({ x: b.x, y: 10, z: b.z, color: 0xffa040, intensity: 160, range: 40, life: 3, fade: 3 }); }],
    [S.sayAt, () => { emit('say', S.say); }],
    [S.at, () => { setFar(G.zone, act - 1, true); if (act === 3) Audio.sting('memory'); }]
  ];
  if (S.lean) {
    // the camera drifts west and lowers toward the horizon for the far fire; then back to the Wayfarer, whose lantern
    // streams toward it like a flower toward the sun
    const w = G.actors.find((a) => a.npc === 'wayfarer');
    steps.push([S.at - 1.2, () => { if (G.cine) Object.assign(G.cine, { x: b.x - 26, z: b.z - 2, pitch: 0.34 }); }]);
    if (w) steps.push([S.sayAt - 0.6, () => { if (G.cine) Object.assign(G.cine, { x: w.x - 4, z: w.z + 1, pitch: 0.7 }); }]);
    steps.push([S.sayAt + 0.3, () => lanternLean(far)]);
  }
  emit('cine', { x: b.x, z: b.z + 6, dur: S.dur, zoom: 1.5, steps, end: () => emit('dialog', { who: 'wayfarer', lines: S.after, end: () => actComplete(act) }) });
}
const _lp = new THREE.Vector3();
function lanternLean(far) {
  const w = G.actors.find((a) => a.npc === 'wayfarer'); if (!w?.avatar) return;
  const av = w.avatar, pt = av.weaponPoint?.('R', 1.3, _lp) || _lp.set(w.x, 2.1, w.z);
  const light = addLight({ x: pt.x, y: pt.y, z: pt.z, color: 0xffd890, intensity: 26, range: 9, life: 4.5, fade: 1.5, flicker: 0.1 });
  let n = 0;
  const step = () => {
    const p = av.weaponPoint?.('R', 1.3, _lp) || _lp.set(w.x, 2.1, w.z);
    light.x = p.x; light.y = p.y; light.z = p.z;
    const dx = far.x - p.x, dz = far.z - p.z, l = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < 3; i++) { const s = 2.2 + Math.random() * 2.5; P({ x: p.x + (Math.random() - 0.5) * 0.12, y: p.y + (Math.random() - 0.5) * 0.12, z: p.z + (Math.random() - 0.5) * 0.12, vx: (dx / l) * s, vy: 0.5 + Math.random() * 0.6, vz: (dz / l) * s, life: 1.2, size: 0.09, size1: 0.02, color: 0xffe0a0, color1: 0xb8e060, drag: 0.3 }); }
    if (++n < 130) later(0.03, step);
  };
  step();
}
// a beacon blessing for each act, chosen once (heroes from before the blessings get theirs on their next return)
export function offerBoons() {
  const h = G.hero; if (!h) return false;
  h.boons ||= [];
  // never over a cinematic or another panel: try again in a moment
  if (G.mode !== 'play' || G.panel) { later(2, offerBoons); return false; }
  for (const act of [1, 2, 3, 4]) {
    const done = act === 1 ? h.act1 >= 0 : (h['act' + act] ?? -1) >= 0;
    if (done && !h.boons[act - 1]) { emit('openPanel', 'boon', { act }); return true; }
  }
  return false;
}
on('actClosed', () => later(0.6, offerBoons));
on('boonTaken', (id) => {
  const p = G.player; if (!p) return;
  Audio.sfx('beaconIgnite', { vol: 0.6 });
  glowBurst(p.x, 1.2, p.z, 0xffb050, 30, 4, 0.4, 0.9);
  ring(p.x, p.z, 3.2, 0xffa040, 0.7);
  emit('toast', t('boon.taken', t('boon.' + id)), 'quest');
  later(2.5, offerBoons);
});
function actComplete(act) {
  const h = G.hero;
  if (act === 1) { h.act1 = Math.max(h.act1, h.diff); h.quest = 5; h.flags.act1 = true; }
  else if (act === 2) { h.act2 = Math.max(h.act2 ?? -1, h.diff); h.quest = 10; h.flags.act2 = true; }
  else if (act === 3) { h.act3 = Math.max(h.act3 ?? -1, h.diff); h.quest = 16; h.flags.act3 = true; }
  else { h.act4 = Math.max(h.act4 ?? -1, h.diff); h.quest = 23; h.flags.act4 = true; }
  G.flags.actDone = act;
  emit('quest');
  writeSave();
  // the new fire has its own music: the lantern's motif, slow, with the village's tune as each fire answers
  Audio.music(act === 4 ? 'newfire' : 'victory');
  emit('openPanel', 'act');
}
// ---------- Act IV: the Ashen Forge ----------
// q17 at the beacon: what Isarn owes, Brokka and the Ember Cradle, the last fire leaving Whitecliff
function act4Begins() {
  const z = G.zone;
  // once: Isarn is not to be talked to again while the scene plays (a second word, or one E too many, would start it twice)
  if (z.fireSeq) return;
  fireSeq(z, true);
  emit('dialog', { who: 'wayfarer', lines: ['d.isarn.e1', 'd.isarn.e2', 'd.isarn.e3', 'd.isarn.e4', 'd.isarn.e5', 'd.isarn.e6'], end: () => brokkaArrives(z) });
}
// the scene's guard on the town: Isarn's word is taken away while it plays, and given back if the scene has to wait
function fireSeq(z, on) {
  z.fireSeq = on;
  const w = z.townNpc?.wayfarer; if (!w) return;
  const i = z.interact.indexOf(w.it);
  if (on && i >= 0) z.interact.splice(i, 1);
  if (!on && i < 0 && !w.leaving && z.actors.includes(w.a)) z.interact.push(w.it);
}
// Brokka comes up from the village with the Cradle she and Halda forged (her people are loaded with the Act II zones).
// The scene belongs to the town: if the hero has gone before it plays out, it waits (Brokka with it, by the beacon) for the
// next word with Isarn
function brokkaArrives(z) {
  const s = z.L.spots.npcs.wayfarer, stop = () => fireSeq(z, false);
  // (gone, or already on the road: the fade of a travel is on)
  const away = () => G.zone !== z || !!document.getElementById('fade')?.classList.contains('on');
  const talk = () => {
    if (away()) { stop(); return; }
    emit('dialog', { who: 'brokka', lines: [['d.brokka.c1', 'brokka'], ['d.brokka.c2', 'brokka'], ['d.isarn.e7', 'wayfarer'], ['d.brokka.c3', 'brokka']], end: () => { if (away()) stop(); else beaconScene(4, 'leave'); } });
  };
  const br0 = z.townBrokka;
  if (br0 && !br0.removed && z.actors.includes(br0)) { talk(); return; }
  loadFolk('folk').then(() => {
    if (away()) { stop(); return; }
    if (G.mode !== 'play') { talk(); return; }
    const from = z.map.nearestFloor(s.x + 1.5, s.z + 9, 4), br = spawnNpc('brokka', from.x, from.z, Math.PI);
    z.actors.push(br); z.townBrokka = br;
    walkTo(br, s.x + 1.7, s.z + 1.4, 2.6, () => { br.home = angleTo(br.x, br.z, s.x, s.z); talk(); });
  }, talk);
}
// the Last Fire Leaves: the beacon's fire comes down into the Cradle and the stone goes cold; the village comes out with
// torches; the far fires flicker but hold. The flag is saved first, so a game closed mid-scene finds the fire gone.
function fireLeaves() {
  const z = G.zone; if (z?.id !== 'town') return;
  const b = z.L.beacon, F = G.hero.flags, top = { x: b.x, y: 9.2, z: b.z };
  // Isarn stays through the scene (townPresence lets a leaving Isarn be): he goes ahead down the north path at its end
  const w = z.townNpc?.wayfarer; if (w) w.leaving = true;
  F.fireTaken = true; writeSave();
  const pour = (n) => { if (G.zone !== z || n <= 0) return; const c = cradlePoint(); fireStream(top, { x: c.x, y: c.y, z: c.z }, 5); later(0.05, () => pour(n - 1)); };
  emit('cine', {
    x: b.x, z: b.z + 5, dur: 11, zoom: 1.45,
    steps: [
      [0.6, () => { Audio.sfx('lanternDrink', { vol: 1 }); Audio.sfx('beaconIgnite', { vol: 0.4, pitch: 0.7 }); pour(55); }],
      [1.4, () => emit('say', 'd.leave.1')],
      [3.4, () => { setBeacon(z, false); puff(b.x, 9.4, b.z, 22, 0x4a4642, 2.4, 1.6, 2.4); Audio.sfx('windGust', { vol: 0.6 }); Audio.sting('lantern'); }],
      [4.8, () => townFires(z)],
      [6.4, () => emit('say', 'd.halda.stars')],
      [8.4, () => { for (const f of z.town?.far || []) if (f) { f.spr.userData.k = 0.4; later(0.6, () => { f.spr.userData.k = 1; }); } }]
    ],
    end: () => emit('dialog', { who: 'wayfarer', lines: ['d.isarn.go'], end: () => {
      z.fireSeq = false;
      setQuest(18); emit('toast', t('q.fireTaken'), 'quest');
      // Isarn and Brokka go ahead, down the path behind the beacon hill
      const br = z.townBrokka, path = [{ x: b.x - 3.5, z: 17.5 }, { x: 24, z: 9.8 }, { x: b.x - 13.5, z: 7.2 }];
      if (w) { w.leaving = true; const i = z.interact.indexOf(w.it); if (i >= 0) z.interact.splice(i, 1); walkPath(w.a, path, 1.6, () => vanish(z, w.a, 1, () => { w.leaving = false; townPresence(z); })); }
      if (br) later(0.8, () => walkPath(br, path, 1.6, () => vanish(z, br, 1)));
    } })
  });
}
function walkPath(a, pts, speed, done) { const [p, ...rest] = pts; if (!p) { done?.(); return; } walkTo(a, p.x, p.z, speed, () => walkPath(a, rest, speed, done)); }

// q18: the Field of Ash. The Lamp Memories play as the Amber Tears did, in white ash; the figures of the memory stand
// by the lamp for as long as it lasts
const AM = 'ashMemory', STORY_LAMPS = ['l1', 'l2', 'l3', 'l4', 'l5'];
const LAMP_MEM = {
  l1: { lines: [[1, AM], [2, AM], [3, AM]], who: ['isarnBoy'] },
  l2: { lines: [[1, AM], [2, 'arna'], [3, AM]], who: ['isarnBoy'] },
  l3: { lines: [[1, AM], [2, 'arna'], [3, AM]], who: ['arna'] },
  l4: { lines: [[1, AM], [2, 'arnaOld'], [3, AM]], who: ['arnaOld'] },
  l5: { lines: [[1, AM], [2, 'isarnBoy'], [3, 'ivar'], [4, AM]], who: ['ivarGhost', 'isarnBoy'] }
};
const lampsLit = () => STORY_LAMPS.filter((id) => G.hero.flags['lamp_' + id]).length;
const memsSeen = () => STORY_LAMPS.filter((id) => G.hero.flags['mem_' + id]).length;
on('lampLit', (it, first, z) => {
  const F = G.hero.flags;
  if (it.memory && !F['mem_' + it.id]) later(0.7, () => emit('lamp', it, z));
  else emit('toast', t('lamp.lit'), 'quest');
  if (it.memory && first) emit('quest');
  writeSave();
});
on('lamp', (it, z) => {
  const M0 = LAMP_MEM[it.id], F = G.hero.flags;
  if (!M0 || G.mode !== 'play' || G.zone !== z || F['mem_' + it.id] || z.memory) return;
  z.memory = true; it.used = true;
  const lines = rls(M0.lines.map(([n, who]) => ['d.lamp.m' + it.id.slice(1) + '.' + n, who]));
  let done = false;
  const figs = [];
  Audio.sting('memory');
  glowBurst(it.x, 2, it.z, 0xf0ece4, 30, 2.5, 0.3, 0.9); ring(it.x, it.z, 2.6, 0xe8e4dc, 0.8);
  document.body.classList.add('memory-ash');
  // the people of the memory, pale as ash, before the lamp
  const r = it.spot.r || 0;
  const raise = () => M0.who.forEach((k, i) => {
    const side = M0.who.length > 1 ? (i ? 1 : -1) * 0.9 : 0, d = 2.6 + (k === 'isarnBoy' && M0.who.length > 1 ? 0.4 : 0);
    const f = z.map.nearestFloor(it.x + Math.sin(r) * d + Math.cos(r) * side, it.z + Math.cos(r) * d - Math.sin(r) * side, 2);
    const a = spawnNpc(k, f.x, f.z, 0); a.still = true;
    a.home = a.rot = M0.who.length > 1 ? angleTo(f.x, f.z, it.x + Math.sin(r) * d, it.z + Math.cos(r) * d) : r + Math.PI;
    if (k === 'isarnBoy' && it.id !== 'l5') a.avatar?.group.scale.multiplyScalar(0.9);
    if (k === 'arnaOld') a.avatar?.play('lantern', 1);
    if (k === 'ivarGhost' && M0.who.length > 1) a.avatar?.play('kneel', 1);
    // (grey enough to keep their shading against the white of the memory)
    if (a.avatar) { ghostly(a.avatar, 0.85); a.avatar.setTint(0xb4aea4, 1.6); a.avatar.setRim(0xfaf6ee, 0.8); }
    z.actors.push(a); figs.push(a);
    puff(f.x, 1, f.z, 10, 0xd8d4cc, 1.2, 0.8, 1.4);
  });
  emit('cine', {
    x: it.x, z: it.z, dur: 3.2, zoom: 1.3, until: () => done,
    steps: [[0.7, raise], [1.0, () => emit('dialog', { who: AM, lines, end: () => { done = true; } })]],
    end: () => endLampMemory(it, z, figs)
  });
});
function endLampMemory(it, z, figs) {
  const F = G.hero.flags;
  z.memory = false;
  document.body.classList.remove('memory-ash');
  for (const a of figs) vanish(z, a, 1.4);
  F['mem_' + it.id] = true;
  it.used = true;
  grantBuff('memory');
  const p = G.player;
  if (p) { glowBurst(p.x, 1.2, p.z, 0xf0e8d8, 26, 3, 0.25, 0.8); ring(p.x, p.z, 2.6, 0xffe8c0, 0.6); }
  emit('toast', t('lamp.buff'), 'quest');
  emit('quest'); later(1.2, () => emit('toast', t('q.lamp', lampsLit()), 'quest'));
  // after the fifth, Isarn is at the one empty hook among the dead lanterns
  if (it.id === 'l5') act4Presence(z);
  if (memsSeen() >= 5) later(2.6, () => setQuest(19));
  writeSave();
}

// the Altars of the Wish: a shard stirs in the Cradle and speaks in its last keeper's voice, then offers its gift
const ALTARS = { throne: 'barrowLord', forge: 'moltenKing', unfading: 'amaranthe' };
on('altar', (it, z) => {
  if (it.used || G.mode !== 'play' || G.zone !== z) return;
  const c = cradlePoint();
  glowBurst(c.x, c.y, c.z, 0xff8a40, 18, 1.5, 0.2, 0.7); glowBurst(it.x, 0.6, it.z, 0xff7a30, 24, 2, 0.3, 0.9);
  Audio.sfx('crownCrack', { vol: 0.35 }); Audio.sting('memory');
  emit('dialog', { who: ALTARS[it.id], lines: [rl('d.altar.' + it.id)], end: () => emit('openPanel', 'altar', { id: it.id }) });
});
on('altarChoice', (id, choice) => {
  const F = G.hero.flags, z = G.zone;
  F.gifts ||= {}; F.gifts[id] = choice;
  const it = z.act4?.altars.find((a) => a.id === id);
  if (it) { it.used = true; it.mesh.userData.setState(choice); glowBurst(it.x, 0.8, it.z, choice === 'taken' ? 0xff5a20 : 0xc8c0b0, 30, 3, 0.3, 0.8); }
  refreshStats();
  Audio.sfx(choice === 'taken' ? 'crownCrack' : 'lanternDrink', { vol: 0.6 });
  emit('toast', t(choice === 'taken' ? 'gift.taken' : 'gift.refused', t('gift.' + id)), 'quest');
  later(1.4, () => emit('say', choice === 'taken' ? 'd.altar.took' : 'd.altar.refused'));
  // refused all three: the crown never held this one (the Act IV blessing is worth half again)
  if (Object.keys(ALTARS).every((k) => F.gifts[k] === 'refused')) { F.unbound = true; refreshStats(); later(4, () => emit('toast', t('gift.unbound'), 'big')); }
  writeSave();
});

// q19: Ivar at the Anvil Gate. In his last phase his son runs in from the Graves, and his lantern ends the dark
on('ivarRemember', (a) => {
  if (a.echo) return;
  const z = G.zone, A = z.act4, S = z.L.spots; if (!A) return;
  let n = ['isarnHook', 'isarn'].map((k) => A.npcs[k]).find((x) => x && z.actors.includes(x.a)), I = n?.a;
  const run = S.isarnRun || { x: z.L.boss.x, z: z.L.boss.z + 18 };
  if (n) { n.busy = true; act4Presence(z); } else { I = spawnNpc('wayfarer', run.x, run.z, Math.PI); z.actors.push(I); }
  // still at the camp (the fight came before the fifth lamp): he comes from the Graves all the same, not through the cliffs
  if (n && Math.hypot(I.x - run.x, I.z - run.z) > 25) { const f = z.map.nearestFloor(run.x, run.z, 3); I.x = f.x; I.z = f.z; }
  z.ivarIsarn = I;
  isarnLantern(I, 'gold');
  const to = () => { const d = Math.hypot(a.x - run.x, a.z - run.z) || 1, f = z.map.nearestFloor(a.x + ((run.x - a.x) / d) * 5, a.z + ((run.z - a.z) / d) * 5, 3); return f; };
  // (the hero gone to another zone meanwhile: the dark ends unheard, and the gold light waits for her return)
  const arrive = () => { I.home = I.rot = angleTo(I.x, I.z, a.x, a.z); if (G.zone !== z) { a.endDark?.(); return; } say('d.isarn.father'); Audio.sting('lantern'); a.endDark?.(); };
  walkTo(I, run.x, run.z, 5.5, () => { const f = to(); walkTo(I, f.x, f.z, 5, arrive); });
});
on('ivarFalter', (a, n) => { if (!a.echo) say('d.isarn.call' + (n + 1)); });
// Ivar falls: lucid for one breath; the twist, the lantern's laugh; he hangs his lantern on the Last Lamp, the Lampless
// kneel, the gate opens and the lantern drags Isarn north. Saved at once (ivarDown): a game closed mid-scene replays it.
function ivarFalls(z, at) {
  if (z.ivarFalling) return;
  z.ivarFalling = true;
  const S = z.L.spots, A = z.act4, ll = S.lastLamp || z.L.boss;
  const g = spawnNpc('ivarGhost', at.x, at.z, at.rot || 0); g.still = true; g.home = at.rot || 0; z.actors.push(g); g.avatar?.play('kneel', 1);
  const near = z.map.nearestFloor(at.x + Math.sin((at.rot || 0)) * 1.7, at.z + Math.cos((at.rot || 0)) * 1.7, 2);
  let I = z.ivarIsarn;
  if (!I || I.removed) {
    // after a reload Isarn is still at the hook (or the camp): he comes from there, brought in off camera a few steps away
    // (he is by his father as they speak)
    const n = ['isarnHook', 'isarn'].map((k) => A?.npcs[k]).find((x) => x && !x.a.removed && z.actors.includes(x.a));
    if (n) { n.busy = true; act4Presence(z); I = n.a; } else { const run = S.isarnRun || ll, f = z.map.nearestFloor(run.x, run.z, 3); I = spawnNpc('wayfarer', f.x, f.z, 0); z.actors.push(I); }
    const dI = Math.hypot(I.x - near.x, I.z - near.z);
    if (dI > 8) { const f = z.map.nearestFloor(near.x + ((I.x - near.x) / dI) * 3, near.z + ((I.z - near.z) / dI) * 3, 2); I.x = f.x; I.z = f.z; }
    z.ivarIsarn = I;
  }
  isarnLantern(I, 'gold');
  walkTo(I, near.x, near.z, 2.4, () => { I.home = I.rot = angleTo(I.x, I.z, g.x, g.z); I.avatar?.play('kneel', 1); });
  let done = false;
  const laugh = () => {
    const p = I.avatar?.weaponPoint?.('R', 1.3, new THREE.Vector3()) || { x: I.x, y: 2, z: I.z };
    glowBurst(p.x, p.y, p.z, 0xff5a20, 40, 3, 0.35, 1); ring(I.x, I.z, 4, 0xff6a20, 0.9); shake(0.3);
    Audio.sfx('lavaBurst', { vol: 0.5, pitch: 1.6 }); Audio.sfx('wraithWail', { vol: 0.4, pitch: 0.6 });
    emit('dialog', { who: 'voice', lines: ['d.voice.laugh1', 'd.voice.laugh2'], end: () => { done = true; } });
  };
  emit('cine', {
    x: at.x, z: at.z, dur: 4, zoom: 1.65, until: () => done,
    steps: [[1.4, () => emit('dialog', { who: 'ivar', lines: [['d.ivar.die1', 'ivar'], ['d.isarn.die2', 'wayfarer'], ['d.ivar.die3', 'ivar']], end: laugh })]],
    end: () => lastLamp(z, g, I, ll)
  });
}
function lastLamp(z, g, I, ll) {
  const F = G.hero.flags, gate = z.L.gate, d = Math.hypot(ll.x - g.x, ll.z - g.z), walk = Math.max(0.6, (d - 1.2) / 2.4);
  const hang = z.map.nearestFloor(ll.x + 1.1, ll.z + 0.7, 2);
  emit('cine', {
    x: ll.x, z: ll.z + 2, dur: walk + 8.5, zoom: 1.45,
    steps: [
      [0.2, () => walkTo(g, hang.x, hang.z, 2.4, () => { g.home = g.rot = angleTo(g.x, g.z, ll.x, ll.z); g.avatar?.play('interact', 1); })],
      [walk + 1.0, () => {
        setLastLamp(z, true); F.ivar = true; writeSave();
        glowBurst(ll.x + 0.9, 4, ll.z, 0xffd080, 50, 4, 0.4, 1.2); ring(ll.x, ll.z, 7, 0xffd080, 1.2); Audio.sting('lantern'); Audio.sfx('lampLight');
        g.avatar?.hold('R', null);
        emit('say', 'd.ivar.lamp');
        // the Lampless at the gate kneel and are gone into the dark
        for (const a of z.actors.slice()) if (a.kind === 'lampless' && !a.dead && Math.hypot(a.x - ll.x, a.z - ll.z) < 24) release(z, a, true);
      }],
      [walk + 2.6, () => vanish(z, g, 2.6)],
      [walk + 3.4, () => openAnvilGate(z)],
      [walk + 5.2, () => {
        say('d.isarn.drag');
        if (gate && I && !I.removed) { stopWalk(I); I.avatar?.anim.stop?.(0.2); walkPath(I, [{ x: gate.x, z: gate.z + 3 }, { x: gate.x, z: gate.z - 3 }], 5.2, () => vanish(z, I, 0.7)); }
      }]
    ],
    end: () => {
      z.ivarFalling = false;
      emit('toast', t('q.anvilOpen'), 'quest'); setQuest(20);
      act4Presence(z); echoAt(z, 'ivar', ll.x, ll.z + 1.4);
      writeSave();
    }
  });
}

// q20: the Great Bellows. Brokka works each one; the Voice speaks as the mountain wakes
on('bellowsStart', () => say('d.brokka.b0'));
on('lampSnuffed', (it) => { if (it.kind === 'bellows' && G.zone?.run?.it === it) say('d.brokka.bfire'); });
on('bellowsDone', (id, n, z) => {
  const F = G.hero.flags;
  emit('toast', t('q.breath', n), 'quest'); emit('quest'); Audio.sting('quest');
  later(1.0, () => say('d.brokka.b' + Math.min(n, 3)));
  later(4.2, () => say('d.voice.f' + Math.min(n, 3)));
  if (n === 1) later(8, () => { if (G.zone === z) emit('say', 'd.forge.heat'); });
  // the third breath: full fire, and the slag on the Great Stair runs down; Elati comes up from the Graves
  if (n >= 3 && !F.plug) {
    F.plug = true;
    later(2.2, () => meltPlug(z));
    later(4.6, () => { emit('toast', t('q.plug'), 'quest'); setQuest(21); });
    act4Presence(z);
  }
  writeSave();
});

// q21: the Anvil of the Crown. Isarn kneels at the Anvil; the brow-stone tears out of his lantern, the three shards rise from
// the Cradle, and Karthax pours himself out of the slag (he sleeps until then: world.js holdWake)
on('karthaxArrive', (z, b) => {
  const F = G.hero.flags, S = z.L.spots, an = S.anvil || z.L.boss, I = z.act4?.npcs.isarn?.a;
  const top = { x: an.x, y: 3.2, z: an.z };
  const seq = { done: false };
  const tear = () => {
    F.browstone = true;
    const p = I?.avatar?.weaponPoint?.('R', 1.3, new THREE.Vector3()) || { x: an.x, y: 2, z: an.z + 2 };
    if (I) isarnLantern(I, 'white');
    for (let k = 0; k < 24; k++) later(k * 0.05, () => fireStream({ x: p.x, y: p.y, z: p.z }, top, 3));
    glowBurst(p.x, p.y, p.z, 0xfff4e0, 40, 3, 0.35, 1); Audio.sfx('crownCrack'); Audio.sting('lantern');
    emit('say', 'd.k.tear');
    later(3.2, shards);
  };
  const shards = () => {
    const c = cradlePoint();
    for (let k = 0; k < 30; k++) later(k * 0.05, () => { const q = cradlePoint(); fireStream({ x: q.x, y: q.y, z: q.z }, top, 3); });
    glowBurst(c.x, c.y, c.z, 0xff8a30, 30, 2.5, 0.3, 0.9); Audio.sfx('crownCrack', { vol: 0.7 });
    emit('say', 'd.k.shards');
    later(3, pour);
  };
  const pour = () => {
    b.hidden = false; b.y = -3.4;
    explosion(b.x, b.z, 4, 0xff6a10, { smoke: 0x2a1a10, shake: 0.6 }); Audio.sfx('lavaBurst', { vol: 1 }); Audio.sfx('bossRoar', { vol: 0.6 });
    emit('say', 'd.k.slag');
    let t0 = 0;
    const rise = () => { t0 = Math.min(1, t0 + 0.016 / 2.2); b.y = -3.4 * (1 - t0) ** 2; if (Math.random() < 0.5) P({ x: b.x + (Math.random() - 0.5) * 2, y: 0.4, z: b.z + (Math.random() - 0.5) * 2, vy: 3, life: 0.6, size: 0.4, size1: 0.1, color: 0xff8a30, color1: 0x2a1a10 }); if (t0 < 1) later(0.016, rise); else { b.y = 0; later(1.2, () => { seq.done = true; }); } };
    rise();
  };
  emit('cine', {
    x: an.x, z: an.z + 4, dur: 4, zoom: 1.5, until: () => seq.done,
    steps: [[0.8, () => (I ? emit('dialog', { who: 'wayfarer', lines: ['d.isarn.k1'], end: tear }) : tear())]],
    end: () => { b.holdWake = false; b.hidden = false; b.y = 0; writeSave(); }
  });
});
// his second phase: the gifts he lent are taken back (ai.js strips them and says so); a keeper's statue breaks: its motif
on('karthaxCages', (a) => { if (!a.echo && Object.values(G.hero.flags.gifts || {}).includes('taken')) later(5.5, () => emit('toast', t('gift.lost'), 'quest')); });
on('cageBroken', (s, id) => Audio.mood({ keeper: { lord: 1, king: 2, lady: 3 }[id] || 0 }));
// his last fire: Isarn stands and opens the clean lantern, a light that walks toward him
on('karthaxLastFire', (a) => {
  const z = G.zone, I = z.act4?.npcs.isarn?.a;
  if (a.echo || !I || I.removed) return;
  I.still = false; I.avatar?.anim.stop?.(0.3);
  isarnLantern(I, 'white');
  later(0.8, () => { say('d.isarn.k2'); Audio.sting('lantern'); });
  const pool = addLightPool(I.x, I.z, 6, Infinity, 'isarn', { color: 0xfff0c8, intensity: 26 });
  z.isarnWalk = { a: I, pool };
});
// at 15%: what are you? The beacon-keeper's answer
on('karthaxBeacon', (a) => {
  if (a.echo) return;
  const asked = Object.values(G.hero.flags.gifts || {}).includes('taken');
  say(asked ? 'd.karthax.what2' : 'd.karthax.what');
  later(3.4, () => say('d.isarn.k3'));
});
// Karthax falls: who will remember him? The fires he drank pour back out, the crown lies cracked on the Anvil, and the
// three peoples unmake it. Saved at once (karthax): a game closed during it plays it again on the next visit.
function karthaxFalls(z, at) {
  if (z.unmaking) return;
  z.unmaking = true;
  const S = z.L.spots, an = S.anvil || z.L.boss, A = z.act4;
  let done = false;
  emit('cine', {
    x: an.x, z: an.z + 3, dur: 3.6, zoom: 1.55, until: () => done,
    steps: [
      [0.5, () => emit('dialog', { who: 'karthax', lines: ['d.karthax.die'], end: () => {
        // the fires spill back out of him, and the Cradle catches again
        for (let k = 0; k < 20; k++) later(k * 0.06, () => { const c = cradlePoint(); fireStream({ x: at.x, y: 1.5, z: at.z }, { x: c.x, y: c.y, z: c.z }, 3); });
        explosion(at.x, at.z, 3.5, 0xff7a20, { smoke: 0x2a1a10, shake: 0.5 }); Audio.sfx('lanternDrink', { vol: 1 });
        emit('say', 'd.k.spill');
        if (!A.crown) { A.crown = act4Prop('crown'); A.crown.userData.setSockets?.(4); A.crown.scale.setScalar(1.5); A.crown.position.set(an.x, (A.anvil?.userData.top ?? 2) + 0.1, an.z); z.extra.push(A.crown); R.scene.add(A.crown); }
        later(3.2, () => { done = true; });
      } })]
    ],
    end: () => unmaking(z)
  });
}
function unmaking(z) {
  const F = G.hero.flags, S = z.L.spots, an = S.anvil || z.L.boss, mouth = S.mouth || { x: an.x, z: an.z + 12, r: 4 }, A = z.act4;
  const N = A.npcs, I = N.isarn?.a, put = (n, x, zz) => { if (!n) return null; const f = z.map.nearestFloor(x, zz, 3); n.busy = true; n.a.x = f.x; n.a.z = f.z; if (!z.actors.includes(n.a)) { z.actors.push(n.a); R.scene.add(n.a.avatar.group); } return n.a; };
  // Brokka and Elati have come up the stair behind the hero
  const br = put(N.brokka, an.x - 3.2, an.z + 2.4), el = put(N.elati, an.x + 3.4, an.z + 2.6);
  act4Presence(z);
  for (const a of [br, el]) if (a) { a.still = true; a.home = a.rot = angleTo(a.x, a.z, an.x, an.z); }
  if (I) { stopWalk(I); I.still = true; I.avatar?.anim.stop?.(0.2); const f = z.map.nearestFloor(an.x, an.z + 2.6, 2); I.x = f.x; I.z = f.z; I.home = I.rot = Math.PI; }
  z.isarnWalk = null; removeLightPool('isarn');
  const seq = { done: false }, mouthW = A.mouth?.userData;
  let wk = 0;
  const whiten = (to) => { const st = () => { wk = Math.min(to, wk + 0.016 / 1.6); mouthW?.setWhite?.(wk); if (wk < to) later(0.016, st); }; st(); };
  const strike = () => {
    if (br) { br.avatar?.play('chop', 1); later(0.55, () => { sparks(an.x, 2.6, an.z, 40, 0xffd080, 8); Audio.sfx('anvil', { vol: 1 }); Audio.sfx('crownCrack', { vol: 1 }); shake(0.5); A.crown?.userData.setSockets?.(0); }); }
    later(2, () => emit('dialog', { who: 'elati', lines: rls(['d.elati.u1']), end: song }));
  };
  const song = () => {
    Audio.sfx('amaranthSong', { vol: 0.9 });
    later(1.2, () => {
      emit('say', 'd.u.pour');
      for (let k = 0; k < 40; k++) later(k * 0.05, () => { const c = cradlePoint(); fireStream({ x: c.x, y: c.y, z: c.z }, { x: mouth.x, y: 0.3, z: mouth.z }, 4); });
      Audio.sfx('beaconIgnite', { vol: 0.8 }); whiten(1);
      later(2.6, () => emit('dialog', { who: 'wayfarer', lines: ['d.isarn.u1', 'd.isarn.u2', 'd.isarn.u3', 'd.isarn.u4'], end: walkIn }));
    });
  };
  // Isarn lifts the crown and walks into the white fire; the Lampless follow with their lanterns lit, and Ivar takes his hand
  const walkIn = () => {
    if (!I || I.removed) { gone(); return; }
    isarnLantern(I, 'dark');
    I.still = false;
    const c = A.crown;
    const carry = () => { if (!c || I.removed) return; c.position.set(I.x, 2.3, I.z); if (I.walking) later(0.016, carry); };
    walkTo(I, mouth.x, mouth.z, 1.1, () => { vanish(z, I, 1.6, gone); if (c) { c.visible = false; } glowBurst(mouth.x, 1.5, mouth.z, 0xfff4e0, 60, 5, 0.45, 1.4); Audio.sfx('beaconIgnite', { vol: 0.7, pitch: 1.3 }); });
    carry();
    emit('say', 'd.u.walk');
    const ghosts = [];
    const gs = (S.ghosts || []).slice(0, 3);
    gs.forEach((p, i) => { const f = z.map.nearestFloor(p.x, p.z, 3), g = spawnNpc('wayfarerGhost', f.x, f.z, 0); z.actors.push(g); ghosts.push(g); g.avatar?.hold('R', 'lanternStaff', { lamp: 0xffd890, glow: 2.4 }); later(0.8 + i * 0.5, () => walkTo(g, mouth.x + (i - 1) * 1.2, mouth.z - 0.5, 1.4, () => vanish(z, g, 1.4))); });
    const iv = spawnNpc('ivarGhost', mouth.x + 1.4, mouth.z + 0.5, 0); z.actors.push(iv); later(1.5, () => walkTo(iv, mouth.x + 0.5, mouth.z, 0.9, () => vanish(z, iv, 1.8)));
  };
  const gone = () => {
    if (seq.gone) return; seq.gone = true;
    later(1.2, () => { emit('say', 'd.voice.cold'); Audio.sfx('windGust', { vol: 0.8 }); });
    later(4.4, () => {
      // the Night Without Fires: every beacon in the North goes out; the Forge goes cold
      F.crownUnmade = true; writeSave();
      whitenOut(); forgeCold(z); shake(0.6); Audio.sting('death');
      emit('say', 'd.u.night');
      later(4.2, () => { seq.done = true; });
    });
  };
  const whitenOut = () => { const st = () => { wk = Math.max(0, wk - 0.016 / 3); mouthW?.setWhite?.(wk); if (wk > 0) later(0.016, st); }; st(); };
  emit('cine', {
    x: an.x, z: an.z + 4, dur: 4, zoom: 1.4, until: () => seq.done,
    steps: [[0.8, () => emit('dialog', { who: 'brokka', lines: ['d.brokka.u1'], end: strike })]],
    end: () => {
      z.unmaking = false;
      F.crownUnmade = true; G.hero.flags.giftsTaken = true; refreshStats();
      for (const k of ['brokka', 'elati', 'isarn']) if (N[k]) N[k].busy = false;
      act4Presence(z);
      if (S.anvil) echoAt(z, 'karthax', S.anvil.x, S.anvil.z + 2.4);
      emit('toast', t('q.unmade'), 'big'); setQuest(22);
      Audio.music('forge');
      writeSave();
    }
  });
}

// q22: home under the stars, and the new fire. The flag is saved first: a game closed mid-scene finds the fires lit.
function fireAnswers() {
  const z = G.zone, b = z.L.beacon, F = G.hero.flags, top = { x: b.x, y: 9.2, z: b.z };
  F.newFire = true; writeSave();
  townPresence(z);
  const T = z.town;
  const steps = [
    [0.4, () => { emit('say', 'd.answer.0'); Audio.music('newfire'); const go = (n) => { if (n <= 0 || G.zone !== z) return; const c = cradlePoint(); fireStream({ x: c.x, y: c.y + 0.6, z: c.z }, top, 4); later(0.05, () => go(n - 1)); }; go(30); }],
    [2.0, () => { setBeacon(z, true); explosion(b.x, b.z, 3, 0xfff0c0, { smoke: 0x3a3830, shake: 0.4 }); for (let i = 0; i < 70; i++) P({ x: b.x, y: 9, z: b.z, vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 7, vz: (Math.random() - 0.5) * 6, life: 2.4, size: 0.25, size1: 0.02, color: 0xfff4d8, color1: 0xffa040, drag: 0.6 }); addLight({ x: b.x, y: 10, z: b.z, color: 0xfff0c0, intensity: 160, range: 40, life: 3, fade: 3 }); Audio.sfx('beaconIgnite'); Audio.sting('beacon'); }],
    // the lantern on the planted staff goes out quietly, as if falling asleep
    [3.2, () => { const s = T?.staff; if (s) { s.userData.setLantern?.('gold'); later(1.4, () => { s.userData.setLantern?.('dark'); puff(s.position.x + 0.24, 1.8, s.position.z, 5, 0x8a8478, 0.4, 0.3, 1.6); }); } }],
    [4.6, () => { if (G.cine) Object.assign(G.cine, { x: b.x, z: b.z - 16, pitch: 0.34 }); }]
  ];
  // the far fires answer one by one, lit by hands; the fourth, far to the north, no one we know lit
  const ANS = [[0, 'd.answer.1'], [1, 'd.answer.2'], [2, 'd.answer.3'], [3, 'd.answer.4']];
  ANS.forEach(([i, key], k) => steps.push([6 + k * 2.2, () => { setFar(z, i, true); emit('say', key); Audio.mood({ answer: k + 1 }); if (i === 2 && G.hero.cls === 'ranger') later(1.1, () => emit('say', 'd.elati.home.r')); }]));
  emit('cine', { x: b.x, z: b.z + 6, dur: 6 + ANS.length * 2.2 + 2.6, zoom: 1.5, steps, end: () => { townFires(z); actComplete(4); } });
}

export { setQuest };
