# Skotos Act V: code contract

The design is `docs/act5-design.md`; the briefs it was built from are in `docs/act5-briefs/` (canon.md, engine.md, assets.md/json). This file fixes the owner's decisions, the lead decisions, the build stages and their gates, the shared names, file ownership and the expected assets. Where this file and the design disagree, this file wins. Where the design and the shipped code disagree, the code is the truth: follow the code, and write the difference down in your report.

Repo: `/home/user/abyssos/skotos`. The repository root (Abyssos, everything outside `skotos/`) is a different game: never read or touch it. Dev server: `http://localhost:5199` (shared by everyone; if it does not answer, start it detached with `cd /home/user/abyssos/skotos && (setsid nohup npx vite --port 5199 --strictPort > /tmp/claude-0/vite.log 2>&1 &)`; never kill it). For a private server use another port and `BASE=http://localhost:<port>/` with the tools. Build check: `npx vite build --logLevel error`. Artifact check: `npm run build:artifact` (every file in `artifact/assets/` under 16 MB). Scenarios: `node tools/scenario.mjs <name> <outdir>`.

## The owner's decisions (9 October 2026)

1. **Build the whole base design** as written: both zones (coast read two ways: tidal, then the frozen bay), 7 enemy entries (8 kinds), both bosses, the three mechanics, the world-state chain, the four coast Name-stones, three blessings, five themes, both echoes and the two boss legendaries.
2. **Difficulties, all three in:**
   - **Unlocks from any act** (design, Difficulty): `diffUnlocked` reads every `h['act' + n]`; pick.locked reworded.
   - **A fresh coast per difficulty:** the Act V seeds are keyed by difficulty (`coast@<diff>`, `farlight@<diff>`); layout only, the hero's story state is one for all difficulties. `diffChanged` (boot.js:172) disposes the zones it drops (`disposeZone`) instead of deleting them.
   - **The sixth difficulty «Σκότος» / "Skotos"** is in (it was stretch): `{ id: 'skotos', hp: 11, dmg: 5.4, xp: 6.5, gold: 5.4, loot: 4.6, elite: 2.1, leg: 4.6, color: '#4a5aa0', unlock: 'act5:ash' }`, diff.skotos «Σκότος» / "Skotos", diff.skotos.d «Εδώ ξεχνιούνται και οι ήρωες.» / "Here even heroes are forgotten." It unlocks when Act V is finished on Ash. The design's difficulty table already carries its column. Every per-difficulty table in the code (DIFFS consumers, hazard tables, scaling arrays, the waypoints chips, saves with `h.diff` up to 5, anything indexed by difficulty) must accept index 5; old saves are unaffected.
3. **English name of the fourth people: "Saltborn"** (Greek «Αλιγενείς»).
4. **Brokka and Elati come to the Skotos fight** (it was optional): in phase 3, when the keepers walk on with their lamps, Brokka carries Deepstone's fire and Elati the beacon-tree's, and each sets it to the Farthest Light with the keepers. **Lead decision on how:** they are NOT rebuilt into the frost set. They reuse the shipped people sets: Brokka from `folk` (folk.glb), Elati from `grove` (grove.glb), loaded by `farlight` only once the hero has reached q29 (`READY` for farlight gains `['folk', 'grove']` lazily at that point; a first trip already loads them through the Field). Their stand-ins are the boot-loaded people.glb 'smith' and 'ranger'. They are counted in `perf5` and in the memory report. New lines d.brokka.v3+, d.elati.v3+ (with `.r` for the Ranger), short, in the act's voice; they arrive with the keepers, they are not fighters (no hp, no AI beyond walkTo and a pose), and they go home after the act (their home lines change to match).
5. **Still out (stretch):** the coast's full frozen reading, the spring reading with `iceOut`, floes and the boat, the frozen sea's four Name-stones, the two extra legendaries, a Floe Run, ice tiers in the Shadow Gates, orca and gull ambience, the Rime Troll.
6. **Quality bar.** The owner wants to be impressed: graphics, story, movement, gameplay, involvement, replayability. Take the time it needs. Correctness first, then the look.

## Lead decisions

- **Names.** «Πράξη V: Η Παγωμένη Ακτή» / "Act V: The Frozen Coast". Zones `coast` «Η Παγωμένη Ακτή» / "The Frozen Coast" (level 28) and `farlight` «Ο Έσχατος Φάρος» / "The Farthest Light" (level 31). The pack is **`rime`** (`src/assets/rime.glb` + `src/assets/rime/*.webp`), the people set is **`frost`** (`src/assets/frost.glb`, `loadFolk('frost')`), the creature group is **`act5`** (`ACT_FILES.act5`).
- **Canon.** Everything in the design's Story section, plus what the game already says (`src/i18n/text.js`, and `docs/act5-briefs/canon.md`). The hero never speaks: everything the hero "says" is second-person narration. The word «Σκότος» is first said in the rite at the Landing. Isarn and Ivar stay dead.
- **Old saves.** A hero without the new fields reads as the Act IV end state: `h.act5` defaults to −1 (migrate like h.act4), questText clamps at 31, the bare `else` in `actComplete` no longer means Act IV.
- **Stand-ins everywhere.** A missing or failed asset never breaks the game: every STAND_IN chain ends in a boot-loaded or code-built model, and `cast5` covers it in a cold session.
- **Text.** Every new line in Greek and English in `src/i18n/text.js`, Greek first, in the style of the canon brief §5 (short, plain, poetic; quests are imperatives; memories in the present tense). Keep the existing typography of the file.
- **Code.** Match the surrounding code: its density, naming, comment style. No model names in code, comments or commits. Do not reformat files you do not own.
- **Never commit or push.** The lead commits between stages. Never `git checkout`/`reset`/`stash` files: other agents are working in the same tree.
- **Third-party assets.** CC0, CC-BY 4.0 or CC-BY 3.0 only, with clean provenance (no rips, no paid-pack re-uploads, no fan art of other IP), credited in `CREDITS.txt`, `src/ui/credits.js` and the pack's or folder's CREDITS.txt. Sources are downloaded to `/tmp/claude-0/sf/act5` (Sketchfab) and `/tmp/claude-0/ph` (Poly Haven, ambientCG), never into the repo.
- **The memory and frame budget** is the design's: ≤ 9 MB raw and ≤ 110 MB phone GPU for the act, measured, not estimated, before the bosses are built.

## Stages and gates

| stage | who | what | gate to pass before the next stage |
|---|---|---|---|
| A. Assets | asset workflow | downloaders, provenance and look gates, the frost set (first), the rime pack, the act5 creatures, credits | G1: crab and Skotos provenance and look gates passed or replaced; G2: frost set ≤ 25 measured textures; every asset in the viewer with its clips |
| B. Foundation | world (B1), sea (B2) | plumbing, the Field corridor, genlib/gen5, check-act5, GridMap.close, tide.js, ice.js, sea.js and its quality-0 paths, build5 props, atmospheres and FX, world.js wiring | G3: check-act5 and check-act4 (parity) clean over their seed sweeps; `perf5` within the Field of Ash + 15% at quality 1 under mobile emulation; every existing scenario still passes |
| C. Act | combat, story | Cold, beams, lamps, oil; the AIs and traits; the enemies; both bosses; story quests 24-31, text, HUD, panels, audio, difficulties, the cameo; the Act V scenarios | G4: every Act V scenario and every existing scenario passes; the measured memory report is within budget |
| D. Review | review workflow | adversarial review rounds, fixes, the full regression, the strict-CSP artifact check on desktop and mobile, publish | G5: the last review round finds nothing new; the artifact is published to the same URL |

Stages A and B run at the same time. Stage C starts when B's gate passes; it uses the real assets where they exist and the stand-ins where they do not.

## File ownership (edit only your own files in your stage)

