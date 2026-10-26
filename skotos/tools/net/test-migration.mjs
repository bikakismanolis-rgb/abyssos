// node tools/net/test-migration.mjs: supabase/migrations/*_skotos_coop.sql on a Postgres of its own, in this process
// (PGlite, Postgres compiled to WebAssembly: nothing is connected to, no project is touched). Supabase's own parts are
// stood in for by a few lines each, as its docs give them: the roles (anon, authenticated), auth.uid() (the JWT's sub),
// realtime.messages with row level security, realtime.topic() and realtime.send() (a row in realtime.messages, its
// errors caught and only warned). Then the migration runs twice (it must change nothing the second time) and its rules
// are tried: what skotos.send refuses and what it writes (the server's '_by', whatever the page put in its data), the
// 4 KiB cap counted in bytes, the rate (80 at once, 40 a second), the games (host, taken, renewed, ended, run out, four
// at most), the tables closed to pages, and Realtime's join check (a page may hear and track presence on 'skotos:'
// topics, never broadcast on one, whatever another app's policy allows). What this cannot show is Supabase itself:
// its postgres role, PostgREST, Realtime's delivery (docs/coop/supabase.md, what is not verified).
// PGlite is not one of the game's packages: npm i --no-save @electric-sql/pglite@0.5.8 first, or PGLITE=<its
// dist/index.js> to take one from elsewhere.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const mig = readdirSync(root + 'supabase/migrations').filter((f) => f.endsWith('_skotos_coop.sql'));
const SQL = readFileSync(root + 'supabase/migrations/' + mig[0], 'utf8');
let PGlite;
try { ({ PGlite } = await import(process.env.PGLITE ? pathToFileURL(process.env.PGLITE).href : '@electric-sql/pglite')); } catch (e) {
  console.log('no PGlite: npm i --no-save @electric-sql/pglite@0.5.8 (or PGLITE=<path to its dist/index.js>)'); process.exit(2);
}

// Supabase's parts, as small as they can be and still be what the migration meets
const STUB = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
create schema realtime;
create table realtime.messages (
  topic text not null, extension text not null, payload jsonb, event text, private boolean default false,
  updated_at timestamp not null default now(), inserted_at timestamp not null default now(),
  id uuid not null default gen_random_uuid(), primary key (id, inserted_at));
alter table realtime.messages enable row level security;
grant select, insert on realtime.messages to anon, authenticated;
create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '')::text $$;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language plpgsql as $$
begin
  begin
    execute format('set local realtime.topic to %L', topic);
    insert into realtime.messages (payload, event, topic, private, extension) values (payload, event, topic, private, 'broadcast');
  exception when others then
    raise warning 'ErrorSendingBroadcastMessage: %', sqlerrm;
  end;
