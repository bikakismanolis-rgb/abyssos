// Quests, conversations and the moments between fights.
import * as THREE from 'three';
import { G, later } from './state.js';
import { on, emit } from '../ui/bus.js';
import { t, has } from '../i18n/i18n.js';
import { R, addLight, shake } from '../gfx/gfx.js';
import { glowBurst, ring, P, setEmitters, explosion } from '../gfx/fx.js';
import { dropShard } from './pickups.js';
import { writeSave } from './save.js';
import Audio from '../audio/audio.js';
import { grantBuff } from './stats.js';
import { spawnMonster } from './actors.js';
import { act3Prop } from '../world/build.js';
import { openDeepGate, FAR_BEACONS, farFire, openRootGate, witherWall, firstAutumn, growProp } from './world.js';

// Act III's counters: the three verses of the Long Sorrow, the three thorn walls of the Heartwood
const STORY_TEARS = ['planting', 'sorrow', 'breaking'];
const tearsSeen = () => STORY_TEARS.filter((id) => G.hero.flags['tear_' + id]).length;
const wallsDown = () => [0, 1, 2].filter((i) => G.hero.flags['thorn' + i]).length;
export function questText() {
  const q = Math.min(G.hero.quest, 16);
  if (q === 12) return t('q.12', tearsSeen());
  if (q === 14) { const n = wallsDown(); return n >= 3 ? t('q.14b') : t('q.14', n); }
  return t('q.' + q);
}
function setQuest(n, quiet) {
  if (G.hero.quest >= n) return;
  G.hero.quest = n;
  if (!quiet) { emit('toast', t('q.new') + ': ' + questText(), 'quest'); Audio.sting('quest'); }
  emit('quest');
  writeSave();
}
export function npcHasNews(kind) {
  const q = G.hero.quest, F = G.hero.flags;
  return (kind === 'wayfarer' && (q === 0 || q === 4 || q === 5 || q === 9 || q === 10 || q === 15 || (q === 16 && !F.after3)))
    || (kind === 'brokka' && q <= 7)
    || (kind === 'elati' && (q === 11 || (G.zone?.id === 'heart' && !F.elatiHeart) || (F.autumn && !F.elatiAutumn)))
    || (kind === 'linden' && q === 12 && !F.metLinden);
}
// the Evergreen know one of their own: a ranger hears the kin variant of a line where there is one
const rl = (k) => (G.hero?.cls === 'ranger' && has(k + '.r') ? k + '.r' : k);
const rls = (list) => list.map((l) => (Array.isArray(l) ? [rl(l[0]), l[1]] : rl(l)));
const say = (k) => emit('say', rl(k));
const heal = () => { G.player.potionCd = 0; G.player.hp = G.player.hpMax; };

