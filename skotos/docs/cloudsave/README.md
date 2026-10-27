# Cloud saves

Until now a hero lived only in the browser's localStorage. Clearing the browser's data lost it, and so did switching phones. Cloud saves keep a second copy elsewhere:

- **In claude.ai (the artifact):** automatic, tied to the signed-in claude.ai account, in the artifact's `db` capability. Each viewer gets private documents under `data/users/<id>/`, and the id comes from the `user` capability.
- **On the web build (Supabase):** a persistent anonymous session per browser, plus a **save code** that carries the heroes to another device without an email address.

localStorage is still the primary copy, and the game works offline exactly as before. The cloud is a backup and a way across devices. Nothing in the cloud ever silently replaces a newer local hero.

## Files

| file | what |
|---|---|
| `src/game/cloudsync.js` | The sync itself. Pure: no game imports, runs in node. |
| `src/game/cloud.js` | Which cloud this page has, when to sync, and the state the UI shows (`CLOUD`). |
| `src/game/save.js` | `storedHeroes`, `playingId`, `putStored`, `dropStored`, the cloud's own record (`skotos.cloud.v1`), backups (`skotos.cloud.bak.v1`), `restoreBackup`; `deleteHero` now leaves a tombstone; `saveHooks`. |
| `src/net/cloudart.js` | Backend: the artifact's `db`. |
| `src/net/cloudsb.js` | Backend: Supabase (its own client and session, the save code). |
| `src/ui/cloudui.js` | A row in Settings and the Cloud save panel. Text is in `src/i18n/text.js` (`cloud.*`). |
| `supabase/migrations/20261027120000_skotos_saves.sql` | The web build's server side. **Not applied yet.** |
| `tools/cloud/test-sync.mjs`, `test-saves.mjs`, `fakes.mjs` | Node tests. |
| `tools/scenario.mjs` `cloud`, `cloudweb` | Browser scenarios. |

## The rules

Each hero is compared three ways:

1. the **local** record, exactly as stored;
2. the **cloud** record (its `rev`, a counter of writes, plus `played` and `sum`);
3. the **base**: what this browser and the cloud last agreed on (the cloud's `rev` and the hero's `sum`).

`sum` is a 53-bit hash of the hero's JSON with `played` left out. An autosave that only moves `played` therefore doesn't count as a change.

- **Changed on one side only:** goes to the other side.
- **Changed on both sides, or never agreed on:** the copy with the later `played` wins. The other copy is kept as a local **backup**, whichever way the decision went.
- **A cloud copy only ever replaces a local one after the call that fetched it has come back.** Whatever it replaces goes into the backups first, and a toast says so. An older cloud copy never replaces a newer local one.
- **The hero this page is playing is never replaced under it.** That includes a co-op guest's own record (`G.hero.__real`). Its turn comes at the first sync after it's put down.
- **Tombstones.** Deleting a hero records a tombstone locally (and the deleted record goes into the backups). The next sync writes the tombstone to the cloud. Another device that has the hero unchanged drops it (keeping a backup), and nothing brings it back. Only a copy played *after* the deletion (`played` later than the tombstone) survives it, on either side. A device keeps its newest 32 tombstones; so does a Supabase player.
- **Backups:** the last 6 replaced copies, on this device, newest first. A copy identical to one already kept isn't kept twice. Settings › Cloud save lists them, and one tap (then a second to confirm) restores one. Its current copy goes into the backups first, and the restored copy gets `played = now`, so it wins the next sync.
- **Old saves sync untouched.** What goes up is the stored JSON text, byte for byte. Supabase stores it as `text`, not `jsonb`, so key order and numbers survive. A v13/v14 hero comes back identical (`test-sync` "old saves", scenario `cloud` `oldField`).
- **Offline or failed calls change nothing locally.** A failed `list` ends the sync before anything happens. A failed `get` leaves that hero as it was. The base only moves after a write succeeds.
- **Two tabs:** one page of the browser syncs at a time (a Web Lock, `skotos-cloud`). A page that finds another one syncing leaves it to that one. A tab playing a hero keeps its stored record's `played` recent (autosave every 20 s, and on hiding), so a sync in another tab treats it as a local change and the newer `played` wins. The one gap: a tab left hidden for long while it plays, and another device playing the same hero meanwhile. Another tab may then take the other device's copy into storage, and the hidden tab's next save writes its own over it. The other device's copy survives in that device's backups (last write wins, as for two pages playing one hero, `docs/HANDOFF.md`).
- **When:** at start (the title); then only when something stored has changed (at most every 120 s while a hero is being played, every 20 s on leaving a zone). Other devices are checked every 10 minutes, and when the page comes back into view after a minute away. Settings has *Sync now*. When the page is hidden or closed, the hero being played goes up on its own (best effort, no list first). It's refused `conflict` if the cloud changed in the meantime, and the next sync handles it.
- **Account switch:** a base belongs to one account (`art:<uid>`, `sb:<player>`). A different account (a code taken, a different claude.ai user) starts with no base, so both sides merge and nothing is lost.
- **Limits, client side:** 96 KiB per hero (a real one is about 20 KB) and 12 heroes in the cloud. Past those, the extra heroes stay local only and Settings says why.