| owner | stage | files |
|---|---|---|
| assets | A | `tools/creatures/act5/**` (new), `tools/creatures/act2/folk.mjs` (the `frost` set only), `tools/pack-rime.mjs` (new), `tools/fetch-act5.mjs` (new), `src/assets/frost.glb`, `src/assets/rime.glb`, `src/assets/rime/**`, `src/assets/creatures/{crab,skotos,tentacle,icemaw,louse,skua}.glb`, `src/gfx/creatures.js` (CAST and ACT_FILES entries only), `src/gfx/people.js` (the set entry only), `src/debug/creatureview.js` and the people part of `src/debug/viewer.js`, `CREDITS.txt`, `src/ui/credits.js`, `tools/creatures/README.md` |
| world (B1) | B | `src/world/genlib.js` (new), `src/world/gen4.js` (the corridor and the move to genlib only), `src/world/gen5.js` (new), `src/world/map.js`, `src/game/tide.js` (new), `src/game/ice.js` (new), `src/game/world.js`, `src/game/state.js`, `src/game/boot.js` (plumbing and the migration only), `src/ui/panels.js` (diffUnlocked and the waypoints only), `src/game/data.js` (ZONES-related and DIFFS only), `tools/check-act5.mjs` (new), a parity script under `tools/` |
| sea (B2) | B | `src/world/sea.js` (new), `src/world/build5.js` (new), `src/world/build.js`, `src/world/atmos.js`, `src/gfx/fx.js`, `src/gfx/env.js`, `src/gfx/gfx.js`, `src/gfx/textures.js`, the world part of `src/debug/viewer.js`, `tools/scenario.mjs` (only the new `perf5` and `shallowtele` scenarios, appended) |
| combat | C | `src/game/data.js` (beyond B1's part), `src/game/ai.js`, `src/game/actors.js`, `src/game/combat.js`, `src/game/player.js`, `src/game/projectiles.js`, `src/game/skills.js`, `src/game/stats.js`, `src/game/items.js`, `src/game/light.js`, `src/game/sap.js`, `src/game/cold.js` (new), `src/game/tide.js` and `src/game/ice.js` (gameplay hooks, after B), `src/gfx/models.js`, `src/gfx/creatures.js` (beyond the asset entries), `src/gfx/people.js` (beyond the set entry) |
| story | C | `src/game/story.js`, `src/i18n/text.js`, `src/audio/audio.js`, `src/ui/panels.js`, `src/ui/hud.js`, `src/ui/overlay.js`, `src/ui/screens.js`, `src/ui/style.css`, `src/game/boot.js`, `src/game/state.js`, `src/game/world.js` (presence, npcs, catch-ups; after B), `tools/scenario.mjs` (the Act V story scenarios), `README.md` |

If you need a change in a file you do not own, make the smallest change that unblocks you only when the file's owner is not running in your stage; otherwise write the request in your report and work around it with a stub in your own file.

## Shared names

These names bind every stage. Line numbers cite the code at f932304 (unchanged since 96c145b). «lead pick» marks a name or value this contract chooses where the design leaves it open or contradicts itself; it wins over the design. "exists" means the name is shipped and only gains what is written here.

### Zones and exits

**ZONES** (world.js:31):

| zone | entry |
|---|---|
| coast | `{ level: 28, music: 'coast', ambient: 'coast', atmos: 'coast', act: 5, pack: 'rime', light: 'sea', ring: 4 }` |
| farlight | `{ level: 31, music: 'farlight', ambient: 'farlight', atmos: 'farlight', act: 5, pack: 'rime', light: 'sea', ring: 4 }` |
| ashfield, forge (exist, :42-43) | gain `light: 'ember', ring: 6` |

- **Loading.** `READY.rime = { folk: ['frost'], creatures: 'act5' }` (world.js:61); `zonePacks` (:62) gives `['rime']`. For `farlight`, `zoneReady`/`zoneParts` add `'folk'` and `'grove'` while `G.hero.quest >= 29 && !flags.seaLit` (the cameo) «lead pick: the window». Ad hoc `loadFolk('frost')`: town from the hook on (a hero at q23 with `newFire` and `h.act4 >= 0`, and whenever `flags.alkyone` is set: Alkyone, then the q30 child and his bark); the Field while `flags.coal && !flags.coastSeen` (Alkyone at the Anvil Gate).
- **Seeds.** `seedFor` (world.js:72) keys the two Act V zones by difficulty: `h.seeds['coast@' + h.diff]`, `h.seeds['farlight@' + h.diff]` (`h.diff` is the DIFFS index 0-5, so `coast@3`). Every other zone keeps its bare key. `h.wps` keeps the bare ids `'coast'`, `'farlight'` (there '@' means a second waypoint, as `ashfield@2`). `diffChanged` (boot.js:172) calls `disposeZone(z)` (world.js:236, now exported) on each zone it drops.
- **Cached zones.** `createZone` stores `z.mode`; `enterZone` (world.js:187) passes `fresh: true` for `coast` when `coastMode() !== z.mode` and for `farlight` when `skyMode() !== z.mode`. Exported from world.js: `coastMode()` → `'tide' | 'frozen'` (stretch: `'spring'`), `skyMode()` → `'green' | 'black' | 'true'`; and `act5Zone(z)`, `act5Enter(z)`, `act5Presence(z)` (the trio at world.js:582-709). `updateAct4` (:956, called at boot.js:269) becomes `updateAct(dt)` «lead pick» and also ticks the seal run `z.seal` (the `z.run` bellows pattern, :783-851) «lead pick: the seal controller lives in world.js».

**Atmospheres, ambients, music by state** (chosen in `act5Enter`, as `act4Enter` chooses ashfieldDawn):

| zone, state | ATMOS (atmos.js) | FX ambient | music |
|---|---|---|---|
| coast, `!frozen` | `coast`; `coastCine` during the arrival cine | `coast` | `coast` |
| coast, `frozen && !seaLit` | `coastFrozen` | `coastFrozen` | `coast` (MOOD.sky 1) |
| coast, `seaLit` | `coastAurora` «lead pick: ATMOS.coast with aur 1» | `coast` | `coast` (MOOD.sky 2) |
| farlight, `!seaLit` | `farlight`; in the Skotos fight `farlightFight` «lead pick: farlight with zoom 1.25» (phases 1, 3) and `farlightNight` (phase 2, zoom 1.25) | `farlight`; `blizzard` during gusts and the Night | `farlight`; `skotos` in the fight |
| farlight, `seaLit` | `farlightAurora` | `farlight` | `farlight` (MOOD.sky 2) |
| town, `seaLit` | `townAurora` | `town` | `town` |

ATMOS entries gain numbers `aur`, `aurDark` (gfx.js `setAtmosphere` writes them to `SEA.uAur`/`SEA.uAurDark`) and `drift` (0-1, the green drift of the hemisphere light) «lead pick: the keys»; missing keys read 0. `mixAtmos` (world.js:529) moves to atmos.js and is exported there; world.js imports it «lead pick».

**Exits** (`{ x, z, to, label, locked }`):
- **The Anvil's Neck** (Field of Ash): `{ x: min(w − 8, GP.x + 26), z: 3, to: 'coast', label: 'exit.coast', locked: 'coal' }` «lead pick: `coal`, as the beats, the world-state and the catch-up table say; the Zones section's `coastCall` is overruled». Pushed to `L.exits` only after `tryAshfield` returns. The mouth's four rubble cells (`L.neck.plug`) open with `map.open` in `act4Zone` and `act4Enter` whenever `flags.newFire`. World.js `why` map (:355) gains `coal: 'd.coastShut'`, `frozen: 'd.iceShut'`.
- **coast → ashfield:** `{ x: 52 ± 10, z: h − 5, to: 'ashfield', label: 'exit.ashfield' }` (key exists, text.js:425).
- **coast → farlight:** on Skerry Bay's north rim, `{ x, z: 3, to: 'farlight', label: 'exit.farlight', locked: 'frozen' }`. Before `frozen` the rim is open water and d.iceShut is a place voice at `L.spots.iceShut` (`z.voices`, r 4) «lead pick».
- **farlight → coast:** `{ x, z: h − 5, to: 'coast', label: 'exit.shore' }` «lead pick: new key `exit.shore` «Στην Ακτή» / "To the Coast"; `exit.coast` names the Neck».
- **Waypoints:** `coast` (the Landing) and `farlight` (the Icebound Ship), appended to the list at panels.js:163; their sub-line is `wp.coast`/`wp.farlight` (as `wp.graves` for ashfield@2) «lead pick». story.js:125's auto-discovery skips `coast` until `flags.hearth`; lighting the hearth adds it «lead pick». `farlight` is discovered on arrival. Respawn checkpoints (`z.checkpoint`): lit sea-lights, the Tower's island, sealed holes.
- **World lists:** the first-boss list (world.js:257) gains `tower` (+2; `skotos` gets +3); the champion stand-in (:286) for coast and farlight is `sunken`; `ECHO_PROMPT` (:458) gains `tower: 'echo.tower', skotos: 'echo.skotos'`.
- **FAR_BEACONS** (world.js:49) gains indices 4-6: `{ dx: −18, dz: −78, y: 8, color: 0xf0f4ff, sea: true, seed: true }`, `{ dx: 20, dz: −80, y: 7, sea: true, seed: true }`, `{ dx: 34, dz: −76, y: 6, sea: true, seed: true }`. `farFire(p, color, o)` (:51) gains `o.flash` (period, 12 s for `sea` fires) «lead pick». `townFires` (:1003): `lit[3] = newFire && !(coastCall && !seaLit)`, `lit[4..6] = seaLit`.

### The level object L (gen5.js)

**genlib.js** takes from gen4.js, unchanged, and gen4 re-imports: `reach` (gen4.js:18), `nearReach` (:29), `terrain` (:101), `groundY` (:118), and `circleCells`, `mark`, `snap` (:37, :43, :59) «lead pick: these three move too». New there: `BED_DRY = 9.0`, `ICE_Y = 0.02` «lead pick: the name». `groundY` returns `ICE_Y` on every `L.ice`, `L.thick` and `L.window` cell.

**`genCoast(seed, { frozen })`** and **`genFarlight(seed)`**: 24 tries at seed + k·7919, the last accepted (gen4.js:149).

| field | type | meaning |
|---|---|---|
| `L.type` | `'coast'` \| `'farlight'` | |
| `L.w`, `L.h` | | coast 120 × 200, farlight 112 × 208; north is z 0 |
| `L.mode` | coast: `'tide'` \| `'frozen'` | the reading built (`o.frozen`) «lead pick» |
| `L.tries` | number | tries used, for check-act5's mean «lead pick» |
| `L.low` | Uint8 w·h | always allocated: water and broken ice close as low |
| `L.bed` | Float32 w·h, coast only | bed in metres, quantised to 0.15; `BED_DRY` dry land; −0.6 open sea. Ice, thick, window and deck cells carry −0.6 for the water's colour; tide.js ignores them «lead pick» |
| `L.vbed` | Float32 (w+1)·(h+1), coast only | «lead pick» each corner's mean bed: the `aBed` attribute of the water and ground meshes |
| `L.sea` | Uint8 w·h | «lead pick» open water no tide drives: farlight's leads, holes, ice edge and sea; the coast's Icemaw holes. buildLevel's hook reads `L.bed \|\| L.sea` |
| `L.ice` | Uint8 | thin ice |
| `L.thick` | Uint8 | thick ice: walkable, never cracks |
| `L.window` | Uint8 | ice-window cells: thick, walkable, drawn transparent over an `L.hgt` −2.2 pit |
| `L.deck` | Uint8, coast | jetty planks, always floor (gen3.js:119 pattern) |
| `L.tideLocked` | array of spot objects | spots reachable only at low water; each also carries `tideLocked: true` (the ebb hoards in `spots.chests`, the tide-locked Name-stone) «lead pick: a list, not a mask» |
| `L.refuges` | `[{ x, z, r, skerry: true, light? }]` | every always-dry islet of 3 × 3 or more: the Shallows' four, the Grey Light's (`light: 'grey'`), the bay's three. The `skerry` marker check-act5 reads «lead pick» |
| `L.spines` | `[{ id, from: {x,z}, to: {x,z} }]` | thick paths that must be continuous: coast `'wreck'`, `'fall'`, `'bayRoad'` (frozen only); farlight `'road'` (camp to arena rim; the leads are gaps until sealed) «lead pick» |
| `L.rims` | `[{ id: 'bay' \| 'arena', x, z, r0, r1 }]` | thick rings that must be unbroken «lead pick» |
| `L.boss` | `{ x, z, r }` | coast: Skerry Bay (60 ± 8, 30 ± 3), r 18; farlight: the Light's Skerry (56 ± 6, 28 ± 2), r 16 |
| `L.hgt` | as gen4 | cliffs 8 + 10·fbm; sea −1.5 to −4.5 (farlight −2.5); flats, thick ice, the skerry 0; under thin ice −2; window pits −2.2; bergs 6-14; the skerry's rock rim +3 |

Cells at build: floor = land, tidal cells shallow at h 0, thin, thick, window, deck; solid and low = water 0.45 m deep or more at h 0, open sea, leads, holes; solid = cliffs, blocked footprints, the sleeping skerry.

**Coast spots** (`L.spots`):

| spot | shape | what |
|---|---|---|
| `camp` | {x,z} | the Landing (30 ± 6, 136 ± 6), cove r 13, all `BED_DRY` |
| `hearth`, `waypoint`, `bell` | {x,z} | the hearth (interact); the waypoint beside it (inert until `hearth`); the tide-bell post |
| `huts` | [{x,z,r,kind: 'shack' \| 'stilt'}] 5-7 | |
| `racks`, `boats` | [{x,z,r}] ×2, ×3 | drying racks; keel-boats drawn up |
| `npcs` | `{ alkyone, tamarisk, glaukos, shore: [{x,z,r} ×3], rock }` | `rock`: the bay's shore rock (Alkyone in q27 and the Freeze; the echo's oil brazier) |
| `overlook` | {x,z,r} | the Neck's mouth, the arrival cine |
| `sealights` | [{ id: 'grey' \| 'wreck' \| 'fall', x, z, r, base: {x,z}, window: {x,z} }] | tower centre; `base` the interact spot (dry or thick); `window` the 2 × 2 ice window at its foot |
| `stones` | [{ id, x, z, r, tideLocked? }] ×4 | Name-stones: `keyx` at the Landing, `thaleia` under the whale's jaw, `sailor` in a Graveyard wreck hold, `carriers` in an ebb cave (the tide-locked one) «lead pick: the design names five places for four stones; the open tide-locked flats are dropped» |
| `chests` | as usual, plus `hoard: true, tideLocked: true` | 2-3 ebb hoards (caves, wreck bellies) |
| `caves` | [{x,z,r}] ×2 | ebb caves, bed 0.3-0.6 |
| `wrecks` | [{ x, z, r, kind: 'dalaro' \| 'keelboat' \| 'rowboat' \| 'broken', tilt, lice, belly? }] | `lice`: a hullSwarm den; `belly`: its walkable floor |
| `casks` | [{x,z}] | whale-oil casks on wrecks and the jetty |
| `whale`, `den`, `fall` | {x,z,r} | the right whale; the Rime Bear's 6 × 6 alcove; the frozen waterfall |
| `roosts` | [{x,z}] | skua perches (the whale, masts) |
| `mawHoles` | [{x,z}] 3-5 | Icemaw holes on the Fall shelf (also in `L.sea`) |
| `skerry` | {x,z,r: 4, cells} | the sleeping Tower: solid until `towerWake`; after its death `map.close(cells, false)` under the island |
| `bayIslets` | [{x,z,r: 3.5, boulder: {x,z}}] ×3 | at r 9 |
| `ribs` | {x,z,r,cells} | the wrecked hull's ribs on one flank (solid) |
| `iceRoad` | {x,z,cells} | the north rim's road, 4 wide: sea before `frozen`, thick after |
| `iceShut` | {x,z} | where d.iceShut is said while `!frozen` |

