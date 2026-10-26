# Co-op on the live Supabase project (26 October 2026)

The project **skotos** (`https://twabjiurbqhqmxzcokqj.supabase.co`, Free plan, eu-central-1) with `supabase/migrations/20261026120000_skotos_coop.sql` applied, anonymous sign-ins on and the schema `skotos` exposed, as `supabase.md` (Setting up a project) asks. Everything below ran from this repository's container (its traffic leaves near Washington: Cloudflare's IAD), so each request crossed the Atlantic to Frankfurt and back. Nothing of the project's schema or settings was changed: no SQL, no setting, no service key, no user deleted. What the tests did there: anonymous sign-ins, the game's four RPCs on rooms named `skotos-test-...` (the node test) or the game's own four-character codes (the browser test), and private `skotos:` channels (and in two early runs a public channel of a test room's name: below); every game hosted was ended, and the rows the functions keep (the games, each user's rates, the day's count) and Realtime's messages are what any game leaves.

Two tools, both in `tools/net/`:

- `node tools/net/live-supabase.mjs [--sessions <file>] [--two] [--public]`: node 22, the real supabase-js 2.117.3. Part 1 calls supabase-js directly, for what the transport hides by design (the server's refusals, who hears what, a page's own echo, a page's own broadcast, which the transport never makes); part 2 runs the game's `SupabaseTransport` (stamped) over the same live clients. `pickTransport`'s sign-in wants a browser's `sessionStorage`, so the browser test runs it. About a minute; `--sessions` keeps the four users' sessions in a file of the caller's, so a second run signs nobody new in.
- `node tools/net/live-web.mjs [outdir]`: the web build (`npm run build:web` first, from `.env.web.local`), `dist-web/` served by a static server of the tool's own, one headless Chromium (SwiftShader, as `tools/scenario.mjs`), two pages in two browser contexts (two anonymous users), the game's own UI, nothing faked. `CHROME_ARGS` adds flags, `PROFILE=1` records a CPU profile of each page while both walk.

## Results

### Node, supabase-js and the transport (`live-supabase.mjs`, 44 checks, all pass)

| | check | result |
|---|---|---|
| 1 | no session: an RPC is refused | pass: `42501 permission denied for schema skotos` |
| 1 | two anonymous users signed in | pass |
| 1 | `host_game` by A | pass: `ok` |
| 1 | `host_game` of the same room by B | pass: `taken` |
| 1 | `game_host` (asked by B) is A | pass |
| 1 | `game_host` of a room with no game | pass: `null` |
| 1 | signed in: the game's private channel and the lobby joined | pass: `SUBSCRIBED` in 290-410 ms |
| 1 | and at the first try | pass (the very first run did not: below) |
| 1 | no session: the private channels refused | pass: `Unauthorized: You do not have permissions to read from this Channel topic` |
| 1 | `skotos.send` by the host taken | pass |
| 1 | the guest hears it, `_by` = the host's user id | pass: payload `{ d, id, _by }` |
| 1 | `realtime.send`'s own id on it, the data inside `d` as the page's text | pass |
| 1 | a guest's forged `_by` and `f` inside its data: the stamp is still the guest's | pass |
| 1 | a fourth element, or data not a string: `invalid_argument` | pass |
| 1 | the page with no session heard none of it | pass: 0 |
| 1 | the lobby heard none of the game's | pass |
| 1 | a page's own broadcast on the private channel: never delivered | pass: by the socket (acked) `error`; `httpSend` refused `Unauthorized`; REST `/realtime/v1/api/broadcast` answered 202 and delivered nothing |
| 1 | presence tracked on the private channel, seen by the other | pass |
| 1 | 4096 bytes of data taken and heard, 4097 refused | pass: `too_big` |
| 1 | data that is not JSON | pass: `invalid input syntax for type json` |
| 1 | a topic with no live game | pass: `no_game` |
| 1 | a guest's sixteen messages of 4 KiB at once | pass: `rate_limited`, nothing sent |
| 1 | seventeen messages in a call | pass: `invalid_argument` |
| 1 | `end_game` by a guest leaves the host's game | pass |
| 1 | `end_game` by the host frees it: `game_host` null, a send `no_game` | pass |
| 1 | and another may host it then | pass |
| 1 | a pair, 30 messages: each heard by the other once, stamped right | pass |
| 1 | four users join | pass |
| 1 | four, 32 messages: each heard by the three others once, stamped right | pass |
| 2 | `SupabaseTransport` (stamped) over each live client | pass |
| 2 | the host's join makes the game and says it hosts (`ch.host`) | pass |
| 2 | each guest's join is told its host by the server | pass |
| 2 | a join of a code with no game | pass: `no_game` |
| 2 | every channel connected (private, signed in) | pass |
| 2 | every page lists every other, named by the server, with its presence | pass: in 2-3 s (the `_p` beat) |
| 2 | the host's 20 snapshots: every guest hears all, in order, from the host | pass |
| 2 | its own, back from the server, passed over | pass |
| 2 | a guest's forged `_by` and `f`: the host hears it from the guest | pass |
| 2 | a 5 KB message refused before the wire | pass |
| 2 | five seconds of a party of four (gentle rates): nothing refused | pass |
| 2 | the host has every guest's last presence | pass |
| 2 | the host leaves: every guest sees it gone | pass |
| 2 | and the game's row is ended | pass |
| 2 | a guest's send after it: `no_game`, the game ended for that page | pass |

Measured (the last run, after the changes below; over the three full runs the medians were 139-163 ms, the p95s 167-441 ms):

| | min | median | p95 |
|---|---|---|---|
| the call (`skotos.send` round trip), a pair | 132 ms | 139 ms | 167 ms |
| send to heard by the other, a pair | 136 ms | 142 ms | 171 ms |
| send to heard by another, four | 137 ms | 150 ms | 373 ms |
| the transport: `emit` to heard by a guest | 135 ms | 156 ms | 441 ms |

- **Latency**: a message is heard by the others about when its call returns (the commit, then Realtime reading the WAL, adds a few ms). From here that is one transatlantic round trip and a little; for players near Frankfurt it should be some 30-60 ms, not measured. A message that waits for the call before it (one call on its way at a time) waits up to one more round trip.
- **Deliveries**: every message reaches every member of the channel, **its sender too** (2.00 deliveries a message in a pair, 4.00 in four), whatever `broadcast.self` says: a broadcast from the database has no sender's socket to leave out. As `supabase.md` (Costs) counted it.
- **The first private joins on the project** (the first run of all) were refused once: `MissingPartition: Realtime was unable to find the expected messages partition`, the game's channel on two clients, while the lobby's joins a moment later went through. Realtime had not made that day's partition of `realtime.messages` yet and made it on the refusal; every join since went at the first try. A page needs nothing for it: the client joins again by itself (Phoenix's rejoin: 1, 2, 5, 10 s) and the transport's channel connects then. It may come back after the project has been idle for days (the partitions are made a few days ahead while Realtime runs for the project). A `skotos.send` before that partition exists would be lost with only a warning in the Postgres logs (`realtime.send` catches its own errors); a page always joins before it sends, so the join's refusal makes it first.
- **Public channels** (`--public`, run twice before it was made opt-in; the game never joins one): a channel of the same name without `private` could be joined by a signed-in page and by the key alone (the project's *Allow public access* is on), it heard nothing of the game's channel, and a broadcast on it did not reach the game's. Another channel, as `supabase.md` says.

### The web build in a browser (`live-web.mjs`, 24 checks, all pass)

| check | result |
|---|---|
| the build carries the project's URL and key, and supabase-js in a chunk of its own | pass |
| both pages picked `SupabaseTransport`, stamped (the build's own choice) | pass |
| two anonymous users, one a context | pass |
| A made a Warden through the title (tap, New, the card, Go, the intro skipped) and is in its town | pass |
| B made a Mage and is in its town | pass |
| A hosts from the panel: a code, and the server says A hosts it | pass |
| B's lobby lists A's game | pass: `<code> warden 1 1/4` |
| B joined by A's code: A's roster has it | pass |
| B is A's guest, its host the server's word (`game_host`) | pass |
| A pressed Start: B is in A's world (A's town) | pass |
| A sees B: its party frame and B's hero | pass |
| B sees A: its party frame and A's hero | pass |
| B's hero on A's page stands where B put it | pass |
| B sees A's monster (the host's snapshot) | pass |
| the monster B struck is dead on A | pass |
| and dead on B, the kill counted on B's own hero | pass |
| every message the host said came to the guest and back to the host itself, once | pass |
| nothing the server refused, no drops | pass |
| A ended the game from its panel | pass |
| B is back in its own town, its own hero | pass |
| B was told the host has gone (`coop.hostLeft`) | pass |
| B's hero as it was | pass |
| no `#fatal` on either page | pass |
| no console errors on either page | pass (one run before the fix below: a refused call, 400) |

