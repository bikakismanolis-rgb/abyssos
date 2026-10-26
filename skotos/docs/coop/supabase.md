# Co-op on Supabase (the public web build, later the Android app)

Outside claude.ai the game's co-op runs on a Supabase project: Realtime carries the messages, and the project's database says who sent each of them. The artifact build is not touched by any of this: it keeps RoomTransport, its `net/netcfg.js` is empty, and its bundle holds no supabase-js (`npm run build:artifact` gives the same files as before, only the hashes of `boot` and of the chunks that import it changed).

Files: `supabase/migrations/20261026120000_skotos_coop.sql` (all the project needs), `src/net/transport.js` (`SupabaseTransport`, stamped), `src/net/netcfg.web.js` (the web build's config), `vite.config.js` (`--mode web`), `tools/net/test-transport.mjs` and `tools/net/test-migration.mjs` (the tests).

## Why the server says who sent it

A guest believes its host's messages (snapshots, the world, the ice, the end of the game) because they come from the peer it took as its host. Realtime does not say who sent a broadcast: a client's broadcast carries whatever sender it writes in it, and a presence key is the client's own choice. Anyone with the project's public key and a game's code (the lobby lists them) could speak as the host to every guest, or as one guest to the host. So no page broadcasts on the game's channels at all:

- **Each tab signs in anonymously** (`supabase.auth.signInAnonymously`, the session in `sessionStorage`: two tabs are two players, a reload is the same one). Its user id is its peer.
- **It joins private channels** (`config: { private: true }`): `skotos:lobby` and `skotos:skotos-<code>`. The policies on `realtime.messages` let a signed-in page hear a `skotos:` topic and track its presence there, never broadcast on it; the public key alone (no session) gets nothing on such a topic, whatever another app's policies on the same project allow.
- **It says everything through `skotos.send`**, a `SECURITY DEFINER` function it calls by RPC (`schema('skotos').rpc('send', { msgs })`, up to sixteen messages a call, one call on its way at a time so they arrive in order). The function checks the caller (`auth.uid()`), each topic (`skotos:` and a room name), each event name, the size (4096 bytes of the data's JSON text, as the room's cap) and the caller's rate (a bucket of 40 a second and 80 at once, the room's budget; the page holds itself to 32 and 64). Then it calls `realtime.send(jsonb_build_object('d', data, '_by', auth.uid()), event, topic, true)`. What the page wrote is inside `d`; `_by` is the server's alone.
- **A page takes a sender from `_by` and nothing else**: a message without it is dropped, an `f` or `_by` inside the data is never read, its own messages (a database broadcast comes back to its sender too) are passed over. A peer is listed only once the server has named it in a presence (`_p`) message; a presence key alone is no peer.
- **Who hosts a game is a row**, `skotos.games` (`name` the room, `host` the user id, four hours, renewed every half hour while the game is open, ended when the host leaves). The host makes it through `skotos.host_game` (`taken` when another holds the room: the game picks a new code), a guest asks `skotos.game_host` and takes that peer and no other (`coop.js pickHost`). Presence and the lobby's listings only show things: a listing that claims another's game is a listing of its own maker, and a guest who picks it finds no host.

The host's own checks (README, "Guests' blows, checked") still keep a lying guest out; the stamp keeps out a false host and a false guest.

## Setting up a project

