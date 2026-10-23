# Act V release fixes (the last problems before Act V goes live)

Branch `claude/skotos-act5-fixes` from ca88dd3. Four problems: perf5 at the coast, the Act V checkpoint after Continue,
the flaky `holes` and `tower` scenarios, and runtime errors only the on-screen `#fatal` box shows.

## 1. Frame time at the coast (perf5)

**Cause.** At perf5's coast spot (the Dalaro, high water, phone emulation, quality 1) the frame is all draw (logic ~2 ms)
and swiftshader's draw is fragment work: vertex work is 12 ms for the sea, 21 for the wreck, 33 for the ground (a
1-pixel scissor). Two of its habits matter. It shades every rasterized fragment whether or not the depth test passes,
and a `discard` (or a `return` after it) spares none of the code that follows; only a branch whose lanes are all false
is skipped. The third look round's water added about 45 ms per frame (sea pass ~245 ms against ~200 for f119d13's
sea.js): the closed step's cubic B-spline (four extra taps of tBed and their weights) runs over half the screen, because
at high water the Shallows' flats lie within its 0.25 m window of the step almost everywhere; and the smoothed waterline's
own tap. The rest of the water's cost was older: a dozen `pow()` per pixel and the two light paths.

**Fix** (no visible change; quality 1 and 2 alike):
- sea.js: whole powers by squaring (`sq2`, `sq4`, `sq16`, `sq256`; the glints' 220/260/300 taken as 256 with their
  weights nudged to match).
- sea.js: the B-spline baked on the CPU into tBed's green channel on a grid four times as fine as the corners'
  (`BS = 4`; the smoothed bed in red, bilinearly upsampled, which is exact). One tap now gives both; linear filtering of
  the 4x samples stays within a millimetre or two of the true spline. The spline now holds everywhere instead of a 0.25 m
  window (no seam at its edge).
- sea.js: the lantern only within its radius, the shallows' sparkles only off closed water, each light path skipped where
  both its broad path (under 1e-4) and its pool (past 30 m) are nil.
- build.js (the coast ground) and sea.js (the water): the existing discards (the ground under closed water deeper than
  0.56 m, the water on dry pixels) now also open a branch round the rest of the shader, so what they discard is no longer
  shaded. The ground's comment already claimed this ("its layers and its lights spared"); on swiftshader it was not.

**Numbers.** perf5 QS=1, 21 cycles (median of the per-cycle ratios to the Field of Ash):

| tree | coast | coastLow | farlight |
|---|---|---|---|
| start (ca88dd3), 9 cycles | 1.224 FAIL | 0.952 | 0.936 |
| powers, baked spline, gates | 1.170 FAIL | 0.970 | 0.971 |
| + the discards made branches | **1.075 PASS** | 0.968 | 0.962 |

In-page A/B at the coast spot (two trees side by side, 9 interleaved rounds): sea pass 246 -> 190 ms, frame 1062 -> 959 ms.

