// Cloud saves, the game's side: which cloud this page has (the claude.ai artifact's db, the web build's Supabase, or
// none), when to sync (game/cloudsync.js does the sync itself), and what the settings show (CLOUD, ui/cloudui.js).
// docs/cloudsave/README.md.
//
// When: once the page is up (the title), and then only when something stored changed: a hero played (its autosave)
// goes up at most every PUSH s while it is played, and on leaving a zone at most every NUDGE s; other devices' changes
// are heard every POLL s, when the page comes back to view after a while, and from Settings (Sync now). As the page is
// hidden or closed, the hero it plays goes up on its own if it changed (best effort). One page of the browser syncs at
// a time (a Web Lock); a page that finds another syncing leaves it to that one.
import { G } from './state.js';
import { storedHeroes, playingId, putStored, dropStored, cloudMeta, setCloudMeta, backupHero, saveHooks } from './save.js';
import { syncAll, pushOne, dirty } from './cloudsync.js';
import { artifactBackend } from '../net/cloudart.js';
import { supabaseBackend } from '../net/cloudsb.js';
import { SUPABASE } from '../net/netcfg.js';
import { emit, on } from '../ui/bus.js';
import { t } from '../i18n/i18n.js';

const PUSH = 120, NUDGE = 20, POLL = 600, AWAY = 60;
// state: 'off' (no cloud in this build), 'starting', 'on', 'unavailable' (this view cannot: signed out, view-only, an
// older viewer, the project down), 'error' (the last sync failed: why in err; nothing local changed)
export const CLOUD = { kind: null, state: 'off', why: null, last: 0, err: null, busy: false, notes: [], code: null };
const store = { heroes: storedHeroes, current: playingId, put: putStored, drop: dropStored, meta: cloudMeta, setMeta: setCloudMeta, backup: backupHero };
let B = null, running = null, lastTry = 0, hiddenAt = 0, SB = SUPABASE;
const now = () => Date.now();
const tell = () => emit('cloud', CLOUD);

// the page's cloud: the artifact's db in claude.ai, Supabase in a web build that has it, none elsewhere. A web build
// signs in only once there is a hero to keep (a visitor who never plays makes no user)
export async function initCloud(q) {
  if (q?.get?.('cloud') === 'off') return;
  saveHooks.written = written; saveHooks.changed = changed;
  // (?cloud=fake: a test's stand-in for the web build's Supabase, window.__cloudFake: tools/scenario.mjs cloudweb)
  if (q?.get?.('cloud') === 'fake' && window.__cloudFake) SB = window.__cloudFake;
  const inClaude = SB === SUPABASE && typeof window !== 'undefined' && !!window.claude?.use;
  if (inClaude) { CLOUD.kind = 'artifact'; await start(() => artifactBackend(window.claude)); return; }
  if (SB.url && SB.anonKey && SB.createClient) {
    CLOUD.kind = 'supabase';
    if (storedHeroes().length || codeKept()) await start(() => supabaseBackend(SB));
    else { CLOUD.state = 'idle'; tell(); }
  }
}
const codeKept = () => { try { return !!localStorage.getItem('skotos.cloud.code'); } catch (e) { return false; } };
async function start(make) {
  CLOUD.state = 'starting'; tell();
  try { B = await make(); } catch (e) { B = null; CLOUD.why = e?.code || 'unavailable'; }
  if (!B) { CLOUD.state = 'unavailable'; CLOUD.why ||= CLOUD.kind === 'artifact' ? 'no_db' : 'unavailable'; tell(); return false; }
  CLOUD.state = 'on'; CLOUD.why = null; CLOUD.code = B.code?.() || null; CLOUD.last = cloudMeta().who === B.who ? (cloudMeta().last || 0) : 0;
  tell();
  await syncNow('start');
  return true;
}

