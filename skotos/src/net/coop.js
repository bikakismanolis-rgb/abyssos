// Co-op: two to four heroes in one world. The host's page simulates the world (monsters, their AI, projectiles, areas,
// bosses, the tide and the ice, the story, the loot rolls); each guest plays its own hero from its own save in it.
// - The lobby (the transport's lobby channel): a host shows { g: { c: code, ... } } in its presence; a game is the named
//   room 'skotos-<code>'. In the game room every page's presence is its hero (state, look, its events for the host);
//   the host also sends 's' snapshots (the monsters near the guests, its own hero, the tide, reliable events and the
//   fx it saw), 'w' the world (story flags, chunked), 'i' the ice; every page sends 'f', the look of its hero's skills.
// - Guests: their hero is local (moved, struck and hurt on their page, dodges and all); their blows on the host's
//   monsters go to the host as events, checked there (range, size, rate) before they land. The host's monsters strike a
//   guest's stand-in (NET.remotes): the blow is sent to the guest, whose own armour and dodge take it. Projectiles and
//   areas the monsters make are mirrored: a guest's copy can hurt only that guest.
// - Rewards (data.js COOP): each player gets their own (XP, gold, items rolled by the host for their class and their
//   magic find, a globe), dropped on their own page only. The story is the host's: a guest's quest, flags, waypoints and
//   difficulty are never written (G.hero on a guest is a view: the world's fields from the host, the rest its own).
// - Downed, not dead: an ally standing by revives (2.5 s); 30 s, or the button, and it is the checkpoint. A guest whose
//   host is gone goes home to its own town, its hero as it left it.
import { G, later } from '../game/state.js';
import { NET, MIRROR, heroes } from './state.js';
import { pickTransport, bytesOf, MAX_MSG, TERMINAL } from './transport.js';
import { SUPABASE } from './netcfg.js';
import { enterZone, zoneReady, disposeZone, act3Presence, act4Presence, act5Presence, townFires, storyOpenings, light5, ZONES } from '../game/world.js';
import { skerryClose } from '../game/ai.js';
import { spawnMonster, Actor, heroAvatar, freshStatus, frozenLook, restoreRim } from '../game/actors.js';
import { damage, gainXP, healHero } from '../game/combat.js';
import { MONSTERS, DIFFS, monsterXP, COOP, BASES, MAX_LEVEL, CLASSES, PACKS, PACK_LEAD } from '../game/data.js';
import { makeItem, cleanItem, MAX_ILVL } from '../game/items.js';
import { refreshStats } from '../game/stats.js';
import { dropGold, dropItem, dropGlobe, gatherPickups } from '../game/pickups.js';
import { fire, area } from '../game/projectiles.js';
import { addSapPool, addSapRing } from '../game/sap.js';
import { netIce, iceDigest, crackAt, crackLine, crackRing, refreezeAt } from '../game/ice.js';
import { LOOKS, VIS, VIS_FOLLOW } from '../game/skillsx.js';
import { MASTERY_BY, masteryValue } from '../game/progression.js';
import { writeSave } from '../game/save.js';
import * as FX from '../gfx/fx.js';
import { R } from '../gfx/gfx.js';
import Audio from '../audio/audio.js';
import { on, emit } from '../ui/bus.js';
import { t, has } from '../i18n/i18n.js';
import { clamp, rand } from '../core/util.js';

export const VER = 2;
const SNAP_HZ = 10, SNAP_MAX = 3900, REL_MAX = 1700, REL_Q = 200, FX_MAX = 900, FX_MIN = 500, FX_RATE = 600, NEAR = 40, NEAREST = 10, OVERDUE = 1000, CHUNK = 3300, HOST_LOST = 25000, HOST_GONE = 10000, STALL = 6000, DOWNED = 30, REVIVE = 2.5, LAG = 130, WAIT_MAX = 300000, NO_WORLD = 15000;
const CODE_CH = 'abcdefghjkmnpqrstuvwxyz23456789';
const KINDS = Object.keys(MONSTERS), KIDX = new Map(KINDS.map((k, i) => [k, i]));
// what a page sees of the session (the lobby panel and the HUD read it)
export const S = {
  T: null, ready: false, avail: false, role: null, code: null, ch: null, started: false, status: 'idle', err: null,
  // may this view send on the game's topics (true, false: it plays alone; null: not told yet; sure: the room's own
  // answer, not advice); the room's end for this page (a terminal code: the game plays on alone)
  send: null, sendSure: false, dead: null,
  hostPeer: null, peers: new Map(), roster: [], hosts: [], names: {}, me: null,
  // the host: each guest's reliable events (one count for all), their acks, the guests' events done, the raises given,
  // the clip names given out; the world and ice versions
  rel: new Map(), relSeq: 0, done: new Map(), rvT: new Map(), clips: new Map(), worldSent: '', worldT: 0, iceT: 0, iceKey: '', snapT: 0, lobbyT: 0, hostAt: [],
  // (the guest whose blow is landing, and the monster it strikes: the hit look it makes there is that guest's, shown on
  // its page already)
  landing: null, landingA: null,
  // a guest: the world as the host has it, the zone loaded, puppets (and what each was, for its kill's reward), the events
  // not yet acked, the host's clip names; the kills paid, the bosses paid, what each zone holds, the kills a second and
  // the items they may bring
  real: null, world: null, wkey: '', wgate: null, zoneKey: null, loading: false, pup: new Map(), pupInfo: new Map(), ev: [], evSeq: 0, relDone: 0, hclips: new Map(), lastSnap: 0, chunks: {},
  paid: new Set(), bossPaid: new Set(), purses: new Map(), killB: { tok: 40, t: 0 }, owed: 0,
  pulls: new Map(), pullT: 0, downed: null, rv: null, fxOut: [], fxT: 0, fxIn: new Map(), stats: { snaps: 0, snapBytes: 0, rejected: 0, hits: 0, why: {}, jumps: { enter: 0, rise: 0, refused: 0 } }
};
const now = () => performance.now();
const q = (v, k) => Math.round((+v || 0) * k);
const num = (v, lo, hi, d = 0) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);
const fin = (v) => typeof v === 'number' && isFinite(v);
// (a key a page sent, looked up only among a table's own entries: 'constructor' is no zone, class or base)
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

// ---------- start-up: is there anything to play with? ----------
export async function initNet(params) {
  try { S.T = await pickTransport(params, SUPABASE); } catch (e) { S.T = null; }
  S.avail = !!S.T; S.ready = true;
  // (what the tests drive: tools/coop.mjs)
  window.__NET = { S, NET, hostGame, joinGame, startGame, leaveGame, party, respawnNow, relTo };
  if (!S.T) { emit('netReady', false); return; }
  S.me = S.T.lobby?.me || S.T.me || null;
  // the room ended for this page (never granted, withdrawn, switched off): the game plays on alone and says why
  S.T.onDead?.(netDead);
  if (S.T.dead) netDead(S.T.dead);
  // (a moment the lobby refused: this view may not send on the game's topics)
  S.T.lobby?.onError?.((code, how) => { if (how === 'send' && code === 'not_permitted') { S.send = false; S.sendSure = true; emit('netLobby'); } });
  // who hosts what, from the lobby, and their names
  S.T.lobby?.onPeers(() => { lobbyHosts(); resolveNames(); });
  lobbyHosts();
  resolveNames();
  sendRights();
  emit('netReady', true);
}
// may this view host and join? Contributors and Editors may; Viewers and Commenters, whom the room admits but does not
// let send on the game's topics, play alone (questions.md 5). The user capability advises at once (canEdit(): Editor
// and up; can('data.write'): the interact level); the room's own answer is a moment on the lobby (no page listens to
// 'c' there), refused not_permitted for a view that may not send
async function sendRights() {
  userNs().then(async (u) => {
    if (!u) return;
    try { const v = (await u.canEdit?.()) === true ? true : await u.can?.('data.write'); if (!S.sendSure && (v === true || v === false)) { S.send = v; emit('netLobby'); } } catch (e) { /* advice only */ }
  });
  const L = S.T?.lobby; if (!L) return;
  // (an emit while not connected is dropped unheard: the lobby first)
  if (!L.connected()) await new Promise((res) => { const off = L.onConnection((v) => { if (v) { off?.(); res(); } }); });
  if (S.dead) return;
  if (await L.emit('c', { op: 'hi' })) { S.send = true; S.sendSure = true; emit('netLobby'); }
}
// the room's end for this page: a game in play is left (a guest goes home, a host plays on alone), the list let go, and
// the page is the single-player one from then on (no Co-op entry; the room's contract leaves saying why to the app)
function netDead(code) {
  if (S.dead) return;
  S.dead = code; S.send = false; S.sendSure = true; S.hosts = []; S.avail = false;
  if (S.role) leaveGame('coop.off');
  emit('netLobby'); emit('netMode'); emit('netReady', false);
}
function lobbyHosts() {
  const L = S.T?.lobby; if (!L) return;
  S.hosts = L.peers().filter((p) => !p.isMe && p.presence?.g && typeof p.presence.g.c === 'string' && /^[a-z0-9]{4}$/.test(p.presence.g.c)).map(listing).slice(0, 20);
  emit('netLobby');
}
// a listing: the fields a listing has, checked; who it is (the peer, the person) only as the room stamped them
function listing(p) {
  const g = p.presence.g;
  return { c: g.c, cls: own(CLASSES, g.cls) ? g.cls : 'warden', l: num(g.l, 0, MAX_LEVEL) | 0, z: own(ZONES, g.z) ? g.z : 'town', n: num(g.n, 1, 4, 1) | 0, d: num(g.d, 0, DIFFS.length - 1) | 0, v: g.v | 0, on: g.on ? 1 : 0, peer: p.peer, by: p.by ?? null };
}
// names through the artifact's `user` capability (profiles), where there is one; else the class and level. Asked as
// peers arrive, in the lobby (the hosts listed) as in the game, each id once (one not resolved is remembered as '')
let usersP = null;
const userNs = () => (usersP ||= Promise.resolve().then(() => window.claude?.use?.('user')).then((u) => u || null, () => null));
const naming = new Set();
async function resolveNames() {
  const ids = new Set(); for (const ch of [S.T?.lobby, S.ch]) for (const p of ch?.peers() || []) if (p.by && !(p.by in S.names) && !naming.has(p.by)) ids.add(p.by);
  if (!ids.size) return;
  for (const id of ids) naming.add(id);
  try {
    const u = await userNs(), ps = u?.profiles ? await u.profiles([...ids]) : null;
    for (const id of ids) S.names[id] = String(ps?.[id]?.name || '').slice(0, 24);
    if (ps) emit('netLobby');
  } catch (e) { for (const id of ids) S.names[id] = ''; } finally { for (const id of ids) naming.delete(id); }
}
export function nameOf(p) {
  const n = p?.by && S.names[p.by];
  if (n) return n;
  const lk = p?.lk || p?.presence?.lk || p?.look;
  return lk ? t('class.' + (own(CLASSES, lk.c) ? lk.c : 'warden')) + ' ' + (lk.l | 0) : '…';
}

// ---------- hosting, joining, leaving ----------
const newCode = () => Array.from({ length: 4 }, () => CODE_CH[(Math.random() * CODE_CH.length) | 0]).join('');
// (null: nothing done, a try already on its way or a game in play; false: it failed, S.err says why)
export async function hostGame() {
  if (!S.T || S.role || S.status === 'connecting' || !G.hero || !G.zone) return null;
  if (!canPlay()) { S.status = 'error'; S.err = S.dead || 'not_permitted'; emit('netLobby'); return false; }
  S.status = 'connecting'; S.err = null; emit('netLobby');
  const code = newCode();
  const ch = await roomOf('skotos-' + code); if (!ch) return false;
  if (S.role) { if (ch !== S.ch) ch.leave(); return null; }
  if (S.dead) return ended(ch);
  S.ch = ch; S.role = 'host'; S.code = code; S.started = false; S.status = 'open'; NET.mode = 'host';
  S.rel.clear(); S.relSeq = 0; S.done.clear(); S.rvT.clear(); S.clips.clear(); S.worldSent = '';
  wire(); hostPresence(true); lobbyPresence(true);
  emit('netLobby'); emit('netMode');
  return code;
}
export function startGame() { if (S.role !== 'host') return; S.started = true; hostPresence(true); lobbyPresence(true); emit('netLobby'); emit('toast', t('coop.started'), 'quest'); }
// (peer: the host picked from the list; only that peer is taken as this game's host)
export async function joinGame(code, peer) {
  code = String(code || '').toLowerCase().trim();
  if (!S.T || S.role || S.status === 'connecting' || !G.hero) return null;
  if (!/^[a-z0-9]{4}$/.test(code)) return false;
  if (!canPlay()) { S.status = 'error'; S.err = S.dead || 'not_permitted'; emit('netLobby'); return false; }
  peer = typeof peer === 'string' && peer ? peer : null;
  // (a game its listing shows full is said so at once: the listing picked, or the one listing of that code. By code, the
  // one peer the lobby lists for it is the host: another that hosts the same code in the room is not taken)
  const ls = S.hosts.filter((h) => h.c === code), L = peer ? ls.find((h) => h.peer === peer) : ls.length === 1 ? ls[0] : null;
  if (!peer && L) peer = L.peer;
  if (L && L.n >= 4) { S.status = 'error'; S.err = 'full'; emit('netLobby'); return false; }
  S.status = 'connecting'; S.err = null; emit('netLobby');
  const ch = await roomOf('skotos-' + code); if (!ch) return false;
  if (S.role) { if (ch !== S.ch) ch.leave(); return null; }
  if (S.dead) return ended(ch);
  S.ch = ch;
  S.role = 'guest'; S.code = code; S.status = 'waiting'; S.hostPeer = null; S.wantHost = peer; S.hostGone = 0; S.lastSnap = now(); S.joinT = now(); S.onT = 0;
  S.ev.length = 0; S.evSeq = 0; S.relDone = 0; S.hclips.clear(); S.world = null; S.wkey = ''; S.wgate = null; S.zoneKey = null; S.chunks = {};
  S.paid.clear(); S.bossPaid.clear(); S.pupInfo.clear(); S.purses.clear(); S.owed = 0; S.killB = { tok: 40, t: now() };
  wire(); guestPresence(true);
  emit('netLobby');
  return true;
}
// a game its view may host or join: the room is there, has not ended for this page, and lets it send
export const canPlay = () => !!S.T && !S.dead && S.send !== false;
// (a game's room that came after the page's room ended, while it was being joined: left, the try failed with the end's code)
function ended(ch) { try { ch.leave(); } catch (e) { /* gone */ } S.status = 'error'; S.err = S.dead; emit('netLobby'); return false; }
// the game's room joined (null: it failed, S.status and S.err say why; one the room refused for good is told)
async function roomOf(name) {
  try { return await S.T.join(name); } catch (e) {
    S.status = 'error'; S.err = e?.code || e?.message || 'upstream_error';
    // (not_permitted: this view cannot use the game's rooms; a terminal code: the room has ended for the page)
    if (S.err === 'not_permitted') { S.send = false; S.sendSure = true; }
    emit('netLobby'); return null;
  }
}
// (a guest that never came into the host's world has not left its own: told so, not that it is back)
const WAITING = { 'coop.youLeft': 'coop.leftWait', 'coop.hostLeft': 'coop.hostGone', 'coop.lost': 'coop.lostWait' };
export async function leaveGame(why) {
  const role = S.role; if (!role) return;
  // (down when the game ends: the card and the ring go; a guest gets up at home, a host as alone, by the death panel)
  const down = !!S.downed;
  if (down) emit('netDowned', false);
  if (S.rv) emit('netRevive', 0);
  const entered = role === 'guest' && (!!S.zoneKey || NET.mode === 'guest');
  if (role === 'guest' && !entered && WAITING[why]) why = WAITING[why];
  if (role === 'guest') goHome(entered);
  for (const r of NET.remotes) dropRemote(r);
  NET.remotes.length = 0;
  for (const [, a] of S.pup) killPuppet(a);
  S.pup.clear();
  // (the game is over for this page before anything is awaited: what the room says meanwhile is not this game's)
  const ch = S.ch; S.ch = null; S.role = null; S.code = null; S.started = false; S.status = 'idle'; S.hostPeer = null; S.peers.clear(); S.roster = []; S.downed = null; S.rv = null;
  NET.mode = null; NET.n = 1; MIRROR.rec = null;
  if (role === 'host') { rescale(); S.T?.lobby?.presence({ g: null }); if (down && G.player?.dead) emit('openPanel', 'dead'); }
  // (a host says so before it goes: its guests go home at once, not when the room notices)
  if (role === 'host' && ch) { try { await ch.emit('c', { op: 'end' }); } catch (e) { /* gone */ } }
  try { await ch?.leave(); } catch (e) { /* gone */ }
  emit('netLobby'); emit('netMode');
  if (why) emit('toast', t(why), 'quest');
}
// a guest back in its own world: its own hero record, its own town (the host's zones it held are dropped). One that
// never came into the host's world stays where it is, as it was (its zone, its own Shadow Gate)
function goHome(entered) {
  if (!entered) { if (S.real) { G.hero = S.real; S.real = null; refreshStats(); } NET.mode = null; writeSave(); return; }
  // (what fell for it in the host's zone comes home with it)
  carryLoot();
  if (S.real) { G.hero = S.real; S.real = null; }
  // (the host's Shadow Gate is not this page's run)
  G.gate = null;
  const pl = G.player;
  // (down when it ended: up at home, its avatar again, not lying in its fall)
  if (pl?.dead) emit('respawn', 'net');
  // (nothing of the host's world outlasts the game: its statuses, Seen, a push or a pull; the hero's own stats again)
  if (pl) { pl.status = freshStatus(); if (pl.buffs) pl.buffs.seen = 0; pl.kx = pl.kz = 0; pl.pull = null; }
  if (G.hero) refreshStats();
  for (const k of Object.keys(G.zones)) if (G.zones[k] !== G.zone) { disposeZone(G.zones[k]); delete G.zones[k]; }
  // (the host's zone it stood in is no zone of this page's own, nor one to be kept for a later game: let go once left)
  const z0 = G.zone;
  if (z0) z0.netKey = z0.netGame = null;
  NET.mode = null;
  let tries = 0;
  const drop = () => { if (G.zone === z0) { if (++tries < 30) later(1, drop); return; } if (G.zones[z0.id] === z0) { delete G.zones[z0.id]; disposeZone(z0); } };
  later(0.05, () => { emit('travel', 'town', { at: 'waypoint', fresh: true }); if (z0) later(1.5, drop); });
  writeSave();
}

