// Co-op transports: one channel shape over three wires. The game (net/coop.js) only ever sees a Channel:
//   ch.me                       this page's peer label
//   ch.emit(topic, data, o)     a moment to everyone in the channel (own echo dropped); resolves true when handed off,
//                               false when dropped (too big, over budget, disconnected). o.must: queue past the budget
//   ch.on(topic, fn)            fn({ topic, data, peer, by }) for what others send; returns the unsubscribe
//   ch.presence(patch)          merged into this page's presence (null removes a field); sent coalesced, at most PRES_HZ
//   ch.peers()                  [{ peer, by, isMe, presence, updatedAt }], this page included
//   ch.onPeers(fn)              fn({ peers, joined, left, updated }) when the room changes
//   ch.connected(), ch.onConnection(fn), ch.leave()
//   ch.presenceDue()            true when a presence given now would go at once (a page builds its own no oftener)
//   ch.onError(fn)              fn(code, how): a send the room refused ('send': not_permitted, or a terminal code) or the
//                               room ended for this page ('room': what its listeners heard)
//   ch.meter                    what went out and came in: { tx: { msgs, bytes, drops, big, why }, rx: { msgs, bytes },
//                               rate() }; tx.why: each drop by its reason, the room's or server's code (rate_limited,
//                               too_big, no_game, ...) or the page's own (big, offline, budget, timeout, busy)
//   ch.host                     (a game's channel, on a transport whose server keeps the games: Supabase, stamped) the
//                               peer the server says hosts it; undefined elsewhere, where the game finds its host itself
//   ch.econ                     (a game's channel that bundles what a page says: Supabase, stamped) the rates the game
//                               holds itself to there, { snap, pres } a second; undefined elsewhere (the game's own)
//   ch.ready(), ch.room()       (econ) whether what is given now would go at once, and the bytes a message given now
//                               still has room for beside what waits; ch.relayOmit: the presence fields a host does not
//                               pass on to the others (the ones only the host reads)
// A transport: { kind, lobby: Channel | null, join(name, { host }) -> Promise<Channel> } (host: this page hosts the
// game; only a transport whose server keeps the games reads it). Three of them:
// - RoomTransport (claude.ai artifact `room`): the lobby is the room itself, a game is room.join(name). The room's own
//   budget (~40 sends a second per page, emits and presence together, burst 80; 4 KiB a message and 4 KiB of presence)
//   is held here below it: BUDGET sends a second, the coalesced presence counted in.
// - LocalTransport (BroadcastChannel): pages of one browser, for the tests; drops and lag on demand (o.drop, o.lag).
// - SupabaseTransport (Supabase Realtime broadcast and presence, supabase-js v2): for the app and the public web build,
//   the sender of each message written by the server (stamped: private channels, sends by RPC; docs/coop/supabase.md),
//   a game's channel held to an economy (bundles, guests' outboxes the host passes on: ECON below, docs/coop/diet.md).
// Nothing a peer sends is trusted (coop.js validates); a transport only moves JSON and counts it.

export const MAX_MSG = 4096, MAX_PRES = 4096, BUDGET = 32, BURST = 64, PRES_HZ = 10;
// (the room's codes that end it for the page load: its grant withdrawn or never given, the capability gone; any other
// code is upstream_error, passing)
export const TERMINAL = new Set(['revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error']);
export const TOPIC = /^[a-z][a-z0-9_.-]{0,47}$/, ROOM = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
export const bytesOf = (v) => { const s = JSON.stringify(v ?? null); return enc ? enc.encode(s).length : s.length; };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// what a channel sent and heard: the totals, and the rates over the last 5 whole seconds (a count for each second, six
// kept: nothing grows with the session). What is heard is not stringified again only to be counted: each kind's size
// (a topic from a peer, a peer's presence) is measured once in eight and the others taken as that size. Every message
// given up is a drop, counted by why (tx.why: sixteen reasons at most, the rest as 'other'): what the room or the server
// refused, by its code, and what the page gave up itself ('big' over the cap, 'offline' not connected, 'budget' over
// its bucket, 'timeout' a call past its deadline, 'busy' too many waiting for a call)
export function makeMeter() {
  const M = { tx: { msgs: 0, bytes: 0, drops: 0, big: 0, why: {} }, rx: { msgs: 0, bytes: 0 }, peak: 0 }, W = Array.from({ length: 6 }, () => [-1, 0, 0, 0, 0]), est = new Map();
  M.drop = (e) => { M.tx.drops++; let k = String((typeof e === 'string' ? e : e?.code) || 'upstream_error').slice(0, 64); const y = M.tx.why; if (!(k in y) && Object.keys(y).length >= 16) k = 'other'; y[k] = (y[k] || 0) + 1; };
  const sec = () => { const s = Math.floor(now() / 1000), w = W[s % 6]; if (w[0] !== s) { w[0] = s; w[1] = w[2] = w[3] = w[4] = 0; } return w; };
  M.out = (b) => { M.tx.msgs++; M.tx.bytes += b; const w = sec(); w[1]++; w[2] += b; };
  M.in = (b) => { M.rx.msgs++; M.rx.bytes += b; const w = sec(); w[3]++; w[4] += b; };
  M.heard = (k, v) => { let e = est.get(k); if (!e) { if (est.size > 64) est.clear(); est.set(k, (e = { n: 0, b: 0 })); } if (e.n++ % 8 === 0) e.b = bytesOf(v); M.in(e.b); };
  M.rate = () => {
    const s = Math.floor(now() / 1000); let n = 0, bo = 0, bi = 0, ni = 0;
    for (const w of W) if (w[0] >= s - 5 && w[0] < s) { n += w[1]; bo += w[2]; ni += w[3]; bi += w[4]; }
    const r = { msgsOut: n / 5, bytesOut: bo / 5, msgsIn: ni / 5, bytesIn: bi / 5 };
    if (r.msgsOut > M.peak) M.peak = r.msgsOut;
    return r;
  };
  return M;
}
// a token bucket under the room's budget: every emit and every presence send takes one
export function makeBucket(rate = BUDGET, burst = BURST) {
  let tok = burst, t0 = now();
  const fill = () => { const t = now(); tok = Math.min(burst, tok + (t - t0) / 1000 * rate); t0 = t; };
  return { take() { fill(); if (tok < 1) return false; tok--; return true; }, get level() { fill(); return tok; } };
}

