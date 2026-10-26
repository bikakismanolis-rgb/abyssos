// node tools/net/test-transport.mjs: the co-op transports against their wires.
// 1. RoomTransport over the faithful fake room (fakeroom.mjs): four pages in a named game room, the host sending
//    snapshots of the game's real size at the game's rate, three guests their presence; 10% loss; then the limits:
//    an oversized message, an oversized presence, a dropped connection, a page leaving. It must stay under the room's
//    budget (no budget drops at the platform), never send what the room would reject, and say what it dropped.
// 2. LocalTransport (BroadcastChannel, as the browser tests use it) and 3. SupabaseTransport against a fake
//    supabase-js client: the same channel shape.
// 4. The room's refusals and ends (contract 0.2.89): a Viewer's sends refused not_permitted and told, a view the room
//    cannot connect (not_granted) and a grant withdrawn mid-game (revoked) told once as the room's end, a name joined
//    twice at once joined once.
import { Hub } from './fakeroom.mjs';
import { RoomTransport, LocalTransport, SupabaseTransport, pickTransport, bytesOf, BUDGET } from '../../src/net/transport.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

async function roomTest() {
  const hub = new Hub({ loss: 0.1, topics: { s: 'interact', f: 'interact', c: 'interact' } });
  const pages = [0, 1, 2, 3].map((i) => hub.page({ by: 'u' + i }));
  const T = pages.map((p) => RoomTransport(p.room));
  ok(T.every((t) => t && t.lobby), 'a RoomTransport over each page');
  ok(RoomTransport(null) === null, 'no room: no transport (single-player)');
  await sleep(50);
  const chs = await Promise.all(T.map((t) => t.join('skotos-g-ab12')));
  await sleep(200);
  ok(chs.every((c) => c.peers().length === 4), 'four peers in the game room on every page: ' + chs.map((c) => c.peers().length));
  ok(chs.every((c) => c.me && c.peers().filter((p) => p.isMe).length === 1), 'each page knows itself');
  // a snapshot as big as the game's biggest (the host's 60 actors, fx, events: 3.6 KiB)
  const snap = (k) => ({ k, a: Array.from({ length: 60 }, (_, i) => [i + 100, 12, 1234 + k, 2345, 51, 200, 3, 4, 1]), f: Array.from({ length: 20 }, () => [3, 123.4, 56.7, 2, 16719904]), pad: 'x'.repeat(800) });
  console.log('     snapshot bytes', bytesOf(snap(1)));
  const got = [0, 0, 0, 0], pres = [0, 0, 0, 0];
  chs.forEach((c, i) => { c.on('s', () => got[i]++); c.onPeers(({ updated }) => { pres[i] += updated.length; }); });
  const t0 = Date.now(); let k = 0;
  while (Date.now() - t0 < 10000) {
    // host: a snapshot each 100 ms, plus its own fx topic; guests: presence each frame (coalesced), an fx batch each 200 ms
    if (k % 6 === 0) chs[0].emit('s', snap(k));
    for (let g = 1; g < 4; g++) { chs[g].presence({ h: [k, g, 1000 + k, 2000, 3], ev: [[k, 101, 55]] }); if (k % 12 === 0) chs[g].emit('f', [[1, 2, 3]]); }
    for (const c of chs) c.pump();
    k++; await sleep(16);
  }
  await sleep(300);
  const rates = chs.map((c) => c.meter.rate());
  console.log('     sends a second per page', rates.map((r) => r.msgsOut.toFixed(1)).join(' '), ' bytes out a second', rates.map((r) => Math.round(r.bytesOut)).join(' '));
  ok(hub.log.budgetDrops === 0, 'the platform dropped nothing for budget (ours held under it): ' + hub.log.budgetDrops);
  ok(rates.every((r) => r.msgsOut <= BUDGET), 'every page under ' + BUDGET + ' sends a second');
  ok(!hub.log.rejects.invalid_argument, 'nothing sent that the room rejects');
  const exp = 10000 / (6 * 16);
  ok(got.slice(1).every((g) => g > exp * 0.75 && g < exp * 1.05), 'guests heard ~90% of ~' + Math.round(exp) + ' snapshots through 10% loss: ' + got.slice(1));
  ok(got[0] === 0, 'no echo of its own sends on the host');
  ok(pres[0] > 150, 'the host saw the guests\' presence move: ' + pres[0] + ' updates');
  // the limits
  const big = await chs[0].emit('s', { pad: 'x'.repeat(5000) });
  ok(big === false && chs[0].meter.tx.big === 1, 'a 5 KB message is refused before the room sees it');
  const bp = await chs[1].presence({ junk: 'y'.repeat(5000) });
  ok(bp === false, 'a presence over 4 KiB is refused');
  ok(!hub.log.rejects.invalid_argument, 'and the room never saw either');
  // a dropped connection: sends fail fast, presence waits and comes back
  pages[2].setConnected(false); await sleep(30);
  ok(!chs[2].connected(), 'a page knows it lost the room');
  const dc = await chs[2].emit('s', { x: 1 });
  ok(dc === false, 'an emit while disconnected is dropped and said so');
  chs[2].presence({ h: [9, 9, 9] }); pages[2].setConnected(true); await sleep(200); chs[2].pump(); await sleep(200);
  const seen = chs[0].peers().find((p) => p.peer === chs[2].me);
  ok(seen && JSON.stringify(seen.presence.h) === '[9,9,9]', 'its presence arrives once back');
  // leaving: the others see it go
  let leftSeen = false; chs[0].onPeers(({ left }) => { if (left.some((p) => p.peer === chs[3].me)) leftSeen = true; });
  await chs[3].leave(); await sleep(150);
  ok(leftSeen && chs[0].peers().length === 3, 'a page that leaves is gone for the others');
  // topics the artifact did not open are refused for a non-admin page (our own topics are opened: README)
  const p5 = hub.page({ by: 'u5' }), r5 = await p5.room.join('skotos-g-ab12');
  let code = null; await r5.emit('secret', 1).catch((e) => { code = e.code; });
  ok(code === 'not_permitted', 'an unopened topic: not_permitted (why the README lists the topics to open)');
}

