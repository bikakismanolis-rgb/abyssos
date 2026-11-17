// Act VII: the lookouts' holds, the Seven Fires and the Call's hearths (docs/act7-contract.md, The Seven Fires F1-F10,
// The Call C1-C7). A lookout's hearth is lit (bus 'lookHearth', the world's interact), held for HAZ7.hold seconds within
// 12 m while its packs come, and then burns for this visit: the Call is made at it. The rank is the highest difficulty
// on which this hero held that lookout (hero.fires[0..5], 1 Wanderer ... 6 Skotos); fires[6], Arna's hill, is the lowest
// of the six. Each rank of each fire is +0.5% damage and +0.5% life (stats.js). The ladder never gates the story.
import { G } from './state.js';
import { actHaz } from './data.js';
import { emit, on } from '../ui/bus.js';
import { t } from '../i18n/i18n.js';
import Audio from '../audio/audio.js';
import { NET } from '../net/state.js';
import { spawnPack7 } from './world.js';
import { refreshStats } from './stats.js';
import { writeSave } from './save.js';
import { N7call, N7rt, N7WHY, N7callVisit, N7callFlare } from './names7.js';
import { teleCircle } from '../gfx/fx.js';

export const HOLD = { ring: 12, out: 6, again: 20, waves: [4, 30, 55], terrain: 20 };
// the seven ranks as kept, a hero from before the act has none
export const fires7 = (h = G.hero) => { const f = Array.isArray(h?.fires) ? h.fires : []; const six = [0, 1, 2, 3, 4, 5].map((i) => f[i] | 0); return [...six, Math.min(...six)]; };
// the ladder's bonus (%): half a point a rank a fire, 21 at most
export const firesPct = (h = G.hero) => Math.min(21, fires7(h).reduce((a, b) => a + b, 0) * 0.5);
export const firesAll = (h = G.hero) => fires7(h).slice(0, 6).every((r) => r > 0);
// the lookout's number 1-6 (the Meltwaters' three, then the Hanging Lake's)
const num = (z, it) => (z.id === 'tarn' ? 3 : 0) + it.k;
const held = (z, it) => !!G.hero.flags['look' + num(z, it)];

