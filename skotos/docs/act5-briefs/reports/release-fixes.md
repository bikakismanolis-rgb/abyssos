# Act V release fixes (the last problems before Act V goes live)

Branch `claude/skotos-act5-fixes` from ca88dd3. Four problems: perf5 at the coast, the Act V checkpoint after Continue,
the flaky `holes` and `tower` scenarios, and runtime errors only the on-screen `#fatal` box shows.

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