// what fell for this guest in the host's zone it is led out of goes with it (the host leads, it cannot stay to pick it up)
function carryLoot() {
  if (!S.zoneKey || G.zone?.netKey !== S.zoneKey || !G.hero) return;
  const g = gatherPickups();
  if (g.gold || g.items) emit('toast', t('coop.gathered'), 'quest');
  if (g.left) emit('toast', t('hud.full'));
}

// ---------- the game room's wires ----------
function wire() {
  const ch = S.ch;
  ch.onPeers((c) => { peersChanged(c); resolveNames(); });
  ch.on('s', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer) onSnap(m.data); });
  ch.on('w', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer) chunk(m.data, onWorld); });
  ch.on('i', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer) chunk(m.data, onIce); });
  ch.on('f', (m) => { if (S.peers.get(m.peer)?.zk === myKey() && fxFrom(m.peer)) replayFx(m.data, m.peer); });
  ch.on('c', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer && m.data?.op === 'end') leaveGame('coop.hostLeft'); });
  ch.onConnection((c) => { if (!c && S.role) S.lostT = now(); else S.lostT = 0; emit('netLobby'); });
  // (a send of the game's the room refused: this view may not send, it plays alone; the game's room ended (it could not
  // be joined again after a reconnect): a guest goes home, a host plays on alone. A terminal code is netDead's)
  ch.onError?.((code, how) => {
    if (S.ch !== ch) return;
    // (a terminal code is netDead's, which leaves the game in play; one heard on a game that began after it, too)
    if (TERMINAL.has(code)) { if (S.dead && S.role) leaveGame('coop.off'); return; }
    if (how === 'send' && code === 'not_permitted') { S.send = false; S.sendSure = true; leaveGame('coop.noSend'); }
    else if (how === 'room') leaveGame(S.role === 'host' ? 'coop.lostHost' : 'coop.lost');
  });
}
// the look of a hero's skills is taken from the party only: on the host its guests, on a guest the host and its guests
const fxFrom = (pr) => (S.role === 'host' ? S.roster.includes(pr) : pr === S.hostPeer || !!S.peers.get(S.hostPeer)?.roster?.includes(pr));
// who is in the room: a host keeps the first three guests of its version (the roster); a guest finds its host. A hero's
// place is taken only from its own new presence (the change's joined and updated, and a presence not seen before), not
// again whenever another peer's changes
function peersChanged(c) {
  const ch = S.ch; if (!ch) return;
  const seen = new Set(), fresh = c ? new Set([...(c.joined || []), ...(c.updated || [])].map((p) => p.peer)) : null;
  for (const p of ch.peers()) {
    if (p.isMe) continue;
    seen.add(p.peer);
    let P = S.peers.get(p.peer);
    if (!P) S.peers.set(p.peer, (P = { peer: p.peer, by: p.by, buf: [], seq: -1, actor: null, joined: now(), hbT: now() }));
    const moved = P.src !== p.presence && (!fresh || fresh.has(p.peer));
    P.src = p.presence; P.pres = p.presence || {}; P.by = p.by;
    readPeer(P, moved);
  }
  for (const [k, P] of S.peers) if (!seen.has(k)) { if (P.actor) dropRemote(P.actor); S.peers.delete(k); S.done.delete(k); if (S.role === 'host') emit('toast', t('coop.left', nameOf(P)), 'quest'); if (k === S.hostPeer) S.hostGone = now(); }
  if (S.role === 'host') {
    const guests = [...S.peers.values()].filter((P) => P.role === 'guest' && P.code === S.code && P.v === VER).sort((a, b) => a.joined - b.joined);
    const roster = guests.slice(0, 3).map((P) => P.peer);
    for (const pr of roster) if (!S.roster.includes(pr)) { const P = S.peers.get(pr); emit('toast', t('coop.joined', nameOf(P)), 'quest'); Audio.sfx('waypoint', { vol: 0.5 }); }
    // (and its listing at once: a page joining just after another left is not told the game is full)
    if (roster.join() !== S.roster.join()) { S.roster = roster; hostPresence(true); lobbyPresence(true); }
  } else if (S.role === 'guest') {
    pickHost();
    const H = S.hostPeer && S.peers.get(S.hostPeer), h = H && H.role === 'host' && H.code === S.code ? H : null;
    if (h) S.hostGone = 0;
    if (h && h.v !== VER) { leaveGame('coop.version'); return; }
    // (not in the host's roster once it has one: the game is full)
    if (h && h.roster && !h.roster.includes(S.ch.me) && now() - S.joinT > 4000) { leaveGame('coop.full'); return; }
  }
  // (the lobby panel is told only when what it shows has changed, not on every presence)
  const k = lobbyKey(); if (k !== S.lobbyK) { S.lobbyK = k; emit('netLobby'); }
}
// (a guest's host: the peer picked from the list or listed for the code, else the one peer that hosts this code once the
// room's peers have come in (they arrive for a moment after the join: the first seen is not taken for being first);
// while two claim it, neither)
const SETTLE = 2000;
function pickHost() {
  if (S.hostPeer || (!S.wantHost && now() - S.joinT < SETTLE)) return;
  const hs = [...S.peers.values()].filter((P) => P.role === 'host' && P.code === S.code && (!S.wantHost || P.peer === S.wantHost));
  if (hs.length === 1) S.hostPeer = hs[0].peer;
}
const lobbyKey = () => [S.role, S.code, S.hostPeer, S.started, S.zoneKey, S.roster.join(), S.peers.get(S.hostPeer)?.on ? 1 : 0, ...party().map((p) => p.peer + p.name + p.cls + p.lvl + (p.dead ? 1 : 0) + (p.here ? 1 : 0) + (p.host ? 1 : 0))].join('|');
function readPeer(P, moved) {
  const p = P.pres;
  P.role = p.r === 'h' ? 'host' : p.r === 'g' ? 'guest' : null; P.code = p.c; P.v = p.v | 0;
  if (p.lk && typeof p.lk === 'object' && p.lk !== P.lk) { P.lk = p.lk; P.lookKey = JSON.stringify(p.lk); }
  P.zk = typeof p.zk === 'string' ? p.zk : null;
  P.roster = Array.isArray(p.ro) ? p.ro.filter((x) => typeof x === 'string').slice(0, 3) : null;
  P.zone = p.z && typeof p.z === 'object' ? p.z : null; P.on = !!p.on;
  P.mf = num(p.mf, 0, 400); P.gf = num(p.gf, 0, 400); P.dmax = num(p.dm, 0, 1e7); P.cdmg = num(p.cd, 0, 5000, 50);
  if (p.hb !== P.hb) { P.hb = p.hb; P.hbT = now(); }
  if (Array.isArray(p.h) && (moved || !P.state)) {
    const h = p.h, st = { x: num(h[0], -10, 1e4) / 20, z: num(h[1], -10, 1e4) / 20, r: num(h[2], -1e3, 1e3) / 100, sp: num(h[3], 0, 400) / 10, hp: num(h[4], 0, 1e8), hpMax: Math.max(1, num(h[5], 1, 1e8)), fl: h[6] | 0, y: num(h[7], -100, 400) / 20 };
    // (a stand-in put somewhere new starts there: no slide from where it was)
    if (S.role === 'host' && heldMove(P, st)) P.buf.length = 0;
    P.state = st;
    pushSample(P.buf, P.state);
  }
  if (Array.isArray(p.c2) && typeof p.c2[0] === 'string' && p.c2[0].length < 48) P.clip = { name: p.c2[0], spd: num(p.c2[1], 0.05, 5, 1), seq: p.c2[2] | 0 };
  P.ack = p.ak | 0;
  P.ev = Array.isArray(p.ev) ? p.ev : [];
  P.need = p.nd || null;
}
// (on the host a guest's hero goes only where a hero can go: a run, and a dodge, blink or leap's worth banked, since its
// last sample, on the floor. The only jumps are where the game puts a hero: entering the zone (by the host, where the
// host stood a moment ago) and rising after a fall (where it fell, by the host, or, the host down too, at the zone's
// checkpoint); a jump anywhere else is not taken (on entering, it stands by the host and goes on from there).
// Its reach, its kills' rewards, the packs and bosses it wakes and its weight on the ice follow where it can really be.
// Returns true when it was put somewhere new)
const MOVE_V = 10, MOVE_BANK = 14, MOVE_REFILL = 5, JUMP_R = 8;
function heldMove(P, st) {
  const t = now(), o = P.state, z = G.zone, key = myKey();
  const enter = !o || P.mzk !== P.zk, rise = !!o && (o.fl & 1) && !(st.fl & 1);
  const dt = Math.min(2, Math.max(0, (t - (P.moveT ?? t)) / 1000));
  P.mzk = P.zk; P.moveT = t;
  // (in another zone: nothing here to hold it to)
  if (P.zk !== key || !z?.map) { P.moveB = MOVE_BANK; return true; }
  if (enter || rise) {
    const J = S.stats.jumps;
    if (landsAt(st, rise ? o : null)) { J[enter ? 'enter' : 'rise']++; P.moveB = MOVE_BANK; onFloor(st, null); return true; }
    J.refused++;
    // (an entry anywhere else: by the host; a rise anywhere else: no jump, it goes from where it fell)
    if (enter) { const pl = G.player, f = z.map.nearestFloor(pl.x, pl.z); st.x = f.x; st.z = f.z; P.moveB = MOVE_BANK; return true; }
  }
  P.moveB = Math.min(MOVE_BANK, (P.moveB ?? MOVE_BANK) + dt * MOVE_REFILL);
  // (a run's worth for at most half a second: a page that stood still, sending little, banks no more than a dodge's)
  const d = Math.hypot(st.x - o.x, st.z - o.z), free = MOVE_V * Math.min(dt, 0.5);
  // (held back, it is on its way there)
  if (d > free && d - free > P.moveB) { const k = (free + P.moveB) / d; P.moveB = 0; st.x = o.x + (st.x - o.x) * k; st.z = o.z + (st.z - o.z) * k; }
  else if (d > free) P.moveB -= d - free;
  onFloor(st, o);
  return false;
}
// (where it stands is on the map's floor: the nearest floor to it, else where it stood)
function onFloor(st, o) {
  const m = G.zone.map, f = m.nearestFloor(clamp(st.x, 0.5, m.w - 0.5), clamp(st.z, 0.5, m.h - 0.5));
  if (m.walkable(f.x, f.z)) { st.x = f.x; st.z = f.z; }
  else if (o) { st.x = o.x; st.z = o.z; }
}
// (a spot the game puts a hero on in this zone: by the host now or a moment ago; on rising, also where it fell, and,
// with the host down a moment ago (a wipe, its own rise), where the zone keeps its checkpoint: the checkpoint, the
// waypoint, the second camp, the start)
function landsAt(st, fell) {
  const z = G.zone, sp = z.L?.spots || {}, k = myKey(), near = (p) => !!p && fin(p.x) && fin(p.z) && Math.hypot(st.x - p.x, st.z - p.z) < JUMP_R;
  if (near(G.player)) return true;
  for (const p of S.hostAt) if (p.k === k && near(p)) return true;
  if (!fell) return false;
  if (near(fell)) return true;
  return now() - (S.hostDownT ?? -1e9) < 10000 && (near(z.checkpoint) || near(z.L?.start) || near(sp.waypoint && { x: sp.waypoint.x, z: sp.waypoint.z + 2 }) || near(sp.camp2 && { x: sp.camp2.x, z: sp.camp2.z + 2 }));
}
// (a sample after a gap longer than the lag: the one before is put at the lag's edge, where it is shown now, so the hero
// or the monster goes on from where it stood, not a leap ahead)
const pushSample = (buf, s) => { const t = now(), l = buf[buf.length - 1]; if (l && l.t < t - LAG) l.t = t - LAG; buf.push({ t, x: s.x, z: s.z, r: s.r, y: s.y || 0 }); if (buf.length > 6) buf.shift(); };
// (a zone's key: the same id built once more is another zone, a guest builds it again)
export const myKey = () => (G.zone ? G.zone.netKey || G.zone.id + ':' + (G.zone.ep || 0) : null);

