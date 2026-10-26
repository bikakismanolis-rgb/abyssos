// node tools/net/live-supabase.mjs [--sessions <file>] [--two] [--public]: the co-op's Supabase path against a live
// project, with the real supabase-js (the game's dependency) and the game's own transport (src/net/transport.js
// SupabaseTransport, stamped), from node (22+: its WebSocket and fetch). The project must have
// supabase/migrations/*_skotos_coop.sql applied, anonymous sign-ins on and the schema 'skotos' exposed
// (docs/coop/supabase.md, setting up a project). URL and key: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the
// environment, else from .env.web.local (git-ignored). Results: docs/coop/supabase-live.md.
//
// What it does on the project, and nothing else: anonymous sign-ins (four users, marked app: 'skotos', test:
// 'live-supabase'; --sessions <file> keeps their sessions in that file, so a run again signs nobody new in: Supabase
// allows 30 anonymous sign-ins an hour from one address), the game's four RPCs (skotos.send, host_game, game_host,
// end_game) on rooms named 'skotos-test-...', and joining 'skotos:' private channels as the game does. Every game it
// hosts it ends, every channel it leaves. About a minute, a few hundred small messages. --two: the pair only (no third
// and fourth user). --public: also a public channel of the game's topic's name (which the game never joins), to show it
// is another channel; off by default, the game's own traffic being private channels only.
//
// Part 1, supabase-js itself (what the transport hides by design: the server's refusals, who hears what, a page's own
// echo): the stamp, a forged '_by' or 'f', a page's own broadcast on a 'skotos:' topic (by the socket, and by REST both
// ways), a page with no session, the games, the sizes, a guest's bytes; latency and deliveries a message, two pages then
// four. Part 2, SupabaseTransport over the same clients: host, guest, presence, the stamp as the game reads it, a party
// of four, the host leaving (pickTransport's sign-in needs a browser's storage: tools/net/live-web.mjs runs it, in the
// web build). A table of pass and fail at the end; the exit code is the number of fails.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { SupabaseTransport } from '../../src/net/transport.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2), arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const FOUR = !args.includes('--two'), PUB = args.includes('--public'), SESS = arg('--sessions') || process.env.LIVE_SESSIONS || null;
const envf = existsSync(root + '.env.web.local') ? Object.fromEntries(readFileSync(root + '.env.web.local', 'utf8').split(/\r?\n/).filter((l) => /^\s*[A-Z_]+\s*=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]; })) : {};
const URL_ = process.env.VITE_SUPABASE_URL || envf.VITE_SUPABASE_URL, KEY = process.env.VITE_SUPABASE_ANON_KEY || envf.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) { console.log('no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (the environment, or .env.web.local)'); process.exit(2); }
const host = new URL(URL_).host;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();
const rand = (n) => Array.from({ length: n }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 32)]).join('');
const rows = []; let fails = 0;
const check = (part, name, pass, detail = '') => { rows.push({ part, name, pass: !!pass, detail: String(detail) }); if (!pass) fails++; console.log((pass ? 'ok   ' : 'FAIL ') + part + ' ' + name + (detail !== '' ? '  (' + detail + ')' : '')); };
const info = (part, name, detail) => { rows.push({ part, name, pass: null, detail: String(detail) }); console.log('     ' + part + ' ' + name + '  (' + detail + ')'); };
const pct = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const st = (a) => (a.length ? `n ${a.length}, min ${Math.round(Math.min(...a))} ms, median ${Math.round(pct(a, 0.5))} ms, p95 ${Math.round(pct(a, 0.95))} ms, max ${Math.round(Math.max(...a))} ms` : 'none');
async function until(fn, ms = 8000, step = 50) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(step); } return !!(await fn()); }

// (the sessions kept between runs, when asked: a refresh token each, in a file of the caller's, never in the repo)
const kept = SESS && existsSync(SESS) ? JSON.parse(readFileSync(SESS, 'utf8') || '{}') : {};
const save = () => { if (SESS) writeFileSync(SESS, JSON.stringify(kept), { mode: 0o600 }); };
const storage = { getItem: (k) => kept[k] ?? null, setItem: (k, v) => { kept[k] = v; save(); }, removeItem: (k) => { delete kept[k]; save(); } };

