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
// events (each message sent and each delivered: the project's messages a second)
function fakeSupabase(bus) {
  const log = (bus.log ||= { events: 0, tracks: 0, closed: 0 }), tracks = [];
  return {
    channel(name, opts) {
      const key = opts?.config?.presence?.key, L = { b: [], p: [] };
      const c = bus[name] ||= { members: new Map() };
      let status = null, cb0 = null;
      const sync = () => setTimeout(() => { for (const m of c.members.values()) m.L.p.forEach((f) => f()); }, 5);
      const ch = {
        on(type, filter, fn) { if (type === 'broadcast') L.b.push([filter.event, fn]); if (type === 'presence') L.p.push(fn); return ch; },
        subscribe(cb) { cb0 = cb; c.members.set(key, { L, state: null }); setTimeout(() => { status = 'SUBSCRIBED'; cb('SUBSCRIBED'); sync(); }, 5); return ch; },
        send(m) {
          if (status !== 'SUBSCRIBED') return Promise.resolve('error');
          log.events++;
          for (const [k, mm] of c.members) if (k !== key) { log.events++; setTimeout(() => mm.L.b.forEach(([ev, f]) => { if (ev === '*' || ev === m.event) f({ event: m.event, payload: m.payload }); }), 5); }
          return Promise.resolve('ok');
        },
        track(p) {
          if (status !== 'SUBSCRIBED') return Promise.resolve('error');
          const t = Date.now(); tracks.push(t); while (tracks[0] < t - 30000) tracks.shift(); log.tracks++;
          if (tracks.length > 5) { status = 'CLOSED'; log.closed++; c.members.delete(key); cb0?.('CLOSED'); sync(); return Promise.resolve('error'); }
          log.events++; c.members.get(key).state = p; sync(); return Promise.resolve('ok');
        },
        presenceState() { const o = {}; for (const [k, m] of c.members) if (m.state) o[k] = [Object.assign({ presence_ref: 'r' }, m.state)]; return o; },
        unsubscribe() { status = 'CLOSED'; c.members.delete(key); sync(); return Promise.resolve('ok'); }
      };
      return ch;
    },
    removeChannel(ch) { return ch.unsubscribe(); }
  };
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

await roomTest();
await endsTest();
await localTest();
await supaTest();
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