// The channel every transport builds on: budget, size limits, presence coalescing, the meter. A wire supplies
// send(topic, data), sendPresence(obj), leave(), and calls ch._hear(msg), ch._peers(list), ch._conn(bool)
export function makeChannel(name, wire, o = {}) {
  const meter = makeMeter(), bucket = o.bucket || makeBucket(o.rate, o.burst), H = {}, PH = [], CH = [], EH = [];
  let mine = {}, mineB = 2, dirty = false, presT = 0, list = [], conn = false, left = false, queue = [], retry = 0;
  const gap = 1000 / (o.presHz || PRES_HZ);
  // (a wire that bundles counts what it sends itself, message by message: wire.meters)
  const out = (b) => { if (!wire.meters) meter.out(b); };
  const ch = {
    name, kind: wire.kind, meter, get me() { return wire.me; },
    emit(topic, data, eo = {}) {
      if (left || !TOPIC.test(topic)) return Promise.resolve(false);
      const b = bytesOf(data);
      if (b > MAX_MSG) { meter.tx.big++; meter.drop('big'); return Promise.resolve(false); }
      if (!conn) { meter.drop('offline'); return Promise.resolve(false); }
      if (!bucket.take()) { if (eo.must && queue.length < 32) { queue.push([topic, data, b]); return Promise.resolve(true); } meter.drop('budget'); return Promise.resolve(false); }
      out(b);
      return Promise.resolve(wire.send(topic, data)).then(() => true, (e) => { meter.drop(e); ch._err(e, 'send'); return false; });
    },
    on(topic, fn) { (H[topic] ||= []).push(fn); return () => { const l = H[topic]; const i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; },
    presence(patch) {
      const next = Object.assign({}, mine);
      for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
      const b = bytesOf(next);
      if (b > MAX_PRES) { meter.tx.big++; meter.drop('big'); return Promise.resolve(false); }
      mine = next; mineB = b; dirty = true; ch.pump();
      return Promise.resolve(true);
    },
    presenceDue: () => !left && conn && now() - presT >= gap && wire.ready?.() !== false,
    mine: () => mine,
    peers: () => list,
    onPeers(fn) { PH.push(fn); return () => { const i = PH.indexOf(fn); if (i >= 0) PH.splice(i, 1); }; },
    onError(fn) { EH.push(fn); return () => { const i = EH.indexOf(fn); if (i >= 0) EH.splice(i, 1); }; },
    connected: () => conn && !left,
    onConnection(fn) { CH.push(fn); Promise.resolve().then(() => fn(ch.connected())); return () => { const i = CH.indexOf(fn); if (i >= 0) CH.splice(i, 1); }; },
    leave() { if (left) return Promise.resolve(); left = true; clearTimeout(retry); retry = 0; for (const k in H) H[k].length = 0; PH.length = 0; EH.length = 0; return Promise.resolve(wire.leave()).catch(() => {}); },
    // (called each frame by the game, and on every presence change: the coalesced send and the queued musts. What the
    // rate or the budget holds back is tried again on a timer, so a channel nobody pumps, the lobby, still sends its last)
    pump() {
      if (left || !conn) return;
      while (queue.length && bucket.level >= 1) { const [t, d, b] = queue.shift(); bucket.take(); out(b); Promise.resolve(wire.send(t, d)).catch((e) => { meter.drop(e); ch._err(e, 'send'); }); }
      const t = now(), wait = gap - (t - presT);
      // (a presence the wire would not send (wire.idle: Supabase's, the same as the one it said a moment ago) takes no
      // token and is not counted: the meter is what went out)
      if (dirty && wait <= 0 && wire.idle?.(mine)) { dirty = false; presT = t; }
      else if (dirty && wait <= 0 && bucket.take()) {
        dirty = false; presT = t; out(mineB);
        Promise.resolve(wire.sendPresence(mine)).catch((e) => { meter.drop(e); dirty = true; ch._err(e, 'send'); });
      }
      if ((dirty || queue.length) && !retry) retry = setTimeout(() => { retry = 0; ch.pump(); }, Math.max(1, dirty && wait > 0 ? wait : 1000 / (o.rate || BUDGET)));
      wire.tick?.();
    },
    _hear(msg) { if (left) return; meter.heard(msg.topic + ' ' + msg.peer, msg.data); const l = H[msg.topic]; if (l) for (const fn of l.slice()) { try { fn(msg); } catch (e) { console.error(e); } } },
    _peers(next, change) {
      if (left) return;
      const old = new Map(list.map((p) => [p.peer, p])), nw = new Map(next.map((p) => [p.peer, p]));
      const joined = next.filter((p) => !old.has(p.peer)), lft = list.filter((p) => !nw.has(p.peer));
      const updated = change?.updated || next.filter((p) => old.has(p.peer) && old.get(p.peer) !== p);
      list = next;
      for (const p of updated) if (!p.isMe) meter.heard(p.peer, p.presence);
      if (joined.length || lft.length || updated.length) for (const fn of PH.slice()) { try { fn({ peers: list, joined, left: lft, updated }); } catch (e) { console.error(e); } }
    },
    // (a refusal that means something to the game: a send this view may not make, the room ended; what passes is not told)
    _err(e, how) {
      const code = typeof e === 'string' ? e : e?.code;
      if (left || !(how === 'room' || code === 'not_permitted' || TERMINAL.has(code))) return;
      // (a room ends once: every listener of it hears the one code)
      if (how === 'room') { if (ch.ended) return; ch.ended = code || 'upstream_error'; }
      ch.error = code || 'upstream_error';
      for (const fn of EH.slice()) { try { fn(ch.error, how); } catch (err) { console.error(err); } }
    },
    _conn(v) { if (conn === v) return; conn = v; if (v) { dirty = true; ch.pump(); } for (const fn of CH.slice()) { try { fn(ch.connected()); } catch (e) { console.error(e); } } }
  };
  return ch;
}

// ---------- the claude.ai artifact room ----------
// room: what `await claude.use('room')` resolved to (null: no room on this view; the game is single-player).
// The platform keeps its own budget too; ours sits under it so a drop is ours to choose (snapshots), not the room's
export function RoomTransport(room, o = {}) {
  if (!room) return null;
  const meOf = (r) => r.peers().find((p) => p.isMe && p.sameTab)?.peer || null;
  // (one bucket for the page: the room's budget is the lobby's, shared by every named room)
  const bucket = makeBucket(o.rate, o.burst);
  // (a terminal code, heard anywhere, ends the room for the page: told once)
  const DH = [], dead = (e) => { const code = e?.code || e; if (!TERMINAL.has(code) || T.dead) return; T.dead = code; for (const fn of DH.slice()) { try { fn(code); } catch (err) { console.error(err); } } };
  const wrap = (r, name) => {
    let me = meOf(r);
    const wire = {
      kind: 'room', get me() { return me || (me = meOf(r)); },
      send: (topic, data) => r.emit(topic, data),
      sendPresence: (obj) => r.presence(Object.assign(diffNull(wire.last, obj), obj)).then(() => { wire.last = obj; }),
      leave: () => (r.leave ? r.leave() : Promise.resolve()),
      last: {}
    };
    const ch = makeChannel(name, wire, Object.assign({ bucket }, o));
    const map = (p) => ({ peer: p.peer, by: p.by ?? null, isMe: !!(p.isMe && p.sameTab), presence: p.presence || {}, updatedAt: p.updatedAt || 0, guest: !!p.guest });
    const memo = new Map();
    const cached = (p) => { const c = memo.get(p.peer); if (c && c.src === p) return c.v; const v = map(p); memo.set(p.peer, { src: p, v }); return v; };
    const offs = [];
    const onErr = (e) => { ch._conn(false); ch._err(e?.code || 'upstream_error', 'room'); };
    ch.onError((code) => dead(code));
    offs.push(r.onPeers((c) => { if (!me) me = meOf(r); const next = c.peers.map(cached), up = c.updated.map(cached); for (const p of c.left) memo.delete(p.peer); ch._peers(next, { updated: up }); }, onErr));
    offs.push(r.onConnection((v) => ch._conn(!!v), onErr));
    // the topics are subscribed as the game asks for them (room.on per topic)
    const on0 = ch.on;
    const subs = {};
    ch.on = (topic, fn) => {
      if (!subs[topic]) subs[topic] = r.on(topic, (m) => { if (m.isMe && m.sameTab) return; ch._hear({ topic, data: m.data, peer: m.peer, by: m.by ?? null, guest: !!m.guest }); }, onErr);
      return on0(topic, fn);
    };
    const leave0 = ch.leave;
    ch.leave = () => { for (const f of offs) try { f(); } catch (e) { /* gone */ } for (const k in subs) try { subs[k](); } catch (e) { /* gone */ } return leave0(); };
    return ch;
  };
  const T = { kind: 'room', lobby: null, rooms: new Map(), dead: null, onDead(fn) { DH.push(fn); } };
  T.lobby = wrap(room, 'lobby');
  // (a name being joined is joined once: a second ask while the first is on its way gets the same channel)
  const pending = new Map();
  T.join = (name) => {
    if (!ROOM.test(name)) return Promise.reject(new Error('invalid_argument'));
    if (T.dead) return Promise.reject(Object.assign(new Error(T.dead), { code: T.dead }));
    if (T.rooms.has(name)) return Promise.resolve(T.rooms.get(name));
    if (pending.has(name)) return pending.get(name);
    // (a room whose join answers after the page's room has ended is left at once: the join fails with the end's code)
    const p = Promise.resolve(room.join(name)).then((r) => {
      if (T.dead) { Promise.resolve().then(() => r.leave?.()).catch(() => {}); throw Object.assign(new Error(T.dead), { code: T.dead }); }
      const ch = wrap(r, name); const l0 = ch.leave; ch.leave = () => { T.rooms.delete(name); return l0(); }; T.rooms.set(name, ch); return ch;
    }, (e) => { dead(e); throw e; }).finally(() => pending.delete(name));
    pending.set(name, p);
    return p;
  };
  return T;
}
// (presence merges by field: a field the game dropped is sent as null so the room drops it too)
function diffNull(a, b) { const o = {}; for (const k in a) if (!(k in b)) o[k] = null; return o; }

// ---------- pages of one browser (the tests) ----------
// Each page is one peer. A heartbeat each second carries the presence, a peer silent for 12 s is gone (a page loading a zone stalls). o.drop: the share
// of messages lost (a room drops), o.lag: ms each message waits; the room's budget and sizes apply as on the real one
export function LocalTransport(o = {}) {
  if (typeof BroadcastChannel === 'undefined') return null;
  const me = o.me || 'p' + Math.random().toString(36).slice(2, 10);
  const bucket = makeBucket(o.rate, o.burst);
  const open = (name) => {
    const bc = new BroadcastChannel('skotos.net.' + name);
    const peers = new Map(), selfP = { peer: me, by: o.by || null, isMe: true, presence: {}, updatedAt: Date.now() };
    let alive = true;
    const post = (m) => {
      if (!alive) return;
      if (o.drop && m.t === 'p' && Math.random() < o.drop) return;
      if (o.lag) setTimeout(() => alive && bc.postMessage(m), o.lag); else bc.postMessage(m);
    };
    const wire = { kind: 'local', me, send: (topic, data) => post({ t: 'e', topic, data, from: me, by: o.by || null }), sendPresence: (p) => { selfP.presence = p; selfP.updatedAt = Date.now(); post({ t: 'p', p, from: me, by: o.by || null }); }, leave: () => { post({ t: 'bye', from: me }); alive = false; clearInterval(hb); setTimeout(() => bc.close(), 50); } };
    const ch = makeChannel(name, wire, Object.assign({ bucket }, o));
    const publish = (updated) => ch._peers([{ ...selfP, presence: ch.mine() }, ...[...peers.values()]], updated ? { updated } : undefined);
    bc.onmessage = (ev) => {
      const m = ev.data; if (!m || m.from === me || !alive) return;
      const hear = () => {
        if (m.t === 'e') { ch._hear({ topic: m.topic, data: m.data, peer: m.from, by: m.by || null }); return; }
        if (m.t === 'bye') { if (peers.delete(m.from)) publish([]); return; }
        if (m.t === 'p' || m.t === 'hb' || m.t === 'hi') {
          // (a heartbeat carries the whole presence: one lost update is mended within a second)
          const old = peers.get(m.from), p = m.p ?? old?.presence ?? {};
          const fresh = !old || JSON.stringify(old.presence) !== JSON.stringify(p);
          if (fresh) peers.set(m.from, { peer: m.from, by: m.by || null, isMe: false, presence: p, updatedAt: Date.now(), seen: Date.now() });
          else old.seen = Date.now();
          if (m.t === 'hi') post({ t: 'hb', p: ch.mine(), from: me, by: o.by || null });
          if (fresh) publish(old ? [peers.get(m.from)] : []);
        }
      };
      // (an incoming message is lost too, as on the room: drops are per receiver)
      if (o.drop && m.t === 'e' && Math.random() < o.drop) return;
      hear();
    };
    const hb = setInterval(() => {
      post({ t: 'hb', p: ch.mine(), from: me, by: o.by || null });
      const t = Date.now(); let gone = false;
      for (const [k, p] of peers) if (t - p.seen > (o.gone || 12000)) { peers.delete(k); gone = true; }
      if (gone) publish([]);
    }, 1000);
    setTimeout(() => { ch._conn(true); post({ t: 'hi', p: ch.mine(), from: me, by: o.by || null }); publish([]); }, o.lag || 0);
    ch.kill = () => { alive = false; clearInterval(hb); try { bc.close(); } catch (e) { /* closed */ } ch._conn(false); };
    return ch;
  };
  const T = { kind: 'local', me, lobby: open(o.lobby || 'lobby'), rooms: new Map() };
  T.join = (name) => {
    if (!ROOM.test(name)) return Promise.reject(new Error('invalid_argument'));
    if (T.rooms.has(name)) return Promise.resolve(T.rooms.get(name));
    const ch = open(name); const l0 = ch.leave; ch.leave = () => { T.rooms.delete(name); return l0(); }; T.rooms.set(name, ch);
    return Promise.resolve(ch);
  };
  return T;
}

// ---------- Supabase Realtime (the app, a public web build) ----------
// client: a supabase-js v2 client (createClient(url, anonKey)), or anything with its channel() shape. Broadcast carries
// everything (self: false). Realtime lets a client track() its presence only 5 times in 30 s (past that it shuts the
// channel, broadcast and all), so the presence is tracked once a channel ({ k }, keyed by our peer label: who is there,
// who joins and leaves) and the game's presence goes as a broadcast '_p', coalesced as any presence, said again (a lost
// one mended) every 1.5 s in a game and every 10 s in the lobby, and once when someone joins. Realtime counts every
// message sent and every one delivered, project-wide, so nothing is said that says nothing: an empty presence (every
// page in the lobby but the hosts) is never sent, nor one unchanged before its time. A peer is a member with its last
// '_p'; one silent past three of its beats (12 s in a game, 30 s in the lobby) is gone.
// Unstamped (the tests only: pickTransport never takes it), who sent a broadcast rides in its payload ('f'), the
// client's own word. Stamped (o.stamped, o.me: the page's user id, signed in), the server says who sent it
// (supabase/migrations/*_skotos_coop.sql, docs/coop/supabase.md): the channels are private (a signed-in page may join a
// 'skotos:' topic to hear it and track its presence there, and may not broadcast on it), everything the page says goes
// by RPC to skotos.send, which checks it and broadcasts it as { d, _by }, '_by' the caller's id written by the server
// and d the page's own JSON text (read here: a message whose d is not JSON is dropped). A peer is that id and nothing
// else: a message without it is dropped, an 'f' in it is not read, and our own (the server's broadcast comes back to its
// sender too) passed over. One call is on its way at a time, what is said meanwhile going together in the next (a page's
// messages arrive in the order it said them; the server's rate counts each), and a call not answered in CALL_MS is
// given up, so one lost request holds nothing back. Who hosts a game is the server's games row (skotos.host_game,
// skotos.game_host): the game's channel says it as ch.host, and the game takes no other (coop.js pickHost). A game's
// send the server refuses for its game ('no_game': its row is gone) or for the project's day ('quota') ends the game's
// channel for the page (ch.onError, 'room'), as a renewal of the host's row that is not 'ok' does. Presence keys are the
// clients' own word: they only say who came and who left, sooner than silence would; a peer is listed only once the
// server has named it in a '_p'.
const RENEW = 30 * 60 * 1000, CALL_MAX = 16, WAIT_MAX = 64, CALL_MS = 5000;
// Economy (a stamped game's channel; docs/coop/diet.md). Realtime counts a message from the database once sent and once
// for every member of its channel, the sender too: on a game of four each message costs 5 events, and the free plan
// allows 100 a second for the whole project (a party of four at the room's rates, ~52 messages a second: ~280). So:
// - What a page says goes together, as one message 'b' ([[event, data], ...], a presence in the place of one still
//   waiting), when its carrier is given (the host's snapshot 's' or end 'c', a guest's presence) and no call is on its
//   way, the rest at most HOLD ms after it was given (HOLD_C while carriers flow, so it rides with the next). The game
//   holds itself to ECON's rates (ch.econ) and builds its next only when it would go at once (ch.ready, presenceDue).
// - A guest says it into its outbox, a topic that only its host hears (2 events, not 5): '<room>.<its id>' (boxOf), a games
//   row the guest holds as a host holds its game's (skotos.host_game: no page can fill a topic nobody holds), joined
//   by the host alone, with no presence. The host takes there only what the server stamped with that id, and passes the
//   guest's presence (less what only the host reads: ch.relayOmit) and fx on to the others in its own message, as
//   [event, data, guest]. A page believes such an entry only from its game's host (ch.host), and only a presence or fx:
//   the host is believed on everything already, and nothing is taken from it as another's but what that one would say.
// - A guest says ['_o', 1] in the game's channel while its outbox is not heard; the host says ['_o', [the guests whose
//   outbox it hears]] when that changes and every 3 s, and a guest uses its outbox only while its host lists it (its
//   last list at most OUT_FRESH old); else it says everything in the game's channel, bundled, as it did before.
// (a guest's outbox: the room and the first 24 hex digits of its user id, 96 bits, so that a room of up to 23
// characters has one within the 48 a room may have)
const boxOf = (room, uid) => room + '.' + String(uid).replace(/-/g, '').slice(0, 24);
const ECON = Object.freeze({ snap: 7, pres: 5 }), HOLD = 200, HOLD_C = 400, OUTBOXES = 6, OUT_FRESH = 8000, BUNDLE_MAX = 80;
const coded = (code) => Object.assign(new Error(code), { code });
const BAD = Symbol('not json');
const unjson = (s) => { if (typeof s !== 'string') return BAD; try { return JSON.parse(s); } catch (e) { return BAD; } };
const utf8 = (s) => (enc ? enc.encode(s).length : s.length);
export function SupabaseTransport(client, o = {}) {
  if (!client?.channel) return null;
  const stamped = o.stamped === true;
  if (stamped && !(typeof o.me === 'string' && o.me && client.schema)) return null;
  const me = o.me || 'p' + Math.random().toString(36).slice(2, 10);
  const bucket = makeBucket(o.rate, o.burst);
  const rpc = stamped ? rpcOf(client, o.callMs) : null, post = stamped ? poster(rpc) : null;
  const open = (name, lobby) => {
    const topic = 'skotos:' + name, econ = stamped && !lobby && o.economy !== false;
    const sc = client.channel(topic, { config: Object.assign({ broadcast: { self: false, ack: false }, presence: { key: me } }, stamped ? { private: true } : {}) });
    const beat = lobby ? 10000 : econ ? 3000 : 1500, gone = lobby ? Math.max(o.gone || 12000, 3 * beat) : o.gone || 12000;
    let hb = 0;
    // (stamped: a game's send refused for its game or for the project's day ends the game for the page)
    const said = (pr) => (lobby ? pr : pr.catch((e) => { if (e?.code === 'no_game' || e?.code === 'quota') ch._err(e.code, 'room'); throw e; }));
    // (what the others have already, an empty presence never said or one said a moment ago, is not said again: idle)
    const rawOf = (p) => { if (wire.memo?.[0] !== p) wire.memo = [p, JSON.stringify(p)]; return wire.memo[1]; };
    const idle = (raw) => raw === wire.raw && (raw === '{}' || (!wire.again && Date.now() - wire.sentT < beat - 300));
    const wire = {
      kind: 'supabase', me, sentT: 0, raw: '{}', again: false, soon: 0, memo: null, meters: econ,
      send: (t, data) => (econ ? E.put(t, data) : stamped ? said(post(topic, t, data)) : sc.send({ type: 'broadcast', event: t, payload: { f: me, d: data } })),
      idle: (p) => idle(rawOf(p)),
      sendPresence: (p) => {
        const raw = rawOf(p), t = Date.now();
        if (idle(raw)) return Promise.resolve('ok');
        wire.raw = raw; wire.sentT = t; wire.again = false;
        if (!stamped) return sc.send({ type: 'broadcast', event: '_p', payload: { f: me, p } });
        // (one the server refused (its rate) was not said: said again on the next beat's look, not a whole beat on)
        return (econ ? E.put('_p', p) : said(post(topic, '_p', p))).catch((e) => { if (wire.raw === raw) { wire.raw = null; wire.sentT = 0; } throw e; });
      },
      ready: econ ? () => post.idle() : undefined,
      tick: econ ? () => E.go() : undefined,
      leave: () => { clearInterval(hb); clearTimeout(wire.soon); if (E) E.end(); return client.removeChannel ? client.removeChannel(sc) : sc.unsubscribe(); }
    };
    // (our presence said again: on its beat, and for someone new, once for all who came in the same moment)
    const again = () => { wire.again = true; ch.presence({}); };
    const ch = makeChannel(name, wire, Object.assign({ bucket }, o, econ ? { presHz: ECON.pres } : {}));
    // each peer's last presence ({ p, raw, t }), the views handed out (the same object while its presence is the same)
    const last = new Map(), memo = new Map();
    let members = new Set(), self = null;
    const sync = () => {
      const st = sc.presenceState() || {}, t = Date.now(), next = [], now0 = new Set(Object.keys(st));
      // (someone new: our presence again, at once)
      for (const k of now0) if (k !== me && !members.has(k)) { if (wire.raw !== '{}' && !wire.soon) wire.soon = setTimeout(() => { wire.soon = 0; again(); }, 200); break; }
      members = now0;
      for (const k of now0) {
        if (k === me) continue;
        const L = last.get(k);
        if (L ? t - L.t > gone : stamped) continue;
        const c = memo.get(k), v = c && c.src === L ? c.v : { peer: k, by: stamped ? k : null, isMe: false, presence: L?.p || {}, updatedAt: L?.t || t, ago: L?.ago || 0 };
        memo.set(k, { src: L, v }); next.push(v);
      }
      for (const k of memo.keys()) if (!now0.has(k)) memo.delete(k);
      for (const k of last.keys()) if (!now0.has(k) && t - last.get(k).t > gone) last.delete(k);
      if (!self || self.presence !== ch.mine()) self = { peer: me, by: stamped ? me : null, isMe: true, presence: ch.mine(), updatedAt: t };
      next.unshift(self);
      ch._peers(next);
    };
    // what a peer said: its presence (raw: its JSON text, to tell a presence said again from a new one), or a topic's
    const hearP = (k, p, raw, ago) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return;
      const L = last.get(k);
      // (said again, the same: heard, counted, nothing new to tell the game)
      if (L && L.raw === raw) { L.t = Date.now(); ch.meter.in(raw.length); return; }
      // (any member's is kept; of senders not yet members, as many as there are members and 64 more)
      if (!L && !members.has(k) && last.size > members.size + 64) return;
      last.set(k, { p, raw, t: Date.now(), ago: ago || 0 }); sync();
    };
    const hear1 = (t, d, k, raw, ago) => {
      if (t === '_p') { hearP(k, d, raw ?? JSON.stringify(d), ago); return; }
      if (t === '_o') { if (E) E.heardO(k, d); return; }
      if (!TOPIC.test(t)) return;
      ch._hear({ topic: t, data: d, peer: k, by: stamped ? k : null });
    };
    // (a bundle from k; box: it came by k's outbox, to this page, its host. An entry naming another sender is taken only
    // from the game's host, and only a presence or fx, and never one that names the host itself or this page)
    const unbundle = (arr, k, box) => {
      if (!Array.isArray(arr) || arr.length > BUNDLE_MAX) return;
      for (const e of arr) {
        if (!Array.isArray(e) || typeof e[0] !== 'string' || e[0] === 'b') continue;
        if (e.length > 2) {
          const f = e[2];
          if (box || k !== ch.host || typeof f !== 'string' || !f || f === k || f === me || (e[0] !== '_p' && e[0] !== 'f')) continue;
          // (and how long the host held it before it went: the game dates the sample back by as much)
          hear1(e[0], e[1], f, undefined, typeof e[3] === 'number' && e[3] > 0 ? Math.min(e[3], 500) : 0);
        } else { hear1(e[0], e[1], k); if (box) E.relay(e[0], e[1], k); }
      }
    };
    // (supabase-js wants its listeners before subscribe(): one catch-all '*' listener hears every topic)
    sc.on('broadcast', { event: '*' }, (m) => {
      const t = m.event, pl = m.payload || {};
      // (who sent it: the server's '_by', stamped; the payload's own 'f', not)
      const k = stamped ? pl._by : pl.f;
      if (typeof k !== 'string' || !k || k === me) return;
      // (stamped, what the page said comes as its own JSON text)
      const d = stamped ? unjson(pl.d) : t === '_p' ? pl.p : pl.d;
      if (d === BAD) return;
      if (t === 'b' && econ) { unbundle(d, k, false); return; }
      if (t === '_o') return;
      hear1(t, d, k, stamped ? pl.d : undefined);
    });
    sc.on('presence', { event: 'sync' }, sync);
    sc.subscribe((status) => {
      if (status === 'SUBSCRIBED') { Promise.resolve(sc.track({ k: me })).catch(() => {}); wire.again = true; ch._conn(true); sync(); }
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') ch._conn(false);
    });
    // what waits to go (econ), the outbox (a guest's) and the outboxes heard (the host's)
    const E = econ ? {
      q: [], want: false, mt: false, timer: 0, carT: 0, out: null, outT: 0, ob: new Map(), oKey: '', oT: 0,
      carrier: (ev) => (ch.host === me ? ev === 's' || ev === 'c' : ev === '_p'),
      // (an entry: [event, data] or, passed on, [event, data, from]; a presence or the outboxes' list takes the place of
      // the one still waiting)
      put(ev, d, from) {
        return new Promise((ok, no) => {
          const s = JSON.stringify(from === undefined ? [ev, d ?? null] : [ev, d ?? null, from]);
          const e = { ev, d, from, s, b: utf8(s) + (from === undefined ? 0 : 4), ok, no, key: ev === '_p' || ev === '_o' ? ev + ' ' + (from || '') : null, at: Date.now() };
          const i = e.key ? E.q.findIndex((x) => x.key === e.key) : -1;
          if (i >= 0) { E.q[i].ok('ok'); E.q[i] = e; } else E.q.push(e);
          // (what is passed on is look and presence: the oldest fx let go past eight of them waiting)
          if (from !== undefined && ev === 'f') { const fx = E.q.filter((x) => x.from !== undefined && x.ev === 'f'); if (fx.length > 8) { const x = fx[0]; E.q.splice(E.q.indexOf(x), 1); x.ok('ok'); } }
          if (from === undefined && E.carrier(ev)) { E.want = true; E.carT = Date.now(); if (!E.mt) { E.mt = true; Promise.resolve().then(() => { E.mt = false; E.go(); }); } }
          else if (!E.timer) E.timer = setTimeout(() => { E.timer = 0; E.want = true; E.go(); }, Date.now() - E.carT < 1000 ? HOLD_C : HOLD);
        });
      },
      // (and only while the host is there: a guest whose host has left says it in the game's channel, refused no_game)
      live: () => !!E.out && Date.now() - E.outT < OUT_FRESH && members.has(ch.host),
      // (what waits goes, as few messages as hold it: when a carrier wants it or its time came, and no call is on its
      // way, or at once (force: the page leaving))
      go(force) {
        if (!E.q.length || (!force && (!E.want || !post.idle()))) return;
        E.want = false; clearTimeout(E.timer); E.timer = 0;
        const box = E.live(), to = box ? E.out : topic;
        if (E.out && !box && !E.q.some((x) => x.ev === '_o')) { const s = '["_o",1]'; E.q.push({ ev: '_o', d: 1, s, b: s.length, ok() {}, no() {} }); }
        const q = E.q.splice(0), msgs = [], t = Date.now();
        // (a presence passed on says how long it waited here, at most 999 ms)
        for (const e of q) if (e.from !== undefined && e.ev === '_p') { e.s = e.s.slice(0, -1) + ',' + Math.min(999, t - e.at) + ']'; e.b = utf8(e.s); }
        let cur = [], cb = 2;
        for (const e of q) {
          // (one that cannot go in a bundle goes as its own message, as before; one passed on is let go)
          if (e.b > MAX_MSG - 2) { if (e.from === undefined) msgs.push([e]); else e.ok('ok'); continue; }
          if (cur.length && cb + 1 + e.b > MAX_MSG) { msgs.push(cur); cur = []; cb = 2; }
          cb += e.b + (cur.length ? 1 : 0); cur.push(e);
        }
        if (cur.length) msgs.push(cur);
        for (const m of msgs) {
          const one = m.length === 1 && m[0].b > MAX_MSG - 2, text = one ? null : '[' + m.map((e) => e.s).join(',') + ']';
          ch.meter.out(one ? bytesOf(m[0].d) : utf8(text));
          (one ? post(to, m[0].ev, m[0].d) : post.text(to, 'b', text)).then((r) => { for (const e of m) e.ok(r); }, (err) => {
            const code = err?.code;
            // (the outbox's row gone: the game's channel from now on; a game's send refused for its game or the day: the
            // game ends for the page)
            if (box && code === 'no_game') { if (E.out === to) E.out = null; } else if (code === 'no_game' || code === 'quota') ch._err(code, 'room');
            for (const e of m) e.no(err);
          });
        }
      },
      room: () => { let b = MAX_MSG - 24; for (const e of E.q) if (e.b <= 1500) b -= e.b + 1; return b; },
      // (the host: a guest's presence and fx, heard by its outbox, passed on to the others, if there are others)
      relay(ev, d, k) {
        if (ev !== '_p' && ev !== 'f') return;
        let other = false; for (const x of members) if (x !== me && x !== k) { other = true; break; }
        if (!other) return;
        if (ev === '_p' && ch.relayOmit && d && typeof d === 'object') { d = Object.assign({}, d); for (const x of ch.relayOmit) delete d[x]; }
        E.put(ev, d, k).catch(() => {});
      },
      heardO(k, d) {
        if (ch.host === me) { if (d === 1) E.openBox(k); return; }
        if (k === ch.host && Array.isArray(d)) E.outT = d.includes(me) ? Date.now() : 0;
      },
      // (the host hears a guest's outbox: joined, no presence; only what the server stamped with that guest's id)
      openBox(k) {
        if (E.ob.has(k) || E.ob.size >= OUTBOXES || !ROOM.test(boxOf(name, k))) return;
        const oc = client.channel('skotos:' + boxOf(name, k), { config: { private: true, broadcast: { self: false, ack: false } } }), rec = { oc, ok: false, t: Date.now() };
        E.ob.set(k, rec);
        oc.on('broadcast', { event: '*' }, (m) => {
          const pl = m.payload || {}; if (pl._by !== k) return;
          const d = unjson(pl.d); if (d === BAD) return;
          rec.t = Date.now();
          if (m.event === 'b') unbundle(d, k, true); else if (m.event !== '_o') { hear1(m.event, d, k, pl.d); E.relay(m.event, d, k); }
        });
        oc.subscribe((st) => { const v = st === 'SUBSCRIBED'; if (v !== rec.ok && E.ob.get(k) === rec) { rec.ok = v; E.sayO(); } });
      },
      closeBox(k) { const rec = E.ob.get(k); if (!rec) return; E.ob.delete(k); try { client.removeChannel ? client.removeChannel(rec.oc) : rec.oc.unsubscribe(); } catch (e) { /* gone */ } E.sayO(); },
      sayO(force) {
        const l = [...E.ob].filter(([, r]) => r.ok).map(([k]) => k), key = l.join();
        if (!force && key === E.oKey) return;
        E.oKey = key; E.oT = Date.now(); E.put('_o', l).catch(() => {});
      },
      // (each beat: a host lets go the outboxes of those gone, and says again which it hears)
      beat() {
        if (ch.host !== me) return;
        const t = Date.now();
        for (const [k, r] of E.ob) if (!members.has(k) && t - r.t > gone) E.closeBox(k);
        if (E.ob.size && t - E.oT > 3000) E.sayO(true);
      },
      end() { clearTimeout(E.timer); E.timer = 0; post.idlers.delete(E.go); for (const k of [...E.ob.keys()]) { const r = E.ob.get(k); E.ob.delete(k); try { client.removeChannel ? client.removeChannel(r.oc) : r.oc.unsubscribe(); } catch (e) { /* gone */ } } for (const e of E.q.splice(0)) e.ok('ok'); }
    } : null;
    if (E) {
      E.go = E.go.bind(E); post.idlers.add(E.go);
      ch.econ = ECON; ch.ready = () => post.idle(); ch.room = E.room; ch._box = (b) => { E.out = b ? 'skotos:' + b : null; E.outT = 0; };
      ch._flush = () => E.go(true);
      ch._boxLive = () => E.live();
    }
    // (the presence said again when nothing new went for its beat; the silent let go)
    hb = setInterval(() => { if (!ch.connected()) return; if (wire.raw !== '{}' && Date.now() - wire.sentT > beat - 300) again(); sync(); E?.beat(); }, lobby ? 2500 : 1500);
    return ch;
  };
  const T = { kind: 'supabase', me, stamped, lobby: open(o.lobby || 'lobby', true), rooms: new Map() };
  const pending = new Map();
  // jo.host: this page hosts the game (stamped: it makes the games row first; 'taken' when another holds it, 'quota' when
  // the project's day is spent). A guest's join asks the row who hosts it ('no_game' when nobody does, 'same_user' when
  // the host is this page's own user: a tab copied from the host's, whose session came with it)
  T.join = (name, jo = {}) => {
    if (!ROOM.test(name)) return Promise.reject(new Error('invalid_argument'));
    if (T.rooms.has(name)) return Promise.resolve(T.rooms.get(name));
    if (!stamped) { const ch = open(name); const l0 = ch.leave; ch.leave = () => { T.rooms.delete(name); return l0(); }; T.rooms.set(name, ch); return Promise.resolve(ch); }
    if (pending.has(name)) return pending.get(name);
    const hosting = !!jo.host;
    const who = hosting
      ? rpc('host_game', { room: name }).then((r) => { if (r !== 'ok') throw coded(typeof r === 'string' && r ? r : 'upstream_error'); return me; })
      : rpc('game_host', { room: name }).then((h) => { if (typeof h !== 'string' || !h) throw coded('no_game'); if (h === me) throw coded('same_user'); return h; });
    const p = who.then((host) => {
      const ch = open(name); ch.host = host;
      // (the row of a game this page hosts is renewed while the game is open, and let go when it leaves; a guest's
      // outbox the same (econ). A renewal answered with anything but 'ok' is the row lost (run out and another's): the
      // game is told, as a room that ended (an outbox lost: the game's channel from then on). One that got no answer is
      // tried again in a minute. The last renewal sent is kept: renewing, settled once it has its answer)
      let renew = 0, renewing = null, done = false;
      const every = o.renew || RENEW, box = !hosting && ch.econ && ROOM.test(boxOf(name, me)) ? boxOf(name, me) : null, row = hosting ? name : box;
      const lost = (r) => { if (hosting) ch._err(typeof r === 'string' && r ? r : 'upstream_error', 'room'); else ch._box(null); };
      const keep = (ms) => { renew = setTimeout(() => { renewing = rpc('host_game', { room: row }).then((r) => { if (done) return; if (r === 'ok') keep(every); else lost(r); }, () => { if (!done) keep(Math.min(every, 60000)); }); }, ms); };
      if (hosting) keep(every);
      else if (box) renewing = rpc('host_game', { room: box }).then((r) => { if (done || r !== 'ok') return; ch._box(box); keep(every); }, () => {});
      const l0 = ch.leave;
      // (the game's row ends once what this page said before has had its answer: its last messages, the end of the game
      // its guests are told among them, go while the row is there. And once a renewal on its way has had its answer: one
      // committed after the end would make the row live again, for four hours, a game nobody hosts)
      ch.leave = () => {
        if (!done) {
          done = true; T.rooms.delete(name); clearTimeout(renew);
          ch._flush?.();
          if (row) Promise.all([post.settled(), renewing]).then(() => rpc('end_game', { room: row })).catch(() => {});
        }
        return l0();
      };
      T.rooms.set(name, ch); return ch;
    }).finally(() => pending.delete(name));
    pending.set(name, p);
    return p;
  };
  return T;
}
// (a function of the 'skotos' schema by RPC: its data, or a refusal coded by the server's own word. Each call has its
// deadline: supabase-js sets none, and a request that never settles (a connection gone dead that the browser has not
// noticed yet, after a phone moved from wifi to cellular) would hold back every later message of the page. Past it the
// call is aborted where the client can and refused 'timeout'; a request the server had already taken may still be
// delivered, late)
const rpcOf = (client, ms = CALL_MS) => (fn, args) => new Promise((ok, no) => {
  let q = client.schema('skotos').rpc(fn, args), ac = null;
  if (typeof q?.abortSignal === 'function' && typeof AbortController !== 'undefined') { ac = new AbortController(); q = q.abortSignal(ac.signal); }
  const t = setTimeout(() => { try { ac?.abort(); } catch (e) { /* gone */ } no(coded('timeout')); }, ms);
  Promise.resolve(q).then((r) => {
    clearTimeout(t);
    if (r?.error) no(coded(String(r.error.message || r.error.code || 'upstream_error').slice(0, 64))); else ok(r?.data);
  }, () => { clearTimeout(t); no(coded('upstream_error')); });
});
// what a page says, by skotos.send: one call on its way at a time; what is said meanwhile waits (64 at most) and goes
// in the next, sixteen a call. Each message's promise is its call's answer (a call past its deadline is refused
// 'timeout', and the next goes). post.settled(): a promise for when everything said so far has had its answer (a host
// ends its game only then: an end_game sent beside a call still on its way could be committed first, and that call's
// messages refused no_game)
function poster(rpc) {
  const q = [], waits = []; let busy = false, seq = 0, done = 0;
  const flush = () => {
    if (busy || !q.length) return;
    busy = true;
    const b = q.splice(0, CALL_MAX), last = b[b.length - 1].seq;
    rpc('send', { msgs: b.map((m) => m.m) }).then(() => { for (const m of b) m.ok('ok'); }, (e) => { for (const m of b) m.no(e); }).finally(() => {
      busy = false; done = last;
      for (let i = waits.length - 1; i >= 0; i--) if (waits[i].at <= done) waits.splice(i, 1)[0].r();
      flush();
      if (!busy) for (const f of [...post.idlers]) { try { f(); } catch (e) { console.error(e); } }
    });
  };
  const text = (topic, event, s) => new Promise((ok, no) => {
    if (q.length >= WAIT_MAX) { no(coded('busy')); return; }
    q.push({ m: [topic, event, s], ok, no, seq: ++seq }); flush();
  });
  const post = (topic, event, data) => text(topic, event, JSON.stringify(data ?? null));
  post.text = text;
  post.settled = () => new Promise((r) => { if (done >= seq) r(); else waits.push({ at: seq, r }); });
  // (no call on its way and nothing waiting for one; idlers: told each time a call's answer leaves it so)
  post.idle = () => !busy && !q.length;
  post.idlers = new Set();
  return post;
}

