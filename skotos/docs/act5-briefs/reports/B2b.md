# B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report

Role: sea (B2), task B2b. Repo `skotos/`. Nothing committed by me. Scratch: `scratchpad/act5/b/b2b/` (tools, screens,
perf runs). This task was cut by a container restart once; the first run's work was on disk (checkpoint 951c5b0) and I
continued from it (progress notes at the end).

## What I built

### `src/world/build5.js` (mine, ~900 lines)
- **`act5Prop(kind, o)`**: every kind in the contract, each a Group with `userData.kind` and its switches, the rime pack's
  part where it exists ('rime/<name>' through `packProp`), a code model where it does not:
  `sealight` (towerA/B/C by `o.v`, code fire-cage on the cut top: `setLit`, `setBeam(theta)`, `flash(k)`, `top`, `fireY`),
  `skerryLight` (towerC + lantern room + cracked bell; on its rock island, or `o.back` for the crab: `setLit`, `setBeam`,
  `ring(k)`), `farLight` (shaft + lantern room: `setLit`, `setBeam`, `flash`, `top`, `fireY`, `door`), `lanternRoom`
  (`setLit`, `flash`, `fireY`), `hearth`, `cairn` (`setLit`, `fireY`), `holeLamp` (`setLit`, `setHeld`, `flameAt`),
  `markerLight` (`setLit`, `setBeam`), `nameStone` (runestone or code slab, glowing name-lines, niche lamp: `setLit`),
  `doorStone` (`setCarved`), `iceWindow` (pit walls and floor in the icy material, a cold light: `figureY` -2.2),
  `stiltHut`, `rack`, `pole`, `boat` (`setLevel(h)`: floats and rides the swell at high water), `floe`, `bell`
  (`ring(k)`), `cask`, `rubble` (the Neck's plug: `clear()`). Beams are sea.js `beamMesh`, made lazily by `setBeam` and
  ticked through `TICKS` (motes, the 45 m cut-off).
- **`act5Level(L, I, B, out)`**: places every `L.props` type gen5 emits (wreck, keelboat/rowboat/brokenBoat, shack,
  stiltHut, rack, jetty, whale, frozenFall, icicle, anchor, sunkenAnchor, kelp, driftwood, barnacleRock, rockFace,
  seaStack, shoreRock, boulder, skerryRock, ribs, ship, berg, iceBlock, pole, sunkenLantern, brazier, fx), instanced where
  it repeats (Instancer types `icy:` the shared ice material, `cliff5:` the world-projected sea-cliff stone, `rime:` a scan
  as packed, `c5:` a code model; `~ns` casts no shadow), the rest merged into the batches; sea-smoke emitters per 16 m
  square of open water; wreck drips (`seaDrip`). **`instDef5`** is build.js's Instancer hook.
- New in this run: **the Frozen Fall rebuilt** (11 bulging half-tube columns of ice down the cliff, flaring at the foot, a
  glassy frozen pool with a ragged rim, icicles on the lip) in **`icyFall`**, the icy material's `ICY_GLOW` variant (a
  cold light held inside, little snow); the icy materials are cached per variant; **`rockPile`** (the base set's rock
  scans merged in the sea-cliff stone, code stones as the fallback) for the skerry island.

