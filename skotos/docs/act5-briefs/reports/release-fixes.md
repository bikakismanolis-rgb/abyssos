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