// ---------- presence ----------
function lookOf() {
  const h = G.hero, w = h.equip.weapon, o = h.equip.offhand;
  return { c: h.cls, l: h.level, w: w ? [w.base, w.rar | 0, w.leg || 0] : 0, o: o ? [o.rar | 0, o.leg || 0] : 0 };
}
function heroState() {
  const pl = G.player;
  const air = (pl.y || 0) > 0.2 || pl.act?.name === 'roll' || pl.act?.name === 'blink' || pl.act?.name === 'leap';
  return [q(pl.x, 20), q(pl.z, 20), q(pl.rot, 100), q(pl.netSp || 0, 10), Math.round(pl.hp), Math.round(pl.hpMax), (pl.dead ? 1 : 0) | (air ? 4 : 0) | (pl.iframes > 0 ? 8 : 0), q(pl.y || 0, 20)];
}
function hostPresence(full) {
  if (!S.ch || !G.hero || (!full && S.presT && now() - S.presT <= 1000)) return;
  const z = G.zone;
  const p = { r: 'h', c: S.code, v: VER, lk: lookOf(), zk: myKey(), ro: S.roster, on: S.started ? 1 : 0, mf: 0 };
  // (and where its hero stands in it: a guest arriving comes to its side)
  if (z) p.z = { id: z.id, s: z.seed | 0, l: z.level | 0, ti: z.tier | 0, d: G.hero.diff | 0, k: myKey(), x: q(G.player?.x, 20), y: q(G.player?.z, 20) };
  S.ch.presence(p); S.presT = now();
}
function lobbyPresence(force) {
  const L = S.T?.lobby; if (!L || S.role !== 'host' || !G.hero) return;
  if (!force && now() - S.lobbyT < 2500) return;
  S.lobbyT = now();
  L.presence({ g: { c: S.code, cls: G.hero.cls, l: G.hero.level, z: G.zone?.id || 'town', n: 1 + S.roster.length, d: G.hero.diff | 0, v: VER, on: S.started ? 1 : 0 } });
}
// (built only when the channel would send it at once: at most its presence rate, not every frame)
const EVB = new WeakMap();
function guestPresence(force) {
  if (!S.ch || !G.hero || (!force && !S.ch.presenceDue())) return;
  const h = S.real || G.hero, pl = G.player, s = G.stats;
  const p = { h: null, c2: null, nd: null, ev: null, r: 'g', c: S.code, v: VER, hb: Math.floor(now() / 1000) & 1023, lk: { c: h.cls, l: h.level, ml: h.mlvl || 0, w: h.equip.weapon ? [h.equip.weapon.base, h.equip.weapon.rar | 0, h.equip.weapon.leg || 0] : 0, o: h.equip.offhand ? [h.equip.offhand.rar | 0, h.equip.offhand.leg || 0] : 0 }, zk: S.zoneKey, ak: S.relDone, mf: Math.round(s?.mf || 0), gf: Math.round(s?.gold || 0), dm: Math.round((s?.wmax || 1) * (s?.dmgMult || 1)), cd: Math.round(s?.critD ?? 50) };
  if (pl && S.zoneKey && S.zoneKey === myKey()) { p.h = heroState(); const av = pl.avatar; if (av?.netSeq) p.c2 = [av.netClip, Math.round((av.netSpd || 1) * 100) / 100, av.netSeq]; }
  if (!S.world) p.nd = 'w';
  // the events the host has not acked, oldest first, as many as fit
  const ev = []; let b = bytesOf(p) + 10;
  for (const e of S.ev) { let n = EVB.get(e); if (n == null) EVB.set(e, (n = bytesOf(e) + 1)); if (b + n > 3600) break; ev.push(e); b += n; }
  if (ev.length) p.ev = ev;
  S.ch.presence(p);
}

// ---------- every frame ----------
export function netTick(dt) {
  if (!S.ch || !S.role) return;
  S.ch.pump();
  // this hero's speed, smoothed (for the others' walk and run)
  const pl = G.player;
  if (pl) { const v = Math.hypot(pl.x - (S.px ?? pl.x), pl.z - (S.pz ?? pl.z)) / Math.max(dt, 1e-3); S.px = pl.x; S.pz = pl.z; pl.netSp = (pl.netSp || 0) + (Math.min(v, 30) - (pl.netSp || 0)) * Math.min(1, dt * 12); }
  if (S.role === 'host') hostTick(dt); else guestTick(dt);
  remotesTick(dt);
  reviveTick(dt);
  downedTick(dt);
  // the look of this page's hero's skills, to the others (a guest's: the host sends its own in the snapshot)
  if (S.role === 'guest' && S.fxOut.length && now() - S.fxT > 200) { S.fxT = now(); const out = packFx(S.fxOut.splice(0), FX_MAX * 2); if (out.length) S.ch.emit('f', out); }
  // the room lost for long: a guest goes home; a host plays on alone
  if (S.lostT && now() - S.lostT > HOST_LOST && S.role === 'guest') leaveGame('coop.lost');
}

// ---------- the host ----------
function hostTick(dt) {
  const pl = G.player, z = G.zone; if (!pl || !z) return;
  MIRROR.rec = recFx;
  const key = myKey();
  // (a new zone is told at once: the guests follow)
  hostPresence(key !== S.lastKey); lobbyPresence(key !== S.lastKey); S.lastKey = key;
  // (where its hero stood the last few seconds, and when it was last down: where a guest entering or rising is put)
  if (now() - (S.hostAtT || 0) > 250) { S.hostAtT = now(); S.hostAt.push({ x: pl.x, z: pl.z, k: key }); if (S.hostAt.length > 24) S.hostAt.shift(); }
  if (pl.dead) S.hostDownT = now();
  // the guests here: their stand-ins, their events
  let n = 1;
  for (const pr of S.roster) {
    const P = S.peers.get(pr); if (!P) continue;
    // (a guest whose page has stopped, a hidden tab, a locked phone, is not here until it beats again)
    const here = S.started && P.zk === key && P.state && now() - (P.hbT || 0) < STALL;
    if (here) {
      n++;
      if (!P.actor) P.actor = addRemote(P);
      takeEvents(P);
    } else if (P.actor) { dropRemote(P.actor); P.actor = null; }
  }
  for (const P of S.peers.values()) if (P.actor && !S.roster.includes(P.peer)) { dropRemote(P.actor); P.actor = null; }
  if (n !== NET.n) { NET.n = n; rescale(); }
  standByTick(dt);
  // the world, when it changed (looked at four times a second) or someone asks for it
  if (!(now() - (S.wkT || 0) < 250)) { S.wkT = now(); S.wk = worldKey(); }
  const wk = S.wk;
  const asked = [...S.peers.values()].some((P) => P.need === 'w' && S.roster.includes(P.peer));
  if ((wk !== S.worldSent || (asked && now() - S.worldT > 1500) || now() - S.worldT > 12000) && S.roster.length) { S.worldSent = wk; S.worldT = now(); sendBig('w', worldOf()); }
  // the ice: what changed, at most twice a second, all of it every 3 s
  const I = z.ice;
  if (I && S.roster.length && now() - S.iceT > 500) { const dg = iceDigest(z); if (dg && (dg.key !== S.iceKey || now() - S.iceT > 3000)) { S.iceKey = dg.key; S.iceT = now(); sendBig('i', { k: key, d: dg.d }); } }
  // the snapshot
  if (S.roster.length && S.started && now() - S.snapT >= 1000 / SNAP_HZ) { S.snapT = now(); sendSnap(); }
  if (!S.roster.length || !S.started) S.fxHost = [];
  // each guest's reliable events it has seen are let go (and none kept past 30 s); a guest gone, its queue with it
  const tooOld = now() - 30000;
  for (const [pr, q] of S.rel) {
    if (!S.roster.includes(pr)) { S.rel.delete(pr); continue; }
    const ack = S.peers.get(pr)?.ack ?? 0;
    while (q.length && (q[0].seq <= ack || q[0].t < tooOld)) q.shift();
  }
  // a wipe: every hero down for 3 s, the host gets up at its checkpoint and its guests by it
  const all = pl.dead && NET.remotes.length > 0 && NET.remotes.every((r) => r.dead);
  if (all) { S.wipeT = (S.wipeT || 0) + dt; if (S.wipeT > 3) { S.wipeT = 0; relTo('', ['wp']); if (S.downed) respawnSelf(); } } else S.wipeT = 0;
}
function worldOf() {
  const h = G.hero;
  return { flags: h.flags, quest: h.quest, diff: h.diff, wps: h.wps, a: [h.act1, h.act2, h.act3, h.act4, h.act5], gb: h.gateBest | 0, gate: G.gate ? { tier: G.gate.tier } : null, clips: [...S.clips] };
}
function worldKey() { const h = G.hero, f = JSON.stringify(h.flags); return f.length + ':' + h.quest + ':' + h.diff + ':' + hashStr(f); }
function hashStr(s) { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; }
// big JSON in chunks under the message limit (the world's flags, the ice): { id, i, n, s }
function sendBig(topic, obj) {
  const s = JSON.stringify(obj), id = (Math.random() * 1e9) | 0, n = Math.ceil(s.length / CHUNK) || 1;
  for (let i = 0; i < n; i++) S.ch.emit(topic, { id, i, n, s: s.slice(i * CHUNK, (i + 1) * CHUNK) }, { must: true });
}
function chunk(m, fn) {
  if (!m || typeof m.s !== 'string' || !(m.n >= 1 && m.n <= 40) || !(m.i >= 0 && m.i < m.n)) return;
  if (m.n === 1) { try { fn(JSON.parse(m.s)); } catch (e) { /* torn */ } return; }
  const c = S.chunks[m.id] ||= { parts: [], got: 0, t: now() };
  if (!c.parts[m.i]) { c.parts[m.i] = m.s; c.got++; }
  for (const k in S.chunks) if (now() - S.chunks[k].t > 10000) delete S.chunks[k];
  if (c.got === m.n) { delete S.chunks[m.id]; try { fn(JSON.parse(c.parts.join(''))); } catch (e) { /* torn */ } }
}
// a reliable event: kept in the queue of each guest it is for (to, or every guest) and sent in every snapshot until that
// guest has acked it. Each guest has its own queue and share of the bytes, so one that stops acking holds back only its
// own; one count numbers them all, so a guest's own run only ever rises
function relTo(to, data) {
  const seq = ++S.relSeq, t = now();
  for (const pr of to ? [to] : S.roster) {
    let q = S.rel.get(pr); if (!q) S.rel.set(pr, (q = []));
    q.push({ seq, d: data, t });
    if (q.length > REL_Q) q.splice(0, q.length - REL_Q);
  }
}
// the clip names the host's avatars play, given numbers (sent once each, reliably)
function clipIdx(name) {
  if (!name) return -1;
  let i = S.clips.get(name);
  if (i == null) { i = S.clips.size; S.clips.set(name, i); relTo('', ['cd', i, String(name).slice(0, 47)]); }
  return i;
}
function sendSnap() {
  const pl = G.player, gs = S.roster.map((pr) => S.peers.get(pr)).filter((P) => P?.actor);
  if (!gs.length) return;
  const o = { k: myKey(), t: Math.round(now()) };
  // the host's hero
  const av = pl.avatar;
  o.h = heroState().concat([clipIdx(av?.netClip), (av?.netSeq || 0) & 1023, Math.round((av?.netSpd || 1) * 100)]);
  // the tide as it stands (a guest's clock follows it), a boss's hold on it, the gusts and their clock (a guest's follows it)
  const z = G.zone, T = z.tide;
  if (T) o.w = [q(T.t, 10), T.force ? q(T.force.h, 100) : -1, T.force ? q(T.force.rate, 1000) : 0, z.gust?.on ? 1 : 0];
  else if (z.gust) o.w = [0, -1, 0, z.gust.on ? 1 : 0];
  if (z.gust) o.w.push(q(z.gust.t % 40, 10));
  // the fires on the ice, lit by a touch or put out by the dark: the cairns, the open holes' lamps (bits)
  if (z.act5 && z.id === 'farlight') o.l = [bits(z.act5.cairns, (it) => it.i), bits(z.act5.lamps, (it) => it.hole * 4 + it.i)];
  // acks of each guest's events
  o.ak = {}; for (const P of gs) o.ak[P.peer] = S.done.get(P.peer) || 0;
  let b = bytesOf(o) + 20;
  // the reliable events each guest still lacks, oldest first: its share of the bytes, then what the others left (taken
  // in turn, a different guest first each time)
  const W = gs.map((P) => { const q = S.rel.get(P.peer) || []; let i = 0; while (i < q.length && q[i].seq <= (P.ack || 0)) i++; return { P, q, i, out: [] }; });
  // (an event no snapshot could carry is let go, not left to hold back the ones after it)
  const fill = (w, cap) => { while (w.i < w.q.length) { const e = w.q[w.i], x = [e.seq, ...e.d], n = bytesOf(x) + 1; if (n > REL_MAX) { w.q.splice(w.i, 1); continue; } if (n > cap) break; w.out.push(x); w.i++; cap -= n; } return cap; };
  let spare = 0;
  for (const w of W) spare += fill(w, REL_MAX / W.length);
  for (let j = 0; j < W.length; j++) spare = fill(W[(j + S.stats.snaps) % W.length], spare);
  const r = {}; for (const w of W) if (w.out.length) r[w.P.peer] = w.out;
  if (Object.keys(r).length) { o.r = r; b += bytesOf(r) + 6; }
  // what the host saw happen near them, the most important first (and which of it is the look of a guest's own blow,
  // shown on its page already: that guest passes it over)
  const fs = {}, f = packFx(S.fxHost || [], FX_MAX, gs, fs);
  S.fxHost = [];
  let fb = f.length ? bytesOf(f) + 6 : 0;
  const fsb = Object.keys(fs).length ? bytesOf(fs) + 6 : 0;
  // the monsters the guests need, before the fx (which keep at least FX_MIN of their bytes)
  b += pickActors(o.a = [], gs, SNAP_MAX - b - Math.min(fb + fsb, FX_MIN));
  // the fx in what is left, the least important let go first
  while (f.length && b + fb + fsb > SNAP_MAX) { fb -= bytesOf(f.pop()) + 1; if (!f.length) fb = 0; }
  if (f.length) {
    o.f = f; b += fb;
    for (const pr in fs) { const l = fs[pr].filter((i) => i < f.length); if (l.length) (o.fs ||= {})[pr] = l; }
    if (o.fs) b += bytesOf(o.fs) + 6;
  }
  S.stats.snaps++; S.stats.snapBytes += b;
  S.ch.emit('s', o);
}
const bits = (list, at) => { let m = 0; for (const it of list) if (it.lit) m |= 1 << (at(it) & 31); return m; };
// the monsters near any guest, as many as fit in cap bytes (into A; returns the bytes). Every snapshot carries the bosses,
// each guest's own NEAREST (whatever crowd stands by another) and a death not yet told; the rest go by a claim that grows
// while one waits: the time since it was last sent, times what it is to the guests (one after a guest, aggro on its
// stand-in near it or that struck it a moment ago, the most; else the nearer the more), and one that waited OVERDUE before
// those. A monster sent starts again from nothing, so what is left out once comes in a later snapshot and none waits long
// (a guest's puppet unseen for 2.5 s is let go)
function pickActors(A, gs, cap) {
  const t = now(), C = [];
  for (const a of G.actors) {
    if (a.removed || a.remote || a.team === 'npc' || a.prop || !KIDX.has(a.kind)) continue;
    // (a death is told three times, then the guests' puppets fade on their own)
    if (a.dead && (a.deadT > 4 || (a.netDead | 0) >= 3)) continue;
    let d = Infinity, after = false;
    for (const P of gs) {
      const dd = Math.abs(a.x - P.actor.x) + Math.abs(a.z - P.actor.z);
      if (dd < d) d = dd;
      if (!a.dead && dd < 24 && ((a.aggro && a.tgt === P.actor) || t - (a.netHitT ?? -1e9) < 1500)) after = true;
    }
    // (and a death not yet told near enough to a guest to pay it, 50 m: its reward is paid only for one it was shown)
    if (d > NEAR * 1.3 && !a.boss && !(a.dead && !a.netDead && gs.some((P) => Math.hypot(a.x - P.actor.x, a.z - P.actor.z) <= 52))) continue;
    const waited = t - (a.netSentT ?? t - OVERDUE);
    C.push({ a, d, waited, k: a.boss || (a.dead && !a.netDead) ? 1e9 : waited * (after ? 8 : 2 / (1 + d / 10)) + (waited >= OVERDUE ? 1e7 : 0) });
  }
  for (const P of gs) {
    const L = C.filter((c) => !c.a.dead).map((c) => [Math.abs(c.a.x - P.actor.x) + Math.abs(c.a.z - P.actor.z), c]).sort((x, y) => x[0] - y[0]);
    for (let i = 0; i < Math.min(NEAREST, L.length); i++) L[i][1].k = Math.max(L[i][1].k, 1e9 - L[i][0]);
  }
  C.sort((x, y) => y.k - x.k);
  let b = 0;
  for (const { a } of C) {
    const e = actorEntry(a, t), n = bytesOf(e) + 1;
    if (b + n > cap) break;
    A.push(e); b += n;
    a.netSentT = t; a.netLx = a.x; a.netLz = a.z; a.netDead = a.dead ? (a.netDead | 0) + 1 : 0;
  }
  return b;
}
// (its speed: from where it was when last sent, kept on the monster itself, so nothing outlives it)
function actorEntry(a, t) {
  const av = a.avatar, hpF = a.hpMax > 0 ? Math.round(clamp(a.hp / a.hpMax, 0, 1) * 255) : 0;
  const sp = a.netSentT == null ? 0 : Math.hypot(a.x - a.netLx, a.z - a.netLz) / Math.max(0.03, (t - a.netSentT) / 1000);
  const fl = (a.dead ? 1 : 0) | (a.hidden || a.under || (a.avatar && !a.avatar.group.visible && !a.dead) ? 2 : 0) | (a.aggro ? 4 : 0) | (a.status.freeze > 0 ? 8 : 0) | (a.status.stun > 0 ? 16 : 0)
    | (a.elite === 'champion' ? 32 : 0) | (a.elite === 'rare' ? 64 : 0) | (a.minion ? 128 : 0) | (a.flash > 0.5 ? 256 : 0) | (a.dormant ? 512 : 0) | (a.airborne ? 1024 : 0) | (a.statue && !a.awake ? 2048 : 0) | (a.team === 'hero' ? 4096 : 0) | (a.boss ? 8192 : 0) | (a.drowned ? 16384 : 0);
  return [a.id, KIDX.get(a.kind), q(a.x, 10), q(a.z, 10), q(((a.rot % 6.2832) + 6.2832) % 6.2832, 20), hpF, fl, clipIdx(av?.netClip), (av?.netSeq || 0) & 1023, q(Math.min(sp, 30), 10), q(a.y || 0, 10), a.level | 0, Math.round((av?.netSpd || 1) * 100), Math.round(a.hpMax)];
}
// the monsters' life (and a boss's) and their blows by the players here (data.js COOP), each keeping its share of life; in
// every zone kept, so a pack left behind is the party's that comes back to it (the packs already up keep their size)
export function rescale() {
  const i = clamp(NET.n, 1, 4) - 1;
  for (const z of new Set([...Object.values(G.zones), G.zone])) for (const a of z?.actors || []) {
    if (a.team !== 'foe' || a.prop || a.dead) continue;
    const k = (a.boss ? COOP.boss : COOP.hp)[i];
    const k0 = a.coopK || 1;
    if (k0 !== k) { const f = a.hp / a.hpMax, m = k / k0; a.hpMax *= m; a.hp = f * a.hpMax; if (a.hpFloor) a.hpFloor *= m; a.coopK = k; }
    // (its blows as a ratio: whatever else made them bigger or smaller stays)
    const d = COOP.dmg[i], d0 = a.coopD || 1;
    if (d0 !== d) { a.dmg *= d / d0; a.coopD = d; }
  }
}
// the coop factors for this page's rewards and the spawns (index: players here)
export const coopK = () => { const i = clamp(NET.n, 1, 4) - 1; return { i, xp: COOP.xp[i], gold: COOP.gold[i], loot: COOP.loot[i], mf: COOP.mf[i], pack: COOP.pack[i], elite: COOP.elite[i], hp: COOP.hp[i], boss: COOP.boss[i], dmg: COOP.dmg[i] }; };

