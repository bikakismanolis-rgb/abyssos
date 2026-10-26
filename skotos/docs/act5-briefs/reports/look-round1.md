# Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)

Scratch: scratchpad/act5/look/r1/ (before/, after/, tools/). Files I may edit: sea.js, build5.js, build.js (Act V parts),
gen5.js (dressing only, check-act5 after), atmos.js, textures.js, fx.js (existing ambients/emitters), pack-rime + rime*.

## Progress notes
- start: no prior round-1 work found; my files clean in git status (stage C has its own files modified).
- 07:05 private no-HMR server on :5381 (vite5381.log); tools/shot.mjs = the critic's crit.mjs pointed at :5381 (same views, so
  the critic's crit1/ shots are the "before" set; mine go to r1/).
- 07:20-08:40 first pass written: atmos (frozen/seaLit nights, aurCol), sea.js (aurora folds/rays, black curtains,
  shoreN contour noise, water/ice values, brash plates, glints, Freeze crests, new-ice look, beam as analytic soft volume,
  dome curtains/thread/corona/haze/islands, window rim+lantern, corner rounding for all edges, no lip skirts),
  build.js (ground aurora 0.2 + black bands, drift/sastrugi, flats ripples/pools, cliff strata, AO, occluder: camera
  direction + screen circle + low-camera off + shoulder height, Village low-camera, Cradle ring on snow, soft rock snow,
  waypoint snow), gen5 (cliff shape, low islets, rock meets thin ice at 0, berg rise lowered, icicles from the lip, drowned
  glow under its window, dressing passes from own RNG: coast 166->505 props, farlight 152->456), build5 (fires with
  flames/embers/smoke/light, hearth/cairns from rock scans, sea-light caps, icy material pale, slab bergs, ridges from
  slabs, smooth Fall, runes, plank roofs + icicles, sea stacks stacked, weathered towers, Farthest Light base/cap/door,
  dressing props), fx (wisp sea smoke, emitAt), textures (runeLines). check-act5 60 seeds clean after each gen5 change.
- 07:31 probe p1 (desktop): water now teal and readable, ice steel-grey, frozen camp darker/violet with black bands.
- 07:47 probe p2/p3 (desktop): arrival curtains folded and rayed, Freeze crests white and caught, the beam no longer paints
  (soft analytic volume, faded near the eye), payoff without the khaki wash, Farthest Light dissolves only in a round
  window. Fixed from the probes: ice cracks were squiggles (now sparse straight Voronoi walls), brash a mosaic (now
  sparse plates at the lip), icy material's layer read as pool caustics (dropped; calving streaks instead), tents white
  boards (hide colour), hole floes white boards (ragged code floes), the Grey Light's steps (edge corners relaxed along
  the edge, 4 rounds), the narrow rock rib in the arrival (cliff height capped by thickness: 1.0 + 1.3 x cells).
- 08:06 a gen5 bed warp of the Landing water (the critic's suggestion) changed 29/40 seed layouts (the boats' beach test
  reads the beds): reverted; the Landing water's straight seam is handled visually instead (the bed's step up is an
  edge class for the corner relaxation, straight runs wander +-0.44 m). gen5 layouts now identical to HEAD over 40 seeds
  (tools/cmpgen.mjs); only the props differ (dressing, own RNG).
- 08:13 after-capture chain started (r1/tools/chain.sh: coast-p, coast2-p, far-d, coast2e-d, arr-p, far-p = the critic's
  configs, outputs in r1/after/<same sub-dirs and names as crit1/>).
