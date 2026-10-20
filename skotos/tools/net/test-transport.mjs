// node tools/net/test-transport.mjs: the co-op transports against their wires.
// 1. RoomTransport over the faithful fake room (fakeroom.mjs): four pages in a named game room, the host sending
//    snapshots of the game's real size at the game's rate, three guests their presence; 10% loss; then the limits:
//    an oversized message, an oversized presence, a dropped connection, a page leaving. It must stay under the room's
//    budget (no budget drops at the platform), never send what the room would reject, and say what it dropped.
// 2. LocalTransport (BroadcastChannel, as the browser tests use it) and 3. SupabaseTransport against a fake
//    supabase-js client: the same channel shape.
import { Hub } from './fakeroom.mjs';
import { RoomTransport, LocalTransport, SupabaseTransport, bytesOf, BUDGET } from '../../src/net/transport.js';

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

// a fake supabase-js v2 client: channels by name share a bus; broadcast (self: false), presence track/sync
function fakeSupabase(bus) {
  return {
    channel(name, opts) {
      const key = opts?.config?.presence?.key, L = { b: [], p: [] };
      const c = bus[name] ||= { members: new Map() };
      let status = null;
      const ch = {
        on(type, filter, fn) { if (type === 'broadcast') L.b.push([filter.event, fn]); if (type === 'presence') L.p.push(fn); return ch; },
        subscribe(cb) { c.members.set(key, { L, state: null }); setTimeout(() => { status = 'SUBSCRIBED'; cb('SUBSCRIBED'); for (const m of c.members.values()) m.L.p.forEach((f) => f()); }, 5); return ch; },
        send(m) { for (const [k, mm] of c.members) if (k !== key) setTimeout(() => mm.L.b.forEach(([ev, f]) => { if (ev === '*' || ev === m.event) f({ event: m.event, payload: m.payload }); }), 5); return Promise.resolve('ok'); },
        track(p) { c.members.get(key).state = p; setTimeout(() => { for (const m of c.members.values()) m.L.p.forEach((f) => f()); }, 5); return Promise.resolve('ok'); },
        presenceState() { const o = {}; for (const [k, m] of c.members) o[k] = [Object.assign({ presence_ref: 'r' }, m.state || {})]; return o; },
        unsubscribe() { c.members.delete(key); for (const m of c.members.values()) m.L.p.forEach((f) => f()); return Promise.resolve('ok'); }
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
  ca.presence({ h: [4] }); ca.pump(); await sleep(40);
  ok(JSON.stringify(cb.peers().find((p) => p.peer === 'sa')?.presence?.h) === '[4]', 'tracked presence arrives');
  await ca.leave(); await sleep(30);
  ok(cb.peers().length === 1, 'a channel removed is gone for the other');
}

await roomTest();
await localTest();
await supaTest();
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
