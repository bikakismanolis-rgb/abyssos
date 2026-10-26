// node tools/net/test-migration.mjs: supabase/migrations/*_skotos_coop.sql on a Postgres of its own, in this process
// (PGlite, Postgres compiled to WebAssembly: nothing is connected to, no project is touched). Supabase's own parts are
// stood in for by a few lines each, as its docs give them: the roles (anon, authenticated), auth.uid() (the JWT's sub),
// realtime.messages with row level security, realtime.topic() and realtime.send() (a row in realtime.messages, its
// errors caught and only warned). Then the migration runs twice (it must change nothing the second time) and its rules
// are tried: what skotos.send refuses and what it writes (the server's '_by', whatever the page put in its data; the
// data as the page's own text, so what goes out is never more than twice what was checked, a number of 8 bytes no
// 131,072), the 4 KiB cap counted in bytes, the topics (the lobby, or a live game's), the rate (80 at once, 40 a
// second) and the bytes by role, the user's and the project's day (skotos.quota), the games (host, taken, renewed,
// ended, run out, one a user, none new past the day), the tables closed to pages, and Realtime's join check (a page may
// hear and track presence on 'skotos:' topics, never broadcast on one, whatever another app's policy allows). What this cannot show is Supabase itself:
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

// Supabase's parts, as small as they can be and still be what the migration meets: realtime.messages with its columns and
// indexes, realtime.send as Realtime's own (its migration 20260605120000: an 'id' added to the payload, the insert made
// as the caller, its errors only warned), realtime.topic() as Realtime's
const STUB = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
create schema realtime;
create table realtime.messages (
  topic text not null, extension text not null, payload jsonb, event text, private boolean default false,
  updated_at timestamp not null default now(), inserted_at timestamp not null default now(),
  id uuid not null default gen_random_uuid(), binary_payload bytea, skip_broadcast boolean not null default false,
  primary key (id, inserted_at));
create index messages_replay on realtime.messages (inserted_at desc, topic) where extension = 'broadcast' and private is true;
alter table realtime.messages enable row level security;
grant select, insert on realtime.messages to anon, authenticated;
create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '')::text $$;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language plpgsql as $$
declare generated_id uuid; final_payload jsonb;
begin
  begin
    generated_id := gen_random_uuid();
    if payload ? 'id' then final_payload := payload; else final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id)); end if;
    execute format('set local realtime.topic to %L', topic);
    insert into realtime.messages (id, payload, event, topic, private, extension) values (generated_id, final_payload, event, topic, private, 'broadcast');
  exception when others then
    raise warning 'WarnSendingBroadcastMessage: %', sqlerrm;
  end;
end $$;
grant usage on schema realtime to anon, authenticated;
-- (Realtime's own join check, as its migration 20261008120000 has it: a read probe per extension inserted as the
-- connection, then read back as the page's role; a write probe per extension inserted as the page's role; all rolled back)
create function realtime.authorize(role_name text, topic_name text, claims text, sub text, headers text,
  read_extensions text[], write_extensions text[], out read_allowed boolean[], out write_allowed boolean[])
language plpgsql volatile as $$
declare
  probe_ids uuid[]; probe_inserted_at timestamp := now() at time zone 'utc'; visible_ids uuid[]; ext text; allowed boolean;
begin
  perform set_config('synchronous_commit', 'off', true);
  begin
    probe_ids := array(select gen_random_uuid() from unnest(read_extensions));
    insert into realtime.messages (id, topic, extension, inserted_at, updated_at)
    select p.id, topic_name, p.extension, probe_inserted_at, probe_inserted_at from unnest(probe_ids, read_extensions) as p(id, extension);
    perform set_config('role', role_name, true), set_config('realtime.topic', topic_name, true),
            set_config('request.jwt.claims', claims, true), set_config('request.jwt.claim.sub', sub, true),
            set_config('request.jwt.claim.role', role_name, true), set_config('request.headers', headers, true);
    visible_ids := array(select m.id from realtime.messages m where m.inserted_at = probe_inserted_at and m.id = any(probe_ids));
    read_allowed := array(select p.id = any(visible_ids) from unnest(probe_ids) with ordinality as p(id, n) order by p.n);
    write_allowed := '{}';
    foreach ext in array write_extensions loop
      begin
        insert into realtime.messages (topic, extension, inserted_at, updated_at) values (topic_name, ext, now() at time zone 'utc', now() at time zone 'utc');
        allowed := true;
      exception when insufficient_privilege then
        allowed := false;
      end;
      write_allowed := write_allowed || allowed;
    end loop;
    raise sqlstate 'RTA01';
  exception when sqlstate 'RTA01' then
    null;
  end;