## claude.ai (the artifact)

There's one document per hero: `data/users/<uid>/h-<hero id>`, with body `{ k: 'hero', id, rev, played, sum, del, at, data }`, where `data` is the hero's JSON text. A write reads the document, checks that `rev` is the one expected, then writes `rev + 1`. The db has no transactions, so two devices writing the same hero within the same moment can both pass. The later write stands, and the earlier device still has its own copy.

If `claude.use('db')` or `claude.use('user')` resolves `null`, or `id()` is null, cloud save is off and the game behaves as before. Settings then says to sign in to claude.ai. That covers being signed out, an older viewer, and a page served outside claude.ai.

**Who can save:** by the db's rules, writing needs `interact` (Contributor) or above. The owner, invited Contributors and Editors, and organization members can save. **A signed-in visitor from outside the organization who came through the public link holds `view` and cannot write**, not even to their own `data/users/` subtree. For them the first write is refused `invalid_argument`, the game shows "view-only access cannot save to your account", and their heroes stay in their browser as before.

### The capabilities to publish (the lead)

A non-empty object replaces the full set, so it has to restate room and user:

```js
capabilities: {
  room: { topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } },
  user: { scopes: ['profile'] },
  db: { rules: [
    { path: '', read: 'owner', write: 'owner' },
    { path: 'data/users/{self}', read: 'interact', write: 'interact' }
  ] }
}
```

The root rule keeps everyone but the owner off the shared paths. The game uses none, and without the rule any Contributor could fill the artifact's 25,000 documents and break everyone's saves. The `{self}` rule lets each Contributor and up read and write only their own subtree. If the publish rejects the rules, `db: {}` (the defaults) also works. The only difference is that Contributors could then write junk to shared paths.

After publishing, check once with `ArtifactData` `list` on `data/users` at a Viewer's `as_level`: it should show nothing.

## The web build (Supabase)

### Identity and the save code

