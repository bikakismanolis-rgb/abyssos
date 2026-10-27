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
- Rates (economy): host snapshots 7 Hz, guest presence 5 Hz, presence beat 3 s. Interpolation lag adaptive per buffer.
- Budget four: 7 x 5 + 3 x 5 x 2 = 65 + world/ice/lobby. Pair 7 x 3 + 5 x 2 = 31.

## Steps

- [ ] transport.js economy (bundles, outboxes, relay, meter by wire message)
- [ ] coop.js: rates from the channel, adaptive lag, snapshot room, relay omit keys
- [ ] test-transport.mjs: stamped party of four at economy rates, events counted; relay/outbox security checks
- [ ] coop.mjs: NET=supa (the fake supabase in node via bindings), scenarios on it
- [ ] all co-op scenarios (local, room), single-player regressions, builds
- [ ] live-supabase, live-web (four pages)
- [ ] diet.md, supabase.md costs
