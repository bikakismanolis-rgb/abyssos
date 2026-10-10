# Act V look, fixer round 1 (progress notes first; the per-issue table at the end)

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