- **Start**: co-op is ready 1.3-2.7 s after the title shows (the supabase-js chunk loaded, the anonymous sign-in, the lobby joined; in the runs with software compositing, where the title's drawing took the cores, 5-10 s).
- **A pair at the game's rates** (both heroes walking, 60 frames a second, 10 s on the wire): the host 10.1 messages a second (9.0 snapshots, 1.0 presence, the world now and then) in 4.1 calls; the guest 9.2 presences in 4.1 calls; each page's socket brought in 19.3 broadcasts a second (the other's and its own), 6.8 KB a second. So **19.3 messages sent and 38.6 delivered: 58 Realtime events a second**, as `supabase.md` estimated (about 60), under the Free plan's 100. A guest standing still says about one presence a second (its heartbeat field), the host still 9-10 snapshots.
- **Frame rate in this container**: with the default flags (SwiftShader, GPU compositing in software on four cores) the two pages ran at 60 frames a second standing and at 5-6 while both walked, so the host sent 5-6 snapshots a second, not 10. The pages' own scripts were 93-95% idle meanwhile (`PROFILE=1`: supabase-js's `fetch` 46-61 ms and its decoding of broadcasts 9-14 ms in 10 s); one headless GPU process used about three cores. With `--disable-gpu-compositing` both pages walk at 60 and the game sends at its rates. Single-player pages, and two pages over LocalTransport in one context, walk at 60 with the default flags. What holds the frames there is this container's software compositing, not the co-op's script; how a party over Supabase runs on a phone is for a phone to show.

## What failed, and what was changed

1. **A host's last messages could be refused `no_game`** (`src/net/transport.js`). One browser run logged a console error on the host's page as A ended the game: a call to the project refused, 400. That run did not record the call's answer (the tool does now); the one refusal the code allows at that moment is this. The host's page sends its last messages (the game's end, told to its guests, and whatever presence was waiting), then its channel's `leave()` called `end_game` at once, while the poster's next call could still be on its way: two requests side by side, and `end_game` could commit first, so that call's messages were refused `no_game`. The guests were told all the same (the end message itself is awaited before the leave), but a message was lost and the browser logged the refusal. Now the poster says when everything said so far has had its answer (`post.settled()`), and the host's row is ended only then. `tools/net/test-transport.mjs` has the race (a send on its way and one behind it when the host leaves); it fails without the change, 3 runs of 3. Not seen live since (one run at 60 frames a second, one at the default flags, no refused call).
2. **The channel's meter counted presences never sent** (`src/net/transport.js`). The Supabase wire passes over a presence unchanged since it was said a moment ago (one that says nothing new costs Realtime events), but the channel had counted it and taken a token for it first: a guest standing still showed 9 messages a second on its meter (the Co-op panel's numbers) where the wire carried one. The wire now says beforehand that it would not send (`wire.idle`), and such a presence costs nothing and is not counted; one said again by another, the same, is counted as heard. Measured after: what each page's meter says it sent agrees with the wire within 0.2 messages a second.
3. **Nothing in the migration had to change.** Every refusal, cap and stamp the SQL promises held on the project, and the join checks (a signed-in page may hear and track presence on `skotos:` topics, never broadcast there; the key alone gets nothing) behave as `test-migration.mjs` modelled them. No new migration file.

After the changes: `node tools/net/test-transport.mjs` (100 checks), `node tools/net/test-migration.mjs` on PGlite 0.5.8 (72 checks), `npx vite build`, `npm run build:artifact` (no supabase-js in it: none of its library's code in `dist-artifact/`, only the transport's own word `supabase`, as before) and `npm run build:web`, then both live tools again: all pass.

## What still needs a person

- **Phones.** Two real phones on different networks (one on mobile data), the web build hosted: a party of two for some minutes, a phone that sleeps or switches network mid-game (the 5 s deadline of a call, Realtime's reconnect, a channel joined again), a tab in the background for minutes (browsers slow its timers: Realtime's heartbeat), and the frame rate.
- **A session past an hour.** The anonymous session's token lasts an hour; supabase-js refreshes it and gives Realtime the new one. Not run here (the tests take minutes).
- **Hosting** `dist-web/`: where is the owner's choice (any static host over HTTPS; a Content-Security-Policy, if the host sets one, must allow `connect-src https://twabjiurbqhqmxzcokqj.supabase.co wss://twabjiurbqhqmxzcokqj.supabase.co`).
- **The plan.** Measured: a pair is 58 Realtime events a second, a party of four would be about 280 (`supabase.md`): the Free plan's 100 a second holds one pair at a time, no party of four. Pro (500 a second) or more for parties of four, and the day's caps (`skotos.quota`) set for it.
- **What only the dashboard shows**: the Postgres logs for `WarnSendingBroadcastMessage` (a message `realtime.send` could not write: none expected after the partition above), the day's bytes (`select day, bytes from skotos.quota;`), and the size of the day's `realtime.messages_<date>` partition against them (`supabase.md`, Costs). The tests sent a few thousand messages today, a few MB; Realtime drops them after three to four days.
- **The test users.** The runs signed in about 30 anonymous users (the node test's four, `raw_user_meta_data` `{ app: 'skotos', test: 'live-supabase' }`, kept for its next runs; the browser test's two a run, `{ app: 'skotos' }`, as the game marks its players). As far as this branch knows no one else has the build yet, so every anonymous user marked `app: 'skotos'` made on 26 October is a test's. If the owner wants them gone (only the owner may), in the SQL Editor: `delete from auth.users where is_anonymous and raw_user_meta_data->>'app' = 'skotos' and created_at < '2026-10-27';`
- **Optional**: the project's Realtime *Allow public access* may be turned off if no other app on the project uses public channels (the game uses only private ones; the public channels of the same name are harmless to it, but open to anyone with the key).
