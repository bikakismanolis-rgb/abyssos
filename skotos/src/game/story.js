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

export function questText() { return t('q.' + Math.min(G.hero.quest, 5)); }
function setQuest(n, quiet) {
  if (G.hero.quest >= n) return;
  G.hero.quest = n;
  if (!quiet) { emit('toast', t('q.new') + ': ' + questText(), 'quest'); Audio.sting('quest'); }
  emit('quest');
  writeSave();
}
export function npcHasNews(kind) {
  const q = G.hero.quest;
  return kind === 'wayfarer' && (q === 0 || q === 4);
}

on('talk', (kind, actor) => {
  const q = G.hero.quest;
  if (kind === 'wayfarer') {
    if (q === 0) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.1', 'd.isarn.2', 'd.isarn.3', 'd.isarn.4', 'd.isarn.5'], end: () => setQuest(1) });
    else if (q === 4) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.r1', 'd.isarn.r2'], end: () => beaconScene() });
    else if (q >= 5) emit('dialog', { who: 'wayfarer', lines: ['d.isarn.after'], end: () => emit('openPanel', 'gates') });
    else emit('dialog', { who: 'wayfarer', lines: ['d.isarn.wait'] });
  } else if (kind === 'smith') {
    emit('dialog', { who: 'smith', lines: [G.hero.flags.metSmith ? 'd.halda.2' : 'd.halda.1'], end: () => { G.hero.flags.metSmith = true; emit('openPanel', 'smith'); } });
  } else if (kind === 'healer') {
    G.player.potionCd = 0; G.player.hp = G.player.hpMax;
    emit('dialog', { who: 'healer', lines: [G.hero.flags.metHealer ? 'd.elianthe.2' : 'd.elianthe.1'], end: () => { G.hero.flags.metHealer = true; emit('openPanel', 'vendor'); } });
  } else if (kind === 'villager') {
    emit('dialog', { who: 'villager', lines: ['d.v.' + ((actor.bark || 0) % 4 + 1)] });
  }
});

on('zoneEnter', (id) => {
  if (id === 'forest' && G.hero.quest < 1) setQuest(1, true);
  if (id === 'crypt' && G.hero.quest < 3 && G.hero.flags.weaver) setQuest(3);
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
  if (G.gate && G.zone.id === 'gate') emit('gateKill', a);
});
on('shard', () => {
  emit('toast', t('q.shard'), 'quest');
  setQuest(4);
});

// the beacon flares when the shard is fed to it
function beaconScene() {
  const L = G.zone.L, b = L.beacon;
  emit('cine', {
    x: b.x, z: b.z + 6, dur: 9, zoom: 1.5,
    steps: [
      [0.5, () => { Audio.sfx('beaconIgnite'); Audio.sting('beacon'); }],
      [1.2, () => { explosion(b.x, b.z, 3, 0xffa040, { smoke: 0x3a3028, shake: 0.6 }); for (let i = 0; i < 80; i++) P({ x: b.x, y: 9, z: b.z, vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 8, vz: (Math.random() - 0.5) * 6, life: 2.5, size: 0.25, size1: 0.02, color: 0xffd080, color1: 0xff4000, drag: 0.6 }); addLight({ x: b.x, y: 10, z: b.z, color: 0xffa040, intensity: 160, range: 40, life: 3, fade: 3 }); }],
      [3.5, () => { emit('say', 'd.isarn.r3'); }],
      [4.0, () => { const far = { x: b.x - 40, y: 14, z: b.z - 60 }; G.flags.farBeacon = far; addLight({ x: far.x, y: far.y, z: far.z, color: 0xff8a30, intensity: 200, range: 60, flicker: 0.3 }); setEmitters(G.zone.lvl.emitters.concat(G.zone.emit || [], [{ x: far.x, y: far.y - 2, z: far.z, type: 'beacon', s: 1.2 }])); }]
    ],
    end: () => emit('dialog', { who: 'wayfarer', lines: ['d.isarn.r4', 'd.isarn.r5'], end: () => actComplete() })
  });
}
function actComplete() {
  const h = G.hero;
  h.act1 = Math.max(h.act1, h.diff);
  h.quest = 5;
  writeSave();
  Audio.music('victory');
  emit('openPanel', 'act');
}
export { setQuest };
