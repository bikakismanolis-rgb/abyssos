// node tools/cloud/test-saves.mjs: supabase/migrations/*_skotos_saves.sql on a Postgres of its own in this process
// (PGlite: nothing is connected to, no project touched), with Supabase's parts stood in for (the roles anon and
// authenticated, auth.uid() from the JWT's sub). First the functions' rules called directly: closed tables, the caller's
// own rows only, rev and 'conflict', the caps (size, heroes, rate, the project's bytes and players), codes (made,
// claimed, normalized, renewed, tries limited), tombstones. Then src/net/cloudsb.js over a fake supabase-js client whose
// RPCs run here as the signed-in user, with game/cloudsync.js: two devices joined by a code, a session lost and found
// again by its kept code, and a claim of that code whose answer is lost (the code kept, never another's put over it).
// PGlite: npm i --no-save @electric-sql/pglite@0.5.8 (or PGLITE=<its dist/index.js>).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { supabaseBackend, normCode, CODE_RE, keptCode } from '../../src/net/cloudsb.js';
import { syncAll } from '../../src/game/cloudsync.js';
import { device, hero } from './fakes.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SQL = readFileSync(root + 'supabase/migrations/' + readdirSync(root + 'supabase/migrations').find((f) => f.endsWith('_skotos_saves.sql')), 'utf8');
let PGlite;
try { ({ PGlite } = await import(process.env.PGLITE ? pathToFileURL(process.env.PGLITE).href : '@electric-sql/pglite')); } catch (e) {
  console.log('no PGlite: npm i --no-save @electric-sql/pglite@0.5.8 (or PGLITE=<path to its dist/index.js>)'); process.exit(2);
}
const STUB = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
`;
const pg = new PGlite();
await pg.exec(STUB);
await pg.exec(SQL);
await pg.exec(SQL);

let pass = 0, fail = 0;
const ok = (c, what, extra) => { if (c) pass++; else { fail++; console.log('FAIL', what, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const T = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL', name, e.stack); } };
// a call as a role and user: the result, or { err: message }
async function as(uid, sql, vals = [], role = 'authenticated') {
  try {
    return await pg.transaction(async (tx) => {
      await tx.query(`set local role ${role}`);
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || '']);
      const r = await tx.query(sql, vals);
      return r.rows.length === 1 && Object.keys(r.rows[0]).length === 1 ? Object.values(r.rows[0])[0] : r.rows;
    });
  } catch (e) { return { err: e.message }; }
}
const call0 = (uid, fn, args = {}) => { const k = Object.keys(args); return as(uid, `select skotos.${fn}(${k.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`, k.map((n) => args[n])); };
const admin = async (sql, vals) => (await pg.query(sql, vals)).rows;
// the user's player, as the page names it in every call of the player's saves
const playerOf = async (uid) => (await admin('select player from skotos.save_users where uid = $1', [uid || null]))[0]?.player ?? null;
const OWN = new Set(['save_list', 'save_get', 'save_put', 'save_delete', 'save_new_code']);
const call = async (uid, fn, args = {}) => call0(uid, fn, OWN.has(fn) && !('p_player' in args) ? { p_player: await playerOf(uid), ...args } : args);
const put = (uid, id, o = {}) => call(uid, 'save_put', { ...(o.player !== undefined ? { p_player: o.player } : {}), hero_id: id, data: o.data ?? JSON.stringify(hero(id, o.h)), sum: o.sum ?? 's' + id, played: o.played ?? 1000, base_rev: o.rev ?? null });
const refill = () => admin('update skotos.save_users set tokens = 20');
const quotaOk = async () => { const [q] = await admin('select bytes from skotos.save_quota'); const [s] = await admin('select coalesce(sum(bytes),0)::bigint as b from skotos.saves'); return Number(q.bytes) === Number(s.b); };

const U1 = randomUUID(), U2 = randomUUID(), U3 = randomUUID();
await T('closed', async () => {
  ok((await call(null, 'save_hello')).err?.includes('not_signed_in'), 'no user: refused');
  ok(/permission denied/.test((await as(U1, 'select skotos.save_hello()', [], 'anon')).err || ''), 'the anon key alone: no access');
  ok(/permission denied/.test((await as(U1, 'select * from skotos.saves')).err || ''), 'the saves table is closed');
  ok(/permission denied/.test((await as(U1, 'select * from skotos.save_players')).err || ''), 'the players table is closed');
  ok(/permission denied/.test((await as(U1, 'select skotos.save_make_code()')).err || ''), 'the helpers are not a page\'s');
  ok(/permission denied/.test((await as(U1, 'select skotos.save_spend(gen_random_uuid())')).err || ''), 'nor the bucket');
  const defs = await admin(`select p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'skotos' and p.proname like 'save%'`);
  ok(defs.every((d) => (d.proconfig || []).includes('search_path=""')), 'every function has its search_path pinned', defs);
  ok(defs.filter((d) => ['save_hello', 'save_claim', 'save_new_code', 'save_list', 'save_get', 'save_put', 'save_delete'].includes(d.proname)).every((d) => d.prosecdef), 'every page function is a definer');
});

let code1;
await T('hello and codes', async () => {
  const h = await call(U1, 'save_hello');
  ok(h.player && h.new && CODE_RE.test(h.code), 'a new player and its code', h);
  code1 = h.code;
  const again = await call(U1, 'save_hello');
  ok(again.player === h.player && again.code === undefined, 'the same player, the code not shown again', again);
  const [row] = await admin('select encode(code_hash, \'hex\') as h from skotos.save_players where id = $1', [h.player]);
  ok(row.h.length === 64 && !row.h.includes(code1), 'only a hash kept');
  const codes = new Set(); for (let i = 0; i < 200; i++) codes.add(await admin('select skotos.save_make_code() as c').then((r) => r[0].c));
  ok(codes.size === 200 && [...codes].every((c) => CODE_RE.test(c)), 'codes: random, in the alphabet');
  const chars = new Map(); for (const c of codes) for (const ch of c) chars.set(ch, (chars.get(ch) || 0) + 1);
  ok(chars.size === 32, 'all 32 symbols appear', [...chars.keys()].join(''));
  ok(normCode('abcd-efgh-ijkl-mnop') === 'ABCDEFGH1JK1MN0P', 'typed codes normalized (I, L, O)');
});

await T('put, get, list, conflict', async () => {
  const r1 = await put(U1, 'h1');
  ok(r1.rev === 1, 'first put: rev 1', r1);
  ok((await put(U1, 'h1')).error === 'conflict', 'a put that expects no row when there is one: conflict');
  ok((await put(U1, 'h1', { rev: 7 })).error === 'conflict', 'a wrong rev: conflict');
  const r2 = await put(U1, 'h1', { rev: 1, played: 2000, h: { gold: 5 } });
  ok(r2.rev === 2, 'rev 2', r2);
  const g = await call(U1, 'save_get', { hero_id: 'h1' });
  ok(g.rev === 2 && JSON.parse(g.data).gold === 5 && Number(g.played) === 2000 && g.del === false, 'get', g);
  const text = '{"id":"h9","b":1.50,"a":[1,2]}';
  await put(U1, 'h9', { data: text });
  ok((await call(U1, 'save_get', { hero_id: 'h9' })).data === text, 'the text kept byte for byte (no jsonb reordering)');
  const l = await call(U1, 'save_list');
  ok(Array.isArray(l) && l.length === 2 && l.every((x) => !('data' in x)), 'list: two, no data', l);
  ok((await put(U1, 'h2', { data: '{"id":"hX"}' })).error === 'bad_data', 'data whose id is another hero: bad_data');
  ok((await put(U1, 'h2', { data: '[1]' })).error === 'bad_data', 'not an object: bad_data');
  ok((await put(U1, 'h2', { data: '{nope' })).error === 'bad_data', 'not JSON: bad_data');
  ok((await put(U1, 'h2', { data: JSON.stringify(hero('h2', { flags: { p: 'x'.repeat(98304) } })) })).error === 'too_big', 'past 96 KiB: too_big');
  ok((await put(U1, 'bad id!')).error === 'invalid_argument', 'a bad hero id');
  ok((await call(U2, 'save_list')).error === 'moved', 'a user with no player: refused (moved, player null)');
  ok(await quotaOk(), 'the project\'s count matches the rows');
});

await T('another player sees nothing', async () => {
  await call(U2, 'save_hello');
  ok((await call(U2, 'save_get', { hero_id: 'h1' })) === null, 'another player\'s hero reads as none');
  ok((await call(U2, 'save_list')).length === 0, 'and lists none');
  ok((await put(U2, 'h1')).rev === 1, 'its own h1 is its own row');
  ok(JSON.parse((await call(U1, 'save_get', { hero_id: 'h1' })).data).gold === 5, 'U1\'s untouched');
});

await T('tombstones', async () => {
  const d = await call(U1, 'save_delete', { hero_id: 'h9', at: 5000, base_rev: 1 });
  ok(d.rev === 2, 'deleted: rev 2', d);
  const g = await call(U1, 'save_get', { hero_id: 'h9' });
  ok(g.del === true && g.data === null && Number(g.at) === 5000, 'a tombstone, no data', g);
  ok((await put(U1, 'h9', { rev: 2 })).rev === 3, 'a later copy may live again over it');
  ok(await quotaOk(), 'count matches');
  // a player keeps its newest 32
  await call(U3, 'save_hello');
  for (let i = 0; i < 36; i++) { await refill(); await call(U3, 'save_delete', { hero_id: 't' + i, at: 1000 + i, base_rev: null }); }
  const [n] = await admin('select count(*)::int as n, min(s.at)::int as lo from skotos.saves s join skotos.save_users u on u.player = s.player where u.uid = $1', [U3]);
  ok(n.n === 32 && n.lo === 1004, 'the newest 32 tombstones kept', n);
  ok(await quotaOk(), 'count matches after pruning');
});

await T('caps', async () => {
  const U = randomUUID(); await call(U, 'save_hello');
  const fill = async () => refill();
  for (let i = 0; i < 12; i++) { await fill(); ok((await put(U, 'k' + i)).rev === 1, 'hero ' + i); }
  await fill();
  ok((await put(U, 'k12')).error === 'too_many', 'a 13th live hero: too_many');
  await call(U, 'save_delete', { hero_id: 'k0', at: 1, base_rev: 1 }); await fill();
  ok((await put(U, 'k12')).rev === 1, 'one deleted: room again');
  ok((await put(U, 'k0', { rev: 2 })).error === 'too_many', 'and the deleted one cannot come back past 12');
  // the rate: 20 at once, then refused
  await fill(); let n = 0, last;
  for (let i = 0; i < 25; i++) { last = await put(U, 'k1', { rev: 1 + n, h: { gold: i } }); if (last.rev) n++; else if (last.error !== 'rate_limited') break; }
  ok(n === 20 && last.error === 'rate_limited', 'the 21st write in a moment: rate_limited', { n, last });
  // the project's bytes
  await fill();
  await admin('update skotos.save_quota set bytes_cap = bytes + 100, reserve = 2000');
  ok((await put(U, 'k2', { rev: 1, h: { gold: 1, flags: { pad: 'y'.repeat(4000) } } })).error === 'quota', 'past the project\'s bytes and the reserve: quota');
  ok((await put(U, 'k2', { rev: 1, h: { gold: 1, flags: { pad: 'y'.repeat(1000) } } })).rev === 2, 'a hero already kept grows into the reserve');
  await call(U, 'save_delete', { hero_id: 'k3', at: 1, base_rev: 1 });
  ok((await put(U, 'k13', { h: { gold: 1, flags: { pad: 'y'.repeat(1000) } } })).error === 'quota', 'a new hero past the cap: quota, the reserve is not its');
  ok((await put(U, 'k2', { rev: 2, data: '{"id":"k2"}' })).rev === 3, 'a write that shrinks is let through');
  await admin('update skotos.save_quota set bytes_cap = 67108864, reserve = 16777216');
  // the project's players
  await admin('update skotos.save_quota set players_cap = players');
  const capped = await call(randomUUID(), 'save_hello');
  ok(capped.player === null && capped.quota === true, 'past the players cap: no player made (quota)', capped);
  await admin('update skotos.save_quota set players_cap = 20000');
  ok(await quotaOk(), 'count matches');
});

await T('claims', async () => {
  const B = randomUUID();
  const hb = await call(B, 'save_hello'); await put(B, 'hb'); await put(B, 'h1', { h: { gold: 99 } });
  const [p0] = await admin('select players from skotos.save_quota');
  const c = await call(B, 'save_claim', { code: code1.toLowerCase().replace(/(.{4})/g, '$1-') });
  const [me] = await admin('select player from skotos.save_users where uid = $1', [B]);
  ok(c.player === me.player && c.player !== hb.player, 'a typed code (lower case, dashes) ties B to U1\'s player', c);
  const l = (await call(B, 'save_list')).map((x) => x.id).sort();
  ok(l.includes('h1') && l.includes('hb'), 'B now lists U1\'s heroes and its own moved there', l);
  ok(JSON.parse((await call(B, 'save_get', { hero_id: 'h1' })).data).gold === 5, 'U1\'s h1 stands over B\'s (B keeps its own locally)');
  ok(!(await admin('select 1 from skotos.save_players where id = $1', [hb.player])).length, 'B\'s old player is gone');
  const [p1] = await admin('select players from skotos.save_quota');
  ok(p1.players === p0.players - 1, 'the players count follows', { p0, p1 });
  ok(await quotaOk(), 'bytes follow');
  ok((await call(B, 'save_claim', { code: 'ZZZZ-ZZZZ-ZZZZ-ZZZZ' })).error === 'bad_code', 'a wrong code: bad_code');
  let r; for (let i = 0; i < 5; i++) r = await call(B, 'save_claim', { code: 'ZZZZ' });
  ok(r.error === 'rate_limited', 'tries limited (5 at once)', r);
  // a new code: the old stops working, and every other user tied is let go
  const nc = await call(U1, 'save_new_code');
  ok(CODE_RE.test(nc.code) && nc.code !== code1 && nc.untied === 1, 'a new code (B let go)', nc);
  ok((await call(randomUUID(), 'save_claim', { code: code1 })).error === 'bad_code', 'the old code no longer works');
  ok((await call0(B, 'save_list', { p_player: me.player })).error === 'moved' && !(await playerOf(B)), 'B is let go: its calls of the player refused moved', await playerOf(B));
  ok((await call(U1, 'save_list')).length > 0, 'U1, who made it, stays');
  const C = randomUUID();
  ok((await call(C, 'save_claim', { code: nc.code })).player === me.player, 'the new one works');
  code1 = nc.code;
});

// ---------- the backend and the sync over a fake supabase-js client whose RPCs run here ----------
function memStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; }
// (blockClaim: the next save_claim calls never reach the server; dropClaim: they run there, their answers lost; dropNew:
// the same for save_new_code)
const net = { offline: false, signIns: 0, blockClaim: 0, dropClaim: 0, dropNew: 0 };
const lost = { data: null, error: { message: 'TypeError: Failed to fetch' } };
function fakeCreateClient(url, key, opts) {
  const sk = opts.auth.storageKey, st = opts.auth.storage;
  const read = () => { try { return JSON.parse(st.getItem(sk) || 'null'); } catch (e) { return null; } };
  return {
    auth: {
      getSession: async () => ({ data: { session: read() } }),
      signInAnonymously: async (o) => { net.signIns++; const s = { user: { id: randomUUID(), user_metadata: o?.options?.data } }; st.setItem(sk, JSON.stringify(s)); return { data: { user: s.user, session: s }, error: null }; }
    },
    schema: (s) => ({
      rpc(fn, args) {
        const p = (async () => {
          if (net.offline) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
          if (s !== 'skotos' || !/^save_[a-z_]+$/.test(fn)) return { data: null, error: { message: 'not found' } };
          if (fn === 'save_claim' && net.blockClaim > 0) { net.blockClaim--; return lost; }
          const r = await call(read()?.user?.id, fn, args);
          if (fn === 'save_claim' && net.dropClaim > 0) { net.dropClaim--; return lost; }
          if (fn === 'save_new_code' && net.dropNew > 0) { net.dropNew--; return lost; }
          return r && r.err ? { data: null, error: { message: r.err } } : { data: r, error: null };
        })();
        p.abortSignal = () => p;
        return p;
      }
    })
  };
}
const cfg = { url: 'https://x.supabase.co', anonKey: 'k', createClient: async (...a) => fakeCreateClient(...a) };

await T('backend: two devices joined by a code', async () => {
  await refill();
  const sA = memStorage(), sB = memStorage();
  const a = device(), b = device();
  a.B = await supabaseBackend(cfg, { storage: sA });
  ok(a.B && a.B.who?.startsWith('sb:') && CODE_RE.test(a.B.code()), 'a: signed in, a player, its code kept', a.B?.who);
  a.add(hero('ha1')); a.add(hero('ha2'));
  const r = await syncAll(a.B, a.store);
  ok(r.ok && r.pushed.length === 2, 'a pushes', r);
  b.B = await supabaseBackend(cfg, { storage: sB });
  b.add(hero('hb1', { cls: 'mage' }));
  await syncAll(b.B, b.store);
  ok(a.B.who !== b.B.who, 'b is its own player at first');
  await b.B.claim(showish(a.B.code()));
  ok(a.B.who === b.B.who, 'b takes a\'s code: the same player');
  const s = await syncAll(b.B, b.store);
  ok(s.ok && s.pulled.sort().join() === 'ha1,ha2', 'b takes a\'s heroes', s);
  ok(b.hero('hb1'), 'and keeps its own');
  const t = await syncAll(a.B, a.store);
  ok(t.pulled.join() === 'hb1', 'a gets b\'s (moved with the claim)', t);
  // a session lost (the auth key gone), the code kept: the same player again, by itself
  const who = b.B.who; sB.removeItem('skotos-save-auth');
  const b2 = await supabaseBackend(cfg, { storage: sB });
  ok(b2.who === who, 'a lost session finds its player again by the code kept', { who, now: b2.who });
  // everything lost: a new player (the heroes on the device go up there)
  const b3 = await supabaseBackend(cfg, { storage: memStorage() });
  ok(b3.who !== who, 'nothing kept: a new player');
  // offline: the call fails, nothing local changes
  net.offline = true; a.play('ha1', (h) => { h.gold = 1; });
  const before = a.snap();
  const u = await syncAll(a.B, a.store);
  ok(!u.ok && u.code === 'offline' && a.snap() === before, 'offline: nothing changed', u);
  let e = null; try { await supabaseBackend(cfg, { storage: memStorage() }); } catch (x) { e = x.code; }
  ok(e === 'offline', 'starting offline: refused offline', e);
  net.offline = false;
  ok((await syncAll(a.B, a.store)).pushed.join() === 'ha1', 'back online: it goes');
  let bad = null; try { await a.B.claim('nope'); } catch (x) { bad = x.code; }
  ok(bad === 'bad_code', 'a malformed code refused before the call');
  await admin('update skotos.save_quota set players_cap = players');
  const c2 = await supabaseBackend(cfg, { storage: memStorage(), claim: showish(a.B.code()) });
  ok(c2.who === a.B.who, 'a new device that starts by taking a code: that player, none made for it (the players cap reached holds no claim back)');
  await admin('update skotos.save_quota set players_cap = 20000');
  let bc = null; try { await supabaseBackend(cfg, { storage: memStorage(), claim: 'ZZZZ-ZZZZ-ZZZZ-ZZZZ' }); } catch (x) { bc = x.code; }
  ok(bc === 'bad_code', 'starting with a wrong code: bad_code', bc);
  const nc = await a.B.newCode();
  ok(CODE_RE.test(nc) && a.B.code() === nc, 'a new code kept and shown');
});
function showish(c) { return c.toLowerCase().match(/.{1,4}/g).join(' - '); }

await T('backend: a claim of the kept code that gets no answer', async () => {
  await refill();
  const sP = memStorage();
  const p = await supabaseBackend(cfg, { storage: sP });
  const P = p.player, codeP = p.code();
  const uidOf = () => JSON.parse(sP.getItem('skotos-save-auth')).user.id;
  const tied = async () => (await admin('select player from skotos.save_users where uid = $1', [uidOf()]))[0]?.player;
  const players = async () => (await admin('select count(*)::int as n from skotos.save_players'))[0].n;
  // the session lost, the code kept; the first start's claim never reaches the server
  sP.removeItem('skotos-save-auth');
  net.blockClaim = 1;
  let e1 = null; try { await supabaseBackend(cfg, { storage: sP }); } catch (x) { e1 = x.code; }
  ok(e1 === 'offline' && keptCode(sP)?.code === codeP, 'first start: refused offline, the code kept', e1);
  // the retry (the session stored now): save_hello makes a new player, the claim goes through but its answer is lost
  const n0 = await players();
  net.dropClaim = 1;
  let b = null, e2 = null; try { b = await supabaseBackend(cfg, { storage: sP }); } catch (x) { e2 = x.code; }
  ok(b && b.player === P && b.who === 'sb:' + P, 'the retry finds the user tied to the code\'s player', { e2, who: b?.who, P });
  ok(keptCode(sP)?.code === codeP && b?.code() === codeP, 'the code kept and shown is still that player\'s', sP.getItem('skotos.cloud.code'));
  ok(await tied() === P && await players() === n0, 'the server: the user on P, the empty player made for it gone');
  const c = await supabaseBackend(cfg, { storage: memStorage(), claim: codeP });
  ok(c.who === 'sb:' + P, 'the code shown works');
  // again, the retry's claim never reaching the server either: refused, nothing changed; the next start settles it
  sP.removeItem('skotos-save-auth');
  net.blockClaim = 2;
  let e3 = null, e4 = null;
  try { await supabaseBackend(cfg, { storage: sP }); } catch (x) { e3 = x.code; }
  try { await supabaseBackend(cfg, { storage: sP }); } catch (x) { e4 = x.code; }
  ok(e3 === 'offline' && e4 === 'offline' && keptCode(sP)?.code === codeP, 'two starts refused offline, the code kept (no split onto the new player)', { e3, e4 });
  const d = await supabaseBackend(cfg, { storage: sP });
  ok(d.who === 'sb:' + P && d.code() === codeP && await tied() === P, 'the next start claims it: the code\'s player', d.who);
  ok(!sP.getItem('skotos.cloud.claim'), 'settled: nothing left marked');
  // a kept code the server no longer knows (a new one made elsewhere): the new player's own code, one that works
  await refill();
  const nc = await c.newCode();
  sP.removeItem('skotos-save-auth');
  const e = await supabaseBackend(cfg, { storage: sP });
  ok(e.who !== 'sb:' + P && CODE_RE.test(e.code()) && e.code() !== codeP && e.code() !== nc, 'a dead kept code: a player of its own, its own code kept', { who: e.who, code: e.code() });
  const f = await supabaseBackend(cfg, { storage: memStorage(), claim: e.code() });
  ok(f.who === e.who, 'and that code works');
});


// ---------- the review's findings (each of these failed before its fix) ----------
const lvlIn = async (uid, id) => { const g = await call(uid, 'save_get', { hero_id: id }); return g && !g.del ? JSON.parse(g.data).level : null; };
const uidIn = (st) => JSON.parse(st.getItem('skotos-save-auth')).user.id;

await T('backend: the server moved the user to another player (another tab took a code): no old base or tombstone applied there', async () => {
  await refill();
  // the phone, on its player T: hY at level 9, hZ living
  const sPh = memStorage(), ph = device();
  ph.B = await supabaseBackend(cfg, { storage: sPh });
  ph.add(hero('hY', { level: 9, played: 1000 })); ph.add(hero('hZ', { cls: 'mage', played: 1000 }));
  await syncAll(ph.B, ph.store);
  const T = ph.B.player, codeT = ph.B.code();
  // the laptop on its own player: hY at level 5 (played since its sync), hZ deleted there; two tabs, one session
  const sL = memStorage(), L = device();
  const tab1 = await supabaseBackend(cfg, { storage: sL });
  L.add(hero('hY', { level: 5, played: 1000 })); L.add(hero('hZ', { cls: 'mage', played: 1000 }));
  await syncAll(tab1, L.store);
  L.play('hY', (h) => { h.gold += 7; }, 2000);
  L.del('hZ'); await syncAll(tab1, L.store);
  L.play('hY', (h) => { h.gold += 1; }, 3000);
  const tab2 = await supabaseBackend(cfg, { storage: sL });
  // tab 2 takes the phone's code; tab 1 never hears of it
  await tab2.claim(codeT);
  ok(tab2.player === T && tab1.player !== T, 'tab 2 on T; tab 1 still believes its old player');
  const r = await syncAll(tab1, L.store);
  ok(!r.ok && r.code === 'moved' && !r.pushed.length && !r.removed.length, 'tab 1\'s sync is refused moved before it changes anything', r);
  ok(tab1.player === T && tab1.who === 'sb:' + T, 'tab 1\'s backend took T', tab1.who);
  ok(await lvlIn(uidIn(sPh), 'hY') === 9 && await lvlIn(uidIn(sPh), 'hZ') !== null, 'T\'s hY still 9, its hZ still living');
  const s2 = await syncAll(tab1, L.store);
  ok(s2.ok && await lvlIn(uidIn(sPh), 'hY') === 9 && L.hero('hY').level === 9 && L.D.bak.some((b) => b.why === 'conflict' && b.hero.level === 5), 'the next sync weighs hY as never agreed: the 9 kept, the laptop\'s 5 a conflict backup', { s2, bak: L.D.bak.map((b) => b.why + ':' + b.hero.level) });
  ok(!s2.removed.includes('hZ') && await lvlIn(uidIn(sPh), 'hZ') !== null, 'the old player\'s tombstone is not told to T', s2);
  const t = await syncAll(tab2, L.store);
  ok(t.ok && !t.removed.length && await lvlIn(uidIn(sPh), 'hZ') !== null, 'nor by tab 2', t);
  const u = await syncAll(ph.B, ph.store);
  ok(ph.hero('hY').level === 9 && ph.hero('hZ') && !u.dropped.length, 'the phone keeps both', u);
});

await T('backend: a claim whose answer was lost, and the code shown', async () => {
  await refill();
  const sP = memStorage(), P = await supabaseBackend(cfg, { storage: sP }), codeP = P.code();
  const sL = memStorage(), Lb = await supabaseBackend(cfg, { storage: sL }), codeL = Lb.code();
  net.dropClaim = 1;
  let e = null, who = null; try { who = await Lb.claim(codeP); } catch (x) { e = x.code; }
  ok(who === 'sb:' + P.player && Lb.player === P.player && Lb.code() === codeP, 'the claim went through, its answer lost: the backend finds its new player, the code shown is that one', { e, who: Lb.who, code: Lb.code() });
  ok(keptCode(sL)?.player === P.player && keptCode(sL)?.code === codeP, 'kept with its player');
  // a new code made on another device of the player: this one's code is dead, and it is let go
  await refill();
  const nc = await P.newCode();
  ok(CODE_RE.test(nc) && nc !== codeP, 'a new code on the phone');
  const L2 = await supabaseBackend(cfg, { storage: sL });
  ok(L2.code() !== codeP, 'the laptop no longer shows the dead code', { shown: L2.code(), dead: codeP });
  if (L2.code()) { const c = await supabaseBackend(cfg, { storage: memStorage(), claim: L2.code() }); ok(c.who === L2.who, 'what it shows works'); }
  // a new code whose answer was lost: the old code is not shown as if it still worked
  await refill();
  const sQ = memStorage(), Q = await supabaseBackend(cfg, { storage: sQ }), codeQ = Q.code();
  net.dropNew = 1;
  let f = null; try { await Q.newCode(); } catch (x) { f = x.code; }
  ok(f && Q.code() !== codeQ, 'the answer lost: the old (dead) code not shown', { f, shown: Q.code(), dead: codeQ });
  ok((await call(randomUUID(), 'save_claim', { code: codeQ })).error === 'bad_code', '(it is dead)');
  const Q2 = await supabaseBackend(cfg, { storage: sQ });
  ok(Q2.code() !== codeQ, 'nor after a reload', Q2.code());
  await refill();
  const nq = await Q2.newCode();
  ok(CODE_RE.test(nq) && Q2.code() === nq, 'a new code made from there is shown');
});

await T('New code lets go every other user; one user cannot spend another\'s writes', async () => {
  await refill();
  const sO = memStorage(), O = await supabaseBackend(cfg, { storage: sO }), uO = uidIn(sO);
  await O.put('hO', { data: JSON.stringify(hero('hO')), sum: 'a', played: 1 }, null);
  // the code seen: a thief takes it
  const thief = randomUUID();
  ok((await call(thief, 'save_claim', { code: O.code() })).player === O.player, 'the thief is tied');
  let n = 0;
  for (let i = 0; i < 25; i++) { const r = await call(thief, 'save_delete', { hero_id: 'junk' + i, at: 1, base_rev: null }); if (r.error === 'rate_limited') break; n++; }
  ok(n === 20, 'the thief spends its own 20 writes', n);
  const w = await O.put('hO', { data: JSON.stringify(hero('hO', { gold: 1 })), sum: 'b', played: 2 }, 1);
  ok(w.rev === 2, 'the owner still writes (its own bucket)', w);
  await refill();
  const nc = await O.newCode();
  ok(CODE_RE.test(nc), 'the owner makes a new code');
  ok((await call0(thief, 'save_list', { p_player: O.player })).error === 'moved', 'the thief is let go: no list', await call0(thief, 'save_list', { p_player: O.player }));
  ok((await call0(thief, 'save_new_code', { p_player: O.player })).error === 'moved', 'and cannot make a code of its own for the player');
  ok((await call0(thief, 'save_put', { p_player: O.player, hero_id: 'hO', data: JSON.stringify(hero('hO')), sum: 'x', played: 9, base_rev: 2 })).error === 'moved', 'nor write the owner\'s heroes');
  ok(await playerOf(uO) === O.player && (await O.list()).some((x) => x.id === 'hO'), 'the owner stays');
  const c = await supabaseBackend(cfg, { storage: memStorage(), claim: nc });
  ok(c.who === O.who, 'the new code works');
});

await T('backend: with the players cap reached, a kept code whose first claim failed still gets its player back', async () => {
  await refill();
  const sP = memStorage(), p = await supabaseBackend(cfg, { storage: sP }), P = p.player;
  sP.removeItem('skotos-save-auth');
  await admin('update skotos.save_quota set players_cap = players');
  try {
    net.blockClaim = 1;
    let e1 = null; try { await supabaseBackend(cfg, { storage: sP }); } catch (x) { e1 = x.code; }
    ok(e1 === 'offline', 'the first start: its claim never got there', e1);
    let b = null, e2 = null; try { b = await supabaseBackend(cfg, { storage: sP }); } catch (x) { e2 = x.code; }
    ok(b && b.player === P, 'the next start claims the kept code: its player (no player needed)', { e2, who: b?.who });
    let e3 = null; try { await supabaseBackend(cfg, { storage: memStorage() }); } catch (x) { e3 = x.code; }
    ok(e3 === 'quota', 'a browser with nothing kept: refused quota', e3);
  } finally { await admin('update skotos.save_quota set players_cap = 20000'); }
});

console.log(`test-saves: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
