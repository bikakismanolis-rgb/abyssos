# Act VII stage A: the gate tests and the stage-0 test debts (report, 17 November 2026)

Files: `tools/scenario7b.mjs` (new: `mem7`, `perf7`, `cast7`, `play7`, exported as `S7b(helpers)`), merged in
`tools/scenario.mjs` beside `Object.assign(S, S7({ A4, A5 }))`; small edits to the old scenarios in `tools/scenario.mjs`
(`resume`, `ground6`, `play5`, look6 -> `bench6`, place6 -> `props6`); `tools/diagcheck.mjs`. Nothing under `src/` was
touched. Raw results: `docs/act7-briefs/reports/stageA/tests/` (one JSON line per scenario) and
`docs/act7-briefs/reports/stageA/perf7/` (perf7's JSON and a JPEG of each spot, each under 150 KB).
`node tools/scenario.mjs --stale`: "no stale scenario at stage A".

All runs: `BASE=http://localhost:5311/` (the working tree, no hot reload), SwiftShader, headless.

## mem7 (stage A): a cold start into each zone, GPU texture by owner

`unload6`'s cold-start half under its own name: its WebGL hook (`S.unload6.init`, reused, not copied), its owner table
with creature groups act6 and act7 added (a file is owned by every group that lists it, so `bear` reads
`cr:act3+act5+act7`). Fixtures `fx7('haldaOut','thaw')` and `fx7('tarnSeen','tarn')`, quality 1. "Boot" is env, village and
trees packs, the boot people and Act I's creatures; "own" is everything on top. **Passes: 46 MB and 64.3 MB against 75.**

| owner (MB) | into `thaw` | into `tarn` |
|---|---|---|
| boot: pack:env / village / trees | 53.33 / 42.33 / 20 | 53.33 / 42.33 / 20 |
| boot: set:people | 38 | 38 |
| boot: Act I creatures (8 files) | 28.33 | 28.33 |
| **boot total** | **182** | **182** |
| pack:melt (the code-made meadow, gravel, crag layers, `env.js`) | 32 | 10.67 |
| pack:rime | - | 39.67 |
| group act7: bear 7.33, golem 4, worm 1.33, skua 1.33 | 14 | 14 |
| people sets beyond boot | 0 | 0 |
| **own (the gate: <= 75)** | **46** | **64.33** |
| total / GL hook's whole count / renderer.info textures | 228 / 244.4 / 294 | 246.3 / 262.6 / 324 |
| page load to play (s) | 34 | 40 |

Both drawn whole (every drawn texture alive, no GL error, no person a stand-in), the group act7 landed, no creature file
unowned. Against the plan (`40-production.md`, "Memory at a cold start": 16.5 and 58 MB): the creature group is 14 MB
(planned 16), and `thaw` carries 32 MB of code-made `melt` layers the plan did not count (it planned 0, or 5.6 for an
optional downloaded pack). Wall time: 1.5 min.

## perf7 (stage A): perf6's method at the five Act VII spots

The method is `perf6`'s, unchanged, with its terms reduced by `tools/perf6-terms.mjs` (`perf6Out`): a phone context
(915 x 412, pixel ratio 1.5, `isMobile`, touch), the adaptive resolution pinned at 1 (`R.prScale = 1`, `lastResize` far
ahead: so `tarn`'s `heavyZone` cap is not in these numbers), the game loop held for the timing, each frame the best of K
draws read back with `readPixels`, the Field of Ash drawn in the same cycle with each spot's crowd at the same offsets.
`vsField`: the whole frame against the Field with that crowd; `world`: the spot's world alone (crowd hidden) against the
bare Field, best of as many frames a side; `crowd`: the bodies' own cost against the same bodies on the Field (reported, a
crowd under 12 bodies padded with itself to 24). Bar: `vsField` and `world` <= 1.00 at q1; q0 no slower than q1 x 1.05.
The page carries `&nostory` (no Act VII scene holds the world while timed) and the fixture flags of the zone it is in
(`flagsTo7('thawSeen')`, `flagsTo7('tarnSeen')`); the group act7 is loaded on the Field too. Env: `QS`, `CYCLES`, `K`,
`CR`, `PAD`, `SEEDS` (Field, thaw, tarn), `ONLY`, `SOLO`, `CREW`, `NOUNLOAD`, `SHOTS`.

**The spots, each found by name in the layout and staged with what exists** (the slides are run by the game's own
`forge.js tickFlues` and `fx.updateFX` in 0.05 s steps without drawing, then three real frames, so the frame timed has
both fronts down their whole lanes; `fireFlue` on a chute already spent waits it out first):

| spot | where (by name) | staged | stand-ins |
|---|---|---|---|
| 1 meadow (`thaw`) | between the Race's south bank (`S.fords[].z1`) and the camp, outside every lane: most pines in view, then most water | the brooks at their clock's top (`L.tideCfg.hMax` 0.6), the Race at 1.2 (no weir), the clouds' clock at the moment with the most discs in view | 25 actors: 10 goblins, 4 marksmen, 2 shamans, 5 hill-wolves, 4 choughs |
| 2 chutes (`thaw`) | between the two nearest flank chutes (`L.flues[].area === 'flank'`), outside both lanes | both chutes running, in their 'fire' state | 20 actors: 8 goblins, 4 marksmen, 4 hill-wolves, 4 scorpions |
| 3 den (`thaw`) | inside `S.arena` (r - 3), outside lanes, the pair of the Den's three chutes that covers most of the screen | two chutes running, four rocks off the walls (`forge.js drip` with `shard`: their warning circles and falls) | Kallisto: a Den-bear at her size (x 1.68); 2 hill-wolves |
| 4 snowfield (`tarn`) | open snow between the field chutes (`area === 'field'`), near lookout 4's island, the most snow in view | the clouds of the difficulty (`HAZ7.clouds`) sailing, their clock set to the moment with the most discs on the screen | 20 actors: 8 hill-wolves, 5 snow-worms, 7 choughs |
| 5 dam (`tarn`) | inside `S.arena` (r - 2), outside lanes, most of the lanes in view | lever 1's sluice lane (`kind: 'water'`) and both Dam chutes running, the lake full (1.2) | Kelados: a Stonewarden x 2.3; 2 Rock-rollers |

**Result, the full set** (run by the lead, alone, 54.2 min, tree at 263a2dc with logic-only edits; raw log
`/tmp/t7/perf7full2.log`, JSON `stageA/perf7/perf7.json`, a JPEG per spot and quality in `stageA/perf7/`, 34-117 KB).
Medians of 5 cycles, K 3, CR 4. **Four of five spots pass; the meadow is over by 1.3% on vsField** (its five cycles
1.091, 1.013, 1.097, 1.012, 0.970: within its own spread, but over the bar as the bar is written). Every q0 floor holds.

| spot | vsField q1 | world q1 | crowd term q1 | ms q1 (Field with the crowd) | actors | vsField / world q0 | ms q0 | q0 floor | bar |
|---|---|---|---|---|---|---|---|---|---|
| 1 meadow | **1.013** | 0.978 | 1.090 | 829.5 (816.7) | 25 | 0.910 / 0.884 | 160.0 | yes | **over** |
| 2 chutes | 0.992 | 0.930 | 1.069 | 728.7 (736.4) | 20 | 1.044 / 0.984 | 157.1 | yes | pass |
| 3 den | 0.892 | 0.866 | 1.104 (padded) | 570.5 (641.8) | 3 | 0.932 / 0.981 | 120.9 | yes | pass |
| 4 snowfield | 0.776 | 0.708 | 1.007 | 560.8 (723.1) | 20 | 0.863 / 0.735 | 129.7 | yes | pass |
| 5 dam | 0.971 | 0.929 | 0.928 (padded) | 668.1 (690.3) | 3 | 0.882 / 0.813 | 126.1 | yes | pass |

The bare Field: 597.7 ms at q1, 113.2 at q0 (SwiftShader: the ratios are the measure, not the milliseconds). What is on
screen: the meadow, a hut, four pines, the brooks and the Race's bank, the crowd's attack lines; the chutes, both lanes'
snow and two cover boulders; the den, a Den-bear at Kallisto's size, the slides' snow, four rock circles; the snowfield,
20 actors on snow beside lookout 4's island and one cloud disc (the most the layout's lines put on that screen at any
moment of the clock); the dam, the Stonewarden at Kelados's size, two Rock-rollers, the lake's edge, the stone channels
(the sluice and chute sheets lie at the top edge). The crowd terms are reported, not gated: the chutes' pooled interval
(0.931-1.352) and the meadow's (0.919-1.153) cross 1.00, so neither crowd is dearer than a frame's own swing explains.