// a guest's events: its blows on the host's monsters, a revive. Each is checked: what it strikes is here and alive,
// within reach of the guest's stand-in; the blow no bigger than its weapon can make (14x), and a second's blows no more
// than 30 such (a big skill across a crowd, crits and all, stays well under it; a flood does not)
const OPT_NUM = { stun: 3, freeze: 4, chill: 5, fear: 4, knock: 40, burn: 1e7, root: 2 };
function takeEvents(P) {
  let last = S.done.get(P.peer) || 0;
  const ev = P.ev || [];
  for (const e of ev) {
    if (!Array.isArray(e)) continue;
    // (oldest first, every one not yet acked: a gap is what the guest no longer holds, so it is passed over)
    const seq = e[0] | 0; if (seq <= last) continue;
    last = seq;
    try { guestEvent(P, e); } catch (err) { reject('bad'); }
  }
  S.done.set(P.peer, last);
}
const reject = (why) => { S.stats.rejected++; S.stats.why[why] = (S.stats.why[why] || 0) + 1; };
// the biggest blow a guest may claim: 14x its weapon's top damage as it claims it (dm), never past what a hero of its
// level could have (and, past the last level, its Mastery: every point it has in Might), times its crit damage as it
// claims it over a plain crit's x1.5, never past its level's and its Mastery's (every point in Ferocity)
function blowCap(P) {
  const lvl = clamp(P.lk?.l | 0, 1, MAX_LEVEL), ml = clamp(P.lk?.ml | 0, 0, 1e4), pts = lvl - 1 + ml;
  const dmCeil = (12 + lvl * 9) * 8 * (1 + masteryValue(MASTERY_BY.might, pts, lvl) / 100);
  const cdCeil = 50 + 6 * lvl + masteryValue(MASTERY_BY.fury, pts, lvl);
  return Math.max(60, Math.min(P.dmax || 0, dmCeil) * 14 * Math.max(1, (1 + Math.min(P.cdmg ?? 50, cdCeil) / 100) / 1.5));
}
// a live monster of the host's within reach of the guest's stand-in, or null (refused as too far)
function foeNear(id, me) {
  const a = G.actors.find((x) => x.id === (id | 0));
  if (!a || a.dead || a.removed || a.team !== 'foe' || a.prop) return null;
  if (Math.hypot(a.x - me.x, a.z - me.z) > 26 + (a.radius || 0.5)) { reject('far'); return null; }
  return a;
}
// more than n events of a kind from one guest in a second
function over(P, k, n) { const R0 = (P.rates ||= {})[k] ||= { t: now(), n: 0 }; if (now() - R0.t > 1000) { R0.t = now(); R0.n = 0; } return ++R0.n > n; }
function guestEvent(P, e) {
  const type = e[1], me = P.actor;
  if (type === 'h') {
    const id = e[2] | 0, amt = e[3], crit = !!e[4], o = e[5] && typeof e[5] === 'object' ? e[5] : {};
    const a = G.actors.find((x) => x.id === id);
    if (!a || a.dead || a.removed || a.team !== 'foe' || a.prop) return;
    if (Math.hypot(a.x - me.x, a.z - me.z) > 26 + (a.radius || 0.5)) return reject('far');
    const cap = blowCap(P);
    if (!(typeof amt === 'number' && isFinite(amt) && amt > 0 && amt <= cap)) return reject('big');
    // the rate: what a second of its hits may come to
    const R0 = P.rate ||= { t: now(), sum: 0 };
    if (now() - R0.t > 1000) { R0.t = now(); R0.sum = 0; }
    // (a burn counts with the blow that lights it)
    R0.sum += amt + (fin(o.burn) && o.burn > 0 ? Math.min(o.burn, cap) : 0); if (R0.sum > cap * 30) return reject('rate');
    const opts = { crit, net: true };
    for (const k in OPT_NUM) if (typeof o[k] === 'number' && isFinite(o[k]) && o[k] > 0) opts[k] = Math.min(o[k], OPT_NUM[k] === 1e7 ? cap : OPT_NUM[k]);
    if (o.slow && typeof o.slow.k === 'number' && typeof o.slow.t === 'number') opts.slow = { k: clamp(o.slow.k, 0, 0.8), t: clamp(o.slow.t, 0, 5) };
    for (const k of ['area', 'dot', 'breakGuard', 'swing', 'quiet', 'noFx']) if (o[k]) opts[k] = true;
    if (typeof o.kx === 'number' && typeof o.kz === 'number' && isFinite(o.kx) && isFinite(o.kz)) { opts.kx = o.kx; opts.kz = o.kz; }
    S.stats.hits++;
    S.landing = P.peer; S.landingA = a;
    try { damage(me, a, amt, opts); } finally { S.landing = S.landingA = null; }
  } else if (type === 'pu') {
    // a pull (the Maelstrom, a Seismic Leap, a Challenge, the Void Rift): by the host's own rules for what may be moved
    const a = foeNear(e[2], me); if (!a) return;
    const ix = e[3], iz = e[4]; if (!nums([ix, iz], 2)) return reject('bad');
    if (a.boss || a.prop || a.keeper || a.def.anchored || a.dormant || a.cling) return reject('pull');
    if (over(P, 'pu', 80)) return reject('rate');
    // (no more than the strongest pull, the Rift's, over the 0.2 s a guest sums them for)
    const m = Math.hypot(ix, iz), k = m > 8 ? 8 / m : 1;
    a.kx += ix * k; a.kz += iz * k;
  } else if (type === 'ta') {
    // a taunt (a Challenge, an Iron Bulwark): the monster comes for that guest (ai.js targetOf) for as long as it said
    const a = foeNear(e[2], me); if (!a) return;
    if (over(P, 'ta', 40)) return reject('rate');
    a.aggro = true; a.status.fear = 0; a.taunt = G.hero.stats.time + num(e[3], 0, 12); a.tauntBy = me;
  } else if (type === 'ic') {
    // the ice: a guest's crack or refreeze done on the host's (the only ice that cracks), near it and no wider than a skill's
    const op = e[2], a = e.slice(3, 9);
    if (!nums(a, op === 'f' ? 3 : op === 'l' ? 6 : op === 'r' ? 5 : 4)) return reject('bad');
    if (over(P, 'ic', 14)) return reject('rate');
    const near = (x, z) => Math.hypot(x - me.x, z - me.z) < 28, st = clamp(a[op === 'l' ? 5 : op === 'r' ? 4 : 3] | 0, 1, 2);
    if (op === 'c') { if (!near(a[0], a[1]) || a[2] > 4) return reject('ice'); crackAt(a[0], a[1], a[2], st, { src: 'guest' }); }
    else if (op === 'l') { if (!near(a[0], a[1]) || !near(a[2], a[3]) || Math.hypot(a[2] - a[0], a[3] - a[1]) > 14 || a[4] > 2.5) return reject('ice'); crackLine(a[0], a[1], a[2], a[3], a[4], st, { src: 'guest' }); }
    else if (op === 'r') { if (!near(a[0], a[1]) || a[3] > 8 || a[3] - a[2] > 1.5 || a[2] < 0) return reject('ice'); crackRing(a[0], a[1], a[2], a[3], st, { src: 'guest' }); }
    else if (op === 'f') { if (!near(a[0], a[1]) || a[2] > 6) return reject('ice'); refreezeAt(a[0], a[1], a[2]); emit('frostNova', a[0], a[1], a[2]); }
    else return reject('bad');
  } else if (type === 'rv') {
    // a revive: the reviver (this guest) has stood by another hero, down a moment, as long as a raise takes (the host's
    // own count of its stand-in beside it), and that hero was not raised a moment ago
    const who = e[2];
    if (typeof who !== 'string' || who === P.peer) return reject('rv');
    const T0 = who === S.ch.me ? G.player : S.peers.get(who)?.actor, downT = who === S.ch.me ? S.downed?.at : T0?.downT;
    if (!T0?.dead || !(now() - (downT ?? now()) > 1000) || !(P.near?.peer === who && P.near.t >= REVIVE - 0.5) || now() - (S.rvT.get(who) ?? -1e9) < 4000) return reject('rv');
    S.rvT.set(who, now());
    if (who === S.ch.me) revived(); else relTo(who, ['rv']);
  }
}
// (on the host: how long each guest's stand-in has stood by a downed hero, the host's or another guest's)
function standByTick(dt) {
  for (const pr of S.roster) {
    const P = S.peers.get(pr), me = P?.actor; if (!P) continue;
    let who = null;
    if (me && !me.dead) {
      const pl = G.player;
      if (pl?.dead && Math.hypot(pl.x - me.x, pl.z - me.z) < 3.5) who = S.ch.me;
      else for (const Q of S.peers.values()) if (Q !== P && Q.actor?.dead && Math.hypot(Q.actor.x - me.x, Q.actor.z - me.z) < 3.5) { who = Q.peer; break; }
    }
    if (!who) P.near = null; else if (P.near?.peer === who) P.near.t += dt; else P.near = { peer: who, t: 0 };
  }
}
// a host's monster strikes a guest's stand-in: the blow goes to the guest (its armour, block and dodge take it there)
const HURT_KEYS = ['dot', 'pure', 'freeze', 'poison', 'burn', 'root', 'push', 'kx', 'kz', 'cold', 'seen', 'interrupt', 'plunge', 'wash', 'stun'];
NET.h.hurtRemote = (src, tg, amount, o = {}) => {
  if (!tg.peer || tg.dead || !(amount > 0)) return 0;
  const P = S.peers.get(tg.peer); if (!P) return 0;
  // (what it already struck it does not strike twice in the same blow: a guest dodging is the guest's)
  const oo = {};
  for (const k of HURT_KEYS) if (o[k] != null && (typeof o[k] === 'number' || o[k] === true)) oo[k] = typeof o[k] === 'number' ? Math.round(o[k] * 100) / 100 : 1;
  if (o.slow?.k) oo.slow = { k: Math.round(o.slow.k * 100) / 100, t: Math.round(o.slow.t * 100) / 100 };
  relTo(tg.peer, ['h', src?.id | 0, Math.round(amount), src?.level | 0, oo]);
  // (a monster that struck a guest is one that guest needs in its snapshots)
  if (src && typeof src === 'object') src.netHitT = now();
  tg.flash = 0.6;
  return Math.round(amount);
};
// rewards: each guest here gets its own share of a kill, rolled on the host for its class and its magic find
NET.h.reward = (a, dx, dz) => {
  const K = coopK(), D = DIFFS[G.hero.diff], def = a.def, L = a.level;
  const em = a.boss ? 1 : a.elite === 'rare' ? 5 : a.elite === 'champion' ? 3 : a.minion ? 1.5 : 1;
  for (const pr of S.roster) {
    const P = S.peers.get(pr); if (!P?.actor) continue;
    // (near enough to have been in it: 50 m, a boss anywhere in the zone)
    if (!a.boss && Math.hypot(P.actor.x - a.x, P.actor.z - a.z) > 50) continue;
    const cls = own(CLASSES, P.lk?.c) ? P.lk.c : 'warden', mf = Math.min(P.mf || 0, 400) + K.mf, gf = Math.min(P.gf || 0, 400);
    const xp = Math.round(monsterXP(L) * def.xp * D.xp * em * K.xp);
    const gold = [], piles = a.boss ? 6 : a.elite ? 2 : 1, gc = a.boss || a.elite ? 1 : 0.32;
    for (let i = 0; i < piles; i++) if (Math.random() < gc) gold.push(Math.round((3 + L * 1.6) * rand.range(0.6, 1.4) * D.gold * (1 + gf / 100) * (a.boss ? 3 : 1) * K.gold));
    let n = 0;
    if (a.boss) n = 4 + Math.floor(D.loot) + K.i;
    else if (a.elite === 'rare') n = rand.int(2, 3);
    else if (a.elite === 'champion') n = Math.random() < 0.7 ? 1 : 0;
    else if (Math.random() < 0.085 * D.loot * K.loot) n = 1;
    const items = [];
    for (let i = 0; i < n; i++) items.push(makeItem(L, { cls, elite: !!a.elite, boss: a.boss, mf, legMul: D.leg, rar: a.boss && i === 1 ? 2 : undefined }));
    const globe = Math.random() < (a.elite || a.boss ? 1 : 0.07) ? 1 : 0;
    // (a boss's items, one event each, so no event runs past the message)
    relTo(pr, ['k', a.id, q(dx, 10), q(dz, 10), xp, gold, [], globe, a.elite ? 1 : 0]);
    for (const it of items) relTo(pr, ['it', q(dx, 10), q(dz, 10), it]);
  }
};
// the story's words, said on the host, are heard by the guests too
on('say', (key) => { if (S.role === 'host' && S.roster.length && typeof key === 'string' && !S.saying) relTo('', ['say', key]); });

