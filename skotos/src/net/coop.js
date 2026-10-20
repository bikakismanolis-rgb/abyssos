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
import { pickTransport, bytesOf, MAX_MSG } from './transport.js';
import { SUPABASE } from './netcfg.js';
import { enterZone, zoneReady, disposeZone, act3Presence, act4Presence, act5Presence, townFires, ZONES } from '../game/world.js';
import { spawnMonster, Actor, heroAvatar, freshStatus, frozenLook, restoreRim } from '../game/actors.js';
import { damage, gainXP, healHero } from '../game/combat.js';
import { MONSTERS, DIFFS, monsterXP, COOP, BASES, LEGENDARIES, MAX_LEVEL, CLASSES } from '../game/data.js';
import { makeItem } from '../game/items.js';
import { dropGold, dropItem, dropGlobe } from '../game/pickups.js';
import { fire, area } from '../game/projectiles.js';
import { addSapPool } from '../game/sap.js';
import { netIce, iceDigest } from '../game/ice.js';
import { writeSave } from '../game/save.js';
import * as FX from '../gfx/fx.js';
import { R } from '../gfx/gfx.js';
import Audio from '../audio/audio.js';
import { on, emit } from '../ui/bus.js';
import { t } from '../i18n/i18n.js';
import { clamp, rand } from '../core/util.js';

export const VER = 1;
const SNAP_HZ = 10, SNAP_MAX = 3900, REL_MAX = 1700, FX_MAX = 900, NEAR = 40, CHUNK = 3300, HOST_LOST = 8000, DOWNED = 30, REVIVE = 2.5, LAG = 130;
const CODE_CH = 'abcdefghjkmnpqrstuvwxyz23456789';
const KINDS = Object.keys(MONSTERS), KIDX = new Map(KINDS.map((k, i) => [k, i]));
// what a page sees of the session (the lobby panel and the HUD read it)
export const S = {
  T: null, ready: false, avail: false, role: null, code: null, ch: null, started: false, status: 'idle', err: null,
  hostPeer: null, peers: new Map(), roster: [], hosts: [], names: {}, me: null,
  // the host: reliable events, their acks, the guests' events done, the clip names given out; the world and ice versions
  rel: [], relSeq: 0, done: new Map(), clips: new Map(), worldSent: '', worldT: 0, iceT: 0, iceKey: '', snapT: 0, lobbyT: 0,
  // a guest: the world as the host has it, the zone loaded, puppets, the events not yet acked, the host's clip names
  real: null, world: null, wkey: '', zoneKey: null, loading: false, pup: new Map(), ev: [], evSeq: 0, relDone: 0, hclips: new Map(), lastSnap: 0, chunks: {},
  downed: null, rv: null, fxOut: [], fxT: 0, stats: { snaps: 0, snapBytes: 0, rejected: 0, hits: 0 }
};
const now = () => performance.now();
const q = (v, k) => Math.round((+v || 0) * k);
const num = (v, lo, hi, d = 0) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);

// ---------- start-up: is there anything to play with? ----------
export async function initNet(params) {
  try { S.T = await pickTransport(params, SUPABASE); } catch (e) { S.T = null; }
  S.avail = !!S.T; S.ready = true;
  if (!S.T) { emit('netReady', false); return; }
  S.me = S.T.lobby?.me || S.T.me || null;
  // who hosts what, from the lobby
  S.T.lobby?.onPeers(() => lobbyHosts());
  lobbyHosts();
  resolveNames();
  emit('netReady', true);
}
function lobbyHosts() {
  const L = S.T?.lobby; if (!L) return;
  S.hosts = L.peers().filter((p) => !p.isMe && p.presence?.g && typeof p.presence.g.c === 'string').map((p) => ({ peer: p.peer, by: p.by, ...p.presence.g })).filter((h) => /^[a-z0-9]{4}$/.test(h.c)).slice(0, 20);
  emit('netLobby');
}
// names through the artifact's `user` capability (profiles), where there is one; else the class and level
let users = null;
async function resolveNames() {
  if (users === null) { users = false; try { users = (await window.claude?.use?.('user')) || false; } catch (e) { users = false; } }
  if (!users?.profiles) return;
  const ids = new Set(); for (const ch of [S.T?.lobby, S.ch]) for (const p of ch?.peers() || []) if (p.by && !(p.by in S.names)) ids.add(p.by);
  if (!ids.size) return;
  try { const ps = await users.profiles([...ids]); for (const id of ids) S.names[id] = (ps?.[id]?.name || '').slice(0, 24); emit('netLobby'); } catch (e) { /* names are a nicety */ }
}
export function nameOf(p) {
  const n = p?.by && S.names[p.by];
  if (n) return n;
  const lk = p?.lk || p?.presence?.lk || p?.look;
  return lk ? t('class.' + (CLASSES[lk.c] ? lk.c : 'warden')) + ' ' + (lk.l | 0) : '…';
}