**The chutes spot's earlier 1.19** (the lead's finding and fix, `build7.js` `SIZE7`, not this lane's): the two huge
dithered wedges in the first chutes picture were the cover boulders drawn with the layout's rotation used as their radius
(up to 6 m), covering the screen in see-through rock. Before the fix, alone (my run's cycle 0 at q1, stopped at the lead's word): meadow 0.951 / 1.104,
chutes 1.207 / 1.246, den 0.910 / 1.015, snowfield 0.938 / 0.899, dam 1.070 / 0.972 (vsField / world, one cycle each, so
not the gate's median of five).

## cast7 (stage B): the act's creatures, cold

For each zone: a cold session in Whitecliff (`fx7(thawSeen|tarnSeen,'town')&nopacks`), every kind spawned before the group
act7 is asked for; then through the zone's waypoint (the hero within 6 m of it); then a second cold session straight
into the zone. **Passes, 61 rows, no failure** (`stageA/tests/cast7.json`; wall time 1.2 min).

| kind | before the group lands (boot stand-in) | the group landed (both zones, both ways in) |
|---|---|---|
| hillWolf | warg | warg (its own model) |
| goblinMarksman | goblinArcher | goblinArcher |
| chough | spiderling | skua |
| denBear | troll | rimeBear |
| snowWorm | spider | deepworm |
| rockRoller | troll | troll |
| rockScorpion | spider | spider |
| kallisto | troll | kallisto (its CAST row exists: the bear) |
| kelados | troll | kelados (the golem) |

Every body drawn, its materials present, every map more than 1 pixel wide. The stand-in chain never ended in a missing
model.

## play7 (stage A, until E): the critical path walked

A god-mode Warden from `FX7.fx7_new('town')` (a v22 hero, quest 39, no `act7` field), `sim=4`, going by `L.spots` and by
the path's own interacts (no coordinate, no walk a later stage may gate). The story is the real one (no `&nostory`):
its dialogs are read on, its scenes waited out. **Passes with 2 todo rows** (they fail only with `GATE=G5`).

| beat | result | quest after | why (todo) |
|---|---|---|---|
| town: a v22 Warden at quest 39, the act not begun | ok | 39 | |
| the call in Whitecliff: the morning, the child (call7, q40) | ok | 40 | |
| Halda at the staff, gone up ahead (haldaOut, q41) | ok | 41 | |
| the Pass, at its waypoint | ok | 41 | |
| the goat track at the Pass's camp: the way up, open with haldaOut | ok | 41 | |
| the Meltwaters: the goat track camp, Halda at her fire, the Race at 1.2 | ok | 41 | |
| weir 1 turned: the Race down to 0.9 | ok | 41 | |
| the west ford: open at 0.9, the camp reaches weir 2 over it | ok | 41 | |
| weir 2 turned: the Race down to 0.6 | ok | 41 | |
| weir 3 turned: the Race down to 0.3 | ok | 42 | |
| three weirs: quest 42 | ok | 42 | |
| the Narrows: its ford open at 0.3, the camp reaches the Den's mouth | ok | 42 | |
| **the Den: Kallisto** | **todo** | 43 | her fight is not placed: no boss in the Den (stage C) |
| the Water-stair: the cut stair, open once Kallisto rests | ok | 43 | |
| the Hanging Lake: the Stair's Head camp, Halda at her fire, the lake full | ok | 44 | |
| winch 1 freed / winch 2 freed / winch 3 freed | ok | 44 | |
| three winches: quest 45 (Kelados's wake scene) | ok | 45 | |
| **the Dam: Kelados** | **todo** | 46 | his fight is not placed: no boss at the Dam (stage C) |
| the great wheel: the lake let down (lakeLet, q46b) | ok | 46 | |
| home: the dusk, the sleep, the morning; the act's close (home7, act7, q47) | ok | 47 | |

22 rows: 20 ok, 2 todo, 0 failed; end state quest 47, `act7` 1, every flag of the chain from `call7` to `act7`. Wall
time 1.3 min. (Run before the last tightening of the wheel's row, which now waits for the lake at 0.3 by `tide.mh`; that
run has not been repeated, the browser being the lead's for perf7.)

Flags set by hand, and only where the path cannot make them yet: `kallistoRest` (with quest 43) and `keladosWake`,
`keladosRest` (with quest 46), because `world.js` places no `bossSpot` for Kallisto or Kelados yet (their AIs are in
`ai.js`; `world.js:2170` says "comes with their fights"). After a hand-set flag the test calls `world.js act7Presence(z)`,
which is what the story's own rest scenes call, so the great wheel's `sluice7` interact appears. Everything else (the
call and the child, Halda at the staff, the goat track, the three weirs and the Race's levels, the fords and the Narrows
by `map.reaches`, the Water-stair, both camps with Halda, the winches and Kelados's wake scene, the great wheel and the lake
down to 0.3, the home scene and the act's close at quest 47) is the game's own doing.

## The old tests (the stage-0 debts)

| test | decision | evidence |
|---|---|---|
| `ground6` | **repointed**, `stage: '0', until: 'E'`, query `...&nopacks&nostory`. Passes 3 of 3 on fresh seeds | `&nostory` now exists (`story.js:2788`) but holds only Act VII's scenes; for the Act VI zones the runner still sets the arrivals' flags (`STORY6`). Changes: (1) the "unwritten Act VI pack spawns the Sunken" beat (stage A's) became "with ?nopacks the zone is made with no pack" plus "a pack of the layout, put in by the test, spawns its own tag's kinds (data.js PACKS), never goblins" (got: sunken, faded for `shoreFaded`). (2) The test's walker: plans over `map.walkable` cells (it planned over `m.cells`, into water and the story's walls: black lamp 2 failed so); reads a dialog on when one opens (the lit Bottom's line held her at the waypoint for every later walk); waits on the bank while the black water's clock covers the way (Leif's fire failed so), within its time; steps a standing body aside if one blocks a 3-cell way (at most 4 a walk, counted in the result; none was needed in the passing runs). A failed walk now says what held her (`blk`) |
| `look6` | **retired by name** into `bench6` (`stage: '0', until: 'E'`). Passes (20 beats) | Its assertions have no home in `darktele` (the tells' contrast in the real zone) or `perf6` (timing, shots): the bench build, the X6 defines, the vault's low camera, the slush cells, the Mere's corners, every prop's switches, the dry Well's mouth, the Bottom bench, both zones' `groundPBR` key and `act6Level`. So they are kept, as look6 had them, under a new name. The one failing sub-check, "a wider ring shows the far mark" (3.7-4.2 of 255 against > 12), read a single pixel at the far mark's point, which lands in a gap of the print sprite; the beat now reads the largest change in a 7 x 7 patch: near 86.8-88.1, far 0, wide 30.2-35 |
| `place6` | **retired by name** into `props6` (`stage: '0', until: 'E'`). Passes (56 beats) | Its build-level assertions have no home: `check-act6` checks layouts only; `drained`, `catch6`, `lost6` drive the story through the props but never assert their spots, the hand-over to `z.lvl.act6`, the reading's atmosphere and ambient, `shoreJit` or the vault drape. All passed but one: "each in its first state" in the lit Bottom expected the three black lamps lit, while that reading is made with `blackLamp0-2` (put out), so the shipped dress has them out. The expectation now reads `lit ? off(lamps) : on(lamps)` |
| `resume` part `fall`, check e | **rewritten to the village**, `stage: '0', until: 'E'`. `PARTS=fall` passes, all eleven checks (a-h, voices, d2, e2), 21 min | Verified in src first: `boot.js:87-99` (`gfxO.lost`) records the zone the context went down in (`wake.js noteCrash(..., 'lost')`) and keeps the visit; `wake.js wakeOf` returns null while `crashOf(h)` names the visit's zone, so a page loaded again without the lost screen's Continue starts in Whitecliff at its waypoint; the lost screen's Continue clears the record (`gfxO.cont`). Check e now: the lost screen shown, the page not reloaded alone, the visit kept (`weep`), the record read before the reload, Continue in the village (`town(c)`: zone `town`, within 3 m of the waypoint). e2 (a first loss, the screen's Continue, back in the woods) was already right and passes |
| `play5` | **walker fixed, not yet re-run** (`stage: '0', until: 'E'`) | Why it stopped: each sea-light is a 1.5 s touch at its top (`story.js` `on('sealight')`, `touch(..., { tough: true })`), which a blow or the tide breaks; play5 used it once (`A5.use`), and its wait after (`lights5.length >= n`, with n read after the use) then passed at once on the two lights lit before, so the next row read `light_fall` false. The test now holds the touch as `A5.hold` holds a channel (taken up again when broken, the foes near her put down) until `light_<id>`, prints what held her if it never lights, and its wait counts the light it asked for. A full play5 (the Tower and the Skotos by the boss bot, up to two hours) was not run in this session: the browser was taken for perf7 first. Not retired: its walker is the one `play7` needed, and the cause found is the test's |
| `tremble6` | **not measured in this session** (the fix is in `src/`) | It is a long timed run and must run alone; the browser went to perf7 first. The last measure stands (`stageE-report.md`): the worst pool pixel swings 0.094 (q0) and 0.120 (q1) against 0.10, flashing pixels 0.008% of the screen against 2.78%. The contract asks for quality 1 at or under 0.10 or the limit changed with the owner's name; that is a `light.js`/`gfx.js` change, not a test's |
| `diagcheck` | **tool fixed**; passes headless (`DIAG PASS`) | Why it failed: it expected the kept snapshot shown as a box on the title and as lines on the no-GL screen, and `gfx/diag.js diagShow` has no caller any more: main's quiet graphics report (`gfx/report.js`, "Nothing is shown") took the boxes out on purpose. A lost context **does** reproduce headless (`renderer.forceContextLoss()` under SwiftShader): the kept snapshot is written (`phase: 'lost'`, zone forest) and the lost screen shows. The tool now asserts the shipped behaviour: snapshots in play; the kept one after the loss; the lost screen; a `lost` event in `skotos.report` with the zone; on the next start no box on the title, the kept snapshot left for the report, the menu up; the no-GL screen with its retry and no diagnostic lines. Not a manual check, so it stays in the gate's set |

`stage`/`until` tags were added to every entry touched: `resume`, `ground6`, `play5`, `bench6`, `props6` (all
`stage: '0', until: 'E'`). `tremble6` was run, not edited.

## Hooks needed in src/ (none of the tests here needs one to run; each tolerates its absence)

1. `src/game/world.js` `act7Zone` (at the comment on line 2170): the bosses' spots, e.g.
   `if (z.id === 'thaw' && !G.hero.flags.kallistoRest && MONSTERS.kallisto) z.bossSpot = { kind: 'kallisto', ...z.map.nearestFloor(S.arena.x, S.arena.z, 3) };`
   and the same for `kelados` at `S.seat` in `tarn` while `!F.keladosRest`. play7's two todo rows then become real beats
   (its `boss()` already looks for `z.boss`, `z.bossSpot` or a standing actor of that kind, and strikes it to rest with
   `A5.hit`), and perf7's Den and Dam can draw the real bodies in place of the stand-ins (`perf7` would need its two
   `list.push` lines changed to `kallisto`/`kelados`).
2. tremble6: the fix itself (`light.js` / `gfx.js` trembler), owner's call, see the table.

## Wall time of each long run

| run | wall time |
|---|---|
| mem7 (two cold starts) | 1.5 min |
| perf7, one cycle at the meadow (q1, proving run, other browsers running beside it) | 5.9 min |
| perf7, one cycle at the other four (q1, proving run) | 10.9 min |
| perf7, the full set (5 spots + the Field, warm-up + 5 cycles, q1 then q0), stopped at the lead's word | 19 min run, on q1 cycle 1 (about 45 min were left) |
| perf7, the full set on the fixed chutes (run by the lead, alone) | 54.2 min (q1 about 50, q0 about 5) |
| cast7 | 1.2 min |
| play7 | 1.3 min |
| ground6 (each run) | 1.4-2 min |
| bench6 (look6's) | about 3 min |
| props6 (place6's) | about 4 min |
| resume, PARTS=fall | 21 min |
| diagcheck | about 1.5 min |

## Not done

- perf7's meadow over the bar by 1.3% on vsField (1.013): reported, not worked on. The plan's fallbacks for spot 1 are the trees' shadows at quality 1 (blob shadows only) and the thaw blend as a define (`40-production.md`, "The perf plan"); both are `src/` changes.
- `tremble6` not measured again, and the `play5` fix not proved by a full run (both need the browser alone; the lead holds it today; see the table).
- `play7` not re-run after its wheel row was made stricter (the lake at 0.3).
- perf7's desktop pass (the five spots at quality 2, 1280 x 720, not mobile, held to 1.15 of the Field: G1's extra line in
  `40-production.md`) is not written; perf7 is the phone pass only.
- perf7's Den and Dam stand the bosses in with shipped bodies at their size (a Den-bear x 1.68 for Kallisto, a
  Stonewarden x 2.3 for Kelados), not Kallisto's second phase or Kelados's third: the fights are not placed (hook 1).
- perf7's Snowfield asks for four clouds; the layout's lines put at most one disc on that screen at any moment of the 600 s
  clock (the clock is set to the moment with the most), so the spot is drawn with one.
- `cast7` is tagged stage B (as the contract has it) though it runs and passes now.

## Later the same day (the lead)

play7 run again on the day's final code: **22 of 22 beats, no todo**: the world now places both bosses (`z.bossSpot`), so
the path goes from a v22 Warden at quest 39 through both real fights to quest 47 and the act's close. Every Act VII
scenario passes on the same tree (save16, race, slide, fires7, sun, heavy7, sleepers7, sleepers7b, chough7, rested7,
kallisto, kelados, bossSpot7, echo7, gate7, hook7, thaw7, tarn7, ending7, catch7, cast7, play7).