end $$;
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
ok(pols.length === 4 && pols.every((p) => p.policyname.startsWith('skotos:')), 'four policies on realtime.messages, all of them skotos\': ' + pols.map((p) => p.policyname + ' (' + p.cmd + ', ' + p.permissive + ')').join('; '));
const defs = (await db.query(`select p.proname, p.prosecdef, array_to_string(p.proconfig, ',') as cfg from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'skotos' order by 1`)).rows;
ok(defs.length === 4 && defs.every((d) => d.prosecdef && d.cfg === 'search_path=""'), 'four SECURITY DEFINER functions, each with its search_path pinned: ' + defs.map((d) => d.proname + ' ' + d.cfg).join(', '));
const unlogged = (await db.query(`select relpersistence from pg_class where oid = 'skotos.rates'::regclass`)).rows[0].relpersistence;
ok(unlogged === 'u', 'the rates table is unlogged');

// who may call
ok(/not_signed_in/.test(err(await send('', [['skotos:lobby', '_p', '{}']]))), 'a page not signed in (no user) is refused');
ok(/permission denied/.test(err(await as('', 'select skotos.send($1::jsonb)', ['[]'], { role: 'anon' }))), 'the public key alone (anon) cannot call it at all');
ok(/permission denied/.test(err(await as(A, 'select * from skotos.games'))) && /permission denied/.test(err(await as(A, 'select * from skotos.rates'))) && /permission denied/.test(err(await as(A, 'select * from skotos.quota'))), 'a signed-in page cannot read the tables');
ok(/permission denied/.test(err(await as(A, 'update skotos.quota set day_cap = 1e15'))), 'nor raise the project\'s cap');
ok(/permission denied/.test(err(await as(A, `insert into skotos.games values ('skotos-zz99', $1, now() + interval '9 hours')`, [A]))), 'nor write a games row of its own making');

