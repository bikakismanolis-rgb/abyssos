# Co-op: progress

Branch `claude/skotos-coop`, from 564162f. Newest first.

- 20 Oct: transports done and tested in node (`node tools/net/test-transport.mjs`): `src/net/transport.js` (RoomTransport,
  LocalTransport, SupabaseTransport, one channel shape, the budget held under the room's), `tools/net/fakeroom.mjs` (a
  faithful fake of the room capability: budget, 4 KiB, coalesced presence, loss, named rooms, topics). Next: the session
  (lobby, host and guest), the game's hooks, the HUD and lobby UI, the multi-page scenarios.
