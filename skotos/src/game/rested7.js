// Act VII: Rested («Ξεκούραστος»; docs/act7-contract.md, Rested T1-T5; the owner's call, built on its default). After the
// act, at the last level, a hero who has been away an hour or more comes back rested: one kill for every 4 minutes away,
// 120 at most (hero.rest; what was left is kept, to the same cap). While it lasts a kill's Mastery experience counts
// double and the count falls by one. No notification, no streak, no calendar, no timer on screen.
import { G } from './state.js';
import { MAX_LEVEL } from './data.js';
import { emit, on } from '../ui/bus.js';
import { t } from '../i18n/i18n.js';

export const REST = { hour: 3600e3, per: 240e3, cap: 120 };
// on taking a hero up (boot.js startHero), before anything stamps hero.played: the kills earned by the time away
// (a clock set back gives none). Returns the kills added
export function restOnTakeUp(hero, now = Date.now()) {
  if (!hero?.flags?.act7 || (hero.level | 0) < MAX_LEVEL) return 0;
  const away = typeof hero.played === 'number' && isFinite(hero.played) ? now - hero.played : 0;
  const was = Math.max(0, Math.min(REST.cap, hero.rest | 0));
  if (!(away >= REST.hour)) { hero.rest = was; return 0; }
  hero.rest = Math.min(REST.cap, was + Math.floor(away / REST.per));
  if (hero.rest > was) hero.restNew = true;
  return hero.rest - was;
}
// a kill's Mastery experience (combat.js gainXP, a kill's own): doubled while rested, the count down by one
export function restKill(v) {
  const h = G.hero, own = h?.__real || h;
  if (!own || !(own.rest > 0) || (h.level | 0) < MAX_LEVEL) return v;
  own.rest--; if (!own.rest) { delete own.rest; emit('rested', 0); }
  return v * 2;
}
// the first village entry with a count: the child's greeting, then the count
on('zoneEnter', (id) => {
  const h = G.hero; if (id !== 'town' || !h?.restNew) return;
  delete h.restNew;
  setTimeout(() => { emit('say', 'd.child7.wake'); emit('toast', t('q.rested', h.rest | 0), 'quest'); }, 2200);
});