### `src/world/sea.js` (mine; B2a's file, changed in this run)
- **Ragged edges, the act's biggest look fix** (the Farthest Light read as cell squares everywhere, `look/f1-*.png`):
  - `buildIce` lays the ice over a **band** of the level floor round the thin ice (8 neighbours; not tidal, window,
    jetty), attribute `aB` (0.5 at corners touching thin ice, 1 at the band's far side); the shader cuts the band away
    raggedly (certain at the far side, never at the thin ice's edge), and dusts the ice toward the cut instead of painting
    full snow; thin ice **frays away toward open water** too (no skirts there now); **footprints standing in the thin
    ice** (ice blocks, hulls: thick, closed, corners at -2) are covered by the ice (they drew a 2 m pit under the prop).
  - `buildSea` runs the farlight's opaque water on under a band round the open water and round leads sealed before the
    build (build.js frays the ground there); `sealed()` checks all four corners, needs a walkable cell and skips ice-window
    corners (window rims were drawn as frozen water; two missed cells left black holes at a sealed hole's edge).
  - **`shoreJit(L)`** (new export): the coast's floor corners where the floor drops to the sea bed are nudged up to
    0.3 m off the grid, the ground and the water by the same amount, so the coastline wanders instead of stair-stepping.
- **Cheaper paths (perf)**: the aurora mirrored in the water and in the ice is worked out **at the vertices** (a metre
  apart; blurred toward its glow it lies in bands metres wide), the ripple breaking it up in the fragment; the far sea and
  far pack keep the per-pixel reading for the cines. The ice is **Lambert on every quality** (the q2 Phong highlight of
  the hero's lantern laid a white blot on the black ice wherever she went), with the computed glint (`ICE_GLINT`, q >= 1)
  and `ICE_Q1` keeping q1's one-fetch-fewer path; specular cut by frost.
- Look: the water's pale edge line is dropped where the bed falls away steeply (it traced the cells' steps along every
  jetty and rock; it stays on the flats where wading meets closed water); the aurora in the water blurred (+6 m) and a
  little dimmer; new ice (the Freeze, a sealed hole) grey-white with frost feathers; drowned lanterns dimmer and drawn at
  0.45 of their depth so they stay under their window.

### `src/world/build.js` (mine)
- `ground5`: `edge` (farlight) → **`G_EDGE`**: the ground frays away over a band round the open water (`aWat`, the
  water share of each corner, counting leads sealed before the build); the farlight ground leaves out the quads under
  thin ice, open water, footprint pits and sealed leads (never seen: fill saved).
- **Wind drifts on the snow** (q >= 1, inside `G_GLINT`: one streaked noise read, blue in the hollows): the farlight's
  snow no longer reads as flat concrete. **`G_AUR` at the vertices** (the aurora's light on the ground).
- Thick ice by the coast's shore frays into the stone (and trodden snow with it); the floor round an **ice window** stays
  level (gen5 puts the window's boundary corners at -2.2, which sloped the rim into the pit); the coast's shore corners
  take `shoreJit`.

### `src/world/atmos.js` (mine): `coast`, `coastCine`, `coastFrozen`, `coastAurora`, `farlight`, `farlightFight`,
`farlightNight`, `farlightAurora`, `townAurora` with `aur`, `aurDark`, `drift`; `mixAtmos` exported (world.js imports it).
### `src/gfx/fx.js` (mine): ambients `coast`, `coastFrozen` (diamond dust, no sea smoke), `farlight`, `blizzard`;
emitters `seasmoke` (thicker now, rate by quality: big soft sprites are fill) and `seaDrip`; `splash(x, z, s)`,
`iceShards(x, z, n)`, `freezeCrystals(x, z, r)`, `breath(x, y, z, k)`, `footprint(x, z, rot)` (48 instanced prints,
12 s, snow cells only, q >= 1), `walk5` (the hero's breath every 2.5 s, quicker and thicker with `FX.chill`; prints every
0.7 m); `frostImage()` / `frostVignette(v)` (the CSS-free half of the frost overlay: a data-URL frost texture and the
mask sizes for a Cold value; the overlay is story's).
### `tools/scenario.mjs` (mine: the two appended scenarios)
- **`perf5`** rewritten (see below). **`shallowtele`** unchanged from B2a.

## How I tested it
Private no-HMR **dev** server on :5327 (`vite --config scratchpad/act5/b/vite.nohmr.mjs`; a production build does not
expose `window.__act5.tide`, tide.js registers it only in DEV, so the old perf5 measured the Shallows at low water there).
One headless browser at a time. Tools in `b2b/tools/`: `gview.mjs` (in the game: hero and camera placed at spots,
flags, js, screenshot), `bench6.mjs`, `cellprobe.mjs`, `serve.sh`.
- **Build**: `npx vite build --logLevel error` clean after every change (last after the final edits).
- **shallowtele** (q1 and q0, after the final edits): `{"tele":45.3,"pool":45.1,"cradle":34.6,"tones":94.1,"pass":true}`,
  q0 `{"tele":45,"pool":43.5,"cradle":35.1,"tones":95,"pass":true}` (`b2b/st2/shallowtele-0.png`).
- **Existing scenarios** touching my files (the town's ground takes the vertex G_AUR; the Field the rubble): `panels` "ok",
  `combat` ok (17 kills, loot), `cast4` ok (all eleven Act IV kinds) — `b2b/reg/`. The long Act I-IV routes were not run.
- **perf5** (`BASE=http://localhost:5327/ node tools/scenario.mjs perf5 b2b/perf5c`, the final code, 5 cycles, each
  zone's packs loaded before it is entered): **pass**. Ratios to the Field drawn beside it, per cycle, and the median:

  | | q1 ratios | q1 verdict | q0 ratios | q0 verdict | ms (median, swiftshader) q1 / q0 | calls, tris q1 |
  |---|---|---|---|---|---|---|
  | Field camp | | | | | 975 / 276 | 139, 598k |
  | coast Shallows h 1.2 | 1.37 0.90 0.52 1.01 1.21 | **1.009** | 0.86 0.90 0.74 1.12 1.08 | 0.897, floor ok | 848 / 246 | 60, 212k |
  | farlight mid Ice Road | 1.71 0.90 0.55 0.91 0.73 | **0.898** | 0.73 0.61 0.93 0.67 1.02 | 0.728, floor ok | 757 / 204 | 68, 131k |

  The game's own logic per frame is 0.6-1.6 ms in every zone. Only this run is valid: my earlier runs of the rewrite
  (`perf3`, `perf5a`, `perf5b`) entered the Act V zones without waiting for the rime pack, so they measured the fallback
  layers (coast 0.84-0.96 / 0.61, farlight 0.85-0.90 / 0.61). The coast spot's cost
  at q1, by layer (`gablate.mjs coast 1 3`, share of a frame saved when hidden): ground 43%, instances 25%, sea 18%,
  props and people 11%, ice 8%, shadow pass 2%.
- **Screens** (`b2b/look/`, q2 desktop unless named `p`): before: `f1-*` (farlight squares), `c1-*`; after: `f3-road`,
  `f6-marker` (sealed hole), `f7-drowned`, `f7p-*` (q1 phone), `c5-fall*` (the Frozen Fall), `c4-island`, `c8-light0`,
  `c10-water` and `c10-wreck1` (shore jitter, the aurora in the water), `c3-campLit`, `c4-beam`, `f4-farLight` (cairns
  lit, true aurora), `f4-hole1lamps`, `fx1-prints`, `fx4-smoke`.

## Stubbed or left for stage C
- Beams in play: `setBeam` works (tested by hand, `c4-beam.png`); light.js `addBeam` must create/aim them and set
  `uLights`/`uBeam`; the sea-lights' and lamps' light pools are light.js's.
- `FX.chill` (breath thickness) is cold.js's to write; `splash`, `iceShards`, `freezeCrystals` wait for their callers
  (tide, ice, combat, the seal run).
- The frost overlay itself (hud.js / style.css) is story's: it takes `frostImage()` and `frostVignette(COLD.v)`.

## Changes in files I do not own
- None in this task. (B2a's: `src/game/actors.js:80` blob shadows renderOrder 1.5, reported there.)

## Open problems and requests
- **Light pools on snow** (light.js, combat): `addLightPool` at intensity 22 burns the white snow into large white discs
  with bright rims (`c3-campLit.png`); the hearth's and lamps' fires barely read inside them. Suggest a lower intensity or
  a warmer, rimless pool in Act V zones.
- **Drowned lanterns** (gen5, world): `glow` lies straight under the window; seen at the play pitch its light appears
  ~2 m toward the camera. I draw it at 0.45 of its depth; placing the lantern ~1 m north of the window centre would let
  the full parallax stay.
- **gen5** puts an ice window's boundary corners at -2.2 (the pit): my ground and ice work round it (`winC`); a fix
  there would let the workarounds go.
- `TICKS` (sea.js) keeps a disposed zone's beams until their `setBeam(null)`: a handful of objects per zone rebuild.
- The coast's cliff tops (land to rock) still follow the cells, less visibly than the shore did.
- **The coast's margin is thin**: its median is 1.01 of the Field, but 2 of 5 cycles were over 1.15 (noise: ±30% per
  sample under swiftshader on 4 shared CPUs). Its ground is 43% of the frame; if a real phone disagrees, the first cuts
  at q1 are the snow's drift read and the glint (ground), then the light paths (water). perf5 needs a dev server
  (`window.__act5.tide` exists only in DEV) and takes about 25 minutes.

## Progress notes (as written during the run)
- 23:14 resumed after the second restart (build5.js, fx.js, atmos.js, perf5 + shallowtele on disk). Old perf5 runs:
  coast 1.016/farlight 1.159 and coast 1.289/farlight 0.93, both failing; profile (farlight q1): ice 38%, sea 33%,
  shadow pass 27%, batches 24%, ground 22% of a frame each.
- 23:35 the old perf5 ran on a production build (the tide force never applied). 23:40 the rAF interval swings tenfold;
  a drawn-and-waited frame is steadier; the game's own JS is 1-6 ms a frame.
- 23:50 perf5 rewritten; first run q1: coast 0.835, farlight 0.852 (later found: without the rime pack loaded).
- 00:00-00:40 the look work above, then perf5 (7 cycles, q1): coast ratios 1.31 0.87 0.96 1.10 0.87 1.25 0.83, median
  0.96; farlight 2.0 (a build ran beside it) 1.01 0.90 1.26 0.82 0.64 0.84, median 0.90: pass. Then the vertex aurora,
  the vertex G_AUR and the shore jitter; perf5 now waits for each zone's packs (`zoneReady`); the run above (01:07).
- 01:15 regression (panels, combat, cast4) and shallowtele after the final edits: all pass. Private server stopped.
