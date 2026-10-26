# B1b: runtime grids, the tide and the ice (world, stage B)

Root: /home/user/abyssos/skotos. Nothing committed by me (the lead's checkpoints a938f96 and 951c5b0 hold most of it;
the working tree adds the last tide.js change below). Scratch: scratchpad/act5/b/b1b/ (final/ is the last run, after
the third container restart; soak/, soak2/, soak3/, shots/, shots2/, reg/ are the runs before it). Tested against a
private no-HMR dev server on :5311 (`vite --config scratchpad/act5/b/vite.nohmr.mjs`), so other roles' edits never
reloaded a page mid-run; the shared :5199 was left alone.

## What I built

**src/world/map.js** (world's file)
- `close(cells, low = true)` and `open(cells)` both go through `change(open, close, low)`: one batch, `flowT.x = -1`
  and one `ver++` if anything changed, returns the count; `this.low` allocated on the first low close; an opened cell
  loses `low`. A tide step and an ice batch are one `change` each (one ver bump for both directions).
- `setSolid(ix, iz, v)` resets the flow field (`flowT.x = -1`) and bumps ver only when the cell really changes (it bumped
  ver even when nothing changed and never rebuilt the flow). Act V never calls it.
- `stepToward(P, x, z, tx, tz, out, R = 20, mask = null)` and `fillWindow(P, ix, iz, R, mask)`: a Uint8 w*h mask whose 0
  cells are walls for that window (corner cutting checked against the mask too); the window rebuilds when `P.mask !==
  mask` as well as on ver, target cell or R. Callers without a mask are unchanged.

**src/game/tide.js** (new, ~390 lines)
- `z.tide = { h, step, t, phase, force, wet, lane, laneT, u, ... }`, `TIDE` (live binding, null without L.bed), `BAY`
  (`SEA.uBayLevel`, Skerry Bay's own level for the sea shader: 0 under the clock, the force's level while a boss owns
  the water), `TIDE_LOG` (counts, lanes, wash-outs, per-frame cost) for the soaks.
- The clock from `HAZ5[diff]` (phases [40, 36, 40, 36] = 152 s, stepT 4.5; Wanderer [50, 40, 50, 40] = 180 s, stepT
  5): 8 steps of `TIDE_STEP` 0.15 m to 1.2 m; one step at a time, never closer than stepT (`T.since`); each step is one
  `map.change` (close the band crossing the deep line, open the band leaving it) + `'mapChanged'`.
  `TIDE.force = { h, rate }`: one 0.15 m step each 0.15/rate s toward h (the Tower's 1 s steps); null again: low water
  from its start, the grid ebbing back a step at a time. Skerry Bay (gen5 `inBay`) stays at low water under the clock.
- Tidal cells per zone, once (`cellsOf`): each cell's threshold step, cells deep at every level and never deep left out.
- The grace: a step that would close her cell, or cut her off from the ground this tide never takes (`safeOf`: open
  non-tidal floor and tidal cells deep only above the top the water will reach, in 4-connected regions of 9+ cells;
  one mask per top, cached while nothing but the tide changes the grid), defers her cells and a BFS lane at the new
  level to the nearest cell that stays open and still reaches safe ground (`laneFrom`; if no dry lane exists it wades
  back through closed tide water, reopening those cells in the same batch). Every lane cell is deferred; she has
  `GRACE` 6 s; out of the lane (or the ebb has made it shallow) it closes at once, in one batch. Still in it after 6 s:
  the wash-out `pl.pull = { t, t0, sx, sz, x, z, path: [{x, z, d}...], len, wash: true }` along the lane's cell
  centres, at most 9 m/s (never a jump: player.js follows the polyline), `damage(null, pl, hpMax * HAZ5.wash / 100,
  { pure, wash, cold: 20 })`, sfx washOut, splash spray; the lane closes when the pull ends (a fresh lane if a step
  came meanwhile and her new cell must close).
- Closing batches: monsters on a closed cell go to the nearest floor (`evict`; swimmers, floaters, bats, the hidden,
  clingers exempt); pickups on closed water glide to the nearest dry cell within 10 m (`p.wash`, 0.4-1.6 s; checked
  every 0.5 s, so the ice's drowned loot slides too).
- `resetTide(z)` (act5Enter): clock at the start of low water, every tidal cell set by its bed at h = 0 in one batch,
  `SEA.uLevel`/`uWetLevel` 0, and the clock's safe mask built behind the loading.
- Per frame: `SEA.uLevel` (`T.u`: a step ahead of the grid while it floods, a step behind while it ebbs, so the water
  the eye sees is never lower than the grid), `SEA.uWetLevel` (highest of the last 20 s, then -0.05 m/s), Audio.mood
  `{ tide }`; bus `'tideTurn'` (phase, zone) at each phase start and `'tideBell'` (coming phase) + sfx `tideBell` +
  the bell prop's `ring(1)` HAZ5.bell s before the flood and the ebb.
- Queries: `waterAt(x, z)` 'dry' | 'shallow' | 'deep'; `wadeAt(x, z)` 'tide' | 'slush' | 'brine' (sap.js pools) | null.
- `tideDial()` for story's HUD: `{ h, u, k (0-1 of high water), dir, phase, next (s), bell, lane, laneT, forced }`.
- `floodWave(z)`: the waves' clock (one each 25 s while h >= 0.75 and no force): a wading cell at the water's edge
  14-26 m from her, or null (retry in 5 s). world.js `updatePacks` spawns a `'floodWave'` pack there while fewer than 2
  wave packs live, only if `PACKS.floodWave` exists (combat defines the pack in stage C; until then nothing spawns).
- `mapTone(z, i)` for hud.js `paintMap`: closed water dark blue, wading water light blue, thick ice and windows white,
  thin ice pale blue (paler from stage 2), broken ice dark blue, slush grey-blue.
- DEV: `window.__act5.tide` (TIDE, LOG, tideDial, waterAt, wadeAt, resetTide, floodWave, mapTone).

**src/game/ice.js** (new, ~540 lines)
- `z.ice = { stage, load, t, warn, tex, dirty, upT, ring, floes, ... }`, `ICE`, `ICE_LOG`, `FALLS` (combat's per-kind
  rule when its cell breaks: `(a, cell, z) => handled`).
- Load: each frame within 30 m of her, `iceWeight(a)` x dt (x0.3 above 1 m/s) on the cell under each actor (big ones on
  every cell under their radius). `iceWeight`: hero 1 (0 airborne: y, roll, blink, leap), hunting monster 0.6, big 2.5,
  `def.weight` overrides (louse 0.3, Icemaw 2.0 per the contract), pets 0.6 (spirit wolf 0.5); NPCs, bosses, floaters,
  bats, the hidden/under/airborne/clinging, dormant statues, the floundering 0. One stage per `HAZ5.load`; decays
  0.25/s, never below its stage; lamp light caps the stage at 1.
- Stages 0-3 from load; a stage-3 cell reaching 4 x load starts the 0.6 s warning (white ring FX, iceCrack3, a 30 ms
  vibrate under her); the break joins the next batch. Chains: stage-3 orthogonal cells of a break warn 0.3 s later.
- One batch every 0.25 s: every pending break and refreeze in one `map.change` (so map.ver from the ice <= 4 bumps a
  second) + `'mapChanged'`; floes (2-3 per hole, pool of 32, bobbing on `swellY`), splashes, iceShards FX, sfx.
  Broken cells refreeze to slush after 20 s (6 s in lamp light); slush (stage 5) takes no load for 8 s, then stage 1.
- The plunge, in the break's batch, no tween: `landing()` = the nearest safe cell (land, thick, wading flat, thin at
  stage 0-1 not warned or pending) within 3 m, behind her before ahead, on ground of 9+ open cells; else the oldest
  safe point of her 2 s ring (sampled every 0.1 s); else a cut-off scrap within 3 m; only then further out (never seen
  in the soaks). `HAZ5.plunge`% of her life, half within 5 s of the last, floored so she never ends under 10% (or her
  life before it, if lower), Cold +35, 1 s iframes, bus `'plunge'`, a "plunge" float text when `hud.plunge` exists.
  A break under her while she is airborne waits for her to land.
- Monsters on a breaking cell: `FALLS[kind]` first; bosses, floaters, pets, NPCs never fall; `big` flounder 3 s
  (stunned, y -0.6, bus `'flounder'`), then drown if 3+ open cells round them, else haul out and break 2 edge cells;
  others `drown(z, a)` = `kill(a, null, { drown: true })`, full xp, bus via kill, loot slides off the water (tide.js).
- Fire areas melt: +1 stage every 2 s under a burning `G.areas` fire.
- `resetIce(z)` (act5Enter): stages 4 and 5 back to 0, loads cleared, one open batch, floes cleared; `tCrack` set.
- **tCrack**: `THREE.DataTexture(z.ice.stage, w, h, RedFormat, UnsignedByteType)`, nearest, no mips, unpackAlignment 1
  (the contract's R8: one byte per cell = the stage 0-5); `SEA.tCrack.value = tex`, `SEA.uMap.value.set(w, h)` on entry;
  `needsUpdate` when dirty, at most every 0.1 s. Verified uploaded (`renderer.properties` has its WebGL texture).
- Calls for combat: `loadAt`, `crackAt(x, z, r, stages, o)` (o.lamp default true), `crackLine(x0, z0, x1, z1, w,
  stages, o)`, `crackCone(x, z, rot, len, arc, stages, o)`, `breakAt(x, z, r, o)` (straight to the next batch, no
  warning), `refreezeAt(x, z, r)` (1-3 to 0, broken to slush next batch, freezeCrystals FX), `freezeCells(cells)` (a
  seal: L.thick, map.open), `iceAt`, `stageAt`, `holeNear`, `iceWeight`, `drown`.
- Lamp light: `light.js lampLightAt` when it exists (stage C); until then lit interactables with `lightR` (not hole
  lamps) and lamp light pools; cached per cell for 0.25 s. Audio.mood `{ ice }` (share of thin ice within 6 m).
- DEV: `window.__act5.ice` (the calls above + LOG, FALLS), and the soak probe hook.

**tools/soak5.mjs** (new; scenario.mjs is the sea owner's in stage B): `node tools/soak5.mjs <tide|ice|ice-coast|
ice-farlight|perf|all> <outdir>`, env BASE, DIFF, SEED, SIM (30), CYCLES (20), MIN (10), MON (12), Q. One browser,
pages one after the other; &norender with fixed 1/30 s ticks; a bot drives the hero through IN.keys; a probe after every
tickIce checks every actor and the hero.

## Calls in files I do not own (owners not running in stage B; the contract names them as B1's smallest changes)
- `src/game/projectiles.js` updateAreas: `tickTide(dt); tickIce(dt);` (+ imports).
- `src/game/player.js`: `pl.inWater = airborne ? null : wadeAt(pl.x, pl.z)`; the pull follows `T.path` (a polyline
  with each point's distance `d`, `T.len`) when present, the old straight lerp otherwise (Karthax's tongs unchanged);
  pale spray for a wash.
- `src/game/ai.js` updateActors: `a.inWater = (float | bat | under | airborne) ? null : wadeAt(a.x, a.z)`.
- `src/game/combat.js` moveMul: `if (a.inWater && !a.def?.swim) m *= a.hero ? 0.7 : 0.75`.
- `src/ui/hud.js` paintMap: the water and ice tones from `mapTone` in Act V zones (story's file, stage C).
- `src/game/world.js` (mine): `updatePacks` flood waves; `act5Enter` calls `resetTide(z); resetIce(z)`.

## How I tested it (scratch paths under scratchpad/act5/b/b1b/)

- Build: `npx vite build --logLevel error --outDir <scratch>/b1b/dist` passes (after the last edit).
- **Tide soak** `BASE=http://localhost:5311/ SEED=<n> [DIFF=0] node tools/soak5.mjs tide <out>`: 20 cycles (3100-3650 s
  of game time at 1/30 s ticks, ~60-90 s real) on the coast, 12 monsters (goblin, skeleton, warg, spider, troll)
  hunting her, topped up when fewer than 6; the bot walks the flats and once a flood stands on a cell the next step
  closes (wait for the wash-out on even cycles, walk out on odd ones), dropping gold 4-9 m off on cells that step
  closes. Checked every tick: no actor centre in a closed cell, the hero never on fewer than 9 open cells, no snap,
  no jump over 3.5 m, the wash-out on its lane, no gold left on closed water, map.ver bumps <= steps + 2 x lanes + ice.
  - final/tide20-12.txt (seed 12, Warden, before the last edit): PASS, 326 steps, 41 bells, 81 turns, 64 lanes, 41
    wash-outs, 622 evictions, 31 pickups slid, max jump 1.53 m, 0 closed/stuck/snaps/off-lane/wet, lane age <= 7.4 s;
    21 lane tests: 21 formed, 16 washed out, 5 walked out, every lane cell closed after.
  - final/t2/tide20-12.txt (seed 12, after the safe-mask cache): PASS, 328 steps, 60 lanes, 28 wash-outs, max jump
    1.35 m; 21 lane tests: 11 washed, 9 walked out.
  - final/t3/tide20-9-wanderer.txt (seed 9, Wanderer, 180 s cycle, steps 5 s, no wash damage): PASS, 321 steps, 55
    lanes, 30 wash-outs, max jump 1.54 m, lane age <= 10.1 s (6 s grace + the wave's carry + a re-lane).
  - Before the restart (soak3/): seeds 12 and 7 (Warden), 9 (Wanderer): PASS, max jump <= 2.56 m.
- **Ice soak** `BASE=... SEED=23 node tools/soak5.mjs ice <out>`: 10 minutes of game time on the coast's Fall shelf and
  10 on the Farthest Light's Ice Road; she walks, stands until it breaks, takes impacts (crackAt/crackLine/crackCone/
  breakAt), Frost Novas (refreezeAt), sometimes at low life; 8 monsters (a troll among them) hunt her onto it.
  - final/ice10-23.txt: coast PASS: 897 breaks, 870 refreezes, 609 batches, 604 warnings, 24 drowned, 61 floundered,
    46 plunges all 'near', max landing 1.35 m, 10 low-life plunges never under 10%, half damage within 5 s, ice ver
    bumps max 4 in any second, max jump 1.35 m, 0 snaps/closed/stuck. Farthest Light PASS: 866 breaks, 851 refreezes,
    26 drowned, 39 floundered, 37 plunges all 'near', max landing 2.17 m, bumps max 4/s, max jump 2.18 m.
  - Before the restart (soak3/): seeds 23 and 4, both zones PASS (max landing 2.76 m).
- **Frame times** `node tools/soak5.mjs perf <out>` (final/perf/soak5-perf.json; 915x412, 30 extra monsters; the coast
  with TIDE.force stepping once a second up to 1.2 m and back, the Tower's pace, 4.5x the clock's; the Ice Road with a
  crack or a break every 0.25 s). Whole rAF frame, game logic only (&norender; headless software GL, the machine shared
  by four agents):
  - coast: median 1.5 ms, p95 3.0, max 17.7 (one frame); frames with a ver bump: median 2.1, p95 4.8, max 6.0.
    tickTide mean 0.029 ms, max 4.5 ms.
  - farlight: median 1.4 ms, p95 3.6, max 54.7 (one GC/compile frame); bump frames median 1.7, p95 7.9, max 12.5.
    tickIce mean 0.08 ms, max 9.2 ms (once; a per-frame probe over 25 s gives p99 0.4 ms, max 2.2 ms with two
    drownings in one batch).
  - Per tide step (instrumented once, then removed): 0.1-0.5 ms after the first cycle; the first forced cycle 1-5 ms
    (warm-up and one safe mask per new top, now cached). The clock's safe mask is built in resetTide.
  - Rendered frames here are software GL (seconds per frame at q 1): not a measure; the render budget is B2's perf5.
- **Screenshots** (q 1, 800x450, swiftshader): final/shots/tide-low-water-0.45.png, tide-lane-0.6.png (a lane held
  round her, dial laneT 4.75 s), tide-high-1.2.png (washed 15 m along a 16-cell lane to the shore), ice-coast-stages.png
  and ice-farlight-stages.png (hairline, web, crazed, broken with floes; tCrack uploaded), ice-*-slush.png,
  ice-*-plunge.png (landed 1.41 m away, 10% lost). Soak end shots: final/tide-end.png, ice-coast-end.png,
  ice-farlight-end.png.
  final/shots/bay-high-clock.png: Skerry Bay at the clock's high water (see Open problems 1).
- **Regression** (existing scenarios that run through my changes: updateAreas, the pull, inWater, moveMul, map.change/
  stepToward, the minimap), `BASE=http://localhost:5311/ node tools/scenario.mjs <name> <out>`, one after the other,
  final/reg/: weep ok (42 kills, the tears, quest 13), pass ok (24 kills), karthax ok (the tongs' straight pull, cages,
  phase 2, quest 22), combat ok (14 kills, pickups), ivar ok (both phases, quest 20, gate open); no page errors.
  Before the restart (reg/): combat, panels, karthax, ashfield ok.
- Debug entry: `?auto=coast&lvl=30&q=1` (the tidal coast), `&flags=frozen` (the coast after the Freeze),
  `?auto=farlight&...` (always frozen), `&seed=N`, `&diff=0..5`; in DEV `window.__act5.tide` / `.ice` drive it
  (`__act5.tide.TIDE.force = { h: 1.2, rate: 0.6 }`, `__act5.ice.breakAt(x, z, 1)`, ...).

## Stubbed or left for stage C
- Combat: the 'floodWave' pack in PACKS (world.js spawns it only once it exists); `FALLS[kind]` for the Sunken (resurface)
  and the Icemaw (dives); `def.weight` on the louse (0.3) and the Icemaw (2.0); the Tower passing `L.thick` as the
  stepToward mask and owning `TIDE.force` (its 1 s steps for 6 s are within the rules: `si = 0.15 / rate`); cold.js
  reading `a.inWater` and the `cold` option on the wash and plunge damage; light.js `lampLightAt` (ice.js uses it when
  exported, a lamp/pool fallback until then); calling crackLine/crackCone/breakAt/refreezeAt from skills and AIs.
- Story: drawing the tide dial from `tideDial()`; text keys `hud.plunge`, `hud.drowned` (guarded with `has()`, nothing
  shows until they exist); audio.js SFX `tideBell`, `washOut`, `iceCreak`, `iceCrack1`-`3`, `iceBreak`, `refreeze`,
  `plunge` and MOOD keys `tide` (0-1) and `ice` (0-1): Audio.sfx/mood ignore unknown names, so they are silent today;
  listeners for the bus events 'tideBell' (phase), 'tideTurn' (phase), 'washOut', 'plunge', 'flounder'.
- Not built (stretch per the owner): floes as walkable platforms; the frozen reading's tide stop; the spring reading.

## Changes in files I do not own
Listed above (projectiles.js, player.js, ai.js, combat.js: the call sites the contract names as B1's in stage B; hud.js
paintMap: the minimap's water and ice tones, story's file, story not running in B). Each is a few lines; nothing else in
them was touched. tide.js also adds `SEA.uBayLevel` (a `{ value }` beside SEA's uniforms, `||=` so it never overwrites
one sea.js makes).

## Open problems
1. **Skerry Bay's water look under the clock (request to the sea owner, sea.js).** The design's sand bar keeps the
   zone's tide out of `L.boss.r + 4`, so tide.js keeps those 256 cells (beds 0.3-0.6) at low water and open under the
   clock. sea.js draws every water vertex at `SEA.uLevel`, so at the clock's high water (1.2 m) the bay looks like deep
   water while she walks on it (final/shots/bay-high-clock.png). Fix in sea.js: a per-vertex `aBay` (1 where a corner
   cell is `inBay(L, x, z)` from gen5) and `float dep = mix(uLevel, uBayLevel, aBay) - aBed;` with `uBayLevel:
   SEA.uBayLevel` in the uniforms. tide.js already writes `SEA.uBayLevel.value`: 0 under the clock, the forced level
   (`T.u`) while the Tower owns the water. (build.js `G_WET` reads `SEA.uWetLevel` the same way: the bay's sand would
   darken at the clock's high water; minor.)
2. Lane age: on Wanderer a held lane lived up to 10.1 s (6 s grace, the wave carrying her up to ~2 s, and a re-lane when
   a step came while she was carried). Never a jump, never a closed cell under anyone; noted, not changed.
3. A hero placed exactly on a cell corner beside breaking cells is pushed out by player.js collision (1.45 m over a few
   frames, not a plunge, since her centre cell did not break); seen only in a scripted shot, never in the soaks.
4. Frame times here are logic-only on a shared, software-GL machine; the phone's render cost of the sea and ice is
   B2's perf5. The tide's first forced cycle costs 1-5 ms per step once (JIT and one safe mask per new top); after
   that 0.1-0.5 ms.