1. **A project.** Any region near the players. The project may hold another app: everything is in the schema `skotos`, and on `realtime.messages`, which every app on the project shares, there are only policies about `skotos:` topics. (The project **skotos**, `docs/HANDOFF.md`, exists and is empty: nothing of this has been applied to it.)
2. **Auth: allow anonymous sign-ins** (Authentication, Sign In / Providers, Anonymous sign-ins: on). Before that, on a project another app shares, read its policies: an anonymous user has the `authenticated` role in every policy of the project, not only Skotos's. Supabase allows 30 anonymous sign-ins an hour from one IP address (Authentication, Rate limits): a household or a LAN party past that number of new tabs in an hour is refused, the game then single-player. Supabase advises a CAPTCHA (Turnstile or hCaptcha) on anonymous sign-ins; the game does not ask for one yet.
3. **Run the migration**: paste `supabase/migrations/20261026120000_skotos_coop.sql` into the SQL Editor and run it, or with the CLI, `npx supabase link --project-ref <ref>` and `npx supabase db push`. Running it again changes nothing.
4. **Expose the schema** (Project Settings, Data API, Exposed schemas: add `skotos` beside what is there), or the RPCs are not found. Its two tables stay closed (no grant, row level security on with no policy); its four functions are open to signed-in users only. The Security Advisor warns of definer functions that signed-in users can call through the API: these four are meant to be, and each checks its caller.
5. **Realtime settings.** Nothing to set for private channels. *Allow public access* may stay on for another app: a public channel of the same name is another channel, and the game never joins one. With Skotos alone on the project it can go off (no public channels at all).
6. **Check on the project** what the tests could only stand in for (each is a line in the SQL Editor):
   - `select rolbypassrls from pg_roles where rolname = 'postgres';` should be `true` (the functions run as their owner, postgres; `realtime.send` inserts as that owner and must pass row level security).
   - `select has_table_privilege('postgres', 'realtime.messages', 'INSERT');` should be `true`.
   - `select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'realtime' and p.proname = 'send';` should be `payload jsonb, event text, topic text, private boolean`.
   - After a game: no `WarnSendingBroadcastMessage` in the Postgres logs (`realtime.send` only warns when it cannot write: a message lost, not refused).
7. **The build's environment.** In `skotos/`, a file `.env.web.local` (git ignores `.env.*`):
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<the publishable key, sb_publishable_..., or the legacy anon key>
   ```
   Both are public: they end up in the page. (Supabase retires the legacy anon keys at the end of 2026: take the publishable key.) The shell's environment does as well.
8. **Build**: `npm run build:web` (`vite build --mode web`) writes `dist-web/`: the static site, with `net/netcfg.web.js` in `net/netcfg.js`'s place and supabase-js in a chunk of its own, loaded only when the URL and key are there. Without them the build warns and is the single-player game.
9. **Host `dist-web/`** on any static host (the paths are relative, `base: './'`), over HTTPS. A Content-Security-Policy, if the host sets one, must allow `connect-src https://<ref>.supabase.co wss://<ref>.supabase.co`. Anonymous sign-in needs no redirect URL.
10. **Try it**: two browsers (or two tabs), Co-op, Host on one, the code on the other.

## Costs and limits

The game's own numbers (`README.md`, Byte budget; `release.md` step 5) and what the stamp changes. Realtime counts each message sent and each one delivered. A message from the database reaches every member of the channel, its sender too, so a party of four at the game's rates (about 52 messages a second: the host's snapshots, each guest's presence and fx) costs **about 280 events a second** (`test-transport.mjs`: 56 sends, 224 deliveries), where client broadcasts cost 210-225. A pair costs about 60. The lobby is as before (a page with nothing to show says nothing; twelve hosts among 48 pages, about 59 a second with the echo).

| | Free | Pro | Pro, no spend cap |
|---|---|---|---|
| messages a second (project) | 100: no party of four, one pair | 500: one party of four | 2,500: about eight |
| messages a month, included | 2 million: about 2 hours of one party of four | 5 million: about 5 hours, then $2.50 a million (about $2.50 an hour of a party of four, $0.55 of a pair) | as Pro |
| database size | 500 MB, then read-only | 8 GB disk, grows | grows |
| egress (Realtime counts) | 5 GB a month | 250 GB, then $0.09 a GB | as Pro |
| concurrent connections (one a page) | 200 | 500 | 10,000 |
| channel joins a second | 100 | 500 | 2,500 |
| presence messages a second | 20 | 50 | 1,000 |

