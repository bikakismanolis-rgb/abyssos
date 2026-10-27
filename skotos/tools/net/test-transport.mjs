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
// node tools/net/test-transport.mjs [part ...]: only those parts (room ends local supa stamped limits leave lobby econ
// relay oldwire reopen).
// TRANSPORT=<file>: that copy of transport.js instead of src/net/transport.js (to show a check fails without a fix:
// docs/coop/supabase-live.md).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Hub } from './fakeroom.mjs';
import { fakeSupabase } from './fakesupa.mjs';
const { RoomTransport, LocalTransport, SupabaseTransport, pickTransport, bytesOf, BUDGET } = await import(process.env.TRANSPORT ? pathToFileURL(path.resolve(process.env.TRANSPORT)).href : '../../src/net/transport.js');
if (process.env.TRANSPORT) console.log('     the transport of ' + path.resolve(process.env.TRANSPORT));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 2000, step = 5) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(step); } return !!fn(); }
let fails = 0;
const ok = (c, m, v) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (v === undefined ? '' : '  ' + JSON.stringify(v))); if (!c) fails++; };

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
  ok(big === false && chs[0].meter.tx.big === 1 && chs[0].meter.tx.why.big === 1, 'a 5 KB message is refused before the room sees it (a drop, why: big)');
  const bp = await chs[1].presence({ junk: 'y'.repeat(5000) });
  ok(bp === false, 'a presence over 4 KiB is refused');
  ok(!hub.log.rejects.invalid_argument, 'and the room never saw either');
  // a dropped connection: sends fail fast, presence waits and comes back
  pages[2].setConnected(false); await sleep(30);
  ok(!chs[2].connected(), 'a page knows it lost the room');
  const dc = await chs[2].emit('s', { x: 1 });
  ok(dc === false && chs[2].meter.tx.why.offline === 1, 'an emit while disconnected is dropped and said so (why: offline)');
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
  // (a game's channel bundles: a presence goes at most 5 a second, so one given just after the empty one waits its turn)
  await until(() => gc.peers().some((p) => p.peer === H.me && p.presence.r === 'h'), 1000);
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
  // the data goes as the page's own text, read by the page that hears it: one whose data is not JSON text is dropped
  heard.length = 0;
  bus.stamp('skotos:skotos-ab12', 's', { d: '{', _by: E.uid }); bus.stamp('skotos:skotos-ab12', 's', { d: { n: 1 }, _by: E.uid }); bus.stamp('skotos:skotos-ab12', 's', { d: '{"n":2}', _by: E.uid });
  await sleep(30);
  ok(heard.length === 1 && heard[0].data.n === 2, 'stamped data is read from its JSON text; a message whose data is not JSON text (or not text) is dropped');
  ok((await send([['skotos:skotos-ab12', 's', '{']])).error?.message === 'invalid input syntax for type json', 'and the server refuses data that is not JSON');
  // a topic is the lobby or a live game's: a room with no game takes nothing
  ok((await send([['skotos:junk', 'f', '1']])).error?.message === 'no_game', 'a topic with no live game (a junk room nobody hosts) is refused: no_game');
  // the bytes, by role: sixteen messages of 4 KiB at once are past a guest's bucket (64 KiB at once), not the host's
  // (256 KiB); the lobby's is its own and small (8 KiB at once, 512 bytes a second)
  const HB = fakeSupabase(bus); await HB.auth.signInAnonymously();
  const HBT = SupabaseTransport(HB, { stamped: true, me: HB.uid }); await HBT.join('skotos-by01', { host: true });
  const sendH = (msgs) => HB.schema('skotos').rpc('send', { msgs }), x4 = JSON.stringify('x'.repeat(4094));
  const big = (t) => Array.from({ length: 16 }, () => [t, 'f', x4]);
  ok((await send(big('skotos:skotos-ab12'))).error?.message === 'rate_limited' && !(await sendH(big('skotos:skotos-by01'))).error, 'sixteen messages of 4 KiB at once: past a guest\'s bytes (64 KiB at once), refused; the host\'s game takes them (256 KiB)');
  const la = await sendH([['skotos:lobby', 'f', x4]]), lb = await sendH([['skotos:lobby', 'f', x4]]);
  ok(!la.error && lb.error?.message === 'rate_limited', 'the lobby\'s bytes are its own: one message of 4 KiB goes, a second at once does not (8 KiB at once)');
  HBT.lobby.leave(); for (const c of HBT.rooms.values()) await c.leave();
  // the rate: a flood by RPC, past the page's own bucket
  await sleep(2000);
  const f0 = bus.srv.log.refused.rate_limited || 0, flood = await Promise.all(Array.from({ length: 100 }, () => send([['skotos:skotos-ab12', 'f', '1']])));
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

  // a party at the game's own rates for 8 s, stamped: the server refuses none of it, and what it costs. Each page does
  // what the game does: the host a snapshot (2.5 KB, the game's are 1.9-2.8 in a fight) at its rate, its presence once
  // a second (its hero moved); each guest its presence (its hero moved, its beat each second) when it would go at once,
  // its fx every 200 ms. The rate is the room's (10 snapshots a second, a presence each frame coalesced to 10) where
  // the channel does not bundle (o.economy false: as every game's channel was before), ch.econ's where it does
  for (const [n, eo, what] of [[4, { economy: false }, 'before (no bundles, the room\'s rates)'], [2, {}, 'economy'], [3, {}, 'economy'], [4, {}, 'economy'], [4, { lag: 300 }, 'economy, calls of 0-300 ms']]) {
    const r = await partyRun(n, eo);
    console.log('     stamped, a party of ' + n + ', ' + what + ': ' + r.msgs.toFixed(1) + ' messages a second (' + r.per.map((x) => x.toFixed(1)).join(' + ') + '), ' + r.calls.toFixed(1) + ' RPC calls, ' + Math.round(r.del) + ' deliveries: ' + Math.round(r.evs) + ' events a second');
    ok(r.clean, n + ' pages, ' + what + ': nothing refused by the server, nothing dropped, every channel connected', r.why);
    ok(r.snaps.every((g) => g >= r.expSnaps * 0.85), 'the guests heard the snapshots: ' + r.snaps + ' of ~' + Math.round(r.expSnaps));
    ok(r.fresh, 'the host has every guest\'s presence of the last moments' + (n > 2 ? ', and each guest every other guest\'s' : ''), r.ages);
    if (n > 2) ok(r.fx.every((x) => x > 0), 'a guest\'s fx reaches the other guests' + (eo.economy === false ? '' : ' (passed on by the host)') + ': ' + r.fx);
    if (eo.economy !== false && n === 4 && !eo.lag) {
      ok(r.evs < 75, 'a party of four, bundled and by outboxes: under 75 events a second (the free plan: 100 for the project): ' + Math.round(r.evs));
      ok(r.boxes === n - 1, 'every guest says it by its outbox, heard by its host: ' + r.boxes);
    }
    if (eo.economy !== false && n === 2) ok(r.evs < 40, 'a pair: under 40: ' + Math.round(r.evs));
  }
}
async function partyRun(n, eo = {}) {
  const bus2 = {}, T = [];
  for (let i = 0; i < n; i++) { const c = fakeSupabase(bus2, { lag: eo.lag ?? 60 }); await c.auth.signInAnonymously(); T.push(SupabaseTransport(c, { stamped: true, me: c.uid, economy: eo.economy })); }
  const chs = [];
  for (let i = 0; i < n; i++) chs.push(await T[i].join('skotos-rate', { host: i === 0 }));
  await sleep(600);
  const snap = { a: Array.from({ length: 40 }, (_, i) => [i, 12, 1234, 2345, 51, 200, 3, 4, 1, 22, 0, 12, 100, 900]), pad: 'x'.repeat(380) };
  const ec = chs[0].econ, sHz = ec?.snap || 10;
  const got = chs.map(() => 0), fx = chs.map(() => 0);
  chs.forEach((c, i) => { c.on('s', () => got[i]++); c.on('f', (m) => { if (m.peer !== chs[0].me) fx[i]++; }); });
  if (ec) chs[0].relayOmit = ['ev'];
  const t0 = Date.now(), e0 = bus2.log.events, k0 = bus2.srv.log.calls, d0 = bus2.srv.log.delivered || 0, m0 = chs.map((c) => c.meter.tx.msgs);
  let k = 0, snapT = 0, presT = 0, fxT = 0, ns = 0;
  while (Date.now() - t0 < 8000) {
    const t = Date.now();
    if (t - snapT >= 1000 / sHz && (chs[0].ready?.() ?? true)) { snapT = t; ns++; chs[0].emit('s', snap); }
    if (t - presT >= 1000) { presT = t; chs[0].presence({ r: 'h', z: { x: k } }); }
    for (let g = 1; g < n; g++) {
      if (chs[g].presenceDue()) chs[g].presence({ r: 'g', h: [k, g, 1000 + k, 50, 900, 1000, 0, 0], hb: (t / 1000) & 1023, lk: { c: 'mage', l: 12 }, ev: [[k, 'h', 100 + g, 55]] });
    }
    if (t - fxT >= 200) { fxT = t; for (let g = 1; g < n; g++) chs[g].emit('f', [[1, 2, 3, k]]); }
    for (const c of chs) c.pump();
    k++; await sleep(16);
  }
  const secs = (Date.now() - t0) / 1000;
  const r = { evs: (bus2.log.events - e0) / secs, calls: (bus2.srv.log.calls - k0) / secs, del: ((bus2.srv.log.delivered || 0) - d0) / secs, per: chs.map((c, i) => (c.meter.tx.msgs - m0[i]) / secs) };
  r.msgs = r.per.reduce((a, b) => a + b, 0);
  await sleep(400);
  const L = bus2.srv.log.refused, drops = chs.map((c) => c.meter.tx.drops);
  r.why = { refused: L, drops };
  r.clean = !Object.keys(L).length && drops.every((d) => d === 0) && chs.every((c) => c.connected());
  r.snaps = got.slice(1); r.expSnaps = ns; r.fx = fx.slice(1);
  // (each page's newest view of each other page's hero: the host of every guest, a guest of every other guest)
  const age = (c, g) => k - (c.peers().find((p) => p.peer === chs[g].me)?.presence?.h?.[0] ?? -1e9);
  r.ages = chs.map((c, i) => chs.map((_, g) => (g === 0 || g === i ? null : age(c, g))));
  r.fresh = r.ages.every((row) => row.every((a) => a === null || a < 45));
  r.boxes = chs.slice(1).filter((c) => c._boxLive?.()).length;
  for (const c of chs) await c.leave();
  for (const t of T) t.lobby?.leave();
  return r;
}

