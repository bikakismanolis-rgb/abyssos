# Act VI stage B: report (10-11 November 2026)

One session did every lane of stage B in turn on `claude/sleepy-tesla-4030vd` (no parallel agents); the lanes' file
ownership was kept for where things live. The detail, file by file, is in `stageB-progress.md`. This report gives the
state against G2, what differs from the contract, and what is left.

## What is in

- **Systems:** the Carried Fire (light.js), the black water's clock, the Mere's own level and slush (tide.js), the vault's
  icicles and shards (forge.js), the Names from Above (light.js, story.js `rollNames6`), the Cold's new sources and sinks
  (cold.js), the act's Shroud (combat.js), the skills' ground blows on the vault (skills.js, skillsx.js), the build's
  fires and the skylights as pools (`fireEnter`).
- **Combat:** the Lampbearer, the Faded, the Gate-Fallen and its Bowman, the Falselight, the Ketling (data.js rows, ai.js
  traits and AIs), the ten packs, BOONS[6], the two legendaries and `legKey`, `actHaz`, the kill refills, lightRest, the
  stand-ins (actors.js), the class hooks below the ice.
- **Progression:** the Lamplight track (13th Mastery row, `ringPct`, `lampBonus` on every base ring).
- **Net:** protocol 5 (`VER = 5`): rings, light pools, the Mere, the names' window, the shards and slush on 'i', the Drink
  and ring blows on a guest, the lit bit, act6 in the world, the act's bosses for pay, the vendors below the ice; a
  guest's own slush and vault falls done on the host (below); 'i' sent with the host's snapshot (below).
- **Look:** the Faded leave footprints in the snow while unseen (ai.js `unseenTick`: one each 0.4 s within 8 m of her).
- **HUD hooks:** the flame beside the Cold, the violet dial.

## G2 (run in this session; one browser at a time, a no-HMR dev server)

