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
5. **Later, the Android app / a public web build (Supabase).** Create a Supabase project (Realtime on), add `@supabase/supabase-js` (v2) to that build, and fill `src/net/netcfg.js`: `{ url, anonKey, createClient }` (import `createClient` from supabase-js there). Nothing else changes: `pickTransport` takes Supabase when there is no artifact room and the config is filled. Realtime's own rate (`eventsPerSecond`) is set to the game's budget (32). Supabase does not vouch for who sent a broadcast: the host's checks are what keep a lying guest out.
6. **Tests to run after a merge**: `node tools/net/test-transport.mjs`; `node tools/coop.mjs join|pack|loot|revive|churn|hostleave|cheat|act5|four|bosses|room|ui <out>` against a private no-HMR server (`BASE=http://localhost:<port>/`).