// the stamped path's limits and its pages' own failures: a tab copied from the host's (the same user), one row a user,
// a renewal that finds the row another's, the project's day and the user's spent, a request that never answers, a
// session copied into a duplicated tab, a presence the server refused said again
async function stampedLimits() {
  const bus = {}, q0 = new URLSearchParams('');
  const mk = async (o = {}) => { const c = fakeSupabase(bus, o); if (!c.uid) await c.auth.signInAnonymously(); return { c, T: SupabaseTransport(c, Object.assign({ stamped: true, me: c.uid }, o)) }; };
  const ends = (ch) => { const l = []; ch.onError((c, how) => l.push(c + ':' + how)); return l; };
  // a duplicated tab is the same user: its join as a guest of its own game is refused, and the host's row stays
  const A = await mk(), a1 = await A.T.join('skotos-du01', { host: true });
  const A2 = await mk({ uid: A.c.uid });
  let su = null; await A2.T.join('skotos-du01').catch((e) => { su = e.code; });
  await sleep(30);
  ok(su === 'same_user' && bus.srv.games.get('skotos-du01')?.host === A.c.uid && !A2.T.rooms.size, 'a guest\'s join whose host is its own user (a tab copied from the host\'s): refused, same_user, and the host\'s row is still there');
  A2.T.lobby.leave();
  // one game a user: hosting another lets the first row go (a page hosts one game; a reload hosting again), and the first
  // game's channel, its sends refused no_game, is told that its game is over
  const e1 = ends(a1);
  await A.T.join('skotos-du02', { host: true });
  ok(!bus.srv.games.has('skotos-du01') && bus.srv.games.get('skotos-du02')?.host === A.c.uid, 'a user hosts one game: its second lets the first row go');
  const s1 = await a1.emit('s', { n: 1 }); await sleep(30);
  ok(s1 === false && e1.includes('no_game:room') && a1.meter.tx.why.no_game === 1, 'the first game\'s send is refused (no_game, counted), and its channel is told its game ended: ' + e1);
  // a renewal that finds the row another's (run out and taken) tells the game; while the row is its own, nothing
  const B = await mk({ renew: 120 }), b1 = await B.T.join('skotos-rn01', { host: true }), e2 = ends(b1);
  await sleep(200);
  const kept = e2.length === 0 && bus.srv.games.get('skotos-rn01')?.host === B.c.uid;
  bus.srv.games.set('skotos-rn01', { host: 'someone-else', exp: Date.now() + 3600e3 });
  await sleep(200);
  ok(kept && e2.includes('taken:room'), 'the host\'s row renewed while its own; a renewal answered taken is the row lost, and the game is told: ' + e2);
  // the project's day: past its cap every send is refused 'quota', a game's channel told, and no new game is made; the
  // renewal of a game already there still goes
  const C = await mk(), c1 = await C.T.join('skotos-qu01', { host: true }), e3 = ends(c1);
  await sleep(40);
  const cap0 = bus.srv.quota.day_cap; bus.srv.quota.day_cap = bus.srv.quota.bytes;
  const s3 = await c1.emit('s', { n: 1 }); await sleep(30);
  const rq = await C.c.schema('skotos').rpc('host_game', { room: 'skotos-qu02' }), rr = await C.c.schema('skotos').rpc('host_game', { room: 'skotos-qu01' });
  bus.srv.quota.day_cap = cap0;
  ok(s3 === false && e3.includes('quota:room') && c1.meter.tx.why.quota === 1 && rq.data === 'quota' && rr.data === 'ok', 'the project\'s day spent: a send refused quota (counted; the game\'s channel told), a new game refused quota, a renewal still ok');
  // the user's day: what one user may send, whatever the project has left
  const U = await mk(); bus.srv.rates.set(U.c.uid, { tok: 80, game: 65536, lobby: 8192, at: Date.now(), gat: Date.now(), lat: Date.now(), spent: bus.srv.quota.user_cap - 500 });
  const sendU = (msgs) => U.c.schema('skotos').rpc('send', { msgs }), x198 = JSON.stringify('x'.repeat(196));
  const u1 = await sendU([['skotos:lobby', 'f', x198]]), u2 = await sendU([['skotos:lobby', 'f', x198]]);
  ok(!u1.error && u2.error?.message === 'quota', 'a user past its own day (user_cap) is refused quota: each message its bytes and 256');
  // a request that never answers holds nothing back: past its deadline it is given up (aborted) and the next goes
  // (the poster's own: messages one by one, as a channel that does not bundle sends them; a bundle's, after the next)
  const D = await mk({ hang: 1, callMs: 200, economy: false }), d1 = await D.T.join('skotos-hg01', { host: true });
  const Gd = await mk(), g1 = await Gd.T.join('skotos-hg01'), got = [];
  g1.on('s', (m) => got.push(m.data.n));
  await sleep(60);
  const t0 = Date.now(), p1 = d1.emit('s', { n: 1 }), p2 = d1.emit('s', { n: 2 }), r1 = await p1, r2 = await p2, dt = Date.now() - t0;
  await sleep(40);
  ok(r1 === false && r2 === true && got.join() === '2' && dt >= 180 && dt < 1000 && bus.srv.log.hung === 1 && bus.srv.log.aborted === 1 && JSON.stringify(d1.meter.tx.why) === '{"timeout":1}', 'a send whose request never answers is given up at its deadline (' + dt + ' ms, aborted; counted, why: timeout) and the one said after it goes: heard ' + got);
  // every message given up is counted by why: seventy at once behind a call that never answers (a bucket that takes
  // them all): one in the call (timeout), sixty-four waiting for the next (they go), five more refused busy
  const Y = await mk({ hang: 1, callMs: 200, burst: 100, economy: false }), y1 = await Y.T.join('skotos-hg02', { host: true });
  await sleep(40);
  const ys = await Promise.all(Array.from({ length: 70 }, (_, i) => y1.emit('f', { i })));
  ok(ys.filter((v) => v).length === 64 && y1.meter.tx.drops === 6 && JSON.stringify(y1.meter.tx.why) === '{"busy":5,"timeout":1}', 'seventy at once behind a call that never answers: 64 go after its deadline, the drops counted by why: ' + JSON.stringify(y1.meter.tx.why));
  // and a game's channel that bundles: its snapshot in a call that never answers is given up at the deadline, the next
  // snapshot waits for no call on its way and then goes, in a message of its own
  const DB = await mk({ hang: 1, callMs: 200 }), db1 = await DB.T.join('skotos-hg03', { host: true });
  const GB = await mk(), gb1 = await GB.T.join('skotos-hg03'), gotB = [];
  gb1.on('s', (m) => gotB.push(m.data.n));
  await sleep(60);
  const tb = Date.now(), q1 = db1.emit('s', { n: 1 }); await sleep(20); const q2 = db1.emit('s', { n: 2 }), rb1 = await q1, rb2 = await q2, dtb = Date.now() - tb;
  await sleep(40);
  ok(db1.econ && rb1 === false && rb2 === true && gotB.join() === '2' && dtb >= 180 && dtb < 1000 && db1.meter.tx.why.timeout === 1, 'bundled: a snapshot whose call never answers is given up at its deadline (' + dtb + ' ms), the next goes after it: heard ' + gotB);
  // a duplicated tab: its sessionStorage copied, the same user; asked of the other tabs, it lets the copy go and signs in
  // anew. A tab no other holds keeps its user (a reload)
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
  const cfg = { url: 'https://x.supabase.co', anonKey: 'k', stamped: true, createClient: (u, k, opts) => fakeSupabase(bus, { auth: opts.auth }) };
  const uidIn = (st) => JSON.parse(st.getItem('skotos-auth') || 'null')?.user?.id;
  const sA = mem(); globalThis.sessionStorage = sA;
  const TA = await pickTransport(q0, cfg);
  const sB = mem(); sB.setItem('skotos-auth', sA.getItem('skotos-auth')); globalThis.sessionStorage = sB;
  const n0 = bus.srv.log.signIns, TB = await pickTransport(q0, cfg);
  ok(TA?.me && TB?.me && TB.me !== TA.me && uidIn(sA) === TA.me && uidIn(sB) === TB.me && bus.srv.log.signIns === n0 + 1, 'a duplicated tab (its session copied) is told another tab holds its user, and signs in as another: ' + TA?.me + ', ' + TB?.me);
  const sC = mem(); sC.setItem('skotos-auth', JSON.stringify({ user: { id: 'u-alone' } })); globalThis.sessionStorage = sC;
  const TC = await pickTransport(q0, cfg);
  ok(TC?.me === 'u-alone', 'a tab whose user no other tab holds (a reload) keeps it');
  delete globalThis.sessionStorage;
  // a presence the server refused (the lobby's bytes spent) is said again on the next look, not a whole beat later
  const P = await mk(), O = await mk(); await sleep(60);
  bus.srv.rates.set(P.c.uid, { tok: 80, game: 65536, lobby: 0, at: Date.now(), gat: Date.now(), lat: Date.now(), spent: 0 });
  const r0 = bus.srv.log.refused.rate_limited || 0;
  P.T.lobby.presence({ g: { c: 'pq01', cls: 'mage', l: 3, z: 'town', n: 1, d: 0, v: 3, on: 0 } });
  const t1 = Date.now(); let seenAt = 0;
  while (Date.now() - t1 < 4500 && !seenAt) { await sleep(100); if (O.T.lobby.peers().some((p) => p.presence?.g?.c === 'pq01')) seenAt = Date.now() - t1; }
  ok((bus.srv.log.refused.rate_limited || 0) > r0 && seenAt > 0 && seenAt < 3500, 'a lobby listing the server refused (its bytes) is said again within the lobby\'s look (2.5 s): heard after ' + seenAt + ' ms');
  for (const x of [A, B, C, U, D, Gd, Y, P, O]) { x.T.lobby.leave(); for (const c of x.T.rooms.values()) await c.leave(); }
  for (const t of [TA, TB, TC]) t.lobby.leave();
  await sleep(50);
}