let signIns = 0;
async function user(label) {
  const c = createClient(URL_, KEY, { auth: { storage, storageKey: 'skotos-live-' + label, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }, realtime: { params: { eventsPerSecond: 32 } } });
  let u = (await c.auth.getSession())?.data?.session?.user || null;
  if (!u) {
    const r = await c.auth.signInAnonymously({ options: { data: { app: 'skotos', test: 'live-supabase' } } });
    if (r.error) throw new Error('sign-in ' + label + ': ' + r.error.message);
    u = r.data.user; signIns++;
  }
  await c.realtime.setAuth();
  return { label, c, uid: u.id, chans: [] };
}
const nobody = () => ({ label: 'nobody', c: createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }), uid: null, chans: [] });
const rpc = async (U, fn, a) => { const t0 = now(); try { const r = await U.c.schema('skotos').rpc(fn, a); return { data: r.data, err: r.error ? r.error.message || r.error.code : null, code: r.error?.code || null, ms: now() - t0 }; } catch (e) { return { data: null, err: 'thrown: ' + e.message, ms: now() - t0 }; } };
const send = (U, topic, ev, data) => rpc(U, 'send', { msgs: [[topic, ev, typeof data === 'string' ? data : JSON.stringify(data)]] });

// a channel as the game joins it (private, presence keyed by the user id, broadcast self: false), and what it hears:
// every broadcast, its time, its event and payload. A join refused is tried again by the client itself (Phoenix's
// rejoin: 1, 2, 5, 10 s), as the game's channel is: this waits up to o.wait for SUBSCRIBED and says what came before.
// (One client holds one channel a topic, whatever its config: client.channel() gives the one it has. A second channel
// on the same topic, public or acked, is another client's: again(U), the same user's session in a client of its own)
function join(U, topic, o = {}) {
  const ch = U.c.channel(topic, { config: Object.assign({ broadcast: { self: false, ack: !!o.ack }, presence: { key: U.uid || 'nobody-' + rand(4) } }, o.public ? {} : { private: true }) });
  const heard = [], seen = [], t0 = now();
  ch.on('broadcast', { event: '*' }, (m) => heard.push({ t: now(), ev: m.event, pl: m.payload || {} }));
  ch.on('presence', { event: 'sync' }, () => {});
  U.chans.push(ch);
  return new Promise((res) => {
    let done = false; const fin = (s) => { if (done) return; done = true; res({ ch, heard, status: s, ms: now() - t0, before: seen.join('; '), why: seen.at(-1) || '' }); };
    ch.subscribe((s, e) => { if (s === 'SUBSCRIBED') fin(s); else seen.push(s + (e ? ' ' + String(e.message || e).slice(0, 110) : '')); });
    setTimeout(() => fin(seen.length ? 'REFUSED' : 'NO_ANSWER'), o.wait ?? 12000);
  });
}
const joined = (j) => j.status + (j.before ? ' after [' + j.before + ']' : '') + ' ' + Math.round(j.ms) + ' ms';
async function again(U) {
  const c = createClient(URL_, KEY, { auth: { storage, storageKey: 'skotos-live-' + U.label, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });
  const u = (await c.auth.getSession())?.data?.session?.user;
  await c.realtime.setAuth();
  return { label: U.label + "'", c, uid: u?.id, chans: [] };
}
// what a channel heard of one test message (by its k), and from whom the server says
const of = (J, k) => J.heard.filter((h) => { try { return JSON.parse(h.pl.d)?.k === k; } catch (e) { return false; } });
const anyK = (J, k) => J.heard.filter((h) => JSON.stringify(h.pl).includes(k));

const hosted = new Set(), all = [];
async function main() {
  console.log('project ' + host + ', supabase-js ' + JSON.parse(readFileSync(root + 'node_modules/@supabase/supabase-js/package.json', 'utf8')).version + ', node ' + process.version + (SESS ? ', sessions kept in ' + SESS : ''));
  const P = '1.';
  // ---------- 1. supabase-js ----------
  const N = nobody(); all.push(N);
  const n0 = await rpc(N, 'game_host', { room: 'skotos-test-none' });
  check(P, 'no session: an RPC is refused', n0.code === '42501', n0.code + ' ' + n0.err);
  const A = await user('a'), B = await user('b'); all.push(A, B);
  check(P, 'two anonymous users signed in', A.uid && B.uid && A.uid !== B.uid, 'new sign-ins this run: ' + signIns);
  const room = 'skotos-test-' + rand(6), topic = 'skotos:' + room, none = 'skotos-test-none-' + rand(4);
  const h1 = await rpc(A, 'host_game', { room }); if (h1.data === 'ok') hosted.add([A, room]);
  check(P, 'host_game by A: ok', h1.data === 'ok', h1.data ?? h1.err);
  const h2 = await rpc(B, 'host_game', { room });
  check(P, 'host_game of the same room by B: taken', h2.data === 'taken', h2.data ?? h2.err);
  const g1 = await rpc(B, 'game_host', { room });
  check(P, 'game_host (asked by B) is A', g1.data === A.uid, g1.data ?? g1.err);
  const g0 = await rpc(B, 'game_host', { room: none });
  check(P, 'game_host of a room with no game: null', g0.data === null && !g0.err, String(g0.data ?? g0.err));

  const [JA, JB, LA, LB] = await Promise.all([join(A, topic), join(B, topic), join(A, 'skotos:lobby'), join(B, 'skotos:lobby')]);
  check(P, 'signed in: the game\'s private channel and the lobby joined (A, B)', [JA, JB, LA, LB].every((j) => j.status === 'SUBSCRIBED'), 'game A ' + joined(JA) + '; game B ' + joined(JB) + '; lobby A ' + joined(LA) + '; lobby B ' + joined(LB));
  check(P, 'and at the first try', [JA, JB, LA, LB].every((j) => !j.before), [JA, JB, LA, LB].map((j) => j.before || 'first').join(' | '));
  const [JN, LN] = await Promise.all([join(N, topic, { wait: 8000 }), join(N, 'skotos:lobby', { wait: 8000 })]);
  check(P, 'no session: the private channels refused', JN.status !== 'SUBSCRIBED' && LN.status !== 'SUBSCRIBED', 'game: ' + JN.status + ' ' + JN.why + ' / lobby: ' + LN.status + ' ' + LN.why);
  // (a public channel of the same name: another channel; whether it may be joined is the project's 'Allow public access')
  // (--public only: a public channel of the same name, which the game never joins, is another channel. Whether one may
  // be joined at all is the project's 'Allow public access'. Off by default: the game's own traffic is private channels)
  const NONE = { heard: [], status: 'not tried' };
  let PB = NONE, PN = NONE;
  if (PUB) {
    const B2 = await again(B), N2 = nobody(); all.push(B2, N2);
    [PB, PN] = await Promise.all([join(B2, topic, { public: true, wait: 5000 }), join(N2, topic, { public: true, wait: 5000 })]);
    info(P, 'a public channel of the same name (the project\'s Allow public access)', 'B: ' + joined(PB) + ', no session: ' + joined(PN));
  }
  await sleep(500);

  // the stamp
  const k1 = 'hello-' + rand(4), t1 = now(), s1 = await send(A, topic, 's', { k: k1, n: 1 });
  check(P, 'skotos.send by the host: taken', s1.data === 1 && !s1.err, (s1.err || s1.data) + ', ' + Math.round(s1.ms) + ' ms');
  await until(() => of(JB, k1).length && of(JA, k1).length, 6000);
  const b1 = of(JB, k1)[0];
  check(P, 'the guest hears it, \'_by\' = the host\'s user id (the server\'s)', b1 && b1.pl._by === A.uid && b1.ev === 's', b1 ? 'payload keys ' + Object.keys(b1.pl).join(',') + ', ' + Math.round(b1.t - t1) + ' ms' : 'not heard');
  check(P, 'realtime.send\'s own id is on it, the data inside d as the page\'s text', b1 && typeof b1.pl.id === 'string' && typeof b1.pl.d === 'string' && JSON.parse(b1.pl.d).n === 1, b1 ? 'd ' + b1.pl.d : '');
  info(P, 'the sender hears its own (a broadcast from the database knows no self)', of(JA, k1).length + ' time(s) on A' + (of(JA, k1)[0] ? ', ' + Math.round(of(JA, k1)[0].t - t1) + ' ms' : ''));
  const k2 = 'forge-' + rand(4), s2 = await send(B, topic, 'f', { k: k2, _by: A.uid, f: A.uid });
  await until(() => of(JA, k2).length, 6000);
  const a2 = of(JA, k2)[0];
  check(P, 'a guest\'s forged \'_by\' and \'f\' inside its data: the stamp is still the guest\'s', !s2.err && a2 && a2.pl._by === B.uid && JSON.parse(a2.pl.d)._by === A.uid, a2 ? '_by ' + (a2.pl._by === B.uid ? 'B' : a2.pl._by) + ', d ' + a2.pl.d.slice(0, 40) + '...' : s2.err || 'not heard');
  const s2b = await rpc(B, 'send', { msgs: [[topic, 'f', '{}', A.uid]] }), s2c = await rpc(B, 'send', { msgs: [[topic, 'f', { _by: A.uid }]] });
  check(P, 'a message with a fourth element, or data not a string: invalid_argument', s2b.err === 'invalid_argument' && s2c.err === 'invalid_argument', s2b.err + ' / ' + s2c.err);
  check(P, 'the page with no session heard none of it', !JN.heard.length && !LN.heard.length && !anyK(PN, k1).length && !anyK(PN, k2).length, JN.heard.length + LN.heard.length + PN.heard.length + ' heard');
  if (PUB) check(P, 'nor did the public channels of the same name', !anyK(PB, k1).length && !anyK(PB, k2).length && !anyK(PN, k1).length, PB.heard.length + ' / ' + PN.heard.length + ' heard');
  check(P, 'the lobby heard none of the game\'s', !anyK(LB, k1).length, LB.heard.length + ' on the lobby');

  // a page's own broadcast on a 'skotos:' topic: by the socket (acked, to have the server's answer), and by REST both ways
  const B3 = await again(B); all.push(B3);
  const k3 = 'direct-' + rand(4), FB = await join(B3, topic, { ack: true });
  info(P, 'B\'s second client on the private channel, broadcast acked', joined(FB));
  let r3 = 'not joined';
  if (FB.status === 'SUBSCRIBED') r3 = await FB.ch.send({ type: 'broadcast', event: 's', payload: { k: k3, _by: A.uid, d: JSON.stringify({ k: k3 }) } });
  const RB = JB.ch;
  let r4 = null; try { r4 = await RB.httpSend('s', { k: k3, _by: A.uid, d: JSON.stringify({ k: k3 }) }); r4 = r4?.success ? 'accepted (202)' : JSON.stringify(r4); } catch (e) { r4 = 'refused: ' + String(e.message).slice(0, 80); }
  let r5 = null; try {
    const res = await fetch(URL_ + '/realtime/v1/api/broadcast', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + (await B.c.auth.getSession()).data.session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ topic, event: 's', payload: { k: k3, _by: A.uid, d: JSON.stringify({ k: k3 }) }, private: true }] }) });
    r5 = res.status + ' ' + (await res.text()).slice(0, 80);
  } catch (e) { r5 = 'thrown: ' + e.message; }
  await sleep(3000);
  check(P, 'a page\'s own broadcast on the private channel (socket, httpSend, REST): never delivered', !anyK(JA, k3).length && !anyK(JB, k3).length, 'socket: ' + r3 + '; httpSend: ' + r4 + '; REST: ' + r5 + '; heard by A ' + anyK(JA, k3).length);
  info(P, 'the server\'s answer to the socket broadcast', String(r3));
  if (PUB) {
    let r6 = 'not joined';
    if (PB.status === 'SUBSCRIBED') r6 = await PB.ch.send({ type: 'broadcast', event: 's', payload: { k: k3 + 'p', _by: A.uid, d: '{}' } });
    await sleep(1500);
    check(P, 'a broadcast on the public channel of the same name: not on the game\'s', !anyK(JA, k3 + 'p').length, 'sent: ' + r6 + '; heard on the public channel (no session): ' + anyK(PN, k3 + 'p').length);
  }
  // presence: allowed on the private channel (the game tracks { k } once a channel)
  const tr = await JB.ch.track({ k: B.uid });
  await until(() => Object.keys(JA.ch.presenceState() || {}).includes(B.uid), 6000);
  check(P, 'presence tracked on the private channel and seen by the other', tr === 'ok' && Object.keys(JA.ch.presenceState() || {}).includes(B.uid), 'track ' + tr + ', A sees ' + Object.keys(JA.ch.presenceState() || {}).length + ' key(s)');

  // the limits
  const x4 = JSON.stringify('x'.repeat(4094)), x5 = JSON.stringify('x'.repeat(4095));
  const k7 = 'big-' + rand(4), d7 = JSON.stringify({ k: k7, p: 'y'.repeat(4096 - JSON.stringify({ k: k7, p: '' }).length) });
  const s7 = await send(A, topic, 'f', d7);
  const s8 = await send(A, topic, 'f', x5);
  await until(() => of(JB, k7).length, 5000);
  check(P, '4096 bytes of data taken and heard, 4097 refused: too_big', d7.length === 4096 && x5.length === 4097 && !s7.err && of(JB, k7).length === 1 && s8.err === 'too_big', (s7.err || 'ok') + ' / ' + s8.err);
  const s9 = await send(A, topic, 'f', '{');
  check(P, 'data that is not JSON: refused', !!s9.err && s9.data == null, s9.err);
  const s10 = await send(A, 'skotos:' + none, 'f', '1');
  check(P, 'a topic with no live game: no_game', s10.err === 'no_game', s10.err);
  const s11 = await rpc(B, 'send', { msgs: Array.from({ length: 16 }, () => [topic, 'f', x4]) });
  check(P, 'a guest\'s sixteen messages of 4 KiB at once: rate_limited (its bytes), nothing sent', s11.err === 'rate_limited', s11.err || 'taken');
  const s12 = await rpc(B, 'send', { msgs: Array.from({ length: 17 }, () => [topic, 'f', '1']) });
  check(P, 'seventeen messages in a call: invalid_argument', s12.err === 'invalid_argument', s12.err);
  const e1 = await rpc(B, 'end_game', { room }), g2 = await rpc(B, 'game_host', { room });
  check(P, 'end_game by a guest leaves the host\'s game', !e1.err && g2.data === A.uid, (e1.err || 'ok') + ', host still ' + (g2.data === A.uid ? 'A' : g2.data));
  const e2 = await rpc(A, 'end_game', { room }), g3 = await rpc(B, 'game_host', { room }), s13 = await send(A, topic, 's', { k: 'after' });
  check(P, 'end_game by the host frees it: game_host null, a send no_game', !e2.err && g3.data === null && s13.err === 'no_game', (e2.err || 'ok') + ', ' + g3.data + ', ' + s13.err);
  const h3 = await rpc(B, 'host_game', { room }); if (h3.data === 'ok') hosted.add([B, room]);
  check(P, 'and another may host it then', h3.data === 'ok', h3.data ?? h3.err);
  const e3 = await rpc(B, 'end_game', { room }); hosted.clear();
  await rpc(A, 'host_game', { room }); hosted.add([A, room]);
  void e3;

  // latency and deliveries: the pair (each message its own call, one after the other, as the page's poster sends them
  // when nothing waits), then four
  const lat = async (label, senders, members, n, gap) => {
    const sent = [], rtt = [];
    for (let i = 0; i < n; i++) for (const [U, ev] of senders) {
      const k = label + '-' + U.label + '-' + i + '-' + rand(3), t0 = now();
      sent.push({ k, U, t0 }); const r = await send(U, topic, ev, { k, i }); rtt.push(r.ms); if (r.err) sent.at(-1).err = r.err;
      if (gap) await sleep(gap);
    }
    await sleep(2500);
    const toOthers = [], toSelf = [], counts = new Map(); let total = 0;
    for (const s of sent) for (const [M, J] of members) {
      const h = of(J, s.k), c = counts.get(M.label) || { others: 0, self: 0, miss: 0, dup: 0, badStamp: 0 };
      total += h.length;
      if (M === s.U) c.self += h.length; else { c.others += Math.min(1, h.length); if (!h.length) c.miss++; }
      if (h.length > 1) c.dup += h.length - 1;
      if (h.length && h[0].pl._by !== s.U.uid) c.badStamp++;
      if (h.length) (M === s.U ? toSelf : toOthers).push(h[0].t - s.t0);
      counts.set(M.label, c);
    }
    const line = [...counts].map(([k, c]) => k + ': heard ' + c.others + ' of the others\' ' + (sent.length - sent.filter((s) => s.U.label === k).length) + ', own back ' + c.self + ' of ' + sent.filter((s) => s.U.label === k).length + (c.miss ? ', missed ' + c.miss : '') + (c.dup ? ', dup ' + c.dup : '') + (c.badStamp ? ', bad stamp ' + c.badStamp : '')).join('; ');
    return { sent, rtt, toOthers, toSelf, counts, total, line, errs: sent.filter((s) => s.err).map((s) => s.err) };
  };
  const clean = (L) => !L.errs.length && [...L.counts.values()].every((c) => !c.miss && !c.dup && !c.badStamp);
  const L2 = await lat('pair', [[A, 's'], [B, '_p']], [[A, JA], [B, JB]], 15, 60);
  check(P, 'a pair, 30 messages: every one heard by the other once, stamped right, none refused', clean(L2), L2.line + (L2.errs.length ? '; refused ' + L2.errs.join(',') : ''));
  info(P, 'pair: the call (RPC round trip)', st(L2.rtt));
  info(P, 'pair: send to heard by the other', st(L2.toOthers));
  info(P, 'pair: send to its own back', st(L2.toSelf));
  info(P, 'pair: deliveries a message', (L2.total / L2.sent.length).toFixed(2) + ' (' + L2.total + ' for ' + L2.sent.length + ': the other, and the sender its own)');
  let C = null, D = null, JC = null, JD = null;
  if (FOUR) {
    C = await user('c'); D = await user('d'); all.push(C, D);
    [JC, JD] = await Promise.all([join(C, topic), join(D, topic)]);
    check(P, 'four: the third and fourth users join', JC.status === 'SUBSCRIBED' && JD.status === 'SUBSCRIBED', JC.status + ' ' + JD.status + ', new sign-ins this run: ' + signIns);
    await sleep(500);
    const L4 = await lat('four', [[A, 's'], [B, '_p'], [C, '_p'], [D, 'f']], [[A, JA], [B, JB], [C, JC], [D, JD]], 8, 30);
    check(P, 'four, 32 messages: every one heard by the three others once, stamped right, none refused', clean(L4), L4.line + (L4.errs.length ? '; refused ' + L4.errs.join(',') : ''));
    info(P, 'four: the call', st(L4.rtt));
    info(P, 'four: send to heard by another', st(L4.toOthers));
    info(P, 'four: send to its own back', st(L4.toSelf));
    info(P, 'four: deliveries a message', (L4.total / L4.sent.length).toFixed(2) + ' (' + L4.total + ' for ' + L4.sent.length + ': the three others, and the sender its own)');
  }
  for (const U of all) { try { await U.c.removeAllChannels(); } catch (e) { /* gone */ } U.chans.length = 0; }
  await rpc(A, 'end_game', { room }); hosted.clear();

  // ---------- 2. the transport ----------
  const Q = '2.';
  const users = FOUR ? [A, B, C, D] : [A, B];
  const T = users.map((U) => SupabaseTransport(U.c, { stamped: true, me: U.uid }));
  check(Q, 'SupabaseTransport (stamped) over each live client', T.every((t) => t && t.stamped && t.lobby), T.map((t) => t?.kind).join(','));
  const room2 = 'skotos-test-' + rand(6);
  const ch = [await T[0].join(room2, { host: true })]; hosted.add([A, room2]);
  check(Q, 'the host\'s join makes the game (host_game) and says it hosts', ch[0].host === A.uid, ch[0].host);
  for (let i = 1; i < T.length; i++) ch.push(await T[i].join(room2));
  check(Q, 'each guest\'s join is told its host by the server (game_host)', ch.slice(1).every((c) => c.host === A.uid), ch.map((c) => (c.host === A.uid ? 'A' : c.host)).join(','));
  let nog = null; await T[1].join('skotos-test-none-' + rand(4)).catch((e) => { nog = e.code; });
  check(Q, 'a join of a code with no game: no_game', nog === 'no_game', nog);
  check(Q, 'every channel connected (private, signed in)', await until(() => ch.every((c) => c.connected()) && T.every((t) => t.lobby.connected()), 12000), ch.map((c) => c.connected()).join(','));
  ch.forEach((c, i) => c.presence({ r: i ? 'g' : 'h', c: room2.slice(12), cls: ['warden', 'mage', 'ranger', 'warden'][i] }));
  const seeAll = () => ch.every((c, i) => users.every((U, j) => i === j || c.peers().some((p) => p.peer === U.uid && p.by === U.uid && p.presence.r)));
  const tp0 = now(), seen = await until(seeAll, 15000);
  check(Q, 'every page lists every other, named by the server, with its presence', seen, Math.round(now() - tp0) + ' ms; ' + ch.map((c) => c.peers().length).join(','));
  const heard = ch.map(() => []), own = [];
  ch.forEach((c, i) => { c.on('s', (m) => heard[i].push({ t: now(), m })); c.on('f', (m) => heard[i].push({ t: now(), m })); });
  ch[0].on('s', (m) => { if (m.peer === A.uid) own.push(m); });
  const sentT = new Map();
  for (let i = 0; i < 20; i++) { sentT.set(i, now()); await ch[0].emit('s', { i, a: Array.from({ length: 30 }, (_, j) => [j, 12, 1234, 2345, 51]) }); await sleep(100); }
  await sleep(2500);
  const lt = [], okAll = ch.slice(1).every((c, gi) => { const h = heard[gi + 1].filter((x) => x.m.topic === 's'); for (const x of h) lt.push(x.t - sentT.get(x.m.data.i)); return h.length === 20 && h.every((x, j) => x.m.peer === A.uid && x.m.data.i === j); });
  check(Q, 'the host\'s 20 snapshots (10 a second): every guest hears all, in order, from the host', okAll, ch.slice(1).map((c, gi) => heard[gi + 1].filter((x) => x.m.topic === 's').length).join(','));
  check(Q, 'its own, back from the server, passed over', own.length === 0 && !heard[0].some((x) => x.m.peer === A.uid), own.length);
  info(Q, 'transport: emit to heard by a guest', st(lt));
  await ch[1].emit('f', { k: 'forged', _by: A.uid, f: A.uid });
  await until(() => heard[0].some((x) => x.m.topic === 'f'), 5000);
  const hf = heard[0].find((x) => x.m.topic === 'f');
  check(Q, 'a guest\'s forged \'_by\' and \'f\': the host hears it from the guest', hf && hf.m.peer === B.uid && hf.m.by === B.uid, hf ? (hf.m.peer === B.uid ? 'B' : hf.m.peer) : 'not heard');
  check(Q, 'a 5 KB message refused before the wire', (await ch[0].emit('s', { p: 'x'.repeat(5000) })) === false && ch[0].meter.tx.big === 1);
  // a few seconds of a party at a gentle rate (the project's plan may allow 100 messages a second, each delivery one):
  // the host 4 snapshots a second of ~3.6 KB, each guest its presence 2 a second (the game: 10-12 and 9)
  const snap = (k) => ({ k, a: Array.from({ length: 60 }, (_, i) => [i + 100, 12, 1234 + k, 2345, 51, 200, 3, 4, 1]), f: Array.from({ length: 20 }, () => [3, 123.4, 56.7, 2, 16719904]), pad: 'x'.repeat(800) });
  const errs = []; ch.forEach((c) => c.onError((code, how) => errs.push(code + ':' + how)));
  const got0 = heard.map((h) => h.length), tx0 = ch.map((c) => c.meter.tx.drops), t0 = Date.now(); let k = 0;
  while (Date.now() - t0 < 5000) {
    ch[0].emit('s', snap(k));
    if (k % 2 === 0) for (let g = 1; g < ch.length; g++) ch[g].presence({ h: [k, g, 1000 + k, 2000, 3] });
    for (const c of ch) c.pump();
    k++; await sleep(250);
  }
  await sleep(2500);
  const gotS = heard.map((h, i) => h.length - got0[i]), drops = ch.map((c, i) => c.meter.tx.drops - tx0[i]);
  check(Q, 'five seconds of a party (' + ch.length + ' pages): the guests hear the host\'s ' + k + ' snapshots, nothing refused', gotS.slice(1).every((n) => n >= k) && !errs.length && drops.every((d) => d === 0), 'heard ' + gotS.slice(1).join(',') + ', drops ' + drops.join(',') + (errs.length ? ', errors ' + errs.join(',') : ''));
  check(Q, 'the host has every guest\'s last presence', ch.slice(1).every((c) => (ch[0].peers().find((p) => p.peer === c.me)?.presence?.h?.[0] ?? -99) >= k - 3), ch.slice(1).map((c) => ch[0].peers().find((p) => p.peer === c.me)?.presence?.h?.[0]).join(',') + ' of ' + (k - 1));
  const rates = ch.map((c) => c.meter.rate());
  info(Q, 'what each page sent a second (the last 5 s)', rates.map((r) => r.msgsOut.toFixed(1) + ' msgs ' + Math.round(r.bytesOut) + ' B').join('; '));
  // the host leaves: its row ends, the guests see it go, a guest's send is no_game and ends the game for it
  const gErr = []; ch[1].onError((code, how) => gErr.push(code + ':' + how));
  await ch[0].leave(); hosted.clear();
  const gone = await until(() => ch.slice(1).every((c) => !c.peers().some((p) => p.peer === A.uid)), 15000);
  check(Q, 'the host leaves: every guest sees it gone', gone, ch.slice(1).map((c) => c.peers().length).join(','));
  const g4 = await rpc(B, 'game_host', { room: room2 });
  check(Q, 'and the game\'s row is ended (game_host null)', g4.data === null && !g4.err, String(g4.data ?? g4.err));
  const sg = await ch[1].emit('f', { after: 1 });
  await until(() => gErr.length, 6000);
  check(Q, 'a guest\'s send after it: refused no_game, the game ended for that page', gErr.includes('no_game:room'), 'emit ' + sg + ', ' + gErr.join(','));
  for (const c of ch.slice(1)) await c.leave();
  for (const t of T) await t.lobby.leave();
}