// ---------- the guest ----------
function guestTick(dt) {
  if (!G.hero) return;
  const H = S.hostPeer && S.peers.get(S.hostPeer);
  // the host gone from the room (a page that closed; a moment's reconnect is not that): home
  if (S.hostGone && now() - S.hostGone > HOST_GONE) { leaveGame('coop.hostLeft'); return; }
  // the host gone quiet: home
  if (S.zoneKey && now() - S.lastSnap > HOST_LOST && (!H || H.zk === S.zoneKey)) { leaveGame('coop.lost'); return; }
  pickHost();
  if (S.role === 'guest' && !S.hostPeer && now() - S.joinT > 10000) { leaveGame('coop.noHost'); return; }
  // (waiting has an end: a host that never starts; one started whose world never comes, a host that cannot send it)
  if (!S.zoneKey) {
    if (now() - S.joinT > WAIT_MAX) { leaveGame('coop.waitLong'); return; }
    if (H?.on && !S.world) { S.onT ||= now(); if (now() - S.onT > NO_WORLD) { leaveGame('coop.noWorld'); return; } }
  }
  // the host's zone: built here from its seed with the host's world (once the world has come); and again when this page
  // stands in another (its own travel, begun while it waited, that landed after it entered)
  if (H?.on && H.zone && S.world && !S.loading && (H.zone.k !== S.zoneKey || G.zone?.netKey !== S.zoneKey)) guestEnter(H.zone);
  if (S.zoneKey && S.zoneKey === myKey()) { MIRROR.rec = recGuestFx; puppetsTick(dt); flushPulls(); }
  // presence each frame (sent coalesced), after the events of this frame
  guestPresence();
}
// the host's world on this page: G.hero becomes a view of the guest's own record with the host's story laid over it
const WORLD = new Set(['flags', 'quest', 'diff', 'wps', 'act1', 'act2', 'act3', 'act4', 'act5', 'gateBest', 'seeds']);
function viewHero(real, W) {
  return new Proxy(real, {
    get(t0, k) { if (k === '__real') return real; if (WORLD.has(k)) return W[k]; return t0[k]; },
    set(t0, k, v) { if (WORLD.has(k)) W[k] = v; else t0[k] = v; return true; }
  });
}
function onWorld(w) {
  if (!w || typeof w.flags !== 'object' || !w.flags) return;
  if (Array.isArray(w.clips)) for (const c of w.clips) if (Array.isArray(c) && typeof c[0] === 'string') S.hclips.set(c[1] | 0, c[0].slice(0, 47));
  const a = Array.isArray(w.a) ? w.a : [];
  const real = S.real || G.hero, own = real.flags || {};
  // (the blessings' multipliers stay the guest's own: Unbound, Remembered)
  const flags = Object.assign({}, w.flags, { unbound: own.unbound, remembered: own.remembered });
  const act = (v) => num(v, -1, DIFFS.length - 1, -1) | 0;
  const W = { flags, quest: num(w.quest, 0, 99), diff: clamp(w.diff | 0, 0, DIFFS.length - 1), wps: Array.isArray(w.wps) ? w.wps.filter((z) => typeof z === 'string' && z.length < 24).slice(0, 40) : ['town'], act1: act(a[0]), act2: act(a[1]), act3: act(a[2]), act4: act(a[3]), act5: act(a[4]), gateBest: num(w.gb, 0, 999) | 0, seeds: {} };
  const key = JSON.stringify(W);
  if (key === S.wkey) return;
  const first = !S.world;
  S.wkey = key;
  if (S.world) Object.assign(S.world, W); else S.world = W;
  // (kept until this guest is in the host's world: one still waiting plays its own, its story and its Shadow Gate)
  S.wgate = w.gate ? num(w.gate.tier, 0, 999) | 0 : null;
  if (S.zoneKey) G.gate = gateOf(S.wgate);
  // what the story has lit and moved, laid on the zone again
  if (!first && G.zone && S.zoneKey === myKey()) presenceAgain(G.zone);
}
const gateOf = (tier) => (tier == null ? null : { tier, progress: 0, guardian: null, start: performance.now(), done: false });
function presenceAgain(z) {
  try {
    // what the host's story has opened since this zone was built here (walls, gates, the plug, the skerry, a sealed hole),
    // and the skerry shut again under the dead Tower (its hero set clear of it first)
    storyOpenings(z);
    const sk = z.id === 'coast' && G.hero.flags.towerDown && z.L.spots.skerry;
    if (sk && sk.cells.some(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5))) skerryClose(z, sk);
    const act = ZONES[z.id]?.act;
    if (act === 5) act5Presence(z); else if (act === 4) act4Presence(z); else if (act === 3) act3Presence(z); else if (z.id === 'town') townFires(z);
  } catch (e) { console.error(e); }
}
async function guestEnter(Z) {
  if (!own(ZONES, Z.id)) return;
  S.loading = true;
  const fade = document.getElementById('fade'); fade?.classList.add('on');
  try {
    await zoneReady(Z.id);
    if (S.role !== 'guest') return;
    for (const [, a] of S.pup) killPuppet(a);
    S.pup.clear();
    // (the other heroes' stand-ins go with the zone left; they come again in the next)
    for (const P of S.peers.values()) if (P.actor) { dropRemote(P.actor); P.actor = null; }
    carryLoot();
    // where the host stands in that zone, as its presence says (the snapshot's place is the zone before's): at its side
    const H = S.peers.get(S.hostPeer), Zh = H?.zone?.k === Z.k ? H.zone : Z;
    // (spread in depth too: a party that came in on one line has its names on one line)
    const at = fin(Zh.x) && fin(Zh.y) ? { x: num(Zh.x, -10, 1e4) / 20 + rand.range(-1.5, 1.5), z: num(Zh.y, -10, 1e4) / 20 + 1.5 + rand.range(-1, 1) } : 'waypoint';
    if (H) { H.state = null; H.buf.length = 0; }
    // the host's world on this page from now on (the zone is built with its difficulty and flags): G.hero a view of the
    // guest's own record with the host's story over it, the host's Shadow Gate
    if (!S.real) { S.real = G.hero; G.hero = viewHero(S.real, S.world); refreshStats(); }
    G.gate = gateOf(S.wgate);
    const prev = { ...G.zones };
    NET.mode = 'guest';
    // (the zone's own level; only a Shadow Gate's is the host's, within what an item may be: chests, urns and the drops on
    // this page roll at it). The host's zone this page has built already, the same one (its key), is kept as it was: its
    // chests opened, its shrines used, what lies on its ground
    // (a zone's key is the host's count of its zones, which every page starts again: this game's, its host's, its seed)
    const game = S.code + '/' + S.hostPeer, Zo = G.zones[Z.id];
    const kept = Zo?.netKey === Z.k && Zo.netGame === game && Zo.seed === (Z.s | 0);
    enterZone(Z.id, { fresh: !kept, seed: Z.s | 0, level: Z.id === 'gate' ? clamp(Z.l | 0, 1, MAX_ILVL - 3) : ZONES[Z.id].level, tier: clamp(Z.ti | 0, 0, 999), at });
    // (the guest's own zones from before the game, and any not this game's, are let go; this game's are kept by id, as
    // one's own are alone)
    // (one the build replaced, enterZone has let go already)
    for (const k in prev) if (prev[k] !== G.zone && G.zones[k] === prev[k] && (!prev[k].netKey || prev[k].netGame !== game)) { disposeZone(prev[k]); delete G.zones[k]; }
    // (by the host is where it can walk to the host from, not across a wall from it)
    if (typeof at === 'object') { const pl = G.player, f = besideHost(G.zone.map, Zh.x / 20, Zh.y / 20, pl.x, pl.z, 8); pl.x = f.x; pl.z = f.z; }
    G.zone.netKey = Z.k; G.zone.netGame = game; S.zoneKey = Z.k; S.lastSnap = now(); S.placeK = Z.k; NET.mode = 'guest'; emit('netMode');
    // the act's look again for the world as the host has it
    presenceAgain(G.zone);
  } catch (e) { console.error(e); }
  finally { S.loading = false; setTimeout(() => fade?.classList.remove('on'), 120); }
}
// a spot by the host at (hx, hz) for a hero put at (x, z): its floor if it walks to the host's in a few steps more than
// the straight way (R: the cells looked through round the host), else the nearest floor to it that does, else the host's
const WIN = {};
function besideHost(m, hx, hz, x, z, R) {
  const h = m.nearestFloor(num(hx, -10, 1e4), num(hz, -10, 1e4), 4), c = m.nearestFloor(x, z);
  if (m.solid(Math.floor(h.x), Math.floor(h.z))) return c;
  m.fillWindow(WIN, Math.floor(h.x), Math.floor(h.z), R);
  const W = 2 * R + 1, walks = (ix, iz) => { const cx = ix - WIN.x0, cz = iz - WIN.z0, d = cx >= 0 && cz >= 0 && cx < W && cz < W ? WIN.d[cz * W + cx] : 65535; return d !== 65535 && d <= 10 * (Math.hypot(ix + 0.5 - h.x, iz + 0.5 - h.z) + 3); };
  const ix = Math.floor(c.x), iz = Math.floor(c.z);
  if (walks(ix, iz)) return c;
  let best = h, bd = Infinity;
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const d = dx * dx + dz * dz; if (d < bd && walks(ix + dx, iz + dz)) { bd = d; best = { x: ix + dx + 0.5, z: iz + dz + 0.5 }; } }
  return best;
}
function onSnap(o) {
  if (!o || typeof o !== 'object') return;
  S.lastSnap = now();
  // (the deaths this snapshot tells, before the kills it pays: a kill is paid only for a monster seen dead)
  if (Array.isArray(o.a) && o.k === S.zoneKey && o.k === myKey()) for (const e of o.a) if (Array.isArray(e) && (e[6] & 1)) pupSeen(e, S.pup.get(e[0] | 0) || null);
  // this guest's own reliable events first (a clip's number may be given in the same snapshot)
  const mine = o.r && typeof o.r === 'object' && own(o.r, S.ch.me) && Array.isArray(o.r[S.ch.me]) ? o.r[S.ch.me] : [];
  for (const e of mine) {
    if (!Array.isArray(e)) continue;
    // (in order; the host sends all it still holds from the oldest this guest lacks: a gap is what it let go)
    const seq = e[0] | 0; if (seq <= S.relDone) continue;
    S.relDone = seq;
    try { relEvent(e.slice(1)); } catch (err) { console.error(err); }
  }
  // the host's acks: those events can go
  const ak = o.ak?.[S.ch.me] | 0;
  while (S.ev.length && S.ev[0][0] <= ak) S.ev.shift();
  if (o.k !== S.zoneKey || o.k !== myKey()) return;
  // the host's hero
  const H = S.peers.get(S.hostPeer);
  if (H && Array.isArray(o.h)) {
    const h = o.h;
    H.state = { x: num(h[0], -10, 1e4) / 20, z: num(h[1], -10, 1e4) / 20, r: num(h[2], -1e3, 1e3) / 100, sp: num(h[3], 0, 400) / 10, hp: num(h[4], 0, 1e8), hpMax: Math.max(1, num(h[5], 1, 1e8)), fl: h[6] | 0, y: num(h[7], -100, 400) / 20 };
    pushSample(H.buf, H.state);
    const name = S.hclips.get(h[8]); if (name) H.clip = { name, seq: h[9] | 0, spd: num(h[10], 1, 500, 100) / 100 };
    H.zk = o.k;
    // (the first snapshot of a zone just entered: a guest that came in far from the host, its place unknown, is put by it)
    const pl = G.player;
    if (S.placeK === o.k) {
      S.placeK = null;
      // (or one that came in where it cannot walk to the host)
      if (pl && !pl.dead) { const far = Math.hypot(pl.x - H.state.x, pl.z - H.state.z) > 16, f = besideHost(G.zone.map, H.state.x, H.state.z, far ? H.state.x + 1.2 : pl.x, far ? H.state.z + 1.2 : pl.z, 16); if (far || f.x !== pl.x || f.z !== pl.z) { pl.x = f.x; pl.z = f.z; } }
    }
  }
  // the tide and the gusts; the fires on the ice
  if (Array.isArray(o.w)) worldState(o.w);
  if (Array.isArray(o.l)) lit5(o.l);
  // the monsters
  if (Array.isArray(o.a)) for (const e of o.a) if (Array.isArray(e)) puppetEntry(e);
  // (the look of this guest's own blows it has shown already: passed over)
  if (Array.isArray(o.f)) { const sk = o.fs && typeof o.fs === 'object' && own(o.fs, S.ch.me) && Array.isArray(o.fs[S.ch.me]) ? new Set(o.fs[S.ch.me]) : null; replayFx(sk ? o.f.filter((e, i) => !sk.has(i)) : o.f, S.hostPeer); }
}
function onIce(o) { if (o && o.k === S.zoneKey && o.k === myKey()) netIce(G.zone, o.d); }
function worldState(w) {
  const z = G.zone, T = z?.tide;
  if (T) {
    const ht = num(w[0], 0, 1e5) / 10;
    // (the clock: put right when it has drifted half a second; a boss's hold as the host has it)
    if (Math.abs((T.t || 0) - ht) > 0.5) T.t = ht;
    const fh = w[1];
    if (fin(fh) && fh >= 0) T.force = { h: Math.min(fh, 1000) / 100, rate: num(w[2], 10, 1e4, 10) / 1000 };
    else if (T.force) T.force = null;
  }
  // (the gusts: this page's clock put right to the host's, both running the same 40 s, so its warning, its snow and its
  // Cold come with the host's and nothing else writes them; only a host that sends no clock has its 'on' laid over)
  const g = z?.gust;
  if (g && fin(w[4])) { const ht = num(w[4], 0, 400) / 10, d = (((g.t - ht) % 40) + 60) % 40 - 20; if (Math.abs(d) > 0.5) g.t = ht; }
  else if (g && !!w[3] !== !!g.on) { g.on = !!w[3]; emit('gust', g.on); }
}
// the fires on the ice as the host has them, lit or dark: the cairns and the open holes' lamps (their warmth and their
// lamp light on this page read them)
function lit5(l) {
  const z = G.zone, A = z?.act5; if (!A || z.id !== 'farlight') return;
  const c = l[0] | 0, h = l[1] | 0;
  for (const it of A.cairns) { const on = !!(c & (1 << (it.i & 31))); if (!!it.lit !== on) light5(z, it, on); }
  for (const it of A.lamps) { const on = !!(h & (1 << ((it.hole * 4 + it.i) & 31))); if (!!it.lit !== on) light5(z, it, on); }
}
// what the host may lay on this guest's hero, at most (the game's own sizes): hurtHero halves a freeze, roots stop at
// 1.2 s; a stun does nothing to a hero, so it is not taken
const HURT_MAX = { freeze: 4, seen: 6, root: 1.2, push: 40, cold: 100, poison: 1e8, burn: 1e8 };
function hurtOpts(oo) {
  const o = {}; if (!oo || typeof oo !== 'object') return o;
  // (the rest are marks: a burn's tick, a blow armour does not take, a shriek, the sea's)
  for (const k of HURT_KEYS) { const v = oo[k]; if (k === 'stun' || k === 'kx' || k === 'kz' || !fin(v) || v <= 0) continue; o[k] = own(HURT_MAX, k) ? Math.min(v, HURT_MAX[k]) : true; }
  if (oo.slow && fin(oo.slow.k) && fin(oo.slow.t)) o.slow = { k: clamp(oo.slow.k, 0, 0.9), t: clamp(oo.slow.t, 0, 6) };
  // (a push's way, as a direction)
  if (fin(oo.kx) && fin(oo.kz)) { const l = Math.hypot(oo.kx, oo.kz); if (l > 1e-6) { o.kx = oo.kx / l; o.kz = oo.kz / l; } }
  return o;
}
// the highest level anything in the host's zone can be (its monsters, the items they drop): the zone's own level, or its
// host's (monsters are the hero's level, two more on the hard difficulties), three more for a boss. The host's level is its
// own claim, as a guest's is (bounded by the game's top): never a number past what a hero of that level meets
const zoneTop = () => { const z = G.zone, H = S.peers.get(S.hostPeer), hl = clamp(H?.lk?.l | 0 || MAX_LEVEL, 1, MAX_LEVEL); return Math.min(MAX_ILVL, Math.max(z?.level | 0, hl + 2) + 3); };
// each zone's boss (the story's, and its echo): the only boss a kill there is paid as (in a Shadow Gate, its guardian)
const ZONE_BOSS = { forest: 'weaver', crypt: 'barrowLord', pass: 'stonewarden', halls: 'moltenKing', weep: 'silverhorn', heart: 'amaranthe', ashfield: 'ivar', forge: 'karthax', coast: 'tower', farlight: 'skotos' };
const GUARDS = new Set(['barrowLord', 'weaver', 'troll']);
// a monster as the host's snapshots showed it (its kind, level and rank; where and when it was seen dead): what a kill of
// it can be paid. One the host never showed, or never showed dead, is paid nothing
function pupSeen(e, a) {
  const id = e[0] | 0, kind = KINDS[e[1] | 0], fl = e[6] | 0; if (!kind || !MONSTERS[kind]) return null;
  let I = S.pupInfo.get(id);
  if (!I) {
    const zid = G.zone?.id, boss = zid === 'gate' ? !!(fl & 8192) && GUARDS.has(kind) : !!MONSTERS[kind].boss && ZONE_BOSS[zid] === kind;
    I = { kind, level: a ? a.level : clamp(e[11] | 0 || G.zone.level, 1, zoneTop()), boss, elite: fl & 64 ? 'rare' : fl & 32 ? 'champion' : null, minion: !!(fl & 128), deadT: 0 };
    S.pupInfo.set(id, I); if (S.pupInfo.size > 3000) S.pupInfo.delete(S.pupInfo.keys().next().value);
  }
  if ((fl & 1) && !I.deadT) { I.deadT = now(); I.x = (e[2] | 0) / 10; I.z = (e[3] | 0) / 10; }
  return I;
}
// what the zone can give, from its own plan (the packs this page built from the zone's seed, as the host did): its
// monsters at the most a party meets (bigger packs; a rare and its minions over them, or five champions, any pack being
// one), counted in its kinds' XP; its rares and champions; the most XP a kind of them gives. Each minute in the zone adds
// some (a tide's waves, what monsters call up)
function purseOf() {
  const z = G.zone, had = S.purses.get(S.zoneKey); if (had) return had;
  let u = 180, xp = 3, rares = 1, champs = 5;
  for (const p of z?.packs || []) {
    const tag = z.id === 'gate' ? 'gate' : p.tag;
    let m = 1; for (const k of [...(PACKS[tag] || []).map((w) => w[0]), ...(PACK_LEAD[tag] || [])]) m = Math.max(m, MONSTERS[k]?.xp || 0);
    xp = Math.max(xp, m);
    u += m * (Math.ceil((p.n | 0) * 1.2 * COOP.pack[3]) + (p.elite === 'rare' ? 13 : 15));
    if (p.elite === 'rare') rares++; else champs += 5;
  }
  const P = { t: now(), u, rares, champs, xp, used: 0, usedR: 0, usedC: 0 };
  S.purses.set(S.zoneKey, P); if (S.purses.size > 32) S.purses.delete(S.purses.keys().next().value);
  return P;
}
// what a kill can pay this guest at most: XP, a gold pile, the piles and items (data.js COOP, combat.js kill, with one
// player more than this page sees here), its kind's XP no more than the zone's best but for its boss
function killPay(I) {
  const D = DIFFS[clamp(S.world?.diff | 0, 0, DIFFS.length - 1)], L = clamp(I.level, 1, zoneTop()), boss = I.boss, elite = I.elite, k = clamp(NET.n, 1, 3);
  const em = boss ? 1 : elite === 'rare' ? 5 : elite === 'champion' ? 3 : I.minion ? 1.5 : 1, gf = Math.min((G.stats?.gold || 0) + 1, 401);
  const kx = boss ? MONSTERS[I.kind].xp : Math.min(MONSTERS[I.kind].xp, purseOf().xp);
  return { xp: Math.round(monsterXP(L) * kx * D.xp * em * COOP.xp[k]), gold: (3 + L * 1.6) * 1.4 * D.gold * (1 + gf / 100) * (boss ? 3 : 1) * COOP.gold[k], piles: boss ? 6 : elite ? 2 : 1, items: boss ? 4 + Math.floor(D.loot) + 3 : elite === 'rare' ? 3 : 1 };
}
// (kills paid a second: 40 at once, 8 a second after)
function killOk() { const B = S.killB, t = now(); B.tok = Math.min(40, B.tok + (t - B.t) / 1000 * 8); B.t = t; if (B.tok < 1) return false; B.tok--; return true; }
function relEvent(e) {
  const type = e[0], pl = G.player;
  if (type === 'cd') { if (typeof e[2] === 'string' && (S.hclips.size < 1024 || S.hclips.has(e[1] | 0))) S.hclips.set(e[1] | 0, e[2].slice(0, 47)); return; }
  if (type === 'h') {
    // a blow from one of the host's monsters
    if (!pl || pl.dead) return;
    const src = S.pup.get(e[1] | 0) || { team: 'foe', level: clamp(e[3] | 0, 1, zoneTop()), x: pl.x, z: pl.z, def: {}, dead: false, affixes: [] };
    const o = hurtOpts(e[4]);
    if (o.kx == null) { o.kx = pl.x - src.x; o.kz = pl.z - src.z; }
    damage(src, pl, num(e[2], 0, 1e8), o);
    return;
  }
  if (type === 'k') {
    // a kill near this guest: its own share of a monster the host showed it dying (in the last seconds, near it; a boss
    // anywhere), each paid once, no more than such a kill can pay; one boss of a kind for each zone entered
    const id = e[1] | 0, I = S.pupInfo.get(id);
    if (S.paid.has(id) || !I?.deadT || now() - I.deadT > 10000) return reject('k');
    if (!I.boss && pl && Math.hypot(pl.x - I.x, pl.z - I.z) > 65) return reject('k');
    if (!killOk()) return reject('k');
    // (no more than the zone can give: past its rares or champions one is paid as an ordinary monster, past what its
    // monsters are worth nothing)
    const P = purseOf(), mins = (now() - P.t) / 60000;
    if (I.boss) { const bk = S.zoneKey + ' ' + I.kind; if (S.bossPaid.has(bk)) I.boss = false; else S.bossPaid.add(bk); }
    if (I.elite === 'rare' && !I.boss && P.usedR++ >= P.rares + mins) I.elite = null;
    if (I.elite === 'champion' && P.usedC++ >= P.champs + mins * 5) I.elite = null;
    if (!I.boss) { const w = Math.min(MONSTERS[I.kind].xp, P.xp) * (I.elite === 'rare' ? 5 : I.elite === 'champion' ? 3 : I.minion ? 1.5 : 1); if (P.used + w > P.u + mins * 90) return reject('k'); P.used += w; }
    S.paid.add(id); if (S.paid.size > 5000) S.paid.delete(S.paid.values().next().value);
    const K = killPay(I), m = G.zone?.map;
    const x = clamp((e[2] | 0) / 10, 0, m?.w ?? 1e3), z = clamp((e[3] | 0) / 10, 0, m?.h ?? 1e3), xp = Math.min(num(e[4], 0, 1e9), K.xp);
    const h = S.real || G.hero;
    if (xp > 0) gainXP(xp);
    h.stats.kills++; if (I.elite) h.stats.elites++;
    const c = G.combo; c.n = c.t > 0 ? c.n + 1 : 1; c.t = 1.4;
    if (Array.isArray(e[5])) for (const g of e[5].slice(0, K.piles)) if (fin(g) && g >= 1) dropGold(x, z, Math.round(Math.min(g, K.gold)));
    if (e[7]) dropGlobe(x + rand.range(-0.5, 0.5), z + rand.range(-0.5, 0.5));
    if (G.stats?.legs?.has('beaconAmulet')) healHero(pl.hpMax * 0.05, true);
    S.owed = Math.min(40, S.owed + K.items);
    return;
  }
  if (type === 'it') {
    // an item rolled for this guest: only after a kill that could bring it, rebuilt as an item is, at most the zone's level
    if (S.owed < 1) return;
    const it = cleanItem(e[3], { maxIlvl: zoneTop(), rolled: true }); if (!it) return;
    S.owed--; it.isNew = true;
    const m = G.zone?.map;
    dropItem(clamp((e[1] | 0) / 10, 0, m?.w ?? 1e3), clamp((e[2] | 0) / 10, 0, m?.h ?? 1e3), it);
    return;
  }
  if (type === 'rv') { if (pl?.dead) revived(); return; }
  if (type === 'wp') { if (pl?.dead) respawnSelf(); return; }
  if (type === 'say') { if (typeof e[1] === 'string' && e[1].length < 64 && has(e[1])) { S.saying = true; try { emit('say', e[1]); } finally { S.saying = false; } } }
}
// a blow by this guest's hero on a puppet: shown here at once, sent to the host to land (its life comes back from it)
NET.h.hitPuppet = (src, tg, amount, o, crit) => {
  amount = Math.max(1, Math.round(amount));
  const oo = {};
  for (const k in OPT_NUM) if (typeof o[k] === 'number' && o[k] > 0) oo[k] = Math.round(o[k] * 100) / 100;
  if (o.slow?.k) oo.slow = { k: o.slow.k, t: o.slow.t };
  for (const k of ['area', 'dot', 'breakGuard', 'swing', 'quiet', 'noFx']) if (o[k]) oo[k] = 1;
  if (typeof o.kx === 'number') { oo.kx = Math.round(o.kx * 100) / 100; oo.kz = Math.round((o.kz || 0) * 100) / 100; }
  S.ev.push([++S.evSeq, 'h', tg.netId, amount, crit ? 1 : 0, oo]);
  if (S.ev.length > 300) S.ev.splice(0, S.ev.length - 300);
  // (the bar moves now; the host's number comes with the next snapshot)
  tg.hp = Math.max(1, tg.hp - amount * (tg.hpMax / Math.max(1, tg.netHpMax || tg.hpMax)));
  tg.predT = now();
  return amount;
};