**Look.** Time-frozen shots of both trees at the same views (uTime, the aurora's uniforms and the camera pinned, snow
hidden), phone q1: the Dalaro at high, mid and low water, the closed step at 0.9-1.2 m, a lit sea-light at high and mid
water, three cine cameras (pitch 0.3/0.95, 0.2/1.25, 0.3/1.0). Differences are at the level of the same tree against
itself (the sea-light's beam turns by real time), nothing in the water's line, colour or glints.

## 2. The Act V checkpoint after Continue (cp5)

**Cause: the test, three ways; the game was right.** How the game keeps it: Act IV keeps its lamp in `flags.lastLamp`
and sets `z.checkpoint` again when the zone is built; Act V keeps `flags.cp5[zone]` (checkpoint5, world.js) and
act5Enter calls checkpoint5 on every entry, so a Continue (which builds the zone again) and a respawn both restore it.
That holds on every run below. What failed was cp5 itself:
1. To log when `towerWake` and `cp5` were set, it redefined both flags as **non-enumerable** accessors. JSON.stringify
   skips those, so the save written before the Continue lost the Tower's waking and the checkpoint. The game then woke the
   Tower again 2.5 s after the hero came back to the coast (story.js enter5: three lights, three memories, no towerWake),
   which set the rock checkpoint again: the test passed when that came before its death and found her at the waypoint
   when the death came first. The watch is now installed after `A5.state` (which deletes every flag) and is enumerable.
2. `die()` turned immortality off to kill her and never on again. After the respawn a coast monster could kill her a
   second time; that death's panel, opening 1.8 s later, paused the game while the test waited (600 s) for the Tower to
   wake (seen twice in a row; integrate.md's "Tower awake wait ran out" was probably this). Immortal again at the respawn.
3. It measured where she woke 0.8 s after the fade lifted; once a Sunken had hooked her 4 m by then (shot: "Hooked!").
   It now reads her position the frame the fade lifts.

**Verified:** cp5 x6 after fixes 1-2 (5 pass, the sixth is fix 3's case), then x4 more with all three (see the table at
the end).

## 3. Flaky scenarios

### holes (the test was wrong)
- The Black Breath's warning lasts 1.2 s of play, about 0.3 s of real time at sim 4; the test looked every 300 ms plus
  an evaluate round trip, so it often never saw a Breath to shield (the old 1-in-3). Now the page meets it every frame
  (the same rAF hook that already cut down what climbs out of the hole) and counts each by what it did when it landed.
- With the shields landing, runs failed on time instead (93-257 s against the 90 s ceiling): a lamp the Ice Singer or a
  Skua put out was relit from Node after a look and a fixed 1.2 s wait (game seconds with the ring stalled), and the
  first lighting's `A5.use` waited up to 15 s real for a touch that a Breath step had broken (a probe found 147 s of seal
  time gone before the run loop began). The page now relights a seal's dark lamps every frame from its first lamp.
- Each seal then takes 12-16 s and meets about one Breath, so the per-hole plan ("shield twice, then let one go") never
  let one go and "some lamp relit" failed. The plan now runs over the three holes: shield the first Breath, let the
  second put its lamp out and relight it, shield the rest.
- 10 of 10 pass (seals 11.6-16 s; one shield, one lamp lost and relit; the hole2 checkpoint 0 m after a Continue).

### tower (the bot was wrong, and the game had one bug in two places)
**Game (ai.js towerHaul).** The Walking Tower's hauls ended only within 0.7 m of their target. When `seek` could make no
way there (a target its body could not reach), it stood still: once 40 s in the ice phase's opening haul (state `haul`,
the hero 2.8 m off), and once on the crawl home (`back`), where the first Island starts only on arrival, the flask comes
only with an Island, so there was no Island, no light and no Blinded until the 60 s fail-safe let it die. A haul that
gains under half a metre in 3 s is now let go: onto the thick, back to the fight (its `thickSeek` goes straight to the
thick); home, the Island settles where it stands, as every later Island does.

**Bot (test).**
The ice phase holds 30 s (`lockT`), then lets go whether or not the Tower was overturned. An Overturn needs a Shell Rush
(3.5-16 m, every 7 s) to cross webbed thin ice (stage 2: two Rushes, or one Hammer Claw), or any thin ice from the
fourth Rush on. A probe logging the bot every game second showed the failing runs spend the phase on land or thick ice
3-5 m from the Tower, dodging its sweeps (every 2 s within 7.2 m); the Rushes then never cross thin ice (one run: 40
Rushes, 4 hints, no Overturn). The bot (BOT5, test code) now:
- baits on thin, unwebbed ice 8-15 m from the Tower (20 if nothing nearer can be walked to), scored for its distance from
  the thick ice (the Tower keeps to the thick in this phase, so it cannot close to sweep range), a bonus past the Bell's
  9.5 m and a cost for how far she must walk; re-picked when the Tower comes within 7.5 m or goes past 16;
- where a Hammer Claw has webbed the ice 3-12 m off, stands 3 m beyond that patch (at least 7.5 m from the Tower), so the
  next Rush runs through it;
- keeps to the bait for the whole ice phase except the Overturn and a daze (while the Tower turned or hauled, it went to
  strike it and stayed in its sweeps);
- takes the best bait it can walk to, within the Rush's 15 m and at most 6 cells from the thick (further, the thick cell
  nearest her lay beyond the 14 m the Tower looks, and it stood still);
- walks to every goal but a dodge by the map's own way (`GridMap.stepToward`), not in a straight line (in a line it once
  stood 22 m from the Tower across water for a whole phase),;
- under a ringed telegraph with a calm (the Bell: ring 9 m, calm 4.5 m, 1.3 s), steps out of the ring when that is
  nearer than the calm and the way out is walkable (shared with the Skotos bot).
The test's Bell check read her distance at its next 500 ms poll (one "Bell rung" at 15.9 m); the bot now records it the
frame the Bell rings, and the check passes if she took one Bell in its calm (the old check) or no Bell caught her (in its
calm or out of its ring each time). Also: after a death the test waited for ever for the bot's promise (the death
panel stops the bot's clock); it stops the bot first. And when no Overturn comes it prints the bot's ice phase, a line
a game second (time, state, distance, the ice under her and its stage, her bait, a telegraph on her, the Rushes so far).