// what it writes: the server's '_by', the page's data inside d, whatever it says of itself (a game's topic only while
// its game is live: A hosts skotos-ab12, made here as host_game would)
await db.query(`insert into skotos.games values ('skotos-ab12', $1, now() + interval '4 hours')`, [A]);
const n0 = await count();
const r1 = await send(A, [['skotos:skotos-ab12', 's', JSON.stringify({ k: 1, f: B, _by: B })]]);
const m1 = await last();
ok(r1[0]?.n === 1 && m1.topic === 'skotos:skotos-ab12' && m1.event === 's' && m1.private === true, 'a message goes to its private channel: ' + JSON.stringify(m1));
const d1 = typeof m1.payload.d === 'string' ? JSON.parse(m1.payload.d) : null;
ok(m1.payload._by === A && d1?._by === B && d1?.f === B && Object.keys(m1.payload).sort().join() === '_by,d,id', 'the sender is the caller, written by the server; a "_by" or "f" the page wrote stays inside its data, which goes as the page\'s own text (and realtime.send\'s own id beside them)');
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
ok(!err(await send(B, [['skotos:skotos-ab12', 's', str('x', 4094)]])), '4096 bytes go');
await bad([['skotos:skotos-ab12', 's', str('x', 4095)]], /too_big/, '4097 bytes do not');
ok(!err(await send(B, [['skotos:skotos-ab12', 's', str('α', 2047)]])), '4096 bytes of Greek go (2047 letters of two bytes each, and the quotes)');
await bad([['skotos:skotos-ab12', 's', str('α', 2048)]], /too_big/, '4098 bytes of Greek do not');
// what goes out is what was checked: a jsonb number would be written out digit by digit (8 bytes of 1e131071 as 131,072),
// the page's text is not. Realtime decodes and delivers the payload's text: at most about twice the data, escaped
const wire = async () => (await db.query('select octet_length(payload::text) as n from realtime.messages order by inserted_at desc, ctid desc limit 1')).rows[0].n;
const e15 = '{"g":1e131071}', e4k = '[' + Array.from({ length: 455 }, () => '1e131071').join(',') + ']', n4k = '[' + '\n'.repeat(4093) + '1]';
const w1 = !err(await send(B, [['skotos:lobby', '_p', e15]])) && (await wire()), w2 = !err(await send(B, [['skotos:skotos-ab12', 'f', e4k]])) && (await wire()), w3 = !err(await send(B, [['skotos:skotos-ab12', 'f', n4k]])) && (await wire());
ok(Buffer.byteLength(e4k) === 4096 && Buffer.byteLength(n4k) === 4096 && w1 > 0 && w1 < 200 && w2 > 0 && w2 <= 4300 && w3 > 0 && w3 <= 8400, 'a number with a long exponent goes as the page wrote it: ' + e15.length + ' bytes go out as ' + w1 + ', 4096 bytes of them as ' + w2 + ' (not 59 MB); 4096 bytes of newlines, the most escaping can make (twice), as ' + w3);
// the topics: the lobby, or a game's while its game is live
await bad([['skotos:junk', 'f', '1']], /no_game/, 'a topic with no game (a junk room)');
await db.query(`insert into skotos.games values ('skotos-old1', $1, now() - interval '1 second')`, [C]);
await bad([['skotos:skotos-old1', 'f', '1']], /no_game/, 'a game past its time');
await bad([['skotos:skotos-ab12', 'f', '1'], ['skotos:junk', 'f', '1']], /no_game/, 'one message to no game in a call: none of it');

// the rate: 80 at once, then 40 a second (time moved back by hand: now() is each call's own moment)
// (at once: in one transaction, where now() stands still; each call kept or refused on its own, by a savepoint)
const sixteen = JSON.stringify(Array.from({ length: 16 }, () => ['skotos:skotos-ab12', 'f', '1']));
await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${C}', true);`);
const burst = [];
for (let i = 0; i < 6; i++) {
  await db.exec('savepoint s');
  try { await db.query('select skotos.send($1::jsonb)', [i < 5 ? sixteen : '[["skotos:skotos-ab12","f","1"]]']); burst.push(''); await db.exec('release savepoint s'); } catch (e) { burst.push(e.message); await db.exec('rollback to savepoint s'); }
}
await db.exec('commit');
ok(burst.slice(0, 5).every((x) => !x), 'a new user may send 80 at once (five calls of sixteen)');
ok(/rate_limited/.test(burst[5]), 'the 81st, at once, is refused: rate_limited');
await db.query(`update skotos.rates set at = now() where uid = $1`, [C]);
await db.query(`update skotos.rates set at = at - interval '500 milliseconds' where uid = $1`, [C]);
const ones = (k) => Array.from({ length: k }, () => ['skotos:skotos-ab12', 'f', '1']);
ok(!err(await send(C, ones(16))), 'half a second later twenty more are there: sixteen go');
ok(/rate_limited/.test(err(await send(C, ones(16)))), 'sixteen more do not (four left), and nothing of them goes');
ok(!err(await send(C, ones(4))), 'the four left do');
await db.query(`update skotos.rates set at = at - interval '10 seconds' where uid = $1`, [C]);
await send(C, ones(1));
const tk = (await db.query('select tokens from skotos.rates where uid = $1', [C])).rows[0].tokens;
ok(tk === 79, 'an idle bucket fills to 80, no more: ' + tk + ' after one');
ok(!err(await send(A, [['skotos:lobby', 'f', '1']])), 'and one user\'s rate is not another\'s');
// the bytes, by role, each message its data's and 256: a game's host 256 KiB at once (64 KiB a second), any other on a
// game's topic 64 KiB at once (24 KiB a second), the lobby 8 KiB at once (512 bytes a second), each its own bucket
const D = '00000000-0000-4000-8000-00000000000e', x4 = str('x', 4094), four = (t, k) => Array.from({ length: k }, () => [t, 'f', x4]);
await db.query(`insert into skotos.games values ('skotos-by01', $1, now() + interval '4 hours')`, [D]);
const at0 = async (uid) => db.query(`update skotos.rates set at = now(), game_at = now(), lobby_at = now() where uid = $1`, [uid]);
await send(D, [['skotos:lobby', 'f', '1']]); await at0(D);
const hb16 = err(await send(D, four('skotos:skotos-by01', 16)));
ok(!hb16, 'the host of a game: sixteen messages of 4 KiB at once go (68 KiB), its game\'s bucket its own (a call to the lobby before it neither fills nor empties it): ' + (hb16 || 'sent'));
await db.query(`update skotos.rates set game = 65536, lobby = 8192, tokens = 80, at = now(), game_at = now(), lobby_at = now() where uid = $1`, [B]);
ok(/rate_limited/.test(err(await send(B, four('skotos:skotos-ab12', 16)))) && !err(await send(B, four('skotos:skotos-ab12', 15))), 'a guest: sixteen of them at once do not (past 64 KiB), fifteen do');
ok(!err(await send(B, four('skotos:lobby', 1))) && /rate_limited/.test(err(await send(B, four('skotos:lobby', 1)))), 'the lobby has its own: one of 4 KiB goes, another at once does not (8 KiB at once)');