- **The database keeps every message.** `realtime.send` writes a row in `realtime.messages`, and Realtime drops a day's rows only once they are three days old. On a stand-in of that table (`test-migration.mjs`, PGlite: the table, its two indexes and its TOAST) a message takes about 1.8 times its JSON: about 130 MB an hour at 20 KB of JSON a second, so 150-250 MB an hour of a party of four at the game's 25-40 KB a second. On the Free plan (500 MB, about 50 MB of it a new project's own) two or three hours of play within three days make the project read-only; then every send fails (co-op stops, the game goes on alone) until the rows age out. The functions' owner may not delete them (Realtime grants postgres SELECT, INSERT and UPDATE on that table, no DELETE), so nothing here prunes them.
- **Egress**: a party of four receives about 110-150 KB of messages a second (each guest 28-37 KB and its own back, the host its guests' and its own snapshots back), and each of the 224 deliveries a second carries Realtime's envelope, the sender's id and `realtime.send`'s id besides (about 150 bytes): about 0.5-0.7 GB an hour, estimated, not measured. The messages' monthly quota runs out first.
- **The calls**: about 56 RPC calls a second for a party of four, each an HTTP request and a short transaction (an upsert on an unlogged table, then the insert). The smallest computes should hold a few parties; not measured.
- **The Free plan pauses** a project after a week with no traffic.

So the Free plan is for trying it out. Parties that play for hours need Pro, and past its 5 million messages each hour of a party of four costs about $2.50 in messages, besides the plan and its compute. Nothing in the game holds a project-wide limit: choose the plan for the parties expected (or ask Supabase for other limits) before opening the build.

## What is not done, and what is not verified

No live project has been touched: nothing here has run on Supabase itself.

- **Verified only against stand-ins.** The migration has run on PGlite (Postgres in WebAssembly) with Supabase's parts written in: the roles, `auth.uid()`, `realtime.messages` with its columns and indexes, and `realtime.send`, `realtime.topic()` and `realtime.authorize` (the join check) as Realtime's own source has them (supabase/realtime ce84f7d, 23 October 2026). `SupabaseTransport` has run against a fake supabase-js client that holds to Realtime's documented limits and to the migration's rules. What those cannot show: that the project's postgres passes row level security in `realtime.send` (step 6 above; if not, every send is lost without an error), that PostgREST finds the functions once the schema is exposed, Realtime's delivery to private channels and its real event counts, the real storage per message, the latency (a message waits for the page's call before it, then an HTTP round trip, a commit and Realtime reading the WAL: more than a client broadcast, by how much not measured), the calls' load on a small compute, and supabase-js 2.117.3 itself (only its shapes are used: `auth.signInAnonymously`, `auth.getSession`, `schema().rpc()`, `channel()` with `private`, `realtime.setAuth()`).
- **The game over Supabase in a browser** has not been played: `tools/coop.mjs` runs its scenarios over LocalTransport and RoomTransport. The web build was built (with a placeholder URL and key), not opened.
- **Peers are user ids** (36 characters, the room's are shorter): the snapshot's acks and reliable events, keyed by peer, take about a hundred bytes more; the snapshot's cap (3.9 KB) holds, a few fewer monsters at its margin. Not measured in a fight.
- **Not built**: a CAPTCHA on anonymous sign-ins; the cleanup of old anonymous users (Supabase has none: in the SQL Editor, `delete from auth.users where is_anonymous and raw_user_meta_data->>'app' = 'skotos' and last_sign_in_at < now() - interval '30 days';`, the game marking its users `app: 'skotos'`); names in the party frames (outside claude.ai they are the class and level); the Android wrapper; where the web build is hosted (the owner's choice).

## Tests

- `node tools/net/test-transport.mjs`: the stamped path against the fake client (signed in, private channels, sends by RPC, the games row): a forged `_by` or `f` in a page's data heard as its real sender; a page's own broadcast on a private channel refused; a message without the stamp dropped; a presence and a listing that say they host are shown and never taken, and hosting a room another holds is `taken`; a code with no game is `no_game`; the 4 KiB cap before the wire and at the server; a hundred sends at once, 80 go; thirty at once arrive in order, in a few calls; four pages at the game's rates for 8 s with nothing refused; the lobby stamped. `pickTransport` still refuses Supabase without `stamped: true`.
- `node tools/net/test-migration.mjs`: the migration on PGlite, twice; what `skotos.send` refuses and writes; the rate; the games; the tables closed; Realtime's join check for a signed-in page, the public key alone and another app's open policies; the definer's owner with and without `bypassrls`; what a party stores. PGlite is not one of the game's packages: `npm i --no-save @electric-sql/pglite@0.5.8` first, or `PGLITE=<its dist/index.js>`.