// what this guest's skills do to the host's world besides their blows (skillsx.js, ice.js): pulls summed per monster and
// sent five times a second, a taunt and the ice at once; the host checks each (guestEvent) and does it by its own rules
function pushEv(e) { S.ev.push([++S.evSeq, ...e]); if (S.ev.length > 300) S.ev.splice(0, S.ev.length - 300); }
NET.h.pullPuppet = (f, ix, iz) => { if (!f.netId || !isFinite(ix) || !isFinite(iz)) return; const v = S.pulls.get(f.netId) || [0, 0]; v[0] += ix; v[1] += iz; S.pulls.set(f.netId, v); };
NET.h.tauntPuppet = (f, dur) => { if (f.netId) pushEv(['ta', f.netId, R2(dur)]); };
// (a refreeze answers 1: the guest plays its own sound for it; the host's crystals come in its snapshot)
NET.h.iceOp = (op, ...a) => { if (a.every((v) => typeof v === 'number' && isFinite(v))) pushEv(['ic', op, ...a.map(R2)]); return op === 'f' ? 1 : 0; };
function flushPulls() {
  if (!S.pulls.size || now() - S.pullT < 200) return;
  S.pullT = now(); let n = 0;
  for (const [id, v] of S.pulls) { if (n++ >= 12) break; pushEv(['pu', id, R2(v[0]), R2(v[1])]); }
  S.pulls.clear();
}