**Farlight spots**:

| spot | shape | what |
|---|---|---|
| `camp`, `waypoint`, `brazier` | {x,z} | in the Icebound Ship's lee, on thick ice |
| `ship` | {x,z,r,cells} | about 4 × 18 blocked, turned by r |
| `anchor` | {x,z,r} | |
| `npcs` | `{ alkyone, tamarisk, tern, keepers: [{x,z} ×6] }` | at the camp; `tern` at the tower's foot; `keepers` on the core by the door: Alkyone, Tern, Tamarisk, Selna, Brokka, Elati «lead pick» |
| `poles` | [{x,z}] | marker poles every 8 m |
| `holes` | [{ id: 0 \| 1 \| 2, x, z, r: 4.5, lamps: [{x,z} ×3], lead: [[ix,iz]...], tongue: {x,z}, alk: {x,z} }] | south to north (z ≈ 150, 104, 58); `tongue` the thick tongue's lamp pad, `alk` Alkyone's south-rim spot «lead pick: tongue, alk» |
| `drowned` | [{ x, z, glow: {x,y,z}, window: {x,z}, chest: {x,z} }] 3-4 | the Drowned Lights (`glow` feeds `uGlow`) |
| `bergs` | [{x,z,r}] 3-5 | cover and gust lee |
| `chests` | plus `islet: true` | thin-ice islets |
| `mawHoles` | [{x,z}] | |
| `core` | {x,z,r: 6.5} | the skerry |
| `farLight` | {x,z,cells,door: {x,z}} | at (cx, cz + 4.5), 3 × 3 blocked, the door facing north: `door` is the door-stone and the interact spot |
| `selnaPad` | {x,z,r: 1.5} | on the ring's north arm |
| `fires` | [{x,z,r: 2.5}] ×4 | the fire-cairns on the diagonals at r 11 |
| `hands` | [{x,z}] ×6 | Hand spots on the ring |
| `skotos` | {x,z} | (cx, 6), in open water |
| `casks` | [{x,z}] ×4 | on the rim |

`L.packs` entries may carry `burst: 'hull' | 'ice'` «lead pick».

**The Field's corridor** (gen4.js, carved after `tryAshfield` returns, its own RNG seed ^ 0xC0A57): `L.neck = { cells: [[ix,iz]...], plug: [[ix,iz] ×4], x, z }` «lead pick: the name; x, z is the mouth on the plaza rim». The rubble is `act5Prop('rubble')`. The parity script is `tools/parity-ashfield.mjs` «lead pick».

### Map and runtime grids