// a host's leave and what is still on its way: its game's row ends only once every call it waits for has its answer.
// Certain, not likely: the fake answers each function after a fixed time (o.lagOf) and end_game at once, so an end_game
// sent beside a call on its way is always committed first (each check fails on a transport that sends end_game straight
// from the leave, run with TRANSPORT=<that copy>: docs/coop/supabase-live.md)
async function leaveTest() {
  const bus = {};
  const mk = async (o = {}) => { const c = fakeSupabase(bus, o); if (!c.uid) await c.auth.signInAnonymously(); return { c, T: SupabaseTransport(c, Object.assign({ stamped: true, me: c.uid }, o)) }; };
  // its last sends: one on its way (answered 80 ms after) and one behind it (its guests told the game is over, a last
  // presence). An end_game sent beside them is committed first and they are refused no_game (seen on the live project)
  const L = await mk({ lagOf: { send: 80, host_game: 0, end_game: 0 } }), l1 = await L.T.join('skotos-lv01', { host: true });
  await sleep(60);
  const ng0 = bus.srv.log.refused.no_game || 0, s0 = bus.srv.log.fn.send || 0, q1 = l1.emit('s', { n: 1 }), q2 = l1.emit('c', { op: 'end' });
  await sleep(5);
  const inFlight = (bus.srv.log.fn.send || 0) === s0 + 1;
  l1.leave();
  const [v1, v2] = await Promise.all([q1, q2]); await sleep(60);
  ok(inFlight && v1 === true && v2 === true && (bus.srv.log.refused.no_game || 0) === ng0 && !bus.srv.games.has('skotos-lv01'), 'a host leaving with a send on its way and one behind it: both go while its game is there, then its row ends', { inFlight, v1, v2, no_game: (bus.srv.log.refused.no_game || 0) - ng0, row: bus.srv.games.has('skotos-lv01') });
  // its row's renewal (host_game every 30 min) on its way, answered 150 ms after: committed after an end_game sent beside
  // it, it would make the row live again for four hours, a game nobody hosts
  const R = await mk({ renew: 100, lagOf: { send: 0, host_game: 150, end_game: 0 } }), r1 = await R.T.join('skotos-lv02', { host: true });
  const h0 = bus.srv.log.fn.host_game, sent = await until(() => bus.srv.log.fn.host_game === h0 + 1, 1000);
  r1.leave();
  await sleep(250);
  const order = bus.srv.log.games.filter((x) => x.endsWith(' skotos-lv02'));
  ok(sent && !bus.srv.games.has('skotos-lv02') && order.join() === 'host_game skotos-lv02,host_game skotos-lv02,end_game skotos-lv02', 'a host leaving with its row\'s renewal on its way: end_game goes after the renewal\'s answer, and the row stays ended', { renewalOnItsWay: sent, row: bus.srv.games.has('skotos-lv02'), committed: order.map((x) => x.split(' ')[0]) });
  for (const x of [L, R]) { x.T.lobby.leave(); for (const c of x.T.rooms.values()) await c.leave(); }
  await sleep(50);
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

// the economy (docs/coop/diet.md): a stamped game's channel says a page's moment as one message; a guest says it into
// its outbox (a games row of its own, heard by its host alone), and the host passes its presence (less what only the
// host reads) and its fx on. What a forger signed in as itself can try against that: a bundle that names another
// sender, a host's entry naming the host or the page itself or a topic only a host says, its own words in a guest's
// outbox, the host's list of outboxes said by another, outboxes beyond the host's few, a bundle too long; and what
// leaving does (a guest's outbox row ended; a guest whose host has gone says it in the game's channel, refused)
async function econTest() {
  const bus = {};
  const mk = async (o = {}) => { const c = fakeSupabase(bus, o); await c.auth.signInAnonymously(); return { c, T: SupabaseTransport(c, Object.assign({ stamped: true, me: c.uid }, o)) }; };
  const raw = (U, topic, arr) => U.c.schema('skotos').rpc('send', { msgs: [[topic, 'b', JSON.stringify(arr)]] });
  const H = await mk(), G1 = await mk(), G2 = await mk(), E = await mk(), room = 'skotos-ec01', topic = 'skotos:' + room;
  const hc = await H.T.join(room, { host: true }), g1 = await G1.T.join(room), g2 = await G2.T.join(room), ec = await E.T.join(room);
  hc.relayOmit = ['ev'];
  ok(hc.econ?.snap === 7 && hc.econ?.pres === 5 && g1.econ && !H.T.lobby.econ, 'a stamped game\'s channel bundles, the game held to 7 snapshots and 5 presences a second (the lobby\'s does not)');
  const heard = { h: [], g2: [] };
  hc.on('f', (m) => heard.h.push(m)); g2.on('f', (m) => heard.g2.push(m)); g2.on('s', (m) => heard.g2.push(m)); g2.on('c', (m) => heard.g2.push(m));
  hc.presence({ r: 'h' }); g1.presence({ r: 'g', h: [1], ev: [[1, 'h', 5, 9]] }); g2.presence({ r: 'g', h: [2] }); ec.presence({ r: 'g', h: [3] });
  const live = await until(() => [g1, g2, ec].every((c) => c._boxLive()), 4000);
  const rows = [...bus.srv.games].filter(([k]) => k.startsWith(room + '.')).map(([k, g]) => [k, g.host]);
  ok(live && rows.length === 3 && [G1, G2, E].every((U) => rows.some(([k, h]) => h === U.c.uid && k === room + '.' + U.c.uid.replace(/-/g, '').slice(0, 24))), 'each guest holds its outbox (a games row: the room and its id), and says it there once its host lists it', rows.map(([k]) => k));
  const pres = (c, U) => c.peers().find((p) => p.peer === U.c.uid)?.presence;
  g1.presence({ r: 'g', h: [11], ev: [[2, 'h', 5, 9]] });
  await until(() => pres(g2, G1)?.h?.[0] === 11 && pres(hc, G1)?.h?.[0] === 11, 2000);
  ok(pres(hc, G1)?.h?.[0] === 11 && pres(hc, G1)?.ev?.length === 1 && pres(g2, G1)?.h?.[0] === 11 && !('ev' in pres(g2, G1)), 'a guest\'s presence: whole on the host (by its outbox), passed on to another guest less what only the host reads', { host: pres(hc, G1), g2: pres(g2, G1) });
  await g1.emit('f', [[7, 1, 1]]);
  await until(() => heard.h.some((m) => m.data?.[0]?.[0] === 7) && heard.g2.some((m) => m.data?.[0]?.[0] === 7), 2000);
  ok(heard.h.some((m) => m.peer === G1.c.uid && m.data[0][0] === 7) && heard.g2.some((m) => m.peer === G1.c.uid && m.data[0][0] === 7), 'a guest\'s fx: heard by the host, and by another guest as the guest\'s (passed on by the host)');
  // a forger, a member, not the host: a bundle naming another as the sender of its entries
  heard.g2.length = 0;
  await raw(E, topic, [['f', [[8]], G1.c.uid], ['_p', { r: 'h', h: [99] }, G1.c.uid], ['f', [[9]]]]);
  await sleep(80);
  ok(!heard.g2.some((m) => m.peer === G1.c.uid) && pres(g2, G1)?.h?.[0] === 11 && heard.g2.some((m) => m.peer === E.c.uid && m.data[0][0] === 9), 'a bundle from another than the host naming a sender: those entries dropped (its own heard as its own)');
  // the host's own entries naming the host, the page itself, or a topic only the host says: dropped
  heard.g2.length = 0;
  await raw(H, topic, [['s', { n: 1 }, G1.c.uid], ['c', { op: 'end' }, G1.c.uid], ['_p', { r: 'x' }, H.c.uid], ['_p', { r: 'x' }, G2.c.uid], ['f', [[10]], G1.c.uid, 50]]);
  await sleep(80);
  ok(heard.g2.length === 1 && heard.g2[0].peer === G1.c.uid && heard.g2[0].data[0][0] === 10 && pres(g2, H)?.r === 'h' && !g2.peers().find((p) => p.isMe)?.presence?.r?.startsWith('x'), 'the host\'s entries: only a presence or fx, of another than the host and the page itself, taken as that one\'s', heard.g2.map((m) => m.topic));
  // its own words in a guest's outbox (the server takes them: the topic is a live game's): the host drops them
  heard.h.length = 0;
  const box1 = 'skotos:' + room + '.' + G1.c.uid.replace(/-/g, '').slice(0, 24);
  await E.c.schema('skotos').rpc('send', { msgs: [[box1, 'f', JSON.stringify([[11]])], [box1, 'b', JSON.stringify([['f', [[12]]], ['_p', { r: 'g', h: [77] }]])]] });
  await sleep(80);
  ok(!heard.h.length && pres(hc, G1)?.h?.[0] === 11, 'another\'s words in a guest\'s outbox: the host takes nothing there but what the server stamped with that guest\'s id');
  // the host's list of outboxes, said by another: a guest goes on as its host says
  await raw(E, topic, [['_o', []]]);
  await sleep(80);
  ok(g1._boxLive() && g2._boxLive(), 'a list of outboxes from another than the host: not taken (the guests still say it by theirs)');
  // too long a bundle: dropped whole
  heard.g2.length = 0;
  await raw(E, topic, Array.from({ length: 81 }, () => ['f', [[13]]]));
  await sleep(80);
  ok(!heard.g2.length, 'a bundle of more than 80 entries: dropped whole');
  // outboxes beyond the host's few: seven more members say they have one; the host hears at most six
  const X = []; for (let i = 0; i < 7; i++) { const U = await mk(); X.push(U); await U.T.join(room); }
  await sleep(100);
  for (const U of X) await raw(U, topic, [['_o', 1]]);
  await sleep(150);
  const heardBoxes = Object.keys(bus).filter((k) => k.startsWith('priv:' + topic + '.') && bus[k].members.size > 0).length;
  ok(heardBoxes === 6, 'outboxes said by many: the host hears six at most: ' + heardBoxes);
  for (const U of X) { for (const c of U.T.rooms.values()) await c.leave(); U.T.lobby.leave(); }
  // a guest leaving: its outbox row ended once what it said has had its answer
  const box2 = room + '.' + G2.c.uid.replace(/-/g, '').slice(0, 24);
  await g2.leave(); await sleep(150);
  ok(!bus.srv.games.has(box2), 'a guest that leaves ends its outbox\'s row');
  // the host leaving: a guest's next word goes in the game's channel, refused no_game, and the game ends for it
  const errs = []; g1.onError((c, how) => errs.push(c + ':' + how));
  await hc.leave(); await until(() => !g1.peers().some((p) => p.peer === H.c.uid), 3000);
  await g1.emit('f', [[14]]); await until(() => errs.length, 2000);
  ok(!g1._boxLive() && errs.includes('no_game:room'), 'its host gone, a guest says it in the game\'s channel: no_game, the game ended for it', errs);
  for (const c of [g1, ec]) await c.leave();
  for (const U of [H, G1, G2, E]) U.T.lobby.leave();
}

// what the host passes on, on its own budget (the review of the economy, 27 October): only the outboxes of its party
// (ch.relayTo, the game's roster), each guest within its bytes, the host's own snapshots never refused for it. Each
// check fails on the transport before (TRANSPORT=<that copy>)
async function relayTest() {
  const bus = {};
  const mk = async (o = {}) => { const c = fakeSupabase(bus, o); await c.auth.signInAnonymously(); return { c, T: SupabaseTransport(c, Object.assign({ stamped: true, me: c.uid }, o)) }; };
  const boxOf = (U) => 'skotos:' + room + '.' + U.c.uid.replace(/-/g, '').slice(0, 24), room = 'skotos-rl01';
  const H = await mk(), G1 = await mk(), G2 = await mk(), X = await mk();
  const hc = await H.T.join(room, { host: true }), party = new Set([G1.c.uid, G2.c.uid]);
  // (the game's: the roster, and the presence less what only the host reads)
  hc.relayTo = (k) => party.has(k); hc.relayOmit = ['ev'];
  const g1 = await G1.T.join(room), g2 = await G2.T.join(room), xc = await X.T.join(room);
  hc.presence({ r: 'h' }); g1.presence({ r: 'g', h: [1] }); g2.presence({ r: 'g', h: [2] }); xc.presence({ r: 'g', h: [3] });
  // the host's snapshots at its rate, all along (2.4 KB, as a fight's), and every page pumped as the game does
  let run = true, sent = 0;
  const loop = (async () => { while (run) { if (hc.ready()) { sent++; hc.emit('s', { a: 'x'.repeat(2400), t: Date.now() }); } for (const c of [hc, g1, g2, xc]) c.pump(); await sleep(1000 / 7); } })();
  const live = await until(() => g1._boxLive() && g2._boxLive(), 5000);
  await sleep(1500);
  ok(live && !xc._boxLive() && !bus['priv:' + boxOf(X)]?.members.size, 'the host hears the outboxes of its party alone: an outsider\'s (a member holding its own row and saying it has one) is never opened');
  // what g2 and g1 hear of each other page: fx and presence, in bytes; and the host's snapshots (g2's)
  const got = new Map(), add = (k, v) => got.set(k, (got.get(k) || 0) + JSON.stringify(v).length);
  let snaps = 0;
  for (const [c, U] of [[g2, G1], [g1, G2], [g2, X]]) { c.on('f', (m) => { if (m.peer === U.c.uid) add(m.peer, m.data); }); c.onPeers(({ updated }) => { for (const p of updated) if (p.peer === U.c.uid) add(p.peer, p.presence); }); }
  g2.on('s', () => snaps++);
  // a flood said into its own outbox: fx and presences of ~3.6 KB, 13 a second (its own budget takes them: its row)
  const fx = JSON.stringify(Array.from({ length: 80 }, (_, i) => [1, i, 'y'.repeat(30)]));
  const flood = async (U, secs) => {
    const to = boxOf(U), t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < secs * 1000) {
      const m = i++ % 3 === 2 ? [to, '_p', JSON.stringify({ r: 'g', h: [i], pad: 'z'.repeat(3500) })] : [to, 'f', fx];
      await U.c.schema('skotos').rpc('send', { msgs: [m] });
      await sleep(75);
    }
  };
  // an outsider: none of it passed on, and the host's bytes are its own
  const hb0 = hc.meter.tx.bytes, t1 = Date.now();
  await flood(X, 3);
  const hostRate = (hc.meter.tx.bytes - hb0) / ((Date.now() - t1) / 1000);
  ok(!got.get(X.c.uid) && hostRate < 24000, 'an outsider flooding its outbox: nothing of it reaches the party by the host, and the host sends its own (' + Math.round(hostRate) + ' bytes a second)', { passedOn: got.get(X.c.uid) || 0 });
  // a guest of the party flooding its own: the host passes on at most its share (3 KB a second, 6 KB at once), and its
  // own calls are never refused for their rate, though it starts with its burst spent (24 KB of its 256 left: what
  // the old relay had left it a few seconds into such a flood)
  const r = bus.srv.rates.get(H.c.uid); if (r) { r.game = 24576; r.gat = Date.now(); }
  const rl0 = hc.meter.tx.why.rate_limited || 0, s0 = snaps, n0 = sent, t2 = Date.now();
  got.delete(G1.c.uid); got.delete(G2.c.uid);
  await Promise.all([flood(G1, 4), flood(G2, 4)]);
  await sleep(300);
  const secs = (Date.now() - t2) / 1000, passed = [got.get(G1.c.uid) || 0, got.get(G2.c.uid) || 0], cap = 6144 + 3072 * secs;
  ok(passed.every((b) => b > 0 && b <= cap), 'two guests flooding their outboxes (~45 KB a second each): the host passes on each one\'s share and no more: ' + passed.join(', ') + ' bytes in ' + secs.toFixed(1) + ' s (at most ' + Math.round(cap) + ' each)', hc.relayStats);
  ok((hc.meter.tx.why.rate_limited || 0) === rl0 && snaps - s0 >= 0.8 * (sent - n0), 'and the host\'s own calls are never refused for their rate: the party heard its snapshots, ' + (snaps - s0) + ' of ' + (sent - n0), hc.meter.tx.why);
  // a guest no longer of the party: its outbox let go (it says it in the game's channel); back in it, opened again
  party.delete(G2.c.uid);
  const shut = await until(() => !bus['priv:' + boxOf(G2)]?.members.size && !g2._boxLive(), 5000);
  party.add(G2.c.uid);
  const back = await until(() => g2._boxLive(), 6000);
  ok(shut && back, 'a guest the game no longer takes: its outbox let go at the host\'s next beat; taken again, it is heard there again', { shut, back });
  run = false; await loop;
  for (const c of [g1, g2, xc, hc]) await c.leave();
  for (const U of [H, G1, G2, X]) U.T.lobby.leave();
  await sleep(50);
}