// ---------- puppets: the host's monsters on a guest's page ----------
function puppetEntry(e) {
  const id = e[0] | 0, kind = KINDS[e[1] | 0]; if (!kind || !MONSTERS[kind]) return;
  const x = (e[2] | 0) / 10, z = (e[3] | 0) / 10, rot = (e[4] | 0) / 20, fl = e[6] | 0;
  let a = S.pup.get(id);
  if (!a) {
    if (fl & 1) { pupSeen(e, null); return; } // (seen first dead: nothing to show, but what it was)
    try {
      a = spawnMonster(kind, x, z, { level: clamp(e[11] | 0 || G.zone.level, 1, zoneTop()), elite: fl & 64 ? 'rare' : fl & 32 ? 'champion' : null, minion: !!(fl & 128), affixes: [], dormant: !!(fl & 512) });
    } catch (err) { console.error(err); return; }
    a.puppet = true; a.netId = id; a.rot = rot; a.buf = []; a.seen = now(); a.clipSeq = -1;
    S.pupInfo.delete(id); pupSeen(e, a);
    if (fl & 4096) { a.team = 'hero'; a.pet = true; }
    if (a.avatar) R.scene.add(a.avatar.group);
    G.actors.push(a); S.pup.set(id, a);
  }
  a.seen = now();
  pushSample(a.buf, { x, z, r: rot, y: (e[10] | 0) / 10 });
  a.netSp = num(e[9], 0, 300) / 10;
  // (the host's top life for it: this page's blow moves the bar by its share of that)
  a.netHpMax = num(e[13], 1, 1e9, a.hpMax);
  // (its life as the host has it; a blow of this page's shown a moment before it lands keeps the bar where it is)
  const hp = clamp((e[5] | 0) / 255, 0, 1) * a.hpMax;
  if (!(a.predT && now() - a.predT < 350 && hp > a.hp)) a.hp = Math.max(fl & 1 ? 0 : 1, hp);
  if (fl & 256) { a.flash = 1; a.hpShow = 3; }
  a.netFl = fl;
  a.aggro = !!(fl & 4);
  a.hidden = !!(fl & 2) && !(fl & 1); a.airborne = !!(fl & 1024);
  a.status.freeze = fl & 8 ? 0.2 : 0; a.status.stun = fl & 16 ? 0.2 : 0;
  if (a.dormant && !(fl & 512)) { a.dormant = false; a.disguised = false; if (a.mesh) { a.mesh.parent?.remove(a.mesh); a.mesh = null; } }
  // the clip the host's avatar last played
  const name = S.hclips.get(e[7] | 0), seq = e[8] | 0;
  if (name && seq !== a.clipSeq) { if (a.clipSeq !== -1 || !(fl & 1)) a.avatar?.play(name, num(e[12], 1, 500, 100) / 100); a.clipSeq = seq; }
  if (fl & 1) pupSeen(e, a);
  if ((fl & 1) && !a.dead) { a.dead = true; a.deadT = 0; a.drowned = !!(fl & 16384); if (a.boss) emit('bossDown', a); }
  if (a.boss && a.aggro && !a.netIntro && !(fl & 1)) { a.netIntro = true; emit('bossIntro', a); }
}
const _ip = { x: 0, z: 0, r: 0, y: 0 };
function interp(buf, out = _ip) {
  const tt = now() - LAG;
  if (!buf.length) return null;
  let i = buf.length - 1; while (i > 0 && buf[i - 1].t > tt) i--;
  const b = buf[i], a = buf[Math.max(0, i - 1)];
  if (b.t <= tt || a === b) { out.x = b.x; out.z = b.z; out.r = b.r; out.y = b.y; return out; }
  const k = clamp((tt - a.t) / Math.max(1, b.t - a.t), 0, 1);
  out.x = a.x + (b.x - a.x) * k; out.z = a.z + (b.z - a.z) * k; out.y = a.y + (b.y - a.y) * k;
  let d = b.r - a.r; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  out.r = a.r + d * k;
  return out;
}
function puppetsTick(dt) {
  // anything foe on this page that is not the host's (a story scene's, a pack's) is not this world's
  for (let i = G.actors.length - 1; i >= 0; i--) { const a = G.actors[i]; if (a.team === 'foe' && !a.prop && !a.puppet && !a.removed && !a.netKeep) { a.remove(); G.actors.splice(i, 1); } }
  for (const [id, a] of S.pup) {
    if (a.removed) { S.pup.delete(id); continue; }
    if (now() - a.seen > 2500 && !a.dead) { killPuppet(a); S.pup.delete(id); continue; }
    const p = interp(a.buf);
    if (p) { a.x = p.x; a.z = p.z; a.rot = p.r; a.y = p.y; }
    a.flash = Math.max(0, (a.flash || 0) - dt * 6);
    if (a.hpShow > 0) a.hpShow -= dt;
    const av = a.avatar; if (!av) continue;
    av.group.position.set(a.x, a.y || 0, a.z); av.group.rotation.y = a.rot;
    if (a.dead) {
      a.deadT += dt;
      av.update(dt, { speed: 0, float: false }); av.setFlash(0);
      const k = clamp((a.deadT - (a.boss ? 3 : 1.6)) / 1.2, 0, 1); if (k > 0) av.setDissolve(k);
      if (k >= 1 || (a.drowned && a.deadT > 1.8)) { killPuppet(a); S.pup.delete(id); }
      continue;
    }
    av.group.visible = !a.hidden;
    const fz = (a.netFl & 8) || (a.netFl & 2048);
    if (fz && !a.frozenTint) { if (a.netFl & 2048) frozenLook(av); else av.setTint(0x80c8ff, 0.8); a.frozenTint = true; }
    else if (!fz && a.frozenTint) { av.setTint(a.baseTint ?? 0xffffff, a.baseTintAmt ?? 0); restoreRim(a); a.frozenTint = false; }
    av.update(fz ? 0 : dt, { speed: a.netSp || 0, runSpeed: a.speed, walkSpeed: Math.min(2.4, a.speed * 0.5), runNat: 5, float: a.def.float });
    av.setFlash(a.flash * 0.9);
  }
}
function killPuppet(a) { if (!a) return; a.dead = true; a.remove(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1); }

// ---------- the other heroes: an actor each, from their presence (and the host's from its snapshot) ----------
function lookHero(lk) {
  const cls = own(CLASSES, lk?.c) ? lk.c : 'warden';
  const w = Array.isArray(lk?.w) && own(BASES, lk.w[0]) ? { base: lk.w[0], rar: clamp(lk.w[1] | 0, 0, 3), leg: typeof lk.w[2] === 'string' ? lk.w[2] : null } : null;
  const o = Array.isArray(lk?.o) ? { base: 'shield', rar: clamp(lk.o[0] | 0, 0, 3), leg: typeof lk.o[1] === 'string' ? lk.o[1] : null } : null;
  return { cls, equip: { weapon: w, offhand: cls === 'warden' ? o : null } };
}
function addRemote(P) {
  const st = P.state || { x: G.player.x, z: G.player.z, hp: 100, hpMax: 100 };
  let av = null; try { av = heroAvatar(lookHero(P.lk)); } catch (e) { console.error(e); }
  const a = new Actor({ x: st.x, z: st.z, team: 'hero', kind: 'hero', radius: 0.45, speed: 5.4, hp: st.hp || 100, avatar: av, rot: st.r || 0 });
  a.remote = true; a.peer = P.peer; a.hpMax = st.hpMax || 100; a.level = P.lk?.l | 0 || 1;
  a.buffs = {}; a.cds = [0, 0, 0, 0, 0]; a.act = null; a.iframes = 0;
  a.lookKey = P.lookKey || '{}'; a.clipSeq = -1;
  G.actors.push(a); NET.remotes.push(a);
  return a;
}
function dropRemote(a) {
  if (!a) return;
  a.removed || a.remove();
  const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1);
  const j = NET.remotes.indexOf(a); if (j >= 0) NET.remotes.splice(j, 1);
}
function remotesTick(dt) {
  const key = myKey();
  if (S.role === 'guest') NET.n = 1 + NET.remotes.length;
  for (const P of S.peers.values()) {
    // a guest sees the host and the other guests in its zone; the host has made its stand-ins above
    if (S.role === 'guest') {
      const here = P.zk === key && key === S.zoneKey && P.state && (P.role === 'host' || P.code === S.code);
      if (here && !P.actor) P.actor = addRemote(P);
      else if (!here && P.actor) { dropRemote(P.actor); P.actor = null; }
    }
    const a = P.actor; if (!a || !P.state) continue;
    // its look changed (a new weapon): a new avatar
    const lk = P.lookKey || '{}';
    if (lk !== a.lookKey && a.avatar) { a.lookKey = lk; try { const nv = heroAvatar(lookHero(P.lk)); a.avatar.dispose(); a.avatar = nv; nv.actor = a; R.scene.add(nv.group); } catch (e) { console.error(e); } }
    const p = interp(P.buf);
    if (p) { a.x = p.x; a.z = p.z; a.rot = p.r; a.y = p.y; }
    a.hp = P.state.hp; a.hpMax = P.state.hpMax; a.level = P.lk?.l | 0 || a.level;
    const dead = !!(P.state.fl & 1);
    if (dead && !a.dead) { a.dead = true; a.downT = now(); a.avatar?.play('die', 1); }
    else if (!dead && a.dead) { a.dead = false; a.avatar?.anim.stop?.(0.2); }
    a.iframes = P.state.fl & 8 ? 0.2 : 0; a.y = a.y || 0;
    a.flash = Math.max(0, (a.flash || 0) - dt * 4);
    const av = a.avatar; if (!av) continue;
    if (P.clip && P.clip.seq !== a.clipSeq) { if (a.clipSeq !== -1 && !dead) av.play(P.clip.name, P.clip.spd); a.clipSeq = P.clip.seq; }
    av.group.position.set(a.x, a.y, a.z); av.group.rotation.y = a.rot;
    av.update(dt, { speed: dead ? 0 : P.state.sp, runSpeed: 5.6, walkSpeed: 2.2, runNat: 5.2 });
    av.setFlash(a.flash * 0.6);
  }
}
// the party as the HUD shows it: [{ peer, name, cls, lvl, hp, hpMax, dead, host, here, me }]
// the link is down or the host silent a moment (the HUD shows it)
export const stale = () => !!S.role && (!S.ch?.connected() || (S.role === 'guest' && S.zoneKey && now() - S.lastSnap > 2500));
export function party() {
  if (!S.role) return [];
  const out = [];
  const key = myKey();
  for (const P of S.peers.values()) {
    if (S.role === 'host' ? !S.roster.includes(P.peer) : !(P.role === 'host' || (P.role === 'guest' && P.code === S.code))) continue;
    out.push({ peer: P.peer, name: nameOf(P), cls: P.lk?.c || 'warden', lvl: P.lk?.l | 0, hp: P.state?.hp ?? 0, hpMax: P.state?.hpMax ?? 1, dead: !!(P.state?.fl & 1), host: P.role === 'host', here: P.zk === key, actor: P.actor });
  }
  out.sort((a, b) => (b.host ? 1 : 0) - (a.host ? 1 : 0));
  return out;
}

// ---------- downed and revived ----------
// called by boot.js on the hero's death in co-op, instead of the death panel
NET.h.downed = () => { S.downed = { t: DOWNED, at: now() }; emit('netDowned', true); };
export function respawnNow() { if (S.downed) respawnSelf(); }
function downedTick(dt) {
  const d = S.downed; if (!d) return;
  if (!G.player?.dead) { S.downed = null; emit('netDowned', false); return; }
  d.t -= dt;
  if (d.t <= 0) respawnSelf();
}
function respawnSelf() {
  S.downed = null; emit('netDowned', false);
  if (S.role === 'guest') {
    // up where the host's zone keeps its checkpoint (by the host, or the zone's waypoint or start)
    emit('respawn', 'net');
    const z = G.zone, pl = G.player, H = S.peers.get(S.hostPeer);
    const by = H?.state && !(H.state.fl & 1), at = by ? { x: H.state.x + 1.2, z: H.state.z + 1.2 } : z.checkpoint || z.L.spots.waypoint || z.L.start;
    const f = by ? besideHost(z.map, H.state.x, H.state.z, at.x, at.z, 8) : z.map.nearestFloor(at.x, at.z); pl.x = f.x; pl.z = f.z; pl.iframes = 2;
  } else emit('respawn', false);
}
function revived() {
  const pl = G.player; if (!pl?.dead) return;
  emit('respawn', 'net');
  pl.hp = Math.round(pl.hpMax * 0.4); pl.iframes = 2;
  S.downed = null; emit('netDowned', false);
  FX.glowBurst(pl.x, 1.2, pl.z, 0xfff0c0, 40, 3, 0.3, 0.8); FX.ring(pl.x, pl.z, 2.2, 0xffe0a0, 0.7);
  Audio.sfx('heal'); emit('toast', t('coop.revived'), 'quest');
}
// standing by a downed ally for REVIVE seconds brings them back (the host checks the guest's ask)
function reviveTick(dt) {
  const pl = G.player; if (!pl || pl.dead || G.mode !== 'play') { S.rv = null; return; }
  let tgt = null;
  for (const P of S.peers.values()) { const a = P.actor; if (a && a.dead && Math.hypot(a.x - pl.x, a.z - pl.z) < 1.8) { tgt = P; break; } }
  if (!tgt) { if (S.rv) emit('netRevive', 0); S.rv = null; return; }
  if (!S.rv || S.rv.peer !== tgt.peer) S.rv = { peer: tgt.peer, t: 0 };
  S.rv.t += dt;
  emit('netRevive', S.rv.t / REVIVE, nameOf(tgt));
  if (Math.random() < 0.4) FX.P({ x: tgt.actor.x + rand.range(-0.5, 0.5), y: rand.range(0.2, 1.6), z: tgt.actor.z + rand.range(-0.5, 0.5), vy: 1, life: 0.6, size: 0.12, size1: 0.02, color: 0xfff0c0 });
  if (S.rv.t >= REVIVE) {
    const who = tgt.peer; S.rv = null; emit('netRevive', 0);
    if (S.role === 'host') relTo(who, ['rv']);
    else S.ev.push([++S.evSeq, 'rv', who]);
    emit('toast', t('coop.reviving', nameOf(tgt)), 'quest');
  }
}
// a guest's interactables: its own chests, shrines and stash; the shops; nothing that moves the host's story
const GUEST_OK = new Set(['chest', 'shrine', 'stash']);
NET.h.canUse = (it) => {
  if (NET.mode !== 'guest') return true;
  if (GUEST_OK.has(it.kind)) return true;
  if (it.kind === 'npc') return ['smith', 'healer', 'brokka', 'elati'].includes(it.npc);
  return false;
};
NET.h.guestUse = (it) => {
  if (it.kind === 'npc') { emit('openPanel', it.npc === 'smith' ? 'smith' : 'vendor', it.npc === 'brokka' || it.npc === 'elati' ? { npc: it.npc } : undefined); return; }
  emit('toast', t('coop.hostLeads'));
};