// ---------- hosting, joining, leaving ----------
const newCode = () => Array.from({ length: 4 }, () => CODE_CH[(Math.random() * CODE_CH.length) | 0]).join('');
export async function hostGame() {
  if (!S.T || S.role || !G.hero || !G.zone) return false;
  S.status = 'connecting'; emit('netLobby');
  const code = newCode();
  try { S.ch = await S.T.join('skotos-' + code); } catch (e) { S.status = 'error'; S.err = e?.code || e?.message; emit('netLobby'); return false; }
  S.role = 'host'; S.code = code; S.started = false; S.status = 'open'; NET.mode = 'host';
  S.rel.length = 0; S.relSeq = 0; S.done.clear(); S.clips.clear(); S.worldSent = '';
  wire(); hostPresence(true); lobbyPresence(true);
  emit('netLobby'); emit('netMode');
  return code;
}
export function startGame() { if (S.role !== 'host') return; S.started = true; hostPresence(true); lobbyPresence(true); emit('netLobby'); emit('toast', t('coop.started'), 'quest'); }
export async function joinGame(code) {
  code = String(code || '').toLowerCase().trim();
  if (!S.T || S.role || !G.hero || !/^[a-z0-9]{4}$/.test(code)) return false;
  S.status = 'connecting'; emit('netLobby');
  try { S.ch = await S.T.join('skotos-' + code); } catch (e) { S.status = 'error'; S.err = e?.code || e?.message; emit('netLobby'); return false; }
  S.role = 'guest'; S.code = code; S.status = 'waiting'; S.hostPeer = null; S.lastSnap = now(); S.joinT = now();
  S.ev.length = 0; S.evSeq = 0; S.relDone = 0; S.hclips.clear(); S.world = null; S.wkey = ''; S.zoneKey = null; S.chunks = {};
  wire(); guestPresence(true);
  emit('netLobby');
  return true;
}
export async function leaveGame(why) {
  const role = S.role; if (!role) return;
  if (role === 'guest') goHome(why);
  for (const r of NET.remotes) dropRemote(r);
  NET.remotes.length = 0;
  for (const [, a] of S.pup) killPuppet(a);
  S.pup.clear();
  const ch = S.ch; S.ch = null; S.role = null; S.code = null; S.started = false; S.status = 'idle'; S.hostPeer = null; S.peers.clear(); S.roster = []; S.downed = null; S.rv = null;
  NET.mode = null; NET.n = 1; MIRROR.rec = null;
  if (role === 'host') { rescale(); S.T?.lobby?.presence({ g: null }); }
  try { await ch?.leave(); } catch (e) { /* gone */ }
  emit('netLobby'); emit('netMode');
  if (why) emit('toast', t(why), 'quest');
}
// a guest back in its own world: its own hero record, its own town (the host's zones it held are dropped)
function goHome() {
  if (S.real) { G.hero = S.real; S.real = null; }
  const pl = G.player;
  if (pl?.dead) { pl.dead = false; pl.hp = pl.hpMax; pl.status = freshStatus(); }
  for (const k of Object.keys(G.zones)) if (G.zones[k] !== G.zone) { disposeZone(G.zones[k]); delete G.zones[k]; }
  const z0 = G.zone;
  NET.mode = null;
  later(0.05, () => { emit('travel', 'town', { at: 'waypoint', fresh: true }); later(1.5, () => { if (z0 && G.zone !== z0 && !Object.values(G.zones).includes(z0)) disposeZone(z0); }); });
  writeSave();
}