async function endsTest() {
  const hub = new Hub({ lag: 10, topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } });
  // a Viewer (or Commenter): admitted, its sends refused, and the game told
  const vw = RoomTransport(hub.page({ by: 'uv', viewer: true }).room), seen = [];
  vw.lobby.onError((code, how) => seen.push(code + ':' + how));
  await sleep(60);
  const sent = await vw.lobby.emit('c', { op: 'hi' });
  ok(sent === false && seen.join() === 'not_permitted:send', 'a Viewer\'s send is refused and told: not_permitted (send) ' + seen);
  ok(!vw.dead, 'and that is not the room\'s end for it');
  // a view the room cannot connect: not_granted, once, as the room's end; a join refused with it
  const ngp = hub.page({ ng: true }), ng = RoomTransport(ngp.room), dead = [];
  ng.onDead((c) => dead.push(c));
  await sleep(60);
  ok(ng.dead === 'not_granted' && dead.join() === 'not_granted', 'not_granted heard as the room\'s end, once: ' + dead);
  let jc = null; await ng.join('skotos-ng12').catch((e) => { jc = e.code; });
  ok(jc === 'not_granted' && !ng.lobby.connected(), 'a join after it is refused with it, the lobby not connected');
  // a grant withdrawn mid-game: the game's channel hears it, the transport ends once
  const hp = hub.page({ by: 'uh' }), H = RoomTransport(hp.room), gp = RoomTransport(hub.page({ by: 'ug' }).room);
  const hc = await H.join('skotos-rv12'), gc = await gp.join('skotos-rv12'), hd = [], he = [];
  H.onDead((c) => hd.push(c)); hc.onError((c, how) => he.push(c + ':' + how));
  await sleep(80);
  ok(gc.peers().length === 2, 'two in the game room');
  hp.end('revoked'); await sleep(80);
  ok(H.dead === 'revoked' && hd.join() === 'revoked', 'revoked: the room\'s end, told once: ' + hd);
  ok(he.includes('revoked:room') && !hc.connected(), 'the game\'s channel heard it and is not connected: ' + he);
  ok(gc.peers().length === 1, 'the other page sees it gone');
  ok((await hc.emit('s', { x: 1 })) === false, 'its sends go nowhere after');
  // a name joined twice at once is one join, one channel
  const T2 = RoomTransport(hub.page({ by: 'u2' }).room);
  const [a, b] = await Promise.all([T2.join('skotos-tw12'), T2.join('skotos-tw12')]);
  ok(a === b && hub.rooms.get('skotos-tw12').members.size === 1, 'two joins of one name in flight: one channel, one membership');
}

async function localTest() {
  const a = LocalTransport({ me: 'pa' }), b = LocalTransport({ me: 'pb' });
  ok(!!(a && b), 'LocalTransport over BroadcastChannel');
  const ca = await a.join('skotos-g-test'), cb = await b.join('skotos-g-test');
  let heard = null; cb.on('s', (m) => { heard = m; });
  await sleep(1300);
  ok(ca.peers().length === 2 && cb.peers().length === 2, 'two local peers see each other');
  await ca.emit('s', { n: 7 }); await sleep(50);
  ok(heard?.data?.n === 7 && heard.peer === 'pa', 'a local emit arrives with its sender');
  ca.presence({ h: [1, 2] }); await sleep(150); ca.pump(); await sleep(100);
  ok(JSON.stringify(cb.peers().find((p) => p.peer === 'pa')?.presence?.h) === '[1,2]', 'local presence arrives');
  await ca.leave(); await sleep(100);
  ok(cb.peers().length === 1, 'a local page that leaves is gone');
  await cb.leave(); a.lobby.leave(); b.lobby.leave();
}