// ---------- the fx mirror ----------
// codes for what is sent (FX: fx.js calls; 'p' a projectile, 'a' an area, 's' a sound, 'sap' a pool)
const FXN = ['explosion', 'ring', 'glowBurst', 'sparks', 'puff', 'flash', 'hitFx', 'decal', 'splash', 'iceShards', 'freezeCrystals', 'bolt', 'teleCircle', 'teleCone', 'teleLine', 'killTele', 'sapBurst', 'sfx', 'fire', 'area', 'sap', 'sapRing', 'visEnd'];
const FXI = new Map(FXN.map((n, i) => [n, i]));
// (what goes first when the message is full: what is played, then what is seen, then what is heard)
const PRIO = { teleCircle: 0, teleCone: 0, teleLine: 0, killTele: 0, fire: 0, area: 0, sap: 0, sapRing: 0, visEnd: 0, explosion: 1, decal: 1, hitFx: 2, ring: 2, bolt: 1, splash: 2, iceShards: 2, freezeCrystals: 2, sapBurst: 2, glowBurst: 3, sparks: 3, puff: 3, flash: 3, sfx: 3 };
let teleN = 0;
const R2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
function recFx(name, args, ret) {
  if (!FXI.has(name)) return;
  const list = S.role === 'host' ? (S.fxHost ||= []) : S.fxOut;
  if (list.length > 300) return;
  let a;
  if (name === 'killTele') { const tl = args[0]; if (!tl?.nid) return; a = [tl.nid]; }
  else if (name === 'fire') {
    const [kind, src, x, z, dir, o = {}] = args;
    a = [kind, src?.team === 'foe' ? 1 : 0, src?.id | 0, R2(x), R2(z), R2(dir), { speed: o.speed, y: o.y, life: o.life, r: o.r, dmg: R2(o.dmg), pierce: o.pierce, homing: o.homing, scale: o.scale, opts: optsOf(o.opts), look: LOOK_ID.get(o.look) }];
  } else if (name === 'area') {
    const [kind, x, z, r, dur, o = {}] = args;
    // (a hero effect of its own kind is sent only for its look: VIS, by name; its end comes as 'visEnd')
    if (kind === 'custom' && !(Array.isArray(o.vis) && VIS[o.vis[0]])) return;
    a = [kind, R2(x), R2(z), R2(r), R2(dur), o.team === 'foe' ? 1 : 0, o.src?.id | 0, R2(o.dmg), o.tick, optsOf(o.opts), R2(o.vx), R2(o.vz), (o.floats ? 1 : 0) | (o.dim ? 2 : 0) | (o.nowarm ? 4 : 0), LOOK_ID.get(o.look) || 0];
    if (kind === 'custom') { a.push(o.vis.slice(0, 4).map((v) => (typeof v === 'number' ? R2(v) : String(v).slice(0, 12)))); if (ret) { ret.nid = ++teleN; a.push(ret.nid); } }
  } else if (name === 'sap') {
    // (every pool but a hero's: most of the monsters' have no owner)
    const [x, z, r, dur, owner, kind] = args; if (owner && (owner.team === 'hero' || owner.hero || owner.remote)) return;
    a = [R2(x), R2(z), R2(r), R2(dur), kind || 'amber'];
  }
  else if (name === 'sapRing') a = args.slice(0, 5).map(R2);
  else if (name === 'sfx') { const [sn, o] = args; if (!o || o.x == null) return; a = [sn, R2(o.x), R2(o.z), o.vol != null ? R2(o.vol) : 1, o.pitch != null ? R2(o.pitch) : 1]; }
  else a = args.map((v) => (typeof v === 'number' ? R2(v) : v && typeof v === 'object' ? smallObj(v) : v));
  if (name.startsWith('tele') && ret) { ret.nid = ++teleN; a.push(ret.nid); }
  const pos = fxPos(name, a);
  // (the look of a guest's blow landing here, which its page has shown already: the guest it is. Only that blow's own
  // hit look on the monster it struck: what its death or a legendary's blow on another plays is the host's)
  const by = S.landing && MIRROR.look && MIRROR.look === S.landingA ? S.landing : undefined;
  list.push({ n: name, a, x: pos[0], z: pos[1], by });
}
function recGuestFx(name, args, ret) { if (MIRROR.hero) recFx(name, args, ret); }
const smallObj = (o) => { const r = {}; let n = 0; for (const k in o) { const v = o[k]; if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 24)) { r[k] = R2(v); if (++n > 8) break; } } return r; };
function optsOf(o) { if (!o || typeof o !== 'object') return undefined; const r = {}; for (const k of ['slow', 'freeze', 'poison', 'burn', 'root', 'push', 'stun', 'cold', 'pure', 'chill', 'knock', 'fear']) if (o[k] != null) r[k] = typeof o[k] === 'object' ? smallObj(o[k]) : R2(o[k]); return r; }
function fxPos(name, a) {
  switch (name) {
    case 'fire': return [a[3], a[4]];
    case 'area': return [a[1], a[2]];
    case 'sfx': return [a[1], a[2]];
    case 'killTele': case 'visEnd': return [null, null];
    case 'glowBurst': case 'sparks': case 'puff': case 'flash': case 'hitFx': case 'bolt': return [a[0], a[2]];
    default: return [a[0], a[1]];
  }
}
// near a guest (the host's) or anyone (a guest's), the most important first, under the byte cap (tags: for each guest,
// where in the list the look of its own blows is)
function packFx(list, cap, gs, tags) {
  const out = []; let b = 0;
  const near = (e) => e.x == null || !gs || gs.some((P) => Math.abs(P.actor.x - e.x) + Math.abs(P.actor.z - e.z) < NEAR);
  const sorted = list.filter(near).sort((x, y) => (PRIO[x.n] ?? 3) - (PRIO[y.n] ?? 3));
  for (const e of sorted) { const x = [FXI.get(e.n), ...e.a], n = bytesOf(x) + 1; if (b + n > cap) continue; if (e.by && tags) (tags[e.by] ||= []).push(out.length); out.push(x); b += n; }
  return out;
}
const TELES = new Map(), VISN = new Map();
// the looks by name both ways (skillsx.js LOOKS)
const LOOK_ID = new Map(Object.entries(LOOKS).map(([k, f]) => [f, k]));
function replayFx(list, from) {
  if (!Array.isArray(list) || !G.zone) return;
  // (each sender's calls a second are held to what a fight makes: 120 a message, FX_RATE a second)
  const B = S.fxIn.get(from) || { tok: FX_RATE, t: now() }, t = now();
  B.tok = Math.min(FX_RATE, B.tok + (t - B.t) / 1000 * FX_RATE); B.t = t; S.fxIn.set(from, B);
  if (S.fxIn.size > 16) for (const k of S.fxIn.keys()) if (k !== from && !S.peers.has(k)) S.fxIn.delete(k);
  const n = Math.min(list.length, 120, Math.floor(B.tok)); B.tok -= n;
  MIRROR.skip = true;
  try {
    for (const e of list.slice(0, n)) {
      if (!Array.isArray(e)) continue;
      const name = FXN[e[0] | 0], a = e.slice(1); if (!name) continue;
      try { replayOne(name, a, from); } catch (err) { /* a bad entry is skipped */ }
    }
  } finally { MIRROR.skip = false; }
}
const nums = (a, n) => { for (let i = 0; i < n; i++) if (typeof a[i] !== 'number' || !isFinite(a[i])) return false; return true; };
// what each look-only call may be, argument by argument, held to the game's own sizes before it is played (a peer's
// numbers never set how long a loop runs or a mesh lives): X Z a position on the map, Y a height, N a count, R a radius,
// E an explosion's, T a time, C a colour, S a speed, O a size, Q a stain's, F a spread, H a flash's, M a splash's scale,
// D a stain's life, A an angle, G an arc, L a length, W a width, U a direction, K a short name, B yes or no, o options
const FXS = { explosion: 'XZECo', ring: 'XZRCTY', glowBurst: 'XYZCNSOT', sparks: 'XYZNCSo', puff: 'XYZNCOFT', flash: 'XYZCHT', hitFx: 'XYZKUUB', decal: 'XZKQD', splash: 'XZM', iceShards: 'XZN', freezeCrystals: 'XZRN', bolt: 'XYZXYZCO', teleCircle: 'XZRTC', teleCone: 'XZARGTC', teleLine: 'XZALWTC', sapBurst: 'XZM' };
const FXR = { Y: [-5, 30], N: [0, 80], R: [0, 30], E: [0, 15], T: [0, 6], S: [0, 30], O: [0, 5], Q: [0, 10], F: [0, 10], H: [0, 20], M: [0, 3], D: [0, 30], A: [-1e3, 1e3], G: [0, 3.15], L: [0, 60], W: [0, 20], U: [-2, 2] };
const kindOk = (k) => typeof k === 'string' && k.length > 0 && k.length <= 24 && !(k in Object.prototype);
function fxArgs(spec, a) {
  const out = [], m = G.zone.map;
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i], v = a[i];
    if (c === 'X' || c === 'Z') { if (!fin(v)) return null; out.push(clamp(v, -20, (c === 'X' ? m.w : m.h) + 20)); }
    else if (c === 'C') out.push(v === undefined ? undefined : fin(v) ? v & 0xffffff : 0xffffff);
    else if (c === 'K') out.push(kindOk(v) ? v : undefined);
    else if (c === 'B') out.push(!!v);
    else if (c === 'o') { const r = {}; if (v && typeof v === 'object') { if (fin(v.shake)) r.shake = clamp(v.shake, 0, 1); if (fin(v.smoke)) r.smoke = v.smoke & 0xffffff; if (fin(v.dx)) r.dx = clamp(v.dx, -1, 1); if (fin(v.dz)) r.dz = clamp(v.dz, -1, 1); if (fin(v.color1)) r.color1 = v.color1 & 0xffffff; } out.push(r); }
    else out.push(fin(v) ? clamp(v, FXR[c][0], FXR[c][1]) : undefined);
  }
  return out;
}
// a projectile's or an area's options, field by field (what hurts this page's hero only from the host's own monsters)
function shotOpts(o, real) {
  const r = {}; if (!o || typeof o !== 'object') return r;
  const put = (k, lo, hi) => { if (fin(o[k])) r[k] = clamp(o[k], lo, hi); };
  put('speed', 0, 60); put('y', -2, 20); put('life', 0, 8); put('r', 0, 4); put('pierce', 0, 20); put('homing', 0, 10); put('scale', 0.1, 5);
  if (real) { put('dmg', 0, 1e8); r.opts = hurtOpts(o.opts); }
  return r;
}
// what a hero's skills fire and lay (skills.js, skillsx.js): all another hero's page may send; a monster's (a herd of ghosts, a wave,
// an orb) come from the host alone. The ones played from the net that a page holds at once are held too, a creature's
// ghost (an avatar each) the fewest
const HERO_SHOTS = new Set(['bolt', 'arcane', 'pierce', 'fireball', 'mini', 'blast', 'siege', 'cinder', 'spark', 'radiant', 'shard', 'frostorb']), HERO_AREAS = new Set(['tornado', 'rain', 'fire']);
const NET_SHOTS = 96, NET_AREAS = 64, NET_GHOSTS = 8;
const count = (list, f) => { let n = 0; for (const x of list) if (f(x)) n++; return n; };
function replayOne(name, a, from) {
  const fromHost = from === S.hostPeer && S.role === 'guest', m = G.zone.map, px = (v) => clamp(v, -20, m.w + 20), pz = (v) => clamp(v, -20, m.h + 20);
  if (name === 'fire') {
    const [kind, foe, sid, x, z, dir] = a; if (!nums([x, z, dir], 3) || !kindOk(kind)) return;
    if (!fromHost && !HERO_SHOTS.has(kind)) return;
    if (count(G.projs, (p) => p.net) >= NET_SHOTS || (kind === 'phantomHart' && count(G.projs, (p) => p.kind === kind) >= NET_GHOSTS)) return;
    const real = foe && fromHost;
    const src = real ? (S.pup.get(sid) || { team: 'foe', id: 0, level: clamp(G.zone.level, 1, zoneTop()), x, z, def: {}, affixes: [], dead: false }) : { team: 'vis', x, z };
    const oo = Object.assign(shotOpts(a[6], real), { team: real ? 'foe' : 'vis', net: true });
    oo.look = typeof a[6]?.look === 'string' && Object.hasOwn(LOOKS, a[6].look) ? LOOKS[a[6].look] : undefined;
    if (!real) oo.dmg = 0;
    fire(kind, src, px(x), pz(z), clamp(dir, -1e3, 1e3), oo);
    return;
  }
  if (name === 'area') {
    const [kind, x, z, r, dur, foe, sid, dmg, tick, opts, vx, vz, floats, lk, vis, nid] = a; if (!nums([x, z, r, dur], 4) || !kindOk(kind)) return;
    // (an orb bursts into a ring at its end: held with the rings)
    if (count(G.areas, (q) => q.net) >= NET_AREAS || (kind === 'frostOrb' && FX.FX.rings.length > 96)) return;
    // another hero's effect: drawn here by its look only (skillsx.js VIS), going about with that hero's actor here
    if (kind === 'custom') {
      if (!Array.isArray(vis) || typeof vis[0] !== 'string' || !Object.hasOwn(VIS, vis[0])) return;
      const who = VIS_FOLLOW.has(vis[0]) ? S.peers.get(from)?.actor : null; if (VIS_FOLLOW.has(vis[0]) && !who) return;
      const ar = { x: px(x), z: pz(z), r: clamp(r, 0.1, 30), dur: clamp(dur, 0, 30), t: 0 }, V = VIS[vis[0]](ar, vis.slice(1), who);
      const made = area('custom', ar.x, ar.z, ar.r, ar.dur, { team: 'vis', onTick: V.tick, dispose: V.dispose, light: V.light });
      if (made) made.net = true;
      if (typeof nid === 'number') { VISN.set(from + ':' + nid, made); if (VISN.size > 200) VISN.delete(VISN.keys().next().value); }
      return;
    }
    if (!fromHost && !HERO_AREAS.has(kind)) return;
    const real = foe && fromHost;
    const ar = area(kind, px(x), pz(z), clamp(r, 0.1, 30), clamp(dur, 0, 20), { team: real ? 'foe' : 'vis', src: real ? S.pup.get(sid) || { team: 'foe', level: clamp(G.zone.level, 1, zoneTop()), x, z, def: {} } : null, dmg: real ? num(dmg, 0, 1e8) : 0, tick: fin(tick) ? clamp(tick, 0.1, 5) : undefined, opts: real ? hurtOpts(opts) : {}, vx: num(vx, -20, 20), vz: num(vz, -20, 20), floats: !!(floats & 1), dim: !!(floats & 2), nowarm: !!(floats & 4), net: true, look: typeof lk === 'string' && Object.hasOwn(LOOKS, lk) ? LOOKS[lk] : undefined });
    if (ar) ar.net = true;
    return;
  }
  if (name === 'sap') { if (fromHost && nums(a, 4)) addSapPool(px(a[0]), pz(a[1]), clamp(a[2], 0.2, 12), clamp(a[3], 0, 30), { team: 'foe' }, kindOk(a[4]) ? a[4] : undefined); return; }
  if (name === 'sapRing') { if (fromHost && nums(a, 4)) { const r1 = clamp(a[3], 0.2, 20); addSapRing(px(a[0]), pz(a[1]), clamp(a[2], 0, r1), r1, fin(a[4]) ? clamp(a[4], 0, 30) : 6); } return; }
  if (name === 'sfx') { if (kindOk(a[0]) && nums(a.slice(1), 2)) Audio.sfx(a[0], { x: px(a[1]), z: pz(a[2]), vol: num(a[3], 0, 2, 1), pitch: num(a[4], 0.25, 4, 1) }); return; }
  if (name === 'killTele') { const tl = TELES.get(a[0]); if (tl) { tl.alive = false; TELES.delete(a[0]); } return; }
  if (name === 'visEnd') { const k = from + ':' + a[0], v = VISN.get(k); if (v) { v.done = true; VISN.delete(k); } return; }
  const fn = FX[name], spec = FXS[name]; if (typeof fn !== 'function' || !spec) return;
  // (the rings and telegraphs a page holds at once, each its own mesh, are held too)
  if ((name === 'ring' || name === 'explosion' || name === 'splash') && FX.FX.rings.length > 96) return;
  if (name.startsWith('tele') && FX.FX.teles.length > 128) return;
  // (a telegraph's own number rides last)
  const tele = name.startsWith('tele'), args = fxArgs(spec, tele ? a.slice(0, -1) : a); if (!args) return;
  // (a bolt no longer than a chain's longest jump)
  if (name === 'bolt') { const L = Math.hypot(args[3] - args[0], args[4] - args[1], args[5] - args[2]); if (L > 40) { const k = 40 / L; for (let i = 3; i < 6; i++) args[i] = args[i - 3] + (args[i] - args[i - 3]) * k; } }
  if (tele) {
    const id = a[a.length - 1]; const tl = fn(...args); if (tl && id) { TELES.set(id, tl); if (TELES.size > 200) TELES.delete(TELES.keys().next().value); }
    return;
  }
  fn(...args);
}
