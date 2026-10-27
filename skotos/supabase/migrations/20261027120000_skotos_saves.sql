-- Skotos cloud saves on a Supabase project (the web build; docs/cloudsave/README.md). Run after
-- 20261026120000_skotos_coop.sql (it uses the schema 'skotos' that file makes, and its grant of usage to signed-in
-- pages; it makes the schema itself too, so it also runs alone).
--
-- Each browser signs in anonymously once (its own session, kept in localStorage: src/net/cloudsb.js) and is tied to a
-- player. The saves are the player's: one row a hero, the hero's JSON text as the page stored it. Any user who gives the
-- player's save code is tied to that player too: that is how a hero moves to another device with no email. The code is
-- made here (80 random bits from gen_random_uuid, sixteen characters of Crockford's base 32); only its SHA-256 is kept,
-- so the code is shown once, when it is made, and the page keeps it to show again.
--
-- Nothing is readable by another player: the tables are closed (no grant, row level security on with no policy), and
-- every function finds the caller's player from auth.uid() and touches that player's rows only. A visitor costs nothing
-- to make (an anonymous user), so everything is bounded: 96 KiB a hero, 12 live heroes and 32 tombstones a player,
-- 20 writes at once and one every 5 s (12 a minute) a player, 5 code tries at once and one every 2 minutes a user, and
-- for the whole project (skotos.save_quota) the bytes kept (64 MiB as made, each row counted as its data and 200 bytes)
-- and the players (20,000). Past a cap the call is refused and the page keeps its local copy: the database is never
-- filled by saves. The caps are the owner's to set: update skotos.save_quota set bytes_cap = ..., players_cap = ...;
-- running this file again keeps them.
--
-- Run it again and it leaves the same state. Every function: SECURITY DEFINER, search_path pinned to '' (every name
-- written with its schema), callable by signed-in pages only. The schema 'skotos' must be exposed to the Data API (it
-- already is for co-op).

create schema if not exists skotos;
grant usage on schema skotos to authenticated;
revoke all on schema skotos from public, anon;

-- ---------- players and the users tied to them ----------
create table if not exists skotos.save_players (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz not null default now(),
  -- (the player's writes: a token bucket, 20 at once, one every 5 s)
  tokens float8 not null default 20,
  tokens_at timestamptz not null default now()
);
create table if not exists skotos.save_users (
  uid uuid primary key,
  player uuid not null references skotos.save_players (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists save_users_player on skotos.save_users (player);
-- (each user's tries of a code: 5 at once, one every 2 minutes. Unlogged: a crash forgets them, a bucket full again)
create unlogged table if not exists skotos.save_claims (
  uid uuid primary key,
  tokens float8 not null,
  at timestamptz not null
);

-- ---------- the saves ----------
-- One row a hero of a player. rev counts the row's writes (a page writes with the rev it last saw: 'conflict' when it
-- is not the row's). data: the hero's JSON text as the page stored it (kept as text, byte for byte); null for a
-- tombstone (deleted: a hero deleted on one device, so no other device brings it back; at: when, in ms). played: the
-- hero's last-played time (ms), sum: the page's hash of it (game/cloudsync.js heroSum). bytes: what the row counts
-- against the project's cap.
create table if not exists skotos.saves (
  player uuid not null references skotos.save_players (id) on delete cascade,
  hero text not null check (hero ~ '^[A-Za-z0-9_-]{1,40}$'),
  rev integer not null,
  played bigint not null default 0,
  sum text not null default '' check (length(sum) <= 16),
  deleted boolean not null default false,
  at bigint not null default 0,
  data text,
  bytes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player, hero)
);

-- ---------- what the project keeps ----------
create table if not exists skotos.save_quota (
  id boolean primary key default true check (id),
  bytes bigint not null default 0,
  bytes_cap bigint not null default 67108864,
  players integer not null default 0,
  players_cap integer not null default 20000
);
insert into skotos.save_quota (id) values (true) on conflict (id) do nothing;

alter table skotos.save_players enable row level security;
alter table skotos.save_users enable row level security;
alter table skotos.save_claims enable row level security;
alter table skotos.saves enable row level security;
alter table skotos.save_quota enable row level security;
revoke all on table skotos.save_players from public, anon, authenticated;
revoke all on table skotos.save_users from public, anon, authenticated;
revoke all on table skotos.save_claims from public, anon, authenticated;
revoke all on table skotos.saves from public, anon, authenticated;
revoke all on table skotos.save_quota from public, anon, authenticated;

-- ---------- helpers (not callable by pages) ----------
-- a new code: sixteen characters of Crockford's base 32, five random bits each (the low bits of bytes of two random
-- uuids, never byte 6 of a uuid, whose bits 4-7 are its version)
create or replace function skotos.save_make_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alpha constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea := pg_catalog.uuid_send(pg_catalog.gen_random_uuid()) || pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  code text := '';
  i int;
begin
  foreach i in array array[0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] loop
    code := code || substr(alpha, (get_byte(b, i) & 31) + 1, 1);
  end loop;
  return code;
end;
$$;
-- a code as typed: upper case, Crockford's look-alikes (O, I, L) as the digits, anything else dropped
create or replace function skotos.save_norm_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(translate(upper(coalesce(code, '')), 'OIL', '011'), '[^0-9A-Z]', '', 'g');
$$;
create or replace function skotos.save_hash(code text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.sha256(convert_to('skotos-save:' || code, 'UTF8'));
$$;
-- the caller's player (null: none yet); refuses a caller with no session
create or replace function skotos.save_player()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  p uuid;
begin
  if me is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select u.player into p from skotos.save_users u where u.uid = me;
  return p;
end;
$$;
-- one write of the player's: true when its bucket had a token (taken), false when it is empty
create or replace function skotos.save_spend(p uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t float8;
begin
  update skotos.save_players s
  set tokens = least(20, s.tokens + extract(epoch from (now() - s.tokens_at)) / 5) - 1, tokens_at = now(), used_at = now()
  where s.id = p and least(20, s.tokens + extract(epoch from (now() - s.tokens_at)) / 5) >= 1
  returning s.tokens into t;
  return found;
end;
$$;
revoke all on function skotos.save_make_code() from public, anon, authenticated;
revoke all on function skotos.save_norm_code(text) from public, anon, authenticated;
revoke all on function skotos.save_hash(text) from public, anon, authenticated;
revoke all on function skotos.save_player() from public, anon, authenticated;
revoke all on function skotos.save_spend(uuid) from public, anon, authenticated;

-- ---------- what a page calls ----------
-- skotos.save_hello(): the caller's player, { player }; a user tied to none is given a new one, { player, code, new: true }
-- (the code shown this once). { error: 'quota' } when the project holds players_cap players.
create or replace function skotos.save_hello()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  p uuid := skotos.save_player();
  code text;
  q skotos.save_quota%rowtype;
begin
  if p is not null then
    return jsonb_build_object('player', p);
  end if;
  select * into q from skotos.save_quota where id for update;
  if not found or q.players >= q.players_cap then
    return jsonb_build_object('error', 'quota');
  end if;
  code := skotos.save_make_code();
  insert into skotos.save_players (code_hash) values (skotos.save_hash(code)) returning id into p;
  insert into skotos.save_users (uid, player) values (me, p) on conflict (uid) do nothing;
  if not found then
    -- (another call of the same user made its player in the same moment: that one stands)
    delete from skotos.save_players s where s.id = p;
    return jsonb_build_object('player', skotos.save_player());
  end if;
  update skotos.save_quota set players = players + 1 where id;
  return jsonb_build_object('player', p, 'code', code, 'new', true);
end;
$$;

-- skotos.save_claim(code): the caller is tied to the player of that code ({ player }), or { error: 'bad_code' |
-- 'rate_limited' }. The player it was tied to before, if no other user is tied to it, goes: its heroes that the code's
-- player does not have are moved to it first (the device that claims keeps its own copies besides, and puts them up).
create or replace function skotos.save_claim(code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  old uuid := skotos.save_player();
  target uuid;
  c text := skotos.save_norm_code(code);
  t float8;
  freed bigint;
begin
  insert into skotos.save_claims as k (uid, tokens, at) values (me, 5, now()) on conflict (uid) do nothing;
  update skotos.save_claims k set tokens = least(5, k.tokens + extract(epoch from (now() - k.at)) / 120) - 1, at = now()
  where k.uid = me and least(5, k.tokens + extract(epoch from (now() - k.at)) / 120) >= 1
  returning k.tokens into t;
  if not found then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  if c !~ '^[0-9A-HJKMNP-TV-Z]{16}$' then
    return jsonb_build_object('error', 'bad_code');
  end if;
  select s.id into target from skotos.save_players s where s.code_hash = skotos.save_hash(c);
  if target is null then
    return jsonb_build_object('error', 'bad_code');
  end if;
  if old = target then
    return jsonb_build_object('player', target);
  end if;
  insert into skotos.save_users as u (uid, player) values (me, target)
  on conflict (uid) do update set player = excluded.player, at = now();
  update skotos.save_players s set used_at = now() where s.id = target;
  if old is not null and not exists (select 1 from skotos.save_users u where u.player = old) then
    update skotos.saves s set player = target
    where s.player = old and not exists (select 1 from skotos.saves x where x.player = target and x.hero = s.hero);
    select coalesce(sum(s.bytes), 0) into freed from skotos.saves s where s.player = old;
    delete from skotos.save_players s where s.id = old;
    update skotos.save_quota set players = greatest(0, players - 1), bytes = greatest(0, bytes - freed) where id;
  end if;
  return jsonb_build_object('player', target);
end;
$$;

-- skotos.save_new_code(): a new code for the caller's player, { code }; the old one stops working (the users already
-- tied stay tied)
create or replace function skotos.save_new_code()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p uuid := skotos.save_player();
  code text;
begin
  if p is null then
    return jsonb_build_object('error', 'no_player');
  end if;
  if not skotos.save_spend(p) then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  code := skotos.save_make_code();
  update skotos.save_players s set code_hash = skotos.save_hash(code) where s.id = p;
  return jsonb_build_object('code', code);
end;
$$;

-- skotos.save_list(): the caller's heroes, without their data: [{ id, rev, played, sum, del, at }]
create or replace function skotos.save_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p uuid := skotos.save_player();
begin
  if p is null then
    return jsonb_build_object('error', 'no_player');
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.hero, 'rev', s.rev, 'played', s.played, 'sum', s.sum, 'del', s.deleted, 'at', s.at) order by s.hero)
    from skotos.saves s where s.player = p), '[]'::jsonb);
end;
$$;

-- skotos.save_get(hero_id): one of the caller's heroes, its data the text as it was put ({ id, rev, played, sum, del,
-- at, data }), or null
create or replace function skotos.save_get(hero_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p uuid := skotos.save_player();
begin
  if p is null then
    return jsonb_build_object('error', 'no_player');
  end if;
  return (select jsonb_build_object('id', s.hero, 'rev', s.rev, 'played', s.played, 'sum', s.sum, 'del', s.deleted, 'at', s.at, 'data', s.data)
    from skotos.saves s where s.player = p and s.hero = hero_id);
end;
$$;

-- skotos.save_put(hero_id, data, sum, played, base_rev): the hero written, { rev } (its new rev). base_rev: the rev the
-- page last saw (null: it expects no row, or a tombstone it saw as such is passed as its rev). Refused { error }:
-- 'conflict' (and the row's rev) when the row is not at base_rev; 'too_big' past 96 KiB; 'bad_data' when data is not
-- a JSON object whose id is hero_id; 'too_many' for a 13th live hero; 'rate_limited'; 'quota' past the project's bytes.
create or replace function skotos.save_put(hero_id text, data text, sum text, played bigint, base_rev integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p uuid := skotos.save_player();
  r skotos.saves%rowtype;
  n int := octet_length(data);
  j jsonb;
  delta bigint;
  q skotos.save_quota%rowtype;
begin
  if p is null then
    return jsonb_build_object('error', 'no_player');
  end if;
  if hero_id is null or hero_id !~ '^[A-Za-z0-9_-]{1,40}$' or sum is null or length(sum) > 16 or played is null or played < 0 then
    return jsonb_build_object('error', 'invalid_argument');
  end if;
  if data is null or n > 98304 then
    return jsonb_build_object('error', 'too_big');
  end if;
  begin
    j := data::jsonb;
  exception when others then
    return jsonb_build_object('error', 'bad_data');
  end;
  if jsonb_typeof(j) <> 'object' or j->>'id' is distinct from hero_id then
    return jsonb_build_object('error', 'bad_data');
  end if;
  if not skotos.save_spend(p) then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  select * into r from skotos.saves s where s.player = p and s.hero = hero_id for update;
  if found then
    if r.rev is distinct from base_rev then
      return jsonb_build_object('error', 'conflict', 'rev', r.rev);
    end if;
  elsif base_rev is not null then
    return jsonb_build_object('error', 'conflict', 'rev', null);
  end if;
  if (not found or r.deleted) and (select count(*) from skotos.saves s where s.player = p and not s.deleted) >= 12 then
    return jsonb_build_object('error', 'too_many');
  end if;
  delta := n + 200 - coalesce(r.bytes, 0);
  select * into q from skotos.save_quota where id for update;
  if delta > 0 and q.bytes + delta > q.bytes_cap then
    return jsonb_build_object('error', 'quota');
  end if;
  insert into skotos.saves as s (player, hero, rev, played, sum, deleted, at, data, bytes, updated_at)
  values (p, hero_id, coalesce(r.rev, 0) + 1, played, sum, false, 0, data, n + 200, now())
  on conflict (player, hero) do update set rev = excluded.rev, played = excluded.played, sum = excluded.sum, deleted = false,
    at = 0, data = excluded.data, bytes = excluded.bytes, updated_at = now();
  update skotos.save_quota set bytes = greatest(0, bytes + delta) where id;
  return jsonb_build_object('rev', coalesce(r.rev, 0) + 1);
end;
$$;

-- skotos.save_delete(hero_id, at, base_rev): the hero's row made a tombstone (deleted at 'at', ms), { rev }; refused
-- 'conflict' as save_put. A player keeps its newest 32 tombstones.
create or replace function skotos.save_delete(hero_id text, at bigint, base_rev integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p uuid := skotos.save_player();
  r skotos.saves%rowtype;
  delta bigint;
  freed bigint;
begin
  if p is null then
    return jsonb_build_object('error', 'no_player');
  end if;
  if hero_id is null or hero_id !~ '^[A-Za-z0-9_-]{1,40}$' or at is null or at < 0 then
    return jsonb_build_object('error', 'invalid_argument');
  end if;
  if not skotos.save_spend(p) then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  select * into r from skotos.saves s where s.player = p and s.hero = hero_id for update;
  if found then
    if r.rev is distinct from base_rev then
      return jsonb_build_object('error', 'conflict', 'rev', r.rev);
    end if;
  elsif base_rev is not null then
    return jsonb_build_object('error', 'conflict', 'rev', null);
  end if;
  delta := 200 - coalesce(r.bytes, 0);
  insert into skotos.saves as s (player, hero, rev, played, sum, deleted, at, data, bytes, updated_at)
  values (p, hero_id, coalesce(r.rev, 0) + 1, 0, '', true, save_delete.at, null, 200, now())
  on conflict (player, hero) do update set rev = excluded.rev, played = 0, sum = '', deleted = true, at = excluded.at,
    data = null, bytes = 200, updated_at = now();
  with gone as (
    delete from skotos.saves s where s.player = p and s.deleted and s.hero not in
      (select x.hero from skotos.saves x where x.player = p and x.deleted order by x.at desc, x.hero limit 32)
    returning s.bytes
  ) select coalesce(sum(g.bytes), 0) into freed from gone g;
  update skotos.save_quota set bytes = greatest(0, bytes + delta - freed) where id;
  return jsonb_build_object('rev', coalesce(r.rev, 0) + 1);
end;
$$;

revoke all on function skotos.save_hello() from public, anon;
revoke all on function skotos.save_claim(text) from public, anon;
revoke all on function skotos.save_new_code() from public, anon;
revoke all on function skotos.save_list() from public, anon;
revoke all on function skotos.save_get(text) from public, anon;
revoke all on function skotos.save_put(text, text, text, bigint, integer) from public, anon;
revoke all on function skotos.save_delete(text, bigint, integer) from public, anon;
grant execute on function skotos.save_hello() to authenticated;
grant execute on function skotos.save_claim(text) to authenticated;
grant execute on function skotos.save_new_code() to authenticated;
grant execute on function skotos.save_list() to authenticated;
grant execute on function skotos.save_get(text) to authenticated;
grant execute on function skotos.save_put(text, text, text, bigint, integer) to authenticated;
grant execute on function skotos.save_delete(text, bigint, integer) to authenticated;