// on every entry: a lookout held before by this hero burns (the Call may be made at it); the others wait to be lit
export function firesEnter(z) {
  const A = z?.act7; if (!A) return;
  z.hold = null;
  for (const it of A.lookouts) setHearth(z, it, held(z, it) ? 'lit' : 'cold');
  if (A.hearth) setHearth(z, A.hearth, 'lit');
  const pl = G.player; if (pl) N7callVisit((pl.n7 ||= N7rt()).call);
}
function setHearth(z, it, st) {
  it.st = st;
  it.kind = st === 'lit' ? 'callFire' : 'lookHearth';
  it.prompt = st === 'lit' ? 'call.prompt' : 'look.light';
  it.used = st === 'hold' || (st === 'wait');
  // (a guest's touch on a cold hearth goes to the host, net/coop.js; the Call is each page's own)
  it.use = () => { if (it.kind === 'callFire' || !NET.h.useOp?.(it)) emit(it.kind, it, z); };
  it.mesh?.userData.setLit?.(st !== 'cold' && st !== 'wait');
  emit('hearth7', it, st);
}
// on a guest's page as the host's flags come (net/coop.js presenceAgain): a lookout held on the host burns here too
export function firesSync(z) { const A = z?.act7; if (!A) return; for (const it of A.lookouts) if (held(z, it) && it.st !== 'lit') setHearth(z, it, 'lit'); }
// lit: the hold begins (the host's; a guest's touch goes through the host)
on('lookHearth', (it, z) => {
  if (!z?.act7 || z.hold || it.st !== 'cold' || G.hero.__real) return;
  const H = actHaz(7, G.hero.diff);
  z.hold = { it, t: 0, out: 0, need: H.hold, wave: 0, terrain: false, packs: H.holdPacks };
  setHearth(z, it, 'hold');
  Audio.sfx('hearthCatch', { x: it.x, z: it.z }); Audio.mood({ hearth: 1 });
  emit('toast', t('look.hold', Math.ceil(H.hold)), 'quest'); emit('holdStart', it, z);
});
// per frame (world.js act7Tick): the clock, the ring, the waves, the terrain's one thing at 20 s
export function firesTick(z, dt) {
  const Hd = z?.hold; if (!Hd) { if (z?.holdWait > 0) { z.holdWait -= dt; if (z.holdWait <= 0) for (const it of z.act7.lookouts) if (it.st === 'wait') setHearth(z, it, 'cold'); } return; }
  const it = Hd.it, pl = G.player; if (!pl) return;
  Hd.t += dt;
  const inRing = !pl.dead && Math.hypot(pl.x - it.x, pl.z - it.z) <= HOLD.ring;
  if (!inRing) Hd.out += dt;
  if (Hd.out >= HOLD.out) { z.hold = null; setHearth(z, it, 'wait'); z.holdWait = HOLD.again; Audio.mood({ hearth: 0 }); emit('toast', t('look.lost')); emit('holdLost', it, z); return; }
  // the waves: the lookout's certain pack, then one more (not on Wanderer), then a third on Ash and Skotos
  const lo = it.spot || {}, P = lo.pack || { tag: 'looters', elite: 'champion' };
  while (Hd.wave < Math.min(Hd.packs, HOLD.waves.length) && Hd.t >= HOLD.waves[Hd.wave]) {
    const ap = (lo.approach && lo.approach[Hd.wave % lo.approach.length]) || { x: it.x + 7, z: it.z + 3 };
    const p = z.map.nearestFloor(ap.x, ap.z, 4) || ap;
    const rare = Hd.wave === 0 ? P.elite : Hd.wave === 1 && G.hero.diff >= 3 ? 'rare' : null;
    if (NET.mode !== 'guest') spawnPack7(z, { x: p.x, z: p.z, n: P.n || 5, tag: P.tag, elite: rare, hold: true });
    Hd.wave++;
  }
  if (!Hd.terrain && Hd.t >= HOLD.terrain) { Hd.terrain = true; emit('holdTerrain', it, z, lo); }
  // (the count on the quest line: the HUD reads z.hold)
  if (Math.floor(Hd.t) !== Math.floor(Hd.t - dt)) emit('holdTick', Math.max(0, Math.ceil(Hd.need - Hd.t)));
  if (Hd.t >= Hd.need) holdDone(z, Hd);
}
function holdDone(z, Hd) {
  const it = Hd.it, n = num(z, it), h = G.hero, own = h.__real || h, rank = (h.diff | 0) + 1;
  z.hold = null;
  h.flags['look' + n] = true;
  setHearth(z, it, 'lit');
  // the rank on this hero's own record (each hero present writes her own: co-op's event, stage D)
  const f = (own.fires ||= [0, 0, 0, 0, 0, 0]); const before = f[n - 1] | 0, all0 = firesAll(own);
  if (rank > before) f[n - 1] = rank;
  Audio.sfx('callHorn', { x: it.x, z: it.z }); Audio.mood({ hearth: 0 });
  emit('toast', t('look.held', n + '/6'), 'big');
  emit('toast', t('look.rank', fires7(own).filter((r) => r > 0).length, f[n - 1]), 'quest');
  if (rank > before) emit('fireRank', n, rank, before, it, z);
  if (!all0 && firesAll(own)) { h.flags.firesAll = true; emit('toast', t('fires.all'), 'big'); }
  refreshStats(); emit('quest'); writeSave(); emit('holdHeld', it, z, n, rank); emit('hold7Done', n, h.diff | 0);
}
// the arena hearth flares once in each fight: Kallisto's last phase, the first time Kelados goes to his knees. A horn, a
// blue circle round the hearth, call.again: one more Call there, whoever called before (at most two a fight)
function flare(z) {
  const it = z?.act7?.hearth, pl = G.player; if (!it || z.flared7) return;
  z.flared7 = true;
  if (pl) N7callFlare((pl.n7 ||= N7rt()).call, z.id + ':arena', { waive: true });
  it.mesh?.userData.flare?.(); teleCircle(it.x, it.z, 2.6, 6, 0x60c0ff);
  Audio.sfx('callHorn', { x: it.x, z: it.z }); emit('toast', t('call.again'), 'quest');
}
on('boss7Phase', (kind, ph) => { if (kind === 'kallisto' && ph === 3) flare(G.zone); });
on('boss7Window', (kind) => { if (kind === 'kelados') flare(G.zone); });
on('bossIntro', (a) => { if (G.zone?.act7 && (a?.kind === 'kallisto' || a?.kind === 'kelados')) G.zone.flared7 = false; });
// the Call at a burning hearth: each hero's own, as a shrine is
on('callFire', (it, z) => {
  const pl = G.player; if (!pl || pl.dead || it.st !== 'lit') return;
  const st = (pl.n7 ||= N7rt()).call, id = (z.id || '') + ':' + (it.k ?? 'arena');
  const r = N7call(st, G.time, id, G.hero);
  if (!r.ok) { const k = N7WHY[r.why]; if (k) emit('toast', t(k, Math.ceil(r.wait || 0))); Audio.sfx('denied', { vol: 0.5 }); return; }
  pl.buffs.call = r.dur; if (r.flaskReady) pl.potionCd = 0;
  Audio.sfx('callHorn', { x: it.x, z: it.z });
  emit('toast', t(r.none ? 'call.none' : 'call.on'), 'quest'); emit('called', it, z);
});