end $$;
grant usage on schema realtime to anon, authenticated;
`;

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const db = new PGlite();
await db.exec(STUB);
const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b', C = '00000000-0000-4000-8000-00000000000c';
// one statement as a page: its role, its user (none: ''), and the topic Realtime is checking (realtime.topic())
async function as(uid, sql, params = [], o = {}) {
  await db.exec(`begin; set local role ${o.role || 'authenticated'}; select set_config('request.jwt.claim.sub', '${uid}', true); select set_config('realtime.topic', '${o.topic || ''}', true);`);
  try { const r = await db.query(sql, params); await db.exec('commit'); return r.rows; } catch (e) { await db.exec('rollback'); return { error: e.message }; }
}
const send = (uid, msgs) => as(uid, 'select skotos.send($1::jsonb) as n', [JSON.stringify(msgs)]);
const err = (r) => (r && r.error) || '';
const last = async () => (await db.query('select topic, event, private, payload from realtime.messages order by inserted_at desc, ctid desc limit 1')).rows[0];
const count = async () => (await db.query('select count(*)::int as n from realtime.messages')).rows[0].n;

// the migration, twice
let e1 = null, e2 = null;
try { await db.exec(SQL); } catch (e) { e1 = e.message; }
try { await db.exec(SQL); } catch (e) { e2 = e.message; }
ok(!e1, 'the migration runs: ' + (e1 || 'no error'));
ok(!e2, 'and runs again, idempotent: ' + (e2 || 'no error'));
const pols = (await db.query(`select policyname, permissive, cmd, roles::text from pg_policies where schemaname = 'realtime' and tablename = 'messages' order by policyname`)).rows;
ok(pols.length === 3 && pols.every((p) => p.policyname.startsWith('skotos:')), 'three policies on realtime.messages, all of them skotos\': ' + pols.map((p) => p.policyname + ' (' + p.cmd + ', ' + p.permissive + ')').join('; '));
const defs = (await db.query(`select p.proname, p.prosecdef, array_to_string(p.proconfig, ',') as cfg from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'skotos' order by 1`)).rows;
ok(defs.length === 4 && defs.every((d) => d.prosecdef && d.cfg === 'search_path=""'), 'four SECURITY DEFINER functions, each with its search_path pinned: ' + defs.map((d) => d.proname + ' ' + d.cfg).join(', '));
const unlogged = (await db.query(`select relpersistence from pg_class where oid = 'skotos.rates'::regclass`)).rows[0].relpersistence;
ok(unlogged === 'u', 'the rates table is unlogged');

// who may call
ok(/not_signed_in/.test(err(await send('', [['skotos:lobby', '_p', '{}']]))), 'a page not signed in (no user) is refused');
ok(/permission denied/.test(err(await as('', 'select skotos.send($1::jsonb)', ['[]'], { role: 'anon' }))), 'the public key alone (anon) cannot call it at all');
ok(/permission denied/.test(err(await as(A, 'select * from skotos.games'))) && /permission denied/.test(err(await as(A, 'select * from skotos.rates'))), 'a signed-in page cannot read the tables');
ok(/permission denied/.test(err(await as(A, `insert into skotos.games values ('skotos-zz99', $1, now() + interval '9 hours')`, [A]))), 'nor write a games row of its own making');

// what it writes: the server's '_by', the page's data inside d, whatever it says of itself
const n0 = await count();
const r1 = await send(A, [['skotos:skotos-ab12', 's', JSON.stringify({ k: 1, f: B, _by: B })]]);
const m1 = await last();
ok(r1[0]?.n === 1 && m1.topic === 'skotos:skotos-ab12' && m1.event === 's' && m1.private === true, 'a message goes to its private channel: ' + JSON.stringify(m1));
ok(m1.payload._by === A && m1.payload.d._by === B && m1.payload.d.f === B && Object.keys(m1.payload).sort().join() === '_by,d', 'the sender is the caller, written by the server; a "_by" or "f" the page wrote stays inside its data');
const r2 = await send(A, [['skotos:lobby', '_p', '{"g":{"c":"ab12"}}'], ['skotos:skotos-ab12', 'f', '[[1,2,3]]'], ['skotos:skotos-ab12', 'c', '{"op":"end"}']]);
const three = (await db.query('select event from realtime.messages order by inserted_at, ctid')).rows.slice(-3).map((r) => r.event).join();
ok(r2[0]?.n === 3 && three === '_p,f,c' && (await count()) === n0 + 4, 'a call of three goes as three, in order: ' + three);

// what it refuses: nothing of a call goes when any of it is wrong
const bad = async (msgs, re, what) => { const c0 = await count(), r = await send(B, msgs); ok(re.test(err(r)) && (await count()) === c0, what + ': ' + (err(r).split('\n')[0] || 'sent')); };
await bad([['other:room', 's', '{}']], /invalid_argument/, 'a topic without the skotos: prefix');
await bad([['skotos:' + 'a'.repeat(49), 's', '{}']], /invalid_argument/, 'a topic name too long');
await bad([['skotos:lobby', 'S', '{}']], /invalid_argument/, 'an event the game has no name for');
await bad([['skotos:lobby', 's', { x: 1 }]], /invalid_argument/, 'data not given as its JSON text');
await bad([['skotos:lobby', 's', '{']], /invalid input syntax for type json/, 'data that is not JSON');
await bad([['skotos:lobby', 's', '{}'], ['other:x', 's', '{}']], /invalid_argument/, 'one bad message in a call: none of it');
await bad(Array.from({ length: 17 }, () => ['skotos:lobby', 'f', '1']), /invalid_argument/, 'seventeen in one call');
await bad([], /invalid_argument/, 'an empty call');
// the cap, in bytes as the page counts them (UTF-8 of its JSON text)
const str = (ch, n) => JSON.stringify(ch.repeat(n));
ok(!err(await send(B, [['skotos:lobby', 's', str('x', 4094)]])), '4096 bytes go');
await bad([['skotos:lobby', 's', str('x', 4095)]], /too_big/, '4097 bytes do not');
ok(!err(await send(B, [['skotos:lobby', 's', str('α', 2047)]])), '4096 bytes of Greek go (2047 letters of two bytes each, and the quotes)');
await bad([['skotos:lobby', 's', str('α', 2048)]], /too_big/, '4098 bytes of Greek do not');

// the rate: 80 at once, then 40 a second (time moved back by hand: now() is each call's own moment)
// (at once: in one transaction, where now() stands still; each call kept or refused on its own, by a savepoint)
const sixteen = JSON.stringify(Array.from({ length: 16 }, () => ['skotos:lobby', 'f', '1']));
await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${C}', true);`);
const burst = [];
for (let i = 0; i < 6; i++) {
  await db.exec('savepoint s');
  try { await db.query('select skotos.send($1::jsonb)', [i < 5 ? sixteen : '[["skotos:lobby","f","1"]]']); burst.push(''); await db.exec('release savepoint s'); } catch (e) { burst.push(e.message); await db.exec('rollback to savepoint s'); }
}
await db.exec('commit');
ok(burst.slice(0, 5).every((x) => !x), 'a new user may send 80 at once (five calls of sixteen)');
ok(/rate_limited/.test(burst[5]), 'the 81st, at once, is refused: rate_limited');
await db.query(`update skotos.rates set at = now() where uid = $1`, [C]);
await db.query(`update skotos.rates set at = at - interval '500 milliseconds' where uid = $1`, [C]);
ok(!err(await send(C, Array.from({ length: 16 }, () => ['skotos:lobby', 'f', '1']))), 'half a second later twenty more are there: sixteen go');
ok(/rate_limited/.test(err(await send(C, Array.from({ length: 16 }, () => ['skotos:lobby', 'f', '1'])))), 'sixteen more do not (four left), and nothing of them goes');
ok(!err(await send(C, Array.from({ length: 4 }, () => ['skotos:lobby', 'f', '1']))), 'the four left do');
await db.query(`update skotos.rates set at = at - interval '10 seconds' where uid = $1`, [C]);
await send(C, [['skotos:lobby', 'f', '1']]);
const tk = (await db.query('select tokens from skotos.rates where uid = $1', [C])).rows[0].tokens;
ok(tk === 79, 'an idle bucket fills to 80, no more: ' + tk + ' after one');
ok(!err(await send(A, [['skotos:lobby', 'f', '1']])), 'and one user\'s rate is not another\'s');