// a page of the wire before the economy (a tab opened before the deploy: no bundles, no outbox) and one of this wire in
// one game: the game's version says they cannot play together (coop.js VER), and each reads the other's presence, so
// each is told so (coop.version) rather than waiting for a host it cannot hear
async function oldWireTest() {
  const bus = {};
  const mk = async (o = {}) => { const c = fakeSupabase(bus, o); await c.auth.signInAnonymously(); return { c, T: SupabaseTransport(c, Object.assign({ stamped: true, me: c.uid }, o)) }; };
  const src = (await import('node:fs')).readFileSync(new URL('../../src/net/coop.js', import.meta.url), 'utf8'), ver = +(src.match(/export const VER = (\d+);/)?.[1] || 0);
  ok(ver >= 4, 'the game\'s version is past the wire before the economy\'s (coop.js VER: ' + ver + ', was 3)');
  const room = 'skotos-ow01', topic = 'skotos:' + room;
  let plain = 0; const st0 = bus.stamp || null;
  const H = await mk(), O = await mk({ economy: false });
  const s1 = bus.stamp; bus.stamp = (t, e, p) => { if (t === topic && e === '_p' && p._by === H.c.uid) plain++; return s1(t, e, p); };
  void st0;
  // a new host, an old guest
  const hc = await H.T.join(room, { host: true }), oc = await O.T.join(room);
  hc.presence({ r: 'h', c: 'ow01', v: 4 }); oc.presence({ r: 'g', c: 'ow01', v: 3 });
  const pump = setInterval(() => { hc.pump(); oc.pump(); }, 50);
  const seen = await until(() => oc.peers().find((p) => p.peer === H.c.uid)?.presence?.v === 4, 6000);
  ok(seen && hc.peers().find((p) => p.peer === O.c.uid)?.presence?.v === 3, 'a guest of the wire before (no bundles) hears a host of this wire: its presence, said plainly too while such a page is in its channel, so the guest reads its version (and leaves: coop.version)', { plain });
  await oc.leave(); O.T.lobby.leave();
  await until(() => !hc.peers().some((p) => p.peer === O.c.uid), 3000);
  const p0 = plain;
  for (let i = 0; i < 3; i++) { hc.presence({ r: 'h', c: 'ow01', v: 4, z: i }); await sleep(400); }
  ok(plain === p0, 'that page gone, the host says its presence only bundled again: ' + (plain - p0) + ' plain');
  clearInterval(pump);
  await hc.leave(); H.T.lobby.leave();
  // an old host, a new guest: the guest reads the old host's plain presence, and its version
  const H2 = await mk({ economy: false }), N = await mk(), room2 = 'skotos-ow02';
  const h2 = await H2.T.join(room2, { host: true }), nc = await N.T.join(room2);
  h2.presence({ r: 'h', c: 'ow02', v: 3 }); nc.presence({ r: 'g', c: 'ow02', v: 4 });
  const pump2 = setInterval(() => { h2.pump(); nc.pump(); }, 50);
  const seen2 = await until(() => nc.peers().find((p) => p.peer === H2.c.uid)?.presence?.v === 3, 4000);
  ok(seen2, 'a guest of this wire hears a host of the wire before: its presence, and its version (coop.version)');
  clearInterval(pump2);
  for (const c of [nc, h2]) await c.leave();
  for (const U of [H2, N]) U.T.lobby.leave();
  await sleep(50);
}

