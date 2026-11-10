# Act VI stage B: progress notes

Kept as the work goes (the container restarts every few hours). Branch `claude/sleepy-tesla-4030vd`. Started 10 November.
One session does every lane in turn (no parallel agents); the lanes' file ownership still holds for where things live.

## Systems (part 1, 10 November): done, scenarios pass

- **light.js**: the Carried Fire (`FIRE`, `fireOn`, `fireMax`, `fireDrain` with the Lure-bone's half and the Shade's Ring's
  floor, `fireFill`, `fireRelight`, `fireEnter`, `flareRing`, `ringOf` with the lantern chain, `setRemoteLight`,
  `lampBonus`, `FIRE_LOG`); `heroLightR` is `ringOf(G.player)` below the ice; `lightAt` counts remote rings and pools;
  `shroudOn` includes 'under'; `shroudK`; `skyAt`; `LIGHT.base` from `baseRing()` each frame (the Lamplight bonus, capped
  0.5 m under Act IV's swell); Dim pulse, Out's 4 m own light. `fireEnter` lays the build's fires (L.lights, flicker 0.35 or
  'tremble') as lamp pools 'fire6' (pot 3 m, brazier 4 m, fire-pit 5 m, her fire 5 m) and the skylights (L.spots.sky) as
  `sky` pools 'sky6'. The Names from Above: `NAMES`, `namesTick` (bell, 1.5 s, then the window HAZ6.namesBase + 0.5 s a
  stone; the names keep falling 0.8 s apart to the last), unlit foes Revealed for the window, skylights halved 10 s at high
  water. `setNamesRoll` takes story.js's `rollNames6`.
- **Deviation:** the relight is "a second in true lamp light" (no tap on an interactable): the act's lit things are not yet
  interactables with `use` (stage D); standing in their light for 1 s is the same touch on a phone. Write it in the stage
  report; story may add a tap later.
- **cold.js**: gains doubled while Out; a skylight -6/s.
- **tide.js**: `L.tideCfg` clock (x HAZ6.tide / 120, top hMax / 0.15, `iceGroan`, HAZ6.wash); the bay channel from
  `L.pocket === 2`; the Mere's own level (`z.tide.mere`, `mstep`, `mh`, `mu`; `mereStepTo`, `mereTick`; one `batch()` for
  both); `resetTide(z, { mere })`; slush (`slushAt`, its calls, batched every 0.25 s, `slushSet` for the crust, the lane's
  grace when it thaws); `cells6`/`cells6Apply`.
- **forge.js**: `drip` (slag rebuilt on it; every hero through `heroes()`; ice strikes monsters 8% + stun + Stunned; the
  shard), `vaultAt` (one fall a patch each 4 s), `vaultLine`, `vaultRing`, `vaultOn`, `vaultEnter`, `SHARDS`, `setShards`,
  `tickDrips` (first line of `tickFlues`), one icicle a patch within 20 m at each high water.
- **skills.js / skillsx.js**: the thirteen ice call sites call the vault below the ice (Leap 2, Earthsplitter 1 per 4 m,
  its Ring 1 per 4 m of ring, Meteor 3 / its pieces 1, Fireball 1, Arrow Rain 1).
- **combat.js**: the act's Shroud hook (unlit below the ice; Out: Shrouded wherever; a hit in light adds Revealed 3 s;
  the Shade's Ring x0.5), VULN `lit`, `stunned`, `vulnK` from the act's row.
- **world.js**: `act6Enter` calls `resetTide(z, { mere: 1.6 })` (drained while the Ketos lives), `fireEnter`, `vaultEnter`;
  `act6Tick(z, dt)` runs `namesTick`.
- **story.js**: `rollNames6(after)`. **text.js**: an "Act VI: systems" block.
- **Scenarios** (`// Act VI: systems`): `carry`, `blackwater`, `drips`, `names6`: all pass. Regressions run: coast, tower,
  tide (4 cycles), ashfield, combat, test-sync (263): pass.

## Next

- Systems part 2: the class hooks that are light (War Cry's flare, the wolf's lantern, Bulwark's ward, Dawnbreaker, Ray of
  Dawn, Frost Nova / Frozen Orb slush, Piercing Shot's casks), the hud flame icon and the dial's violet pulse.
- Combat: traits (drinker, unseen, lightRest, listens, lure, gnaw, touchEvery), the lure AI, the five new defs and the
  Ketling, PACKS / PACK_LEAD / PACK_DORMANT, BOONS[6], the two legendaries and `legKey`, `actHaz`, `nearestFoe`'s lit
  preference; scenarios `lure`, `skillsfx` in an 'under' zone.
- Progression: the Lamplight track (`MASTERY` row, `ringPct`, progpanel 13 tiles, `prog6`).
- Assets: the Ketos and the Falselight by their fallbacks (no downloads from this container), `cast6`.
- Net: protocol 5 (ring byte, light pools, cells6 on `i`, the names window, Act VI's masks), `coop.mjs act6`.
- G2.
