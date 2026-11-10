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

## Combat and progression (10 November): done, scenarios pass

- **data.js**: MONSTERS `lampbearer`, `faded`, `gateFallen`, `gateFallenBow`, `falselight`, `ketling` (the design's numbers);
  PACKS (the ten tags), PACK_LEAD (`blackCrew`, `poolHunter`), PACK_DORMANT (`blackCrew`, `gateFallen`, `forgotten`);
  BOONS[6] (`bearer`, `word`, `shade`; x REMEMBERED with `flags.lostAll` in stats.js, `.du` in panels.js); LEGENDARIES
  `ketosLure`, `shadeRing` (drop: false); LEG_FROM `ketos`, `shade`; `actHaz(act, diff)`.
- **ai.js**: `drinkerAI` (the Lampbearer: Drink tell 0.6 s, channel t s at rate m/s, broken by 6% of its life / stun /
  freeze / her standing in lamp light, 7 s cooldown; cornered lantern swing, Cold +8); `touchStrike` (the Faded's
  Forgetting Touch every `touchEvery` blows, -0.5 m); `unseenTick` (dissolve 0.85 outside light, solid in light / in its
  wind-up within reach + 1 m / listening / Revealed; `a.unseenNow`); `namesFall` makes every `listens` foe stand 3 s,
  Revealed; `restTick` (a downed Gate-Fallen rises at half life after 4 s); `lureAI` (the Falselight: modes `a.l6` lurk /
  tell / fight, its fake pool r 3 at the bait, the snap 1.3x, -1 m, a 2 m pull, a roll slips it, shown by a lamp within 4 m /
  her ring / a hit in light, lure out 3 s then lit again); `gnawTick` (a Ketling puts out the nearest lit lamp no hero
  stands in). `drainOf(tg, v, src)`: this page's ring through fireDrain, a remote's into `tg.ringHit` for net.
- **combat.js**: `kill`: lightRest (falls in the dark: down 4 s, invulnerable, then up at half life once; in light or on a
  shard: dead), the kill refill (+0.2 m for an unlit foe in her ring, 0.4 with the Lure-bone), a Lampbearer's death pours
  back what it drank + 1 m and relights an Out coal; the first-kill legendary by `def.legKey ?? kind`.
- **actors.js**: STAND_IN `falselight: ['spider']`, `ketling` / `ketos: ['icemaw', 'warg']` with their scales; the Faded
  pick `villager0-2` per spawn. **models.js**: weapon `blackLamp` (the sea-lantern with a dark violet flame).
- **skills.js**: `nearestFoe` skips a downed Gate-Fallen and puts an unseen Faded after every lit foe; `skillUsed` now
  carries `(i, id, aim, v)`; `underHook`: War Cry's flare (8 m, 3 s; Challenge's taunted foes lit 4 s), the wolf's lantern
  (3.5 / The Pack 2 / The Alpha 5, a following pool), Frost Nova's slush (5.5 m, 8 s), Iron Bulwark's ward pool (3 m),
  Dawnbreaker and Ray of Dawn light the unlit in a 3 m way along the aim for 1.5 s. **skillsx.js**: Frozen Orb leaves slush
  (1.2 m, 6 s) every 1.2 m. **light.js**: a pool may `follow` an actor.
- **progression.js**: MASTERY `lamp` (ringPct, max 50, k 40); stats.js `ringPct: 0`. **text.js**: "Act VI: progression"
  and "Act VI: combat" blocks (names, blessings, legendaries, hint.unseen, hint.flicker).
- **Scenarios**: `lure`, `foes6` (this lane's own: Lampbearer, Faded, Gate-Fallen, Ketling), `prog6`: pass.
- **Deviations to write in the stage report**: no downloads from this container, so the Falselight and the Ketos stand
  in as the spider (x0.8) and the Icemaw (x0.6, x3.4); the Lampbearer's lamp is a code sea-lantern; the Faded's attack is
  people.js's `punch` (Punch_Cross); Dawnbreaker and Ray of Dawn light a 3 m way at the cast, not along their moving waves.
- **Testing note:** the dev server must run without HMR (`npx vite --config /tmp/vite.nohmr.mjs --port 5199`, a copy of
  tools/vite.nohmr.mjs with this machine's path): with a server that has seen edits, a scenario's `import('/src/...')`
  gets a second copy of a module (no `?t=` stamp) and reads the wrong FIRE, bus and pools.

## Next

- Still to do in B: Snare Trap's held foe and Storm of Hawks' stoops lit; Piercing Shot breaking casks on its line (check
  the shipped projectile); the louse's burst 'vault'; the unseen Faded's health bar hidden, its footprints and veil (look);
  the hud flame icon beside the Cold and the dial's violet pulse (story's hud.js hooks); `skillsfx` in an 'under' zone.
- Assets: the Ketos and the Falselight by their fallbacks (no downloads from this container), `cast6`.
- Net: protocol 5 (ring byte, light pools, cells6 on `i`, the names window, Act VI's masks), `coop.mjs act6`.
- G2.