let crashed = null;
try { await main(); } catch (e) { crashed = e; check('!', 'the run itself', false, e.stack?.split('\n').slice(0, 3).join(' | ')); }
// (whatever happened: every game hosted here ended, every channel left)
for (const [U, r] of hosted) { try { await rpc(U, 'end_game', { room: r }); } catch (e) { /* tried */ } }
for (const U of all) { try { await U.c.removeAllChannels(); } catch (e) { /* gone */ } try { U.c.realtime.disconnect(); } catch (e) { /* gone */ } }
const w = [4, Math.max(...rows.map((r) => r.name.length)) + 2];
console.log('\n' + 'part'.padEnd(w[0]) + ' ' + 'result'.padEnd(7) + ' check');
for (const r of rows) console.log(r.part.padEnd(w[0]) + ' ' + (r.pass === null ? 'info' : r.pass ? 'pass' : 'FAIL').padEnd(7) + ' ' + r.name + (r.detail ? '\n' + ' '.repeat(w[0] + 9) + r.detail : ''));
console.log('\n' + (fails ? fails + ' failed' : 'all passed') + ' (' + rows.filter((r) => r.pass !== null).length + ' checks), new anonymous sign-ins this run: ' + signIns);
process.exit(fails ? 1 : crashed ? 1 : 0);