// one sync, unless one is on its way here or in another page of this browser
export function syncNow(why = 'manual') {
  if (!B) {
    // (a web build not signed in yet: the first hero kept signs it in)
    if (CLOUD.kind === 'supabase' && CLOUD.state === 'idle' && storedHeroes().length) { CLOUD.state = 'starting'; return start(() => supabaseBackend(SB)); }
    return Promise.resolve(null);
  }
  if (running) return running;
  lastTry = now(); CLOUD.busy = true; tell();
  const run = async () => {
    const r = await syncAll(B, store);
    CLOUD.busy = false;
    if (r.ok) { CLOUD.last = now(); CLOUD.err = r.errors.length ? r.errors[0].code : null; CLOUD.state = 'on'; }
    else { CLOUD.err = r.code; if (r.code === 'revoked') CLOUD.state = 'unavailable'; }
    if (r.code === 'read_only' || r.errors.some((e) => e.code === 'read_only')) { CLOUD.state = 'unavailable'; CLOUD.why = 'read_only'; }
    for (const id of r.replaced) CLOUD.notes.push({ id, at: now() });
    if (r.pulled.length || r.dropped.length) emit('cloudHeroes', r);
    if (r.replaced.length) emit('toast', t('cloud.replaced'), 'quest');
    tell();
    return r;
  };
  const locks = typeof navigator !== 'undefined' && navigator.locks;
  running = (locks ? locks.request('skotos-cloud', { ifAvailable: true }, (lk) => (lk ? run() : null)) : run())
    .catch((e) => { CLOUD.busy = false; CLOUD.err = e?.code || 'unavailable'; tell(); return null; })
    .finally(() => { running = null; });
  return running;
}
const due = (s) => now() - Math.max(CLOUD.last, lastTry) > s * 1000;
// (every save the page writes: a sync if something changed and it is time, or if other devices have not been heard for long)
function written() {
  if (!B) {
    if (CLOUD.state === 'idle' && G.hero) syncNow('first');
    // (a web build that could not sign in or reach the project: tried again now and then)
    else if (CLOUD.kind === 'supabase' && CLOUD.state === 'unavailable' && due(300)) { lastTry = now(); start(() => supabaseBackend(SB)); }
    return;
  }
  if (CLOUD.state !== 'on') return;
  if ((due(PUSH) && dirty(store, B.who)) || due(POLL)) syncNow('auto');
}
on('travel', () => { if (B && due(NUDGE) && dirty(store, B.who)) setTimeout(() => syncNow('zone'), 1500); });
// a hero deleted, a backup taken back: told at once
function changed() { if (B) setTimeout(() => syncNow('change'), 200); else syncNow('first'); }
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = now(); flush(); } else if (B && now() - hiddenAt > AWAY * 1000) syncNow('back');
  });
  window.addEventListener('pagehide', flush);
}
// the hero this page plays, up as the page goes (no list first; refused if the cloud changed meanwhile)
function flush() { const id = playingId(); if (B && id && !running) pushOne(B, store, id).then((ok) => { if (ok) { CLOUD.last = now(); tell(); } }, () => {}); }

// another device's save code (the web build): this browser's heroes and that player's, both ways from now on
export async function claimCode(code) {
  if (CLOUD.kind !== 'supabase') return { ok: false, code: 'off' };
  try {
    if (!B) B = await supabaseBackend(SB, { claim: code }); else await B.claim(code);
    CLOUD.state = 'on'; CLOUD.why = null; CLOUD.err = null; CLOUD.code = B.code(); tell();
    await syncNow('claim');
    return { ok: true };
  } catch (e) { return { ok: false, code: e?.code || 'unavailable' }; }
}
export async function newCode() {
  if (!B?.newCode) return null;
  try { CLOUD.code = await B.newCode(); tell(); return CLOUD.code; } catch (e) { CLOUD.err = e?.code || 'unavailable'; tell(); return null; }
}
// (tests: the backend in use)
export const cloudBackend = () => B;
