# B2a: sea.js (the water, the ice, the aurora, the beams) — report

Role: sea (B2), task B2a. Repo `skotos/`. Nothing committed by me (the lead's checkpoint 8c1c788 at 20:12 holds the first
half of this work, including `src/debug/fake5.js`, a gen5 stand-in for the viewer that I have since deleted: the
working tree shows it as `D`).

## What I built

### `src/world/sea.js` (new, ~870 lines)
- **`SEA`**, the shared uniform block, every name in the contract: `uTime` (becomes `WIND.uTime`: build.js sets
  `SEA.uTime = WIND.uTime` at load), `uLevel`, `uWetLevel`, `uAur`, `uAurDark`, `uAurFront`, `uAurCol`, `tNoise`, `tCrack`,
  `uMap`, `uShade[4]`, `uGlow[8]`, `uLights[2]`, `uBeam[2]`, `uFreeze[3]`, `uFreezeAll`, `uWake`, and the plain `SEA.sky`.
  Internal extras: `uFrzT` (when the Freeze began: the swell holds there), `uFrzOn` (any freeze active: gates the freeze
  maths so it costs nothing when off). A 1×1 zero `tCrack` stands in until ice.js hands its texture over.
- **`noiseTex()`**: the 256² RGBA code texture, four tileable octaves one per channel (periods 4/8/16/32). It is
  **gradient (Perlin) noise, not value noise**: value noise with a quintic fade plateaus at its lattice and every
  threshold drawn on it showed square blocks (screenshot `shots/noise.png` vs `noise2.png`).
