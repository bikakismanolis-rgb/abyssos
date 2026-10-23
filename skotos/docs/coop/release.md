# Co-op: what the lead does at release

1. **Merge** `claude/skotos-coop` (from 564162f). Files of mine only: `src/net/*`, `src/ui/coopui.js`, `tools/net/*`, `tools/coop.mjs`, `docs/coop/*`. The hooks in shared files are small and listed at the end of `README.md`; on a conflict keep both sides' lines.
2. **Publish with the capabilities** (the same artifact URL):
   ```js
   capabilities: {
     room: { topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } },
     user: { scopes: ['profile'] }
   }
   ```
   A non-empty `capabilities` is the whole set: if the artifact declares anything else by then, list it too.
3. **Check** on the published page: one signed-in browser hosts (Co-op → Host a game), another account with Contributor access joins by the code; the strict-CSP check as usual (the co-op code makes no other connection: everything goes through `claude.use('room')` and `claude.use('user')`).
4. **Tell the owner** how to invite a friend: Share → invite at Contributor (or Editor); the friend opens the link signed in, picks a hero, Co-op, enters the code.
5. **Later, the Android app / a public web build (Supabase): not before the server stamps who sent each message.** A guest trusts its host's messages (snapshots, the world, the ice, the end of the game) because the artifact's room stamps who sent them. Supabase Realtime does not: the sender rides in the payload (`f`) and the presence key is the client's own choice, so any client with the anon key and a game's code (the lobby lists them) could speak as the host to every guest. So `pickTransport` takes Supabase only when `netcfg.js` also says `stamped: true`. Before setting it:
   - Supabase Auth (anonymous sign-ins are enough) and private Realtime channels whose policies limit who may join.
   - The game's messages sent through a `SECURITY DEFINER` RPC or an edge function that calls `realtime.send()` and writes `auth.uid()` into the payload itself; `SupabaseTransport` then takes `peer` only from that server-written field and drops any message without it (the client-set `f` is never believed).
   - Who the host is decided from those server-stamped messages, never from presence (presence may show things, nothing more).
   - Then create the project (Realtime on), add `@supabase/supabase-js` (v2) to that build, and fill `src/net/netcfg.js`: `{ url, anonKey, createClient, stamped: true }` (import `createClient` from supabase-js there). Realtime's own rate (`eventsPerSecond`) is set to the game's budget (32). The host's checks are what keep a lying guest out; the server's stamp is what keeps a false host out.
   - **Realtime's rates.** A client may call `track()` only 5 times in 30 s (past that Realtime shuts the channel, broadcast and all): `SupabaseTransport` tracks once a channel and sends the game's presence as a broadcast, so that holds whatever the game does. The project's own limit is on messages a second, and it counts each message sent and each delivered: a party of four sends about 52 a second (the host's snapshots, each guest's presence and fx), about 210 events a second with the deliveries. The Free plan (100 a second) holds no party, Pro (500) about two at once, Pro without the spend cap (2,500) about twelve. Choose the plan (or ask Supabase for the limits) for the parties expected before opening the build; nothing in the game can hold a project-wide limit.
   (`tools/net/test-transport.mjs` shows a forged sender heard as named over the fake client, and `pickTransport` refusing Supabase without `stamped`.)
6. **Tests to run after a merge**: `node tools/net/test-transport.mjs`; `node tools/coop.mjs join|pack|loot|revive|churn|hostleave|cheat|act5|four|bosses|room|ui <out>` against a private no-HMR server (`BASE=http://localhost:<port>/`).
