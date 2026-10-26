-- Skotos co-op on a Supabase project: the server, not the page, says who sent each message (docs/coop/supabase.md,
-- docs/coop/release.md step 5).
--
-- Realtime does not say who sent a broadcast: a client's own broadcast carries whatever sender it writes in it, so a
-- page with the project's public key and a game's code (the lobby lists them) could speak as the host to every guest.
-- So here no page broadcasts on a 'skotos:' topic at all. A page signs in (anonymously: the project's Auth must allow
-- anonymous sign-ins), joins the game's channels as private channels to hear them, and says everything through
-- skotos.send, a SECURITY DEFINER function it calls by RPC. That function checks the caller, the topic (the lobby, or a
-- live game's), the size, the caller's rate in messages and in bytes, and what the caller and the project may send in a
-- day, and broadcasts the message with realtime.send, the caller's user id written beside it ('_by') by the server. The
-- page takes a sender from '_by' and from nothing else. Who hosts a game is a row in skotos.games that the host made
-- through skotos.host_game, never anyone's presence.
--
-- A visitor costs nothing to make (an anonymous user a tab), and every message stays a row of realtime.messages for
-- three to four days, which this file may not delete. So what the game's pages may send in a day, all of them
-- together, is held under a cap the owner sets for the project's plan (skotos.quota): past it sends are refused, and the
-- database never fills for it.
--
-- Everything is in the schema 'skotos': the project may hold another app, and no other schema's tables are made,
-- changed or read here. On realtime.messages (Realtime's own table, which every app on the project shares) there are
-- only policies, and each of them is about topics that begin with 'skotos:'.
--
-- Run it again and it leaves the same state: schemas, tables, columns and indexes only if they are not there (the
-- caps the owner set kept), functions replaced, policies dropped and made again.
--
-- The project must also expose the schema 'skotos' to the Data API (Project Settings, Data API, Exposed schemas: add
-- 'skotos' beside what is there), or the RPCs are not found. Only the four functions below are open to signed-in pages;
-- the three tables are not open to anyone. (The Security Advisor warns of definer functions a signed-in user can call
-- through the API: these four are meant to be, and each checks its caller itself.)

create schema if not exists skotos;

-- (signed-in pages only: an anonymous user is 'authenticated' too; the public key alone, with no session, is 'anon')
grant usage on schema skotos to authenticated;
revoke all on schema skotos from public, anon;

-- ---------- the games ----------
-- One row a game, made by its host through skotos.host_game. Its name is the game's room as the page calls it
-- ('skotos-<code>'), so the page needs no other key. A row lasts four hours from when it was made or last renewed (the
-- host's page renews it every half hour while the game is open, and ends it when the host leaves); one past its time is
-- no game, and the next host_game anywhere lets it go.
create table if not exists skotos.games (
  name text primary key check (name ~ '^[a-z0-9][a-z0-9_.-]{0,47}$'),
  host uuid not null,
  expires_at timestamptz not null
);
create index if not exists games_host on skotos.games (host);
create index if not exists games_expires_at on skotos.games (expires_at);

-- ---------- what a user may spend ----------
-- Each user's sends, as token buckets, and what it has sent today. A message costs one token of 40 a second, 80 at once
-- (the artifact room's own budget, which the page holds itself under at 32 a second, burst 64: transport.js BUDGET),
-- and its bytes: its data's and 256 for its row (what a row of realtime.messages takes besides its payload: the topic,
-- the ids, the times, two indexes), from one of two buckets. On a game's topic the game's bucket: the game's host 64 KiB
-- a second, 256 KiB at once (its snapshots, 10-12 a second of up to 3.9 KB, and the world in chunks when a guest comes
-- in), any other 24 KiB a second, 64 KiB at once (a guest's presence, 9 a second, and its fx: 4-8 KB a second with the
-- rows' share; a presence filled with events its host has not acked, up to 35, waits for the bucket: it is said again);
-- on the lobby the lobby's bucket, 512 bytes a second, 8 KiB at once (a host's listing, about 380 bytes with its row's
-- share, on a change, every 10 s and for each newcomer). docs/coop/README.md, Byte budget.
-- One row a user, rewritten on every send. Unlogged, so those writes make no WAL; after a crash Postgres empties it, and
-- a bucket lost is a bucket full, a day's count lost is a day begun again: all this table can lose. The fillfactor
-- leaves room on each page for the row's next version (the update stays on the page, no index touched: nothing but the
-- key is indexed). Each bucket fills from its own last draw (tokens: at; game: game_at; lobby: lobby_at), so a call to
-- the lobby neither fills nor empties the game's, and a game's bucket holds at most what the caller's part in that game
-- allows when it draws. day, spent: the user's day (UTC) and what it has sent in it; held: what it has sent that the
-- project's count (skotos.quota) has not been told yet, handed in by 64 KiB.
create unlogged table if not exists skotos.rates (
  uid uuid primary key,
  tokens float8 not null,
  at timestamptz not null
) with (fillfactor = 50);
alter table skotos.rates
  add column if not exists game float8 not null default 262144,
  add column if not exists game_at timestamptz not null default now(),
  add column if not exists lobby float8 not null default 8192,
  add column if not exists lobby_at timestamptz not null default now(),
  add column if not exists day date not null default '2000-01-01',
  add column if not exists spent bigint not null default 0,
  add column if not exists held bigint not null default 0;

-- ---------- what the project may spend ----------
-- One row: what the game's pages have sent today (UTC), project-wide, counted as the buckets count it, and the most a
-- day may hold. Every message stays in realtime.messages until Realtime drops its day, once that day is more than three
-- days old (its janitor, every four hours or so): the table holds four days of messages and a few hours, each at most
-- 1.45 times what was counted (1.2 for the smallest message, 1.45 for 4 KiB that does not compress, 1.27 for a party's
-- mix: test-migration.mjs). So it holds at most about 6 times day_cap: as made, 40 MiB a day, under 250 MB, which a
-- Free project (500 MB) holds beside its own 50 MB and another app's. Past the cap every send is refused 'quota' until
-- midnight UTC (co-op stops for the day, the game goes on alone): the database is never filled by the game's pages,
-- whoever sends. user_cap: the most one user may send in a day. Both are the owner's to set for the plan and the
-- parties expected (docs/coop/supabase.md, the costs): update skotos.quota set day_cap = ..., user_cap = ...; running
-- this file again keeps them. The count is told by each user's row in steps of 64 KiB, so it lags by less than that a
-- user.
create table if not exists skotos.quota (
  id boolean primary key default true check (id),
  day date not null default '2000-01-01',
  bytes bigint not null default 0,
  day_cap bigint not null default 41943040,
  user_cap bigint not null default 41943040
);
insert into skotos.quota (id) values (true) on conflict (id) do nothing;

-- (nothing reads or writes the tables but the functions below, which run as their owner: no page holds a grant on
-- them, and row level security is on with no policy, so a grant given by mistake would still show nothing)
alter table skotos.games enable row level security;
alter table skotos.rates enable row level security;
alter table skotos.quota enable row level security;
revoke all on table skotos.games from public, anon, authenticated;
revoke all on table skotos.rates from public, anon, authenticated;
revoke all on table skotos.quota from public, anon, authenticated;

-- ---------- what a page says ----------
-- skotos.send(msgs): [[topic, event, data], ...], one to sixteen of them (the page sends what waited while its last call
-- was on its way together in one call, so its messages arrive in the order it said them). topic: 'skotos:lobby', or
-- 'skotos:<room>' while the game in that room is live (its skotos.games row: 'no_game' when there is none); event: the
-- game's topic ('s', 'w', 'i', 'f', 'c', or any a later version uses) or '_p' (a page's presence, which travels as a
-- broadcast); data: the JSON text of what the page said, as a string, at most 4 KiB (as the room's: transport.js
-- MAX_MSG and MAX_PRES). All of a call is checked before any of it goes ('too_big', 'rate_limited', 'quota'), and only
-- then is anything spent; then each goes as { d: data, _by: the caller } on its private channel, data still the page's
-- own text. Whatever the page wrote is inside d: '_by' is the server's alone.
-- (The data goes as the text it came as, never made into jsonb: a jsonb number is written out again digit by digit, so
-- 8 bytes of '1e131071' would go out as 131,072, and the size checked would not be the size sent. As a string it goes
-- out at most twice its size, its quotes, backslashes and newlines escaped. It is checked as json, its syntax only:
-- nothing is built of it.)
-- (realtime.send(payload, event, topic, private) writes a row in realtime.messages, which Realtime broadcasts from the
-- WAL to the private channel of that topic, every member of it, the sender too. It adds an 'id' to the payload, catches
-- its own errors and only warns, so a message it could not write is lost, not refused. It is no definer function: its
-- insert is made as this function's owner, postgres on Supabase, which Realtime grants SELECT and INSERT on
-- realtime.messages and whose definer functions pass row level security (the docs' own triggers call realtime.send so).
-- The row stays: Realtime drops a day's messages only once that day is more than three days old, and they count in the
-- database's size: skotos.quota above, docs/coop/supabase.md, the costs)
create or replace function skotos.send(msgs jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  n integer;
  m jsonb;
  b bigint;
  tp text;
  seen text[] := '{}';
  h boolean;
  hosting boolean := false;
  game_b bigint := 0;
  lobby_b bigint := 0;
  q skotos.quota%rowtype;
  r skotos.rates%rowtype;
  tok float8;
  gtok float8;
  ltok float8;
  used bigint;
  owed bigint;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if jsonb_typeof(msgs) is distinct from 'array' then
    raise exception 'invalid_argument';
  end if;
  n := jsonb_array_length(msgs);
  if n < 1 or n > 16 then
    raise exception 'invalid_argument';
  end if;
  for m in select e from jsonb_array_elements(msgs) as x(e) loop
    if jsonb_typeof(m) is distinct from 'array' or jsonb_array_length(m) <> 3
      or jsonb_typeof(m -> 0) is distinct from 'string'
      or jsonb_typeof(m -> 1) is distinct from 'string'
      or jsonb_typeof(m -> 2) is distinct from 'string'
      or (m ->> 0) !~ '^skotos:[a-z0-9][a-z0-9_.-]{0,47}$'
      or (m ->> 1) !~ '^(_p|[a-z][a-z0-9_.-]{0,47})$' then
      raise exception 'invalid_argument';
    end if;
    b := octet_length(m ->> 2);
    if b > 4096 then
      raise exception 'too_big';
    end if;
    -- (JSON or nothing: data that is not fails here, and the whole call with it)
    perform (m ->> 2)::json;
    tp := m ->> 0;
    if tp = 'skotos:lobby' then
      lobby_b := lobby_b + b + 256;
    else
      -- (a game's topic only while its game is live; its host spends the host's budget there)
      if not (tp = any(seen)) then
        select g.host = me into h from skotos.games g where g.name = substr(tp, 8) and g.expires_at > now();
        if not found then
          raise exception 'no_game';
        end if;
        hosting := hosting or h;
        seen := seen || tp;
      end if;
      game_b := game_b + b + 256;
    end if;
  end loop;
  -- (the project's day spent: nothing more goes until midnight UTC. With no row there is no budget at all)
  select * into q from skotos.quota where id;
  if not found or (q.day = today and q.bytes >= q.day_cap) then
    raise exception 'quota';
  end if;
  -- (the caller's buckets, filled for the time since it last drew, give n tokens and the call's bytes or nothing goes.
  -- Its row is locked for the moment the call takes, so two calls of one user are counted one after the other)
  select * into r from skotos.rates where uid = me for update;
  if not found then
    insert into skotos.rates (uid, tokens, at) values (me, 80, now()) on conflict (uid) do nothing;
    select * into r from skotos.rates where uid = me for update;
  end if;
  tok := least(80, r.tokens + greatest(0, extract(epoch from (now() - r.at))::float8) * 40);
  gtok := greatest(0, extract(epoch from (now() - r.game_at))::float8);
  gtok := case when hosting then least(262144, r.game + gtok * 65536) else least(65536, r.game + gtok * 24576) end;
  ltok := least(8192, r.lobby + greatest(0, extract(epoch from (now() - r.lobby_at))::float8) * 512);
  if tok < n or gtok < game_b or ltok < lobby_b then
    raise exception 'rate_limited';
  end if;
  -- (and the day's: the user's own, and the project's with what this user has sent that it was not told yet)
  used := case when r.day = today then r.spent else 0 end + game_b + lobby_b;
  owed := case when r.day = today then r.held else 0 end + game_b + lobby_b;
  if used > q.user_cap or (case when q.day = today then q.bytes else 0 end) + owed > q.day_cap then
    raise exception 'quota';
  end if;
  if owed >= 65536 then
    update skotos.quota set bytes = case when day = today then bytes else 0 end + owed, day = today where id;
    owed := 0;
  end if;
  update skotos.rates set tokens = tok - n, at = now(),
    game = case when game_b > 0 then gtok - game_b else game end, game_at = case when game_b > 0 then now() else game_at end,
    lobby = case when lobby_b > 0 then ltok - lobby_b else lobby end, lobby_at = case when lobby_b > 0 then now() else lobby_at end,
    day = today, spent = used, held = owed
  where uid = me;
  for m in select e from jsonb_array_elements(msgs) as x(e) loop
    perform realtime.send(jsonb_build_object('d', m ->> 2, '_by', me), m ->> 1, m ->> 0, true);
  end loop;
  return n;
end;
$$;

-- ---------- who hosts a game ----------
-- skotos.host_game(room): the caller hosts the game in that room. 'ok' when the row is new or already the caller's (a
-- renewal: four hours more), 'taken' when another holds it, 'quota' when the project's day is spent (a new game only:
-- its sends would be refused). A user hosts one game: its other rows go (a page hosts one game at a time and a user is
-- one tab, so they are its pages' before a reload, whose games ended with them). It lets go the games past their time,
-- and now and then (one call in fifty) the buckets nobody has drawn on for a day.
create or replace function skotos.host_game(room text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  q skotos.quota%rowtype;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if room is null or room !~ '^[a-z0-9][a-z0-9_.-]{0,47}$' then
    raise exception 'invalid_argument';
  end if;
  delete from skotos.games g where g.expires_at < now();
  if random() < 0.02 then
    delete from skotos.rates r where r.at < now() - interval '1 day';
  end if;
  if exists (select 1 from skotos.games g where g.name = room and g.host <> me) then
    return 'taken';
  end if;
  if not exists (select 1 from skotos.games g where g.name = room and g.host = me) then
    select * into q from skotos.quota where id;
    if not found or (q.day = today and q.bytes >= q.day_cap) then
      return 'quota';
    end if;
  end if;
  delete from skotos.games g where g.host = me and g.name <> room;
  insert into skotos.games as g (name, host, expires_at) values (room, me, now() + interval '4 hours')
  on conflict (name) do update set expires_at = excluded.expires_at where g.host = me;
  -- (another made it in the same moment)
  if not found then
    return 'taken';
  end if;
  return 'ok';
end;
$$;

-- skotos.game_host(room): the user id of the game's host, or null when the room holds no live game. A guest takes its
-- host from this and from nothing else; the id is no secret (every message its host sends carries it as '_by').
create or replace function skotos.game_host(room text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.host from skotos.games g
  where g.name = room and g.expires_at > now() and auth.uid() is not null;
$$;

-- skotos.end_game(room): the host is done with it (only the host's own row goes)
create or replace function skotos.end_game(room text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from skotos.games g where g.name = room and g.host = auth.uid();
$$;

-- (functions are anyone's to call when made: these four are signed-in pages' only)
revoke all on function skotos.send(jsonb) from public, anon;
revoke all on function skotos.host_game(text) from public, anon;
revoke all on function skotos.game_host(text) from public, anon;
revoke all on function skotos.end_game(text) from public, anon;
grant execute on function skotos.send(jsonb) to authenticated;
grant execute on function skotos.host_game(text) to authenticated;
grant execute on function skotos.game_host(text) to authenticated;
grant execute on function skotos.end_game(text) to authenticated;

-- ---------- Realtime's private channels ----------
-- Realtime asks these policies once, when a page joins a private channel (it tries a read and a write of a message on
-- the topic, as the page's role, and rolls them back), and keeps the answer for that connection. realtime.topic() is
-- the topic being joined; extension is what the message is: 'broadcast' or 'presence'. The pages join with
-- config: { private: true }. A public channel of the same name is another channel, and nothing the game says goes
-- there: the project's 'Allow public access' may stay on for another app.

-- A signed-in page may hear the 'skotos:' topics: the broadcasts on them (what skotos.send sends) and who is there.
drop policy if exists "skotos: signed-in pages hear skotos topics" on realtime.messages;
create policy "skotos: signed-in pages hear skotos topics"
on realtime.messages
for select
to authenticated
using (
  starts_with((select realtime.topic()), 'skotos:')
  and realtime.messages.extension in ('broadcast', 'presence')
);

-- It may track its presence there (once a channel: who came and who left, shown, never believed).
drop policy if exists "skotos: signed-in pages track presence on skotos topics" on realtime.messages;
create policy "skotos: signed-in pages track presence on skotos topics"
on realtime.messages
for insert
to authenticated
with check (
  starts_with((select realtime.topic()), 'skotos:')
  and realtime.messages.extension = 'presence'
);

-- And whatever another app's policies allow on the project, two things hold on a 'skotos:' topic: no signed-in page
-- broadcasts on it itself, and the public key alone (no session) does nothing there at all, hearing included. A
-- restrictive policy holds whatever the permissive ones say, and these say nothing of any other topic. So only
-- skotos.send's messages, stamped, reach the game's channels (it runs as the function's owner, which these policies
-- name no role of). (The topic is the one being joined, realtime.topic(), and the row's own, either of them.)
drop policy if exists "skotos: no page broadcasts on skotos topics" on realtime.messages;
create policy "skotos: no page broadcasts on skotos topics"
on realtime.messages
as restrictive
for insert
to authenticated
with check (
  not (
    (starts_with(coalesce((select realtime.topic()), ''), 'skotos:') or starts_with(realtime.messages.topic, 'skotos:'))
    and realtime.messages.extension = 'broadcast'
  )
);

drop policy if exists "skotos: skotos topics are for signed-in pages" on realtime.messages;
create policy "skotos: skotos topics are for signed-in pages"
on realtime.messages
as restrictive
for all
to anon
using (
  not (starts_with(coalesce((select realtime.topic()), ''), 'skotos:') or starts_with(realtime.messages.topic, 'skotos:'))
)
with check (
  not (starts_with(coalesce((select realtime.topic()), ''), 'skotos:') or starts_with(realtime.messages.topic, 'skotos:'))
);