- **`aurora(p, soft, blur)`** (GLSL, shared by the water, the ice, the ground's G_AUR): long east-west arcs about 70 m
  apart on a sheet 70 m up, folded by the noise, rayed; green core, violet fringe; `uAurDark` darkens it and eats it with
  crawling black bands except behind the returning front (`uAurFront`, south to north, reads `uMap.y`). `soft` smears the
  curtains into glows for reflections; `blur` (the sheet's `fwidth`) fades the arcs into haze where one pixel spans many
  metres (without it the grazing reflection aliased into cyan noise). The mirrored aurora (water, ice) is skipped while
  `uAur × max(1 − uAurDark, uAurFront)` is under 0.02: under the black aurora it would be all but black, and it comes back
  with the returning front. The ice also rimes over with `uFreezeAll`.
- **`buildSea(L, group, quality)`** → a Group of 32×32-cell chunk meshes (indexed, per-corner attributes so the swell and
  the lift never crack): covers every coast cell with `bed < BED_DRY` that is not thick/window, every thin-ice and `L.sea`
  cell, every blocked footprint standing in water (gen5 takes `vbed` before the footprints: the water runs on under a hull)
  and every **lead sealed before the build** (world.js `act5Layout` makes them thick over the sea bed: they get `aFrz`, held
  frozen at `ICE_Y`, or the sea-bed pit would show). Attributes: `aBed` (`L.vbed`, or the corner mean; −0.6 off the map),
  `aHold` (corners touching ice/thick/window/deck and no tidal flat: held at −0.08, so open water never stands above the
  ice's edge), `aLead` (the Breathing-hole a corner belongs to: a freeze slot freezes only its own lead), `aShore` (cells
  from land: the Freeze grows out from the shore), `aFrz`.
  - Vertex: lift `clamp(uLevel − aBed, −0.05, 0.3)` (finite `BED_DRY` = 9 never reaches it), swell 0.06 → 0.18 m by depth,
    held under ice, lifted to `ICE_Y` where a freeze wave has passed; the Freeze holds the swell's phase.
  - Fragment, quality 0 (built first): colour by depth with one clear step (`smoothstep(0.37, 0.43)`: beds come in 0.15
    steps, so at slack water whole flats sit at exactly 0.45 and must read closed), see-through grey-green wading water
    (alpha 0.32–0.62, the wet ground shows through), blue-black closed water (0.95), a faint pale **edge line** on the
    0.4 m contour (`fwidth`, so it is a line at any distance), foam at the waterline (thin, lacy, only where depth > 0.004 so
    plateaus exactly at the waterline do not foam over), lapping lines, the moon glint, the hero lantern lighting the
    shallows, the Walking Tower's wake (`uWake`: Kelvin arms, a trail, the bow churn), the freeze rime and its front.
  - Quality ≥ 1 adds the second noise read, the **aurora mirrored** along a calm reflection normal (the ripple's normal
    scatters a far sky into noise), and the **light paths** of `uLights` (sparks off a fine ripple + a faint broad glow).
  - Farlight (`!L.bed`, define `SEA_LOW`): no tide, the water held a hand under the ice, black with a cold sheen and brash
    along the ice edges; **opaque and drawn at renderOrder −0.5** (after the ice, before the ground) so the sea bed under a
    lead is rejected by depth instead of shaded.
- **`seaBeyond(L, group, o)`**: the sea past the north and east edges (20 m-subdivided quads, `aBed` −4); `o.ice: true`
  (the coast after the Freeze) ice all round; `'pack'` (the Farthest Light: build.js passes it) ice east and **west** and
  open water north, beyond the ice edge — the contract says `ice: true` for farlight, but its north edge is the open sea
  the Skotos rises from, so pack ice there would make the arena's open water a lead.
- **`iceMat(o)` / `buildIce(L, group, quality)`** → `{ mesh, windows, floes }`. Opaque thin ice at `ICE_Y`, renderOrder −1,
  chunked, with a 0.32 m **skirt** where it meets open water (its thickness shows). Fragment: crack stage from `tCrack`
  (cell centre / `uMap`; skirts carry their cell in `aC`); stage 4 discards (the water shows), **1** a hairline ray through
  the cell, **2** a three-ray star, **3** crazed white (a Voronoi web + frost), **5** slush (grey brash, black water between
  the bits: discarded). Black body (linear 0.0015–0.011: anything brighter reads mid-grey after ACES and sRGB), bubbles
  0.3 m down and dark mottling 1.6 m down **with parallax**, wind-streaked snow drifts, `uShade` dark shapes at depth (kept
  at quality 0: the Icemaw's tell; slot 3 deeper and wider for the Skotos), `uGlow` drowned lanterns (a point and its halo,
  at their depth, written from `L.spots.drowned` per zone while the zone draws), the sky's fresnel, the mirrored aurora,
  lantern glints. Windows (`ICE_WINDOW`): a clear pane over the pit, frosted rim. Floes: an `InstancedMesh` of 32 shards
  (count 0) in the ice material for ice.js, with `swellY(x, z)` exported (the shader's swell in JS) to bob them.
  Quality 2: Phong (every lamp glints). Quality 1: Lambert + one computed glint of the hero's lantern, and the deep mottle
  taken from the surface read (one fetch fewer). Quality 0: Lambert, 2 fetches + the crack fetch, no parallax or glows.
- **`auroraSky()`**: the dome singleton (r 110, BackSide, follows the camera, fog off, drawn first). Night gradient, stars,
  and three curtains drawn **in the sky's own angles** (a hem wandering along the horizon, rays rising from it, green to
  violet) — the design's 4-step march through a sky plane, tried first, squashes the arcs into thin parallel streaks at
  the low pitch where the dome is seen (`shots/g4-cine.png` vs `g5-cine*.png`). Shown by `R.skyHook` (gfx.js `render()`)
  while `SEA.sky` and `R.cam.pitch <= 0.34` (the contract says ≤ 0.25; at 0.25–0.34 the top of the frame already shows
  sky, and the dome's horizon fades into the fog colour there, so there is no pop).
- **`beamMesh(o)`**: one additive open cone (24 segments, 26 m, r 0.3 → 5), `depthWrite` off, alpha falling toward the
  silhouette `1 − (1 − |N·V|)^1.5` (squared) and with length, manual exp² fog, faded out below 1.6 m so nothing is drawn on
  the ground, colour-space encoded (it was invisible before: linear light added onto the sRGB framebuffer). It dips so its
  axis is at 1.5 m three quarters out (a level beam from an 8–10 m lantern stays above the play camera's frame).
  `userData`: `setLen(d)`, `setK(k)`, `setDir(theta)`, `point(d, out)` (for the pooled light), `tick(dt)` (hides the cone
  beyond 45 m, spawns 20 snow motes a second along the axis). Quality 0: no cone (light.js keeps the moving light).
- **`skotosSkin(mat)`**: the `onBeforeCompile` patch (chains any existing one): fresnel from `uAurCol × (1 − uAurDark)`,
  a hot streak where `uBeam` falls on it, slow pale flecks; quality 0 fresnel only. Tested on Standard and Lambert spheres.
- **Setters**: `setShade(i, x, z, r, k)`, `freezeWave(i, x, z, r, dur = 3, all)` (dur 0: frozen at once; `all`: every
  water cell, the naming's wave), `freezeRing(i, x, z, r, p)` (new: the white ring closing over hole i, p 0–1),
  `setFreezeAll(k)` (records the swell's phase), `setWake(x, z, angle, k)`, `clearFreeze()`.
- Exports for build.js: `SEA_GLSL`, `SEA_LIT`, `SEA_U`, `cornerBeds`, `noiseTex`.

### `src/world/build.js`
`SEA.uTime = WIND.uTime`; `ACT5`; **`ground5(type)`** (chains `rime/<id>` → deep → base set; a fallback A that is not snow
is whitened (`fake`), farlight's fallback blue ice tinted (`hueB`)); an **Act V branch in `buildGround`** (heights from
`L.hgt`, shore stone wherever the tide reaches and raggedly a little above it, thick ice snow, floor normals levelled where
the floor is walked — the pits beside it tilted them and the ice road took the cliff layer); the `aBed` attribute;
**G_GLINT** (a 4 cm 3D hash grid, tilted micro-normals catching the moon and the lantern, flat snow only, quality ≥ 1),
**G_WET** (dark, glossy where `uWetLevel` has reached the corner's bed), **G_AUR** (the curtains' light at 6%, uniform-
gated: free at `uAur` 0; on the coast, the farlight and the town). Hooks in `buildLevel`: `buildSea`, `buildIce`,
`seaBeyond`, `act5Level`; Act V's `L.props` go to act5Level only.

### Others
- `src/world/atmos.js`: `coast`, `coastCine`, `coastFrozen`, `coastAurora`, `farlight`, `farlightFight`, `farlightNight`,
  `farlightAurora`, `townAurora` with `aur`, `aurDark`, `drift`; **`mixAtmos`** exported (world.js's, verbatim).
- `src/gfx/gfx.js`: `setAtmosphere` keeps `R.hemiBase`, `R.drift` and calls `R.atmosHook` (sea.js writes `uAur`,
  `uAurDark`); `frame()` drifts the hemisphere toward the aurora's green; `render()` calls `R.skyHook` (the dome, the freeze
  tweens, the per-frame light the water reads). gfx.js imports nothing from sea.js (no cycle).
- `src/gfx/env.js`: `PACK_ORDER` gains `'rime'`.
- `src/world/build5.js` (new): a **frame only** (`act5Level` no-op, `act5Prop` an empty Group with `userData.kind`), so the
  hook compiles and world.js's calls work; the props are the next task.
- `src/debug/viewer.js` (world part): `?world=coast|farlight` from gen5 (`&frozen`), `&at=` any spot (`&n=` for lists),
  `&tide= &wet= &freeze= &wave= &ring= &crack=1 &shade=1 &wake=1 &beam=1 &tele=1 &skin=1 &sky=1 &aur= &dark= &front=
  &atmos=`, `window.__bench(n)` (GPU-synced frame time), `window.__v5` (the page's own modules for scenarios: a fresh
  `import('/src/...')` is a different instance once a module has been hot-updated).
- `tools/scenario.mjs` (appended): **`shallowtele`** and **`perf5`**.

## Changes in files I do not own
- `src/game/actors.js:80` (combat's, nobody's in stage B): blob shadows `renderOrder` 1 → **1.5**. At 1 they tied with the
  water and their order depended on distance sorting. 1.5 puts them after the sea and keeps their old order against
  pools, rings and decals (2) in every other zone. The contract says 2 "in Act V zones"; 1.5 does that job everywhere.
- None other. Requests below.

## How I tested it
All my outputs are under `scratchpad/act5/b/` (`shots/`, `b2a/`, `shallowtele/`, `perf*.txt`, `views.mjs`, `perf2.mjs`,
`probe*.mjs`); the world stage shares that folder (its files are `b1a/`, `B1a.md`, `runscen*.sh`, `vite.nohmr.mjs`, ...).
- **Build**: `npx vite build --logLevel error` (into the scratchpad) clean after every round; last at the end
  (`b2a/dist-final`).
- **Screens** (world viewer, `views.mjs "<query>" <prefix> '[views]'`, real gen5 layouts once they landed; gen5 stand-ins
  before that, since deleted):
  - coast Shallows at h 0 / 0.6 / 1.2: `shots/c2-*`, `c3-*`, `g1-dalaro.png`; wading vs closed water with the edge line,
    see-through shallows, the waterline foam (`shots/dbg-t06.png` was a depth/foam/step debug view).
  - draw order over shallow and deep water (telegraph, sea-green cone, decal, warm ring, light pool): `shots/c4-tele.png`,
    quality 0 `shots/q0-shallows.png`.
  - ice: cracks 1-3, a broken cell, slush, shades: `shots/c7-shelf.png`, `q0-fall.png`, `q1-fall.png`; the Fall shelf
    `g2-fall.png`; the window `g2-grey.png`.
  - the farlight: `shots/f3-hole.png`, `f3-drowned.png` (the drowned lantern under the ice), quality 1 `b2a/f5-*.png`;
    the freeze ring closing over hole 0 `shots/f4-ring.png`, the wave racing out over its lead `f4-wave.png`; a lead
    sealed before the build `b2a/sealed2-hole1.png`.
  - the cines (pitch 0.05-0.14): the coast under the green aurora `shots/g5-cine.png`, `g5-cine2.png`; the black aurora
    after the Freeze `fz-cine.png`; the Freeze half-way `fz-freeze.png`; the farlight under the true aurora `fa-true.png`.
  - the beam: `shots/b6-beam.png` (the cone over the shallows; `b1`-`b5` were the misses described above).
  - the Skotos skin (Standard and Lambert spheres, a beam on the right one) and wet sand: `shots/s1-skinWet.png`.
  - the game itself (`?auto=coast`, world wiring landed mid-task): `shots/game-coast.png`, `b2a/game-shallows.png`.
- **`node tools/scenario.mjs shallowtele <out>`**: `{"tele":45.8,"pool":45.3,"cradle":37.7,"tones":68.6,"pass":true}`
  (colour distance on a 0-441 scale, each decal read with and without itself, in a 5×3 wading patch with closed water
  3 cells north; `shallowtele/shallowtele-0.png`).
- **Benchmarks** (the world viewer's `__bench`, GPU-synced, 915×412 at pixel ratio 1.5, MSAA, phone emulation, a static
  build served privately so nobody's edits reload the page; three interleaved rounds, medians; software rendering under a
  load average of 15-21 from the other stages, rounds vary ±15%):

  | ms / frame | q1 run A | q1 run B | q0 |
  |---|---|---|---|
  | Field camp / flats / graves | 2561 / 1550 / 1868 | 2854 / 2029 / 2324 | 559 / 371 / 367 |
  | coast Shallows, high water | 1606 | 2309 | 399 |
  | coast Fall shelf (ice) | 2483 | 3070 | 457 |
  | farlight mid Ice Road | 2792 | 2875 | 600 |
  | farlight Breathing-hole | 3244 | 3315 | 533 |
  | farlight drowned light | 3343 | 3877 | 729 |

  The gate's two spots (the Shallows at high water, mid Ice Road) are within the Field's worst + 15% in both runs and at
  quality 0. The hole view is at the margin (+16% in run B) and the drowned-light view over (+30-36%). Run B already has
  the cuts made after run A (opaque leads, one fewer ice fetch at quality 1); the mirrored aurora gated off under the
  black aurora came after both. **`perf5` itself (in the game) is written but not run**: the zones only just became
  enterable, without their props or actors, so its numbers would not mean much yet.
- **Existing scenarios** (my private no-HMR server): `combat` ok (13 kills, loot as before), `panels` "ok" (the town, now
  with G_AUR at 0), `cast4` ok (all eleven Act IV kinds on their own models; the Field's ground looks as before,
  `b2a/reg/cast4-0.png`). Not run: the long Act III/IV routes (each took 10+ minutes per scenario under this load); my
  changes there are the shared groundMat (unchanged paths unless the new flags are set) and the blob shadows' order.

## Stubbed or left for later
- **build5.js** is a frame (no props): act5Level places nothing yet, act5Prop returns an empty Group. The icy Instancer
  material for bergs and icicles (image 13) should reuse `iceMat({ far: true })` or a world-projected variant of it.
  Note for the jetty: the water is held at −0.08 under deck cells and rises to its tide level one cell out.
- **fx.js** ambients and emitters (coast, coastFrozen, farlight, blizzard, seasmoke, seaDrip, splash, iceShards,
  freezeCrystals, breath, footprint): not started.
- **perf5**: written, not run (above). The game-side numbers need the props and packs first.
- **Writers that are not mine**: tide.js must write `SEA.uLevel` (a step ahead of the grid) and `SEA.uWetLevel` (it does
  not yet: the water sits at h 0 in the game); ice.js `SEA.tCrack`/`SEA.uMap` and the floes (`out.ice.floes`, bob with
  `swellY`); light.js `uLights`, `uBeam`, and `addBeam` with `beamMesh` (call `userData.tick(dt)` each frame, set the
  pooled light at `userData.point(d)`); ai.js `setShade`, `setWake`; story `setFreezeAll`, `uAurFront`.

## Requests to other owners
- **world.js (B1 now, story in C)**: on every farlight entry call `freezeWave(k, hole.x, hole.z, 70, 0)` for each sealed
  hole whose lead was still open when the zone was built (a zone cached across the seal: its water mesh has the lead
  open; the slot holds it frozen). A lead already sealed at build time needs nothing (`aFrz`). During the seal:
  `freezeRing(k, x, z, 4.5, progress)` for the ring, then `freezeWave(k, x, z, 70, 3)`.
- **creatures.js `prepare()`** (assets now, combat in C): skip the `envMapIntensity`/`roughness` overrides when
  `scene.userData.keepMat` (the contract's Skotos and tentacle GLBs). I did not touch it (the asset stage edits that
  file in this stage).
- **combat (light.js)**: the hero's Cradle ring and the pools are renderOrder 2 already (fine over the water).

## Open problems
- **Frame time on the frozen sea** off the gate's spots (Breathing-holes +16%, the drowned lights +30-36% in the
  software benchmark). Next cuts if a real phone agrees: the glow loop only where a drowned light is within ~30 m (a
  uniform flag), shadows off on the thin ice at quality 1, or the bubbles without parallax at quality 1.
- In a cold session with **neither the rime nor the deep pack**, the coast's ground is the base set's flags, mud and
  wall, whitened and cooled (`game-coast.png`): readable, but it waits on the rime pack.
- The far sea in the cines is a flat teal under the aurora haze; it could carry the curtains' mirror image.
- **An incident**: at about 20:38 I ran `pkill -f "tools/scenario.mjs"` to stop my own regression; the pattern also
  matched any other scenario process running at that moment (the world stage was running scenarios from this folder),
  and my own shell. Later stops were by exact PID. If the world stage saw a scenario die around 20:38, that was me.