// a fake supabase-js v2 client: channels by name share a bus; broadcast (self: false), presence track/sync (a key is in
// presenceState once it has tracked). Realtime's limits, as its docs give them: a client's 6th track() or untrack() within
// 30 s shuts its channel (ClientPresenceRateLimitReached: CLOSED, broadcast with it), and bus.log counts the project's
// events (each message sent and each delivered: the project's messages a second).
// And the stamped path, the project as supabase/migrations/*_skotos_coop.sql makes it (tools/net/test-migration.mjs
// tries that SQL itself): auth (signInAnonymously gives a user id, getSession keeps it), private channels (another
// channel than the public one of the same name; joined only signed in and only on a 'skotos:' topic; a client's own
// broadcast on one is refused, as the policies refuse its write), and schema('skotos').rpc: send (signed in, the topic,
// the event, 4096 bytes of the data's JSON text, the user's bucket of 40 a second and 80 at once, n tokens for n; then
// each as { d, _by } to every member of the private channel, its sender too: a broadcast from the database knows no
// self), host_game / game_host / end_game (the games rows). An RPC answers after o.lag ms (random below it: calls that
// overlap may be answered out of order, as HTTP may). bus.srv.log counts the calls, refusals and stamped deliveries
function fakeSupabase(bus, o = {}) {
  const log = (bus.log ||= { events: 0, tracks: 0, closed: 0 }), tracks = [];
  const srv = (bus.srv ||= { users: 0, ids: 0, games: new Map(), rates: new Map(), log: { calls: 0, refused: {}, signIns: 0 } });
  let uid = o.uid || null;
  const RX = { topic: /^skotos:[a-z0-9][a-z0-9_.-]{0,47}$/, event: /^(_p|[a-z][a-z0-9_.-]{0,47})$/, room: /^[a-z0-9][a-z0-9_.-]{0,47}$/ };
  const utf8 = (x) => new TextEncoder().encode(x).length;
  const refuse = (m) => { srv.log.refused[m] = (srv.log.refused[m] || 0) + 1; return { data: null, error: { message: m, code: 'P0001' } }; };
  const live = (room) => { const g = srv.games.get(room); return g && g.exp > Date.now() ? g : null; };
  const fns = {
    send({ msgs }) {
      if (!uid) return refuse('not_signed_in');
      if (!Array.isArray(msgs) || msgs.length < 1 || msgs.length > 16) return refuse('invalid_argument');
      for (const m of msgs) {
        if (!Array.isArray(m) || m.length !== 3 || m.some((x) => typeof x !== 'string') || !RX.topic.test(m[0]) || !RX.event.test(m[1])) return refuse('invalid_argument');
        if (utf8(m[2]) > 4096) return refuse('too_big');
      }
      const t = Date.now(), r = srv.rates.get(uid) || { tok: 80, at: t }, tok = Math.min(80, r.tok + (t - r.at) / 1000 * 40);
      if (tok < msgs.length) return refuse('rate_limited');
      srv.rates.set(uid, { tok: tok - msgs.length, at: t });
      let ds; try { ds = msgs.map((m) => JSON.parse(m[2])); } catch (e) { return refuse('invalid json'); }
      // (realtime.send adds an id of its own to the payload)
      msgs.forEach((m, i) => bus.stamp(m[0], m[1], { d: ds[i], _by: uid, id: 'm' + ++srv.ids }));
      return { data: msgs.length, error: null };
    },
    host_game({ room }) {
      if (!uid) return refuse('not_signed_in');
      if (typeof room !== 'string' || !RX.room.test(room)) return refuse('invalid_argument');
      for (const [k, g] of srv.games) if (g.exp < Date.now()) srv.games.delete(k);
      const g = srv.games.get(room);
      if (g && g.host !== uid) return { data: 'taken', error: null };
      if ([...srv.games.entries()].filter(([k, x]) => x.host === uid && k !== room).length >= 4) return { data: 'too_many', error: null };
      srv.games.set(room, { host: uid, exp: Date.now() + 4 * 3600e3 });
      return { data: 'ok', error: null };
    },
    game_host({ room }) { return { data: uid ? live(room)?.host ?? null : null, error: null }; },
    end_game({ room }) { const g = srv.games.get(room); if (g && g.host === uid) srv.games.delete(room); return { data: null, error: null }; }
  };
  // (what the server broadcasts, stamped: to every member of the private channel, the sender too)
  bus.stamp ||= (topic, event, payload) => {
    const c = bus['priv:' + topic]; log.events++;
    if (c) for (const [, mm] of c.members) { log.events++; srv.log.delivered = (srv.log.delivered || 0) + 1; setTimeout(() => mm.L.b.forEach(([ev, f]) => { if (ev === '*' || ev === event) f({ event, payload }); }), 5); }
  };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: uid ? { user: { id: uid } } : null }, error: null }),
      signInAnonymously: async () => { if (bus.noAnon) return { data: null, error: { message: 'Anonymous sign-ins are disabled' } }; srv.log.signIns++; uid = 'u' + String(++srv.users).padStart(3, '0') + '-' + Math.random().toString(16).slice(2, 10); return { data: { user: { id: uid }, session: { user: { id: uid } } }, error: null }; }
    },
    realtime: { setAuth: async () => {} },
    schema: (sch) => ({ rpc: (fn, args) => new Promise((res) => { srv.log.calls++; setTimeout(() => res(sch === 'skotos' && fns[fn] ? fns[fn](args || {}) : { data: null, error: { message: 'not found', code: 'PGRST202' } }), Math.random() * (o.lag ?? 20)); }) }),
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
        unsubscribe() { status = 'CLOSED'; if (c.members.delete(key)) log.events += c.members.size; sync(); return Promise.resolve('ok'); }
      };
      return ch;
    },
    removeChannel(ch) { return ch.unsubscribe(); },
    get uid() { return uid; }
  };
  return client;
}
async function supaTest() {
  const bus = {};
  const a = SupabaseTransport(fakeSupabase(bus), { me: 'sa' }), b = SupabaseTransport(fakeSupabase(bus), { me: 'sb' });
  ok(!!(a && b) && SupabaseTransport(null) === null, 'SupabaseTransport over a supabase-js client (none: null)');
  const ca = await a.join('skotos-g-sup'), cb = await b.join('skotos-g-sup');
  let heard = null; cb.on('s', (m) => { heard = m; });
  await sleep(60);
  ok(ca.connected() && cb.connected(), 'subscribed');
  ok(ca.peers().length === 2, 'presence sync gives both peers: ' + ca.peers().length);
  await ca.emit('s', { n: 3 }); await sleep(30);
  ok(heard?.data?.n === 3 && heard.peer === 'sa', 'a broadcast arrives with its sender');
  ca.presence({ h: [4] }); ca.pump(); await sleep(120);
  ok(JSON.stringify(cb.peers().find((p) => p.peer === 'sa')?.presence?.h) === '[4]', 'presence arrives (by broadcast)');
  // (Realtime does not stamp the sender: any client can name itself in a broadcast. So the game never takes Supabase
  // until the server stamps senders, release.md step 5: a forged host cannot reach a guest's game)
  const evil = fakeSupabase(bus).channel('skotos:skotos-g-sup', { config: { presence: { key: 'evil' } } }); evil.subscribe(() => {});
  let forged = null; cb.on('c', (m) => { forged = m; });
  await sleep(20); evil.send({ type: 'broadcast', event: 'c', payload: { f: 'sa', d: { op: 'end' } } }); await sleep(30);
  ok(forged?.peer === 'sa', 'Realtime itself does not vouch for a sender (a forged one is heard as named)');
  const cfg = { url: 'https://x.supabase.co', anonKey: 'k', createClient: () => fakeSupabase({}) };
  ok(await pickTransport(new URLSearchParams(''), cfg) === null, 'so the game takes no Supabase transport while the server stamps no senders');
  ok(!!(await pickTransport(new URLSearchParams(''), Object.assign({ stamped: true }, cfg))), 'and takes one once it does (cfg.stamped)');
  await evil.unsubscribe(); await ca.leave(); await sleep(30);
  ok(cb.peers().length === 1, 'a channel removed is gone for the other');
  await cb.leave(); a.lobby.leave(); b.lobby.leave();

  // Realtime's rates: four pages at the game's own (the host's snapshots, the guests' presence every frame and their fx),
  // for 8 s. Presence goes by broadcast and is tracked once a channel, so no channel is shut; a late joiner learns the
  // others' presence at once; one gone silent is dropped
  const bus2 = {};
  const T = [0, 1, 2, 3].map((i) => SupabaseTransport(fakeSupabase(bus2), { me: 'q' + i, gone: 4000 }));
  const chs = await Promise.all(T.map((t) => t.join('skotos-g-rate')));
  await sleep(60);
  const snap = { a: Array.from({ length: 60 }, (_, i) => [i, 12, 1234, 2345, 51, 200, 3, 4, 1]), pad: 'x'.repeat(800) };
  const t0 = Date.now(), e0 = bus2.log.events; let k = 0;
  while (Date.now() - t0 < 8000) {
    if (k % 6 === 0) chs[0].emit('s', snap);
    for (let g = 1; g < 4; g++) { chs[g].presence({ h: [k, g, 1000 + k], hb: (k / 60) | 0 }); if (k % 12 === 0) chs[g].emit('f', [[1, 2, 3]]); }
    for (const c of chs) c.pump();
    k++; await sleep(16);
  }
  const secs = (Date.now() - t0) / 1000, evs = (bus2.log.events - e0) / secs;
  await sleep(150);
  ok(bus2.log.closed === 0 && chs.every((c) => c.connected()) && T.every((t) => t.lobby.connected()), 'eight seconds at the game\'s rates: no channel shut for its presence');
  ok(bus2.log.tracks === 8, 'presence tracked once on each game and lobby channel, never again: ' + bus2.log.tracks);
  ok(chs[0].peers().length === 4 && chs.slice(1).every((c) => (chs[0].peers().find((p) => p.peer === c.me)?.presence?.h?.[0] ?? -1) >= k - 12), 'the host has every guest\'s presence of the last frames');
  console.log('     the project\'s events a second for a party of four (each sent and each delivered): ' + Math.round(evs));
  const late = SupabaseTransport(fakeSupabase(bus2), { me: 'q9' }), cl = await late.join('skotos-g-rate');
  await sleep(300);
  ok(cl.peers().length === 5 && cl.peers().filter((p) => !p.isMe && p.peer !== 'q0').every((p) => p.presence.h), 'a late joiner has the others\' presence at once (they say it again when someone joins)');
  // one that tracked, said its presence once and went silent (a stopped page): gone after o.gone; the others, only
  // beating now (nothing new to say), are kept
  const mute = fakeSupabase(bus2).channel('skotos:skotos-g-rate', { config: { presence: { key: 'mute' } } });
  mute.subscribe((st) => { if (st === 'SUBSCRIBED') { mute.track({ k: 'mute' }); mute.send({ type: 'broadcast', event: '_p', payload: { f: 'mute', p: { h: [1] } } }); } });
  await sleep(400);
  ok(chs[0].peers().some((p) => p.peer === 'mute'), 'a member that said its presence is listed');
  await sleep(6000);
  ok(!chs[0].peers().some((p) => p.peer === 'mute') && chs[0].peers().length === 5, 'one silent past o.gone is dropped, the beating ones kept: ' + chs[0].peers().map((p) => p.peer).join(' '));
  ok(bus2.log.closed === 0, 'and still no channel shut');
  for (const c of [...chs, cl]) await c.leave();
  for (const t of [...T, late]) t.lobby.leave();
}

