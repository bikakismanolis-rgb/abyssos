# Net diet: progress notes (branch claude/skotos-net-diet)

Task: a party of four on the Supabase free plan under ~85 Realtime events a second (today ~280), a pair far under,
RoomTransport (claude.ai) untouched. Report: `diet.md`; lead session session_01PwjhM4jRXTtNyMawnxVoaV.

## Design (decided)

Cost model: a message by `realtime.send` = 1 sent + 1 per member of its channel (the sender too).
- **Bundles** (stamped Supabase game channels only, "economy"): everything a page says in a tick goes as one Realtime
  message, event `b`, data `[[event, data], ...]` (`_p` replaced, not stacked). Flushed when a carrier is queued (host:
  `s`, `c`; guest: `_p`) and no call is on its way; anything else waits at most a gap.
- **Outboxes**: a guest hosts a second games row `<room>.<its uid>` (48 chars, the existing `host_game`: no SQL change)
  and sends there; only the host joins that channel (no presence), so a guest's message costs 2 events, not 5. The
  host hears it only stamped `_by` = that uid, and relays the guest's `_p` (host-only fields stripped) and `f` in its
  own bundle `[event, data, from]`; a guest believes a relayed entry only from its host (ch.host), only `_p`/`f`.
  Handshake: guest says `['_o', 1]` on the main channel; host opens the listener and lists the outboxes it hears in
  `['_o', [uids]]`; a guest uses its outbox only while its host lists it (else main, as before).
- Rates (economy): host snapshots 7 Hz, guest presence 5 Hz, presence beat 3 s. Interpolation lag adaptive per buffer
  (coop.js lagOf; a relayed sample dated back by the host's hold, sent as the entry's 4th field).
- Outbox name: boxOf = room + '.' + first 24 hex of the uid (live-supabase's rooms are 18 chars).
- Budget four: 7 x 5 + 3 x 5 x 2 = 65 + world/ice/lobby. Pair 7 x 3 + 5 x 2 = 31.

## Steps

- [x] transport.js economy (bundles, outboxes, relay, meter by wire message)
- [x] coop.js: rates from the channel, adaptive lag, snapshot room, relay omit keys
- [x] test-transport.mjs: partyRun (2/3/4 econ, 4 before), econ part (trust checks): all pass. Model: four 64, three 47,
  pair 30, before 254 events/s
- [x] coop.mjs: NET=supa (tools/net/fakesupa.mjs in node via bindings), ECON=0, `feel` scenario. four NET=supa: 57 ev/s
  (ECON=0: 156, CPU-bound pages). feel (calls 110-170 ms): host by guest 381 ms cv .31 (before 374, cv 1.28), guest by
  host 422 (369, 1.2), guest by guest 667 (379, 1.24); local 143 ms cv .22
- [x] builds: vite build, build:artifact (no supabase-js), build:web (.env.web.local made, git-ignored)
- [x] all co-op scenarios local/room: 15/15 pass; NET=supa 12/13 (ux: one check fails the same with ECON=0, not ours)
- [x] single-player combat panels ashfield coast pass; vite build, build:artifact, build:web
- [x] live-supabase 51/51 (+ econ 10 s: four 63.7 ev/s, pair 30.0 with --two), live-web pair 25/25, PAGES=4 pass (after
  loading all four pages first; an earlier run with the 4th page loading beside 3 playing at 2 fps lost guest B: cause
  not found, noted in diet.md)
- [x] diet.md, supabase.md costs, supabase-live.md, README
- [x] report sent to the lead

Done. Left for whoever follows: phones/cellular feel; a by-eye fight; the ux scenario's no_game wording on Supabase.
