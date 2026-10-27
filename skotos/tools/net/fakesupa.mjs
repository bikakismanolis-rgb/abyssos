// The fake supabase-js v2 client and project the co-op tests run SupabaseTransport against (tools/net/test-transport.mjs,
// and tools/coop.mjs NET=supa, where a page's client reaches one of these in node through a binding).
// a fake supabase-js v2 client: channels by name share a bus; broadcast (self: false), presence track/sync (a key is in
// presenceState once it has tracked). Realtime's limits, as its docs give them: a client's 6th track() or untrack() within
// 30 s shuts its channel (ClientPresenceRateLimitReached: CLOSED, broadcast with it), and bus.log counts the project's
// events (each message sent and each delivered: the project's messages a second).
// And the stamped path, the project as supabase/migrations/*_skotos_coop.sql makes it (tools/net/test-migration.mjs
// tries that SQL itself): auth (signInAnonymously gives a user id, getSession keeps it), private channels (another
// channel than the public one of the same name; joined only signed in and only on a 'skotos:' topic; a client's own
// broadcast on one is refused, as the policies refuse its write), and schema('skotos').rpc: send (signed in, the topic:
// the lobby or a live game's, the event, 4096 bytes of the data's JSON text and JSON it must be, the user's buckets: 40
// messages a second and 80 at once, n tokens for n, and bytes, each message its data's and 256, the game's host 64 KiB
// a second and 256 KiB at once, any other 24 and 64, the lobby 0.5 and 8; the day's caps, the user's and the project's
// (bus.srv.quota, counted exactly here: the migration's count lags by 64 KiB a user); then each as { d, _by }, d the
// page's text as it came, to every member of the private channel, its sender too: a broadcast from the database knows
// no self), host_game / game_host / end_game (the games rows: one a user, 'quota' for a new game past the day's cap).
// An RPC answers after o.lagMin ms (0 unless given) and up to o.lag ms more (random: calls that overlap may be answered out of order, as HTTP may), or
// after exactly o.lagOf[fn] ms where that is given (a race made certain); it is committed as it answers. Its builder
// takes abortSignal() as supabase-js's does; o.hang: that many of the client's sends never answered (a request lost on
// a dead connection). o.auth: the client's auth options (its session kept in o.auth.storage, as supabase-js keeps it).
// bus.srv.log counts the calls (and each function's: fn), refusals, aborts and stamped deliveries, and keeps the order
// in which the games' calls were committed (games: 'host_game <room>', 'end_game <room>')
export function fakeSupabase(bus, o = {}) {
  const log = (bus.log ||= { events: 0, tracks: 0, closed: 0 }), tracks = [];
  const srv = (bus.srv ||= { users: 0, ids: 0, games: new Map(), rates: new Map(), quota: { bytes: 0, day_cap: 48 * 1048576, user_cap: 48 * 1048576 }, log: { calls: 0, fn: {}, games: [], refused: {}, signIns: 0, aborted: 0, hung: 0 } });
  const store = o.auth?.storage, key = o.auth?.storageKey || 'sb-auth';
  let uid = o.uid || null, hang = o.hang || 0;
  if (!uid && store) { try { uid = JSON.parse(store.getItem(key) || 'null')?.user?.id || null; } catch (e) { uid = null; } }
  const RX = { topic: /^skotos:[a-z0-9][a-z0-9_.-]{0,47}$/, event: /^(_p|[a-z][a-z0-9_.-]{0,47})$/, room: /^[a-z0-9][a-z0-9_.-]{0,47}$/ };
  const utf8 = (x) => new TextEncoder().encode(x).length;
  const refuse = (m) => { srv.log.refused[m] = (srv.log.refused[m] || 0) + 1; return { data: null, error: { message: m, code: 'P0001' } }; };
  const live = (room) => { const g = srv.games.get(room); return g && g.exp > Date.now() ? g : null; };
  const fns = {
    send({ msgs }) {
      if (!uid) return refuse('not_signed_in');
      if (!Array.isArray(msgs) || msgs.length < 1 || msgs.length > 16) return refuse('invalid_argument');
      let game = 0, lobby = 0, hosting = false;
      for (const m of msgs) {
        if (!Array.isArray(m) || m.length !== 3 || m.some((x) => typeof x !== 'string') || !RX.topic.test(m[0]) || !RX.event.test(m[1])) return refuse('invalid_argument');
        const b = utf8(m[2]);
        if (b > 4096) return refuse('too_big');
        try { JSON.parse(m[2]); } catch (e) { return refuse('invalid input syntax for type json'); }
        if (m[0] === 'skotos:lobby') { lobby += b + 256; continue; }
        const g = live(m[0].slice(7)); if (!g) return refuse('no_game');
        hosting ||= g.host === uid; game += b + 256;
      }
      const Q = srv.quota;
      if (Q.bytes >= Q.day_cap) return refuse('quota');
      // (each bucket fills from its own last draw: a call to the lobby neither fills nor empties the game's)
      const t = Date.now(), r = srv.rates.get(uid) || { tok: 80, game: 262144, lobby: 8192, at: t, gat: t, lat: t, spent: 0 }, s = (x) => (t - x) / 1000;
      const tok = Math.min(80, r.tok + s(r.at) * 40), gt = hosting ? Math.min(262144, r.game + s(r.gat) * 65536) : Math.min(65536, r.game + s(r.gat) * 24576), lt = Math.min(8192, r.lobby + s(r.lat) * 512);
      if (tok < msgs.length || gt < game || lt < lobby) return refuse('rate_limited');
      if (r.spent + game + lobby > Q.user_cap || Q.bytes + game + lobby > Q.day_cap) return refuse('quota');
      srv.rates.set(uid, { tok: tok - msgs.length, at: t, game: game ? gt - game : r.game, gat: game ? t : r.gat, lobby: lobby ? lt - lobby : r.lobby, lat: lobby ? t : r.lat, spent: r.spent + game + lobby });
      Q.bytes += game + lobby;
      // (realtime.send adds an id of its own to the payload)
      msgs.forEach((m) => bus.stamp(m[0], m[1], { d: m[2], _by: uid, id: 'm' + ++srv.ids }));
      return { data: msgs.length, error: null };
    },
    host_game({ room }) {
      if (!uid) return refuse('not_signed_in');
      if (typeof room !== 'string' || !RX.room.test(room)) return refuse('invalid_argument');
      for (const [k, g] of srv.games) if (g.exp < Date.now()) srv.games.delete(k);
      const g = srv.games.get(room);
      if (g && g.host !== uid) return { data: 'taken', error: null };
      if (!g && srv.quota.bytes >= srv.quota.day_cap) return { data: 'quota', error: null };
      for (const [k, x] of srv.games) if (x.host === uid && k !== room) srv.games.delete(k);
      srv.games.set(room, { host: uid, exp: Date.now() + 4 * 3600e3 });
      return { data: 'ok', error: null };
    },
    game_host({ room }) { return { data: uid ? live(room)?.host ?? null : null, error: null }; },
    end_game({ room }) { const g = srv.games.get(room); if (g && g.host === uid) srv.games.delete(room); return { data: null, error: null }; }
  };
  // (the server shuts every channel of a topic, private or not (bus.shut('skotos:...', true)): a test's lost channel)
  bus.shut ||= (topic, priv = true) => { for (const x of [...(bus[(priv ? 'priv:' : '') + topic]?.chans || [])]) x._shut(); };
  // (what the server broadcasts, stamped: to every member of the private channel, the sender too)
  bus.stamp ||= (topic, event, payload) => {
    const c = bus['priv:' + topic]; log.events++;
    if (c) for (const [, mm] of c.members) { log.events++; srv.log.delivered = (srv.log.delivered || 0) + 1; setTimeout(() => mm.L.b.forEach(([ev, f]) => { if (ev === '*' || ev === event) f({ event, payload }); }), 5); }
  };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null }, error: null }),
      signInAnonymously: async () => {
        if (bus.noAnon) return { data: null, error: { message: 'Anonymous sign-ins are disabled' } };
        srv.log.signIns++; uid = 'u' + String(++srv.users).padStart(3, '0') + '-' + Math.random().toString(16).slice(2, 10);
        if (store) store.setItem(key, JSON.stringify({ access_token: 'a', refresh_token: 'r', user: { id: uid } }));
        return { data: { user: { id: uid }, session: { user: { id: uid } } }, error: null };
      }
    },
    realtime: { setAuth: async () => {} },
    schema: (sch) => ({
      rpc: (fn, args) => {
        let signal = null;
        const run = () => new Promise((res) => {
          srv.log.calls++; srv.log.fn[fn] = (srv.log.fn[fn] || 0) + 1;
          if (fn === 'send' && hang > 0) { hang--; srv.log.hung++; signal?.addEventListener('abort', () => srv.log.aborted++); return; }
          const ms = o.lagOf && fn in o.lagOf ? o.lagOf[fn] : (o.lagMin || 0) + Math.random() * (o.lag ?? 20);
          setTimeout(() => {
            if (fn === 'host_game' || fn === 'end_game') srv.log.games.push(fn + ' ' + args?.room);
            res(sch === 'skotos' && fns[fn] ? fns[fn](args || {}) : { data: null, error: { message: 'not found', code: 'PGRST202' } });
          }, ms);
        });
        const b = { abortSignal(sg) { signal = sg; return b; }, then: (f, r) => run().then(f, r) };
        return b;
      }
    }),
    channel(name, opts) {
      const key = opts?.config?.presence?.key, L = { b: [], p: [] }, priv = !!opts?.config?.private;
      const c = bus[(priv ? 'priv:' : '') + name] ||= { members: new Map() };
      let status = null, cb0 = null;
      const sync = () => setTimeout(() => { for (const m of c.members.values()) m.L.p.forEach((f) => f()); }, 5);
      const ch = {
        on(type, filter, fn) { if (type === 'broadcast') L.b.push([filter.event, fn]); if (type === 'presence') L.p.push(fn); return ch; },
        subscribe(cb) {
          cb0 = cb;
          // (a private channel: joined signed in, on a skotos topic, or not at all)
          if (priv && (!uid || !name.startsWith('skotos:'))) { setTimeout(() => cb('CHANNEL_ERROR'), 5); return ch; }
          c.members.set(key, { L, state: null }); setTimeout(() => { if (status === 'CLOSED') return; status = 'SUBSCRIBED'; cb('SUBSCRIBED'); sync(); }, 5); return ch;
        },
        send(m) {
          if (status !== 'SUBSCRIBED') return Promise.resolve('error');
          // (no client broadcasts on a private skotos channel: the policies give it no write)
          if (priv) { srv.log.refused.clientBroadcast = (srv.log.refused.clientBroadcast || 0) + 1; return Promise.resolve('error'); }
          log.events++;
          for (const [k, mm] of c.members) if (k !== key) { log.events++; setTimeout(() => mm.L.b.forEach(([ev, f]) => { if (ev === '*' || ev === m.event) f({ event: m.event, payload: m.payload }); }), 5); }
          return Promise.resolve('ok');
        },
        track(p) {
          if (status !== 'SUBSCRIBED') return Promise.resolve('error');
          const t = Date.now(); tracks.push(t); while (tracks[0] < t - 30000) tracks.shift(); log.tracks++;
          if (tracks.length > 5) { status = 'CLOSED'; log.closed++; c.members.delete(key); cb0?.('CLOSED'); sync(); return Promise.resolve('error'); }
          // (a track is sent, and its presence diff delivered to every other member)
          const mm = c.members.get(key); if (!mm) return Promise.resolve('error');
          log.events += c.members.size; mm.state = p; sync(); return Promise.resolve('ok');
        },
        presenceState() { const o = {}; for (const [k, m] of c.members) if (m.state) o[k] = [Object.assign({ presence_ref: 'r' }, m.state)]; return o; },
        unsubscribe() { status = 'CLOSED'; c.chans?.delete(ch); if (c.members.get(key)?.L === L && c.members.delete(key)) log.events += c.members.size; sync(); return Promise.resolve('ok'); },
        // (the server shuts the channel: CLOSED, told to its subscriber, as realtime-js tells it; it is not joined again)
        _shut() { if (status === 'CLOSED') return; status = 'CLOSED'; c.chans?.delete(ch); if (c.members.get(key)?.L === L) c.members.delete(key); cb0?.('CLOSED'); sync(); }
      };
      (c.chans ||= new Set()).add(ch);
      return ch;
    },
    removeChannel(ch) { return ch.unsubscribe(); },
    get uid() { return uid; }
  };
  return client;
}
