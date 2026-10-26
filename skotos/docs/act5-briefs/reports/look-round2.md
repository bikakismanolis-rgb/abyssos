# Act V look, fixer round 2 (progress notes first; per-issue lines, perf and shots at the end)

Scratch: scratchpad/act5/look/r2/ (tools/, probe/, after/). Before = the critic's crit2/ set (same configs, same seed 3).
Private no-HMR server :5395 (r2/vite5395.log).

## Progress notes
- 07:35 started; no prior round-2 work found (no round2.md, no r2/). Tree: b57ca18 + round-1's uncommitted edits in my files
  (build.js, build5.js, gen5.js, sea.js) and stage C's in theirs.
- 07:40 private server :5395 up (r2/vite5395.log). Tools: r2/tools/shot.mjs (the critic's, at :5395; configs c-*.json write
  to r2/after/), sub.py (a probe config from a subset of views: r2/probe/<name>/), ev.mjs (evaluate code in a booted page).
- 08:00-08:40 build.js ground, first pass (probes r2/probe/g1-g3): sastrugi broken by noise (two beating waves, phase warped
  by the drift read, amplitude 0.2 -> 0.075, masked to ~20% patches, faded by fwidth); rake gain 1.7 -> 1.05, faded at
  grazing looks and past 22-48 m: the zebra is gone (g1/p-start vs crit2/coast/p-start). Flats' marks read a tidal-only
  bed (aBedW, carried 3 corners up the land): world-space ripples faded by fwidth, broad soft pools: hatching gone. Bay
  sawtooth: the shore layer's field weighed smoothly over 8x8 cells FROM THE JITTERED CORNER (shoreJit moved corners across
  the edge carrying the other side's value: that was the teeth), unclamped, plus a slow ALU wobble; wet sand gated by the
  layer (g3/p-bay-noprops: a smooth ragged edge). Cradle ring in Act V: thin soft warm-white rim (no fill in screen
  blending), the fill a child in dst x src blending (bright snow only). Trodden path read twice (two scales/angles) mixed
  every few metres; rock tops show stone; waypoint snow a soft cap.