on('talk', (kind, actor) => {
  const q = G.hero.quest, F = G.hero.flags;
  if (kind === 'wayfarer') {
    if (q === 0) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.1', 'd.isarn.2', 'd.isarn.3', 'd.isarn.4', 'd.isarn.5'], end: () => setQuest(1) });
    else if (q === 4) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.r1', 'd.isarn.r2'], end: () => beaconScene() });
    else if (q === 5) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.a1', 'd.isarn.a2', 'd.isarn.a3', 'd.isarn.a4'], end: () => { G.hero.flags.act1 = true; setQuest(6); } });
    else if (q >= 6 && q <= 8) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.a2wait'] });
    else if (q === 9) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.b1', 'd.isarn.b2'], end: () => beaconScene(2) });
    // Act III: west, to the Weeping Woods; then the third shard on the beacon, and what Isarn has not told
    else if (q === 10) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.c1', 'd.isarn.c2', 'd.isarn.c3'], end: () => setQuest(11) });
    else if (q >= 11 && q <= 14) emit('dialog', { who: 'wayfarer', lines: [q === 14 ? 'd.isarn.c5' : 'd.isarn.c4'], end: () => emit('openPanel', 'gates') });
    else if (q === 15) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.d1', 'd.isarn.d2'], end: () => beaconScene(3) });
    else if (q >= 16 && !F.after3) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.after3'], end: () => { F.after3 = true; emit('openPanel', 'gates'); } });
    else if (q >= 10) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.after'], end: () => emit('openPanel', 'gates') });
    else emit('dialog', { who: 'wayfarer', lines: ['d.isarn.wait'] });
  } else if (kind === 'smith') {
    emit('dialog', { who: 'smith', lines: [G.hero.flags.metSmith ? 'd.halda.2' : 'd.halda.1'], end: () => { G.hero.flags.metSmith = true; emit('openPanel', 'smith'); } });
  } else if (kind === 'healer') {
    heal();
    emit('dialog', { who: 'healer', lines: [G.hero.flags.metHealer ? 'd.elianthe.2' : 'd.elianthe.1'], end: () => { G.hero.flags.metHealer = true; emit('openPanel', 'vendor'); } });
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
    if (G.zone?.id === 'heart') {
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
  if (id !== 'town' && id !== 'gate' && !G.hero.wps.includes(id)) { G.hero.wps.push(id); emit('toast', t('hud.discovered')); }
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
});
on('voice', (key) => say(key));

on('kill', (a) => {
  // an echo fades back into the amber it came from: the fight is real, the story is not touched
  if (a.echo) {
    G.bossActor = null;
    emit('bossDown', a);
    later(1.2, () => { if (G.zone?.actors.includes(a)) { glowBurst(a.x, 1.2, a.z, 0xffc060, 40, 3, 0.3, 1); ring(a.x, a.z, 3, 0xffc060, 0.7); } });
    later(2.2, () => emit('toast', t('echo.done'), 'quest'));
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
  if (G.gate && G.zone.id === 'gate') emit('gateKill', a);
});
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
  const k = it.boss, pl = G.player, away = Math.atan2(it.x - pl.x, it.z - pl.z), d = k === 'silverhorn' ? 8 : 5;
  const s = z.map.nearestFloor(it.x + Math.sin(away) * d, it.z + Math.cos(away) * d, 4);
  Audio.sting('memory');
  glowBurst(it.x, 1.7, it.z, 0xffc060, 40, 3, 0.3, 1); ring(it.x, it.z, 3, 0xffc060, 0.8);
  emit('toast', t('echo.rise'), 'quest');
  later(1.4, () => {
    if (G.zone !== z) { it.used = false; return; }
    glowBurst(s.x, 1.5, s.z, 0xffc060, 50, 4, 0.35, 1); ring(s.x, s.z, 5, 0xffd080, 1); shake(0.3);
    const b = spawnMonster(k, s.x, s.z, { level: Math.max(z.level + (k === 'silverhorn' ? 2 : 3), G.hero.level + 1) });
    b.echo = true; b.rot = Math.atan2(G.player.x - b.x, G.player.z - b.z);
    b.baseTint = 0xffc870; b.baseTintAmt = 0.4; b.avatar?.setTint(b.baseTint, b.baseTintAmt); b.avatar?.setRim?.(0xffd070, 1.4);
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
function beaconScene(act = 1) {
  const L = G.zone.L, b = L.beacon, F = FAR_BEACONS[act - 1], S = BEACON[act], col = F.color ?? 0xff8a30;
  const far = { x: b.x + F.dx, y: F.y, z: b.z + F.dz };
  const steps = [
    [0.5, () => { Audio.sfx('beaconIgnite'); Audio.sting('beacon'); }],
    [1.2, () => { explosion(b.x, b.z, 3, 0xffa040, { smoke: 0x3a3028, shake: 0.6 }); for (let i = 0; i < 80; i++) P({ x: b.x, y: 9, z: b.z, vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 8, vz: (Math.random() - 0.5) * 6, life: 2.5, size: 0.25, size1: 0.02, color: 0xffd080, color1: 0xff4000, drag: 0.6 }); addLight({ x: b.x, y: 10, z: b.z, color: 0xffa040, intensity: 160, range: 40, life: 3, fade: 3 }); }],
    [S.sayAt, () => { emit('say', S.say); }],
    [S.at, () => { const light = { x: far.x, y: far.y, z: far.z, color: col, intensity: 200, range: 60, flicker: 0.3 }; L.lights.push(light); addLight(light); const spr = farFire(far, F.color); G.zone.extra.push(spr); R.scene.add(spr); G.zone.emit = (G.zone.emit || []).concat([{ x: far.x, y: far.y - 2, z: far.z, type: 'beacon', s: 1.2 }]); setEmitters(G.zone.lvl.emitters.concat(G.zone.emit)); if (act === 3) Audio.sting('memory'); }]
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
  for (const act of [1, 2, 3]) {
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
  else { h.act3 = Math.max(h.act3 ?? -1, h.diff); h.quest = 16; h.flags.act3 = true; }
  G.flags.actDone = act;
  emit('quest');
  writeSave();
  Audio.music('victory');
  emit('openPanel', 'act');
}
export { setQuest };
