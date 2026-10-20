# Co-op: progress

Branch `claude/skotos-coop`, from 564162f. Newest first.

- 20 Oct, later: the whole of it in place and tested. The session (`src/net/coop.js`): lobby, host and guest, puppets,
  stand-ins, the fx mirror, reliable events, rewards per player, downed and revive, the Act V tide and ice, the scaling
  (data.js `COOP`). The UI (`src/ui/coopui.js`): lobby panel, party frames, names, downed card, revive ring, title and
  pause entries. Scenarios passing (`tools/coop.mjs`): join, pack, loot, revive, churn, hostleave, cheat, act5, four,
  bosses (a boss of each act), room (RoomTransport against the fake room), ui. Docs: README, release, questions.
  Running: the full shipped-scenario regression; then the balance measurement (`balance-act.mjs --coop N`).
- 20 Oct: transports done and tested in node (`node tools/net/test-transport.mjs`): `src/net/transport.js` (RoomTransport,
  LocalTransport, SupabaseTransport, one channel shape, the budget held under the room's), `tools/net/fakeroom.mjs` (a
  faithful fake of the room capability: budget, 4 KiB, coalesced presence, loss, named rooms, topics).