// who hosts: the games row, by its host alone
const host = (uid, room) => as(uid, 'select skotos.host_game($1) as r', [room]).then((r) => r.error || r[0].r);
const hostOf = (uid, room) => as(uid, 'select skotos.game_host($1) as h', [room]).then((r) => r.error || r[0].h);
const endG = (uid, room) => as(uid, 'select skotos.end_game($1)', [room]);
ok((await host(A, 'skotos-ab12')) === 'ok' && (await hostOf(B, 'skotos-ab12')) === A, 'a host makes its game; a guest asks and is told the host');
ok((await host(B, 'skotos-ab12')) === 'taken' && (await hostOf(B, 'skotos-ab12')) === A, 'another cannot host it: taken, and the host is still the host');
ok((await hostOf(B, 'skotos-zz99')) === null, 'a room with no game: no host');
ok(/not_signed_in/.test(await host('', 'skotos-ab12')) && (await hostOf('', 'skotos-ab12')) === null, 'not signed in: no hosting, no answer');
ok(/invalid_argument/.test(await host(A, 'Skotos AB')), 'a room name the page could not have made');
const exp0 = (await db.query(`select expires_at from skotos.games where name = 'skotos-ab12'`)).rows[0].expires_at;
await db.query(`update skotos.games set expires_at = expires_at - interval '3 hours' where name = 'skotos-ab12'`);
ok((await host(A, 'skotos-ab12')) === 'ok' && (await db.query(`select expires_at from skotos.games where name = 'skotos-ab12'`)).rows[0].expires_at >= exp0, 'its host renews it (four hours more)');
await endG(B, 'skotos-ab12');
ok((await hostOf(C, 'skotos-ab12')) === A, 'another cannot end it');
await endG(A, 'skotos-ab12');
ok((await hostOf(C, 'skotos-ab12')) === null && (await host(B, 'skotos-ab12')) === 'ok' && (await hostOf(C, 'skotos-ab12')) === B, 'ended by its host, the room is free, and a new game there is its new host\'s');
await db.query(`update skotos.games set expires_at = now() - interval '1 second' where name = 'skotos-ab12'`);
ok((await hostOf(C, 'skotos-ab12')) === null, 'a game past its time has no host');
ok((await host(C, 'skotos-cd34')) === 'ok' && (await db.query(`select count(*)::int as n from skotos.games where name = 'skotos-ab12'`)).rows[0].n === 0, 'and the next host_game lets it go');
for (const r of ['skotos-c001', 'skotos-c002', 'skotos-c003']) await host(C, r);
ok((await host(C, 'skotos-c004')) === 'too_many' && (await host(C, 'skotos-cd34')) === 'ok', 'four live games a user at most (a renewal of one of them still goes)');