// ---------- which one ----------
// ?net=local (the tests: pages of one browser), the artifact's room when the page runs in claude.ai, Supabase when the
// build carries its config (net/netcfg.js; its createClient gives a client or the promise of one), a client, and a
// server that stamps who sent each message (cfg.stamped: Realtime itself does not, and a guest believes its host's
// messages only for the sender on them; docs/coop/release.md step 5, docs/coop/supabase.md), and the page could sign
// in; else null: the single-player game
export async function pickTransport(q, cfg = {}) {
  const want = q?.get?.('net');
  if (want === 'off') return null;
  if (want === 'local') return LocalTransport({ drop: +(q.get('netdrop') || 0), lag: +(q.get('netlag') || 0), me: q.get('peer') || undefined });
  if (want !== 'supabase' && typeof window !== 'undefined' && window.claude?.use) {
    try { const room = await window.claude.use('room'); if (room) return RoomTransport(room); } catch (e) { /* no room here */ }
  }
  // (the tests' stand-in for a project, tools/coop.mjs NET=supa: ?net=supabase and a config the page was given by its
  // own test, window.__skotosSupa, its client reaching a fake project in the test's process)
  if (want === 'supabase' && typeof window !== 'undefined' && window.__skotosSupa) cfg = window.__skotosSupa;
  if (cfg.url && cfg.anonKey && cfg.stamped === true) {
    try {
      const make = cfg.createClient || (typeof window !== 'undefined' && window.supabase?.createClient);
      if (make) {
        const opts = clientOpts(); await unclone(opts.auth.storage);
        const client = await make(cfg.url, cfg.anonKey, opts), me = await signIn(client);
        if (me) { claim(me); return SupabaseTransport(client, { stamped: true, me, economy: cfg.economy }); }
      }
    } catch (e) { /* not this build, or no sign-in: single-player */ }
  }
  return null;
}
// (each tab its own anonymous user, kept across its reloads: the session in sessionStorage where the page may use it,
// so two tabs of one browser are two players, not one user twice; with no storage, a user for this load only)
const AUTH_KEY = 'skotos-auth';
function clientOpts() {
  let storage = null;
  try { storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch (e) { storage = null; }
  const auth = { storageKey: AUTH_KEY, autoRefreshToken: true, detectSessionInUrl: false, persistSession: !!storage };
  if (storage) auth.storage = storage;
  return { auth, realtime: { params: { eventsPerSecond: BUDGET } } };
}
// A tab copied from another (the browser's Duplicate, or one opened from it) has its sessionStorage copied too: the same
// user in two tabs, one player twice (a guest that takes itself for its host, a game ended by its copy). So before the
// client reads the session kept, the other tabs of the browser are asked whether one holds its user; if one does, this
// tab lets the copy go (only here: the session is not signed out, which would end the other tab's) and signs in anew.
// A tab answers for its user from then on. (A tab the browser froze in the background cannot answer: its copy is the
// same user still, and a guest's join that finds itself the host is refused, 'same_user')
async function unclone(storage, ms = 300) {
  if (!storage || typeof BroadcastChannel === 'undefined') return false;
  let uid = null;
  try { uid = JSON.parse(storage.getItem(AUTH_KEY) || 'null')?.user?.id || null; } catch (e) { uid = null; }
  if (typeof uid !== 'string' || !uid) return false;
  let held = false;
  const bc = new BroadcastChannel(AUTH_KEY);
  bc.onmessage = (ev) => { if (ev.data?.t === 'mine' && ev.data.uid === uid) held = true; };
  bc.postMessage({ t: 'who', uid });
  await new Promise((r) => setTimeout(r, ms));
  bc.close();
  if (held) { try { storage.removeItem(AUTH_KEY); } catch (e) { /* kept */ } }
  return held;
}
let claimed = null;
function claim(uid) {
  if (typeof BroadcastChannel === 'undefined') return;
  try { claimed?.close(); } catch (e) { /* closed */ }
  claimed = new BroadcastChannel(AUTH_KEY);
  claimed.onmessage = (ev) => { if (ev.data?.t === 'who' && ev.data.uid === uid) claimed.postMessage({ t: 'mine', uid }); };
}
// the page's user id: the session it has, or a new anonymous user (the project's Auth must allow anonymous sign-ins;
// marked as the game's, app: 'skotos', for whoever clears old anonymous users of a shared project). Realtime is given
// the session's token before any channel joins (a private channel is joined as that user)
async function signIn(client) {
  const a = client.auth; if (!a?.signInAnonymously) return null;
  let user = (await a.getSession?.())?.data?.session?.user || null;
  if (!user) { const r = await a.signInAnonymously({ options: { data: { app: 'skotos' } } }); if (r?.error) return null; user = r?.data?.user || r?.data?.session?.user || null; }
  await client.realtime?.setAuth?.();
  return typeof user?.id === 'string' && user.id ? user.id : null;
}
