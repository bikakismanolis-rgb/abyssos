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
// A transport: { kind, lobby: Channel | null, join(name) -> Promise<Channel> }. Three of them:
// - RoomTransport (claude.ai artifact `room`): the lobby is the room itself, a game is room.join(name). The room's own
//   budget (~40 sends a second per page, emits and presence together, burst 80; 4 KiB a message and 4 KiB of presence)
//   is held here below it: BUDGET sends a second, the coalesced presence counted in.
// - LocalTransport (BroadcastChannel): pages of one browser, for the tests; drops and lag on demand (o.drop, o.lag).
// - SupabaseTransport (Supabase Realtime broadcast and presence, supabase-js v2): for the app and the public web build.
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
    const p = Promise.resolve(room.join(name)).then((r) => { const ch = wrap(r, name); const l0 = ch.leave; ch.leave = () => { T.rooms.delete(name); return l0(); }; T.rooms.set(name, ch); return ch; }, (e) => { dead(e); throw e; }).finally(() => pending.delete(name));
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
// who joins and leaves) and the game's presence goes as a broadcast '_p', coalesced as any presence, said again every
// 1.5 s (a lost one mended) and when someone joins. A peer is a member with its last '_p'; one silent 12 s is gone.
// Who sent a broadcast rides in its payload (Supabase does not stamp it: untrusted, as everything)
export function SupabaseTransport(client, o = {}) {
  if (!client?.channel) return null;
  const me = o.me || 'p' + Math.random().toString(36).slice(2, 10);
  const bucket = makeBucket(o.rate, o.burst);
  const open = (name) => {
    const sc = client.channel('skotos:' + name, { config: { broadcast: { self: false, ack: false }, presence: { key: me } } });
    let hb = 0;
    const wire = {
      kind: 'supabase', me, sentT: 0,
      send: (topic, data) => sc.send({ type: 'broadcast', event: topic, payload: { f: me, d: data } }),
      sendPresence: (p) => { wire.sentT = Date.now(); return sc.send({ type: 'broadcast', event: '_p', payload: { f: me, p } }); },
      leave: () => { clearInterval(hb); return client.removeChannel ? client.removeChannel(sc) : sc.unsubscribe(); }
    };
    const ch = makeChannel(name, wire, Object.assign({ bucket }, o));
    // each peer's last presence ({ p, raw, t }), the views handed out (the same object while its presence is the same)
    const last = new Map(), memo = new Map();
    let members = new Set(), self = null;
    const sync = () => {
      const st = sc.presenceState() || {}, t = Date.now(), next = [], now0 = new Set(Object.keys(st));
      // (someone new: our presence again, at once)
      for (const k of now0) if (k !== me && !members.has(k)) { ch.presence({}); break; }
      members = now0;
      for (const k of now0) {
        if (k === me) continue;
        const L = last.get(k);
        if (L && t - L.t > (o.gone || 12000)) continue;
        const c = memo.get(k), v = c && c.src === L ? c.v : { peer: k, by: null, isMe: false, presence: L?.p || {}, updatedAt: L?.t || t };
        memo.set(k, { src: L, v }); next.push(v);
      }
      for (const k of memo.keys()) if (!now0.has(k)) memo.delete(k);
      for (const k of last.keys()) if (!now0.has(k) && t - last.get(k).t > (o.gone || 12000)) last.delete(k);
      if (!self || self.presence !== ch.mine()) self = { peer: me, by: null, isMe: true, presence: ch.mine(), updatedAt: t };
      next.unshift(self);
      ch._peers(next);
    };
    const topics = new Set();
    const on0 = ch.on;
    // (supabase-js wants its listeners before subscribe(): the game's topics are given up front, o.topics, and any other
    // is heard through a catch-all '*' listener)
    sc.on('broadcast', { event: '*' }, (m) => {
      const t = m.event, pl = m.payload || {}; if (pl.f === me) return;
      if (t === '_p') {
        const k = String(pl.f || ''); if (!k || !pl.p || typeof pl.p !== 'object' || Array.isArray(pl.p)) return;
        const raw = JSON.stringify(pl.p), L = last.get(k);
        if (L && L.raw === raw) { L.t = Date.now(); return; }
        if (!L && last.size > 64) return;
        last.set(k, { p: pl.p, raw, t: Date.now() }); sync();
        return;
      }
      if (!TOPIC.test(t)) return;
      ch._hear({ topic: t, data: pl.d, peer: String(pl.f || '?'), by: null });
    });
    ch.on = (topic, fn) => { topics.add(topic); return on0(topic, fn); };
    sc.on('presence', { event: 'sync' }, sync);
    sc.subscribe((status) => {
      if (status === 'SUBSCRIBED') { Promise.resolve(sc.track({ k: me })).catch(() => {}); ch._conn(true); sync(); }
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') ch._conn(false);
    });
    // (the presence said again when nothing new went for a while; the silent let go)
    hb = setInterval(() => { if (!ch.connected()) return; if (Date.now() - wire.sentT > 1200) ch.presence({}); sync(); }, 1500);
    return ch;
  };
  const T = { kind: 'supabase', me, lobby: open(o.lobby || 'lobby'), rooms: new Map() };
  T.join = (name) => {
    if (!ROOM.test(name)) return Promise.reject(new Error('invalid_argument'));
    if (T.rooms.has(name)) return Promise.resolve(T.rooms.get(name));
    const ch = open(name); const l0 = ch.leave; ch.leave = () => { T.rooms.delete(name); return l0(); }; T.rooms.set(name, ch);
    return Promise.resolve(ch);
  };
  return T;
}

// ---------- which one ----------
// ?net=local (the tests: pages of one browser), the artifact's room when the page runs in claude.ai, Supabase when the
// build carries its config (net/netcfg.js), a client, and a server that stamps who sent each message (cfg.stamped:
// Realtime itself does not, and a guest believes its host's messages only for the sender on them; docs/coop/release.md
// step 5); else null: the single-player game
export async function pickTransport(q, cfg = {}) {
  const want = q?.get?.('net');
  if (want === 'off') return null;
  if (want === 'local') return LocalTransport({ drop: +(q.get('netdrop') || 0), lag: +(q.get('netlag') || 0), me: q.get('peer') || undefined });
  if (want !== 'supabase' && typeof window !== 'undefined' && window.claude?.use) {
    try { const room = await window.claude.use('room'); if (room) return RoomTransport(room); } catch (e) { /* no room here */ }
  }
  if (cfg.url && cfg.anonKey && cfg.stamped === true) {
    try { const make = cfg.createClient || (typeof window !== 'undefined' && window.supabase?.createClient); if (make) return SupabaseTransport(make(cfg.url, cfg.anonKey, { realtime: { params: { eventsPerSecond: BUDGET } } })); } catch (e) { /* not this build */ }
  }
  return null;
}
