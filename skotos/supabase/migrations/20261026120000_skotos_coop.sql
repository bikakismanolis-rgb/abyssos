-- Skotos co-op on a Supabase project: the server, not the page, says who sent each message (docs/coop/supabase.md,
-- docs/coop/release.md step 5).
--
-- Realtime does not say who sent a broadcast: a client's own broadcast carries whatever sender it writes in it, so a
-- page with the project's public key and a game's code (the lobby lists them) could speak as the host to every guest.
-- So here no page broadcasts on a 'skotos:' topic at all. A page signs in (anonymously: the project's Auth must allow
-- anonymous sign-ins), joins the game's channels as private channels to hear them, and says everything through
-- skotos.send, a SECURITY DEFINER function it calls by RPC. That function checks the caller, the topic, the size and
-- the caller's rate, and broadcasts the message with realtime.send, the caller's user id written beside it ('_by') by
-- the server. The page takes a sender from '_by' and from nothing else. Who hosts a game is a row in skotos.games that
-- the host made through skotos.host_game, never anyone's presence.
--
-- Everything is in the schema 'skotos': the project may hold another app, and no other schema's tables are made,
-- changed or read here. On realtime.messages (Realtime's own table, which every app on the project shares) there are
-- only policies, and each of them is about topics that begin with 'skotos:'.
--
-- Run it again and it leaves the same state: schemas, tables and indexes only if they are not there, functions
-- replaced, policies dropped and made again.
--
-- The project must also expose the schema 'skotos' to the Data API (Project Settings, Data API, Exposed schemas: add
-- 'skotos' beside what is there), or the RPCs are not found. Only the four functions below are open to signed-in pages;
-- the two tables are not open to anyone. (The Security Advisor warns of definer functions a signed-in user can call
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

-- ---------- the rate ----------
-- Each user's sends, as a token bucket: 40 a second, 80 at once (the artifact room's own budget, which the page holds
-- itself under at 32 a second, burst 64: transport.js BUDGET). One row a user, rewritten on every send. Unlogged, so
-- those writes make no WAL; after a crash Postgres empties it, and a bucket lost is a bucket full, which is all this
-- table can lose. The fillfactor leaves room on each page for the row's next version (the update stays on the page,
-- no index touched: nothing but the key is indexed).
create unlogged table if not exists skotos.rates (
  uid uuid primary key,
  tokens float8 not null,
  at timestamptz not null
) with (fillfactor = 50);

-- (nothing reads or writes the two tables but the functions below, which run as their owner: no page holds a grant on
-- them, and row level security is on with no policy, so a grant given by mistake would still show nothing)
alter table skotos.games enable row level security;
alter table skotos.rates enable row level security;
revoke all on table skotos.games from public, anon, authenticated;
revoke all on table skotos.rates from public, anon, authenticated;

-- ---------- what a page says ----------
-- skotos.send(msgs): [[topic, event, data], ...], one to sixteen of them (the page sends what waited while its last call
-- was on its way together in one call, so its messages arrive in the order it said them). topic: 'skotos:<room>' (the
-- lobby or a game); event: the game's topic ('s', 'w', 'i', 'f', 'c', or any a later version uses) or '_p' (a page's
-- presence, which travels as a broadcast); data: the JSON text of what the page said, as a string, so the size checked
-- is the page's own count of it (4 KiB, as the room's: transport.js MAX_MSG and MAX_PRES). All of a call is checked
-- before any of it goes, and the rate takes one token for each message; then each goes as { d: data, _by: the caller }
-- on its private channel. Whatever the page wrote is inside d: '_by' is the server's alone.
-- (realtime.send(payload, event, topic, private) writes a row in realtime.messages, which Realtime broadcasts from the
-- WAL to the private channel of that topic, every member of it, the sender too. It adds an 'id' to the payload, catches
-- its own errors and only warns, so a message it could not write is lost, not refused. It is no definer function: its
-- insert is made as this function's owner, postgres on Supabase, which Realtime grants SELECT and INSERT on
-- realtime.messages and whose definer functions pass row level security (the docs' own triggers call realtime.send so).
-- The row stays: Realtime drops a day's messages only once they are three days old, and they count in the database's
-- size, about 1 KB a message: docs/coop/supabase.md, the costs)
create or replace function skotos.send(msgs jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n integer;
  m jsonb;
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
  for m in select e from jsonb_array_elements(msgs) as t(e) loop
    if jsonb_typeof(m) is distinct from 'array' or jsonb_array_length(m) <> 3
      or jsonb_typeof(m -> 0) is distinct from 'string'
      or jsonb_typeof(m -> 1) is distinct from 'string'
      or jsonb_typeof(m -> 2) is distinct from 'string'
      or (m ->> 0) !~ '^skotos:[a-z0-9][a-z0-9_.-]{0,47}$'
      or (m ->> 1) !~ '^(_p|[a-z][a-z0-9_.-]{0,47})$' then
      raise exception 'invalid_argument';
    end if;
    if octet_length(m ->> 2) > 4096 then
      raise exception 'too_big';
    end if;
  end loop;
  -- (the caller's bucket, filled for the time since it last drew, gives n tokens or nothing goes: one statement, one
  -- row, locked for the moment it takes, so two calls of one user are counted one after the other)
  insert into skotos.rates as r (uid, tokens, at) values (me, 80 - n, now())
  on conflict (uid) do update
    set tokens = least(80, r.tokens + extract(epoch from (now() - r.at))::float8 * 40) - n, at = now()
    where least(80, r.tokens + extract(epoch from (now() - r.at))::float8 * 40) >= n;
  if not found then
    raise exception 'rate_limited';
  end if;
  -- (data that is not JSON fails here, and the whole call with it: nothing of it was sent, no token taken)
  for m in select e from jsonb_array_elements(msgs) as t(e) loop
    perform realtime.send(jsonb_build_object('d', (m ->> 2)::jsonb, '_by', me), m ->> 1, m ->> 0, true);
  end loop;
  return n;
end;
$$;

-- ---------- who hosts a game ----------
-- skotos.host_game(room): the caller hosts the game in that room. 'ok' when the row is new or already the caller's (a
-- renewal: four hours more), 'taken' when another holds it, 'too_many' past four live games of one user (a page hosts
-- one at a time; a few more for pages closed without leaving, whose rows are still running out). It lets go the games
-- past their time, and now and then (one call in fifty) the buckets nobody has drawn on for a day.
create or replace function skotos.host_game(room text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
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
  if (select count(*) from skotos.games g where g.host = me and g.name <> room) >= 4 then
    return 'too_many';
  end if;
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