// Realtime's join check: what a page may do on a channel, as Realtime tries it (a read and a write, as the page)
const tryWrite = (uid, topic, ext, role) => as(uid, 'insert into realtime.messages (topic, extension, payload, event, private) values ($1, $2, \'{}\', \'x\', true) returning 1 as ok', [topic, ext], { topic, role });
const tryRead = (uid, topic, role) => as(uid, 'select count(*)::int as n from realtime.messages', [], { topic, role });
ok(/row-level security/.test(err(await tryWrite(A, 'skotos:skotos-ab12', 'broadcast'))), 'a signed-in page may not broadcast on a skotos topic itself');
ok(!err(await tryWrite(A, 'skotos:skotos-ab12', 'presence')), 'it may track its presence there');
ok(((await tryRead(A, 'skotos:lobby'))[0]?.n || 0) > 0, 'and hear what is sent there');
ok(/row-level security/.test(err(await tryWrite('', 'skotos:lobby', 'presence', 'anon'))) && ((await tryRead('', 'skotos:lobby', 'anon'))[0]?.n ?? 0) === 0, 'the public key alone may do neither');
ok(((await tryRead(A, 'room-1'))[0]?.n ?? 0) === 0 && /row-level security/.test(err(await tryWrite(A, 'room-1', 'broadcast'))), 'another topic is not given by these policies');
// another app on the project allows every broadcast to everyone (a permissive policy of its own): skotos's topics stay closed
await db.exec(`create policy "another app: anything" on realtime.messages for insert to anon, authenticated with check (true); create policy "another app: read" on realtime.messages for select to anon, authenticated using (true);`);
ok(!err(await tryWrite(A, 'room-1', 'broadcast')), 'with another app\'s open policy, its own topic takes broadcasts');
ok(/row-level security/.test(err(await tryWrite(A, 'skotos:skotos-ab12', 'broadcast'))) && /row-level security/.test(err(await tryWrite('', 'skotos:lobby', 'broadcast', 'anon'))), 'and a skotos topic still takes none from a page, signed in or not');
// (and the topic Realtime checks, not only the row: a write named for another topic while joining a skotos one)
ok(/row-level security/.test(err(await as(A, 'insert into realtime.messages (topic, extension, payload, event, private) values ($1, \'broadcast\', \'{}\', \'x\', true)', ['room-1'], { topic: 'skotos:lobby' }))), 'joining a skotos topic, no broadcast write passes under another name');

// the definer: on Supabase the functions' owner is postgres, no superuser but one that passes row level security
// (docs: a security definer function made by postgres has bypassrls). As such an owner the sends still go; as one
// without it realtime.send could not write, and would only warn (a send lost, not refused): what to check on a project
await db.exec(`create role owner_rls nosuperuser bypassrls; create role owner_plain nosuperuser nobypassrls;`);
for (const r of ['owner_rls', 'owner_plain']) await db.exec(`grant usage on schema auth, realtime to ${r}; grant insert, select on realtime.messages to ${r}; grant usage, create on schema skotos to ${r};`);
const own = async (r) => { for (const f of ['send(jsonb)', 'host_game(text)', 'game_host(text)', 'end_game(text)']) await db.exec(`alter function skotos.${f} owner to ${r}`); await db.exec(`alter table skotos.games owner to ${r}; alter table skotos.rates owner to ${r};`); };
await own('owner_rls');
let c0 = await count();
ok(!err(await send(A, [['skotos:lobby', 'f', '7']])) && (await count()) === c0 + 1, 'owned by a role with bypassrls (as postgres on Supabase), a send is written');
await own('owner_plain');
c0 = await count();
const lost = await send(A, [['skotos:lobby', 'f', '8']]);
ok(!err(lost) && (await count()) === c0, 'owned by one without it, realtime.send cannot write and says nothing: the send is lost (so a project must be checked: supabase.md)');

console.log(fails ? fails + ' FAILED' : 'all passed');
await db.close();
process.exit(fails ? 1 : 0);