// the day: the user's own (user_cap) and the project's (day_cap), counted as the buckets count; the project's told by
// each user's row in steps of 64 KiB
const Q = async () => (await db.query('select day, bytes::float8 as bytes, day_cap::float8 as day_cap, user_cap::float8 as user_cap from skotos.quota')).rows[0];
const q1 = await Q(), spentD = (await db.query('select spent::float8 as s, held::float8 as h from skotos.rates where uid = $1', [D])).rows[0];
ok(q1.day_cap === 40 * 1048576 && q1.user_cap === 40 * 1048576, 'the caps as made: 40 MiB a day for the project, and for a user');
ok(spentD.s === 1 + 256 + 16 * 4352 && q1.bytes >= 16 * 4352 && spentD.h < 65536, 'a user\'s day counts each message (its data and 256); past 64 KiB it is told to the project\'s: ' + spentD.s + ' spent, ' + q1.bytes + ' told');
await db.query(`update skotos.quota set user_cap = $1`, [spentD.s + 300]);
await at0(D);
ok(!err(await send(D, [['skotos:skotos-by01', 'f', '1']])) && /quota/.test(err(await send(D, [['skotos:skotos-by01', 'f', '1']]))) && !err(await send(A, [['skotos:lobby', 'f', '1']])), 'a user past its own day is refused quota (another is not)');
await db.query(`update skotos.quota set user_cap = day_cap`);
const tq = await Q();
await db.query(`update skotos.quota set day_cap = $1`, [tq.bytes]);
const qs = err(await send(A, [['skotos:lobby', 'f', '1']])), qh = (await as(C, 'select skotos.host_game($1) as r', ['skotos-qu01']))[0]?.r;
await db.query(`update skotos.quota set day = day - 1`);
const qy = err(await send(A, [['skotos:lobby', 'f', '1']]));
await db.query(`update skotos.quota set day = $1, day_cap = $2`, [tq.day, 40 * 1048576]);
ok(/quota/.test(qs) && qh === 'quota' && !qy, 'the project\'s day spent: every send refused quota, and no new game made; a count of another day is no count of today\'s');

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
const rows = async (uid) => (await db.query('select name from skotos.games where host = $1 order by name', [uid])).rows.map((r) => r.name).join();
for (const r of ['skotos-c001', 'skotos-c002', 'skotos-c003']) await host(C, r);
ok((await rows(C)) === 'skotos-c003' && (await host(C, 'skotos-c003')) === 'ok' && (await rows(C)) === 'skotos-c003', 'a user hosts one game: each new one lets its others go (reloads while hosting leave nothing in the way), and a renewal keeps it');
ok((await rows(D)) === 'skotos-by01', 'and another user\'s are not touched');