| item | result |
|---|---|
| `carry`, `blackwater`, `drips`, `names6`, `lure` | pass (as functional scenarios; not yet as long soaks) |
| `foes6` (this lane's own: the new creatures) | pass |
| `cast6` (stand-ins in a cold session) | pass: the Falselight as the spider, the Ketling as the Icemaw, the Faded as a villager |
| `prog6` | pass: 13 tiles at 844 x 390; Act IV 6 -> 7.9 m at rank 40, under the swell; FIRE.max 5.92 m; S.over unscaled |
| `coop.mjs act6` | pass (21 checks, with a guest's slush and falls through the host and back) |
| `coop.mjs darktele`/`darkmirror` | darkmirror pass |
| new phone texture | none added (every new body is a stand-in; no silt pack yet) |
| perf6, full (q1, 5 cycles, seeds 5,3,3, alone on the machine) | pass at q1: vsField hollows 0.893, mere 0.765, wood 0.877, village 0.837, hearth 0.647; world 0.796 / 0.709 / 0.782 / 0.657 / 0.637; the crowd's term 0.98-1.04, never dearer (every pooled interval reaches under 1.00). G1's: 0.867 / 0.738 / 0.825 / 0.893 / 0.660. The short run's village 0.978 was its few draws. The q1 half took 95 minutes here; q0 (not gated) was stopped there and is not reported. The terms were reduced from the run's logged visits with `perf6Out` (the scenario prints them only at its end) |
| Budget (`NET=supa node tools/coop.mjs budget6`, new) | pass but for one snapshot in nine runs (below). A party of four in the Keels under the vault, the host and a guest Mage casting Frost Novas, the guest Warden's Quakes and the host's Meteors bringing the vault down (4-8 falls a run), the others striking 10 of the act's creatures, 20 s. **50-56 Realtime events a second** (the diet's 55-65); **`relayStats.cut` 0**, each guest's relayed presence 166-174 bytes (`RELAY_PRES` 640); the host's snapshot about 1010 bytes; 'i' 1.5-1.65 a second of about 330 bytes (the live shards and slush calls, through `sendBig`). **`ch.room()`** beside the snapshots: at least 2427-2867 bytes in eight runs; in one, one snapshot of 122 had 2323, with no 'i' sent within 450 ms of it (the guests' looks and presences the host passes on, a Quake's among them); that snapshot, about 1 KB, still fitted. The same party and skills in the forest (`ZONE=forest`: nothing of Act VI sent, no vault), three runs: 49-55 events a second, room at least 2562-3206 bytes, 880-940 bytes a snapshot. **Day caps** (40 MiB): the forest 13.7-16.7 KB a second for the project and 9.0-10.1 for the busiest user, about 42-51 and 69-77 minutes of a party of four a day; the Keels 15.5-18.6 and 10.0-11.4, about 38-45 and 61-70 minutes: the act costs about a tenth. This harness's fight is lighter than the diet's (its 23 minutes). LocalTransport: pass (no bundling there: 9 snapshots a second). The claude.ai room (`NET=room`, the fake room): pass, no budget drop or refusal, each page's peak 9-12 sends a second (the room allows ~40). The test tells the host of its own jumps as entries (`P.mzk`), as the game does for a guest entering by the host: the host holds a guest to a run along the floor, and a 27 m teleport walked over the Keels' blocked cells could stick there |
| regress-B | coast, tower, tide (4 cycles), ashfield, combat, ranger, mage, skillsfx, progpanel, skills5, progress, diff6, cp5, test-sync (263), test-transport; coop join, act5, world, loot, cheat, pack, four, bosses, darkmirror; `NET=supa` join, four (56 events a second in the forest, under its 85), cheat: pass or no fault (the older scenarios print numbers, not a pass). Again after the net changes below: coop act6, join, act5, world, loot, cheat, four, pack, darkmirror, `NET=supa` join, four, cheat; carry, blackwater, drips, names6, lure, foes6, coast, tide, skills5, skillsfx below the ice, test-transport, test-sync: pass. Two test races fixed on the way: `drips` read the first blow on the hero, which the monster beside her could land before the icicle; `coop.mjs act6` put its Lampbearer 8 m off in any direction, at times out of its sight (its Drink needs it) |
| `skillsfx` below the ice (`ZONE=drained`) | every skill and variant of the three classes deals its damage there but the War Cry's three (no damage by design, as in the forest). A first run showed the Warden's Bulwark and Dawnbreaker at 0: the test's fault, not the game's (a Charge left her facing a wall, so no dummy could stand before her); the scenario now puts her back at her start before each cast |

## Different from the contract (to be judged by the lead)

- **No downloads** from this container: the Ketos and the Falselight have no built bodies (`tools/creatures/act6`); their
  stand-ins hold (`cast6`). pack-silt is not built either; its layers' chains stand in (rime), as at stage A.
- **The relight** is a second standing in true lamp light, not a tap on an interactable (the act's lit things are not yet
  interactables with `use`; stage D can add the tap).
- **The Lampbearer's lamp** is the code sea-lantern with a dark violet flame (`blackLamp` in models.js), not the rime
  pack's oilLamp; **the Faded's blow** is people.js's `punch` (Punch_Cross).
- **Dawnbreaker and the Ray of Dawn** light the unlit in a 3 m way along the aim for 1.5 s at the cast, not along their
  moving waves.
- **The Shroud's reveal**: a hit in light adds Revealed (x1.25) to that same blow, not only after it.
- **The names' window** opens with the 1.5 s bell inside it (its fill runs from the bell).
- **Net:** the guest's `lit` blow option and the 'u' interactables are not in (their things come with stages C-D).
- **Net, added (not in the contract):** a guest's own slush (Frost Nova, the Frozen Orb's trail) and its own vault falls
  (its skills' blows, its own high water) were done only on its page and wiped by the host's next 'i' within 3 s. As
  Act V's cracks (`NET.h.iceOp`), they now go to the host as 'ic' events, `'s'` (r ≤ 6, t ≤ 8), `'v'` (r ≤ 4, n ≤ 3),
  `'vl'` (≤ 14 m, w ≤ 2.5) and `'vr'` (r ≤ 8), each within 28 m of the guest's stand-in, and come back to every page on
  'i'; nothing falls on a guest's own page, and its slush is kept there for 1.5 s until the host's copy arrives
  (`cells6Apply`). `coop.mjs act6` asserts it.
- **Net, the 'i' timing:** in act-6 zones the host sends 'i' in the same tick as a snapshot, just before it, and where
  the channel bundles only while that snapshot keeps 2.4 KB of room (else at a later snapshot, 1.5 s at most). Sent on
  its own clock, a 330-byte 'i' left a snapshot under 2.4 KB about one run in two. For the lead: the one dip left (above)
  is the host's relay of its guests' looks, the transport's (up to eight fx waiting); a cap on what is passed on while a
  snapshot is short of room would close it, a transport.js change outside this act.

## Left after stage B

- **The soaks as long runs:** `carry`, `blackwater`, `drips` pass as functional scenarios; there is no long-run harness
  for Act VI yet (Act V's `soak5.mjs` covers the tide and the ice only). To build with stage C's gate.
- **The Faded's veil** (look); the guest's `lit` blow option and the 'u' interactables (stages C-D); the Ketos's and the
  Falselight's own bodies (stand-ins hold: no downloads from this container).
- **The owner's own test** of the Frozen Coast on his phone.
- Then **stage C**: the Ketos and the Shade, balance.