// the stamped path (release.md step 5, docs/coop/supabase.md): each page signed in anonymously, the server's '_by' the
// only sender a page believes, the games row the only host. What a forger signed in as itself can try: its own data
// naming the host, a broadcast of its own on the private channel, a message with no stamp, a presence or a listing
// that says it hosts, hosting the same room, a flood; and the cap
async function stampedTest() {
  const bus = {}, q0 = new URLSearchParams('');
  const cfg = { url: 'https://x.supabase.co', anonKey: 'k', stamped: true, createClient: () => fakeSupabase(bus) };
  const H = await pickTransport(q0, cfg), G1 = await pickTransport(q0, cfg);
  ok(H?.stamped && G1?.stamped && H.me && G1.me && H.me !== G1.me && bus.srv.log.signIns === 2, 'pickTransport signs each page in (anonymously) and takes the stamped transport; a peer is its user id: ' + H?.me);
  ok(await pickTransport(q0, Object.assign({}, cfg, { createClient: () => fakeSupabase({ noAnon: true }) })) === null, 'a project that does not allow anonymous sign-ins: no transport, the single-player game');
  const busK = {}, K = await pickTransport(q0, Object.assign({}, cfg, { createClient: () => fakeSupabase(busK, { uid: 'u-kept' }) }));
  ok(K?.me === 'u-kept' && busK.srv.log.signIns === 0, 'a session kept (a reload of the tab) is the same user, signed in again by nobody');
  K.lobby.leave();
  ok(SupabaseTransport(fakeSupabase(bus), { stamped: true }) === null, 'stamped with no user: no transport');
  // (the web build's createClient loads supabase-js first: it gives a promise of the client)
  const busA = {}, KA = await pickTransport(q0, Object.assign({}, cfg, { createClient: async () => fakeSupabase(busA) }));
  ok(KA?.stamped && busA.srv.log.signIns === 1, 'a createClient that gives a promise of the client (the web build\'s, loading supabase-js) is waited for');
  KA.lobby.leave();
  const hc = await H.join('skotos-ab12', { host: true });
  ok(hc.host === H.me && bus.srv.games.get('skotos-ab12')?.host === H.me, 'hosting makes the game\'s row; the host\'s channel says it hosts');
  const gc = await G1.join('skotos-ab12');
  ok(gc.host === H.me, 'a guest is told its host by the row');
  let nog = null; await G1.join('skotos-zz99').catch((e) => { nog = e.code; });
  ok(nog === 'no_game', 'a code with no game is refused: no_game');
  await sleep(60);
  ok(hc.connected() && gc.connected() && H.lobby.connected(), 'private channels joined, signed in');
  const pub = fakeSupabase(bus), pc = pub.channel('skotos:lobby', { config: { private: true, presence: { key: 'x' } } }); let pst = null; pc.subscribe((st) => { pst = st; });
  await sleep(30);
  ok(pst === 'CHANNEL_ERROR', 'a page not signed in cannot join a private channel');
  const heard = [], own = [];
  gc.on('s', (m) => heard.push(m)); gc.on('c', (m) => heard.push(m)); hc.on('s', (m) => own.push(m));
  hc.presence({ r: 'h', c: 'ab12', v: 3 }); gc.presence({ r: 'g', c: 'ab12', v: 3 }); hc.pump(); gc.pump();
  await hc.emit('s', { n: 1 }); await sleep(80);
  ok(heard.length === 1 && heard[0].peer === H.me && heard[0].by === H.me && heard[0].data?.n === 1, 'the host\'s snapshot arrives, its sender the server\'s word');
  ok(own.length === 0, 'its own comes back from the server and is passed over');
  ok(gc.peers().some((p) => p.peer === H.me && p.presence.r === 'h') && hc.peers().some((p) => p.peer === G1.me && p.presence.r === 'g'), 'each sees the other\'s presence, named by the server');
  // the forger, signed in as itself, in the game's channel
  const E = fakeSupabase(bus); await E.auth.signInAnonymously();
  const ET = SupabaseTransport(E, { stamped: true, me: E.uid }), ec = await ET.join('skotos-ab12');
  await sleep(60);
  const send = (msgs) => E.schema('skotos').rpc('send', { msgs });
  heard.length = 0;
  await send([['skotos:skotos-ab12', 'c', JSON.stringify({ op: 'end', f: H.me, _by: H.me })]]); await sleep(40);
  ok(heard.length === 1 && heard[0].peer === E.uid && heard[0].peer !== H.me && heard[0].data._by === H.me, 'a forged "f" and "_by" in its data: heard as itself, the stamp wins (the game, believing only its host, drops it)');
  heard.length = 0;
  const sc = E.channel('skotos:skotos-ab12', { config: { private: true, presence: { key: 'evil-2' } } }); sc.subscribe(() => {}); await sleep(20);
  const own2 = await sc.send({ type: 'broadcast', event: 'c', payload: { _by: H.me, d: { op: 'end' } } }); await sleep(30);
  ok(own2 === 'error' && heard.length === 0 && bus.srv.log.refused.clientBroadcast >= 1, 'its own broadcast on the private channel, any "_by" in it: refused, nothing heard');
  bus.stamp('skotos:skotos-ab12', 'c', { d: { op: 'end' }, f: H.me }); bus.stamp('skotos:skotos-ab12', 's', { d: { n: 9 } }); await sleep(30);
  ok(heard.length === 0, 'a message without the server\'s stamp (one naming the host in "f", one naming nobody) is dropped');
  // it says it hosts: in the game's presence, in the lobby, and by hosting the same room
  ec.presence({ r: 'h', c: 'ab12', v: 3 }); ec.pump(); ET.lobby.presence({ g: { c: 'ab12', cls: 'mage', l: 40, z: 'town', n: 1, d: 0, v: 3, on: 1 } }); ET.lobby.pump();
  await sleep(80);
  const claims = gc.peers().filter((p) => p.presence.r === 'h').map((p) => p.peer);
  ok(claims.includes(E.uid) && gc.host === H.me, 'its presence says it hosts: shown (named as itself), and the game\'s host is still the row\'s: ' + claims.length + ' claim it');
  ok(G1.lobby.peers().some((p) => p.peer === E.uid && p.presence.g?.c === 'ab12'), 'a listing of the code in the lobby is its own (a guest picking it is refused for its host: coop.js pickHost)');
  let tk = null; await ET.join('skotos-ab12', { host: true }).catch((e) => { tk = e.code; });
  ok(tk === null && ec.host === H.me, 'joined already, a join to host is the same channel, its host still the row\'s');
  const E2 = fakeSupabase(bus); await E2.auth.signInAnonymously();
  const E2T = SupabaseTransport(E2, { stamped: true, me: E2.uid });
  await E2T.join('skotos-ab12', { host: true }).catch((e) => { tk = e.code; });
  ok(tk === 'taken' && bus.srv.games.get('skotos-ab12').host === H.me, 'hosting a room another hosts: taken, the row unchanged');
  // a presence key alone (the client's own word) is no peer
  const gh = E.channel('skotos:skotos-ab12', { config: { private: true, presence: { key: 'ghost' } } });
  gh.subscribe((st) => { if (st === 'SUBSCRIBED') gh.track({ k: 'ghost' }); }); await sleep(60);
  ok(!gc.peers().some((p) => p.peer === 'ghost'), 'a presence key with no stamped presence is not listed');
  // the cap: before the wire, and at the server
  ok((await hc.emit('s', { pad: 'x'.repeat(5000) })) === false, 'a 5 KB message is refused before the wire');
  const r1 = await send([['skotos:skotos-ab12', 'f', JSON.stringify('x'.repeat(4094))]]), r2 = await send([['skotos:skotos-ab12', 'f', JSON.stringify('x'.repeat(4095))]]);
  ok(!r1.error && r2.error?.message === 'too_big', 'the server takes 4096 bytes of data and refuses 4097: too_big');
  // the rate: a flood by RPC, past the page's own bucket
  await sleep(2000);
  const f0 = bus.srv.log.refused.rate_limited || 0, flood = await Promise.all(Array.from({ length: 100 }, () => send([['skotos:lobby', 'f', '1']])));
  const went = flood.filter((r) => !r.error).length;
  ok(went >= 80 && went <= 84 && (bus.srv.log.refused.rate_limited || 0) - f0 === 100 - went, 'a hundred sends at once: 80 go (and what 40 a second refills meanwhile), the rest refused: ' + went);
  // order and batching: thirty at once from the host arrive in order, in fewer calls
  const seen = [], c0 = bus.srv.log.calls; gc.on('f', (m) => { if (m.peer === H.me) seen.push(m.data.i); });
  await Promise.all(Array.from({ length: 30 }, (_, i) => hc.emit('f', { i })));
  await sleep(80);
  ok(seen.length === 30 && seen.every((v, i) => v === i), 'thirty at once arrive in the order they were said (one call on its way at a time)');
  ok(bus.srv.log.calls - c0 < 30, 'in ' + (bus.srv.log.calls - c0) + ' calls, not thirty');
  // the host leaves: its row goes, the code is free
  for (const t of [ET, E2T]) { t.lobby.leave(); for (const c of t.rooms.values()) await c.leave(); }
  await hc.leave(); await sleep(60);
  ok(!bus.srv.games.has('skotos-ab12'), 'a host that leaves ends its game\'s row');
  let nog2 = null; const G2 = await pickTransport(q0, cfg); await G2.join('skotos-ab12').catch((e) => { nog2 = e.code; });
  ok(nog2 === 'no_game', 'and a guest coming after is told there is no game');
  await gc.leave(); for (const t of [H, G1, G2]) t.lobby.leave();
  await sleep(50);

  // four stamped pages at the game's own rates for 8 s: the server refuses none of them, and what it costs
  const bus2 = {}, cfg2 = Object.assign({}, cfg, { createClient: () => fakeSupabase(bus2, { lag: 60 }) });
  const T = await Promise.all([0, 1, 2, 3].map(() => pickTransport(q0, cfg2)));
  const chs = [await T[0].join('skotos-rate', { host: true })];
  for (let g = 1; g < 4; g++) chs.push(await T[g].join('skotos-rate'));
  await sleep(150);
  const snap = { a: Array.from({ length: 60 }, (_, i) => [i, 12, 1234, 2345, 51, 200, 3, 4, 1]), pad: 'x'.repeat(800) };
  const t0 = Date.now(), e0 = bus2.log.events, k0 = bus2.srv.log.calls, d0 = bus2.srv.log.delivered || 0; let k = 0;
  const got = [0, 0, 0, 0]; chs.forEach((c, i) => c.on('s', () => got[i]++));
  while (Date.now() - t0 < 8000) {
    if (k % 6 === 0) chs[0].emit('s', snap);
    for (let g = 1; g < 4; g++) { chs[g].presence({ h: [k, g, 1000 + k], hb: (k / 60) | 0 }); if (k % 12 === 0) chs[g].emit('f', [[1, 2, 3]]); }
    for (const c of chs) c.pump();
    k++; await sleep(16);
  }
  const secs = (Date.now() - t0) / 1000;
  await sleep(300);
  const evs = (bus2.log.events - e0) / secs, calls = (bus2.srv.log.calls - k0) / secs, del = ((bus2.srv.log.delivered || 0) - d0) / secs, exp = 8000 / (6 * 16);
  ok(!bus2.srv.log.refused.rate_limited && !bus2.srv.log.refused.too_big && chs.every((c) => c.connected()), 'eight seconds at the game\'s rates over RPC (60 ms a call): nothing refused by the server');
  ok(got.slice(1).every((g) => g > exp * 0.9), 'the guests heard the snapshots: ' + got.slice(1) + ' of ~' + Math.round(exp));
  ok(chs[0].peers().length === 4 && chs.slice(1).every((c) => (chs[0].peers().find((p) => p.peer === c.me)?.presence?.h?.[0] ?? -1) >= k - 20), 'the host has every guest\'s presence of the last frames');
  console.log('     stamped, a party of four: ' + calls.toFixed(1) + ' RPC calls a second (each a transaction), ' + Math.round(del) + ' deliveries a second, ' + Math.round(evs) + ' events a second (each sent and each delivered, the sender\'s own echo too)');
  for (const c of chs) await c.leave();
  for (const t of T) t.lobby.leave();
}