// ---------- the game room's wires ----------
function wire() {
  const ch = S.ch;
  ch.onPeers(() => { peersChanged(); resolveNames(); });
  ch.on('s', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer) onSnap(m.data); });
  ch.on('w', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer) chunk(m.data, onWorld); });
  ch.on('i', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer) chunk(m.data, onIce); });
  ch.on('f', (m) => { if (S.peers.get(m.peer)?.zk === myKey()) replayFx(m.data, m.peer); });
  ch.on('c', (m) => { if (S.role === 'guest' && m.peer === S.hostPeer && m.data?.op === 'end') leaveGame('coop.hostLeft'); });
  ch.onConnection((c) => { if (!c && S.role) S.lostT = now(); else S.lostT = 0; emit('netLobby'); });
}
// who is in the room: a host keeps the first three guests of its version (the roster); a guest finds its host
function peersChanged() {
  const ch = S.ch; if (!ch) return;
  const seen = new Set();
  for (const p of ch.peers()) {
    if (p.isMe) continue;
    seen.add(p.peer);
    let P = S.peers.get(p.peer);
    if (!P) S.peers.set(p.peer, (P = { peer: p.peer, by: p.by, buf: [], seq: -1, actor: null, joined: now() }));
    P.pres = p.presence || {}; P.by = p.by;
    readPeer(P);
  }
  for (const [k, P] of S.peers) if (!seen.has(k)) { if (P.actor) dropRemote(P.actor); S.peers.delete(k); S.done.delete(k); if (S.role === 'host') emit('toast', t('coop.left', nameOf(P)), 'quest'); if (k === S.hostPeer) leaveGame('coop.hostLeft'); }
  if (S.role === 'host') {
    const guests = [...S.peers.values()].filter((P) => P.role === 'guest' && P.code === S.code && P.v === VER).sort((a, b) => a.joined - b.joined);
    const roster = guests.slice(0, 3).map((P) => P.peer);
    for (const pr of roster) if (!S.roster.includes(pr)) { const P = S.peers.get(pr); emit('toast', t('coop.joined', nameOf(P)), 'quest'); Audio.sfx('waypoint', { vol: 0.5 }); }
    if (roster.join() !== S.roster.join()) { S.roster = roster; hostPresence(true); }
  } else if (S.role === 'guest') {
    const h = [...S.peers.values()].find((P) => P.role === 'host' && P.code === S.code);
    if (h && !S.hostPeer) S.hostPeer = h.peer;
    if (h && h.v !== VER) { leaveGame('coop.version'); return; }
    // (not in the host's roster once it has one: the game is full)
    if (h && h.roster && !h.roster.includes(S.ch.me) && now() - S.joinT > 4000) { leaveGame('coop.full'); return; }
  }
  emit('netLobby');
}
function readPeer(P) {
  const p = P.pres;
  P.role = p.r === 'h' ? 'host' : p.r === 'g' ? 'guest' : null; P.code = p.c; P.v = p.v | 0;
  P.lk = p.lk && typeof p.lk === 'object' ? p.lk : P.lk; P.zk = typeof p.zk === 'string' ? p.zk : null;
  P.roster = Array.isArray(p.ro) ? p.ro.filter((x) => typeof x === 'string').slice(0, 3) : null;
  P.zone = p.z && typeof p.z === 'object' ? p.z : null; P.on = !!p.on;
  P.mf = num(p.mf, 0, 400); P.gf = num(p.gf, 0, 400); P.dmax = num(p.dm, 0, 1e7);
  if (Array.isArray(p.h)) {
    const h = p.h; P.state = { x: num(h[0], -10, 1e4) / 20, z: num(h[1], -10, 1e4) / 20, r: num(h[2], -1e3, 1e3) / 100, sp: num(h[3], 0, 400) / 10, hp: num(h[4], 0, 1e8), hpMax: Math.max(1, num(h[5], 1, 1e8)), fl: h[6] | 0, y: num(h[7], -100, 400) / 20 };
    pushSample(P.buf, P.state);
  }
  if (Array.isArray(p.c2) && typeof p.c2[0] === 'string' && p.c2[0].length < 48) P.clip = { name: p.c2[0], spd: num(p.c2[1], 0.05, 5, 1), seq: p.c2[2] | 0 };
  P.ack = p.ak | 0;
  P.ev = Array.isArray(p.ev) ? p.ev : [];
  P.need = p.nd || null;
}
const pushSample = (buf, s) => { buf.push({ t: now(), x: s.x, z: s.z, r: s.r, y: s.y || 0 }); if (buf.length > 6) buf.shift(); };
// (a zone's key: the same id built once more is another zone, a guest builds it again)
export const myKey = () => (G.zone ? G.zone.id + ':' + (G.zone.ep || 0) : null);

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
  if (!S.ch || !G.hero) return;
  const z = G.zone;
  const p = { r: 'h', c: S.code, v: VER, lk: lookOf(), zk: myKey(), ro: S.roster, on: S.started ? 1 : 0, mf: 0 };
  if (z) p.z = { id: z.id, s: z.seed | 0, l: z.level | 0, ti: z.tier | 0, d: G.hero.diff | 0, k: myKey() };
  if (full || !S.presT || now() - S.presT > 1000) { S.ch.presence(p); S.presT = now(); }
}
function lobbyPresence(force) {
  const L = S.T?.lobby; if (!L || S.role !== 'host' || !G.hero) return;
  if (!force && now() - S.lobbyT < 2500) return;
  S.lobbyT = now();
  L.presence({ g: { c: S.code, cls: G.hero.cls, l: G.hero.level, z: G.zone?.id || 'town', n: 1 + S.roster.length, d: G.hero.diff | 0, v: VER, on: S.started ? 1 : 0 } });
}
function guestPresence() {
  if (!S.ch || !G.hero) return;
  const h = S.real || G.hero, pl = G.player, s = G.stats;
  const p = { h: null, c2: null, nd: null, ev: null, r: 'g', c: S.code, v: VER, lk: { c: h.cls, l: h.level, w: h.equip.weapon ? [h.equip.weapon.base, h.equip.weapon.rar | 0, h.equip.weapon.leg || 0] : 0, o: h.equip.offhand ? [h.equip.offhand.rar | 0, h.equip.offhand.leg || 0] : 0 }, zk: S.zoneKey, ak: S.relDone, mf: Math.round(s?.mf || 0), gf: Math.round(s?.gold || 0), dm: Math.round((s?.wmax || 1) * (s?.dmgMult || 1)) };
  if (pl && S.zoneKey && S.zoneKey === myKey()) { p.h = heroState(); const av = pl.avatar; if (av?.netSeq) p.c2 = [av.netClip, Math.round((av.netSpd || 1) * 100) / 100, av.netSeq]; }
  if (!S.world) p.nd = 'w';
  // the events the host has not acked, oldest first, as many as fit
  const ev = []; let b = bytesOf(p) + 10;
  for (const e of S.ev) { const n = bytesOf(e) + 1; if (b + n > 3600) break; ev.push(e); b += n; }
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
  hostPresence(false); lobbyPresence(false);
  const key = myKey();
  // the guests here: their stand-ins, their events
  let n = 1;
  for (const pr of S.roster) {
    const P = S.peers.get(pr); if (!P) continue;
    const here = S.started && P.zk === key && P.state;
    if (here) {
      n++;
      if (!P.actor) P.actor = addRemote(P);
      takeEvents(P);
    } else if (P.actor) { dropRemote(P.actor); P.actor = null; }
  }
  for (const P of S.peers.values()) if (P.actor && !S.roster.includes(P.peer)) { dropRemote(P.actor); P.actor = null; }
  if (n !== NET.n) { NET.n = n; rescale(); }
  // the world, when it changed or someone asks for it
  const wk = worldKey();
  const asked = [...S.peers.values()].some((P) => P.need === 'w' && S.roster.includes(P.peer));
  if ((wk !== S.worldSent || (asked && now() - S.worldT > 1500) || now() - S.worldT > 12000) && S.roster.length) { S.worldSent = wk; S.worldT = now(); sendBig('w', worldOf()); }
  // the ice: what changed, at most twice a second, all of it every 3 s
  const I = z.ice;
  if (I && S.roster.length && now() - S.iceT > 500) { const dg = iceDigest(z); if (dg && (dg.key !== S.iceKey || now() - S.iceT > 3000)) { S.iceKey = dg.key; S.iceT = now(); sendBig('i', { k: key, d: dg.d }); } }
  // the snapshot
  if (S.roster.length && S.started && now() - S.snapT >= 1000 / SNAP_HZ) { S.snapT = now(); sendSnap(); }
  if (!S.roster.length || !S.started) S.fxHost = [];
  // the reliable events every guest has seen are let go (and none kept past 30 s)
  const acks = S.roster.map((pr) => S.peers.get(pr)?.ack ?? 0), lo = acks.length ? Math.min(...acks) : S.relSeq;
  const tooOld = now() - 30000;
  while (S.rel.length && (S.rel[0].seq <= lo || S.rel[0].t < tooOld)) S.rel.shift();
  // a wipe: every hero down for 3 s, the host gets up at its checkpoint and its guests by it
  const all = pl.dead && NET.remotes.length > 0 && NET.remotes.every((r) => r.dead);
  if (all) { S.wipeT = (S.wipeT || 0) + dt; if (S.wipeT > 3) { S.wipeT = 0; relTo('', ['wp']); if (S.downed) respawnSelf(); } } else S.wipeT = 0;
}
function worldOf() {
  const h = G.hero;
  return { flags: h.flags, quest: h.quest, diff: h.diff, wps: h.wps, a: [h.act1, h.act2, h.act3, h.act4, h.act5], gb: h.gateBest | 0, gate: G.gate ? { tier: G.gate.tier } : null, clips: [...S.clips] };
}
function worldKey() { const h = G.hero; return JSON.stringify(h.flags).length + ':' + h.quest + ':' + h.diff + ':' + hashStr(JSON.stringify(h.flags)); }
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
// a reliable event: kept and sent in every snapshot until each guest it is for has acked it
function relTo(to, data) { S.rel.push({ seq: ++S.relSeq, to: to || '', d: data, t: now() }); if (S.rel.length > 400) S.rel.splice(0, 100); }
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
  // the tide as it stands (a guest's clock follows it), a boss's hold on it, the gusts
  const z = G.zone, T = z.tide;
  if (T) o.w = [q(T.t, 10), T.force ? q(T.force.h, 100) : -1, T.force ? q(T.force.rate, 1000) : 0, z.gust?.on ? 1 : 0];
  else if (z.gust) o.w = [0, -1, 0, z.gust.on ? 1 : 0];
  // acks of each guest's events
  o.ak = {}; for (const P of gs) o.ak[P.peer] = S.done.get(P.peer) || 0;
  let b = bytesOf(o) + 20;
  // the reliable events still owed (oldest first)
  const lo = Math.min(...gs.map((P) => P.ack || 0)), r = [];
  let rb = 0;
  for (const e of S.rel) { if (e.seq <= lo) continue; const x = [e.seq, e.to, ...e.d], n = bytesOf(x) + 1; if (rb + n > REL_MAX) break; r.push(x); rb += n; }
  if (r.length) { o.r = r; b += rb + 6; }
  // what the host saw happen near them
  const f = packFx(S.fxHost || [], FX_MAX, gs);
  S.fxHost = [];
  if (f.length) { o.f = f; b += bytesOf(f) + 6; }
  // the actors near any guest, nearest first, as many as fit
  const list = [];
  for (const a of G.actors) {
    if (a.removed || a.remote || a.team === 'npc' || a.prop || !KIDX.has(a.kind)) continue;
    if (a.dead && a.deadT > 4) continue;
    let d = Infinity; for (const P of gs) d = Math.min(d, Math.abs(a.x - P.actor.x) + Math.abs(a.z - P.actor.z));
    if (d > NEAR * 1.3 && !a.boss) continue;
    list.push([d, a]);
  }
  list.sort((x, y) => x[0] - y[0]);
  const A = [];
  for (const [, a] of list) {
    const e = actorEntry(a), n = bytesOf(e) + 1;
    if (b + n > SNAP_MAX) break;
    A.push(e); b += n;
  }
  o.a = A;
  S.stats.snaps++; S.stats.snapBytes += b;
  S.ch.emit('s', o);
}
const ACT_DT = new Map();
function actorEntry(a) {
  const av = a.avatar, hpF = a.hpMax > 0 ? Math.round(clamp(a.hp / a.hpMax, 0, 1) * 255) : 0;
  // its speed: from where it was at the last snapshot
  const lp = ACT_DT.get(a) || { x: a.x, z: a.z, t: now() }, dtt = Math.max(0.03, (now() - lp.t) / 1000), sp = Math.hypot(a.x - lp.x, a.z - lp.z) / dtt;
  ACT_DT.set(a, { x: a.x, z: a.z, t: now() });
  const fl = (a.dead ? 1 : 0) | (a.hidden || a.under || (a.avatar && !a.avatar.group.visible && !a.dead) ? 2 : 0) | (a.aggro ? 4 : 0) | (a.status.freeze > 0 ? 8 : 0) | (a.status.stun > 0 ? 16 : 0)
    | (a.elite === 'champion' ? 32 : 0) | (a.elite === 'rare' ? 64 : 0) | (a.minion ? 128 : 0) | (a.flash > 0.5 ? 256 : 0) | (a.dormant ? 512 : 0) | (a.airborne ? 1024 : 0) | (a.statue && !a.awake ? 2048 : 0) | (a.team === 'hero' ? 4096 : 0) | (a.boss ? 8192 : 0) | (a.drowned ? 16384 : 0);
  return [a.id, KIDX.get(a.kind), q(a.x, 10), q(a.z, 10), q(((a.rot % 6.2832) + 6.2832) % 6.2832, 20), hpF, fl, clipIdx(av?.netClip), (av?.netSeq || 0) & 1023, q(Math.min(sp, 30), 10), q(a.y || 0, 10), a.level | 0, Math.round((av?.netSpd || 1) * 100)];
}
// the monsters' life (and a boss's) by the players here (data.js COOP), each keeping its share of life
export function rescale() {
  const i = clamp(NET.n, 1, 4) - 1;
  for (const a of G.actors) {
    if (a.team !== 'foe' || a.prop || a.dead) continue;
    const k = (a.boss ? COOP.boss : COOP.hp)[i];
    const k0 = a.coopK || 1; if (k0 === k) continue;
    const f = a.hp / a.hpMax, m = k / k0;
    a.hpMax *= m; a.hp = f * a.hpMax; if (a.hpFloor) a.hpFloor *= m; a.coopK = k;
  }
}
// the coop factors for this page's rewards and the spawns (index: players here)
export const coopK = () => { const i = clamp(NET.n, 1, 4) - 1; return { i, xp: COOP.xp[i], gold: COOP.gold[i], loot: COOP.loot[i], mf: COOP.mf[i], pack: COOP.pack[i], elite: COOP.elite[i], hp: COOP.hp[i], boss: COOP.boss[i], dmg: COOP.dmg[i] }; };

