# Act V look, fixer round 3 (progress notes first; per-issue lines, perf and shots at the end)

Scratch: scratchpad/act5/look/r3/ (tools/, probe/, after/). Before = the critic's crit3/ set (same configs, seed 3; my files
are unchanged between crit3's tree 564162f and HEAD f119d13).

## Progress notes
- 08:12 started; no prior round-3 work (no round3.md, no r3/). Tree clean at f119d13. (The lead later checkpointed part of
  this round's work in 5bc70ea and ff97499; the rest is uncommitted in my files only.)
- 08:15-09:10 first pass over most issues (probe daemon r3/tools/daemon.mjs on :5413, one browser; private vite :5403):
  sea.js: ice q1 commas (ICE_Q1's nD.b was nB.r, a 4-cell octave read at 0.9/m: a 1.1 m wallpaper), bubbles hashed/warped/
  jittered; aDrop per corner (closed water to the land at drops) + lip held at the land's height; lacy foam line instead of
  the blotch frill (water) and a thin grey lip (ice); tBed smoothed bed texture for the waterline (dw/film per pixel, vertex
  floor 0.012, drawRange keys from both beds); round pixel sparkles, white moon-path glints, light-path sparks thinned near
  the fire; drowned window: dark pane, core held in the hole, caustics, halo; pit walls dark (pit5); motes; ground glow
  round the farlight windows (build.js G_WIN); black aurora: airglow band, denser stars, lit hems; aurora reflection softer
  at low eyes; freeze crests clustered/bent; frozen coast beyond: ice only over freezeBay's band (wandering sides), dark
  ICE_FARD, the band's two border rows iced, east water.
  build.js: frozen flats (uFzG: rime in troughs, glazed cracked pools, hoarfrost glitter, wet gloss off); Skerry Bay snow
  tongues. textures.js: masonry() irregular ashlar + masonryNormal(); driftwood texture. build5.js: shaftMat (normal map,
  streaks under string courses); icy material vc variant (AO), finer tone, broken strata; bergs rebuilt (flutes, crevasses,
  drifted cap with lip, skirt); plateGeo slabs x3 + scan chunks on the road; Frozen Fall hanging curtains with AO, pool in
  the thin ice's glass; rockFace only against tall cliff; whale drawn back from Thaleia; sailor's hull cut round its stone;
  timber() logs/firewood with grain and ring ends; tents; grey low tufts; kelp flattened; tower slits; bell; jetty posts;
  wreck planks overlay. gen5: cap crags (heights only), steeper isolated rocks, islet rock clusters. check-act5 clean (60, 40).
- 09:10-10:30 second pass after looking at every changed view (daemon probes in r3/probe/): ice desaturated, snow kept off fluted
  walls; berg caps' relief up, skirt irregular; fall: curtains (wide overlapping columns), rounded foot, dimmer sheen; mirrored
  aurora blurred by the eye's height (the low cines' worm-lines; the far sea's own per-pixel read hazier too); hero lantern
  glint narrower; cap crags made broad and continuous (cell-scale notches stood up as shards before the synthetic camp cine's
  camera, which sits inside the cliff south of the camp); the steeper isolated-rock ramp tried and REVERTED (it raised the
  ribs by the Landing into spikes). check-act5 300@5 clean (r3/check-act5-300.txt; oddities as at the gate). vite build clean.
  shallowtele PASS (tele 42.8, pool 13.8, cradle 13.2, tones 54.6, halo 0.99). (A first "baseline" on :5404 failed the cradle
  at 7.8, but it served ff97499, whose checkpoint commits 5bc70ea/ff97499 already hold part of this round's work; the true
  pre-round baseline f119d13 is re-extracted to r3/base/ and measured below.)
- 10:31 after-shot chain started (r3/tools/chain.sh: far-d coast-d coast2-d far-p coast-p, critic's shot.mjs at :5403,
  outputs r3/after/<set>/); then perf5.
- 10:31-11:15 far-d after-set shot (r3/after/far/, 54 views; farlight has no tidal beds, so the later sea.js edits leave it
  valid). Reviewed against crit3: shaft ashlar, bergs, Ice Road plates, drowned lanterns, black aurora, tents all read.
- 11:15-11:32 coast-d started, then STOPPED at 19 views (moved to r3/after/old-coast/): its d-shallows-mid showed the
  critic's sawtooth unchanged. Cause: the closed step (deep), its pale line and alpha still read the corners' depth over
  the triangles. Fix: the closed step reads tBed too, but kept within -2/+6 cm of the corners' own beds read bilinearly
  (tBed's G channel: the unblurred corner beds); wholly from the blurred bed, a closed two-cell trough by the Dalaro blurred
  into a wading film the walk grid forbids (probe r3/probe/s4/shallows-mid*.png). Also shoreJit: a coast shore of land or
  rock against the open sea now leans 0.1-0.85 m out over the water, never back (66 of 191 such corners move > 0.45 m),
  not across a strait under three cells. vite build clean (r3/build3.log).
- 11:46 chain restarted: coast-d (all 48), coast2-d, then the phone sets trimmed to the issue views (far-p 11, coast-p 17,
  coast2-p 7; the full configs kept as r3/tools/full-*.json); then shallowtele (mine and f119d13), perf5.
- 11:46-13:17 coast-d, coast2-d, far-p shot and reviewed (sheets r3/cmp/c1-c9.png). Regression found: the critic's low camp
  camera (camp-lit-cine, fz-camp-cine, sl-camp-cine: pitch 0.2, zoom 1.25, 21 m back) now shows one broad pale slab
  across the left of the frame. Probe (r3/probe/s5/camp-cine.png, ray.js): ground at 4.5 m from the lens, (22-23.5,
  8.3-10, 157.5); the camera sits at (24.5, 9.63, 161.9), inside the hill south of the camp (its ground 10.5-12.4 m
  round it). Before the crags that slope stood 1-2 m higher and the lens was wholly inside it (back faces culled); the
  crags lowered it to the lens's height, so its top shows edge-on. The game's own camp cines (rite: pitch 0.32, zoom
  0.95) never put the camera there and are clean (coast/d-rite-story.png). Left as is: see issue 8.
- 13:21-13:42 coast-p and coast2-p (trimmed). p-shallows-mid still stepped in right angles: read bilinearly from the
  corners, the closed step follows the cells' staircase. Now the closed step reads the corners' own beds through a cubic
  B-spline (four bilinear taps, only within 0.25 m of the step's depth): C2, so no corner anywhere, and within a few cm
  of the corners' beds (the trough by the Dalaro stays closed). Probe r3/probe/s5/p-shallows-mid-b.png: a smooth curving
  shore. coast2-p was shot with this code; coast-p before it (its shallows views re-shot next).
- 13:44 re-shoot of the shallows views (d: shallows-low/mid/high, flats-mid, jetty-high, skerry-tide; p: shallows-mid,
  jetty-low, strand-high; the earlier takes kept in r3/after/pre-bspline/), then shallowtele (mine, then f119d13), perf5.
- 13:44-13:52 shallows re-shot with the B-spline step (r3/cmp/c13.png: smooth curving shores in p-/d-shallows-mid).
- 13:52-14:03 shallowtele, mine (:5403): PASS tele 42.8, pool 13.8, cradle 13.2, tones 54.6, halo 0.99 (r3/st/mine.out).
  Pre-round baseline f119d13 (git archive on :5404, r3/base/): PASS tele 36.5, pool 12.3, cradle 13.1, tones 52.2,
  halo 0.98 (r3/st/base.out). Mine is at or above the baseline on every margin. :5404 stopped.
- 14:03 perf5 started (QS 1,0; 5 cycles; load average ~5 from other workflows' browsers).
- 14:05 gen5 heights: the crags kept off rock with floor due north of it within ten cells (the camera's own side), so the
  hill the low camp camera stands in keeps its old height (node r3/tools/hgt.mjs: x 22-25, z 156-158 back to 9.9-10.9 m;
  the west rim's x 3 still 6.6-10.4 m along z). check-act5 300 @ 5 clean (r3/check-act5-300b.txt; same oddities as the
  gate). perf5 was already running: its q0 half loads this code (heights only: same meshes and triangle counts).
- 14:03-14:26 perf5 (r3/perf/perf5.out; QS 1,0, 5 cycles) under load 7.5-8.8 on 4 cores (another workflow's skillsfx,
  ending4 and progpanel scenarios ran a browser beside it the whole time): FAIL. q1: coast 1.401, coastLow 1.393,
  farlight 1.073 of the Field; q0: coast 1.482, coastLow 1.019, farlight 1.065, every q0 floor true. The per-cycle
  ratios swing 0.74-1.69 for one spot (the Field itself 825-1468 ms): the load, not the frame, decides them.
- 14:30-14:39 A/B at perf5's coast spot (r3/tools/ab6.mjs: min of 5 interleaved rounds of 3 draws, 915x412 at 1.5, q1,
  high water), mine (:5403) against the pre-round f119d13 (:5404, restarted), back to back under the same load:
  whole frame 1813 ms vs 1776 ms (+2%); without the sea 1391 vs 1452; without the ground 1352 vs 1009; without the
  instanced props 1320 vs 1131; without the plain meshes 1612 vs 1393. The round adds about 2% to that frame; no single
  part grew past the noise. (Also: the shore lace's Voronoi read now skipped off the shore.)
- 14:40 perf5 again, q1 only, 9 cycles, K 5 (the verdict needs q1 only), mine then f119d13 back to back (r3/perf2/).
- 14:40-14:58 perf5 q1, 9 cycles, K 5 (r3/perf2/mine.out), same load (7.6-8.2): PASS. coast 1.123, coastLow 0.918,
  farlight 1.041 of the Field (ratios per cycle: coast 0.91-1.30, coastLow 0.87-1.08, farlight 0.89-1.08). The f119d13
  run queued after it was stopped to free the one browser (the A/B above already compares the two frames).
- 14:59 re-shoot with the crags kept off the camera's side: d camp-lit-cine, rite-story, overlook-cine, cave2-low,
  stone-carriers, cave1-high; fz-camp-cine, sl-camp-cine, fz-cave1, fz-overlook-cine (the takes before the change kept in
  r3/after/pre-gate/).
