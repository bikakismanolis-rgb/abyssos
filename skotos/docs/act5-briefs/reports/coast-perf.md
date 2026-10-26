# The coast's frame at q1: steps 1-3 of the plan, measured (24 October)

Branch `claude/sleepy-tesla-4030vd` at 27e12ba (version 14). Steps 1, 2 and 3 of `coast-perf-plan.md`, applied one at a
time on a private no-HMR server (:5350), one headless browser at a time. Steps 4 and 5 were not in scope.

**Outcome.** All three steps went in as exact changes: 45 time-frozen views (phone q1, q0, desktop q2, the coast and the
Farthest Light) are bit-identical to HEAD but for 1/255 on at most 66 pixels of a view, on the Farthest Light only. But
they do not make the frame cheaper on this machine. perf5 cannot tell them from HEAD, and an interleaved A/B of the
four trees in one browser puts the step-3 tree 3-4% *slower* than HEAD, within the noise of a HEAD-against-HEAD run.
Of the scenarios, the tide soak failed 3 runs of 3 on the changed tree. It runs game logic only and passed 3 of 4 at
HEAD; see section 6. The code is reverted. Only this report is committed.

The reason is a fact about swiftshader that the plan, and my reading of the last round, got wrong. A branch is
skipped only when its body holds a loop the compiler cannot hoist the work out of, as the last round's big branches
did (round the lights' loop). Plain arithmetic in a branch is worked out on every lane whether or not any lane takes
it, discards included. Steps 1-3 are
made of exactly such gates, so here they save nothing and add a little bookkeeping. See section 3.

## 1. Numbers

**perf5** (`QS=1 CYCLES=9` unless stated; the median of the per-cycle ratios to the Field of Ash):

| tree | run | Field ms | coast ms | coast | coastLow | farlight |
|---|---|---|---|---|---|---|
| HEAD 27e12ba | 1 | 633 | 724.3 | 1.180 FAIL | 0.986 | 0.961 |
| HEAD | 2 | 635 | 720.7 | 1.159 FAIL | 1.015 | 0.991 |
| steps 1-3 | 1 | 633.8 | 737.2 | 1.163 FAIL | 0.999 | 0.970 |
| steps 1-3 | 2 | 664.7 | 752.3 | 1.106 PASS | 0.942 | 0.915 |
| steps 1-3, default (QS 1,0; 5 cycles) | q1 | 657 | 815.6 | 1.192 FAIL | 1.003 | 0.991 |
| | q0 | 175.3 | 214.1 | 1.221 | 1.059 | 0.944 |

The q0 floors all hold. In the second run after the steps, the pass comes from the Field, the control, which drew 5%
slower than in every other run (the plan says rerun past 3%). The coast's own milliseconds went up, not down. Single
cycles range 1.01-1.29, so nine cycles cannot resolve the few percent the plan expected.

**A/B in one browser** (`node tools/stillshots.mjs bench <base> ...`): each tree served on its own port, the same pinned
view (perf5's coast spot: the Dalaro + 4 m, water 1.2, phone q1), nine rounds in a turning order, best of 3 per part
per round, medians:
- **frame**: the whole frame.
- **groundVS**: the ground alone through a one-pixel scissor, which leaves its vertex work.
- **ground**, **sea**: each alone over the full screen.

| tree | frame | groundVS | ground | sea |
|---|---|---|---|---|
| HEAD | 632.1 | 20.1 | 262.5 | 158.0 |
| + step 1 | 629.7 | 20.7 | 273.4 | 155.8 |
| + step 2 | 659.4 | 21.3 | 271.2 | 163.4 |
| + step 3 | 665.2 | 20.8 | 269.4 | 164.9 |

Run again in the reverse page order: HEAD 624.5 / 260.8 / 155.0 against step 3 at 647.4 / 276.5 / 164.3. At the
Farthest Light, step 3's frame against HEAD was 0.990, and a second copy of HEAD gave 0.980.

**Controls**, which are not exact and were not proposed, run to find out what is worth having:

| tree (against HEAD in the same run) | frame | groundVS | ground | sea |
|---|---|---|---|---|
| HEAD again, another port (A/A) | 0.971 | 0.985 | 1.027 | 1.029 |
| the windows' outline removed | 0.950 | 1.047 | 0.926 | 1.030 |
| the ground's vertex aurora removed | 0.988 | 0.870 | 1.007 | 1.018 |
| step 1's window gate alone | 0.975 | 1.030 | 0.999 | 1.020 |
| step 1's riders alone | 1.005 | 1.039 | 1.046 | 1.009 |
| windows: nearest found first, outline's loop behind a branch | 1.020 | 1.034 | 0.989 | 1.038 |

The A/A run sets the noise at about 3%.
- **The windows' outline.** It does cost what the plan said: removing it takes about 20-30 ms (7-10%) off the ground,
  and 2-5% off the frame, over three runs. Step 1's gate does not recover any of it.
- **The vertex aurora.** It is about 3 ms of the ground's 20 ms of vertex work, not the plan's 15-18. Most of the vertex
  cost is elsewhere, so step 2 could gain about 3 ms at best, even where the gate works.

## 2. What each step changed

All of this was applied, checked and then reverted. The diffs are kept in the scratch directory (section 4).

**Step 1** (`build.js`, `groundMat`):
- **Window gate**, as planned: `if (dot(wd, wd) < 0.93)` round `winR`. The exactness claim holds. `winR`'s divisor is at
  most 0.96 and the 1.12 stretch only lengthens d, so a hole pixel has |d|² < 0.9216.
- **Rider 1b, adapted.** Only the drift's turn `gwb` (two cosines) moved into `if (gsk > 0.002)`. The plan also moved
  the meander's bend `gPw.y += sin(...) * 2.2 + sin(...) * 4.0` in there, and that part was dropped. `gPw.y` feeds the
  `gS` tap's implicit LOD and the sastrugi's `fwidth(sph)`. Moved into the branch, the lanes left out of it carry the
  unbent value, so a quad straddling the shore's edge would take its mip level and its fwidth from coordinates metres
  apart. Swiftshader computes every lane, so it would show too.
- **Raking light**: gated with `if (gsk > 0.0)`. Exact: rk is gsk's, and the multiplier is exactly 1 at gsk 0.
- **Rider 1c, moon glint**: gated with `if (gMg > 0.0)`, and its 18th power taken by squaring.
- **Rider 1c, gWet gate: dropped.** It moves the `shoreN` tap (mipmapped `tNoise`) under a per-pixel `wB > 0.2` test.
  Doing that safely needs the UV's derivatives taken before the branch and a `textureGrad`, which on phones often costs
  more than the trilinear tap it saves. The pixels it spares (snow over the flats) are few.

**Step 2** (`build.js` ground vertex, `sea.js` water vertex): the aurora worked out only within a margin of the frustum.
The test went into a shared `nearView(wp, m)`, taken from `NEAR_GLSL` in `sea.js`, with an orthographic camera always
passing. Four checks against the claims:
- **The 8 m margin is wrong.** The plan bounds triangle edges by their horizontal span, 1.41 m plus `shoreJit`. The
  ground's corners carry the cliffs' heights, and `tools/stillshots.mjs edges` measures the coast's longest ground edge
  at 8.39 m, down a cliff face. Over 80 seeds of each map, gen5's corner heights put the worst at 9.4 m. With 8 m, an
  on-screen triangle could lose its aurora at one corner. I used 12 m.
- **The water**: the longest edge is 2.5 m, about 2.6 with the swell.
- **No shadows**: neither mesh casts one, and the scene's only camera is the perspective one.
- **No moved meshes**: the water's shader uses its own world point, and every water mesh stands unmoved.

A run with the margin at 0 changed 23 of 25 coast and Farthest Light views, by up to 72/255 at the screen's edges. A
run at 12 left them identical. So the shots do catch a margin that is too small.

**Step 3** (`sea.js`, water fragment), all as planned:
- **(a) Foam.** The band's upper bound is 0.076, not 0.075, to leave room if `sin` rounds a hair above 1.
- **(b) Step line.** `fw` and its `fwidth` stay outside the branch.
- **(c) Lace.** Gated at `vLand > 0.17`. The bound is checked: the added terms come to at most 0.035 + 0.03 + 0.03, with
  `n2 = n1.gbar` at q0 also in 0-1.
- **(d) Deep-only work.** `deep` is exactly 0 on wading water.
- **(e) Light-path normal.** `Ng` moved into the light loop, after its second `continue`.
- **(f) Slope.** Worked out once, before `plateK`, at the same nesting as before.
- **(g) Black aurora.** Gated on `vAurK > 0.0`.
- **(h) Crest whitening.** Gated on `vCr > 0.22`.

The optional swell-slope varying was not applied, because it is not exact.

## 3. Why exact gates save nothing here

A micro-benchmark gave the reason: a full-screen quad at 1372 x 618 with MSAA under this Chromium's swiftshader, ms per
draw. The scratch script is `micro/br*.mjs`.

| fragment body (no pixel takes the branch) | ms |
|---|---|
| nothing | 6.7-7.6 |
| 24 sin+cos terms in a loop, always | 35.8-38.0 |
| the same loop behind `if (gl_FragCoord.x < -1.0)` | 7.7-8.7 (skipped) |
| the same 24 terms written out, always | 29.1-35.9 |
| the written-out terms behind the same branch | 29.2-34.1 (not skipped) |
| ... with a texture read inside / with a `discard` | 30.5 / 32.7 |
| ... inside a one-trip loop on a uniform | 36.4 (the invariant work is hoisted out) |
| the windows' loop (3 `winR`, none near), as in HEAD | 33.4 |
| ... with step 1's gate inside the loop | 32.2 |
| ... nearest found first, outline's loop behind a branch | 18.5-23.5 |

Straight-line arithmetic in a branch is worked out on every lane, whether or not any lane takes it. Speculated or
executed under a mask, the cost is the same. A loop that no lane of the quad enters is skipped, unless the compiler
can hoist its work out of it. The last round's finding ("a branch whose lanes are all false is skipped like deleted
code") was true of the branches it built. Each one wrapped the rest of a shader, lights' loop and all, and the plan
generalised it to every branch.

Steps 1-3 gate plain arithmetic, so here each gate's body still runs. The A/B's 3-4% loss on step 2 and step 3 is
within the A/A noise, but nothing points to a gain. The riders' tree measured 4.6% slower on the ground alone.

The one restructure that did save in the micro-benchmark, the nearest window found first, saved only a third to a half
of the outline's cost there, and nothing measurable in the real ground (0.989 and 0.961 of HEAD, inside the A/A's
0.959-1.027). It was not kept.

On a phone these gates are real branches and would likely spare the work they guard. That cannot be measured here,
and the gate this work was for is swiftshader's.

**What this means for the plan.**
- Items 1-3 cannot move perf5 on this machine.
- Item 4 (the flat stand-in under closed water) gates the full lighting, with the point lights' loop and the PCF taps.
  That is the kind of body swiftshader does skip, so of the plan's items it is the one that can move perf5.
- Item 5 removes a tap outright.
- The windows' outline is a real 20-30 ms. Saving it here needs it out of every pixel's straight-line path, for example
  the cut baked into the ground's own geometry or a per-vertex window flag. Neither is exact as it stands.

## 4. The shots

**The tool.** `skotos/tools/stillshots.mjs` (new). It is not committed, by the rule for this outcome; it is in the
working tree. It runs in four modes:
- `shoot <dir> [groups]` takes time-frozen shots.
- `diff <a> <b>` compares two sets of shots, per view.
- `edges` measures the longest triangle edge of the ground and the water.
- `bench <base> ...` runs the interleaved A/B timing.

**Pinning.** Each group is one page of the world viewer, in perf5's phone context (915 x 412 at 1.5, MSAA) or on a
1280 x 720 desktop. Before each picture the page pins:
- `Math.random`, seeded by an init script (the lights' flicker phases, the particles);
- the viewer's own `&beam` light sources, reset;
- `uTime` (the water's is the same uniform) and `R.time`;
- the aurora's `uAur`, `uAurDark` and `uAurFront`, set to the atmosphere's;
- the hemisphere's drift, worked out from that time;
- the snow and the particles, hidden;
- the camera: pitch, zoom, and lookY 5.9 for the cines.

Then it renders once and reads the whole canvas in the same task.

**The 45 views:**
- **coast, phone q1:**
  - the Dalaro at water 1.2, 0.6 and 0;
  - the closed step at 0.9 and 1.05;
  - the Grey Light's and the Fall's sea-light windows (the hole in the ground) at 1.2 and 0.6;
  - a steep shore with lace at 1.2 and 0.6;
  - wading water round the hero (a 0.9 m bed at 1.2);
  - the Landing and the Strand at 0.6;
  - four cine cameras at 1.2: pitch/zoom 0.3/0.95, 0.2/1.25, 0.3/1.0, and the coast's lowest story camera 0.12/0.85;
  - cine 0.2/1.25 at 0.6.
- **beam:** a lit sea-light (`&beam`) at 1.2 and 0.6, by a window, and from a cine.
- **wake:** the wake at 1.2 and 0.6.
- **freeze:** the Freeze half way, play and cine cameras.
- **farlight:** the middle pole (perf5's spot), two drowned windows, a hole, a cine, and the Light's own story camera
  (pitch 0.1, zoom 2.2).
- **q0 phone:** 5 coast views.
- **q2 desktop:** 5 coast views and 2 Farthest Light views.

**Results:**

| shots | against HEAD |
|---|---|
| HEAD, second run | 45 of 45 identical (the tool is deterministic) |
| step 1 | 44 identical; q2-far-poles 1 pixel at 1/255 |
| step 1 + 2 | the same |
| step 1 + 2 + 3 | 40 identical; far-cine-b 66 pixels, far-cine-light 23, far-hole 9, far-poles 3, q2-far-poles 2 (all 1/255) |

Bisected over step 3's parts, the Farthest Light's pixels come from (g) alone, the black-aurora gate. They are isolated
single pixels, not lines, under the black aurora, the only place where vAurK is not 0 and the gate is taken. The
values are the same, compiled into another order of operations. The coast's views were identical through every step.

**Where everything is.** All under
`/tmp/claude-0/-home-user-abyssos/848977a8-1632-5f97-b36d-9baf61edd253/scratchpad/cp/`:
- `shots/head`, `shots/head2`, `shots/s1`, `shots/s2`, `shots/s3`: the shot sets. `diff-*.png` in each is its
  difference image, x16.
- `shots/m0`: the margin-0 check.
- `shots/bis-*`: the bisection.
- `s1/`, `s2/`, `s3/`: the step-by-step `build.js` and `sea.js`.
- `perf-*.log`: the perf5 logs.
- `bench-*.log`: the A/B logs.
- `micro/`: the micro-benchmarks.
- `scen/`: the scenario logs.

## 5. Derivative audit

**What the steps moved.** No texture read with implicit LOD and no `dFdx`/`dFdy`/`fwidth` went into a branch that can
differ between neighbouring pixels:
- **Step 1, window gate:** `winR` is atan, sines, a length and a divide. The set of pixels that discard is unchanged.
- **Step 1, `gwb`:** only consumed by the sastrugi's direction, never differentiated. The part of 1b that would have
  moved a derivative input (the bend `gPw.y`) was dropped, as above. So was 1c's gWet gate, which would have moved the
  `shoreN` tap.
- **Step 1, raking light and moon glint gates:** arithmetic only.
- **Step 2:** vertex shaders, which have no implicit derivatives; a vertex `texture2D` reads level 0.
- **Step 3, (a), (b), (d), (g), (h):** the bodies hold no reads or derivatives. (b)'s `fwidth(depD)` stays outside its
  branch.
- **Step 3, (c):** the lace's `vorT` tap was already inside `if (lace > 0.001)`. The new outer gate removes only lanes
  where lace is already exactly 0, so the lanes that reach the tap are the same as before.
- **Step 3, (e):** `Ng` reads `n2`, fetched outside.
- **Step 3, (f):** the slope's `fwidth` is computed once, at the nesting it had.

**Already in HEAD, not touched** (for a separate change):
- **The water's dry-pixel branch.** The last round's `if (seaOn) { ... }` (sea.js, after its discard) holds every
  implicit-LOD tap of the water (`n1`, `n2`, the streak tap, the plates' and the lace's `vorT`) and every
  `fwidth`/`dFdx`. Lanes that discard skip it, so in a quad straddling the waterline the other lanes' mip level and
  fwidth come from lanes that never ran the code: undefined on a GPU, invisible on swiftshader, which computes every
  lane. On a steep shore, where one pixel spans centimetres of depth, those quads can hold foam and lace at full
  strength.
- **The ground's 0.56 m branch.** Its `if (... <= 0.56)` does the same for all its layer and normal-map taps, at the
  0.56 m cut. The water there is 95% opaque, so it is less likely to show.
- **Lesser cases, mostly faded at their edges by their own weights:**
  - the ground's `gS` tap inside `gsk > 0.002`;
  - its marks' `gR` tap and `fwidth(rph)` inside `wB > 0.002`;
  - the path layer inside `vLay.y > 0.01`;
  - the normal maps gated by `wB`/`wP`;
  - `fwidth(sph)` inside `gSa > 0.002`;
  - the water's sparkles' `fwidth(P)` inside their hash test;
  - the Freeze block's taps and `dFdx(vWP)` inside `fk > 0.001`.

## 6. The scenarios (steps 1-3 applied)

Run on the step-3 tree, one browser at a time, before the revert:

| scenario | result |
|---|---|
| coast | PASS |
| tide | FAIL, 3 runs of 3 (lane tests washed out: 0, 1 and 2, of the 3 needed) |
| freeze | PASS |
| shallowtele | PASS (tele 28.8, pool 15.2, cradle 11.6, halo 1.01) |
| hook5 | PASS |
| soak5 ice | PASS (coast and Farthest Light) |

**The tide failures.** The tide soak is game logic only: `&norender` at q0, with one render at the very end, after its
results are read. So the changed shader strings were never compiled while it ran.

At HEAD it passed 3 runs of 4:
- washed out 4, 5 and 6 times in the three that passed;
- the fourth run failed on another of its criteria (`wet` 3);
- one of the passes used the seed of a failed step-3 run, 653785346.

I see no path from the shaders to these results. The soak's monsters are respawned on a real-time poll, so its lane
tests are timing-sensitive. Still, three failures on the changed tree against three passes on HEAD is worth keeping in
mind if these changes come back.

## 7. Files

- `docs/act5-briefs/reports/coast-perf.md`: this report, the only file committed.
- `tools/stillshots.mjs`: the shot, diff, edge and A/B tool. It is left untracked in the working tree, by the rule for
  this outcome.
- `src/world/build.js`, `src/world/sea.js`: changed, measured and reverted to 27e12ba. The three steps' versions are in
  the scratch directory (section 4).
