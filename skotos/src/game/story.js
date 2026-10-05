// Quests, conversations and the moments between fights.
import { G, later } from './state.js';
import { on, emit } from '../ui/bus.js';
import { t } from '../i18n/i18n.js';
import { R, addLight, shake } from '../gfx/gfx.js';
import { glowBurst, ring, P, sparks, setEmitters, explosion } from '../gfx/fx.js';
import { dropShard } from './pickups.js';
import { writeSave } from './save.js';
import Audio from '../audio/audio.js';
import { DIFFS } from './data.js';
import { spawnMonster } from './actors.js';
import { openDeepGate, FAR_BEACONS, farFire } from './world.js';

export function questText() { return t('q.' + Math.min(G.hero.quest, 10)); }
function setQuest(n, quiet) {
  if (G.hero.quest >= n) return;
  G.hero.quest = n;
  if (!quiet) { emit('toast', t('q.new') + ': ' + questText(), 'quest'); Audio.sting('quest'); }
  emit('quest');
  writeSave();
}
export function npcHasNews(kind) {
  const q = G.hero.quest;
  return (kind === 'wayfarer' && (q === 0 || q === 4 || q === 5 || q === 9)) || (kind === 'brokka' && q <= 7);
}

on('talk', (kind, actor) => {
  const q = G.hero.quest;
  if (kind === 'wayfarer') {
    if (q === 0) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.1', 'd.isarn.2', 'd.isarn.3', 'd.isarn.4', 'd.isarn.5'], end: () => setQuest(1) });
    else if (q === 4) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.r1', 'd.isarn.r2'], end: () => beaconScene() });
    else if (q === 5) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.a1', 'd.isarn.a2', 'd.isarn.a3', 'd.isarn.a4'], end: () => { G.hero.flags.act1 = true; setQuest(6); } });
    else if (q >= 6 && q <= 8) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.a2wait'] });
    else if (q === 9) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.b1', 'd.isarn.b2'], end: () => beaconScene(2) });
    else if (q >= 10) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.after'], end: () => emit('openPanel', 'gates') });
    else emit('dialog', { who: 'wayfarer', lines: ['d.isarn.wait'] });
  } else if (kind === 'smith') {
    emit('dialog', { who: 'smith', lines: [G.hero.flags.metSmith ? 'd.halda.2' : 'd.halda.1'], end: () => { G.hero.flags.metSmith = true; emit('openPanel', 'smith'); } });
  } else if (kind === 'healer') {
    G.player.potionCd = 0; G.player.hp = G.player.hpMax;
    emit('dialog', { who: 'healer', lines: [G.hero.flags.metHealer ? 'd.elianthe.2' : 'd.elianthe.1'], end: () => { G.hero.flags.metHealer = true; emit('openPanel', 'vendor'); } });
  } else if (kind === 'brokka') {
    // the last smith of the third gallery: news, a hot meal and her stores
    G.player.potionCd = 0; G.player.hp = G.player.hpMax;
    const first = q <= 7;
    const lines = first ? ['d.brokka.1', 'd.brokka.2', 'd.brokka.3', 'd.brokka.4'] : q >= 9 ? ['d.brokka.after'] : ['d.brokka.again'];
    emit('dialog', { who: 'brokka', lines, end: () => { if (first) setQuest(8); else emit('openPanel', 'vendor'); } });
  } else if (kind === 'villager') {
    emit('dialog', { who: 'villager', lines: ['d.v.' + ((actor.bark || 0) % 4 + 1)] });
  }
});

on('zoneEnter', (id) => {
  if (id === 'forest' && G.hero.quest < 1) setQuest(1, true);
  if (id === 'crypt' && G.hero.quest < 3 && G.hero.flags.weaver) setQuest(3);
  if (id === 'pass' && G.hero.quest >= 5 && G.hero.quest < 6) setQuest(6, true);
  if (id !== 'town' && id !== 'gate' && !G.hero.wps.includes(id)) { G.hero.wps.push(id); emit('toast', t('hud.discovered')); }
});

on('kill', (a) => {
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
  if (G.gate && G.zone.id === 'gate') emit('gateKill', a);
});
on('shard', () => {
  if (G.zone.id === 'halls') { emit('toast', t('q.shard2'), 'quest'); setQuest(9); return; }
  emit('toast', t('q.shard'), 'quest');
  setQuest(4);
});

// the beacon flares when a shard is fed to it, and another fire answers
function beaconScene(act = 1) {
  const L = G.zone.L, b = L.beacon, F = FAR_BEACONS[act - 1];
  const say = act === 1 ? 'd.isarn.r3' : 'd.isarn.b3', after = act === 1 ? ['d.isarn.r4', 'd.isarn.r5'] : ['d.isarn.b4', 'd.isarn.b5'];
  emit('cine', {
    x: b.x, z: b.z + 6, dur: 9, zoom: 1.5,
    steps: [
      [0.5, () => { Audio.sfx('beaconIgnite'); Audio.sting('beacon'); }],
      [1.2, () => { explosion(b.x, b.z, 3, 0xffa040, { smoke: 0x3a3028, shake: 0.6 }); for (let i = 0; i < 80; i++) P({ x: b.x, y: 9, z: b.z, vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 8, vz: (Math.random() - 0.5) * 6, life: 2.5, size: 0.25, size1: 0.02, color: 0xffd080, color1: 0xff4000, drag: 0.6 }); addLight({ x: b.x, y: 10, z: b.z, color: 0xffa040, intensity: 160, range: 40, life: 3, fade: 3 }); }],
      [3.5, () => { emit('say', say); }],
      [4.0, () => { const far = { x: b.x + F.dx, y: F.y, z: b.z + F.dz }, light = { x: far.x, y: far.y, z: far.z, color: 0xff8a30, intensity: 200, range: 60, flicker: 0.3 }; L.lights.push(light); addLight(light); const spr = farFire(far); G.zone.extra.push(spr); R.scene.add(spr); G.zone.emit = (G.zone.emit || []).concat([{ x: far.x, y: far.y - 2, z: far.z, type: 'beacon', s: 1.2 }]); setEmitters(G.zone.lvl.emitters.concat(G.zone.emit)); }]
    ],
    end: () => emit('dialog', { who: 'wayfarer', lines: after, end: () => actComplete(act) })
  });
}
// a beacon blessing for each act, chosen once (heroes from before the blessings get theirs on their next return)
export function offerBoons() {
  const h = G.hero; if (!h) return false;
  h.boons ||= [];
  // never over a cinematic or another panel: try again in a moment
  if (G.mode !== 'play' || G.panel) { later(2, offerBoons); return false; }
  for (const act of [1, 2]) {
    const done = act === 1 ? h.act1 >= 0 : (h.act2 ?? -1) >= 0;
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
});
function actComplete(act) {
  const h = G.hero;
  if (act === 1) { h.act1 = Math.max(h.act1, h.diff); h.quest = 5; h.flags.act1 = true; }
  else { h.act2 = Math.max(h.act2 ?? -1, h.diff); h.quest = 10; }
  G.flags.actDone = act;
  writeSave();
  Audio.music('victory');
  emit('openPanel', 'act');
}
export { setQuest };
