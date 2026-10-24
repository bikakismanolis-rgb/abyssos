# B1a: plumbing and generation (world, stage B)

Root: /home/user/abyssos/skotos. Nothing committed (the lead's checkpoint 8c1c788 already holds most of this; the
working tree adds the last gen5 spur fix, the world.js `crew()` guard, the parity REF and the Neck's faster carve).

## What I built

**src/world/genlib.js** (new, 65 lines): BED_DRY 9.0, ICE_Y 0.02, reach, nearReach, circleCells, mark, snap, terrain,
groundY (ice rule: L.ice/thick/window cells return ICE_Y), TIDE_STEP 0.15, wetAt(bed, h) (0 dry, 1 shallow, 2 deep, in
whole steps). gen4.js imports them and re-exports reach/nearReach/groundY.

**src/world/gen4.js**: the Anvil's Neck. genAshfield calls `neck(L, seed, trySeed)` after tryAshfield accepts; own RNG
`seed ^ 0xC0A57`, so the Field before it is untouched. A 4-wide plug of rubble in the plaza's east rim (rows 28-32,
meets the rim at 100-130 deg), a notch through what rock is left, leg 1 east with a wobble, leg 2 north to row 3 (last 6
rows straight). Through rock only, out of the Lantern Graves' keep-out, inside the edge. carve(): paint, heights
re-laid and blended over a 2-cell band, L.dist updated, dressing in the band dropped (NECK_DRESS radii), its own
ashRock/ashTree/ashTuft (`neck: true`). L.neck = { cells, plug, x, z, r }; exit { x, z: 3, to: 'coast', label:
'exit.coast', locked: 'coal' }. ashRise hoisted to module level (same closure). Last change: the BFS stops at 4 and
only band corners are visited (output byte-identical over 200 seeds; the Neck's share of genAshfield 19% -> 7%).

**src/world/gen5.js** (new, ~1130 lines): genCoast(seed, { frozen }) 120x200 and genFarlight(seed) 112x208 with every
contract L field (cells, paint, low, hgt, bed, ice, thick, window, sea, deck, props, lights, packs, spots, exits, start,
boss, spine/road, holes, leads, ...). 24 tries at seed + k*7919, the last accepted; REJECT counts reasons. Coast: the
Neck's mouth and overlook, the Landing (hearth, waypoint, jetty, bell, boats, huts, racks, folk spots), three sea-lights
with windows, the Shallows and causeway with tide beds in 0.15 steps, the Graveyard (dry hold first), Dalaro bar and
hull, two ebb caves, tide-locked islets, the fjord and the Fall, the whale and the den, Skerry Bay (bowl, rim, spine,
islets, skerry, ice road), exits. freezeBay() is the frozen reading of the same accepted layout. Farlight: frame, entry
passage, the ship camp, the winding road with poles, three leads (per-lead masks) with holes and lamps at 120 deg, the
hook tongue, the arena (core, ring, cross, rim, Selna pad, fire pads, hands, casks, the Farthest Light and its door),
drowned lights, bergs, chest islets, maw holes, packs. Exports also tidal, inBay, walkAt, firm, refugeNear, spineWhole,
rimWhole, sealedCells, coastFaults, farlightFaults. The header lists the L.props vocabulary build5.js must draw.

**src/world/map.js**: close(cells, low = true) (one ver++/flow reset per batch); stepToward/fillWindow take a `mask`.

**src/game/tide.js, src/game/ice.js** (new, minimal): TIDE/ICE, resetTide(z) (clock to low water, tidal cells to the
h = 0 grid in one batch), resetIce(z) (broken cells healed, loads cleared), tickTide/tickIce empty.

**src/game/world.js**: ZONES coast (level 28, pack rime, light 'sea', ring 4) and farlight (level 31); ashfield/forge
`light: 'ember', ring: 6`; READY.rime; zonePacks; zoneFolk (farlight folk + grove while q >= 29 && !seaLit; frost in
town and the Field); difficulty-keyed seeds ('coast@' + diff); createZone dispatch + act5Layout (sealed leads to thick,
skerry open while the Tower walks); z.mode with coastMode()/skyMode() and a fresh rebuild when stale; exported
disposeZone; act5Zone / act5Enter / act5Presence / act5Tick (boats ride TIDE.h; farlight gust clock 8 s every 40 s, 20 s
at the last hole, 'gustWarn'/'gust'); light5 pools; FAR_BEACONS 4-6, farFire o.flash, townFires lit[3..6]; act4Zone
openNeck (plug rubble prop until F.newFire); first-boss 'tower', champion 'sunken'; why-map coal/frozen; ECHO_PROMPT
tower/skotos; updateAct4 -> updateAct; `crew()` guard (a creature set the build does not list yet counts 0).

**src/game/boot.js**: ?auto=coast|farlight with &quest=N and &flags=a,b (farlight sets frozen); migration
`hero.act5 ??= -1` (+ flags.act5); diffChanged disposes every zone but town. **state.js**: newHero act5: -1.
**data.js**: DIFFS sixth 'skotos' (unlock 'act5:ash'), nightmare 'any:hero', ash 'any:nightmare'; HAZ5 (6 rows).
**panels.js**: waypoints coast/farlight with wp.<id> sub-lines; diffUnlocked reads 'any:<diff>' over every act and
'actN:<diff>'; the locked toast picks pick.locked / pick.locked5.

**tools/check-act5.mjs** (new): 300 seeds, coast / frozen / farlight / Field hard checks and soft oddities, timings,
mean tries, reject reasons, exit 1 on any hard failure. **tools/parity-ashfield.mjs** (new): genAshfield at REF
(default f932304) vs the tree, every difference outside the Neck's 2-cell band, exit 1 on any.

## How I tested it

- `npx vite build --logLevel error --outDir <scratch>/b1a/dist`: passes (after the last edit).
- `node tools/check-act5.mjs`: 300 seeds, hard failures none; coast 124 ms (1.12 tries), farlight 94 ms (1.00), field
  88 ms (loaded machine, load ~15); rejects huts 46, pocket 21, islets 11, light.wreck 2; oddities coast.racks!=2 20,
  far.poles<12 38, coast.noLiceHull 3. Output: scratchpad/act5/b/b1a/check5.txt.
- `node tools/parity-ashfield.mjs`: 2000 seeds vs f932304, all with the Neck, 160 cells opened, 8.4 props dropped, 26.2
  added per seed, differences outside the corridor none (b1a/parity.txt); 400 seeds again after the carve speed-up: none.
- `node tools/check-act4.mjs`: 2000 seeds, hard failures none (oddities ash.lampSpacing 3, forge.noCrane 2, as before).
- Browser probes (scratch play5.mjs/flow5.mjs on :5199): coast at low tide (interacts, 3 sea-lights, hearth, 4
  name-stones, waypoint gated), frozen coast (ice road walkable, no iceShut voice), farlight (black sky, three leads,
  gust), the Field with newFire (plug open, exits forge/town/coast); seeds 'coast@1', 'farlight@1', 'coast@3'; cached
  zone reused, rebuilt when the mode changes; arrivals on walkable cells; diffChanged leaves only town (b1a/flow5.txt,
  p-*.txt).
- Scenarios: panels ok (waypoints with six difficulties, Σκότος locked: b1a/scen/panels-4.png). The Act IV ones were
  re-run against a private no-HMR server on :5298 (other roles' edits made the shared server reload pages mid-run):
  ashfield, ivar (re-run alone after a browser crash under load: b1a/scen2/ivar2.txt), ending4 (far fires 4 after
  newFire), echo4, boons, forge, karthax, cast4 all ok, no page errors (b1a/scen2/summary.txt and *.png).
- Maps and shots: b1a/coast-5-low.png, coast-5-high.png, coast-5-frozen.png, farlight-5.png, farlight-5-sealed.png
  (layout maps), coast-start.png, coast-frozen.png, farlight-start.png, field-neck.png (in game).
- World viewer: B2's layout5 already builds ?world=coast / ?world=farlight from gen5 (genCoast(seed, { frozen }) /
  genFarlight(seed)); no generator entry was needed.

## Stubbed or left for stage C (or B1b)

- tide.js / ice.js clocks (tickTide, tickIce, steps, bell, lanes, wash, inWater, load, stages, plunge, crack texture,
  floes) and their call sites in combat's files (updateAreas, player.js inWater/path, moveMul): B1b.
- light.js: not touched. ZONES carry light/ring per zone (ember for ashfield/forge, sea for coast); light.js must read
  them (lightOn, LIGHT.base, the Shroud only where light === 'ember'), the sea-light beams and warmth: combat, C.
- PACKS tags for Act V (sunkenCrew, tideChoir, hullSwarm, reefRocks, strandBear, fallHunters, skuaFlock, ...) do not
  exist yet: packs fall back to the default kind until combat adds them. MONSTERS tower/skotos absent, so no bossSpot.
- Presence (who stands where), npcs, story catch-ups, z.seal hook, diff.ash.d rewording: story, C.
- The L.props vocabulary in gen5.js's header must be drawn by build5.js's act5Prop (B2).

## Changes in files I do not own

- tools/check-act4.mjs (no owner): the coast exit's reach is tested with L.neck.plug opened.
- src/game/story.js (story, stage C, not running): one line, auto-discovery skips the coast until F.hearth.
- src/i18n/text.js (story, C): pick.locked reworded, pick.locked5, diff.skotos(.d), and the Act V block (zone.coast(.s),
  zone.farlight(.s), exit.coast/farlight/shore, wp.coast/farlight, d.coastShut, d.iceShut, sealight/hearth/stone/
  cairn/farLight .light, farLight.climb, echo.tower, echo.skotos). Story may reword any of them.
- src/game/data.js beyond ZONES/DIFFS (combat, C): HAZ5, a new per-difficulty table with six rows.
- src/ui/panels.js beyond diffUnlocked/waypoints: the locked toast's key choice (one line).

## Open problems

- The bay's bowl reads flooded at the zone's high water: the global water level (uLevel) is not masked over Skerry Bay
  (L.boss.r + 4), where the tide must not reach. sea.js / tide.js need that mask (B2 / B1b).
- Deck cells keep a flat bed instead of the contract's -0.6 (they are never tidal; say if the value matters to sea.js).
- The frozen reading also freezes the sea north of the bay's mouth (thin ice, |x - C.x| < 24, z < C.z - 16) so the ice
  road meets ice, not open water; check against the design's picture of the frozen bay.
- Soft oddities left: farlight poles < 12 on 13% of seeds (the road is short there), coast racks != 2 on 7%.
- Generation is once per zone entry: coast ~60-120 ms, farlight ~50-95 ms on this loaded machine (expect 2-3x on a
  phone); acceptable behind the fade, worth a look if entries stutter.
