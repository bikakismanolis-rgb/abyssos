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
//   ch.meter                    what went out and came in: { tx: { msgs, bytes, drops }, rx: { msgs, bytes }, rate() }
//   ch.host                     (a game's channel, on a transport whose server keeps the games: Supabase, stamped) the
//                               peer the server says hosts it; undefined elsewhere, where the game finds its host itself
// A transport: { kind, lobby: Channel | null, join(name, { host }) -> Promise<Channel> } (host: this page hosts the
// game; only a transport whose server keeps the games reads it). Three of them:
// - RoomTransport (claude.ai artifact `room`): the lobby is the room itself, a game is room.join(name). The room's own
//   budget (~40 sends a second per page, emits and presence together, burst 80; 4 KiB a message and 4 KiB of presence)
//   is held here below it: BUDGET sends a second, the coalesced presence counted in.
// - LocalTransport (BroadcastChannel): pages of one browser, for the tests; drops and lag on demand (o.drop, o.lag).
// - SupabaseTransport (Supabase Realtime broadcast and presence, supabase-js v2): for the app and the public web build,
//   the sender of each message written by the server (stamped: private channels, sends by RPC; docs/coop/supabase.md).
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
// (a topic from a peer, a peer's presence) is measured once in eight and the others taken as that size
export function makeMeter() {
  const M = { tx: { msgs: 0, bytes: 0, drops: 0, big: 0 }, rx: { msgs: 0, bytes: 0 }, peak: 0 }, W = Array.from({ length: 6 }, () => [-1, 0, 0, 0, 0]), est = new Map();
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
  const ch = {
    name, kind: wire.kind, meter, get me() { return wire.me; },
    emit(topic, data, eo = {}) {
      if (left || !TOPIC.test(topic)) return Promise.resolve(false);
      const b = bytesOf(data);
      if (b > MAX_MSG) { meter.tx.big++; meter.tx.drops++; return Promise.resolve(false); }
      if (!conn) { meter.tx.drops++; return Promise.resolve(false); }
      if (!bucket.take()) { if (eo.must && queue.length < 32) { queue.push([topic, data, b]); return Promise.resolve(true); } meter.tx.drops++; return Promise.resolve(false); }
      meter.out(b);
      return Promise.resolve(wire.send(topic, data)).then(() => true, (e) => { meter.tx.drops++; ch._err(e, 'send'); return false; });
    },
    on(topic, fn) { (H[topic] ||= []).push(fn); return () => { const l = H[topic]; const i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; },
    presence(patch) {
      const next = Object.assign({}, mine);
      for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
      const b = bytesOf(next);
      if (b > MAX_PRES) { meter.tx.big++; return Promise.resolve(false); }
      mine = next; mineB = b; dirty = true; ch.pump();
      return Promise.resolve(true);
    },
    presenceDue: () => !left && conn && now() - presT >= gap,
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
      while (queue.length && bucket.level >= 1) { const [t, d, b] = queue.shift(); bucket.take(); meter.out(b); Promise.resolve(wire.send(t, d)).catch((e) => { meter.tx.drops++; ch._err(e, 'send'); }); }
      const t = now(), wait = gap - (t - presT);
      if (dirty && wait <= 0 && bucket.take()) {
        dirty = false; presT = t; meter.out(mineB);
        Promise.resolve(wire.sendPresence(mine)).catch((e) => { meter.tx.drops++; dirty = true; ch._err(e, 'send'); });
      }
      if ((dirty || queue.length) && !retry) retry = setTimeout(() => { retry = 0; ch.pump(); }, Math.max(1, dirty && wait > 0 ? wait : 1000 / (o.rate || BUDGET)));
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
// by RPC to skotos.send, which checks it and broadcasts it as { d, _by }, '_by' the caller's id written by the server.
// A peer is that id and nothing else: a message without it is dropped, an 'f' in it is not read, and our own (the
// server's broadcast comes back to its sender too) passed over. One call is on its way at a time, what is said
// meanwhile going together in the next (a page's messages arrive in the order it said them; the server's rate counts
// each). Who hosts a game is the server's games row (skotos.host_game, skotos.game_host): the game's channel says it as
// ch.host, and the game takes no other (coop.js pickHost). Presence keys are the clients' own word: they only say who
// came and who left, sooner than silence would; a peer is listed only once the server has named it in a '_p'.
const RENEW = 30 * 60 * 1000, CALL_MAX = 16, WAIT_MAX = 64;
const coded = (code) => Object.assign(new Error(code), { code });
export function SupabaseTransport(client, o = {}) {
  if (!client?.channel) return null;
  const stamped = o.stamped === true;
  if (stamped && !(typeof o.me === 'string' && o.me && client.schema)) return null;
  const me = o.me || 'p' + Math.random().toString(36).slice(2, 10);
  const bucket = makeBucket(o.rate, o.burst);
  const rpc = stamped ? rpcOf(client) : null, post = stamped ? poster(rpc) : null;
  const open = (name, lobby) => {
    const topic = 'skotos:' + name;
    const sc = client.channel(topic, { config: Object.assign({ broadcast: { self: false, ack: false }, presence: { key: me } }, stamped ? { private: true } : {}) });
    const beat = lobby ? 10000 : 1500, gone = lobby ? Math.max(o.gone || 12000, 3 * beat) : o.gone || 12000;
    let hb = 0;
    const wire = {
      kind: 'supabase', me, sentT: 0, raw: '{}', again: false, soon: 0,
      send: (t, data) => (stamped ? post(topic, t, data) : sc.send({ type: 'broadcast', event: t, payload: { f: me, d: data } })),
      sendPresence: (p) => {
        // (what the others have already, an empty presence never said or one said a moment ago, is not said again)
        const raw = JSON.stringify(p), t = Date.now();
        if (raw === wire.raw && (raw === '{}' || (!wire.again && t - wire.sentT < beat - 300))) return Promise.resolve('ok');
        wire.raw = raw; wire.sentT = t; wire.again = false;
        return stamped ? post(topic, '_p', p) : sc.send({ type: 'broadcast', event: '_p', payload: { f: me, p } });
      },
      leave: () => { clearInterval(hb); clearTimeout(wire.soon); return client.removeChannel ? client.removeChannel(sc) : sc.unsubscribe(); }
    };
    // (our presence said again: on its beat, and for someone new, once for all who came in the same moment)
    const again = () => { wire.again = true; ch.presence({}); };
    const ch = makeChannel(name, wire, Object.assign({ bucket }, o));
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
        const c = memo.get(k), v = c && c.src === L ? c.v : { peer: k, by: stamped ? k : null, isMe: false, presence: L?.p || {}, updatedAt: L?.t || t };
        memo.set(k, { src: L, v }); next.push(v);
      }
      for (const k of memo.keys()) if (!now0.has(k)) memo.delete(k);
      for (const k of last.keys()) if (!now0.has(k) && t - last.get(k).t > gone) last.delete(k);
      if (!self || self.presence !== ch.mine()) self = { peer: me, by: stamped ? me : null, isMe: true, presence: ch.mine(), updatedAt: t };
      next.unshift(self);
      ch._peers(next);
    };
    // (supabase-js wants its listeners before subscribe(): one catch-all '*' listener hears every topic)
    sc.on('broadcast', { event: '*' }, (m) => {
      const t = m.event, pl = m.payload || {};
      // (who sent it: the server's '_by', stamped; the payload's own 'f', not)
      const k = stamped ? pl._by : pl.f;
      if (typeof k !== 'string' || !k || k === me) return;
      if (t === '_p') {
        const p = stamped ? pl.d : pl.p;
        if (!p || typeof p !== 'object' || Array.isArray(p)) return;
        const raw = JSON.stringify(p), L = last.get(k);
        if (L && L.raw === raw) { L.t = Date.now(); return; }
        // (any member's is kept; of senders not yet members, as many as there are members and 64 more)
        if (!L && !members.has(k) && last.size > members.size + 64) return;
        last.set(k, { p, raw, t: Date.now() }); sync();
        return;
      }
      if (!TOPIC.test(t)) return;
      ch._hear({ topic: t, data: pl.d, peer: k, by: stamped ? k : null });
    });
    sc.on('presence', { event: 'sync' }, sync);
    sc.subscribe((status) => {
      if (status === 'SUBSCRIBED') { Promise.resolve(sc.track({ k: me })).catch(() => {}); wire.again = true; ch._conn(true); sync(); }
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') ch._conn(false);
    });
    // (the presence said again when nothing new went for its beat; the silent let go)
    hb = setInterval(() => { if (!ch.connected()) return; if (wire.raw !== '{}' && Date.now() - wire.sentT > beat - 300) again(); sync(); }, lobby ? 2500 : 1500);
    return ch;
  };
  const T = { kind: 'supabase', me, stamped, lobby: open(o.lobby || 'lobby', true), rooms: new Map() };
  const pending = new Map();
  // jo.host: this page hosts the game (stamped: it makes the games row first; 'taken' when another holds it). A guest's
  // join asks the row who hosts it ('no_game' when nobody does)
  T.join = (name, jo = {}) => {
    if (!ROOM.test(name)) return Promise.reject(new Error('invalid_argument'));
    if (T.rooms.has(name)) return Promise.resolve(T.rooms.get(name));
    if (!stamped) { const ch = open(name); const l0 = ch.leave; ch.leave = () => { T.rooms.delete(name); return l0(); }; T.rooms.set(name, ch); return Promise.resolve(ch); }
    if (pending.has(name)) return pending.get(name);
    const who = jo.host
      ? rpc('host_game', { room: name }).then((r) => { if (r !== 'ok') throw coded(typeof r === 'string' && r ? r : 'upstream_error'); return me; })
      : rpc('game_host', { room: name }).then((h) => { if (typeof h !== 'string' || !h) throw coded('no_game'); return h; });
    const p = who.then((host) => {
      const ch = open(name); ch.host = host;
      // (the host's row is renewed while its game is open, and let go when it leaves)
      const renew = host === me ? setInterval(() => rpc('host_game', { room: name }).catch(() => {}), RENEW) : 0;
      const l0 = ch.leave; let done = false;
      ch.leave = () => { if (!done) { done = true; T.rooms.delete(name); clearInterval(renew); if (host === me) rpc('end_game', { room: name }).catch(() => {}); } return l0(); };
      T.rooms.set(name, ch); return ch;
    }).finally(() => pending.delete(name));
    pending.set(name, p);
    return p;
  };
  return T;
}
// (a function of the 'skotos' schema by RPC: its data, or a refusal coded by the server's own word)
const rpcOf = (client) => (fn, args) => Promise.resolve(client.schema('skotos').rpc(fn, args)).then((r) => {
  if (r?.error) throw coded(String(r.error.message || r.error.code || 'upstream_error').slice(0, 64));
  return r?.data;
});
// what a page says, by skotos.send: one call on its way at a time; what is said meanwhile waits (64 at most) and goes
// in the next, sixteen a call. Each message's promise is its call's answer
function poster(rpc) {
  const q = []; let busy = false;
  const flush = () => {
    if (busy || !q.length) return;
    busy = true;
    const b = q.splice(0, CALL_MAX);
    rpc('send', { msgs: b.map((m) => m.m) }).then(() => { for (const m of b) m.ok('ok'); }, (e) => { for (const m of b) m.no(e); }).finally(() => { busy = false; flush(); });
  };
  return (topic, event, data) => new Promise((ok, no) => {
    if (q.length >= WAIT_MAX) { no(coded('busy')); return; }
    q.push({ m: [topic, event, JSON.stringify(data ?? null)], ok, no }); flush();
  });
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
  if (cfg.url && cfg.anonKey && cfg.stamped === true) {
    try {
      const make = cfg.createClient || (typeof window !== 'undefined' && window.supabase?.createClient);
      if (make) { const client = await make(cfg.url, cfg.anonKey, clientOpts()), me = await signIn(client); if (me) return SupabaseTransport(client, { stamped: true, me }); }
    } catch (e) { /* not this build, or no sign-in: single-player */ }
  }
  return null;
}
// (each tab its own anonymous user, kept across its reloads: the session in sessionStorage where the page may use it,
// so two tabs of one browser are two players, not one user twice; with no storage, a user for this load only)
function clientOpts() {
  let storage = null;
  try { storage = typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch (e) { storage = null; }
  const auth = { storageKey: 'skotos-auth', autoRefreshToken: true, detectSessionInUrl: false, persistSession: !!storage };
  if (storage) auth.storage = storage;
  return { auth, realtime: { params: { eventsPerSecond: BUDGET } } };
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