- The browser signs in anonymously **once** and keeps the session in **localStorage** under `skotos-save-auth`, with a client of its own. Co-op's session is per tab, in sessionStorage (`skotos-auth`), so two tabs are still two co-op players while both save as one browser. The save user is marked `app: 'skotos-save'`. The co-op cleanup query in `docs/coop/supabase.md` (`app = 'skotos'`) doesn't touch these users.
- A visitor who never plays makes no user: the build signs in only once there's a hero stored, or when a code is typed.
- The server links each user to a **player**, and the saves belong to the player. `save_hello()` creates a player for a new user, along with a **code**: 80 random bits (from `gen_random_uuid`) written as sixteen characters of Crockford base 32 and shown as `XXXX-XXXX-XXXX-XXXX`. The server stores only `sha256('skotos-save:' || code)`, so the code is shown once and the page keeps it in localStorage (`skotos.cloud.code`) to show again.
- **Moving to another device:** Settings › Cloud save › *Restore from a code*. Typing is forgiving: lower case, dashes and spaces are fine, and O/I/L are read as 0/1/1. The new device's user is linked to that player and syncs both ways. A device with no hero claims the player directly, without creating one of its own. If the device already had a player that nobody else uses, its heroes move to the code's player (unless the code's player already has that hero id), and the old player is deleted.
- **A lost session with the code still kept** (site data partly cleared, or the anonymous user removed from the project): the page signs in again and claims its kept code by itself.
- **New code:** the old code stops working, and devices already linked stay linked (for a code that was written down somewhere others could see it).
- Guessing a code: 5 tries per user at once, then one every 2 minutes, and Supabase allows 30 new anonymous users per hour per IP. Against 2^80 codes that's hopeless.

### Bounds (so no visitor can fill the 500 MB free database)

| what | bound |
|---|---|
| one hero | 96 KiB of JSON text (`too_big`) |
| heroes per player | 12 live (`too_many`) and the newest 32 tombstones |
| writes per player (put, delete, new code) | 20 at once, then one every 5 s (12 a minute) (`rate_limited`) |
| code tries per user | 5 at once, then one every 2 minutes |
| the project's saves | `skotos.save_quota.bytes_cap`, 64 MiB as created (each row counted as its data plus 200 bytes) (`quota`) |
| the project's players | `players_cap`, 20,000 (`quota`) |

A hero is about 20 KB, so 64 MiB holds about 3,000 one-hero players or 270 players with 12 heroes each. Text over 2 KB is TOAST-compressed on disk, so the real footprint is smaller. Co-op's own cap keeps `realtime.messages` under about 250 MB. Together with Supabase's own ~50 MB, the free plan's 500 MB holds. To change the caps: `update skotos.save_quota set bytes_cap = ..., players_cap = ...;` (running the migration again keeps them). Check with `select bytes, bytes_cap, players, players_cap from skotos.save_quota;`.

Security: every table has RLS on with no policy and no grants. Every page function is `SECURITY DEFINER` with `search_path = ''`, executable by `authenticated` only (never `anon`), and finds the caller's player from `auth.uid()`. Another player's hero reads as missing. The helpers (`save_make_code`, `save_hash`, `save_player`, `save_spend`, `save_norm_code`) aren't executable by pages.

### What the owner or lead must run

1. **Apply the migration** `supabase/migrations/20261027120000_skotos_saves.sql`: paste it into the SQL Editor of project **skotos** (ref `twabjiurbqhqmxzcokqj`) and run it, or use `npx supabase db push`. Running it again changes nothing. The schema `skotos` is already exposed and anonymous sign-ins are already on (co-op).
2. Rebuild and deploy the web build (`npm run build:web`, via the Pages workflow as before). Nothing new in the environment.
3. Then the live check: open the site and play a hero for a moment. Settings › Cloud save should say *On*, with a code. In a private window, type the code and the hero should appear. In the SQL Editor: `select count(*) from skotos.saves; select * from skotos.save_quota;`.
4. Optional, after a while: the Security Advisor lists the seven `save_*` functions as definer functions callable by signed-in users. That's intended, the same as co-op's four.

Clearing old players (not built; for the owner if the database ever grows): `delete from skotos.save_players where used_at < now() - interval '1 year';` (cascades to the saves; then fix `save_quota` with `update skotos.save_quota set bytes = (select coalesce(sum(bytes),0) from skotos.saves), players = (select count(*) from skotos.save_players);`).

## Tests

- `node tools/cloud/test-sync.mjs`: the rules over the artifact backend and a fake artifact db (60 checks). Covers: no backend when signed out or on an older viewer; first sync both ways; played-only changes; one side changed (with backup); conflicts both ways; first meeting of two copies; the hero being played is kept; tombstones (dropped elsewhere, never brought back, a later play outlives one, a new device); offline and a failed get change nothing, and an offline deletion goes up later; v13 records byte for byte; size and count limits; a read-only viewer; another account; `pushOne`; two pages at once.
- `node tools/cloud/test-saves.mjs`: the migration on PGlite (run twice), then `cloudsb.js` and the sync over a fake supabase-js client whose RPCs run as the signed-in user in that Postgres (86 checks). Covers: closed tables and helpers, pinned search_path, definers; codes (random, all 32 symbols, only a hash kept, typed codes normalized); put/get/list/conflict/rev; the text kept byte for byte; bad data, too big, another player sees nothing; tombstones and their pruning; 12 heroes, the rate, the project's bytes and players; claims (rows moved, the old player gone, counts follow, bad codes, tries limited); new codes; two devices joined by a code; a lost session recovered by its kept code; offline. Needs `npm i --no-save @electric-sql/pglite@0.5.8`.
- `node tools/scenario.mjs cloud <out>` (fake claude.ai db in the page): heroes go up untouched; a new device fills the title from the cloud; a newer copy replaces a resting hero (with a backup) but never the one being played; a co-op guest's record; a deletion becomes a tombstone; Settings row, panel, backups, Sync now; going away pushes the played hero; signed-out and no-claude views are the game as before.
- `node tools/scenario.mjs cloudweb <out>` (`?cloud=fake`, an in-page fake Supabase with the migration's rules in short): a hero goes up, its own session key in localStorage, the code hidden, shown and copied; another browser with no hero (state idle, no sign-in) types the code and gets the hero.
- Unchanged and passing: `save13`, `save14`, `title`, `panels`, `combat`, `coast`; `npx vite build`, `npm run build:artifact` (no supabase-js in it), `npm run build:web`.

## Not verified

- **Live Supabase:** the migration has run only on PGlite with stand-ins for `auth.uid()` and the roles. Not checked: PostgREST finding the new functions (the schema is already exposed), real latency, and supabase-js's handling of two clients in one page (co-op's and the save's: different storage keys, so separate sessions; supabase-js may warn about multiple GoTrueClient instances in the console). After applying the migration, run `LIVE_BASE=<site> node tools/net/live-web.mjs` for co-op as before, then the manual check in step 3 above.
- **The artifact's db for real:** only a fake shaped on `db.d.ts` and `user.d.ts` (contract 0.2.91). Not checked: the published rules, a view-only visitor's refusal on the real platform, and the db's real latency and rate limits (`resource_exhausted` maps to `rate_limited`; the sync just tries again later).
- Web Locks in old browsers: without `navigator.locks` every tab syncs on its own. That's still safe (rev checks, `conflict`), just more calls.
- Clock skew between devices: "the later `played` wins" trusts each device's clock. A device far ahead could win a conflict it shouldn't. The other copy is still in the loser's backups.