- **`GridMap.close(cells, low = true)`** (map.js, beside `open` at :28): `cells` as `open` takes them (`[[ix, iz], ...]`); each becomes 0 with `low[i] = low ? 1 : 0` (allocating `this.low` if null); if any changed, `flowT.x = −1` and `ver++` once; returns the count. Act V never calls `setSolid` (:25 resets no flow).
- **`stepToward(P, x, z, tx, tz, out, R = 20, mask = null)`** and **`fillWindow(P, ix, iz, R, mask)`** (map.js:143, :166): `mask` is a Uint8 w·h; a cell with `mask[i] === 0` is a wall for that window, which rebuilds when `P.mask !== mask` as well as on `ver`. The Tower passes `L.thick` in phase 2.
- **`map.ver` rules:** only `open`, `close` (and `setSolid`) bump it. The tide: at most one `close` and one `open` per step (steps 4.5 s apart or more; 1 s apart for 6 s in the Tower's forced flood). The ice: at most one `close` and one `open` per 0.25 s batch. A seal, the plug, the skerry: one batch each. Every batch emits `'mapChanged'`.

**tide.js** (B1; combat adds gameplay hooks in C):

```
z.tide = { h, step, t, phase: 'low' | 'flood' | 'high' | 'ebb', force: null, wet, lane, laneT }
TIDE                       live binding to the current zone's z.tide (null in a zone without L.bed)
TIDE.force = { h, rate }   a boss owns the level (rate m/s, in 0.15 m steps); null: the clock resumes at low water
tickTide(dt)               from projectiles.js updateAreas (:179), before tickIce
resetTide(z)               act5Enter: clock at the start of low water; every tidal cell set by its bed at h = 0, one batch
waterAt(x, z)              'dry' | 'shallow' | 'deep'
wadeAt(x, z)               'tide' | 'brine' | 'slush' | null   «lead pick»: what a.inWater is set to
```

- **The clock** (`HAZ5[diff].tide`): 152 s = low 40, flood 36 (8 × 0.15 m, one each 4.5 s), high 40, ebb 36; on Wanderer 180 s = 50 / 40 / 50 / 40 with steps 5 s apart «lead pick: the split». A tidal cell has `bed < BED_DRY` and is not ice, thick, window or deck. Depth = h − bed: dry ≤ 0 < shallow < 0.45 ≤ deep (closed, low).
- **`inWater`:** player.js and ai.js set `a.inWater = wadeAt(a.x, a.z)` each frame (never for floaters or the airborne). `moveMul` (combat.js:339): ×0.7 hero, ×0.75 monsters, `def.swim` exempt. cold.js reads it.
- **The bell:** `HAZ5.bell` s before the flood and the ebb: sfx `tideBell` and bus `'tideBell'` (the coming phase); bus `'tideTurn'` at each phase start «lead pick: the bus names».
- **The lane:** the cells under the hero and a BFS lane to the nearest cell that stays open are deferred up to 6 s; then the wash-out `pl.pull = { t, t0, sx, sz, x, z, path: [{x,z}...] }` (player.js:76-81 gains `path`, a polyline of the lane's cell centres) with `damage(null, pl, pl.hpMax * HAZ5.wash / 100, { pure: true, wash: true, cold: 20 })`.
- Pickups on a cell turning deep slide to the nearest dry cell. Flood waves spawn from world.js `updatePacks` while `TIDE.h >= 0.75` (one each 25 s, at most 2 alive) «lead pick: where».
- Each frame it writes `SEA.uLevel` (one step ahead of the grid) and `SEA.uWetLevel` (highest h of the last 20 s, decaying 0.05/s).

**ice.js** (B1; combat adds hooks in C):

```
z.ice = { stage: Uint8 w·h, load: Float32 w·h, t: Float32 w·h, warn, tex, dirty, upT, ring, floes }
  stage: 0 intact, 1 hairline, 2 web, 3 crazed, 4 broken (water, closed low), 5 slush   «lead pick: slush is stage 5»
tickIce(dt)                                from updateAreas, after tickTide
resetIce(z)                                act5Enter: stages 4 and 5 back to 0, loads cleared, one open batch
loadAt(x, z, r, amount)
crackAt(x, z, r, stages, o)                o.lamp (default true: nothing inside lampLightAt), o.src
crackLine(x0, z0, x1, z1, w, stages, o)    «lead pick» Earthsplitter, Black Wave, the Black Breath
crackCone(x, z, rot, len, arc, stages, o)  «lead pick» Sweeps, Claw Sweep
breakAt(x, z, r, o)                        «lead pick» straight to stage 4 (Hand Rise, the Skotos's ram)
refreezeAt(x, z, r)                        Frost Nova, beams: stages 1-3 → 0, 4 → 5
freezeCells(cells)                         «lead pick» a seal: the lead becomes thick (L.thick, stage 0, map.open)
iceAt(x, z)                                'land' | 'thick' | 'thin' | 'slush' | 'water'
holeNear(x, z, r)                          the nearest open-water cell centre {x, z} within r, or null
iceWeight(a)                               «lead pick» the load table; def.weight overrides it
```

- One stage per `HAZ5.load` of load; load decays 0.25/s, never below the stage; a stage-3 cell's next stage starts a 0.6 s warning and the break joins the next batch; chains reach stage-3 orthogonal cells 0.3 s later; broken cells turn to slush after 20 s (6 s in lamp light, at once under a beam or a Frost Nova); slush takes no load for 8 s, then becomes stage 1.
- **`tCrack`**: an R8 DataTexture w × h, nearest filtering, one byte per cell equal to the stage (0-5) «lead pick: the encoding». ice.js owns it, sets `SEA.tCrack.value` on entry and uploads it when dirty, at most every 0.1 s.
- **The plunge** resolves in `tickIce`, in the break's own batch, with no tween: the hero is placed on the nearest safe cell (land, thick, thin at stage 0-1) within 3 m back along her approach, else on the oldest point of the 2 s ring buffer; `damage(null, pl, pl.hpMax * HAZ5.plunge / 100, { pure: true, plunge: true, cold: 35 })`, half within 5 s, never below 10% of her life; 1 s iframes; bus `'plunge'`. Monsters: `kill(a, null, { drown: true })` (combat.js:354), or their own rule (the Sunken resurface, `big` flounder, the Icemaw dives).

**Who calls what each frame** (boot.js:266-270):
1. `updatePlayer`: `pl.inWater`, the pull (with `path`), movement, then `tickLight` (beams move their pools, lights and cones; writes `SEA.uLights`, `SEA.uBeam`) and `tickCold` (Act V zones only).
2. `updateActors`: per actor `a.inWater`, `beamTick(a)` for `unlit` and `lightShy`, the AI.
3. `updatePacks`: packs, flood waves.
4. `updateAct`: walks, fades, the Act IV per-frame work, the seal run, and farlight's gust clock `z.gust = { t, on, warn }` (8 s every 40 s, 20 s at hole 3, warned 3 s ahead) «lead pick: where».
5. `updateProjs`, `updateAreas`: flues, drips, sap, `tickTide`, `tickIce`, fire areas melting ice.
- On entry `act5Enter`: `resetTide`, `resetIce`, the atmosphere by state, the pools and beams of every lit light, presence. On leaving, `clearLight` (light.js:231) drops beams and pools.
- The call sites in combat's files that B needs (the `tickTide`/`tickIce` lines in `updateAreas`, `inWater` and the pull's `path` in player.js, the `inWater` factor in `moveMul`) are B1's smallest changes in stage B, under the rule above; combat owns them from stage C.

### Visuals

**sea.js** (B2) exports `SEA`, `buildSea(L, group, quality)`, `seaBeyond(L, group, o)`, `buildIce(L, group, quality)`, `auroraSky()`, `beamMesh(o)`, `skotosSkin(mat)` «lead pick», and the setters `setShade(i, x, z, r, k)`, `freezeWave(i, x, z, r, dur = 3)`, `setFreezeAll(k)`, `setWake(x, z, angle, k)` «lead pick: the setters».

| `SEA.*` (each `{ value }`) | type | carries | written by |
|---|---|---|---|
| `uTime` | float | the same object as `WIND.uTime` (build.js:18) | build.js |
| `uLevel`, `uWetLevel` | float, m | water level now; highest of the last 20 s | tide.js |
| `uAur`, `uAurDark` | float 0-1 | aurora brightness; how black it has gone | gfx.js `setAtmosphere` (ATMOS `aur`, `aurDark`); cines |
| `uAurFront` | float 0-1 | «lead pick» how much of the sky is restored, south to north (0 none, 1 all) | story (answer5) |
| `uAurCol` | vec3 | the aurora's colour | sea.js |
| `tNoise` | 256² RGBA | four octaves of tileable value noise, made in code | sea.js |
| `tCrack`, `uMap` | R8 w×h; vec2 (w, h) «lead pick: uMap» | crack stages | ice.js |
| `uShade` | vec4[4] (x, z, r, k) | slots 0-2 the nearest Icemaws, 3 the Skotos and the arrival shadow «lead pick» | ai.js, story |
| `uGlow` | vec4[8] (x, depth, z, k) | drowned lanterns | sea.js at build, from `spots.drowned` |
| `uLights` | vec4[2] (x, y, z, intensity) | the two nearest lit lanterns | light.js |
| `uBeam` | vec4[2]: (ox, oy, oz, k), (dx, dy, dz, len) «lead pick» | the nearest beam | light.js |
| `uFreeze` | vec4[3] (x, z, r, t 0-1) | slot k = hole k; the naming's wave reuses slot 0 «lead pick» | world.js (seals), story |
| `uFreezeAll` | float 0-1 | the Freeze | story (freeze cine) |
| `uWake` | vec4 (x, z, angle, k) | the Tower's wake | ai.js |

- `buildSea`: chunks of 32 × 32, `renderOrder` 1, `depthWrite: false`; covers every coast cell with `bed < BED_DRY` and every ice and `L.sea` cell, held at y −0.08 under ice «lead pick»; `aBed` from `L.vbed` (−0.6 where there is no `L.bed`). `seaBeyond(L, group, { ice })`: four quads past the north and east edges with `aBed` −4; `ice: true` (the coast after `frozen`, farlight) gives them the ice material.
- `buildIce` → `{ mesh, windows, floes }`: opaque at `ICE_Y`, `renderOrder` −1; window cells a separate mesh with define `ICE_WINDOW`.
- `auroraSky()`: the dome singleton (r 110, follows the camera, `fog: false`); gfx.js shows it while the camera pitch is ≤ 0.25 and `SEA.sky` (a plain boolean beside the uniforms) is true, set by `act5Enter` and by `townFires` after `seaLit` «lead pick».
- `beamMesh(o)`: an additive open cone, 24 segments, length 26, r 0.3 to 5, `depthWrite: false`; `userData.setLen(d)` (Eclipse), `userData.setK(k)`.
- `skotosSkin(mat)`: the `onBeforeCompile` patch (fresnel from `uAurCol` × (1 − `uAurDark`), a streak where `uBeam` faces it, pale flecks) for the Skotos and its Hands. creatures.js `prepare()` (:56) skips its overrides when `scene.userData.keepMat`.
- Draw order in Act V zones: ice −1; water 1; light pools, the Cradle ring, blob shadows, decals 2; telegraphs 3.

**build.js hooks** (B2): `ACT5 = new Set(['coast', 'farlight'])` beside `ACT4` (:1957). In `buildLevel` (:2703): `if (L.bed || L.sea) out.sea = buildSea(...)`, `if (L.ice) out.ice = buildIce(...)`, `if (ACT5.has(L.type)) act5Level(L, I, B, out)`. GROUND for the two zones comes from `ground5(type)` beside `ground4` (:1069), each layer a chain `'rime/<id>'` → boot layer (see Expected assets). groundMat defines: `G_GLINT` (on A), `G_WET` (on B, from `aBed` and `SEA.uWetLevel`), `G_AUR` (coast, farlight; town at `SEA.uAur` 0 until `seaLit`).
- GROUND.coast: A `rime/snow`, B `rime/shore`, P `rime/snowTrod`, W `rime/seaCliff`; s [3.2, 2.4, 2.6], r [0.6, 0.8, 0.85]. GROUND.farlight: A `rime/snow`, B `rime/ice`, P `rime/snowTrod`, W `rime/seaCliff`.

**build5.js** (B2): `act5Level(L, I, B, out)` places `L.props`, whose `t` is a rime prop name read with `packProp('rime', t)` (env.js:27); a Batch/Instancer material key with the prefix `'icy:'` takes the shared world-projected ice material. **`act5Prop(kind, o)`** returns a `THREE.Object3D` with `userData.kind = kind`; every kind has a code-built fallback when its rime part is missing:

| kind | what | userData |
|---|---|---|
| `sealight` | a ruined tower (`o.v` 0-2 → towerA/B/C) with a code fire-cage | `setLit(b)`, `setBeam(theta)`, `flash(k)`, `top` (y of the cage), `fireY` |
| `skerryLight` «lead pick» | towerC + `lanternRoom` + a cracked bell, for the Tower's back (actors.js `act5Spawn`) | `setLit(b)`, `setBeam(theta)`, `ring(k)` |
| `farLight` | the lighthouse shaft + `lanternRoom` | `setLit(b)`, `setBeam(theta)`, `top`, `door` (local {x, z}) |
| `lanternRoom` | code stone gallery, iron fire-cage, glass ring | `setLit(b)` |
| `hearth`, `cairn` | the Landing's hearth; a stone ring with an iron basket | `setLit(b)`, `fireY` |
| `holeLamp` | a marker-lamp on its pad | `setLit(b)`, `setHeld(b)` «lead pick» |
| `markerLight` «lead pick» | a sealed hole's small light and short beam | `setLit(b)`, `setBeam(theta)` |
| `nameStone` | the runestone with emissive name-lines and a niche lamp | `setLit(b)` |
| `doorStone` «lead pick» | the door-stone with Einar's and Arna's names | `setCarved(b)` (adds Ivar and Isarn) |
| `iceWindow` | the pit under a window: rim and a small cold light | `figureY` (−2.2) |
| `stiltHut`, `rack`, `pole` «lead pick: pole» | huts from `planks`, stockfish racks, marker poles | — |
| `boat` «lead pick» | a keel-boat drawn up | `setLevel(h)` (bobs at high water) |
| `floe` | one floe shard; ice.js instances 32 | — |
| `bell` | the tide bell on its post | `ring(k)` |
| `cask` «lead pick» | the whale-oil cask (the `oilCask` breakable's mesh) | — |
| `rubble` «lead pick» | the Neck's plug in the Field | `clear()` |

**FX** (fx.js, B2): ambients `coast`, `coastFrozen`, `farlight`, `blizzard`; emitters `seasmoke`, `seaDrip` «lead pick: `drip` is the amber drip, fx.js:388»; `splash(x, z, s)`, `iceShards(x, z, n)`, `freezeCrystals(x, z, r)`, `breath(x, y, z, k)`, `footprint(x, z, rot)` «lead pick: the names». `WIND.uSnow` is 1 in Act V zones (world.js:200). Body class `'memory-ice'` (style.css, beside `'memory-ash'`, story.js:574). The title card: overlay.js `titleCard(dur = 3, done)` «lead pick».

### Combat

**MONSTERS** (data.js:50; every `radius` pre-scale; the model id is the CAST or people key):

| id | model | ai | traits and key fields (numbers as in the design) |
|---|---|---|---|
| `sunken` | `sunken` (frost) | `melee` | `wake { d: 5, clip: 'rise', pose: 'kelpPile', sfx: 'splash', t: 2.0 }` «lead pick: `splash`; the design's `waterRise` is not in its SFX list», `tideWake`, `tideborne`, `swim`, `unlit`, `hookEvery: 3` «lead pick», weapon `'boathook'`, style 'heavy', flesh `'drowned'` |
| `harpooner` | `sunken` (frost), look.scale 1.06, code hood, harpoon, rope | `ranged` | `proj: 'harpoon'`, `harpoonEvery: 3`, weapon `'harpoon'`, style 'none', `tideWake`, `tideborne`, `swim`, `unlit`, flesh 'drowned' |
| `iceSinger` | `icesinger` (frost) | `singer` (new) | `float`, `unlit`, flesh 'drowned', look { rim: 0x9ad8ff, rimI: 0.45 } |
| `hullLouse` | `hullLouse` (louse.glb) | `melee` | `burst` (`'hull'` \| `'ice'`, from the pack spot), `curl`, `swim`, `unlit`, `weight: 0.3`, flesh 'chitin' |
| `icemaw` | `icemaw` | `lurker` (new) | `swim`, `speed: 2.0`, `underSpeed: 7.0` «lead pick», `weight: 2.0` while up, look.scale 1.6, flesh 'flesh' (not unlit) |
| `reefback` | `reefback` (crab.glb) | `brute` | `big`, `guard { arc: 1.2, k: 0.2 }`, `wake { pose: 'rock', tide: true, d: 3 }`, `swim`, look { scale: 1.5, tint: 0x6a7080, tintAmt: 0.6 }, flesh 'chitin' |
| `rimeBear` | `rimeBear` (bear.glb) | `charger` | `big`, `iceCharge`, `frostRoar` «lead pick: both names», sfx 'bear', look { scale: 1.3, tint: 0xf4f2ec, tintAmt: 2.15, rim: 0xd8f0ff, rimI: 0.3 } |
| `skua` | `skua` | `bat` | `float`, `lightShy`, `coldBite: 3` «lead pick» (replaces biteSlow) |
| `tower` | `tower` (crab.glb) + `act5Prop('skerryLight')` | `tower` → `boss(TOWER)` | `boss`, `big`, `swim`, `wakeSpeed: 6.5` «lead pick», `dieClip: 'settle'`, look { scale: 4.0, rim: 0x9ad8ff }, flesh 'chitin', `holdWake` until `towerWake` ends |
| `skotos` | `skotos` | `skotos` → `boss(SKOTOS)` | `boss`, `anchored`, `float`, `speed: 0`, `underSpeed: 4.0`, `dieClip: 'sink'`, look { scale: 3.2, rim: 0x6a4a9a }, flesh `'skotos'`, `holdWake` until its intro ends |
| `skotosHand` | `skotosHand` (tentacle.glb) «lead pick: model id = monster id» | `node` | `anchored`, `big`, hp 5, xp 0, flesh 'skotos' |
| `skotosCoil` «lead pick» | `skotosHand` | `node` | the Coil: hp 4, always Revealed, anchored |

- **Trait flags** (on the def; ai.js reads them): `tideWake` (wake from the tide; frozen crews wake from `a.statue`, ai.js:108), `tideborne`, `swim` (with a `swimTo` helper, the bat's `blocks()` pattern, ai.js:99), `unlit` and `lightShy` (both through `beamTick(a)`), `curl`, `burst`, `harpoonEvery`, `hookEvery`, `iceCharge` (the charger's `dashStep` gains `D.ice`, ai.js:785), `frostRoar`, `coldBite`, `weight`, `underSpeed`, `wakeSpeed`. `a.under` (exists, actors.js:189) hides and untargets.
- **AIs** (the `AI` table, ai.js:255): new `singer`, `lurker`, `tower: (a, dt, pl, d) => boss(a, dt, pl, d, TOWER)`, `skotos: ... SKOTOS`; `boss()` (:1414) unchanged in shape. `sapDaze` accepts `'amber'` and `'slush'`. The `'kelpPile'` wake pose plays KK_Skeletons_Inactive_Floor_Pose (a `PERSON_ACTIONS` row, people.js:310, held and looped like `bonePile`, :326, :329) and its mound is models.js `kelpMoundParts()` «lead pick», beside `ashMoundParts` (models.js:240); the crab's `'rock'` pose is its own clip and takes no mound.

**PACKS** (data.js:106):

| tag | weights | notes |
|---|---|---|
| `sunkenCrew` | sunken 4, harpooner 2 | dormant `tideWake`; 4-6; the wrack lines |
| `tideChoir` | sunken 3, harpooner 1 | lead `iceSinger`; 4-5 |
| `floodWave` | sunken 3 | spawned by world.js at h ≥ 0.75, never placed |
| `hullSwarm` | hullLouse 1 | 5-7; spots carry `burst` |
| `reefRocks` | reefback 1, hullLouse 2 | lead `reefback`; dormant 'rock' |
| `strandBear` | hullLouse 2 | lead `rimeBear` |
| `fallHunters` | hullLouse 2 | lead `icemaw` |
| `skuaFlock` | skua 1 | 6-8, roosts |
| `frozenCrew` | sunken 3, harpooner 2, iceSinger 0.6 | ice statues, crack-wake |
| `iceMixed` | sunken 2, hullLouse 2, harpooner 1, icemaw 0.6, iceSinger 0.6 | farlight |
| `holeRise` | sunken 1 | spawned by the seal run, 2 each 6 s, at most 5 |

`PACK_LEAD` (data.js:151): `tideChoir: ['iceSinger'], reefRocks: ['reefback'], strandBear: ['rimeBear'], fallHunters: ['icemaw']` «lead pick: no lead for sunkenCrew; a lead there would leave only harpooners». `PACK_DORMANT` (:154): sunkenCrew, tideChoir, reefRocks, frozenCrew.

**NPC kinds** (`spawnNpc`, actors.js:372; model = kind unless stated):

| kind | model | carries, idle | where |
|---|---|---|---|
| `alkyone` | alkyone | `seaLantern` (white), idle 'lantern' | town q24, the Anvil Gate q25, the Landing, the shore rock, the Icebound Ship, the holes, the Light's Skerry |
| `selna` | selna | `seaLantern` (guttering), 'kneel' on her pad | farlight |
| `tern` | tern | a small `seaLantern` (×0.6), wool cap | farlight |
| `tamarisk` | tamarisk | idle 'fold' | the Landing, the Icebound Ship, the keepers |
| `glaukos` | glaukos | eye band, idle 'talk' | the Landing (vendor) |
| `shorefolk` | `villager1`/`villager2` by spot parity, oilskin tint, code hood or collar | 'hammer' (rope), `Idle_Rail_Call` (bell), 'lantern' | the Landing ×3 |
| `child` | tern, village tint, no cap or lamp | | town q30 and after |
| `brokka`, `elati` (exist) | folk 'brokka', grove 'elati' | a `seaLantern` carrying Deepstone's fire (0xff8a30) and the beacon-tree's (0xb8e060) «lead pick: colours»; walkTo and a pose only | farlight, phase 3 to `answer5` |
| `first` «lead pick» | selna, memory material | | Ice Memory 1 |
| `einarBoy` «lead pick» | tern, memory material, no cap | | Ice Memory 2 |
| `einar` | villager1 «lead pick», memory material | | Ice Memory 3 |
| `arnaLast` «lead pick» | glaukos without the eye band, memory material | | Ice Memory 4 |
| `keeperYoung` «lead pick» | villager2 with the shorefolk tint, memory material | | Ice Memory 4 |

The frozen figures in the ice windows are the same kinds posed with the statue tint (ai.js:108). `seaLantern` is a held-weapon kind in models.js (the rime `oilLamp`, glass on GLOW, or a code lantern) «lead pick». Dialog speakers (`who` → `npc.<who>`): the kinds above, plus `iceMemory`, `skotos` (a black-disc portrait styled on `[data-who="skotos"]`, hud.js:344), `arna` (exists), `narrator` (exists). The speaker name goes through a story.js `npcName(k)` «lead pick», which returns «…» for `selna` while `flags.frozen && !flags.selnaBack && !G.selnaBack`; hud.js:344, overlay.js:74-75 and panels.js:141 use it.

**Cold** (new cold.js, combat):

```
COLD = { v: 0, state: 'none' | 'chilled' | 'freezing' | 'frostbite', warmT: 0 }
coldAdd(v, o)   the only way in; gains × HAZ5[diff].cold; nothing outside Act V zones
tickCold(dt)    from player.js after tickLight: +4/s while pl.inWater; +2.5/s while G.zone.gust.on, out of the lee
                (spots.bergs, spots.ship, warm pools); −3/s dry; −12/s in warmAt; −8/s in a fire area
warmHero(t = 4) a beam: Cold −15 at once, then pl.buffs.warmed = t (no build-up)
resetCold()     on leaving Act V zones and on respawn
```
States: 50-74 Chilled (−8% move and attack speed), 75-99 Freezing (−15%, no regeneration), 100 Frostbite (`rootHero(1.0, { tint: 0x9ad8ff })` «lead pick: the option», 5% of max life, Cold to 70; in a boss fight a 50% slow for 2 s, held while a red telegraph is under her). `hurtHero` (combat.js:113) takes `o.cold` and calls `coldAdd`.

**Light** (light.js, combat):
- `lightOn()` (:24) is true where `ZONES[id].light` is set (or `LIGHT.force`); `LIGHT.base` reads `ZONES[id].ring`; the Shroud, `drink()` and the ring's swell run only where `light === 'ember'`. (light.js reads ZONES from world.js at run time only, so the import cycle is safe.)
- `lightAt(x, z, o = {})` (:28): counts beams; `o.ring === false` leaves out the hero's own ring.
- `lampLightAt(x, z)`: pools added with `{ lamp: true }` and lit interactables with `lightR`, except kind `'holeLamp'`; never fire areas or beams. `warmAt(x, z)` «lead pick»: `lampLightAt` or a lit hole lamp's pool.
- `addLightPool(x, z, r, dur, tag, o)` (:87) gains `o.decal === false` (lights, draws nothing) and `o.lamp === true`.
- `addBeam(x, z, o)` → `{ x, z, y, len, half, period, theta, sweep, pool, light, mesh, tag, owner }` with `o = { len: 26, half: 0.18, period: 12, theta, y, color, tag, owner, cone: true }`; `removeBeam(b | tag)`; `beams()`; `inBeam(x, z)` → the beam or null (distance in [3, len] and |angle − θ| < half + 0.6/d). `b.sweep` counts turns for "once per sweep".
- `setHeroLight(r)` (:50) unchanged (the Night: 2.5).

**Sap kinds** (sap.js): `sapAt(x, z, ignore)` (:44) → `'amber' | 'brine' | 'slush' | null` (`L.sap` cells are `'amber'`); `addSapPool(x, z, r, dur, owner, kind = 'amber')` (:59). Only `'amber'` feeds the hero's stick and root (player.js:62) and the monsters' `onSap` (ai.js:79): both compare `=== 'amber'`. Brine and slush have their own water look and set `inWater` through `wadeAt`.

**The vulnerability rule** (combat.js `actHit`, renamed from `act4Hit` at :181): `amount *= vuln(target)`; `a.vulns` maps status → seconds left; `addVuln(a, kind, t)` «lead pick»; `vuln` returns the largest, capped at 1.6 for a boss unless `a.vulnWindow` (the Tower's Overturned). Resistance `a.resist` (Island ×0.3) and ward ×0.5 (:60) multiply apart.

| status (`a.vulns` key) | × | hit text |
|---|---|---|
| `revealed` (a beam, Einar's Lantern) | 1.25 (`HAZ5.reveal`: 1.35 on Wanderer) | `hud.inLight` «Στο φως!» / "In the light!" «lead pick: `hud.revealed` exists, text.js:442, Act IV's Shroud» |
| `exposed` (up after a breach) | 1.25 / 1.35 | `hud.exposed` |
| `dazed` (wall, boulder), `beached`, `stranded`, `seared` | 1.5 | `hud.beached`, `hud.stranded`, `hud.seared` |
| `blinded` | 1.6 | `hud.blinded` |
| `floundering` (non-boss), `overturned` | 2.0 | `hud.floundering`, `hud.overturned` |

**Hero statuses and their icons** (hud.js): the Cold meter replaces the amber meter's slot in Act V zones (`#cold`, a SNOW icon and a blue fill, hud.js:130-136 pattern; labels `hud.chilled`, `hud.freezing`, `hud.frostbite`); the frost vignette grows with Cold; Warmed is `pl.buffs.warmed` (a flame icon, `hud.warmed`); the memory buff keeps TEAR (hud.js:126); the tide dial `#tide` by the minimap (`hud.tide`). Pulls show hit texts only: `hud.hooked`, `hud.dragged`, `hud.grabbed`; a Lash's hold is `pl.status.held` (1 s) «lead pick». Plunges `hud.plunge`, drownings `hud.drowned`.

**HAZ5** «lead pick: the name» (data.js, B1's part; indexed by `h.diff` 0-5; the design's difficulty table). Columns: tide cycle (s), bell lead (s), wash-out and plunge (% of max life), ice load per stage, Cold gain factor, Revealed/Exposed factor, hole freeze ring (s), Black Breath period (s), boss cooldown factor, adds per boss call.

| | tide | bell | wash | plunge | load | cold | reveal | ring | breath | bossCd | adds |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 wanderer | 180 | 8 | 0 | 6 | 1.6 | 0.6 | 1.35 | 6 | 7 | 1 | 0 |
| 1 warden, 2 hero | 152 | 6 | 6 | 10 | 1.2 | 1 | 1.25 | 8 | 6 | 1 | 0 |
| 3 nightmare | 152 | 6 | 8 | 12 | 1.1 | 1.15 | 1.25 | 9 | 5.5 | 0.9 | 1 |
| 4 ash | 152 | 6 | 10 | 14 | 1.0 | 1.3 | 1.25 | 10 | 5 | 0.85 | 1 |
| 5 skotos | 152 | 6 | 12 | 16 | 0.9 | 1.45 | 1.25 | 10 | 5 | 0.8 | 2 |

**DIFFS** (data.js:4) gains index 5 as the owner wrote it. The unlock strings become `'any:hero'` (Nightmare) and `'any:nightmare'` (Ash) «lead pick»; Skotos keeps `'act5:ash'`. `diffUnlocked` (panels.js:245): `const [a, d] = unlock.split(':')`; `'any'` takes the best of `h.act1`…`h.act5` (`?? −1`); otherwise `h[a]`. The locked toast (panels.js:284) uses `pick.locked` for `'any'` and `pick.locked5` «lead pick» for `'act5'`.

**BOONS[5]** (data.js:165): `{ id: 'einar', icon: 'star', stats: { eliteDmg: 15, crit: 5 } }`, `{ id: 'tide', icon: 'roll', stats: { atkSpd: 8, resRegen: 15 } }`, `{ id: 'name', icon: 'shield', stats: { lifePct: 12, armorPct: 12 } }`; `REMEMBERED = 1.25` «lead pick: the name, beside `UNBOUND`»; stats.js:24 multiplies BOONS[5] by it when `flags.remembered`.

**Legendaries** (data.js:251): `{ id: 'skerryShell', base: 'chest', cls: null, v: 1, drop: false }`, `{ id: 'einarLantern', base: 'amulet', cls: null, v: 2, drop: false }`; `drop: false` «lead pick» keeps them out of random drops (items.js:67 skips them unless `o.leg` names one). `LEG_FROM = { tower: 'skerryShell', skotos: 'einarLantern' }` (data.js); combat.js:400 passes `leg: LEG_FROM[a.kind]`. Their effects read `o.plunge`/`o.wash` (no life lost) and apply `revealed` for 2 s on hit.

**Flesh** (combat.js:23-25, :372-376): `'drowned'`: hit sfx `hitFlesh`, death `splash`, water and kelp, no blood decal; `'skotos'`: hit sfx `hitSpirit`, black mist, no corpse decal «lead pick: the sfx». `kill(a, src, { drown: true })` skips the corpse dissolve and splashes.

**Projectiles and areas** (projectiles.js): `fire('harpoon', ...)` with `o.reel` for the third throw; `fire('brineGlob', ...)` «lead pick» for the Tower's Brine Spit (lands a `'slush'` pool); `area('fire', x, z, 2.5, 6, { floats: true })` from a broken oil cask (it burns on water and melts ice +1 stage each 2 s).

**Audio names combat uses** (story implements them in audio.js): `tideBell`, `surfSwell`, `washOut`, `splash`, `plunge`, `iceCreak`, `iceCrack1`, `iceCrack2`, `iceCrack3`, `iceBreak`, `refreeze`, `iceSing`, `harpoonThrow`, `harpoonReel`, `sealBark`, `sealLunge`, `skuaCry`, `louseSkitter`, `louseCurl`, `louseRoll`, `oilCask`, `beamHum`, `lightCatch`, `freezeWave`, `skotosRise`, `towerBell` (the 26); the bear's sfx are reused.

**Scenario hooks:** `window.__act5` (created with `||= {}` by whichever module loads first): tide.js adds `tide`, ice.js `ice`, cold.js `cold`, ai.js the rest as `__act4` does (ai.js:38).

### Story

**Quests** (`questText` clamps at 31, story.js:24):

| q | zone | key | parameters |
|---|---|---|---|
| 24 | town | `q.24` | |
| 25 | town → Field → coast | `q.25`; `q.25b` once `coastSeen` | |
| 26 | coast | `q.26` | {0} lights lit /3; toast `q.lightLit` {0}/3 |
| 27 | coast | `q.27` | |
| 28 | farlight | `q.28` | {0} Selna's name or «…», {1} holes sealed /3; toast `q.holeSealed` {0}/3 |
| 29 | farlight | `q.29` ({0} the name); `q.29a` once `selnaBack \|\| G.selnaBack` «lead pick»; `q.29b` once `seaLit` | |
| 30 | town | `q.30` | |
| 31 | end | `q.31` | |

`actComplete(5)` (story.js:464): `h.act5 = max(h.act5, h.diff)`, `h.quest = 31`, `flags.act5 = true`, music `'sealit'`, act panel keys `act5.*`; the bare `else` no longer means Act IV. `offerBoons` (:444) loops [1, 2, 3, 4, 5]. Migration (boot.js:98): `hero.act5 ??= −1`, `flags.act5` when `act5 >= 0`; state.js:28 `act5: −1`. `rl()` (story.js:50) also takes a `.m` variant for the Mage.

**Flags** (each saved before its scene, except `selnaBack`):

| flag | set |
|---|---|
| `alkyone` | Alkyone arrives at Whitecliff's beacon (q24) |
| `coastCall` | before the cine in which the fourth fire goes out |
| `coal` | the coal taken (q25) |
| `coastSeen` | before the coast's arrival cine |
| `hearth` | the hearth lit (camp, waypoint `coast`) |
| `rite` | before the rite (q26 at its end) |
| `tamMet`, `tamSapling` | Tamarisk met; the sapling answered |
| `glaukosMet`, `alkShip`, `farSeen`, `ternSeen`, `homeSeen` «lead pick» | first talk with Glaukos; Alkyone's t1-t7 at the Icebound Ship; the farlight arrival cine; the Light's Skerry cine (Tern); the q30 town cine |
| `light_grey`, `light_wreck`, `light_fall` | each sea-light lit |
| `mem_i1` … `mem_i4` | each Ice Memory seen (i1-i3 in count order, i4 in the lantern room) |
| `towerWake`, `towerDown` | before the Tower wakes; at its death |
| `frozen` | before the Freeze (q28) |
| `hole0`, `hole1`, `hole2` | each seal (hole ids 0-2, south to north) |
| `skotosWake` | before the Skotos rises |
| `selnaBack` | written only together with `skotosDown`; during the fight the runtime `G.selnaBack` (cleared on a reset) |
| `skotosDown` | first, at the naming |
| `seaLit` | during `answer5` |
| `carved` | the carving (q30) |
| `toldChild` | when the child's talk ends, before `beaconScene(5, 'sea')`; then `actComplete(5)` |
| `names` | array of Name-stone ids in the order lit |
| `remembered` | all four lit |
| `act5` | `actComplete(5)` |
| `legFrom_tower`, `legFrom_skotos` | first kills (combat.js:399) |
| (`iceOut`) | stretch only |

Catch-ups are the design's table (beats, "Catch-ups on zoneEnter"). `npcHasNews` (story.js:39) covers `alkyone` at each new place, `glaukos` (`!glaukosMet`), `tamarisk` (`!tamMet`).

**Interactables** (`z.interact`):

| kind | where | prompt key | what |
|---|---|---|---|
| `coal` | Whitecliff's beacon after Halda's line | `coal.take` | 1 s; `coal` |
| `hearth` | the Landing | `hearth.light` | 1 s from the Cradle; warm pool 8 m |
| `sealight` | the three towers' `base` | `sealight.light` | 1.5 s channel, broken by a hit of 10% max life; checkpoint, lamp pool r 7, beam |
| `window` | a lit tower's ice window while lights lit > memories seen | `lamp.remember` (exists, text.js:437) | the next memory |
| `nameStone` | `spots.stones` | `stone.light` | 1 s; lamp pool r 3; BUFFS.memory, toast `lamp.buff5` |
| `towerLight` | on the Tower's flank during Island | `tower.light` | 1.5 s channel |
| `holeLamp` | `holes[k].lamps` | `stone.light` | 1 s; `it.snuff`/`it.relight`; `it.held` while Alkyone holds it; isLamp (light.js:58) counts it |
| `cairn` | `spots.fires` | `cairn.light` | 1 s |
| `remember` | on Selna, phase 2 | `selna.remember` | 1.2 s within 2 m |
| `farLight` | the tower door | `farLight.light` (starts the fight), `farLight.give` (phase 3, 2.0 s), `farLight.climb` (after `seaLit`: Ice Memory 4) «lead pick: one kind, three stages» | |
| `doorStone` | the door-stone, after `mem_i4` | `stone.carve` | the carving, `carved` «lead pick: a second step after the lantern room» |
| `echo` | the island; the ice edge (after `seaLit`) | `echo.tower`, `echo.skotos` | existing `echoAt` (world.js:459) |
| `oilCask` | `spots.casks` | — | a breakable actor (`prop: true`, `propType: 'oilCask'`) |

**Cines:** `beaconScene(5, 'out')` «lead pick» (the fourth fire goes out, `coastCall`) and `beaconScene(5, 'sea')` (q30), beside `beaconScene(4, ...)` (story.js:407); the arrival (`coastSeen`, ATMOS coastCine); the landing and the rite; each sea-light; the Ice Memories through the Lamp Memory flow (story.js:565) with body class `'memory-ice'` and narrator `iceMemory`; `towerWake`; the Tower's death; `freeze`; the farlight arrival; each seal; Tern; `skotosWake`; `naming` (ends in `titleCard`); `answer5`; the lantern room; the carving; home.

**Text keys.** The design's families (d.alk.*, d.selna.*, d.tern.*, d.tam.* with .r, d.glaukos.*, d.skotos.* with .r and w1-w5, d.ice.i1-i4.*, d.stone.*, d.freeze.*, d.far.*, d.coast.*, d.child.*, d.answer5.*, d.halda.*, d.elianthe.*, echo.*, boon.*, mon.*, q.*, zone.*, exit.*, wp.*, hud.*, hint.*, npc.*) plus these «lead pick» keys:
- `exit.shore`; prompts `coal.take`, `hearth.light`, `sealight.light`, `stone.light`, `cairn.light` «Άναψε τη φωτιά» / "Light the fire", `tower.light`, `selna.remember`, `farLight.light`, `farLight.give`, `farLight.climb` (q.29b's words), `stone.carve` (texts as the design's prompt list);
- `hud.inLight`, `hud.exposed`, `hud.beached`, `hud.stranded`, `hud.seared`, `hud.blinded`, `hud.floundering`, `hud.overturned`, `hud.hooked`, `hud.dragged`, `hud.grabbed`;
- toasts `q.coastOpen`, `q.towerDown`, `q.skotosDown` (big), `q.remembered`, `lamp.buff5` «Μνήμη των Αλιγενών: +12% ζημιά, +8% ταχύτητα για 60 δευτ.» / "Memory of the Saltborn: +12% damage, +8% speed for 60s";
- `echo.tower`, `echo.skotos`, `echo.rise5`, `echo.done5`; `boon.h5`, `boon.<einar|tide|name>` with `.d`, `.du` (the ×1.25 values: `boonDesc`, panels.js:21, picks `.du` for BOONS[5] when `flags.remembered`), `.q`, and `boon.remembered` (the panel's note, as `boon.unbound`); `leg.skerryShell`, `leg.einarLantern` with `.d`; `mon.<id>` for every new MONSTERS id, `mon.tower.t`, `mon.skotos.t`; `npc.first`;
- the rite's names `name.first`, `name.einar`, `name.arna`, `name.thaleia`, `name.keyx`, `name.carriers`, `name.sailor`, `name.ivar`, `name.isarn`, `name.skotos` (each the bare name with a full stop), shared by the naming, the roll at 15% and Selna's nightly rite;
- the cameo: `d.brokka.v3`, `d.elati.v3` (+ `.r`) on the ice, `d.brokka.v4`, `d.elati.v4` (+ `.r`) at home after `seaLit`, replacing v2 «lead pick: the numbering».
- Reworded: `act4.next`, `help.p1`, `diff.ash.d`, `pick.locked` (text.js:21: «Κλειδωμένο: τελείωσε οποιαδήποτε Πράξη στο «{0}»» / 'Locked: finish any Act on "{0}"'); new `pick.locked5` «Κλειδωμένο: τελείωσε την Πράξη V στο «{0}»» / 'Locked: finish Act V on "{0}"', `diff.skotos`, `diff.skotos.d` (the owner's text).
- **The title screen** (screens.js:73, :85) shows `game.sub5` instead of `game.sub` once `save.heroes.some((h) => (h.act5 ?? −1) >= 0)`.

**Music** (audio.js): THEMES (:1684) `coast`, `tower`, `farlight`, `skotos`, `sealit`; STINGS (:1380) `sealight` (the motif D A G D′), `naming` (the D-minor chord), `relight` (the two motifs in counterpoint) «lead pick: the sting names»; the ice-song instrument `INS.iceSong` and sfx `iceSing`. MOOD (:1629) gains `tide` 0-1, `ice` 0-1, `forget` 0-0.3 (the chance a note drops), `skotos` 0-1, `under` 0/1, `lit` bool, `sky` 0 green / 1 black / 2 true, `gust` 0/1, `sub` 0/1 (the Tower submerged) «lead pick: sky, gust, sub», with MOOD_RANGE (:1632) entries. The design's audio ambients (coast, coastFrozen, farlight, blizzard) are these moods inside the themes; audio.js has no ambient player «lead pick».

**Scenarios** (tools/scenario.mjs): `hook5`, `catch5`, `coast`, `tide`, `ice`, `tower`, `freeze`, `holes`, `skotos`, `ending5`, `cast5`, `echo5` (story and combat), `perf5`, `shallowtele` (sea).

## Expected assets

What stage A delivers, so B and C can reference it before it exists. Sources, licences and budgets are the design's Assets section; the gates are G1 and G2 above. Until a file lands, code uses the stand-in chain given here. **Every chain ends in a boot-loaded or code-built model:** a people.glb scene (warden, ranger, mage, wayfarer, smith, healer, villager0-2), an Act I creature (loaded at start-up, creatures.js:35) or a code-built model (actors.js:19-27, `heartroot` among them). `STAND_SCALE` (actors.js:57) multiplies the def's `look.scale` (actors.js:67), so a stand-in meant at an absolute ×3.2 under `look.scale` 4 is written 0.8. `TINT_IN` (actors.js:208) is keyed by monster id.

### Creatures (group `act5`)

`ACT_FILES.act5 = ['crab', 'skotos', 'tentacle', 'icemaw', 'louse', 'skua', 'bear']` (creatures.js:34). Each GLB follows the clip contract of creatures.js:1-3 and tools/creatures/README.md: scene extras `{ hit: { <clip>: seconds }, height, credit, walkSpeed, runSpeed }`, plus `legSpan`/`length` for wide bodies (creatures.js:71) and `keepMat: true` where stated (`prepare()` then keeps its material). Heights are at CAST base 1, before `look.scale`.

| CAST key → [file, base] | size at ×1 | in game | clips | stand-in chain |
|---|---|---|---|---|
| `tower` → ['crab', 1] | spire top ≈ 0.85 m, legSpan ≈ 1.1 m «lead pick: targets» | look.scale 4: ≈ 4.4 m shell, the code ruin's top ≈ 11 m | idle, walk, run, side, attack (claw sweep), attack2 (hammer claw), rear, dive, rise, settle, overturned, shake, rock (the dormant pose), hit, daze, die | ['spider'], STAND_SCALE 'tower>spider' 0.8 (≈ ×3.2), TINT_IN [0x5a6478, 1.4] «lead pick»; the tower is added in code on any body |
| `reefback` → ['crab', 1] | the same file | look.scale 1.5: ≈ 1.7 m across | idle, walk, run, attack, attack2, rock, hit, die; runtime tint 0x6a7080 at 0.6 | ['spider'], STAND_SCALE 0.8 (≈ ×1.2), a code boulder on its back |
| `skotos` → ['skotos', 1] | ≈ 3.75 m, origin at its base (the game sets `a.y` −3) | look.scale 3.2: ≈ 12 m | idle, rise, sweep, slam, drink, roar, sink, surface, wrap, recoil, hit (anchored: no walk or run; creatures.js:130 falls back to idle); `keepMat: true` | ['troll'], STAND_SCALE 0.75 (≈ ×2.4), TINT_IN [0x0c0a14, 2.0] |
| `skotosHand` → ['tentacle', 1] | ≈ 5 m standing «lead pick» | the Hands and the Coil | idle, rise, sweep, lash, wrap, smother, recoil, sink, hit; no textures (a code material); `keepMat: true` | 'heartroot' (code-built) |
| `icemaw` → ['icemaw', 1] | ≈ 3.1 m long, 0.7 m high | look.scale 1.6: ≈ 5 m | idle, walk and run (the wriggle at two rates), attack (bite), lunge, slide, stranded, hit, die | ['warg'], STAND_SCALE 0.75 (≈ ×1.2), TINT_IN [0x8a9098, 1.5] |
| `hullLouse` → ['louse', 1] | ≈ 0.7 m long | look.scale 1 | idle, walk, run, attack, spawn (unroll), curl (held), uncurl, hit, die | 'spiderling' |
| `skua` → ['skua', 1] | wingspan ≈ 1.4 m «lead pick» | | idle (hovering), walk and run (the flap), glide, dive, attack (bite), perch, takeoff, land, hit, die | ['caveBat', 'spiderling'] |
| `rimeBear` → ['bear', 1] «lead pick: base 1 under look.scale 1.3, so it stands 1.3 against the Amberback's 1.12» | the shipped bear.glb | look.scale 1.3 | as shipped: idle, walk, run, charge, attack, attack2, rear, howl, hit, daze, die | ['amberBear', 'troll'] (the same file, so troll in practice) |

- **Fallback for the bear's read:** only if the runtime tint reads grey in the side-by-side check, tools/creatures/act5/polarbear.mjs builds polarbear.glb; then CAST `rimeBear` → ['polarbear', 1] and `ACT_FILES.act5` lists 'polarbear' in place of 'bear'.
- **Fallback sources** (the design's, in order) keep these CAST keys, file names and clip names: Giant Crab for crab.glb, a new hooded source or the Lurker for skotos.glb, the Woodlouse for louse.glb, the Baikal seal for icemaw.glb.
- **Combat's side** (creatures.js beyond the entries): `MAP` (:106) rows so the AIs' logical actions reach these clips; `HOLD` (:121) gains rock, curl, overturned, settle, sink; `LOOP` (:122) gains stranded and side.

### People (set `frost`)

`src/assets/frost.glb`, built by `folk.mjs --set=frost`, loaded with `loadFolk('frost')`; the glob at people.js:15 gains `'../assets/frost.glb'`. Seven scenes, gated at 25 measured textures or fewer (G2). Every clip below is already in moves.bin.

| scene | source, table, maps | clips it plays | code at runtime | roles | stand-in |
|---|---|---|---|---|---|
| `sunken` | villager0, GAUNT, 256 | Zombie_Walk_Fwd_Loop, Zombie_Idle_Loop, KK_Skeletons_Inactive_Floor_Pose, KK_Skeletons_Awaken_Floor, KK_2H_Melee_Attack_Chop, KK_Hit_A, KK_Death_C_Skeletons; as the Harpooner: Walk_Loop, OverhandThrow, KK_Throw, Pistol_Idle_Loop, KK_Hit_B, KK_Death_B | kelp veil, barnacles, boat-hook; the Harpooner's sealskin hood, harpoon and rope at ×1.06; wet roughness 0.35 | `sunken`, `harpooner` | villager0, TINT_IN [0x8c9e99, 1.6] «lead pick» |
| `icesinger` | healer, CRONE, 256 | Spell_Simple_Idle_Loop, KK_Spellcasting, Walk_Formal_Loop, KK_Spellcast_Shoot, KK_Hit_A, KK_Death_B | kelp veil, cyan rim, cold eyes | `iceSinger` | healer, TINT_IN [0xa8c8e0, 1.5] |
| `alkyone` | healer, WEATHER, 512 | Idle_Lantern_Loop, Walk_Loop, Idle_Talking_Loop, Fixing_Kneeling | salt-white braid, short hood, `seaLantern` | Alkyone | healer |
| `selna` | smith, ELDER + runtime stoop, 512 | Idle_Lantern_Loop, Fixing_Kneeling, Walk_Loop, Idle_Talking_Loop | fur collar, `seaLantern` | Selna; the First (Ice Memory 1) | smith |
| `tern` | villager0, CHILD (isarnBoy's), 512 | Idle_Lantern_Loop, Walk_Loop, Idle_Loop, Idle_Talking_Loop «lead pick» | wool cap, small `seaLantern` | Tern; the boy Einar (Ice Memory 2, no cap); the Whitecliff child (village tint, no cap or lamp) | villager0, STAND_SCALE 'tern>villager0' 0.62 |
| `tamarisk` | ranger, ELF, villager2's Hair_Buzzed, 512 | Idle_FoldArms_Loop, Idle_Talking_Loop, Walk_Loop, Idle_Lantern_Loop | fur collar; a lamp in the Skotos's phase 3 | Tamarisk | ranger |
| `glaukos` | wayfarer, ELDER, 512 | Idle_Talking_Loop, Idle_Loop, Walk_Loop | cloth band over the eyes | Glaukos; old Arna (Ice Memory 4, no band) | wayfarer |

**Runtime, no scene:** the Harpooner (above); the **shorefolk**: people.glb `villager1`/`villager2` (boot-loaded) with an oilskin tint above 1 (people.js:89-91) and a code hood or fur collar, playing TreeChopping_Loop, Idle_Rail_Call, Idle_Lantern_Loop; the young Einar: `villager1` in the memory material «lead pick»; the young keeper of Ice Memory 4: `villager2` with the shorefolk tint. Alkyone and Elianthe (both 'healer') are checked side by side (`?viewer&only=p:alkyone,p:healer`) before the set is frozen.

**The cameo (shipped sets, no new scene):** Brokka is folk.glb's `brokka` and Elati grove.glb's `elati`, loaded by `farlight` under the READY rule in Zones; stand-ins `smith` and `ranger` (actors.js:47, :50). They play Walk_Loop, Idle_Lantern_Loop and Idle_Loop and hold a `seaLantern` with their fire. They count in `perf5` and in the memory report.

### The rime pack (`rime`)

tools/pack-rime.mjs writes `src/assets/rime.glb`, `src/assets/rime/<id>_d.webp` and `<id>_n.webp`, and `src/assets/rime/CREDITS.txt`; env.js `PACK_ORDER` (:13) gains `'rime'` last, so code always reads `'rime/<name>'` (`packProp`, `packLayer`, env.js:27-28), never the bare name (`snow`, `crate`, `barrel` already belong to earlier packs). Every prop carries `extras.size` (the cinder convention); towers and `farLight` carry `extras.top` (y of the cut top, where the code cage sits) and `farLight` also `extras.door`; lamp glass is on a material named `glow`.

| prop name | source | used for | maps | when missing |
|---|---|---|---|---|
| `wreck` | the Dalarö wreck | the hero wreck on the Shallows' bar | 1024 d, 512 n | code hull halves |
| `keelboat` | Gislinge boat, no sail | boats at the Landing, wrecks | 512 d, 512 n | code boat |
| `rowboat`, `brokenBoat` | Old Rowboat; Broken Row Boat | wrecks | 512 d; 256 d | code boat |
| `towerA`, `towerB`, `towerC` | the ruined towers, atlased into one set | the three sea-lights; `towerC` on the Walking Tower | 1024 d, 512 n, shared | code stone tower |
| `farLight` | Old Lighthouse, shaft only, graffiti and door painted out | the Farthest Light | 512 d, 512 n | code stone tower |
| `anchor`, `sunkenAnchor` | Medieval Anchor; Sunken Anchor | dressing; the anchor by the ship | 256 d each | left out (dressing) |
| `whale` | right whale skeleton | the Strand: roost, landmark, Name-stone | 512 d | code rib arches «lead pick» |
| `runestone` | Monumental Runic Stone | the Name-stones | 512 d, 512 n | code slab |
| `barnacleRock`, `driftwood` | Beach Rock with Barnacles; Pine Driftwood | the wrack lines | 512 d each | env `rockB`; env `log` |
| `kelp` | Kelp and Seaweed scan | wrack heaps, kelp mounds | 512 d | code mound (`kelpMoundParts`) |
| `icicle` | Icicle 01, geometry only | the Frozen Fall, eaves | none (ice material) | code cones |
| `shack` | Wooden Shack | huts at the Landing | 512 d, 512 n | code stilt hut |
| `ship` | dutch_ship_medium, sails dropped | the Icebound Ship | hull 1024 d + 512 n, rigging 512 d | code hull |
| `cask` | wooden_barrels_01 | the whale-oil casks | 256 d | env `barrel` |
| `crate` | wooden_crate_02 | dressing | 256 d | env `crate` |
| `oilLamp` | vintage_oil_lamp, glass on `glow` | the `seaLantern`, Name-stone niches | 256 d | env `lantern` |
| `coastCliff`, `rockFace` | coastal_cliff_01, rock_face_01, geometry only | cliff faces in the `seaCliff` material | none | env `boulder`, `rockA`-`rockC` |

Shipped and reused: env `boulder`, `rockA`-`rockC` (bergs, ice blocks, pressure ridges, sea stacks, in the ice or `seaCliff` material) and env `lantern` (the drowned lanterns under the windows).

**Ground layers** (d 1024, n 512, AO baked), read through `ground5`'s chains, each ending in a boot-loaded env layer «lead pick: the chains»:

| layer | source | used as | chain when missing |
|---|---|---|---|
| `snow` | snow_02 | coast A, farlight A | `rime/snow` → `snow` (deep) → `flags` |
| `snowTrod` | snow_03 | P: roads, the Landing | `rime/snowTrod` → `snow` → `trail` |
| `shore` | low_tide_rocks | coast B: flats, beaches | `rime/shore` → `gravel` (deep) → `mud` |
| `seaCliff` | seaside_rock | W, world-projected rock props | `rime/seaCliff` → `cliff` (deep) → `wall` |
| `ice` | Ice002 | farlight B, the ice shader, thick ice | `rime/ice` → `snow` → `flags` (the ice shader keeps its tNoise look) |
| `planks` | wood_planks_grey | the jetty, stilt huts, wreck decks | `rime/planks` → `bark` |

**Made in code** (no file): fire-cages and lantern rooms, beam cones, bells, the hearth, cairns, hole lamps, marker poles, the door-stone, stilt huts and the jetty (`planks`), stockfish racks, the frozen fall's ribbons, floe shards, the rubble plug, the boat-hook, the harpoon and its rope, kelp strands, barnacles, hoods, caps, collars and the eye band, the Ember Cradle (shipped).

## Stage A outcome (lead decisions, 10 October)

Measured numbers are in `docs/act5-briefs/assets-built.md`; the gates in `docs/act5-briefs/asset-gates.json`.

- **The Skotos's source changes.** "Ocean Creature" and the Lurker both failed the design's own look gate (they read as squids at every pitch). The Skotos is now "Cloaked Figure" by MysteryPancake (CC-BY 4.0, f4e2c262ed4e456484f232d6afa99629) with a code-built hood, cape, folds and arms (`tools/creatures/act5/sdf.mjs`, `skotos.mjs`): a hooded figure of black water whose robe is its own arms, the hood opening a separate `skotos_void` material that must stay black. Accepted. The Hands are "Tentacle (rigged)" with a code rig (its GLB had only morph targets).
- **The cameo's memory is accepted.** Brokka and Elati load folk.glb and grove.glb in farlight from q29. On a normal run both sets are already loaded by the Field, so it costs nothing; only a cold start at the farlight waypoint pays it (≈ 182 MB for the act's assets plus both sets), which is still well under what a warm run through Acts I-IV holds. If the phone shows memory trouble in Act V, the design's contingency (dispose Acts II-IV sets that Act V does not use: ash, deep, wood, cinder packs; keep folk and grove) is the fix.
- **For stage C (combat), from the asset reports:**
  - `prepare()` in creatures.js must honour `extras.keepMat` (the Skotos 0.22 and the Hands 0.24 roughness are reset to 0.6 today) and never patch `skotos_void`.
  - `walkSpeed || 1.4` turns the anchored creatures' 0 into 1.4: use `?? 1.4`.
  - HOLD and LOOP rows: crab `rock` (held), Hull-louse `curl` (HOLD) and `roll` (LOOP, played at actor speed ÷ `extras.rollSpeed`), Icemaw `stranded` (LOOP) and `dive`/`slide` (they end under the ice: hide the actor or hold the last frame), Skua `dive` (loop) and `takeoff` (lift the bird after `extras.liftAt`).
  - The frost enemies' wet roughness is baked into their materials: do not set roughness at load. Their eye glow is in the colour map.
  - The crab's spire top is 0.585 m at ×1 (the contract said 0.85): mount the Skerry Light on the socket the file names, not on a fixed height.
  - The default gameplay camera never shows the Skotos's hood (it is above the top of the screen); the fight must use the `farlightFight`/`farlightNight` framing (zoom and pitch) so the figure reads, and the cines lower the camera.
- **For stage B (world):** gen5 places a kelp heap and a driftwood on the same spot at some seeds (90.5, 96.5 at seed 3): dressing must not overlap.
