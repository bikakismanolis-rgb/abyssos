# Co-op on the free plan: the net diet (27 October 2026)

The public web build's co-op runs on the Supabase project **skotos**, Free plan: 100 Realtime events a second for the whole project and 2 million a month. Realtime counts each message once sent and once for every member of its channel that receives it, and a message from the database (`skotos.send` calls `realtime.send`) goes to every member, its sender too. A party of four at the room's rates (about 52 messages a second: the host's snapshots 10 a second, each guest's presence 9-10 and its fx) cost **about 280 events a second**: no party of four on the Free plan, one pair at a time.

Now a party of four costs **about 55-65** and a pair about 30. Only the Supabase path changed: the claude.ai artifact's RoomTransport and the tests' LocalTransport send as before (`tools/coop.mjs` on both: below), and no SQL changed.

## What changed (`src/net/transport.js`, the economy; `src/net/coop.js`)

On a stamped game's channel (`SupabaseTransport`, the web build's; never the lobby's, never the room's):

- **One message a moment.** What a page says goes together as one Realtime message, `b`: `[[event, data], ...]`, a newer presence in the place of one still waiting. It goes when its carrier is given (the host's snapshot or its end of the game, a guest's presence) and no call of the page's is on its way; anything else (the host's presence, a guest's fx, the outbox list) at most 200 ms later, 400 while carriers flow, so it rides with the next. An entry too big to bundle (a 3.3 KB chunk of the world beside a snapshot) goes as a message of its own in the same call, as before.
- **Guests say it into an outbox.** A guest's messages go to a topic of its own, `skotos:<room>.<the first 24 hex digits of its user id>`, which only its host joins (no presence there): a guest's message costs 2 events (sent, delivered to the host) where it cost 5 in a party of four. The topic is a `skotos.games` row the guest holds, made by the same `host_game` a host calls (so `skotos.send` takes it as a live game's topic, and no page can fill a topic nobody holds): **no new SQL**. The row is renewed every half hour and ended when the guest leaves, as a host's. The host takes there only what the server stamped (`_by`) with that guest's id.
- **The host passes it on.** In its own message the host adds each guest's last presence (less the fields only the host reads: its blows, acks, magic find, gold find, weapon damage, crit damage, `nd`) and its fx, as `[event, data, guest, ms held]`. A page takes such an entry only from its game's host (`ch.host`, the server's games row), only a presence or fx, never one naming the host or the page itself. The host was believed on everything already (snapshots, kills, items); it cannot speak for a guest in anything a guest's own word is checked for (blows, revives: those go to the host only).
- **The handshake.** A guest says `['_o', 1]` in the game's channel while its outbox is not heard; the host opens the outbox (six at most) and says `['_o', [the guests it hears]]` when that changes and every 3 s. A guest uses its outbox only while its host lists it (its last list under 8 s old) and is in the channel; otherwise it says everything in the game's channel, bundled, so a host that does not hear outboxes still gets it all, at a higher cost. A guest whose host has left says its next word in the game's channel and is refused `no_game`, as before.
- **Rates.** The host builds a snapshot at most 7 times a second, a guest its presence at most 5, and each only when it would go at once (`ch.ready()`: no call on its way). So a slow connection sends fewer, fuller messages instead of a queue. The presence beat (said again unchanged) is 3 s, not 1.5. The snapshot keeps room for what goes with it (`ch.room()`, at least 2.4 KB), so the moment fits one message.
- **Smoothness** (`coop.js`, only on such a channel). Interpolation was a fixed 130 ms behind. Now each buffer (a hero's, a monster's) measures the waits between its samples as they arrive and is shown that much behind and 50 ms more (130 to 520 ms), easing to a new lag at an eighth of real time so nothing jumps. A guest's sample passed on by the host is dated back by the time the host held it.

## Before and after

What a party sends and what Realtime counts (each message sent, each delivered).

**The model** (`node tools/net/test-transport.mjs`: stamped pages against the fake project of `tools/net/fakesupa.mjs`, each doing what the game does: the host a 2.5 KB snapshot at its rate and its presence once a second, each guest its presence when due and its fx every 200 ms; calls 0-60 ms):

| party | before (no bundles, the room's rates) | after | messages a second, after (host + each guest) |
|---|---|---|---|
| 2 | about 58 (live, 26 Oct) | **30** | 6.9 + 4.7 |
| 3 | about 150 (estimated: 37 messages, 4 events each) | **47** | 6.9 + 4.7 + 4.7 |
| 4 | **254** (280 with the game's fx and presence at full rate) | **64** | 6.9 + 4.7 × 3 |
| 4, calls of 0-300 ms | | **55** | 5.1-5.6 + 4.5 × 3 |

**The game in a fight** (`NET=supa node tools/coop.mjs four`: four pages of the real game in one headless browser, three guests striking a pack for 15 s, the fake project's calls answering in 110-170 ms, about the live project's from here): **57 events a second** (19 messages in 19 calls, 38 deliveries); the host 6.2 messages a second (23 KB), each guest 3.4-3.8 (0.8-0.9 KB); the host's snapshots average 2.5 KB; nothing dropped, nothing refused. The same with `ECON=0` (the channels as before): 156, but four pages on this container's few cores ran the old rates at half speed (the guests 4.8-7.8 messages a second where the game says 9), so that number is low; the live pair and the model give the old cost.

**Live** (the project **skotos**, from this container: calls 126-190 ms, median 130-135):

- `node tools/net/live-supabase.mjs` (the game's transport in node over supabase-js 2.117.3, ten seconds at the game's economy rates, every send and every broadcast every socket brought in counted, the outboxes' too): **a party of four 63.7 events a second** (6.9 + 4.8 × 3 = 21.3 messages sent, 42.4 delivered; the host 6.8 snapshots a second), **a pair 30.0** (11.6 sent, 18.4 delivered). Nothing given up, nothing refused. Each guest's outbox was made by `host_game` and heard by the host on the project as it is (no SQL changed).
- `PAGES=4 node tools/net/live-web.mjs` (the web build, four headless pages each a context: four anonymous users, a Warden hosting, a Mage, a Ranger and a Warden joining by its code): all four in the game, every party frame holding the other three, every guest on its outbox, a monster a guest struck dead on the host and paid on the guest, the host's end sending all three home; nothing refused, given up or answered 4xx/5xx. Its rate is no measure: four game pages on this container's four cores ran at 1-2 frames a second while walking (the host made 0.4 snapshots a second), so it counted 9.3 events a second. The pair (`live-web.mjs`): 15.4, at 11-12 frames a second, all 25 checks passed.

So a party of four is under the Free plan's 100 a second with room for a pair beside it, not two parties of four.

## What the monthly 2 million buys

Events a month are the Free plan's binding limit (`supabase.md`, Costs and limits):

| | before | after |
|---|---|---|
| a party of four | 2.0 party-hours a month (280 a second) | **about 8.5-10** (55-65 a second) |
| three | about 3.7 (150) | **about 12** (47) |
| a pair | about 9.6 (58) | **about 18** (30) |

A month of 30 days, so a party of four for about 17-20 minutes a day, a pair for about 35. An idle lobby costs nothing; a host's listing costs one message to every page in the lobby each time it changes and every 10 s (twelve hosts among 48 pages: about 59 events a second, as before).

The day's caps (`skotos.quota`, bytes, not events) come close to the same: a party of four now counts about 30 KB a second (the host's 23 KB of snapshots and the guests' outboxes, each message and 256 bytes for its row: 19 rows a second where there were 52), about 110 MB an hour, so the caps as made (40 MiB a day for the project, 40 for a user) allow about 23 minutes of a party of four a day (13-18 before). Egress: about 0.35 GB an hour of a party of four (each of the host's ~3.3 KB messages to four sockets, its own among them, and Realtime's envelope), so the Free plan's 5 GB a month is about 14 party-hours: past the messages' limit, not before it.

## Feel: what changed, and how it was checked

`NET=supa node tools/coop.mjs feel` (and `ECON=0`, and on LocalTransport): a host and two guests in town; one hero walks a circle (5 m, 5 m/s) and another page reads where it shows that hero every 16 ms for 12 s. *Behind*: how far back along the circle it is shown, against the walker's own clock (both pages by `Date.now()`); *cv*: the spread of its steps frame to frame over their mean (0 is even, 1 is jerky); *held*: the frames it did not move. The fake project's calls take 110-170 ms.

| view | LocalTransport (the claude.ai room's rates, no network) | Supabase before | Supabase after |
|---|---|---|---|
| the host, seen by a guest | 143 ms, cv 0.22, held 4% | 374 ms (p95 455), cv 1.28, held 11% | **381 ms** (p95 425), **cv 0.31**, held 5% |
| a guest, seen by the host | 143 ms, cv 0.22 | 369 ms (p95 429), cv 1.20, held 10% | **422 ms** (p95 458), **cv 0.26**, held 4% |
| a guest, seen by another guest | 143 ms, cv 0.22 | 379 ms (p95 443), cv 1.24, held 10% | **667 ms** (p95 751), **cv 0.30**, held 5% |

- **The host and its monsters, on a guest's page** (what a guest fights): as late as before, and smooth where it stuttered. Before, the fixed 130 ms lag was shorter than the gaps a 140-160 ms call one at a time makes, so a hero (and every monster) stopped and jumped several times a second; now the lag follows the gaps.
- **A guest on the host's page** (where its blows land, where the host checks its reach): about 50 ms later (5 presences a second, not 9), smooth. A guest's blow reaches the host on average 50 ms later than before; the guest sees its own blow at once, as before.
- **A guest seen by another guest** is about 0.3 s later than before: it goes by the host (a call to the host, the host's next message, a call back) and is shown with the longer lag such a path needs. This is the price of the outboxes, and only the look of the other guests' heroes and fx: the monsters they strike are the host's, and come at the snapshots' time. A guest may see a monster flinch a little before it sees another guest's swing that struck it.
- **Monsters on a guest's page** come 7 times a second instead of 10, each with its own lag; a big fight's snapshot is a little smaller when a guest's presence rides beside it (at least 2.4 KB of 3.9).
- Not measured: how it feels on a phone on a cellular connection (a slower call means fewer, fuller messages, not a queue: a slow page sends less), and a fight's feel by eye. The numbers above are headless pages on one machine.

## Checked

- `node tools/net/test-transport.mjs`: all parts, all pass, the new ones too: the party model above, and `econ` (a guest's outbox row made and ended; the host takes in an outbox only that guest's stamp; another's bundle naming a sender, a host's entry naming the host or the page or a host-only topic, another's outbox list, a bundle of more than 80 entries, more than six outboxes: all refused; a guest whose host has gone refused `no_game`). The old checks of the poster (a call that never answers) run on a channel with `economy: false`, and a new one on a bundling channel.
- `node tools/coop.mjs` on LocalTransport and the fake room, unchanged: join, pack, loot, revive, churn, hostleave, world, cheat, act5, four, bosses, room, ui, ux, access: all passed. On the fake Supabase (`NET=supa`): join, pack, loot, revive, churn, hostleave, world, cheat, act5, four, bosses, ui passed; `ux` fails one check, as it does with `ECON=0` (the channels as before): a mistyped code is refused `no_game` by the server and shown in the panel, where the LocalTransport test waits for the "no host" toast. Not the economy's; the scenario's wording for the local path.
- Single-player: `tools/scenario.mjs` combat, panels, ashfield, coast: passed.
- `npx vite build`, `npm run build:artifact` (no supabase-js in it), `npm run build:web`: built.
- Live: `live-supabase.mjs` (51 checks, and 49 with `--two`), `live-web.mjs` (25 checks) and `PAGES=4 live-web.mjs` (all passed): above. Only what the game does was done there: anonymous sign-ins (eight users), the game's RPCs, `skotos:` private channels, rooms `skotos-test-...` and the game's own codes, every game ended.
- Not verified: phones and cellular links; a fight's feel by eye; the live party of four at its full rate in browsers (the four pages were too slow here; the node run gives the rate). One earlier `PAGES=4` run, with the fourth page loading the game beside three playing it (2 frames a second), lost a guest from the game; the cause was not found (the run after it loaded all four first and passed, and a party of four throttled six times over in `coop.mjs four` held together).

## For the owner

Nothing to run: no migration. The web build carries it at its next deploy (the Pages workflow). If a guest's outbox cannot be made (its `host_game` refused, e.g. `quota`), that guest says everything in the game's channel as before, bundled: its party costs more, nothing breaks.
