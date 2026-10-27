// node tools/cloud/test-saves.mjs: supabase/migrations/*_skotos_saves.sql on a Postgres of its own in this process
// (PGlite: nothing is connected to, no project touched), with Supabase's parts stood in for (the roles anon and
// authenticated, auth.uid() from the JWT's sub). First the functions' rules called directly: closed tables, the caller's
// own rows only, rev and 'conflict', the caps (size, heroes, rate, the project's bytes and players), codes (made,
// claimed, normalized, renewed, tries limited), tombstones. Then src/net/cloudsb.js over a fake supabase-js client whose
// RPCs run here as the signed-in user, with game/cloudsync.js: two devices joined by a code, a session lost and found
// again by its kept code. PGlite: npm i --no-save @electric-sql/pglite@0.5.8 (or PGLITE=<its dist/index.js>).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { supabaseBackend, normCode, CODE_RE } from '../../src/net/cloudsb.js';
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
const call = (uid, fn, args = {}) => { const k = Object.keys(args); return as(uid, `select skotos.${fn}(${k.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`, k.map((n) => args[n])); };
const put = (uid, id, o = {}) => call(uid, 'save_put', { hero_id: id, data: o.data ?? JSON.stringify(hero(id, o.h)), sum: o.sum ?? 's' + id, played: o.played ?? 1000, base_rev: o.rev ?? null });
const admin = async (sql, vals) => (await pg.query(sql, vals)).rows;
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
  ok((await call(U2, 'save_list')).error === 'no_player', 'a user with no player: no_player');
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
  for (let i = 0; i < 36; i++) await admin('update skotos.save_players set tokens = 20');
  for (let i = 0; i < 36; i++) { await admin('update skotos.save_players set tokens = 20'); await call(U3, 'save_hello'); await call(U3, 'save_delete', { hero_id: 't' + i, at: 1000 + i, base_rev: null }); }
  const [n] = await admin('select count(*)::int as n, min(s.at)::int as lo from skotos.saves s join skotos.save_users u on u.player = s.player where u.uid = $1', [U3]);
  ok(n.n === 32 && n.lo === 1004, 'the newest 32 tombstones kept', n);
  ok(await quotaOk(), 'count matches after pruning');
});

await T('caps', async () => {
  const U = randomUUID(); await call(U, 'save_hello');
  const fill = async () => admin('update skotos.save_players set tokens = 20');
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
  await admin('update skotos.save_quota set bytes_cap = bytes + 100');
  ok((await put(U, 'k2', { rev: 1, h: { gold: 1, flags: { pad: 'y'.repeat(4000) } } })).error === 'quota', 'past the project\'s bytes: quota');
  ok((await put(U, 'k2', { rev: 1, data: '{"id":"k2"}' })).rev === 2, 'a write that shrinks is let through');
  await admin('update skotos.save_quota set bytes_cap = 67108864');
  // the project's players
  await admin('update skotos.save_quota set players_cap = players');
  ok((await call(randomUUID(), 'save_hello')).error === 'quota', 'past the players cap: quota');
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
  // a new code: the old stops working, the users tied stay
  const nc = await call(U1, 'save_new_code');
  ok(CODE_RE.test(nc.code) && nc.code !== code1, 'a new code', nc);
  ok((await call(randomUUID(), 'save_claim', { code: code1 })).error === 'bad_code', 'the old code no longer works');
  ok((await call(B, 'save_list')).length > 0, 'B stays tied');
  const C = randomUUID();
  ok((await call(C, 'save_claim', { code: nc.code })).player === me.player, 'the new one works');
  code1 = nc.code;
});

// ---------- the backend and the sync over a fake supabase-js client whose RPCs run here ----------
function memStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; }
const net = { offline: false, signIns: 0 };
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
          const r = await call(read()?.user?.id, fn, args);
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
  await admin('update skotos.save_players set tokens = 20');
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
  const nc = await a.B.newCode();
  ok(CODE_RE.test(nc) && a.B.code() === nc, 'a new code kept and shown');
});
function showish(c) { return c.toLowerCase().match(/.{1,4}/g).join(' - '); }

console.log(`test-saves: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