// the lobby: every page that loads the game is in it (a single-player one too), so what it costs grows with the pages
// open, project-wide. A page with nothing to show says nothing; a host's listing is said when it changes, again every
// 10 s and once for those who come in; a listing reaches every page however many there are
async function lobbyTest() {
  // (stamped: each page signed in as its own user, everything said through skotos.send and heard back by its sender too)
  const page = (bus, me, stamped) => SupabaseTransport(fakeSupabase(bus, stamped ? { uid: me } : {}), stamped ? { stamped: true, me } : { me });
  const room = async (M, H, secs, stamped) => {
    const bus = {};
    const T = Array.from({ length: M }, (_, i) => page(bus, 'l' + i, stamped));
    await sleep(300);
    // (the hosts list their games, and say it again every 2.5 s as the game's lobbyPresence does, unchanged)
    const card = (i) => ({ g: { c: 'c' + String(i).padStart(3, '0'), cls: 'warden', l: 10, z: 'forest', n: 1, d: 1, v: 2, on: 1 } });
    for (let i = 0; i < H; i++) T[i].lobby.presence(card(i));
    const re = setInterval(() => { for (let i = 0; i < H; i++) T[i].lobby.presence(card(i)); }, 2500);
    await sleep(1500);
    const e0 = bus.log.events, t0 = Date.now();
    await sleep(secs * 1000);
    const evs = (bus.log.events - e0) / ((Date.now() - t0) / 1000);
    const reach = T.slice(H).map((t) => t.lobby.peers().filter((p) => p.presence?.g).length);
    // (one more page comes in: it has every listing at once)
    const late = page(bus, 'late', stamped);
    await sleep(600);
    const lateN = late.lobby.peers().filter((p) => p.presence?.g).length;
    clearInterval(re);
    for (const t of [...T, late]) t.lobby.leave();
    await sleep(50);
    return { evs: Math.round(evs), reach: Math.min(...reach), lateN, closed: bus.log.closed };
  };
  const idle = await room(32, 0, 6);
  ok(idle.evs === 0 && idle.closed === 0, 'thirty-two pages in the lobby, no game: nothing sent, nothing delivered: ' + idle.evs + ' events/s');
  const big = await room(70, 2, 4);
  ok(big.reach === 2 && big.lateN === 2, 'seventy pages in the lobby: each lists both hosts, a newcomer too: ' + JSON.stringify(big));
  const twelve = await room(48, 12, 21);
  ok(twelve.reach === 12 && twelve.lateN === 12 && twelve.closed === 0, 'twelve parties\' pages (48) in the lobby, twelve hosts listed on every page');
  console.log('     the lobby\'s events a second with twelve hosts and 48 pages (each sent and each delivered): ' + twelve.evs);
  const idleS = await room(32, 0, 4, true), twelveS = await room(48, 12, 10, true);
  ok(idleS.evs === 0 && twelveS.reach === 12 && twelveS.lateN === 12 && twelveS.closed === 0, 'stamped, the same: an idle lobby costs nothing, and twelve hosts among 48 pages are listed on every page, a newcomer\'s too');
  console.log('     stamped, the lobby\'s events a second with twelve hosts and 48 pages (the sender\'s own echo too): ' + twelveS.evs);
}

await roomTest();
await endsTest();
await localTest();
await supaTest();
await stampedTest();
await lobbyTest();
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