// Realtime's join check, its own function: what a page joining a private channel may read and write there
const EXT = "array['broadcast', 'presence']";
const join = async (role, topic, uid) => (await db.query(`select read_allowed::text as r, write_allowed::text as w from realtime.authorize($1, $2, $3, $4, '{}', ${EXT}, ${EXT})`, [role, topic, JSON.stringify(uid ? { sub: uid, role } : { role }), uid || ''])).rows[0];
const j1 = await join('authenticated', 'skotos:skotos-ab12', A), j2 = await join('anon', 'skotos:lobby', ''), j3 = await join('authenticated', 'room-1', A);
ok(j1.r === '{t,t}' && j1.w === '{f,t}', 'Realtime\'s check: a signed-in page joining a skotos topic hears broadcasts and presence, tracks its presence, broadcasts nothing: read ' + j1.r + ', write ' + j1.w);
ok(j2.r === '{f,f}' && j2.w === '{f,f}', 'the public key alone: nothing (so no join): ' + j2.r + ' ' + j2.w);
ok(j3.r === '{f,f}' && j3.w === '{f,f}', 'another topic: these policies give nothing: ' + j3.r + ' ' + j3.w);
ok((await db.query("select count(*)::int as n from realtime.messages where topic in ('skotos:skotos-ab12', 'skotos:lobby', 'room-1') and payload is null")).rows[0].n === 0, 'and its probes leave no row');
// (and as a statement of the page's own, a read and a write)
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
const j4 = await join('authenticated', 'skotos:skotos-ab12', A), j5 = await join('anon', 'skotos:lobby', '');
const j6 = await join('anon', 'room-1', '');
ok(j4.w === '{f,t}' && j5.r === '{f,f}' && j5.w === '{f,f}' && j6.r === '{t,t}' && j6.w === '{t,t}', 'and Realtime\'s check still gives a skotos topic no broadcast from a page, and nothing to the public key alone (which that app\'s own topic gives everything): ' + [j4.w, j5.r, j5.w, j6.r, j6.w].join(' '));
ok(/row-level security/.test(err(await tryWrite(A, 'skotos:skotos-ab12', 'broadcast'))) && /row-level security/.test(err(await tryWrite('', 'skotos:lobby', 'broadcast', 'anon'))), 'and a skotos topic still takes none from a page, signed in or not');
// (and the topic Realtime checks, not only the row: a write named for another topic while joining a skotos one)
ok(/row-level security/.test(err(await as(A, 'insert into realtime.messages (topic, extension, payload, event, private) values ($1, \'broadcast\', \'{}\', \'x\', true)', ['room-1'], { topic: 'skotos:lobby' }))), 'joining a skotos topic, no broadcast write passes under another name');

// the definer: on Supabase the functions' owner is postgres, no superuser but one that passes row level security
// (docs: a security definer function made by postgres has bypassrls). As such an owner the sends still go; as one
// without it realtime.send could not write, and would only warn (a send lost, not refused): what to check on a project
await db.exec(`create role owner_rls nosuperuser bypassrls; create role owner_plain nosuperuser nobypassrls;`);
for (const r of ['owner_rls', 'owner_plain']) await db.exec(`grant usage on schema auth, realtime to ${r}; grant insert, select on realtime.messages to ${r}; grant usage, create on schema skotos to ${r};`);
const own = async (r) => { for (const f of ['send(jsonb)', 'host_game(text)', 'game_host(text)', 'end_game(text)']) await db.exec(`alter function skotos.${f} owner to ${r}`); await db.exec(`alter table skotos.games owner to ${r}; alter table skotos.rates owner to ${r}; alter table skotos.quota owner to ${r};`); };
await own('owner_rls');
let c0 = await count();
ok(!err(await send(A, [['skotos:lobby', 'f', '7']])) && (await count()) === c0 + 1, 'owned by a role with bypassrls (as postgres on Supabase), a send is written');
await own('owner_plain');
c0 = await count();
const lost = await send(A, [['skotos:lobby', 'f', '8']]);
ok(!err(lost) && (await count()) === c0, 'owned by one without it, realtime.send cannot write and says nothing: the send is lost (so a project must be checked: supabase.md)');