- 08:20 probe p4/p5 (phone/desktop): the edge relaxation pinched narrow strips (the Fall's thick path) into teeth: back to
  chamfered corners (one odd cell of four) and a noise along the normal of straight runs; the ice band's cut followed the
  triangles' diagonals (zigzag): a finer noise in the cut. The Grey Light's "notches" were a see-through strip of water
  over the drop's dark face, framed by the shore foam: the water is now closed right up to a steep shore (slope test) and
  that foam is patchy. Chain restarted at 08:24 with that code.
- 08:35 first after shots (coast phone): water teal over a readable bed, the ring soft, cliffs snowed, ice steel-grey.
  Found: the waypoint's patchy snow came out in squares (a block hash read raw): now a smooth value noise. Long straight
  shore runs (the jetty's root, the Landing bed step) still ruled: a quicker noise added to the slow one in shoreJit.
  Both edits reach the configs after coast-p (each config loads the page anew).
- 08:50 coast-p after shots reviewed (start, overlook, overlook-cine, camp-unlit, huts2, jetty-low/high, shallows x3,
  graveyard1, whale, fall, cave1-high, sealight-grey, spinewreck, bay, den). Found and fixed (reach coast2-p onward):
  the wind-turned drift read (ice and snow) turned world coordinates about the origin by an angle that varies over the
  field, so far from the origin the read was squeezed into hairlines (graveyard1/whale/huts2: rain-like streaks, combs on
  the snow's edge): now one direction with its streak lines bent in slow meanders (bounded shear), the sastrugi's
  across-vector from the same bend. Crack hairlines kinked into worms by the fine read: bent by the slow read only.
  The Grey Light islet still stepped: the corner chamfer was 0.22 m per axis (a staircase kept 56% of its zigzag): now
  0.35 (+-0.1 noise; clamp 0.4). The ice-window pit lit up as a glass case: its walls pale only in the top 0.5 m, dark
  below, dark floor, smaller inner glow.
- 08:45 coast-p lit leg and coast2-p (Freeze, frozen) reviewed. Fixed: (a) the occluder rewrite had gone into the shared
  OCC used by every act: now gated by WIND.uOcc5 (1 while an Act V level's ground draws, buildLevel's per-level globals);
  other acts keep the HEAD occluder bit for bit (the old fixed-south line and heights when uOcc5 is 0); the Village
  low-camera change (town houses, not Act V) reverted to HEAD. Act V's form also fades what stands within 5-9 m of a
  low scene camera (the rite cine's foreground rockFace filled a third of the frame). (b) The sea past the map edge met
  the map's water with 20 m segments: the swell opened a crack along the seam (dark dashes across the Grey Light cine):
  its seam row is now fanned to a vertex per metre. (c) Remaining worm-like white squiggles: the crack hairlines' sine
  kink (now straight, bent once at the origin) and the new ice's frost-feather isoline (now a soft fleck).
  (d) Dressing kept off the hearth's south side (the camp cines' sightline; no change for seed 3, a guard for others).
- 08:53 coast2-p (seaLit) and the first far-d shots reviewed. Fixed (reach far-p and the fix-p re-shoot): seaLit too
  close to an ordinary night (snow 117,137,143 vs 113,132,140): coastAurora/farlightAurora hemisphere greener and
  brighter (0x5a9682 at 1.05, moon 0xc4ecd6 at 1.1, green fog); the near-camera fade tried for the rite cine reverted
  (it would dissolve the foreground rocks that frame the bay cines; the rite framing goes to story.js as a request);
  Act V flames in fire colours (an orange skirt, a yellow core: the white cone read as a bulb in the sea-light cage);
  tent sides sewn from six hides of different tones with lacing (one plain sheet read as a board); icy blocks less snowed
  and bluer (the ridges read as sugar cubes), berg face cracks fewer; floes 14-sided and broken at two scales (paper
  hexagons); Breathing-hole floes adrift over the hole, not a ring at even steps (gen5 dressing; check-act5 300 seeds:
  no hard failures, oddities as before); the drowned lantern kept under its pane (refraction factor 0.4: at full depth it
  slid out from under the pane) and its wide wash tightened (a brown stain metres off). Snow sastrugi relief 0.14 -> 0.2,
  in wider patches.
- 09:00 far-d reviewed (start, camp, ship, anchor, poles, holes, drowned, bergs, maw, edge, core, farlight, fire0, cines).
  Fixed: (a) the occluder faded a berg's face just behind her (vOcc from the face's few vertices, -0.8 m margin): Act V
  now also requires the fragment to lie nearer the camera than she does (view depth against hers); and the low-camera
  cut-off is gone (it hid her wholly behind a berg in the hole cine): the window and the depth test cover the critic's
  cases. (b) The ice's fray toward open water could hold off and leave the cells' square edge (Icemaw hole): it now always
  bites (bias up, noise down) and the pale rim follows the cut just inside it. (c) Dark doorway-like blocks over the
  horizon in every cine: anything far off in the fog (fog colour = the horizon's) stood out against the brighter haze
  band I had added: the band is gone, the dim islands stay. Black curtains combed into rays, sparing the horizon.
- 09:08 far-d complete (34 shots incl. the seaLit leg and Whitecliff). The farlight seaLit greener-hemisphere change was
  reverted before any capture (its ice already reads strongly teal; the coast keeps it: its snow needed it). The new
  ice's frost blooms made sparser (they spotted the sealed hole like a hide). The closed-water edge line broken into
  lengths. coast2e-d (desktop duplicates of coast2-p's phone views) skipped for time; final chain: fix-p (re-shoots of
  the coast views changed since 08:24, frozen and seaLit included, plus the story's own rite cine), arr-p (plus the
  story's payoff framing), far-p (phone, plus maw, berg2, drowned1, the camp and hole cines).
- 10:40 (Oct 16, after a container restart; tree = cfae542, clean): server :5381 restarted; the chain resumed with the
  configs it had not finished: fix-p, arr-p, far-p; then perf5, shallowtele, check-act5, build.
- 10:45 fix-p re-shot with the committed code (coast views, frozen, seaLit, the rite cine): reviewed. Still weak at the
  play camera: the snow a flat over-bright sheet, the hero's pool and the lit hearth burnt to white discs (heroI 22-26 on
  snow that gives back four times what ash does), cliffs grassy-green sheets (the seaCliff layer, seaside_rock flattened,
  is a featureless grit; the ground's aurora ribbons, worked out over x/z, ran down every steep face as green stripes),
  the shore an asphalt grit, the dome's rays an even barcode over a black band. Chain stopped after fix-p for a second pass.
- 10:50 second pass. Rime layers re-packed from new Poly Haven sources (CC0, fetched to /tmp/claude-0/ph with meta.json;
  credits updated in src/assets/rime/CREDITS.txt, CREDITS.txt and src/ui/credits.js): seaCliff <- dark_rock_02 (Amal
  Kumar: layered ledges and cracks), shore <- damp_beach_sand_02 (Dimitrios Savva: wet sand, weed patches), snowTrod <-
  snow_01 (Rob Tuytel: boot prints and scuffs; at 2.6 m). build.js: the snow's relief raked by a low light from the moon's
  side (the scene's moon stands at 66 degrees: its own shading lost the crust and the drifts), the ground aurora only on
  what faces the sky and given back by the ground's whiteness; atmos: Act V hero light 15-20 and warmer (0xffcf9c,
  frozen 0xffc48a); build5: the hearth's light 15 in a fire orange, its halo 4.2 m at 0.45; sea.js: the dome's rays a
  fine comb over a coarse one with the combing wandering along the curtain, a glow under the hem down to the horizon;
  the water's waterline drawn in from the cells' bands by a slow noise (never past the closed step), grey slush plates
  off steep shores. gen5 dressing: stones and stalks on the land 9% -> 13% of cells, wet stones on the flats, rubble and
  wisps of drift on the farlight's ice (seed 3: coast 582 -> 706 props, farlight 571 -> 854; layouts identical to
  cfae542 over 40 seeds, check-act5 40 seeds clean).
- 11:10 probe p6 (phone, coast): snow now reads (wind ripples, crust, the trodden path with prints), the hero's pool and
  the hearth warm, the cliffs real layered rock, the rays less even with a green glow under them. Found: the slush plates
  strewed the wading flats like confetti and lay white as tiles (restricted to steep shores, greyed); the wet sand read
  green-dark camouflage (re-graded warmer and lighter; the aurora on the ground now scaled by its albedo).
  Open: dark flat-topped blocks on the horizon in the low cines (seen in fz/payoff), to identify after perf.
- 11:20 perf probes (perf5 at q1 only) are unreliable now: two other workflows run browsers on this machine (a balance
  simulation, tools/balance-act.mjs, and stage C's probe), load 9.6 on 4 cores; the Field itself swung 809 -> 1263 ms between
  cycles. Partial: coast 1.06 / 0.93, coastLow 2.5 (an outlier) / 1.09, farlight 1.29 / 0.72 of the Field per cycle. Cost
  cuts anyway: the ice's crack Voronoi, the leads' brash and the new slush plates now read one baked Voronoi texture
  (sea.js vorTex, 256 px, 16 cells) instead of a 3 x 3 search of hashes per pixel; the waterline's wander rides the water's
  own ripple reads (no new fetch). Hull footprints on the flats drawn as shore (each hull stood on a staircase of snow:
  the perf spot's own frame). The rock scans' snow only on what truly faces the sky (0.6-0.97).
- 11:30 the horizon's "dark blocks" (fz cine, payoff) identified by raycast: nothing in the scene, the dome's own dim
  islands (steep-sided, smooth-topped, darker than the fog). Now long gentle rises with ragged crests in the fog's own
  colour, cutting the curtains' glow, which now reaches the horizon. Aurora hem folds rounded (a soft max: max() put a
  tent's pleat in every fold).
- 11:55 probe p7 (coast + farlight, phone) reviewed. The black thread now reads (a dark ribbon across the curtains,
  arrival-thread); the payoff at the story's framing is the act's best frame (lantern lit under the curtains). Fixed from
  it: under the horizontal the dome read its elevation clamped at 0, so the hem's glow and the islands' fine crests drew
  vertical stripes below the horizon (now D.y itself: the fog's colour there); the islands a little taller. The ice
  slabs of the ridges read as sugar cubes (sheer faces now a deeper blue than the tops: icy material); the farlight camp's
  brazier was the Field's code fallback (a glowing ball on a tripod: the cinder pack is away): now an iron basket on
  splayed legs, stones at its feet, a real fire (fireCage + fireLife).
- 12:00 final chain started (coast-p, coast2-p, arr-p, far-p, far-d, coast2e-d), then perf5 (q1 and q0), shallowtele.
- 12:00-12:15 (clock times from here on are the machine's) the chain's first coast shots showed the Landing's shore still
  ruled along the cells (jetty-high: a straight pale strip down the snow's edge; a sledge afloat as a white box). Causes
  and fixes: (1) the water's corner bed averaged the land's BED_DRY in, so the surface sank under the ground most of a
  cell out from the land and the water's edge ran along the next row of corners, a pale strip between: at a corner of
  level land the water now takes a hand over its wettest cell's bed (sea.js shoreBed), so it meets the land on the
  jittered line itself; (2) shoreJit's straight runs of the tide's own shores (flats against land, low flats against high)
  wander up to 0.8 m (0.55 at the low/high step), the corners a cell either side moving half as far (no folds over 3
  seeds, min gap 0.21 m); (3) the boats' sledges only on dry ground (gen5 dressing; layouts identical over 40 seeds), the
  sledge's hide only dusted. Chain restarted after probes p8/p9.
- (12:15-14:01, notes kept in r1/table.md only) the final chain ran (coast-p, coast2-p, arr-p, far-p, far-d, coast2e-d:
  ALLDONE 13:52), then a re-shoot for the dome under the horizon and the floes (cine-p done; cine2-p cut off by a second
  container restart at 14:01; farfix-d/p not run). Code state: my files as committed in 5673b66 (13:27).
- 21:35 (Oct 16, after the second restart; tree = c388c3c, clean; c388c3c touched none of my files): server :5381
  restarted; resuming with cine2-p, farfix-d, farfix-p, then the review, perf5, shallowtele, check-act5, build.
- 21:40-22:00 review of the 12:05-14:00 shots, then a third pass (probe r1/p10 phone, r1/p11 desktop):
  (a) the Landing water's east edge ran ruler-straight down the arrival cine (gen5's bed rule switched at x = 60): the
  switch now wanders +-6 cells by fbm, a cell changing sides only where neither bed lies in the range the packs, the wrack
  and the beach read (cmpgen2: spots, packs, tries, start, exits, refuges and cells identical to c388c3c over 40 seeds;
  check-act5 300 seeds: no hard failures, the same oddities as before). (b) floes: pancake ice (grey plate, white heaped
  rim, round and lumpy) in place of pale 14-gons that read as paper stars; (c) no snow drifts on the thin ice (white paper
  ovals on the dark); the drift mounds and the poles' snow mounds sunk to the snow (a shallow cap's rim stands at
  r cos(pi frac): they hovered a third of a metre up); (d) tents: herders' cones of hides on crossed poles (the ridge tents
  read as boards from above); (e) the black aurora keeps 2.5% of the green, not 8% (the frozen coast's sky still read as a
  dim green aurora); (f) the water's aurora streaks: the anisotropic streak fetch on the phones too (the ripple's own reads
  laid the mirror in mould-like blots, a sine line pattern read as corrugated sheet), a finer fold in the sheet;
  (g) the ground's aurora read at twice the scale (ribbons in the play frame) and its cast stronger for the true aurora
  (uAur^2 x 0.034); (h) the hearth: no ring on the hook (ring + thin legs drew a black ankh), stouter legs, a cauldron with
  a lip; (i) dressing: coast 7.4 -> 9.3 props per 100 m2 (stones, stalks, logs, drifts on the land; wet stones on the
  flats), farlight 5.0 -> 6.0 (rubble on both ices, drifts on the thick).
- 22:05 probes p10-p13 reviewed (arrival seam wanders; pancakes read as floes; tents as tents; the hearth a cauldron on a
  tripod; the phone mirror in streaks; the seaLit snow takes a green cast; the frozen sky without its green): also the ice's
  bubbles cut to the noise's peaks and dimmer (they lay as even pale lozenges), the thin ice's rubble smaller and fewer
  (pale blocks read as litter), floes never through one another (gen5 dressing), level and a little higher (tilted, an
  Icemaw hole's water closed over one side and left a white crescent), crags along the cliffs' crests (gen5 heights: the
  Graveyard point's top ran in one smooth roll, a tarp; the camera's line-of-sight cap still applies after them).
  cmpgen2 20-40 seeds identical layouts after each gen5 edit. Final chain (3) started: arr-p coast-p coast2-p far-p far-d
  coast2e-d (all of r1/after/ re-shot), then perf5, shallowtele, check-act5, build.
- 22:00 the chain's first coast shots showed the snow drift mounds as faceted pale ovals even sunk to the snow (a separate
  mesh never takes the ground's raked light): chain stopped, drift props dropped from both zones (the ground's shader lays
  the drifts; their slots went to stalks, logs and the thick ice's rubble; MAT.snow5 gone with them). Seed 3 dressing now
  coast 9.0 / farlight 4.3 props per 100 m2; layouts identical over 40 seeds; check-act5 300 seeds clean (same oddities);
  build clean. A raycast probe (r1/p14) of the Dalaro's pale dithered rectangle: not reproduced with the hero inside the
  hull's window (it is the occluder's dither on the hull's low side when she stands just west of it). Chain (4) restarted
  22:10: coast-p coast2-p far-p far-d coast2e-d, then arr-p again, then perf5.
- 23:23 final chain (4) done (coast-p, coast2-p, far-p, far-d, coast2e-d; arr-p again at 23:26), every shot reviewed;
  perf5 started 23:26 (load 5.9 on 4 cores: the integrator's balance-act runs a browser beside it), then shallowtele.
- 23:34-00:34 (recovered from r1/chain.log and the perf dirs after a third restart): perfC (23:26, q1+q0) passed (coast
  0.97, coastLow 1.12, farlight 0.83); shallowtele failed (pool 11.8 < its floor: the Act V snow ring was too faint over
  the dark wading water) -> lightRing on snow laid on in screen blending (gives what the ground lacks), shallowtele out5
  pass (pool 30.9, cradle 22.8; q0 too). perfD (23:56, that code, load 8-9) coastLow 1.16 fail; perfE (00:09, QS=1, 9
  cycles) coastLow 1.163 fail. A/B profiling (r1/tools/ab*.mjs) -> the ground's shore marks and snow reads skipped where
  their weight is 0, the flats' wet stones 9% -> 4% of cells (gen5 dressing). perfF started 00:34, cut off by the restart.
- 00:37 (Oct 17, tree = 63f750e, clean; it holds all the above): server :5381 restarted; to do: check-act5 + layouts,
  build, shallowtele, a final re-shoot of the whole after set with this code, review, perf5 last.
- 00:40 check-act5 300 seeds: no hard failures, the same oddities (r1/check5-final4.log); layouts identical to c388c3c over
  40 seeds (cmpgen2); vite build clean (r1/build2.log). perf5 started 00:40, stopped 00:45: another workflow's scenarios
  put the load at 8.7 (cycle 0 coastLow 1.51 of the Field): to be re-run last.
- 00:50-02:10 a fourth pass from a review of the 22:10-23:26 shots (probes r1/p15, p16, p17):
  (a) the black band under every low cine's horizon (payoff, Freeze, arrival): past the far plane (160 m) the dome drew
  its horizon colour, the fog's, through the tone mapping, where three lays its fog on after it: the dome stood a shade
  darker than the fogged sea in front of it (2,8,5 against 10,22,18). The dome now adds the fog's colour after the tone
  mapping, under the horizontal draws the far sea as its quads would (the sky's sheen, fogged by the ray's own distance),
  and lets the curtains' glow hang in the haze down to the far plane: one gradient from the horizon to the lit ice.
  (b) the water's ripple glints gathered in patches (strewn evenly they lay as confetti over every water frame).
  (c) the hero's ring over a Breathing-hole: drape() laid it down into the pit, and the water cut it along a straight
  row of its grid: over L.sea cells it now lies at the ice's height.
  (d) found while probing: a rebuilt Farthest Light could draw no shaft at all (coast -> farlight -> farlight rebuilt with
  new flags: the lantern room floating over its base, in the payoff frame). Not the occluder (off: still gone), not the
  program (identical source and uniforms in a run that draws it; a fresh material on the same program: still gone; a
  plain clone of the scan's material: drawn). Cause: world.js disposeZone disposes every mesh's geometry not marked
  shared, the rime scans' too, and the next build draws the same geometry object again; kept (build5 shared() on every
  pack geometry Act V puts in a mesh or an instanced type: rimeTower, nameStone, boat, cask, rime: and icy:/cliff5: scan
  parts), the shaft draws in the same sequence. (Whether three's buffer/VAO state or SwiftShader drops the re-uploaded
  geometry I could not tell; the other acts' pack props go the same way: a request below.)
- 02:15 final re-shoot chain (5) started with this code: arr-p, coast-p, fix2-p (the six coast views only fix-p has),
  coast2-p, far-p, far-d, coast2e-d; the previous after set kept in r1/after-prev/.
- 02:35 (after a fourth restart, mid coast-p; tree = b57ca18, which holds the fourth pass): server :5381 restarted; chain
  (5) resumed from coast-p (arr-p done at 02:29); then the review, check-act5, build, shallowtele, perf5 last.
- 02:40 check-act5 300 seeds (tree b57ca18): no hard failures, the same oddities (r1/check5-final5.log). Reviewing the
  previous e-fz-bay2: Skerry Bay's thin ice against its sand still ruled across the arena as a dark plank with humps
  (the corners where thin ice meets the flats averaged the pit's bed -0.6 with the sand's 0.3-0.6: the water stood 0.1 m
  over the floor there, the ice frayed back off it as off open water). Fix (sea.js iceFlatBed/flatCell, build.js
  groundBeds): such corners take the flats' bed (water and ground), the ice counts a flat as land for its edge (the
  sand meets it at its own level, drift-dusted), and that line wanders like the tide's shores (shoreJit runs, 0.8 m).
  Also the tide bell's gallows no longer dithers (planks5n/iron5n: worldMat noOcc). Chain script stopped after coast-p
  for probe r1/p18.
- 02:55-03:15 probes r1/p18 (desktop: the bay's lip at tide, frozen and flooded, the bell, the Graveyard) and r1/p19,
  p20, p21 (phone). The plank is gone: the sand meets the ice on a wandering line (p18/e-fz-bay2 against
  after-prev/../e-fz-bay2), the flooded bay laps over the ice's edge, the bell stays whole. Also: (a) shoreJit's straight
  runs along a pit's own edge (islets, shelves) and the rock's foot now wander as one smooth line within the 0.4 m a lone
  corner may take (each corner alone kept them ruled); folds none over 3 coast and 3 farlight seeds, min gap 0.21 m
  (r1/tools/jitstat2.mjs, jitstat3.mjs). (b) gen5 heights: where the camera's line-of-sight cap holds a rock rib low,
  the cap is broken into lumps (0.45-1x; the jetty's rib ran 15 m at 1.1 m as one snowed roof, a slab) - heights only:
  layouts identical to c388c3c over 40 seeds (cmpgen2), check-act5 300 seeds clean (r1/check5-final6.log). (c) the
  ground's Act V cliff: a gentle facet high on a cliff, and a low rib's faces, read as stone with snow settling on what
  leans back (the floor's snow sheet whole on them). The pale blades in the camp-lit cine were not cliff facets: probe
  p20/p21 (sea/ice hidden, geometry bounds sane) shows they are the 2-cell thin-ice strip between the Fall's thick path
  and the west cliff foot (x 9-10, z 89-128 on seed 3), drift-dusted pale and seen end-on: a layout feature, left.
- 03:08 final chain (6) started with this code, stopped at once: the integrator's perf5 at b57ca18 (02:36-02:47,
  c/int/sc/perf5.out, under load) had coastLow 1.171 at q1 and 1.184 at q0 (fail). Profiled first (r1/tools/ab4.mjs:
  each part of the scene hidden in turn; ab5.mjs: the ground and the sea drawn plain): at the Shallows' low-water spot
  the ground's own shading cost the same as the Field's (~270 ms of a 728 ms SwiftShader frame against 260 of 609); the
  difference was the sea, 125 ms, shading quads whose water lay dry under the flats' ground and never showed. Fixes (no
  look change): (a) sea.js buildSea sorts each chunk's quads by the lowest bed of their corners and draws only the prefix
  the tide can wet (bed < level + 0.08; held, frozen and the bay's quads always; everything while a freeze slot is on),
  a binary search per chunk per frame in onBeforeRender; (b) build.js Act V ground: the path layer's colour reads only
  where vLay.y > 0.01 and each layer's normal read only where its weight is not 0. After: coastLow 609 ms against the
  Field's 626 in the same session (ab4), the sea's cost there ~0. Also (c) a hull's footprint on the flats keeps the
  flats' bed for the ground (L.vbed): it lay round the Dalaro as a pale dry rectangle in perf5's own frame
  (r1/p22/p-shallows-low against c/int/sc/perf5/perf5-coastLow-q1.png). Probe r1/p22: the water at low, mid and high tide
  and the arrival cine unchanged by the culling.
- 03:39 final chain (7) started with this code (r1/tools/finale2.sh): arr-p, coast-p, fix2-p, coast2-p, far-p, far-d,
  coast2e-d; then shallowtele (r1/shallowtele2), perf5 (r1/perfH). Reached coast-p onward (booted 03:43): the lit
  towers' light path on the water in fine sparks gathered in patches (a field of white confetti round her under the
  Grey Light), the hearth's tripod never dithered (iron5n). Reached fix2-p onward (03:54): the runs held to 0.4 m (pit
  edges, rock feet) wander on the quicker read (the slow one, held at its cap, only shifted the Grey Light islet's south
  edge, still ruled); folds none, min gap 0.21 m.
- 04:48 final chain (7) done (arr-p, coast-p, fix2-p, coast2-p, far-p, far-d, coast2e-d: every view shot, none failed),
  reviewed: the bay's lip wanders with no plank (coast2/e-fz-bay2), the bell and the hearth stay whole, the light path is
  fine sparks, no new artefact. shallowtele pass (pool 30.7, cradle 23.8, r1/shallowtele2/out.txt). perf5 pass at 04:49-04:58
  under load 8.3 from another workflow (r1/perfH/perf5.txt; PERF below). vite build clean (r1/build8.log). Private server
  :5381 stopped; no browser of mine left running.

## Per issue, one line each (B = the critic's crit1/<dir>/<name>, A = r1/after/<dir>/<name>, both under scratchpad/act5/look/)

1. major, edges on the 1 m grid: MOSTLY FIXED. sea.js shoreJit moves every corner between differently drawn cells (floor, pit, tidal high/low, rock) off the grid for ground, water and ice alike (one-odd-cell corners chamfered, straight runs wander along their normal, the tide's own shores up to 0.8 m), the water meets level land on that line (shoreBed), waterline drawn in by the ripple's slow read, no lip skirts, hull footprints drawn as shore; the Landing water's east edge (gen5 switched bed rules on x = 60) now wanders +-6 cells by fbm, a cell changing sides only where neither bed is in the range the packs/wrack/beach read (layouts identical to c388c3c over 40 seeds). Final session: Skerry Bay's thin ice against its sand (the dark ruled plank with humps across the arena, e-fz-bay2) gone: those corners take the flats' bed for the water and the ground (sea.js iceFlatBed), the ice counts a flat as land (the sand meets it at its own level) and that line wanders up to 0.8 m; a pit's own straight edge (islets, shelves) and the rock's foot wander as one smooth line within 0.4 m (no folds, min gap 0.21 m); a hull's footprint keeps the flats' bed (no pale rectangle round the Dalaro). Still straight-ish: a few long strand shores, and seen end-on in the camp cine the 2-cell thin-ice strip beside the Fall's thick path (layout). B/A: arr/p-arrival-cine, coast/p-jetty-high, coast/p-huts2, coast/p-sealight-grey, coast/p-shallows-low, coast2/e-fz-bay2 (and r1/p18/e-fz-bay2, e-bay2-tide-close).
2. major, near-black water and ice: FIXED. Night-teal water, see-through grey-green wading water, steel blue-grey thin ice, a sky-sheen floor; open water darkest and read by its motion. Near-black share in METRICS below. B/A: coast/p-graveyard1, coast2/e-fz-graveyard, coast2/e-fz-iceroad, far/d-f-hole1, far/d-f-drowned1.
3. major, aurora barely in the game: FIXED. Water and ice mirror its folds and rays, streaked toward the eye on every quality (the phone path's ripple-only read laid it in mould-like blots); a finer fold in the sheet so the play camera's 25 m holds curtains, not one band; the ground's ribbons read at twice the scale and only on what faces the sky; under the black aurora its dark bands cross land, water and ice. B/A: coast/p-shallows-high, coast/p-sealight-grey, coast2/p-sl-bay, coast2/p-sl-shallows, far/p-fl-camp.
4. major, frozen and seaLit nights alike: FIXED. coastFrozen a violet-black night (hemi 0.5, weak cold moon, fog toward black, black bands on the ground, the hero's light and the hearth the only warmth); coastAurora a green night (green hemisphere and moon, the ground's aurora cast uAur^2 x 0.034 for the true aurora). Snow away from the fire, phone: frozen ~85,85,96 vs seaLit ~92-108,120-125,118-124. B/A: coast2/p-fz-camp, coast2/p-sl-camp, coast2/p-fz-bay, coast2/p-sl-bay.
5. major, the dome's curtains a theatre band: FIXED. Hems rise and fall with azimuth (soft-maxed folds), sheets with knots and gaps, a fine comb of rays over a coarse one wandering along the curtain, white-green hem to violet tops, corona overhead, aurCol from the atmosphere (the true aurora greener-white), a glow under the hem to the horizon with far headlands cut out of it in the fog's colour. B/A: coast/p-overlook-cine, far/d-fl-arena-low, far/d-town-north-low, coast2/p-sl-bay-cine.
6. major, arrival cine: FIXED (look; the framing is stage C's). The black thread is a dark ribbon crossing the hems (its own band mask, not a global dim), teal water over a readable bed, layered rock, the Landing water's edge no longer ruled. B/A: arr/p-arrival-cine, arr/p-arrival-thread.
7. major, the Freeze cine: FIXED. Short steep crests stand up ahead of the front and are caught as white ridges, frozen spray held in the air, a glittering front, glassy new ice behind; the Skerry Light no longer dissolves. B/A: coast2/p-frz-bay-cine, coast2/e-frz-bay-cine, coast2/e-frz-shallows.
8. major, cine landmarks dissolve in the dither: FIXED for Act V in build.js (gated by WIND.uOcc5, other acts keep the old occluder bit for bit): the line toward the real camera, a round window about her, only what lies nearer the camera than she does, nothing below her shoulders. Requests kept (not needed for the look): story.js occ on Act V cines; boot.js pass occ to village.update. B/A: coast2/p-frz-bay-cine, far/d-f-core, far/d-f-farlight.
9. major, payoff cine framing and look: FIXED (framing by stage C's story.js: FL.z+2, zoom 2.2, pitch 0.1, lookY 10, occ off; look: lantern glare and streak, soft dusty beam, no khaki wash, true aurora behind and in the ice). A: arr/p-payoff-story (the critic's older framing arr/p-payoff-cine still cuts the lantern, as expected).
10. major, dressing density: PARTLY FIXED. gen5 dress5Coast/dress5Far from their own RNG (layouts identical): seed 3 coast 1.7 -> 9.2 props per 100 m2 of floor, farlight 0.9 -> 4.6 (the Field 21.8): stones, stalks, logs, drifts, hut gear, sledges, wet stones, rubble, tents, furs, rope line, cairn-poles, pancake floes, cave overhangs. All instanced. Not fixed: the farlight's open thin-ice fields stay sparse by design (strewn blocks read as litter on dark ice). B/A: coast/p-camp-unlit, far/d-f-camp, far/d-f-pole6.
11. major, snow flat: FIXED. Relief raked by a low light from the moon's side, wind drifts and sastrugi, trodden paths re-packed with boot prints (snow_01), blue AO at every foot, glitter, stones and stalks through it; drift mounds now sit on the snow (a shallow cap hovered 0.35 m up as a paper oval). Detail in METRICS. B/A: coast/p-start, coast/p-camp-unlit, coast/p-den, far/d-f-start.
12. major, tidal flats asphalt: FIXED. Shore re-packed from damp_beach_sand_02 at 5 m, ripple bands along the bed contours, standing pools, wet/dry from the tide, wet stones. B/A: coast/p-shallows-low, coast/p-bay, coast2/e-fz-shallows.
13. major, beam a flat wedge: FIXED. Analytic soft volume (radial falloff), faded near the eye and at its ends, cut at the play pitch, drifting dust, motes kept. B/A: coast/p-sealight-grey-lit, coast2/e-fz-bay, coast2/e-sl-iceroad.
14. major, rocks crumpled paper: FIXED. Snow only on what truly faces the sky (soft ramp 0.6-0.97 on a smoothed normal), the layered rock showing, blue-grey on the shadow side; stacks built from stacked scans. B/A: coast/p-den, coast/p-bay, coast/p-jetty-low.
15. major, cliffs smooth dark sheets: FIXED. seaCliff re-packed from dark_rock_02 (ledges, cracks), read from above where the face leans back, strata; gen5 heights: ramps over 3-4 cells, crest and face noise, crags along the crest (a headland's top rolled like a tarp), no narrow ribs, isolated rock low; final session: where the camera's line-of-sight cap holds a rib low the cap is lumped (0.45-1x: the jetty's rib was one 15 m snowed roof), and the Act V ground reads a gentle facet high on a cliff, and a low rib's faces, as stone with snow on what leans back. B/A: coast/p-overlook-cine, coast/p-camp-lit-cine, coast2/e-fz-graveyard-cine, coast2/p-fz-overlook-cine.
16. major, fires light nothing: FIXED. fireLife: flames, embers, smoke and a pooled warm light (hearth 15 in a fire orange, its halo 4.2 m), cages and cairns too; the hearth's tripod stouter with a cauldron and no ring (ring + thin legs drew a black ankh from above); the farlight camp's brazier an iron basket with a real fire; final session: the hearth's tripod and the tide bell's gallows never dither round her (worldMat noOcc: planks5n, iron5n), and a lit tower's light path on the water breaks into fine sparks in patches, not a field of confetti round her. B/A: coast/p-camp-lit, coast/p-camp-lit-cine, far/d-f-camp, far/p-f-camp.
17. major, the Farthest Light dithers over the arena: FIXED (8) plus a stepped stone base, a cap, a lit door, a weathered shaft. B/A: far/d-f-core, far/d-f-farlight, far/p-f-core.
18. major, the Light's Skerry a diagram: PARTLY FIXED. Stepped base, door, lantern ember, rock ledges and offerings round the core, cairns from rock scans, the presence sweeping under the ice, black curtains overhead. Not fixed: the cross and ring are still the layout's thick/thin cells (pale paths on dark ice). B/A: far/d-f-arena-cine, far/d-f-arena-low.
19. major, bergs glass gems: FIXED. Slab bergs with smooth normals, sheer calved faces a deeper blue than their snowed tops, calving streaks, no caustic layer, no Phong blob, rise kept under the slabs. B/A: far/d-f-berg0, far/d-f-berg1, far/d-f-berg2, far/p-f-berg1.
20. major, Breathing-holes black ponds: FIXED. Brash plates (baked Voronoi), grease band, sheen and glints, pancake floes adrift that never overlap (pale 14-gons read as paper stars), wisps of sea smoke rising, lamplight. B/A: far/d-f-hole0, far/d-f-hole1, far/p-f-hole1, far/p-f-hole0-wait.
21. major, sealed hole a paved plaza: FIXED. Dark glassy new ice, sparse soft frost blooms, frayed edges, the marker beam softened. B/A: far/d-fl-hole1, far/p-fl-hole1.
22. major, Ice Road ridges dots: FIXED. Tilted slab piles with rubble, sheer faces deeper blue, poles in snow mounds with three ice blocks, drifts across the road, sledges and casks along it. B/A: far/d-f-pole2, far/d-f-pole6, far/d-f-pole10.
23. major, Drowned Lights skylights: FIXED. Rim from the 2x2 outline, the lantern a bright point with a cross of glints under its pane, its glow kept at the window. B/A: far/d-f-drowned0, far/d-f-drowned1, far/d-f-drowned2.
24. major, ebb caves skate bowls: PARTLY FIXED. Overhang of rock scans with icicles over the pool's back half, dark floor, kelp; the trench's shape is the layout's (seg + disc). B/A: coast/p-cave1-high.
25. major, the Frozen Fall glass: FIXED. Merged smooth normals, pale icy material with streaks and a cold inner glow, icicles hung from the lip. B/A: coast/p-fall, coast2/e-fz-fall-cine.
26. major, islets flat plates: PARTLY FIXED. Rings of low rocks, foam and slush where the sea meets their steep edge, frayed corners; their tops stay flat (they are refuges: walkable floor). B/A: coast/p-sealight-grey, coast/p-bay.
27. major, the Cradle ring a UI circle on snow: FIXED (build.js lightRing's Act V snow profile; light.js untouched) and her light no longer burns a white disc on snow (heroI 15-20, warmer). B/A: coast/p-start, coast/p-overlook, far/p-f-berg1.
28. major, drift dusting as TV static: FIXED. One wind with its streak lines bent in slow meanders, a smooth mask with a fine sparkle, faded with distance; bubbles only at the noise's peaks. B/A: coast/p-graveyard1, far/d-f-drowned1, coast2/e-fz-iceroad2.
29. minor, stilt hut roofs paper: FIXED (planks with soft snow, eave icicles). B/A: coast/p-huts2, coast/p-camp-unlit.
30. minor, broken boat capsule: FIXED (code hull, ribs, strakes, sunk and tilted). B/A: coast/p-graveyard1.
31. minor, Name-stones barcode: FIXED (textures.js runeLines, an emissive rune decal). B/A: coast/p-stone-thaleia, coast/p-stone-keyx-lit.
32. minor, Icemaw holes black decals: PARTLY FIXED (water, brash, sheen, frayed rim, floes; still a 2x2 hole). B/A: far/d-f-maw.
33. minor, fire cages toy-like: FIXED (platform caps, broad braziers, rock-scan cairns, embers when unlit). B/A: coast/p-sealight-grey-cine, far/d-f-fire0.
34. minor, the shaft as birch bark: FIXED (weathered stone grade). B/A: far/d-f-farlight.
35. minor, one-cell footprints pale squares: PARTLY FIXED (no square over a pit; hull footprints on the flats are shore and keep the flats' bed, so no dry rectangle round a hull: coast/p-shallows-low; one-cell footprints on thick ice keep their cell).
36. minor, jetty at high water: PARTLY FIXED (collars, the water meets the snow on the jittered line, no floating sledge, the rib north of it lumped and stone-faced; the deck's own corners keep the grid). B/A: coast/p-jetty-high.
37. minor, waypoint toy slab: PARTLY FIXED (patchy snow and grain in Act V; its standing stones are the shared boxes every act uses).
38. minor, hairline seams: FIXED in code (chunk overlap, the far sea's seam fanned); not visible to SwiftShader either way.
39. minor, FAR_BEACONS colours: NOT MINE, request to world.js: give FAR_BEACONS[5] and [6] the cold white of [4]; shrink the sea-lights' sprites to 3-4 m with a hard core and a horizontal flare streak stretched on the 12 s flash.

## PERF (perf5, tools/scenario.mjs, phone 915x412 at 1.5, SwiftShader, 5 cycles; r1/perfH/perf5.txt, 04:49-04:58 Oct 17,
## load 8.3: another workflow's browser ran beside it; the verdict is the median of per-cycle ratios to the Field)
| spot | q1 ms (Field 1059) | q1 vs Field | q0 ms (Field 275) | q0 vs Field | q0 floor |
|---|---|---|---|---|---|
| coast (high water, the Shallows) | 1036.7 | 0.964 pass | 297.2 | 1.100 pass | true |
| coastLow (low water, the Dalaro's flats) | 927.6 | 0.875 pass | 248.5 | 0.899 pass | true |
| farlight (the Ice Road's middle pole) | 802.0 | 0.790 pass | 218.3 | 0.793 pass | true |
Overall pass: true (limit 1.15). Before this session's cuts the integrator's run at b57ca18 had coastLow 1.171 (q1) and
1.184 (q0), failing; perfC (23:26 Oct 16) had coastLow 1.117. The cuts: the sea's dry quads not drawn (a sorted draw range
per chunk), the Act V ground's zero-weight layer reads skipped (A/B: r1/tools/ab4.mjs, ab5.mjs).

## METRICS (r1/tools/metrics.py: near-black = max channel < 16/255 over the frame; centre = mean RGB of the middle 50%;
## detail = mean |image - 6 px box blur| over the middle 50%; before = crit1/, after = r1/after/, same views and seeds)
| view | black before -> after | detail before -> after |
|---|---|---|
| coast/p-start (snow) | 5.3% -> 6.8% (HUD and cliff shade) | 2.4 -> 5.5 |
| coast/p-camp-unlit | 1.0% -> 0.5% | 4.9 -> 7.2 |
| coast/p-camp-lit | 1.0% -> 0.4% | 6.0 -> 8.3 |
| coast/p-den | 0.3% -> 0.6% | 4.5 -> 7.6 |
| coast/p-bay | 0.4% -> 0.4% | 8.2 -> 9.2 |
| coast/p-whale | 9.4% -> 0.3% | 3.3 -> 6.3 |
| coast/p-graveyard1 (thin ice) | 23.2% -> 0.1% | 4.3 -> 2.7 |
| coast/p-fall | 10.9% -> 2.1% | 6.0 -> 5.4 |
| coast/p-sealight-grey (water) | 2.3% -> 0.1% | 5.1 -> 6.6 |
| coast2/p-fz-camp / p-sl-camp | 3.4 / 3.3% -> 3.1 / 2.9% | 5.0 -> 7.6 / 7.7 |
| coast2/p-fz-bay / p-sl-bay | 4.9 / 4.4% -> 4.2 / 2.8% | 6.9 / 7.1 -> 7.4 / 8.8 |
| coast2/e-fz-graveyard (desktop) | 37.1% -> 2.0% | 6.0 -> 2.9 |
| coast2/e-fz-iceroad (desktop) | 30.0% -> 1.9% | 4.0 -> 3.5 |
| coast2/e-sl-iceroad (desktop) | 14.1% -> 1.6% | 4.1 -> 3.6 |
| coast2/e-fz-bay2 (desktop, the bay's lip) | 17.3% -> 2.5% | 4.0 -> 3.5 |
| coast2/e-fz-camp / e-sl-camp (desktop) | 1.9 / 1.7% -> 1.8 / 1.5% | 6.1 -> 9.5 / 9.6 |
| far/d-f-start | 11.9% -> 2.7% | 2.7 -> 8.1 |
| far/d-f-camp | 14.4% -> 0.2% | 6.0 -> 8.9 |
| far/d-f-hole0 / hole1 | 30.4 / 37.4% -> 0.4 / 0.4% | 4.8 / 5.2 -> 6.2 / 6.0 |
| far/d-f-drowned1 | 35.6% -> 0.0% | 4.8 -> 3.1 |
| far/d-f-pole6 | 26.6% -> 0.1% | 9.8 -> 6.5 |
| far/d-f-berg0 | 35.3% -> 0.0% | 3.7 -> 2.5 |
| far/p-f-camp / p-f-hole1 / p-f-berg1 (phone) | 17.2 / 32.4 / 36.1% -> 3.2 / 2.7 / 2.7% | 4.3 / 4.5 / 3.9 -> 7.6 / 4.8 / 4.5 |
| far/p-fl-camp (phone, seaLit) | 6.3% -> 3.1% | 3.9 -> 7.4 |
(final set, shot 03:39-04:48 Oct 17 with the final code)
The Field's camp measures detail 8.0 and the Woods' mere 9.0 on the same tool (r1 earlier); the snow is now at that floor.
The ice's detail went down where its static and its black-and-grey blotches went (the critic's TV-static issue): the ice
reads by value and its few features now, which this measure does not reward.
The three coast nights, phone, the snow away from the fire (rows 0-250, cols 500-1100): tide 98,113,116; frozen 76,77,90
(29% darker, violet); seaLit 104,121,121 (green-cyan). Before: 126,136,140 / 120,124,137 / 128,137,141.
Dressing, seed 3, props per 100 m2 of floor: coast 1.7 -> 9.0, farlight 0.9 -> 4.3 (the Field 21.8, the Woods 52.3).

## REQUESTS to other owners
- (withdrawn) the layout request for Skerry Bay's ruled thin-ice / flats line: drawn off the grid now (sea.js), no layout
  change needed.
- story.js (stage C): the rite cine's foreground rockFace fills a third of the frame (r1/after/coast/p-rite-cine, 03:57 Oct 17); the Act V occluder now follows the real camera, so the `occ` points the critic asked for are no longer needed
  for the look, but a later framing pass may still want them.
- world.js: FAR_BEACONS[5] and [6] to the cold white of [4] (0xf0f4ff); the sea-lights' sprites 3-4 m with a hard core and a
  horizontal flare streak that stretches on the 12 s flash (d-town-north-cine shows two of the three still orange).
- light.js (stage C), optional: in 'sea' zones the pool's light at the hearth could warm the huts a little more; the look
  is acceptable as it is (build5's own fire light, 15 in a fire orange).
- Shared (not Act V's to change): the waypoint's three standing stones are plain boxes in every act; in Act V they read as
  untextured blocks on the snow (coast/p-camp-unlit). A rock-scan set of stones for the snowy acts would lift it.

## Not fixed and why (besides the requests)
- 10 the farlight's open thin-ice fields stay sparse: strewn pale blocks read as litter on the dark ice, a separate snow
  mesh as a paper oval; the fields carry the ice's own wind dusting, bubbles, old pressure cracks and the presence instead.
- 18 the arena's cross and ring are the layout's thick and thin cells (pale snowed paths on dark ice), drawn with frayed
  edges; the arena is otherwise dressed (base, door, ember, ledges, offerings, cairns, presence, black curtains).
- 24 the ebb caves are a cut in the cliff by the layout (seg + disc); they have an overhang, icicles, a dark floor, kelp.
- 26 the islets are refuges (walkable floor) and stay level; rocks, foam and slush ring them.
- 32 the Icemaw holes are 2 x 2 cells; their rims fray, the water has sheen and brash, floes ride in them.
- 35-37 the deck's own corners keep the grid; one-cell footprints on the thick look keep their cell; the shared waypoint.
- Seen in the final shots, small: the Dalaro's low hull side dithers as a pale rectangle when she stands just west of it
  (coast/p-shallows-low: the occluder's round window, by design); the payoff and the farlight cines show a plain dark
  band of far sea under the sky; in the camp cine the 2-cell thin-ice strip beside the Fall's thick path runs as two pale
  blades seen end-on (layout); the Grey Light islet's south edge and the strand's long shores still read nearly straight
  (they may wander only 0.4 m: walkable edges); the jetty's north rib still reads pale from the play camera at high
  water; the frozen desktop cines (coast2/e-fz-*-cine) are very dark by design (black aurora, the fires the only warmth).
  The light path that broke into confetti round her under a lit tower is fixed (fine sparks in patches).
- Renderer: none of the remaining artefacts is SwiftShader's; the Bayer dither is the game's occluder convention.

## SHOTS
- before: the critic's set, /tmp/claude-0/-home-user-abyssos/848977a8-1632-5f97-b36d-9baf61edd253/scratchpad/act5/look/crit1/
  (coast/, coast2/, far/, arr/, cmp/, crops/); after, same view names and seeds, shot 03:39-04:48 (Oct 17) with the final
  code: /tmp/claude-0/-home-user-abyssos/848977a8-1632-5f97-b36d-9baf61edd253/scratchpad/act5/look/r1/after/ (coast/ phone
  tide, lit, frozen and seaLit, the rite cine; coast2/ phone p-* and desktop e-* frozen, Freeze and seaLit; far/ desktop
  d-* and phone p-* farlight, seaLit, Whitecliff; arr/ the story's arrival, thread and payoff framings). The shot configs:
  r1/tools/a-*.json (r1/tools/shot.mjs, chain r1/tools/chain.sh, finale2.sh). The previous after set: r1/after-prev/.
- side-by-side sheets (before over after): r1/cmp/final3-edges.png, final3-water.png, final3-nights.png,
  final3-cines.png, final3-snow.png, final3-far.png; contact sheets of the final set: r1/cmp/final3-farp.png,
  final3-fard.png, final3-c2e.png (and the older final-*.png, p10*-p13 probe sheets).
- probes: r1/p10-p17 (earlier sessions), r1/p18 (the bay's lip at tide, frozen and flooded, the bell, desktop), r1/p19
  (cliff facets, jetty rib, camp cine), r1/p20 + r1/cmp-p20.png (the camp cine's blades: sea/ice hidden), r1/p22 (the water
  at three tides after the culling, the hull's footprint).
- checks: r1/check5-final6.log (check-act5 300 seeds after the last gen5 change: no hard failures, the same oddities as
  before this round), r1/build7.log (vite build clean; rebuilt clean after every later edit), layouts against c388c3c:
  r1/tools/cmpgen2.mjs (40 seeds identical), shoreJit folds: r1/tools/jitstat2.mjs, jitstat3.mjs.