## Progress
- 14:40 started; npm install, graphify; private no-HMR dev server on :5401.
- 14:55 `tools/fatal.mjs` (the shared #fatal check) wired into scenario.mjs, soak5.mjs and coop.mjs; checked with a
  timer that throws (caught, with its stack).
- 15:16 perf5 (QS 1, 9 cycles) on the start tree: coast 1.224 of the Field (FAIL), coastLow 0.952, farlight 0.936; logic
  ~2 ms everywhere, so the frame is all draw.
- 15:25-16:40 profiling with an in-page A/B (scratch tools: ab.mjs patches the water shader at runtime and times the sea
  pass alone, the rest drawn first untimed for its depth; ab2.mjs puts two trees side by side in one browser). Sea pass
  at perf5's coast spot ~245 ms of a ~1100 ms frame (f119d13's sea.js: ~200). Findings: the round's tBed block ~40 ms
  (the B-spline's four taps run over half the screen: at high water the Shallows' flats lie within its window of the
  step); a dozen pow() per pixel ~22 ms; the two light paths ~35 ms; branches whose lanes are all false are skipped by
  swiftshader (a varying-false branch costs as little as no code).
- 16:40 sea.js: whole powers by squaring; the B-spline baked into tBed on a 4x grid (one tap gives the smooth bed and the
  step's bed); lantern, sparkles and light paths only where they show. Sea pass 246 -> 192 ms, frame -4.6% (ab2, 9
  rounds). Look: time-frozen shots of both trees (phone q1: Dalaro high/mid/low, the step at 0.9-1.2, a lit light,
  three cine cameras) show no difference beyond what the same tree shows against itself (snow, the aurora's ramp).
- 16:45 cp5: the test's own watch on towerWake/cp5 made both flags non-enumerable, so the save lost them; fixed (test).
- 16:50 holes: the Breath handled in the page every frame (test).
- 16:50-17:20 perf5 (QS 1, 21 cycles) with those changes: coast 1.170 (from 1.224), coastLow 0.970, farlight 0.971. Not
  enough. The coast frame by material (each group drawn alone over the full depth, scratch prof.mjs): ground 397 ms,
  the Dalaro wreck 193, the sea 187, the hero ~150. Two facts about swiftshader decided the rest: it shades every
  rasterized fragment, depth test or not (the wreck costs the same over a depth buffer cleared to 0 as to 1), and a
  discard (or a return after it) spares nothing of what follows (the ground discarding every fragment still cost 368 of
  388 ms), while a branch whose lanes are all false is skipped like deleted code.
- 17:40 build.js: the coast ground's "not drawn under closed water" discard now also opens a branch round the rest of the
  shader (its own comment already said its layers and lights were spared; they were not). sea.js: the same for the
  water's dry-pixel discard. Frame 1062 -> 959 ms against the start tree (ab2, 9 rounds); shots unchanged (pixels the
  branch skips are discarded anyway).
- 17:47-18:08 perf5 (QS 1, 21 cycles): coast 1.075, coastLow 0.968, farlight 0.962: PASS (field 879 ms, coast 946).
- 18:09 cp5 x5, holes x10, tower x10 queued, one browser at a time.
- 18:10-18:40 cp5 x5: 2 PASS, then runs 3 and 4 stuck in the "Tower awake" wait. Probe (a copy of the runner logging the
  wait every 10 s): the game paused on the death panel, game time frozen. die() set window.__immortal = false to kill her
  and never set it back, so after the respawn a coast monster could kill her again, and that death's panel, opening
  1.8 s later, held the game while the test waited for the Tower. Fixed in the test (immortal again at the respawn).
- 18:50 cp5 x6, holes x10, tower x10 queued again.
- 19:04 cp5 run 5 of 6 failed on its last wake: 4.0 m from the third hole (bound 3.5), every key right. Its shot shows
  her hooked by a Sunken ("Hooked!") in the 0.8 s the test waits before measuring. The test now reads where she wakes as
  the fade lifts. (5 of 6 passed with the immortality fix; the sixth is this measurement.)
- 19:09-19:30 holes: with the Breath in the page the shields always land, but runs failed on time (93-257 s): a lamp
  relit from Node waited for a look and 1.2 s (game seconds at sim 4 with the ring stalled), and the first lighting's
  A5.use waited up to 15 s real for a touch the Breath handler had broken (the probe: 147 s of seal time gone before the
  run loop began). The page now relights a seal's dark lamps every frame from its first lamp; and since each seal then
  takes 12-16 s and meets about one Breath, the shield-or-let-go plan runs over the three holes (shield the first, let
  the second go out and relight it, shield the rest), so "some lamp shielded" and "some lamp relit" both happen.
- 19:33 holes x10, tower x10, cp5 x4 queued.