// a guest's outbox lost is made again, and heard again: its first host_game unanswered, its row gone (a send refused
// no_game), the host's channel for it shut by the server. Each check fails on the transport before
async function reopenTest() {
  const bus = {};
  const mk = async (o = {}) => { const c = fakeSupabase(bus, o); await c.auth.signInAnonymously(); return { c, T: SupabaseTransport(c, Object.assign({ stamped: true, me: c.uid }, o)) }; };
  const room = 'skotos-ro01', rowOf = (U) => room + '.' + U.c.uid.replace(/-/g, '').slice(0, 24);
  const H = await mk(), G = await mk(), G2 = await mk();
  // (the first host_game of G's outbox is not answered well: upstream_error, as a request lost or timed out)
  let fail = 1; const sch = G.c.schema;
  G.c.schema = (n) => { const x = sch(n); return { rpc: (fn, a) => (fn === 'host_game' && String(a?.room).includes('.') && fail-- > 0 ? { abortSignal() { return this; }, then: (f, r) => Promise.resolve({ data: null, error: { message: 'upstream_error' } }).then(f, r) } : x.rpc(fn, a)) }; };
  const hc = await H.T.join(room, { host: true }), gc = await G.T.join(room), g2 = await G2.T.join(room);
  hc.relayOmit = ['ev'];
  let run = true, k = 0;
  const loop = (async () => { while (run) { k++; hc.presence({ r: 'h' }); if (gc.presenceDue()) gc.presence({ r: 'g', h: [k] }); if (g2.presenceDue()) g2.presence({ r: 'g', h: [-k] }); for (const c of [hc, gc, g2]) c.pump(); await sleep(100); } })();
  const errs = []; gc.onError((c, how) => errs.push(c + ':' + how));
  const first = await until(() => gc._boxLive() && g2._boxLive(), 8000);
  ok(first && fail < 0, 'a guest whose outbox\'s first host_game failed makes it again, and says it there once its host lists it');
  // its row gone (run out): its next send there is refused no_game; made again, and the guest back on it
  bus.srv.games.delete(rowOf(G));
  const off = await until(() => !gc._boxLive(), 4000), again = off && await until(() => gc._boxLive() && bus.srv.games.has(rowOf(G)), 8000);
  ok(off && again && !errs.length, 'a guest\'s outbox row gone (a send to it refused no_game): the game\'s channel meanwhile, the row made again, the outbox heard again; the game goes on', { off, again, errs });
  // the host's channel for it shut by the server (CLOSED: realtime-js joins it no more): opened anew when the guest asks
  bus.shut('skotos:' + rowOf(G));
  const off2 = await until(() => !gc._boxLive(), 6000), again2 = off2 && await until(() => gc._boxLive() && bus['priv:skotos:' + rowOf(G)]?.members.size === 1, 8000);
  const seen = await until(() => g2.peers().find((p) => p.peer === G.c.uid)?.presence?.h?.[0] > k - 15, 2000);
  ok(off2 && again2 && seen, 'the host\'s channel for an outbox shut by the server: let go and opened anew when its guest asks again, and the guest\'s presence passed on again', { off2, again2, seen });
  run = false; await loop;
  for (const c of [gc, g2, hc]) await c.leave();
  for (const U of [H, G, G2]) U.T.lobby.leave();
  await sleep(50);
}

const parts = { room: roomTest, econ: econTest, relay: relayTest, oldwire: oldWireTest, reopen: reopenTest, ends: endsTest, local: localTest, supa: supaTest, stamped: stampedTest, limits: stampedLimits, leave: leaveTest, lobby: lobbyTest };
const only = process.argv.slice(2);
for (const k of only) if (!parts[k]) { console.log('no part ' + k + ' (' + Object.keys(parts).join(' ') + ')'); process.exit(2); }
for (const [k, f] of Object.entries(parts)) if (!only.length || only.includes(k)) await f();
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