// a guest's events: its blows on the host's monsters, a revive. Each is checked: what it strikes is here and alive,
// within reach of the guest's stand-in; the blow no bigger than its weapon can make and the guest under a rate
const OPT_NUM = { stun: 3, freeze: 4, chill: 5, fear: 4, knock: 40, burn: 1e7, root: 2 };
function takeEvents(P) {
  let last = S.done.get(P.peer) || 0;
  const ev = P.ev || [];
  for (const e of ev) {
    if (!Array.isArray(e)) continue;
    const seq = e[0] | 0; if (seq <= last) continue;
    if (seq !== last + 1 && last !== 0) break; // (a gap: wait for it, the guest sends everything unacked)
    last = seq;
    try { guestEvent(P, e); } catch (err) { S.stats.rejected++; }
  }
  S.done.set(P.peer, last);
}
function guestEvent(P, e) {
  const type = e[1], me = P.actor;
  if (type === 'h') {
    const id = e[2] | 0, amt = e[3], crit = !!e[4], o = e[5] && typeof e[5] === 'object' ? e[5] : {};
    const a = G.actors.find((x) => x.id === id);
    if (!a || a.dead || a.removed || a.team !== 'foe' || a.prop) return;
    if (Math.hypot(a.x - me.x, a.z - me.z) > 26 + (a.radius || 0.5)) { S.stats.rejected++; return; }
    const lvl = clamp(P.lk?.l | 0, 1, MAX_LEVEL), cap = Math.max(60, Math.min(P.dmax || 0, (12 + lvl * 9) * 8) * 14);
    if (!(typeof amt === 'number' && isFinite(amt) && amt > 0 && amt <= cap)) { S.stats.rejected++; return; }
    // the rate: what a second of its hits may come to
    const R0 = P.rate ||= { t: now(), sum: 0 };
    if (now() - R0.t > 1000) { R0.t = now(); R0.sum = 0; }
    R0.sum += amt; if (R0.sum > cap * 12) { S.stats.rejected++; return; }
    const opts = { crit, net: true };
    for (const k in OPT_NUM) if (typeof o[k] === 'number' && isFinite(o[k]) && o[k] > 0) opts[k] = Math.min(o[k], OPT_NUM[k] === 1e7 ? cap : OPT_NUM[k]);
    if (o.slow && typeof o.slow.k === 'number' && typeof o.slow.t === 'number') opts.slow = { k: clamp(o.slow.k, 0, 0.8), t: clamp(o.slow.t, 0, 5) };
    for (const k of ['area', 'dot', 'breakGuard', 'swing', 'quiet', 'noFx']) if (o[k]) opts[k] = true;
    if (typeof o.kx === 'number' && typeof o.kz === 'number' && isFinite(o.kx) && isFinite(o.kz)) { opts.kx = o.kx; opts.kz = o.kz; }
    S.stats.hits++;
    damage(me, a, amt, opts);
  } else if (type === 'rv') {
    // a revive: the reviver (this guest) stands by the downed one
    const who = e[2];
    if (who === S.ch.me) { if (G.player?.dead && Math.hypot(G.player.x - me.x, G.player.z - me.z) < 3.5) revived(); }
    else { const T0 = S.peers.get(who); if (T0?.actor && T0.actor.dead && Math.hypot(T0.actor.x - me.x, T0.actor.z - me.z) < 3.5) relTo(who, ['rv']); }
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
    const cls = CLASSES[P.lk?.c] ? P.lk.c : 'warden', mf = Math.min(P.mf || 0, 400) + K.mf, gf = Math.min(P.gf || 0, 400);
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
  // the host gone quiet: home
  if (S.zoneKey && now() - S.lastSnap > HOST_LOST && (!H || H.zk === S.zoneKey)) { leaveGame('coop.lost'); return; }
  if (S.role === 'guest' && !S.hostPeer && now() - S.joinT > 10000) { leaveGame('coop.noHost'); return; }
  // the host's zone: built here from its seed with the host's world (once the world has come)
  if (H?.on && H.zone && S.world && !S.loading && H.zone.k !== S.zoneKey) guestEnter(H.zone);
  if (S.zoneKey && S.zoneKey === myKey()) { MIRROR.rec = recGuestFx; puppetsTick(dt); }
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
  const W = { flags, quest: num(w.quest, 0, 99), diff: clamp(w.diff | 0, 0, DIFFS.length - 1), wps: Array.isArray(w.wps) ? w.wps.slice(0, 40) : ['town'], act1: a[0] ?? -1, act2: a[1] ?? -1, act3: a[2] ?? -1, act4: a[3] ?? -1, act5: a[4] ?? -1, gateBest: w.gb | 0, seeds: {} };
  const key = JSON.stringify(W);
  if (key === S.wkey) return;
  const first = !S.world;
  S.wkey = key;
  if (S.world) Object.assign(S.world, W); else S.world = W;
  G.gate = w.gate ? { tier: w.gate.tier | 0, progress: 0, guardian: null, start: performance.now(), done: false } : null;
  if (!S.real) { S.real = G.hero; G.hero = viewHero(S.real, S.world); }
  // what the story has lit and moved, laid on the zone again
  if (!first && G.zone && S.zoneKey === myKey()) presenceAgain(G.zone);
}
function presenceAgain(z) {
  try {
    const act = ZONES[z.id]?.act;
    if (act === 5) act5Presence(z); else if (act === 4) act4Presence(z); else if (act === 3) act3Presence(z); else if (z.id === 'town') townFires(z);
  } catch (e) { console.error(e); }
}
async function guestEnter(Z) {
  if (typeof Z.id !== 'string' || !ZONES[Z.id]) return;
  S.loading = true;
  const fade = document.getElementById('fade'); fade?.classList.add('on');
  try {
    await zoneReady(Z.id);
    if (S.role !== 'guest') return;
    for (const [, a] of S.pup) killPuppet(a);
    S.pup.clear();
    const H = S.peers.get(S.hostPeer), at = H?.state ? { x: H.state.x + rand.range(-1.5, 1.5), z: H.state.z + 1.5 } : 'waypoint';
    const prev = { ...G.zones };
    enterZone(Z.id, { fresh: true, seed: Z.s | 0, level: Z.l | 0, tier: Z.ti | 0, at });
    // (the zones built before, the guest's own or the host's last, are let go)
    for (const k in prev) if (prev[k] !== G.zone) { disposeZone(prev[k]); if (G.zones[k] === prev[k]) delete G.zones[k]; }
    S.zoneKey = Z.k; S.lastSnap = now();
    // the act's look again for the world as the host has it
    presenceAgain(G.zone);
  } catch (e) { console.error(e); }
  finally { S.loading = false; setTimeout(() => fade?.classList.remove('on'), 120); }
}
function onSnap(o) {
  if (!o || typeof o !== 'object') return;
  S.lastSnap = now();
  // the reliable events first (a clip's number may be given in the same snapshot)
  if (Array.isArray(o.r)) for (const e of o.r) {
    if (!Array.isArray(e)) continue;
    const seq = e[0] | 0; if (seq <= S.relDone) continue;
    if (seq !== S.relDone + 1 && S.relDone !== 0) break;
    S.relDone = seq;
    if (e[1] && e[1] !== S.ch.me) continue;
    try { relEvent(e.slice(2)); } catch (err) { console.error(err); }
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
  }
  // the tide and the gusts
  if (Array.isArray(o.w)) worldState(o.w);
  // the monsters
  if (Array.isArray(o.a)) for (const e of o.a) if (Array.isArray(e)) puppetEntry(e);
  if (Array.isArray(o.f)) replayFx(o.f, S.hostPeer);
}
function onIce(o) { if (o && o.k === S.zoneKey && o.k === myKey()) netIce(G.zone, o.d); }
function worldState(w) {
  const z = G.zone, T = z?.tide;
  if (T) {
    const ht = num(w[0], 0, 1e5) / 10;
    // (the clock: put right when it has drifted half a second; a boss's hold as the host has it)
    if (Math.abs((T.t || 0) - ht) > 0.5) T.t = ht;
    const fh = w[1];
    if (typeof fh === 'number' && fh >= 0) T.force = { h: fh / 100, rate: Math.max(0.01, (w[2] || 0) / 1000) };
    else if (T.force) T.force = null;
  }
  if (z?.gust && !!w[3] !== !!z.gust.on) { z.gust.on = !!w[3]; emit('gust', z.gust.on); }
}
function relEvent(e) {
  const type = e[0], pl = G.player;
  if (type === 'cd') { if (typeof e[2] === 'string') S.hclips.set(e[1] | 0, e[2]); return; }
  if (type === 'h') {
    // a blow from one of the host's monsters
    if (!pl || pl.dead) return;
    const src = S.pup.get(e[1] | 0) || { team: 'foe', level: e[3] | 0, x: pl.x, z: pl.z, def: {}, dead: false, affixes: [] };
    const o = {}; const oo = e[4] || {};
    for (const k of HURT_KEYS) if (typeof oo[k] === 'number') o[k] = oo[k];
    if (oo.slow && typeof oo.slow.k === 'number') o.slow = { k: clamp(oo.slow.k, 0, 0.9), t: clamp(oo.slow.t, 0, 6) };
    if (o.kx == null) { o.kx = pl.x - src.x; o.kz = pl.z - src.z; }
    damage(src, pl, num(e[2], 0, 1e8), o);
    return;
  }
  if (type === 'k') {
    // a kill near this guest: its own share
    const x = (e[2] | 0) / 10, z = (e[3] | 0) / 10, xp = num(e[4], 0, 1e9);
    const h = S.real || G.hero;
    if (xp > 0) gainXP(xp);
    h.stats.kills++; if (e[8]) h.stats.elites++;
    const c = G.combo; c.n = c.t > 0 ? c.n + 1 : 1; c.t = 1.4;
    if (Array.isArray(e[5])) for (const g of e[5].slice(0, 8)) if (g > 0) dropGold(x, z, Math.min(Math.round(g), 1e7));
    if (e[7]) dropGlobe(x + rand.range(-0.5, 0.5), z + rand.range(-0.5, 0.5));
    if (G.stats?.legs?.has('beaconAmulet')) healHero(pl.hpMax * 0.05, true);
    return;
  }
  if (type === 'it') { const it = cleanItem(e[3]); if (it) dropItem((e[1] | 0) / 10, (e[2] | 0) / 10, it); return; }
  if (type === 'rv') { if (pl?.dead) revived(); return; }
  if (type === 'wp') { if (pl?.dead) respawnSelf(); return; }
  if (type === 'say') { if (typeof e[1] === 'string' && e[1].length < 64) { S.saying = true; try { emit('say', e[1]); } finally { S.saying = false; } } }
}
// an item the host rolled: only what an item is made of, so a bad page cannot put anything else in this save
function cleanItem(it) {
  if (!it || typeof it !== 'object' || !BASES[it.base]) return null;
  const out = { id: String(it.id || Date.now().toString(36)).slice(0, 40), base: it.base, rar: clamp(it.rar | 0, 0, 3), ilvl: clamp(it.ilvl | 0, 1, 99), stats: {} };
  if (Array.isArray(it.dmg)) out.dmg = [num(it.dmg[0], 0, 1e6), num(it.dmg[1], 0, 1e6)];
  if (typeof it.spd === 'number') out.spd = num(it.spd, 0.1, 5, 1);
  if (typeof it.armor === 'number') out.armor = num(it.armor, 0, 1e6);
  if (typeof it.block === 'number') out.block = num(it.block, 0, 100);
  if (it.leg && LEGENDARIES.some((l) => l.id === it.leg)) out.leg = it.leg;
  if (it.stats && typeof it.stats === 'object') for (const k in it.stats) {
    const v = it.stats[k];
    if (k === 'skill' && v && typeof v.id === 'string') out.stats.skill = { id: v.id.slice(0, 24), v: num(v.v, 0, 10) };
    else if (typeof v === 'number' && isFinite(v) && /^[a-zA-Z]{1,16}$/.test(k)) out.stats[k] = v;
  }
  for (const k of Object.keys(it)) if (!(k in out) && /^[a-zA-Z]{1,16}$/.test(k) && (typeof it[k] === 'number' || typeof it[k] === 'string' && it[k].length < 40 || typeof it[k] === 'boolean')) out[k] = it[k];
  out.isNew = true;
  return out;
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

// ---------- puppets: the host's monsters on a guest's page ----------
function puppetEntry(e) {
  const id = e[0] | 0, kind = KINDS[e[1] | 0]; if (!kind || !MONSTERS[kind]) return;
  const x = (e[2] | 0) / 10, z = (e[3] | 0) / 10, rot = (e[4] | 0) / 20, fl = e[6] | 0;
  let a = S.pup.get(id);
  if (!a) {
    if (fl & 1) return; // (seen first dead: nothing to show)
    try {
      a = spawnMonster(kind, x, z, { level: e[11] | 0 || G.zone.level, elite: fl & 64 ? 'rare' : fl & 32 ? 'champion' : null, minion: !!(fl & 128), affixes: [], dormant: !!(fl & 512) });
    } catch (err) { console.error(err); return; }
    a.puppet = true; a.netId = id; a.rot = rot; a.buf = []; a.seen = now(); a.clipSeq = -1;
    if (fl & 4096) { a.team = 'hero'; a.pet = true; }
    if (a.avatar) R.scene.add(a.avatar.group);
    G.actors.push(a); S.pup.set(id, a);
  }
  a.seen = now();
  a.buf.push({ t: now(), x, z, r: rot, y: (e[10] | 0) / 10 }); if (a.buf.length > 6) a.buf.shift();
  a.netSp = (e[9] | 0) / 10;
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
  const cls = CLASSES[lk?.c] ? lk.c : 'warden';
  const w = Array.isArray(lk?.w) && BASES[lk.w[0]] ? { base: lk.w[0], rar: clamp(lk.w[1] | 0, 0, 3), leg: typeof lk.w[2] === 'string' ? lk.w[2] : null } : null;
  const o = Array.isArray(lk?.o) ? { base: 'shield', rar: clamp(lk.o[0] | 0, 0, 3), leg: typeof lk.o[1] === 'string' ? lk.o[1] : null } : null;
  return { cls, equip: { weapon: w, offhand: cls === 'warden' ? o : null } };
}
function addRemote(P) {
  const st = P.state || { x: G.player.x, z: G.player.z, hp: 100, hpMax: 100 };
  let av = null; try { av = heroAvatar(lookHero(P.lk)); } catch (e) { console.error(e); }
  const a = new Actor({ x: st.x, z: st.z, team: 'hero', kind: 'hero', radius: 0.45, speed: 5.4, hp: st.hp || 100, avatar: av, rot: st.r || 0 });
  a.remote = true; a.peer = P.peer; a.hpMax = st.hpMax || 100; a.level = P.lk?.l | 0 || 1;
  a.buffs = {}; a.cds = [0, 0, 0, 0, 0]; a.act = null; a.iframes = 0;
  a.lookKey = JSON.stringify(P.lk || {}); a.clipSeq = -1;
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
    const lk = JSON.stringify(P.lk || {});
    if (lk !== a.lookKey && a.avatar) { a.lookKey = lk; try { const nv = heroAvatar(lookHero(P.lk)); a.avatar.dispose(); a.avatar = nv; nv.actor = a; R.scene.add(nv.group); } catch (e) { console.error(e); } }
    const p = interp(P.buf);
    if (p) { a.x = p.x; a.z = p.z; a.rot = p.r; a.y = p.y; }
    a.hp = P.state.hp; a.hpMax = P.state.hpMax; a.level = P.lk?.l | 0 || a.level;
    const dead = !!(P.state.fl & 1);
    if (dead && !a.dead) { a.dead = true; a.avatar?.play('die', 1); }
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
NET.h.downed = () => { S.downed = { t: DOWNED }; emit('netDowned', true); };
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
    const at = H?.state && !(H.state.fl & 1) ? { x: H.state.x + 1.2, z: H.state.z + 1.2 } : z.checkpoint || z.L.spots.waypoint || z.L.start;
    const f = z.map.nearestFloor(at.x, at.z); pl.x = f.x; pl.z = f.z; pl.iframes = 2;
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
  emit('netRevive', S.rv.t / REVIVE);
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
const FXN = ['explosion', 'ring', 'glowBurst', 'sparks', 'puff', 'flash', 'hitFx', 'decal', 'splash', 'iceShards', 'freezeCrystals', 'bolt', 'teleCircle', 'teleCone', 'teleLine', 'killTele', 'sapBurst', 'sfx', 'fire', 'area', 'sap'];
const FXI = new Map(FXN.map((n, i) => [n, i]));
// (what goes first when the message is full: what is played, then what is seen, then what is heard)
const PRIO = { teleCircle: 0, teleCone: 0, teleLine: 0, killTele: 0, fire: 0, area: 0, sap: 0, explosion: 1, decal: 1, hitFx: 2, ring: 2, bolt: 1, splash: 2, iceShards: 2, freezeCrystals: 2, sapBurst: 2, glowBurst: 3, sparks: 3, puff: 3, flash: 3, sfx: 3 };
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
    a = [kind, src?.team === 'foe' ? 1 : 0, src?.id | 0, R2(x), R2(z), R2(dir), { speed: o.speed, y: o.y, life: o.life, r: o.r, dmg: R2(o.dmg), pierce: o.pierce, homing: o.homing, scale: o.scale, opts: optsOf(o.opts) }];
  } else if (name === 'area') {
    const [kind, x, z, r, dur, o = {}] = args;
    a = [kind, R2(x), R2(z), R2(r), R2(dur), o.team === 'foe' ? 1 : 0, o.src?.id | 0, R2(o.dmg), o.tick, optsOf(o.opts), R2(o.vx), R2(o.vz), o.floats ? 1 : 0];
  } else if (name === 'sap') { const [x, z, r, dur, owner, kind] = args; if (owner?.team !== 'foe') return; a = [R2(x), R2(z), R2(r), R2(dur), kind || 'amber']; }
  else if (name === 'sfx') { const [sn, o] = args; if (!o || o.x == null) return; a = [sn, R2(o.x), R2(o.z), o.vol != null ? R2(o.vol) : 1, o.pitch != null ? R2(o.pitch) : 1]; }
  else a = args.map((v) => (typeof v === 'number' ? R2(v) : v && typeof v === 'object' ? smallObj(v) : v));
  if (name.startsWith('tele') && ret) { ret.nid = ++teleN; a.push(ret.nid); }
  const pos = fxPos(name, a);
  list.push({ n: name, a, x: pos[0], z: pos[1] });
}
function recGuestFx(name, args, ret) { if (MIRROR.hero) recFx(name, args, ret); }
const smallObj = (o) => { const r = {}; let n = 0; for (const k in o) { const v = o[k]; if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 24)) { r[k] = R2(v); if (++n > 8) break; } } return r; };
function optsOf(o) { if (!o || typeof o !== 'object') return undefined; const r = {}; for (const k of ['slow', 'freeze', 'poison', 'burn', 'root', 'push', 'stun', 'cold', 'pure', 'chill', 'knock', 'fear']) if (o[k] != null) r[k] = typeof o[k] === 'object' ? smallObj(o[k]) : R2(o[k]); return r; }
function fxPos(name, a) {
  switch (name) {
    case 'fire': return [a[3], a[4]];
    case 'area': return [a[1], a[2]];
    case 'sfx': return [a[1], a[2]];
    case 'killTele': return [null, null];
    case 'glowBurst': case 'sparks': case 'puff': case 'flash': case 'hitFx': case 'bolt': return [a[0], a[2]];
    default: return [a[0], a[1]];
  }
}
// near a guest (the host's) or anyone (a guest's), the most important first, under the byte cap
function packFx(list, cap, gs) {
  const out = []; let b = 0;
  const near = (e) => e.x == null || !gs || gs.some((P) => Math.abs(P.actor.x - e.x) + Math.abs(P.actor.z - e.z) < NEAR);
  const sorted = list.filter(near).sort((x, y) => (PRIO[x.n] ?? 3) - (PRIO[y.n] ?? 3));
  for (const e of sorted) { const x = [FXI.get(e.n), ...e.a], n = bytesOf(x) + 1; if (b + n > cap) continue; out.push(x); b += n; }
  return out;
}
const TELES = new Map();
function replayFx(list, from) {
  if (!Array.isArray(list) || !G.zone) return;
  MIRROR.skip = true;
  try {
    for (const e of list.slice(0, 120)) {
      if (!Array.isArray(e)) continue;
      const name = FXN[e[0] | 0], a = e.slice(1); if (!name) continue;
      try { replayOne(name, a, from); } catch (err) { /* a bad entry is skipped */ }
    }
  } finally { MIRROR.skip = false; }
}
const nums = (a, n) => { for (let i = 0; i < n; i++) if (typeof a[i] !== 'number' || !isFinite(a[i])) return false; return true; };
function replayOne(name, a, from) {
  const fromHost = from === S.hostPeer && S.role === 'guest';
  if (name === 'fire') {
    const [kind, foe, sid, x, z, dir, o] = a; if (!nums([x, z, dir], 3) || typeof kind !== 'string') return;
    const real = foe && fromHost;
    const src = real ? (S.pup.get(sid) || { team: 'foe', id: 0, level: G.zone.level, x, z, def: {}, affixes: [], dead: false }) : { team: 'vis', x, z };
    const oo = Object.assign({}, o || {}, { team: real ? 'foe' : 'vis', net: true });
    if (!real) oo.dmg = 0;
    fire(kind, src, x, z, dir, oo);
    return;
  }
  if (name === 'area') {
    const [kind, x, z, r, dur, foe, sid, dmg, tick, opts, vx, vz, floats] = a; if (!nums([x, z, r, dur], 4) || typeof kind !== 'string') return;
    const real = foe && fromHost;
    area(kind, x, z, clamp(r, 0.1, 30), clamp(dur, 0, 30), { team: real ? 'foe' : 'vis', src: real ? S.pup.get(sid) || { team: 'foe', level: G.zone.level, x, z, def: {} } : null, dmg: real ? dmg : 0, tick, opts, vx, vz, floats: !!floats, net: true });
    return;
  }
  if (name === 'sap') { if (fromHost && nums(a, 4)) addSapPool(a[0], a[1], clamp(a[2], 0.2, 12), clamp(a[3], 0, 30), { team: 'foe' }, a[4]); return; }
  if (name === 'sfx') { if (typeof a[0] === 'string' && nums(a.slice(1), 2)) Audio.sfx(a[0], { x: a[1], z: a[2], vol: a[3], pitch: a[4] }); return; }
  if (name === 'killTele') { const tl = TELES.get(a[0]); if (tl) { tl.alive = false; TELES.delete(a[0]); } return; }
  const fn = FX[name]; if (typeof fn !== 'function') return;
  if (name.startsWith('tele')) {
    const id = a.pop(); const tl = fn(...a); if (tl && id) { TELES.set(id, tl); if (TELES.size > 200) TELES.delete(TELES.keys().next().value); }
    return;
  }
  fn(...a);
}
