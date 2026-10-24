# Gate G3 (stage B, Foundation): results and fixes

Root: /home/user/abyssos/skotos. Nothing committed by me. The lead's commits 989cafe and 5ac0f14 (02:2x) already hold my
first fixes (sea.js, build.js, the build5.js roof and rock-face material); the working tree adds the rest (gen5.js,
build5.js, see "Fixes"). All runs against a private no-HMR dev server on :5341 (`vite --config
scratchpad/act5/b/vite.nohmr.mjs`), started by me and left running; the shared :5199 was not touched. Outputs under
`scratchpad/act5/b/gate/` (scen/, scen2/, soak/, soak2/, perf5/, perf5b/, st/, shots/, check*.txt, parity.txt).
A pre-stage-B copy of the tree (git archive 2073b7a) served on :5342 (`gate/base/`) was the baseline for comparisons.

## Verdict: G3 passes

| check | result |
|---|---|
| check-act5 (300 seeds) | clean: no hard failures; coast 1.12 tries, farlight 1.00; oddities as reported by B1a (noLiceHull 3, racks!=2 20, poles<12 38). Re-run after every gen5 change (check5b/c/d.txt): clean, same stats (coast props 172 -> 166 after the wrack fix) |
| check-act4 (2000 seeds) | clean (lampSpacing 3, noCrane 2, as before) |
| parity-ashfield (2000 seeds vs f932304) | differences outside the corridor: none (160 cells opened, 8.4 props dropped, 26.2 added) |
| soak5 tide | PASS twice (before / after my fixes, soak/ and soak2/): 20 cycles, 328/336 steps, 41/42 bells, 46/41 lanes, 27/24 wash-outs, max jump 1.51/1.39 m, 0 closed, 0 stuck, 0 snaps, 0 off-lane, 0 wet gold, lane age <= 9 / 8.2 s |
| soak5 ice | PASS twice: coast 1126/718 breaks, 43/31 plunges all near (max 2.5/1.4 m), 0 low-life; farlight 882/998 breaks, 54/47 plunges all near (max 1.4/1.9 m); ver bumps <= 4/s; 0 snaps, 0 closed. (The second coast run reports stuck 41: she stood on a scrap of the shelf's thin ice with every cell round it broken, at (22, 115) on seed 478957445, which the soak reports and does not fail, by design, soak5.mjs:269) |
| perf5 (q1, phone emulation 915x412 @1.5, MSAA) | PASS, see Perf below |
| shallowtele | PASS: q1 tele 45.3, pool 45.1, cradle 34.6, tones 93.3; q0 tele 44.2, pool 43.5, cradle 33.6, tones 95 (pass > 12) |
| 29 shipped scenarios | all exit 0, no page errors or console errors/warnings (scen/summary.txt); Act IV Field ones re-run after the Field fix (scen2/) |
| vite build | clean (after each fix) |
| build:artifact | see Artifact below |
| walk of both zones | 6 defects found and fixed (below); shots in gate/shots/ |

## Perf (perf5, final code, perf5b/perf5.txt)

| spot | q1 ms (swiftshader) | q1 ratios to the Field, per cycle | q1 verdict (median) | q0 ms | q0 ratio | q0 floor | calls / tris q1 |
|---|---|---|---|---|---|---|---|
| Field of Ash camp | 613.9 | | | 153.2 | | ok | 139 / 598k |
| coast Shallows, h 1.2 | 585.8 | 0.936 0.949 0.929 0.964 0.960 | **0.949 pass** (limit 1.15) | 155.7 | 1.032 | ok | 62 / 203k |
| farlight mid Ice Road | 497.8 | 0.870 0.783 0.762 0.832 0.843 | **0.832 pass** | 126.6 | 0.819 | ok | 68 / 131k |

Overall `pass: true`. The adaptive scale would go down at every spot here (software GL: seconds, not milliseconds), as for
the Field: it says nothing about a phone.

Earlier run on the pre-fix code (perf5/): coast 0.969 (1.079 0.951 0.969 0.988 0.929), farlight 0.845 (0.845 0.819 0.852
0.858 0.777) at q1; q0 coast 1.021, farlight 0.817, floors ok. Field camp 593.8 ms q1 / 151.7 ms q0 under swiftshader
(software GL: the ratio is the gate, not the ms). The game's logic is 0.9-2.2 ms a frame in all three zones.

## Scenarios (scen/summary.txt; one at a time, BASE :5341)

Act I combat (17 kills), ranger (2 kills, 0 pets; re-run: 1, 0), mage (3), weaver (boss, quest 2), lord (quest 3), ending
(act1 1), title (play/town), panels ok; Act II pass (11 kills), stonewarden, halls (48 kills), king, ending2, cast2 (6
kinds), boons; Act III weep, hart, heart, amaranthe, echo, ending3, cast3 (11 kinds); Act IV ashfield, ivar, forge,
karthax, ending4, cast4 (11 kinds), echo4. Every one exit 0 and nothing logged. Re-run after the Field fix (scen2/):
ashfield, ivar, cast4, echo4 ok.
- ranger: kills 2 / pets 0 against the baseline tree's 5 / 1. Not a regression: the forest's layout is random per run
  (no seed), and both of my runs met a champion pack; the spirit wolf is summoned (scen2/ranger-4.png shows it) and dies
  to it before the count. Nothing in stage B touches skills, pets or the forest.

## Fixes (gate keeper; all in stage-B files)

1. **Skerry Bay drawn as deep water while walkable** (B1b's open problem 1, never done). Under the tide clock the bay
   stays at low water (tide.js), but sea.js drew all water at uLevel, so at the clock's high water the bay looked 1.2 m
   deep and closed while she walked on it; and the ground's "deep water hides the bed" discard (build.js G_WET,
   `uLevel - vBed > 0.7`) then cut black holes in the bay floor (shots/c4-bay-clockhigh.png). Fix: sea.js `SEA.uBayLevel`
   (tide.js already wrote it: 0 under the clock, the force's level under the Tower) and `bayCorners(L)` (Skerry Bay's
   share of each corner's cells, gen5 inBay), an `aBay` attribute on the water and the ground; the water's depth, the
   ground's discard and its wet sand use `mix(uLevel/uWetLevel, uBayLevel, aBay)`. Shots c5-bay-clockhigh.png (dry, as the
   grid), c5-bay-forced.png (flooded under the force).
2. **The jetty under water at high tide.** Its deck lies flush with the floor; the water is held under deck corners
   only where no tidal flat touches them, so the flood stood 0.3 m over the planks (shots/crop-jetty-high.png). Fix:
   sea.js holds every corner touching a deck cell (c3-jetty-high.png).
3. **The rime rock faces drew as white paper, then as slivers.** `rime/rockFace` and `rime/coastCliff` are geometry-only
   scans packed with a plain white material; build5 drew them "as packed" (flat white sheets, c2-jetty-low.png). Drawn in
   the sea-cliff stone (`cliff5:rime/...`, as the contract says), they showed what the white hid: each is a one-sided
   shell facing its local +z, and seen from behind (any face not turned south, the camera's side) only a scatter of
   dark slivers is drawn (shots/tg2.png, tg3.png: painted red). Fix: build5 rockFace uses the rime scan in the cliff
   stone only where it faces the camera (cos r > 0.35), else the closed rock fallback (rock5); fitInst resolves a
   'cliff5:rime/<name>' type.
4. **The hero hidden behind cliffs, the camera inside them.** gen5 raises every cliff to 8-18 m within 3.4 cells of the
   floor, whatever side it is on. The play camera sits 8.7 m south and 13.1 m up, so wherever rock lies south of the
   floor the terrain hid her, or the camera was inside the cliff and the screen went white (shots/c6-campsouth: all
   white). Measured over 12 seeds (gate/tools/occl.mjs): coast 7.0% of walkable cells hidden, 3.8% with the camera inside
   the terrain; farlight 3.4% / 2.0%; Act IV Field 0.1% / 0, Forge 0 / 0 (the Forge keeps its walls "low on their south
   faces", gen4.js:752). Fix (gen5 heights): the same rule as the Forge: rock k cells south of ground she can stand on
   stays under 1.3k - 0.2 m (smoothed across columns so it does not step; the sea north of the bay's mouth counts as
   ground, it freezes). Bergs keep their height (they are cover; the dither handles them). After: coast 0 / 0, frozen
   coast 0 / 0, farlight 0.4% / 0. Layouts, walk grid and check-act5 unchanged (heights only).
5. **The Anvil's Neck ran through the Anvil Gate's cliff blocks.** build.js anvilGateFrame stands 16 backdrop blocks
   up to 30 m east of the gate; two of them (x 79.6-87.6, z 1.5-9.5, 11-19 m tall) stood over the Neck's top, so the
   hero vanished inside rock for its last 7 m (shots/a4-z8.png). Fix: blocks over L.neck cells are left out (same RNG
   draws, so every other block stays where it was; the Field's look is otherwise unchanged). Shots a5-z8, a5-z4.
6. **Wrack dressing on top of itself** (the lead's stage-B to-do: kelp heap and driftwood on one spot at seed 3,
   90.5 96.5). gen5 dressCoast placed kelp, driftwood, barnacle rocks and anchors per cell with no spacing, and on the
   Sunken packs' kelp heaps: 390 overlapping pairs (< 1.5 m) over 100 seeds. Fix: those pieces keep 2.2 m apart
   (same RNG draws). After: 0 pairs (gate/tools/wrack.mjs).
7. **Look: the hut roofs were flat slate-grey slabs.** The stilt huts' and shacks' roofs ("turf under snow" in the
   comment) were plain 0x50565e. Now snow lies on them (bake's `snow`), as on the whale and the ship
   (shots/c7-campsouth.png, wv.png).

Files I changed: src/world/sea.js, src/world/build.js, src/world/build5.js, src/world/gen5.js. Nothing outside the
stage-B files. No asset file touched.

## The walk (shots/, phone q1 unless named d*)

- Coast, gameplay camera: the Landing (c1-camp, c6, c7-campsouth), the Shallows low and high (c1-shallows-*), sea-lights
  (c2-light0/1), the whale (c2/c7-whale), the Fall (c2/c7-fall, c8-falltop), the jetty both tides (c2-jetty-*,
  c3-jetty-high), Skerry Bay forced and under the clock (c5), the bay mouth (c5-baymouth), quality 0 (q0-grid.png).
- Coast frozen: the bay (z1-bay-frozen), the Ice Road (z1-iceroad), the Landing and jetty from a low camera (z1-camp,
  z1-jetty, tg4-all).
- Farlight: camp, mid road, hole 0, a drowned light, the arena (f1-*), bergs from both sides (f2, f3), quality 0.
- Cines (pitch 0.12-0.3): the Landing (d1-cine-camp, c7-cine-camp), the overlook/arrival (d1, c9-cine-overlook), the bay
  (z1-cine-bay), the arena under the black aurora (f1/f2-cine-arena).
- The Field: the Neck plugged, opened, its middle and top (a1-a5), the gate plaza (a5-gate-cine).
- World viewer: ?world=coast&at=camp, ?world=farlight&at=core (wv.png).

## Left for later (not gate failures; for C or the review)

- The Shallows' wet flats read as fine-grained grit at the phone's resolution (rime/shore at 2.4 m tiles,
  c1-shallows-low.png); a larger scale or a calmer water surface would read better. Look, not correctness.
- The farLight shaft's texture reads like birch bark from the play camera (f1-arena.png); the rime farLight material.
- Low cine cameras placed inside props or cliffs (huts, racks, rock piles at the cove's rim) show them close up or
  dithered: the story's cines must pick their cameras (any act has this).
- A cliff whose face looks east or west (the Fall's) shows its dark sea-cliff face as a wide band from the play camera;
  the tops are snow.
- Drowned lanterns: B2b's request to gen5 (place the lantern ~1 m north of its window) still open; not visible as a fault.
- ranger/pets: see Scenarios.

## Artifact

`npm run build:artifact`: exit 0; `artifact/` holds index.html and 142 files in assets/ (64 MB), the largest
ash-*.js 3.8 MB; none over 16 MB (`find artifact -size +16M`: none). The Act V files are in (rime, frost, crab, skotos,
tentacle, icemaw, louse, skua, the rime layers). The strict-CSP run is stage D's.

## Servers

My private no-HMR dev server on :5341 is still running (PIDs 18995/19022/19023, `scratchpad/act5/b/gate/vite5341.log`);
the baseline server on :5342 is stopped. The shared :5199 was never touched.