// what a party leaves in realtime.messages (Realtime keeps the rows three days): ten seconds of a party of four at the
// game's rates (docs/coop/README.md, Byte budget), the host's snapshots shaped as the game's (its hero, the guests' acks
// by their ids, a few reliable events and fx, two dozen monsters), each guest's presence and fx, sent through skotos.send.
// Counted: the table, its indexes and its TOAST, as Postgres stores them here (not a Supabase project's own numbers)
await own('owner_rls');
const R = (n) => Math.round(Math.random() * n), G3 = [B, C, '00000000-0000-4000-8000-00000000000d'];
const snapOf = () => ({ k: 'oldforest:1234:8', t: R(1e7), h: [R(4000), R(4000), R(628), R(90), R(900), 900, R(7), R(40), R(30), R(1023), 100],
  ak: Object.fromEntries(G3.map((g) => [g, R(500)])), r: { [B]: [[R(900), 'k', R(300), R(400), R(90)], [R(900), 'h', R(300), R(60), 0, 0]] },
  f: Array.from({ length: 6 }, () => ['spark', R(4000), R(4000), R(30), R(9)]),
  a: Array.from({ length: 24 }, () => [R(400), 'wolf', R(4000), R(4000), R(628), R(255), R(64), R(20), R(9), R(90), R(40), R(30), R(150), R(900)]) });
const presOf = () => ({ h: [R(4000), R(4000), R(628), R(90), R(900), 900, R(7), R(40)], c2: ['run', 120, R(99)], hb: R(9999), ak: R(900), lk: { c: 'mage', l: 24, w: 'staff', r: 2, o: null }, zk: 'oldforest:1234:8' });
const size = async () => (await db.query(`select pg_total_relation_size('realtime.messages')::float8 as b`)).rows[0].b;
const s0 = await size(); let jb = 0, nm = 0;
await db.query(`insert into skotos.games values ('skotos-st01', $1, now() + interval '4 hours')`, [A]);
const say = async (uid, ev, d) => { const t = JSON.stringify(d); jb += Buffer.byteLength(t) + 256; nm++; await db.query('update skotos.rates set tokens = 80, game = 262144'); const r = await send(uid, [['skotos:skotos-st01', ev, t]]); if (err(r)) throw new Error(err(r)); };
for (let sec = 0; sec < 10; sec++) {
  for (let i = 0; i < 10; i++) await say(A, 's', snapOf());
  for (const g of G3) for (let i = 0; i < 9; i++) await say(g, i === 8 ? 'f' : '_p', i === 8 ? [['bolt', R(4000), R(4000), R(4000), R(4000), 2]] : presOf());
}
const per = ((await size()) - s0) / 10;
ok(per > 0, 'a party of four, ' + nm / 10 + ' messages a second (' + (jb / 10240).toFixed(1) + ' KB a second as the caps count it, its JSON and 256 a message): ' + (per / 1024).toFixed(1) + ' KB a second stored, ' + (per / (jb / 10)).toFixed(2) + '× what was counted, about ' + Math.round(per * 3600 / 1048576) + ' MB an hour of play');
// and the most a counted byte can take: messages that do not compress, the smallest and the largest
const worst = async (k, mk) => { const s1 = await size(); let c = 0; for (let i = 0; i < k; i++) { const t = mk(); c += Buffer.byteLength(t) + 256; await db.query('update skotos.rates set tokens = 80, game = 262144'); if (err(await send(A, [['skotos:skotos-st01', 'f', t]]))) throw new Error('refused'); } return ((await size()) - s1) / c; };
const { randomBytes } = await import('node:crypto');
const wTiny = await worst(400, () => '1'), wBig = await worst(120, () => JSON.stringify(randomBytes(3060).toString('base64').slice(0, 4094)));
ok(wTiny < 1.5 && wBig < 1.5, 'stored, at most about 1.45 times what was counted: ' + wTiny.toFixed(2) + ' for the smallest message, ' + wBig.toFixed(2) + ' for 4 KiB that does not compress (so a day at the cap, kept four days and the hours before Realtime drops the oldest, is about 6 times the cap at most)');

console.log(fails ? fails + ' FAILED' : 'all passed');
await db.close();
process.exit(fails ? 1 : 0);
